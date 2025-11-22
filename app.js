document.addEventListener("DOMContentLoaded", async () => {
  // --- SUPABASE ---
  const supabase = window.supabaseClient;
  if (!supabase) {
    console.error("Supabase client non trovato. Controlla index.html.");
  }

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

  // --- FATTURE / MAGAZZINO ---

  const fattFornitoreSelect = document.getElementById("fatt-fornitore");
  const fattNuovoFornitoreInput = document.getElementById("fatt-nuovo-fornitore");
  const fattDataInput = document.getElementById("fatt-data");
  const fattNumeroInput = document.getElementById("fatt-numero");
  const fattTotaleInput = document.getElementById("fatt-totale");
  const fattFileInput = document.getElementById("fatt-file");
  const fattNoteInput = document.getElementById("fatt-note");

  const rigaProdottoSelect = document.getElementById("riga-prodotto");
  const rigaNuovoProdottoInput = document.getElementById("riga-nuovo-prodotto");
  const rigaCategoriaSelect = document.getElementById("riga-categoria");
  const rigaUnitaInput = document.getElementById("riga-unita");
  const rigaQuantitaInput = document.getElementById("riga-quantita");
  const rigaPrezzoInput = document.getElementById("riga-prezzo");
  const rigaIvaInput = document.getElementById("riga-iva");

  const btnAddRiga = document.getElementById("btn-add-riga");
  const fattRigheLista = document.getElementById("fatt-righe-lista");
  const btnSalvaFattura = document.getElementById("btn-salva-fattura");
  const fattureLista = document.getElementById("fatture-lista");

  let fornitori = [];
  let categorieProdotto = [];
  let prodotti = [];
  let righeFatturaCorrenti = [];

  async function caricaFornitori() {
    if (!supabase || !fattFornitoreSelect) return;

    const { data, error } = await supabase
      .from("fornitori")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento fornitori:", error);
      return;
    }

    fornitori = data;
    fattFornitoreSelect.innerHTML = `<option value="">-- seleziona o crea --</option>`;
    fornitori.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.nome;
      fattFornitoreSelect.appendChild(opt);
    });
  }

  async function caricaCategorieProdotto() {
    if (!supabase || !rigaCategoriaSelect) return;

    const { data, error } = await supabase
      .from("categorie_prodotto")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento categorie prodotto:", error);
      return;
    }

    categorieProdotto = data;
    rigaCategoriaSelect.innerHTML = `<option value="">-- seleziona categoria --</option>`;
    categorieProdotto.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome;
      rigaCategoriaSelect.appendChild(opt);
    });
  }

  async function caricaProdotti() {
    if (!supabase || !rigaProdottoSelect) return;

    const { data, error } = await supabase
      .from("prodotti")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento prodotti:", error);
      return;
    }

    prodotti = data;
    rigaProdottoSelect.innerHTML = `<option value="">-- seleziona o nuovo --</option>`;
    prodotti.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.nome;
      rigaProdottoSelect.appendChild(opt);
    });
  }

  function renderRigheFatturaCorrenti() {
    if (!fattRigheLista) return;
    fattRigheLista.innerHTML = "";

    righeFatturaCorrenti.forEach((r, index) => {
      const cat = categorieProdotto.find((c) => c.id === r.categoria_id);
      const totale = (r.quantita || 0) * (r.prezzo_unitario || 0);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.nome_prodotto}</td>
        <td>${cat ? cat.nome : ""}</td>
        <td>${r.quantita ?? ""}</td>
        <td>${r.unita_misura || ""}</td>
        <td>${r.prezzo_unitario ? r.prezzo_unitario.toFixed(2) : ""}</td>
        <td>${totale ? totale.toFixed(2) : ""}</td>
        <td>
          <button data-index="${index}" class="app-button small red">
            Rimuovi
          </button>
        </td>
      `;
      fattRigheLista.appendChild(tr);
    });

    fattRigheLista.querySelectorAll("button[data-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        righeFatturaCorrenti.splice(idx, 1);
        renderRigheFatturaCorrenti();
      });
    });
  }

  if (btnAddRiga) {
    btnAddRiga.addEventListener("click", () => {
      const prodottoId = rigaProdottoSelect.value || null;
      const nomeNuovo = (rigaNuovoProdottoInput.value || "").trim();
      const categoriaId = rigaCategoriaSelect.value || null;
      const unita = (rigaUnitaInput.value || "").trim();
      const quantita = parseFloat(rigaQuantitaInput.value || "0") || 0;
      const prezzo = parseFloat(rigaPrezzoInput.value || "0") || 0;
      const iva = parseFloat(rigaIvaInput.value || "0") || 0;

      if (!prodottoId && !nomeNuovo) {
        alert("Seleziona un prodotto o inserisci un nuovo prodotto");
        return;
      }
      if (!categoriaId) {
        alert("Seleziona una categoria");
        return;
      }
      if (!unita) {
        alert("Inserisci l'unità di misura (es. kg, lt, pz)");
        return;
      }
      if (quantita <= 0) {
        alert("Inserisci una quantità valida");
        return;
      }

      let nomeProdotto = nomeNuovo;
      if (!nomeProdotto && prodottoId) {
        const p = prodotti.find((x) => x.id === prodottoId);
        if (p) nomeProdotto = p.nome;
      }

      righeFatturaCorrenti.push({
        prodotto_id: prodottoId,
        nome_prodotto: nomeProdotto,
        categoria_id: categoriaId,
        unita_misura: unita,
        quantita,
        prezzo_unitario: prezzo,
        iva,
      });

      rigaProdottoSelect.value = "";
      rigaNuovoProdottoInput.value = "";
      rigaUnitaInput.value = "";
      rigaQuantitaInput.value = "";
      rigaPrezzoInput.value = "";
      rigaIvaInput.value = "";

      renderRigheFatturaCorrenti();
    });
  }

  async function salvaFatturaEScaricoMagazzino() {
    if (!supabase) return;

    const fornitoreId = fattFornitoreSelect.value || null;
    const nuovoFornitoreNome = (fattNuovoFornitoreInput.value || "").trim();
    const dataFattura = fattDataInput.value;
    const numeroFattura = (fattNumeroInput.value || "").trim();
    const totaleFattura = parseFloat(fattTotaleInput.value || "0") || null;
    const note = (fattNoteInput.value || "").trim();
    const file = fattFileInput.files[0] || null;

    if (!dataFattura) {
      alert("Inserisci la data della fattura");
      return;
    }
    if (!fornitoreId && !nuovoFornitoreNome) {
      alert("Seleziona un fornitore o inserisci un nuovo fornitore");
      return;
    }
    if (righeFatturaCorrenti.length === 0) {
      alert("Aggiungi almeno una riga di fattura");
      return;
    }

    // 1) eventuale creazione nuovo fornitore
    let fornitoreIdFinal = fornitoreId;
    if (!fornitoreIdFinal && nuovoFornitoreNome) {
      const { data: fornIns, error: fornErr } = await supabase
        .from("fornitori")
        .insert({ nome: nuovoFornitoreNome })
        .select()
        .single();
      if (fornErr) {
        console.error("Errore inserimento fornitore:", fornErr);
        alert("Errore nel creare il nuovo fornitore");
        return;
      }
      fornitoreIdFinal = fornIns.id;
    }

    // 2) upload file se presente
    let fileUrl = null;
    if (file) {
      const estensione = file.name.split(".").pop();
      const filePath = `fatture/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${estensione}`;

      const { error: uploadErr } = await supabase.storage
        .from("fatture") // bucket
        .upload(filePath, file);

      if (uploadErr) {
        console.error("Errore upload file fattura:", uploadErr);
        alert("Errore nel caricare il file della fattura");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("fatture")
        .getPublicUrl(filePath);
      fileUrl = publicUrlData.publicUrl;
    }

    // 3) inserimento fattura
    const { data: fattIns, error: fattErr } = await supabase
      .from("fatture")
      .insert({
        fornitore_id: fornitoreIdFinal,
        data_fattura: dataFattura,
        numero_fattura: numeroFattura || null,
        totale: totaleFattura,
        file_url: fileUrl,
        note: note || null,
      })
      .select()
      .single();

    if (fattErr) {
      console.error("Errore inserimento fattura:", fattErr);
      alert("Errore nel salvare la fattura");
      return;
    }

    const fatturaId = fattIns.id;

    // 4) righe + magazzino
    for (const r of righeFatturaCorrenti) {
      let prodottoId = r.prodotto_id;

      if (!prodottoId && r.nome_prodotto) {
        const { data: prodIns, error: prodErr } = await supabase
          .from("prodotti")
          .insert({
            nome: r.nome_prodotto,
            categoria_id: r.categoria_id,
            unita_misura: r.unita_misura,
            attivo: true,
          })
          .select()
          .single();
        if (prodErr) {
          console.error("Errore inserimento prodotto:", prodErr);
          alert(`Errore nel creare il prodotto ${r.nome_prodotto}`);
          continue;
        }
        prodottoId = prodIns.id;
      }

      const totaleRiga = (r.quantita || 0) * (r.prezzo_unitario || 0);

      const { error: rigaErr } = await supabase.from("fatture_righe").insert({
        fattura_id: fatturaId,
        prodotto_id: prodottoId,
        descrizione: r.nome_prodotto,
        quantita: r.quantita,
        unita_misura: r.unita_misura,
        prezzo_unitario: r.prezzo_unitario,
        iva: r.iva,
        categoria_id: r.categoria_id,
      });

      if (rigaErr) {
        console.error("Errore inserimento riga fattura:", rigaErr);
      }

      const { error: magErr } = await supabase
        .from("magazzino_movimenti")
        .insert({
          prodotto_id: prodottoId,
          tipo: "carico",
          quantita: r.quantita,
          unita_misura: r.unita_misura,
          costo_totale: totaleRiga,
          riferimento_tipo: "fattura",
          riferimento_id: fatturaId,
        });

      if (magErr) {
        console.error("Errore inserimento movimento magazzino:", magErr);
      }
    }

    alert("Fattura salvata e magazzino aggiornato");

    fattFornitoreSelect.value = "";
    fattNuovoFornitoreInput.value = "";
    fattDataInput.value = "";
    fattNumeroInput.value = "";
    fattTotaleInput.value = "";
    fattFileInput.value = "";
    fattNoteInput.value = "";
    righeFatturaCorrenti = [];
    renderRigheFatturaCorrenti();
    await caricaFornitori();
    await caricaProdotti();
    await caricaStoricoFatture();
  }

  if (btnSalvaFattura) {
    btnSalvaFattura.addEventListener("click", salvaFatturaEScaricoMagazzino);
  }

  async function caricaStoricoFatture() {
    if (!supabase || !fattureLista) return;

    const { data, error } = await supabase
      .from("fatture")
      .select(
        `
        id,
        data_fattura,
        numero_fattura,
        totale,
        file_url,
        fornitori ( nome )
      `
      )
      .order("data_fattura", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Errore caricamento fatture:", error);
      return;
    }

    fattureLista.innerHTML = "";
    data.forEach((f) => {
      const tr = document.createElement("tr");
      const nomeFornitore = f.fornitori ? f.fornitori.nome : "";
      tr.innerHTML = `
        <td>${f.data_fattura || ""}</td>
        <td>${nomeFornitore}</td>
        <td>${f.numero_fattura || ""}</td>
        <td>${f.totale != null ? Number(f.totale).toFixed(2) : ""}</td>
        <td>${
          f.file_url
            ? `<a href="${f.file_url}" target="_blank">Apri</a>`
            : ""
        }</td>
      `;
      fattureLista.appendChild(tr);
    });
  }

  // --- ANAGRAFICA DIPENDENTI ---

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
  const labelRetribuzione = document.getElementById("label-retribuzione-base");
  const rowOreMensili = document.getElementById("row-ore-mensili");
  const rowOreServizio = document.getElementById("row-ore-servizio");

  const dipPinGenerale = document.getElementById("dip-pin-generale");
  const dipCodice = document.getElementById("dip-codice");
  const dipCanale = document.getElementById("dip-canale");
  const dipAttivo = document.getElementById("dip-attivo");
  const btnAddDip = document.getElementById("btn-add-dip");
  const dipLista = document.getElementById("dipendenti-lista");

  let dipendenti = [];

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
    const tipo = dipTipoCompenso.value || "orario";

    if (tipo === "orario") {
      labelRetribuzione.firstChild.textContent = "Paga oraria lorda (€/h)";
      rowOreMensili.style.display = "none";
      rowOreServizio.style.display = "none";
    } else if (tipo === "mensile") {
      labelRetribuzione.firstChild.textContent =
        "Stipendio lordo mensile (€/mese)";
      rowOreMensili.style.display = "block";
      rowOreServizio.style.display = "none";
    } else if (tipo === "servizio") {
      labelRetribuzione.firstChild.textContent =
        "Paga lorda per servizio (€/servizio)";
      rowOreMensili.style.display = "none";
      rowOreServizio.style.display = "block";
    }

    const retribuzioneBase = parseFloat(dipRetribuzioneBase.value || "0") || 0;
    const oreMensili = parseFloat(dipOreMensili.value || "0") || 0;
    const oreServizio = parseFloat(dipOreServizio.value || "0") || 0;

    const costo = calcolaCostoOrario(
      tipo,
      retribuzioneBase,
      oreMensili,
      oreServizio
    );
    dipCosto.value = costo > 0 ? costo.toFixed(2) : "";
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

    dipendenti = data.map((row) => ({
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
      pinGenerale: row.pin_generale || "",
      codice: row.codice || "",
      canalePrevalente: row.canale_prevalente,
      attivo: row.attivo,
    }));

    renderDipendenti();
    aggiornaSelectDipendenti();
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
      pin_generale: dip.pinGenerale || null,
      codice: dip.codice || null,
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
    if (!supabase) return;
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
        <td>${formatDataNascita(d.dataNascita)}</td>
        <td>${d.residenza || ""}</td>
        <td>${d.telefono || ""}</td>
        <td>${d.email || ""}</td>
        <td>${formatRuolo(d.ruolo)}</td>
        <td>${formatTipoCompenso(d.tipoCompenso)}</td>
        <td>${d.costoOrario ? d.costoOrario.toFixed(2) : ""}</td>
        <td>${d.canalePrevalente || ""}</td>
        <td>${d.pinGenerale || ""}</td>
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
    dipDataNascita.value = d.dataNascita ? d.dataNascita.substring(0, 10) : "";
    dipResidenza.value = d.residenza || "";
    dipTelefono.value = d.telefono || "";
    dipEmail.value = d.email || "";
    dipRuolo.value = d.ruolo || "";

    dipTipoCompenso.value = d.tipoCompenso || "orario";
    dipRetribuzioneBase.value =
      d.retribuzioneBase != null ? d.retribuzioneBase : "";
    dipOreMensili.value = d.oreMensili != null ? d.oreMensili : "";
    dipOreServizio.value = d.oreServizio != null ? d.oreServizio : "";
    dipCosto.value =
      d.costoOrario != null && d.costoOrario > 0
        ? d.costoOrario.toFixed(2)
        : "";

    dipPinGenerale.value = d.pinGenerale || "";
    dipCodice.value = d.codice || "";
    dipCanale.value = d.canalePrevalente || "NR";
    dipAttivo.checked = !!d.attivo;

    dipNome.dataset.editIndex = index.toString();

    aggiornaUICompenso();
  }

  if (btnAddDip) {
    btnAddDip.addEventListener("click", async () => {
      const nome = (dipNome.value || "").trim();
      if (!nome) {
        alert("Inserisci il nome del dipendente");
        return;
      }

      const mansione = (dipMansione.value || "").trim();
      const dataNascitaVal = dipDataNascita.value || "";
      const residenza = (dipResidenza.value || "").trim();
      const telefono = (dipTelefono.value || "").trim();
      const email = (dipEmail.value || "").trim();
      const ruolo = dipRuolo.value || "";

      const tipoCompenso = dipTipoCompenso.value || "orario";
      const retribuzioneBase =
        parseFloat(dipRetribuzioneBase.value || "0") || 0;
      const oreMensili = parseFloat(dipOreMensili.value || "0") || 0;
      const oreServizio = parseFloat(dipOreServizio.value || "0") || 0;

      const costoOrario = calcolaCostoOrario(
        tipoCompenso,
        retribuzioneBase,
        oreMensili,
        oreServizio
      );

      dipCosto.value = costoOrario ? costoOrario.toFixed(2) : "";

      const pinGenerale = (dipPinGenerale.value || "").trim();
      const codice = (dipCodice.value || "").trim();
      const canalePrevalente = dipCanale.value || "NR";
      const attivo = dipAttivo.checked;

      const editIndex = dipNome.dataset.editIndex;
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
        oreMensili: oreMensili || null,
        oreServizio: oreServizio || null,
        costoOrario: costoOrario || null,
        pinGenerale,
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
      dipDataNascita.value = "";
      dipResidenza.value = "";
      dipTelefono.value = "";
      dipEmail.value = "";
      dipRuolo.value = "";
      dipTipoCompenso.value = "orario";
      dipRetribuzioneBase.value = "";
      dipOreMensili.value = "";
      dipOreServizio.value = "";
      dipCosto.value = "";
      dipPinGenerale.value = "";
      dipCodice.value = "";
      dipCanale.value = "NR";
      dipAttivo.checked = true;
      delete dipNome.dataset.editIndex;

      aggiornaUICompenso();
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

  let timbrature = [];
  let periodoCorrente = "oggi";

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
    const day = startSettimana.getDay() || 7;
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

  // --- ROUTE HOOK: cosa ricaricare quando entro in una vista ---

  async function onRouteEnter(route) {
    switch (route) {
      case "timbratura":
        await caricaTimbratureDaSupabase();
        aggiornaTabella();
        aggiornaRiepilogo();
        break;

      case "dipendenti":
        await caricaDipendentiDaSupabase();
        break;

      case "fatture":
        await caricaFornitori();
        await caricaCategorieProdotto();
        await caricaProdotti();
        await caricaStoricoFatture();
        break;

      default:
        break;
    }
  }

  async function navigateTo(route) {
    views.forEach((v) => (v.style.display = "none"));

    const active = document.getElementById(`view-${route}`);
    if (active) {
      if (
        modalita === "dipendente" &&
        active.getAttribute("data-manager-only") === "true"
      ) {
        const fallback = document.getElementById("view-timbratura");
        if (fallback) {
          fallback.style.display = "block";
          await onRouteEnter("timbratura");
        }
      } else {
        active.style.display = "block";
        await onRouteEnter(route);
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

  async function applicaTuttoAllAvvio() {
    applyMode();
    await caricaDipendentiDaSupabase();
    await caricaTimbratureDaSupabase();
    await caricaFornitori();
    await caricaCategorieProdotto();
    await caricaProdotti();
    await caricaStoricoFatture();
    applicaDipendenteCorrente();
    aggiornaUICompenso();
  }

  await applicaTuttoAllAvvio();

  const initialRoute = window.location.hash.replace("#", "") || "timbratura";
  navigateTo(initialRoute);
});
