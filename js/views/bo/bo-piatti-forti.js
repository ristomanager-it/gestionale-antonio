// js/views/bo/bo-piatti-forti.js
// Piatti forti della settimana (15/11/2026).
// Per ogni sede e giorno della settimana il ristoratore sceglie il piatto da far provare. Il cliente lo vede sulla
// pagina della sua prenotazione (link della conferma e del promemoria), il giorno della sua visita.
// Una sola schermata: Tony prepara la settimana dal menu, il ristoratore conferma o cambia un giorno.
// Didascalia con il Golden Circle (perche' -> come -> cosa) scritta da Tony con le parole del ristoratore.
// Tabella piatti_forti (unica per sede + giorno), RPC pubblica piatto_forte_del_giorno.

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

const GIORNI = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const BREVE = ['', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];
const C = { blu: '#0E5A7A', verde: '#16a34a', bordo: '#e5e7eb', soft: '#64748b', testo: '#1e293b' };
const GUIDA = 'assets/guide/piatti-forti.pdf';
const MAX_VIDEO_MB = 60;

let st = { aziendaId: null, sedi: [], sedeId: null, righe: {}, voci: [], cats: {} };

export async function render(container) {
  st.aziendaId = window.state?.azienda?.id;
  if (!st.aziendaId) { container.innerHTML = '<div style="padding:20px;color:#dc2626;">Azienda non selezionata</div>'; return; }
  container.innerHTML = '<div style="padding:24px;color:#94a3b8;">Caricamento...</div>';

  const { data: sedi } = await supa().from('sedi').select('id, nome').eq('azienda_id', st.aziendaId).order('nome');
  st.sedi = sedi || [];
  const attiva = window.state?.sedeAttiva?.id;
  st.sedeId = (st.sedi.find(s => s.id === attiva) || st.sedi[0] || {}).id || null;
  if (!st.sedeId) { container.innerHTML = '<div style="padding:24px;">Nessuna sede: create prima una sede.</div>'; return; }
  await carica();
  disegna(container);
}

async function carica() {
  const [{ data: righe }, voci] = await Promise.all([
    supa().from('piatti_forti').select('*').eq('sede_id', st.sedeId),
    vociMenu(st.sedeId),
  ]);
  st.righe = {};
  (righe || []).forEach(r => { st.righe[r.giorno_settimana] = r; });
  st.voci = voci;
}

// Piatti della carta della sede (non il menu del giorno), con categoria, foto e descrizione
async function vociMenu(sedeId) {
  const { data: menu } = await supa().from('menu').select('id').eq('sede_id', sedeId).eq('attivo', true).is('sorgente_menu_giorno_sede', null);
  const ids = (menu || []).map(m => m.id);
  if (!ids.length) return [];
  const { data: cats } = await supa().from('menu_categorie').select('id, nome, ordine').in('menu_id', ids);
  st.cats = {};
  (cats || []).forEach(c => { st.cats[c.id] = c; });
  const catIds = Object.keys(st.cats);
  if (!catIds.length) return [];
  const { data: voci } = await supa().from('menu_voci').select('id, nome, descrizione, prezzo, foto_url, categoria_id, attivo, visibile').in('categoria_id', catIds);
  return (voci || []).filter(v => v.attivo !== false && v.visibile !== false && Number(v.prezzo) > 0)
    .sort((a, b) => ((st.cats[a.categoria_id]?.ordine ?? 99) - (st.cats[b.categoria_id]?.ordine ?? 99)) || a.nome.localeCompare(b.nome));
}

function voce(id) { return st.voci.find(v => v.id === id) || null; }
function nomeSede() { return (st.sedi.find(s => s.id === st.sedeId) || {}).nome || ''; }

function disegna(container) {
  const vuota = !Object.keys(st.righe).length;
  const daCompletare = Object.values(st.righe).filter(r => r.attivo && r.da_completare).length;
  container.innerHTML = `
  <div style="max-width:760px;margin:0 auto;padding:16px;color:${C.testo};font-family:inherit;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
      <div><h2 style="margin:0;font-size:22px;">🍽️ Piatti forti della settimana</h2>
        <div style="color:${C.soft};font-size:13px;margin-top:2px;">Il cliente li vede sulla pagina della sua prenotazione, il giorno della visita.</div></div>
      <a href="${GUIDA}" target="_blank" style="font-size:13px;font-weight:700;color:${C.blu};text-decoration:none;border:1px solid #cbd5e1;border-radius:999px;padding:7px 12px;">📄 Guida (1 pagina)</a>
    </div>
    ${st.sedi.length > 1 ? `<div style="margin-top:12px;"><select id="pf-sede" style="padding:9px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;">${st.sedi.map(s => `<option value="${s.id}" ${s.id === st.sedeId ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></div>` : ''}
    <div style="background:#f0f7ff;border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.55;margin:14px 0;">
      <b>Perché:</b> chi ha prenotato riceve la conferma e il promemoria. Quando apre la pagina della prenotazione vede il piatto che quel giorno volete far provare, e arriva al tavolo che ha già deciso. Usatelo per i piatti che vi rendono riconoscibili o per far girare quello che avete in dispensa.
    </div>
    ${vuota ? `
      <div style="border:2px dashed #a7f3d0;background:#ecfdf5;border-radius:14px;padding:18px;text-align:center;margin-bottom:14px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:6px;">🤖 Tony prepara la settimana dal vostro menu</div>
        <div style="font-size:13px;color:${C.soft};margin-bottom:12px;">Sceglie un piatto al giorno, prima quelli con foto e descrizione. Poi toccate un giorno per cambiarlo.</div>
        <button id="pf-tony-settimana" style="background:${C.blu};color:#fff;border:none;border-radius:999px;padding:11px 18px;font-weight:700;font-size:14px;cursor:pointer;" ${st.voci.length ? '' : 'disabled'}>Prepara la settimana</button>
        ${st.voci.length ? '' : `<div style="font-size:12px;color:#b45309;margin-top:8px;">Questa sede non ha ancora una carta: create prima il menu.</div>`}
      </div>` : ''}
    ${daCompletare ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:10px 12px;font-size:13px;margin-bottom:12px;">✍️ <b>${daCompletare} ${daCompletare === 1 ? 'giorno da completare' : 'giorni da completare'}</b>: dite a Tony perché e come fate quel piatto, e lui scrive la didascalia.</div>` : ''}
    <div id="pf-lista">${[1, 2, 3, 4, 5, 6, 7].map(rigaHtml).join('')}</div>
    <div id="pf-editor"></div>
  </div>`;

  const sel = container.querySelector('#pf-sede');
  if (sel) sel.onchange = async () => { st.sedeId = sel.value; await carica(); disegna(container); };
  const bt = container.querySelector('#pf-tony-settimana');
  if (bt) bt.onclick = async () => { bt.disabled = true; bt.textContent = 'Tony sta scegliendo...'; await preparaSettimana(); await carica(); disegna(container); };
  container.querySelectorAll('[data-apri]').forEach(el => el.onclick = () => apriEditor(container, Number(el.dataset.apri)));
  container.querySelectorAll('[data-sw]').forEach(el => el.onclick = async (ev) => {
    ev.stopPropagation();
    const g = Number(el.dataset.sw), r = st.righe[g];
    if (!r) { apriEditor(container, g); return; }
    await supa().from('piatti_forti').update({ attivo: !r.attivo, updated_at: new Date().toISOString() }).eq('id', r.id);
    r.attivo = !r.attivo; disegna(container);
  });
}

function rigaHtml(g) {
  const r = st.righe[g];
  const v = r ? voce(r.voce_id) : null;
  const foto = r ? (r.foto_url || (v && v.foto_url)) : null;
  const media = r && r.video_url
    ? `<div style="width:56px;height:56px;border-radius:10px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none;">▶︎</div>`
    : foto ? `<img src="${esc(foto)}" alt="" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex:none;">`
      : `<div style="width:56px;height:56px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none;">${r ? '🍽️' : '＋'}</div>`;
  const on = r && r.attivo;
  return `<div data-apri="${g}" style="display:flex;gap:12px;align-items:center;border:1px solid ${C.bordo};border-radius:14px;padding:10px;margin-bottom:8px;cursor:pointer;background:#fff;${r && !r.attivo ? 'opacity:.55;' : ''}">
    <div style="width:42px;text-align:center;font-weight:800;font-size:13px;color:${C.blu};">${BREVE[g]}</div>
    ${media}
    <div style="flex:1;min-width:0;">
      ${r ? `<div style="font-weight:700;font-size:15px;">${esc(r.titolo)}${r.da_completare ? ' <span style="font-size:11px;background:#fff7ed;color:#c2410c;border-radius:999px;padding:2px 7px;font-weight:700;">da completare</span>' : ''}</div>
             <div style="font-size:12px;color:${C.soft};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.testo || '')}</div>`
          : `<div style="font-size:14px;color:#94a3b8;font-style:italic;">Nessun piatto — toccate per sceglierne uno</div>`}
    </div>
    <div data-sw="${g}" title="${on ? 'Attivo' : 'Spento'}" style="width:42px;height:24px;border-radius:999px;background:${on ? C.verde : '#cbd5e1'};position:relative;flex:none;">
      <div style="position:absolute;top:3px;${on ? 'right:3px' : 'left:3px'};width:18px;height:18px;border-radius:50%;background:#fff;"></div></div>
  </div>`;
}

// Tony prepara la settimana: un piatto al giorno (lun-sab), prima quelli con foto e descrizione, dai primi/secondi/griglia
async function preparaSettimana() {
  const punteggio = v => {
    const cat = (st.cats[v.categoria_id]?.nome || '').toLowerCase();
    let p = 0;
    if (v.foto_url) p += 4;
    if (v.descrizione && v.descrizione.length > 25) p += 3;
    if (/prim|second|grigl|carne|pesce|pizz|special|piatti/.test(cat)) p += 3;
    if (/vin|bevand|caff|birr|acqu|dessert|dolc|contorn|insalat/.test(cat)) p -= 10;
    return p;
  };
  const scelti = st.voci.slice().sort((a, b) => punteggio(b) - punteggio(a)).filter(v => punteggio(v) > 0).slice(0, 6);
  const righe = scelti.map((v, i) => ({
    azienda_id: st.aziendaId, sede_id: st.sedeId, giorno_settimana: i + 1, voce_id: v.id,
    titolo: v.nome, testo: v.descrizione || null, attivo: true, da_completare: true,
  }));
  if (righe.length) await supa().from('piatti_forti').upsert(righe, { onConflict: 'sede_id,giorno_settimana' });
}

function apriEditor(container, g) {
  const box = container.querySelector('#pf-editor');
  const r = st.righe[g] || { giorno_settimana: g, attivo: true };
  let mediaFoto = r.foto_url || null, mediaVideo = r.video_url || null;

  const gruppi = {};
  st.voci.forEach(v => { const n = st.cats[v.categoria_id]?.nome || 'Altro'; (gruppi[n] = gruppi[n] || []).push(v); });
  const opzioni = '<option value="">— scegliete un piatto —</option>' + Object.keys(gruppi).map(n =>
    `<optgroup label="${esc(n)}">${gruppi[n].map(v => `<option value="${v.id}" ${v.id === r.voce_id ? 'selected' : ''}>${esc(v.nome)} · ${Number(v.prezzo).toLocaleString('it-IT', { minimumFractionDigits: 2 })} €</option>`).join('')}</optgroup>`).join('');

  const lbl = t => `<label style="display:block;font-size:12px;font-weight:700;color:#475569;margin:12px 0 4px;">${t}</label>`;
  const area = (id, val, ph) => `<div style="position:relative;"><textarea id="${id}" rows="2" placeholder="${esc(ph)}" style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 44px 10px 10px;font-size:14px;font-family:inherit;resize:vertical;">${esc(val || '')}</textarea>
    <button type="button" data-mic="${id}" style="position:absolute;right:6px;top:6px;width:34px;height:34px;border:none;border-radius:50%;background:#f1f5f9;font-size:16px;cursor:pointer;">🎤</button></div>`;

  box.innerHTML = `
  <div id="pf-ov" style="position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:flex-end;justify-content:center;">
    <div style="background:#fff;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-weight:800;font-size:17px;">${GIORNI[g]}</div>
        <button id="pf-x" style="border:none;background:none;font-size:22px;cursor:pointer;">✕</button></div>

      ${lbl('Piatto (dal vostro menu)')}
      <select id="pf-voce" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;">${opzioni}</select>
      ${lbl('Titolo che vede il cliente')}
      <input id="pf-titolo" value="${esc(r.titolo || '')}" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;">

      ${lbl('Foto o video')}
      <div id="pf-media" style="margin-bottom:6px;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <label style="background:#f1f5f9;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;">📷 Foto<input id="pf-file-foto" type="file" accept="image/*" style="display:none;"></label>
        <label style="background:#f1f5f9;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;">🎬 Video<input id="pf-file-video" type="file" accept="video/*" style="display:none;"></label>
        <button type="button" id="pf-media-menu" style="background:none;border:none;color:${C.blu};font-size:13px;font-weight:700;cursor:pointer;">Usa la foto del menu</button>
      </div>
      <div id="pf-media-msg" style="font-size:12px;color:${C.soft};margin-top:4px;"></div>

      ${lbl('🎙️ Perché lo fate? Rispondete a voce, Tony scrive')}
      ${area('pf-perche', r.perche, 'es. È il piatto della nostra terra, lo faceva la nonna la domenica')}
      ${lbl('🎙️ Come lo fate?')}
      ${area('pf-come', r.come, 'es. La sfoglia la tiriamo noi ogni mattina')}

      ${lbl('Didascalia per il cliente — perché → come → cosa')}
      <textarea id="pf-testo" rows="4" style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:14px;font-family:inherit;">${esc(r.testo || '')}</textarea>
      <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">
        <button type="button" id="pf-tony" style="background:#fff;border:1px solid #cbd5e1;border-radius:999px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;">✨ Scrivi con Tony</button>
        <span id="pf-tony-msg" style="font-size:12px;color:${C.soft};"></span>
      </div>

      <label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-size:14px;"><input id="pf-attivo" type="checkbox" ${r.attivo !== false ? 'checked' : ''}> Mostralo ai clienti</label>

      <div style="display:flex;gap:8px;margin-top:16px;">
        ${r.id ? `<button id="pf-del" style="background:#fff;color:#b91c1c;border:1px solid #fecaca;border-radius:12px;padding:12px 14px;font-weight:700;cursor:pointer;">Togli</button>` : ''}
        <button id="pf-salva" style="flex:1;background:${C.blu};color:#fff;border:none;border-radius:12px;padding:12px;font-weight:800;font-size:15px;cursor:pointer;">Salva</button>
      </div>
      <div id="pf-esito" style="font-size:13px;margin-top:8px;"></div>
    </div>
  </div>`;

  const $ = s => box.querySelector(s);
  const chiudi = () => { box.innerHTML = ''; };
  $('#pf-x').onclick = chiudi;
  $('#pf-ov').onclick = e => { if (e.target.id === 'pf-ov') chiudi(); };

  const disegnaMedia = () => {
    const v = voce($('#pf-voce').value);
    const fotoMenu = v && v.foto_url;
    const el = $('#pf-media');
    if (mediaVideo) el.innerHTML = `<video src="${esc(mediaVideo)}" muted playsinline loop autoplay style="width:100%;max-height:220px;border-radius:12px;background:#000;"></video>`;
    else if (mediaFoto || fotoMenu) el.innerHTML = `<img src="${esc(mediaFoto || fotoMenu)}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;">${!mediaFoto ? `<div style="font-size:12px;color:${C.soft};margin-top:2px;">Foto presa dal menu</div>` : ''}`;
    else el.innerHTML = `<div style="font-size:13px;color:#b45309;">Nessuna foto: la pagina mostra il piatto anche senza, ma con la foto o un video rende di più.</div>`;
  };
  disegnaMedia();

  $('#pf-voce').onchange = () => {
    const v = voce($('#pf-voce').value);
    if (v) $('#pf-titolo').value = v.nome;
    disegnaMedia();
  };
  $('#pf-media-menu').onclick = () => { mediaFoto = null; mediaVideo = null; disegnaMedia(); };

  const caricaMedia = async (file, tipo) => {
    if (!file) return;
    const msg = $('#pf-media-msg');
    if (tipo === 'video' && file.size > MAX_VIDEO_MB * 1024 * 1024) { msg.textContent = 'Il video è troppo grande: massimo ' + MAX_VIDEO_MB + ' MB (bastano 10-20 secondi).'; msg.style.color = '#b91c1c'; return; }
    msg.textContent = '⏳ Caricamento...'; msg.style.color = C.soft;
    const ext = (file.name.split('.').pop() || (tipo === 'video' ? 'mp4' : 'jpg')).toLowerCase();
    const path = st.aziendaId + '/piatti-forti/' + st.sedeId + '-' + g + '-' + Date.now() + '.' + ext;
    const { error } = await supa().storage.from('media-aziende').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '31536000' });
    if (error) { msg.textContent = 'Errore: ' + error.message; msg.style.color = '#b91c1c'; return; }
    const url = supa().storage.from('media-aziende').getPublicUrl(path).data.publicUrl;
    if (tipo === 'video') { mediaVideo = url; } else { mediaFoto = url; mediaVideo = null; }
    msg.textContent = '✅ Caricato'; msg.style.color = C.verde;
    disegnaMedia();
  };
  $('#pf-file-foto').onchange = e => caricaMedia(e.target.files[0], 'foto');
  $('#pf-file-video').onchange = e => caricaMedia(e.target.files[0], 'video');

  // Dettatura: il microfono scrive nel campo accanto
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  box.querySelectorAll('[data-mic]').forEach(b => {
    if (!SR) { b.style.display = 'none'; return; }
    let rec = null;
    b.onclick = () => {
      if (rec) { try { rec.stop(); } catch (e) {} return; }
      const campo = $('#' + b.dataset.mic), base = campo.value ? campo.value + ' ' : '';
      rec = new SR(); rec.lang = 'it-IT'; rec.interimResults = true; rec.continuous = false;
      rec.onstart = () => { b.style.background = '#fecaca'; b.textContent = '⏺'; };
      rec.onresult = ev => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; campo.value = base + t; };
      rec.onend = () => { rec = null; b.style.background = '#f1f5f9'; b.textContent = '🎤'; };
      rec.onerror = () => {};
      rec.start();
    };
  });

  $('#pf-tony').onclick = async () => {
    const v = voce($('#pf-voce').value);
    const tm = $('#pf-tony-msg');
    const perche = $('#pf-perche').value.trim(), come = $('#pf-come').value.trim();
    if (!v && !$('#pf-titolo').value.trim()) { tm.textContent = 'Scegliete prima il piatto.'; return; }
    if (!perche && !come) { tm.textContent = 'Ditemi almeno perché o come lo fate.'; return; }
    tm.textContent = '✨ Tony sta scrivendo...';
    const { data, error } = await supa().functions.invoke('piatto-forte-testo', {
      body: { azienda_id: st.aziendaId, piatto: $('#pf-titolo').value.trim() || (v && v.nome), descrizione: v ? v.descrizione : '', perche, come, locale: nomeSede() }
    });
    if (error || !data || !data.ok) { tm.textContent = '⚠️ ' + ((data && data.errore) || (error && error.message) || 'Tony non risponde'); return; }
    $('#pf-testo').value = data.testo; tm.textContent = 'Fatto: rileggetela e salvate.';
  };

  if ($('#pf-del')) $('#pf-del').onclick = async () => {
    await supa().from('piatti_forti').delete().eq('id', r.id);
    await ricarica(container);
  };

  $('#pf-salva').onclick = async () => {
    const es = $('#pf-esito');
    const v = voce($('#pf-voce').value);
    const titolo = $('#pf-titolo').value.trim() || (v && v.nome) || '';
    if (!titolo) { es.textContent = 'Scegliete un piatto.'; es.style.color = '#b91c1c'; return; }
    const perche = $('#pf-perche').value.trim(), come = $('#pf-come').value.trim();
    const riga = {
      azienda_id: st.aziendaId, sede_id: st.sedeId, giorno_settimana: g,
      voce_id: v ? v.id : null, titolo, testo: $('#pf-testo').value.trim() || null,
      foto_url: mediaFoto, video_url: mediaVideo, perche: perche || null, come: come || null,
      attivo: $('#pf-attivo').checked, da_completare: !(perche && come), updated_at: new Date().toISOString(),
    };
    es.textContent = 'Salvataggio...'; es.style.color = C.soft;
    const { error } = await supa().from('piatti_forti').upsert(riga, { onConflict: 'sede_id,giorno_settimana' });
    if (error) { es.textContent = 'Errore: ' + error.message; es.style.color = '#b91c1c'; return; }
    await ricarica(container);
  };
}

async function ricarica(container) { await carica(); disegna(container); }
