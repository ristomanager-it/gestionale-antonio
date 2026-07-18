/* =========================================================
   RISTOFLOW KITCHEN — Schermo Produzioni (display da laboratorio)
   Lotti in corso con avanzamento fasi, timer, ritardi. Kiosk. Sola lettura.
   Separato dallo Schermo Comande e dal monitor gestionale.
   ========================================================= */

let lottiCache = [];
let durataByFase = {};
let clockTimer = null;
let refreshTimer = null;

function supa() { return window.supabaseClient; }

export async function render(container) {
  const sedeId = window.state?.sedeAttiva?.id;

  container.innerHTML = `
    <div id="kdsp-root" style="background:#0f172a;color:#e2e8f0;min-height:100vh;margin:-16px;padding:14px 16px;font-family:Arial,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="font-size:20px;font-weight:800;">🏭 Ristoflow Kitchen · Produzioni</div>
          <div id="kdsp-kpi" style="font-size:13px;color:#94a3b8;"></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div id="kdsp-clock" style="font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;"></div>
          <button id="kdsp-full" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px 12px;cursor:pointer;">⛶ Kiosk</button>
        </div>
      </div>
      <div id="kdsp-board" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;align-items:start;">
        <div style="color:#64748b;">Caricamento produzioni...</div>
      </div>
    </div>
  `;

  document.getElementById("kdsp-full")?.addEventListener("click", () => {
    const el = document.getElementById("kdsp-root");
    if (!document.fullscreenElement) el?.requestFullscreen?.(); else document.exitFullscreen?.();
  });

  tick();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(tick, 1000);

  await carica(sedeId);
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => carica(sedeId), 15000);
}

function tick() {
  const c = document.getElementById("kdsp-clock");
  if (c) c.textContent = new Date().toLocaleTimeString("it-IT");
  document.querySelectorAll("[data-since]").forEach((el) => {
    const since = Number(el.getAttribute("data-since"));
    const min = Math.floor((Date.now() - since) / 60000);
    el.textContent = min < 60 ? min + "′" : Math.floor(min / 60) + "h " + (min % 60) + "′";
    el.style.color = min >= 24 * 60 ? "#f87171" : (min >= 8 * 60 ? "#fbbf24" : "#4ade80");
  });
}

async function carica(sedeId) {
  const aziendaId = window.state.azienda.id;
  let q = supa().from("produzione_lotti")
    .select("id, lotto_uuid, ricetta_id, created_at, luogo, quantita_output, unita_misura, stato, ricette(nome), dipendenti(nome)")
    .eq("azienda_id", aziendaId).eq("stato", "aperta").order("created_at");
  if (sedeId) q = q.eq("sede_uuid", sedeId);
  const { data: lotti } = await q;

  if (!lotti || !lotti.length) { lottiCache = []; renderBoard(); return; }

  const uuids = lotti.map((l) => l.lotto_uuid).filter(Boolean);
  const ricetteIds = [...new Set(lotti.map((l) => l.ricetta_id).filter(Boolean))];

  const [{ data: haccp }, { data: fasiMeta }] = await Promise.all([
    supa().from("produzione_log_haccp").select("lotto_id, fase_id, fase_ordine, fase_nome, firmato_il").in("lotto_id", uuids),
    supa().from("ricette_preparazione_fasi").select("id, durata_min").in("ricetta_id", ricetteIds),
  ]);
  durataByFase = {};
  (fasiMeta || []).forEach((f) => { durataByFase[String(f.id)] = Number(f.durata_min) || 0; });

  const fasiByLotto = {};
  (haccp || []).forEach((h) => { (fasiByLotto[h.lotto_id] = fasiByLotto[h.lotto_id] || []).push(h); });

  lottiCache = lotti.map((l) => ({ ...l, fasi: (fasiByLotto[l.lotto_uuid] || []).slice().sort((a, b) => (a.fase_ordine || 0) - (b.fase_ordine || 0)) }));
  renderBoard();
}

function renderBoard() {
  const board = document.getElementById("kdsp-board");
  if (!board) return;

  const inRitardo = lottiCache.filter((l) => (Date.now() - new Date(l.created_at).getTime()) / 3600000 >= 24).length;
  const kpi = document.getElementById("kdsp-kpi");
  if (kpi) kpi.innerHTML = `${lottiCache.length} in corso · <span style="color:${inRitardo ? "#f87171" : "#94a3b8"}">${inRitardo} da oltre 24h</span>`;

  if (!lottiCache.length) {
    board.innerHTML = `<div style="color:#475569;font-size:15px;padding:20px;">Nessuna produzione aperta.</div>`;
    return;
  }

  board.innerHTML = lottiCache.map((l) => cardHtml(l)).join("");
}

function cardHtml(l) {
  const since = new Date(l.created_at).getTime();
  const nome = l.ricette?.nome || "Ricetta";
  const tot = l.fasi.length;
  const firmate = l.fasi.filter((f) => f.firmato_il).length;
  const pct = tot ? Math.round((firmate / tot) * 100) : 0;

  // fase in corso = prima non firmata
  let prevTs = since;
  let corrente = null;
  for (let i = 0; i < l.fasi.length; i++) {
    const f = l.fasi[i];
    if (f.firmato_il) { prevTs = new Date(f.firmato_il).getTime(); continue; }
    const elapsed = Math.floor((Date.now() - prevTs) / 60000);
    const prevista = durataByFase[String(f.fase_id)] || 0;
    const ritardo = prevista > 0 && elapsed > prevista * 1.5;
    corrente = { nome: f.fase_nome || ("Fase " + f.fase_ordine), elapsed, prevista, ritardo };
    break;
  }

  const op = l.dipendenti?.nome || "";
  const qta = l.quantita_output ? (l.quantita_output + " " + (l.unita_misura || "")) : "";

  return `
    <div style="background:#1e293b;border-radius:12px;padding:14px;border-left:4px solid ${corrente && corrente.ritardo ? "#f87171" : "#16a34a"};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
        <div>
          <div style="font-weight:800;font-size:16px;">${escapeHtml(nome)}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${l.luogo ? "📍 " + escapeHtml(l.luogo) : ""}${qta ? " · " + escapeHtml(qta) : ""}${op ? " · " + escapeHtml(op) : ""}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;" data-since="${since}">0′</div>
          <div style="font-size:10px;color:#64748b;">aperta</div>
        </div>
      </div>

      <div style="background:#0f172a;border-radius:8px;height:8px;overflow:hidden;margin:6px 0;">
        <div style="background:#16a34a;height:100%;width:${pct}%;"></div>
      </div>
      <div style="font-size:12px;color:#94a3b8;">Fasi firmate: <b style="color:#e2e8f0;">${firmate}/${tot}</b></div>

      ${corrente ? `
        <div style="margin-top:8px;padding:8px;background:${corrente.ritardo ? "#7f1d1d" : "#0f172a"};border-radius:8px;">
          <div style="font-size:11px;color:${corrente.ritardo ? "#fecaca" : "#94a3b8"};">In lavorazione${corrente.ritardo ? " · IN RITARDO ⚠" : ""}</div>
          <div style="font-size:14px;font-weight:700;">${escapeHtml(corrente.nome)}</div>
          <div style="font-size:12px;color:${corrente.ritardo ? "#fecaca" : "#cbd5e1"};">${corrente.elapsed}′${corrente.prevista ? " / ~" + corrente.prevista + "′ previsti" : ""}</div>
        </div>` : `<div style="margin-top:8px;font-size:13px;color:#4ade80;">✓ Tutte le fasi firmate — pronta da chiudere</div>`}
    </div>`;
}

function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
