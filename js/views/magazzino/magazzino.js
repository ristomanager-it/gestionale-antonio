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

/* Conservati al volo: quello che e' stato messo via con l'etichetta veloce
   (mezzo pomodoro, una salsa avanzata...). Resta qui finche' non si segna usato o buttato;
   i primi della lista sono quelli che scadono prima. */
async function conservatiAlVolo(azienda) {
  const box = document.getElementById("rf-conservati");
  const sb = window.supabaseClient || window.supabase;
  if (!box || !sb) return;
  const { data } = await sb.from("etichette_veloci").select("id, codice, cosa, conservazione, data_scadenza, operatore_nome, created_at")
    .eq("azienda_id", azienda.id).is("esito", null).order("data_scadenza", { ascending: true }).limit(200);
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const righe = (data || []).map((r) => {
    const sc = r.data_scadenza ? new Date(r.data_scadenza + "T00:00:00") : null;
    const gg = sc ? Math.round((sc - oggi) / 86400000) : null;
    const col = gg === null ? "#64748b" : gg < 0 ? "#b91c1c" : gg <= 1 ? "#c2410c" : "#166534";
    const quando = gg === null ? "" : gg < 0 ? "SCADUTO" : gg === 0 ? "scade oggi" : gg === 1 ? "scade domani" : "scade il " + sc.toLocaleDateString("it-IT");
    return `<div style="display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #eef2f7;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;">${esc(r.cosa)}</div>
        <div style="font-size:12.5px;color:#64748b;">${esc(r.conservazione || "")} · ${esc(r.codice)}${r.operatore_nome ? " · " + esc(r.operatore_nome) : ""}</div>
        <div style="font-size:12.5px;font-weight:800;color:${col};">${quando}</div>
      </div>
      <button type="button" data-esito="usato" data-id="${r.id}" title="Usato" style="border:0;border-radius:10px;padding:8px 9px;background:#dcfce7;color:#166534;font-weight:800;">✓</button>
      <button type="button" data-esito="pasto" data-id="${r.id}" title="Pasto del personale" style="border:0;border-radius:10px;padding:8px 9px;background:#e0f2fe;font-weight:800;">🍽</button>
      <button type="button" data-esito="congelato" data-id="${r.id}" data-nome="${esc(r.cosa)}" title="Abbatti in negativo" style="border:0;border-radius:10px;padding:8px 9px;background:#ede9fe;font-weight:800;">❄️</button>
      <button type="button" data-esito="buttato" data-id="${r.id}" title="Buttato" style="border:0;border-radius:10px;padding:8px 9px;background:#fee2e2;color:#b91c1c;font-weight:800;">🗑</button>
    </div>`;
  }).join("");
  box.innerHTML = `
    <div style="font-weight:800;font-size:15px;margin-bottom:6px;">🏷 Conservati al volo <span style="font-weight:600;color:#64748b;font-size:13px;">(${(data || []).length})</span></div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      ${righe || `<div style="padding:12px;color:#64748b;font-size:13.5px;">Niente in giacenza: quello che metti via con l'etichetta veloce compare qui.</div>`}
    </div>
    <div style="font-size:12px;color:#64748b;margin-top:6px;">✓ usato · 🍽 pasto del personale · ❄️ abbatti in negativo (nuova etichetta, 180 gg) · 🗑 buttato</div>`;
  box.querySelectorAll("[data-esito]").forEach((b) => b.addEventListener("click", async () => {
    if (b.dataset.esito === "buttato" && !confirm("Lo segno come buttato? Finisce negli sprechi.")) return;
    b.disabled = true;
    if (b.dataset.esito === "congelato") {
      // abbattuto in negativo: si chiude questo e si stampa l'etichetta nuova (-18 °C, 180 giorni)
      await sb.from("etichette_veloci").update({ esito: "abbattuto", chiuso_at: new Date().toISOString(),
        chiuso_da: window.state?.dipendente?.nome || null }).eq("id", b.dataset.id);
      const m = await import("../../components/etichetta-veloce.js?v=" + (window.APP_V || 1));
      m.apriEtichettaVeloce({ cosa: b.dataset.nome, cons: 2, dopo: () => conservatiAlVolo(azienda) });
      conservatiAlVolo(azienda);
      return;
    }
    const { error } = await sb.rpc("scadenza_esito", { p_tipo: "veloce", p_id: Number(b.dataset.id), p_esito: b.dataset.esito });
    if (error) { alert("Non salvato: " + error.message); b.disabled = false; return; }
    conservatiAlVolo(azienda);
  }));
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

    <div id="rf-conservati" style="margin-top:16px;"></div>
  `;
  conservatiAlVolo(azienda);

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
