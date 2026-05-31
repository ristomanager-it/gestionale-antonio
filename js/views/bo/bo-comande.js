// js/views/bo/bo-comande.js
// Sistema comande completo — tavoli, ordini, up-sell, cross-sell, cucina, cassa
// v2 — PIN cameriere, modal upsell/cross-sell, tracciamento vendite, apertura tavolo con coperti+nominativo

const supa = () => window.supabaseClient || window.supabase;

async function waitForAuth(maxWait = 3000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const s = supa();
    if (s) {
      const { data } = await s.auth.getSession();
      if (data?.session) return true;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

// ── Camerieri (configurazione locale — in futuro da DB) ──
// Struttura: { pin, nome, ruolo: 'full' | 'limited', colore }
// 'limited' = può aggiungere solo categorie in CATEGORIE_LIMITED
const CAMERIERI_DEFAULT = [
  { pin: '1111', nome: 'Mario', ruolo: 'full', colore: '#0E5A7A' },
  { pin: '2222', nome: 'Sara', ruolo: 'full', colore: '#7c3aed' },
  { pin: '3333', nome: 'Luca', ruolo: 'limited', colore: '#16a34a' },
  { pin: '9999', nome: 'Manager', ruolo: 'manager', colore: '#dc2626' },
];
const CATEGORIE_LIMITED = ['Bevande', 'Acqua', 'Vini rossi', 'Vini bianchi', 'Le bollicine', 'Caffetteria', 'Dolci', 'Dessert', 'Amari'];

// ── Regole upsell per categoria ──
// abbinamenti: array di { prodotto (stringa ricerca per nome), frase }
const UPSELL_RULES = {
  'primi':      { frase: 'Un calice di vino per accompagnare?', catTarget: 'Vini rossi', catCross: 'Contorni' },
  'secondi':    { frase: 'Aggiungo un contorno? Abbiamo verdure di stagione.', catTarget: 'Contorni', catCross: 'Dolci' },
  'antipasti':  { frase: 'Posso abbinare un calice di bollicine per iniziare?', catTarget: 'Le bollicine', catCross: 'Vini bianchi' },
  'dessert':    { frase: 'Un caffè o un amaro per concludere?', catTarget: 'Caffetteria', catCross: 'Amari' },
  'dolci':      { frase: 'Un caffè o un amaro per concludere?', catTarget: 'Caffetteria', catCross: 'Amari' },
  'pizza':      { frase: 'Aggiungo una birra artigianale?', catTarget: 'Bevande', catCross: 'Dolci' },
};

const CROSS_SELL_FINE_PASTO = [
  { msg: '☕ Caffè?', cat: 'Caffetteria' },
  { msg: '🥃 Amaro digestivo?', cat: 'Amari' },
  { msg: '🍰 Dolce?', cat: 'Dolci' },
];

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  if (!aziendaId) {
    container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>';
    return;
  }

  const authOk = await waitForAuth();
  if (!authOk) {
    container.innerHTML = '<section class="view"><h2>Sessione non disponibile. Ricarica la pagina.</h2></section>';
    return;
  }

  // ── Stato locale ──
  let sale = [];
  let tavoli = [];
  let comande = [];
  let prodottiVendita = [];
  let categorieVendita = [];
  let prenotazioniOggi = [];
  let comandaAttiva = null;
  let righeComanda = [];
  let categoriaSelezionata = null;
  let salaSelezionata = null;
  let viewMode = 'pin'; // pin | tavoli | comanda | cucina
  let cameriereAttivo = null; // { pin, nome, ruolo, colore }

  // ── Shell HTML ──
  container.innerHTML = `
    <div class="comande-shell" style="display:flex;flex-direction:column;height:100vh;overflow:hidden;background:#f1f5f9;">

      <!-- Topbar -->
      <div style="background:#0E5A7A;color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="btn-view-tavoli" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;">🪑 Tavoli</button>
          <button id="btn-view-cucina" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;">👨‍🍳 Cucina</button>
        </div>
        <div style="font-size:13px;opacity:0.85;" id="top-sede">${window.state?.sedeAttiva?.nome || 'Tutte le sedi'}</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div id="badge-cameriere" style="display:none;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px;font-size:12px;cursor:pointer;" title="Cambia cameriere"></div>
          <button id="btn-refresh" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:6px 10px;border-radius:8px;cursor:pointer;">🔄</button>
          <div id="top-ora" style="font-size:13px;opacity:0.85;padding:6px 0;"></div>
        </div>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow:hidden;display:flex;position:relative;">

        <!-- 🔐 Vista PIN -->
        <div id="view-pin" style="flex:1;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0E5A7A 0%,#0a3d52 100%);">
          <div style="background:white;border-radius:24px;padding:40px 32px;width:320px;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">🍽️</div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:4px;">Ristoflow Comande</div>
            <div style="font-size:13px;color:#64748b;margin-bottom:28px;">Inserisci il tuo PIN per accedere</div>

            <!-- Display PIN -->
            <div id="pin-display" style="font-size:32px;letter-spacing:12px;height:48px;margin-bottom:20px;color:#0E5A7A;font-weight:700;">____</div>

            <!-- Tastierino -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
              ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(n => `
                <button data-key="${n}" style="
                  height:60px;border-radius:14px;border:none;font-size:20px;font-weight:600;cursor:pointer;
                  background:${n==='' ? 'transparent' : '#f1f5f9'};color:#0f172a;
                  transition:background 0.1s;
                  ${n==='' ? 'pointer-events:none;' : ''}
                " ${n==='' ? 'disabled' : ''}>${n}</button>
              `).join('')}
            </div>

            <div id="pin-error" style="color:#dc2626;font-size:13px;min-height:20px;"></div>
          </div>
        </div>

        <!-- 🪑 Vista tavoli -->
        <div id="view-tavoli" style="flex:1;overflow-y:auto;padding:16px;display:none;">
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
            <div id="sale-tabs" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
            <button id="btn-nuova-sala" style="padding:6px 12px;background:#e2e8f0;border:none;border-radius:8px;cursor:pointer;font-size:12px;">+ Sala</button>
            <button id="btn-nuovo-tavolo" style="padding:6px 12px;background:#e2e8f0;border:none;border-radius:8px;cursor:pointer;font-size:12px;">+ Tavolo</button>
          </div>
          <div id="mappa-tavoli" style="display:flex;flex-wrap:wrap;gap:12px;"></div>
        </div>

        <!-- 🧾 Vista comanda -->
        <div id="view-comanda" style="flex:1;overflow:hidden;display:none;flex-direction:column;">

          <div style="background:white;border-bottom:1px solid #e5e7eb;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:10px;">
              <button id="btn-back-tavoli" style="background:#f1f5f9;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;">← Tavoli</button>
              <div>
                <strong id="comanda-tavolo-nome" style="font-size:16px;">Tavolo</strong>
                <div id="comanda-cliente-info" style="font-size:12px;color:#64748b;"></div>
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              <button id="btn-invia-cucina" style="background:#16a34a;color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;">📤 Invia cucina</button>
              <button id="btn-preconto" style="background:#f59e0b;color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;">🧾 Preconto</button>
              <button id="btn-chiudi-comanda" style="background:#dc2626;color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;">✅ Chiudi</button>
            </div>
          </div>

          <div style="flex:1;overflow:hidden;display:grid;grid-template-columns:1fr 340px;">

            <div style="overflow:hidden;display:flex;flex-direction:column;border-right:1px solid #e5e7eb;">
              <div style="overflow-x:auto;white-space:nowrap;padding:8px 12px;background:white;border-bottom:1px solid #e5e7eb;flex-shrink:0;" id="cat-tabs"></div>
              <div style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb;flex-shrink:0;">
                <input id="search-prodotto" class="input" placeholder="🔍 Cerca prodotto..." style="width:100%;box-sizing:border-box;">
              </div>
              <div id="griglia-prodotti" style="flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;align-content:start;"></div>
            </div>

            <div style="overflow:hidden;display:flex;flex-direction:column;background:white;">
              <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;display:flex;gap:8px;align-items:center;flex-shrink:0;">
                <div style="font-size:13px;color:#64748b;">Coperti:</div>
                <input id="comanda-coperti" type="number" min="1" max="30" value="2" style="width:60px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;">
                <input id="comanda-note" class="input" placeholder="Note tavolo..." style="flex:1;font-size:13px;">
              </div>
              <div id="righe-comanda" style="flex:1;overflow-y:auto;padding:8px;"></div>
              <div style="border-top:1px solid #e5e7eb;padding:12px;flex-shrink:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <strong style="font-size:16px;">Totale</strong>
                  <strong style="font-size:20px;color:#0E5A7A;" id="comanda-totale">€ 0,00</strong>
                </div>
                <div id="crosssell-box" style="display:none;margin-bottom:10px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 👨‍🍳 Vista cucina -->
        <div id="view-cucina" style="flex:1;overflow-y:auto;padding:16px;display:none;">
          <h3 style="margin:0 0 12px;">👨‍🍳 Display cucina</h3>
          <div id="cucina-righe" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;"></div>
        </div>

      </div>
    </div>

    <!-- ── MODAL: Apertura tavolo ── -->
    <div id="modal-apertura" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:none;align-items:center;justify-content:center;">
      <div style="background:white;border-radius:20px;padding:32px;width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:4px;">🪑 Apri tavolo</div>
        <div id="apertura-tavolo-nome" style="font-size:14px;color:#64748b;margin-bottom:24px;"></div>

        <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Coperti *</label>
        <div style="display:flex;gap:8px;margin-bottom:20px;">
          ${[1,2,3,4,5,6,7,8,10,12].map(n => `
            <button data-coperti="${n}" style="
              flex:1;min-width:36px;height:44px;border-radius:10px;border:2px solid #e5e7eb;
              background:white;font-size:15px;font-weight:700;cursor:pointer;color:#374151;
              transition:all 0.15s;
            ">${n}</button>
          `).join('')}
        </div>

        <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Nome cliente <span style="font-weight:400;color:#94a3b8;">(opzionale)</span></label>
        <input id="apertura-nominativo" class="input" placeholder="es. Famiglia Rossi, Tavolo prenotato..." style="width:100%;box-sizing:border-box;margin-bottom:8px;font-size:14px;padding:10px 12px;">

        <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Telefono <span style="font-weight:400;color:#94a3b8;">(opzionale)</span></label>
        <input id="apertura-telefono" class="input" placeholder="es. 333 123 4567" style="width:100%;box-sizing:border-box;margin-bottom:24px;font-size:14px;padding:10px 12px;" type="tel">

        <div style="display:flex;gap:10px;">
          <button id="btn-apertura-annulla" style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:white;cursor:pointer;font-size:14px;">Annulla</button>
          <button id="btn-apertura-conferma" style="flex:2;padding:12px;border:none;border-radius:12px;background:#0E5A7A;color:white;cursor:pointer;font-size:14px;font-weight:600;">Apri tavolo →</button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Upsell/Cross-sell ── -->
    <div id="modal-upsell" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:flex-end;justify-content:center;">
      <div style="background:white;border-radius:24px 24px 0 0;padding:28px 24px;width:100%;max-width:600px;box-shadow:0 -10px 40px rgba(0,0,0,0.2);animation:slideUp 0.3s ease;">
        <style>@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}</style>

        <!-- Handle -->
        <div style="width:40px;height:4px;background:#e5e7eb;border-radius:2px;margin:0 auto 20px;"></div>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
          <div style="font-size:28px;" id="upsell-emoji">🍷</div>
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;">Hai appena aggiunto</div>
            <div style="font-size:17px;font-weight:700;color:#0f172a;" id="upsell-prodotto-nome"></div>
          </div>
        </div>

        <!-- Frase da dire -->
        <div style="background:#fef3c7;border-radius:12px;padding:14px 16px;margin:16px 0;border-left:4px solid #f59e0b;">
          <div style="font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">💬 Suggerisci al cliente</div>
          <div style="font-size:15px;color:#78350f;font-style:italic;" id="upsell-frase"></div>
        </div>

        <!-- Prodotti upsell -->
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;" id="upsell-label-1">⬆️ Abbinamento principale</div>
          <div id="upsell-prodotti-1" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <div style="margin-bottom:20px;">
          <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;" id="upsell-label-2">➕ Potrebbe interessare</div>
          <div id="upsell-prodotti-2" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
        </div>

        <!-- CTA -->
        <div style="display:flex;gap:10px;">
          <button id="btn-upsell-non-int" style="flex:1;padding:13px;border:1px solid #e5e7eb;border-radius:12px;background:white;cursor:pointer;font-size:13px;color:#64748b;">Non interessato</button>
          <button id="btn-upsell-chiudi" style="flex:1;padding:13px;border:none;border-radius:12px;background:#f1f5f9;cursor:pointer;font-size:13px;font-weight:600;color:#374151;">Continua ordine →</button>
        </div>
      </div>
    </div>
  `;

  // ── Orologio ──
  function aggiornaOra() {
    const el = container.querySelector('#top-ora');
    if (el) el.textContent = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  aggiornaOra();
  setInterval(aggiornaOra, 30000);

  // ══════════════════════════════════════════
  // PIN LOGIC
  // ══════════════════════════════════════════
  let pinInput = '';
  const camerieri = CAMERIERI_DEFAULT; // in futuro: carica da DB

  function renderPinDisplay() {
    const el = container.querySelector('#pin-display');
    if (!el) return;
    const filled = pinInput.length;
    el.textContent = '●'.repeat(filled) + '_'.repeat(Math.max(0, 4 - filled));
  }

  function verificaPin(pin) {
    return camerieri.find(c => c.pin === pin) || null;
  }

  function accediConPin(cameriere) {
    cameriereAttivo = cameriere;
    const badge = container.querySelector('#badge-cameriere');
    if (badge) {
      badge.style.display = 'block';
      badge.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${cameriere.colore};display:inline-block;margin-right:6px;"></span>${cameriere.nome} ${cameriere.ruolo === 'limited' ? '(limitato)' : ''}`;
    }
    switchView('tavoli');
  }

  // Binding tastierino PIN
  container.querySelectorAll('[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (key === '⌫') {
        pinInput = pinInput.slice(0, -1);
        renderPinDisplay();
        container.querySelector('#pin-error').textContent = '';
        return;
      }
      if (pinInput.length >= 4) return;
      pinInput += key;
      renderPinDisplay();

      if (pinInput.length === 4) {
        const cam = verificaPin(pinInput);
        if (cam) {
          container.querySelector('#pin-error').textContent = '';
          setTimeout(() => accediConPin(cam), 150);
        } else {
          container.querySelector('#pin-error').textContent = '❌ PIN non riconosciuto';
          setTimeout(() => {
            pinInput = '';
            renderPinDisplay();
            container.querySelector('#pin-error').textContent = '';
          }, 1200);
        }
      }
    });
  });

  // Badge: click per cambiare cameriere
  container.querySelector('#badge-cameriere').addEventListener('click', () => {
    cameriereAttivo = null;
    pinInput = '';
    renderPinDisplay();
    switchView('pin');
  });

  // ══════════════════════════════════════════
  // CARICA DATI
  // ══════════════════════════════════════════
  async function loadAll() {
    await Promise.all([
      loadSale(), loadTavoli(), loadComande(),
      loadProdotti(), loadCategorie(), loadPrenotazioniOggi(),
    ]);
    renderSaleTabs();
    renderMapTavoli();
  }

  async function loadSale() {
    let q = supa().from('sale').select('*').eq('azienda_id', aziendaId);
    if (sedeId) q = q.eq('sede_id', sedeId);
    const { data } = await q.order('nome');
    sale = data || [];
  }

  async function loadTavoli() {
    let q = supa().from('tavoli').select('*').eq('azienda_id', aziendaId);
    if (sedeId) q = q.eq('sede_id', sedeId);
    if (salaSelezionata) q = q.eq('sala_id', salaSelezionata);
    const { data } = await q.order('nome');
    tavoli = data || [];
  }

  async function loadComande() {
    const { data } = await supa()
      .from('comande').select('*')
      .eq('azienda_id', aziendaId)
      .neq('stato', 'chiusa')
      .order('created_at', { ascending: false });
    comande = data || [];
  }

  async function loadProdotti() {
    let q = supa().from('prodotti_vendita').select('*').eq('azienda_id', aziendaId);
    if (sedeId) q = q.eq('sede_id', sedeId);
    const { data } = await q.order('nome');
    prodottiVendita = data || [];
  }

  async function loadCategorie() {
    const { data } = await supa().from('categorie_vendita').select('*').eq('azienda_id', aziendaId).order('nome');
    categorieVendita = data || [];
  }

  async function loadPrenotazioniOggi() {
    const oggi = new Date().toISOString().slice(0, 10);
    const { data } = await supa()
      .from('prenotazioni_tavoli').select('*')
      .eq('azienda_id', aziendaId).eq('data', oggi)
      .in('stato', ['confermata', 'arrivata']);
    prenotazioniOggi = data || [];
  }

  async function loadRigheComanda(comandaId) {
    const { data } = await supa()
      .from('comanda_righe').select('*')
      .eq('comanda_id', comandaId).order('created_at');
    righeComanda = data || [];
  }

  // ══════════════════════════════════════════
  // RENDER SALE + TAVOLI
  // ══════════════════════════════════════════
  function renderSaleTabs() {
    const box = container.querySelector('#sale-tabs');
    const all = [{ id: null, nome: 'Tutte' }, ...sale];
    box.innerHTML = all.map(s => `
      <button data-sala="${s.id || ''}" style="
        padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-size:13px;
        background:${salaSelezionata === s.id ? '#0E5A7A' : '#e2e8f0'};
        color:${salaSelezionata === s.id ? 'white' : '#374151'};
      ">${esc(s.nome)}</button>
    `).join('');
    box.querySelectorAll('[data-sala]').forEach(btn => {
      btn.onclick = async () => {
        salaSelezionata = btn.dataset.sala || null;
        await loadTavoli(); renderSaleTabs(); renderMapTavoli();
      };
    });
  }

  function renderMapTavoli() {
    const box = container.querySelector('#mappa-tavoli');
    if (!tavoli.length) {
      box.innerHTML = `<div style="color:#64748b;padding:20px;">Nessun tavolo. Clicca "+ Tavolo" per aggiungerne uno.</div>`;
      return;
    }
    box.innerHTML = tavoli.map(t => {
      const comanda = comande.find(c => String(c.tavolo_id) === String(t.id));
      const prenotazione = prenotazioniOggi.find(p => String(p.tavolo_id) === String(t.id));
      const isOccupato = !!comanda;
      const haPrenotazione = !!prenotazione && !isOccupato;
      const hasDessert = isOccupato && righeComanda.some(r =>
        String(r.comanda_id) === String(comanda?.id) && r.stato !== 'annullato' && r.stato !== 'servito' &&
        (r.nome_snapshot || '').match(/dessert|dolce|caffè|caffe|amaro|gelato|tiramisù/i)
      );
      const borderColor = isOccupato ? (hasDessert ? '#f59e0b' : '#dc2626') : haPrenotazione ? '#3b82f6' : '#22c55e';
      const bgColor = isOccupato ? (hasDessert ? '#fef3c7' : '#fee2e2') : haPrenotazione ? '#eff6ff' : '#f0fdf4';
      return `
        <button data-tavolo="${t.id}" style="
          width:120px;height:120px;border-radius:16px;border:3px solid ${borderColor};
          background:${bgColor};cursor:pointer;display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:4px;transition:transform 0.1s;padding:8px;
        ">
          <div style="font-size:28px;">${isOccupato ? '🔴' : haPrenotazione ? '🟡' : '🟢'}</div>
          <strong style="font-size:14px;">${esc(t.nome)}</strong>
          <div style="font-size:11px;color:#64748b;">${t.coperti_max || ''} coperti</div>
          ${isOccupato ? `<div style="font-size:11px;color:#dc2626;font-weight:700;">€${Number(comanda.totale||0).toFixed(2)}</div>` : ''}
          ${isOccupato && comanda.cliente_nome ? `<div style="font-size:10px;color:#374151;">${esc(comanda.cliente_nome)}</div>` : ''}
          ${haPrenotazione ? `<div style="font-size:11px;color:#92400e;">${esc(prenotazione.cliente_nome||'')}</div>` : ''}
        </button>
      `;
    }).join('');
    box.querySelectorAll('[data-tavolo]').forEach(btn => {
      btn.onclick = () => tapTavolo(btn.dataset.tavolo);
    });
  }

  // ══════════════════════════════════════════
  // APERTURA TAVOLO — con modal coperti + nominativo
  // ══════════════════════════════════════════
  let _tavoloInApertura = null;
  let _copertSelezionati = 2;

  function tapTavolo(tavoloId) {
    // Controlla permessi cameriere limited
    if (cameriereAttivo?.ruolo === 'limited') {
      // Il limited può accedere solo ai tavoli dove è già stata aperta una comanda
      const comanda = comande.find(c => String(c.tavolo_id) === String(tavoloId));
      if (!comanda) {
        mostraToast('⛔ Non hai il permesso di aprire nuovi tavoli', 'error');
        return;
      }
    }

    const comanda = comande.find(c => String(c.tavolo_id) === String(tavoloId));
    if (comanda) {
      // Tavolo già aperto: vai diretto alla comanda
      apriComanda(tavoloId);
    } else {
      // Tavolo libero: mostra modal apertura
      _tavoloInApertura = tavoloId;
      _copertSelezionati = 2;
      const tavolo = tavoli.find(t => String(t.id) === String(tavoloId));
      const prenotazione = prenotazioniOggi.find(p => String(p.tavolo_id) === String(tavoloId));

      const modal = container.querySelector('#modal-apertura');
      container.querySelector('#apertura-tavolo-nome').textContent =
        `${tavolo?.nome || 'Tavolo'}${prenotazione ? ` — Prenotazione: ${prenotazione.cliente_nome}` : ''}`;
      container.querySelector('#apertura-nominativo').value = prenotazione?.cliente_nome || '';
      container.querySelector('#apertura-telefono').value = prenotazione?.telefono || '';

      // Reset selezione coperti
      _copertSelezionati = prenotazione?.coperti || tavolo?.coperti_min || 2;
      aggiornaCopertiBtns();

      modal.style.display = 'flex';
      setTimeout(() => container.querySelector('#apertura-nominativo').focus(), 100);
    }
  }

  function aggiornaCopertiBtns() {
    container.querySelectorAll('[data-coperti]').forEach(btn => {
      const n = parseInt(btn.dataset.coperti);
      btn.style.background = n === _copertSelezionati ? '#0E5A7A' : 'white';
      btn.style.color = n === _copertSelezionati ? 'white' : '#374151';
      btn.style.borderColor = n === _copertSelezionati ? '#0E5A7A' : '#e5e7eb';
    });
  }

  container.querySelectorAll('[data-coperti]').forEach(btn => {
    btn.onclick = () => {
      _copertSelezionati = parseInt(btn.dataset.coperti);
      aggiornaCopertiBtns();
    };
  });

  container.querySelector('#btn-apertura-annulla').onclick = () => {
    container.querySelector('#modal-apertura').style.display = 'none';
    _tavoloInApertura = null;
  };

  container.querySelector('#btn-apertura-conferma').onclick = async () => {
    if (!_tavoloInApertura) return;
    const nominativo = container.querySelector('#apertura-nominativo').value.trim();
    const telefono = container.querySelector('#apertura-telefono').value.trim();
    container.querySelector('#modal-apertura').style.display = 'none';
    await apriComanda(_tavoloInApertura, { coperti: _copertSelezionati, nominativo, telefono });
    _tavoloInApertura = null;
  };

  // ══════════════════════════════════════════
  // APRI COMANDA
  // ══════════════════════════════════════════
  async function apriComanda(tavoloId, opzioni = {}) {
    const tavolo = tavoli.find(t => String(t.id) === String(tavoloId));
    if (!tavolo) return;

    let comanda = comande.find(c => String(c.tavolo_id) === String(tavoloId));

    if (!comanda) {
      const prenotazione = prenotazioniOggi.find(p => String(p.tavolo_id) === String(tavoloId));
      const { data, error } = await supa().from('comande').insert({
        azienda_id: aziendaId,
        sede_id: sedeId,
        tavolo_id: tavoloId,
        stato: 'aperta',
        totale: 0,
        coperti: opzioni.coperti || prenotazione?.coperti || tavolo.coperti_min || 1,
        cliente_nome: opzioni.nominativo || prenotazione?.cliente_nome || null,
        note: opzioni.telefono ? `Tel: ${opzioni.telefono}` : null,
        prenotazione_id: prenotazione?.id || null,
        cliente_id: prenotazione?.cliente_id || null,
        cameriere_apertura: cameriereAttivo?.nome || null,
      }).select('*').single();

      if (error) { mostraToast('Errore apertura comanda', 'error'); return; }
      comanda = data;
      comande.push(comanda);
    }

    comandaAttiva = comanda;
    await loadRigheComanda(comanda.id);

    const clienteInfo = container.querySelector('#comanda-cliente-info');
    if (clienteInfo) {
      const info = [
        comanda.cliente_nome,
        comanda.coperti ? `${comanda.coperti} coperti` : null,
        cameriereAttivo ? `— ${cameriereAttivo.nome}` : null,
      ].filter(Boolean).join(' · ');
      clienteInfo.textContent = info;
    }

    container.querySelector('#comanda-tavolo-nome').textContent = tavolo.nome;
    container.querySelector('#comanda-coperti').value = comanda.coperti || 2;
    container.querySelector('#comanda-note').value = comanda.note || '';

    switchView('comanda');
    categoriaSelezionata = null;
    // Se cameriere limited: pre-filtra su categorie accessibili
    if (cameriereAttivo?.ruolo === 'limited') {
      const catLimitata = categorieVendita.find(c =>
        CATEGORIE_LIMITED.some(cl => c.nome.toLowerCase().includes(cl.toLowerCase()))
      );
      if (catLimitata) categoriaSelezionata = catLimitata.id;
    }
    renderCategorieTabs();
    renderGrigliaProdotti();
    renderRighe();
    renderTotale();
  }

  // ══════════════════════════════════════════
  // RENDER CATEGORIE + GRIGLIA PRODOTTI
  // ══════════════════════════════════════════
  function renderCategorieTabs() {
    const box = container.querySelector('#cat-tabs');
    let cats = categorieVendita;
    // Limited: mostra solo categorie accessibili
    if (cameriereAttivo?.ruolo === 'limited') {
      cats = cats.filter(c => CATEGORIE_LIMITED.some(cl => c.nome.toLowerCase().includes(cl.toLowerCase())));
    }
    const all = [{ id: null, nome: 'Tutti' }, ...cats];
    box.innerHTML = all.map(c => `
      <button data-cat="${c.id || ''}" style="
        display:inline-block;padding:8px 14px;margin-right:4px;
        border:none;border-radius:8px;cursor:pointer;font-size:13px;
        background:${String(categoriaSelezionata) === String(c.id) ? '#0E5A7A' : '#f1f5f9'};
        color:${String(categoriaSelezionata) === String(c.id) ? 'white' : '#374151'};
        white-space:nowrap;
      ">${esc(c.nome)}</button>
    `).join('');
    box.querySelectorAll('[data-cat]').forEach(btn => {
      btn.onclick = () => {
        categoriaSelezionata = btn.dataset.cat || null;
        renderCategorieTabs(); renderGrigliaProdotti();
      };
    });
  }

  function renderGrigliaProdotti(searchTerm = '') {
    const box = container.querySelector('#griglia-prodotti');
    let list = prodottiVendita;

    // Limited: filtra solo prodotti delle sue categorie
    if (cameriereAttivo?.ruolo === 'limited') {
      const catIds = categorieVendita
        .filter(c => CATEGORIE_LIMITED.some(cl => c.nome.toLowerCase().includes(cl.toLowerCase())))
        .map(c => c.id);
      list = list.filter(p => catIds.includes(p.categoria_vendita_id));
    }

    if (categoriaSelezionata) list = list.filter(p => String(p.categoria_vendita_id) === String(categoriaSelezionata));
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => (p.nome || '').toLowerCase().includes(q));
    }

    if (!list.length) {
      box.innerHTML = `<div style="color:#64748b;font-size:13px;grid-column:1/-1;">Nessun prodotto.</div>`;
      return;
    }

    box.innerHTML = list.map(p => `
      <button data-prodotto="${p.id}" style="
        background:white;border:1px solid #e5e7eb;border-radius:12px;
        padding:12px 8px;cursor:pointer;text-align:center;
        display:flex;flex-direction:column;align-items:center;gap:6px;
        transition:background 0.1s;
        ${p.disponibile === false ? 'opacity:0.4;pointer-events:none;' : ''}
      ">
        ${p.foto_url ? `<img src="${p.foto_url}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">` : '<div style="font-size:32px;">🍽️</div>'}
        <div style="font-size:12px;font-weight:600;line-height:1.3;color:#0f172a;">${esc(p.nome)}</div>
        <div style="font-size:13px;color:#0E5A7A;font-weight:700;">€${Number(p.prezzo_base||0).toFixed(2).replace('.',',')}</div>
      </button>
    `).join('');

    box.querySelectorAll('[data-prodotto]').forEach(btn => {
      btn.onclick = () => aggiungiProdotto(btn.dataset.prodotto);
    });
  }

  // ══════════════════════════════════════════
  // AGGIUNGI PRODOTTO + MODAL UPSELL
  // ══════════════════════════════════════════
  async function aggiungiProdotto(prodottoId, pesoKg = null) {
    if (!comandaAttiva) return;
    const prodotto = prodottiVendita.find(p => String(p.id) === String(prodottoId));
    if (!prodotto) return;

    if (prodotto.unita_porzione === 'kg' || prodotto.unita_porzione === 'g' || prodotto.tags?.peso) {
      const input = prompt(`Peso per "${prodotto.nome}" (in kg, es. 0.800):`, '');
      if (!input) return;
      const peso = parseFloat(input.replace(',', '.'));
      if (isNaN(peso) || peso <= 0) { mostraToast('Peso non valido', 'error'); return; }
      pesoKg = peso;
    }

    const rigaEsistente = righeComanda.find(r =>
      String(r.prodotto_vendita_id) === String(prodottoId) && r.stato === 'in_attesa'
    );

    if (rigaEsistente) {
      const { error } = await supa().from('comanda_righe')
        .update({ quantita: rigaEsistente.quantita + 1 }).eq('id', rigaEsistente.id);
      if (!error) rigaEsistente.quantita += 1;
    } else {
      const cat = categorieVendita.find(c => String(c.id) === String(prodotto.categoria_vendita_id));
      const catNome = (cat?.nome || '').toLowerCase();
      const stampante = ['bevande','vini rossi','vini bianchi','le bollicine','amari','caffetteria']
        .some(c => catNome.includes(c)) ? 'bar' : 'cucina';

      const prezzoFinale = pesoKg ? (prodotto.prezzo_base || 0) * pesoKg : (prodotto.prezzo_base || 0);
      const nomeFinale = pesoKg ? `${prodotto.nome} (${pesoKg}kg)` : prodotto.nome;

      const { data, error } = await supa().from('comanda_righe').insert({
        azienda_id: aziendaId,
        comanda_id: comandaAttiva.id,
        prodotto_vendita_id: prodotto.id,
        nome_snapshot: nomeFinale,
        prezzo_snapshot: prezzoFinale,
        quantita: 1,
        stato: 'in_attesa',
        stampante,
        cameriere: cameriereAttivo?.nome || null, // ← tracciamento
      }).select('*').single();

      if (!error && data) righeComanda.push(data);
    }

    await aggiornaTotale();
    renderRighe();
    renderTotale();

    // Mostra modal upsell (non per upsell-prodotti aggiuntivi, evita loop)
    mostraModalUpsell(prodotto);
    checkCrossSell();
  }

  // ── Modal upsell al tap prodotto ──
  function mostraModalUpsell(prodotto) {
    const cat = categorieVendita.find(c => String(c.id) === String(prodotto.categoria_vendita_id));
    const catNome = (cat?.nome || '').toLowerCase();

    const rule = Object.entries(UPSELL_RULES).find(([k]) => catNome.includes(k));
    if (!rule) return; // nessuna regola → non mostrare

    const [, { frase, catTarget, catCross }] = rule;

    // Trova prodotti delle due categorie
    const catT = categorieVendita.find(c => c.nome === catTarget);
    const catC = categorieVendita.find(c => c.nome === catCross);

    const prodUp1 = catT ? prodottiVendita.filter(p => String(p.categoria_vendita_id) === String(catT.id)).slice(0, 4) : [];
    const prodUp2 = catC ? prodottiVendita.filter(p => String(p.categoria_vendita_id) === String(catC.id)).slice(0, 3) : [];

    if (!prodUp1.length && !prodUp2.length) return;

    const modal = container.querySelector('#modal-upsell');
    container.querySelector('#upsell-prodotto-nome').textContent = prodotto.nome;
    container.querySelector('#upsell-frase').textContent = `"${frase}"`;
    container.querySelector('#upsell-label-1').textContent = `⬆️ ${catTarget}`;
    container.querySelector('#upsell-label-2').textContent = `➕ ${catCross}`;

    // Emoji in base alla categoria
    const emojiMap = { 'vini': '🍷', 'bollicine': '🥂', 'bevande': '🍺', 'caffetteria': '☕', 'amari': '🥃', 'contorni': '🥗', 'dolci': '🍰' };
    const emoji = Object.entries(emojiMap).find(([k]) => catNome.includes(k))?.[1] || '✨';
    container.querySelector('#upsell-emoji').textContent = emoji;

    function renderProdUpsell(containerId, prods) {
      const el = container.querySelector(`#${containerId}`);
      el.innerHTML = prods.map(p => `
        <button data-upsell-prod="${p.id}" style="
          background:white;border:2px solid #e5e7eb;border-radius:12px;
          padding:10px 14px;cursor:pointer;font-size:13px;
          display:flex;flex-direction:column;align-items:center;gap:4px;min-width:90px;
          transition:all 0.15s;
        ">
          <div style="font-weight:600;color:#0f172a;">${esc(p.nome)}</div>
          <div style="color:#0E5A7A;font-weight:700;">€${Number(p.prezzo_base||0).toFixed(2).replace('.',',')}</div>
        </button>
      `).join('');

      el.querySelectorAll('[data-upsell-prod]').forEach(btn => {
        btn.onclick = async () => {
          // Traccia: upsell accettato
          await tracciaSuggerimento(prodotto.id, btn.dataset.upsellProd, 'accettato');
          chiudiModalUpsell();
          await aggiungiProdotto(btn.dataset.upsellProd);
        };
        btn.onmouseenter = () => { btn.style.borderColor = '#0E5A7A'; btn.style.background = '#f0f9ff'; };
        btn.onmouseleave = () => { btn.style.borderColor = '#e5e7eb'; btn.style.background = 'white'; };
      });
    }

    renderProdUpsell('upsell-prodotti-1', prodUp1);
    renderProdUpsell('upsell-prodotti-2', prodUp2);

    modal.style.display = 'flex';
  }

  function chiudiModalUpsell() {
    container.querySelector('#modal-upsell').style.display = 'none';
  }

  container.querySelector('#btn-upsell-chiudi').onclick = chiudiModalUpsell;
  container.querySelector('#btn-upsell-non-int').onclick = async () => {
    // Traccia: non interessato
    chiudiModalUpsell();
  };

  // Chiudi modal upsell cliccando fuori
  container.querySelector('#modal-upsell').addEventListener('click', e => {
    if (e.target === container.querySelector('#modal-upsell')) chiudiModalUpsell();
  });
  container.querySelector('#modal-apertura').addEventListener('click', e => {
    if (e.target === container.querySelector('#modal-apertura')) {
      container.querySelector('#modal-apertura').style.display = 'none';
    }
  });

  // ── Traccia suggerimenti (per analytics futuri) ──
  async function tracciaSuggerimento(prodottoOrigineId, prodottoSuggerito, esito) {
    try {
      await supa().from('upsell_log').insert({
        azienda_id: aziendaId,
        comanda_id: comandaAttiva?.id,
        prodotto_origine_id: prodottoOrigineId,
        prodotto_suggerito_id: prodottoSuggerito,
        esito, // 'accettato' | 'rifiutato'
        cameriere: cameriereAttivo?.nome || null,
        created_at: new Date().toISOString(),
      });
    } catch (_) { /* silent — tabella opzionale */ }
  }

  // ══════════════════════════════════════════
  // RIGHE + TOTALE
  // ══════════════════════════════════════════
  async function aggiornaTotale() {
    const totale = righeComanda
      .filter(r => r.stato !== 'annullato')
      .reduce((s, r) => s + (Number(r.prezzo_snapshot || 0) * Number(r.quantita || 1)), 0);
    await supa().from('comande').update({ totale }).eq('id', comandaAttiva.id);
    comandaAttiva.totale = totale;
  }

  function renderRighe() {
    const box = container.querySelector('#righe-comanda');
    const righeAttive = righeComanda.filter(r => r.stato !== 'annullato');
    if (!righeAttive.length) {
      box.innerHTML = `<div style="color:#94a3b8;text-align:center;padding:30px;font-size:13px;">Nessun prodotto aggiunto</div>`;
      return;
    }
    const statoColori = { 'in_attesa':'#64748b','in_preparazione':'#f59e0b','pronto':'#16a34a','servito':'#94a3b8' };
    const statoLabel = { 'in_attesa':'⏳','in_preparazione':'🔥','pronto':'✅','servito':'🍽️' };

    box.innerHTML = righeAttive.map(r => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #f1f5f9;" data-riga="${r.id}">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:500;color:#0f172a;">${esc(r.nome_snapshot)}</div>
          ${r.note ? `<div style="font-size:11px;color:#64748b;">${esc(r.note)}</div>` : ''}
          ${r.cameriere ? `<div style="font-size:10px;color:#94a3b8;">${esc(r.cameriere)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <button data-decr="${r.id}" style="width:24px;height:24px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;">−</button>
          <span style="min-width:20px;text-align:center;font-size:14px;font-weight:600;">${r.quantita}</span>
          <button data-incr="${r.id}" style="width:24px;height:24px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;">+</button>
        </div>
        <div style="font-size:13px;font-weight:600;color:#0E5A7A;min-width:52px;text-align:right;">
          €${(Number(r.prezzo_snapshot||0)*Number(r.quantita||1)).toFixed(2).replace('.',',')}
        </div>
        <span style="color:${statoColori[r.stato]||'#64748b'};font-size:16px;" title="${r.stato}">${statoLabel[r.stato]||'⏳'}</span>
        <button data-note-riga="${r.id}" style="background:#f1f5f9;border:none;border-radius:6px;padding:4px 6px;cursor:pointer;font-size:11px;">📝</button>
        <button data-annulla="${r.id}" style="background:#fee2e2;border:none;border-radius:6px;padding:4px 6px;cursor:pointer;font-size:11px;color:#dc2626;">✕</button>
      </div>
    `).join('');

    box.querySelectorAll('[data-incr]').forEach(btn => btn.onclick = () => cambiaQuantita(btn.dataset.incr, 1));
    box.querySelectorAll('[data-decr]').forEach(btn => btn.onclick = () => cambiaQuantita(btn.dataset.decr, -1));
    box.querySelectorAll('[data-annulla]').forEach(btn => btn.onclick = () => annullaRiga(btn.dataset.annulla));
    box.querySelectorAll('[data-note-riga]').forEach(btn => btn.onclick = () => aggiungiNoteRiga(btn.dataset.noteRiga));
  }

  function renderTotale() {
    const totale = righeComanda
      .filter(r => r.stato !== 'annullato')
      .reduce((s, r) => s + (Number(r.prezzo_snapshot||0) * Number(r.quantita||1)), 0);
    container.querySelector('#comanda-totale').textContent = `€ ${totale.toFixed(2).replace('.',',')}`;
  }

  async function cambiaQuantita(rigaId, delta) {
    const riga = righeComanda.find(r => String(r.id) === String(rigaId));
    if (!riga) return;
    const nuova = riga.quantita + delta;
    if (nuova <= 0) { annullaRiga(rigaId); return; }
    await supa().from('comanda_righe').update({ quantita: nuova }).eq('id', rigaId);
    riga.quantita = nuova;
    await aggiornaTotale(); renderRighe(); renderTotale();
  }

  async function annullaRiga(rigaId) {
    await supa().from('comanda_righe').update({ stato: 'annullato' }).eq('id', rigaId);
    const riga = righeComanda.find(r => String(r.id) === String(rigaId));
    if (riga) riga.stato = 'annullato';
    await aggiornaTotale(); renderRighe(); renderTotale();
  }

  async function aggiungiNoteRiga(rigaId) {
    const riga = righeComanda.find(r => String(r.id) === String(rigaId));
    if (!riga) return;
    const shortcut = ['senza sale','senza glutine','ben cotto','al sangue','senza cipolla','senza aglio','allergia frutta secca','piccante'];
    const scelta = prompt(
      'Note per questo piatto:\n\nShortcut: ' + shortcut.map((s,i) => (i+1)+'. '+s).join(' | ') + '\n\nScrivi numero o nota libera:',
      riga.note || ''
    );
    if (scelta === null) return;
    const num = parseInt(scelta);
    const nota = (!isNaN(num) && num >= 1 && num <= shortcut.length) ? shortcut[num-1] : scelta;
    await supa().from('comanda_righe').update({ note: nota }).eq('id', rigaId);
    riga.note = nota;
    renderRighe();
  }

  // ══════════════════════════════════════════
  // CROSS-SELL FINE PASTO
  // ══════════════════════════════════════════
  function checkCrossSell() {
    const haSecondo = righeComanda.some(r => {
      const p = prodottiVendita.find(x => String(x.id) === String(r.prodotto_vendita_id));
      const cat = categorieVendita.find(c => String(c.id) === String(p?.categoria_vendita_id));
      return cat && (cat.nome === 'Secondi piatti' || cat.nome === 'La Griglia');
    });
    if (!haSecondo) return;

    const box = container.querySelector('#crosssell-box');
    box.style.display = 'block';
    box.innerHTML = `
      <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Completa il pasto:</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${CROSS_SELL_FINE_PASTO.map(cs => {
          const catObj = categorieVendita.find(c => c.nome === cs.cat);
          if (!catObj) return '';
          return `<button data-cs="${catObj.id}" style="
            background:#f0fdf4;border:1px solid #86efac;border-radius:8px;
            padding:5px 10px;cursor:pointer;font-size:12px;
          ">${cs.msg}</button>`;
        }).join('')}
      </div>
    `;
    box.querySelectorAll('[data-cs]').forEach(btn => {
      btn.onclick = () => {
        categoriaSelezionata = btn.dataset.cs;
        renderCategorieTabs(); renderGrigliaProdotti();
      };
    });
  }

  // ══════════════════════════════════════════
  // INVIA CUCINA + PRECONTO + CHIUDI
  // ══════════════════════════════════════════
  async function inviaInCucina() {
    const righeNuove = righeComanda.filter(r => r.stato === 'in_attesa');
    if (!righeNuove.length) { mostraToast('Nessun prodotto da inviare', 'warning'); return; }
    for (const r of righeNuove) {
      await supa().from('comanda_righe').update({ stato: 'in_preparazione' }).eq('id', r.id);
      r.stato = 'in_preparazione';
    }
    await supa().from('comande').update({ stato: 'in_corso' }).eq('id', comandaAttiva.id);
    comandaAttiva.stato = 'in_corso';
    renderRighe();
    mostraToast(`✅ ${righeNuove.length} piatti inviati in cucina!`, 'success');
  }

  function mostraPreconto() {
    const righeAttive = righeComanda.filter(r => r.stato !== 'annullato');
    const totale = righeAttive.reduce((s, r) => s + (Number(r.prezzo_snapshot||0) * Number(r.quantita||1)), 0);
    const testo = righeAttive.map(r =>
      `${r.quantita}x ${r.nome_snapshot} — €${(Number(r.prezzo_snapshot||0)*Number(r.quantita||1)).toFixed(2)}`
    ).join('\n');
    alert(`📋 PRECONTO — ${container.querySelector('#comanda-tavolo-nome').textContent}\n\n${testo}\n\n──────────\nTOTALE: €${totale.toFixed(2)}`);
  }

  async function chiudiComanda() {
    if (!comandaAttiva) return;
    if (!confirm('Chiudere la comanda e liberare il tavolo?')) return;
    await supa().from('comande').update({
      stato: 'chiusa',
      chiusa_at: new Date().toISOString(),
      cameriere_chiusura: cameriereAttivo?.nome || null,
    }).eq('id', comandaAttiva.id);
    comande = comande.filter(c => String(c.id) !== String(comandaAttiva.id));
    comandaAttiva = null;
    righeComanda = [];
    switchView('tavoli');
    await loadComande();
    renderMapTavoli();
    mostraToast('Comanda chiusa ✓', 'success');
  }

  // ══════════════════════════════════════════
  // DISPLAY CUCINA
  // ══════════════════════════════════════════
  async function loadCucinaDisplay() {
    const { data: righeIn } = await supa().from('comanda_righe').select('*')
      .eq('azienda_id', aziendaId).eq('stato', 'in_preparazione').eq('stampante', 'cucina').order('created_at');
    const { data: righePronte } = await supa().from('comanda_righe').select('*')
      .eq('azienda_id', aziendaId).eq('stato', 'pronto').eq('stampante', 'cucina').order('created_at');

    const data = [...(righeIn||[]), ...(righePronte||[])];
    const comandaIds = [...new Set(data.map(r => r.comanda_id).filter(Boolean))];
    let tavoliMap = {};
    if (comandaIds.length) {
      const { data: comandeData } = await supa().from('comande').select('id, tavolo_id').in('id', comandaIds);
      const tavoloIds = [...new Set((comandeData||[]).map(c => c.tavolo_id).filter(Boolean))];
      if (tavoloIds.length) {
        const { data: tavoliData } = await supa().from('tavoli').select('id, nome').in('id', tavoloIds);
        const tavMap = {};
        (tavoliData||[]).forEach(t => tavMap[t.id] = t.nome);
        (comandeData||[]).forEach(c => tavoliMap[c.id] = tavMap[c.tavolo_id] || '?');
      }
    }

    const box = container.querySelector('#cucina-righe');
    if (!data?.length) { box.innerHTML = '<div style="color:#64748b;">Nessun ordine in cucina.</div>'; return; }

    box.innerHTML = data.map(r => `
      <div style="background:white;border-radius:12px;padding:14px;border-left:4px solid ${r.stato==='pronto'?'#16a34a':'#f59e0b'};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:15px;">${esc(r.nome_snapshot)}</strong>
          <span style="background:${r.stato==='pronto'?'#f0fdf4':'#fef3c7'};padding:3px 8px;border-radius:6px;font-size:12px;">
            ${r.stato === 'pronto' ? '✅ Pronto' : '🔥 In prep.'}
          </span>
        </div>
        <div style="font-size:13px;color:#64748b;">
          Tavolo: <strong>${tavoliMap[r.comanda_id] || '?'}</strong> — Qtà: <strong>${r.quantita}</strong>
          ${r.note ? `— Note: ${esc(r.note)}` : ''}
          ${r.cameriere ? `— ${esc(r.cameriere)}` : ''}
        </div>
        <div style="margin-top:8px;display:flex;gap:6px;">
          ${r.stato === 'in_preparazione' ? `
            <button data-pronto="${r.id}" style="background:#16a34a;color:white;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;">✅ Pronto</button>
          ` : `
            <button data-servito="${r.id}" style="background:#64748b;color:white;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;">🍽️ Servito</button>
          `}
        </div>
      </div>
    `).join('');

    box.querySelectorAll('[data-pronto]').forEach(btn => {
      btn.onclick = async () => { await supa().from('comanda_righe').update({ stato: 'pronto' }).eq('id', btn.dataset.pronto); loadCucinaDisplay(); };
    });
    box.querySelectorAll('[data-servito]').forEach(btn => {
      btn.onclick = async () => { await supa().from('comanda_righe').update({ stato: 'servito' }).eq('id', btn.dataset.servito); loadCucinaDisplay(); };
    });
  }

  // ══════════════════════════════════════════
  // CREA SALA / TAVOLO
  // ══════════════════════════════════════════
  async function creaNuovaSala() {
    if (cameriereAttivo?.ruolo !== 'manager' && cameriereAttivo?.ruolo !== 'full') {
      mostraToast('Solo manager e camerieri full possono creare sale', 'error'); return;
    }
    const nome = prompt('Nome sala (es. Interno, Terrazza, Privé):');
    if (!nome?.trim()) return;
    const { data } = await supa().from('sale').insert({ azienda_id: aziendaId, sede_id: sedeId, nome: nome.trim(), attiva: true }).select('*').single();
    if (data) { sale.push(data); renderSaleTabs(); }
  }

  async function creaNuovoTavolo() {
    if (cameriereAttivo?.ruolo !== 'manager' && cameriereAttivo?.ruolo !== 'full') {
      mostraToast('Solo manager e camerieri full possono creare tavoli', 'error'); return;
    }
    const nome = prompt('Numero/nome tavolo:');
    if (!nome?.trim()) return;
    const coperti = parseInt(prompt('Coperti massimi:', '4') || '4');
    const { data } = await supa().from('tavoli').insert({
      azienda_id: aziendaId, sede_id: sedeId,
      sala_id: salaSelezionata || sale[0]?.id || null,
      nome: nome.trim(), coperti_min: 1, coperti_max: coperti, attivo: true,
    }).select('*').single();
    if (data) { tavoli.push(data); renderMapTavoli(); }
  }

  // ══════════════════════════════════════════
  // SWITCH VIEW
  // ══════════════════════════════════════════
  function switchView(view) {
    viewMode = view;
    container.querySelector('#view-pin').style.display = view === 'pin' ? 'flex' : 'none';
    container.querySelector('#view-tavoli').style.display = view === 'tavoli' ? 'block' : 'none';
    container.querySelector('#view-comanda').style.display = view === 'comanda' ? 'flex' : 'none';
    container.querySelector('#view-cucina').style.display = view === 'cucina' ? 'block' : 'none';
  }

  // ══════════════════════════════════════════
  // TOAST NOTIFICATION
  // ══════════════════════════════════════════
  function mostraToast(msg, tipo = 'info') {
    const colori = { success: '#16a34a', error: '#dc2626', warning: '#f59e0b', info: '#0E5A7A' };
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:${colori[tipo]};color:white;padding:12px 24px;border-radius:12px;
      font-size:14px;font-weight:600;z-index:9999;
      box-shadow:0 4px 20px rgba(0,0,0,0.2);
      animation:fadeIn 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ══════════════════════════════════════════
  // BINDING EVENTI
  // ══════════════════════════════════════════
  container.querySelector('#btn-view-tavoli').onclick = () => {
    if (!cameriereAttivo) { switchView('pin'); return; }
    switchView('tavoli');
  };
  container.querySelector('#btn-view-cucina').onclick = () => {
    if (!cameriereAttivo) { switchView('pin'); return; }
    switchView('cucina'); loadCucinaDisplay();
  };
  container.querySelector('#btn-refresh').onclick = () => loadAll();
  container.querySelector('#btn-back-tavoli').onclick = () => switchView('tavoli');
  container.querySelector('#btn-invia-cucina').onclick = () => inviaInCucina();
  container.querySelector('#btn-preconto').onclick = () => mostraPreconto();
  container.querySelector('#btn-chiudi-comanda').onclick = () => chiudiComanda();
  container.querySelector('#btn-nuova-sala').onclick = () => creaNuovaSala();
  container.querySelector('#btn-nuovo-tavolo').onclick = () => creaNuovoTavolo();
  container.querySelector('#search-prodotto').addEventListener('input', e => renderGrigliaProdotti(e.target.value));

  setInterval(() => {
    if (viewMode === 'cucina') loadCucinaDisplay();
    else if (viewMode === 'tavoli') { loadComande().then(renderMapTavoli); }
  }, 30000);

  // ── Start: mostra PIN prima di tutto ──
  switchView('pin');
  await loadAll();
}

function esc(s) {
  return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
