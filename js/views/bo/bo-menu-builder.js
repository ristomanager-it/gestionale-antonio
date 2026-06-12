// js/views/bo/bo-menu-builder.js  v3
const supa = () => window.supabaseClient || window.supabase;
const BUCKET = "media-aziende";
const BASE_URL = "https://app.ristoflow-ai.com";

export async function render(container) {
  const azienda_id = window.state?.azienda?.id;
  const sede_id    = window.state?.sedeAttiva?.id || null;
  const ruolo      = window.state?.ruolo;

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;">Accesso negato</div>`;
    return;
  }

  // ── STATE ─────────────────────────────────────────────────────
  let menus            = [];
  let menuAttivo       = null;
  let catVendita       = [];   // categorie_vendita della sede
  let menuCategorie    = [];   // menu_categorie del menu attivo
  let catSelezionata   = null; // categoria centro selezionata
  let prodottiVendita  = [];   // prodotti_vendita della catSelezionata
  let menuVoci         = [];   // menu_voci della catSelezionata nel menu
  let dragSrcId        = null;

  // ── RENDER SHELL ──────────────────────────────────────────────
  container.innerHTML = `
  <style>
    .mb-input { width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff; }
    .mb-input:focus { border-color:#0E5A7A; }
    .mb-label { font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em; }
    .mb-btn { border:none;border-radius:10px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer; }
    .mb-btn-primary { background:#0E5A7A;color:#fff; }
    .mb-btn-sec { background:#f1f5f9;color:#374151; }
    .mb-btn-danger { background:#fee2e2;color:#dc2626; }
    .mb-btn-green { background:#dcfce7;color:#16a34a; }
    .mb-card { background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:16px; }
    .mb-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700; }
    .cat-dropzone { min-height:120px;border:2px dashed #d1d5db;border-radius:14px;transition:all .15s; }
    .cat-dropzone.drag-over { border-color:#0E5A7A;background:#f0f9ff; }
    .cat-sx-item { padding:10px 12px;border-radius:12px;cursor:grab;border:1px solid #e5e7eb;background:#fff;margin-bottom:6px;display:flex;align-items:center;gap:10px;transition:all .15s; }
    .cat-sx-item:hover { border-color:#0E5A7A;background:#f0f9ff; }
    .cat-sx-item.dragging { opacity:.4; }
    .cat-centro-item { padding:12px;border-radius:12px;border:1.5px solid #e5e7eb;background:#fff;margin-bottom:8px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:10px; }
    .cat-centro-item:hover { border-color:#0E5A7A; }
    .cat-centro-item.active { border-color:#0E5A7A;background:#e0f2fe; }
    .prodotto-row { padding:10px 12px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;margin-bottom:6px;display:flex;align-items:center;gap:10px; }
    .prodotto-row.nel-menu { background:#f0fdf4;border-color:#86efac; }
    .mockup-wrap { background:#f8fafc;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden; }
    .mockup-cat { padding:10px 14px;font-weight:700;font-size:13px;border-bottom:1px solid #f1f5f9;color:#374151; }
    .mockup-voce { padding:8px 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;border-bottom:1px solid #f8fafc; }
    .toggle-switch { position:relative;display:inline-block;width:36px;height:20px; }
    .toggle-switch input { opacity:0;width:0;height:0; }
    .toggle-slider { position:absolute;cursor:pointer;inset:0;background:#d1d5db;border-radius:999px;transition:.2s; }
    .toggle-slider:before { position:absolute;content:"";height:14px;width:14px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s; }
    input:checked + .toggle-slider { background:#0E5A7A; }
    input:checked + .toggle-slider:before { transform:translateX(16px); }
  </style>

  <div style="min-height:100vh;background:#f8fafc;">

    <!-- TOPBAR -->
    <div style="background:#0E5A7A;padding:12px 20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <button id="btn-back" class="mb-btn mb-btn-sec" style="background:rgba(255,255,255,.15);color:#fff;">← Indietro</button>
      <div style="font-size:17px;font-weight:800;color:#fff;flex:1;">🍽️ Menu Builder</div>
      <button id="btn-nuovo-menu" class="mb-btn" style="background:#fff;color:#0E5A7A;font-weight:800;">+ Nuovo menu</button>
    </div>

    <!-- TABS MENU -->
    <div style="background:#fff;border-bottom:1px solid #e5e7eb;padding:0 20px;display:flex;gap:4px;overflow-x:auto;" id="tabs-menu"></div>

    <!-- PLACEHOLDER -->
    <div id="placeholder-nessun-menu" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;color:#94a3b8;gap:12px;text-align:center;">
      <div style="font-size:48px;">🍽️</div>
      <div style="font-size:16px;font-weight:700;">Nessun menu</div>
      <div style="font-size:13px;">Crea il tuo primo menu digitale</div>
    </div>

    <!-- EDITOR MENU -->
    <div id="editor-menu" style="display:none;">

      <!-- HEADER CONFIGURAZIONE -->
      <div style="padding:16px 20px;background:#fff;border-bottom:1px solid #e5e7eb;" id="header-config">

        <!-- ROW 1: nome, slug, link, QR -->
        <div style="display:grid;grid-template-columns:1fr 1fr auto auto;gap:10px;align-items:end;margin-bottom:12px;flex-wrap:wrap;">
          <div>
            <label class="mb-label">Nome menu</label>
            <input id="cfg-nome" class="mb-input" placeholder="Es. Menu Cena">
          </div>
          <div>
            <label class="mb-label">Slug (URL pubblico)</label>
            <div style="display:flex;gap:6px;">
              <input id="cfg-slug" class="mb-input" placeholder="menu-cena">
              <button id="btn-gen-slug" class="mb-btn mb-btn-sec" style="white-space:nowrap;padding:9px 10px;" title="Genera da nome">🔄</button>
            </div>
          </div>
          <a id="cfg-link-pub" href="#" target="_blank" class="mb-btn mb-btn-primary" style="text-decoration:none;white-space:nowrap;">🔗 Apri</a>
          <button id="btn-qr" class="mb-btn mb-btn-sec">📷 QR</button>
        </div>
        <!-- Link e QR live -->
        <div id="link-qr-live" style="display:none;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:10px 14px;margin-top:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:10px;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">Link pubblico</div>
            <a id="link-qr-url" href="#" target="_blank" style="font-size:12px;color:#0E5A7A;font-weight:700;word-break:break-all;text-decoration:none;"></a>
          </div>
          <img id="link-qr-img" src="" style="width:64px;height:64px;border-radius:8px;cursor:pointer;flex-shrink:0;" title="Clicca per ingrandire">
        </div>

        <!-- ROW 2: colori, font, stato -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:12px;">
          <div>
            <label class="mb-label">Colore brand</label>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="color" id="cfg-colore" value="#0E5A7A" style="width:40px;height:36px;border:1.5px solid #e2e8f0;border-radius:8px;cursor:pointer;padding:2px;">
              <input id="cfg-colore-hex" class="mb-input" style="width:90px;" value="#0E5A7A">
            </div>
          </div>
          <div>
            <label class="mb-label">Colore sfondo</label>
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
              <option value="'Roboto',sans-serif">Roboto</option>
              <option value="'Georgia',serif">Georgia</option>
            </select>
          </div>
          <div>
            <label class="mb-label">Stato</label>
            <div style="display:flex;align-items:center;gap:8px;height:36px;">
              <label class="toggle-switch">
                <input type="checkbox" id="cfg-attivo">
                <span class="toggle-slider"></span>
              </label>
              <span id="cfg-attivo-label" style="font-size:13px;font-weight:700;color:#374151;">Attivo</span>
            </div>
          </div>
        </div>

        <!-- ROW 3: tracking, caparra, raccolta dati -->
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
              <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;">Campi da richiedere</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                ${[
                  {id:"nome",label:"Nome"},
                  {id:"cognome",label:"Cognome"},
                  {id:"telefono",label:"Telefono"},
                  {id:"email",label:"Email"},
                  {id:"tavolo",label:"Numero tavolo"},
                  {id:"data_nascita",label:"Data di nascita"},
                  {id:"cap",label:"CAP"},
                  {id:"citta",label:"Città"},
                  {id:"note",label:"Note libere"},
                  {id:"consenso_marketing",label:"Consenso marketing"}
                ].map(f => `
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;padding:4px 0;">
                    <input type="checkbox" class="raccolta-campo" data-campo="${f.id}" style="accent-color:#0E5A7A;">
                    ${f.label}
                  </label>
                `).join("")}
              </div>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;">
            <input type="checkbox" id="cfg-caparra" style="accent-color:#0E5A7A;width:16px;height:16px;">
            💳 Caparra richiesta
          </label>
        </div>

        <!-- Caparra formula (visibile solo se caparra attiva) -->
        <div id="caparra-panel" style="display:none;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;margin-bottom:12px;">
          <div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:8px;">💳 Formula caparra</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <div>
              <label class="mb-label">Tipo</label>
              <select id="caparra-tipo" class="mb-input">
                <option value="fisso">Importo fisso (€)</option>
                <option value="persona">Per persona (€/p)</option>
                <option value="percentuale">Percentuale (%)</option>
              </select>
            </div>
            <div>
              <label class="mb-label">Importo</label>
              <input id="caparra-importo" type="number" class="mb-input" placeholder="10" min="0" step="0.01">
            </div>
            <div>
              <label class="mb-label">Note</label>
              <input id="caparra-note" class="mb-input" placeholder="Es. Non rimborsabile">
            </div>
          </div>
        </div>

        <button id="btn-salva-cfg" class="mb-btn mb-btn-primary" style="width:100%;">💾 Salva configurazione menu</button>
        <div id="msg-cfg" style="margin-top:8px;font-size:12px;text-align:center;"></div>
      </div>

      <!-- CORPO 3 COLONNE -->
      <div style="display:grid;grid-template-columns:260px 1fr 320px;min-height:calc(100vh - 280px);gap:0;">

        <!-- SX: CATEGORIE SEDE -->
        <div style="background:#fff;border-right:1px solid #e5e7eb;overflow-y:auto;">
          <div style="padding:12px;border-bottom:1px solid #f1f5f9;position:sticky;top:0;background:#fff;z-index:5;">
            <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Categorie sede</div>
            <input id="search-cat-sx" class="mb-input" placeholder="Cerca categoria..." style="font-size:12px;">
          </div>
          <div id="lista-cat-sx" style="padding:10px;"></div>
        </div>

        <!-- CENTRO: COMPOSIZIONE MENU -->
        <div style="background:#f8fafc;overflow-y:auto;padding:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div style="font-size:13px;font-weight:800;color:#374151;">Composizione menu</div>
            <div style="font-size:11px;color:#94a3b8;">Trascina le categorie da sinistra</div>
          </div>
          <div id="centro-dropzone" class="cat-dropzone" style="padding:12px;">
            <div id="lista-cat-centro" style="min-height:80px;"></div>
            <div id="centro-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;color:#94a3b8;gap:8px;text-align:center;">
              <div style="font-size:28px;">👈</div>
              <div style="font-size:12px;font-weight:600;">Trascina qui le categorie</div>
            </div>
          </div>
        </div>

        <!-- DX: PORTATE + MOCKUP -->
        <div style="background:#fff;border-left:1px solid #e5e7eb;overflow-y:auto;">
          <div id="dx-placeholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;color:#94a3b8;gap:8px;text-align:center;">
            <div style="font-size:28px;">👆</div>
            <div style="font-size:12px;font-weight:600;">Seleziona una categoria</div>
          </div>
          <div id="dx-content" style="display:none;">
            <div style="padding:12px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:#fff;z-index:5;">
              <div style="font-size:13px;font-weight:800;color:#374151;" id="dx-cat-nome">Portate</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Seleziona i prodotti da includere nel menu</div>
            </div>

            <!-- TABS DX -->
            <div style="display:flex;gap:4px;padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
              <button class="dx-tab mb-btn" data-tab="portate" style="font-size:12px;padding:6px 12px;background:#0E5A7A;color:#fff;">Portate</button>
              <button class="dx-tab mb-btn mb-btn-sec" data-tab="mockup" style="font-size:12px;padding:6px 12px;">👁️ Anteprima</button>
            </div>

            <div id="dx-tab-portate" style="padding:10px;">
              <input id="search-prodotti" class="mb-input" placeholder="Cerca prodotto..." style="margin-bottom:8px;font-size:12px;">
              <div id="lista-prodotti-dx"></div>
            </div>

            <div id="dx-tab-mockup" style="display:none;padding:10px;">
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

    <!-- MODAL GESTIONE VOCE -->
    <div id="modal-voce" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:20px;padding:24px;width:min(480px,95vw);box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-size:16px;font-weight:800;" id="modal-voce-title">Configura prodotto</div>
          <button id="chiudi-modal-voce" class="mb-btn mb-btn-sec" style="width:36px;height:36px;padding:0;">✕</button>
        </div>
        <div id="modal-voce-body"></div>
      </div>
    </div>

  </div>
  `;

  // ── BIND FISSI ────────────────────────────────────────────────
  document.getElementById("btn-back").onclick = () => window.location.hash = "#/home";
  document.getElementById("btn-nuovo-menu").onclick = () => aprireModalNuovoMenu();
  document.getElementById("chiudi-modal-nuovo").onclick = () => chiudiModalNuovoMenu();
  document.getElementById("chiudi-modal-voce").onclick = () => chiudiModalVoce();

  document.getElementById("modal-nuovo-menu").onclick = (e) => {
    if (e.target === e.currentTarget) chiudiModalNuovoMenu();
  };
  document.getElementById("modal-voce").onclick = (e) => {
    if (e.target === e.currentTarget) chiudiModalVoce();
  };

  // Color pickers
  ["colore","sfondo"].forEach(k => {
    const picker = document.getElementById(`cfg-${k}`);
    const hex    = document.getElementById(`cfg-${k}-hex`);
    picker.oninput = () => hex.value = picker.value;
    hex.oninput   = () => { if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) picker.value = hex.value; };
  });

  document.getElementById("cfg-attivo").onchange = (e) => {
    document.getElementById("cfg-attivo-label").textContent = e.target.checked ? "Attivo" : "Non attivo";
  };

  document.getElementById("cfg-caparra").onchange = (e) => {
    document.getElementById("caparra-panel").style.display = e.target.checked ? "block" : "none";
  };

  document.getElementById("cfg-raccolta").onchange = (e) => {
    document.getElementById("raccolta-campi-panel").style.display = e.target.checked ? "block" : "none";
  };

  // Autogenera slug mentre digita il nome
  document.getElementById("cfg-nome").oninput = () => {
    const slug = document.getElementById("cfg-slug");
    if (!slug.dataset.manuale) {
      slug.value = makeSlug(document.getElementById("cfg-nome").value);
      aggiornaLinkQRLive(slug.value);
    }
  };

  // Aggiorna link/QR quando slug cambia manualmente
  document.getElementById("cfg-slug").oninput = (e) => {
    e.target.dataset.manuale = "1";
    aggiornaLinkQRLive(e.target.value);
  };

  // Click sul QR piccolo → ingrandisce
  document.getElementById("link-qr-img").onclick = () => {
    const slug = document.getElementById("cfg-slug").value.trim();
    if (slug) mostraQR(slug);
  };

  document.getElementById("btn-gen-slug").onclick = () => {
    const nome = document.getElementById("cfg-nome").value.trim();
    if (nome) document.getElementById("cfg-slug").value = makeSlug(nome);
  };

  document.getElementById("btn-salva-cfg").onclick = salvaConfigMenu;
  document.getElementById("btn-qr").onclick = () => menuAttivo?.slug ? mostraQR(menuAttivo.slug) : alert("Imposta prima uno slug");
  document.getElementById("search-cat-sx").oninput = (e) => renderCatSx(e.target.value);
  document.getElementById("search-prodotti").oninput = (e) => renderProdottiDx(e.target.value);

  document.querySelectorAll(".dx-tab").forEach(btn => {
    btn.onclick = () => switchDxTab(btn.dataset.tab);
  });

  // ── INIT ─────────────────────────────────────────────────────
  await loadMenus();
  await loadCatVendita();
  renderTabsMenu();
  if (menus.length > 0) await selezionaMenu(menus[0]);

  // ── LOAD ─────────────────────────────────────────────────────
  async function loadMenus() {
    let q = supa().from("menu").select("*").eq("azienda_id", azienda_id).order("created_at");
    if (sede_id) q = q.eq("sede_id", sede_id);
    const { data } = await q;
    menus = data || [];
  }

  async function loadCatVendita() {
    let q = supa().from("categorie_vendita").select("*").eq("azienda_id", azienda_id).order("ordine").order("nome");
    if (sede_id) q = q.eq("sede_id", sede_id);
    const { data } = await q;
    catVendita = data || [];
  }

  async function loadMenuCategorie(menuId) {
    const { data } = await supa()
      .from("menu_categorie")
      .select("*, categorie_vendita(nome, immagine_url, descrizione)")
      .eq("menu_id", menuId)
      .eq("azienda_id", azienda_id)
      .order("ordine");
    menuCategorie = data || [];
  }

  async function loadProdottiVendita(catVenditaId) {
    const { data } = await supa()
      .from("prodotti_vendita")
      .select("*, categorie_vendita(nome)")
      .eq("azienda_id", azienda_id)
      .eq("categoria_id", catVenditaId)
      .eq("attivo", true)
      .order("ordinamento")
      .order("nome");
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

  // ── TABS MENU ────────────────────────────────────────────────
  function renderTabsMenu() {
    const box = document.getElementById("tabs-menu");
    if (!menus.length) {
      box.innerHTML = "";
      document.getElementById("placeholder-nessun-menu").style.display = "flex";
      document.getElementById("editor-menu").style.display = "none";
      return;
    }
    document.getElementById("placeholder-nessun-menu").style.display = "none";
    box.innerHTML = menus.map(m => `
      <div class="menu-tab" data-id="${m.id}" style="
        padding:12px 16px;border-bottom:3px solid ${menuAttivo?.id === m.id ? "#0E5A7A" : "transparent"};
        cursor:pointer;font-size:13px;font-weight:${menuAttivo?.id === m.id ? "800" : "600"};
        color:${menuAttivo?.id === m.id ? "#0E5A7A" : "#64748b"};white-space:nowrap;
        display:flex;align-items:center;gap:6px;
      ">
        <span style="width:6px;height:6px;border-radius:50%;background:${m.attivo ? "#22c55e" : "#d1d5db"};flex-shrink:0;"></span>
        ${esc(m.nome)}
      </div>
    `).join("");

    box.querySelectorAll(".menu-tab").forEach(el => {
      el.onclick = () => selezionaMenu(menus.find(m => m.id === el.dataset.id));
    });
  }

  // ── SELEZIONA MENU ────────────────────────────────────────────
  async function selezionaMenu(menu) {
    menuAttivo = menu;
    catSelezionata = null;
    await loadMenuCategorie(menu.id);
    renderTabsMenu();
    popolaConfigMenu();
    renderCatSx();
    renderCatCentro();
    renderDxPlaceholder();
    document.getElementById("editor-menu").style.display = "block";
    document.getElementById("placeholder-nessun-menu").style.display = "none";
  }

  // ── POPOLA CONFIG ─────────────────────────────────────────────
  function popolaConfigMenu() {
    const m = menuAttivo;
    document.getElementById("cfg-nome").value          = m.nome || "";
    document.getElementById("cfg-slug").value          = m.slug || "";
    document.getElementById("cfg-colore").value        = m.colore_primario || "#0E5A7A";
    document.getElementById("cfg-colore-hex").value    = m.colore_primario || "#0E5A7A";
    document.getElementById("cfg-sfondo").value        = m.colore_sfondo || "#ffffff";
    document.getElementById("cfg-sfondo-hex").value    = m.colore_sfondo || "#ffffff";
    document.getElementById("cfg-font").value          = m.font_family || "";
    document.getElementById("cfg-attivo").checked      = !!m.attivo;
    document.getElementById("cfg-attivo-label").textContent = m.attivo ? "Attivo" : "Non attivo";
    document.getElementById("cfg-tracking").checked    = !!m.tracking_attivo;
    document.getElementById("cfg-raccolta").checked    = !!m.raccolta_dati;

    const caparra = m.caparra_formula || {};
    document.getElementById("cfg-caparra").checked     = !!m.caparra_attiva;
    document.getElementById("caparra-panel").style.display = m.caparra_attiva ? "block" : "none";
    document.getElementById("caparra-tipo").value      = caparra.tipo || "fisso";
    document.getElementById("caparra-importo").value   = caparra.importo || "";
    document.getElementById("caparra-note").value      = caparra.note || "";

    // Link e QR live
    aggiornaLinkQRLive(m.slug || "");

    // Raccolta dati — popola campi
    const raccoltaPanel = document.getElementById("raccolta-campi-panel");
    if (raccoltaPanel) {
      raccoltaPanel.style.display = m.raccolta_dati ? "block" : "none";
      const campiSalvati = m.raccolta_campi || ["nome","telefono"];
      raccoltaPanel.querySelectorAll(".raccolta-campo").forEach(chk => {
        chk.checked = Array.isArray(campiSalvati) && campiSalvati.includes(chk.dataset.campo);
      });
    }

    // Reset flag manuale slug
    const slugEl = document.getElementById("cfg-slug");
    if (slugEl) delete slugEl.dataset.manuale;

    document.getElementById("msg-cfg").textContent = "";
  }

  // ── SALVA CONFIG MENU ────────────────────────────────────────
  async function salvaConfigMenu() {
    const btn = document.getElementById("btn-salva-cfg");
    const msg = document.getElementById("msg-cfg");
    btn.disabled = true; btn.textContent = "Salvataggio...";

    const caparraAttiva = document.getElementById("cfg-caparra").checked;
    const caparraFormula = caparraAttiva ? {
      tipo:    document.getElementById("caparra-tipo").value,
      importo: parseFloat(document.getElementById("caparra-importo").value) || 0,
      note:    document.getElementById("caparra-note").value.trim()
    } : null;

    const { error } = await supa().from("menu").update({
      nome:            document.getElementById("cfg-nome").value.trim(),
      slug:            document.getElementById("cfg-slug").value.trim() || null,
      colore_primario: document.getElementById("cfg-colore-hex").value || null,
      colore_sfondo:   document.getElementById("cfg-sfondo-hex").value || null,
      font_family:     document.getElementById("cfg-font").value || null,
      attivo:          document.getElementById("cfg-attivo").checked,
      tracking_attivo: document.getElementById("cfg-tracking").checked,
      raccolta_dati:   document.getElementById("cfg-raccolta").checked,
      raccolta_campi:  Array.from(document.querySelectorAll(".raccolta-campo:checked")).map(c => c.dataset.campo),
      caparra_attiva:  caparraAttiva,
      caparra_formula: caparraFormula
    }).eq("id", menuAttivo.id).eq("azienda_id", azienda_id);

    btn.disabled = false; btn.textContent = "💾 Salva configurazione menu";

    if (error) { msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`; return; }

    msg.innerHTML = `<span style="color:#16a34a;">✅ Salvato</span>`;
    await loadMenus();
    menuAttivo = menus.find(m => m.id === menuAttivo.id);
    renderTabsMenu();
    popolaConfigMenu();
    setTimeout(() => msg.innerHTML = "", 3000);
  }

  // ── RENDER CAT SX ─────────────────────────────────────────────
  function renderCatSx(filter = "") {
    const box = document.getElementById("lista-cat-sx");
    const nelMenu = new Set(menuCategorie.map(mc => mc.categoria_vendita_id).filter(Boolean));
    const filtered = catVendita.filter(c =>
      (!filter || c.nome?.toLowerCase().includes(filter.toLowerCase()))
    );

    if (!filtered.length) {
      box.innerHTML = `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:20px;">Nessuna categoria</div>`;
      return;
    }

    box.innerHTML = filtered.map(c => `
      <div class="cat-sx-item" draggable="true" data-id="${c.id}" data-nome="${esc(c.nome)}"
           style="opacity:${nelMenu.has(c.id) ? ".5" : "1"};">
        ${c.immagine_url
          ? `<img src="${esc(c.immagine_url)}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
          : `<div style="width:36px;height:36px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">📂</div>`}
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.nome)}</div>
          ${c.descrizione ? `<div style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.descrizione)}</div>` : ""}
        </div>
        ${nelMenu.has(c.id) ? `<span style="font-size:10px;color:#16a34a;font-weight:700;">✓</span>` : `<span style="font-size:16px;color:#d1d5db;">⠿</span>`}
      </div>
    `).join("");

    // Drag from SX
    box.querySelectorAll(".cat-sx-item").forEach(el => {
      el.addEventListener("dragstart", (e) => {
        dragSrcId = el.dataset.id;
        el.classList.add("dragging");
        e.dataTransfer.effectAllowed = "copy";
      });
      el.addEventListener("dragend", () => {
        el.classList.remove("dragging");
        dragSrcId = null;
      });
      // Double click to add
      el.addEventListener("dblclick", () => aggiungiCategoria(el.dataset.id));
    });
  }

  // ── RENDER CAT CENTRO ─────────────────────────────────────────
  function renderCatCentro() {
    const lista = document.getElementById("lista-cat-centro");
    const empty = document.getElementById("centro-empty");
    const dropzone = document.getElementById("centro-dropzone");

    empty.style.display = menuCategorie.length ? "none" : "flex";

    lista.innerHTML = menuCategorie.map(mc => {
      const catV = catVendita.find(c => c.id === mc.categoria_vendita_id);
      const isActive = catSelezionata?.id === mc.id;
      return `
        <div class="cat-centro-item ${isActive ? "active" : ""}" data-id="${mc.id}" data-cat-v-id="${mc.categoria_vendita_id || ""}">
          ${catV?.immagine_url
            ? `<img src="${esc(catV.immagine_url)}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:40px;height:40px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">📂</div>`}
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(mc.nome)}</div>
            ${mc.ora_inizio ? `<div style="font-size:10px;color:#0E5A7A;font-weight:700;">⏰ ${mc.ora_inizio}–${mc.ora_fine}</div>` : ""}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
            <div style="display:flex;align-items:center;gap:4px;">
              <label class="toggle-switch" style="width:28px;height:16px;" title="${mc.attivo !== false ? "Disattiva" : "Attiva"}">
                <input type="checkbox" class="toggle-cat-centro" data-id="${mc.id}" ${mc.attivo !== false ? "checked" : ""}>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="btn-cfg-cat mb-btn mb-btn-sec" data-id="${mc.id}" style="padding:3px 7px;font-size:11px;" title="Configura">⚙️</button>
              <button class="btn-rm-cat mb-btn mb-btn-danger" data-id="${mc.id}" style="padding:3px 7px;font-size:11px;" title="Rimuovi">✕</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Click su categoria centro → carica portate
    lista.querySelectorAll(".cat-centro-item").forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest("button") || e.target.closest("input")) return;
        const mc = menuCategorie.find(m => m.id === el.dataset.id);
        if (mc) selezionaCategoriaCentro(mc);
      };
    });

    // Toggle attivo
    lista.querySelectorAll(".toggle-cat-centro").forEach(chk => {
      chk.onchange = async (e) => {
        e.stopPropagation();
        await supa().from("menu_categorie").update({ attivo: chk.checked }).eq("id", chk.dataset.id).eq("azienda_id", azienda_id);
        await loadMenuCategorie(menuAttivo.id);
        renderCatCentro();
      };
    });

    // Rimuovi dal menu
    lista.querySelectorAll(".btn-rm-cat").forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Rimuovere categoria dal menu? Le portate associate saranno eliminate.")) return;
        await supa().from("menu_voci").delete().eq("categoria_id", btn.dataset.id).eq("menu_id", menuAttivo.id).eq("azienda_id", azienda_id);
        await supa().from("menu_categorie").delete().eq("id", btn.dataset.id).eq("azienda_id", azienda_id);
        await loadMenuCategorie(menuAttivo.id);
        if (catSelezionata?.id === btn.dataset.id) renderDxPlaceholder();
        renderCatCentro();
        renderCatSx(document.getElementById("search-cat-sx").value);
      };
    });

    // Config categoria (orari, visibilità)
    lista.querySelectorAll(".btn-cfg-cat").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const mc = menuCategorie.find(m => m.id === btn.dataset.id);
        if (mc) aprireModalCfgCat(mc);
      };
    });

    // Dropzone per ricevere drag from SX
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
    dropzone.addEventListener("drop", async (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      if (!dragSrcId) return;
      await aggiungiCategoria(dragSrcId);
    });
  }

  // ── AGGIUNGI CATEGORIA AL MENU ────────────────────────────────
  async function aggiungiCategoria(catVenditaId) {
    const catV = catVendita.find(c => c.id === catVenditaId);
    if (!catV) return;
    // Controlla se già presente
    if (menuCategorie.some(mc => mc.categoria_vendita_id === catVenditaId)) {
      return; // già nel menu
    }
    const { error } = await supa().from("menu_categorie").insert({
      azienda_id,
      menu_id: menuAttivo.id,
      categoria_vendita_id: catVenditaId,
      nome: catV.nome,
      descrizione: catV.descrizione || null,
      immagine_url: catV.immagine_url || null,
      ordine: menuCategorie.length,
      attivo: true,
      visibile: true
    });
    if (error) { console.error(error); return; }
    await loadMenuCategorie(menuAttivo.id);
    renderCatCentro();
    renderCatSx(document.getElementById("search-cat-sx").value);
  }

  // ── SELEZIONA CATEGORIA CENTRO ────────────────────────────────
  async function selezionaCategoriaCentro(mc) {
    catSelezionata = mc;
    const catVId = mc.categoria_vendita_id;
    if (catVId) await loadProdottiVendita(catVId);
    else prodottiVendita = [];
    await loadMenuVoci(mc.id);
    renderCatCentro();
    renderDxContent(mc);
    renderProdottiDx();
    renderMockupLive();
  }

  // ── RENDER DX ─────────────────────────────────────────────────
  function renderDxPlaceholder() {
    catSelezionata = null;
    document.getElementById("dx-placeholder").style.display = "flex";
    document.getElementById("dx-content").style.display = "none";
  }

  function renderDxContent(mc) {
    document.getElementById("dx-placeholder").style.display = "none";
    document.getElementById("dx-content").style.display = "block";
    document.getElementById("dx-cat-nome").textContent = mc.nome;
  }

  function renderProdottiDx(filter = "") {
    const box = document.getElementById("lista-prodotti-dx");
    if (!box) return;
    const nelMenu = new Set(menuVoci.map(v => String(v.prodotto_vendita_id)).filter(Boolean));
    const filtered = prodottiVendita.filter(p =>
      !filter || p.nome?.toLowerCase().includes(filter.toLowerCase())
    );

    if (!filtered.length) {
      box.innerHTML = `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:20px;">Nessun prodotto in questa categoria</div>`;
      return;
    }

    box.innerHTML = filtered.map(p => {
      const inMenu = nelMenu.has(String(p.id));
      const voce = inMenu ? menuVoci.find(v => String(v.prodotto_vendita_id) === String(p.id)) : null;
      const prezzoDisplay = voce?.prezzo_override || voce?.prezzo || p.prezzo_base || 0;
      const fc = voce?.food_cost_snapshot || null;
      const margine = fc && prezzoDisplay > 0 ? ((prezzoDisplay - fc) / prezzoDisplay * 100) : null;

      return `
        <div class="prodotto-row ${inMenu ? "nel-menu" : ""}" data-id="${p.id}">
          ${p.foto_url || p.immagine_url
            ? `<img src="${esc(p.foto_url || p.immagine_url)}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:44px;height:44px;border-radius:8px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🍽️</div>`}
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.nome)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
              ${prezzoDisplay ? `<span style="font-size:13px;font-weight:800;color:#0E5A7A;">€${Number(prezzoDisplay).toFixed(2)}</span>` : ""}
              ${margine !== null ? `<span style="font-size:10px;font-weight:700;color:${margine > 60 ? "#16a34a" : margine > 40 ? "#f59e0b" : "#dc2626"};">📊 ${margine.toFixed(0)}%</span>` : ""}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${inMenu
              ? `<button class="btn-edit-voce mb-btn mb-btn-sec" data-voce-id="${voce.id}" data-prod-id="${p.id}" style="font-size:11px;padding:4px 8px;">✏️</button>
                 <button class="btn-rm-voce mb-btn mb-btn-danger" data-voce-id="${voce.id}" style="font-size:11px;padding:4px 8px;">✕</button>`
              : `<button class="btn-add-voce mb-btn mb-btn-green" data-prod-id="${p.id}" style="font-size:11px;padding:4px 8px;">+ Menu</button>`
            }
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll(".btn-add-voce").forEach(btn => {
      btn.onclick = () => aggiungiVoce(btn.dataset.prodId);
    });
    box.querySelectorAll(".btn-rm-voce").forEach(btn => {
      btn.onclick = () => rimuoviVoce(btn.dataset.voceId);
    });
    box.querySelectorAll(".btn-edit-voce").forEach(btn => {
      btn.onclick = () => aprireModalVoce(btn.dataset.voceId, btn.dataset.prodId);
    });
  }

  // ── AGGIUNGI / RIMUOVI VOCE ───────────────────────────────────
  async function aggiungiVoce(prodId) {
    const prod = prodottiVendita.find(p => String(p.id) === String(prodId));
    if (!prod) return;
    const fc = prod.food_cost || prod.costo_totale || null;
    const prezzo = prod.prezzo_base || prod.prezzo || 0;
    const { error } = await supa().from("menu_voci").insert({
      azienda_id,
      menu_id: menuAttivo.id,
      categoria_id: catSelezionata.id,
      prodotto_vendita_id: prodId,
      nome: prod.nome,
      descrizione: prod.descrizione || null,
      prezzo: Number(prezzo),
      foto_url: prod.foto_url || prod.immagine_url || null,
      food_cost_snapshot: fc,
      disponibile: true,
      visibile: true,
      attivo: true,
      ordine: menuVoci.length,
      alert_food_cost: fc && prezzo > 0 ? (fc / prezzo) > 0.4 : false
    });
    if (error) { console.error(error); return; }
    await loadMenuVoci(catSelezionata.id);
    renderProdottiDx(document.getElementById("search-prodotti").value);
    renderMockupLive();
  }

  async function rimuoviVoce(voceId) {
    if (!confirm("Rimuovere dal menu?")) return;
    await supa().from("menu_voci").delete().eq("id", voceId).eq("azienda_id", azienda_id);
    await loadMenuVoci(catSelezionata.id);
    renderProdottiDx(document.getElementById("search-prodotti").value);
    renderMockupLive();
  }

  // ── MODAL VOCE (edit prezzo/foto) ─────────────────────────────
  function aprireModalVoce(voceId, prodId) {
    const voce = menuVoci.find(v => String(v.id) === String(voceId));
    const prod = prodottiVendita.find(p => String(p.id) === String(prodId));
    if (!voce) return;
    document.getElementById("modal-voce-title").textContent = `✏️ ${voce.nome}`;
    const fc = voce.food_cost_snapshot;
    document.getElementById("modal-voce-body").innerHTML = `
      <div style="margin-bottom:12px;">
        <label class="mb-label">Prezzo nel menu (€)</label>
        <input id="voce-prezzo-edit" type="number" step="0.01" class="mb-input" value="${voce.prezzo_override || voce.prezzo || ""}">
        ${prod?.prezzo_base ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;">Prezzo base prodotto: €${Number(prod.prezzo_base).toFixed(2)}</div>` : ""}
      </div>
      ${fc ? `
        <div id="fc-live-edit" style="background:#f0fdf4;border-radius:10px;padding:10px;margin-bottom:12px;font-size:12px;">
          <strong>📊 Food cost: €${Number(fc).toFixed(2)}</strong><br>
          <span id="fc-margine-edit" style="color:#16a34a;font-weight:700;"></span>
        </div>
      ` : ""}
      <div style="margin-bottom:12px;">
        <label class="mb-label">Foto (URL)</label>
        <input id="voce-foto-edit" class="mb-input" value="${esc(voce.foto_url || "")}" placeholder="https://...">
      </div>
      <div style="margin-bottom:12px;">
        <label class="mb-label">Descrizione nel menu</label>
        <textarea id="voce-desc-edit" class="mb-input" style="min-height:60px;resize:vertical;">${esc(voce.descrizione || "")}</textarea>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:12px;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
          <input type="checkbox" id="voce-disp-edit" ${voce.disponibile !== false ? "checked" : ""} style="accent-color:#0E5A7A;"> Disponibile
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
          <input type="checkbox" id="voce-vis-edit" ${voce.visibile !== false ? "checked" : ""} style="accent-color:#0E5A7A;"> Visibile
        </label>
      </div>
      <button id="btn-salva-voce-edit" class="mb-btn mb-btn-primary" style="width:100%;">💾 Salva</button>
      <div id="msg-voce-edit" style="margin-top:8px;font-size:12px;text-align:center;"></div>
    `;

    if (fc) {
      const prezzoInput = document.getElementById("voce-prezzo-edit");
      const updateFC = () => {
        const p = parseFloat(prezzoInput.value);
        if (!p || p <= 0) return;
        const m = ((p - fc) / p * 100);
        const el = document.getElementById("fc-margine-edit");
        if (el) {
          el.textContent = `Margine: €${(p - fc).toFixed(2)} (${m.toFixed(0)}%)`;
          el.style.color = m > 60 ? "#16a34a" : m > 40 ? "#f59e0b" : "#dc2626";
        }
      };
      prezzoInput.oninput = updateFC;
      updateFC();
    }

    document.getElementById("btn-salva-voce-edit").onclick = async () => {
      const prezzo = parseFloat(document.getElementById("voce-prezzo-edit").value);
      const { error } = await supa().from("menu_voci").update({
        prezzo_override: prezzo || null,
        prezzo: prezzo || voce.prezzo,
        foto_url: document.getElementById("voce-foto-edit").value.trim() || null,
        descrizione: document.getElementById("voce-desc-edit").value.trim() || null,
        disponibile: document.getElementById("voce-disp-edit").checked,
        visibile: document.getElementById("voce-vis-edit").checked,
      }).eq("id", voceId).eq("azienda_id", azienda_id);

      const msg = document.getElementById("msg-voce-edit");
      if (error) { msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`; return; }
      msg.innerHTML = `<span style="color:#16a34a;">✅ Salvato</span>`;
      await loadMenuVoci(catSelezionata.id);
      renderProdottiDx(document.getElementById("search-prodotti").value);
      renderMockupLive();
      setTimeout(() => chiudiModalVoce(), 800);
    };

    document.getElementById("modal-voce").style.display = "flex";
  }

  function chiudiModalVoce() {
    document.getElementById("modal-voce").style.display = "none";
  }

  // ── MODAL CONFIG CATEGORIA ────────────────────────────────────
  function aprireModalCfgCat(mc) {
    document.getElementById("modal-voce-title").textContent = `⚙️ ${mc.nome}`;
    document.getElementById("modal-voce-body").innerHTML = `
      <div style="margin-bottom:12px;">
        <label class="mb-label">Nome categoria nel menu</label>
        <input id="cfg-cat-nome" class="mb-input" value="${esc(mc.nome)}">
      </div>
      <div style="margin-bottom:12px;">
        <label class="mb-label">Descrizione</label>
        <input id="cfg-cat-desc" class="mb-input" value="${esc(mc.descrizione || "")}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <div>
          <label class="mb-label">Visibile dalle ore</label>
          <input id="cfg-cat-ora-ini" type="time" class="mb-input" value="${mc.ora_inizio || ""}">
        </div>
        <div>
          <label class="mb-label">Visibile fino alle ore</label>
          <input id="cfg-cat-ora-fin" type="time" class="mb-input" value="${mc.ora_fine || ""}">
        </div>
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;">Lascia vuoto per mostrarla sempre</div>
      <button id="btn-salva-cfg-cat" class="mb-btn mb-btn-primary" style="width:100%;">💾 Salva</button>
      <div id="msg-cfg-cat" style="margin-top:8px;font-size:12px;text-align:center;"></div>
    `;

    document.getElementById("btn-salva-cfg-cat").onclick = async () => {
      const { error } = await supa().from("menu_categorie").update({
        nome:       document.getElementById("cfg-cat-nome").value.trim(),
        descrizione: document.getElementById("cfg-cat-desc").value.trim() || null,
        ora_inizio: document.getElementById("cfg-cat-ora-ini").value || null,
        ora_fine:   document.getElementById("cfg-cat-ora-fin").value || null,
      }).eq("id", mc.id).eq("azienda_id", azienda_id);

      const msg = document.getElementById("msg-cfg-cat");
      if (error) { msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`; return; }
      msg.innerHTML = `<span style="color:#16a34a;">✅ Salvato</span>`;
      await loadMenuCategorie(menuAttivo.id);
      renderCatCentro();
      setTimeout(() => chiudiModalVoce(), 800);
    };

    document.getElementById("modal-voce").style.display = "flex";
  }

  // ── MOCKUP LIVE ───────────────────────────────────────────────
  function renderMockupLive() {
    const box = document.getElementById("mockup-live");
    if (!box) return;
    const colore = menuAttivo?.colore_primario || "#0E5A7A";

    if (!menuVoci.length) {
      box.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:24px;font-size:12px;">Nessuna portata aggiunta</div>`;
      return;
    }

    box.innerHTML = `
      <div class="mockup-wrap">
        <div style="background:${esc(colore)};padding:10px 14px;">
          <div style="font-size:13px;font-weight:800;color:#fff;">${esc(catSelezionata?.nome || "")}</div>
        </div>
        ${menuVoci.filter(v => v.visibile !== false).map(v => `
          <div class="mockup-voce">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:#111827;">${esc(v.nome)}</div>
              ${v.descrizione ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${esc(v.descrizione)}</div>` : ""}
              ${!v.disponibile ? `<span style="font-size:10px;font-weight:700;color:#dc2626;">Non disponibile</span>` : ""}
            </div>
            <div style="font-size:14px;font-weight:800;color:${esc(colore)};white-space:nowrap;margin-left:8px;">
              €${Number(v.prezzo_override || v.prezzo || 0).toFixed(2)}
            </div>
            ${v.foto_url ? `<img src="${esc(v.foto_url)}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;margin-left:8px;">` : ""}
          </div>
        `).join("")}
      </div>
    `;
  }

  // ── SWITCH TAB DX ─────────────────────────────────────────────
  function switchDxTab(tab) {
    document.getElementById("dx-tab-portate").style.display  = tab === "portate" ? "block" : "none";
    document.getElementById("dx-tab-mockup").style.display   = tab === "mockup"  ? "block" : "none";
    document.querySelectorAll(".dx-tab").forEach(btn => {
      btn.style.background = btn.dataset.tab === tab ? "#0E5A7A" : "#f1f5f9";
      btn.style.color      = btn.dataset.tab === tab ? "#fff" : "#374151";
    });
    if (tab === "mockup") renderMockupLive();
  }

  // ── MODAL NUOVO MENU ─────────────────────────────────────────
  function aprireModalNuovoMenu() {
    document.getElementById("nuovo-nome").value = "";
    document.getElementById("nuovo-desc").value = "";
    document.getElementById("msg-nuovo").textContent = "";
    document.getElementById("modal-nuovo-menu").style.display = "flex";
  }

  function chiudiModalNuovoMenu() {
    document.getElementById("modal-nuovo-menu").style.display = "none";
  }

  document.getElementById("btn-crea-menu").onclick = async () => {
    const btn = document.getElementById("btn-crea-menu");
    const msg = document.getElementById("msg-nuovo");
    const nome = document.getElementById("nuovo-nome").value.trim();
    if (!nome) { msg.innerHTML = `<span style="color:#dc2626;">Nome obbligatorio</span>`; return; }
    btn.disabled = true; btn.textContent = "Creazione...";

    const { data, error } = await supa().from("menu").insert({
      azienda_id, sede_id,
      nome,
      descrizione: document.getElementById("nuovo-desc").value.trim() || null,
      slug: makeSlug(nome),
      attivo: true
    }).select().single();

    btn.disabled = false; btn.textContent = "🚀 Crea menu";
    if (error) { msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`; return; }
    chiudiModalNuovoMenu();
    await loadMenus();
    renderTabsMenu();
    await selezionaMenu(data);
    aggiornaLinkQRLive(data.slug || "");
  };

  // ── QR ───────────────────────────────────────────────────────
  function mostraQR(slug) {
    const url = `${BASE_URL}/menu-pubblico.html?slug=${slug}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    const win = window.open("", "_blank", "width=380,height=460");
    win.document.write(`<html><body style="margin:0;display:flex;flex-direction:column;align-items:center;padding:24px;font-family:sans-serif;background:#f8fafc;">
      <h3 style="margin:0 0 16px;">${esc(menuAttivo.nome)}</h3>
      <img src="${qr}" style="width:260px;height:260px;border-radius:12px;">
      <p style="font-size:11px;color:#666;margin-top:12px;word-break:break-all;text-align:center;max-width:320px;">${url}</p>
      <a href="${qr}" download="qr-${slug}.png" style="margin-top:8px;background:#0E5A7A;color:#fff;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">⬇ Scarica QR</a>
    </body></html>`);
  }

  // ── UTILS ────────────────────────────────────────────────────
  function aggiornaLinkQRLive(slug) {
    const liveBox = document.getElementById("link-qr-live");
    const liveUrl = document.getElementById("link-qr-url");
    const liveImg = document.getElementById("link-qr-img");
    const linkBtn = document.getElementById("cfg-link-pub");
    if (!slug || !slug.trim()) {
      if (liveBox) liveBox.style.display = "none";
      if (linkBtn) { linkBtn.href = "#"; linkBtn.style.opacity = ".4"; }
      return;
    }
    const url = BASE_URL + "/menu-pubblico.html?slug=" + encodeURIComponent(slug);
    const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(url);
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
