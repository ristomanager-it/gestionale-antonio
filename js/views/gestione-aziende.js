// js/views/gestione-aziende.js
import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({
        body: `<p>Sezione riservata alla piattaforma.</p>`
      })
    });
    return;
  }

  const content = `
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
  `;

  container.innerHTML = createPageLayout({
    title: "Gestione Aziende",
    subtitle: "Controllo stato attivazione e scadenze",
    content: createCard({ body: content })
  });

  document.getElementById("btn-home").onclick = () => {
    window.location.hash = "#/home";
  };

  await caricaStatoScadenzeAziende();
}

async function caricaStatoScadenzeAziende() {
  const { data } = await supabase
    .from("aziende")
    .select("id,nome,data_scadenza,stato")
    .neq("stato", "piattaforma");

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
  creaCardStato(gruppi, percentuali);
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

function creaCardStato(gruppi, percentuali) {
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
    card.className = "card";
    card.style.flex = "1";
    card.style.minWidth = "160px";
    card.style.cursor = "pointer";

    card.innerHTML = `
      <div class="card-body">
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
      </div>
    `;

    card.onclick = () => {
      mostraDettaglio(gruppi[c.key], c.label);
    };

    container.appendChild(card);
  });

  function mostraDettaglio(lista, titolo) {
    dettaglio.innerHTML = createCard({
      title: titolo,
      body: `<div id="lista-interna"></div>`
    });

    const interno = document.getElementById("lista-interna");

    if (lista.length === 0) {
      interno.innerHTML = `<p class="small-muted">Nessuna azienda.</p>`;
    } else {
      lista.forEach((az) => {
        const riga = document.createElement("div");
        riga.style.display = "flex";
        riga.style.justifyContent = "space-between";
        riga.style.alignItems = "center";
        riga.style.padding = "10px 0";
        riga.style.borderBottom = "1px solid #e5e7eb";

        let testo = az.nome;

        if (az.giorni !== undefined) {
          if (az.giorni < 0)
            testo += ` — scaduta da ${Math.abs(az.giorni)} giorni`;
          else
            testo += ` — scade tra ${az.giorni} giorni`;
        }

        riga.innerHTML = `
          <div>
            <div><strong>${testo}</strong></div>
            <div style="font-size:12px; color:#6b7280; margin-top:4px;">
              Stato: ${az.stato}
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="app-button small gray">Apri</button>
            <button class="app-button small ${az.stato === "sospesa" ? "green" : "red"}">
              ${az.stato === "sospesa" ? "Riattiva" : "Sospendi"}
            </button>
          </div>
        `;

        const [btnApri, btnToggle] = riga.querySelectorAll("button");

        btnApri.onclick = () => {
          window.location.hash = "#/modificaAzienda?id=" + az.id;
        };

        btnToggle.onclick = async () => {
          const nuovoStato = az.stato === "sospesa" ? "attiva" : "sospesa";

          const conferma = confirm(
            `Sei sicuro di voler impostare questa azienda come "${nuovoStato}"?`
          );

          if (!conferma) return;

          const { error } = await supabase
            .from("aziende")
            .update({ stato: nuovoStato })
            .eq("id", az.id);

          if (error) {
            alert("Errore aggiornamento stato.");
            return;
          }

          alert("Stato aggiornato con successo.");
          window.router.reloadCurrentRoute();
        };

        interno.appendChild(riga);
      });
    }

    dettaglio.style.maxHeight = "800px";
  }
}
