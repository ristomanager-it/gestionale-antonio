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
  // FIX: costo_medio è spesso il prezzo della CONFEZIONE intera (es. sacco da
  // 25kg di farina), non del kg singolo — il commento precedente ("sempre in
  // €/kg dopo fix import") non è affidabile per tutti i prodotti reali.
  // Se c'è quantita_confezione, dividiamo per ottenere il prezzo per kg,
  // esattamente come già fa la ricetta avanzata (crea-ricetta.js).
  const costoMedio = toNumber(p?.costo_medio || p?.costo_ultimo || 0);
  const qtaConfezione = toNumber(p?.quantita_confezione || 0);
  if (qtaConfezione > 0) {
    return costoMedio / qtaConfezione;
  }
  return costoMedio;
}

function productCostPerUm(p, um) {
  // Converte il costo/kg nel costo per la UM richiesta
  const costoKg = productCost(p);
  const u = (um || "").toLowerCase();
  if (u === "pz" && p?.peso_unita_g > 0) {
    // 1 pz = peso_unita_g grammi = peso_unita_g/1000 kg
    return costoKg * (p.peso_unita_g / 1000);
  }
  return costoKg;
}

function productUm(p) {
  return p?.unita_misura || p?.um || p?.unita_base || "";
}

function convertToKg(quantita, um, prodotto) {
  const q = toNumber(quantita);
  const u = (um || "").toLowerCase().trim();
  if (u === "g" || u === "gr" || u === "grammi") return q / 1000;
  if (u === "ml") return q / 1000;
  if (u === "cl") return q / 100;
  if (u === "l" || u === "lt" || u === "litri") return q;
  if (u === "kg") return q;
  if (u === "pz" && prodotto?.peso_unita_g > 0) {
    // pz → converti in kg usando peso unitario
    return q * (prodotto.peso_unita_g / 1000);
  }
  return q;
}

function calcLocalFoodCost() {
  let total = 0;
  for (const ing of ingredienti) {
    if (ing._libero) {
      // Ingrediente libero: usa costo manuale se inserito
      const costoLib = toNumber(ing._costo || 0);
      const qta_kg = convertToKg(ing.quantita, ing.unita_misura);
      total += qta_kg * costoLib;
      continue;
    }
    const p = prodottiCache.find((x) => String(x.id) === String(ing.prodotto_id));
    if (!p) continue;
    const costoKg = productCost(p); // €/kg
    const umIng = ing.unita_misura || productUm(p) || "kg";
    const qta_kg = convertToKg(ing.quantita, umIng, p);
    total += qta_kg * costoKg;
  }

  return {
    food_cost: Math.round(total * 100) / 100,
    food_cost_percentuale: 0,
    margine: 0
  };
}

async function loadProducts() {
  const aziendaId = getAziendaId();
  if (!aziendaId) return [];

  const { data, error } = await supa()
    .from("prodotti")
    .select("id, nome, nome_interno, descrizione, um, unita_misura, unita_base, costo_medio, costo_ultimo, peso_unita_g, quantita_confezione, um_confezione, attivo, stato, azienda_id")
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
    .order("nome", { ascending: true });

  if (sedeId) q = q.or(`sede_id.is.null,sede_id.eq.${sedeId}`);

  const { data, error } = await q;
  if (error) {
    console.warn("View food cost non disponibile, fallback su ricette:", error);

    let fallback = supa()
      .from("ricette")
      .select("*")
      .eq("azienda_id", aziendaId)
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
    .from("ricetta_ingredienti")
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

  // Nasconde lista se nessuna ricerca attiva
  const q_check = String(document.getElementById("rs-search")?.value || "").trim();
  const cat_check = String(document.getElementById("rs-filter-categoria")?.value || "").trim();
  if (!q_check && !cat_check) {
    wrap.innerHTML = `<div class="timbrature-muted" style="padding:12px;color:#94a3b8;font-size:13px;">🔍 Cerca una ricetta per nome o filtra per categoria</div>`;
    return;
  }

  if (!list.length) {
    wrap.innerHTML = `<div class="timbrature-muted">Nessuna ricetta trovata.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="rs-grid">
      ${list.map((r) => {
        const fc = r.food_cost_live ?? r.food_cost_totale ?? r.food_cost ?? r.costo_materia_prima ?? 0;
        const pct = r.food_cost_percentuale_live ?? r.food_cost_percentuale ?? 0;
        const marg = r.margine_live ?? r.margine ?? 0;

        return `
          <div class="rs-card-wrap" style="position:relative;">
            <button class="rs-card" type="button" data-edit="${escapeHtml(r.id)}">
              <div class="rs-card-head">
                <strong>${escapeHtml(r.nome || "Ricetta")}</strong>
                <span>${escapeHtml(r.categoria_food || "Senza categoria")}</span>
              </div>
              <div class="rs-card-kpis">
                <div><small>Food cost</small><b>${money(fc)}</b></div>
                <div><small>Food cost %</small><b>${Number(pct || 0).toFixed(1)}%</b></div>
              </div>
            </button>
            <button class="rs-card-delete" type="button" data-delete="${escapeHtml(r.id)}" data-nome="${escapeHtml(r.nome || "")}"
              style="position:absolute;top:6px;right:6px;background:#fee2e2;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px;color:#dc2626;">
              🗑
            </button>
          </div>
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
      const umRiga = ing.unita_misura || productUm(p) || "kg";
      const qta_kg = convertToKg(ing.quantita, umRiga, p);
      const totale = qta_kg * costo;

      // Ingrediente libero (non in magazzino)
      if (ing._libero) {
        return `
          <div class="rs-ing-row" data-index="${index}" style="display:flex;flex-direction:column;gap:6px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:10px;margin-bottom:8px;">
            <div style="display:flex;gap:6px;align-items:center;">
              <div style="flex:1;">
                <input class="input rs-ing-nome-libero" placeholder="Nome ingrediente libero..." 
                  value="${escapeHtml(ing._nome || "")}" style="width:100%;"
                  title="Ingrediente non in magazzino">
              </div>
              <button class="delete-icon-btn rs-ing-delete" type="button" style="flex-shrink:0;">🗑</button>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <div style="flex:1;">
                <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:2px;">Quantità</label>
                <input class="input rs-ing-qta" type="number" min="0" step="0.001" value="${escapeHtml(String(ing.quantita || ""))}" placeholder="es. 0.5" style="width:100%;">
              </div>
              <div style="flex:1;">
                <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:2px;">Unità misura</label>
                <select class="input rs-ing-um" style="width:100%;">
                  <option value="">—</option>
                  ${["g","kg","ml","l","pz","cl","fetta","cucchiaio","cucchiaino","q.b."].map(u =>
                    `<option value="${u}" ${(ing.unita_misura || "g") === u ? "selected" : ""}>${u}</option>`
                  ).join("")}
                </select>
              </div>
              <div style="flex:1;">
                <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:2px;">Costo/kg €</label>
                <input class="input rs-ing-costo-lib" type="number" min="0" step="0.01" value="${escapeHtml(String(ing._costo || ""))}" placeholder="0.00" style="width:100%;">
              </div>
            </div>
            <div style="font-size:11px;color:#ea580c;">📦 Ingrediente libero — non collegato al magazzino</div>
          </div>
        `;
      }

      return `
        <div class="rs-ing-row" data-index="${index}" style="display:flex;flex-direction:column;gap:6px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:10px;margin-bottom:8px;">
          <div style="display:flex;gap:6px;align-items:center;">
            <div style="position:relative;flex:1;">
              <input 
                class="input rs-ing-search" 
                placeholder="Cerca prodotto..." 
                autocomplete="off"
                value="${escapeHtml(p?.nome || p?.descrizione || ing._nome || "")}"
                data-selected-id="${escapeHtml(ing.prodotto_id || "")}"
                style="width:100%;"
              />
              <input type="hidden" class="rs-ing-product" value="${escapeHtml(ing.prodotto_id || "")}" />
              <div class="rs-ing-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #e5e7eb;border-radius:8px;z-index:100;max-height:180px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.1);"></div>
            </div>
            <button class="delete-icon-btn rs-ing-delete" type="button" style="flex-shrink:0;">🗑</button>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <div style="flex:1;">
              <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:2px;">Quantità</label>
              <input class="input rs-ing-qta" type="number" min="0" step="0.001" value="${escapeHtml(String(ing.quantita || ""))}" placeholder="es. 0.5" style="width:100%;">
            </div>
            <div style="flex:1;">
              <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:2px;">Unità misura</label>
              <select class="input rs-ing-um" style="width:100%;">
                <option value="">—</option>
                ${["g","kg","ml","l","pz","cl","fetta","spicchio","cucchiaio","cucchiaino","q.b."].map(u =>
                  `<option value="${u}" ${(ing.unita_misura || productUm(p) || "") === u ? "selected" : ""}>${u}</option>`
                ).join("")}
              </select>
            </div>
            <div style="flex:1;text-align:right;">
              <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:2px;">Costo</label>
              <div class="rs-ing-cost" style="font-size:13px;font-weight:600;color:#0E5A7A;padding-top:6px;">
                ${totale > 0 ? money(totale) : "—"}
              </div>
            </div>
          </div>
          ${costo > 0 ? `<div style="font-size:11px;color:#94a3b8;">${money(costo)} / ${escapeHtml(productUm(p) || ing.unita_misura || "unità")}</div>` : ""}
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

  // Reset editingId prima di caricare per evitare bug con ricetta precedente
  editingId = null;
  ingredienti = [];

  const { data, error } = await supa()
    .from("ricette")
    .select("*")
    .eq("azienda_id", aziendaId)
    .eq("id", String(id))
    .single();

  if (error) throw error;
  if (!data) { alert("Ricetta non trovata"); return; }

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

  const userId = window.state?.user?.id || null;
  const payload = {
    azienda_id: aziendaId,
    sede_id: sedeId,
    nome,
    descrizione: document.getElementById("rs-descrizione").value.trim(),
    note_procedimento: document.getElementById("rs-procedimento").value.trim(),
    tipo_ricetta: "semplice",
    categoria_operativa: document.getElementById("rs-categoria-operativa").value,
    categoria_food: document.getElementById("rs-categoria-food").value,
    pezzi_base: toNumber(document.getElementById("rs-porzioni").value) || null,
    note_produzione: `Resa: ${document.getElementById("rs-porzioni")?.value || ""} ${document.getElementById("rs-resa-um")?.value || "kg"}`,
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
    .from("ricetta_ingredienti")
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
      unita_misura: ing.unita_misura || productUm(p) || "",
      costo_unitario: costoUnit,
      costo_totale: toNumber(ing.quantita) * costoUnit,
      ordine: index
    };
  });

  const { error: ingError } = await supa()
    .from("ricetta_ingredienti")
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
              <button class="app-button secondary" type="button" onclick="window.location.hash='#/crea-ricetta-avanzata'">Produzione avanzata</button>
              <button id="rs-new" class="app-button" type="button">Nuova ricetta semplice</button>
            </div>
          `
        })}

        ${createCard({
          title: "🔍 Cerca ricetta esistente",
          body: `
            <div class="tb-toolbar">
              <input id="rs-search" class="input-pill tb-search" placeholder="Cerca ricetta..." style="flex:1;">
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
            <div id="rs-list" style="margin-top:12px;max-height:320px;overflow-y:auto;"></div>
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
                <input type="hidden" id="rs-prezzo" value="0">
                <div class="form-group">
                  <label>Resa totale (peso finito)</label>
                  <div style="display:flex;gap:6px;align-items:center;">
                    <input id="rs-porzioni" class="input" type="number" step="0.001" min="0" placeholder="es. 1.5">
                    <select id="rs-resa-um" class="input" style="width:80px;">
                      <option value="kg">kg</option>
                      <option value="gr">gr</option>
                      <option value="lt">lt</option>
                      <option value="pz">pz</option>
                    </select>
                  </div>
                  <small style="color:#6b7280;font-size:11px;">Peso/volume totale prodotto finito (es. 1.5 kg di impasto)</small>
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                  <label>Descrizione</label>
                  <textarea id="rs-descrizione" class="input" rows="2"></textarea>
                </div>
              </div>

              <h3 style="margin-top:18px;">Ingredienti da magazzino</h3>
              <p class="timbrature-muted">Il costo ingrediente viene preso automaticamente da <strong>prodotti.costo_medio</strong>, con fallback su <strong>prodotti.costo_ultimo</strong>.</p>
              <div id="rs-ingredienti"></div>
              <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                <button id="rs-add-ing" class="app-button small" type="button">+ Da magazzino</button>
                <button id="rs-add-ing-libero" class="app-button small secondary" type="button">+ Ingrediente libero</button>
              </div>

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


// ============================================================
// 🔐 PIN RICETTE
// ============================================================
async function richiediPin(app) {
  if (sessionStorage.getItem("pin_ricette_ok") === "true") return true;

  const dipendente = window.state?.dipendente;
  const pinSalvato = dipendente?.pin;

  if (!pinSalvato) {
    sessionStorage.setItem("pin_ricette_ok", "true");
    return true;
  }

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;";
    overlay.innerHTML = `
      <div style="background:white;border-radius:16px;padding:28px;width:300px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
        <div style="font-size:32px;margin-bottom:8px;">🔐</div>
        <h3 style="margin:0 0 6px;font-size:17px;">Accesso Ricette</h3>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">Inserisci il tuo PIN per continuare</p>
        <input id="pin-input" type="password" inputmode="numeric" maxlength="6" placeholder="••••"
          style="width:100%;padding:12px;font-size:22px;letter-spacing:8px;text-align:center;border:2px solid #e5e7eb;border-radius:10px;outline:none;box-sizing:border-box;margin-bottom:12px;" />
        <div id="pin-error" style="color:#dc2626;font-size:12px;min-height:16px;margin-bottom:10px;"></div>
        <button id="pin-ok" style="width:100%;padding:12px;background:#0E5A7A;color:white;border:none;border-radius:10px;font-size:15px;cursor:pointer;">Conferma</button>
        <button id="pin-cancel" style="width:100%;padding:10px;background:transparent;color:#6b7280;border:none;font-size:13px;cursor:pointer;margin-top:6px;">Annulla</button>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector("#pin-input");
    const errEl = overlay.querySelector("#pin-error");
    input.focus();
    function verify() {
      if (String(input.value) === String(pinSalvato)) {
        sessionStorage.setItem("pin_ricette_ok", "true");
        overlay.remove();
        resolve(true);
      } else {
        errEl.textContent = "PIN errato, riprova";
        input.value = "";
        input.focus();
      }
    }
    overlay.querySelector("#pin-ok").onclick = verify;
    overlay.querySelector("#pin-cancel").onclick = () => { overlay.remove(); resolve(false); };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") verify(); });
  });
}


async function openModalIngredienteLibero() {
  const aziendaId = getAziendaId();
  const sedeId = window.state?.sedeAttiva?.id || null;

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const box = document.createElement("div");
  box.style.cssText = "background:white;border-radius:16px;padding:24px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.3);";
  box.innerHTML = `
    <h3 style="margin:0 0 16px;font-size:16px;">➕ Nuovo ingrediente</h3>
    <div style="margin-bottom:12px;">
      <label style="font-size:13px;color:#374151;display:block;margin-bottom:4px;">Nome prodotto</label>
      <input id="lib-nome" class="input" placeholder="es. Ritagli di carne, Macinato..." style="width:100%;box-sizing:border-box;">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <div>
        <label style="font-size:13px;color:#374151;display:block;margin-bottom:4px;">Unità misura</label>
        <select id="lib-um" class="input" style="width:100%;">
          <option value="kg">kg</option>
          <option value="gr">gr</option>
          <option value="lt">lt</option>
          <option value="pz">pz</option>
          <option value="ml">ml</option>
        </select>
      </div>
      <div>
        <label style="font-size:13px;color:#374151;display:block;margin-bottom:4px;">Costo/kg € (opz.)</label>
        <input id="lib-costo" class="input" type="number" step="0.01" placeholder="0.00" style="width:100%;box-sizing:border-box;">
      </div>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-size:13px;color:#374151;display:block;margin-bottom:4px;">Categoria</label>
      <select id="lib-categoria" class="input" style="width:100%;">
        <option value="Varie">Varie</option>
        <option value="Carni">Carni</option>
        <option value="Verdure e Frutta">Verdure e Frutta</option>
        <option value="Latticini e Formaggi">Latticini e Formaggi</option>
        <option value="Pasta e Cereali">Pasta e Cereali</option>
        <option value="Pesce">Pesce</option>
        <option value="Dispensa">Dispensa</option>
        <option value="Semilavorati">Semilavorati</option>
      </select>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:13px;color:#374151;display:block;margin-bottom:4px;">Fornitore (opzionale)</label>
      <select id="lib-fornitore" class="input" style="width:100%;box-sizing:border-box;">
        <option value="">— seleziona fornitore —</option>
      </select>
    </div>
    <div id="lib-feedback" style="font-size:12px;min-height:16px;margin-bottom:10px;"></div>
    <div style="display:flex;gap:8px;">
      <button id="lib-salva" class="app-button" style="flex:1;">✅ Crea e aggiungi</button>
      <button id="lib-annulla" class="app-button secondary">Annulla</button>
    </div>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  overlay.querySelector("#lib-annulla").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.querySelector("#lib-nome").focus();

  // Carica fornitori
  supa().from("fornitori").select("id, ragione_sociale")
    .eq("azienda_id", aziendaId).eq("attivo", true).order("ragione_sociale")
    .then(({ data }) => {
      const sel = overlay.querySelector("#lib-fornitore");
      if (sel && data) data.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f.id; opt.textContent = f.ragione_sociale;
        sel.appendChild(opt);
      });
    });

  overlay.querySelector("#lib-salva").onclick = async () => {
    const feedback = overlay.querySelector("#lib-feedback");
    const nome = overlay.querySelector("#lib-nome").value.trim();
    const um = overlay.querySelector("#lib-um").value;
    const costo = toNumber(overlay.querySelector("#lib-costo").value);
    const categoria = overlay.querySelector("#lib-categoria").value;

    if (!nome) { feedback.innerHTML = `<span style="color:#dc2626;">Inserisci il nome</span>`; return; }

    feedback.innerHTML = `<span style="color:#64748b;">Creazione in corso...</span>`;

    try {
      // Cerca se esiste già
      // Cerca con wildcard su nome e nome_interno
      let existing = null;
      const { data: f1 } = await supa().from("prodotti")
        .select("id, nome, costo_medio, costo_ultimo")
        .eq("azienda_id", aziendaId)
        .ilike("nome", `%${nome}%`).limit(1);
      existing = f1?.[0] || null;
      if (!existing) {
        const { data: f2 } = await supa().from("prodotti")
          .select("id, nome, costo_medio, costo_ultimo")
          .eq("azienda_id", aziendaId)
          .ilike("nome_interno", `%${nome}%`).limit(1);
        existing = f2?.[0] || null;
      }

      let prodottoId, prodottoNome, prodottoCosto;

      if (existing) {
        prodottoId = existing.id;
        prodottoNome = existing.nome;
        prodottoCosto = toNumber(existing.costo_medio) || toNumber(existing.costo_ultimo) || 0;
        feedback.innerHTML = `<span style="color:#16a34a;">✅ Trovato in magazzino: ${prodottoNome}</span>`;
      } else {
        // Crea nuovo prodotto
        const fornitoreId = overlay.querySelector("#lib-fornitore")?.value || null;
        const { data: nuovo, error } = await supa()
          .from("prodotti")
          .insert({
            azienda_id: aziendaId,
            nome: nome,
            nome_interno: nome,
            unita_base: um,
            categoria_interna: categoria,
            categoria_bilancio_id: 7,
            costo_medio: costo || 0,
            costo_ultimo: costo || 0,
            fornitore_preferito_id: fornitoreId || null,
            attivo: true
          })
          .select("id, nome")
          .single();

        if (error) throw error;
        prodottoId = nuovo.id;
        prodottoNome = nuovo.nome;
        prodottoCosto = costo;

        // Crea movimento giacenza 0 per registrare il prodotto in magazzino
        if (sedeId) {
          await supa().from("magazzino_movimenti").insert({
            azienda_id: aziendaId,
            sede_id: sedeId,
            prodotto_id: prodottoId,
            tipo_movimento: "carico",
            quantita: 0.001,
            costo: costo || 0,
            causale: "Creazione da ricetta"
          });
        }

        // Aggiunge alla cache locale
        prodottiCache.push({
          id: prodottoId,
          nome: prodottoNome,
          nome_interno: nome,
          unita_base: um,
          costo_medio: prodottoCosto,
          costo_ultimo: prodottoCosto,
          categoria_interna: categoria
        });

        feedback.innerHTML = `<span style="color:#16a34a;">✅ Prodotto creato e aggiunto al magazzino</span>`;
      }

      // Aggiunge all'elenco ingredienti
      setTimeout(() => {
        ingredienti.push({
          prodotto_id: prodottoId,
          _nome: prodottoNome,
          quantita: "",
          unita_misura: um,
        });
        renderIngredienti();
        overlay.remove();
      }, 600);

    } catch(err) {
      feedback.innerHTML = `<span style="color:#dc2626;">Errore: ${err.message}</span>`;
    }
  };
}

export async function render(app) {
  const aziendaId = getAziendaId();

  if (!aziendaId) {
    app.innerHTML = `<div class="card"><h3>Azienda non selezionata</h3></div>`;
    return;
  }

  // 🔐 PIN obbligatorio
  const pinOk = await richiediPin(app);
  if (!pinOk) { window.history.back(); return; }

  app.innerHTML = renderShell();

  try {
    await loadProducts();
    await loadRicette();
    renderRicetteList();
    renderIngredienti();

    // Apri ricetta da URL se presente (?id=X)
    const ricettaIdFromUrl = window.routeParams?.id 
      || new URLSearchParams(window.location.hash.split("?")[1] || "").get("id");
    if (ricettaIdFromUrl) {
      try {
        await editRicetta(ricettaIdFromUrl);
      } catch(e) {
        console.error("Errore apertura ricetta da URL:", e);
      }
    }

    app.querySelector("#rs-search")?.addEventListener("input", renderRicetteList);

    // ── Elimina ricetta ──
    app.addEventListener("click", async (e) => {
      const btn = e.target.closest?.("[data-delete]");
      if (!btn) return;
      const id = btn.dataset.delete;
      const nome = btn.dataset.nome;
      if (!confirm(`Eliminare la ricetta "${nome}"? L'operazione è irreversibile.`)) return;
      try {
        await supa().from("ricetta_ingredienti").delete().eq("ricetta_id", id);
        await supa().from("ricette").delete().eq("id", id);
        ricetteCache = ricetteCache.filter(r => String(r.id) !== String(id));
        renderRicetteList();
        if (String(editingId) === String(id)) resetForm();
        alert("Ricetta eliminata.");
      } catch(err) {
        alert("Errore eliminazione: " + err.message);
      }
    });

    // ── Ingrediente libero → crea prodotto al volo ──
    app.querySelector("#rs-add-ing-libero")?.addEventListener("click", () => {
      openModalIngredienteLibero();
    });

    // Ingrediente libero
    app.querySelector("#rs-add-ing-libero")?.addEventListener("click", () => {
      ingredienti.push({
        prodotto_id: null,
        _nome: "",
        quantita: "",
        unita_misura: "g",
        _libero: true
      });
      renderIngredienti();
      // Focus sull'ultimo campo nome libero
      const rows = app.querySelectorAll(".rs-ing-row");
      const last = rows[rows.length - 1];
      last?.querySelector(".rs-ing-nome-libero")?.focus();
    });
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
              const qta_kg = convertToKg(ingredienti[index].quantita, ingredienti[index].unita_misura || productUm(p));
              costBox.textContent = qta_kg > 0 ? money(qta_kg * productCost(p)) : "—";
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
          costBox.textContent = total > 0 ? money(total) : "—";
        }
      }
    });

    app.addEventListener("change", (ev) => {
      const row2 = ev.target.closest?.(".rs-ing-row");
      if (!row2) return;
      const idx2 = Number(row2.dataset.index);
      if (!Number.isInteger(idx2) || !ingredienti[idx2]) return;
      if (ev.target.classList.contains("rs-ing-um")) {
        ingredienti[idx2].unita_misura = ev.target.value;
      }
    });

    app.addEventListener("input", (ev) => {
      const row2 = ev.target.closest?.(".rs-ing-row");
      if (!row2) return;
      const idx2 = Number(row2.dataset.index);
      if (!Number.isInteger(idx2) || !ingredienti[idx2]) return;
      if (ev.target.classList.contains("rs-ing-nome-libero")) {
        ingredienti[idx2]._nome = ev.target.value;
      }
      if (ev.target.classList.contains("rs-ing-costo-lib")) {
        ingredienti[idx2]._costo = toNumber(ev.target.value);
        renderLiveCost();
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
