export async function render(container) {

  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const tavoloId = params.get("tavolo");

  container.innerHTML = `
    <div class="page">

      <div class="page-header">
        <h1>🍽️ Comanda</h1>
      </div>

      <div class="card">
        <div id="prodotti"></div>
      </div>

      <div class="card">
        <h3>🧾 Ordine</h3>
        <div id="righe"></div>
        <div id="totale"></div>
        <button class="app-button" id="chiudi">Chiudi Conto</button>
      </div>

    </div>
  `;

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  let comanda = null;
  let righe = [];

  await init();

  async function init() {

    // 🔥 cerca comanda aperta
    const { data } = await window.supabaseClient
      .from("comande")
      .select("*")
      .eq("tavolo_id", tavoloId)
      .eq("stato", "aperta")
      .maybeSingle();

    if (data) {
      comanda = data;
    } else {
      const { data: nuova } = await window.supabaseClient
        .from("comande")
        .insert([{
          azienda_id: aziendaId,
          sede_id: sedeId,
          tavolo_id: tavoloId
        }])
        .select()
        .single();

      comanda = nuova;
    }

    loadProdotti();
    loadRighe();
  }

  async function loadProdotti() {

    const { data } = await window.supabaseClient
      .from("prodotti")
      .select("*")
      .eq("azienda_id", aziendaId)
      .limit(30);

    const box = document.getElementById("prodotti");

    box.innerHTML = data.map(p => `
      <div class="prodotto" data-id="${p.id}">
        ${p.nome}
      </div>
    `).join("");

    box.querySelectorAll(".prodotto").forEach(el => {
      el.onclick = () => aggiungiProdotto(el.dataset.id, el.innerText);
    });
  }

  async function aggiungiProdotto(id, nome) {

    const prezzo = 10; // temporaneo

    await window.supabaseClient
      .from("comande_righe")
      .insert([{
        comanda_id: comanda.id,
        prodotto_id: id,
        nome_prodotto: nome,
        quantita: 1,
        prezzo,
        totale: prezzo
      }]);

    loadRighe();
  }

  async function loadRighe() {

    const { data } = await window.supabaseClient
      .from("comande_righe")
      .select("*")
      .eq("comanda_id", comanda.id);

    righe = data || [];

    renderRighe();
  }

  function renderRighe() {

    const box = document.getElementById("righe");

    box.innerHTML = righe.map(r => `
      <div class="riga">
        ${r.nome_prodotto} x${r.quantita} - €${r.totale}
      </div>
    `).join("");

    const totale = righe.reduce((acc, r) => acc + Number(r.totale), 0);

    document.getElementById("totale").innerHTML = `
      <strong>Totale: € ${totale.toFixed(2)}</strong>
    `;
  }

  document.getElementById("chiudi").onclick = async () => {

    await window.supabaseClient
      .from("comande")
      .update({ stato: "chiusa" })
      .eq("id", comanda.id);

    alert("Conto chiuso");

    window.location.hash = "#/sala";
  };

}
