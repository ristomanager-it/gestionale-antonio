/* =========================================================
   PRODUZIONI APERTE — monitor centro cottura
   - Apri produzione (stato 'aperta', legata alla sede via 'luogo')
   - Lista live di cosa è aperto e non ancora chiuso
   - Chiudi produzione (stato 'firmato')
   - Auto-refresh + contatore (visibile anche a manager/admin)
   ========================================================= */

let ricetteCache = [];
let dipendentiCache = [];
let refreshTimer = null;

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
        <div id="prod-open-count" style="font-size:14px;font-weight:700;color:#0E5A7A;"></div>
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
  `;

  await Promise.all([loadRicette(aziendaId), loadDipendenti(aziendaId)]);
  const dl = document.getElementById("pa-ricette-list");
  if (dl) dl.innerHTML = ricetteCache.map(r => `<option value="${escapeAttr(r.nome)}">`).join("");

  document.getElementById("pa-apri")?.addEventListener("click", apriProduzione);

  await refreshLista();
  // auto-refresh ogni 30s
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshLista, 30000);
}

async function loadRicette(aziendaId) {
  const { data } = await window.supabaseClient
    .from("ricette").select("id, nome, shelf_life_giorni")
    .eq("azienda_id", aziendaId).order("nome");
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
  if (ric.shelf_life_giorni) {
    const d = new Date(); d.setDate(d.getDate() + Number(ric.shelf_life_giorni));
    scadenza = d.toISOString().slice(0, 10);
  }

  msg.innerHTML = '<span style="color:#64748b;">Apertura...</span>';
  const { error } = await window.supabaseClient.from("produzione_lotti").insert({
    azienda_id: window.state.azienda.id,
    ricetta_id: ric.id,
    data_produzione: oggi,
    data_scadenza: scadenza,
    quantita_output: qta,
    unita_misura: "kg",
    stato: "aperta",
    luogo: window.state?.sedeAttiva?.nome || null,
    note: note || null,
    operatore_id,
  });

  if (error) { msg.innerHTML = `<span style="color:#dc2626;">Errore: ${escapeHtml(error.message)}</span>`; return; }
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
    .select("id, codice_lotto, ricetta_id, data_produzione, data_scadenza, quantita_output, luogo, note, created_at, operatore_id, ricette(nome), dipendenti(nome)")
    .eq("azienda_id", window.state.azienda.id)
    .eq("stato", "aperta")
    .order("created_at", { ascending: true });

  if (error) { cont.innerHTML = `<div style="color:#dc2626;">Errore: ${escapeHtml(error.message)}</div>`; return; }
  const lotti = data || [];
  if (countEl) countEl.textContent = lotti.length ? `${lotti.length} aperte` : "nessuna aperta";

  if (!lotti.length) {
    cont.innerHTML = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;color:#166534;">✅ Nessuna produzione aperta. Tutto chiuso.</div>`;
    return;
  }

  cont.innerHTML = lotti.map(l => {
    const nome = l.ricette?.nome || "Ricetta";
    const op = l.dipendenti?.nome || "";
    const apertaDa = tempoTrascorso(l.created_at);
    const oreAperte = (Date.now() - new Date(l.created_at).getTime()) / 3600000;
    const allarme = oreAperte >= 48;
    const scad = l.data_scadenza ? new Date(l.data_scadenza).toLocaleDateString("it-IT") : "—";
    return `
      <div class="card" style="background:white;border:1px solid ${allarme ? "#fecaca" : "#e5e7eb"};border-left:5px solid ${allarme ? "#dc2626" : "#16a34a"};border-radius:12px;padding:14px 16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;font-size:16px;">${escapeHtml(nome)}</div>
            <div style="font-size:13px;color:#475569;margin-top:2px;">
              🕓 aperta ${apertaDa} ${allarme ? '<span style="color:#dc2626;font-weight:700;">· da troppo tempo!</span>' : ""}
              ${l.quantita_output ? ` · ${formatNum(l.quantita_output)} kg` : ""}
              ${l.luogo ? ` · 📍 ${escapeHtml(l.luogo)}` : ""}
            </div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">
              ${l.codice_lotto ? `Lotto ${escapeHtml(l.codice_lotto)} · ` : ""}Scadenza ${scad}${op ? ` · Aperta da ${escapeHtml(op)}` : ""}
              ${l.note ? ` · ${escapeHtml(l.note)}` : ""}
            </div>
          </div>
          <button data-chiudi="${l.id}" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 16px;font-weight:600;cursor:pointer;white-space:nowrap;">✔ Chiudi</button>
        </div>
      </div>`;
  }).join("");

  cont.querySelectorAll("[data-chiudi]").forEach(btn => {
    btn.addEventListener("click", () => chiudiProduzione(btn.dataset.chiudi));
  });
}

async function chiudiProduzione(id) {
  if (!confirm("Confermi la chiusura di questa produzione?")) return;
  const { error } = await window.supabaseClient
    .from("produzione_lotti")
    .update({ stato: "firmato", firmato_at: new Date().toISOString() })
    .eq("id", id);
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

function formatNum(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString("it-IT", { maximumFractionDigits: 3 }) : n;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }
