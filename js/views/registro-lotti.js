/* =========================================================
   REGISTRO LOTTI — storico produzioni (sola lettura)
   Tutti i lotti (aperta/firmato/chiuso/...) con filtri e dettaglio HACCP
   ========================================================= */

let lottiCache = [];

const STATO_LABEL = {
  aperta: { t: "🟢 Aperta", c: "#16a34a" },
  firmato: { t: "✅ Chiusa", c: "#0E5A7A" },
  chiuso: { t: "✅ Chiusa", c: "#0E5A7A" },
  bozza: { t: "✏️ Bozza", c: "#94a3b8" },
  confermato: { t: "🔵 Confermata", c: "#2563eb" },
  annullato: { t: "✖ Annullata", c: "#dc2626" },
};

export async function render(app) {
  const azienda = window.state?.azienda;
  app.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:16px;">
      <h1 style="margin:0 0 4px;font-size:22px;">📒 Registro lotti</h1>
      <div style="color:#64748b;font-size:13px;margin-bottom:16px;">${escapeHtml(azienda?.nome || "")} — storico delle produzioni</div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:end;">
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Stato</label>
          <select id="rl-stato" class="input"><option value="">Tutti</option><option value="aperta">Aperte</option><option value="firmato">Chiuse</option><option value="annullato">Annullate</option></select>
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Dal</label>
          <input id="rl-dal" type="date" class="input">
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Al</label>
          <input id="rl-al" type="date" class="input">
        </div>
        <div style="flex:1;min-width:180px;">
          <label style="font-size:12px;color:#64748b;display:block;">Cerca (ricetta / lotto)</label>
          <input id="rl-cerca" class="input" placeholder="Es: Impasto pane" style="width:100%;box-sizing:border-box;">
        </div>
      </div>

      <div id="rl-lista"><div style="color:#64748b;">Caricamento...</div></div>
    </div>
  `;

  ["rl-stato", "rl-dal", "rl-al"].forEach(id => document.getElementById(id)?.addEventListener("change", carica));
  document.getElementById("rl-cerca")?.addEventListener("input", () => renderLista());

  await carica();
}

async function carica() {
  const cont = document.getElementById("rl-lista");
  const stato = document.getElementById("rl-stato")?.value || "";
  const dal = document.getElementById("rl-dal")?.value || "";
  const al = document.getElementById("rl-al")?.value || "";

  let q = window.supabaseClient
    .from("produzione_lotti")
    .select("id, lotto_uuid, codice_lotto, data_produzione, data_scadenza, quantita_output, unita_misura, luogo, note, stato, created_at, firmato_at, ricette(nome), dipendenti(nome)")
    .eq("azienda_id", window.state.azienda.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (stato) q = q.eq("stato", stato);
  if (dal) q = q.gte("data_produzione", dal);
  if (al) q = q.lte("data_produzione", al);

  const { data, error } = await q;
  if (error) { cont.innerHTML = `<div style="color:#dc2626;">Errore: ${escapeHtml(error.message)}</div>`; return; }
  lottiCache = data || [];
  renderLista();
}

function renderLista() {
  const cont = document.getElementById("rl-lista");
  const cerca = (document.getElementById("rl-cerca")?.value || "").toLowerCase().trim();
  let lotti = lottiCache;
  if (cerca) lotti = lotti.filter(l => ((l.ricette?.nome || "") + " " + (l.codice_lotto || "")).toLowerCase().includes(cerca));

  if (!lotti.length) { cont.innerHTML = `<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;color:#64748b;">Nessun lotto trovato.</div>`; return; }

  cont.innerHTML = `<div style="font-size:12px;color:#64748b;margin-bottom:8px;">${lotti.length} lotti</div>` + lotti.map(l => {
    const st = STATO_LABEL[l.stato] || { t: l.stato || "—", c: "#64748b" };
    const nome = l.ricette?.nome || "Ricetta";
    const dataP = l.data_produzione ? new Date(l.data_produzione).toLocaleDateString("it-IT") : "—";
    const scad = l.data_scadenza ? new Date(l.data_scadenza).toLocaleDateString("it-IT") : "—";
    const op = l.dipendenti?.nome || "";
    return `
      <div class="card" data-lotto="${l.lotto_uuid || ""}" style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;margin-bottom:8px;cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;">${escapeHtml(nome)} <span style="color:${st.c};font-size:12px;font-weight:700;margin-left:6px;">${st.t}</span></div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">
              ${l.codice_lotto ? escapeHtml(l.codice_lotto) + " · " : ""}Prod. ${dataP} · Scad. ${scad}${l.quantita_output ? " · " + formatNum(l.quantita_output) + " kg" : ""}${l.luogo ? " · 📍 " + escapeHtml(l.luogo) : ""}${op ? " · " + escapeHtml(op) : ""}
            </div>
          </div>
          <div style="font-size:12px;color:#0E5A7A;">dettaglio ▾</div>
        </div>
        <div class="rl-dettaglio" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;"></div>
      </div>`;
  }).join("");

  cont.querySelectorAll("[data-lotto]").forEach(card => {
    card.addEventListener("click", () => toggleDettaglio(card));
  });
}

async function toggleDettaglio(card) {
  const box = card.querySelector(".rl-dettaglio");
  if (!box) return;
  if (box.style.display === "block") { box.style.display = "none"; return; }
  const uuid = card.dataset.lotto;
  box.style.display = "block";
  box.innerHTML = `<div style="font-size:12px;color:#64748b;">Caricamento fasi...</div>`;
  if (!uuid) { box.innerHTML = `<div style="font-size:12px;color:#64748b;">Nessun dettaglio fasi (lotto senza UUID).</div>`; return; }

  const { data: fasi } = await window.supabaseClient
    .from("produzione_log_haccp").select("fase_ordine, fase_nome, temperatura_prevista, temperatura_rilevata, firmato_da, firmato_il, esito")
    .eq("lotto_id", uuid).order("fase_ordine");

  if (!fasi || !fasi.length) { box.innerHTML = `<div style="font-size:12px;color:#64748b;">Nessuna fase registrata.</div>`; return; }
  box.innerHTML = `<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Tracciabilità fasi</div>` + fasi.map(f => `
    <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px dotted #e5e7eb;">
      <span>${f.fase_ordine ? f.fase_ordine + ". " : ""}${escapeHtml(f.fase_nome || "Fase")}${f.temperatura_rilevata != null ? ` · 🌡 ${f.temperatura_rilevata}°C` : ""}</span>
      <span style="color:${f.firmato_da ? "#16a34a" : "#94a3b8"};">${f.firmato_da ? "✅ " + escapeHtml(f.firmato_da) + (f.firmato_il ? " · " + new Date(f.firmato_il).toLocaleString("it-IT") : "") : "non firmata"}</span>
    </div>`).join("");
}

function formatNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString("it-IT", { maximumFractionDigits: 3 }) : n; }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
