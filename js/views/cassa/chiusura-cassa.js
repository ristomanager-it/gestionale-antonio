// ============================================================================
// chiusura-cassa.js — Lettura X, chiusura Z, riepilogo incassi, fondo cassa
// ----------------------------------------------------------------------------
// Chi la usa: admin da qualsiasi dispositivo; manager solo dal dispositivo
// registrato come punto cassa (Configurazione > Cassa > Punto cassa).
// Il controllo vero e' lato DB: puo_chiusura_cassa() e richiedi_report_fiscale().
// ============================================================================

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id || null;
  const token = aziendaId ? localStorage.getItem('rf_postazione_cassa_' + aziendaId) : null;

  if (!aziendaId) { container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>'; return; }

  container.innerHTML = '<div style="padding:24px;color:#64748b;">Caricamento…</div>';

  const { data: puo } = await supabase.rpc('puo_chiusura_cassa', { p_azienda: aziendaId, p_token: token });
  if (!puo) {
    container.innerHTML =
      '<div style="max-width:560px;margin:40px auto;padding:24px;background:#fff;border-radius:14px;text-align:center;">'
      + '<div style="font-size:40px;">🔒</div>'
      + '<div style="font-size:18px;font-weight:700;margin:8px 0;">Disponibile solo al punto cassa</div>'
      + '<div style="font-size:14px;color:#64748b;">La chiusura cassa si fa dal dispositivo della cassa. Se questo è il dispositivo giusto, chiedi a un admin di registrarlo in Configurazione › Cassa › Punto cassa.</div>'
      + '</div>';
    return;
  }

  let riep = null;
  let fondoOggi = null;
  let inCorso = false;

  const ETICHETTE = {
    contanti: '💵 Contanti',
    elettronico: '💳 Pagamento elettronico (carta, POS, Stripe)',
    buoni_pasto: '🎫 Buoni pasto',
    bonifico: '🏦 Non riscosso — bonifico',
    addebito: '🏨 Non riscosso — addebito',
    altro: '❔ Altro',
  };

  function gruppo(metodo) {
    const m = String(metodo || '').toLowerCase();
    if (m === 'contanti') return 'contanti';
    if (m === 'carta' || m === 'pos' || m === 'stripe') return 'elettronico';
    if (m === 'buoni_pasto' || m === 'bonifico' || m === 'addebito') return m;
    return 'altro';
  }

  function euro(n) {
    return '€ ' + (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function oggiISO() {
    const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  async function carica() {
    const [{ data: r, error: e }, { data: f }] = await Promise.all([
      supabase.rpc('riepilogo_cassa', { p_azienda: aziendaId }),
      supabase.from('cassa_fondi').select('*').eq('azienda_id', aziendaId).eq('data', oggiISO())
        .is('chiusura_id', null).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (e) { container.innerHTML = '<div style="padding:24px;color:#dc2626;">Errore: ' + esc(e.message) + '</div>'; return false; }
    riep = r || {};
    fondoOggi = f || null;
    return true;
  }

  function perMetodo() {
    const out = { contanti: 0, elettronico: 0, buoni_pasto: 0, bonifico: 0, addebito: 0, altro: 0 };
    const pm = riep.per_metodo || {};
    Object.keys(pm).forEach(function (k) { out[gruppo(k)] += Number(pm[k]) || 0; });
    return out;
  }

  function disegna() {
    const pm = perMetodo();
    const tavoli = riep.tavoli_aperti || [];
    const nScontrini = Number(riep.n_scontrini) || 0;
    const totale = Number(riep.totale) || 0;
    const medio = nScontrini ? totale / nScontrini : 0;
    const fondo = fondoOggi ? Number(fondoOggi.fondo) || 0 : 0;
    const atteso = fondo + pm.contanti;
    const dal = riep.dal && !String(riep.dal).startsWith('1970')
      ? new Date(riep.dal).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : 'nessuna Z registrata in Ristoflow';

    let avvisi = '';
    if (tavoli.length) {
      const nomi = tavoli.map(function (t) { return t.tavolo ? 'T' + esc(t.tavolo) : 'senza tavolo'; }).join(', ');
      avvisi += '<div class="cc-avv cc-rosso">⛔ ' + tavoli.length + ' comande ancora aperte (' + nomi + '). Chiudile prima della Z.</div>';
    }
    if (riep.errori) avvisi += '<div class="cc-avv cc-giallo">⚠️ ' + riep.errori + ' scontrini in errore nella coda fiscale.</div>';
    if (riep.in_coda) avvisi += '<div class="cc-avv cc-giallo">⏳ ' + riep.in_coda + ' documenti ancora in stampa.</div>';
    if (!avvisi) avvisi = '<div class="cc-avv cc-verde">✅ Nessun tavolo aperto, nessun documento in errore o in coda.</div>';

    const righeMetodi = Object.keys(pm).filter(function (k) { return pm[k] || k !== 'altro'; }).map(function (k) {
      return '<div class="cc-riga"><span>' + ETICHETTE[k] + '</span><b>' + euro(pm[k]) + '</b></div>';
    }).join('');

    const storico = (riep.ultime_z || []).map(function (z) {
      const d = z.elaborato_at ? new Date(z.elaborato_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
      const esito = z.stato === 'completato' ? '✅' : (z.stato === 'errore' ? '❌ ' + esc(z.errore_msg || '') : '⏳');
      return '<tr><td>' + d + '</td><td>' + esc(z.numero_scontrino || '—') + '</td><td>' + esito + '</td></tr>';
    }).join('');

    container.innerHTML =
      '<style>'
      + '.cc{max-width:760px;margin:0 auto;padding:16px;padding-bottom:40px;font-family:inherit;color:#0f172a}'
      + '.cc h2{font-size:15px;margin:22px 0 8px;color:#0E5A7A}'
      + '.cc-card{background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.06)}'
      + '.cc-riga{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px}'
      + '.cc-riga:last-child{border-bottom:none}.cc-riga b{font-variant-numeric:tabular-nums;white-space:nowrap}'
      + '.cc-tot{font-size:17px;font-weight:700}'
      + '.cc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}'
      + '.cc-box{background:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 1px 2px rgba(0,0,0,.06)}'
      + '.cc-box .n{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}.cc-box .l{font-size:12px;color:#64748b}'
      + '.cc-avv{border-radius:12px;padding:10px 14px;font-size:13px;margin-bottom:8px}'
      + '.cc-rosso{background:#fee2e2;color:#991b1b}.cc-giallo{background:#fef3c7;color:#92400e}.cc-verde{background:#dcfce7;color:#166534}'
      + '.cc-btn{display:block;width:100%;border-radius:12px;padding:14px;font-size:15px;font-weight:700;margin-top:10px;border:none;cursor:pointer}'
      + '.cc-btn:disabled{opacity:.5;cursor:wait}'
      + '.cc-x{background:#e0f2fe;color:#0E5A7A}.cc-z{background:#dc2626;color:#fff}.cc-salva{background:#0E5A7A;color:#fff;padding:10px}'
      + '.cc-sp{font-size:12px;color:#64748b;margin-top:4px}'
      + '.cc input{width:130px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;text-align:right}'
      + '.cc table{width:100%;border-collapse:collapse;font-size:13px}.cc th,.cc td{text-align:left;padding:7px 6px;border-bottom:1px solid #f1f5f9}.cc th{color:#64748b}'
      + '</style>'
      + '<div class="cc">'
      + '<div style="font-size:22px;font-weight:700;">🧾 Chiusura cassa</div>'
      + '<div style="font-size:13px;color:#64748b;">' + esc(window.state?.azienda?.nome || '') + ' · incassi dall\'ultima chiusura Z: ' + dal + '</div>'

      + '<h2>Prima di chiudere</h2>' + avvisi

      + '<h2>Incassi</h2>'
      + '<div class="cc-grid">'
      + '<div class="cc-box"><div class="n">' + euro(totale) + '</div><div class="l">Totale documenti</div></div>'
      + '<div class="cc-box"><div class="n">' + nScontrini + '</div><div class="l">Scontrini emessi</div></div>'
      + '<div class="cc-box"><div class="n">' + euro(medio) + '</div><div class="l">Scontrino medio</div></div>'
      + '</div>'

      + '<h2>Per metodo di pagamento</h2>'
      + '<div class="cc-card">' + righeMetodi
      + '<div class="cc-riga cc-tot"><span>Totale</span><b>' + euro(totale) + '</b></div></div>'
      + '<div class="cc-sp">Il pagamento elettronico deve coincidere con la chiusura del POS.</div>'

      + '<h2>Altri movimenti</h2>'
      + '<div class="cc-card">'
      + '<div class="cc-riga"><span>🎉 Sconti promo applicati (' + (riep.n_sconti || 0) + ')</span><b>− ' + euro(riep.sconti) + '</b></div>'
      + '<div class="cc-riga"><span>📋 Preconti stampati</span><b>' + (riep.n_preconti || 0) + '</b></div>'
      + '</div>'

      + '<h2>Contanti in cassa</h2>'
      + '<div class="cc-card">'
      + '<div class="cc-riga"><span>Fondo cassa di inizio giornata</span><b><input id="cc-fondo" type="number" step="0.01" inputmode="decimal" value="' + (fondoOggi ? fondoOggi.fondo : '') + '" placeholder="0,00"></b></div>'
      + '<div class="cc-riga"><span>Contanti da scontrini</span><b>' + euro(pm.contanti) + '</b></div>'
      + '<div class="cc-riga"><span>Atteso in cassa</span><b id="cc-atteso">' + euro(atteso) + '</b></div>'
      + '<div class="cc-riga"><span>Contati</span><b><input id="cc-contati" type="number" step="0.01" inputmode="decimal" value="' + (fondoOggi && fondoOggi.contanti_contati != null ? fondoOggi.contanti_contati : '') + '" placeholder="0,00"></b></div>'
      + '<div class="cc-riga"><span>Differenza</span><b id="cc-diff">—</b></div>'
      + '<button id="cc-salva" class="cc-btn cc-salva">Salva contanti</button>'
      + '<div id="cc-salva-esito" class="cc-sp"></div>'
      + '</div>'

      + '<h2>Stampante</h2>'
      + '<button id="cc-x" class="cc-btn cc-x">📄 Lettura X — totale parziale</button>'
      + '<div class="cc-sp">Stampa i totali senza chiudere la giornata. Si può fare quante volte vuoi.</div>'
      + '<button id="cc-z" class="cc-btn cc-z">🔒 Chiusura Z — chiudi la giornata</button>'
      + '<div class="cc-sp">Chiude la giornata fiscale e trasmette i corrispettivi. Una volta al giorno, a fine servizio.</div>'
      + '<div id="cc-esito" style="font-size:14px;font-weight:600;margin-top:10px;min-height:18px;"></div>'

      + '<h2>Ultime chiusure Z</h2>'
      + '<div class="cc-card">' + (storico
          ? '<table><tr><th>Data</th><th>Numero</th><th>Esito</th></tr>' + storico + '</table>'
          : '<div style="font-size:13px;color:#94a3b8;">Nessuna chiusura Z fatta da Ristoflow.</div>')
      + '</div>'
      + '</div>';

    collega(pm);
  }

  function aggiornaDiff(pm) {
    const fondo = Number(container.querySelector('#cc-fondo').value) || 0;
    const contatiVal = container.querySelector('#cc-contati').value;
    const atteso = fondo + pm.contanti;
    container.querySelector('#cc-atteso').textContent = euro(atteso);
    const diffEl = container.querySelector('#cc-diff');
    if (contatiVal === '') { diffEl.textContent = '—'; diffEl.style.color = ''; return null; }
    const diff = Math.round(((Number(contatiVal) || 0) - atteso) * 100) / 100;
    diffEl.textContent = (diff > 0 ? '+ ' : diff < 0 ? '− ' : '') + euro(Math.abs(diff));
    diffEl.style.color = diff === 0 ? '#16a34a' : '#dc2626';
    return { fondo: fondo, atteso: atteso, contati: Number(contatiVal) || 0, diff: diff };
  }

  async function salvaContanti(pm, chiusuraId) {
    const v = aggiornaDiff(pm);
    const fondo = Number(container.querySelector('#cc-fondo').value) || 0;
    const payload = {
      azienda_id: aziendaId, sede_id: sedeId, data: oggiISO(), fondo: fondo,
      contanti_attesi: fondo + pm.contanti,
      contanti_contati: v ? v.contati : null,
      differenza: v ? v.diff : null,
    };
    if (chiusuraId) payload.chiusura_id = chiusuraId;
    let res;
    if (fondoOggi) res = await supabase.from('cassa_fondi').update(payload).eq('id', fondoOggi.id).select().single();
    else res = await supabase.from('cassa_fondi').insert(payload).select().single();
    if (!res.error) fondoOggi = res.data;
    return res.error;
  }

  async function lanciaReport(tipo, pm) {
    if (inCorso) return;
    const esito = container.querySelector('#cc-esito');
    if (tipo === 'chiusura_z') {
      const tavoli = riep.tavoli_aperti || [];
      if (tavoli.length && !confirm('Ci sono ' + tavoli.length + ' comande ancora aperte. Chiudere comunque la giornata?')) return;
      if (!confirm('Confermi la chiusura Z? Chiude la giornata fiscale e trasmette i corrispettivi.')) return;
    }
    inCorso = true;
    container.querySelectorAll('.cc-x, .cc-z').forEach(function (b) { b.disabled = true; });
    esito.style.color = '#0E5A7A';
    esito.textContent = tipo === 'chiusura_z' ? '⏳ Chiusura Z in corso… non spegnere la stampante' : '⏳ Stampo la lettura X…';

    const { data: id, error } = await supabase.rpc('richiedi_report_fiscale', {
      p_azienda: aziendaId, p_tipo: tipo, p_token: token, p_sede: null,
    });
    if (error || !id) {
      esito.style.color = '#dc2626';
      esito.textContent = '❌ ' + (error?.message || 'Richiesta non riuscita');
      inCorso = false;
      container.querySelectorAll('.cc-x, .cc-z').forEach(function (b) { b.disabled = false; });
      return;
    }

    const scadenza = Date.now() + (tipo === 'chiusura_z' ? 120000 : 30000);
    let finale = null;
    while (Date.now() < scadenza) {
      await new Promise(function (r) { setTimeout(r, 1500); });
      const { data } = await supabase.from('coda_fiscale').select('stato, numero_scontrino, errore_msg').eq('id', id).single();
      if (data && (data.stato === 'completato' || data.stato === 'errore')) { finale = data; break; }
    }

    if (!finale) {
      esito.style.color = '#92400e';
      esito.textContent = '⚠️ Nessuna risposta dalla stampante. Controlla carta e Raspberry prima di riprovare.';
    } else if (finale.stato === 'errore') {
      esito.style.color = '#dc2626';
      esito.textContent = '❌ Stampante: ' + (finale.errore_msg || 'errore');
    } else {
      esito.style.color = '#16a34a';
      if (tipo === 'chiusura_z') {
        await salvaContanti(pm, id);
        esito.textContent = '✅ Giornata chiusa (' + (finale.numero_scontrino || 'Z') + ')';
      } else {
        esito.textContent = '✅ Lettura X stampata';
      }
    }
    inCorso = false;
    if (finale && finale.stato === 'completato' && tipo === 'chiusura_z') {
      setTimeout(async function () { if (await carica()) disegna(); container.querySelector('#cc-esito').textContent = '✅ Giornata chiusa'; }, 1500);
    } else {
      container.querySelectorAll('.cc-x, .cc-z').forEach(function (b) { b.disabled = false; });
    }
  }

  function collega(pm) {
    const f = container.querySelector('#cc-fondo');
    const c = container.querySelector('#cc-contati');
    f.oninput = function () { aggiornaDiff(pm); };
    c.oninput = function () { aggiornaDiff(pm); };
    aggiornaDiff(pm);
    container.querySelector('#cc-salva').onclick = async function () {
      const e = await salvaContanti(pm, null);
      const el = container.querySelector('#cc-salva-esito');
      el.style.color = e ? '#dc2626' : '#16a34a';
      el.textContent = e ? '❌ ' + e.message : '✅ Salvato';
    };
    container.querySelector('#cc-x').onclick = function () { lanciaReport('lettura_x', pm); };
    container.querySelector('#cc-z').onclick = function () { lanciaReport('chiusura_z', pm); };
  }

  if (await carica()) disegna();
}
