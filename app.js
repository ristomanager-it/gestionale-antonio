// ==================================================
// GESTIONALE ANTONIO - APP.JS (VERSIONE AGGIORNATA)
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
  // --------------------------------------------------
  // 1. SETUP GENERALE
  // --------------------------------------------------

  const supabase = window.supabaseClient || null;

  // Stato globale
  let currentUser = null; // { id, nome, ruolo, canalePrevalente, virtualAdmin? }
  let dipendenti = [];
  let timbrature = [];
  let fatturaCorrenteId = null;
  let fatturaRighe = [];
  let prodottiMagazzino = [];
  let ricettaCorrenteId = null;
  let ricettaFotoCorrenteUrl = null;

  // --------------------------------------------------
  // 1.1 Helper generici
  // --------------------------------------------------

  function parseNumber(value) {
    if (value === null || value === undefined) return 0;
    const normalized = String(value).replace(",", ".").trim();
    if (!normalized) return 0;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : 0;
  }

  function formatNumber(value, dec = 2) {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    return n.toFixed(dec);
  }

  function formatEuro(value) {
    const n = parseNumber(value);
    return "€ " + n.toFixed(2);
  }

  function setTodayOnDateInput(input) {
    if (!input) return;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    input.value = `${yyyy}-${mm}-${dd}`;
  }

  function saveToLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }
  }

  function loadFromLocalStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("LocalStorage read error:", e);
      return null;
    }
  }

  // --------------------------------------------------
  // 2. SELEZIONE ELEMENTI DOM
  // --------------------------------------------------

  // Header / generali
  const body = document.body;
  const btnTheme = document.getElementById("btn-theme");
  const currentUserLabel = document.getElementById("current-user-label");
  const btnLogout = document.getElementById("btn-logout");

  // Viste principali
  const viewLogin = document.getElementById("view-login");
  const viewHomeDip = document.getElementById("view-home-dip");
  const viewTimbratura = document.getElementById("view-timbratura");
  const viewDipendenti = document.getElementById("view-dipendenti");
  const viewAcquisti = document.getElementById("view-acquisti");
  const viewRicette = document.getElementById("view-ricette");
  const viewMagazzino = document.getElementById("view-magazzino");
  const viewReport = document.getElementById("view-report");

  const managerMenu = document.getElementById("manager-menu");

  // LOGIN
  const loginNomeInput = document.getElementById("login-nome");
  const loginPinInput = document.getElementById("login-pin");
  const loginRememberCheckbox = document.getElementById("login-remember");
  const btnLogin = document.getElementById("btn-login");

  // HOME DIPENDENTE
  const homeButtons = document.querySelectorAll(
    '#view-home-dip .app-button[data-route]'
  );

  // TIMBRATURA
  const timbraturaUtenteNome = document.getElementById("timbratura-utente-nome");
  const timbraturaCanaleSelect = document.getElementById(
    "timbratura-canale-select"
  );
  const btnEntra = document.getElementById("btn-entra");
  const btnPausa = document.getElementById("btn-pausa");
  const btnEsci = document.getElementById("btn-esci");
  const btnTogglePresenze = document.getElementById("btn-toggle-presenze");
  const sezionePresenze = document.getElementById("sezione-presenze");
  const presenzeLista = document.getElementById("presenze-lista");

  // DIPENDENTI
  const dipForm = document.getElementById("dipendente-form");
  const dipNome = document.getElementById("dip-nome");
  const dipMansione = document.getElementById("dip-mansione");
  const dipDataNascita = document.getElementById("dip-data-nascita");
  const dipResidenza = document.getElementById("dip-residenza");
  const dipTelefono = document.getElementById("dip-telefono");
  const dipEmail = document.getElementById("dip-email");
  const dipRuolo = document.getElementById("dip-ruolo");
  const dipTipoCompenso = document.getElementById("dip-tipo-compenso");
  const dipRetribuzioneBase = document.getElementById("dip-retribuzione-base");
  const dipOreMensili = document.getElementById("dip-ore-mensili");
  const dipOreServizio = document.getElementById("dip-ore-servizio");
  const dipCosto = document.getElementById("dip-costo");
  const dipCodice = document.getElementById("dip-codice");
  const dipCanale = document.getElementById("dip-canale");
  const dipAttivo = document.getElementById("dip-attivo");
  const btnAddDip = document.getElementById("btn-add-dip");
  const dipLista = document.getElementById("dipendenti-lista");
  const labelRetribuzione = document.getElementById("label-retribuzione-base");
  const rowOreMensili = document.getElementById("row-ore-mensili");
  const rowOreServizio = document.getElementById("row-ore-servizio");

  // ACQUISTI / FATTURE - DOM
  const fatturaNumeroInput = document.getElementById("fattura-numero");
  const fatturaDataInput = document.getElementById("fattura-data");
  const fatturaFornitoreInput = document.getElementById("fattura-fornitore");
  const fatturaNoteInput = document.getElementById("fattura-note");

  const fatturaRigheBody = document.getElementById("fattura-righe-body");

  const fatturaImponibileTotaleInput = document.getElementById(
    "fattura-imponibile-totale"
  );
  const fatturaIvaTotaleInput = document.getElementById("fattura-iva-totale");
  const fatturaTotaleDocumentoInput = document.getElementById(
    "fattura-totale-documento"
  );

  const btnNuovaFattura = document.getElementById("btn-nuova-fattura");
  const btnSalvaFattura = document.getElementById("btn-salva-fattura");
  const btnAddRigaFattura = document.getElementById("btn-add-riga-fattura");
  const btnToggleFatture = document.getElementById("btn-toggle-fatture");
  const fattureTable = document.getElementById("fatture-table");
  const fattureLista = document.getElementById("fatture-lista");

  // RICETTE
  const ricettaForm = document.getElementById("ricetta-form");
  const ricettaNomeInput = document.getElementById("ricetta-nome");
  const ricettaDescrizioneInput = document.getElementById("ricetta-descrizione");
  const ricettaNoteInput = document.getElementById("ricetta-note");
  const ricettaFotoInput = document.getElementById("ricetta-foto");
  const ricettaIngredientiContainer = document.getElementById(
    "ricetta-ingredienti-container"
  );
  const btnAddIngrediente = document.getElementById("btn-add-ingrediente");
  const btnSalvaRicetta = document.getElementById("btn-salva-ricetta");
  const ingredientiSuggestions = document.getElementById(
    "ingredienti-suggestions"
  );

  // MAGAZZINO
  const magazzinoSearchInput = document.getElementById("magazzino-search");
  const magazzinoSuggestions = document.getElementById("magazzino-suggestions");
  const magazzinoTable = document.getElementById("magazzino-table");
  const magazzinoLista = document.getElementById("magazzino-lista");
  const btnMagazzinoNuovo = document.getElementById("btn-magazzino-nuovo");
  const magazzinoForm = document.getElementById("magazzino-form");
  const magazzinoIdInput = document.getElementById("magazzino-id");
  const magazzinoDescrizioneInput = document.getElementById(
    "magazzino-descrizione"
  );
  const magazzinoCategoriaInput = document.getElementById("magazzino-categoria");
  const magazzinoUmInput = document.getElementById("magazzino-um");
  const magazzinoScortaMinimaInput = document.getElementById(
    "magazzino-scorta-minima"
  );
  const magazzinoGiacenzaInput = document.getElementById("magazzino-giacenza");
  const btnMagazzinoSalva = document.getElementById("btn-magazzino-salva");

  // REPORT / KPI
  const reportPeriodButtons = document.querySelectorAll(
    ".report-period-btn"
  );
  const reportDataInput = document.getElementById("report-data");
  const kpiIncassoInput = document.getElementById("kpi-incasso-input");
  const kpiFoodCostInput = document.getElementById("kpi-foodcost-input");
  const kpiIncassoValue = document.getElementById("kpi-incasso-value");
  const kpiNettoValue = document.getElementById("kpi-netto-value");
  const kpiMargineBadge = document.getElementById("kpi-margine-badge");
  const kpiBepLabel = document.getElementById("kpi-bep-label");
  const kpiGaugeNeedle = document.getElementById("kpi-gauge-needle");
  const kpiLavoroImporto = document.getElementById("kpi-lavoro-importo");
  const kpiLavoroPercent = document.getElementById("kpi-lavoro-percent");
  const kpiFoodImporto = document.getElementById("kpi-food-importo");
  const kpiFoodPercent = document.getElementById("kpi-food-percent");
  const kpiFissiImporto = document.getElementById("kpi-fissi-importo");
  const kpiFissiPercent = document.getElementById("kpi-fissi-percent");
  const btnToggleCostiFissi = document.getElementById(
    "btn-toggle-costi-fissi"
  );
  const costiFissiPanel = document.getElementById("costi-fissi-panel");
  const costiFissiCategoria = document.getElementById("costi-fissi-categoria");
  const costiFissiDescrizione = document.getElementById(
    "costi-fissi-descrizione"
  );
  const costiFissiAnno = document.getElementById("costi-fissi-anno");
  const costiFissiImporto = document.getElementById("costi-fissi-importo");
  const btnSalvaCostoFisso = document.getElementById("btn-salva-costo-fisso");
  const costiFissiLista = document.getElementById("costi-fissi-lista");

  // --------------------------------------------------
  // 3. TEMA (SCURO/CHIARO)
  // --------------------------------------------------

  function applyInitialTheme() {
    const saved = loadFromLocalStorage("ga_theme");
    if (saved === "light") {
      body.classList.add("theme-light");
      if (btnTheme) btnTheme.textContent = "☀️";
    } else {
      body.classList.remove("theme-light");
      if (btnTheme) btnTheme.textContent = "🌙";
    }
  }

  function toggleTheme() {
    const isLight = body.classList.toggle("theme-light");
    saveToLocalStorage("ga_theme", isLight ? "light" : "dark");
    if (btnTheme) btnTheme.textContent = isLight ? "☀️" : "🌙";
  }

  if (btnTheme) {
    btnTheme.addEventListener("click", toggleTheme);
  }

  applyInitialTheme();

  // --------------------------------------------------
  // 4. ROUTING / VIEW HANDLING
  // --------------------------------------------------

  const allViews = [
    viewLogin,
    viewHomeDip,
    viewTimbratura,
    viewDipendenti,
    viewAcquisti,
    viewRicette,
    viewMagazzino,
    viewReport,
  ].filter(Boolean);

  function showOnlyView(viewEl) {
    allViews.forEach((v) => {
      if (!v) return;
      v.style.display = v === viewEl ? "block" : "none";
    });
  }

  function showHomeDipendente() {
    if (viewHomeDip) {
      showOnly
