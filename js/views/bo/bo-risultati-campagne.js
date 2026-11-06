// RISULTATI CAMPAGNE — spesa Meta, Google e ChatGPT confrontata con prenotazioni e incasso previsto.
// Totale di tutte le campagne, classifica con azione consigliata, dettaglio per evento, campagne da collegare.
// Dati: rpc risultati_campagne (solo admin), v_ads_spesa; spesa aggiornata da ads-spesa-sync e meta-ads-spesa.
// % pubblicita' = spesa / incasso previsto. Verde fino all'8%, giallo fino al 15%, rosso sopra.
// v2: niente tabelle larghe, righe a scheda che vanno a capo (sul telefono la pagina usciva dallo schermo).
export async function render(container) {
  const supa = () => window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Nessuna azienda selezionata.</div>'; return; }

  const VERDE = 8, GIALLO = 15, MIN_SPESA = 10;
  const SPECIALI = ['annunci senza link tracciato', 'passaparola o link senza provenienza', 'whatsapp senza link tracciato'];
  const oggi = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
  const piuGiorni = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dataIt = (iso) => iso.split('-').reverse().join('/');
  const eur = (n) => Number(n || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  const n2 = (n) => Number(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const n0 = (n) => Number(n || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 });
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const perc = (spesa, previsto) => (Number(previsto) > 0 && Number(spesa) > 0 ? Number(spesa) / Number(previsto) * 100 : null);
  const fmtP = (p) => (p == null ? '—' : p.toLocaleString('it-IT', { maximumFractionDigits: p < 100 ? 1 : 0 }) + '%');
  const colP = (p) => (p == null ? '#64748b' : p <= VERDE ? '#15803d' : p <= GIALLO ? '#b45309' : '#b91c1c');
  const sfP = (p) => (p == null ? '#f1f5f9' : p <= VERDE ? '#dcfce7' : p <= GIALLO ? '#fef3c7' : '#fee2e2');
  const pill = (txt, fg, bg) => '<span style="display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;color:' + fg + ';background:' + bg + ';white-space:nowrap;">' + txt + '</span>';
  function azione(spesa, previsto) {
    if (!(Number(spesa) > 0)) return '';
    if (!(Number(previsto) > 0)) return Number(spesa) >= MIN_SPESA ? pill('Cambia o spegni', '#b91c1c', '#fee2e2') : pill('Troppo presto', '#64748b', '#f1f5f9');
    const p = perc(spesa, previsto);
    if (p <= VERDE) return pill('Rafforza', '#15803d', '#dcfce7');
    if (p <= GIALLO) return pill("Tieni d'occhio", '#b45309', '#fef3c7');
    return pill('Cambia o spegni', '#b91c1c', '#fee2e2');
  }
  const dove = (r) => [r.meta > 0 ? 'Meta' : '', r.google > 0 ? 'Google' : '', r.chatgpt > 0 ? 'ChatGPT' : ''].filter(Boolean).join(' + ') || '—';

  let giorni = 30, pers = null, dati = null, daCollegare = [], msg = '';
  const periodo = () => pers || { da: piuGiorni(oggi(), -(giorni - 1)), a: oggi() };

  const css = '<style>'
    + '.rc{max-width:1000px;width:100%;margin:0 auto;padding:12px;box-sizing:border-box;overflow-x:hidden;}'
    + '.rc *{box-sizing:border-box;}'
    + '.rc h2{font-size:16px;color:#0E5A7A;margin:22px 0 8px;}'
    + '.rc-btn{border:1.5px solid #e2e8f0;background:#fff;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer;}'
    + '.rc-btn.on{background:#0E5A7A;color:#fff;border-color:#0E5A7A;}'
    + '.rc-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:10px 0;}'
    + '.rc-kpi>div{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;}'
    + '.rc-kpi b{display:block;font-size:20px;}.rc-kpi small{color:#64748b;font-size:12px;}'
    + '.rc-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin:10px 0;max-width:100%;min-width:0;}'
    + '.rc-r{padding:10px 0;border-top:1px solid #f1f5f9;}.rc-r:first-child{border-top:0;}'
    + '.rc-r-top{display:flex;gap:8px;align-items:flex-start;justify-content:space-between;}'
    + '.rc-r-nome{font-weight:700;font-size:14px;overflow-wrap:anywhere;min-width:0;}'
    + '.rc-r-sub{color:#64748b;font-size:12px;margin-top:2px;overflow-wrap:anywhere;}'
    + '.rc-r-num{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px;font-size:13px;color:#475569;}'
    + '.rc-r-num b{color:#0f172a;}'
    + '.rc-r.pass .rc-r-nome{font-style:italic;color:#64748b;font-weight:600;}'
    + '.rc-tot{background:#f8fafc;border-radius:10px;padding:10px;margin-top:6px;}'
    + '.rc-mini{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;margin:8px 0;}'
    + '.rc-mini>div{background:#f8fafc;border-radius:10px;padding:8px;}.rc-mini b{display:block;font-size:15px;}.rc-mini small{color:#64748b;font-size:11px;}'
    + '.rc-scroll{overflow-x:auto;max-width:100%;}'
    + '.rc table{border-collapse:collapse;width:100%;font-size:13px;min-width:620px;}'
    + '.rc th,.rc td{padding:7px 6px;border-bottom:1px solid #f1f5f9;text-align:left;white-space:nowrap;}'
    + '.rc th{color:#64748b;font-size:11px;font-weight:600;}.rc .n{text-align:right;}'
    + '.rc tfoot td{font-weight:800;border-top:2px solid #e2e8f0;}'
    + '.rc tr.pass td{color:#64748b;font-style:italic;}'
    + '.rc select{border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;font-size:13px;background:#fff;max-width:100%;margin-top:6px;}'
    + '.rc-nota{color:#64748b;font-size:12.5px;margin:4px 0 8px;}'
    + '</style>';

  function scheletro(corpo) {
    const iv = periodo();
    const b = (g, l) => '<button class="rc-btn' + (!pers && giorni === g ? ' on' : '') + '" data-g="' + g + '">' + l + '</button>';
    container.innerHTML = css + '<div class="rc">'
      + '<a href="#/bo-marketing" style="display:inline-block;margin:0 0 10px;padding:7px 12px;border-radius:10px;background:#f1f5f9;color:#0f172a;font-weight:700;font-size:14px;text-decoration:none;">← Marketing</a>'
      + '<div style="font-size:22px;font-weight:800;">📈 Risultati campagne</div>'
      + '<div class="rc-nota">Spesa pubblicitaria confrontata con prenotazioni e incasso previsto. Le prenotazioni contano nel periodo in cui sono state fatte.</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:10px 0;">'
      + b(1, 'Oggi') + b(7, '7 giorni') + b(30, '30 giorni') + b(90, '90 giorni')
      + '<button class="rc-btn' + (pers ? ' on' : '') + '" id="rc-pers">📅 Personalizzato</button>'
      + '<button class="rc-btn" id="rc-agg" style="margin-left:auto;">↻ Aggiorna spesa</button></div>'
      + '<div id="rc-pers-box" style="display:none;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px;">'
      + '<label style="font-size:12px;color:#64748b;">Dal<br><input type="date" id="rc-da" value="' + iv.da + '" max="' + oggi() + '" style="padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;"></label>'
      + '<label style="font-size:12px;color:#64748b;">Al<br><input type="date" id="rc-a" value="' + iv.a + '" max="' + oggi() + '" style="padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;"></label>'
      + '<button class="rc-btn on" id="rc-applica">Applica</button></div>'
      + '<div class="rc-nota">Dal ' + dataIt(iv.da) + ' al ' + dataIt(iv.a) + (msg ? ' · <b style="color:#0E5A7A;">' + esc(msg) + '</b>' : '') + '</div>'
      + '<div id="rc-corpo">' + corpo + '</div></div>';
    container.querySelectorAll('[data-g]').forEach((x) => { x.onclick = () => { giorni = Number(x.dataset.g); pers = null; carica(); }; });
    container.querySelector('#rc-pers').onclick = () => { container.querySelector('#rc-pers-box').style.display = 'flex'; };
    container.querySelector('#rc-applica').onclick = () => {
      const da = container.querySelector('#rc-da').value, a = container.querySelector('#rc-a').value;
      if (!da || !a || da > a) { msg = 'Controlla le date'; scheletro(corpo); return; }
      pers = { da, a }; carica();
    };
    container.querySelector('#rc-agg').onclick = aggiornaSpesa;
  }

  async function aggiornaSpesa() {
    const iv = periodo();
    const g = Math.min(90, Math.max(1, Math.round((new Date(oggi()) - new Date(iv.da)) / 86400000) + 1));
    msg = '⏳ Leggo la spesa da Meta, Google e ChatGPT…'; scheletro(container.querySelector('#rc-corpo')?.innerHTML || '');
    const body = { azienda_id: aziendaId, giorni: g };
    const [a, b] = await Promise.all([
      supa().functions.invoke('ads-spesa-sync', { body }).then((r) => r.data).catch(() => null),
      supa().functions.invoke('meta-ads-spesa', { body }).then((r) => r.data).catch(() => null),
    ]);
    const err = [];
    const e1 = a && a.aziende && a.aziende[0];
    if (!a || !a.success) err.push('Google/ChatGPT');
    else { if (e1 && e1.google && e1.google.errore) err.push('Google'); if (e1 && e1.chatgpt && e1.chatgpt.errore) err.push('ChatGPT'); }
    if (!b || !b.success || (b.conti || []).some((c) => c.errore)) err.push('Meta');
    msg = err.length ? 'Spesa non aggiornata per: ' + err.join(', ') : 'Spesa aggiornata';
    carica();
  }

  async function carica() {
    const iv = periodo();
    scheletro('<div class="rc-card" style="color:#64748b;">⏳ Carico…</div>');
    const [r, s] = await Promise.all([
      supa().rpc('risultati_campagne', { p_azienda: aziendaId, p_da: iv.da, p_a: iv.a }),
      supa().from('v_ads_spesa').select('piattaforma, campaign_id, nome_campagna, spesa').eq('azienda_id', aziendaId)
        .is('campagna', null).is('evento', null).gte('data', iv.da).lte('data', iv.a),
    ]);
    if (r.error || !r.data || r.data.errore) {
      scheletro('<div class="rc-card" style="color:#b91c1c;">' + esc((r.data && r.data.errore) || (r.error && r.error.message) || 'Dati non disponibili') + '</div>');
      return;
    }
    dati = r.data;
    // campagne senza utm e senza evento: solo quelle che il calcolo non ha potuto attribuire
    const idsDaCollegare = new Set();
    (dati.eventi || []).filter((e) => e.evento === 'Da collegare').forEach((e) => (e.righe || []).forEach((x) => (x.ads || []).forEach((a) => idsDaCollegare.add(a.piattaforma + '|' + a.campaign_id))));
    const agg = {};
    (s.data || []).forEach((x) => {
      const k = x.piattaforma + '|' + x.campaign_id;
      if (!idsDaCollegare.has(k)) return;
      if (!agg[k]) agg[k] = { piattaforma: x.piattaforma, campaign_id: x.campaign_id, nome: x.nome_campagna, spesa: 0 };
      agg[k].spesa += Number(x.spesa || 0);
    });
    daCollegare = Object.values(agg).filter((x) => x.spesa > 0).sort((a, b) => b.spesa - a.spesa);
    disegna();
    msg = '';
  }

  function sceltaEvento(attr, attuale) {
    const nomi = [...new Set((dati.eventi || []).map((e) => e.evento).filter((n) => n && n !== 'Da collegare'))].sort();
    return '<select ' + attr + '><option value="">' + (attuale ? 'sposta…' : 'scegli…') + '</option>'
      + nomi.filter((n) => n !== attuale).map((n) => '<option value="' + esc(n) + '">' + esc(n) + '</option>').join('')
      + '<option value="__nuovo">➕ Nuovo evento…</option></select>';
  }

  function disegna() {
    const ev = (dati.eventi || []);
    const t = dati.totale || {};
    const pTot = perc(t.spesa, t.previsto);
    const passTot = ev.reduce((s, e) => s + (e.spesa > 0 ? (e.righe || []).filter((x) => x.link === 'passaparola o link senza provenienza').reduce((q, x) => q + Number(x.previsto || 0), 0) : 0), 0);
    const pSenzaPass = perc(t.spesa, Number(t.previsto || 0) - passTot);
    let h = '';

    h += '<div class="rc-kpi">'
      + '<div><b>' + eur(t.spesa) + '</b><small>spesa · Meta ' + n2(t.meta) + ' · Google ' + n2(t.google) + ' · ChatGPT ' + n2(t.chatgpt) + '</small></div>'
      + '<div><b>' + n0(t.prenotazioni) + '</b><small>prenotazioni</small></div>'
      + '<div><b>' + eur(t.previsto) + '</b><small>incasso previsto · di cui ' + eur(t.incassato) + ' già incassati</small></div>'
      + '<div style="border:2px solid ' + colP(pTot) + ';background:' + sfP(pTot) + ';"><b style="color:' + colP(pTot) + ';">' + fmtP(pTot) + '</b><small>tutte le campagne: pubblicità sul previsto</small></div>'
      + '</div>'
      + '<div class="rc-nota">% pubblicità = spesa ÷ incasso previsto. Verde fino all\'8%, giallo fino al 15%, rosso sopra.'
      + (passTot > 0 && pSenzaPass != null ? ' Senza le prenotazioni da passaparola saremmo al ' + fmtP(pSenzaPass) + '.' : '') + '</div>';

    // classifica di tutte le campagne
    const cl = [];
    ev.forEach((e) => (e.righe || []).forEach((x) => { if (Number(x.spesa) > 0) cl.push(Object.assign({ evento: e.evento }, x)); }));
    cl.sort((a, b) => b.spesa - a.spesa);
    h += '<h2>Tutte le campagne</h2><div class="rc-nota"><b>Rafforza</b> fino all\'8% · <b>Tieni d\'occhio</b> fino al 15% · <b>Cambia o spegni</b> sopra il 15% o con più di 10 € spesi e nessun previsto · <b>Troppo presto</b> sotto i 10 € senza prenotazioni.</div>';
    if (!cl.length) h += '<div class="rc-card" style="color:#64748b;">Nessuna spesa pubblicitaria nel periodo. Se le campagne sono attive tocca "Aggiorna spesa".</div>';
    else {
      h += '<div class="rc-card">'
        + cl.map((x) => {
          // nome vero della campagna (come su Meta/Google) al posto della sigla tecnica del link (es. wedding-us)
          const nomiAds = [...new Set((x.ads || []).map((a) => a.nome).filter(Boolean))];
          const nome = nomiAds.length
            ? nomiAds.slice(0, 2).join(', ') + (nomiAds.length > 2 ? ' +' + (nomiAds.length - 2) : '')
            : (x.link === 'annunci senza link tracciato' ? 'annunci senza link' : x.link);
          const p = perc(x.spesa, x.previsto);
          return '<div class="rc-r"><div class="rc-r-top"><span class="rc-r-nome">' + esc(nome) + '</span>' + azione(x.spesa, x.previsto) + '</div>'
            + '<div class="rc-r-sub">' + esc(x.evento) + ' · ' + dove(x) + '</div>'
            + '<div class="rc-r-num"><span>Spesa <b>' + eur(x.spesa) + '</b></span><span>Pren. <b>' + n0(x.prenotazioni) + '</b></span>'
            + '<span>Previsto <b>' + eur(x.previsto) + '</b></span><span style="color:' + colP(p) + ';font-weight:800;">' + fmtP(p) + '</span></div></div>';
        }).join('')
        + '<div class="rc-tot"><div class="rc-r-top"><span class="rc-r-nome">Totale tutte le campagne</span>' + azione(t.spesa, t.previsto) + '</div>'
        + '<div class="rc-r-num"><span>Spesa <b>' + eur(t.spesa) + '</b></span><span>Pren. <b>' + n0(t.prenotazioni) + '</b></span>'
        + '<span>Previsto <b>' + eur(t.previsto) + '</b></span><span style="color:' + colP(pTot) + ';font-weight:800;">' + fmtP(pTot) + '</span></div></div>'
        + '</div>';
    }

    // eventi
    h += '<h2>Eventi</h2>';
    ev.filter((e) => e.evento !== 'Da collegare').forEach((e) => {
      const p = perc(e.spesa, e.previsto);
      const resa = Number(e.spesa) > 0 ? Number(e.previsto || 0) / Number(e.spesa) : null;
      const tag = Number(e.spesa) > 0
        ? (p != null ? pill(fmtP(p) + ' di pubblicità sul previsto', colP(p), sfP(p)) : pill('nessun previsto', '#b91c1c', '#fee2e2'))
        : pill('senza pubblicità', '#64748b', '#f1f5f9');
      h += '<div class="rc-card"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;"><b style="font-size:16px;">' + esc(e.evento) + '</b>' + tag + '</div>'
        + '<div class="rc-mini">'
        + '<div><b>' + eur(e.spesa) + '</b><small>' + (dove(e) !== '—' ? dove(e) : 'nessuna spesa') + '</small></div>'
        + '<div><b>' + n0(e.visite) + '</b><small>visite' + (Number(e.click) > 0 ? ' · ' + n0(e.click) + ' clic pagati' : '') + '</small></div>'
        + '<div><b>' + n0(e.prenotazioni) + (Number(e.coperti) > 0 ? ' · ' + n0(e.coperti) + ' pers' : '') + '</b><small>prenotazioni</small></div>'
        + (e.costo_prenotazione != null ? '<div><b>' + eur(e.costo_prenotazione) + '</b><small>costo per prenotazione</small></div>' : '')
        + (resa != null && e.previsto > 0 ? '<div><b>' + eur(resa) + '</b><small>previsti per 1 € speso</small></div>' : '')
        + '<div><b>' + eur(e.previsto) + '</b><small>previsto' + (Number(e.incassato) > 0 ? ' · di cui ' + eur(e.incassato) + ' già incassati' : '') + '</small></div>'
        + '</div>'
        + (e.righe || []).map((x) => {
          const px = perc(x.spesa, x.previsto);
          const speciale = SPECIALI.indexOf(x.link) >= 0;
          const pass = x.link === 'passaparola o link senza provenienza' || x.link === 'whatsapp senza link tracciato';
          const spese = [x.meta > 0 ? 'Meta <b>' + n2(x.meta) + '</b>' : '', x.google > 0 ? 'Google <b>' + n2(x.google) + '</b>' : '', x.chatgpt > 0 ? 'ChatGPT <b>' + n2(x.chatgpt) + '</b>' : '']
            .filter(Boolean).map((s) => '<span>' + s + '</span>').join('');
          return '<div class="rc-r' + (pass ? ' pass' : '') + '"><div class="rc-r-top"><span class="rc-r-nome">' + esc(x.link) + '</span>'
            + (Number(x.spesa) > 0 ? '<span style="color:' + colP(px) + ';font-weight:800;font-size:13px;white-space:nowrap;">' + fmtP(px) + '</span>' : '') + '</div>'
            + '<div class="rc-r-num">' + spese
            + (x.visite > 0 ? '<span>Visite <b>' + n0(x.visite) + '</b></span>' : '')
            + '<span>Pren. <b>' + n0(x.prenotazioni) + '</b></span><span>Previsto <b>' + eur(x.previsto) + '</b></span></div>'
            + (speciale ? '' : sceltaEvento('class="rc-sposta" data-utm="' + esc(x.link) + '"', e.evento)) + '</div>';
        }).join('')
        + '</div>';
    });

    // da collegare
    if (daCollegare.length) {
      h += '<h2>Da collegare</h2><div class="rc-nota">Campagne con spesa ma senza utm nel link. Scegli l\'evento una volta: da lì in poi la spesa va sotto quell\'evento.</div>'
        + '<div class="rc-card">'
        + daCollegare.map((x) => '<div class="rc-r"><div class="rc-r-top"><span class="rc-r-nome">' + esc(x.nome || x.campaign_id) + '</span><b style="white-space:nowrap;">' + eur(x.spesa) + '</b></div>'
          + '<div class="rc-r-sub">' + esc(x.piattaforma) + '</div>'
          + sceltaEvento('class="rc-collega" data-p="' + esc(x.piattaforma) + '" data-c="' + esc(x.campaign_id) + '"', null) + '</div>').join('')
        + '</div>';
    }

    scheletro(h);
    const chiediNome = (sel) => {
      if (sel.value !== '__nuovo') return sel.value;
      const n = (window.prompt('Nome del nuovo evento (es. Natale 2026)') || '').trim();
      if (!n) { sel.value = ''; return ''; }
      return n;
    };
    container.querySelectorAll('.rc-collega').forEach((sel) => {
      sel.onchange = async () => {
        const evento = chiediNome(sel); if (!evento) return;
        sel.disabled = true;
        const { error } = await supa().from('ads_campagne_mappa').upsert({ azienda_id: aziendaId, piattaforma: sel.dataset.p, campaign_id: sel.dataset.c, evento: evento, aggiornato_at: new Date().toISOString() }, { onConflict: 'azienda_id,piattaforma,campaign_id' });
        msg = error ? 'Non salvato: ' + error.message : 'Collegata a ' + evento;
        carica();
      };
    });
    container.querySelectorAll('.rc-sposta').forEach((sel) => {
      sel.onchange = async () => {
        const evento = chiediNome(sel); if (!evento) return;
        sel.disabled = true;
        const { error } = await supa().from('marketing_eventi_mappa').upsert({ azienda_id: aziendaId, tipo: 'utm', chiave: sel.dataset.utm, evento: evento, aggiornato_at: new Date().toISOString() }, { onConflict: 'azienda_id,tipo,chiave' });
        msg = error ? 'Non salvato: ' + error.message : sel.dataset.utm + ' spostato in ' + evento;
        carica();
      };
    });
  }

  carica();
}
