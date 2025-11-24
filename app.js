document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase client non trovato. Controlla index.html.");
  }

  const CURRENT_USER_KEY = "utente_corrente";
  const THEME_KEY = "tema_app"; // "dark" | "light"

  // ---------- DOM BASE ----------
  const views = document.querySelectorAll(".view");
  const routeButtons = document.querySelectorAll("[data-route]");
  const managerMenu = document.getElementById("manager-menu");

  // login
  const loginView = document.getElementById("view-login");
  const loginNomeInput = document.getElementById("login-nome");
  const loginPinInput = document.getElementById("login-pin");
  const loginRememberInput = document.getElementById("login-remember");
  const btnLogin = document.getElementById("btn-login");

  // home dipendente
  const homeDipView = document.getElementById("view-home-dip");

  // header utente
  const currentUserLabel = document.getElementById("current-user-label");
  const btnLogout = document.getElementById("btn-logout");
  const btnTheme = document.getElementById("btn-theme");

  // timbratura – info utente
  const timbUtenteNomeEl = document.getElementById("timbratura-utente-nome");
  const timbCanaleSelect = document.getElementById("timbratura-canale-select");

  // timbratura – pulsanti
  const btnEntra = document.getElementById("btn-entra");
  const btnPausa = document.getElementById("btn-pausa");
  const btnEsci = document.getElementById("btn-esci");

  // timbratura – tabelle e filtri manager
  const listaTimbratureEl = document.getElementById("timbratura-lista");
  const riepilogoDipEl = document.getElementById("riepilogo-dipendenti");
  const riepilogoCanaliEl = document.getElementById("riepilogo-canali");
  const attiviListaEl = document.getElementById("attivi-lista");
  const periodoSelect = document.getElementById("timbratura-periodo");
  const costoDipEl = document.getElementById("costo-dipendenti");
  const costoCanaliEl = document.getElementById("costo-canali");

  const btnToggleTimbrature = document.getElementById("btn-toggle-timbrature");
  const sezioneTimbratureDettaglio = document.getElementById(
    "sezione-timbrature-dettaglio"
  );

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
  const dipendentiListaEl = document.getElementById("dipendenti-lista");
  const btnAddDip = document.getElementById("btn-add-dip");

  // vista ricette
  const ricetteView = document.getElementById("view-ricette");
  const ricettaNomeInput = document.getElementById("ricetta-nome");
  const ricettaDescrizioneInput = document.getElementById("ricetta-descrizione");
  const ricettaNoteInput = document.getElementById("ricetta-note");
  const ricettaFotoInput = document.getElementById("ricetta-foto");
  const containerIngredienti = document.getElementById(
    "ricetta-ingredienti-container"
  );
  const btnAddIngrediente = document.getElementById("btn-add-ingrediente");
  const btnSalvaRicetta = document.getElementById("btn-salva-ricetta");

  // creati dinamicamente per lista + ricerca ricette
  let ricetteSearchInput = null;
  let ricetteTableBody = null;
  let ricettaFotoPreview = null;

  // stato runtime
  let currentUser = null;
  let dipendentiCache = [];
  let currentEditingDipendenteId = null;

  let currentRicettaId = null; // null = nuova, numero = modifica
  let ricetteCache = [];

  // ---------- UTILITA' ----------

  function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return (
      d.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }) +
      " " +
      d.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }

  function isManager(user) {
    if (!user) return false;
    const ruolo = (user.ruolo || "").toLowerCase();
    return (
      ruolo === "admin" ||
      ruolo === "manager_cucina" ||
      ruolo === "manager_sala"
    );
  }

  function showView(route) {
    views.forEach((v) => (v.style.display = "none"));
    const viewToShow = document.getElementById(`view-${route}`);
    if (viewToShow) {
      viewToShow.style.display = "block";
    }
  }

  function applyRoleVisibility() {
    const managerOnlyEls = document.querySelectorAll("[data-manager-only='true']");
    if (!currentUser || !isManager(currentUser)) {
      managerOnlyEls.forEach((el) => (el.style.display = "none"));
      if (managerMenu) managerMenu.style.display = "none";
    } else {
      managerOnlyEls.forEach((el) => (el.style.display = ""));
      if (managerMenu) managerMenu.style.display = "grid";
    }
  }

  function updateHeaderUser() {
    if (!currentUser) {
      currentUserLabel.textContent = "Nessun utente";
      if (btnLogout) btnLogout.style.display = "none";
      return;
    }
    currentUserLabel.textContent = `${currentUser.nome} (${currentUser.ruolo || "dipendente"})`;
    if (btnLogout) btnLogout.style.display = "inline-flex";

    if (timbUtenteNomeEl) {
      timbUtenteNomeEl.textContent = currentUser.nome;
    }
  }

  function setCurrentUser(user, persist) {
    currentUser = {
      id: user.id ?? null,
      nome: user.nome,
      ruolo: user.ruolo || "",
      canalePrevalente: user.canale_prevalente || user.canalePrevalente || "NR",
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

      const found = dipendentiCache.find((d) => d.id === saved.id);
      if (found) {
        setCurrentUser(found, true);
        return;
      }

      const byName = dipendentiCache.find(
        (d) =>
          d.nome &&
          d.nome.toLowerCase() === String(saved.nome || "").toLowerCase()
      );
      if (byName) {
        setCurrentUser(byName, true);
      }
    } catch {
      /* ignore */
    }
  }

  function showLogin() {
    currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    updateHeaderUser();
    applyRoleVisibility();
    views.forEach((v) => (v.style.display = "none"));
    if (loginView) loginView.style.display = "flex";
  }

  function showHomeAfterLogin() {
    views.forEach((v) => (v.style.display = "none"));
    if (!currentUser) {
      if (loginView) loginView.style.display = "flex";
      return;
    }

    if (isManager(currentUser)) {
      if (managerMenu) managerMenu.style.display = "grid";
      managerMenu.style.display = "grid";
      managerMenu.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      if (homeDipView) homeDipView.style.display = "block";
    }
  }

  // ---------- TEMA ----------

  function applyTheme(theme) {
    if (theme === "light") {
      document.body.classList.add("theme-light");
      if (btnTheme) btnTheme.textContent = "🌞";
    } else {
      document.body.classList.remove("theme-light");
      if (btnTheme) btnTheme.textContent = "🌙";
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const initial = saved === "light" ? "light" : "dark";
    applyTheme(initial);
  }

  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      const isLight = document.body.classList.contains("theme-light");
      const newTheme = isLight ? "dark" : "light";
      applyTheme(newTheme);
      localStorage.setItem(THEME_KEY, newTheme);
    });
  }

  initTheme();

  // ---------- LOGIN ----------

  async function caricaDipendenti() {
    const { data, error } = await supabase
      .from("dipendenti")
      .select("*")
      .order("nome", { ascending: true });
    if (error) {
      console.error("Errore caricamento dipendenti", error);
      return;
    }
    dipendentiCache = data || [];
    renderDipendenti();
  }

  async function handleLogin() {
    const nome = (loginNomeInput?.value || "").trim();
    const pin = (loginPinInput?.value || "").trim();

    if (!nome || !pin) {
      alert("Inserisci nome e PIN.");
      return;
    }

    const { data, error } = await supabase
      .from("dipendenti")
      .select("*")
      .eq("nome", nome)
      .eq("pin_personale", pin)
      .maybeSingle(); // se non trovi nulla, data = null

    if (error) {
      console.error("Errore login", error);
      alert("Errore durante il login.");
      return;
    }

    if (!data) {
      alert("Nome o PIN non corretti.");
      return;
    }

    const dip = data;
    if (dip.attivo === false) {
      alert("Dipendente non attivo.");
      return;
    }

    setCurrentUser(dip, loginRememberInput?.checked);
    if (loginView) loginView.style.display = "none";
    showHomeAfterLogin();
  }

  if (btnLogin) {
    btnLogin.addEventListener("click", handleLogin);
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      showLogin();
    });
  }

  // permetti invio con Enter
  if (loginPinInput) {
    loginPinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleLogin();
      }
    });
  }

  // ---------- ROUTING GENERALE ----------

  routeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.route;
      if (!route) return;

      if (!currentUser) {
        alert("Devi effettuare il login.");
        showLogin();
        return;
      }

      // Nasconde tutte le view
      views.forEach((v) => (v.style.display = "none"));

      // Mostra quella richiesta
      const viewToShow = document.getElementById(`view-${route}`);
      if (viewToShow) {
        viewToShow.style.display = "block";
      }

      // azioni specifiche route
      if (route === "timbratura") {
        if (timbUtenteNomeEl && currentUser) {
          timbUtenteNomeEl.textContent = currentUser.nome;
        }
        aggiornaTabelleTimbrature();
      } else if (route === "dipendenti") {
        caricaDipendenti();
      } else if (route === "ricette") {
        initRicetteUI();
        loadRicette();
        resetEditorRicetta();
      }
    });
  });

  // ---------- ANAGRAFICA DIPENDENTI ----------

  function calcolaCostoOrario(tipo, retribuzioneBase, oreMensili, oreServizio) {
    let costo = 0;
    if (tipo === "orario") {
      costo = retribuzioneBase;
    } else if (tipo === "mensile") {
      if (oreMensili > 0) {
        costo = retribuzioneBase / oreMensili;
      }
    } else if (tipo === "servizio") {
      if (oreServizio > 0) {
        costo = retribuzioneBase / oreServizio;
      }
    }
    if (!Number.isFinite(costo)) return 0;
    return costo;
  }

  function aggiornaUICompenso() {
    if (!dipTipoCompenso || !labelRetribuzione) return;
    const tipo = dipTipoCompenso.value || "orario";

    if (tipo === "orario") {
      labelRetribuzione.childNodes[0].textContent = "Paga oraria lorda (€/h)";
      if (rowOreMensili) rowOreMensili.style.display = "none";
      if (rowOreServizio) rowOreServizio.style.display = "none";
    } else if (tipo === "mensile") {
      labelRetribuzione.childNodes[0].textContent =
        "Stipendio lordo mensile (€/mese)";
      if (rowOreMensili) rowOreMensili.style.display = "block";
      if (rowOreServizio) rowOreServizio.style.display = "none";
    } else if (tipo === "servizio") {
      labelRetribuzione.childNodes[0].textContent =
        "Paga lorda per servizio (€/servizio)";
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

  function clearDipendenteForm() {
    currentEditingDipendenteId = null;
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
    aggiornaUICompenso();
  }

  function renderDipendenti() {
    if (!dipendentiListaEl) return;
    dipendentiListaEl.innerHTML = "";
    dipendentiCache.forEach((d) => {
      const tr = document.createElement("tr");

      const tdNome = document.createElement("td");
      tdNome.textContent = d.nome || "";
      tr.appendChild(tdNome);

      const tdMansione = document.createElement("td");
      tdMansione.textContent = d.mansione || "";
      tr.appendChild(tdMansione);

      const tdDataNascita = document.createElement("td");
      tdDataNascita.textContent = d.data_nascita || "";
      tr.appendChild(tdDataNascita);

      const tdResidenza = document.createElement("td");
      tdResidenza.textContent = d.residenza || "";
      tr.appendChild(tdResidenza);

      const tdTel = document.createElement("td");
      tdTel.textContent = d.telefono || "";
      tr.appendChild(tdTel);

      const tdEmail = document.createElement("td");
      tdEmail.textContent = d.email || "";
      tr.appendChild(tdEmail);

      const tdRuolo = document.createElement("td");
      tdRuolo.textContent = d.ruolo || "";
      tr.appendChild(tdRuolo);

      const tdTipo = document.createElement("td");
      tdTipo.textContent = d.tipo_compenso || "";
      tr.appendChild(tdTipo);

      const tdCosto = document.createElement("td");
      tdCosto.textContent =
        d.costo_orario != null ? Number(d.costo_orario).toFixed(2) : "";
      tr.appendChild(tdCosto);

      const tdCanale = document.createElement("td");
      tdCanale.textContent = d.canale_prevalente || "";
      tr.appendChild(tdCanale);

      const tdPin = document.createElement("td");
      tdPin.textContent = d.pin_personale || "";
      tr.appendChild(tdPin);

      const tdAttivo = document.createElement("td");
      tdAttivo.textContent = d.attivo ? "Sì" : "No";
      tr.appendChild(tdAttivo);

      const tdAzioni = document.createElement("td");
      const btnMod = document.createElement("button");
      btnMod.className = "app-button tiny";
      btnMod.textContent = "Modifica";
      btnMod.addEventListener("click", () => {
        loadDipendenteInForm(d);
      });
      tdAzioni.appendChild(btnMod);
      tr.appendChild(tdAzioni);

      dipendentiListaEl.appendChild(tr);
    });
  }

  function loadDipendenteInForm(d) {
    currentEditingDipendenteId = d.id;
    if (dipNome) dipNome.value = d.nome || "";
    if (dipMansione) dipMansione.value = d.mansione || "";
    if (dipDataNascita) dipDataNascita.value = d.data_nascita || "";
    if (dipResidenza) dipResidenza.value = d.residenza || "";
    if (dipTelefono) dipTelefono.value = d.telefono || "";
    if (dipEmail) dipEmail.value = d.email || "";
    if (dipRuolo) dipRuolo.value = d.ruolo || "";
    if (dipTipoCompenso) dipTipoCompenso.value = d.tipo_compenso || "orario";
    if (dipRetribuzioneBase)
      dipRetribuzioneBase.value =
        d.retribuzione_base != null ? d.retribuzione_base : "";
    if (dipOreMensili)
      dipOreMensili.value = d.ore_mensili != null ? d.ore_mensili : "";
    if (dipOreServizio)
      dipOreServizio.value =
        d.ore_per_servizio != null ? d.ore_per_servizio : "";
    if (dipCosto)
      dipCosto.value =
        d.costo_orario != null ? Number(d.costo_orario).toFixed(2) : "";
    if (dipCodice) dipCodice.value = d.pin_personale || "";
    if (dipCanale)
      dipCanale.value = d.canale_prevalente || d.canale || "NR";
    if (dipAttivo) dipAttivo.checked = d.attivo !== false;
    aggiornaUICompenso();
  }

  async function salvaDipendente() {
    const nome = (dipNome?.value || "").trim();
    if (!nome) {
      alert("Inserisci il nome del dipendente.");
      return;
    }

    const mansione = (dipMansione?.value || "").trim();
    const dataNascita = dipDataNascita?.value || null;
    const residenza = (dipResidenza?.value || "").trim();
    const telefono = (dipTelefono?.value || "").trim();
    const email = (dipEmail?.value || "").trim();
    const ruolo = dipRuolo?.value || "";
    const tipoCompenso = dipTipoCompenso?.value || "orario";
    const retribuzioneBase =
      parseFloat(dipRetribuzioneBase?.value || "0") || 0;
    const oreMensiliVal = parseFloat(dipOreMensili?.value || "0") || 0;
    const oreServizioVal = parseFloat(dipOreServizio?.value || "0") || 0;
    const costo =
      parseFloat(dipCosto?.value || "0") ||
      calcolaCostoOrario(
        tipoCompenso,
        retribuzioneBase,
        oreMensiliVal,
        oreServizioVal
      );
    const pin = (dipCodice?.value || "").trim();
    const canalePrev = dipCanale?.value || "NR";
    const attivo = dipAttivo?.checked ?? true;

    const payload = {
      nome,
      mansione,
      data_nascita: dataNascita,
      residenza,
      telefono,
      email,
      ruolo,
      tipo_compenso: tipoCompenso,
      retribuzione_base: retribuzioneBase,
      ore_mensili: oreMensiliVal,
      ore_per_servizio: oreServizioVal,
      costo_orario: costo,
      pin_personale: pin,
      canale_prevalente: canalePrev,
      attivo,
    };

    let error;
    if (currentEditingDipendenteId) {
      ({ error } = await supabase
        .from("dipendenti")
        .update(payload)
        .eq("id", currentEditingDipendenteId));
    } else {
      ({ error } = await supabase.from("dipendenti").insert(payload));
    }

    if (error) {
      console.error("Errore salvataggio dipendente", error);
      alert("Errore nel salvataggio del dipendente");
      return;
    }

    clearDipendenteForm();
    await caricaDipendenti();
  }

  if (btnAddDip) {
    btnAddDip.addEventListener("click", salvaDipendente);
  }

  // ---------- TIMBRATURE ----------

  async function registraTimbratura(tipo) {
    if (!currentUser) {
      alert("Devi fare login.");
      return;
    }

    const canale = timbCanaleSelect?.value || currentUser.canalePrevalente || "NR";

    // Qui facciamo un controllo semplice sull'ultima timbratura per impedire doppie ENTRA ecc.
    const { data: lastList, error: errLast } = await supabase
      .from("timbrature")
      .select("*")
      .eq("dipendente_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (errLast) {
      console.error("Errore lettura ultima timbratura", errLast);
    } else if (lastList && lastList.length > 0) {
      const last = lastList[0];
      const lastTipo = (last.tipo || last.azione || "").toUpperCase();

      if (tipo === "ENTRA" && lastTipo === "ENTRA") {
        alert("Sei già entrato. Devi fare USCITA prima di una nuova ENTRA.");
        return;
      }
      if ((tipo === "PAUSA" || tipo === "USCITA") && lastTipo === "USCITA") {
        alert("Non puoi fare PAUSA/USCITA senza una ENTRA aperta.");
        return;
      }
    }

    const payload = {
      dipendente_id: currentUser.id,
      dipendente_nome: currentUser.nome,
      canale,
      tipo, // oppure 'azione', adegua al nome colonna se necessario
    };

    const { error } = await supabase.from("timbrature").insert(payload);
    if (error) {
      console.error("Errore registrazione timbratura", error);
      alert("Errore nella timbratura.");
      return;
    }

    aggiornaTabelleTimbrature();
  }

  if (btnEntra) {
    btnEntra.addEventListener("click", () => registraTimbratura("ENTRA"));
  }
  if (btnPausa) {
    btnPausa.addEventListener("click", () => registraTimbratura("PAUSA"));
  }
  if (btnEsci) {
    btnEsci.addEventListener("click", () => registraTimbratura("USCITA"));
  }

  if (btnToggleTimbrature && sezioneTimbratureDettaglio) {
    btnToggleTimbrature.addEventListener("click", () => {
      const isHidden = sezioneTimbratureDettaglio.style.display === "none";
      sezioneTimbratureDettaglio.style.display = isHidden ? "block" : "none";
      btnToggleTimbrature.textContent = isHidden
        ? "Nascondi storico timbrature"
        : "Mostra storico timbrature";
    });
  }

  function getPeriodoRange() {
    const oggi = new Date();
    const periodo = periodoSelect?.value || "oggi";

    let start, end;
    if (periodo === "oggi") {
      start = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 0, 0, 0);
      end = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 23, 59, 59);
    } else if (periodo === "settimana") {
      end = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 23, 59, 59);
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else {
      // mese corrente
      start = new Date(oggi.getFullYear(), oggi.getMonth(), 1, 0, 0, 0);
      end = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0, 23, 59, 59);
    }

    return {
      from: start.toISOString(),
      to: end.toISOString(),
    };
  }

  async function aggiornaTabelleTimbrature() {
    const range = getPeriodoRange();

    const { data, error } = await supabase
      .from("timbrature")
      .select("*")
      .gte("created_at", range.from)
      .lte("created_at", range.to)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Errore caricamento timbrature", error);
      return;
    }

    const timbrature = data || [];
    renderTimbratureLista(timbrature);
    calcolaRiepiloghiDaTimbrature(timbrature);
  }

  if (periodoSelect) {
    periodoSelect.addEventListener("change", aggiornaTabelleTimbrature);
  }

  function renderTimbratureLista(timbrature) {
    if (!listaTimbratureEl) return;
    listaTimbratureEl.innerHTML = "";
    timbrature.forEach((t) => {
      const tr = document.createElement("tr");
      const tdOra = document.createElement("td");
      tdOra.textContent = formatDateTime(t.created_at);
      tr.appendChild(tdOra);

      const tdDip = document.createElement("td");
      tdDip.textContent = t.dipendente_nome || t.dipendente || "";
      tr.appendChild(tdDip);

      const tdCanale = document.createElement("td");
      tdCanale.textContent = t.canale || "";
      tr.appendChild(tdCanale);

      const tdAzione = document.createElement("td");
      tdAzione.textContent = t.tipo || t.azione || "";
      tr.appendChild(tdAzione);

      listaTimbratureEl.appendChild(tr);
    });
  }

  function calcolaRiepiloghiDaTimbrature(timbrature) {
    // Calcoliamo ore per dipendente/canale e costo lavoro usando dipendentiCache
    const perDip = {};
    const perCanale = {};
    const attivi = {};

    const byDip = {};
    timbrature.forEach((t) => {
      const key = `${t.dipendente_id || t.dipendente_nome || ""}||${t.canale || ""}`;
      if (!byDip[key]) byDip[key] = [];
      byDip[key].push(t);
    });

    Object.entries(byDip).forEach(([key, arr]) => {
      arr.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      let lastEntra = null;
      let totaleOre = 0;
      arr.forEach((t) => {
        const tipo = (t.tipo || t.azione || "").toUpperCase();
        if (tipo === "ENTRA") {
          lastEntra = new Date(t.created_at);
          attivi[key] = t;
        } else if (tipo === "USCITA") {
          if (lastEntra) {
            const uscita = new Date(t.created_at);
            const diffMs = uscita.getTime() - lastEntra.getTime();
            const diffOre = diffMs / (1000 * 60 * 60);
            if (diffOre > 0) totaleOre += diffOre;
            lastEntra = null;
          }
          delete attivi[key];
        }
      });

      const [dipKey, canale] = key.split("||");
      const dipId = arr[0].dipendente_id;
      const nomeDip = arr[0].dipendente_nome || dipKey;

      const kDip = `${nomeDip}||${canale}`;
      perDip[kDip] = (perDip[kDip] || 0) + totaleOre;
      perCanale[canale] = (perCanale[canale] || 0) + totaleOre;
    });

    // render riepilogo dipendenti
    if (riepilogoDipEl) {
      riepilogoDipEl.innerHTML = "";
      Object.entries(perDip).forEach(([key, ore]) => {
        const [nome, canale] = key.split("||");
        const tr = document.createElement("tr");
        const tdNome = document.createElement("td");
        tdNome.textContent = nome;
        tr.appendChild(tdNome);

        const tdCanale = document.createElement("td");
        tdCanale.textContent = canale;
        tr.appendChild(tdCanale);

        const tdOre = document.createElement("td");
        tdOre.textContent = ore.toFixed(2);
        tr.appendChild(tdOre);

        riepilogoDipEl.appendChild(tr);
      });
    }

    // riepilogo per canale
    if (riepilogoCanaliEl) {
      riepilogoCanaliEl.innerHTML = "";
      Object.entries(perCanale).forEach(([canale, ore]) => {
        const tr = document.createElement("tr");
        const tdCanale = document.createElement("td");
        tdCanale.textContent = canale;
        tr.appendChild(tdCanale);

        const tdOre = document.createElement("td");
        tdOre.textContent = ore.toFixed(2);
        tr.appendChild(tdOre);

        riepilogoCanaliEl.appendChild(tr);
      });
    }

    // costo lavoro
    if (costoDipEl) costoDipEl.innerHTML = "";
    if (costoCanaliEl) costoCanaliEl.innerHTML = "";

    const costoPerDip = {};
    const costoPerCanale = {};

    Object.entries(perDip).forEach(([key, ore]) => {
      const [nome, canale] = key.split("||");
      const dip = dipendentiCache.find(
        (d) => (d.nome || "").toLowerCase() === nome.toLowerCase()
      );
      const costoOrario = dip?.costo_orario || 0;
      const costo = ore * costoOrario;

      const kDip = `${nome}||${canale}`;
      costoPerDip[kDip] = (costoPerDip[kDip] || 0) + costo;
      costoPerCanale[canale] = (costoPerCanale[canale] || 0) + costo;
    });

    if (costoDipEl) {
      Object.entries(perDip).forEach(([key, ore]) => {
        const [nome, canale] = key.split("||");
        const costo = costoPerDip[key] || 0;
        const tr = document.createElement("tr");

        const tdNome = document.createElement("td");
        tdNome.textContent = nome;
        tr.appendChild(tdNome);

        const tdCanale = document.createElement("td");
        tdCanale.textContent = canale;
        tr.appendChild(tdCanale);

        const tdOre = document.createElement("td");
        tdOre.textContent = ore.toFixed(2);
        tr.appendChild(tdOre);

        const tdCosto = document.createElement("td");
        tdCosto.textContent = costo.toFixed(2);
        tr.appendChild(tdCosto);

        costoDipEl.appendChild(tr);
      });
    }

    if (costoCanaliEl) {
      Object.entries(perCanale).forEach(([canale, ore]) => {
        const costo = costoPerCanale[canale] || 0;
        const tr = document.createElement("tr");

        const tdCanale = document.createElement("td");
        tdCanale.textContent = canale;
        tr.appendChild(tdCanale);

        const tdOre = document.createElement("td");
        tdOre.textContent = ore.toFixed(2);
        tr.appendChild(tdOre);

        const tdCosto = document.createElement("td");
        tdCosto.textContent = costo.toFixed(2);
        tr.appendChild(tdCosto);

        costoCanaliEl.appendChild(tr);
      });
    }

    // attivi adesso
    if (attiviListaEl) {
      attiviListaEl.innerHTML = "";
      Object.values(attivi).forEach((t) => {
        const tr = document.createElement("tr");
        const tdNome = document.createElement("td");
        tdNome.textContent = t.dipendente_nome || "";
        tr.appendChild(tdNome);

        const tdCanale = document.createElement("td");
        tdCanale.textContent = t.canale || "";
        tr.appendChild(tdCanale);

        const tdDaQuando = document.createElement("td");
        tdDaQuando.textContent = formatDateTime(t.created_at);
        tr.appendChild(tdDaQuando);

        const tdDurata = document.createElement("td");
        const start = new Date(t.created_at);
        const diffMs = Date.now() - start.getTime();
        const diffOre = diffMs / (1000 * 60 * 60);
        tdDurata.textContent = diffOre.toFixed(2) + " h";
        tr.appendChild(tdDurata);

        attiviListaEl.appendChild(tr);
      });
    }
  }

  // ---------- RICETTE: UI DINAMICA + LOGICA ----------

  function ensureRicetteListUI() {
    if (!ricetteView) return;
    if (ricetteSearchInput && ricetteTableBody && ricettaFotoPreview) return;

    // sezione elenco + ricerca
    const section = document.createElement("section");
    section.style.marginTop = "16px";

    section.innerHTML = `
      <h3>Elenco ricette</h3>
      <div class="form-row">
        <label>
          Cerca per nome
          <input type="text" id="ricette-search" placeholder="Digita per filtrare..." />
        </label>
      </div>
      <div class="table-wrapper" style="margin-top: 8px; max-height: 260px; overflow-y: auto;">
        <table class="table-timbrature">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Descrizione</th>
              <th>Creata il</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody id="ricette-list-body"></tbody>
        </table>
      </div>
    `;

    ricetteView.appendChild(section);

    ricetteSearchInput = ricetteView.querySelector("#ricette-search");
    ricetteTableBody = ricetteView.querySelector("#ricettes-list-body") ||
      ricetteView.querySelector("#ricette-list-body");

    if (ricetteSearchInput) {
      ricetteSearchInput.addEventListener("input", () => {
        const term = ricetteSearchInput.value.toLowerCase();
        renderRicetteList(
          ricetteCache.filter((r) =>
            (r.nome || "").toLowerCase().includes(term)
          )
        );
      });
    }

    // preview immagine sotto il campo file se non esiste
    if (ricettaFotoInput && !ricettaFotoPreview) {
      ricettaFotoPreview = document.createElement("img");
      ricettaFotoPreview.style.marginTop = "6px";
      ricettaFotoPreview.style.maxWidth = "160px";
      ricettaFotoPreview.style.borderRadius = "12px";
      ricettaFotoPreview.style.display = "none";
      ricettaFotoInput.parentElement.appendChild(ricettaFotoPreview);
    }

    if (ricettaFotoInput) {
      ricettaFotoInput.addEventListener("change", () => {
        const file = ricettaFotoInput.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (ricettaFotoPreview) {
              ricettaFotoPreview.src = e.target.result;
              ricettaFotoPreview.style.display = "block";
            }
          };
          reader.readAsDataURL(file);
        } else if (ricettaFotoPreview) {
          ricettaFotoPreview.src = "";
          ricettaFotoPreview.style.display = "none";
        }
      });
    }
  }

  function creaRigaIngrediente() {
    const div = document.createElement("div");
    div.className = "ingrediente-row";
    div.style.display = "flex";
    div.style.gap = "6px";
    div.style.alignItems = "center";

    div.innerHTML = `
      <input type="text" class="ing-nome" placeholder="Ingrediente" style="flex:2;" />
      <input type="number" class="ing-quantita" placeholder="Qtà" step="0.01" style="flex:1;" />
      <input type="text" class="ing-unita" placeholder="Unità (g, ml, ecc.)" style="flex:1;" />
      <button type="button" class="app-button tiny btn-del-ing" style="background:#dc2626;color:#fff;">X</button>
    `;

    div.querySelector(".btn-del-ing").addEventListener("click", () => {
      div.remove();
    });

    return div;
  }

  function resetEditorRicetta() {
    currentRicettaId = null;
    if (ricettaNomeInput) ricettaNomeInput.value = "";
    if (ricettaDescrizioneInput) ricettaDescrizioneInput.value = "";
    if (ricettaNoteInput) ricettaNoteInput.value = "";
    if (ricettaFotoInput) ricettaFotoInput.value = "";
    if (ricettaFotoPreview) {
      ricettaFotoPreview.src = "";
      ricettaFotoPreview.style.display = "none";
    }
    if (containerIngredienti) {
      containerIngredienti.innerHTML = "";
      containerIngredienti.appendChild(creaRigaIngrediente());
    }
  }

  function renderRicetteList(lista) {
    if (!ricetteTableBody) return;
    ricetteTableBody.innerHTML = "";
    (lista || []).forEach((r) => {
      const tr = document.createElement("tr");

      const tdNome = document.createElement("td");
      tdNome.textContent = r.nome || "";
      tr.appendChild(tdNome);

      const tdDesc = document.createElement("td");
      tdDesc.textContent = r.descrizione || "";
      tr.appendChild(tdDesc);

      const tdData = document.createElement("td");
      tdData.textContent = formatDateTime(r.created_at);
      tr.appendChild(tdData);

      const tdAzioni = document.createElement("td");
      const btnMod = document.createElement("button");
      btnMod.className = "app-button tiny";
      btnMod.textContent = "Modifica";
      btnMod.addEventListener("click", () => {
        caricaRicettaInEditor(r.id);
      });
      tdAzioni.appendChild(btnMod);

      tr.appendChild(tdAzioni);

      ricetteTableBody.appendChild(tr);
    });
  }

  async function loadRicette() {
    const { data, error } = await supabase
      .from("ricette")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Errore caricamento ricette", error);
      return;
    }
    ricetteCache = data || [];
    const term = (ricetteSearchInput?.value || "").toLowerCase();
    const filtrate = term
      ? ricetteCache.filter((r) =>
          (r.nome || "").toLowerCase().includes(term)
        )
      : ricetteCache;
    renderRicetteList(filtrate);
  }

  async function caricaRicettaInEditor(id) {
    const { data: ricetta, error } = await supabase
      .from("ricette")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Errore caricamento ricetta", error);
      alert("Errore nel caricare la ricetta.");
      return;
    }

    currentRicettaId = ricetta.id;
    if (ricettaNomeInput) ricettaNomeInput.value = ricetta.nome || "";
    if (ricettaDescrizioneInput)
      ricettaDescrizioneInput.value = ricetta.descrizione || "";
    if (ricettaNoteInput)
      ricettaNoteInput.value = ricetta.note_procedimento || "";

    if (ricetta.foto_url && ricettaFotoPreview) {
      ricettaFotoPreview.src = ricetta.foto_url;
      ricettaFotoPreview.style.display = "block";
    } else if (ricettaFotoPreview) {
      ricettaFotoPreview.src = "";
      ricettaFotoPreview.style.display = "none";
    }
    if (ricettaFotoInput) ricettaFotoInput.value = "";

    // ingredienti
    const { data: ingredienti, error: errIng } = await supabase
      .from("ricetta_ingredienti")
      .select("*")
      .eq("ricetta_id", id)
      .order("id", { ascending: true });

    if (errIng) {
      console.error("Errore caricamento ingredienti", errIng);
      return;
    }

    if (containerIngredienti) {
      containerIngredienti.innerHTML = "";
      (ingredienti || []).forEach((ing) => {
        const row = creaRigaIngrediente();
        row.querySelector(".ing-nome").value =
          ing.nome_prodotto || ing.nome || "";
        row.querySelector(".ing-quantita").value =
          ing.quantita != null ? ing.quantita : "";
        row.querySelector(".ing-unita").value =
          ing.unita_misura || ing.unita || "";
        containerIngredienti.appendChild(row);
      });
      if (!ingredienti || ingredienti.length === 0) {
        containerIngredienti.appendChild(creaRigaIngrediente());
      }
    }
  }

  async function salvaRicetta() {
    if (!ricettaNomeInput) return;
    const nome = ricettaNomeInput.value.trim();
    if (!nome) {
      alert("Inserisci il nome della ricetta.");
      return;
    }

    const descrizione = (ricettaDescrizioneInput?.value || "").trim();
    const note = (ricettaNoteInput?.value || "").trim();

    // gestisci eventuale upload foto
    let fotoUrl = null;
    const file = ricettaFotoInput?.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `ricetta_${Date.now()}.${ext || "jpg"}`;
      const { error: upErr } = await supabase.storage
        .from("ricette_foto")
        .upload(path, file, { upsert: true });
      if (upErr) {
        console.error("Errore upload immagine ricetta", upErr);
        alert("Errore nel caricamento dell'immagine (ma salvo comunque la ricetta).");
      } else {
        const { data: urlData } = supabase.storage
          .from("ricette_foto")
          .getPublicUrl(path);
        fotoUrl = urlData?.publicUrl || null;
      }
    }

    const basePayload = {
      nome,
      descrizione,
      note_procedimento: note,
    };
    if (fotoUrl) basePayload.foto_url = fotoUrl;

    let ricettaId = currentRicettaId;
    if (ricettaId) {
      const { error } = await supabase
        .from("ricette")
        .update(basePayload)
        .eq("id", ricettaId);
      if (error) {
        console.error("Errore aggiornamento ricetta", error);
        alert("Errore nel salvataggio della ricetta.");
        return;
      }

      // cancella ingredienti esistenti e reinserisci
      const { error: delErr } = await supabase
        .from("ricetta_ingredienti")
        .delete()
        .eq("ricetta_id", ricettaId);
      if (delErr) {
        console.error("Errore cancellazione ingredienti esistenti", delErr);
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("ricette")
        .insert(basePayload)
        .select()
        .single();
      if (error) {
        console.error("Errore inserimento nuova ricetta", error);
        alert("Errore nel salvataggio della ricetta.");
        return;
      }
      ricettaId = inserted.id;
      currentRicettaId = ricettaId;
    }

    // ingredienti
    if (containerIngredienti) {
      const rows = Array.from(
        containerIngredienti.querySelectorAll(".ingrediente-row")
      );
      const righe = rows
        .map((row) => {
          const nomeIng = row.querySelector(".ing-nome").value.trim();
          const qta =
            parseFloat(row.querySelector(".ing-quantita").value || "0") || 0;
          const unita = row.querySelector(".ing-unita").value.trim();
          if (!nomeIng) return null;
          return {
            ricetta_id: ricettaId,
            nome_prodotto: nomeIng,
            quantita: qta,
            unita_misura: unita || "pz",
          };
        })
        .filter(Boolean);

      if (righe.length > 0) {
        const { error: insIngErr } = await supabase
          .from("ricetta_ingredienti")
          .insert(righe);
        if (insIngErr) {
          console.error("Errore salvataggio ingredienti", insIngErr);
          alert("Errore nel salvataggio degli ingredienti.");
        }
      }
    }

    alert("Ricetta salvata!");
    await loadRicette();
    resetEditorRicetta();
  }

  function initRicetteUI() {
    if (!ricetteView) return;
    ensureRicetteListUI();

    if (btnAddIngrediente && !btnAddIngrediente._listenerAttached) {
      btnAddIngrediente.addEventListener("click", () => {
        if (containerIngredienti) {
          containerIngredienti.appendChild(creaRigaIngrediente());
        }
      });
      btnAddIngrediente._listenerAttached = true;
    }

    if (btnSalvaRicetta && !btnSalvaRicetta._listenerAttached) {
      btnSalvaRicetta.addEventListener("click", salvaRicetta);
      btnSalvaRicetta._listenerAttached = true;
    }
  }

  // ---------- AVVIO APP ----------

  // carica dipendenti per login / costi lavoro
  await caricaDipendenti();
  // prova a ripristinare utente salvato
  restoreUserFromStorage();

  if (currentUser) {
    // utente ricordato
    if (loginView) loginView.style.display = "none";
    showHomeAfterLogin();
  } else {
    showLogin();
  }
});
