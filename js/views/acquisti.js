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

    <div class="form-grid">
      <div class="form-group">
        <label>Fornitore</label>
        <select id="fattura-fornitore" class="input">
          <option value="">Seleziona fornitore</option>
          ${(fornitori || []).map(f =>
            `<option value="${f.id}">${escapeHtml(f.ragione_sociale)}</option>`
          ).join("")}
        </select>
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
  const selectFornitore = document.getElementById("fattura-fornitore");

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

  async function loadProdottiCache(force = false) {
    const now = Date.now();
    if (!force && prodottiCache.length > 0 && (now - prodottiCacheLastLoad) < 60_000) return;

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, descrizione, codice_interno, um")
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .order("descrizione", { ascending: true })
      .limit(2000);

    if (error) return;

    prodottiCache = (data || []).map(p => ({
      id: p.id,
      descrizione: p.descrizione || "",
      codice_interno: p.codice_interno || "",
      um: p.um || ""
    }));
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

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeText(str) {
    return String(str || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function setRowStatus(rowEl, status) {
    rowEl.classList.remove("ok", "partial", "missing");
    if (status) rowEl.classList.add(status);
  }

  function setRowHint(rowEl, text) {
    const hint = rowEl.querySelector(".riga-hint");
    if (hint) hint.textContent = text || "";
  }

  function getCurrentFornitoreId() {
    return (selectFornitore?.value || "").trim() || null;
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
      .select("id, descrizione")
      .eq("azienda_id", azienda.id)
      .ilike("descrizione", `%${q}%`)
      .order("descrizione", { ascending: true })
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

    try {
      const { data, error } = await window.supabaseClient.rpc("match_prodotto_fuzzy", {
        p_azienda_id: azienda.id,
        p_query: q
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
      .select("id, descrizione")
      .eq("azienda_id", azienda.id)
      .eq("id", id)
      .single();

    if (error || !data) return "";
    return data.descrizione || "";
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
    await updateRowComputedUI(idx);
  }

  function renderRigheUI() {
    righeContainer.innerHTML = "";

    righe.forEach((r, index) => {
     const row = document.createElement("div");
row.className = "card acquisto-riga-card";
row.dataset.i = String(index);

      setRowStatus(row, computeStatusFromRiga(r));

      const descrizioneVal = escapeHtml(r.descrizione || "");
      const prodottoNomeVal = escapeHtml(r.prodotto_nome || "");
      const quantitaVal = Number.isFinite(r.quantita) ? r.quantita : (r.quantita || 0);
      const prezzoVal = Number.isFinite(r.prezzo_unitario) ? r.prezzo_unitario : (r.prezzo_unitario || 0);

      row.innerHTML = `
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <div style="flex: 1 1 260px;">
            <label style="display:block; font-size:12px; margin-bottom:4px; color:#6b7280;">Descrizione (modificabile)</label>
            <input type="text"
              value="${descrizioneVal}"
              class="input-pill riga-descrizione"
              data-i="${index}" />
          </div>

          <div style="flex: 1 1 260px; position:relative;">
            <label style="display:block; font-size:12px; margin-bottom:4px; color:#6b7280;">Prodotto (autocomplete)</label>

            <input type="text"
              value="${prodottoNomeVal}"
              list="prodotti-suggestions"
              placeholder="Cerca o scrivi prodotto..."
              class="input-pill riga-prodotto-nome"
              data-i="${index}"
              autocomplete="off" />

            <div class="prod-suggest suggest-list" style="display:none; position:absolute; left:0; right:0; top:62px; z-index:50;"></div>

            <input type="hidden" class="riga-prodotto-id" data-i="${index}" value="${escapeHtml(r.prodotto_id || "")}" />

            <div class="small-muted riga-um" style="margin-top:6px;">
              ${r.um ? `UM: ${escapeHtml(r.um)}` : ""}
            </div>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
          <div style="flex: 0 0 160px;">
            <label style="display:block; font-size:12px; margin-bottom:4px; color:#6b7280;">Quantità</label>
            <input type="number"
              step="0.001"
              value="${escapeHtml(quantitaVal)}"
              class="input-pill riga-quantita"
              data-i="${index}" />
          </div>

          <div style="flex: 0 0 160px;">
            <label style="display:block; font-size:12px; margin-bottom:4px; color:#6b7280;">Costo unitario</label>
            <input type="number"
              step="0.0001"
              value="${escapeHtml(prezzoVal)}"
              class="input-pill riga-prezzo"
              data-i="${index}" />
          </div>

          <div style="flex: 1 1 240px; display:flex; align-items:flex-end; gap:8px; flex-wrap:wrap;">
            <button type="button"
              class="app-button tiny gray btn-match-riga"
              data-i="${index}"
              title="Riprova matching automatico sulla descrizione">
              Riprova match
            </button>

            <button type="button"
              class="app-button tiny green btn-crea-prodotto"
              data-i="${index}"
              style="${r.prodotto_id ? "display:none;" : ""}"
              title="Crea un nuovo prodotto con questo nome e aggancia la riga">
              Crea prodotto
            </button>

            <button type="button"
              class="app-button tiny gray btn-rinomina-prodotto"
              data-i="${index}"
              style="${r.prodotto_id ? "" : "display:none;"}"
              title="Rinomina il prodotto selezionato usando il nome scritto nel campo Prodotto">
              Rinomina prodotto
            </button>
          </div>
        </div>

        <small class="riga-hint" style="display:block; margin-top:8px; color:#6b7280;"></small>
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

    const btnCrea = rowEl.querySelector(".btn-crea-prodotto");
    const btnRinomina = rowEl.querySelector(".btn-rinomina-prodotto");
    if (btnCrea) btnCrea.style.display = righe[index].prodotto_id ? "none" : "";
    if (btnRinomina) btnRinomina.style.display = righe[index].prodotto_id ? "" : "none";

    const umEl = rowEl.querySelector(".riga-um");
    if (umEl) umEl.textContent = righe[index].um ? `UM: ${righe[index].um}` : "";
  }

  btnOcr?.addEventListener("click", async () => {
    const fileInput = document.getElementById("fattura-file");
    if (!fileInput.files.length) return;

    await loadProdottiCache(false);

    const file = fileInput.files[0];
    const path = `${azienda.id}/${new Date().getFullYear()}/${crypto.randomUUID()}_${file.name}`;

    feedback.innerHTML = "Upload in corso...";

    const { error: uploadError } = await window.supabaseClient.storage
      .from("fatture-acquisto")
      .upload(path, file);

    if (uploadError) {
      feedback.innerHTML = `<span style="color:red;">Upload fallito</span>`;
      return;
    }

    allegatoPath = path;

    const { data: signedData, error: signedError } =
      await window.supabaseClient.storage
        .from("fatture-acquisto")
        .createSignedUrl(path, 60);

    if (signedError) {
      feedback.innerHTML = `<span style="color:red;">Errore signed URL</span>`;
      return;
    }

    feedback.innerHTML = "OCR in elaborazione...";

    const { data: ocrResult, error: ocrError } =
      await window.supabaseClient.functions.invoke("ocr-fattura", {
        body: { imageUrl: signedData.signedUrl }
      });

    if (ocrError || !ocrResult?.success) {
      feedback.innerHTML = `<span style="color:red;">OCR fallito</span>`;
      return;
    }

    await applyOcrResult(ocrResult);
    feedback.innerHTML = `<span style="color:green;">OCR completato. Verifica dati.</span>`;
  });

  async function applyOcrResult(result) {
    await loadProdottiCache(false);

    if (result.documento?.numero_documento)
      document.getElementById("fattura-numero").value =
        result.documento.numero_documento;

    if (result.documento?.data_documento)
      document.getElementById("fattura-data").value =
        result.documento.data_documento;

    if (result.fornitore?.ragione_sociale) {
      const nome = result.fornitore.ragione_sociale.toLowerCase();
      const match = (fornitori || []).find(f =>
        (f.ragione_sociale || "").toLowerCase().includes(nome)
      );
      if (match)
        document.getElementById("fattura-fornitore").value = match.id;
    }

    righe = [];
    righeContainer.innerHTML = "";

    const righeInput = (result.righe || []).map(r => ({
      descrizione: (r.descrizione || "").trim(),
      quantita: Number(r.quantita || 0),
      prezzo_unitario: Number(r.prezzo_unitario || 0),
      prodotto_id: null,
      prodotto_nome: "",
      um: "",
      match_reason: null,
      match_score: null
    }));

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
      const prodotto = prodottiCache.find(p => p.id === prodId);
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
      btn.textContent = "Creo...";

      try {
        const { data: created, error } = await window.supabaseClient
          .from("prodotti")
          .insert({
            azienda_id: azienda.id,
            descrizione: nome,
            attivo: true
          })
          .select("id, descrizione, codice_interno, um")
          .single();

        if (error || !created?.id) {
          feedback.innerHTML = `<span style="color:red;">Errore creazione prodotto</span>`;
          return;
        }

        prodottiCache.unshift({
          id: created.id,
          descrizione: created.descrizione || nome,
          codice_interno: created.codice_interno || "",
          um: created.um || ""
        });

        await loadProdottiCache(true);

        righe[idx].prodotto_id = created.id;
        righe[idx].prodotto_nome = created.descrizione || nome;
        righe[idx].um = created.um || "";
        righe[idx].match_reason = "created";
        righe[idx].match_score = 0.80;

        await updateRowComputedUI(idx);

        const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
        const inpProd = rowEl?.querySelector(".riga-prodotto-nome");
        const hidId = rowEl?.querySelector(".riga-prodotto-id");
        if (inpProd) inpProd.value = righe[idx].prodotto_nome;
        if (hidId) hidId.value = righe[idx].prodotto_id || "";

        feedback.innerHTML = `<span style="color:green;">Prodotto creato e agganciato alla riga.</span>`;
      } finally {
        btn.removeAttribute("disabled");
        btn.textContent = "Crea prodotto";
      }
    }

    if (btn.classList.contains("btn-rinomina-prodotto")) {
      await loadProdottiCache(false);

      const prodottoId = righe[idx].prodotto_id;
      const nuovoNome = (righe[idx].prodotto_nome || "").trim();
      if (!prodottoId || !nuovoNome) return;

      btn.setAttribute("disabled", "disabled");
      btn.textContent = "Rinomino...";

      try {
        const { error } = await window.supabaseClient
          .from("prodotti")
          .update({ descrizione: nuovoNome })
          .eq("azienda_id", azienda.id)
          .eq("id", prodottoId);

        if (error) {
          feedback.innerHTML = `<span style="color:red;">Errore rinomina prodotto</span>`;
          return;
        }

        const p = prodottiCache.find(x => x.id === prodottoId);
        if (p) p.descrizione = nuovoNome;
        else prodottiCache.unshift({ id: prodottoId, descrizione: nuovoNome, codice_interno: "", um: "" });

        await loadProdottiCache(true);

        righe[idx].match_reason = righe[idx].match_reason || "manual_rename";
        righe[idx].match_score = righe[idx].match_score ?? 0.70;

        await updateRowComputedUI(idx);

        feedback.innerHTML = `<span style="color:green;">Prodotto rinominato.</span>`;
      } finally {
        btn.removeAttribute("disabled");
        btn.textContent = "Rinomina prodotto";
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

  selectFornitore?.addEventListener("change", async () => {
    await loadProdottiCache(false);
    righe.forEach((_, idx) => updateRowComputedUI(idx));
  });

  btnSalva.addEventListener("click", async () => {
    feedback.innerHTML = "Salvataggio...";

    try {
      await loadProdottiCache(false);

      const fornitoreId = document.getElementById("fattura-fornitore").value;
      if (!fornitoreId) throw new Error("Seleziona fornitore");

      const righePulite = righe
        .map(r => ({
          descrizione: (r.descrizione || "").trim(),
          prodotto_id: r.prodotto_id || null,
          quantita: Number(r.quantita || 0),
          prezzo_unitario: Number(r.prezzo_unitario || 0)
        }))
        .filter(r => r.quantita && r.quantita > 0);

      if (righePulite.length === 0) throw new Error("Inserisci almeno una riga con quantità > 0");

      const righeNonValide = righePulite.filter(r => !r.prodotto_id);
      if (righeNonValide.length > 0) {
        throw new Error("Ci sono righe senza prodotto: seleziona un prodotto (autocomplete) o crea il prodotto.");
      }

      const { data: fattura, error: errInsFattura } = await window.supabaseClient
        .from("fatture_acquisto")
        .insert({
          azienda_id: azienda.id,
          fornitore_id: fornitoreId,
          numero_documento: document.getElementById("fattura-numero").value,
          data_documento: document.getElementById("fattura-data").value,
          origine: mode,
          stato_elaborazione: mode === "manuale" ? "confermata" : "da_verificare",
          allegato_path: allegatoPath
        })
        .select()
        .single();

      if (errInsFattura) throw new Error("Errore salvataggio fattura");

      if (righePulite.length > 0) {
        const { error: errRighe } = await window.supabaseClient
          .from("fatture_acquisto_righe")
          .insert(righePulite.map(r => ({
            azienda_id: azienda.id,
            fattura_id: fattura.id,
            prodotto_id: r.prodotto_id,
            quantita: r.quantita,
            prezzo_unitario: r.prezzo_unitario || 0
          })));

        if (errRighe) throw new Error("Errore salvataggio righe fattura");
      }

      const { error: errProc } = await window.supabaseClient.rpc("processa_fattura_acquisto", {
        p_azienda_id: azienda.id,
        p_fattura_id: fattura.id
      });

      if (errProc) throw new Error("Errore processa_fattura_acquisto");

      feedback.innerHTML = "<span style='color:green;'>Fattura salvata e processata.</span>";
    } catch (err) {
      feedback.innerHTML = "<span style='color:red;'>" + (err?.message || "Errore") + "</span>";
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
