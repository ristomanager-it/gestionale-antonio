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

      <div style="display:flex; gap:24px; flex-wrap:wrap; align-items:center; margin-top:20px;">
        <canvas id="grafico-scadenze" width="180" height="180"></canvas>
        <div id="status-cards" style="flex:1; display:flex; gap:14px; flex-wrap:wrap;"></div>
      </div>

      <div id="lista-dettaglio"
           style="margin-top:20px; overflow:hidden; max-height:0; transition:max-height 0.4s ease;">
      </div>

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
}

async function caricaStatoScadenzeAziende() {
  const { data } = await supabase
    .from("aziende")
    .select("id,nome,data_scadenza")
    .eq("stato_attivazione", "attiva");

  const oggi = new Date();
  oggi.setHours(0,0,0,0);

  const gruppi = { verde: [], giallo: [], rosso: [] };

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

  const totale = data.length || 1;

  const percentuali = {
    verde: Math.round((gruppi.verde.length / totale) * 100),
    giallo: Math.round((gruppi.giallo.length / totale) * 100),
    rosso: Math.round((gruppi.rosso.length / totale) * 100)
  };

  creaGrafico(percentuali);
  creaCard(gruppi, percentuali);
}

function creaGrafico(percentuali) {
  const canvas = document.getElementById("grafico-scadenze");
  const ctx = canvas.getContext("2d");

  const colori = {
    verde: "#16a34a",
    giallo: "#eab308",
    rosso: "#dc2626"
  };

  let start = 0;

  Object.keys(percentuali).forEach((key) => {
    const slice = (percentuali[key] / 100) * (Math.PI * 2);

    ctx.beginPath();
    ctx.moveTo(90, 90);
    ctx.arc(90, 90, 80, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colori[key];
    ctx.fill();

    start += slice;
  });

  ctx.beginPath();
  ctx.arc(90, 90, 50, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function creaCard(gruppi, percentuali) {
  const container = document.getElementById("status-cards");
  const dettaglio = document.getElementById("lista-dettaglio");

  container.innerHTML = "";

  const config = [
    { key: "verde", colore: "#16a34a", label: "Regolari" },
    { key: "giallo", colore: "#eab308", label: "In scadenza" },
    { key: "rosso", colore: "#dc2626", label: "Scadute" }
  ];

  config.forEach((c) => {
    const card = document.createElement("div");
    card.style.flex = "1";
    card.style.minWidth = "160px";
    card.style.padding = "16px";
    card.style.borderRadius = "18px";
    card.style.background = "#ffffff";
    card.style.boxShadow = "0 10px 25px rgba(0,0,0,0.08)";
    card.style.cursor = "pointer";
    card.style.transition = "transform 0.2s ease";

    card.onmouseenter = () => card.style.transform = "translateY(-4px)";
    card.onmouseleave = () => card.style.transform = "translateY(0px)";

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:12px; height:12px; border-radius:50%; background:${c.colore};"></div>
          <strong>${c.label}</strong>
        </div>
        <span style="font-size:13px; color:#6b7280;">${percentuali[c.key]}%</span>
      </div>
      <div style="font-size:26px; margin-top:8px;">
        ${gruppi[c.key].length}
      </div>
    `;

    card.onclick = () => {
      mostraDettaglio(gruppi[c.key], c.label);
    };

    container.appendChild(card);
  });

  function mostraDettaglio(lista, titolo) {
    dettaglio.innerHTML = `
      <div class="view">
        <h3>${titolo}</h3>
        <div id="lista-interna"></div>
      </div>
    `;

    const interno = document.getElementById("lista-interna");

    if (lista.length === 0) {
      interno.innerHTML = `<p class="small-muted">Nessuna azienda.</p>`;
    } else {
      lista.forEach((az) => {
        const riga = document.createElement("div");
        riga.style.padding = "10px 0";
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

    dettaglio.style.maxHeight = "800px";
  }
}
