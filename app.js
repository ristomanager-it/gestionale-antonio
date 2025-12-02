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
  const ricettaTipoSelect = document.getElementById("ricetta-tipo");
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
  const ricettaFormato2PercInput = document.getElementById(
    "ricetta-formato2-percent"
  );
  const ricettaFormato1PezziOut = document.getElementById(
    "ricetta-formato1-pezzi"
  );
  const ricettaFormato2PezziOut = document.getElementById(
    "ricetta-formato2-pezzi"
  );

  // ---------- RICETTARIO (VIEWER) ----------
  const ricetteSearchInput = document.getElementById("ricette-search");
  // container lista viewer: document.getElementById("ricette-lista-viewer")

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

  // datalist ingredienti per ricette + prodotti fatture + magazzino descrizione
  const ingredientiSuggestions = document.getElementById(
    "ingredienti-suggestions"
  );

  // ---------- STATO ----------
  let dipendenti = [];
  let timbrature = [];
  let currentUser = null;
  let periodoCorrente = "oggi";

  
  let ricettaFotoCorrenteUrl = null;
  let ricetteCache = [];
  // ricettaDaAprireId NON più usata dal viewer (solo da eventuale logica futura)

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

// =========================================================
// ======================= RICETTE =========================
// =========================================================

// Riferimenti DOM
const ricNome = document.getElementById("ric-nome");
const ricDescrizione = document.getElementById("ric-descrizione");
const ricPorzioneNote = document.getElementById("ric-porzione-note");

const ricIngredientiContainer = document.getElementById("ric-ingredienti-container");
const ricProdottiSuggestions = document.getElementById("ric-prodotti-suggestions");
const ricAddIngredienteBtn = document.getElementById("ric-add-ingrediente");

const ricCostoBase = document.getElementById("ric-costo-base");
const ricSfrido = document.getElementById("ric-sfrido");
const ricCostoSfrido = document.getElementById("ric-costo-sfrido");
const ricCoeff = document.getElementById("ric-coefficiente");
const ricFattoreEvento = document.getElementById("ric-fattore-evento");
const ricPrezzoRist = document.getElementById("ric-prezzo-ristorante");
const ricPrezzoEvento = document.getElementById("ric-prezzo-evento");

const ricSalvaBtn = document.getElementById("ric-salva");
const ricNuovaBtn = document.getElementById("ric-nuova");
const ricetteLista = document.getElementById("ricette-lista");

let ricettaCorrenteId = null;
let prodottiCacheRicette = [];

// ------------------ Caricamento prodotti ------------------

async function caricaProdottiPerRicette() {
  if (!supabase) return;

  const res = await supabase
    .from("prodotti")
    .select("id, nome, unita_misura, costo_medio, attivo")
    .order("nome", { ascending: true });

  if (res.error) {
    console.error("Errore caricando prodotti per ricette:", res.error);
    return;
  }

  prodottiCacheRicette = res.data || [];

  if (!ricProdottiSuggestions) return;
  ricProdottiSuggestions.innerHTML = "";

  prodottiCacheRicette.forEach(function (p) {
    if (!p.nome) return;
    const opt = document.createElement("option");
    opt.value = p.nome;
    ricProdottiSuggestions.appendChild(opt);
  });
}

// ------------------ Caricamento elenco ricette ------------

async function caricaElencoRicette() {
  if (!supabase || !ricetteLista) return;

  const res = await supabase
    .from("ricette")
    .select("id, nome, costo_con_sfrido, prezzo_ristorante, prezzo_evento")
    .order("nome", { ascending: true });

  if (res.error) {
    console.error("Errore caricando ricette:", res.error);
    return;
  }

  ricetteLista.innerHTML = "";

  (res.data || []).forEach(function (r) {
    const tr = document.createElement("tr");

    const costoSfridoStr =
      r.costo_con_sfrido != null ? Number(r.costo_con_sfrido).toFixed(2) : "0.00";
    const prezzoRistStr =
      r.prezzo_ristorante != null ? Number(r.prezzo_ristorante).toFixed(2) : "0.00";
    const prezzoEventoStr =
      r.prezzo_evento != null ? Number(r.prezzo_evento).toFixed(2) : "0.00";

    tr.innerHTML =
      "<td>" + (r.nome || "") + "</td>" +
      "<td>" + costoSfridoStr + " €</td>" +
      "<td>" + prezzoRistStr + " €</td>" +
      "<td>" + prezzoEventoStr + " €</td>" +
      '<td><button class="app-button tiny gray" data-ric-edit="' + r.id + '">Apri</button></td>';

    ricetteLista.appendChild(tr);
  });

  const buttons = ricetteLista.querySelectorAll("[data-ric-edit]");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = parseInt(btn.getAttribute("data-ric-edit"), 10);
      if (!isNaN(id)) {
        caricaRicettaInForm(id);
      }
    });
  });
}

// ------------------ Gestione righe ingredienti ------------

function creaRigaIngrediente(ing) {
  const div = document.createElement("div");
  div.className = "form-grid-2";
  div.style.marginTop = "8px";

  const nomeProd = ing && ing.nome_prodotto ? ing.nome_prodotto : "";
  const quantitaVal =
    ing && typeof ing.quantita !== "undefined" && ing.quantita !== null
      ? ing.quantita
      : 1;
  const unitaVal = ing && ing.unita ? ing.unita : "g";
  const costoMedioVal =
    ing && typeof ing.costo_medio_prodotto !== "undefined" && ing.costo_medio_prodotto !== null
      ? ing.costo_medio_prodotto
      : 0;
  const costoRigaVal =
    ing && typeof ing.costo_riga !== "undefined" && ing.costo_riga !== null
      ? ing.costo_riga
      : 0;

  if (ing && ing.prodotto_id) {
    div.dataset.prodottoId = ing.prodotto_id;
  }

  // Colonna sinistra: prodotto + quantità
  const labelProd = document.createElement("label");
  const textProd = document.createTextNode("Ingrediente");
  const inputProd = document.createElement("input");
  inputProd.className = "input-pill ric-ing-nome";
  inputProd.setAttribute("list", "ric-prodotti-suggestions");
  inputProd.value = nomeProd;

  labelProd.appendChild(textProd);
  labelProd.appendChild(document.createElement("br"));
  labelProd.appendChild(inputProd);

  const labelQty = document.createElement("label");
  const textQty = document.createTextNode("Quantità");
  const inputQty = document.createElement("input");
  inputQty.type = "number";
  inputQty.className = "input-pill ric-ing-qty";
  inputQty.min = "0";
  inputQty.step = "0.01";
  inputQty.value = quantitaVal;

  labelQty.appendChild(textQty);
  labelQty.appendChild(document.createElement("br"));
  labelQty.appendChild(inputQty);

  // Colonna destra: unità, costo medio, costo riga + elimina
  const labelUnita = document.createElement("label");
  const textUnita = document.createTextNode("Unità");
  const inputUnita = document.createElement("input");
  inputUnita.className = "input-pill ric-ing-unita";
  inputUnita.value = unitaVal;

  labelUnita.appendChild(textUnita);
  labelUnita.appendChild(document.createElement("br"));
  labelUnita.appendChild(inputUnita);

  const labelCostoMedio = document.createElement("label");
  const textCostoMedio = document.createTextNode("Costo medio €/unità");
  const inputCostoMedio = document.createElement("input");
  inputCostoMedio.className = "input-pill ric-ing-costo-medio";
  inputCostoMedio.readOnly = true;
  inputCostoMedio.value = costoMedioVal;

  labelCostoMedio.appendChild(textCostoMedio);
  labelCostoMedio.appendChild(document.createElement("br"));
  labelCostoMedio.appendChild(inputCostoMedio);

  const labelCostoRiga = document.createElement("label");
  const textCostoRiga = document.createTextNode("Costo riga €");
  const inputCostoRiga = document.createElement("input");
  inputCostoRiga.className = "input-pill ric-ing-costo-riga";
  inputCostoRiga.readOnly = true;
  inputCostoRiga.value = costoRigaVal;

  labelCostoRiga.appendChild(textCostoRiga);
  labelCostoRiga.appendChild(document.createElement("br"));
  labelCostoRiga.appendChild(inputCostoRiga);

  const btnDel = document.createElement("button");
  btnDel.type = "button";
  btnDel.className = "app-button tiny red ric-ing-del";
  btnDel.textContent = "X";

  // Append
  div.appendChild(labelProd);
  div.appendChild(labelQty);
  div.appendChild(labelUnita);
  div.appendChild(labelCostoMedio);
  div.appendChild(labelCostoRiga);
  div.appendChild(btnDel);

  // Eventi
  inputProd.addEventListener("change", function () {
    aggiornaIngredienteDaProdotto(div);
  });

  const aggiorna = function () {
    aggiornaCostoRigaIngrediente(div);
    ricalcolaFoodCostRicetta();
  };

  inputQty.addEventListener("input", aggiorna);

  btnDel.addEventListener("click", function () {
    div.remove();
    ricalcolaFoodCostRicetta();
  });

  // Se abbiamo già il prodotto in cache e nessun costo medio, proviamo a impostarlo
  if (!costoMedioVal && nomeProd) {
    aggiornaIngredienteDaProdotto(div);
  } else {
    ricalcolaFoodCostRicetta();
  }

  return div;
}

function aggiungiRigaIngrediente(ing) {
  if (!ricIngredientiContainer) return;
  const riga = creaRigaIngrediente(ing || null);
  ricIngredientiContainer.appendChild(riga);
}

// quando si seleziona/compila il prodotto, aggiorna costo medio e unita
function aggiornaIngredienteDaProdotto(div) {
  const inputProd = div.querySelector(".ric-ing-nome");
  const inputUnita = div.querySelector(".ric-ing-unita");
  const inputCostoMedio = div.querySelector(".ric-ing-costo-medio");

  if (!inputProd || !inputUnita || !inputCostoMedio) return;

  const nome = (inputProd.value || "").trim();
  if (!nome) return;

  let prodotto = null;
  for (let i = 0; i < prodottiCacheRicette.length; i++) {
    const p = prodottiCacheRicette[i];
    if (p.nome && p.nome.toLowerCase() === nome.toLowerCase()) {
      prodotto = p;
      break;
    }
  }

  if (!prodotto) {
    delete div.dataset.prodottoId;
    inputCostoMedio.value = "";
    ricalcolaFoodCostRicetta();
    return;
  }

  div.dataset.prodottoId = prodotto.id;
  inputCostoMedio.value =
    prodotto.costo_medio != null ? Number(prodotto.costo_medio).toFixed(4) : "0.0000";
  if (!inputUnita.value && prodotto.unita_misura) {
    inputUnita.value = prodotto.unita_misura;
  }

  aggiornaCostoRigaIngrediente(div);
  ricalcolaFoodCostRicetta();
}

function aggiornaCostoRigaIngrediente(div) {
  const inputQty = div.querySelector(".ric-ing-qty");
  const inputCostoMedio = div.querySelector(".ric-ing-costo-medio");
  const inputCostoRiga = div.querySelector(".ric-ing-costo-riga");

  if (!inputQty || !inputCostoMedio || !inputCostoRiga) return;

  const q = parseFloat(inputQty.value || "0");
  const cm = parseFloat(inputCostoMedio.value || "0");

  const costo = q * cm;
  inputCostoRiga.value = costo.toFixed(4);
}

// ------------------ Food cost e prezzi --------------------

function ricalcolaFoodCostRicetta() {
  let costoBase = 0;

  if (ricIngredientiContainer) {
    const righe = ricIngredientiContainer.querySelectorAll(".ric-ing-costo-riga");
    righe.forEach(function (input) {
      costoBase += parseFloat(input.value || "0");
    });
  }

  if (ricCostoBase) {
    ricCostoBase.value = costoBase.toFixed(4);
  }

  // sfrido in percentuale (input in %)
  let sfridoPerc = 15;
  if (ricSfrido && ricSfrido.value !== "") {
    sfridoPerc = parseFloat(ricSfrido.value || "15");
  }
  const sfridoFrac = sfridoPerc / 100;

  const costoSfrido = costoBase * (1 + sfridoFrac);
  if (ricCostoSfrido) {
    ricCostoSfrido.value = costoSfrido.toFixed(4);
  }

  // coefficiente e fattore evento
  let coeff = 3;
  if (ricCoeff && ricCoeff.value !== "") {
    coeff = parseFloat(ricCoeff.value || "3");
  }
  let fattEvento = 0.6;
  if (ricFattoreEvento && ricFattoreEvento.value !== "") {
    fattEvento = parseFloat(ricFattoreEvento.value || "0.6");
  }

  const prezzoR = costoSfrido * coeff;
  const prezzoE = prezzoR * fattEvento;

  if (ricPrezzoRist) {
    ricPrezzoRist.value = prezzoR.toFixed(2);
  }
  if (ricPrezzoEvento) {
    ricPrezzoEvento.value = prezzoE.toFixed(2);
  }
}

// ------------------ Salvataggio ricetta ------------------

async function salvaRicetta() {
  if (!supabase) return;

  const nome = ricNome ? (ricNome.value || "").trim() : "";
  if (!nome) {
    alert("Inserisci il nome della ricetta.");
    return;
  }

  const descr = ricDescrizione ? (ricDescrizione.value || null) : null;
  const notePorzione = ricPorzioneNote ? (ricPorzioneNote.value || null) : null;

  const costoBase = ricCostoBase ? parseFloat(ricCostoBase.value || "0") : 0;
  const sfridoPerc = ricSfrido ? parseFloat(ricSfrido.value || "15") : 15;
  const sfridoFrac = sfridoPerc / 100;
  const costoSfrido = ricCostoSfrido
    ? parseFloat(ricCostoSfrido.value || "0")
    : costoBase * (1 + sfridoFrac);
  const coeff = ricCoeff ? parseFloat(ricCoeff.value || "3") : 3;
  const fattEvento = ricFattoreEvento
    ? parseFloat(ricFattoreEvento.value || "0.6")
    : 0.6;
  const prezzoR = ricPrezzoRist ? parseFloat(ricPrezzoRist.value || "0") : costoSfrido * coeff;
  const prezzoE = ricPrezzoEvento ? parseFloat(ricPrezzoEvento.value || "0") : prezzoR * fattEvento;

  const payload = {
    nome: nome,
    descrizione: descr,
    porzione_base_note: notePorzione,
    costo_materia_prima: costoBase,
    percentuale_sfrido: sfridoFrac,
    costo_con_sfrido: costoSfrido,
    coefficiente_base: coeff,
    fattore_porzione_ristorante: 1.0,
    fattore_porzione_evento: fattEvento,
    prezzo_ristorante: prezzoR,
    prezzo_evento: prezzoE,
    aggiornato_il: new Date().toISOString()
  };

  let id = ricettaCorrenteId;

  if (id) {
    const resUpd = await supabase
      .from("ricette")
      .update(payload)
      .eq("id", id);

    if (resUpd.error) {
      console.error("Errore aggiornando ricetta:", resUpd.error);
      alert("Errore salvando la ricetta.");
      return;
    }
  } else {
    const resIns = await supabase
      .from("ricette")
      .insert(payload)
      .select()
      .single();

    if (resIns.error) {
      console.error("Errore inserendo ricetta:", resIns.error);
      alert("Errore creando la ricetta.");
      return;
    }
    id = resIns.data.id;
    ricettaCorrenteId = id;
  }

  // salva ingredienti
  if (id && ricIngredientiContainer) {
    await supabase
      .from("ricette_ingredienti")
      .delete()
      .eq("ricetta_id", id);

    const righe = ricIngredientiContainer.children;
    for (let i = 0; i < righe.length; i++) {
      const div = righe[i];
      const inputNome = div.querySelector(".ric-ing-nome");
      const inputQty = div.querySelector(".ric-ing-qty");
      const inputUnita = div.querySelector(".ric-ing-unita");

      const nomeProd = inputNome ? (inputNome.value || "").trim() : "";
      if (!nomeProd) continue;

      let prodottoId = div.dataset.prodottoId || null;

      // Se non abbiamo ancora l'id, cerchiamo nel cache per nome
      if (!prodottoId) {
        for (let j = 0; j < prodottiCacheRicette.length; j++) {
          const p = prodottiCacheRicette[j];
          if (p.nome && p.nome.toLowerCase() === nomeProd.toLowerCase()) {
            prodottoId = p.id;
            break;
          }
        }
      }

      if (!prodottoId) {
        // prodotto non trovato -> per ora saltiamo
        continue;
      }

      const qty = inputQty ? parseFloat(inputQty.value || "0") : 0;
      const unita = inputUnita ? (inputUnita.value || "") : "";
      if (!unita) continue;

      await supabase.from("ricette_ingredienti").insert({
        ricetta_id: id,
        prodotto_id: prodottoId,
        quantita: qty,
        unita: unita
      });
    }
  }

  alert("Ricetta salvata.");
  await caricaElencoRicette();
}

// ------------------ Carica ricetta in form ----------------

async function caricaRicettaInForm(id) {
  if (!supabase) return;

  ricettaCorrenteId = id;

  const res = await supabase
    .from("ricette")
    .select("*")
    .eq("id", id)
    .single();

  if (res.error || !res.data) {
    console.error("Errore caricando ricetta:", res.error);
    alert("Errore caricando la ricetta.");
    return;
  }

  const r = res.data;

  if (ricNome) ricNome.value = r.nome || "";
  if (ricDescrizione) ricDescrizione.value = r.descrizione || "";
  if (ricPorzioneNote) ricPorzioneNote.value = r.porzione_base_note || "";

  if (ricCostoBase) ricCostoBase.value = (r.costo_materia_prima || 0).toFixed(4);
  if (ricSfrido) {
    const perc =
      r.percentuale_sfrido != null ? Number(r.percentuale_sfrido) * 100 : 15;
    ricSfrido.value = perc.toFixed(2).replace(/\.?0+$/, "");
  }
  if (ricCostoSfrido) ricCostoSfrido.value = (r.costo_con_sfrido || 0).toFixed(4);
  if (ricCoeff) ricCoeff.value = r.coefficiente_base != null ? r.coefficiente_base : 3;
  if (ricFattoreEvento)
    ricFattoreEvento.value =
      r.fattore_porzione_evento != null ? r.fattore_porzione_evento : 0.6;
  if (ricPrezzoRist)
    ricPrezzoRist.value = (r.prezzo_ristorante || 0).toFixed(2);
  if (ricPrezzoEvento)
    ricPrezzoEvento.value = (r.prezzo_evento || 0).toFixed(2);

  // carica ingredienti
  if (ricIngredientiContainer) ricIngredientiContainer.innerHTML = "";

  const resIng = await supabase
    .from("ricette_ingredienti")
    .select("id, prodotto_id, quantita, unita, prodotto:prodotto_id (nome, costo_medio)")
    .eq("ricetta_id", id);

  if (!resIng.error && resIng.data) {
    resIng.data.forEach(function (ing) {
      const ogg = {
        prodotto_id: ing.prodotto_id,
        nome_prodotto: ing.prodotto ? ing.prodotto.nome : "",
        quantita: ing.quantita,
        unita: ing.unita,
        costo_medio_prodotto: ing.prodotto ? ing.prodotto.costo_medio : 0,
        costo_riga:
          (ing.quantita || 0) *
          (ing.prodotto && ing.prodotto.costo_medio ? ing.prodotto.costo_medio : 0)
      };
      aggiungiRigaIngrediente(ogg);
    });
  }

  ricalcolaFoodCostRicetta();
}

// ------------------ Nuova ricetta -------------------------

function nuovaRicetta() {
  ricettaCorrenteId = null;

  if (ricNome) ricNome.value = "";
  if (ricDescrizione) ricDescrizione.value = "";
  if (ricPorzioneNote) ricPorzioneNote.value = "";

  if (ricCostoBase) ricCostoBase.value = "";
  if (ricSfrido) ricSfrido.value = "15";
  if (ricCostoSfrido) ricCostoSfrido.value = "";
  if (ricCoeff) ricCoeff.value = "3";
  if (ricFattoreEvento) ricFattoreEvento.value = "0.6";
  if (ricPrezzoRist) ricPrezzoRist.value = "";
  if (ricPrezzoEvento) ricPrezzoEvento.value = "";

  if (ricIngredientiContainer) ricIngredientiContainer.innerHTML = "";
}

// ------------------ Event listeners RICETTE ---------------

if (ricAddIngredienteBtn) {
  ricAddIngredienteBtn.addEventListener("click", function () {
    aggiungiRigaIngrediente();
  });
}

if (ricSalvaBtn) {
  ricSalvaBtn.addEventListener("click", function () {
    salvaRicetta();
  });
}

if (ricNuovaBtn) {
  ricNuovaBtn.addEventListener("click", function () {
    nuovaRicetta();
  });
}

if (ricSfrido) {
  ricSfrido.addEventListener("input", function () {
    ricalcolaFoodCostRicetta();
  });
}

if (ricCoeff) {
  ricCoeff.addEventListener("input", function () {
    ricalcolaFoodCostRicetta();
  });
}

if (ricFattoreEvento) {
  ricFattoreEvento.addEventListener("input", function () {
    ricalcolaFoodCostRicetta();
  });
}

// Caricamento iniziale dati ricette
(async function () {
  await caricaProdottiPerRicette();
  await caricaElencoRicette();
})();

// ==== RIFERIMENTI DOM ====
const prevClienteNome = document.getElementById("prev-cliente-nome");
const prevContattiList = document.getElementById("prev-contatti-list");
const prevClienteEmail = document.getElementById("prev-cliente-email");
const prevClienteTelefono = document.getElementById("prev-cliente-telefono");
const prevAddContattoBtn = document.getElementById("prev-add-contatto");

const prevTitolo = document.getElementById("prev-titolo");
const prevTipoServizio = document.getElementById("prev-tipo-servizio");
const prevDataEvento = document.getElementById("prev-data-evento");
const prevNInvitati = document.getElementById("prev-n-invitati");
const prevLocation = document.getElementById("prev-location");
const prevNote = document.getElementById("prev-note");

const prevPiattiContainer = document.getElementById("prev-piatti-container");
const prevPiattiSuggestions = document.getElementById("prev-piatti-suggestions");
const prevAddPiattoBtn = document.getElementById("prev-add-piatto");

const prevExtraContainer = document.getElementById("prev-extra-container");
const prevExtraSuggestions = document.getElementById("prev-extra-suggestions");
const prevAddExtraBtn = document.getElementById("prev-add-extra");

const prevTotalePiatti = document.getElementById("prev-totale-piatti");
const prevTotaleExtra = document.getElementById("prev-totale-extra");
const prevTotale = document.getElementById("prev-totale");
const prevTotalePP = document.getElementById("prev-totale-pp");

const prevStato = document.getElementById("prev-stato");
const prevAccontoCard = document.getElementById("prev-acconto-card");
const prevAcconto = document.getElementById("prev-acconto");
const prevSaldo = document.getElementById("prev-saldo");
const prevGeneraPrenotazione = document.getElementById("prev-genera-prenotazione");

const prevSalvaBtn = document.getElementById("prev-salva");
const prevStampaBtn = document.getElementById("prev-stampa");
const prevEmailBtn = document.getElementById("prev-email");
const prevApriPrenotazioneBtn = document.getElementById("prev-apri-prenotazione");

const prevLista = document.getElementById("prev-lista");

let preventivoCorrenteId = null;
let contattiCache = [];
let ricetteCachePreventivi = [];
let serviziExtraCatalogo = [];

// =========================================================
// =============== CARICAMENTO DATI INIZIALI ================
// =========================================================

async function caricaContatti() {
  if (!supabase) return;

  const res = await supabase
    .from("contatti")
    .select("*")
    .order("nome");

  if (res.error) {
    console.error("Errore caricando contatti:", res.error);
    return;
  }

  contattiCache = res.data || [];
  if (!prevContattiList) return;
  prevContattiList.innerHTML = "";

  contattiCache.forEach(function (c) {
    const opt = document.createElement("option");
    const nomeCompleto = (c.nome || "") + " " + (c.cognome || "");
    opt.value = nomeCompleto.trim();
    prevContattiList.appendChild(opt);
  });
}

async function caricaRicettePreventivi() {
  if (!supabase) return;

  const res = await supabase
    .from("ricette")
    .select("id, nome");

  if (!res.error && res.data) {
    ricetteCachePreventivi = res.data;
    if (!prevPiattiSuggestions) return;
    prevPiattiSuggestions.innerHTML = "";
    res.data.forEach(function (r) {
      const opt = document.createElement("option");
      opt.value = r.nome;
      prevPiattiSuggestions.appendChild(opt);
    });
  }
}

async function caricaCatalogoExtra() {
  if (!supabase) return;

  const res = await supabase
    .from("extra_servizi_catalogo")
    .select("*");

  if (!res.error && res.data) {
    serviziExtraCatalogo = res.data;
    if (!prevExtraSuggestions) return;
    prevExtraSuggestions.innerHTML = "";
    res.data.forEach(function (s) {
      const opt = document.createElement("option");
      opt.value = s.nome;
      prevExtraSuggestions.appendChild(opt);
    });
  }
}

async function caricaPreventiviEsistenti() {
  if (!supabase || !prevLista) return;

  const res = await supabase
    .from("preventivi")
    .select("*, contatti:cliente_id (nome, cognome)")
    .order("created_at", { ascending: false });

  if (res.error) {
    console.error("Errore caricando preventivi:", res.error);
    return;
  }

  prevLista.innerHTML = "";

  (res.data || []).forEach(function (p) {
    const tr = document.createElement("tr");
    const cont = p.contatti || {};
    const clienteNome = ((cont.nome || "") + " " + (cont.cognome || "")).trim();
    const dataEvento = p.data_evento || "-";
    const titolo = p.titolo_evento || "-";
    const invitati = (p.n_invitati != null ? p.n_invitati : "-");
    const totaleStr = (p.totale != null ? Number(p.totale).toFixed(2) : "0.00");
    const stato = p.stato || "-";

    var html =
      "<td>" + dataEvento + "</td>" +
      "<td>" + (clienteNome || "-") + "</td>" +
      "<td>" + titolo + "</td>" +
      "<td>" + invitati + "</td>" +
      "<td>" + totaleStr + "</td>" +
      "<td>" + stato + "</td>" +
      '<td><button class="app-button tiny gray" data-edit-prev="' + p.id + '">Apri</button></td>';

    tr.innerHTML = html;
    prevLista.appendChild(tr);
  });

  const buttons = prevLista.querySelectorAll("[data-edit-prev]");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const id = parseInt(btn.getAttribute("data-edit-prev"), 10);
      if (!isNaN(id)) {
        caricaPreventivoInModifica(id);
      }
    });
  });
}

// =========================================================
// ======================= PIATTI / MENÙ ====================
// =========================================================

function aggiungiRigaPiatto(piatto) {
  if (!prevPiattiContainer) return;

  var div = document.createElement("div");
  div.className = "form-grid-2";
  div.style.marginTop = "8px";

  // valori di default
  var defaultQty = 1;
  if (prevNInvitati && prevNInvitati.value) {
    var parsed = parseInt(prevNInvitati.value, 10);
    if (!isNaN(parsed) && parsed > 0) defaultQty = parsed;
  }

  var nomeVal =
    piatto && typeof piatto.nome_piatto !== "undefined"
      ? piatto.nome_piatto
      : "";
  var qtyVal =
    piatto && typeof piatto.quantita !== "undefined" && piatto.quantita !== null
      ? piatto.quantita
      : defaultQty;
  var costoUnitVal =
    piatto &&
    typeof piatto.costo_unitario !== "undefined" &&
    piatto.costo_unitario !== null
      ? piatto.costo_unitario
      : "";
  var costoTotVal =
    piatto &&
    typeof piatto.costo_totale !== "undefined" &&
    piatto.costo_totale !== null
      ? piatto.costo_totale
      : "";

  div.innerHTML =
    '<label>' +
      'Portata' +
      '<input ' +
        'class="input-pill prev-piatto-nome" ' +
        'list="prev-piatti-suggestions" ' +
        'value="' + nomeVal + '"' +
      '>' +
    '</label>' +

    '<label>' +
      'Quantità' +
      '<input ' +
        'type="number" ' +
        'class="input-pill prev-piatto-qty" ' +
        'min="1" ' +
        'value="' + qtyVal + '"' +
      '>' +
    '</label>' +

    '<label>' +
      'Prezzo unitario (€)' +
      '<input ' +
        'class="input-pill prev-piatto-costo" ' +
        'readonly ' +
        'value="' + costoUnitVal + '"' +
      '>' +
    '</label>' +

    '<label>' +
      'Totale (€)' +
      '<input ' +
        'class="input-pill prev-piatto-tot" ' +
        'readonly ' +
        'value="' + costoTotVal + '"' +
      '>' +
    '</label>' +

    '<button class="app-button tiny red prev-del-piatto" type="button">X</button>';

  prevPiattiContainer.appendChild(div);

  var btnDel = div.querySelector(".prev-del-piatto");
  var inputNome = div.querySelector(".prev-piatto-nome");
  var inputQty = div.querySelector(".prev-piatto-qty");

  if (btnDel) {
    btnDel.addEventListener("click", function () {
      div.remove();
      calcolaTotaliPreventivo();
    });
  }

  if (inputNome) {
    inputNome.addEventListener("change", function () {
      aggiornaCostoPiatto(div, true).then(function () {
        calcolaTotaliPreventivo();
      });
    });
  }

  if (inputQty) {
    inputQty.addEventListener("input", function () {
      aggiornaCostoPiatto(div, false).then(function () {
        calcolaTotaliPreventivo();
      });
    });
  }
}

// logica prezzo portata: food cost dai prodotti
async function aggiornaCostoPiatto(div, force) {
  if (!supabase) return;

  var nomeInput = div.querySelector(".prev-piatto-nome");
  var qtyInput = div.querySelector(".prev-piatto-qty");
  var costoInput = div.querySelector(".prev-piatto-costo");
  var totInput = div.querySelector(".prev-piatto-tot");

  if (!nomeInput || !qtyInput || !costoInput || !totInput) return;

  var nome = (nomeInput.value || "").trim();
  var qty = parseFloat(qtyInput.value || "1");

  if (!nome) return;

  var ric = null;
  for (var i = 0; i < ricetteCachePreventivi.length; i++) {
    var r = ricetteCachePreventivi[i];
    if (r.nome && r.nome.toLowerCase() === nome.toLowerCase()) {
      ric = r;
      break;
    }
  }

  var ricettaId = null;
  var prezzoUnitario = 0;

  if (ric) {
    ricettaId = ric.id;

    var res = await supabase
      .from("ricette_ingredienti")
      .select("quantita, prodotto:prodotto_id (costo_medio)")
      .eq("ricetta_id", ric.id);

    if (!res.error && res.data) {
      res.data.forEach(function (ing) {
        var q = parseFloat(ing.quantita || "0");
        var costoMedio = 0;
        if (ing.prodotto && typeof ing.prodotto.costo_medio !== "undefined") {
          costoMedio = parseFloat(ing.prodotto.costo_medio || "0");
        }
        prezzoUnitario += q * costoMedio;
      });
    }
  } else {
    // ricetta non esiste: creiamo scheda "da completare"
    var inserimento = await supabase
      .from("ricette")
      .insert({
        nome: nome,
        descrizione: "Ricetta da completare",
        tipo: "piatto"
      })
      .select()
      .single();

  if (!inserimento.error && inserimento.data) {
      ricettaId = inserimento.data.id;

      ricetteCachePreventivi.push({
        id: inserimento.data.id,
        nome: nome
      });

      if (prevPiattiSuggestions) {
        var opt = document.createElement("option");
        opt.value = nome;
        prevPiattiSuggestions.appendChild(opt);
      }
    }
  }

  // salva id ricetta sulla riga
  div.dataset.ricettaId = ricettaId;

  // aggiorna campi costo e totale
  costoInput.value = prezzoUnitario.toFixed(2);
  totInput.value = (prezzoUnitario * qty).toFixed(2);
}

// =========================================================
// ======================= EXTRA ============================
// =========================================================

function aggiungiRigaExtra(extra) {
  if (!prevExtraContainer) return;

  const div = document.createElement("div");
  div.className = "form-grid-2";
  div.style.marginTop = "8px";

  // Valori iniziali sicuri
  const descVal =
    extra && typeof extra.descrizione !== "undefined"
      ? extra.descrizione
      : "";
  const qtyVal =
    extra && typeof extra.quantita !== "undefined" && extra.quantita !== null
      ? extra.quantita
      : 1;
  const prezzoUnitVal =
    extra &&
    typeof extra.prezzo_unitario !== "undefined" &&
    extra.prezzo_unitario !== null
      ? extra.prezzo_unitario
      : 0;
  const prezzoTotVal =
    extra &&
    typeof extra.prezzo_totale !== "undefined" &&
    extra.prezzo_totale !== null
      ? extra.prezzo_totale
      : 0;

  // ====== Servizio ======
  const labelServ = document.createElement("label");
  const textServ = document.createTextNode("Servizio");
  const inputServ = document.createElement("input");
  inputServ.className = "input-pill prev-extra-desc";
  inputServ.setAttribute("list", "prev-extra-suggestions");
  inputServ.value = descVal;

  labelServ.appendChild(textServ);
  labelServ.appendChild(document.createElement("br"));
  labelServ.appendChild(inputServ);

  // ====== Quantità ======
  const labelQty = document.createElement("label");
  const textQty = document.createTextNode("Quantità");
  const inputQty = document.createElement("input");
  inputQty.type = "number";
  inputQty.className = "input-pill prev-extra-qty";
  inputQty.min = "1";
  inputQty.value = qtyVal;

  labelQty.appendChild(textQty);
  labelQty.appendChild(document.createElement("br"));
  labelQty.appendChild(inputQty);

  // ====== Prezzo unitario ======
  const labelPrezzo = document.createElement("label");
  const textPrezzo = document.createTextNode("Prezzo unitario (€)");
  const inputPrezzo = document.createElement("input");
  inputPrezzo.type = "number";
  inputPrezzo.className = "input-pill prev-extra-prezzo";
  inputPrezzo.step = "0.01";
  inputPrezzo.value = prezzoUnitVal;

  labelPrezzo.appendChild(textPrezzo);
  labelPrezzo.appendChild(document.createElement("br"));
  labelPrezzo.appendChild(inputPrezzo);

  // ====== Totale ======
  const labelTot = document.createElement("label");
  const textTot = document.createTextNode("Totale (€)");
  const inputTot = document.createElement("input");
  inputTot.className = "input-pill prev-extra-tot";
  inputTot.readOnly = true;
  inputTot.value = prezzoTotVal;

  labelTot.appendChild(textTot);
  labelTot.appendChild(document.createElement("br"));
  labelTot.appendChild(inputTot);

  // ====== Bottone elimina ======
  const btnDel = document.createElement("button");
  btnDel.type = "button";
  btnDel.className = "app-button tiny red prev-del-extra";
  btnDel.textContent = "X";

  // Append a div
  div.appendChild(labelServ);
  div.appendChild(labelQty);
  div.appendChild(labelPrezzo);
  div.appendChild(labelTot);
  div.appendChild(btnDel);

  prevExtraContainer.appendChild(div);

  // Funzione di aggiornamento totale
  const aggiornaExtra = () => {
    const q = parseFloat(inputQty.value || "1");
    const p = parseFloat(inputPrezzo.value || "0");
    inputTot.value = (q * p).toFixed(2);
    calcolaTotaliPreventivo();
  };

  inputQty.addEventListener("input", aggiornaExtra);
  inputPrezzo.addEventListener("input", aggiornaExtra);

  btnDel.addEventListener("click", () => {
    div.remove();
    calcolaTotaliPreventivo();
  });
}

// =========================================================
// ================== CALCOLO TOTALI ========================
// =========================================================

function calcolaTotaliPreventivo() {
  let totPiatti = 0;
  let totExtra = 0;

  if (prevPiattiContainer) {
    const righePiatti = prevPiattiContainer.querySelectorAll(".prev-piatto-tot");
    righePiatti.forEach(function (el) {
      totPiatti += parseFloat(el.value || "0");
    });
  }

  if (prevExtraContainer) {
    const righeExtra = prevExtraContainer.querySelectorAll(".prev-extra-tot");
    righeExtra.forEach(function (el) {
      totExtra += parseFloat(el.value || "0");
    });
  }

  if (prevTotalePiatti) prevTotalePiatti.value = totPiatti.toFixed(2);
  if (prevTotaleExtra) prevTotaleExtra.value = totExtra.toFixed(2);

  const totale = totPiatti + totExtra;
  if (prevTotale) prevTotale.value = totale.toFixed(2);

  // Prezzo a persona = (menù + extra) / n_invitati
  if (prevTotalePP) {
    let nInv = 0;
    if (prevNInvitati && prevNInvitati.value) {
      nInv = parseFloat(prevNInvitati.value);
    }
    if (nInv > 0) {
      prevTotalePP.value = (totale / nInv).toFixed(2);
    } else {
      prevTotalePP.value = "";
    }
  }

  if (prevStato && prevStato.value === "accettato" && prevSaldo) {
    let ac = 0;
    if (prevAcconto && prevAcconto.value) {
      ac = parseFloat(prevAcconto.value || "0");
    }
    prevSaldo.value = (totale - ac).toFixed(2);
  }
}

// =========================================================
// ===================== SALVATAGGIO ========================
// =========================================================

async function salvaPreventivo() {
  if (!supabase) return;

  const cliente = prevClienteNome ? (prevClienteNome.value || "").trim() : "";
  if (!cliente) {
    alert("Seleziona un cliente.");
    return;
  }

  // TROVA O CREA CONTATTO
  let contattoId = null;
  let contatto = contattiCache.find(function (c) {
    const nomeCompleto = (c.nome || "") + " " + (c.cognome || "");
    return nomeCompleto.trim().toLowerCase() === cliente.toLowerCase();
  });

  if (contatto) {
    contattoId = contatto.id;
  } else {
    const parti = cliente.split(" ");
    const nome = parti.shift() || cliente;
    const cognome = parti.join(" ");

    const resIns = await supabase
      .from("contatti")
      .insert({
        nome: nome,
        cognome: cognome || null,
        email: prevClienteEmail ? (prevClienteEmail.value || null) : null,
        telefono: prevClienteTelefono ? (prevClienteTelefono.value || null) : null
      })
      .select()
      .single();

    if (resIns.error) {
      console.error(resIns.error);
      alert("Errore creando contatto");
      return;
    }

    contattoId = resIns.data.id;
    contattiCache.push(resIns.data);
  }

  const payload = {
    cliente_id: contattoId,
    titolo_evento: prevTitolo ? (prevTitolo.value || null) : null,
    tipo_servizio: prevTipoServizio ? (prevTipoServizio.value || null) : null,
    data_evento: prevDataEvento ? (prevDataEvento.value || null) : null,
    n_invitati:
      prevNInvitati && prevNInvitati.value
        ? parseInt(prevNInvitati.value, 10)
        : null,
    location: prevLocation ? (prevLocation.value || null) : null,
    note: prevNote ? (prevNote.value || null) : null,
    stato: prevStato ? (prevStato.value || "bozza") : "bozza",
    acconto:
      prevAcconto && prevAcconto.value
        ? parseFloat(prevAcconto.value || "0")
        : 0,
    totale:
      prevTotale && prevTotale.value
        ? parseFloat(prevTotale.value || "0")
        : 0
  };

  let id = preventivoCorrenteId;
  let ricettaDaAprireId = null;


  if (id) {
    const resUpd = await supabase
      .from("preventivi")
      .update(payload)
      .eq("id", id);

    if (resUpd.error) {
      console.error(resUpd.error);
      alert("Errore salvando preventivo");
      return;
    }
  } else {
    const resNew = await supabase
      .from("preventivi")
      .insert(payload)
      .select()
      .single();

    if (resNew.error) {
      console.error(resNew.error);
      alert("Errore creando preventivo");
      return;
    }
    id = resNew.data.id;
    preventivoCorrenteId = id;
  }

  // SALVA RIGHE MENÙ
  await supabase.from("preventivi_ricette").delete().eq("preventivo_id", id);

  if (prevPiattiContainer) {
    const righe = prevPiattiContainer.children;
    for (let i = 0; i < righe.length; i++) {
      const div = righe[i];
      const inputNome = div.querySelector(".prev-piatto-nome");
      const inputQty = div.querySelector(".prev-piatto-qty");
      const inputCU = div.querySelector(".prev-piatto-costo");
      const inputTot = div.querySelector(".prev-piatto-tot");

      const nomePiatto = inputNome ? (inputNome.value || "") : "";
      if (!nomePiatto) continue;

      await supabase.from("preventivi_ricette").insert({
        preventivo_id: id,
        ricetta_id: div.dataset.ricettaId || null,
        nome_piatto: nomePiatto,
        quantita: inputQty ? inputQty.value : 0,
        costo_unitario: inputCU ? inputCU.value : 0,
        costo_totale: inputTot ? inputTot.value : 0,
        ricetta_completa: !!div.dataset.ricettaId
      });
    }
  }

  // SALVA EXTRA
  await supabase.from("preventivi_extra").delete().eq("preventivo_id", id);

  if (prevExtraContainer) {
    const righeE = prevExtraContainer.children;
    for (let i = 0; i < righeE.length; i++) {
      const div = righeE[i];
      const inputDesc = div.querySelector(".prev-extra-desc");
      const inputQty = div.querySelector(".prev-extra-qty");
      const inputPU = div.querySelector(".prev-extra-prezzo");

      const desc = inputDesc ? (inputDesc.value || "") : "";
      if (!desc) continue;

      await supabase.from("preventivi_extra").insert({
        preventivo_id: id,
        descrizione: desc,
        quantita: inputQty ? inputQty.value : 0,
        prezzo_unitario: inputPU ? inputPU.value : 0
      });
    }
  }

  // GENERA PRENOTAZIONE SOLO SE ACCETTATO
  if (prevStato && prevStato.value === "accettato") {
    await generaPrenotazione(id);
  }

  alert("Preventivo salvato.");
  await caricaPreventiviEsistenti();
}
// =========================================================
// ============ STAMPA & EMAIL PREVENTIVO ==================
// =========================================================

function raccogliDatiPreventivoCorrente() {
  // Cliente
  var clienteNome = prevClienteNome ? (prevClienteNome.value || "") : "";
  var clienteEmail = prevClienteEmail ? (prevClienteEmail.value || "") : "";
  var clienteTelefono = prevClienteTelefono ? (prevClienteTelefono.value || "") : "";

  // Evento
  var titoloEvento = prevTitolo ? (prevTitolo.value || "") : "";
  var tipoServizio = prevTipoServizio ? (prevTipoServizio.value || "") : "";
  var dataEvento = prevDataEvento ? (prevDataEvento.value || "") : "";
  var nInvitati = prevNInvitati && prevNInvitati.value ? parseInt(prevNInvitati.value, 10) : 0;
  var locationEvento = prevLocation ? (prevLocation.value || "") : "";
  var note = prevNote ? (prevNote.value || "") : "";

  // Totali
  var totMenù = prevTotalePiatti ? (prevTotalePiatti.value || "0") : "0";
  var totExtra = prevTotaleExtra ? (prevTotaleExtra.value || "0") : "0";
  var totPreventivo = prevTotale ? (prevTotale.value || "0") : "0";
  var totPP = prevTotalePP ? (prevTotalePP.value || "") : "";

  var accontoVal = prevAcconto && prevAcconto.value ? prevAcconto.value : "";
  var saldoVal = prevSaldo && prevSaldo.value ? prevSaldo.value : "";

  // Righe menù
  var righeMenu = [];
  if (prevPiattiContainer) {
    var righeP = prevPiattiContainer.children;
    for (var i = 0; i < righeP.length; i++) {
      var div = righeP[i];
      var nome = div.querySelector(".prev-piatto-nome");
      var qty = div.querySelector(".prev-piatto-qty");
      var cu = div.querySelector(".prev-piatto-costo");
      var tot = div.querySelector(".prev-piatto-tot");

      var riga = {
        nome: nome ? (nome.value || "") : "",
        quantita: qty ? (qty.value || "") : "",
        costoUnitario: cu ? (cu.value || "") : "",
        totale: tot ? (tot.value || "") : ""
      };
      if (riga.nome) {
        righeMenu.push(riga);
      }
    }
  }

  // Righe extra
  var righeExtra = [];
  if (prevExtraContainer) {
    var righeE = prevExtraContainer.children;
    for (var j = 0; j < righeE.length; j++) {
      var d = righeE[j];
      var desc = d.querySelector(".prev-extra-desc");
      var q = d.querySelector(".prev-extra-qty");
      var pu = d.querySelector(".prev-extra-prezzo");
      var totE = d.querySelector(".prev-extra-tot");

      var rigaE = {
        descrizione: desc ? (desc.value || "") : "",
        quantita: q ? (q.value || "") : "",
        prezzoUnitario: pu ? (pu.value || "") : "",
        totale: totE ? (totE.value || "") : ""
      };
      if (rigaE.descrizione) {
        righeExtra.push(rigaE);
      }
    }
  }

  return {
    clienteNome: clienteNome,
    clienteEmail: clienteEmail,
    clienteTelefono: clienteTelefono,
    titoloEvento: titoloEvento,
    tipoServizio: tipoServizio,
    dataEvento: dataEvento,
    nInvitati: nInvitati,
    locationEvento: locationEvento,
    note: note,
    totMenù: totMenù,
    totExtra: totExtra,
    totPreventivo: totPreventivo,
    totPP: totPP,
    acconto: accontoVal,
    saldo: saldoVal,
    righeMenu: righeMenu,
    righeExtra: righeExtra
  };
}

function stampaPreventivoCorrente() {
  var dati = raccogliDatiPreventivoCorrente();

  var titolo = "Preventivo " + (dati.titoloEvento || "");
  var win = window.open("", "_blank");

  if (!win) {
    alert("Blocca pop-up attivo: consenti la finestra di stampa.");
    return;
  }

  var html = "";
  html += "<!DOCTYPE html><html><head><meta charset='utf-8'>";
  html += "<title>" + titolo + "</title>";
  html += "<style>";
  html += "body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; color: #222; }";
  html += "h1,h2,h3 { margin: 0 0 8px; }";
  html += ".header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }";
  html += ".logo { font-size: 20px; font-weight: bold; }";
  html += ".azienda-contatti { font-size: 12px; text-align: right; }";
  html += ".box { border: 1px solid #ccc; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }";
  html += ".titolo-box { font-weight: 600; margin-bottom: 6px; font-size: 14px; }";
  html += "table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }";
  html += "th, td { border: 1px solid #ccc; padding: 4px 6px; }";
  html += "th { background: #f2f2f2; text-align: left; }";
  html += "td.num { text-align: right; }";
  html += ".totale-row td { font-weight: bold; }";
  html += ".note { font-size: 12px; white-space: pre-wrap; }";
  html += "@media print { body { margin: 10mm; } }";
  html += "</style></head><body>";

  // intestazione con logo + dati azienda
  html += "<div class='header'>";
  html += "<div class='logo'>LOGO / Nome Ristorante</div>";
  html += "<div class='azienda-contatti'>";
  html += "Indirizzo azienda<br>";
  html += "Telefono / Email<br>";
  html += "</div>";
  html += "</div>";

  // titolo preventivo
  html += "<h1>Preventivo evento</h1>";

  // dati cliente
  html += "<div class='box'>";
  html += "<div class='titolo-box'>Cliente</div>";
  html += "<div>" + (dati.clienteNome || "-") + "</div>";
  if (dati.clienteEmail) {
    html += "<div>Email: " + dati.clienteEmail + "</div>";
  }
  if (dati.clienteTelefono) {
    html += "<div>Telefono: " + dati.clienteTelefono + "</div>";
  }
  html += "</div>";

  // dati evento
  html += "<div class='box'>";
  html += "<div class='titolo-box'>Dettagli evento</div>";
  html += "<div>Tipologia evento: " + (dati.titoloEvento || "-") + "</div>";
  html += "<div>Tipo servizio: " + (dati.tipoServizio || "-") + "</div>";
  html += "<div>Data evento: " + (dati.dataEvento || "-") + "</div>";
  html += "<div>Numero invitati: " + (dati.nInvitati || "-") + "</div>";
  if (dati.locationEvento) {
    html += "<div>Location: " + dati.locationEvento + "</div>";
  }
  html += "</div>";

  // Menù
  html += "<div class='box'>";
  html += "<div class='titolo-box'>Menù</div>";
  if (dati.righeMenu.length === 0) {
    html += "<div>Nessuna portata inserita.</div>";
  } else {
    html += "<table>";
    html += "<thead><tr><th>Portata</th><th>Quantità</th><th>Prezzo unitario</th><th>Totale</th></tr></thead>";
    html += "<tbody>";
    for (var i = 0; i < dati.righeMenu.length; i++) {
      var r = dati.righeMenu[i];
      html += "<tr>";
      html += "<td>" + r.nome + "</td>";
      html += "<td class='num'>" + (r.quantita || "") + "</td>";
      html += "<td class='num'>" + (r.costoUnitario || "") + "</td>";
      html += "<td class='num'>" + (r.totale || "") + "</td>";
      html += "</tr>";
    }
    html += "</tbody>";
    html += "</table>";
  }
  html += "</div>";

  // Servizi extra
  html += "<div class='box'>";
  html += "<div class='titolo-box'>Servizi extra</div>";
  if (dati.righeExtra.length === 0) {
    html += "<div>Nessun servizio extra.</div>";
  } else {
    html += "<table>";
    html += "<thead><tr><th>Servizio</th><th>Quantità</th><th>Prezzo unitario</th><th>Totale</th></tr></thead>";
    html += "<tbody>";
    for (var j = 0; j < dati.righeExtra.length; j++) {
      var e = dati.righeExtra[j];
      html += "<tr>";
      html += "<td>" + e.descrizione + "</td>";
      html += "<td class='num'>" + (e.quantita || "") + "</td>";
      html += "<td class='num'>" + (e.prezzoUnitario || "") + "</td>";
      html += "<td class='num'>" + (e.totale || "") + "</td>";
      html += "</tr>";
    }
    html += "</tbody>";
    html += "</table>";
  }
  html += "</div>";

  // Totali
  html += "<div class='box'>";
  html += "<div class='titolo-box'>Riepilogo economico</div>";
  html += "<table>";
  html += "<tbody>";
  html += "<tr><td>Totale menù</td><td class='num'>" + (dati.totMenù || "0") + " €</td></tr>";
  html += "<tr><td>Totale servizi extra</td><td class='num'>" + (dati.totExtra || "0") + " €</td></tr>";
  html += "<tr class='totale-row'><td>Totale preventivo</td><td class='num'>" + (dati.totPreventivo || "0") + " €</td></tr>";
  if (dati.totPP) {
    html += "<tr><td>Prezzo a persona</td><td class='num'>" + dati.totPP + " €</td></tr>";
  }
  if (dati.acconto) {
    html += "<tr><td>Acconto</td><td class='num'>-" + dati.acconto + " €</td></tr>";
  }
  if (dati.saldo) {
    html += "<tr><td>Saldo da versare</td><td class='num'>" + dati.saldo + " €</td></tr>";
  }
  html += "</tbody>";
  html += "</table>";
  html += "</div>";

  // Note
  if (dati.note) {
    html += "<div class='box'>";
    html += "<div class='titolo-box'>Note</div>";
    html += "<div class='note'>" + dati.note.replace(/\n/g, "<br>") + "</div>";
    html += "</div>";
  }

  // footer
  html += "<div style='margin-top:20px; font-size:11px; color:#777;'>Questo documento è un preventivo non fiscale.</div>";

  html += "</body></html>";

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
function inviaEmailPreventivoCorrente() {
  var dati = raccogliDatiPreventivoCorrente();

  var emailDest = dati.clienteEmail || "";
  if (!emailDest) {
    alert("Il cliente non ha un'email. Compilala prima.");
    return;
  }

  var oggetto = "Preventivo " + (dati.titoloEvento || "evento");

  var body = "";
  body += "Gentile " + (dati.clienteNome || "") + ",%0D%0A%0D%0A";
  body += "Le inoltriamo il preventivo per il seguente evento:%0D%0A";
  body += "- Tipologia evento: " + (dati.titoloEvento || "-") + "%0D%0A";
  body += "- Tipo servizio: " + (dati.tipoServizio || "-") + "%0D%0A";
  body += "- Data evento: " + (dati.dataEvento || "-") + "%0D%0A";
  body += "- Numero invitati: " + (dati.nInvitati || "-") + "%0D%0A";
  if (dati.locationEvento) {
    body += "- Location: " + dati.locationEvento + "%0D%0A";
  }
  body += "%0D%0A";

  body += "Riepilogo economico:%0D%0A";
  body += "- Totale menù: " + (dati.totMenù || "0") + " €%0D%0A";
  body += "- Totale servizi extra: " + (dati.totExtra || "0") + " €%0D%0A";
  body += "- Totale preventivo: " + (dati.totPreventivo || "0") + " €%0D%0A";
  if (dati.totPP) {
    body += "- Prezzo a persona: " + dati.totPP + " €%0D%0A";
  }
  if (dati.acconto) {
    body += "- Acconto: " + dati.acconto + " €%0D%0A";
  }
  if (dati.saldo) {
    body += "- Saldo da versare: " + dati.saldo + " €%0D%0A";
  }

  if (dati.note) {
    body += "%0D%0ANote:%0D%0A" + dati.note.replace(/\n/g, "%0D%0A") + "%0D%0A";
  }

  body += "%0D%0ACordiali saluti,%0D%0A";
  body += "Nome Ristorante";

  var mailtoLink =
    "mailto:" +
    encodeURIComponent(emailDest) +
    "?subject=" +
    encodeURIComponent(oggetto) +
    "&body=" +
    body;

  window.location.href = mailtoLink;
}
if (prevStampaBtn) {
  prevStampaBtn.addEventListener("click", function () {
    stampaPreventivoCorrente();
  });
}

if (prevEmailBtn) {
  prevEmailBtn.addEventListener("click", function () {
    inviaEmailPreventivoCorrente();
  });
}

// =========================================================
// ================= PRENOTAZIONE ===========================
// =========================================================

async function generaPrenotazione(id) {
  if (!supabase) return;

  let ac = 0;
  let tot = 0;

  if (prevAcconto && prevAcconto.value) {
    ac = parseFloat(prevAcconto.value || "0");
  }
  if (prevTotale && prevTotale.value) {
    tot = parseFloat(prevTotale.value || "0");
  }

  const resPrev = await supabase
    .from("preventivi")
    .select("*")
    .eq("id", id)
    .single();

  if (resPrev.error || !resPrev.data) return;

  const resPren = await supabase.from("prenotazioni").upsert({
    preventivo_id: id,
    cliente_id: resPrev.data.cliente_id,
    data_evento: resPrev.data.data_evento,
    acconto: ac,
    saldo_residuo: tot - ac
  });

  if (resPren.error) {
    console.error("Errore creando prenotazione:", resPren.error);
  }
}

// =========================================================
// =================== CARICA IN MODIFICA ===================
// =========================================================

async function caricaPreventivoInModifica(id) {
  if (!supabase) return;

  preventivoCorrenteId = id;

  const res = await supabase
    .from("preventivi")
    .select("*")
    .eq("id", id)
    .single();

  if (res.error || !res.data) {
    console.error(res.error);
    alert("Errore caricando preventivo");
    return;
  }

  const p = res.data;
  const contatto = contattiCache.find(function (c) {
    return c.id === p.cliente_id;
  });

  if (contatto) {
    if (prevClienteNome) {
      const nomeCompleto = (contatto.nome || "") + " " + (contatto.cognome || "");
      prevClienteNome.value = nomeCompleto.trim();
    }
    if (prevClienteEmail) prevClienteEmail.value = contatto.email || "";
    if (prevClienteTelefono) prevClienteTelefono.value = contatto.telefono || "";
  }

  if (prevTitolo) prevTitolo.value = p.titolo_evento || "";
  if (prevTipoServizio) prevTipoServizio.value = p.tipo_servizio || "buffet";
  if (prevDataEvento) prevDataEvento.value = p.data_evento || "";
  if (prevNInvitati) prevNInvitati.value = p.n_invitati || "";
  if (prevLocation) prevLocation.value = p.location || "";
  if (prevNote) prevNote.value = p.note || "";
  if (prevStato) prevStato.value = p.stato || "bozza";
  if (prevAcconto) prevAcconto.value = p.acconto || "0";

  if (prevPiattiContainer) prevPiattiContainer.innerHTML = "";
  if (prevExtraContainer) prevExtraContainer.innerHTML = "";

  const resPiatti = await supabase
    .from("preventivi_ricette")
    .select("*")
    .eq("preventivo_id", id);

  if (!resPiatti.error && resPiatti.data) {
    resPiatti.data.forEach(function (riga) {
      aggiungiRigaPiatto(riga);
    });
  }

  const resExtra = await supabase
    .from("preventivi_extra")
    .select("*")
    .eq("preventivo_id", id);

  if (!resExtra.error && resExtra.data) {
    resExtra.data.forEach(function (e) {
      aggiungiRigaExtra(e);
    });
  }

  calcolaTotaliPreventivo();

  if (prevAccontoCard) {
    prevAccontoCard.style.display = p.stato === "accettato" ? "block" : "none";
  }
  if (prevApriPrenotazioneBtn) {
    prevApriPrenotazioneBtn.style.display =
      p.stato === "accettato" ? "block" : "none";
  }

  showOnlyView("view-preventivi");
  applyRoleVisibility();
}

// =========================================================
// =================== EVENT LISTENERS ======================
// =========================================================

if (prevAddPiattoBtn) {
  prevAddPiattoBtn.addEventListener("click", function () {
    aggiungiRigaPiatto();
  });
}

if (prevAddExtraBtn) {
  prevAddExtraBtn.addEventListener("click", function () {
    aggiungiRigaExtra();
  });
}

if (prevSalvaBtn) {
  prevSalvaBtn.addEventListener("click", function () {
    salvaPreventivo();
  });
}

if (prevStato) {
  prevStato.addEventListener("change", function () {
    if (prevAccontoCard) {
      prevAccontoCard.style.display =
        prevStato.value === "accettato" ? "block" : "none";
    }
    if (prevApriPrenotazioneBtn) {
      prevApriPrenotazioneBtn.style.display =
        prevStato.value === "accettato" ? "block" : "none";
    }
    calcolaTotaliPreventivo();
  });
}

if (prevAcconto) {
  prevAcconto.addEventListener("input", function () {
    calcolaTotaliPreventivo();
  });
}

if (prevNInvitati) {
  prevNInvitati.addEventListener("input", function () {
    calcolaTotaliPreventivo();
  });
}

// === Caricamento iniziale dei dati preventivi
(async function () {
  await caricaContatti();
  await caricaRicettePreventivi();
  await caricaCatalogoExtra();
  await caricaPreventiviEsistenti();
})();

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

  // ========= MAGAZZINO =========
  function renderMagazzinoLista(lista) {
    if (!magazzinoListaEl) return;
    magazzinoListaEl.innerHTML = "";

    lista.forEach((p) => {
      const tr = document.createElement("tr");
      tr.dataset.prodottoId = p.id;

      const stockTxt =
        p.stock != null ? p.stock.toFixed(2) + " " + (p.um || "") : "";

      tr.innerHTML = `
        <td>${p.codice || ""}</td>
        <td>${p.descrizione || ""}</td>
        <td>${p.categoriaNome || ""}</td>
        <td>${stockTxt}</td>
      `;

      tr.addEventListener("click", () => {
        selezionaProdottoMagazzino(p.id);
      });

      magazzinoListaEl.appendChild(tr);
    });
  }

  function aggiornaMagazzinoSuggestions() {
    if (!magazzinoSuggestions) return;
    magazzinoSuggestions.innerHTML = "";

    magazzinoDati.forEach((p) => {
      if (!p.descrizione) return;
      const opt = document.createElement("option");
      opt.value = p.descrizione;
      if (p.codice) {
        opt.label = `${p.descrizione} (${p.codice})`;
      }
      magazzinoSuggestions.appendChild(opt);
    });
  }

  function aggiornaIngredientiSuggestionsDaMagazzino() {
    if (!ingredientiSuggestions) return;
    ingredientiSuggestions.innerHTML = "";

    magazzinoDati.forEach((p) => {
      if (!p.descrizione) return;
      const opt = document.createElement("option");
      opt.value = p.descrizione;
      if (p.codice) {
        opt.label = `${p.descrizione} (${p.codice})`;
      }
      ingredientiSuggestions.appendChild(opt);
    });
  }

  function trovaProdottoInMagazzinoById(id) {
    return magazzinoDati.find((p) => p.id === id) || null;
  }

  function popolaMagazzinoForm(prod) {
    if (!prod) {
      if (magazzinoIdInput) magazzinoIdInput.value = "";
      if (magazzinoDescrInput) magazzinoDescrInput.value = "";
      if (magazzinoCategoriaInput) magazzinoCategoriaInput.value = "";
      if (magazzinoUmInput) magazzinoUmInput.value = "";
      if (magazzinoScortaMinimaInput) magazzinoScortaMinimaInput.value = "";
      if (magazzinoGiacenzaInput) magazzinoGiacenzaInput.value = "";
      return;
    }

    if (magazzinoIdInput) magazzinoIdInput.value = prod.id;
    if (magazzinoDescrInput)
      magazzinoDescrInput.value = prod.descrizione || "";
    if (magazzinoCategoriaInput)
      magazzinoCategoriaInput.value = prod.categoriaNome || "";
    if (magazzinoUmInput) magazzinoUmInput.value = prod.um || "";
    if (magazzinoScortaMinimaInput) {
      magazzinoScortaMinimaInput.value =
        prod.scortaMinima != null ? prod.scortaMinima : "";
    }
    if (magazzinoGiacenzaInput) {
      magazzinoGiacenzaInput.value =
        prod.stock != null ? prod.stock.toFixed(3) : "";
    }
  }

  function selezionaProdottoMagazzino(id) {
    const prod = trovaProdottoInMagazzinoById(id);
    popolaMagazzinoForm(prod);
  }

  async function caricaMagazzinoDati() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("prodotti")
      .select(
        "id, codice_interno, descrizione, um, categoria_id, scorta_minima"
      )
      .order("descrizione", { ascending: true });

    if (error) {
      console.error("Errore caricamento magazzino:", error);
      alert("Errore nel caricare i prodotti di magazzino");
      return;
    }

    const { data: righe, error: righeError } = await supabase
      .from("fatture_acquisto_righe")
      .select("prodotto_id, quantita");

    if (righeError) {
      console.error(
        "Errore caricamento righe fatture per giacenze:",
        righeError
      );
    }

    const giacenzeMap = {};
    (righe || []).forEach((r) => {
      const pid = r.prodotto_id;
      if (!pid) return;
      const q = Number(r.quantita) || 0;
      giacenzeMap[pid] = (giacenzeMap[pid] || 0) + q;
    });

    magazzinoDati = (data || []).map((r) => {
      const cat =
        r.categoria_id != null ? getCategoriaById(r.categoria_id) : null;
      const stock = giacenzeMap[r.id] || 0;

      return {
        id: r.id,
        codice: r.codice_interno,
        descrizione: r.descrizione,
        um: r.um,
        categoriaNome: cat ? cat.nome : "",
        scortaMinima: r.scorta_minima,
        stock,
      };
    });

    aggiornaMagazzinoSuggestions();
    aggiornaIngredientiSuggestionsDaMagazzino();
  }

  async function salvaProdottoDaMagazzinoForm() {
    if (!supabase) return;

    const idVal = magazzinoIdInput?.value || "";
    const id = idVal ? parseInt(idVal, 10) : null;
    const descr = (magazzinoDescrInput?.value || "").trim();
    const catNome = (magazzinoCategoriaInput?.value || "").trim();
    const umVal = (magazzinoUmInput?.value || "").trim();
    const scortaVal = magazzinoScortaMinimaInput
      ? parseNumber(magazzinoScortaMinimaInput.value)
      : null;

    if (!descr) {
      alert("La descrizione non può essere vuota.");
      return;
    }

    let categoriaId = null;
    if (catNome) {
      const cat = await findOrCreateCategoriaByNome(catNome);
      if (cat) categoriaId = cat.id;
    }

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
          scorta_minima: scortaVal != null ? scortaVal : null,
          attivo: true,
        })
        .select(
          "id, codice_interno, descrizione, categoria_id, um, scorta_minima"
        )
        .single();

      if (error) {
        console.error("Errore creazione prodotto magazzino:", error);
        alert("Errore nel salvare il prodotto di magazzino: " + error.message);
        return;
      }

      const cat =
        data.categoria_id != null ? getCategoriaById(data.categoria_id) : null;
      const nuovo = {
        id: data.id,
        codice: data.codice_interno,
        descrizione: data.descrizione,
        um: data.um,
        categoriaNome: cat ? cat.nome : "",
        scortaMinima: data.scorta_minima,
        stock: 0,
      };
      magazzinoDati.push(nuovo);
      popolaMagazzinoForm(nuovo);
      renderMagazzinoLista(magazzinoDati);
      aggiornaMagazzinoSuggestions();
      aggiornaIngredientiSuggestionsDaMagazzino();
      alert("Prodotto creato.");
    } else {
      const { data, error } = await supabase
        .from("prodotti")
        .update({
          descrizione: descr,
          categoria_id: categoriaId,
          um: umVal || null,
          scorta_minima: scortaVal != null ? scortaVal : null,
        })
        .eq("id", id)
        .select(
          "id, codice_interno, descrizione, categoria_id, um, scorta_minima"
        )
        .single();

      if (error) {
        console.error("Errore aggiornamento prodotto magazzino:", error);
        alert(
          "Errore nel salvare il prodotto di magazzino: " + error.message
        );
        return;
      }

      const cat =
        data.categoria_id != null ? getCategoriaById(data.categoria_id) : null;
      const idx = magazzinoDati.findIndex((p) => p.id === id);
      const stockAttuale = idx >= 0 ? magazzinoDati[idx].stock : 0;

      const nuovo = {
        id: data.id,
        codice: data.codice_interno,
        descrizione: data.descrizione,
        um: data.um,
        categoriaNome: cat ? cat.nome : "",
        scortaMinima: data.scorta_minima,
        stock: stockAttuale,
      };

      if (idx >= 0) {
        magazzinoDati[idx] = nuovo;
      } else {
        magazzinoDati.push(nuovo);
      }

      renderMagazzinoLista(magazzinoDati);
      aggiornaMagazzinoSuggestions();
      aggiornaIngredientiSuggestionsDaMagazzino();
      popolaMagazzinoForm(nuovo);
      alert("Prodotto aggiornato.");
    }
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
        const cod = (p.codice || "").toLowerCase();
        return desc.includes(q) || cod.includes(q);
      });

      renderMagazzinoLista(filtrati);
      magazzinoTable.style.display = "table";
    });
  }

  if (magazzinoDescrInput) {
    magazzinoDescrInput.addEventListener("change", () => {
      const val = (magazzinoDescrInput.value || "").trim().toLowerCase();
      if (!val) return;

      const prod = magazzinoDati.find(
        (p) => (p.descrizione || "").toLowerCase() === val
      );
      if (prod) {
        popolaMagazzinoForm(prod);
      }
    });
  }

  // ========= SUPPORTO RICETTE: CARICARE SUGGERIMENTI DA MAGAZZINO =========
  async function caricaProdottiSuggerimentiIngredienti() {
    if (!magazzinoDati.length) {
      await caricaCategorieInCache();
      await caricaMagazzinoDati();
    } else {
      aggiornaIngredientiSuggestionsDaMagazzino();
    }
  }

  // ========= ROUTING =========
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
        await caricaProdottiPerRicette();
        await caricaElencoRicette();
        nuovaRicetta();
        break;
      if (ricettaDaAprireId) {
        // se arrivo dal Ricettario con "Modifica"
        const idToOpen = ricettaDaAprireId;
        ricettaDaAprireId = null; // lo consumo subito
        await caricaRicettaInForm(idToOpen);
      } else {
        // apertura normale: form vuoto
        resetFormRicetta();
      }
      break;


      case "ricette-viewer":
        await caricaRicetteDaSupabase();
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

      case "report":
        // logica futura per report
        break;

      case "venduto":
        // logica futura per venduto del giorno
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
      if (
        route === "timbratura" ||
        route === "ordine" ||
        route === "ricette-viewer"
      ) {
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
