export function renderCaricoModal() {

  return `

  <div id="rf-carico-backdrop" class="rf-modal-backdrop" style="display:none;">

    <div class="rf-modal" style="max-width:420px;height:auto;">

      <div class="rf-modal-header">
        <h3 class="rf-modal-title">Carico Magazzino</h3>
        <button id="btn-close-carico" class="app-button tiny gray">Chiudi</button>
      </div>

      <div class="rf-modal-body" style="display:flex;flex-direction:column;gap:12px;">

        <input
          id="carico-search"
          class="input"
          placeholder="Cerca prodotto..."
          autocomplete="off"
        />

        <div id="carico-risultati"></div>

        <div id="carico-card" style="display:none;"></div>

        <div id="carico-form" style="display:none;">

          <div class="rf-field">
            <label>Quantità</label>
            <input id="carico-quantita" type="number" step="0.001" class="input"/>
          </div>

          <div class="rf-field" style="margin-top:8px;">
            <label>Data movimento</label>
            <input id="carico-data" type="date" class="input"/>
          </div>

          <div class="rf-field" style="margin-top:8px;">
            <label>Note</label>
            <input id="carico-note" class="input"/>
          </div>

          <div style="margin-top:10px;display:flex;gap:8px;">
            <button id="btn-conferma-carico" class="app-button tiny">
              Registra Carico
            </button>

            <button id="btn-annulla-carico" class="app-button tiny gray">
              Annulla
            </button>
          </div>

          <div id="carico-esito" style="margin-top:8px;font-size:13px;"></div>

        </div>

      </div>

    </div>

  </div>

  `;
}

export function apriCaricoModal({ aziendaId }) {

  const backdrop = document.getElementById("rf-carico-backdrop");

  const search = document.getElementById("carico-search");
  const risultati = document.getElementById("carico-risultati");
  const card = document.getElementById("carico-card");
  const form = document.getElementById("carico-form");

  const qtaEl = document.getElementById("carico-quantita");
  const dataEl = document.getElementById("carico-data");
  const noteEl = document.getElementById("carico-note");
  const esitoEl = document.getElementById("carico-esito");

  const btnClose = document.getElementById("btn-close-carico");
  const btnAnnulla = document.getElementById("btn-annulla-carico");
  const btnConferma = document.getElementById("btn-conferma-carico");

  let prodottoId = null;

  backdrop.style.display = "flex";

  risultati.innerHTML = "";
  card.innerHTML = "";
  card.style.display = "none";
  form.style.display = "none";

  esitoEl.innerText = "";

  qtaEl.value = "";
  dataEl.value = new Date().toISOString().slice(0,10);
  noteEl.value = "Inventario";

  const close = () => backdrop.style.display = "none";

  btnClose.onclick = close;
  btnAnnulla.onclick = close;

  backdrop.onclick = e => {
    if (e.target.id === "rf-carico-backdrop") close();
  };

  search.oninput = async () => {

    const term = search.value.trim();

    if (term.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    const { data } = await window.supabaseClient
      .from("prodotti")
      .select("id, meta, descrizione, um")
      .eq("azienda_id", aziendaId)
      .ilike("descrizione", `%${term}%`)
      .limit(10);

    risultati.innerHTML = `

      <div class="rf-doc-list">

        ${(data || []).map(p => `

          <div class="rf-doc-item carico-item"
               data-id="${p.id}"
               data-um="${p.um || ""}"
               data-label="${(p.meta || "")} — ${p.descrizione}">

            <div class="rf-doc-title">
              ${(p.meta || "")} — ${p.descrizione}
            </div>

          </div>

        `).join("")}

      </div>

    `;

    risultati.querySelectorAll(".carico-item").forEach(row => {

      row.onclick = async () => {

        prodottoId = row.dataset.id;

        search.value = row.dataset.label;

        const um = row.dataset.um || "-";

        const { data: mapping } = await window.supabaseClient
          .from("prodotti_fornitore")
          .select("fornitori:fornitore_id(ragione_sociale)")
          .eq("prodotto_id", prodottoId)
          .limit(1)
          .maybeSingle();

        const fornitore = mapping?.fornitori?.ragione_sociale || "—";

        card.innerHTML = `

          <div class="rf-doc-item">

            <div class="rf-doc-title">
              ${row.dataset.label}
            </div>

            <div class="rf-doc-meta">
              <span>UM: ${um}</span>
            </div>

            <div class="rf-doc-meta">
              <span>Fornitore: ${fornitore}</span>
            </div>

          </div>

        `;

        card.style.display = "block";

        risultati.innerHTML = "";

        form.style.display = "block";

      };

    });

  };

  btnConferma.onclick = async () => {

    const q = Number(qtaEl.value || 0);
    const d = dataEl.value;
    const note = noteEl.value || "";

    if (!prodottoId) {
      alert("Seleziona un prodotto");
      return;
    }

    if (!q || q <= 0) {
      alert("Inserisci quantità valida");
      return;
    }

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
        note: note
      });

    if (error) {
      esitoEl.innerText = "Errore";
      return;
    }

    esitoEl.innerText = "Carico registrato ✔";

    setTimeout(() => close(), 400);

  };

}
