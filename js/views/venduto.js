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
    .select("id, descrizione")
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
}
