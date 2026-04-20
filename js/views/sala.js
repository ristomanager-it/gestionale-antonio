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

  async function load() {

    box.innerHTML = "Caricamento sala...";

    // tavoli
    const { data: tavoliData } = await window.supabaseClient
      .from("tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .eq("attivo", true);

    tavoli = tavoliData || [];

    // stato tavoli (oggi)
    const oggi = new Date().toISOString().split("T")[0];

    const { data: statiData } = await window.supabaseClient
      .from("tavoli_stato")
      .select("*")
      .gte("created_at", oggi);

    stati = statiData || [];

    renderSala();
  }

  function renderSala() {

    if (!tavoli.length) {
      box.innerHTML = "Nessun tavolo configurato";
      return;
    }

    box.innerHTML = tavoli.map(t => {

      const stato = stati.find(s => s.tavolo_id === t.id);

      const statoTxt = stato?.stato || "libero";

      return `
        <div class="tavolo ${statoTxt}" data-id="${t.id}">
          <div class="tavolo-nome">${t.nome}</div>
          <div class="tavolo-coperti">${t.coperti_max} coperti</div>
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

        // 👉 SE LIBERO → APRI
        if (!stato || stato.stato === "libero") {

          await window.supabaseClient
            .from("tavoli_stato")
            .insert([{
              tavolo_id: tavoloId,
              azienda_id: aziendaId,
              stato: "occupato",
              ora_apertura: new Date().toISOString()
            }]);

        } else {

          // 👉 SE OCCUPATO → CHIUDI
          await window.supabaseClient
            .from("tavoli_stato")
            .update({
              stato: "libero",
              ora_chiusura: new Date().toISOString()
            })
            .eq("id", stato.id);
        }

        load();
      };
    });
  }

  load();
}
