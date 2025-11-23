document.addEventListener("DOMContentLoaded", async () => {
  // --- SUPABASE ---
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase client non trovato. Controlla index.html.");
  }

  // --- COSTANTI STORAGE ---
  const CURRENT_DIP_KEY = "dipendente_corrente"; // per timbratura (ultimo usato)
  const CURRENT_USER_KEY = "utente_corrente"; // per login
  const MODE_KEY = "modalita_utente"; // 'dipendente' | 'manager'

  // --- ELEMENTI BASE ---
  const views = document.querySelectorAll(".view");
  const buttons = document.querySelectorAll("[data-route]");
  const buttonsGrid = document.querySelector(".buttons-grid");

  const loginView = document.getElementById("view-login");
  const loginDipSelect = document.getElementById("login-dipendente");
  const loginPinInput = document.getElementById("login-pin");
  const btnLogin = document.getElementById("btn-login");

  const homeDipView = document.getElementById("view-home-dip");

  const currentUserLabel = document.getElementById("current-user-label");
  const btnLogout = document.getElementById("btn-logout");

  // --- STATO ---
  let dipendenti = []; // anagrafica
  let timbrature = []; // timbrature
  let periodoCorrente = "oggi";
  let modalita = "dipendente"; // vista generale
  let currentUser = null; // {id, nome, ruolo, ...}

  // --- FUNZIONI RUOLI / MODALITÀ ---

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

  function applyMode() {
    // modalità basata sul ruolo corrente
    if (currentUser && isManagerRole(currentUser.ruolo)) {
      modalita = "manager";
    } else {
      modalita = "dipendente";
    }

    // sezioni interne solo manager (riepiloghi + viste con data-manager-only)
    document
      .querySelectorAll("[data-manager-only='true'], .manager-only")
      .forEach((el) => {
        el.style.display = modalita === "manager" ? "" : "none";
      });

    // pulsanti del menu principale (data-manager-only)
    buttons.forEach((btn) => {
      const managerOnly = btn.getAttribute("data-manager-only") === "true";
      if (managerOnly && modalita !== "manager") {
        btn.style.display = "none";
      } else {
        btn.style.display = "";
      }
    });

    updateHeaderUser();
  }

  function showLogin() {
    if (loginView) loginView.style.display = "block";
    if (buttonsGrid) buttonsGrid.style.display = "none";
    if (homeDipView) homeDipView.style.display = "none";

    views.forEach((v) => {
      if (v.id !== "view-login") {
        v.style.display = "none";
      }
    });

    currentUser = null;
    modalita = "dipendente";
    localStorage.removeItem(CURRENT_USER_KEY);
    updateHeaderUser();
  }

  function setCurrentUserFromDipendente(d) {
    if (!d) return;
    currentUser = {
      id: d.id,
      nome: d.nome,
      ruolo: d.ruolo || "",
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    applyMode();
  }

  function restoreUserFromStorage() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (!saved) return;

      const found = dipendenti.find((d) => d.id === saved.id);
      if (found) {
        currentUser = found;
      } else {
        const byName = dipendenti.find((d) => d.nome === saved.nome);
        if (byName) currentUser = byName;
      }
      applyMode();
    } catch {
      // niente
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      showLogin();
    });
  }

  // ------------------------------------------------
  //             ANAGRAFICA DIPENDENTI
  // ------------------------------------------------

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

  function formatDataNascita(dataNascita) {
    if (!dataNascita) return "";
    const d = new Date(dataNascita);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("it-IT");
  }

  function calcolaCostoOrario(tipo, retribuzioneBase, oreMensili, oreServizio) {
    if (!retribuzioneBase || retribuzioneBase <= 0) return 0;

    if (tipo === "orario") {
      return retribuzioneBase;
    }

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

  function aggiornaUICompenso() {
    if (!dipTipoCompenso || !labelRetribuzione) return;

    const tipo = dipTipoCompenso.value || "orario";

    if (tipo === "orario") {
      labelRetribuzione.firstChild.textContent =
        "Paga oraria lorda (€/h)";
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
    const oreMensiliVal =
      parseFloat(dipOreMensili?.value || "0") || 0;
    const oreServizioVal =
      parseFloat(dipOreServizio?.value || "0") || 0;

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
    aggiornaSelectDipendenti();
    renderLoginDipendenti();
    applicaDipendenteCorrente();
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
      const oreMensiliVal =
        parseFloat(dipOreMensili?.value || "0") || 0;
      const oreServizioVal =
        parseFloat(dipOreServizio?.value || "0") || 0;

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
    });
  }

  // ------------------------------------------------
  //                     LOGIN
  // ------------------------------------------------

  function renderLoginDipendenti() {
    if (!loginDipSelect) return;
    loginDipSelect.innerHTML = `<option value="">-- seleziona dipendente --</option>`;

    dipendenti
      .filter((d) => d.attivo)
      .forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.nome;
        loginDipSelect.appendChild(opt);
      });
  }

  if (btnLogin) {
    btnLogin.addEventListener("click", () => {
      const dipId = loginDipSelect?.value || "";
      const pin = (loginPinInput?.value || "").trim();

      if (!dipId) {
        alert("Seleziona un dipendente");
        return;
      }
      if (!pin) {
        alert("Inserisci il PIN");
        return;
      }

      const d = dipendenti.find((x) => x.id === dipId);
      if (!d) {
        alert("Dipendente non trovato");
        return;
      }

      if (!d.codice || d.codice.toString() !== pin.toString()) {
        alert("PIN errato");
        return;
      }

      setCurrentUserFromDipendente(d);

      if (loginView) loginView.style.display = "none";

      if (isManagerRole(d.ruolo)) {
        // Manager / Admin -> menu completo
        if (buttonsGrid) buttonsGrid.style.display = "grid";

        const initialRoute =
          window.location.hash.replace("#", "") || "timbratura";
        navigateTo(initialRoute);
      } else {
        // Dipendenti normali -> home con pulsanti dedicati
        if (buttonsGrid) buttonsGrid.style.display = "none";

        views.forEach((v) => {
          if (v.id !== "view-login") {
            v.style.display = "none";
          }
        });

        if (homeDipView) homeDipView.style.display = "block";
        applyMode();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  // ------------------------------------------------
  //                     TIMBRATURE
  // ------------------------------------------------

  const dipInput = document.getElementById("timbratura-dipendente");
  const dipSelect = document.getElementById("timbratura-dipendente-select");
  const codiceInput = document.getElementById("timbratura-codice");
  const canaleSelect = document.getElementById("timbratura-canale");
  const lista = document.getElementById("timbratura-lista");

  const btnEntra = document.getElementById("btn-entra");
  const btnPausa = document.getElementById("btn-pausa");
  const btnEsci = document.getElementById("btn-esci");

  const riepilogoDipEl = document.getElementById("riepilogo-dipendenti");
  const riepilogoCanaliEl = document.getElementById("riepilogo-canali");
  const attiviListaEl = document.getElementById("attivi-lista");
  const periodoSelect = document.getElementById("timbratura-periodo");

  const costoDipEl = document.getElementById("costo-dipendenti");
  const costoCanaliEl = document.getElementById("costo-canali");

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

  function aggiornaSelectDipendenti() {
    if (!dipSelect) return;
    dipSelect.innerHTML = `<option value="">-- seleziona dipendente --</option>`;

    dipendenti
      .filter((d) => d.attivo)
      .forEach((d, index) => {
        const opt = document.createElement("option");
        opt.value = index.toString();
        opt.textContent = d.nome;
        dipSelect.appendChild(opt);
      });
  }

  function trovaDipPerCodice(codice) {
    return dipendenti.findIndex(
      (d) => d.codice && d.codice.toString() === codice.toString()
    );
  }

  function salvaDipendenteCorrente(d) {
    if (!d) return;
    const payload = {
      codice: d.codice || null,
      nome: d.nome || null,
    };
    localStorage.setItem(CURRENT_DIP_KEY, JSON.stringify(payload));
  }

  function applicaDipendenteCorrente() {
    if (!dipSelect || !dipInput || !canaleSelect) return;

    const raw = localStorage.getItem(CURRENT_DIP_KEY);
    if (!raw) return;

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch {
      return;
    }
    if (!saved) return;

    let idx = -1;
    if (saved.codice) {
      idx = trovaDipPerCodice(saved.codice);
    }
    if (idx < 0 && saved.nome) {
      idx = dipendenti.findIndex((d) => d.nome === saved.nome);
    }
    if (idx < 0) return;

    const d = dipendenti[idx];
    if (!d || !d.attivo) return;

    dipSelect.value = idx.toString();
    dipInput.value = d.nome;
    if (d.canalePrevalente) {
      canaleSelect.value = d.canalePrevalente;
    }
  }

  if (dipSelect) {
    dipSelect.addEventListener("change", () => {
      const idx = dipSelect.value;
      if (idx === "") {
        if (dipInput) dipInput.value = "";
        return;
      }
      const d = dipendenti[parseInt(idx, 10)];
      if (d) {
        dipInput.value = d.nome;
        if (canaleSelect && d.canalePrevalente) {
          canaleSelect.value = d.canalePrevalente;
        }
        salvaDipendenteCorrente(d);
      }
    });
  }

  if (codiceInput) {
    codiceInput.addEventListener("change", () => {
      const codice = codiceInput.value.trim();
      if (!codice) return;

      const idx = trovaDipPerCodice(codice);
      if (idx >= 0) {
        dipSelect.value = idx.toString();
        const d = dipendenti[idx];
        dipInput.value = d.nome;
        if (canaleSelect && d.canalePrevalente) {
          canaleSelect.value = d.canalePrevalente;
        }
        salvaDipendenteCorrente(d);
      } else {
        alert("Nessun dipendente trovato per questo PIN personale");
      }
    });
  }

  if (periodoSelect) {
    periodoSelect.addEventListener("change", () => {
      periodoCorrente = periodoSelect.value || "oggi";
      aggiornaRiepilogo();
    });
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
    if (periodoCorrente === "settimana") startPeriodoMs = startSettimana.getTime();
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

    riepilogoCanaliEl.innerHTML = "";
    Object.entries(perCanale).forEach(([canale, minuti]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${canale}</td>
        <td>${formatDurationMinutes(minuti)}</td>
      `;
      riepilogoCanaliEl.appendChild(tr);
    });

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

  async function salvaTimbraturaSupabase(record) {
    if (!supabase) return null;

    let dipendenteId = null;
    const dipNomeVal = record.dip;
    const d = dipendenti.find((x) => x.nome === dipNomeVal);
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
    const dipNomeVal = (dipInput?.value || "").trim();
    const canaleVal = canaleSelect?.value || "NR";

    if (!dipNomeVal) {
      alert("Seleziona un dipendente (tramite codice o menu)");
      return;
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

  // ------------------------------------------------
  //                     ROUTING
  // ------------------------------------------------

  async function onRouteEnter(route) {
    switch (route) {
      case "timbratura":
        await caricaTimbratureDaSupabase();
        break;
      case "dipendenti":
        await caricaDipendentiDaSupabase();
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

    views.forEach((v) => {
      if (v.id !== "view-login") {
        v.style.display = "none";
      }
    });

    let targetRoute = route;
    let active = document.getElementById(`view-${route}`);

    if (
      active &&
      modalita === "dipendente" &&
      active.getAttribute("data-manager-only") === "true"
    ) {
      targetRoute = "timbratura";
      active = document.getElementById("view-timbratura");
    }

    if (active) {
      active.style.display = "block";
      await onRouteEnter(targetRoute);
    }

    applyMode();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  buttons.forEach((btn) => {
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

  // ------------------------------------------------
  //                     AVVIO
  // ------------------------------------------------

  async function applicaTuttoAllAvvio() {
    await caricaDipendentiDaSupabase();
    await caricaTimbratureDaSupabase();

    restoreUserFromStorage();

    if (currentUser) {
      if (loginView) loginView.style.display = "none";

      if (isManagerRole(currentUser.ruolo)) {
        if (buttonsGrid) buttonsGrid.style.display = "grid";
        if (homeDipView) homeDipView.style.display = "none";

        const initialRoute =
          window.location.hash.replace("#", "") || "timbratura";
        await navigateTo(initialRoute);
      } else {
        if (buttonsGrid) buttonsGrid.style.display = "none";
        if (homeDipView) homeDipView.style.display = "block";
        applyMode();
      }
    } else {
      showLogin();
    }
  }

  await applicaTuttoAllAvvio();
});
