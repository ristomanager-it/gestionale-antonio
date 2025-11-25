/********************************************************************
 *  GESTIONALE ANTONIO - APP.JS COMPLETO (VERSIONE STABILE)
 ********************************************************************/

// === SUPABASE ======================================================
const supabase = window.supabaseClient;

// === SHORTCUT DOM =================================================
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

// === NAVIGAZIONE DELLE VISTE ======================================
function showView(id) {
  qsa(".view").forEach(v => v.style.display = "none");
  const v = qs(`#view-${id}`);
  if (v) v.style.display = "block";
}

// === TOAST =========================================================
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

  // LOGIN ADMIN VIRTUALE
  if (nome.toLowerCase() === "admin" && pin === "9999") {
    window.currentUser = {
      nome: "Admin",
      ruolo: "admin"
    };
    qs("#current-user-label").textContent = "Admin";
    qs("#btn-logout").style.display = "inline-block";
    qs("#manager-menu").style.display = "grid";
    showView("timbratura");
    return;
  }

  // LOGIN DIPENDENTE SUPABASE
  const { data, error } = await supabase
    .from("dipendenti")
    .select("*")
    .eq("nome", nome)
    .eq("codice", pin)
    .eq("attivo", true)
    .maybeSingle();

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
  qs("#login-nome").value = "";
  qs("#login-pin").value = "";
  showView("login");
}

// ==================================================================
// =========================== TIMBRATURA ============================
// ==================================================================

qs("#btn-entra").onclick = () => registraTimbratura("ENTRATA");
qs("#btn-pausa").onclick = () => registraTimbratura("PAUSA");
qs("#btn-esci").onclick = () => registraTimbratura("USCITA");

async function registraTimbratura(tipo) {
  if (!window.currentUser) {
    toast("Devi essere loggato.");
    return;
  }

  const canale = qs("#timbratura-canale-select").value;

  const { error } = await supabase.from("timbrature").insert({
    dipendente: currentUser.nome,
    azione: tipo,
    canale,
    timestamp: new Date().toISOString()
  });

  if (error) {
    toast("Errore durante la timbratura.");
    return;
  }

  toast(tipo + " registrata.");
}
// ==================================================================
// =========================== DIPENDENTI ============================
// ==================================================================

const dipAddBtn = qs("#btn-add-dip");
dipAddBtn.onclick = salvaDipendente;

async function salvaDipendente() {
  const obj = {
    nome: qs("#dip-nome").value.trim(),
    mansione: qs("#dip-mansione").value.trim(),
    data_nascita: qs("#dip-data-nascita").value || null,
    telefono: qs("#dip-telefono").value.trim(),
    email: qs("#dip-email").value.trim(),
    ruolo: qs("#dip-ruolo").value,
    retribuzione_base: parseFloat(qs("#dip-retribuzione-base").value) || 0,
    codice: qs("#dip-codice").value.trim(),
    attivo: qs("#dip-attivo").checked
  };

  const { error } = await supabase.from("dipendenti").insert(obj);

  if (error) {
    toast("Errore nel salvataggio dipendente.");
    return;
  }

  toast("Dipendente inserito.");
  caricaDipendenti();
}

async function caricaDipendenti() {
  const tbody = qs("#dipendenti-lista");
  tbody.innerHTML = "";

  const { data, error } = await supabase.from("dipendenti").select("*");

  if (error) return;

  data.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.nome}</td>
      <td>${d.mansione || ""}</td>
      <td>${d.telefono || ""}</td>
      <td>${d.email || ""}</td>
      <td>${d.ruolo}</td>
      <td>${d.retribuzione_base || "0"}</td>
      <td>${d.codice}</td>
      <td>${d.attivo ? "✔" : "✖"}</td>
      <td>
        <button class="app-button tiny red" onclick="eliminaDipendente(${d.id})">
          Elimina
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function eliminaDipendente(id) {
  const { error } = await supabase.from("dipendenti").delete().eq("id", id);
  if (!error) caricaDipendenti();
}

// ==================================================================
// =========================== ACQUISTI ==============================
// ==================================================================

qs("#btn-add-riga-fattura").onclick = aggiungiRigaFattura;
qs("#btn-salva-fattura").onclick = salvaFattura;

function aggiungiRigaFattura() {
  const tbody = qs("#fattura-righe-body");

  const tr = document.createElement("tr");
  tr.classList.add("riga-fattura");

  tr.innerHTML = `
    <td><input class="rf-codice" type="text"/></td>
    <td><input class="rf-desc" type="text"/></td>
    <td><input class="rf-cat" type="text"/></td>
    <td><input class="rf-um" type="text"/></td>
    <td><input class="rf-qty" type="number" step="0.01"/></td>
    <td><input class="rf-price" type="number" step="0.01"/></td>
    <td><input class="rf-iva" type="number" step="1" value="10"/></td>
    <td class="rf-tot">0.00</td>
    <td><button class="app-button tiny red" onclick="this.closest('tr').remove()">X</button></td>
  `;

  tbody.appendChild(tr);
}

async function salvaFattura() {
  const numero = qs("#fattura-numero").value.trim();
  const data = qs("#fattura-data").value;
  const fornitore = qs("#fattura-fornitore").value.trim();

  if (!numero || !data || !fornitore) {
    toast("Compila tutti i campi della fattura.");
    return;
  }

  const { data: fattura, error } = await supabase
    .from("fatture")
    .insert({ numero, data, fornitore })
    .select()
    .single();

  if (error) {
    toast("Errore salvataggio fattura.");
    return;
  }

  const righe = qsa(".riga-fattura");
  for (const r of righe) {
    const obj = {
      fattura_id: fattura.id,
      codice: r.querySelector(".rf-codice").value.trim(),
      descrizione: r.querySelector(".rf-desc").value.trim(),
      categoria: r.querySelector(".rf-cat").value.trim(),
      um: r.querySelector(".rf-um").value.trim(),
      quantita: parseFloat(r.querySelector(".rf-qty").value) || 0,
      prezzo: parseFloat(r.querySelector(".rf-price").value) || 0,
      iva: parseFloat(r.querySelector(".rf-iva").value) || 10
    };

    await supabase.from("fatture_righe").insert(obj);

    // CREAZIONE / AGGIORNAMENTO PRODOTTO
    let { data: prod } = await supabase
      .from("prodotti")
      .select("*")
      .eq("codice_interno", obj.codice)
      .maybeSingle();

    if (!prod) {
      const { data: nuovo } = await supabase
        .from("prodotti")
        .insert({
          codice_interno: obj.codice,
          descrizione: obj.descrizione,
          categoria: obj.categoria,
          um: obj.um
        })
        .select()
        .single();
      prod = nuovo;
    }

    // MOVIMENTO MAGAZZINO
    await supabase.from("magazzino_movimenti").insert({
      prodotto_id: prod.id,
      tipo: "CARICO",
      quantita: obj.quantita,
      costo: obj.prezzo,
      fattura_id: fattura.id
    });
  }

  toast("Fattura salvata.");
}
// ==================================================================
// =========================== MAGAZZINO =============================
// ==================================================================

async function caricaMagazzino() {
  const { data, error } = await supabase
    .from("prodotti")
    .select(`
      id,
      codice_interno,
      descrizione,
      categoria,
      um,
      magazzino_movimenti ( quantita, tipo )
    `);

  if (error) return;

  const tbody = qs("#magazzino-lista");
  const dl = qs("#magazzino-suggestions");

  tbody.innerHTML = "";
  dl.innerHTML = "";

  data.forEach(p => {
    let stock = 0;
    (p.magazzino_movimenti || []).forEach(m => {
      stock += m.tipo === "CARICO" ? m.quantita : -m.quantita;
    });

    // suggerimenti ricerca
    const opt = document.createElement("option");
    opt.value = p.descrizione;
    dl.appendChild(opt);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.codice_interno}</td>
      <td>${p.descrizione}</td>
      <td>${p.categoria}</td>
      <td>${stock.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// RICERCA ISTANTANEA
qs("#magazzino-search").addEventListener("input", function () {
  const filtro = this.value.toLowerCase();
  qsa("#magazzino-lista tr").forEach(tr => {
    tr.style.display = tr.innerText.toLowerCase().includes(filtro)
      ? ""
      : "none";
  });
});

// ==================================================================
// ============================ RICETTE ==============================
// ==================================================================

qs("#btn-add-ingrediente").onclick = aggiungiIngrediente;

function aggiungiIngrediente() {
  const container = qs("#ricetta-ingredienti-container");

  const row = document.createElement("div");
  row.classList.add("ingrediente-row");

  row.innerHTML = `
    <input class="ing-desc" list="ingredienti-suggestions" placeholder="Ingrediente"/>
    <input class="ing-qty" type="number" step="0.01" placeholder="Q.ta"/>
    <input class="ing-um" type="text" placeholder="UM"/>
    <button class="app-button tiny red" onclick="this.parentNode.remove()">X</button>
  `;

  container.appendChild(row);
}

async function aggiornaSuggerimentiIngredienti() {
  const { data } = await supabase.from("prodotti").select("*");

  const dl = qs("#ingredienti-suggestions");
  dl.innerHTML = "";

  data.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.descrizione;
    dl.appendChild(opt);
  });
}

qs("#btn-salva-ricetta").onclick = salvaRicetta;

async function salvaRicetta() {
  const nome = qs("#ricetta-nome").value.trim();
  const descrizione = qs("#ricetta-descrizione").value.trim();
  const note = qs("#ricetta-note").value.trim();

  if (!nome) {
    toast("Inserisci nome ricetta.");
    return;
  }

  const { data: ricetta } = await supabase
    .from("ricette")
    .insert({ nome, descrizione, note })
    .select()
    .single();

  const righe = qsa(".ingrediente-row");

  for (const r of righe) {
    const desc = r.querySelector(".ing-desc").value.trim();
    const qty = parseFloat(r.querySelector(".ing-qty").value) || 0;
    const um = r.querySelector(".ing-um").value.trim();

    if (!desc) continue;

    // trova prodotto
    const { data: prod } = await supabase
      .from("prodotti")
      .select("*")
      .eq("descrizione", desc)
      .maybeSingle();

    await supabase.from("ricette_ingredienti").insert({
      ricetta_id: ricetta.id,
      prodotto_id: prod ? prod.id : null,
      descrizione: desc,
      quantita: qty,
      um
    });
  }

  toast("Ricetta salvata.");
}

// ==================================================================
// ========================= INIZIALIZZAZIONE ========================
// ==================================================================

async function init() {
  await caricaDipendenti();
  await caricaMagazzino();
  await aggiornaSuggerimentiIngredienti();
  showView("login");
}

document.addEventListener("DOMContentLoaded", init);
