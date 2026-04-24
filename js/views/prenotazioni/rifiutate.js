export async function render(container) {
  const aziendaId = window.state?.azienda?.id || null;
  const sedeId = window.state?.sedeAttiva?.id || null;
  const sedeNome = window.state?.sedeAttiva?.nome || "Prenotazioni rifiutate";

  const today = new Date();

  container.innerHTML = `
<div class="view">

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
    <h3 style="margin:0;">${escapeHtml(sedeNome)} · Rifiutate</h3>
    <button id="btn-refresh">↻</button>
  </div>

  <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;">
    <div id="days" style="display:flex;gap:6px;overflow-x:auto;flex:1;"></div>
    <button id="btn-calendar">📅</button>
  </div>

  <input type="date" id="filtro-data" style="position:absolute;left:-9999px;" />

  <div id="lista"></div>

  <div style="position:fixed;bottom:80px;right:20px;">
    <button id="go-prenotazioni">📋</button>
  </div>

</div>
`;

  const lista = document.getElementById("lista");
  const filtroData = document.getElementById("filtro-data");
  const daysContainer = document.getElementById("days");

  filtroData.value = formatDateInput(today);

  const state = {
    daysCenter: new Date(),
  };

  document.getElementById("btn-refresh").onclick = load;
  document.getElementById("go-prenotazioni").onclick = () => {
    window.location.hash = "#/prenotazioni";
  };

  document.getElementById("btn-calendar").onclick = () => {
    try {
      if (filtroData.showPicker) {
        filtroData.showPicker();
      } else {
        filtroData.focus();
        setTimeout(() => filtroData.click(), 50);
      }
    } catch {
      filtroData.focus();
      setTimeout(() => filtroData.click(), 50);
    }
  };

  filtroData.onchange = async () => {
    state.daysCenter = new Date(filtroData.value);
    renderDays(true);
    await load();
  };

  function renderDays(centerScroll = false) {
    const base = new Date(state.daysCenter);
    const days = [];

    for (let i = -30; i <= 30; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d);
    }

    daysContainer.innerHTML = days.map(d => {
      const val = formatDateInput(d);
      const active = val === filtroData.value;

      return `
        <button data-day="${val}" style="
          min-width:60px;
          padding:6px;
          border-radius:10px;
          border:1px solid #e5e7eb;
          background:${active ? '#0E5A7A' : '#fff'};
          color:${active ? '#fff' : '#111'};
        ">
          <div style="font-size:10px">${getDay(d)}</div>
          <div style="font-weight:700">${d.getDate()}</div>
        </button>
      `;
    }).join("");

    daysContainer.querySelectorAll("[data-day]").forEach(btn => {
      btn.onclick = async () => {
        filtroData.value = btn.dataset.day;
        state.daysCenter = new Date(btn.dataset.day);
        renderDays(true);
        await load();
      };
    });

    if (centerScroll) {
      requestAnimationFrame(centerActiveDay);
    }
  }

  function centerActiveDay() {
    const active = daysContainer.querySelector("[data-day][style*='#0E5A7A']");
    if (!active) return;

    const left = active.offsetLeft - (daysContainer.clientWidth / 2) + (active.clientWidth / 2);
    daysContainer.scrollLeft = Math.max(0, left);
  }

  function attachInfiniteScroll() {
    daysContainer.addEventListener("scroll", () => {
      const threshold = 120;

      const nearLeft = daysContainer.scrollLeft < threshold;
      const nearRight =
        daysContainer.scrollLeft + daysContainer.clientWidth >
        daysContainer.scrollWidth - threshold;

      if (nearLeft) {
        state.daysCenter.setDate(state.daysCenter.getDate() - 15);
        renderDays(false);
        requestAnimationFrame(centerActiveDay);
      }

      if (nearRight) {
        state.daysCenter.setDate(state.daysCenter.getDate() + 15);
        renderDays(false);
        requestAnimationFrame(centerActiveDay);
      }
    }, { passive: true });
  }

  async function load() {
    lista.innerHTML = `Caricamento...`;

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*")
      .eq("stato", "rifiutata")
      .order("ora");

    if (aziendaId) query = query.eq("azienda_id", aziendaId);
    if (sedeId) query = query.eq("sede_id", sedeId);
    if (filtroData.value) query = query.eq("data", filtroData.value);

    const { data, error } = await query;

    if (error) {
      lista.innerHTML = `Errore`;
      return;
    }

    if (!data || !data.length) {
      lista.innerHTML = `Nessuna prenotazione`;
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
        <div class="pren-col ora">${ora}</div>

        <div class="pren-col main">
          <div class="pren-nome">${escapeHtml(nome)}</div>
          <div class="pren-summary">${p.coperti || 0} coperti · RIFIUTATA</div>
        </div>

        <div class="pren-col right">
          <span data-riattiva="${p.id}">🔄</span>
          <span data-elimina="${p.id}">🗑</span>
          <span data-dettaglio="${p.id}">➡️</span>
        </div>
      </div>
    `;
  }

  function attachEvents() {
    document.querySelectorAll("[data-riattiva]").forEach(btn => {
      btn.onclick = async () => {
        await updateStato(btn.dataset.riattiva, "in_attesa");
      };
    });

    document.querySelectorAll("[data-elimina]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Eliminare?")) return;

        await window.supabaseClient
          .from("prenotazioni_tavoli")
          .delete()
          .eq("id", btn.dataset.elimina);

        await load();
      };
    });

    document.querySelectorAll("[data-dettaglio]").forEach(btn => {
      btn.onclick = () => {
        window.location.hash = "#/prenotazioni-dettaglio?id=" + btn.dataset.dettaglio;
      };
    });
  }

  async function updateStato(id, stato) {
    await window.supabaseClient
      .from("prenotazioni_tavoli")
      .update({ stato })
      .eq("id", id);

    await load();
  }

  function formatDateInput(d) {
    return d.toISOString().split("T")[0];
  }

  function getDay(d) {
    return ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"][d.getDay()];
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  renderDays(true);
  attachInfiniteScroll();
  await load();
}
