// js/views/bo/bo-calendario.js
// Calendario editoriale social — griglia mensile, angolo del giorno, esito, promemoria.
// Il pannello del giorno permette di rivedere tutto prima che vada online:
// niente pubblicazione automatica, decide sempre una persona.

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function mostraToast(msg, tipo) { if (window.mostraToast) window.mostraToast(msg, tipo || 'success'); }

const ANGOLI = {
  perche: { l: 'PERCHE', c: '#C98A0B', d: 'Il motivo, la storia, i valori' },
  come:   { l: 'COME',   c: '#0E7C86', d: 'Il metodo, la lavorazione, il dietro le quinte' },
  cosa:   { l: 'COSA',   c: '#6B4EA8', d: 'Il piatto, il prodotto, l offerta' },
};
const TIPI = {
  festa:         { l: 'Festa comandata', c: '#B3261E' },
  giornata_food: { l: 'Giornata food',   c: '#2F7D32' },
  ricorrenza:    { l: 'Ricorrenza',      c: '#2B5EA7' },
  quotidiano:    { l: 'Giorno normale',  c: '#c3c3bb' },
};
const ESITI = {
  fatto:   { i: '✅', l: 'Pubblicato' },
  mancato: { i: '❌', l: 'Non fatto' },
  saltato: { i: '–',  l: 'Saltato apposta' },
  pronto:  { i: '🕐', l: 'Pronto da pubblicare' },
  oggi:    { i: '●',  l: 'Oggi' },
  futuro:  { i: '',   l: '' },
};
const STATI = {
  da_generare: 'Da scrivere',
  bozza:       'Bozza',
  approvato:   'Approvato',
  programmato: 'Programmato',
  pubblicato:  'Pubblicato',
  saltato:     'Saltato',
};
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

let MESE = new Date().getMonth();
let ANNO = new Date().getFullYear();
let GIORNI_DATI = [];
let PROMEMORIA = {};
let SEL = null;
let META_PRONTO = null;

function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function aziendaId() { return window.state?.azienda?.id || window.state?.azienda_id || window.state?.aziendaId; }

export async function render(container) {
  container.innerHTML = layout();
  await carica();
  disegna();
  bind();
  verificaMeta();
}

function layout() {
  return `
  <div class="view bo-calendario">
    <div class="cal-head">
      <div>
        <h2 class="cal-h2">📅 Calendario editoriale</h2>
        <div class="cal-sub">Un contenuto al giorno. Niente va online senza che tu lo veda.</div>
      </div>
      <div class="cal-nav">
        <button class="cal-btn" id="cal-prev">‹</button>
        <span id="cal-mese"></span>
        <button class="cal-btn" id="cal-next">›</button>
      </div>
    </div>

    <div id="cal-meta"></div>
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
          '<span class="cal-chip" style="border-top:4px solid ' + a.c + '">' + a.l + '</span>').join('')}</div>
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
      .cal-warn{background:#fff8e6;border:1px solid #f0dca8;border-left:5px solid #C98A0B;
                border-radius:8px;padding:11px 13px;margin-bottom:12px;font-size:13px;line-height:1.45}
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
      .cal-elenco{margin-top:16px}
      .cal-el-t{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:8px}
      .cal-el-r{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid #e5e7eb;
                border-left:5px solid #c3c3bb;border-radius:6px;padding:9px 11px;margin-bottom:6px;
                width:100%;text-align:left;cursor:pointer}
      .cal-el-g{font-weight:700;font-size:14px;min-width:26px}
      .cal-el-n{font-size:13px;font-weight:600;line-height:1.3}
      .cal-el-s{font-size:12px;color:#6b7280;line-height:1.35;margin-top:1px;display:block}
      .cal-el-e{margin-left:auto;font-size:15px}
      .cal-legenda{border-top:1px solid #e5e7eb;margin-top:18px;padding-top:14px}
      .cal-lg{margin-bottom:12px}
      .cal-lg-t{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:6px}
      .cal-lg-v{display:flex;flex-wrap:wrap;gap:6px}
      .cal-chip{font-size:12px;padding:5px 10px;background:#fff;border:1px solid #e5e7eb;border-radius:4px}
      .cal-modal[hidden]{display:none}
      .cal-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;
                 justify-content:center;padding:16px;z-index:900}
      .cal-modal-box{background:#fff;border-radius:12px;padding:18px;max-width:480px;width:100%;
                     max-height:88vh;overflow:auto}
      .cal-m-t{font-size:16px;font-weight:700;margin-bottom:3px}
      .cal-m-s{font-size:12.5px;color:#6b7280;margin-bottom:10px}
      .cal-stato{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;
                 background:#f3f4f6;color:#374151;margin-bottom:10px}
      .cal-stato.pubblicato{background:#e8f5e9;color:#2F7D32}
      .cal-stato.approvato{background:#e7f0fb;color:#2B5EA7}
      .cal-m-riga{font-size:13px;padding:7px 0;border-bottom:1px solid #f3f4f6;line-height:1.45}
      .cal-img{width:100%;border-radius:8px;margin-top:10px;display:block}
      .cal-foto-n{font-size:12px;color:#6b7280;line-height:1.4;margin-top:6px}
      .cal-ta{width:100%;min-height:120px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;
              font:14px/1.5 inherit;margin-top:10px;resize:vertical}
      .cal-conta{font-size:11.5px;color:#9ca3af;text-align:right;margin-top:3px}
      .cal-m-azioni{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
      .cal-a{border:none;border-radius:7px;padding:9px 13px;font-size:13px;cursor:pointer;font-weight:600}
      .cal-a.pri{background:#111827;color:#fff}
      .cal-a.pub{background:#2F7D32;color:#fff}
      .cal-a.sec{background:#f3f4f6;color:#111827}
      .cal-a:disabled{opacity:.45;cursor:default}
      .cal-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px;
               max-height:280px;overflow:auto}
      .cal-gal button{border:2px solid transparent;border-radius:6px;padding:0;cursor:pointer;
                      background:none;overflow:hidden;aspect-ratio:1/1}
      .cal-gal button.sel{border-color:#111827}
      .cal-gal img{width:100%;height:100%;object-fit:cover;display:block}
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

async function verificaMeta() {
  const box = document.getElementById('cal-meta');
  if (!box) return;
  try {
    const { data } = await supa().functions.invoke('calendario-pubblica', {
      body: { azione: 'verifica', azienda_id: aziendaId() }
    });
    META_PRONTO = data && data.success ? data.pronto === true : false;
    if (data && data.success && !data.pronto) {
      const manca = (data.permessi_mancanti || []).join(', ');
      box.innerHTML = '<div class="cal-warn">Collegamento Meta incompleto' +
        (manca ? ' — manca il permesso <b>' + esc(manca) + '</b>' : '') +
        '. Puoi scrivere e approvare i post, ma non pubblicarli. Rifai il collegamento Meta dalle impostazioni.</div>';
    } else if (data && !data.success) {
      box.innerHTML = '<div class="cal-warn">' + esc(data.error || 'Meta non collegato') + '</div>';
    }
  } catch (e) {
    META_PRONTO = false;
  }
}

async function carica() {
  const az = aziendaId();
  if (!az) { mostraToast('Azienda non impostata', 'error'); return; }
  const dal = new Date(ANNO, MESE, 1);
  const al = new Date(ANNO, MESE + 1, 0);

  const { data: giorni, error } = await supa()
    .from('v_calendario_esito')
    .select('id,data,angolo,stato,tema,titolo,testo,media_url,grafica_url,grafica_modo,tema_grafico,immagine_finale,ricorrenza,tipo_giorno,verificata,esito')
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

function elenco() {
  const box = document.getElementById('cal-elenco');
  if (!box) return;
  const righe = GIORNI_DATI.filter(g => g.ricorrenza || (PROMEMORIA[g.data] || []).length);
  if (!righe.length) {
    box.innerHTML = '<div class="cal-el-t">Nessuna data segnata questo mese</div>';
    return;
  }
  box.innerHTML = '<div class="cal-el-t">Date di ' + MESI[MESE] + '</div>' +
    righe.map(g => {
      const tipo = TIPI[g.tipo_giorno] || TIPI.quotidiano;
      const es = ESITI[g.esito] || ESITI.futuro;
      const prom = PROMEMORIA[g.data] || [];
      const gg = Number(g.data.slice(8, 10));
      return '<button class="cal-el-r" data-data="' + g.data + '" style="border-left-color:' + tipo.c + '">' +
        '<span class="cal-el-g">' + gg + '</span>' +
        '<span><span class="cal-el-n">' + esc(g.ricorrenza || 'Promemoria') +
          (g.verificata === false ? ' <span class="cal-dubbia">?</span>' : '') + '</span>' +
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
  disegnaPannello();
  document.getElementById('cal-modal').hidden = false;
}

function disegnaPannello() {
  const g = SEL;
  const ang = ANGOLI[g.angolo] || ANGOLI.cosa;
  const prom = PROMEMORIA[g.data] || [];
  const d = new Date(g.data + 'T00:00:00');
  const pubblicato = g.stato === 'pubblicato';

  document.getElementById('cal-modal-box').innerHTML =
    '<div class="cal-m-t">' + d.getDate() + ' ' + MESI[d.getMonth()] + ' ' + d.getFullYear() + '</div>' +
    '<div class="cal-m-s">' + ang.l + ' — ' + ang.d + '</div>' +
    '<span class="cal-stato ' + esc(g.stato) + '">' + (STATI[g.stato] || g.stato) + '</span>' +
    (g.ricorrenza ? '<div class="cal-m-riga"><b>' + esc(g.ricorrenza) + '</b></div>' : '') +
    prom.map(p => '<div class="cal-m-riga">⏳ ' + esc(p) + '</div>').join('') +

    '<div id="cal-foto">' + (g.media_url
      ? '<img class="cal-img" src="' + esc(g.grafica_modo === 'template' && g.grafica_url ? g.grafica_url : g.media_url) + '" alt="">'
      : '<div class="cal-foto-n">Nessuna foto scelta</div>') + '</div>' +

    (g.media_url ? '<div class="cal-scelta">' +
      '<button class="cal-sc' + (g.grafica_modo !== 'template' ? ' sel' : '') + '" data-modo="foto"' +
        (pubblicato ? ' disabled' : '') + '>Foto sola</button>' +
      '<button class="cal-sc' + (g.grafica_modo === 'template' ? ' sel' : '') + '" data-modo="template"' +
        (pubblicato ? ' disabled' : '') + '>Con cornice' +
        (g.tema_grafico ? ' ' + esc(g.tema_grafico) : '') + '</button>' +
      '</div>' : '') +

    '<div class="cal-m-azioni">' +
      '<button class="cal-a sec" id="cal-cambia-foto"' + (pubblicato ? ' disabled' : '') + '>🖼 Cambia foto</button>' +
    '</div>' +
    '<div id="cal-galleria"></div>' +

    '<textarea class="cal-ta" id="cal-testo" placeholder="Testo del post…"' +
      (pubblicato ? ' readonly' : '') + '>' + esc(g.testo || '') + '</textarea>' +
    '<div class="cal-conta" id="cal-conta"></div>' +

    '<div class="cal-m-azioni">' +
      (pubblicato ? '' :
        '<button class="cal-a pri" id="cal-tony">✨ Riscrivi con Tony</button>' +
        '<button class="cal-a sec" id="cal-salva">Salva</button>' +
        '<button class="cal-a sec" id="cal-approva">👍 Approva</button>') +
    '</div>' +
    '<div class="cal-m-azioni">' +
      (pubblicato ? '' :
        '<button class="cal-a sec" id="cal-prova">👁 Anteprima su Facebook</button>' +
        '<button class="cal-a pub" id="cal-pubblica">Pubblica ora</button>' +
        '<button class="cal-a sec" id="cal-salta">Salta il giorno</button>') +
      '<button class="cal-a sec" id="cal-chiudi">Chiudi</button>' +
    '</div>';

  contaParole();
  const ta = document.getElementById('cal-testo');
  if (ta) ta.oninput = contaParole;

  document.getElementById('cal-chiudi').onclick = chiudi;
  if (pubblicato) return;

  document.getElementById('cal-cambia-foto').onclick = mostraGalleria;
  document.getElementById('cal-tony').onclick = scriviConTony;
  document.getElementById('cal-salva').onclick = () => aggiorna({ testo: valTesto(), stato: 'bozza' }, 'Salvato');
  document.getElementById('cal-approva').onclick = () => aggiorna({ testo: valTesto(), stato: 'approvato' }, 'Approvato');
  document.getElementById('cal-salta').onclick = () => aggiorna({ stato: 'saltato' }, 'Giorno saltato');
  document.getElementById('cal-prova').onclick = () => pubblica(true);
  document.getElementById('cal-pubblica').onclick = () => pubblica(false);
}

function contaParole() {
  const ta = document.getElementById('cal-testo');
  const c = document.getElementById('cal-conta');
  if (!ta || !c) return;
  const p = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
  c.textContent = p + ' parole' + (p > 0 && (p < 30 || p > 110) ? ' — fuori dalla misura giusta' : '');
}

async function mostraGalleria() {
  const box = document.getElementById('cal-galleria');
  if (box.innerHTML) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="cal-foto-n">Carico le foto…</div>';

  const { data, error } = await supa().from('media_library')
    .select('id,nome,url,thumb_url,descrizione,qualita,adatta_a')
    .eq('azienda_id', aziendaId())
    .eq('tipo', 'immagine')
    .not('analizzata_at', 'is', null)
    .gte('qualita', 2)
    .order('qualita', { ascending: false })
    .limit(60);

  if (error || !data || !data.length) {
    box.innerHTML = '<div class="cal-foto-n">Nessuna foto disponibile in galleria</div>';
    return;
  }

  const adatte = data.filter(f => (f.adatta_a || []).indexOf(SEL.angolo) !== -1);
  const altre = data.filter(f => (f.adatta_a || []).indexOf(SEL.angolo) === -1);
  const ordinate = adatte.concat(altre);

  box.innerHTML = '<div class="cal-foto-n">Le prime sono quelle adatte al taglio ' +
    (ANGOLI[SEL.angolo] || ANGOLI.cosa).l + '</div>' +
    '<div class="cal-gal">' + ordinate.map(f =>
      '<button data-url="' + esc(f.url) + '" title="' + esc(f.nome || '') + '"' +
        (f.url === SEL.media_url ? ' class="sel"' : '') + '>' +
        '<img src="' + esc(f.thumb_url || f.url) + '" alt="' + esc(f.nome || '') + '">' +
      '</button>').join('') + '</div>';

  box.querySelector('.cal-gal').onclick = async (e) => {
    const b = e.target.closest('[data-url]');
    if (!b) return;
    await aggiorna({ media_url: b.dataset.url }, 'Foto cambiata', true);
    box.innerHTML = '';
  };
}

async function scriviConTony() {
  const b = document.getElementById('cal-tony');
  const testoOrig = b ? b.textContent : '';
  if (b) { b.disabled = true; b.textContent = 'Tony sta scrivendo…'; }
  try {
    const { data, error } = await supa().functions.invoke('tony-post', {
      body: { azienda_id: aziendaId(), giorno_id: SEL.id }
    });
    if (error) throw error;
    if (!data || !data.success) {
      if (data && data.crediti_esauriti) {
        mostraToast('Crediti esauriti: vai su Crediti Tony per ricaricare', 'error');
        return;
      }
      throw new Error((data && data.error) || 'Nessuna risposta');
    }

    const ta = document.getElementById('cal-testo');
    if (ta) { ta.value = data.testo || ''; contaParole(); }
    SEL.testo = data.testo || '';

    const boxFoto = document.getElementById('cal-foto');
    if (boxFoto) {
      if (data.foto) {
        SEL.media_url = data.foto.url;
        boxFoto.innerHTML =
          '<img class="cal-img" src="' + esc(data.foto.thumb_url || data.foto.url) + '" alt="">' +
          (data.foto.perche ? '<div class="cal-foto-n">📷 ' + esc(data.foto.perche) + '</div>' : '');
      } else {
        boxFoto.innerHTML = '<div class="cal-foto-n">Nessuna foto adatta in galleria' +
          (data.idea_foto ? ': ' + esc(data.idea_foto) : '') + '</div>';
      }
    }
    mostraToast(data.saldo_crediti != null
      ? 'Bozza pronta — restano ' + data.saldo_crediti + ' crediti'
      : 'Bozza pronta');
  } catch (e) {
    mostraToast('Tony non ha risposto: ' + (e.message || e), 'error');
  } finally {
    if (b) { b.disabled = false; b.textContent = testoOrig; }
  }
}

async function pubblica(prova) {
  if (!prova) {
    const testo = valTesto();
    if (!testo) { mostraToast('Non ce ancora un testo', 'error'); return; }
    if (!window.confirm('Il post va online adesso sulla pagina Facebook. Confermi?')) return;
  }
  const b = document.getElementById(prova ? 'cal-prova' : 'cal-pubblica');
  const orig = b ? b.textContent : '';
  if (b) { b.disabled = true; b.textContent = prova ? 'Preparo…' : 'Pubblico…'; }

  try {
    await supa().from('calendario_editoriale')
      .update({ testo: valTesto() }).eq('id', SEL.id);

    const { data, error } = await supa().functions.invoke('calendario-pubblica', {
      body: { azione: 'pubblica', azienda_id: aziendaId(), giorno_id: SEL.id, prova: prova === true }
    });
    if (error) throw error;
    if (!data || !data.success) throw new Error((data && data.error) || 'Pubblicazione non riuscita');

    mostraToast(data.messaggio || 'Fatto');
    if (!prova) { chiudi(); await carica(); disegna(); }
  } catch (e) {
    mostraToast(String(e.message || e), 'error');
  } finally {
    if (b) { b.disabled = false; b.textContent = orig; }
  }
}

function valTesto() {
  const t = document.getElementById('cal-testo');
  return t ? t.value.trim() : null;
}

async function aggiorna(campi, messaggio, restaAperto) {
  if (!SEL) return;
  const { error } = await supa().from('calendario_editoriale').update(campi).eq('id', SEL.id);
  if (error) { mostraToast('Non salvato: ' + error.message, 'error'); return; }
  mostraToast(messaggio || 'Salvato');
  Object.assign(SEL, campi);
  await carica();
  disegna();
  if (restaAperto) {
    const agg = GIORNI_DATI.find(x => x.id === SEL.id);
    if (agg) { SEL = agg; disegnaPannello(); }
  } else {
    chiudi();
  }
}

function chiudi() {
  const m = document.getElementById('cal-modal');
  if (m) m.hidden = true;
  SEL = null;
}
