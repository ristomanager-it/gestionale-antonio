export async function render(container) {
  const aziendaId = window.state?.azienda?.id || null;
  const sedeId = window.state?.sedeAttiva?.id || null;

  const today = new Date();

  container.innerHTML = `
<div class="view">

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
    <h3 style="margin:0;">Prenotazioni Rifiutate</h3>
    <button id="btn-refresh" class="app-button">↻</button>
  </div>

  <div style="margin-bottom:10px;">
    <input type="date" id="filtro-data" class="input" />
  </div>

  <div id="lista"></div>

  <div style="
    position:fixed;
    bottom:80px;
    right:20px;
    z-index:1000;
  ">
    <button id="go-prenotazioni" class="app-button primary">📋</button>
  </div>

</div>
`;

  const lista = document.getElementById("lista");
  const filtroData = document.getElementById("filtro-data");

  filtroData.value = formatDateInput(today);

  document.getElementById("btn-refresh").onclick = load;
  document.getElementById("go-prenotazioni").onclick = () => {
    window.location.hash = "#/prenotazioni";
  };

  filtroData.onchange = load;

  async function load() {
    lista.innerHTML = `<div>Caricamento...</div>`;

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("stato", "rifiutata")
      .order("ora", { ascending: true });

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.eq("sede_id", sedeId);
    }

    if (filtroData.value) {
      query = query.eq("data", filtroData.value);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      lista.innerHTML = `<div>Errore caricamento</div>`;
      return;
    }

    if (!data || !data.length) {
      lista.innerHTML = `<div>Nessuna prenotazione rifiutata</div>`;
      return;
    }

    lista.innerHTML = data.map(renderRow).join("");
    attachEvents();
  }

  function renderRow(p) {
    const nome = ((p.cliente_nome || "") + " " + (p.cognome || "")).trim() || "Cliente";
    const ora = p.ora ? p.ora.slice(0, 5) : "--:--";

    return `
      <div class="pren-row">

        <div class="pren-col ora">
          ${ora}
        </div>

        <div class="pren-col main">
          <div class="pren-nome">${escapeHtml(nome)}</div>
          <div class="pren-summary">
            ${p.coperti || 0} coperti · RIFIUTATA
          </div>
        </div>

        <div class="pren-col right">
          <span class="pren-ico" data-riattiva="${p.id}">🔄</span>
          <span class="pren-ico" data-elimina="${p.id}">🗑</span>
          <span class="pren-ico" data-dettaglio="${p.id}">➡️</span>
        </div>

      </div>
    `;
  }

  function attachEvents() {
    document.querySelectorAll("[data-riattiva]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.riattiva;
        await updateStato(id, "in_attesa");
      };
    });

    document.querySelectorAll("[data-elimina]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.elimina;

        if (!confirm("Eliminare definitivamente?")) return;

        let query = window.supabaseClient
          .from("prenotazioni_tavoli")
          .delete()
          .eq("id", id);

        if (aziendaId) query = query.eq("azienda_id", aziendaId);
        if (sedeId) query = query.eq("sede_id", sedeId);

        const { error } = await query;

        if (error) {
          console.error(error);
          alert("Errore eliminazione");
          return;
        }

        await load();
      };
    });

    document.querySelectorAll("[data-dettaglio]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.dettaglio;
        window.location.hash = "#/prenotazioni-dettaglio?id=" + id;
      };
    });
  }

  async function updateStato(id, stato) {
    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .update({ stato })
      .eq("id", id);

    if (aziendaId) query = query.eq("azienda_id", aziendaId);
    if (sedeId) query = query.eq("sede_id", sedeId);

    const { error } = await query;

    if (error) {
      console.error(error);
      alert("Errore aggiornamento");
      return;
    }

    await load();
  }

  function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  await load();
}
