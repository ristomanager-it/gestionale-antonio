  // ========= ACQUISTI / FATTURE + MAGAZZINO =========
  // Cache categorie di bilancio (report + fatture)
  let categorieBilancioCache = [];

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

  // 🔹 cache categorie_prodotto, includendo anche CODICE (che è NOT NULL in tabella)
  async function caricaCategorieInCache() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("categorie_prodotto")
      .select("id, codice, nome, attivo")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento categorie:", error);
      alert("Errore Supabase (caricamento categorie): " + error.message);
      return;
    }
    categorieCache = data || [];
  }

  // 🔹 Carica le categorie di bilancio da Supabase e popola il datalist globale
  async function caricaCategorieBilancioInDatalist() {
    if (!supabase) return;

    const dl = document.getElementById("bilancio-categorie");
    if (!dl) return;

    const { data, error } = await supabase
      .from("categorie_bilancio")
      .select("id, nome, attivo")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento categorie bilancio:", error);
      // se la tabella non esiste o dà errore, lascio il datalist com'è
      return;
    }

    categorieBilancioCache = data || [];

    if (!categorieBilancioCache.length) {
      // se il DB è vuoto, mantengo le opzioni scritte a mano in HTML
      return;
    }

    dl.innerHTML = "";
    categorieBilancioCache.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.nome;
      dl.appendChild(opt);
    });
  }

  // 🔹 Garantisce che una categoria di bilancio esista in Supabase; se manca la crea
  async function ensureCategoriaBilancio(nomeCategoriaBilancio) {
    if (!supabase) return;
    const nomeTrim = (nomeCategoriaBilancio || "").trim();
    if (!nomeTrim) return;

    // 1) controllo in cache
    const existing = categorieBilancioCache.find(
      (c) => c.nome && c.nome.toLowerCase() === nomeTrim.toLowerCase()
    );
    if (existing) return;

    // 2) controllo diretto su Supabase
    const { data: findData, error: findError } = await supabase
      .from("categorie_bilancio")
      .select("id, nome, attivo")
      .ilike("nome", nomeTrim)
      .maybeSingle();

    if (findError) {
      console.error("Errore ricerca categoria_bilancio:", findError);
    }

    if (findData) {
      categorieBilancioCache.push(findData);
      const dl = document.getElementById("bilancio-categorie");
      if (dl) {
        const opt = document.createElement("option");
        opt.value = findData.nome;
        dl.appendChild(opt);
      }
      return;
    }

    // 3) se non esiste la inserisco
    const { data: insertData, error: insertError } = await supabase
      .from("categorie_bilancio")
      .insert({ nome: nomeTrim, attivo: true })
      .select("id, nome, attivo")
      .single();

    if (insertError) {
      console.error("Errore creazione categoria_bilancio:", insertError);
      return;
    }

    categorieBilancioCache.push(insertData);
    const dl = document.getElementById("bilancio-categorie");
    if (dl) {
      const opt = document.createElement("option");
      opt.value = insertData.nome;
      dl.appendChild(opt);
    }
  }

  // 🔹 Carica le categorie prodotto da Supabase e popola un datalist riusabile
  async function caricaCategorieProdottoInDatalist() {
    if (!supabase) return;

    // uso la cache comune
    await caricaCategorieInCache();

    // creo/recupero il datalist per le categorie prodotto
    let dl = document.getElementById("categorie-prodotto-list");
    if (!dl) {
      dl = document.createElement("datalist");
      dl.id = "categorie-prodotto-list";
      document.body.appendChild(dl);
    }

    dl.innerHTML = "";
    (categorieCache || []).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.nome;
      dl.appendChild(opt);
    });

    // collego i campi categoria al datalist
    document
      .querySelectorAll(".fatt-riga-categoria")
      .forEach((inp) => inp.setAttribute("list", "categorie-prodotto-list"));

    const magCat = document.getElementById("magazzino-categoria");
    if (magCat) {
      magCat.setAttribute("list", "categorie-prodotto-list");
    }
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

  // Crea un codice per la categoria partendo dal nome (es. "Materie prime" -> "MATERIE_PRIME")
  function generaCodiceCategoria(nomeCategoria) {
    const nomeTrim = (nomeCategoria || "")
      .normalize("NFD") // toglie accenti
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_") // spazi/punteggiatura -> underscore
      .replace(/^_+|_+$/g, ""); // niente _ all'inizio/fine

    if (!nomeTrim) return "CAT";
    return nomeTrim.slice(0, 30); // se la colonna ha lunghezza limitata
  }

  async function findOrCreateCategoriaByNome(nomeCategoria) {
    if (!supabase) return null;
    const nomeTrim = (nomeCategoria || "").trim();
    if (!nomeTrim) return null;

    // 1) cerco in cache
    const existing = categorieCache.find(
      (c) => c.nome && c.nome.toLowerCase() === nomeTrim.toLowerCase()
    );
    if (existing) return existing;

    // 2) cerco su Supabase per nome (nel caso la cache non fosse aggiornata)
    const { data: findData, error: findError } = await supabase
      .from("categorie_prodotto")
      .select("id, codice, nome, attivo")
      .ilike("nome", nomeTrim)
      .maybeSingle();

    if (findError) {
      console.error("Errore ricerca categoria_prodotto:", findError);
    }

    if (findData) {
      categorieCache.push(findData);
      // aggiorno datalist categorie-prodotto
      let dl = document.getElementById("categorie-prodotto-list");
      if (dl) {
        const opt = document.createElement("option");
        opt.value = findData.nome;
        dl.appendChild(opt);
      }
      return findData;
    }

    // 3) se non esiste la inserisco, valorizzando anche "codice"
    const codiceCat = generaCodiceCategoria(nomeTrim);

    const { data, error } = await supabase
      .from("categorie_prodotto")
      .insert({
        codice: codiceCat,
        nome: nomeTrim,
        attivo: true,
      })
      .select("id, codice, nome, attivo")
      .single();

    if (error) {
      console.error("Errore creazione categoria prodotto:", error);
      alert("Errore Supabase (categoria prodotto): " + error.message);
      return null;
    }

    categorieCache.push(data);

    // aggiorno al volo il datalist delle categorie prodotto
    let dl = document.getElementById("categorie-prodotto-list");
    if (!dl) {
      dl = document.createElement("datalist");
      dl.id = "categorie-prodotto-list";
      document.body.appendChild(dl);
    }
    const opt = document.createElement("option");
    opt.value = data.nome;
    dl.appendChild(opt);

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
                value="${initial.categoria_nome || ""}"
                list="categorie-prodotto-list"
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

    // mi assicuro che la nuova riga veda il datalist delle categorie prodotto
    caricaCategorieProdottoInDatalist();
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

      // 🔹 memorizzo la categoria di bilancio in tabella dedicata, se è una nuova voce
      if (bilancioVal) {
        await ensureCategoriaBilancio(bilancioVal);
      }

      const prodotto = await findOrCreateProdotto({
        codice: codiceVal,
        descrizione: descrVal,
        categoriaNome: catVal,
        um: umVal,
      });
      if (!prodotto) continue;

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
        prezzo_unitario: prezzoVal,      // listino
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
        console.error("Errore nel salvare le righe della fattura:", righeError);
        alert("Errore nel salvare le righe della fattura");
        return;
      }

      await caricaMagazzinoDati();
    }

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

  // 🚀 all'avvio popolo i datalist da Supabase (categorie prodotto + categorie di bilancio)
  caricaCategorieProdottoInDatalist();
  caricaCategorieBilancioInDatalist();
