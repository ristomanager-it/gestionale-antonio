// =====================================
//  PREVENTIVI & PRENOTAZIONI
// =====================================

// Usa il client Supabase già creato in index.html
const supabase = window.supabaseClient;

// Stato in memoria
let currentPreventivo = null;
let currentPreventivoMenu = [];
let currentPreventivoExtra = [];
let preventiviCache = []; // archivio per la ricerca

// Cache per suggerimenti ricette
let ricetteSuggestionsCache = [];

// -----------------------------
//  Selettori DOM
// -----------------------------
const viewPreventivi = document.getElementById("view-preventivi");
const preventiviListContainer = document.getElementById("preventivi-list");
const preventivoForm = document.getElementById("preventivo-form");

// filtri ricerca archivio
const inputPreventiviSearch = document.getElementById("preventivi-search");
const selectPreventiviStato = document.getElementById("preventivi-stato-filter");

// campi preventivo
const inputPrevId = document.getElementById("preventivo-id");

const inputClienteId = document.getElementById("preventivo-cliente-id");
const inputClienteNome = document.getElementById("preventivo-cliente-nome");
const inputClienteCognome = document.getElementById("preventivo-cliente-cognome");
const inputClienteTelefono = document.getElementById("preventivo-cliente-telefono");
const inputClienteEmail = document.getElementById("preventivo-cliente-email");
const inputClienteComune = document.getElementById("preventivo-cliente-comune");

const inputPrevTitolo = document.getElementById("preventivo-titolo");
const inputPrevTipoServizio = document.getElementById("preventivo-tipo-servizio");
const inputPrevDataEvento = document.getElementById("preventivo-data-evento");
const inputPrevNInvitati = document.getElementById("preventivo-n-invitati");
const inputPrevLocation = document.getElementById("preventivo-location");
const inputPrevNote = document.getElementById("preventivo-note");
const selectPrevStato = document.getElementById("preventivo-stato");
const inputPrevAcconto = document.getElementById("preventivo-acconto");
const inputPrevTotale = document.getElementById("preventivo-totale");
const inputPrevPrezzoPersona = document.getElementById("preventivo-prezzo-persona");
const inputPrevSaldo = document.getElementById("preventivo-saldo");

// Tabelle menu & extra
const menuTableBody = document.getElementById("preventivo-menu-tbody");
const extraTableBody = document.getElementById("preventivo-extra-tbody");
const datalistRicette = document.getElementById("ricette-suggestions");

// Pulsanti
const btnNewPreventivo = document.getElementById("btn-new-preventivo");
const btnSavePreventivo = document.getElementById("btn-save-preventivo");
const btnAddMenuRow = document.getElementById("btn-add-menu-row");
const btnAddExtraRow = document.getElementById("btn-add-extra-row");
const btnPrintPreventivo = document.getElementById("btn-print-preventivo");
const btnEmailPreventivo = document.getElementById("btn-email-preventivo");

// -----------------------------
//  Eventi di base
// -----------------------------

if (btnNewPreventivo) {
  btnNewPreventivo.addEventListener("click", () => {
    openPreventivo(null); // nuovo
  });
}

if (btnSavePreventivo) {
  btnSavePreventivo.addEventListener("click", async (e) => {
    e.preventDefault();
    await savePreventivo();
  });
}

if (btnAddMenuRow) {
  btnAddMenuRow.addEventListener("click", () => {
    addMenuRow();
  });
}

if (btnAddExtraRow) {
  btnAddExtraRow.addEventListener("click", () => {
    addExtraRow();
  });
}

if (btnPrintPreventivo) {
  btnPrintPreventivo.addEventListener("click", () => {
    printCurrentPreventivo();
  });
}

if (btnEmailPreventivo) {
  btnEmailPreventivo.addEventListener("click", () => {
    emailCurrentPreventivoViaMailto();
  });
}

// ricalcolo quando cambiano invitati / acconto
if (inputPrevNInvitati) {
  inputPrevNInvitati.addEventListener("input", () => {
    recalcMenuQuantitaDaInvitati();
    recalcPreventivoTotali();
  });
}
if (inputPrevAcconto) {
  inputPrevAcconto.addEventListener("input", () => {
    recalcPreventivoTotali();
  });
}

// filtri archivio
if (inputPreventiviSearch) {
  inputPreventiviSearch.addEventListener("input", () => {
    renderPreventiviListFiltered();
  });
}
if (selectPreventiviStato) {
  selectPreventiviStato.addEventListener("change", () => {
    renderPreventiviListFiltered();
  });
}

// -----------------------------
//  Funzione da chiamare nel routing
// -----------------------------

async function showPreventiviView() {
  if (!viewPreventivi) return;

  // nasconde tutte le view e mostra quella dei preventivi
  const allViews = document.querySelectorAll(".view");
  allViews.forEach((v) => (v.style.display = "none"));
  viewPreventivi.style.display = "";

  resetPreventivoForm();
  await loadPreventiviList();
}

// -----------------------------
//  Lista preventivi (archivio + filtri)
// -----------------------------

async function loadPreventiviList() {
  if (!preventiviListContainer) return;

  preventiviListContainer.innerHTML =
    '<p class="small-muted">Caricamento preventivi...</p>';

  const { data, error } = await supabase
    .from("preventivi")
    .select(
      `
      id,
      titolo_evento,
      data_evento,
      n_invitati,
      stato,
      totale,
      created_at,
      contatti:cliente_id (
        id,
        nome,
        cognome
      )
    `
    )
    .order("data_evento", { ascending: true });

  console.log("▶ loadPreventiviList", { data, error });

  if (error) {
    console.error("Errore caricamento preventivi:", error);
    preventiviListContainer.innerHTML =
      '<p class="text-error">Errore nel caricamento dei preventivi.</p>';
    return;
  }

  preventiviCache = data || [];
  renderPreventiviListFiltered();
}

function renderPreventiviListFiltered() {
  const search = (inputPreventiviSearch?.value || "").toLowerCase().trim();
  const statoFiltro = selectPreventiviStato?.value || "tutti";

  let filtered = [...(preventiviCache || [])];

  // filtro stato
  if (statoFiltro !== "tutti") {
    filtered = filtered.filter((p) => (p.stato || "") === statoFiltro);
  }

  // filtro testo
  if (search) {
    filtered = filtered.filter((p) => {
      const clienteNome = p.contatti
        ? `${p.contatti.nome || ""} ${p.contatti.cognome || ""}`
        : "";
      const titolo = p.titolo_evento || "";
      const dataEv = p.data_evento || "";
      const created = p.created_at || "";

      const haystack = (
        clienteNome +
        " " +
        titolo +
        " " +
        dataEv +
        " " +
        created
      )
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const needle = search
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      return haystack.includes(needle);
    });
  }

  renderPreventiviList(filtered);
}

function renderPreventiviList(preventivi) {
  if (!preventiviListContainer) return;

  if (!preventivi || !preventivi.length) {
    preventiviListContainer.innerHTML =
      '<p class="small-muted">Nessun preventivo trovato.</p>';
    return;
  }

  const html = preventivi
    .map((p) => {
      const clienteNome = p.contatti
        ? `${p.contatti.nome || ""} ${p.contatti.cognome || ""}`.trim()
        : "Senza cliente";
      const dataLabel = p.data_evento
        ? new Date(p.data_evento).toLocaleDateString()
        : "—";
      const totaleLabel = Number(p.totale || 0)
        .toFixed(2)
        .replace(".", ",");

      return `
        <div class="preventivo-list-item" data-id="${p.id}">
          <div class="preventivo-list-main">
            <span class="preventivo-data">${dataLabel}</span>
            <span class="preventivo-titolo">${
              p.titolo_evento || "(Senza tipologia)"
            }</span>
          </div>
          <div class="preventivo-list-sub">
            <span class="preventivo-cliente">${clienteNome}</span>
            <span class="preventivo-totale">€ ${totaleLabel}</span>
            <span class="preventivo-stato badge stato-${p.stato}">${
              p.stato
            }</span>
          </div>
        </div>
      `;
    })
    .join("");

  preventiviListContainer.innerHTML = html;

  preventiviListContainer.querySelectorAll(".preventivo-list-item").forEach(
    (el) => {
      el.addEventListener("click", () => {
        const id = Number(el.getAttribute("data-id"));
        openPreventivo(id);
      });
    }
  );
}

// -----------------------------
//  Reset / apertura form
// -----------------------------

function resetPreventivoForm() {
  if (!preventivoForm) return;
  preventivoForm.reset();

  if (inputPrevId) inputPrevId.value = "";
  if (inputClienteId) inputClienteId.value = "";

  currentPreventivo = null;
  currentPreventivoMenu = [];
  currentPreventivoExtra = [];

  if (menuTableBody) menuTableBody.innerHTML = "";
  if (extraTableBody) extraTableBody.innerHTML = "";

  if (inputPrevTotale) inputPrevTotale.value = "";
  if (inputPrevPrezzoPersona) inputPrevPrezzoPersona.value = "";
  if (inputPrevSaldo) inputPrevSaldo.value = "";
}

async function openPreventivo(preventivoId) {
  resetPreventivoForm();

  if (!preventivoId) {
    currentPreventivo = null;
    currentPreventivoMenu = [];
    currentPreventivoExtra = [];
    recalcPreventivoTotali();
    return;
  }

  const { data: prevData, error: prevError } = await supabase
    .from("preventivi")
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
    .eq("id", preventivoId)
    .single();

  if (prevError || !prevData) {
    console.error("Errore apertura preventivo:", prevError);
    alert("Errore nel caricamento del preventivo.");
    return;
  }

  currentPreventivo = prevData;

  const { data: menuData, error: menuError } = await supabase
    .from("preventivi_ricette")
    .select("*")
    .eq("preventivo_id", preventivoId)
    .order("id", { ascending: true });

  if (menuError) console.error("Errore caricamento menù:", menuError);
  currentPreventivoMenu = menuData || [];

  const { data: extraData, error: extraError } = await supabase
    .from("preventivi_extra")
    .select("*")
    .eq("preventivo_id", preventivoId)
    .order("id", { ascending: true });

  if (extraError) console.error("Errore caricamento extra:", extraError);
  currentPreventivoExtra = extraData || [];

  fillPreventivoFormFromData(prevData);
  renderMenuRows();
  renderExtraRows();
  recalcPreventivoTotali();
}

function fillPreventivoFormFromData(p) {
  if (inputPrevId) inputPrevId.value = p.id;

  if (inputClienteId) inputClienteId.value = p.cliente_id || "";
  if (inputClienteNome) inputClienteNome.value = p.contatti?.nome || "";
  if (inputClienteCognome) inputClienteCognome.value = p.contatti?.cognome || "";
  if (inputClienteTelefono) inputClienteTelefono.value = p.contatti?.telefono || "";
  if (inputClienteEmail) inputClienteEmail.value = p.contatti?.email || "";
  if (inputClienteComune) inputClienteComune.value = p.contatti?.note || "";

  if (inputPrevTitolo) inputPrevTitolo.value = p.titolo_evento || "";
  if (inputPrevTipoServizio) inputPrevTipoServizio.value = p.tipo_servizio || "";
  if (inputPrevDataEvento) inputPrevDataEvento.value = p.data_evento || "";
  if (inputPrevNInvitati) inputPrevNInvitati.value = p.n_invitati || "";
  if (inputPrevLocation) inputPrevLocation.value = p.location || "";
  if (inputPrevNote) inputPrevNote.value = p.note || "";
  if (selectPrevStato) selectPrevStato.value = p.stato || "bozza";
  if (inputPrevAcconto)
    inputPrevAcconto.value = Number(p.acconto || 0).toFixed(2);
}

// -----------------------------
//  Menù (preventivi_ricette)
// -----------------------------

function renderMenuRows() {
  if (!menuTableBody) return;
  menuTableBody.innerHTML = "";

  currentPreventivoMenu.forEach((row, index) => {
    const cu = Number(row.costo_unitario || 0);
    const nInv = inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0;
    const quantita = nInv || Number(row.quantita || 0);
    const ct = quantita * cu;

    row.quantita = quantita;
    row.costo_totale = ct;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input
          type="text"
          class="input-pill menu-nome"
          list="ricette-suggestions"
          value="${row.nome_piatto || ""}"
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

    const inputNome = tr.querySelector(".menu-nome");
    const btnRemove = tr.querySelector(".btn-menu-remove");

    if (inputNome) {
      inputNome.addEventListener("input", () => {
        const term = inputNome.value;
        currentPreventivoMenu[index].nome_piatto = term;
        fetchRicetteSuggestions(term);
      });

      inputNome.addEventListener("blur", () => {
        updateMenuRowFromRicettaNome(index);
      });
    }

    if (btnRemove) {
      btnRemove.addEventListener("click", () => {
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
    nome_piatto: "",
    quantita: inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0,
    costo_unitario: 0,
    costo_totale: 0,
    ricetta_completa: false,
  });
  renderMenuRows();
}

function recalcMenuQuantitaDaInvitati() {
  const nInv = inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0;
  currentPreventivoMenu.forEach((row) => {
    row.quantita = nInv;
    row.costo_totale = nInv * Number(row.costo_unitario || 0);
  });
  renderMenuRows();
}

// suggerimenti ricette
async function fetchRicetteSuggestions(term) {
  if (!datalistRicette) return;
  const t = (term || "").trim();
  if (t.length < 2) return;

  const { data, error } = await supabase
    .from("ricette")
    .select("id, nome")
    .ilike("nome", `%${t}%`)
    .limit(10);

  if (error) {
    console.error("Errore suggerimenti ricette:", error);
    return;
  }

  ricetteSuggestionsCache = data || [];

  datalistRicette.innerHTML = (data || [])
    .map((r) => `<option value="${r.nome}"></option>`)
    .join("");
}

// collega nome portata a ricetta (o la crea)
async function updateMenuRowFromRicettaNome(index) {
  const row = currentPreventivoMenu[index];
  if (!row) return;
  const nome = (row.nome_piatto || "").trim();
  if (!nome) return;

  const { data: ricetta, error } = await supabase
    .from("ricette")
    .select("id, nome")
    .ilike("nome", nome)
    .maybeSingle();

  let ricettaId = null;

  if (!error && ricetta) {
    ricettaId = ricetta.id;
  } else {
    const { data: nuovaRicetta, error: insertError } = await supabase
      .from("ricette")
      .insert({
        nome: nome,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Errore creazione ricetta da preventivo:", insertError);
    } else if (nuovaRicetta) {
      ricettaId = nuovaRicetta.id;
    }
  }

  const nInv = inputPrevNInvitati ? Number(inputPrevNInvitati.value || 0) : 0;
  const quantita = nInv;
  const costoPorzione = 0; // per ora non prendiamo il costo da magazzino
  const costoTotale = quantita * costoPorzione;

  row.ricetta_id = ricettaId;
  row.costo_unitario = costoPorzione;
  row.quantita = quantita;
  row.costo_totale = costoTotale;
  row.ricetta_completa = false;

  renderMenuRows();
}

// -----------------------------
//  Extra (preventivi_extra)
// -----------------------------

function renderExtraRows() {
  if (!extraTableBody) return;
  extraTableBody.innerHTML = "";

  currentPreventivoExtra.forEach((row, index) => {
    const q = Number(row.quantita || 0);
    const pu = Number(row.prezzo_unitario || 0);
    const pt = q * pu;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input type="text" class="input-pill extra-desc" value="${
          row.descrizione || ""
        }">
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

    const inputDesc = tr.querySelector(".extra-desc");
    const inputQ = tr.querySelector(".extra-quantita");
    const inputPU = tr.querySelector(".extra-prezzo-unit");
    const btnRemove = tr.querySelector(".btn-extra-remove");

    if (inputDesc) {
      inputDesc.addEventListener("input", () => {
        currentPreventivoExtra[index].descrizione = inputDesc.value;
      });
    }

    const recalcRow = () => {
      const nq = Number(inputQ.value || 0);
      const npu = Number(inputPU.value || 0);
      currentPreventivoExtra[index].quantita = nq;
      currentPreventivoExtra[index].prezzo_unitario = npu;
      const pt2 = nq * npu;
      const col = tr.querySelector(".extra-totale-col");
      if (col) col.textContent = `€ ${pt2.toFixed(2)}`;
      recalcPreventivoTotali();
    };

    if (inputQ) inputQ.addEventListener("input", recalcRow);
    if (inputPU) inputPU.addEventListener("input", recalcRow);

    if (btnRemove) {
      btnRemove.addEventListener("click", () => {
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
    descrizione: "",
    quantita: 1,
    prezzo_unitario: 0,
  });
  renderExtraRows();
}

// -----------------------------
//  Totali preventivo
// -----------------------------

function recalcPreventivoTotali() {
  const totaleMenu = currentPreventivoMenu.reduce((sum, r) => {
    return sum + Number(r.costo_totale || 0);
  }, 0);

  const totaleExtra = currentPreventivoExtra.reduce((sum, r) => {
    const q = Number(r.quantita || 0);
    const pu = Number(r.prezzo_unitario || 0);
    return sum + q * pu;
  }, 0);

  const totale = totaleMenu + totaleExtra;

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
    alert("Compila almeno nome e cognome del cliente.");
    return;
  }

  const payloadPrev = {
    cliente_id: clienteId,
    titolo_evento: inputPrevTitolo ? inputPrevTitolo.value || null : null,
    tipo_servizio: inputPrevTipoServizio
      ? inputPrevTipoServizio.value || null
      : null,
    data_evento: inputPrevDataEvento ? inputPrevDataEvento.value || null : null,
    n_invitati: inputPrevNInvitati
      ? Number(inputPrevNInvitati.value || 0)
      : 0,
    location: inputPrevLocation ? inputPrevLocation.value || null : null,
    note: inputPrevNote ? inputPrevNote.value || null : null,
    stato: selectPrevStato ? selectPrevStato.value || "bozza" : "bozza",
    acconto: inputPrevAcconto ? Number(inputPrevAcconto.value || 0) : 0,
    totale: inputPrevTotale ? Number(inputPrevTotale.value || 0) : 0,
  };

  const existingId = inputPrevId ? Number(inputPrevId.value || 0) : 0;
  let preventivoId = existingId;

  if (!existingId) {
    const { data: insertData, error: insertError } = await supabase
      .from("preventivi")
      .insert(payloadPrev)
      .select()
      .single();

    if (insertError) {
      console.error("Errore creazione preventivo:", insertError);
      alert(
        "Errore durante il salvataggio del preventivo (insert). Controlla la console."
      );
      return;
    }

    preventivoId = insertData.id;
    if (inputPrevId) inputPrevId.value = preventivoId;
  } else {
    const { error: updateError } = await supabase
      .from("preventivi")
      .update(payloadPrev)
      .eq("id", existingId);

    if (updateError) {
      console.error("Errore aggiornamento preventivo:", updateError);
      alert(
        "Errore durante il salvataggio del preventivo (update). Controlla la console."
      );
      return;
    }
  }

  await savePreventivoRighe(preventivoId);

  if (payloadPrev.stato === "accettato") {
    await ensurePrenotazioneForPreventivo(preventivoId, payloadPrev);
  }

  await loadPreventiviList();
  alert("Preventivo salvato correttamente.");
}

async function upsertPreventivoCliente() {
  const idEsistente = inputClienteId ? Number(inputClienteId.value || 0) : 0;

  const nome = inputClienteNome ? (inputClienteNome.value || "").trim() : "";
  const cognome = inputClienteCognome
    ? (inputClienteCognome.value || "").trim()
    : "";
  const telefono = inputClienteTelefono
    ? (inputClienteTelefono.value || "").trim()
    : "";
  const email = inputClienteEmail ? (inputClienteEmail.value || "").trim() : "";
  const comune = inputClienteComune
    ? (inputClienteComune.value || "").trim()
    : "";

  if (!nome && !cognome) {
    return null;
  }

  const payloadContatto = {
    nome,
    cognome,
    telefono: telefono || null,
    email: email || null,
    note: comune || null,
  };

  if (!idEsistente) {
    const { data, error } = await supabase
      .from("contatti")
      .insert(payloadContatto)
      .select()
      .single();

    if (error) {
      console.error("Errore creazione contatto:", error);
      alert("Errore nel salvataggio del cliente (insert).");
      return null;
    }

    if (inputClienteId) inputClienteId.value = data.id;
    return data.id;
  } else {
    const { error } = await supabase
      .from("contatti")
      .update(payloadContatto)
      .eq("id", idEsistente);

    if (error) {
      console.error("Errore aggiornamento contatto:", error);
      alert("Errore nell'aggiornamento del cliente.");
      return null;
    }
    return idEsistente;
  }
}

async function savePreventivoRighe(preventivoId) {
  await supabase
    .from("preventivi_ricette")
    .delete()
    .eq("preventivo_id", preventivoId);
  await supabase
    .from("preventivi_extra")
    .delete()
    .eq("preventivo_id", preventivoId);

  const menuPayload = currentPreventivoMenu
    .filter((r) => (r.nome_piatto || "").trim() !== "")
    .map((r) => ({
      preventivo_id: preventivoId,
      ricetta_id: r.ricetta_id || null,
      nome_piatto: r.nome_piatto,
      quantita: Number(r.quantita || 0),
      costo_unitario: Number(r.costo_unitario || 0),
      costo_totale: Number(r.costo_totale || 0),
      ricetta_completa: !!r.ricetta_completa,
    }));

  if (menuPayload.length) {
    const { error: menuErr } = await supabase
      .from("preventivi_ricette")
      .insert(menuPayload);
    if (menuErr) {
      console.error("Errore inserimento righe menù:", menuErr);
      alert("Errore durante il salvataggio del menù.");
    }
  }

  const extraPayload = currentPreventivoExtra
    .filter((r) => (r.descrizione || "").trim() !== "")
    .map((r) => ({
      preventivo_id: preventivoId,
      descrizione: r.descrizione,
      quantita: Number(r.quantita || 0),
      prezzo_unitario: Number(r.prezzo_unitario || 0),
    }));

  if (extraPayload.length) {
    const { error: extraErr } = await supabase
      .from("preventivi_extra")
      .insert(extraPayload);
    if (extraErr) {
      console.error("Errore inserimento righe extra:", extraErr);
      alert("Errore durante il salvataggio dei servizi extra.");
    }
  }
}

// -----------------------------
//  Prenotazione collegata
// -----------------------------

async function ensurePrenotazioneForPreventivo(preventivoId, payloadPrev) {
  const { data: prenotData, error } = await supabase
    .from("prenotazioni")
    .select("*")
    .eq("preventivo_id", preventivoId)
    .maybeSingle();

  if (error) {
    console.error("Errore verifica prenotazione:", error);
    return;
  }

  const saldo = payloadPrev.totale - payloadPrev.acconto;

  if (!prenotData) {
    const { error: insertError } = await supabase.from("prenotazioni").insert({
      preventivo_id: preventivoId,
      cliente_id: payloadPrev.cliente_id,
      data_evento: payloadPrev.data_evento,
      acconto: payloadPrev.acconto,
      saldo_residuo: saldo,
    });
    if (insertError) {
      console.error("Errore creazione prenotazione:", insertError);
    }
  } else {
    const { error: updateError } = await supabase
      .from("prenotazioni")
      .update({
        data_evento: payloadPrev.data_evento,
        acconto: payloadPrev.acconto,
        saldo_residuo: saldo,
      })
      .eq("id", prenotData.id);

    if (updateError) {
      console.error("Errore aggiornamento prenotazione:", updateError);
    }
  }
}

// -----------------------------
//  Stampa / PDF (senza prezzi singoli)
// -----------------------------

function printCurrentPreventivo() {
  const id = inputPrevId ? Number(inputPrevId.value || 0) : 0;
  if (!id) {
    alert("Salva il preventivo prima di stamparlo.");
    return;
  }

  const clienteNome = `${inputClienteNome?.value || ""} ${
    inputClienteCognome?.value || ""
  }`.trim();
  const clienteComune = inputClienteComune?.value || "";
  const clienteTel = inputClienteTelefono?.value || "";
  const clienteMail = inputClienteEmail?.value || "";

  const dataEvento = inputPrevDataEvento?.value || "";
  const tipologia = inputPrevTitolo?.value || "";
  const nInv = inputPrevNInvitati
    ? Number(inputPrevNInvitati.value || 0)
    : 0;
  const totale = inputPrevTotale ? inputPrevTotale.value : "0.00";
  const prezzoPersona = inputPrevPrezzoPersona
    ? inputPrevPrezzoPersona.value
    : "0.00";
  const acconto = inputPrevAcconto ? inputPrevAcconto.value : "0.00";
  const saldo = inputPrevSaldo ? inputPrevSaldo.value : "0.00";

  const menuElenco = currentPreventivoMenu
    .map((r) => `- ${r.nome_piatto || ""}`)
    .filter((s) => s.trim() !== "-")
    .join("<br>");

  const extraElenco = currentPreventivoExtra
    .map((r) => `${r.descrizione || ""} (x${r.quantita || 0})`)
    .filter((s) => s.trim() !== "")
    .join("<br>");

  const oggi = new Date().toLocaleDateString();

  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <title>Preventivo ${id}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; font-size: 14px; }
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
          <h2>Preventivo evento ${tipologia || ""}</h2>
          <div>Data emissione: ${oggi}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Cliente</div>
        <div>${clienteNome || "-"}</div>
        <div>${clienteComune || ""}</div>
        <div>${clienteTel || ""}</div>
        <div>${clienteMail || ""}</div>
      </div>

      <div class="section">
        <div class="section-title">Evento</div>
        <div>Tipologia: ${tipologia || "-"}</div>
        <div>Data evento: ${dataEvento || "-"}</div>
        <div>Numero invitati: ${nInv}</div>
        <div>Location: ${inputPrevLocation?.value || ""}</div>
      </div>

      <div class="section">
        <div class="section-title">Menù proposto</div>
        <div>${menuElenco || "—"}</div>
      </div>

      <div class="section">
        <div class="section-title">Servizi extra</div>
        <div>${extraElenco || "—"}</div>
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
  const clienteEmail = inputClienteEmail
    ? (inputClienteEmail.value || "").trim()
    : "";
  if (!clienteEmail) {
    alert("Inserisci l'email del cliente prima di inviare il preventivo.");
    return;
  }

  const clienteNome = `${inputClienteNome?.value || ""} ${
    inputClienteCognome?.value || ""
  }`.trim();
  const tipologia = inputPrevTitolo?.value || "";
  const dataEvento = inputPrevDataEvento?.value || "";
  const nInv = inputPrevNInvitati
    ? Number(inputPrevNInvitati.value || 0)
    : 0;
  const totale = inputPrevTotale ? inputPrevTotale.value : "0.00";
  const prezzoPersona = inputPrevPrezzoPersona
    ? inputPrevPrezzoPersona.value
    : "0.00";
  const acconto = inputPrevAcconto ? inputPrevAcconto.value : "0.00";
  const saldo = inputPrevSaldo ? inputPrevSaldo.value : "0.00";

  const oggi = new Date().toLocaleDateString();

  const menuElenco = currentPreventivoMenu
    .map((r) => `- ${r.nome_piatto || ""}`)
    .filter((s) => s.trim() !== "-")
    .join("\n");

  const extraElenco = currentPreventivoExtra
    .map((r) => `- ${r.descrizione || ""} (x${r.quantita || 0})`)
    .filter((s) => s.trim() !== "-")
    .join("\n");

  const subject = `Preventivo ${tipologia || ""} - ${dataEvento || ""}`;

  const body =
    `Gentile ${clienteNome || ""},\n\n` +
    `di seguito il riepilogo del preventivo per il suo evento.\n\n` +
    `Data emissione: ${oggi}\n` +
    `Tipologia evento: ${tipologia || "-"}\n` +
    `Data evento: ${dataEvento || "-"}\n` +
    `Numero invitati: ${nInv}\n\n` +
    `Menù proposto:\n${menuElenco || "-"}\n\n` +
    `Servizi extra:\n${extraElenco || "-"}\n\n` +
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
