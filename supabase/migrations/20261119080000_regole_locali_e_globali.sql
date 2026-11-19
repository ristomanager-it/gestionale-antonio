-- Regole di Tony: ogni cliente può cambiare per il suo locale una regola globale o una scheda di formazione,
-- e il superadmin può portare a tutti le regole dei clienti che funzionano.
-- Perché così: la copia locale è collegata all'originale, quindi per quell'azienda Tony e la barra usano la copia
-- e saltano l'originale (prima le leggevano tutte e due e potevano contraddirsi). L'originale non si tocca:
-- vale ancora per tutti gli altri. I contatori servono a capire quali regole dei clienti meritano di diventare globali.

alter table public.tony_sapere
  add column if not exists sostituisce_id bigint references public.tony_sapere(id) on delete set null,
  add column if not exists sostituisce_kb uuid references public.tony_knowledge_base(id) on delete set null,
  add column if not exists usi integer not null default 0,
  add column if not exists utile integer not null default 0,
  add column if not exists promossa_id bigint references public.tony_sapere(id) on delete set null,
  add column if not exists promossa_il timestamptz;

-- una sola copia per azienda della stessa regola o scheda
create unique index if not exists tony_sapere_sostituisce_uq on public.tony_sapere (azienda_id, sostituisce_id) where sostituisce_id is not null;
create unique index if not exists tony_sapere_sostituisce_kb_uq on public.tony_sapere (azienda_id, sostituisce_kb) where sostituisce_kb is not null;

-- il superadmin legge le regole di tutti i clienti (per "Regole dei clienti" in Super Tony)
drop policy if exists sapere_lettura_superadmin on public.tony_sapere;
create policy sapere_lettura_superadmin on public.tony_sapere for select to authenticated
  using ((select is_superadmin()));

-- il superadmin può aggiornare una scheda di formazione ("Unisci all'originale")
drop policy if exists tkb_modifica_superadmin on public.tony_knowledge_base;
create policy tkb_modifica_superadmin on public.tony_knowledge_base for update to authenticated
  using ((select is_superadmin())) with check ((select is_superadmin()));

-- Contatori: chi lavora non può modificare le regole (policy solo admin), quindi si conta da qui.
-- Si contano solo regole globali o delle proprie aziende; le schede di formazione hanno già visualizzazioni/utile_count.
create or replace function public.sapere_conta(p_regole bigint[], p_formazione uuid[], p_utile boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update tony_sapere set
    usi = usi + case when p_utile then 0 else 1 end,
    utile = utile + case when p_utile then 1 else 0 end
  where id = any(coalesce(p_regole, '{}'))
    and (azienda_id is null or azienda_id in (select mie_aziende()));
  update tony_knowledge_base set
    visualizzazioni = coalesce(visualizzazioni, 0) + case when p_utile then 0 else 1 end,
    utile_count = coalesce(utile_count, 0) + case when p_utile then 1 else 0 end
  where id = any(coalesce(p_formazione, '{}'));
end $$;
grant execute on function public.sapere_conta(bigint[], uuid[], boolean) to authenticated;

-- Tony (tutte le funzioni): se l'azienda ha la sua copia di una regola globale, l'originale non arriva.
create or replace function public.sapere_di_tony(p_azienda uuid, p_funzione text, p_sede uuid default null)
 returns text
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with id as (select identita_sede(p_azienda, p_sede) j),
  ident as (
    select concat_ws(E'\n',
      case when coalesce(j->>'sede_nome','') <> '' then 'IDENTITA DI QUESTO LOCALE (' || (j->>'sede_nome') || ') - scrivi con questa voce:' else 'IDENTITA DEL LOCALE - scrivi con questa voce:' end,
      case when coalesce(j->>'posizionamento','') <> '' then 'Posizionamento: ' || (j->>'posizionamento') end,
      case when coalesce(j->>'cliente_ideale','') <> '' then 'Cliente ideale (scrivi per lui): ' || (j->>'cliente_ideale') end,
      case when coalesce(j->>'tone_of_voice','') <> '' then 'Tono di voce: ' || (j->>'tone_of_voice') end,
      case when coalesce(j->>'parole_chiave','') <> '' then 'Parole chiave: ' || (j->>'parole_chiave') end,
      case when coalesce(j->>'gc_why','') <> '' then 'Perche esistiamo: ' || (j->>'gc_why') end,
      case when coalesce(j->>'promessa_cliente','') <> '' then 'Promessa al cliente: ' || (j->>'promessa_cliente') end
    ) t,
    (coalesce(j->>'posizionamento','') || coalesce(j->>'cliente_ideale','') || coalesce(j->>'tone_of_voice','') || coalesce(j->>'gc_why','')) <> '' as piena
    from id
  ),
  regole as (
    select coalesce(string_agg(ts.titolo || E'\n' || ts.contenuto, E'\n\n'
             -- prima le regole comuni, poi quelle del locale: le piu' specifiche arrivano per ultime
             order by (ts.sede_id is not null), ts.priorita, ts.id), '') t
    from tony_sapere ts
    where ts.attivo
      and (ts.azienda_id is null or ts.azienda_id = p_azienda)
      and (ts.sede_id is null or ts.sede_id = p_sede)
      and ('tutti' = any(ts.vale_per) or p_funzione = any(ts.vale_per))
      and not exists (select 1 from tony_sapere o where o.sostituisce_id = ts.id and o.azienda_id = p_azienda and o.attivo)
  )
  select case when ident.piena then ident.t || case when regole.t <> '' then E'\n\n' || regole.t else '' end
              else regole.t end
  from ident, regole
  where auth.uid() is null or p_azienda in (select mie_aziende()) or coalesce(is_superadmin(), false);
$function$;

-- Barra e Chiedi a Tony: stessa regola, la copia del locale prende il posto dell'originale.
create or replace function public.cerca_sapere(p_q text, p_azienda uuid default null, p_largo boolean default false)
returns table(fonte text, rif text, titolo text, testo text, azienda text, punteggio real, dettagli jsonb)
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_parole text[];
  v_termini text[];
  v_q tsquery;
  v_n int;
  v_min int;
  v_cottura boolean := coalesce(p_q, '') ~* '(cuoc|cott|temperat|gradi|°)';
  v_ultima_finita boolean := coalesce(p_q, '') ~ '\s$';
begin
  -- radici italiane delle parole, senza accenti e senza parole vuote (il, a, una, con...)
  select array_agg(m[1]) into v_parole
  from regexp_matches(plainto_tsquery('italian', unaccent(coalesce(p_q, '')))::text, '''([^'']+)''', 'g') m;
  if v_parole is null then return; end if;

  select array_agg(t) into v_termini from (
    select case when i = array_length(v_parole, 1) and not v_ultima_finita then p || ':*' else p end t
    from unnest(v_parole) with ordinality u(p, i)
    where length(p) >= 2
      -- parole di domanda: dicono cosa si vuole sapere, non di cosa si parla
      and p not in ('quant', 'com', 'cos', 'qual', 'quand', 'dov', 'perc', 'perch', 'far', 'facc', 'dev', 'poss',
                    'rispond', 'gest', 'cuoc', 'cuocer', 'prepar', 'preparar', 'serv', 'bisogn', 'megl')
      -- l'ultima parola ancora da finire vale solo da 3 lettere
      and not (i = array_length(v_parole, 1) and not v_ultima_finita and length(p) < 3)
  ) z;
  v_n := coalesce(array_length(v_termini, 1), 0);
  if v_n = 0 then return; end if;
  v_min := case when p_largo then 1 when v_n >= 3 then v_n - 1 else v_n end;
  v_q := to_tsquery('simple', array_to_string(v_termini, ' | '));

  return query
  with az as (select a from mie_aziende() a),
  r0 as (
    select ri.id, ri.nome, ri.categoria, ri.azienda_id, fz.fasi, fz.con_temp, cz.pass,
      setweight(to_tsvector('italian', unaccent(coalesce(ri.nome, ''))), 'A') ||
      setweight(to_tsvector('italian', unaccent(coalesce(fz.testo, ''))), 'C') v
    from ricette ri
    left join lateral (
      select string_agg(coalesce(fa.nome_fase, '') || ' ' || coalesce(fa.descrizione_operativa, '') || ' ' || coalesce(fa.note, ''), ' ') testo,
        jsonb_agg(jsonb_build_object('ordine', fa.ordine, 'nome', fa.nome_fase, 'tipo', fa.tipo_fase,
          'temperatura', fa.temperatura, 'minuti', nullif(fa.durata_min, 0),
          'descrizione', fa.descrizione_operativa, 'ccp', fa.ccp, 'ccp_min', fa.ccp_min, 'ccp_max', fa.ccp_max, 'ccp_um', fa.ccp_um)
          order by fa.ordine) fasi,
        bool_or(fa.temperatura is not null) con_temp
      from ricette_preparazione_fasi fa where fa.ricetta_id = ri.id
    ) fz on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('titolo', cp.titolo, 'temperatura', cp.temperatura_c, 'minuti', nullif(cp.durata_min, 0),
          'descrizione', cp.descrizione_operativa) order by cp.posizione) pass
      from ricette_conservazione_passaggi cp where cp.ricetta_id = ri.id
    ) cz on true
    where ri.azienda_id in (select a from az) and coalesce(ri.attivo, true)
  ),
  r as (
    select 'ricetta'::text f, r0.id::text id, r0.nome t, coalesce(r0.categoria, '') x, r0.azienda_id aid,
      ts_rank(r0.v, v_q) * 2
        -- a chi chiede una cottura servono prima le ricette che hanno temperature e tempi scritti
        * case when v_cottura and r0.con_temp then 1.6 else 1 end
        -- "Salmone CBT" risponde a "salmone" più di "Mini quiche salmone e porro"
        * case when to_tsvector('italian', unaccent(split_part(coalesce(r0.nome, ''), ' ', 1))) @@ v_q then 1.4 else 1 end rk,
      jsonb_build_object('fasi', coalesce(r0.fasi, '[]'::jsonb), 'conservazione', coalesce(r0.pass, '[]'::jsonb)) d,
      (select count(*) from unnest(v_termini) t where r0.v @@ to_tsquery('simple', t))::int trovate
    from r0 where r0.v @@ v_q
  ),
  s0 as (
    select ts.*, setweight(to_tsvector('italian', unaccent(coalesce(ts.titolo, ''))), 'A') ||
                 setweight(to_tsvector('italian', unaccent(coalesce(ts.contenuto, ''))), 'B') v
    from tony_sapere ts
    where coalesce(ts.attivo, true)
      -- le regole generali di scrittura per Tony (marketing, campagne) non servono a chi lavora
      and (ts.azienda_id in (select a from az) or (ts.azienda_id is null and ts.ambito in ('cucina', 'sala', 'locale', 'hotel')))
      and coalesce(ts.vale_per, '{tutti}') && array['tutti', 'tony', 'super-tony', 'tony-ricetta', 'tony-ricetta-claude', 'tony-hr', 'tony-foto', 'menu del giorno']
      -- se l'azienda ha la sua copia, l'originale globale non si mostra
      and not exists (select 1 from tony_sapere o where o.sostituisce_id = ts.id and o.azienda_id = p_azienda and o.attivo)
  ),
  s as (
    select 'regola'::text f, s0.id::text id, s0.titolo t, s0.contenuto x, s0.azienda_id aid,
      ts_rank(s0.v, v_q) * 3 rk, jsonb_build_object('ambito', s0.ambito, 'sostituisce', (s0.sostituisce_id is not null or s0.sostituisce_kb is not null)) d,
      (select count(*) from unnest(v_termini) t where s0.v @@ to_tsquery('simple', t))::int trovate
    from s0 where s0.v @@ v_q
  ),
  c0 as (
    select co.*, to_tsvector('italian', unaccent(coalesce(co.testo, ''))) v
    from comandamenti co where co.azienda_id in (select a from az) and coalesce(co.attivo, true)
  ),
  c as (
    select 'comandamento'::text f, c0.id::text id, 'Comandamento ' || coalesce(c0.ordine::text, '') t, c0.testo x, c0.azienda_id aid,
      ts_rank(c0.v, v_q) * 3 rk, '{}'::jsonb d,
      (select count(*) from unnest(v_termini) t where c0.v @@ to_tsquery('simple', t))::int trovate
    from c0 where c0.v @@ v_q
  ),
  k0 as (
    select kb.*, setweight(to_tsvector('italian', unaccent(coalesce(kb.titolo, ''))), 'A') ||
                 setweight(to_tsvector('italian', unaccent(coalesce(kb.contenuto, ''))), 'B') ||
                 setweight(to_tsvector('italian', unaccent(array_to_string(coalesce(kb.tags, '{}'), ' '))), 'B') v
    from tony_knowledge_base kb
    where coalesce(kb.attivo, true)
      and kb.categoria not in ('motivazione', 'marketing', 'marketing_meta', 'campagna', 'promo_strategy', 'marketing_strategy', 'piattaforma')
      and not exists (select 1 from tony_sapere o where o.sostituisce_kb = kb.id and o.azienda_id = p_azienda and o.attivo)
  ),
  k as (
    select 'formazione'::text f, k0.id::text id, k0.titolo t, k0.contenuto x, null::uuid aid,
      ts_rank(k0.v, v_q) * 2.5 rk, jsonb_build_object('ambito', k0.categoria, 'fonte', k0.fonte) d,
      (select count(*) from unnest(v_termini) t where k0.v @@ to_tsquery('simple', t))::int trovate
    from k0 where k0.v @@ v_q
  ),
  tutto as (select * from r union all select * from s union all select * from c union all select * from k)
  select tutto.f, tutto.id, tutto.t, left(tutto.x, 600), coalesce(aa.nome, 'Generale'),
    (tutto.rk * case when tutto.aid = p_azienda then 1.5 else 1 end
      * case when p_largo and tutto.f in ('formazione', 'regola', 'comandamento') then 3 else 1 end)::real, tutto.d
  from tutto left join aziende aa on aa.id = tutto.aid
  where tutto.trovate >= v_min
  order by 6 desc
  limit 15;
end $$;
