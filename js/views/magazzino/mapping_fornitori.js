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
            placeholder="Cerca prodotto..."
            autocomplete="off"
          />
        </div>

        <div id="carico-risultati" style="margin-top:8px;"></div>

        <div id="carico-prodotto" style="display:none; margin-top:12px;"></div>

        <div id="carico-form" style="display:none; margin-top:12px;">

          <div class="rf-field">
            <label>Quantità</label>
            <input id="carico-quantita" type="number" step="0.001" class="input" />
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
    console.error("Overlay carico non trovato");
    return;
  }

  const search = document.getElementById("carico-search");
  const risultati = document.getElementById("carico-risultati");
  const prodottoBox = document.getElementById("carico-prodotto");
  const form = document.getElementById("carico-form");

  const qtaEl = document.getElementById("carico-quantita");
  const dataEl = document.getElementById("carico-data");
  const noteEl = document.getElementById("carico-note");
  const esitoEl = document.getElementById("carico-esito");

  const btnClose = document.getElementById("btn-close-carico");
  const btnAnnulla = document.getElementById("btn-annulla-carico");
  const btnConferma = document.getElementById("btn-conferma-carico");

  let prodottoId = null;
  let prodottoLabel = "";

  backdrop.style.display = "flex";

  risultati.innerHTML = "";
  prodottoBox.innerHTML = "";
  prodottoBox.style.display = "none";
  form.style.display = "none";
  esitoEl.innerText = "";

  qtaEl.value = "";
  dataEl.value = new Date().toISOString().slice(0,10);
  noteEl.value = "Inventario";

  const close = () => {
    backdrop.style.display = "none";
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

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, meta, descrizione")
      .eq("azienda_id", aziendaId)
      .or(`descrizione.ilike.%${term}%,meta.ilike.%${term}%`)
      .limit(10);

    if (error) {
      console.error(error);
      return;
    }

    risultati.innerHTML = (data || []).map(p => `

      <div class="rf-doc-item carico-item" data-id="${p.id}" data-label="${(p.meta || "")} — ${p.descrizione}">

        <div style="display:flex; justify-content:space-between; align-items:center;">

          <div class="rf-doc-title">
            ${(p.meta || "")} — ${p.descrizione}
          </div>

          <div style="font-size:18px;">
            🔍
          </div>

        </div>

      </div>

    `).join("");

    risultati.querySelectorAll(".carico-item").forEach(row => {

      row.onclick = async () => {

        prodottoId = row.dataset.id;
        prodottoLabel = row.dataset.label;

        risultati.innerHTML = "";

        prodottoBox.style.display = "block";

        prodottoBox.innerHTML = `

          <div class="rf-doc-item">

            <div class="rf-doc-title">
              ${prodottoLabel}
            </div>

          </div>

        `;

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
      alert("Inserisci una quantità valida");
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

      console.error(error);
      esitoEl.innerText = "Errore durante il salvataggio";
      return;

    }

    esitoEl.innerText = "Carico registrato ✔";

    setTimeout(() => {
      close();
    }, 500);

  };

}
