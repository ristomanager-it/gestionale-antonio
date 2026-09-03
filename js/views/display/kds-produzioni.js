/* =========================================================
   RISTOFLOW KITCHEN — Schermo Produzioni (display da laboratorio)
   Lotti in corso con avanzamento fasi, timer, ritardi. Kiosk. Sola lettura.
   Separato dallo Schermo Comande e dal monitor gestionale.
   ========================================================= */

let lottiCache = [];
let durataByFase = {};
let clockTimer = null;
// Due modi di guardare il laboratorio: "lotti" li mette tutti in fila per
// anzianita', "colonne" li smista per quanto sono avanti con le fasi.
let vistaProduzioni = 'lotti';

const COLONNE_PROD = [
  { key: 'da_avviare',    label: 'DA AVVIARE',    colore: '#38bdf8' },
  { key: 'in_lavorazione', label: 'IN LAVORAZIONE', colore: '#f59e0b' },
  { key: 'completa',      label: 'PRONTA DA CHIUDERE', colore: '#22c55e' },
];

function colonnaLotto(l) {
  const tot = l.fasi.length;
  const firmate = l.fasi.filter(f => f.firmato_il).length;
  if (tot && firmate >= tot) return 'completa';
  if (firmate > 0) return 'in_lavorazione';
  return 'da_avviare';
}
let refreshTimer = null;

function supa() { return window.supabaseClient; }

// Il bottone dice il gesto da fare, non il nome del passaggio: chi sta al
// banco legge "Abbatti", non "Abbattimento in positivo". Se la fase non e'
// in elenco si mostra il suo nome cosi' com'e', senza inventare verbi.
const VERBI_FASE = [
  { chiave: "confezion", verbo: "Confeziona" },
  { chiave: "sottovuoto", verbo: "Confeziona" },
  { chiave: "invasett", verbo: "Invasa" },
  { chiave: "cottura", verbo: "Cuoci" },
  { chiave: "cuoci", verbo: "Cuoci" },
  { chiave: "pastorizz", verbo: "Pastorizza" },
  { chiave: "abbatt", verbo: "Abbatti" },
  { chiave: "raffredd", verbo: "Raffredda" },
  { chiave: "porzionatura", verbo: "Porziona" },
  { chiave: "taglio", verbo: "Porziona" },
  { chiave: "stoccaggio", verbo: "Stocca" },
  { chiave: "riposo", verbo: "Metti a riposo" },
  { chiave: "condimento", verbo: "Condisci" },
  { chiave: "legatura", verbo: "Lega" },
  { chiave: "marinat", verbo: "Marina" },
  { chiave: "etichett", verbo: "Etichetta" },
  { chiave: "pesat", verbo: "Pesa" },
];

function verboFase(nome) {
  const t = String(nome || "").toLowerCase();
  for (const v of VERBI_FASE) { if (t.indexOf(v.chiave) >= 0) return v.verbo; }
  return String(nome || "Continua");
}

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
          <div style="display:flex;gap:4px;background:#1e293b;border-radius:10px;padding:3px;">
            <button data-vista-prod="lotti" style="padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;background:#0E5A7A;color:white;">Lotti</button>
            <button data-vista-prod="colonne" style="padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;background:transparent;color:#94a3b8;">Colonne</button>
          </div>
          <div id="kdsp-clock" style="font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;"></div>
          <button id="kdsp-full" style="background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px 12px;cursor:pointer;">⛶ Kiosk</button>
        </div>
      </div>
      <div id="kdsp-board" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;align-items:start;">
        <div style="color:#64748b;">Caricamento produzioni...</div>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-vista-prod]").forEach((btn) => {
    btn.addEventListener("click", () => {
      vistaProduzioni = btn.dataset.vistaProd;
      container.querySelectorAll("[data-vista-prod]").forEach((b) => {
        const attivo = b.dataset.vistaProd === vistaProduzioni;
        b.style.background = attivo ? "#0E5A7A" : "transparent";
        b.style.color = attivo ? "white" : "#94a3b8";
      });
      renderBoard();
    });
  });

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
    .select("id, lotto_uuid, ricetta_id, created_at, luogo, quantita_output, unita_misura, stato, ricette(nome), dipendenti!produzione_lotti_operatore_id_fkey(nome)")
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

  // Lo schermo era nato di sola lettura, ma chi sta al banco tocca la scheda
  // per aprire la lavorazione e chiude il lotto da qui. Un solo ascoltatore
  // sul contenitore: le schede vengono ridisegnate ogni 15 secondi.
  if (!board.dataset.kdsAzioni) {
    board.dataset.kdsAzioni = "1";
    board.addEventListener("click", onBoardClick);
  }

  const inRitardo = lottiCache.filter((l) => (Date.now() - new Date(l.created_at).getTime()) / 3600000 >= 24).length;
  const kpi = document.getElementById("kdsp-kpi");
  if (kpi) kpi.innerHTML = `${lottiCache.length} in corso · <span style="color:${inRitardo ? "#f87171" : "#94a3b8"}">${inRitardo} da oltre 24h</span>`;

  if (!lottiCache.length) {
    board.innerHTML = `<div style="color:#475569;font-size:15px;padding:20px;">Nessuna produzione aperta.</div>`;
    return;
  }

  if (vistaProduzioni === 'colonne') {
    board.style.gridTemplateColumns = "repeat(auto-fit,minmax(260px,1fr))";
    board.innerHTML = COLONNE_PROD.map((col) => {
      const dentro = lottiCache.filter((l) => colonnaLotto(l) === col.key);
      return '<div style="min-width:0;">' +
        '<div style="position:sticky;top:0;background:#0f172a;padding:8px 6px;margin-bottom:10px;border-bottom:3px solid ' + col.colore + ';display:flex;justify-content:space-between;align-items:center;">' +
          '<span style="font-size:13px;font-weight:800;letter-spacing:.5px;color:' + col.colore + ';">' + col.label + '</span>' +
          '<span style="font-size:12px;font-weight:800;color:#0f172a;background:' + col.colore + ';border-radius:10px;padding:1px 9px;">' + dentro.length + '</span>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:12px;">' +
          (dentro.length ? dentro.map((l) => cardHtml(l)).join("") : '<div style="color:#475569;text-align:center;padding:20px;font-size:13px;">—</div>') +
        '</div></div>';
    }).join("");
    return;
  }

  board.style.gridTemplateColumns = "repeat(auto-fill,minmax(300px,1fr))";
  board.innerHTML = lottiCache.map((l) => cardHtml(l)).join("");
}

// Fase in corso = la prima non ancora firmata. Il tempo si conta dalla firma
// della fase precedente, non dall'apertura del lotto.
// oltre = ha superato il tempo previsto. ritardo = lo ha superato di meta'.
// Serve anche al contatore in alto, per questo sta fuori da cardHtml.
function faseCorrente(l) {
  let prevTs = new Date(l.created_at).getTime();
  for (let i = 0; i < l.fasi.length; i++) {
    const f = l.fasi[i];
    if (f.firmato_il) { prevTs = new Date(f.firmato_il).getTime(); continue; }
    const elapsed = Math.floor((Date.now() - prevTs) / 60000);
    const prevista = durataByFase[String(f.fase_id)] || 0;
    return {
      nome: f.fase_nome || ("Fase " + f.fase_ordine),
      elapsed: elapsed,
      prevista: prevista,
      oltre: prevista > 0 && elapsed > prevista,
      ritardo: prevista > 0 && elapsed > prevista * 1.5,
      sforo: prevista > 0 ? Math.max(0, elapsed - prevista) : 0,
    };
  }
  return null;
}

function cardHtml(l) {
  const since = new Date(l.created_at).getTime();
  const nome = l.ricette?.nome || "Ricetta";
  const tot = l.fasi.length;
  const firmate = l.fasi.filter((f) => f.firmato_il).length;
  const pct = tot ? Math.round((firmate / tot) * 100) : 0;

  const corrente = faseCorrente(l);

  const op = l.dipendenti?.nome || "";
  const qta = l.quantita_output ? (l.quantita_output + " " + (l.unita_misura || "")) : "";

  return `
    <div data-vai="${l.lotto_uuid}" style="background:#1e293b;border-radius:12px;padding:14px;cursor:pointer;border-left:4px solid ${corrente && corrente.ritardo ? "#f87171" : (corrente && corrente.oltre ? "#fbbf24" : "#16a34a")};">
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
          <button style="margin-top:10px;width:100%;background:#16a34a;color:white;border:none;border-radius:10px;padding:10px 16px;font-weight:700;font-size:14px;cursor:pointer;">▶ ${escapeHtml(verboFase(corrente.nome))}</button>
        </div>` : `<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <span style="font-size:13px;color:#4ade80;">✓ Tutte le fasi firmate</span>
          <button data-chiudi="${l.id}" style="background:#16a34a;color:white;border:none;border-radius:10px;padding:8px 16px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;">✔ Chiudi</button>
        </div>`}
    </div>`;
}

function onBoardClick(e) {
  const btn = e.target.closest("[data-chiudi]");
  if (btn) { e.stopPropagation(); chiudiLottoKds(btn.dataset.chiudi); return; }
  const card = e.target.closest("[data-vai]");
  if (card && card.dataset.vai) window.location.hash = "#/preparazioni?lotto=" + card.dataset.vai;
}

// Stessa chiusura di produzioni-aperte: stato "firmato" e ora della firma.
// Il peso finale si chiede PRIMA di chiudere: e' quello che fa scattare il
// carico a magazzino. Senza, il lotto si chiudeva lo stesso e la giacenza
// restava a zero senza nessun errore a schermo.
async function chiudiLottoKds(id) {
  if (!id) return;
  const lotto = lottiCache.find((x) => String(x.id) === String(id));
  const um = (lotto && lotto.unita_misura) || "kg";
  const nome = (lotto && lotto.ricette && lotto.ricette.nome) || "questa produzione";
  const digitato = prompt("Peso finale di " + nome + " (" + um + "):",
    lotto && Number(lotto.quantita_output) > 0 ? String(lotto.quantita_output) : "");
  if (digitato === null) return;
  const peso = Number(String(digitato).replace(",", "."));
  if (!Number.isFinite(peso) || peso <= 0) {
    alert("Serve il peso finale: senza non si carica il magazzino.");
    return;
  }
  const { error } = await supa()
    .from("produzione_lotti")
    .update({ quantita_output: peso, stato: "firmato", firmato_at: new Date().toISOString() })
    .eq("id", id);
  if (error) { alert("Errore chiusura: " + error.message); return; }
  await carica(window.state?.sedeAttiva?.id);
}

function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
