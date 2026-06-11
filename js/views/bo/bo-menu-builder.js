// js/views/bo/bo-menu-builder.js
// Menu Builder v2 — completo con upload, food cost live, scheduling, drag&drop

const supa = () => window.supabaseClient || window.supabase;
const BASE_URL = "https://app.ristoflow-ai.com";
const BUCKET   = "media-aziende";

export async function render(container) {
  const azienda_id = window.state?.azienda?.id;
  const sede_id    = window.state?.sedeAttiva?.id || null;
  const ruolo      = window.state?.ruolo;

  if (ruolo !== "admin" && ruolo !== "superadmin") {
    container.innerHTML = `<section class="view"><h2>Accesso negato</h2></section>`;
    return;
  }

  // ── STATE ────────────────────────────────────────────────────────
  let menus       = [];
  let menuAttivo  = null;
  let categorie   = [];
  let catAttiva   = null;
  let voci        = [];
  let ricette     = [];
  let prodotti    = [];
  let tags        = [];

  // ── LAYOUT ───────────────────────────────────────────────────────
  container.innerHTML = `
  <div style="min-height:100vh;background:#f8fafc;">

    <!-- TOPBAR -->
    <div style="background:#0E5A7A;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:12px;">
        <button id="btn-back" style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:10px;padding:8px 14px;cursor:pointer;font-weight:700;font-size:13px;">← Indietro</button>
        <div>
          <div style="font-size:18px;font-weight:800;">🍽️ Menu Builder</div>
          <div style="font-size:12px;opacity:.75;">Crea e gestisci i tuoi menu digitali</div>
        </div>
      </div>
      <button id="btn-nuovo-menu" style="background:#fff;color:#0E5A7A;border:none;border-radius:12px;padding:10px 20px;font-weight:800;font-size:14px;cursor:pointer;">+ Nuovo menu</button>
    </div>

    <!-- CORPO A 3 COLONNE -->
    <div style="display:grid;grid-template-columns:280px 1fr 340px;min-height:calc(100vh - 60px);gap:0;">

      <!-- COL SX: LISTA MENU -->
      <div style="background:#fff;border-right:1px solid #e5e7eb;overflow-y:auto;">
        <div style="padding:16px;border-bottom:1px solid #f3f4f6;">
          <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">I tuoi menu</div>
          <input id="search-menu" placeholder="Cerca menu..." style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #e5e7eb;border-radius:10px;font-size:13px;outline:none;">
        </div>
        <div id="lista-menu" style="padding:8px;"></div>
      </div>

      <!-- COL CENTRO: CATEGORIE + CONFIGURAZIONE MENU -->
      <div style="background:#f8fafc;overflow-y:auto;" id="col-centro">
        <div id="menu-placeholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8;gap:12px;padding:40px;">
          <div style="font-size:48px;">🍽️</div>
          <div style="font-size:16px;font-weight:700;">Seleziona o crea un menu</div>
          <div style="font-size:13px;text-align:center;">Clicca su un menu a sinistra o crea un nuovo menu per iniziare</div>
        </div>
        <div id="menu-editor" style="display:none;"></div>
      </div>

      <!-- COL DX: VOCI CATEGORIA -->
      <div style="background:#fff;border-left:1px solid #e5e7eb;overflow-y:auto;">
        <div id="col-dx-placeholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8;gap:12px;padding:32px;text-align:center;">
          <div style="font-size:36px;">👆</div>
          <div style="font-size:14px;font-weight:700;">Seleziona una categoria</div>
          <div style="font-size:12px;">Clicca su una categoria per gestire i prodotti</div>
        </div>
        <div id="col-dx-voci" style="display:none;"></div>
      </div>

    </div>

    <!-- MODAL NUOVO MENU -->
    <div id="modal-nuovo-menu" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:20px;padding:28px;width:min(560px,95vw);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div style="font-size:18px;font-weight:800;">✨ Nuovo menu</div>
          <button id="chiudi-modal-menu" style="background:#f3f4f6;border:none;border-radius:10px;width:36px;height:36px;cursor:pointer;font-size:18px;">✕</button>
        </div>
        ${inputField("nuovo-menu-nome","Nome menu *","Es. Menu Cena Estate 2026")}
        ${inputField("nuovo-menu-slug","Slug (URL pubblico)","menu-cena-estate")}
        ${inputField("nuovo-menu-descrizione","Descrizione","Il meglio della stagione...")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <div style="${labelStyle}">Colore brand</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="nuovo-menu-colore" value="#0E5A7A" style="width:48px;height:42px;border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;padding:2px;">
              <input id="nuovo-menu-colore-hex" style="${inputStyle}flex:1;" value="#0E5A7A" placeholder="#0E5A7A">
            </div>
          </div>
          <div>
            <div style="${labelStyle}">Colore sfondo</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="color" id="nuovo-menu-sfondo" value="#ffffff" style="width:48px;height:42px;border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;padding:2px;">
              <input id="nuovo-menu-sfondo-hex" style="${inputStyle}flex:1;" value="#ffffff" placeholder="#ffffff">
            </div>
          </div>
        </div>
        <div style="margin-top:12px;">
          <div style="${labelStyle}">Raccolta dati prima del menu</div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
            <input type="checkbox" id="nuovo-menu-tracking" style="accent-color:#0E5A7A;width:16px;height:16px;">
            Chiedi nome/email/tavolo prima di mostrare il menu
          </label>
        </div>
        <button id="btn-crea-menu" style="margin-top:20px;width:100%;background:#0E5A7A;color:#fff;border:none;border-radius:14px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;">
          🚀 Crea menu
        </button>
        <div id="msg-nuovo-menu" style="margin-top:10px;font-size:13px;text-align:center;"></div>
      </div>
    </div>

    <!-- MODAL NUOVA VOCE -->
    <div id="modal-voce" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:20px;padding:28px;width:min(600px,95vw);max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div style="font-size:18px;font-weight:800;" id="modal-voce-title">➕ Aggiungi prodotto</div>
          <button id="chiudi-modal-voce" style="background:#f3f4f6;border:none;border-radius:10px;width:36px;height:36px;cursor:pointer;font-size:18px;">✕</button>
        </div>

        <!-- TABS sorgente -->
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <button class="voce-tab" data-tab="ricetta" style="${tabActiveStyle}">📖 Da ricetta</button>
          <button class="voce-tab" data-tab="prodotto" style="${tabStyle}">📦 Da prodotto</button>
          <button class="voce-tab" data-tab="manuale" style="${tabStyle}">✏️ Manuale</button>
        </div>

        <div id="voce-tab-ricetta">
          <div style="${labelStyle}">Seleziona ricetta</div>
          <select id="voce-ricetta-select" style="${inputStyle}width:100%;box-sizing:border-box;margin-bottom:12px;">
            <option value="">— Scegli ricetta —</option>
          </select>
          <div id="ricetta-info" style="display:none;background:#f0f9ff;border-radius:12px;padding:12px;margin-bottom:12px;font-size:13px;"></div>
        </div>

        <div id="voce-tab-prodotto" style="display:none;">
          <div style="${labelStyle}">Seleziona prodotto</div>
          <select id="voce-prodotto-select" style="${inputStyle}width:100%;box-sizing:border-box;margin-bottom:12px;">
            <option value="">— Scegli prodotto —</option>
          </select>
        </div>

        <div id="voce-tab-manuale" style="display:none;">
          ${inputField("voce-nome-manuale","Nome piatto *","Es. Tagliata di manzo")}
          <div style="${labelStyle}">Descrizione</div>
          <textarea id="voce-desc-manuale" style="${inputStyle}width:100%;box-sizing:border-box;min-height:80px;resize:vertical;" placeholder="Ingredienti, preparazione, note..."></textarea>
        </div>

        <!-- CAMPI COMUNI -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div>
            <div style="${labelStyle}">Prezzo di vendita (€) *</div>
            <input id="voce-prezzo" type="number" step="0.01" min="0" style="${inputStyle}width:100%;box-sizing:border-box;" placeholder="12.50">
          </div>
          <div>
            <div style="${labelStyle}">IVA %</div>
            <select id="voce-iva" style="${inputStyle}width:100%;box-sizing:border-box;">
              <option value="10">10%</option>
              <option value="4">4%</option>
              <option value="22">22%</option>
              <option value="0">0%</option>
            </select>
          </div>
        </div>

        <!-- FOOD COST LIVE -->
        <div id="food-cost-live" style="display:none;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;margin-top:10px;">
          <div style="font-size:12px;font-weight:800;color:#15803d;margin-bottom:6px;">📊 Food cost live</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <div><span style="font-size:11px;color:#64748b;">Food cost</span><br><strong id="fc-costo">—</strong></div>
            <div><span style="font-size:11px;color:#64748b;">Margine €</span><br><strong id="fc-margine">—</strong></div>
            <div><span style="font-size:11px;color:#64748b;">Margine %</span><br><strong id="fc-perc" style="font-size:16px;">—</strong></div>
          </div>
          <div id="fc-bar-wrap" style="margin-top:8px;background:#e5e7eb;border-radius:999px;height:6px;overflow:hidden;">
            <div id="fc-bar" style="height:100%;border-radius:999px;background:#22c55e;width:0%;transition:width .3s;"></div>
          </div>
        </div>

        <div style="margin-top:12px;">
          <div style="${labelStyle}">Foto piatto</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="file" id="voce-foto-file" accept="image/*" style="flex:1;font-size:12px;">
            <button id="btn-upload-voce-foto" style="background:#0E5A7A;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;">Carica</button>
          </div>
          <input id="voce-foto-url" style="${inputStyle}width:100%;box-sizing:border-box;margin-top:6px;font-size:12px;" placeholder="URL foto (generato dopo upload)">
          <div id="voce-foto-preview" style="margin-top:6px;"></div>
        </div>

        <div style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
            <input type="checkbox" id="voce-disponibile" checked style="accent-color:#0E5A7A;"> Disponibile
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
            <input type="checkbox" id="voce-visibile" checked style="accent-color:#0E5A7A;"> Visibile sul menu
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:600;">
            <input type="checkbox" id="voce-chef" style="accent-color:#0E5A7A;"> ⭐ Chef consiglia
          </label>
        </div>

        <button id="btn-salva-voce" style="margin-top:20px;width:100%;background:#0E5A7A;color:#fff;border:none;border-radius:14px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;">
          💾 Salva prodotto
        </button>
        <div id="msg-voce" style="margin-top:8px;font-size:13px;text-align:center;"></div>
      </div>
    </div>

  </div>
  `;

  // ── HELPERS STILE ─────────────────────────────────────────────────
  function inputField(id, label, placeholder) {
    return `<div style="margin-bottom:12px;">
      <div style="${labelStyle}">${label}</div>
      <input id="${id}" style="${inputStyle}width:100%;box-sizing:border-box;" placeholder="${placeholder}">
    </div>`;
  }

  // ── INIT ─────────────────────────────────────────────────────────
  document.getElementById("btn-back").onclick = () => { window.location.hash = "#/home"; };
  document.getElementById("btn-nuovo-menu").onclick = () => aprireModalMenu();
  document.getElementById("chiudi-modal-menu").onclick = () => chiudiModalMenu();
  document.getElementById("chiudi-modal-voce").onclick = () => chiudiModalVoce();

  // Color pickers nuovo menu
  document.getElementById("nuovo-menu-colore").oninput = (e) => {
    document.getElementById("nuovo-menu-colore-hex").value = e.target.value;
  };
  document.getElementById("nuovo-menu-sfondo").oninput = (e) => {
    document.getElementById("nuovo-menu-sfondo-hex").value = e.target.value;
  };

  // Tab voce
  document.querySelectorAll(".voce-tab").forEach(btn => {
    btn.onclick = () => switchVoceTab(btn.dataset.tab);
  });

  // Food cost live
  document.getElementById("voce-prezzo").oninput = aggiornaFoodCost;

  // Upload foto voce
  document.getElementById("btn-upload-voce-foto").onclick = uploadFotoVoce;

  // Ricetta select
  document.getElementById("voce-ricetta-select").onchange = onRicettaChange;

  // Crea menu
  document.getElementById("btn-crea-menu").onclick = creaMenu;

  // Salva voce
  document.getElementById("btn-salva-voce").onclick = salvaVoce;

  // Chiudi modal cliccando fuori
  document.getElementById("modal-nuovo-menu").onclick = (e) => {
    if (e.target === e.currentTarget) chiudiModalMenu();
  };
  document.getElementById("modal-voce").onclick = (e) => {
    if (e.target === e.currentTarget) chiudiModalVoce();
  };

  // Search
  document.getElementById("search-menu").oninput = (e) => renderListaMenu(e.target.value);

  await loadAll();

  // ── LOAD ─────────────────────────────────────────────────────────
  async function loadAll() {
    await Promise.all([loadMenus(), loadRicette(), loadProdotti(), loadTags()]);
    renderListaMenu();
    if (menus.length > 0) selezionaMenu(menus[0]);
  }

  async function loadMenus() {
    let q = supa().from("menu").select("*").eq("azienda_id", azienda_id).order("created_at", { ascending: false });
    if (sede_id) q = q.eq("sede_id", sede_id);
    const { data } = await q;
    menus = data || [];
  }

  async function loadCategorie(menuId) {
    const { data } = await supa().from("menu_categorie").select("*").eq("menu_id", menuId).eq("azienda_id", azienda_id).order("ordine");
    categorie = data || [];
  }

  async function loadVoci(catId) {
    const { data } = await supa().from("menu_voci").select("*").eq("categoria_id", catId).eq("azienda_id", azienda_id).order("ordine");
    voci = data || [];
  }

  async function loadRicette() {
    const { data } = await supa().from("ricette").select("id,nome,descrizione,costo_porzione,costo_totale").eq("azienda_id", azienda_id).order("nome");
    ricette = data || [];
    const sel = document.getElementById("voce-ricetta-select");
    if (sel) sel.innerHTML = `<option value="">— Scegli ricetta —</option>` + ricette.map(r => `<option value="${r.id}">${esc(r.nome)}</option>`).join("");
  }

  async function loadProdotti() {
    const { data } = await supa().from("prodotti_vendita").select("id,nome,descrizione,prezzo_base").eq("azienda_id", azienda_id).eq("attivo", true).order("nome");
    prodotti = data || [];
    const sel = document.getElementById("voce-prodotto-select");
    if (sel) sel.innerHTML = `<option value="">— Scegli prodotto —</option>` + prodotti.map(p => `<option value="${p.id}">${esc(p.nome)}${p.prezzo_base ? " — €" + Number(p.prezzo_base).toFixed(2) : ""}</option>`).join("");
  }

  async function loadTags() {
    const { data } = await supa().from("menu_tag").select("*").eq("azienda_id", azienda_id).order("ordine");
    tags = data || [];
  }

  // ── RENDER LISTA MENU ─────────────────────────────────────────────
  function renderListaMenu(filter = "") {
    const box = document.getElementById("lista-menu");
    const filtrati = menus.filter(m => !filter || m.nome?.toLowerCase().includes(filter.toLowerCase()));

    if (!filtrati.length) {
      box.innerHTML = `<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px;">Nessun menu trovato</div>`;
      return;
    }

    box.innerHTML = filtrati.map(m => {
      const attivo = menuAttivo?.id === m.id;
      return `
        <div class="menu-item" data-id="${m.id}" style="
          padding:14px;border-radius:14px;cursor:pointer;margin-bottom:6px;
          background:${attivo ? "#e0f2fe" : "#fff"};
          border:1.5px solid ${attivo ? "#0284c7" : "#e5e7eb"};
          transition:all .15s;
        ">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div>
              <div style="font-size:14px;font-weight:800;color:#111827;">${esc(m.nome)}</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px;">${m.slug ? "#" + m.slug : "nessuno slug"}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${m.attivo ? "#22c55e" : "#d1d5db"};"></div>
              <span style="font-size:11px;color:#64748b;">${m.attivo ? "Attivo" : "Off"}</span>
            </div>
          </div>
          ${m.slug ? `<div style="margin-top:8px;display:flex;gap:6px;">
            <a href="${BASE_URL}/menu-pubblico.html?slug=${esc(m.slug)}" target="_blank" style="font-size:11px;color:#0E5A7A;font-weight:700;text-decoration:none;background:#e8f4f8;padding:3px 8px;border-radius:6px;">🔗 Link</a>
            <span class="btn-qr-menu" data-slug="${esc(m.slug)}" style="font-size:11px;color:#0E5A7A;font-weight:700;cursor:pointer;background:#e8f4f8;padding:3px 8px;border-radius:6px;">📷 QR</span>
          </div>` : ""}
        </div>
      `;
    }).join("");

    box.querySelectorAll(".menu-item").forEach(el => {
      el.onclick = () => selezionaMenu(menus.find(m => m.id === el.dataset.id));
    });

    box.querySelectorAll(".btn-qr-menu").forEach(el => {
      el.onclick = (e) => { e.stopPropagation(); mostraQR(el.dataset.slug); };
    });
  }

  // ── SELEZIONA MENU ────────────────────────────────────────────────
  async function selezionaMenu(menu) {
    menuAttivo = menu;
    catAttiva = null;
    await loadCategorie(menu.id);
    renderMenuEditor();
    renderListaMenu(document.getElementById("search-menu").value);
    // Nascondi voci
    document.getElementById("col-dx-placeholder").style.display = "flex";
    document.getElementById("col-dx-voci").style.display = "none";
  }

  // ── RENDER EDITOR MENU ───────────────────────────────────────────
  function renderMenuEditor() {
    const centro = document.getElementById("menu-editor");
    const placeholder = document.getElementById("menu-placeholder");
    placeholder.style.display = "none";
    centro.style.display = "block";

    const m = menuAttivo;
    const colore = m.colore_primario || m.colore_sfondo || "#0E5A7A";
    const linkPubblico = m.slug ? `${BASE_URL}/menu-pubblico.html?slug=${m.slug}` : null;

    centro.innerHTML = `
      <!-- HEADER MENU -->
      <div style="position:relative;background:${esc(colore)};min-height:120px;overflow:hidden;">
        ${m.cover_url ? `<img src="${esc(m.cover_url)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.4;">` : ""}
        <div style="position:relative;z-index:2;padding:20px;display:flex;align-items:flex-end;gap:16px;">
          ${m.logo_url ? `<img src="${esc(m.logo_url)}" style="width:64px;height:64px;border-radius:50%;border:3px solid #fff;object-fit:cover;flex-shrink:0;">` : `<div style="width:64px;height:64px;border-radius:50%;border:3px solid rgba(255,255,255,.5);background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">🍽️</div>`}
          <div>
            <div style="font-size:22px;font-weight:800;color:#fff;">${esc(m.nome)}</div>
            ${m.descrizione ? `<div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:2px;">${esc(m.descrizione)}</div>` : ""}
          </div>
        </div>
      </div>

      <!-- TOOLBAR -->
      <div style="background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button id="btn-edit-menu" style="${btnSecStyle}">⚙️ Impostazioni</button>
        <button id="btn-toggle-menu" style="${m.attivo ? btnDangerStyle : btnPrimaryStyle}">
          ${m.attivo ? "⏸ Disattiva" : "▶ Attiva"}
        </button>
        ${linkPubblico ? `<a href="${linkPubblico}" target="_blank" style="${btnPrimaryStyle}text-decoration:none;">🔗 Apri menu</a>` : ""}
        <button id="btn-aggiungi-cat" style="${btnPrimaryStyle}margin-left:auto;">+ Categoria</button>
      </div>

      <!-- IMPOSTAZIONI MENU (collassabili) -->
      <div id="menu-settings-panel" style="display:none;background:#f8fafc;border-bottom:1px solid #e5e7eb;padding:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;">
          <div>
            <div style="${labelStyle}">Nome menu</div>
            <input id="edit-menu-nome" style="${inputStyle}width:100%;box-sizing:border-box;" value="${esc(m.nome)}">
          </div>
          <div>
            <div style="${labelStyle}">Slug (URL)</div>
            <input id="edit-menu-slug" style="${inputStyle}width:100%;box-sizing:border-box;" value="${esc(m.slug || "")}">
          </div>
          <div>
            <div style="${labelStyle}">Logo URL</div>
            <div style="display:flex;gap:6px;">
              <input id="edit-menu-logo" style="${inputStyle}flex:1;" value="${esc(m.logo_url || "")}" placeholder="https://...">
              <input type="file" id="edit-menu-logo-file" accept="image/*" style="display:none;">
              <button id="btn-upload-logo" style="${btnSecStyle}white-space:nowrap;">📷</button>
            </div>
          </div>
          <div>
            <div style="${labelStyle}">Cover URL</div>
            <div style="display:flex;gap:6px;">
              <input id="edit-menu-cover" style="${inputStyle}flex:1;" value="${esc(m.cover_url || "")}" placeholder="https://...">
              <input type="file" id="edit-menu-cover-file" accept="image/*" style="display:none;">
              <button id="btn-upload-cover" style="${btnSecStyle}white-space:nowrap;">📷</button>
            </div>
          </div>
          <div>
            <div style="${labelStyle}">Colore brand</div>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="color" id="edit-menu-colore" value="${esc(m.colore_primario || colore)}" style="width:42px;height:36px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;">
              <input id="edit-menu-colore-hex" style="${inputStyle}flex:1;" value="${esc(m.colore_primario || colore)}">
            </div>
          </div>
          <div>
            <div style="${labelStyle}">Colore sfondo</div>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="color" id="edit-menu-sfondo" value="${esc(m.colore_sfondo || "#ffffff")}" style="width:42px;height:36px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;">
              <input id="edit-menu-sfondo-hex" style="${inputStyle}flex:1;" value="${esc(m.colore_sfondo || "#ffffff")}">
            </div>
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button id="btn-salva-settings" style="${btnPrimaryStyle}">💾 Salva impostazioni</button>
          <div id="msg-settings" style="font-size:13px;display:flex;align-items:center;"></div>
        </div>
      </div>

      <!-- CATEGORIE -->
      <div style="padding:16px;" id="categorie-container">
        ${renderCategorieHTML()}
      </div>
    `;

    // BIND
    document.getElementById("btn-edit-menu").onclick = () => {
      const p = document.getElementById("menu-settings-panel");
      p.style.display = p.style.display === "none" ? "block" : "none";
    };

    document.getElementById("btn-toggle-menu").onclick = () => toggleMenu();
    document.getElementById("btn-aggiungi-cat").onclick = () => aprireFormCategoria();

    bindSettingsPanel();
    bindCategorie();
  }

  function bindSettingsPanel() {
    const colorePicker = document.getElementById("edit-menu-colore");
    const coloreHex = document.getElementById("edit-menu-colore-hex");
    const sfondoPicker = document.getElementById("edit-menu-sfondo");
    const sfondoHex = document.getElementById("edit-menu-sfondo-hex");

    if (colorePicker) {
      colorePicker.oninput = () => { coloreHex.value = colorePicker.value; };
      coloreHex.oninput = () => { if (/^#[0-9A-Fa-f]{6}$/.test(coloreHex.value)) colorePicker.value = coloreHex.value; };
    }
    if (sfondoPicker) {
      sfondoPicker.oninput = () => { sfondoHex.value = sfondoPicker.value; };
      sfondoHex.oninput = () => { if (/^#[0-9A-Fa-f]{6}$/.test(sfondoHex.value)) sfondoPicker.value = sfondoHex.value; };
    }

    document.getElementById("btn-upload-logo")?.addEventListener("click", () => {
      document.getElementById("edit-menu-logo-file").click();
    });
    document.getElementById("edit-menu-logo-file")?.addEventListener("change", async (e) => {
      const url = await uploadFile(e.target.files[0], "menu-logo");
      if (url) document.getElementById("edit-menu-logo").value = url;
    });

    document.getElementById("btn-upload-cover")?.addEventListener("click", () => {
      document.getElementById("edit-menu-cover-file").click();
    });
    document.getElementById("edit-menu-cover-file")?.addEventListener("change", async (e) => {
      const url = await uploadFile(e.target.files[0], "menu-cover");
      if (url) document.getElementById("edit-menu-cover").value = url;
    });

    document.getElementById("btn-salva-settings")?.addEventListener("click", salvaImpostazioniMenu);
  }

  // ── RENDER CATEGORIE HTML ─────────────────────────────────────────
  function renderCategorieHTML() {
    if (!categorie.length) {
      return `<div style="text-align:center;color:#94a3b8;padding:40px 20px;">
        <div style="font-size:32px;margin-bottom:8px;">📂</div>
        <div style="font-size:14px;font-weight:700;">Nessuna categoria</div>
        <div style="font-size:12px;margin-top:4px;">Clicca "+ Categoria" per iniziare</div>
      </div>`;
    }

    return categorie.map(cat => {
      const isAttiva = catAttiva?.id === cat.id;
      const voceCount = ""; // non le carichiamo tutte per performance
      return `
        <div class="cat-card" data-id="${cat.id}" style="
          background:#fff;border-radius:16px;
          border:2px solid ${isAttiva ? "#0E5A7A" : "#e5e7eb"};
          margin-bottom:10px;overflow:hidden;cursor:pointer;
          box-shadow:${isAttiva ? "0 4px 20px rgba(14,90,122,0.15)" : "0 2px 8px rgba(0,0,0,0.04)"};
          transition:all .15s;
        ">
          <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;">
            ${cat.immagine_url ? `<img src="${esc(cat.immagine_url)}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0;">` : `<div style="width:48px;height:48px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📂</div>`}
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:800;color:#111827;">${esc(cat.nome)}</div>
              ${cat.descrizione ? `<div style="font-size:12px;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(cat.descrizione)}</div>` : ""}
              ${cat.ora_inizio ? `<div style="font-size:11px;color:#0E5A7A;font-weight:700;margin-top:2px;">⏰ ${cat.ora_inizio}–${cat.ora_fine}</div>` : ""}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
              <div style="display:flex;align-items:center;gap:6px;">
                <div style="width:8px;height:8px;border-radius:50%;background:${cat.attivo !== false ? "#22c55e" : "#d1d5db"};"></div>
                <span style="font-size:11px;color:#64748b;">${cat.attivo !== false ? "On" : "Off"}</span>
              </div>
              <div style="display:flex;gap:4px;">
                <button class="btn-edit-cat" data-id="${cat.id}" style="background:#f3f4f6;border:none;border-radius:8px;padding:4px 8px;font-size:11px;cursor:pointer;" title="Modifica">✏️</button>
                <button class="btn-toggle-cat" data-id="${cat.id}" data-attivo="${cat.attivo !== false}" style="background:#f3f4f6;border:none;border-radius:8px;padding:4px 8px;font-size:11px;cursor:pointer;" title="${cat.attivo !== false ? "Disattiva" : "Attiva"}">${cat.attivo !== false ? "⏸" : "▶"}</button>
                <button class="btn-del-cat" data-id="${cat.id}" style="background:#fee2e2;border:none;border-radius:8px;padding:4px 8px;font-size:11px;cursor:pointer;color:#dc2626;" title="Elimina">🗑</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function bindCategorie() {
    const container2 = document.getElementById("categorie-container");
    if (!container2) return;

    container2.querySelectorAll(".cat-card").forEach(el => {
      el.onclick = (e) => {
        if (e.target.closest("button")) return;
        const cat = categorie.find(c => c.id === el.dataset.id);
        selezionaCategoria(cat);
      };
    });

    container2.querySelectorAll(".btn-toggle-cat").forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); toggleCategoria(btn.dataset.id, btn.dataset.attivo === "true"); };
    });

    container2.querySelectorAll(".btn-del-cat").forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); eliminaCategoria(btn.dataset.id); };
    });

    container2.querySelectorAll(".btn-edit-cat").forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); aprireFormCategoria(categorie.find(c => c.id === btn.dataset.id)); };
    });
  }

  // ── SELEZIONA CATEGORIA ───────────────────────────────────────────
  async function selezionaCategoria(cat) {
    catAttiva = cat;
    await loadVoci(cat.id);
    renderCategorieContainer();
    renderVoci();
  }

  function renderCategorieContainer() {
    const box = document.getElementById("categorie-container");
    if (box) { box.innerHTML = renderCategorieHTML(); bindCategorie(); }
  }

  // ── RENDER VOCI ───────────────────────────────────────────────────
  function renderVoci() {
    document.getElementById("col-dx-placeholder").style.display = "none";
    const box = document.getElementById("col-dx-voci");
    box.style.display = "block";

    box.innerHTML = `
      <div style="padding:14px;border-bottom:1px solid #e5e7eb;background:#fff;position:sticky;top:0;z-index:10;">
        <div style="font-size:14px;font-weight:800;color:#111827;margin-bottom:2px;">🍽️ ${esc(catAttiva?.nome || "")}</div>
        <div style="font-size:12px;color:#64748b;">${voci.length} prodotti</div>
        <button id="btn-add-voce" style="margin-top:8px;width:100%;background:#0E5A7A;color:#fff;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:800;cursor:pointer;">+ Aggiungi prodotto</button>
      </div>

      <div id="lista-voci" style="padding:10px;">
        ${voci.length === 0 ? `<div style="text-align:center;color:#94a3b8;padding:32px 16px;font-size:13px;font-weight:600;">Nessun prodotto.<br>Clicca "+ Aggiungi prodotto"</div>` :
          voci.map(v => renderVoceCard(v)).join("")
        }
      </div>
    `;

    document.getElementById("btn-add-voce").onclick = () => aprireModalVoce();

    box.querySelectorAll(".btn-del-voce").forEach(btn => {
      btn.onclick = () => eliminaVoce(btn.dataset.id);
    });
    box.querySelectorAll(".btn-toggle-voce").forEach(btn => {
      btn.onclick = () => toggleVoce(btn.dataset.id, btn.dataset.attivo === "true");
    });
  }

  function renderVoceCard(v) {
    const fc = v.food_cost_snapshot ? Number(v.food_cost_snapshot) : null;
    const prezzo = v.prezzo_override || v.prezzo || 0;
    const margine = fc ? ((Number(prezzo) - fc) / Number(prezzo) * 100) : null;
    const margineColor = margine === null ? "#64748b" : margine > 60 ? "#16a34a" : margine > 40 ? "#f59e0b" : "#dc2626";

    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;margin-bottom:8px;overflow:hidden;${!v.disponibile ? "opacity:.6;" : ""}">
        <div style="display:flex;gap:10px;padding:12px;">
          ${v.foto_url ? `<img src="${esc(v.foto_url)}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0;">` : `<div style="width:56px;height:56px;border-radius:10px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🍽️</div>`}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;">
              <div style="font-size:14px;font-weight:800;color:#111827;">${esc(v.nome)}</div>
              <div style="font-size:16px;font-weight:800;color:#0E5A7A;white-space:nowrap;">€ ${Number(prezzo).toFixed(2)}</div>
            </div>
            ${v.descrizione ? `<div style="font-size:11px;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(v.descrizione)}</div>` : ""}
            ${fc !== null ? `
              <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
                <span style="font-size:10px;font-weight:700;color:${margineColor};">📊 ${margine?.toFixed(0)}% margine</span>
                <span style="font-size:10px;color:#94a3b8;">FC: €${fc.toFixed(2)}</span>
              </div>
              <div style="margin-top:4px;background:#f3f4f6;border-radius:999px;height:4px;overflow:hidden;">
                <div style="height:100%;border-radius:999px;background:${margineColor};width:${Math.min(margine || 0, 100)}%;"></div>
              </div>
            ` : ""}
          </div>
        </div>
        <div style="border-top:1px solid #f3f4f6;padding:8px 12px;display:flex;gap:6px;align-items:center;">
          <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;background:${v.disponibile ? "#dcfce7" : "#fee2e2"};color:${v.disponibile ? "#16a34a" : "#dc2626"};">${v.disponibile ? "Disponibile" : "Non disp."}</span>
          ${v.alert_food_cost ? `<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;background:#fef3c7;color:#92400e;">⚠️ FC alto</span>` : ""}
          <div style="margin-left:auto;display:flex;gap:4px;">
            <button class="btn-toggle-voce" data-id="${v.id}" data-attivo="${v.disponibile}" style="background:#f3f4f6;border:none;border-radius:8px;padding:4px 8px;font-size:11px;cursor:pointer;">${v.disponibile ? "⏸" : "▶"}</button>
            <button class="btn-del-voce" data-id="${v.id}" style="background:#fee2e2;border:none;border-radius:8px;padding:4px 8px;font-size:11px;cursor:pointer;color:#dc2626;">🗑</button>
          </div>
        </div>
      </div>
    `;
  }

  // ── FORM CATEGORIA ────────────────────────────────────────────────
  function aprireFormCategoria(cat = null) {
    const nome = cat ? prompt("Nome categoria:", cat.nome) : prompt("Nome nuova categoria:");
    if (!nome?.trim()) return;
    if (cat) {
      aggiornaNomeCategoria(cat.id, nome.trim());
    } else {
      creaCategoria(nome.trim());
    }
  }

  async function creaCategoria(nome) {
    const { error } = await supa().from("menu_categorie").insert({
      azienda_id, menu_id: menuAttivo.id,
      nome, ordine: categorie.length, attivo: true, visibile: true
    });
    if (error) { alert("Errore creazione categoria"); return; }
    await loadCategorie(menuAttivo.id);
    renderMenuEditor();
  }

  async function aggiornaNomeCategoria(id, nome) {
    await supa().from("menu_categorie").update({ nome }).eq("id", id).eq("azienda_id", azienda_id);
    await loadCategorie(menuAttivo.id);
    renderMenuEditor();
    if (catAttiva?.id === id) { catAttiva.nome = nome; renderVoci(); }
  }

  async function toggleCategoria(id, attivo) {
    await supa().from("menu_categorie").update({ attivo: !attivo }).eq("id", id).eq("azienda_id", azienda_id);
    await loadCategorie(menuAttivo.id);
    renderCategorieContainer();
  }

  async function eliminaCategoria(id) {
    if (!confirm("Eliminare categoria e tutti i suoi prodotti?")) return;
    await supa().from("menu_voci").delete().eq("categoria_id", id).eq("azienda_id", azienda_id);
    await supa().from("menu_categorie").delete().eq("id", id).eq("azienda_id", azienda_id);
    await loadCategorie(menuAttivo.id);
    if (catAttiva?.id === id) {
      catAttiva = null;
      document.getElementById("col-dx-placeholder").style.display = "flex";
      document.getElementById("col-dx-voci").style.display = "none";
    }
    renderMenuEditor();
  }

  // ── MODAL VOCE ────────────────────────────────────────────────────
  let voceAttiva = null;

  function aprireModalVoce() {
    voceAttiva = null;
    document.getElementById("modal-voce-title").textContent = "➕ Aggiungi prodotto";
    resetFormVoce();
    document.getElementById("modal-voce").style.display = "flex";
  }

  function chiudiModalVoce() {
    document.getElementById("modal-voce").style.display = "none";
  }

  function resetFormVoce() {
    document.getElementById("voce-ricetta-select").value = "";
    document.getElementById("voce-prodotto-select").value = "";
    document.getElementById("voce-nome-manuale").value = "";
    document.getElementById("voce-desc-manuale").value = "";
    document.getElementById("voce-prezzo").value = "";
    document.getElementById("voce-iva").value = "10";
    document.getElementById("voce-foto-url").value = "";
    document.getElementById("voce-foto-preview").innerHTML = "";
    document.getElementById("voce-disponibile").checked = true;
    document.getElementById("voce-visibile").checked = true;
    document.getElementById("voce-chef").checked = false;
    document.getElementById("food-cost-live").style.display = "none";
    document.getElementById("ricetta-info").style.display = "none";
    document.getElementById("msg-voce").textContent = "";
    switchVoceTab("ricetta");
  }

  function switchVoceTab(tab) {
    ["ricetta","prodotto","manuale"].forEach(t => {
      document.getElementById(`voce-tab-${t}`).style.display = t === tab ? "block" : "none";
    });
    document.querySelectorAll(".voce-tab").forEach(btn => {
      btn.style.cssText = btn.dataset.tab === tab ? tabActiveStyle : tabStyle;
    });
  }

  function onRicettaChange() {
    const id = document.getElementById("voce-ricetta-select").value;
    const r = ricette.find(x => String(x.id) === String(id));
    const info = document.getElementById("ricetta-info");
    if (!r) { info.style.display = "none"; document.getElementById("food-cost-live").style.display = "none"; return; }
    info.style.display = "block";
    info.innerHTML = `<strong>${esc(r.nome)}</strong><br><span style="color:#64748b;font-size:12px;">${esc(r.descrizione || "")}</span>`;
    const fc = r.costo_porzione || r.costo_totale;
    if (fc) {
      currentFoodCost = Number(fc);
      document.getElementById("voce-prezzo").dispatchEvent(new Event("input"));
    }
  }

  let currentFoodCost = null;

  function aggiornaFoodCost() {
    const prezzo = parseFloat(document.getElementById("voce-prezzo").value);
    const box = document.getElementById("food-cost-live");
    if (!currentFoodCost || !prezzo || prezzo <= 0) { box.style.display = "none"; return; }
    const margine = prezzo - currentFoodCost;
    const perc = (margine / prezzo) * 100;
    box.style.display = "block";
    document.getElementById("fc-costo").textContent = "€" + currentFoodCost.toFixed(2);
    document.getElementById("fc-margine").textContent = "€" + margine.toFixed(2);
    document.getElementById("fc-perc").textContent = perc.toFixed(0) + "%";
    document.getElementById("fc-perc").style.color = perc > 60 ? "#16a34a" : perc > 40 ? "#f59e0b" : "#dc2626";
    document.getElementById("fc-bar").style.width = Math.min(perc, 100) + "%";
    document.getElementById("fc-bar").style.background = perc > 60 ? "#22c55e" : perc > 40 ? "#f59e0b" : "#ef4444";
  }

  // ── SALVA VOCE ────────────────────────────────────────────────────
  async function salvaVoce() {
    const btn = document.getElementById("btn-salva-voce");
    const msg = document.getElementById("msg-voce");
    const prezzo = parseFloat(document.getElementById("voce-prezzo").value);
    if (!prezzo || prezzo <= 0) { msg.innerHTML = `<span style="color:#dc2626;">Prezzo obbligatorio</span>`; return; }

    // Determina sorgente
    const tabAttivo = document.querySelector(".voce-tab[style*='background:#0E5A7A']")?.dataset.tab || "ricetta";
    let nome = "", descrizione = "", ricettaId = null, prodottoId = null, foodCost = null;

    if (tabAttivo === "ricetta") {
      const rId = document.getElementById("voce-ricetta-select").value;
      if (!rId) { msg.innerHTML = `<span style="color:#dc2626;">Seleziona una ricetta</span>`; return; }
      const r = ricette.find(x => String(x.id) === String(rId));
      nome = r.nome; descrizione = r.descrizione || "";
      ricettaId = r.id;
      foodCost = r.costo_porzione || r.costo_totale || null;
    } else if (tabAttivo === "prodotto") {
      const pId = document.getElementById("voce-prodotto-select").value;
      if (!pId) { msg.innerHTML = `<span style="color:#dc2626;">Seleziona un prodotto</span>`; return; }
      const p = prodotti.find(x => String(x.id) === String(pId));
      nome = p.nome; descrizione = p.descrizione || "";
      prodottoId = p.id;
    } else {
      nome = document.getElementById("voce-nome-manuale").value.trim();
      descrizione = document.getElementById("voce-desc-manuale").value.trim();
      if (!nome) { msg.innerHTML = `<span style="color:#dc2626;">Nome obbligatorio</span>`; return; }
    }

    const fotoUrl = document.getElementById("voce-foto-url").value.trim() || null;
    const iva = parseFloat(document.getElementById("voce-iva").value) || 10;
    const disponibile = document.getElementById("voce-disponibile").checked;
    const visibile = document.getElementById("voce-visibile").checked;
    const alertFoodCost = foodCost ? (foodCost / prezzo) > 0.4 : false;

    btn.disabled = true; btn.textContent = "Salvataggio...";

    const { error } = await supa().from("menu_voci").insert({
      azienda_id,
      menu_id: menuAttivo.id,
      categoria_id: catAttiva.id,
      nome, descrizione, prezzo, iva,
      ricetta_id: ricettaId,
      prodotto_vendita_id: prodottoId,
      food_cost_snapshot: foodCost,
      foto_url: fotoUrl,
      disponibile, visibile, attivo: true,
      alert_food_cost: alertFoodCost,
      ordine: voci.length
    });

    btn.disabled = false; btn.textContent = "💾 Salva prodotto";

    if (error) { msg.innerHTML = `<span style="color:#dc2626;">Errore: ${error.message}</span>`; return; }

    msg.innerHTML = `<span style="color:#16a34a;">✅ Prodotto aggiunto!</span>`;
    await loadVoci(catAttiva.id);
    renderVoci();
    setTimeout(() => chiudiModalVoce(), 800);
  }

  async function toggleVoce(id, disponibile) {
    await supa().from("menu_voci").update({ disponibile: !disponibile }).eq("id", id).eq("azienda_id", azienda_id);
    await loadVoci(catAttiva.id);
    renderVoci();
  }

  async function eliminaVoce(id) {
    if (!confirm("Eliminare questo prodotto dal menu?")) return;
    await supa().from("menu_voci").delete().eq("id", id).eq("azienda_id", azienda_id);
    await loadVoci(catAttiva.id);
    renderVoci();
  }

  // ── MODAL NUOVO MENU ─────────────────────────────────────────────
  function aprireModalMenu() {
    document.getElementById("modal-nuovo-menu").style.display = "flex";
  }

  function chiudiModalMenu() {
    document.getElementById("modal-nuovo-menu").style.display = "none";
  }

  async function creaMenu() {
    const btn = document.getElementById("btn-crea-menu");
    const msg = document.getElementById("msg-nuovo-menu");
    const nome = document.getElementById("nuovo-menu-nome").value.trim();
    if (!nome) { msg.innerHTML = `<span style="color:#dc2626;">Nome obbligatorio</span>`; return; }

    const slug = document.getElementById("nuovo-menu-slug").value.trim() || makeSlug(nome);
    const descrizione = document.getElementById("nuovo-menu-descrizione").value.trim();
    const colore = document.getElementById("nuovo-menu-colore-hex").value || "#0E5A7A";
    const sfondo = document.getElementById("nuovo-menu-sfondo-hex").value || "#ffffff";
    const tracking = document.getElementById("nuovo-menu-tracking").checked;

    btn.disabled = true; btn.textContent = "Creazione...";

    const { data, error } = await supa().from("menu").insert({
      azienda_id, sede_id,
      nome, slug, descrizione,
      colore_primario: colore,
      colore_sfondo: sfondo,
      raccolta_dati: tracking,
      attivo: true
    }).select().single();

    btn.disabled = false; btn.textContent = "🚀 Crea menu";

    if (error) { msg.innerHTML = `<span style="color:#dc2626;">Errore: ${error.message}</span>`; return; }

    chiudiModalMenu();
    await loadMenus();
    renderListaMenu();
    selezionaMenu(data);
  }

  // ── SALVA IMPOSTAZIONI MENU ───────────────────────────────────────
  async function salvaImpostazioniMenu() {
    const msg = document.getElementById("msg-settings");
    msg.innerHTML = "Salvataggio...";

    const { error } = await supa().from("menu").update({
      nome: document.getElementById("edit-menu-nome").value.trim(),
      slug: document.getElementById("edit-menu-slug").value.trim() || null,
      logo_url: document.getElementById("edit-menu-logo").value.trim() || null,
      cover_url: document.getElementById("edit-menu-cover").value.trim() || null,
      colore_primario: document.getElementById("edit-menu-colore-hex").value || null,
      colore_sfondo: document.getElementById("edit-menu-sfondo-hex").value || null,
    }).eq("id", menuAttivo.id).eq("azienda_id", azienda_id);

    if (error) { msg.innerHTML = `<span style="color:#dc2626;">Errore</span>`; return; }

    msg.innerHTML = `<span style="color:#16a34a;">✅ Salvato</span>`;
    await loadMenus();
    menuAttivo = menus.find(m => m.id === menuAttivo.id);
    renderMenuEditor();
    renderListaMenu();
    setTimeout(() => { if (msg) msg.innerHTML = ""; }, 3000);
  }

  async function toggleMenu() {
    await supa().from("menu").update({ attivo: !menuAttivo.attivo }).eq("id", menuAttivo.id).eq("azienda_id", azienda_id);
    await loadMenus();
    menuAttivo = menus.find(m => m.id === menuAttivo.id);
    renderMenuEditor();
    renderListaMenu();
  }

  // ── UPLOAD ───────────────────────────────────────────────────────
  async function uploadFile(file, prefix) {
    if (!file) return null;
    const ext = file.name.split(".").pop();
    const path = `${azienda_id}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supa().storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = supa().storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadFotoVoce() {
    const file = document.getElementById("voce-foto-file").files[0];
    if (!file) return;
    const url = await uploadFile(file, "menu-voce");
    if (url) {
      document.getElementById("voce-foto-url").value = url;
      document.getElementById("voce-foto-preview").innerHTML = `<img src="${esc(url)}" style="width:80px;height:80px;object-fit:cover;border-radius:10px;margin-top:6px;">`;
    }
  }

  // ── QR ───────────────────────────────────────────────────────────
  function mostraQR(slug) {
    const url = `${BASE_URL}/menu-pubblico.html?slug=${slug}`;
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    const win = window.open("", "_blank", "width=360,height=420");
    win.document.write(`<html><body style="margin:0;display:flex;flex-direction:column;align-items:center;padding:20px;font-family:sans-serif;">
      <h3 style="margin-bottom:12px;">${slug}</h3>
      <img src="${qr}" style="width:280px;height:280px;">
      <p style="font-size:12px;color:#666;margin-top:12px;word-break:break-all;">${url}</p>
      <a href="${qr}" download="qr-${slug}.png" style="margin-top:8px;background:#0E5A7A;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:700;">Scarica QR</a>
    </body></html>`);
  }

  // ── UTILS ────────────────────────────────────────────────────────
  function makeSlug(v) {
    return String(v).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  }

  function esc(v) {
    return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
}

// ── COSTANTI STILE ────────────────────────────────────────────────
const labelStyle = "font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px;";
const inputStyle = "padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none;";
const btnPrimaryStyle = "background:#0E5A7A;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;";
const btnSecStyle = "background:#f3f4f6;color:#374151;border:none;border-radius:10px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;";
const btnDangerStyle = "background:#fee2e2;color:#dc2626;border:none;border-radius:10px;padding:9px 16px;font-weight:700;font-size:13px;cursor:pointer;";
const tabActiveStyle = "background:#0E5A7A;color:#fff;border:none;border-radius:10px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer;";
const tabStyle = "background:#f3f4f6;color:#374151;border:none;border-radius:10px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer;";
