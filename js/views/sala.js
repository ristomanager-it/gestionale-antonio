export async function render(container) {

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>🪑 Sala</h1>
      </div>

      <div class="card">
        <div id="sala-container" class="sala-mappa"></div>
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

    const oggi = new Date().toISOString().split("T")[0];

    const { data: tavoliData } = await window.supabaseClient
      .from("tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .eq("attivo", true);

    tavoli = tavoliData || [];

    const { data: statiData } = await window.supabaseClient
      .from("tavoli_stato")
      .select("*")
      .eq("azienda_id", aziendaId);

    stati = statiData || [];

    const { data: prenData } = await window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .eq("data", oggi);

    prenotazioni = prenData || [];

    renderSala();
  }

  function renderSala() {

    box.innerHTML = "";

    tavoli.forEach(t => {

      const stato = stati.find(s => s.tavolo_id === t.id);
      const pren = prenotazioni.find(p => p.tavolo_id === t.id);

      let classe = "libero";

      if (stato?.stato === "occupato") classe = "occupato";
      else if (pren) classe = "prenotato";

      const el = document.createElement("div");
      el.className = "tavolo-mappa " + classe;

      el.style.left = (t.pos_x || 0) + "px";
      el.style.top = (t.pos_y || 0) + "px";

      el.innerHTML = `
        <div class="nome">${t.nome}</div>
        <div class="coperti">${t.coperti_max}</div>
      `;

      enableDrag(el, t);

      el.onclick = () => {
        window.location.hash = "#/comanda?tavolo=" + t.id;
      };

      box.appendChild(el);
    });
  }

  function enableDrag(el, tavolo) {

    let isDragging = false;
    let offsetX, offsetY;

    el.onmousedown = (e) => {
      isDragging = true;
      offsetX = e.offsetX;
      offsetY = e.offsetY;
    };

    document.onmousemove = (e) => {
      if (!isDragging) return;

      const x = e.pageX - offsetX;
      const y = e.pageY - offsetY;

      el.style.left = x + "px";
      el.style.top = y + "px";
    };

    document.onmouseup = async () => {
      if (!isDragging) return;
      isDragging = false;

      const x = parseInt(el.style.left);
      const y = parseInt(el.style.top);

      await window.supabaseClient
        .from("tavoli")
        .update({
          pos_x: x,
          pos_y: y
        })
        .eq("id", tavolo.id);
    };
  }

  load();
}
