// js/views/crea-preventivo.js
import { createPageLayout, createCard } from "../utils/pageLayout.js";

let menuRows = [];
let extraRows = [];

export async function render(container) {
  menuRows = [];
  extraRows = [];

  container.innerHTML = createPageLayout({
    title: "Crea Nuovo Preventivo",
    subtitle: "Dati cliente, evento, menù ed extra",
    content: `
      <form id="preventivo-form">

        ${createCard({
          title: "Dati Cliente ed Evento",
          body: `
            <div class="form-grid">

              <div class="form-group">
                <label for="preventivo-cliente-nome">Nome Cliente</label>
                <input class="input" type="text" id="preventivo-cliente-nome" required placeholder="Nome Cliente">
              </div>

              <div class="form-group">
                <label for="preventivo-cliente-cognome">Cognome Cliente</label>
                <input class="input" type="text" id="preventivo-cliente-cognome" required placeholder="Cognome Cliente">
              </div>

              <div class="form-group">
                <label for="preventivo-cliente-email">Email Cliente</label>
                <input class="input" type="email" id="preventivo-cliente-email" required placeholder="Email Cliente">
              </div>

              <div class="form-group">
                <label for="preventivo-titolo">Titolo Evento</label>
                <input class="input" type="text" id="preventivo-titolo" required placeholder="Titolo Evento">
              </div>

              <div class="form-group">
                <label for="preventivo-tipo-servizio">Tipo Servizio</label>
                <input class="input" type="text" id="preventivo-tipo-servizio" required placeholder="Tipo di Servizio">
              </div>

              <div class="form-group">
                <label for="preventivo-data-evento">Data Evento</label>
                <input class="input" type="date" id="preventivo-data-evento" required>
              </div>

              <div class="form-group">
                <label for="preventivo-n-invitati">Numero Invitati</label>
                <input class="input" type="number" id="preventivo-n-invitati" required>
              </div>

              <div class="form-group">
                <label for="preventivo-location">Location</label>
                <input class="input" type="text" id="preventivo-location" required placeholder="Location">
              </div>

              <div class="form-group">
                <label for="preventivo-sconto-menu">Sconto Menù (%)</label>
                <select class="input" id="preventivo-sconto-menu">
                  <option value="0">0%</option>
                  <option value="10">10%</option>
                  <option value="20">20%</option>
                </select>
              </div>

              <div class="form-group">
                <label for="preventivo-acconto">Acconto (€)</label>
                <input class="input" type="number" id="preventivo-acconto" value="0" min="0" step="0.01">
              </div>

              <div class="form-group">
                <label for="preventivo-totale">Totale (€)</label>
                <input class="input" type="number" id="preventivo-totale" value="0" readonly>
              </div>

              <div class="form-group">
                <label for="preventivo-saldo">Saldo (€)</label>
                <input class="input" type="number" id="preventivo-saldo" value="0" readonly>
              </div>

            </div>

            <div class="form-group" style="margin-top:16px;">
              <label for="preventivo-note">Note</label>
              <textarea class="input" id="preventivo-note" placeholder="Eventuali Note"></textarea>
            </div>
          `
        })}

        ${createCard({
          title: "Menu",
          body: `
            <div style="overflow:auto;">
              <table id="preventivo-menu" style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">Nome Piatto</th>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">Quantità</th>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">Costo Unitario (€)</th>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">Costo Totale (€)</th>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);"></th>
                  </tr>
                </thead>
                <tbody id="preventivo-menu-tbody"></tbody>
              </table>
            </div>

            <div class="form-actions">
              <button type="button" class="app-button secondary" id="btn-add-menu-row">Aggiungi Menu</button>
            </div>
          `
        })}

        ${createCard({
          title: "Extra",
          body: `
            <div style="overflow:auto;">
              <table id="preventivo-extra" style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">Descrizione</th>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">Quantità</th>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">Prezzo Unitario (€)</th>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);">Costo Totale (€)</th>
                    <th style="text-align:left; padding:8px; border-bottom:1px solid var(--color-border);"></th>
                  </tr>
                </thead>
                <tbody id="preventivo-extra-tbody"></tbody>
              </table>
            </div>

            <div class="form-actions">
              <button type="button" class="app-button secondary" id="btn-add-extra-row">Aggiungi Extra</button>
            </div>
          `
        })}

        <div class="form-actions">
          <button type="submit" id="btn-save-preventivo" class="app-button">💾 Salva Preventivo</button>
          <button type="button" id="btn-email-preventivo" class="app-button secondary">✉️ Invia Email</button>
          <button type="button" id="btn-print-preventivo" class="app-button secondary">🖨️ Stampa</button>
        </div>

        <div id="preventivo-result" class="form-result"></div>

      </form>
    `
  });

  bindPreventivoEvents();
  renderMenuRows();
  renderExtraRows();
  recalcPreventivoTotali();
}

function bindPreventivoEvents() {
  const form = document.getElementById("preventivo-form");
  const btnAddMenuRow = document.getElementById("btn-add-menu-row");
  const btnAddExtraRow = document.getElementById("btn-add-extra-row");
  const btnEmail = document.getElementById("btn-email-preventivo");
  const btnPrint = document.getElementById("btn-print-preventivo");

  btnAddMenuRow.addEventListener("click", () => addMenuRow());
  btnAddExtraRow.addEventListener("click", () => addExtraRow());

  document.getElementById("preventivo-acconto").addEventListener("input", () => recalcPreventivoTotali());
  document.getElementById("preventivo-sconto-menu").addEventListener("change", () => recalcPreventivoTotali());

  document.getElementById("preventivo-menu-tbody").addEventListener("input", onMenuTableInput);
  document.getElementById("preventivo-extra-tbody").addEventListener("input", onExtraTableInput);

  document.getElementById("preventivo-menu-tbody").addEventListener("click", onMenuTableClick);
  document.getElementById("preventivo-extra-tbody").addEventListener("click", onExtraTableClick);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await savePreventivo();
  });

  btnEmail.addEventListener("click", async () => {
    await emailCurrentPreventivoViaMailto();
  });

  btnPrint.addEventListener("click", () => {
    printCurrentPreventivo();
  });
}

function addMenuRow() {
  menuRows.push({
    nome_piatto: "",
    quantita: 1,
    costo_unitario: 0,
    costo_totale: 0
  });
  renderMenuRows();
}

function addExtraRow() {
  extraRows.push({
    descrizione: "",
    quantita: 1,
    prezzo_unitario: 0,
    costo_totale: 0
  });
  renderExtraRows();
}

function removeMenuRow(index) {
  menuRows.splice(index, 1);
  renderMenuRows();
}

function removeExtraRow(index) {
  extraRows.splice(index, 1);
  renderExtraRows();
}

function renderMenuRows() {
  const body = document.getElementById("preventivo-menu-tbody");
  body.innerHTML = menuRows
    .map((row, index) => {
      return `
        <tr data-index="${index}">
          <td style="padding:8px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="text" data-field="nome_piatto" value="${escapeAttr(row.nome_piatto)}" placeholder="Nome piatto">
          </td>
          <td style="padding:8px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="number" data-field="quantita" value="${escapeAttr(row.quantita)}" min="0" step="1">
          </td>
          <td style="padding:8px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="number" data-field="costo_unitario" value="${escapeAttr(row.costo_unitario)}" min="0" step="0.01">
          </td>
          <td style="padding:8px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="number" value="${Number(row.costo_totale || 0).toFixed(2)}" disabled>
          </td>
          <td style="padding:8px; border-bottom:1px solid var(--color-border); white-space:nowrap;">
            <button type="button" class="app-button secondary" data-action="remove-menu">Rimuovi</button>
          </td>
        </tr>
      `;
    })
    .join("");

  recalcPreventivoTotali();
}

function renderExtraRows() {
  const body = document.getElementById("preventivo-extra-tbody");
  body.innerHTML = extraRows
    .map((row, index) => {
      return `
        <tr data-index="${index}">
          <td style="padding:8px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="text" data-field="descrizione" value="${escapeAttr(row.descrizione)}" placeholder="Descrizione">
          </td>
          <td style="padding:8px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="number" data-field="quantita" value="${escapeAttr(row.quantita)}" min="0" step="1">
          </td>
          <td style="padding:8px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="number" data-field="prezzo_unitario" value="${escapeAttr(row.prezzo_unitario)}" min="0" step="0.01">
          </td>
          <td style="padding:8px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="number" value="${Number(row.costo_totale || 0).toFixed(2)}" disabled>
          </td>
          <td style="padding:8px; border-bottom:1px solid var(--color-border); white-space:nowrap;">
            <button type="button" class="app-button secondary" data-action="remove-extra">Rimuovi</button>
          </td>
        </tr>
      `;
    })
    .join("");

  recalcPreventivoTotali();
}

function onMenuTableInput(e) {
  const input = e.target;
  if (!(input instanceof HTMLInputElement)) return;

  const tr = input.closest("tr");
  if (!tr) return;

  const index = Number(tr.dataset.index);
  const field = input.dataset.field;
  if (!Number.isFinite(index) || !field) return;

  const row = menuRows[index];
  if (!row) return;

  if (field === "nome_piatto") row.nome_piatto = input.value || "";
  if (field === "quantita") row.quantita = toNumber(input.value);
  if (field === "costo_unitario") row.costo_unitario = toNumber(input.value);

  recalcPreventivoTotali();
}

function onExtraTableInput(e) {
  const input = e.target;
  if (!(input instanceof HTMLInputElement)) return;

  const tr = input.closest("tr");
  if (!tr) return;

  const index = Number(tr.dataset.index);
  const field = input.dataset.field;
  if (!Number.isFinite(index) || !field) return;

  const row = extraRows[index];
  if (!row) return;

  if (field === "descrizione") row.descrizione = input.value || "";
  if (field === "quantita") row.quantita = toNumber(input.value);
  if (field === "prezzo_unitario") row.prezzo_unitario = toNumber(input.value);

  recalcPreventivoTotali();
}

function onMenuTableClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.action !== "remove-menu") return;

  const tr = btn.closest("tr");
  if (!tr) return;

  const index = Number(tr.dataset.index);
  if (!Number.isFinite(index)) return;

  removeMenuRow(index);
}

function onExtraTableClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.action !== "remove-extra") return;

  const tr = btn.closest("tr");
  if (!tr) return;

  const index = Number(tr.dataset.index);
  if (!Number.isFinite(index)) return;

  removeExtraRow(index);
}

function recalcPreventivoTotali() {
  const scontoPerc = toNumber(document.getElementById("preventivo-sconto-menu")?.value);
  const acconto = toNumber(document.getElementById("preventivo-acconto")?.value);

  let totaleMenu = 0;
  menuRows.forEach((row) => {
    const q = toNumber(row.quantita);
    const cu = toNumber(row.costo_unitario);
    row.costo_totale = q * cu;
    totaleMenu += row.costo_totale;
  });

  let totaleExtra = 0;
  extraRows.forEach((row) => {
    const q = toNumber(row.quantita);
    const pu = toNumber(row.prezzo_unitario);
    row.costo_totale = q * pu;
    totaleExtra += row.costo_totale;
  });

  const totaleMenuScontato = totaleMenu * (1 - (scontoPerc / 100));
  const totale = totaleMenuScontato + totaleExtra;

  const totaleEl = document.getElementById("preventivo-totale");
  if (totaleEl) totaleEl.value = totale.toFixed(2);

  const saldoEl = document.getElementById("preventivo-saldo");
  if (saldoEl) saldoEl.value = Math.max(0, totale - acconto).toFixed(2);

  refreshRowTotalsUI();
}

function refreshRowTotalsUI() {
  const menuBody = document.getElementById("preventivo-menu-tbody");
  if (menuBody) {
    [...menuBody.querySelectorAll("tr")].forEach((tr) => {
      const index = Number(tr.dataset.index);
      const row = menuRows[index];
      if (!row) return;
      const disabledTotal = tr.querySelector("td input[disabled]");
      if (disabledTotal instanceof HTMLInputElement) {
        disabledTotal.value = Number(row.costo_totale || 0).toFixed(2);
      }
    });
  }

  const extraBody = document.getElementById("preventivo-extra-tbody");
  if (extraBody) {
    [...extraBody.querySelectorAll("tr")].forEach((tr) => {
      const index = Number(tr.dataset.index);
      const row = extraRows[index];
      if (!row) return;
      const disabledTotal = tr.querySelector("td input[disabled]");
      if (disabledTotal instanceof HTMLInputElement) {
        disabledTotal.value = Number(row.costo_totale || 0).toFixed(2);
      }
    });
  }
}

async function savePreventivo() {
  const supabase = window.supabaseClient;
  const result = document.getElementById("preventivo-result");

  const clienteNome = getVal("preventivo-cliente-nome");
  const clienteCognome = getVal("preventivo-cliente-cognome");
  const clienteEmail = getVal("preventivo-cliente-email");
  const titoloEvento = getVal("preventivo-titolo");
  const tipoServizio = getVal("preventivo-tipo-servizio");
  const dataEvento = getVal("preventivo-data-evento");
  const nInvitati = toNumber(getVal("preventivo-n-invitati"));
  const location = getVal("preventivo-location");
  const note = getVal("preventivo-note");
  const acconto = toNumber(getVal("preventivo-acconto"));
  const totale = toNumber(getVal("preventivo-totale"));
  const aziendaId = window.state?.azienda?.id || null;

  if (!supabase) {
    if (result) result.innerHTML = `<span class="error-text">Errore: supabaseClient non disponibile</span>`;
    return;
  }

  const payload = {
    azienda_id: aziendaId,
    cliente_nome: clienteNome,
    cliente_cognome: clienteCognome,
    cliente_email: clienteEmail,
    titolo_evento: titoloEvento,
    tipo_servizio: tipoServizio,
    data_evento: dataEvento || null,
    n_invitati: nInvitati || 0,
    location,
    note,
    acconto,
    totale,
    menu: menuRows,
    extra: extraRows
  };

  const { error } = await supabase
    .from("preventivi")
    .insert([payload]);

  if (error) {
    if (result) result.innerHTML = `<span class="error-text">Errore nel salvataggio: ${escapeHtml(error.message)}</span>`;
    return;
  }

  if (result) result.innerHTML = `<span class="success-text">Preventivo creato correttamente ✔</span>`;
  window.location.hash = "#/preventivi";
}

async function emailCurrentPreventivoViaMailto() {
  const clienteEmail = getVal("preventivo-cliente-email");
  if (!clienteEmail) {
    alert("Inserisci l'email del cliente.");
    return;
  }

  const clienteNome = getVal("preventivo-cliente-nome");
  const clienteCognome = getVal("preventivo-cliente-cognome");
  const dataEvento = getVal("preventivo-data-evento");
  const tipologiaEvento = getVal("preventivo-titolo");
  const totale = getVal("preventivo-totale");

  const subject = `Preventivo per il tuo evento - ${tipologiaEvento || ""}`;
  const body = `
Gentile ${clienteNome} ${clienteCognome},

Ti inviamo il preventivo per il tuo evento:
Tipo di evento: ${tipologiaEvento}
Data evento: ${dataEvento}
Totale: €${totale}

Grazie,
Il team.
  `.trim();

  const mailtoLink = `mailto:${clienteEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}

function printCurrentPreventivo() {
  const clienteNome = getVal("preventivo-cliente-nome");
  const clienteCognome = getVal("preventivo-cliente-cognome");
  const dataEvento = getVal("preventivo-data-evento");
  const tipologiaEvento = getVal("preventivo-titolo");
  const totale = getVal("preventivo-totale");

  const menuElenco = menuRows.map(r => r.nome_piatto).filter(Boolean).join(", ");

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>Preventivo</title>
        <meta charset="utf-8" />
      </head>
      <body>
        <h1>Preventivo per il tuo evento</h1>
        <p><strong>Cliente:</strong> ${escapeHtml(clienteNome)} ${escapeHtml(clienteCognome)}</p>
        <p><strong>Data evento:</strong> ${escapeHtml(dataEvento)}</p>
        <p><strong>Tipo evento:</strong> ${escapeHtml(tipologiaEvento)}</p>
        <p><strong>Menù proposto:</strong> ${escapeHtml(menuElenco)}</p>
        <p><strong>Totale:</strong> €${escapeHtml(totale)}</p>
        <button onclick="window.print()">Stampa</button>
      </body>
    </html>
  `);
  win.document.close();
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return (el.value ?? "").toString().trim();
  }
  return "";
}

function toNumber(v) {
  const n = parseFloat((v ?? "").toString().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}
