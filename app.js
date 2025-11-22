document.addEventListener("DOMContentLoaded", async () => {
  // --- SUPABASE ---
  const supabase = window.supabaseClient;

  // --- COSTANTI CHIAVI STORAGE (solo stato locale) ---
  const CURRENT_DIP_KEY = "dipendente_corrente";
  const MODE_KEY = "modalita_utente"; // 'dipendente' | 'manager'

  // PIN manager per il prototipo
  const MANAGER_PIN = "9999";

  // --- ROUTER SPA ---
  const views = document.querySelectorAll(".view");
  const buttons = document.querySelectorAll("[data-route]");

  // --- MODALITÀ MANAGER / DIPENDENTE ---
  let modalita = localStorage.getItem(MODE_KEY) || "dipendente";

  const modeLabel = document.getElementById("mode-label");
  const btnModeManager = document.getElementById("btn-mode-manager");
  const btnModeExit = document.getElementById("btn-mode-exit");

  function applyMode() {
    const managerElements = document.querySelectorAll(
      "[data-manager-only='true'], .manager-only"
    );

    if (modalita === "manager") {
      managerElements.forEach((el) => {
        if (!el.dataset.originalDisplay) {
          el.dataset.originalDisplay = el.style.display || "";
        }
        el.style.display = el.dataset.originalDisplay || "";
      });

      if (modeLabel) modeLabel.textContent = "Modalità: Manager";
      if (btnModeManager) btnModeManager.style.display = "none";
      if (btnModeExit) btnModeExit.style.display = "inline-block";
    } else {
      managerElements.forEach((el) => {
        if (!el.dataset.originalDisplay) {
          el.dataset.originalDisplay = el.style.display || "";
        }
        el.style.display = "none";
      });

      if (modeLabel) modeLabel.textContent = "Modalità: Dipendente";
      if (btnModeManager) btnModeManager.style.display = "inline-block";
      if (btnModeExit) btnModeExit.style.display = "none";
    }
  }

  if (btnModeManager) {
    btnModeManager.addEventListener("click", () => {
      const pin = prompt("Inserisci PIN manager");
      if (pin === MANAGER_PIN) {
        modalita = "manager";
        localStorage.setItem(MODE_KEY, modalita);
        applyMode();
        alert("Accesso manager attivato");
      } else if (pin !== null) {
        alert("PIN errato");
      }
    });
  }

  if (btnModeExit) {
    btnModeExit.addEventListener("click", () => {
      modalita = "dipendente";
      localStorage.setItem(MODE_KEY, modalita);
      applyMode();
      alert("Sei uscito dalla modalità manager");
    });
  }

  function navigateTo(route) {
    views.forEach((v) => (v.style.display = "none"));

    const active = document.getElementById(`view-${route}`);
    if (active) {
      if (
        modalita === "dipendente" &&
        active.getAttribute("data-manager-only") === "true"
      ) {
        const fallback = document.getElementById("view-timbratura");
        if (fallback) fallback.style.display = "block";
      } else {
        active.style.display = "block";
      }
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

  const initialRoute = window.location.hash.replace("#", "") || "timbratura";
  navigateTo(initialRoute);

  // --- ANAGRAFICA DIPENDENTI ---

  const dipNome = document.getElementById("dip-nome");
  const dipMansione = document.getElementById("dip-mansione");
  const dipCosto = document.getElementById("dip-costo");
  const dipCodice = document.getElementById("dip-codice");
  const dipCanale = document.getElementById("dip-canale");
  const dipAttivo = document.getElementById("dip-attivo");
  const btnAddDip = document.getElementById("btn-add-dip");
  const dipLista = document.getElementById("dipendenti-lista");

  let dipendenti = []; // verrà popolato da Supabase

  async function caricaDipendentiDaSupabase() {
    const { data, error } = await supabase
      .from("dipendenti")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento dipendenti:", error);
      alert("Errore nel caricare i dipendenti da Supabase");
      return;
    }

    dipendenti = data.map((row) => ({
      id: row.id,
      nome: row.nome,
      mansione: row.mansione,
      costoOrario: row.costo_orario ?? 0,
      codice: row.codice,
      canalePrevalente: row.canale_prevalente,
      attivo: row.attivo,
    }));

    renderDipendenti();
    aggiornaSelectDipendenti();
    applicaDipendenteCorrente();
  }

  async function salvaDipendenteSupabase(dip) {
    const payload = {
      id: dip.id || undefined,
      nome: dip.nome,
      mansione: dip.mansione,
      costo_orario: dip.costoOrario,
      codice: dip.codice,
      canale_prevalente: dip.canalePrevalente,
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
    if (!dip.id) return;

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
        <td>${d.canalePrevalente || ""}</td>
        <td>${d.costoOrario?.toFixed ? d.costoOrario.toFixed(2) : d.costoOrario || ""}</td>
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

    dipNome.value = d.nome || "";
    dipMansione.value = d.mansione || "";
    dipCosto.value = d.costoOrario != null ? d.costoOrario : "";
    dipCodice.value = d.codice || "";
    dipCanale.value = d.canalePrevalente || "NR";
    dipAttivo.checked = !!d.attivo;

    dipNome.dataset.editIndex = index.toString();
  }

  if (btnAddDip) {
    btnAddDip.addEventListener("click", async () => {
      const nome = (dipNome.value || "").trim();
      if (!nome) {
        alert("Inserisci il nome del dipendente");
        return;
      }

      const mansione = (dipMansione.value || "").trim();
      const costo = parseFloat(dipCosto.value || "0") || 0;
      const codice = (dipCodice.value || "").trim();
      const canalePrevalente = dipCanale.value || "NR";
      const attivo = dipAttivo.checked;

      const editIndex = dipNome.dataset.editIndex;
      let dipObj = {
        nome,
        mansione,
        costoOrario: costo,
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

      dipNome.value = "";
      dipMansione.value = "";
      dipCosto.value = "";
      dipCodice.value = "";
      dipCanale.value = "NR";
      dipAttivo.checked = true;

      await caricaDipendentiDaSupabase();
    });
  }

  // --- TIMBRATURA COLLEGATA AI DIPENDENTI ---

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

  let timbrature = []; // verrà popolato da Supabase
  let periodoCorrente = "oggi";

  async function caricaTimbratureDaSupabase() {
    const { data, error } = await supabase
      .from("timbrature")
      .select("*")
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Errore caricamento timbrature:", error);
      alert("Errore nel caricare le timbrature da Supabase");
      return;
    }

    timbrature = data.map((row) => ({
      id: row.id,
      dipendente_id: row.dipendente_id || null,
      dip: row.dip_nome,
      canale: row.canale,
      tipo: row.tipo,
      ora: row.ora,
      timestamp: row.timestamp ? new Date(row.timestamp).getTime() : null,
    }));

    aggiornaTabella();
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
        dipInput.value = "";
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
        alert("Nessun dipendente trovato per questo codice");
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

  function aggiornaTabella() {
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
    const day = startSettimana.getDay() || 7; // lun=1...dom=7
    startSettimana.setDate(startSettimana.getDate() - (day - 1));

    const startMese = new Date(adessoDate.getFullYear(), adessoDate.getMonth(), 1);
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

    // --- Riepilogo ore per dipendente ---
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

    // --- Riepilogo ore per canale ---
    riepilogoCanaliEl.innerHTML = "";
    Object.entries(perCanale).forEach(([canale, minuti]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${canale}</td>
        <td>${formatDurationMinutes(minuti)}</td>
      `;
      riepilogoCanaliEl.appendChild(tr);
    });

    // --- Costo del lavoro ---
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

    // --- Attivi adesso ---
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
    // provo a collegare anche il dipendente_id se riesco a individuarlo
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
    const dipNomeVal = (dipInput.value || "").trim();
    const canaleVal = canaleSelect.value;

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
    aggiornaTabella();
    aggiornaRiepilogo();
  }

  if (btnEntra) btnEntra.addEventListener("click", () => registraTimbratura("Entrata"));
  if (btnPausa) btnPausa.addEventListener("click", () => registraTimbratura("Pausa"));
  if (btnEsci) btnEsci.addEventListener("click", () => registraTimbratura("Uscita"));

  // --- AVVIO COMPLETO ---

  async function applicaTuttoAllAvvio() {
    applyMode();
    await caricaDipendentiDaSupabase();
    await caricaTimbratureDaSupabase();
    applicaDipendenteCorrente();
  }

  await applicaTuttoAllAvvio();
});
