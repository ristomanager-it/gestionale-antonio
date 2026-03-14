import "../../supabaseClient.js";
import "../../state.js";

import { renderMateriePrime } from "./materie_prime.js";
import { renderPreparazioni } from "./preparazioni.js";
import { renderProdottiFiniti } from "./prodotti_finiti.js";
import { renderMapping } from "./mapping_fornitori.js";
import { renderAnagraficaProdotti } from "./anagrafica_prodotti.js";

export async function render(container) {

  const azienda = window.state.azienda;

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

      <h2>Modulo Magazzino</h2>

      <div id="magazzino-home"></div>
      <div id="magazzino-content" style="margin-top:20px;"></div>

    </div>
  `;

  document
    .getElementById("btn-back-dashboard")
    .addEventListener("click", () => {
      window.location.hash = "#/home";
    });

  renderHome(azienda);

}

function renderHome(azienda) {

  const home = document.getElementById("magazzino-home");
  const content = document.getElementById("magazzino-content");

  home.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px;">

      <div class="view mag-card" data-route="materie-prime">
        <h3>Materie Prime</h3>
        <p>Magazzino acquisti</p>
      </div>

      <div class="view mag-card" data-route="preparazioni">
        <h3>Preparazioni</h3>
        <p>Semilavorati prodotti</p>
      </div>

      <div class="view mag-card" data-route="prodotti-finiti">
        <h3>Prodotti Finiti</h3>
        <p>Pronti alla vendita</p>
      </div>

      <div class="view mag-card" data-route="anagrafica">
        <h3>Anagrafica Prodotti</h3>
      </div>

      <div class="view mag-card" data-route="mapping">
        <h3>Mapping Fornitori</h3>
      </div>

    </div>
  `;

  document.querySelectorAll(".mag-card").forEach(card => {

    card.style.cursor = "pointer";

    card.addEventListener("click", () => {

      const route = card.dataset.route;

      window.location.hash = `#/magazzino/${route}`;

      openMagazzinoRoute(route, content, azienda);

    });

  });

  const hash = window.location.hash.split("/")[2];

  if (hash) {
    openMagazzinoRoute(hash, content, azienda);
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
