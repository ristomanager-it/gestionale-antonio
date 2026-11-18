-- Barra Cerca, due errori visti dal telefono con "Come rispondo a una lamentela c…":
-- 1) l'ultima parola mentre si scrive ("c") diventava "c:*" e trovava qualsiasi testo con una parola in c;
-- 2) le parole erano in OR: bastava "clienti" per tirare dentro "Il centro cottura non parla ai clienti",
--    e le parole di domanda ("rispondo", "come", "quanto", "cuocio") facevano peso come il soggetto.
-- Adesso: si tolgono le parole di domanda, l'ultima parola vale come inizio solo da 3 lettere,
-- e un risultato deve contenere tutte le parole (con 3 o più parole, tutte meno una).
-- Meglio nessun risultato e "Chiedi a Tony" che una regola sbagliata in cima.
-- In più entra la formazione caricata con le slide (tony_knowledge_base, es. "Pienissimo Live": personale,
-- clienti, servizio, controllo di gestione): era stata lasciata fuori per errore e la barra non la trovava.
-- Restano fuori solo le frasi motivazionali e le regole di scrittura delle campagne.
-- p_largo: per Tony basta una parola in comune, così riceve anche le schede vicine alla domanda
-- (es. "lamentela" -> "Le 3 aspettative del cliente"); la barra resta precisa.
-- Contiene anche la correzione dei minuti (durata della ricetta, non tempo misurato) della PR precedente.
drop function if exists public.cerca_sapere(text, uuid);
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
  ),
  s as (
    select 'regola'::text f, s0.id::text id, s0.titolo t, s0.contenuto x, s0.azienda_id aid,
      ts_rank(s0.v, v_q) * 3 rk, jsonb_build_object('ambito', s0.ambito) d,
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
  ),
  k as (
    select 'formazione'::text f, k0.id::text id, k0.titolo t, k0.contenuto x, null::uuid aid,
      ts_rank(k0.v, v_q) * 2.5 rk, jsonb_build_object('ambito', k0.categoria, 'fonte', k0.fonte) d,
      (select count(*) from unnest(v_termini) t where k0.v @@ to_tsquery('simple', t))::int trovate
    from k0 where k0.v @@ v_q
  ),
  tutto as (select * from r union all select * from s union all select * from c union all select * from k)
  select tutto.f, tutto.id, tutto.t, left(tutto.x, 600), coalesce(aa.nome, 'Generale'),
    (tutto.rk * case when tutto.aid = p_azienda then 1.5 else 1 end)::real, tutto.d
  from tutto left join aziende aa on aa.id = tutto.aid
  where tutto.trovate >= v_min
  order by 6 desc
  limit 15;
end $$;

grant execute on function public.cerca_sapere(text, uuid, boolean) to authenticated;
