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
const navPreventivi = document.getElementById('nav-preventivi');
if (navPreventivi) {
  navPreventivi.addEventListener('click', () => {
    showPreventiviView();
  });
}
 // ---------- STATO ----------
let dipendenti = [];
let timbrature = [];
let currentUser = null;
let periodoCorrente = "oggi";

let ricettaCorrenteId = null;
let ricettaFotoCorrenteUrl = null;
let ricetteCache = [];
let ricettaDaAprireId = null; // usata per passare l'id dal Ricettario all'editor

let currentFatturaId = null;
let fornitoriCache = [];
let categorieCache = [];
let magazzinoDati = [];
// ===========================================================
// ========== MAGAZZINO PREPARAZIONI (SOLO LETTURA) ===========
// ===========================================================

// ---------- STATO ----------
let prepProdotti = [];
let prepProdottoSelezionato = null;

// ---------- CARICAMENTO ----------
async function caricaMagazzinoPreparazioni() {
  if (!supabase) return;

  resetPrepView();
  prepProdotti = [];

  const { data: movimenti, error } = await supabase
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

  // 👉 QUI: AGGREGAZIONE DATI
  prepProdotti = aggregaPreparazioni(movimenti);

  console.log("PREP PRODOTTI:", prepProdotti);

  // 👉 QUI: AUTOCOMPLETE (PUNTO GIUSTO)
  initPrepAutocomplete();
}

// ---------- AGGREGAZIONE ----------
function aggregaPreparazioni(movimenti) {
  const map = {};

  (movimenti || []).forEach((m) => {
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

// ---------- AUTOCOMPLETE (VERSIONE FUNZIONANTE) ----------
function initPrepAutocomplete() {
  const input = document.getElementById("prep-search");
  const box = document.getElementById("prep-suggestions");

  if (!input || !box) {
    console.warn("prep-search o prep-suggestions non trovati");
    return;
  }

  // reset visivo
  input.value = "";
  box.innerHTML = "";

  // IMPORTANTISSIMO: niente clone
  input.oninput = null;

  input.oninput = () => {
    const q = input.value.trim().toLowerCase();
    box.innerHTML = "";

    resetPrepView();

    if (!q || prepProdotti.length === 0) return;

    const matches = prepProdotti.filter(p =>
      p.nome_prodotto.toLowerCase().includes(q)
    );

    if (!matches.length) {
      box.innerHTML =
        `<div class="prep-suggestion">Nessun risultato</div>`;
      return;
    }

    matches.slice(0, 8).forEach(p => {
      const div = document.createElement("div");
      div.className = "prep-suggestion";
      div.textContent = p.nome_prodotto;

      div.onclick = () => {
        input.value = p.nome_prodotto;
        box.innerHTML = "";
        renderPrepCard(p);
        renderPrepLotti(p);
      };

      box.appendChild(div);
    });
  };
}

// ---------- RENDER ----------
function renderPrepCard(p) {
  const box = document.getElementById("prep-card-singola");
  if (!box) return;

  box.innerHTML = `
    <div class="prep-card">
      <h3>${p.nome_prodotto}</h3>
      <p>
        Giacenza totale:
        <strong>${p.giacenza_totale.toFixed(2)} ${p.unita_misura}</strong>
      </p>
    </div>
  `;
}

function renderPrepLotti(p) {
  const box = document.getElementById("prep-dettaglio-lotti");
  if (!box) return;

  box.innerHTML = `<h3>📦 Lotti disponibili</h3>`;

  p.lotti.forEach((l) => {
    const stato = statoScadenza(l.data_scadenza);

    box.innerHTML += `
      <div class="prep-lotto">
        <strong>Lotto:</strong> ${l.lotto}<br>
        <strong>Luogo:</strong> ${l.luogo}<br>
        <strong>Scadenza:</strong>
        <span class="${stato.classe}">
          ${formatData(l.data_scadenza)} ${stato.label}
        </span><br>
        <strong>Giacenza:</strong>
        ${l.giacenza.toFixed(2)} ${p.unita_misura}
      </div>
    `;
  });
}

// ---------- UTILS ----------
function statoScadenza(data) {
  const oggi = new Date();
  const d = new Date(data);
  const diff = (d - oggi) / 86400000;

  if (diff < 0)
    return { label: "❌ Scaduto", classe: "prep-warning-exp" };
  if (diff <= 3)
    return { label: "⚠️ Urgente", classe: "prep-warning-urg" };
  if (diff <= 7)
    return { label: "🟡 Attenzione", classe: "prep-warning-att" };
  return { label: "✔ OK", classe: "prep-warning-ok" };
}

function formatData(d) {
  return new Date(d).toLocaleDateString("it-IT");
}

function resetPrepView() {
  prepProdottoSelezionato = null;

  const card = document.getElementById("prep-card-singola");
  const lotti = document.getElementById("prep-dettaglio-lotti");

  if (card) card.innerHTML = "";
  if (lotti) lotti.innerHTML = "";
}

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

// =====================================
//  PREVENTIVI & PRENOTAZIONI
// =====================================

const sb = window.supabaseClient;

// Stato in memoria
let currentPreventivo = null;
let currentPreventivoMenu = [];
let currentPreventivoExtra = [];

// Cache per ricette suggerite
let ricetteSuggestionsCache = [];

// -----------------------------
//  Selettori
// -----------------------------
const viewPreventivi = document.getElementById('view-preventivi');
const preventiviListContainer = document.getElementById('preventivi-list');
const preventivoForm = document.getElementById('preventivo-form');

// campi preventivo
const inputPrevId = document.getElementById('preventivo-id');

const inputClienteId = document.getElementById('preventivo-cliente-id');
const inputClienteNome = document.getElementById('preventivo-cliente-nome');
const inputClienteCognome = document.getElementById('preventivo-cliente-cognome');
const inputClienteTelefono = document.getElementById('preventivo-cliente-telefono');
const inputClienteEmail = document.getElementById('preventivo-cliente-email');
const inputClienteComune = document.getElementById('preventivo-cliente-comune');

const inputPrevTitolo = document.getElementById('preventivo-titolo');          // tipologia evento
const inputPrevTipoServizio = document.getElementById('preventivo-tipo-servizio');
const inputPrevDataEvento = document.getElementById('preventivo-data-evento');
const inputPrevNInvitati = document.getElementById('preventivo-n-invitati');
const inputPrevLocation = document.getElementById('preventivo-location');
const inputPrevNote = document.getElementById('preventivo-note');
const selectPrevStato = document.getElementById('preventivo-stato');
const inputPrevAcconto = document.getElementById('preventivo-acconto');
const inputPrevTotale = document.getElementById('preventivo-totale');
const inputPrevPrezzoPersona = document.getElementById('preventivo-prezzo-persona');
const inputPrevSaldo = document.getElementById('preventivo-saldo');

// 🔥 nuovo: sconto menù %
const selectPrevScontoMenu = document.getElementById('preventivo-sconto-menu');

// Tabelle menu & extra
const menuTableBody = document.getElementById('preventivo-menu-tbody');
const extraTableBody = document.getElementById('preventivo-extra-tbody');
const datalistRicette = document.getElementById('ricette-suggestions');

// Pulsanti
const btnNewPreventivo = document.getElementById('btn-new-preventivo');
const btnSavePreventivo = document.getElementById('btn-save-preventivo');
const btnAddMenuRow = document.getElementById('btn-add-menu-row');
const btnAddExtraRow = document.getElementById('btn-add-extra-row');
const btnPrintPreventivo = document.getElementById('btn-print-preventivo');
const btnEmailPreventivo = document.getElementById('btn-email-preventivo');

// -----------------------------
//  Eventi di base
// -----------------------------

if (btnNewPreventivo) {
  btnNewPreventivo.addEventListener('click', () => {
    openPreventivo(null); // nuovo
  });
}

if (btnSavePreventivo) {
  btnSavePreventivo.addEventListener('click', async (e) => {
    e.preventDefault();
    await savePreventivo();
  });
}

if (btnAddMenuRow) {
  btnAddMenuRow.addEventListener('click', () => {
    addMenuRow();
  });
}

if (btnAddExtraRow) {
  btnAddExtraRow.addEventListener('click', () => {
    addExtraRow();
  });
}

if (btnPrintPreventivo) {
  btnPrintPreventivo.addEventListener('click', () => {
    printCurrentPreventivo();
  });
}

if (btnEmailPreventivo) {
  btnEmailPreventivo.addEventListener('click', () => {
    emailCurrentPreventivoViaMailto();
  });
}

// ricalcolo quando cambiano invitati / acconto
if (inputPrevNInvitati) {
  inputPrevNInvitati.addEventListener('input', () => {
    // quando cambia il numero invitati ricalcolo tutte le righe del menù
    recalcMenuQuantitaDaInvitati();
    recalcPreventivoTotali();
  });
}
if (inputPrevAcconto) {
  inputPrevAcconto.addEventListener('input', () => {
    recalcPreventivoTotali();
  });
}

// 🔥 ricalcolo anche quando cambia lo sconto menù
if (selectPrevScontoMenu) {
  selectPrevScontoMenu.addEventListener('change', () => {
    recalcPreventivoTotali();
  });
}

// -----------------------------
//  Routing (da usare nel tuo navigate)
// -----------------------------
// Chiamare showPreventiviView() quando si vuole aprire la view preventivi.

async function showPreventiviView() {
  if (!viewPreventivi) return;
  // Nasconde tutte le altre view (se non hai già una funzione centrale)
  const allViews = document.querySelectorAll('.view');
  allViews.forEach((v) => (v.style.display = 'none'));
  viewPreventivi.style.display = '';

  await loadPreventiviList();
  resetPreventivoForm();
}

// -----------------------------
//  Lista preventivi
// -----------------------------

async function loadPreventiviList() {
  if (!preventiviListContainer) return;

  preventiviListContainer.innerHTML = '<p class="small-muted">Caricamento preventivi...</p>';

  const { data, error } = await supabase
    .from('preventivi')
    .select(`
      id,
      titolo_evento,
      data_evento,
      n_invitati,
      stato,
      totale,
      contatti:cliente_id (
        id,
        nome,
        cognome
      )
    `)
    .order('data_evento', { ascending: true });

  if (error) {
    console.error('Errore caricamento preventivi:', error);
    preventiviListContainer.innerHTML =
      '<p class="text-error">Errore nel caricamento dei preventivi.</p>';
    return;
  }

  renderPreventiviList(data || []);
}

function renderPreventiviList(preventivi) {
  if (!preventiviListContainer) return;

  if (!preventivi.length) {
    preventiviListContainer.innerHTML =
      '<p class="small-muted">Nessun preventivo presente.</p>';
    return;
  }

  const html = preventivi
    .map((p) => {
      const clienteNome = p.contatti
        ? `${p.contatti.nome || ''} ${p.contatti.cognome || ''}`.trim()
        : 'Senza cliente';
      const dataLabel = p.data_evento
        ? new Date(p.data_evento).toLocaleDateString()
        : '—';
      const totaleLabel = Number(p.totale || 0)
        .toFixed(2)
        .replace('.', ',');

      return `
        <div class="preventivo-list-item" data-id="${p.id}">
          <div class="preventivo-list-main">
            <span class="preventivo-data">${dataLabel}</span>
            <span class="preventivo-titolo">${p.titolo_evento || '(Senza tipologia)'}</span>
          </div>
          <div class="preventivo-list-sub">
            <span class="preventivo-cliente">${clienteNome}</span>
            <span class="preventivo-totale">€ ${totaleLabel}</span>
            <span class="preventivo-stato badge stato-${p.stato}">${p.stato}</span>
          </div>
        </div>
      `;
    })
    .join('');

  preventiviListContainer.innerHTML = html;

  preventiviListContainer.querySelectorAll('.preventivo-list-item').forEach((el) => {
    el.addEventListener('click', () => {
      const id = Number(el.getAttribute('data-id'));
      openPreventivo(id);
    });
  });
}

// -----------------------------
//  Apertura / reset / riempimento form
// -----------------------------

function resetPreventivoForm() {
  if (!preventivoForm) return;
  preventivoForm.reset();

  if (inputPrevId) inputPrevId.value = '';
  if (inputClienteId) inputClienteId.value = '';

  currentPreventivo = null;
  currentPreventivoMenu = [];
  currentPreventivoExtra = [];

  if (menuTableBody) menuTableBody.innerHTML = '';
  if (extraTableBody) extraTableBody.innerHTML = '';

  if (inputPrevTotale) inputPrevTotale.value = '';
  if (inputPrevPrezzoPersona) inputPrevPrezzoPersona.value = '';
  if (inputPrevSaldo) inputPrevSaldo.value = '';

  // 🔥 reset sconto menù
  if (selectPrevScontoMenu) selectPrevScontoMenu.value = '0';
}

async function openPreventivo(preventivoId) {
  resetPreventivoForm();

  if (!preventivoId) {
    // nuovo
    currentPreventivo = null;
    currentPreventivoMenu = [];
    currentPreventivoExtra = [];
    recalcPreventivoTotali();
    return;
  }

  const { data: prevData, error: prevError } = await supabase
    .from('preventivi')
    .select(
      `
      *,
      contatti:cliente_id (
        id,
        nome,
        cognome,
        email,
        telefono,
        note
      )
    `
    )
    .eq('id', preventivoId)
    .single();

  if (prevError || !prevData) {
    console.error('Errore apertura preventivo:', prevError);
    alert('Errore nel caricamento del preventivo.');
    return;
  }

  currentPreventivo = prevData;

  // righe menù
  const { data: menuData, error: menuError } = await supabase
    .from('preventivi_ricette')
    .select('*')
    .eq('preventivo_id', preventivoId)
    .order('id', { ascending: true });

  if (menuError) {
    console.error('Errore caricamento menù:', menuError);
  }
  currentPreventivoMenu = menuData || [];

  // righe extra
  const { data: extraData, error: extraError } = await supabase
    .from('preventivi_extra')
    .select('*')
    .eq('preventivo_id', preventivoId)
    .order('id', { ascending: true });

  if (extraError) {
    console.error('Errore caricamento extra:', extraError);
  }
  currentPreventivoExtra = extraData || [];

  fillPreventivoFormFromData(prevData);
  renderMenuRows();
  renderExtraRows();
  recalcPreventivoTotali();
}

function fillPreventivoFormFromData(p) {
  if (inputPrevId) inputPrevId.value = p.id;

  // Cliente
  if (inputClienteId) inputClienteId.value = p.cliente_id || '';
  if (inputClienteNome) inputClienteNome.value = p.contatti?.nome || '';
  if (inputClienteCognome) inputClienteCognome.value = p.contatti?.cognome || '';
  if (inputClienteTelefono) inputClienteTelefono.value = p.contatti?.telefono || '';
  if (inputClienteEmail) inputClienteEmail.value = p.contatti?.email || '';
  if (inputClienteComune) inputClienteComune.value = p.contatti?.note || '';

  // Evento
  if (inputPrevTitolo) inputPrevTitolo.value = p.titolo_evento || '';
  if (inputPrevTipoServizio) inputPrevTipoServizio.value = p.tipo_servizio || '';
  if (inputPrevDataEvento) inputPrevDataEvento.value = p.data_evento || '';
  if (inputPrevNInvitati) inputPrevNInvitati.value = p.n_invitati || '';
  if (inputPrevLocation) inputPrevLocation.value = p.location || '';
  if (inputPrevNote) inputPrevNote.value = p.note || '';
  if (selectPrevStato) selectPrevStato.value = p.stato || 'bozza';
  if (inputPrevAcconto)
    inputPrevAcconto.value = Number(p.acconto || 0).toFixed(2);

  // 🔥 sconto menù da DB
  if (selectPrevScontoMenu) {
    const scontoVal = p.sconto_menu_perc != null ? p.sconto_menu_perc : 0;
    // se non esiste tra le opzioni, metto 0
    const sVal = String(scontoVal);
    const optionExists = Array.from(selectPrevScontoMenu.options).some(
      (opt) => opt.value === sVal
    );
    selectPrevScontoMenu.value = optionExists ? sVal : '0';
  }
}

// -----------------------------
//  Menù (preventivi_ricette)
// -----------------------------

function renderMenuRows() {
  if (!menuTableBody) return;
  menuTableBody.innerHTML = '';

  currentPreventivoMenu.forEach((row, index) => {
    const cu = Number(row.costo_unitario || 0);
    const nInv = inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0;
    const quantita = nInv || Number(row.quantita || 0);
    const ct = quantita * cu;

    row.quantita = quantita;
    row.costo_totale = ct;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input
          type="text"
          class="input-pill menu-nome"
          list="ricette-suggestions"
          value="${row.nome_piatto || ''}"
          placeholder="Es. Flan di patate"
        />
      </td>
      <td class="col-prezzo-portata menu-costo-persona">
        € ${cu.toFixed(2)}
      </td>
      <td class="col-prezzo-portata menu-totale-col">
        € ${ct.toFixed(2)}
      </td>
      <td>
        <button type="button" class="btn-icon btn-menu-remove" data-index="${index}">🗑</button>
      </td>
    `;
    menuTableBody.appendChild(tr);

    const inputNome = tr.querySelector('.menu-nome');
    const btnRemove = tr.querySelector('.btn-menu-remove');

    if (inputNome) {
      // suggerimenti ricette
      inputNome.addEventListener('input', () => {
        const term = inputNome.value;
        currentPreventivoMenu[index].nome_piatto = term;
        fetchRicetteSuggestions(term);
      });

      inputNome.addEventListener('blur', () => {
        updateMenuRowFromRicettaNome(index);
      });
    }

    if (btnRemove) {
      btnRemove.addEventListener('click', () => {
        currentPreventivoMenu.splice(index, 1);
        renderMenuRows();
        recalcPreventivoTotali();
      });
    }
  });

  recalcPreventivoTotali();
}

function addMenuRow() {
  currentPreventivoMenu.push({
    id: null,
    ricetta_id: null,
    nome_piatto: '',
    quantita: inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0,
    costo_unitario: 0,
    costo_totale: 0,
    ricetta_completa: false
  });
  renderMenuRows();
}

// ricalcolo quantita menù da n_invitati
function recalcMenuQuantitaDaInvitati() {
  const nInv = inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0;
  currentPreventivoMenu.forEach((row) => {
    row.quantita = nInv;
    row.costo_totale = nInv * Number(row.costo_unitario || 0);
  });
  renderMenuRows();
}

// suggerimenti ricette (datalist)
async function fetchRicetteSuggestions(term) {
  if (!datalistRicette) return;
  const t = (term || '').trim();
  if (t.length < 2) return;

  const { data, error } = await supabase
    .from('ricette')
    .select('id, nome')
    .ilike('nome', `%${t}%`)
    .limit(10);

  if (error) {
    console.error('Errore suggerimenti ricette:', error);
    return;
  }

  ricetteSuggestionsCache = data || [];

  datalistRicette.innerHTML = (data || [])
    .map((r) => `<option value="${r.nome}"></option>`)
    .join('');
}

// collega nome portata a ricetta (o la crea)
async function updateMenuRowFromRicettaNome(index) {
  const row = currentPreventivoMenu[index];
  if (!row) return;
  const nome = (row.nome_piatto || '').trim();
  if (!nome) return;

  // prova a trovare in ricette
  const { data: ricetta, error } = await supabase
    .from('ricette')
    .select('id, nome, costo_porzione, flag_da_completare')
    .ilike('nome', nome)
    .maybeSingle();

  let ricettaId = null;
  let costoPorzione = 0;
  let ricettaCompleta = false;

  if (!error && ricetta) {
    ricettaId = ricetta.id;
    costoPorzione = Number(ricetta.costo_porzione || 0);
    ricettaCompleta = !ricetta.flag_da_completare;
  } else {
    // se non esiste, la creo "da completare"
    const { data: nuovaRicetta, error: insertError } = await supabase
      .from('ricette')
      .insert({
        nome: nome,
        descrizione: 'Da completare',
        flag_da_completare: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Errore creazione ricetta da preventivo:', insertError);
    } else if (nuovaRicetta) {
      ricettaId = nuovaRicetta.id;
      costoPorzione = 0;
      ricettaCompleta = false;
    }
  }

  const nInv = inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0;
  const quantita = nInv;
  const costoTotale = quantita * costoPorzione;

  row.ricetta_id = ricettaId;
  row.costo_unitario = costoPorzione;
  row.quantita = quantita;
  row.costo_totale = costoTotale;
  row.ricetta_completa = ricettaCompleta;

  renderMenuRows();
}

// -----------------------------
//  Extra (preventivi_extra)
// -----------------------------

function renderExtraRows() {
  if (!extraTableBody) return;
  extraTableBody.innerHTML = '';

  currentPreventivoExtra.forEach((row, index) => {
    const q = Number(row.quantita || 0);
    const pu = Number(row.prezzo_unitario || 0);
    const pt = q * pu;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <input type="text" class="input-pill extra-desc" value="${row.descrizione || ''}">
      </td>
      <td>
        <input type="number" min="0" step="1" class="input-pill extra-quantita" value="${q}">
      </td>
      <td>
        <input type="number" min="0" step="0.01" class="input-pill extra-prezzo-unit" value="${pu}">
      </td>
      <td class="extra-totale-col">
        € ${pt.toFixed(2)}
      </td>
      <td>
        <button type="button" class="btn-icon btn-extra-remove" data-index="${index}">🗑</button>
      </td>
    `;
    extraTableBody.appendChild(tr);

    const inputDesc = tr.querySelector('.extra-desc');
    const inputQ = tr.querySelector('.extra-quantita');
    const inputPU = tr.querySelector('.extra-prezzo-unit');
    const btnRemove = tr.querySelector('.btn-extra-remove');

    if (inputDesc) {
      inputDesc.addEventListener('input', () => {
        currentPreventivoExtra[index].descrizione = inputDesc.value;
      });
    }

    const recalcRow = () => {
      const nq = Number(inputQ.value || 0);
      const npu = Number(inputPU.value || 0);
      currentPreventivoExtra[index].quantita = nq;
      currentPreventivoExtra[index].prezzo_unitario = npu;
      const pt2 = nq * npu;
      const col = tr.querySelector('.extra-totale-col');
      if (col) col.textContent = `€ ${pt2.toFixed(2)}`;
      recalcPreventivoTotali();
    };

    if (inputQ) inputQ.addEventListener('input', recalcRow);
    if (inputPU) inputPU.addEventListener('input', recalcRow);

    if (btnRemove) {
      btnRemove.addEventListener('click', () => {
        currentPreventivoExtra.splice(index, 1);
        renderExtraRows();
        recalcPreventivoTotali();
      });
    }
  });

  recalcPreventivoTotali();
}

function addExtraRow() {
  currentPreventivoExtra.push({
    id: null,
    descrizione: '',
    quantita: 1,
    prezzo_unitario: 0
  });
  renderExtraRows();
}

// -----------------------------
//  Totali preventivo
// -----------------------------

function recalcPreventivoTotali() {
  // totale lordo menù (prima degli sconti)
  const totaleMenuLordo = currentPreventivoMenu.reduce((sum, r) => {
    return sum + Number(r.costo_totale || 0);
  }, 0);

  const totaleExtra = currentPreventivoExtra.reduce((sum, r) => {
    const q = Number(r.quantita || 0);
    const pu = Number(r.prezzo_unitario || 0);
    return sum + q * pu;
  }, 0);

  // 🔥 sconto solo sul menù, NON sugli extra
  const scontoMenuPerc = selectPrevScontoMenu
    ? Number(selectPrevScontoMenu.value || 0)
    : 0;
  const fattoreScontoMenu = 1 - scontoMenuPerc / 100;
  const totaleMenuNetto = totaleMenuLordo * fattoreScontoMenu;

  const totale = totaleMenuNetto + totaleExtra;

  const nInv = inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0;
  const acconto = inputPrevAcconto ? Number(inputPrevAcconto.value || 0) : 0;

  const prezzoPersona = nInv > 0 ? totale / nInv : 0;
  const saldo = totale - acconto;

  if (inputPrevTotale) inputPrevTotale.value = totale.toFixed(2);
  if (inputPrevPrezzoPersona)
    inputPrevPrezzoPersona.value = prezzoPersona.toFixed(2);
  if (inputPrevSaldo) inputPrevSaldo.value = saldo.toFixed(2);
}

// -----------------------------
//  Salvataggio preventivo + cliente + righe
// -----------------------------

async function savePreventivo() {
  if (!preventivoForm) return;

  // 1. cliente
  const clienteId = await upsertPreventivoCliente();
  if (!clienteId) {
    alert('Compila almeno nome e cognome del cliente.');
    return;
  }

  const payloadPrev = {
    cliente_id: clienteId,
    titolo_evento: inputPrevTitolo ? inputPrevTitolo.value || null : null,
    tipo_servizio: inputPrevTipoServizio ? inputPrevTipoServizio.value || null : null,
    data_evento: inputPrevDataEvento ? inputPrevDataEvento.value || null : null,
    n_invitati: inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0,
    location: inputPrevLocation ? inputPrevLocation.value || null : null,
    note: inputPrevNote ? inputPrevNote.value || null : null,
    stato: selectPrevStato ? selectPrevStato.value || 'bozza' : 'bozza',
    acconto: inputPrevAcconto ? Number(inputPrevAcconto.value || 0) : 0,
    totale: inputPrevTotale ? Number(inputPrevTotale.value || 0) : 0,
    // 🔥 salviamo anche lo sconto menù
    sconto_menu_perc: selectPrevScontoMenu
      ? Number(selectPrevScontoMenu.value || 0)
      : 0
  };

  const existingId = inputPrevId ? Number(inputPrevId.value || 0) : 0;
  let preventivoId = existingId;

  if (!existingId) {
    const { data: insertData, error: insertError } = await supabase
      .from('preventivi')
      .insert(payloadPrev)
      .select()
      .single();

    if (insertError) {
      console.error('Errore creazione preventivo:', insertError);
      alert('Errore durante il salvataggio del preventivo.');
      return;
    }

    preventivoId = insertData.id;
    if (inputPrevId) inputPrevId.value = preventivoId;
  } else {
    const { error: updateError } = await supabase
      .from('preventivi')
      .update(payloadPrev)
      .eq('id', existingId);

    if (updateError) {
      console.error('Errore aggiornamento preventivo:', updateError);
      alert('Errore durante il salvataggio del preventivo.');
      return;
    }
  }

  // righe
  await savePreventivoRighe(preventivoId);

  // prenotazione se accettato
  if (payloadPrev.stato === 'accettato') {
    await ensurePrenotazioneForPreventivo(preventivoId, payloadPrev);
  }

  await loadPreventiviList();
  alert('Preventivo salvato correttamente.');
}

async function upsertPreventivoCliente() {
  const idEsistente = inputClienteId ? Number(inputClienteId.value || 0) : 0;

  const nome = inputClienteNome ? (inputClienteNome.value || '').trim() : '';
  const cognome = inputClienteCognome
    ? (inputClienteCognome.value || '').trim()
    : '';
  const telefono = inputClienteTelefono
    ? (inputClienteTelefono.value || '').trim()
    : '';
  const email = inputClienteEmail ? (inputClienteEmail.value || '').trim() : '';
  const comune = inputClienteComune
    ? (inputClienteComune.value || '').trim()
    : '';

  if (!nome && !cognome) {
    return null;
  }

  const payloadContatto = {
    nome,
    cognome,
    telefono: telefono || null,
    email: email || null,
    note: comune || null
  };

  if (!idEsistente) {
    const { data, error } = await supabase
      .from('contatti')
      .insert(payloadContatto)
      .select()
      .single();

    if (error) {
      console.error('Errore creazione contatto:', error);
      alert('Errore nel salvataggio del cliente.');
      return null;
    }

    if (inputClienteId) inputClienteId.value = data.id;
    return data.id;
  } else {
    const { error } = await supabase
      .from('contatti')
      .update(payloadContatto)
      .eq('id', idEsistente);

    if (error) {
      console.error('Errore aggiornamento contatto:', error);
      alert('Errore nell\'aggiornamento del cliente.');
      return null;
    }
    return idEsistente;
  }
}

async function savePreventivoRighe(preventivoId) {
  // cancello e reinserisco per semplicità
  await supabase.from('preventivi_ricette').delete().eq('preventivo_id', preventivoId);
  await supabase.from('preventivi_extra').delete().eq('preventivo_id', preventivoId);

  const menuPayload = currentPreventivoMenu
    .filter((r) => (r.nome_piatto || '').trim() !== '')
    .map((r) => ({
      preventivo_id: preventivoId,
      ricetta_id: r.ricetta_id || null,
      nome_piatto: r.nome_piatto,
      quantita: Number(r.quantita || 0),
      costo_unitario: Number(r.costo_unitario || 0),
      costo_totale: Number(r.costo_totale || 0),
      ricetta_completa: !!r.ricetta_completa
    }));

  if (menuPayload.length) {
    const { error: menuErr } = await supabase
      .from('preventivi_ricette')
      .insert(menuPayload);
    if (menuErr) {
      console.error('Errore inserimento righe menù:', menuErr);
      alert('Errore durante il salvataggio del menù.');
    }
  }

  const extraPayload = currentPreventivoExtra
    .filter((r) => (r.descrizione || '').trim() !== '')
    .map((r) => ({
      preventivo_id: preventivoId,
      descrizione: r.descrizione,
      quantita: Number(r.quantita || 0),
      prezzo_unitario: Number(r.prezzo_unitario || 0)
    }));

  if (extraPayload.length) {
    const { error: extraErr } = await supabase
      .from('preventivi_extra')
      .insert(extraPayload);
    if (extraErr) {
      console.error('Errore inserimento righe extra:', extraErr);
      alert('Errore durante il salvataggio dei servizi extra.');
    }
  }
}

// -----------------------------
//  Prenotazione collegata
// -----------------------------

async function ensurePrenotazioneForPreventivo(preventivoId, payloadPrev) {
  const { data: prenotData, error } = await supabase
    .from('prenotazioni')
    .select('*')
    .eq('preventivo_id', preventivoId)
    .maybeSingle();

  if (error) {
    console.error('Errore verifica prenotazione:', error);
    return;
  }

  const saldo = payloadPrev.totale - payloadPrev.acconto;

  if (!prenotData) {
    const { error: insertError } = await supabase.from('prenotazioni').insert({
      preventivo_id: preventivoId,
      cliente_id: payloadPrev.cliente_id,
      data_evento: payloadPrev.data_evento,
      acconto: payloadPrev.acconto,
      saldo_residuo: saldo
    });
    if (insertError) {
      console.error('Errore creazione prenotazione:', insertError);
    }
  } else {
    const { error: updateError } = await supabase
      .from('prenotazioni')
      .update({
        data_evento: payloadPrev.data_evento,
        acconto: payloadPrev.acconto,
        saldo_residuo: saldo
      })
      .eq('id', prenotData.id);

    if (updateError) {
      console.error('Errore aggiornamento prenotazione:', updateError);
    }
  }
}

// -----------------------------
//  Stampa / PDF (solo front-end)
// -----------------------------

function printCurrentPreventivo() {
  const id = inputPrevId ? Number(inputPrevId.value || 0) : 0;
  if (!id) {
    alert('Salva il preventivo prima di stamparlo.');
    return;
  }

  const clienteNome = `${inputClienteNome?.value || ''} ${inputClienteCognome?.value || ''}`.trim();
  const clienteComune = inputClienteComune?.value || '';
  const dataEvento = inputPrevDataEvento?.value || '';
  const tipologia = inputPrevTitolo?.value || '';
  const nInv = inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0;
  const totale = inputPrevTotale ? inputPrevTotale.value : '0.00';
  const prezzoPersona = inputPrevPrezzoPersona
    ? inputPrevPrezzoPersona.value
    : '0.00';
  const acconto = inputPrevAcconto ? inputPrevAcconto.value : '0.00';
  const saldo = inputPrevSaldo ? inputPrevSaldo.value : '0.00';

  // testo menù (solo nomi, niente prezzi)
  const menuElenco = currentPreventivoMenu
    .map((r) => `- ${r.nome_piatto || ''}`)
    .filter((s) => s.trim() !== '-')
    .join('<br>');

  const extraElenco = currentPreventivoExtra
    .map(
      (r) =>
        `${r.descrizione || ''} (x${r.quantita || 0})`
    )
    .filter((s) => s.trim() !== '')
    .join('<br>');

  const oggi = new Date().toLocaleDateString();

  const win = window.open('', '_blank');
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <title>Preventivo ${id}</title>
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; font-size: 14px; }
        h1, h2, h3 { margin: 4px 0; }
        .header { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
        .logo { width:80px; height:80px; border-radius:8px; overflow:hidden; }
        .logo img { width:100%; height:100%; object-fit:contain; }
        .section { margin-top:12px; }
        .section-title { font-weight:bold; margin-bottom:4px; }
        .totali { margin-top:12px; }
        .totali table { border-collapse:collapse; width:100%; max-width:360px; }
        .totali th, .totali td { border:1px solid #ddd; padding:4px 6px; text-align:right; }
        .totali th { background:#f3f4f6; text-align:left; }
        .note-validita { margin-top:16px; font-size:12px; color:#4b5563; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <img src="Logo Gestionale Antonio.png" alt="Logo" />
        </div>
        <div>
          <h2>Preventivo evento ${tipologia || ''}</h2>
          <div>Data emissione: ${oggi}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Cliente</div>
        <div>${clienteNome || '-'}</div>
        <div>${clienteComune || ''}</div>
        <div>${clienteTelefono || ''}</div>
        <div>${inputClienteEmail?.value || ''}</div>
      </div>

      <div class="section">
        <div class="section-title">Evento</div>
        <div>Tipologia: ${tipologia || '-'}</div>
        <div>Data evento: ${dataEvento || '-'}</div>
        <div>Numero invitati: ${nInv}</div>
        <div>Location: ${inputPrevLocation?.value || ''}</div>
      </div>

      <div class="section">
        <div class="section-title">Menù proposto</div>
        <div>${menuElenco || '—'}</div>
      </div>

      <div class="section">
        <div class="section-title">Servizi extra</div>
        <div>${extraElenco || '—'}</div>
      </div>

      <div class="section totali">
        <table>
          <tr>
            <th>Totale complessivo</th>
            <td>€ ${Number(totale || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <th>Prezzo per persona</th>
            <td>€ ${Number(prezzoPersona || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <th>Acconto</th>
            <td>€ ${Number(acconto || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <th>Saldo residuo</th>
            <td>€ ${Number(saldo || 0).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div class="note-validita">
        Il presente preventivo è valido 15 giorni dalla data di emissione.
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);

  win.document.close();
}

// -----------------------------
//  Invio email via mailto
// -----------------------------

function emailCurrentPreventivoViaMailto() {
  const clienteEmail = inputClienteEmail ? (inputClienteEmail.value || '').trim() : '';
  if (!clienteEmail) {
    alert('Inserisci l\'email del cliente prima di inviare il preventivo.');
    return;
  }

  const clienteNome = `${inputClienteNome?.value || ''} ${inputClienteCognome?.value || ''}`.trim();
  const tipologia = inputPrevTitolo?.value || '';
  const dataEvento = inputPrevDataEvento?.value || '';
  const nInv = inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0;
  const totale = inputPrevTotale ? inputPrevTotale.value : '0.00';
  const prezzoPersona = inputPrevPrezzoPersona
    ? inputPrevPrezzoPersona.value
    : '0.00';
  const acconto = inputPrevAcconto ? inputPrevAcconto.value : '0.00';
  const saldo = inputPrevSaldo ? inputPrevSaldo.value : '0.00';

  const oggi = new Date().toLocaleDateString();

  const menuElenco = currentPreventivoMenu
    .map((r) => `- ${r.nome_piatto || ''}`)
    .filter((s) => s.trim() !== '-')
    .join('\n');

  const extraElenco = currentPreventivoExtra
    .map(
      (r) =>
        `- ${r.descrizione || ''} (x${r.quantita || 0})`
    )
    .filter((s) => s.trim() !== '-')
    .join('\n');

  const subject = `Preventivo ${tipologia || ''} - ${dataEvento || ''}`;

  const body =
    `Gentile ${clienteNome || ''},\n\n` +
    `in allegato/di seguito trova il preventivo per il suo evento.\n\n` +
    `Data emissione: ${oggi}\n` +
    `Tipologia evento: ${tipologia || '-'}\n` +
    `Data evento: ${dataEvento || '-'}\n` +
    `Numero invitati: ${nInv}\n\n` +
    `Menù proposto:\n${menuElenco || '-'}\n\n` +
    `Servizi extra:\n${extraElenco || '-'}\n\n` +
    `Totale complessivo: € ${Number(totale || 0).toFixed(2)}\n` +
    `Prezzo per persona: € ${Number(prezzoPersona || 0).toFixed(2)}\n` +
    `Acconto: € ${Number(acconto || 0).toFixed(2)}\n` +
    `Saldo residuo: € ${Number(saldo || 0).toFixed(2)}\n\n` +
    `Il presente preventivo è valido 15 giorni dalla data di emissione.\n\n` +
    `Cordiali saluti,\n` +
    `Il tuo ristorante`;

  const mailtoLink =
    `mailto:${encodeURIComponent(clienteEmail)}?` +
    `subject=${encodeURIComponent(subject)}&` +
    `body=${encodeURIComponent(body)}`;

  window.location.href = mailtoLink;
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

    if (ricettaTipoSelect) ricettaTipoSelect.value = "piatto";

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

  // ========= RICETTE: SALVATAGGIO BASE =========
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

    const payload = {
      id: id || undefined,
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

  // ========= RICETTE: UPLOAD FOTO =========
  async function uploadFotoRicettaSePresente() {
    try {
      if (!supabase) return ricettaFotoCorrenteUrl;
      if (
        !ricettaFotoInput ||
        !ricettaFotoInput.files ||
        ricettaFotoInput.files.length === 0
      ) {
        return ricettaFotoCorrenteUrl || null;
      }

      const file = ricettaFotoInput.files[0];
      if (!file) return ricettaFotoCorrenteUrl || null;

      const estensione = file.name.includes(".")
        ? file.name.split(".").pop().toLowerCase()
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
    } catch (err) {
      console.error("Eccezione upload foto ricetta:", err);
      return ricettaFotoCorrenteUrl || null;
    }
  }

  // ========= RICETTE: CARICA UNA RICETTA NEL FORM (PER MODIFICA) =========
  async function caricaRicettaInForm(ricettaId) {
    if (!supabase || !ricettaNomeInput) return;

    const { data: ricetta, error: errRic } = await supabase
      .from("ricette")
      .select(
        `
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
      `
      )
      .eq("id", ricettaId)
      .single();

    if (errRic) {
      console.error("Errore caricamento ricetta:", errRic);
      alert("Errore nel caricare la ricetta");
      return;
    }

    ricettaCorrenteId = ricetta.id;
    ricettaFotoCorrenteUrl = ricetta.foto_url || null;

    ricettaNomeInput.value = ricetta.nome || "";
    if (ricettaDescrizioneInput)
      ricettaDescrizioneInput.value = ricetta.descrizione || "";
    if (ricettaNoteInput)
      ricettaNoteInput.value = ricetta.note_procedimento || "";

    if (ricettaPezziBaseInput)
      ricettaPezziBaseInput.value =
        ricetta.pezzi_base != null ? ricetta.pezzi_base : "";

    if (ricettaFormato1LabelInput)
      ricettaFormato1LabelInput.value = ricetta.formato1_label || "Ristorante";
    if (ricettaFormato1PercInput)
      ricettaFormato1PercInput.value =
        ricetta.formato1_percent != null ? ricetta.formato1_percent : 100;

    if (ricettaFormato2LabelInput)
      ricettaFormato2LabelInput.value = ricetta.formato2_label || "Buffet";
    if (ricettaFormato2PercInput)
      ricettaFormato2PercInput.value =
        ricetta.formato2_percent != null ? ricetta.formato2_percent : 25;

    const { data: ingredienti, error: errIng } = await supabase
      .from("ricetta_ingredienti")
      .select("nome_prodotto, quantita, unita_misura")
      .eq("ricetta_id", ricettaId);

    if (errIng) {
      console.error("Errore caricamento ingredienti ricetta:", errIng);
      alert("Errore nel caricare gli ingredienti della ricetta");
      return;
    }

    if (ricettaIngredientiContainer) {
      ricettaIngredientiContainer.innerHTML = "";
      if (ingredienti && ingredienti.length) {
        ingredienti.forEach((ing) => {
          creaRigaIngrediente(ing);
        });
      } else {
        creaRigaIngrediente();
      }
    }

    aggiornaResaRicetta();
  }

 // ========= RICETTE: CAMBIO NOME RICETTA (AUTOCOMPILAZIONE) =========
// Quando cambia il campo "Nome ricetta" nell'editor:
// se trova una ricetta esistente con quel nome, la carica nel form.
async function handleRicettaNomeChange() {
  if (!supabase || !ricettaNomeInput) return;

  const nome = (ricettaNomeInput.value || "").trim();
  if (!nome) return;

  // cerco una ricetta con quel nome (case-insensitive)
  const { data: ricetta, error } = await supabase
    .from("ricette")
    .select("id, nome")
    .ilike("nome", nome)
    .maybeSingle();

  if (error) {
    console.error("Errore ricerca ricetta per nome:", error);
    return;
  }

  if (ricetta && ricetta.id) {
    // se esiste, carico tutta la ricetta nel form (descrizione, rese, ingredienti...)
    await caricaRicettaInForm(ricetta.id);
  } else {
    // nome nuovo → nuova ricetta
    ricettaCorrenteId = null;
    // NON azzero il form per non perdere eventuali dati già scritti
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
// ========== RICETTARIO - SOLO LETTURA (VIEWER) =============
// ===========================================================
const ricetteSearchInput = document.getElementById("ricette-search");
const ricetteListaViewer = document.getElementById("ricette-lista-viewer");

// datalist globale definito in index.html
let ricetteSuggestionsList = document.getElementById("ricette-suggestions");

// collega il campo di ricerca al datalist globale
if (ricetteSearchInput && ricetteSuggestionsList) {
  ricetteSearchInput.setAttribute("list", "ricette-suggestions");
}

// aggiorna le opzioni del datalist con i nomi delle ricette
function aggiornaRicetteSuggestions() {
  if (!ricetteSuggestionsList || !Array.isArray(ricetteCache)) return;

  ricetteSuggestionsList.innerHTML = "";

  ricetteCache.forEach((r) => {
    if (!r.nome) return;
    const opt = document.createElement("option");
    opt.value = r.nome;
    ricetteSuggestionsList.appendChild(opt);
  });
}

// carica ricette da Supabase (usato da viewer E da produzione)
async function caricaRicetteDaSupabase() {
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
    .order("nome", { ascending: true });

  if (error) {
    console.error("Errore caricamento ricette:", error);
    alert("Errore nel caricare le ricette");
    return;
  }

  ricetteCache = data || [];

  // popola il datalist globale
  aggiornaRicetteSuggestions();

  // aggiorna la vista ricettario (se sono nel viewer)
  applicaFiltroRicettario();
}

// carica ingredienti per una ricetta (solo lettura, viewer)
async function caricaIngredientiRicettaViewer(ricettaId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ricetta_ingredienti")
    .select("nome_prodotto, quantita, unita_misura")
    .eq("ricetta_id", ricettaId)
    .order("id", { ascending: true });

  if (error) {
    console.error("Errore caricamento ingredienti ricetta (viewer):", error);
    return [];
  }

  return data || [];
}

// render delle card ricette nel ricettario
function renderRicetteViewer(lista, filtroTesto) {
  if (!ricetteListaViewer) return;

  const container = ricetteListaViewer;
  container.innerHTML = "";

  // Nessuna ricetta da mostrare
  if (!lista.length) {
    if (filtroTesto) {
      container.innerHTML =
        `<p>Nessuna ricetta trovata per "<strong>${filtroTesto}</strong>".</p>`;
    } else {
      container.innerHTML =
        `<p>Digita il nome della ricetta nella casella sopra.</p>`;
    }
    return;
  }

  lista.forEach((r) => {
    const card = document.createElement("div");
    card.className = "timbratura-intro-card";
    card.style.cursor = "pointer";

    const base = r.pezzi_base || 0;
    const f1Perc = r.formato1_percent || 100;
    const f2Perc = r.formato2_percent || 0;

    const pezzi1 = base && f1Perc ? base * (100 / f1Perc) : null;
    const pezzi2 = base && f2Perc ? base * (100 / f2Perc) : null;

    card.innerHTML = `
      <h3 style="margin:0 0 4px">${r.nome}</h3>

      <p style="margin:0 0 6px; font-size:13px; color:#4b5563;">
        ${r.descrizione || ""}
      </p>

      ${
        base
          ? `
          <div style="font-size:12px; margin-bottom:4px;">
            <strong>Quantità base:</strong> ${base} pezzi equivalenti
          </div>
          <div style="display:flex; gap:8px; font-size:12px; flex-wrap:wrap;">
            <span><strong>${r.formato1_label || "Formato 1"}:</strong>
              ${pezzi1 ? pezzi1.toFixed(1) : "-"} pz
            </span>
            ${
              f2Perc
                ? `<span><strong>${r.formato2_label || "Formato 2"}:</strong>
                    ${pezzi2 ? pezzi2.toFixed(1) : "-"} pz
                  </span>`
                : ""
            }
          </div>
        `
          : ""
      }

      ${
        r.note_procedimento
          ? `
        <p style="margin:6px 0 0; font-size:12px; color:#6b7280;">
          <strong>Note:</strong> ${r.note_procedimento}
        </p>`
          : ""
      }
    `;

    // Bottone "Modifica" per manager/admin
    if (currentUser && isManagerRole(currentUser.ruolo)) {
      const footer = document.createElement("div");
      footer.style.marginTop = "8px";
      footer.style.display = "flex";
      footer.style.justifyContent = "flex-end";

      const btnMod = document.createElement("button");
      btnMod.type = "button";
      btnMod.className = "app-button tiny gray";
      btnMod.textContent = "Modifica";

      btnMod.addEventListener("click", (e) => {
        e.stopPropagation(); // evita il toggle ingredienti

        ricettaDaAprireId = r.id;
        window.location.hash = "ricette";
      });

      footer.appendChild(btnMod);
      card.appendChild(footer);
    }

    // click sulla card: mostra / nasconde ingredienti (solo lettura)
    card.addEventListener("click", async () => {
      let ingBox = card.querySelector(".ricetta-ingredienti-viewer");

      // se già aperti → chiudo
      if (ingBox) {
        ingBox.remove();
        return;
      }

      ingBox = document.createElement("div");
      ingBox.className = "ricetta-ingredienti-viewer";
      ingBox.style.marginTop = "8px";
      ingBox.style.fontSize = "12px";
      ingBox.innerHTML = "<em>Caricamento ingredienti...</em>";
      card.appendChild(ingBox);

      const ingredienti = await caricaIngredientiRicettaViewer(r.id);

      if (!ingredienti.length) {
        ingBox.innerHTML = "<em>Nessun ingrediente registrato.</em>";
        return;
      }

      const listaEl = document.createElement("ul");
      listaEl.style.margin = "4px 0 0";
      listaEl.style.paddingLeft = "18px";

      ingredienti.forEach((ing) => {
        const li = document.createElement("li");
        li.textContent = `${ing.nome_prodotto || ""} - ${ing.quantita || 0} ${
          ing.unita_misura || ""
        }`;
        listaEl.appendChild(li);
      });

      ingBox.innerHTML = "<strong>Ingredienti:</strong>";
      ingBox.appendChild(listaEl);
    });

    container.appendChild(card);
  });
}

// Applica filtro di ricerca (per ora solo per nome)
function applicaFiltroRicettario() {
  if (!ricetteSearchInput) {
    renderRicetteViewer([], "");
    return;
  }

  const qRaw = ricetteSearchInput.value || "";
  const q = qRaw.toLowerCase().trim();

  if (!q) {
    renderRicetteViewer([], "");
    return;
  }

  const lista = ricetteCache.filter((r) =>
    (r.nome || "").toLowerCase().includes(q)
  );

  renderRicetteViewer(lista, qRaw.trim());
}

// Eventi sulla casella di ricerca ricette (viewer)
if (ricetteSearchInput) {
  ricetteSearchInput.addEventListener("input", () => {
    applicaFiltroRicettario();
  });
}


// ===========================================================
// ========== SCHEDA PRODUZIONE ==============================
// ===========================================================
const produzioneRigheContainer = document.getElementById("produzione-righe");
const produzioneDataInput = document.getElementById("produzione-data");
const produzioneNoteInput = document.getElementById("produzione-note");
const produzioneLottoInput = document.getElementById("produzione-lotto");
const btnAddRigaProduzione = document.getElementById("btn-add-riga-produzione");
const btnSalvaSchedaProduzione = document.getElementById("btn-salva-scheda-produzione");

// Genera un lotto tipo: L20251204-143055
function generaLottoProduzione() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `L${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

// helper: trova ricetta in ricetteCache per NOME
function trovaRicettaPerNome(nome) {
  if (!nome || !ricetteCache) return null;
  const q = nome.toLowerCase().trim();
  return (
    ricetteCache.find((r) => (r.nome || "").toLowerCase().trim() === q) || null
  );
}

// popola il select dei formati in base alla ricetta
function popolaFormatiPerRiga(row, ricetta) {
  const selectFormato = row.querySelector(".prod-formato");
  if (!selectFormato) return;

  selectFormato.innerHTML = `<option value="">Formato...</option>`;

  if (!ricetta) {
    row.dataset.ricettaId = "";
    row.dataset.pezziBase = "";
    return;
  }

  row.dataset.ricettaId = ricetta.id;
  row.dataset.pezziBase = ricetta.pezzi_base != null ? ricetta.pezzi_base : 0;

  if (ricetta.formato1_label && ricetta.formato1_percent) {
    const opt1 = document.createElement("option");
    opt1.value = "1";
    opt1.textContent = ricetta.formato1_label;
    opt1.dataset.percent = ricetta.formato1_percent;
    selectFormato.appendChild(opt1);
  }

  if (ricetta.formato2_label && ricetta.formato2_percent) {
    const opt2 = document.createElement("option");
    opt2.value = "2";
    opt2.textContent = ricetta.formato2_label;
    opt2.dataset.percent = ricetta.formato2_percent;
    selectFormato.appendChild(opt2);
  }
}

// ricalcola quantità equivalente e moltiplicatore per UNA riga
function ricalcolaQuantitaRiga(row) {
  const qtaInput = row.querySelector(".prod-qta");
  const qtaEqInput = row.querySelector(".prod-qta-equivalente");
  const moltipInput = row.querySelector(".prod-moltiplicatore");
  const selectFormato = row.querySelector(".prod-formato");

  if (!qtaInput || !qtaEqInput || !moltipInput || !selectFormato) return;

  const qta = parseFloat(qtaInput.value || "0") || 0;
  const pezziBaseRicetta = parseFloat(row.dataset.pezziBase || "0") || 0;

  const selectedOption = selectFormato.options[selectFormato.selectedIndex];
  const perc =
    selectedOption && selectedOption.dataset.percent
      ? parseFloat(selectedOption.dataset.percent) || 0
      : 0;

  if (!qta || !perc || !pezziBaseRicetta) {
    qtaEqInput.value = "";
    moltipInput.value = "";
    return;
  }

  // quantità base equivalente = qta * (percentuale / 100)
  const qtaEquivalente = qta * (perc / 100);
  const moltiplicatore = qtaEquivalente / pezziBaseRicetta;

  qtaEqInput.value = qtaEquivalente.toFixed(2);
  moltipInput.value = moltiplicatore.toFixed(2);
}

// crea una nuova riga di produzione (card, mobile friendly)
function creaRigaProduzione(initial = {}) {
  if (!produzioneRigheContainer) return;

  const row = document.createElement("div");
  row.className = "produzione-riga timbratura-intro-card";
  row.style.display = "flex";
  row.style.flexDirection = "column";
  row.style.gap = "6px";

  row.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
      <strong style="font-size:14px;">Riga produzione</strong>
      <button type="button" class="app-button tiny red btn-del-riga-prod">✕</button>
    </div>

    <label style="font-size:13px;">
      Ricetta
      <input
        type="text"
        class="prod-ricetta-nome input-pill"
        placeholder="Es. Flan di patate, Ragù..."
        list="ricette-suggestions"
        value="${initial.ricettaNome || ""}"
      />
    </label>

    <div class="form-grid-2">
      <label style="font-size:13px;">
        Formato
        <select class="prod-formato input-pill">
          <option value="">Formato...</option>
        </select>
      </label>

      <label style="font-size:13px;">
        UM
        <input
          type="text"
          class="prod-um input-pill"
          placeholder="pz, kg..."
          value="${initial.um || ""}"
        />
      </label>
    </div>

    <div class="form-grid-2">
      <label style="font-size:13px;">
        Q.tà richiesta
        <input
          type="number"
          class="prod-qta input-pill"
          placeholder="Es. 120 (pz o kg)"
          min="0"
          step="0.001"
          value="${initial.qta || ""}"
        />
      </label>

      <label style="font-size:13px;">
        Q.tà base equivalente
        <input
          type="number"
          class="prod-qta-equivalente input-pill"
          placeholder="Calcolata"
          step="0.01"
          readonly
        />
      </label>
    </div>

    <label style="font-size:13px;">
      Moltiplicatore ricetta (x)
      <input
        type="number"
        class="prod-moltiplicatore input-pill"
        placeholder="Calcolato"
        step="0.01"
        readonly
      />
    </label>
  `;

  const btnDel = row.querySelector(".btn-del-riga-prod");
  const inputRicetta = row.querySelector(".prod-ricetta-nome");
  const selectFormato = row.querySelector(".prod-formato");
  const qtaInput = row.querySelector(".prod-qta");

  if (btnDel) {
    btnDel.addEventListener("click", () => row.remove());
  }

  // quando scelgo la ricetta → popola formati
  if (inputRicetta) {
    inputRicetta.addEventListener("change", () => {
      const ricetta = trovaRicettaPerNome(inputRicetta.value);
      popolaFormatiPerRiga(row, ricetta);
      ricalcolaQuantitaRiga(row);
    });
  }

  if (selectFormato) {
    selectFormato.addEventListener("change", () => {
      ricalcolaQuantitaRiga(row);
    });
  }

  if (qtaInput) {
    qtaInput.addEventListener("input", () => {
      ricalcolaQuantitaRiga(row);
    });
  }

  // se passo iniziali (es. ricetta già nota)
  if (initial.ricettaObj) {
    popolaFormatiPerRiga(row, initial.ricettaObj);
  }

  produzioneRigheContainer.appendChild(row);
}

// reset completo scheda produzione
function resetSchedaProduzione() {
  if (!produzioneRigheContainer) return;

  const todayISO = new Date().toISOString().slice(0, 10);
  if (produzioneDataInput && !produzioneDataInput.value) {
    produzioneDataInput.value = todayISO;
  }

  if (produzioneLottoInput) {
    produzioneLottoInput.value = generaLottoProduzione();
  }

  if (produzioneNoteInput) {
    produzioneNoteInput.value = "";
  }

  produzioneRigheContainer.innerHTML = "";
  creaRigaProduzione();
}

// salvataggio su Supabase della scheda produzione
async function salvaSchedaProduzione() {
  if (!supabase || !produzioneRigheContainer) return;

  const todayISO = new Date().toISOString().slice(0, 10);
  const dataScheda = produzioneDataInput?.value || todayISO;
  const noteScheda = produzioneNoteInput?.value.trim() || null;
  const lottoScheda =
    (produzioneLottoInput && produzioneLottoInput.value) ||
    generaLottoProduzione();

  const payloadScheda = {
    data: dataScheda,
    note: noteScheda,
    lotto: lottoScheda,
    // operatore_id: currentUser?.id || null,
  };

  const { data: scheda, error: errScheda } = await supabase
    .from("schede_produzione")
    .insert(payloadScheda)
    .select()
    .single();

  if (errScheda) {
    console.error("Errore salvataggio scheda produzione:", errScheda);
    alert("Errore nel salvare la scheda di produzione");
    return;
  }

  const schedaId = scheda.id;

  const righePayload = [];
  const rows = Array.from(
    produzioneRigheContainer.querySelectorAll(".produzione-riga")
  );

  rows.forEach((row) => {
    const ricettaId = parseInt(row.dataset.ricettaId || "0");
    if (!ricettaId) return;

    const qtaInput = row.querySelector(".prod-qta");
    const qtaEqInput = row.querySelector(".prod-qta-equivalente");
    const moltipInput = row.querySelector(".prod-moltiplicatore");
    const umInput = row.querySelector(".prod-um");
    const selectFormato = row.querySelector(".prod-formato");

    const selectedOption =
      selectFormato && selectFormato.options[selectFormato.selectedIndex];

    const formatoLabel = selectedOption ? selectedOption.textContent : "";
    const formatoPercent =
      selectedOption && selectedOption.dataset.percent
        ? parseFloat(selectedOption.dataset.percent) || null
        : null;

    const qta = qtaInput ? parseFloat(qtaInput.value || "0") || 0 : 0;
    const qtaEquivalente = qtaEqInput
      ? parseFloat(qtaEqInput.value || "0") || 0
      : 0;
    const moltiplicatore = moltipInput
      ? parseFloat(moltipInput.value || "0") || 0
      : 0;
    const um = umInput ? (umInput.value || "").trim() : "";

    if (!qta || !moltiplicatore) return;

    righePayload.push({
      scheda_id: schedaId,
      ricetta_id: ricettaId,
      formato_label: formatoLabel || null,
      formato_percent: formatoPercent,
      quantita: qta,
      quantita_equivalente: qtaEquivalente,
      unita: um || null,
      moltiplicatore_ricetta: moltiplicatore,
      lotto: lottoScheda,
    });
  });

  if (!righePayload.length) {
    alert("Nessuna riga valida nella scheda di produzione.");
    return;
  }

  const { error: errRighe } = await supabase
    .from("schede_produzione_righe")
    .insert(righePayload);

  if (errRighe) {
    console.error("Errore salvataggio righe scheda produzione:", errRighe);
    alert("Errore nel salvare le righe della scheda");
    return;
  }

  alert("Scheda di produzione salvata correttamente.");

  // nuova scheda, nuovo lotto
  resetSchedaProduzione();
}

// EVENTI GENERALI SCHEDA PRODUZIONE
if (btnAddRigaProduzione && produzioneRigheContainer) {
  btnAddRigaProduzione.addEventListener("click", () => {
    creaRigaProduzione();
  });
}

if (btnSalvaSchedaProduzione) {
  btnSalvaSchedaProduzione.addEventListener("click", () => {
    salvaSchedaProduzione();
  });
}
// ===========================================================
// ========== MAGAZZINO PREPARAZIONI (SOLO LETTURA) ===========
// ===========================================================

// ---------- CARICAMENTO ----------
async function caricaMagazzinoPreparazioni() {
  if (!supabase) return;

  resetPrepView();
  prepProdotti = [];

  const { data: movimenti, error } = await supabase
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

  prepProdotti = aggregaPreparazioni(movimenti);

  console.log("PREP PRODOTTI:", prepProdotti);

  initPrepAutocomplete();
}

// ---------- AGGREGAZIONE ----------
function aggregaPreparazioni(movimenti) {
  const map = {};

  (movimenti || []).forEach((m) => {
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

// ---------- AUTOCOMPLETE (VERSIONE CORRETTA) ----------
function initPrepAutocomplete() {
  const input = document.getElementById("prep-search");
  const box = document.getElementById("prep-suggestions");

  if (!input || !box) {
    console.warn("prep-search o prep-suggestions non trovati");
    return;
  }

  // reset
  input.value = "";
  box.innerHTML = "";

  // IMPORTANTISSIMO: niente clone, solo reset handler
  input.oninput = null;

  input.oninput = () => {
    const q = input.value.trim().toLowerCase();
    box.innerHTML = "";

    resetPrepView();

    if (!q) return;

    const matches = prepProdotti.filter(p =>
      p.nome_prodotto.toLowerCase().includes(q)
    );

    if (!matches.length) {
      box.innerHTML =
        `<div class="prep-suggestion">Nessun risultato</div>`;
      return;
    }

    matches.slice(0, 8).forEach(p => {
      const div = document.createElement("div");
      div.className = "prep-suggestion";
      div.textContent = p.nome_prodotto;

      div.onclick = () => {
        input.value = p.nome_prodotto;
        box.innerHTML = "";
        renderPrepCard(p);
        renderPrepLotti(p);
      };

      box.appendChild(div);
    });
  };
}

// ---------- RENDER ----------
function renderPrepCard(p) {
  const box = document.getElementById("prep-card-singola");
  if (!box) return;

  box.innerHTML = `
    <div class="prep-card">
      <h3>${p.nome_prodotto}</h3>
      <p>
        Giacenza totale:
        <strong>${p.giacenza_totale.toFixed(2)} ${p.unita_misura}</strong>
      </p>
    </div>
  `;
}

function renderPrepLotti(p) {
  const box = document.getElementById("prep-dettaglio-lotti");
  if (!box) return;

  box.innerHTML = `<h3>📦 Lotti disponibili</h3>`;

  p.lotti.forEach((l) => {
    const stato = statoScadenza(l.data_scadenza);

    box.innerHTML += `
      <div class="prep-lotto">
        <strong>Lotto:</strong> ${l.lotto}<br>
        <strong>Luogo:</strong> ${l.luogo}<br>
        <strong>Scadenza:</strong>
        <span class="${stato.classe}">
          ${formatData(l.data_scadenza)} ${stato.label}
        </span><br>
        <strong>Giacenza:</strong>
        ${l.giacenza.toFixed(2)} ${p.unita_misura}
      </div>
    `;
  });
}

// ---------- UTILS ----------
function statoScadenza(data) {
  const oggi = new Date();
  const d = new Date(data);
  const diff = (d - oggi) / 86400000;

  if (diff < 0)
    return { label: "❌ Scaduto", classe: "prep-warning-exp" };
  if (diff <= 3)
    return { label: "⚠️ Urgente", classe: "prep-warning-urg" };
  if (diff <= 7)
    return { label: "🟡 Attenzione", classe: "prep-warning-att" };
  return { label: "✔ OK", classe: "prep-warning-ok" };
}

function formatData(d) {
  return new Date(d).toLocaleDateString("it-IT");
}

function resetPrepView() {
  prepProdottoSelezionato = null;

  const card = document.getElementById("prep-card-singola");
  const lotti = document.getElementById("prep-dettaglio-lotti");

  if (card) card.innerHTML = "";
  if (lotti) lotti.innerHTML = "";
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

    // auto-compilante: se non è passato nulla, copia la categoria di bilancio dall'ultima riga
    let defaultBilancio = initial.categoria_bilancio || "";
    if (!defaultBilancio) {
      const lastRow = fatturaRigheBody.querySelector(
        "tr.fatt-riga-row:last-of-type"
      );
      if (lastRow) {
        const lastBilancioInput = lastRow.querySelector(".fatt-riga-bilancio");
        if (lastBilancioInput && lastBilancioInput.value) {
          defaultBilancio = lastBilancioInput.value;
        }
      }
    }

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
              Categoria di bilancio
              <input
                type="text"
                class="fatt-riga-bilancio input-pill"
                placeholder="Es. Materie prime"
                list="bilancio-categorie"
                value="${defaultBilancio || ""}"
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

          <!-- 🔥 NUOVA CARD DOPPIO SCONTO 10 + 5 % -->
          <div class="fatt-field">
            <label>
              Sconto %
              <div class="fatt-sconto-card">
                <input
                  type="number"
                  class="fatt-riga-sconto1 input-pill"
                  placeholder="10"
                  min="0"
                  max="100"
                  step="0.01"
                  value="${
                    initial.sconto1_perc != null ? initial.sconto1_perc : ""
                  }"
                />
                <span class="fatt-sconto-plus">+</span>
                <input
                  type="number"
                  class="fatt-riga-sconto2 input-pill"
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.01"
                  value="${
                    initial.sconto2_perc != null ? initial.sconto2_perc : ""
                  }"
                />
                <span class="fatt-sconto-percent">%</span>
              </div>
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
    const sconto1Input = tr.querySelector(".fatt-riga-sconto1");
    const sconto2Input = tr.querySelector(".fatt-riga-sconto2");
    const btnDel = tr.querySelector(".btn-del-riga");
    const descrInput = tr.querySelector(".fatt-riga-descrizione");

    const handleChange = () => {
      ricalcolaTotaleRiga(tr);
      ricalcolaTotaliFattura();
    };

    if (qtaInput) qtaInput.addEventListener("input", handleChange);
    if (prezzoInput) prezzoInput.addEventListener("input", handleChange);
    if (ivaInput) ivaInput.addEventListener("input", handleChange);
    if (sconto1Input) sconto1Input.addEventListener("input", handleChange);
    if (sconto2Input) sconto2Input.addEventListener("input", handleChange);

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
    const sconto1Input = tr.querySelector(".fatt-riga-sconto1");
    const sconto2Input = tr.querySelector(".fatt-riga-sconto2");
    const totaleEl = tr.querySelector(".fatt-riga-totale");

    const qta = parseNumber(qtaInput?.value || "0");
    const prezzoListino = parseNumber(prezzoInput?.value || "0");
    const ivaPerc = parseNumber(ivaInput?.value || "0");
    const sconto1 = parseNumber(sconto1Input?.value || "0");
    const sconto2 = parseNumber(sconto2Input?.value || "0");

    // 🔢 SCONTO COMPOSTO: prezzo_netto = prezzo * (1 - s1/100) * (1 - s2/100)
    const fattoreSconto1 = 1 - sconto1 / 100;
    const fattoreSconto2 = 1 - sconto2 / 100;
    const prezzoNetto = prezzoListino * fattoreSconto1 * fattoreSconto2;

    const imponibile = qta * prezzoNetto;
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
      const bilancioEl = tr.querySelector(".fatt-riga-bilancio");
      const umEl = tr.querySelector(".fatt-riga-um");
      const qtaEl = tr.querySelector(".fatt-riga-quantita");
      const prezzoEl = tr.querySelector(".fatt-riga-prezzo");
      const ivaEl = tr.querySelector(".fatt-riga-iva");
      const sconto1El = tr.querySelector(".fatt-riga-sconto1");
      const sconto2El = tr.querySelector(".fatt-riga-sconto2");

      const codiceVal = (codiceEl?.value || "").trim();
      const descrVal = (descrEl?.value || "").trim();
      const catVal = (catEl?.value || "").trim();
      const bilancioVal = (bilancioEl?.value || "").trim();
      const umVal = (umEl?.value || "").trim();
      const qtaVal = parseNumber(qtaEl?.value || "0");
      const prezzoVal = parseNumber(prezzoEl?.value || "0");
      const ivaPercVal = parseNumber(ivaEl?.value || "0");
      const sconto1Val = parseNumber(sconto1El?.value || "0");
      const sconto2Val = parseNumber(sconto2El?.value || "0");

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

      // 🔢 sconto composto anche qui per i valori salvati in tabella
      const fattoreSconto1 = 1 - sconto1Val / 100;
      const fattoreSconto2 = 1 - sconto2Val / 100;
      const prezzoNettoUnit = prezzoVal * fattoreSconto1 * fattoreSconto2;

      const imponibile = qtaVal * prezzoNettoUnit;
      const ivaVal = imponibile * (ivaPercVal / 100);
      const totale = imponibile + ivaVal;

      righePayload.push({
        fattura_id: currentFatturaId,
        prodotto_id: prodotto.id,
        codice_prodotto: prodotto.codice_interno,
        descrizione_riga: descrVal,
        quantita: qtaVal,
        um: prodotto.um,
        prezzo_unitario: prezzoVal,      // listino
        sconto1_perc: sconto1Val || null,
        sconto2_perc: sconto2Val || null,
        iva_perc: ivaPercVal,
        imponibile,
        iva: ivaVal,
        totale,
        categoria_id: prodotto.categoria_id || null,
        categoria_bilancio: bilancioVal || null,
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
          categoria_bilancio: r.categoria_bilancio || "",
          um: r.um,
          quantita: r.quantita,
          prezzo_unitario: r.prezzo_unitario,
          iva_perc: r.iva_perc,
          sconto1_perc: r.sconto1_perc,
          sconto2_perc: r.sconto2_perc,
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

 // ========= SUPPORTO RICETTE: CARICARE SUGGERIMENTI INGREDIENTI =========
async function caricaProdottiSuggerimentiIngredienti() {
  // 1) Prima: riempio il datalist con i prodotti di magazzino
  if (!magazzinoDati.length) {
    await caricaCategorieInCache();
    await caricaMagazzinoDati(); // questo già chiama aggiornaIngredientiSuggestionsDaMagazzino()
  } else {
    aggiornaIngredientiSuggestionsDaMagazzino();
  }

  // 2) Poi: aggiungo anche i nomi ingredienti già usati in altre ricette (tabella ricetta_ingredienti)
  if (!supabase || !ingredientiSuggestions) return;

  const { data, error } = await supabase
    .from("ricetta_ingredienti")
    .select("nome_prodotto")
    .not("nome_prodotto", "is", null);

  if (error) {
    console.error("Errore caricamento suggerimenti da ricetta_ingredienti:", error);
    return;
  }

  // Evito duplicati: prendo tutti i valori già presenti nel datalist
  const esistenti = new Set(
    Array.from(ingredientiSuggestions.querySelectorAll("option"))
      .map((opt) => (opt.value || "").toLowerCase().trim())
      .filter(Boolean)
  );

  (data || []).forEach((row) => {
    const nome = (row.nome_prodotto || "").trim();
    if (!nome) return;
    const key = nome.toLowerCase();
    if (esistenti.has(key)) return;

    esistenti.add(key);
    const opt = document.createElement("option");
    opt.value = nome;
    ingredientiSuggestions.appendChild(opt);
  });
}


  // ========= ROUTING =========

  // normalizza valori tipo "view-ricette" / "#view-ricette" → "ricette"
  function normalizeRoute(raw) {
    if (!raw) return "timbratura";
    let r = String(raw).replace(/^#/, "");
    if (r.startsWith("view-")) {
      r = r.slice("view-".length);
    }
    return r || "timbratura";
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
        // 1) carico TUTTE le ricette (serve per:
        //    - autocomplete "Nome ricetta" editor
        //    - ricetteSuggestionsList / datalist
        await caricaRicetteDaSupabase();

        // 2) carico suggerimenti ingredienti da magazzino
        await caricaProdottiSuggerimentiIngredienti();

        if (ricettaDaAprireId) {
          // arrivo dal Ricettario con "Modifica"
          const idToOpen = ricettaDaAprireId;
          ricettaDaAprireId = null; // consumo il flag
          await caricaRicettaInForm(idToOpen);
        } else {
          // apertura normale: form vuoto
          resetFormRicetta();
        }
        break;

      case "ricette-viewer":
        // solo lettura: elenco ricette + filtro
        await caricaRicetteDaSupabase();
        break;

      case "produzione":
        // per la scheda produzione:
        // 1) serve l'elenco ricette per autocomplete e formati
        await caricaRicetteDaSupabase();
        // 2) prepara data, lotto e prima riga
        resetSchedaProduzione();
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

      case "preventivi":
        await loadPreventiviList();
        resetPreventivoForm();
        break;
case "magazzino-preparazioni":
  await caricaMagazzinoPreparazioni();
  break;
      default:
        break;
    }
  }

  async function navigateTo(rawRoute) {
    const route = normalizeRoute(rawRoute);

    if (!currentUser) {
      showLogin();
      return;
    }

    const isManager = isManagerRole(currentUser.ruolo);

    if (!isManager) {
      // DIPENDENTE SEMPLICE
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
      // MANAGER / ADMIN
      let viewId = `view-${route}`;
      let active = document.getElementById(viewId);

      // se non trova "view-<route>", prova con l'id grezzo passato dal bottone/hash
      if (!active && rawRoute) {
        const rawId = String(rawRoute).replace(/^#/, "");
        const direct = document.getElementById(rawId);
        if (direct) {
          viewId = rawId;
          active = direct;
        }
      }

      // fallback di sicurezza su timbratura
      if (!active) {
        viewId = "view-timbratura";
        active = document.getElementById("view-timbratura");
      }

      showOnlyView(viewId);
      await onRouteEnter(route);
    }

    applyRoleVisibility();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // click sui bottoni con data-route (menu manager + home dip)
  routeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-route");
      if (!route) return;
      window.location.hash = route;
      navigateTo(route);
    });
  });

  // cambio hash manuale (es. #ricette, #produzione, #preventivi)
  window.addEventListener("hashchange", () => {
    const raw = window.location.hash.replace("#", "");
    navigateTo(raw);
  });

  // ========= AVVIO =========
  async function init() {
    await caricaDipendentiDaSupabase();
    await caricaTimbratureDaSupabase();

    restoreUserFromStorage();

    const rawHash = window.location.hash.replace("#", "") || "timbratura";
    const route = normalizeRoute(rawHash);

    if (currentUser) {
      if (isManagerRole(currentUser.ruolo)) {
        // mostra menu manager e delega a navigateTo per la view iniziale
        showManagerMenuAndRoute(route);
      } else {
        // dipendente
        if (route === "timbratura" || route === "ricette-viewer") {
          showOnlyView(`view-${route}`);
          await onRouteEnter(route);
        } else {
          showHomeDipendente();
        }
      }
    } else {
      showLogin();
    }
  }

  init();
  // ===================================================
// ROUTER BASE – RIPRISTINO NAVIGAZIONE
// ===================================================

// mostra una view e nasconde le altre
function showView(route) {
  document.querySelectorAll(".view").forEach((v) => {
    v.style.display = "none";
  });

  const target = document.getElementById(`view-${route}`);
  if (target) {
    target.style.display = "block";
  } else {
    console.warn("View non trovata:", route);
  }
}

// navigazione principale
function navigateTo(route) {
  showView(route);
  window.location.hash = route;
}

// click su QUALSIASI bottone con data-route
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-route]");
  if (!btn) return;

  const route = btn.dataset.route;
  if (!route) return;

  navigateTo(route);
});

// gestione hash (refresh / back browser)
window.addEventListener("hashchange", () => {
  const route = location.hash.replace("#", "");
  if (route) showView(route);
});

});
