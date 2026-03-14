import "../supabaseClient.js";
import "../state.js";

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

      <div class="view mag-card" data-type="materia_prima">
        <h3>Materie Prime</h3>
        <p>Magazzino acquisti</p>
      </div>

      <div class="view mag-card" data-type="semilavorato">
        <h3>Preparazioni</h3>
        <p>Semilavorati prodotti</p>
      </div>

      <div class="view mag-card" data-type="prodotto_finito">
        <h3>Prodotti Finiti</h3>
        <p>Pronti alla vendita</p>
      </div>

      <div class="view mag-card" data-tab="anagrafica">
        <h3>Anagrafica Prodotti</h3>
      </div>

      <div class="view mag-card" data-tab="mapping">
        <h3>Mapping Fornitori</h3>
      </div>

    </div>
  `;

  document.querySelectorAll(".mag-card").forEach(card => {

    card.style.cursor = "pointer";

    card.addEventListener("click", () => {

      const type = card.dataset.type;
      const tab = card.dataset.tab;

      if (type === "materia_prima") renderMateriePrime(content, azienda);
      if (type === "semilavorato") renderPreparazioni(content, azienda);
      if (type === "prodotto_finito") renderProdottiFiniti(content, azienda);

      if (tab === "mapping") renderMapping(content, azienda);
      if (tab === "anagrafica") renderAnagraficaProdotti(content);

    });

  });

}
