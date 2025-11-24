document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase client non trovato. Controlla index.html.");
  }

  const CURRENT_USER_KEY = "utente_corrente";
  const THEME_KEY = "tema_app"; // "dark" | "light"

  // Regole semplici per suggerire categorie da descrizione prodotto
  const REGOLE_CATEGORIA = [
    {
      nome: "Farinacei",
      match: ["farina", "semola", "grano", "riso", "pasta"],
    },
    {
      nome: "Carni suine",
      match: ["maiale", "suino", "coppa", "lonza", "salsiccia"],
    },
    {
      nome: "Carni bovine",
      match: ["vitello", "manzo", "bovino", "entrecote", "costata"],
    },
    {
      nome: "Carni avicole",
      match: ["pollo", "gallo", "tacchino", "coscia di pollo"],
    },
    {
      nome: "Pesce",
      match: ["merluzzo", "salmone", "tonno", "branzino", "orata"],
    },
    {
      nome: "Conserve di pomodoro",
      match: ["passata", "pelati", "pomodoro", "polpa di pomodoro"],
    },
    {
      nome: "Latticini",
      match: ["latte", "burro", "panna", "mozzarella", "formaggio"],
    },
    {
      nome: "Ortaggi",
      match: ["zucchine", "melanzane", "carote", "cipolle", "patate"],
    },
  ];

  // DOM base
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
  const lista = document.getElementById("timbratura-lista");
  const riepilogoDipEl = document.getElementById("riepilogo-dipendenti");
  const riepilogoCanaliEl = document.getElementById("riepilogo-canali");
  const attiviListaEl = document.getElementById("attivi-lista");
  const periodoSelect = document.getElementById("timbratura-periodo");
  const costoDipEl = document.getElementById("costo-dipendenti");
  const costoCanaliEl = document.getElementById("costo-canali");

  // toggle storico timbrature
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
  const btnAddDip = document.getElementById("btn-add-dip");
  const dipLista = document.getElementById("dipendenti-lista");
  const btnToggleDipendenti = document.getElementById(
    "btn-toggle-dipendenti"
  );
  const sezioneDipendentiElenco = document.getElementById(
    "sezione-dipendenti-elenco"
  );

  // ACQUISTI – fornitori
  const fornitoreForm = document.getElementById("fornitore-form");
  const fornitoreNomeInput = document.getElementById("fornitore-nome");
  const fornitorePivaInput = document.getElementById("fornitore-piva");
  const fornitoreIndirizzoInput = document.getElementById(
    "fornitore-indirizzo"
  );
  const fornitoreTelefonoInput = document.getElementById("fornitore-telefono");
  const fornitoreEmailInput = document.getElementById("fornitore-email");
  const fornitoreNoteInput = document.getElementById("fornitore-note");
  const btnAddFornitore = document.getElementById("btn-add-fornitore");
  const fornitoriListaEl = document.getElementById("fornitori-lista");
  const btnToggleFornitori = document.getElementById("btn-toggle-fornitori");
  const sezioneFornitoriElenco = document.getElementById(
    "sezione-fornitori-elenco"
  );

  // ACQUISTI – fatture
  const fatturaForm = document.getElementById("fattura-form");
  const fatturaFornitoreSelect = document.getElementById(
    "fattura-fornitore-select"
  );
  const fatturaNumeroInput = document.getElementById("fattura-numero");
  const fatturaDataInput = document.getElementById("fattura-data");
  const fatturaTotaleInput = document.getElementById("fattura-totale");
  const fatturaFileInput = document.getElementById("fattura-file");
  const fatturaNoteInput = document.getElementById("fattura-note");
  const btnAddFattura = document.getElementById("btn-add-fattura");
  const fattureListaEl = document.getElementById("fatture-lista");

  // ACQUISTI – dettaglio fattura / righe
  const fatturaDettaglioBox = document.getElementById("fattura-dettaglio");
  const fatturaDettaglioIntestazione = document.getElementById(
    "fattura-dettaglio-intestazione"
  );
  const fatturaRigaForm = document.getElementById("fattura-riga-form");
  const fatturaRigaDescrizioneInput = document.getElementById(
    "fattura-riga-descrizione"
  );
  const fatturaRigaQuantitaInput = document.getElementById(
    "fattura-riga-quantita"
  );
  const fatturaRigaUmInput = document.getElementById("fattura-riga-um");
  const fatturaRigaPrezzoInput = document.getElementById("fattura-riga-prezzo");
  const fatturaRigaTotaleInput = document.getElementById("fattura-riga-totale");
  const fatturaRigaSuggerimentiEl = document.getElementById(
    "fattura-riga-suggerimenti"
  );
  const btnAddFatturaRiga = document.getElementById("btn-add-fattura-riga");
  const fatturaRigheListaEl = document.getElementById("fattura-righe-lista");

  // MAGAZZINO – prodotti
  const prodottoForm = document.getElementById("prodotto-form");
  const prodottoCodiceInput = document.getElementById("prodotto-codice");
  const prodottoNomeInput = document.getElementById("prodotto-nome");
  const prodottoCategoriaInput = document.getElementById("prodotto-categoria");
  const prodottoUmInput = document.getElementById("prodotto-um");
  const prodottoAttivoInput = document.getElementById("prodotto-attivo");
  const prodottoNoteInput = document.getElementById("prodotto-note");
  const btnAddProdotto = document.getElementById("btn-add-prodotto");
  const btnToggleProdotti = document.getElementById("btn-toggle-prodotti");
  const sezioneProdottiElenco = document.getElementById(
    "sezione-prodotti-elenco"
  );
  const prodottiListaEl = document.getElementById("prodotti-lista");

  // stato
  let dipendenti = [];
  let timbrature = [];
  let currentUser = null;
  let periodoCorrente = "oggi";

  // stato acquisti
  let fornitori = [];
  let fatture = [];
  let fatturaSelezionata = null;
  let fatturaRighe = [];

  // stato magazzino
  let categorieProdotto = [];
  let prodotti = [];

  // ---------- tema chiaro/scuro ----------
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

  // ---------- utility ruoli ----------
  // In futuro possiamo mettere qui la matrice permessi per ruolo
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

  // ---------- header & visibilità ----------
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
      /* ignore */
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      showLogin();
    });
  }

  // ---------- anagrafica dipendenti ----------
  function aggiornaUICompenso() {
    if (!dipTipoCompenso || !labelRetribuzione) return;

    const tipo = dipTipoCompenso.value || "orario";

    if (tipo === "orario") {
      labelRetribuzione.firstChild.textContent = "Paga oraria lorda (€/h)";
      if (rowOreMensili) rowOreMensili.style.display = "none";
      if (rowOreServizio) rowOreServizio.style.display = "none";
    } else if (tipo === "mensile") {
      labelRetribuzione.firstChild.textContent =
        "Stipendio lordo mensile (€/mese)";
      if (rowOreMensili) rowOreMensili.style.display = "block";
      if (rowOreServizio) rowOreServizio.style.display = "none";
    } else if (tipo === "servizio") {
      labelRetribuzione.firstChild.textContent =
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

  if (btnToggleDipendenti && sezioneDipendentiElenco) {
    btnToggleDipendenti.addEventListener("click", () => {
      const visibile = sezioneDipendentiElenco.style.display !== "none";
      sezioneDipendentiElenco.style.display = visibile ? "none" : "block";
      btnToggleDipendenti.textContent = visibile
        ? "Mostra elenco dipendenti"
        : "Nascondi elenco dipendenti";
    });
  }

  // ---------- login & utente corrente ----------
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
    btnLogin.addEventListener("click", () => {
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

  // ---------- timbrature ----------
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

  function aggiornaRiepilogo() {
    if (!riepilogoDipEl || !riepilogoCanaliEl || !attiviListaEl) return;

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

    // riepilogo per dipendente
    riepilogoDipEl.innerHTML = "";
    Object.entries(perDip).forEach(([key, minuti]) => {
      const [dip, canale] = key.split("|");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dip}</td>
        <td>${canale}</td>
        <td>${formatDurationMinutes(minuti)}</td>
      `;
      riepilogoDipEl.appendChild(tr);
    });

    // riepilogo per canale
    riepilogoCanaliEl.innerHTML = "";
    Object.entries(perCanale).forEach(([canale, minuti]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${canale}</td>
        <td>${formatDurationMinutes(minuti)}</td>
      `;
      riepilogoCanaliEl.appendChild(tr);
    });

    // costi
    if (costoDipEl && costoCanaliEl) {
      costoDipEl.innerHTML = "";
      costoCanaliEl.innerHTML = "";

      const costoByNome = {};
      dipendenti.forEach((d) => {
        costoByNome[d.nome] = d.costoOrario || 0;
      });

      const costoPerCanale = {};

      Object.entries(perDip).forEach(([key, minuti]) => {
        const [dip, canale] = key.split("|");
        const ore = minuti / 60;
        const costoOrario = costoByNome[dip] || 0;
        const costo = ore * costoOrario;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${dip}</td>
          <td>${canale}</td>
          <td>${ore.toFixed(2)}</td>
          <td>${costo.toFixed(2)}</td>
        `;
        costoDipEl.appendChild(tr);

        costoPerCanale[canale] = (costoPerCanale[canale] || 0) + costo;
      });

      Object.entries(perCanale).forEach(([canale, minuti]) => {
        const ore = minuti / 60;
        const costo = costoPerCanale[canale] || 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${canale}</td>
          <td>${ore.toFixed(2)}</td>
          <td>${costo.toFixed(2)}</td>
        `;
        costoCanaliEl.appendChild(tr);
      });
    }

    // attivi adesso
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
  }

  // ---------- stato corrente dipendente ----------
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

  async function salvaTimbraturaSupabase(record) {
    if (!supabase) return null;

    let dipendenteId = null;
    const d = dipendenti.find(
      (x) =>
        x.nome &&
        x.nome.toLowerCase() === record.dip.toLowerCase()
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
          `Sei già timbrato sul canale ${stato.canaleCorrente || ""}. ` +
            "Devi fare Uscita prima di una nuova Entrata."
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

  // ---------- ACQUISTI: FORNITORI ----------
  async function caricaFornitoriDaSupabase() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("fornitori")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento fornitori:", error);
      alert("Errore nel caricare i fornitori da Supabase");
      return;
    }

    fornitori = data || [];
    renderFornitori();
    aggiornaSelectFornitori();
  }

  function renderFornitori() {
    if (!fornitoriListaEl) return;
    fornitoriListaEl.innerHTML = "";

    fornitori.forEach((f, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.nome}</td>
        <td>${f.piva || ""}</td>
        <td>${f.telefono || ""}</td>
        <td>${f.email || ""}</td>
        <td>
          <button class="app-button small gray" data-edit-fornitore="${index}">Modifica</button>
          <button class="app-button small red" data-delete-fornitore="${index}">Elimina</button>
        </td>
      `;
      fornitoriListaEl.appendChild(tr);
    });

    fornitoriListaEl
      .querySelectorAll("[data-edit-fornitore]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-edit-fornitore"), 10);
          caricaFornitoreInForm(idx);
        });
      });

    fornitoriListaEl
      .querySelectorAll("[data-delete-fornitore]")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const idx = parseInt(btn.getAttribute("data-delete-fornitore"), 10);
          const f = fornitori[idx];
          if (!f) return;
          if (!confirm("Eliminare questo fornitore?")) return;

          const { error } = await supabase
            .from("fornitori")
            .delete()
            .eq("id", f.id);
          if (error) {
            console.error("Errore eliminazione fornitore:", error);
            alert(
              "Errore nell'eliminare il fornitore (verifica se ha fatture collegate)."
            );
            return;
          }
          await caricaFornitoriDaSupabase();
        });
      });
  }

  function caricaFornitoreInForm(index) {
    const f = fornitori[index];
    if (!f) return;

    if (fornitoreNomeInput) fornitoreNomeInput.value = f.nome || "";
    if (fornitorePivaInput) fornitorePivaInput.value = f.piva || "";
    if (fornitoreIndirizzoInput)
      fornitoreIndirizzoInput.value = f.indirizzo || "";
    if (fornitoreTelefonoInput)
      fornitoreTelefonoInput.value = f.telefono || "";
    if (fornitoreEmailInput) fornitoreEmailInput.value = f.email || "";
    if (fornitoreNoteInput) fornitoreNoteInput.value = f.note || "";

    if (fornitoreForm) fornitoreForm.dataset.editId = f.id;
  }

  function aggiornaSelectFornitori() {
    if (!fatturaFornitoreSelect) return;
    const current = fatturaFornitoreSelect.value;
    fatturaFornitoreSelect.innerHTML =
      '<option value="">-- seleziona fornitore --</option>';

    fornitori.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.nome;
      fatturaFornitoreSelect.appendChild(opt);
    });

    if (current) {
      fatturaFornitoreSelect.value = current;
    }
  }

  if (btnAddFornitore) {
    btnAddFornitore.addEventListener("click", async () => {
      const nome = (fornitoreNomeInput?.value || "").trim();
      if (!nome) {
        alert("Inserisci il nome del fornitore");
        return;
      }

      const piva = (fornitorePivaInput?.value || "").trim();
      const indirizzo = (fornitoreIndirizzoInput?.value || "").trim();
      const telefono = (fornitoreTelefonoInput?.value || "").trim();
      const email = (fornitoreEmailInput?.value || "").trim();
      const note = (fornitoreNoteInput?.value || "").trim();

      const editId = fornitoreForm?.dataset.editId || null;

      const payload = {
        nome,
        piva: piva || null,
        indirizzo: indirizzo || null,
        telefono: telefono || null,
        email: email || null,
        note: note || null,
      };

      let error = null;
      if (editId) {
        const res = await supabase
          .from("fornitori")
          .update(payload)
          .eq("id", editId);
        error = res.error;
      } else {
        const res = await supabase.from("fornitori").insert(payload);
        error = res.error;
      }

      if (error) {
        console.error("Errore salvataggio fornitore:", error);
        alert("Errore nel salvare il fornitore");
        return;
      }

      if (fornitoreNomeInput) fornitoreNomeInput.value = "";
      if (fornitorePivaInput) fornitorePivaInput.value = "";
      if (fornitoreIndirizzoInput) fornitoreIndirizzoInput.value = "";
      if (fornitoreTelefonoInput) fornitoreTelefonoInput.value = "";
      if (fornitoreEmailInput) fornitoreEmailInput.value = "";
      if (fornitoreNoteInput) fornitoreNoteInput.value = "";
      if (fornitoreForm) delete fornitoreForm.dataset.editId;

      await caricaFornitoriDaSupabase();
      alert("Fornitore salvato correttamente");
    });
  }

  if (btnToggleFornitori && sezioneFornitoriElenco) {
    btnToggleFornitori.addEventListener("click", () => {
      const visibile = sezioneFornitoriElenco.style.display !== "none";
      sezioneFornitoriElenco.style.display = visibile ? "none" : "block";
      btnToggleFornitori.textContent = visibile
        ? "Mostra elenco fornitori"
        : "Nascondi elenco fornitori";
    });
  }

  // ---------- ACQUISTI: FATTURE ----------
  async function uploadFileFattura(file) {
    if (!supabase || !file) return { path: null, tipo: null };

    const estensione = file.name.split(".").pop() || "file";
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8);
    const path = `fatture/${timestamp}_${randomPart}.${estensione}`;

    const { data, error } = await supabase.storage
      .from("fatture")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Errore upload file fattura:", error);
      alert("Errore nel caricare il file della fattura");
      return { path: null, tipo: null };
    }

    return { path: data.path, tipo: file.type || null };
  }

  async function caricaFattureDaSupabase() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("fatture_acquisto")
      .select("*")
      .order("data", { ascending: false });

    if (error) {
      console.error("Errore caricamento fatture:", error);
      alert("Errore nel caricare le fatture da Supabase");
      return;
    }

    fatture = data || [];
    renderFatture();
  }

  function renderFatture() {
    if (!fattureListaEl) return;
    fattureListaEl.innerHTML = "";

    fatture.forEach((f, index) => {
      const fornitore = fornitori.find((x) => x.id === f.fornitore_id);
      const nomeFornitore = fornitore ? fornitore.nome : "-";

      const dataStr = f.data
        ? new Date(f.data).toLocaleDateString("it-IT")
        : "";

      const tr = document.createElement("tr");
      tr.setAttribute("data-fattura-index", index.toString());
      tr.style.cursor = "pointer";
      tr.innerHTML = `
        <td>${dataStr}</td>
        <td>${f.numero}</td>
        <td>${nomeFornitore}</td>
        <td>${f.totale != null ? Number(f.totale).toFixed(2) : ""}</td>
        <td>${
          f.file_path
            ? `<span style="font-size: 11px;">${
                f.file_tipo?.startsWith("image/") ? "Immagine" : "PDF"
              }</span>`
            : ""
        }</td>
      `;
      fattureListaEl.appendChild(tr);
    });

    fattureListaEl
      .querySelectorAll("tr[data-fattura-index]")
      .forEach((tr) => {
        tr.addEventListener("click", () => {
          const idx = parseInt(tr.getAttribute("data-fattura-index"), 10);
          const f = fatture[idx];
          if (f) {
            selezionaFattura(f);
          }
        });
      });
  }

  if (btnAddFattura) {
    btnAddFattura.addEventListener("click", async () => {
      const fornitoreId = fatturaFornitoreSelect?.value || "";
      const numero = (fatturaNumeroInput?.value || "").trim();
      const dataVal = fatturaDataInput?.value || "";
      const totaleValRaw = fatturaTotaleInput?.value || "";
      const note = (fatturaNoteInput?.value || "").trim();
      const file = fatturaFileInput?.files?.[0] || null;

      if (!fornitoreId) {
        alert("Seleziona un fornitore");
        return;
      }
      if (!numero) {
        alert("Inserisci il numero della fattura");
        return;
      }
      if (!dataVal) {
        alert("Inserisci la data della fattura");
        return;
      }

      let filePath = null;
      let fileTipo = null;

      if (file) {
        const uploaded = await uploadFileFattura(file);
        if (!uploaded.path) {
          return;
        }
        filePath = uploaded.path;
        fileTipo = uploaded.tipo;
      }

      const totaleNum =
        totaleValRaw !== "" ? parseFloat(totaleValRaw || "0") : null;

      const payload = {
        fornitore_id: fornitoreId,
        numero,
        data: dataVal,
        totale: totaleNum,
        file_path: filePath,
        file_tipo: fileTipo,
        note: note || null,
      };

      const { data, error } = await supabase
        .from("fatture_acquisto")
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Errore salvataggio fattura:", error);
        alert("Errore nel salvare la fattura");
        return;
      }

      if (fatturaNumeroInput) fatturaNumeroInput.value = "";
      if (fatturaDataInput) fatturaDataInput.value = "";
      if (fatturaTotaleInput) fatturaTotaleInput.value = "";
      if (fatturaNoteInput) fatturaNoteInput.value = "";
      if (fatturaFileInput) fatturaFileInput.value = "";

      await caricaFattureDaSupabase();
      alert("Fattura registrata correttamente");

      fatturaSelezionata = data;
      selezionaFattura(data);
    });
  }

  // ---------- MAGAZZINO: CATEGORIE & PRODOTTI ----------
  async function caricaCategorieProdottoDaSupabase() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("categorie_prodotto")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento categorie_prodotto:", error);
      return;
    }

    categorieProdotto = data || [];
  }

  function getNomeCategoriaById(id) {
    if (!id || !categorieProdotto) return "";
    const cat = categorieProdotto.find((c) => c.id === id);
    return cat ? cat.nome : "";
  }

  async function assicuratiCategoria(nomeCategoria) {
    const nomeTrim = (nomeCategoria || "").trim();
    if (!nomeTrim) return null;

    let esistente = categorieProdotto.find(
      (c) => c.nome.toLowerCase() === nomeTrim.toLowerCase()
    );
    if (esistente) return esistente.id;

    const { data, error } = await supabase
      .from("categorie_prodotto")
      .insert({ nome: nomeTrim })
      .select()
      .single();

    if (error) {
      console.error("Errore creazione categoria_prodotto:", error);
      return null;
    }

    categorieProdotto.push(data);
    return data.id;
  }

  async function caricaProdottiDaSupabase() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("prodotti")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento prodotti:", error);
      alert("Errore nel caricare i prodotti da Supabase");
      return;
    }

    prodotti = data || [];
    renderProdotti();
  }

  function renderProdotti() {
    if (!prodottiListaEl) return;
    prodottiListaEl.innerHTML = "";

    prodotti.forEach((p, index) => {
      const nomeCat = getNomeCategoriaById(p.categoria_id);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.codice_interno}</td>
        <td>${p.nome}</td>
        <td>${nomeCat}</td>
        <td>${p.unita_misura}</td>
        <td>${p.attivo ? "Sì" : "No"}</td>
        <td>${p.note || ""}</td>
        <td>
          <button class="app-button small gray" data-edit-prodotto="${index}">Modifica</button>
        </td>
      `;
      prodottiListaEl.appendChild(tr);
    });

    prodottiListaEl
      .querySelectorAll("[data-edit-prodotto]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.getAttribute("data-edit-prodotto"), 10);
          caricaProdottoInForm(idx);
        });
      });
  }

  function caricaProdottoInForm(index) {
    const p = prodotti[index];
    if (!p) return;

    if (prodottoCodiceInput) prodottoCodiceInput.value = p.codice_interno || "";
    if (prodottoNomeInput) prodottoNomeInput.value = p.nome || "";
    if (prodottoUmInput) prodottoUmInput.value = p.unita_misura || "";
    if (prodottoAttivoInput)
      prodottoAttivoInput.checked = p.attivo !== false;
    if (prodottoNoteInput) prodottoNoteInput.value = p.note || "";

    const catNome = getNomeCategoriaById(p.categoria_id);
    if (prodottoCategoriaInput) prodottoCategoriaInput.value = catNome || "";

    if (prodottoForm) prodottoForm.dataset.editId = p.id;
  }

  async function salvaProdottoSupabase(prodotto) {
    if (!supabase) return null;

    let categoriaId = null;
    if (prodotto.categoriaNome) {
      categoriaId = await assicuratiCategoria(prodotto.categoriaNome);
    }

    const payload = {
      id: prodotto.id || undefined,
      codice_interno: prodotto.codice_interno,
      nome: prodotto.nome,
      unita_misura: prodotto.unita_misura || "pz",
      attivo: prodotto.attivo,
      note: prodotto.note || null,
      categoria_id: categoriaId,
    };

    const { data, error } = await supabase
      .from("prodotti")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Errore salvataggio prodotto:", error);
      alert("Errore nel salvare il prodotto");
      return null;
    }

    return data;
  }

  if (btnAddProdotto) {
    btnAddProdotto.addEventListener("click", async () => {
      const codice = (prodottoCodiceInput?.value || "").trim();
      const nome = (prodottoNomeInput?.value || "").trim();
      const categoriaNome = (prodottoCategoriaInput?.value || "").trim();
      const um = (prodottoUmInput?.value || "").trim() || "pz";
      const attivo = prodottoAttivoInput ? prodottoAttivoInput.checked : true;
      const note = (prodottoNoteInput?.value || "").trim();

      if (!codice) {
        alert("Inserisci il codice interno del prodotto");
        return;
      }
      if (!nome) {
        alert("Inserisci il nome del prodotto");
        return;
      }

      const editId = prodottoForm?.dataset.editId || null;

      const prodObj = {
        id: editId || null,
        codice_interno: codice,
        nome,
        categoriaNome,
        unita_misura: um,
        attivo,
        note,
      };

      const salvato = await salvaProdottoSupabase(prodObj);
      if (!salvato) return;

      if (prodottoCodiceInput) prodottoCodiceInput.value = "";
      if (prodottoNomeInput) prodottoNomeInput.value = "";
      if (prodottoCategoriaInput) prodottoCategoriaInput.value = "";
      if (prodottoUmInput) prodottoUmInput.value = "";
      if (prodottoAttivoInput) prodottoAttivoInput.checked = true;
      if (prodottoNoteInput) prodottoNoteInput.value = "";
      if (prodottoForm) delete prodottoForm.dataset.editId;

      await caricaCategorieProdottoDaSupabase();
      await caricaProdottiDaSupabase();

      alert("Prodotto salvato correttamente");
    });
  }

  if (btnToggleProdotti && sezioneProdottiElenco) {
    btnToggleProdotti.addEventListener("click", () => {
      const visibile = sezioneProdottiElenco.style.display !== "none";
      sezioneProdottiElenco.style.display = visibile ? "none" : "block";
      btnToggleProdotti.textContent = visibile
        ? "Mostra elenco prodotti"
        : "Nascondi elenco prodotti";
    });
  }

  // ---------- SUGGERIMENTI PRODOTTO/CATEGORIA DA DESCRIZIONE ----------
  function normalizzaTesto(txt) {
    return (txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function suggerisciCategoriaDaDescrizione(descrizione) {
    const d = normalizzaTesto(descrizione);
    if (!d) return null;

    for (const regola of REGOLE_CATEGORIA) {
      for (const parola of regola.match) {
        if (d.includes(normalizzaTesto(parola))) {
          return regola.nome;
        }
      }
    }
    return null;
  }

  function trovaProdottoEsistentePerDescrizione(descrizione) {
    const d = normalizzaTesto(descrizione);
    if (!d || !prodotti.length) return null;

    // Match semplice: se nome prodotto contiene almeno una parola chiave della descrizione
    const tokens = d.split(/\s+/).filter((t) => t.length > 3);
    for (const p of prodotti) {
      const nomeP = normalizzaTesto(p.nome);
      if (tokens.some((t) => nomeP.includes(t))) {
        return p;
      }
    }
    return null;
  }

  function aggiornaSuggerimentiRigaFattura() {
    if (!fatturaRigaSuggerimentiEl) return;
    const descr = fatturaRigaDescrizioneInput?.value || "";
    if (!descr.trim()) {
      fatturaRigaSuggerimentiEl.textContent =
        "Suggerimenti prodotto/categoria appariranno qui mentre scrivi la descrizione.";
      if (fatturaRigaForm) {
        delete fatturaRigaForm.dataset.prodottoEsistenteId;
        delete fatturaRigaForm.dataset.categoriaSuggerita;
      }
      return;
    }

    const prodottoEsistente = trovaProdottoEsistentePerDescrizione(descr);
    const catSuggerita = suggerisciCategoriaDaDescrizione(descr);

    if (prodottoEsistente) {
      const catNome = getNomeCategoriaById(prodottoEsistente.categoria_id);
      fatturaRigaSuggerimentiEl.textContent =
        "Prodotto esistente trovato: " +
        prodottoEsistente.nome +
        (catNome ? ` (categoria: ${catNome})` : "");
      if (fatturaRigaForm) {
        fatturaRigaForm.dataset.prodottoEsistenteId = prodottoEsistente.id;
      }
    } else if (catSuggerita) {
      fatturaRigaSuggerimentiEl.textContent =
        "Nuovo prodotto, categoria suggerita: " + catSuggerita;
      if (fatturaRigaForm) {
        delete fatturaRigaForm.dataset.prodottoEsistenteId;
        fatturaRigaForm.dataset.categoriaSuggerita = catSuggerita;
      }
    } else {
      fatturaRigaSuggerimentiEl.textContent =
        "Nuovo prodotto (categoria da decidere).";
      if (fatturaRigaForm) {
        delete fatturaRigaForm.dataset.prodottoEsistenteId;
        delete fatturaRigaForm.dataset.categoriaSuggerita;
      }
    }
  }

  if (fatturaRigaDescrizioneInput) {
    fatturaRigaDescrizioneInput.addEventListener(
      "input",
      aggiornaSuggerimentiRigaFattura
    );
  }

  function aggiornaTotaleRigaDaQuantitaPrezzo() {
    if (!fatturaRigaQuantitaInput || !fatturaRigaPrezzoInput || !fatturaRigaTotaleInput) return;
    const qta = parseFloat(fatturaRigaQuantitaInput.value || "0") || 0;
    const prezzo = parseFloat(fatturaRigaPrezzoInput.value || "0") || 0;
    const tot = qta * prezzo;
    fatturaRigaTotaleInput.value = tot > 0 ? tot.toFixed(2) : "";
  }

  if (fatturaRigaQuantitaInput) {
    fatturaRigaQuantitaInput.addEventListener("input", aggiornaTotaleRigaDaQuantitaPrezzo);
  }
  if (fatturaRigaPrezzoInput) {
    fatturaRigaPrezzoInput.addEventListener("input", aggiornaTotaleRigaDaQuantitaPrezzo);
  }

  // ---------- RIGHE FATTURA + MAGAZZINO ----------
  async function caricaRigheFatturaDaSupabase(fatturaId) {
    if (!supabase || !fatturaId) return;
    const { data, error } = await supabase
      .from("fatture_righe")
      .select("*")
      .eq("fattura_id", fatturaId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Errore caricamento righe fattura:", error);
      alert("Errore nel caricare le righe della fattura");
      return;
    }

    fatturaRighe = data || [];
    renderFatturaRighe();
  }

  function renderFatturaRighe() {
    if (!fatturaRigheListaEl) return;
    fatturaRigheListaEl.innerHTML = "";

    fatturaRighe.forEach((r) => {
      const prod = prodotti.find((p) => p.id === r.prodotto_id);
      const nomeProd = prod ? prod.nome : "";
      const catNome = prod ? getNomeCategoriaById(prod.categoria_id) : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.descrizione}</td>
        <td>${Number(r.quantita).toFixed(3)}</td>
        <td>${r.unita_misura}</td>
        <td>${Number(r.prezzo_unitario).toFixed(4)}</td>
        <td>${r.totale_riga != null ? Number(r.totale_riga).toFixed(2) : ""}</td>
        <td>${nomeProd || ""}${catNome ? " (" + catNome + ")" : ""}</td>
      `;
      fatturaRigheListaEl.appendChild(tr);
    });
  }

  function resetFatturaRigaForm() {
    if (fatturaRigaDescrizioneInput) fatturaRigaDescrizioneInput.value = "";
    if (fatturaRigaQuantitaInput) fatturaRigaQuantitaInput.value = "";
    if (fatturaRigaUmInput) fatturaRigaUmInput.value = "";
    if (fatturaRigaPrezzoInput) fatturaRigaPrezzoInput.value = "";
    if (fatturaRigaTotaleInput) fatturaRigaTotaleInput.value = "";
    if (fatturaRigaSuggerimentiEl)
      fatturaRigaSuggerimentiEl.textContent =
        "Suggerimenti prodotto/categoria appariranno qui mentre scrivi la descrizione.";
    if (fatturaRigaForm) {
      delete fatturaRigaForm.dataset.prodottoEsistenteId;
      delete fatturaRigaForm.dataset.categoriaSuggerita;
    }
  }

  async function selezionaFattura(fattura) {
    fatturaSelezionata = fattura;
    if (!fatturaDettaglioBox || !fatturaDettaglioIntestazione) return;

    const fornitore = fornitori.find((x) => x.id === fattura.fornitore_id);
    const nomeFornitore = fornitore ? fornitore.nome : "-";
    const dataStr = fattura.data
      ? new Date(fattura.data).toLocaleDateString("it-IT")
      : "";

    fatturaDettaglioIntestazione.textContent = `Fornitore: ${nomeFornitore} • Data: ${dataStr} • Numero: ${fattura.numero}`;
    fatturaDettaglioBox.style.display = "block";
    resetFatturaRigaForm();

    await caricaProdottiDaSupabase(); // così possiamo fare match sui prodotti
    await caricaRigheFatturaDaSupabase(fattura.id);
  }

  async function inserisciMovimentoMagazzinoDaRiga(
    prodottoId,
    fattura,
    rigaInserita
  ) {
    if (!supabase || !prodottoId || !fattura || !rigaInserita) return;

    const qta = Number(rigaInserita.quantita) || 0;
    const um = rigaInserita.unita_misura || "pz";
    const prezzo = Number(rigaInserita.prezzo_unitario) || 0;
    const tot = qta * prezzo;

    const dataMovimento =
      fattura.data ||
      new Date().toISOString().slice(0, 10); // yyyy-mm-dd

    const riferimento = `Fattura ${fattura.numero || ""}`.trim();

    const payload = {
      prodotto_id: prodottoId,
      tipo: "carico",
      data_movimento: dataMovimento,
      quantita: qta,
      unita_misura: um,
      costo_unitario: prezzo || null,
      costo_totale: tot || null,
      riferimento: riferimento || null,
      fattura_id: fattura.id,
      fattura_riga_id: rigaInserita.id,
    };

    const { error } = await supabase
      .from("magazzino_movimenti")
      .insert(payload);

    if (error) {
      console.error("Errore inserimento movimento magazzino:", error);
      alert("Attenzione: riga fattura salvata ma errore nel movimento di magazzino");
    }
  }

  if (btnAddFatturaRiga) {
    btnAddFatturaRiga.addEventListener("click", async () => {
      if (!fatturaSelezionata) {
        alert("Seleziona prima una fattura cliccando sull'elenco.");
        return;
      }

      const descr = (fatturaRigaDescrizioneInput?.value || "").trim();
      const qta = parseFloat(fatturaRigaQuantitaInput?.value || "0") || 0;
      const um = (fatturaRigaUmInput?.value || "").trim() || "pz";
      const prezzo =
        parseFloat(fatturaRigaPrezzoInput?.value || "0") || 0;
      let tot =
        parseFloat(fatturaRigaTotaleInput?.value || "0") || qta * prezzo;

      if (!descr) {
        alert("Inserisci la descrizione della riga");
        return;
      }
      if (!qta || qta <= 0) {
        alert("Inserisci una quantità valida");
        return;
      }
      if (!prezzo || prezzo <= 0) {
        alert("Inserisci un prezzo unitario valido");
        return;
      }
      if (!tot || tot <= 0) {
        tot = qta * prezzo;
      }

      // 1) individua o crea prodotto
      let prodottoId = null;
      if (fatturaRigaForm?.dataset.prodottoEsistenteId) {
        prodottoId = parseInt(
          fatturaRigaForm.dataset.prodottoEsistenteId,
          10
        );
      } else {
        const categoriaSuggerita =
          fatturaRigaForm?.dataset.categoriaSuggerita || null;
        const codiceInterno = "P-" + Date.now().toString(36);

        const prodObj = {
          id: null,
          codice_interno: codiceInterno,
          nome: descr,
          categoriaNome: categoriaSuggerita,
          unita_misura: um,
          attivo: true,
          note: null,
        };

        const nuovoProdotto = await salvaProdottoSupabase(prodObj);
        if (!nuovoProdotto) {
          alert("Errore nel creare il prodotto associato alla riga.");
          return;
        }
        prodottoId = nuovoProdotto.id;
        prodotti.push(nuovoProdotto);
      }

      // 2) inserisci riga fattura
      const payloadRiga = {
        fattura_id: fatturaSelezionata.id,
        prodotto_id: prodottoId,
        descrizione: descr,
        quantita: qta,
        unita_misura: um,
        prezzo_unitario: prezzo,
        totale_riga: tot,
      };

      const { data, error } = await supabase
        .from("fatture_righe")
        .insert(payloadRiga)
        .select()
        .single();

      if (error) {
        console.error("Errore salvataggio riga fattura:", error);
        alert("Errore nel salvare la riga della fattura");
        return;
      }

      fatturaRighe.push(data);
      renderFatturaRighe();

      // 3) movimento di magazzino
      await inserisciMovimentoMagazzinoDaRiga(prodottoId, fatturaSelezionata, data);

      resetFatturaRigaForm();
      alert("Riga fattura e movimento di magazzino registrati correttamente");
    });
  }

  // ---------- routing ----------
  async function onRouteEnter(route) {
    switch (route) {
      case "timbratura":
        await caricaTimbratureDaSupabase();
        updateTimbraturaUserInfo();
        break;
      case "dipendenti":
        await caricaDipendentiDaSupabase();
        break;
      case "acquisti":
        await caricaFornitoriDaSupabase();
        await caricaCategorieProdottoDaSupabase();
        await caricaProdottiDaSupabase();
        await caricaFattureDaSupabase();
        break;
      case "reintegro":
        await caricaCategorieProdottoDaSupabase();
        await caricaProdottiDaSupabase();
        break;
      case "preventivi":
      case "report":
      case "parametri":
        // per ora nessun caricamento specifico
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

    console.log("Navigazione verso:", route);

    const isManager = isManagerRole(currentUser.ruolo);

    if (!isManager) {
      if (route === "timbratura" || route === "ordine") {
        showOnlyView(`view-${route}`);
        await onRouteEnter(route);
      } else {
        showHomeDipendente();
      }
    } else {
      const active = document.getElementById(`view-${route}`);
      if (!active) {
        console.warn("Vista non trovata:", route);
        return;
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
    if (route) {
      navigateTo(route);
    }
  });

  // ---------- avvio ----------
  async function init() {
    await caricaDipendentiDaSupabase();
    await caricaTimbratureDaSupabase();

    restoreUserFromStorage();

    if (currentUser) {
      if (loginView) loginView.style.display = "none";
      if (isManagerRole(currentUser.ruolo)) {
        const initialRoute =
          window.location.hash.replace("#", "") || "timbratura";
        showManagerMenuAndRoute(initialRoute);
      } else {
        showHomeDipendente();
      }
    } else {
      showLogin();
    }

    aggiornaUICompenso();
  }

  await init();
});
