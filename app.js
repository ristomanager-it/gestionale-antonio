document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase client non trovato. Controlla index.html.");
  }

  const CURRENT_USER_KEY = "utente_corrente";
  const THEME_KEY = "tema_app";

  // ---- REGOLE CATEGORIA ----
  const REGOLE_CATEGORIA = [
    { nome: "Farinacei", match: ["farina", "semola", "grano", "riso", "pasta"] },
    { nome: "Carni suine", match: ["maiale", "suino", "coppa", "lonza", "salsiccia"] },
    { nome: "Carni bovine", match: ["vitello", "manzo", "bovino", "entrecote", "costata"] },
    { nome: "Carni avicole", match: ["pollo", "gallo", "tacchino", "coscia di pollo"] },
    { nome: "Pesce", match: ["merluzzo", "salmone", "tonno", "branzino", "orata"] },
    { nome: "Conserve di pomodoro", match: ["passata", "pelati", "pomodoro", "polpa"] },
    { nome: "Latticini", match: ["latte", "burro", "panna", "mozzarella", "formaggio"] },
    { nome: "Ortaggi", match: ["zucchine", "melanzane", "carote", "cipolle", "patate"] },
  ];

  // ---------- DOM ----------
  const views = document.querySelectorAll(".view");
  const routeButtons = document.querySelectorAll("[data-route]");
  const managerMenu = document.getElementById("manager-menu");

  // Login
  const loginView = document.getElementById("view-login");
  const loginNomeInput = document.getElementById("login-nome");
  const loginPinInput = document.getElementById("login-pin");
  const loginRememberInput = document.getElementById("login-remember");
  const btnLogin = document.getElementById("btn-login");

  const homeDipView = document.getElementById("view-home-dip");

  // Header
  const currentUserLabel = document.getElementById("current-user-label");
  const btnLogout = document.getElementById("btn-logout");
  const btnTheme = document.getElementById("btn-theme");

  // Stato
  let currentUser = null;
  let dipendenti = [];
  let timbrature = [];
  let fornitori = [];
  let fatture = [];
  let prodotti = [];
  let categorieProdotto = [];
  let ricette = [];
  let ricettaEditId = null;
  let periodoCorrente = "oggi";

  // ---- Tema ----
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
    applyTheme(saved === "light" ? "light" : "dark");
  }

  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      const isLight = document.body.classList.contains("theme-light");
      const next = isLight ? "dark" : "light";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }

  loadTheme();

  // ---- Ruoli ----
  function isManagerRole(ruolo) {
    return ruolo === "admin" || ruolo === "manager_cucina" || ruolo === "manager_sala";
  }

  function formatRuolo(r) {
    return {
      admin: "Admin",
      manager_cucina: "Manager cucina",
      manager_sala: "Manager sala",
      addetto_cucina: "Addetto cucina",
      cameriere: "Cameriere",
    }[r] || "";
  }

  // ---- Header ----
  function updateHeaderUser() {
    if (!currentUserLabel) return;
    if (!currentUser) currentUserLabel.textContent = "Nessun utente";
    else currentUserLabel.textContent = `${currentUser.nome} (${formatRuolo(currentUser.ruolo)})`;

    btnLogout.style.display = currentUser ? "inline-block" : "none";
  }

  // ---- Visibilità ----
  function applyRoleVisibility() {
    const modo = currentUser && isManagerRole(currentUser.ruolo) ? "manager" : "dip";

    document.querySelectorAll("[data-manager-only='true']").forEach(el => {
      el.style.display = modo === "manager" ? "" : "none";
    });

    routeButtons.forEach(btn => {
      const managerOnly = btn.getAttribute("data-manager-only") === "true";
      btn.style.display = managerOnly && modo !== "manager" ? "none" : "";
    });

    managerMenu.style.display = modo === "manager" ? "grid" : "none";
    updateHeaderUser();
  }

  // ---- Mostra view ----
  function showOnlyView(id) {
    views.forEach(v => {
      v.style.display = v.id === id ? "block" : "none";
    });
  }

  function showLogin() {
    managerMenu.style.display = "none";
    homeDipView.style.display = "none";
    showOnlyView("view-login");
    currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    updateHeaderUser();
  }

  function showHomeDipendente() {
    managerMenu.style.display = "none";
    showOnlyView("view-home-dip");
    applyRoleVisibility();
  }

  function showManagerMenuAndRoute(route) {
    managerMenu.style.display = "grid";
    navigateTo(route || "timbratura");
  }

  // ---- Utente corrente ----
  function setCurrentUser(user, persist) {
    currentUser = {
      id: user.id ?? null,
      nome: user.nome,
      ruolo: user.ruolo || "",
      canalePrevalente: user.canalePrevalente || "NR",
      virtualAdmin: !!user.virtualAdmin,
    };

    if (persist) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    else localStorage.removeItem(CURRENT_USER_KEY);

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

      const byId = dipendenti.find(d => d.id === saved.id);
      if (byId) return setCurrentUser(byId, true);

      const byName = dipendenti.find(
        d => d.nome && d.nome.toLowerCase() === saved.nome.toLowerCase()
      );
      if (byName) return setCurrentUser(byName, true);
    } catch {}
  }

  // ---- Login ----
  btnLogin.addEventListener("click", () => {
    const nome = loginNomeInput.value.trim();
    const pin = loginPinInput.value.trim();
    const remember = loginRememberInput.checked;

    if (!nome) return alert("Inserisci il nome");
    if (!pin) return alert("Inserisci il PIN");

    if (nome.toLowerCase() === "admin" && pin === "9999") {
      setCurrentUser({ nome: "Admin", ruolo: "admin", virtualAdmin: true }, remember);
      loginView.style.display = "none";
      showManagerMenuAndRoute("timbratura");
      return;
    }

    const dip = dipendenti.find(
      d =>
        d.attivo &&
        d.nome.toLowerCase() === nome.toLowerCase() &&
        d.codice &&
        d.codice.toString() === pin
    );

    if (!dip) return alert("Nome o PIN non corretti");

    setCurrentUser(dip, remember);
    loginView.style.display = "none";

    if (isManagerRole(dip.ruolo)) showManagerMenuAndRoute("timbratura");
    else showHomeDipendente();
  });

  btnLogout.addEventListener("click", () => showLogin());
  // -----------------------------------------------------------
  // CARICAMENTO DATI PRINCIPALI ALL’AVVIO
  // -----------------------------------------------------------

  async function loadDipendenti() {
    const { data, error } = await supabase.from("dipendenti").select("*").order("nome");
    if (error) {
      console.error("Errore caricamento dipendenti:", error);
      return;
    }
    dipendenti = data || [];
  }

  async function loadTimbrature() {
    const { data, error } = await supabase
      .from("timbrature")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Errore caricamento timbrature:", error);
      return;
    }
    timbrature = data || [];
  }

  async function loadProdotti() {
    const { data, error } = await supabase.from("prodotti").select("*").order("nome");
    if (!error) prodotti = data || [];
  }

  async function loadFornitori() {
    const { data, error } = await supabase.from("fornitori").select("*").order("nome");
    if (!error) fornitori = data || [];
  }

  async function loadFatture() {
    const { data, error } = await supabase
      .from("acquisti_fatture")
      .select("*")
      .order("data", { ascending: false });

    if (!error) fatture = data || [];
  }

  async function loadRicette() {
    const { data, error } = await supabase.from("ricette").select("*").order("nome");

    if (error) {
      console.error("Errore caricamento ricette:", error.message);
      alert("Errore nel caricare ricette");
      return;
    }

    ricette = data || [];
  }

  // -----------------------------------------------------------
  // NAVIGAZIONE (ROUTER)
  // -----------------------------------------------------------

  routeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const r = btn.getAttribute("data-route");
      navigateTo(r);
    });
  });

  async function navigateTo(route) {
    if (!currentUser) return showLogin();

    switch (route) {
      case "timbratura":
        await loadTimbrature();
        updateTimbraturaView();
        showOnlyView("view-timbratura");
        break;

      case "dipendenti":
        updateDipendentiView();
        showOnlyView("view-dipendenti");
        break;

      case "ricette":
        await loadRicette();
        prepareRicetteEditor();
        showOnlyView("view-ricette");
        break;

      case "acquisti":
        await loadFornitori();
        await loadFatture();
        updateAcquistiView();
        showOnlyView("view-acquisti");
        break;

      case "reintegro":
        await loadProdotti();
        updateProdottiView();
        showOnlyView("view-reintegro");
        break;

      case "kpi":
        await caricaKPI();        // ⭐ SARÀ DEFINITO NELLA PARTE 3
        showOnlyView("view-kpi");
        break;

      default:
        showHomeDipendente();
        break;
    }
  }

  // -----------------------------------------------------------
  // TIMBRATURE — FUNZIONI PRINCIPALI
  // -----------------------------------------------------------

  function getLastTimbraturaOpen(dipId) {
    return timbrature.find(
      (t) => t.dipendente_id === dipId && t.azione === "ENTRATA" && !t.chiusura
    );
  }

  async function timbraAzione(azione) {
    if (!currentUser) return alert("Non sei loggato");

    const dipId = currentUser.id;
    const canale = document.getElementById("timbratura-canale-select").value;
    const lastOpen = getLastTimbraturaOpen(dipId);

    if (azione === "ENTRATA") {
      if (lastOpen) return alert("Hai già una entrata aperta.");
    }

    if (azione === "PAUSA" || azione === "USCITA") {
      if (!lastOpen) return alert("Non hai una entrata aperta.");
    }

    const timestamp = new Date().toISOString();

    if (azione === "ENTRATA") {
      const { error } = await supabase.from("timbrature").insert({
        dipendente_id: dipId,
        canale,
        azione: "ENTRATA",
        timestamp,
      });
      if (error) {
        console.error(error);
        return alert("Errore registrazione entrata");
      }
    }

    if (azione === "PAUSA" || azione === "USCITA") {
      const { error } = await supabase
        .from("timbrature")
        .update({
          chiusura: timestamp,
          azione_chiusura: azione === "PAUSA" ? "PAUSA" : "USCITA",
        })
        .eq("id", lastOpen.id);

      if (error) {
        console.error(error);
        return alert("Errore salvataggio uscita/pausa");
      }
    }

    await loadTimbrature();
    updateTimbraturaView();
  }

  document.getElementById("btn-entra").onclick = () => timbraAzione("ENTRATA");
  document.getElementById("btn-pausa").onclick = () => timbraAzione("PAUSA");
  document.getElementById("btn-esci").onclick = () => timbraAzione("USCITA");

  function updateTimbraturaView() {
    if (!currentUser) return;
    document.getElementById("timbratura-utente-nome").textContent =
      currentUser.nome;

    const tbody = document.getElementById("timbratura-lista");
    tbody.innerHTML = "";

    for (const t of timbrature.slice(0, 50)) {
      const dip = dipendenti.find((d) => d.id === t.dipendente_id);
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${new Date(t.timestamp).toLocaleString()}</td>
        <td>${dip ? dip.nome : "-"}</td>
        <td>${t.canale}</td>
        <td>${t.azione}${t.chiusura ? " / " + t.azione_chiusura : ""}</td>
      `;

      tbody.appendChild(tr);
    }
  }

  // -----------------------------------------------------------
  // DIPENDENTI — SALVATAGGIO & LISTA
  // -----------------------------------------------------------

  const btnAddDip = document.getElementById("btn-add-dip");
  const btnToggleDip = document.getElementById("btn-toggle-dipendenti");

  btnAddDip.onclick = async () => {
    const nome = document.getElementById("dip-nome").value.trim();
    const mansione = document.getElementById("dip-mansione").value.trim();
    const dataNascita = document.getElementById("dip-data-nascita").value || null;
    const residenza = document.getElementById("dip-residenza").value.trim();
    const telefono = document.getElementById("dip-telefono").value.trim();
    const email = document.getElementById("dip-email").value.trim();
    const ruolo = document.getElementById("dip-ruolo").value;
    const tipoComp = document.getElementById("dip-tipo-compenso").value;
    const paga = parseFloat(document.getElementById("dip-retribuzione-base").value) || 0;
    const oreMensili = parseFloat(document.getElementById("dip-ore-mensili").value) || null;
    const oreServizio = parseFloat(document.getElementById("dip-ore-servizio").value) || null;
    const costo = parseFloat(document.getElementById("dip-costo").value) || null;
    const pin = document.getElementById("dip-codice").value.trim();
    const canale = document.getElementById("dip-canale").value;
    const attivo = document.getElementById("dip-attivo").checked;

    if (!nome || !ruolo) return alert("Nome e ruolo obbligatori.");

    const { error } = await supabase.from("dipendenti").insert({
      nome,
      mansione,
      data_nascita: dataNascita,
      residenza,
      telefono,
      email,
      ruolo,
      tipo_compenso: tipoComp,
      retribuzione_base: paga,
      ore_mensili: oreMensili,
      ore_servizio: oreServizio,
      costo_orario: costo,
      codice: pin,
      canale_prevalente: canale,
      attivo,
    });

    if (error) {
      console.error(error);
      return alert("Errore salvataggio dipendente");
    }

    await loadDipendenti();
    updateDipendentiView();
    alert("Dipendente salvato");
  };

  btnToggleDip.onclick = () => {
    const div = document.getElementById("sezione-dipendenti-elenco");
    div.style.display = div.style.display === "none" ? "block" : "none";
  };

  function updateDipendentiView() {
    const tbody = document.getElementById("dipendenti-lista");
    tbody.innerHTML = "";

    for (const d of dipendenti) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.nome}</td>
        <td>${d.mansione || ""}</td>
        <td>${d.data_nascita || ""}</td>
        <td>${d.residenza || ""}</td>
        <td>${d.telefono || ""}</td>
        <td>${d.email || ""}</td>
        <td>${formatRuolo(d.ruolo)}</td>
        <td>${d.tipo_compenso}</td>
        <td>${d.costo_orario || "-"}</td>
        <td>${d.canale_prevalente}</td>
        <td>${d.codice}</td>
        <td>${d.attivo ? "Sì" : "No"}</td>
        <td><button class="app-button tiny" data-id="${d.id}">Modifica</button></td>
      `;
      tr.querySelector("button").onclick = () => loadDipendenteForm(d.id);
      tbody.appendChild(tr);
    }
  }

  function loadDipendenteForm(id) {
    const d = dipendenti.find((x) => x.id === id);
    if (!d) return;

    document.getElementById("dip-nome").value = d.nome;
    document.getElementById("dip-mansione").value = d.mansione || "";
    document.getElementById("dip-data-nascita").value = d.data_nascita || "";
    document.getElementById("dip-residenza").value = d.residenza || "";
    document.getElementById("dip-telefono").value = d.telefono || "";
    document.getElementById("dip-email").value = d.email || "";
    document.getElementById("dip-ruolo").value = d.ruolo;
    document.getElementById("dip-tipo-compenso").value = d.tipo_compenso;
    document.getElementById("dip-retribuzione-base").value = d.retribuzione_base || "";
    document.getElementById("dip-ore-mensili").value = d.ore_mensili || "";
    document.getElementById("dip-ore-servizio").value = d.ore_servizio || "";
    document.getElementById("dip-costo").value = d.costo_orario || "";
    document.getElementById("dip-codice").value = d.codice || "";
    document.getElementById("dip-canale").value = d.canale_prevalente;
    document.getElementById("dip-attivo").checked = d.attivo;
  }

  // -----------------------------------------------------------
  // PRODOTTI / MAGAZZINO
  // -----------------------------------------------------------

  document.getElementById("btn-add-prodotto").onclick = async () => {
    const codice = document.getElementById("prodotto-codice").value.trim();
    const nome = document.getElementById("prodotto-nome").value.trim();
    const cat = document.getElementById("prodotto-categoria").value.trim();
    const um = document.getElementById("prodotto-um").value.trim();
    const attivo = document.getElementById("prodotto-attivo").checked;
    const note = document.getElementById("prodotto-note").value.trim();

    if (!nome) return alert("Nome obbligatorio.");

    const { error } = await supabase.from("prodotti").insert({
      codice,
      nome,
      categoria: cat,
      um,
      attivo,
      note,
    });

    if (error) {
      console.error(error);
      alert("Errore salvataggio prodotto");
    }

    await loadProdotti();
    updateProdottiView();
  };

  function updateProdottiView() {
    const tbody = document.getElementById("prodotti-lista");
    tbody.innerHTML = "";

    for (const p of prodotti) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.codice || ""}</td>
        <td>${p.nome}</td>
        <td>${p.categoria || ""}</td>
        <td>${p.um}</td>
        <td>${p.attivo ? "Sì" : "No"}</td>
        <td>${p.note || ""}</td>
        <td><button class="app-button tiny">Modifica</button></td>
      `;
      tbody.appendChild(tr);
    }
  }

  // -----------------------------------------------------------
  // FORNITORI
  // -----------------------------------------------------------

  document.getElementById("btn-add-fornitore").onclick = async () => {
    const nome = document.getElementById("fornitore-nome").value.trim();
    const piva = document.getElementById("fornitore-piva").value.trim();
    const ind = document.getElementById("fornitore-indirizzo").value.trim();
    const tel = document.getElementById("fornitore-telefono").value.trim();
    const mail = document.getElementById("fornitore-email").value.trim();
    const note = document.getElementById("fornitore-note").value.trim();

    if (!nome) return alert("Nome obbligatorio");

    const { error } = await supabase.from("fornitori").insert({
      nome,
      partita_iva: piva,
      indirizzo: ind,
      telefono: tel,
      email: mail,
      note,
    });

    if (error) return alert("Errore salvataggio fornitore");

    await loadFornitori();
    updateAcquistiView();
  };

  function updateAcquistiView() {
    const sel = document.getElementById("fattura-fornitore-select");
    sel.innerHTML = `<option value="">-- seleziona fornitore --</option>`;
    fornitori.forEach((f) => {
      sel.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
    });

    const tbody = document.getElementById("fornitori-lista");
    tbody.innerHTML = "";
    fornitori.forEach((f) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.nome}</td>
        <td>${f.partita_iva || ""}</td>
        <td>${f.telefono || ""}</td>
        <td>${f.email || ""}</td>
        <td><button class="app-button tiny">Modifica</button></td>
      `;
      tbody.appendChild(tr);
    });

    updateFattureList();
  }

  // -----------------------------------------------------------
  // FATTURE + RIGHE
  // -----------------------------------------------------------

  document.getElementById("btn-add-fattura").onclick = async () => {
    const fornitoreId = document.getElementById("fattura-fornitore-select").value;
    const numero = document.getElementById("fattura-numero").value.trim();
    const data = document.getElementById("fattura-data").value;
    const totale = parseFloat(document.getElementById("fattura-totale").value) || null;
    const note = document.getElementById("fattura-note").value.trim();
    const file = document.getElementById("fattura-file").files[0] || null;

    if (!fornitoreId || !numero || !data) {
      return alert("Fornitore, numero e data obbligatori");
    }

    let fileUrl = null;

    if (file) {
      const path = `fatture/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("files")
        .upload(path, file, { upsert: false });

      if (uploadErr) {
        console.error(uploadErr);
        return alert("Errore caricamento file");
      }

      const { data: pubblica } = supabase.storage
        .from("files")
        .getPublicUrl(path);

      fileUrl = pubblica.publicUrl;
    }

    const { error } = await supabase.from("acquisti_fatture").insert({
      fornitore_id: fornitoreId,
      numero,
      data,
      totale,
      file_url: fileUrl,
      note,
    });

    if (error) {
      console.error(error);
      alert("Errore registrazione fattura");
      return;
    }

    await loadFatture();
    updateFattureList();
    alert("Fattura registrata con successo!");
  };

  function updateFattureList() {
    const tbody = document.getElementById("fatture-lista");
    tbody.innerHTML = "";

    fatture.forEach((f) => {
      const fornitore = fornitori.find((x) => x.id === f.fornitore_id);
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${f.data}</td>
        <td>${f.numero}</td>
        <td>${fornitore ? fornitore.nome : "-"}</td>
        <td>${f.totale || "-"}</td>
        <td>${f.file_url ? `<a href="${f.file_url}" target="_blank">Apri</a>` : "-"}</td>
      `;

      tr.onclick = () => openFatturaDetail(f.id);

      tbody.appendChild(tr);
    });
  }

  async function openFatturaDetail(id) {
    const fatt = fatture.find((x) => x.id === id);
    if (!fatt) return;

    document.getElementById("fattura-dettaglio").style.display = "block";

    const forn = fornitori.find((x) => x.id === fatt.fornitore_id);
    const intest = `${forn ? forn.nome : ""} — ${fatt.numero} (${fatt.data})`;
    document.getElementById("fattura-dettaglio-intestazione").textContent =
      intest;

    const { data: righe, error } = await supabase
      .from("acquisti_fatture_righe")
      .select("*")
      .eq("fattura_id", id);

    if (error) console.error(error);

    const tbody = document.getElementById("fattura-righe-lista");
    tbody.innerHTML = "";

    righe.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.descrizione}</td>
        <td>${r.quantita}</td>
        <td>${r.um}</td>
        <td>${r.prezzo || ""}</td>
        <td>${r.totale || ""}</td>
        <td>${r.prodotto_nome || "-"}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // -----------------------------------------------------------
  // RICETTE
  // -----------------------------------------------------------

  function prepareRicetteEditor() {
    document.getElementById("ricetta-ingredienti-container").innerHTML = "";
    document.getElementById("ricetta-nome").value = "";
    document.getElementById("ricetta-descrizione").value = "";
    document.getElementById("ricetta-note").value = "";
  }

  document.getElementById("btn-add-ingrediente").onclick = () => {
    const cont = document.getElementById("ricetta-ingredienti-container");
    const row = document.createElement("div");
    row.className = "ingrediente-row";
    row.innerHTML = `
      <input type="text" placeholder="Ingrediente">
      <input type="number" step="0.01" placeholder="Qta">
      <input type="text" placeholder="UM">
      <button type="button" class="app-button tiny red">X</button>
    `;
    row.querySelector("button").onclick = () => row.remove();
    cont.appendChild(row);
  };
// -----------------------------------------------------------
// KPI AVANZATI — DASHBOARD
// -----------------------------------------------------------

// Elementi DOM KPI
const kpiAttiviEl      = document.getElementById("kpi-attivi");
const kpiOreOggiEl     = document.getElementById("kpi-ore-oggi");
const kpiCostoOggiEl   = document.getElementById("kpi-costo-oggi");
const kpiOreSettimana  = document.getElementById("kpi-ore-settimana");
const kpiOreMese       = document.getElementById("kpi-ore-mese");
const kpiScorteCriticheEl = document.getElementById("kpi-scorte-critiche");

// Grafici
const graficoOreCanvas = document.getElementById("grafico-ore");
const graficoCostiCanvas = document.getElementById("grafico-costi");

// Funzione principale
async function caricaKPI() {
  await loadDipendenti();
  await loadTimbrature();
  await loadProdotti();
  await calcolaKPI();
  await aggiornaGraficiKPI();
}

// -----------------------------------------------------------
// CALCOLO KPI
// -----------------------------------------------------------

async function calcolaKPI() {
  if (!timbrature.length) return;

  const now = new Date();
  const inizioGiorno = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inizioSettimana = new Date(inizioGiorno);
  inizioSettimana.setDate(inizioGiorno.getDate() - (inizioGiorno.getDay() || 7) + 1);
  const inizioMese = new Date(now.getFullYear(), now.getMonth(), 1);

  let attivi = 0;
  let oreOggi = 0;
  let oreSettimana = 0;
  let oreMese = 0;
  let costoOggi = 0;

  // controlla stato aperto
  const lastEvent = {};
  timbrature.forEach((t) => {
    if (!lastEvent[t.dipendente_id] || t.timestamp > lastEvent[t.dipendente_id].timestamp) {
      lastEvent[t.dipendente_id] = t;
    }
  });

  // Attivi ora
  Object.values(lastEvent).forEach((ev) => {
    if (ev.azione === "ENTRATA" && !ev.chiusura) {
      attivi++;
    }
  });

  // Ore e costi
  for (const t of timbrature) {
    if (!t.timestamp) continue;

    const start = new Date(t.timestamp);
    const dip = dipendenti.find((d) => d.id === t.dipendente_id);
    if (!dip || dip.costo_orario == null) continue;

    if (t.chiusura) {
      const end = new Date(t.chiusura);
      const diffH = (end - start) / 1000 / 3600;

      if (start >= inizioGiorno) {
        oreOggi += diffH;
        costoOggi += diffH * dip.costo_orario;
      }
      if (start >= inizioSettimana) oreSettimana += diffH;
      if (start >= inizioMese) oreMese += diffH;
    }
  }

  // Scorte critiche = prodotti con "scorta_attuale < scorta_minima"
  const scorteCritiche = prodotti.filter((p) => p.scorta_attuale != null && p.scorta_minima != null && p.scorta_attuale < p.scorta_minima);

  // Aggiorna UI
  kpiAttiviEl.textContent = attivi;
  kpiOreOggiEl.textContent = oreOggi.toFixed(2) + " h";
  kpiCostoOggiEl.textContent = costoOggi.toFixed(2) + " €";
  kpiOreSettimana.textContent = oreSettimana.toFixed(2) + " h";
  kpiOreMese.textContent = oreMese.toFixed(2) + " h";
  kpiScorteCriticheEl.textContent = scorteCritiche.length + " prodotti";
}

// -----------------------------------------------------------
// GRAFICI NEON KPI
// -----------------------------------------------------------

function aggiornaGraficiKPI() {
  if (typeof Chart === "undefined") return;

  // Grafico ore (oggi / settimana / mese)
  new Chart(graficoOreCanvas, {
    type: "bar",
    data: {
      labels: ["Oggi", "Settimana", "Mese"],
      datasets: [
        {
          label: "Ore lavorate",
          backgroundColor: "#00d1ff88",
          borderColor: "#00d1ff",
          borderWidth: 2,
          data: [
            parseFloat(kpiOreOggiEl.textContent),
            parseFloat(kpiOreSettimana.textContent),
            parseFloat(kpiOreMese.textContent),
          ],
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { color: "#fff" } }, x: { ticks: { color: "#fff" } } },
    },
  });

  // Grafico costi
  new Chart(graficoCostiCanvas, {
    type: "line",
    data: {
      labels: ["Oggi", "Settimana", "Mese"],
      datasets: [
        {
          label: "Costi",
          borderColor: "#ff006e",
          backgroundColor: "#ff006e55",
          borderWidth: 3,
          tension: 0.3,
          data: [
            parseFloat(kpiCostoOggiEl.textContent),
            parseFloat(kpiOreSettimana.textContent) * 12, // stima media
            parseFloat(kpiOreMese.textContent) * 12, // stima
          ],
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { color: "#fff" } }, x: { ticks: { color: "#fff" } } },
    },
  });
}
