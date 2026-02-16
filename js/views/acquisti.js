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
      <h2>Modulo Acquisti</h2>

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
  renderFatture(content, azienda);
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

    <div id="righe-container" style="margin-top:20px;"></div>

    <button id="btn-salva-fattura" class="app-button small green">
      Salva e Processa
    </button>

    <div id="fattura-feedback" style="margin-top:10px;"></div>
  `;

  const righeContainer = document.getElementById("righe-container");
  const feedback = document.getElementById("fattura-feedback");
  let righe = [];

  /* ================= MATCH FUZZY ================= */

  async function matchProdottoFuzzy(descrizione, fornitoreId) {

    const { data, error } = await window.supabaseClient.rpc(
      "match_prodotto_fuzzy",
      {
        p_azienda_id: azienda.id,
        p_fornitore_id: fornitoreId || null,
        p_descrizione: descrizione
      }
    );

    if (error || !data?.length) return null;

    // prendi il match con score più alto
    const best = data.sort((a, b) => b.score - a.score)[0];

    return best;
  }

  /* ================= APPLY OCR ================= */

  async function applyOcrResult(result) {

    righe = [];
    righeContainer.innerHTML = "";

    const fornitoreId = document.getElementById("fattura-fornitore").value;

    for (const riga of result.righe || []) {

      const match = await matchProdottoFuzzy(
        riga.descrizione,
        fornitoreId
      );

      let prodottoId = null;
      let score = 0;
      let colore = "#fee2e2"; // rosso default
      let stato = "Non riconosciuto";

      if (match) {
        score = match.score;

        if (score >= 0.6) {
          colore = "#dcfce7"; // verde
          stato = "Match forte";
          prodottoId = match.prodotto_id;
        } else if (score >= 0.4) {
          colore = "#fef9c3"; // giallo
          stato = "Match debole";
          prodottoId = match.prodotto_id;
        }
      }

      righe.push({
        prodotto_id: prodottoId,
        quantita: riga.quantita || 0,
        prezzo_unitario: riga.prezzo_unitario || 0
      });

      const row = document.createElement("div");
      row.style.marginBottom = "10px";
      row.style.padding = "8px";
      row.style.borderRadius = "12px";
      row.style.background = colore;

      row.innerHTML = `
        <input type="text"
          value="${riga.descrizione || ""}"
          class="input-pill"
          readonly />

        <input type="number"
          value="${riga.quantita || 0}"
          class="input-pill"
          readonly />

        <input type="number"
          value="${riga.prezzo_unitario || 0}"
          class="input-pill"
          readonly />

        <small style="font-size:12px;">
          ${stato} (score ${score?.toFixed(2) || 0})
        </small>
      `;

      righeContainer.appendChild(row);
    }
  }

  /* ================= SALVATAGGIO ================= */

  document.getElementById("btn-salva-fattura")
    .addEventListener("click", async () => {

      try {

        const fornitoreId =
          document.getElementById("fattura-fornitore").value;

        if (!fornitoreId)
          throw new Error("Seleziona fornitore");

        const { data: fattura } = await window.supabaseClient
          .from("fatture_acquisto")
          .insert({
            azienda_id: azienda.id,
            fornitore_id: fornitoreId,
            numero_documento:
              document.getElementById("fattura-numero").value,
            data_documento:
              document.getElementById("fattura-data").value,
            origine: "ocr",
            stato_elaborazione: "da_verificare"
          })
          .select()
          .single();

        const righePulite = righe.filter(r => r.quantita);

        if (righePulite.length) {
          await window.supabaseClient
            .from("fatture_acquisto_righe")
            .insert(righePulite.map(r => ({
              azienda_id: azienda.id,
              fattura_id: fattura.id,
              prodotto_id: r.prodotto_id,
              quantita: r.quantita,
              prezzo_unitario: r.prezzo_unitario
            })));
        }

        feedback.innerHTML = "Fattura salvata.";

      } catch (err) {
        feedback.innerHTML = err.message;
      }

    });

}
