// js/views/gestione-aziende.js
import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Accesso negato</h3>
          <p>Sezione riservata alla piattaforma.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Gestione Aziende</h2>

      <div id="status-cards" style="display:flex; gap:12px; margin-top:18px; flex-wrap:wrap;"></div>

      <div id="lista-dettaglio" style="margin-top:18px;"></div>

      <div style="margin-top:30px;">
        <input 
          id="search-input" 
          class="input-pill"
          placeholder="Cerca azienda (min 2 caratteri)"
        />
      </div>

      <div id="search-results" style="margin-top:16px;"></div>

      <div style="margin-top:24px;">
        <button class="app-button small gray" id="btn-home">
          ⬅ Dashboard
        </button>
      </div>
    </div>
  `;

  document.getElementById("btn-home").onclick = () => {
    window.location.hash = "#/home";
  };

  await caricaStatoScadenzeAziende();

  // ======= RICERCA (intatta) =======
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  results.innerHTML = `<p class="small-muted">Digita per cercare un’azienda.</p>`;

  input.addEventListener("input", async () => {
    const q = input.value.trim();

    if (q.length < 2) {
      results.innerHTML = `<p class="small-muted">Digita almeno 2 caratteri.</p>`;
      return;
    }

    const filter =
      "nome.ilike.%" + q + "%," +
      "codice.ilike.%" + q + "%," +
      "email.ilike.%" + q + "%," +
      "partita_iva.ilike.%" + q + "%";

    const { data, error } = await supabase
      .from("aziende")
      .select("id,nome,codice,email,referente,stato")
      .or(filter)
      .limit(20);

    if (error) {
      results.innerHTML = `<p style="color:#dc2626;">Errore ricerca.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      results.innerHTML = `<p class="small-muted">Nessuna azienda trovata.</p>`;
      return;
    }

    results.innerHTML = "";

    data.forEach((azienda) => {
      const card = document.createElement("div");
      card.className = "view";
      card.style.marginBottom = "12px";

      card.innerHTML = `
        <strong>${azienda.nome}</strong><br>
        <span class="small-muted">Codice: ${azienda.codice}</span><br>
        <span class="small-muted">Email: ${azienda.email || "-"}</span><br>
        <span class="small-muted">Stato: ${azienda.stato}</span>
        <div style="margin-top:10px;">
          <button class="app-button small gray btn-apri">
            ✏️ Apri scheda
          </button>
        </div>
      `;

      card.querySelector(".btn-apri").onclick = () => {
        window.location.hash = "#/modificaAzienda?id=" + azienda.id;
      };

      results.appendChild(card);
    });
  });
}


// ===============================
// NUOVA UI STATO VISIVO
// ===============================
async function caricaStatoScadenzeAziende() {
  const { data, error } = await supabase
    .from("aziende")
    .select("id,nome,data_scadenza")
    .eq("stato_attivazione", "attiva");

  if (error) return;

  const oggi = new Date();
  oggi.setHours(0,0,0,0);

  const gruppi = {
    verde: [],
    giallo: [],
    rosso: []
  };

  data.forEach((az) => {
    if (!az.data_scadenza) {
      gruppi.verde.push(az);
      return;
    }

    const scadenza = new Date(az.data_scadenza);
    scadenza.setHours(0,0,0,0);

    const diff = Math.floor((scadenza - oggi) / (1000*60*60*24));

    if (diff < 0) gruppi.rosso.push({ ...az, giorni: diff });
    else if (diff <= 15) gruppi.giallo.push({ ...az, giorni: diff });
    else gruppi.verde.push({ ...az, giorni: diff });
  });

  const container = document.getElementById("status-cards");
  const dettaglio = document.getElementById("lista-dettaglio");

  container.innerHTML = "";
  dettaglio.innerHTML = "";

  const config = [
    { key: "verde", colore: "#16a34a", label: "Regolari" },
    { key: "giallo", colore: "#eab308", label: "In scadenza" },
    { key: "rosso", colore: "#dc2626", label: "Scadute" }
  ];

  config.forEach((c) => {
    const card = document.createElement("div");
    card.className = "view";
    card.style.cursor = "pointer";
    card.style.flex = "1";
    card.style.minWidth = "140px";

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="
          width:14px;
          height:14px;
          border-radius:50%;
          background:${c.colore};
        "></div>
        <strong>${c.label}</strong>
      </div>
      <div style="font-size:22px; margin-top:8px;">
        ${gruppi[c.key].length}
      </div>
    `;

    card.onclick = () => {
      mostraDettaglio(c.key, gruppi[c.key], c.label);
    };

    container.appendChild(card);
  });

  function mostraDettaglio(key, lista, titolo) {
    dettaglio.innerHTML = `
      <div class="view">
        <h3>${titolo}</h3>
        <div id="lista-interna"></div>
      </div>
    `;

    const interno = document.getElementById("lista-interna");

    if (lista.length === 0) {
      interno.innerHTML = `<p class="small-muted">Nessuna azienda.</p>`;
      return;
    }

    lista.forEach((az) => {
      const riga = document.createElement("div");
      riga.style.padding = "8px 0";
      riga.style.borderBottom = "1px solid #e5e7eb";

      let testo = az.nome;

      if (az.giorni !== undefined) {
        if (az.giorni < 0)
          testo += ` — scaduta da ${Math.abs(az.giorni)} giorni`;
        else
          testo += ` — scade tra ${az.giorni} giorni`;
      }

      riga.textContent = testo;
      interno.appendChild(riga);
    });
  }
}
