/* =========================================================
   REGISTRO MESSAGGI — inviati e ricevuti (WhatsApp + Email)
   WhatsApp ricevuti: whatsapp_messaggi | inviati: whatsapp_messaggi_log
   Email: via edge Resend (inviate + ricevute)  [best-effort]
   ========================================================= */

let msgCache = [];

export async function render(app) {
  const azienda = window.state?.azienda;
  app.innerHTML = `
    <div style="max-width:1000px;margin:0 auto;padding:16px;">
      <h1 style="margin:0 0 4px;font-size:22px;">📨 Registro messaggi</h1>
      <div style="color:#64748b;font-size:13px;margin-bottom:16px;">${escapeHtml(azienda?.nome || "")} — messaggi inviati e ricevuti</div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:end;">
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Canale</label>
          <select id="rm-canale" class="input"><option value="">Tutti</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select>
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Direzione</label>
          <select id="rm-dir" class="input"><option value="">Tutte</option><option value="in">📥 Ricevuti</option><option value="out">📤 Inviati</option></select>
        </div>
        <div style="flex:1;min-width:180px;">
          <label style="font-size:12px;color:#64748b;display:block;">Cerca (testo / numero / nome)</label>
          <input id="rm-cerca" class="input" placeholder="Cerca..." style="width:100%;box-sizing:border-box;">
        </div>
      </div>

      <div id="rm-lista"><div style="color:#64748b;">Caricamento...</div></div>
    </div>
  `;

  ["rm-canale", "rm-dir"].forEach(id => document.getElementById(id)?.addEventListener("change", renderLista));
  document.getElementById("rm-cerca")?.addEventListener("input", renderLista);

  await carica();
}

async function carica() {
  const cont = document.getElementById("rm-lista");
  const aziendaId = window.state.azienda.id;

  const [waIn, waOut, email] = await Promise.all([
    window.supabaseClient.from("whatsapp_messaggi")
      .select("id, from_numero, from_nome, testo, intent, risposta_inviata, risposta_testo, created_at")
      .eq("azienda_id", aziendaId).order("created_at", { ascending: false }).limit(300),
    window.supabaseClient.from("whatsapp_messaggi_log")
      .select("id, numero_dest, nome_dest, testo, template_name, stato, errore_msg, created_at")
      .eq("azienda_id", aziendaId).order("created_at", { ascending: false }).limit(300),
    caricaEmail(aziendaId),
  ]);

  const items = [];

  (waIn.data || []).forEach(m => items.push({
    canale: "whatsapp", dir: "in", quando: m.created_at,
    chi: m.from_nome || m.from_numero || "—", numero: m.from_numero || "",
    testo: m.testo || "", extra: m.intent ? "intent: " + m.intent : "", stato: "",
  }));
  (waOut.data || []).forEach(m => items.push({
    canale: "whatsapp", dir: "out", quando: m.created_at,
    chi: m.nome_dest || m.numero_dest || "—", numero: m.numero_dest || "",
    testo: m.testo || (m.template_name ? "[template] " + m.template_name : ""),
    extra: m.template_name ? "template: " + m.template_name : "", stato: m.stato || "", errore: m.errore_msg || "",
  }));
  (email || []).forEach(m => items.push(m));

  items.sort((a, b) => new Date(b.quando) - new Date(a.quando));
  msgCache = items;
  renderLista();
}

async function caricaEmail(aziendaId) {
  try {
    const base = (window.SUPABASE_URL || "https://cuhcscpvhypoaplcmtjk.supabase.co");
    const res = await fetch(base + "/functions/v1/registro-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ azienda_id: aziendaId }),
    });
    if (!res.ok) return [];
    const j = await res.json();
    return (j.messaggi || []).map(m => ({
      canale: "email", dir: m.dir || "out", quando: m.quando,
      chi: m.chi || "—", numero: m.email || "", testo: m.oggetto || "", extra: "", stato: m.stato || "",
    }));
  } catch (_e) { return []; }
}

function renderLista() {
  const cont = document.getElementById("rm-lista");
  if (!cont) return;
  const canale = document.getElementById("rm-canale")?.value || "";
  const dir = document.getElementById("rm-dir")?.value || "";
  const cerca = (document.getElementById("rm-cerca")?.value || "").toLowerCase().trim();

  let items = msgCache;
  if (canale) items = items.filter(m => m.canale === canale);
  if (dir) items = items.filter(m => m.dir === dir);
  if (cerca) items = items.filter(m => ((m.testo || "") + " " + (m.chi || "") + " " + (m.numero || "") + " " + (m.extra || "")).toLowerCase().includes(cerca));

  if (!items.length) { cont.innerHTML = `<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;color:#64748b;">Nessun messaggio.</div>`; return; }

  cont.innerHTML = `<div style="font-size:12px;color:#64748b;margin-bottom:8px;">${items.length} messaggi</div>` + items.map(m => {
    const canaleIcon = m.canale === "whatsapp" ? "💬" : "✉️";
    const dirBadge = m.dir === "in"
      ? '<span style="background:#dcfce7;color:#166534;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700;">📥 Ricevuto</span>'
      : '<span style="background:#dbeafe;color:#1e40af;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700;">📤 Inviato</span>';
    const quando = m.quando ? new Date(m.quando).toLocaleString("it-IT") : "";
    const statoErr = m.stato === "errore" || m.errore ? `<span style="color:#dc2626;font-size:11px;"> · errore${m.errore ? ": " + escapeHtml(m.errore) : ""}</span>` : (m.stato ? `<span style="color:#64748b;font-size:11px;"> · ${escapeHtml(m.stato)}</span>` : "");
    return `
      <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="font-weight:700;">${canaleIcon} ${escapeHtml(m.chi)} ${dirBadge}</div>
          <div style="font-size:11px;color:#94a3b8;">${quando}${statoErr}</div>
        </div>
        ${m.testo ? `<div style="font-size:14px;color:#1f2937;margin-top:6px;white-space:pre-wrap;">${escapeHtml(m.testo)}</div>` : ""}
        ${m.extra ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;">${escapeHtml(m.extra)}</div>` : ""}
      </div>`;
  }).join("");
}

function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
