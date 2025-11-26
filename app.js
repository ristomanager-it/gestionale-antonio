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


// archivio ricette (lista/tabella opzionale)
const ricettaArchivioBody = document.getElementById("ricette-archivio-body");

// pulsanti
const btnAddIngrediente = document.getElementById("btn-add-ingrediente");
const btnSalvaRicetta = document.getElementById("btn-salva-ricetta");
const btnNuovaRicetta = document.getElementById("btn-nuova-ricetta");
const btnStampaRicetta = document.getElementById("btn-stampa-ricetta");

  const btnAddIngrediente = document.getElementById("btn-add-ingrediente");
  const btnSalvaRicetta = document.getElementById("btn-salva-ricetta");

  // ---------- ACQUISTI / FATTURE (DOM) ----------
  const viewAcquisti = document.getElementById("view-acquisti");
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

  // stato
  let dipendenti = [];
  let timbrature = [];
  let currentUser = null;
  let periodoCorrente = "oggi";

 // stato ricette
let ricettaCorrenteId = null;
let ricettaFotoCorrenteUrl = null; // per mantenere la vecchia foto se non la cambi
let ricetteCache = []; // archivio ricette per menù / preventivi

  // stato acquisti/fatture
  let currentFatturaId = null;
  let fornitoriCache = [];
  let categorieCache = [];

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

    // prendo la prima parola, tolgo accenti e caratteri strani
    let base = nomeCategoria.trim().split(/\s+/)[0].toUpperCase();
    base = base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // tolgo accenti
      .replace(/[^A-Z0-9]/g, ""); // solo lettere e numeri

    if (base.length >= 3) return base.slice(0, 3);
    if (base.length === 2) return base + "X";
    if (base.length === 1) return base + "XX";
    return "GEN";
  }

  async function generaCodiceInternoAutomatico(nomeCategoria) {
    const prefix = slugCategoria(nomeCategoria); // es. VIT, MAI, CAR...

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

  // ========= UTILITY RUOLI / FORMATI =========
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

      // admin virtuale
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

  // ========= ANAGRAFICA DIPENDENTI =========
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

      // se l'array dipendenti è vuoto, provo a ricaricarlo prima del login
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

      // se c'è ancora una entrata aperta, conteggiamo fino ad adesso
      if (aperto && aperto.timestamp) {
        const diffMin = (adesso - aperto.timestamp) / 60000;
        if (diffMin > 0) {
          perDip[key] = (perDip[key] || 0) + diffMin;
          perCanale[canale] = (perCanale[canale] || 0) + diffMin;
        }
      }
    });

    // calcolo costi
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

    // riepilogo per dip
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

    // riepilogo per canale
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

    // costo per dipendente
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

    // costo per canale
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

  // stato corrente dipendente per blocco cambio canale
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

  // ========= RICETTE =========

// crea una riga ingrediente nel form
function creaRigaIngrediente(initial = {}) {
  if (!ricettaIngredientiContainer) return;

  const row = document.createElement("div");
  row.className = "ricetta-ingrediente-row";
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.alignItems = "center";

  row.innerHTML = `
    <input
      type="text"
      class="ingrediente-nome"
      placeholder="Ingrediente"
      style="flex: 2; min-width: 0;"
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
  btnDel.addEventListener("click", () => {
    row.remove();
  });

  ricettaIngredientiContainer.appendChild(row);
}

// reset form per nuova ricetta
function resetFormRicetta() {
  ricettaCorrenteId = null;
  ricettaFotoCorrenteUrl = null;

  if (ricettaNomeInput) ricettaNomeInput.value = "";
  if (ricettaDescrizioneInput) ricettaDescrizioneInput.value = "";
  if (ricettaNoteInput) ricettaNoteInput.value = "";
  if (ricettaFotoInput) ricettaFotoInput.value = "";
  if (ricettaTempoInput) ricettaTempoInput.value = "";

  if (ricettaIngredientiContainer) {
    ricettaIngredientiContainer.innerHTML = "";
  }

  // almeno una riga di default
  creaRigaIngrediente();
}

// carico l'archivio ricette da Supabase
async function caricaArchivioRicette() {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome, descrizione, tempo_medio_minuti, foto_url")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Errore caricamento archivio ricette:", error);
    alert("Errore nel caricare l'archivio ricette");
    return;
  }

  ricetteCache = data || [];
  renderArchivioRicette();
}

// render tabella/lista archivio (se esiste in HTML)
function renderArchivioRicette() {
  if (!ricettaArchivioBody) return;

  ricettaArchivioBody.innerHTML = "";

  if (!ricetteCache.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="3">Nessuna ricetta salvata</td>`;
    ricettaArchivioBody.appendChild(tr);
    return;
  }

  ricetteCache.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.nome}</td>
      <td>${r.descrizione || ""}</td>
      <td>${r.tempo_medio_minuti ? r.tempo_medio_minuti + " min" : ""}</td>
    `;
    tr.style.cursor = "pointer";
    tr.addEventListener("click", () => {
      caricaRicettaDaArchivio(r.id);
    });
    ricettaArchivioBody.appendChild(tr);
  });
}

// carica una ricetta + ingredienti nel form
async function caricaRicettaDaArchivio(ricettaId) {
  if (!supabase) return;

  const { data: ricetta, error } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", ricettaId)
    .single();

  if (error || !ricetta) {
    console.error("Errore caricamento ricetta:", error);
    alert("Errore nel caricare la ricetta scelta");
    return;
  }

  ricettaCorrenteId = ricetta.id;
  ricettaFotoCorrenteUrl = ricetta.foto_url || null;

  if (ricettaNomeInput) ricettaNomeInput.value = ricetta.nome || "";
  if (ricettaDescrizioneInput)
    ricettaDescrizioneInput.value = ricetta.descrizione || "";
  if (ricettaNoteInput)
    ricettaNoteInput.value = ricetta.note_procedimento || "";
  if (ricettaTempoInput)
    ricettaTempoInput.value = ricetta.tempo_medio_minuti || "";

  if (ricettaIngredientiContainer) {
    ricettaIngredientiContainer.innerHTML = "";
  }

  const { data: ingredienti, error: ingErr } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .order("id", { ascending: true });

  if (ingErr) {
    console.error("Errore caricamento ingredienti ricetta:", ingErr);
    alert("Errore nel caricare gli ingredienti della ricetta");
    return;
  }

  if (ingredienti && ingredienti.length) {
    ingredienti.forEach((ing) => creaRigaIngrediente(ing));
  } else {
    creaRigaIngrediente();
  }
}

// helper: cerca o crea un prodotto a partire dal nome ingrediente
// (riutilizzabile anche in Magazzino)
async function findOrCreateProdottoPerIngrediente(nomeProdotto, unitaMisura) {
  if (!supabase) return null;
  const nomeTrim = (nomeProdotto || "").trim();
  if (!nomeTrim) return null;
  const umTrim = (unitaMisura || "").trim() || "pz";

  // 1) provo a cercare per descrizione
  let prodotto = null;
  try {
    const { data, error } = await supabase
      .from("prodotti")
      .select("id, codice_interno, descrizione, categoria_id, um")
      .ilike("descrizione", nomeTrim)
      .limit(1);

    if (error) {
      console.error("Errore ricerca prodotto per descrizione:", error);
    } else if (data && data.length > 0) {
      prodotto = data[0];
    }
  } catch (e) {
    console.error("Errore generico ricerca prodotto per ingrediente:", e);
  }

  if (prodotto) return prodotto;

  // 2) se non lo trovo, uso la funzione standard (genera codice, ecc.)
  return await findOrCreateProdotto({
    codice: "",
    descrizione: nomeTrim,
    categoriaNome: null,
    um: umTrim,
  });
}

// salva/aggiorna la ricetta "base"
async function salvaRicettaSupabaseBase({
  id,
  nome,
  descrizione,
  note,
  fotoUrl,
  tempoMedioMinuti,
}) {
  if (!supabase) return null;

  const payload = {
    id: id || undefined,
    nome,
    descrizione: descrizione || null,
    note_procedimento: note || null,
    foto_url: fotoUrl || null,
    tempo_medio_minuti: tempoMedioMinuti || null,
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

// salva ingredienti collegati alla ricetta
async function salvaIngredientiPerRicetta(ricettaId, ingredienti) {
  if (!supabase) return;

  // cancello ingredienti precedenti (se sto modificando)
  await supabase
    .from("ricetta_ingredienti")
    .delete()
    .eq("ricetta_id", ricettaId);

  if (!ingredienti.length) return;

  const payload = [];

  for (const ing of ingredienti) {
    const prodotto = await findOrCreateProdottoPerIngrediente(
      ing.nome,
      ing.unita
    );

    payload.push({
      ricetta_id: ricettaId,
      prodotto_id: prodotto ? prodotto.id : null,
      nome_prodotto: prodotto?.descrizione || ing.nome,
      quantita: ing.quantita,
      unita_misura: ing.unita,
      note: null,
    });
  }

  const { error } = await supabase
    .from("ricetta_ingredienti")
    .insert(payload);

  if (error) {
    console.error("Errore salvataggio ingredienti:", error);
    alert("Errore nel salvare gli ingredienti della ricetta");
  }
}

// upload foto ricetta (se presente)
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

// handler salvataggio ricetta
async function handleSalvaRicetta() {
  const nome = (ricettaNomeInput?.value || "").trim();
  const descrizione = (ricettaDescrizioneInput?.value || "").trim();
  const note = (ricettaNoteInput?.value || "").trim();
  const tempoMedioMinuti =
    parseInt(ricettaTempoInput?.value || "0", 10) || null;

  if (!nome) {
    alert("Inserisci il nome della ricetta");
    return;
  }

  // raccolgo ingredienti dal form
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

  // upload foto (se presente)
  const fotoUrl = await uploadFotoRicettaSePresente();
  ricettaFotoCorrenteUrl = fotoUrl;

  // salvo ricetta base
  const ricettaSalvata = await salvaRicettaSupabaseBase({
    id: ricettaCorrenteId,
    nome,
    descrizione,
    note,
    fotoUrl,
    tempoMedioMinuti,
  });

  if (!ricettaSalvata) return;

  ricettaCorrenteId = ricettaSalvata.id;

  // salvo ingredienti collegati (con collegamento prodotti di magazzino)
  await salvaIngredientiPerRicetta(ricettaCorrenteId, ingredienti);

  // aggiorno archivio
  await caricaArchivioRicette();

  alert("Ricetta salvata correttamente");
}

// finestra stampabile / PDF (usa la funzione di stampa del browser)
async function stampaRicettaCorrente() {
  if (!ricettaCorrenteId) {
    alert("Prima seleziona o salva una ricetta");
    return;
  }
  if (!supabase) return;

  const { data: ricetta, error } = await supabase
    .from("ricette")
    .select("*")
    .eq("id", ricettaCorrenteId)
    .single();

  if (error || !ricetta) {
    console.error("Errore caricamento ricetta per stampa:", error);
    alert("Errore nel caricare la ricetta da stampare");
    return;
  }

  const { data: ingredienti, error: ingErr } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", ricettaCorrenteId)
    .order("id", { ascending: true });

  if (ingErr) {
    console.error("Errore caricamento ingredienti per stampa:", ingErr);
  }

  const win = window.open("", "_blank");
  if (!win) {
    alert(
      "Impossibile aprire la finestra di stampa (popup bloccato dal browser)."
    );
    return;
  }

  const htmlIngredienti = (ingredienti || [])
    .map(
      (ing) =>
        `<tr><td>${ing.nome_prodotto || ""}</td><td>${
          ing.quantita
        }</td><td>${ing.unita_misura || ""}</td></tr>`
    )
    .join("");

  win.document.write(`
    <html>
      <head>
        <title>Ricetta - ${ricetta.nome}</title>
        <meta charset="UTF-8" />
        <style>
          body { font-family: system-ui, sans-serif; padding: 16px; }
          h1 { margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 13px; }
          th { background: #f3f4f6; text-align: left; }
          .meta { margin-top: 8px; font-size: 13px; color: #4b5563; }
          .foto { max-width: 160px; margin-top: 8px; }
        </style>
      </head>
      <body>
        <h1>${ricetta.nome}</h1>
        <div class="meta">
          ${
            ricetta.descrizione
              ? `<div><strong>Descrizione:</strong> ${ricetta.descrizione}</div>`
              : ""
          }
          ${
            ricetta.tempo_medio_minuti
              ? `<div><strong>Tempo medio:</strong> ${ricetta.tempo_medio_minuti} min</div>`
              : ""
          }
        </div>

        ${
          ricetta.foto_url
            ? `<img class="foto" src="${ricetta.foto_url}" alt="Foto ricetta" />`
            : ""
        }

        <h2>Ingredienti</h2>
        <table>
          <thead>
            <tr><th>Ingrediente</th><th>Q.tà</th><th>UM</th></tr>
          </thead>
          <tbody>
            ${
              htmlIngredienti ||
              "<tr><td colspan='3'>Nessun ingrediente</td></tr>"
            }
          </tbody>
        </table>

        ${
          ricetta.note_procedimento
            ? `<h2>Procedimento</h2><p>${ricetta.note_procedimento}</p>`
            : ""
        }

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

// event handlers ricette
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

if (btnNuovaRicetta) {
  btnNuovaRicetta.addEventListener("click", () => {
    resetFormRicetta();
  });
}

if (btnStampaRicetta) {
  btnStampaRicetta.addEventListener("click", () => {
    stampaRicettaCorrente();
  });
}

  // ========= ACQUISTI / FATTURE / MAGAZZINO =========

    // ========= ACQUISTI / FATTURE / MAGAZZINO =========

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

    // 1) se mi hai scritto un codice interno a mano, provo a usarlo
    if (codiceTrim) {
      const { data: existingByCodice, error: errFindCodice } = await supabase
        .from("prodotti")
        .select("id, codice_interno, descrizione, categoria_id, um")
        .eq("codice_interno", codiceTrim)
        .limit(1);

      if (errFindCodice) {
        console.error("Errore ricerca prodotto per codice:", errFindCodice);
        alert(
          "Errore Supabase (ricerca prodotto per codice): " +
            errFindCodice.message
        );
      }

      if (existingByCodice && existingByCodice.length > 0) {
        return existingByCodice[0];
      }
    }

    // 2) categoria
    let categoria = null;
    if (categoriaNome) {
      categoria = await findOrCreateCategoriaByNome(categoriaNome);
      if (!categoria) {
        alert(
          "Attenzione: categoria prodotto non creata/cercata correttamente, creo comunque il prodotto."
        );
      }
    }

    // 3) creo codice interno automatico se non fornito
    let codiceInternoFinale = codiceTrim;
    if (!codiceInternoFinale) {
      codiceInternoFinale = await generaCodiceInternoAutomatico(
        categoriaNome || descTrim || "GEN"
      );
    }

    // 4) controllo se esiste già
    const { data: existingFinal, error: errFindFinal } = await supabase
      .from("prodotti")
      .select("id, codice_interno, descrizione, categoria_id, um")
      .eq("codice_interno", codiceInternoFinale)
      .limit(1);

    if (errFindFinal) {
      console.error("Errore ricerca prodotto finale:", errFindFinal);
      alert(
        "Errore Supabase (ricerca prodotto finale): " +
          errFindFinal.message
      );
    }

    if (existingFinal && existingFinal.length > 0) {
      return existingFinal[0];
    }

    // 5) inserimento nuovo prodotto
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

  // ====== RIGHE FATTURA + TOTALI ======

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
    const btnDel = tr.querySelector(".btn-del-riga");

    const handleChange = () => {
      ricalcolaTotaleRiga(tr);
      ricalcolaTotaliFattura();
    };

    if (qtaInput) qtaInput.addEventListener("input", handleChange);
    if (prezzoInput) prezzoInput.addEventListener("input", handleChange);
    if (ivaInput) ivaInput.addEventListener("input", handleChange);

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
    const totaleCell = tr.querySelector(".fatt-riga-totale");

    const qta = parseNumber(qtaInput?.value || "0");
    const prezzo = parseNumber(prezzoInput?.value || "0");
    const ivaPerc = parseNumber(ivaInput?.value || "0");

    const imponibile = qta * prezzo;
    const iva = imponibile * (ivaPerc / 100);
    const totale = imponibile + iva;

    if (totaleCell) {
      totaleCell.textContent = totale.toFixed(2);
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
      alert("Inserisci il numero fattura");
      return;
    }
    if (!dataDoc) {
      alert("Inserisci la data fattura");
      return;
    }
    if (!fornitoreNome) {
      alert("Inserisci il fornitore");
      return;
    }

    const rows = Array.from(fatturaRigheBody?.querySelectorAll("tr") || []);
    const righeForm = [];
    rows.forEach((tr) => {
      const codiceInput = tr.querySelector(".fatt-riga-codice");
      const descrInput = tr.querySelector(".fatt-riga-descrizione");
      const catInput = tr.querySelector(".fatt-riga-categoria");
      const umInput = tr.querySelector(".fatt-riga-um");
      const qtaInput = tr.querySelector(".fatt-riga-quantita");
      const prezzoInput = tr.querySelector(".fatt-riga-prezzo");
      const ivaInput = tr.querySelector(".fatt-riga-iva");

      const codice = (codiceInput?.value || "").trim();
      const descrizione = (descrInput?.value || "").trim();
      const categoria = (catInput?.value || "").trim();
      const um = (umInput?.value || "").trim();
      const qta = parseNumber(qtaInput?.value || "0");
      const prezzo = parseNumber(prezzoInput?.value || "0");
      let ivaPerc = parseNumber(ivaInput?.value || "0");

      if (!codice && !descrizione) return;
      if (!qta || !prezzo) return;

      if (![4, 10, 22].includes(ivaPerc)) {
        if (!ivaPerc) ivaPerc = 22; // default
      }

      righeForm.push({
        codice,
        descrizione,
        categoria,
        um,
        qta,
        prezzo,
        ivaPerc,
      });
    });

    if (!righeForm.length) {
      alert("Inserisci almeno una riga di fattura valida (q.tà e prezzo > 0)");
      return;
    }

    // calcolo totali
    let impTot = 0;
    let ivaTot = 0;
    let docTot = 0;
    righeForm.forEach((r) => {
      const imponibile = r.qta * r.prezzo;
      const iva = imponibile * (r.ivaPerc / 100);
      const totale = imponibile + iva;
      impTot += imponibile;
      ivaTot += iva;
      docTot += totale;
    });

    // fornitore
    const fornitore = await findOrCreateFornitoreByName(fornitoreNome);
    if (!fornitore) return;

    // testata fattura
    let fatturaData = null;
    if (!currentFatturaId) {
      const { data, error } = await supabase
        .from("fatture_acquisto")
        .insert({
          numero_documento: numero,
          data_documento: dataDoc,
          fornitore_id: fornitore.id,
          imponibile_totale: impTot,
          iva_totale: ivaTot,
          totale_documento: docTot,
          note: note || null,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Errore salvataggio fattura:", error);
        alert("Errore nel salvare la fattura di acquisto: " + error.message);
        return;
      }

      fatturaData = data;
      currentFatturaId = data.id;
    } else {
      const { data, error } = await supabase
        .from("fatture_acquisto")
        .update({
          numero_documento: numero,
          data_documento: dataDoc,
          fornitore_id: fornitore.id,
          imponibile_totale: impTot,
          iva_totale: ivaTot,
          totale_documento: docTot,
          note: note || null,
        })
        .eq("id", currentFatturaId)
        .select("*")
        .single();

      if (error) {
        console.error("Errore aggiornamento fattura:", error);
        alert(
          "Errore nell'aggiornare la fattura di acquisto: " + error.message
        );
        return;
      }

      fatturaData = data;
    }

    // sincronizzo totali sui campi
    if (fatturaImponibileTotaleInput)
      fatturaImponibileTotaleInput.value = impTot.toFixed(2);
    if (fatturaIvaTotaleInput)
      fatturaIvaTotaleInput.value = ivaTot.toFixed(2);
    if (fatturaTotaleDocumentoInput)
      fatturaTotaleDocumentoInput.value = docTot.toFixed(2);

    // cancello righe precedenti fattura
    const { error: delRigheErr } = await supabase
      .from("fatture_acquisto_righe")
      .delete()
      .eq("fattura_id", currentFatturaId);

    if (delRigheErr) {
      console.error("Errore cancellazione righe fattura:", delRigheErr);
      alert(
        "Errore nel cancellare le righe precedenti: " +
          delRigheErr.message
      );
      return;
    }

    // inserisco righe + movimenti magazzino
    const righePayload = [];
    for (const r of righeForm) {
      // categoria
      let categoria = null;
      if (r.categoria) {
        categoria = await findOrCreateCategoriaByNome(r.categoria);
      }

      // prodotto
      const prodotto = await findOrCreateProdotto({
        codice: r.codice,
        descrizione: r.descrizione,
        categoriaNome: r.categoria,
        um: r.um,
      });
      if (!prodotto) {
        console.warn("Prodotto non creato per riga:", r);
        continue;
      }

      const imponibile = r.qta * r.prezzo;
      const iva = imponibile * (r.ivaPerc / 100);
      const totale = imponibile + iva;

      righePayload.push({
        fattura_id: currentFatturaId,
        prodotto_id: prodotto.id,
        codice_prodotto: prodotto.codice_interno,
        categoria_id: categoria
          ? categoria.id
          : prodotto.categoria_id || null,
        descrizione_riga: r.descrizione || prodotto.descrizione,
        um: r.um || prodotto.um || "pz",
        quantita: r.qta,
        prezzo_unitario: r.prezzo,
        sconto_perc: null,
        iva_perc: r.ivaPerc,
        imponibile_riga: imponibile,
        iva_riga: iva,
        totale_riga: totale,
      });
    }

    if (righePayload.length === 0) {
      alert(
        "Nessuna riga valida da salvare dopo la creazione dei prodotti. Controlla i dati."
      );
      return;
    }

    const { data: righeInserite, error: righeError } = await supabase
      .from("fatture_acquisto_righe")
      .insert(righePayload)
      .select("*");

    if (righeError) {
      console.error("Errore salvataggio righe fattura:", righeError);
      alert("Errore nel salvare le righe della fattura: " + righeError.message);
      return;
    }

    // movimenti di magazzino (CARICO)
    const movimentiPayload = (righeInserite || []).map((r) => ({
      prodotto_id: r.prodotto_id,
      data_movimento: fatturaData.data_documento,
      tipo_movimento: "CARICO",
      quantita: r.quantita,
      costo_unitario: r.prezzo_unitario,
      riferimento_tipo: "FATTURA_ACQUISTO",
      riferimento_id: fatturaData.id,
      riferimento_riga_id: r.id,
      note: null,
    }));

    if (movimentiPayload.length > 0) {
      const { error: movErr } = await supabase
        .from("magazzino_movimenti")
        .insert(movimentiPayload);

      if (movErr) {
        console.error("Errore salvataggio movimenti magazzino:", movErr);
        alert(
          "Fattura salvata ma errore nel creare i movimenti di magazzino: " +
            movErr.message
        );
      }
    }

    alert("Fattura salvata con successo e magazzino aggiornato.");
    await caricaFornitoriInCache();
    await caricaCategorieInCache();
    await caricaListaFatture();
  }

  async function caricaListaFatture() {
    if (!fattureListaBody || !supabase) return;

    const { data, error } = await supabase
      .from("fatture_acquisto")
      .select("*")
      .order("data_documento", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Errore caricamento fatture:", error);
      alert("Errore nel caricare l'elenco fatture: " + error.message);
      return;
    }

    fattureListaBody.innerHTML = "";
    (data || []).forEach((f) => {
      const forn = getFornitoreById(f.fornitore_id);
      const nomeForn = forn ? forn.ragione_sociale : "";

      const tr = document.createElement("tr");
      const dataStr = f.data_documento
        ? new Date(f.data_documento).toLocaleDateString("it-IT")
        : "";
      const totDoc = Number(f.totale_documento || 0);

      tr.innerHTML = `
        <td>${dataStr}</td>
        <td>${f.numero_documento || ""}</td>
        <td>${nomeForn}</td>
        <td>${totDoc.toFixed(2)}</td>
        <td>
          <button type="button" class="app-button tiny gray" data-open-fattura="${f.id}">
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
          if (!Number.isNaN(id)) {
            caricaFatturaDettaglio(id);
          }
        });
      });
  }

  async function caricaFatturaDettaglio(fatturaId) {
    if (!supabase) return;

    // testata
    const { data: fattura, error } = await supabase
      .from("fatture_acquisto")
      .select("*")
      .eq("id", fatturaId)
      .single();

    if (error || !fattura) {
      console.error("Errore caricamento fattura:", error);
      alert("Errore nel caricare i dettagli della fattura");
      return;
    }

    currentFatturaId = fattura.id;

    const forn = getFornitoreById(fattura.fornitore_id);
    const nomeForn = forn ? forn.ragione_sociale : "";

    if (fatturaNumeroInput)
      fatturaNumeroInput.value = fattura.numero_documento || "";
    if (fatturaDataInput)
      fatturaDataInput.value = fattura.data_documento || "";
    if (fatturaFornitoreInput) fatturaFornitoreInput.value = nomeForn || "";
    if (fatturaNoteInput) fatturaNoteInput.value = fattura.note || "";
    if (fatturaImponibileTotaleInput)
      fatturaImponibileTotaleInput.value = Number(
        fattura.imponibile_totale || 0
      ).toFixed(2);
    if (fatturaIvaTotaleInput)
      fatturaIvaTotaleInput.value = Number(fattura.iva_totale || 0).toFixed(2);
    if (fatturaTotaleDocumentoInput)
      fatturaTotaleDocumentoInput.value = Number(
        fattura.totale_documento || 0
      ).toFixed(2);

    // righe
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

  async function initAcquistiView() {
    await caricaFornitoriInCache();
    await caricaCategorieInCache();
    resetFatturaForm();
    await caricaListaFatture();
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
  resetFormRicetta();
  await caricaArchivioRicette();
  break;
      case "acquisti":
        await initAcquistiView();
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
      if (loginView) loginView.style.display = "none";
      if (isManagerRole(currentUser.ruolo)) {
        showManagerMenuAndRoute(
          window.location.hash.replace("#", "") || "timbratura"
        );
      } else {
        showHomeDipendente();
      }
    } else {
      showLogin();
    }

    aggiornaUICompenso();
  }

  init();
});
