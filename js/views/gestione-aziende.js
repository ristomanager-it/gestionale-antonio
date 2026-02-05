// js/views/gestione-aziende.js
// =======================================
// Gestione Aziende - Superadmin Ristoflow
// =======================================

import { supabase } from "../supabaseClient.js"; 
// ⚠️ usa il tuo client Supabase globale
// se lo hai già su window.supabase, sostituisci con:
// const supabase = window.supabase;

const DEFAULT_FEATURES = {
  timbrature: true,
  dipendenti: true,
  ricette: true,
  ricettario: true,
  magazzino: true,
  acquisti: true,
  preventivi: true,
  venduto: true,
  report: true,
};

export async function render(container) {
  const azienda = window.state.azienda;

  // 🔒 sicurezza
  if (!azienda || azienda.stato !== "piattaforma") {
    container.innerHTML = `
      <div style="padding:20px;">
        <h2>Accesso negato</h2>
        <p>Questa sezione è riservata al superadmin.</p>
      </div>
    `;
    return;
  }

  const aziende = await loadAziende();

  container.innerHTML = `
    <div style="padding:20px; max-width:1000px; margin:0 auto;">
      <h1>Gestione Aziende</h1>
      <p style="margin-bottom:16px;">
        Gestisci le aziende clienti della piattaforma Ristoflow
      </p>

      <div style="margin-bottom:20px;">
        <button id="btn-nuova-azienda" class="app-button green">
          ➕ Nuova azienda
        </button>

        <button
          class="app-button"
          style="margin-left:8px;"
          onclick="window.location.hash='#/home'"
        >
          ⬅ Torna alla dashboard
        </button>
      </div>

      <div class="table-wrapper">
        <table class="table-timbrature">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Codice</th>
              <th>Stato</th>
              <th>Attiva</th>
              <th>Scadenza</th>
              <th>Feature</th>
            </tr>
          </thead>
          <tbody>
            ${aziende.map(renderRow).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document
    .getElementById("btn-nuova-azienda")
    ?.addEventListener("click", () => {
      window.location.hash = "#/crea-azienda";
    });

  wireTableActions(container);
}

/* =======================================
   DATA
======================================= */

async function loadAziende() {
  const { data, error } = await supabase
    .from("aziende")
    .select(
      "id, nome, codice, stato, attiva, data_scadenza, features, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    alert("Errore caricamento aziende");
    return [];
  }

  return data || [];
}

async function updateAzienda(id, patch) {
  const { error } = await supabase
    .from("aziende")
    .update(patch)
    .eq("id", id);

  if (error) throw error;
}

/* =======================================
   RENDER
======================================= */

function renderRow(a) {
  const features = a.features || {};

  return `
    <tr data-id="${a.id}">
      <td>${escapeHtml(a.nome)}</td>
      <td>${escapeHtml(a.codice)}</td>
      <td>${a.stato}</td>

      <td>
        <input
          type="checkbox"
          class="js-toggle-attiva"
          ${a.attiva ? "checked" : ""}
        />
      </td>

      <td>${a.data_scadenza || "-"}</td>

      <td>
        <details>
          <summary style="cursor:pointer;">Gestisci</summary>
          <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
            ${Object.keys(DEFAULT_FEATURES)
              .map(
                (k) => `
                <label style="font-size:13px;">
                  <input
                    type="checkbox"
                    class="js-toggle-feature"
                    data-feature="${k}"
                    ${features[k] === true ? "checked" : ""}
                  />
                  ${k}
                </label>
              `
              )
              .join("")}
          </div>
        </details>
      </td>
    </tr>
  `;
}

/* =======================================
   EVENTS
======================================= */

function wireTableActions(container) {
  container.addEventListener("change", async (e) => {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;

    const id = row.dataset.id;

    // Toggle attiva
    if (e.target.classList.contains("js-toggle-attiva")) {
      try {
        await updateAzienda(id, { attiva: e.target.checked });
      } catch (err) {
        alert("Errore aggiornamento stato azienda");
        e.target.checked = !e.target.checked;
      }
    }

    // Toggle feature
    if (e.target.classList.contains("js-toggle-feature")) {
      try {
        const inputs = row.querySelectorAll(".js-toggle-feature");
        const features = {};

        inputs.forEach((i) => {
          features[i.dataset.feature] = i.checked;
        });

        await updateAzienda(id, { features });
      } catch (err) {
        alert("Errore aggiornamento feature");
        e.target.checked = !e.target.checked;
      }
    }
  });
}

/* =======================================
   UTILS
======================================= */

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => {
    return (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m] || m
    );
  });
}
