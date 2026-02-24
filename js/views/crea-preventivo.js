// js/views/crea-preventivo.js
import { createPageLayout, createCard } from "../utils/pageLayout.js";

const CANALE_PREVENTIVO = "banchetto";

let menuRows = [];
let extraRows = [];

let ricetteCache = []; // [{id, nome}]
let prezziByRicettaId = new Map(); // ricetta_id -> prezzo_vendita (number)

let lastDiscountEdited = "perc"; // "perc" | "euro" | null

export async function render(container) {
  menuRows = [];
  extraRows = [];
  ricetteCache = [];
  prezziByRicettaId = new Map();
  lastDiscountEdited = "perc";

  await loadRicetteEPrezzi();

  container.innerHTML = createPageLayout({
    title: "Crea Nuovo Preventivo",
    subtitle: "Cliente, evento, portate, extra e calcolo economico",
    content: `
      <form id="preventivo-form">

        ${createCard({
          title: "Dati Cliente e Evento",
          body: `
            <div class="form-grid">

              <div class="form-group">
                <label for="preventivo-cliente-nome">Nome Cliente</label>
                <input class="input" type="text" id="preventivo-cliente-nome" required placeholder="Nome">
              </div>

              <div class="form-group">
                <label for="preventivo-cliente-cognome">Cognome Cliente</label>
                <input class="input" type="text" id="preventivo-cliente-cognome" required placeholder="Cognome">
              </div>

              <div class="form-group">
                <label for="preventivo-cliente-email">Email Cliente</label>
                <input class="input" type="email" id="preventivo-cliente-email" placeholder="email@cliente.it">
              </div>

              <div class="form-group">
                <label for="preventivo-titolo">Titolo Evento</label>
                <input class="input" type="text" id="preventivo-titolo" required placeholder="Es. Compleanno, Cena aziendale...">
              </div>

              <div class="form-group">
                <label for="preventivo-tipo-servizio">Tipo Servizio</label>
                <input class="input" type="text" id="preventivo-tipo-servizio" placeholder="Es. Catering, Banchetto...">
              </div>

              <div class="form-group">
                <label for="preventivo-data-evento">Data Evento</label>
                <input class="input" type="date" id="preventivo-data-evento" required>
              </div>

              <div class="form-group">
                <label for="preventivo-n-invitati">Numero Invitati</label>
                <input class="input" type="number" id="preventivo-n-invitati" value="1" min="1" step="1">
              </div>

              <div class="form-group">
                <label for="preventivo-location">Location</label>
                <input class="input" type="text" id="preventivo-location" placeholder="Descrizione location">
              </div>

              <div class="form-group">
                <label for="preventivo-location-prezzo">Prezzo Location (€)</label>
                <input class="input" type="number" id="preventivo-location-prezzo" value="0" min="0" step="0.01">
              </div>

            </div>

            <div class="form-group" style="margin-top:16px;">
              <label for="preventivo-note">Note</label>
              <textarea class="input" id="preventivo-note" placeholder="Eventuali note..."></textarea>
            </div>
          `
        })}

        ${createCard({
          title: "Menu Evento",
          body: `
            <div class="table-wrap">
              <table class="app-table" style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border);">Portata (Ricettario)</th>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border); width:140px;">Quantità</th>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border); width:160px;">Prezzo Unit. (€)</th>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border); width:160px;">Totale (€)</th>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border); width:120px;"></th>
                  </tr>
                </thead>
                <tbody id="preventivo-menu-tbody"></tbody>
              </table>
            </div>

            <div class="form-actions">
              <button type="button" class="app-button secondary" id="btn-add-portata">+ Aggiungi Portata</button>
            </div>
          `
        })}

        ${createCard({
          title: "Extra",
          body: `
            <div class="table-wrap">
              <table class="app-table" style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border);">Descrizione</th>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border); width:140px;">Quantità</th>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border); width:160px;">Prezzo Unit. (€)</th>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border); width:160px;">Totale (€)</th>
                    <th style="text-align:left; padding:10px; border-bottom:1px solid var(--color-border); width:120px;"></th>
                  </tr>
                </thead>
                <tbody id="preventivo-extra-tbody"></tbody>
              </table>
            </div>

            <div class="form-actions">
              <button type="button" class="app-button secondary" id="btn-add-extra">+ Aggiungi Extra</button>
            </div>
          `
        })}

        ${createCard({
          title: "Sezione Economica",
          body: `
            <div class="form-grid">

              <div class="form-group">
                <label for="preventivo-subtotale-menu">Subtotale Menu (€)</label>
                <input class="input" type="number" id="preventivo-subtotale-menu" value="0" readonly>
              </div>

              <div class="form-group">
                <label for="preventivo-subtotale-extra">Subtotale Extra (€)</label>
                <input class="input" type="number" id="preventivo-subtotale-extra" value="0" readonly>
              </div>

              <div class="form-group">
                <label for="preventivo-subtotale-location">Subtotale Location (€)</label>
                <input class="input" type="number" id="preventivo-subtotale-location" value="0" readonly>
              </div>

              <div class="form-group">
                <label for="preventivo-sconto-perc">Sconto (%)</label>
                <input class="input" type="number" id="preventivo-sconto-perc" value="0" min="0" max="100" step="0.01">
              </div>

              <div class="form-group">
                <label for="preventivo-sconto-euro">Sconto (€)</label>
                <input class="input" type="number" id="preventivo-sconto-euro" value="0" min="0" step="0.01">
              </div>

              <div class="form-group">
                <label for="preventivo-totale">Totale Finale (€)</label>
                <input class="input" type="number" id="preventivo-totale" value="0" readonly>
              </div>

              <div class="form-group">
                <label for="preventivo-acconto">Acconto (€)</label>
                <input class="input" type="number" id="preventivo-acconto" value="0" min="0" step="0.01">
              </div>

              <div class="form-group">
                <label for="preventivo-saldo">Saldo (€)</label>
                <input class="input" type="number" id="preventivo-saldo" value="0" readonly>
              </div>

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

/* ============================================================ */
/* DATA LOAD */
/* ============================================================ */

async function loadRicetteEPrezzi() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!supabase || !aziendaId) {
    ricetteCache = [];
    prezziByRicettaId = new Map();
    return;
  }

  const { data: ricette, error: errRic } = await supabase
    .from("ricette")
    .select("id, nome")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome", { ascending: true });

  if (errRic) {
    console.error("Errore caricamento ricette:", errRic);
    ricetteCache = [];
  } else {
    ricetteCache = ricette || [];
  }

  const { data: prezzi, error: errPrez } = await supabase
    .from("ricette_prezzi_canale")
    .select("ricetta_id, prezzo_vendita, attivo")
    .eq("azienda_id", aziendaId)
    .eq("canale", CANALE_PREVENTIVO)
    .eq("attivo", true);

  if (errPrez) {
    console.error("Errore caricamento prezzi canale:", errPrez);
    prezziByRicettaId = new Map();
    return;
  }

  prezziByRicettaId = new Map(
    (prezzi || []).map(p => [String(p.ricetta_id), toNumber(p.prezzo_vendita)])
  );
}

/* ============================================================ */
/* BIND EVENTS */
/* ============================================================ */

function bindPreventivoEvents() {
  const form = document.getElementById("preventivo-form");
  const btnAddPortata = document.getElementById("btn-add-portata");
  const btnAddExtra = document.getElementById("btn-add-extra");
  const btnEmail = document.getElementById("btn-email-preventivo");
  const btnPrint = document.getElementById("btn-print-preventivo");

  const invitatiEl = document.getElementById("preventivo-n-invitati");
  const accontoEl = document.getElementById("preventivo-acconto");
  const scontoPercEl = document.getElementById("preventivo-sconto-perc");
  const scontoEuroEl = document.getElementById("preventivo-sconto-euro");
  const locationPrezzoEl = document.getElementById("preventivo-location-prezzo");

  btnAddPortata?.addEventListener("click", addMenuRow);
  btnAddExtra?.addEventListener("click", addExtraRow);

  invitatiEl?.addEventListener("input", () => {
    const n = Math.max(1, Math.floor(toNumber(invitatiEl.value)));
    invitatiEl.value = String(n);

    // aggiorna solo le righe in auto
    menuRows.forEach(r => {
      if (r.auto_quantita) r.quantita = n;
    });

    renderMenuRows();
    recalcPreventivoTotali();
  });

  accontoEl?.addEventListener("input", recalcPreventivoTotali);
  locationPrezzoEl?.addEventListener("input", recalcPreventivoTotali);

  scontoPercEl?.addEventListener("input", () => {
    lastDiscountEdited = "perc";
    recalcPreventivoTotali();
  });

  scontoEuroEl?.addEventListener("input", () => {
    lastDiscountEdited = "euro";
    recalcPreventivoTotali();
  });

  document.getElementById("preventivo-menu-tbody")?.addEventListener("input", onMenuTableInput);
  document.getElementById("preventivo-extra-tbody")?.addEventListener("input", onExtraTableInput);

  document.getElementById("preventivo-menu-tbody")?.addEventListener("change", onMenuTableChange);
  document.getElementById("preventivo-menu-tbody")?.addEventListener("click", onMenuTableClick);

  document.getElementById("preventivo-extra-tbody")?.addEventListener("click", onExtraTableClick);

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await savePreventivo();
  });

  btnEmail?.addEventListener("click", emailCurrentPreventivoViaMailto);
  btnPrint?.addEventListener("click", printCurrentPreventivo);
}

/* ============================================================ */
/* MENU ROWS (PORTATE) */
/* ============================================================ */

function addMenuRow() {
  menuRows.push({
    ricetta_id: "",
    ricetta_nome: "",
    prezzo_pp: 0,   // interno, non visibile
    totale: 0       // interno
  });

  renderMenuRows();
  recalcPreventivoTotali();
}

function removeMenuRow(index) {
  menuRows.splice(index, 1);
  renderMenuRows();
  recalcPreventivoTotali();
}

function renderMenuRows() {
  const body = document.getElementById("preventivo-menu-tbody");
  if (!body) return;

  body.innerHTML = menuRows
    .map((row, index) => {
      return `function renderMenuRows() {
  const body = document.getElementById("preventivo-menu-tbody");
  if (!body) return;

  body.innerHTML = menuRows
    .map((row, index) => {

      return `
        <div class="card" style="margin-bottom:16px;" data-index="${index}">

          <div class="form-group">
            <label>Portata</label>
            <select class="input" data-field="ricetta_id">
              <option value="">Seleziona portata</option>
              ${ricetteCache.map(r => {
                const selected = String(r.id) === String(row.ricetta_id) ? "selected" : "";
                return `<option value="${escapeAttr(String(r.id))}" ${selected}>
                  ${escapeHtml(r.nome || "")}
                </option>`;
              }).join("")}
            </select>
          </div>

          <div class="form-actions" style="margin-top:12px;">
            <button type="button"
              class="app-button secondary"
              data-action="remove-menu">
              Rimuovi
            </button>
          </div>

        </div>
      `;
    })
    .join("");
}
/* ============================================================ */
/* EXTRA ROWS */
/* ============================================================ */

function addExtraRow() {
  extraRows.push({
    descrizione: "",
    quantita: 1,
    prezzo_unitario: 0,
    totale: 0
  });

  renderExtraRows();
  recalcPreventivoTotali();
}

function removeExtraRow(index) {
  extraRows.splice(index, 1);
  renderExtraRows();
  recalcPreventivoTotali();
}

function renderExtraRows() {
  const body = document.getElementById("preventivo-extra-tbody");
  if (!body) return;

  body.innerHTML = extraRows
    .map((row, index) => {
      const totale = toNumber(row.totale);
      return `
        <tr data-index="${index}">
          <td style="padding:10px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="text" data-field="descrizione" value="${escapeAttr(row.descrizione)}" placeholder="Descrizione extra">
          </td>

          <td style="padding:10px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="number" data-field="quantita" value="${escapeAttr(String(row.quantita ?? 1))}" min="1" step="1">
          </td>

          <td style="padding:10px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="number" data-field="prezzo_unitario" value="${escapeAttr(String(toNumber(row.prezzo_unitario).toFixed(2)))}" min="0" step="0.01">
          </td>

          <td style="padding:10px; border-bottom:1px solid var(--color-border);">
            <input class="input" type="number" value="${totale.toFixed(2)}" readonly>
          </td>

          <td style="padding:10px; border-bottom:1px solid var(--color-border); white-space:nowrap;">
            <button type="button" class="app-button secondary" data-action="remove-extra">Rimuovi</button>
          </td>
        </tr>
      `;
    })
    .join("");
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
  if (field === "quantita") row.quantita = Math.max(1, Math.floor(toNumber(input.value)));
  if (field === "prezzo_unitario") row.prezzo_unitario = Math.max(0, toNumber(input.value));

  recalcPreventivoTotali();
}

function onExtraTableClick(e) {
  const btn = e.target?.closest("button");
  if (!btn) return;
  if (btn.dataset.action !== "remove-extra") return;

  const tr = btn.closest("tr");
  if (!tr) return;

  const index = Number(tr.dataset.index);
  if (!Number.isFinite(index)) return;

  removeExtraRow(index);
}

/* ============================================================ */
/* TOTALS & DISCOUNT */
/* ============================================================ */

function recalcPreventivoTotali() {

  const invitati = Math.max(1, Math.floor(toNumber(getVal("preventivo-n-invitati")) || 1));
  const locationPrezzo = Math.max(0, toNumber(getVal("preventivo-location-prezzo")));
  const acconto = Math.max(0, toNumber(getVal("preventivo-acconto")));

  /* ================= MENU ================= */

  let subtMenu = 0;

  menuRows.forEach((row) => {
    const prezzoPP = Math.max(0, toNumber(row.prezzo_pp));
    row.totale = prezzoPP * invitati;
    subtMenu += row.totale;
  });

  const prezzoMedioPP = invitati > 0 ? subtMenu / invitati : 0;

  /* ================= EXTRA ================= */

  let subtExtra = 0;

  extraRows.forEach((row) => {
    const q = Math.max(1, Math.floor(toNumber(row.quantita)));
    const pu = Math.max(0, toNumber(row.prezzo_unitario));

    row.quantita = q;
    row.prezzo_unitario = pu;
    row.totale = q * pu;

    subtExtra += row.totale;
  });

  /* ================= BASE ================= */

  const base = subtMenu + subtExtra + locationPrezzo;

  /* ================= SCONTI ================= */

  let scontoPerc = clamp(toNumber(getVal("preventivo-sconto-perc")), 0, 100);
  let scontoEuro = Math.max(0, toNumber(getVal("preventivo-sconto-euro")));

  if (base <= 0) {
    scontoPerc = 0;
    scontoEuro = 0;
  } else {
    if (lastDiscountEdited === "perc") {
      scontoEuro = (base * scontoPerc) / 100;
    } else if (lastDiscountEdited === "euro") {
      scontoEuro = clamp(scontoEuro, 0, base);
      scontoPerc = (scontoEuro / base) * 100;
    } else {
      scontoEuro = (base * scontoPerc) / 100;
    }
  }

  const totale = Math.max(0, base - scontoEuro);
  const saldo = Math.max(0, totale - acconto);

  /* ================= UI UPDATE ================= */

  setNumber("preventivo-subtotale-menu", subtMenu);
  setNumber("preventivo-prezzo-medio-pp", prezzoMedioPP);

  setNumber("preventivo-subtotale-extra", subtExtra);
  setNumber("preventivo-subtotale-location", locationPrezzo);

  setNumber("preventivo-sconto-perc", scontoPerc, { keepTrailing: true });
  setNumber("preventivo-sconto-euro", scontoEuro, { keepTrailing: true });

  setNumber("preventivo-totale", totale);
  setNumber("preventivo-saldo", saldo);
}

/* ============================================================ */
/* SAVE */
/* ============================================================ */

async function savePreventivo() {
  const supabase = window.supabaseClient;
  const result = document.getElementById("preventivo-result");
  const aziendaId = window.state?.azienda?.id || null;

  if (!supabase || !aziendaId) {
    if (result) result.innerHTML = `<span class="error-text">Errore: azienda non attiva o Supabase non disponibile</span>`;
    return;
  }

  // ricalcolo prima di salvare
  recalcPreventivoTotali();

  const payload = {
    azienda_id: aziendaId,

    cliente_nome: getVal("preventivo-cliente-nome"),
    cliente_cognome: getVal("preventivo-cliente-cognome"),
    cliente_email: getVal("preventivo-cliente-email"),

    titolo_evento: getVal("preventivo-titolo"),
    tipo_servizio: getVal("preventivo-tipo-servizio"),
    data_evento: getVal("preventivo-data-evento") || null,
    n_invitati: Math.max(1, Math.floor(toNumber(getVal("preventivo-n-invitati")) || 1)),

    location: getVal("preventivo-location"),
    location_prezzo: Math.max(0, toNumber(getVal("preventivo-location-prezzo"))),

    note: getVal("preventivo-note"),

    canale_prezzo_ricette: CANALE_PREVENTIVO,

    sconto_perc: clamp(toNumber(getVal("preventivo-sconto-perc")), 0, 100),
    sconto_euro: Math.max(0, toNumber(getVal("preventivo-sconto-euro"))),

    acconto: Math.max(0, toNumber(getVal("preventivo-acconto"))),
    totale: Math.max(0, toNumber(getVal("preventivo-totale"))),
    saldo: Math.max(0, toNumber(getVal("preventivo-saldo"))),

    // dettaglio
    menu: menuRows.map(r => ({
      ricetta_id: r.ricetta_id ? Number(r.ricetta_id) : null,
      ricetta_nome: r.ricetta_nome || "",
      quantita: Math.max(1, Math.floor(toNumber(r.quantita))),
      prezzo_unitario: Math.max(0, toNumber(r.prezzo_unitario)),
      totale: Math.max(0, toNumber(r.totale)),
      auto_quantita: r.auto_quantita === true
    })),
    extra: extraRows.map(r => ({
      descrizione: r.descrizione || "",
      quantita: Math.max(1, Math.floor(toNumber(r.quantita))),
      prezzo_unitario: Math.max(0, toNumber(r.prezzo_unitario)),
      totale: Math.max(0, toNumber(r.totale))
    }))
  };

  try {
    if (!payload.cliente_nome || !payload.cliente_cognome || !payload.titolo_evento || !payload.data_evento) {
      if (result) result.innerHTML = `<span class="error-text">Compila i campi obbligatori (cliente, titolo, data).</span>`;
      return;
    }

    // validazione menu: se ci sono righe, ricetta deve essere selezionata
    const invalidMenu = payload.menu.some(r => !r.ricetta_id);
    if (invalidMenu) {
      if (result) result.innerHTML = `<span class="error-text">Seleziona una portata per ogni riga del menù (o rimuovi la riga).</span>`;
      return;
    }

    const { error } = await supabase.from("preventivi").insert([payload]);

    if (error) {
      if (result) result.innerHTML = `<span class="error-text">Errore nel salvataggio: ${escapeHtml(error.message)}</span>`;
      return;
    }

    if (result) result.innerHTML = `<span class="success-text">Preventivo creato correttamente ✔</span>`;
    window.location.hash = "#/preventivi";
  } catch (err) {
    console.error(err);
    if (result) result.innerHTML = `<span class="error-text">Errore: ${escapeHtml(err?.message || "Operazione non riuscita")}</span>`;
  }
}

/* ============================================================ */
/* EMAIL & PRINT */
/* ============================================================ */

function emailCurrentPreventivoViaMailto() {
  const clienteEmail = getVal("preventivo-cliente-email");
  if (!clienteEmail) {
    alert("Inserisci l'email del cliente.");
    return;
  }

  recalcPreventivoTotali();

  const clienteNome = getVal("preventivo-cliente-nome");
  const clienteCognome = getVal("preventivo-cliente-cognome");
  const dataEvento = getVal("preventivo-data-evento");
  const tipologiaEvento = getVal("preventivo-titolo");
  const totale = getVal("preventivo-totale");
  const location = getVal("preventivo-location");

  const righeMenu = menuRows
    .filter(r => r.ricetta_nome)
    .map(r => `- ${r.ricetta_nome} x${Math.max(1, Math.floor(toNumber(r.quantita)))} (Tot. €${toNumber(r.totale).toFixed(2)})`)
    .join("\n");

  const righeExtra = extraRows
    .filter(r => (r.descrizione || "").trim())
    .map(r => `- ${r.descrizione} x${Math.max(1, Math.floor(toNumber(r.quantita)))} (Tot. €${toNumber(r.totale).toFixed(2)})`)
    .join("\n");

  const subject = `Preventivo evento - ${tipologiaEvento || ""}`.trim();
  const body = `
Gentile ${clienteNome} ${clienteCognome},

ti inviamo il preventivo per il tuo evento.

Evento: ${tipologiaEvento || "—"}
Data: ${dataEvento || "—"}
Location: ${location || "—"}

Menù:
${righeMenu || "- (nessuna portata selezionata)"}

Extra:
${righeExtra || "- (nessun extra)"}

Totale: € ${totale}

Grazie,
Il team.
  `.trim();

  const mailtoLink = `mailto:${encodeURIComponent(clienteEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
}

function printCurrentPreventivo() {
  recalcPreventivoTotali();

  const clienteNome = getVal("preventivo-cliente-nome");
  const clienteCognome = getVal("preventivo-cliente-cognome");
  const dataEvento = getVal("preventivo-data-evento");
  const tipologiaEvento = getVal("preventivo-titolo");
  const location = getVal("preventivo-location");
  const totale = getVal("preventivo-totale");

  const menuHtml = menuRows
    .filter(r => r.ricetta_nome)
    .map(r => `<li>${escapeHtml(r.ricetta_nome)} × ${escapeHtml(String(Math.max(1, Math.floor(toNumber(r.quantita)))))} — € ${escapeHtml(toNumber(r.totale).toFixed(2))}</li>`)
    .join("");

  const extraHtml = extraRows
    .filter(r => (r.descrizione || "").trim())
    .map(r => `<li>${escapeHtml(r.descrizione)} × ${escapeHtml(String(Math.max(1, Math.floor(toNumber(r.quantita)))))} — € ${escapeHtml(toNumber(r.totale).toFixed(2))}</li>`)
    .join("");

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>Preventivo</title>
        <meta charset="utf-8" />
        <style>
          body{font-family:Arial, sans-serif; padding:24px;}
          h1{margin:0 0 12px 0;}
          h2{margin:22px 0 10px 0; font-size:16px;}
          .muted{color:#666; font-size:12px;}
          .box{border:1px solid #ddd; padding:12px; border-radius:10px; margin-top:12px;}
          ul{margin:8px 0 0 18px;}
          .tot{font-size:18px; font-weight:700;}
        </style>
      </head>
      <body>
        <h1>Preventivo</h1>
        <div class="muted">Canale prezzo ricette: ${escapeHtml(CANALE_PREVENTIVO)}</div>

        <div class="box">
          <div><strong>Cliente:</strong> ${escapeHtml(clienteNome)} ${escapeHtml(clienteCognome)}</div>
          <div><strong>Evento:</strong> ${escapeHtml(tipologiaEvento)}</div>
          <div><strong>Data:</strong> ${escapeHtml(dataEvento)}</div>
          <div><strong>Location:</strong> ${escapeHtml(location)}</div>
        </div>

        <h2>Menù</h2>
        <div class="box">
          ${menuHtml ? `<ul>${menuHtml}</ul>` : `<div class="muted">Nessuna portata selezionata.</div>`}
        </div>

        <h2>Extra</h2>
        <div class="box">
          ${extraHtml ? `<ul>${extraHtml}</ul>` : `<div class="muted">Nessun extra.</div>`}
        </div>

        <h2>Totale</h2>
        <div class="box tot">€ ${escapeHtml(String(totale))}</div>

        <div style="margin-top:18px;">
          <button onclick="window.print()">Stampa</button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
}

/* ============================================================ */
/* HELPERS */
/* ============================================================ */

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

function clamp(n, min, max) {
  const x = Number.isFinite(n) ? n : 0;
  return Math.min(max, Math.max(min, x));
}

function setNumber(id, value, opts = {}) {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) return;
  const v = toNumber(value);

  // keepTrailing: non forzare due decimali su input percentuali, ma per euro sì
  if (opts.keepTrailing) {
    el.value = String(Math.round(v * 100) / 100);
    return;
  }

  el.value = v.toFixed(2);
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
