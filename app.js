
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


    // ========= ACQUISTI / FATTURE + MAGAZZINO =========

  // datalist per categorie di bilancio (fatture)
  const bilancioCategorieDatalist =
    document.getElementById("bilancio-categorie");

  // datalist per categorie prodotto (fatture + magazzino)
  let categorieProdottoDatalist = document.getElementById(
    "categorie-prodotto"
  );
  if (!categorieProdottoDatalist) {
    categorieProdottoDatalist = document.createElement("datalist");
    categorieProdottoDatalist.id = "categorie-prodotto";
    document.body.appendChild(categorieProdottoDatalist);
  }

  // collega il datalist al campo categoria del magazzino
  if (magazzinoCategoriaInput) {
    magazzinoCategoriaInput.setAttribute("list", "categorie-prodotto");
  }

  // aggiorna le opzioni del datalist categorie prodotto dai dati in cache
  function aggiornaCategorieProdottoDatalist() {
    if (!categorieProdottoDatalist) return;
    categorieProdottoDatalist.innerHTML = "";

    // uso categorieCache (tabella categorie_prodotto)
    const nomi = (categorieCache || [])
      .map((c) => c.nome)
      .filter(Boolean);

    const unici = [...new Set(nomi.map((n) => n.trim()))].filter(Boolean);

    unici.sort((a, b) => a.localeCompare(b, "it-IT"));

    unici.forEach((nome) => {
      const opt = document.createElement("option");
      opt.value = nome;
      categorieProdottoDatalist.appendChild(opt);
    });
  }

  // carico fornitori in cache
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
      .select("id, codice, nome")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento categorie:", error);
      alert("Errore Supabase (caricamento categorie): " + error.message);
      return;
    }
    categorieCache = data || [];

    // aggiorno il datalist delle categorie prodotto
    aggiornaCategorieProdottoDatalist();
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

  // 🔹 trova/crea categoria prodotto, tenendo conto che in categorie_prodotto c'è la colonna "codice" NOT NULL
  async function findOrCreateCategoriaByNome(nomeCategoria) {
    if (!supabase) return null;
    const nomeTrim = (nomeCategoria || "").trim();
    if (!nomeTrim) return null;

    const existing = categorieCache.find(
      (c) => c.nome && c.nome.toLowerCase() === nomeTrim.toLowerCase()
    );
    if (existing) return existing;

    // genero un codice semplice dalla descrizione (es. "MATERIE PRIME" -> "MATERIE_PRIME")
    const codice = nomeTrim
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "")
      .slice(0, 30) || "CAT";

    const { data, error } = await supabase
      .from("categorie_prodotto")
      .insert({
        codice,
        nome: nomeTrim,
        attivo: true,
      })
      .select("id, codice, nome")
      .single();

    if (error) {
      console.error("Errore creazione categoria prodotto:", error);
      alert("Errore Supabase (categoria prodotto): " + error.message);
      return null;
    }

    categorieCache.push(data);
    aggiornaCategorieProdottoDatalist();
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

  // 🔁 Carica le categorie di bilancio già usate nelle fatture e popola il datalist
  async function caricaCategorieBilancioDatalist() {
    if (!supabase || !bilancioCategorieDatalist) return;

    const { data, error } = await supabase
      .from("fatture_acquisto_righe")
      .select("categoria_bilancio")
      .not("categoria_bilancio", "is", null);

    if (error) {
      console.error("Errore caricamento categorie di bilancio:", error);
      return;
    }

    const valori = (data || [])
      .map((r) => (r.categoria_bilancio || "").trim())
      .filter(Boolean);

    const unici = [...new Set(valori)];

    bilancioCategorieDatalist.innerHTML = "";
    unici
      .sort((a, b) => a.localeCompare(b, "it-IT"))
      .forEach((val) => {
        const opt = document.createElement("option");
        opt.value = val;
        bilancioCategorieDatalist.appendChild(opt);
      });
  }

  // 🔁 Auto-compilazione categoria + categoria di bilancio quando scrivi la descrizione
  async function onDescrizioneProdottoChange(tr) {
    if (!tr) return;
    const descrInput = tr.querySelector(".fatt-riga-descrizione");
    if (!descrInput) return;

    const descrValRaw = descrInput.value || "";
    const descrVal = descrValRaw.trim();
    if (!descrVal) return;

    const descrLower = descrVal.toLowerCase();

    // 1) Prima provo a vedere se ho già il prodotto in magazzinoDati
    let prodotto =
      magazzinoDati.find(
        (p) =>
          (p.descrizione || "").toString().toLowerCase() === descrLower
      ) || null;

    // 2) Se non lo trovo in magazzinoDati, lo cerco su Supabase (prodotti)
    if (!prodotto && supabase) {
      const { data: prodRows, error: prodErr } = await supabase
        .from("prodotti")
        .select("id, codice_interno, descrizione, categoria_id, um")
        .ilike("descrizione", descrVal)
        .limit(1);

      if (prodErr) {
        console.error("Errore ricerca prodotto da descrizione:", prodErr);
      }

      if (prodRows && prodRows.length > 0) {
        const p = prodRows[0];
        prodotto = {
          id: p.id,
          codice: p.codice_interno,
          descrizione: p.descrizione,
          um: p.um,
          categoria_id: p.categoria_id,
        };
      }
    }

    if (!prodotto) {
      // Nessun prodotto trovato, non compilo nulla
      return;
    }

    const codiceInput = tr.querySelector(".fatt-riga-codice");
    const umInput = tr.querySelector(".fatt-riga-um");
    const catInput = tr.querySelector(".fatt-riga-categoria");
    const bilancioInput = tr.querySelector(".fatt-riga-bilancio");

    if (codiceInput) {
      codiceInput.value =
        prodotto.codice ||
        prodotto.codice_interno ||
        codiceInput.value ||
        "";
    }
    if (umInput) {
      umInput.value = prodotto.um || umInput.value || "";
    }

    // 3) Categoria: se non ho già il nome, lo ricavo dalla tabella categorie_prodotto
    let categoriaNome =
      prodotto.categoriaNome ||
      prodotto.categoria_nome ||
      "";

    if (!categoriaNome && prodotto.categoria_id && supabase) {
      const { data: catRows, error: catErr } = await supabase
        .from("categorie_prodotto")
        .select("id, nome")
        .eq("id", prodotto.categoria_id)
        .limit(1);

      if (catErr) {
        console.error("Errore lettura categoria prodotto:", catErr);
      } else if (catRows && catRows.length > 0) {
        categoriaNome = catRows[0].nome;
      }
    }

    if (catInput && categoriaNome) {
      catInput.value = categoriaNome;
    }

    // 4) Categoria di bilancio: prendo l'ultima usata per questo prodotto nelle fatture
    if (bilancioInput && supabase && prodotto.id) {
      const { data: bilRows, error: bilErr } = await supabase
        .from("fatture_acquisto_righe")
        .select("categoria_bilancio")
        .eq("prodotto_id", prodotto.id)
        .not("categoria_bilancio", "is", null)
        .order("id", { ascending: false })
        .limit(1);

      if (bilErr) {
        console.error(
          "Errore lettura categoria di bilancio per prodotto:",
          bilErr
        );
      } else if (
        bilRows &&
        bilRows.length > 0 &&
        bilRows[0].categoria_bilancio
      ) {
        bilancioInput.value = bilRows[0].categoria_bilancio;
      }
    }

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
                list="categorie-prodotto"
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

          <!-- 🔥 CARD DOPPIO SCONTO 10 + 5 % -->
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
    await caricaCategorieInCache();

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

    // elimino righe esistenti e le riscrivo
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
        prezzo_unitario: prezzoVal, // listino
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

      // 🔁 dopo aver salvato le righe aggiorno subito il magazzino
      await caricaMagazzinoDati();
    }

    // aggiorno il datalist delle categorie di bilancio in base alle nuove righe
    await caricaCategorieBilancioDatalist();

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

    // carico le categorie prima di usare getCategoriaById
    await caricaCategorieInCache();

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

  // all'avvio carico le categorie di bilancio già presenti nelle righe fatture
  if (bilancioCategorieDatalist) {
    caricaCategorieBilancioDatalist();
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
});document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ App avviata – STEP 3 DIPENDENTI PER LOCALE");

  // =========================
  // DOM CORE
  // =========================
  const allViews = document.querySelectorAll(".view");
  const viewLogin = document.getElementById("view-login");
  const viewHomeDip = document.getElementById("view-home-dip");
  const managerMenu = document.getElementById("manager-menu");
  const viewDipendenti = document.getElementById("view-dipendenti");

  const btnLogin = document.getElementById("btn-login");
  const btnLogout = document.getElementById("btn-logout");

  const inputNome = document.getElementById("login-nome");
  const inputPin = document.getElementById("login-pin");

  const currentUserLabel = document.getElementById("current-user-label");

  // DIPENDENTI FORM
  const dipForm = document.getElementById("dipendente-form");
  const dipLista = document.getElementById("dipendenti-lista");

  // =========================
  // DATI BASE
  // =========================
  const LOCALI = {
    CP: "Centro Produzione",
    TA: "Trattoria dell’Aquila",
    AP: "Da Antonio Pizza",
    CR: "Campo Antico Ristorante",
    CC: "Campo Antico Catering",
  };

  const UTENTI = {
    admin: { pin: "9999", ruolo: "superadmin", locale: "CP" },
    michele: { pin: "1111", ruolo: "manager", locale: "CP" },
    antonio: { pin: "1975", ruolo: "manager", locale: "TA" },
  };

  // =========================
  // STORAGE DIPENDENTI (LOCALE)
  // =========================
  function getDipendenti() {
    return JSON.parse(localStorage.getItem("ga_dipendenti") || "[]");
  }

  function saveDipendenti(list) {
    localStorage.setItem("ga_dipendenti", JSON.stringify(list));
  }

  // =========================
  // HELPERS UI
  // =========================
  function hideAllViews() {
    allViews.forEach(v => (v.style.display = "none"));
  }

  function showView(id) {
    hideAllViews();
    const v = document.getElementById(id);
    if (v) v.style.display = "block";
  }

  // =========================
  // SESSIONE
  // =========================
  function getSession() {
    return JSON.parse(localStorage.getItem("ga_session") || "null");
  }

  function setSession(session) {
    localStorage.setItem("ga_session", JSON.stringify(session));
  }

  // =========================
  // LOGIN / LOGOUT
  // =========================
  function showLogin() {
    hideAllViews();
    viewLogin.style.display = "block";
    managerMenu.style.display = "none";
    btnLogout.style.display = "none";
    currentUserLabel.textContent = "Nessun utente";
    localStorage.removeItem("ga_session");
  }

  function enterApp(session) {
    hideAllViews();

    currentUserLabel.textContent =
      session.nome + " – " + LOCALI[session.locale];

    btnLogout.style.display = "inline-block";

    if (session.ruolo === "manager" || session.ruolo === "superadmin") {
      managerMenu.style.display = "grid";
      showView("view-dipendenti");
      renderDipendenti();
    } else {
      showView("view-home-dip");
    }
  }

  // =========================
  // LOGIN CLICK
  // =========================
  btnLogin.addEventListener("click", () => {
    const nome = inputNome.value.trim().toLowerCase();
    const pin = inputPin.value.trim();
    const user = UTENTI[nome];

    if (!user || user.pin !== pin) {
      alert("Nome o PIN non corretti");
      return;
    }

    const session = { nome, ruolo: user.ruolo, locale: user.locale };
    setSession(session);
    enterApp(session);
  });

  btnLogout.addEventListener("click", showLogin);

  // =========================
  // ROUTING MANAGER
  // =========================
  managerMenu.addEventListener("click", e => {
    const btn = e.target.closest("[data-route]");
    if (!btn) return;

    const viewId = "view-" + btn.dataset.route;
    showView(viewId);

    if (viewId === "view-dipendenti") {
      renderDipendenti();
    }
  });

  // =========================
  // DIPENDENTI – LOGICA
  // =========================
  function renderDipendenti() {
    const session = getSession();
    if (!session) return;

    const all = getDipendenti();

    const filtrati =
      session.ruolo === "superadmin"
        ? all
        : all.filter(d => d.locale === session.locale);

    dipLista.innerHTML = "";

    filtrati.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.nome}</td>
        <td>${d.mansione || ""}</td>
        <td>${d.data_nascita || ""}</td>
        <td>${d.residenza || ""}</td>
        <td>${d.telefono || ""}</td>
        <td>${d.email || ""}</td>
        <td>${d.ruolo}</td>
        <td>${d.tipo_compenso}</td>
        <td>${d.costo || ""}</td>
        <td>${LOCALI[d.locale]}</td>
        <td>${d.pin}</td>
        <td>${d.attivo ? "✅" : "❌"}</td>
        <td>-</td>
      `;
      dipLista.appendChild(tr);
    });
  }

  // =========================
  // SALVATAGGIO DIPENDENTE
  // =========================
  dipForm.addEventListener("submit", e => {
    e.preventDefault();

    const session = getSession();
    if (!session) return;

    const dip = {
      id: crypto.randomUUID(),
      nome: document.getElementById("dip-nome").value,
      mansione: document.getElementById("dip-mansione").value,
      data_nascita: document.getElementById("dip-data-nascita").value,
      residenza: document.getElementById("dip-residenza").value,
      telefono: document.getElementById("dip-telefono").value,
      email: document.getElementById("dip-email").value,
      ruolo: document.getElementById("dip-ruolo").value,
      tipo_compenso: document.getElementById("dip-tipo-compenso").value,
      costo: document.getElementById("dip-costo").value,
      pin: document.getElementById("dip-codice").value,
      attivo: document.getElementById("dip-attivo").checked,
      locale: session.locale, // 🔒 BLOCCO LOCALE
    };

    const list = getDipendenti();
    list.push(dip);
    saveDipendenti(list);

    dipForm.reset();
    renderDipendenti();
  });

  // =========================
  // AVVIO
  // =========================
  const saved = getSession();
  if (saved) {
    console.log("🔁 Sessione ripristinata");
    enterApp(saved);
  } else {
    showLogin();
  }
});
