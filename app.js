// Chiavi per localStorage
const CURRENT_USER_KEY = "ga_current_user_v1";
const THEME_KEY = "ga_theme_v1";

// ======================================================
//  INIZIALIZZAZIONE SICURA DOMCONTENTLOADED
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
  const supabase = window.supabaseClient;

  // ========= COSTANTI / STORAGE =========
  const CURRENT_USER_KEY = "ga_current_user_v1";
  const THEME_KEY = "ga_theme_v1";

  // ========= DOM BASE =========
  const body = document.body;

  const themeBtn = document.getElementById("btn-theme");
  const currentUserLabel = document.getElementById("current-user-label");
  const btnLogout = document.getElementById("btn-logout");

  const views = Array.from(document.querySelectorAll(".view"));
  const homeDipView = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");
  const routeButtons = Array.from(document.querySelectorAll("[data-route]"));

  // ========= LOGIN (DOM) =========
  const loginNomeInput = document.getElementById("login-nome");
  const loginPinInput = document.getElementById("login-pin");
  const loginRememberCheckbox = document.getElementById("login-remember");
  const btnLogin = document.getElementById("btn-login");

  // ========= TIMBRATURA (DOM) =========
  const viewTimbratura = document.getElementById("view-timbratura");
  const timbraturaUtenteNome = document.getElementById("timbratura-utente-nome");
  const timbraturaCanaleSelect = document.getElementById("timbratura-canale-select");
  const btnEntra = document.getElementById("btn-entra");
  const btnPausa = document.getElementById("btn-pausa");
  const btnEsci = document.getElementById("btn-esci");

  const btnTogglePresenze = document.getElementById("btn-toggle-presenze");
  const sezionePresenzeEl = document.getElementById("sezione-presenze");
  const presenzeListaEl = document.getElementById("presenze-lista");

  const riepilogoDipEl = document.getElementById("riepilogo-dip");
  const riepilogoCanaliEl = document.getElementById("riepilogo-canali");
  const attiviListaEl = document.getElementById("attivi-lista");
  const costoDipEl = document.getElementById("costo-dip");
  const costoCanaliEl = document.getElementById("costo-canali");
  const periodoSelect = document.getElementById("periodo-select");
  const btnToggleTimbrature = document.getElementById("btn-toggle-timbrature");
  const sezioneTimbratureDettaglio = document.getElementById("sezione-timbrature");
  const listaTimbratureEl = document.getElementById("timbrature-lista");

  // ========= DIPENDENTI (DOM) =========
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

 // ========= ACQUISTI / FATTURE =========
// ATTENZIONE: il codice usa la tabella "fatture_acquisto"
// e la colonna "data_documento" come data della fattura.

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
    <td><input type="number" step="0.001" class="input-pill riga-quantita" value="${row.quantita || ""}"/></td>
    <td><input type="number" step="0.01" class="input-pill riga-prezzo" value="${row.prezzo || ""}"/></td>
    <td><input type="number" step="0.01" class="input-pill riga-iva" value="${row.iva || ""}"/></td>
    <td><input type="number" step="0.01" class="input-pill riga-totale" value="${row.totale || ""}" readonly/></td>
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

  [
    quantitaInput,
    prezzoInput,
    ivaInput,
    codiceInput,
    descrizioneInput,
    categoriaInput,
    umInput,
  ].forEach((el) => {
    if (el) el.addEventListener("input", updateFromInputs);
  });

  if (btnDel) {
    btnDel.addEventListener("click", () => {
      const index = parseInt(tr.dataset.index || "0", 10);
      fatturaRighe.splice(index, 1);
      tr.remove();
      Array.from(fatturaRigheBody.querySelectorAll("tr")).forEach(
        (rowEl, i) => {
          rowEl.dataset.index = String(i);
        }
      );
      aggiornaTotaliFattura();
    });
  }
}

function aggiornaTotaliFattura() {
  let imponibileTot = 0;
  let ivaTot = 0;

  fatturaRighe.forEach((r) => {
    const q = parseNumber(r.quantita);
    const p = parseNumber(r.prezzo);
    const ivaPerc = parseNumber(r.iva);
    const imp = q * p;
    const ivaVal = (imp * ivaPerc) / 100;
    imponibileTot += imp;
    ivaTot += ivaVal;
  });

  const totaleDoc = imponibileTot + ivaTot;

  if (fatturaImponibileTotaleInput)
    fatturaImponibileTotaleInput.value = imponibileTot.toFixed(2);
  if (fatturaIvaTotaleInput)
    fatturaIvaTotaleInput.value = ivaTot.toFixed(2);
  if (fatturaTotaleDocumentoInput)
    fatturaTotaleDocumentoInput.value = totaleDoc.toFixed(2);
}

async function salvaFatturaSupabase() {
  if (!supabase) {
    alert("Supabase non inizializzato");
    return;
  }

  const numero = (fatturaNumeroInput?.value || "").trim();
  const dataStr = fatturaDataInput?.value || "";
  const fornitore = (fatturaFornitoreInput?.value || "").trim();
  const note = fatturaNoteInput?.value || "";

  if (!numero || !dataStr || !fornitore) {
    alert("Compila numero, data e fornitore");
    return;
  }

  if (!fatturaRighe.length) {
    alert("Inserisci almeno una riga di fattura");
    return;
  }

  const imponibileTot = parseNumber(
    fatturaImponibileTotaleInput?.value || ""
  );
  const ivaTot = parseNumber(fatturaIvaTotaleInput?.value || "");
  const totale = parseNumber(
    fatturaTotaleDocumentoInput?.value || ""
  );

  // ⚠️ ASSUNZIONE: la colonna si chiama "data_documento"
  // se in Supabase l'hai chiamata diversamente, cambia qui il nome.
  const fatturaPayload = {
    id: fatturaCorrenteId || undefined,
    numero,
    data_documento: dataStr, // es. "2025-11-27"
    fornitore,
    note,
    totale_imponibile: imponibileTot,
    totale_iva: ivaTot,
    totale_documento: totale,
  };

  const { data: fatturaSalvata, error } = await supabase
    .from("fatture_acquisto")
    .upsert(fatturaPayload)
    .select()
    .single();

  if (error) {
    console.error("Errore salvataggio fattura:", error);
    alert("Errore nel salvare la fattura");
    return;
  }

  fatturaCorrenteId = fatturaSalvata.id;

  // Cancello righe vecchie
  await supabase
    .from("fatture_acquisto_righe")
    .delete()
    .eq("fattura_id", fatturaCorrenteId);

  const righePayload = fatturaRighe.map((r) => ({
    fattura_id: fatturaCorrenteId,
    codice: r.codice || null,
    descrizione: r.descrizione || null,
    categoria: r.categoria || null,
    um: r.um || null,
    quantita: parseNumber(r.quantita),
    prezzo_unitario: parseNumber(r.prezzo),
    iva_percentuale: parseNumber(r.iva),
    totale_riga: parseNumber(r.totale),
  }));

  if (righePayload.length) {
    const { error: errRighe } = await supabase
      .from("fatture_acquisto_righe")
      .insert(righePayload);

    if (errRighe) {
      console.error("Errore salvataggio righe fattura:", errRighe);
      alert("Errore nel salvare le righe della fattura");
      return;
    }
  }

  alert("Fattura salvata");
  await caricaElencoFatture();
}

async function caricaElencoFatture() {
  if (!supabase || !fattureLista) return;

  const { data, error } = await supabase
    .from("fatture_acquisto")
    // ⚠️ stessa nota: uso "data_documento"
    .select("id, numero, data_documento, fornitore, totale_documento")
    .order("data_documento", { ascending: false });

  if (error) {
    console.error("Errore caricamento fatture:", error);
    return;
  }

  fattureLista.innerHTML = "";

  (data || []).forEach((f) => {
    const d = f.data_documento ? new Date(f.data_documento) : null;
    const day = d ? d.toLocaleDateString("it-IT") : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${day}</td>
      <td>${f.numero}</td>
      <td>${f.fornitore || ""}</td>
      <td>${formatEuro(f.totale_documento || 0)}</td>
      <td>
        <button type="button" class="app-button tiny gray" data-open-fattura="${f.id}">
          Apri
        </button>
      </td>
    `;
    fattureLista.appendChild(tr);
  });

  fattureLista.querySelectorAll("[data-open-fattura]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.getAttribute("data-open-fattura"), 10);
      await apriFattura(id);
    });
  });
}

async function apriFattura(id) {
  if (!supabase) return;

  const { data: fattura, error } = await supabase
    .from("fatture_acquisto")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Errore apertura fattura:", error);
    alert("Errore nel caricare la fattura");
    return;
  }

  fatturaCorrenteId = fattura.id;

  if (fatturaNumeroInput) fatturaNumeroInput.value = fattura.numero || "";
  if (fatturaDataInput)
    fatturaDataInput.value = fattura.data_documento
      ? String(fattura.data_documento).substring(0, 10)
      : "";
  if (fatturaFornitoreInput)
    fatturaFornitoreInput.value = fattura.fornitore || "";
  if (fatturaNoteInput) fatturaNoteInput.value = fattura.note || "";

  if (fatturaImponibileTotaleInput)
    fatturaImponibileTotaleInput.value =
      fattura.totale_imponibile != null
        ? fattura.totale_imponibile.toFixed(2)
        : "";
  if (fatturaIvaTotaleInput)
    fatturaIvaTotaleInput.value =
      fattura.totale_iva != null ? fattura.totale_iva.toFixed(2) : "";
  if (fatturaTotaleDocumentoInput)
    fatturaTotaleDocumentoInput.value =
      fattura.totale_documento != null
        ? fattura.totale_documento.toFixed(2)
        : "";

  const { data: righe, error: errRighe } = await supabase
    .from("fatture_acquisto_righe")
    .select("*")
    .eq("fattura_id", id)
    .order("id", { ascending: true });

  if (errRighe) {
    console.error("Errore righe fattura:", errRighe);
    alert("Errore nel caricare le righe della fattura");
    return;
  }

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

// Eventi pulsanti fatture
if (btnNuovaFattura) {
  btnNuovaFattura.addEventListener("click", (e) => {
    e.preventDefault();
    resetFatturaForm();
  });
}

if (btnSalvaFattura) {
  btnSalvaFattura.addEventListener("click", (e) => {
    e.preventDefault();
    salvaFatturaSupabase();
  });
}

if (btnAddRigaFattura) {
  btnAddRigaFattura.addEventListener("click", (e) => {
    e.preventDefault();
    creaRigaFattura();
  });
}

if (btnToggleFatture && fattureTable) {
  btnToggleFatture.addEventListener("click", () => {
    const visibile = fattureTable.style.display !== "none";
    fattureTable.style.display = visibile ? "none" : "table";
    btnToggleFatture.textContent = visibile
      ? "Mostra / Nascondi"
      : "Nascondi elenco";
  });
}


  // ========= RICETTE (DOM) =========
  const ricettaNomeInput = document.getElementById("ricetta-nome");
  const ricettaDescrizioneInput = document.getElementById("ricetta-descrizione");
  const ricettaNoteInput = document.getElementById("ricetta-note");
  const ricettaFotoInput = document.getElementById("ricetta-foto");
  const ricettaIngredientiContainer = document.getElementById("ricetta-ingredienti-container");
  const btnAddIngrediente = document.getElementById("btn-add-ingrediente");
  const btnSalvaRicetta = document.getElementById("btn-salva-ricetta");
  const ingredientiSuggestions = document.getElementById("ingredienti-suggestions");

 // ========= MAGAZZINO =========
// Usa tabella "prodotti" con colonne:
// id, codice, descrizione, categoria_id, um, scorta_minima

async function caricaMagazzinoDati() {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("prodotti")
    .select("id, codice, descrizione, categoria_id, um, scorta_minima")
    .order("descrizione", { ascending: true });

  if (error) {
    console.error("Errore caricamento magazzino:", error);
    return;
  }

  magazzinoDati = (data || []).map((p) => ({
    id: p.id,
    codice: p.codice || "",
    descrizione: p.descrizione || "",
    categoriaId: p.categoria_id ?? null,
    // per ora mostriamo l'id categoria; in futuro faremo join con tabella categorie
    categoria: p.categoria_id != null ? String(p.categoria_id) : "",
    um: p.um || "",
    scortaMinima: p.scorta_minima ?? null,
    giacenza: 0, // giacenza reale la calcoleremo dai movimenti in seguito
  }));

  renderMagazzinoLista(magazzinoDati);
  aggiornaMagazzinoSuggestions();
  aggiornaIngredientiSuggestionsDaMagazzino();
}

function renderMagazzinoLista(lista) {
  if (!magazzinoListaEl) return;

  magazzinoListaEl.innerHTML = "";

  (lista || []).forEach((p) => {
    const low = p.scortaMinima != null && p.giacenza <= p.scortaMinima;
    const giacenzaText = low
      ? `<span class="magazzino-low">${p.giacenza}</span>`
      : p.giacenza;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.codice || ""}</td>
      <td>${p.descrizione || ""}</td>
      <td>${p.categoria || ""}</td>
      <td>${giacenzaText}</td>
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

function popolaMagazzinoForm(p) {
  if (!p) {
    if (magazzinoIdInput) magazzinoIdInput.value = "";
    if (magazzinoDescrizioneInput) magazzinoDescrizioneInput.value = "";
    if (magazzinoCategoriaInput) magazzinoCategoriaInput.value = "";
    if (magazzinoUmInput) magazzinoUmInput.value = "";
    if (magazzinoScortaMinimaInput) magazzinoScortaMinimaInput.value = "";
    if (magazzinoGiacenzaInput) magazzinoGiacenzaInput.value = "";
    return;
  }

  if (magazzinoIdInput) magazzinoIdInput.value = p.id || "";
  if (magazzinoDescrizioneInput)
    magazzinoDescrizioneInput.value = p.descrizione || "";
  if (magazzinoCategoriaInput)
    // nel form inserisci l'id categoria (in attesa di implementare le categorie)
    magazzinoCategoriaInput.value =
      p.categoriaId != null ? String(p.categoriaId) : "";
  if (magazzinoUmInput) magazzinoUmInput.value = p.um || "";
  if (magazzinoScortaMinimaInput)
    magazzinoScortaMinimaInput.value =
      p.scortaMinima != null ? p.scortaMinima : "";
  if (magazzinoGiacenzaInput)
    magazzinoGiacenzaInput.value =
      p.giacenza != null ? p.giacenza : "";
}

async function salvaProdottoDaMagazzinoForm() {
  if (!supabase) return;

  const id = magazzinoIdInput?.value || null;
  const descrizione = (magazzinoDescrizioneInput?.value || "").trim();
  const categoriaIdRaw = (magazzinoCategoriaInput?.value || "").trim();
  const um = (magazzinoUmInput?.value || "").trim();
  const scortaMinima = parseNumber(
    magazzinoScortaMinimaInput?.value || ""
  );

  if (!descrizione) {
    alert("Inserisci la descrizione del prodotto");
    return;
  }

  const categoria_id =
    categoriaIdRaw !== "" ? parseInt(categoriaIdRaw, 10) || null : null;

  const payload = {
    id: id || undefined,
    descrizione,
    categoria_id,
    um: um || null,
    scorta_minima: scortaMinima || null,
    // niente colonna "giacenza" sul DB: la gestiremo con i movimenti
  };

  const { data, error } = await supabase
    .from("prodotti")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error("Errore salvataggio prodotto:", error);
    alert("Errore nel salvare il prodotto");
    return;
  }

  const nuovo = {
    id: data.id,
    codice: data.codice || "",
    descrizione: data.descrizione || "",
    categoriaId: data.categoria_id ?? null,
    categoria:
      data.categoria_id != null ? String(data.categoria_id) : "",
    um: data.um || "",
    scortaMinima: data.scorta_minima ?? null,
    giacenza: 0,
  };

  const idx = magazzinoDati.findIndex((p) => p.id === nuovo.id);
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

  // ========= REPORT KPI (DOM) =========
  const reportPeriodButtons = Array.from(document.querySelectorAll(".report-period-btn"));
  const reportDateInput = document.getElementById("report-data");

  const kpiIncassoInput = document.getElementById("kpi-incasso-input");
  const kpiFoodInput = document.getElementById("kpi-foodcost-input");

  const kpiIncassoValueEl = document.getElementById("kpi-incasso-value");
  const kpiNettoValueEl = document.getElementById("kpi-netto-value");
  const kpiMargineBadgeEl = document.getElementById("kpi-margine-badge");
  const kpiBepLabelEl = document.getElementById("kpi-bep-label");
  const kpiGaugeNeedleEl = document.getElementById("kpi-gauge-needle");

  const kpiLavoroImportoEl = document.getElementById("kpi-lavoro-importo");
  const kpiLavoroPercentEl = document.getElementById("kpi-lavoro-percent");
  const kpiFoodImportoEl = document.getElementById("kpi-food-importo");
  const kpiFoodPercentEl = document.getElementById("kpi-food-percent");
  const kpiFissiImportoEl = document.getElementById("kpi-fissi-importo");
  const kpiFissiPercentEl = document.getElementById("kpi-fissi-percent");

  const btnToggleCostiFissi = document.getElementById("btn-toggle-costi-fissi");
  const costiFissiPanel = document.getElementById("costi-fissi-panel");

  const costiFissiCategoriaInput = document.getElementById("costi-fissi-categoria");
  const costiFissiDescrizioneInput = document.getElementById("costi-fissi-descrizione");
  const costiFissiAnnoInput = document.getElementById("costi-fissi-anno");
  const costiFissiImportoInput = document.getElementById("costi-fissi-importo");
  const btnSalvaCostoFisso = document.getElementById("btn-salva-costo-fisso");
  const costiFissiListaBody = document.getElementById("costi-fissi-lista");

  // ========= STATO =========
  let currentUser = null;
  let dipendenti = [];
  let timbrature = [];
  let magazzinoDati = [];
  let fatturaCorrenteId = null;
  let fatturaRighe = [];
  let ricettaCorrenteId = null;
  let ricettaFotoCorrenteUrl = null;
  let periodoCorrenteTimbrature = "oggi"; // oggi/settimana/mese
  let kpiPeriodoCorrente = "giorno"; // giorno/settimana/mese/anno
  let costiFissi = [];

  // ========= UTILITY =========
  function parseNumber(val) {
    if (val === null || val === undefined) return 0;
    const num =
      typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
    return Number.isFinite(num) ? num : 0;
  }

  function formatEuro(val) {
    const num = parseNumber(val);
    return num.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatDataNascita(data) {
    if (!data) return "";
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("it-IT");
  }

  function isManagerRole(ruolo) {
    return (
      ruolo === "admin" ||
      ruolo === "manager_cucina" ||
      ruolo === "manager_sala"
    );
  }

  function setTodayOnDateInput(input) {
    if (!input) return;
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    input.value = `${yyyy}-${mm}-${dd}`;
  }

  function getDateFromInput(input) {
    if (!input || !input.value) return new Date();
    const d = new Date(input.value);
    if (Number.isNaN(d.getTime())) return new Date();
    return d;
  }

  function getPeriodRangeFromDate(baseDate, periodo) {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);

    let start = new Date(d);
    let end = new Date(d);

    if (periodo === "giorno") {
      end.setDate(start.getDate() + 1);
    } else if (periodo === "settimana") {
      const day = start.getDay() || 7;
      start.setDate(start.getDate() - (day - 1));
      end = new Date(start);
      end.setDate(start.getDate() + 7);
    } else if (periodo === "mese") {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    } else if (periodo === "anno") {
      start = new Date(d.getFullYear(), 0, 1);
      end = new Date(d.getFullYear() + 1, 0, 1);
    } else {
      end.setDate(start.getDate() + 1);
    }

    return { start, end };
  }

  function calcolaCostoOrario(tipo, retribuzioneBase, oreMensili, oreServizio) {
    const base = parseNumber(retribuzioneBase);
    if (!base) return 0;

    if (tipo === "orario") return base;
    if (tipo === "mensile") {
      const ore = parseNumber(oreMensili);
      if (!ore) return 0;
      return base / ore;
    }
    if (tipo === "servizio") {
      const ore = parseNumber(oreServizio);
      if (!ore) return 0;
      return base / ore;
    }
    return 0;
  }

  // ========= THEME =========
  function applyTheme(theme) {
    if (theme === "light") {
      body.classList.add("theme-light");
      if (themeBtn) themeBtn.textContent = "☀️";
    } else {
      body.classList.remove("theme-light");
      if (themeBtn) themeBtn.textContent = "🌙";
    }
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "dark";
    applyTheme(saved);
  }

  function toggleTheme() {
    const isLight = body.classList.contains("theme-light");
    const newTheme = isLight ? "dark" : "light";
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  }

  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
  loadTheme();

  // ========= HEADER / ROLE =========
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
        return "Dipendente";
    }
  }

  function updateHeaderUser() {
    if (!currentUserLabel) return;
    if (!currentUser) {
      currentUserLabel.textContent = "Nessun utente";
    } else {
      currentUserLabel.textContent = `${currentUser.nome} (${formatRuolo(
        currentUser.ruolo
      )})`;
    }
    if (btnLogout) btnLogout.style.display = currentUser ? "inline-block" : "none";
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

    if (managerMenu) managerMenu.style.display = modalita === "manager" ? "grid" : "none";
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
      if (byName) setCurrentUser(byName, true);
    } catch {
      // ignore
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      showLogin();
    });
  }

  // ========= LOGIN =========
  async function login(nome, pin) {
    const nomeTrim = (nome || "").trim();
    const pinTrim = (pin || "").trim();

    if (!nomeTrim || !pinTrim) {
      alert("Inserisci nome e PIN");
      return null;
    }

    // 1) ADMIN MANUALE: nome "admin" → entro sempre come admin
    if (nomeTrim.toLowerCase() === "admin") {
      const persist = !!(loginRememberCheckbox && loginRememberCheckbox.checked);
      const user = {
        id: null,
        nome: "Admin",
        ruolo: "admin",
        canalePrevalente: "NR",
        virtualAdmin: true,
      };
      setCurrentUser(user, persist);
      return user;
    }

    if (!supabase) {
      alert("Supabase non inizializzato");
      return null;
    }

    let match = null;

    // Prima per PIN (codice)
    let { data: byPin, error: errPin } = await supabase
      .from("dipendenti")
      .select(
        "id, nome, ruolo, canale_prevalente, codice, attivo, tipo_compenso, retribuzione_base, ore_mensili_contrattuali, ore_medie_per_servizio, costo_orario"
      )
      .eq("codice", pinTrim);

    if (errPin) {
      console.error("Errore login (PIN):", errPin);
      alert("Errore durante il login (PIN)");
      return null;
    }

    byPin = byPin || [];

    if (byPin.length === 1) {
      match = byPin[0];
    } else if (byPin.length > 1) {
      match = byPin.find(
        (d) =>
          String(d.nome || "").toLowerCase() === nomeTrim.toLowerCase()
      );
    }

    // Se ancora niente, provo per nome e controllo PIN
    if (!match) {
      let { data: byName, error: errName } = await supabase
        .from("dipendenti")
        .select(
          "id, nome, ruolo, canale_prevalente, codice, attivo, tipo_compenso, retribuzione_base, ore_mensili_contrattuali, ore_medie_per_servizio, costo_orario"
        )
        .eq("nome", nomeTrim);

      if (errName) {
        console.error("Errore login (nome):", errName);
        alert("Errore durante il login (nome)");
        return null;
      }

      byName = byName || [];
      match = byName.find((d) => String(d.codice || "") === pinTrim);
    }

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

    const persist = !!(loginRememberCheckbox && loginRememberCheckbox.checked);
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
        showManagerMenuAndRoute(routeFromHash);
      } else {
        if (routeFromHash === "timbratura") {
          showOnlyView("view-timbratura");
          await onRouteEnter("timbratura");
        } else {
          showHomeDipendente();
        }
      }
    });
  }

  // ========= TIMBRATURE =========
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

  async function caricaTimbratureDaSupabase() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("timbrature")
      .select("id, dipendente_id, dip_nome, canale, tipo, ora, timestamp")
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Errore caricamento timbrature:", error);
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
    aggiornaRiepilogoTimbrature();
  }

  function formatDurationMinutes(totalMinutes) {
    const ore = Math.floor(totalMinutes / 60);
    const min = Math.round(totalMinutes % 60);
    return `${ore}h ${min.toString().padStart(2, "0")}m`;
  }

  function aggiornaTabellaTimbrature() {
    if (!listaTimbratureEl) return;
    listaTimbratureEl.innerHTML = "";
    timbrature.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.ora || ""}</td>
        <td>${t.dip}</td>
        <td>${t.canale}</td>
        <td>${t.tipo}</td>
      `;
      listaTimbratureEl.appendChild(tr);
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

  function aggiornaRiepilogoTimbrature() {
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
    if (periodoCorrenteTimbrature === "settimana")
      startPeriodoMs = startSettimana.getTime();
    if (periodoCorrenteTimbrature === "mese")
      startPeriodoMs = startMese.getTime();

    const lastEntrata = {};

    timbrature
      .filter((t) => t.timestamp && t.timestamp >= startPeriodoMs)
      .forEach((t) => {
        if (t.tipo === "Entrata") {
          lastEntrata[t.dip] = t;
        } else if (t.tipo === "Uscita") {
          const inEv = lastEntrata[t.dip];
          if (inEv && inEv.canale === t.canale) {
            const diffMs = t.timestamp - inEv.timestamp;
            if (diffMs > 0) {
              const minuti = diffMs / 60000;
              if (!perDip[t.dip]) perDip[t.dip] = 0;
              perDip[t.dip] += minuti;

              if (!perCanale[t.canale]) perCanale[t.canale] = 0;
              perCanale[t.canale] += minuti;
            }
          }
          delete lastEntrata[t.dip];
        }
      });

    // Attivi adesso
    attiviListaEl.innerHTML = "";
    const attiviOra = {};
    timbrature.forEach((t) => {
      if (!t.timestamp) return;
      if (t.tipo === "Entrata") {
        attiviOra[t.dip] = t;
      } else if (t.tipo === "Uscita") {
        delete attiviOra[t.dip];
      }
    });

    Object.values(attiviOra).forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.dip}</td>
        <td>${t.canale}</td>
        <td>Dentro</td>
      `;
      attiviListaEl.appendChild(tr);
    });

    // Riepilogo ore/costi
    riepilogoDipEl.innerHTML = "";
    riepilogoCanaliEl.innerHTML = "";

    let costoTotDip = 0;
    let costoTotCanali = 0;

    Object.entries(perDip).forEach(([dipNome, minuti]) => {
      const ore = minuti / 60;
      const dip = dipendenti.find((d) => d.nome === dipNome);
      const costoOra = dip?.costoOrario || 0;
      const costo = ore * costoOra;
      costoTotDip += costo;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dipNome}</td>
        <td>${formatDurationMinutes(minuti)}</td>
        <td>${formatEuro(costo)}</td>
      `;
      riepilogoDipEl.appendChild(tr);
    });

    Object.entries(perCanale).forEach(([canale, minuti]) => {
      const ore = minuti / 60;
      let costoCanale = 0;

      Object.entries(perDip).forEach(([dipNome, minutiDip]) => {
        const d = dipendenti.find((x) => x.nome === dipNome);
        if (!d) return;
        const costoOra = d.costoOrario || 0;
        costoCanale += (minutiDip / 60) * costoOra;
      });

      costoTotCanali += costoCanale;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${canale}</td>
        <td>${formatDurationMinutes(minuti)}</td>
        <td>${formatEuro(costoCanale)}</td>
      `;
      riepilogoCanaliEl.appendChild(tr);
    });

    if (costoDipEl) costoDipEl.textContent = formatEuro(costoTotDip);
    if (costoCanaliEl) costoCanaliEl.textContent = formatEuro(costoTotCanali);
  }

  async function registraTimbratura(tipo) {
    if (!supabase || !currentUser) {
      alert("Devi essere loggato per timbrare");
      return;
    }

    const canale =
      timbraturaCanaleSelect?.value || currentUser.canalePrevalente || "NR";

    const eventiDip = timbrature
      .filter((t) => t.dip === currentUser.nome)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    let statoInside = false;
    let canaleDentro = null;

    eventiDip.forEach((ev) => {
      if (ev.tipo === "Entrata") {
        statoInside = true;
        canaleDentro = ev.canale;
      } else if (ev.tipo === "Uscita") {
        statoInside = false;
        canaleDentro = null;
      }
    });

    if (tipo === "Entrata" && statoInside) {
      alert("Hai già una entrata aperta.");
      return;
    }

    if (tipo !== "Entrata" && !statoInside) {
      alert("Non puoi registrare Pausa/Uscita senza una entrata aperta.");
      return;
    }

    const now = new Date();
    const ora = now.toTimeString().slice(0, 5);

    const payload = {
      dipendente_id: currentUser.id,
      dip_nome: currentUser.nome,
      canale: statoInside ? canaleDentro : canale,
      tipo,
      ora,
      timestamp: now.toISOString(),
    };

    const { data, error } = await supabase
      .from("timbrature")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Errore timbratura:", error);
      alert("Errore nel registrare la timbratura");
      return;
    }

    const salvato = {
      ...payload,
      id: data.id,
      timestamp: new Date(data.timestamp).getTime(),
    };

    timbrature.push(salvato);
    aggiornaTabellaTimbrature();
    aggiornaRiepilogoTimbrature();
    aggiornaKpiLavoroSeServe();
  }

  if (btnEntra) btnEntra.addEventListener("click", () => registraTimbratura("Entrata"));
  if (btnPausa) btnPausa.addEventListener("click", () => registraTimbratura("Pausa"));
  if (btnEsci) btnEsci.addEventListener("click", () => registraTimbratura("Uscita"));

  if (periodoSelect) {
    periodoSelect.addEventListener("change", () => {
      periodoCorrenteTimbrature = periodoSelect.value || "oggi";
      aggiornaRiepilogoTimbrature();
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

  // ========= DIPENDENTI =========
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

  if (dipTipoCompenso) dipTipoCompenso.addEventListener("change", aggiornaUICompenso);
  if (dipRetribuzioneBase) dipRetribuzioneBase.addEventListener("input", aggiornaUICompenso);
  if (dipOreMensili) dipOreMensili.addEventListener("input", aggiornaUICompenso);
  if (dipOreServizio) dipOreServizio.addEventListener("input", aggiornaUICompenso);

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
      return;
    }

    dipendenti = (data || []).map((row) => ({
      id: row.id,
      nome: row.nome,
      mansione: row.mansione,
      dataNascita: row.data_nascita,
      residenza: row.residenza,
      telefono: row.telefono,
      email: row.email,
      ruolo: row.ruolo,
      tipoCompenso: row.tipo_compenso || "orario",
      retribuzioneBase: row.retribuzione_base ?? null,
      oreMensili: row.ore_mensili_contrattuali ?? null,
      oreServizio: row.ore_medie_per_servizio ?? null,
      costoOrario: row.costo_orario ?? 0,
      codice: row.codice,
      canalePrevalente: row.canale_prevalente || "NR",
      attivo: row.attivo !== false,
    }));

    renderDipendenti();
    applyRoleVisibility();
    aggiornaKpiLavoroSeServe();
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
    const retribuzioneBase = parseNumber(dipRetribuzioneBase?.value || "");
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
    aggiornaKpiLavoroSeServe();

    if (dipNome) {
      dipNome.value = "";
      dipNome.dataset.editIndex = "";
    }
    if (dipMansione) dipMansione.value = "";
    if (dipDataNascita) dipDataNascita.value = "";
    if (dipResidenza) dipResidenza.value = "";
    if (dipTelefono) dipTelefono.value = "";
    if (dipEmail) dipEmail.value = "";
    if (dipRuolo) dipRuolo.value = "addetto_cucina";
    if (dipTipoCompenso) dipTipoCompenso.value = "orario";
    if (dipRetribuzioneBase) dipRetribuzioneBase.value = "";
    if (dipOreMensili) dipOreMensili.value = "";
    if (dipOreServizio) dipOreServizio.value = "";
    if (dipCosto) dipCosto.value = "";
    if (dipCodice) dipCodice.value = "";
    if (dipCanale) dipCanale.value = "NR";
    if (dipAttivo) dipAttivo.checked = true;
  }

  if (btnAddDip) {
    btnAddDip.addEventListener("click", (e) => {
      e.preventDefault();
      onSubmitDipendente();
    });
  }

  // ========= ACQUISTI / FATTURE =========
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
      <td><input type="number" step="0.001" class="input-pill riga-quantita" value="${row.quantita ||
        ""}"/></td>
      <td><input type="number" step="0.01" class="input-pill riga-prezzo" value="${row.prezzo ||
        ""}"/></td>
      <td><input type="number" step="0.01" class="input-pill riga-iva" value="${row.iva ||
        ""}"/></td>
      <td><input type="number" step="0.01" class="input-pill riga-totale" value="${row.totale ||
        ""}" readonly/></td>
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

      r.codice = codiceInput.value;
      r.descrizione = descrizioneInput.value;
      r.categoria = categoriaInput.value;
      r.um = umInput.value;
      r.quantita = parseNumber(quantitaInput.value);
      r.prezzo = parseNumber(prezzoInput.value);
      r.iva = parseNumber(ivaInput.value);
      const imponibile = r.quantita * r.prezzo;
      const ivaVal = (imponibile * r.iva) / 100;
      r.totale = imponibile + ivaVal;

      if (totaleInput) totaleInput.value = r.totale.toFixed(2);
      aggiornaTotaliFattura();
    }

    [
      quantitaInput,
      prezzoInput,
      ivaInput,
      codiceInput,
      descrizioneInput,
      categoriaInput,
      umInput,
    ].forEach((el) => {
      if (el) el.addEventListener("input", updateFromInputs);
    });

    if (btnDel) {
      btnDel.addEventListener("click", () => {
        const index = parseInt(tr.dataset.index || "0", 10);
        fatturaRighe.splice(index, 1);
        tr.remove();
        Array.from(fatturaRigheBody.querySelectorAll("tr")).forEach(
          (rowEl, i) => {
            rowEl.dataset.index = String(i);
          }
        );
        aggiornaTotaliFattura();
      });
    }
  }

  function aggiornaTotaliFattura() {
    let imponibileTot = 0;
    let ivaTot = 0;

    fatturaRighe.forEach((r) => {
      const q = parseNumber(r.quantita);
      const p = parseNumber(r.prezzo);
      const ivaPerc = parseNumber(r.iva);
      const imp = q * p;
      const ivaVal = (imp * ivaPerc) / 100;
      imponibileTot += imp;
      ivaTot += ivaVal;
    });

    const totaleDoc = imponibileTot + ivaTot;

    if (fatturaImponibileTotaleInput)
      fatturaImponibileTotaleInput.value = imponibileTot.toFixed(2);
    if (fatturaIvaTotaleInput)
      fatturaIvaTotaleInput.value = ivaTot.toFixed(2);
    if (fatturaTotaleDocumentoInput)
      fatturaTotaleDocumentoInput.value = totaleDoc.toFixed(2);
  }

  async function salvaFatturaSupabase() {
    if (!supabase) return;

    const numero = (fatturaNumeroInput?.value || "").trim();
    const dataStr = fatturaDataInput?.value || "";
    const fornitore = (fatturaFornitoreInput?.value || "").trim();
    const note = fatturaNoteInput?.value || "";

    if (!numero) {
      alert("Inserisci il numero fattura");
      return;
    }

    const data = dataStr ? new Date(dataStr).toISOString() : null;
    const imponibileTot = parseNumber(
      fatturaImponibileTotaleInput?.value || ""
    );
    const ivaTot = parseNumber(fatturaIvaTotaleInput?.value || "");
    const totale = parseNumber(
      fatturaTotaleDocumentoInput?.value || ""
    );

    const fatturaPayload = {
      id: fatturaCorrenteId || undefined,
      numero,
      data,
      fornitore,
      note,
      imponibile_totale: imponibileTot,
      iva_totale: ivaTot,
      totale_documento: totale,
    };

    const { data: fatturaSalvata, error } = await supabase
      .from("fatture")
      .upsert(fatturaPayload)
      .select()
      .single();

    if (error) {
      console.error("Errore salvataggio fattura:", error);
      alert("Errore nel salvare la fattura");
      return;
    }

    fatturaCorrenteId = fatturaSalvata.id;

    await supabase.from("fatture_righe").delete().eq("fattura_id", fatturaCorrenteId);

    const righePayload = fatturaRighe.map((r) => ({
      fattura_id: fatturaCorrenteId,
      codice: r.codice || null,
      descrizione: r.descrizione || null,
      categoria: r.categoria || null,
      um: r.um || null,
      quantita: parseNumber(r.quantita),
      prezzo: parseNumber(r.prezzo),
      iva: parseNumber(r.iva),
      totale: parseNumber(r.totale),
    }));

    if (righePayload.length) {
      const { error: errRighe } = await supabase
        .from("fatture_righe")
        .insert(righePayload);

      if (errRighe) {
        console.error("Errore salvataggio righe fattura:", errRighe);
        alert("Errore nel salvare le righe della fattura");
      }
    }

    alert("Fattura salvata");
    await caricaElencoFatture();
  }

  async function caricaElencoFatture() {
    if (!supabase || !fattureLista) return;

    const { data, error } = await supabase
      .from("fatture")
      .select("id, numero, data, fornitore, totale_documento")
      .order("data", { ascending: false });

    if (error) {
      console.error("Errore caricamento fatture:", error);
      return;
    }

    fattureLista.innerHTML = "";

    (data || []).forEach((f) => {
      const d = f.data ? new Date(f.data) : null;
      const day = d ? d.toLocaleDateString("it-IT") : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${day}</td>
        <td>${f.numero}</td>
        <td>${f.fornitore || ""}</td>
        <td>${formatEuro(f.totale_documento || 0)}</td>
        <td>
          <button type="button" class="app-button tiny gray" data-open-fattura="${f.id}">Apri</button>
        </td>
      `;
      fattureLista.appendChild(tr);
    });

    fattureLista.querySelectorAll("[data-open-fattura]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = parseInt(btn.getAttribute("data-open-fattura"), 10);
        await apriFattura(id);
      });
    });
  }

  async function apriFattura(id) {
    if (!supabase) return;

    const { data: fattura, error } = await supabase
      .from("fatture")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Errore apertura fattura:", error);
      return;
    }

    fatturaCorrenteId = fattura.id;

    if (fatturaNumeroInput) fatturaNumeroInput.value = fattura.numero || "";
    if (fatturaDataInput)
      fatturaDataInput.value = fattura.data
        ? fattura.data.substring(0, 10)
        : "";
    if (fatturaFornitoreInput)
      fatturaFornitoreInput.value = fattura.fornitore || "";
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

    const { data: righe, error: errRighe } = await supabase
      .from("fatture_righe")
      .select("*")
      .eq("fattura_id", id);

    if (errRighe) {
      console.error("Errore righe fattura:", errRighe);
      return;
    }

    fatturaRighe = [];
    if (fatturaRigheBody) fatturaRigheBody.innerHTML = "";
    (righe || []).forEach((r) => creaRigaFattura(r));
  }

  if (btnNuovaFattura) {
    btnNuovaFattura.addEventListener("click", (e) => {
      e.preventDefault();
      resetFatturaForm();
    });
  }

  if (btnSalvaFattura) {
    btnSalvaFattura.addEventListener("click", (e) => {
      e.preventDefault();
      salvaFatturaSupabase();
    });
  }

  if (btnAddRigaFattura) {
    btnAddRigaFattura.addEventListener("click", (e) => {
      e.preventDefault();
      creaRigaFattura();
    });
  }

  if (btnToggleFatture && fattureTable) {
    btnToggleFatture.addEventListener("click", () => {
      const visibile = fattureTable.style.display !== "none";
      fattureTable.style.display = visibile ? "none" : "table";
      btnToggleFatture.textContent = visibile
        ? "Mostra / Nascondi"
        : "Nascondi elenco";
    });
  }

  // ========= RICETTE (placeholder) =========
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

  if (btnAddIngrediente) {
    btnAddIngrediente.addEventListener("click", (e) => {
      e.preventDefault();
      creaRigaIngrediente();
    });
  }

  async function caricaProdottiSuggerimentiIngredienti() {
    if (!magazzinoDati.length) {
      await caricaMagazzinoDati();
    }
    aggiornaIngredientiSuggestionsDaMagazzino();
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

  if (btnSalvaRicetta) {
    btnSalvaRicetta.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Salvataggio ricette da completare in una fase successiva 😊");
    });
  }

  // ========= MAGAZZINO =========
  async function caricaMagazzinoDati() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("prodotti")
      .select("id, codice, descrizione, categoria, um, scorta_minima, giacenza")
      .order("descrizione", { ascending: true });

    if (error) {
      console.error("Errore caricamento magazzino:", error);
      return;
    }

    magazzinoDati = (data || []).map((p) => ({
      id: p.id,
      codice: p.codice,
      descrizione: p.descrizione,
      categoria: p.categoria,
      um: p.um,
      scortaMinima: p.scorta_minima ?? null,
      giacenza: p.giacenza ?? 0,
    }));

    renderMagazzinoLista(magazzinoDati);
    aggiornaMagazzinoSuggestions();
    aggiornaIngredientiSuggestionsDaMagazzino();
  }

  function renderMagazzinoLista(lista) {
    if (!magazzinoListaEl) return;

    magazzinoListaEl.innerHTML = "";

    (lista || []).forEach((p) => {
      const tr = document.createElement("tr");
      const low = p.scortaMinima != null && p.giacenza <= p.scortaMinima;
      tr.innerHTML = `
        <td>${p.codice || ""}</td>
        <td>${p.descrizione || ""}</td>
        <td>${p.categoria || ""}</td>
        <td>
          ${low ? `<span class="magazzino-low">${p.giacenza}</span>` : p.giacenza}
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

  function popolaMagazzinoForm(p) {
    if (!p) {
      if (magazzinoIdInput) magazzinoIdInput.value = "";
      if (magazzinoDescrizioneInput) magazzinoDescrizioneInput.value = "";
      if (magazzinoCategoriaInput) magazzinoCategoriaInput.value = "";
      if (magazzinoUmInput) magazzinoUmInput.value = "";
      if (magazzinoScortaMinimaInput) magazzinoScortaMinimaInput.value = "";
      if (magazzinoGiacenzaInput) magazzinoGiacenzaInput.value = "";
      return;
    }

    if (magazzinoIdInput) magazzinoIdInput.value = p.id || "";
    if (magazzinoDescrizioneInput)
      magazzinoDescrizioneInput.value = p.descrizione || "";
    if (magazzinoCategoriaInput)
      magazzinoCategoriaInput.value = p.categoria || "";
    if (magazzinoUmInput) magazzinoUmInput.value = p.um || "";
    if (magazzinoScortaMinimaInput)
      magazzinoScortaMinimaInput.value =
        p.scortaMinima != null ? p.scortaMinima : "";
    if (magazzinoGiacenzaInput)
      magazzinoGiacenzaInput.value =
        p.giacenza != null ? p.giacenza : "";
  }

  async function salvaProdottoDaMagazzinoForm() {
    if (!supabase) return;

    const id = magazzinoIdInput?.value || null;
    const descrizione = (magazzinoDescrizioneInput?.value || "").trim();
    const categoria = (magazzinoCategoriaInput?.value || "").trim();
    const um = (magazzinoUmInput?.value || "").trim();
    const scortaMinima = parseNumber(
      magazzinoScortaMinimaInput?.value || ""
    );
    const giacenza = parseNumber(magazzinoGiacenzaInput?.value || "");

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
      giacenza,
    };

    const { data, error } = await supabase
      .from("prodotti")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Errore salvataggio prodotto:", error);
      alert("Errore nel salvare il prodotto");
      return;
    }

    const nuovo = {
      id: data.id,
      descrizione: data.descrizione,
      categoria: data.categoria,
      um: data.um,
      scortaMinima: data.scorta_minima ?? null,
      giacenza: data.giacenza ?? 0,
      codice: data.codice || null,
    };

    const idx = magazzinoDati.findIndex((p) => p.id === nuovo.id);
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

  // ========= KPI / REPORT =========
  function calcolaQuotaCostiFissiPeriodo(periodo) {
    const totaleAnnuale = (costiFissi || []).reduce((sum, row) => {
      const v = parseNumber(row.importo_annuo);
      return sum + v;
    }, 0);

    let quota = 0;
    if (totaleAnnuale <= 0) {
      return { quota: 0, totaleAnnuale: 0 };
    }

    switch (periodo) {
      case "giorno":
        quota = totaleAnnuale / 365;
        break;
      case "settimana":
        quota = totaleAnnuale / 52;
        break;
      case "mese":
        quota = totaleAnnuale / 12;
        break;
      case "anno":
      default:
        quota = totaleAnnuale;
        break;
    }

    return { quota, totaleAnnuale };
  }

  function calcolaCostoLavoroPeriodo(start, end) {
    if (!timbrature.length || !dipendenti.length) return 0;

    const byDip = {};
    const events = timbrature
      .filter((t) => t.timestamp)
      .sort((a, b) => a.timestamp - b.timestamp);

    const lastEntrata = {};

    events.forEach((t) => {
      if (t.tipo === "Entrata") {
        lastEntrata[t.dip] = t;
      } else if (t.tipo === "Uscita") {
        const inEv = lastEntrata[t.dip];
        if (!inEv) return;

        const inTs = inEv.timestamp;
        const outTs = t.timestamp;
        if (outTs <= start.getTime() || inTs >= end.getTime()) {
          delete lastEntrata[t.dip];
          return;
        }

        const from = Math.max(inTs, start.getTime());
        const to = Math.min(outTs, end.getTime());
        if (to > from) {
          const min = (to - from) / 60000;
          if (!byDip[t.dip]) byDip[t.dip] = 0;
          byDip[t.dip] += min;
        }

        delete lastEntrata[t.dip];
      }
    });

    let costoTotale = 0;
    Object.entries(byDip).forEach(([nomeDip, min]) => {
      const d = dipendenti.find((x) => x.nome === nomeDip);
      if (!d) return;
      const costoOra = d.costoOrario || 0;
      const ore = min / 60;
      costoTotale += ore * costoOra;
    });

    return costoTotale;
  }

  function aggiornaGauge(incassoVal, bepVal) {
    if (!kpiGaugeNeedleEl) return;

    if (bepVal <= 0) {
      kpiGaugeNeedleEl.style.transform = "rotate(-90deg)";
      return;
    }

    const ratio = incassoVal / bepVal;
    const clamped = Math.max(0, Math.min(ratio, 2)); // 0..2
    const angle = -90 + clamped * 90; // -90..+90

    kpiGaugeNeedleEl.style.transform = `rotate(${angle}deg)`;
  }

  function aggiornaKpiReport() {
    if (!reportDateInput) return;

    const dataRif = getDateFromInput(reportDateInput);
    const periodo = kpiPeriodoCorrente || "giorno";
    const { start, end } = getPeriodRangeFromDate(dataRif, periodo);

    const incassoVal = parseNumber(kpiIncassoInput?.value || "");
    const foodVal = parseNumber(kpiFoodInput?.value || "");
    const { quota: fissiVal } = calcolaQuotaCostiFissiPeriodo(periodo);
    const lavoroVal = calcolaCostoLavoroPeriodo(start, end);

    const totaleCosti = lavoroVal + foodVal + fissiVal;
    const nettoVal = incassoVal - foodVal;
    const margineVal = incassoVal - totaleCosti;
    const bepVal = totaleCosti;

    if (kpiIncassoValueEl)
      kpiIncassoValueEl.textContent = formatEuro(incassoVal);
    if (kpiNettoValueEl)
      kpiNettoValueEl.textContent = formatEuro(nettoVal);

    if (kpiMargineBadgeEl) {
      kpiMargineBadgeEl.textContent = formatEuro(margineVal);
      kpiMargineBadgeEl.classList.remove("pos", "neg");
      kpiMargineBadgeEl.classList.add(margineVal >= 0 ? "pos" : "neg");
    }

    if (kpiBepLabelEl) {
      kpiBepLabelEl.textContent = `BEP ${formatEuro(bepVal)}`;
    }

    if (kpiLavoroImportoEl)
      kpiLavoroImportoEl.textContent = formatEuro(lavoroVal);
    if (kpiFoodImportoEl)
      kpiFoodImportoEl.textContent = formatEuro(foodVal);
    if (kpiFissiImportoEl)
      kpiFissiImportoEl.textContent = formatEuro(fissiVal);

    const basePerc = incassoVal > 0 ? incassoVal : totaleCosti || 1;

    const lavoroPerc = (lavoroVal / basePerc) * 100;
    const foodPerc = (foodVal / basePerc) * 100;
    const fissiPerc = (fissiVal / basePerc) * 100;

    if (kpiLavoroPercentEl) {
      kpiLavoroPercentEl.textContent =
        totaleCosti > 0 ? `${lavoroPerc.toFixed(0)}%` : "0%";
    }
    if (kpiFoodPercentEl) {
      kpiFoodPercentEl.textContent =
        totaleCosti > 0 ? `${foodPerc.toFixed(0)}%` : "0%";
    }
    if (kpiFissiPercentEl) {
      kpiFissiPercentEl.textContent =
        totaleCosti > 0 ? `${fissiPerc.toFixed(0)}%` : "0%";
    }

    aggiornaGauge(incassoVal, bepVal);
  }

  function aggiornaKpiLavoroSeServe() {
    const currentVisible = views.find(
      (v) => v.style.display === "block" && v.id === "view-report"
    );
    if (currentVisible) {
      aggiornaKpiReport();
    }
  }

  async function caricaCostiFissiDaSupabase() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("costi_fissi")
      .select("*")
      .order("anno_riferimento", { ascending: false })
      .order("categoria", { ascending: true });

    if (error) {
      console.error("Errore caricamento costi_fissi:", error);
      alert("Errore Supabase costi fissi");
      return;
    }

    costiFissi = data || [];
    renderCostiFissi();
    aggiornaKpiReport();
  }

  function renderCostiFissi() {
    if (!costiFissiListaBody) return;

    costiFissiListaBody.innerHTML = "";

    costiFissi.forEach((riga) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${riga.categoria || ""}</td>
        <td>${riga.descrizione || ""}</td>
        <td>${riga.anno_riferimento || ""}</td>
        <td>${formatEuro(riga.importo_annuo || 0)}</td>
      `;
      costiFissiListaBody.appendChild(tr);
    });
  }

  async function salvaCostoFissoSupabase() {
    if (!supabase) return;

    const categoria = (costiFissiCategoriaInput?.value || "").trim();
    const descrizione = (costiFissiDescrizioneInput?.value || "").trim();
    const annoVal = costiFissiAnnoInput?.value || "";
    const importoVal = costiFissiImportoInput?.value || "";

    if (!categoria) {
      alert("Inserisci la categoria del costo fisso");
      return;
    }
    if (!annoVal) {
      alert("Inserisci l'anno di riferimento");
      return;
    }
    if (!importoVal) {
      alert("Inserisci l'importo annuo");
      return;
    }

    const anno = parseInt(annoVal, 10) || new Date().getFullYear();
    const importoAnnuo = parseNumber(importoVal);

    const payload = {
      categoria,
      descrizione: descrizione || null,
      anno_riferimento: anno,
      importo_annuo: importoAnnuo,
    };

    const { data, error } = await supabase
      .from("costi_fissi")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Errore salvataggio costo fisso:", error);
      alert("Errore Supabase costo fisso");
      return;
    }

    costiFissi.unshift(data);
    renderCostiFissi();
    aggiornaKpiReport();

    if (costiFissiCategoriaInput) costiFissiCategoriaInput.value = "";
    if (costiFissiDescrizioneInput) costiFissiDescrizioneInput.value = "";
    if (costiFissiImportoInput) costiFissiImportoInput.value = "";
  }

  if (btnToggleCostiFissi && costiFissiPanel) {
    btnToggleCostiFissi.addEventListener("click", () => {
      const hidden =
        costiFissiPanel.style.display === "none" ||
        costiFissiPanel.style.display === "";
      costiFissiPanel.style.display = hidden ? "block" : "none";
      btnToggleCostiFissi.textContent = hidden
        ? "Nascondi costi fissi"
        : "Mostra / Nascondi costi fissi";
    });
  }

  if (btnSalvaCostoFisso) {
    btnSalvaCostoFisso.addEventListener("click", (e) => {
      e.preventDefault();
      salvaCostoFissoSupabase();
    });
  }

  if (reportPeriodButtons.length) {
    reportPeriodButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        reportPeriodButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const p = btn.getAttribute("data-period") || "giorno";
        kpiPeriodoCorrente = p;
        aggiornaKpiReport();
      });
    });
  }

  if (reportDateInput) {
    setTodayOnDateInput(reportDateInput);
    reportDateInput.addEventListener("change", () => {
      aggiornaKpiReport();
    });
  }

  if (kpiIncassoInput) {
    kpiIncassoInput.addEventListener("input", aggiornaKpiReport);
  }
  if (kpiFoodInput) {
    kpiFoodInput.addEventListener("input", aggiornaKpiReport);
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
        await caricaProdottiSuggerimentiIngredienti();
        resetFormRicetta();
        break;
      case "acquisti":
        resetFatturaForm();
        await caricaElencoFatture();
        break;
      case "magazzino":
        await caricaMagazzinoDati();
        popolaMagazzinoForm(null);
        break;
      case "report":
        if (!reportDateInput || !reportDateInput.value) {
          setTodayOnDateInput(reportDateInput);
        }
        await caricaDipendentiDaSupabase();
        await caricaTimbratureDaSupabase();
        await caricaCostiFissiDaSupabase();
        aggiornaKpiReport();
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
      const hashRoute =
        window.location.hash.replace("#", "") || "timbratura";
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
}); // fine DOMContentLoaded
