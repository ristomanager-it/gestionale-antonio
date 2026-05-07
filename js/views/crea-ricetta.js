// js/views/crea-ricetta.js
// ============================================================
// CREA / MODIFICA RICETTA – VERSIONE INDUSTRIALE (MODULARE)
// Coerente con struttura DB reale:
// - ricette
// - ricetta_ingredienti
// - ricette_preparazione_fasi
// - ricette_conservazione
// - ricette_cottura (1 record per ricetta)
// - ricette_output (1 record per ricetta)
// - ricette_porzione
// + ricette_output_secondari (coprodotti / rifili)
// ============================================================
import { requirePermessi } from "../auth-utils.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";
let ricettaId = null;

let prodottiCache = [];
let prodottiMap = new Map();

let categoriePortataCache = [];
let categoriePortataMap = new Map();

let fasiTemplateCache = [];
let fasiTemplateMap = new Map();

let ingredientiCache = [];
let fasiCache = [];
let conservazioniCache = [];
let conservazionePassaggiMap = new Map();
let porzioniCache = [];
let cotturaCache = null;
let outputCache = null;
let outputSecondariCache = [];

let _autocompleteDocBound = false;

// mini-tab fasi
let faseTabAttiva = "preparazione";

export async function render(app) {
  ricettaId = window.routeParams?.id ? String(window.routeParams.id) : null;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  // ============================================================
  // ? CONTROLLO PERMESSI
  // ============================================================

  if (!requirePermessi({
    container: app,
    resource: "ricette",
    action: "read"
  })) return;

  if (!ricettaId) {
    if (!requirePermessi({
      container: app,
      resource: "ricette",
      action: "create"
    })) return;
  } else {
    if (!requirePermessi({
      container: app,
      resource: "ricette",
      action: "update"
    })) return;
  }

  // ============================================================
  // ? LAYOUT DEFINITIVO (COME PREVENTIVO)
  // ============================================================

  app.innerHTML = createPageLayout({
    title: ricettaId ? "Modifica Ricetta" : "Crea Ricetta",
    subtitle: "Struttura operativa ed economica",
    content: `
 <div style="margin-bottom:16px;">
        <button id="btn-help" class="app-button gray small" type="button">
         Come funziona questa scheda
        </button>
      </div>

      <div id="help-box" style="
        display:none;
        background:#f4f4f4;
        border-radius:12px;
        padding:16px;
        margin-bottom:20px;
        font-size:14px;
        line-height:1.5;
      ">
        <strong>Guida compilazione ricetta</strong><br><br>

  <strong>1️⃣ Anagrafica</strong><br>
  Definisce identità e quantità base della ricetta.<br>
  <em>Esempio:</em> Ragù classico – 10 porzioni base.<br><br>

  <strong>2️⃣ Ingredienti</strong><br>
  Inserire solo prodotti codificati con quantità REALI utilizzate.<br>
  Questo genera il food cost.<br>
  <em>Esempio:</em><br>
  • Carne macinata 5 kg<br>
  • Passata pomodoro 3 kg<br>
  • Olio EVO 0,25 kg<br><br>

  <strong>3️⃣ Output (Resa)</strong><br>
  Indicare il prodotto finale e il peso reale dopo la lavorazione.<br>
  Serve per calcolare il costo unitario.<br>
  <em>Esempio:</em><br>
  Input totale 8,5 kg → Resa reale 7,2 kg<br><br>

  <strong>4️⃣ Procedimento</strong><br>
  Standard operativo replicabile da qualsiasi operatore.<br>
  Per ogni fase indicare titolo, durata, lavoro umano, tecnologia e temperatura.<br>
  <em>Esempio:</em><br>
  Fase 1 – Soffritto (15 min, 15 min lavoro umano, pentola)<br>
  Fase 2 – Cottura lenta (180 min, 10 min lavoro umano, 90°C)<br><br>

  <strong>5️⃣ Porzionature</strong><br>
  Definisce utilizzo commerciale della ricetta.<br>
  <em>Esempio:</em><br>
  • Ristorante → 180 g<br>
  • Evento → 130 g<br>
  • Trattoria → 220 g<br><br>

  <strong>6️⃣ Conservazione</strong><br>
  Inserire scenari completi con tutti i passaggi tecnici.<br>
  Determina shelf life ed etichetta lotto.<br>
  <em>Esempio scenario 1:</em><br>
  • Abbattimento +3°C – 90 min<br>
  • Sottovuoto – 15 min<br>
  • Conservazione frigo 0/+3°C – 5 giorni<br><br>

  <em>Esempio scenario 2:</em><br>
  • Abbattimento -18°C – 120 min<br>
  • Conservazione freezer – 90 giorni<br><br>

  <strong>7️⃣ Coprodotti</strong><br>
  Inserire eventuali output secondari per corretta allocazione costi.<br>
  <em>Esempio:</em><br>
  • Fondo bruno 1,2 kg<br>
  • Grasso filtrato 0,4 kg<br><br>

  <strong>⚙️ Regola generale</strong><br>
  Questa è una scheda operativa.<br>
  Se compilata correttamente permette:<br>
  • Calcolo preciso costi<br>
  • Standardizzazione produzione<br>
  • Tracciabilità lotti<br>
  • Controllo qualità

</div>

      <div class="form-actions" style="margin-bottom:16px;">
      <div class="form-actions" style="margin-bottom:16px;">
        <button class="app-button secondary"
          onclick="window.location.hash='#/produzione'">
          Indietro
        </button>
      </div>

      ${createCard({
        title: "Anagrafica",
        body: `
          <div class="form-grid">

            <div class="form-group">
              <label>Nome ricetta *</label>
              <input id="r-nome" class="input" />
            </div>

            <div class="form-group">
              <label>Tipo ricetta *</label>
              <select id="r-tipo" class="input">
                <option value="base">Base (semilavorato)</option>
                <option value="finita">Piatto finito</option>
              </select>
            </div>

            <div class="form-group" id="categoria-wrapper" style="display:none;">
              <label>Categoria portata *</label>
              <div class="input-wrap">
                <input id="r-categoria-search"
                  class="input"
                  autocomplete="off"
                  placeholder="Cerca o crea categoria..." />
                <input id="r-categoria-id" type="hidden" />
                <div id="r-categoria-suggest" class="suggest-list"></div>
              </div>
            </div>

            <div class="form-group">
              <label>Pezzi base</label>
              <input id="r-pezzi-base" type="number" min="0" class="input" />
            </div>

            <div class="form-group">
              <label>Foto piatto</label>
              <input id="r-foto-file"
                type="file"
                class="input"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />
              <input id="r-foto-url" type="hidden" />
              <div id="r-foto-preview-wrap" style="margin-top:10px; display:none;">
                <img id="r-foto-preview"
                  alt="Preview foto piatto"
                  style="width:100%; max-width:260px; border-radius:12px; border:1px solid rgba(0,0,0,0.08);" />
              </div>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label>Descrizione</label>
              <textarea id="r-descrizione" class="input"></textarea>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <label>Note procedimento</label>
              <textarea id="r-note-proc" class="input"></textarea>
            </div>

          </div>
        `
      })}

      ${createCard({
        title: "Ingredienti",
        body: `
          <div id="ingredienti-container"></div>

          <div class="form-actions">
            <button id="btn-add-ing"
              class="app-button secondary"
              type="button">
              + Aggiungi ingrediente
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Output (Resa)",
        body: `
          <div class="form-grid">

            <div class="form-group" style="grid-column:1/-1;">
              <label>Prodotto output *</label>
              <div class="input-wrap">
                <input id="r-output-search"
                  class="input"
                  autocomplete="off"
                  placeholder="Cerca prodotto..." />
                <input id="r-output-id" type="hidden" />
                <div id="r-output-suggest" class="suggest-list"></div>
              </div>
            </div>

            <div class="form-group">
              <label>Peso finale *</label>
              <input id="r-output-peso"
                type="number"
                step="0.001"
                class="input" />
            </div>

            <div class="form-group">
              <label>Unità misura *</label>
              <select id="r-output-um" class="input">
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="pz">pz</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
              </select>
            </div>

            <div class="form-group" style="grid-column:1/-1;">
              <div id="r-cost-preview" class="small-muted">
                Food cost: —
              </div>
            </div>

          </div>
        `
      })}

      ${createCard({
        title: "Procedimento",
        body: `
          <div id="fasi-container"></div>

          <div class="form-actions">
            <button id="btn-add-fase"
              class="app-button secondary"
              type="button">
              + Aggiungi fase
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Porzionature",
        body: `
          <div id="porzioni-container"></div>

          <div class="form-actions">
            <button id="btn-add-porzione"
              class="app-button secondary"
              type="button">
              + Aggiungi porzione
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Conservazione",
        body: `
          <div id="conservazione-container"></div>

          <div class="form-actions">
            <button id="btn-add-conservazione"
              class="app-button secondary"
              type="button">
              + Aggiungi scenario
            </button>
          </div>
        `
      })}

      ${createCard({
        title: "Area Economica",
        body: `
          <div id="output-secondari-container"></div>

          <div class="form-actions">
            <button id="btn-add-out2"
              class="app-button secondary"
              type="button">
              + Aggiungi coprodotto
            </button>
          </div>
        `
      })}

      <div class="form-actions" style="margin-top:20px;">
        <button id="btn-salva"
          class="app-button">
          Salva Ricetta
        </button>
      </div>

      <div id="r-esito" class="form-result"></div>
    `
  });

  // ============================================================
  // ? LOGICA ORIGINALE (NON TOCCATA)
  // ============================================================

  await loadProdotti();
  await loadCategoriePortata();
  await loadFasiTemplate();
  bindUI();

  if (ricettaId) {
    await caricaRicettaCompleta();
  } else {
    // default: finita (coerente con default DB). Cambia qui se preferisci "base".
    setVal("r-tipo", "finita");
    const wrapCat = document.getElementById("categoria-wrapper");
    if (wrapCat) wrapCat.style.display = "";

    aggiungiIngrediente();
    aggiungiFase({ ordine: 1, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });
    aggiungiScenarioConservazione();
    aggiungiPorzione();
    aggiornaOutputInfo();
  }
}
/* ============================================================
   PRODOTTI + AUTOCOMPLETE
============================================================ */
async function loadProdotti() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, descrizione, um, costo_medio")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("descrizione");

  if (error) {
    console.error(error);
    prodottiCache = [];
    prodottiMap = new Map();
    return;
  }

  prodottiCache = data || [];
  prodottiMap = new Map(prodottiCache.map(p => [String(p.id), p]));

  setupAutocomplete(
    document.getElementById("r-output-search"),
    document.getElementById("r-output-id"),
    document.getElementById("r-output-suggest"),
    (p) => {
      const umSel = document.getElementById("r-output-um");
      if (p?.um && umSel) {
        const val = String(p.um).toLowerCase();
        const ok = ["kg", "g", "pz", "l", "ml"].includes(val);
        if (ok) umSel.value = val;
      }
      aggiornaOutputInfo();
    }
  );
}

/* ============================================================
   CATEGORIE PORTATA
============================================================ */
async function loadCategoriePortata() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("categorie_portata")
    .select("id, nome")
    .eq("azienda_id", aziendaId)
    .order("nome");

  if (error) {
    console.error(error);
    categoriePortataCache = [];
    categoriePortataMap = new Map();
    return;
  }

  categoriePortataCache = data || [];
  categoriePortataMap = new Map(categoriePortataCache.map(c => [String(c.id), c]));

  setupCategoriaAutocomplete();
}
/* ============================================================
   FASI TEMPLATE
============================================================ */
async function loadFasiTemplate() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data, error } = await supabase
    .from("fasi_template")
    .select("id, titolo, descrizione_operativa, tipo_fase, durata_min_default, lavoro_umano_min_default, tecnologia_default, temperatura_default, richiede_conferma, parametri")
    .eq("azienda_id", aziendaId)
    .eq("attiva", true)
    .order("titolo");

  if (error) {
    console.error(error);
    fasiTemplateCache = [];
    fasiTemplateMap = new Map();
    return;
  }

  fasiTemplateCache = data || [];
  fasiTemplateMap = new Map(fasiTemplateCache.map(t => [String(t.id), t]));
}

function rebuildFasiTemplateOptions(selectEl, tipoFase = null, selectedId = "") {
  if (!selectEl) return;

  const selId = selectedId ? String(selectedId) : "";

  const baseOpt = `<option value="">— Nessun template —</option>`;
  const opts = (fasiTemplateCache || [])
    .filter(t => !tipoFase || String(t.tipo_fase || "") === String(tipoFase || ""))
    .map(t => `<option value="${t.id}">${escapeHtml(t.titolo)}</option>`)
    .join("");

  selectEl.innerHTML = baseOpt + opts;
  if (selId) selectEl.value = selId;
}


function setupAutocomplete(input, hidden, suggestBox, onPick = null) {
  if (!_autocompleteDocBound) {
    _autocompleteDocBound = true;
    document.addEventListener("click", (e) => {
      document.querySelectorAll(".suggest-list.open").forEach(box => {
        const wrap = box.closest(".input-wrap") || box.parentElement;
        if (wrap && !wrap.contains(e.target)) box.classList.remove("open");
      });
    });
  }

  input.addEventListener("input", () => {
    const q = (input.value || "").toLowerCase().trim();
    hidden.value = "";
    suggestBox.innerHTML = "";

    if (q.length < 2) {
      suggestBox.classList.remove("open");
      return;
    }

    const risultati = prodottiCache
      .filter(p => (p.descrizione || "").toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach(p => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = p.descrizione;

      div.onclick = () => {
        input.value = p.descrizione;
        hidden.value = p.id;
        suggestBox.innerHTML = "";
        suggestBox.classList.remove("open");
        if (typeof onPick === "function") onPick(p);
      };

      suggestBox.appendChild(div);
    });

    suggestBox.classList.add("open");
  });
}


function setupCategoriaAutocomplete() {
  const input = document.getElementById("r-categoria-search");
  const hidden = document.getElementById("r-categoria-id");
  const suggestBox = document.getElementById("r-categoria-suggest");

  if (!input || !hidden || !suggestBox) return;

  input.addEventListener("input", () => {
    const q = (input.value || "").toLowerCase().trim();
    hidden.value = "";
    suggestBox.innerHTML = "";

    if (q.length < 1) {
      suggestBox.classList.remove("open");
      return;
    }

    const risultati = categoriePortataCache
      .filter(c => (c.nome || "").toLowerCase().includes(q))
      .slice(0, 10);

    risultati.forEach(c => {
      const div = document.createElement("div");
      div.className = "suggest-item";
      div.textContent = c.nome;

      div.onclick = () => {
        input.value = c.nome;
        hidden.value = c.id;
        suggestBox.innerHTML = "";
        suggestBox.classList.remove("open");
      };

      suggestBox.appendChild(div);
    });

    suggestBox.classList.add("open");
  });

  input.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const nome = (input.value || "").trim();
    if (!nome) return;

    const esistente = categoriePortataCache.find(c =>
      String(c.nome || "").toLowerCase() === nome.toLowerCase()
    );

    if (esistente) {
      input.value = esistente.nome;
      hidden.value = esistente.id;
      suggestBox.innerHTML = "";
      suggestBox.classList.remove("open");
      return;
    }

    const supabase = window.supabaseClient;
    const aziendaId = window.state.azienda.id;

    const { data, error } = await supabase
      .from("categorie_portata")
      .insert({
        azienda_id: aziendaId,
        nome
      })
      .select("id, nome")
      .single();

    if (error) {
      console.error(error);
      return alert("Errore creazione categoria portata.");
    }

    categoriePortataCache.push(data);
    categoriePortataMap.set(String(data.id), data);

    input.value = data.nome;
    hidden.value = data.id;
    suggestBox.innerHTML = "";
    suggestBox.classList.remove("open");
  });
}

async function uploadFotoRicetta(file) {
  if (!file) return null;

  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const ext = String(file.name || "").split(".").pop().toLowerCase();
  const allowed = ["jpg", "jpeg", "png", "webp"];

  if (!allowed.includes(ext)) {
    alert("Formato immagine non supportato. Usa JPG, PNG o WEBP.");
    return null;
  }

  const path = `${aziendaId}/ricetta_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase
    .storage
    .from("ricette")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || undefined
    });

  if (uploadError) {
    console.error(uploadError);
    alert("Errore upload foto ricetta.");
    return null;
  }

  const { data } = supabase
    .storage
    .from("ricette")
    .getPublicUrl(path);

  return data?.publicUrl || null;
}

function aggiornaOutputInfo() {
  const outId = document.getElementById("r-output-id")?.value;
  const outInfo = document.getElementById("r-output-info");
  if (!outInfo) return;

  if (!outId) {
    outInfo.innerText = "Nessun prodotto output selezionato";
    return;
  }

  const p = prodottiMap.get(String(outId));
  if (!p) {
    outInfo.innerText = "Prodotto output selezionato";
    return;
  }

  outInfo.innerText = `Output: ${p.descrizione} — UM: ${p.um || "-"}`;
}

/* ============================================================
   MINI-TAB FASI
============================================================ */
function initFasiTabs() {
  const tabs = document.querySelectorAll(".fase-tab");
  if (!tabs.length) return;

  // default
  if (!faseTabAttiva) faseTabAttiva = "preparazione";

  tabs.forEach(btn => {
    btn.onclick = () => {
      faseTabAttiva = btn.dataset.tab || "preparazione";
      refreshFasiTabUI();
      filterFasiByTab();
    };
  });

  refreshFasiTabUI();
}

function refreshFasiTabUI() {
  document.querySelectorAll(".fase-tab").forEach(btn => {
    const isActive = (btn.dataset.tab === faseTabAttiva);

    // attiva = bottone standard, inattive = gray (nessun colore nuovo)
    btn.className = isActive
      ? "app-button small"
      : "app-button small gray";
  });
}

function filterFasiByTab() {
  const rows = document.querySelectorAll("#fasi-container .azienda-card");
  rows.forEach(row => {
    const tipo = row.dataset.tipoFase || "preparazione";
    row.style.display = (tipo === faseTabAttiva) ? "" : "none";
  });
}

/* ============================================================
   INGREDIENTI
============================================================ */
function aggiungiIngrediente(initial = {}) {
  const container = document.getElementById("ingredienti-container");

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "12px";
  card.style.padding = "14px";

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700; font-size:16px;">Ingrediente</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="app-button tiny" type="button" data-action="up">↑</button>
        <button class="app-button tiny" type="button" data-action="down">↓</button>
        <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
      </div>
    </div>

    <div class="form-grid" style="margin-top:10px;">
      <div class="form-group" style="grid-column:1/-1;">
        <label>Prodotto / ingrediente *</label>
        <div class="input-wrap">
          <input class="ing-search input"
            placeholder="Cerca prodotto..."
            autocomplete="off"
            value="${escapeAttr(initial.nome_prodotto || "")}" />
          <input class="ing-id" type="hidden" value="${escapeAttr(initial.prodotto_id ?? "")}" />
          <div class="ing-suggest suggest-list"></div>
        </div>
      </div>

      <div class="form-group">
        <label>Quantità *</label>
        <input class="ing-qta input" type="number" step="0.001" value="${escapeAttr(initial.quantita ?? "")}" />
      </div>

      <div class="form-group">
        <label>UM *</label>
        <select class="ing-um input">
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="pz">pz</option>
          <option value="l">l</option>
          <option value="ml">ml</option>
        </select>
      </div>

      <div class="form-group" style="grid-column:1/-1;">
        <label>Note (opz.)</label>
        <input class="ing-note input" value="${escapeAttr(initial.note || "")}" />
      </div>
    </div>
  `;

  // riordino
  card.querySelector('[data-action="up"]').addEventListener("click", () => {
    const prev = card.previousElementSibling;
    if (prev) container.insertBefore(card, prev);
    rinumeraOrdineIngredienti();
  });
  card.querySelector('[data-action="down"]').addEventListener("click", () => {
    const next = card.nextElementSibling;
    if (next) container.insertBefore(next, card);
    rinumeraOrdineIngredienti();
  });

  card.querySelector('[data-action="delete"]').addEventListener("click", () => {
    card.remove();
    rinumeraOrdineIngredienti();
    aggiornaOutputInfo();
  });

  const umSel = card.querySelector(".ing-um");
  umSel.value = (initial.unita_misura || "kg").toLowerCase();

  const ingSearch = card.querySelector(".ing-search");
  const ingHidden = card.querySelector(".ing-id");
  const ingSuggest = card.querySelector(".ing-suggest");

  setupAutocomplete(ingSearch, ingHidden, ingSuggest, (p) => {
    // se il prodotto ha UM, proponila
    if (p?.um && umSel) {
      const val = String(p.um).toLowerCase();
      const ok = ["kg", "g", "pz", "l", "ml"].includes(val);
      if (ok) umSel.value = val;
    }
    aggiornaOutputInfo();
  });

  // aggiorna food cost su change qty/um
  card.querySelector(".ing-qta").addEventListener("input", () => aggiornaOutputInfo());
  umSel.addEventListener("change", () => aggiornaOutputInfo());

  container.appendChild(card);
  rinumeraOrdineIngredienti();
}

function rinumeraOrdineIngredienti() {
  const container = document.getElementById("ingredienti-container");
  if (!container) return;
  // non abbiamo campo ordine visibile: l'ordine verrà salvato in base alla posizione DOM
}


/* ============================================================
   FASI
============================================================ */
function aggiungiFase(initial = {}) {
  const container = document.getElementById("fasi-container");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "14px";
  card.style.padding = "16px";

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <div class="fase-title" style="font-weight:700; font-size:18px;">Fase</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
        <button class="app-button tiny" type="button" data-action="up">↑</button>
        <button class="app-button tiny" type="button" data-action="down">↓</button>
        <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
      </div>
    </div>

    <div class="form-grid" style="margin-top:12px;">
      
      <div class="form-group" style="grid-column:1/-1;">
        <label>Descrizione operativa</label>
        <textarea class="fase-descrizione input" rows="4" placeholder="Istruzioni operative per l’operatore...">${escapeHtml(initial.descrizione_operativa || "")}</textarea>
      </div>

      <div class="form-group">
        <label>Durata totale (min)</label>
        <input class="fase-durata input" type="number" min="0" value="${escapeAttr(initial.durata_min ?? 0)}" />
      </div>

      <div class="form-group">
        <label>Lavoro umano (min)</label>
        <input class="fase-lavoro input" type="number" min="0" value="${escapeAttr(initial.lavoro_umano_min ?? 0)}" />
      </div>

      <div class="form-group">
        <label>Tecnologia (opz.)</label>
        <input class="fase-tecnologia input" value="${escapeAttr(initial.tecnologia || "")}" />
      </div>

      <div class="form-group">
        <label>Temperatura (°C)</label>
        <input class="fase-temperatura input" type="number" step="0.1" value="${escapeAttr(initial.temperatura ?? "")}" />
      </div>

      <div class="form-group">
        <label>Tipo fase</label>
        <select class="fase-tipo input">
          <option value="preparazione">preparazione</option>
          <option value="cottura">cottura</option>
          <option value="attesa">attesa</option>
          <option value="raffreddamento">raffreddamento</option>
        </select>
      </div>

      <div class="form-group" style="grid-column:1/-1;">
        <label>Note (opz.)</label>
        <input class="fase-note input" value="${escapeAttr(initial.note || "")}" />
      </div>
    </div>
  `;

  const selTipo = card.querySelector(".fase-tipo");
  if (selTipo) selTipo.value = initial.tipo_fase || "preparazione";

  const btnUp = card.querySelector('[data-action="up"]');
  const btnDown = card.querySelector('[data-action="down"]');
  const btnDel = card.querySelector('[data-action="delete"]');

  if (btnUp) btnUp.addEventListener("click", () => {
    const prev = card.previousElementSibling;
    if (prev) container.insertBefore(card, prev);
    renumberFasi();
  });

  if (btnDown) btnDown.addEventListener("click", () => {
    const next = card.nextElementSibling;
    if (next) container.insertBefore(next, card);
    renumberFasi();
  });

  if (btnDel) btnDel.addEventListener("click", () => {
    card.remove();
    renumberFasi();
  });

  container.appendChild(card);
  renumberFasi();
}

function renumberFasi() {
  const rows = document.querySelectorAll("#fasi-container .azienda-card");
  rows.forEach((card, idx) => {
    const t = card.querySelector(".fase-title");
    if (t) t.textContent = `Fase ${idx + 1}`;
  });
}



/* ============================================================
   COPRODOTTI / OUTPUT SECONDARI (Area economica tecnica)
   Nota: la parte economica è gestita in amministrazione, ma qui
   teniamo i coprodotti per la resa e lo scarico/costo materia.
============================================================ */
function aggiungiOutputSecondario(initial = {}) {
  const container = document.getElementById("output-secondari-container");

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "12px";
  card.style.padding = "14px";

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700; font-size:16px;">Coprodotto</div>
     <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
    </div>

    <div class="form-grid" style="margin-top:10px;">
      <div class="form-group" style="grid-column:1/-1;">
        <label>Prodotto coprodotto *</label>
        <div class="input-wrap">
          <input class="out2-search input"
            placeholder="Cerca prodotto..."
            autocomplete="off"
            value="${escapeAttr(initial.nome_prodotto || "")}" />
          <input class="out2-id" type="hidden" value="${escapeAttr(initial.prodotto_id ?? "")}" />
          <div class="out2-suggest suggest-list"></div>
        </div>
      </div>

      <div class="form-group">
        <label>Peso *</label>
        <input class="out2-peso input" type="number" step="0.001" value="${escapeAttr(initial.peso ?? "")}" />
      </div>

      <div class="form-group">
        <label>UM *</label>
        <select class="out2-um input">
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="pz">pz</option>
        </select>
      </div>

      <div class="form-group">
        <label>Metodo allocazione</label>
        <select class="out2-metodo input">
          <option value="peso">peso</option>
          <option value="percentuale">percentuale</option>
        </select>
      </div>

      <div class="form-group">
        <label>% allocazione (se percentuale)</label>
        <input class="out2-percent input" type="number" step="0.01" min="0" max="100" value="${escapeAttr((initial.percentuale_allocazione != null) ? (Number(initial.percentuale_allocazione) * 100) : "")}" />
      </div>
    </div>
  `;

  card.querySelector('[data-action="delete"]').addEventListener("click", () => card.remove());

  // default values
  card.querySelector(".out2-um").value = (initial.unita_misura || "kg").toLowerCase();
  card.querySelector(".out2-metodo").value = (initial.metodo_allocazione || "peso");

  const s = card.querySelector(".out2-search");
  const hid = card.querySelector(".out2-id");
  const sug = card.querySelector(".out2-suggest");
  setupAutocomplete(s, hid, sug, (p) => {
    if (p?.um) {
      const val = String(p.um).toLowerCase();
      const ok = ["kg", "g", "pz"].includes(val);
      if (ok) card.querySelector(".out2-um").value = val;
    }
  });

  // abilita/disabilita percent
  const metodoSel = card.querySelector(".out2-metodo");
  const percInp = card.querySelector(".out2-percent");
  const syncPerc = () => {
    const isPerc = metodoSel.value === "percentuale";
    percInp.disabled = !isPerc;
    if (!isPerc) percInp.value = "";
  };
  metodoSel.addEventListener("change", syncPerc);
  syncPerc();

  container.appendChild(card);
}


/* ============================================================
   CONSERVAZIONE
============================================================ */
function aggiungiScenarioConservazione(initial = {}, passaggi = []) {
  const container = document.getElementById("conservazione-container");

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "12px";
  card.style.padding = "14px";

  const titolo = initial.scenario_label || "";
  const shelf = (initial.shelf_life_giorni ?? "") === null ? "" : (initial.shelf_life_giorni ?? "");
  const attivoVal = String(initial.attivo ?? true);

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700; font-size:16px;">
        Scenario conservazione
      </div>
      <div style="display:flex; gap:8px;">
        <button class="app-button tiny" type="button" data-action="toggle">▾</button>
        <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
      </div>
    </div>

    <div class="cons-body" style="margin-top:10px;">
      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1;">
          <label>Nome scenario *</label>
          <input class="cons-label input" value="${escapeAttr(titolo)}" placeholder="Es: Abbattimento +3°C / Abbattimento -18°C / Sottovuoto frigo..." />
        </div>

        <div class="form-group">
          <label>Shelf life (giorni) *</label>
          <input class="cons-shelf input" type="number" min="0" value="${escapeAttr(shelf)}" />
        </div>

        <div class="form-group">
          <label>Attivo</label>
          <select class="cons-attivo input">
            <option value="true">sì</option>
            <option value="false">no</option>
          </select>
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label>Note (opz.)</label>
          <input class="cons-note input" value="${escapeAttr(initial.note || "")}" />
        </div>
      </div>

      <div style="margin-top:14px; font-weight:700;">Passaggi (post-cottura)</div>
      <div class="cons-passaggi" style="margin-top:8px;"></div>

      <div class="form-actions" style="margin-top:10px;">
        <button class="app-button secondary" type="button" data-action="add-passaggio">
          + Aggiungi passaggio
        </button>
      </div>
    </div>
  `;

  card.querySelector(".cons-attivo").value = attivoVal;

  // toggle collapse
  const body = card.querySelector(".cons-body");
  const btnToggle = card.querySelector('[data-action="toggle"]');
  if (btnToggle && body) {
    btnToggle.addEventListener("click", () => {
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "" : "none";
      btnToggle.textContent = isHidden ? "▾" : "▸";
    });
  }

  // delete
  card.querySelector('[data-action="delete"]').addEventListener("click", () => card.remove());

  // passaggi container
  const passContainer = card.querySelector(".cons-passaggi");

  // render existing passaggi
  if (Array.isArray(passaggi) && passaggi.length) {
    // group by posizione then by gruppo_alternativa
    const sorted = [...passaggi].sort((a,b) => {
      const pa = a.posizione ?? 0, pb = b.posizione ?? 0;
      if (pa !== pb) return pa - pb;
      const ga = a.gruppo_alternativa ?? 0, gb = b.gruppo_alternativa ?? 0;
      if (ga !== gb) return ga - gb;
      return String(a.titolo||"").localeCompare(String(b.titolo||""));
    });
    sorted.forEach(p => aggiungiConservazionePassaggio(passContainer, p));
  }

  // add passaggio
  card.querySelector('[data-action="add-passaggio"]').addEventListener("click", () => {
    const nextPos = nextPosizionePassaggio(passContainer);
    aggiungiConservazionePassaggio(passContainer, { posizione: nextPos, gruppo_alternativa: null });
  });

  container.appendChild(card);
}

function nextPosizionePassaggio(passContainer) {
  let max = 0;
  passContainer.querySelectorAll(".cons-passaggio").forEach(r => {
    const pos = parseInt(r.dataset.posizione || "0", 10);
    if (pos > max) max = pos;
  });
  return max + 1;
}

function aggiungiConservazionePassaggio(passContainer, initial = {}) {
  const row = document.createElement("div");
  row.className = "cons-passaggio";
  row.style.border = "1px solid rgba(0,0,0,0.08)";
  row.style.borderRadius = "10px";
  row.style.padding = "12px";
  row.style.marginBottom = "10px";
  row.style.background = "rgba(255,255,255,0.6)";

  const posizione = initial.posizione ?? 1;
  const gruppo = initial.gruppo_alternativa ?? null;

  row.dataset.posizione = String(posizione);
  row.dataset.gruppo = (gruppo == null) ? "" : String(gruppo);

  const headerLabel = (gruppo == null)
    ? `Passaggio ${posizione}`
    : `Passaggio ${posizione} – Alternativa ${String.fromCharCode(65 + ((parseInt(gruppo,10) || 1) - 1))}`;

  row.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700;">${escapeHtml(headerLabel)}</div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="app-button tiny" type="button" data-action="up">↑</button>
        <button class="app-button tiny" type="button" data-action="down">↓</button>
        <button class="app-button tiny" type="button" data-action="alt">+ Alternativa</button>
        <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
      </div>
    </div>

    <div class="form-grid" style="margin-top:10px;">
      
      <div class="form-group">
        <label>Tipo</label>
        <select class="cp-tipo input">
          <option value="abbattimento">abbattimento</option>
          <option value="confezionamento">confezionamento</option>
          <option value="pastorizzazione">pastorizzazione</option>
          <option value="stoccaggio">stoccaggio</option>
          <option value="altro">altro</option>
        </select>
      </div>

      <div class="form-group">
        <label>Attrezzatura</label>
        <input class="cp-attrezz input" value="${escapeAttr(initial.attrezzatura || "")}" placeholder="Es: teglia inox / roner / abbattitore..." />
      </div>

      <div class="form-group">
        <label>Temp (°C)</label>
        <input class="cp-temp input" type="number" step="0.1" value="${escapeAttr(initial.temperatura_c ?? "")}" />
      </div>

      <div class="form-group">
        <label>Durata (min)</label>
        <input class="cp-durata input" type="number" min="0" value="${escapeAttr(initial.durata_min ?? "")}" />
      </div>

      <div class="form-group" style="grid-column:1/-1;">
        <label>Descrizione operativa (popup operatore)</label>
        <textarea class="cp-desc input" rows="2">${escapeHtml(initial.descrizione_operativa || "")}</textarea>
      </div>
    </div>
  `;

  row.querySelector(".cp-tipo").value = initial.tipo_passaggio || "altro";

  // actions
  row.querySelector('[data-action="delete"]').addEventListener("click", () => row.remove());

  row.querySelector('[data-action="up"]').addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev) passContainer.insertBefore(row, prev);
    rinumeraPassaggi(passContainer);
  });

  row.querySelector('[data-action="down"]').addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next) passContainer.insertBefore(next, row);
    rinumeraPassaggi(passContainer);
  });

  row.querySelector('[data-action="alt"]').addEventListener("click", () => {
    // crea alternativa nello stesso slot (stessa posizione) con gruppo incrementale
    const pos = parseInt(row.dataset.posizione || "1", 10);
    const existingGroups = [...passContainer.querySelectorAll(`.cons-passaggio[data-posizione="${pos}"]`)]
      .map(el => parseInt(el.dataset.gruppo || "0", 10))
      .filter(n => n > 0);
    const nextGroup = (existingGroups.length ? Math.max(...existingGroups) : 0) + 1;
    const altRow = {
      posizione: pos,
      gruppo_alternativa: nextGroup,
      tipo_passaggio: row.querySelector(".cp-tipo").value,
      titolo: "",
      attrezzatura: "",
      temperatura_c: null,
      durata_min: null,
      descrizione_operativa: ""
    };
    // inserisci subito dopo
    const newEl = aggiungiConservazionePassaggio(passContainer, altRow);
    passContainer.insertBefore(newEl, row.nextElementSibling);
    rinumeraPassaggi(passContainer);
  });

  passContainer.appendChild(row);
  rinumeraPassaggi(passContainer);
  return row;
}

function rinumeraPassaggi(passContainer) {
  // Rinumera in base all'ordine visuale, mantenendo le alternative sullo stesso numero se hanno stessa data-posizione.
  // Se l'utente sposta un passaggio, aggiorniamo le posizioni in sequenza.
  let pos = 1;
  const rows = [...passContainer.querySelectorAll(".cons-passaggio")];

  // raggruppa per blocchi: ogni row che non è alternativa (gruppo vuoto) inizia un nuovo pos,
  // ma se un row ha gruppo >0 e la precedente ha stesso dataset.posizione, la lasciamo nello stesso pos.
  // Regola semplice: se una riga ha gruppo vuoto -> nuova posizione incrementale.
  // Se ha gruppo >0 -> usa la posizione della riga precedente con gruppo vuoto più vicina sopra.
  let currentPos = 0;
  rows.forEach(r => {
    const grp = parseInt(r.dataset.gruppo || "0", 10);
    if (!grp) {
      currentPos = pos++;
      r.dataset.posizione = String(currentPos);
    } else {
      r.dataset.posizione = String(currentPos || 1);
    }
    const header = r.querySelector("div > div");
    if (header) {
      const g = grp ? ` – Alternativa ${String.fromCharCode(65 + (grp - 1))}` : "";
      header.textContent = `Passaggio ${r.dataset.posizione}${g}`;
    }
  });
}


/* ============================================================
   PORZIONATURE
============================================================ */
function aggiungiPorzione(initial = {}) {
  const container = document.getElementById("porzioni-container");

  const card = document.createElement("div");
  card.className = "azienda-card";
  card.style.marginBottom = "12px";
  card.style.padding = "14px";

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="font-weight:700; font-size:16px;">Porzione</div>
      <button class="delete-icon-btn" type="button" data-action="delete" title="Elimina">
  🗑
</button>
    </div>

    <div class="form-grid" style="margin-top:10px;">
      <div class="form-group" style="grid-column:1/-1;">
        <label>Label porzione *</label>
        <input class="porz-label input" value="${escapeAttr(initial.label || "")}" placeholder="Es: Trattoria 200g / Ricevimento 120g / Vasetto 280g" />
      </div>

      <div class="form-group">
        <label>Peso porzione *</label>
        <input class="porz-peso input" type="number" min="0" step="0.001" value="${escapeAttr(initial.peso_porzione ?? "")}" />
      </div>

      <div class="form-group">
        <label>Unità misura *</label>
        <select class="porz-um input">
          <option value="g">g</option>
          <option value="kg">kg</option>
          <option value="pz">pz</option>
          <option value="ml">ml</option>
          <option value="l">l</option>
        </select>
      </div>

      <div class="form-group" style="grid-column:1/-1;">
        <label>Note (opz.)</label>
        <input class="porz-note input" value="${escapeAttr(initial.note || "")}" />
      </div>

      <div class="form-group">
        <label>Attivo</label>
        <select class="porz-attivo input">
          <option value="true">sì</option>
          <option value="false">no</option>
        </select>
      </div>
    </div>
  `;

  card.querySelector(".porz-um").value = initial.unita_misura || "g";
  card.querySelector(".porz-attivo").value = String(initial.attivo ?? true);
  card.querySelector('[data-action="delete"]').addEventListener("click", () => card.remove());

  container.appendChild(card);
}


/* ============================================================
   CARICA RICETTA COMPLETA
============================================================ */
async function caricaRicettaCompleta() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const { data: ricetta, error: errRic } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", ricettaId)
    .eq("azienda_id", aziendaId)
    .single();

  if (errRic || !ricetta) {
    console.error(errRic);
    alert("Ricetta non trovata o non accessibile.");
    window.location.hash = "#/ricettario";
    return;
  }

  setVal("r-nome", ricetta.nome || "");
  setVal("r-pezzi-base", ricetta.pezzi_base ?? "");
  setVal("r-descrizione", ricetta.descrizione || "");
  setVal("r-note-proc", ricetta.note_procedimento || "");
  setVal("r-foto-url", ricetta.foto_url || "");
  if (ricetta.foto_url) {
    const fotoWrap = document.getElementById("r-foto-preview-wrap");
    const fotoImg = document.getElementById("r-foto-preview");
    if (fotoImg) fotoImg.src = ricetta.foto_url;
    if (fotoWrap) fotoWrap.style.display = "";
  }
  setVal("r-tipo", ricetta.tipo_ricetta || "base");
  setVal("r-categoria-id", ricetta.categoria_portata_id ? String(ricetta.categoria_portata_id) : "");
  if (ricetta.categoria_portata_id) {
    const cat = categoriePortataMap.get(String(ricetta.categoria_portata_id));
    if (cat) setVal("r-categoria-search", cat.nome || "");
  }
  const wrapCat = document.getElementById("categoria-wrapper");
  if (wrapCat) wrapCat.style.display = ((ricetta.tipo_ricetta || "base") === "finita") ? "" : "none";

  if (ricetta.prodotto_output_id) {
    const p = prodottiMap.get(String(ricetta.prodotto_output_id));
    if (p) {
      setVal("r-output-search", p.descrizione || "");
      setVal("r-output-id", p.id);
    } else {
      setVal("r-output-id", ricetta.prodotto_output_id);
    }
  }
  aggiornaOutputInfo();

  // ingredienti
  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId);

  ingredientiCache = ingredienti || [];
  document.getElementById("ingredienti-container").innerHTML = "";
  if (ingredientiCache.length) ingredientiCache.forEach(i => aggiungiIngrediente(i));
  else aggiungiIngrediente();

  // fasi
  const { data: fasi } = await supabase
    .from("ricette_preparazione_fasi")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("ordine", { ascending: true });

  fasiCache = fasi || [];
  document.getElementById("fasi-container").innerHTML = "";
  if (fasiCache.length) fasiCache.forEach(f => aggiungiFase(f));
  else aggiungiFase({ ordine: 1, tipo_fase: "preparazione", durata_min: 0, lavoro_umano_min: 0 });

  // conservazione
  const { data: cons } = await supabase
    .from("ricette_conservazione")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  conservazioniCache = cons || [];
  // passaggi conservazione (nuovo modello a fasi)
  conservazionePassaggiMap = new Map();
  const { data: consPass } = await supabase
    .from("ricette_conservazione_passaggi")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("ricette_conservazione_id", { ascending: true })
    .order("posizione", { ascending: true })
    .order("gruppo_alternativa", { ascending: true });

  (consPass || []).forEach(p => {
    const sid = String(p.ricette_conservazione_id);
    if (!conservazionePassaggiMap.has(sid)) conservazionePassaggiMap.set(sid, []);
    conservazionePassaggiMap.get(sid).push(p);
  });

  const consContainer = document.getElementById("conservazione-container");
  if (consContainer) consContainer.innerHTML = "";
  if (conservazioniCache.length) {
    conservazioniCache.forEach(c => {
      const passaggi = conservazionePassaggiMap.get(String(c.id)) || [];
      aggiungiScenarioConservazione(c, passaggi);
    });
  }
  else aggiungiScenarioConservazione();

  // output (1 record)
  const { data: output } = await supabase
    .from("ricette_output")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  outputCache = output || null;
  if (outputCache) {
    setVal("r-output-peso", outputCache.peso_finale ?? "");
    setVal("r-output-um", outputCache.unita_misura || "kg");
    setVal("r-output-note", outputCache.note || "");
  } else {
    setVal("r-output-peso", ricetta.peso_output_kg ?? "");
    setVal("r-output-um", "kg");
    setVal("r-output-note", "");
  }

  // output secondari
  const { data: out2 } = await supabase
    .from("ricette_output_secondari")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  outputSecondariCache = out2 || [];
  const out2Container = document.getElementById("output-secondari-container");
  if (out2Container) out2Container.innerHTML = "";
  if (outputSecondariCache.length) {
    outputSecondariCache.forEach(o => aggiungiOutputSecondario(o));
  }

  // porzioni
  const { data: porzioni } = await supabase
    .from("ricette_porzione")
    .select("*")
    .eq("ricetta_id", Number(ricettaId))
    .eq("azienda_id", aziendaId)
    .order("id", { ascending: true });

  porzioniCache = porzioni || [];
  document.getElementById("porzioni-container").innerHTML = "";
  if (porzioniCache.length) porzioniCache.forEach(p => aggiungiPorzione(p));
  else aggiungiPorzione();

  const prev = document.getElementById("r-cost-preview");
  if (prev) {
    const cm = ricetta.costo_materia_prima ?? 0;
    prev.innerText = `Food cost (MP): € ${formatMoney(cm)} (snapshot)`;
  }
}

/* ============================================================
   SALVA TUTTO
============================================================ */
async function salvaTutto() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  if (!ricettaId) {
    if (!requirePermessi({ resource: "ricette", action: "create" })) {
      alert("Non hai i permessi per creare ricette.");
      return;
    }
  } else {
    if (!requirePermessi({ resource: "ricette", action: "update" })) {
      alert("Non hai i permessi per modificare ricette.");
      return;
    }
  }

  const nome = getVal("r-nome").trim();
  const pezzi_base = toIntOrNull(getVal("r-pezzi-base"));
  const descrizione = getVal("r-descrizione").trim() || null;
  const note_procedimento = getVal("r-note-proc").trim() || null;
  const foto_url = getVal("r-foto-url").trim() || null;
  const tipo_ricetta = getVal("r-tipo") || "base";
  const categoria_portata_id_raw = getVal("r-categoria-id");
  const categoria_portata_id = categoria_portata_id_raw
    ? Number(categoria_portata_id_raw)
    : null;


  const prodotto_output_id = getVal("r-output-id");
  const output_peso = toNumOrNull(getVal("r-output-peso"));
  const output_um = getVal("r-output-um");
  const output_note = getVal("r-output-note").trim() || null;

  if (!nome) return alert("Nome ricetta obbligatorio.");

  if (tipo_ricetta === "finita" && !categoria_portata_id) {
    return alert("Se la ricetta è FINITA devi selezionare la categoria (antipasti, primi, ...).");
  }
  if (tipo_ricetta === "base" && categoria_portata_id) {
    return alert("Una ricetta BASE non può avere categoria portata.");
  }
  if (!prodotto_output_id) return alert("Seleziona il prodotto output.");
  if (!output_peso || output_peso <= 0) return alert("Inserisci il peso finale (resa) dell'output.");
  if (!output_um) return alert("Seleziona unità misura output.");

  const esito = document.getElementById("r-esito");
  if (esito) esito.innerText = "Salvataggio in corso...";

  let savedId = ricettaId;

  if (!ricettaId) {
    const payload = {
      nome,
      descrizione,
      note_procedimento,
      foto_url,
      pezzi_base,
      prodotto_output_id: Number(prodotto_output_id),
      azienda_id: aziendaId,
      attivo: true,
      stato_strutturale: "bozza",
      tipo_ricetta,
      categoria_portata_id
    };

    const { data, error } = await supabase
      .from("ricette")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore salvataggio ricetta.");
    }

    savedId = String(data.id);
    ricettaId = savedId;
  } else {
    const payload = {
      nome,
      descrizione,
      note_procedimento,
      foto_url,
      pezzi_base,
      prodotto_output_id: Number(prodotto_output_id),
      aggiornato_il: new Date().toISOString(),
      tipo_ricetta,
      categoria_portata_id
    };

    const { error } = await supabase
      .from("ricette")
      .update(payload)
      .eq("id", Number(ricettaId))
      .eq("azienda_id", aziendaId);

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore aggiornamento ricetta.");
    }
  }

  const ricettaIdNum = Number(savedId);

  // output principale
  {
    const payloadOut = {
      ricetta_id: ricettaIdNum,
      peso_finale: output_peso,
      unita_misura: output_um,
      note: output_note,
      azienda_id: aziendaId
    };

    const { error } = await supabase
      .from("ricette_output")
      .upsert(payloadOut, { onConflict: "ricetta_id" });

    if (error) {
      console.error(error);
      if (esito) esito.innerText = "";
      return alert("Errore salvataggio output ricetta.");
    }
  }

  // output secondari
  {
    const { error: delOut2Err } = await supabase
      .from("ricette_output_secondari")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delOut2Err) {
      console.error(delOut2Err);
      if (esito) esito.innerText = "";
      return alert("Errore reset coprodotti.");
    }

    const out2Rows = [];
    document.querySelectorAll("#output-secondari-container .azienda-card").forEach(r => {
      const pid = (r.querySelector(".out2-id")?.value || "").trim();
      const peso = toNumOrNull(r.querySelector(".out2-peso")?.value);
      const um = (r.querySelector(".out2-um")?.value || "").trim();
      const metodo = (r.querySelector(".out2-metodo")?.value || "peso").trim();
      const perc = toNumOrNull(r.querySelector(".out2-percent")?.value);

      if (pid && peso && peso > 0 && um) {
        out2Rows.push({
          ricetta_id: ricettaIdNum,
          prodotto_id: Number(pid),
          peso,
          unita_misura: um,
          metodo_allocazione: metodo,
          percentuale_allocazione: (metodo === "percentuale" && perc != null)
            ? (Number(perc) / 100)
            : null,
          azienda_id: aziendaId
        });
      }
    });

    if (out2Rows.length) {
      const { error: insOut2Err } = await supabase
        .from("ricette_output_secondari")
        .insert(out2Rows);

      if (insOut2Err) {
        console.error(insOut2Err);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio coprodotti.");
      }
    }
  }

  // ingredienti
  let ingredientRowsForCost = [];
  {
    const { error: delErr } = await supabase
      .from("ricetta_ingredienti")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delErr) {
      console.error(delErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset ingredienti.");
    }

    const rows = [];
    document.querySelectorAll("#ingredienti-container .azienda-card").forEach(r => {
      const pid = (r.querySelector(".ing-id")?.value || "").trim();
      const nomeProd = (r.querySelector(".ing-search")?.value || "").trim();
      const qta = toNumOrNull(r.querySelector(".ing-qta")?.value);

      if (pid && qta && qta > 0) {
        const p = prodottiMap.get(String(pid));
        const um = (r.querySelector(".ing-um")?.value || p?.um || "pz");

        rows.push({
          ricetta_id: ricettaIdNum,
          prodotto_id: Number(pid),
          nome_prodotto: nomeProd || (p?.descrizione || ""),
          quantita: qta,
          unita_misura: um,
          azienda_id: aziendaId,
          mapping_stato: "ok"
        });

        ingredientRowsForCost.push({
          prodotto_id: Number(pid),
          quantita: qta
        });
      }
    });

    if (rows.length) {
      const { error: insErr } = await supabase
        .from("ricetta_ingredienti")
        .insert(rows);

      if (insErr) {
        console.error(insErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio ingredienti.");
      }
    }
  }

  // fasi (procedimento)
  {
    const { error: delFasiErr } = await supabase
      .from("ricette_preparazione_fasi")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delFasiErr) {
      console.error(delFasiErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset fasi.");
    }

    const rows = [];
    document.querySelectorAll("#fasi-container .azienda-card").forEach((r, idx) => {
      const ordine = idx + 1;
      const tipo_fase = (r.querySelector(".fase-tipo")?.value || "preparazione").trim();
      const nome_fase = (r.querySelector(".fase-tipo")?.value || "preparazione").trim();
      const descrizione_operativa = (r.querySelector(".fase-descrizione")?.value || "").trim() || null;
      const durata_min = toIntOrNull(r.querySelector(".fase-durata")?.value) ?? 0;
      const lavoro_umano_min = toIntOrNull(r.querySelector(".fase-lavoro")?.value) ?? 0;
      const tecnologia = (r.querySelector(".fase-tecnologia")?.value || "").trim() || null;
      const temperatura = toNumOrNull(r.querySelector(".fase-temperatura")?.value);
      const note = (r.querySelector(".fase-note")?.value || "").trim() || null;

      

      rows.push({
        ricetta_id: ricettaIdNum,
        ordine,
        nome_fase,
        tipo_fase,
        durata_min,
        lavoro_umano_min,
        tecnologia,
        temperatura,
        note,
        descrizione_operativa,
        richiede_conferma: false,
        fase_template_id: null,
        parametri: {},
        azienda_id: aziendaId
      });
    });

    if (rows.length) {
      const { error: insFasiErr } = await supabase
        .from("ricette_preparazione_fasi")
        .insert(rows);

      if (insFasiErr) {
        console.error(insFasiErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio fasi.");
      }
    }
  }


  // conservazione (scenari + passaggi)
  {
    // reset passaggi prima (dipendono dagli scenari)
    const { error: delPassErr } = await supabase
      .from("ricette_conservazione_passaggi")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delPassErr) {
      console.error(delPassErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset passaggi conservazione.");
    }

    const { error: delConsErr } = await supabase
      .from("ricette_conservazione")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delConsErr) {
      console.error(delConsErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset conservazione.");
    }

    const scenarioDom = [...document.querySelectorAll("#conservazione-container .azienda-card")];

    const scenarioRows = [];
    scenarioDom.forEach(card => {
      const scenario_label = (card.querySelector(".cons-label")?.value || "").trim();
      const shelf_life_giorni = toIntOrNull(card.querySelector(".cons-shelf")?.value);
      const note = (card.querySelector(".cons-note")?.value || "").trim() || null;
      const attivo = (card.querySelector(".cons-attivo")?.value !== "false");

      if (!scenario_label) return;

      scenarioRows.push({
        ricetta_id: ricettaIdNum,
        scenario_label,
        shelf_life_giorni,
        note,
        attivo,
        azienda_id: aziendaId
      });
    });

    let insertedScenari = [];
    if (scenarioRows.length) {
      const { data: insData, error: insConsErr } = await supabase
        .from("ricette_conservazione")
        .insert(scenarioRows)
        .select("id, scenario_label");

      if (insConsErr) {
        console.error(insConsErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio conservazione.");
      }
      insertedScenari = insData || [];
    }

    // passaggi
    const passRows = [];
    // associamo per indice: i card DOM sono nello stesso ordine dei row inseriti (scenarioRows)
    let insIdx = 0;
    scenarioDom.forEach(card => {
      const scenario_label = (card.querySelector(".cons-label")?.value || "").trim();
      if (!scenario_label) return;

      const scenarioRecord = insertedScenari[insIdx++];
      if (!scenarioRecord?.id) return;

      const passContainer = card.querySelector(".cons-passaggi");
      if (!passContainer) return;

      // calcola gruppi alternativa per posizione: se esistono più righe con stessa posizione, assegna gruppo_alternativa 1..N
      const rows = [...passContainer.querySelectorAll(".cons-passaggio")];

      // mappa pos -> count alt encountered
      const posCounts = new Map();

      rows.forEach(r => {
        const posizione = toIntOrNull(r.dataset.posizione) || 1;

        // gruppo: se la riga ha dataset.gruppo (numero) usalo, altrimenti null (passaggio principale)
        let gruppo_alternativa = toIntOrNull(r.dataset.gruppo);
        if (!gruppo_alternativa) gruppo_alternativa = null;

        // Se esistono più righe con stesso pos e gruppo null, la seconda diventerebbe alt: preveniamo
        if (gruppo_alternativa == null) {
          const c = (posCounts.get(posizione) || 0) + 1;
          posCounts.set(posizione, c);
          if (c > 1) gruppo_alternativa = c - 1; // fallback
        }

        const titolo = (r.querySelector(".cp-tipo")?.value || "altro").trim();
        const tipo_passaggio = (r.querySelector(".cp-tipo")?.value || "altro").trim();
        const attrezzatura = (r.querySelector(".cp-attrezz")?.value || "").trim() || null;
        const temperatura_c = toNumOrNull(r.querySelector(".cp-temp")?.value);
        const durata_min = toIntOrNull(r.querySelector(".cp-durata")?.value);
        const descrizione_operativa = (r.querySelector(".cp-desc")?.value || "").trim() || null;

        

        passRows.push({
          azienda_id: aziendaId,
          ricette_conservazione_id: Number(scenarioRecord.id),
          ricetta_id: ricettaIdNum,
          posizione,
          gruppo_alternativa,
          titolo,
          tipo_passaggio,
          attrezzatura,
          temperatura_c,
          durata_min,
          descrizione_operativa,
          note: null,
          parametri: {}
        });
      });
    });

    if (passRows.length) {
      const { error: insPassErr } = await supabase
        .from("ricette_conservazione_passaggi")
        .insert(passRows);

      if (insPassErr) {
        console.error(insPassErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio passaggi conservazione.");
      }
    }
  }

  // porzionature
  {
    const { error: delPorzErr } = await supabase
      .from("ricette_porzione")
      .delete()
      .eq("ricetta_id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (delPorzErr) {
      console.error(delPorzErr);
      if (esito) esito.innerText = "";
      return alert("Errore reset porzionature.");
    }

    const rows = [];
    document.querySelectorAll("#porzioni-container .azienda-card").forEach(r => {
      const label = (r.querySelector(".porz-label")?.value || "").trim();
      const peso_porzione = toNumOrNull(r.querySelector(".porz-peso")?.value);
      const unita_misura = (r.querySelector(".porz-um")?.value || "g").trim();
      const note = (r.querySelector(".porz-note")?.value || "").trim() || null;
      const attivo = (r.querySelector(".porz-attivo")?.value !== "false");

      if (!label) return;
      if (!peso_porzione || peso_porzione <= 0) return;

      rows.push({
        ricetta_id: ricettaIdNum,
        label,
        peso_porzione,
        unita_misura,
        note,
        attivo,
        azienda_id: aziendaId
      });
    });

    if (rows.length) {
      const { error: insPorzErr } = await supabase
        .from("ricette_porzione")
        .insert(rows);

      if (insPorzErr) {
        console.error(insPorzErr);
        if (esito) esito.innerText = "";
        return alert("Errore salvataggio porzionature.");
      }
    }
  }


  // calcolo costo + snapshot ricetta
  const computed = computeCostoIndustriale({
    outputPrincipale: { peso: output_peso, um: output_um },
    ingredienti: ingredientRowsForCost,
    outputSecondariDom: readOutputSecondariFromDOM()
  });

  {
    const payloadSnap = {
      costo_materia_prima: computed.costoTotaleInput,
      costo_tot_snapshot: computed.costoTotaleInput,
      ultimo_ricalcolo: new Date().toISOString(),
      stato_costo: computed.ok ? "ok" : "warning"
    };

    const { error: upErr } = await supabase
      .from("ricette")
      .update(payloadSnap)
      .eq("id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (upErr) console.error(upErr);
  }

  const prev = document.getElementById("r-cost-preview");
  if (prev) {
    if (computed.ok) {
      prev.innerText = `Food cost (MP): € ${formatMoney(computed.costoTotaleInput)} — Costo unitario output: € ${formatMoney(computed.costoUnitarioPrincipale)} / ${computed.baseUnitLabel}`;
    } else {
      prev.innerText = `Food cost (MP): € ${formatMoney(computed.costoTotaleInput)} — ${computed.warning || "Verifica unità output/ingredienti"}`;
    }
  }

  {
    const hasIngredienteValido = Array.isArray(ingredientRowsForCost) && ingredientRowsForCost.length > 0;

    let hasFaseValida = false;
    document.querySelectorAll("#fasi-container .azienda-card").forEach(r => {
      const nomeFase = (r.querySelector(".fase-nome")?.value || "").trim();
      if (nomeFase) hasFaseValida = true;
    });

    const hasOutputProdotto = !!prodotto_output_id;
    const hasOutputPeso = !!output_peso && output_peso > 0;
    const hasOutputUm = !!output_um;

    const scheda_completa =
      hasIngredienteValido &&
      hasFaseValida &&
      hasOutputProdotto &&
      hasOutputPeso &&
      hasOutputUm;

    const stato_strutturale = scheda_completa ? "strutturata" : "bozza";

    const { error: strutturaErr } = await supabase
      .from("ricette")
      .update({
        scheda_completa,
        stato_strutturale,
        aggiornato_il: new Date().toISOString()
      })
      .eq("id", ricettaIdNum)
      .eq("azienda_id", aziendaId);

    if (strutturaErr) console.error(strutturaErr);
  }

  if (esito) esito.innerText = "Ricetta salvata";
  alert("Ricetta salvata");
  window.location.hash = "#/ricettario";
}

/* ============================================================
   COSTO INDUSTRIALE
============================================================ */
function computeCostoIndustriale({ outputPrincipale, ingredienti, outputSecondariDom }) {
  let costoTotale = 0;
  for (const r of (ingredienti || [])) {
    const p = prodottiMap.get(String(r.prodotto_id));
    const costoMedio = Number(p?.costo_medio ?? 0);
    const qta = Number(r.quantita ?? 0);
    costoTotale += (costoMedio * qta);
  }

  const p1 = convertToBase(outputPrincipale.peso, outputPrincipale.um);
  if (!p1.ok) {
    return {
      ok: false,
      costoTotaleInput: round4(costoTotale),
      costoUnitarioPrincipale: 0,
      baseUnitLabel: "unità",
      warning: p1.warning
    };
  }

  let outputs = [{ kind: "principale", baseQty: p1.baseQty, unitLabel: p1.baseUnitLabel, metodo: "peso" }];

  for (const o of (outputSecondariDom || [])) {
    const conv = convertToBase(o.peso, o.unita_misura);
    if (!conv.ok || conv.baseUnitLabel !== p1.baseUnitLabel) {
      return {
        ok: false,
        costoTotaleInput: round4(costoTotale),
        costoUnitarioPrincipale: 0,
        baseUnitLabel: p1.baseUnitLabel,
        warning: "Unità coprodotti non coerenti con output (kg/g oppure l/ml oppure pz)."
      };
    }
    outputs.push({
      kind: "secondario",
      baseQty: conv.baseQty,
      metodo: o.metodo_allocazione,
      percentuale_allocazione: o.percentuale_allocazione
    });
  }

  const percentSecondari = outputs
    .filter(x => x.kind === "secondario" && x.metodo === "percentuale" && Number.isFinite(x.percentuale_allocazione))
    .reduce((a, x) => a + Number(x.percentuale_allocazione), 0);

  let costoPrincipale = costoTotale;

  if (percentSecondari > 0) {
    const perc = Math.max(0, Math.min(1, percentSecondari));
    costoPrincipale = costoTotale * (1 - perc);
  } else {
    const totBase = outputs.reduce((a, x) => a + (Number(x.baseQty) || 0), 0);
    if (totBase > 0) costoPrincipale = costoTotale * (p1.baseQty / totBase);
  }

  const costoUnitarioPrincipale = (p1.baseQty > 0) ? (costoPrincipale / p1.baseQty) : 0;

  return {
    ok: true,
    costoTotaleInput: round4(costoTotale),
    costoPrincipale: round4(costoPrincipale),
    costoUnitarioPrincipale: round4(costoUnitarioPrincipale),
    baseUnitLabel: p1.baseUnitLabel,
    warning: null
  };
}

function readOutputSecondariFromDOM() {
  const out = [];
  document.querySelectorAll("#output-secondari-container .azienda-card").forEach(r => {
    const pid = (r.querySelector(".out2-id")?.value || "").trim();
    const peso = toNumOrNull(r.querySelector(".out2-peso")?.value);
    const um = (r.querySelector(".out2-um")?.value || "").trim();
    const metodo = (r.querySelector(".out2-metodo")?.value || "peso").trim();
    const perc = toNumOrNull(r.querySelector(".out2-percent")?.value);

    if (pid && peso && peso > 0 && um) {
      out.push({
        prodotto_id: Number(pid),
        peso,
        unita_misura: um,
        metodo_allocazione: metodo,
        percentuale_allocazione: (metodo === "percentuale" && perc != null)
          ? (Number(perc) / 100)
          : null
      });
    }
  });
  return out;
}

function convertToBase(qty, um) {
  const u = String(um || "").toLowerCase().trim();
  const n = Number(qty ?? 0);

  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, warning: "Peso/Qtà output non valido." };
  }

  if (u === "kg") return { ok: true, baseQty: n * 1000, baseUnitLabel: "g" };
  if (u === "g") return { ok: true, baseQty: n, baseUnitLabel: "g" };

  if (u === "l") return { ok: true, baseQty: n * 1000, baseUnitLabel: "ml" };
  if (u === "ml") return { ok: true, baseQty: n, baseUnitLabel: "ml" };

  if (u === "pz") return { ok: true, baseQty: n, baseUnitLabel: "pz" };

  return { ok: false, warning: "Unità output non supportata (usa kg/g oppure l/ml oppure pz)." };
}

/* ============================================================
   BIND UI
============================================================ */
function bindUI() {
  safeOn("btn-add-ing", "click", () => aggiungiIngrediente());
  safeOn("btn-add-out2", "click", () => aggiungiOutputSecondario());
  safeOn("btn-add-fase", "click", () =>
  aggiungiFase({
    tipo_fase: "preparazione",
    durata_min: 0,
    lavoro_umano_min: 0
  })
);
  safeOn("btn-add-conservazione", "click", () => aggiungiScenarioConservazione());
  safeOn("btn-add-porzione", "click", () => aggiungiPorzione());
  safeOn("btn-salva", "click", () => salvaTutto());

  // Tipo ricetta -> mostra/nasconde categoria
  safeOn("r-tipo", "change", () => {
    const tipo = getVal("r-tipo") || "base";
    const wrap = document.getElementById("categoria-wrapper");
    if (wrap) wrap.style.display = (tipo === "finita") ? "" : "none";
    if (tipo !== "finita") {
      setVal("r-categoria-search", "");
      setVal("r-categoria-id", "");
    }
  });

  // init visibilità
  const wrapInit = document.getElementById("categoria-wrapper");
  const tipoInit = getVal("r-tipo") || "base";
  if (wrapInit) wrapInit.style.display = (tipoInit === "finita") ? "" : "none";

  // Autocomplete output (già inizializzato in loadProdotti) ma reinforziamo in caso di render tardivo
  const outSearch = document.getElementById("r-output-search");
  const outHidden = document.getElementById("r-output-id");
  const outSuggest = document.getElementById("r-output-suggest");
    if (outSearch && outHidden && outSuggest) {
    if (!outSearch.dataset.acBound) {
      outSearch.dataset.acBound = "1";
      setupAutocomplete(outSearch, outHidden, outSuggest, () => aggiornaOutputInfo());
    }
  }

  const fotoInput = document.getElementById("r-foto-file");
  if (fotoInput && !fotoInput.dataset.uploadBound) {
    fotoInput.dataset.uploadBound = "1";
    fotoInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const url = await uploadFotoRicetta(file);
      if (!url) return;

      setVal("r-foto-url", url);

      const wrap = document.getElementById("r-foto-preview-wrap");
      const img = document.getElementById("r-foto-preview");

      if (img) img.src = url;
      if (wrap) wrap.style.display = "";
    });
  }

  safeOn("btn-help", "click", () => {
    const box = document.getElementById("help-box");
    if (box) {
      box.style.display = box.style.display === "none" ? "block" : "none";
    }
  });

}


function nextOrdineFase() {
  return (document.querySelectorAll("#fasi-container .azienda-card").length || 0) + 1;
}


/* ============================================================
   HELPERS
============================================================ */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? (el.value ?? "") : "";
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v ?? "";
}

function toIntOrNull(v) {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function toNumOrNull(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function safeOn(id, evt, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(evt, fn);
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}

function round4(n) {
  const x = Number(n ?? 0);
  return Math.round(x * 10000) / 10000;
}

function formatMoney(n) {
  const x = Number(n ?? 0);
  return x.toFixed(2);
}
