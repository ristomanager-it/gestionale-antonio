import "../supabaseClient.js";
import "../state.js";

export async function render(container) {
  ensureMagazzinoStyles();

  let azienda = window.state?.azienda || null;

  if (!azienda) {
    await waitForAzienda(900);
    azienda = window.state?.azienda || null;
  }

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <div class="card">
          <h3 style="margin:0 0 8px 0;">Nessuna azienda attiva</h3>
          <div style="color:#667085; font-size:14px;">
            Non è stata trovata un'azienda associata alla sessione corrente.
          </div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view rf-magazzino-shell">

      <div class="rf-page-topbar">
        <button class="app-button tiny gray" id="btn-back-dashboard">
          ← Torna alla Dashboard
        </button>

        <div class="rf-page-title-wrap">
          <h2 style="margin:0;">Modulo Magazzino</h2>
          <div class="rf-page-subtitle">
            Giacenze, anagrafica prodotti, preparazioni e mapping fornitori
          </div>
        </div>
      </div>

      <div id="magazzino-home"></div>
      <div id="magazzino-content" style="margin-top:20px;"></div>

    </div>
  `;

  container
    .querySelector("#btn-back-dashboard")
    ?.addEventListener("click", () => {
      window.location.hash = "#/home";
    });

  renderHome(container, azienda);
}

/* ===================================================== */
/* ====================== STATO APP ===================== */
/* ===================================================== */

function getMagazzinoState() {
  if (!window.state) window.state = {};
  if (!window.state.magazzinoUI) {
    window.state.magazzinoUI = {
      anagraficaCache: [],
      categorieCache: [],
      fornitoriCache: []
    };
  }
  return window.state.magazzinoUI;
}

async function waitForAzienda(timeoutMs = 900) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (window.state?.azienda) return true;
    await new Promise(resolve => setTimeout(resolve, 120));
  }

  return false;
}

/* ===================================================== */
/* ===================== HOME CARD ====================== */
/* ===================================================== */

function renderHome(rootContainer, azienda) {
  const home = rootContainer.querySelector("#magazzino-home");
  const content = rootContainer.querySelector("#magazzino-content");

  if (!home || !content) return;

  content.innerHTML = "";

  home.innerHTML = `
    <div class="card rf-magazzino-hero">
      <div>
        <h3 style="margin:0;">Magazzino operativo</h3>
        <div class="rf-hero-sub">
          Controlla giacenze, sottoscorta, anagrafica prodotto e collegamenti fornitori.
        </div>
      </div>
    </div>

    <div class="rf-mag-grid">
      <div class="card rf-mag-card" data-type="materia_prima">
        <div class="rf-mag-card-icon">📦</div>
        <div class="rf-mag-card-body">
          <h3>Materie Prime</h3>
          <p>Ricerca rapida, giacenze, sottoscorta e carichi.</p>
        </div>
      </div>

      <div class="card rf-mag-card" data-type="semilavorato">
        <div class="rf-mag-card-icon">🍳</div>
        <div class="rf-mag-card-body">
          <h3>Preparazioni</h3>
          <p>Semilavorati prodotti e ricette collegate.</p>
        </div>
      </div>

      <div class="card rf-mag-card" data-type="prodotto_finito">
        <div class="rf-mag-card-icon">🍽️</div>
        <div class="rf-mag-card-body">
          <h3>Prodotti Finiti</h3>
          <p>Piatti pronti, costi e disponibilità.</p>
        </div>
      </div>

      <div class="card rf-mag-card" data-tab="anagrafica">
        <div class="rf-mag-card-icon">🧾</div>
        <div class="rf-mag-card-body">
          <h3>Anagrafica Prodotti</h3>
          <p>Ricerca prodotto e modifica scheda.</p>
        </div>
      </div>

      <div class="card rf-mag-card" data-tab="mapping">
        <div class="rf-mag-card-icon">🔗</div>
        <div class="rf-mag-card-body">
          <h3>Mapping Fornitori</h3>
          <p>Codici fornitore, descrizioni e ultimo prezzo.</p>
        </div>
      </div>
    </div>
  `;

  home.querySelectorAll(".rf-mag-card").forEach(card => {
    card.addEventListener("click", () => {
      const type = card.dataset.type;
      const tab = card.dataset.tab;

      if (type === "materia_prima") renderMateriePrime(content, azienda, rootContainer);
      if (type === "semilavorato") renderPreparazioni(content, azienda, rootContainer);
      if (type === "prodotto_finito") renderProdottiFiniti(content, azienda, rootContainer);

      if (tab === "mapping") renderMapping(content, azienda, rootContainer);
      if (tab === "anagrafica") renderAnagraficaProdottiInline(content, azienda, rootContainer);
    });
  });
}

/* ===================================================== */
/* =================== MATERIE PRIME ==================== */
/* ===================================================== */

async function renderMateriePrime(container, azienda, rootContainer) {
  container.innerHTML = `<div class="card"><p>Caricamento magazzino...</p></div>`;

  const { data: candidati, error } = await window.supabaseClient
    .from("v_magazzino_materie_prime")
    .select("*")
    .eq("azienda_id", azienda.id)
    .gt("scorta_minima", 0)
    .order("giacenza_attuale", { ascending: true })
    .limit(200);

  if (error) {
    container.innerHTML = `<div class="card"><p style="color:red;">Errore: ${escapeHtml(error.message)}</p></div>`;
    return;
  }

  const sottoScorta = (candidati || [])
    .filter(p => Number(p.giacenza_attuale || 0) <= Number(p.scorta_minima || 0))
    .slice(0, 50);

  container.innerHTML = `
    <div class="card">
      <div class="rf-section-head">
        <div>
          <h3 style="margin:0;">Materie Prime</h3>
          <div class="rf-section-sub">Ricerca rapida prodotti e registrazione carichi di magazzino</div>
        </div>
        <button class="app-button tiny gray" id="btn-back-mag-home">← Menu Magazzino</button>
      </div>

      <div class="rf-search-bar" style="margin-top:14px;">
        <input
          type="text"
          id="magazzino-search"
          class="input-pill"
          placeholder="🔎 Cerca materia prima per descrizione o codice..."
        />
      </div>

      <div id="magazzino-risultati" style="margin-top:14px;"></div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="rf-section-head">
        <div>
          <h3 style="margin:0;">⚠️ Prodotti Sottoscorta</h3>
          <div class="rf-section-sub">Prodotti con giacenza uguale o inferiore alla scorta minima</div>
        </div>
      </div>
      <div id="magazzino-sottoscorta" style="margin-top:14px;"></div>
    </div>

    ${renderCaricoModal()}
  `;

  const searchInput = container.querySelector("#magazzino-search");
  const risultati = container.querySelector("#magazzino-risultati");
  const sottoScortaBox = container.querySelector("#magazzino-sottoscorta");

  container
    .querySelector("#btn-back-mag-home")
    ?.addEventListener("click", () => renderHome(rootContainer, azienda));

  if (!sottoScorta.length) {
    sottoScortaBox.innerHTML = `<div class="rf-empty-righe">Nessun sottoscorta 🎉</div>`;
  } else {
    renderStockCards(sottoScortaBox, sottoScorta, azienda, container, (target, az) => renderMateriePrime(target, az, rootContainer));
  }

  let debounceTimer = null;

  searchInput?.addEventListener("input", () => {
    const value = String(searchInput.value || "").trim();

    if (debounceTimer) clearTimeout(debounceTimer);

    if (value.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    debounceTimer = setTimeout(async () => {
      risultati.innerHTML = `<div class="rf-empty-righe">Ricerca...</div>`;

      const { data, error: searchError } = await window.supabaseClient
        .from("v_magazzino_materie_prime")
        .select("*")
        .eq("azienda_id", azienda.id)
        .or(`descrizione.ilike.%${value}%,codice_interno.ilike.%${value}%`)
        .limit(50);

      if (searchError) {
        risultati.innerHTML = `<div class="rf-empty-righe" style="color:#b42318;">Errore: ${escapeHtml(searchError.message)}</div>`;
        return;
      }

      if (!data || !data.length) {
        risultati.innerHTML = `<div class="rf-empty-righe">Nessun risultato.</div>`;
        return;
      }

      renderStockCards(risultati, data, azienda, container, (target, az) => renderMateriePrime(target, az, rootContainer));
    }, 250);
  });
}

/* ===================================================== */
/* ==================== PREPARAZIONI ==================== */
/* ===================================================== */

async function renderPreparazioni(container, azienda, rootContainer) {
  container.innerHTML = `<div class="card"><p>Caricamento preparazioni...</p></div>`;

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_preparazioni")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("descrizione");

  if (error) {
    container.innerHTML = `<div class="card"><p style="color:red;">Errore: ${escapeHtml(error.message)}</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="rf-section-head">
        <div>
          <h3 style="margin:0;">Preparazioni</h3>
          <div class="rf-section-sub">Semilavorati prodotti e ricette collegate</div>
        </div>
        <button class="app-button tiny gray" id="btn-back-mag-home">← Menu Magazzino</button>
      </div>

      ${renderSimpleTable(
        ["Preparazione", "Giacenza", "Ricetta"],
        (data || []).map(p => [
          escapeHtml(p.descrizione || ""),
          Number(p.giacenza_attuale || 0).toFixed(3),
          escapeHtml(p.ricetta_nome || "")
        ])
      )}
    </div>
  `;

  container
    .querySelector("#btn-back-mag-home")
    ?.addEventListener("click", () => renderHome(rootContainer, azienda));
}

/* ===================================================== */
/* ================== PRODOTTI FINITI =================== */
/* ===================================================== */

async function renderProdottiFiniti(container, azienda, rootContainer) {
  container.innerHTML = `<div class="card"><p>Caricamento prodotti finiti...</p></div>`;

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_prodotti_finiti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("descrizione");

  if (error) {
    container.innerHTML = `<div class="card"><p style="color:red;">Errore: ${escapeHtml(error.message)}</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="rf-section-head">
        <div>
          <h3 style="margin:0;">Prodotti Finiti</h3>
          <div class="rf-section-sub">Costi materia prima, prezzo vendita e giacenza</div>
        </div>
        <button class="app-button tiny gray" id="btn-back-mag-home">← Menu Magazzino</button>
      </div>

      ${renderSimpleTable(
        ["Piatto", "Costo Materia Prima", "Prezzo Vendita", "Giacenza"],
        (data || []).map(p => [
          escapeHtml(p.descrizione || ""),
          Number(p.costo_materia_prima || 0).toFixed(2),
          Number(p.prezzo_vendita || 0).toFixed(2),
          Number(p.giacenza_attuale || 0).toFixed(3)
        ])
      )}
    </div>
  `;

  container
    .querySelector("#btn-back-mag-home")
    ?.addEventListener("click", () => renderHome(rootContainer, azienda));
}

/* ===================================================== */
/* ================ ANAGRAFICA PRODOTTI ================= */
/* ===================================================== */

async function renderAnagraficaProdottiInline(container, azienda, rootContainer) {
  container.innerHTML = `<div class="card"><p>Caricamento anagrafica prodotti...</p></div>`;

  const supabase = window.supabaseClient;
  const uiState = getMagazzinoState();

  const [prodottiRes, fornitoriRes, categorieRes] = await Promise.all([
    supabase
      .from("prodotti")
      .select(`
        id,
        nome,
        descrizione,
        codice_interno,
        unita_misura,
        um,
        scorta_minima,
        quantita_riordino,
        categoria_interna_id,
        fornitore_preferito_id,
        attivo
      `)
      .eq("azienda_id", azienda.id)
      .order("nome", { ascending: true })
      .limit(3000),
    supabase
      .from("fornitori")
      .select("id, ragione_sociale")
      .eq("azienda_id", azienda.id)
      .order("ragione_sociale", { ascending: true }),
    supabase
      .from("categorie_interne_prodotti")
      .select("id, nome, attiva")
      .eq("azienda_id", azienda.id)
      .eq("attiva", true)
      .order("nome", { ascending: true })
  ]);

  if (prodottiRes.error) {
    container.innerHTML = `<div class="card"><p style="color:red;">Errore prodotti: ${escapeHtml(prodottiRes.error.message)}</p></div>`;
    return;
  }

  if (fornitoriRes.error) {
    container.innerHTML = `<div class="card"><p style="color:red;">Errore fornitori: ${escapeHtml(fornitoriRes.error.message)}</p></div>`;
    return;
  }

  if (categorieRes.error) {
    container.innerHTML = `<div class="card"><p style="color:red;">Errore categorie: ${escapeHtml(categorieRes.error.message)}</p></div>`;
    return;
  }

  uiState.anagraficaCache = prodottiRes.data || [];
  uiState.fornitoriCache = fornitoriRes.data || [];
  uiState.categorieCache = categorieRes.data || [];

  container.innerHTML = `
    <div class="card">
      <div class="rf-section-head">
        <div>
          <h3 style="margin:0;">Anagrafica Prodotti</h3>
          <div class="rf-section-sub">Cerca un prodotto, apri la scheda e modifica categoria, fornitore, UM e scorte</div>
        </div>
        <button class="app-button tiny gray" id="btn-back-mag-home">← Menu Magazzino</button>
      </div>

      <div class="rf-search-panel" style="margin-top:16px;">
        <label class="rf-search-label">🔎 Cerca prodotto</label>
        <input
          id="anagrafica-search"
          class="input-pill"
          placeholder="Scrivi nome, descrizione o codice interno..."
          autocomplete="off"
        />
        <div id="anagrafica-search-feedback" class="rf-search-feedback">
          Digita almeno 2 caratteri per cercare un prodotto.
        </div>
        <div id="anagrafica-search-results" class="rf-search-results"></div>
      </div>
    </div>

    <div id="anagrafica-scheda-wrap" style="margin-top:16px;"></div>
  `;

  container
    .querySelector("#btn-back-mag-home")
    ?.addEventListener("click", () => renderHome(rootContainer, azienda));

  const searchInput = container.querySelector("#anagrafica-search");
  const feedback = container.querySelector("#anagrafica-search-feedback");
  const resultsWrap = container.querySelector("#anagrafica-search-results");
  const schedaWrap = container.querySelector("#anagrafica-scheda-wrap");

  let debounceTimer = null;

  searchInput?.addEventListener("input", () => {
    const needle = normalizeText(searchInput.value || "");

    if (debounceTimer) clearTimeout(debounceTimer);

    if (needle.length < 2) {
      feedback.textContent = "Digita almeno 2 caratteri per cercare un prodotto.";
      resultsWrap.innerHTML = "";
      return;
    }

    debounceTimer = setTimeout(() => {
      const results = searchProdottiLocal(uiState.anagraficaCache, needle).slice(0, 12);

      if (!results.length) {
        feedback.textContent = "Nessun prodotto trovato.";
        resultsWrap.innerHTML = "";
        return;
      }

      feedback.textContent = `Trovati ${results.length} prodotti. Seleziona quello da modificare.`;

      resultsWrap.innerHTML = results.map(prod => {
        const fornitore = uiState.fornitoriCache.find(f => String(f.id) === String(prod.fornitore_preferito_id));
        const categoria = uiState.categorieCache.find(c => String(c.id) === String(prod.categoria_interna_id));

        return `
          <button class="rf-search-result-item" data-prodotto-id="${escapeHtml(prod.id)}" type="button">
            <div class="rf-sr-main">
              <strong>${escapeHtml(prod.nome || prod.descrizione || "Prodotto")}</strong>
              <span>${escapeHtml(prod.codice_interno || "")}</span>
            </div>
            <div class="rf-sr-meta">
              <span>Categoria: ${escapeHtml(categoria?.nome || "-")}</span>
              <span>Fornitore: ${escapeHtml(fornitore?.ragione_sociale || "-")}</span>
              <span>UM: ${escapeHtml(prod.unita_misura || prod.um || "-")}</span>
            </div>
          </button>
        `;
      }).join("");

      resultsWrap.querySelectorAll(".rf-search-result-item").forEach(btn => {
        btn.addEventListener("click", () => {
          const prodottoId = btn.getAttribute("data-prodotto-id");
          const prodotto = uiState.anagraficaCache.find(p => String(p.id) === String(prodottoId));
          if (!prodotto) return;

          renderSchedaProdotto({
            target: schedaWrap,
            azienda,
            prodotto,
            prodottiCache: uiState.anagraficaCache,
            fornitori: uiState.fornitoriCache,
            categorie: uiState.categorieCache
          });

          resultsWrap.innerHTML = "";
          feedback.textContent = `Scheda aperta: ${prodotto.nome || prodotto.descrizione || "Prodotto"}`;
        });
      });
    }, 180);
  });
}

function renderSchedaProdotto({ target, azienda, prodotto, prodottiCache, fornitori, categorie }) {
  if (!target || !prodotto) return;

  const currentCategoriaId = prodotto.categoria_interna_id ?? "";
  const currentFornitoreId = prodotto.fornitore_preferito_id ?? "";
  const currentUm = prodotto.unita_misura || prodotto.um || "";
  const currentScortaMinima = prodotto.scorta_minima ?? 0;
  const currentQuantitaRiordino = prodotto.quantita_riordino ?? 0;
  const currentAttivo = prodotto.attivo === false ? "false" : "true";

  target.innerHTML = `
    <div class="card rf-prod-scheda">
      <div class="rf-section-head">
        <div>
          <h3 style="margin:0;">Scheda prodotto</h3>
          <div class="rf-section-sub">Modifica i dati anagrafici senza perdere collegamenti esistenti</div>
        </div>
      </div>

      <div class="rf-prod-header">
        <div>
          <div class="rf-prod-name">${escapeHtml(prodotto.nome || prodotto.descrizione || "Prodotto")}</div>
          <div class="rf-prod-meta">
            <span>Codice: ${escapeHtml(prodotto.codice_interno || "-")}</span>
            <span>Descrizione: ${escapeHtml(prodotto.descrizione || "-")}</span>
          </div>
        </div>
      </div>

      <div class="rf-grid-2" style="margin-top:16px;">
        <div class="rf-field">
          <label>Nome prodotto</label>
          <input id="prod-edit-nome" class="input" value="${escapeHtml(prodotto.nome || "")}" />
        </div>

        <div class="rf-field">
          <label>Descrizione</label>
          <input id="prod-edit-descrizione" class="input" value="${escapeHtml(prodotto.descrizione || "")}" />
        </div>

        <div class="rf-field">
          <label>Categoria interna</label>
          <select id="prod-edit-categoria" class="input">
            <option value="">-- Nessuna categoria --</option>
            ${categorie.map(cat => `
              <option value="${escapeHtml(cat.id)}" ${String(cat.id) === String(currentCategoriaId) ? "selected" : ""}>
                ${escapeHtml(cat.nome || "")}
              </option>
            `).join("")}
          </select>
        </div>

        <div class="rf-field">
          <label>Fornitore preferito</label>
          <select id="prod-edit-fornitore" class="input">
            <option value="">-- Nessun fornitore --</option>
            ${fornitori.map(forn => `
              <option value="${escapeHtml(forn.id)}" ${String(forn.id) === String(currentFornitoreId) ? "selected" : ""}>
                ${escapeHtml(forn.ragione_sociale || "")}
              </option>
            `).join("")}
          </select>
        </div>

        <div class="rf-field">
          <label>Unità di misura</label>
          <select id="prod-edit-um" class="input">
            ${renderUmOptions(currentUm)}
          </select>
        </div>

        <div class="rf-field">
          <label>Scorta minima</label>
          <input id="prod-edit-scorta-minima" type="number" step="0.001" class="input" value="${escapeHtml(currentScortaMinima)}" />
        </div>

        <div class="rf-field">
          <label>Quantità riordino</label>
          <input id="prod-edit-quantita-riordino" type="number" step="0.001" class="input" value="${escapeHtml(currentQuantitaRiordino)}" />
        </div>

        <div class="rf-field">
          <label>Stato</label>
          <select id="prod-edit-attivo" class="input">
            <option value="true" ${currentAttivo === "true" ? "selected" : ""}>Attivo</option>
            <option value="false" ${currentAttivo === "false" ? "selected" : ""}>Disattivo</option>
          </select>
        </div>
      </div>

      <div id="prod-edit-feedback" class="rf-feedback" style="margin-top:14px;"></div>

      <div class="rf-modal-actions" style="padding:18px 0 0 0; border-top:none;">
        <button type="button" id="btn-salva-prodotto" class="btn-primary">Salva modifiche</button>
        <button type="button" id="btn-chiudi-scheda" class="btn-secondary">Chiudi scheda</button>
      </div>
    </div>
  `;

  const inputNome = target.querySelector("#prod-edit-nome");
  const inputDescrizione = target.querySelector("#prod-edit-descrizione");
  const selectCategoria = target.querySelector("#prod-edit-categoria");
  const selectFornitore = target.querySelector("#prod-edit-fornitore");
  const selectUm = target.querySelector("#prod-edit-um");
  const inputScortaMinima = target.querySelector("#prod-edit-scorta-minima");
  const inputQuantitaRiordino = target.querySelector("#prod-edit-quantita-riordino");
  const selectAttivo = target.querySelector("#prod-edit-attivo");
  const feedback = target.querySelector("#prod-edit-feedback");
  const btnSave = target.querySelector("#btn-salva-prodotto");
  const btnClose = target.querySelector("#btn-chiudi-scheda");

  function setFeedback(message, isError = false) {
    feedback.textContent = message || "";
    feedback.style.color = isError ? "#b42318" : "#166534";
  }

  btnClose?.addEventListener("click", () => {
    target.innerHTML = "";
  });

  btnSave?.addEventListener("click", async () => {
    btnSave.disabled = true;
    btnSave.textContent = "Salvataggio...";
    setFeedback("");

    try {
      const nome = String(inputNome.value || "").trim();
      const descrizione = String(inputDescrizione.value || "").trim();
      const categoriaId = String(selectCategoria.value || "").trim();
      const fornitoreId = String(selectFornitore.value || "").trim();
      const um = String(selectUm.value || "").trim();
      const scortaMinima = parseNumber(inputScortaMinima.value, 0);
      const quantitaRiordino = parseNumber(inputQuantitaRiordino.value, 0);
      const attivo = String(selectAttivo.value || "true") === "true";

      if (!nome) {
        throw new Error("Il nome prodotto è obbligatorio.");
      }

      if (!um) {
        throw new Error("Seleziona una unità di misura.");
      }

      const payload = {
        nome,
        descrizione: descrizione || nome,
        categoria_interna_id: categoriaId || null,
        fornitore_preferito_id: fornitoreId || null,
        unita_misura: um,
        um: um,
        scorta_minima: Number.isFinite(scortaMinima) ? scortaMinima : 0,
        quantita_riordino: Number.isFinite(quantitaRiordino) ? quantitaRiordino : 0,
        attivo
      };

      const { error } = await window.supabaseClient
        .from("prodotti")
        .update(payload)
        .eq("azienda_id", azienda.id)
        .eq("id", prodotto.id);

      if (error) {
        throw new Error(error.message || "Errore salvataggio prodotto");
      }

      const cached = prodottiCache.find(p => String(p.id) === String(prodotto.id));
      if (cached) {
        Object.assign(cached, payload);
      }

      setFeedback("Scheda prodotto aggiornata correttamente.");
    } catch (err) {
      setFeedback(String(err?.message || err || "Errore salvataggio prodotto"), true);
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "Salva modifiche";
    }
  });
}

function searchProdottiLocal(prodotti, needle) {
  return (prodotti || [])
    .filter(prod => {
      const bag = [
        prod.nome,
        prod.descrizione,
        prod.codice_interno
      ].map(normalizeText).join(" ");

      return bag.includes(needle);
    })
    .sort((a, b) => {
      const an = String(a.nome || a.descrizione || "");
      const bn = String(b.nome || b.descrizione || "");
      return an.localeCompare(bn);
    });
}

function renderUmOptions(currentUm) {
  const values = ["kg", "g", "l", "ml", "pz", "conf", "busta", "cartone", "vaschetta"];
  const base = currentUm && !values.includes(currentUm) ? [currentUm, ...values] : values;

  return base.map(value => `
    <option value="${escapeHtml(value)}" ${String(value) === String(currentUm) ? "selected" : ""}>
      ${escapeHtml(value)}
    </option>
  `).join("");
}

/* ===================================================== */
/* ================== CARD GIACENZE ===================== */
/* ===================================================== */

function renderStockCards(target, data, azienda, container, refreshFn) {
  target.innerHTML = `
    <div class="rf-stock-grid">
      ${(data || []).map(p => {
        const sottoScorta = Number(p.giacenza_attuale || 0) <= Number(p.scorta_minima || 0);

        return `
          <div class="rf-stock-card ${sottoScorta ? "warning" : ""}">
            <div class="rf-stock-top">
              <div>
                <div class="rf-stock-title">${escapeHtml(p.descrizione || "")}</div>
                <div class="rf-stock-code">${escapeHtml(p.codice_interno || "")}</div>
              </div>
              <div class="rf-stock-badge ${sottoScorta ? "warning" : "ok"}">
                ${sottoScorta ? "Sottoscorta" : "OK"}
              </div>
            </div>

            <div class="rf-stock-meta">
              <span><strong>Giacenza:</strong> ${Number(p.giacenza_attuale || 0).toFixed(3)}</span>
              <span><strong>Scorta min:</strong> ${Number(p.scorta_minima || 0)}</span>
              <span><strong>Fornitore:</strong> ${escapeHtml(p.fornitore_nome || "-")}</span>
            </div>

            <div class="rf-stock-actions">
              <button class="app-button tiny gray btn-apri-carico"
                data-prodotto-id="${escapeHtml(p.prodotto_id || "")}"
                data-prodotto-label="${escapeHtml((p.codice_interno ? p.codice_interno + " · " : "") + (p.descrizione || ""))}">
                + Carico
              </button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  target.querySelectorAll(".btn-apri-carico").forEach(btn => {
    btn.addEventListener("click", () => {
      const prodottoId = btn.getAttribute("data-prodotto-id");
      const prodottoLabel = btn.getAttribute("data-prodotto-label");

      apriCaricoModal({
        aziendaId: azienda.id,
        prodottoId,
        prodottoLabel,
        onSuccess: () => refreshFn(container, azienda)
      });
    });
  });
}

/* ===================================================== */
/* =================== CARICO MODALE ==================== */
/* ===================================================== */

function renderCaricoModal() {
  return `
    <div id="magazzino-carico-backdrop" class="rf-mag-modal-backdrop" style="display:none;">
      <div class="rf-mag-modal">
        <div class="rf-modal-header">
          <h3 class="rf-modal-title">📦 Carico Giacenza</h3>
          <button id="btn-close-carico" class="app-button tiny gray">✕ Chiudi</button>
        </div>

        <div class="rf-modal-body">
          <div class="small-muted" id="carico-prodotto-label"></div>

          <div class="rf-field">
            <label>Quantità da caricare</label>
            <input id="carico-quantita" type="number" step="0.001" min="0" class="input" placeholder="Es: 12.500" />
          </div>

          <div class="rf-grid-2">
            <div class="rf-field">
              <label>Data movimento</label>
              <input id="carico-data" type="date" class="input" />
            </div>

            <div class="rf-field">
              <label>Note</label>
              <input id="carico-note" class="input" />
            </div>
          </div>

          <div id="carico-esito" class="rf-feedback"></div>
        </div>

        <div class="rf-modal-actions">
          <button id="btn-conferma-carico" class="btn-primary">✅ Registra Carico</button>
          <button id="btn-annulla-carico" class="btn-secondary">Annulla</button>
        </div>
      </div>
    </div>
  `;
}

function apriCaricoModal({ aziendaId, prodottoId, prodottoLabel, onSuccess }) {
  const backdrop = document.getElementById("magazzino-carico-backdrop");
  const btnClose = document.getElementById("btn-close-carico");
  const btnAnnulla = document.getElementById("btn-annulla-carico");
  const btnConferma = document.getElementById("btn-conferma-carico");

  const label = document.getElementById("carico-prodotto-label");
  const qtaEl = document.getElementById("carico-quantita");
  const dataEl = document.getElementById("carico-data");
  const noteEl = document.getElementById("carico-note");
  const esitoEl = document.getElementById("carico-esito");

  if (!backdrop || !btnClose || !btnAnnulla || !btnConferma || !label || !qtaEl || !dataEl || !noteEl || !esitoEl) return;

  esitoEl.innerText = "";
  esitoEl.style.color = "#166534";
  label.innerText = prodottoLabel ? `Prodotto: ${prodottoLabel}` : "Prodotto selezionato";
  qtaEl.value = "";
  dataEl.value = new Date().toISOString().slice(0, 10);
  noteEl.value = "Inventario iniziale";

  backdrop.style.display = "flex";
  document.body.classList.add("rf-modal-open");

  const close = () => {
    backdrop.style.display = "none";
    document.body.classList.remove("rf-modal-open");
    btnConferma.removeAttribute("disabled");
    btnConferma.textContent = "✅ Registra Carico";
  };

  btnClose.onclick = close;
  btnAnnulla.onclick = close;

  backdrop.onclick = (e) => {
    if (e.target?.id === "magazzino-carico-backdrop") close();
  };

  btnConferma.onclick = async () => {
    const q = Number(qtaEl.value || 0);
    const d = String(dataEl.value || "").trim();
    const note = String(noteEl.value || "").trim();

    if (!q || q <= 0) return alert("Inserisci una quantità > 0.");
    if (!d) return alert("Seleziona una data.");

    btnConferma.setAttribute("disabled", "disabled");
    btnConferma.textContent = "Salvataggio...";
    esitoEl.innerText = "Salvataggio...";

    const { error } = await window.supabaseClient
      .from("magazzino_movimenti")
      .insert({
        azienda_id: aziendaId,
        prodotto_id: prodottoId,
        tipo_movimento: "CARICO",
        quantita: q,
        data_movimento: d,
        riferimento_tipo: "INVENTARIO",
        note: note || "Inventario iniziale"
      });

    if (error) {
      console.error("Errore carico magazzino:", error);
      esitoEl.style.color = "#b42318";
      esitoEl.innerText = "Errore durante il carico.";
      btnConferma.removeAttribute("disabled");
      btnConferma.textContent = "✅ Registra Carico";
      return;
    }

    esitoEl.style.color = "#166534";
    esitoEl.innerText = "Carico registrato ✔️";

    setTimeout(() => {
      close();
      if (typeof onSuccess === "function") onSuccess();
    }, 350);
  };
}

/* ===================================================== */
/* =================== MAPPING FORNITORI =============== */
/* ===================================================== */

async function renderMapping(container, azienda, rootContainer) {
  container.innerHTML = `<div class="card"><p>Caricamento mapping...</p></div>`;

  const { data, error } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select(`
      codice_fornitore,
      descrizione_fornitore,
      prezzo_ultimo_acquisto,
      fornitori:fornitore_id ( ragione_sociale ),
      prodotti:prodotto_id ( descrizione, codice_interno )
    `)
    .eq("azienda_id", azienda.id)
    .eq("attivo", true);

  if (error) {
    container.innerHTML = `<div class="card"><p style="color:red;">Errore: ${escapeHtml(error.message)}</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="card">
      <div class="rf-section-head">
        <div>
          <h3 style="margin:0;">Mapping Fornitori</h3>
          <div class="rf-section-sub">Collegamenti tra prodotto interno e codifica fornitore</div>
        </div>
        <button class="app-button tiny gray" id="btn-back-mag-home">← Menu Magazzino</button>
      </div>

      ${renderSimpleTable(
        ["Prodotto", "Fornitore", "Codice Fornitore", "Descrizione Fattura", "Ultimo Prezzo"],
        (data || []).map(m => [
          escapeHtml((m.prodotti?.codice_interno || "") + " " + (m.prodotti?.descrizione || "")),
          escapeHtml(m.fornitori?.ragione_sociale || ""),
          escapeHtml(m.codice_fornitore || ""),
          escapeHtml(m.descrizione_fornitore || ""),
          Number(m.prezzo_ultimo_acquisto || 0).toFixed(2)
        ])
      )}
    </div>
  `;

  container
    .querySelector("#btn-back-mag-home")
    ?.addEventListener("click", () => renderHome(rootContainer, azienda));
}

/* ===================================================== */
/* ====================== UTILS ========================= */
/* ===================================================== */

function renderSimpleTable(headers, rows) {
  return `
    <div class="rf-table-wrap" style="margin-top:14px;">
      <table class="table-timbrature">
        <thead>
          <tr>
            ${(headers || []).map(h => `<th>${escapeHtml(h)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${(rows || []).length ? rows.map(cols => `
            <tr>
              ${(cols || []).map(col => `<td>${col}</td>`).join("")}
            </tr>
          `).join("") : `
            <tr>
              <td colspan="${headers.length}" style="text-align:center; opacity:.7;">Nessun dato disponibile</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function parseNumber(value, fallback = 0) {
  const normalized = String(value ?? "")
    .trim()
    .replaceAll(",", ".");

  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ensureMagazzinoStyles() {
  if (document.getElementById("rf-magazzino-style")) return;

  const style = document.createElement("style");
  style.id = "rf-magazzino-style";
  style.textContent = `
    body.rf-modal-open{
      overflow:hidden;
    }

    .rf-magazzino-shell{
      display:grid;
      gap:18px;
    }

    .rf-page-topbar{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }

    .rf-page-title-wrap{
      display:grid;
      gap:4px;
    }

    .rf-page-subtitle,
    .rf-section-sub,
    .rf-hero-sub,
    .rf-search-feedback,
    .rf-prod-meta{
      color:#667085;
      font-size:13px;
      line-height:1.45;
    }

    .rf-magazzino-hero{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      padding:18px;
    }

    .rf-mag-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
      gap:14px;
      margin-top:16px;
    }

    .rf-mag-card{
      display:flex;
      align-items:flex-start;
      gap:12px;
      cursor:pointer;
      transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
      border:1px solid rgba(15,23,42,.08);
    }

    .rf-mag-card:hover{
      transform:translateY(-2px);
      box-shadow:0 10px 24px rgba(15,23,42,.08);
      border-color:rgba(15,23,42,.14);
    }

    .rf-mag-card-icon{
      width:46px;
      height:46px;
      border-radius:14px;
      background:#f2f4f7;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:24px;
      flex-shrink:0;
    }

    .rf-mag-card-body{
      min-width:0;
      display:grid;
      gap:6px;
    }

    .rf-mag-card h3{
      margin:0;
      font-size:18px;
    }

    .rf-mag-card p{
      margin:0;
      color:#667085;
      font-size:13px;
      line-height:1.45;
    }

    .rf-section-head{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }

    .rf-search-bar input,
    .rf-search-panel input{
      width:100%;
      box-sizing:border-box;
    }

    .rf-search-panel{
      display:grid;
      gap:10px;
    }

    .rf-search-label{
      font-size:14px;
      font-weight:600;
    }

    .rf-search-results{
      display:grid;
      gap:8px;
    }

    .rf-search-result-item{
      width:100%;
      text-align:left;
      border:1px solid rgba(15,23,42,.08);
      background:#fff;
      border-radius:12px;
      padding:12px 14px;
      cursor:pointer;
      display:grid;
      gap:8px;
      transition:border-color .16s ease, box-shadow .16s ease, transform .16s ease;
    }

    .rf-search-result-item:hover{
      border-color:rgba(15,23,42,.18);
      box-shadow:0 8px 18px rgba(15,23,42,.07);
      transform:translateY(-1px);
    }

    .rf-sr-main{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }

    .rf-sr-main span,
    .rf-sr-meta span{
      color:#667085;
      font-size:12px;
    }

    .rf-sr-meta{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    }

    .rf-grid-2{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:12px;
    }

    .rf-field{
      min-width:0;
      display:grid;
      gap:6px;
    }

    .rf-field label{
      font-size:13px;
      font-weight:600;
    }

    .rf-stock-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
      gap:12px;
    }

    .rf-stock-card{
      border:1px solid rgba(15,23,42,.08);
      border-radius:14px;
      padding:14px;
      background:#fff;
      display:grid;
      gap:12px;
    }

    .rf-stock-card.warning{
      border-color:#fecaca;
      background:#fff8f8;
    }

    .rf-stock-top{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
    }

    .rf-stock-title{
      font-weight:700;
      line-height:1.35;
    }

    .rf-stock-code{
      font-size:12px;
      color:#667085;
      margin-top:4px;
    }

    .rf-stock-badge{
      border-radius:999px;
      padding:6px 10px;
      font-size:12px;
      font-weight:600;
      white-space:nowrap;
    }

    .rf-stock-badge.ok{
      background:#ecfdf3;
      color:#027a48;
    }

    .rf-stock-badge.warning{
      background:#fee4e2;
      color:#b42318;
    }

    .rf-stock-meta{
      display:grid;
      gap:6px;
      color:#344054;
      font-size:13px;
    }

    .rf-stock-actions{
      display:flex;
      justify-content:flex-end;
    }

    .rf-prod-scheda{
      overflow:hidden;
    }

    .rf-prod-header{
      display:flex;
      justify-content:space-between;
      gap:12px;
      padding-bottom:14px;
      border-bottom:1px solid rgba(15,23,42,.08);
    }

    .rf-prod-name{
      font-size:20px;
      font-weight:700;
      line-height:1.3;
    }

    .rf-prod-meta{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      margin-top:6px;
    }

    .rf-feedback{
      font-size:13px;
      color:#166534;
      min-height:18px;
    }

    .rf-empty-righe{
      border:1px dashed rgba(15,23,42,.18);
      border-radius:12px;
      padding:16px;
      text-align:center;
      color:#667085;
      background:#fcfcfd;
    }

    .rf-table-wrap{
      overflow:auto;
    }

    .rf-mag-modal-backdrop{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.45);
      display:none;
      align-items:center;
      justify-content:center;
      padding:16px;
      z-index:9999;
      box-sizing:border-box;
    }

    .rf-mag-modal{
      width:100%;
      max-width:620px;
      max-height:92vh;
      background:#fff;
      border-radius:16px;
      box-shadow:0 18px 50px rgba(0,0,0,.22);
      display:flex;
      flex-direction:column;
      overflow:hidden;
    }

    .rf-modal-header{
      flex-shrink:0;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      padding:18px;
      border-bottom:1px solid rgba(0,0,0,.08);
    }

    .rf-modal-title{
      margin:0;
    }

    .rf-modal-body{
      flex:1;
      overflow-y:auto;
      overflow-x:hidden;
      -webkit-overflow-scrolling:touch;
      padding:18px;
      display:grid;
      gap:14px;
      box-sizing:border-box;
    }

    .rf-modal-actions{
      flex-shrink:0;
      display:flex;
      justify-content:flex-end;
      gap:8px;
      padding:14px 18px 18px;
      border-top:1px solid rgba(0,0,0,.08);
      flex-wrap:wrap;
    }

    @media (max-width:760px){
      .rf-grid-2{
        grid-template-columns:1fr;
      }

      .rf-mag-grid,
      .rf-stock-grid{
        grid-template-columns:1fr;
      }

      .rf-modal-actions button{
        width:100%;
      }

      .rf-search-result-item{
        padding:12px;
      }

      .rf-sr-main,
      .rf-sr-meta,
      .rf-prod-meta{
        display:grid;
        gap:6px;
      }

      .rf-mag-modal-backdrop{
        padding:8px;
      }

      .rf-mag-modal{
        max-height:95vh;
        border-radius:12px;
      }
    }
  `;

  document.head.appendChild(style);
}
