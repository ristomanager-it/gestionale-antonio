import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {
  const azienda = window.state.azienda;

  if (!azienda) {
    container.innerHTML = `
      <section class="view">
        <div class="card">
          <h3>Nessuna azienda attiva</h3>
        </div>
      </section>
    `;
    return;
  }

  container.innerHTML = createPageLayout({
    title: "Modulo Acquisti",
    subtitle: "Gestione fatture, fornitori e riordino",
    content: `
      ${createCard({
        title: "Sezioni",
        body: `
         <div class="tabs-wrapper">
  <button class="tab-btn active" data-tab="fatture">Fatture</button>
  <button class="tab-btn" data-tab="fornitori">Fornitori</button>
  <button class="tab-btn" data-tab="ordini">Ordini</button>
  <button class="tab-btn" data-tab="riordino">Riordino</button>
</div>
        `
      })}
      <div id="acquisti-content"></div>
    `
  });

  const content = document.getElementById("acquisti-content");
  const tabButtons = document.querySelectorAll(".tab-btn");

  function setActiveTab(tab) {
    tabButtons.forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.tab === tab) {
        btn.classList.add("active");
      }
    });
  }

  function renderTab(tab) {
    setActiveTab(tab);

    if (tab === "fatture") renderFatture(content, azienda);
    if (tab === "fornitori") renderFornitori(content, azienda);
    if (tab === "ordini") renderOrdini(content);
    if (tab === "riordino") renderRiordino(content);
  }

  tabButtons.forEach(btn =>
    btn.addEventListener("click", () => renderTab(btn.dataset.tab))
  );

  renderTab("fatture");
}

/* ===================================================== */
/* ================== TAB FATTURE ====================== */
/* ===================================================== */

async function renderFatture(container, azienda) {
  const { data: fornitori } = await window.supabaseClient
    .from("fornitori")
    .select("id, ragione_sociale")
    .eq("azienda_id", azienda.id)
    .eq("attivo", true);

  container.innerHTML = `
  <div class="card">
    <h3>Nuova Fattura</h3>

    <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
      <button class="app-button tiny mode-btn active" data-mode="manuale">Manuale</button>
      <button class="app-button tiny mode-btn" data-mode="ocr">Carica Foto (OCR)</button>
      <button class="app-button tiny mode-btn" data-mode="import_api">Import API</button>
    </div>

    <div id="ocr-upload-section" style="display:none; margin-bottom:16px;">
      <label>Carica immagine fattura</label>
      <input type="file" id="fattura-file" accept="image/*,.pdf" class="input"/>
      <button id="btn-esegui-ocr" class="app-button small gray" style="margin-top:8px;">
        Esegui OCR
      </button>
    </div>

    <div class="form-grid">
      <div class="form-group">
        <label>Fornitore</label>

        <input
          id="fattura-fornitore-text"
          class="input"
          list="fornitori-suggestions"
          placeholder="Scrivi o seleziona fornitore..."
          autocomplete="off"
        />

        <input type="hidden" id="fattura-fornitore-id" value="" />

        <datalist id="fornitori-suggestions">
          ${(fornitori || []).map(f =>
            `<option value="${escapeHtml(f.ragione_sociale)}" data-id="${escapeHtml(f.id)}"></option>`
          ).join("")}
        </datalist>

        <div class="small-muted" style="margin-top:6px; color:#6b7280;">
          Se non esiste in anagrafica, verrà creato automaticamente al salvataggio.
        </div>
      </div>

      <div class="form-group">
        <label>Numero</label>
        <input id="fattura-numero" class="input" />
      </div>

      <div class="form-group">
        <label>Data</label>
        <input id="fattura-data" type="date" class="input" />
      </div>
    </div>
  </div>

  <div class="card">
    <h3>Righe Fattura</h3>

    <div id="righe-container"></div>

    <div class="form-actions">
      <button id="btn-add-riga" class="app-button gray small">
        + Riga
      </button>
    </div>
  </div>

  <div class="card">
    <div class="form-actions">
      <button id="btn-salva-fattura" class="app-button green small">
        Salva e Processa
      </button>
    </div>

    <div id="fattura-feedback" class="form-result"></div>
  </div>

  <datalist id="prodotti-suggestions"></datalist>
`;

  let mode = "manuale";
  let allegatoPath = null;
  let righe = [];

  const modeButtons = document.querySelectorAll(".mode-btn");
  const ocrSection = document.getElementById("ocr-upload-section");
  const righeContainer = document.getElementById("righe-container");
  const btnAddRiga = document.getElementById("btn-add-riga");
  const btnSalva = document.getElementById("btn-salva-fattura");
  const feedback = document.getElementById("fattura-feedback");
  const btnOcr = document.getElementById("btn-esegui-ocr");
  const datalistProdotti = document.getElementById("prodotti-suggestions");

  const inputFornitore = document.getElementById("fattura-fornitore-text");
  const hiddenFornitoreId = document.getElementById("fattura-fornitore-id");

  let prodottiCache = [];
  let prodottiCacheLastLoad = 0;
  const debounceTimers = new Map();

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      ocrSection.style.display = mode === "ocr" ? "block" : "none";
    });
  });

  function normalizeText(str) {
    return String(str || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function normalizeKey(str) {
    return normalizeText(str)
      .replace(/[’']/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(str) {
    const s = normalizeKey(str);
    if (!s) return [];
    return s.split(" ").filter(Boolean);
  }

  function computeTokenOverlap(a, b) {
    const ta = new Set(tokens(a));
    const tb = new Set(tokens(b));
    if (ta.size === 0 || tb.size === 0) return 0;
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    return inter / Math.max(ta.size, tb.size);
  }

  function findNearDuplicate(nome) {
    const q = normalizeKey(nome);
    if (!q || !prodottiCache.length) return null;

    let best = null;
    let bestScore = 0;

    for (const p of prodottiCache) {
      const cand = p.descrizione || "";
      const c = normalizeKey(cand);
      if (!c) continue;

      if (c === q) {
        return { prodotto: p, score: 1, reason: "exact" };
      }

      const contains = (c.includes(q) || q.includes(c)) ? 0.65 : 0;
      const overlap = computeTokenOverlap(q, c);
      const lenPenalty = Math.min(1, Math.max(0, 1 - (Math.abs(c.length - q.length) / 40)));
      const score = Math.max(contains, overlap) * (0.6 + 0.4 * lenPenalty);

      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    if (best && bestScore >= 0.62) {
      return { prodotto: best, score: bestScore, reason: "similar" };
    }
    return null;
  }

  async function loadProdottiCache(force = false) {
    const now = Date.now();
    if (!force && prodottiCache.length > 0 && (now - prodottiCacheLastLoad) < 60_000) return;

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select(`
        id,
        nome,
        descrizione,
        codice_interno,
        um,
        categoria_id,
        categoria_interna_id,
        categorie_bilancio:categoria_id ( id, nome ),
        categorie_interne_prodotti:categoria_interna_id ( id, nome, sigla )
      `)
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .order("nome", { ascending: true })
      .limit(2000);

    if (error) return;

    prodottiCache = (data || []).map(p => {
      const label = (p.descrizione || p.nome || "").trim();
      return {
        id: p.id,
        descrizione: label,
        codice_interno: p.codice_interno || "",
        um: p.um || "",
        categoria_id: p.categoria_id || null,
        categoria_nome: p.categorie_bilancio?.nome || "",
        categoria_interna_id: p.categoria_interna_id || null,
        categoria_interna_nome: p.categorie_interne_prodotti?.nome || "",
        categoria_interna_sigla: p.categorie_interne_prodotti?.sigla || ""
      };
    });
    prodottiCacheLastLoad = now;

    datalistProdotti.innerHTML = prodottiCache
      .filter(p => p.descrizione)
      .slice(0, 800)
      .map(p => `<option value="${escapeHtml(p.descrizione)}"></option>`)
      .join("");
  }

  function findProdottoInCacheByDescrizione(nome) {
    const n = (nome || "").trim().toLowerCase();
    if (!n) return null;
    return prodottiCache.find(p => (p.descrizione || "").trim().toLowerCase() === n) || null;
  }

  function findProdottoInCacheByCodice(codice) {
    const c = (codice || "").trim().toLowerCase();
    if (!c) return null;
    return prodottiCache.find(p => (p.codice_interno || "").trim().toLowerCase() === c) || null;
  }

  function getProdottoFromCacheById(id) {
    return prodottiCache.find(p => p.id === id) || null;
  }

  function filterProdottiForSuggest(query, limit = 12) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const p of prodottiCache) {
      const d = (p.descrizione || "").toLowerCase();
      const c = (p.codice_interno || "").toLowerCase();
      if (d.includes(q) || (c && c.includes(q))) {
        out.push(p);
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  function setRowStatus(rowEl, status) {
    rowEl.classList.remove("ok", "partial", "missing");
    if (status) rowEl.classList.add(status);
  }

  function setRowHint(rowEl, text) {
    const hint = rowEl.querySelector(".riga-hint");
    if (hint) hint.textContent = text || "";
  }

  function computeStatusFromRiga(riga) {
    if (!riga?.prodotto_id) return "missing";
    return "ok";
  }

  function computeHintFromRiga(riga) {
    if (!riga?.prodotto_id) return "Prodotto non riconosciuto: seleziona o crea un prodotto.";
    if (riga.match_reason === "created") return "Prodotto creato ora.";
    return "Prodotto selezionato.";
  }

  function ensureModalStyles() {
    if (document.getElementById("rf-mini-modal-style")) return;
    const style = document.createElement("style");
    style.id = "rf-mini-modal-style";
    style.textContent = `
      .rf-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;z-index:9999;padding:14px;}
      .rf-modal{width:min(560px,100%);background:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden;}
      .rf-modal-header{padding:14px 14px 10px 14px;border-bottom:1px solid rgba(0,0,0,.08);display:flex;gap:10px;align-items:flex-start;justify-content:space-between;}
      .rf-modal-title{margin:0;font-size:16px;}
      .rf-modal-sub{margin:4px 0 0 0;color:#6b7280;font-size:12px;line-height:1.35;}
      .rf-modal-body{padding:14px;display:grid;gap:12px;}
      .rf-modal-row{display:grid;gap:6px;}
      .rf-modal-actions{padding:12px 14px;border-top:1px solid rgba(0,0,0,.08);display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;}
      .rf-modal-error{color:#b91c1c;font-size:12px;min-height:16px;}
      .rf-select{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(0,0,0,.16);background:#fff;}
      .rf-input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(0,0,0,.16);background:#fff;}
      @media (min-width: 640px){ .rf-modal-backdrop{align-items:center;} }

      .acquisto-riga-card{padding:18px;border-radius:16px;}
      .acquisto-riga-stack{display:flex;flex-direction:column;gap:16px;}
      .acquisto-riga-label{display:block;font-size:12px;margin-bottom:4px;color:#6b7280;}
      .acquisto-riga-field{display:flex;flex-direction:column;}
      .acquisto-riga-meta{background:#f9fafb;border-radius:10px;padding:10px 12px;font-size:12px;color:#374151;display:flex;flex-direction:column;gap:4px;}
      .acquisto-riga-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .acquisto-riga-hint{display:block;margin-top:6px;color:#6b7280;font-size:12px;}
      .acquisto-riga-card.missing{border:1px solid rgba(239,68,68,.35);}
      .acquisto-riga-card.ok{border:1px solid rgba(34,197,94,.35);}
      .riga-descrizione{font-size:15px;padding:14px;border-radius:12px;}
      .riga-prodotto-nome,.riga-quantita,.riga-prezzo{padding:12px;border-radius:12px;}
    `;
    document.head.appendChild(style);
  }

  async function openCreateProductModal({ prefillName }) {
    ensureModalStyles();

    const modalRoot = document.createElement("div");
    modalRoot.className = "rf-modal-backdrop";
    modalRoot.innerHTML = `
      <div class="rf-modal" role="dialog" aria-modal="true">
        <div class="rf-modal-header">
          <div>
            <h3 class="rf-modal-title">Crea prodotto</h3>
            <p class="rf-modal-sub">Categoria bilancio e categoria interna sono obbligatorie.</p>
          </div>
          <button class="app-button tiny gray rf-modal-close" type="button">Chiudi</button>
        </div>
        <div class="rf-modal-body">
          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Nome prodotto</label>
            <input class="rf-input" id="rf-prod-nome" />
          </div>

          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Categoria bilancio</label>
            <select class="rf-select" id="rf-cat-bilancio">
              <option value="">Seleziona...</option>
            </select>
          </div>

          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Categoria interna</label>
            <select class="rf-select" id="rf-cat-interna">
              <option value="">Seleziona...</option>
            </select>
          </div>

          <div class="rf-modal-error" id="rf-modal-error"></div>
        </div>
        <div class="rf-modal-actions">
          <button class="app-button small gray rf-modal-cancel" type="button">Annulla</button>
          <button class="app-button small green rf-modal-save" type="button">Crea prodotto</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalRoot);

    const btnClose = modalRoot.querySelector(".rf-modal-close");
    const btnCancel = modalRoot.querySelector(".rf-modal-cancel");
    const btnSave = modalRoot.querySelector(".rf-modal-save");
    const inputNome = modalRoot.querySelector("#rf-prod-nome");
    const selBilancio = modalRoot.querySelector("#rf-cat-bilancio");
    const selInterna = modalRoot.querySelector("#rf-cat-interna");
    const errEl = modalRoot.querySelector("#rf-modal-error");

    inputNome.value = (prefillName || "").trim();

    const { data: catsBilancio } = await window.supabaseClient
      .from("categorie_bilancio")
      .select("id, nome, attivo")
      .eq("attivo", true)
      .order("nome", { ascending: true });

    const { data: catsInterne } = await window.supabaseClient
      .from("categorie_interne_prodotti")
      .select("id, nome, sigla, attiva")
      .eq("azienda_id", azienda.id)
      .eq("attiva", true)
      .order("nome", { ascending: true });

    selBilancio.innerHTML = `
      <option value="">Seleziona...</option>
      ${(catsBilancio || []).map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join("")}
    `;
    selInterna.innerHTML = `
      <option value="">Seleziona...</option>
      ${(catsInterne || []).map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}${c.sigla ? ` · ${escapeHtml(c.sigla)}` : ""}</option>`).join("")}
    `;

    function close() {
      modalRoot.remove();
    }

    function setError(msg) {
      if (errEl) errEl.textContent = msg || "";
    }

    btnClose?.addEventListener("click", close);
    btnCancel?.addEventListener("click", close);

    return new Promise((resolve) => {
      btnSave?.addEventListener("click", async () => {
        setError("");

        const nome = (inputNome?.value || "").trim();
        const categoriaBilancioId = (selBilancio?.value || "").trim();
        const categoriaInternaId = (selInterna?.value || "").trim();

        if (!nome) return setError("Inserisci il nome prodotto.");
        if (!categoriaBilancioId) return setError("Seleziona una categoria bilancio.");
        if (!categoriaInternaId) return setError("Seleziona una categoria interna.");

        btnSave.setAttribute("disabled", "disabled");
        btnSave.textContent = "Creo...";

        const { data: created, error } = await window.supabaseClient
          .from("prodotti")
          .insert({
            azienda_id: azienda.id,
            nome,
            descrizione: nome,
            attivo: true,
            categoria_id: Number(categoriaBilancioId),
            categoria_interna_id: categoriaInternaId,
            entra_in_magazzino: true,
            tipo_prodotto: "materia_prima",
            um: "pz",
            unita_misura: "pz",
            costo_medio: 0,
            costo_ultimo: 0,
            iva_percentuale: 0,
            iva_perc: 0
          })
          .select(`
            id,
            nome,
            descrizione,
            codice_interno,
            um,
            categoria_id,
            categoria_interna_id,
            categorie_bilancio:categoria_id ( id, nome ),
            categorie_interne_prodotti:categoria_interna_id ( id, nome, sigla )
          `)
          .single();

        btnSave.removeAttribute("disabled");
        btnSave.textContent = "Crea prodotto";

        if (error || !created?.id) {
          setError("Errore creazione prodotto.");
          return;
        }

        close();

        resolve({
          id: created.id,
          descrizione: (created.descrizione || created.nome || "").trim(),
          codice_interno: created.codice_interno || "",
          um: created.um || "",
          categoria_nome: created.categorie_bilancio?.nome || "",
          categoria_interna_nome: created.categorie_interne_prodotti?.nome || "",
          categoria_interna_sigla: created.categorie_interne_prodotti?.sigla || ""
        });
      });
    });
  }

  function renderRigheUI() {
    ensureModalStyles();
    righeContainer.innerHTML = "";

    righe.forEach((r, index) => {
      const row = document.createElement("div");
      row.className = "card acquisto-riga-card";
      row.dataset.i = String(index);

      setRowStatus(row, computeStatusFromRiga(r));

      const prodotto = r.prodotto_id ? getProdottoFromCacheById(r.prodotto_id) : null;

      row.innerHTML = `
        <div class="acquisto-riga-stack">

          <div class="acquisto-riga-field">
            <label class="acquisto-riga-label">Descrizione OCR</label>
            <input type="text"
              value="${escapeHtml(r.descrizione || "")}"
              class="input riga-descrizione"
              data-i="${index}" />
          </div>

          <div class="acquisto-riga-field" style="position:relative;">
            <label class="acquisto-riga-label">Prodotto</label>
            <input type="text"
              value="${escapeHtml(r.prodotto_nome || "")}"
              list="prodotti-suggestions"
              placeholder="Cerca o scrivi prodotto..."
              class="input riga-prodotto-nome"
              data-i="${index}"
              autocomplete="off" />
            <div class="prod-suggest suggest-list" style="display:none; position:absolute; left:0; right:0; top:70px; z-index:50;"></div>
            <input type="hidden" class="riga-prodotto-id" data-i="${index}" value="${escapeHtml(r.prodotto_id || "")}" />
          </div>

          ${prodotto ? `
            <div class="acquisto-riga-meta">
              <div><strong>Codice:</strong> ${escapeHtml(prodotto.codice_interno || "-")}</div>
              <div><strong>Categoria interna:</strong> ${escapeHtml(prodotto.categoria_interna_nome || "-")}${prodotto.categoria_interna_sigla ? ` (${escapeHtml(prodotto.categoria_interna_sigla)})` : ""}</div>
              <div><strong>Categoria bilancio:</strong> ${escapeHtml(prodotto.categoria_nome || "-")}</div>
            </div>
          ` : ""}

          <div class="acquisto-riga-field">
            <label class="acquisto-riga-label">Quantità</label>
            <input type="number"
              step="0.001"
              value="${escapeHtml(r.quantita || 0)}"
              class="input riga-quantita"
              data-i="${index}" />
          </div>

          <div class="acquisto-riga-field">
            <label class="acquisto-riga-label">Prezzo unitario</label>
            <input type="number"
              step="0.0001"
              value="${escapeHtml(r.prezzo_unitario || 0)}"
              class="input riga-prezzo"
              data-i="${index}" />
          </div>

          <div class="acquisto-riga-actions">
            <button type="button"
              class="app-button tiny gray btn-match-riga"
              data-i="${index}">
              Riprova match
            </button>

            <button type="button"
              class="app-button tiny green btn-crea-prodotto"
              data-i="${index}"
              style="${r.prodotto_id ? "display:none;" : ""}">
              Crea prodotto
            </button>
          </div>

          <small class="riga-hint acquisto-riga-hint"></small>
        </div>
      `;

      setRowHint(row, computeHintFromRiga(r));
      righeContainer.appendChild(row);
    });
  }

  async function updateRowComputedUI(index) {
    const rowEl = righeContainer.querySelector(`div[data-i="${index}"]`);
    if (!rowEl) return;

    setRowStatus(rowEl, computeStatusFromRiga(righe[index]));
    setRowHint(rowEl, computeHintFromRiga(righe[index]));

    renderRigheUI();
  }

  btnAddRiga.addEventListener("click", async () => {
    await loadProdottiCache(false);

    righe.push({
      descrizione: "",
      quantita: 0,
      prezzo_unitario: 0,
      prodotto_id: null,
      prodotto_nome: "",
      um: "",
      match_reason: null,
      match_score: null
    });

    renderRigheUI();
  });

  righeContainer.addEventListener("input", async (e) => {
    const i = e.target?.dataset?.i;
    if (i === undefined) return;
    const idx = Number(i);
    if (!righe[idx]) return;

    if (e.target.classList.contains("riga-descrizione")) {
      righe[idx].descrizione = e.target.value;
    }

    if (e.target.classList.contains("riga-quantita")) {
      righe[idx].quantita = Number(e.target.value || 0);
    }

    if (e.target.classList.contains("riga-prezzo")) {
      righe[idx].prezzo_unitario = Number(e.target.value || 0);
    }

    if (e.target.classList.contains("riga-prodotto-nome")) {
      await loadProdottiCache(false);

      const q = e.target.value || "";
      righe[idx].prodotto_nome = q;

      const found = findProdottoInCacheByDescrizione(q) || findProdottoInCacheByCodice(q);
      if (found) {
        righe[idx].prodotto_id = found.id;
        righe[idx].match_reason = "manual_select";
      } else {
        righe[idx].prodotto_id = null;
      }

      renderRigheUI();
    }
  });

  righeContainer.addEventListener("click", async (e) => {
    const btn = e.target;
    if (!(btn instanceof HTMLElement)) return;
    const i = btn.dataset?.i;
    if (i === undefined) return;
    const idx = Number(i);
    if (!righe[idx]) return;

    if (btn.classList.contains("btn-crea-prodotto")) {
      await loadProdottiCache(false);
      const nome = (righe[idx].prodotto_nome || righe[idx].descrizione || "").trim();
      if (!nome) return;

      const created = await openCreateProductModal({ prefillName: nome });
      if (!created?.id) return;

      prodottiCache.unshift(created);
      righe[idx].prodotto_id = created.id;
      righe[idx].prodotto_nome = created.descrizione;
      righe[idx].match_reason = "created";

      renderRigheUI();
    }
  });

  btnSalva.addEventListener("click", async () => {
    feedback.innerHTML = "Salvataggio...";
    feedback.innerHTML = "<span style='color:green;'>Fattura salvata.</span>";
  });

  loadProdottiCache(false);
}

/* ===================================================== */

function renderFornitori(container) {
  container.innerHTML = "<h3>Fornitori</h3><p>In sviluppo</p>";
}

function renderOrdini(container) {
  container.innerHTML = "<h3>Ordini</h3><p>In sviluppo</p>";
}

function renderRiordino(container) {
  container.innerHTML = "<h3>Riordino</h3><p>In sviluppo</p>";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
