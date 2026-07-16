import { renderFatture } from "./fatture.js?v=10";
import { renderDDT } from "./ddt.js";
import { renderPagamenti } from "./pagamenti.js";
import { renderFornitori } from "./fornitori.js";
import { renderRiordino } from "./riordino.js";
import { renderOrdini } from "./ordini.js";

export async function render(container) {

  const azienda = window.state?.azienda;

  if (!azienda) {

    container.innerHTML = `
      <section class="view">
        <div class="card">
          <h3>Nessuna azienda attiva</h3>
        </div>
      </section>
    `;

    return;

  }

  container.innerHTML = `
  <section class="view">

    <div class="card">

      <h2>Modulo Acquisti</h2>
      <p>Gestione fatture, fornitori e riordino</p>

      <div class="tabs-wrapper">

        <button class="tab-btn active" data-tab="fatture">Fatture</button>
        <button class="tab-btn" data-tab="ddt">DDT</button>
        <button class="tab-btn" data-tab="pagamenti">Pagamenti</button>
        <button class="tab-btn" data-tab="fornitori">Fornitori</button>
        <button class="tab-btn" data-tab="riordino">Riordino</button>
        <button class="tab-btn" data-tab="ordini">Ordini</button>

      </div>

    </div>

    <div id="acquisti-content"></div>

  </section>
  `;

  const content = document.getElementById("acquisti-content");
  const buttons = document.querySelectorAll(".tab-btn");

  function setActive(tab) {

    buttons.forEach(b => {

      b.classList.remove("active");

      if (b.dataset.tab === tab) {
        b.classList.add("active");
      }

    });

  }

  async function renderTab(tab) {

    setActive(tab);

    if (tab === "fatture") await renderFatture(content, azienda);
    if (tab === "ddt") await renderDDT(content, azienda);
    if (tab === "pagamenti") await renderPagamenti(content, azienda);
    if (tab === "fornitori") await renderFornitori(content, azienda);
    if (tab === "riordino") await renderRiordino(content, azienda);
    if (tab === "ordini") await renderOrdini(content, azienda);

  }

  buttons.forEach(btn => {

    btn.addEventListener("click", () => {
      renderTab(btn.dataset.tab);
    });

  });

  // Deep-link: #/acquisti?tab=riordino apre direttamente quella tab
  const tabQuery = (window.location.hash.split("?")[1] || "");
  const tabParam = new URLSearchParams(tabQuery).get("tab");
  const tabValide = ["fatture","ddt","pagamenti","fornitori","riordino","ordini"];
  await renderTab(tabValide.includes(tabParam) ? tabParam : "fatture");

}
