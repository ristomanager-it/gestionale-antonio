export function renderCaricoModal() {

  return `

  <div id="rf-carico-backdrop" class="rf-modal-backdrop" style="display:none;">

    <div class="rf-modal rf-modal-small">

      <div class="rf-modal-header">
        <h3 class="rf-modal-title">Carico Magazzino</h3>
        <button id="btn-close-carico" class="app-button tiny gray">Chiudi</button>
      </div>

      <div class="rf-modal-body">

        <div class="rf-field">
          <label>Prodotto</label>
          <input
            id="carico-search"
            class="input"
            placeholder="Cerca prodotto..."
            autocomplete="off"
          >
        </div>

        <div id="carico-risultati" style="margin-top:8px;"></div>

        <div id="carico-form" style="display:none; margin-top:12px;">

          <div class="rf-field">
            <label>Quantità</label>
            <input id="carico-quantita" type="number" step="0.001" class="input">
          </div>

          <div class="rf-field" style="margin-top:10px;">
            <label>Data movimento</label>
            <input id="carico-data" type="date" class="input">
          </div>

          <div class="rf-field" style="margin-top:10px;">
            <label>Note</label>
            <input id="carico-note" class="input">
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
  const search = document.getElementById("carico-search");
  const risultati = document.getElementById("carico-risultati");
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

  dataEl.value = new Date().toISOString().slice(0, 10);
  noteEl.value = "Inventario";

  const close = () => {
    backdrop.style.display = "none";
    risultati.innerHTML = "";
    form.style.display = "none";
  };

  btnClose.onclick = close;
  btnAnnulla.onclick = close;

  backdrop.onclick = (e) => {
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
      .select("id, descrizione")
      .eq("azienda_id", aziendaId)
      .ilike("descrizione", `%${term}%`)
      .limit(10);

    risultati.innerHTML = `

      <div class="rf-doc-list">

        ${(data || []).map(p => `

          <div class="rf-doc-item carico-item" data-id="${p.id}">
            <div class="rf-doc-title">${p.descrizione}</div>
          </div>

        `).join("")}

      </div>

    `;

    risultati.querySelectorAll(".carico-item").forEach(row => {

      row.onclick = () => {

        prodottoId = row.dataset.id;
        risultati.innerHTML = "";
        form.style.display = "block";

      };

    });

  };

  btnConferma.onclick = async () => {

    const q = Number(qtaEl.value || 0);
    const d = dataEl.value;
    const note = noteEl.value || "";

    if (!prodottoId) return alert("Seleziona un prodotto");
    if (!q || q <= 0) return alert("Inserisci quantità valida");

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

      esitoEl.innerText = "Errore durante il salvataggio";
      console.error(error);
      return;

    }

    esitoEl.innerText = "Carico registrato ✔";

    setTimeout(() => {
      close();
    }, 400);

  };

}
