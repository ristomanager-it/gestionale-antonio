export async function render(container) {
  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>📅 Prenotazioni</h1>
      </div>

      <div class="card">
        <div class="form-row">
          <div>
            <label>Data</label>
            <input type="date" id="filtro-data" class="input"/>
          </div>

          <div>
            <label>Stato</label>
            <select id="filtro-stato" class="input">
              <option value="">Tutti</option>
              <option value="nuova">Nuova</option>
              <option value="confermata">Confermata</option>
              <option value="arrivata">Arrivata</option>
              <option value="no_show">No Show</option>
              <option value="annullata">Annullata</option>
            </select>
          </div>

          <div style="display:flex;align-items:end;gap:10px;">
            <button class="app-button" id="btn-refresh">Aggiorna</button>
            <button class="app-button" id="btn-new">➕ Nuova</button>
            <button class="app-button" id="go-sala">🪑 Sala</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div id="lista-prenotazioni"></div>
      </div>

      <div id="modal-tavoli" class="modal" style="display:none;">
        <div class="modal-content">
          <h3>Seleziona Tavolo</h3>
          <div id="lista-tavoli"></div>
          <button class="app-button gray" id="close-modal">Chiudi</button>
        </div>
      </div>
    </div>
  `;

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  console.log("DEBUG FILTRI:", { aziendaId, sedeId });

  const lista = document.getElementById("lista-prenotazioni");
  const filtroData = document.getElementById("filtro-data");
  const filtroStato = document.getElementById("filtro-stato");

  const today = new Date().toISOString().split("T")[0];
  filtroData.value = today;

  document.getElementById("btn-refresh").onclick = load;

  document.getElementById("btn-new").onclick = () => {
    window.location.hash = "#/prenotazione-tavolo-form";
  };

  document.getElementById("go-sala").onclick = () => {
    window.location.hash = "#/sala";
  };

  document.getElementById("close-modal").onclick = () => {
    document.getElementById("modal-tavoli").style.display = "none";
  };

  let prenotazioni = [];
  let tavoli = [];
  let currentPrenId = null;

  async function load() {
    lista.innerHTML = "Caricamento...";

    let query = window.supabaseClient
      .from("prenotazioni_tavoli")
      .select("*");

    console.log("Filtro data:", filtroData.value);

    if (aziendaId) {
      query = query.eq("azienda_id", aziendaId);
    }

    if (sedeId) {
      query = query.eq("sede_id", sedeId);
    }

    if (filtroData.value) {
      query = query.eq("data", filtroData.value);
    }

    if (filtroStato.value) {
      query = query.eq("stato", filtroStato.value);
    }

    query = query.order("ora", { ascending: true });

    const { data, error } = await query;

    console.log("RISULTATO QUERY:", data);

    if (error) {
      console.error("ERRORE:", error);
      lista.innerHTML = `<div class="empty">Errore caricamento</div>`;
      return;
    }

    prenotazioni = data || [];

    if (!prenotazioni.length) {
      console.warn("Nessun risultato → provo senza filtri");

      const { data: allData, error: allError } = await window.supabaseClient
        .from("prenotazioni_tavoli")
        .select("*")
        .order("created_at", { ascending: false });

      if (allError) {
        console.error("ERRORE FALLBACK:", allError);
      }

      prenotazioni = allData || [];
    }

    if (!prenotazioni.length) {
      lista.innerHTML = `<div class="empty">Nessuna prenotazione</div>`;
      return;
    }

    lista.innerHTML = prenotazioni.map((p) => renderRow(p)).join("");

    attachEvents();
  }

  function renderRow(p) {
    return `
      <div class="pren-row">
        <div class="pren-main">
          <div class="pren-time">${p.ora || "-"}</div>

          <div class="pren-info">
            <div class="pren-nome">${p.cliente_nome || "Cliente"}</div>

            <div class="pren-sub">
              ${p.coperti || 0} coperti
              ${p.cliente_telefono ? " · " + p.cliente_telefono : ""}
            </div>

            <div class="pren-sub">
              🪑 ${p.tavolo_id ? "Tavolo assegnato" : "Non assegnato"}
            </div>
          </div>
        </div>

        <div class="pren-actions">
          <select class="change-stato" data-id="${p.id}">
            ${statoOptions(p.stato)}
          </select>

          <button class="app-button tiny assegna" data-id="${p.id}">
            Tavolo
          </button>
        </div>
      </div>
    `;
  }

  function statoOptions(current) {
    const stati = ["nuova", "confermata", "arrivata", "no_show", "annullata"];

    return stati.map((s) => `
      <option value="${s}" ${s === current ? "selected" : ""}>
        ${s}
      </option>
    `).join("");
  }

  function attachEvents() {
    document.querySelectorAll(".change-stato").forEach((el) => {
      el.onchange = async (e) => {
        const id = e.target.dataset.id;
        const stato = e.target.value;

        await window.supabaseClient
          .from("prenotazioni_tavoli")
          .update({ stato })
          .eq("id", id);

        load();
      };
    });

    document.querySelectorAll(".assegna").forEach((btn) => {
      btn.onclick = () => openTavoli(btn.dataset.id);
    });
  }

  async function openTavoli(prenId) {
    currentPrenId = prenId;

    const { data, error } = await window.supabaseClient
      .from("tavoli")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("sede_id", sedeId)
      .eq("attivo", true);

    if (error) {
      console.error("ERRORE TAVOLI:", error);
      return;
    }

    tavoli = data || [];

    renderTavoli();

    document.getElementById("modal-tavoli").style.display = "block";
  }

  function renderTavoli() {
    const box = document.getElementById("lista-tavoli");
    const pren = prenotazioni.find((p) => p.id == currentPrenId);

    if (!pren) {
      box.innerHTML = "Errore prenotazione";
      return;
    }

    const copertiRichiesti = pren.coperti || 0;

    const tavoliOrdinati = [...tavoli]
      .map((t) => ({
        ...t,
        diff: (t.coperti_max || 0) - copertiRichiesti
      }))
      .filter((t) => t.coperti_max >= copertiRichiesti)
      .sort((a, b) => a.diff - b.diff);

    if (!tavoliOrdinati.length) {
      box.innerHTML = `
        <div style="padding:20px;">
          ⚠️ Nessun tavolo abbastanza grande<br/>
          Coperti richiesti: <strong>${copertiRichiesti}</strong>
        </div>
      `;
      return;
    }

    box.innerHTML = tavoliOrdinati.map((t) => {
      const perfetto = t.diff === 0;
      const buono = t.diff <= 2;

      let classe = "tavolo-item";
      let badge = "";

      if (perfetto) {
        classe += " best";
        badge = "🔥 Perfetto";
      } else if (buono) {
        classe += " good";
        badge = "👍 Buono";
      }

      return `
        <div class="${classe}" data-id="${t.id}" style="
          border:1px solid #ddd;
          padding:10px;
          margin-bottom:8px;
          border-radius:8px;
          cursor:pointer;
        ">
          <strong>${t.nome}</strong>
          <div>${t.coperti_max} coperti</div>
          <div style="font-size:12px;color:#666;">
            Differenza: +${t.diff}
          </div>
          <div style="font-size:12px;color:#28a745;">
            ${badge}
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll(".tavolo-item").forEach((el) => {
      el.onclick = async () => {
        const tavoloId = el.dataset.id;

        await window.supabaseClient
          .from("prenotazioni_tavoli")
          .update({ tavolo_id: tavoloId })
          .eq("id", currentPrenId);

        document.getElementById("modal-tavoli").style.display = "none";

        load();
      };
    });
  }

  load();
}
