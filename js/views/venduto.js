export async function render(container) {
  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;

  if (!azienda) {
    container.innerHTML = `<div class="view"><div class="card">Azienda non attiva</div></div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <div class="card">
        <h2>Venduto</h2>

        <div class="form-grid">

          <div class="input-group">
            <label>Data vendita</label>
            <input type="date" id="venduto-data" class="input-pill" />
          </div>

          <div class="input-group">
            <label>Canale</label>
            <select id="venduto-canale" class="input-pill">
              <option value="NR">NR</option>
              <option value="RA">RA</option>
              <option value="CC">CC</option>
              <option value="CAT">CAT</option>
            </select>
          </div>

          <div class="input-group">
            <label>Prodotto</label>
            <select id="venduto-prodotto" class="input-pill"></select>
          </div>

          <div class="input-group">
            <label>Quantità</label>
            <input type="number" step="0.01" id="venduto-quantita" class="input-pill" />
          </div>

          <div class="input-group">
            <label>Prezzo unitario</label>
            <input type="number" step="0.01" id="venduto-prezzo" class="input-pill" />
          </div>

        </div>

        <div style="margin-top:16px;">
          <button id="btn-salva-venduto" class="app-button">Salva Vendita</button>
        </div>

        <div id="venduto-feedback" style="margin-top:12px;"></div>

      </div>

      <div class="card" style="margin-top:24px;">
        <h3>Importa CSV</h3>
        <input type="file" id="venduto-csv" accept=".csv" class="input-pill" />
        <div id="csv-feedback" style="margin-top:10px;"></div>
      </div>

      <div class="card" style="margin-top:24px;">
        <h3>Vendite Recenti</h3>
        <div id="venduto-lista"></div>
      </div>

    </div>
  `;

  const dataInput = document.getElementById("venduto-data");
  const prodottoSelect = document.getElementById("venduto-prodotto");
  const quantitaInput = document.getElementById("venduto-quantita");
  const prezzoInput = document.getElementById("venduto-prezzo");
  const canaleSelect = document.getElementById("venduto-canale");
  const feedback = document.getElementById("venduto-feedback");
  const csvFeedback = document.getElementById("csv-feedback");

  dataInput.value = new Date().toISOString().split("T")[0];

  /* =========================================================
     CARICA PRODOTTI
  ========================================================= */

  const { data: prodotti, error: prodottiError } = await supabase
    .from("prodotti")
    .select("id, descrizione")
    .order("descrizione", { ascending: true });

  if (prodottiError) {
    feedback.innerHTML = `<div class="pill pill-error">Errore caricamento prodotti</div>`;
    return;
  }

  prodottoSelect.innerHTML = `<option value="">Seleziona prodotto</option>`;

  (prodotti || []).forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.descrizione;
    prodottoSelect.appendChild(opt);
  });

  /* =========================================================
     SALVA MANUALE
  ========================================================= */

  document
    .getElementById("btn-salva-venduto")
    .addEventListener("click", async () => {

      feedback.innerHTML = "";

      const prodotto_id = prodottoSelect.value;
      const quantita = parseFloat(quantitaInput.value);
      const prezzo = parseFloat(prezzoInput.value);
      const data_vendita = dataInput.value;
      const canale = canaleSelect.value;

      if (!prodotto_id || !data_vendita || isNaN(quantita) || quantita <= 0) {
        feedback.innerHTML = `<div class="pill pill-error">Compila correttamente i campi.</div>`;
        return;
      }

      const prezzoFinale = isNaN(prezzo) ? 0 : prezzo;
      const totale = quantita * prezzoFinale;

      const { error } = await supabase.from("vendite_giornaliere").insert({
        azienda_id: azienda.id,
        data_vendita,
        canale,
        prodotto_id: parseInt(prodotto_id),
        nome_articolo:
          prodottoSelect.options[prodottoSelect.selectedIndex].text,
        quantita,
        prezzo_unitario: prezzoFinale,
        totale_riga: totale,
      });

      if (error) {
        feedback.innerHTML = `<div class="pill pill-error">${error.message}</div>`;
        return;
      }

      quantitaInput.value = "";
      prezzoInput.value = "";

      feedback.innerHTML = `<div class="pill pill-success">Vendita salvata</div>`;

      await caricaVendite();
    });

  /* =========================================================
     CARICA VENDITE
  ========================================================= */

  async function caricaVendite() {
    const { data } = await supabase
      .from("vendite_giornaliere")
      .select("*")
      .order("data_vendita", { ascending: false })
      .limit(30);

    const lista = document.getElementById("venduto-lista");
    lista.innerHTML = "";

    (data || []).forEach(r => {
      const div = document.createElement("div");
      div.className = "card";
      div.style.marginBottom = "8px";
      div.innerHTML = `
        <strong>${r.data_vendita}</strong> – ${r.nome_articolo}
        <br>
        Quantità: ${r.quantita} | Totale: € ${r.totale_riga}
      `;
      lista.appendChild(div);
    });
  }

  await caricaVendite();

  /* =========================================================
     IMPORT CSV ROBUSTO
  ========================================================= */

  document
    .getElementById("venduto-csv")
    .addEventListener("change", async (e) => {

      csvFeedback.innerHTML = "";

      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const rows = text.split(/\r?\n/).slice(1);

      let inseriti = 0;
      let nonTrovati = [];

      for (const row of rows) {
        if (!row.trim()) continue;

        const cols = row.split(",");
        if (cols.length < 4) continue;

        const data_vendita = cols[0]?.trim();
        const nome = cols[1]?.trim();
        const quantita = parseFloat(cols[2]);
        const totale = parseFloat(cols[3]);

        if (!data_vendita || !nome || isNaN(quantita) || quantita <= 0) {
          continue;
        }

        const prodottoMatch = prodotti.find(
          p => p.descrizione.toLowerCase() === nome.toLowerCase()
        );

        if (!prodottoMatch) {
          nonTrovati.push(nome);
          continue;
        }

        await supabase.from("vendite_giornaliere").insert({
          azienda_id: azienda.id,
          data_vendita,
          canale: "NR",
          prodotto_id: prodottoMatch.id,
          nome_articolo: nome,
          quantita,
          prezzo_unitario: totale / quantita,
          totale_riga: totale,
        });

        inseriti++;
      }

      await caricaVendite();

      csvFeedback.innerHTML = `
        <div class="pill pill-success">Import completato. Inseriti: ${inseriti}</div>
        ${
          nonTrovati.length > 0
            ? `<div class="pill pill-warning">Non trovati: ${nonTrovati.join(", ")}</div>`
            : ""
        }
      `;
    });
}
