// js/views/crea-preventivo.js
import { createPageLayout, createCard } from "../utils/pageLayout.js";

const CANALE_PREVENTIVO = "banchetto";

// Sezioni dinamiche — l'utente le crea al momento
let sezioniDinamiche = []; // [{ id, label, isServizi }]
let sezioneCounter = 0;
let menuSezioni = {}; // sezioneId → [{ ricetta_id, ricetta_nome, prezzo_pp, totale, is_placeholder, sezione }]
let extraRows = [];

let ricetteCache = [];
let prezziByRicettaId = new Map();

let lastDiscountEdited = "perc";

export async function render(container) {
  sezioniDinamiche = [];
  sezioneCounter = 0;
  menuSezioni = {};
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
            ← Indietro
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

              <div class="form-group">
                <label>Nome festeggiato</label>
                <input class="input" type="text" id="preventivo-nome-festeggiato">
              </div>

              <div class="form-group">
                <label>Evento</label>
                <select class="input" id="preventivo-titolo" required>
                  <option value="">Seleziona evento</option>
                  <option value="Matrimonio">Matrimonio</option>
                  <option value="Compleanno">Compleanno</option>
                  <option value="Evento Aziendale">Evento Aziendale</option>
                  <option value="Battesimo">Battesimo</option>
                  <option value="Comunione">Comunione</option>
                  <option value="Altro">Altro</option>
                </select>
              </div>

              <div class="form-group">
                <label>Tipo servizio</label>
                <select class="input" id="preventivo-tipo-servizio">
                  <option value="Servizio Completo" selected>Servito</option>
                  <option value="Solo Catering">Catering</option>
                  <option value="Buffet">Buffet</option>
                  <option value="misto">Altro</option>
                </select>
              </div>

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
            <!-- Autocomplete dropdown custom -->
            <div id="ac-dropdown" style="display:none;position:fixed;background:white;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:9999;max-height:220px;overflow-y:auto;min-width:280px;"></div>

            <!-- Sezioni dinamiche -->
            <div id="sezioni-menu-container" style="margin-bottom:16px;"></div>

            <!-- Azioni sezioni -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
              <input id="nuova-sezione-nome" class="input" placeholder="Nome sezione (es. Antipasti, Primi...)" style="flex:1;min-width:180px;padding:8px 12px;font-size:14px;">
              <button type="button" id="btn-add-sezione" class="app-button secondary" style="white-space:nowrap;">+ Aggiungi sezione</button>
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
  aggiornaDatalist();
  renderTutteSezioni();
  renderExtraRows();
  recalcPreventivoTotali();

function aggiornaDatalist() {
  // Datalist non usata — autocomplete custom gestisce tutto
}
}

/* ============================================================ */
/* DATA LOAD */
/* ============================================================ */

async function loadRicetteEPrezzi() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id || null;

  ricetteCache = [];
  prezziByRicettaId = new Map();

  if (!supabase || !aziendaId) return;

  // Filtra ricette per sede_id — solo la sede attiva, solo food
  let query = supabase
    .from("ricette")
    .select("id, nome, attivo, sede_id, prodotto_vendita_id, prodotti_vendita(famiglia)")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome", { ascending: true });

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  const { data: ricette } = await query;

  // Escludi beverage — tieni solo food
  const tutteRicette = ricette || [];
  ricetteCache = tutteRicette.filter(r => {
    const famiglia = r.prodotti_vendita?.famiglia;
    return !famiglia || famiglia === 'food';
  });

  const { data: prezzi } = await supabase
    .from("ricette_prezzi_canale")
    .select("ricetta_id, prezzo_vendita")
    .eq("azienda_id", aziendaId)
    .eq("canale", CANALE_PREVENTIVO)
    .eq("attivo", true);

  prezziByRicettaId = new Map((prezzi || []).map((p) => [String(p.ricetta_id), toNumber(p.prezzo_vendita)]));
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

  document.getElementById("btn-back")?.addEventListener("click", () => {
    window.location.hash = "#/preventivi";
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

  /* ================= SEZIONI MENU ================= */
  document.getElementById("btn-add-sezione")?.addEventListener("click", aggiungiSezione);
  document.getElementById("nuova-sezione-nome")?.addEventListener("keydown", e => { if(e.key==='Enter'){ e.preventDefault(); aggiungiSezione(); } });
  document.getElementById("sezioni-menu-container")?.addEventListener("input", onSezioniInput);
  document.getElementById("sezioni-menu-container")?.addEventListener("click", onSezioniClick);
  document.addEventListener("click", chiudiAutocomplete);
}

/* ============================================================ */
/* SEZIONI DINAMICHE */
/* ============================================================ */

function aggiungiSezione() {
  const inp = document.getElementById("nuova-sezione-nome");
  const label = (inp?.value || "").trim();
  if (!label) { inp?.focus(); return; }
  const id = "sez_" + (++sezioneCounter);
  const isServizi = label.toLowerCase().includes("servizi") || label.toLowerCase().includes("service");
  sezioniDinamiche.push({ id, label, isServizi });
  menuSezioni[id] = [];
  if (inp) inp.value = "";
  renderContenitoreSezioni();
  // Aggiungi automaticamente la prima portata
  addPortataASezione(id);
}

function rimuoviSezione(sezioneId) {
  sezioniDinamiche = sezioniDinamiche.filter(s => s.id !== sezioneId);
  delete menuSezioni[sezioneId];
  renderContenitoreSezioni();
  recalcPreventivoTotali();
}

function renderContenitoreSezioni() {
  const box = document.getElementById("sezioni-menu-container");
  if (!box) return;
  if (!sezioniDinamiche.length) {
    box.innerHTML = `<div style="color:#94a3b8;font-size:13px;padding:12px 0;font-style:italic;">Nessuna sezione — aggiungine una qui sotto</div>`;
    return;
  }
  box.innerHTML = sezioniDinamiche.map(s => `
    <div class="sezione-menu" data-sezione="${s.id}" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(s.label)}</div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="app-button secondary btn-add-portata" data-sezione="${s.id}" style="font-size:12px;padding:5px 12px;">
            + Aggiungi portata
          </button>
          <button type="button" data-action="remove-sezione" data-sezione="${s.id}" style="background:#fee2e2;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;color:#dc2626;font-size:12px;">
            Elimina sezione
          </button>
        </div>
      </div>
      <div class="portate-container" id="portate-${s.id}" style="padding:10px 14px;">
        <div style="color:#94a3b8;font-size:13px;padding:4px 0;font-style:italic;">Nessuna portata</div>
      </div>
    </div>
  `).join("");

  // Rebind bottoni aggiungi portata
  box.querySelectorAll(".btn-add-portata").forEach(btn => {
    btn.addEventListener("click", () => addPortataASezione(btn.dataset.sezione));
  });

  // Rirenderizza portate esistenti
  sezioniDinamiche.forEach(s => renderSezione(s.id));
}

function addPortataASezione(sezioneId) {
  if (!menuSezioni[sezioneId]) menuSezioni[sezioneId] = [];
  menuSezioni[sezioneId].push({
    ricetta_id: "", ricetta_nome: "", prezzo_pp: 0, totale: 0, is_placeholder: false, sezione: sezioneId
  });
  renderSezione(sezioneId);
  recalcPreventivoTotali();
  // Focus sull'ultimo input aggiunto
  setTimeout(() => {
    const portate = menuSezioni[sezioneId];
    const lastIdx = portate.length - 1;
    const inp = document.querySelector(`[data-field="ricetta_nome"][data-sezione="${sezioneId}"][data-idx="${lastIdx}"]`);
    inp?.focus();
  }, 50);
}

function removePortataSezione(sezioneId, idx) {
  menuSezioni[sezioneId].splice(idx, 1);
  renderSezione(sezioneId);
  recalcPreventivoTotali();
}

function renderSezione(sezioneId) {
  const box = document.getElementById(`portate-${sezioneId}`);
  if (!box) return;
  const portate = menuSezioni[sezioneId] || [];
  const sezione = sezioniDinamiche.find(s => s.id === sezioneId);

  if (!portate.length) {
    box.innerHTML = `<div style="color:#94a3b8;font-size:13px;padding:4px 0;font-style:italic;">Nessuna portata</div>`;
    return;
  }

  box.innerHTML = portate.map((row, idx) => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;position:relative;" data-sezione="${sezioneId}" data-idx="${idx}">
      <div style="flex:1;position:relative;">
        <input class="input portata-input" type="text" autocomplete="off"
          data-field="ricetta_nome" data-sezione="${sezioneId}" data-idx="${idx}"
          value="${escapeAttr(row.ricetta_nome || '')}"
          placeholder="${sezione?.isServizi ? 'Es. Fotografo, Musica, Fuochi...' : 'Scrivi portata...'}"
          style="width:100%;">
        ${row.ricetta_id ? `<div style="font-size:11px;color:#16a34a;margin-top:2px;">✓ Ricetta collegata</div>` : row.ricetta_nome ? `<div style="font-size:11px;color:#f59e0b;margin-top:2px;">Portata libera</div>` : ''}
      </div>
      <div style="width:110px;">
        <input class="input" type="number" step="0.01" min="0"
          data-field="prezzo_pp" data-sezione="${sezioneId}" data-idx="${idx}"
          value="${toNumber(row.prezzo_pp) || ''}"
          placeholder="€/pp">
      </div>
      <button type="button" data-action="remove-portata" data-sezione="${sezioneId}" data-idx="${idx}"
        style="background:#fee2e2;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;color:#dc2626;font-size:13px;flex-shrink:0;">✕</button>
    </div>
  `).join('');
}

function renderTutteSezioni() {
  renderContenitoreSezioni();
}

/* ============================================================ */
/* AUTOCOMPLETE CUSTOM */
/* ============================================================ */

let acTarget = null; // input corrente

function mostraAutocomplete(input, query) {
  const dropdown = document.getElementById("ac-dropdown");
  if (!dropdown) return;

  const q = query.toLowerCase().trim();
  const risultati = ricetteCache
    .filter(r => normalizeNome(r.nome).includes(q))
    .slice(0, 12);

  if (!risultati.length) { chiudiAutocomplete(); return; }

  acTarget = input;
  const rect = input.getBoundingClientRect();
  dropdown.style.display = "block";
  dropdown.style.top = (rect.bottom + window.scrollY + 4) + "px";
  dropdown.style.left = rect.left + "px";
  dropdown.style.width = Math.max(rect.width, 280) + "px";

  dropdown.innerHTML = risultati.map(r => {
    const prezzo = prezziByRicettaId.get(String(r.id));
    return `<div data-rid="${r.id}" data-rnome="${escapeAttr(r.nome)}" data-rprezzo="${prezzo || 0}"
      style="padding:10px 14px;cursor:pointer;font-size:14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;"
      onmouseenter="this.style.background='#f0f9ff'" onmouseleave="this.style.background='white'">
      <span>${escapeHtml(r.nome)}</span>
      ${prezzo ? `<span style="font-size:12px;color:#0E5A7A;font-weight:600;">€${toNumber(prezzo).toFixed(2)}</span>` : ''}
    </div>`;
  }).join("");

  dropdown.querySelectorAll("[data-rid]").forEach(el => {
    el.addEventListener("mousedown", e => {
      e.preventDefault();
      selezionaRicetta(el.dataset.rid, el.dataset.rnome, el.dataset.rprezzo);
    });
  });
}

function chiudiAutocomplete(e) {
  if (e && document.getElementById("ac-dropdown")?.contains(e.target)) return;
  const dd = document.getElementById("ac-dropdown");
  if (dd) dd.style.display = "none";
  acTarget = null;
}

function selezionaRicetta(ricettaId, ricettaNome, ricettaPrezzo) {
  chiudiAutocomplete();
  if (!acTarget) return;
  const sezioneId = acTarget.getAttribute("data-sezione");
  const idx = Number(acTarget.getAttribute("data-idx"));
  if (!sezioneId || !Number.isFinite(idx) || !menuSezioni[sezioneId]?.[idx]) return;

  acTarget.value = ricettaNome;
  menuSezioni[sezioneId][idx].ricetta_id = String(ricettaId);
  menuSezioni[sezioneId][idx].ricetta_nome = ricettaNome;
  menuSezioni[sezioneId][idx].is_placeholder = false;
  const prezzo = Math.max(0, toNumber(ricettaPrezzo));
  menuSezioni[sezioneId][idx].prezzo_pp = prezzo;

  // Aggiorna campo prezzo
  const prezzoInput = document.querySelector(`[data-field="prezzo_pp"][data-sezione="${sezioneId}"][data-idx="${idx}"]`);
  if (prezzoInput) prezzoInput.value = prezzo || "";

  // Aggiorna badge
  renderSezione(sezioneId);
  recalcPreventivoTotali();
}

function onSezioniInput(e) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  const field = target.getAttribute("data-field");
  const sezioneId = target.getAttribute("data-sezione");
  const idx = Number(target.getAttribute("data-idx"));
  if (!field || !sezioneId || !Number.isFinite(idx)) return;
  if (!menuSezioni[sezioneId]?.[idx]) return;

  if (field === "ricetta_nome") {
    const nome = (target.value ?? "").toString();
    menuSezioni[sezioneId][idx].ricetta_nome = nome.trim();
    menuSezioni[sezioneId][idx].ricetta_id = "";
    // Autocomplete dopo 2 caratteri
    if (nome.trim().length >= 2) {
      mostraAutocomplete(target, nome.trim());
    } else {
      chiudiAutocomplete();
    }
    recalcPreventivoTotali();
    return;
  }

  if (field === "prezzo_pp") {
    menuSezioni[sezioneId][idx].prezzo_pp = Math.max(0, toNumber(target.value));
    recalcPreventivoTotali();
  }
}

function onSezioniClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  const sezioneId = btn.getAttribute("data-sezione");
  if (action === "remove-portata") {
    const idx = Number(btn.getAttribute("data-idx"));
    if (sezioneId && Number.isFinite(idx)) removePortataSezione(sezioneId, idx);
  }
  if (action === "remove-sezione") {
    if (sezioneId) rimuoviSezione(sezioneId);
  }
}

function findRicettaByNome(nome) {
  const n = normalizeNome(nome);
  if (!n) return null;
  return ricetteCache.find((r) => normalizeNome(r.nome) === n) || null;
}

function normalizeNome(nome) {
  return (nome ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
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

/* ============================================================ */
/* TOTALS & DISCOUNT */
/* ============================================================ */

function recalcPreventivoTotali() {
  const invitati = Math.max(1, Math.floor(toNumber(getVal("preventivo-n-invitati")) || 1));
  const locationPrezzo = Math.max(0, toNumber(getVal("preventivo-location-prezzo")));
  const acconto = Math.max(0, toNumber(getVal("preventivo-acconto")));

  /* ================= MENU ================= */
  let subtMenu = 0;

  Object.entries(menuSezioni).forEach(([sezioneId, portate]) => {
    const sezione = sezioniDinamiche.find(s => s.id === sezioneId);
    portate.forEach(row => {
      const prezzoPP = Math.max(0, toNumber(row.prezzo_pp));
      row.prezzo_pp = prezzoPP;
      row.totale = sezione?.isServizi ? prezzoPP : prezzoPP * invitati;
      subtMenu += row.totale;
    });
  });

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

  const clienteNome = getVal("preventivo-cliente-nome");
  const clienteCognome = getVal("preventivo-cliente-cognome");

  const titoloEvento = getVal("preventivo-titolo");
  const dataEvento = getVal("preventivo-data-evento") || null;

  if (!clienteNome || !clienteCognome || !titoloEvento || !dataEvento) {
    if (result) result.innerHTML = `<span class="error-text">Compila i campi obbligatori (cliente, titolo, data).</span>`;
    return;
  }

  const stato = getVal("preventivo-stato") || "in_trattativa";

  const payloadTestata = {
    azienda_id: aziendaId,
    cliente_id: null,
    titolo_evento: titoloEvento,
    tipo_servizio: getVal("preventivo-tipo-servizio"),
    data_evento: dataEvento,
    n_invitati: Math.max(1, Math.floor(toNumber(getVal("preventivo-n-invitati")) || 1)),
    location: getVal("preventivo-location"),
    note: getVal("preventivo-note"),
    acconto: Math.max(0, toNumber(getVal("preventivo-acconto"))),
    stato: stato,
    totale: Math.max(0, toNumber(getVal("preventivo-totale")))
  };

  try {
    if (result) result.innerHTML = `<span class="small-muted">Salvataggio in corso...</span>`;

    const { data: insertedPrev, error: insPrevErr } = await supabase
      .from("preventivi")
      .insert([payloadTestata])
      .select("id")
      .single();

    if (insPrevErr || !insertedPrev?.id) {
      if (result) result.innerHTML = `<span class="error-text">Errore salvataggio preventivo: ${escapeHtml(insPrevErr?.message || "operazione non riuscita")}</span>`;
      return;
    }

    const preventivoId = Number(insertedPrev.id);

    const righeToInsert = [];
    for (const sezione of sezioniDinamiche) {
      const portate = menuSezioni[sezione.id] || [];
      for (const row of portate) {
        const nome = (row.ricetta_nome || "").trim();
        if (!nome) continue;

        const { ricettaId, isPlaceholder } = await getOrCreateRicettaPlaceholderByNome(nome, aziendaId, preventivoId);

        const prezzo = Math.max(0, toNumber(row.prezzo_pp));
        righeToInsert.push({
          azienda_id: aziendaId,
          preventivo_id: preventivoId,
          ricetta_id: ricettaId ? Number(ricettaId) : null,
          nome_portata: nome,
          quantita: 1,
          prezzo_unitario: prezzo,
          ricetta_placeholder: Boolean(isPlaceholder),
          ricetta_non_strutturata: Boolean(isPlaceholder),
          sezione_menu: sezione.id,
        });

        row.ricetta_id = ricettaId ? String(ricettaId) : "";
        row.is_placeholder = Boolean(isPlaceholder);
      }
    }

    if (!righeToInsert.length) {
      if (result) result.innerHTML = `<span class="error-text">Inserisci almeno una portata nel menù.</span>`;
      return;
    }

    const { error: insRigheErr } = await supabase.from("preventivi_righe").insert(righeToInsert);

    if (insRigheErr) {
      if (result) result.innerHTML = `<span class="error-text">Errore salvataggio righe: ${escapeHtml(insRigheErr.message)}</span>`;
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
/* PLACEHOLDER RICETTA */
/* ============================================================ */

async function getOrCreateRicettaPlaceholderByNome(nome, aziendaId, preventivoId) {
  const supabase = window.supabaseClient;
  const n = normalizeNome(nome);
  if (!n) return { ricettaId: null, isPlaceholder: false };

  const cached = ricetteCache.find((r) => normalizeNome(r.nome) === n);
  if (cached) return { ricettaId: cached.id, isPlaceholder: false };

  const { data: existing, error: selErr } = await supabase
    .from("ricette")
    .select("id, nome, generata_da_preventivo, scheda_completa")
    .eq("azienda_id", aziendaId)
    .ilike("nome", nome)
    .limit(1);

  if (!selErr && existing && existing.length) {
    const r = existing[0];
    ricetteCache.push({ id: r.id, nome: r.nome });
    return { ricettaId: r.id, isPlaceholder: Boolean(r.generata_da_preventivo) || !Boolean(r.scheda_completa) };
  }

  const payload = {
    azienda_id: aziendaId,
    nome: nome.trim(),
    attivo: true,
    generata_da_preventivo: true,
    scheda_completa: false,
    origine: "preventivo",
    creata_da_preventivo_id: preventivoId
  };

  const { data: inserted, error: insErr } = await supabase
    .from("ricette")
    .insert([payload])
    .select("id, nome")
    .single();

  if (insErr || !inserted?.id) {
    return { ricettaId: null, isPlaceholder: true };
  }

  ricetteCache.push({ id: inserted.id, nome: inserted.nome });

  const prezzo = prezziByRicettaId.get(String(inserted.id)) ?? 0;
  prezziByRicettaId.set(String(inserted.id), toNumber(prezzo));

  return { ricettaId: inserted.id, isPlaceholder: true };
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

  const righeMenu = sezioniDinamiche.flatMap(s =>
    (menuSezioni[s.id] || [])
      .filter(r => (r.ricetta_nome || "").trim())
      .map(r => `[${s.label}] ${r.ricetta_nome}`)
  ).join("\n");

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

  const mailtoLink = `mailto:${encodeURIComponent(clienteEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  // Raggruppa per sezione per la stampa
  const menuHtml = sezioniDinamiche.map(s => {
    const portate = (menuSezioni[s.id] || []).filter(r => (r.ricetta_nome || "").trim());
    if (!portate.length) return '';
    return `
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${s.label}</div>
        <ul style="margin:0;padding-left:18px;">
          ${portate.map(r => `<li style="margin-bottom:4px;">${escapeHtml(r.ricetta_nome)}${r.prezzo_pp ? ` <span style="color:#64748b;font-size:12px;">— €${toNumber(r.prezzo_pp).toFixed(2)} pp</span>` : ''}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');

  const extraHtml = extraRows
    .filter((r) => (r.descrizione || "").trim())
    .map((r) => `<li>${escapeHtml(r.descrizione)}</li>`)
    .join("");

  const win = window.open("", "_blank");
  if (!win) return;

  const nInvitati = getVal("preventivo-n-invitati");
  const nomeFesteggiato = getVal("preventivo-nome-festeggiato");
  const tipoServizio = getVal("preventivo-tipo-servizio");
  const acconto = getVal("preventivo-acconto");
  const saldo = getVal("preventivo-saldo");
  const sconto = getVal("preventivo-sconto-euro");
  const note = getVal("preventivo-note");

  win.document.write(`
    <!DOCTYPE html>
    <html lang="it">
      <head>
        <title>Preventivo — ${escapeHtml(nomeAzienda)}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Georgia', serif; color: #1a1a2e; background: white; }
          @media print { body { padding: 0; } .no-print { display: none; } }

          .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }

          /* Header */
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #1a1a2e; }
          .header-logo img { max-height: 80px; max-width: 180px; object-fit: contain; }
          .header-logo .nome-azienda { font-size: 22px; font-weight: 700; color: #1a1a2e; }
          .header-right { text-align: right; }
          .header-right .doc-title { font-size: 28px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; color: #1a1a2e; }
          .header-right .doc-date { font-size: 12px; color: #64748b; margin-top: 6px; }

          /* Cliente */
          .cliente-box { background: #f8fafc; border-left: 4px solid #1a1a2e; padding: 20px 24px; margin-bottom: 32px; border-radius: 0 8px 8px 0; }
          .cliente-box .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 4px; }
          .cliente-box .valore { font-size: 16px; font-weight: 600; color: #1a1a2e; }
          .cliente-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

          /* Menu */
          .menu-section { margin-bottom: 36px; }
          .menu-section h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 600; margin-bottom: 14px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
          .portata-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; border-bottom: 1px dotted #e5e7eb; }
          .portata-nome { font-size: 14px; color: #1a1a2e; }
          .portata-prezzo { font-size: 13px; color: #64748b; white-space: nowrap; margin-left: 16px; }

          /* Economica */
          .economia { margin-top: 36px; border-top: 2px solid #1a1a2e; padding-top: 24px; }
          .economia-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .economia-row.totale { font-size: 20px; font-weight: 700; border-top: 1px solid #1a1a2e; margin-top: 8px; padding-top: 12px; }
          .economia-row.muted { color: #64748b; font-size: 13px; }

          /* Footer */
          .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
          .footer-note { font-size: 12px; color: #64748b; max-width: 400px; font-style: italic; }
          .firma-box { text-align: right; }
          .firma-line { border-top: 1px solid #1a1a2e; width: 180px; margin-top: 40px; padding-top: 6px; font-size: 11px; color: #64748b; }

          /* Print button */
          .print-bar { text-align: center; padding: 20px; background: #f8fafc; margin-bottom: 0; }
          .print-bar button { background: #1a1a2e; color: white; border: none; padding: 10px 28px; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 0 6px; }
        </style>
      </head>
      <body>

        <div class="print-bar no-print">
          <button onclick="window.print()">🖨️ Stampa / Salva PDF</button>
          <button onclick="window.close()">✕ Chiudi</button>
        </div>

        <div class="page">

          <!-- Header -->
          <div class="header">
            <div class="header-logo">
              ${logo ? `<img src="${escapeHtml(logo)}" alt="Logo">` : `<div class="nome-azienda">${escapeHtml(nomeAzienda)}</div>`}
            </div>
            <div class="header-right">
              <div class="doc-title">Preventivo</div>
              <div class="doc-date">Data: ${new Date().toLocaleDateString('it-IT', {day:'2-digit',month:'long',year:'numeric'})}</div>
            </div>
          </div>

          <!-- Cliente e Evento -->
          <div class="cliente-box">
            <div class="cliente-grid">
              <div>
                <div class="label">Cliente</div>
                <div class="valore">${escapeHtml(clienteNome)} ${escapeHtml(clienteCognome)}</div>
              </div>
              <div>
                <div class="label">Tipologia evento</div>
                <div class="valore">${escapeHtml(tipologiaEvento)}</div>
              </div>
              <div>
                <div class="label">Data evento</div>
                <div class="valore">${dataEvento ? new Date(dataEvento).toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'}) : '—'}</div>
              </div>
              <div>
                <div class="label">Invitati</div>
                <div class="valore">${escapeHtml(nInvitati)} persone</div>
              </div>
              ${location ? `<div><div class="label">Location</div><div class="valore">${escapeHtml(location)}</div></div>` : ''}
              ${nomeFesteggiato ? `<div><div class="label">Festeggiato</div><div class="valore">${escapeHtml(nomeFesteggiato)}</div></div>` : ''}
              ${tipoServizio ? `<div><div class="label">Tipo servizio</div><div class="valore">${escapeHtml(tipoServizio)}</div></div>` : ''}
            </div>
          </div>

          <!-- Menu per sezioni -->
          <div class="menu-section">
            ${menuHtml || '<p style="color:#94a3b8;font-style:italic;">Nessuna portata inserita.</p>'}
          </div>

          <!-- Extra -->
          ${extraHtml ? `
          <div class="menu-section">
            <h2>Servizi aggiuntivi</h2>
            ${extraHtml}
          </div>` : ''}

          <!-- Sezione economica -->
          <div class="economia">
            <div class="economia-row muted">
              <span>Subtotale menu</span>
              <span>€ ${escapeHtml(getVal("preventivo-subtotale-menu"))}</span>
            </div>
            ${Number(getVal("preventivo-subtotale-extra")) > 0 ? `
            <div class="economia-row muted">
              <span>Subtotale extra</span>
              <span>€ ${escapeHtml(getVal("preventivo-subtotale-extra"))}</span>
            </div>` : ''}
            ${Number(sconto) > 0 ? `
            <div class="economia-row muted">
              <span>Sconto</span>
              <span>− € ${escapeHtml(sconto)}</span>
            </div>` : ''}
            <div class="economia-row totale">
              <span>Totale complessivo</span>
              <span>€ ${escapeHtml(totale)}</span>
            </div>
            ${Number(acconto) > 0 ? `
            <div class="economia-row muted" style="margin-top:8px;">
              <span>Acconto versato</span>
              <span>€ ${escapeHtml(acconto)}</span>
            </div>
            <div class="economia-row" style="font-weight:600;">
              <span>Saldo residuo</span>
              <span>€ ${escapeHtml(saldo)}</span>
            </div>` : ''}
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-note">
              ${note ? escapeHtml(note) : 'Il presente preventivo ha validità 30 giorni dalla data di emissione. Per accettazione si prega di restituire copia firmata.'}
            </div>
            <div class="firma-box">
              <div class="firma-line">Firma per accettazione</div>
            </div>
          </div>

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
