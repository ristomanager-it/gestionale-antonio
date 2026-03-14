import { renderMateriePrime } from "./materie_prime.js";
import { renderPreparazioni } from "./preparazioni.js";
import { renderProdottiFiniti } from "./prodotti_finiti.js";
import { renderAnagraficaProdotti } from "./anagrafica_prodotti.js";
import { renderMappingFornitori } from "./mapping_fornitori.js";

export async function render(container) {

  let azienda = window.state?.azienda;

  if (!azienda) {
    container.innerHTML = `
      <div class="card">
        <h3>Nessuna azienda attiva</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = `

  <div class="view">

    <div class="card">
      <h2>Magazzino</h2>
      <p>Gestione giacenze, preparazioni e anagrafica prodotti</p>
    </div>

    <div class="rf-grid">

      <div class="card mag-card" data-view="materie_prime">
        <h3>📦 Materie Prime</h3>
        <p>Giacenze e sottoscorta</p>
      </div>

      <div class="card mag-card" data-view="preparazioni">
        <h3>🍳 Preparazioni</h3>
        <p>Lotti prodotti</p>
      </div>

      <div class="card mag-card" data-view="prodotti_finiti">
        <h3>🍽 Prodotti Finiti</h3>
        <p>Piatti pronti</p>
      </div>

      <div class="card mag-card" data-view="anagrafica">
        <h3>🧾 Anagrafica Prodotti</h3>
        <p>Modifica schede prodotto</p>
      </div>

      <div class="card mag-card" data-view="mapping">
        <h3>🔗 Mapping Fornitori</h3>
        <p>Codici fornitori</p>
      </div>

    </div>

    <div id="magazzino-content" style="margin-top:20px"></div>

  </div>

  `;

  const content = container.querySelector("#magazzino-content");

  container.querySelectorAll(".mag-card").forEach(card => {

    card.addEventListener("click", () => {

      const view = card.dataset.view;

      if (view === "materie_prime") {
        renderMateriePrime(content, azienda);
      }

      if (view === "preparazioni") {
        renderPreparazioni(content, azienda);
      }

      if (view === "prodotti_finiti") {
        renderProdottiFiniti(content, azienda);
      }

      if (view === "anagrafica") {
        renderAnagraficaProdotti(content, azienda);
      }

      if (view === "mapping") {
        renderMappingFornitori(content, azienda);
      }

    });

  });

}
