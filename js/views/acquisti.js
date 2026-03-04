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
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;">
      <h3 style="margin:0;">Nuova Fattura</h3>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="btn-indietro-admin" class="app-button tiny gray" type="button">← Indietro</button>
        <button id="btn-guida" class="app-button tiny gray" type="button">Guida</button>
      </div>
    </div>

    <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
      <button class="app-button tiny mode-btn active" data-mode="manuale">Manuale</button>
      <button class="app-button tiny mode-btn" data-mode="ocr">Carica Foto (OCR)</button>
</div>

    <div id="ocr-upload-section" style="display:none; margin-bottom:16px;">
      <input type="file" id="fattura-file" accept="image/*,.pdf" class="input" multiple style="display:none;"/>
      <button id="btn-esegui-ocr" class="app-button small gray" type="button">
        Carica e analizza fattura
      </button>
      <div class="small-muted" style="margin-top:6px; color:#6b7280;">Puoi selezionare più file (immagini e/o PDF, anche multi-pagina).</div>
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
            `<option value="${escapeHtml(f.ragione_sociale)}"></option>`
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

  // Stato condiviso (coerenza UI ↔ state)
  window.state.fatturaCorrente = window.state.fatturaCorrente || {};
  window.state.fatturaCorrente.immagini = window.state.fatturaCorrente.immagini || [];
  window.state.fatturaCorrente.righe = window.state.fatturaCorrente.righe || [];

  let righe = window.state.fatturaCorrente.righe;


  const modeButtons = document.querySelectorAll(".mode-btn");
  const ocrSection = document.getElementById("ocr-upload-section");
  const righeContainer = document.getElementById("righe-container");
  const btnAddRiga = document.getElementById("btn-add-riga");
  const btnSalva = document.getElementById("btn-salva-fattura");
  const feedback = document.getElementById("fattura-feedback");
  const btnOcr = document.getElementById("btn-esegui-ocr");
  const datalistProdotti = document.getElementById("prodotti-suggestions");

  const btnIndietro = document.getElementById("btn-indietro-admin");
  const btnGuida = document.getElementById("btn-guida");

  btnIndietro?.addEventListener("click", () => {
    window.location.hash = "#/amministrazione";
  });

  btnGuida?.addEventListener("click", () => {
    openGuidaModal();
  });


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

  function toBigintNumber(v) {
    const s = String(v ?? "").trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function parseLocaleNumber(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "number") return Number.isFinite(value) ? value : fallback;

    let s = String(value).trim();
    if (!s) return fallback;

    s = s.replace(/[?\s]/g, "");

    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma > lastDot) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (lastComma !== -1) {
      s = s.replace(",", ".");
    }

    s = s.replace(/[^0-9.\-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }

  function roundTo3(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 0;
    return Math.round(x * 1000) / 1000;
  }

  function cleanOcrDescrizione(raw) {
    let s = String(raw || "").trim();
    if (!s) return "";

    s = s.replace(/^merce\s+non\s+deperibile\s*[-??:]\s*/i, "");
    s = s.replace(/^merce\s+deperibile\s*[-??:]\s*/i, "");
    s = s.replace(/^beni\s*[-??:]\s*/i, "");
    s = s.replace(/^servizi\s*[-??:]\s*/i, "");

    if (/^(merce|beni|servizi)\b/i.test(s) && /[-??]/.test(s)) {
      s = s.replace(/^[^-??]*[-??]\s*/, "");
    }

    return s.replace(/\s+/g, " ").trim();
  }

  function extractOcrLineTotal(r) {
    if (!r || typeof r !== "object") return null;
    const candidates = [
      r.totale_riga, r.totaleRiga, r.totale,
      r.importo, r.amount, r.valore, r.prezzo_totale, r.prezzoTotale,
      r.subtotale, r.subTotal, r.line_total, r.lineTotal
    ];
    for (const c of candidates) {
      const n = parseLocaleNumber(c, NaN);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }

  function normalizeText(str) {
    return String(str || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function normalizeKey(str) {
    return normalizeText(str)
      .replace(/[?']/g, "")
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
      .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id")
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
        categoria_bilancio_id: p.categoria_bilancio_id ?? null
      };
    });
    prodottiCacheLastLoad = now;

    datalistProdotti.innerHTML = prodottiCache
      .filter(p => p.descrizione)
      .slice(0, 800)
      .map(p => `<option value="${escapeHtml(p.descrizione)}"></option>`)
      .join("");
  }

  async function ensureProdottoCategoriaInCache(prodottoId) {
    if (!prodottoId) return null;
    const cached = prodottiCache.find(p => String(p.id) === String(prodottoId));
    if (cached && cached.categoria_bilancio_id !== undefined) return cached;

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id")
      .eq("azienda_id", azienda.id)
      .eq("id", prodottoId)
      .single();

    if (error || !data) return cached || null;

    const label = (data.descrizione || data.nome || "").trim();
    const merged = {
      id: data.id,
      descrizione: label,
      codice_interno: data.codice_interno || "",
      um: data.um || "",
      categoria_bilancio_id: data.categoria_bilancio_id ?? null
    };

    if (cached) {
      cached.descrizione = merged.descrizione;
      cached.codice_interno = merged.codice_interno;
      cached.um = merged.um;
      cached.categoria_bilancio_id = merged.categoria_bilancio_id;
      return cached;
    }

    prodottiCache.unshift(merged);
    return merged;
  }

  async function getCategoriaBilancioIdForProdotto(prodottoId) {
    const p = await ensureProdottoCategoriaInCache(prodottoId);
    return p?.categoria_bilancio_id ?? null;
  }

  function findFornitoreByRagioneSociale(nome) {
    const n = (nome || "").trim().toLowerCase();
    if (!n) return null;
    return (fornitori || []).find(f => ((f.ragione_sociale || "").trim().toLowerCase() === n)) || null;
  }

  function syncFornitoreHiddenFromInput() {
    const txt = (inputFornitore?.value || "").trim();
    if (!txt) {
      if (hiddenFornitoreId) hiddenFornitoreId.value = "";
      return;
    }

    const match = findFornitoreByRagioneSociale(txt);
    if (match?.id) {
      if (hiddenFornitoreId) hiddenFornitoreId.value = String(match.id);
    } else {
      if (hiddenFornitoreId) hiddenFornitoreId.value = "";
    }
  }

  function getCurrentFornitoreId() {
    const v = (hiddenFornitoreId?.value || "").trim();
    return v || null;
  }

  function getCurrentFornitoreName() {
    return (inputFornitore?.value || "").trim();
  }

  inputFornitore?.addEventListener("input", () => {
    syncFornitoreHiddenFromInput();
  });
  inputFornitore?.addEventListener("change", () => {
    syncFornitoreHiddenFromInput();
    righe.forEach((_, idx) => updateRowComputedUI(idx));
  });

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

  function isStrongMatch(score) {
    return typeof score === "number" && score >= 0.72;
  }

  async function tryMatchProdottoFornitore(fornitoreId, descrizioneRiga) {
    const q = normalizeText(descrizioneRiga);
    if (!fornitoreId || !q) return null;

    const { data, error } = await window.supabaseClient
      .from("prodotti_fornitore")
      .select("prodotto_id, descrizione_fornitore")
      .eq("azienda_id", azienda.id)
      .eq("fornitore_id", fornitoreId)
      .ilike("descrizione_fornitore", `%${q}%`)
      .limit(1);

    if (error || !data || !data.length) return null;

    return {
      prodotto_id: data[0].prodotto_id,
      reason: "match_fornitore",
      score: 0.95
    };
  }

  async function tryMatchProdottiDirect(descrizioneRiga) {
    const q = normalizeText(descrizioneRiga);
    if (!q) return null;

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, nome, descrizione")
      .eq("azienda_id", azienda.id)
      .ilike("nome", `%${q}%`)
      .order("nome", { ascending: true })
      .limit(1);

    if (error || !data || !data.length) return null;

    return {
      prodotto_id: data[0].id,
      reason: "match_prodotti",
      score: 0.65
    };
  }

  async function tryMatchFuzzy(descrizioneRiga) {
    const q = normalizeText(descrizioneRiga);
    if (!q) return null;

    const fornitoreIdRaw = getCurrentFornitoreId();
    const fornitoreId = fornitoreIdRaw ? Number(fornitoreIdRaw) : null;
    if (!fornitoreId || !Number.isFinite(fornitoreId)) return null;

    try {
      const { data, error } = await window.supabaseClient.rpc("match_prodotto_fuzzy", {
        p_azienda_id: azienda.id,
        p_fornitore_id: fornitoreId,
        p_descrizione: q
      });

      if (error || !data) return null;

      const best = Array.isArray(data) ? data[0] : data;
      if (!best) return null;

      const prodottoId = best.prodotto_id || best.id || null;
      const score = typeof best.score === "number"
        ? best.score
        : (typeof best.similarity === "number" ? best.similarity : null);

      if (!prodottoId) return null;

      return {
        prodotto_id: prodottoId,
        reason: "match_fuzzy",
        score: score ?? 0.55
      };
    } catch (_) {
      return null;
    }
  }

  async function matchRigaToProdotto(descrizioneRiga) {
    const fornitoreId = getCurrentFornitoreId();

    const m1 = await tryMatchProdottoFornitore(fornitoreId, descrizioneRiga);
    if (m1?.prodotto_id) return m1;

    const m2 = await tryMatchProdottiDirect(descrizioneRiga);
    if (m2?.prodotto_id) return m2;

    const m3 = await tryMatchFuzzy(descrizioneRiga);
    if (m3?.prodotto_id) return m3;

    return null;
  }

  async function loadProdottoNomeById(id) {
    if (!id) return "";
    const cached = prodottiCache.find(p => p.id === id);
    if (cached) return cached.descrizione || "";

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, nome, descrizione")
      .eq("azienda_id", azienda.id)
      .eq("id", id)
      .single();

    if (error || !data) return "";
    return (data.descrizione || data.nome || "") || "";
  }

  function computeStatusFromRiga(riga) {
    if (!riga?.prodotto_id) return "missing";
    if (isStrongMatch(riga.match_score)) return "ok";
    return "partial";
  }

  function computeHintFromRiga(riga) {
    if (!riga?.prodotto_id) return "Prodotto non riconosciuto: seleziona o crea un prodotto.";
    if (riga.match_reason === "match_fornitore") return "Match forte (fornitore).";
    if (riga.match_reason === "match_prodotti") return "Match medio (anagrafica prodotti). Verifica.";
    if (riga.match_reason === "match_fuzzy") return "Match fuzzy. Verifica con attenzione.";
    if (riga.match_reason === "match_cache") return "Match cache (esatto).";
    if (riga.match_reason === "created") return "Prodotto creato ora.";
    return "Prodotto selezionato manualmente.";
  }

  function closeAllSuggest() {
    const all = righeContainer.querySelectorAll(".prod-suggest");
    all.forEach(x => {
      x.classList.remove("open");
      x.innerHTML = "";
      x.style.display = "none";
    });
  }

  function openSuggestForIndex(idx, items) {
    const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
    const suggest = rowEl?.querySelector(".prod-suggest");
    if (!suggest) return;

    if (!items || !items.length) {
      suggest.classList.remove("open");
      suggest.innerHTML = "";
      suggest.style.display = "none";
      return;
    }

    suggest.innerHTML = items.map(p => {
      const label = p.codice_interno
        ? `${escapeHtml(p.descrizione)} · ${escapeHtml(p.codice_interno)}`
        : `${escapeHtml(p.descrizione)}`;
      return `<div class="suggest-item" data-prod-id="${escapeHtml(p.id)}">${label}</div>`;
    }).join("");

    suggest.style.display = "block";
    suggest.classList.add("open");
  }

  async function selectProdottoForRow(idx, prodotto) {
    if (!righe[idx] || !prodotto?.id) return;

    righe[idx].prodotto_id = prodotto.id;
    righe[idx].prodotto_nome = prodotto.descrizione || "";
    righe[idx].match_reason = "manual_select";
    righe[idx].match_score = 0.70;

    if (prodotto.um) {
      righe[idx].um = prodotto.um;
    }

    const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
    const inpProd = rowEl?.querySelector(".riga-prodotto-nome");
    const hidId = rowEl?.querySelector(".riga-prodotto-id");
    const umEl = rowEl?.querySelector(".riga-um");

    if (inpProd) inpProd.value = righe[idx].prodotto_nome;
    if (hidId) hidId.value = righe[idx].prodotto_id || "";
    if (umEl) umEl.textContent = righe[idx].um ? `UM: ${righe[idx].um}` : "";

    closeAllSuggest();

    // ==============================
    // SALVA MAPPING FORNITORE AUTO
    // ==============================
    const fornitoreId = getCurrentFornitoreId();
    const descrFornitore = (righe[idx].descrizione || "").trim();

    if (fornitoreId && descrFornitore) {
      try {
        await window.supabaseClient
          .from("prodotti_fornitore")
          .upsert(
            {
              azienda_id: azienda.id,
              fornitore_id: Number(fornitoreId),
              prodotto_id: prodotto.id,
              descrizione_fornitore: descrFornitore,
              attivo: true
            },
            {
              onConflict: "azienda_id,fornitore_id,descrizione_fornitore"
            }
          );
      } catch (e) {
        console.warn("Errore salvataggio mapping fornitore", e);
      }
    }

    await updateRowComputedUI(idx);
  }

    const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
    const inpProd = rowEl?.querySelector(".riga-prodotto-nome");
    const hidId = rowEl?.querySelector(".riga-prodotto-id");
    const umEl = rowEl?.querySelector(".riga-um");

    if (inpProd) inpProd.value = righe[idx].prodotto_nome;
    if (hidId) hidId.value = righe[idx].prodotto_id || "";
    if (umEl) umEl.textContent = righe[idx].um ? `UM: ${righe[idx].um}` : "";

    closeAllSuggest();
    await updateRowComputedUI(idx);
  }

  async function loadCategorieBilancio() {
    const { data, error } = await window.supabaseClient
      .from("categorie_bilancio")
      .select("id, nome, attivo")
      .eq("attivo", true)
      .order("nome", { ascending: true });

    if (error) return [];
    return (data || []).map(x => ({
      id: x.id,
      nome: x.nome
    }));
  }

  async function loadCategorieInterne() {
    const { data, error } = await window.supabaseClient
      .from("categorie_interne_prodotti")
      .select("id, nome, sigla, attiva")
      .eq("azienda_id", azienda.id)
      .eq("attiva", true)
      .order("nome", { ascending: true });

    if (error) return [];
    return (data || []).map(x => ({
      id: x.id,
      nome: x.nome,
      sigla: x.sigla
    }));
  }

  function destroyModal(modalRoot) {
    if (!modalRoot) return;
    modalRoot.remove();
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
      .acquisto-riga-card{padding:18px;min-height:150px;}
      .acquisto-riga-stack{display:grid;gap:12px;}
      .acquisto-riga-top{display:grid;gap:10px;}
      .acquisto-riga-grid2{display:grid;gap:10px;grid-template-columns:1fr 1fr;}
      @media (max-width: 460px){ .acquisto-riga-grid2{grid-template-columns:1fr;} }
      .acquisto-riga-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .acquisto-riga-label{display:block;font-size:12px;margin-bottom:4px;color:#6b7280;}
      .acquisto-riga-hint{display:block;margin-top:6px;color:#6b7280;}
      .acquisto-riga-card.missing{border:1px solid rgba(239,68,68,.35);}
      .acquisto-riga-card.partial{border:1px solid rgba(245,158,11,.35);}
      .acquisto-riga-card.ok{border:1px solid rgba(34,197,94,.35);}
      .tabs-wrapper{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .tab-btn{border-radius:10px;}
      .prod-suggest{position:relative;}
      .prod-suggest.open{display:block;}
      .prod-suggest{display:none;position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;border:1px solid rgba(0,0,0,.12);border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,.08);z-index:20;max-height:220px;overflow:auto;}
      .suggest-item{padding:10px 12px;cursor:pointer;font-size:13px;}
      .suggest-item:hover{background:rgba(0,0,0,.04);}

    `;
    document.head.appendChild(style);
  }

  
  function openGuidaModal() {
    ensureModalStyles();

    const modalRoot = document.createElement("div");
    modalRoot.className = "rf-modal-backdrop";
    modalRoot.innerHTML = `
      <div class="rf-modal" role="dialog" aria-modal="true">
        <div class="rf-modal-header">
          <div>
            <h3 class="rf-modal-title">Guida operativa – Fatture</h3>
            <p class="rf-modal-sub">Procedura rapida per caricare, controllare e processare una fattura.</p>
          </div>
          <button class="app-button tiny gray rf-modal-close" type="button">Chiudi</button>
        </div>
        <div class="rf-modal-body" style="gap:10px;">
          <div style="font-size:13px;line-height:1.45;">
            <ol style="margin:0;padding-left:18px;display:grid;gap:8px;">
              <li><b>Seleziona modalità</b>: Manuale oppure <b>Carica e analizza fattura</b> (OCR).</li>
              <li><b>Caricamento OCR</b>: puoi selezionare <b>più immagini</b> se la fattura è multi-pagina.</li>
              <li><b>Controlla le righe</b>: quantità, prezzo e descrizione.</li>
              <li><b>Assegna prodotto interno</b>: usa autocomplete o <b>Crea prodotto</b>.</li>
              <li><b>Righe incomplete</b>: se mancano prodotti, la riga viene evidenziata in rosso.</li>
              <li><b>Salva e processa</b>: crea fattura, salva righe e lancia la processazione.</li>
            </ol>
            <div style="margin-top:10px;color:#6b7280;">
              Suggerimento: se un prodotto ha dati errati, usa <b>Modifica prodotto</b> direttamente dalla riga.
            </div>
          </div>
        </div>
        <div class="rf-modal-actions">
          <button class="app-button small gray rf-modal-cancel" type="button">Chiudi</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalRoot);

    function close() {
      destroyModal(modalRoot);
    }

    modalRoot.addEventListener("click", (e) => {
      if (e.target === modalRoot) close();
    });

    modalRoot.querySelector(".rf-modal-close")?.addEventListener("click", close);
    modalRoot.querySelector(".rf-modal-cancel")?.addEventListener("click", close);
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
            <p class="rf-modal-sub">Inserisci o cerca le categorie obbligatorie prima di creare il prodotto.</p>
          </div>
          <button class="app-button tiny gray rf-modal-close" type="button">Chiudi</button>
        </div>
        <div class="rf-modal-body">
          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Nome prodotto</label>
            <input class="rf-input" id="rf-prod-nome" />
            <div class="small-muted" style="color:#6b7280;font-size:12px;">Verrà salvato in <b>nome</b> e <b>descrizione</b>.</div>
          </div>

          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Categoria bilancio</label>
            <input class="rf-input" id="rf-cat-bilancio-text" list="rf-cat-bilancio-list" placeholder="Cerca categoria bilancio..." autocomplete="off" />
            <input type="hidden" id="rf-cat-bilancio-id" value="" />
            <datalist id="rf-cat-bilancio-list"></datalist>
          </div>

          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Categoria interna</label>
            <input class="rf-input" id="rf-cat-interna-text" list="rf-cat-interna-list" placeholder="Cerca categoria interna..." autocomplete="off" />
            <input type="hidden" id="rf-cat-interna-id" value="" />
            <datalist id="rf-cat-interna-list"></datalist>
          </div>

          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Scorta minima (riordino)</label>
            <input class="rf-input" id="rf-scorta-minima" type="number" step="0.001" placeholder="Es. 2" />
            <div class="small-muted" style="color:#6b7280;font-size:12px;">Valore usato per alert sottoscorta e riordino.</div>
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
    const inputScortaMinima = modalRoot.querySelector("#rf-scorta-minima");

    const inputBilancioText = modalRoot.querySelector("#rf-cat-bilancio-text");
    const hiddenBilancioId = modalRoot.querySelector("#rf-cat-bilancio-id");
    const dlBilancio = modalRoot.querySelector("#rf-cat-bilancio-list");

    const inputInternaText = modalRoot.querySelector("#rf-cat-interna-text");
    const hiddenInternaId = modalRoot.querySelector("#rf-cat-interna-id");
    const dlInterna = modalRoot.querySelector("#rf-cat-interna-list");

    const errEl = modalRoot.querySelector("#rf-modal-error");

    inputNome.value = (prefillName || "").trim();

    const [catsBilancio, catsInterne] = await Promise.all([
      loadCategorieBilancio(),
      loadCategorieInterne()
    ]);

    const bilancioByLabel = new Map(
      (catsBilancio || []).map(c => [String(c.nome || "").trim().toLowerCase(), String(c.id)])
    );

    const interneLabels = (catsInterne || []).map(c => ({
      id: String(c.id),
      nome: String(c.nome || ""),
      sigla: String(c.sigla || ""),
      label: `${c.nome}${c.sigla ? ` · ${c.sigla}` : ""}`.trim()
    }));

    const internaByLabel = new Map(
      interneLabels.map(x => [x.label.toLowerCase(), x.id])
    );

    const internaByNome = new Map(
      interneLabels.map(x => [String(x.nome || "").trim().toLowerCase(), x.id])
    );

    const interneSigleSet = new Set(
      interneLabels.map(x => String(x.sigla || "").trim().toUpperCase()).filter(Boolean)
    );

    dlBilancio.innerHTML = (catsBilancio || [])
      .map(c => `<option value="${escapeHtml(c.nome)}"></option>`)
      .join("");

    dlInterna.innerHTML = interneLabels
      .map(x => `<option value="${escapeHtml(x.label)}"></option>`)
      .join("");

    let externalResolve = null;

    function close() {
      destroyModal(modalRoot);
      if (externalResolve) externalResolve(null);
    }

    function setError(msg) {
      if (errEl) errEl.textContent = msg || "";
    }

    function syncBilancioId() {
      const raw = String(inputBilancioText?.value || "").trim().toLowerCase();

      if (bilancioByLabel.has(raw)) {
        hiddenBilancioId.value = bilancioByLabel.get(raw);
        return;
      }

      const found = [...bilancioByLabel.entries()]
        .find(([label]) => label.includes(raw));

      hiddenBilancioId.value = found ? found[1] : "";
    }

    function syncInternaId() {
      const raw = String(inputInternaText?.value || "").trim().toLowerCase();

      if (internaByLabel.has(raw)) {
        hiddenInternaId.value = internaByLabel.get(raw);
        return;
      }

      if (internaByNome.has(raw)) {
        hiddenInternaId.value = internaByNome.get(raw);
        return;
      }

      const found = [...internaByLabel.entries()]
        .find(([label]) => label.includes(raw));

      hiddenInternaId.value = found ? found[1] : "";
    }

    function makeBaseSigla(nome) {
      const raw = String(nome || "").trim().toUpperCase();
      if (!raw) return "CAT";
      const words = raw
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter(Boolean);

      let base = "";
      if (words.length >= 2) {
        base = (words[0][0] || "") + (words[1][0] || "");
        if (words[2]?.[0]) base += words[2][0];
      } else if (words.length === 1) {
        base = words[0].slice(0, 4);
      }
      base = base.replace(/[^A-Z0-9]/g, "");
      if (base.length < 2) base = (words[0] || "CAT").slice(0, 3).replace(/[^A-Z0-9]/g, "");
      if (!base) base = "CAT";
      return base.slice(0, 6);
    }

    function nextAvailableSigla(nome) {
      const base = makeBaseSigla(nome);
      if (!interneSigleSet.has(base)) return base;

      for (let i = 2; i <= 50; i++) {
        const candidate = (base + String(i)).slice(0, 10);
        if (!interneSigleSet.has(candidate)) return candidate;
      }
      return (base + "_" + String(Date.now()).slice(-4)).slice(0, 10);
    }

    inputBilancioText?.addEventListener("input", syncBilancioId);
    inputBilancioText?.addEventListener("change", syncBilancioId);
    inputInternaText?.addEventListener("input", syncInternaId);
    inputInternaText?.addEventListener("change", syncInternaId);

    modalRoot.addEventListener("click", (e) => {
      if (e.target === modalRoot) close();
    });

    btnClose?.addEventListener("click", close);
    btnCancel?.addEventListener("click", close);

    const result = await new Promise((resolve) => {
      externalResolve = resolve;

      btnSave?.addEventListener("click", async () => {
        setError("");

        syncBilancioId();
        syncInternaId();

        const nome = (inputNome?.value || "").trim();

        const bilancioText = String(inputBilancioText?.value || "").trim();
        let categoriaBilancioId = (hiddenBilancioId?.value || "").trim();

        const internaText = String(inputInternaText?.value || "").trim();
        let categoriaInternaId = (hiddenInternaId?.value || "").trim();

        const scortaMinima = parseLocaleNumber(inputScortaMinima?.value, 0);

        if (!nome) return setError("Inserisci il nome prodotto.");

        // Categoria bilancio (obbligatoria)
        if (!categoriaBilancioId) {
          if (!bilancioText) return setError("Inserisci una categoria bilancio.");

          const bilancioExactKey = bilancioText.trim().toLowerCase();
          if (bilancioByLabel.has(bilancioExactKey)) {
            categoriaBilancioId = String(bilancioByLabel.get(bilancioExactKey));
          } else {
            const { data: existingCats, error: errExisting } = await window.supabaseClient
              .from("categorie_bilancio")
              .select("id, nome")
              .ilike("nome", bilancioText)
              .limit(1);

            if (!errExisting && existingCats && existingCats.length) {
              categoriaBilancioId = String(existingCats[0].id);
            } else {
              const { data: createdCat, error: errCreate } = await window.supabaseClient
                .from("categorie_bilancio")
                .insert({ nome: bilancioText, attivo: true })
                .select("id, nome")
                .single();

              if (errCreate || !createdCat?.id) {
                return setError("Impossibile creare la categoria bilancio. Verifica permessi/RLS o il nome.");
              }

              categoriaBilancioId = String(createdCat.id);

              const key = String(createdCat.nome || bilancioText).trim().toLowerCase();
              bilancioByLabel.set(key, categoriaBilancioId);
              if (dlBilancio) dlBilancio.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(createdCat.nome || bilancioText)}"></option>`);
            }
          }

          if (hiddenBilancioId) hiddenBilancioId.value = categoriaBilancioId;
        }

        // Categoria interna (obbligatoria)
        if (!categoriaInternaId) {
          if (!internaText) return setError("Inserisci una categoria interna.");

          const internaKey = internaText.trim().toLowerCase();
          if (internaByNome.has(internaKey)) {
            categoriaInternaId = String(internaByNome.get(internaKey));
          } else {
            const { data: existingInt, error: errExistingInt } = await window.supabaseClient
              .from("categorie_interne_prodotti")
              .select("id, nome, sigla")
              .eq("azienda_id", azienda.id)
              .ilike("nome", internaText)
              .limit(1);

            if (errExistingInt) {
              console.error(errExistingInt);
              return setError("Errore verifica categoria interna.");
            }

            if (existingInt && existingInt.length > 0) {
              categoriaInternaId = String(existingInt[0].id);
            } else {
              const sigla = nextAvailableSigla(internaText);

              const { data: createdInt, error: errCreateInt } = await window.supabaseClient
                .from("categorie_interne_prodotti")
                .insert({
                  azienda_id: azienda.id,
                  nome: internaText,
                  sigla,
                  attiva: true
                })
                .select("id, nome, sigla")
                .single();

              if (errCreateInt || !createdInt?.id) {
                console.error(errCreateInt);
                return setError("Impossibile creare la categoria interna. Verifica permessi o duplicati.");
              }

              categoriaInternaId = String(createdInt.id);

              interneSigleSet.add(String(createdInt.sigla || sigla).trim().toUpperCase());
              internaByNome.set(internaKey, categoriaInternaId);
              internaByLabel.set(`${String(createdInt.nome)} · ${String(createdInt.sigla || sigla)}`.trim().toLowerCase(), categoriaInternaId);

              if (dlInterna) {
                dlInterna.insertAdjacentHTML(
                  "beforeend",
                  `<option value="${escapeHtml(`${createdInt.nome}${(createdInt.sigla || sigla) ? ` · ${createdInt.sigla || sigla}` : ""}`.trim())}"></option>`
                );
              }
            }
          }

          if (hiddenInternaId) hiddenInternaId.value = categoriaInternaId;
        }

        // Duplicati
        const near = findNearDuplicate(nome);
        if (near?.prodotto?.id) {
          const suggestLabel = near.prodotto.codice_interno
            ? `${near.prodotto.descrizione} (${near.prodotto.codice_interno})`
            : `${near.prodotto.descrizione}`;
          const useExisting = window.confirm(
            `Possibile duplicato: intendevi "${suggestLabel}"?\n\nOK = usa esistente\nAnnulla = crea comunque`
          );
          if (useExisting) {
            close();
            resolve({ action: "use_existing", prodotto: near.prodotto });
            return;
          }
        }

        
        // Safety: il DB genera codice_interno in base alla categoria interna
        if (!categoriaInternaId) {
          return setError("Categoria interna obbligatoria: seleziona o crea una categoria interna valida.");
        }
btnSave.setAttribute("disabled", "disabled");
        btnSave.textContent = "Creo...";

        try {
          const payload = {
            azienda_id: azienda.id,

            // Lasciare NULL: il codice viene generato dai trigger DB
            codice_interno: null,

            nome,
            descrizione: nome,

            // categoria_bilancio_id = categoria bilancio (bigint)
            categoria_bilancio_id: categoriaBilancioId ? Number(categoriaBilancioId) : null,

            // categoria interna (uuid)  deve essere valorizzata per generare il codice interno
            categoria_interna_id: categoriaInternaId || null,

            scorta_minima: (Number.isFinite(scortaMinima) ? scortaMinima : 0),

            tipo_prodotto: "materia_prima",

            um: "pz",
            unita_misura: "pz",

            costo_medio: 0,
            costo_ultimo: 0,

            attivo: true
          };

          const { data: created, error } = await window.supabaseClient
            .from("prodotti")
            .insert(payload)
            .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id, categoria_interna_id, scorta_minima")
            .single();

          if (error || !created?.id) {
            console.error("Errore insert prodotti:", error);

            const msg = [
              "Errore creazione prodotto.",
              error?.message ? `Dettaglio: ${error.message}` : "",
              error?.details ? `Details: ${error.details}` : "",
              error?.hint ? `Hint: ${error.hint}` : ""
           ].filter(Boolean).join("\n");

            setError(msg);
            return;
          }

          const label = (created.descrizione || created.nome || nome).trim();

          close();
          resolve({
            action: "created",
            prodotto: {
              id: created.id,
              descrizione: label,
              codice_interno: created.codice_interno || "",
              um: created.um || "",
              categoria_bilancio_id: created.categoria_bilancio_id ?? null
            }
          });
        } finally {
          btnSave.removeAttribute("disabled");
          btnSave.textContent = "Crea prodotto";
        }
      });
    });

    return result;
  }



  async function openEditProductModal({ prodottoId }) {
    ensureModalStyles();

    const { data: prod, error: errProd } = await window.supabaseClient
      .from("prodotti")
      .select("id, nome, descrizione, codice_interno, um, categoria_bilancio_id, categoria_interna_id")
      .eq("azienda_id", azienda.id)
      .eq("id", prodottoId)
      .single();

    if (errProd || !prod) {
      feedback.innerHTML = `<span style="color:red;">Errore caricamento prodotto</span>`;
      return null;
    }

    const modalRoot = document.createElement("div");
    modalRoot.className = "rf-modal-backdrop";
    modalRoot.innerHTML = `
      <div class="rf-modal" role="dialog" aria-modal="true">
        <div class="rf-modal-header">
          <div>
            <h3 class="rf-modal-title">Modifica prodotto</h3>
            <p class="rf-modal-sub">Aggiorna nome, codice interno e categorie.</p>
          </div>
          <button class="app-button tiny gray rf-modal-close" type="button">Chiudi</button>
        </div>
        <div class="rf-modal-body">
          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Nome</label>
            <input class="rf-input" id="rf-edit-nome" />
          </div>

          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Codice interno</label>
            <input class="rf-input" id="rf-edit-codice" placeholder="(opzionale se gestito da trigger)" />
          </div>

          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Unità di misura (UM)</label>
            <input class="rf-input" id="rf-edit-um" placeholder="pz, kg, lt..." />
          </div>

          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Categoria bilancio</label>
            <input class="rf-input" id="rf-edit-cat-bilancio-text" list="rf-edit-cat-bilancio-list" placeholder="Cerca categoria bilancio..." autocomplete="off" />
            <input type="hidden" id="rf-edit-cat-bilancio-id" value="" />
            <datalist id="rf-edit-cat-bilancio-list"></datalist>
          </div>

          <div class="rf-modal-row">
            <label class="acquisto-riga-label">Categoria interna</label>
            <input class="rf-input" id="rf-edit-cat-interna-text" list="rf-edit-cat-interna-list" placeholder="Cerca categoria interna..." autocomplete="off" />
            <input type="hidden" id="rf-edit-cat-interna-id" value="" />
            <datalist id="rf-edit-cat-interna-list"></datalist>
          </div>

          <div class="rf-modal-error" id="rf-edit-error"></div>
        </div>
        <div class="rf-modal-actions">
          <button class="app-button small gray rf-edit-cancel" type="button">Annulla</button>
          <button class="app-button small green rf-edit-save" type="button">Salva</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalRoot);

    const inputNome = modalRoot.querySelector("#rf-edit-nome");
    const inputCod = modalRoot.querySelector("#rf-edit-codice");
    const inputUm = modalRoot.querySelector("#rf-edit-um");

    const inputBilText = modalRoot.querySelector("#rf-edit-cat-bilancio-text");
    const hiddenBilId = modalRoot.querySelector("#rf-edit-cat-bilancio-id");
    const dlBil = modalRoot.querySelector("#rf-edit-cat-bilancio-list");

    const inputIntText = modalRoot.querySelector("#rf-edit-cat-interna-text");
    const hiddenIntId = modalRoot.querySelector("#rf-edit-cat-interna-id");
    const dlInt = modalRoot.querySelector("#rf-edit-cat-interna-list");

    const errEl = modalRoot.querySelector("#rf-edit-error");

    inputNome.value = (prod.descrizione || prod.nome || "").trim();
    inputCod.value = (prod.codice_interno || "").trim();
    inputUm.value = (prod.um || "").trim();

    const [catsBilancio, catsInterne] = await Promise.all([
      loadCategorieBilancio(),
      loadCategorieInterne()
    ]);

    const bilancioByLabel = new Map(
      (catsBilancio || []).map(c => [String(c.nome || "").trim().toLowerCase(), String(c.id)])
    );

    const interneLabels = (catsInterne || []).map(c => ({
      id: String(c.id),
      nome: String(c.nome || ""),
      sigla: String(c.sigla || ""),
      label: `${c.nome}${c.sigla ? ` · ${c.sigla}` : ""}`.trim()
    }));

    const internaByLabel = new Map(
      interneLabels.map(x => [x.label.toLowerCase(), x.id])
    );

    const internaByNome = new Map(
      interneLabels.map(x => [String(x.nome || "").trim().toLowerCase(), x.id])
    );

    dlBil.innerHTML = (catsBilancio || [])
      .map(c => `<option value="${escapeHtml(c.nome)}"></option>`)
      .join("");

    dlInt.innerHTML = interneLabels
      .map(x => `<option value="${escapeHtml(x.label)}"></option>`)
      .join("");

    // Pre-fill categorie if presenti
    const preBil = catsBilancio?.find(c => String(c.id) === String(prod.categoria_bilancio_id));
    if (preBil?.nome) {
      inputBilText.value = preBil.nome;
      hiddenBilId.value = String(preBil.id);
    }

    const preInt = interneLabels?.find(x => String(x.id) === String(prod.categoria_interna_id));
    if (preInt?.label) {
      inputIntText.value = preInt.label;
      hiddenIntId.value = String(preInt.id);
    }

    function setError(msg) {
      if (errEl) errEl.textContent = msg || "";
    }

    function close(res) {
      destroyModal(modalRoot);
      return res || null;
    }

    function syncBil() {
      const raw = String(inputBilText?.value || "").trim().toLowerCase();
      if (bilancioByLabel.has(raw)) {
        hiddenBilId.value = bilancioByLabel.get(raw);
        return;
      }
      const found = [...bilancioByLabel.entries()].find(([label]) => label.includes(raw));
      hiddenBilId.value = found ? found[1] : "";
    }

    function syncInt() {
      const raw = String(inputIntText?.value || "").trim().toLowerCase();
      if (internaByLabel.has(raw)) {
        hiddenIntId.value = internaByLabel.get(raw);
        return;
      }
      if (internaByNome.has(raw)) {
        hiddenIntId.value = internaByNome.get(raw);
        return;
      }
      const found = [...internaByLabel.entries()].find(([label]) => label.includes(raw));
      hiddenIntId.value = found ? found[1] : "";
    }

    inputBilText?.addEventListener("input", syncBil);
    inputBilText?.addEventListener("change", syncBil);
    inputIntText?.addEventListener("input", syncInt);
    inputIntText?.addEventListener("change", syncInt);

    modalRoot.addEventListener("click", (e) => {
      if (e.target === modalRoot) close(null);
    });

    modalRoot.querySelector(".rf-modal-close")?.addEventListener("click", () => close(null));
    modalRoot.querySelector(".rf-edit-cancel")?.addEventListener("click", () => close(null));

    return await new Promise((resolve) => {
      modalRoot.querySelector(".rf-edit-save")?.addEventListener("click", async () => {
        setError("");
        syncBil();
        syncInt();

        const nome = (inputNome?.value || "").trim();
        const codice = (inputCod?.value || "").trim();
        const um = (inputUm?.value || "").trim();

        const catBilId = (hiddenBilId?.value || "").trim();
        const catIntId = (hiddenIntId?.value || "").trim();

        if (!nome) return setError("Inserisci il nome.");

        if (!catBilId) return setError("Categoria bilancio obbligatoria.");
        if (!catIntId) return setError("Categoria interna obbligatoria.");

        const payload = {
          nome,
          descrizione: nome,
          um: um || null,
          codice_interno: codice || null,
          categoria_bilancio_id: Number(catBilId),
          categoria_interna_id: catIntId
        };

        const btnSave = modalRoot.querySelector(".rf-edit-save");
        btnSave?.setAttribute("disabled", "disabled");
        if (btnSave) btnSave.textContent = "Salvo...";

        try {
          const { error } = await window.supabaseClient
            .from("prodotti")
            .update(payload)
            .eq("azienda_id", azienda.id)
            .eq("id", prodottoId);

          if (error) {
            console.error(error);
            setError(error.message || "Errore salvataggio prodotto.");
            return;
          }

          resolve(close({ saved: true }));
        } finally {
          btnSave?.removeAttribute("disabled");
          if (btnSave) btnSave.textContent = "Salva";
        }
      });
    });
  }

  async function updateRowComputedUI(index) {
    const rowEl = righeContainer.querySelector(`div[data-i="${index}"]`);
    if (!rowEl) return;
    setRowStatus(rowEl, computeStatusFromRiga(righe[index]));
    setRowHint(rowEl, computeHintFromRiga(righe[index]));

    const btnCrea = rowEl.querySelector(".btn-crea-prodotto");
    const btnModifica = rowEl.querySelector(".btn-modifica-prodotto");
    if (btnCrea) btnCrea.style.display = righe[index].prodotto_id ? "none" : "";
    if (btnModifica) btnModifica.style.display = righe[index].prodotto_id ? "" : "none";

    const umEl = rowEl.querySelector(".riga-um");
    if (umEl) umEl.textContent = righe[index].um ? `UM: ${righe[index].um}` : "";
  }


function renderRigheUI() {
  righeContainer.innerHTML = righe.map((r, i) => `
    <div class="acquisto-riga-card ${computeStatusFromRiga(r)}" data-i="${i}">
      <div class="acquisto-riga-stack">
        <div class="acquisto-riga-top">
          <div>
            <label class="acquisto-riga-label">Descrizione (OCR)</label>
            <input class="input riga-descrizione" data-i="${i}" value="${escapeHtml(r.descrizione || "")}" />
          </div>

          <div class="acquisto-riga-grid2">
            <div>
              <label class="acquisto-riga-label">Quantità</label>
              <input type="number" step="0.001" class="input riga-quantita" data-i="${i}" value="${Number(r.quantita || 0)}" />
            </div>
            <div>
              <label class="acquisto-riga-label">Prezzo unit.</label>
              <input type="number" step="0.001" class="input riga-prezzo" data-i="${i}" value="${Number(r.prezzo_unitario || 0)}" />
            </div>
          </div>
        </div>

        <div style="position:relative;">
          <label class="acquisto-riga-label">Prodotto interno</label>
          <input
            class="input riga-prodotto-nome"
            data-i="${i}"
            value="${escapeHtml(r.prodotto_nome || "")}"
            autocomplete="off"
          />
          <input type="hidden" class="riga-prodotto-id" value="${escapeHtml(r.prodotto_id || "")}" />
          <div class="riga-um small-muted" style="margin-top:4px;">${r.um ? `UM: ${escapeHtml(r.um)}` : ""}</div>
          <div class="riga-hint small-muted acquisto-riga-hint"></div>
          <div class="prod-suggest"></div>
        </div>

        <div class="acquisto-riga-actions">
          <button class="app-button tiny gray btn-match-riga" data-i="${i}">Riprova match</button>
          <button class="app-button tiny gray btn-crea-prodotto" data-i="${i}">Crea prodotto</button>
          <button class="app-button tiny gray btn-modifica-prodotto" data-i="${i}">Modifica prodotto</button>
        </div>
      </div>
    </div>
  `).join("");

  righe.forEach((_, idx) => updateRowComputedUI(idx));
}
  
  async function uploadFilesAndGetSignedUrls(files) {
    const uploads = [];
    const paths = [];

    for (const file of files) {
      // Supporta immagini e PDF (conversione PDF gestita dal microservizio OCR)
      const mime = String(file?.type || "").toLowerCase();
      const isImage = mime.startsWith("image/");
      const isPdf = mime === "application/pdf";
      if (!isImage && !isPdf) {
        throw new Error("Formato non supportato: carica immagini (JPG/PNG/WEBP) o PDF.");
      }
      const cleanName = String(file.name || "fattura")
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w.-]/g, "");

      const path = `${azienda.id}/${new Date().getFullYear()}/${crypto.randomUUID()}_${cleanName}`;

      const { error: uploadError } = await window.supabaseClient.storage
        .from("fatture")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false
        });

      if (uploadError) {
        throw new Error("Upload fallito");
      }

      paths.push(path);

      const { data: signedData, error: signedError } =
        await window.supabaseClient.storage
          .from("fatture")
          .createSignedUrl(path, 60);

      if (signedError || !signedData?.signedUrl) {
        throw new Error("Errore signed URL");
      }

      uploads.push(signedData.signedUrl);
    }

    // salva nello state per coerenza
    window.state.fatturaCorrente.immagini = paths.map(p => ({ path: p }));
    allegatoPath = paths[0] || null;

    return uploads;
  }

  async function callOcrRailway(imageUrls) {
    const url = "https://ristoflo-ocr1-production.up.railway.app/ocr";

    const payload = {
      // compat: alcuni server accettano imageUrl singolo, altri imageUrls array
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [imageUrls].filter(Boolean),
      imageUrl: Array.isArray(imageUrls) ? (imageUrls[0] || null) : (imageUrls || null)
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const rawText = await res.text();
    let json = null;
    if (rawText) {
      try {
        json = JSON.parse(rawText);
      } catch (_) {
        json = null;
      }
    }

    if (!res.ok) {
      const msg = json?.error || json?.message || (rawText ? rawText.slice(0, 180) : `OCR error (${res.status})`);
      throw new Error(msg);
    }

    // compatibilità: alcuni server rispondono {success, ...} altri direttamente il payload
    if (json && typeof json === "object" && "success" in json) {
      if (!json.success) throw new Error(json.error || "OCR fallito");
      return json;
    }

    // fallback
    return { success: true, ...json };
  }

  // UX: unico pulsante → apre picker
  btnOcr?.addEventListener("click", () => {
    const fileInput = document.getElementById("fattura-file");
    fileInput?.click();
  });

  // Selezione file → upload + OCR automatico
  document.getElementById("fattura-file")?.addEventListener("change", async (e) => {
    const fileInput = e.target;
    if (!fileInput?.files || fileInput.files.length === 0) return;

    await loadProdottiCache(false);

    feedback.innerHTML = "Upload in corso...";

    try {
      const files = Array.from(fileInput.files || []);
      const signedUrls = await uploadFilesAndGetSignedUrls(files);

      feedback.innerHTML = "OCR in elaborazione...";
      const ocrResult = await callOcrRailway(signedUrls);

      await applyOcrResult(ocrResult);
      feedback.innerHTML = `<span style="color:green;">OCR completato. Verifica dati.</span>`;
    } catch (err) {
      feedback.innerHTML = `<span style="color:red;">${escapeHtml(err?.message || "OCR fallito")}</span>`;
    } finally {
      // reset input per permettere stesso file due volte
      fileInput.value = "";
    }
  });


  function dedupeRighe(rows) {
    const seen = new Set();
    const out = [];

    for (const r of rows || []) {
      const desc = normalizeKey(r.descrizione || "");
      const q = roundTo3(Number(r.quantita || 0));
      const pu = roundTo3(Number(r.prezzo_unitario || 0));
      const tot = roundTo3(q * pu);

      const key = `${desc}|${q}|${pu}|${tot}`;
      if (!desc && q === 0 && pu === 0) continue;

      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }

    return out;
  }

async function applyOcrResult(result) {
    await loadProdottiCache(false);

    if (result.documento?.numero_documento)
      document.getElementById("fattura-numero").value =
        result.documento.numero_documento;

    if (result.documento?.data_documento)
      document.getElementById("fattura-data").value =
        result.documento.data_documento;

    if (result.fornitore?.ragione_sociale) {
      const nome = (result.fornitore.ragione_sociale || "").trim();
      if (inputFornitore) inputFornitore.value = nome;

      const match = findFornitoreByRagioneSociale(nome);
      if (match?.id) {
        if (hiddenFornitoreId) hiddenFornitoreId.value = String(match.id);
      } else {
        if (hiddenFornitoreId) hiddenFornitoreId.value = "";
      }
    }

    righe.length = 0;
    window.state.fatturaCorrente.righe = righe;
    righeContainer.innerHTML = "";

    let righeInput = (result.righe || []).map(r => {
      const descr = cleanOcrDescrizione(r.descrizione || "");
      const qta = parseLocaleNumber(r.quantita, 0);
      const prezzoUnitRaw = parseLocaleNumber(r.prezzo_unitario, 0);
      const totaleRiga = extractOcrLineTotal(r);

      const prezzoUnit = (totaleRiga && qta > 0)
        ? roundTo3(totaleRiga / qta)
        : roundTo3(prezzoUnitRaw);

      return {
        descrizione: descr,
        quantita: qta,
        prezzo_unitario: prezzoUnit,
        prodotto_id: null,
        prodotto_nome: "",
        um: "",
        match_reason: null,
        match_score: null
      };
    });

    righeInput = dedupeRighe(righeInput);

    for (let i = 0; i < righeInput.length; i++) {
      const descr = righeInput[i].descrizione;
      if (!descr) {
        righe.push(righeInput[i]);
        continue;
      }

      const cachedExact = findProdottoInCacheByDescrizione(descr);
      if (cachedExact?.id) {
        righeInput[i].prodotto_id = cachedExact.id;
        righeInput[i].prodotto_nome = cachedExact.descrizione;
        righeInput[i].um = cachedExact.um || "";
        righeInput[i].match_reason = "match_cache";
        righeInput[i].match_score = 0.80;
        righe.push(righeInput[i]);
        continue;
      }

      const match = await matchRigaToProdotto(descr);
      if (match?.prodotto_id) {
        righeInput[i].prodotto_id = match.prodotto_id;
        righeInput[i].match_reason = match.reason;
        righeInput[i].match_score = match.score;

        const nomeProd = await loadProdottoNomeById(match.prodotto_id);
        righeInput[i].prodotto_nome = nomeProd || "";

        const cached = prodottiCache.find(p => p.id === match.prodotto_id);
        righeInput[i].um = cached?.um || "";
      }

      righe.push(righeInput[i]);
    }

    renderRigheUI();
  }

  btnAddRiga.addEventListener("click", async () => {
    await loadProdottiCache(false);

    const index = righe.length;
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
    updateRowComputedUI(index);
  });

  righeContainer.addEventListener("input", async (e) => {
    const i = e.target?.dataset?.i;
    if (i === undefined) return;
    const idx = Number(i);

    if (!righe[idx]) return;

    if (e.target.classList.contains("riga-descrizione")) {
      righe[idx].descrizione = e.target.value;

      const key = `desc_${idx}`;
      if (debounceTimers.has(key)) clearTimeout(debounceTimers.get(key));
      debounceTimers.set(key, setTimeout(async () => {
        await updateRowComputedUI(idx);
      }, 250));
    }

    if (e.target.classList.contains("riga-quantita")) {
      righe[idx].quantita = Number(e.target.value || 0);
      await updateRowComputedUI(idx);
    }

    if (e.target.classList.contains("riga-prezzo")) {
      righe[idx].prezzo_unitario = Number(e.target.value || 0);
      await updateRowComputedUI(idx);
    }

    if (e.target.classList.contains("riga-prodotto-nome")) {
      await loadProdottiCache(false);

      const q = e.target.value || "";
      righe[idx].prodotto_nome = q;

      const byCod = findProdottoInCacheByCodice(q);
      if (byCod?.id) {
        await selectProdottoForRow(idx, byCod);
        return;
      }

      const foundExact = findProdottoInCacheByDescrizione(q);
      if (foundExact?.id) {
        await selectProdottoForRow(idx, foundExact);
        return;
      }

      const query = q.trim();
      if (query.length >= 2) {
        const items = filterProdottiForSuggest(query, 12);
        closeAllSuggest();
        openSuggestForIndex(idx, items);
      } else {
        closeAllSuggest();
      }

      righe[idx].prodotto_id = null;
      righe[idx].match_reason = null;
      righe[idx].match_score = null;
      righe[idx].um = "";

      await updateRowComputedUI(idx);
    }
  });

  righeContainer.addEventListener("click", async (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement)) return;

    if (el.classList.contains("suggest-item") && el.closest(".prod-suggest")) {
      const rowEl = el.closest("div[data-i]");
      const idx = rowEl ? Number(rowEl.dataset.i) : NaN;
      if (!Number.isFinite(idx)) return;

      const prodId = el.getAttribute("data-prod-id");
      if (!prodId) return;

      await loadProdottiCache(false);
      const prodotto = prodottiCache.find(p => String(p.id) === String(prodId));
      if (prodotto) {
        await selectProdottoForRow(idx, prodotto);
      }
      return;
    }

    const btn = el;
    const i = btn.dataset?.i;
    if (i === undefined) return;
    const idx = Number(i);
    if (!righe[idx]) return;

    if (btn.classList.contains("btn-match-riga")) {
      await loadProdottiCache(false);
      const descr = righe[idx].descrizione || righe[idx].prodotto_nome || "";
      if (!descr) return;

      btn.setAttribute("disabled", "disabled");
      btn.textContent = "Matching...";
      try {
        const match = await matchRigaToProdotto(descr);
        if (match?.prodotto_id) {
          righe[idx].prodotto_id = match.prodotto_id;
          righe[idx].match_reason = match.reason;
          righe[idx].match_score = match.score;
          righe[idx].prodotto_nome = await loadProdottoNomeById(match.prodotto_id);

          const cached = prodottiCache.find(p => p.id === match.prodotto_id);
          righe[idx].um = cached?.um || "";

          const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
          const inpProd = rowEl?.querySelector(".riga-prodotto-nome");
          const hidId = rowEl?.querySelector(".riga-prodotto-id");
          if (inpProd && righe[idx].prodotto_nome) inpProd.value = righe[idx].prodotto_nome;
          if (hidId) hidId.value = righe[idx].prodotto_id || "";
        } else {
          righe[idx].prodotto_id = null;
          righe[idx].match_reason = null;
          righe[idx].match_score = null;
          righe[idx].um = "";
        }
        await updateRowComputedUI(idx);
      } finally {
        btn.removeAttribute("disabled");
        btn.textContent = "Riprova match";
      }
    }

    if (btn.classList.contains("btn-crea-prodotto")) {
      await loadProdottiCache(false);

      const nome = (righe[idx].prodotto_nome || righe[idx].descrizione || "").trim();
      if (!nome) return;

      btn.setAttribute("disabled", "disabled");
      btn.textContent = "Apro...";

      try {
        const res = await openCreateProductModal({ prefillName: nome });

        if (!res) return;

        if (res.action === "use_existing" && res.prodotto?.id) {
          await selectProdottoForRow(idx, res.prodotto);
          feedback.innerHTML = `<span style="color:green;">Prodotto esistente agganciato alla riga.</span>`;
          return;
        }

        if (res.action === "created" && res.prodotto?.id) {
          prodottiCache.unshift({
            id: res.prodotto.id,
            descrizione: res.prodotto.descrizione || nome,
            codice_interno: res.prodotto.codice_interno || "",
            um: res.prodotto.um || "",
            categoria_bilancio_id: res.prodotto.categoria_bilancio_id ?? null
          });

          await loadProdottiCache(true);

          righe[idx].prodotto_id = res.prodotto.id;
          righe[idx].prodotto_nome = res.prodotto.descrizione || nome;
          righe[idx].um = res.prodotto.um || "";
          righe[idx].match_reason = "created";
          righe[idx].match_score = 0.80;

          righe[idx].match_reason = "manual_select";
          righe[idx].match_score = 0.75;

          await updateRowComputedUI(idx);

          const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
          const inpProd = rowEl?.querySelector(".riga-prodotto-nome");
          const hidId = rowEl?.querySelector(".riga-prodotto-id");
          if (inpProd) inpProd.value = righe[idx].prodotto_nome;
          if (hidId) hidId.value = righe[idx].prodotto_id || "";

          feedback.innerHTML = `<span style="color:green;">Prodotto creato e agganciato alla riga.</span>`;
        }
      } finally {
        btn.removeAttribute("disabled");
        btn.textContent = "Crea prodotto";
      }
    }

    if (btn.classList.contains("btn-modifica-prodotto")) {
      await loadProdottiCache(false);

      const prodottoId = righe[idx].prodotto_id;
      if (!prodottoId) return;

      btn.setAttribute("disabled", "disabled");
      btn.textContent = "Apro...";

      try {
        const res = await openEditProductModal({ prodottoId });
        if (!res) return;

        await loadProdottiCache(true);

        // Aggiorna label riga dal cache
        const updated = prodottiCache.find(p => String(p.id) === String(prodottoId));
        if (updated?.descrizione) {
          righe[idx].prodotto_nome = updated.descrizione;
          const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
          const inpProd = rowEl?.querySelector(".riga-prodotto-nome");
          if (inpProd) inpProd.value = righe[idx].prodotto_nome;
        }

        feedback.innerHTML = `<span style="color:green;">Prodotto aggiornato.</span>`;
        await updateRowComputedUI(idx);
      } finally {
        btn.removeAttribute("disabled");
        btn.textContent = "Modifica prodotto";
      }
    }
  });

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!righeContainer.contains(t)) return;
    if (t.classList.contains("riga-prodotto-nome")) return;
    if (t.closest(".prod-suggest")) return;
    closeAllSuggest();
  });


  btnSalva.addEventListener("click", async () => {
    feedback.innerHTML = "Salvataggio...";

    try {
      await loadProdottiCache(false);

      syncFornitoreHiddenFromInput();

      let fornitoreId = getCurrentFornitoreId();
      const fornitoreNome = getCurrentFornitoreName();

      // --- Fornitore (crea se non esiste) ---
      if (!fornitoreId) {
        if (!fornitoreNome) throw new Error("Seleziona o scrivi un fornitore");

        const existing = findFornitoreByRagioneSociale(fornitoreNome);
        if (existing?.id) {
          fornitoreId = String(existing.id);
          if (hiddenFornitoreId) hiddenFornitoreId.value = fornitoreId;
        } else {
          const { data: createdForn, error: errCreateForn } = await window.supabaseClient
            .from("fornitori")
            .insert({
              azienda_id: azienda.id,
              ragione_sociale: fornitoreNome,
              attivo: true
            })
            .select("id, ragione_sociale")
            .single();

          if (errCreateForn || !createdForn?.id) {
            throw new Error("Errore creazione fornitore");
          }

          fornitoreId = String(createdForn.id);
          if (hiddenFornitoreId) hiddenFornitoreId.value = fornitoreId;

          if (Array.isArray(fornitori)) {
            fornitori.unshift({ id: createdForn.id, ragione_sociale: createdForn.ragione_sociale });
          }
        }
      }

      // --- Normalizzazione righe: consideriamo SOLO righe realmente valide (qta > 0 + descrizione) ---
      const righeAttive = [];
      const mapIndexOriginale = []; // idx originale di "righe" per evidenziare correttamente

      // reset highlight precedente
      righeContainer.querySelectorAll(".acquisto-riga-card.missing").forEach(el => el.classList.remove("missing"));

      for (let i = 0; i < righe.length; i++) {
        const r = righe[i] || {};
        const descr = String(r.descrizione || "").trim();
        const qta = Number(r.quantita || 0);

        if (!(qta > 0)) continue;
        if (!descr) continue;

        // Risolvi prodotto_id anche se l'utente ha solo scritto il nome/codice senza selezionare la suggestion
        let prodottoId = r.prodotto_id || null;

        if (!prodottoId) {
          const nomeInserito = String(r.prodotto_nome || "").trim();
          if (nomeInserito) {
            const byCod = findProdottoInCacheByCodice(nomeInserito);
            const byDesc = findProdottoInCacheByDescrizione(nomeInserito);
            const found = byCod || byDesc;

            if (found?.id) {
              prodottoId = found.id;

              // sync nello state per coerenza UI ↔ state
              r.prodotto_id = found.id;
              r.prodotto_nome = found.descrizione || nomeInserito;
              r.um = found.um || r.um || "";
              r.match_reason = r.match_reason || "match_cache";
              r.match_score = r.match_score ?? 0.80;
            }
          }
        }

        righeAttive.push({
          descrizione: descr,
          prodotto_id: prodottoId,
          quantita: qta,
          prezzo_unitario: Number(r.prezzo_unitario || 0)
        });
        mapIndexOriginale.push(i);
      }

      if (righeAttive.length === 0) throw new Error("Inserisci almeno una riga valida (descrizione + quantità > 0)");

      // --- Evidenzia righe senza prodotto (validazione assistita) --- (validazione assistita) ---
      let firstMissingIdx = null;
      for (let j = 0; j < righeAttive.length; j++) {
        if (!righeAttive[j].prodotto_id) {
          const idxOrig = mapIndexOriginale[j];
          const rowEl = righeContainer.querySelector(`div[data-i="${idxOrig}"]`);
          if (rowEl) rowEl.classList.add("missing");
          if (firstMissingIdx === null) firstMissingIdx = idxOrig;
        }
      }

      if (firstMissingIdx !== null) {
        const rowEl = righeContainer.querySelector(`div[data-i="${firstMissingIdx}"]`);
        rowEl?.scrollIntoView({ behavior: "smooth", block: "center" });
        throw new Error("Ci sono righe senza prodotto: seleziona un prodotto o crea il prodotto.");
      }

      // --- Salva fattura PRIMA delle righe ---
      const { data: fattura, error: errInsFattura } = await window.supabaseClient
        .from("fatture_acquisto")
        .insert({
          azienda_id: azienda.id,
          fornitore_id: Number(fornitoreId),
          numero_documento: document.getElementById("fattura-numero").value,
          data_documento: document.getElementById("fattura-data").value,
          origine: mode,
          stato_elaborazione: mode === "manuale" ? "confermata" : "da_verificare",
          allegato_path: allegatoPath
        })
        .select()
        .single();

      if (errInsFattura || !fattura?.id) throw new Error("Errore salvataggio fattura");

      // --- Costruisci payload righe ---
      const righeDaInserire = [];
      for (let k = 0; k < righeAttive.length; k++) {
        const r = righeAttive[k];
        const catId = await getCategoriaBilancioIdForProdotto(r.prodotto_id);

        if (!catId) {
          throw new Error(
            `Prodotto senza categoria bilancio: "${r.descrizione}". Apri il prodotto e assegna la categoria bilancio, oppure crea un nuovo prodotto con categoria.`
          );
        }

        righeDaInserire.push({
          azienda_id: azienda.id,
          fattura_id: fattura.id,
          riga_numero: k + 1,
          prodotto_id: toBigintNumber(r.prodotto_id),
          descrizione: r.descrizione,
          quantita: r.quantita,
          unita_misura: "pz",
          prezzo_unitario: r.prezzo_unitario || 0,
          totale_riga: r.quantita * (r.prezzo_unitario || 0),
          iva_percent: null,
          categoria_bilancio_id: Number(catId)
        });
      }

      const { error: errRighe } = await window.supabaseClient
        .from("fatture_acquisto_righe")
        .insert(righeDaInserire);

      if (errRighe) throw new Error("Errore salvataggio righe fattura");

      // --- Processazione ---
      const { error: errProc } = await window.supabaseClient.rpc("processa_fattura_acquisto", {
        p_azienda_id: azienda.id,
        p_fattura_id: fattura.id
      });

      if (errProc) throw new Error("Errore processa_fattura_acquisto");

      feedback.innerHTML = "<span style='color:green;'>Fattura salvata e processata.</span>";
    } catch (err) {
      feedback.innerHTML = "<span style='color:red;'>" + escapeHtml(err?.message || "Errore") + "</span>";
    }
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
