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

export function apriCaricoModal({ aziendaId }) {
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

  backdrop.style.display = "flex";

  risultati.innerHTML = "";
  prodottoBox.innerHTML = "";
  prodottoBox.style.display = "none";
  form.style.display = "none";
  esitoEl.innerText = "";

  search.value = "";
  qtaEl.value = "";
  categoriaEl.value = "";
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

  search.oninput = async () => {

    const term = search.value.trim();

    prodottoId = null;
    prodottoBox.innerHTML = "";
    prodottoBox.style.display = "none";
    form.style.display = "none";
    risultati.innerHTML = "";
    esitoEl.innerText = "";

    if (term.length < 2) return;

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, codice_interno, descrizione, unita_base, scorta_minima")
      .eq("azienda_id", aziendaId)
      .or(`descrizione.ilike.%${term}%,codice_interno.ilike.%${term}%`)
      .limit(10);

    if (error) {
      console.error(error);
      risultati.innerHTML = `<div class="rf-empty-state">Errore durante la ricerca</div>`;
      return;
    }

    if (!data || !data.length) {

      risultati.innerHTML = `
        <div class="rf-empty-state">Nessun prodotto trovato</div>

        <button id="btn-nuovo-prodotto" class="app-button tiny" style="margin-top:10px;">
          + Nuovo prodotto
        </button>
      `;

      risultati.querySelector("#btn-nuovo-prodotto").onclick = () => {
        mostraFormNuovoProdotto(term);
      };

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

              <button
                class="rf-search-action carico-item-action"
                data-id="${p.id}"
              >🔍</button>

            </div>
          </div>
        `).join("")}
      </div>
    `;

    risultati.querySelectorAll(".carico-item-action").forEach((btn) => {

      btn.onclick = async () => {

        const id = Number(btn.dataset.id);

        prodottoId = id;

        const prodotto = await loadDettaglioProdotto(aziendaId, id);

        if (!prodotto) {
          prodottoBox.style.display = "block";
          prodottoBox.innerHTML = `<div class="rf-empty-state">Prodotto non trovato</div>`;
          return;
        }

        prodottoBox.style.display = "block";
        prodottoBox.innerHTML = renderSchedaCaricoProdotto(prodotto);

        umValueEl.innerText = prodotto.unita_base || "—";
        umCard.style.display = "block";

        form.style.display = "block";
      };

    });

  };

  btnConferma.onclick = async () => {

    const q = Number(qtaEl.value || 0);
    const d = dataEl.value;
    const note = noteEl.value || "";
    const categoria = categoriaEl.value || "INVENTARIO";

    const sedeId = window.state?.sedeAttiva?.id;

    if (!sedeId) {
      alert("Sede attiva non trovata");
      return;
    }

    if (!prodottoId) {
      alert("Seleziona un prodotto");
      return;
    }

    if (!q || q <= 0) {
      alert("Inserisci una quantità valida");
      return;
    }

    esitoEl.innerText = "Salvataggio...";

    const { error } = await window.supabaseClient
      .from("magazzino_movimenti")
      .insert({
        azienda_id: aziendaId,
        sede_id: sedeId,
        prodotto_id: prodottoId,
        tipo_movimento: "CARICO",
        quantita: q,
        data_movimento: d,
        riferimento_tipo: categoria,
        note: note
      });

    if (error) {
      console.error(error);
      esitoEl.innerText = "Errore durante il salvataggio";
      return;
    }

    esitoEl.innerText = "Carico registrato ✔";

    setTimeout(() => close(), 500);
  };

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
          <label>Scorta minima</label>
          <input id="new-scorta" type="number" class="input">
        </div>

      </div>
    `;

    form.style.display = "block";
  }
}

async function loadDettaglioProdotto(aziendaId, prodottoId) {

  const sedeId = window.state?.sedeAttiva?.id;

  const { data: prodotto } = await window.supabaseClient
    .from("v_magazzino_giacenze")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("sede_id", sedeId)
    .eq("prodotto_id", prodottoId)
    .maybeSingle();

  if (!prodotto) return null;

  const { data: movimenti } = await window.supabaseClient
    .from("magazzino_movimenti")
    .select("tipo_movimento, quantita, data_movimento")
    .eq("azienda_id", aziendaId)
    .eq("sede_id", sedeId)
    .eq("prodotto_id", prodottoId)
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
