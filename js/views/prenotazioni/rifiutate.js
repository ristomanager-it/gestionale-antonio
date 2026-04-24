export async function render(container) {
  const aziendaId = window.state?.azienda?.id || null;
  const sedeId = window.state?.sedeAttiva?.id || null;

  container.innerHTML = `
<div class="view" style="position:relative;min-height:100vh;background:#f7f9fc;padding-bottom:90px;">

  <div style="
    position:sticky;
    top:0;
    background:#fff;
    padding:12px;
    border-bottom:1px solid #e5e7eb;
    z-index:10;
  ">
    <h2 style="margin:0;font-size:16px;">Prenotazioni Rifiutate</h2>
  </div>

  <div style="padding:10px;">
    <div style="margin-bottom:10px;display:flex;gap:6px;">
      <input type="date" id="filtro-data" style="
        flex:1;
        height:36px;
        border-radius:8px;
        border:1px solid #e5e7eb;
        padding:0 8px;
      "/>
      <button id="btn-refresh" style="
        height:36px;
        border:none;
        border-radius:8px;
        background:#eef2f7;
        padding:0 10px;
        cursor:pointer;
      ">↻</button>
    </div>

    <div id="lista"></div>
  </div>

  <!-- FOOTER -->
  <div style="
    position:fixed;
    left:50%;
    transform:translateX(-50%);
    bottom:0;
    width:min(100%,560px);
    background:#ffffff;
    border-top:1px solid #e5e7eb;
    padding:8px 10px calc(8px + env(safe-area-inset-bottom));
    display:flex;
    justify-content:flex-end;
    z-index:50;
  ">
    <button id="go-prenotazioni" style="
      background:#0E5A7A;
      color:#ffffff;
      width:52px;
      height:52px;
      border:none;
      border-radius:18px;
      font-size:22px;
      cursor:pointer;
      box-shadow:0 8px 18px rgba(14,90,122,0.22);
    ">
      📋
    </button>
  </div>

</div>
`;

  const lista = document.getElementById("lista");
  const filtroData = document.getElementById("filtro-data");

  const today = new Date();
  filtroData.value = formatDateInput(today);

  document.getElementById("btn-refresh").onclick = load;
  filtroData.onchange = load;

  document.getElementById("go-prenotazioni").onclick = () => {
    window.location.hash = "#/prenotazioni";
  };

  async function load() {
    lista.innerHTML = `<div style="padding:12px;">Caricamento...</div>`;

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
      lista.innerHTML = `<div style="padding:12px;">Errore caricamento</div>`;
      return;
    }

    if (!data || !data.length) {
      lista.innerHTML = `<div style="padding:12px;">Nessuna prenotazione rifiutata</div>`;
      return;
    }

    lista.innerHTML = data.map(renderRow).join("");
    attachEvents();
  }

  function renderRow(p) {
    const nome = `${p.cliente_nome || ""} ${p.cognome || ""}`.trim();
    const ora = p.ora ? p.ora.slice(0, 5) : "--:--";

    return `
      <div style="
        background:#fff;
        border:1px solid #e5e7eb;
        border-radius:12px;
        padding:10px;
        margin-bottom:6px;
        box-shadow:0 2px 8px rgba(0,0,0,0.04);
      " data-id="${p.id}">

        <div style="font-weight:600;font-size:13px;">
          ${escapeHtml(nome || "Cliente")}
        </div>

        <div style="font-size:11px;color:#4b5563;margin-top:4px;">
          ${escapeHtml(p.data)} · ${ora} · ${p.coperti} coperti
        </div>

        <div style="display:flex;gap:6px;margin-top:8px;">
          <button data-riattiva="${p.id}" style="flex:1;border:none;border-radius:8px;background:#dcfce7;color:#166534;height:34px;">
            🔄 Riattiva
          </button>

          <button data-elimina="${p.id}" style="flex:1;border:none;border-radius:8px;background:#fee2e2;color:#991b1b;height:34px;">
            🗑
          </button>

          <button data-dettaglio="${p.id}" style="flex:1;border:none;border-radius:8px;background:#eef2f7;height:34px;">
            Apri
          </button>
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
    return \`\${y}-\${m}-\${d}\`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  await load();
}
