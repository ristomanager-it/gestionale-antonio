// ============================================================
// VIEW PRODUZIONE (CENTRO PRODUZIONE) - Card grandi operative
// - Cerca Ricetta (consulta)
// - Crea Ricetta (vai a editor)
// - Produci Ricetta (scheda produzione operativa)
// Nota: permessi per ruolo verranno agganciati in futuro da Dipendenti.
// ============================================================

let ricetteCache = [];
let ricetteById = new Map();

let ricettaSelezionata = null;

export async function render(app) {
  app.innerHTML = `
    <section class="view">
      <div class="page-topbar">
        <div class="page-topbar-left">
          <button class="app-button small gray" data-route="home">← Dashboard</button>
          <h2 class="page-title">🏭 Centro Produzione</h2>
        </div>
      </div>

      <div class="dashboard-grid" style="margin-top:10px;">
        <div class="azienda-card" style="background:#ffffff;">
          <h3 style="margin:0 0 6px; color:#111827;">➕ Crea Ricetta</h3>
          <p class="small-muted">Inserisci la scheda tecnica completa (ingredienti, fasi, shelf life, porzioni, output).</p>
          <button id="btn-prod-crea-ricetta" class="app-button green">Apri Editor Ricetta</button>
        </div>

        <div class="azienda-card" style="background:#ffffff;">
          <h3 style="margin:0 0 6px; color:#111827;">🔍 Cerca Ricetta</h3>
          <p class="small-muted">Consulta una ricetta (scheda tecnica) senza produrre.</p>
          <button id="btn-prod-cerca-ricetta" class="app-button gray">Vai al Ricettario</button>
        </div>

        <div class="azienda-card" style="background:#ffffff;">
          <h3 style="margin:0 0 6px; color:#111827;">▶ Produci Ricetta</h3>
          <p class="small-muted">Registra una lavorazione: quantità, lotto, conservazione applicata, destinazione.</p>
          <button id="btn-prod-apri-panel" class="app-button primary">Apri Produzione</button>
        </div>
      </div>

      <div class="editor-section" id="panel-produzione" style="margin-top:12px;">
        <div class="editor-section-header">
          <div>
            <strong>Produzione</strong>
            <div class="section-meta" id="meta-produzione">Seleziona una ricetta e registra la lavorazione</div>
          </div>
          <div class="section-meta">▾</div>
        </div>

        <div class="editor-section-body">
          <div class="editor-grid-2">
            <div class="input-wrap">
              <label>
                Ricetta
                <input id="prod-ricetta-search" class="input-pill" placeholder="Cerca ricetta..." autocomplete="off" />
                <input id="prod-ricetta-id" type="hidden" />
              </label>
              <div id="prod-ricetta-suggest" class="suggest-list"></div>
              <div class="small-muted" id="prod-ricetta-hint">Digita almeno 2 caratteri, poi seleziona la ricetta.</div>
            </div>

            <label>
              Data produzione
              <input id="prod-data" class="input-pill" type="date" />
            </label>
          </div>

          <div class="editor-grid-2">
            <label>
              Quantità prodotta (pezzi)
              <input id="prod-qta" class="input-pill" type="number" step="1" min="1" placeholder="Es. 30" />
            </label>

            <label>
              Lotto (automatico se vuoto)
              <input id="prod-lotto" class="input-pill" placeholder="Es. RAGU-2026-02-17-01" />
            </label>
          </div>

          <div class="editor-grid-2">
            <label>
              Destinazione
              <select id="prod-destinazione" class="input-pill">
                <option value="magazzino_preparazioni">Magazzino Preparazioni</option>
                <option value="linea_ristorante">Linea Ristorante</option>
              </select>
            </label>

            <label>
              Note lavorazione
              <input id="prod-note" class="input-pill" placeholder="Note operative (facoltative)" />
            </label>
          </div>

          <div class="editor-section open" style="margin-top:10px;">
            <div class="editor-section-header" data-accordion="false">
              <div>
                <strong>Conservazione applicata</strong>
                <div class="section-meta">Registrazione operativa (non modifica la ricetta)</div>
              </div>
              <div class="section-meta">▾</div>
            </div>
            <div class="editor-section-body">
              <div class="editor-grid-2">
                <label>
                  Shelf life (giorni)
                  <input id="prod-shelf-life" class="input-pill" type="number" step="1" min="0" placeholder="Es. 3" />
                </label>
                <label>
                  Temperatura (°C)
                  <input id="prod-temp" class="input-pill" type="number" step="0.1" placeholder="Es. 4" />
                </label>
              </div>

              <label>
                Note conservazione
                <textarea id="prod-shelf-note" class="textarea-pill" rows="2" placeholder="Note conservazione applicata"></textarea>
              </label>
            </div>
          </div>

          <div class="editor-section open" style="margin-top:10px;">
            <div class="editor-section-header" data-accordion="false">
              <div>
                <strong>Riepilogo ricetta</strong>
                <div class="section-meta">Output, resa base e fasi (lettura rapida)</div>
              </div>
              <div class="section-meta">▾</div>
            </div>
            <div class="editor-section-body">
              <div id="prod-riepilogo" class="small-muted">Seleziona una ricetta per vedere il riepilogo.</div>
            </div>
          </div>

          <div class="editor-actions" style="margin-top:12px;">
            <button id="btn-prod-conferma" class="app-button green" type="button">Conferma Produzione</button>
            <button id="btn-prod-reset" class="app-button gray" type="button">Reset</button>
          </div>

          <div class="small-muted" style="margin-top:8px;">
            Nota: i movimenti di magazzino (scarico ingredienti / carico output) verranno collegati nel passo successivo.
          </div>
        </div>
      </div>
    </section>
  `;

  bindUI();
  presetDataOggi();
  await preloadRicette();
  setupAutocompleteRicette();
}

function bindUI() {
  document.querySelectorAll(".editor-section-header").forEach((h) => {
    h.addEventListener("click", () => {
      const wrap = h.closest(".editor-section");
      if (!wrap) return;
      wrap.classList.toggle("open");
    });
  });

  document.getElementById("btn-prod-crea-ricetta")?.addEventListener("click", () => {
    window.location.hash = "#/ricette/nuova";
  });

  document.getElementById("btn-prod-cerca-ricetta")?.addEventListener("click", () => {
    window.location.hash = "#/ricettario";
  });

  document.getElementById("btn-prod-apri-panel")?.addEventListener("click", () => {
    const panel = document.getElementById("panel-produzione");
    panel?.classList.add("open");
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("prod-ricetta-search")?.focus();
  });

  document.getElementById("btn-prod-reset")?.addEventListener("click", resetProduzione);
  document.getElementById("btn-prod-conferma")?.addEventListener("click", confermaProduzione);
}

function presetDataOggi() {
  const el = document.getElementById("prod-data");
  if (!el) return;
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  el.value = `${yyyy}-${mm}-${dd}`;
}

// ============================================================
// RICETTE CACHE + AUTOCOMPLETE (NO LISTA COMPLETA VISIBILE)
// ============================================================

async function preloadRicette() {
  const supabase = window.supabaseClient;

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome, tipo, prodotto_output_id, resa_base")
    .order("nome");

  if (error) {
    console.error(error);
    alert("Errore caricamento ricette (Produzione)");
    ricetteCache = [];
    ricetteById = new Map();
    return;
  }

  ricetteCache = data || [];
  ricetteById = new Map(ricetteCache.map((r) => [String(r.id), r]));
}

function setupAutocompleteRicette() {
  const inputEl = document.getElementById("prod-ricetta-search");
  const hiddenIdEl = document.getElementById("prod-ricetta-id");
  const suggestEl = document.getElementById("prod-ricetta-suggest");

  if (!inputEl || !hiddenIdEl || !suggestEl) return;

  const close = () => {
    suggestEl.classList.remove("open");
    suggestEl.innerHTML = "";
  };

  const openWith = (items) => {
    suggestEl.innerHTML = "";
    if (!items.length) {
      close();
      return;
    }

    items.slice(0, 12).forEach((r) => {
      const item = document.createElement("div");
      item.className = "suggest-item";
      const tipo = r.tipo ? (r.tipo === "base" ? "Base" : "Piatto") : "-";
      item.innerHTML = `
        <span>${escapeHtml(r.nome || "")}</span>
        <small>${escapeHtml(tipo)}${r.resa_base ? ` · Resa ${r.resa_base}` : ""}</small>
      `;

      item.addEventListener("mousedown", async (e) => {
        e.preventDefault();
        hiddenIdEl.value = r.id;
        inputEl.value = r.nome || "";
        close();
        await onSelectRicetta(r.id);
      });

      suggestEl.appendChild(item);
    });

    suggestEl.classList.add("open");
  };

  const resetLink = () => {
    hiddenIdEl.value = "";
    ricettaSelezionata = null;
    renderRiepilogo();
  };

  inputEl.addEventListener("input", () => {
    const q = (inputEl.value || "").trim().toLowerCase();
    resetLink();

    if (!q || q.length < 2) {
      close();
      return;
    }

    const items = ricetteCache.filter((r) => (r.nome || "").toLowerCase().includes(q));
    openWith(items);
  });

  inputEl.addEventListener("focus", () => {
    const q = (inputEl.value || "").trim().toLowerCase();
    if (!q || q.length < 2) return;
    const items = ricetteCache.filter((r) => (r.nome || "").toLowerCase().includes(q));
    openWith(items);
  });

  document.addEventListener("click", (e) => {
    if (e.target === inputEl) return;
    if (suggestEl.contains(e.target)) return;
    close();
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

async function onSelectRicetta(ricettaId) {
  const base = ricetteById.get(String(ricettaId));
  if (!base) return;

  ricettaSelezionata = base;
  const hint = document.getElementById("prod-ricetta-hint");
  if (hint) hint.textContent = `Selezionata: ${base.nome || "-"} (tipo: ${base.tipo || "-"})`;

  await enrichRicettaSelezionata(String(ricettaId));
  renderRiepilogo();
}

async function enrichRicettaSelezionata(ricettaId) {
  const supabase = window.supabaseClient;

  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("prodotto_id, nome_prodotto, quantita, unita_misura")
    .eq("ricetta_id", ricettaId);

  const { data: fasi } = await supabase
    .from("ricette_preparazione_fasi")
    .select("ordine, nome_fase, tipo_fase, durata_min, lavoro_umano_min, temperatura")
    .eq("ricetta_id", ricettaId)
    .order("ordine");

  ricettaSelezionata = {
    ...ricettaSelezionata,
    ingredienti: ingredienti || [],
    fasi: fasi || [],
  };
}

function renderRiepilogo() {
  const box = document.getElementById("prod-riepilogo");
  if (!box) return;

  if (!ricettaSelezionata) {
    box.className = "small-muted";
    box.textContent = "Seleziona una ricetta per vedere il riepilogo.";
    return;
  }

  const r = ricettaSelezionata;
  const nIng = (r.ingredienti || []).length;
  const nFasi = (r.fasi || []).length;
  const lavoroTot = (r.fasi || []).reduce((sum, f) => sum + (parseInt(f.lavoro_umano_min || 0, 10) || 0), 0);

  box.className = "";
  box.innerHTML = `
    <div class="editor-grid-2">
      <div class="azienda-card" style="padding:10px;">
        <div style="font-weight:800; color:#111827;">${escapeHtml(r.nome || "")}</div>
        <div class="small-muted">Tipo: ${escapeHtml(r.tipo || "-")}</div>
        <div class="small-muted">Resa base: ${r.resa_base ?? "-"} pezzi</div>
        <div class="small-muted">Ingredienti: ${nIng} · Fasi: ${nFasi}</div>
        <div class="small-muted">Lavoro umano totale: ${lavoroTot} min</div>
      </div>

      <div class="azienda-card" style="padding:10px;">
        <div style="font-weight:700; color:#111827; margin-bottom:6px;">Fasi (anteprima)</div>
        ${
          nFasi
            ? `<div class="small-muted">${(r.fasi || [])
                .slice(0, 4)
                .map((f) => `${escapeHtml(String(f.ordine))}. ${escapeHtml(f.nome_fase || "")} (${escapeHtml(f.tipo_fase || "")})`)
                .join("<br/>")}</div>`
            : `<div class="small-muted">Nessuna fase registrata.</div>`
        }
      </div>
    </div>
  `;
}

// ============================================================
// CONFERMA PRODUZIONE (salvataggio base - schema tabelle da allineare)
// ============================================================

async function confermaProduzione() {
  const ricettaId = (document.getElementById("prod-ricetta-id")?.value || "").trim();
  const qta = toIntOrNull(document.getElementById("prod-qta")?.value);
  const dataProd = (document.getElementById("prod-data")?.value || "").trim();

  if (!ricettaId) return alert("Seleziona una ricetta dalla ricerca.");
  if (!qta || qta <= 0) return alert("Inserisci una quantità prodotta valida.");
  if (!dataProd) return alert("Inserisci la data produzione.");

  const lottoEl = document.getElementById("prod-lotto");
  let lotto = (lottoEl?.value || "").trim();
  if (!lotto) {
    lotto = generaLotto(ricettaSelezionata?.nome || "LOTTO", dataProd);
    if (lottoEl) lottoEl.value = lotto;
  }

  const destinazione = document.getElementById("prod-destinazione")?.value || "magazzino_preparazioni";
  const note = (document.getElementById("prod-note")?.value || "").trim();

  const shelfLife = toIntOrNull(document.getElementById("prod-shelf-life")?.value);
  const temperatura = toFloatOrNull(document.getElementById("prod-temp")?.value);
  const shelfNote = (document.getElementById("prod-shelf-note")?.value || "").trim();

  const supabase = window.supabaseClient;

  try {
    const payload = {
      ricetta_id: ricettaId,
      data_produzione: dataProd,
      lotto,
      quantita_output: qta,
      destinazione,
      note,
      shelf_life_giorni: shelfLife,
      temperatura,
      note_conservazione: shelfNote
    };

    const { data, error } = await supabase
      .from("schede_produzione")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw error;

    alert("Produzione registrata ✔️");

    resetProduzione();
    document.getElementById("panel-produzione")?.classList.remove("open");

  } catch (e) {
    console.error(e);
    alert("Produzione: salvataggio non riuscito (verifica schema tabelle schede_produzione).");
  }
}

function resetProduzione() {
  setValue("prod-ricetta-search", "");
  setValue("prod-ricetta-id", "");
  setValue("prod-qta", "");
  setValue("prod-lotto", "");
  setValue("prod-note", "");
  setValue("prod-shelf-life", "");
  setValue("prod-temp", "");
  setValue("prod-shelf-note", "");
  ricettaSelezionata = null;

  const hint = document.getElementById("prod-ricetta-hint");
  if (hint) hint.textContent = "Digita almeno 2 caratteri, poi seleziona la ricetta.";

  renderRiepilogo();
}

function generaLotto(nomeRicetta, yyyyMmDd) {
  const base = String(nomeRicetta || "LOTTO")
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 18);

  const d = String(yyyyMmDd || "").replaceAll("-", "");
  const rnd = String(Math.floor(Math.random() * 90) + 10);
  return `${base}-${d}-${rnd}`;
}

// ============================================================
// UTILS
// ============================================================

function setValue(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = v ?? "";
}

function toIntOrNull(v) {
  const n = parseInt(String(v || "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloatOrNull(v) {
  const n = parseFloat(String(v || "").trim());
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
