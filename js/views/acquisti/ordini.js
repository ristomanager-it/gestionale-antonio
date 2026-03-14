export async function renderOrdini(container, azienda) {

  const supabase = window.supabaseClient;

  container.innerHTML = `

  <div class="card">

    <h3>Scrivi ordine</h3>

    <div id="lista-ordine"></div>

    <button id="btn-add-riga" class="app-button">
      + aggiungi riga
    </button>

  </div>

  <div id="ordini-generati"></div>

  `;

  const lista = container.querySelector("#lista-ordine");

  function addRiga() {

    const row = document.createElement("div");

    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.marginBottom = "8px";

    row.innerHTML = `

      <input class="input nome-prodotto" placeholder="Prodotto">

      <input class="input qta-prodotto" type="number" value="1" style="width:80px">

    `;

    lista.appendChild(row);

  }

  document
    .getElementById("btn-add-riga")
    .addEventListener("click", addRiga);

  addRiga();

  container.addEventListener("change", generaOrdini);

  async function generaOrdini() {

    const righe = [];

    document.querySelectorAll("#lista-ordine > div").forEach(r => {

      const nome = r.querySelector(".nome-prodotto").value.trim();
      const qta = parseFloat(r.querySelector(".qta-prodotto").value || 0);

      if (nome && qta > 0) {

        righe.push({
          nome,
          quantita:qta
        });

      }

    });

    if (!righe.length) return;

    const { data:prodotti } = await supabase
      .from("prodotti")
      .select("id,nome,fornitore_preferito_id");

    const ordini = {};

    for (const r of righe) {

      const prod = prodotti.find(p =>
        p.nome.toLowerCase() === r.nome.toLowerCase()
      );

      if (!prod) continue;

      const fornitore = prod.fornitore_preferito_id || "senza";

      if (!ordini[fornitore]) {
        ordini[fornitore] = [];
      }

      ordini[fornitore].push({
        nome:r.nome,
        quantita:r.quantita
      });

    }

    renderOrdiniFornitori(ordini);

  }

  async function renderOrdiniFornitori(ordini) {

    const wrapper = container.querySelector("#ordini-generati");

    let html = `<div class="card"><h3>Ordini generati</h3>`;

    for (const fornitoreId in ordini) {

      let nomeFornitore = "Senza fornitore";

      if (fornitoreId !== "senza") {

        const { data } = await supabase
          .from("fornitori")
          .select("ragione_sociale")
          .eq("id", fornitoreId)
          .single();

        nomeFornitore = data?.ragione_sociale || nomeFornitore;

      }

      html += `

      <div style="margin-top:16px">

        <strong>${nomeFornitore}</strong>

        <ul>

          ${ordini[fornitoreId].map(p => `
            <li>${p.nome} — ${p.quantita}</li>
          `).join("")}

        </ul>

      </div>

      `;

    }

    html += "</div>";

    wrapper.innerHTML = html;

  }

}
