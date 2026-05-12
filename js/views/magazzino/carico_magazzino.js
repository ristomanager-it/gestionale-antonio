export function renderCaricoModal() {
  return `
    <div id="rf-carico-backdrop" class="rf-overlay-backdrop" style="display:none;">
      <div class="rf-overlay-card">

        <div class="rf-overlay-header">
          <h3 class="rf-overlay-title">
            Carico Magazzino
          </h3>

          <button
            id="btn-close-carico"
            class="app-button tiny gray"
          >
            Chiudi
          </button>
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

          <div
            id="carico-prodotto"
            class="rf-section-spacer"
            style="display:none;"
          ></div>

          <div
            id="carico-form"
            class="rf-section-spacer"
            style="display:none;"
          >

            <div
              class="rf-product-card"
              id="carico-um-card"
              style="display:none;"
            >
              <div class="rf-product-section-title">
                Unità di misura
              </div>

              <div class="rf-product-grid">
                <div class="rf-product-field">

                  <span class="rf-product-label">
                    UM
                  </span>

                  <div
                    id="carico-um-value"
                    class="rf-product-value"
                  >
                    —
                  </div>

                </div>
              </div>
            </div>

            <div
              class="rf-product-card"
              style="margin-top:10px;"
            >
              <div class="rf-product-section-title">
                Quantità
              </div>

              <div class="rf-field">
                <label>Quantità</label>

                <input
                  id="carico-quantita"
                  type="number"
                  step="0.001"
                  class="input"
                  inputmode="decimal"
                />
              </div>
            </div>

            <div
              class="rf-product-card"
              style="margin-top:10px;"
            >
              <div class="rf-product-section-title">
                Scorta minima / Riordino
              </div>

              <div class="rf-field">
                <label>Quantità minima</label>

                <input
                  id="carico-scorta"
                  type="number"
                  class="input"
                />
              </div>
            </div>

            <div
              class="rf-product-card"
              style="margin-top:10px;"
            >
              <div class="rf-product-section-title">
                Categoria interna
              </div>

              <div
                class="rf-field"
                style="position:relative;"
              >
                <label>Categoria</label>

                <input
                  id="carico-categoria"
                  class="input"
                  placeholder="Scrivi o seleziona..."
                  autocomplete="off"
                />

                <div
                  id="categoria-suggerimenti"
                  class="rf-search-list"
                  style="
                    position:absolute;
                    top:100%;
                    left:0;
                    right:0;
                    display:none;
                    z-index:20;
                  "
                ></div>
              </div>
            </div>

            <div class="rf-field" style="margin-top:10px;">
              <label>Data movimento</label>

              <input
                id="carico-data"
                type="date"
                class="input"
              />
            </div>

            <div class="rf-field" style="margin-top:10px;">
              <label>Note</label>

              <input
                id="carico-note"
                class="input"
              />
            </div>

            <div
              style="
                margin-top:14px;
                display:flex;
                gap:8px;
                flex-wrap:wrap;
              "
            >
              <button
                id="btn-conferma-carico"
                class="app-button tiny"
              >
                Registra Carico
              </button>

              <button
                id="btn-annulla-carico"
                class="app-button tiny gray"
              >
                Annulla
              </button>
            </div>

            <div
              id="carico-esito"
              style="
                margin-top:10px;
                font-size:13px;
              "
            ></div>

          </div>
        </div>
      </div>
    </div>
  `;
}

export async function apriCaricoModal({
  aziendaId
}) {
  const backdrop =
    document.getElementById(
      "rf-carico-backdrop"
    );

  if (!backdrop) {
    console.error(
      "Overlay carico non trovato"
    );

    return;
  }

  const search =
    backdrop.querySelector(
      "#carico-search"
    );

  const risultati =
    backdrop.querySelector(
      "#carico-risultati"
    );

  const prodottoBox =
    backdrop.querySelector(
      "#carico-prodotto"
    );

  const form =
    backdrop.querySelector(
      "#carico-form"
    );

  const qtaEl =
    backdrop.querySelector(
      "#carico-quantita"
    );

  const scortaEl =
    backdrop.querySelector(
      "#carico-scorta"
    );

  const dataEl =
    backdrop.querySelector(
      "#carico-data"
    );

  const noteEl =
    backdrop.querySelector(
      "#carico-note"
    );

  const categoriaEl =
    backdrop.querySelector(
      "#carico-categoria"
    );

  const categoriaSuggerimentiEl =
    backdrop.querySelector(
      "#categoria-suggerimenti"
    );

  const esitoEl =
    backdrop.querySelector(
      "#carico-esito"
    );

  const umValueEl =
    backdrop.querySelector(
      "#carico-um-value"
    );

  const umCard =
    backdrop.querySelector(
      "#carico-um-card"
    );

  const btnClose =
    backdrop.querySelector(
      "#btn-close-carico"
    );

  const btnAnnulla =
    backdrop.querySelector(
      "#btn-annulla-carico"
    );

  const btnConferma =
    backdrop.querySelector(
      "#btn-conferma-carico"
    );

  let prodottoId = null;

  let prodottoSelezionato = null;

  let nuovoProdottoMode = false;

  let fornitoriCache = [];

  let categorieCache = [];

  async function loadFornitori() {
    const { data } =
      await window.supabaseClient
        .from("fornitori")
        .select("ragione_sociale")
        .eq("azienda_id", aziendaId);

    fornitoriCache = data || [];
  }

  async function loadCategorie() {
    const {
      data,
      error
    } =
      await window.supabaseClient
        .from(
          "categorie_interne_prodotti"
        )
        .select("id,nome")
        .eq(
          "azienda_id",
          aziendaId
        )
        .order("nome");

    if (error) {
      console.error(
        "Errore categorie",
        error
      );

      categorieCache = [];

      return;
    }

    categorieCache = data || [];
  }

  function bindCategoriaAutocomplete() {
    categoriaEl.oninput = () => {
      const term =
        categoriaEl.value
          .toLowerCase()
          .trim();

      if (!term) {
        categoriaSuggerimentiEl.style.display =
          "none";

        categoriaSuggerimentiEl.innerHTML =
          "";

        return;
      }

      const risultatiCategorie =
        categorieCache
          .filter((c) =>
            String(c.nome || "")
              .toLowerCase()
              .includes(term)
          )
          .slice(0, 5);

      if (!risultatiCategorie.length) {
        categoriaSuggerimentiEl.style.display =
          "none";

        categoriaSuggerimentiEl.innerHTML =
          "";

        return;
      }

      categoriaSuggerimentiEl.innerHTML =
        risultatiCategorie
          .map((c) => `
            <div
              class="rf-search-item"
              data-value="${escapeHtml(c.nome)}"
            >
              ${escapeHtml(c.nome)}
            </div>
          `)
          .join("");

      categoriaSuggerimentiEl.style.display =
        "block";

      categoriaSuggerimentiEl
        .querySelectorAll(
          ".rf-search-item"
        )
        .forEach((el) => {
          el.onmousedown = (e) => {
            e.preventDefault();

            categoriaEl.value =
              el.dataset.value ||
              el.innerText;

            categoriaSuggerimentiEl.style.display =
              "none";

            categoriaSuggerimentiEl.innerHTML =
              "";
          };
        });
    };

    categoriaEl.onblur = () => {
      setTimeout(() => {
        categoriaSuggerimentiEl.style.display =
          "none";
      }, 150);
    };
  }

  async function resolveCategoriaInternaId(
    nomeCategoria
  ) {
    const nome = String(
      nomeCategoria || ""
    ).trim();

    if (!nome) {
      return null;
    }

    const existing =
      categorieCache.find(
        (c) =>
          String(c.nome || "")
            .trim()
            .toLowerCase() ===
          nome.toLowerCase()
      );

    if (existing?.id) {
      return existing.id;
    }

    const insertPayload = {
      azienda_id: aziendaId,
      nome
    };

    const {
      data,
      error
    } =
      await window.supabaseClient
        .from(
          "categorie_interne_prodotti"
        )
        .insert(insertPayload)
        .select();

    if (error) {
      console.error(
        "ERRORE CREAZIONE CATEGORIA",
        error
      );

      return null;
    }

    const categoriaCreata =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!categoriaCreata?.id) {
      console.error(
        "Categoria senza ID",
        data
      );

      return null;
    }

    categorieCache.push(
      categoriaCreata
    );

    return categoriaCreata.id;
  }

  async function insertProdottoCompat(
    payload
  ) {
    const firstTry =
      await window.supabaseClient
        .from("prodotti")
        .insert(payload)
        .select("id");

    if (
      firstTry?.data &&
      Array.isArray(
        firstTry.data
      )
    ) {
      firstTry.data =
        firstTry.data[0];
    }

    return firstTry;
  }

  backdrop.style.display = "flex";

  risultati.innerHTML = "";

  prodottoBox.innerHTML = "";

  prodottoBox.style.display =
    "none";

  form.style.display = "none";

  esitoEl.innerText = "";

  search.value = "";

  qtaEl.value = "";

  scortaEl.value = "";

  categoriaEl.value = "";

  categoriaSuggerimentiEl.innerHTML =
    "";

  categoriaSuggerimentiEl.style.display =
    "none";

  dataEl.value = new Date()
    .toISOString()
    .slice(0, 10);

  noteEl.value = "Inventario";

  await loadFornitori();

  await loadCategorie();

  bindCategoriaAutocomplete();

  const close = () => {
    backdrop.style.display =
      "none";
  };

  btnClose.onclick = close;

  btnAnnulla.onclick = close;

  backdrop.onclick = (e) => {
    if (
      e.target.id ===
      "rf-carico-backdrop"
    ) {
      close();
    }
  };

  search.oninput = async () => {
    const term =
      search.value.trim();

    prodottoId = null;

    prodottoSelezionato = null;

    nuovoProdottoMode = false;

    prodottoBox.innerHTML = "";

    prodottoBox.style.display =
      "none";

    form.style.display = "none";

    risultati.innerHTML = "";

    esitoEl.innerText = "";

    umValueEl.innerText = "—";

    umCard.style.display = "none";

    scortaEl.value = "";

    if (!term) {
      return;
    }

    const safeTerm =
      sanitizeSearchTerm(term);

    const {
      data,
      error
    } =
      await window.supabaseClient
        .from("prodotti")
        .select(`
          id,
          codice_interno,
          descrizione,
          unita_base,
          scorta_minima
        `)
        .eq(
          "azienda_id",
          aziendaId
        )
        .or(
          `descrizione.ilike.%${safeTerm}%,codice_interno.ilike.%${safeTerm}%`
        )
        .limit(10);

    if (error) {
      console.error(error);

      risultati.innerHTML = `
        <div class="rf-empty-state">
          Errore ricerca prodotti
        </div>
      `;

      return;
    }

    if (!data || !data.length) {
      risultati.innerHTML = `
        <div class="rf-empty-state">
          Nessun prodotto trovato
        </div>

        <button
          id="btn-nuovo-prodotto"
          class="app-button tiny"
          style="margin-top:10px;"
        >
          + Crea "${escapeHtml(term)}"
        </button>
      `;

      const btn =
        risultati.querySelector(
          "#btn-nuovo-prodotto"
        );

      btn.onclick = () => {
        nuovoProdottoMode = true;

        mostraFormNuovoProdotto(
          term
        );
      };

      return;
    }

    risultati.innerHTML = `
      <div class="rf-search-list">

        ${data.map((p) => `
          <div class="rf-search-item">

            <div class="rf-search-row">

              <div class="rf-search-main">

                <div class="rf-search-code">
                  ${escapeHtml(
                    p.codice_interno || "—"
                  )}
                </div>

                <div class="rf-search-title">
                  ${escapeHtml(
                    p.descrizione || ""
                  )}
                </div>

              </div>

              <button
                class="rf-search-action carico-item-action"
                data-id="${p.id}"
              >
                🔍
              </button>

            </div>

          </div>
        `).join("")}

      </div>
    `;

    risultati
      .querySelectorAll(
        ".carico-item-action"
      )
      .forEach((btn) => {
        btn.onclick = async () => {
          prodottoId =
            btn.dataset.id;

          form.style.display =
            "block";

          umCard.style.display =
            "block";

          umValueEl.innerText =
            "—";
        };
      });
  };

  btnConferma.onclick = async () => {
    const q = Number(
      qtaEl.value || 0
    );

    const scorta = Number(
      scortaEl.value || 0
    );

    const categoria = String(
      categoriaEl.value ||
      "INVENTARIO"
    ).trim();

    let finalProdottoId =
      prodottoId;

    if (
      !finalProdottoId &&
      nuovoProdottoMode
    ) {
      const descrizione =
        document.getElementById(
          "new-descrizione"
        )?.value?.trim();

      const um =
        document.getElementById(
          "new-um"
        )?.value || null;

      if (!descrizione) {
        alert(
          "Inserisci descrizione"
        );

        return;
      }

      const categoriaInternaId =
        await resolveCategoriaInternaId(
          categoria ||
          "INVENTARIO"
        );

      if (!categoriaInternaId) {
        alert(
          "Errore categoria"
        );

        return;
      }

      const insertResult =
        await insertProdottoCompat({
          azienda_id: aziendaId,
          descrizione,
          unita_base: um,
          categoria_interna_id:
            categoriaInternaId
        });

      if (insertResult.error) {
        console.error(
          insertResult.error
        );

        alert(
          "Errore creazione prodotto"
        );

        return;
      }

      finalProdottoId =
        insertResult?.data?.id;

      if (!finalProdottoId) {
        console.error(
          "ID prodotto mancante",
          insertResult
        );

        return;
      }
    }

    const prodottoIdNumerico =
      parseInt(
        finalProdottoId,
        10
      );

    if (
      Number.isNaN(
        prodottoIdNumerico
      )
    ) {
      console.error(
        "ID prodotto invalido",
        finalProdottoId
      );

      return;
    }

    const movimentoPayload = {
      azienda_id: aziendaId,

      sede_id:
        getSedeAttivaId(),

      prodotto_id:
        prodottoIdNumerico,

      tipo_movimento:
        "carico",

      quantita: q,

      costo: 0,

      causale:
        categoria ||
        "INVENTARIO"
    };

    const {
      error: movimentoError
    } =
      await window.supabaseClient
        .from(
          "magazzino_movimenti"
        )
        .insert(
          movimentoPayload
        );

    if (movimentoError) {
      console.error(
        movimentoError
      );

      esitoEl.innerText =
        "Errore movimento";

      return;
    }

    await window.supabaseClient
      .from("prodotti")
      .update({
        scorta_minima:
          scorta
      })
      .eq(
        "id",
        prodottoIdNumerico
      );

    esitoEl.innerText =
      "Carico registrato ✔";

    setTimeout(() => {
      close();
    }, 500);
  };

  function mostraFormNuovoProdotto(
    term
  ) {
    prodottoBox.style.display =
      "block";

    prodottoBox.innerHTML = `
      <div class="rf-product-card">

        <div class="rf-product-section-title">
          Nuovo prodotto
        </div>

        <div class="rf-field">
          <label>Descrizione</label>

          <input
            id="new-descrizione"
            class="input"
            value="${escapeHtml(
              term
            )}"
          >
        </div>

        <div class="rf-field">
          <label>Unità di misura</label>

          <input
            id="new-um"
            class="input"
          >
        </div>

      </div>
    `;

    form.style.display =
      "block";
  }
}

function sanitizeSearchTerm(
  value
) {
  return String(
    value ?? ""
  ).replace(
    /[%,'"]/g,
    ""
  );
}

function getSedeAttivaId() {
  const sedeId =
    window.state
      ?.sedeAttiva?.id;

  if (!sedeId) {
    throw new Error(
      "Sede attiva non trovata"
    );
  }

  return sedeId;
}

function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#39;"
    );
}
