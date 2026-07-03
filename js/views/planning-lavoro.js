// js/views/planning-lavoro.js
// Vista operatore: mostra i turni settimanali ricorrenti assegnati dall'admin
// (letti dal campo dipendenti.turni, impostato in crea-dipendente.js)

const supa = () => window.supabaseClient || window.supabase;

const GIORNI = [
  { key: "lunedi",    label: "Lunedì" },
  { key: "martedi",   label: "Martedì" },
  { key: "mercoledi", label: "Mercoledì" },
  { key: "giovedi",   label: "Giovedì" },
  { key: "venerdi",   label: "Venerdì" },
  { key: "sabato",    label: "Sabato" },
  { key: "domenica",  label: "Domenica" },
];

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function render(container) {
  const azienda = window.state?.azienda;
  const user = window.state?.user;
  let dipendenteId = window.state?.dipendente?.id || null;

  if (!dipendenteId && azienda?.id && user?.id) {
    const { data } = await supa()
      .from("dipendenti")
      .select("id")
      .eq("azienda_id", azienda.id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    dipendenteId = data?.id || null;
  }

  if (!dipendenteId) {
    container.innerHTML = `
      <div class="view" style="padding:20px;">
        <h2>Planning turni</h2>
        <p style="color:#64748b;">Nessun profilo dipendente collegato a questo account.</p>
      </div>
    `;
    return;
  }

  const { data: dip, error } = await supa()
    .from("dipendenti")
    .select("nome, cognome, turni")
    .eq("id", dipendenteId)
    .maybeSingle();

  const turni = Array.isArray(dip?.turni) ? dip.turni : [];

  // Raggruppa i turni per giorno della settimana
  const turniPerGiorno = {};
  GIORNI.forEach(g => turniPerGiorno[g.key] = []);
  turni.forEach(t => {
    (t.giorni || []).forEach(g => {
      if (turniPerGiorno[g]) {
        turniPerGiorno[g].push({ inizio: t.inizio, fine: t.fine });
      }
    });
  });

  container.innerHTML = `
    <div class="view" style="padding:16px;max-width:600px;margin:0 auto;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
        <button onclick="(function(){ if (window.history.length > 1) { window.history.back(); } else { window.location.hash = '#/home'; } })()"
          style="width:36px;height:36px;border:none;border-radius:8px;background:#f1f5f9;color:#0f172a;font-size:18px;cursor:pointer;">←</button>
        <h2 style="margin:0;">📅 I miei turni</h2>
      </div>
      <p style="color:#64748b;font-size:13px;margin:4px 0 20px 46px;">${esc(dip?.nome || "")} ${esc(dip?.cognome || "")}</p>

      ${!turni.length ? `
        <div style="text-align:center;padding:40px 20px;color:#94a3b8;background:white;border-radius:14px;border:1px solid #e5e7eb;">
          <div style="font-size:40px;margin-bottom:8px;">📭</div>
          Nessun turno ricorrente impostato.<br>
          <span style="font-size:12px;">Chiedi all'amministratore di aggiornare il tuo profilo.</span>
        </div>
      ` : GIORNI.map(g => {
        const slot = turniPerGiorno[g.key];
        return `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:700;font-size:14px;">${g.label}</div>
            <div style="font-size:13px;color:${slot.length ? '#0f172a' : '#cbd5e1'};text-align:right;">
              ${slot.length
                ? slot.map(s => `${s.inizio || '?'} – ${s.fine || '?'}`).join('<br>')
                : 'Riposo'}
            </div>
          </div>
        `;
      }).join("")}

      <p style="font-size:12px;color:#94a3b8;margin-top:16px;text-align:center;">
        Questo è il turno ricorrente standard. Per cambi/scambi turno contatta l'amministratore.
      </p>
    </div>
  `;

  if (error) console.error("PLANNING LAVORO ERROR:", error);
}
