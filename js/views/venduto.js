export async function render(container) {
  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;

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
      </div>

      <div class="card" style="margin-top:24px;">
        <h3>Importa CSV</h3>
        <input type="file" id="venduto-csv" accept=".csv" class="input-pill" />
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

  dataInput.value = new Date().toISOString().split("T")[0];

  const { data: prodotti } = await supabase
    .from("prodotti")
    .select("id, descrizione")
    .order("descrizione", { ascending: true });

  prodottoSelect.innerHTML = `<option value="">Seleziona prodotto</option>`;

  (prodotti || []).forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.descrizione;
    prodottoSelect.appendChild(opt);
  });

  document
    .getElementById("btn-salva-venduto")
    .addEventListener("click", async () => {
      const prodotto_id = prodottoSelect.value;
      const quantita = parseFloat(quantitaInput.value || 0);
      const prezzo = parseFloat(prezzoInput.value || 0);
      const data_vendita = dataInput.value;
      const canale = canaleSelect.value;

      if (!prodotto_id || quantita <= 0) {
        alert("Compila correttamente i campi.");
        return;
      }

      const totale = quantita * prezzo;

      const { error } = await supabase.from("vendite_giornaliere").insert({
        azienda_id: azienda.id,
        data_vendita,
        canale,
        prodotto_id: parseInt(prodotto_id),
        nome_articolo:
          prodottoSelect.options[prodottoSelect.selectedIndex].text,
        quantita,
        prezzo_unitario: prezzo,
        totale_riga: totale,
      });

      if (error) {
        alert("Errore salvataggio: " + error.message);
        return;
      }

      quantitaInput.value = "";
      prezzoInput.value = "";

      await caricaVendite();
    });

  async function caricaVendite() {
    const { data } = await supabase
      .from("vendite_giornaliere")
      .select("*")
      .order("data_vendita", { ascending: false })
      .limit(20);

    const lista = document.getElementById("venduto-lista");
    lista.innerHTML = "";

    (data || []).forEach(r => {
      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `
        <strong>${r.data_vendita}</strong> - ${r.nome_articolo}
        | Q: ${r.quantita}
        | € ${r.totale_riga}
      `;
      lista.appendChild(div);
    });
  }

  await caricaVendite();

  document
    .getElementById("venduto-csv")
    .addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const rows = text.split("\n").slice(1);

      for (const row of rows) {
        const cols = row.split(",");
        if (cols.length < 4) continue;

        const data_vendita = cols[0];
        const nome = cols[1];
        const quantita = parseFloat(cols[2]);
        const totale = parseFloat(cols[3]);

        const prodottoMatch = prodotti.find(
          p => p.descrizione.toLowerCase() === nome.toLowerCase()
        );

        if (!prodottoMatch) continue;

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
      }

      await caricaVendite();
      alert("Import CSV completato.");
    });
}
