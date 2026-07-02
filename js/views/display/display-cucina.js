// js/views/display/display-cucina.js
// Display cucina dedicato — PIN cuoco, settori, timer alert, tracciamento produzione
// Destinato a tablet fisso in cucina

const supa = () => window.supabaseClient || window.supabase;

async function waitForAuth(maxWait = 4000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const s = supa();
    if (s) { const { data } = await s.auth.getSession(); if (data?.session) return true; }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

const ADMIN_PIN_CUCINA = { pin: '0000', nome: 'Admin', ruolo: 'admin', colore: '#dc2626' };

// Suono alert — Web Audio API, nessuna dipendenza esterna
function suonaAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.3, 0.6].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.4);
    });
  } catch(e) { console.warn('Audio non disponibile'); }
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  const sedeId    = window.state?.sedeAttiva?.id;

  if (!aziendaId) {
    container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>';
    return;
  }
  const authOk = await waitForAuth();
  if (!authOk) {
    container.innerHTML = '<section class="view"><h2>Sessione non disponibile. Ricarica.</h2></section>';
    return;
  }

  // ── Stato ──
  let cuocoAttivo   = null;
  let settori       = [];
  let settoreAttivo = null; // null = tutti
  let righeAttive   = [];
  let tempiRicetta  = {}; // prodotto_vendita_id → tempo_esecuzione_min
  let alertFiredTavolo = new Set(); // comandaId già segnalata (5+ min dall'arrivo ordine)
  let alertPartiFired = new Set(); // rigaId già segnalata "parti ora" (sincronizzazione uscita)
  let refreshTimer  = null;
  let cronometroTick = null;
  let timersManuali = []; // {id, label, secondiTotali, secondiRimanenti, running, scaduto}
  let timerManualeTick = null;

  // ════════════════════════════════════════
  // HTML SHELL
  // ════════════════════════════════════════
  container.innerHTML = `
  <style>
    @keyframes lampeggia { 0%,100%{opacity:1} 50%{opacity:0.15} }
    @keyframes slideUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
    .card-urgente { animation: lampeggia 0.9s infinite; }
  </style>

  <div style="display:flex;flex-direction:column;height:100vh;overflow:hidden;background:#111827;">

    <!-- Topbar -->
    <div style="background:#0f172a;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;border-bottom:1px solid #1e293b;">
      <div style="color:white;font-size:18px;font-weight:700;">👨‍🍳 Cucina</div>
      <div style="display:flex;gap:10px;align-items:center;">
        <div id="badge-cuoco" style="display:none;background:rgba(255,255,255,0.1);border-radius:20px;padding:5px 14px;font-size:13px;color:white;cursor:pointer;"></div>
        <div id="cucina-ora" style="font-size:13px;color:#94a3b8;"></div>
        <button id="btn-cucina-refresh" style="background:rgba(255,255,255,0.08);border:none;color:white;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px;">🔄</button>
        <button id="btn-timer-manuale" style="background:#7c3aed;border:none;color:white;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;position:relative;">
          ⏱ Timer
          <span id="badge-timer-count" style="display:none;position:absolute;top:-6px;right:-6px;background:#dc2626;color:white;font-size:10px;font-weight:700;border-radius:10px;min-width:18px;height:18px;display:none;align-items:center;justify-content:center;padding:0 4px;"></span>
        </button>
        <button id="btn-gestisci-settori" style="background:#0E5A7A;border:none;color:white;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;">⚙️ Settori</button>
      </div>
    </div>

    <!-- Body -->
    <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;">

      <!-- PIN view -->
      <div id="cucina-pin" style="flex:1;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#111827,#0f172a);">
        <div style="background:#1e293b;border-radius:24px;padding:40px 32px;width:320px;box-shadow:0 20px 60px rgba(0,0,0,0.5);text-align:center;border:1px solid #334155;">
          <div style="font-size:44px;margin-bottom:8px;">👨‍🍳</div>
          <div style="font-size:20px;font-weight:700;color:white;margin-bottom:4px;">Display Cucina</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:28px;">Inserisci il tuo PIN</div>
          <div id="pin-display-cucina" style="font-size:32px;letter-spacing:12px;height:48px;margin-bottom:20px;color:#38bdf8;font-weight:700;">____</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(n => `
              <button data-kc="${n}" style="height:60px;border-radius:14px;border:none;font-size:20px;font-weight:600;cursor:pointer;background:${n===''?'transparent':'#334155'};color:white;${n===''?'pointer-events:none;':''}" ${n===''?'disabled':''}>${n}</button>
            `).join('')}
          </div>
          <div id="pin-error-cucina" style="color:#f87171;font-size:13px;min-height:20px;"></div>
        </div>
      </div>

      <!-- Display principale -->
      <div id="cucina-main" style="display:none;flex:1;overflow:hidden;flex-direction:column;">

        <!-- Tabs settori -->
        <div style="background:#1e293b;border-bottom:1px solid #334155;padding:10px 16px;display:flex;gap:8px;flex-shrink:0;overflow-x:auto;">
          <button data-settore="" style="padding:8px 18px;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;background:#0E5A7A;color:white;">Tutti</button>
          <div id="settori-tabs" style="display:flex;gap:8px;"></div>
        </div>

        <!-- Griglia portate -->
        <div id="cucina-cards" style="flex:1;overflow-y:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;align-content:start;">
          <div style="color:#64748b;text-align:center;grid-column:1/-1;padding:40px;">Caricamento...</div>
        </div>
      </div>

    </div>
  </div>

  <!-- MODAL: Timer manuali (pentole/padelle) -->
  <div id="modal-timer" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;align-items:center;justify-content:center;">
    <div style="background:#1e293b;border-radius:20px;padding:28px;width:420px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid #334155;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-size:18px;font-weight:700;color:white;">⏱ Timer cucina</div>
        <button id="btn-timer-x" style="background:#334155;border:none;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px;color:white;">✕</button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <input id="nuovo-timer-nome" placeholder="es. Pasta, Sugo, Forno..." class="input"
          style="flex:1;padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:10px;color:white;font-size:14px;">
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
        ${[3,5,10,15,20,30,45,60].map(m => `
          <button data-preset="${m}" style="background:#334155;color:white;border:none;border-radius:10px;padding:10px 4px;cursor:pointer;font-size:13px;font-weight:600;">${m}′</button>
        `).join('')}
      </div>

      <div id="timer-manuali-lista" style="display:flex;flex-direction:column;gap:10px;"></div>
    </div>
  </div>

  <!-- MODAL: Gestione settori -->
  <div id="modal-settori" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;align-items:center;justify-content:center;">
    <div style="background:#1e293b;border-radius:20px;padding:28px;width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid #334155;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-size:18px;font-weight:700;color:white;">⚙️ Settori cucina</div>
        <button id="btn-settori-x" style="background:#334155;border:none;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px;color:white;">✕</button>
      </div>
      <div id="settori-lista" style="margin-bottom:16px;max-height:280px;overflow-y:auto;"></div>
      <div style="display:flex;gap:8px;">
        <input id="nuovo-settore-nome" placeholder="es. Pasticceria, Antipasti..." class="input"
          style="flex:1;padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:10px;color:white;font-size:14px;">
        <button id="btn-aggiungi-settore" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600;">+ Aggiungi</button>
      </div>
    </div>
  </div>
  `;

  // ── Orologio ──
  const tick = () => { const el=container.querySelector('#cucina-ora'); if(el) el.textContent=new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); };
  tick(); setInterval(tick, 30000);

  // ════════════════════════════════════════
  // PIN CUCINA
  // ════════════════════════════════════════
  let pinInput = '';
  let cuochiDB  = [];

  async function loadCuochi() {
    try {
      const { data } = await supa()
        .from('profili')
        .select('id, nome, cognome, pin, ruolo, colore')
        .eq('azienda_id', aziendaId)
        .not('pin', 'is', null);
      cuochiDB = (data || []).map(p => ({
        pin: p.pin,
        nome: [p.nome, p.cognome].filter(Boolean).join(' ') || 'Cuoco',
        ruolo: p.ruolo || 'cuoco',
        colore: p.colore || '#f59e0b',
        profiloId: p.id,
      }));
    } catch(e) { cuochiDB = []; }
  }

  function renderPinCucina() {
    const el = container.querySelector('#pin-display-cucina');
    if (el) el.textContent = '●'.repeat(pinInput.length) + '_'.repeat(Math.max(0, 4-pinInput.length));
  }

  container.querySelectorAll('[data-kc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.kc;
      if (key === '⌫') { pinInput = pinInput.slice(0,-1); renderPinCucina(); container.querySelector('#pin-error-cucina').textContent=''; return; }
      if (pinInput.length >= 4) return;
      pinInput += key; renderPinCucina();
      if (pinInput.length === 4) {
        const trovato = pinInput === ADMIN_PIN_CUCINA.pin ? ADMIN_PIN_CUCINA : cuochiDB.find(c => c.pin === pinInput);
        if (trovato) {
          container.querySelector('#pin-error-cucina').textContent = '';
          setTimeout(() => accediCucina(trovato), 150);
        } else {
          container.querySelector('#pin-error-cucina').textContent = '❌ PIN non riconosciuto';
          setTimeout(() => { pinInput=''; renderPinCucina(); container.querySelector('#pin-error-cucina').textContent=''; }, 1200);
        }
      }
    });
  });

  function accediCucina(cuoco) {
    cuocoAttivo = cuoco;
    const badge = container.querySelector('#badge-cuoco');
    badge.style.display = 'block';
    badge.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${cuoco.colore};display:inline-block;margin-right:6px;"></span>${cuoco.nome}`;
    container.querySelector('#cucina-pin').style.display = 'none';
    container.querySelector('#cucina-main').style.display = 'flex';
    avviaRefresh();
  }

  container.querySelector('#badge-cuoco').addEventListener('click', () => {
    cuocoAttivo = null; pinInput = ''; renderPinCucina();
    fermaRefresh();
    container.querySelector('#cucina-pin').style.display = 'flex';
    container.querySelector('#cucina-main').style.display = 'none';
  });

  // ════════════════════════════════════════
  // CARICA DATI
  // ════════════════════════════════════════
  async function loadSettori() {
    try {
      const { data } = await supa().from('settori').select('*').eq('azienda_id', aziendaId).order('ordine');
      settori = data || [];
    } catch(e) { settori = []; }
    renderSettoriTabs();
  }

  async function loadRighe() {
    try {
      // Carica righe in_attesa e in_preparazione filtrate per sede
      let righeQuery;
      if (sedeId) {
        // Filtra per sede tramite join con comande
        const { data: comandeSede } = await supa()
          .from('comande')
          .select('id')
          .eq('azienda_id', aziendaId)
          .eq('sede_id', sedeId)
          .in('stato', ['aperta', 'in_corso']);
        const comandaIds = (comandeSede || []).map(c => c.id);
        if (!comandaIds.length) {
          righeAttive = [];
          return;
        }
        const { data } = await supa()
          .from('comanda_righe')
          .select('*')
          .eq('azienda_id', aziendaId)
          .in('stato', ['in_attesa', 'in_preparazione'])
          .in('comanda_id', comandaIds)
          .order('created_at');
        righeAttive = data || [];
      } else {
        const { data } = await supa()
          .from('comanda_righe')
          .select('*')
          .eq('azienda_id', aziendaId)
          .in('stato', ['in_attesa', 'in_preparazione'])
          .order('created_at');
        righeAttive = data || [];
      }
    } catch(e) { righeAttive = []; }
  }

  async function loadTempiRicetta() {
    tempiRicetta = {};
    // Fonte primaria: minutaggio_servizio impostato direttamente sul
    // prodotto (più semplice da compilare di una ricetta completa).
    try {
      const { data: prod } = await supa()
        .from('prodotti_vendita')
        .select('id, minutaggio_servizio')
        .eq('azienda_id', aziendaId)
        .not('minutaggio_servizio', 'is', null);
      (prod || []).forEach(p => { tempiRicetta[p.id] = p.minutaggio_servizio; });
    } catch(e) {}
    // Fallback: tempo_esecuzione_min dalla ricetta, solo per i prodotti che
    // non hanno già un minutaggio diretto.
    try {
      const { data } = await supa()
        .from('ricette')
        .select('prodotto_vendita_id, tempo_esecuzione_min')
        .eq('azienda_id', aziendaId)
        .not('tempo_esecuzione_min', 'is', null);
      (data || []).forEach(r => { if (tempiRicetta[r.prodotto_vendita_id] == null) tempiRicetta[r.prodotto_vendita_id] = r.tempo_esecuzione_min; });
    } catch(e) {}
  }

  async function caricaTutto() {
    await Promise.all([loadSettori(), loadRighe(), loadTempiRicetta()]);
    renderCards();
  }

  // ════════════════════════════════════════
  // SETTORI — TABS + CRUD
  // ════════════════════════════════════════
  const COLORI_SETTORI = ['#f59e0b','#16a34a','#0E5A7A','#7c3aed','#dc2626','#0891b2','#be185d','#84cc16'];

  function renderSettoriTabs() {
    const box = container.querySelector('#settori-tabs');
    box.innerHTML = settori.map((s,i) => `
      <button data-settore="${s.id}" style="
        padding:8px 18px;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;
        background:${settoreAttivo===s.id ? (s.colore||COLORI_SETTORI[i%COLORI_SETTORI.length]) : '#334155'};
        color:white;
      ">${s.nome}</button>
    `).join('');

    // Binding tab tutti
    container.querySelector('[data-settore=""]').onclick = () => { settoreAttivo=null; renderSettoriTabs(); renderCards(); };
    container.querySelector('[data-settore=""]').style.background = settoreAttivo===null ? '#0E5A7A' : '#334155';

    box.querySelectorAll('[data-settore]').forEach(btn => {
      btn.onclick = () => { settoreAttivo = btn.dataset.settore||null; renderSettoriTabs(); renderCards(); };
    });
  }

  // Modal settori
  container.querySelector('#btn-gestisci-settori').onclick = () => {
    renderSettoriLista();
    container.querySelector('#modal-settori').style.display = 'flex';
  };
  container.querySelector('#btn-settori-x').onclick = () => container.querySelector('#modal-settori').style.display = 'none';

  function renderSettoriLista() {
    const box = container.querySelector('#settori-lista');
    if (!settori.length) { box.innerHTML = '<div style="color:#64748b;font-size:13px;padding:10px 0;">Nessun settore ancora.</div>'; return; }
    box.innerHTML = settori.map((s,i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #334155;">
        <div style="width:12px;height:12px;border-radius:50%;background:${s.colore||COLORI_SETTORI[i%COLORI_SETTORI.length]};flex-shrink:0;"></div>
        <div style="flex:1;color:white;font-size:14px;">${esc(s.nome)}</div>
        <button data-del-settore="${s.id}" style="background:#7f1d1d;color:#fca5a5;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;">Elimina</button>
      </div>
    `).join('');
    box.querySelectorAll('[data-del-settore]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Eliminare questo settore?')) return;
        await supa().from('settori').delete().eq('id', btn.dataset.delSettore);
        await loadSettori(); renderSettoriLista();
      };
    });
  }

  container.querySelector('#btn-aggiungi-settore').onclick = async () => {
    const nome = container.querySelector('#nuovo-settore-nome').value.trim();
    if (!nome) return;
    const colore = COLORI_SETTORI[settori.length % COLORI_SETTORI.length];
    const { data } = await supa().from('settori').insert({
      azienda_id: aziendaId,
      nome,
      colore,
      ordine: settori.length,
    }).select('*').single();
    if (data) { settori.push(data); }
    container.querySelector('#nuovo-settore-nome').value = '';
    renderSettoriLista(); renderSettoriTabs();
  };

  // ════════════════════════════════════════
  // CARDS PORTATE
  // ════════════════════════════════════════
  async function renderCards() {
    // Carica mappa tavoli per mostrare nome
    let tavoloMap = {};
    try {
      const cids = [...new Set(righeAttive.map(r => r.comanda_id).filter(Boolean))];
      if (cids.length) {
        const { data: cData } = await supa().from('comande').select('id,tavolo_id,coperti,cliente_nome').in('id', cids);
        const tids = [...new Set((cData||[]).map(c => c.tavolo_id).filter(Boolean))];
        if (tids.length) {
          const { data: tData } = await supa().from('tavoli').select('id,nome').in('id', tids);
          const tm = {}; (tData||[]).forEach(t => tm[t.id] = t.nome);
          (cData||[]).forEach(c => tavoloMap[c.id] = { tavolo: tm[c.tavolo_id]||'?', cliente: c.cliente_nome||'', coperti: c.coperti||0 });
        }
      }
    } catch(e) {}

    // Filtra per settore attivo
    let lista = righeAttive;
    if (settoreAttivo) {
      lista = lista.filter(r => r.settore_id === settoreAttivo);
    }

    const box = container.querySelector('#cucina-cards');
    if (!lista.length) {
      box.innerHTML = `<div style="color:#475569;text-align:center;grid-column:1/-1;padding:60px;font-size:16px;">✅ Nessuna portata in attesa</div>`;
      return;
    }

    // Raggruppa per tavolo (comanda_id): il cronometro e l'urgenza sono
    // dell'intero tavolo, non della singola vivanda — la portata più vecchia
    // ancora attiva determina quanto è "caldo" il tavolo.
    const gruppi = {};
    lista.forEach(r => {
      const key = r.comanda_id || 'senza-tavolo';
      if (!gruppi[key]) gruppi[key] = [];
      gruppi[key].push(r);
    });

    const ora = Date.now();

    const tavoliOrdinati = Object.entries(gruppi).sort((a, b) => {
      const arrA = Math.min(...a[1].map(r => r.created_at ? new Date(r.created_at).getTime() : ora));
      const arrB = Math.min(...b[1].map(r => r.created_at ? new Date(r.created_at).getTime() : ora));
      return arrA - arrB; // il tavolo che aspetta di più va per primo
    });

    box.innerHTML = tavoliOrdinati.map(([comandaId, righe]) => {
      const info      = tavoloMap[comandaId] || { tavolo:'?', cliente:'', coperti:0 };
      const arrivoAt  = Math.min(...righe.map(r => r.created_at ? new Date(r.created_at).getTime() : ora));

      // Sotto-raggruppa per uscita: uscite diverse dello stesso tavolo sono
      // partite/servizi distinti, non vanno mescolati nella stessa lista.
      const uscite = {};
      righe.forEach(r => {
        const u = r.uscita_numero || 1;
        if (!uscite[u]) uscite[u] = [];
        uscite[u].push(r);
      });
      const numeriUscita = Object.keys(uscite).map(Number).sort((a,b) => a-b);

      const usciteHtml = numeriUscita.map(numUscita => {
        const righeUscita = uscite[numUscita];

        // Sincronizzazione uscite: la portata col minutaggio più lungo è
        // l'"ancora" — va avviata per prima. Le altre portate del gruppo
        // devono partire (tempoAncora - tempoLoro) minuti DOPO che l'ancora
        // è stata avviata, così finiscono tutte insieme.
        const conTempo = righeUscita.map(r => ({ r, tempo: tempiRicetta[r.prodotto_vendita_id] || 15 }));
        const tempoMax = Math.max(...conTempo.map(x => x.tempo));
        const ancora = conTempo.find(x => x.tempo === tempoMax)?.r;

        const portateHtml = righeUscita.map(r => {
          const inPrep = r.stato === 'in_preparazione';
          const startedAt = r.started_at ? new Date(r.started_at).getTime() : null;
          const elapsedCottura = startedAt ? Math.floor((ora - startedAt) / 60000) : null;
          const tempoR = tempiRicetta[r.prodotto_vendita_id] || 15;
          const isAncora = ancora && r.id === ancora.id;
          const delayMin = (!isAncora && righeUscita.length > 1) ? Math.max(0, tempoMax - tempoR) : 0;

          const noteSync = (!inPrep && !isAncora && righeUscita.length > 1)
            ? `<div data-parti-nota="${r.id}" data-anchor-id="${ancora?.id||''}" data-delay-min="${delayMin}" style="font-size:11px;margin-top:2px;font-weight:600;"></div>`
            : '';

          return `
            <div data-riga-wrap="${r.id}" style="background:rgba(255,255,255,0.04);border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;transition:background 0.3s,box-shadow 0.3s;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:white;">${esc(r.nome_snapshot)} <span style="color:#64748b;font-weight:400;">×${r.quantita}</span> ${isAncora && righeUscita.length > 1 ? '<span style="font-size:10px;color:#a78bfa;">⚓ ' + tempoMax + '′</span>' : ''}</div>
                ${r.note ? `<div style="font-size:11px;color:#fbbf24;margin-top:2px;">📝 ${esc(r.note)}</div>` : ''}
                ${inPrep ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">🔥 in cottura da ${elapsedCottura} min${r.cuoco_nome ? ' — 👨‍🍳 '+esc(r.cuoco_nome) : ''}</div>` : ''}
                ${noteSync}
              </div>
              ${!inPrep ? `
                <button data-inizia="${r.id}" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:700;white-space:nowrap;">▶ Inizia</button>
              ` : `
                <button data-pronto="${r.id}" style="background:#16a34a;color:white;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:700;white-space:nowrap;">✅ Pronto</button>
              `}
            </div>
          `;
        }).join('');

        const labelUscite = ['','1ª','2ª','3ª','4ª','5ª','6ª'];
        return `
          <div style="margin-bottom:10px;">
            ${numeriUscita.length > 1 ? `<div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">${labelUscite[numUscita]||numUscita+'ª'} uscita</div>` : ''}
            ${portateHtml}
          </div>
        `;
      }).join('');

      return `
        <div data-tavolo-card="${comandaId}" data-arrivo="${arrivoAt}" style="
          background:#1e293b;border-radius:16px;padding:18px;
          border:3px solid #334155;position:relative;transition:border-color 0.4s;
        ">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
            <div>
              <div style="font-size:19px;font-weight:800;color:white;">🪑 Tavolo ${esc(info.tavolo)}</div>
              <div style="font-size:12px;color:#94a3b8;">
                ${info.cliente ? esc(info.cliente)+' — ' : ''}${info.coperti ? info.coperti+' coperti — ' : ''}${righe.length} portat${righe.length===1?'a':'e'}
              </div>
            </div>
            <div style="text-align:right;">
              <div data-cronometro="${comandaId}" style="font-size:26px;font-weight:800;color:#4ade80;font-variant-numeric:tabular-nums;">00:00</div>
              <div data-cronometro-badge="${comandaId}" style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;display:inline-block;margin-top:2px;"></div>
            </div>
          </div>

          ${usciteHtml}
        </div>
      `;
    }).join('');

    // Binding azioni (per singola portata dentro il tavolo)
    box.querySelectorAll('[data-inizia]').forEach(btn => {
      btn.onclick = async () => {
        const rid = btn.dataset.inizia;
        const aggiornamento = {
          stato: 'in_preparazione',
          started_at: new Date().toISOString(),
        };
        if (cuocoAttivo?.nome) aggiornamento.cuoco_nome = cuocoAttivo.nome;
        if (cuocoAttivo?.profiloId) aggiornamento.cuoco_id = cuocoAttivo.profiloId;
        await supa().from('comanda_righe').update(aggiornamento).eq('id', rid);
        const r = righeAttive.find(x => String(x.id) === String(rid));
        if (r) { r.stato='in_preparazione'; r.started_at=aggiornamento.started_at; r.cuoco_nome=aggiornamento.cuoco_nome||null; }
        alertPartiFired.delete(rid);
        renderCards();
      };
    });

    box.querySelectorAll('[data-pronto]').forEach(btn => {
      btn.onclick = async () => {
        const rid = btn.dataset.pronto;
        await supa().from('comanda_righe').update({
          stato: 'pronto',
          completed_at: new Date().toISOString(),
        }).eq('id', rid);
        const eraUltimaDelTavolo = righeAttive.filter(x => x.comanda_id === (righeAttive.find(x2=>String(x2.id)===String(rid))||{}).comanda_id).length <= 1;
        righeAttive = righeAttive.filter(x => String(x.id) !== String(rid));
        alertPartiFired.delete(rid);
        renderCards();
      };
    });

    aggiornaCronometriTavolo();
  }

  // ════════════════════════════════════════
  // CRONOMETRO PER TAVOLO — tick al secondo
  // ════════════════════════════════════════
  // Soglie richieste: bordo arancione dopo 3 min, rosso dopo 5 min,
  // "infuocato" (lampeggiante) dopo 10 min. Allarme sonoro una tantum al
  // superamento dei 5 minuti dall'arrivo dell'ordine.
  function aggiornaCronometriTavolo() {
    const now = Date.now();
    container.querySelectorAll('[data-tavolo-card]').forEach(card => {
      const comandaId = card.dataset.tavoloCard;
      const arrivoAt = Number(card.dataset.arrivo);
      if (!arrivoAt) return;
      const elapsedSec = Math.max(0, Math.floor((now - arrivoAt) / 1000));
      const elapsedMin = elapsedSec / 60;
      const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const ss = String(elapsedSec % 60).padStart(2, '0');

      let borderColor, textColor, badgeLabel, badgeBg, infuocato = false;
      if (elapsedMin >= 10) {
        borderColor = '#dc2626'; textColor = '#f87171'; badgeLabel = '🔥🔥 INFUOCATO'; badgeBg = '#dc2626'; infuocato = true;
      } else if (elapsedMin >= 5) {
        borderColor = '#dc2626'; textColor = '#f87171'; badgeLabel = '🔴 RITARDO'; badgeBg = '#dc2626';
      } else if (elapsedMin >= 3) {
        borderColor = '#f59e0b'; textColor = '#fbbf24'; badgeLabel = '⚠️ ATTENZIONE'; badgeBg = '#f59e0b';
      } else {
        borderColor = '#334155'; textColor = '#4ade80'; badgeLabel = '✅ OK'; badgeBg = '#334155';
      }

      card.style.borderColor = borderColor;
      card.classList.toggle('card-urgente', infuocato);

      const cronoEl = card.querySelector(`[data-cronometro="${comandaId}"]`);
      if (cronoEl) { cronoEl.textContent = mm + ':' + ss; cronoEl.style.color = textColor; }
      const badgeEl = card.querySelector(`[data-cronometro-badge="${comandaId}"]`);
      if (badgeEl) { badgeEl.textContent = badgeLabel; badgeEl.style.background = badgeBg; badgeEl.style.color = 'white'; }

      // Allarme una tantum al superamento dei 5 minuti
      if (elapsedMin >= 5 && !alertFiredTavolo.has(comandaId)) {
        alertFiredTavolo.add(comandaId);
        suonaAlert();
      }
    });

    // Segnali di sincronizzazione uscita: per ogni portata "non ancora"
    // (in attesa, non ancora avviata) che deve partire in ritardo rispetto
    // all'ancora del gruppo, controlliamo se è arrivato il momento.
    container.querySelectorAll('[data-parti-nota]').forEach(notaEl => {
      const rigaId = notaEl.dataset.partiNota;
      const anchorId = notaEl.dataset.anchorId;
      const delayMin = Number(notaEl.dataset.delayMin || 0);
      const anchorRiga = righeAttive.find(x => String(x.id) === String(anchorId));
      const wrap = container.querySelector(`[data-riga-wrap="${rigaId}"]`);
      if (!wrap) return;

      if (!anchorRiga || anchorRiga.stato !== 'in_preparazione' || !anchorRiga.started_at) {
        // L'ancora non è ancora partita: mostra solo l'informazione, niente allarme
        notaEl.textContent = delayMin > 0 ? `⏱ parte ${delayMin} min dopo l'ancora` : '⏱ parte insieme all\'ancora';
        notaEl.style.color = '#64748b';
        wrap.style.boxShadow = 'none';
        return;
      }

      const anchorStartedAt = new Date(anchorRiga.started_at).getTime();
      const target = anchorStartedAt + delayMin * 60000;
      const pronta = now >= target;

      if (pronta) {
        notaEl.textContent = '🔔 PARTI ORA!';
        notaEl.style.color = '#fbbf24';
        wrap.style.boxShadow = '0 0 0 2px #f59e0b';
        wrap.classList.add('card-urgente');
        if (!alertPartiFired.has(rigaId)) {
          alertPartiFired.add(rigaId);
          suonaAlert();
        }
      } else {
        const mancano = Math.ceil((target - now) / 60000);
        notaEl.textContent = `⏳ parte tra ${mancano} min`;
        notaEl.style.color = '#64748b';
        wrap.style.boxShadow = 'none';
        wrap.classList.remove('card-urgente');
      }
    });

    if (!cronometroTick) {
      cronometroTick = setInterval(aggiornaCronometriTavolo, 1000);
    }
  }

  // ════════════════════════════════════════
  // TIMER MANUALI (pentole/padelle, indipendenti dalle comande)
  // ════════════════════════════════════════
  function apriModalTimer() {
    container.querySelector('#modal-timer').style.display = 'flex';
    renderTimerManuali();
  }
  container.querySelector('#btn-timer-manuale').onclick = apriModalTimer;
  container.querySelector('#btn-timer-x').onclick = () => container.querySelector('#modal-timer').style.display = 'none';

  container.querySelectorAll('[data-preset]').forEach(btn => {
    btn.onclick = () => {
      const minuti = Number(btn.dataset.preset);
      const nomeInput = container.querySelector('#nuovo-timer-nome');
      const label = nomeInput.value.trim() || (minuti + ' min');
      timersManuali.push({
        id: 'tm_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        label,
        secondiTotali: minuti * 60,
        secondiRimanenti: minuti * 60,
        running: true,
        scaduto: false,
      });
      nomeInput.value = '';
      renderTimerManuali();
      avviaTickManuale();
    };
  });

  function renderTimerManuali() {
    const box = container.querySelector('#timer-manuali-lista');
    if (!timersManuali.length) {
      box.innerHTML = '<div style="color:#64748b;text-align:center;padding:20px;font-size:13px;">Nessun timer attivo. Scegli una durata sopra.</div>';
      aggiornaBadgeTimer();
      return;
    }
    box.innerHTML = timersManuali.map(t => {
      const mm = String(Math.floor(t.secondiRimanenti/60)).padStart(2,'0');
      const ss = String(t.secondiRimanenti%60).padStart(2,'0');
      const pct = Math.max(0, Math.round((t.secondiRimanenti/t.secondiTotali)*100));
      return `
        <div class="${t.scaduto?'card-urgente':''}" style="background:${t.scaduto?'#1c0a0a':'#0f172a'};border:2px solid ${t.scaduto?'#dc2626':'#334155'};border-radius:14px;padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="color:white;font-weight:700;font-size:14px;">${esc(t.label)}</div>
            <button data-timer-del="${t.id}" style="background:transparent;border:none;color:#64748b;font-size:16px;cursor:pointer;">✕</button>
          </div>
          <div style="font-size:34px;font-weight:800;color:${t.scaduto?'#f87171':'#38bdf8'};text-align:center;margin-bottom:8px;letter-spacing:2px;">
            ${t.scaduto ? '⏰ FINE!' : mm+':'+ss}
          </div>
          <div style="background:#334155;border-radius:6px;height:6px;overflow:hidden;margin-bottom:10px;">
            <div style="height:100%;border-radius:6px;background:${t.scaduto?'#dc2626':'#7c3aed'};width:${pct}%;transition:width 1s linear;"></div>
          </div>
          <div style="display:flex;gap:8px;">
            ${t.scaduto ? `
              <button data-timer-ok="${t.id}" style="flex:1;background:#16a34a;color:white;border:none;border-radius:10px;padding:9px;cursor:pointer;font-size:13px;font-weight:700;">✅ OK</button>
            ` : `
              <button data-timer-toggle="${t.id}" style="flex:1;background:${t.running?'#334155':'#7c3aed'};color:white;border:none;border-radius:10px;padding:9px;cursor:pointer;font-size:13px;font-weight:700;">${t.running?'⏸ Pausa':'▶ Riprendi'}</button>
              <button data-timer-reset="${t.id}" style="background:#334155;color:white;border:none;border-radius:10px;padding:9px 12px;cursor:pointer;font-size:13px;">↺</button>
            `}
          </div>
        </div>
      `;
    }).join('');

    box.querySelectorAll('[data-timer-toggle]').forEach(btn => {
      btn.onclick = () => {
        const t = timersManuali.find(x => x.id === btn.dataset.timerToggle);
        if (t) t.running = !t.running;
        renderTimerManuali();
      };
    });
    box.querySelectorAll('[data-timer-reset]').forEach(btn => {
      btn.onclick = () => {
        const t = timersManuali.find(x => x.id === btn.dataset.timerReset);
        if (t) { t.secondiRimanenti = t.secondiTotali; t.running = false; }
        renderTimerManuali();
      };
    });
    box.querySelectorAll('[data-timer-ok]').forEach(btn => {
      btn.onclick = () => {
        timersManuali = timersManuali.filter(x => x.id !== btn.dataset.timerOk);
        renderTimerManuali();
      };
    });
    box.querySelectorAll('[data-timer-del]').forEach(btn => {
      btn.onclick = () => {
        timersManuali = timersManuali.filter(x => x.id !== btn.dataset.timerDel);
        renderTimerManuali();
      };
    });

    aggiornaBadgeTimer();
  }

  function aggiornaBadgeTimer() {
    const badge = container.querySelector('#badge-timer-count');
    const attivi = timersManuali.filter(t => !t.scaduto).length;
    const scaduti = timersManuali.filter(t => t.scaduto).length;
    if (scaduti > 0) {
      badge.style.display = 'flex';
      badge.style.background = '#dc2626';
      badge.textContent = scaduti;
    } else if (attivi > 0) {
      badge.style.display = 'flex';
      badge.style.background = '#7c3aed';
      badge.textContent = attivi;
    } else {
      badge.style.display = 'none';
    }
  }

  function avviaTickManuale() {
    if (timerManualeTick) return;
    timerManualeTick = setInterval(() => {
      let cambiato = false;
      timersManuali.forEach(t => {
        if (t.running && !t.scaduto) {
          t.secondiRimanenti = Math.max(0, t.secondiRimanenti - 1);
          if (t.secondiRimanenti === 0) {
            t.scaduto = true;
            t.running = false;
            suonaAlert();
          }
          cambiato = true;
        }
      });
      if (!timersManuali.length) { clearInterval(timerManualeTick); timerManualeTick = null; return; }
      if (cambiato && container.querySelector('#modal-timer').style.display === 'flex') renderTimerManuali();
      else aggiornaBadgeTimer();
    }, 1000);
  }

  // ════════════════════════════════════════
  // AUTO-REFRESH
  // ════════════════════════════════════════
  function avviaRefresh() {
    fermaRefresh();
    caricaTutto();
    refreshTimer = setInterval(async () => {
      await loadRighe();
      renderCards();
    }, 15000);
  }

  function fermaRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    if (cronometroTick) { clearInterval(cronometroTick); cronometroTick = null; }
  }

  container.querySelector('#btn-cucina-refresh').onclick = () => caricaTutto();

  // ── Init ──
  await loadCuochi();
  await loadSettori();
}

function esc(s) {
  return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
