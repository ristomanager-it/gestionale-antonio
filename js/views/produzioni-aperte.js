/* =========================================================
   PRODUZIONI APERTE — monitor + completamento fasi (centro cottura)
   - Apri produzione (stato 'aperta') + crea le fasi da ricetta
   - L'operatore completa/firma ogni fase col proprio PIN (salvato subito)
   - Chiudi produzione (stato 'firmato')
   - Auto-refresh + contatore (visibile anche a manager/admin)
   ========================================================= */

let ricetteCache = [];
let dipendentiCache = [];
let refreshTimer = null;
let fasiByLotto = {};   // lotto_uuid -> [righe haccp]
let modalLotto = null;  // lotto attualmente aperto nel modal

export async function render(app) {
  const azienda = window.state?.azienda;
  const aziendaId = azienda?.id;
  const sedeNome = window.state?.sedeAttiva?.nome || "";

  app.innerHTML = `
    <div class="page" style="max-width:1100px;margin:0 auto;padding:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
        <div>
          <h1 style="margin:0;font-size:22px;">🏭 Produzioni aperte</h1>
          <div style="color:#64748b;font-size:13px;">${escapeHtml(sedeNome || azienda?.nome || "")} — cosa è in lavorazione e non ancora chiuso</div>
        </div>
        <div id="pa-open-count" style="font-size:14px;font-weight:700;color:#0E5A7A;"></div>
      </div>

      <div class="card" style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:20px;">
        <div style="font-weight:700;margin-bottom:12px;">➕ Apri una produzione</div>
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;">
          <div>
            <label style="font-size:12px;color:#64748b;">Ricetta / preparazione</label>
            <input id="pa-ricetta" class="input" list="pa-ricette-list" placeholder="Cerca ricetta..." autocomplete="off" style="width:100%;box-sizing:border-box;">
            <datalist id="pa-ricette-list"></datalist>
          </div>
          <div>
            <label style="font-size:12px;color:#64748b;">Quantità (kg, opz.)</label>
            <input id="pa-qta" class="input" type="number" step="0.001" min="0" placeholder="Es: 15" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:12px;color:#64748b;">PIN operatore (opz.)</label>
            <input id="pa-pin" class="input" type="password" inputmode="numeric" placeholder="PIN" style="width:100%;box-sizing:border-box;">
          </div>
        </div>
        <div style="margin-top:10px;">
          <label style="font-size:12px;color:#64748b;">Note / destinatario (opz.)</label>
          <input id="pa-note" class="input" placeholder="Es: Battesimo Lucia" style="width:100%;box-sizing:border-box;">
        </div>
        <div id="pa-msg" style="font-size:13px;margin-top:8px;"></div>
        <div style="margin-top:12px;">
          <button id="pa-apri" style="background:#16a34a;color:white;border:none;border-radius:10px;padding:10px 20px;font-weight:600;cursor:pointer;">🟢 Apri produzione</button>
        </div>
      </div>

      <div id="pa-lista"><div style="color:#64748b;">Caricamento...</div></div>
    </div>

    <div id="pa-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:1000;padding:20px;overflow:auto;">
      <div style="max-width:720px;margin:20px auto;background:white;border-radius:16px;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div id="pa-modal-title" style="font-size:18px;font-weight:800;"></div>
          <button id="pa-modal-close" style="background:#e2e8f0;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;">✕ Chiudi</button>
        </div>
        <div id="pa-modal-body"></div>
      </div>
    </div>
  `;

  await Promise.all([loadRicette(aziendaId), loadDipendenti(aziendaId)]);
  const dl = document.getElementById("pa-ricette-list");
  if (dl) dl.innerHTML = ricetteCache.map(r => `<option value="${escapeAttr(r.nome)}">`).join("");

  document.getElementById("pa-apri")?.addEventListener("click", apriProduzione);
  document.getElementById("pa-modal-close")?.addEventListener("click", chiudiModal);
  document.getElementById("pa-modal")?.addEventListener("click", (e) => { if (e.target.id === "pa-modal") chiudiModal(); });

  await refreshLista();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { if (!modalLotto) refreshLista(); }, 30000);
}

async function loadRicette(aziendaId) {
  const { data } = await window.supabaseClient
    .from("ricette").select("id, nome, shelf_life_giorni").eq("azienda_id", aziendaId).order("nome");
  ricetteCache = data || [];
}
async function loadDipendenti(aziendaId) {
  const { data } = await window.supabaseClient
    .from("dipendenti").select("id, nome, pin").eq("azienda_id", aziendaId);
  dipendentiCache = data || [];
}

async function apriProduzione() {
  const msg = document.getElementById("pa-msg");
  const nome = (document.getElementById("pa-ricetta")?.value || "").trim();
  const qta = parseFloat(document.getElementById("pa-qta")?.value) || null;
  const pin = (document.getElementById("pa-pin")?.value || "").trim();
  const note = (document.getElementById("pa-note")?.value || "").trim();

  const ric = ricetteCache.find(r => (r.nome || "").toLowerCase() === nome.toLowerCase());
  if (!ric) { msg.innerHTML = '<span style="color:#dc2626;">Seleziona una ricetta valida dall\'elenco.</span>'; return; }

  let operatore_id = null;
  if (pin) {
    const op = dipendentiCache.find(d => (d.pin ?? "").toString() === pin);
    if (!op) { msg.innerHTML = '<span style="color:#dc2626;">PIN non valido.</span>'; return; }
    operatore_id = op.id;
  }

  const oggi = new Date().toISOString().slice(0, 10);
  let scadenza = null;
  if (ric.shelf_life_giorni) { const d = new Date(); d.setDate(d.getDate() + Number(ric.shelf_life_giorni)); scadenza = d.toISOString().slice(0, 10); }
  const lottoUuid = (crypto?.randomUUID && crypto.randomUUID()) || null;
  const aziendaId = window.state.azienda.id;

  msg.innerHTML = '<span style="color:#64748b;">Apertura...</span>';
  const { data: nuovo, error } = await window.supabaseClient.from("produzione_lotti").insert({
    azienda_id: aziendaId,
    ricetta_id: ric.id,
    data_produzione: oggi,
    data_scadenza: scadenza,
    quantita_output: qta,
    unita_misura: "kg",
    stato: "aperta",
    sede_uuid: window.state?.sedeAttiva?.id || null,
    luogo: window.state?.sedeAttiva?.nome || null,
    note: note || null,
    operatore_id,
    lotto_uuid: lottoUuid,
  }).select("id, lotto_uuid").single();

  if (error) { msg.innerHTML = `<span style="color:#dc2626;">Errore: ${escapeHtml(error.message)}</span>`; return; }

  // Crea le righe fase (da ricetta) collegate al lotto, non firmate
  const luuid = nuovo?.lotto_uuid || lottoUuid;
  if (luuid) {
    const { data: fasi } = await window.supabaseClient
      .from("ricette_preparazione_fasi")
      .select("id, ordine, nome_fase, tipo_fase, temperatura, durata_min, descrizione_operativa")
      .eq("ricetta_id", ric.id).order("ordine");
    if (fasi && fasi.length) {
      const righe = fasi.map(f => ({
        azienda_id: aziendaId, lotto_id: luuid, ricetta_id: ric.id,
        fase_id: f.id, fase_ordine: f.ordine, fase_nome: f.nome_fase, fase_tipo: f.tipo_fase,
        temperatura_prevista: f.temperatura ? Number(f.temperatura) : null,
        esito: "ok",
      }));
      await window.supabaseClient.from("produzione_log_haccp").insert(righe);
    }
  }

  msg.innerHTML = '<span style="color:#16a34a;">Produzione aperta ✅</span>';
  ["pa-ricetta", "pa-qta", "pa-pin", "pa-note"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  await refreshLista();
}

async function refreshLista() {
  const cont = document.getElementById("pa-lista");
  const countEl = document.getElementById("pa-open-count");
  if (!cont) return;

  const { data, error } = await window.supabaseClient
    .from("produzione_lotti")
    .select("id, lotto_uuid, codice_lotto, ricetta_id, data_produzione, data_scadenza, quantita_output, luogo, note, created_at, operatore_id, ricette(nome), dipendenti(nome)")
    .eq("azienda_id", window.state.azienda.id).eq("stato", "aperta").order("created_at", { ascending: true });

  if (error) { cont.innerHTML = `<div style="color:#dc2626;">Errore: ${escapeHtml(error.message)}</div>`; return; }
  const lotti = data || [];
  if (countEl) countEl.textContent = lotti.length ? `${lotti.length} aperte` : "nessuna aperta";

  // fasi di tutti i lotti aperti
  fasiByLotto = {};
  const uuids = lotti.map(l => l.lotto_uuid).filter(Boolean);
  if (uuids.length) {
    const { data: haccp } = await window.supabaseClient
      .from("produzione_log_haccp").select("*").in("lotto_id", uuids).order("fase_ordine");
    (haccp || []).forEach(h => { (fasiByLotto[h.lotto_id] = fasiByLotto[h.lotto_id] || []).push(h); });
  }

  if (!lotti.length) {
    cont.innerHTML = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;color:#166534;">✅ Nessuna produzione aperta. Tutto chiuso.</div>`;
    return;
  }

  cont.innerHTML = lotti.map(l => {
    const nome = l.ricette?.nome || "Ricetta";
    const op = l.dipendenti?.nome || "";
    const fasi = fasiByLotto[l.lotto_uuid] || [];
    const firmate = fasi.filter(f => f.firmato_da).length;
    const tot = fasi.length;
    const oreAperte = (Date.now() - new Date(l.created_at).getTime()) / 3600000;
    const allarme = oreAperte >= 24;
    const scad = l.data_scadenza ? new Date(l.data_scadenza).toLocaleDateString("it-IT") : "—";
    const complete = tot > 0 && firmate === tot;
    return `
      <div class="card" data-vai="${l.lotto_uuid}" style="cursor:pointer;background:white;border:1px solid ${allarme ? "#fecaca" : "#e5e7eb"};border-left:5px solid ${allarme ? "#dc2626" : "#16a34a"};border-radius:12px;padding:14px 16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;font-size:16px;">${escapeHtml(nome)}</div>
            <div style="font-size:13px;color:#475569;margin-top:2px;">
              🕓 aperta ${tempoTrascorso(l.created_at)} ${allarme ? '<span style="color:#dc2626;font-weight:700;">· da troppo tempo!</span>' : ""}
              ${l.quantita_output ? ` · ${formatNum(l.quantita_output)} kg` : ""}${l.luogo ? ` · 📍 ${escapeHtml(l.luogo)}` : ""}
            </div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">
              ${l.codice_lotto ? `Lotto ${escapeHtml(l.codice_lotto)} · ` : ""}Scadenza ${scad}${op ? ` · Aperta da ${escapeHtml(op)}` : ""}${l.note ? ` · ${escapeHtml(l.note)}` : ""}
            </div>
            <div style="margin-top:6px;font-size:13px;font-weight:700;color:${complete ? "#16a34a" : "#b45309"};">
              ${tot ? `Fasi ${firmate}/${tot} ${complete ? "✅ completate" : "firmate"}` : "Nessuna fase in ricetta"}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <button data-fasi="${l.lotto_uuid}" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 16px;font-weight:600;cursor:pointer;white-space:nowrap;">▶ Vai alla lavorazione</button>
            <button data-chiudi="${l.id}" style="background:${complete ? "#16a34a" : "#e2e8f0"};color:${complete ? "white" : "#334155"};border:none;border-radius:10px;padding:9px 16px;font-weight:600;cursor:pointer;white-space:nowrap;">✔ Chiudi</button>
          </div>
        </div>
      </div>`;
  }).join("");

  cont.querySelectorAll("[data-vai]").forEach(card => card.addEventListener("click", (e) => {
    if (e.target.closest("button")) return; // i bottoni fanno il loro
    window.location.hash = "#/preparazioni?lotto=" + card.dataset.vai;
  }));
  cont.querySelectorAll("[data-chiudi]").forEach(b => b.addEventListener("click", (e) => { e.stopPropagation(); chiudiProduzione(b.dataset.chiudi); }));
  cont.querySelectorAll("[data-fasi]").forEach(b => b.addEventListener("click", () => { window.location.hash = "#/preparazioni?lotto=" + b.dataset.fasi; }));
}

function apriModalFasi(lottoUuid) {
  modalLotto = lottoUuid;
  const modal = document.getElementById("pa-modal");
  renderModalFasi();
  modal.style.display = "block";
}

function renderModalFasi() {
  const body = document.getElementById("pa-modal-body");
  const title = document.getElementById("pa-modal-title");
  const fasi = (fasiByLotto[modalLotto] || []).slice().sort((a, b) => (a.fase_ordine || 0) - (b.fase_ordine || 0));
  title.innerText = "🧾 Completa le fasi";
  if (!fasi.length) { body.innerHTML = `<div style="color:#64748b;">Nessuna fase.</div>`; return; }
  body.innerHTML = fasi.map(f => {
    const firmato = !!f.firmato_da;
    return `
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:10px;background:${firmato ? "#f0fdf4" : "white"};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <div>
            <div style="font-weight:700;">${f.fase_ordine ? f.fase_ordine + ". " : ""}${escapeHtml(f.fase_nome || f.fase_tipo || "Fase")}</div>
            ${f.temperatura_prevista != null ? `<div style="font-size:12px;color:#64748b;">Temp. prevista ${f.temperatura_prevista}°C</div>` : ""}
          </div>
          <div style="text-align:right;">
            ${firmato
              ? `<div style="color:#16a34a;font-weight:700;font-size:13px;">✅ ${escapeHtml(f.firmato_da)}</div>
                 <div style="font-size:11px;color:#64748b;">${f.firmato_il ? new Date(f.firmato_il).toLocaleString("it-IT") : ""}</div>`
              : `<button data-firma="${f.id}" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:7px 14px;font-weight:600;cursor:pointer;">✍️ Firma</button>`}
          </div>
        </div>
      </div>`;
  }).join("");
  body.querySelectorAll("[data-firma]").forEach(b => b.addEventListener("click", () => firmaFase(b.dataset.firma)));
}

async function firmaFase(logId) {
  const nomeFase = ((fasiByLotto[modalLotto] || []).find(f => String(f.id) === String(logId))?.fase_nome) || "fase";
  const pin = (prompt(`PIN di chi ha eseguito la fase «${nomeFase}»:`, "") || "").trim();
  if (!pin) return;
  const op = dipendentiCache.find(d => (d.pin ?? "").toString() === pin);
  if (!op) { alert("PIN non valido ❌"); return; }

  const now = new Date().toISOString();
  const { error } = await window.supabaseClient.from("produzione_log_haccp").update({
    operatore_id: op.id, operatore_nome: op.nome, firmato_da: op.nome, firmato_il: now, ora_fine: now,
  }).eq("id", logId);
  if (error) { alert("Errore firma: " + error.message); return; }

  // aggiorna cache locale e ridisegna
  const arr = fasiByLotto[modalLotto] || [];
  const row = arr.find(f => String(f.id) === String(logId));
  if (row) { row.firmato_da = op.nome; row.firmato_il = now; row.operatore_nome = op.nome; }
  renderModalFasi();
}

function chiudiModal() {
  modalLotto = null;
  const modal = document.getElementById("pa-modal");
  if (modal) modal.style.display = "none";
  refreshLista();
}

async function chiudiProduzione(id) {
  if (!confirm("Confermi la chiusura di questa produzione?")) return;
  const { error } = await window.supabaseClient
    .from("produzione_lotti").update({ stato: "firmato", firmato_at: new Date().toISOString() }).eq("id", id);
  if (error) { alert("Errore chiusura: " + error.message); return; }
  await refreshLista();
}

function tempoTrascorso(iso) {
  if (!iso) return "";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${min} min fa`;
  const ore = Math.floor(min / 60);
  if (ore < 24) return `da ${ore}h`;
  const gg = Math.floor(ore / 24);
  return `da ${gg}g ${ore % 24}h`;
}
function formatNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString("it-IT", { maximumFractionDigits: 3 }) : n; }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }
