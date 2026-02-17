// views/acquisti.js
import "../supabaseClient.js";
import "../state.js";

export async function render(container) {
  const azienda = window.state.azienda;

  if (!azienda) {
    container.innerHTML = `<div class="view"><h3>Nessuna azienda attiva</h3></div>`;
    return;
  }

 container.innerHTML = `
  <div class="view">

    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
      <button class="app-button tiny gray" id="btn-back-dashboard">
        ← Dashboard
      </button>
    </div>

    <h2>Modulo Acquisti</h2>
    document
  .getElementById("btn-back-dashboard")
  .addEventListener("click", () => {
    window.location.hash = "#/home";
  });



      <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
        <button class="app-button tiny tab-btn active" data-tab="fatture">Fatture</button>
        <button class="app-button tiny tab-btn" data-tab="fornitori">Fornitori</button>
        <button class="app-button tiny tab-btn" data-tab="ordini">Ordini</button>
        <button class="app-button tiny tab-btn" data-tab="riordino">Riordino</button>
      </div>

      <div id="acquisti-content"></div>
    </div>
  `;

  const content = document.getElementById("acquisti-content");
  const tabButtons = document.querySelectorAll(".tab-btn");

  function setActiveTab(tab) {
    tabButtons.forEach(btn => {
      btn.classList.remove("active");
      if (btn.dataset.tab === tab) btn.classList.add("active");
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
    <h3>Nuova Fattura</h3>

    <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
      <button class="app-button tiny mode-btn active" data-mode="manuale">Manuale</button>
      <button class="app-button tiny mode-btn" data-mode="ocr">Carica Foto (OCR)</button>
      <button class="app-button tiny mode-btn" data-mode="import_api">Import API</button>
    </div>

    <div id="ocr-upload-section" style="display:none; margin-bottom:16px;">
      <label>Carica immagine fattura</label>
      <input type="file" id="fattura-file" accept="image/*,.pdf" class="input-pill"/>
      <button id="btn-esegui-ocr" class="app-button small gray" style="margin-top:8px;">
        Esegui OCR
      </button>
    </div>

    <label>Fornitore</label>
    <select id="fattura-fornitore" class="input-pill">
      <option value="">Seleziona fornitore</option>
      ${(fornitori || []).map(f =>
        `<option value="${f.id}">${f.ragione_sociale}</option>`
      ).join("")}
    </select>

    <label>Numero</label>
    <input id="fattura-numero" class="input-pill" />

    <label>Data</label>
    <input id="fattura-data" type="date" class="input-pill" />

    <div style="margin-top:14px;">
      <small style="display:block; margin-bottom:6px; color:#6b7280;">
        Suggerimento: righe <span style="font-weight:700;">verdi</span> = match forte, <span style="font-weight:700;">gialle</span> = verifica, <span style="font-weight:700;">rosse</span> = manca prodotto.
      </small>
    </div>

    <div id="righe-container" style="margin-top:10px;"></div>

    <datalist id="prodotti-suggestions"></datalist>

    <button id="btn-add-riga" class="app-button small gray">
      + Riga
    </button>

    <hr style="margin:16px 0;" />

    <button id="btn-salva-fattura" class="app-button small green">
      Salva e Processa
    </button>

    <div id="fattura-feedback" style="margin-top:10px;"></div>
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

  // Cache prodotti per datalist/autocomplete (light)
  let prodottiCache = [];
  let prodottiCacheLastLoad = 0;

  // Debounce map per input
  const debounceTimers = new Map();

  /* ================= MODE SWITCH ================= */

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      mode = btn.dataset.mode;
      ocrSection.style.display = mode === "ocr" ? "block" : "none";
    });
  });

  /* ================= PRODOTTI CACHE ================= */

  async function loadProdottiCache(force = false) {
    const now = Date.now();
    if (!force && prodottiCache.length > 0 && (now - prodottiCacheLastLoad) < 60_000) return;

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, descrizione")
      .eq("azienda_id", azienda.id)
      .order("descrizione", { ascending: true })
      .limit(500);

    if (error) return;

    prodottiCache = (data || []).map(p => ({
      id: p.id,
      descrizione: p.descrizione || ""
    }));
    prodottiCacheLastLoad = now;

    // Datalist: usiamo solo descrizione (mostra testo), id lo gestiamo con mapping sotto
    datalistProdotti.innerHTML = prodottiCache
      .filter(p => p.descrizione)
      .slice(0, 500)
      .map(p => `<option value="${escapeHtml(p.descrizione)}"></option>`)
      .join("");
  }

  function findProdottoInCacheByDescrizione(nome) {
    const n = (nome || "").trim().toLowerCase();
    if (!n) return null;
    return prodottiCache.find(p => (p.descrizione || "").trim().toLowerCase() === n) || null;
  }

  /* ================= UTIL ================= */

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
    // status: ok | partial | missing
    rowEl.classList.remove("ok", "partial", "missing");
    if (status) rowEl.classList.add(status);
    rowEl.style.borderRadius = "14px";
    rowEl.style.padding = "10px";
    rowEl.style.boxShadow = "0 6px 18px rgba(15, 23, 42, 0.12)";
  }

  function setRowHint(rowEl, text) {
    const hint = rowEl.querySelector(".riga-hint");
    if (hint) hint.textContent = text || "";
  }

  function getCurrentFornitoreId() {
    return (selectFornitore?.value || "").trim() || null;
  }

  function isStrongMatch(score) {
    // soglia "forte"
    return typeof score === "number" && score >= 0.72;
  }

  function isWeakMatch(score) {
    // soglia "debole"
    return typeof score === "number" && score >= 0.50;
  }

  async function tryMatchProdottoFornitore(fornitoreId, descrizioneRiga) {
    // Tentativo: prodotti_fornitore (match diretto/ilike)
    const q = normalizeText(descrizioneRiga);
    if (!fornitoreId || !q) return null;

    // NOTA: schema colonne non garantito, quindi query minimal: select prodotto_id, descrizione_fornitore
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
    // Tentativo: prodotti (ilike)
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
    // Tentativo: RPC fuzzy (signature potrebbe variare, gestiamo fallback safe)
    const q = normalizeText(descrizioneRiga);
    if (!q) return null;

    try {
      const { data, error } = await window.supabaseClient.rpc("match_prodotto_fuzzy", {
        p_azienda_id: azienda.id,
        p_query: q
      });

      if (error || !data) return null;

      // Supportiamo diversi formati:
      // - array di record { prodotto_id/id, descrizione, score/similarity }
      // - singolo record
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

    // 1) prodotti_fornitore
    const m1 = await tryMatchProdottoFornitore(fornitoreId, descrizioneRiga);
    if (m1?.prodotto_id) return m1;

    // 2) prodotti direct
    const m2 = await tryMatchProdottiDirect(descrizioneRiga);
    if (m2?.prodotto_id) return m2;

    // 3) fuzzy
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
    return "Prodotto selezionato manualmente.";
  }

  function renderRigheUI() {
    righeContainer.innerHTML = "";

    righe.forEach((r, index) => {
      const row = document.createElement("div");
      row.style.marginBottom = "10px";
      row.dataset.i = String(index);

      // Stato
      setRowStatus(row, computeStatusFromRiga(r));
      setRowHint(row, computeHintFromRiga(r));

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

          <div style="flex: 1 1 260px;">
            <label style="display:block; font-size:12px; margin-bottom:4px; color:#6b7280;">Prodotto (autocomplete)</label>
            <input type="text"
              value="${prodottoNomeVal}"
              list="prodotti-suggestions"
              placeholder="Cerca o scrivi prodotto..."
              class="input-pill riga-prodotto-nome"
              data-i="${index}" />
            <input type="hidden" class="riga-prodotto-id" data-i="${index}" value="${escapeHtml(r.prodotto_id || "")}" />
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

      // aggiorna hint dopo innerHTML
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
  }

  /* ================= OCR FLOW ================= */

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

  /* ================= APPLY OCR RESULT ================= */

  async function applyOcrResult(result) {
    await loadProdottiCache(false);

    // Prefill documento
    if (result.documento?.numero_documento)
      document.getElementById("fattura-numero").value =
        result.documento.numero_documento;

    if (result.documento?.data_documento)
      document.getElementById("fattura-data").value =
        result.documento.data_documento;

    // Tentativo match fornitore
    if (result.fornitore?.ragione_sociale) {
      const nome = result.fornitore.ragione_sociale.toLowerCase();
      const match = (fornitori || []).find(f =>
        f.ragione_sociale.toLowerCase().includes(nome)
      );
      if (match)
        document.getElementById("fattura-fornitore").value = match.id;
    }

    // Generazione righe (ora: MODIFICABILI + MATCH)
    righe = [];
    righeContainer.innerHTML = "";

    const righeInput = (result.righe || []).map(r => ({
      descrizione: (r.descrizione || "").trim(),
      quantita: Number(r.quantita || 0),
      prezzo_unitario: Number(r.prezzo_unitario || 0),
      prodotto_id: null,
      prodotto_nome: "",
      match_reason: null,
      match_score: null
    }));

    // Matching sequenziale (evitiamo tempeste di query)
    for (let i = 0; i < righeInput.length; i++) {
      const descr = righeInput[i].descrizione;
      if (!descr) {
        righe.push(righeInput[i]);
        continue;
      }

      // Se match esatto in cache (fast path)
      const cachedExact = findProdottoInCacheByDescrizione(descr);
      if (cachedExact?.id) {
        righeInput[i].prodotto_id = cachedExact.id;
        righeInput[i].prodotto_nome = cachedExact.descrizione;
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
      }

      righe.push(righeInput[i]);
    }

    renderRigheUI();
  }

  /* ================= MANUAL RIGHE ================= */

  btnAddRiga.addEventListener("click", async () => {
    await loadProdottiCache(false);

    const index = righe.length;
    righe.push({
      descrizione: "",
      quantita: 0,
      prezzo_unitario: 0,
      prodotto_id: null,
      prodotto_nome: "",
      match_reason: null,
      match_score: null
    });

    renderRigheUI();
    updateRowComputedUI(index);
  });

  /* ================= EVENTI RIGHE (delegation) ================= */

  righeContainer.addEventListener("input", async (e) => {
    const i = e.target?.dataset?.i;
    if (i === undefined) return;
    const idx = Number(i);

    if (!righe[idx]) return;

    if (e.target.classList.contains("riga-descrizione")) {
      righe[idx].descrizione = e.target.value;

      // debounce: riprova match automatico sulla descrizione
      const key = `desc_${idx}`;
      if (debounceTimers.has(key)) clearTimeout(debounceTimers.get(key));
      debounceTimers.set(key, setTimeout(async () => {
        // non forziamo match se l'utente sta solo editando il testo: lo faremo su bottone o blur
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
      const nome = e.target.value;

      righe[idx].prodotto_nome = nome;

      // Se coincide con un prodotto in cache, settiamo subito id
      await loadProdottiCache(false);
      const found = findProdottoInCacheByDescrizione(nome);
      if (found?.id) {
        righe[idx].prodotto_id = found.id;
        righe[idx].match_reason = "manual_select";
        righe[idx].match_score = 0.70;
      } else {
        // Se l'utente sta digitando un nome libero, non invalidiamo subito l'id
        // ma se cambia testo e non coincide più, togliamo id per evitare salvataggi errati
        righe[idx].prodotto_id = null;
        righe[idx].match_reason = null;
        righe[idx].match_score = null;
      }

      await updateRowComputedUI(idx);
    }
  });

  righeContainer.addEventListener("blur", async (e) => {
    const i = e.target?.dataset?.i;
    if (i === undefined) return;
    const idx = Number(i);
    if (!righe[idx]) return;

    // Su blur della descrizione o prodotto, proviamo match automatico se non abbiamo prodotto_id
    if (e.target.classList.contains("riga-descrizione")) {
      const descr = righe[idx].descrizione;
      if (!righe[idx].prodotto_id && descr) {
        await loadProdottiCache(false);
        const match = await matchRigaToProdotto(descr);
        if (match?.prodotto_id) {
          righe[idx].prodotto_id = match.prodotto_id;
          righe[idx].match_reason = match.reason;
          righe[idx].match_score = match.score;
          righe[idx].prodotto_nome = await loadProdottoNomeById(match.prodotto_id);
        }
        await updateRowComputedUI(idx);

        // aggiorna anche input prodotto in UI se presente
        const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
        const inpProd = rowEl?.querySelector(".riga-prodotto-nome");
        if (inpProd && righe[idx].prodotto_nome) inpProd.value = righe[idx].prodotto_nome;
      }
    }

    if (e.target.classList.contains("riga-prodotto-nome")) {
      await updateRowComputedUI(idx);
    }
  }, true);

  righeContainer.addEventListener("click", async (e) => {
    const btn = e.target;
    if (!(btn instanceof HTMLElement)) return;

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

          const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
          const inpProd = rowEl?.querySelector(".riga-prodotto-nome");
          if (inpProd && righe[idx].prodotto_nome) inpProd.value = righe[idx].prodotto_nome;
        } else {
          righe[idx].prodotto_id = null;
          righe[idx].match_reason = null;
          righe[idx].match_score = null;
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
            descrizione: nome
          })
          .select("id, descrizione")
          .single();

        if (error || !created?.id) {
          feedback.innerHTML = `<span style="color:red;">Errore creazione prodotto</span>`;
          return;
        }

        // aggiorna cache e riga
        prodottiCache.unshift({ id: created.id, descrizione: created.descrizione || nome });
        datalistProdotti.insertAdjacentHTML("afterbegin", `<option value="${escapeHtml(created.descrizione || nome)}"></option>`);

        righe[idx].prodotto_id = created.id;
        righe[idx].prodotto_nome = created.descrizione || nome;
        righe[idx].match_reason = "created";
        righe[idx].match_score = 0.80;

        await updateRowComputedUI(idx);

        // aggiorna input prodotto UI (se presente)
        const rowEl = righeContainer.querySelector(`div[data-i="${idx}"]`);
        const inpProd = rowEl?.querySelector(".riga-prodotto-nome");
        if (inpProd) inpProd.value = righe[idx].prodotto_nome;

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

        // aggiorna cache
        const p = prodottiCache.find(x => x.id === prodottoId);
        if (p) p.descrizione = nuovoNome;
        else prodottiCache.unshift({ id: prodottoId, descrizione: nuovoNome });

        // aggiorna datalist (semplice: ricarichiamo cache)
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

  // Se cambia fornitore, i match "fornitore" potrebbero cambiare: non rompiamo nulla, ma permettiamo di riprovare
  selectFornitore?.addEventListener("change", async () => {
    await loadProdottiCache(false);
    // Non rifacciamo tutto automatico (evitiamo query), ma aggiorniamo hint/status
    righe.forEach((_, idx) => updateRowComputedUI(idx));
  });

  /* ================= SALVATAGGIO ================= */

  btnSalva.addEventListener("click", async () => {
    feedback.innerHTML = "Salvataggio...";

    try {
      await loadProdottiCache(false);

      const fornitoreId = document.getElementById("fattura-fornitore").value;
      if (!fornitoreId) throw new Error("Seleziona fornitore");

      // Validazione righe: quantità > 0 e prodotto_id obbligatorio
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
        throw new Error("Ci sono righe senza prodotto: completa il matching (verde/giallo) o crea il prodotto.");
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
      feedback.innerHTML = "<span style='color:red;'>" + err.message + "</span>";
    }
  });

  // inizializzazione (carica datalist prodotti senza bloccare UX)
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
