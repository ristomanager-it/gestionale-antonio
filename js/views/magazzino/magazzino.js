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

    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">

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
        Anagrafica Prodotti
      </button>

      <button class="app-button tiny gray" data-route="mapping">
        Mapping Fornitori
      </button>

    </div>

    <div class="view">

      <h3>⚠️ Urgenze Magazzino</h3>

      <div id="magazzino-urgenze">
        Caricamento...
      </div>

    </div>

  `;

  document.querySelectorAll("[data-route]").forEach(btn => {

    btn.addEventListener("click", () => {

      const route = btn.dataset.route;

      window.location.hash = `#/magazzino/${route}`;

      openMagazzinoRoute(route, content, azienda);

    });

  });

  loadUrgenze(azienda);

  const hash = window.location.hash.split("/")[2];

  if (hash) {
    openMagazzinoRoute(hash, content, azienda);
  }

}

async function loadUrgenze(azienda) {

  const box = document.getElementById("magazzino-urgenze");

  if (!box) return;

  try {

    const { data: sottoscorta } = await window.supabaseClient
      .from("v_magazzino_materie_prime")
      .select("prodotto_id")
      .eq("azienda_id", azienda.id)
      .lte("giacenza_attuale", "scorta_minima");

    const { data: preparazioni } = await window.supabaseClient
      .from("v_magazzino_preparazioni")
      .select("prodotto_id")
      .eq("azienda_id", azienda.id)
      .lte("giacenza_attuale", "scorta_minima");

    const prodottiSotto = sottoscorta?.length || 0;
    const prepSotto = preparazioni?.length || 0;

    box.innerHTML = `

      <div style="display:flex; gap:20px; flex-wrap:wrap;">

        <div class="card-small">
          <strong>${prodottiSotto}</strong><br>
          prodotti sottoscorta
        </div>

        <div class="card-small">
          <strong>${prepSotto}</strong><br>
          preparazioni sottoscorta
        </div>

      </div>

    `;

  } catch (err) {

    box.innerHTML = `
      <p style="color:red;">Errore nel caricamento urgenze</p>
    `;

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
