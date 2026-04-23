export async function render(container) {
  const aziendaId = window.state?.azienda?.id || null;
  const sedeId = window.state?.sedeAttiva?.id || null;

  container.innerHTML = `
<div class="view">
  <h2>Prenotazioni Rifiutate</h2>

  <div style="margin-bottom:10px;">
    <input type="date" id="filtro-data" />
    <button id="btn-refresh">Aggiorna</button>
  </div>

  <div id="lista"></div>
</div>
`;

  const lista = document.getElementById("lista");
  const filtroData = document.getElementById("filtro-data");

  const today = new Date();
  filtroData.value = formatDateInput(today);

  document.getElementById("btn-refresh").onclick = load;
  filtroData.onchange = load;

  async function load() {
    lista.innerHTML = "Caricamento...";

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("stato", "rifiutata")
      .order("data", { ascending: false });

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
      lista.innerHTML = "Errore caricamento";
      return;
    }

    if (!data || !data.length) {
      lista.innerHTML = "Nessuna prenotazione rifiutata";
      return;
    }

    lista.innerHTML = data.map(renderRow).join("");

    attachEvents();
  }

  function renderRow(p) {
    const nome = `${p.cliente_nome || ""} ${p.cognome || ""}`.trim();
    const ora = p.ora ? p.ora.slice(0, 5) : "--:--";

    return `
      <div class="card" data-id="${p.id}" style="margin-bottom:8px;padding:10px;border:1px solid #ddd;">
        <div><strong>${escapeHtml(nome || "Cliente")}</strong></div>
        <div>${escapeHtml(p.data)} - ${ora} - ${p.coperti} coperti</div>

        <div style="margin-top:8px;display:flex;gap:6px;">
          <button data-riattiva="${p.id}">🔄 Riattiva</button>
          <button data-elimina="${p.id}">🗑 Elimina</button>
          <button data-dettaglio="${p.id}">Apri</button>
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

        const { error } = await window.supabaseClient
          .from("prenotazioni_tavoli")
          .delete()
          .eq("id", id);

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

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.eq("sede_id", sedeId);
    }

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
    return `${y}-${m}-${d}`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  await load();
}
