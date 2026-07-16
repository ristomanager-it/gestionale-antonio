import { renderMateriePrime } from "./materie_prime.js?v=2";
import { renderPreparazioni } from "./preparazioni.js";
import { renderCaricoModal, apriCaricoModal } from "./carico_magazzino.js";
import { apriRicezioneModal } from "./ricezione.js";

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

  ensureMagazzinoOverlayStyles();

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

  container.querySelector("#btn-back-dashboard").onclick = () => {
    window.location.hash = "#/home";
  };

  if (!document.getElementById("rf-carico-backdrop")) {
    document.body.insertAdjacentHTML("beforeend", renderCaricoModal());
  }

  renderHome(azienda);
}

function renderHome(azienda) {
  const home = document.getElementById("magazzino-home");

  home.innerHTML = `
    <div class="rf-magazzino-actions">
      <button class="app-button tiny" id="btn-materie-prime">
        Materie Prime
      </button>

      <button class="app-button tiny" id="btn-preparazioni">
        Preparazioni
      </button>

      <button class="app-button tiny" id="btn-carico-magazzino">
        + Carico Giacenza
      </button>

      <button class="app-button tiny" id="btn-ricezione" style="background:#16a34a;color:#fff;">
        📥 Ricezione merce
      </button>

      <button class="app-button tiny" id="btn-da-riordinare" style="background:#f59e0b;color:#fff;">
        ⚠️ Da riordinare
      </button>
    </div>

    <div class="rf-magazzino-hint">
      Tocca una funzione per aprire la card mobile dal basso.
    </div>
  `;

  const btnMP = home.querySelector("#btn-materie-prime");
  const btnPrep = home.querySelector("#btn-preparazioni");
  const btnCarico = home.querySelector("#btn-carico-magazzino");

  btnMP.onclick = () => {
    renderMateriePrime(document.body, azienda);
  };

  btnPrep.onclick = () => {
    renderPreparazioni(document.body, azienda);
  };

  btnCarico.onclick = () => {
    apriCaricoModal({
      aziendaId: azienda.id
    });
  };

  const btnRicezione = home.querySelector("#btn-ricezione");
  if (btnRicezione) btnRicezione.onclick = () => { apriRicezioneModal(azienda); };

  const btnRiordino = home.querySelector("#btn-da-riordinare");
  if (btnRiordino) btnRiordino.onclick = () => { window.location.hash = "#/acquisti?tab=riordino"; };
}

function ensureMagazzinoOverlayStyles() {
  if (document.getElementById("rf-magazzino-overlay-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "rf-magazzino-overlay-styles";
  style.textContent = `
    .rf-magazzino-actions {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-bottom:16px;
    }

    .rf-magazzino-hint {
      font-size:13px;
      opacity:0.72;
      margin-bottom:10px;
    }

    .rf-overlay-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.42);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 9999;
      padding: 0;
    }

    .rf-overlay-card {
      width: 100%;
      max-width: 760px;
      max-height: 85vh;
      background: #ffffff;
      border-radius: 18px 18px 0 0;
      overflow: hidden;
      box-shadow: 0 -10px 35px rgba(0,0,0,0.18);
      transform: translateY(100%);
      animation: rfSlideUpOverlay 0.24s ease-out forwards;
      display: flex;
      flex-direction: column;
    }

    .rf-overlay-header {
      position: sticky;
      top: 0;
      z-index: 2;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 14px 14px 10px 14px;
      border-bottom: 1px solid #ececec;
    }

    .rf-overlay-title {
      margin: 0;
      font-size: 16px;
      line-height: 1.2;
    }

    .rf-overlay-body {
      padding: 14px;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }

    .rf-overlay-tabs {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-bottom:12px;
    }

    .rf-search-list {
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:10px;
    }

    .rf-search-item {
      border:1px solid #ececec;
      border-radius:12px;
      padding:10px 12px;
      background:#fff;
    }

    .rf-search-row {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    .rf-search-main {
      min-width:0;
      flex:1;
    }

    .rf-search-code {
      font-size:12px;
      font-weight:700;
      opacity:0.8;
      margin-bottom:2px;
    }

    .rf-search-title {
      font-size:14px;
      font-weight:600;
      line-height:1.3;
      word-break:break-word;
    }

    .rf-search-subtitle {
      margin-top:4px;
      font-size:12px;
      opacity:0.72;
    }

    .rf-search-action {
      flex:0 0 auto;
      width:38px;
      height:38px;
      border-radius:12px;
      border:1px solid #dddddd;
      background:#ffffff;
      font-size:18px;
      cursor:pointer;
    }

    .rf-product-card {
      border:1px solid #ececec;
      border-radius:14px;
      padding:12px;
      background:#ffffff;
    }

    .rf-product-heading {
      margin-bottom:12px;
    }

    .rf-product-code {
      font-size:12px;
      font-weight:700;
      opacity:0.8;
      margin-bottom:2px;
    }

    .rf-product-title {
      font-size:15px;
      font-weight:700;
      line-height:1.3;
    }

    .rf-product-grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:10px;
      margin-bottom:12px;
    }

    .rf-product-field {
      border:1px solid #efefef;
      border-radius:12px;
      padding:10px;
      background:#fafafa;
    }

    .rf-product-label {
      display:block;
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:0.03em;
      opacity:0.65;
      margin-bottom:4px;
    }

    .rf-product-value {
      font-size:14px;
      font-weight:600;
      word-break:break-word;
    }

    .rf-product-section-title {
      font-size:13px;
      font-weight:700;
      margin:10px 0 8px 0;
    }

    .rf-mov-list {
      display:flex;
      flex-direction:column;
      gap:8px;
    }

    .rf-mov-item {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      border:1px solid #efefef;
      border-radius:12px;
      padding:9px 10px;
      background:#fafafa;
      font-size:13px;
    }

    .rf-mov-main {
      font-weight:600;
    }

    .rf-mov-meta {
      opacity:0.72;
      text-align:right;
      font-size:12px;
    }

    .rf-empty-state {
      font-size:13px;
      opacity:0.72;
      padding:10px 2px;
    }

    .rf-section-spacer {
      margin-top:12px;
    }

    @keyframes rfSlideUpOverlay {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    @media (min-width: 768px) {
      .rf-overlay-backdrop {
        padding: 16px;
        align-items: center;
      }

      .rf-overlay-card {
        border-radius: 18px;
        max-height: 85vh;
      }
    }
  `;

  document.head.appendChild(style);
}
