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
  let alertFired    = new Set(); // rigaId già segnalata
  let refreshTimer  = null;

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
      // Carica righe in_attesa (appena inviate) e in_preparazione
      const { data } = await supa()
        .from('comanda_righe').select('*')
        .eq('azienda_id', aziendaId)
        .in('stato', ['in_attesa', 'in_preparazione'])
        .order('created_at');
      righeAttive = data || [];
    } catch(e) { righeAttive = []; }
  }

  async function loadTempiRicetta() {
    try {
      const { data } = await supa()
        .from('ricette')
        .select('prodotto_vendita_id, tempo_esecuzione_min')
        .eq('azienda_id', aziendaId)
        .not('tempo_esecuzione_min', 'is', null);
      tempiRicetta = {};
      (data || []).forEach(r => { tempiRicetta[r.prodotto_vendita_id] = r.tempo_esecuzione_min; });
    } catch(e) { tempiRicetta = {}; }
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

    const ora = Date.now();

    box.innerHTML = lista.map(r => {
      const info       = tavoloMap[r.comanda_id] || { tavolo:'?', cliente:'', coperti:0 };
      const tempoLimite = tempiRicetta[r.prodotto_vendita_id] || 15;
      const inPrep     = r.stato === 'in_preparazione';
      const startedAt  = r.started_at ? new Date(r.started_at).getTime() : null;
      const elapsed    = startedAt ? Math.floor((ora - startedAt) / 60000) : null;
      const rimane     = elapsed !== null ? Math.max(0, tempoLimite - elapsed) : null;
      const urgente    = inPrep && elapsed !== null && elapsed >= tempoLimite;
      const warn       = inPrep && elapsed !== null && elapsed >= tempoLimite * 0.75 && !urgente;

      // Suona se urgente e non già segnalato
      if (urgente && !alertFired.has(r.id)) {
        alertFired.add(r.id);
        suonaAlert();
      }

      const borderColor = urgente ? '#dc2626' : warn ? '#f59e0b' : inPrep ? '#22c55e' : '#334155';
      const bgColor     = urgente ? '#1c0a0a' : warn ? '#1c1400' : '#1e293b';

      return `
        <div class="${urgente ? 'card-urgente' : ''}" style="
          background:${bgColor};border-radius:16px;padding:18px;
          border:2px solid ${borderColor};position:relative;
        ">
          <!-- Stato badge -->
          <div style="position:absolute;top:12px;right:12px;">
            ${urgente ? `<span style="background:#dc2626;color:white;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;">🔴 RITARDO</span>`
              : warn  ? `<span style="background:#f59e0b;color:white;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;">⚠️ QUASI</span>`
              : inPrep? `<span style="background:#22c55e20;color:#22c55e;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;border:1px solid #22c55e40;">🔥 IN PREP</span>`
              :         `<span style="background:#334155;color:#94a3b8;font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;">⏳ ATTESA</span>`}
          </div>

          <!-- Nome piatto -->
          <div style="font-size:17px;font-weight:700;color:white;margin-bottom:4px;padding-right:80px;">${esc(r.nome_snapshot)}</div>

          <!-- Tavolo info -->
          <div style="font-size:13px;color:#94a3b8;margin-bottom:10px;">
            Tavolo <strong style="color:#e2e8f0;">${esc(info.tavolo)}</strong>
            ${info.cliente ? ` — ${esc(info.cliente)}` : ''}
            — Qt: <strong style="color:#e2e8f0;">${r.quantita}</strong>
          </div>

          ${r.note ? `<div style="background:#334155;border-radius:8px;padding:6px 10px;font-size:12px;color:#fbbf24;margin-bottom:10px;">📝 ${esc(r.note)}</div>` : ''}

          <!-- Timer -->
          ${inPrep ? `
            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:12px;color:#64748b;">Tempo</span>
                <span style="font-size:13px;font-weight:700;color:${urgente?'#f87171':warn?'#fbbf24':'#4ade80'};">
                  ${elapsed}/${tempoLimite} min ${urgente?'⚠️':''}
                </span>
              </div>
              <div style="background:#334155;border-radius:6px;height:6px;overflow:hidden;">
                <div style="height:100%;border-radius:6px;background:${urgente?'#dc2626':warn?'#f59e0b':'#22c55e'};width:${Math.min(100,Math.round((elapsed/tempoLimite)*100))}%;transition:width 0.5s;"></div>
              </div>
              ${r.cuoco_nome ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">👨‍🍳 ${esc(r.cuoco_nome)}</div>` : ''}
            </div>
          ` : `
            <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Tempo stimato: ${tempoLimite} min</div>
          `}

          <!-- Azioni -->
          <div style="display:flex;gap:8px;">
            ${!inPrep ? `
              <button data-inizia="${r.id}" style="
                flex:1;background:#0E5A7A;color:white;border:none;border-radius:10px;
                padding:10px;cursor:pointer;font-size:14px;font-weight:700;
              ">▶ Inizia</button>
            ` : `
              <button data-pronto="${r.id}" style="
                flex:1;background:#16a34a;color:white;border:none;border-radius:10px;
                padding:10px;cursor:pointer;font-size:14px;font-weight:700;
              ">✅ Pronto</button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Binding azioni
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
        righeAttive = righeAttive.filter(x => String(x.id) !== String(rid));
        alertFired.delete(rid);
        renderCards();
      };
    });
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
  }

  container.querySelector('#btn-cucina-refresh').onclick = () => caricaTutto();

  // ── Init ──
  await loadCuochi();
  await loadSettori();
}

function esc(s) {
  return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
