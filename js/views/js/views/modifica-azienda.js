// js/views/modifica-azienda.js
import { supabase } from "../supabaseClient.js";

const FEATURE_KEYS = [
  "timbrature",
  "dipendenti",
  "ricette",
  "ricettario",
  "magazzino",
  "acquisti",
  "preventivi",
  "venduto",
  "report",
];

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

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

  const id = (window.routeParams && window.routeParams.id) || "";
  if (!id) {
    container.innerHTML = `
      <div class="view">
        <h2>Modifica azienda</h2>
        <p class="small-muted">ID azienda mancante.</p>
        <button class="app-button small gray" type="button" id="btn-back">⬅ Torna alla lista</button>
      </div>
    `;
    document.getElementById("btn-back").onclick = () => {
      window.location.hash = "#/gestioneAziende";
    };
    return;
  }

  container.innerHTML = `
    <div class="view">
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <h2 style="margin-top:0;">Scheda Azienda</h2>
          <p class="small-muted" id="azienda-subtitle" style="margin-top:4px;">Caricamento...</p>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="app-button small gray" type="button" id="btn-back">⬅ Lista</button>
          <button class="app-button small" type="button" id="btn-rinnova">+30 giorni</button>
          <button class="app-button small green" type="button" id="btn-save">Salva</button>
        </div>
      </div>

      <div id="azienda-form-area" style="margin-top:12px;"></div>

      <p id="azienda-msg" class="small-muted" style="margin-top:10px;"></p>
    </div>
  `;

  document.getElementById("btn-back").onclick = () => {
    window.location.hash = "#/gestioneAziende";
  };

  const formArea = document.getElementById("azienda-form-area");
  const msg = document.getElementById("azienda-msg");
  const subtitle = document.getElementById("azienda-subtitle");

  let azienda = null;

  async function load() {
    msg.textContent = "";
    formArea.innerHTML = `
      <div class="kpi-card">
        <h3 style="margin:0;">Caricamento</h3>
        <p class="small-muted">Sto caricando i dati azienda...</p>
      </div>
    `;

    const { data, error } = await supabase
      .from("aziende")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Errore caricamento azienda:", error);
      formArea.innerHTML = `
        <div class="kpi-card">
          <h3 style="margin:0;">Errore</h3>
          <p class="small-muted">Impossibile caricare l’azienda.</p>
        </div>
      `;
      subtitle.textContent = "Errore caricamento";
      return;
    }

    azienda = data;
    subtitle.textContent = `${azienda.nome} (${azienda.codice})`;

    renderForm(azienda);
  }

  function renderForm(az) {
    const features = az.features || {};

    formArea.innerHTML = `
      <div class="kpi-card">
        <h3>Dati Base</h3>

        <div class="form-grid-2">
          <label>
            Nome commerciale
            <input id="f_nome" class="input-pill" value="${esc(az.nome)}" />
          </label>

          <label>
            Codice azienda
            <input id="f_codice" class="input-pill" value="${esc(az.codice)}" />
          </label>
        </div>

        <div class="form-grid-2">
          <label>
            PIN accesso azienda
            <input id="f_pin" class="input-pill" value="${esc(az.pin_accesso)}" />
          </label>

          <label>
            Piano
            <input id="f_piano" class="input-pill" value="${esc(az.piano || "pro")}" />
          </label>
        </div>

        <div class="form-grid-2">
          <label>
            Stato
            <select id="f_stato" class="input-pill">
              <option value="attiva" ${az.stato === "attiva" ? "selected" : ""}>attiva</option>
              <option value="sospesa" ${az.stato === "sospesa" ? "selected" : ""}>sospesa</option>
              <option value="piattaforma" ${az.stato === "piattaforma" ? "selected" : ""}>piattaforma</option>
            </select>
          </label>

          <label>
            Data scadenza
            <input id="f_scadenza" type="date" class="input-pill" value="${az.data_scadenza || ""}" />
          </label>
        </div>

        <label class="checkbox-row">
          <input id="f_attiva" type="checkbox" ${az.attiva !== false ? "checked" : ""} />
          Azienda attiva
        </label>
      </div>

      <div class="kpi-card">
        <h3>Dati Societari</h3>
        <div class="form-grid-2">
          <label>
            Ragione sociale
            <input id="f_ragione" class="input-pill" value="${esc(az.ragione_sociale)}" />
          </label>
          <label>
            Partita IVA
            <input id="f_piva" class="input-pill" value="${esc(az.partita_iva)}" />
          </label>
        </div>

        <div class="form-grid-2">
          <label>
            Codice fiscale
            <input id="f_cf" class="input-pill" value="${esc(az.codice_fiscale)}" />
          </label>
          <label>
            Codice univoco
            <input id="f_cu" class="input-pill" value="${esc(az.codice_univoco)}" />
          </label>
        </div>

        <label>
          PEC
          <input id="f_pec" class="input-pill" value="${esc(az.pec)}" />
        </label>
      </div>

      <div class="kpi-card">
        <h3>Sede</h3>
        <label>
          Indirizzo
          <input id="f_indirizzo" class="input-pill" value="${esc(az.indirizzo)}" />
        </label>

        <div class="form-grid-2">
          <label>
            Città
            <input id="f_citta" class="input-pill" value="${esc(az.citta)}" />
          </label>
          <label>
            CAP
            <input id="f_cap" class="input-pill" value="${esc(az.cap)}" />
          </label>
        </div>

        <div class="form-grid-2">
          <label>
            Provincia
            <input id="f_provincia" class="input-pill" value="${esc(az.provincia)}" />
          </label>
          <label>
            Nazione
            <input id="f_nazione" class="input-pill" value="${esc(az.nazione || "Italia")}" />
          </label>
        </div>
      </div>

      <div class="kpi-card">
        <h3>Contatti</h3>
        <div class="form-grid-2">
          <label>
            Email
            <input id="f_email" type="email" class="input-pill" value="${esc(az.email)}" />
          </label>
          <label>
            Telefono
            <input id="f_tel" class="input-pill" value="${esc(az.telefono)}" />
          </label>
        </div>
        <label>
          Referente
          <input id="f_ref" class="input-pill" value="${esc(az.referente)}" />
        </label>
      </div>

      <div class="kpi-card">
        <h3>Parametri gestionali</h3>
        <div class="form-grid-2">
          <label>
            Aliquota IVA default (%)
            <input id="f_iva" type="number" step="0.01" class="input-pill" value="${num(az.aliquota_iva_default, 10)}" />
          </label>

          <label>
            Food cost target (%)
            <input id="f_food" type="number" step="0.01" class="input-pill" value="${num(az.food_cost_target_percentuale, 30)}" />
          </label>
        </div>

        <label>
          Markup default
          <input id="f_markup" type="number" step="0.01" class="input-pill" value="${num(az.markup_default, 3)}" />
        </label>
      </div>

      <div class="kpi-card">
        <h3>Feature abilitate</h3>
        <div class="features-grid">
          ${FEATURE_KEYS.map((k) => {
            const checked = features[k] !== false;
            return `
              <label class="feature-item">
                <input type="checkbox" class="f_feature" data-key="${k}" ${checked ? "checked" : ""} />
                <span>${k}</span>
              </label>
            `;
          }).join("")}
        </div>
        <p class="small-muted" style="margin-top:8px;">
          Le feature influenzeranno menu e viste disponibili per l’azienda.
        </p>
      </div>
    `;
  }

  async function save() {
    if (!azienda) return;

    msg.textContent = "";
    const payload = collectPayload();

    const { error } = await supabase.from("aziende").update(payload).eq("id", id);
    if (error) {
      console.error("Errore salvataggio azienda:", error);
      msg.textContent = `Errore: ${error.message}`;
      msg.style.color = "#dc2626";
      return;
    }

    msg.textContent = "Salvato ✅";
    msg.style.color = "#16a34a";

    await load(); // ricarica per vedere dati normalizzati
  }

  function collectPayload() {
    const features = {};
    document.querySelectorAll(".f_feature").forEach((cb) => {
      const key = cb.getAttribute("data-key");
      features[key] = cb.checked;
    });

    return {
      nome: v("f_nome"),
      codice: v("f_codice"),
      pin_accesso: v("f_pin"),
      piano: v("f_piano"),

      stato: v("f_stato"),
      data_scadenza: v("f_scadenza") || null,
      attiva: !!document.getElementById("f_attiva").checked,

      ragione_sociale: v("f_ragione") || null,
      partita_iva: v("f_piva") || null,
      codice_fiscale: v("f_cf") || null,

      pec: v("f_pec") || null,
      codice_univoco: v("f_cu") || null,

      indirizzo: v("f_indirizzo") || null,
      citta: v("f_citta") || null,
      cap: v("f_cap") || null,
      provincia: v("f_provincia") || null,
      nazione: v("f_nazione") || "Italia",

      email: v("f_email") || null,
      telefono: v("f_tel") || null,
      referente: v("f_ref") || null,

      aliquota_iva_default: n("f_iva", 10),
      food_cost_target_percentuale: n("f_food", 30),
      markup_default: n("f_markup", 3),

      features,
    };
  }

  async function rinnova30() {
    if (!azienda) return;
    msg.textContent = "";

    const old = azienda.data_scadenza ? new Date(azienda.data_scadenza) : new Date();
    old.setHours(0, 0, 0, 0);

    // se scaduta, riparti da oggi
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const base = old < oggi ? oggi : old;
    const nuova = new Date(base.getTime() + 30 * 86400000);

    const yyyy = nuova.getFullYear();
    const mm = String(nuova.getMonth() + 1).padStart(2, "0");
    const dd = String(nuova.getDate()).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}`;

    document.getElementById("f_scadenza").value = iso;
    msg.textContent = "Scadenza aggiornata (+30). Premi Salva ✅";
    msg.style.color = "#111827";
  }

  document.getElementById("btn-save").onclick = save;
  document.getElementById("btn-rinnova").onclick = rinnova30;

  await load();
}

function v(id) {
  const el = document.getElementById(id);
  return (el ? el.value : "").trim();
}
function n(id, fallback) {
  const raw = v(id).replace(",", ".");
  const val = parseFloat(raw);
  return Number.isNaN(val) ? fallback : val;
}
function num(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}
function esc(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
