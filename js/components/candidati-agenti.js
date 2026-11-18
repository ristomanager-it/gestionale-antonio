// CANDIDATI AGENTI — Piattaforma › Programma Agenti › Candidati (17/11/2026).
// I candidati li inseriscono i referenti (chi ce li presenta, ognuno con il suo link) dalla pagina candidati-agenti.html?k=CODICE, senza login.
// Da qui si scrive ai candidati: email automatica, WhatsApp con il testo pronto finché Meta non approva il modello.
// Ogni messaggio va anche al referente che ha presentato il candidato: deciso da Antonio, non si può togliere.
const sb = () => window.supabaseClient || window.supabase;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STATI = { inserito: 'Inserito', invitato: 'Invitato', confermato: 'Confermato', attivo: 'Agente attivo', non_interessato: 'Non interessato' };
const COLORI = { inserito: '#e2e8f0;color:#334155', invitato: '#ede9fe;color:#5b21b6', confermato: '#dcfce7;color:#166534', attivo: '#dbeafe;color:#1e40af', non_interessato: '#f1f5f9;color:#64748b' };
const MODELLI = {
  invito: { nome: 'Invito alla formazione', testo: 'Ciao {nome}, sono Antonio Carullo di Ristoflow. {referente} mi ha parlato di te.\nMartedì 1 dicembre alle 18:00 a Campo Antico presentiamo Ristoflow ai nuovi agenti: due orette per mostrarvi il nostro prodotto, poi stiamo a cena insieme. Siamo sicuri che ti piacerà.\nCi sei? Rispondi a questo messaggio per confermare. Per urgenze puoi chiamarmi al 393 096 5070.' },
  promemoria: { nome: 'Promemoria il giorno prima', testo: 'Ciao {nome}, ti ricordo che domani alle 18:00 ci vediamo a Campo Antico per la presentazione di Ristoflow agli agenti. Per qualsiasi urgenza sono al 393 096 5070. A presto!' },
  benvenuto: { nome: 'Benvenuto da agente', testo: 'Ciao {nome}, benvenuto in Ristoflow. Da oggi sei dei nostri: a breve ricevi l\'accesso alla tua home agente.' },
  libero: { nome: 'Messaggio libero', testo: 'Ciao {nome}, ' },
};
const LINK_BASE = 'https://app.ristoflow-ai.com/candidati-agenti.html?k=';

let _filtro = 'tutti', _modello = 'invito', _sel = new Set();

export async function montaCandidati(el) {
  el.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center">Caricamento…</div>';
  const [{ data: cand, error: e1 }, { data: refs }, { data: msg }] = await Promise.all([
    sb().from('agenti_candidati').select('*').order('created_at', { ascending: false }),
    sb().from('rete_referenti').select('*').order('created_at'),
    sb().from('agenti_candidati_messaggi').select('candidato_id, modello, canali, created_at, testo').order('created_at', { ascending: false }).limit(500),
  ]);
  if (e1) { el.innerHTML = '<div style="color:#b42318">Errore: ' + esc(e1.message) + '</div>'; return; }
  const nomeRef = {}; (refs || []).forEach(r => { nomeRef[r.id] = r.nome; });
  const ultimo = {}, storico = {};
  (msg || []).forEach(m => { if (!ultimo[m.candidato_id]) ultimo[m.candidato_id] = m; (storico[m.candidato_id] = storico[m.candidato_id] || []).push(m); });
  const lista = (cand || []).filter(c => _filtro === 'tutti' || c.stato === _filtro);
  const data = (d) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'numeric' });
  const chip = (k, l, on) => '<button data-cf="' + k + '" style="border:1.5px solid ' + (on ? '#0E5A7A' : '#e2e8f0') + ';color:' + (on ? '#0E5A7A' : '#475569') + ';background:#fff;border-radius:20px;padding:5px 12px;font-size:13px;font-weight:' + (on ? 700 : 500) + ';cursor:pointer;margin:2px">' + l + '</button>';

  el.innerHTML = `
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:14px">
    <div style="font-weight:800;margin-bottom:6px">Chi ci presenta i candidati</div>
    ${(refs || []).map(r => `
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #f1f5f9">
        <b style="min-width:110px">${esc(r.nome)} ${esc(r.cognome || '')}</b>
        <input data-rt="${r.id}" value="${esc(r.telefono || '')}" placeholder="Telefono per la copia" style="padding:7px;border:1px solid #cbd5e1;border-radius:8px;width:150px">
        <input data-re="${r.id}" value="${esc(r.email || '')}" placeholder="Email per la copia" style="padding:7px;border:1px solid #cbd5e1;border-radius:8px;width:200px">
        <button data-rs="${r.id}" style="padding:7px 12px;border:none;border-radius:8px;background:#0E5A7A;color:#fff;font-weight:700;cursor:pointer">Salva</button>
        <button data-rl="${esc(LINK_BASE + r.codice)}" style="padding:7px 12px;border:1.5px solid #0E5A7A;border-radius:8px;background:#fff;color:#0E5A7A;font-weight:700;cursor:pointer">📋 Copia il suo link</button>
        <a href="https://wa.me/?text=${encodeURIComponent('Ciao ' + r.nome + ', da questo link inserisci i candidati agenti che vuoi presentarci. Li contattiamo noi e ti mettiamo sempre in copia: ' + LINK_BASE + r.codice)}" target="_blank" style="padding:7px 12px;border-radius:8px;background:#16a34a;color:#fff;font-weight:700;text-decoration:none">WhatsApp</a>
      </div>`).join('')}
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 0 0;border-top:1px solid #f1f5f9">
      <b style="min-width:110px">➕ Nuovo</b>
      <input id="nr-nome" placeholder="Nome" style="padding:7px;border:1px solid #cbd5e1;border-radius:8px;width:120px">
      <input id="nr-cognome" placeholder="Cognome" style="padding:7px;border:1px solid #cbd5e1;border-radius:8px;width:120px">
      <input id="nr-tel" placeholder="Telefono" style="padding:7px;border:1px solid #cbd5e1;border-radius:8px;width:130px">
      <input id="nr-email" placeholder="Email" style="padding:7px;border:1px solid #cbd5e1;border-radius:8px;width:180px">
      <button id="nr-aggiungi" style="padding:7px 12px;border:none;border-radius:8px;background:#0E5A7A;color:#fff;font-weight:700;cursor:pointer">Aggiungi: avrà il suo link</button>
    </div>
    <div style="font-size:12px;color:#64748b;margin-top:6px">Ognuno ha il suo link e vede solo i candidati che ha inserito lui. Senza telefono ed email la copia non può partire.</div>
  </div>

  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px">
      <div><b>Candidati</b> <span style="color:#64748b">· ${(cand || []).length}</span></div>
      <div>${chip('tutti', 'Tutti', _filtro === 'tutti')}${Object.keys(STATI).map(k => chip(k, STATI[k], _filtro === k)).join('')}</div>
    </div>
    <div style="overflow-x:auto"><table style="width:100%;min-width:720px;border-collapse:collapse;font-size:14px">
      <tr style="color:#64748b;font-size:12px;text-align:left"><th style="padding:8px"><input type="checkbox" id="ca-tutti"></th><th>Candidato</th><th>Zona · cosa vende</th><th>Portato da</th><th>Stato</th><th>Ultimo messaggio</th></tr>
      ${lista.length ? lista.map(c => `
        <tr style="border-top:1px solid #f1f5f9;vertical-align:top">
          <td style="padding:8px"><input type="checkbox" data-cs="${c.id}" ${_sel.has(c.id) ? 'checked' : ''}></td>
          <td style="padding:8px">${esc(c.nome)} ${esc(c.cognome || '')}<div style="font-size:12px;color:#64748b">${esc(c.telefono || '')}${c.telefono && c.email ? ' · ' : ''}${esc(c.email || '')}</div>${c.note ? '<div style="font-size:12px;color:#64748b">' + esc(c.note) + '</div>' : ''}</td>
          <td style="padding:8px">${esc([c.zona, c.settore].filter(Boolean).join(' · '))}</td>
          <td style="padding:8px">${esc(nomeRef[c.referente_id] || '—')}</td>
          <td style="padding:8px"><select data-cst="${c.id}" style="padding:4px 6px;border-radius:20px;border:none;font-size:12px;font-weight:700;background:${COLORI[c.stato] || COLORI.inserito}">${Object.keys(STATI).map(k => '<option value="' + k + '"' + (k === c.stato ? ' selected' : '') + '>' + STATI[k] + '</option>').join('')}</select></td>
          <td style="padding:8px">${ultimo[c.id] ? esc((MODELLI[ultimo[c.id].modello] || MODELLI.libero).nome) + ' · ' + data(ultimo[c.id].created_at) + (storico[c.id].length > 1 ? '<div style="font-size:12px;color:#64748b">' + storico[c.id].length + ' messaggi</div>' : '') : '—'}</td>
        </tr>`).join('') : '<tr><td colspan="6" style="padding:14px;color:#64748b">Nessun candidato' + (_filtro !== 'tutti' ? ' in questo stato' : '') + '. Arrivano dal link del referente.</td></tr>'}
    </table></div>
  </div>

  <div id="ca-scrivi" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-top:14px">
    <div style="font-weight:800">✉️ Scrivi ai selezionati: <span id="ca-n">${_sel.size}</span></div>
    <div style="margin:8px 0">${Object.keys(MODELLI).map(k => '<button data-cm="' + k + '" style="border:1.5px solid ' + (k === _modello ? '#0E5A7A' : '#e2e8f0') + ';color:' + (k === _modello ? '#0E5A7A' : '#475569') + ';background:#fff;border-radius:20px;padding:5px 12px;font-size:13px;font-weight:' + (k === _modello ? 700 : 500) + ';cursor:pointer;margin:2px">' + MODELLI[k].nome + '</button>').join('')}</div>
    <textarea id="ca-testo" rows="5" style="width:100%;box-sizing:border-box;padding:10px;border:1.5px solid #cbd5e1;border-radius:10px;font:inherit">${esc(MODELLI[_modello].testo)}</textarea>
    <div style="font-size:12px;color:#64748b">{nome} diventa il nome del candidato, {referente} il nome di chi l'ha presentato.</div>
    <div style="margin:10px 0;display:flex;gap:16px;flex-wrap:wrap">
      <label><input type="checkbox" id="ca-wa" checked> WhatsApp</label>
      <label><input type="checkbox" id="ca-em" checked> Email</label>
    </div>
    <div style="color:#15803d;font-weight:700;font-size:14px">✓ Copia a chi ha presentato il candidato: sempre.</div>
    <button id="ca-invia" style="margin-top:10px;padding:11px 18px;border:none;border-radius:10px;background:#7C3AED;color:#fff;font-weight:700;cursor:pointer">Invia</button>
    <div id="ca-esito" style="margin-top:12px"></div>
  </div>`;

  const ridisegna = () => montaCandidati(el);
  el.querySelectorAll('[data-cf]').forEach(b => b.onclick = () => { _filtro = b.dataset.cf; ridisegna(); });
  el.querySelectorAll('[data-cm]').forEach(b => b.onclick = () => { _modello = b.dataset.cm; ridisegna(); });
  el.querySelectorAll('[data-cs]').forEach(x => x.onchange = () => { x.checked ? _sel.add(x.dataset.cs) : _sel.delete(x.dataset.cs); el.querySelector('#ca-n').textContent = _sel.size; });
  const tutti = el.querySelector('#ca-tutti');
  if (tutti) tutti.onchange = () => { lista.forEach(c => tutti.checked ? _sel.add(c.id) : _sel.delete(c.id)); ridisegna(); };
  el.querySelectorAll('[data-cst]').forEach(s => s.onchange = async () => {
    const { error } = await sb().from('agenti_candidati').update({ stato: s.value, updated_at: new Date().toISOString() }).eq('id', s.dataset.cst);
    if (error) alert(error.message); else ridisegna();
  });
  el.querySelectorAll('[data-rl]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.rl); b.textContent = 'Copiato ✓'; } catch (e) { prompt('Link', b.dataset.rl); } });
  el.querySelectorAll('[data-rs]').forEach(b => b.onclick = async () => {
    const id = b.dataset.rs;
    const { error } = await sb().from('rete_referenti').update({ telefono: el.querySelector('[data-rt="' + id + '"]').value.trim() || null, email: el.querySelector('[data-re="' + id + '"]').value.trim().toLowerCase() || null }).eq('id', id);
    if (error) alert(error.message); else b.textContent = 'Salvato ✓';
  });
  el.querySelector('#nr-aggiungi').onclick = async () => {
    const nome = el.querySelector('#nr-nome').value.trim();
    if (!nome) { alert('Serve almeno il nome.'); return; }
    const { error } = await sb().from('rete_referenti').insert({ nome, cognome: el.querySelector('#nr-cognome').value.trim() || null, telefono: el.querySelector('#nr-tel').value.trim() || null, email: el.querySelector('#nr-email').value.trim().toLowerCase() || null });
    if (error) alert(error.message); else ridisegna();
  };
  el.querySelector('#ca-invia').onclick = async () => {
    const esito = el.querySelector('#ca-esito');
    const canali = [el.querySelector('#ca-wa').checked ? 'whatsapp' : null, el.querySelector('#ca-em').checked ? 'email' : null].filter(Boolean);
    if (!_sel.size) { esito.innerHTML = '<span style="color:#b42318">Seleziona almeno un candidato.</span>'; return; }
    if (!canali.length) { esito.innerHTML = '<span style="color:#b42318">Scegli WhatsApp, email o tutti e due.</span>'; return; }
    const btn = el.querySelector('#ca-invia'); btn.disabled = true; btn.textContent = 'Invio…';
    const { data, error } = await sb().functions.invoke('agenti-candidati-invia', { body: { candidati: [..._sel], modello: _modello, testo: el.querySelector('#ca-testo').value, canali } });
    btn.disabled = false; btn.textContent = 'Invia';
    if (error || !data || !data.ok) { esito.innerHTML = '<span style="color:#b42318">' + esc((data && data.errore) || (error && error.message) || 'Invio non riuscito') + '</span>'; return; }
    const ok = (x) => x ? (x.ok ? '<span style="color:#15803d">✓</span>' : '<span style="color:#b42318" title="' + esc(x.errore) + '">✗ ' + esc(x.errore) + '</span>') : '';
    esito.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Fatto. Per WhatsApp tocca ogni pulsante: si apre con il testo pronto.</div>' + data.esiti.map(e => `
      <div style="border-top:1px solid #f1f5f9;padding:8px 0;font-size:14px">
        <b>${esc(e.nome)}</b>
        ${e.email ? ' · email ' + ok(e.email) : ''}${e.copia_email ? ' · copia email a ' + esc(e.referente) + ' ' + ok(e.copia_email) : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          ${e.wa && e.wa.ok ? '<span style="color:#15803d;font-weight:700;font-size:13px">✓ WhatsApp inviato da Ristoflow</span>' : ''}${e.copia_wa && e.copia_wa.ok ? '<span style="color:#15803d;font-weight:700;font-size:13px">✓ copia a ' + esc(e.referente) + '</span>' : ''}
          ${e.wa && e.wa.ok ? '' : e.wa_link ? '<a href="' + esc(e.wa_link) + '" target="_blank" style="padding:6px 10px;border-radius:8px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:13px">WhatsApp a ' + esc(e.nome.split(' ')[0]) + '</a>' : (canali.includes('whatsapp') ? '<span style="color:#b42318;font-size:13px">telefono mancante</span>' : '')}
          ${e.copia_wa_link ? '<a href="' + esc(e.copia_wa_link) + '" target="_blank" style="padding:6px 10px;border-radius:8px;background:#fff;border:1.5px solid #16a34a;color:#16a34a;text-decoration:none;font-weight:700;font-size:13px">Copia a ' + esc(e.referente) + '</a>' : (canali.includes('whatsapp') && e.referente ? '<span style="color:#b42318;font-size:13px">telefono di ' + esc(e.referente) + ' mancante</span>' : '')}
        </div>
      </div>`).join('');
    _sel = new Set();
  };
}
