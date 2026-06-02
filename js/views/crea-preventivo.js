// js/views/crea-preventivo.js
import { createPageLayout, createCard } from "../utils/pageLayout.js";

const CANALE_PREVENTIVO = "banchetto";

// Sezioni dinamiche — l'utente le crea al momento
let sezioniDinamiche = []; // [{ id, label, isServizi }]
let sezioneCounter = 0;
let menuSezioni = {}; // sezioneId → [{ ricetta_id, ricetta_nome, prezzo_pp, totale, is_placeholder, sezione }]
let extraRows = [];
let serviziRows = []; // [{ descrizione, prezzo_totale }]

let ricetteCache = [];
let prezziByRicettaId = new Map();

let lastDiscountEdited = "perc";

export async function render(container) {
  sezioniDinamiche = [];
  sezioneCounter = 0;
  menuSezioni = {};
  extraRows = [];
  serviziRows = [];
  ricetteCache = [];
  prezziByRicettaId = new Map();
  lastDiscountEdited = "perc";

  // Aspetta che sedeAttiva sia disponibile (il router può chiamare render prima dell'auth)
  await aspettaSedeAttiva();
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

              <div class="form-group">
                <label>Intolleranze / Allergie</label>
                <input class="input" type="text" id="preventivo-intolleranze" placeholder="Es. glutine, lattosio, frutta secca...">
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
          title: "Servizi",
          body: `
            <p style="font-size:13px;color:#64748b;margin-bottom:12px;">Aggiungi servizi aggiuntivi (fotografo, musica, allestimento, ecc.) con prezzo fisso non moltiplicato per invitati.</p>
            <div id="servizi-container" style="margin-bottom:12px;"></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <input id="nuova-servizio-nome" class="input" placeholder="Nome servizio (es. Fotografo, DJ...)" style="flex:1;min-width:180px;padding:8px 12px;font-size:14px;">
              <button type="button" id="btn-add-servizio" class="app-button secondary" style="white-space:nowrap;">+ Aggiungi servizio</button>
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
                <label>Tipo acconto</label>
                <select class="input" id="preventivo-tipo-acconto">
                  <option value="">— Seleziona —</option>
                  <option value="contanti">Contanti</option>
                  <option value="assegno">Assegno</option>
                  <option value="carta">Carta di credito</option>
                  <option value="bonifico">Bonifico</option>
                </select>
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

async function aspettaSedeAttiva(maxWait = 4000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (window.state?.sedeAttiva?.id) return;
    await new Promise(r => setTimeout(r, 150));
  }
  console.warn('crea-preventivo: sedeAttiva non disponibile dopo timeout');
}

async function loadRicetteEPrezzi() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id || null;

  ricetteCache = [];
  prezziByRicettaId = new Map();

  if (!supabase || !aziendaId) return;

  let query = supabase
    .from("prodotti_vendita")
    .select("id, nome, tipo, canale, prezzo_base, descrizione, categoria_vendita_id, ricetta_id, attivo")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .in("canale", ["evento", "tutti"])
    .order("ordinamento")
    .order("nome");

  if (sedeId) query = query.eq("sede_id", sedeId);

  const { data: prodotti } = await query;

  ricetteCache = (prodotti || []).map(p => ({
    id: p.id,
    nome: p.nome,
    tipo: p.tipo,
    canale: p.canale,
    prezzo_vendita: p.prezzo_base,
    costo_porzione: null,
    ricetta_id: p.ricetta_id,
    _isProdottoVendita: true,
  }));

  ricetteCache.forEach(p => {
    if (p.prezzo_vendita) {
      prezziByRicettaId.set(String(p.id), toNumber(p.prezzo_vendita));
    }
  });
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

  document.getElementById("btn-add-servizio")?.addEventListener("click", aggiungiServizio);
  document.getElementById("nuova-servizio-nome")?.addEventListener("keydown", e => { if(e.key==='Enter'){ e.preventDefault(); aggiungiServizio(); } });
  renderServiziRows();
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

  box.innerHTML = portate.map((row, idx) => {
    const collegata = !!row.ricetta_id && !row.is_placeholder;
    const placeholder = !!row.is_placeholder;
    const haPrezzo = toNumber(row.prezzo_pp) > 0;
    return `
    <div style="margin-bottom:10px;background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid ${collegata ? '#16a34a' : placeholder ? '#f59e0b' : '#e5e7eb'};" data-sezione="${sezioneId}" data-idx="${idx}">
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="flex:1;position:relative;">
          <input class="input portata-input" type="text" autocomplete="off"
            data-field="ricetta_nome" data-sezione="${sezioneId}" data-idx="${idx}"
            value="${escapeAttr(row.ricetta_nome || '')}"
            placeholder="${sezione?.isServizi ? 'Es. Fotografo, Musica, Fuochi...' : 'Scrivi o cerca portata...'}"
            style="width:100%;">
        </div>
        <div style="width:110px;">
          <input class="input" type="number" step="0.01" min="0"
            data-field="prezzo_pp" data-sezione="${sezioneId}" data-idx="${idx}"
            value="${toNumber(row.prezzo_pp) || ''}"
            placeholder="€/pp"
            title="Prezzo a persona (uso interno)">
        </div>
        <button type="button" data-action="remove-portata" data-sezione="${sezioneId}" data-idx="${idx}"
          style="background:#fee2e2;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;color:#dc2626;font-size:13px;flex-shrink:0;">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:5px;flex-wrap:wrap;">
        ${collegata ? `<span style="font-size:11px;color:#16a34a;font-weight:600;">✓ In ricettario</span>` : ''}
        ${placeholder ? `
          <span style="font-size:11px;color:#f59e0b;font-weight:600;">⚠ Non in ricettario</span>
          <a href="#/ricette-editor" style="font-size:11px;color:#0E5A7A;text-decoration:underline;">→ Completa scheda ricetta</a>
        ` : ''}
        ${!collegata && !placeholder && row.ricetta_nome ? `<span style="font-size:11px;color:#94a3b8;">Portata libera — verrà creata in ricettario</span>` : ''}
        ${!haPrezzo && row.ricetta_nome ? `<span style="font-size:11px;color:#dc2626;">⚠ Inserisci prezzo pp</span>` : ''}
      </div>
    </div>
  `}).join('');
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

  acTarget = input;
  const rect = input.getBoundingClientRect();
  dropdown.style.display = "block";
  dropdown.style.top = (rect.bottom + window.scrollY + 4) + "px";
  dropdown.style.left = rect.left + "px";
  dropdown.style.width = Math.max(rect.width, 280) + "px";

  // Risultati trovati + opzione "usa come nuova portata"
  const righeRisultati = risultati.map(r => {
    const prezzo = prezziByRicettaId.get(String(r.id));
    const foodCost = r.costo_porzione ? ` · food cost €${toNumber(r.costo_porzione).toFixed(2)}` : '';
    return `<div data-rid="${r.id}" data-rnome="${escapeAttr(r.nome)}" data-rprezzo="${prezzo || 0}"
      style="padding:10px 14px;cursor:pointer;font-size:14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;background:white;"
      onmouseenter="this.style.background='#f0f9ff'" onmouseleave="this.style.background='white'">
      <div>
        <div>${escapeHtml(r.nome)}</div>
        ${foodCost ? `<div style="font-size:11px;color:#94a3b8;">${foodCost}</div>` : ''}
      </div>
      ${prezzo ? `<span style="font-size:12px;color:#0E5A7A;font-weight:600;white-space:nowrap;margin-left:8px;">€${toNumber(prezzo).toFixed(2)}/pp</span>` : '<span style="font-size:11px;color:#94a3b8;margin-left:8px;">no prezzo</span>'}
    </div>`;
  }).join("");

  // Opzione crea nuova se nessuna corrispondenza esatta
  const esattoMatch = risultati.find(r => normalizeNome(r.nome) === q);
  const rigaNuova = !esattoMatch ? `
    <div data-nuova="${escapeAttr(query)}"
      style="padding:10px 14px;cursor:pointer;font-size:13px;color:#0E5A7A;background:#f0f9ff;border-top:1px solid #e5e7eb;display:flex;align-items:center;gap:6px;"
      onmouseenter="this.style.background='#e0f2fe'" onmouseleave="this.style.background='#f0f9ff'">
      <span>+</span> <span>Crea "<strong>${escapeHtml(query)}</strong>" come nuova portata</span>
    </div>
  ` : '';

  dropdown.innerHTML = righeRisultati + rigaNuova;

  dropdown.querySelectorAll("[data-rid]").forEach(el => {
    el.addEventListener("mousedown", e => {
      e.preventDefault();
      selezionaRicetta(el.dataset.rid, el.dataset.rnome, el.dataset.rprezzo);
    });
  });

  dropdown.querySelectorAll("[data-nuova]").forEach(el => {
    el.addEventListener("mousedown", e => {
      e.preventDefault();
      const nome = el.dataset.nuova;
      chiudiAutocomplete();
      if (!acTarget) return;
      const sid = acTarget.getAttribute("data-sezione");
      const idx = Number(acTarget.getAttribute("data-idx"));
      if (!sid || !Number.isFinite(idx)) return;
      // Apri modal al volo per creare prodotto_vendita
      apriModalNuovoProdotto(nome, (nuovoProdotto) => {
        acTarget.value = nuovoProdotto.nome;
        menuSezioni[sid][idx].ricetta_id = nuovoProdotto.id;
        menuSezioni[sid][idx].ricetta_nome = nuovoProdotto.nome;
        menuSezioni[sid][idx].prezzo_pp = nuovoProdotto.prezzo_base || 0;
        menuSezioni[sid][idx].is_placeholder = false;
        renderSezione(sid);
        recalcPreventivoTotali();
        setTimeout(() => {
          const pp = document.querySelector(`[data-field="prezzo_pp"][data-sezione="${sid}"][data-idx="${idx}"]`);
          if (pp) pp.focus();
        }, 50);
      });
    });
  });

  if (!risultati.length && esattoMatch === undefined && !query) { chiudiAutocomplete(); }
}

/* ============================================================ */
/* MODAL AL VOLO — Nuovo prodotto vendita                       */
/* ============================================================ */
function apriModalNuovoProdotto(nomeIniziale, onSalvato) {
  const existing = document.getElementById("modal-nuovo-prodotto");
  if (existing) existing.remove();

  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  const modal = document.createElement("div");
  modal.id = "modal-nuovo-prodotto";
  modal.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;
    z-index:9999;padding:20px;box-sizing:border-box;
  `;

  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:28px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div style="font-size:17px;font-weight:700;color:#0f172a;">+ Nuovo prodotto catalogo</div>
        <button id="modal-prod-close" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:16px;">✕</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;">Nome *</label>
          <input id="mp-nome" class="input" value="${escapeAttr(nomeIniziale)}" style="margin-top:4px;width:100%;box-sizing:border-box;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">Tipo</label>
            <select id="mp-tipo" class="input" style="margin-top:4px;width:100%;box-sizing:border-box;">
              <option value="portata">Portata</option>
              <option value="servizio">Servizio</option>
              <option value="bevanda">Bevanda</option>
              <option value="menu_fisso">Menu fisso</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#64748b;">Prezzo base (€)</label>
            <input id="mp-prezzo" type="number" step="0.01" min="0" class="input" placeholder="Es. 15.00" style="margin-top:4px;width:100%;box-sizing:border-box;">
          </div>
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#64748b;">Descrizione (opz.)</label>
          <textarea id="mp-descrizione" class="input" rows="2" style="margin-top:4px;width:100%;box-sizing:border-box;" placeholder="Breve descrizione per il preventivo..."></textarea>
        </div>
        <div style="background:#f0f9ff;border-radius:8px;padding:10px 12px;font-size:12px;color:#0369a1;">
          💡 Verrà aggiunto al catalogo con canale <strong>evento</strong> per la sede attiva. Potrai modificarlo in Configurazione → Menu.
        </div>
      </div>

      <div id="mp-esito" style="font-size:13px;min-height:16px;margin-top:12px;"></div>

      <div style="display:flex;gap:10px;margin-top:16px;">
        <button id="mp-salva" style="background:#0E5A7A;color:white;border:none;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;flex:1;">💾 Salva e inserisci</button>
        <button id="mp-annulla" style="background:#f1f5f9;color:#374151;border:none;padding:10px 18px;border-radius:10px;cursor:pointer;font-size:14px;">Annulla</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector("#modal-prod-close").onclick = close;
  modal.querySelector("#mp-annulla").onclick = close;
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  modal.querySelector("#mp-nome").focus();

  modal.querySelector("#mp-salva").onclick = async () => {
    const esito = modal.querySelector("#mp-esito");
    const nome = modal.querySelector("#mp-nome").value.trim();
    if (!nome) { esito.textContent = "❌ Nome obbligatorio"; esito.style.color = "#dc2626"; return; }
    esito.textContent = "Salvataggio..."; esito.style.color = "#64748b";

    const payload = {
      azienda_id: aziendaId,
      sede_id: sedeId || null,
      nome,
      tipo: modal.querySelector("#mp-tipo").value || "portata",
      canale: "evento",
      prezzo_base: parseFloat(modal.querySelector("#mp-prezzo").value) || null,
      descrizione: modal.querySelector("#mp-descrizione").value.trim() || null,
      attivo: true,
      visibile: true,
      disponibile: true,
    };

    const supabase = window.supabaseClient;
    const { data, error } = await supabase
      .from("prodotti_vendita")
      .insert(payload)
      .select("*")
      .single();

    if (error) { esito.textContent = "❌ " + error.message; esito.style.color = "#dc2626"; return; }

    // Aggiorna cache locale
    ricetteCache.push({
      id: data.id,
      nome: data.nome,
      tipo: data.tipo,
      canale: data.canale,
      prezzo_vendita: data.prezzo_base,
      _isProdottoVendita: true,
    });
    if (data.prezzo_base) prezziByRicettaId.set(String(data.id), toNumber(data.prezzo_base));

    close();
    if (typeof onSalvato === "function") onSalvato(data);
  };
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

  // Carica prezzo vendita se disponibile, altrimenti lascia editabile
  const prezzoNumerica = Math.max(0, toNumber(ricettaPrezzo));
  menuSezioni[sezioneId][idx].prezzo_pp = prezzoNumerica;

  // Aggiorna badge e prezzo nella UI
  renderSezione(sezioneId);
  // Dopo il render rimetti focus sul campo prezzo se non ha prezzo
  if (!prezzoNumerica) {
    setTimeout(() => {
      const prezzoInput = document.querySelector(`[data-field="prezzo_pp"][data-sezione="${sezioneId}"][data-idx="${idx}"]`);
      if (prezzoInput) prezzoInput.focus();
    }, 50);
  }
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
/* SERVIZI ROWS */
/* ============================================================ */

function aggiungiServizio() {
  const inp = document.getElementById("nuova-servizio-nome");
  const label = (inp?.value || "").trim();
  if (!label) { inp?.focus(); return; }
  serviziRows.push({ descrizione: label, prezzo_totale: 0 });
  if (inp) inp.value = "";
  renderServiziRows();
  recalcPreventivoTotali();
  setTimeout(() => {
    const inputs = document.querySelectorAll(".servizio-prezzo");
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  }, 50);
}

function renderServiziRows() {
  const box = document.getElementById("servizi-container");
  if (!box) return;
  if (!serviziRows.length) {
    box.innerHTML = `<div style="color:#94a3b8;font-size:13px;font-style:italic;padding:4px 0;">Nessun servizio aggiunto</div>`;
    return;
  }
  box.innerHTML = serviziRows.map((row, idx) => `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;background:#f8fafc;padding:10px 12px;border-radius:10px;border-left:3px solid #0E5A7A;">
      <div style="flex:1;font-size:14px;font-weight:600;color:#1a1a2e;">${escapeHtml(row.descrizione)}</div>
      <input class="input servizio-prezzo" type="number" step="0.01" min="0"
        data-idx="${idx}" value="${row.prezzo_totale || ''}" placeholder="€ totale"
        style="width:130px;">
      <button type="button" data-action="remove-servizio" data-idx="${idx}"
        style="background:#fee2e2;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;color:#dc2626;font-size:13px;">✕</button>
    </div>
  `).join("");

  box.querySelectorAll(".servizio-prezzo").forEach(inp => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      serviziRows[idx].prezzo_totale = Math.max(0, toNumber(inp.value));
      recalcPreventivoTotali();
    });
  });
  box.querySelectorAll("[data-action='remove-servizio']").forEach(btn => {
    btn.addEventListener("click", () => {
      serviziRows.splice(Number(btn.dataset.idx), 1);
      renderServiziRows();
      recalcPreventivoTotali();
    });
  });
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

  /* ================= SERVIZI ================= */
  let subtServizi = 0;
  serviziRows.forEach(row => { subtServizi += Math.max(0, toNumber(row.prezzo_totale)); });

  /* ================= BASE ================= */
  const base = subtMenu + subtExtra + subtServizi + locationPrezzo;

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

  // Apre il PDF in una nuova finestra con istruzioni chiare per salvare e inviare
  const win = buildPrintWindow({ showEmailInstructions: true, clienteEmail });
  if (!win) return;
}

/* ============================================================ */
/* PRINT */
/* ============================================================ */

function printCurrentPreventivo() {
  recalcPreventivoTotali();
  buildPrintWindow({ showEmailInstructions: false, clienteEmail: null });
}

function buildPrintWindow({ showEmailInstructions = false, clienteEmail = null } = {}) {
  const azienda = window.state?.azienda;
  const nomeAzienda = azienda?.nome || "Azienda";
  const logo = azienda?.logo_url || "";
  const iban = azienda?.iban || "";
  const indirizzoAzienda = [azienda?.indirizzo, azienda?.citta, azienda?.cap].filter(Boolean).join(", ");
  const telefonoAzienda = azienda?.telefono || "";
  const emailAzienda = azienda?.email || "";
  const pIvaAzienda = azienda?.partita_iva ? `P.IVA: ${azienda.partita_iva}` : "";

  const clienteNome = getVal("preventivo-cliente-nome");
  const clienteCognome = getVal("preventivo-cliente-cognome");
  const dataEvento = getVal("preventivo-data-evento");
  const tipologiaEvento = getVal("preventivo-titolo");
  const location = getVal("preventivo-location");
  const totale = getVal("preventivo-totale");
  const intolleranze = getVal("preventivo-intolleranze");
  const tipoAcconto = getVal("preventivo-tipo-acconto");

  const invPrint = Math.max(1, toNumber(getVal("preventivo-n-invitati")) || 1);
  let subtMenuPP = 0;
  sezioniDinamiche.forEach(s => {
    if (!s.isServizi) {
      (menuSezioni[s.id] || []).forEach(r => { subtMenuPP += Math.max(0, toNumber(r.prezzo_pp)); });
    }
  });

  // HTML sezioni menu (senza prezzi per portate, con prezzi per servizi)
  const menuHtml = sezioniDinamiche.map(s => {
    const portate = (menuSezioni[s.id] || []).filter(r => (r.ricetta_nome || "").trim());
    if (!portate.length) return '';
    return `
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">${escapeHtml(s.label)}</div>
        <ul style="margin:0;padding-left:18px;">
          ${portate.map(r => `<li style="margin-bottom:4px;">${escapeHtml(r.ricetta_nome)}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');

  // HTML servizi
  const serviziHtml = serviziRows.filter(r => r.descrizione).map(r => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dotted #e5e7eb;">
      <span style="font-size:14px;">${escapeHtml(r.descrizione)}</span>
      ${toNumber(r.prezzo_totale) > 0 ? `<strong style="font-size:14px;">€ ${toNumber(r.prezzo_totale).toFixed(2)}</strong>` : ''}
    </div>
  `).join('');

  const acconto = getVal("preventivo-acconto");
  const saldo = getVal("preventivo-saldo");
  const sconto = getVal("preventivo-sconto-euro");
  const note = getVal("preventivo-note");
  const nomeFesteggiato = getVal("preventivo-nome-festeggiato");
  const tipoServizio = getVal("preventivo-tipo-servizio");
  const nInvitati = getVal("preventivo-n-invitati");

  const subtMenu = getVal("preventivo-subtotale-menu");
  const subtServizi = serviziRows.reduce((acc, r) => acc + Math.max(0, toNumber(r.prezzo_totale)), 0);

  const emailBar = showEmailInstructions && clienteEmail ? `
    <div class="email-bar no-print" style="background:#ecfdf5;border:1px solid #6ee7b7;padding:14px 20px;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;font-size:14px;color:#065f46;">
        <strong>📧 Come inviare via email:</strong> Clicca "Stampa / Salva PDF", poi salva come PDF. Invia il file a <strong>${escapeHtml(clienteEmail)}</strong>.
      </div>
      <a href="mailto:${encodeURIComponent(clienteEmail)}?subject=${encodeURIComponent(`Preventivo ${tipologiaEvento} - ${nomeAzienda}`)}" 
        style="background:#059669;color:white;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px;white-space:nowrap;">
        ✉️ Apri email
      </a>
    </div>
  ` : '';

  const win = window.open("", "_blank");
  if (!win) return null;

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

          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #0E5A7A; }
          .header-logo img { max-height: 80px; max-width: 180px; object-fit: contain; }
          .header-logo .nome-azienda { font-size: 22px; font-weight: 700; color: #0E5A7A; }
          .header-azienda-info { font-size: 11px; color: #64748b; margin-top: 6px; line-height: 1.6; }
          .header-right { text-align: right; }
          .header-right .doc-title { font-size: 28px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; color: #0E5A7A; }
          .header-right .doc-date { font-size: 12px; color: #64748b; margin-top: 6px; }

          .cliente-box { background: #f0f9ff; border-left: 4px solid #0E5A7A; padding: 20px 24px; margin-bottom: 28px; border-radius: 0 8px 8px 0; }
          .cliente-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 3px; }
          .valore { font-size: 15px; font-weight: 600; color: #1a1a2e; }

          .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 700; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
          .menu-section { margin-bottom: 28px; }

          .economia { margin-top: 32px; border-top: 2px solid #0E5A7A; padding-top: 20px; }
          .economia-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .economia-row.totale { font-size: 20px; font-weight: 700; border-top: 1px solid #1a1a2e; margin-top: 8px; padding-top: 12px; }
          .economia-row.muted { color: #64748b; font-size: 13px; }

          .iban-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 13px; }
          .iban-box strong { display: block; margin-bottom: 4px; }

          .intolleranze-box { background: #fef2f2; border-left: 3px solid #ef4444; padding: 10px 14px; border-radius: 0 8px 8px 0; margin-bottom: 20px; font-size: 13px; }

          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
          .footer-note { font-size: 12px; color: #64748b; max-width: 380px; font-style: italic; }
          .firma-line { border-top: 1px solid #1a1a2e; width: 180px; margin-top: 40px; padding-top: 6px; font-size: 11px; color: #64748b; text-align: right; }

          .print-bar { text-align: center; padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
          .print-bar button { background: #0E5A7A; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; margin: 0 6px; }
          .print-bar button.secondary { background: #64748b; }
        </style>
      </head>
      <body>

        <div class="print-bar no-print">
          <button onclick="window.print()">🖨️ Stampa / Salva PDF</button>
          <button class="secondary" onclick="window.close()">✕ Chiudi</button>
        </div>

        ${emailBar}

        <div class="page">

          <!-- HEADER AZIENDA -->
          <div class="header">
            <div class="header-logo">
              ${logo ? `<img src="${escapeHtml(logo)}" alt="Logo">` : `<div class="nome-azienda">${escapeHtml(nomeAzienda)}</div>`}
              <div class="header-azienda-info">
                ${indirizzoAzienda ? `${escapeHtml(indirizzoAzienda)}<br>` : ''}
                ${telefonoAzienda ? `Tel: ${escapeHtml(telefonoAzienda)}<br>` : ''}
                ${emailAzienda ? `${escapeHtml(emailAzienda)}<br>` : ''}
                ${pIvaAzienda ? `${escapeHtml(pIvaAzienda)}` : ''}
              </div>
            </div>
            <div class="header-right">
              <div class="doc-title">Preventivo</div>
              <div class="doc-date">Data: ${new Date().toLocaleDateString('it-IT', {day:'2-digit',month:'long',year:'numeric'})}</div>
            </div>
          </div>

          <!-- CLIENTE E EVENTO -->
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

          <!-- INTOLLERANZE -->
          ${intolleranze ? `
          <div class="intolleranze-box">
            <strong>⚠️ Intolleranze / Allergie:</strong> ${escapeHtml(intolleranze)}
          </div>` : ''}

          <!-- MENU PER SEZIONI -->
          ${menuHtml ? `
          <div class="menu-section">
            <div class="section-title">Menù</div>
            ${menuHtml}
          </div>` : ''}

          <!-- SERVIZI -->
          ${serviziHtml ? `
          <div class="menu-section">
            <div class="section-title">Servizi</div>
            ${serviziHtml}
          </div>` : ''}

          <!-- SEZIONE ECONOMICA -->
          <div class="economia">
            <div class="economia-row" style="font-size:15px;font-weight:600;background:#f0f9ff;padding:10px 12px;border-radius:8px;margin-bottom:8px;">
              <span>Menù a persona</span>
              <span>€ ${subtMenuPP.toFixed(2)}</span>
            </div>
            <div class="economia-row muted">
              <span>Totale menù (${invPrint} invitati)</span>
              <span>€ ${escapeHtml(subtMenu)}</span>
            </div>
            ${subtServizi > 0 ? `
            <div class="economia-row muted">
              <span>Totale servizi</span>
              <span>€ ${subtServizi.toFixed(2)}</span>
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
              <span>Acconto versato${tipoAcconto ? ` (${escapeHtml(tipoAcconto)})` : ''}</span>
              <span>€ ${escapeHtml(acconto)}</span>
            </div>
            <div class="economia-row" style="font-weight:600;">
              <span>Saldo residuo</span>
              <span>€ ${escapeHtml(saldo)}</span>
            </div>` : ''}
          </div>

          <!-- IBAN -->
          ${iban ? `
          <div class="iban-box">
            <strong>💳 Coordinate bancarie per il pagamento:</strong>
            ${escapeHtml(nomeAzienda)} — IBAN: <strong>${escapeHtml(iban)}</strong>
          </div>` : ''}

          <!-- FOOTER -->
          <div class="footer">
            <div class="footer-note">
              ${note ? escapeHtml(note) : 'Il presente preventivo ha validità 30 giorni dalla data di emissione. Per accettazione si prega di restituire copia firmata.'}
            </div>
            <div>
              <div class="firma-line">Firma per accettazione</div>
            </div>
          </div>

        </div>
      </body>
    </html>
  `);

  win.document.close();
  return win;
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
