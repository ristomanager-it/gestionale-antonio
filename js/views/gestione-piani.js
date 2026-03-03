// js/views/gestione-piani.js
import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

const AVAILABLE_FEATURES = [
  "magazzino",
  "produzione",
  "ricettario",
  "acquisti",
  "preventivi",
  "report",
  "ai_forecast"
];

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

  container.innerHTML = createPageLayout({
    title: "Gestione Piani",
    subtitle: "Configurazione dinamica dei piani SaaS",
    content: createCard({
      body: `
        <div id="piani-list"></div>

        <div style="margin-top:24px;">
          <button class="app-button green" id="btn-nuovo-piano">
            ➕ Nuovo Piano
          </button>
        </div>

        <div style="margin-top:24px;">
          <button class="app-button small gray" id="btn-home">
            ⬅ Dashboard
          </button>
        </div>
      `
    })
  });

  document.getElementById("btn-home").onclick = () => {
    window.location.hash = "#/home";
  };

  document.getElementById("btn-nuovo-piano").onclick = () => {
    apriFormPiano();
  };

  await caricaPiani();
}

async function caricaPiani() {
  const { data } = await supabase
    .from("piani_abbonamento")
    .select("*")
    .order("prezzo_mensile", { ascending: true });

  const container = document.getElementById("piani-list");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = `<p>Nessun piano configurato.</p>`;
    return;
  }

  data.forEach(p => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.marginBottom = "16px";

    div.innerHTML = `
      <div class="card-body">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="margin:0;">${p.nome.toUpperCase()}</h3>
            <div style="font-size:13px; color:#6b7280; margin-top:4px;">
              €${p.prezzo_mensile}/mese • ${p.sedi_max} sedi max
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="app-button small gray">Modifica</button>
            <button class="app-button small ${p.attivo === false ? "green" : "red"}">
              ${p.attivo === false ? "Attiva" : "Disattiva"}
            </button>
          </div>
        </div>
      </div>
    `;

    const [btnModifica, btnToggle] = div.querySelectorAll("button");

    btnModifica.onclick = () => apriFormPiano(p);

    btnToggle.onclick = async () => {
      const nuovoStato = p.attivo === false;
      await supabase
        .from("piani_abbonamento")
        .update({ attivo: nuovoStato })
        .eq("id", p.id);

      window.router.reloadCurrentRoute();
    };

    container.appendChild(div);
  });
}

function apriFormPiano(piano = null) {
  const features = piano?.features || {};

  const featureCheckboxes = AVAILABLE_FEATURES.map(f => `
    <label style="display:flex; gap:8px; align-items:center;">
      <input type="checkbox" data-feature="${f}" ${features[f] ? "checked" : ""}/>
      ${f}
    </label>
  `).join("");

  const formHtml = `
    <div style="margin-top:24px;" class="card">
      <div class="card-body">
        <h3>${piano ? "Modifica Piano" : "Nuovo Piano"}</h3>

        <label>
          Nome
          <input id="p-nome" class="input-pill" value="${piano?.nome || ""}" />
        </label>

        <label>
          Prezzo mensile
          <input id="p-prezzo" type="number" class="input-pill" value="${piano?.prezzo_mensile || 0}" />
        </label>

        <label>
          Numero massimo sedi
          <input id="p-sedi" type="number" class="input-pill" value="${piano?.sedi_max || 1}" />
        </label>

        <div style="margin-top:12px;">
          <strong>Feature incluse</strong>
          <div style="margin-top:8px; display:grid; gap:6px;">
            ${featureCheckboxes}
          </div>
        </div>

        <div style="margin-top:16px;">
          <button class="app-button green" id="btn-save-piano">
            Salva
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("piani-list").insertAdjacentHTML("beforeend", formHtml);

  document.getElementById("btn-save-piano").onclick = async () => {
    const nome = document.getElementById("p-nome").value.trim();
    const prezzo = parseFloat(document.getElementById("p-prezzo").value);
    const sedi = parseInt(document.getElementById("p-sedi").value);

    const featureInputs = document.querySelectorAll("[data-feature]");
    const featuresObj = {};

    featureInputs.forEach(i => {
      featuresObj[i.dataset.feature] = i.checked;
    });

    if (piano) {
      await supabase
        .from("piani_abbonamento")
        .update({
          nome,
          prezzo_mensile: prezzo,
          sedi_max: sedi,
          features: featuresObj
        })
        .eq("id", piano.id);
    } else {
      await supabase
        .from("piani_abbonamento")
        .insert({
          nome,
          prezzo_mensile: prezzo,
          sedi_max: sedi,
          features: featuresObj,
          attivo: true
        });
    }

    window.router.reloadCurrentRoute();
  };
}
