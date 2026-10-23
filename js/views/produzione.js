// js/views/produzione.js
// Pagina Produzione: i pulsanti grandi della produzione. Lo stato di oggi sta nella home Cucina.

export async function render(app) {
  const ruolo = String((window.normalizeRuolo ? window.normalizeRuolo(window.state?.viewAs || window.state?.ruolo) : (window.state?.viewAs || window.state?.ruolo)) || "").toLowerCase();
  const responsabile = ["admin", "manager", "superadmin"].includes(ruolo);
  const pulsante = (icona, testo, rotta) => `<button class="pr-btn" onclick="window.location.hash='#/${rotta}'"><i>${icona}</i>${testo}</button>`;

  app.innerHTML = `
    <section class="view pr-home">
      <div style="margin-bottom:12px;">
        <button class="app-button small gray" onclick="window.location.hash='#/home-cucina'">← Cucina</button>
      </div>
      <h2 style="margin:0 0 14px;">🏭 Produzione</h2>
      <div class="pr-griglia">
        ${pulsante("🧪", "Preparazioni", "preparazioni")}
        ${pulsante("📋", "Planning", "planner-produzione")}
        ${pulsante("🟢", "Produzioni aperte", "produzioni-aperte")}
        ${pulsante("📷", "Lotti in arrivo", "lotti-fornitore")}
        ${pulsante("📒", "Registro lotti", "registro-lotti")}
        ${pulsante("⏰", "Scadenze", "scadenze")}
        ${pulsante("🔪", "Sezionatura", "sezionatura")}
        ${responsabile ? pulsante("🗂", "Schede evento", "scheda-evento") : ""}
        ${responsabile ? pulsante("📷", "Banchetto da foto", "banchetto-foto") : ""}
        ${responsabile ? pulsante("🥂", "Modelli buffet", "modelli-buffet") : ""}
        ${responsabile ? pulsante("📅", "Giorni di lavorazione", "giorni-lavorazione") : ""}
        ${responsabile ? pulsante("🏭", "Per le sedi", "cc-sedi") : ""}
        ${responsabile ? pulsante("📊", "Produttività", "produttivita-produzione") : ""}
      </div>
    </section>
    <style>
      .pr-home .pr-griglia{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .pr-home .pr-btn{background:#0E5A7A;color:#fff;border:0;border-radius:14px;padding:16px 10px;font-size:15px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:6px;}
      .pr-home .pr-btn i{font-style:normal;font-size:24px;}
    </style>`;
}
