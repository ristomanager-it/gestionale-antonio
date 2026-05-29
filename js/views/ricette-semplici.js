import { createPageLayout, createCard } from "../utils/pageLayout.js";

const supa = () => window.supabaseClient || window.supabase;

let prodottiCache = [];
let ricetteCache = [];
let editingId = null;
let ingredienti = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getAziendaId() {
  return window.state?.azienda?.id || null;
}

function getSedeId() {
  return window.state?.sedeAttiva?.id || window.state?.utenteAzienda?.sede_id || null;
}

function productCost(p) {
  return toNumber(p?.costo_medio || p?.costo_ultimo || 0);
}

function productUm(p) {
  return p?.unita_misura || p?.um || p?.unita_base || "";
}

function calcLocalFoodCost() {
  let total = 0;
  for (const ing of ingredienti) {
    const p = prodottiCache.find((x) => String(x.id) === String(ing.prodotto_id));
    total += toNumber(ing.quantita) * productCost(p);
  }

  const prezzo = toNumber(document.getElementById("rs-prezzo")?.value);
  const percent = prezzo > 0 ? (total / prezzo) * 100 : 0;
  const margine = prezzo > 0 ? prezzo - total : 0;

  return {
    food_cost: Math.round(total * 100) / 100,
    food_cost_percentuale: Math.round(percent * 100) / 100,
    margine: Math.round(margine * 100) / 100
  };
}

async function loadProducts() {
  const aziendaId = getAziendaId();
  if (!aziendaId) return [];

  const { data, error } = await supa()
    .from("prodotti")
    .select("id, nome, descrizione, um, unita_misura, unita_base, costo_medio, costo_ultimo, attivo, stato, azienda_id")
    .eq("azienda_id", aziendaId)
    .order("nome", { ascending: true });

  if (error) throw error;
  prodottiCache = (data || []).filter((p) => p.attivo !== false && p.stato !== "eliminato");
  return prodottiCache;
}

async function loadRicette() {
  const aziendaId = getAziendaId();
  const sedeId = getSedeId();

  let q = supa()
    .from("view_ricette_food_cost")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("tipo_ricetta", "semplice")
    .order("nome", { ascending: true });

  if (sedeId) q = q.or(`sede_id.is.null,sede_id.eq.${sedeId}`);

  const { data, error } = await q;
  if (error) {
    console.warn("View food cost non disponibile, fallback su ricette:", error);

    let fallback = supa()
      .from("ricette")
      .select("*")
      .eq("azienda_id", aziendaId)
      .eq("tipo_ricetta", "semplice")
      .order("nome", { ascending: true });

    if (sedeId) fallback = fallback.or(`sede_id.is.null,sede_id.eq.${sedeId}`);

    const res = await fallback;
    if (res.error) throw res.error;
    ricetteCache = res.data || [];
    return ricetteCache;
  }

  ricetteCache = data || [];
  return ricetteCache;
}

async function loadIngredienti(ricettaId) {
  const { data, error } = await supa()
    .from("ricette_ingredienti")
    .select("*")
    .eq("ricetta_id", ricettaId)
    .order("ordine", { ascending: true });

  if (error) throw error;
  return data || [];
}

function renderRicetteList() {
  const wrap = document.getElementById("rs-list");
  if (!wrap) return;

  const q = String(document.getElementById("rs-search")?.value || "").toLowerCase().trim();
  const categoria = String(document.getElementById("rs-filter-categoria")?.value || "").trim();

  const list = ricetteCache.filter((r) => {
    const matchText = !q || String(r.nome || "").toLowerCase().includes(q);
    const matchCat = !categoria || String(r.categoria_food || "") === categoria;
    return matchText && matchCat;
  });

  if (!list.length) {
    wrap.innerHTML = `<div class="timbrature-muted">Nessuna ricetta semplice trovata.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="rs-grid">
      ${list.map((r) => {
        const fc = r.food_cost_live ?? r.food_cost_totale ?? r.food_cost ?? r.costo_materia_prima ?? 0;
        const pct = r.food_cost_percentuale_live ?? r.food_cost_percentuale ?? 0;
        const marg = r.margine_live ?? r.margine ?? 0;

        return `
          <button class="rs-card" type="button" data-edit="${escapeHtml(r.id)}">
            <div class="rs-card-head">
              <strong>${escapeHtml(r.nome || "Ricetta")}</strong>
              <span>${escapeHtml(r.categoria_food || "Senza categoria")}</span>
            </div>
            <div class="rs-card-kpis">
              <div><small>Food cost</small><b>${money(fc)}</b></div>
              <div><small>Food cost %</small><b>${Number(pct || 0).toFixed(1)}%</b></div>
              <div><small>Margine</small><b>${money(marg)}</b></div>
            </div>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderProductOptions(selectedId = "") {
  return `
    <option value="">Seleziona prodotto da magazzino</option>
    ${prodottiCache.map((p) => `
      <option value="${escapeHtml(p.id)}" ${String(selectedId) === String(p.id) ? "selected" : ""}>
        ${escapeHtml(p.nome || p.descrizione || "Prodotto")} — ${money(productCost(p))}/${escapeHtml(productUm(p))}
      </option>
    `).join("")}
  `;
}

function renderIngredienti() {
  const wrap = document.getElementById("rs-ingredienti");
  if (!wrap) return;

  if (!ingredienti.length) {
    wrap.innerHTML = `<div class="timbrature-muted">Aggiungi ingredienti dal magazzino. Il costo viene calcolato automaticamente.</div>`;
  } else {
    wrap.innerHTML = ingredienti.map((ing, index) => {
      const p = prodottiCache.find((x) => String(x.id) === String(ing.prodotto_id));
      const costo = productCost(p);
      const totale = toNumber(ing.quantita) * costo;

      return `
        <div class="rs-ing-row" data-index="${index}">
          <div style="position:relative;flex:1;">
            <input 
              class="input rs-ing-search" 
              placeholder="Cerca prodotto..." 
              autocomplete="off"
              value="${escapeHtml(p?.nome || p?.descrizione || ing._nome || "")}"
              data-selected-id="${escapeHtml(ing.prodotto_id || "")}"
            />
            <input type="hidden" class="rs-ing-product" value="${escapeHtml(ing.prodotto_id || "")}" />
            <div class="rs-ing-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #e5e7eb;border-radius:8px;z-index:100;max-height:180px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>
          </div>
          <input class="input rs-ing-qta" type="number" min="0" step="0.001" value="${escapeHtml(ing.quantita || "")}" placeholder="Q.tà">
          <div class="rs-ing-cost">
            <small>${escapeHtml(productUm(p) || ing.unita_misura || "UM")}</small>
            <strong>${money(totale)}</strong>
            <span>${money(costo)} cad.</span>
          </div>
          <button class="delete-icon-btn rs-ing-delete" type="button">🗑</button>
        </div>
      `;
    }).join("");
  }

  renderLiveCost();
}

function renderLiveCost() {
  const calc = calcLocalFoodCost();
  const box = document.getElementById("rs-live-cost");
  if (!box) return;

  box.innerHTML = `
    <div class="tb-kpi-grid compact">
      <div class="tb-kpi"><span>Food cost live</span><strong>${money(calc.food_cost)}</strong></div>
      <div class="tb-kpi"><span>Food cost %</span><strong>${calc.food_cost_percentuale.toFixed(1)}%</strong></div>
      <div class="tb-kpi"><span>Margine stimato</span><strong>${money(calc.margine)}</strong></div>
    </div>
  `;
}

function resetForm() {
  editingId = null;
  ingredienti = [];
  document.getElementById("rs-form-title").textContent = "Nuova ricetta";
  document.getElementById("rs-nome").value = "";
  document.getElementById("rs-categoria-operativa").value = "cucina";
  document.getElementById("rs-categoria-food").value = "primi";
  document.getElementById("rs-prezzo").value = "";
  document.getElementById("rs-porzioni").value = "1";
  document.getElementById("rs-descrizione").value = "";
  document.getElementById("rs-procedimento").value = "";
  renderIngredienti();
}

async function editRicetta(id) {
  const aziendaId = getAziendaId();

  const { data, error } = await supa()
    .from("ricette")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("id", id)
    .single();

  if (error) throw error;

  editingId = data.id;
  document.getElementById("rs-form-title").textContent = "Modifica ricetta";
  document.getElementById("rs-nome").value = data.nome || "";
  document.getElementById("rs-categoria-operativa").value = data.categoria_operativa || "cucina";
  document.getElementById("rs-categoria-food").value = data.categoria_food || "primi";
  document.getElementById("rs-prezzo").value = data.prezzo_vendita ?? data.prezzo_ristorante ?? "";
  document.getElementById("rs-porzioni").value = data.porzioni ?? data.pezzi_base ?? 1;
  document.getElementById("rs-descrizione").value = data.descrizione || "";
  document.getElementById("rs-procedimento").value = data.note_procedimento || "";

  ingredienti = (await loadIngredienti(data.id)).map((row) => ({
    prodotto_id: row.prodotto_id,
    quantita: row.quantita,
    unita_misura: row.unita_misura
  }));

  renderIngredienti();
  document.getElementById("rs-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveRicetta() {
  const aziendaId = getAziendaId();
  const sedeId = getSedeId();

  const nome = document.getElementById("rs-nome").value.trim();
  if (!nome) return alert("Inserisci il nome ricetta.");
  if (!ingredienti.length) return alert("Aggiungi almeno un ingrediente.");

  for (const ing of ingredienti) {
    if (!ing.prodotto_id || !toNumber(ing.quantita)) {
      return alert("Completa prodotto e quantità per ogni ingrediente.");
    }
  }

  const calc = calcLocalFoodCost();

  const payload = {
    azienda_id: aziendaId,
    sede_id: sedeId,
    nome,
    descrizione: document.getElementById("rs-descrizione").value.trim(),
    note_procedimento: document.getElementById("rs-procedimento").value.trim(),
    tipo_ricetta: "semplice",
    categoria_operativa: document.getElementById("rs-categoria-operativa").value,
    categoria_food: document.getElementById("rs-categoria-food").value,
    prezzo_vendita: toNumber(document.getElementById("rs-prezzo").value),
    pezzi_base: Math.max(1, Math.round(toNumber(document.getElementById("rs-porzioni").value) || 1)),
    porzioni: Math.max(1, toNumber(document.getElementById("rs-porzioni").value) || 1),
    costo_materia_prima: calc.food_cost,
    food_cost_percentuale: calc.food_cost_percentuale,
    margine: calc.margine,
    attivo: true,
    aggiornato_il: new Date().toISOString()
  };

  let ricettaId = editingId;

  if (editingId) {
    const { error } = await supa()
      .from("ricette")
      .update(payload)
      .eq("id", editingId)
      .eq("azienda_id", aziendaId);

    if (error) throw error;
  } else {
    const { data, error } = await supa()
      .from("ricette")
      .insert([payload])
      .select("id")
      .single();

    if (error) throw error;
    ricettaId = data.id;
  }

  await supa()
    .from("ricette_ingredienti")
    .delete()
    .eq("ricetta_id", ricettaId)
    .eq("azienda_id", aziendaId);

  const rows = ingredienti.map((ing, index) => {
    const p = prodottiCache.find((x) => String(x.id) === String(ing.prodotto_id));
    const costoUnit = productCost(p);
    return {
      azienda_id: aziendaId,
      sede_id: sedeId,
      ricetta_id: ricettaId,
      prodotto_id: Number(ing.prodotto_id),
      quantita: toNumber(ing.quantita),
      unita_misura: productUm(p) || ing.unita_misura || "",
      costo_unitario: costoUnit,
      costo_totale: toNumber(ing.quantita) * costoUnit,
      ordine: index
    };
  });

  const { error: ingError } = await supa()
    .from("ricette_ingredienti")
    .insert(rows);

  if (ingError) throw ingError;

  await loadRicette();
  renderRicetteList();
  resetForm();
  alert("Ricetta salvata.");
}

function renderShell() {
  return createPageLayout({
    title: "Ricette",
    subtitle: "Food cost live da magazzino/acquisti, senza prodotto output obbligatorio",
    content: `
      <div class="ricette-semplici-page">
        ${createCard({
          title: "Azioni",
          body: `
            <div class="tb-toolbar">
              <button class="app-button secondary" type="button" onclick="window.location.hash='#/ricettario'">← Ricettario</button>
              <button class="app-button secondary" type="button" onclick="window.location.hash='#/creaRicetta'">Produzione avanzata</button>
              <button id="rs-new" class="app-button" type="button">Nuova ricetta semplice</button>
            </div>
          `
        })}

        ${createCard({
          title: "Elenco ricette",
          body: `
            <div class="tb-toolbar">
              <input id="rs-search" class="input-pill tb-search" placeholder="Cerca ricetta...">
              <select id="rs-filter-categoria" class="input-pill">
                <option value="">Tutte le categorie</option>
                <option value="antipasti">Antipasti</option>
                <option value="primi">Primi</option>
                <option value="secondi">Secondi</option>
                <option value="dessert">Dessert</option>
                <option value="bevande">Bevande</option>
                <option value="panificati">Panificati</option>
                <option value="salse">Salse</option>
                <option value="basi">Basi</option>
                <option value="semilavorati">Semilavorati</option>
                <option value="impasti">Impasti</option>
              </select>
            </div>
            <div id="rs-list" style="margin-top:12px;"></div>
          `
        })}

        ${createCard({
          title: `<span id="rs-form-title">Nuova ricetta semplice</span>`,
          body: `
            <div id="rs-editor">
              <div class="form-grid">
                <div class="form-group">
                  <label>Nome ricetta *</label>
                  <input id="rs-nome" class="input" placeholder="Es. Lasagna, Salsa pomodoro, Focaccia">
                </div>
                <div class="form-group">
                  <label>Area</label>
                  <select id="rs-categoria-operativa" class="input">
                    <option value="cucina">Cucina / Menu</option>
                    <option value="produzione">Produzione / Magazzino</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Categoria</label>
                  <select id="rs-categoria-food" class="input">
                    <option value="antipasti">Antipasti</option>
                    <option value="primi">Primi</option>
                    <option value="secondi">Secondi</option>
                    <option value="dessert">Dessert</option>
                    <option value="bevande">Bevande</option>
                    <option value="panificati">Panificati</option>
                    <option value="salse">Salse</option>
                    <option value="basi">Basi</option>
                    <option value="semilavorati">Semilavorati</option>
                    <option value="impasti">Impasti</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Prezzo vendita / porzione</label>
                  <input id="rs-prezzo" class="input" type="number" step="0.01" placeholder="Serve solo per margine e %">
                </div>
                <div class="form-group">
                  <label>Porzioni</label>
                  <input id="rs-porzioni" class="input" type="number" step="1" min="1" value="1">
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                  <label>Descrizione</label>
                  <textarea id="rs-descrizione" class="input" rows="2"></textarea>
                </div>
              </div>

              <h3 style="margin-top:18px;">Ingredienti da magazzino</h3>
              <p class="timbrature-muted">Il costo ingrediente viene preso automaticamente da <strong>prodotti.costo_medio</strong>, con fallback su <strong>prodotti.costo_ultimo</strong>.</p>
              <div id="rs-ingredienti"></div>
              <button id="rs-add-ing" class="app-button small" type="button" style="margin-top:10px;">+ Aggiungi ingrediente</button>

              <div id="rs-live-cost" style="margin-top:14px;"></div>

              <div class="form-group" style="margin-top:14px;">
                <label>Procedimento</label>
                <textarea id="rs-procedimento" class="input" rows="4"></textarea>
              </div>

              <div class="tb-toolbar" style="margin-top:14px;">
                <button id="rs-save" class="app-button" type="button">Salva ricetta semplice</button>
                <button id="rs-reset" class="app-button secondary" type="button">Annulla</button>
              </div>
            </div>
          `
        })}
      </div>
    `
  });
}

export async function render(app) {
  const aziendaId = getAziendaId();

  if (!aziendaId) {
    app.innerHTML = `<div class="card"><h3>Azienda non selezionata</h3></div>`;
    return;
  }

  app.innerHTML = renderShell();

  try {
    await loadProducts();
    await loadRicette();
    renderRicetteList();
    renderIngredienti();

    app.querySelector("#rs-search")?.addEventListener("input", renderRicetteList);
    app.querySelector("#rs-filter-categoria")?.addEventListener("change", renderRicetteList);
    app.querySelector("#rs-new")?.addEventListener("click", resetForm);
    app.querySelector("#rs-reset")?.addEventListener("click", resetForm);
    app.querySelector("#rs-save")?.addEventListener("click", async () => {
      try {
        await saveRicetta();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Errore salvataggio ricetta.");
      }
    });

    app.querySelector("#rs-add-ing")?.addEventListener("click", () => {
      ingredienti.push({ prodotto_id: "", quantita: "", unita_misura: "", _nome: "" });
      renderIngredienti();
    });

    app.querySelector("#rs-prezzo")?.addEventListener("input", renderLiveCost);

    app.addEventListener("input", (event) => {
      const row = event.target.closest?.(".rs-ing-row");
      if (!row) return;
      const index = Number(row.dataset.index);
      if (!Number.isInteger(index) || !ingredienti[index]) return;

      // Autocomplete ricerca prodotto
      if (event.target.classList.contains("rs-ing-search")) {
        const term = event.target.value.toLowerCase().trim();
        const dropdown = row.querySelector(".rs-ing-dropdown");
        if (!dropdown) return;

        if (term.length < 1) { dropdown.style.display = "none"; return; }

        const matches = prodottiCache.filter(p =>
          (p.nome || p.descrizione || "").toLowerCase().includes(term)
        ).slice(0, 8);

        if (!matches.length) { dropdown.style.display = "none"; return; }

        dropdown.style.display = "block";
        dropdown.innerHTML = matches.map(p => `
          <div data-id="${p.id}" style="padding:8px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
            <span>${escapeHtml(p.nome || p.descrizione)}</span>
            <span style="color:#6b7280;font-size:11px;">${money(productCost(p))}/${escapeHtml(productUm(p))}</span>
          </div>
        `).join("");

        dropdown.querySelectorAll("[data-id]").forEach(item => {
          item.onclick = (e) => {
            e.stopPropagation();
            const p = prodottiCache.find(x => String(x.id) === item.dataset.id);
            if (!p) return;
            const hiddenInput = row.querySelector(".rs-ing-product");
            const searchInput = row.querySelector(".rs-ing-search");
            hiddenInput.value = p.id;
            searchInput.value = p.nome || p.descrizione;
            dropdown.style.display = "none";
            ingredienti[index].prodotto_id = String(p.id);
            ingredienti[index].unita_misura = productUm(p);
            ingredienti[index]._nome = p.nome || p.descrizione;
            // Aggiorna costo e UM nella riga senza re-render completo
            const costBox = row.querySelector(".rs-ing-cost");
            if (costBox) {
              const qta = toNumber(ingredienti[index].quantita);
              costBox.innerHTML = `<small>${escapeHtml(productUm(p))}</small><strong>${money(qta * productCost(p))}</strong><span>${money(productCost(p))} cad.</span>`;
            }
            renderLiveCost();
          };
        });
        return;
      }

      if (event.target.classList.contains("rs-ing-qta")) {
        ingredienti[index].quantita = event.target.value;
        renderLiveCost();
        const costBox = row.querySelector(".rs-ing-cost");
        const p = prodottiCache.find((x) => String(x.id) === String(ingredienti[index].prodotto_id));
        if (costBox && p) {
          const total = toNumber(ingredienti[index].quantita) * productCost(p);
          costBox.innerHTML = `<small>${escapeHtml(productUm(p) || "")}</small><strong>${money(total)}</strong><span>${money(productCost(p))} cad.</span>`;
        }
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".rs-ing-search")) {
        document.querySelectorAll(".rs-ing-dropdown").forEach(d => d.style.display = "none");
      }
    });

    app.addEventListener("change", (event) => {
      const row = event.target.closest?.(".rs-ing-row");
      if (!row) return;
      const index = Number(row.dataset.index);
      if (!Number.isInteger(index) || !ingredienti[index]) return;

      if (event.target.classList.contains("rs-ing-product")) {
        const p = prodottiCache.find((x) => String(x.id) === String(event.target.value));
        ingredienti[index].prodotto_id = event.target.value;
        ingredienti[index].unita_misura = productUm(p);
        renderIngredienti();
      }
    });

    app.addEventListener("click", async (event) => {
      const editBtn = event.target.closest?.("[data-edit]");
      if (editBtn) {
        try {
          await editRicetta(editBtn.dataset.edit);
        } catch (e) {
          console.error(e);
          alert("Errore apertura ricetta.");
        }
        return;
      }

      const del = event.target.closest?.(".rs-ing-delete");
      if (del) {
        const row = del.closest(".rs-ing-row");
        const index = Number(row?.dataset?.index);
        if (Number.isInteger(index)) {
          ingredienti.splice(index, 1);
          renderIngredienti();
        }
      }
    });
  } catch (e) {
    console.error(e);
    app.innerHTML = createPageLayout({
      title: "Ricette",
      subtitle: "",
      content: createCard({
        title: "Errore caricamento",
        body: escapeHtml(e?.message || "Errore imprevisto.")
      })
    });
  }
}
