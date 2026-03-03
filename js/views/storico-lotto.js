// js/views/storico-lotto.js

import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(app) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    app.innerHTML = "<section class='view'><h3>Nessuna azienda attiva</h3></section>";
    return;
  }

  app.innerHTML = createPageLayout({
    title: "Storico Lotti",
    subtitle: "Tracciabilità produzione e vendite",
    content: `
      ${createCard({
        title: "Filtri",
        body: `
          <div class="form-grid">
            <div class="form-group">
              <label>Nome ricetta</label>
              <input id="f-nome" class="input" placeholder="Es: Ragù..." />
            </div>

            <div class="form-group">
              <label>Data produzione</label>
              <input id="f-data" type="date" class="input" />
            </div>

            <div class="form-group">
              <label>Ingrediente</label>
              <input id="f-prodotto" class="input" placeholder="Es: Carne..." />
            </div>

            <div class="form-actions" style="grid-column:1/-1;">
              <button id="btn-cerca" class="app-button">Cerca</button>
              <button id="btn-reset" class="app-button secondary">Reset</button>
            </div>
          </div>
        `
      })}

      ${createCard({
        title: "Risultati",
        body: `
          <div style="overflow:auto;">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Lotto</th>
                  <th>Data</th>
                  <th>Ricetta</th>
                  <th>Ingrediente</th>
                  <th>Vendita</th>
                  <th>Canale</th>
                  <th>Q.tà lotto usata</th>
                </tr>
              </thead>
              <tbody id="tabella-risultati"></tbody>
            </table>
          </div>
        `
      })}
    `
  });

  bindEvents();
  await caricaRisultati();
}

function bindEvents() {
  document.getElementById("btn-cerca")?.addEventListener("click", caricaRisultati);

  document.getElementById("btn-reset")?.addEventListener("click", () => {
    document.getElementById("f-nome").value = "";
    document.getElementById("f-data").value = "";
    document.getElementById("f-prodotto").value = "";
    caricaRisultati();
  });
}

async function caricaRisultati() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state.azienda.id;

  const nome = document.getElementById("f-nome").value.trim();
  const data = document.getElementById("f-data").value;
  const prodotto = document.getElementById("f-prodotto").value.trim();

  let query = supabase
    .from("vw_storico_lotto_app")
    .select("*")
    .eq("azienda_id", aziendaId)
    .limit(500);

  if (nome) {
    query = query.ilike("ricetta_nome", `%${nome}%`);
  }

  if (data) {
    query = query.eq("data_produzione", data);
  }

  if (prodotto) {
    query = query.ilike("ingrediente_nome", `%${prodotto}%`);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error(error);
    alert("Errore caricamento dati");
    return;
  }

  renderTable(rows || []);
}

function renderTable(rows) {
  const tbody = document.getElementById("tabella-risultati");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7">Nessun risultato</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.codice_lotto || "")}</td>
      <td>${r.data_produzione || ""}</td>
      <td>${escapeHtml(r.ricetta_nome || "")}</td>
      <td>${escapeHtml(r.ingrediente_nome || "")}</td>
      <td>${r.data_vendita || ""}</td>
      <td>${escapeHtml(r.canale || "")}</td>
      <td>${r.quantita_lotto_usata || ""}</td>
    </tr>
  `).join("");
}

function escapeHtml(str) {
  return (str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
