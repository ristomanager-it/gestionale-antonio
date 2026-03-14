export function renderCaricoModal() {

  return `
    <div id="magazzino-carico-backdrop"
      style="display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:9999; padding:16px; overflow:auto;">

      <div class="view"
        style="max-width:560px; margin:0 auto; border-radius:14px; padding:16px;">

        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center; flex-wrap:wrap;">
          <h3 style="margin:0;">📦 Carico Giacenza</h3>
          <button id="btn-close-carico" class="app-button tiny gray">✕ Chiudi</button>
        </div>

        <div class="small-muted" id="carico-prodotto-label" style="margin-top:8px;"></div>

        <div class="editor-stack" style="margin-top:12px;">

          <label>
            Quantità da caricare
            <input id="carico-quantita" type="number" step="0.001" min="0" class="input-pill" />
          </label>

          <label style="margin-top:10px;">
            Data movimento
            <input id="carico-data" type="date" class="input-pill" />
          </label>

          <label style="margin-top:10px;">
            Note
            <input id="carico-note" class="input-pill" />
          </label>

          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
            <button id="btn-conferma-carico" class="app-button green">✅ Registra Carico</button>
            <button id="btn-annulla-carico" class="app-button gray">Annulla</button>
          </div>

          <div id="carico-esito" class="small-muted" style="margin-top:10px;"></div>

        </div>

      </div>

    </div>
  `;

}

export function apriCaricoModal({ aziendaId, prodottoId, prodottoLabel, onSuccess }) {

  const backdrop = document.getElementById("magazzino-carico-backdrop");
  const btnClose = document.getElementById("btn-close-carico");
  const btnAnnulla = document.getElementById("btn-annulla-carico");
  const btnConferma = document.getElementById("btn-conferma-carico");

  const label = document.getElementById("carico-prodotto-label");
  const qtaEl = document.getElementById("carico-quantita");
  const dataEl = document.getElementById("carico-data");
  const noteEl = document.getElementById("carico-note");
  const esitoEl = document.getElementById("carico-esito");

  if (!backdrop) return;

  esitoEl.innerText = "";
  label.innerText = prodottoLabel || "Prodotto selezionato";

  qtaEl.value = "";
  dataEl.value = new Date().toISOString().slice(0, 10);
  noteEl.value = "Inventario iniziale";

  backdrop.style.display = "block";

  const close = () => {
    backdrop.style.display = "none";
    btnConferma.removeAttribute("disabled");
  };

  btnClose.onclick = close;
  btnAnnulla.onclick = close;

  backdrop.onclick = (e) => {
    if (e.target?.id === "magazzino-carico-backdrop") close();
  };

  btnConferma.onclick = async () => {

    const q = Number(qtaEl.value || 0);
    const d = (dataEl.value || "").trim();
    const note = (noteEl.value || "").trim();

    if (!q || q <= 0) return alert("Inserisci una quantità > 0.");
    if (!d) return alert("Seleziona una data.");

    btnConferma.setAttribute("disabled", "disabled");
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
      esitoEl.innerText = "Errore durante il carico.";
      btnConferma.removeAttribute("disabled");
      return;
    }

    esitoEl.innerText = "Carico registrato ✔️";

    setTimeout(() => {
      close();
      if (typeof onSuccess === "function") onSuccess();
    }, 350);

  };

}
