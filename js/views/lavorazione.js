/* =========================================================
   LAVORAZIONE — pagina operatore per completare una produzione
   Aperta da "Produzioni aperte" con #/lavorazione?lotto=<uuid>
   - Mostra la produzione + le fasi da eseguire
   - L'operatore firma ogni fase col proprio PIN (salvato subito)
   - Chiude la produzione quando è finita
   ========================================================= */

let dipendentiCache = [];
let lottoCorrente = null;
let fasiCorrente = [];
let descByFase = {};

function getLottoParam() {
  const h = window.location.hash || "";
  const q = h.split("?")[1] || "";
  const p = new URLSearchParams(q);
  return p.get("lotto");
}

export async function render(app) {
  const uuid = getLottoParam();
  const aziendaId = window.state?.azienda?.id;

  if (!uuid) {
    app.innerHTML = `<div style="padding:24px;">Produzione non specificata. <a href="#/produzioni-aperte">Torna alle produzioni aperte</a></div>`;
    return;
  }

  app.innerHTML = `<div style="padding:24px;color:#64748b;">Caricamento produzione...</div>`;

  const { data: lotto } = await window.supabaseClient
    .from("produzione_lotti")
    .select("id, lotto_uuid, codice_lotto, ricetta_id, data_produzione, data_scadenza, quantita_output, luogo, note, created_at, stato, ricette(nome)")
    .eq("lotto_uuid", uuid).eq("azienda_id", aziendaId).maybeSingle();

  if (!lotto) { app.innerHTML = `<div style="padding:24px;">Produzione non trovata. <a href="#/produzioni-aperte">Torna indietro</a></div>`; return; }
  lottoCorrente = lotto;

  const [{ data: dip }, { data: haccp }, { data: fasiRic }] = await Promise.all([
    window.supabaseClient.from("dipendenti").select("id, nome, pin").eq("azienda_id", aziendaId),
    window.supabaseClient.from("produzione_log_haccp").select("*").eq("lotto_id", uuid).order("fase_ordine"),
    window.supabaseClient.from("ricette_preparazione_fasi").select("id, descrizione_operativa, durata_min, tecnologia").eq("ricetta_id", lotto.ricetta_id),
  ]);
  dipendentiCache = dip || [];
  fasiCorrente = haccp || [];
  descByFase = {};
  (fasiRic || []).forEach(f => { descByFase[f.id] = f; });

  disegna(app);
}

function disegna(app) {
  const l = lottoCorrente;
  const nome = l.ricette?.nome || "Produzione";
  const firmate = fasiCorrente.filter(f => f.firmato_da).length;
  const tot = fasiCorrente.length;
  const complete = tot > 0 && firmate === tot;
  const scad = l.data_scadenza ? new Date(l.data_scadenza).toLocaleDateString("it-IT") : "—";

  app.innerHTML = `
    <div style="max-width:820px;margin:0 auto;padding:16px;">
      <a href="#/produzioni-aperte" style="color:#0E5A7A;font-size:13px;text-decoration:none;">← Produzioni aperte</a>
      <div style="background:#0E5A7A;color:white;border-radius:14px;padding:18px 20px;margin:12px 0 18px;">
        <div style="font-size:22px;font-weight:800;">${escapeHtml(nome)}</div>
        <div style="font-size:13px;opacity:.9;margin-top:4px;">
          ${l.codice_lotto ? "Lotto " + escapeHtml(l.codice_lotto) + " · " : ""}${l.quantita_output ? formatNum(l.quantita_output) + " kg · " : ""}${l.luogo ? "📍 " + escapeHtml(l.luogo) + " · " : ""}Scadenza ${scad}
        </div>
        <div style="margin-top:10px;font-size:14px;font-weight:700;">Fasi ${firmate}/${tot} ${complete ? "✅ completate" : ""}</div>
      </div>

      <div id="lav-fasi"></div>

      <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">
        <button id="lav-chiudi" style="background:${complete ? "#16a34a" : "#e2e8f0"};color:${complete ? "white" : "#334155"};border:none;border-radius:12px;padding:12px 24px;font-weight:700;font-size:15px;cursor:pointer;">✔ Chiudi produzione</button>
        <a href="#/produzioni-aperte" style="background:#f1f5f9;color:#334155;border-radius:12px;padding:12px 20px;font-weight:600;text-decoration:none;">Torna al monitor</a>
      </div>
    </div>
  `;

  const cont = document.getElementById("lav-fasi");
  cont.innerHTML = fasiCorrente.slice().sort((a, b) => (a.fase_ordine || 0) - (b.fase_ordine || 0)).map(f => {
    const firmato = !!f.firmato_da;
    const d = descByFase[f.fase_id] || {};
    return `
      <div style="border:1px solid #e5e7eb;border-left:5px solid ${firmato ? "#16a34a" : "#cbd5e1"};border-radius:12px;padding:14px 16px;margin-bottom:12px;background:${firmato ? "#f0fdf4" : "white"};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div style="flex:1;">
            <div style="font-weight:700;font-size:16px;">${f.fase_ordine ? f.fase_ordine + ". " : ""}${escapeHtml(f.fase_nome || f.fase_tipo || "Fase")}</div>
            ${d.descrizione_operativa ? `<div style="font-size:13px;color:#334155;margin-top:5px;line-height:1.5;">${escapeHtml(d.descrizione_operativa)}</div>` : ""}
            <div style="font-size:12px;color:#64748b;margin-top:6px;">
              ${f.temperatura_prevista != null ? `🌡 ${f.temperatura_prevista}°C ` : ""}${d.durata_min ? `· ⏱ ${d.durata_min} min ` : ""}${d.tecnologia ? `· ${escapeHtml(d.tecnologia)}` : ""}
            </div>
          </div>
          <div style="text-align:right;min-width:120px;">
            ${firmato
              ? `<div style="color:#16a34a;font-weight:700;font-size:14px;">✅ ${escapeHtml(f.firmato_da)}</div>
                 <div style="font-size:11px;color:#64748b;">${f.firmato_il ? new Date(f.firmato_il).toLocaleString("it-IT") : ""}</div>`
              : `<button data-firma="${f.id}" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 18px;font-weight:600;cursor:pointer;">✍️ Firma</button>`}
          </div>
        </div>
      </div>`;
  }).join("");

  cont.querySelectorAll("[data-firma]").forEach(b => b.addEventListener("click", () => firmaFase(b.dataset.firma, app)));
  document.getElementById("lav-chiudi")?.addEventListener("click", () => chiudiProduzione(app));
}

async function firmaFase(logId, app) {
  const fase = fasiCorrente.find(f => String(f.id) === String(logId));
  const pin = (prompt(`PIN di chi ha eseguito la fase «${fase?.fase_nome || "fase"}»:`, "") || "").trim();
  if (!pin) return;
  const op = dipendentiCache.find(d => (d.pin ?? "").toString() === pin);
  if (!op) { alert("PIN non valido ❌"); return; }

  const now = new Date().toISOString();
  const { error } = await window.supabaseClient.from("produzione_log_haccp").update({
    operatore_id: op.id, operatore_nome: op.nome, firmato_da: op.nome, firmato_il: now, ora_fine: now,
  }).eq("id", logId);
  if (error) { alert("Errore firma: " + error.message); return; }
  if (fase) { fase.firmato_da = op.nome; fase.firmato_il = now; fase.operatore_nome = op.nome; }
  disegna(app);
}

async function chiudiProduzione(app) {
  const firmate = fasiCorrente.filter(f => f.firmato_da).length;
  const tot = fasiCorrente.length;
  if (tot > 0 && firmate < tot) {
    if (!confirm(`Ci sono ancora ${tot - firmate} fasi non firmate. Chiudere comunque?`)) return;
  } else {
    if (!confirm("Confermi la chiusura di questa produzione?")) return;
  }
  const { error } = await window.supabaseClient
    .from("produzione_lotti").update({ stato: "firmato", firmato_at: new Date().toISOString() }).eq("id", lottoCorrente.id);
  if (error) { alert("Errore chiusura: " + error.message); return; }
  window.location.hash = "#/produzioni-aperte";
}

function formatNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString("it-IT", { maximumFractionDigits: 3 }) : n; }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
