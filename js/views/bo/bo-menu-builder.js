// js/views/bo/bo-menu-builder.js  v4
// Fix: mockup intero menu, click categoria → prodotti, elimina categoria, scroll drag
const supa = () => window.supabaseClient || window.supabase;
const BASE_URL = "https://app.ristoflow-ai.com";

export async function render(container) {
  const azienda_id = window.state?.azienda?.id;
  let currentSedeId = window.state?.sedeAttiva?.id || null;
  const ruolo      = window.state?.ruolo;

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Accesso negato</div>`;
    return;
  }

  let menus           = [];
  let menuAttivo      = null;
  let catVendita      = [];
  let menuCategorie   = [];
  let catSelezionata  = null;
  let prodottiVendita = [];
  let menuVoci        = [];
  let coverGalleryUrls = []; // foto copertina a slide del menu in configurazione
  // Tutte le voci del menu per il mockup completo
  let tutteLeVoci     = {};   // { [categoria_id]: [voci...] }
  let dragSrcId       = null;

  container.innerHTML = `
  <style>
    .mb-input{width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;}
    .mb-input:focus{border-color:#0E5A7A;}
    .mb-label{font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em;}
    .mb-btn{border:none;border-radius:10px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;}
    .mb-btn-primary{background:#0E5A7A;color:#fff;}
    .mb-btn-sec{background:#f1f5f9;color:#374151;}
    .mb-btn-danger{background:#fee2e2;color:#dc2626;}
    .mb-btn-green{background:#dcfce7;color:#16a34a;}
    .cat-dropzone{min-height:120px;border:2px dashed #d1d5db;border-radius:14px;transition:all .15s;}
    .cat-dropzone.drag-over{border-color:#0E5A7A;background:#f0f9ff;}
    .cat-sx-item{padding:10px 12px;border-radius:12px;cursor:grab;border:1px solid #e5e7eb;background:#fff;margin-bottom:6px;display:flex;align-items:center;gap:10px;transition:all .15s;user-select:none;}
    .cat-sx-item:hover{border-color:#0E5A7A;background:#f0f9ff;}
    .cat-sx-item.dragging{opacity:.4;}
    .cat-centro-item{padding:12px;border-radius:12px;border:1.5px solid #e5e7eb;background:#fff;margin-bottom:8px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:10px;}
    .cat-centro-item:hover{border-color:#0E5A7A;}
    .cat-centro-item.active{border-color:#0E5A7A;background:#e0f2fe;}
    .cat-centro-item.dragging{opacity:.4;}
    .cat-centro-item.drag-over{outline:2px solid #0E5A7A;background:#f0f9ff;}
    .prodotto-row{padding:10px 12px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;margin-bottom:6px;display:flex;align-items:center;gap:10px;}
    .prodotto-row.nel-menu{background:#f0fdf4;border-color:#86efac;}
    .prodotto-row.dragging{opacity:.4;}
    .prodotto-row.drag-over{outline:2px solid #16a34a;}
    .mockup-wrap{background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;}
    .mockup-voce{padding:8px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;border-bottom:1px solid #f3f4f6;}
    .mockup-voce:last-child{border-bottom:none;}
    .toggle-switch{position:relative;display:inline-block;width:36px;height:20px;}
    .toggle-switch input{opacity:0;width:0;height:0;}
    .toggle-slider{position:absolute;cursor:pointer;inset:0;background:#d1d5db;border-radius:999px;transition:.2s;}
    .toggle-slider:before{position:absolute;content:"";height:14px;width:14px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;}
    input:checked+.toggle-slider{background:#0E5A7A;}
    input:checked+.toggle-slider:before{transform:translateX(16px);}
    .dx-col{background:#fff;border-left:1px solid #e5e7eb;overflow-y:auto;display:flex;flex-direction:column;}
  </style>

  <div style="min-height:100vh;background:#f8fafc;display:flex;flex-direction:column;">

    <!-- TOPBAR -->
    <div style="background:#0E5A7A;padding:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex-shrink:0;">
      <button id="btn-back" class="mb-btn" style="background:rgba(255,255,255,.15);color:#fff;border:none;">← Indietro</button>
      <div style="font-size:17px;font-weight:800;color:#fff;flex:1;">🍽️ Menu Builder</div>
      <select id="mb-sede-sel" style="padding:7px 12px;border:none;border-radius:8px;font-size:13px;font-family:inherit;outline:none;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;display:none;">
      </select>
      <button id="btn-nuovo-menu" class="mb-btn" style="background:#fff;color:#0E5A7A;font-weight:800;">+ Nuovo menu</button>
    </div>

    <!-- TABS MENU -->
    <div style="background:#fff;border-bottom:1px solid #e5e7eb;padding:0 20px;display:flex;gap:4px;overflow-x:auto;flex-shrink:0;" id="tabs-menu"></div>

    <!-- PLACEHOLDER -->
    <div id="placeholder-nessun-menu" style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;color:#94a3b8;gap:12px;text-align:center;padding:60px 20px;">
      <div style="font-size:48px;">🍽️</div>
      <div style="font-size:16px;font-weight:700;">Nessun menu</div>
      <div style="font-size:13px;">Crea il tuo primo menu digitale</div>
    </div>

    <!-- EDITOR -->
    <div id="editor-menu" style="display:none;flex:1;display:flex;flex-direction:column;">

      <!-- HEADER CONFIG collassabile -->
      <div style="background:#fff;border-bottom:1px solid #e5e7eb;flex-shrink:0;">
        <div style="padding:10px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;" id="cfg-toggle-row">
          <div style="font-size:14px;font-weight:800;color:#374151;">⚙️ Configurazione menu</div>
          <button id="cfg-toggle-btn" class="mb-btn mb-btn-sec" style="padding:5px 12px;font-size:12px;">▼ Espandi</button>
        </div>
        <div id="cfg-panel" style="display:none;padding:0 16px 16px;">

          <!-- Link + QR live -->
          <div id="link-qr-live" style="display:none;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:10px;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">Link pubblico</div>
              <a id="link-qr-url" href="#" target="_blank" style="font-size:12px;color:#0E5A7A;font-weight:700;word-break:break-all;text-decoration:none;"></a>
            </div>
            <img id="link-qr-img" src="" style="width:64px;height:64px;border-radius:8px;cursor:pointer;flex-shrink:0;" title="Clicca per ingrandire">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr auto auto auto;gap:10px;align-items:end;margin-bottom:12px;">
            <div>
              <label class="mb-label">Nome menu</label>
              <input id="cfg-nome" class="mb-input" placeholder="Es. Menu Cena">
            </div>
            <div>
              <label class="mb-label">Slug (URL)</label>
              <div style="display:flex;gap:6px;">
                <input id="cfg-slug" class="mb-input" placeholder="menu-cena">
                <button id="btn-gen-slug" class="mb-btn mb-btn-sec" style="padding:9px 10px;" title="Genera">🔄</button>
              </div>
            </div>
            <a id="cfg-link-pub" href="#" target="_blank" class="mb-btn mb-btn-primary" style="text-decoration:none;white-space:nowrap;opacity:.4;">🔗 Apri</a>
            <button id="btn-qr" class="mb-btn mb-btn-sec">📷 QR</button>
            <button id="btn-stampa-menu-admin" class="mb-btn mb-btn-sec" title="Apre il menu e avvia la stampa — una pagina A4 per categoria">🖨️ Stampa</button>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:12px;">
            <div>
              <label class="mb-label">Colore brand</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="color" id="cfg-colore" value="#0E5A7A" style="width:40px;height:36px;border:1.5px solid #e2e8f0;border-radius:8px;cursor:pointer;padding:2px;">
                <input id="cfg-colore-hex" class="mb-input" style="width:90px;" value="#0E5A7A">
              </div>
            </div>
            <div>
              <label class="mb-label">Sfondo</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <input type="color" id="cfg-sfondo" value="#ffffff" style="width:40px;height:36px;border:1.5px solid #e2e8f0;border-radius:8px;cursor:pointer;padding:2px;">
                <input id="cfg-sfondo-hex" class="mb-input" style="width:90px;" value="#ffffff">
              </div>
            </div>
            <div>
              <label class="mb-label">Font</label>
              <select id="cfg-font" class="mb-input" style="width:160px;">
                <option value="">Default</option>
                <option value="'Playfair Display',serif">Playfair Display</option>
                <option value="'Montserrat',sans-serif">Montserrat</option>
                <option value="'Lato',sans-serif">Lato</option>
                <option value="'Georgia',serif">Georgia</option>
              </select>
            </div>
            <div>
              <label class="mb-label">Stato</label>
              <div style="display:flex;align-items:center;gap:8px;height:36px;">
                <label class="toggle-switch"><input type="checkbox" id="cfg-attivo"><span class="toggle-slider"></span></label>
                <span id="cfg-attivo-label" style="font-size:13px;font-weight:700;">Attivo</span>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:16px;flex-wrap:wrap;padding:12px;background:#f8fafc;border-radius:12px;margin-bottom:12px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;">
              <input type="checkbox" id="cfg-tracking" style="accent-color:#0E5A7A;width:16px;height:16px;">
              📊 Tracking visite
            </label>
            <div>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;">
                <input type="checkbox" id="cfg-raccolta" style="accent-color:#0E5A7A;width:16px;height:16px;">
                📋 Raccolta dati clienti
              </label>
              <div id="raccolta-campi-panel" style="display:none;margin-top:10px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;">
                <div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:8px;">CAMPI DA RICHIEDERE</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                  ${[{id:"nome",l:"Nome"},{id:"cognome",l:"Cognome"},{id:"telefono",l:"Telefono"},{id:"email",l:"Email"},{id:"tavolo",l:"Numero tavolo"},{id:"data_nascita",l:"Data di nascita"},{id:"cap",l:"CAP"},{id:"citta",l:"Città"},{id:"note",l:"Note libere"},{id:"consenso_marketing",l:"Consenso marketing"}]
                    .map(f=>`<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;padding:4px 0;"><input type="checkbox" class="raccolta-campo" data-campo="${f.id}" style="accent-color:#0E5A7A;">${f.l}</label>`).join("")}
                </div>
              </div>
            </div>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;">
              <input type="checkbox" id="cfg-caparra" style="accent-color:#0E5A7A;width:16px;height:16px;">
              💳 Caparra richiesta
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;">
              <input type="checkbox" id="cfg-ordinabile" style="accent-color:#16a34a;width:16px;height:16px;">
              🛒 Ordinabile (carrello + pagamento online)
            </label>
          </div>

          <div id="caparra-panel" style="display:none;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;margin-bottom:12px;">
            <div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:8px;">💳 Formula caparra</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
              <div><label class="mb-label">Tipo</label>
                <select id="caparra-tipo" class="mb-input"><option value="fisso">Importo fisso (€)</option><option value="persona">Per persona (€/p)</option><option value="percentuale">Percentuale (%)</option></select></div>
              <div><label class="mb-label">Importo</label><input id="caparra-importo" type="number" class="mb-input" placeholder="10" min="0" step="0.01"></div>
              <div><label class="mb-label">Note</label><input id="caparra-note" class="mb-input" placeholder="Es. Non rimborsabile"></div>
            </div>
          </div>

          <div id="ordinabile-panel" style="display:none;background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:12px;margin-bottom:12px;">
            <div style="font-size:12px;font-weight:800;color:#166534;margin-bottom:8px;">🛒 Configurazione ordini — es. Room Service, Spiaggia, Asporto</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
              <div>
                <label class="mb-label">Etichetta luogo consegna</label>
                <select id="cfg-luogo-label" class="mb-input">
                  <option value="Tavolo">Tavolo</option>
                  <option value="Camera">Camera</option>
                  <option value="Ombrellone">Ombrellone</option>
                  <option value="Indirizzo ufficio">Indirizzo ufficio</option>
                  <option value="Indirizzo">Indirizzo di consegna</option>
                </select>
              </div>
              <div>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;margin-top:22px;">
                  <input type="checkbox" id="cfg-richiedi-orario" style="accent-color:#16a34a;" checked> Chiedi orario di consegna desiderato
                </label>
              </div>
            </div>
            <div style="font-size:11px;color:#166534;">Il cliente pagherà con carta al momento dell'ordine (Stripe). Riceverai l'ordine in tempo reale in Comande e via WhatsApp.</div>
          </div>

          <!-- Cover (galleria a slide) e Logo menu -->
          <div style="margin-bottom:12px;">
            <label class="mb-label">🖼️ Foto copertina — a slide (aggiungine più di una per far scorrere)</label>
            <div id="cfg-cover-gallery" style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;"></div>
            <label style="cursor:pointer;display:inline-block;">
              <input type="file" id="cfg-cover-file" accept="image/*" multiple style="display:none;">
              <span class="mb-btn mb-btn-sec" style="padding:8px 14px;font-size:12px;">📁 Aggiungi foto</span>
            </label>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">📐 Consigliato: 1200×500px (formato largo, tipo copertina) — foto più piccole verranno ingrandite e perdono qualità</div>
            <div id="cfg-cover-prog" style="display:none;font-size:11px;color:#0E5A7A;margin-top:4px;">⏳ Caricamento...</div>
          </div>
          <div style="margin-bottom:12px;">
            <label class="mb-label">🔵 Logo menu (URL)</label>
            <div style="display:flex;gap:6px;max-width:320px;">
              <input id="cfg-logo-url" class="mb-input" placeholder="https://... oppure carica ↓">
              <label style="cursor:pointer;" title="Carica logo">
                <input type="file" id="cfg-logo-file" accept="image/*" style="display:none;">
                <span class="mb-btn mb-btn-sec" style="padding:9px 10px;">📁</span>
              </label>
            </div>
            <div id="cfg-logo-prev" style="margin-top:6px;"></div>
            <div id="cfg-logo-prog" style="display:none;font-size:11px;color:#0E5A7A;margin-top:4px;">⏳ Caricamento...</div>
          </div>

          <button id="btn-salva-cfg" class="mb-btn mb-btn-primary" style="width:100%;">💾 Salva configurazione</button>
          <div id="msg-cfg" style="margin-top:8px;font-size:12px;text-align:center;"></div>
        </div>
      </div>

      <!-- 3 COLONNE -->
      <div style="display:grid;grid-template-columns:260px 1fr 360px;flex:1;overflow:hidden;">

        <!-- SX: categorie sede con scroll proprio -->
        <div id="col-sx" style="background:#fff;border-right:1px solid #e5e7eb;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:12px;border-bottom:1px solid #f1f5f9;flex-shrink:0;">
            <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:6px;">Categorie sede</div>
            <input id="search-cat-sx" class="mb-input" placeholder="Cerca..." style="font-size:12px;">
          </div>
          <div id="lista-cat-sx" style="flex:1;overflow-y:auto;padding:10px;"></div>
        </div>

        <!-- CENTRO: composizione -->
        <div style="background:#f8fafc;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:10px 16px;border-bottom:1px solid #e5e7eb;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:13px;font-weight:800;color:#374151;">Composizione menu</div>
            <div style="font-size:11px;color:#94a3b8;">Trascina o doppio click</div>
          </div>
          <div id="centro-dropzone" class="cat-dropzone" style="flex:1;overflow-y:auto;padding:12px;">
            <div id="lista-cat-centro"></div>
            <div id="centro-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;color:#94a3b8;gap:8px;text-align:center;">
              <div style="font-size:28px;">👈</div>
              <div style="font-size:12px;font-weight:600;">Trascina le categorie qui</div>
            </div>
          </div>
        </div>

        <!-- DX: portate + mockup INTERO -->
        <div class="dx-col">
          <div id="dx-placeholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:32px;color:#94a3b8;gap:8px;text-align:center;">
            <div style="font-size:28px;">👆</div>
            <div style="font-size:12px;font-weight:600;">Seleziona una categoria</div>
          </div>
          <div id="dx-content" style="display:none;flex:1;display:flex;flex-direction:column;">
            <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;flex-shrink:0;background:#fff;position:sticky;top:0;z-index:5;">
              <div style="font-size:13px;font-weight:800;" id="dx-cat-nome">Portate</div>
            </div>
            <div style="display:flex;gap:4px;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb;flex-shrink:0;">
              <button class="dx-tab mb-btn mb-btn-primary" data-tab="portate" style="font-size:12px;padding:6px 12px;">Portate</button>
              <button class="dx-tab mb-btn mb-btn-sec" data-tab="mockup" style="font-size:12px;padding:6px 12px;">👁️ Anteprima menu</button>
            </div>
            <div id="dx-tab-portate" style="flex:1;overflow-y:auto;padding:10px;">
              <div style="position:relative;margin-bottom:14px;">
                <input id="search-aggiungi-prodotto" class="mb-input" placeholder="🔍 Cerca portata da aggiungere..." autocomplete="off" style="font-size:13px;">
                <div id="dropdown-aggiungi-prodotto" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:20;max-height:280px;overflow-y:auto;margin-top:4px;"></div>
              </div>
              <div id="lista-prodotti-dx"></div>
            </div>
            <div id="dx-tab-mockup" style="display:none;flex:1;overflow-y:auto;padding:10px;">
              <div id="mockup-live"></div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- MODAL NUOVO MENU -->
    <div id="modal-nuovo-menu" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:20px;padding:28px;width:min(480px,95vw);box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:17px;font-weight:800;">✨ Nuovo menu</div>
          <button id="chiudi-modal-nuovo" class="mb-btn mb-btn-sec" style="width:36px;height:36px;padding:0;">✕</button>
        </div>
        <label class="mb-label">Nome *</label>
        <input id="nuovo-nome" class="mb-input" placeholder="Es. Menu Cena Estate" style="margin-bottom:12px;">
        <label class="mb-label">Descrizione</label>
        <input id="nuovo-desc" class="mb-input" placeholder="Breve descrizione..." style="margin-bottom:16px;">
        <button id="btn-crea-menu" class="mb-btn mb-btn-primary" style="width:100%;">🚀 Crea menu</button>
        <div id="msg-nuovo" style="margin-top:8px;font-size:12px;text-align:center;"></div>
      </div>
    </div>

    <!-- MODAL VOCE / CFG CAT -->
    <div id="modal-voce" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:20px;padding:24px;width:min(480px,95vw);box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:800;" id="modal-voce-title">Configura</div>
          <button id="chiudi-modal-voce" class="mb-btn mb-btn-sec" style="width:36px;height:36px;padding:0;">✕</button>
        </div>
        <div id="modal-voce-body"></div>
      </div>
    </div>

  </div>
  `;

  // ── BIND FISSI ────────────────────────────────────────────────
  const qs = (s) => container.querySelector(s);

  qs("#btn-back").onclick = () => window.location.hash = "#/home";
  qs("#btn-nuovo-menu").onclick = aprireModalNuovoMenu;
  qs("#chiudi-modal-nuovo").onclick = chiudiModalNuovoMenu;
  qs("#chiudi-modal-voce").onclick = chiudiModalVoce;
  qs("#modal-nuovo-menu").onclick = (e) => { if (e.target === e.currentTarget) chiudiModalNuovoMenu(); };
  qs("#modal-voce").onclick = (e) => { if (e.target === e.currentTarget) chiudiModalVoce(); };

  // Config toggle
  qs("#cfg-toggle-row").onclick = () => {
    const p = qs("#cfg-panel");
    const btn = qs("#cfg-toggle-btn");
    const open = p.style.display !== "none";
    p.style.display = open ? "none" : "block";
    btn.textContent = open ? "▼ Espandi" : "▲ Chiudi";
  };

  // Color pickers
  ["colore","sfondo"].forEach(k => {
    const picker = qs(`#cfg-${k}`);
    const hex = qs(`#cfg-${k}-hex`);
    picker.oninput = () => hex.value = picker.value;
    hex.oninput = () => { if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) picker.value = hex.value; };
  });

  qs("#cfg-attivo").onchange = (e) => { qs("#cfg-attivo-label").textContent = e.target.checked ? "Attivo" : "Non attivo"; };
  qs("#cfg-caparra").onchange = (e) => { qs("#caparra-panel").style.display = e.target.checked ? "block" : "none"; };
  qs("#cfg-ordinabile").onchange = (e) => { qs("#ordinabile-panel").style.display = e.target.checked ? "block" : "none"; };
  qs("#cfg-raccolta").onchange = (e) => { qs("#raccolta-campi-panel").style.display = e.target.checked ? "block" : "none"; };

  qs("#cfg-nome").oninput = () => {
    const slugEl = qs("#cfg-slug");
    if (!slugEl.dataset.manuale) {
      slugEl.value = makeSlug(qs("#cfg-nome").value);
      aggiornaLinkQR(slugEl.value);
    }
  };
  qs("#cfg-slug").oninput = (e) => { e.target.dataset.manuale = "1"; aggiornaLinkQR(e.target.value); };
  qs("#btn-gen-slug").onclick = () => { const n = qs("#cfg-nome").value.trim(); if(n){ qs("#cfg-slug").value = makeSlug(n); aggiornaLinkQR(qs("#cfg-slug").value); } };
  qs("#link-qr-img").onclick = () => { const s = qs("#cfg-slug").value.trim(); if(s) mostraQR(s); };
  qs("#btn-qr").onclick = () => { const s = qs("#cfg-slug").value.trim() || menuAttivo?.slug; if(s) mostraQR(s); else alert("Imposta prima uno slug"); };
  qs("#btn-stampa-menu-admin").onclick = () => {
    const s = qs("#cfg-slug").value.trim() || menuAttivo?.slug;
    if (!s) { alert("Imposta prima uno slug"); return; }
    // Apre in una nuova scheda con ?print=1: solo da qui si attiva la stampa
    // automatica, i clienti sulla pagina pubblica non vedono mai questa opzione.
    window.open(`${BASE_URL}/menu-pubblico.html?slug=${encodeURIComponent(s)}&print=1`, "_blank");
  };
  qs("#btn-salva-cfg").onclick = salvaConfigMenu;

  // Upload cover menu — a galleria (multi-foto per lo slideshow)
  const coverFileInput = qs("#cfg-cover-file");
  if (coverFileInput) {
    coverFileInput.onchange = async function() {
      const files = Array.from(this.files || []); if (!files.length) return;
      const prog = qs("#cfg-cover-prog"); if (prog) prog.style.display = "";
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = azienda_id + "/menu-cover-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + "." + ext;
        const { error } = await supa().storage.from("media-aziende").upload(path, file, { upsert: true, contentType: file.type });
        if (error) { alert("Errore upload " + file.name + ": " + error.message); continue; }
        const { data: pub } = supa().storage.from("media-aziende").getPublicUrl(path);
        coverGalleryUrls.push(pub.publicUrl);
      }
      if (prog) prog.style.display = "none";
      this.value = "";
      renderCoverGallery();
    };
  }

  function renderCoverGallery() {
    const box = qs("#cfg-cover-gallery");
    if (!box) return;
    if (!coverGalleryUrls.length) {
      box.innerHTML = `<div style="font-size:12px;color:#94a3b8;padding:8px 0;">Nessuna foto ancora — aggiungine almeno una (più ne metti, più scorrono a slide sulla pagina pubblica).</div>`;
      return;
    }
    box.innerHTML = coverGalleryUrls.map((url, i) => `
      <div class="cover-thumb" data-idx="${i}" draggable="true" style="position:relative;width:90px;height:60px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;cursor:grab;flex-shrink:0;">
        <img src="${esc(url)}" style="width:100%;height:100%;object-fit:cover;display:block;">
        <button class="btn-rm-cover" data-idx="${i}" type="button" style="position:absolute;top:2px;right:2px;background:rgba(220,38,38,.9);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;line-height:1;">✕</button>
        ${i === 0 ? `<span style="position:absolute;bottom:2px;left:2px;background:rgba(14,90,122,.9);color:#fff;font-size:9px;padding:1px 5px;border-radius:6px;">principale</span>` : ""}
      </div>
    `).join("");

    box.querySelectorAll(".btn-rm-cover").forEach(btn => {
      btn.onclick = () => { coverGalleryUrls.splice(Number(btn.dataset.idx), 1); renderCoverGallery(); };
    });

    // Riordino drag&drop — la prima foto è quella "principale" usata anche come cover_url singola
    let dragSrc = null;
    box.querySelectorAll(".cover-thumb").forEach(thumb => {
      thumb.addEventListener("dragstart", () => { dragSrc = Number(thumb.dataset.idx); thumb.style.opacity = ".4"; });
      thumb.addEventListener("dragend", () => { thumb.style.opacity = "1"; });
      thumb.addEventListener("dragover", (e) => e.preventDefault());
      thumb.addEventListener("drop", (e) => {
        e.preventDefault();
        const dstIdx = Number(thumb.dataset.idx);
        if (dragSrc === null || dragSrc === dstIdx) return;
        const [moved] = coverGalleryUrls.splice(dragSrc, 1);
        coverGalleryUrls.splice(dstIdx, 0, moved);
        renderCoverGallery();
      });
    });
  }

  // Upload logo menu
  const logoFileInput = qs("#cfg-logo-file");
  if (logoFileInput) {
    logoFileInput.onchange = async function() {
      const file = this.files[0]; if (!file) return;
      const prog = qs("#cfg-logo-prog"); if (prog) prog.style.display = "";
      const ext = file.name.split(".").pop();
      const path = azienda_id + "/menu-logo-" + Date.now() + "." + ext;
      const { error } = await supa().storage.from("media-aziende").upload(path, file, { upsert: true, contentType: file.type });
      if (prog) prog.style.display = "none";
      if (error) { alert("Errore upload: " + error.message); return; }
      const { data: pub } = supa().storage.from("media-aziende").getPublicUrl(path);
      const url = pub.publicUrl;
      if (qs("#cfg-logo-url")) qs("#cfg-logo-url").value = url;
      const prev = qs("#cfg-logo-prev");
      if (prev) prev.innerHTML = '<img src="' + url + '" style="width:48px;height:48px;object-fit:cover;border-radius:50%;border:2px solid #0E5A7A;">';
    };
  }
  qs("#search-cat-sx").oninput = (e) => renderCatSx(e.target.value);
  qs("#search-aggiungi-prodotto").addEventListener("input", (e) => renderDropdownAggiungi(e.target.value));
  qs("#search-aggiungi-prodotto").addEventListener("focus", (e) => { if (e.target.value.trim()) renderDropdownAggiungi(e.target.value); });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#search-aggiungi-prodotto") && !e.target.closest("#dropdown-aggiungi-prodotto")) {
      const dd = qs("#dropdown-aggiungi-prodotto");
      if (dd) dd.style.display = "none";
    }
  });

  container.querySelectorAll(".dx-tab").forEach(btn => {
    btn.onclick = () => switchDxTab(btn.dataset.tab);
  });

  // ── SCROLL AUTOMATICO durante drag ───────────────────────────
  let scrollInterval = null;
  const colSx = qs("#lista-cat-sx");
  const colCentro = qs("#centro-dropzone");

  document.addEventListener("dragover", (e) => {
    clearInterval(scrollInterval);
    // Scroll colonna SX
    const rectSx = colSx.getBoundingClientRect();
    if (e.clientX >= rectSx.left && e.clientX <= rectSx.right) {
      if (e.clientY < rectSx.top + 60) scrollInterval = setInterval(() => colSx.scrollTop -= 8, 30);
      else if (e.clientY > rectSx.bottom - 60) scrollInterval = setInterval(() => colSx.scrollTop += 8, 30);
    }
    // Scroll colonna centro
    const rectC = colCentro.getBoundingClientRect();
    if (e.clientX >= rectC.left && e.clientX <= rectC.right) {
      if (e.clientY < rectC.top + 60) scrollInterval = setInterval(() => colCentro.scrollTop -= 8, 30);
      else if (e.clientY > rectC.bottom - 60) scrollInterval = setInterval(() => colCentro.scrollTop += 8, 30);
    }
  });
  document.addEventListener("dragend", () => clearInterval(scrollInterval));
  document.addEventListener("drop", () => clearInterval(scrollInterval));

  // ── INIT ─────────────────────────────────────────────────────
  // FIX BUG 1: la sede va risolta PRIMA di caricare menu/categorie.
  // Prima la sede veniva risolta in una IIFE async non attesa: loadMenus()
  // e loadCatVendita() partivano con currentSedeId ancora null, e le query
  // saltano il filtro sede_id quando è falsy → venivano mostrate le
  // categorie/menu di TUTTE le sedi dell'azienda. Inoltre il cambio sede
  // chiamava caricaDati(), funzione mai definita nel file → ReferenceError
  // silenzioso e i dati non venivano MAI ricaricati dopo la selezione sede.
  const { data: sediListInit } = await supa().from('sedi').select('id,nome').eq('azienda_id', azienda_id).eq('attiva', true).order('nome');
  const sediDisponibili = sediListInit || [];
  if (!currentSedeId && sediDisponibili.length > 0) currentSedeId = sediDisponibili[0].id;

  const sedeSel = qs('#mb-sede-sel');
  if (sedeSel && sediDisponibili.length > 1) {
    sedeSel.style.display = '';
    sediDisponibili.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.nome;
      if (s.id === currentSedeId) opt.selected = true;
      sedeSel.appendChild(opt);
    });
    sedeSel.value = currentSedeId || '';
    sedeSel.addEventListener('change', async function() {
      currentSedeId = this.value || null;
      await caricaDati();
    });
  }

  await caricaDati();

  // Ricarica menu + categorie vendita per la sede corrente e ripristina la UI.
  // Definita qui (prima non esisteva affatto).
  async function caricaDati() {
    menuAttivo      = null;
    catSelezionata  = null;
    menuCategorie   = [];
    tutteLeVoci     = {};
    await loadMenus();
    await loadCatVendita();
    renderTabsMenu();
    if (menus.length > 0) {
      await selezionaMenu(menus[0]);
    } else {
      renderCatSx();
      renderCatCentro();
      renderDxPlaceholder();
    }
  }

  // ── LOAD ─────────────────────────────────────────────────────
  async function loadMenus() {
    let q = supa().from("menu").select("*").eq("azienda_id", azienda_id).order("created_at");
    if (currentSedeId) q = q.eq("sede_id", currentSedeId);
    const { data } = await q;
    menus = data || [];
  }

  async function loadCatVendita() {
    let q = supa().from("categorie_vendita").select("*").eq("azienda_id", azienda_id).order("ordine").order("nome");
    if (currentSedeId) q = q.eq("sede_id", currentSedeId);
    const { data } = await q;
    catVendita = data || [];
  }

  async function loadMenuCategorie(menuId) {
    const { data } = await supa()
      .from("menu_categorie")
      .select("*")
      .eq("menu_id", menuId)
      .eq("azienda_id", azienda_id)
      .order("ordine");
    menuCategorie = data || [];
  }

  async function loadProdottiVendita(catVenditaId) {
    let q = supa()
      .from("prodotti_vendita")
      .select("*")
      .eq("azienda_id", azienda_id)
      .eq("categoria_vendita_id", catVenditaId)
      .eq("attivo", true);
    if (currentSedeId) q = q.eq("sede_id", currentSedeId);
    const { data } = await q.order("ordinamento").order("nome");
    prodottiVendita = data || [];
  }

  async function loadMenuVoci(catId) {
    const { data } = await supa()
      .from("menu_voci")
      .select("*")
      .eq("menu_id", menuAttivo.id)
      .eq("categoria_id", catId)
      .eq("azienda_id", azienda_id)
      .order("ordine");
    menuVoci = data || [];
  }

  // Carica TUTTE le voci del menu per il mockup completo
  async function loadTutteLeVoci() {
    const { data } = await supa()
      .from("menu_voci")
      .select("*")
      .eq("menu_id", menuAttivo.id)
      .eq("azienda_id", azienda_id)
      .order("ordine");
    tutteLeVoci = {};
    (data || []).forEach(v => {
      if (!tutteLeVoci[v.categoria_id]) tutteLeVoci[v.categoria_id] = [];
      tutteLeVoci[v.categoria_id].push(v);
    });
  }

  // ── TABS MENU ─────────────────────────────────────────────────
  function renderTabsMenu() {
    const box = qs("#tabs-menu");
    if (!menus.length) {
      box.innerHTML = "";
      qs("#placeholder-nessun-menu").style.display = "flex";
      qs("#editor-menu").style.display = "none";
      return;
    }
    qs("#placeholder-nessun-menu").style.display = "none";
    box.innerHTML = menus.map(m => `
      <div class="menu-tab" data-id="${m.id}" style="
        padding:12px 16px;border-bottom:3px solid ${menuAttivo?.id===m.id?"#0E5A7A":"transparent"};
        cursor:pointer;font-size:13px;font-weight:${menuAttivo?.id===m.id?"800":"600"};
        color:${menuAttivo?.id===m.id?"#0E5A7A":"#64748b"};white-space:nowrap;
        display:flex;align-items:center;gap:6px;">
        <span style="width:6px;height:6px;border-radius:50%;background:${m.attivo?"#22c55e":"#d1d5db"};flex-shrink:0;"></span>
        ${esc(m.nome)}
      </div>`).join("");
    box.querySelectorAll(".menu-tab").forEach(el => {
      el.onclick = () => selezionaMenu(menus.find(m => m.id === el.dataset.id));
    });
  }

  // ── SELEZIONA MENU ────────────────────────────────────────────
  async function selezionaMenu(menu) {
    menuAttivo = menu;
    catSelezionata = null;
    await loadMenuCategorie(menu.id);
    await loadTutteLeVoci();
    renderTabsMenu();
    popolaConfigMenu();
    renderCatSx();
    renderCatCentro();
    renderDxPlaceholder();
    qs("#editor-menu").style.display = "flex";
    qs("#placeholder-nessun-menu").style.display = "none";
  }

  // ── POPOLA CONFIG ─────────────────────────────────────────────
  function popolaConfigMenu() {
    const m = menuAttivo;
    qs("#cfg-nome").value = m.nome || "";
    qs("#cfg-slug").value = m.slug || "";
    qs("#cfg-colore").value = m.colore_primario || "#0E5A7A";
    qs("#cfg-colore-hex").value = m.colore_primario || "#0E5A7A";
    qs("#cfg-sfondo").value = m.colore_sfondo || "#ffffff";
    qs("#cfg-sfondo-hex").value = m.colore_sfondo || "#ffffff";
    qs("#cfg-font").value = m.font_family || "";
    qs("#cfg-attivo").checked = !!m.attivo;
    qs("#cfg-attivo-label").textContent = m.attivo ? "Attivo" : "Non attivo";
    qs("#cfg-tracking").checked = !!m.tracking_attivo;
    qs("#cfg-raccolta").checked = !!m.raccolta_dati;
    qs("#raccolta-campi-panel").style.display = m.raccolta_dati ? "block" : "none";

    const campiSalvati = m.raccolta_campi || ["nome","telefono"];
    container.querySelectorAll(".raccolta-campo").forEach(chk => {
      chk.checked = Array.isArray(campiSalvati) && campiSalvati.includes(chk.dataset.campo);
    });

    const caparra = m.caparra_formula || {};
    qs("#cfg-caparra").checked = !!m.caparra_attiva;
    qs("#caparra-panel").style.display = m.caparra_attiva ? "block" : "none";
    qs("#caparra-tipo").value = caparra.tipo || "fisso";
    qs("#caparra-importo").value = caparra.importo || "";
    qs("#caparra-note").value = caparra.note || "";
    qs("#cfg-ordinabile").checked = !!m.ordinabile;
    qs("#ordinabile-panel").style.display = m.ordinabile ? "block" : "none";
    qs("#cfg-luogo-label").value = m.luogo_consegna_label || "Tavolo";
    qs("#cfg-richiedi-orario").checked = m.richiedi_orario_consegna !== false;
    // Cover a slide: usa cover_urls (nuovo, array) se presente, altrimenti
    // ripiega sul vecchio cover_url singolo per non perdere le foto già impostate.
    coverGalleryUrls = Array.isArray(m.cover_urls) && m.cover_urls.length
      ? [...m.cover_urls]
      : (m.cover_url ? [m.cover_url] : []);
    renderCoverGallery();
    if (qs("#cfg-logo-url")) {
      qs("#cfg-logo-url").value = m.logo_url || "";
      const prevL = qs("#cfg-logo-prev");
      if (prevL) prevL.innerHTML = m.logo_url ? '<img src="' + esc(m.logo_url) + '" style="width:48px;height:48px;object-fit:cover;border-radius:50%;border:2px solid #0E5A7A;">' : "";
    }

    aggiornaLinkQR(m.slug || "");
    const slugEl = qs("#cfg-slug");
    if (slugEl) delete slugEl.dataset.manuale;
    qs("#msg-cfg").textContent = "";
  }

  // ── SALVA CONFIG ──────────────────────────────────────────────
  async function salvaConfigMenu() {
    const btn = qs("#btn-salva-cfg");
    const msg = qs("#msg-cfg");
    btn.disabled = true; btn.textContent = "Salvataggio...";
    const caparraAttiva = qs("#cfg-caparra").checked;

    // FIX: lo slug deve essere unico su TUTTA la piattaforma (la pagina
    // pubblica cerca per slug senza filtrare per azienda) — prima non c'era
    // nessun controllo, e due sedi diverse potevano ritrovarsi con lo stesso
    // slug "estate", rompendo il link pubblico di entrambe. Ora, se lo slug
    // scelto è già usato da un ALTRO menu (di questa o di un'altra azienda),
    // ne generiamo automaticamente uno libero aggiungendo un numero.
    let slugFinale = qs("#cfg-slug").value.trim() || makeSlug(qs("#cfg-nome").value);
    if (slugFinale) {
      let tentativo = slugFinale;
      let suffisso = 2;
      while (true) {
        const { data: esistente } = await supa().from("menu").select("id").eq("slug", tentativo).neq("id", menuAttivo.id).maybeSingle();
        if (!esistente) break;
        tentativo = `${slugFinale}-${suffisso}`;
        suffisso++;
      }
      if (tentativo !== slugFinale) {
        slugFinale = tentativo;
        qs("#cfg-slug").value = slugFinale;
        msg.innerHTML = `<span style="color:#f59e0b;">⚠️ Slug già in uso da un altro menu — cambiato in "${slugFinale}"</span>`;
      }
    }

    const { error } = await supa().from("menu").update({
      nome:            qs("#cfg-nome").value.trim(),
      slug:            slugFinale || null,
      colore_primario: qs("#cfg-colore-hex").value || null,
      colore_sfondo:   qs("#cfg-sfondo-hex").value || null,
      font_family:     qs("#cfg-font").value || null,
      attivo:          qs("#cfg-attivo").checked,
      cover_url:       coverGalleryUrls[0] || null,
      cover_urls:      coverGalleryUrls,
      logo_url:        qs("#cfg-logo-url")?.value.trim() || null,
      tracking_attivo: qs("#cfg-tracking").checked,
      raccolta_dati:   qs("#cfg-raccolta").checked,
      raccolta_campi:  Array.from(container.querySelectorAll(".raccolta-campo:checked")).map(c => c.dataset.campo),
      caparra_attiva:  caparraAttiva,
      caparra_formula: caparraAttiva ? { tipo: qs("#caparra-tipo").value, importo: parseFloat(qs("#caparra-importo").value)||0, note: qs("#caparra-note").value.trim() } : null,
      ordinabile: qs("#cfg-ordinabile").checked,
      luogo_consegna_label: qs("#cfg-luogo-label").value,
      richiedi_orario_consegna: qs("#cfg-richiedi-orario").checked
    }).eq("id", menuAttivo.id).eq("azienda_id", azienda_id);
    btn.disabled = false; btn.textContent = "💾 Salva configurazione";
    if (error) { msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`; return; }
    if (!msg.innerHTML) msg.innerHTML = `<span style="color:#16a34a;">✅ Salvato</span>`;
    await loadMenus();
    menuAttivo = menus.find(m => m.id === menuAttivo.id);
    renderTabsMenu();
    setTimeout(() => msg.innerHTML = "", 4000);
  }

  // ── RENDER CAT SX ─────────────────────────────────────────────
  function renderCatSx(filter = "") {
    const box = qs("#lista-cat-sx");
    const nelMenu = new Set(menuCategorie.map(mc => mc.categoria_vendita_id).filter(Boolean));
    const filtered = catVendita.filter(c => !filter || c.nome?.toLowerCase().includes(filter.toLowerCase()));

    if (!filtered.length) {
      box.innerHTML = `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:20px;">Nessuna categoria</div>`;
      return;
    }

    box.innerHTML = filtered.map(c => `
      <div class="cat-sx-item" draggable="true" data-id="${c.id}" style="opacity:${nelMenu.has(c.id)?".5":"1"};">
        ${c.immagine_url
          ? `<img src="${esc(c.immagine_url)}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
          : `<div style="width:36px;height:36px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">📂</div>`}
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.nome)}</div>
          ${c.descrizione?`<div style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.descrizione)}</div>`:""}
        </div>
        ${nelMenu.has(c.id)?`<span style="font-size:10px;color:#16a34a;font-weight:700;">✓</span>`:`<span style="font-size:16px;color:#d1d5db;">⠿</span>`}
      </div>`).join("");

    box.querySelectorAll(".cat-sx-item").forEach(el => {
      el.addEventListener("dragstart", (e) => {
        dragSrcId = el.dataset.id;
        el.classList.add("dragging");
        e.dataTransfer.effectAllowed = "copy";
      });
      el.addEventListener("dragend", () => { el.classList.remove("dragging"); dragSrcId = null; });
      el.addEventListener("dblclick", () => aggiungiCategoria(el.dataset.id));
    });
  }

  // ── RENDER CAT CENTRO ────────────────────────────────────────
  function renderCatCentro() {
    const lista = qs("#lista-cat-centro");
    const empty = qs("#centro-empty");
    const dropzone = qs("#centro-dropzone");

    empty.style.display = menuCategorie.length ? "none" : "flex";

    lista.innerHTML = menuCategorie.map(mc => {
      const catV = catVendita.find(c => c.id === mc.categoria_vendita_id);
      const isActive = catSelezionata?.id === mc.id;
      return `
        <div class="cat-centro-item ${isActive?"active":""}" data-mc-id="${mc.id}" draggable="true">
          <span class="cat-drag-handle" onclick="event.stopPropagation()" style="cursor:grab;color:#cbd5e1;font-size:16px;flex-shrink:0;user-select:none;">⠿</span>
          ${catV?.immagine_url
            ?`<img src="${esc(catV.immagine_url)}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
            :`<div style="width:40px;height:40px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">📂</div>`}
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(mc.nome)}</div>
            ${mc.ora_inizio?`<div style="font-size:10px;color:#0E5A7A;font-weight:700;">⏰ ${mc.ora_inizio}–${mc.ora_fine}</div>`:""}
            <div style="font-size:11px;color:#94a3b8;">${(tutteLeVoci[mc.id]||[]).length} portate</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0;">
            <label class="toggle-switch" style="width:28px;height:16px;" onclick="event.stopPropagation()">
              <input type="checkbox" class="toggle-cat-centro" data-mc-id="${mc.id}" ${mc.attivo!==false?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
            <div style="display:flex;gap:4px;">
              <button class="btn-cfg-cat mb-btn mb-btn-sec" data-mc-id="${mc.id}" style="padding:3px 7px;font-size:11px;">⚙️</button>
              <button class="btn-rm-cat mb-btn mb-btn-danger" data-mc-id="${mc.id}" style="padding:3px 7px;font-size:11px;">✕</button>
            </div>
          </div>
        </div>`;
    }).join("");

    // Click → portate (solo su area non-button)
    lista.querySelectorAll(".cat-centro-item").forEach(el => {
      el.addEventListener("click", (e) => {
        if (e.target.closest("button") || e.target.closest("label") || e.target.closest("input")) return;
        const mc = menuCategorie.find(m => m.id === el.dataset.mcId);
        if (mc) selezionaCategoriaCentro(mc);
      });
    });

    // Toggle
    lista.querySelectorAll(".toggle-cat-centro").forEach(chk => {
      chk.addEventListener("change", async (e) => {
        e.stopPropagation();
        await supa().from("menu_categorie").update({ attivo: chk.checked }).eq("id", chk.dataset.mcId).eq("azienda_id", azienda_id);
        await loadMenuCategorie(menuAttivo.id);
        renderCatCentro();
      });
    });

    // Rimuovi — FIX: uso data-mc-id
    lista.querySelectorAll(".btn-rm-cat").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const mcId = btn.dataset.mcId;
        if (!confirm("Rimuovere questa categoria dal menu?")) return;
        // Prima elimina le voci
        const { error: e1 } = await supa().from("menu_voci")
          .delete()
          .eq("categoria_id", mcId)
          .eq("menu_id", menuAttivo.id)
          .eq("azienda_id", azienda_id);
        if (e1) { console.error("Errore delete voci:", e1); }
        // Poi elimina la categoria dal menu
        const { error: e2 } = await supa().from("menu_categorie")
          .delete()
          .eq("id", mcId)
          .eq("azienda_id", azienda_id);
        if (e2) { console.error("Errore delete categoria:", e2); alert("Errore: " + e2.message); return; }
        if (catSelezionata?.id === mcId) renderDxPlaceholder();
        await loadMenuCategorie(menuAttivo.id);
        await loadTutteLeVoci();
        renderCatCentro();
        renderCatSx(qs("#search-cat-sx").value);
      });
    });

    // Cfg categoria
    lista.querySelectorAll(".btn-cfg-cat").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const mc = menuCategorie.find(m => m.id === btn.dataset.mcId);
        if (mc) aprireModalCfgCat(mc);
      });
    });

    // Dropzone
    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add("drag-over"); };
    dropzone.ondragleave = () => dropzone.classList.remove("drag-over");
    dropzone.ondrop = async (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      if (dragSrcId) await aggiungiCategoria(dragSrcId);
    };

    // Riordino categorie nel menu (drag & drop)
    let catDragSrc = null;
    lista.querySelectorAll(".cat-centro-item").forEach(row => {
      row.addEventListener("dragstart", (e) => {
        catDragSrc = row;
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.stopPropagation();
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        lista.querySelectorAll(".cat-centro-item").forEach(r => r.classList.remove("drag-over"));
      });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (row === catDragSrc) return;
        lista.querySelectorAll(".cat-centro-item").forEach(r => r.classList.remove("drag-over"));
        row.classList.add("drag-over");
      });
      row.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!catDragSrc || catDragSrc === row) return;
        row.classList.remove("drag-over");
        const rows = [...lista.querySelectorAll(".cat-centro-item")];
        const srcIdx = rows.indexOf(catDragSrc), dstIdx = rows.indexOf(row);
        if (srcIdx < dstIdx) lista.insertBefore(catDragSrc, row.nextSibling);
        else lista.insertBefore(catDragSrc, row);
        const nuovoOrdine = [...lista.querySelectorAll(".cat-centro-item")].map((r, i) => ({ id: r.dataset.mcId, ordine: i }));
        nuovoOrdine.forEach(({ id, ordine }) => {
          const mc = menuCategorie.find(m => m.id === id);
          if (mc) mc.ordine = ordine;
        });
        menuCategorie.sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
        await Promise.all(nuovoOrdine.map(({ id, ordine }) =>
          supa().from("menu_categorie").update({ ordine }).eq("id", id).eq("azienda_id", azienda_id)
        ));
      });
    });
  }

  // ── AGGIUNGI CATEGORIA ────────────────────────────────────────
  async function aggiungiCategoria(catVenditaId) {
    if (menuCategorie.some(mc => mc.categoria_vendita_id === catVenditaId)) return;
    const catV = catVendita.find(c => c.id === catVenditaId);
    if (!catV) return;
    const { error } = await supa().from("menu_categorie").insert({
      azienda_id, menu_id: menuAttivo.id,
      categoria_vendita_id: catVenditaId,
      nome: catV.nome,
      descrizione: catV.descrizione || null,
      immagine_url: catV.immagine_url || null,
      ordine: menuCategorie.length,
      attivo: true, visibile: true
    });
    if (error) { console.error(error); return; }
    await loadMenuCategorie(menuAttivo.id);
    await loadTutteLeVoci();
    renderCatCentro();
    renderCatSx(qs("#search-cat-sx").value);
  }

  // ── SELEZIONA CATEGORIA CENTRO ────────────────────────────────
  async function selezionaCategoriaCentro(mc) {
    catSelezionata = mc;
    if (mc.categoria_vendita_id) await loadProdottiVendita(mc.categoria_vendita_id);
    else prodottiVendita = [];
    await loadMenuVoci(mc.id);
    renderCatCentro();
    qs("#dx-placeholder").style.display = "none";
    qs("#dx-content").style.display = "flex";
    qs("#dx-cat-nome").textContent = mc.nome;
    renderProdottiDx();
    // Aggiorna mockup se tab mockup è aperto
    const mockupTab = qs("#dx-tab-mockup");
    if (mockupTab && mockupTab.style.display !== "none") renderMockupCompleto();
  }

  // ── RENDER DX PLACEHOLDER ─────────────────────────────────────
  function renderDxPlaceholder() {
    catSelezionata = null;
    qs("#dx-placeholder").style.display = "flex";
    qs("#dx-content").style.display = "none";
  }

  // ── RENDER PRODOTTI DX (solo ciò che è già nel menu) ───────────
  function renderProdottiDx() {
    const box = qs("#lista-prodotti-dx");
    if (!box) return;

    const rigaHtml = (p) => {
      const voce = menuVoci.find(v => String(v.prodotto_vendita_id) === String(p.id));
      const prezzoDisplay = voce?.prezzo_override || voce?.prezzo || p.prezzo_base || 0;
      const fc = voce?.food_cost_snapshot || null;
      const margine = fc && prezzoDisplay > 0 ? ((prezzoDisplay - fc) / prezzoDisplay * 100) : null;
      return `
        <div class="prodotto-row nel-menu" data-prod-id="${p.id}" data-voce-ordine-id="${voce.id}" draggable="true">
          <span class="prod-drag-handle" onclick="event.stopPropagation()" style="cursor:grab;color:#86efac;font-size:16px;flex-shrink:0;user-select:none;">⠿</span>
          ${(p.foto_url||p.immagine_url)
            ?`<img src="${esc(p.foto_url||p.immagine_url)}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
            :`<div style="width:44px;height:44px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🍽️</div>`}
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.nome)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
              ${prezzoDisplay?`<span style="font-size:13px;font-weight:800;color:#0E5A7A;">€${Number(prezzoDisplay).toFixed(2)}</span>`:""}
              ${margine!==null?`<span style="font-size:10px;font-weight:700;color:${margine>60?"#16a34a":margine>40?"#f59e0b":"#dc2626"};">📊 ${margine.toFixed(0)}%</span>`:""}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button class="btn-edit-voce mb-btn mb-btn-sec" data-voce-id="${voce.id}" data-prod-id="${p.id}" style="font-size:11px;padding:4px 8px;">✏️</button>
            <button class="btn-rm-voce mb-btn mb-btn-danger" data-voce-id="${voce.id}" style="font-size:11px;padding:4px 8px;">✕</button>
          </div>
        </div>`;
    };

    const inMenuOrdinati = menuVoci
      .map(v => prodottiVendita.find(p => String(p.id) === String(v.prodotto_vendita_id)))
      .filter(Boolean);

    if (!inMenuOrdinati.length) {
      box.innerHTML = `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:30px 10px;">Nessuna portata ancora nel menu.<br>Cercala qui sopra per aggiungerla.</div>`;
      return;
    }

    box.innerHTML = `<div style="font-size:11px;font-weight:700;color:#16a34a;margin:2px 0 6px;text-transform:uppercase;">✓ Nel menu (${inMenuOrdinati.length}) — trascina per riordinare</div>` + inMenuOrdinati.map(rigaHtml).join("");

    box.querySelectorAll(".btn-rm-voce").forEach(btn => { btn.onclick = () => rimuoviVoce(btn.dataset.voceId); });
    box.querySelectorAll(".btn-edit-voce").forEach(btn => { btn.onclick = () => aprireModalVoce(btn.dataset.voceId, btn.dataset.prodId); });

    // Riordino prodotti nel menu (drag & drop)
    let prodDragSrc = null;
    box.querySelectorAll(".prodotto-row.nel-menu").forEach(row => {
      row.addEventListener("dragstart", (e) => {
        prodDragSrc = row;
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        box.querySelectorAll(".prodotto-row.nel-menu").forEach(r => r.classList.remove("drag-over"));
      });
      row.addEventListener("dragover", (e) => {
        if (!prodDragSrc) return;
        e.preventDefault();
        box.querySelectorAll(".prodotto-row.nel-menu").forEach(r => r.classList.remove("drag-over"));
        row.classList.add("drag-over");
      });
      row.addEventListener("drop", async (e) => {
        e.preventDefault();
        if (!prodDragSrc || prodDragSrc === row) return;
        row.classList.remove("drag-over");
        const rows = [...box.querySelectorAll(".prodotto-row.nel-menu")];
        const srcIdx = rows.indexOf(prodDragSrc), dstIdx = rows.indexOf(row);
        if (srcIdx < dstIdx) prodDragSrc.parentNode.insertBefore(prodDragSrc, row.nextSibling);
        else prodDragSrc.parentNode.insertBefore(prodDragSrc, row);
        const nuovoOrdine = [...box.querySelectorAll(".prodotto-row.nel-menu")].map((r, i) => ({ id: r.dataset.voceOrdineId, ordine: i }));
        nuovoOrdine.forEach(({ id, ordine }) => {
          const v = menuVoci.find(x => String(x.id) === String(id));
          if (v) v.ordine = ordine;
        });
        menuVoci.sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
        await Promise.all(nuovoOrdine.map(({ id, ordine }) =>
          supa().from("menu_voci").update({ ordine }).eq("id", id).eq("azienda_id", azienda_id)
        ));
      });
    });
  }

  // ── DROPDOWN RICERCA PER AGGIUNGERE PORTATA ────────────────────
  function renderDropdownAggiungi(query) {
    const dd = qs("#dropdown-aggiungi-prodotto");
    if (!dd) return;
    const q = query.trim().toLowerCase();
    if (!q) { dd.style.display = "none"; return; }

    const nelMenu = new Set(menuVoci.map(v => String(v.prodotto_vendita_id)).filter(Boolean));
    const risultati = prodottiVendita
      .filter(p => !nelMenu.has(String(p.id)) && p.nome?.toLowerCase().includes(q))
      .slice(0, 8);

    if (!risultati.length) {
      dd.innerHTML = `<div style="padding:14px;font-size:12px;color:#94a3b8;text-align:center;">Nessuna portata trovata in questa categoria.</div>`;
      dd.style.display = "block";
      return;
    }

    dd.innerHTML = risultati.map(p => `
      <div class="dd-add-item" data-prod-id="${p.id}" style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;">
        ${(p.foto_url||p.immagine_url)
          ?`<img src="${esc(p.foto_url||p.immagine_url)}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
          :`<div style="width:36px;height:36px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">🍽️</div>`}
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.nome)}</div>
          ${p.prezzo_base?`<div style="font-size:11px;color:#0E5A7A;font-weight:700;">€${Number(p.prezzo_base).toFixed(2)}</div>`:""}
        </div>
        <span style="color:#16a34a;font-size:18px;flex-shrink:0;">+</span>
      </div>
    `).join("");
    dd.style.display = "block";

    dd.querySelectorAll(".dd-add-item").forEach(item => {
      item.onmouseenter = () => { item.style.background = "#f0fdf4"; };
      item.onmouseleave = () => { item.style.background = ""; };
      item.onclick = async () => {
        await aggiungiVoce(item.dataset.prodId);
        qs("#search-aggiungi-prodotto").value = "";
        dd.style.display = "none";
      };
    });
  }

  // ── AGGIUNGI/RIMUOVI VOCE ─────────────────────────────────────
  async function aggiungiVoce(prodId) {
    const prod = prodottiVendita.find(p => String(p.id) === String(prodId));
    if (!prod) return;
    const prezzo = prod.prezzo_base || prod.prezzo || 0;
    const fc = prod.food_cost || prod.costo_totale || null;
    await supa().from("menu_voci").insert({
      azienda_id, menu_id: menuAttivo.id, categoria_id: catSelezionata.id,
      prodotto_vendita_id: prodId, nome: prod.nome,
      descrizione: prod.descrizione || null, prezzo: Number(prezzo),
      foto_url: prod.foto_url || prod.immagine_url || null,
      food_cost_snapshot: fc, disponibile: true, visibile: true, attivo: true,
      ordine: menuVoci.length, alert_food_cost: fc && prezzo > 0 ? (fc/prezzo) > 0.4 : false
    });
    await loadMenuVoci(catSelezionata.id);
    await loadTutteLeVoci();
    renderProdottiDx();
    renderCatCentro();
  }

  async function rimuoviVoce(voceId) {
    if (!confirm("Rimuovere dal menu?")) return;
    const { error: rmErr } = await supa().from("menu_voci").delete().eq("id", voceId);
    if (rmErr) { console.error("Errore rimozione voce:", rmErr); alert("Errore: " + rmErr.message); return; }
    await loadMenuVoci(catSelezionata.id);
    await loadTutteLeVoci();
    renderProdottiDx();
    renderCatCentro();
  }

  // ── MODAL VOCE ────────────────────────────────────────────────
  function aprireModalVoce(voceId, prodId) {
    const voce = menuVoci.find(v => String(v.id) === String(voceId));
    const prod = prodottiVendita.find(p => String(p.id) === String(prodId));
    if (!voce) return;
    qs("#modal-voce-title").textContent = `✏️ ${voce.nome}`;
    const fc = voce.food_cost_snapshot;
    qs("#modal-voce-body").innerHTML = `
      <div style="margin-bottom:12px;">
        <label class="mb-label">Prezzo nel menu (€)</label>
        <input id="voce-prezzo-edit" type="number" step="0.01" class="mb-input" value="${voce.prezzo_override||voce.prezzo||""}">
        ${prod?.prezzo_base?`<div style="font-size:11px;color:#94a3b8;margin-top:4px;">Prezzo base: €${Number(prod.prezzo_base).toFixed(2)}</div>`:""}
      </div>
      ${fc?`<div id="fc-live-edit" style="background:#f0fdf4;border-radius:10px;padding:10px;margin-bottom:12px;font-size:12px;"><strong>📊 Food cost: €${Number(fc).toFixed(2)}</strong><br><span id="fc-margine-edit" style="font-weight:700;"></span></div>`:""}
      <div style="margin-bottom:12px;">
        <label class="mb-label">Foto portata</label>
        <div id="voce-foto-prev" style="width:100%;height:110px;border-radius:10px;background:${voce.foto_url?`url('${esc(voce.foto_url)}') center/cover`:"#f3f4f6"};display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;margin-bottom:6px;border:1px solid #e5e7eb;">${voce.foto_url?"":"Nessuna foto"}</div>
        <input id="voce-foto-file" type="file" class="mb-input" accept="image/png,image/jpeg,image/jpg">
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">📐 Consigliato: 1200×900px (formato 4:3) — il piatto si vede meglio se fotografato leggermente dall'alto</div>
        <div id="voce-foto-status" style="font-size:11px;color:#64748b;margin-top:4px;"></div>
        <input id="voce-foto-edit" type="hidden" value="${esc(voce.foto_url||"")}">
      </div>
      <div style="margin-bottom:12px;"><label class="mb-label">Descrizione nel menu</label><textarea id="voce-desc-edit" class="mb-input" style="min-height:60px;resize:vertical;">${esc(voce.descrizione||"")}</textarea></div>
      <div style="margin-bottom:12px;">
        <label class="mb-label">Etichette (compaiono nel dettaglio del piatto)</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">
          ${[
            ["vegetariano","🌱 Vegetariano"],["vegano","🥦 Vegano"],["senza_glutine","🌾 Senza glutine"],
            ["senza_lattosio","🥛 Senza lattosio"],["piccante","🌶️ Piccante"],["chef","⭐ Consiglio dello chef"]
          ].map(([id,label]) => `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;"><input type="checkbox" class="voce-tag-check" value="${id}" ${(voce.tags||[]).includes(id)?"checked":""} style="accent-color:#0E5A7A;"> ${label}</label>`).join("")}
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" id="voce-disp-edit" ${voce.disponibile!==false?"checked":""} style="accent-color:#0E5A7A;"> Disponibile</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" id="voce-vis-edit" ${voce.visibile!==false?"checked":""} style="accent-color:#0E5A7A;"> Visibile</label>
      </div>
      <button id="btn-salva-voce-edit" class="mb-btn mb-btn-primary" style="width:100%;">💾 Salva</button>
      <div id="msg-voce-edit" style="margin-top:8px;font-size:12px;text-align:center;"></div>
    `;
    if (fc) {
      const prezzoInput = qs("#voce-prezzo-edit");
      const updateFC = () => {
        const p = parseFloat(prezzoInput.value);
        if (!p || p <= 0) return;
        const m = ((p - fc) / p * 100);
        const el = qs("#fc-margine-edit");
        if (el) { el.textContent = `Margine: €${(p-fc).toFixed(2)} (${m.toFixed(0)}%)`; el.style.color = m>60?"#16a34a":m>40?"#f59e0b":"#dc2626"; }
      };
      prezzoInput.oninput = updateFC; updateFC();
    }
    qs("#voce-foto-file").onchange = async function() {
      const file = this.files[0]; if (!file) return;
      const status = qs("#voce-foto-status");
      const prev = qs("#voce-foto-prev");
      const localUrl = URL.createObjectURL(file);
      prev.style.background = `url('${localUrl}') center/cover`;
      prev.innerText = "";
      status.textContent = "⏳ Caricamento in corso...";
      status.style.color = "#64748b";
      const ext = file.name.split(".").pop() || "jpg";
      const path = azienda_id + "/voce-" + voceId + "-" + Date.now() + "." + ext;
      const { error } = await supa().storage.from("media-aziende").upload(path, file, { upsert: true, contentType: file.type });
      if (error) { status.textContent = "❌ Errore upload: " + error.message; status.style.color = "#dc2626"; return; }
      const { data: pub } = supa().storage.from("media-aziende").getPublicUrl(path);
      qs("#voce-foto-edit").value = pub.publicUrl;
      status.textContent = "✅ Foto caricata";
      status.style.color = "#16a34a";
    };
    qs("#btn-salva-voce-edit").onclick = async () => {
      const prezzo = parseFloat(qs("#voce-prezzo-edit").value);
      const tagsSelezionati = Array.from(container.querySelectorAll(".voce-tag-check:checked")).map(c => c.value);
      const { error } = await supa().from("menu_voci").update({
        prezzo_override: prezzo||null, prezzo: prezzo||voce.prezzo,
        foto_url: qs("#voce-foto-edit").value.trim()||null,
        descrizione: qs("#voce-desc-edit").value.trim()||null,
        tags: tagsSelezionati,
        disponibile: qs("#voce-disp-edit").checked,
        visibile: qs("#voce-vis-edit").checked
      }).eq("id", voceId).eq("azienda_id", azienda_id);
      const msg = qs("#msg-voce-edit");
      if (error) { msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`; return; }
      msg.innerHTML = `<span style="color:#16a34a;">✅ Salvato</span>`;
      await loadMenuVoci(catSelezionata.id);
      await loadTutteLeVoci();
      renderProdottiDx();
      setTimeout(() => chiudiModalVoce(), 800);
    };
    qs("#modal-voce").style.display = "flex";
  }

  function chiudiModalVoce() { qs("#modal-voce").style.display = "none"; }

  // ── MODAL CFG CATEGORIA ───────────────────────────────────────
  async function aprireModalCfgCat(mc) {
    qs("#modal-voce-title").textContent = `⚙️ ${mc.nome}`;
    // Carica settori per il selettore display
    const { data: settoriDisp } = await supa().from("settori").select("id,nome,colore").eq("azienda_id", azienda_id).order("ordine");
    const settoriOpts = (settoriDisp || []).map(s => `<option value="${s.id}" ${mc.settore_id === s.id ? "selected" : ""}>${esc(s.nome)}</option>`).join("");

    qs("#modal-voce-body").innerHTML = `
      <div style="margin-bottom:12px;"><label class="mb-label">Nome</label><input id="cfg-cat-nome" class="mb-input" value="${esc(mc.nome)}"></div>
      <div style="margin-bottom:12px;"><label class="mb-label">Descrizione</label><input id="cfg-cat-desc" class="mb-input" value="${esc(mc.descrizione||"")}"></div>
      <div style="margin-bottom:12px;">
        <label class="mb-label">📷 Foto categoria — compare nella lista, anche chiusa</label>
        <div id="cfg-cat-foto-prev" style="width:100%;height:110px;border-radius:10px;background:${mc.immagine_url?`url('${esc(mc.immagine_url)}') center/cover`:"#f3f4f6"};display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;margin-bottom:6px;border:1px solid #e5e7eb;">${mc.immagine_url?"":"Nessuna foto"}</div>
        <input id="cfg-cat-foto-file" type="file" class="mb-input" accept="image/png,image/jpeg,image/jpg">
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">📐 Consigliato: 1200×600px (formato 2:1, largo) — è mostrata a piena larghezza nella lista</div>
        <div id="cfg-cat-foto-status" style="font-size:11px;color:#64748b;margin-top:4px;"></div>
        <input id="cfg-cat-foto-url" type="hidden" value="${esc(mc.immagine_url||"")}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;">
        <div><label class="mb-label">Visibile dalle ore</label><input id="cfg-cat-ora-ini" type="time" class="mb-input" value="${mc.ora_inizio||""}"></div>
        <div><label class="mb-label">Fino alle ore</label><input id="cfg-cat-ora-fin" type="time" class="mb-input" value="${mc.ora_fine||""}"></div>
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">Lascia vuoto per mostrarla sempre</div>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px;margin-bottom:12px;">
        <label class="mb-label">🖥️ Invia al display/settore cucina</label>
        <div style="font-size:11px;color:#64748b;margin-bottom:6px;">Tutte le portate di questa categoria vengono inviate al display del settore selezionato — più flessibile che assegnare il display prodotto per prodotto</div>
        <select id="cfg-cat-settore" class="mb-input" style="width:100%;">
          <option value="">— Nessun display specifico —</option>
          ${settoriOpts}
        </select>
      </div>
      <button id="btn-salva-cfg-cat" class="mb-btn mb-btn-primary" style="width:100%;">💾 Salva</button>
      <div id="msg-cfg-cat" style="margin-top:8px;font-size:12px;text-align:center;"></div>
    `;
    qs("#cfg-cat-foto-file").onchange = async function() {
      const file = this.files[0]; if (!file) return;
      const status = qs("#cfg-cat-foto-status");
      const prev = qs("#cfg-cat-foto-prev");
      const localUrl = URL.createObjectURL(file);
      prev.style.background = `url('${localUrl}') center/cover`;
      prev.innerText = "";
      status.textContent = "⏳ Caricamento in corso...";
      status.style.color = "#64748b";
      const ext = file.name.split(".").pop() || "jpg";
      const path = azienda_id + "/categoria-" + mc.id + "-" + Date.now() + "." + ext;
      const { error } = await supa().storage.from("media-aziende").upload(path, file, { upsert: true, contentType: file.type });
      if (error) { status.textContent = "❌ Errore upload: " + error.message; status.style.color = "#dc2626"; return; }
      const { data: pub } = supa().storage.from("media-aziende").getPublicUrl(path);
      qs("#cfg-cat-foto-url").value = pub.publicUrl;
      status.textContent = "✅ Foto caricata";
      status.style.color = "#16a34a";
    };
    qs("#btn-salva-cfg-cat").onclick = async () => {
      const settoreId = qs("#cfg-cat-settore").value || null;
      const { error } = await supa().from("menu_categorie").update({
        nome: qs("#cfg-cat-nome").value.trim(),
        descrizione: qs("#cfg-cat-desc").value.trim()||null,
        immagine_url: qs("#cfg-cat-foto-url").value.trim()||null,
        ora_inizio: qs("#cfg-cat-ora-ini").value||null,
        ora_fine: qs("#cfg-cat-ora-fin").value||null,
        settore_id: settoreId,
      }).eq("id", mc.id).eq("azienda_id", azienda_id);
      const msg = qs("#msg-cfg-cat");
      if (error) { msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`; return; }
      msg.innerHTML = `<span style="color:#16a34a;">✅ Salvato</span>`;
      await loadMenuCategorie(menuAttivo.id);
      renderCatCentro();
      setTimeout(() => chiudiModalVoce(), 800);
    };
    qs("#modal-voce").style.display = "flex";
  }

  // ── MOCKUP COMPLETO MENU ──────────────────────────────────────
  function renderMockupCompleto() {
    const box = qs("#mockup-live");
    if (!box) return;
    const colore = menuAttivo?.colore_primario || "#0E5A7A";
    const sfondo = menuAttivo?.colore_sfondo || "#fff";
    const font = menuAttivo?.font_family || "inherit";

    if (!menuCategorie.length) {
      box.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:24px;font-size:12px;">Nessuna categoria nel menu</div>`;
      return;
    }

    let html = `
      <div class="mockup-wrap" style="background:${esc(sfondo)};font-family:${esc(font)};">
        <!-- Header menu -->
        <div style="background:${esc(colore)};padding:16px 14px;text-align:center;">
          ${menuAttivo.logo_url ? `<img src="${esc(menuAttivo.logo_url)}" style="width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,.5);object-fit:cover;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;">` : ""}
          <div style="font-size:16px;font-weight:800;color:#fff;">${esc(menuAttivo.nome)}</div>
          ${menuAttivo.descrizione?`<div style="font-size:11px;color:rgba(255,255,255,.8);margin-top:4px;">${esc(menuAttivo.descrizione)}</div>`:""}
        </div>
    `;

    menuCategorie.forEach(mc => {
      const voci = (tutteLeVoci[mc.id] || []).filter(v => v.visibile !== false);
      if (!voci.length && mc.attivo === false) return;

      html += `
        <div style="border-bottom:1px solid #f3f4f6;">
          <div style="background:${esc(colore)}18;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
            <div style="font-size:14px;font-weight:800;color:${esc(colore)};">${esc(mc.nome)}</div>
            ${mc.attivo===false?`<span style="font-size:10px;font-weight:700;color:#94a3b8;">⏸ Non attiva</span>`:""}
            ${mc.ora_inizio?`<span style="font-size:10px;font-weight:700;color:${esc(colore)};">⏰ ${mc.ora_inizio}–${mc.ora_fine}</span>`:""}
          </div>
          ${voci.length ? voci.map(v => `
            <div class="mockup-voce" style="${!v.disponibile?"opacity:.5;":""}">
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:#111827;">${esc(v.nome)}</div>
                ${v.descrizione?`<div style="font-size:11px;color:#64748b;margin-top:2px;">${esc(v.descrizione)}</div>`:""}
                ${!v.disponibile?`<span style="font-size:10px;font-weight:700;color:#dc2626;">Non disponibile</span>`:""}
              </div>
              <div style="display:flex;align-items:flex-start;gap:6px;flex-shrink:0;margin-left:8px;">
                ${v.foto_url?`<img src="${esc(v.foto_url)}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;">`:""}
                <div style="font-size:14px;font-weight:800;color:${esc(colore)};white-space:nowrap;">€${Number(v.prezzo_override||v.prezzo||0).toFixed(2)}</div>
              </div>
            </div>`).join("")
          : `<div style="padding:12px 14px;font-size:12px;color:#94a3b8;font-style:italic;">Nessuna portata aggiunta</div>`}
        </div>
      `;
    });

    html += `</div>`;
    box.innerHTML = html;
  }

  // ── SWITCH TAB DX ─────────────────────────────────────────────
  function switchDxTab(tab) {
    qs("#dx-tab-portate").style.display = tab === "portate" ? "block" : "none";
    qs("#dx-tab-mockup").style.display  = tab === "mockup"  ? "block" : "none";
    container.querySelectorAll(".dx-tab").forEach(btn => {
      const active = btn.dataset.tab === tab;
      btn.style.background = active ? "#0E5A7A" : "#f1f5f9";
      btn.style.color      = active ? "#fff" : "#374151";
    });
    if (tab === "mockup") renderMockupCompleto();
  }

  // ── MODAL NUOVO MENU ──────────────────────────────────────────
  function aprireModalNuovoMenu() {
    qs("#nuovo-nome").value = "";
    qs("#nuovo-desc").value = "";
    qs("#msg-nuovo").textContent = "";
    qs("#modal-nuovo-menu").style.display = "flex";
  }
  function chiudiModalNuovoMenu() { qs("#modal-nuovo-menu").style.display = "none"; }

  qs("#btn-crea-menu").onclick = async () => {
    const btn = qs("#btn-crea-menu");
    const msg = qs("#msg-nuovo");
    const nome = qs("#nuovo-nome").value.trim();
    if (!nome) { msg.innerHTML = `<span style="color:#dc2626;">Nome obbligatorio</span>`; return; }
    btn.disabled = true; btn.textContent = "Creazione...";
    const { data, error } = await supa().from("menu").insert({
      azienda_id, sede_id: currentSedeId, nome,
      descrizione: qs("#nuovo-desc").value.trim() || null,
      slug: makeSlug(nome), attivo: true
    }).select().single();
    btn.disabled = false; btn.textContent = "🚀 Crea menu";
    if (error) { msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`; return; }
    chiudiModalNuovoMenu();
    await loadMenus();
    renderTabsMenu();
    await selezionaMenu(data);
    aggiornaLinkQR(data.slug || "");
  };

  // ── QR ────────────────────────────────────────────────────────
  function mostraQR(slug) {
    const url = `${BASE_URL}/menu-pubblico.html?slug=${slug}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    const win = window.open("", "_blank", "width=380,height=460");
    win.document.write(`<html><body style="margin:0;display:flex;flex-direction:column;align-items:center;padding:24px;font-family:sans-serif;background:#f8fafc;">
      <h3 style="margin:0 0 16px;">${esc(menuAttivo?.nome||slug)}</h3>
      <img src="${qr}" style="width:260px;height:260px;border-radius:12px;">
      <p style="font-size:11px;color:#666;margin-top:12px;word-break:break-all;text-align:center;max-width:320px;">${url}</p>
      <a href="${qr}" download="qr-${slug}.png" style="margin-top:8px;background:#0E5A7A;color:#fff;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">⬇ Scarica QR</a>
    </body></html>`);
  }

  // ── UTILS ─────────────────────────────────────────────────────
  function aggiornaLinkQR(slug) {
    const liveBox = qs("#link-qr-live");
    const liveUrl = qs("#link-qr-url");
    const liveImg = qs("#link-qr-img");
    const linkBtn = qs("#cfg-link-pub");
    if (!slug?.trim()) {
      if (liveBox) liveBox.style.display = "none";
      if (linkBtn) { linkBtn.href = "#"; linkBtn.style.opacity = ".4"; }
      return;
    }
    const url = `${BASE_URL}/menu-pubblico.html?slug=${encodeURIComponent(slug)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    if (liveBox) liveBox.style.display = "flex";
    if (liveUrl) { liveUrl.href = url; liveUrl.textContent = url; }
    if (liveImg) liveImg.src = qrUrl;
    if (linkBtn) { linkBtn.href = url; linkBtn.style.opacity = "1"; }
  }

  function makeSlug(v) {
    return String(v).toLowerCase()
      .replace(/[àáâã]/g,"a").replace(/[èéê]/g,"e").replace(/[ìíî]/g,"i")
      .replace(/[òóô]/g,"o").replace(/[ùúû]/g,"u")
      .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  }

  function esc(v) {
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
}
