import { supabase } from "../supabaseClient.js";

let _items = [];
let _filtered = [];
let _periodo = "30";
let _categoria = "";
let _simItemId = null;
let _saluteSedi = null;
let _saluteSede = "";
let _giorniStorico = 0;

const PIANO_QUADRANTI = {
  star: {
    label: "Star",
    icon: "⭐",
    colore: "#059669",
    bg: "#d1fae5",
    desc: "Alta popolarità e alto margine. Spingi questi piatti."
  },
  puzzle: {
    label: "Puzzle",
    icon: "🧩",
    colore: "#7C3AED",
    bg: "#ede9fe",
    desc: "Alto margine ma poche vendite. Migliora posizione, nome o foto."
  },
  plowhorse: {
    label: "Plowhorse",
    icon: "🐎",
    colore: "#d97706",
    bg: "#fef3c7",
    desc: "Vende molto ma lascia poco margine. Ottimizza costo o prezzo."
  },
  dog: {
    label: "Dog",
    icon: "🐶",
    colore: "#DC2626",
    bg: "#fee2e2",
    desc: "Basse vendite e basso margine. Valuta sostituzione o rimozione."
  }
};

export async function render(container) {
  container.innerHTML = `
    <div class="view">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
        <div>
          <button onclick="window.location.hash='#/gestione'" style="border:none;background:#eef2f7;color:#0E5A7A;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer;margin-bottom:12px;">← Gestione</button>
          <h2 style="margin:0;color:#111827;">🍽️ Menu Intelligence AI</h2>
          <p style="margin:6px 0 0;color:#64748b;font-size:13px;">Menu engineering, margini, simulatore prezzi e suggerimenti operativi.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <select id="mi-periodo" class="input" style="width:auto;min-width:130px;" onchange="miSetPeriodo(this.value)">
            <option value="7">Ultimi 7 giorni</option>
            <option value="30" selected>Ultimi 30 giorni</option>
            <option value="90">Ultimi 90 giorni</option>
            <option value="365">Ultimo anno</option>
          </select>
          <select id="mi-categoria" class="input" style="width:auto;min-width:150px;" onchange="miSetCategoria(this.value)">
            <option value="">Tutte le categorie</option>
          </select>
          <button onclick="miReload()" style="background:#0E5A7A;color:white;border:none;border-radius:12px;padding:10px 14px;font-weight:800;cursor:pointer;">Aggiorna</button>
        </div>
      </div>

      <div id="mi-loading" style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:24px;text-align:center;color:#94a3b8;">
        Caricamento analisi menu...
      </div>

      <div id="mi-content" style="display:none;">
        <div id="mi-kpi"></div>
        <div id="mi-score"></div>
        <div id="mi-salute" class="mi-card" style="margin-top:16px;"></div>

        <div style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:16px;margin-top:16px;" class="mi-grid-main">
          <div>
            <div id="mi-table"></div>
            <div id="mi-proiezione"></div>
            <div id="mi-simulator"></div>
          </div>
          <div>
            <div id="mi-matrix"></div>
            <div id="mi-ai"></div>
            <div id="mi-ingredienti"></div>
          </div>
        </div>
      </div>

      <style>
        .mi-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;}
        .mi-kpi{background:white;border:1px solid #e5e7eb;border-radius:14px;padding:14px;text-align:center;}
        .mi-kpi-val{font-size:22px;font-weight:900;color:#111827;}
        .mi-kpi-lbl{font-size:11px;color:#64748b;margin-top:4px;}
        .mi-card{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin-bottom:16px;box-shadow:0 6px 18px rgba(15,23,42,0.035);}
        .mi-table-wrap{overflow:auto;}
        .mi-table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:760px;}
        .mi-table th{background:#f8fafc;color:#64748b;text-align:left;padding:10px;border-bottom:1px solid #e5e7eb;font-size:11px;text-transform:uppercase;}
        .mi-table td{padding:10px;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
        .mi-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:900;}
        .mi-btn-small{border:none;border-radius:9px;padding:6px 10px;font-size:11px;font-weight:800;cursor:pointer;background:#eef2ff;color:#4338ca;}
        .mi-matrix-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .mi-q{border-radius:14px;padding:12px;min-height:98px;cursor:pointer;border:1px solid rgba(0,0,0,.04);}
        .mi-q:hover{filter:brightness(.985);transform:translateY(-1px);}
        .mi-ai-item{border-radius:12px;padding:12px;margin-bottom:8px;border:1px solid #e5e7eb;background:#f8fafc;}
        .mi-range{width:100%;}
        @media(max-width:900px){.mi-grid-main{grid-template-columns:1fr!important;}.mi-table{min-width:680px;}}
      </style>
    </div>
  `;

  bindGlobals();
  await loadData();
}

function bindGlobals() {
  window.miReload = async function() {
    await loadData();
  };

  window.miSetPeriodo = function(v) {
    _periodo = v || "30";
    loadData();
  };

  window.miSetCategoria = function(v) {
    _categoria = v || "";
    applyFiltersAndRender();
  };

  window.miSelectQuadrante = function(q) {
    _categoria = document.getElementById("mi-categoria")?.value || "";
    _filtered = _items.filter(i => i.quadrante === q);
    renderAll();
    document.getElementById("mi-table-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.miSimula = function(id) {
    _simItemId = id;
    renderSimulator();
    document.getElementById("mi-simulator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.miUpdateSim = function(value) {
    const output = document.getElementById("mi-sim-output");
    const item = _items.find(i => String(i.id) === String(_simItemId));
    if (!output || !item) return;
    output.innerHTML = renderSimOutput(item, Number(value || 0));
  };

  window.miApplicaPrezzo = async function(id) {
    const item = _items.find(i => String(i.id) === String(id));
    if (!item || item.prezzoConsigliato == null || !item.pvIds?.length) return;
    const attuale = item.prezzoListino != null ? item.prezzoListino : item.prezzo;
    const ok = confirm(`Aggiornare il listino di "${item.nome}"?\n\n${euro(attuale)} → ${euro(item.prezzoConsigliato)}`);
    if (!ok) return;
    try {
      const { error } = await supabase.from("prodotti_vendita")
        .update({ prezzo_base: item.prezzoConsigliato })
        .in("id", item.pvIds);
      if (error) throw error;
      alert(`✅ "${item.nome}" aggiornato a ${euro(item.prezzoConsigliato)} nel listino.`);
      await loadData();
    } catch (e) {
      alert("Errore aggiornamento prezzo: " + (e?.message || e));
    }
  };

  window.miApplicaTutti = async function() {
    const daApplicare = _filtered.filter(i => {
      const attuale = i.prezzoListino != null ? i.prezzoListino : i.prezzo;
      return i.prezzoConsigliato != null && i.prezzoConsigliato > attuale + 0.01 && i.pvIds?.length;
    });
    if (!daApplicare.length) return;
    const ok = confirm(`Aggiornare il listino di ${daApplicare.length} piatti ai prezzi consigliati?\n\nEsempi:\n` + daApplicare.slice(0, 4).map(i => `• ${i.nome}: ${euro(i.prezzoListino != null ? i.prezzoListino : i.prezzo)} → ${euro(i.prezzoConsigliato)}`).join("\n"));
    if (!ok) return;
    let fatti = 0, errori = 0;
    for (const item of daApplicare) {
      try {
        const { error } = await supabase.from("prodotti_vendita")
          .update({ prezzo_base: item.prezzoConsigliato })
          .in("id", item.pvIds);
        if (error) errori++; else fatti++;
      } catch { errori++; }
    }
    alert(`✅ Aggiornati ${fatti} piatti nel listino${errori ? ` (${errori} errori)` : ""}.`);
    await loadData();
  };
}

async function loadData() {
  const loading = document.getElementById("mi-loading");
  const content = document.getElementById("mi-content");
  if (loading) loading.style.display = "block";
  if (content) content.style.display = "none";

  const aziendaId = window.state?.azienda?.id;

  // Fonte unica e affidabile: vw_menu_engineering (stessa del Menu Engineering e della Salute dati).
  let rows = [];
  try {
    const { data } = await supabase.from("vw_menu_engineering").select("*").eq("azienda_id", aziendaId);
    rows = (data || []).filter(r => r.quadrante && r.quadrante !== "SENZA_COSTO");
  } catch { rows = []; }

  // Prezzo di listino reale (prodotti_vendita.prezzo_base) per ricetta
  const listino = new Map();
  try {
    const { data: pvs } = await supabase.from("prodotti_vendita")
      .select("id,ricetta_id,prezzo_base")
      .eq("azienda_id", aziendaId)
      .not("ricetta_id", "is", null);
    (pvs || []).forEach(p => {
      if (!listino.has(p.ricetta_id)) listino.set(p.ricetta_id, { ids: [], prezzo: n(p.prezzo_base) });
      listino.get(p.ricetta_id).ids.push(p.id);
    });
  } catch { /* listino opzionale */ }

  _items = rows.map(r => {
    const prezzo = n(r.prezzo_medio);
    const costo = n(r.costo_piatto);
    const vendite = n(r.qta_venduta);
    const ricavo = n(r.ricavi);
    const margineUnitario = r.margine_unitario != null ? n(r.margine_unitario) : Math.max(0, prezzo - costo);
    const foodCostPerc = r.food_cost_perc != null ? n(r.food_cost_perc) : (prezzo > 0 ? costo / prezzo * 100 : 0);
    return {
      id: `r_${r.ricetta_id}`, rawId: r.ricetta_id, tipo: "ricetta",
      nome: r.nome || "Ricetta", categoria: r.categoria || "Menu",
      prezzo, costo, vendite, ricavo,
      margineUnitario, margineTotale: margineUnitario * vendite,
      foodCostPerc, marginePerc: Math.max(0, 100 - foodCostPerc),
      quadrante: String(r.quadrante || "dog").toLowerCase(),
      prezzoConsigliato: r.prezzo_consigliato != null ? n(r.prezzo_consigliato) : null,
      margineSpingibile: n(r.margine_spingibile),
      costoStimato: r.costo_stimato === true,
      percezione: r.indice_percezione_prezzo != null ? n(r.indice_percezione_prezzo) : null,
      prezzoMedioCategoria: r.prezzo_medio_categoria != null ? n(r.prezzo_medio_categoria) : null,
      giorniStorico: n(r.giorni_storico) || 0,
      prezzoListino: listino.has(r.ricetta_id) ? listino.get(r.ricetta_id).prezzo : null,
      pvIds: listino.has(r.ricetta_id) ? listino.get(r.ricetta_id).ids : []
    };
  });
  _giorniStorico = _items.length ? Math.max(..._items.map(i => i.giorniStorico), 1) : 0;
  buildCategoryOptions();
  applyFiltersAndRender();
  renderSalute();

  if (loading) loading.style.display = "none";
  if (content) content.style.display = "block";
}

async function fetchSafe(table, select, aziendaId) {
  try {
    let q = supabase.from(table).select(select).limit(500);
    if (aziendaId) q = q.eq("azienda_id", aziendaId);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

async function fetchVenditeSafe(aziendaId, startIso) {
  const tentativi = [
    {
      table: "comande_righe",
      select: "id,prodotto_id,ricetta_id,nome_prodotto,quantita,prezzo_unitario,prezzo_totale,totale,created_at,azienda_id"
    },
    {
      table: "venduto_righe",
      select: "id,prodotto_id,ricetta_id,nome_prodotto,quantita,prezzo_unitario,prezzo_totale,totale,created_at,azienda_id"
    },
    {
      table: "ordini_righe",
      select: "id,prodotto_id,ricetta_id,nome_prodotto,quantita,prezzo_unitario,prezzo_totale,totale,created_at,azienda_id"
    }
  ];

  for (const t of tentativi) {
    try {
      let q = supabase.from(t.table).select(t.select).gte("created_at", startIso).limit(3000);
      if (aziendaId) q = q.eq("azienda_id", aziendaId);
      const { data, error } = await q;
      if (!error && Array.isArray(data)) return data;
    } catch {}
  }

  return [];
}

function normalizeItems(prodotti, ricette, vendite) {
  const map = new Map();

  (prodotti || []).forEach(p => {
    if (p.attivo === false) return;
    const prezzo = n(p.prezzo_vendita ?? p.prezzo);
    const costo = n(p.costo_totale ?? p.costo ?? p.food_cost);
    const id = `p_${p.id}`;
    map.set(id, {
      id,
      rawId: p.id,
      tipo: "prodotto",
      nome: p.nome || "Prodotto senza nome",
      categoria: p.categoria || "Menu",
      prezzo,
      costo,
      vendite: 0,
      ricavo: 0
    });
  });

  (ricette || []).forEach(r => {
    const prezzo = n(r.prezzo_vendita);
    const costo = n(r.costo_porzione ?? r.costo_totale ?? r.food_cost);
    const id = `r_${r.id}`;
    if (!map.has(id)) {
      map.set(id, {
        id,
        rawId: r.id,
        tipo: "ricetta",
        nome: r.nome || "Ricetta senza nome",
        categoria: r.categoria || "Ricette",
        prezzo,
        costo,
        vendite: 0,
        ricavo: 0
      });
    }
  });

  (vendite || []).forEach(v => {
    const keyProd = v.prodotto_id ? `p_${v.prodotto_id}` : null;
    const keyRic = v.ricetta_id ? `r_${v.ricetta_id}` : null;
    const key = keyProd && map.has(keyProd) ? keyProd : keyRic && map.has(keyRic) ? keyRic : null;

    if (!key) return;

    const item = map.get(key);
    const quantita = Math.max(1, n(v.quantita || 1));
    const totale = n(v.prezzo_totale ?? v.totale ?? (n(v.prezzo_unitario || item.prezzo) * quantita));
    item.vendite += quantita;
    item.ricavo += totale;
  });

  let items = Array.from(map.values()).map(i => {
    if (!i.ricavo && i.vendite && i.prezzo) i.ricavo = i.vendite * i.prezzo;
    const ricavoUnitario = i.prezzo || (i.vendite ? i.ricavo / i.vendite : 0);
    const margineUnitario = Math.max(0, ricavoUnitario - i.costo);
    const margineTotale = margineUnitario * i.vendite;
    const foodCostPerc = ricavoUnitario > 0 ? (i.costo / ricavoUnitario) * 100 : 0;
    const marginePerc = ricavoUnitario > 0 ? 100 - foodCostPerc : 0;
    return {
      ...i,
      prezzo: ricavoUnitario,
      margineUnitario,
      margineTotale,
      foodCostPerc,
      marginePerc
    };
  });

  const maxVendite = Math.max(...items.map(i => i.vendite), 1);
  const margineMedio = avg(items.map(i => i.marginePerc).filter(v => v > 0)) || 65;

  items = items.map(i => {
    const popAlta = i.vendite >= Math.max(3, maxVendite * 0.35);
    const margineAlto = i.marginePerc >= margineMedio;
    let quadrante = "dog";
    if (popAlta && margineAlto) quadrante = "star";
    if (!popAlta && margineAlto) quadrante = "puzzle";
    if (popAlta && !margineAlto) quadrante = "plowhorse";
    return { ...i, quadrante };
  });

  return items.sort((a, b) => b.ricavo - a.ricavo);
}

function buildCategoryOptions() {
  const select = document.getElementById("mi-categoria");
  if (!select) return;
  const cats = Array.from(new Set(_items.map(i => i.categoria).filter(Boolean))).sort();
  select.innerHTML = `<option value="">Tutte le categorie</option>` + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  select.value = _categoria;
}

function applyFiltersAndRender() {
  _filtered = _items.filter(i => !_categoria || i.categoria === _categoria);
  renderAll();
}

function renderAll() {
  renderKpi();
  renderScore();
  renderTable();
  renderProiezione();
  renderMatrix();
  renderAi();
  renderIngredienti();
  renderSimulator();
}

function renderKpi() {
  const el = document.getElementById("mi-kpi");
  if (!el) return;

  const ricavi = sum(_filtered.map(i => i.ricavo));
  const margine = sum(_filtered.map(i => i.margineTotale));
  const foodCost = avgWeighted(_filtered, "foodCostPerc", "ricavo");
  const marginePerc = avgWeighted(_filtered, "marginePerc", "ricavo");
  const recuperabile = calcolaRecuperabile(_filtered);
  const counts = countQuadranti(_filtered);

  el.innerHTML = `
    <div class="mi-kpi-grid">
      ${kpi(euro(ricavi), "Ricavi menu", "#0E5A7A")}
      ${kpi(`${fmt(foodCost)}%`, "Food Cost medio", foodCost > 35 ? "#DC2626" : "#059669")}
      ${kpi(`${fmt(marginePerc)}%`, "Margine medio", "#7C3AED")}
      ${kpi(_filtered.length, "Piatti analizzati", "#374151")}
      ${kpi(counts.star, "⭐ Star", PIANO_QUADRANTI.star.colore)}
      ${kpi(counts.puzzle, "🧩 Puzzle", PIANO_QUADRANTI.puzzle.colore)}
      ${kpi(counts.plowhorse, "🐎 Plowhorse", PIANO_QUADRANTI.plowhorse.colore)}
      ${kpi(euro(recuperabile), "Margine recuperabile", "#d97706")}
    </div>
  `;
}

function renderScore() {
  const el = document.getElementById("mi-score");
  if (!el) return;

  const foodCost = avgWeighted(_filtered, "foodCostPerc", "ricavo");
  const margine = avgWeighted(_filtered, "marginePerc", "ricavo");
  const counts = countQuadranti(_filtered);
  const totale = Math.max(_filtered.length, 1);
  const scoreFood = clamp(Math.round((40 - foodCost) / 40 * 30), 0, 30);
  const scoreMargine = clamp(Math.round(margine / 80 * 30), 0, 30);
  const scoreRotazione = clamp(Math.round(((counts.star + counts.plowhorse) / totale) * 20), 0, 20);
  const scoreMenu = clamp(Math.round(((counts.star + counts.puzzle) / totale) * 20), 0, 20);
  const score = scoreFood + scoreMargine + scoreRotazione + scoreMenu;

  el.innerHTML = `
    <div class="mi-card" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
      <div>
        <div style="font-size:13px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Menu AI Score</div>
        <div style="font-size:13px;color:#64748b;margin-top:5px;">Valutazione sintetica basata su food cost, margine, rotazione e qualità del menu.</div>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:110px;height:110px;border-radius:50%;background:conic-gradient(#0E5A7A ${score}%, #e5e7eb 0);display:flex;align-items:center;justify-content:center;">
          <div style="width:82px;height:82px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;flex-direction:column;">
            <div style="font-size:26px;font-weight:900;color:#0E5A7A;">${score}</div>
            <div style="font-size:10px;color:#64748b;font-weight:800;">/100</div>
          </div>
        </div>
        <div style="font-size:12px;color:#64748b;line-height:1.8;min-width:160px;">
          Food cost: <b>${scoreFood}/30</b><br>
          Margine: <b>${scoreMargine}/30</b><br>
          Rotazione: <b>${scoreRotazione}/20</b><br>
          Mix menu: <b>${scoreMenu}/20</b>
        </div>
      </div>
    </div>
  `;
}

function renderTable() {
  const el = document.getElementById("mi-table");
  if (!el) return;

  if (!_filtered.length) {
    el.innerHTML = `
      <div class="mi-card" id="mi-table-card">
        <div style="text-align:center;padding:28px;color:#94a3b8;">
          Nessun piatto trovato. Collega prodotti/ricette e vendite per attivare l'analisi.
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="mi-card" id="mi-table-card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <div>
          <div style="font-size:15px;font-weight:900;color:#111827;">Analisi piatti</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Classificazione automatica Star, Puzzle, Plowhorse e Dog.</div>
        </div>
        <input id="mi-search" class="input" placeholder="Cerca piatto..." style="max-width:220px;" oninput="miSearchTable(this.value)">
      </div>
      <div class="mi-table-wrap">
        <table class="mi-table">
          <thead>
            <tr>
              <th>Piatto</th>
              <th>Vendite</th>
              <th>Food Cost</th>
              <th>Prezzo attuale</th>
              <th>Percepito dal cliente</th>
              <th>Prezzo consigliato</th>
              <th>Classe</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="mi-table-body">
            ${renderTableRows(_filtered)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  window.miSearchTable = function(q) {
    const query = String(q || "").toLowerCase().trim();
    const rows = _filtered.filter(i =>
      !query ||
      i.nome.toLowerCase().includes(query) ||
      i.categoria.toLowerCase().includes(query)
    );
    const body = document.getElementById("mi-table-body");
    if (body) body.innerHTML = renderTableRows(rows);
  };
}

function renderTableRows(rows) {
  return rows.map(i => {
    const q = PIANO_QUADRANTI[i.quadrante];
    const attuale = i.prezzoListino != null ? i.prezzoListino : i.prezzo;
    let percepito = `<span style="color:#94a3b8;">—</span>`;
    if (i.percezione != null && i.prezzoMedioCategoria != null) {
      const p = i.percezione;
      const lbl = p < 0.85 ? ["Economico", "#16a34a", "#dcfce7"] : p <= 1.05 ? ["Nella media", "#475569", "#f1f5f9"] : ["Premium", "#b45309", "#fef3c7"];
      percepito = `<span class="mi-badge" style="background:${lbl[2]};color:${lbl[1]};">${lbl[0]}</span>
        <div style="font-size:11px;color:#94a3b8;margin-top:3px;">media cat. ${euro(i.prezzoMedioCategoria)}</div>`;
    }
    let consigliato = `<span style="color:#94a3b8;">ok così ✓</span>`;
    if (i.prezzoConsigliato != null && i.prezzoConsigliato > attuale + 0.01) {
      const giorni = Math.max(1, i.giorniStorico || _giorniStorico || 1);
      const extraAnnuo = (i.prezzoConsigliato - attuale) * i.vendite / giorni * 365;
      const btn = i.pvIds.length ? `<button class="mi-btn-small" style="background:#dcfce7;color:#166534;margin-top:4px;" onclick="miApplicaPrezzo('${i.id}')">Applica a menù</button>` : "";
      consigliato = `<b style="color:#16a34a;font-size:14px;">${euro(i.prezzoConsigliato)}</b>
        <div style="font-size:11px;color:#16a34a;">+${euro(i.prezzoConsigliato - attuale)} a piatto</div>
        <div style="font-size:12px;font-weight:900;color:#065f46;background:#dcfce7;border-radius:8px;padding:2px 7px;display:inline-block;margin-top:3px;">📈 +${euro(extraAnnuo)}/anno</div>
        ${btn ? "<div>" + btn + "</div>" : ""}`;
    }
    return `
      <tr>
        <td>
          <div style="font-weight:900;color:#111827;">${esc(i.nome)}</div>
          <div style="font-size:11px;color:#94a3b8;">${esc(i.categoria || "")}${i.costoStimato ? " · costo stimato" : ""}</div>
        </td>
        <td><b>${fmt(i.vendite)}</b><div style="font-size:11px;color:#94a3b8;">${euro(i.ricavo)}</div></td>
        <td style="color:${i.foodCostPerc > 35 ? "#DC2626" : "#059669"};font-weight:900;">${fmt(i.foodCostPerc)}%</td>
        <td style="white-space:nowrap;">
          <b>${i.prezzoListino != null ? euro(i.prezzoListino) : `<span style="color:#d97706;">${euro(i.prezzo)}</span>`}</b>
          <div style="font-size:11px;color:#94a3b8;">${i.prezzoListino != null ? "listino" : "medio venduto (manca listino)"}</div>
        </td>
        <td>${percepito}</td>
        <td style="white-space:nowrap;">${consigliato}</td>
        <td><span class="mi-badge" style="background:${q.bg};color:${q.colore};">${q.icon} ${q.label}</span></td>
        <td><button class="mi-btn-small" onclick="miSimula('${i.id}')">Simula</button></td>
      </tr>
    `;
  }).join("");
}

function renderProiezione() {
  const el = document.getElementById("mi-proiezione");
  if (!el) return;

  const conProposta = _filtered.filter(i => {
    const attuale = i.prezzoListino != null ? i.prezzoListino : i.prezzo;
    return i.prezzoConsigliato != null && i.prezzoConsigliato > attuale + 0.01;
  });
  const giorni = Math.max(1, _giorniStorico || 1);

  if (!conProposta.length || !giorni) { el.innerHTML = ""; return; }

  // Extra per piatto = (consigliato - attuale) * vendite; annualizzato sui giorni di storico reale
  const extraStorico = conProposta.reduce((s, i) => {
    const attuale = i.prezzoListino != null ? i.prezzoListino : i.prezzo;
    return s + (i.prezzoConsigliato - attuale) * i.vendite;
  }, 0);
  const extraAnnuo = extraStorico / giorni * 365;
  const applicabili = conProposta.filter(i => i.pvIds?.length);

  el.innerHTML = `
    <div class="mi-card" style="background:linear-gradient(135deg,#065f46,#059669);border:none;color:white;">
      <div style="font-size:13px;font-weight:800;opacity:.85;letter-spacing:.5px;">📈 PROIEZIONE ANNUALE</div>
      <div style="font-size:34px;font-weight:900;margin:6px 0 2px;">+${euro(extraAnnuo)}<span style="font-size:16px;font-weight:800;opacity:.85;"> / anno</span></div>
      <div style="font-size:13px;opacity:.9;">di incasso in più applicando i ${conProposta.length} prezzi consigliati, a parità di vendite.</div>
      <div style="font-size:11px;opacity:.7;margin-top:6px;">Stima basata su ${giorni} giorni di vendite reali del tuo locale.</div>
      ${applicabili.length ? `<button onclick="miApplicaTutti()" style="margin-top:12px;background:white;color:#065f46;border:none;border-radius:12px;padding:10px 16px;font-weight:900;cursor:pointer;">Applica tutti a menù (${applicabili.length})</button>` : ""}
    </div>
  `;
}

function renderMatrix() {
  const el = document.getElementById("mi-matrix");
  const counts = countQuadranti(_filtered);

  el.innerHTML = `
    <div class="mi-card">
      <div style="font-size:15px;font-weight:900;color:#111827;margin-bottom:4px;">Matrice menu</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Clicca un quadrante per filtrare la tabella.</div>
      <div class="mi-matrix-grid">
        ${quad("plowhorse", counts.plowhorse)}
        ${quad("star", counts.star)}
        ${quad("dog", counts.dog)}
        ${quad("puzzle", counts.puzzle)}
      </div>
    </div>
  `;
}

function quad(key, count) {
  const q = PIANO_QUADRANTI[key];
  return `
    <div class="mi-q" onclick="miSelectQuadrante('${key}')" style="background:${q.bg};">
      <div style="font-size:24px;">${q.icon}</div>
      <div style="font-size:16px;font-weight:900;color:${q.colore};">${q.label}</div>
      <div style="font-size:22px;font-weight:900;color:#111827;margin-top:4px;">${count}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.35;">${q.desc}</div>
    </div>
  `;
}

function renderAi() {
  const el = document.getElementById("mi-ai");
  if (!el) return;

  const suggerimenti = buildSuggerimenti(_filtered);

  el.innerHTML = `
    <div class="mi-card">
      <div style="font-size:15px;font-weight:900;color:#111827;margin-bottom:4px;">🧠 Suggerimenti AI</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Regole operative automatiche. In futuro possono essere passate a Tony AI.</div>
      ${
        suggerimenti.length
          ? suggerimenti.slice(0, 8).map(s => `
            <div class="mi-ai-item">
              <div style="font-size:13px;font-weight:900;color:#111827;">${s.icon} ${esc(s.titolo)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:4px;line-height:1.45;">${esc(s.testo)}</div>
              ${s.valore ? `<div style="font-size:12px;font-weight:900;color:#059669;margin-top:6px;">${esc(s.valore)}</div>` : ""}
            </div>
          `).join("")
          : `<div style="font-size:13px;color:#94a3b8;text-align:center;padding:18px;">Nessun suggerimento disponibile con i dati attuali.</div>`
      }
    </div>
  `;
}

function renderIngredienti() {
  const el = document.getElementById("mi-ingredienti");
  if (!el) return;

  const critici = _filtered
    .filter(i => i.foodCostPerc > 35)
    .sort((a, b) => b.foodCostPerc - a.foodCostPerc)
    .slice(0, 5);

  el.innerHTML = `
    <div class="mi-card">
      <div style="font-size:15px;font-weight:900;color:#111827;margin-bottom:4px;">📦 Piatti con costo critico</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Da collegare progressivamente ad acquisti e ingredienti per analisi prezzi materie prime.</div>
      ${
        critici.length
          ? critici.map(i => `
            <div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #f1f5f9;">
              <div>
                <div style="font-size:13px;font-weight:900;color:#111827;">${esc(i.nome)}</div>
                <div style="font-size:11px;color:#64748b;">${esc(i.categoria)}</div>
              </div>
              <div style="font-size:13px;font-weight:900;color:#DC2626;">${fmt(i.foodCostPerc)}%</div>
            </div>
          `).join("")
          : `<div style="font-size:13px;color:#94a3b8;text-align:center;padding:16px;">Nessun food cost critico rilevato.</div>`
      }
    </div>
  `;
}

function renderSimulator() {
  const el = document.getElementById("mi-simulator");
  if (!el) return;

  const item = _items.find(i => String(i.id) === String(_simItemId)) || _filtered[0];

  if (!item) {
    el.innerHTML = "";
    return;
  }

  _simItemId = item.id;
  const min = Math.max(1, item.prezzo * 0.7);
  const max = Math.max(item.prezzo + 1, item.prezzo * 1.35);
  const step = 0.1;

  el.innerHTML = `
    <div class="mi-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <div>
          <div style="font-size:15px;font-weight:900;color:#111827;">📈 Simulatore prezzo</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Modifica il prezzo e vedi subito l'effetto su food cost e margine.</div>
        </div>
        <div style="font-size:12px;font-weight:900;color:#0E5A7A;">${esc(item.nome)}</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px;">
        <div style="background:#f8fafc;border-radius:12px;padding:12px;">
          <div style="font-size:11px;color:#64748b;font-weight:800;">Prezzo attuale</div>
          <div style="font-size:22px;font-weight:900;color:#111827;">${euro(item.prezzo)}</div>
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:12px;">
          <div style="font-size:11px;color:#64748b;font-weight:800;">Costo piatto</div>
          <div style="font-size:22px;font-weight:900;color:#DC2626;">${euro(item.costo)}</div>
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:12px;">
          <div style="font-size:11px;color:#64748b;font-weight:800;">Vendite periodo</div>
          <div style="font-size:22px;font-weight:900;color:#7C3AED;">${fmt(item.vendite)}</div>
        </div>
      </div>

      <label style="font-size:12px;color:#64748b;font-weight:900;">Nuovo prezzo</label>
      <input class="mi-range" type="range" min="${min.toFixed(1)}" max="${max.toFixed(1)}" step="${step}" value="${item.prezzo.toFixed(1)}" oninput="miUpdateSim(this.value)">
      <div id="mi-sim-output">${renderSimOutput(item, item.prezzo)}</div>
    </div>
  `;
}

function renderSimOutput(item, nuovoPrezzo) {
  const margineUnitario = Math.max(0, nuovoPrezzo - item.costo);
  const foodCost = nuovoPrezzo > 0 ? item.costo / nuovoPrezzo * 100 : 0;
  const marginePerc = nuovoPrezzo > 0 ? 100 - foodCost : 0;
  const deltaUnitario = margineUnitario - item.margineUnitario;
  const deltaPeriodo = deltaUnitario * item.vendite;
  const deltaAnno = deltaPeriodo * (365 / Number(_periodo || 30));

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:14px;">
      <div style="background:#eef2ff;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:#64748b;font-weight:800;">Nuovo prezzo</div>
        <div style="font-size:22px;font-weight:900;color:#4338ca;">${euro(nuovoPrezzo)}</div>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:#64748b;font-weight:800;">Food Cost</div>
        <div style="font-size:22px;font-weight:900;color:${foodCost > 35 ? "#DC2626" : "#059669"};">${fmt(foodCost)}%</div>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:#64748b;font-weight:800;">Margine</div>
        <div style="font-size:22px;font-weight:900;color:#059669;">${fmt(marginePerc)}%</div>
      </div>
      <div style="background:#d1fae5;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:#047857;font-weight:800;">Recupero annuo stimato</div>
        <div style="font-size:22px;font-weight:900;color:#059669;">${euro(deltaAnno)}</div>
      </div>
    </div>
  `;
}

function buildSuggerimenti(items) {
  const out = [];

  items.forEach(i => {
    if (i.quadrante === "plowhorse") {
      const nuovoPrezzo = i.prezzo + Math.max(0.5, i.prezzo * 0.05);
      const recupero = (nuovoPrezzo - i.prezzo) * i.vendite * (365 / Number(_periodo || 30));
      out.push({
        icon: "🐎",
        titolo: `${i.nome}: vende molto ma margina poco`,
        testo: `Valuta aumento prezzo a ${euro(nuovoPrezzo)} o revisione porzione/costo ingredienti.`,
        valore: `Recupero potenziale: ${euro(recupero)}/anno`
      });
    }

    if (i.quadrante === "puzzle") {
      out.push({
        icon: "🧩",
        titolo: `${i.nome}: alto margine, poca rotazione`,
        testo: "Migliora posizione nel menu, descrizione, foto o proposta del personale.",
        valore: "Obiettivo: aumentare vendite senza scontare."
      });
    }

    if (i.quadrante === "dog") {
      out.push({
        icon: "🐶",
        titolo: `${i.nome}: basso impatto sul menu`,
        testo: "Valuta rimozione, sostituzione o trasformazione in proposta stagionale.",
        valore: ""
      });
    }

    if (i.foodCostPerc > 40) {
      out.push({
        icon: "⚠️",
        titolo: `${i.nome}: food cost alto`,
        testo: `Food cost attuale ${fmt(i.foodCostPerc)}%. Controlla costo ingredienti, grammature e prezzo vendita.`,
        valore: ""
      });
    }
  });

  return out.sort((a, b) => (b.valore ? 1 : 0) - (a.valore ? 1 : 0));
}

function calcolaRecuperabile(items) {
  return items.reduce((s, i) => {
    if (i.quadrante !== "plowhorse" && i.foodCostPerc <= 35) return s;
    const incremento = Math.max(0.3, i.prezzo * 0.04);
    return s + incremento * i.vendite * (365 / Number(_periodo || 30));
  }, 0);
}

function countQuadranti(items) {
  return {
    star: items.filter(i => i.quadrante === "star").length,
    puzzle: items.filter(i => i.quadrante === "puzzle").length,
    plowhorse: items.filter(i => i.quadrante === "plowhorse").length,
    dog: items.filter(i => i.quadrante === "dog").length
  };
}

function kpi(v, l, c) {
  return `
    <div class="mi-kpi">
      <div class="mi-kpi-val" style="color:${c};">${v}</div>
      <div class="mi-kpi-lbl">${l}</div>
    </div>
  `;
}

function n(v) {
  const num = Number(String(v ?? 0).replace(",", "."));
  return Number.isFinite(num) ? num : 0;
}

function sum(arr) {
  return arr.reduce((s, v) => s + n(v), 0);
}

function avg(arr) {
  if (!arr.length) return 0;
  return sum(arr) / arr.length;
}

function avgWeighted(items, valueKey, weightKey) {
  const totalWeight = sum(items.map(i => i[weightKey]));
  if (!totalWeight) return avg(items.map(i => i[valueKey]).filter(Boolean));
  return items.reduce((s, i) => s + n(i[valueKey]) * n(i[weightKey]), 0) / totalWeight;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function euro(v) {
  return `€${Math.round(n(v)).toLocaleString("it-IT")}`;
}

function fmt(v) {
  const num = n(v);
  if (Math.abs(num) >= 1000) return Math.round(num).toLocaleString("it-IT");
  return num.toLocaleString("it-IT", { maximumFractionDigits: 1 });
}

async function renderSalute() {
  const el = document.getElementById("mi-salute");
  if (!el) return;
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { el.style.display = "none"; return; }

  if (_saluteSedi === null) {
    try {
      const { data } = await supabase.from("sedi").select("id,nome").eq("azienda_id", aziendaId).order("nome");
      _saluteSedi = data || [];
    } catch { _saluteSedi = []; }
  }

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <div style="font-size:15px;font-weight:900;color:#111827;">🩺 Salute dati</div>
      <select id="mi-salute-sede" class="input" style="width:auto;min-width:150px;" onchange="miSetSaluteSede(this.value)">
        <option value="">Tutte le sedi</option>
        ${_saluteSedi.map(s => `<option value="${esc(s.id)}" ${_saluteSede === s.id ? "selected" : ""}>${esc(s.nome)}</option>`).join("")}
      </select>
    </div>
    <div id="mi-salute-body" style="color:#94a3b8;">Caricamento…</div>`;

  const { data, error } = await supabase.rpc("get_salute_dati", { p_azienda: aziendaId, p_sede: _saluteSede || null });
  const body = document.getElementById("mi-salute-body");
  if (!body) return;
  if (error || !data) { body.innerHTML = `<span style="color:#dc2626;">Salute dati non disponibile</span>`; return; }
  body.innerHTML = renderSaluteCards(data);
}

function saluteBarra(ok, tot) {
  ok = Number(ok) || 0; tot = Number(tot) || 0;
  const perc = tot > 0 ? Math.round(ok / tot * 100) : 0;
  const col = perc >= 70 ? "#16a34a" : perc >= 35 ? "#d97706" : "#dc2626";
  return `<div style="background:#f1f5f9;border-radius:6px;height:8px;overflow:hidden;margin-top:4px;"><div style="width:${perc}%;height:100%;background:${col};"></div></div>
    <div style="font-size:11px;color:#64748b;margin-top:2px;">${ok} / ${tot} (${perc}%)</div>`;
}

function saluteCard(titolo, righe) {
  return `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff;">
    <div style="font-weight:800;font-size:13px;color:#111827;margin-bottom:8px;">${titolo}</div>${righe}</div>`;
}

function renderSaluteCards(d) {
  const r = d.ricette || {}, pv = d.prodotti_vendita || {}, me = d.menu_engineering || {}, c = d.contatti || {}, op = d.operativita || {};
  const meTot = (Number(me.sul_grafico) || 0) + (Number(me.senza_costo) || 0);
  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
      ${saluteCard("📖 Ricette", `
        <div style="font-size:12px;color:#475569;">Con distinta ingredienti</div>${saluteBarra(r.con_ingredienti, r.tot)}
        <div style="font-size:12px;color:#475569;margin-top:8px;">Con costo calcolato</div>${saluteBarra(r.con_costo, r.tot)}`)}
      ${saluteCard("💰 Food cost articoli", `
        <div style="font-size:12px;color:#475569;">Con food cost manuale</div>${saluteBarra(pv.con_food_cost, pv.con_ricetta || pv.tot)}
        <div style="font-size:11px;color:#94a3b8;margin-top:6px;">${Number(pv.con_ricetta) || 0} articoli legati a ricetta su ${Number(pv.tot) || 0}</div>`)}
      ${saluteCard("📊 Menu Engineering", `
        <div style="font-size:12px;color:#475569;">Piatti in quadrante (con costo)</div>${saluteBarra(me.sul_grafico, meTot)}
        <div style="font-size:11px;color:#94a3b8;margin-top:6px;">${Number(me.senza_costo) || 0} piatti ancora senza costo</div>`)}
      ${saluteCard("👥 Contatti", `
        <div style="font-size:12px;color:#475569;">Con email</div>${saluteBarra(c.con_email, c.tot)}
        <div style="font-size:12px;color:#475569;margin-top:8px;">Con telefono</div>${saluteBarra(c.con_telefono, c.tot)}
        <div style="font-size:12px;color:#475569;margin-top:8px;">Con data di nascita <span style="color:#94a3b8;">(compleanni)</span></div>${saluteBarra(c.con_nascita, c.tot)}`)}
      ${saluteCard("⚙️ Operatività" + (_saluteSede ? " (sede)" : ""), `
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;"><span style="color:#475569;">Vendite ultimi 30gg</span><b>${Number(op.vendite_30gg) || 0}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;"><span style="color:#475569;">Prenotazioni</span><b>${Number(op.prenotazioni) || 0}</b></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;"><span style="color:#475569;">Produzioni aperte</span><b>${Number(op.produzioni_aperte) || 0}</b></div>`)}
    </div>
    <div style="font-size:11px;color:#94a3b8;margin-top:10px;">Il filtro sede vale per Operatività (vendite, prenotazioni, produzioni). Ricette, food cost e contatti sono per azienda.</div>`;
}

if (typeof window !== "undefined") {
  window.miSetSaluteSede = function (v) { _saluteSede = v; renderSalute(); };
}


function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
