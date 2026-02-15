// js/views/gestione-aziende.js
import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  // 🔒 Accesso solo piattaforma
  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Accesso negato</h3>
          <p>Sezione riservata alla piattaforma.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <h2 style="margin-top:0;">Gestione Aziende</h2>

      <!-- 🔔 KPI SCADENZE -->
      <div style="margin-top:16px;">
        <h3>Stato Abbonamenti</h3>

        <div class="kpi-cards">
          <div class="kpi-card">
            <h3>Regolari</h3>
            <p id="kpi-aziende-regolari">0</p>
          </div>
          <div class="kpi-card">
            <h3>In scadenza</h3>
            <p id="kpi-aziende-scadenza">0</p>
          </div>
          <div class="kpi-card">
            <h3>Scadute</h3>
            <p id="kpi-aziende-scadute">0</p>
          </div>
        </div>

        <h4 style="margin-top:14px;">⚠ In scadenza</h4>
        <div id="lista-aziende-scadenza"></div>

        <h4 style="margin-top:14px;">🚨 Scadute</h4>
        <div id="lista-aziende-scadute"></div>
      </div>

      <!-- 🔎 RICERCA -->
      <div style="margin-top:24px;">
        <input 
          id="search-input" 
          class="input-pill"
          placeholder="Cerca azienda (min 2 caratteri)"
        />
      </div>

      <div id="search-results" style="margin-top:16px;"></div>

      <div style="margin-top:24px;">
        <button class="app-button small gray" id="btn-home">
          ⬅ Dashboard
        </button>
      </div>
    </div>
  `;

  document.getElementById("btn-home").onclick = () => {
    window.location.hash = "#/home";
  };

  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  results.innerHTML = `
    <p class="small-muted">Digita per cercare un’azienda.</p>
  `;

  input.addEventListener("input", async () => {
    const q = input.value.trim();

    if (q.length < 2) {
      results.innerHTML = `
        <p class="small-muted">Digita almeno 2 caratteri.</p>
      `;
      return;
    }

    const filter =
      "nome.ilike.%" + q + "%," +
      "codice.ilike.%" + q + "%," +
      "email.ilike.%" + q + "%," +
      "partita_iva.ilike.%" + q + "%";

    const { data, error } = await supabase
      .from("aziende")
      .select("id,nome,codice,email,referente,stato")
      .or(filter)
      .limit(20);

    if (error) {
      console.error("Errore ricerca aziende:", error);
      results.innerHTML = `
        <p style="color:#dc2626;">
          Errore ricerca: ${error.message}
        </p>
      `;
      return;
    }

    if (!data || data.length === 0) {
      results.innerHTML = `
        <p class="small-muted">Nessuna azienda trovata.</p>
      `;
      return;
    }

    results.innerHTML = "";

    data.forEach((azienda) => {
      const card = document.createElement("div");
      card.className = "view";
      card.style.marginBottom = "12px";

      card.innerHTML = `
        <strong>${azienda.nome}</strong><br>
        <span class="small-muted">Codice: ${azienda.codice}</span><br>
        <span class="small-muted">Email: ${azienda.email || "-"}</span><br>
        <span class="small-muted">Stato: ${azienda.stato}</span>

        <div style="margin-top:10px;">
          <button class="app-button small gray btn-apri">
            ✏️ Apri scheda
          </button>
        </div>
      `;

      const btn = card.querySelector(".btn-apri");

      btn.addEventListener("click", () => {
        window.location.hash = "#/modificaAzienda?id=" + azienda.id;
      });

      results.appendChild(card);
    });
  });

  // 🔔 Caricamento stato scadenze
  await caricaStatoScadenzeAziende();
}


// ===============================
// FUNZIONE SCADENZE (NUOVA)
// ===============================
async function caricaStatoScadenzeAziende() {
  const { data, error } = await supabase
    .from("aziende_scadenze")
    .select("*");

  if (error) {
    console.error("Errore caricamento scadenze:", error);
    return;
  }

  const regolari = [];
  const inScadenza = [];
  const scadute = [];

  data.forEach((az) => {
    if (az.stato_scadenza_calcolato === "scaduta") {
      scadute.push(az);
    } else if (az.stato_scadenza_calcolato === "in_scadenza") {
      inScadenza.push(az);
    } else {
      regolari.push(az);
    }
  });

  const elReg = document.getElementById("kpi-aziende-regolari");
  const elSca = document.getElementById("kpi-aziende-scadenza");
  const elScad = document.getElementById("kpi-aziende-scadute");

  if (elReg) elReg.textContent = regolari.length;
  if (elSca) elSca.textContent = inScadenza.length;
  if (elScad) elScad.textContent = scadute.length;

  const listaScadute = document.getElementById("lista-aziende-scadute");
  const listaInScadenza = document.getElementById("lista-aziende-scadenza");

  if (!listaScadute || !listaInScadenza) return;

  listaScadute.innerHTML = "";
  listaInScadenza.innerHTML = "";

  scadute.forEach((az) => {
    const div = document.createElement("div");
    div.className = "pill-alert red";
    div.textContent = `${az.nome} — scaduta il ${az.data_scadenza}`;
    listaScadute.appendChild(div);
  });

  inScadenza.forEach((az) => {
    const div = document.createElement("div");
    div.className = "pill-alert yellow";
    div.textContent = `${az.nome} — scade il ${az.data_scadenza}`;
    listaInScadenza.appendChild(div);
  });
}
