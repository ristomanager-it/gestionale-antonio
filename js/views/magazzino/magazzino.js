import { renderMateriePrime } from "./materie_prime.js";
import { renderPreparazioni } from "./preparazioni.js";
import { renderProdottiFiniti } from "./prodotti_finiti.js";
import { renderMapping } from "./mapping_fornitori.js";
import { renderAnagraficaProdotti } from "./anagrafica_prodotti.js";

export async function render(container) {

  const azienda = window.state?.azienda;

  if (!azienda) {
    container.innerHTML = `
      <div class="view">
        <h3>Nessuna azienda attiva</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = `

  <div class="view">

    <button class="app-button tiny gray" id="btn-back-dashboard" style="margin-bottom:10px;">
      ← Torna alla Dashboard
    </button>

    <h2>Magazzino</h2>

    <div id="magazzino-home"></div>
    <div id="magazzino-content"></div>

  </div>

  `;

  document.getElementById("btn-back-dashboard").onclick = () => {
    window.location.hash = "#/home";
  };

  renderHome(azienda);

}

function renderHome(azienda) {

  const home = document.getElementById("magazzino-home");
  const content = document.getElementById("magazzino-content");

  home.innerHTML = `

  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">

    <button class="app-button tiny" data-route="materie-prime">
      Materie Prime
    </button>

    <button class="app-button tiny" data-route="preparazioni">
      Preparazioni
    </button>

    <button class="app-button tiny" data-route="prodotti-finiti">
      Prodotti Finiti
    </button>

    <button class="app-button tiny gray" data-route="anagrafica">
      Anagrafica
    </button>

    <button class="app-button tiny gray" data-route="mapping">
      Mapping
    </button>

  </div>

  <div class="view">

    <h3>⚠️ Urgenze Magazzino</h3>

    <div id="magazzino-urgenze" style="margin-top:15px;">
      Caricamento...
    </div>

  </div>

  `;

  document.querySelectorAll("[data-route]").forEach(btn => {

    btn.onclick = () => {

      const route = btn.dataset.route;
      openMagazzinoRoute(route, content, azienda);

    };

  });

  loadUrgenze(azienda, content);

}

async function loadUrgenze(azienda, content) {

  const box = document.getElementById("magazzino-urgenze");

  try {

    const { data: sottoscorta } = await window.supabaseClient
      .from("v_magazzino_materie_prime")
      .select("prodotto_id")
      .eq("azienda_id", azienda.id)
      .lte("giacenza_attuale", "scorta_minima");

    const { data: prepSotto } = await window.supabaseClient
      .from("v_magazzino_preparazioni")
      .select("prodotto_id")
      .eq("azienda_id", azienda.id)
      .lte("giacenza_attuale", "scorta_minima");

    const { data: lotti } = await window.supabaseClient
      .from("vw_lotti_disponibili")
      .select("id")
      .eq("azienda_id", azienda.id)
      .lte("giacenza", 0);

    const prodotti = sottoscorta?.length || 0;
    const preparazioni = prepSotto?.length || 0;
    const lottiFiniti = lotti?.length || 0;

    box.innerHTML = `

      <div style="display:flex; gap:20px; flex-wrap:wrap;">

        <div class="card-small urgente" data-click="materie-prime">
          <strong>${prodotti}</strong><br>
          prodotti sottoscorta
        </div>

        <div class="card-small urgente" data-click="preparazioni">
          <strong>${preparazioni}</strong><br>
          preparazioni sottoscorta
        </div>

        <div class="card-small urgente" data-click="lotti">
          <strong>${lottiFiniti}</strong><br>
          lotti terminati
        </div>

      </div>

    `;

    box.querySelectorAll(".urgente").forEach(card => {

      card.onclick = () => {

        const tipo = card.dataset.click;

        if (tipo === "materie-prime") {
          renderMateriePrime(content, azienda, "sottoscorta");
        }

        if (tipo === "preparazioni") {
          renderPreparazioni(content, azienda, "sottoscorta");
        }

        if (tipo === "lotti") {
          renderPreparazioni(content, azienda);
        }

      };

    });

  } catch (err) {

    box.innerHTML = `<p style="color:red;">Errore caricamento urgenze</p>`;

  }

}

function openMagazzinoRoute(route, container, azienda) {

  if (route === "materie-prime") {
    renderMateriePrime(container, azienda);
  }

  if (route === "preparazioni") {
    renderPreparazioni(container, azienda);
  }

  if (route === "prodotti-finiti") {
    renderProdottiFiniti(container, azienda);
  }

  if (route === "mapping") {
    renderMapping(container, azienda);
  }

  if (route === "anagrafica") {
    renderAnagraficaProdotti(container);
  }

}
