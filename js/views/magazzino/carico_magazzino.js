export function renderCaricoModal() {
  return `
    <div id="rf-carico-backdrop" class="rf-overlay-backdrop" style="display:none;">
      <div class="rf-overlay-card">
        <div class="rf-overlay-header">
          <h3 class="rf-overlay-title">Carico Magazzino</h3>
          <button id="btn-close-carico" class="app-button tiny gray">Chiudi</button>
        </div>

        <div class="rf-overlay-body">
          <div class="rf-field">
            <label>Prodotto</label>
            <input
              id="carico-search"
              class="input"
              placeholder="Cerca codice o descrizione..."
              autocomplete="off"
            />
          </div>

          <div id="carico-risultati"></div>

          <div id="carico-prodotto" class="rf-section-spacer" style="display:none;"></div>

          <div id="carico-form" class="rf-section-spacer" style="display:none;">
            <div class="rf-product-grid">
              <div class="rf-product-field">
                <span class="rf-product-label">UM</span>
                <div class="rf-product-value" id="carico-um-value">—</div>
              </div>

              <div class="rf-product-field">
                <span class="rf-product-label">Categoria interna</span>
                <div class="rf-product-value">
                  <select id="carico-categoria-interna" class="input" style="width:100%;">
                    <option value="">—</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="rf-field" style="margin-top:10px;">
              <label>Quantità</label>
              <input
                id="carico-quantita"
                type="number"
                step="0.001"
                class="input"
                inputmode="decimal"
              />
            </div>

            <div class="rf-field" style="margin-top:10px;">
              <label>Data movimento</label>
              <input id="carico-data" type="date" class="input" />
            </div>

            <div class="rf-field" style="margin-top:10px;">
              <label>Note</label>
              <input id="carico-note" class="input" />
            </div>

            <div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">
              <button id="btn-conferma-carico" class="app-button tiny">
                Registra Carico
              </button>

              <button id="btn-annulla-carico" class="app-button tiny gray">
                Annulla
              </button>
            </div>

            <div id="carico-esito" style="margin-top:10px; font-size:13px;"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function apriCaricoModal({ aziendaId }) {
  const backdrop = document.getElementById("rf-carico-backdrop");

  if (!backdrop) {
    console.error("Overlay carico non trovato nel DOM");
    return;
  }

  const sedeId = window.state?.sede_id;

  if (!sedeId) {
    alert("Sede attiva non trovata");
    return;
  }

  const search = backdrop.querySelector("#carico-search");
  const risultati = backdrop.querySelector("#carico-risultati");
  const prodottoBox = backdrop.querySelector("#carico-prodotto");
  const form = backdrop.querySelector("#carico-form");

  const umValueEl = backdrop.querySelector("#carico-um-value");
  const categoriaInternaEl = backdrop.querySelector("#carico-categoria-interna");
  const qtaEl = backdrop.querySelector("#carico-quantita");
  const dataEl = backdrop.querySelector("#carico-data");
  const noteEl = backdrop.querySelector("#carico-note");
  const esitoEl = backdrop.querySelector("#carico-esito");

  const btnClose = backdrop.querySelector("#btn-close-carico");
  const btnAnnulla = backdrop.querySelector("#btn-annulla-carico");
  const btnConferma = backdrop.querySelector("#btn-conferma-carico");

  let prodottoId = null;
  let prodottoSelezionato = null;
  let categorieInterne = [];

  backdrop.style.display = "flex";

  risultati.innerHTML = "";
  prodottoBox.innerHTML = "";
  prodottoBox.style.display = "none";
  form.style.display = "none";
  esitoEl.innerText = "";

  search.value = "";
  umValueEl.textContent = "—";
  categoriaInternaEl.innerHTML = `<option value="">—</option>`;
  qtaEl.value = "";
  dataEl.value = new Date().toISOString().slice(0, 10);
  noteEl.value = "Inventario";

  const close = () => {
    backdrop.style.display = "none";
  };

  btnClose.onclick = close;
  btnAnnulla.onclick = close;

  backdrop.onclick = (e) => {
    if (e.target.id === "rf-carico-backdrop") {
      close();
    }
  };

  loadCategorieInterne(aziendaId).then((items) => {
    categorieInterne = items;
    categoriaInternaEl.innerHTML = `
      <option value="">—</option>
      ${categorieInterne.map((item) => `
        <option value="${escapeHtmlAttr(item.id)}">${escapeHtml(item.nome || item.descrizione || "—")}</option>
      `).join("")}
    `;
  });

  search.oninput = async () => {
    const term = search.value.trim();

    prodottoId = null;
    prodottoSelezionato = null;
    prodottoBox.innerHTML = "";
    prodottoBox.style.display = "none";
    form.style.display = "none";
    umValueEl.textContent = "—";
    categoriaInternaEl.value = "";
    esitoEl.innerText = "";

    if (term.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, codice_interno, descrizione, unita_base, categoria_interna_id, scorta_minima")
      .eq("azienda_id", aziendaId)
      .or(`descrizione.ilike.%${term}%,codice_interno.ilike.%${term}%`)
      .limit(10);

    if (error) {
      console.error(error);
      risultati.innerHTML = `<div class="rf-empty-state">Errore durante la ricerca</div>`;
      return;
    }

    if (!data || !data.length) {
      risultati.innerHTML = `<div class="rf-empty-state">Nessun prodotto trovato</div>`;
      return;
    }

    risultati.innerHTML = `
      <div class="rf-search-list">
        ${data.map((p) => `
          <div class="rf-search-item">
            <div class="rf-search-row">
              <div class="rf-search-main">
                <div class="rf-search-code">${escapeHtml(p.codice_interno || "—")}</div>
                <div class="rf-search-title">${escapeHtml(p.descrizione || "")}</div>
                <div class="rf-search-subtitle">UM: ${escapeHtml(p.unita_base || "—")}</div>
              </div>

              <button
                type="button"
                class="rf-search-action carico-item-action"
                data-id="${p.id}"
                aria-label="Apri scheda prodotto"
              >🔍</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    risultati.querySelectorAll(".carico-item-action").forEach((btn) => {
      btn.onclick = async () => {
        prodottoId = Number(btn.dataset.id);
        prodottoSelezionato = await loadDettaglioProdotto(aziendaId, sedeId, prodottoId);

        if (!prodottoSelezionato) {
          prodottoBox.style.display = "block";
          prodottoBox.innerHTML = `<div class="rf-empty-state">Prodotto non trovato</div>`;
          form.style.display = "none";
          umValueEl.textContent = "—";
          categoriaInternaEl.value = "";
          return;
        }

        prodottoBox.style.display = "block";
        prodottoBox.innerHTML = renderSchedaCaricoProdotto(prodottoSelezionato);
        form.style.display = "block";
        umValueEl.textContent = prodottoSelezionato.unita_base || "—";

        if (prodottoSelezionato.categoria_interna_id) {
          categoriaInternaEl.value = String(prodottoSelezionato.categoria_interna_id);
        } else {
          categoriaInternaEl.value = "";
        }

        esitoEl.innerText = "";
      };
    });
  };

  btnConferma.onclick = async () => {
    const q = Number(qtaEl.value || 0);
    const d = dataEl.value;
    const note = noteEl.value || "";
    const categoriaInternaId = categoriaInternaEl.value || null;

    if (!prodottoId) {
      alert("Seleziona un prodotto");
      return;
    }

    if (!q || q <= 0) {
      alert("Inserisci una quantità valida");
      return;
    }

    esitoEl.innerText = "Salvataggio...";

    if (categoriaInternaId) {
      const { error: prodottoUpdateError } = await window.supabaseClient
        .from("prodotti")
        .update({
          categoria_interna_id: categoriaInternaId
        })
        .eq("azienda_id", aziendaId)
        .eq("id", prodottoId);

      if (prodottoUpdateError) {
        console.error(prodottoUpdateError);
        esitoEl.innerText = "Errore durante l'aggiornamento categoria interna";
        return;
      }
    }

    const { error } = await window.supabaseClient
      .from("magazzino_movimenti")
      .insert({
        azienda_id: aziendaId,
        sede_id: sedeId,
        prodotto_id: prodottoId,
        tipo_movimento: "CARICO",
        quantita: q,
        data_movimento: d,
        riferimento_tipo: "INVENTARIO",
        note: note
      });

    if (error) {
      console.error(error);
      esitoEl.innerText = "Errore durante il salvataggio";
      return;
    }

    esitoEl.innerText = "Carico registrato ✔";

    setTimeout(() => {
      close();
    }, 450);
  };
}

async function loadCategorieInterne(aziendaId) {
  const tables = [
    "categorie_interne",
    "categorie_prodotti_interne"
  ];

  for (const tableName of tables) {
    const { data, error } = await window.supabaseClient
      .from(tableName)
      .select("id, nome, descrizione")
      .eq("azienda_id", aziendaId)
      .limit(200);

    if (!error && Array.isArray(data)) {
      return data;
    }
  }

  return [];
}

async function loadDettaglioProdotto(aziendaId, sedeId, prodottoId) {
  const { data } = await window.supabaseClient
    .from("v_magazzino_giacenze")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("sede_id", sedeId)
    .eq("prodotto_id", prodottoId)
    .maybeSingle();

  if (!data) {
    const { data: prodotto } = await window.supabaseClient
      .from("prodotti")
      .select("id, codice_interno, descrizione, unita_base, scorta_minima, categoria_interna_id")
      .eq("azienda_id", aziendaId)
      .eq("id", prodottoId)
      .maybeSingle();

    if (!prodotto) {
      return null;
    }

    const { data: movimentiFallback } = await window.supabaseClient
      .from("magazzino_movimenti")
      .select("tipo_movimento, quantita, created_at")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .eq("prodotto_id", prodottoId)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      ...prodotto,
      giacenza_attuale: 0,
      ultimi_movimenti: movimentiFallback || [],
      fornitore: "—"
    };
  }

  const { data: prodottoExtra } = await window.supabaseClient
    .from("prodotti")
    .select("id, categoria_interna_id, unita_base, descrizione, codice_interno, scorta_minima")
    .eq("azienda_id", aziendaId)
    .eq("id", prodottoId)
    .maybeSingle();

  const { data: movimenti } = await window.supabaseClient
    .from("magazzino_movimenti")
    .select("tipo_movimento, quantita, created_at")
    .eq("azienda_id", aziendaId)
    .eq("sede_id", sedeId)
    .eq("prodotto_id", prodottoId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: mapping } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select("fornitori:fornitore_id (ragione_sociale)")
    .eq("azienda_id", aziendaId)
    .eq("prodotto_id", prodottoId)
    .limit(1)
    .maybeSingle();

  return {
    ...data,
    ...prodottoExtra,
    fornitore: mapping?.fornitori?.ragione_sociale || "—",
    ultimi_movimenti: movimenti || []
  };
}

function renderSchedaCaricoProdotto(prodotto) {
  return `
    <div class="rf-product-card">
      <div class="rf-product-heading">
        <div class="rf-product-code">${escapeHtml(prodotto.codice_interno || "—")}</div>
        <div class="rf-product-title">${escapeHtml(prodotto.descrizione || "")}</div>
      </div>

      <div class="rf-product-grid">
        <div class="rf-product-field">
          <span class="rf-product-label">UM</span>
          <div class="rf-product-value">${escapeHtml(prodotto.unita_base || "—")}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Fornitore</span>
          <div class="rf-product-value">${escapeHtml(prodotto.fornitore || "—")}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Giacenza</span>
          <div class="rf-product-value">${formatNumber(prodotto.giacenza_attuale)}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Scorta minima</span>
          <div class="rf-product-value">${formatNumber(prodotto.scorta_minima)}</div>
        </div>
      </div>

      <div class="rf-product-section-title">Ultimi movimenti</div>

      <div class="rf-mov-list">
        ${(prodotto.ultimi_movimenti || []).length ? prodotto.ultimi_movimenti.map((m) => `
          <div class="rf-mov-item">
            <div class="rf-mov-main">${escapeHtml(m.tipo_movimento || "—")} · ${formatNumber(m.quantita)}</div>
            <div class="rf-mov-meta">${formatDateTime(m.created_at)}</div>
          </div>
        `).join("") : `
          <div class="rf-empty-state">Nessun movimento recente</div>
        `}
      </div>
    </div>
  `;
}

function formatNumber(value) {
  const n = Number(value || 0);

  if (Number.isNaN(n)) {
    return "—";
  }

  return n.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("it-IT");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
