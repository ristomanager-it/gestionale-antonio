// js/views/crea-preventivo.js
import { createPageLayout, createCard } from "../utils/pageLayout.js";

const CANALE_PREVENTIVO = "banchetto";

let menuRows = [];
let extraRows = [];

let ricetteCache = [];
let prezziByRicettaId = new Map();

let lastDiscountEdited = "perc";

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
<div class="form-actions" style="margin-bottom:16px;">
  <button type="button" id="btn-back" class="app-button secondary">
    ← Torna ai Preventivi
  </button>
</div>

${createCard({
  title: "Stato Preventivo",
  body: `
    <div class="form-group">
      <label>Stato</label>
      <select class="input" id="preventivo-stato">
        <option value="in_trattativa" selected>In trattativa</option>
        <option value="accettato">Accettato</option>
        <option value="rifiutato">Rifiutato</option>
      </select>
    </div>

    <div style="margin-top:12px;">
      <span id="preventivo-stato-badge" class="status-badge badge-trattativa">
        In trattativa
      </span>
    </div>
  `
})}

        ${createCard({
          title: "Dati Cliente e Evento",
          body: `
            <div class="form-grid">

              <div class="form-group">
                <label>Nome Cliente</label>
                <input class="input" type="text" id="preventivo-cliente-nome" required>
              </div>

              <div class="form-group">
                <label>Cognome Cliente</label>
                <input class="input" type="text" id="preventivo-cliente-cognome" required>
              </div>

              <div class="form-group">
                <label>Email Cliente</label>
                <input class="input" type="email" id="preventivo-cliente-email">
              </div>
              <div class="form-group">
  <label>Telefono Cliente</label>
  <input class="input" type="text" id="preventivo-cliente-telefono">
</div>

              <select class="input" id="preventivo-titolo" required>
  <option value="">Seleziona evento</option>
  <option value="Matrimonio">Matrimonio</option>
  <option value="Compleanno">Compleanno</option>
  <option value="Evento Aziendale">Evento Aziendale</option>
  <option value="Battesimo">Battesimo</option>
  <option value="Comunione">Comunione</option>
  <option value="Altro">Altro</option>
</select>

              <select class="input" id="preventivo-tipo-servizio">
  <option value="Servizio Completo" selected>Servizio Completo</option>
  <option value="Solo Catering">Solo Catering</option>
  <option value="Buffet">Buffet</option>
  <option value="Finger Food">Finger Food</option>
</select>
              <div class="form-group">
                <label>Data Evento</label>
                <input class="input" type="date" id="preventivo-data-evento" required>
              </div>

              <div class="form-group">
                <label>Numero Invitati</label>
                <input class="input" type="number" id="preventivo-n-invitati" value="1" min="1">
              </div>

              <div class="form-group">
                <label>Location</label>
                <input class="input" type="text" id="preventivo-location">
              </div>

              <div class="form-group">
                <label>Prezzo Location (€)</label>
                <input class="input" type="number" id="preventivo-location-prezzo" value="0" min="0" step="0.01">
              </div>

            </div>

            <div class="form-group" style="margin-top:16px;">
              <label>Note</label>
              <textarea class="input" id="preventivo-note"></textarea>
            </div>
          `
        })}

        ${createCard({
          title: "Menu Evento",
          body: `
            <div id="preventivo-menu-tbody"></div>

            <div class="form-actions">
              <button type="button"
                class="app-button secondary"
                id="btn-add-menu-row">
                + Aggiungi Portata
              </button>
            </div>
          `
        })}

        ${createCard({
          title: "Extra",
          body: `
            <div id="preventivo-extra-tbody"></div>

            <div class="form-actions">
              <button type="button"
                class="app-button secondary"
                id="btn-add-extra">
                + Aggiungi Extra
              </button>
            </div>
          `
        })}

        ${createCard({
          title: "Sezione Economica",
          body: `
            <div class="form-grid">

              <div class="form-group">
                <label>Subtotale Menu (€)</label>
                <input class="input" type="number" id="preventivo-subtotale-menu" readonly>
              </div>

              <div class="form-group">
                <label>Subtotale Extra (€)</label>
                <input class="input" type="number" id="preventivo-subtotale-extra" readonly>
              </div>

              <div class="form-group">
                <label>Subtotale Location (€)</label>
                <input class="input" type="number" id="preventivo-subtotale-location" readonly>
              </div>

              <div class="form-group">
                <label>Sconto (%)</label>
                <input class="input" type="number" id="preventivo-sconto-perc" value="0" min="0" max="100" step="0.01">
              </div>

              <div class="form-group">
                <label>Sconto (€)</label>
                <input class="input" type="number" id="preventivo-sconto-euro" value="0" min="0" step="0.01">
              </div>

              <div class="form-group">
                <label>Totale Finale (€)</label>
                <input class="input" type="number" id="preventivo-totale" readonly>
              </div>

              <div class="form-group">
                <label>Acconto (€)</label>
                <input class="input" type="number" id="preventivo-acconto" value="0" min="0" step="0.01">
              </div>

              <div class="form-group">
                <label>Saldo (€)</label>
                <input class="input" type="number" id="preventivo-saldo" readonly>
              </div>

            </div>
          `
        })}

        <div class="form-actions">
          <button type="submit" class="app-button">💾 Salva Preventivo</button>
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

  ricetteCache = [];
  prezziByRicettaId = new Map();

  if (!supabase || !aziendaId) return;

  const { data: ricette } = await supabase
    .from("ricette")
    .select("id, nome")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome", { ascending: true });

  ricetteCache = ricette || [];

  const { data: prezzi } = await supabase
    .from("ricette_prezzi_canale")
    .select("ricetta_id, prezzo_vendita")
    .eq("azienda_id", aziendaId)
    .eq("canale", CANALE_PREVENTIVO)
    .eq("attivo", true);

  prezziByRicettaId = new Map(
    (prezzi || []).map((p) => [String(p.ricetta_id), toNumber(p.prezzo_vendita)])
  );
}

/* ============================================================ */
/* BIND EVENTS */
/* ============================================================ */

function bindPreventivoEvents() {
  const form = document.getElementById("preventivo-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await savePreventivo();
  });

  document.getElementById("btn-email-preventivo")?.addEventListener("click", emailCurrentPreventivoViaMailto);
  document.getElementById("btn-print-preventivo")?.addEventListener("click", printCurrentPreventivo);

  const nInv = document.getElementById("preventivo-n-invitati");
  nInv?.addEventListener("input", () => recalcPreventivoTotali());

  const locPrezzo = document.getElementById("preventivo-location-prezzo");
  locPrezzo?.addEventListener("input", () => recalcPreventivoTotali());

  const acconto = document.getElementById("preventivo-acconto");
  acconto?.addEventListener("input", () => recalcPreventivoTotali());

  const sPerc = document.getElementById("preventivo-sconto-perc");
  sPerc?.addEventListener("input", () => {
    lastDiscountEdited = "perc";
    recalcPreventivoTotali();
  });

  const sEuro = document.getElementById("preventivo-sconto-euro");
  sEuro?.addEventListener("input", () => {
    lastDiscountEdited = "euro";
    recalcPreventivoTotali();
  });
const statoSelect = document.getElementById("preventivo-stato");
const statoBadge = document.getElementById("preventivo-stato-badge");

statoSelect?.addEventListener("change", () => {
  const val = statoSelect.value;

  statoBadge.className = "status-badge";

  if (val === "accettato") {
    statoBadge.classList.add("badge-accettato");
    statoBadge.textContent = "Accettato";
  } else if (val === "rifiutato") {
    statoBadge.classList.add("badge-rifiutato");
    statoBadge.textContent = "Rifiutato";
  } else {
    statoBadge.classList.add("badge-trattativa");
    statoBadge.textContent = "In trattativa";
  }
});
  /* ================= MENU ================= */
  document.getElementById("btn-add-menu-row")?.addEventListener("click", addMenuRow);

  document.getElementById("preventivo-menu-tbody")?.addEventListener("change", onMenuTableChange);
  document.getElementById("preventivo-menu-tbody")?.addEventListener("click", onMenuTableClick);

  /* ================= EXTRA ================= */
  document.getElementById("btn-add-extra")?.addEventListener("click", addExtraRow);

  document.getElementById("preventivo-extra-tbody")?.addEventListener("input", onExtraTableInput);
  document.getElementById("preventivo-extra-tbody")?.addEventListener("click", onExtraTableClick);
}

/* ============================================================ */
/* MENU ROWS (PORTATE) */
/* ============================================================ */

function addMenuRow() {
  menuRows.push({
    ricetta_id: "",
    ricetta_nome: "",
    prezzo_pp: 0,
    totale: 0
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
    .map(
      (row, index) => `
      <div class="card menu-card" data-index="${index}">

        <div class="form-group">
          <label>Portata</label>
          <select class="input" data-field="ricetta_id">
            <option value="">Seleziona portata</option>
            ${ricetteCache
              .map((r) => {
                const selected = String(r.id) === String(row.ricetta_id) ? "selected" : "";
                return `<option value="${r.id}" ${selected}>${escapeHtml(r.nome)}</option>`;
              })
              .join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Prezzo pp (€)</label>
          <input class="input" type="number" step="0.01" min="0" data-field="prezzo_pp" value="${toNumber(
            row.prezzo_pp
          )}">
        </div>

        <div class="form-actions">
          <button type="button"
            class="app-button secondary"
            data-action="remove-menu">
            Rimuovi
          </button>
        </div>

      </div>
    `
    )
    .join("");
}

function onMenuTableChange(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const card = target.closest("[data-index]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-index"));
  if (!Number.isFinite(idx) || !menuRows[idx]) return;

  const field = target.getAttribute("data-field");
  if (!field) return;

  if (field === "ricetta_id" && target instanceof HTMLSelectElement) {
    const ricettaId = (target.value || "").toString();
    menuRows[idx].ricetta_id = ricettaId;

    const ricetta = ricetteCache.find((r) => String(r.id) === String(ricettaId));
    menuRows[idx].ricetta_nome = ricetta?.nome || "";

    const prezzo = prezziByRicettaId.get(String(ricettaId)) ?? 0;
    menuRows[idx].prezzo_pp = Math.max(0, toNumber(prezzo));

    renderMenuRows();
    recalcPreventivoTotali();
    return;
  }

  if (field === "prezzo_pp" && target instanceof HTMLInputElement) {
    menuRows[idx].prezzo_pp = Math.max(0, toNumber(target.value));
    recalcPreventivoTotali();
    return;
  }
}

function onMenuTableClick(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const btn = target.closest("[data-action]");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const card = btn.closest("[data-index]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-index"));
  if (!Number.isFinite(idx)) return;

  if (action === "remove-menu") {
    removeMenuRow(idx);
  }
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
    .map(
      (row, index) => `
      <div class="card menu-card" data-index="${index}">

        <div class="form-group">
          <label>Descrizione Extra</label>
          <input 
            class="input"
            type="text"
            data-field="descrizione"
            value="${escapeAttr(row.descrizione || "")}"
            placeholder="Es. Servizio camerieri, Allestimento..."
          >
        </div>

        <div class="form-group">
          <label>Quantità</label>
          <input 
            class="input"
            type="number"
            min="1"
            step="1"
            data-field="quantita"
            value="${Math.max(1, Math.floor(toNumber(row.quantita) || 1))}"
          >
        </div>

        <div class="form-group">
          <label>Prezzo Unitario (€)</label>
          <input 
            class="input"
            type="number"
            min="0"
            step="0.01"
            data-field="prezzo_unitario"
            value="${Math.max(0, toNumber(row.prezzo_unitario))}"
          >
        </div>

        <div class="form-group">
          <label>Totale (€)</label>
          <input 
            class="input"
            type="number"
            value="${Math.max(0, toNumber(row.totale))}"
            readonly
          >
        </div>

        <div class="form-actions">
          <button type="button"
            class="app-button secondary"
            data-action="remove-extra">
            Rimuovi
          </button>
        </div>

      </div>
    `
    )
    .join("");
}

function onExtraTableInput(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const card = target.closest("[data-index]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-index"));
  if (!Number.isFinite(idx) || !extraRows[idx]) return;

  const field = target.getAttribute("data-field");
  if (!field) return;

  if (field === "descrizione" && target instanceof HTMLInputElement) {
    extraRows[idx].descrizione = target.value ?? "";
    return;
  }

  if (field === "quantita" && target instanceof HTMLInputElement) {
    extraRows[idx].quantita = Math.max(1, Math.floor(toNumber(target.value) || 1));
    recalcPreventivoTotali();
    return;
  }

  if (field === "prezzo_unitario" && target instanceof HTMLInputElement) {
    extraRows[idx].prezzo_unitario = Math.max(0, toNumber(target.value));
    recalcPreventivoTotali();
    return;
  }
}

function onExtraTableClick(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const btn = target.closest("[data-action]");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const card = btn.closest("[data-index]");
  if (!card) return;

  const idx = Number(card.getAttribute("data-index"));
  if (!Number.isFinite(idx)) return;

  if (action === "remove-extra") {
    removeExtraRow(idx);
  }
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
    row.prezzo_pp = prezzoPP;
    row.totale = prezzoPP * invitati;
    subtMenu += row.totale;
  });

  const prezzoMedioPP = invitati > 0 ? subtMenu / invitati : 0;

  /* ================= EXTRA ================= */
  let subtExtra = 0;

  extraRows.forEach((row) => {
    const q = Math.max(1, Math.floor(toNumber(row.quantita) || 1));
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

  renderExtraRows();
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

    menu: menuRows.map((r) => ({
      ricetta_id: r.ricetta_id ? Number(r.ricetta_id) : null,
      ricetta_nome: r.ricetta_nome || "",
      quantita: 1,
      prezzo_unitario: Math.max(0, toNumber(r.prezzo_pp)),
      totale: Math.max(0, toNumber(r.totale)),
      auto_quantita: true
    })),

    extra: extraRows.map((r) => ({
      descrizione: r.descrizione || "",
      quantita: Math.max(1, Math.floor(toNumber(r.quantita) || 1)),
      prezzo_unitario: Math.max(0, toNumber(r.prezzo_unitario)),
      totale: Math.max(0, toNumber(r.totale))
    }))
  };

  try {
    if (!payload.cliente_nome || !payload.cliente_cognome || !payload.titolo_evento || !payload.data_evento) {
      if (result) result.innerHTML = `<span class="error-text">Compila i campi obbligatori (cliente, titolo, data).</span>`;
      return;
    }

    const invalidMenu = payload.menu.some((r) => !r.ricetta_id);
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

  const azienda = window.state?.azienda;
  const nomeAzienda = azienda?.nome || "La nostra azienda";

  const clienteNome = getVal("preventivo-cliente-nome");
  const clienteCognome = getVal("preventivo-cliente-cognome");
  const dataEvento = getVal("preventivo-data-evento");
  const tipologiaEvento = getVal("preventivo-titolo");
  const location = getVal("preventivo-location");
  const totale = getVal("preventivo-totale");

  const righeMenu = menuRows
    .filter((r) => r.ricetta_nome)
    .map((r) => `- ${r.ricetta_nome}`)
    .join("\n");

  const righeExtra = extraRows
    .filter((r) => (r.descrizione || "").trim())
    .map((r) => `- ${r.descrizione}`)
    .join("\n");

  const subject = `Preventivo ${tipologiaEvento || ""} - ${nomeAzienda}`.trim();

  const body = `
Gentile ${clienteNome} ${clienteCognome},

ti inviamo il preventivo per il tuo evento.

Evento: ${tipologiaEvento || "—"}
Data: ${dataEvento || "—"}
Location: ${location || "—"}

Menù proposto:
${righeMenu || "- (nessuna portata selezionata)"}

Extra:
${righeExtra || "- (nessun extra)"}

Totale complessivo: € ${totale}

Per qualsiasi informazione rimaniamo a disposizione.

Cordiali saluti,
${nomeAzienda}
  `.trim();

  const mailtoLink = `mailto:${encodeURIComponent(clienteEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoLink;
}

/* ============================================================ */
/* PRINT */
/* ============================================================ */

function printCurrentPreventivo() {
  recalcPreventivoTotali();

  const azienda = window.state?.azienda;
  const nomeAzienda = azienda?.nome || "Azienda";
  const logo = azienda?.logo_url || "";

  const clienteNome = getVal("preventivo-cliente-nome");
  const clienteCognome = getVal("preventivo-cliente-cognome");
  const dataEvento = getVal("preventivo-data-evento");
  const tipologiaEvento = getVal("preventivo-titolo");
  const location = getVal("preventivo-location");
  const totale = getVal("preventivo-totale");

  const menuHtml = menuRows
    .filter((r) => r.ricetta_nome)
    .map((r) => `<li>${escapeHtml(r.ricetta_nome)}</li>`)
    .join("");

  const extraHtml = extraRows
    .filter((r) => (r.descrizione || "").trim())
    .map((r) => `<li>${escapeHtml(r.descrizione)}</li>`)
    .join("");

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <html>
      <head>
        <title>Preventivo</title>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #111;
          }

          .header {
            text-align: center;
            margin-bottom: 40px;
          }

          .logo {
            max-height: 90px;
            margin-bottom: 12px;
          }

          h1 {
            margin: 0;
            font-size: 24px;
          }

          h2 {
            margin: 28px 0 10px 0;
            font-size: 16px;
          }

          .muted {
            color: #666;
            font-size: 12px;
          }

          .box {
            border: 1px solid #ddd;
            padding: 16px;
            border-radius: 10px;
            margin-top: 12px;
          }

          ul {
            margin: 8px 0 0 18px;
          }

          .tot {
            font-size: 20px;
            font-weight: 700;
          }
        </style>
      </head>

      <body>

        <div class="header">
          ${logo ? `<img src="${logo}" class="logo" />` : ""}
          <h1>${escapeHtml(nomeAzienda)}</h1>
        </div>

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
        <div class="box tot">
          € ${escapeHtml(String(totale))}
        </div>

        <div style="margin-top:30px;">
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

  if (opts.keepTrailing) {
    el.value = String(Math.round(v * 100) / 100);
    return;
  }

  el.value = v.toFixed(2);
}

function escapeHtml(str) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}
