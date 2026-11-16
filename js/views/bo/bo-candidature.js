// js/views/bo/bo-candidature.js
// Dashboard candidature — funnel 4 fasi, scoring 7 indicatori, WhatsApp automatico

const supa = () => window.supabaseClient || window.supabase;

// ─── DOMANDE DEL QUESTIONARIO (15/11/2026) ───────────────────────────────────
// Lo standard Ristoflow (righe con azienda_id null) vale per tutte le aziende. Un admin puo' farsene una copia
// e cambiarla; "Torna allo standard" cancella la copia. Le risposte gia' arrivate restano con il testo di allora.
// La sezione 1 (dati personali) e l'area di interesse sono fisse. I punteggi non dipendono dalla domanda.
async function apriDomande(aziendaId) {
  const SEZ = { 2: '🧠 Mentalità e curiosità', 3: '💪 Pressione, responsabilità e mentalità', 4: '🍽️ Hospitality e ambizioni' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nomeRaw = String(window.state?.azienda?.nome || 'la tua azienda');
  const nomeAz = esc(nomeRaw === nomeRaw.toLowerCase() && window.state?.azienda?.nome ? nomeRaw.replace(/\b\p{L}/gu, c => c.toUpperCase()) : nomeRaw);
  let ov = document.getElementById('cand-dom-ov');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'cand-dom-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:#eef2f6;z-index:9999;overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:inherit;';
    document.body.appendChild(ov);
  }
  const chiudi = () => { ov.remove(); };
  let righe = [], mie = false, occupato = false;

  const st = `<style>
    #cand-dom-ov .w{max-width:640px;margin:0 auto;padding:14px 14px 60px}
    #cand-dom-ov .top{background:#0E5A7A;color:#fff;border-radius:16px;padding:16px;display:flex;justify-content:space-between;align-items:center;gap:10px}
    #cand-dom-ov .top b{font-size:18px}#cand-dom-ov .top small{display:block;opacity:.8;font-size:12px}
    #cand-dom-ov .x{background:rgba(255,255,255,.18);border:none;color:#fff;border-radius:10px;padding:9px 13px;font-weight:800;font-size:14px;cursor:pointer}
    #cand-dom-ov .box{background:#fff;border-radius:14px;padding:14px;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    #cand-dom-ov .info{background:#f0f9ff;border:1.5px solid #bae6fd}#cand-dom-ov .mio{background:#ecfdf5;border:1.5px solid #a7f3d0}
    #cand-dom-ov .info p,#cand-dom-ov .mio p{margin:4px 0 10px;font-size:13px;color:#334155;line-height:1.45}
    #cand-dom-ov .btn{border:none;border-radius:10px;padding:10px 14px;font-weight:800;font-size:14px;background:#0E5A7A;color:#fff;cursor:pointer;font-family:inherit}
    #cand-dom-ov .btn.chiaro{background:#f1f5f9;color:#334155}#cand-dom-ov .btn.rosso{background:#fee2e2;color:#b91c1c}
    #cand-dom-ov .sez{font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px}
    #cand-dom-ov .d{border-top:1px solid #e2e8f0;padding:11px 0;display:flex;gap:10px;align-items:flex-start}
    #cand-dom-ov .d:first-of-type{border-top:none}#cand-dom-ov .d .c{flex:1;min-width:0}
    #cand-dom-ov .t{font-weight:700;font-size:14.5px;line-height:1.4;color:#0f172a}#cand-dom-ov .h{font-size:12.5px;color:#64748b;font-style:italic;margin-top:3px}
    #cand-dom-ov .tag{display:inline-block;font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 8px;margin:6px 6px 0 0;background:#f1f5f9;color:#475569}
    #cand-dom-ov .tag.n{background:#dcfce7;color:#166534}#cand-dom-ov .tag.m{background:#fef9c3;color:#854d0e}
    #cand-dom-ov .ic{background:#f1f5f9;border:none;border-radius:9px;padding:8px 10px;font-size:15px;cursor:pointer}
    #cand-dom-ov .add{display:block;width:100%;text-align:center;border:1.5px dashed #94a3b8;border-radius:10px;padding:10px;font-weight:800;color:#0E5A7A;margin-top:8px;background:#fff;cursor:pointer;font-family:inherit;font-size:14px}
    #cand-dom-ov .fisso{font-size:13px;color:#64748b;line-height:1.45}
    #cand-dom-ov label{display:block;font-size:12px;font-weight:800;color:#64748b;margin:14px 0 5px;text-transform:uppercase;letter-spacing:.4px}
    #cand-dom-ov textarea,#cand-dom-ov input[type=text]{width:100%;box-sizing:border-box;border:1.5px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:15px;font-family:inherit}
    #cand-dom-ov .seg{display:flex;gap:6px}#cand-dom-ov .seg button{flex:1;border:1.5px solid #cbd5e1;background:#fff;border-radius:10px;padding:9px;font-weight:700;font-size:13.5px;cursor:pointer;font-family:inherit;color:#334155}
    #cand-dom-ov .seg button.on{border-color:#0E5A7A;background:#0E5A7A;color:#fff}
    #cand-dom-ov .op{display:flex;gap:6px;margin-bottom:6px}#cand-dom-ov .op input{flex:1}
    #cand-dom-ov .nota{font-size:12.5px;color:#64748b;line-height:1.45;margin-top:10px}
    #cand-dom-ov .riga{display:flex;gap:8px;margin-top:16px}#cand-dom-ov .riga .btn{flex:1}
    #cand-dom-ov .errm{color:#b91c1c;font-size:13px;font-weight:700;margin-top:10px}
  </style>`;

  const tagTipo = d => d.tipo === 'scelta'
    ? 'Scelta · ' + ((d.opzioni || []).length) + ' risposte'
    : 'Risposta libera' + (Number(d.min_parole) > 1 ? ' · almeno ' + d.min_parole + ' parole' : '');

  async function carica() {
    ov.innerHTML = st + '<div class="w"><div class="box">Caricamento...</div></div>';
    const { data, error } = await supa().from('candidature_domande').select('*')
      .or('azienda_id.is.null,azienda_id.eq.' + aziendaId).order('sezione').order('ordine');
    if (error) { ov.innerHTML = st + '<div class="w"><div class="box">Errore: ' + esc(error.message) + '</div><button class="btn chiaro" id="dq-x" style="margin-top:12px">Chiudi</button></div>'; ov.querySelector('#dq-x').onclick = chiudi; return; }
    const proprie = (data || []).filter(d => d.azienda_id === aziendaId);
    mie = proprie.length > 0;
    righe = mie ? proprie : (data || []).filter(d => !d.azienda_id);
    lista();
  }

  function lista() {
    const nMod = righe.filter(d => d.stato !== 'standard').length;
    let h = st + '<div class="w"><div class="top"><div><b>📝 Domande del questionario</b><small>' + nomeAz + '</small></div><button class="x" id="dq-x">Chiudi</button></div>';
    h += mie
      ? '<div class="box mio"><b>Questionario di ' + nomeAz + (nMod ? ' · ' + nMod + (nMod === 1 ? ' modifica' : ' modifiche') : '') + '</b><p>Lo vede chi si candida dal tuo link. Le candidature arrivate prima restano con le domande di allora.</p><button class="btn rosso" id="dq-std">↺ Torna allo standard Ristoflow</button></div>'
      : '<div class="box info"><b>Stai usando il questionario standard Ristoflow</b><p>Le domande sono uguali per tutte le aziende. Se vuoi cambiarle, crei una copia solo per la tua azienda: lo standard resta com\'è e ci puoi tornare quando vuoi.</p><button class="btn" id="dq-pers">✏️ Personalizza per la mia azienda</button></div>';
    h += '<div class="box"><div class="sez">Sezione 1 · Chi sei</div><div class="fisso">Nome, cognome, telefono, email, data di nascita, città, ruolo che cerca. Servono per contattare il candidato: non si cambiano.</div></div>';
    [2, 3, 4].forEach(s => {
      h += '<div class="box"><div class="sez">Sezione ' + s + ' · ' + SEZ[s] + '</div>';
      righe.filter(d => Number(d.sezione) === s).forEach(d => {
        h += '<div class="d"><div class="c"><div class="t">' + esc(d.testo) + '</div>' + (d.hint ? '<div class="h">' + esc(d.hint) + '</div>' : '')
          + '<span class="tag">' + esc(tagTipo(d)) + '</span>'
          + (d.stato === 'nuova' ? '<span class="tag n">Nuova</span>' : d.stato === 'modificata' ? '<span class="tag m">Modificata</span>' : '') + '</div>'
          + (mie ? '<button class="ic" data-mod="' + d.id + '" aria-label="Modifica">✏️</button><button class="ic" data-del="' + d.id + '" aria-label="Togli">🗑</button>' : '') + '</div>';
      });
      if (s === 4) h += '<div class="fisso" style="margin-top:8px">Più la scelta dell\'area di interesse (sala, cucina, bar…): serve per filtrare le candidature, resta fissa.</div>';
      if (mie) h += '<button class="add" data-add="' + s + '">＋ Aggiungi una domanda in questa sezione</button>';
      h += '</div>';
    });
    h += '<div class="nota">Il punteggio si calcola da solo, come oggi: ogni risposta libera viene letta e misurata sui 7 tratti, qualunque sia la domanda.</div></div>';
    ov.innerHTML = h;
    ov.scrollTop = 0;
    ov.querySelector('#dq-x').onclick = chiudi;
    const pers = ov.querySelector('#dq-pers');
    if (pers) pers.onclick = async () => {
      if (occupato) return; occupato = true; pers.textContent = 'Preparo la copia...';
      const { error } = await supa().rpc('candidature_domande_personalizza', { p_azienda: aziendaId });
      occupato = false;
      if (error) { alert('Non riesco: ' + error.message); pers.textContent = '✏️ Personalizza per la mia azienda'; return; }
      carica();
    };
    const std = ov.querySelector('#dq-std');
    if (std) std.onclick = async () => {
      if (!confirm('Torni alle domande standard Ristoflow e perdi le tue modifiche. Le candidature già arrivate non cambiano. Procedo?')) return;
      const { error } = await supa().rpc('candidature_domande_ripristina', { p_azienda: aziendaId });
      if (error) { alert('Non riesco: ' + error.message); return; }
      carica();
    };
    ov.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => scheda(righe.find(d => d.id === b.dataset.mod)));
    ov.querySelectorAll('[data-add]').forEach(b => b.onclick = () => scheda({ sezione: Number(b.dataset.add), tipo: 'aperta', min_parole: 20, opzioni: [], testo: '', hint: '' }));
    ov.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      const d = righe.find(x => x.id === b.dataset.del);
      if (d.tipo !== 'scelta' && righe.filter(x => x.tipo !== 'scelta').length <= 1) { alert('Serve almeno una domanda con risposta libera: è da lì che si calcola il punteggio.'); return; }
      if (!confirm('Togli la domanda "' + d.testo + '"?')) return;
      const { error } = await supa().from('candidature_domande').delete().eq('id', d.id).eq('azienda_id', aziendaId);
      if (error) { alert('Non riesco: ' + error.message); return; }
      carica();
    });
  }

  function scheda(d0) {
    const d = Object.assign({}, d0); // copia: "Annulla" non deve lasciare modifiche a meta' nella lista
    let tipo = d.tipo || 'aperta', minP = Number(d.min_parole) || 20;
    let ops = (d.opzioni || []).map(o => o.label);
    if (tipo === 'scelta' && ops.length < 2) ops = ['', ''];
    const disegna = () => {
      const testo = ov.querySelector('#dq-testo') ? ov.querySelector('#dq-testo').value : d.testo;
      const hint = ov.querySelector('#dq-hint') ? ov.querySelector('#dq-hint').value : (d.hint || '');
      ov.querySelectorAll('.op input').forEach((inp, i) => { ops[i] = inp.value; });
      let h = st + '<div class="w"><div class="top"><div><b>' + (d.id ? '✏️ Modifica domanda' : '＋ Nuova domanda') + '</b><small>Sezione ' + d.sezione + ' · ' + SEZ[d.sezione] + '</small></div></div><div class="box">';
      h += '<label>Domanda</label><textarea id="dq-testo" rows="3">' + esc(testo) + '</textarea>';
      h += '<label>Suggerimento sotto la domanda (facoltativo)</label><input type="text" id="dq-hint" value="' + esc(hint) + '" placeholder="Es. matrimoni, banchetti, feste aziendali">';
      h += '<label>Come si risponde</label><div class="seg"><button data-tipo="aperta" class="' + (tipo === 'aperta' ? 'on' : '') + '">Risposta libera</button><button data-tipo="scelta" class="' + (tipo === 'scelta' ? 'on' : '') + '">Scelta tra risposte</button></div>';
      if (tipo === 'aperta') {
        h += '<label>Lunghezza minima</label><div class="seg">' + [[10, 'Breve · 10'], [20, 'Media · 20'], [30, 'Lunga · 30']].map(([v, l]) => '<button data-min="' + v + '" class="' + (minP === v ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
      } else {
        h += '<label>Risposte (da 2 a 6)</label>' + ops.map((o, i) => '<div class="op"><input type="text" value="' + esc(o) + '" placeholder="Risposta ' + (i + 1) + '">' + (ops.length > 2 ? '<button class="ic" data-rm="' + i + '">✕</button>' : '') + '</div>').join('');
        if (ops.length < 6) h += '<button class="add" id="dq-addop">＋ Aggiungi una risposta</button>';
      }
      h += '<div class="nota">Il punteggio si calcola da solo: non c\'è niente da impostare.</div><div class="errm" id="dq-err"></div>';
      h += '<div class="riga"><button class="btn chiaro" id="dq-ann">Annulla</button><button class="btn" id="dq-salva">Salva</button></div></div></div>';
      ov.innerHTML = h;
      ov.querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => { ov.querySelectorAll('.op input').forEach((inp, i) => { ops[i] = inp.value; }); tipo = b.dataset.tipo; if (tipo === 'scelta' && ops.length < 2) ops = ['', '']; disegnaKeep(); });
      ov.querySelectorAll('[data-min]').forEach(b => b.onclick = () => { minP = Number(b.dataset.min); disegnaKeep(); });
      ov.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { ov.querySelectorAll('.op input').forEach((inp, i) => { ops[i] = inp.value; }); ops.splice(Number(b.dataset.rm), 1); disegnaKeep(); });
      const addop = ov.querySelector('#dq-addop'); if (addop) addop.onclick = () => { ov.querySelectorAll('.op input').forEach((inp, i) => { ops[i] = inp.value; }); ops.push(''); disegnaKeep(); };
      ov.querySelector('#dq-ann').onclick = lista;
      ov.querySelector('#dq-salva').onclick = salva;
    };
    // ridisegna tenendo testo e suggerimento scritti finora
    const disegnaKeep = () => { d.testo = ov.querySelector('#dq-testo').value; d.hint = ov.querySelector('#dq-hint').value; disegna(); };
    async function salva() {
      const e = ov.querySelector('#dq-err');
      const testo = ov.querySelector('#dq-testo').value.trim();
      const hint = ov.querySelector('#dq-hint').value.trim();
      if (!testo) { e.textContent = 'Scrivi la domanda.'; return; }
      if (tipo === 'scelta' && d.id && d.tipo !== 'scelta' && righe.filter(x => x.tipo !== 'scelta').length <= 1) { e.textContent = 'Serve almeno una domanda con risposta libera: è da lì che si calcola il punteggio.'; return; }
      let opzioni = [];
      if (tipo === 'scelta') {
        const lab = [...ov.querySelectorAll('.op input')].map(i => i.value.trim()).filter(Boolean);
        if (lab.length < 2) { e.textContent = 'Servono almeno 2 risposte.'; return; }
        const vecchie = d.opzioni || [];
        opzioni = lab.map((l, i) => {
          const v = vecchie.find(o => o.label === l);
          const slug = l.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30);
          return { val: v ? v.val : (slug || 'r' + (i + 1)), label: l };
        });
      }
      const btn = ov.querySelector('#dq-salva'); btn.disabled = true; btn.textContent = 'Salvo...';
      const campi = { testo, hint: hint || null, tipo, min_parole: tipo === 'aperta' ? minP : 0, opzioni, updated_at: new Date().toISOString() };
      let res;
      if (d.id) {
        campi.stato = d.stato === 'nuova' ? 'nuova' : 'modificata';
        res = await supa().from('candidature_domande').update(campi).eq('id', d.id).eq('azienda_id', aziendaId);
      } else {
        const ordine = Math.max(0, ...righe.filter(x => Number(x.sezione) === d.sezione).map(x => Number(x.ordine) || 0)) + 1;
        res = await supa().from('candidature_domande').insert(Object.assign(campi, { azienda_id: aziendaId, sezione: d.sezione, ordine, chiave: 'q_' + Date.now().toString(36), stato: 'nuova' }));
      }
      if (res.error) { e.textContent = 'Non riesco a salvare: ' + res.error.message; btn.disabled = false; btn.textContent = 'Salva'; return; }
      carica();
    }
    disegna();
  }

  carica();
}

const SUPABASE_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0';

const INDICATORI = {
  mentalita_proprietario: { label: 'Mentalità da proprietario', emoji: '⭐', colore: '#f59e0b', peso: 1.5 },
  curiosita:              { label: 'Curiosità attiva',          emoji: '🔍', colore: '#8b5cf6', peso: 1 },
  crescita:               { label: 'Voglia di crescita',        emoji: '📈', colore: '#10b981', peso: 1 },
  responsabilita:         { label: 'Responsabilità',            emoji: '🎯', colore: '#f59e0b', peso: 1 },
  mentalita_positiva:     { label: 'Mentalità positiva',        emoji: '💡', colore: '#0ea5e9', peso: 1 },
  pressione:              { label: 'Resistenza pressione',      emoji: '💪', colore: '#ef4444', peso: 1 },
  leadership:             { label: 'Leadership potenziale',     emoji: '🏆', colore: '#f43f5e', peso: 1 },
};

const FASI = {
  1: { label: 'Ricevuta',          colore: '#64748b', bg: '#f1f5f9', emoji: '📥' },
  2: { label: 'Fase 2 inviata',    colore: '#2563eb', bg: '#eff6ff', emoji: '📤' },
  3: { label: 'Fase 2 completata', colore: '#7c3aed', bg: '#f5f3ff', emoji: '✍️' },
  4: { label: 'Fase 3 inviata',    colore: '#d97706', bg: '#fffbeb', emoji: '🎯' },
  5: { label: 'Fase 3 completata', colore: '#0891b2', bg: '#ecfeff', emoji: '🧠' },
  6: { label: 'Colloquio',         colore: '#0E5A7A', bg: '#f0f9ff', emoji: '🤝' },
  7: { label: 'Assunto',           colore: '#15803d', bg: '#f0fdf4', emoji: '🎉' },
  8: { label: 'Non idoneo',        colore: '#dc2626', bg: '#fef2f2', emoji: '❌' },
};

function badgeScore(score) {
  if (score >= 7) return { label: 'Eccellente', bg: '#dcfce7', color: '#15803d', emoji: '🔥' };
  if (score >= 5) return { label: 'Buono',      bg: '#fef3c7', color: '#92400e', emoji: '✅' };
  if (score >= 3) return { label: 'Da valutare',bg: '#f1f5f9', color: '#475569', emoji: '⚠️' };
  return              { label: 'Basso',         bg: '#fee2e2', color: '#dc2626', emoji: '❌' };
}

function barraIndicatore(chiave, valore) {
  const ind = INDICATORI[chiave];
  if (!ind) return '';
  const pct = Math.min(100, (valore / 10) * 100);
  const isKey = chiave === 'mentalita_proprietario';
  return `
    <div style="margin-bottom:7px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span style="font-size:12px;color:#374151;font-weight:${isKey ? '700' : '500'};">${ind.emoji} ${ind.label}${isKey ? ' ⭐' : ''}</span>
        <span style="font-size:12px;font-weight:700;color:${ind.colore};">${Number(valore).toFixed(1)}</span>
      </div>
      <div style="height:${isKey ? 8 : 5}px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${ind.colore};border-radius:4px;transition:width .4s;"></div>
      </div>
    </div>`;
}

function tempoRimanente(scadenza) {
  if (!scadenza) return null;
  const diff = new Date(scadenza) - new Date();
  if (diff <= 0) return { scaduto: true, label: 'Scaduto' };
  const ore  = Math.floor(diff / 3600000);
  const min  = Math.floor((diff % 3600000) / 60000);
  return { scaduto: false, label: ore > 0 ? `${ore}h ${min}m` : `${min}m` };
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

  // Carica candidature
  const { data: candidature, error } = await supa()
    .from('candidature')
    .select('*')
    .eq('azienda_id', aziendaId)
    .order('score_totale', { ascending: false });

  if (error) {
    container.innerHTML = `<div style="color:#dc2626;padding:40px;text-align:center;">Errore: ${error.message}</div>`;
    return;
  }

  const tutte = candidature || [];

  // Conta per fase
  const contiPerFase = {};
  for (const c of tutte) contiPerFase[c.fase_attuale] = (contiPerFase[c.fase_attuale] || 0) + 1;

  // Filtri attivi
  let filtroFase  = 'tutte';
  let filtroArea  = 'tutte';
  let candidaturaAperta = null;

  function renderLista() {
    let filtrate = tutte;
    if (filtroFase !== 'tutte')  filtrate = filtrate.filter(c => String(c.fase_attuale) === filtroFase);
    if (filtroArea !== 'tutte')  filtrate = filtrate.filter(c => c.area_interesse === filtroArea);

    const el = container.querySelector('#lista-candidature');
    if (!el) return;

    if (!filtrate.length) {
      el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:32px;">Nessuna candidatura trovata.</div>';
      return;
    }

    el.innerHTML = filtrate.map(c => {
      const fase  = FASI[c.fase_attuale] || FASI[1];
      const score = badgeScore(c.score_totale || 0);
      const scad  = c.fase_attuale === 2 ? tempoRimanente(c.scadenza_fase2) : c.fase_attuale === 4 ? tempoRimanente(c.scadenza_fase3) : null;

      return `
        <div class="cand-card" data-id="${c.id}" style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px;cursor:pointer;transition:all .15s;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:180px;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                <span style="font-weight:700;font-size:15px;color:#0f172a;">${c.nome} ${c.cognome}</span>
                <span style="background:${fase.bg};color:${fase.colore};padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;">${fase.emoji} ${fase.label}</span>
                <span style="background:${score.bg};color:${score.color};padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;">${score.emoji} ${score.label}</span>
              </div>
              <div style="font-size:13px;color:#64748b;display:flex;gap:12px;flex-wrap:wrap;">
                <span>🎯 ${c.ruolo_desiderato}</span>
                <span>📍 ${c.citta || '—'}</span>
                <span>📅 ${new Date(c.created_at).toLocaleDateString('it-IT')}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
              ${scad ? `<span style="background:${scad.scaduto ? '#fee2e2' : '#fef3c7'};color:${scad.scaduto ? '#dc2626' : '#92400e'};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">⏱ ${scad.label}</span>` : ''}
              <div style="text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#0E5A7A;">${Number(c.score_totale || 0).toFixed(1)}</div>
                <div style="font-size:10px;color:#94a3b8;">/ 10</div>
              </div>
            </div>
          </div>
          <!-- Mini barre -->
          <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;">
            ${Object.keys(INDICATORI).map(k => {
              const val = c[`score_${k}`] || 0;
              const ind = INDICATORI[k];
              const pct = Math.min(100, (val/10)*100);
              const isKey = k === 'mentalita_proprietario';
              return `<div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:11px;width:14px;">${ind.emoji}</span>
                <div style="flex:1;height:${isKey?5:3}px;background:#f1f5f9;border-radius:2px;overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:${ind.colore};border-radius:2px;"></div>
                </div>
                <span style="font-size:10px;color:#64748b;width:20px;">${Number(val).toFixed(0)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');

    // Click su card → apri scheda
    el.querySelectorAll('.cand-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const c = tutte.find(x => x.id === id);
        if (c) apriScheda(c);
      });
      card.addEventListener('mouseenter', () => card.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)');
      card.addEventListener('mouseleave', () => card.style.boxShadow = '');
    });
  }

  async function apriScheda(c) {
    candidaturaAperta = c;
    const fase  = FASI[c.fase_attuale] || FASI[1];
    const score = badgeScore(c.score_totale || 0);

    // Carica risposte
    const { data: risposte } = await supa()
      .from('candidature_risposte')
      .select('*')
      .eq('candidatura_id', c.id)
      .order('fase').order('created_at');

    const { data: faseLog } = await supa()
      .from('candidature_fasi_log')
      .select('*')
      .eq('candidatura_id', c.id)
      .order('created_at');

    const modal = container.querySelector('#modal-scheda');
    modal.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;overflow-y:auto;padding:20px;box-sizing:border-box;" id="modal-overlay">
        <div style="background:white;border-radius:20px;max-width:700px;margin:0 auto;overflow:hidden;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0E5A7A,#1a8fb5);padding:24px 28px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="font-size:22px;font-weight:700;color:white;">${c.nome} ${c.cognome}</div>
                <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;">
                  ${c.ruolo_desiderato} · ${c.area_interesse} · ${c.citta || '—'}${c.data_nascita ? ' · ' + Math.floor((Date.now() - new Date(c.data_nascita).getTime()) / 31557600000) + ' anni' : ''}
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                  <span style="background:rgba(255,255,255,.2);color:white;padding:3px 10px;border-radius:20px;font-size:12px;">${fase.emoji} ${fase.label}</span>
                  <span style="background:${score.bg};color:${score.color};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${score.emoji} ${score.label} — ${Number(c.score_totale||0).toFixed(1)}/10</span>
                </div>
              </div>
              <button id="btn-chiudi-scheda" style="background:rgba(255,255,255,.15);border:none;color:white;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:18px;flex-shrink:0;">✕</button>
            </div>
          </div>

          <div style="padding:24px 28px;max-height:75vh;overflow-y:auto;">

            <!-- Contatti -->
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f1f5f9;">
              <a href="tel:${c.telefono}" style="color:#0E5A7A;font-weight:600;font-size:14px;text-decoration:none;">📱 ${c.telefono}</a>
              ${c.email ? `<a href="mailto:${c.email}" style="color:#0E5A7A;font-weight:600;font-size:14px;text-decoration:none;">✉️ ${c.email}</a>` : ''}
              ${c.ruolo_sogno ? `<span style="font-size:13px;color:#64748b;">💭 Sogna: <em>${c.ruolo_sogno}</em></span>` : ''}
            </div>

            <!-- Giudizio di Tony (14/11): letto dalle risposte, sostituisce il conteggio a parole chiave -->
            ${c.tony_valutazione ? `<div style="margin-bottom:20px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px 16px;">
              <div style="font-size:13px;font-weight:700;color:#0E5A7A;margin-bottom:6px;">🤖 Giudizio di Tony</div>
              <div style="font-size:13px;color:#0f172a;line-height:1.7;">${String(c.tony_valutazione).replace(/</g,'&lt;')}</div>
            </div>` : `<div style="margin-bottom:20px;font-size:12px;color:#94a3b8;">Tony non ha ancora letto questa candidatura: i punteggi sono provvisori.</div>`}

            <!-- Score dettagliato -->
            <div style="margin-bottom:20px;">
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📊 Punteggi per indicatore</div>
              ${Object.keys(INDICATORI).map(k => barraIndicatore(k, c[`score_${k}`] || 0)).join('')}
            </div>

            <!-- Risposte per fase -->
            ${[1,2,3].map(fase => {
              // stesso ordine del modulo (le risposte arrivano tutte insieme, l'ordine di salvataggio non conta)
              const ORD = ['problema_intervento','apprendimento_autonomo','errore_e_apprendimento','cosa_difficile_ottenuto','interesse_nuovo_lavoro','giorno_impegnativo','reazione_pressione','collega_dimentica','lavorato_piu_del_necessario','istinto_quando_va_male','perche_hospitality','area_interesse','dove_tra_5_anni','perche_investire_su_te'];
              const pos = r => { const i = ORD.indexOf(r.domanda_id); return i < 0 ? 99 : i; };
              const rFase = (risposte || []).filter(r => r.fase === fase).sort((a, b) => pos(a) - pos(b));
              if (!rFase.length) return '';
              return `
                <div style="margin-bottom:20px;">
                  <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #f1f5f9;">
                    ${fase === 1 ? '📥 Fase 1 — Candidatura iniziale' : fase === 2 ? '✍️ Fase 2 — Questionario approfondito' : '🎯 Fase 3 — Sfida pratica'}
                  </div>
                  ${rFase.map(r => `
                    <div style="margin-bottom:16px;">
                      <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">${r.domanda_testo}</div>
                      <div style="font-size:13px;color:#0f172a;line-height:1.7;background:#f8fafc;border-radius:8px;padding:12px;border-left:3px solid #0E5A7A;">
                        ${r.risposta.replace(/\n/g, '<br>')}
                      </div>
                      <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
                        ${(r.keywords_positive||[]).slice(0,5).map(k => `<span style="background:#dcfce7;color:#15803d;padding:1px 7px;border-radius:10px;font-size:10px;">+${k.keyword||k}</span>`).join('')}
                        ${(r.keywords_negative||[]).slice(0,3).map(k => `<span style="background:#fee2e2;color:#dc2626;padding:1px 7px;border-radius:10px;font-size:10px;">-${k.keyword||k}</span>`).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>`;
            }).join('')}

            <!-- Note interne -->
            <div style="margin-bottom:20px;">
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">📝 Note interne</div>
              <textarea id="note-interne" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:10px;font-size:13px;font-family:inherit;resize:vertical;min-height:80px;outline:none;" placeholder="Aggiungi note private su questo candidato...">${c.note_interne || ''}</textarea>
              <button id="btn-salva-note" style="margin-top:6px;background:#f1f5f9;border:none;border-radius:8px;padding:7px 16px;cursor:pointer;font-size:12px;color:#374151;">💾 Salva note</button>
              <span id="esito-note" style="font-size:12px;margin-left:8px;"></span>
            </div>

            <!-- Storico fasi -->
            ${(faseLog||[]).length > 0 ? `
              <div style="margin-bottom:20px;">
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">🕐 Storico avanzamenti</div>
                ${(faseLog||[]).map(l => `
                  <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:0.5px solid #f8fafc;">
                    <span style="font-size:11px;color:#94a3b8;width:90px;flex-shrink:0;">${new Date(l.created_at).toLocaleDateString('it-IT')} ${new Date(l.created_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</span>
                    <span style="font-size:12px;color:#374151;">→ <strong>${l.fase_label}</strong></span>
                    ${l.whatsapp_inviato ? `<span style="background:#dcfce7;color:#15803d;padding:1px 7px;border-radius:10px;font-size:10px;">WhatsApp ✓</span>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Azioni -->
            <div style="border-top:1px solid #f1f5f9;padding-top:20px;">
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">⚡ Azioni</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;" id="azioni-wrap">
                ${renderAzioni(c)}
              </div>
              <div id="esito-azione" style="font-size:13px;margin-top:10px;min-height:16px;"></div>
            </div>

          </div>
        </div>
      </div>`;

    modal.style.display = 'block';

    // Chiudi
    modal.querySelector('#btn-chiudi-scheda').addEventListener('click', () => { modal.style.display = 'none'; modal.innerHTML = ''; });
    modal.querySelector('#modal-overlay').addEventListener('click', e => { if (e.target === modal.querySelector('#modal-overlay')) { modal.style.display = 'none'; modal.innerHTML = ''; } });

    // Salva note
    modal.querySelector('#btn-salva-note').addEventListener('click', async () => {
      const note = modal.querySelector('#note-interne').value;
      const esito = modal.querySelector('#esito-note');
      esito.textContent = '...'; esito.style.color = '#64748b';
      const { error } = await supa().from('candidature').update({ note_interne: note, updated_at: new Date().toISOString() }).eq('id', c.id);
      esito.textContent = error ? '❌ Errore' : '✅ Salvato';
      esito.style.color = error ? '#dc2626' : '#16a34a';
      if (!error) { c.note_interne = note; const idx = tutte.findIndex(x=>x.id===c.id); if(idx>=0) tutte[idx].note_interne=note; }
      setTimeout(() => { esito.textContent = ''; }, 3000);
    });

    // Bind azioni
    bindAzioni(c, modal);
  }

  function renderAzioni(c) {
    const fase = c.fase_attuale;
    const btns = [];

    if (fase === 1) {
      btns.push(`<button class="btn-azione" data-azione="approva-fase2" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">✅ Approva → Invia Fase 2 via WhatsApp</button>`);
      btns.push(`<button class="btn-azione" data-azione="rifiuta" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">❌ Non idoneo</button>`);
    }
    if (fase === 3) {
      btns.push(`<button class="btn-azione" data-azione="approva-fase3" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">✅ Approva → Invia Fase 3 via WhatsApp</button>`);
      btns.push(`<button class="btn-azione" data-azione="rifiuta" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">❌ Non idoneo</button>`);
    }
    if (fase === 5) {
      btns.push(`<button class="btn-azione" data-azione="convoca-colloquio" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">🤝 Convoca a colloquio via WhatsApp</button>`);
      btns.push(`<button class="btn-azione" data-azione="rifiuta" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">❌ Non idoneo</button>`);
    }
    if (fase === 6) {
      btns.push(`<button class="btn-azione" data-azione="assumi" style="background:#15803d;color:white;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">🎉 Assunto — Invia WhatsApp di benvenuto</button>`);
      btns.push(`<button class="btn-azione" data-azione="rifiuta" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">❌ Non idoneo</button>`);
    }
    if (fase === 7 || fase === 8) {
      btns.push(`<span style="font-size:13px;color:#94a3b8;">Candidatura chiusa — ${FASI[fase]?.label}</span>`);
    }

    return btns.join('');
  }

  function bindAzioni(c, modal) {
    modal.querySelectorAll('.btn-azione').forEach(btn => {
      btn.addEventListener('click', async () => {
        const azione = btn.dataset.azione;
        const esito = modal.querySelector('#esito-azione');
        esito.textContent = 'Elaborazione...'; esito.style.color = '#64748b';
        btn.disabled = true;

        try {
          await eseguiAzione(c, azione, esito);
          // Ricarica lista
          const idx = tutte.findIndex(x => x.id === c.id);
          if (idx >= 0) {
            const { data } = await supa().from('candidature').select('*').eq('id', c.id).single();
            if (data) { tutte[idx] = data; candidaturaAperta = data; }
          }
          renderLista();
          // Aggiorna azioni nel modal
          const wrap = modal.querySelector('#azioni-wrap');
          if (wrap) { wrap.innerHTML = renderAzioni(candidaturaAperta); bindAzioni(candidaturaAperta, modal); }

        } catch(err) {
          esito.textContent = '❌ ' + err.message;
          esito.style.color = '#dc2626';
          btn.disabled = false;
        }
      });
    });
  }

  async function eseguiAzione(c, azione, esito) {
    const mappe = {
      'approva-fase2':     { fase: 2, label: 'Fase 2 inviata',    evento: 'candidatura_fase2',    scadenza: 'scadenza_fase2' },
      'approva-fase3':     { fase: 4, label: 'Fase 3 inviata',    evento: 'candidatura_fase3',    scadenza: 'scadenza_fase3' },
      'convoca-colloquio': { fase: 6, label: 'Colloquio',          evento: 'candidatura_colloquio', scadenza: null },
      'assumi':            { fase: 7, label: 'Assunto',            evento: 'candidatura_assunto',  scadenza: null },
      'rifiuta':           { fase: 8, label: 'Non idoneo',         evento: 'candidatura_rifiuto',  scadenza: null },
    };

    const m = mappe[azione];
    if (!m) return;

    // 1. Aggiorna DB
    const scadenza = m.scadenza ? new Date(Date.now() + 48 * 3600000).toISOString() : undefined;
    const update = { fase_attuale: m.fase, fase_label: m.label, updated_at: new Date().toISOString() };
    if (scadenza && m.scadenza) update[m.scadenza] = scadenza;

    const { error } = await supa().from('candidature').update(update).eq('id', c.id);
    if (error) throw new Error(error.message);

    // 2. Log
    await supa().from('candidature_fasi_log').insert({
      candidatura_id: c.id,
      fase_da: c.fase_attuale,
      fase_a: m.fase,
      fase_label: m.label,
    });

    // 3. WhatsApp via Edge Function
    esito.textContent = 'Invio WhatsApp...'; esito.style.color = '#64748b';
    const waRes = await fetch(`${SUPABASE_URL}/functions/v1/candidatura-notifica-ts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        candidatura_id: c.id,
        azienda_id: c.azienda_id,
        evento: m.evento,
        token: c.token,
        fase: m.fase,
      })
    });
    const waData = await waRes.json();

    // 4. Aggiorna log con stato WhatsApp
    await supa().from('candidature_fasi_log')
      .update({ whatsapp_inviato: waData.success || false, whatsapp_message_id: waData.message_id || null })
      .eq('candidatura_id', c.id).eq('fase_a', m.fase);

    // 15/11: l'esito negativo non parte subito, va domani alle 10 (candidatura-notifica-ts v35)
    esito.textContent = waData.programmato
      ? `✅ Segnato "${m.label}": il messaggio al candidato parte domani alle 10`
      : waData.in_coda
      ? `✅ Avanzato a "${m.label}": il link per prenotare il colloquio parte appena Meta approva il messaggio`
      : waData.success
      ? `✅ Avanzato a "${m.label}" e WhatsApp inviato!`
      : `✅ Avanzato a "${m.label}" (WhatsApp: ${waData.error || 'errore'})`;
    esito.style.color = waData.success ? '#16a34a' : '#f59e0b';

    // Aggiorna oggetto locale
    Object.assign(c, update);
  }

  // ─── RENDER PRINCIPALE ─────────────────────────────────────────────────────
  container.innerHTML = `
    <style>
      .filtro-btn { background:white;border:1px solid #e5e7eb;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;transition:all .15s; }
      .filtro-btn.attivo { background:#0E5A7A;color:white;border-color:#0E5A7A; }
      .filtro-btn:hover:not(.attivo) { border-color:#0E5A7A;color:#0E5A7A; }
    </style>

    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:860px;margin:0 auto;">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:linear-gradient(135deg,#0E5A7A,#1a8fb5);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">👥</div>
            <div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;">Candidature</div>
              <div style="font-size:13px;color:#64748b;">${tutte.length} candidature totali</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            ${(window.state?.ruolo === 'admin' || window.state?.ruolo === 'superadmin') ? `<button id="btn-domande" style="background:#fff;color:#0E5A7A;border:1.5px solid #0E5A7A;border-radius:10px;padding:10px 14px;cursor:pointer;font-size:13px;font-weight:700;">📝 Domande</button>` : ''}
            <button id="btn-crea-template-meta" style="background:#25D366;color:white;border:none;border-radius:10px;padding:10px 14px;cursor:pointer;font-size:13px;font-weight:600;">
              📋 Crea template WhatsApp
            </button>
            <a id="link-form-pubblico" href="/candidatura.html?a=${aziendaId}" target="_blank"
              style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 18px;cursor:pointer;font-size:13px;font-weight:600;text-decoration:none;">
              🔗 Form pubblico
            </a>
            <button id="btn-copia-link" style="background:#f1f5f9;color:#374151;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;cursor:pointer;font-size:13px;">
              📋 Copia link
            </button>
          </div>
        </div>

        <!-- KPI fasi -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:20px;">
          ${Object.entries(FASI).map(([f, info]) => {
            const n = contiPerFase[f] || 0;
            return `<div style="background:${info.bg};border-radius:10px;padding:12px;text-align:center;border:1px solid ${info.colore}20;">
              <div style="font-size:20px;">${info.emoji}</div>
              <div style="font-size:20px;font-weight:800;color:${info.colore};">${n}</div>
              <div style="font-size:10px;color:${info.colore};font-weight:600;">${info.label}</div>
            </div>`;
          }).join('')}
        </div>

        <!-- Filtri fase -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          <button class="filtro-btn attivo" data-filtro-fase="tutte">Tutte (${tutte.length})</button>
          ${Object.entries(FASI).map(([f, info]) => {
            const n = contiPerFase[f] || 0;
            return n > 0 ? `<button class="filtro-btn" data-filtro-fase="${f}">${info.emoji} ${info.label} (${n})</button>` : '';
          }).join('')}
        </div>

        <!-- Filtri area -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
          <button class="filtro-btn attivo" data-filtro-area="tutte">Tutte le aree</button>
          ${[...new Set(tutte.map(c => c.area_interesse))].filter(Boolean).map(a =>
            `<button class="filtro-btn" data-filtro-area="${a}">📍 ${a}</button>`
          ).join('')}
        </div>

        <!-- Lista -->
        <div id="lista-candidature"></div>

        <!-- Modal scheda -->
        <div id="modal-scheda" style="display:none;"></div>

      </div>
    </div>
  `;

  // Crea template Meta
  const btnCreaTemplate = container.querySelector('#btn-crea-template-meta');
  if (btnCreaTemplate) {
    btnCreaTemplate.addEventListener('click', async () => {
      if (!confirm('Crea i 6 template WhatsApp su Meta per le candidature?\n\nAttenzione: fallo solo una volta. I template verranno inviati a Meta per approvazione.')) return;
      btnCreaTemplate.disabled = true;
      btnCreaTemplate.textContent = '⏳ Creazione in corso...';
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/crea-template-candidature-ts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
          body: JSON.stringify({ azienda_id: aziendaId })
        });
        const data = await res.json();
        if (data.success) {
          btnCreaTemplate.textContent = `✅ Creati ${data.creati}/6 — In attesa approvazione Meta`;
          btnCreaTemplate.style.background = '#15803d';
        } else {
          const falliti = (data.results || []).filter(r => !r.success).map(r => r.name + ': ' + r.error).join('\n');
          alert('Risultato:\n' + (falliti || JSON.stringify(data)));
          btnCreaTemplate.disabled = false;
          btnCreaTemplate.textContent = '📋 Crea template WhatsApp';
        }
        console.log('Template Meta:', data);
      } catch(e) {
        alert('Errore: ' + e.message);
        btnCreaTemplate.disabled = false;
        btnCreaTemplate.textContent = '📋 Crea template WhatsApp';
      }
    });
  }

  // Copia link form pubblico
  const linkPubblico = `${window.location.origin}/candidatura.html?a=${aziendaId}`;
  const btnDom = container.querySelector('#btn-domande');
  if (btnDom) btnDom.addEventListener('click', () => apriDomande(aziendaId));
  const btnCopia = container.querySelector('#btn-copia-link');
  if (btnCopia) {
    btnCopia.addEventListener('click', () => {
      navigator.clipboard.writeText(linkPubblico).then(() => {
        btnCopia.textContent = '✅ Copiato!';
        setTimeout(() => { btnCopia.textContent = '📋 Copia link'; }, 2000);
      });
    });
  }

  // Filtri
  container.querySelectorAll('[data-filtro-fase]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-filtro-fase]').forEach(b => b.classList.remove('attivo'));
      btn.classList.add('attivo');
      filtroFase = btn.dataset.filtroFase;
      renderLista();
    });
  });
  container.querySelectorAll('[data-filtro-area]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-filtro-area]').forEach(b => b.classList.remove('attivo'));
      btn.classList.add('attivo');
      filtroArea = btn.dataset.filtroArea;
      renderLista();
    });
  });

  renderLista();
}
