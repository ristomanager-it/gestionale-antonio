// ==================================================
// GESTIONALE ANTONIO - APP.JS (VERSIONE AGGIORNATA)
// ==================================================

document.addEventListener("DOMContentLoaded", () => {
  // --------------------------------------------------
  // 1. SETUP GENERALE
  // --------------------------------------------------

  const supabase = window.supabaseClient || null;

  // Stato globale
  let currentUser = null; // { id, nome, ruolo, canalePrevalente }
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

  // ACQUISTI / FATTURE
  const fatturaNumeroInput = document.getElementById("fattura-numero");
  const fatturaDataInput = document.getElementById("fattura-data");
  const fatturaFornitoreInput = document.getElementById("fattura-fornitore");
  const fatturaNoteInput = document.getElementById("fattura-note");
  const btnNuovaFattura = document.getElementById("btn-nuova-fattura");
  const btnSalvaFattura = document.getElementById("btn-salva-fattura");
  const btnAddRigaFattura = document.getElementById("btn-add-riga-fattura");
  const fatturaRigheBody = document.getElementById("fattura-righe-body");
  const fatturaImponibileTotaleInput = document.getElementById(
    "fattura-imponibile-totale"
  );
  const fatturaIvaTotaleInput = document.getElementById("fattura-iva-totale");
  const fatturaTotaleDocumentoInput = document.getElementById(
    "fattura-totale-documento"
  );
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
      showOnlyView(viewHomeDip);
    }
  }

  function isManagerRole(ruolo) {
    return (
      ruolo === "admin" ||
      ruolo === "manager_cucina" ||
      ruolo === "manager_sala"
    );
  }

  function applyRoleVisibility() {
    const managerOnlyEls = document.querySelectorAll("[data-manager-only]");
    managerOnlyEls.forEach((el) => {
      el.style.display =
        currentUser && isManagerRole(currentUser.ruolo) ? "" : "none";
    });

    if (managerMenu) {
      managerMenu.style.display =
        currentUser && isManagerRole(currentUser.ruolo) ? "grid" : "none";
    }

    if (viewHomeDip) {
      viewHomeDip.style.display =
        currentUser && !isManagerRole(currentUser.ruolo) ? "block" : "none";
    }
  }

  async function onRouteEnter(route) {
    switch (route) {
      case "timbratura":
        showOnlyView(viewTimbratura);
        updateTimbraturaUserInfo();
        await caricaPresenzeSeServe();
        break;
      case "dipendenti":
        showOnlyView(viewDipendenti);
        await caricaDipendentiDaSupabase();
        break;
      case "acquisti":
        showOnlyView(viewAcquisti);
        resetFatturaForm();
        await caricaElencoFatture();
        break;
      case "ricette":
        showOnlyView(viewRicette);
        resetFormRicetta();
        await caricaSuggerimentiIngredienti();
        break;
      case "magazzino":
        showOnlyView(viewMagazzino);
        await caricaProdottiMagazzino();
        break;
      case "report":
        showOnlyView(viewReport);
        setTodayOnDateInput(reportDataInput);
        aggiornaKpiDaInput();
        await caricaCostiFissi();
        break;
      case "ordine":
        // per ora non abbiamo una vista dedicata: resto in home dipendente
        showHomeDipendente();
        alert("Funzione 'Ordine del giorno' non ancora implementata.");
        break;
      default:
        showOnlyView(viewTimbratura);
        updateTimbraturaUserInfo();
        break;
    }
  }

  function navigateTo(route) {
    window.location.hash = `#${route}`;
    onRouteEnter(route);
  }

  // click menu manager
  if (managerMenu) {
    managerMenu
      .querySelectorAll(".app-button[data-route]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const route = btn.getAttribute("data-route") || "timbratura";
          navigateTo(route);
        });
      });
  }

  // click home dipendente (timbratura / ordine del giorno)
  homeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-route") || "timbratura";
      navigateTo(route);
    });
  });

  // --------------------------------------------------
  // 5. LOGIN / UTENTE CORRENTE
  // --------------------------------------------------

  function setCurrentUser(user, persist) {
    currentUser = user;
    if (currentUserLabel) {
      currentUserLabel.textContent = user ? user.nome : "Nessun utente";
    }
    if (btnLogout) {
      btnLogout.style.display = user ? "inline-flex" : "none";
    }

    if (persist) {
      saveToLocalStorage("ga_user", user);
    } else {
      saveToLocalStorage("ga_user", null);
    }

    applyRoleVisibility();
    updateTimbraturaUserInfo();
  }

  // 🔑 LOGIN SEMPLIFICATO: CERCA SOLO PER PIN (CODICE)
 // 🔑 LOGIN con ADMIN VIRTUALE (admin / 0000)
async function login(nomeRaw, pinRaw) {
  const nomeTrim = (nomeRaw || "").trim();
  const pinTrim = (pinRaw || "").trim();

  if (!nomeTrim || !pinTrim) {
    alert("Inserisci nome e PIN");
    return null;
  }

  // 1) ADMIN VIRTUALE: nome "admin" + PIN "0000"
  if (nomeTrim.toLowerCase() === "admin" && pinTrim === "0000") {
    const persist =
      !!(loginRememberCheckbox && loginRememberCheckbox.checked);

    const user = {
      id: null,                  // nessun id in tabella dipendenti
      nome: "Admin",
      ruolo: "admin",
      canalePrevalente: "NR",
      virtualAdmin: true,
    };

    setCurrentUser(user, persist);
    return user;
  }

  // 2) Normale login via Supabase
  if (!supabase) {
    alert("Supabase non inizializzato");
    return null;
  }

  let { data: byPin, error } = await supabase
    .from("dipendenti")
    .select("id, nome, ruolo, canale_prevalente, codice, attivo")
    .eq("codice", pinTrim);

  if (error) {
    console.error("Errore login (PIN):", error);
    alert("Errore durante il login");
    return null;
  }

  byPin = byPin || [];

  if (!byPin.length) {
    alert("Credenziali non valide (nome o PIN errati)");
    return null;
  }

  const nomeLower = nomeTrim.toLowerCase();
  let match =
    byPin.find(
      (d) => String(d.nome || "").toLowerCase() === nomeLower
    ) || byPin[0];

  if (!match) {
    alert("Credenziali non valide (nome o PIN errati)");
    return null;
  }

  if (match.attivo === false) {
    alert("Dipendente non attivo");
    return null;
  }

  const user = {
    id: match.id,
    nome: match.nome,
    ruolo: match.ruolo,
    canalePrevalente: match.canale_prevalente || "NR",
  };

  const persist =
    !!(loginRememberCheckbox && loginRememberCheckbox.checked);
  setCurrentUser(user, persist);
  return user;
}


  if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
      const nome = loginNomeInput?.value || "";
      const pin = loginPinInput?.value || "";
      const user = await login(nome, pin);
      if (!user) return;

      const isManager = isManagerRole(user.ruolo);
      const routeFromHash =
        window.location.hash.replace("#", "") || "timbratura";

      if (isManager) {
        // manager: va direttamente alla route (es. timbratura, report, ecc.)
        await onRouteEnter(routeFromHash);
      } else {
        // dipendente: va SEMPRE alla home dipendente (Timbratura + Ordine)
        showHomeDipendente();
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      setCurrentUser(null, false);
      showOnlyView(viewLogin);
    });
  }

  // Ripristino user da localStorage
  const savedUser = loadFromLocalStorage("ga_user");
  if (savedUser && savedUser.id) {
    setCurrentUser(savedUser, true);
    const routeFromHash =
      window.location.hash.replace("#", "") || "timbratura";
    // Se è manager rientra nella route, se è dipendente in home-dip
    if (isManagerRole(savedUser.ruolo)) {
      onRouteEnter(routeFromHash);
    } else {
      showHomeDipendente();
    }
  } else {
    showOnlyView(viewLogin);
  }

  // --------------------------------------------------
  // 6. TIMBRATURE
  // --------------------------------------------------

  function updateTimbraturaUserInfo() {
    if (!timbraturaUtenteNome) return;
    if (!currentUser) {
      timbraturaUtenteNome.textContent = "-";
      return;
    }
    timbraturaUtenteNome.textContent = currentUser.nome || "-";
    if (timbraturaCanaleSelect && currentUser.canalePrevalente) {
      timbraturaCanaleSelect.value = currentUser.canalePrevalente;
    }
  }

  async function getUltimaTimbraturaDipendente(dipendenteId) {
    if (!supabase || !dipendenteId) return null;

    const { data, error } = await supabase
      .from("timbrature")
      .select("id, dipendente_id, canale, tipo, data_ora")
      .eq("dipendente_id", dipendenteId)
      .order("data_ora", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Errore caricamento ultima timbratura:", error);
      return null;
    }

    return (data && data[0]) || null;
  }

  async function timbra(tipo) {
    if (!currentUser) {
      alert("Effettua il login prima di timbrare");
      return;
    }
    if (!supabase) {
      alert("Supabase non inizializzato");
      return;
    }

    const canale = timbraturaCanaleSelect?.value || "NR";
    const ultima = await getUltimaTimbraturaDipendente(currentUser.id);

    const dentro = ultima && ultima.tipo !== "USCITA";

    if (tipo === "ENTRATA" && dentro) {
      alert("Sei già dentro, non puoi fare una nuova entrata.");
      return;
    }

    if ((tipo === "PAUSA" || tipo === "USCITA") && !dentro) {
      alert("Non hai una entrata aperta.");
      return;
    }

    const canaleDaUsare =
      tipo === "USCITA" && ultima ? ultima.canale || canale : canale;

    const now = new Date().toISOString();

    const { error } = await supabase.from("timbrature").insert({
      dipendente_id: currentUser.id,
      canale: canaleDaUsare,
      tipo,
      data_ora: now,
    });

    if (error) {
      console.error("Errore timbratura:", error);
      alert("Errore nella timbratura");
      return;
    }

    alert(`Timbratura ${tipo} registrata`);
    await caricaPresenzeSeServe();
  }

  async function caricaPresenzeSeServe() {
    if (!sezionePresenze || sezionePresenze.style.display === "none") return;
    await caricaPresenze();
  }

  async function caricaPresenze() {
    if (!supabase || !presenzeLista) return;

    const oggi = new Date();
    const yyyy = oggi.getFullYear();
    const mm = String(oggi.getMonth() + 1).padStart(2, "0");
    const dd = String(oggi.getDate()).padStart(2, "0");
    const dataStr = `${yyyy}-${mm}-${dd}`;

    const { data, error } = await supabase.rpc("stato_dipendenti_giorno", {
      data_rif: dataStr,
    });

    if (error) {
      console.warn("RPC stato_dipendenti_giorno non disponibile:", error);
      presenzeLista.innerHTML = "";
      return;
    }

    presenzeLista.innerHTML = "";
    (data || []).forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.nome}</td>
        <td>${row.canale || "-"}</td>
        <td>${row.stato || "-"}</td>
      `;
      presenzeLista.appendChild(tr);
    });
  }

  if (btnEntra) {
    btnEntra.addEventListener("click", () => timbra("ENTRATA"));
  }
  if (btnPausa) {
    btnPausa.addEventListener("click", () => timbra("PAUSA"));
  }
  if (btnEsci) {
    btnEsci.addEventListener("click", () => timbra("USCITA"));
  }

  if (btnTogglePresenze && sezionePresenze) {
    btnTogglePresenze.addEventListener("click", async () => {
      const isHidden =
        sezionePresenze.style.display === "none" ||
        !sezionePresenze.style.display;
      sezionePresenze.style.display = isHidden ? "block" : "none";
      if (isHidden) {
        await caricaPresenze();
      }
    });
  }

  // --------------------------------------------------
  // 7. DIPENDENTI
  // --------------------------------------------------

  function calcolaCostoOrario(tipo, retribuzioneBase, oreMensili, oreServizio) {
    const base = parseNumber(retribuzioneBase);
    const oreM = parseNumber(oreMensili);
    const oreS = parseNumber(oreServizio);

    if (!base) return 0;

    if (tipo === "orario") {
      return base;
    } else if (tipo === "mensile") {
      if (!oreM) return 0;
      return base / oreM;
    } else if (tipo === "servizio") {
      if (!oreS) return 0;
      return base / oreS;
    }
    return 0;
  }

  function formatTipoCompenso(tipo) {
    switch (tipo) {
      case "orario":
        return "A ore";
      case "mensile":
        return "Mensile";
      case "servizio":
        return "Per servizio";
      default:
        return "";
    }
  }

  function aggiornaUICompenso() {
    if (!dipTipoCompenso || !labelRetribuzione) return;

    const tipo = dipTipoCompenso.value || "orario";

    if (tipo === "orario") {
      if (labelRetribuzione.firstChild) {
        labelRetribuzione.firstChild.textContent = "Paga oraria lorda (€/h)";
      }
      if (rowOreMensili) rowOreMensili.style.display = "none";
      if (rowOreServizio) rowOreServizio.style.display = "none";
    } else if (tipo === "mensile") {
      if (labelRetribuzione.firstChild) {
        labelRetribuzione.firstChild.textContent =
          "Stipendio lordo mensile (€/mese)";
      }
      if (rowOreMensili) rowOreMensili.style.display = "block";
      if (rowOreServizio) rowOreServizio.style.display = "none";
    } else if (tipo === "servizio") {
      if (labelRetribuzione.firstChild) {
        labelRetribuzione.firstChild.textContent =
          "Paga lorda per servizio (€/servizio)";
      }
      if (rowOreMensili) rowOreMensili.style.display = "none";
      if (rowOreServizio) rowOreServizio.style.display = "block";
    }

    const retribuzioneBaseVal =
      parseFloat(dipRetribuzioneBase?.value || "0") || 0;
    const oreMensiliVal = parseFloat(dipOreMensili?.value || "0") || 0;
    const oreServizioVal = parseFloat(dipOreServizio?.value || "0") || 0;

    const costo = calcolaCostoOrario(
      tipo,
      retribuzioneBaseVal,
      oreMensiliVal,
      oreServizioVal
    );
    if (dipCosto) {
      dipCosto.value = costo > 0 ? costo.toFixed(2) : "";
    }
  }

  if (dipTipoCompenso)
    dipTipoCompenso.addEventListener("change", aggiornaUICompenso);
  if (dipRetribuzioneBase)
    dipRetribuzioneBase.addEventListener("input", aggiornaUICompenso);
  if (dipOreMensili)
    dipOreMensili.addEventListener("input", aggiornaUICompenso);
  if (dipOreServizio)
    dipOreServizio.addEventListener("input", aggiornaUICompenso);

  async function caricaDipendentiDaSupabase() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("dipendenti")
      .select(
        "id, nome, mansione, data_nascita, residenza, telefono, email, ruolo, tipo_compenso, retribuzione_base, ore_mensili_contrattuali, ore_medie_per_servizio, costo_orario, codice, canale_prevalente, attivo"
      )
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento dipendenti:", error);
      alert("Errore nel caricare i dipendenti da Supabase");
      return;
    }

    dipendenti = (data || []).map((row) => ({
      id: row.id,
      nome: row.nome,
      mansione: row.mansione,
      dataNascita: row.data_nascita || null,
      residenza: row.residenza || "",
      telefono: row.telefono || "",
      email: row.email || "",
      ruolo: row.ruolo || "",
      tipoCompenso: row.tipo_compenso || "orario",
      retribuzioneBase: row.retribuzione_base ?? null,
      oreMensili: row.ore_mensili_contrattuali ?? null,
      oreServizio: row.ore_medie_per_servizio ?? null,
      costoOrario: row.costo_orario ?? 0,
      codice: row.codice || "",
      canalePrevalente: row.canale_prevalente || "NR",
      attivo: row.attivo !== false,
    }));

    renderDipendenti();
    applyRoleVisibility();
  }

  async function salvaDipendenteSupabase(dip) {
    if (!supabase) return null;

    const payload = {
      id: dip.id || undefined,
      nome: dip.nome,
      mansione: dip.mansione || null,
      data_nascita: dip.dataNascita || null,
      residenza: dip.residenza || null,
      telefono: dip.telefono || null,
      email: dip.email || null,
      ruolo: dip.ruolo || null,
      tipo_compenso: dip.tipoCompenso || "orario",
      retribuzione_base: dip.retribuzioneBase ?? null,
      ore_mensili_contrattuali: dip.oreMensili ?? null,
      ore_medie_per_servizio: dip.oreServizio ?? null,
      costo_orario: dip.costoOrario ?? null,
      codice: dip.codice || null,
      canale_prevalente: dip.canalePrevalente || null,
      attivo: dip.attivo,
    };

    const { data, error } = await supabase
      .from("dipendenti")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Errore salvataggio dipendente:", error);
      alert("Errore nel salvare il dipendente");
      return null;
    }

    dip.id = data.id;
    return dip;
  }

  async function eliminaDipendenteSupabase(dip) {
    if (!supabase || !dip.id) return;

    const { error } = await supabase
      .from("dipendenti")
      .delete()
      .eq("id", dip.id);

    if (error) {
      console.error("Errore eliminazione dipendente:", error);
      alert("Errore nell'eliminare il dipendente");
    }
  }

  function renderDipendenti() {
    if (!dipLista) return;
    dipLista.innerHTML = "";

    dipendenti.forEach((d, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.nome || ""}</td>
        <td>${d.mansione || ""}</td>
        <td>${d.dataNascita ? d.dataNascita.substring(0, 10) : ""}</td>
        <td>${d.residenza || ""}</td>
        <td>${d.telefono || ""}</td>
        <td>${d.email || ""}</td>
        <td>${d.ruolo || ""}</td>
        <td>${formatTipoCompenso(d.tipoCompenso)}</td>
        <td>${d.costoOrario ? d.costoOrario.toFixed(2) : ""}</td>
        <td>${d.canalePrevalente || ""}</td>
        <td>${d.codice || ""}</td>
        <td>${d.attivo ? "Sì" : "No"}</td>
        <td>
          <button type="button" class="app-button tiny" data-index="${index}" data-action="edit-dip">Mod</button>
          <button type="button" class="app-button tiny red" data-index="${index}" data-action="del-dip">X</button>
        </td>
      `;
      dipLista.appendChild(tr);
    });

    dipLista
      .querySelectorAll('button[data-action="edit-dip"]')
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-index") || "0", 10);
          caricaDipendenteInForm(idx);
        });
      });

    dipLista
      .querySelectorAll('button[data-action="del-dip"]')
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const idx = parseInt(btn.getAttribute("data-index") || "0", 10);
          const d = dipendenti[idx];
          if (!d) return;
          if (!confirm(`Eliminare il dipendente ${d.nome}?`)) return;
          await eliminaDipendenteSupabase(d);
          await caricaDipendentiDaSupabase();
        });
      });
  }

  function caricaDipendenteInForm(index) {
    const d = dipendenti[index];
    if (!d) return;

    if (dipNome) dipNome.value = d.nome || "";
    if (dipMansione) dipMansione.value = d.mansione || "";
    if (dipDataNascita)
      dipDataNascita.value = d.dataNascita
        ? d.dataNascita.substring(0, 10)
        : "";
    if (dipResidenza) dipResidenza.value = d.residenza || "";
    if (dipTelefono) dipTelefono.value = d.telefono || "";
    if (dipEmail) dipEmail.value = d.email || "";
    if (dipRuolo) dipRuolo.value = d.ruolo || "";

    if (dipTipoCompenso)
      dipTipoCompenso.value = d.tipoCompenso || "orario";
    if (dipRetribuzioneBase)
      dipRetribuzioneBase.value =
        d.retribuzioneBase != null ? d.retribuzioneBase : "";
    if (dipOreMensili)
      dipOreMensili.value = d.oreMensili != null ? d.oreMensili : "";
    if (dipOreServizio)
      dipOreServizio.value = d.oreServizio != null ? d.oreServizio : "";
    if (dipCosto)
      dipCosto.value =
        d.costoOrario != null && d.costoOrario > 0
          ? d.costoOrario.toFixed(2)
          : "";

    if (dipCodice) dipCodice.value = d.codice || "";
    if (dipCanale) dipCanale.value = d.canalePrevalente || "NR";
    if (dipAttivo) dipAttivo.checked = !!d.attivo;

    if (dipNome) dipNome.dataset.editIndex = index.toString();

    aggiornaUICompenso();
  }

  async function onSubmitDipendente() {
    const nome = (dipNome?.value || "").trim();
    if (!nome) {
      alert("Inserisci il nome del dipendente");
      return;
    }

    const mansione = dipMansione?.value || "";
    const dataNascita = dipDataNascita?.value || "";
    const residenza = dipResidenza?.value || "";
    const telefono = dipTelefono?.value || "";
    const email = dipEmail?.value || "";
    const ruolo = dipRuolo?.value || "";
    const tipoCompenso = dipTipoCompenso?.value || "orario";
    const retribuzioneBase = parseNumber(
      dipRetribuzioneBase?.value || ""
    );
    const oreMensili = parseNumber(dipOreMensili?.value || "");
    const oreServizio = parseNumber(dipOreServizio?.value || "");
    const costoOrario = parseNumber(dipCosto?.value || "");
    const codice = dipCodice?.value || "";
    const canalePrevalente = dipCanale?.value || "NR";
    const attivo = dipAttivo ? dipAttivo.checked : true;

    let index = -1;
    if (dipNome && dipNome.dataset.editIndex) {
      index = parseInt(dipNome.dataset.editIndex, 10);
    }

    const dip = {
      id: index >= 0 ? dipendenti[index].id : null,
      nome,
      mansione,
      dataNascita,
      residenza,
      telefono,
      email,
      ruolo,
      tipoCompenso,
      retribuzioneBase,
      oreMensili,
      oreServizio,
      costoOrario,
      codice,
      canalePrevalente,
      attivo,
    };

    const salvato = await salvaDipendenteSupabase(dip);
    if (!salvato) return;

    if (index >= 0) {
      dipendenti[index] = salvato;
    } else {
      dipendenti.push(salvato);
    }

    renderDipendenti();

    if (dipNome) {
      dipNome.value = "";
      dipNome.dataset.editIndex = "";
    }
    if (dipMansione) dipMansione.value = "";
    if (dipDataNascita) dipDataNascita.value = "";
    if (dipResidenza) dipResidenza.value = "";
    if (dipTelefono) dipTelefono.value = "";
    if (dipEmail) dipEmail.value = "";
    if (dipRuolo) dipRuolo.value = "cameriere";
    if (dipTipoCompenso) dipTipoCompenso.value = "orario";
    if (dipRetribuzioneBase) dipRetribuzioneBase.value = "";
    if (dipOreMensili) dipOreMensili.value = "";
    if (dipOreServizio) dipOreServizio.value = "";
    if (dipCosto) dipCosto.value = "";
    if (dipCodice) dipCodice.value = "";
    if (dipCanale) dipCanale.value = "NR";
    if (dipAttivo) dipAttivo.checked = true;

    aggiornaUICompenso();
  }

  if (btnAddDip) {
    btnAddDip.addEventListener("click", (e) => {
      e.preventDefault();
      onSubmitDipendente();
    });
  }

  // --------------------------------------------------
  // 8. ACQUISTI / FATTURE
  // --------------------------------------------------

  function resetFatturaForm() {
    fatturaCorrenteId = null;
    fatturaRighe = [];

    if (fatturaNumeroInput) fatturaNumeroInput.value = "";
    if (fatturaDataInput) setTodayOnDateInput(fatturaDataInput);
    if (fatturaFornitoreInput) fatturaFornitoreInput.value = "";
    if (fatturaNoteInput) fatturaNoteInput.value = "";
    if (fatturaRigheBody) fatturaRigheBody.innerHTML = "";
    aggiornaTotaliFattura();
  }

  function creaRigaFattura(initial = {}) {
    if (!fatturaRigheBody) return;

    const idx = fatturaRighe.length;
    const row = {
      id: initial.id || null,
      codice: initial.codice || "",
      descrizione: initial.descrizione || "",
      categoria: initial.categoria || "",
      um: initial.um || "",
      quantita: initial.quantita || 0,
      prezzo: initial.prezzo || 0,
      iva: initial.iva || 22,
      totale: initial.totale || 0,
    };

    fatturaRighe.push(row);

    const tr = document.createElement("tr");
    tr.dataset.index = String(idx);

    tr.innerHTML = `
      <td><input type="text" class="input-pill riga-codice" value="${row.codice}"/></td>
      <td><input type="text" class="input-pill riga-descrizione" value="${row.descrizione}"/></td>
      <td><input type="text" class="input-pill riga-categoria" value="${row.categoria}"/></td>
      <td><input type="text" class="input-pill riga-um" value="${row.um}"/></td>
      <td><input type="number" step="0.001" class="input-pill riga-quantita" value="${
        row.quantita || ""
      }"/></td>
      <td><input type="number" step="0.01" class="input-pill riga-prezzo" value="${
        row.prezzo || ""
      }"/></td>
      <td><input type="number" step="0.01" class="input-pill riga-iva" value="${
        row.iva || ""
      }"/></td>
      <td><input type="number" step="0.01" class="input-pill riga-totale" value="${
        row.totale || ""
      }" readonly/></td>
      <td>
        <button type="button" class="app-button tiny red btn-del-riga">✕</button>
      </td>
    `;

    fatturaRigheBody.appendChild(tr);

    const quantitaInput = tr.querySelector(".riga-quantita");
    const prezzoInput = tr.querySelector(".riga-prezzo");
    const ivaInput = tr.querySelector(".riga-iva");
    const codiceInput = tr.querySelector(".riga-codice");
    const descrizioneInput = tr.querySelector(".riga-descrizione");
    const categoriaInput = tr.querySelector(".riga-categoria");
    const umInput = tr.querySelector(".riga-um");
    const totaleInput = tr.querySelector(".riga-totale");
    const btnDel = tr.querySelector(".btn-del-riga");

    function updateFromInputs() {
      const index = parseInt(tr.dataset.index || "0", 10);
      const r = fatturaRighe[index];
      if (!r) return;

      r.codice = codiceInput.value;
      r.descrizione = descrizioneInput.value;
      r.categoria = categoriaInput.value;
      r.um = umInput.value;
      r.quantita = parseNumber(quantitaInput.value);
      r.prezzo = parseNumber(prezzoInput.value);
      r.iva = parseNumber(ivaInput.value);

      const imponibile = r.quantita * r.prezzo;
      const ivaVal = (imponibile * r.iva) / 100;
      const totale = imponibile + ivaVal;

      r.totale = totale;
      totaleInput.value = totale ? totale.toFixed(2) : "";

      aggiornaTotaliFattura();
    }

    if (quantitaInput) quantitaInput.addEventListener("input", updateFromInputs);
    if (prezzoInput) prezzoInput.addEventListener("input", updateFromInputs);
    if (ivaInput) ivaInput.addEventListener("input", updateFromInputs);
    if (codiceInput) codiceInput.addEventListener("input", updateFromInputs);
    if (descrizioneInput)
      descrizioneInput.addEventListener("input", updateFromInputs);
    if (categoriaInput)
      categoriaInput.addEventListener("input", updateFromInputs);
    if (umInput) umInput.addEventListener("input", updateFromInputs);

    if (btnDel) {
      btnDel.addEventListener("click", () => {
        const index = parseInt(tr.dataset.index || "0", 10);
        fatturaRighe.splice(index, 1);
        Array.from(fatturaRigheBody.children).forEach((rowEl, newIdx) => {
          rowEl.dataset.index = String(newIdx);
        });
        tr.remove();
        aggiornaTotaliFattura();
      });
    }
  }

  function aggiornaTotaliFattura() {
    let imponibileTot = 0;
    let ivaTot = 0;

    fatturaRighe.forEach((r) => {
      const imp = r.quantita * r.prezzo;
      const ivaVal = (imp * r.iva) / 100;
      imponibileTot += imp;
      ivaTot += ivaVal;
    });

    const totaleDoc = imponibileTot + ivaTot;

    if (fatturaImponibileTotaleInput)
      fatturaImponibileTotaleInput.value = imponibileTot
        ? imponibileTot.toFixed(2)
        : "";
    if (fatturaIvaTotaleInput)
      fatturaIvaTotaleInput.value = ivaTot ? ivaTot.toFixed(2) : "";
    if (fatturaTotaleDocumentoInput)
      fatturaTotaleDocumentoInput.value = totaleDoc
        ? totaleDoc.toFixed(2)
        : "";
  }

  async function salvaFatturaSupabase() {
    if (!supabase) {
      alert("Supabase non inizializzato");
      return;
    }

    const numero = fatturaNumeroInput?.value.trim() || "";
    const data = fatturaDataInput?.value || "";
    const fornitore = fatturaFornitoreInput?.value.trim() || "";
    const note = fatturaNoteInput?.value.trim() || "";

    if (!numero || !data || !fornitore) {
      alert("Compila numero, data e fornitore");
      return;
    }

    if (!fatturaRighe.length) {
      alert("Inserisci almeno una riga di fattura");
      return;
    }

    const imponibile = parseNumber(
      fatturaImponibileTotaleInput?.value || ""
    );
    const ivaVal = parseNumber(fatturaIvaTotaleInput?.value || "");
    const totale = parseNumber(
      fatturaTotaleDocumentoInput?.value || ""
    );

    const payloadTestata = {
      id: fatturaCorrenteId || undefined,
      numero,
      data,
      fornitore,
      note: note || null,
      totale_imponibile: imponibile,
      totale_iva: ivaVal,
      totale_documento: totale,
    };

    let fatturaId = fatturaCorrenteId;
    const { data: testataData, error: testataError } = await supabase
      .from("fatture_acquisti")
      .upsert(payloadTestata)
      .select("id")
      .single();

    if (testataError) {
      console.error("Errore salvataggio fattura:", testataError);
      alert("Errore nel salvataggio della fattura");
      return;
    }

    fatturaId = testataData.id;
    fatturaCorrenteId = fatturaId;

    await supabase
      .from("fatture_acquisti_righe")
      .delete()
      .eq("fattura_id", fatturaId);

    const righePayload = fatturaRighe.map((r) => ({
      fattura_id: fatturaId,
      codice: r.codice || null,
      descrizione: r.descrizione || null,
      categoria: r.categoria || null,
      um: r.um || null,
      quantita: r.quantita || 0,
      prezzo_unitario: r.prezzo || 0,
      iva_percentuale: r.iva || 0,
      totale_riga: r.totale || 0,
    }));

    const { error: righeError } = await supabase
      .from("fatture_acquisti_righe")
      .insert(righePayload);

    if (righeError) {
      console.error("Errore salvataggio righe fattura:", righeError);
      alert("Errore nel salvataggio delle righe fattura");
      return;
    }

    alert("Fattura salvata correttamente");
    await caricaElencoFatture();
  }

  async function caricaElencoFatture() {
    if (!supabase || !fattureLista) return;

    const { data, error } = await supabase
      .from("fatture_acquisti")
      .select("id, data, numero, fornitore, totale_documento")
      .order("data", { ascending: false });

    if (error) {
      console.error("Errore caricamento fatture:", error);
      return;
    }

    fattureLista.innerHTML = "";

    (data || []).forEach((f) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.data || ""}</td>
        <td>${f.numero || ""}</td>
        <td>${f.fornitore || ""}</td>
        <td>${formatEuro(f.totale_documento || 0)}</td>
        <td>
          <button type="button" class="app-button tiny" data-id="${
            f.id
          }">Apri</button>
        </td>
      `;
      fattureLista.appendChild(tr);
    });

    fattureLista.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (id) caricaDettaglioFattura(id);
      });
    });
  }

  async function caricaDettaglioFattura(id) {
    if (!supabase) return;

    const { data: fattura, error: errorFatt } = await supabase
      .from("fatture_acquisti")
      .select("*")
      .eq("id", id)
      .single();

    if (errorFatt || !fattura) {
      console.error("Errore caricamento fattura:", errorFatt);
      alert("Impossibile caricare la fattura");
      return;
    }

    const { data: righe, error: errorRighe } = await supabase
      .from("fatture_acquisti_righe")
      .select("*")
      .eq("fattura_id", id)
      .order("id", { ascending: true });

    if (errorRighe) {
      console.error("Errore caricamento righe fattura:", errorRighe);
      alert("Impossibile caricare le righe della fattura");
      return;
    }

    fatturaCorrenteId = id;

    if (fatturaNumeroInput) fatturaNumeroInput.value = fattura.numero || "";
    if (fatturaDataInput) fatturaDataInput.value = fattura.data || "";
    if (fatturaFornitoreInput)
      fatturaFornitoreInput.value = fattura.fornitore || "";
    if (fatturaNoteInput) fatturaNoteInput.value = fattura.note || "";

    if (fatturaImponibileTotaleInput)
      fatturaImponibileTotaleInput.value = formatNumber(
        fattura.totale_imponibile || 0
      );
    if (fatturaIvaTotaleInput)
      fatturaIvaTotaleInput.value = formatNumber(
        fattura.totale_iva || 0
      );
    if (fatturaTotaleDocumentoInput)
      fatturaTotaleDocumentoInput.value = formatNumber(
        fattura.totale_documento || 0
      );

    fatturaRighe = [];
    if (fatturaRigheBody) fatturaRigheBody.innerHTML = "";

    (righe || []).forEach((r) => {
      creaRigaFattura({
        id: r.id,
        codice: r.codice,
        descrizione: r.descrizione,
        categoria: r.categoria,
        um: r.um,
        quantita: r.quantita,
        prezzo: r.prezzo_unitario,
        iva: r.iva_percentuale,
        totale: r.totale_riga,
      });
    });

    aggiornaTotaliFattura();
  }

  if (btnNuovaFattura) {
    btnNuovaFattura.addEventListener("click", () => {
      resetFatturaForm();
    });
  }
  if (btnAddRigaFattura) {
    btnAddRigaFattura.addEventListener("click", () => {
      creaRigaFattura();
    });
  }
  if (btnSalvaFattura) {
    btnSalvaFattura.addEventListener("click", () => {
      salvaFatturaSupabase();
    });
  }
  if (btnToggleFatture && fattureTable) {
    btnToggleFatture.addEventListener("click", () => {
      const isHidden =
        fattureTable.style.display === "none" ||
        !fattureTable.style.display;
      fattureTable.style.display = isHidden ? "table" : "none";
    });
  }

  // --------------------------------------------------
  // 9. RICETTE
  // --------------------------------------------------

  function creaRigaIngrediente(initial = {}) {
    if (!ricettaIngredientiContainer) return;

    const row = document.createElement("div");
    row.className = "ricetta-ingrediente-row";

    row.innerHTML = `
      <input
        type="text"
        class="ingrediente-nome"
        placeholder="Ingrediente (come in magazzino)"
        style="flex: 2; min-width: 0;"
        list="ingredienti-suggestions"
        value="${initial.nome_prodotto || ""}"
      />
      <input
        type="number"
        class="ingrediente-quantita"
        placeholder="Q.tà"
        step="0.001"
        min="0"
        style="flex: 1; min-width: 0;"
        value="${initial.quantita != null ? initial.quantita : ""}"
      />
      <input
        type="text"
        class="ingrediente-unita"
        placeholder="g, kg, ml, u..."
        style="flex: 1; min-width: 0;"
        value="${initial.unita_misura || ""}"
      />
      <button type="button" class="app-button tiny red btn-del-ingrediente">
        ✕
      </button>
    `;

    const btnDel = row.querySelector(".btn-del-ingrediente");
    if (btnDel) {
      btnDel.addEventListener("click", () => {
        row.remove();
      });
    }

    ricettaIngredientiContainer.appendChild(row);
  }

  function resetFormRicetta() {
    ricettaCorrenteId = null;
    ricettaFotoCorrenteUrl = null;

    if (ricettaNomeInput) ricettaNomeInput.value = "";
    if (ricettaDescrizioneInput) ricettaDescrizioneInput.value = "";
    if (ricettaNoteInput) ricettaNoteInput.value = "";
    if (ricettaFotoInput) ricettaFotoInput.value = "";

    if (ricettaIngredientiContainer) {
      ricettaIngredientiContainer.innerHTML = "";
    }

    creaRigaIngrediente();
  }

  async function salvaRicettaSupabaseBase({
    id,
    nome,
    descrizione,
    note,
    fotoUrl,
  }) {
    if (!supabase) return null;

    const payload = {
      id: id || undefined,
      nome,
      descrizione: descrizione || null,
      note_procedimento: note || null,
      foto_url: fotoUrl || null,
      attivo: true,
    };

    const { data, error } = await supabase
      .from("ricette")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Errore salvataggio ricetta:", error);
      alert("Errore nel salvare la ricetta");
      return null;
    }

    return data;
  }

  async function salvaIngredientiPerRicetta(ricettaId, ingredienti) {
    if (!supabase) return;

    await supabase
      .from("ricetta_ingredienti")
      .delete()
      .eq("ricetta_id", ricettaId);

    if (!ingredienti.length) return;

    const payload = ingredienti.map((ing) => ({
      ricetta_id: ricettaId,
      prodotto_id: null,
      nome_prodotto: ing.nome,
      quantita: ing.quantita,
      unita_misura: ing.unita,
      note: null,
    }));

    const { error } = await supabase
      .from("ricetta_ingredienti")
      .insert(payload);

    if (error) {
      console.error("Errore salvataggio ingredienti:", error);
      alert("Errore nel salvare gli ingredienti della ricetta");
    }
  }

  async function uploadFotoRicettaSePresente() {
    if (!ricettaFotoInput || !ricettaFotoInput.files?.length) {
      return ricettaFotoCorrenteUrl || null;
    }

    const file = ricettaFotoInput.files[0];
    if (!file) return ricettaFotoCorrenteUrl || null;

    const estensione = file.name.includes(".")
      ? file.name.split(".").pop()
      : "jpg";
    const filePath = `ricetta_${Date.now()}.${estensione}`;

    const { error: uploadError } = await supabase.storage
      .from("ricette_foto")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Errore upload foto ricetta:", uploadError);
      alert("Errore nel caricare la foto della ricetta");
      return ricettaFotoCorrenteUrl || null;
    }

    const { data: publicData } = supabase.storage
      .from("ricette_foto")
      .getPublicUrl(filePath);

    return publicData?.publicUrl || ricettaFotoCorrenteUrl || null;
  }

  async function handleSalvaRicetta() {
    const nome = (ricettaNomeInput?.value || "").trim();
    const descrizione = (ricettaDescrizioneInput?.value || "").trim();
    const note = (ricettaNoteInput?.value || "").trim();

    if (!nome) {
      alert("Inserisci il nome della ricetta");
      return;
    }

    const ingredienti = [];
    if (ricettaIngredientiContainer) {
      const rows = Array.from(
        ricettaIngredientiContainer.querySelectorAll(
          ".ricetta-ingrediente-row"
        )
      );
      rows.forEach((row) => {
        const nomeEl = row.querySelector(".ingrediente-nome");
        const qtaEl = row.querySelector(".ingrediente-quantita");
        const unitaEl = row.querySelector(".ingrediente-unita");

        const nomeIng = (nomeEl?.value || "").trim();
        const qtaVal = parseFloat(qtaEl?.value || "0") || 0;
        const unitaVal = (unitaEl?.value || "").trim();

        if (nomeIng && qtaVal > 0 && unitaVal) {
          ingredienti.push({
            nome: nomeIng,
            quantita: qtaVal,
            unita: unitaVal,
          });
        }
      });
    }

    if (!ingredienti.length) {
      const conferma = confirm(
        "Non hai inserito ingredienti. Vuoi salvare comunque la ricetta solo con il procedimento?"
      );
      if (!conferma) return;
    }

    const fotoUrl = await uploadFotoRicettaSePresente();
    ricettaFotoCorrenteUrl = fotoUrl;

    const ricettaSalvata = await salvaRicettaSupabaseBase({
      id: ricettaCorrenteId,
      nome,
      descrizione,
      note,
      fotoUrl,
    });

    if (!ricettaSalvata) return;

    ricettaCorrenteId = ricettaSalvata.id;

    await salvaIngredientiPerRicetta(ricettaCorrenteId, ingredienti);

    alert("Ricetta salvata correttamente");
  }

  async function caricaSuggerimentiIngredienti() {
    if (!supabase || !ingredientiSuggestions) return;

    const { data, error } = await supabase
      .from("prodotti")
      .select("id, descrizione")
      .order("descrizione", { ascending: true });

    if (error) {
      console.error("Errore caricamento prodotti per suggerimenti:", error);
      return;
    }

    ingredientiSuggestions.innerHTML = "";
    (data || []).forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.descrizione || "";
      ingredientiSuggestions.appendChild(opt);
    });
  }

  if (btnAddIngrediente) {
    btnAddIngrediente.addEventListener("click", () => {
      creaRigaIngrediente();
    });
  }

  if (btnSalvaRicetta) {
    btnSalvaRicetta.addEventListener("click", () => {
      handleSalvaRicetta();
    });
  }

  // --------------------------------------------------
  // 10. MAGAZZINO
  // --------------------------------------------------

  async function caricaProdottiMagazzino() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("prodotti")
      .select("id, codice, descrizione, categoria, um, scorta_minima");

    if (error) {
      console.error("Errore caricamento prodotti magazzino:", error);
      return;
    }

    prodottiMagazzino = data || [];
    popolaSuggerimentiMagazzino();
  }

  function popolaSuggerimentiMagazzino() {
    if (!magazzinoSuggestions) return;
    magazzinoSuggestions.innerHTML = "";
    prodottiMagazzino.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.descrizione || "";
      magazzinoSuggestions.appendChild(opt);
    });
  }

  async function cercaProdottoMagazzino(term) {
    if (!supabase || !magazzinoLista || !magazzinoTable) return;

    const termLike = `%${term.toLowerCase()}%`;

    const { data, error } = await supabase.rpc(
      "magazzino_ricerca_prodotti",
      { term: termLike }
    );

    if (error) {
      console.error("Errore ricerca magazzino:", error);
      return;
    }

    magazzinoLista.innerHTML = "";

    (data || []).forEach((p) => {
      const tr = document.createElement("tr");
      const stock = p.giacenza_attuale ?? 0;
      const sottoScorta =
        p.scorta_minima != null && stock < p.scorta_minima;

      tr.innerHTML = `
        <td>${p.codice || ""}</td>
        <td>${p.descrizione || ""}</td>
        <td>${p.categoria || ""}</td>
        <td>
          ${stock.toFixed(3)}
          ${
            sottoScorta
              ? '<span class="magazzino-low">Sotto scorta</span>'
              : ""
          }
        </td>
      `;

      tr.addEventListener("click", () => {
        caricaProdottoInForm(p);
      });

      magazzinoLista.appendChild(tr);
    });

    magazzinoTable.style.display = (data || []).length ? "table" : "none";
  }

  function caricaProdottoInForm(p) {
    if (!magazzinoForm) return;

    if (magazzinoIdInput) magazzinoIdInput.value = p.id || "";
    if (magazzinoDescrizioneInput)
      magazzinoDescrizioneInput.value = p.descrizione || "";
    if (magazzinoCategoriaInput)
      magazzinoCategoriaInput.value = p.categoria || "";
    if (magazzinoUmInput) magazzinoUmInput.value = p.um || "";
    if (magazzinoScortaMinimaInput)
      magazzinoScortaMinimaInput.value =
        p.scorta_minima != null ? p.scorta_minima : "";
    if (magazzinoGiacenzaInput)
      magazzinoGiacenzaInput.value =
        p.giacenza_attuale != null ? p.giacenza_attuale : "";
  }

  async function salvaProdottoMagazzino() {
    if (!supabase) return;

    const id = magazzinoIdInput?.value || null;
    const descrizione = magazzinoDescrizioneInput?.value.trim() || "";
    const categoria = magazzinoCategoriaInput?.value.trim() || "";
    const um = magazzinoUmInput?.value.trim() || "";
    const scortaMinima = parseNumber(
      magazzinoScortaMinimaInput?.value || ""
    );

    if (!descrizione) {
      alert("Inserisci la descrizione del prodotto");
      return;
    }

    const payload = {
      id: id || undefined,
      descrizione,
      categoria: categoria || null,
      um: um || null,
      scorta_minima: scortaMinima || null,
    };

    const { error } = await supabase
      .from("prodotti")
      .upsert(payload);

    if (error) {
      console.error("Errore salvataggio prodotto magazzino:", error);
      alert("Errore nel salvataggio del prodotto");
      return;
    }

    alert("Prodotto salvato");
    await caricaProdottiMagazzino();
  }

  if (magazzinoSearchInput) {
    magazzinoSearchInput.addEventListener("input", (e) => {
      const term = e.target.value.trim();
      if (term.length >= 2) {
        cercaProdottoMagazzino(term);
      } else {
        if (magazzinoTable) magazzinoTable.style.display = "none";
      }
    });
  }

  if (btnMagazzinoNuovo) {
    btnMagazzinoNuovo.addEventListener("click", () => {
      if (magazzinoIdInput) magazzinoIdInput.value = "";
      if (magazzinoDescrizioneInput) magazzinoDescrizioneInput.value = "";
      if (magazzinoCategoriaInput) magazzinoCategoriaInput.value = "";
      if (magazzinoUmInput) magazzinoUmInput.value = "";
      if (magazzinoScortaMinimaInput)
        magazzinoScortaMinimaInput.value = "";
      if (magazzinoGiacenzaInput) magazzinoGiacenzaInput.value = "";
    });
  }

  if (btnMagazzinoSalva) {
    btnMagazzinoSalva.addEventListener("click", () => {
      salvaProdottoMagazzino();
    });
  }

  // --------------------------------------------------
  // 11. REPORT KPI / COSTI FISSI
  // --------------------------------------------------

  function caricaSommaCostiFissiLocal() {
    const saved = loadFromLocalStorage("ga_costi_fissi") || [];
    return saved.reduce(
      (sum, c) => sum + parseNumber(c.importoAnnuale),
      0
    );
  }

  function salvaCostiFissiLocal(costi) {
    saveToLocalStorage("ga_costi_fissi", costi);
  }

  function renderCostiFissiLocal() {
    const costi = loadFromLocalStorage("ga_costi_fissi") || [];
    if (!costiFissiLista) return;
    costiFissiLista.innerHTML = "";

    costi.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.categoria || ""}</td>
        <td>${c.descrizione || ""}</td>
        <td>${c.anno || ""}</td>
        <td>${formatEuro(c.importoAnnuale || 0)}</td>
      `;
      costiFissiLista.appendChild(tr);
    });
  }

  async function caricaCostiFissi() {
    renderCostiFissiLocal();
    aggiornaKpiDaInput();
  }

  function aggiornaKpiDaInput() {
    const incasso = parseNumber(kpiIncassoInput?.value || "");
    const food = parseNumber(kpiFoodCostInput?.value || "");
    const fissiAnnui = caricaSommaCostiFissiLocal();
    const giorniAnno = 365;
    const fissiPeriodo = fissiAnnui / giorniAnno;

    const lavoro = incasso * 0.3; // placeholder
    const netto = incasso - food - lavoro - fissiPeriodo;

    if (kpiIncassoValue) kpiIncassoValue.textContent = formatEuro(incasso);
    if (kpiNettoValue) kpiNettoValue.textContent = formatEuro(netto);

    if (kpiLavoroImporto) kpiLavoroImporto.textContent = formatEuro(lavoro);
    if (kpiFoodImporto) kpiFoodImporto.textContent = formatEuro(food);
    if (kpiFissiImporto)
      kpiFissiImporto.textContent = formatEuro(fissiPeriodo);

    const incassoPositivo = incasso > 0;
    if (incassoPositivo) {
      if (kpiLavoroPercent)
        kpiLavoroPercent.textContent =
          ((lavoro / incasso) * 100).toFixed(1) + "%";
      if (kpiFoodPercent)
        kpiFoodPercent.textContent =
          ((food / incasso) * 100).toFixed(1) + "%";
      if (kpiFissiPercent)
        kpiFissiPercent.textContent =
          ((fissiPeriodo / incasso) * 100).toFixed(1) + "%";
    } else {
      if (kpiLavoroPercent) kpiLavoroPercent.textContent = "0%";
      if (kpiFoodPercent) kpiFoodPercent.textContent = "0%";
      if (kpiFissiPercent) kpiFissiPercent.textContent = "0%";
    }

    if (kpiMargineBadge) {
      kpiMargineBadge.textContent = formatEuro(netto);
      kpiMargineBadge.classList.toggle("pos", netto >= 0);
      kpiMargineBadge.classList.toggle("neg", netto < 0);
    }

    const marginePerc = incassoPositivo ? (netto / incasso) * 100 : 0;
    const angle = Math.min(90, Math.max(-90, marginePerc));
    if (kpiGaugeNeedle) {
      kpiGaugeNeedle.style.transform = `rotate(${angle}deg)`;
    }

    const bep = food + lavoro + fissiPeriodo;
    if (kpiBepLabel) {
      kpiBepLabel.textContent = `BEP ${formatEuro(bep)}`;
    }
  }

  if (kpiIncassoInput)
    kpiIncassoInput.addEventListener("input", aggiornaKpiDaInput);
  if (kpiFoodCostInput)
    kpiFoodCostInput.addEventListener("input", aggiornaKpiDaInput);

  reportPeriodButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      reportPeriodButtons.forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
      aggiornaKpiDaInput();
    });
  });

  if (btnToggleCostiFissi && costiFissiPanel) {
    btnToggleCostiFissi.addEventListener("click", () => {
      const isHidden =
        costiFissiPanel.style.display === "none" ||
        !costiFissiPanel.style.display;
      costiFissiPanel.style.display = isHidden ? "block" : "none";
    });
  }

  if (btnSalvaCostoFisso) {
    btnSalvaCostoFisso.addEventListener("click", () => {
      const categoria = costiFissiCategoria?.value.trim() || "";
      const descrizione = costiFissiDescrizione?.value.trim() || "";
      const anno = costiFissiAnno?.value || "";
      const importo = parseNumber(costiFissiImporto?.value || "");

      if (!categoria || !anno || !importo) {
        alert("Compila categoria, anno e importo annuo");
        return;
      }

      const costi = loadFromLocalStorage("ga_costi_fissi") || [];
      costi.push({
        categoria,
        descrizione,
        anno,
        importoAnnuale: importo,
      });
      salvaCostiFissiLocal(costi);

      if (costiFissiCategoria) costiFissiCategoria.value = "";
      if (costiFissiDescrizione) costiFissiDescrizione.value = "";
      if (costiFissiAnno) costiFissiAnno.value = "";
      if (costiFissiImporto) costiFissiImporto.value = "";

      renderCostiFissiLocal();
      aggiornaKpiDaInput();
    });
  }
});
