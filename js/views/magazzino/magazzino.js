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

  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px;">

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

  `;

  document.querySelectorAll("[data-route]").forEach(btn => {

    btn.onclick = () => {

      const route = btn.dataset.route;
      openMagazzinoRoute(route, content, azienda);

    };

  });

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
