-- La barra Cerca mostrava per il Salmone CBT 139 minuti invece dei 18 della ricetta.
-- Il tempo da mostrare è quello scritto nella ricetta (durata_min). tempo_medio_min è il tempo
-- misurato in produzione: con una sola misura (es. timer lasciato acceso) può essere sbagliato
-- e non deve mai prendere il posto della ricetta. Durata 0 = non scritta, non si mostra.
create or replace function public.cerca_sapere(p_q text, p_azienda uuid default null)
returns table(fonte text, rif text, titolo text, testo text, azienda text, punteggio real, dettagli jsonb)
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_txt text;
  v_q tsquery;
  v_cottura boolean := coalesce(p_q, '') ~* '(cuoc|cott|temperat|gradi|°)';
begin
  v_txt := replace(plainto_tsquery('italian', unaccent(coalesce(p_q, '')))::text, ' & ', ' | ');
  if v_txt is null or v_txt = '' then return; end if;
  -- ogni parola anche come inizio di parola: si trova mentre si scrive ("salm" -> salmone)
  v_q := to_tsquery('simple', regexp_replace(v_txt, '''([^'']+)''', '''\1'':*', 'g'));
  -- niente sinonimi "cuocio/cottura": porterebbero dentro "Centro cottura" e ogni fase chiamata cottura

  return query
  with az as (select a from mie_aziende() a),
  r as (
    select 'ricetta'::text f, ri.id::text id, ri.nome t,
      coalesce(ri.categoria, '') x, ri.azienda_id aid,
      ts_rank(setweight(to_tsvector('italian', unaccent(coalesce(ri.nome, ''))), 'A') ||
              setweight(to_tsvector('italian', unaccent(coalesce(fz.testo, ''))), 'C'), v_q) * 2
        -- a chi chiede una cottura servono prima le ricette che hanno temperature e tempi scritti
        * case when v_cottura and fz.con_temp then 1.6 else 1 end
        -- "Salmone CBT" risponde a "salmone" più di "Mini quiche salmone e porro"
        * case when to_tsvector('italian', unaccent(split_part(coalesce(ri.nome, ''), ' ', 1))) @@ v_q then 1.4 else 1 end rk,
      jsonb_build_object('fasi', coalesce(fz.fasi, '[]'::jsonb), 'conservazione', coalesce(cz.pass, '[]'::jsonb)) d
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
      and (setweight(to_tsvector('italian', unaccent(coalesce(ri.nome, ''))), 'A') ||
           to_tsvector('italian', unaccent(coalesce(fz.testo, '')))) @@ v_q
  ),
  s as (
    select 'regola'::text f, ts.id::text id, ts.titolo t, ts.contenuto x, ts.azienda_id aid,
      ts_rank(setweight(to_tsvector('italian', unaccent(coalesce(ts.titolo, ''))), 'A') ||
              setweight(to_tsvector('italian', unaccent(coalesce(ts.contenuto, ''))), 'B'), v_q) * 3 rk,
      jsonb_build_object('ambito', ts.ambito) d
    from tony_sapere ts
    where coalesce(ts.attivo, true)
      -- le regole generali di scrittura per Tony (marketing, campagne) non servono a chi lavora
      and (ts.azienda_id in (select a from az) or (ts.azienda_id is null and ts.ambito in ('cucina', 'sala', 'locale', 'hotel')))
      and (to_tsvector('italian', unaccent(coalesce(ts.titolo, '') || ' ' || coalesce(ts.contenuto, '')))) @@ v_q
  ),
  c as (
    select 'comandamento'::text f, co.id::text id, 'Comandamento ' || coalesce(co.ordine::text, '') t, co.testo x, co.azienda_id aid,
      ts_rank(to_tsvector('italian', unaccent(coalesce(co.testo, ''))), v_q) * 3 rk, '{}'::jsonb d
    from comandamenti co
    where co.azienda_id in (select a from az) and coalesce(co.attivo, true)
      and to_tsvector('italian', unaccent(coalesce(co.testo, ''))) @@ v_q
  ),
  tutto as (select * from r union all select * from s union all select * from c)
  select tutto.f, tutto.id, tutto.t, left(tutto.x, 600), coalesce(aa.nome, 'Generale'),
    (tutto.rk * case when tutto.aid = p_azienda then 1.5 else 1 end)::real, tutto.d
  from tutto left join aziende aa on aa.id = tutto.aid
  order by 6 desc
  limit 15;
end $$;
