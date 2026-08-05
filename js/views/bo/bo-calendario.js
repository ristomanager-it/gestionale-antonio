// js/views/bo/bo-calendario.js
// Calendario editoriale social — griglia mensile, angolo del giorno, esito, promemoria

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function mostraToast(msg, tipo = 'success') { if (window.mostraToast) window.mostraToast(msg, tipo); }

const ANGOLI = {
  perche: { l: 'PERCHE', c: '#C98A0B', d: 'Il motivo, la storia, i valori' },
  come:   { l: 'COME',   c: '#0E7C86', d: 'Il metodo, la lavorazione, il dietro le quinte' },
  cosa:   { l: 'COSA',   c: '#6B4EA8', d: 'Il piatto, il prodotto, l\'offerta' },
};
const TIPI = {
  festa:         { l: 'Festa comandata',   c: '#B3261E' },
  giornata_food: { l: 'Giornata food',     c: '#2F7D32' },
  ricorrenza:    { l: 'Ricorrenza',        c: '#2B5EA7' },
  quotidiano:    { l: 'Giorno normale',    c: '#c3c3bb' },
};
const ESITI = {
  fatto:   { i: '✅', l: 'Pubblicato' },
  mancato: { i: '❌', l: 'Non fatto' },
  saltato: { i: '–',  l: 'Saltato apposta' },
  pronto:  { i: '🕐', l: 'Pronto da pubblicare' },
  oggi:    { i: '●',  l: 'Oggi' },
  futuro:  { i: '',   l: '' },
};
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

let MESE = new Date().getMonth();
let ANNO = new Date().getFullYear();
let GIORNI_DATI = [];
let PROMEMORIA = {};
let SEL = null;

function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function aziendaId() { return window.state?.azienda?.id || window.state?.azienda_id || window.state?.aziendaId; }

export async function render(container) {
  container.innerHTML = layout();
  await carica();
  disegna();
  bind();
}

function layout() {
  return `
  <div class="view bo-calendario">
    <div class="cal-head">
      <div>
        <h2 class="cal-h2">📅 Calendario editoriale</h2>
        <div class="cal-sub">Un contenuto al giorno. Il colore sopra dice il taglio, quello a sinistra che giorno è.</div>
      </div>
      <div class="cal-nav">
        <button class="cal-btn" id="cal-prev">‹</button>
        <span id="cal-mese"></span>
        <button class="cal-btn" id="cal-next">›</button>
      </div>
    </div>

    <div class="cal-score" id="cal-score"></div>
    <div class="cal-grid-wrap">
      <div class="cal-riga cal-testa">${GIORNI.map(g => '<div class="cal-dow">' + g + '</div>').join('')}</div>
      <div id="cal-grid"></div>
    </div>

    <div class="cal-elenco" id="cal-elenco"></div>

    <div class="cal-legenda">
      <div class="cal-lg">
        <div class="cal-lg-t">Bordo sinistro — che giorno è</div>
        <div class="cal-lg-v">${Object.values(TIPI).map(t =>
          '<span class="cal-chip" style="border-left:6px solid ' + t.c + '">' + t.l + '</span>').join('')}</div>
      </div>
      <div class="cal-lg">
        <div class="cal-lg-t">Bordo sopra — che taglio ha il post</div>
        <div class="cal-lg-v">${Object.values(ANGOLI).map(a =>
          '<span class="cal-chip" style="border-top:4px solid ' + a.c + '">' + a.l + ' — ' + a.d + '</span>').join('')}</div>
      </div>
      <div class="cal-lg">
        <div class="cal-lg-t">Segno in basso</div>
        <div class="cal-lg-v">${['fatto', 'mancato', 'saltato', 'pronto'].map(k =>
          '<span class="cal-chip">' + ESITI[k].i + ' ' + ESITI[k].l + '</span>').join('')}</div>
      </div>
    </div>

    <div class="cal-modal" id="cal-modal" hidden><div class="cal-modal-box" id="cal-modal-box"></div></div>

    <style>
      .bo-calendario{padding:16px;max-width:1100px;margin:0 auto}
      .cal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}
      .cal-h2{font-size:19px;margin:0}
      .cal-sub{font-size:13px;color:#6b7280;margin-top:4px}
      .cal-nav{display:flex;align-items:center;gap:8px;font-weight:600}
      .cal-btn{background:#fff;border:1px solid #e5e7eb;border-radius:6px;width:32px;height:32px;
               font-size:17px;cursor:pointer;line-height:1}
      .cal-score{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
      .cal-box{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;min-width:96px}
      .cal-box .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.9px;color:#6b7280}
      .cal-box .v{font-size:22px;font-weight:700;margin-top:2px}
      .cal-box.ok .v{color:#2F7D32}
      .cal-box.no .v{color:#D32F2F}
      .cal-riga{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px}
      .cal-dow{font-size:11px;color:#8a8a84;text-transform:uppercase;letter-spacing:.8px;padding-left:2px}
      .cal-testa{margin-bottom:4px}
      .cal-g,.cal-v{aspect-ratio:1/1}
      .cal-g{background:#fff;border:1px solid #e6e6e0;border-left:6px solid #c3c3bb;border-top:4px solid #ddd;
             border-radius:4px;padding:5px 6px;display:flex;flex-direction:column;gap:2px;
             position:relative;overflow:hidden;cursor:pointer;text-align:left}
      .cal-g:hover{box-shadow:0 2px 8px rgba(0,0,0,.09)}
      .cal-g.bg-fatto{background:#f5faf5}
      .cal-g.bg-mancato{background:#fdf5f4}
      .cal-g.bg-oggi{outline:2px solid #111827;outline-offset:-1px}
      .cal-n{font-size:15px;font-weight:600;line-height:1}
      .cal-lab{font-size:9px;letter-spacing:.9px;font-weight:700}
      .cal-ric{font-size:10px;line-height:1.2;font-weight:600;margin-top:2px}
      .cal-prom{font-size:9px;line-height:1.15;color:#6b7280}
      .cal-es{position:absolute;right:4px;bottom:3px;font-size:15px;line-height:1}
      .cal-dubbia{color:#B3261E;font-weight:700}
      .cal-legenda{border-top:1px solid #e5e7eb;margin-top:18px;padding-top:14px}
      .cal-lg{margin-bottom:12px}
      .cal-lg-t{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:6px}
      .cal-lg-v{display:flex;flex-wrap:wrap;gap:6px}
      .cal-chip{font-size:12px;padding:5px 10px;background:#fff;border:1px solid #e5e7eb;border-radius:4px}
      .cal-elenco{margin-top:16px}
      .cal-el-t{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:8px}
      .cal-el-r{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid #e5e7eb;
                border-left:5px solid #c3c3bb;border-radius:6px;padding:9px 11px;margin-bottom:6px;
                width:100%;text-align:left;cursor:pointer}
      .cal-el-g{font-weight:700;font-size:14px;min-width:26px}
      .cal-el-n{font-size:13px;font-weight:600;line-height:1.3}
      .cal-el-s{font-size:12px;color:#6b7280;line-height:1.35;margin-top:1px}
      .cal-el-e{margin-left:auto;font-size:15px}
      .cal-modal[hidden]{display:none}
      .cal-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;
                 justify-content:center;padding:16px;z-index:900}
      .cal-modal-box{background:#fff;border-radius:12px;padding:18px;max-width:460px;width:100%;
                     max-height:86vh;overflow:auto}
      .cal-m-t{font-size:16px;font-weight:700;margin-bottom:3px}
      .cal-m-s{font-size:12.5px;color:#6b7280;margin-bottom:12px}
      .cal-m-riga{font-size:13px;padding:8px 0;border-bottom:1px solid #f3f4f6;line-height:1.45}
      .cal-m-azioni{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
      .cal-a{border:none;border-radius:7px;padding:9px 13px;font-size:13px;cursor:pointer;font-weight:600}
      .cal-a.pri{background:#111827;color:#fff}
      .cal-a.sec{background:#f3f4f6;color:#111827}
      .cal-ta{width:100%;min-height:96px;border:1px solid #e5e7eb;border-radius:8px;padding:9px;
              font:14px inherit;margin-top:8px;resize:vertical}
      @media (max-width:640px){
        .bo-calendario{padding:10px}
        .cal-riga{gap:3px}
        .cal-g{padding:2px 3px;border-left-width:4px;border-top-width:3px}
        .cal-n{font-size:11px}
        .cal-lab{font-size:6.5px;letter-spacing:.2px}
        .cal-ric,.cal-prom{display:none}
        .cal-es{font-size:12px;right:2px;bottom:1px}
      }
    </style>
  </div>`;
}

async function carica() {
  const az = aziendaId();
  if (!az) { mostraToast('Azienda non impostata', 'error'); return; }
  const dal = new Date(ANNO, MESE, 1);
  const al = new Date(ANNO, MESE + 1, 0);

  const { data: giorni, error } = await supa()
    .from('v_calendario_esito')
    .select('id,data,angolo,stato,tema,titolo,ricorrenza,tipo_giorno,verificata,esito')
    .eq('azienda_id', az)
    .eq('canale', 'facebook')
    .gte('data', iso(dal))
    .lte('data', iso(al))
    .order('data');

  if (error) { mostraToast('Calendario non caricato: ' + error.message, 'error'); return; }
  GIORNI_DATI = giorni || [];

  const { data: prom } = await supa()
    .from('calendario_promemoria')
    .select('data,testo,giorni_prima')
    .eq('azienda_id', az)
    .gte('data', iso(dal))
    .lte('data', iso(al))
    .order('giorni_prima');

  PROMEMORIA = {};
  (prom || []).forEach(p => { (PROMEMORIA[p.data] = PROMEMORIA[p.data] || []).push(p.testo); });

  const { data: score } = await supa().rpc('calendario_punteggio', { p_azienda: az });
  const s = Array.isArray(score) ? score[0] : score;
  const box = document.getElementById('cal-score');
  if (box && s) {
    box.innerHTML =
      card('Striscia', s.striscia, s.striscia > 0 ? 'ok' : '') +
      card('Record', s.record, '') +
      card('Fatti nel mese', s.fatti_mese + '/' + s.giorni_mese, s.percentuale >= 70 ? 'ok' : '') +
      card('Buchi', Math.max(0, s.giorni_mese - s.fatti_mese), (s.giorni_mese - s.fatti_mese) > 0 ? 'no' : '');
  }
}

function card(k, v, cls) {
  return '<div class="cal-box ' + cls + '"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
}

function disegna() {
  document.getElementById('cal-mese').textContent = MESI[MESE] + ' ' + ANNO;
  const mappa = {};
  GIORNI_DATI.forEach(g => { mappa[g.data] = g; });

  const primo = new Date(ANNO, MESE, 1);
  const offset = (primo.getDay() + 6) % 7;
  const ultimo = new Date(ANNO, MESE + 1, 0).getDate();
  const celle = [];
  for (let i = 0; i < offset; i++) celle.push('<div class="cal-v"></div>');

  for (let d = 1; d <= ultimo; d++) {
    const k = iso(new Date(ANNO, MESE, d));
    const g = mappa[k];
    if (!g) { celle.push('<div class="cal-v"></div>'); continue; }
    const ang = ANGOLI[g.angolo] || ANGOLI.cosa;
    const tipo = TIPI[g.tipo_giorno] || TIPI.quotidiano;
    const es = ESITI[g.esito] || ESITI.futuro;
    const prom = PROMEMORIA[k] || [];
    celle.push(
      '<button class="cal-g bg-' + g.esito + '" data-data="' + k + '"' +
      ' style="border-left-color:' + tipo.c + ';border-top-color:' + ang.c + '">' +
        '<span class="cal-n">' + d + '</span>' +
        '<span class="cal-lab" style="color:' + ang.c + '">' + ang.l + '</span>' +
        (g.ricorrenza ? '<span class="cal-ric">' + esc(g.ricorrenza) +
          (g.verificata === false ? ' <span class="cal-dubbia">?</span>' : '') + '</span>' : '') +
        (prom.length ? '<span class="cal-prom">' + esc(prom[0].split(' — ')[0]) + '</span>' : '') +
        '<span class="cal-es">' + es.i + '</span>' +
      '</button>'
    );
  }
  while (celle.length % 7) celle.push('<div class="cal-v"></div>');

  let html = '';
  for (let i = 0; i < celle.length; i += 7) {
    html += '<div class="cal-riga">' + celle.slice(i, i + 7).join('') + '</div>';
  }
  document.getElementById('cal-grid').innerHTML = html;
  elenco();
}

// Sotto la griglia: giorni con una ricorrenza o un promemoria, per esteso.
function elenco() {
  const box = document.getElementById('cal-elenco');
  if (!box) return;
  const righe = GIORNI_DATI.filter(g => g.ricorrenza || (PROMEMORIA[g.data] || []).length);
  if (!righe.length) {
    box.innerHTML = '<div class="cal-el-t">Nessuna data segnata questo mese</div>';
    return;
  }
  box.innerHTML = '<div class="cal-el-t">Date di '  + MESI[MESE] + '</div>' +
    righe.map(g => {
      const tipo = TIPI[g.tipo_giorno] || TIPI.quotidiano;
      const es = ESITI[g.esito] || ESITI.futuro;
      const prom = PROMEMORIA[g.data] || [];
      const gg = Number(g.data.slice(8, 10));
      return '<button class="cal-el-r" data-data="' + g.data + '" style="border-left-color:' + tipo.c + '">' +
        '<span class="cal-el-g">' + gg + '</span>' +
        '<span><span class="cal-el-n">' + esc(g.ricorrenza || 'Promemoria') +
          (g.verificata === false ? ' <span class="cal-dubbia">?</span>' : '') + '</span>' +
          (g.tema && g.ricorrenza ? '<span class="cal-el-s">' + esc(g.tema.split(' — ').slice(1).join(' — ')) + '</span>' : '') +
          prom.map(p => '<span class="cal-el-s">⏳ ' + esc(p) + '</span>').join('') +
        '</span>' +
        '<span class="cal-el-e">' + es.i + '</span>' +
      '</button>';
    }).join('');
  box.onclick = (e) => {
    const b = e.target.closest('.cal-el-r');
    if (b) apriGiorno(b.dataset.data);
  };
}

function bind() {
  document.getElementById('cal-prev').onclick = async () => {
    MESE--; if (MESE < 0) { MESE = 11; ANNO--; }
    await carica(); disegna();
  };
  document.getElementById('cal-next').onclick = async () => {
    MESE++; if (MESE > 11) { MESE = 0; ANNO++; }
    await carica(); disegna();
  };
  document.getElementById('cal-grid').onclick = (e) => {
    const b = e.target.closest('.cal-g');
    if (b) apriGiorno(b.dataset.data);
  };
  document.getElementById('cal-modal').onclick = (e) => {
    if (e.target.id === 'cal-modal') chiudi();
  };
}

function apriGiorno(k) {
  const g = GIORNI_DATI.find(x => x.data === k);
  if (!g) return;
  SEL = g;
  const ang = ANGOLI[g.angolo] || ANGOLI.cosa;
  const prom = PROMEMORIA[k] || [];
  const d = new Date(k + 'T00:00:00');

  document.getElementById('cal-modal-box').innerHTML =
    '<div class="cal-m-t">' + d.getDate() + ' ' + MESI[d.getMonth()] + ' ' + d.getFullYear() + '</div>' +
    '<div class="cal-m-s">' + ang.l + ' — ' + ang.d + '</div>' +
    (g.ricorrenza ? '<div class="cal-m-riga"><b>' + esc(g.ricorrenza) + '</b>' +
      (g.verificata === false ? ' <span class="cal-dubbia">data da confermare</span>' : '') + '</div>' : '') +
    (g.tema ? '<div class="cal-m-riga">' + esc(g.tema) + '</div>' : '') +
    prom.map(p => '<div class="cal-m-riga">⏳ ' + esc(p) + '</div>').join('') +
    '<div class="cal-m-riga">Stato: <b>' + esc(g.stato) + '</b></div>' +
    '<textarea class="cal-ta" id="cal-testo" placeholder="Testo del post…">' + esc(g.titolo || '') + '</textarea>' +
    '<div class="cal-m-azioni">' +
      '<button class="cal-a pri" id="cal-salva">Salva bozza</button>' +
      '<button class="cal-a pri" id="cal-tony">✨ Scrivilo con Tony</button>' +
      '<button class="cal-a sec" id="cal-fatto">✅ Segna pubblicato</button>' +
      '<button class="cal-a sec" id="cal-salta">Salta il giorno</button>' +
      '<button class="cal-a sec" id="cal-chiudi">Chiudi</button>' +
    '</div>';

  document.getElementById('cal-modal').hidden = false;
  document.getElementById('cal-chiudi').onclick = chiudi;
  document.getElementById('cal-salva').onclick = () => aggiorna({ titolo: valTesto(), stato: 'bozza' });
  document.getElementById('cal-fatto').onclick = () => aggiorna({ stato: 'pubblicato', pubblicato_at: new Date().toISOString() });
  document.getElementById('cal-salta').onclick = () => aggiorna({ stato: 'saltato' });
  document.getElementById('cal-tony').onclick = scriviConTony;
}

async function scriviConTony() {
  if (!SEL) return;
  const b = document.getElementById('cal-tony');
  const testoOrig = b ? b.textContent : '';
  if (b) { b.disabled = true; b.textContent = 'Tony sta scrivendo…'; }
  try {
    const { data, error } = await supa().functions.invoke('tony-post', {
      body: { azienda_id: aziendaId(), giorno_id: SEL.id }
    });
    if (error) throw error;
    if (!data || !data.success) throw new Error((data && data.error) || 'Nessuna risposta');

    const ta = document.getElementById('cal-testo');
    if (ta) ta.value = data.testo || '';
    if (data.idea_foto) {
      const box = document.getElementById('cal-modal-box');
      const nota = document.createElement('div');
      nota.className = 'cal-m-riga';
      nota.textContent = '📷 ' + data.idea_foto;
      if (ta && box) box.insertBefore(nota, ta);
    }
    mostraToast('Bozza scritta');
  } catch (e) {
    mostraToast('Tony non ce l\\'ha fatta: ' + (e.message || e), 'error');
  } finally {
    if (b) { b.disabled = false; b.textContent = testoOrig; }
  }
}

function valTesto() {
  const t = document.getElementById('cal-testo');
  return t ? t.value.trim() : null;
}

async function aggiorna(campi) {
  if (!SEL) return;
  const { error } = await supa().from('calendario_editoriale').update(campi).eq('id', SEL.id);
  if (error) { mostraToast('Non salvato: ' + error.message, 'error'); return; }
  mostraToast('Salvato');
  chiudi();
  await carica();
  disegna();
}

function chiudi() {
  const m = document.getElementById('cal-modal');
  if (m) m.hidden = true;
  SEL = null;
}
