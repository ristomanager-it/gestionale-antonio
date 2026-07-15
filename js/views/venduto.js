export async function render(container) {
  const supabase = window.supabaseClient;
  const azienda = window.state?.azienda;

  if (!azienda) {
    container.innerHTML = `<div class="view">Azienda non attiva</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <h2 style="margin-top:0;">Venduto</h2>

      <!-- FILTRI -->
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        <div style="flex:1; min-width:140px;">
          <label style="font-size:12px; display:block; margin-bottom:4px;">Dal</label>
          <input type="date" id="venduto-from" class="input-pill" />
        </div>
        <div style="flex:1; min-width:140px;">
          <label style="font-size:12px; display:block; margin-bottom:4px;">Al</label>
          <input type="date" id="venduto-to" class="input-pill" />
        </div>
        <div style="flex:1; min-width:140px;">
          <label style="font-size:12px; display:block; margin-bottom:4px;">Canale</label>
          <select id="venduto-filter-canale" class="input-pill">
            <option value="">Tutti</option>
            <option value="NR">NR</option>
            <option value="RA">RA</option>
            <option value="CC">CC</option>
            <option value="CAT">CAT</option>
          </select>
        </div>

        <div style="display:flex; gap:8px; align-items:flex-end;">
          <button id="btn-venduto-refresh" class="app-button small">Aggiorna</button>
          <button id="btn-venduto-delete-range" class="app-button small red">Elimina range</button>
        </div>
      </div>

      <!-- INSERIMENTO MANUALE -->
      <div style="background:#ffffff; border-radius:16px; padding:12px; box-shadow:0 6px 18px rgba(15,23,42,0.15);">
        <h3 style="margin:0 0 10px;">Inserimento manuale</h3>

        <div style="display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-size:12px; display:block; margin-bottom:4px;">Data vendita</label>
            <input type="date" id="venduto-data" class="input-pill" />
          </div>

          <div>
            <label style="font-size:12px; display:block; margin-bottom:4px;">Canale</label>
            <select id="venduto-canale" class="input-pill">
              <option value="NR">NR</option>
              <option value="RA">RA</option>
              <option value="CC">CC</option>
              <option value="CAT">CAT</option>
            </select>
          </div>

          <div>
            <label style="font-size:12px; display:block; margin-bottom:4px;">Prodotto</label>
            <select id="venduto-prodotto" class="input-pill"></select>
          </div>

          <div style="display:flex; gap:8px;">
            <div style="flex:1;">
              <label style="font-size:12px; display:block; margin-bottom:4px;">Quantità</label>
              <input type="number" step="0.01" id="venduto-quantita" class="input-pill" />
            </div>
            <div style="flex:1;">
              <label style="font-size:12px; display:block; margin-bottom:4px;">Prezzo unitario</label>
              <input type="number" step="0.01" id="venduto-prezzo" class="input-pill" />
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button id="btn-salva-venduto" class="app-button">Salva vendita</button>
            <button id="btn-clear-venduto" class="app-button gray">Svuota</button>
          </div>

          <div id="venduto-feedback" style="font-size:13px;"></div>
        </div>
      </div>

      <!-- IMPORT CSV -->
      <div style="margin-top:12px; background:#ffffff; border-radius:16px; padding:12px; box-shadow:0 6px 18px rgba(15,23,42,0.15);">
        <h3 style="margin:0 0 10px;">Importa CSV</h3>
        <input type="file" id="venduto-csv" accept=".csv" class="input-pill" />
        <div id="csv-feedback" style="margin-top:10px; font-size:13px;"></div>
        <div style="margin-top:8px; font-size:12px; color:#6b7280;">
          Formato atteso (intestazione inclusa): data_vendita, nome, quantita, totale
          <br/>Supporta separatore virgola o punto e virgola. Supporta campi tra virgolette.
        </div>
      </div>

      <!-- IMPORT IPRATICO MENSILE -->
      <div style="margin-top:12px; background:#ffffff; border-radius:16px; padding:12px; box-shadow:0 6px 18px rgba(15,23,42,0.15);">
        <h3 style="margin:0 0 10px;">📊 Importa venduto iPratico (giornaliero)</h3>
        <div style="font-size:12px; color:#6b7280; margin-bottom:10px;">
          Il file iPratico ha colonne <strong>Nome, Totale, Qtà</strong> (un file = un giorno). Scegli il giorno e carica.
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; margin-bottom:10px;">
          <div>
            <label style="font-size:12px; display:block; margin-bottom:4px;">Giorno</label>
            <input type="date" id="iprat-giorno" class="input-pill" value="${new Date().toISOString().slice(0,10)}" />
          </div>
          <div>
            <label style="font-size:12px; display:block; margin-bottom:4px;">Canale</label>
            <select id="iprat-canale" class="input-pill">
              <option value="NR">Sala (NR)</option>
              <option value="RA">Asporto (RA)</option>
              <option value="CC">Consegna (CC)</option>
              <option value="CAT">Catering (CAT)</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px; display:block; margin-bottom:4px;">Sede</label>
            <select id="iprat-sede" class="input-pill">
              <option value="">— Scegli sede —</option>
            </select>
          </div>
        </div>
        <input type="file" id="iprat-csv" accept=".csv" class="input-pill" />
        <div id="iprat-feedback" style="margin-top:10px; font-size:13px;"></div>
      </div>

      <!-- IMPORT XML FATTURA VENDITA (ARUBA) -->
      <div style="margin-top:12px; background:#ffffff; border-radius:16px; padding:12px; box-shadow:0 6px 18px rgba(15,23,42,0.15);">
        <h3 style="margin:0 0 10px;">🧾 Carica fattura di vendita (XML)</h3>
        <div style="font-size:12px; color:#6b7280; margin-bottom:10px;">
          Per il venduto fatturato (es. da Aruba). Carica il file XML della fattura elettronica emessa.
        </div>
        <input type="file" id="venduto-xml" accept=".xml" class="input-pill" />
        <div id="xml-vendita-feedback" style="margin-top:10px; font-size:13px;"></div>
      </div>

      <!-- LISTA -->
      <div style="margin-top:12px; background:#ffffff; border-radius:16px; padding:12px; box-shadow:0 6px 18px rgba(15,23,42,0.15);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <h3 style="margin:0;">Vendite</h3>
          <div id="venduto-kpi" style="font-size:12px; color:#6b7280;"></div>
        </div>
        <div id="venduto-lista" style="margin-top:10px;"></div>
      </div>

    </div>
  `;

  const dataInput = document.getElementById("venduto-data");
  const prodottoSelect = document.getElementById("venduto-prodotto");
  const quantitaInput = document.getElementById("venduto-quantita");
  const prezzoInput = document.getElementById("venduto-prezzo");
  const canaleSelect = document.getElementById("venduto-canale");
  const feedback = document.getElementById("venduto-feedback");

  const fromInput = document.getElementById("venduto-from");
  const toInput = document.getElementById("venduto-to");
  const filterCanale = document.getElementById("venduto-filter-canale");

  const csvFeedback = document.getElementById("csv-feedback");
  const kpiEl = document.getElementById("venduto-kpi");

  const today = new Date().toISOString().split("T")[0];
  dataInput.value = today;
  fromInput.value = today;
  toInput.value = today;

  function setFeedback(el, msg, type = "info") {
    const map = {
      info: "#111827",
      ok: "#15803d",
      warn: "#92400e",
      err: "#b91c1c",
    };
    el.innerHTML = msg ? `<div style="color:${map[type] || map.info}; font-weight:600;">${msg}</div>` : "";
  }

  function toNum(v) {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  function money(v) {
    const n = Number(v || 0);
    return n.toFixed(2);
  }

  /* =========================================================
     CARICA PRODOTTI
  ========================================================= */

  const { data: prodotti, error: prodottiError } = await supabase
    .from("prodotti")
    .select("id, nome, descrizione")
    .eq("azienda_id", azienda.id)
    .order("descrizione", { ascending: true });

  if (prodottiError) {
    setFeedback(feedback, "Errore caricamento prodotti: " + prodottiError.message, "err");
    return;
  }

  prodottoSelect.innerHTML = `<option value="">Seleziona prodotto</option>`;
  (prodotti || []).forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.descrizione;
    prodottoSelect.appendChild(opt);
  });

  /* =========================================================
     CARICA VENDITE
  ========================================================= */

  async function caricaVendite() {
    setFeedback(feedback, "");
    const from = fromInput.value || null;
    const to = toInput.value || null;
    const canale = filterCanale.value || null;

    let q = supabase
      .from("vendite_giornaliere")
      .select("id, data_vendita, canale, prodotto_id, nome_articolo, quantita, prezzo_unitario, totale_riga")
      .order("data_vendita", { ascending: false })
      .limit(200);

    if (from) q = q.gte("data_vendita", from);
    if (to) q = q.lte("data_vendita", to);
    if (canale) q = q.eq("canale", canale);

    const { data, error } = await q;
    if (error) {
      setFeedback(feedback, "Errore caricamento vendite: " + error.message, "err");
      return;
    }

    const lista = document.getElementById("venduto-lista");
    lista.innerHTML = "";

    let totQ = 0;
    let totE = 0;

    (data || []).forEach(r => {
      totQ += Number(r.quantita || 0);
      totE += Number(r.totale_riga || 0);

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.gap = "10px";
      row.style.padding = "10px 12px";
      row.style.border = "1px solid #e5e7eb";
      row.style.borderRadius = "14px";
      row.style.marginBottom = "8px";
      row.style.background = "#ffffff";

      const left = document.createElement("div");
      left.innerHTML = `
        <div style="font-weight:700; font-size:13px;">${r.data_vendita} <span style="font-weight:600; color:#6b7280;">(${r.canale || "-"})</span></div>
        <div style="font-size:13px;">${r.nome_articolo || "(senza nome)"}</div>
        <div style="font-size:12px; color:#6b7280;">Q: ${r.quantita} | € ${money(r.totale_riga)}</div>
      `;

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = "8px";
      right.style.alignItems = "center";

      const btnDel = document.createElement("button");
      btnDel.className = "app-button tiny red";
      btnDel.textContent = "Elimina";
      btnDel.addEventListener("click", async () => {
        const ok = confirm("Eliminare questa riga di venduto?");
        if (!ok) return;

        const { error: delErr } = await supabase
          .from("vendite_giornaliere")
          .delete()
          .eq("id", r.id);

        if (delErr) {
          setFeedback(feedback, "Errore eliminazione: " + delErr.message, "err");
          return;
        }

        await caricaVendite();
      });

      right.appendChild(btnDel);
      row.appendChild(left);
      row.appendChild(right);

      lista.appendChild(row);
    });

    kpiEl.textContent = `Righe: ${(data || []).length} • Q tot: ${totQ.toFixed(2)} • € tot: ${money(totE)}`;
  }

  await caricaVendite();

  document.getElementById("btn-venduto-refresh").addEventListener("click", caricaVendite);

  document.getElementById("btn-venduto-delete-range").addEventListener("click", async () => {
    const from = fromInput.value || null;
    const to = toInput.value || null;
    const canale = filterCanale.value || null;

    if (!from || !to) {
      setFeedback(feedback, "Seleziona un range date (Dal/Al) prima di eliminare.", "warn");
      return;
    }

    const ok = confirm(`Eliminare TUTTE le vendite dal ${from} al ${to}${canale ? " (" + canale + ")" : ""}?`);
    if (!ok) return;

    let q = supabase.from("vendite_giornaliere").delete();

    q = q.gte("data_vendita", from).lte("data_vendita", to);
    if (canale) q = q.eq("canale", canale);

    const { error } = await q;
    if (error) {
      setFeedback(feedback, "Errore eliminazione range: " + error.message, "err");
      return;
    }

    setFeedback(feedback, "Range eliminato.", "ok");
    await caricaVendite();
  });

  /* =========================================================
     SALVA MANUALE
  ========================================================= */

  document.getElementById("btn-clear-venduto").addEventListener("click", () => {
    prodottoSelect.value = "";
    quantitaInput.value = "";
    prezzoInput.value = "";
    canaleSelect.value = "NR";
    dataInput.value = today;
    setFeedback(feedback, "");
  });

  document.getElementById("btn-salva-venduto").addEventListener("click", async () => {
    setFeedback(feedback, "");

    const prodotto_id = prodottoSelect.value;
    const quantita = toNum(quantitaInput.value);
    const prezzo = toNum(prezzoInput.value);
    const data_vendita = dataInput.value;
    const canale = canaleSelect.value;

    if (!data_vendita) {
      setFeedback(feedback, "Seleziona la data vendita.", "warn");
      return;
    }
    if (!prodotto_id) {
      setFeedback(feedback, "Seleziona un prodotto.", "warn");
      return;
    }
    if (!Number.isFinite(quantita) || quantita <= 0) {
      setFeedback(feedback, "Quantità non valida.", "warn");
      return;
    }

    const prezzoFinale = Number.isFinite(prezzo) ? prezzo : 0;
    const totale = quantita * prezzoFinale;

    const nomeArticolo = prodottoSelect.options[prodottoSelect.selectedIndex]?.textContent || "";

    const { error } = await supabase.from("vendite_giornaliere").insert({
      azienda_id: azienda.id,
      data_vendita,
      canale,
      prodotto_id: parseInt(prodotto_id, 10),
      nome_articolo: nomeArticolo,
      quantita,
      prezzo_unitario: prezzoFinale,
      totale_riga: totale,
    });

    if (error) {
      setFeedback(feedback, "Errore salvataggio: " + error.message, "err");
      return;
    }

    quantitaInput.value = "";
    prezzoInput.value = "";
    setFeedback(feedback, "Vendita salvata.", "ok");

    // Aggiorna lista con filtri correnti
    await caricaVendite();
  });

  /* =========================================================
     CSV PARSER (virgola/; + quote)
  ========================================================= */

  function detectDelimiter(headerLine) {
    const comma = (headerLine.match(/,/g) || []).length;
    const semi = (headerLine.match(/;/g) || []).length;
    return semi > comma ? ";" : ",";
  }

  function parseCSVLine(line, delimiter) {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && ch === delimiter) {
        out.push(cur.trim());
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cur.trim());
    return out;
  }

  /* =========================================================
     IMPORT CSV
  ========================================================= */

  document.getElementById("venduto-csv").addEventListener("change", async (e) => {
    setFeedback(csvFeedback, "", "info");

    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      setFeedback(csvFeedback, "CSV vuoto o non valido.", "warn");
      return;
    }

    const delimiter = detectDelimiter(lines[0]);
    const header = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase());

    // Richiesti minimi: data_vendita, nome, quantita, totale
    // Accettiamo anche varianti: data, prodotto, articolo, incasso, totale_incassato
    const idxData = header.findIndex(h => ["data_vendita", "data", "giorno"].includes(h));
    const idxNome = header.findIndex(h => ["nome", "nome_prodotto", "prodotto", "articolo", "descrizione"].includes(h));
    const idxQ = header.findIndex(h => ["quantita", "qta", "qty"].includes(h));
    const idxTot = header.findIndex(h => ["totale", "totale_incassato", "totale_riga", "incasso", "importo"].includes(h));
    const idxCan = header.findIndex(h => ["canale", "channel"].includes(h));

    if (idxData === -1 || idxNome === -1 || idxQ === -1 || idxTot === -1) {
      setFeedback(
        csvFeedback,
        "Intestazioni non riconosciute. Servono: data_vendita, nome, quantita, totale (anche con nomi simili).",
        "err"
      );
      return;
    }

    // Dizionario prodotti per match case-insensitive
    const mapProd = new Map();
    (prodotti || []).forEach(p => mapProd.set(String(p.descrizione || "").trim().toLowerCase(), p));

    let inseriti = 0;
    let saltati = 0;
    const nonTrovati = new Map(); // nome -> count

    setFeedback(csvFeedback, "Import in corso...", "info");

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i], delimiter);
      if (cols.length < Math.max(idxData, idxNome, idxQ, idxTot, idxCan) + 1) {
        saltati++;
        continue;
      }

      const data_vendita = (cols[idxData] || "").trim();
      const nome = (cols[idxNome] || "").trim();
      const q = toNum(cols[idxQ]);
      const tot = toNum(cols[idxTot]);
      const canale = idxCan >= 0 ? (cols[idxCan] || "NR").trim() : "NR";

      if (!data_vendita || !nome || !Number.isFinite(q) || q <= 0 || !Number.isFinite(tot)) {
        saltati++;
        continue;
      }

      const prodottoMatch = mapProd.get(nome.toLowerCase());
      if (!prodottoMatch) {
        nonTrovati.set(nome, (nonTrovati.get(nome) || 0) + 1);
        saltati++;
        continue;
      }

      const prezzoUnit = tot / q;

      const { error } = await supabase.from("vendite_giornaliere").insert({
        azienda_id: azienda.id,
        data_vendita,
        canale: ["NR", "RA", "CC", "CAT"].includes(canale) ? canale : "NR",
        prodotto_id: prodottoMatch.id,
        nome_articolo: nome,
        quantita: q,
        prezzo_unitario: prezzoUnit,
        totale_riga: tot,
      });

      if (error) {
        saltati++;
        continue;
      }

      inseriti++;
    }

    const nonTrovatiList = Array.from(nonTrovati.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([n, c]) => `${n} (${c})`)
      .join(", ");

    setFeedback(
      csvFeedback,
      `Import completato. Inseriti: ${inseriti} • Saltati: ${saltati}${nonTrovatiList ? `<br/>Non trovati (top): ${nonTrovatiList}` : ""}`,
      nonTrovati.size > 0 ? "warn" : "ok"
    );

    await caricaVendite();
    e.target.value = "";
  });

  /* =========================================================
     IMPORT IPRATICO MENSILE (Nome, Totale, Qtà)
  ========================================================= */

  // Converte "3078.61 €" o "1.234,56 €" in numero
  function parseImporto(s) {
    if (!s) return NaN;
    let t = String(s).replace(/€/g, "").replace(/\s/g, "").trim();
    // Se ha sia punto che virgola: il punto è migliaia, la virgola decimali
    if (t.includes(".") && t.includes(",")) {
      t = t.replace(/\./g, "").replace(",", ".");
    } else if (t.includes(",")) {
      // Solo virgola = decimale
      t = t.replace(",", ".");
    }
    // Se ha solo punti, è già in formato con punto decimale (iPratico: 3078.61)
    return parseFloat(t);
  }

  const ipratFeedback = document.getElementById("iprat-feedback");

  // Popolo il selettore sede per l'import iPratico
  (async () => {
    const sedeSelect = document.getElementById("iprat-sede");
    if (!sedeSelect) return;
    const { data: sedi } = await supabase
      .from("sedi")
      .select("id, nome")
      .eq("azienda_id", azienda.id)
      .order("nome");
    if (sedi && sedi.length) {
      for (const s of sedi) {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.nome;
        sedeSelect.appendChild(opt);
      }
      // se c'è una sede attiva nello stato, la preseleziono
      const sedeAttiva = window.state?.sedeAttiva?.id;
      if (sedeAttiva) sedeSelect.value = sedeAttiva;
    }
  })();

  document.getElementById("iprat-csv").addEventListener("change", async (e) => {
    setFeedback(ipratFeedback, "", "info");
    const file = e.target.files[0];
    if (!file) return;

    const dataVendita = document.getElementById("iprat-giorno").value;
    const canale = document.getElementById("iprat-canale").value || "NR";
    const sedeUuid = document.getElementById("iprat-sede").value || null;

    if (!dataVendita) {
      setFeedback(ipratFeedback, "Seleziona il giorno prima di caricare.", "err");
      e.target.value = "";
      return;
    }

    if (!sedeUuid) {
      setFeedback(ipratFeedback, "Scegli la sede prima di caricare (es. Trattoria dell'Aquila o Catering Ricevimenti).", "err");
      e.target.value = "";
      return;
    }

    // Controllo anti-doppione: quel giorno è già caricato?
    const { count: giaCaricate } = await supabase
      .from("vendite_giornaliere")
      .select("id", { count: "exact", head: true })
      .eq("azienda_id", azienda.id)
      .eq("data_vendita", dataVendita);

    if (giaCaricate && giaCaricate > 0) {
      const conferma = confirm(
        `Attenzione: per il ${dataVendita} risultano già ${giaCaricate} vendite caricate.\n\nCaricare comunque creerebbe dei doppioni. Vuoi procedere lo stesso?`
      );
      if (!conferma) {
        setFeedback(ipratFeedback, "Import annullato (giorno già presente).", "warn");
        e.target.value = "";
        return;
      }
    }

    // Leggo il file gestendo l'encoding Windows-1252 (accenti iPratico)
    let text;
    try {
      const buf = await file.arrayBuffer();
      text = new TextDecoder("windows-1252").decode(buf);
    } catch {
      text = await file.text();
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      setFeedback(ipratFeedback, "File vuoto o non valido.", "err");
      e.target.value = "";
      return;
    }

    const header = parseCSVLine(lines[0], ",").map(h => h.toLowerCase().trim());
    const idxNome = header.findIndex(h => ["nome", "prodotto", "articolo"].includes(h));
    const idxTot = header.findIndex(h => ["totale", "importo", "incasso"].includes(h));
    const idxQ = header.findIndex(h => ["qtà", "qta", "quantita", "quantità", "qty"].includes(h));

    if (idxNome === -1 || idxTot === -1) {
      setFeedback(ipratFeedback, "Intestazioni non riconosciute. Il file iPratico deve avere: Nome, Totale, Qtà.", "err");
      e.target.value = "";
      return;
    }

    // Dizionario prodotti per aggancio (case-insensitive su nome e descrizione)
    const mapProd = new Map();
    (prodotti || []).forEach(p => {
      if (p.nome) mapProd.set(String(p.nome).trim().toLowerCase(), p);
      if (p.descrizione) mapProd.set(String(p.descrizione).trim().toLowerCase(), p);
    });

    const righeDaInserire = [];
    let saltati = 0, agganciati = 0, nonAgganciati = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i], ",");
      const nome = (cols[idxNome] || "").trim();
      const tot = parseImporto(cols[idxTot]);
      const q = idxQ >= 0 ? parseInt((cols[idxQ] || "0").replace(/\D/g, ""), 10) || 0 : 0;

      if (!nome || !Number.isFinite(tot)) { saltati++; continue; }

      const prod = mapProd.get(nome.toLowerCase());
      if (prod) agganciati++; else nonAgganciati++;

      righeDaInserire.push({
        azienda_id: azienda.id,
        sede_uuid: sedeUuid,
        data_vendita: dataVendita,
        canale,
        prodotto_id: prod?.id || null,
        nome_articolo: nome,
        nome_prodotto: nome,
        quantita: q,
        prezzo_unitario: q > 0 ? tot / q : null,
        totale_riga: tot,
        totale_incassato: tot,
      });
    }

    if (!righeDaInserire.length) {
      setFeedback(ipratFeedback, "Nessuna riga valida trovata nel file.", "warn");
      e.target.value = "";
      return;
    }

    const totaleMese = righeDaInserire.reduce((s, r) => s + (r.totale_riga || 0), 0);

    // Controllo anti-doppione: se questo mese+sede è già stato caricato, avviso
    const { count: giaEsistenti } = await supabase
      .from("vendite_giornaliere")
      .select("id", { count: "exact", head: true })
      .eq("azienda_id", azienda.id)
      .eq("sede_uuid", sedeUuid)
      .eq("data_vendita", dataVendita);
    if (giaEsistenti && giaEsistenti > 0) {
      const proc = confirm(
        `⚠️ ATTENZIONE: per questa sede e questo mese risultano già ${giaEsistenti} righe caricate.\n\n` +
        `Caricare di nuovo creerebbe DOPPIONI. Vuoi procedere comunque?`
      );
      if (!proc) {
        setFeedback(ipratFeedback, "Import annullato (mese già presente per questa sede).", "warn");
        e.target.value = "";
        return;
      }
    }
    const nomeMese = ["","Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"][mese];

    // Anteprima + conferma
    const ok = confirm(
      `ANTEPRIMA IMPORT — ${nomeMese} ${anno}\n\n` +
      `Righe: ${righeDaInserire.length}\n` +
      `Totale venduto: € ${totaleMese.toLocaleString("it-IT", { minimumFractionDigits: 2 })}\n` +
      `Prodotti agganciati al catalogo: ${agganciati}\n` +
      `Non agganciati (salvati comunque col nome): ${nonAgganciati}\n\n` +
      `Tutte le righe avranno data ${dataVendita}. Confermi il salvataggio?`
    );
    if (!ok) {
      setFeedback(ipratFeedback, "Import annullato.", "warn");
      e.target.value = "";
      return;
    }

    setFeedback(ipratFeedback, "Salvataggio in corso...", "info");

    // Inserimento a blocchi per non superare i limiti
    let inseriti = 0;
    let erroreInsert = null;
    for (let i = 0; i < righeDaInserire.length; i += 100) {
      const blocco = righeDaInserire.slice(i, i + 100);
      const { error } = await supabase.from("vendite_giornaliere").insert(blocco);
      if (!error) inseriti += blocco.length;
      else if (!erroreInsert) erroreInsert = error;
    }

    if (inseriti === 0 && erroreInsert) {
      setFeedback(ipratFeedback, "Errore nel salvataggio: " + erroreInsert.message, "warn");
      e.target.value = "";
      return;
    }

    setFeedback(
      ipratFeedback,
      `✅ ${nomeMese} ${anno} importato. Righe salvate: ${inseriti} • Totale: € ${totaleMese.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` +
      (nonAgganciati > 0 ? `<br/><span style="color:#92400e;">${nonAgganciati} prodotti non agganciati al catalogo (ricavo salvato, aggancio da rifinire dopo la bonifica).</span>` : ""),
      "ok"
    );

    await caricaVendite();
    e.target.value = "";
  });

  /* =========================================================
     IMPORT XML FATTURA VENDITA (ARUBA)
  ========================================================= */

  const xmlVenditaFeedback = document.getElementById("xml-vendita-feedback");

  document.getElementById("venduto-xml").addEventListener("change", async (e) => {
    setFeedback(xmlVenditaFeedback, "", "info");
    const file = e.target.files[0];
    if (!file) return;

    setFeedback(xmlVenditaFeedback, "Lettura fattura XML in corso...", "info");

    try {
      const xmlText = await file.text();
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");

      if (doc.querySelector("parsererror")) {
        setFeedback(xmlVenditaFeedback, "File XML non valido.", "err");
        e.target.value = "";
        return;
      }

      // Helper: legge un tag ignorando il namespace
      const getText = (parent, tag) => {
        const els = parent.getElementsByTagName(tag);
        return els.length ? (els[0].textContent || "").trim() : "";
      };

      // Data documento
      const dataDoc = getText(doc, "Data") || new Date().toISOString().split("T")[0];
      const dataVendita = dataDoc.split("T")[0];

      // Righe di dettaglio della fattura
      const dettagli = doc.getElementsByTagName("DettaglioLinee");
      if (!dettagli.length) {
        setFeedback(xmlVenditaFeedback, "Nessuna riga di dettaglio trovata nella fattura.", "warn");
        e.target.value = "";
        return;
      }

      const mapProd = new Map();
      (prodotti || []).forEach(p => {
        if (p.nome) mapProd.set(String(p.nome).trim().toLowerCase(), p);
        if (p.descrizione) mapProd.set(String(p.descrizione).trim().toLowerCase(), p);
      });

      const righe = [];
      let totFattura = 0;
      for (const linea of dettagli) {
        const descr = getText(linea, "Descrizione");
        const qta = parseFloat(getText(linea, "Quantita")) || 1;
        const prezzoTot = parseFloat(getText(linea, "PrezzoTotale")) || 0;
        if (!descr) continue;
        const prod = mapProd.get(descr.toLowerCase());
        totFattura += prezzoTot;
        righe.push({
          azienda_id: azienda.id,
          data_vendita: dataVendita,
          canale: "NR",
          prodotto_id: prod?.id || null,
          nome_articolo: descr,
          nome_prodotto: descr,
          quantita: qta,
          prezzo_unitario: qta > 0 ? prezzoTot / qta : prezzoTot,
          totale_riga: prezzoTot,
          totale_incassato: prezzoTot,
        });
      }

      if (!righe.length) {
        setFeedback(xmlVenditaFeedback, "Nessuna riga valida nella fattura.", "warn");
        e.target.value = "";
        return;
      }

      const ok = confirm(
        `FATTURA VENDITA XML\n\n` +
        `Data: ${dataVendita}\n` +
        `Righe: ${righe.length}\n` +
        `Totale: € ${totFattura.toLocaleString("it-IT", { minimumFractionDigits: 2 })}\n\n` +
        `Salvare queste vendite?`
      );
      if (!ok) {
        setFeedback(xmlVenditaFeedback, "Import annullato.", "warn");
        e.target.value = "";
        return;
      }

      const { error } = await supabase.from("vendite_giornaliere").insert(righe);
      if (error) {
        setFeedback(xmlVenditaFeedback, "Errore salvataggio: " + error.message, "err");
        e.target.value = "";
        return;
      }

      setFeedback(xmlVenditaFeedback, `✅ Fattura importata. Righe: ${righe.length} • Totale: € ${totFattura.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`, "ok");
      await caricaVendite();
    } catch (err) {
      setFeedback(xmlVenditaFeedback, "Errore lettura fattura: " + (err?.message || err), "err");
    }
    e.target.value = "";
  });
}
