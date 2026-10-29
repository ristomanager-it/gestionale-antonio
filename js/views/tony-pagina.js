// js/views/tony-pagina.js
// 📊 Pagina "Tony" per admin e manager: cosa ha fatto Tony (registro delle azioni confermate
// o fatte subito) e quanto costa (domande, token, costo stimato del mese).

const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TIPI = {
  apri_produzione: "▶ Produzione aperta", planning: "📋 Aggiunta al planning", modifica_planning: "📋 Planning modificato",
  nuova_ricetta: "📖 Ricetta creata", modifica_ricetta: "📖 Ricetta modificata", lotto_fornitore: "📦 Merce registrata",
  modello_whatsapp: "💬 Messaggio mandato a Meta", attiva_modello_whatsapp: "✅ Messaggio attivato",
  firma_fasi: "✍️ Fasi firmate", registra_lotto: "⚖️ Resa / confezioni", prenotazione: "🍽️ Prenotazione", modifica_prenotazione: "🍽️ Prenotazione modificata",
};

export async function render(app) {
  const supa = window.supabaseClient || window.supabase;
  const az = window.state?.azienda?.id;
  // solo per l'admin: costi e registro di Tony
  const ruolo = String(window.state?.ruoloRaw || window.state?.ruolo || "").toLowerCase();
  if (!["admin", "superadmin"].includes(ruolo)) { app.innerHTML = `<div style="padding:24px;">Questa pagina è riservata all'amministratore.</div>`; return; }
  app.innerHTML = `
    <div style="max-width:900px;margin:0 auto;padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <button onclick="location.hash='#/ai'" style="border:0;background:#e2e8f0;border-radius:10px;padding:8px 12px;font-weight:700;">← Tony</button>
        <h2 style="margin:0;font-size:20px;">📊 Tony: cosa fa e quanto costa</h2>
      </div>
      <div id="tp-kpi" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px;"></div>
      <h3 style="font-size:15px;margin:10px 0;">Ultime azioni</h3>
      <div id="tp-registro" style="display:flex;flex-direction:column;gap:6px;">Carico…</div>
    </div>`;

  const inizioMese = new Date(); inizioMese.setDate(1); inizioMese.setHours(0, 0, 0, 0);
  const [{ data: cons }, { data: reg }, { data: dips }] = await Promise.all([
    supa.from("tony_consumi").select("user_id, token_in, token_out, costo_usd, created_at").eq("azienda_id", az).gte("created_at", inizioMese.toISOString()).limit(5000),
    supa.from("tony_registro").select("tipo, esito, ok, dipendente_id, created_at").eq("azienda_id", az).order("created_at", { ascending: false }).limit(80),
    supa.from("dipendenti").select("id, nome").eq("azienda_id", az),
  ]);
  const nome = new Map((dips || []).map((d) => [d.id, d.nome]));
  const domande = (cons || []).length;
  const costoUsd = (cons || []).reduce((t, r) => t + Number(r.costo_usd || 0), 0);
  const euro = costoUsd * 0.92;
  const oggi = new Date().toISOString().slice(0, 10);
  const domandeOggi = (cons || []).filter((r) => String(r.created_at).slice(0, 10) === oggi).length;
  const giorniPassati = Math.max(1, new Date().getDate());
  const stimaMese = euro / giorniPassati * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const kpi = (t, v, s) => `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;"><div style="font-size:12px;color:#64748b;">${t}</div><div style="font-size:22px;font-weight:800;color:#0E5A7A;">${v}</div>${s ? `<div style="font-size:11px;color:#94a3b8;">${s}</div>` : ""}</div>`;
  document.getElementById("tp-kpi").innerHTML =
    kpi("Domande questo mese", domande, `${domandeOggi} oggi`) +
    kpi("Costo del mese", "€ " + euro.toFixed(2), "stima, modello veloce") +
    kpi("Proiezione a fine mese", "€ " + stimaMese.toFixed(2), "al ritmo attuale") +
    kpi("Azioni fatte", (reg || []).filter((r) => r.ok).length, "ultime 80 registrate");

  const box = document.getElementById("tp-registro");
  if (!reg?.length) { box.innerHTML = `<div style="color:#64748b;">Tony non ha ancora fatto azioni.</div>`; return; }
  box.innerHTML = reg.map((r) => `
    <div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid ${r.ok ? "#10b981" : "#ef4444"};border-radius:10px;padding:8px 12px;">
      <div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#64748b;">
        <span>${esc(TIPI[r.tipo] || r.tipo)} · ${esc(nome.get(r.dipendente_id) || "")}</span>
        <span>${new Date(r.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div style="font-size:14px;margin-top:2px;">${esc(r.esito || "")}</div>
    </div>`).join("");
}
