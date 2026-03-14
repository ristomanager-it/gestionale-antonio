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

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <h3 style="margin:0;">Magazzino</h3>
            <div style="font-size:13px; color:#667085; margin-top:4px;">
              Controllo rapido materie prime, preparazioni, prodotti finiti e urgenze operative.
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn-primary" data-route="materie-prime">
            Materie Prime
          </button>

          <button type="button" class="btn-secondary" data-route="preparazioni">
            Preparazioni
          </button>

          <button type="button" class="btn-secondary" data-route="prodotti-finiti">
            Prodotti Finiti
          </button>

          <button type="button" class="btn-secondary" data-route="anagrafica">
            Anagrafica Prodotti
          </button>

          <button type="button" class="btn-secondary" data-route="mapping">
            Mapping Fornitori
          </button>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <h3 style="margin:0;">⚠️ Urgenze Magazzino</h3>
            <div style="font-size:13px; color:#667085; margin-top:4px;">
              Clicca un indicatore per aprire direttamente il modal corretto.
            </div>
          </div>
        </div>

        <div id="magazzino-urgenze" style="margin-top:14px;">
          <div class="rf-empty-righe">
            Caricamento...
          </div>
        </div>
      </div>

      <div id="magazzino-content"></div>
    </div>
  `;

  container.querySelector("#btn-back-dashboard")?.addEventListener("click", () => {
    window.location.hash = "#/home";
  });

  const content = container.querySelector("#magazzino-content");

  container.querySelectorAll("[data-route]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.route;
      openMagazzinoRoute(route, content, azienda);
    });
  });

  await loadUrgenze(azienda, content);
}

async function loadUrgenze(azienda, content) {
  const box = document.getElementById("magazzino-urgenze");

  if (!box) return;

  try {
    const [sottoscortaRes, prepSottoRes, lottiRes] = await Promise.all([
      window.supabaseClient
        .from("v_magazzino_materie_prime")
        .select("prodotto_id", { count: "exact", head: false })
        .eq("azienda_id", azienda.id)
        .lte("giacenza_attuale", "scorta_minima"),

      window.supabaseClient
        .from("v_magazzino_preparazioni")
        .select("prodotto_id", { count: "exact", head: false })
        .eq("azienda_id", azienda.id)
        .lte("giacenza_attuale", "scorta_minima"),

      window.supabaseClient
        .from("vw_lotti_disponibili")
        .select("id", { count: "exact", head: false })
        .eq("azienda_id", azienda.id)
        .lte("giacenza", 0)
    ]);

    const prodotti = sottoscortaRes.data?.length || 0;
    const preparazioni = prepSottoRes.data?.length || 0;
    const lottiFiniti = lottiRes.data?.length || 0;

    box.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px;">
        <button type="button" class="card" data-urgent="materie-prime" style="margin:0; text-align:left; cursor:pointer;">
          <div style="font-size:24px; font-weight:800; color:#0E5A7A;">${prodotti}</div>
          <div style="font-size:14px; font-weight:700; margin-top:4px;">Prodotti sottoscorta</div>
          <div style="font-size:13px; color:#667085; margin-top:4px;">
            Apri Materie Prime direttamente sulla vista sottoscorta.
          </div>
        </button>

        <button type="button" class="card" data-urgent="preparazioni" style="margin:0; text-align:left; cursor:pointer;">
          <div style="font-size:24px; font-weight:800; color:#0E5A7A;">${preparazioni}</div>
          <div style="font-size:14px; font-weight:700; margin-top:4px;">Preparazioni sottoscorta</div>
          <div style="font-size:13px; color:#667085; margin-top:4px;">
            Apri Preparazioni direttamente sulla vista sottoscorta.
          </div>
        </button>

        <button type="button" class="card" data-urgent="lotti" style="margin:0; text-align:left; cursor:pointer;">
          <div style="font-size:24px; font-weight:800; color:#0E5A7A;">${lottiFiniti}</div>
          <div style="font-size:14px; font-weight:700; margin-top:4px;">Lotti terminati</div>
          <div style="font-size:13px; color:#667085; margin-top:4px;">
            Apri Preparazioni per verificare i lotti disponibili.
          </div>
        </button>
      </div>
    `;

    box.querySelectorAll("[data-urgent]").forEach((card) => {
      card.addEventListener("click", () => {
        const tipo = card.dataset.urgent;

        if (tipo === "materie-prime") {
          renderMateriePrime(content, azienda, "sottoscorta");
        }

        if (tipo === "preparazioni") {
          renderPreparazioni(content, azienda, "sottoscorta");
        }

        if (tipo === "lotti") {
          renderPreparazioni(content, azienda);
        }
      });
    });
  } catch (err) {
    box.innerHTML = `
      <div class="rf-empty-righe">
        Errore caricamento urgenze
      </div>
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
