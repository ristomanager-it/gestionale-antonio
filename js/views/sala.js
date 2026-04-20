export async function render(container) {

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>🪑 Sala</h1>
      </div>

      <div class="card">
        <div id="sala-container" class="sala-grid"></div>
      </div>
    </div>
  `;

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  const box = document.getElementById("sala-container");

  let tavoli = [];
  let stati = [];
  let prenotazioni = [];

  async function load() {

    box.innerHTML = "Caricamento sala...";

    const oggi = new Date().toISOString().split("T")[0];

    // 🪑 tavoli
    const { data: tavoliData } = await window.supabaseClient
      .from("tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .eq("attivo", true);

    tavoli = tavoliData || [];

    // 🔴 stato tavoli
    const { data: statiData } = await window.supabaseClient
      .from("tavoli_stato")
      .select("*")
      .eq("azienda_id", aziendaId);

    stati = statiData || [];

    // 📅 prenotazioni oggi
    const { data: prenData } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .eq("data", oggi)
      .in("stato", ["confermata", "arrivata"]);

    prenotazioni = prenData || [];

    renderSala();
  }

  function renderSala() {

    if (!tavoli.length) {
      box.innerHTML = "Nessun tavolo configurato";
      return;
    }

    box.innerHTML = tavoli.map(t => {

      const stato = stati.find(s => s.tavolo_id === t.id);
      const pren = prenotazioni.find(p => p.tavolo_id === t.id);

      let statoTxt = "libero";
      let extra = "";

      if (stato && stato.stato === "occupato") {
        statoTxt = "occupato";
      } else if (pren) {
        statoTxt = "prenotato";
        extra = `
          <div class="tavolo-pren">
            ${pren.ora} · ${pren.cliente_nome}
          </div>
        `;
      }

      return `
        <div class="tavolo ${statoTxt}" data-id="${t.id}">
          <div class="tavolo-nome">${t.nome}</div>
          <div class="tavolo-coperti">${t.coperti_max} coperti</div>
          ${extra}
          <div class="tavolo-stato">${statoTxt}</div>
        </div>
      `;
    }).join("");

    attachEvents();
  }

  function attachEvents() {

    document.querySelectorAll(".tavolo").forEach(el => {

      el.onclick = async () => {

        const tavoloId = el.dataset.id;

        const stato = stati.find(s => s.tavolo_id === tavoloId);
        const pren = prenotazioni.find(p => p.tavolo_id === tavoloId);

        // 🔥 ARRIVO CLIENTE
        if (pren && pren.stato === "confermata") {
          await window.supabaseClient
            .from("prenotazioni_tavoli")
            .update({ stato: "arrivata" })
            .eq("id", pren.id);
        }

        // 🔥 SE LIBERO → OCCUPA
        if (!stato) {
          await window.supabaseClient
            .from("tavoli_stato")
            .insert([{
              tavolo_id: tavoloId,
              azienda_id: aziendaId,
              stato: "occupato",
              ora_apertura: new Date().toISOString()
            }]);
        }

        // 👉 VAI ALLA COMANDA
        window.location.hash = "#/comanda?tavolo=" + tavoloId;

      };
    });
  }

  load();
}
