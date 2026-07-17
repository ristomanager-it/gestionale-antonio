import { escapeHtml, parseLocaleNumber, formatMoney, normalizeInputDate } from "./utils.js";

// Normalizzazione IDENTICA a public.normalize_product_name (unaccent + lower + [^a-z0-9]->spazio + collapse)
// Serve solo per l'aggancio automatico lato client; il match reale nel food cost avviene in SQL.
function normNome(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const UM_OPZIONI = ["kg", "gr", "lt", "ml", "cl", "pz"];

export async function renderListini(container, azienda) {

  const supabase = window.supabaseClient || window.supabase;

  // Prodotti e fornitori dell'azienda: per datalist + aggancio automatico per nome
  const [{ data: prodotti }, { data: fornitori }] = await Promise.all([
    supabase.from("prodotti")
      .select("id,nome,costo_medio")
      .eq("azienda_id", azienda.id)
      .limit(2000),
    supabase.from("fornitori")
      .select("id,ragione_sociale")
      .eq("azienda_id", azienda.id)
      .order("ragione_sociale", { ascending: true })
      .limit(1000)
  ]);

  const prodottiList = prodotti || [];
  const fornitoriList = fornitori || [];

  // Mappa nome normalizzato -> prodotto (per aggancio automatico e per sapere se ha già un costo reale)
  const prodByNorm = new Map();
  prodottiList.forEach(p => {
    const k = normNome(p.nome);
    if (k && !prodByNorm.has(k)) prodByNorm.set(k, p);
  });
  const fornByNome = new Map();
  fornitoriList.forEach(f => {
    const k = normNome(f.ragione_sociale);
    if (k) fornByNome.set(k, f);
  });

  container.innerHTML = `
  <div class="card">

    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div>
        <h3>Listini fornitore</h3>
        <p style="margin:2px 0 0; color:#94a3b8; font-size:13px;">
          Prezzi di riferimento senza fatture. Usati nel food cost solo quando il prodotto non ha ancora un costo reale dal magazzino.
        </p>
      </div>
      <div style="display:flex; gap:8px;">
        <button id="btn-importa-listino" class="app-button small">Importa da Excel/CSV</button>
        <button id="btn-nuovo-listino" class="app-button small green">Nuova riga</button>
      </div>
    </div>

    <div style="margin-top:12px">
      <input id="listino-search" class="input" placeholder="Cerca prodotto o fornitore...">
    </div>

    <div id="listini-results" style="margin-top:16px"></div>

  </div>

  <div id="listino-form"></div>
  <div id="listino-import"></div>

  <datalist id="dl-prodotti">
    ${prodottiList.map(p => `<option value="${escapeHtml(p.nome)}"></option>`).join("")}
  </datalist>
  <datalist id="dl-fornitori">
    ${fornitoriList.map(f => `<option value="${escapeHtml(f.ragione_sociale)}"></option>`).join("")}
  </datalist>
  `;

  const inputSearch = container.querySelector("#listino-search");
  const results = container.querySelector("#listini-results");

  container.querySelector("#btn-nuovo-listino").addEventListener("click", () => openForm());
  container.querySelector("#btn-importa-listino").addEventListener("click", () => openImport());

  function statoAggancio(row) {
    // Trova il prodotto agganciato (per prodotto_id o per nome) e dice se il listino è "in uso"
    let p = null;
    if (row.prodotto_id) p = prodottiList.find(x => x.id === row.prodotto_id) || null;
    if (!p) p = prodByNorm.get(row.nome_normalizzato || normNome(row.prodotto_nome)) || null;
    if (!p) return { txt: "non agganciato", color: "#94a3b8" };
    const haCosto = Number(p.costo_medio || 0) > 0;
    return haCosto
      ? { txt: "agganciato · costo reale prevale", color: "#f59e0b" }
      : { txt: "agganciato · in uso", color: "#16a34a" };
  }

  function renderRows(data) {
    if (!data || !data.length) {
      results.innerHTML = `<div style="color:#94a3b8;padding:12px;">Nessuna riga di listino. Aggiungine una o importa da Excel/CSV.</div>`;
      return;
    }
    results.innerHTML = `
      <table class="app-table">
        <thead>
          <tr>
            <th>Prodotto</th>
            <th>Fornitore</th>
            <th>UM</th>
            <th style="text-align:right;">Prezzo rif.</th>
            <th>Validità</th>
            <th>Stato</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
        ${data.map(r => {
          const s = statoAggancio(r);
          return `
          <tr class="listino-row" data-id="${r.id}" style="cursor:pointer; ${r.attivo ? "" : "opacity:.5;"}">
            <td>${escapeHtml(r.prodotto_nome)}</td>
            <td>${escapeHtml(r.fornitore_nome || "")}</td>
            <td>${escapeHtml(r.um || "")}</td>
            <td style="text-align:right;">€ ${formatMoney(r.prezzo_riferimento)}</td>
            <td>${r.data_validita || ""}</td>
            <td><span style="color:${s.color}; font-size:12px;">${s.txt}</span></td>
            <td style="text-align:right;">
              <button class="app-button small toggle-attivo" data-id="${r.id}" data-attivo="${r.attivo ? 1 : 0}">
                ${r.attivo ? "Disattiva" : "Attiva"}
              </button>
            </td>
          </tr>`;
        }).join("")}
        </tbody>
      </table>
    `;

    results.querySelectorAll(".listino-row").forEach(row => {
      row.addEventListener("click", async (e) => {
        if (e.target.closest(".toggle-attivo")) return;
        const id = row.dataset.id;
        const { data: riga } = await supabase.from("listini_fornitore").select("*").eq("id", id).single();
        openForm(riga);
      });
    });

    results.querySelectorAll(".toggle-attivo").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const nuovo = btn.dataset.attivo === "1" ? false : true;
        await supabase.from("listini_fornitore").update({ attivo: nuovo }).eq("id", id);
        await caricaListini(inputSearch.value.trim());
      });
    });
  }

  async function caricaListini(filtro = "") {
    results.innerHTML = `<div style="color:#94a3b8;padding:12px;">Caricamento...</div>`;
    let q = supabase
      .from("listini_fornitore")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("prodotto_nome", { ascending: true })
      .limit(1000);
    if (filtro && filtro.length >= 2) {
      q = q.or(`prodotto_nome.ilike.%${filtro}%,fornitore_nome.ilike.%${filtro}%`);
    }
    const { data, error } = await q;
    if (error) {
      results.innerHTML = `<div style="color:#dc2626;padding:12px;">Errore nel caricamento listini.</div>`;
      return;
    }
    renderRows(data || []);
  }

  let searchTimer = null;
  inputSearch.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => caricaListini(inputSearch.value.trim()), 250);
  });

  await caricaListini();

  // ---- Form singola riga ----
  function openForm(r = null) {
    const form = document.getElementById("listino-form");
    form.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>${r ? "Modifica riga listino" : "Nuova riga listino"}</h3>
        ${r ? `<button id="del-listino" class="app-button small" style="background:#dc2626;color:#fff;">Elimina</button>` : ""}
      </div>

      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1;">
          <label>Prodotto (nome esatto e riconoscibile)</label>
          <input id="l-prodotto" class="input" list="dl-prodotti" value="${escapeHtml(r?.prodotto_nome || "")}" placeholder="es. Pomodoro pelato San Marzano">
        </div>

        <div class="form-group">
          <label>Fornitore</label>
          <input id="l-fornitore" class="input" list="dl-fornitori" value="${escapeHtml(r?.fornitore_nome || "")}" placeholder="opzionale">
        </div>

        <div class="form-group">
          <label>UM (a cui si riferisce il prezzo)</label>
          <select id="l-um" class="input">
            ${UM_OPZIONI.map(u => `<option value="${u}">${u}</option>`).join("")}
          </select>
        </div>

        <div class="form-group">
          <label>Prezzo di riferimento (€ / UM)</label>
          <input id="l-prezzo" class="input" inputmode="decimal" value="${r ? formatMoney(r.prezzo_riferimento) : ""}" placeholder="es. 2,40">
        </div>

        <div class="form-group">
          <label>Validità dal</label>
          <input id="l-data" class="input" type="date" value="${r?.data_validita || new Date().toISOString().slice(0,10)}">
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label>Note</label>
          <input id="l-note" class="input" value="${escapeHtml(r?.note || "")}">
        </div>
      </div>

      <div class="form-actions">
        <button id="save-listino" class="app-button green">Salva</button>
      </div>
      <div id="listino-feedback" style="margin-top:8px;"></div>
    </div>
    `;

    form.querySelector("#l-um").value = r?.um || "kg";

    if (r) {
      form.querySelector("#del-listino").addEventListener("click", async () => {
        if (!confirm("Eliminare questa riga di listino?")) return;
        await supabase.from("listini_fornitore").delete().eq("id", r.id);
        form.innerHTML = "";
        await caricaListini(inputSearch.value.trim());
      });
    }

    form.querySelector("#save-listino").addEventListener("click", async () => {
      const feedback = form.querySelector("#listino-feedback");
      const nome = form.querySelector("#l-prodotto").value.trim();
      const prezzo = parseLocaleNumber(form.querySelector("#l-prezzo").value, NaN);

      if (!nome) { feedback.innerHTML = `<span style="color:#dc2626;">Inserisci il nome del prodotto.</span>`; return; }
      if (!Number.isFinite(prezzo) || prezzo < 0) { feedback.innerHTML = `<span style="color:#dc2626;">Prezzo non valido.</span>`; return; }

      const fornNome = form.querySelector("#l-fornitore").value.trim();
      const forn = fornByNome.get(normNome(fornNome));
      const prod = prodByNorm.get(normNome(nome));

      const payload = {
        azienda_id: azienda.id,
        prodotto_nome: nome,
        prodotto_id: prod ? prod.id : null,     // aggancio esplicito se il nome combacia
        fornitore_nome: fornNome || null,
        fornitore_id: forn ? forn.id : null,
        um: form.querySelector("#l-um").value,
        prezzo_riferimento: prezzo,
        data_validita: normalizeInputDate(form.querySelector("#l-data").value) || null,
        note: form.querySelector("#l-note").value.trim() || null,
        attivo: r ? r.attivo : true
      };

      let error;
      if (r) ({ error } = await supabase.from("listini_fornitore").update(payload).eq("id", r.id));
      else   ({ error } = await supabase.from("listini_fornitore").insert(payload));

      if (error) { feedback.innerHTML = `<span style="color:#dc2626;">Errore salvataggio: ${escapeHtml(error.message)}</span>`; return; }

      feedback.innerHTML = `<span style="color:#16a34a;">Salvato${prod ? " · agganciato a «" + escapeHtml(prod.nome) + "»" : " · nessun prodotto con questo nome (aggancio per nome quando lo creerai)"}</span>`;
      await caricaListini(inputSearch.value.trim());
    });
  }

  // ---- Import da Excel/CSV (incolla) ----
  function openImport() {
    const box = document.getElementById("listino-import");
    box.innerHTML = `
    <div class="card">
      <h3>Importa listino da Excel/CSV</h3>
      <p style="color:#94a3b8; font-size:13px; margin-top:2px;">
        Incolla dalle celle di Excel o da un CSV. Una riga per prodotto. Colonne (in ordine):
        <b>Prodotto</b>, <b>UM</b>, <b>Prezzo</b>, e opzionale <b>Fornitore</b>.
        Separatori riconosciuti: TAB, punto e virgola, virgola.
      </p>
      <textarea id="import-text" class="input" rows="8" style="width:100%; font-family:monospace;"
        placeholder="Pomodoro pelato&#9;kg&#9;2,40&#9;Fresco Srl
Olio EVO&#9;lt&#9;7,90
Farina 00&#9;kg&#9;0,95&#9;Molino Bianco"></textarea>
      <div class="form-actions" style="margin-top:8px;">
        <button id="import-anteprima" class="app-button">Anteprima</button>
      </div>
      <div id="import-preview" style="margin-top:12px;"></div>
    </div>
    `;

    box.querySelector("#import-anteprima").addEventListener("click", () => {
      const righe = parseImport(box.querySelector("#import-text").value);
      const preview = box.querySelector("#import-preview");
      if (!righe.length) {
        preview.innerHTML = `<div style="color:#dc2626;">Nessuna riga valida riconosciuta.</div>`;
        return;
      }
      preview.innerHTML = `
        <table class="app-table">
          <thead><tr><th>Prodotto</th><th>UM</th><th style="text-align:right;">Prezzo</th><th>Fornitore</th><th>Aggancio</th></tr></thead>
          <tbody>
          ${righe.map(r => {
            const prod = prodByNorm.get(normNome(r.prodotto_nome));
            return `<tr>
              <td>${escapeHtml(r.prodotto_nome)}</td>
              <td>${escapeHtml(r.um)}</td>
              <td style="text-align:right;">€ ${formatMoney(r.prezzo_riferimento)}</td>
              <td>${escapeHtml(r.fornitore_nome || "")}</td>
              <td style="font-size:12px; color:${prod ? "#16a34a" : "#94a3b8"};">${prod ? "sì" : "per nome"}</td>
            </tr>`;
          }).join("")}
          </tbody>
        </table>
        <div class="form-actions" style="margin-top:8px;">
          <button id="import-conferma" class="app-button green">Importa ${righe.length} righe</button>
        </div>
        <div id="import-feedback" style="margin-top:8px;"></div>
      `;

      preview.querySelector("#import-conferma").addEventListener("click", async () => {
        const fb = preview.querySelector("#import-feedback");
        fb.innerHTML = "Importazione in corso...";
        const payload = righe.map(r => {
          const prod = prodByNorm.get(normNome(r.prodotto_nome));
          const forn = r.fornitore_nome ? fornByNome.get(normNome(r.fornitore_nome)) : null;
          return {
            azienda_id: azienda.id,
            prodotto_nome: r.prodotto_nome,
            prodotto_id: prod ? prod.id : null,
            fornitore_nome: r.fornitore_nome || null,
            fornitore_id: forn ? forn.id : null,
            um: r.um,
            prezzo_riferimento: r.prezzo_riferimento,
            data_validita: new Date().toISOString().slice(0, 10),
            attivo: true
          };
        });
        const { error } = await supabase.from("listini_fornitore").insert(payload);
        if (error) { fb.innerHTML = `<span style="color:#dc2626;">Errore: ${escapeHtml(error.message)}</span>`; return; }
        fb.innerHTML = `<span style="color:#16a34a;">Importate ${payload.length} righe.</span>`;
        box.querySelector("#import-text").value = "";
        await caricaListini(inputSearch.value.trim());
      });
    });
  }

  function parseImport(text) {
    const out = [];
    const linee = String(text || "").split(/\r?\n/);
    for (const linea of linee) {
      const t = linea.trim();
      if (!t) continue;
      // separatore: TAB se presente, altrimenti ; altrimenti ,
      const sep = t.includes("\t") ? "\t" : (t.includes(";") ? ";" : ",");
      const cols = t.split(sep).map(c => c.trim());
      if (cols.length < 3) continue;
      const nome = cols[0];
      let um = (cols[1] || "").toLowerCase();
      const prezzo = parseLocaleNumber(cols[2], NaN);
      const fornitore = cols[3] || "";
      if (!nome || !Number.isFinite(prezzo)) continue;
      if (!UM_OPZIONI.includes(um)) um = "kg"; // fallback prudente
      out.push({ prodotto_nome: nome, um, prezzo_riferimento: prezzo, fornitore_nome: fornitore });
    }
    return out;
  }

}
