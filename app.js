// app.js
document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;

  const CURRENT_USER_KEY = "ga_current_user_v1";
  const THEME_KEY = "ga_theme_v1";

  // ---------- DOM COMMON / ROUTING ----------
  const views = Array.from(document.querySelectorAll(".view"));
  const loginView = document.getElementById("view-login");
  const homeDipView = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");
  const routeButtons = Array.from(document.querySelectorAll("[data-route]"));

  // header
  const btnTheme = document.getElementById("btn-theme");
  const currentUserLabel = document.getElementById("current-user-label");
  const btnLogout = document.getElementById("btn-logout");

  // login
  const loginNomeInput = document.getElementById("login-nome");
  const loginPinInput = document.getElementById("login-pin");
  const loginRememberInput = document.getElementById("login-remember");
  const btnLogin = document.getElementById("btn-login");

  // timbratura
  const timbUtenteNomeEl = document.getElementById("timbratura-utente-nome");
  const timbCanaleSelect = document.getElementById("timbratura-canale-select");
  const btnEntra = document.getElementById("btn-entra");
  const btnPausa = document.getElementById("btn-pausa");
  const btnEsci = document.getElementById("btn-esci");

  const periodoSelect = document.getElementById("timbratura-periodo");
  const lista = document.getElementById("timbratura-lista");
  const riepilogoDipEl = document.getElementById("riepilogo-dipendenti");
  const riepilogoCanaliEl = document.getElementById("riepilogo-canali");
  const costoDipEl = document.getElementById("costo-dipendenti");
  const costoCanaliEl = document.getElementById("costo-canali");
  const attiviListaEl = document.getElementById("attivi-lista");

  const btnToggleTimbrature = document.getElementById("btn-toggle-timbrature");
  const sezioneTimbratureDettaglio = document.getElementById(
    "sezione-timbrature-dettaglio"
  );

  // presenze (stato dipendenti) - solo manager/admin
  const presenzeListaEl = document.getElementById("presenze-lista");
  const btnTogglePresenze = document.getElementById("btn-toggle-presenze");
  const sezionePresenzeEl = document.getElementById("sezione-presenze");

  // anagrafica dipendenti
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
  const rowOreMensili = document.getElementById("row-ore-mensili");
  const rowOreServizio = document.getElementById("row-ore-servizio");
  const labelRetribuzione = document.getElementById("label-retribuzione-base");

  const dipCodice = document.getElementById("dip-codice");
  const dipCanale = document.getElementById("dip-canale");
  const dipAttivo = document.getElementById("dip-attivo");
  const btnAddDip = document.getElementById("btn-add-dip");
  const dipLista = document.getElementById("dipendenti-lista");

  // ---------- RICETTE (DOM) ----------
  const ricettaNomeInput = document.getElementById("ricetta-nome");
  const ricettaDescrizioneInput = document.getElementById("ricetta-descrizione");
  const ricettaNoteInput = document.getElementById("ricetta-note");
  const ricettaFotoInput = document.getElementById("ricetta-foto");
  const ricettaIngredientiContainer = document.getElementById(
    "ricetta-ingredienti-container"
  );
  const btnAddIngrediente = document.getElementById("btn-add-ingrediente");
  const btnSalvaRicetta = document.getElementById("btn-salva-ricetta");

  // ---------- ACQUISTI / FATTURE (DOM) ----------
  const fatturaNumeroInput = document.getElementById("fattura-numero");
  const fatturaDataInput = document.getElementById("fattura-data");
  const fatturaFornitoreInput = document.getElementById("fattura-fornitore");
  const fatturaNoteInput = document.getElementById("fattura-note");
  const btnNuovaFattura = document.getElementById("btn-nuova-fattura");
  const btnSalvaFattura = document.getElementById("btn-salva-fattura");
  const fatturaRigheBody = document.getElementById("fattura-righe-body");
  const btnAddRigaFattura = document.getElementById("btn-add-riga-fattura");
  const fatturaImponibileTotaleInput = document.getElementById(
    "fattura-imponibile-totale"
  );
  const fatturaIvaTotaleInput = document.getElementById("fattura-iva-totale");
  const fatturaTotaleDocumentoInput = document.getElementById(
    "fattura-totale-documento"
  );
  const fattureListaBody = document.getElementById("fatture-lista");
  const fattureTable = document.getElementById("fatture-table");
  const btnToggleFatture = document.getElementById("btn-toggle-fatture");

  // ---------- MAGAZZINO (DOM) ----------
  const magazzinoSearchInput = document.getElementById("magazzino-search");
  const magazzinoListaEl = document.getElementById("magazzino-lista");
  const magazzinoSuggestions = document.getElementById("magazzino-suggestions");
  const magazzinoTable = document.getElementById("magazzino-table");

  const magazzinoForm = document.getElementById("magazzino-form");
  const magazzinoIdInput = document.getElementById("magazzino-id");
  const magazzinoDescrInput = document.getElementById("magazzino-descrizione");
  const magazzinoCategoriaInput = document.getElementById("magazzino-categoria");
  const magazzinoUmInput = document.getElementById("magazzino-um");
  const magazzinoScortaMinimaInput = document.getElementById(
    "magazzino-scorta-minima"
  );
  const magazzinoGiacenzaInput = document.getElementById("magazzino-giacenza");
  const btnMagazzinoSalva = document.getElementById("btn-magazzino-salva");
  const btnMagazzinoNuovo = document.getElementById("btn-magazzino-nuovo");

  // datalist ingredienti per ricette (autocomplete da magazzino)
  const ingredientiSuggestions = document.getElementById(
    "ingredienti-suggestions"
  );

  // ---------- REPORT / KPI (DOM) ----------
  const kpiPeriodoSelect = document.getElementById("kpi-periodo");
  const kpiCostiFissiEl = document.getElementById("kpi-costi-fissi");
  const kpiCostoLavoroEl = document.getElementById("kpi-costo-lavoro");
  const kpiFoodCostEl = document.getElementById("kpi-food-cost");
  const kpiMargineEl = document.getElementById("kpi-margine");

  const costiFissiForm = document.getElementById("costi-fissi-form");
  const costiFissiCategoriaInput = document.getElementById(
    "costi-fissi-categoria"
  );
  const costiFissiDescrizioneInput = document.getElementById(
    "costi-fissi-descrizione"
  );
  const costiFissiAnnoInput = document.getElementById("costi-fissi-anno");
  const costiFissiImportoInput = document.getElementById("costi-fissi-importo");
  const costiFissiListaBody = document.getElementById("costi-fissi-lista");
  const btnCostiFissiSalva = document.getElementById("btn-costi-fissi-salva");

  // ---------- STATO ----------
  let dipendenti = [];
  let timbrature = [];
  let currentUser = null;
  let periodoCorrente = "oggi";

  let ricettaCorrenteId = null;
  let ricettaFotoCorrenteUrl = null;

  let currentFatturaId = null;
  let fornitoriCache = [];
  let categorieCache = [];
  let magazzinoDati = [];

  // KPI / costi fissi
  let costiFissi = [];
  let kpiPeriodoCorrente = "day"; // day | week | month | year

  // ========= UTILITY GENERALI =========
  function parseNumber(val) {
    if (val == null) return 0;
    const str = String(val).replace(",", ".");
    const n = parseFloat(str);
    return Number.isNaN(n) ? 0 : n;
  }

  function formatDateInputToday(input) {
    if (!input) return;
    const oggi = new Date();
    const yyyy = oggi.getFullYear();
    const mm = String(oggi.getMonth() + 1).padStart(2, "0");
    const dd = String(oggi.getDate()).padStart(2, "0");
    input.value = `${yyyy}-${mm}-${dd}`;
  }

  // ========= GENERATORE CODICE INTERNO PRODOTTO =========
  function slugCategoria(nomeCategoria) {
    if (!nomeCategoria) return "GEN";

    let base = nomeCategoria.trim().split(/\s+/)[0].toUpperCase();
    base = base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "");

    if (base.length >= 3) return base.slice(0, 3);
    if (base.length === 2) return base + "X";
    if (base.length === 1) return base + "XX";
    return "GEN";
  }

  async function generaCodiceInternoAutomatico(nomeCategoria) {
    const prefix = slugCategoria(nomeCategoria);

    const { data, error } = await supabase
      .from("prodotti")
      .select("codice_interno")
      .ilike("codice_interno", `${prefix}-%`)
      .order("codice_interno", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Errore lettura ultimo codice prodotto:", error);
      alert("Errore Supabase (lettura codice prodotto): " + error.message);
      return `${prefix}-0001`;
    }

    if (!data || data.length === 0) {
      return `${prefix}-0001`;
    }

    const ultimo = data[0].codice_interno || "";
    const match = ultimo.match(/-(\d+)$/);
    const lastNum = match ? parseInt(match[1], 10) : 0;
    const nextNum = Number.isNaN(lastNum) ? 1 : lastNum + 1;

    return `${prefix}-${String(nextNum).padStart(4, "0")}`;
  }

  // ========= KPI / PERIODI =========
  function getDateRangeForKpi(periodo) {
    const now = new Date();
    const end = now.getTime();

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (periodo) {
      case "day":
        break; // oggi
      case "week": {
        const day = start.getDay() || 7; // lun=1..dom=7
        start.setDate(start.getDate() - (day - 1));
        break;
      }
      case "month":
        start.setDate(1);
        break;
      case "year":
        start.setMonth(0, 1);
        break;
      default:
        break;
    }

    return { startMs: start.getTime(), endMs: end };
  }

  // ========= TEMA CHIARO/SCURO =========
  function applyTheme(theme) {
    const body = document.body;
    if (theme === "light") {
      body.classList.add("theme-light");
      if (btnTheme) btnTheme.textContent = "☀️";
    } else {
      body.classList.remove("theme-light");
      if (btnTheme) btnTheme.textContent = "🌙";
    }
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved === "light" ? "light" : "dark";
    applyTheme(theme);
  }

  function toggleTheme() {
    const isLight = document.body.classList.contains("theme-light");
    const next = isLight ? "dark" : "light";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  if (btnTheme) {
    btnTheme.addEventListener("click", toggleTheme);
  }
  loadTheme();

  // ========= RUOLI / FORMATI =========
  function isManagerRole(ruolo) {
    return (
      ruolo === "admin" ||
      ruolo === "manager_cucina" ||
      ruolo === "manager_sala"
    );
  }

  function formatRuolo(ruolo) {
    switch (ruolo) {
      case "admin":
        return "Admin";
      case "manager_cucina":
        return "Manager cucina";
      case "manager_sala":
        return "Manager sala";
      case "addetto_cucina":
        return "Addetto cucina";
      case "cameriere":
        return "Cameriere";
      default:
        return "";
    }
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

  function formatDataNascita(dataNascita) {
    if (!dataNascita) return "";
    const d = new Date(dataNascita);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("it-IT");
  }

  function calcolaCostoOrario(tipo, retribuzioneBase, oreMensili, oreServizio) {
    if (!retribuzioneBase || retribuzioneBase <= 0) return 0;

    if (tipo === "orario") return retribuzioneBase;

    if (tipo === "mensile") {
      if (!oreMensili || oreMensili <= 0) return 0;
      return retribuzioneBase / oreMensili;
    }

    if (tipo === "servizio") {
      if (!oreServizio || oreServizio <= 0) return 0;
      return retribuzioneBase / oreServizio;
    }

    return 0;
  }

  // ========= HEADER & VISIBILITÀ =========
  function updateHeaderUser() {
    if (!currentUserLabel) return;

    if (!currentUser) {
      currentUserLabel.textContent = "Nessun utente";
    } else {
      const ruoloLabel = formatRuolo(currentUser.ruolo) || "Dipendente";
      currentUserLabel.textContent = `${currentUser.nome} (${ruoloLabel})`;
    }

    if (btnLogout) {
      btnLogout.style.display = currentUser ? "inline-block" : "none";
    }
  }

  function applyRoleVisibility() {
    const modalita =
      currentUser && isManagerRole(currentUser.ruolo)
        ? "manager"
        : "dipendente";

    document
      .querySelectorAll("[data-manager-only='true'], .manager-only")
      .forEach((el) => {
        el.style.display = modalita === "manager" ? "" : "none";
      });

    routeButtons.forEach((btn) => {
      const managerOnly = btn.getAttribute("data-manager-only") === "true";
      if (managerOnly && modalita !== "manager") {
        btn.style.display = "none";
      } else {
        btn.style.display = "";
      }
    });

    if (managerMenu) {
      managerMenu.style.display = modalita === "manager" ? "grid" : "none";
    }

    updateHeaderUser();
    updateTimbraturaUserInfo();
  }

  function showOnlyView(viewId) {
    views.forEach((v) => {
      v.style.display = v.id === viewId ? "block" : "none";
    });
  }

  function showLogin() {
    if (homeDipView) homeDipView.style.display = "none";
    if (managerMenu) managerMenu.style.display = "none";
    showOnlyView("view-login");
    currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    updateHeaderUser();
  }

  function showHomeDipendente() {
    if (managerMenu) managerMenu.style.display = "none";
    showOnlyView("view-home-dip");
    applyRoleVisibility();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showManagerMenuAndRoute(initialRoute) {
    if (managerMenu) managerMenu.style.display = "grid";
    showOnlyView(`view-${initialRoute || "timbratura"}`);
    applyRoleVisibility();
    navigateTo(initialRoute || "timbratura");
  }

  function setCurrentUser(user, persist) {
    currentUser = {
      id: user.id ?? null,
      nome: user.nome,
      ruolo: user.ruolo || "",
      canalePrevalente: user.canalePrevalente || "NR",
      virtualAdmin: !!user.virtualAdmin,
    };

    if (persist) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }

    updateHeaderUser();
    applyRoleVisibility();
  }

  function restoreUserFromStorage() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved) return;

      if (saved.virtualAdmin) {
        currentUser = saved;
        applyRoleVisibility();
        return;
      }

      const found = dipendenti.find((d) => d.id === saved.id);
      if (found) {
        setCurrentUser(found, true);
        return;
      }

      const byName = dipendenti.find(
        (d) =>
          d.nome &&
          d.nome.toLowerCase() === String(saved.nome || "").toLowerCase()
      );
      if (byName) {
        setCurrentUser(byName, true);
        return;
      }
    } catch {
      // ignora
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      showLogin();
    });
  }

  // ========= DIPENDENTI =========
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

    const retribuzioneBase =
      parseFloat(dipRetribuzioneBase?.value || "0") || 0;
    const oreMensiliVal = parseFloat(dipOreMensili?.value || "0") || 0;
    const oreServizioVal = parseFloat(dipOreServizio?.value || "0") || 0;

    const costo = calcolaCostoOrario(
      tipo,
      retribuzioneBase,
      oreMensiliVal,
      oreServizioVal
    );
    if (dipCosto) {
      dipCosto.value = costo > 0 ? costo.toFixed(2) : "";
    }
  }

  if (dipTipoCompenso) {
    dipTipoCompenso.addEventListener("change", aggiornaUICompenso);
  }
  if (dipRetribuzioneBase) {
    dipRetribuzioneBase.addEventListener("input", aggiornaUICompenso);
  }
  if (dipOreMensili) {
    dipOreMensili.addEventListener("input", aggiornaUICompenso);
  }
  if (dipOreServizio) {
    dipOreServizio.addEventListener("input", aggiornaUICompenso);
  }

  async function caricaDipendentiDaSupabase() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("dipendenti")
      .select("*")
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
      mansione: dip.mansione,
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

    const { error } = await supabase.from("dipendenti").delete().eq("id", dip.id);

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
        <td>${d.nome}</td>
        <td>${d.mansione || ""}</td>
        <td>${formatDataNascita(d.dataNascita)}</td>
        <td>${d.residenza || ""}</td>
        <td>${d.telefono || ""}</td>
        <td>${d.email || ""}</td>
        <td>${formatRuolo(d.ruolo)}</td>
        <td>${formatTipoCompenso(d.tipoCompenso)}</td>
        <td>${d.costoOrario ? d.costoOrario.toFixed(2) : ""}</td>
        <td>${d.canalePrevalente || ""}</td>
        <td>${d.codice || ""}</td>
        <td>${d.attivo ? "Sì" : "No"}</td>
        <td>
          <button data-edit="${index}" class="app-button small gray">Modifica</button>
          <button data-delete="${index}" class="app-button small red">Elimina</button>
        </td>
      `;

      dipLista.appendChild(tr);
    });

    dipLista.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-edit"), 10);
        caricaDipendenteInForm(idx);
      });
    });

    dipLista.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.getAttribute("data-delete"), 10);
        if (confirm("Eliminare questo dipendente?")) {
          const dip = dipendenti[idx];
          await eliminaDipendenteSupabase(dip);
          await caricaDipendentiDaSupabase();
        }
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

    if (dipTipoCompenso) dipTipoCompenso.value = d.tipoCompenso || "orario";
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

  if (btnAddDip) {
    btnAddDip.addEventListener("click", async () => {
      const nome = (dipNome?.value || "").trim();
      if (!nome) {
        alert("Inserisci il nome del dipendente");
        return;
      }

      const mansione = (dipMansione?.value || "").trim();
      const dataNascitaVal = dipDataNascita?.value || "";
      const residenza = (dipResidenza?.value || "").trim();
      const telefono = (dipTelefono?.value || "").trim();
      const email = (dipEmail?.value || "").trim();
      const ruolo = dipRuolo?.value || "";

      const tipoCompenso = dipTipoCompenso?.value || "orario";
      const retribuzioneBase =
        parseFloat(dipRetribuzioneBase?.value || "0") || 0;
      const oreMensiliVal = parseFloat(dipOreMensili?.value || "0") || 0;
      const oreServizioVal = parseFloat(dipOreServizio?.value || "0") || 0;

      const costoOrario = calcolaCostoOrario(
        tipoCompenso,
        retribuzioneBase,
        oreMensiliVal,
        oreServizioVal
      );
      if (dipCosto) {
        dipCosto.value = costoOrario ? costoOrario.toFixed(2) : "";
      }

      const codice = (dipCodice?.value || "").trim();
      const canalePrevalente = dipCanale?.value || "NR";
      const attivo = dipAttivo ? dipAttivo.checked : true;

      const editIndex = dipNome?.dataset.editIndex;
      let dipObj = {
        nome,
        mansione,
        dataNascita: dataNascitaVal || null,
        residenza,
        telefono,
        email,
        ruolo,
        tipoCompenso,
        retribuzioneBase: retribuzioneBase || null,
        oreMensili: oreMensiliVal || null,
        oreServizio: oreServizioVal || null,
        costoOrario: costoOrario || null,
        codice,
        canalePrevalente,
        attivo,
      };

      if (editIndex !== undefined && editIndex !== "") {
        const idx = parseInt(editIndex, 10);
        dipObj.id = dipendenti[idx].id;
        dipendenti[idx] = dipObj;
        delete dipNome.dataset.editIndex;
      } else {
        dipendenti.push(dipObj);
      }

      const salvato = await salvaDipendenteSupabase(dipObj);
      if (!salvato) return;

      // reset form
      if (dipNome) dipNome.value = "";
      if (dipMansione) dipMansione.value = "";
      if (dipDataNascita) dipDataNascita.value = "";
      if (dipResidenza) dipResidenza.value = "";
      if (dipTelefono) dipTelefono.value = "";
      if (dipEmail) dipEmail.value = "";
      if (dipRuolo) dipRuolo.value = "";
      if (dipTipoCompenso) dipTipoCompenso.value = "orario";
      if (dipRetribuzioneBase) dipRetribuzioneBase.value = "";
      if (dipOreMensili) dipOreMensili.value = "";
      if (dipOreServizio) dipOreServizio.value = "";
      if (dipCosto) dipCosto.value = "";
      if (dipCodice) dipCodice.value = "";
      if (dipCanale) dipCanale.value = "NR";
      if (dipAttivo) dipAttivo.checked = true;
      if (dipNome) delete dipNome.dataset.editIndex;

      aggiornaUICompenso();
      await caricaDipendentiDaSupabase();
      applyRoleVisibility();
    });
  }

  // ========= LOGIN & UTENTE CORRENTE =========
  function updateTimbraturaUserInfo() {
    if (!currentUser) {
      if (timbUtenteNomeEl) timbUtenteNomeEl.textContent = "-";
      if (timbCanaleSelect) timbCanaleSelect.value = "NR";
      return;
    }

    if (timbUtenteNomeEl) timbUtenteNomeEl.textContent = currentUser.nome;

    const defaultCanale = currentUser.canalePrevalente || "NR";
    if (timbCanaleSelect) {
      timbCanaleSelect.value = defaultCanale;
    }
  }

  if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
      const nome = (loginNomeInput?.value || "").trim();
      const pin = (loginPinInput?.value || "").trim();
      const remember = loginRememberInput?.checked || false;

      if (!nome) {
        alert("Inserisci il nome");
        return;
      }
      if (!pin) {
        alert("Inserisci il PIN");
        return;
      }

      if (dipendenti.length === 0) {
        await caricaDipendentiDaSupabase();
      }

      // admin virtuale
      if (nome.toLowerCase() === "admin" && pin === "9999") {
        setCurrentUser(
          {
            id: null,
            nome: "Admin",
            ruolo: "admin",
            canalePrevalente: "NR",
            virtualAdmin: true,
          },
          remember
        );
        if (loginView) loginView.style.display = "none";
        showManagerMenuAndRoute("timbratura");
        return;
      }

      const dip = dipendenti.find(
        (d) =>
          d.attivo &&
          d.nome &&
          d.nome.toLowerCase() === nome.toLowerCase() &&
          d.codice &&
          d.codice.toString() === pin.toString()
      );

      if (!dip) {
        alert("Nome o PIN non corretti");
        return;
      }

      setCurrentUser(dip, remember);
      if (loginView) loginView.style.display = "none";

      if (isManagerRole(dip.ruolo)) {
        showManagerMenuAndRoute("timbratura");
      } else {
        showHomeDipendente();
      }
    });
  }

  // ========= TIMBRATURE =========
  async function caricaTimbratureDaSupabase() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("timbrature")
      .select("*")
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Errore caricamento timbrature:", error);
      alert("Errore nel caricare le timbrature da Supabase");
      return;
    }

    timbrature = (data || []).map((row) => ({
      id: row.id,
      dipendente_id: row.dipendente_id || null,
      dip: row.dip_nome,
      canale: row.canale,
      tipo: row.tipo,
      ora: row.ora,
      timestamp: row.timestamp ? new Date(row.timestamp).getTime() : null,
    }));

    aggiornaTabellaTimbrature();
    aggiornaRiepilogo();
  }

  function formatDurationMinutes(totalMinutes) {
    const ore = Math.floor(totalMinutes / 60);
    const min = Math.round(totalMinutes % 60);
    return `${ore}h ${min.toString().padStart(2, "0")}m`;
  }

  function aggiornaTabellaTimbrature() {
    if (!lista) return;
    lista.innerHTML = "";

    timbrature.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.ora || ""}</td>
        <td>${t.dip}</td>
        <td>${t.canale}</td>
        <td>${t.tipo}</td>
      `;
      lista.appendChild(tr);
    });
  }

  // stato entrata/uscita per dipendente
  function getStatoCorrenteDipendente(nomeDip) {
    const eventiDip = timbrature
      .filter((t) => t.dip === nomeDip && t.timestamp)
      .sort((a, b) => a.timestamp - b.timestamp);

    let inside = false;
    let canaleCorrente = null;

    for (const ev of eventiDip) {
      if (ev.tipo === "Entrata") {
        inside = true;
        canaleCorrente = ev.canale;
      } else if (ev.tipo === "Uscita") {
        inside = false;
        canaleCorrente = null;
      }
    }

    return { inside, canaleCorrente };
  }

  // tabella presenze (chi è dentro / fuori)
  function aggiornaPresenzeDipendenti() {
    if (!presenzeListaEl) return;

    presenzeListaEl.innerHTML = "";

    dipendenti.forEach((d) => {
      if (!d || !d.nome) return;
      const stato = getStatoCorrenteDipendente(d.nome);
      const inside = stato.inside;
      const canale = inside ? stato.canaleCorrente || "-" : "-";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.nome}</td>
        <td>${canale}</td>
        <td>${inside ? "Dentro" : "Fuori"}</td>
      `;
      presenzeListaEl.appendChild(tr);
    });
  }

  function aggiornaRiepilogo() {
    if (
      !riepilogoDipEl ||
      !riepilogoCanaliEl ||
      !attiviListaEl ||
      !costoDipEl ||
      !costoCanaliEl
    )
      return;

    const perDip = {};
    const perCanale = {};

    const adessoDate = new Date();
    const adesso = adessoDate.getTime();

    const startGiorno = new Date(adessoDate);
    startGiorno.setHours(0, 0, 0, 0);

    const startSettimana = new Date(startGiorno);
    const day = startSettimana.getDay() || 7;
    startSettimana.setDate(startSettimana.getDate() - (day - 1));

    const startMese = new Date(
      adessoDate.getFullYear(),
      adessoDate.getMonth(),
      1
    );
    startMese.setHours(0, 0, 0, 0);

    let startPeriodoMs = startGiorno.getTime();
    if (periodoCorrente === "settimana") startPeriodoMs = startSettimana.getTime();
    if (periodoCorrente === "mese") startPeriodoMs = startMese.getTime();

    const eventiPeriodo = timbrature.filter((t) => {
      if (!t.timestamp) return false;
      const ts = t.timestamp;
      return ts >= startPeriodoMs && ts <= adesso;
    });

    const eventsByKey = {};
    eventiPeriodo.forEach((t) => {
      const key = `${t.dip}|${t.canale}`;
      if (!eventsByKey[key]) eventsByKey[key] = [];
      eventsByKey[key].push(t);
    });

    Object.entries(eventsByKey).forEach(([key, events]) => {
      const [dip, canale] = key.split("|");
      events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      let aperto = null;

      events.forEach((ev) => {
        if (!ev.timestamp) return;

        if (ev.tipo === "Entrata") {
          aperto = ev;
        } else if (ev.tipo === "Uscita") {
          if (aperto && aperto.timestamp) {
            const diffMin = (ev.timestamp - aperto.timestamp) / 60000;
            if (diffMin > 0) {
              perDip[key] = (perDip[key] || 0) + diffMin;
              perCanale[canale] = (perCanale[canale] || 0) + diffMin;
            }
          }
          aperto = null;
        }
      });

      if (aperto && aperto.timestamp) {
        const diffMin = (adesso - aperto.timestamp) / 60000;
        if (diffMin > 0) {
          perDip[key] = (perDip[key] || 0) + diffMin;
          perCanale[canale] = (perCanale[canale] || 0) + diffMin;
        }
      }
    });

    const costoPerDip = {};
    const costoPerCanale = {};

    Object.entries(perDip).forEach(([key, minuti]) => {
      const [nome, canale] = key.split("|");
      const dip = dipendenti.find((d) => d.nome === nome);
      const costoOrario = dip?.costoOrario || 0;
      const ore = minuti / 60;
      const costo = ore * costoOrario;
      costoPerDip[key] = costo;
      costoPerCanale[canale] = (costoPerCanale[canale] || 0) + costo;
    });

    riepilogoDipEl.innerHTML = "";
    Object.entries(perDip).forEach(([key, minuti]) => {
      const [nome, canale] = key.split("|");
      const ore = minuti / 60;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${nome}</td>
        <td>${canale}</td>
        <td>${ore.toFixed(2)}</td>
      `;
      riepilogoDipEl.appendChild(tr);
    });

    riepilogoCanaliEl.innerHTML = "";
    Object.entries(perCanale).forEach(([canale, minuti]) => {
      const ore = minuti / 60;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${canale}</td>
        <td>${ore.toFixed(2)}</td>
      `;
      riepilogoCanaliEl.appendChild(tr);
    });

    costoDipEl.innerHTML = "";
    Object.entries(perDip).forEach(([key, minuti]) => {
      const [nome, canale] = key.split("|");
      const ore = minuti / 60;
      const costo = costoPerDip[key] || 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${nome}</td>
        <td>${canale}</td>
        <td>${ore.toFixed(2)}</td>
        <td>${costo.toFixed(2)}</td>
      `;
      costoDipEl.appendChild(tr);
    });

    costoCanaliEl.innerHTML = "";
    Object.entries(costoPerCanale).forEach(([canale, costo]) => {
      const minuti = perCanale[canale] || 0;
      const ore = minuti / 60;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${canale}</td>
        <td>${ore.toFixed(2)}</td>
        <td>${costo.toFixed(2)}</td>
      `;
      costoCanaliEl.appendChild(tr);
    });

    // elenco attivi adesso
    attiviListaEl.innerHTML = "";
    const ultimoEventoPerChiave = {};
    timbrature.forEach((t) => {
      const key = `${t.dip}|${t.canale}`;
      if (
        !ultimoEventoPerChiave[key] ||
        (t.timestamp || 0) > (ultimoEventoPerChiave[key].timestamp || 0)
      ) {
        ultimoEventoPerChiave[key] = t;
      }
    });

    Object.entries(ultimoEventoPerChiave).forEach(([key, ev]) => {
      if (ev.tipo === "Entrata" && ev.timestamp) {
        const [dip, canale] = key.split("|");
        const durataMin = (adesso - ev.timestamp) / 60000;
        const durataTxt = formatDurationMinutes(durataMin);

        const oraDa = new Date(ev.timestamp).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${dip}</td>
          <td>${canale}</td>
          <td>${oraDa}</td>
          <td>${durataTxt}</td>
        `;
        attiviListaEl.appendChild(tr);
      }
    });

    aggiornaPresenzeDipendenti();
  }

  async function salvaTimbraturaSupabase(record) {
    if (!supabase) return null;

    let dipendenteId = null;
    const d = dipendenti.find(
      (x) => x.nome && x.nome.toLowerCase() === record.dip.toLowerCase()
    );
    if (d && d.id) {
      dipendenteId = d.id;
    }

    const payload = {
      dipendente_id: dipendenteId,
      dip_nome: record.dip,
      canale: record.canale,
      tipo: record.tipo,
      ora: record.ora,
      timestamp: new Date(record.timestamp).toISOString(),
    };

    const { data, error } = await supabase
      .from("timbrature")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Errore salvataggio timbratura:", error);
      alert("Errore nel registrare la timbratura");
      return null;
    }

    record.id = data.id;
    return record;
  }

  async function registraTimbratura(tipo) {
    if (!currentUser) {
      alert("Devi prima effettuare il login");
      return;
    }

    const dipNomeVal = currentUser.nome;
    const stato = getStatoCorrenteDipendente(dipNomeVal);

    if (tipo === "Entrata") {
      if (stato.inside) {
        alert(
          `Sei già timbrato sul canale ${
            stato.canaleCorrente || ""
          }. Devi fare Uscita prima di una nuova Entrata.`
        );
        if (timbCanaleSelect && stato.canaleCorrente) {
          timbCanaleSelect.value = stato.canaleCorrente;
        }
        return;
      }
    } else if (tipo === "Pausa" || tipo === "Uscita") {
      if (!stato.inside) {
        alert("Non hai una timbratura di Entrata aperta.");
        return;
      }
    }

    let canaleVal =
      (timbCanaleSelect && timbCanaleSelect.value) ||
      currentUser.canalePrevalente ||
      "NR";

    if (stato.inside && stato.canaleCorrente) {
      canaleVal = stato.canaleCorrente;
      if (timbCanaleSelect) timbCanaleSelect.value = stato.canaleCorrente;
    }

    const now = new Date();
    const ora = now.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const record = {
      ora,
      dip: dipNomeVal,
      canale: canaleVal,
      tipo,
      timestamp: now.getTime(),
    };

    const salvato = await salvaTimbraturaSupabase(record);
    if (!salvato) return;

    timbrature.push(salvato);
    aggiornaTabellaTimbrature();
    aggiornaRiepilogo();
    aggiornaKpi(); // aggiorno anche i KPI perché il costo lavoro cambia
  }

  if (btnEntra)
    btnEntra.addEventListener("click", () => registraTimbratura("Entrata"));
  if (btnPausa)
    btnPausa.addEventListener("click", () => registraTimbratura("Pausa"));
  if (btnEsci)
    btnEsci.addEventListener("click", () => registraTimbratura("Uscita"));

  if (periodoSelect) {
    periodoSelect.addEventListener("change", () => {
      periodoCorrente = periodoSelect.value || "oggi";
      aggiornaRiepilogo();
    });
  }

  if (btnToggleTimbrature && sezioneTimbratureDettaglio) {
    btnToggleTimbrature.addEventListener("click", () => {
      const visibile = sezioneTimbratureDettaglio.style.display !== "none";
      if (visibile) {
        sezioneTimbratureDettaglio.style.display = "none";
        btnToggleTimbrature.textContent = "Mostra storico timbrature";
      } else {
        sezioneTimbratureDettaglio.style.display = "block";
        btnToggleTimbrature.textContent = "Nascondi storico timbrature";
      }
    });
  }

  if (btnTogglePresenze && sezionePresenzeEl) {
    btnTogglePresenze.addEventListener("click", () => {
      const visibile = sezionePresenzeEl.style.display !== "none";

      if (visibile) {
        sezionePresenzeEl.style.display = "none";
        btnTogglePresenze.textContent = "Mostra stato presenze";
      } else {
        aggiornaPresenzeDipendenti();
        sezionePresenzeEl.style.display = "block";
        btnTogglePresenze.textContent = "Nascondi stato presenze";
      }
    });
  }

  // ========= RICETTE =========
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

    await supabase.from("ricetta_ingredienti").delete().eq("ricetta_id", ricettaId);

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

  // ========= ACQUISTI / FATTURE + MAGAZZINO =========
  function getFornitoreById(id) {
    return fornitoriCache.find((f) => f.id === id) || null;
  }

  function getCategoriaById(id) {
    return categorieCache.find((c) => c.id === id) || null;
  }

  async function caricaFornitoriInCache() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("fornitori")
      .select("id, ragione_sociale")
      .order("ragione_sociale", { ascending: true });

    if (error) {
      console.error("Errore caricamento fornitori:", error);
      alert("Errore Supabase (caricamento fornitori): " + error.message);
      return;
    }
    fornitoriCache = data || [];
  }

  async function caricaCategorieInCache() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("categorie_prodotto")
      .select("id, nome")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento categorie:", error);
      alert("Errore Supabase (caricamento categorie): " + error.message);
      return;
    }
    categorieCache = data || [];
  }

  async function findOrCreateFornitoreByName(nomeFornitore) {
    if (!supabase) return null;
    const nomeTrim = (nomeFornitore || "").trim();
    if (!nomeTrim) return null;

    const existing = fornitoriCache.find(
      (f) =>
        f.ragione_sociale &&
        f.ragione_sociale.toLowerCase() === nomeTrim.toLowerCase()
    );
    if (existing) return existing;

    const { data, error } = await supabase
      .from("fornitori")
      .insert({
        ragione_sociale: nomeTrim,
        attivo: true,
      })
      .select("id, ragione_sociale")
      .single();

    if (error) {
      console.error("Errore creazione fornitore:", error);
      alert("Errore Supabase (fornitore): " + error.message);
      return null;
    }

    fornitoriCache.push(data);
    return data;
  }

  async function findOrCreateCategoriaByNome(nomeCategoria) {
    if (!supabase) return null;
    const nomeTrim = (nomeCategoria || "").trim();
    if (!nomeTrim) return null;

    const existing = categorieCache.find(
      (c) => c.nome && c.nome.toLowerCase() === nomeTrim.toLowerCase()
    );
    if (existing) return existing;

    const { data, error } = await supabase
      .from("categorie_prodotto")
      .insert({
        nome: nomeTrim,
        attivo: true,
      })
      .select("id, nome")
      .single();

    if (error) {
      console.error("Errore creazione categoria prodotto:", error);
      alert("Errore Supabase (categoria prodotto): " + error.message);
      return null;
    }

    categorieCache.push(data);
    return data;
  }

  async function findOrCreateProdotto({
    codice,
    descrizione,
    categoriaNome,
    um,
  }) {
    if (!supabase) return null;
    const codiceTrim = (codice || "").trim();
    const descTrim = (descrizione || "").trim();
    const umTrim = (um || "").trim() || "pz";

    if (!codiceTrim && !descTrim) {
      return null;
    }

    if (codiceTrim) {
      const { data: existingByCodice, error: errFindCodice } = await supabase
        .from("prodotti")
        .select("id, codice_interno, descrizione, categoria_id, um")
        .eq("codice_interno", codiceTrim)
        .limit(1);

      if (errFindCodice) {
        console.error("Errore ricerca prodotto per codice:", errFindCodice);
      }

      if (existingByCodice && existingByCodice.length > 0) {
        return existingByCodice[0];
      }
    }

    if (descTrim) {
      const { data: existingByDesc, error: errFindDesc } = await supabase
        .from("prodotti")
        .select("id, codice_interno, descrizione, categoria_id, um")
        .ilike("descrizione", descTrim)
        .limit(1);

      if (errFindDesc) {
        console.error("Errore ricerca prodotto per descrizione:", errFindDesc);
      } else if (existingByDesc && existingByDesc.length > 0) {
        return existingByDesc[0];
      }
    }

    let categoria = null;
    if (categoriaNome) {
      categoria = await findOrCreateCategoriaByNome(categoriaNome);
      if (!categoria) {
        alert(
          "Attenzione: categoria prodotto non creata/cercata correttamente, creo comunque il prodotto."
        );
      }
    }

    let codiceInternoFinale = codiceTrim;
    if (!codiceInternoFinale) {
      codiceInternoFinale = await generaCodiceInternoAutomatico(
        categoriaNome || descTrim || "GEN"
      );
    }

    const { data: existingFinal, error: errFindFinal } = await supabase
      .from("prodotti")
      .select("id, codice_interno, descrizione, categoria_id, um")
      .eq("codice_interno", codiceInternoFinale)
      .limit(1);

    if (errFindFinal) {
      console.error("Errore ricerca prodotto finale:", errFindFinal);
    }

    if (existingFinal && existingFinal.length > 0) {
      return existingFinal[0];
    }

    const payload = {
      codice_interno: codiceInternoFinale,
      descrizione: descTrim || codiceInternoFinale,
      categoria_id: categoria ? categoria.id : null,
      um: umTrim,
      attivo: true,
    };

    const { data, error } = await supabase
      .from("prodotti")
      .insert(payload)
      .select("id, codice_interno, descrizione, categoria_id, um")
      .single();

    if (error) {
      console.error("Errore creazione prodotto:", error);
      alert("Errore Supabase (creazione prodotto): " + error.message);
      return null;
    }

    return data;
  }

  // --- righe fattura ---
  function creaRigaFattura(initial = {}) {
    if (!fatturaRigheBody) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          type="text"
          class="fatt-riga-codice"
          placeholder="Cod. interno"
          value="${initial.codice_prodotto || ""}"
        />
      </td>
      <td>
        <input
          type="text"
          class="fatt-riga-descrizione"
          placeholder="Descrizione prodotto"
          list="ingredienti-suggestions"
          value="${initial.descrizione_riga || ""}"
        />
      </td>
      <td>
        <input
          type="text"
          class="fatt-riga-categoria"
          placeholder="Categoria"
          value="${initial.categoria_nome || ""}"
        />
      </td>
      <td>
        <input
          type="text"
          class="fatt-riga-um"
          placeholder="kg, l, pz..."
          value="${initial.um || ""}"
        />
      </td>
      <td>
        <input
          type="number"
          class="fatt-riga-quantita"
          placeholder="Q.tà"
          min="0"
          step="0.001"
          value="${initial.quantita != null ? initial.quantita : ""}"
        />
      </td>
      <td>
        <input
          type="number"
          class="fatt-riga-prezzo"
          placeholder="Prezzo"
          min="0"
          step="0.0001"
          value="${
            initial.prezzo_unitario != null ? initial.prezzo_unitario : ""
          }"
        />
      </td>
      <td>
        <input
          type="number"
          class="fatt-riga-iva"
          placeholder="%"
          min="0"
          step="1"
          value="${initial.iva_perc != null ? initial.iva_perc : ""}"
        />
      </td>
      <td class="fatt-riga-totale">0.00</td>
      <td>
        <button type="button" class="app-button tiny red btn-del-riga">
          ✕
        </button>
      </td>
    `;

    const qtaInput = tr.querySelector(".fatt-riga-quantita");
    const prezzoInput = tr.querySelector(".fatt-riga-prezzo");
    const ivaInput = tr.querySelector(".fatt-riga-iva");
    const totaleCell = tr.querySelector(".fatt-riga-totale");
    const btnDel = tr.querySelector(".btn-del-riga");

    function updateTotaleRiga() {
      const qta = parseNumber(qtaInput?.value || 0);
      const prezzo = parseNumber(prezzoInput?.value || 0);
      const iva = parseNumber(ivaInput?.value || 0);
      const imponibile = qta * prezzo;
      const totale = imponibile * (1 + iva / 100);
      if (totaleCell) {
        totaleCell.textContent = totale.toFixed(2);
      }
      calcolaTotaliFattura();
    }

    if (qtaInput) qtaInput.addEventListener("input", updateTotaleRiga);
    if (prezzoInput) prezzoInput.addEventListener("input", updateTotaleRiga);
    if (ivaInput) ivaInput.addEventListener("input", updateTotaleRiga);

    if (btnDel) {
      btnDel.addEventListener("click", () => {
        tr.remove();
        calcolaTotaliFattura();
      });
    }

    fatturaRigheBody.appendChild(tr);
    updateTotaleRiga();
  }

  function calcolaTotaliFattura() {
    if (!fatturaRigheBody) return;

    let imponibileTot = 0;
    let ivaTot = 0;

    const rows = Array.from(fatturaRigheBody.querySelectorAll("tr"));
    rows.forEach((row) => {
      const qtaInput = row.querySelector(".fatt-riga-quantita");
      const prezzoInput = row.querySelector(".fatt-riga-prezzo");
      const ivaInput = row.querySelector(".fatt-riga-iva");

      const qta = parseNumber(qtaInput?.value || 0);
      const prezzo = parseNumber(prezzoInput?.value || 0);
      const ivaPerc = parseNumber(ivaInput?.value || 0);

      const imponibile = qta * prezzo;
      const iva = imponibile * (ivaPerc / 100);

      imponibileTot += imponibile;
      ivaTot += iva;
    });

    const totale = imponibileTot + ivaTot;

    if (fatturaImponibileTotaleInput)
      fatturaImponibileTotaleInput.value = imponibileTot.toFixed(2);
    if (fatturaIvaTotaleInput)
      fatturaIvaTotaleInput.value = ivaTot.toFixed(2);
    if (fatturaTotaleDocumentoInput)
      fatturaTotaleDocumentoInput.value = totale.toFixed(2);
  }

  function resetFatturaForm() {
    currentFatturaId = null;
    if (fatturaNumeroInput) fatturaNumeroInput.value = "";
    if (fatturaDataInput) formatDateInputToday(fatturaDataInput);
    if (fatturaFornitoreInput) fatturaFornitoreInput.value = "";
    if (fatturaNoteInput) fatturaNoteInput.value = "";
    if (fatturaRigheBody) fatturaRigheBody.innerHTML = "";
    creaRigaFattura();
    calcolaTotaliFattura();
  }

  async function salvaFatturaSupabase() {
    if (!supabase) return;

    const numero = (fatturaNumeroInput?.value || "").trim();
    const dataVal = fatturaDataInput?.value || "";
    const fornitoreNome = (fatturaFornitoreInput?.value || "").trim();
    const note = (fatturaNoteInput?.value || "").trim();

    if (!numero) {
      alert("Inserisci il numero della fattura");
      return;
    }

    const fornitore = await findOrCreateFornitoreByName(fornitoreNome);
    const fornitoreId = fornitore?.id || null;

    const imponibileTot = parseNumber(
      fatturaImponibileTotaleInput?.value || 0
    );
    const ivaTot = parseNumber(fatturaIvaTotaleInput?.value || 0);
    const totale = parseNumber(fatturaTotaleDocumentoInput?.value || 0);

    const payloadFattura = {
      id: currentFatturaId || undefined,
      numero,
      data: dataVal || null,
      fornitore_id: fornitoreId,
      fornitore_nome: fornitoreNome || null,
      note: note || null,
      imponibile_totale: imponibileTot,
      iva_totale: ivaTot,
      totale_documento: totale,
    };

    const { data: fatturaSalvata, error: errFatt } = await supabase
      .from("fatture_acquisto")
      .upsert(payloadFattura)
      .select()
      .single();

    if (errFatt) {
      console.error("Errore salvataggio fattura:", errFatt);
      alert("Errore Supabase (fattura): " + errFatt.message);
      return;
    }

    currentFatturaId = fatturaSalvata.id;

    await supabase
      .from("fatture_righe")
      .delete()
      .eq("fattura_id", currentFatturaId);

    if (!fatturaRigheBody) return;

    const rows = Array.from(fatturaRigheBody.querySelectorAll("tr"));

    const righePayload = [];
    const movimentiMagazzino = [];

    for (const row of rows) {
      const codiceInput = row.querySelector(".fatt-riga-codice");
      const descrInput = row.querySelector(".fatt-riga-descrizione");
      const catInput = row.querySelector(".fatt-riga-categoria");
      const umInput = row.querySelector(".fatt-riga-um");
      const qtaInput = row.querySelector(".fatt-riga-quantita");
      const prezzoInput = row.querySelector(".fatt-riga-prezzo");
      const ivaInput = row.querySelector(".fatt-riga-iva");

      const codice = (codiceInput?.value || "").trim();
      const descrizione = (descrInput?.value || "").trim();
      const categoriaNome = (catInput?.value || "").trim();
      const um = (umInput?.value || "").trim();
      const quantita = parseNumber(qtaInput?.value || 0);
      const prezzoUnitario = parseNumber(prezzoInput?.value || 0);
      const ivaPerc = parseNumber(ivaInput?.value || 0);

      if (!descrizione && !codice) continue;
      if (!quantita || quantita <= 0) continue;

      const prodotto = await findOrCreateProdotto({
        codice,
        descrizione,
        categoriaNome,
        um,
      });

      const prodottoId = prodotto?.id || null;

      const imponibile = quantita * prezzoUnitario;
      const iva = imponibile * (ivaPerc / 100);
      const totaleRiga = imponibile + iva;

      righePayload.push({
        fattura_id: currentFatturaId,
        prodotto_id: prodottoId,
        codice_prodotto: prodotto?.codice_interno || codice || null,
        descrizione_riga: descrizione || prodotto?.descrizione || null,
        categoria_nome: categoriaNome || null,
        um: um || prodotto?.um || null,
        quantita,
        prezzo_unitario: prezzoUnitario,
        iva_perc: ivaPerc,
        imponibile,
        iva_importo: iva,
        totale: totaleRiga,
      });

      if (prodottoId) {
        movimentiMagazzino.push({
          prodotto_id: prodottoId,
          tipo: "carico",
          quantita,
          costo_unitario: prezzoUnitario,
          riferimento: `Fattura ${numero}`,
          data: dataVal || null,
        });
      }
    }

    if (righePayload.length) {
      const { error: errRighe } = await supabase
        .from("fatture_righe")
        .insert(righePayload);
      if (errRighe) {
        console.error("Errore salvataggio righe fattura:", errRighe);
        alert("Errore Supabase (righe fattura): " + errRighe.message);
      }
    }

    if (movimentiMagazzino.length) {
      const { error: errMov } = await supabase
        .from("magazzino_movimenti")
        .insert(movimentiMagazzino);
      if (errMov) {
        console.error("Errore salvataggio movimenti magazzino:", errMov);
        alert("Errore Supabase (magazzino movimenti): " + errMov.message);
      }
    }

    alert("Fattura salvata correttamente");
    await caricaElencoFatture();
    await caricaMagazzinoDati();
  }

  async function caricaElencoFatture() {
    if (!supabase || !fattureListaBody) return;

    const { data, error } = await supabase
      .from("fatture_acquisto")
      .select("*")
      .order("data", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Errore caricamento fatture:", error);
      alert("Errore Supabase (fatture): " + error.message);
      return;
    }

    fattureListaBody.innerHTML = "";

    (data || []).forEach((f) => {
      const tr = document.createElement("tr");
      const dataTxt = f.data
        ? new Date(f.data).toLocaleDateString("it-IT")
        : "";
      tr.innerHTML = `
        <td>${dataTxt}</td>
        <td>${f.numero || ""}</td>
        <td>${f.fornitore_nome || ""}</td>
        <td>${f.totale_documento != null ? f.totale_documento.toFixed(2) : ""}</td>
        <td>
          <button
            type="button"
            class="app-button tiny gray"
            data-open-fattura="${f.id}"
          >
            Apri
          </button>
        </td>
      `;
      fattureListaBody.appendChild(tr);
    });

    fattureListaBody
      .querySelectorAll("[data-open-fattura]")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = parseInt(btn.getAttribute("data-open-fattura"), 10);
          if (!id) return;

          const { data: fatt, error: errF } = await supabase
            .from("fatture_acquisto")
            .select("*")
            .eq("id", id)
            .single();
          if (errF) {
            console.error("Errore lettura fattura:", errF);
            alert("Errore nel caricamento della fattura");
            return;
          }

          const { data: righe, error: errR } = await supabase
            .from("fatture_righe")
            .select("*")
            .eq("fattura_id", id);

          if (errR) {
            console.error("Errore lettura righe fattura:", errR);
            alert("Errore nel caricamento delle righe fattura");
            return;
          }

          currentFatturaId = fatt.id;
          if (fatturaNumeroInput) fatturaNumeroInput.value = fatt.numero || "";
          if (fatturaDataInput)
            fatturaDataInput.value = fatt.data
              ? fatt.data.substring(0, 10)
              : "";
          if (fatturaFornitoreInput)
            fatturaFornitoreInput.value = fatt.fornitore_nome || "";
          if (fatturaNoteInput) fatturaNoteInput.value = fatt.note || "";

          if (fatturaRigheBody) fatturaRigheBody.innerHTML = "";

          (righe || []).forEach((r) => {
            creaRigaFattura(r);
          });

          calcolaTotaliFattura();
        });
      });
  }

  if (btnNuovaFattura) {
    btnNuovaFattura.addEventListener("click", () => {
      resetFatturaForm();
    });
  }

  if (btnSalvaFattura) {
    btnSalvaFattura.addEventListener("click", () => {
      salvaFatturaSupabase();
    });
  }

  if (btnAddRigaFattura) {
    btnAddRigaFattura.addEventListener("click", () => {
      creaRigaFattura();
    });
  }

  if (btnToggleFatture && fattureTable) {
    btnToggleFatture.addEventListener("click", () => {
      const visibile = fattureTable.style.display !== "none";
      fattureTable.style.display = visibile ? "none" : "table";
    });
  }

  // ========= MAGAZZINO =========
  async function caricaMagazzinoDati() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("magazzino_view_prodotti")
      .select("*")
      .order("descrizione", { ascending: true });

    if (error) {
      console.error("Errore caricamento magazzino:", error);
      alert("Errore nel caricare il magazzino");
      return;
    }

    magazzinoDati = data || [];
    renderMagazzinoLista(magazzinoDati);
    aggiornaMagazzinoSuggestions();
    aggiornaIngredientiSuggestionsDaMagazzino();
  }

  function renderMagazzinoLista(listaProdotti) {
    if (!magazzinoListaEl) return;
    magazzinoListaEl.innerHTML = "";

    listaProdotti.forEach((p) => {
      const tr = document.createElement("tr");
      const giac = p.giacenza_attuale ?? 0;
      const scortaMin = p.scorta_minima ?? 0;
      const low = scortaMin > 0 && giac < scortaMin;

      tr.innerHTML = `
        <td>${p.codice_interno || ""}</td>
        <td>${p.descrizione || ""}</td>
        <td>${p.categoria_nome || ""}</td>
        <td>
          ${giac.toFixed(3)} ${
        low ? '<span class="magazzino-low">Sotto scorta</span>' : ""
      }
        </td>
      `;
      tr.addEventListener("click", () => {
        popolaMagazzinoForm(p);
      });

      magazzinoListaEl.appendChild(tr);
    });
  }

  function aggiornaMagazzinoSuggestions() {
    if (!magazzinoSuggestions) return;
    magazzinoSuggestions.innerHTML = "";

    magazzinoDati.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.descrizione || "";
      magazzinoSuggestions.appendChild(opt);
    });
  }

  function aggiornaIngredientiSuggestionsDaMagazzino() {
    if (!ingredientiSuggestions) return;
    ingredientiSuggestions.innerHTML = "";

    magazzinoDati.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.descrizione || "";
      ingredientiSuggestions.appendChild(opt);
    });
  }

  function popolaMagazzinoForm(prodotto) {
    if (!magazzinoForm) return;

    if (!prodotto) {
      if (magazzinoIdInput) magazzinoIdInput.value = "";
      if (magazzinoDescrInput) magazzinoDescrInput.value = "";
      if (magazzinoCategoriaInput) magazzinoCategoriaInput.value = "";
      if (magazzinoUmInput) magazzinoUmInput.value = "";
      if (magazzinoScortaMinimaInput) magazzinoScortaMinimaInput.value = "";
      if (magazzinoGiacenzaInput) magazzinoGiacenzaInput.value = "";
      return;
    }

    if (magazzinoIdInput) magazzinoIdInput.value = prodotto.id || "";
    if (magazzinoDescrInput)
      magazzinoDescrInput.value = prodotto.descrizione || "";
    if (magazzinoCategoriaInput)
      magazzinoCategoriaInput.value = prodotto.categoria_nome || "";
    if (magazzinoUmInput) magazzinoUmInput.value = prodotto.um || "";
    if (magazzinoScortaMinimaInput)
      magazzinoScortaMinimaInput.value =
        prodotto.scorta_minima != null ? prodotto.scorta_minima : "";
    if (magazzinoGiacenzaInput)
      magazzinoGiacenzaInput.value =
        prodotto.giacenza_attuale != null
          ? Number(prodotto.giacenza_attuale).toFixed(3)
          : "";
  }

  async function salvaProdottoDaMagazzinoForm() {
    if (!supabase) return;

    const id = magazzinoIdInput?.value || null;
    const descrizione = (magazzinoDescrInput?.value || "").trim();
    const categoriaNome = (magazzinoCategoriaInput?.value || "").trim();
    const um = (magazzinoUmInput?.value || "").trim() || "pz";
    const scortaMin = parseNumber(magazzinoScortaMinimaInput?.value || 0);

    if (!descrizione) {
      alert("Inserisci una descrizione prodotto");
      return;
    }

    let categoria = null;
    if (categoriaNome) {
      categoria = await findOrCreateCategoriaByNome(categoriaNome);
    }

    let codiceInterno = null;
    if (id) {
      const existing = magazzinoDati.find((p) => String(p.id) === String(id));
      if (existing) {
        codiceInterno = existing.codice_interno;
      }
    }
    if (!codiceInterno) {
      codiceInterno = await generaCodiceInternoAutomatico(
        categoriaNome || descrizione
      );
    }

    const payload = {
      id: id ? parseInt(id, 10) : undefined,
      codice_interno: codiceInterno,
      descrizione,
      categoria_id: categoria ? categoria.id : null,
      um,
      scorta_minima: scortaMin || null,
      attivo: true,
    };

    const { data, error } = await supabase
      .from("prodotti")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Errore salvataggio prodotto magazzino:", error);
      alert("Errore Supabase (magazzino): " + error.message);
      return;
    }

    const nuovo = data;

    const idx = magazzinoDati.findIndex((p) => p.id === nuovo.id);
    if (idx >= 0) {
      magazzinoDati[idx] = {
        ...magazzinoDati[idx],
        ...nuovo,
      };
    } else {
      magazzinoDati.push({
        ...nuovo,
        giacenza_attuale: 0,
      });
    }

    renderMagazzinoLista(magazzinoDati);
    aggiornaMagazzinoSuggestions();
    aggiornaIngredientiSuggestionsDaMagazzino();
    popolaMagazzinoForm(nuovo);
    alert("Prodotto aggiornato.");
  }

  if (btnMagazzinoSalva) {
    btnMagazzinoSalva.addEventListener("click", (e) => {
      e.preventDefault();
      salvaProdottoDaMagazzinoForm();
    });
  }

  if (btnMagazzinoNuovo) {
    btnMagazzinoNuovo.addEventListener("click", () => {
      popolaMagazzinoForm(null);
    });
  }

  if (magazzinoSearchInput && magazzinoTable) {
    magazzinoTable.style.display = "none";

    magazzinoSearchInput.addEventListener("input", () => {
      const q = (magazzinoSearchInput.value || "").trim().toLowerCase();

      if (!q) {
        magazzinoTable.style.display = "none";
        if (magazzinoListaEl) magazzinoListaEl.innerHTML = "";
        return;
      }

      const filtrati = magazzinoDati.filter((p) => {
        const desc = (p.descrizione || "").toLowerCase();
        const cod = (p.codice_interno || "").toLowerCase();
        return desc.includes(q) || cod.includes(q);
      });

      renderMagazzinoLista(filtrati);
      magazzinoTable.style.display = "table";
    });
  }

  // ========= KPI / COSTI FISSI =========
  async function caricaCostiFissiDaSupabase() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("costi_fissi")
      .select("*")
      .order("categoria", { ascending: true })
      .order("descrizione", { ascending: true });

    if (error) {
      console.error("Errore caricamento costi fissi:", error);
      alert("Errore nel caricare i costi fissi da Supabase");
      return;
    }

    costiFissi = (data || []).map((row) => ({
      id: row.id,
      categoria: row.categoria || "",
      descrizione: row.descrizione || "",
      anno_riferimento: row.anno_riferimento || null,
      importo_annuo: row.importo_annuo ? Number(row.importo_annuo) : 0,
    }));

    renderCostiFissi();
    aggiornaKpi();
  }

  async function eliminaCostoFissoDaSupabase(id) {
    if (!supabase || !id) return;

    const { error } = await supabase
      .from("costi_fissi")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Errore eliminazione costo fisso:", error);
      alert("Errore nell'eliminare il costo fisso");
    }
  }

  function renderCostiFissi() {
    if (!costiFissiListaBody) return;

    costiFissiListaBody.innerHTML = "";

    costiFissi.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.categoria || "-"}</td>
        <td>${c.descrizione || ""}</td>
        <td>${c.anno_riferimento || ""}</td>
        <td>${c.importo_annuo.toFixed(2)}</td>
        <td>
          <button
            type="button"
            class="app-button tiny red"
            data-del-costo="${c.id}"
          >
            ✕
          </button>
        </td>
      `;
      costiFissiListaBody.appendChild(tr);
    });

    costiFissiListaBody.querySelectorAll("[data-del-costo]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.getAttribute("data-del-costo"), 10);
        if (!id) return;
        if (!confirm("Eliminare questa voce di costo fisso?")) return;
        await eliminaCostoFissoDaSupabase(id);
        await caricaCostiFissiDaSupabase();
      });
    });
  }

  async function salvaCostoFissoDaForm() {
    if (!supabase) return;

    const categoria = (costiFissiCategoriaInput?.value || "").trim();
    const descrizione = (costiFissiDescrizioneInput?.value || "").trim();
    const annoVal = parseInt(costiFissiAnnoInput?.value || "", 10) || null;
    const importo = parseNumber(costiFissiImportoInput?.value || 0);

    if (!descrizione || !importo) {
      alert("Inserisci almeno descrizione e importo annuo");
      return;
    }

    const payload = {
      categoria: categoria || null,
      descrizione,
      anno_riferimento: annoVal,
      importo_annuo: importo,
    };

    const { error } = await supabase.from("costi_fissi").insert(payload);

    if (error) {
      console.error("Errore salvataggio costo fisso:", error);
      alert("Errore nel salvare il costo fisso");
      return;
    }

    if (costiFissiCategoriaInput) costiFissiCategoriaInput.value = "";
    if (costiFissiDescrizioneInput) costiFissiDescrizioneInput.value = "";
    if (costiFissiAnnoInput) costiFissiAnnoInput.value = "";
    if (costiFissiImportoInput) costiFissiImportoInput.value = "";

    await caricaCostiFissiDaSupabase();
  }

  function calcolaQuotaCostiFissiPeriodo() {
    const totaleAnnuo = costiFissi.reduce(
      (sum, c) => sum + (c.importo_annuo || 0),
      0
    );
    if (!totaleAnnuo) return 0;

    switch (kpiPeriodoCorrente) {
      case "day":
        return totaleAnnuo / 365;
      case "week":
        return totaleAnnuo / 52;
      case "month":
        return totaleAnnuo / 12;
      case "year":
        return totaleAnnuo;
      default:
        return totaleAnnuo;
    }
  }

  function calcolaCostoLavoroPeriodo(startMs, endMs) {
    if (!timbrature.length || !dipendenti.length) return 0;

    const eventiPeriodo = timbrature.filter(
      (t) =>
        t.timestamp &&
        t.timestamp >= startMs &&
        t.timestamp <= endMs
    );

    const eventiPerDip = {};
    eventiPeriodo.forEach((t) => {
      if (!t.dip) return;
      if (!eventiPerDip[t.dip]) eventiPerDip[t.dip] = [];
      eventiPerDip[t.dip].push(t);
    });

    let costoTotale = 0;

    Object.entries(eventiPerDip).forEach(([nome, events]) => {
      events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      let aperto = null;
      let minuti = 0;

      events.forEach((ev) => {
        if (!ev.timestamp) return;
        if (ev.tipo === "Entrata") {
          aperto = ev;
        } else if (ev.tipo === "Uscita" && aperto && aperto.timestamp) {
          const diffMin = (ev.timestamp - aperto.timestamp) / 60000;
          if (diffMin > 0) minuti += diffMin;
          aperto = null;
        }
      });

      const dip = dipendenti.find((d) => d.nome === nome);
      const costoOrario = dip?.costoOrario || 0;
      const ore = minuti / 60;
      costoTotale += ore * costoOrario;
    });

    return costoTotale;
  }

  function aggiornaKpi() {
    if (
      !kpiCostiFissiEl ||
      !kpiCostoLavoroEl ||
      !kpiFoodCostEl ||
      !kpiMargineEl
    )
      return;

    const quotaCosti = calcolaQuotaCostiFissiPeriodo();
    kpiCostiFissiEl.textContent = quotaCosti.toFixed(2).replace(".", ",");

    const { startMs, endMs } = getDateRangeForKpi(kpiPeriodoCorrente);
    const costoLavoro = calcolaCostoLavoroPeriodo(startMs, endMs);
    kpiCostoLavoroEl.textContent = costoLavoro.toFixed(2).replace(".", ",");

    // per ora placeholder - verranno collegati al CSV vendite
    kpiFoodCostEl.textContent = "0";
    kpiMargineEl.textContent = "0";
  }

  if (kpiPeriodoSelect) {
    kpiPeriodoSelect.addEventListener("change", () => {
      kpiPeriodoCorrente = kpiPeriodoSelect.value || "day";
      aggiornaKpi();
    });
  }

  if (btnCostiFissiSalva) {
    btnCostiFissiSalva.addEventListener("click", () => {
      salvaCostoFissoDaForm();
    });
  }

  // ========= ROUTING =========
  async function caricaProdottiSuggerimentiIngredienti() {
    if (!magazzinoDati.length) {
      await caricaCategorieInCache();
      await caricaMagazzinoDati();
    } else {
      aggiornaIngredientiSuggestionsDaMagazzino();
    }
  }

  async function onRouteEnter(route) {
    switch (route) {
      case "timbratura":
        await caricaTimbratureDaSupabase();
        updateTimbraturaUserInfo();
        break;
      case "dipendenti":
        await caricaDipendentiDaSupabase();
        break;
      case "ricette":
        await caricaProdottiSuggerimentiIngredienti();
        resetFormRicetta();
        break;
      case "acquisti":
        await caricaCategorieInCache();
        await caricaFornitoriInCache();
        resetFatturaForm();
        await caricaElencoFatture();
        break;
      case "magazzino":
        await caricaCategorieInCache();
        await caricaMagazzinoDati();
        popolaMagazzinoForm(null);
        break;
      case "report":
        await caricaDipendentiDaSupabase();
        await caricaTimbratureDaSupabase();
        await caricaCostiFissiDaSupabase();
        if (kpiPeriodoSelect) {
          kpiPeriodoSelect.value = kpiPeriodoCorrente;
        }
        aggiornaKpi();
        break;
      default:
        break;
    }
  }

  async function navigateTo(route) {
    if (!currentUser) {
      showLogin();
      return;
    }

    const isManager = isManagerRole(currentUser.ruolo);

    if (!isManager) {
      if (route === "timbratura" || route === "ordine") {
        showOnlyView(`view-${route}`);
        await onRouteEnter(route);
      } else {
        showHomeDipendente();
      }
    } else {
      let active = document.getElementById(`view-${route}`);
      if (!active) {
        route = "timbratura";
        active = document.getElementById("view-timbratura");
      }

      showOnlyView(`view-${route}`);
      await onRouteEnter(route);
    }

    applyRoleVisibility();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  routeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-route");
      window.location.hash = route;
      navigateTo(route);
    });
  });

  window.addEventListener("hashchange", () => {
    const route = window.location.hash.replace("#", "");
    navigateTo(route);
  });

  // ========= AVVIO =========
  async function init() {
    await caricaDipendentiDaSupabase();
    await caricaTimbratureDaSupabase();

    restoreUserFromStorage();

    if (currentUser) {
      const hashRoute = window.location.hash.replace("#", "") || "timbratura";
      if (isManagerRole(currentUser.ruolo)) {
        showManagerMenuAndRoute(hashRoute);
      } else {
        if (hashRoute === "timbratura") {
          showOnlyView("view-timbratura");
          await onRouteEnter("timbratura");
        } else {
          showHomeDipendente();
        }
      }
    } else {
      showLogin();
    }
  }

  init();
});
