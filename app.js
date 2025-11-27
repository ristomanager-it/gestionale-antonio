// =========================================================
// =============== [UTILITA' GLOBALI & STATO] ===============
// =========================================================

// Riferimento al client Supabase creato in index.html
const sb = window.supabaseClient;

// Stato in memoria
let currentUser = null; // { id, nome, ruolo, canalePrevalente, ... }
let currentViewId = "view-login";

// Cache dati
let dipendentiCache = [];
let fatturaCorrente = null;
let fattureCache = [];
let magazzinoProdottiCache = [];
let ricetteCache = [];
let costiFissiCache = [];

// Helper per DOM
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Formattazioni
function formatEuro(value) {
  const num = Number(value) || 0;
  return num.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function formatPercent(num) {
  const n = Number(num) || 0;
  return `${n.toFixed(1)}%`;
}

// Cambio vista SPA
function showView(viewId) {
  const views = $$(".view");
  views.forEach((v) => {
    v.style.display = v.id === viewId ? "block" : "none";
  });
  currentViewId = viewId;
}

// Attiva/disattiva menu manager
function updateMenuForRole() {
  const managerMenu = $("#manager-menu");
  const homeDip = $("#view-home-dip");

  if (!currentUser) {
    managerMenu.style.display = "none";
    homeDip.style.display = "none";
    return;
  }

  const isManagerOrAdmin =
    currentUser.ruolo === "admin" ||
    currentUser.ruolo === "manager_cucina" ||
    currentUser.ruolo === "manager_sala";

  if (isManagerOrAdmin) {
    managerMenu.style.display = "grid";
    homeDip.style.display = "none";
  } else {
    managerMenu.style.display = "none";
    homeDip.style.display = "block";
  }
}

// =========================================================
// ==================== [0] HEADER & NAV ====================
// =========================================================

const btnTheme = $("#btn-theme");
const currentUserLabel = $("#current-user-label");
const btnLogout = $("#btn-logout");

// Gestione routing pulsanti con data-route
function initRoutingButtons() {
  $$(".app-button[data-route]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.route;
      switch (route) {
        case "timbratura":
          showView("view-timbratura");
          initTimbraturaView();
          break;
        case "dipendenti":
          showView("view-dipendenti");
          initDipendentiView();
          break;
        case "acquisti":
          showView("view-acquisti");
          initAcquistiView();
          break;
        case "ricette":
          showView("view-ricette");
          initRicetteView();
          break;
        case "magazzino":
          showView("view-magazzino");
          initMagazzinoView();
          break;
        case "report":
          showView("view-report");
          initReportView();
          break;
        case "ordine":
          // al momento solo placeholder
          alert("Funzione 'Ordine del giorno' in sviluppo.");
          break;
        default:
          break;
      }
    });
  });
}

// Gestione logout
function initLogout() {
  if (!btnLogout) return;

  btnLogout.addEventListener("click", async () => {
    currentUser = null;
    localStorage.removeItem("ga_current_user");
    currentUserLabel.textContent = "Nessun utente";
    btnLogout.style.display = "none";
    showView("view-login");
  });
}

// Ripristina utente salvato
function restoreUserFromStorage() {
  const raw = localStorage.getItem("ga_current_user");
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data && data.id) {
      currentUser = data;
      currentUserLabel.textContent = data.nome || "Utente";
      btnLogout.style.display = "inline-block";
      updateMenuForRole();
      showView("view-home-dip");
    }
  } catch (e) {
    console.error("Errore restore user", e);
  }
}

// =========================================================
// ======================= [1] LOGIN ========================
// =========================================================

const loginNome = $("#login-nome");
const loginPin = $("#login-pin");
const loginRemember = $("#login-remember");
const btnLogin = $("#btn-login");

function initLogin() {
  if (!btnLogin) return;

  btnLogin.addEventListener("click", async () => {
    const nome = (loginNome.value || "").trim();
    const pin = (loginPin.value || "").trim();

    if (!nome || !pin) {
      alert("Inserisci Nome e PIN.");
      return;
    }

    // ✅ FALLBACK: utente admin locale, senza Supabase
    if (nome.toLowerCase() === "admin" && pin === "9999") {
      currentUser = {
        id: "local-admin",
        nome: "admin",
        ruolo: "admin",
        canalePrevalente: "NR",
        costoOrario: null,
      };

      currentUserLabel.textContent = currentUser.nome;
      btnLogout.style.display = "inline-block";

      if (loginRemember.checked) {
        localStorage.setItem("ga_current_user", JSON.stringify(currentUser));
      }

      updateMenuForRole();
      showView("view-home-dip");
      return;
    }

    // 🔁 Login normale via Supabase
    try {
      // Supponiamo tabella "dipendenti" con colonne: nome, codice (PIN), ruolo, canale_prevalente, ...
      const { data, error } = await sb
        .from("dipendenti")
        .select("*")
        .eq("nome", nome)
        .eq("codice", pin)
        .eq("attivo", true)
        .maybeSingle();

      if (error) {
        console.error(error);
        alert("Errore durante il login.");
        return;
      }

      if (!data) {
        alert("Credenziali non valide oppure dipendente non attivo.");
        return;
      }

      currentUser = {
        id: data.id,
        nome: data.nome,
        ruolo: data.ruolo,
        canalePrevalente: data.canale_prevalente || data.canalePrevalente || "NR",
        costoOrario: data.costo_orario ?? data.costoOrario ?? null,
      };

      currentUserLabel.textContent = currentUser.nome;
      btnLogout.style.display = "inline-block";

      if (loginRemember.checked) {
        localStorage.setItem("ga_current_user", JSON.stringify(currentUser));
      }

      updateMenuForRole();
      showView("view-home-dip");
    } catch (err) {
      console.error("Eccezione login", err);
      alert("Errore imprevisto durante il login.");
    }
  });
}

// =========================================================
// ======== [2] HOME DIPENDENTE / MENU MANAGER (UI) =========
// =========================================================

// Tutto il routing è già gestito via data-route e updateMenuForRole,
// quindi non servono funzioni aggiuntive qui.

// =========================================================
// ================== [3] TIMBRATURA & PRESENZE =============
// =========================================================

const timbraturaUtenteNome = $("#timbratura-utente-nome");
const timbraturaCanaleSelect = $("#timbratura-canale-select");
const btnEntra = $("#btn-entra");
const btnPausa = $("#btn-pausa");
const btnEsci = $("#btn-esci");

const btnTogglePresenze = $("#btn-toggle-presenze");
const sezionePresenze = $("#sezione-presenze");
const presenzeLista = $("#presenze-lista");

// Controlla stato attuale di timbratura dell'utente
async function getStatoTimbraturaCorrente() {
  if (!currentUser) return null;
  const { data, error } = await sb
    .from("timbrature")
    .select("*")
    .eq("dipendente_id", currentUser.id)
    .is("uscita", null)
    .order("entrata", { ascending: false })
    .limit(1);

  if (error) {
    console.error(error);
    return null;
  }
  return data && data.length ? data[0] : null;
}

async function registraEntrata() {
  if (!currentUser) {
    alert("Devi essere loggato.");
    return;
  }

  const corrente = await getStatoTimbraturaCorrente();
  if (corrente) {
    alert("Sei già timbrato dentro. Devi fare USCITA prima.");
    return;
  }

  const canale = timbraturaCanaleSelect.value || currentUser.canalePrevalente || "NR";

  const { error } = await sb.from("timbrature").insert({
    dipendente_id: currentUser.id,
    canale,
    entrata: new Date().toISOString(),
    pausa_inizio: null,
    pausa_fine: null,
    uscita: null,
  });

  if (error) {
    console.error(error);
    alert("Errore nel registrare l'entrata.");
    return;
  }

  alert("Entrata registrata.");
}

async function registraPausa() {
  const corrente = await getStatoTimbraturaCorrente();
  if (!corrente) {
    alert("Non hai una timbratura aperta.");
    return;
  }

  // Se non era in pausa -> segna inizio pausa
  if (!corrente.pausa_inizio) {
    const { error } = await sb
      .from("timbrature")
      .update({ pausa_inizio: new Date().toISOString() })
      .eq("id", corrente.id);
    if (error) {
      console.error(error);
      alert("Errore nel registrare l'inizio pausa.");
      return;
    }
    alert("Pausa iniziata.");
  } else if (!corrente.pausa_fine) {
    // Se era in pausa e non ha fine -> segna fine pausa
    const { error } = await sb
      .from("timbrature")
      .update({ pausa_fine: new Date().toISOString() })
      .eq("id", corrente.id);
    if (error) {
      console.error(error);
      alert("Errore nel registrare la fine della pausa.");
      return;
    }
    alert("Pausa terminata.");
  } else {
    alert("Hai già aperto e chiuso una pausa in questa timbratura.");
  }
}

async function registraUscita() {
  const corrente = await getStatoTimbraturaCorrente();
  if (!corrente) {
    alert("Non hai una timbratura aperta.");
    return;
  }

  const { error } = await sb
    .from("timbrature")
    .update({ uscita: new Date().toISOString() })
    .eq("id", corrente.id);

  if (error) {
    console.error(error);
    alert("Errore nel registrare l'uscita.");
    return;
  }

  alert("Uscita registrata.");
}

// Presenze attuali (dipendenti con timbratura aperta)
async function caricaPresenzeAttuali() {
  if (!presenzeLista) return;

  presenzeLista.innerHTML = "...";

  // Se hai una funzione RPC in Supabase, usala così:
  // const { data, error } = await sb.rpc("dipendenti_presenti_ora");
  // Altrimenti qui andrebbe fatta una join manuale fra timbrature e dipendenti.
  // Per ora usiamo un placeholder vuoto.

  const { data, error } = await sb
    .from("timbrature")
    .select("*, dipendenti ( nome )")
    .is("uscita", null);

  if (error) {
    console.error(error);
    presenzeLista.innerHTML = "<tr><td colspan='3'>Errore nel caricare le presenze</td></tr>";
    return;
  }

  if (!data || !data.length) {
    presenzeLista.innerHTML =
      "<tr><td colspan='3'>Nessun dipendente presente ora.</td></tr>";
    return;
  }

  presenzeLista.innerHTML = "";
  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.dipendenti?.nome || ""}</td>
      <td>${row.canale || ""}</td>
      <td>${row.uscita ? "Fuori" : "Dentro"}</td>
    `;
    presenzeLista.appendChild(tr);
  });
}

function initTimbraturaView() {
  if (!currentUser) return;
  if (timbraturaUtenteNome) {
    timbraturaUtenteNome.textContent = currentUser.nome || "-";
  }
}

function initTimbratura() {
  if (btnEntra) btnEntra.addEventListener("click", registraEntrata);
  if (btnPausa) btnPausa.addEventListener("click", registraPausa);
  if (btnEsci) btnEsci.addEventListener("click", registraUscita);

  if (btnTogglePresenze && sezionePresenze) {
    btnTogglePresenze.addEventListener("click", async () => {
      const visible = sezionePresenze.style.display === "block";
      sezionePresenze.style.display = visible ? "none" : "block";
      if (!visible) {
        await caricaPresenzeAttuali();
      }
    });
  }
}

// =========================================================
// =================== [4] DIPENDENTI CRUD ==================
// =========================================================

const dipForm = $("#dipendente-form");
const dipNome = $("#dip-nome");
const dipMansione = $("#dip-mansione");
const dipDataNascita = $("#dip-data-nascita");
const dipResidenza = $("#dip-residenza");
const dipTelefono = $("#dip-telefono");
const dipEmail = $("#dip-email");
const dipRuolo = $("#dip-ruolo");
const dipTipoCompenso = $("#dip-tipo-compenso");
const dipRetribuzioneBase = $("#dip-retribuzione-base");
const dipOreMensili = $("#dip-ore-mensili");
const dipOreServizio = $("#dip-ore-servizio");
const dipCosto = $("#dip-costo");
const dipCodice = $("#dip-codice");
const dipCanale = $("#dip-canale");
const dipAttivo = $("#dip-attivo");
const btnAddDip = $("#btn-add-dip");
const dipLista = $("#dipendenti-lista");

function calcolaCostoOrarioDaForm() {
  const tipo = dipTipoCompenso.value;
  const retrib = parseFloat(dipRetribuzioneBase.value) || 0;
  const oreMensili = parseFloat(dipOreMensili.value) || 0;
  const oreServizio = parseFloat(dipOreServizio.value) || 0;

  let costo = 0;
  if (tipo === "orario") {
    costo = retrib;
  } else if (tipo === "mensile" && oreMensili > 0) {
    costo = retrib / oreMensili;
  } else if (tipo === "servizio" && oreServizio > 0) {
    costo = retrib / oreServizio;
  }

  dipCosto.value = costo ? costo.toFixed(2) : "";
}

function aggiornaVisibilitaCampiCompenso() {
  const tipo = dipTipoCompenso.value;
  const rowMensili = $("#row-ore-mensili");
  const rowServizio = $("#row-ore-servizio");

  if (tipo === "mensile") {
    rowMensili.style.display = "block";
    rowServizio.style.display = "none";
  } else if (tipo === "servizio") {
    rowMensili.style.display = "none";
    rowServizio.style.display = "block";
  } else {
    rowMensili.style.display = "none";
    rowServizio.style.display = "none";
  }
}

async function caricaDipendentiDaSupabase() {
  const { data, error } = await sb
    .from("dipendenti")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    alert("Errore nel caricare i dipendenti.");
    return;
  }

  dipendentiCache = data || [];
  renderDipendentiTable();
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
      return ruolo || "";
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
      return tipo || "";
  }
}

function renderDipendentiTable() {
  if (!dipLista) return;
  dipLista.innerHTML = "";

  dipendentiCache.forEach((d, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.nome || ""}</td>
      <td>${d.mansione || ""}</td>
      <td>${d.data_nascita || d.dataNascita || ""}</td>
      <td>${d.residenza || ""}</td>
      <td>${d.telefono || ""}</td>
      <td>${d.email || ""}</td>
      <td>${formatRuolo(d.ruolo)}</td>
      <td>${formatTipoCompenso(d.tipo_compenso || d.tipoCompenso)}</td>
      <td>${
        d.costo_orario != null
          ? Number(d.costo_orario).toFixed(2)
          : d.costoOrario != null
          ? Number(d.costoOrario).toFixed(2)
          : ""
      }</td>
      <td>${d.canale_prevalente || d.canalePrevalente || ""}</td>
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
        const dip = dipendentiCache[idx];
        await eliminaDipendenteSupabase(dip);
        await caricaDipendentiDaSupabase();
      }
    });
  });
}

function caricaDipendenteInForm(index) {
  const d = dipendentiCache[index];
  if (!d) return;

  dipNome.value = d.nome || "";
  dipMansione.value = d.mansione || "";
  dipDataNascita.value = (d.data_nascita || d.dataNascita || "").substring(0, 10);
  dipResidenza.value = d.residenza || "";
  dipTelefono.value = d.telefono || "";
  dipEmail.value = d.email || "";
  dipRuolo.value = d.ruolo || "cameriere";
  dipTipoCompenso.value = d.tipo_compenso || d.tipoCompenso || "orario";
  dipRetribuzioneBase.value =
    d.retribuzione_base ?? d.retribuzioneBase ?? "";
  dipOreMensili.value = d.ore_mensili ?? d.oreMensili ?? "";
  dipOreServizio.value = d.ore_servizio ?? d.oreServizio ?? "";
  dipCosto.value =
    d.costo_orario != null
      ? Number(d.costo_orario).toFixed(2)
      : d.costoOrario != null
      ? Number(d.costoOrario).toFixed(2)
      : "";
  dipCodice.value = d.codice || "";
  dipCanale.value = d.canale_prevalente || d.canalePrevalente || "NR";
  dipAttivo.checked = d.attivo !== false;

  aggiornaVisibilitaCampiCompenso();
}

async function salvaDipendenteSupabase() {
  const payload = {
    nome: dipNome.value.trim(),
    mansione: dipMansione.value.trim(),
    data_nascita: dipDataNascita.value || null,
    residenza: dipResidenza.value.trim(),
    telefono: dipTelefono.value.trim(),
    email: dipEmail.value.trim(),
    ruolo: dipRuolo.value,
    tipo_compenso: dipTipoCompenso.value,
    retribuzione_base: dipRetribuzioneBase.value
      ? parseFloat(dipRetribuzioneBase.value)
      : null,
    ore_mensili: dipOreMensili.value
      ? parseFloat(dipOreMensili.value)
      : null,
    ore_servizio: dipOreServizio.value
      ? parseFloat(dipOreServizio.value)
      : null,
    costo_orario: dipCosto.value ? parseFloat(dipCosto.value) : null,
    codice: dipCodice.value.trim(),
    canale_prevalente: dipCanale.value,
    attivo: dipAttivo.checked,
  };

  // upsert basato su nome+codice (semplificato)
  const { error } = await sb.from("dipendenti").upsert(payload, {
    onConflict: "nome,codice",
  });

  if (error) {
    console.error(error);
    alert("Errore nel salvare il dipendente.");
    return;
  }

  alert("Dipendente salvato correttamente.");
}

async function eliminaDipendenteSupabase(dip) {
  if (!dip || !dip.id) return;
  const { error } = await sb.from("dipendenti").delete().eq("id", dip.id);
  if (error) {
    console.error(error);
    alert("Errore nell'eliminare il dipendente.");
  }
}

function initDipendentiView() {
  caricaDipendentiDaSupabase();
}

function initDipendenti() {
  if (!dipForm) return;

  dipTipoCompenso.addEventListener("change", () => {
    aggiornaVisibilitaCampiCompenso();
    calcolaCostoOrarioDaForm();
  });

  [dipRetribuzioneBase, dipOreMensili, dipOreServizio].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", calcolaCostoOrarioDaForm);
  });

  btnAddDip.addEventListener("click", async (e) => {
    e.preventDefault();
    await salvaDipendenteSupabase();
    await caricaDipendentiDaSupabase();
  });

  aggiornaVisibilitaCampiCompenso();
}

// =========================================================
// ================= [5] ACQUISTI / FATTURE =================
// =========================================================

const fatturaForm = $("#fattura-form");
const fatturaNumero = $("#fattura-numero");
const fatturaData = $("#fattura-data");
const fatturaFornitore = $("#fattura-fornitore");
const fatturaNote = $("#fattura-note");
const btnNuovaFattura = $("#btn-nuova-fattura");
const btnSalvaFattura = $("#btn-salva-fattura");

const fatturaRigheBody = $("#fattura-righe-body");
const btnAddRigaFattura = $("#btn-add-riga-fattura");

const fatturaImponibileTotale = $("#fattura-imponibile-totale");
const fatturaIvaTotale = $("#fattura-iva-totale");
const fatturaTotaleDocumento = $("#fattura-totale-documento");

const btnToggleFatture = $("#btn-toggle-fatture");
const fattureTable = $("#fatture-table");
const fattureLista = $("#fatture-lista");

// Struttura righe fattura in memoria
// fatturaCorrente = { id, numero, data, fornitore, note, righe: [ {codice, descrizione, categoria, um, quantita, prezzo, iva, totale} ] }

function nuovaFatturaVuota() {
  fatturaCorrente = {
    id: null,
    numero: "",
    data: new Date().toISOString().substring(0, 10),
    fornitore: "",
    note: "",
    righe: [],
  };
  aggiornaFatturaUI();
}

function aggiornaFatturaUI() {
  if (!fatturaCorrente) return;
  fatturaNumero.value = fatturaCorrente.numero || "";
  fatturaData.value = fatturaCorrente.data || "";
  fatturaFornitore.value = fatturaCorrente.fornitore || "";
  fatturaNote.value = fatturaCorrente.note || "";

  // Righe
  fatturaRigheBody.innerHTML = "";
  fatturaCorrente.righe.forEach((riga, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${riga.codice || ""}" data-field="codice" data-index="${index}" /></td>
      <td><input type="text" value="${riga.descrizione || ""}" data-field="descrizione" data-index="${index}" /></td>
      <td><input type="text" value="${riga.categoria || ""}" data-field="categoria" data-index="${index}" /></td>
      <td><input type="text" value="${riga.um || ""}" data-field="um" data-index="${index}" /></td>
      <td><input type="number" step="0.001" value="${
        riga.quantita ?? ""
      }" data-field="quantita" data-index="${index}" /></td>
      <td><input type="number" step="0.01" value="${
        riga.prezzo ?? ""
      }" data-field="prezzo" data-index="${index}" /></td>
      <td><input type="number" step="0.01" value="${
        riga.iva ?? ""
      }" data-field="iva" data-index="${index}" /></td>
      <td>${formatEuro(riga.totale || 0)}</td>
      <td><button class="app-button tiny red" data-delete-riga="${index}">X</button></td>
    `;
    fatturaRigheBody.appendChild(tr);
  });

  // Gestione input righe
  fatturaRigheBody
    .querySelectorAll("input[data-field]")
    .forEach((input) => {
      input.addEventListener("input", () => {
        const idx = parseInt(input.dataset.index, 10);
        const field = input.dataset.field;
        const riga = fatturaCorrente.righe[idx];
        if (!riga) return;

        if (field === "quantita" || field === "prezzo" || field === "iva") {
          riga[field] = input.value ? parseFloat(input.value) : null;
        } else {
          riga[field] = input.value;
        }

        riga.totale =
          (riga.quantita || 0) *
          (riga.prezzo || 0) *
          (1 + (riga.iva || 0) / 100);
        ricalcolaTotaliFattura();
        aggiornaFatturaUI();
      });
    });

  // Delete
  fatturaRigheBody
    .querySelectorAll("[data-delete-riga]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.deleteRiga, 10);
        fatturaCorrente.righe.splice(idx, 1);
        ricalcolaTotaliFattura();
        aggiornaFatturaUI();
      });
    });

  ricalcolaTotaliFattura();
}

function ricalcolaTotaliFattura() {
  if (!fatturaCorrente) return;
  let imponibile = 0;
  let ivaTot = 0;
  fatturaCorrente.righe.forEach((r) => {
    const q = Number(r.quantita) || 0;
    const p = Number(r.prezzo) || 0;
    const iva = Number(r.iva) || 0;

    const imponibileRiga = q * p;
    const ivaRiga = imponibileRiga * (iva / 100);

    imponibile += imponibileRiga;
    ivaTot += ivaRiga;
  });

  fatturaImponibileTotale.value = imponibile.toFixed(2);
  fatturaIvaTotale.value = ivaTot.toFixed(2);
  fatturaTotaleDocumento.value = (imponibile + ivaTot).toFixed(2);
}

function aggiungiRigaFattura() {
  if (!fatturaCorrente) return;
  fatturaCorrente.righe.push({
    codice: "",
    descrizione: "",
    categoria: "",
    um: "",
    quantita: null,
    prezzo: null,
    iva: 10,
    totale: 0,
  });
  aggiornaFatturaUI();
}

async function salvaFatturaSupabase() {
  if (!fatturaCorrente) return;

  fatturaCorrente.numero = fatturaNumero.value.trim();
  fatturaCorrente.data = fatturaData.value || null;
  fatturaCorrente.fornitore = fatturaFornitore.value.trim();
  fatturaCorrente.note = fatturaNote.value.trim();

  const fattPayload = {
    numero: fatturaCorrente.numero,
    data: fatturaCorrente.data,
    fornitore: fatturaCorrente.fornitore,
    note: fatturaCorrente.note,
    imponibile: parseFloat(fatturaImponibileTotale.value) || 0,
    iva: parseFloat(fatturaIvaTotale.value) || 0,
    totale: parseFloat(fatturaTotaleDocumento.value) || 0,
  };

  let fatturaId = fatturaCorrente.id;

  if (!fatturaId) {
    // insert
    const { data, error } = await sb
      .from("fatture_acquisto")
      .insert(fattPayload)
      .select("id")
      .single();
    if (error) {
      console.error(error);
      alert("Errore nel salvare la fattura.");
      return;
    }
    fatturaId = data.id;
    fatturaCorrente.id = fatturaId;
  } else {
    // update
    const { error } = await sb
      .from("fatture_acquisto")
      .update(fattPayload)
      .eq("id", fatturaId);
    if (error) {
      console.error(error);
      alert("Errore nell'aggiornare la fattura.");
      return;
    }
  }

  // Salva righe
  await sb.from("fatture_righe").delete().eq("fattura_id", fatturaId);

  const righePayload = fatturaCorrente.righe.map((r) => ({
    fattura_id: fatturaId,
    codice: r.codice,
    descrizione: r.descrizione,
    categoria: r.categoria,
    um: r.um,
    quantita: r.quantita,
    prezzo: r.prezzo,
    iva: r.iva,
    totale: r.totale,
  }));

  const { error: errorRighe } = await sb
    .from("fatture_righe")
    .insert(righePayload);

  if (errorRighe) {
    console.error(errorRighe);
    alert("Errore nel salvare le righe della fattura.");
    return;
  }

  // Genera movimenti di magazzino (carico)
  const movimenti = fatturaCorrente.righe.map((r) => ({
    prodotto_codice: r.codice,
    descrizione: r.descrizione,
    categoria: r.categoria,
    um: r.um,
    quantita: r.quantita,
    costo_unitario: r.prezzo,
    tipo: "carico",
    data: fatturaCorrente.data,
    fattura_id: fatturaId,
  }));
  await sb.from("magazzino_movimenti").insert(movimenti);

  alert("Fattura salvata correttamente.");
  await caricaFattureElenco();
}

async function caricaFattureElenco() {
  const { data, error } = await sb
    .from("fatture_acquisto")
    .select("*")
    .order("data", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  fattureCache = data || [];
  renderFattureLista();
}

function renderFattureLista() {
  if (!fattureLista) return;
  fattureLista.innerHTML = "";

  if (!fattureCache.length) {
    fattureLista.innerHTML =
      "<tr><td colspan='5'>Nessuna fattura registrata.</td></tr>";
    return;
  }

  fattureCache.forEach((f, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.data || ""}</td>
      <td>${f.numero || ""}</td>
      <td>${f.fornitore || ""}</td>
      <td>${formatEuro(f.totale || 0)}</td>
      <td><button class="app-button tiny gray" data-open-fattura="${index}">Apri</button></td>
    `;
    fattureLista.appendChild(tr);
  });

  fattureLista.querySelectorAll("[data-open-fattura]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.dataset.openFattura, 10);
      const fatt = fattureCache[idx];
      await apriFatturaDaDb(fatt.id);
    });
  });
}

async function apriFatturaDaDb(id) {
  const { data: fatt, error } = await sb
    .from("fatture_acquisto")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    alert("Errore nel caricare la fattura.");
    return;
  }

  const { data: righe, error: errRighe } = await sb
    .from("fatture_righe")
    .select("*")
    .eq("fattura_id", id);

  if (errRighe) {
    console.error(errRighe);
    alert("Errore nel caricare le righe della fattura.");
    return;
  }

  fatturaCorrente = {
    id: fatt.id,
    numero: fatt.numero,
    data: fatt.data,
    fornitore: fatt.fornitore,
    note: fatt.note,
    righe: (righe || []).map((r) => ({
      codice: r.codice,
      descrizione: r.descrizione,
      categoria: r.categoria,
      um: r.um,
      quantita: r.quantita,
      prezzo: r.prezzo,
      iva: r.iva,
      totale: r.totale,
    })),
  };

  aggiornaFatturaUI();
}

function initAcquistiView() {
  nuovaFatturaVuota();
  caricaFattureElenco();
}

function initAcquisti() {
  if (!fatturaForm) return;

  btnNuovaFattura.addEventListener("click", () => {
    nuovaFatturaVuota();
  });

  btnSalvaFattura.addEventListener("click", () => {
    salvaFatturaSupabase();
  });

  btnAddRigaFattura.addEventListener("click", () => {
    aggiungiRigaFattura();
  });

  if (btnToggleFatture && fattureTable) {
    btnToggleFatture.addEventListener("click", () => {
      const visible = fattureTable.style.display === "table";
      fattureTable.style.display = visible ? "none" : "table";
    });
  }
}

// =========================================================
// ====================== [6] RICETTE =======================
// =========================================================

const ricettaForm = $("#ricetta-form");
const ricettaNome = $("#ricetta-nome");
const ricettaDescrizione = $("#ricetta-descrizione");
const ricettaNote = $("#ricetta-note");
const ricettaFoto = $("#ricetta-foto");
const ricettaIngredientiContainer = $("#ricetta-ingredienti-container");
const ingredientiSuggestions = $("#ingredienti-suggestions");
const btnAddIngrediente = $("#btn-add-ingrediente");
const btnSalvaRicetta = $("#btn-salva-ricetta");

function aggiungiRigaIngrediente(valori = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "ricetta-ingrediente-row";
  wrapper.innerHTML = `
    <input list="ingredienti-suggestions" type="text" class="input-pill" placeholder="Prodotto" value="${
      valori.prodotto || ""
    }" data-field="prodotto" />
    <input type="number" step="0.001" class="input-pill" placeholder="Q.tà" value="${
      valori.quantita ?? ""
    }" data-field="quantita" style="max-width: 120px;" />
    <input type="text" class="input-pill" placeholder="UM" value="${
      valori.um || ""
    }" data-field="um" style="max-width: 90px;" />
    <button type="button" class="app-button tiny red" data-remove-ingrediente>✕</button>
  `;
  ricettaIngredientiContainer.appendChild(wrapper);

  wrapper
    .querySelector("[data-remove-ingrediente]")
    .addEventListener("click", () => {
      wrapper.remove();
    });
}

async function caricaProdottiPerSuggestions() {
  const { data, error } = await sb
    .from("prodotti")
    .select("id, codice, descrizione");

  if (error) {
    console.error(error);
    return;
  }

  ingredientiSuggestions.innerHTML = "";
  (data || []).forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.descrizione || p.codice;
    ingredientiSuggestions.appendChild(opt);
  });
}

async function salvaRicettaSupabase() {
  const nome = ricettaNome.value.trim();
  if (!nome) {
    alert("Inserisci il nome della ricetta.");
    return;
  }

  const descr = ricettaDescrizione.value.trim();
  const note = ricettaNote.value.trim();

  const { data: ricetta, error } = await sb
    .from("ricette")
    .insert({
      nome,
      descrizione: descr,
      note,
    })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    alert("Errore nel salvare la ricetta.");
    return;
  }

  const ricettaId = ricetta.id;

  // Ingredienti
  const ingredientiRows = Array.from(
    ricettaIngredientiContainer.querySelectorAll(".ricetta-ingrediente-row")
  );

  const ingredientiPayload = ingredientiRows.map((row) => {
    const prodottoInput = row.querySelector('[data-field="prodotto"]');
    const quantitaInput = row.querySelector('[data-field="quantita"]');
    const umInput = row.querySelector('[data-field="um"]');

    return {
      ricetta_id: ricettaId,
      prodotto_descrizione: prodottoInput.value.trim(),
      quantita: quantitaInput.value
        ? parseFloat(quantitaInput.value)
        : null,
      um: umInput.value.trim(),
    };
  });

  if (ingredientiPayload.length) {
    const { error: errIng } = await sb
      .from("ricette_ingredienti")
      .insert(ingredientiPayload);
    if (errIng) {
      console.error(errIng);
      alert("Errore nel salvare gli ingredienti della ricetta.");
      return;
    }
  }

  // Foto: opzionale - per ora solo placeholder
  if (ricettaFoto.files && ricettaFoto.files[0]) {
    // TODO: upload su Supabase Storage
  }

  alert("Ricetta salvata correttamente.");
}

function initRicetteView() {
  ricettaNome.value = "";
  ricettaDescrizione.value = "";
  ricettaNote.value = "";
  ricettaFoto.value = "";
  ricettaIngredientiContainer.innerHTML = "";
  aggiungiRigaIngrediente();
  caricaProdottiPerSuggestions();
}

function initRicette() {
  if (!ricettaForm) return;

  btnAddIngrediente.addEventListener("click", () => {
    aggiungiRigaIngrediente();
  });

  btnSalvaRicetta.addEventListener("click", async () => {
    await salvaRicettaSupabase();
  });
}

// =========================================================
// ===================== [7] REPORT KPI =====================
// =========================================================

const reportData = $("#report-data");
const kpiIncassoInput = $("#kpi-incasso-input");
const kpiFoodcostInput = $("#kpi-foodcost-input");
const kpiIncassoValue = $("#kpi-incasso-value");
const kpiNettoValue = $("#kpi-netto-value");
const kpiMargineBadge = $("#kpi-margine-badge");
const kpiGaugeNeedle = $("#kpi-gauge-needle");
const kpiBepLabel = $("#kpi-bep-label");
const kpiLavoroImporto = $("#kpi-lavoro-importo");
const kpiFoodImporto = $("#kpi-food-importo");
const kpiFissiImporto = $("#kpi-fissi-importo");
const kpiLavoroPercent = $("#kpi-lavoro-percent");
const kpiFoodPercent = $("#kpi-food-percent");
const kpiFissiPercent = $("#kpi-fissi-percent");
const btnToggleCostiFissi = $("#btn-toggle-costi-fissi");
const costiFissiPanel = $("#costi-fissi-panel");
const costiFissiCategoria = $("#costi-fissi-categoria");
const costiFissiDescrizione = $("#costi-fissi-descrizione");
const costiFissiAnno = $("#costi-fissi-anno");
const costiFissiImporto = $("#costi-fissi-importo");
const btnSalvaCostoFisso = $("#btn-salva-costo-fisso");
const costiFissiLista = $("#costi-fissi-lista");

function aggiornaKpiLayout() {
  const incasso = parseFloat(kpiIncassoInput.value) || 0;
  const food = parseFloat(kpiFoodcostInput.value) || 0;
  const lavoro = 0; // in futuro: calcolato da timbrature
  const fissiAnnui = costiFissiCache.reduce(
    (sum, c) => sum + (c.importo_annuo || c.importo || 0),
    0
  );
  // stima fissi periodo: semplifichiamo (anno/365 * 1 giorno, per ora)
  const fissi = fissiAnnui / 365;

  const netto = incasso - food - lavoro - fissi;

  kpiIncassoValue.textContent = formatEuro(incasso);
  kpiNettoValue.textContent = formatEuro(incasso - food);

  kpiLavoroImporto.textContent = formatEuro(lavoro);
  kpiFoodImporto.textContent = formatEuro(food);
  kpiFissiImporto.textContent = formatEuro(fissi);

  const percLavoro = incasso ? (lavoro / incasso) * 100 : 0;
  const percFood = incasso ? (food / incasso) * 100 : 0;
  const percFissi = incasso ? (fissi / incasso) * 100 : 0;

  kpiLavoroPercent.textContent = formatPercent(percLavoro);
  kpiFoodPercent.textContent = formatPercent(percFood);
  kpiFissiPercent.textContent = formatPercent(percFissi);

  // Margine operativo
  kpiMargineBadge.textContent = formatEuro(netto);
  kpiMargineBadge.classList.toggle("neg", netto < 0);
  kpiMargineBadge.classList.toggle("pos", netto >= 0);

  // Ago gauge: 0-100+ %
  const marginePerc = incasso ? (netto / incasso) * 100 : 0;
  let angle = Math.max(0, Math.min(180, 90 + marginePerc)); // 0% = 90deg, 100% = 190deg -> limitiamo 0..180
  if (kpiGaugeNeedle) {
    kpiGaugeNeedle.style.transform = `rotate(${angle}deg)`;
  }

  // BEP semplificato: incasso necessario per coprire food + fissi (lavoro = 0)
  const bep = food + fissi;
  kpiBepLabel.textContent = `BEP ${formatEuro(bep)}`;
}

async function caricaCostiFissi() {
  const { data, error } = await sb
    .from("costi_fissi")
    .select("*")
    .order("anno", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  costiFissiCache = data || [];
  renderCostiFissi();
}

function renderCostiFissi() {
  if (!costiFissiLista) return;
  costiFissiLista.innerHTML = "";

  if (!costiFissiCache.length) {
    costiFissiLista.innerHTML =
      "<tr><td colspan='4'>Nessun costo fisso registrato.</td></tr>";
    return;
  }

  costiFissiCache.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.categoria || ""}</td>
      <td>${c.descrizione || ""}</td>
      <td>${c.anno || ""}</td>
      <td>${formatEuro(c.importo_annuo || c.importo || 0)}</td>
    `;
    costiFissiLista.appendChild(tr);
  });

  aggiornaKpiLayout();
}

async function salvaCostoFissoSupabase() {
  const payload = {
    categoria: costiFissiCategoria.value.trim(),
    descrizione: costiFissiDescrizione.value.trim(),
    anno: costiFissiAnno.value ? parseInt(costiFissiAnno.value, 10) : null,
    importo_annuo: costiFissiImporto.value
      ? parseFloat(costiFissiImporto.value)
      : null,
  };

  const { error } = await sb.from("costi_fissi").insert(payload);
  if (error) {
    console.error(error);
    alert("Errore nel salvare il costo fisso.");
    return;
  }

  await caricaCostiFissi();
}

function initReportView() {
  if (reportData && !reportData.value) {
    reportData.value = new Date().toISOString().substring(0, 10);
  }
  caricaCostiFissi();
  aggiornaKpiLayout();
}

function initReport() {
  if (!kpiIncassoInput || !kpiFoodcostInput) return;

  [kpiIncassoInput, kpiFoodcostInput].forEach((el) => {
    el.addEventListener("input", aggiornaKpiLayout);
  });

  if (btnToggleCostiFissi && costiFissiPanel) {
    btnToggleCostiFissi.addEventListener("click", () => {
      const visible = costiFissiPanel.style.display === "block";
      costiFissiPanel.style.display = visible ? "none" : "block";
    });
  }

  if (btnSalvaCostoFisso) {
    btnSalvaCostoFisso.addEventListener("click", async () => {
      await salvaCostoFissoSupabase();
    });
  }
}

// =========================================================
// ====================== [8] MAGAZZINO =====================
// =========================================================

const magazzinoSearch = $("#magazzino-search");
const magazzinoSuggestions = $("#magazzino-suggestions");
const magazzinoTable = $("#magazzino-table");
const magazzinoLista = $("#magazzino-lista");

const magazzinoForm = $("#magazzino-form");
const magazzinoId = $("#magazzino-id");
const magazzinoDescrizione = $("#magazzino-descrizione");
const magazzinoCategoria = $("#magazzino-categoria");
const magazzinoUm = $("#magazzino-um");
const magazzinoScortaMinima = $("#magazzino-scorta-minima");
const magazzinoGiacenza = $("#magazzino-giacenza");
const btnMagazzinoNuovo = $("#btn-magazzino-nuovo");
const btnMagazzinoSalva = $("#btn-magazzino-salva");

async function caricaProdottiMagazzino() {
  const { data, error } = await sb
    .from("prodotti")
    .select("*")
    .order("descrizione", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  magazzinoProdottiCache = data || [];
  magazzinoSuggestions.innerHTML = "";
  magazzinoProdottiCache.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.descrizione || p.codice;
    magazzinoSuggestions.appendChild(opt);
  });
}

async function cercaProdotti(term) {
  if (!term) {
    magazzinoTable.style.display = "none";
    magazzinoLista.innerHTML = "";
    return;
  }

  const { data, error } = await sb
    .from("prodotti")
    .select("*")
    .ilike("descrizione", `%${term}%`)
    .order("descrizione", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const prodotti = data || [];
  magazzinoLista.innerHTML = "";

  if (!prodotti.length) {
    magazzinoLista.innerHTML =
      "<tr><td colspan='4'>Nessun prodotto trovato.</td></tr>";
    magazzinoTable.style.display = "table";
    return;
  }

  for (const p of prodotti) {
    const giacenza = await calcolaGiacenzaProdotto(p.id);

    const tr = document.createElement("tr");
    const stockLabel =
      giacenza <= (p.scorta_minima || 0)
        ? `<span class="magazzino-low">${giacenza}</span>`
        : giacenza.toFixed(3);

    tr.innerHTML = `
      <td>${p.codice || ""}</td>
      <td>${p.descrizione || ""}</td>
      <td>${p.categoria || ""}</td>
      <td>${stockLabel}</td>
    `;
    tr.addEventListener("click", () => {
      caricaProdottoDettaglio(p.id, giacenza);
    });
    magazzinoLista.appendChild(tr);
  }

  magazzinoTable.style.display = "table";
}

async function calcolaGiacenzaProdotto(prodottoId) {
  const { data, error } = await sb
    .from("magazzino_movimenti")
    .select("tipo, quantita")
    .eq("prodotto_id", prodottoId);

  if (error) {
    console.error(error);
    return 0;
  }

  let qta = 0;
  (data || []).forEach((m) => {
    const q = Number(m.quantita) || 0;
    if (m.tipo === "carico") qta += q;
    else if (m.tipo === "scarico") qta -= q;
  });

  return qta;
}

async function caricaProdottoDettaglio(id, giacenzaCalc) {
  const { data, error } = await sb
    .from("prodotti")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  magazzinoId.value = data.id;
  magazzinoDescrizione.value = data.descrizione || "";
  magazzinoCategoria.value = data.categoria || "";
  magazzinoUm.value = data.um || "";
  magazzinoScortaMinima.value = data.scorta_minima ?? "";
  magazzinoGiacenza.value =
    typeof giacenzaCalc === "number" ? giacenzaCalc.toFixed(3) : "";
}

async function salvaProdottoMagazzino() {
  const payload = {
    descrizione: magazzinoDescrizione.value.trim(),
    categoria: magazzinoCategoria.value.trim(),
    um: magazzinoUm.value.trim(),
    scorta_minima: magazzinoScortaMinima.value
      ? parseFloat(magazzinoScortaMinima.value)
      : null,
  };

  if (!payload.descrizione) {
    alert("Inserisci una descrizione prodotto.");
    return;
  }

  if (magazzinoId.value) {
    const { error } = await sb
      .from("prodotti")
      .update(payload)
      .eq("id", magazzinoId.value);
    if (error) {
      console.error(error);
      alert("Errore nel salvare il prodotto.");
      return;
    }
  } else {
    const { error } = await sb.from("prodotti").insert(payload);
    if (error) {
      console.error(error);
      alert("Errore nel creare il prodotto.");
      return;
    }
  }

  alert("Prodotto salvato.");
  await caricaProdottiMagazzino();
}

function resetFormMagazzino() {
  magazzinoId.value = "";
  magazzinoDescrizione.value = "";
  magazzinoCategoria.value = "";
  magazzinoUm.value = "";
  magazzinoScortaMinima.value = "";
  magazzinoGiacenza.value = "";
}

function initMagazzinoView() {
  caricaProdottiMagazzino();
  resetFormMagazzino();
}

function initMagazzino() {
  if (!magazzinoForm) return;

  magazzinoSearch.addEventListener("input", (e) => {
    const term = e.target.value.trim();
    cercaProdotti(term);
  });

  btnMagazzinoNuovo.addEventListener("click", () => {
    resetFormMagazzino();
  });

  btnMagazzinoSalva.addEventListener("click", async () => {
    await salvaProdottoMagazzino();
  });
}

// =========================================================
// =================== [9] THEME & INIT =====================
// =========================================================

function initTheme() {
  const saved = localStorage.getItem("ga_theme");
  if (saved === "light") {
    document.body.classList.add("theme-light");
    if (btnTheme) btnTheme.textContent = "☀️";
  } else {
    document.body.classList.remove("theme-light");
    if (btnTheme) btnTheme.textContent = "🌙";
  }

  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      document.body.classList.toggle("theme-light");
      const isLight = document.body.classList.contains("theme-light");
      localStorage.setItem("ga_theme", isLight ? "light" : "dark");
      btnTheme.textContent = isLight ? "☀️" : "🌙";
    });
  }
}

function initApp() {
  initTheme();
  initRoutingButtons();
  initLogout();
  initLogin();
  initTimbratura();
  initDipendenti();
  initAcquisti();
  initRicette();
  initReport();
  initMagazzino();
  restoreUserFromStorage();
}

// Avvio
document.addEventListener("DOMContentLoaded", initApp);
