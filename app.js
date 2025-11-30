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

  // ---------- RICETTE (EDIT) ----------
  const ricettaNomeInput = document.getElementById("ricetta-nome");
  const ricettaDescrizioneInput = document.getElementById("ricetta-descrizione");
  const ricettaNoteInput = document.getElementById("ricetta-note");
  const ricettaFotoInput = document.getElementById("ricetta-foto");
  const ricettaIngredientiContainer = document.getElementById(
    "ricetta-ingredienti-container"
  );
  const btnAddIngrediente = document.getElementById("btn-add-ingrediente");
  const btnSalvaRicetta = document.getElementById("btn-salva-ricetta");

  const ricettaPezziBaseInput = document.getElementById("ricetta-pezzi-base");
  const ricettaFormato1LabelInput = document.getElementById(
    "ricetta-formato1-label"
  );
  const ricettaFormato1PercInput = document.getElementById(
    "ricetta-formato1-percent"
  );
  const ricettaFormato2LabelInput = document.getElementById(
    "ricetta-formato2-label"
  );
  const ricettaFormato2PercInput = document.getElementElementById
    ? document.getElementById("ricetta-formato2-percent")
    : document.querySelector("#ricetta-formato2-percent");
  const ricettaFormato1PezziOut = document.getElementById(
    "ricetta-formato1-pezzi"
  );
  const ricettaFormato2PezziOut = document.getElementById(
    "ricetta-formato2-pezzi"
  );

  // ---------- RICETTARIO (VIEWER) ----------
  const ricetteSearchInput = document.getElementById("ricette-search");
  const ricetteListaViewer = document.getElementById("ricette-lista-viewer");

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

    const magazzinoForm = document.getElementById("magazzino-form");
  const magazzinoIdInput = document.getElementById("magazzino-id");
  const magazzinoDescrInput = document.getElementById("magazzino-descrizione");
  const magazzinoCategoriaInput = document.getElementById("magazzino-categoria");
  const magazzinoUmInput = document.getElementById("magazzino-um");
  const magazzinoIvaInput = document.getElementById("magazzino-iva");
  const magazzinoScortaMinimaInput = document.getElementById(
    "magazzino-scorta-minima"
  );
  const magazzinoGiacenzaInput = document.getElementById("magazzino-giacenza");

  const btnMagazzinoSalva = document.getElementById("btn-magazzino-salva");
  const btnMagazzinoNuovo = document.getElementById("btn-magazzino-nuovo");

  // datalist ingredienti per ricette + prodotti fatture
  const ingredientiSuggestions = document.getElementById(
    "ingredienti-suggestions"
  );

  // ---------- STATO ----------
  let dipendenti = [];
  let timbrature = [];
  let currentUser = null;
  let periodoCorrente = "oggi";

  let ricettaCorrenteId = null;
  let ricettaFotoCorrenteUrl = null;
  let ricetteCache = [];

  let currentFatturaId = null;
  let fornitoriCache = [];
  let categorieCache = [];
  let magazzinoDati = [];

  // ========= UTILITY GENERALI =========
  function parseNumber(val) {
    if (val == null) return 0;
    const str = String(val).replace(",", ".");
    const n = parseFloat(str);
    return Number.isNaN(n) ? 0 : n;
  }
  function calcolaImponibileEIVA(totaleLordo, ivaPerc) {
    const lordo = parseNumber(totaleLordo);
    const iva = parseNumber(ivaPerc);
    if (lordo <= 0 || iva <= 0) {
      return { imponibile: lordo, iva: 0 };
    }
    const imponibile = lordo / (1 + iva / 100);
    const ivaImporto = lordo - imponibile;
    return { imponibile, iva: ivaImporto };
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
      currentUser && isManagerRole(currentUser.ruolo) ? "manager" : "dipendente";

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
      // ignore
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      showLogin();
    });
  }

  // ========= NAVIGAZIONE (ROUTING) =========
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

      case "ricette-viewer":
        await caricaRicetteViewerDaSupabase();
        if (ricetteSearchInput) {
          ricetteSearchInput.value = "";
        }
        if (ricetteListaViewer) {
          ricetteListaViewer.innerHTML =
            '<p class="small-muted">Digita almeno 2 lettere nel campo sopra per cercare una ricetta.</p>';
        }
        break;

      case "acquisti":
        await caricaCategorieInCache();
        await caricaFornitoriInCache();
        await caricaMagazzinoDati();
        resetFatturaForm();
        await caricaElencoFatture();
        break;

      case "magazzino":
        await caricaCategorieInCache();
        await caricaMagazzinoDati();
        popolaMagazzinoForm(null);
        break;

      default:
        break;
    }
  }

  async function navigateTo(route) {
    if (!route) return;
    window.location.hash = route;
    showOnlyView(`view-${route}`);
    await onRouteEnter(route);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // click su tutti i pulsanti con data-route (home dip e menu manager)
  routeButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const route = btn.getAttribute("data-route");
      if (!route) return;

      // dipendenti non manager possono andare solo a timbratura o ricettario
      if (
        !currentUser ||
        (!isManagerRole(currentUser.ruolo) &&
          route !== "timbratura" &&
          route !== "ricette-viewer")
      ) {
        return;
      }

      await navigateTo(route);
    });
  });

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
    if (periodoCorrente === "settimana")
      startPeriodoMs = startSettimana.getTime();
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

  // ========= RICETTE: INGREDIENTI =========
  function creaRigaIngrediente(initial = {}) {
    if (!ricettaIngredientiContainer) return;

    const row = document.createElement("div");
    row.className = "ricetta-ingrediente-row";

    row.innerHTML = `
      <input
        type="text"
        class="ingrediente-nome"
        placeholder="Ingrediente (come in magazzino)"
        list="ingredienti-suggestions"
        value="${initial.nome_prodotto || ""}"
      />
      <input
        type="number"
        class="ingrediente-quantita"
        placeholder="Q.tà"
        step="0.001"
        min="0"
        value="${initial.quantita != null ? initial.quantita : ""}"
      />
      <input
        type="text"
        class="ingrediente-unita"
        placeholder="g, kg, ml, u..."
        value="${initial.unita_misura || ""}"
      />
      <button type="button" class="app-button tiny red btn-del-ingrediente">
        ✕
      </button>
    `;

    const btnDel = row.querySelector(".btn-del-ingrediente");
    if (btnDel) {
      btnDel.addEventListener("click", () => row.remove());
    }

    ricettaIngredientiContainer.appendChild(row);
  }

  // ========= RICETTE: RESET FORM =========
  function resetFormRicetta() {
    if (!ricettaNomeInput) return;

    ricettaCorrenteId = null;
    ricettaFotoCorrenteUrl = null;

    ricettaNomeInput.value = "";
    if (ricettaDescrizioneInput) ricettaDescrizioneInput.value = "";
    if (ricettaNoteInput) ricettaNoteInput.value = "";
    if (ricettaFotoInput) ricettaFotoInput.value = "";

    if (ricettaPezziBaseInput) ricettaPezziBaseInput.value = "";
    if (ricettaFormato1LabelInput)
      ricettaFormato1LabelInput.value = "Ristorante";
    if (ricettaFormato1PercInput) ricettaFormato1PercInput.value = 100;
    if (ricettaFormato2LabelInput)
      ricettaFormato2LabelInput.value = "Buffet";
    if (ricettaFormato2PercInput) ricettaFormato2PercInput.value = 25;

    if (ricettaFormato1PezziOut) ricettaFormato1PezziOut.textContent = "-";
    if (ricettaFormato2PezziOut) ricettaFormato2PezziOut.textContent = "-";

    if (ricettaIngredientiContainer) {
      ricettaIngredientiContainer.innerHTML = "";
      creaRigaIngrediente();
    }
  }

  // ========= RICETTE: CALCOLO RESE =========
  function aggiornaResaRicetta() {
    if (!ricettaPezziBaseInput) return;

    const base = parseFloat(ricettaPezziBaseInput.value) || 0;
    const perc1 = parseFloat(ricettaFormato1PercInput?.value || "0") || 0;
    const perc2 = parseFloat(ricettaFormato2PercInput?.value || "0") || 0;

    const pezzi1 = base > 0 && perc1 > 0 ? base * (100 / perc1) : null;
    const pezzi2 = base > 0 && perc2 > 0 ? base * (100 / perc2) : null;

    if (ricettaFormato1PezziOut) {
      ricettaFormato1PezziOut.textContent = pezzi1 ? pezzi1.toFixed(1) : "-";
    }
    if (ricettaFormato2PezziOut) {
      ricettaFormato2PezziOut.textContent = pezzi2 ? pezzi2.toFixed(1) : "-";
    }
  }

  if (ricettaPezziBaseInput) {
    ricettaPezziBaseInput.addEventListener("input", aggiornaResaRicetta);
  }
  if (ricettaFormato1PercInput) {
    ricettaFormato1PercInput.addEventListener("input", aggiornaResaRicetta);
  }
  if (ricettaFormato2PercInput) {
    ricettaFormato2PercInput.addEventListener("input", aggiornaResaRicetta);
  }

  // ========= RICETTE: SALVATAGGIO BASE (con MODIFICA per nome) =========
  async function salvaRicettaSupabaseBase({
    id,
    nome,
    descrizione,
    note,
    fotoUrl,
    pezziBase,
    formato1Label,
    formato1Perc,
    formato2Label,
    formato2Perc,
  }) {
    if (!supabase) return null;

    let finalId = id || null;

    // se non ho id, provo a vedere se esiste già una ricetta con lo stesso nome -> MODIFICA
    if (!finalId && nome) {
      const { data: existing, error: errExisting } = await supabase
        .from("ricette")
        .select("id")
        .ilike("nome", nome)
        .limit(1);

      if (!errExisting && existing && existing.length > 0) {
        finalId = existing[0].id;
      }
    }

    const payload = {
      id: finalId || undefined,
      nome,
      descrizione: descrizione || null,
      note_procedimento: note || null,
      foto_url: fotoUrl || null,
      pezzi_base: pezziBase || null,
      formato1_label: formato1Label || null,
      formato1_percent: formato1Perc || null,
      formato2_label: formato2Label || null,
      formato2_percent: formato2Perc || null,
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

  // ========= RICETTE: SALVATAGGIO INGREDIENTI =========
  async function salvaIngredientiPerRicetta(ricettaId, ingredienti) {
    if (!supabase || !ricettaId) return;

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

  // ========= RICETTE: UPLOAD FOTO =========
  async function uploadFotoRicettaSePresente() {
    if (!supabase) return ricettaFotoCorrenteUrl;
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

  // ========= RICETTE: CARICA RICETTA ESISTENTE IN FORM (MODIFICA) =========
  async function caricaRicettaInForm(ricettaId) {
    if (!supabase || !ricettaId) return;

    const { data: r, error } = await supabase
      .from("ricette")
      .select(
        "id, nome, descrizione, note_procedimento, foto_url, pezzi_base, formato1_label, formato1_percent, formato2_label, formato2_percent"
      )
      .eq("id", ricettaId)
      .single();

    if (error) {
      console.error("Errore caricamento ricetta:", error);
      alert("Errore nel caricare la ricetta per modifica");
      return;
    }

    ricettaCorrenteId = r.id;
    ricettaFotoCorrenteUrl = r.foto_url || null;

    if (ricettaNomeInput) ricettaNomeInput.value = r.nome || "";
    if (ricettaDescrizioneInput)
      ricettaDescrizioneInput.value = r.descrizione || "";
    if (ricettaNoteInput)
      ricettaNoteInput.value = r.note_procedimento || "";

    if (ricettaPezziBaseInput)
      ricettaPezziBaseInput.value = r.pezzi_base != null ? r.pezzi_base : "";

    if (ricettaFormato1LabelInput)
      ricettaFormato1LabelInput.value = r.formato1_label || "Ristorante";
    if (ricettaFormato1PercInput)
      ricettaFormato1PercInput.value =
        r.formato1_percent != null ? r.formato1_percent : 100;

    if (ricettaFormato2LabelInput)
      ricettaFormato2LabelInput.value = r.formato2_label || "Buffet";
    if (ricettaFormato2PercInput)
      ricettaFormato2PercInput.value =
        r.formato2_percent != null ? r.formato2_percent : 25;

    aggiornaResaRicetta();

    const ingredienti = await caricaIngredientiRicettaDaSupabase(ricettaId);

    if (ricettaIngredientiContainer) {
      ricettaIngredientiContainer.innerHTML = "";
      if (ingredienti && ingredienti.length) {
        ingredienti.forEach((ing) => {
          creaRigaIngrediente({
            nome_prodotto: ing.nome_prodotto,
            quantita: ing.quantita,
            unita_misura: ing.unita_misura,
          });
        });
      } else {
        creaRigaIngrediente();
      }
    }
  }

  // ========= RICETTE: SALVATAGGIO COMPLETO =========
  async function handleSalvaRicetta() {
    if (!ricettaNomeInput) return;

    const nome = ricettaNomeInput.value.trim();
    if (!nome) {
      alert("Inserisci il nome della ricetta");
      return;
    }

    const descrizione = ricettaDescrizioneInput?.value.trim() || "";
    const note = ricettaNoteInput?.value.trim() || "";

    // ---- Lettura ingredienti con controllo righe parziali ----
    const ingredienti = [];
    let rigaParziale = false;

    if (ricettaIngredientiContainer) {
      const rows = Array.from(
        ricettaIngredientiContainer.querySelectorAll(".ricetta-ingrediente-row")
      );
      rows.forEach((row) => {
        const nomeEl = row.querySelector(".ingrediente-nome");
        const qtaEl = row.querySelector(".ingrediente-quantita");
        const unitaEl = row.querySelector(".ingrediente-unita");

        const nomeIng = (nomeEl?.value || "").trim();
        const qtaRaw = (qtaEl?.value || "").trim();
        const qtaVal = parseFloat(qtaRaw || "0") || 0;
        const unitaVal = (unitaEl?.value || "").trim();

        // riga completamente vuota -> ignora
        if (!nomeIng && !qtaRaw && !unitaVal) {
          return;
        }

        // riga parzialmente compilata -> ERRORE
        if (!nomeIng || !unitaVal || qtaVal <= 0) {
          rigaParziale = true;
          return;
        }

        ingredienti.push({
          nome: nomeIng,
          quantita: qtaVal,
          unita: unitaVal,
        });
      });
    }

    if (rigaParziale) {
      alert(
        "Controlla gli ingredienti: ogni riga compilata deve avere NOME, Q.TÀ > 0 e UNITA di misura."
      );
      return;
    }

    const pezziBase = parseFloat(ricettaPezziBaseInput?.value || "0") || 0;
    const formato1Label = ricettaFormato1LabelInput?.value.trim() || "";
    const formato1Perc =
      parseFloat(ricettaFormato1PercInput?.value || "0") || 0;
    const formato2Label = ricettaFormato2LabelInput?.value.trim() || "";
    const formato2Perc =
      parseFloat(ricettaFormato2PercInput?.value || "0") || 0;

    const fotoUrl = await uploadFotoRicettaSePresente();
    ricettaFotoCorrenteUrl = fotoUrl;

    const ricettaSalvata = await salvaRicettaSupabaseBase({
      id: ricettaCorrenteId,
      nome,
      descrizione,
      note,
      fotoUrl,
      pezziBase,
      formato1Label,
      formato1Perc,
      formato2Label,
      formato2Perc,
    });

    if (!ricettaSalvata) return;

    ricettaCorrenteId = ricettaSalvata.id;
    await salvaIngredientiPerRicetta(ricettaCorrenteId, ingredienti);

    alert("Ricetta salvata correttamente");
    aggiornaResaRicetta();
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

  // ===========================================================
  // ========== RICETTARIO - SOLO LETTURA ======================
  // ===========================================================

  // Carica tutte le ricette in cache, ma NON le mostra all'avvio
  async function caricaRicetteViewerDaSupabase() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("ricette")
      .select(`
        id,
        nome,
        descrizione,
        note_procedimento,
        foto_url,
        pezzi_base,
        formato1_label,
        formato1_percent,
        formato2_label,
        formato2_percent
      `)
      .eq("attivo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento ricette:", error);
      alert("Errore nel caricare le ricette");
      return;
    }

    ricetteCache = data || [];

    if (ricetteListaViewer) {
      ricetteListaViewer.innerHTML =
        '<p class="small-muted">Digita almeno 2 lettere nel campo sopra per cercare una ricetta.</p>';
    }
  }

  // Carica ingredienti di una singola ricetta
  async function caricaIngredientiRicettaDaSupabase(ricettaId) {
    if (!supabase || !ricettaId) return [];

    const { data, error } = await supabase
      .from("ricetta_ingredienti")
      .select("nome_prodotto, quantita, unita_misura, note")
      .eq("ricetta_id", ricettaId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Errore caricamento ingredienti ricetta:", error);
      return [];
    }

    return data || [];
  }

  // Disegna le card ricette nel viewer (con ingredienti)
  async function renderRicetteViewer(lista) {
    if (!ricetteListaViewer) return;

    ricetteListaViewer.innerHTML = "";

    if (!lista.length) {
      ricetteListaViewer.innerHTML =
        '<p>Nessuna ricetta trovata per questa ricerca.</p>';
      return;
    }

    for (const r of lista) {
      const card = document.createElement("div");
      card.className = "timbratura-intro-card";

      const base = r.pezzi_base || 0;
      const f1Label = r.formato1_label || "Formato 1";
      const f1Perc = r.formato1_percent || 100;
      const f2Label = r.formato2_label || "Formato 2";
      const f2Perc = r.formato2_percent || 0;

      const pezzi1 = base && f1Perc ? base * (100 / f1Perc) : null;
      const pezzi2 = base && f2Perc ? base * (100 / f2Perc) : null;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <h3 style="margin:0;">${r.nome || ""}</h3>
          ${
            base
              ? `<span style="font-size:11px; background:#e5e7eb; padding:2px 8px; border-radius:999px;">
                   ${base} pz base
                 </span>`
              : ""
          }
        </div>

        ${
          r.descrizione
            ? `<p style="margin:4px 0 6px; font-size:13px; color:#4b5563;">
                 ${r.descrizione}
               </p>`
            : ""
        }

        ${
          r.foto_url
            ? `<img src="${r.foto_url}" alt="Foto ricetta" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin:4px 0;">`
            : ""
        }

        ${
          base
            ? `
            <div style="font-size:12px; margin-bottom:4px;">
              <strong>Rese calcolate:</strong>
            </div>
            <div style="display:flex; gap:8px; font-size:12px; flex-wrap:wrap;">
              <span><strong>${f1Label}:</strong> ${
                pezzi1 ? pezzi1.toFixed(1) : "-"
              } pz (${f1Perc || 100}%)</span>
              ${
                f2Perc
                  ? `<span><strong>${f2Label}:</strong> ${
                      pezzi2 ? pezzi2.toFixed(1) : "-"
                    } pz (${f2Perc}%)</span>`
                  : ""
              }
            </div>
          `
            : ""
        }

        <div class="ricetta-ingredienti-view" style="margin-top:8px;">
          <p style="margin:0; font-size:12px; color:#6b7280;">
            Caricamento ingredienti...
          </p>
        </div>

        ${
          r.note_procedimento
            ? `
          <p style="margin:6px 0 0; font-size:12px; color:#6b7280;">
            <strong>Note:</strong> ${r.note_procedimento}
          </p>`
            : ""
        }
      `;

      ricetteListaViewer.appendChild(card);

      // carico ingredienti e li inserisco nella card
      const ingrContainer = card.querySelector(".ricetta-ingredienti-view");
      const ingredienti = await caricaIngredientiRicettaDaSupabase(r.id);

      if (ingrContainer) {
        if (!ingredienti.length) {
          ingrContainer.innerHTML =
            '<p style="margin:0; font-size:12px; color:#6b7280;">Nessun ingrediente registrato.</p>';
        } else {
          const title = document.createElement("p");
          title.style.margin = "0 0 4px 0";
          title.style.fontSize = "12px";
          title.style.fontWeight = "bold";
          title.textContent = "Ingredienti:";

          const ul = document.createElement("ul");
          ul.style.margin = "0";
          ul.style.paddingLeft = "18px";
          ul.style.fontSize = "12px";

          ingredienti.forEach((ing) => {
            const li = document.createElement("li");
            const nomeIng = ing.nome_prodotto || "";
            const qta = ing.quantita != null ? ing.quantita : "";
            const um = ing.unita_misura || "";
            li.textContent = `${nomeIng} – ${qta} ${um}`;
            ul.appendChild(li);
          });

          ingrContainer.innerHTML = "";
          ingrContainer.appendChild(title);
          ingrContainer.appendChild(ul);
        }
      }

      // Bottone MODIFICA visibile solo a admin/manager
      if (currentUser && isManagerRole(currentUser.ruolo)) {
        const footer = document.createElement("div");
        footer.style.marginTop = "8px";
        footer.style.display = "flex";
        footer.style.justifyContent = "flex-end";

        const btnMod = document.createElement("button");
        btnMod.type = "button";
        btnMod.textContent = "Modifica questa ricetta";
        btnMod.className = "app-button tiny gray";

        btnMod.addEventListener("click", async () => {
          await navigateTo("ricette");
          await caricaRicettaInForm(r.id);
        });

        footer.appendChild(btnMod);
        card.appendChild(footer);
      }
    }
  }

  // Filtro in base al testo inserito
  async function filtraRicetteViewer() {
    if (!ricetteSearchInput || !ricetteListaViewer) return;

    const q = (ricetteSearchInput.value || "").trim().toLowerCase();

    if (q.length < 2) {
      ricetteListaViewer.innerHTML =
        '<p class="small-muted">Digita almeno 2 lettere per cercare una ricetta.</p>';
      return;
    }

    const filtrate = ricetteCache.filter((r) => {
      const nome = (r.nome || "").toLowerCase();
      const desc = (r.descrizione || "").toLowerCase();
      return nome.includes(q) || desc.includes(q);
    });

    await renderRicetteViewer(filtrate);
  }

  // evento sull'input cerca ricetta
  if (ricetteSearchInput) {
    ricetteSearchInput.addEventListener("input", () => {
      filtraRicetteViewer();
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

  function onDescrizioneProdottoChange(tr) {
    if (!tr) return;
    const descrInput = tr.querySelector(".fatt-riga-descrizione");
    if (!descrInput) return;

    const descrVal = (descrInput.value || "").trim().toLowerCase();
    if (!descrVal) return;

    const prodotto = magazzinoDati.find(
      (p) => (p.descrizione || "").toLowerCase() === descrVal
    );
    if (!prodotto) return;

    const codiceInput = tr.querySelector(".fatt-riga-codice");
    const umInput = tr.querySelector(".fatt-riga-um");
    const catInput = tr.querySelector(".fatt-riga-categoria");

    if (codiceInput) codiceInput.value = prodotto.codice || "";
    if (umInput) umInput.value = prodotto.um || "";
    if (catInput) catInput.value = prodotto.categoriaNome || "";

    tr.dataset.prodottoId = String(prodotto.id);
  }

  function creaRigaFattura(initial = {}) {
    if (!fatturaRigheBody) return;

    const tr = document.createElement("tr");
    tr.className = "fatt-riga-row";

    tr.innerHTML = `
      <td colspan="9">
        <div class="fatt-riga-vertical">
          <div class="fatt-field">
            <label>
              Codice interno
              <input
                type="text"
                class="fatt-riga-codice input-pill"
                placeholder="Cod. interno"
                value="${initial.codice_prodotto || ""}"
              />
            </label>
          </div>

          <div class="fatt-field">
            <label>
              Descrizione prodotto
              <input
                type="text"
                class="fatt-riga-descrizione input-pill"
                placeholder="Cerca/Seleziona prodotto"
                list="ingredienti-suggestions"
                value="${initial.descrizione_riga || ""}"
              />
            </label>
          </div>

          <div class="fatt-field">
            <label>
              Categoria
              <input
                type="text"
                class="fatt-riga-categoria input-pill"
                placeholder="Categoria"
                value="${initial.categoria_nome || ""}"
              />
            </label>
          </div>

          <div class="fatt-field">
            <label>
              Unità di misura
              <input
                type="text"
                class="fatt-riga-um input-pill"
                placeholder="kg, l, pz..."
                value="${initial.um || ""}"
              />
            </label>
          </div>

          <div class="fatt-field">
            <label>
              Quantità
              <input
                type="number"
                class="fatt-riga-quantita input-pill"
                placeholder="Q.tà"
                min="0"
                step="0.001"
                value="${initial.quantita != null ? initial.quantita : ""}"
              />
            </label>
          </div>

          <div class="fatt-field">
            <label>
              Prezzo unitario
              <input
                type="number"
                class="fatt-riga-prezzo input-pill"
                placeholder="Prezzo"
                min="0"
                step="0.0001"
                value="${
                  initial.prezzo_unitario != null ? initial.prezzo_unitario : ""
                }"
              />
            </label>
          </div>

          <div class="fatt-field">
            <label>
              IVA %
              <input
                type="number"
                class="fatt-riga-iva input-pill"
                placeholder="%"
                min="0"
                step="1"
                value="${initial.iva_perc != null ? initial.iva_perc : ""}"
              />
            </label>
          </div>

          <div class="fatt-riga-footer">
            <span class="fatt-riga-totale-label">
              Totale riga:
              <span class="fatt-riga-totale">0.00</span>
            </span>
            <button type="button" class="app-button tiny red btn-del-riga">
              ✕
            </button>
          </div>
        </div>
      </td>
    `;

    const qtaInput = tr.querySelector(".fatt-riga-quantita");
    const prezzoInput = tr.querySelector(".fatt-riga-prezzo");
    const ivaInput = tr.querySelector(".fatt-riga-iva");
    const btnDel = tr.querySelector(".btn-del-riga");
    const descrInput = tr.querySelector(".fatt-riga-descrizione");

    const handleChange = () => {
      ricalcolaTotaleRiga(tr);
      ricalcolaTotaliFattura();
    };

    if (qtaInput) qtaInput.addEventListener("input", handleChange);
    if (prezzoInput) prezzoInput.addEventListener("input", handleChange);
    if (ivaInput) ivaInput.addEventListener("input", handleChange);

    if (descrInput) {
      const handlerDescr = () => {
        onDescrizioneProdottoChange(tr);
      };
      descrInput.addEventListener("change", handlerDescr);
      descrInput.addEventListener("blur", handlerDescr);
    }

    if (btnDel) {
      btnDel.addEventListener("click", () => {
        tr.remove();
        ricalcolaTotaliFattura();
      });
    }

    fatturaRigheBody.appendChild(tr);
    ricalcolaTotaleRiga(tr);
  }

  function ricalcolaTotaleRiga(tr) {
    const qtaInput = tr.querySelector(".fatt-riga-quantita");
    const prezzoInput = tr.querySelector(".fatt-riga-prezzo");
    const ivaInput = tr.querySelector(".fatt-riga-iva");
    const totaleEl = tr.querySelector(".fatt-riga-totale");

    const qta = parseNumber(qtaInput?.value || "0");
    const prezzo = parseNumber(prezzoInput?.value || "0");
    const ivaPerc = parseNumber(ivaInput?.value || "0");

    const imponibile = qta * prezzo;
    const iva = imponibile * (ivaPerc / 100);
    const totale = imponibile + iva;

    if (totaleEl) {
      totaleEl.textContent = totale.toFixed(2);
    }

    return { imponibile, iva, totale };
  }

  function ricalcolaTotaliFattura() {
    if (!fatturaRigheBody) return;

    let impTot = 0;
    let ivaTot = 0;
    let docTot = 0;

    const rows = Array.from(fatturaRigheBody.querySelectorAll("tr"));
    rows.forEach((tr) => {
      const { imponibile, iva, totale } = ricalcolaTotaleRiga(tr);
      impTot += imponibile;
      ivaTot += iva;
      docTot += totale;
    });

    if (fatturaImponibileTotaleInput)
      fatturaImponibileTotaleInput.value = impTot.toFixed(2);
    if (fatturaIvaTotaleInput)
      fatturaIvaTotaleInput.value = ivaTot.toFixed(2);
    if (fatturaTotaleDocumentoInput)
      fatturaTotaleDocumentoInput.value = docTot.toFixed(2);
  }

  function resetFatturaForm() {
    currentFatturaId = null;

    if (fatturaNumeroInput) fatturaNumeroInput.value = "";
    if (fatturaDataInput) formatDateInputToday(fatturaDataInput);
    if (fatturaFornitoreInput) fatturaFornitoreInput.value = "";
    if (fatturaNoteInput) fatturaNoteInput.value = "";
    if (fatturaImponibileTotaleInput)
      fatturaImponibileTotaleInput.value = "";
    if (fatturaIvaTotaleInput) fatturaIvaTotaleInput.value = "";
    if (fatturaTotaleDocumentoInput)
      fatturaTotaleDocumentoInput.value = "";

    if (fatturaRigheBody) {
      fatturaRigheBody.innerHTML = "";
      creaRigaFattura();
      ricalcolaTotaliFattura();
    }
  }

  async function handleNuovaFattura() {
    resetFatturaForm();
  }

  async function handleSalvaFattura() {
    if (!supabase) return;

    const numero = (fatturaNumeroInput?.value || "").trim();
    const dataDoc = fatturaDataInput?.value || "";
    const fornitoreNome = (fatturaFornitoreInput?.value || "").trim();
    const note = (fatturaNoteInput?.value || "").trim();

    if (!numero) {
      alert("Inserisci il numero della fattura");
      return;
    }
    if (!dataDoc) {
      alert("Inserisci la data della fattura");
      return;
    }
    if (!fornitoreNome) {
      alert("Inserisci il fornitore");
      return;
    }

    await caricaFornitoriInCache();
    const fornitore = await findOrCreateFornitoreByName(fornitoreNome);
    if (!fornitore) return;

    const imponibileTot = parseNumber(
      fatturaImponibileTotaleInput?.value || "0"
    );
    const ivaTot = parseNumber(fatturaIvaTotaleInput?.value || "0");
    const docTot = parseNumber(
      fatturaTotaleDocumentoInput?.value || "0"
    );

    const fatturaPayload = {
      id: currentFatturaId || undefined,
      numero_documento: numero,
      data_documento: dataDoc,
      fornitore_id: fornitore.id,
      note: note || null,
      imponibile_totale: imponibileTot,
      iva_totale: ivaTot,
      totale_documento: docTot,
    };

    const { data: fatturaData, error: fatturaError } = await supabase
      .from("fatture_acquisto")
      .upsert(fatturaPayload)
      .select()
      .single();

    if (fatturaError) {
      console.error("Errore salvataggio fattura:", fatturaError);
      alert("Errore nel salvare la fattura");
      return;
    }

    currentFatturaId = fatturaData.id;

    await supabase
      .from("fatture_acquisto_righe")
      .delete()
      .eq("fattura_id", currentFatturaId);

    const rows = Array.from(fatturaRigheBody?.querySelectorAll("tr") || []);
    const righePayload = [];

    for (const tr of rows) {
      const codiceEl = tr.querySelector(".fatt-riga-codice");
      const descrEl = tr.querySelector(".fatt-riga-descrizione");
      const catEl = tr.querySelector(".fatt-riga-categoria");
      const umEl = tr.querySelector(".fatt-riga-um");
      const qtaEl = tr.querySelector(".fatt-riga-quantita");
      const prezzoEl = tr.querySelector(".fatt-riga-prezzo");
      const ivaEl = tr.querySelector(".fatt-riga-iva");

      const codiceVal = (codiceEl?.value || "").trim();
      const descrVal = (descrEl?.value || "").trim();
      const catVal = (catEl?.value || "").trim();
      const umVal = (umEl?.value || "").trim();
      const qtaVal = parseNumber(qtaEl?.value || "0");
      const prezzoVal = parseNumber(prezzoEl?.value || "0");
      const ivaPercVal = parseNumber(ivaEl?.value || "0");

      if (!descrVal || qtaVal <= 0 || prezzoVal <= 0) {
        continue;
      }

      await caricaCategorieInCache();
      const prodotto = await findOrCreateProdotto({
        codice: codiceVal,
        descrizione: descrVal,
        categoriaNome: catVal,
        um: umVal,
      });
      if (!prodotto) continue;

      const imponibile = qtaVal * prezzoVal;
      const ivaVal = imponibile * (ivaPercVal / 100);
      const totale = imponibile + ivaVal;

      righePayload.push({
        fattura_id: currentFatturaId,
        prodotto_id: prodotto.id,
        codice_prodotto: prodotto.codice_interno,
        descrizione_riga: descrVal,
        quantita: qtaVal,
        um: prodotto.um,
        prezzo_unitario: prezzoVal,
        iva_perc: ivaPercVal,
        imponibile,
        iva: ivaVal,
        totale,
        categoria_id: prodotto.categoria_id || null,
      });
    }

    if (righePayload.length) {
      const { error: righeError } = await supabase
        .from("fatture_acquisto_righe")
        .insert(righePayload);

      if (righeError) {
        console.error("Errore salvataggio righe fattura:", righeError);
        alert("Errore nel salvare le righe della fattura");
        return;
      }
    }

    alert("Fattura salvata correttamente");
    await caricaElencoFatture();
  }

  async function caricaElencoFatture() {
    if (!supabase || !fattureListaBody) return;

    const { data, error } = await supabase
      .from("fatture_acquisto")
      .select(
        "id, numero_documento, data_documento, fornitore_id, totale_documento"
      )
      .order("data_documento", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Errore caricamento fatture:", error);
      alert("Errore nel caricare le fatture");
      return;
    }

    await caricaFornitoriInCache();

    fattureListaBody.innerHTML = "";
    (data || []).forEach((f) => {
      const fornitore = getFornitoreById(f.fornitore_id);
      const tr = document.createElement("tr");
      const dataStr = f.data_documento
        ? new Date(f.data_documento).toLocaleDateString("it-IT")
        : "";
      tr.innerHTML = `
        <td>${dataStr}</td>
        <td>${f.numero_documento || ""}</td>
        <td>${fornitore?.ragione_sociale || ""}</td>
        <td>${f.totale_documento != null ? f.totale_documento.toFixed(2) : ""}</td>
        <td>
          <button class="app-button tiny gray" data-open-fattura="${f.id}">
            Apri
          </button>
        </td>
      `;
      fattureListaBody.appendChild(tr);
    });

    fattureListaBody
      .querySelectorAll("[data-open-fattura]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = parseInt(btn.getAttribute("data-open-fattura"), 10);
          apriFatturaEsistente(id);
        });
      });
  }

  async function apriFatturaEsistente(fatturaId) {
    if (!supabase) return;

    const { data: fattura, error: fatturaError } = await supabase
      .from("fatture_acquisto")
      .select("*")
      .eq("id", fatturaId)
      .single();

    if (fatturaError) {
      console.error("Errore lettura fattura:", fatturaError);
      alert("Errore nel caricare la fattura");
      return;
    }

    currentFatturaId = fattura.id;

    if (fatturaNumeroInput)
      fatturaNumeroInput.value = fattura.numero_documento || "";
    if (fatturaDataInput)
      fatturaDataInput.value = fattura.data_documento
        ? fattura.data_documento.substring(0, 10)
        : "";
    if (fatturaFornitoreInput) {
      await caricaFornitoriInCache();
      const forn = getFornitoreById(fattura.fornitore_id);
      fatturaFornitoreInput.value = forn?.ragione_sociale || "";
    }
    if (fatturaNoteInput) fatturaNoteInput.value = fattura.note || "";
    if (fatturaImponibileTotaleInput)
      fatturaImponibileTotaleInput.value =
        fattura.imponibile_totale != null
          ? fattura.imponibile_totale.toFixed(2)
          : "";
    if (fatturaIvaTotaleInput)
      fatturaIvaTotaleInput.value =
        fattura.iva_totale != null ? fattura.iva_totale.toFixed(2) : "";
    if (fatturaTotaleDocumentoInput)
      fatturaTotaleDocumentoInput.value =
        fattura.totale_documento != null
          ? fattura.totale_documento.toFixed(2)
          : "";

    const { data: righe, error: righeError } = await supabase
      .from("fatture_acquisto_righe")
      .select("*")
      .eq("fattura_id", fatturaId)
      .order("id", { ascending: true });

    if (righeError) {
      console.error("Errore caricamento righe fattura:", righeError);
      alert("Errore nel caricare le righe della fattura");
      return;
    }

    if (fatturaRigheBody) {
      fatturaRigheBody.innerHTML = "";
      (righe || []).forEach((r) => {
        const categoria = r.categoria_id
          ? getCategoriaById(r.categoria_id)?.nome || ""
          : "";
        creaRigaFattura({
          codice_prodotto: r.codice_prodotto,
          descrizione_riga: r.descrizione_riga,
          categoria_nome: categoria,
          um: r.um,
          quantita: r.quantita,
          prezzo_unitario: r.prezzo_unitario,
          iva_perc: r.iva_perc,
        });
      });
      ricalcolaTotaliFattura();
    }
  }

  if (btnAddRigaFattura) {
    btnAddRigaFattura.addEventListener("click", () => {
      creaRigaFattura();
      ricalcolaTotaliFattura();
    });
  }

  if (btnNuovaFattura) {
    btnNuovaFattura.addEventListener("click", () => {
      handleNuovaFattura();
    });
  }

  if (btnSalvaFattura) {
    btnSalvaFattura.addEventListener("click", () => {
      handleSalvaFattura();
    });
  }

  if (btnToggleFatture && fattureTable) {
    btnToggleFatture.addEventListener("click", () => {
      const vis = fattureTable.style.display !== "none";
      fattureTable.style.display = vis ? "none" : "table";
    });
  }

/* ========================================================= */
/* ======================= MAGAZZINO ======================== */
/* ========================================================= */

// DOM già dichiarati sopra:
// const magazzinoForm = document.getElementById("magazzino-form");
// const magazzinoIdInput = document.getElementById("magazzino-id");
// const magazzinoDescrInput = document.getElementById("magazzino-descrizione");
// const magazzinoCategoriaInput = document.getElementById("magazzino-categoria");
// const magazzinoUmInput = document.getElementById("magazzino-um");
// const magazzinoIvaInput = document.getElementById("magazzino-iva");
// const magazzinoScortaMinimaInput = document.getElementById("magazzino-scorta-minima");
// const magazzinoGiacenzaInput = document.getElementById("magazzino-giacenza");
// const btnMagazzinoSalva = document.getElementById("btn-magazzino-salva");
// const btnMagazzinoNuovo = document.getElementById("btn-magazzino-nuovo");

const magazzinoTable = document.getElementById("magazzino-table");
const magazzinoListaBody = document.getElementById("magazzino-lista");
const magazzinoSearchInput = document.getElementById("magazzino-search");
const magazzinoSuggestions = document.getElementById("magazzino-suggestions");

// Usa gia' magazzinoDati globale
// let magazzinoDati = [];

// --------- SUGGERIMENTI ---------
function aggiornaMagazzinoSuggestions() {
  if (!magazzinoSuggestions) return;

  magazzinoSuggestions.innerHTML = magazzinoDati
    .map(
      (p) =>
        `<option value="${(p.descrizione || "")
          .replace(/"/g, "&quot;")}"></option>`
    )
    .join("");
}

function aggiornaIngredientiSuggestionsDaMagazzino() {
  if (!ingredientiSuggestions) return;

  ingredientiSuggestions.innerHTML = magazzinoDati
    .map(
      (p) =>
        `<option value="${(p.descrizione || "")
          .replace(/"/g, "&quot;")}"></option>`
    )
    .join("");
}

// --------- RENDER TABELLA ---------
function renderMagazzinoLista(lista) {
  if (!magazzinoListaBody || !magazzinoTable) return;

  if (!lista || !lista.length) {
    magazzinoTable.style.display = "none";
    magazzinoListaBody.innerHTML = "";
    return;
  }

  magazzinoTable.style.display = "table";

  magazzinoListaBody.innerHTML = lista
    .map(
      (p) => `
      <tr data-id="${p.id}">
        <td>${p.codice || ""}</td>
        <td>${p.descrizione || ""}</td>
        <td>${p.categoriaNome || ""}</td>
        <td>${(p.stock || 0).toFixed(3)}</td>
      </tr>
    `
    )
    .join("");

  magazzinoListaBody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("click", () => {
      const id = parseInt(row.dataset.id, 10);
      const prod = magazzinoDati.find((p) => p.id === id);
      popolaMagazzinoForm(prod || null);
    });
  });
}

// --------- POPOLA FORM ---------
function popolaMagazzinoForm(prod) {
  if (!magazzinoForm) return;

  if (!prod) {
    magazzinoIdInput.value = "";
    magazzinoDescrInput.value = "";
    magazzinoCategoriaInput.value = "";
    magazzinoUmInput.value = "";
    magazzinoIvaInput.value = "";
    magazzinoScortaMinimaInput.value = "";
    magazzinoGiacenzaInput.value = "";
    return;
  }

  magazzinoIdInput.value = prod.id;
  magazzinoDescrInput.value = prod.descrizione || "";
  magazzinoCategoriaInput.value = prod.categoriaNome || "";
  magazzinoUmInput.value = prod.um || "";
  magazzinoIvaInput.value = prod.iva != null ? prod.iva : "";
  magazzinoScortaMinimaInput.value =
    prod.scortaMinima != null ? prod.scortaMinima : "";
  magazzinoGiacenzaInput.value =
    prod.stock != null ? prod.stock.toFixed(3) : "";
}

// --------- CARICA MAGAZZINO COMPLETO ---------
async function caricaMagazzinoDati() {
  if (!supabase) return;

  // assicuro cache categorie piena
  await caricaCategorieInCache();

  const { data, error } = await supabase
    .from("prodotti")
    .select(
      "id, codice_interno, descrizione, um, categoria_id, scorta_minima, iva_perc"
    )
    .order("descrizione", { ascending: true });

  if (error) {
    console.error("Errore caricamento magazzino:", error);
    alert("Errore nel caricare i prodotti di magazzino");
    return;
  }

  // Giacenze da righe fatture (solo carichi, per ora)
  const { data: righe, error: righeError } = await supabase
    .from("fatture_acquisto_righe")
    .select("prodotto_id, quantita");

  if (righeError) {
    console.error("Errore lettura movimenti magazzino:", righeError);
  }

  const giacenzeMap = {};
  (righe || []).forEach((r) => {
    if (!r.prodotto_id) return;
    const q = parseNumber(r.quantita);
    giacenzeMap[r.prodotto_id] = (giacenzeMap[r.prodotto_id] || 0) + q;
  });

  magazzinoDati = (data || []).map((r) => {
    const cat = categorieCache.find((c) => c.id === r.categoria_id) || null;

    return {
      id: r.id,
      codice: r.codice_interno,
      descrizione: r.descrizione,
      um: r.um,
      categoriaNome: cat ? cat.nome : "",
      scortaMinima: r.scorta_minima,
      iva: r.iva_perc,
      stock: giacenzeMap[r.id] || 0,
    };
  });

  renderMagazzinoLista(magazzinoDati);
  aggiornaMagazzinoSuggestions();
  aggiornaIngredientiSuggestionsDaMagazzino();
}

// --------- SALVA PRODOTTO DA FORM ---------
async function salvaProdottoDaMagazzinoForm() {
  if (!supabase) return;

  const id = magazzinoIdInput.value
    ? parseInt(magazzinoIdInput.value, 10)
    : null;
  const descr = (magazzinoDescrInput.value || "").trim();
  const catNome = (magazzinoCategoriaInput.value || "").trim();
  const umVal = (magazzinoUmInput.value || "").trim();
  const scortaVal = parseNumber(magazzinoScortaMinimaInput.value);
  const ivaVal = parseNumber(magazzinoIvaInput.value);

  if (!descr) {
    alert("Inserisci la descrizione del prodotto.");
    return;
  }

  let categoriaId = null;
  if (catNome) {
    const cat = await findOrCreateCategoriaByNome(catNome);
    if (cat) categoriaId = cat.id;
  }

  // --- NUOVO PRODOTTO ---
  if (!id) {
    const codice = await generaCodiceInternoAutomatico(
      catNome || descr || "GEN"
    );

    const { data, error } = await supabase
      .from("prodotti")
      .insert({
        codice_interno: codice,
        descrizione: descr,
        categoria_id: categoriaId,
        um: umVal || null,
        scorta_minima: scortaVal || null,
        iva_perc: ivaVal || null,
        attivo: true,
      })
      .select(
        "id, codice_interno, descrizione, categoria_id, um, scorta_minima, iva_perc"
      )
      .single();

    if (error) {
      console.error("Errore creazione prodotto:", error);
      alert("Errore nel salvataggio prodotto: " + error.message);
      return;
    }

    const cat = categorieCache.find((c) => c.id === data.categoria_id) || null;

    const nuovo = {
      id: data.id,
      codice: data.codice_interno,
      descrizione: data.descrizione,
      um: data.um,
      categoriaNome: cat ? cat.nome : "",
      scortaMinima: data.scorta_minima,
      iva: data.iva_perc,
      stock: 0,
    };

    magazzinoDati.push(nuovo);
    renderMagazzinoLista(magazzinoDati);
    aggiornaMagazzinoSuggestions();
    aggiornaIngredientiSuggestionsDaMagazzino();
    popolaMagazzinoForm(nuovo);

    alert("Prodotto creato.");
    return;
  }

  // --- UPDATE PRODOTTO ---
  const { data, error } = await supabase
    .from("prodotti")
    .update({
      descrizione: descr,
      categoria_id: categoriaId,
      um: umVal || null,
      scorta_minima: scortaVal || null,
      iva_perc: ivaVal || null,
    })
    .eq("id", id)
    .select(
      "id, codice_interno, descrizione, categoria_id, um, scorta_minima, iva_perc"
    )
    .single();

  if (error) {
    console.error("Errore aggiornamento prodotto:", error);
    alert("Errore nel salvataggio prodotto: " + error.message);
    return;
  }

  const cat = categorieCache.find((c) => c.id === data.categoria_id) || null;

  const idx = magazzinoDati.findIndex((p) => p.id === id);
  const stockAttuale = idx >= 0 ? magazzinoDati[idx].stock || 0 : 0;

  const aggiornato = {
    id: data.id,
    codice: data.codice_interno,
    descrizione: data.descrizione,
    um: data.um,
    categoriaNome: cat ? cat.nome : "",
    scortaMinima: data.scorta_minima,
    iva: data.iva_perc,
    stock: stockAttuale,
  };

  if (idx >= 0) {
    magazzinoDati[idx] = aggiornato;
  } else {
    magazzinoDati.push(aggiornato);
  }

  renderMagazzinoLista(magazzinoDati);
  aggiornaMagazzinoSuggestions();
  aggiornaIngredientiSuggestionsDaMagazzino();
  popolaMagazzinoForm(aggiornato);

  alert("Prodotto aggiornato.");
}

// --------- EVENTI UI MAGAZZINO ---------
if (btnMagazzinoNuovo) {
  btnMagazzinoNuovo.addEventListener("click", () => {
    popolaMagazzinoForm(null);
  });
}

if (btnMagazzinoSalva) {
  btnMagazzinoSalva.addEventListener("click", () => {
    salvaProdottoDaMagazzinoForm();
  });
}

// Filtro ricerca tabella
if (magazzinoSearchInput) {
  magazzinoSearchInput.addEventListener("input", () => {
    const q = (magazzinoSearchInput.value || "").trim().toLowerCase();
    if (!q) {
      renderMagazzinoLista(magazzinoDati);
      return;
    }
    const filtrati = magazzinoDati.filter((p) =>
      (p.descrizione || "").toLowerCase().includes(q)
    );
    renderMagazzinoLista(filtrati);
  });
}
/* ========================================================= */
/* ======================= REPORT KPI ======================= */
/* ========================================================= */

const reportDataInput = document.getElementById("report-data");
const reportPeriodButtons = document.querySelectorAll(".report-period-btn");

const kpiIncassoInput = document.getElementById("kpi-incasso-input");
const kpiFoodcostInput = document.getElementById("kpi-foodcost-input");

const kpiIncassoValueEl = document.getElementById("kpi-incasso-value");
const kpiNettoValueEl = document.getElementById("kpi-netto-value");
const kpiMargineBadge = document.getElementById("kpi-margine-badge");
const kpiGaugeNeedle = document.getElementById("kpi-gauge-needle");
const kpiBepLabel = document.getElementById("kpi-bep-label");

const kpiLavoroImportoEl = document.getElementById("kpi-lavoro-importo");
const kpiLavoroPercentEl = document.getElementById("kpi-lavoro-percent");
const kpiFoodImportoEl = document.getElementById("kpi-food-importo");
const kpiFoodPercentEl = document.getElementById("kpi-food-percent");
const kpiFissiImportoEl = document.getElementById("kpi-fissi-importo");
const kpiFissiPercentEl = document.getElementById("kpi-fissi-percent");

const btnToggleCostiFissi = document.getElementById("btn-toggle-costi-fissi");
const costiFissiPanel = document.getElementById("costi-fissi-panel");

const costiFissiCategoriaInput = document.getElementById(
  "costi-fissi-categoria"
);
const costiFissiDescrizioneInput = document.getElementById(
  "costi-fissi-descrizione"
);
const costiFissiAnnoInput = document.getElementById("costi-fissi-anno");
const costiFissiImportoInput = document.getElementById("costi-fissi-importo");
const btnSalvaCostoFisso = document.getElementById("btn-salva-costo-fisso");
const costiFissiListaBody = document.getElementById("costi-fissi-lista");

let kpiPeriodoCorrente = "giorno"; // giorno | settimana | mese | anno
let costiFissiCache = [];

// --------- Utility formato € ---------
function formatEuro(val) {
  const n = parseNumber(val);
  return (
    n.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "\u00A0€"
  );
}

// --------- COSTI FISSI ---------
async function caricaCostiFissiDaSupabase() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from("costi_fissi")
    .select("id, categoria, descrizione, anno, importo_annuo")
    .order("anno", { ascending: true });

  if (error) {
    console.error("Errore caricamento costi fissi:", error);
    // niente alert: non blocco l'app
    return;
  }

  costiFissiCache = data || [];
  renderCostiFissiLista();
}

function renderCostiFissiLista() {
  if (!costiFissiListaBody) return;

  if (!costiFissiCache.length) {
    costiFissiListaBody.innerHTML = `
      <tr>
        <td colspan="4">Nessun costo fisso registrato.</td>
      </tr>
    `;
    return;
  }

  costiFissiListaBody.innerHTML = costiFissiCache
    .map(
      (c) => `
      <tr>
        <td>${c.categoria || ""}</td>
        <td>${c.descrizione || ""}</td>
        <td>${c.anno || ""}</td>
        <td>${c.importo_annuo != null ? formatEuro(c.importo_annuo) : ""}</td>
      </tr>
    `
    )
    .join("");
}

async function salvaCostoFisso() {
  if (!supabase) return;

  const categoria = (costiFissiCategoriaInput?.value || "").trim();
  const descrizione = (costiFissiDescrizioneInput?.value || "").trim();
  const anno = parseInt(costiFissiAnnoInput?.value || "0", 10);
  const importo = parseNumber(costiFissiImportoInput?.value || "0");

  if (!categoria || !anno || !importo) {
    alert("Compila categoria, anno e importo annuo.");
    return;
  }

  const payload = {
    categoria,
    descrizione: descrizione || null,
    anno,
    importo_annuo: importo,
  };

  const { error } = await supabase.from("costi_fissi").insert(payload);

  if (error) {
    console.error("Errore salvataggio costo fisso:", error);
    alert("Errore nel salvare il costo fisso");
    return;
  }

  // reset form
  if (costiFissiCategoriaInput) costiFissiCategoriaInput.value = "";
  if (costiFissiDescrizioneInput) costiFissiDescrizioneInput.value = "";
  if (costiFissiAnnoInput) costiFissiAnnoInput.value = "";
  if (costiFissiImportoInput) costiFissiImportoInput.value = "";

  await caricaCostiFissiDaSupabase();
  alert("Costo fisso salvato.");
}

function calcolaQuotaCostiFissi(periodo, annoRif) {
  if (!annoRif) return 0;
  const totaleAnnuo = costiFissiCache
    .filter((c) => parseInt(c.anno, 10) === annoRif)
    .reduce((sum, c) => sum + parseNumber(c.importo_annuo), 0);

  if (!totaleAnnuo) return 0;

  switch (periodo) {
    case "giorno":
      return totaleAnnuo / 365;
    case "settimana":
      return totaleAnnuo / 52;
    case "mese":
      return totaleAnnuo / 12;
    case "anno":
      return totaleAnnuo;
    default:
      return totaleAnnuo;
  }
}

// --------- KPI (incasso / food / fissi) ---------
// Per ora il "lavoro" è messo a 0 (potrai in futuro agganciarlo alle timbrature)

function aggiornaKpi() {
  if (!kpiIncassoInput || !kpiFoodcostInput) return;

  const incasso = parseNumber(kpiIncassoInput.value || "0");
  const food = parseNumber(kpiFoodcostInput.value || "0");
  const lavoro = 0; // TODO: aggancio futuro alle timbrature
  const dataRifStr = reportDataInput?.value;
  const dataRif = dataRifStr ? new Date(dataRifStr) : new Date();
  const annoRif = dataRif.getFullYear();

  const fissi = calcolaQuotaCostiFissi(kpiPeriodoCorrente, annoRif);
  const costiTotali = lavoro + food + fissi;
  const netto = incasso - costiTotali;

  // valori principali
  if (kpiIncassoValueEl) kpiIncassoValueEl.textContent = formatEuro(incasso);
  if (kpiNettoValueEl) kpiNettoValueEl.textContent = formatEuro(netto);

  // badge margine
  if (kpiMargineBadge) {
    kpiMargineBadge.classList.add("kpi-margine-badge");
    kpiMargineBadge.classList.remove("pos", "neg");

    if (netto >= 0) {
      kpiMargineBadge.classList.add("pos");
    } else {
      kpiMargineBadge.classList.add("neg");
    }
    kpiMargineBadge.textContent = `Margine ${formatEuro(netto)}`;
  }

  // BEP = somma costi (lavoro + food + fissi)
  const bep = costiTotali > 0 ? costiTotali : 0;
  if (kpiBepLabel) {
    kpiBepLabel.textContent = `BEP ${formatEuro(bep)}`;
  }

  // Ago della "mezza luna"
  if (kpiGaugeNeedle) {
    if (bep <= 0 || incasso <= 0) {
      kpiGaugeNeedle.style.transform = "rotate(-90deg)";
    } else {
      const ratio = incasso / bep; // 1 = BEP
      const clamped = Math.max(0, Math.min(2, ratio)); // 0..2
      // -90° (0) -> 0° (BEP) -> +90° (2x BEP)
      const angle = -90 + clamped * 90;
      kpiGaugeNeedle.style.transform = `rotate(${angle}deg)`;
    }
  }

  // Breakdown % sul totale incasso (se > 0)
  const base = incasso > 0 ? incasso : 1;

  const percLavoro = (lavoro / base) * 100;
  const percFood = (food / base) * 100;
  const percFissi = (fissi / base) * 100;

  if (kpiLavoroImportoEl)
    kpiLavoroImportoEl.textContent = formatEuro(lavoro);
  if (kpiLavoroPercentEl)
    kpiLavoroPercentEl.textContent = `${percLavoro.toFixed(1)}%`;

  if (kpiFoodImportoEl) kpiFoodImportoEl.textContent = formatEuro(food);
  if (kpiFoodPercentEl)
    kpiFoodPercentEl.textContent = `${percFood.toFixed(1)}%`;

  if (kpiFissiImportoEl) kpiFissiImportoEl.textContent = formatEuro(fissi);
  if (kpiFissiPercentEl)
    kpiFissiPercentEl.textContent = `${percFissi.toFixed(1)}%`;
}

// --------- EVENTI REPORT ---------
if (btnToggleCostiFissi && costiFissiPanel) {
  btnToggleCostiFissi.addEventListener("click", () => {
    const vis = costiFissiPanel.style.display !== "none";
    costiFissiPanel.style.display = vis ? "none" : "block";
  });
}

if (btnSalvaCostoFisso) {
  btnSalvaCostoFisso.addEventListener("click", () => {
    salvaCostoFisso();
  });
}

if (kpiIncassoInput) {
  kpiIncassoInput.addEventListener("input", aggiornaKpi);
}
if (kpiFoodcostInput) {
  kpiFoodcostInput.addEventListener("input", aggiornaKpi);
}
if (reportDataInput) {
  reportDataInput.addEventListener("change", aggiornaKpi);
}

if (reportPeriodButtons && reportPeriodButtons.length) {
  reportPeriodButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const period = btn.getAttribute("data-period") || "giorno";
      kpiPeriodoCorrente = period;

      // toggle classe active
      reportPeriodButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      aggiornaKpi();
    });
  });
}

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
        if (hashRoute === "timbratura" || hashRoute === "ricette-viewer") {
          showOnlyView(`view-${hashRoute}`);
          await onRouteEnter(hashRoute);
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
