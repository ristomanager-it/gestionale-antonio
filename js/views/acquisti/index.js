import { renderFatture } from "./fatture.js?v=13";
import { renderDDT } from "./ddt.js?v=2";
import { renderPagamenti } from "./pagamenti.js";
import { renderFornitori } from "./fornitori.js";
import { renderListini } from "./listini.js?v=2";
import { renderRiordino } from "./riordino.js";
import { renderOrdini } from "./ordini.js?v=20261103-3";

export async function render(container) {

  // Entrando da Home il contesto azienda si ricarica: senza attesa la prima apertura diceva
  // "Nessuna azienda attiva" (trovato preparando la demo video, 15/11). Si aspetta fino a 5 secondi.
  for (let i = 0; i < 50 && !window.state?.azienda; i++) await new Promise(r => setTimeout(r, 100));
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
        <button class="tab-btn" data-tab="listini">Listini</button>
        <button class="tab-btn" data-tab="riordino">Riordino</button>
        <button class="tab-btn" data-tab="ordini">Ordini</button>

      </div>

    </div>

    <div id="acquisti-content"></div>

  </section>
  `;

  const content = document.getElementById("acquisti-content");

  // 25/11: Fatture e Pagamenti li vede solo il titolare (e il commercialista): al manager restano
  // DDT, fornitori, listini, riordino e ordini. Anche il link diretto ?tab=fatture lo porta agli ordini.
  const vedeFatture = !window.hasPermission || window.hasPermission("acquisti-fatture");
  if (!vedeFatture) {
    document.querySelectorAll('.tab-btn[data-tab="fatture"], .tab-btn[data-tab="pagamenti"]').forEach(function (b) { b.remove(); });
    const sotto = container.querySelector(".card p");
    if (sotto) sotto.textContent = "DDT, fornitori, listini, riordino e ordini";
  }
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
    if (!vedeFatture && (tab === "fatture" || tab === "pagamenti")) tab = "ordini";

    setActive(tab);

    if (tab === "fatture") await renderFatture(content, azienda);
    if (tab === "ddt") await renderDDT(content, azienda);
    if (tab === "pagamenti") await renderPagamenti(content, azienda);
    if (tab === "fornitori") await renderFornitori(content, azienda);
    if (tab === "listini") await renderListini(content, azienda);
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
  const tabValide = vedeFatture ? ["fatture","ddt","pagamenti","fornitori","listini","riordino","ordini"] : ["ddt","fornitori","listini","riordino","ordini"];
  await renderTab(tabValide.includes(tabParam) ? tabParam : (vedeFatture ? "fatture" : "ordini"));

}
