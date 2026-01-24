document.addEventListener("DOMContentLoaded", async () => {

  // ===========================================================
  // ========== 0. BOOTSTRAP & STATO GLOBALE ====================
  // ===========================================================

  // --- SUPABASE ---
  const supabase = window.supabaseClient;
  if (!supabase) {
    alert("Supabase non inizializzato");
    return;
  }

  // --- STATO UTENTE ---
  let currentUser = null;
  let currentView = null;

  // --- ID CORRENTI ---
  let ricettaCorrenteId = null;
  let ricettaFotoCorrenteUrl = null;
  let currentFatturaId = null;
  let currentPreventivoId = null;

  // --- CACHE DATI ---
  let dipendentiCache = [];
  let timbratureCache = [];
  let ricetteCache = [];
  let magazzinoDati = [];
  let fornitoriCache = [];
  let categorieCache = [];
  let prepProdotti = [];

  // --- FLAG DI CONTROLLO ---
  let ricetteCaricate = false;
  let magazzinoCaricato = false;

    // ===========================================================
  // ========== 1. QUERY DOM (TUTTI GLI ELEMENTI) ===============
  // ===========================================================

  // -----------------------------------------------------------
  // HEADER / GENERALE
  // -----------------------------------------------------------
  const btnTheme = document.getElementById("btn-theme");
  const btnLogout = document.getElementById("btn-logout");
  const currentUserLabel = document.getElementById("current-user-label");

  const allViews = document.querySelectorAll(".view");
  const routeButtons = document.querySelectorAll("[data-route]");

  // -----------------------------------------------------------
  // LOGIN
  // -----------------------------------------------------------
  const viewLogin = document.getElementById("view-login");
  const loginNomeInput = document.getElementById("login-nome");
  const loginPinInput = document.getElementById("login-pin");
  const loginRememberCheckbox = document.getElementById("login-remember");
  const btnLogin = document.getElementById("btn-login");

  // -----------------------------------------------------------
  // HOME DIPENDENTE / MENU MANAGER
  // -----------------------------------------------------------
  const viewHomeDip = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");

  // -----------------------------------------------------------
  // TIMBRATURA
  // -----------------------------------------------------------
  const viewTimbratura = document.getElementById("view-timbratura");
  const timbraturaUtenteNome = document.getElementById("timbratura-utente-nome");
  const timbraturaCanaleSelect = document.getElementById("timbratura-canale-select");

  const btnEntra = document.getElementById("btn-entra");
  const btnPausa = document.getElementById("btn-pausa");
  const btnEsci = document.getElementById("btn-esci");

  const btnTogglePresenze = document.getElementById("btn-toggle-presenze");
  const sezionePresenze = document.getElementById("sezione-presenze");
  const presenzeLista = document.getElementById("presenze-lista");

  // -----------------------------------------------------------
  // DIPENDENTI
  // -----------------------------------------------------------
  const viewDipendenti = document.getElementById("view-dipendenti");

  const dipNomeInput = document.getElementById("dip-nome");
  const dipMansioneInput = document.getElementById("dip-mansione");
  const dipDataNascitaInput = document.getElementById("dip-data-nascita");
  const dipResidenzaInput = document.getElementById("dip-residenza");
  const dipTelefonoInput = document.getElementById("dip-telefono");
  const dipEmailInput = document.getElementById("dip-email");
  const dipRuoloSelect = document.getElementById("dip-ruolo");

  const dipTipoCompensoSelect = document.getElementById("dip-tipo-compenso");
  const labelRetribuzioneBase = document.getElementById("label-retribuzione-base");
  const dipRetribuzioneBaseInput = document.getElementById("dip-retribuzione-base");

  const rowOreMensili = document.getElementById("row-ore-mensili");
  const dipOreMensiliInput = document.getElementById("dip-ore-mensili");

  const rowOreServizio = document.getElementById("row-ore-servizio");
  const dipOreServizioInput = document.getElementById("dip-ore-servizio");

  const dipCostoInput = document.getElementById("dip-costo");
  const dipCodiceInput = document.getElementById("dip-codice");
  const dipCanaleSelect = document.getElementById("dip-canale");
  const dipAttivoCheckbox = document.getElementById("dip-attivo");

  const btnAddDipendente = document.getElementById("btn-add-dip");
  const dipendentiLista = document.getElementById("dipendenti-lista");

  // -----------------------------------------------------------
  // RICETTE (EDITOR)
  // -----------------------------------------------------------
  const viewRicette = document.getElementById("view-ricette");

  const ricettaTipoSelect = document.getElementById("ricetta-tipo");
  const ricettaNomeInput = document.getElementById("ricetta-nome");
  const ricettaDescrizioneInput = document.getElementById("ricetta-descrizione");
  const ricettaNoteInput = document.getElementById("ricetta-note");
  const ricettaFotoInput = document.getElementById("ricetta-foto");

  const ricettaPezziBaseInput = document.getElementById("ricetta-pezzi-base");

  const ricettaFormato1LabelInput = document.getElementById("ricetta-formato1-label");
  const ricettaFormato1PercInput = document.getElementById("ricetta-formato1-percent");
  const ricettaFormato1PezziOut = document.getElementById("ricetta-formato1-pezzi");

  const ricettaFormato2LabelInput = document.getElementById("ricetta-formato2-label");
  const ricettaFormato2PercInput = document.getElementById("ricetta-formato2-percent");
  const ricettaFormato2PezziOut = document.getElementById("ricetta-formato2-pezzi");

  const ricettaIngredientiContainer = document.getElementById("ricetta-ingredienti-container");
  const ingredientiSuggestions = document.getElementById("ingredienti-suggestions");

  const btnAddIngrediente = document.getElementById("btn-add-ingrediente");
  const btnSalvaRicetta = document.getElementById("btn-salva-ricetta");

  // OUTPUT RICETTA
  const ricettaOutputBody = document.getElementById("ricetta-output-body");
  const btnAddOutput = document.getElementById("btn-add-output");

  // -----------------------------------------------------------
  // RICETTARIO (VIEWER)
  // -----------------------------------------------------------
  const viewRicetteViewer = document.getElementById("view-ricette-viewer");
  const ricetteSearchInput = document.getElementById("ricette-search");
  const ricetteListaViewer = document.getElementById("ricette-lista-viewer");
  const ricetteFiltri = document.getElementById("ricette-filtri");

  // -----------------------------------------------------------
  // PRODUZIONE
  // -----------------------------------------------------------
  const viewProduzione = document.getElementById("view-produzione");

  const produzioneRigheContainer = document.getElementById("produzione-righe");
  const produzioneDataInput = document.getElementById("produzione-data");
  const produzioneNoteInput = document.getElementById("produzione-note");
  const produzioneLottoInput = document.getElementById("produzione-lotto");
  const produzioneLuogoSelect = document.getElementById("produzione-luogo"); // può essere null

  const btnAddRigaProduzione = document.getElementById("btn-add-riga-produzione");
  const btnSalvaSchedaProduzione = document.getElementById("btn-salva-scheda-produzione");

  // -----------------------------------------------------------
  // MAGAZZINO PREPARAZIONI
  // -----------------------------------------------------------
  const viewMagazzinoPreparazioni = document.getElementById("view-magazzino-preparazioni");
  const prepSearchInput = document.getElementById("prep-search");
  const prepSuggestionsBox = document.getElementById("prep-suggestions");
  const prepCardSingola = document.getElementById("prep-card-singola");
  const prepDettaglioLotti = document.getElementById("prep-dettaglio-lotti");

  // -----------------------------------------------------------
  // ACQUISTI / FATTURE
  // -----------------------------------------------------------
  const viewAcquisti = document.getElementById("view-acquisti");

  const fatturaNumeroInput = document.getElementById("fattura-numero");
  const fatturaDataInput = document.getElementById("fattura-data");
  const fatturaFornitoreInput = document.getElementById("fattura-fornitore");
  const fatturaNoteInput = document.getElementById("fattura-note");

  const btnNuovaFattura = document.getElementById("btn-nuova-fattura");
  const btnSalvaFattura = document.getElementById("btn-salva-fattura");
  const btnAddRigaFattura = document.getElementById("btn-add-riga-fattura");

  const fatturaRigheBody = document.getElementById("fattura-righe-body");

  const fatturaImponibileTotaleInput = document.getElementById("fattura-imponibile-totale");
  const fatturaIvaTotaleInput = document.getElementById("fattura-iva-totale");
  const fatturaTotaleDocumentoInput = document.getElementById("fattura-totale-documento");

  const btnToggleFatture = document.getElementById("btn-toggle-fatture");
  const fattureTable = document.getElementById("fatture-table");
  const fattureListaBody = document.getElementById("fatture-lista");

  // -----------------------------------------------------------
  // MAGAZZINO
  // -----------------------------------------------------------
  const viewMagazzino = document.getElementById("view-magazzino");

  const magazzinoSearchInput = document.getElementById("magazzino-search");
  const magazzinoSuggestions = document.getElementById("magazzino-suggestions");
  const magazzinoTable = document.getElementById("magazzino-table");
  const magazzinoListaEl = document.getElementById("magazzino-lista");

  const magazzinoIdInput = document.getElementById("magazzino-id");
  const magazzinoDescrInput = document.getElementById("magazzino-descrizione");
  const magazzinoCategoriaInput = document.getElementById("magazzino-categoria");
  const magazzinoUmInput = document.getElementById("magazzino-um");
  const magazzinoScortaMinimaInput = document.getElementById("magazzino-scorta-minima");
  const magazzinoGiacenzaInput = document.getElementById("magazzino-giacenza");

  const btnMagazzinoSalva = document.getElementById("btn-magazzino-salva");
  const btnMagazzinoNuovo = document.getElementById("btn-magazzino-nuovo");

  // -----------------------------------------------------------
  // PREVENTIVI / REPORT / VENDUTO
  // (query ora, logica nei settori successivi)
  // -----------------------------------------------------------
  const viewPreventivi = document.getElementById("view-preventivi");
  const viewReport = document.getElementById("view-report");
  const viewVenduto = document.getElementById("view-venduto");
  // ===========================================================
  // ========== 2. UTILS GENERALI & VIEW =======================
  // ===========================================================

  // -----------------------------------------------------------
  // FORMAT & PARSE
  // -----------------------------------------------------------
  function parseNumber(val) {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }

  function formatDateInputToday(input) {
    if (!input) return;
    const today = new Date().toISOString().slice(0, 10);
    input.value = today;
  }

  function formatDateIT(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("it-IT");
  }

  // -----------------------------------------------------------
  // RUOLI
  // -----------------------------------------------------------
  function isManagerRole(ruolo) {
    return (
      ruolo === "admin" ||
      ruolo === "manager_cucina" ||
      ruolo === "manager_sala"
    );
  }

  // -----------------------------------------------------------
  // VISIBILITÀ VIEW
  // -----------------------------------------------------------
  function showOnlyView(viewId) {
    allViews.forEach((v) => {
      v.style.display = "none";
    });

    const el = document.getElementById(viewId);
    if (el) {
      el.style.display = "block";
      currentView = viewId;
    }
  }

  function showLogin() {
    if (managerMenu) managerMenu.style.display = "none";
    if (viewHomeDip) viewHomeDip.style.display = "none";
    showOnlyView("view-login");
  }

  function showHomeDipendente() {
    if (managerMenu) managerMenu.style.display = "none";
    showOnlyView("view-home-dip");
  }

  function showManagerMenuAndRoute(route) {
    if (managerMenu) managerMenu.style.display = "grid";
    navigateTo(route || "timbratura");
  }

  // -----------------------------------------------------------
  // VISIBILITÀ PER RUOLO (data-manager-only)
  // -----------------------------------------------------------
  function applyRoleVisibility() {
    if (!currentUser) return;

    const isManager = isManagerRole(currentUser.ruolo);

    document
      .querySelectorAll("[data-manager-only]")
      .forEach((el) => {
        const onlyManager = el.getAttribute("data-manager-only") === "true";
        el.style.display =
          onlyManager && !isManager ? "none" : "";
      });
  }

  // -----------------------------------------------------------
  // ROUTE NORMALIZATION
  // -----------------------------------------------------------
  function normalizeRoute(raw) {
    if (!raw) return "timbratura";

    let r = String(raw).replace(/^#/, "");

    if (r.startsWith("view-")) {
      r = r.slice("view-".length);
    }

    return r || "timbratura";
  }
  // ===========================================================
  // ========== 3. AUTENTICAZIONE & SESSIONE ===================
  // ===========================================================

  const CURRENT_USER_KEY = "ga_current_user_v1";

  // -----------------------------------------------------------
  // STATO SESSIONE
  // -----------------------------------------------------------
currentUser = null;

  // -----------------------------------------------------------
  // HEADER UTENTE
  // -----------------------------------------------------------
  function updateHeaderUser() {
    if (!currentUserLabel) return;

    if (!currentUser) {
      currentUserLabel.textContent = "Nessun utente";
      if (btnLogout) btnLogout.style.display = "none";
      return;
    }

    const ruolo =
      currentUser.ruolo && currentUser.ruolo !== ""
        ? currentUser.ruolo.replace("_", " ")
        : "dipendente";

    currentUserLabel.textContent = `${currentUser.nome} (${ruolo})`;
    if (btnLogout) btnLogout.style.display = "inline-block";
  }

  // -----------------------------------------------------------
  // SET / CLEAR UTENTE
  // -----------------------------------------------------------
  function setCurrentUser(user, persist) {
    currentUser = {
      id: user.id ?? null,
      nome: user.nome,
      ruolo: user.ruolo || "",
      canalePrevalente: user.canalePrevalente || "NR",
      virtualAdmin: !!user.virtualAdmin,
    };

    if (persist) {
      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(currentUser)
      );
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }

    updateHeaderUser();
    applyRoleVisibility();
  }

  function clearCurrentUser() {
    currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    updateHeaderUser();
  }

  // -----------------------------------------------------------
  // RESTORE DA LOCAL STORAGE
  // -----------------------------------------------------------
  function restoreUserFromStorage() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);
      if (!saved) return;

      // admin virtuale
      if (saved.virtualAdmin) {
        currentUser = saved;
        updateHeaderUser();
        applyRoleVisibility();
        return;
      }

      const found = dipendenti.find((d) => d.id === saved.id);
      if (found) {
        setCurrentUser(found, true);
      }
    } catch {
      console.warn("Restore utente fallito");
    }
  }

  // -----------------------------------------------------------
  // LOGIN
  // -----------------------------------------------------------
  async function handleLogin() {
    const nome = (loginNomeInput?.value || "").trim();
    const pin = (loginPinInput?.value || "").trim();
    const remember = loginRememberInput?.checked || false;

    if (!nome || !pin) {
      alert("Inserisci nome e PIN");
      return;
    }

    if (!dipendenti.length) {
      await caricaDipendentiDaSupabase();
    }

    // ADMIN VIRTUALE
    if (nome.toLowerCase() === "admin" && pin === "9999") {
      setCurrentUser(
        {
          nome: "Admin",
          ruolo: "admin",
          canalePrevalente: "NR",
          virtualAdmin: true,
        },
        remember
      );

      showManagerMenuAndRoute("timbratura");
      return;
    }

    // DIPENDENTE REALE
    const dip = dipendenti.find(
      (d) =>
        d.attivo &&
        d.nome?.toLowerCase() === nome.toLowerCase() &&
        String(d.codice) === pin
    );

    if (!dip) {
      alert("Nome o PIN non corretti");
      return;
    }

    setCurrentUser(dip, remember);

    if (isManagerRole(dip.ruolo)) {
      showManagerMenuAndRoute("timbratura");
    } else {
      showHomeDipendente();
    }
  }

  // -----------------------------------------------------------
  // LOGOUT
  // -----------------------------------------------------------
  function handleLogout() {
    clearCurrentUser();
    showLogin();
  }

  // -----------------------------------------------------------
  // EVENTI
  // -----------------------------------------------------------
  if (btnLogin) {
    btnLogin.addEventListener("click", handleLogin);
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", handleLogout);
  }
  // ===========================================================
  // ========== 4. ROUTING & NAVIGAZIONE =======================
  // ===========================================================

  // -----------------------------------------------------------
  // ROUTE ENTER (HOOK PER SETTORI)
  // -----------------------------------------------------------
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
        await caricaRicetteDaSupabase();
        await caricaProdottiSuggerimentiIngredienti();

        if (ricettaDaAprireId) {
          const id = ricettaDaAprireId;
          ricettaDaAprireId = null;
          await caricaRicettaInForm(id);
        } else {
          resetFormRicetta();
        }
        break;

      case "ricette-viewer":
        await caricaRicetteDaSupabase();
        break;

      case "produzione":
        await caricaRicetteDaSupabase();
        resetSchedaProduzione();
        break;

      case "preventivi":
        await loadPreventiviList();
        resetPreventivoForm();
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

      case "magazzino-preparazioni":
        await caricaMagazzinoPreparazioni();
        break;

      default:
        break;
    }
  }

  // -----------------------------------------------------------
  // NAVIGAZIONE CENTRALE
  // -----------------------------------------------------------
  async function navigateTo(rawRoute) {
    const route = normalizeRoute(rawRoute);

    // non loggato → login
    if (!currentUser) {
      showLogin();
      return;
    }

    const isManager = isManagerRole(currentUser.ruolo);

    // ---------------- DIPENDENTE ----------------
    if (!isManager) {
      const allowed = ["timbratura", "ricette-viewer"];

      if (!allowed.includes(route)) {
        showHomeDipendente();
        return;
      }

      showOnlyView(`view-${route}`);
      await onRouteEnter(route);
      applyRoleVisibility();
      return;
    }

    // ---------------- MANAGER ----------------
    let viewId = `view-${route}`;
    let viewEl = document.getElementById(viewId);

    // fallback diretto
    if (!viewEl && rawRoute) {
      const rawId = String(rawRoute).replace(/^#/, "");
      viewEl = document.getElementById(rawId);
      if (viewEl) viewId = rawId;
    }

    if (!viewEl) {
      viewId = "view-timbratura";
    }

    showOnlyView(viewId);
    await onRouteEnter(route);
    applyRoleVisibility();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // -----------------------------------------------------------
  // CLICK SU MENU (data-route)
  // -----------------------------------------------------------
  routeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-route");
      if (!route) return;
      window.location.hash = route;
      navigateTo(route);
    });
  });

  // -----------------------------------------------------------
  // HASH CHANGE MANUALE
  // -----------------------------------------------------------
  window.addEventListener("hashchange", () => {
    const raw = window.location.hash.replace("#", "");
    navigateTo(raw);
  });

  // -----------------------------------------------------------
  // AVVIO APPLICAZIONE
  // -----------------------------------------------------------
  async function initApp() {
    await caricaDipendentiDaSupabase();
    await caricaTimbratureDaSupabase();

    restoreUserFromStorage();

    const raw = window.location.hash.replace("#", "") || "timbratura";
    const route = normalizeRoute(raw);

    if (!currentUser) {
      showLogin();
      return;
    }

    if (isManagerRole(currentUser.ruolo)) {
      showManagerMenuAndRoute(route);
    } else {
      navigateTo(route);
    }
  }

  initApp();
  // ===========================================================
  // ========== 5. RICETTE — EDITOR ============================
  // ===========================================================

  // -----------------------------------------------------------
  // RESET FORM
  // -----------------------------------------------------------
  function resetFormRicetta() {
    ricettaCorrenteId = null;
    ricettaFotoCorrenteUrl = null;

    ricettaNomeInput.value = "";
    ricettaDescrizioneInput.value = "";
    ricettaNoteInput.value = "";
    ricettaFotoInput.value = "";

    ricettaPezziBaseInput.value = "";

    ricettaFormato1LabelInput.value = "Ristorante";
    ricettaFormato1PercInput.value = 100;
    ricettaFormato2LabelInput.value = "Buffet";
    ricettaFormato2PercInput.value = 25;

    ricettaFormato1PezziOut.textContent = "-";
    ricettaFormato2PezziOut.textContent = "-";

    ricettaIngredientiContainer.innerHTML = "";
    creaRigaIngrediente();
  }

  // -----------------------------------------------------------
  // CALCOLO RESE
  // -----------------------------------------------------------
  function aggiornaResaRicetta() {
    const base = parseNumber(ricettaPezziBaseInput.value);
    const p1 = parseNumber(ricettaFormato1PercInput.value);
    const p2 = parseNumber(ricettaFormato2PercInput.value);

    ricettaFormato1PezziOut.textContent =
      base && p1 ? (base * (100 / p1)).toFixed(1) : "-";

    ricettaFormato2PezziOut.textContent =
      base && p2 ? (base * (100 / p2)).toFixed(1) : "-";
  }

  ricettaPezziBaseInput.oninput = aggiornaResaRicetta;
  ricettaFormato1PercInput.oninput = aggiornaResaRicetta;
  ricettaFormato2PercInput.oninput = aggiornaResaRicetta;

  // -----------------------------------------------------------
  // RIGA INGREDIENTE
  // -----------------------------------------------------------
  function creaRigaIngrediente(initial = {}) {
    if (!ricettaIngredientiContainer) return;

    const row = document.createElement("div");
    row.className = "ricetta-ingrediente-row";

    row.innerHTML = `
      <input class="ingrediente-nome" placeholder="Ingrediente" autocomplete="off"
        list="ingredienti-suggestions"
        value="${initial.nome_prodotto || ""}">
      <input type="number" class="ingrediente-quantita" placeholder="Q.tà"
        step="0.001" min="0"
        value="${initial.quantita ?? ""}">
      <input class="ingrediente-unita" placeholder="g, kg, ml..."
        value="${initial.unita_misura || ""}">
      <button type="button" class="app-button tiny red">✕</button>
    `;

    row.querySelector("button").onclick = () => row.remove();
    ricettaIngredientiContainer.appendChild(row);
  }

  if (btnAddIngrediente) {
    btnAddIngrediente.onclick = () => creaRigaIngrediente();
  }

  // -----------------------------------------------------------
  // UPLOAD FOTO
  // -----------------------------------------------------------
  async function uploadFotoRicettaSePresente() {
    if (!ricettaFotoInput?.files?.length) return ricettaFotoCorrenteUrl;

    const file = ricettaFotoInput.files[0];
    const path = `ricette/${Date.now()}_${file.name}`;

    const { error } = await supabase
      .storage
      .from("ricette_foto")
      .upload(path, file);

    if (error) {
      console.warn("Upload foto fallito", error);
      return ricettaFotoCorrenteUrl;
    }

    return supabase
      .storage
      .from("ricette_foto")
      .getPublicUrl(path).data.publicUrl;
  }

  // -----------------------------------------------------------
  // SALVATAGGIO BASE
  // -----------------------------------------------------------
  async function salvaRicettaBase(payload) {
    const { data, error } = await supabase
      .from("ricette")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Errore salvataggio ricetta");
      return null;
    }
    return data;
  }

  // -----------------------------------------------------------
  // SALVATAGGIO INGREDIENTI
  // -----------------------------------------------------------
  async function salvaIngredientiRicetta(ricettaId, ingredienti) {
    await supabase
      .from("ricetta_ingredienti")
      .delete()
      .eq("ricetta_id", ricettaId);

    if (!ingredienti.length) return;

    await supabase
      .from("ricetta_ingredienti")
      .insert(
        ingredienti.map((i) => ({
          ricetta_id: ricettaId,
          nome_prodotto: i.nome,
          quantita: i.quantita,
          unita_misura: i.unita,
        }))
      );
  }

  // -----------------------------------------------------------
  // SALVATAGGIO COMPLETO
  // -----------------------------------------------------------
  if (btnSalvaRicetta) {
    btnSalvaRicetta.onclick = async () => {
      const nome = ricettaNomeInput.value.trim();
      if (!nome) return alert("Nome ricetta obbligatorio");

      const ingredienti = Array.from(
        document.querySelectorAll(".ricetta-ingrediente-row")
      )
        .map((r) => ({
          nome: r.querySelector(".ingrediente-nome").value.trim(),
          quantita: parseNumber(
            r.querySelector(".ingrediente-quantita").value
          ),
          unita: r.querySelector(".ingrediente-unita").value.trim(),
        }))
        .filter((i) => i.nome && i.quantita && i.unita);

      const fotoUrl = await uploadFotoRicettaSePresente();

      const ricetta = await salvaRicettaBase({
        id: ricettaCorrenteId || undefined,
        nome,
        descrizione: ricettaDescrizioneInput.value || null,
        note_procedimento: ricettaNoteInput.value || null,
        foto_url: fotoUrl,
        pezzi_base: parseNumber(ricettaPezziBaseInput.value) || null,
        formato1_label: ricettaFormato1LabelInput.value,
        formato1_percent: parseNumber(ricettaFormato1PercInput.value),
        formato2_label: ricettaFormato2LabelInput.value,
        formato2_percent: parseNumber(ricettaFormato2PercInput.value),
        attivo: true,
      });

      if (!ricetta) return;

      ricettaCorrenteId = ricetta.id;
      await salvaIngredientiRicetta(ricetta.id, ingredienti);

      alert("Ricetta salvata correttamente");
    };
  }

  // -----------------------------------------------------------
  // CARICAMENTO RICETTA
  // -----------------------------------------------------------
  async function caricaRicettaInForm(id) {
    const { data: r } = await supabase
      .from("ricette")
      .select("*")
      .eq("id", id)
      .single();

    if (!r) return;

    ricettaCorrenteId = r.id;
    ricettaFotoCorrenteUrl = r.foto_url;

    ricettaNomeInput.value = r.nome;
    ricettaDescrizioneInput.value = r.descrizione || "";
    ricettaNoteInput.value = r.note_procedimento || "";
    ricettaPezziBaseInput.value = r.pezzi_base || "";

    ricettaFormato1LabelInput.value = r.formato1_label || "Ristorante";
    ricettaFormato1PercInput.value = r.formato1_percent || 100;
    ricettaFormato2LabelInput.value = r.formato2_label || "Buffet";
    ricettaFormato2PercInput.value = r.formato2_percent || 25;

    const { data: ing } = await supabase
      .from("ricetta_ingredienti")
      .select("nome_prodotto, quantita, unita_misura")
      .eq("ricetta_id", id);

    ricettaIngredientiContainer.innerHTML = "";
    (ing || []).forEach(creaRigaIngrediente);

    aggiornaResaRicetta();
    initRicettaOutput();
    caricaRicettaOutput();
  }

  // -----------------------------------------------------------
  // AUTOCOMPILAZIONE NOME
  // -----------------------------------------------------------
  ricettaNomeInput.onchange = async () => {
    const nome = ricettaNomeInput.value.trim();
    if (!nome) return;

    const { data } = await supabase
      .from("ricette")
      .select("id")
      .ilike("nome", nome)
      .maybeSingle();

    if (data?.id) {
      await caricaRicettaInForm(data.id);
    }
  };

  // -----------------------------------------------------------
  // OUTPUT FINALE PREPARAZIONE
  // -----------------------------------------------------------
  async function caricaRicettaOutput() {
    if (!ricettaCorrenteId || !ricettaOutputBody) return;

    ricettaOutputBody.innerHTML = "<p class='muted'>Caricamento...</p>";

    const { data } = await supabase
      .from("ricette_output")
      .select("*")
      .eq("ricetta_id", ricettaCorrenteId)
      .maybeSingle();

    if (!data) {
      ricettaOutputBody.innerHTML =
        "<p class='muted'>Nessun output configurato</p>";
      return;
    }

    ricettaOutputBody.innerHTML = `
      <p><strong>${data.peso_finale}</strong> ${data.unita_misura}</p>
      ${data.note ? `<p class="muted">${data.note}</p>` : ""}
    `;
  }

  async function apriEditorOutput() {
    if (!ricettaCorrenteId) {
      alert("Salva prima la ricetta");
      return;
    }

    const peso = prompt("Peso finale preparazione:");
    if (!peso) return;

    const um = prompt("Unità di misura:", "kg");
    if (!um) return;

    const note = prompt("Note (facoltative):", "");

    await supabase
      .from("ricette_output")
      .upsert({
        ricetta_id: ricettaCorrenteId,
        peso_finale: parseNumber(peso),
        unita_misura: um,
        note: note || null,
      }, { onConflict: "ricetta_id" });

    caricaRicettaOutput();
  }

  function initRicettaOutput() {
    if (btnAddOutput) {
      btnAddOutput.onclick = apriEditorOutput;
    }
  }
  // ===========================================================
  // ========== 6. PRODUZIONE ==================================
  // ===========================================================

  // -----------------------------------------------------------
  // RIFERIMENTI DOM
  // -----------------------------------------------------------
  produzioneRigheContainer = document.getElementById("produzione-righe");
  produzioneDataInput = document.getElementById("produzione-data");
 produzioneNoteInput = document.getElementById("produzione-note");
  produzioneLottoInput = document.getElementById("produzione-lotto");
 produzioneLuogoSelect = document.getElementById("produzione-luogo");

  btnAddRigaProduzione = document.getElementById("btn-add-riga-produzione");
 btnSalvaSchedaProduzione = document.getElementById("btn-salva-scheda-produzione");

  // -----------------------------------------------------------
  // GENERAZIONE LOTTO
  // -----------------------------------------------------------
  function generaLottoProduzione(luogo = "CC") {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${luogo}-${yyyy}${mm}${dd}`;
  }

  // -----------------------------------------------------------
  // RIGA PRODUZIONE
  // -----------------------------------------------------------
  function creaRigaProduzione() {
    if (!produzioneRigheContainer) return;

    const row = document.createElement("div");
    row.className = "produzione-riga timbratura-intro-card";

    row.innerHTML = `
      <button type="button" class="app-button tiny red btn-del">✕</button>

      <input class="prod-nome input-pill"
        placeholder="Ricetta / Preparazione"
        autocomplete="off"
        list="ricette-suggestions" />

      <input class="prod-um input-pill"
        placeholder="UM"
        readonly />

      <input type="number"
        class="prod-qta input-pill"
        placeholder="Quantità prodotta"
        min="0"
        step="0.01" />

      <select class="prod-abbattimento input-pill">
        <option value="">Abbattimento</option>
        <option value="positivo">Positivo</option>
        <option value="negativo">Negativo</option>
      </select>

      <input type="date" class="prod-scadenza input-pill" />
    `;

    // elimina riga
    row.querySelector(".btn-del").onclick = () => row.remove();

    // ---------------------------------------------------------
    // AUTOCOMPLETE RICETTA → UM
    // ---------------------------------------------------------
    const nomeInput = row.querySelector(".prod-nome");
    const umInput = row.querySelector(".prod-um");

    nomeInput.oninput = () => {
      if (!Array.isArray(ricetteCache)) return;

      const r = ricetteCache.find(
        (x) => x.nome === nomeInput.value
      );

      if (!r) {
        umInput.value = "";
        return;
      }

      umInput.value = r.tipo === "base" ? "kg" : "porzioni";
    };

    produzioneRigheContainer.appendChild(row);
  }

  // -----------------------------------------------------------
  // RESET SCHEDA PRODUZIONE
  // -----------------------------------------------------------
  function resetSchedaProduzione() {
    if (produzioneDataInput) {
      produzioneDataInput.value = new Date().toISOString().slice(0, 10);
    }

    const luogo = produzioneLuogoSelect?.value || "CC";
    if (produzioneLottoInput) {
      produzioneLottoInput.value = generaLottoProduzione(luogo);
    }

    if (produzioneNoteInput) produzioneNoteInput.value = "";

    produzioneRigheContainer.innerHTML = "";
    creaRigaProduzione();
  }

  // -----------------------------------------------------------
  // SALVATAGGIO PRODUZIONE
  // -----------------------------------------------------------
  async function salvaSchedaProduzione() {
    const dataProduzione = produzioneDataInput?.value;
    const lotto = produzioneLottoInput?.value;
    const note = produzioneNoteInput?.value || null;
    const luogo = produzioneLuogoSelect?.value || "CC";

    if (!dataProduzione || !lotto) {
      alert("Data e lotto sono obbligatori");
      return;
    }

    // 1️⃣ TESTATA PRODUZIONE
    const { error: errProd } = await supabase
      .from("produzioni")
      .insert({
        data_produzione: dataProduzione,
        lotto,
        luogo,
        note,
      });

    if (errProd) {
      console.error(errProd);
      alert("Errore salvataggio produzione");
      return;
    }

    // 2️⃣ MOVIMENTI MAGAZZINO (CARICO)
    const righe = Array.from(
      produzioneRigheContainer.querySelectorAll(".produzione-riga")
    );

    for (const row of righe) {
      const nome = row.querySelector(".prod-nome").value.trim();
      const quantita = parseNumber(row.querySelector(".prod-qta").value);
      const abbattimento = row.querySelector(".prod-abbattimento").value;
      const scadenza = row.querySelector(".prod-scadenza").value;

      if (!nome || !quantita || !abbattimento || !scadenza) continue;

      await supabase
        .from("magazzino_produzione_movimenti")
        .insert({
          nome_prodotto: nome,
          lotto,
          data: dataProduzione,
          tipo: "carico",
          quantita,
          tipo_abbattimento: abbattimento,
          data_scadenza: scadenza,
          riferimento_tipo: "produzione",
          riferimento_id: null,
          luogo,
          note,
        });
    }

    alert("Produzione salvata correttamente");
    resetSchedaProduzione();
  }

  // -----------------------------------------------------------
  // EVENTI
  // -----------------------------------------------------------
  if (btnAddRigaProduzione) {
    btnAddRigaProduzione.onclick = creaRigaProduzione;
  }

  if (btnSalvaSchedaProduzione) {
    btnSalvaSchedaProduzione.onclick = salvaSchedaProduzione;
  }
  // ===========================================================
  // ========== 7. MAGAZZINO PREPARAZIONI (READ ONLY) ==========
  // ===========================================================

  // -----------------------------------------------------------
  // STATO
  // -----------------------------------------------------------
   prepProdotti = [];
 prepProdottoSelezionato = null;

  // -----------------------------------------------------------
  // CARICAMENTO DATI
  // -----------------------------------------------------------
  async function caricaMagazzinoPreparazioni() {
    if (!supabase) return;

    resetPrepView();
    prepProdotti = [];

    const { data, error } = await supabase
      .from("magazzino_produzione_movimenti")
      .select(`
        nome_prodotto,
        lotto,
        data_scadenza,
        luogo,
        tipo,
        quantita,
        unita_misura
      `)
      .eq("riferimento_tipo", "produzione");

    if (error) {
      console.error("Errore magazzino preparazioni:", error);
      return;
    }

    prepProdotti = aggregaPreparazioni(data || []);
    initPrepAutocomplete();
  }

  // -----------------------------------------------------------
  // AGGREGAZIONE (PRODOTTO → LOTTI)
  // -----------------------------------------------------------
  function aggregaPreparazioni(movimenti) {
    const map = {};

    movimenti.forEach((m) => {
      const nome = (m.nome_prodotto || "").trim();
      if (!nome) return;

      if (!map[nome]) {
        map[nome] = {
          nome_prodotto: nome,
          unita_misura: m.unita_misura || "",
          lotti: {},
        };
      }

      const segno = m.tipo === "scarico" ? -1 : 1;
      const lottoKey = m.lotto || "SENZA LOTTO";

      if (!map[nome].lotti[lottoKey]) {
        map[nome].lotti[lottoKey] = {
          lotto: lottoKey,
          luogo: m.luogo || "",
          data_scadenza: m.data_scadenza,
          giacenza: 0,
        };
      }

      map[nome].lotti[lottoKey].giacenza +=
        segno * Number(m.quantita || 0);
    });

    return Object.values(map)
      .map((p) => {
        p.lotti = Object.values(p.lotti)
          .filter((l) => l.giacenza > 0)
          .sort(
            (a, b) =>
              new Date(a.data_scadenza) -
              new Date(b.data_scadenza)
          );

        p.giacenza_totale = p.lotti.reduce(
          (s, l) => s + l.giacenza,
          0
        );

        return p;
      })
      .filter((p) => p.giacenza_totale > 0);
  }

  // -----------------------------------------------------------
  // AUTOCOMPLETE (CUSTOM)
  // -----------------------------------------------------------
  function initPrepAutocomplete() {
    const input = document.getElementById("prep-search");
    const box = document.getElementById("prep-suggestions");

    if (!input || !box) return;

    input.value = "";
    box.innerHTML = "";
    input.oninput = null;

    input.oninput = () => {
      const q = input.value.trim().toLowerCase();
      box.innerHTML = "";
      resetPrepView();

      if (!q) return;

      const matches = prepProdotti.filter((p) =>
        p.nome_prodotto.toLowerCase().includes(q)
      );

      if (!matches.length) {
        box.innerHTML =
          `<div class="prep-suggestion muted">Nessun risultato</div>`;
        return;
      }

      matches.slice(0, 8).forEach((p) => {
        const div = document.createElement("div");
        div.className = "prep-suggestion";
        div.textContent = p.nome_prodotto;

        div.onclick = () => {
          input.value = p.nome_prodotto;
          box.innerHTML = "";
          selezionaProdottoPrep(p);
        };

        box.appendChild(div);
      });
    };
  }

  // -----------------------------------------------------------
  // SELEZIONE PRODOTTO
  // -----------------------------------------------------------
  function selezionaProdottoPrep(p) {
    prepProdottoSelezionato = p;
    renderPrepCard(p);
    renderPrepLotti(p);
  }

  // -----------------------------------------------------------
  // RENDER CARD PRODOTTO
  // -----------------------------------------------------------
  function renderPrepCard(p) {
    const box = document.getElementById("prep-card-singola");
    if (!box) return;

    box.innerHTML = `
      <div class="prep-card">
        <h3>${p.nome_prodotto}</h3>
        <p>
          Giacenza totale:
          <strong>
            ${p.giacenza_totale.toFixed(2)} ${p.unita_misura}
          </strong>
        </p>
      </div>
    `;
  }

  // -----------------------------------------------------------
  // RENDER LOTTI
  // -----------------------------------------------------------
  function renderPrepLotti(p) {
    const box = document.getElementById("prep-dettaglio-lotti");
    if (!box) return;

    box.innerHTML = `<h3>📦 Lotti disponibili</h3>`;

    p.lotti.forEach((l) => {
      box.innerHTML += `
        <div class="prep-lotto">
          <strong>Lotto:</strong> ${l.lotto}<br>
          <strong>Luogo:</strong> ${l.luogo}<br>
          <strong>Scadenza:</strong> ${formatData(l.data_scadenza)}<br>
          <strong>Giacenza:</strong>
          ${l.giacenza.toFixed(2)} ${p.unita_misura}
        </div>
      `;
    });
  }

  // -----------------------------------------------------------
  // UTILS
  // -----------------------------------------------------------
  function resetPrepView() {
    const c = document.getElementById("prep-card-singola");
    const l = document.getElementById("prep-dettaglio-lotti");
    if (c) c.innerHTML = "";
    if (l) l.innerHTML = "";
  }

  function formatData(d) {
    return d
      ? new Date(d).toLocaleDateString("it-IT")
      : "-";
  }

  // -----------------------------------------------------------
  // DEBUG (OPZIONALE)
  // -----------------------------------------------------------
  window.__prep = {
    getProdotti: () => prepProdotti,
    seleziona: selezionaProdottoPrep,
  };
  // ===========================================================
  // ========== 8. ACQUISTI / FATTURE ==========================
  // ===========================================================

   currentFatturaId = null;
   fornitoriCache = [];
  categorieCache = [];
  function parseNumber(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  function formatDateInputToday(input) {
    if (!input) return;
    input.value = new Date().toISOString().slice(0, 10);
  }
  async function caricaFornitoriInCache() {
    const { data } = await supabase
      .from("fornitori")
      .select("id, ragione_sociale")
      .order("ragione_sociale");
    fornitoriCache = data || [];
  }

  async function caricaCategorieInCache() {
    const { data } = await supabase
      .from("categorie_prodotto")
      .select("id, nome")
      .order("nome");
    categorieCache = data || [];
  }

  function getFornitoreById(id) {
    return fornitoriCache.find(f => f.id === id) || null;
  }

  function getCategoriaById(id) {
    return categorieCache.find(c => c.id === id) || null;
  }
  async function findOrCreateProdotto({ descrizione, categoriaNome, um }) {
    const desc = descrizione.trim();
    if (!desc) return null;

    const { data: esistenti } = await supabase
      .from("prodotti")
      .select("*")
      .ilike("descrizione", desc)
      .limit(1);

    if (esistenti?.length) return esistenti[0];

    let categoriaId = null;
    if (categoriaNome) {
      const cat = categorieCache.find(
        c => c.nome.toLowerCase() === categoriaNome.toLowerCase()
      );
      categoriaId = cat?.id || null;
    }

    const { data } = await supabase
      .from("prodotti")
      .insert({
        descrizione: desc,
        categoria_id: categoriaId,
        um: um || "pz",
        attivo: true,
      })
      .select()
      .single();

    return data;
  }
  function creaRigaFattura() {
    const tr = document.createElement("tr");
    tr.className = "fatt-riga-row";

    tr.innerHTML = `
      <td>
        <input class="fatt-desc input-pill" placeholder="Descrizione" />
      </td>
      <td>
        <input class="fatt-qta input-pill" type="number" step="0.001" />
      </td>
      <td>
        <input class="fatt-prezzo input-pill" type="number" step="0.0001" />
      </td>
      <td>
        <input class="fatt-sconto1 input-pill" type="number" step="0.01" />
        <input class="fatt-sconto2 input-pill" type="number" step="0.01" />
      </td>
      <td>
        <input class="fatt-iva input-pill" type="number" step="1" />
      </td>
      <td class="fatt-totale">0.00</td>
      <td>
        <button class="app-button tiny red">✕</button>
      </td>
    `;

    tr.querySelector("button").onclick = () => {
      tr.remove();
      ricalcolaTotaliFattura();
    };

    tr.querySelectorAll("input").forEach(inp =>
      inp.addEventListener("input", () => {
        ricalcolaTotaleRiga(tr);
        ricalcolaTotaliFattura();
      })
    );

    fatturaRigheBody.appendChild(tr);
  }
  function ricalcolaTotaleRiga(tr) {
    const qta = parseNumber(tr.querySelector(".fatt-qta").value);
    const prezzo = parseNumber(tr.querySelector(".fatt-prezzo").value);
    const s1 = parseNumber(tr.querySelector(".fatt-sconto1").value);
    const s2 = parseNumber(tr.querySelector(".fatt-sconto2").value);
    const iva = parseNumber(tr.querySelector(".fatt-iva").value);

    const netto = prezzo * (1 - s1 / 100) * (1 - s2 / 100);
    const imponibile = netto * qta;
    const ivaVal = imponibile * iva / 100;
    const totale = imponibile + ivaVal;

    tr.querySelector(".fatt-totale").textContent = totale.toFixed(2);
    return { imponibile, iva: ivaVal, totale };
  }

  function ricalcolaTotaliFattura() {
    let imp = 0, iva = 0, tot = 0;

    fatturaRigheBody
      .querySelectorAll(".fatt-riga-row")
      .forEach(tr => {
        const r = ricalcolaTotaleRiga(tr);
        imp += r.imponibile;
        iva += r.iva;
        tot += r.totale;
      });

    fatturaImponibileTotaleInput.value = imp.toFixed(2);
    fatturaIvaTotaleInput.value = iva.toFixed(2);
    fatturaTotaleDocumentoInput.value = tot.toFixed(2);
  }
  async function salvaFattura() {
    await caricaFornitoriInCache();
    await caricaCategorieInCache();

    const numero = fatturaNumeroInput.value.trim();
    const data = fatturaDataInput.value;
    const fornitoreNome = fatturaFornitoreInput.value.trim();

    if (!numero || !data || !fornitoreNome) {
      alert("Compila numero, data e fornitore");
      return;
    }

    const { data: forn } = await supabase
      .from("fornitori")
      .insert({ ragione_sociale: fornitoreNome })
      .select()
      .single();

    const fattura = await supabase
      .from("fatture_acquisto")
      .insert({
        numero_documento: numero,
        data_documento: data,
        fornitore_id: forn.id,
        imponibile_totale: parseNumber(fatturaImponibileTotaleInput.value),
        iva_totale: parseNumber(fatturaIvaTotaleInput.value),
        totale_documento: parseNumber(fatturaTotaleDocumentoInput.value),
      })
      .select()
      .single();

    for (const tr of fatturaRigheBody.querySelectorAll("tr")) {
      const desc = tr.querySelector(".fatt-desc").value;
      const qta = parseNumber(tr.querySelector(".fatt-qta").value);
      const prezzo = parseNumber(tr.querySelector(".fatt-prezzo").value);

      if (!desc || !qta || !prezzo) continue;

      const prodotto = await findOrCreateProdotto({
        descrizione: desc,
        um: "pz",
      });

      await supabase.from("fatture_acquisto_righe").insert({
        fattura_id: fattura.id,
        prodotto_id: prodotto.id,
        descrizione_riga: desc,
        quantita: qta,
        prezzo_unitario: prezzo,
      });
    }

    alert("Fattura salvata correttamente");
  }
  btnAddRigaFattura.onclick = () => creaRigaFattura();
  btnSalvaFattura.onclick = () => salvaFattura();

  function resetFatturaForm() {
    currentFatturaId = null;
    fatturaNumeroInput.value = "";
    fatturaFornitoreInput.value = "";
    fatturaRigheBody.innerHTML = "";
    formatDateInputToday(fatturaDataInput);
    creaRigaFattura();
  }
  // ===========================================================
  // ========== 9. MAGAZZINO (GIACENZE & RICERCA) ===============
  // ===========================================================

  // -----------------------------------------------------------
  // STATO
  // -----------------------------------------------------------
  magazzinoDati = [];

  // -----------------------------------------------------------
  // CARICAMENTO DATI MAGAZZINO
  // -----------------------------------------------------------
  async function caricaMagazzinoDati() {
    if (!supabase) return;

    await caricaCategorieInCache();

    // 1) PRODOTTI
    const { data: prodotti, error: prodErr } = await supabase
      .from("prodotti")
      .select("id, codice_interno, descrizione, um, categoria_id, scorta_minima")
      .order("descrizione", { ascending: true });

    if (prodErr) {
      console.error("Errore caricamento prodotti:", prodErr);
      return;
    }

    // 2) GIACENZE DA FATTURE (CARICHI)
    const { data: righe, error: righeErr } = await supabase
      .from("fatture_acquisto_righe")
      .select("prodotto_id, quantita");

    if (righeErr) {
      console.error("Errore caricamento giacenze:", righeErr);
    }

    const giacenzeMap = {};
    (righe || []).forEach((r) => {
      if (!r.prodotto_id) return;
      giacenzeMap[r.prodotto_id] =
        (giacenzeMap[r.prodotto_id] || 0) + Number(r.quantita || 0);
    });

    magazzinoDati = (prodotti || []).map((p) => {
      const cat = p.categoria_id
        ? getCategoriaById(p.categoria_id)
        : null;

      return {
        id: p.id,
        codice: p.codice_interno,
        descrizione: p.descrizione,
        um: p.um,
        categoriaNome: cat ? cat.nome : "",
        scortaMinima: p.scorta_minima,
        stock: giacenzeMap[p.id] || 0,
      };
    });

    aggiornaMagazzinoSuggestions();
  }

  // -----------------------------------------------------------
  // RENDER LISTA
  // -----------------------------------------------------------
  function renderMagazzinoLista(lista) {
    if (!magazzinoListaEl) return;
    magazzinoListaEl.innerHTML = "";

    lista.forEach((p) => {
      const tr = document.createElement("tr");
      tr.dataset.prodottoId = p.id;

      const alertScorta =
        p.scortaMinima != null && p.stock < p.scortaMinima
          ? " ⚠️"
          : "";

      tr.innerHTML = `
        <td>${p.codice || ""}</td>
        <td>${p.descrizione || ""}${alertScorta}</td>
        <td>${p.categoriaNome || ""}</td>
        <td>${p.stock.toFixed(3)} ${p.um || ""}</td>
      `;

      tr.onclick = () => selezionaProdottoMagazzino(p.id);
      magazzinoListaEl.appendChild(tr);
    });
  }

  // -----------------------------------------------------------
  // AUTOCOMPLETE (INPUT SEARCH)
  // -----------------------------------------------------------
  function aggiornaMagazzinoSuggestions() {
    if (!magazzinoSuggestions) return;
    magazzinoSuggestions.innerHTML = "";

    magazzinoDati.forEach((p) => {
      if (!p.descrizione) return;
      const opt = document.createElement("option");
      opt.value = p.descrizione;
      opt.label = p.codice
        ? `${p.descrizione} (${p.codice})`
        : p.descrizione;
      magazzinoSuggestions.appendChild(opt);
    });
  }

  // -----------------------------------------------------------
  // SELEZIONE PRODOTTO
  // -----------------------------------------------------------
  function selezionaProdottoMagazzino(id) {
    const prod = magazzinoDati.find((p) => p.id === id) || null;
    popolaMagazzinoForm(prod);
  }

  // -----------------------------------------------------------
  // FORM ANAGRAFICA
  // -----------------------------------------------------------
  function popolaMagazzinoForm(prod) {
    if (!prod) {
      magazzinoIdInput.value = "";
      magazzinoDescrInput.value = "";
      magazzinoCategoriaInput.value = "";
      magazzinoUmInput.value = "";
      magazzinoScortaMinimaInput.value = "";
      magazzinoGiacenzaInput.value = "";
      return;
    }

    magazzinoIdInput.value = prod.id;
    magazzinoDescrInput.value = prod.descrizione || "";
    magazzinoCategoriaInput.value = prod.categoriaNome || "";
    magazzinoUmInput.value = prod.um || "";
    magazzinoScortaMinimaInput.value =
      prod.scortaMinima != null ? prod.scortaMinima : "";
    magazzinoGiacenzaInput.value =
      prod.stock != null ? prod.stock.toFixed(3) : "";
  }

  // -----------------------------------------------------------
  // SALVATAGGIO ANAGRAFICA PRODOTTO
  // -----------------------------------------------------------
  async function salvaProdottoMagazzino() {
    if (!supabase) return;

    const id = magazzinoIdInput.value
      ? parseInt(magazzinoIdInput.value, 10)
      : null;

    const descr = magazzinoDescrInput.value.trim();
    const catNome = magazzinoCategoriaInput.value.trim();
    const um = magazzinoUmInput.value.trim();
    const scorta = parseNumber(magazzinoScortaMinimaInput.value);

    if (!descr) {
      alert("Descrizione obbligatoria");
      return;
    }

    let categoriaId = null;
    if (catNome) {
      const cat = await findOrCreateCategoriaByNome(catNome);
      categoriaId = cat?.id || null;
    }

    if (!id) {
      alert("Creazione prodotto gestita dagli acquisti.");
      return;
    }

    const { error } = await supabase
      .from("prodotti")
      .update({
        descrizione: descr,
        categoria_id: categoriaId,
        um: um || null,
        scorta_minima: isNaN(scorta) ? null : scorta,
      })
      .eq("id", id);

    if (error) {
      console.error("Errore aggiornamento prodotto:", error);
      alert("Errore salvataggio prodotto");
      return;
    }

    alert("Prodotto aggiornato");
    await caricaMagazzinoDati();
    popolaMagazzinoForm(
      magazzinoDati.find((p) => p.id === id)
    );
  }

  // -----------------------------------------------------------
  // EVENTI
  // -----------------------------------------------------------
  if (btnMagazzinoSalva) {
    btnMagazzinoSalva.onclick = (e) => {
      e.preventDefault();
      salvaProdottoMagazzino();
    };
  }

  if (btnMagazzinoNuovo) {
    btnMagazzinoNuovo.onclick = () => popolaMagazzinoForm(null);
  }

  if (magazzinoSearchInput && magazzinoTable) {
    magazzinoTable.style.display = "none";

    magazzinoSearchInput.oninput = () => {
      const q = magazzinoSearchInput.value.trim().toLowerCase();

      if (!q) {
        magazzinoTable.style.display = "none";
        magazzinoListaEl.innerHTML = "";
        return;
      }

      const filtrati = magazzinoDati.filter((p) => {
        return (
          (p.descrizione || "").toLowerCase().includes(q) ||
          (p.codice || "").toLowerCase().includes(q)
        );
      });

      renderMagazzinoLista(filtrati);
      magazzinoTable.style.display = "table";
    };
  }
  // ===========================================================
  // ========== 10. RICETTARIO (VIEWER) ========================
  // ===========================================================

  // -----------------------------------------------------------
  // STATO
  // -----------------------------------------------------------
  let ricetteViewerCache = [];
  let filtroRicetteViewer = "tutte";

  // -----------------------------------------------------------
  // CARICAMENTO RICETTE
  // -----------------------------------------------------------
  async function caricaRicetteViewer() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("ricette")
      .select(`
        id,
        nome,
        descrizione,
        tipo,
        foto_url,
        attivo
      `)
      .eq("attivo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento ricettario:", error);
      return;
    }

    ricetteViewerCache = data || [];
    renderRicetteViewer();
  }

  // -----------------------------------------------------------
  // FILTRI
  // -----------------------------------------------------------
  function setFiltroRicetteViewer(tipo) {
    filtroRicetteViewer = tipo;
    renderRicetteViewer();

    document
      .querySelectorAll("#ricette-filtri button")
      .forEach((btn) => {
        btn.classList.toggle(
          "active",
          btn.dataset.filter === tipo
        );
      });
  }

  // -----------------------------------------------------------
  // RENDER LISTA
  // -----------------------------------------------------------
  function renderRicetteViewer() {
    const container = document.getElementById("ricette-lista-viewer");
    if (!container) return;

    const q = (
      document.getElementById("ricette-search")?.value || ""
    )
      .trim()
      .toLowerCase();

    container.innerHTML = "";

    let lista = ricetteViewerCache;

    if (filtroRicetteViewer !== "tutte") {
      lista = lista.filter(
        (r) => r.tipo === filtroRicetteViewer
      );
    }

    if (q) {
      lista = lista.filter((r) =>
        r.nome.toLowerCase().includes(q)
      );
    }

    if (!lista.length) {
      container.innerHTML =
        `<p class="muted">Nessuna ricetta trovata</p>`;
      return;
    }

    lista.forEach((r) => {
      const card = document.createElement("div");
      card.className = "ricetta-view-card";

      card.innerHTML = `
        <div class="ricetta-view-header">
          <h3>${r.nome}</h3>
          <span class="badge ${
            r.tipo === "base" ? "badge-base" : "badge-piatto"
          }">
            ${r.tipo === "base" ? "Ricetta base" : "Ricetta"}
          </span>
        </div>

        ${
          r.foto_url
            ? `<img src="${r.foto_url}" class="ricetta-view-img" />`
            : ""
        }

        ${
          r.descrizione
            ? `<p class="ricetta-view-desc">${r.descrizione}</p>`
            : ""
        }

        <div class="ricetta-view-actions">
          <button
            class="app-button tiny gray"
            data-open-ricetta="${r.id}"
          >
            Apri scheda
          </button>

          <button
            class="app-button tiny"
            data-produce-ricetta="${r.id}"
          >
            Produzione
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    // eventi
    container
      .querySelectorAll("[data-open-ricetta]")
      .forEach((btn) => {
        btn.onclick = () => {
          const id = parseInt(
            btn.dataset.openRicetta,
            10
          );
          ricettaDaAprireId = id;
          navigateTo("ricette");
        };
      });

    container
      .querySelectorAll("[data-produce-ricetta]")
      .forEach((btn) => {
        const id = parseInt(
          btn.dataset.produceRicetta,
          10
        );
        btn.onclick = () => {
          navigateTo("produzione");
          // selezione ricetta avviene via autocomplete
        };
      });
  }

  // -----------------------------------------------------------
  // EVENTI UI
  // -----------------------------------------------------------
  ricetteSearchInput =
    document.getElementById("ricette-search");

  if (ricetteSearchInput) {
    ricetteSearchInput.oninput = renderRicetteViewer;
  }

  document
    .querySelectorAll("#ricette-filtri button")
    .forEach((btn) => {
      btn.onclick = () =>
        setFiltroRicetteViewer(btn.dataset.filter);
    });

  // -----------------------------------------------------------
  // HOOK ROUTE
  // -----------------------------------------------------------
  async function onEnterRicetteViewer() {
    await caricaRicetteViewer();
    setFiltroRicetteViewer("tutte");
  }
  // ===========================================================
  // ========== 11. PRODUZIONE → SCARICO INGREDIENTI ===========
  // ===========================================================

  /**
   * Scarica automaticamente gli ingredienti dal magazzino
   * in base alla ricetta prodotta
   */
  async function scaricaIngredientiProduzione({
    ricettaId,
    quantitaProdotta,
    dataProduzione,
    riferimentoId = null,
    note = null
  }) {
    if (!supabase || !ricettaId || !quantitaProdotta) return;

    // 1️⃣ carico ingredienti ricetta
    const { data: ingredienti, error } = await supabase
      .from("ricetta_ingredienti")
      .select("nome_prodotto, quantita, unita_misura")
      .eq("ricetta_id", ricettaId);

    if (error || !ingredienti?.length) {
      console.warn("Nessun ingrediente da scaricare", error);
      return;
    }

    // 2️⃣ carico prodotti magazzino
    const { data: prodottiMagazzino, error: errMag } = await supabase
      .from("prodotti")
      .select("id, descrizione, um");

    if (errMag) {
      console.error("Errore lettura magazzino:", errMag);
      return;
    }

    const mapProdotti = {};
    prodottiMagazzino.forEach((p) => {
      mapProdotti[p.descrizione.toLowerCase()] = p;
    });

    // 3️⃣ preparo movimenti di scarico
    const movimenti = [];

    ingredienti.forEach((ing) => {
      const nome = (ing.nome_prodotto || "").trim().toLowerCase();
      const prodotto = mapProdotti[nome];

      if (!prodotto) {
        console.warn("Prodotto non trovato in magazzino:", ing.nome_prodotto);
        return;
      }

      const quantitaScarico =
        Number(ing.quantita || 0) * Number(quantitaProdotta || 0);

      if (quantitaScarico <= 0) return;

      movimenti.push({
        prodotto_id: prodotto.id,
        tipo: "scarico",
        quantita: quantitaScarico,
        data: dataProduzione,
        riferimento_tipo: "produzione",
        riferimento_id: riferimentoId,
        note: note || `Produzione ricetta ${ricettaId}`
      });
    });

    if (!movimenti.length) return;

    // 4️⃣ inserisco movimenti
    const { error: errInsert } = await supabase
      .from("magazzino_movimenti")
      .insert(movimenti);

    if (errInsert) {
      console.error("Errore scarico ingredienti:", errInsert);
    } else {
      console.log("✅ Ingredienti scaricati:", movimenti);
    }
  }
  // ===========================================================
  // ========== 12. FIFO + LOTTI (SCARICO INTELLIGENTE) =========
  // ===========================================================

  /**
   * Restituisce i lotti disponibili per un prodotto (FIFO)
   */
  async function getLottiDisponibiliFIFO(nomeProdotto) {
    if (!supabase || !nomeProdotto) return [];

    const { data, error } = await supabase
      .from("magazzino_produzione_movimenti")
      .select(`
        lotto,
        data_scadenza,
        tipo,
        quantita
      `)
      .eq("nome_prodotto", nomeProdotto);

    if (error) {
      console.error("Errore lettura lotti:", error);
      return [];
    }

    // aggrego per lotto
    const map = {};

    (data || []).forEach((m) => {
      const lotto = m.lotto || "SENZA LOTTO";
      if (!map[lotto]) {
        map[lotto] = {
          lotto,
          data_scadenza: m.data_scadenza,
          giacenza: 0
        };
      }

      const segno = m.tipo === "scarico" ? -1 : 1;
      map[lotto].giacenza += segno * Number(m.quantita || 0);
    });

    return Object.values(map)
      .filter((l) => l.giacenza > 0)
      .sort(
        (a, b) =>
          new Date(a.data_scadenza) - new Date(b.data_scadenza)
      );
  }

  /**
   * Scarico FIFO per singolo ingrediente
   */
  async function scaricaIngredienteFIFO({
    nomeProdotto,
    quantitaDaScaricare,
    data,
    riferimentoId,
    note,
    luogo = "CC"
  }) {
    let residuo = quantitaDaScaricare;

    const lotti = await getLottiDisponibiliFIFO(nomeProdotto);
    if (!lotti.length) {
      console.warn("⚠️ Nessun lotto disponibile per:", nomeProdotto);
      return;
    }

    for (const lotto of lotti) {
      if (residuo <= 0) break;

      const qta = Math.min(residuo, lotto.giacenza);

      await supabase
        .from("magazzino_produzione_movimenti")
        .insert({
          nome_prodotto: nomeProdotto,
          lotto: lotto.lotto,
          data,
          tipo: "scarico",
          quantita: qta,
          data_scadenza: lotto.data_scadenza,
          riferimento_tipo: "produzione",
          riferimento_id: riferimentoId,
          luogo,
          note
        });

      residuo -= qta;
    }

    if (residuo > 0) {
      console.warn(
        `⚠️ Giacenza insufficiente per ${nomeProdotto}: mancano ${residuo}`
      );
    }
  }

  /**
   * Scarico FIFO ingredienti per produzione (versione finale)
   */
  async function scaricaIngredientiProduzioneFIFO({
    ricettaId,
    quantitaProdotta,
    dataProduzione,
    riferimentoId,
    note,
    luogo
  }) {
    if (!supabase) return;

    const { data: ingredienti, error } = await supabase
      .from("ricetta_ingredienti")
      .select("nome_prodotto, quantita")
      .eq("ricetta_id", ricettaId);

    if (error || !ingredienti?.length) return;

    for (const ing of ingredienti) {
      const nome = ing.nome_prodotto;
      const qtaTot =
        Number(ing.quantita || 0) * Number(quantitaProdotta || 0);

      if (qtaTot <= 0) continue;

      await scaricaIngredienteFIFO({
        nomeProdotto: nome,
        quantitaDaScaricare: qtaTot,
        data: dataProduzione,
        riferimentoId,
        note,
        luogo
      });
    }
  }
  // ===========================================================
  // ========== 13. FOOD COST REALE (PER RICETTA) ==============
  // ===========================================================

  /**
   * Calcola il prezzo medio ponderato di un prodotto
   * basato sulle fatture di acquisto
   */
  async function calcolaPrezzoMedioProdotto(prodottoId) {
    if (!supabase || !prodottoId) return 0;

    const { data, error } = await supabase
      .from("fatture_acquisto_righe")
      .select("quantita, prezzo_unitario")
      .eq("prodotto_id", prodottoId);

    if (error || !data?.length) return 0;

    let totQta = 0;
    let totVal = 0;

    data.forEach((r) => {
      const q = Number(r.quantita || 0);
      const p = Number(r.prezzo_unitario || 0);
      if (q > 0 && p > 0) {
        totQta += q;
        totVal += q * p;
      }
    });

    if (totQta === 0) return 0;
    return totVal / totQta;
  }

  /**
   * Calcola il food cost reale di una ricetta
   */
  async function calcolaFoodCostRicetta(ricettaId) {
    if (!supabase || !ricettaId) return null;

    // 1️⃣ ingredienti ricetta
    const { data: ingredienti, error } = await supabase
      .from("ricetta_ingredienti")
      .select("nome_prodotto, quantita")
      .eq("ricetta_id", ricettaId);

    if (error || !ingredienti?.length) {
      console.warn("Nessun ingrediente per food cost");
      return null;
    }

    // 2️⃣ prodotti magazzino
    const { data: prodotti } = await supabase
      .from("prodotti")
      .select("id, descrizione, um");

    const mapProdotti = {};
    (prodotti || []).forEach((p) => {
      mapProdotti[p.descrizione.toLowerCase()] = p;
    });

    let costoTotale = 0;
    const dettaglio = [];

    // 3️⃣ calcolo costo ingredienti
    for (const ing of ingredienti) {
      const nome = (ing.nome_prodotto || "").trim().toLowerCase();
      const prodotto = mapProdotti[nome];

      if (!prodotto) {
        console.warn("Prodotto non trovato:", ing.nome_prodotto);
        continue;
      }

      const prezzoMedio = await calcolaPrezzoMedioProdotto(prodotto.id);
      const qta = Number(ing.quantita || 0);
      const costo = prezzoMedio * qta;

      costoTotale += costo;

      dettaglio.push({
        prodotto: ing.nome_prodotto,
        quantita: qta,
        prezzo_medio: prezzoMedio,
        costo
      });
    }

    return {
      ricetta_id: ricettaId,
      costo_totale: costoTotale,
      dettaglio
    };
  }

 
