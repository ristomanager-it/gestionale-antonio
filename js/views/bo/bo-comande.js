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

// ── Camerieri: caricati da DB (tabella dipendenti, campo pin) ──
// PIN 0000 è sempre admin locale come fallback
const ADMIN_PIN = { pin: '0000', nome: 'Admin', ruolo: 'manager', colore: '#dc2626' };
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
  // Aspetta auth prima di leggere il contesto
  const authOk = await waitForAuth();
  if (!authOk) {
    container.innerHTML = '<section class="view"><h2>Sessione non disponibile. Ricarica la pagina.</h2></section>';
    return;
  }

  // Aspetta che sedeAttiva sia disponibile (router può chiamare render prima del contesto)
  await (async () => {
    const start = Date.now();
    while (Date.now() - start < 4000) {
      if (window.state?.azienda?.id) return;
      await new Promise(r => setTimeout(r, 150));
    }
  })();

  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>';
    return;
  }

  // Leggi sedeId DOPO auth — così è sempre aggiornato
  let sedeId = window.state?.sedeAttiva?.id || null;

  // Nascondi footer globale — la comanda usa tutta l'altezza dello schermo
  const _footerEl = document.getElementById('footer-root');
  if (_footerEl) _footerEl.style.display = 'none';
  // Ripristina alla distruzione del componente (navigazione via hashchange)
  const _ripristinaFooter = () => { if (_footerEl) _footerEl.style.display = ''; };
  window.addEventListener('hashchange', _ripristinaFooter, { once: true });

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
  let uscitaCorrente = 1; // numero uscita attiva (1=prima uscita, 2=seconda, ecc.)

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
              <div id="badge-uscita" style="background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:5px 10px;font-size:12px;color:#374151;font-weight:600;white-space:nowrap;">🍽️ Uscita 1</div>
              <button id="btn-nuova-uscita" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:6px 12px;border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;">+ Nuova uscita</button>
              <button id="btn-invia-cucina" style="background:#16a34a;color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;">📤 Invia</button>
              <button id="btn-preconto" style="background:#f59e0b;color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;">🧾 Conto</button>
              <button id="btn-chiudi-comanda" style="background:#dc2626;color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;">✅ Chiudi</button>
            </div>
          </div>

          <div id="comanda-grid" style="flex:1;overflow:hidden;display:grid;grid-template-columns:1fr 340px;">
            <style>
              @media(max-width:700px){
                #comanda-grid { grid-template-columns:1fr!important; grid-template-rows:1fr auto; }
                #comanda-grid > div:first-child { border-right:none!important; border-bottom:1px solid #e5e7eb; min-height:0; }
                #comanda-grid > div:last-child { max-height:45vh; }
                #view-comanda > div:first-child { flex-wrap:wrap; gap:6px; }
                #view-comanda > div:first-child > div:last-child { flex-wrap:wrap; }
                #view-comanda > div:first-child > div:last-child button { padding:6px 10px!important; font-size:12px!important; }
              }
            </style>

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
    <div id="modal-apertura" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:flex-end;justify-content:center;padding-bottom:env(safe-area-inset-bottom);">
      <div style="background:white;border-radius:20px 20px 0 0;padding:24px 20px 32px;width:100%;max-width:480px;max-height:92vh;overflow-y:auto;box-shadow:0 -10px 40px rgba(0,0,0,0.2);">
        <div style="width:40px;height:4px;background:#e5e7eb;border-radius:2px;margin:0 auto 20px;"></div>
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

        <!-- Frase guida nominativo -->
        <div style="background:#f0f9ff;border-radius:12px;padding:12px 14px;margin-bottom:14px;border-left:3px solid #0E5A7A;">
          <div style="font-size:11px;font-weight:600;color:#0E5A7A;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">💬 Suggerisci al cliente</div>
          <div style="font-size:13px;color:#0f172a;font-style:italic;">"Benvenuti! Come posso intestare il tavolo?"</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;">Se preferisce non dirlo, va bene — procedi lo stesso.</div>
        </div>

        <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Nome <span style="font-weight:400;color:#94a3b8;">— opzionale</span></label>
        <input id="apertura-nominativo" class="input" placeholder="es. Rossi, Famiglia Bianchi..." style="width:100%;box-sizing:border-box;margin-bottom:10px;font-size:14px;padding:10px 12px;">

        <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Telefono <span style="font-weight:400;color:#94a3b8;">— opzionale</span></label>
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

    <!-- ── MODAL: Fidelity post-conto ── -->
    <div id="modal-fidelity" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1300;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:20px;padding:24px;width:min(440px,95vw);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:17px;font-weight:800;">🎁 Tessera Fidelity</div>
          <button id="fi-popup-chiudi" style="background:#f1f5f9;border:none;border-radius:10px;width:36px;height:36px;cursor:pointer;font-size:18px;">✕</button>
        </div>
        <div style="background:linear-gradient(135deg,#059669,#10b981);border-radius:14px;padding:16px;margin-bottom:16px;color:#fff;text-align:center;">
          <div style="font-size:24px;font-weight:800;" id="fi-popup-sconto">-10% SUBITO</div>
          <div style="font-size:13px;opacity:.9;margin-top:4px;">sul conto di oggi</div>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px;">Telefono cliente</div>
          <div style="display:flex;gap:8px;">
            <input id="fi-popup-tel" style="flex:1;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;outline:none;" placeholder="Es. 3391234567" type="tel">
            <button id="fi-popup-cerca" style="background:#0E5A7A;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;">🔍</button>
          </div>
          <div id="fi-popup-trovato" style="display:none;margin-top:8px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:10px;font-size:13px;"></div>
        </div>
        <div id="fi-popup-form-nuovo" style="display:none;margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px;">Nuovo cliente</div>
          <input id="fi-popup-nome" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;margin-bottom:8px;" placeholder="Nome *">
          <input id="fi-popup-cognome" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;" placeholder="Cognome">
        </div>
        <div id="fi-popup-calcolo" style="font-size:13px;color:#374151;background:#f8fafc;border-radius:10px;padding:10px;margin-bottom:12px;display:none;"></div>
        <div style="display:flex;gap:8px;">
          <button id="fi-popup-emetti" style="flex:1;background:#0E5A7A;color:#fff;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:800;cursor:pointer;">✅ Emetti e applica sconto</button>
          <button id="fi-popup-salta" style="background:#f1f5f9;color:#374151;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;">Salta</button>
        </div>
        <div id="fi-popup-msg" style="margin-top:10px;font-size:13px;text-align:center;"></div>
      </div>
    </div>

    <!-- ── MODAL: Chiusura conto ── -->
    <div id="modal-conto" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1100;align-items:center;justify-content:center;">
      <div style="background:white;border-radius:24px;width:480px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;">

        <!-- Header -->
        <div style="padding:24px 24px 16px;border-bottom:1px solid #f1f5f9;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;">🧾 Conto</div>
              <div id="conto-tavolo-info" style="font-size:13px;color:#64748b;margin-top:2px;"></div>
            </div>
            <button id="btn-conto-chiudi-x" style="background:#f1f5f9;border:none;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:18px;">✕</button>
          </div>
        </div>

        <!-- Tipo documento -->
        <div style="padding:0 24px 14px;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Tipo documento</div>
          <div style="display:flex;gap:8px;">
            <button data-doc="preconto"  style="flex:1;padding:9px 4px;border:2px solid #0E5A7A;border-radius:10px;background:#f0f9ff;cursor:pointer;font-size:12px;font-weight:600;color:#0E5A7A;">📋 Preconto</button>
            <button data-doc="scontrino" style="flex:1;padding:9px 4px;border:2px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;font-size:12px;font-weight:600;color:#374151;">🧾 Scontrino</button>
            <button data-doc="fattura"   style="flex:1;padding:9px 4px;border:2px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;font-size:12px;font-weight:600;color:#374151;">📄 Fattura</button>
          </div>
          <!-- Dati fattura -->
          <div id="fattura-box" style="display:none;margin-top:10px;">
            <input id="fattura-cf"  class="input" placeholder="CF / P.IVA *" style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:8px 12px;font-size:13px;">
            <input id="fattura-rag" class="input" placeholder="Ragione sociale / Nome" style="width:100%;box-sizing:border-box;padding:8px 12px;font-size:13px;">
          </div>
        </div>

        <!-- Righe editabili -->
        <div id="conto-righe" style="flex:1;overflow-y:auto;padding:16px 24px;"></div>

        <!-- Totale -->
        <div style="padding:16px 24px;border-top:1px solid #f1f5f9;background:#f8fafc;">
          <!-- Sezione PROMO -->
          <div id="conto-promo-box" style="margin-bottom:12px;">
            <div id="promo-applicata" style="display:none;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:10px 12px;margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:13px;font-weight:700;color:#065f46;" id="promo-nome"></div>
                  <div style="font-size:12px;color:#047857;" id="promo-sconto-txt"></div>
                </div>
                <button id="btn-promo-rimuovi" style="background:white;border:1px solid #a7f3d0;border-radius:8px;padding:4px 10px;font-size:12px;color:#065f46;cursor:pointer;">Rimuovi</button>
              </div>
            </div>
            <button id="btn-scansiona-promo" style="width:100%;padding:11px;border:2px dashed #cbd5e1;border-radius:12px;background:white;color:#475569;font-size:13px;font-weight:600;cursor:pointer;">📷 Scansiona promo del cliente</button>
            <div id="promo-stato" style="font-size:12px;color:#64748b;margin-top:6px;min-height:16px;text-align:center;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <div style="font-size:15px;color:#64748b;">Totale</div>
            <div style="font-size:28px;font-weight:800;color:#0E5A7A;" id="conto-totale-display">€ 0,00</div>
          </div>
          <button id="btn-apri-pagamento" style="width:100%;padding:15px;border:none;border-radius:14px;background:#0E5A7A;color:white;font-size:16px;font-weight:700;cursor:pointer;">💳 Paga →</button>
        </div>
      </div>
    </div>

    <!-- ── MODAL: Pagamento ── -->
    <div id="modal-pagamento" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1200;align-items:center;justify-content:center;">
      <div style="background:white;border-radius:24px;width:560px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.35);overflow:hidden;">

        <div style="padding:20px 24px 14px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:18px;font-weight:700;color:#0f172a;">💳 Pagamento</div>
          <button id="btn-pag-x" style="background:#f1f5f9;border:none;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:18px;">✕</button>
        </div>

        <!-- Come dividere -->
        <div style="padding:14px 24px;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Come dividere</div>
          <div style="display:flex;gap:8px;">
            <button data-divmod="unico"  style="flex:1;padding:9px;border:2px solid #0E5A7A;border-radius:10px;background:#f0f9ff;cursor:pointer;font-size:12px;font-weight:600;color:#0E5A7A;">👤 Conto unico</button>
            <button data-divmod="piatti" style="flex:1;padding:9px;border:2px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;font-size:12px;font-weight:600;color:#374151;">🍽️ Per piatto</button>
            <button data-divmod="romana" style="flex:1;padding:9px;border:2px solid #e5e7eb;border-radius:10px;background:white;cursor:pointer;font-size:12px;font-weight:600;color:#374151;">⚖️ Alla romana</button>
          </div>
        </div>

        <!-- Numero persone (hidden se unico) -->
        <div id="pag-persone-row" style="display:none;padding:12px 24px;border-bottom:1px solid #f1f5f9;align-items:center;gap:10px;">
          <div style="font-size:13px;color:#64748b;white-space:nowrap;">Persone:</div>
          <div style="display:flex;gap:6px;">
            ${[2,3,4,5,6,7,8].map(n => `<button data-np="${n}" style="width:36px;height:36px;border-radius:9px;border:2px solid #e5e7eb;background:white;font-size:14px;font-weight:700;cursor:pointer;color:#374151;">${n}</button>`).join('')}
          </div>
        </div>

        <!-- Contenuto (divisione + metodi) -->
        <div id="pag-contenuto" style="flex:1;overflow-y:auto;padding:16px 24px;"></div>

        <!-- Footer -->
        <div style="padding:16px 24px;border-top:1px solid #f1f5f9;background:#f8fafc;display:flex;gap:10px;">
          <button id="btn-pag-indietro" style="flex:1;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:white;cursor:pointer;font-size:14px;">← Conto</button>
          <button id="btn-pag-conferma" style="flex:2;padding:12px;border:none;border-radius:12px;background:#16a34a;color:white;cursor:pointer;font-size:15px;font-weight:700;">✅ Chiudi tavolo</button>
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
  // PIN LOGIC — carica camerieri da DB
  // ══════════════════════════════════════════
  let pinInput = '';
  let camerieriDB = []; // caricati da dipendenti

  async function loadCamerieri() {
    try {
      // I PIN operativi sono nella tabella dipendenti.
      // La tabella profili non contiene azienda_id/ruolo, quindi non va usata qui.
      const { data, error } = await supa()
        .from('dipendenti')
        .select('id, nome, cognome, pin, ruolo, azienda_id, sede_id, attivo')
        .eq('azienda_id', aziendaId)
        .eq('attivo', true)
        .not('pin', 'is', null);

      if (error) {
        console.warn('Caricamento camerieri fallito:', error);
        camerieriDB = [];
        return;
      }

      camerieriDB = (data || []).map(d => ({
        pin: String(d.pin || ''),
        nome: [d.nome, d.cognome].filter(Boolean).join(' ') || d.nome || 'Cameriere',
        ruolo: d.ruolo === 'admin' || d.ruolo === 'manager'
          ? 'manager'
          : d.ruolo === 'limited'
            ? 'limited'
            : 'full',
        colore: '#0E5A7A',
        dipendenteId: d.id,
      }));
    } catch (e) {
      console.warn('Caricamento camerieri fallito, uso solo admin:', e);
      camerieriDB = [];
    }
  }

  function renderPinDisplay() {
    const el = container.querySelector('#pin-display');
    if (!el) return;
    const filled = pinInput.length;
    el.textContent = '●'.repeat(filled) + '_'.repeat(Math.max(0, 4 - filled));
  }

  function verificaPin(pin) {
    // PIN 0000 = admin sempre disponibile
    if (pin === ADMIN_PIN.pin) return ADMIN_PIN;
    return camerieriDB.find(c => c.pin === pin) || null;
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
      loadCamerieri(),
    ]);
    renderSaleTabs();
    renderMapTavoli();
  }

  async function loadSale() {
    try {
      let q = supa().from('sale').select('*').eq('azienda_id', aziendaId);
      if (sedeId) q = q.eq('sede_id', sedeId);
      const { data } = await q.order('nome');
      sale = data || [];
    } catch(e) { console.warn('loadSale:', e); }
  }

  async function loadTavoli() {
    try {
      let q = supa().from('tavoli').select('*').eq('azienda_id', aziendaId);
      if (sedeId) q = q.eq('sede_id', sedeId);
      if (salaSelezionata) q = q.eq('sala_id', salaSelezionata);
      const { data } = await q.order('nome');
      tavoli = data || [];
    } catch(e) { console.warn('loadTavoli:', e); }
  }

  async function loadComande() {
    try {
      const { data, error } = await supa()
        .from('comande').select('*')
        .eq('azienda_id', aziendaId)
        .neq('stato', 'chiusa')
        .order('created_at', { ascending: false });
      if (error) { console.warn('loadComande error:', error.message); comande = []; return; }
      comande = data || [];
    } catch(e) { console.warn('loadComande:', e); comande = []; }
  }

  async function loadProdotti() {
    let q = supa().from('prodotti_vendita').select('*').eq('azienda_id', aziendaId);
    if (sedeId) q = q.eq('sede_id', sedeId);
    const { data } = await q.order('nome');
    // Fallback: se la sede non ha prodotti propri, carica quelli azienda-wide
    if (sedeId && (!data || !data.length)) {
      const { data: fallback } = await supa()
        .from('prodotti_vendita')
        .select('*')
        .eq('azienda_id', aziendaId)
        .order('nome');
      prodottiVendita = fallback || [];
    } else {
      prodottiVendita = data || [];
    }
  }

  async function loadCategorie() {
    let q = supa().from('categorie_vendita').select('*').eq('azienda_id', aziendaId);
    if (sedeId) q = q.eq('sede_id', sedeId);
    const { data } = await q.order('nome');
    // Fallback: se la sede non ha categorie proprie, carica quelle azienda-wide
    if (sedeId && (!data || !data.length)) {
      const { data: fallback } = await supa()
        .from('categorie_vendita')
        .select('*')
        .eq('azienda_id', aziendaId)
        .order('nome');
      categorieVendita = fallback || [];
    } else {
      categorieVendita = data || [];
    }
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

      // Costruisco il record base — senza colonne opzionali che potrebbero non esistere
      const nuovaComanda = {
        azienda_id: aziendaId,
        sede_id: sedeId,
        tavolo_id: tavoloId,
        stato: 'aperta',
        totale: 0,
        coperti: opzioni.coperti || prenotazione?.coperti || tavolo.coperti_min || 1,
        prenotazione_id: prenotazione?.id || null,
        cliente_id: prenotazione?.cliente_id || null,
      };

      // Colonne opzionali: le aggiungo solo se il valore esiste
      // (se la colonna non c'è in DB, Supabase le ignora silenziosamente
      //  solo se non è dichiarata NOT NULL — altrimenti va in errore)
      if (opzioni.nominativo || prenotazione?.cliente_nome)
        nuovaComanda.cliente_nome = opzioni.nominativo || prenotazione?.cliente_nome;
      if (opzioni.telefono)
        nuovaComanda.note = `Tel: ${opzioni.telefono}`;
      if (cameriereAttivo?.nome)
        nuovaComanda.cameriere_apertura = cameriereAttivo.nome;

      const { data, error } = await supa().from('comande').insert(nuovaComanda).select('*').single();

      if (error) { mostraToast('Errore apertura comanda: ' + error.message, 'error'); return; }
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

    uscitaCorrente = 1;
    aggiornaLabelUscita();
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

    box.innerHTML = list.map(p => {
      const esaurito = p.disponibile === false;
      const pochePortate = !esaurito && p.porzioni_disponibili != null && p.porzioni_disponibili <= 3 && p.porzioni_disponibili > 0;
      return `
        <button data-prodotto="${p.id}" ${esaurito ? 'disabled' : ''} style="
          background:${esaurito ? '#f8fafc' : 'white'};
          border:1px solid ${esaurito ? '#e5e7eb' : pochePortate ? '#f59e0b' : '#e5e7eb'};
          border-radius:12px;padding:12px 8px;cursor:${esaurito ? 'default' : 'pointer'};text-align:center;
          display:flex;flex-direction:column;align-items:center;gap:6px;
          transition:background 0.1s;position:relative;
          ${esaurito ? 'opacity:0.55;' : ''}
        ">
          ${esaurito ? `<div style="position:absolute;top:6px;right:6px;background:#ef4444;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px;letter-spacing:0.3px;">ESAURITO</div>` : ''}
          ${pochePortate ? `<div style="position:absolute;top:6px;right:6px;background:#f59e0b;color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px;">ULTIME ${p.porzioni_disponibili}</div>` : ''}
          ${p.foto_url ? `<img src="${p.foto_url}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;${esaurito?'filter:grayscale(1);':''}">` : `<div style="font-size:32px;${esaurito?'filter:grayscale(1);opacity:0.5;':''}">🍽️</div>`}
          <div style="font-size:12px;font-weight:600;line-height:1.3;color:${esaurito?'#94a3b8':'#0f172a'};">${esc(p.nome)}</div>
          <div style="font-size:13px;color:${esaurito?'#94a3b8':'#0E5A7A'};font-weight:700;">€${Number(p.prezzo_base||0).toFixed(2).replace('.',',')}</div>
        </button>
      `;
    }).join('');

    box.querySelectorAll('[data-prodotto]').forEach(btn => {
      btn.onclick = () => aggiungiProdotto(btn.dataset.prodotto);
    });
  }

  // ══════════════════════════════════════════
  // AGGIUNGI PRODOTTO + SCARICO MAGAZZINO + MODAL UPSELL
  // ══════════════════════════════════════════
  async function aggiungiProdotto(prodottoId, pesoKg = null, skipUpsell = false) {
    if (!comandaAttiva) return;
    const prodotto = prodottiVendita.find(p => String(p.id) === String(prodottoId));
    if (!prodotto) return;

    // Blocca se esaurito (doppio check lato client)
    if (prodotto.disponibile === false) {
      mostraToast(`❌ ${prodotto.nome} è esaurito`, 'error');
      return;
    }

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
        cameriere: cameriereAttivo?.nome || null,
        uscita_numero: uscitaCorrente,
      }).select('*').single();

      if (!error && data) righeComanda.push(data);
    }

    // ── SCARICO MAGAZZINO IN TEMPO REALE ──
    await scaricoMagazzino(prodotto, pesoKg);

    await aggiornaTotale();
    renderRighe();
    renderTotale();
    renderGrigliaProdotti(container.querySelector('#search-prodotto')?.value || '');

    if (!skipUpsell) mostraModalUpsell(prodotto);
    checkCrossSell();
  }

  // ── Scarico magazzino al tap ──
  async function scaricoMagazzino(prodotto, pesoKg = null) {
    try {
      // Scarico non bloccante.
      // Nel DB attuale non esiste la tabella public.giacenze e alcune ricette non sono collegate ai prodotti vendita.
      // Per evitare errori in sala, qui scaliamo solo porzioni_disponibili quando il prodotto le usa.
      if (prodotto.porzioni_disponibili == null) return;

      const nuovePorzioni = Math.max(0, (prodotto.porzioni_disponibili || 0) - 1);
      const esaurito = nuovePorzioni === 0;

      const { error } = await supa().from('prodotti_vendita')
        .update({
          porzioni_disponibili: nuovePorzioni,
          disponibile: !esaurito,
        })
        .eq('id', prodotto.id);

      if (error) {
        console.warn('Aggiornamento porzioni fallito:', error);
        return;
      }

      prodotto.porzioni_disponibili = nuovePorzioni;
      prodotto.disponibile = !esaurito;

      if (esaurito) {
        mostraToast(`⚠️ ${prodotto.nome} — ultima porzione! Ora esaurito.`, 'warning');
      } else if (nuovePorzioni <= 3) {
        mostraToast(`⚠️ ${prodotto.nome} — rimangono solo ${nuovePorzioni} porzioni`, 'warning');
      }
    } catch (err) {
      console.warn('Scarico magazzino warning:', err);
    }
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
          await tracciaSuggerimento(prodotto.id, btn.dataset.upsellProd, 'accettato');
          chiudiModalUpsell();
          await aggiungiProdotto(btn.dataset.upsellProd, null, true); // skipUpsell=true evita loop
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

    if (!comandaAttiva?.id) {
      return totale;
    }

    const { error } = await supa()
      .from('comande')
      .update({ totale })
      .eq('id', comandaAttiva.id);

    if (error) {
      console.warn('aggiornaTotale error:', error);
      return totale;
    }

    comandaAttiva.totale = totale;
    return totale;
  }

  const COLORI_USCITA = ['#0E5A7A','#7c3aed','#16a34a','#dc2626','#f59e0b','#0891b2','#be185d'];

  function renderRighe() {
    const box = container.querySelector('#righe-comanda');
    const righeAttive = righeComanda.filter(r => r.stato !== 'annullato');
    if (!righeAttive.length) {
      box.innerHTML = `<div style="color:#94a3b8;text-align:center;padding:30px;font-size:13px;">Nessun prodotto aggiunto</div>`;
      return;
    }
    const statoColori = { 'in_attesa':'#64748b','in_preparazione':'#f59e0b','pronto':'#16a34a','servito':'#94a3b8' };
    const statoLabel  = { 'in_attesa':'⏳','in_preparazione':'🔥','pronto':'✅','servito':'🍽️' };

    // Raggruppa per uscita
    const uscite = {};
    righeAttive.forEach(r => {
      const u = r.uscita_numero || 1;
      if (!uscite[u]) uscite[u] = [];
      uscite[u].push(r);
    });

    box.innerHTML = Object.entries(uscite)
      .sort(([a],[b]) => +a - +b)
      .map(([uscita, righe]) => {
        const u = +uscita;
        const colore = COLORI_USCITA[(u-1) % COLORI_USCITA.length];
        const isCorrente = u === uscitaCorrente;
        return `
          <div style="border-left:3px solid ${colore};margin-bottom:4px;">
            <div style="padding:4px 8px;background:${colore}10;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:11px;font-weight:700;color:${colore};text-transform:uppercase;letter-spacing:0.5px;">
                🍽️ ${u === 1 ? 'Prima uscita' : u === 2 ? 'Seconda uscita' : u === 3 ? 'Terza uscita' : `Uscita ${u}`}
                ${isCorrente ? '<span style="background:'+colore+';color:white;border-radius:4px;padding:1px 6px;font-size:10px;margin-left:6px;">ATTIVA</span>' : ''}
              </span>
            </div>
            ${righe.map(r => `
              <div style="display:flex;align-items:center;gap:8px;padding:8px 8px 8px 10px;border-bottom:1px solid #f1f5f9;" data-riga="${r.id}">
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
            `).join('')}
          </div>
        `;
      }).join('');

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

    const nuova = Number(riga.quantita || 1) + delta;
    if (nuova <= 0) {
      await annullaRiga(rigaId);
      return;
    }

    const { error } = await supa()
      .from('comanda_righe')
      .update({ quantita: nuova })
      .eq('id', rigaId);

    if (error) {
      mostraToast('Errore aggiornamento quantità: ' + error.message, 'error');
      return;
    }

    riga.quantita = nuova;
    await aggiornaTotale();
    renderRighe();
    renderTotale();
  }

  async function annullaRiga(rigaId) {
    const { error } = await supa()
      .from('comanda_righe')
      .update({ stato: 'annullato' })
      .eq('id', rigaId);

    if (error) {
      mostraToast('Errore eliminazione portata: ' + error.message, 'error');
      return;
    }

    const riga = righeComanda.find(r => String(r.id) === String(rigaId));
    if (riga) riga.stato = 'annullato';

    await aggiornaTotale();
    renderRighe();
    renderTotale();
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
  function aggiornaLabelUscita() {
    const badge = container.querySelector('#badge-uscita');
    if (badge) {
      const labels = ['Prima','Seconda','Terza','Quarta','Quinta','Sesta','Settima','Ottava'];
      const label = labels[uscitaCorrente-1] || `Uscita ${uscitaCorrente}`;
      badge.textContent = `🍽️ ${label} uscita`;
    }
  }

  async function inviaInCucina() {
    // Invia solo le righe in_attesa dell'uscita corrente
    const righeNuove = righeComanda.filter(r => r.stato === 'in_attesa' && (r.uscita_numero||1) === uscitaCorrente);
    if (!righeNuove.length) {
      mostraToast(`Nessun prodotto in attesa per l'uscita ${uscitaCorrente}`, 'warning');
      return;
    }
    for (const r of righeNuove) {
      await supa().from('comanda_righe').update({ stato: 'in_preparazione' }).eq('id', r.id);
      r.stato = 'in_preparazione';
    }
    await supa().from('comande').update({ stato: 'in_corso' }).eq('id', comandaAttiva.id);
    comandaAttiva.stato = 'in_corso';
    renderRighe();
    const labels = ['prima','seconda','terza','quarta','quinta'];
    const label = labels[uscitaCorrente-1] || `uscita ${uscitaCorrente}`;
    mostraToast(`✅ ${righeNuove.length} piatti inviati — ${label} uscita!`, 'success');
  }

  function nuovaUscita() {
    // Verifica che ci siano righe nell'uscita corrente già inviate o almeno una
    const righeUscita = righeComanda.filter(r => r.stato !== 'annullato' && (r.uscita_numero||1) === uscitaCorrente);
    if (!righeUscita.length) {
      mostraToast(`Aggiungi almeno un prodotto all'uscita ${uscitaCorrente} prima di crearne una nuova`, 'warning');
      return;
    }
    uscitaCorrente++;
    aggiornaLabelUscita();
    renderRighe();
    const labels = ['Prima','Seconda','Terza','Quarta','Quinta'];
    const label = labels[uscitaCorrente-1] || `Uscita ${uscitaCorrente}`;
    mostraToast(`🍽️ ${label} uscita attiva — aggiungi i prossimi piatti`, 'info');
  }

  // ══════════════════════════════════════════
  // MODAL CONTO — tipo documento + righe editabili
  // ══════════════════════════════════════════
  let _tipoDoc = 'preconto';
  let _righeContoLocali = [];

  function mostraPreconto() { apriModalConto(); }
  function chiudiComanda()   { apriModalConto(); }

  function chiudiModalConto() {
    const modalConto = container.querySelector('#modal-conto');
    if (modalConto) modalConto.style.display = 'none';

    const modalPagamento = container.querySelector('#modal-pagamento');
    if (modalPagamento) modalPagamento.style.display = 'none';
  }

  function apriModalConto() {
    // Aggiorna schermo cliente con righe correnti
    const righeAttive = righeComanda.filter(r => r.stato !== 'annullato');
    const totConto = righeAttive.reduce((s,r) => s + (Number(r.prezzo_snapshot||0)*Number(r.quantita||1)), 0);
    const nomeTavolo = comandaAttiva?.tavolo_nome || comandaAttiva?.tavolo_id || null;
    aggiornaCassaDisplay('aperta', righeAttive, totConto, nomeTavolo, null);
    if (!comandaAttiva) return;
    _righeContoLocali = righeComanda.filter(r => r.stato !== 'annullato').map(r => ({ ...r }));
    _tipoDoc = 'preconto';
    aggiornaTipoDocBtns();

    const tavolo = tavoli.find(t => String(t.id) === String(comandaAttiva.tavolo_id));
    container.querySelector('#conto-tavolo-info').textContent =
      [tavolo?.nome, comandaAttiva.cliente_nome, comandaAttiva.coperti ? `${comandaAttiva.coperti} coperti` : null]
        .filter(Boolean).join(' · ');

    renderContoRighe();
    aggiornaContoTotale();
    // Reset e collegamento sezione promo
    _promoApplicata = null;
    if (_promoPollTimer) clearInterval(_promoPollTimer);
    renderPromoApplicata();
    const stp = container.querySelector('#promo-stato'); if (stp) stp.textContent = '';
    const btnScan = container.querySelector('#btn-scansiona-promo');
    if (btnScan) btnScan.onclick = () => richiediScannerPromo();
    const btnRim = container.querySelector('#btn-promo-rimuovi');
    if (btnRim) btnRim.onclick = () => rimuoviPromo();
    container.querySelector('#modal-conto').style.display = 'flex';
  }

  function aggiornaTipoDocBtns() {
    container.querySelectorAll('[data-doc]').forEach(btn => {
      const att = btn.dataset.doc === _tipoDoc;
      btn.style.background   = att ? '#f0f9ff' : 'white';
      btn.style.borderColor  = att ? '#0E5A7A' : '#e5e7eb';
      btn.style.color        = att ? '#0E5A7A' : '#374151';
    });
    container.querySelector('#fattura-box').style.display = _tipoDoc === 'fattura' ? 'block' : 'none';
  }

  container.querySelectorAll('[data-doc]').forEach(btn => {
    btn.onclick = () => { _tipoDoc = btn.dataset.doc; aggiornaTipoDocBtns(); };
  });

  container.querySelector('#btn-conto-chiudi-x').onclick = () => {
    container.querySelector('#modal-conto').style.display = 'none';
  };

  function renderContoRighe() {
    const box = container.querySelector('#conto-righe');
    if (!_righeContoLocali.length) {
      box.innerHTML = `<div style="color:#94a3b8;text-align:center;padding:20px;">Nessun prodotto</div>`;
      return;
    }
    box.innerHTML = _righeContoLocali.map((r, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:500;color:#0f172a;">${esc(r.nome_snapshot)}</div>
          ${r.note ? `<div style="font-size:11px;color:#94a3b8;">${esc(r.note)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button data-conto-decr="${i}" style="width:28px;height:28px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-size:15px;color:#374151;">−</button>
          <span style="min-width:22px;text-align:center;font-size:15px;font-weight:700;">${r.quantita}</span>
          <button data-conto-incr="${i}" style="width:28px;height:28px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-size:15px;color:#374151;">+</button>
        </div>
        <div style="font-size:15px;font-weight:700;color:#0E5A7A;min-width:64px;text-align:right;">
          €${(Number(r.prezzo_snapshot||0)*Number(r.quantita||1)).toFixed(2).replace('.',',')}
        </div>
        <button data-conto-rm="${i}" style="background:#fee2e2;border:none;border-radius:8px;padding:5px 8px;cursor:pointer;font-size:12px;color:#dc2626;" title="Rimuovi">✕</button>
      </div>
    `).join('');

    box.querySelectorAll('[data-conto-incr]').forEach(btn => {
      btn.onclick = () => { _righeContoLocali[+btn.dataset.contoIncr].quantita++; renderContoRighe(); aggiornaContoTotale(); };
    });
    box.querySelectorAll('[data-conto-decr]').forEach(btn => {
      btn.onclick = () => {
        const i = +btn.dataset.contoDecr;
        if (_righeContoLocali[i].quantita <= 1) _righeContoLocali.splice(i, 1);
        else _righeContoLocali[i].quantita--;
        renderContoRighe(); aggiornaContoTotale();
      };
    });
    box.querySelectorAll('[data-conto-rm]').forEach(btn => {
      btn.onclick = () => { _righeContoLocali.splice(+btn.dataset.contoRm, 1); renderContoRighe(); aggiornaContoTotale(); };
    });
  }

  function aggiornaContoTotale() {
    const base = _righeContoLocali.reduce((s, r) => s + (Number(r.prezzo_snapshot||0) * Number(r.quantita||1)), 0);
    const sconto = _promoApplicata ? Number(_promoApplicata.sconto||0) : 0;
    const tot = Math.max(0, Math.round((base - sconto)*100)/100);
    container.querySelector('#conto-totale-display').textContent = `€ ${tot.toFixed(2).replace('.',',')}`;
    return tot;
  }
  // Totale lordo (senza promo) — base per calcolare lo sconto
  function totaleContoLordo() {
    return _righeContoLocali.reduce((s, r) => s + (Number(r.prezzo_snapshot||0) * Number(r.quantita||1)), 0);
  }

  container.querySelector('#btn-apri-pagamento').onclick = () => {
    if (_tipoDoc === 'fattura' && !container.querySelector('#fattura-cf').value.trim()) {
      mostraToast('Inserisci CF/P.IVA per la fattura', 'warning'); return;
    }
    container.querySelector('#modal-conto').style.display = 'none';
    apriModalPagamento();
  };

  // ══════════════════════════════════════════
  // MODAL PAGAMENTO — divisione + metodi misti per persona
  // ══════════════════════════════════════════
  const COLORI_PERSONE = ['#0E5A7A','#7c3aed','#16a34a','#dc2626','#f59e0b','#0891b2','#be185d','#4f46e5'];
  const METODI_PAGA = [
    { id: 'contanti', label: '💵 Contanti', color: '#16a34a' },
    { id: 'carta',    label: '💳 Carta',    color: '#3b82f6' },
    { id: 'bonifico', label: '🏦 Bonifico', color: '#8b5cf6' },
    { id: 'addebito', label: '🏨 Addebito', color: '#f59e0b' },
  ];

  let _divMode    = 'unico';
  let _divPersone = 2;
  let _divAssegnazioni = {}; // rigaIdx → personaIdx (mode piatti)
  let _divMetodi  = {};      // personaIdx → { metodo, ricevuto, riferimento }

  function apriModalPagamento() {
    _divMode = 'unico';
    _divPersone = comandaAttiva?.coperti || 2;
    _divAssegnazioni = {};
    _divMetodi = {};
    aggiornaDivModeBtns();
    aggiornaDivPersoneBtns();
    container.querySelector('#pag-persone-row').style.display = 'none';
    renderPagContenuto();
    container.querySelector('#modal-pagamento').style.display = 'flex';
  }

  function aggiornaDivModeBtns() {
    container.querySelectorAll('[data-divmod]').forEach(btn => {
      const att = btn.dataset.divmod === _divMode;
      btn.style.background  = att ? '#f0f9ff' : 'white';
      btn.style.borderColor = att ? '#0E5A7A' : '#e5e7eb';
      btn.style.color       = att ? '#0E5A7A' : '#374151';
    });
  }

  function aggiornaDivPersoneBtns() {
    container.querySelectorAll('[data-np]').forEach(btn => {
      const att = +btn.dataset.np === _divPersone;
      btn.style.background  = att ? '#0E5A7A' : 'white';
      btn.style.color       = att ? 'white'   : '#374151';
      btn.style.borderColor = att ? '#0E5A7A' : '#e5e7eb';
    });
  }

  container.querySelectorAll('[data-divmod]').forEach(btn => {
    btn.onclick = () => {
      _divMode = btn.dataset.divmod;
      _divAssegnazioni = {}; _divMetodi = {};
      aggiornaDivModeBtns();
      container.querySelector('#pag-persone-row').style.display = _divMode === 'unico' ? 'none' : 'flex';
      renderPagContenuto();
    };
  });

  container.querySelectorAll('[data-np]').forEach(btn => {
    btn.onclick = () => {
      _divPersone = +btn.dataset.np;
      _divAssegnazioni = {}; _divMetodi = {};
      aggiornaDivPersoneBtns(); renderPagContenuto();
    };
  });

  function totPerPersona() {
    const tot = _righeContoLocali.reduce((s, r) => s + (Number(r.prezzo_snapshot||0)*Number(r.quantita||1)), 0);
    if (_divMode === 'unico') return [tot];
    if (_divMode === 'romana') return Array(_divPersone).fill(parseFloat((tot/_divPersone).toFixed(2)));
    // per piatto
    const arr = Array(_divPersone).fill(0);
    _righeContoLocali.forEach((r, i) => {
      const p = _divAssegnazioni[i];
      if (p != null) arr[p] += Number(r.prezzo_snapshot||0) * Number(r.quantita||1);
    });
    return arr;
  }

  function renderMetodoPagamento(personaIdx, tot) {
    const sel = _divMetodi[personaIdx] || {};
    return `
      <div style="margin-top:10px;">
        <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Come paga</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${METODI_PAGA.map(m => `
            <button data-met="${m.id}" data-mp="${personaIdx}" style="
              padding:7px 12px;border:2px solid ${sel.metodo===m.id ? m.color : '#e5e7eb'};
              border-radius:9px;background:${sel.metodo===m.id ? m.color+'18' : 'white'};
              cursor:pointer;font-size:12px;font-weight:600;color:${sel.metodo===m.id ? m.color : '#374151'};
            ">${m.label}</button>
          `).join('')}
        </div>
        ${sel.metodo === 'contanti' ? `
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <span style="font-size:13px;color:#64748b;white-space:nowrap;">Ricevuto €</span>
            <input data-ric="${personaIdx}" type="number" step="0.50" value="${sel.ricevuto||''}" placeholder="0,00"
              style="flex:1;padding:7px 10px;border:1px solid #e5e7eb;border-radius:9px;font-size:15px;font-weight:700;text-align:right;">
            <span style="font-size:13px;color:#64748b;white-space:nowrap;">Resto:</span>
            <strong style="font-size:16px;min-width:56px;text-align:right;color:${(sel.ricevuto||0)>=tot?'#16a34a':'#dc2626'};">
              €${Math.max(0,((sel.ricevuto||0)-tot)).toFixed(2).replace('.',',')}
            </strong>
          </div>
        ` : ''}
        ${sel.metodo === 'addebito' ? `
          <input data-add="${personaIdx}" class="input" placeholder="Nome / Stanza / Riferimento azienda"
            value="${sel.riferimento||''}"
            style="width:100%;box-sizing:border-box;margin-top:8px;padding:8px 12px;font-size:13px;">
        ` : ''}
      </div>
    `;
  }

  function renderPagContenuto() {
    const box = container.querySelector('#pag-contenuto');
    const tots = totPerPersona();

    if (_divMode === 'unico') {
      box.innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-size:36px;font-weight:800;color:#0E5A7A;">€${tots[0].toFixed(2).replace('.',',')}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">Totale</div>
        </div>
        ${renderMetodoPagamento(0, tots[0])}
      `;
    } else if (_divMode === 'romana') {
      box.innerHTML = `
        <div style="text-align:center;margin-bottom:12px;font-size:13px;color:#64748b;">
          €${tots.reduce((a,b)=>a+b,0).toFixed(2)} ÷ ${_divPersone} =
          <strong style="color:#0E5A7A;">€${tots[0].toFixed(2)} a testa</strong>
        </div>
        ${Array.from({length:_divPersone},(_,p) => `
          <div style="background:#f8fafc;border-radius:14px;padding:14px;margin-bottom:10px;border-left:4px solid ${COLORI_PERSONE[p%COLORI_PERSONE.length]};">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:14px;font-weight:600;color:${COLORI_PERSONE[p%COLORI_PERSONE.length]};">👤 Persona ${p+1}</div>
              <div style="font-size:20px;font-weight:800;">€${tots[p].toFixed(2).replace('.',',')}</div>
            </div>
            ${renderMetodoPagamento(p, tots[p])}
          </div>
        `).join('')}
      `;
    } else {
      // Per piatto
      const nonAss = _righeContoLocali
        .filter((_,i) => _divAssegnazioni[i] == null)
        .reduce((s,r) => s+(Number(r.prezzo_snapshot||0)*Number(r.quantita||1)), 0);

      box.innerHTML = `
        <div style="font-size:12px;color:#64748b;margin-bottom:10px;">Tocca il numero per assegnare ogni piatto a una persona.</div>
        ${_righeContoLocali.map((r,i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9;">
            <div style="flex:1;min-width:0;font-size:13px;font-weight:500;">
              ${esc(r.nome_snapshot)}
              <span style="color:#94a3b8;font-weight:400;"> ×${r.quantita} — €${(Number(r.prezzo_snapshot||0)*r.quantita).toFixed(2)}</span>
            </div>
            <div style="display:flex;gap:4px;">
              ${Array.from({length:_divPersone},(_,p) => `
                <button data-ar="${i}" data-ap="${p}" style="
                  width:30px;height:30px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;
                  border:2px solid ${_divAssegnazioni[i]===p ? COLORI_PERSONE[p%COLORI_PERSONE.length] : '#e5e7eb'};
                  background:${_divAssegnazioni[i]===p ? COLORI_PERSONE[p%COLORI_PERSONE.length] : 'white'};
                  color:${_divAssegnazioni[i]===p ? 'white' : '#374151'};
                ">${p+1}</button>
              `).join('')}
            </div>
          </div>
        `).join('')}
        ${nonAss > 0 ? `<div style="padding:10px;background:#fef3c7;border-radius:10px;margin-top:10px;font-size:13px;color:#92400e;">⚠️ Non assegnato: €${nonAss.toFixed(2)}</div>` : ''}
        ${Array.from({length:_divPersone},(_,p) => tots[p] > 0 ? `
          <div style="background:#f8fafc;border-radius:14px;padding:14px;margin-top:10px;border-left:4px solid ${COLORI_PERSONE[p%COLORI_PERSONE.length]};">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:13px;font-weight:600;color:${COLORI_PERSONE[p%COLORI_PERSONE.length]};">👤 Persona ${p+1}</div>
              <div style="font-size:18px;font-weight:800;">€${tots[p].toFixed(2).replace('.',',')}</div>
            </div>
            ${renderMetodoPagamento(p, tots[p])}
          </div>
        ` : '').join('')}
      `;
    }

    // Binding metodi
    box.querySelectorAll('[data-met]').forEach(btn => {
      btn.onclick = () => {
        const p = +btn.dataset.mp;
        if (!_divMetodi[p]) _divMetodi[p] = {};
        _divMetodi[p].metodo = btn.dataset.met;
        _divMetodi[p].ricevuto = 0; _divMetodi[p].riferimento = '';
        renderPagContenuto();
      };
    });
    box.querySelectorAll('[data-ric]').forEach(inp => {
      inp.oninput = () => {
        const p = +inp.dataset.ric;
        if (!_divMetodi[p]) _divMetodi[p] = {};
        _divMetodi[p].ricevuto = parseFloat(inp.value) || 0;
        renderPagContenuto();
      };
    });
    box.querySelectorAll('[data-add]').forEach(inp => {
      inp.oninput = () => {
        const p = +inp.dataset.add;
        if (!_divMetodi[p]) _divMetodi[p] = {};
        _divMetodi[p].riferimento = inp.value;
      };
    });
    box.querySelectorAll('[data-ar]').forEach(btn => {
      btn.onclick = () => {
        const ri = +btn.dataset.ar, p = +btn.dataset.ap;
        _divAssegnazioni[ri] = _divAssegnazioni[ri] === p ? undefined : p;
        renderPagContenuto();
      };
    });
  }

  container.querySelector('#btn-pag-x').onclick = () => {
    container.querySelector('#modal-pagamento').style.display = 'none';
  };
  container.querySelector('#btn-pag-indietro').onclick = () => {
    container.querySelector('#modal-pagamento').style.display = 'none';
    apriModalConto();
  };

  container.querySelector('#btn-pag-conferma').onclick = async () => {
    const tots = totPerPersona();
    // Valida: ogni persona con importo > 0 deve avere un metodo
    for (let p = 0; p < tots.length; p++) {
      if (tots[p] > 0 && !_divMetodi[p]?.metodo) {
        mostraToast(`Scegli il metodo di pagamento per Persona ${p+1}`, 'warning'); return;
      }
    }
    const metodoPrincipale = _divMetodi[0]?.metodo || 'vario';
    const subConti = _divMode !== 'unico' ? { modo: _divMode, persone: _divPersone, metodi: _divMetodi, assegnazioni: _divAssegnazioni } : null;
    await eseguiChiusuraConto(metodoPrincipale, subConti);
  };

  // ── CASSA DISPLAY (schermo cliente) ──────────────────────────
  async function aggiornaCassaDisplay(stato, righe, totale, tavolo, metodoPagamento) {
    try {
      await supa().from('cassa_display').upsert({
        azienda_id: aziendaId,
        sede_id: sedeId || null,
        comanda_id: comandaAttiva?.id || null,
        stato,
        righe: JSON.stringify(righe || []),
        totale: totale || 0,
        tavolo: tavolo || null,
        metodo_pagamento: metodoPagamento || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'azienda_id,sede_id' });
    } catch(e) { console.warn('cassa_display:', e); }
  }

  // ── PROMO in cassa ──
  let _promoApplicata = null;   // { id, codice, nome, sconto }
  let _promoPollTimer = null;

  // Richiede l'apertura dello scanner sullo schermo cliente
  async function richiediScannerPromo() {
    const stato = container.querySelector('#promo-stato');
    if (stato) stato.textContent = '📷 In attesa che il cliente inquadri il QR…';
    try {
      await supa().from('cassa_display').upsert({
        azienda_id: aziendaId, sede_id: sedeId || null,
        comanda_id: comandaAttiva?.id || null,
        scanner_richiesto: true, scanner_codice: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'azienda_id,sede_id' });
    } catch(e) { console.warn('richiediScanner:', e); }
    // Poll del codice letto (lo schermo cliente lo scrive in scanner_codice)
    if (_promoPollTimer) clearInterval(_promoPollTimer);
    let tentativi = 0;
    _promoPollTimer = setInterval(async () => {
      tentativi++;
      if (tentativi > 40) { clearInterval(_promoPollTimer); if (stato) stato.textContent = 'Scanner annullato (tempo scaduto).'; await resetScanner(); return; }
      try {
        const { data } = await supa().from('cassa_display')
          .select('scanner_codice').eq('azienda_id', aziendaId).eq('sede_id', sedeId || null).maybeSingle();
        if (data?.scanner_codice) {
          clearInterval(_promoPollTimer);
          const codice = data.scanner_codice;
          await resetScanner();
          await applicaPromoCodice(codice);
        }
      } catch(e) { /* continua */ }
    }, 1500);
  }

  async function resetScanner() {
    try {
      await supa().from('cassa_display').update({ scanner_richiesto: false, scanner_codice: null })
        .eq('azienda_id', aziendaId).eq('sede_id', sedeId || null);
    } catch(e) {}
  }

  // Applica un codice promo (via Edge Function sicura)
  async function applicaPromoCodice(codice) {
    const stato = container.querySelector('#promo-stato');
    if (stato) stato.textContent = '⏳ Verifica promo…';
    const totaleCorrente = totaleContoLordo();
    try {
      const { data, error } = await supa().functions.invoke('applica-promo', {
        body: { azienda_id: aziendaId, codice, comanda_id: comandaAttiva?.id || null, totale: totaleCorrente }
      });
      if (error) { if (stato) stato.textContent = '❌ Errore verifica promo'; return; }
      if (!data?.ok) { if (stato) stato.textContent = '❌ ' + (data?.errore || 'Promo non valida'); return; }
      _promoApplicata = { id: data.promo.id, codice: data.promo.codice, nome: data.promo.nome, sconto: data.sconto };
      if (stato) stato.textContent = '';
      renderPromoApplicata();
      aggiornaContoTotale();
    } catch(e) {
      if (stato) stato.textContent = '❌ ' + (e?.message || 'Errore');
    }
  }

  function renderPromoApplicata() {
    const box = container.querySelector('#promo-applicata');
    const btn = container.querySelector('#btn-scansiona-promo');
    if (!box) return;
    if (_promoApplicata) {
      box.style.display = 'block';
      const n = container.querySelector('#promo-nome');
      const s = container.querySelector('#promo-sconto-txt');
      if (n) n.textContent = '🎉 ' + (_promoApplicata.nome || _promoApplicata.codice);
      if (s) s.textContent = '− € ' + Number(_promoApplicata.sconto || 0).toFixed(2) + ' di sconto';
      if (btn) btn.style.display = 'none';
    } else {
      box.style.display = 'none';
      if (btn) btn.style.display = 'block';
    }
  }

  function rimuoviPromo() {
    _promoApplicata = null;
    renderPromoApplicata();
    aggiornaContoTotale();
  }

  // Totale del conto tenendo conto della promo (usata anche per i punti)
  function totaleConPromo() {
    const base = totaleContoLordo();
    const sconto = _promoApplicata ? Number(_promoApplicata.sconto || 0) : 0;
    return Math.max(0, Math.round((base - sconto) * 100) / 100);
  }

  async function eseguiChiusuraConto(metodoPagamento, subConti = null) {
    if (!comandaAttiva) return;

    // Sincronizza le modifiche fatte nel modal alle righe reali
    for (const rl of _righeContoLocali) {
      const originale = righeComanda.find(r => String(r.id) === String(rl.id));
      if (originale && originale.quantita !== rl.quantita) {
        await supa().from('comanda_righe').update({ quantita: rl.quantita }).eq('id', rl.id);
        originale.quantita = rl.quantita;
      }
    }
    // Righe rimosse nel modal → annulla
    const idRimasti = new Set(_righeContoLocali.map(r => String(r.id)));
    for (const r of righeComanda.filter(r => r.stato !== 'annullato' && !idRimasti.has(String(r.id)))) {
      await supa().from('comanda_righe').update({ stato: 'annullato' }).eq('id', r.id);
      r.stato = 'annullato';
    }

    const totaleLordo = _righeContoLocali.reduce((s, r) => s + (Number(r.prezzo_snapshot||0)*Number(r.quantita||1)), 0);
    const scontoPromo = _promoApplicata ? Number(_promoApplicata.sconto||0) : 0;
    const totaleFinale = Math.max(0, Math.round((totaleLordo - scontoPromo)*100)/100);

    const aggiornamento = {
      stato: 'chiusa',
      chiusa_at: new Date().toISOString(),
      totale: totaleFinale,
    };
    // Traccia promo sulla comanda (se applicata)
    if (_promoApplicata) {
      aggiornamento.promo_id = _promoApplicata.id;
      aggiornamento.promo_codice = _promoApplicata.codice;
      aggiornamento.promo_sconto = scontoPromo;
    }
    // Colonne opzionali — includo solo se esistono i valori
    if (metodoPagamento) aggiornamento.metodo_pagamento = metodoPagamento;
    if (cameriereAttivo?.nome) aggiornamento.cameriere_chiusura = cameriereAttivo.nome;
    if (subConti) aggiornamento.sub_conti = JSON.stringify(subConti);

    const { error: chiusuraError } = await supa()
      .from('comande')
      .update(aggiornamento)
      .eq('id', comandaAttiva.id);

    if (chiusuraError) {
      mostraToast('Errore chiusura conto: ' + chiusuraError.message, 'error');
      return;
    }

    // Aggiorna schermo cliente → PAGATO
    await aggiornaCassaDisplay('pagato', [], totaleFinale, null, metodoPagamento);

    const comandaChiusaId = comandaAttiva.id;
    chiudiModalConto();

    comande = comande.filter(c => String(c.id) !== String(comandaChiusaId));
    comandaAttiva = null;
    righeComanda = [];
    _righeContoLocali = [];

    switchView('tavoli');
    await loadComande();
    renderMapTavoli();
    mostraToast(`✅ Conto chiuso — €${totaleFinale.toFixed(2)} (${metodoPagamento})`, 'success');

    // Popup fidelity
    setTimeout(() => apriFidelityPopup(totaleFinale), 400);
  }

  // ══════════════════════════════════════════
  // FIDELITY POPUP POST-CONTO
  // ══════════════════════════════════════════
  let _fiClienteSelezionato = null;
  let _fiPromoAttiva = false;
  let _fiTotaleChiuso = 0;
  let _fiCfg = null;

  async function apriFidelityPopup(totale) {
    _fiClienteSelezionato = null;
    _fiTotaleChiuso = totale;

    // Carica config fidelity
    const { data: cfg } = await supa().from('fidelity_config')
      .select('*').eq('azienda_id', aziendaId).maybeSingle();
    _fiCfg = cfg || { punti_per_euro:1, sconto_benvenuto_perc:10, bonus_benvenuto_punti:50, soglia_argento:500, soglia_oro:1500, moltiplicatore_argento:1.5, moltiplicatore_oro:2 };

    // Se c'è una promo attiva sul conto, NON si dà anche lo sconto benvenuto
    // (promo esclude altri sconti). I punti però si assegnano comunque,
    // calcolati sull'importo pagato (_fiTotaleChiuso già scontato).
    _fiPromoAttiva = !!_promoApplicata;
    const scontoBox = container.querySelector('#fi-popup-sconto');
    if (scontoBox) {
      if (_fiPromoAttiva) {
        scontoBox.textContent = '🎉 Promo attiva · accumuli punti';
        scontoBox.style.fontSize = '18px';
      } else {
        scontoBox.textContent = `-${_fiCfg.sconto_benvenuto_perc||10}% SUBITO`;
        scontoBox.style.fontSize = '24px';
      }
    }

    const modal = container.querySelector('#modal-fidelity');
    container.querySelector('#fi-popup-tel').value = '';
    container.querySelector('#fi-popup-nome').value = '';
    container.querySelector('#fi-popup-cognome').value = '';
    container.querySelector('#fi-popup-trovato').style.display = 'none';
    container.querySelector('#fi-popup-form-nuovo').style.display = 'none';
    container.querySelector('#fi-popup-calcolo').style.display = 'none';
    container.querySelector('#fi-popup-msg').textContent = '';
    container.querySelector('#fi-popup-sconto').textContent = _promoApplicata
      ? '🎉 Promo attiva · accumuli punti'
      : `-${_fiCfg.sconto_benvenuto_perc||10}% SUBITO`;
    modal.style.display = 'flex';
  }

  container.querySelector('#fi-popup-chiudi').onclick = () => {
    container.querySelector('#modal-fidelity').style.display = 'none';
  };
  container.querySelector('#fi-popup-salta').onclick = () => {
    container.querySelector('#modal-fidelity').style.display = 'none';
  };
  container.querySelector('#fi-popup-cerca').onclick = fiFindCliente;
  container.querySelector('#fi-popup-tel').addEventListener('keydown', e => { if(e.key==='Enter') fiFindCliente(); });
  container.querySelector('#fi-popup-tel').oninput = fiAggiornaCalcolo;
  container.querySelector('#fi-popup-emetti').onclick = fiEmettiTessera;

  async function fiFindCliente() {
    const tel = container.querySelector('#fi-popup-tel').value.trim();
    if (!tel) return;
    const { data } = await supa().from('fidelity_clienti').select('*').eq('telefono', tel).maybeSingle();
    const trovato = container.querySelector('#fi-popup-trovato');
    const formNuovo = container.querySelector('#fi-popup-form-nuovo');
    if (data) {
      _fiClienteSelezionato = data;
      trovato.style.display = 'block';
      trovato.innerHTML = `✅ <strong>${data.nome||''} ${data.cognome||''}</strong> — ${data.punti_totali||0} punti`;
      formNuovo.style.display = 'none';
    } else {
      _fiClienteSelezionato = null;
      trovato.style.display = 'none';
      formNuovo.style.display = 'block';
    }
    fiAggiornaCalcolo();
  }

  function fiAggiornaCalcolo() {
    const sconto = _fiTotaleChiuso * (_fiCfg?.sconto_benvenuto_perc||10) / 100;
    const totScontato = _fiTotaleChiuso - sconto;
    const puntiBase = Math.round((_fiCfg?.punti_per_euro||1) * totScontato);
    const calcolo = container.querySelector('#fi-popup-calcolo');
    calcolo.style.display = 'block';
    calcolo.innerHTML = `
      💸 Sconto: <strong>€${sconto.toFixed(2)}</strong> →
      Totale: <strong>€${totScontato.toFixed(2)}</strong><br>
      ⭐ Punti guadagnati: <strong>${puntiBase}pt</strong>
    `;
  }

  async function fiEmettiTessera() {
    const btn = container.querySelector('#fi-popup-emetti');
    const msg = container.querySelector('#fi-popup-msg');
    btn.disabled = true; btn.textContent = 'Emissione...';

    try {
      let cliente = _fiClienteSelezionato;
      const tel = container.querySelector('#fi-popup-tel').value.trim();

      if (!cliente) {
        const nome = container.querySelector('#fi-popup-nome').value.trim();
        if (!nome || !tel) throw new Error('Nome e telefono obbligatori');
        const { data, error } = await supa().from('fidelity_clienti').insert({
          nome, cognome: container.querySelector('#fi-popup-cognome').value.trim()||null,
          telefono: tel,
          punti_totali: _fiCfg.bonus_benvenuto_punti||50
        }).select().single();
        if (error) throw new Error(error.message);
        cliente = data;
      }

      // Crea/aggiorna tessera
      const { data: tesseraEsistente } = await supa().from('fidelity_tessere')
        .select('*').eq('cliente_id', cliente.id).eq('azienda_id', aziendaId).maybeSingle();

      // Se c'è una promo attiva, NON si applica anche lo sconto benvenuto.
      // I punti però si accumulano, sull'importo effettivamente pagato.
      const sconto = _fiPromoAttiva ? 0 : (_fiTotaleChiuso * (_fiCfg.sconto_benvenuto_perc||10) / 100);
      const totScontato = Math.round((_fiTotaleChiuso - sconto) * 100) / 100;
      const puntiBonus = !tesseraEsistente ? (_fiCfg.bonus_benvenuto_punti||50) : 0;
      const puntiAcquisto = Math.round((_fiCfg.punti_per_euro||1) * totScontato);
      const nuoviPunti = (tesseraEsistente?.punti_locali||0) + puntiBonus + puntiAcquisto;
      const nuovoLivello = nuoviPunti>=(_fiCfg.soglia_oro||1500)?'oro':nuoviPunti>=(_fiCfg.soglia_argento||500)?'argento':'bronzo';

      if (!tesseraEsistente) {
        await supa().from('fidelity_tessere').insert({
          cliente_id: cliente.id, azienda_id,
          punti_locali: nuoviPunti, livello: nuovoLivello
        });
        await supa().from('fidelity_movimenti').insert({
          cliente_id: cliente.id, azienda_id,
          tipo: 'benvenuto', punti: puntiBonus,
          descrizione: 'Bonus iscrizione fidelity'
        });
      } else {
        await supa().from('fidelity_tessere').update({
          punti_locali: nuoviPunti, livello: nuovoLivello
        }).eq('id', tesseraEsistente.id);
      }

      await supa().from('fidelity_movimenti').insert({
        cliente_id: cliente.id, azienda_id,
        tipo: 'acquisto', punti: puntiAcquisto,
        importo_speso: totScontato,
        descrizione: _fiPromoAttiva
          ? `Acquisto €${totScontato.toFixed(2)} (promo ${_promoApplicata?.codice||''})`
          : `Acquisto €${totScontato.toFixed(2)} (sconto ${_fiCfg.sconto_benvenuto_perc||10}%)`
      });

      await supa().from('fidelity_clienti').update({
        punti_totali: (cliente.punti_totali||0) + puntiBonus + puntiAcquisto
      }).eq('id', cliente.id);

      msg.innerHTML = `<div style="background:#f0fdf4;border-radius:10px;padding:12px;text-align:left;">
        <div style="font-weight:800;color:#16a34a;margin-bottom:6px;">✅ Tessera emessa!</div>
        <div>💸 Sconto applicato: <strong>€${sconto.toFixed(2)}</strong></div>
        <div>⭐ Punti: <strong>+${puntiBonus+puntiAcquisto}pt</strong> (totale ${nuoviPunti}pt)</div>
        <div>🏅 Livello: <strong>${nuovoLivello.charAt(0).toUpperCase()+nuovoLivello.slice(1)}</strong></div>
      </div>`;

      btn.disabled = false; btn.textContent = '✅ Emetti e applica sconto';
      setTimeout(() => container.querySelector('#modal-fidelity').style.display = 'none', 3000);

    } catch(err) {
      msg.innerHTML = `<span style="color:#dc2626;">${err.message}</span>`;
      btn.disabled = false; btn.textContent = '✅ Emetti e applica sconto';
    }
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
  container.querySelector('#btn-nuova-uscita').onclick = () => nuovaUscita();
  container.querySelector('#btn-preconto').onclick = () => mostraPreconto();
  container.querySelector('#btn-chiudi-comanda').onclick = () => chiudiComanda();
  container.querySelector('#btn-nuova-sala').onclick = () => creaNuovaSala();
  container.querySelector('#btn-nuovo-tavolo').onclick = () => creaNuovoTavolo();
  container.querySelector('#search-prodotto').addEventListener('input', e => renderGrigliaProdotti(e.target.value));

  // ── AGGIORNAMENTO AUTOMATICO (realtime) ──────────────────────────
  // Quando un piatto viene segnato esaurito/disponibile, o aggiunto/tolto
  // dal menu — da qualunque altra schermata (Prodotti, Menu Builder) — la
  // griglia comande si aggiorna da sola, senza bisogno di ricaricare la pagina.
  let realtimeDebounce = null;
  function scheduleRicaricaProdotti() {
    clearTimeout(realtimeDebounce);
    realtimeDebounce = setTimeout(async () => {
      await Promise.all([loadProdotti(), loadCategorie()]);
      renderGrigliaProdotti(container.querySelector('#search-prodotto')?.value || '');
    }, 400);
  }

  const realtimeChannel = supa()
    .channel('comande-live-' + aziendaId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prodotti_vendita', filter: `azienda_id=eq.${aziendaId}` }, scheduleRicaricaProdotti)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_voci', filter: `azienda_id=eq.${aziendaId}` }, scheduleRicaricaProdotti)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categorie_vendita', filter: `azienda_id=eq.${aziendaId}` }, scheduleRicaricaProdotti)
    .subscribe();

  // Chiudi la sottoscrizione quando si esce dalla pagina (cambio rotta/ricarica)
  window.addEventListener('hashchange', function chiudiRealtime() {
    supa().removeChannel(realtimeChannel);
    window.removeEventListener('hashchange', chiudiRealtime);
  });

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
