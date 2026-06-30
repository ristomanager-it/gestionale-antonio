import { supabase } from "../supabaseClient.js";

let _items = [];
let _filtered = [];
let _periodo = "30";
let _categoria = "";
let _simItemId = null;

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

        <div style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:16px;margin-top:16px;" class="mi-grid-main">
          <div>
            <div id="mi-table"></div>
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
}

async function loadData() {
  const loading = document.getElementById("mi-loading");
  const content = document.getElementById("mi-content");
  if (loading) loading.style.display = "block";
  if (content) content.style.display = "none";

  const aziendaId = window.state?.azienda?.id;
  const startIso = new Date(Date.now() - Number(_periodo || 30) * 86400000).toISOString();

  const [prodotti, ricette, vendite] = await Promise.all([
    fetchSafe("prodotti", "id,nome,descrizione,prezzo,prezzo_vendita,costo,costo_totale,food_cost,categoria,categoria_id,attivo,azienda_id", aziendaId),
    fetchSafe("ricette", "id,nome,descrizione,prezzo_vendita,costo_porzione,costo_totale,food_cost,categoria,categoria_id,azienda_id", aziendaId),
    fetchVenditeSafe(aziendaId, startIso)
  ]);

  _items = normalizeItems(prodotti, ricette, vendite);
  buildCategoryOptions();
  applyFiltersAndRender();

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
              <th>Categoria</th>
              <th>Vendite</th>
              <th>Ricavo</th>
              <th>Prezzo</th>
              <th>Food Cost</th>
              <th>Margine</th>
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
    return `
      <tr>
        <td>
          <div style="font-weight:900;color:#111827;">${esc(i.nome)}</div>
          <div style="font-size:11px;color:#94a3b8;">${i.tipo}</div>
        </td>
        <td>${esc(i.categoria || "—")}</td>
        <td><b>${fmt(i.vendite)}</b></td>
        <td><b>${euro(i.ricavo)}</b></td>
        <td>${euro(i.prezzo)}</td>
        <td style="color:${i.foodCostPerc > 35 ? "#DC2626" : "#059669"};font-weight:900;">${fmt(i.foodCostPerc)}%</td>
        <td>
          <b>${euro(i.margineTotale)}</b>
          <div style="font-size:11px;color:#64748b;">${fmt(i.marginePerc)}%</div>
        </td>
        <td><span class="mi-badge" style="background:${q.bg};color:${q.colore};">${q.icon} ${q.label}</span></td>
        <td><button class="mi-btn-small" onclick="miSimula('${i.id}')">Simula</button></td>
      </tr>
    `;
  }).join("");
}

function renderMatrix() {
  const el = document.getElementById("mi-matrix");
  if (!el) return;
  const counts = countQuadranti(_filtered);

  el.innerHTML = `
    <div class="mi-card">
      <div style="font-size:15px;font-weight:900;color:#111827;margin-bottom:4px;">Matrice menu</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Clicca un quadrante per filtrare la tabella.</div>
      <div class="mi-matrix-grid">
        ${quad("star", counts.star)}
        ${quad("puzzle", counts.puzzle)}
        ${quad("plowhorse", counts.plowhorse)}
        ${quad("dog", counts.dog)}
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

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
