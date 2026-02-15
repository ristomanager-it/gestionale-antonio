// js/views/home-piattaforma.js
// =======================================
// Dashboard Piattaforma SaaS
// =======================================

export async function render(container) {
  const azienda = window.state.azienda;

  if (!azienda || azienda.stato !== "piattaforma") {
    container.innerHTML = `<div class="view">Accesso non consentito</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <!-- HEADER -->
      <div style="display:flex; align-items:center; gap:14px; margin-bottom:28px;">
        ${
          azienda.logo_url
            ? `<img 
                src="${azienda.logo_url}" 
                style="width:52px; height:52px; object-fit:cover; border-radius:14px;"
              />`
            : `<div style="width:52px; height:52px; border-radius:14px; background:#e5e7eb;"></div>`
        }

        <div>
          <h2 style="margin:0;">${azienda.nome}</h2>
          <p class="small-muted" style="margin:4px 0 0 0;">
            Pannello Amministrazione SaaS
          </p>
        </div>
      </div>

      <!-- SEZIONE GESTIONE AZIENDE -->
      <h3 style="margin-bottom:12px;">🏢 Gestione SaaS</h3>

      <div style="
        display:grid;
        gap:14px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        margin-bottom:30px;
      ">

        ${card("➕", "Crea Azienda", "#/creaAzienda")}
        ${card("🏢", "Gestione Aziende", "#/gestioneAziende")}
        ${card("📊", "Statistiche SaaS", "#/statisticheSaas")}

      </div>

      <!-- SEZIONE OPERATIVA APP -->
      <h3 style="margin-bottom:12px;">🚀 Modalità Operativa</h3>

      <div style="
        display:grid;
        gap:14px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      ">

        ${card("🏬", "Vai alla Dashboard Operativa", "#/homeOperativa")}

        ${card("⏱️", "Timbrature", "#/timbrature")}
        ${card("👥", "Dipendenti", "#/dipendenti")}
        ${card("🍽️", "Ricette", "#/ricette")}
        ${card("📦", "Magazzino", "#/magazzino")}
        ${card("🧾", "Acquisti", "#/acquisti")}
        ${card("📑", "Preventivi", "#/preventivi")}
        ${card("📊", "Report", "#/report")}
        ${card("⚙️", "Impostazioni", "#/impostazioni")}

      </div>

    </div>
  `;
}

function card(icon, label, hash) {
  return `
    <div 
      class="app-button"
      style="padding:22px; text-align:center; border-radius:18px;"
      onclick="window.location.hash='${hash}'"
    >
      <div style="font-size:24px; margin-bottom:8px;">${icon}</div>
      ${label}
    </div>
  `;
}
