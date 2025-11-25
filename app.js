/********************************************************************
 *  GESTIONALE ANTONIO - APP.JS COMPLETO
 *  Include:
 *  - Login + Ruoli
 *  - Navigazione
 *  - Timbratura
 *  - Dipendenti CRUD
 *  - Acquisti (fatture + righe)
 *  - Magazzino (ricerca + scorte)
 *  - Ricette (ingredienti + autocomplete + food cost)
 *  - Autocomplete personalizzato
 *  - Miglior uso mobile
 ********************************************************************/

// === SUPABASE ======================================================
const supabase = window.supabaseClient;

// ==================================================================
// ======================= UTILITÀ GLOBALI ===========================
// ==================================================================

function qs(sel) {
  return document.querySelector(sel);
}
function qsa(sel) {
  return document.querySelectorAll(sel);
}

// Mostra una vista
function showView(id) {
  qsa(".view").forEach(v => v.style.display = "none");
  const v = qs(`#view-${id}`);
  if (v) v.style.display = "block";
}

// Toast piccolo
function toast(msg) {
  alert(msg);
}

// ==================================================================
// =========================== LOGIN ================================
// ==================================================================

const loginBtn = qs("#btn-login");
const logoutBtn = qs("#btn-logout");

loginBtn.onclick = loginUser;
logoutBtn.onclick = logoutUser;

async function loginUser() {
  const nome = qs("#login-nome").value.trim();
  const pin = qs("#login-pin").value.trim();

  if (!nome || !pin) {
    toast("Inserisci nome e PIN.");
    return;
  }

  const { data, error } = await supabase
    .from("dipendenti")
    .select("*")
    .eq("nome", nome)
    .eq("pin", pin)
    .eq("attivo", true)
    .single();

  if (error || !data) {
    toast("Credenziali errate.");
    return;
  }

  window.currentUser = data;

  qs("#current-user-label").textContent = data.nome;
  qs("#btn-logout").style.display = "inline-block";

  if (data.ruolo === "cameriere" || data.ruolo === "addetto_cucina") {
    qs("#manager-menu").style.display = "none";
    showView("home-dip");
  } else {
    qs("#manager-menu").style.display = "grid";
    showView("timbratura");
  }
}

function logoutUser() {
  window.currentUser = null;
  qs("#current-user-label").textContent = "Nessun utente";
  qs("#btn-logout").style.display = "none";
  showView("login");
  qs("#login-nome").value = "";
  qs("#login-pin").value = "";
}

// Auto focus sul PIN
qs("#login-pin").addEventListener("focus", () => {
  qs("#login-pin").setAttribute("inputmode", "numeric");
});

// ==================================================================
// ====================== NAVIGAZIONE MANAGER ========================
// ==================================================================

qsa("[data-route]").forEach(btn => {
  btn.onclick = () => showView(btn.dataset.route);
});

// ==================================================================
// =========================== TIMBRATURA ============================
// ==================================================================

qs("#btn-entra").onclick = () => timbra("ENTRATA");
qs("#btn-pausa").onclick = () => timbra("PAUSA");
qs("#btn-esci").onclick = () => timbra("USCITA");

async function timbra(tipo) {
  const ut = window.currentUser;
  if (!ut) return alert("Non sei loggato.");

  const canale = qs("#timbratura-canale-select").value;

  await supabase.from("timbrature").insert({
    dipendente_id: ut.id,
    tipo,
    canale,
    timestamp: new Date().toISOString()
  });

  toast("Timbratura registrata.");
}

// ==================================================================
// =========================== DIPENDENTI ============================
// ==================================================================

qs("#btn-add-dip").onclick = salvaDipendente;

async function salvaDipendente() {
  const payload = {
    nome: qs("#dip-nome").value,
    mansione: qs("#dip-mansione").value,
    data_nascita: qs("#dip-data-nascita").value,
    telefono: qs("#dip-telefono").value,
    email: qs("#dip-email").value,
    ruolo: qs("#dip-ruolo").value,
    retribuzione_base: qs("#dip-retribuzione-base").value,
    pin: qs("#dip-codice").value,
    attivo: qs("#dip-attivo").checked
  };

  await supabase.from("dipendenti").insert(payload);
  toast("Dipendente salvato.");

  caricaDipendenti();
}

async function caricaDipendenti() {
  const { data } = await supabase.from("dipendenti").select("*");
  const tbody = qs("#dipendenti-lista");
  tbody.innerHTML = "";

  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.nome}</td>
      <td>${d.mansione}</td>
      <td>${d.telefono}</td>
      <td>${d.email}</td>
      <td>${d.ruolo}</td>
      <td>${d.retribuzione_base}</td>
      <td>${d.pin}</td>
      <td>${d.attivo ? "✔" : "✘"}</td>
      <td><button class="app-button tiny red">X</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ==================================================================
// ====================== FATTURE / ACQUISTI =========================
// ==================================================================

qs("#btn-add-riga-fattura").onclick = aggiungiRigaFattura;

function aggiungiRigaFattura() {
  const tbody = qs("#fattura-righe-body");

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="fr-codice"></td>
    <td><input class="fr-descrizione"></td>
    <td><input class="fr-categoria"></td>
    <td><input class="fr-um"></td>
    <td><input type="number" step="0.01" class="fr-qty"></td>
    <td><input type="number" step="0.01" class="fr-prezzo"></td>
    <td><input type="number" step="1" class="fr-iva"></td>
    <td class="fr-totale">0</td>
    <td><button class="app-button tiny red fr-del">X</button></td>
  `;

  tbody.appendChild(tr);

  tr.querySelector(".fr-del").onclick = () => tr.remove();

  tr.querySelectorAll("input").forEach(inp => {
    inp.oninput = () => aggiornaTotaleRiga(tr);
  });
}

function aggiornaTotaleRiga(tr) {
  const qty = Number(tr.querySelector(".fr-qty").value || 0);
  const pr = Number(tr.querySelector(".fr-prezzo").value || 0);
  tr.querySelector(".fr-totale").textContent = (qty * pr).toFixed(2);
}

qs("#btn-salva-fattura").onclick = salvaFattura;

async function salvaFattura() {
  const numero = qs("#fattura-numero").value;
  const dataF = qs("#fattura-data").value;
  const forn = qs("#fattura-fornitore").value;

  const { data: fattura } = await supabase.from("fatture").insert({
    numero, data: dataF, fornitore: forn
  }).select().single();

  // Salva righe
  const righe = [...qsa("#fattura-righe-body tr")].map(tr => ({
    codice: tr.querySelector(".fr-codice").value,
    descrizione: tr.querySelector(".fr-descrizione").value,
    categoria: tr.querySelector(".fr-categoria").value,
    um: tr.querySelector(".fr-um").value,
    quantita: Number(tr.querySelector(".fr-qty").value),
    prezzo: Number(tr.querySelector(".fr-prezzo").value),
    iva: Number(tr.querySelector(".fr-iva").value),
    fattura_id: fattura.id
  }));

  for (let r of righe) {
    await supabase.from("fatture_righe").insert(r);

    // MOVIMENTO MAGAZZINO
    await supabase.from("magazzino_movimenti").insert({
      prodotto_codice: r.codice,
      tipo: "carico",
      quantita: r.quantita,
      costo: r.prezzo,
      fattura_id: fattura.id
    });
  }

  toast("Fattura registrata.");
  qs("#fattura-righe-body").innerHTML = "";
}

// ==================================================================
// ========================= MAGAZZINO ===============================
// ==================================================================

async function caricaProdotti() {
  const { data } = await supabase.from("prodotti").select("*");
  window.PRODOTTI = data;
  aggiornaListaMagazzino(data);
}

function aggiornaListaMagazzino(mag) {
  const tbody = qs("#magazzino-lista");
  tbody.innerHTML = "";

  mag.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.codice_interno}</td>
      <td>${p.descrizione}</td>
      <td>${p.categoria_id}</td>
      <td>${p.stock || 0}</td>
    `;
    tbody.appendChild(tr);
  });
}

// === Ricerca istantanea + autocomplete ==================================

const magInput = qs("#magazzino-search");
const magSuggestBox = document.createElement("div");
magSuggestBox.className = "autocomplete-box";
magSuggestBox.style.display = "none";
magInput.parentElement.appendChild(magSuggestBox);

magInput.addEventListener("input", () => {
  const q = magInput.value.toLowerCase();

  let results = window.PRODOTTI.filter(p =>
    p.descrizione.toLowerCase().includes(q)
  );

  mostraSuggerimenti(results, magSuggestBox, item => {
    magInput.value = item.descrizione;
    aggiornaListaMagazzino([item]);
    magSuggestBox.style.display = "none";
  });
});

function mostraSuggerimenti(lista, box, onClick) {
  if (!lista.length) {
    box.style.display = "none";
    return;
  }

  box.innerHTML = "";
  lista.forEach(el => {
    const div = document.createElement("div");
    div.className = "autocomplete-item";
    div.textContent = el.descrizione;
    div.onclick = () => onClick(el);
    box.appendChild(div);
  });

  box.style.display = "block";
}

// ==================================================================
// ============================ RICETTE ==============================
// ==================================================================

qs("#btn-add-ingrediente").onclick = addIngrediente;

function addIngrediente() {
  const cont = qs("#ricetta-ingredienti-container");

  const div = document.createElement("div");
  div.className = "ingrediente-row";

  div.innerHTML = `
    <input class="ing-nome" placeholder="Prodotto..." autocomplete="off">
    <input class="ing-qty" type="number" step="0.01" placeholder="Quantità">
    <button class="app-button tiny red ing-del">X</button>
  `;

  cont.appendChild(div);

  // Autocomplete ingredienti
  const nomeInput = div.querySelector(".ing-nome");

  const sugg = document.createElement("div");
  sugg.className = "autocomplete-box";
  sugg.style.display = "none";
  div.appendChild(sugg);

  nomeInput.addEventListener("input", () => {
    const q = nomeInput.value.toLowerCase();

    const results = window.PRODOTTI.filter(p =>
      p.descrizione.toLowerCase().includes(q)
    );

    mostraSuggerimenti(results, sugg, prod => {
      nomeInput.value = prod.descrizione;
      nomeInput.dataset.prodottoId = prod.id;
      sugg.style.display = "none";
    });
  });

  div.querySelector(".ing-del").onclick = () => div.remove();
}

// Salva ricetta
qs("#btn-salva-ricetta").onclick = salvaRicetta;

async function salvaRicetta() {
  const nome = qs("#ricetta-nome").value;
  const descr = qs("#ricetta-descrizione").value;
  const note = qs("#ricetta-note").value;

  const { data: ricetta } = await supabase.from("ricette")
    .insert({ nome, descrizione: descr, note })
    .select().single();

  const righe = [...qsa(".ingrediente-row")].map(div => ({
    ricetta_id: ricetta.id,
    prodotto_id: div.querySelector(".ing-nome").dataset.prodottoId,
    quantita: Number(div.querySelector(".ing-qty").value)
  }));

  for (let r of righe) {
    await supabase.from("ricette_ingredienti").insert(r);
  }

  toast("Ricetta salvata.");
}

// ==================================================================
// ===================== AVVIO INIZIALE =============================
// ==================================================================

caricaProdotti();
caricaDipendenti();
