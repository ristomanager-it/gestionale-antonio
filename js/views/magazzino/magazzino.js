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

      <h2 style="font-size:18px; margin:0 0 12px 0;">Magazzino</h2>

      <div id="magazzino-home"></div>
      <div id="magazzino-content"></div>

    </div>
  `;

  const btnBack = container.querySelector("#btn-back-dashboard");
  const home = container.querySelector("#magazzino-home");
  const content = container.querySelector("#magazzino-content");

  btnBack?.addEventListener("click", () => {
    window.location.hash = "#/home";
  });

  renderHome(home, content, azienda);
}

function renderHome(home, content, azienda) {
  if (!home || !content) return;

  content.innerHTML = "";

  home.innerHTML = `
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">

      <button type="button" class="app-button tiny" data-route="materie-prime">
        Materie Prime
      </button>

      <button type="button" class="app-button tiny" data-route="preparazioni">
        Preparazioni
      </button>

      <button type="button" class="app-button tiny" data-route="prodotti-finiti">
        Prodotti Finiti
      </button>

      <button type="button" class="app-button tiny gray" data-route="anagrafica">
        Anagrafica
      </button>

      <button type="button" class="app-button tiny gray" data-route="mapping">
        Mapping
      </button>

    </div>
  `;

  home.querySelectorAll("[data-route]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.route;
      openMagazzinoRoute(route, content, azienda);
    });
  });
}

function openMagazzinoRoute(route, container, azienda) {
  if (route === "materie-prime") {
    renderMateriePrime(container, azienda);
    return;
  }

  if (route === "preparazioni") {
    renderPreparazioni(container, azienda);
    return;
  }

  if (route === "prodotti-finiti") {
    renderProdottiFiniti(container, azienda);
    return;
  }

  if (route === "mapping") {
    renderMapping(container, azienda);
    return;
  }

  if (route === "anagrafica") {
    renderAnagraficaProdotti(container);
  }
}
