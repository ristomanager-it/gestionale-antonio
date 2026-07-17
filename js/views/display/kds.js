/* =========================================================
   RISTOFLOW KITCHEN — KDS (Kitchen Display System)
   Fase 1: Schermo Comande Kanban (In attesa / In preparazione / Pronto / Consegnato)
   - card per ordine con piatti, avanzamento per-piatto, timer colorato
   - auto-refresh, kiosk (fullscreen)
   ========================================================= */

const COLONNE = [
  { key: "in_attesa", label: "IN ATTESA", col: "#64748b" },
  { key: "in_preparazione", label: "IN PREPARAZIONE", col: "#d97706" },
  { key: "pronto", label: "PRONTO", col: "#16a34a" },
  { key: "consegnato", label: "CONSEGNATO", col: "#0e7490" },
];
const NEXT = { in_attesa: "in_preparazione", in_preparazione: "pronto", pronto: "consegnato" };
const AZIONE = { in_attesa: "▶ Inizia", in_preparazione: "✓ Pronto", pronto: "🍽 Consegna" };

let comandeCache = [];
let tickTimer = null;
let refreshTimer = null;

function supa() { return window.supabaseClient; }

export async function render(container) {
  const sedeId = window.state?.sedeAttiva?.id;

  container.innerHTML = `
    <div id="kds-root" style="background:#0f172a;color:#e2e8f0;min-height:100vh;margin:-16px;padding:14px 16px;font-family:Arial,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="font-size:20px;font-weight:800;">🍳 Ristoflow Kitchen</div>
          <div id="kds-kpi" style="font-size:13px;color:#94a3b8;"></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="kds-clock" style="font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;"></div>
          <button id="kds-full" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px 12px;cursor:pointer;">⛶ Kiosk</button>
        </div>
      </div>
      <div id="kds-board" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:start;">
        <div style="color:#64748b;">Caricamento comande...</div>
      </div>
    </div>
  `;

  document.getElementById("kds-full")?.addEventListener("click", () => {
    const el = document.getElementById("kds-root");
    if (!document.fullscreenElement) el?.requestFullscreen?.(); else document.exitFullscreen?.();
  });

  tickClock();
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(tickClock, 1000);

  await carica(sedeId);
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => carica(sedeId), 10000);
}

function tickClock() {
  const c = document.getElementById("kds-clock");
  if (c) c.textContent = new Date().toLocaleTimeString("it-IT");
  // aggiorna i timer trascorsi senza ricaricare
  document.querySelectorAll("[data-since]").forEach(el => {
    const since = Number(el.getAttribute("data-since"));
    const min = Math.floor((Date.now() - since) / 60000);
    el.textContent = min + "′";
    el.style.color = min >= 20 ? "#f87171" : (min >= 10 ? "#fbbf24" : "#4ade80");
  });
}

async function carica(sedeId) {
  const aziendaId = window.state.azienda.id;
  // comande aperte (oggi)
  let cq = supa().from("comande")
    .select("id, tavolo_id, cliente_nome, created_at, stato, sede_id")
    .eq("azienda_id", aziendaId).in("stato", ["aperta", "in_corso"]).order("created_at");
  if (sedeId) cq = cq.eq("sede_id", sedeId);
  const { data: comande } = await cq;
  const ids = (comande || []).map(c => c.id);
  if (!ids.length) { comandeCache = []; renderBoard(); return; }

  const { data: righe } = await supa().from("comanda_righe")
    .select("id, comanda_id, prodotto_vendita_id, nome_snapshot, quantita, note, stato, portata, started_at, completed_at, inviato_cucina_at, created_at")
    .in("comanda_id", ids).order("portata").order("created_at");

  // allergeni per prodotto venduto (critico in cucina)
  const pvIds = [...new Set((righe || []).map(r => r.prodotto_vendita_id).filter(Boolean))];
  const allergByPv = {};
  if (pvIds.length) {
    const { data: pv } = await supa().from("prodotti_vendita").select("id, allergeni").in("id", pvIds);
    (pv || []).forEach(p => { if (Array.isArray(p.allergeni) && p.allergeni.length) allergByPv[String(p.id)] = p.allergeni; });
  }
  (righe || []).forEach(r => { r._allergeni = allergByPv[String(r.prodotto_vendita_id)] || []; });

  const righeByComanda = {};
  (righe || []).forEach(r => { (righeByComanda[r.comanda_id] = righeByComanda[r.comanda_id] || []).push(r); });

  comandeCache = (comande || []).map(c => ({ ...c, righe: righeByComanda[c.id] || [] }))
    .filter(c => c.righe.length); // solo comande con piatti da fare
  renderBoard();
}

function colonnaComanda(righe) {
  const stati = righe.map(r => r.stato || "in_attesa");
  if (stati.every(s => s === "consegnato")) return "consegnato";
  if (stati.every(s => s === "pronto" || s === "consegnato")) return "pronto";
  if (stati.some(s => s === "in_preparazione")) return "in_preparazione";
  if (stati.some(s => s === "pronto")) return "in_preparazione";
  return "in_attesa";
}

function renderBoard() {
  const board = document.getElementById("kds-board");
  if (!board) return;

  const perCol = { in_attesa: [], in_preparazione: [], pronto: [], consegnato: [] };
  comandeCache.forEach(c => { perCol[colonnaComanda(c.righe)].push(c); });

  // KPI
  const aperte = comandeCache.filter(c => colonnaComanda(c.righe) !== "consegnato").length;
  const ritardi = comandeCache.filter(c => (Date.now() - new Date(c.created_at).getTime()) / 60000 >= 20 && colonnaComanda(c.righe) !== "consegnato").length;
  const kpi = document.getElementById("kds-kpi");
  if (kpi) kpi.innerHTML = `${aperte} aperte · <span style="color:${ritardi ? "#f87171" : "#94a3b8"}">${ritardi} in ritardo</span>`;

  board.innerHTML = COLONNE.map(col => {
    const cards = perCol[col.key].map(c => cardHtml(c)).join("") || `<div style="color:#475569;font-size:13px;padding:8px;">—</div>`;
    return `
      <div style="background:#111827;border-radius:12px;padding:10px;min-height:120px;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid ${col.col};padding-bottom:6px;margin-bottom:8px;">
          <div style="font-weight:800;font-size:13px;letter-spacing:.5px;color:${col.col};">${col.label}</div>
          <div style="background:${col.col};color:white;border-radius:10px;font-size:12px;font-weight:700;padding:1px 8px;">${perCol[col.key].length}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">${cards}</div>
      </div>`;
  }).join("");

  // bind azioni piatto
  board.querySelectorAll("[data-riga]").forEach(btn => btn.addEventListener("click", () => avanzaRiga(btn.dataset.riga, btn.dataset.stato)));
  board.querySelectorAll("[data-comanda-consegna]").forEach(btn => btn.addEventListener("click", () => consegnaComanda(btn.dataset.comandaConsegna)));
}

function cardHtml(c) {
  const since = new Date(c.created_at).getTime();
  const tavolo = c.tavolo_id ? ("Tav. " + c.tavolo_id) : "Asporto";
  const colonna = colonnaComanda(c.righe);
  const righeHtml = c.righe.map(r => {
    const st = r.stato || "in_attesa";
    const done = st === "consegnato" || st === "pronto";
    const az = AZIONE[st];
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #1f2937;">
        <div style="flex:1;${done ? "opacity:.6;" : ""}">
          <div style="font-size:14px;font-weight:600;">${r.quantita > 1 ? r.quantita + "× " : ""}${escapeHtml(r.nome_snapshot || "Piatto")}</div>
          ${(r._allergeni && r._allergeni.length) ? `<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:3px;">${r._allergeni.map(a => `<span style="background:#7f1d1d;color:#fecaca;border-radius:4px;font-size:10px;font-weight:700;padding:1px 6px;text-transform:uppercase;">⚠ ${escapeHtml(a)}</span>`).join("")}</div>` : ""}
          ${r.note ? `<div style="font-size:11px;color:#fbbf24;">✎ ${escapeHtml(r.note)}</div>` : ""}
        </div>
        ${az ? `<button data-riga="${r.id}" data-stato="${st}" style="background:${st === "in_attesa" ? "#334155" : (st === "in_preparazione" ? "#16a34a" : "#0e7490")};color:white;border:none;border-radius:7px;padding:5px 9px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">${az}</button>` : `<span style="color:#4ade80;font-size:12px;">✓</span>`}
      </div>`;
  }).join("");

  return `
    <div style="background:#1e293b;border-radius:10px;padding:10px;border-left:4px solid ${COLONNE.find(x => x.key === colonna).col};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-weight:800;font-size:15px;">${escapeHtml(tavolo)}${c.cliente_nome ? ` <span style="font-weight:400;color:#94a3b8;font-size:12px;">${escapeHtml(c.cliente_nome)}</span>` : ""}</div>
        <div style="font-size:15px;font-weight:800;font-variant-numeric:tabular-nums;" data-since="${since}">0′</div>
      </div>
      ${righeHtml}
      ${colonna === "pronto" ? `<button data-comanda-consegna="${c.id}" style="margin-top:8px;width:100%;background:#0e7490;color:white;border:none;border-radius:8px;padding:7px;font-weight:700;cursor:pointer;">🍽 Consegna tutto</button>` : ""}
    </div>`;
}

async function avanzaRiga(rigaId, statoAttuale) {
  const nuovo = NEXT[statoAttuale];
  if (!nuovo) return;
  const patch = { stato: nuovo, updated_at: new Date().toISOString() };
  if (nuovo === "in_preparazione") patch.started_at = new Date().toISOString();
  if (nuovo === "consegnato") patch.completed_at = new Date().toISOString();
  // aggiorna cache locale subito (reattività)
  comandeCache.forEach(c => c.righe.forEach(r => { if (String(r.id) === String(rigaId)) r.stato = nuovo; }));
  renderBoard();
  try { await supa().from("comanda_righe").update(patch).eq("id", rigaId); } catch (e) { console.error(e); }
}

async function consegnaComanda(comandaId) {
  const now = new Date().toISOString();
  comandeCache.forEach(c => { if (String(c.id) === String(comandaId)) c.righe.forEach(r => r.stato = "consegnato"); });
  renderBoard();
  try { await supa().from("comanda_righe").update({ stato: "consegnato", completed_at: now, updated_at: now }).eq("comanda_id", comandaId).neq("stato", "consegnato"); } catch (e) { console.error(e); }
}

function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
