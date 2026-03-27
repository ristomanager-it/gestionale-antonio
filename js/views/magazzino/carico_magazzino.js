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

            <div class="rf-product-card" id="carico-um-card" style="display:none;">
              <div class="rf-product-section-title">Unità di misura</div>
              <div class="rf-product-grid">
                <div class="rf-product-field">
                  <span class="rf-product-label">UM</span>
                  <div id="carico-um-value" class="rf-product-value">—</div>
                </div>
              </div>
            </div>

            <div class="rf-product-card" style="margin-top:10px;">
              <div class="rf-product-section-title">Quantità</div>

              <div class="rf-field">
                <label>Quantità</label>
                <input id="carico-quantita" type="number" step="0.001" class="input" inputmode="decimal" />
              </div>
            </div>

            <div class="rf-product-card" style="margin-top:10px;">
              <div class="rf-product-section-title">Scorta minima / Riordino</div>
              <div class="rf-field">
                <label>Quantità minima</label>
                <input id="carico-scorta" type="number" class="input" />
              </div>
            </div>

            <div class="rf-product-card" style="margin-top:10px;">
              <div class="rf-product-section-title">Categoria interna</div>

              <div class="rf-field">
                <label>Categoria</label>
                <input id="carico-categoria" class="input" placeholder="es. inventario, rettifica..." />
              </div>
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

export async function apriCaricoModal({ aziendaId }) {
  const backdrop = document.getElementById("rf-carico-backdrop");

  if (!backdrop) {
    console.error("Overlay carico non trovato nel DOM");
    return;
  }

  const search = backdrop.querySelector("#carico-search");
  const risultati = backdrop.querySelector("#carico-risultati");
  const prodottoBox = backdrop.querySelector("#carico-prodotto");
  const form = backdrop.querySelector("#carico-form");

  const qtaEl = backdrop.querySelector("#carico-quantita");
  const scortaEl = backdrop.querySelector("#carico-scorta");
  const dataEl = backdrop.querySelector("#carico-data");
  const noteEl = backdrop.querySelector("#carico-note");
  const categoriaEl = backdrop.querySelector("#carico-categoria");
  const esitoEl = backdrop.querySelector("#carico-esito");
  const umValueEl = backdrop.querySelector("#carico-um-value");
  const umCard = backdrop.querySelector("#carico-um-card");

  const btnClose = backdrop.querySelector("#btn-close-carico");
  const btnAnnulla = backdrop.querySelector("#btn-annulla-carico");
  const btnConferma = backdrop.querySelector("#btn-conferma-carico");

  let prodottoId = null;
  let prodottoSelezionato = null;
  let nuovoProdottoMode = false;

  let fornitoriCache = [];

  async function loadFornitori() {
    const { data } = await window.supabaseClient
      .from("fornitori")
      .select("ragione_sociale")
      .eq("azienda_id", aziendaId);

    fornitoriCache = data || [];
  }

  function bindCreateButton(term) {
    const btn = risultati.querySelector("#btn-nuovo-prodotto");
    if (!btn) return;
    btn.onclick = () => {
      nuovoProdottoMode = true;
      prodottoId = null;
      prodottoSelezionato = null;
      mostraFormNuovoProdotto(term);
    };
  }

  backdrop.style.display = "flex";

  risultati.innerHTML = "";
  prodottoBox.innerHTML = "";
  prodottoBox.style.display = "none";
  form.style.display = "none";
  esitoEl.innerText = "";

  search.value = "";
  qtaEl.value = "";
  scortaEl.value = "";
  categoriaEl.value = "";
  dataEl.value = new Date().toISOString().slice(0, 10);
  noteEl.value = "Inventario";

  await loadFornitori();

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

  search.oninput = async () => {
    const term = search.value.trim();

    prodottoId = null;
    prodottoSelezionato = null;
    nuovoProdottoMode = false;

    prodottoBox.innerHTML = "";
    prodottoBox.style.display = "none";
    form.style.display = "none";
    risultati.innerHTML = "";
    esitoEl.innerText = "";
    umValueEl.innerText = "—";
    umCard.style.display = "none";
    scortaEl.value = "";

    if (!term) {
      return;
    }

    if (term.length < 2) {
      risultati.innerHTML = `
        <div class="rf-empty-state">Digita almeno 2 caratteri oppure crea un nuovo prodotto</div>

        <button id="btn-nuovo-prodotto" class="app-button tiny" style="margin-top:10px;">
          + Crea "${escapeHtml(term)}"
        </button>
      `;
      bindCreateButton(term);
      return;
    }

    const safeTerm = sanitizeSearchTerm(term);

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, codice_interno, descrizione, unita_base, scorta_minima")
      .eq("azienda_id", aziendaId)
      .or(`descrizione.ilike.%${safeTerm}%,codice_interno.ilike.%${safeTerm}%`)
      .limit(10);

    if (error) {
      console.error(error);
      risultati.innerHTML = `
        <div class="rf-empty-state">Errore durante la ricerca</div>

        <button id="btn-nuovo-prodotto" class="app-button tiny" style="margin-top:10px;">
          + Crea "${escapeHtml(term)}"
        </button>
      `;
      bindCreateButton(term);
      return;
    }

    if (!data || !data.length) {
      risultati.innerHTML = `
        <div class="rf-empty-state">Nessun prodotto trovato</div>

        <button id="btn-nuovo-prodotto" class="app-button tiny" style="margin-top:10px;">
          + Crea "${escapeHtml(term)}"
        </button>
      `;

      bindCreateButton(term);

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
              </div>

              <button class="rf-search-action carico-item-action" data-id="${p.id}">🔍</button>
            </div>
          </div>
        `).join("")}
      </div>

      <button id="btn-nuovo-prodotto" class="app-button tiny" style="margin-top:10px;">
        + Crea "${escapeHtml(term)}"
      </button>
    `;

    bindCreateButton(term);

    risultati.querySelectorAll(".carico-item-action").forEach((btn) => {
      btn.onclick = async () => {
        const id = String(btn.dataset.id);

        prodottoId = id;
        nuovoProdottoMode = false;

        const prodotto = await loadDettaglioProdotto(aziendaId, id);

        if (!prodotto) {
          prodottoBox.style.display = "block";
          prodottoBox.innerHTML = `<div class="rf-empty-state">Prodotto non trovato</div>`;
          return;
        }

        prodottoSelezionato = prodotto;

        prodottoBox.style.display = "block";
        prodottoBox.innerHTML = renderSchedaCaricoProdotto(prodotto);

        umValueEl.innerText = prodotto.unita_base || "—";
        umCard.style.display = "block";

        scortaEl.value = prodotto.scorta_minima || "";

        form.style.display = "block";
      };
    });
  };

  btnConferma.onclick = async () => {
    const q = Number(qtaEl.value || 0);
    const scorta = Number(scortaEl.value || 0);
    const d = dataEl.value;
    const note = noteEl.value || "";
    const categoria = categoriaEl.value || "INVENTARIO";

    const rawSedeId =
      window.state?.sedeAttiva?.legacy_id ??
      window.state?.sedeAttiva?.sede_id_legacy ??
      window.state?.sedeAttiva?.id_legacy ??
      window.state?.sedeAttiva?.numero ??
      window.state?.sedeAttiva?.progressivo ??
      window.state?.sedeAttiva?.id ??
      window.state?.sedeAttiva?.sede_id ??
      null;

    const sedeId = resolveMovimentoSedeId(rawSedeId);

    if (!window.state?.sedeAttiva) {
      alert("Sede attiva non trovata");
      return;
    }

    let finalProdottoId = prodottoId;

    if (!finalProdottoId && nuovoProdottoMode) {
      const codice = document.getElementById("new-codice")?.value || null;
      const descrizione = document.getElementById("new-descrizione")?.value?.trim();
      const um = document.getElementById("new-um")?.value || null;
      const scortaNew = document.getElementById("new-scorta")?.value || null;
      const fornitore = document.getElementById("new-fornitore")?.value || null;

      if (!descrizione) {
        alert("Inserisci descrizione prodotto");
        return;
      }

      const insertResult = await insertProdottoCompat({
        azienda_id: aziendaId,
        codice_interno: codice,
        descrizione,
        unita_base: um,
        scorta_minima: scortaNew,
        fornitore_preferito: fornitore
      });

      if (insertResult.error) {
        if (insertResult.error.code === "23505") {
          const { data: existing, error: existingError } = await window.supabaseClient
            .from("prodotti")
            .select("id")
            .eq("azienda_id", aziendaId)
            .ilike("descrizione", descrizione)
            .limit(1)
            .maybeSingle();

          if (existingError) {
            console.error(existingError);
            alert("Prodotto già esistente ma non recuperabile");
            return;
          }

          if (!existing?.id) {
            alert("Prodotto già esistente ma non trovato");
            return;
          }

          finalProdottoId = String(existing.id);
        } else {
          console.error(insertResult.error);
          alert("Errore creazione prodotto");
          return;
        }
      } else {
        finalProdottoId = String(insertResult.data.id);
      }
    }

    if (!finalProdottoId) {
      alert("Seleziona o crea un prodotto");
      return;
    }

    if (!q || q <= 0) {
      alert("Inserisci una quantità valida");
      return;
    }

    const { error: updateError } = await window.supabaseClient
      .from("prodotti")
      .update({ scorta_minima: scorta })
      .eq("id", finalProdottoId);

    if (updateError) {
      console.error(updateError);
      esitoEl.innerText = "Errore aggiornamento scorta minima";
      return;
    }

    esitoEl.innerText = "Salvataggio...";

    const movimentoPayload = {
      azienda_id: aziendaId,
      prodotto_id: finalProdottoId,
      sede_id: sedeId,
      tipo_movimento: "CARICO",
      quantita: q,
      data_movimento: d,
      riferimento_tipo: categoria,
      note: note
    };

    const { error: movimentoError } = await window.supabaseClient
      .from("magazzino_movimenti")
      .insert(movimentoPayload);

    if (movimentoError) {
      console.error(movimentoError);
      esitoEl.innerText = "Errore durante il salvataggio";
      return;
    }

    if (prodottoSelezionato) {
      const nuovaGiacenza =
        Number(prodottoSelezionato.giacenza_attuale || 0) + q;

      window.magazzinoEvents?.onGiacenzaUpdate?.({
        prodotto: {
          id: prodottoSelezionato.prodotto_id || finalProdottoId,
          nome: prodottoSelezionato.descrizione
        },
        giacenza: nuovaGiacenza,
        scorta_minima: scorta
      });
    }

    esitoEl.innerText = "Carico registrato ✔";
    setTimeout(() => close(), 500);
  };

  async function insertProdottoCompat(payload) {
    const firstTry = await window.supabaseClient
      .from("prodotti")
      .insert(payload)
      .select("id")
      .single();

    if (!firstTry.error) {
      return firstTry;
    }

    const message = String(firstTry.error.message || "");
    const missingFornitoreColumn =
      firstTry.error.code === "PGRST204" ||
      message.toLowerCase().includes("fornitore_preferito");

    if (!missingFornitoreColumn) {
      return firstTry;
    }

    const payloadFallback = { ...payload };
    delete payloadFallback.fornitore_preferito;

    return window.supabaseClient
      .from("prodotti")
      .insert(payloadFallback)
      .select("id")
      .single();
  }

  function mostraFormNuovoProdotto(term) {
    prodottoBox.style.display = "block";

    prodottoBox.innerHTML = `
      <div class="rf-product-card">

        <div class="rf-product-section-title">Nuovo prodotto</div>

        <div class="rf-field">
          <label>Codice interno</label>
          <input id="new-codice" class="input">
        </div>

        <div class="rf-field">
          <label>Descrizione</label>
          <input id="new-descrizione" class="input" value="${escapeHtml(term)}">
        </div>

        <div class="rf-field">
          <label>Unità di misura</label>
          <input id="new-um" class="input" placeholder="kg / pz / lt">
        </div>

        <div class="rf-field">
          <label>Quantità riordino</label>
          <input id="new-scorta" type="number" class="input">
        </div>

        <div class="rf-field" style="position:relative;">
          <label>Fornitore preferito</label>
          <input id="new-fornitore" class="input" placeholder="Scrivi o seleziona..." autocomplete="off">
          <div id="fornitore-suggerimenti" class="rf-search-list" style="position:absolute; top:100%; left:0; right:0; display:none;"></div>
        </div>

      </div>
    `;

    const input = document.getElementById("new-fornitore");
    const box = document.getElementById("fornitore-suggerimenti");

    input.oninput = () => {
      const termInput = input.value.toLowerCase().trim();

      if (!termInput) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
      }

      const res = fornitoriCache
        .filter((f) => String(f.ragione_sociale || "").toLowerCase().includes(termInput))
        .slice(0, 5);

      if (!res.length) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
      }

      box.innerHTML = res.map((f) =>
        `<div class="rf-search-item" data-value="${escapeHtml(f.ragione_sociale)}">${escapeHtml(f.ragione_sociale)}</div>`
      ).join("");

      box.style.display = "block";

      box.querySelectorAll(".rf-search-item").forEach((el) => {
        el.onmousedown = (e) => {
          e.preventDefault();
          input.value = el.dataset.value || el.innerText;
          box.style.display = "none";
          box.innerHTML = "";
        };
      });
    };

    input.onblur = () => {
      setTimeout(() => {
        box.style.display = "none";
      }, 150);
    };

    form.style.display = "block";
  }
}

async function loadDettaglioProdotto(aziendaId, prodottoId) {
  const rawSedeId =
    window.state?.sedeAttiva?.legacy_id ??
    window.state?.sedeAttiva?.sede_id_legacy ??
    window.state?.sedeAttiva?.id_legacy ??
    window.state?.sedeAttiva?.numero ??
    window.state?.sedeAttiva?.progressivo ??
    window.state?.sedeAttiva?.id ??
    window.state?.sedeAttiva?.sede_id ??
    null;

  const sedeId = normalizeBigintId(rawSedeId);

  let queryProdotto = window.supabaseClient
    .from("v_magazzino_giacenze")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("prodotto_id", prodottoId);

  if (sedeId !== null) {
    queryProdotto = queryProdotto.eq("sede_id", sedeId);
  }

  const { data: prodottoRows, error: prodottoError } = await queryProdotto;

  if (prodottoError) {
    console.error(prodottoError);
    return null;
  }

  if (!prodottoRows || !prodottoRows.length) {
    return null;
  }

  const prodotto = collapseGiacenzeRows(prodottoRows);

  let queryMovimenti = window.supabaseClient
    .from("magazzino_movimenti")
    .select("tipo_movimento, quantita, data_movimento")
    .eq("azienda_id", aziendaId)
    .eq("prodotto_id", prodottoId);

  if (sedeId !== null) {
    queryMovimenti = queryMovimenti.eq("sede_id", sedeId);
  }

  const { data: movimenti } = await queryMovimenti
    .order("data_movimento", { ascending: false })
    .limit(5);

  const { data: mapping } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select("fornitori:fornitore_id (ragione_sociale)")
    .eq("prodotto_id", prodottoId)
    .limit(1)
    .maybeSingle();

  return {
    ...prodotto,
    fornitore: mapping?.fornitori?.ragione_sociale || "—",
    ultimi_movimenti: movimenti || []
  };
}

function collapseGiacenzeRows(rows) {
  const first = rows[0] || {};
  const giacenza_attuale = rows.reduce(
    (sum, row) => sum + Number(row?.giacenza_attuale || 0),
    0
  );

  return {
    ...first,
    giacenza_attuale
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
        ${(prodotto.ultimi_movimenti || []).length
          ? prodotto.ultimi_movimenti.map((m) => `
            <div class="rf-mov-item">
              <div class="rf-mov-main">${escapeHtml(m.tipo_movimento || "—")} · ${formatNumber(m.quantita)}</div>
              <div class="rf-mov-meta">${formatDateTime(m.data_movimento)}</div>
            </div>
          `).join("")
          : `<div class="rf-empty-state">Nessun movimento recente</div>`
        }
      </div>

    </div>
  `;
}

function sanitizeSearchTerm(value) {
  return String(value ?? "").replace(/[%,'"]/g, "");
}

function normalizeBigintId(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

function resolveMovimentoSedeId(value) {
  const numeric = normalizeBigintId(value);
  if (numeric !== null) return numeric;
  return 0;
}

function formatNumber(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("it-IT", { maximumFractionDigits: 3 });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
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
