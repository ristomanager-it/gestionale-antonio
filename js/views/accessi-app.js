// ============================================================
// ACCESSI APP — registro admin: chi apre l'app, quando, dove naviga
// Route: #/accessi-app
// ============================================================

function supa() { return window.supabaseClient || window.supabase; }

function fmtOra(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function deviceLabel(ua) {
  ua = ua || "";
  let dev = "Desktop";
  if (/iPhone/i.test(ua)) dev = "iPhone";
  else if (/iPad/i.test(ua)) dev = "iPad";
  else if (/Android/i.test(ua)) dev = "Android";
  else if (/Windows/i.test(ua)) dev = "PC Windows";
  else if (/Macintosh/i.test(ua)) dev = "Mac";
  return dev;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = "<p style='padding:30px'>Nessuna azienda attiva.</p>"; return; }

  container.innerHTML = "<div style='padding:40px;text-align:center;color:#64748b;'>Carico gli accessi…</div>";

  const giorni = 7;
  const da = new Date(Date.now() - giorni * 24 * 3600 * 1000).toISOString();
  const { data: righe, error } = await supa()
    .from("app_accessi")
    .select("created_at,user_id,dipendente_id,nome,route,hash,user_agent,schermo")
    .eq("azienda_id", aziendaId)
    .gte("created_at", da)
    .order("created_at", { ascending: false })
    .limit(1500);

  if (error) {
    container.innerHTML = "<p style='padding:30px;color:#dc2626'>Errore: " + esc(error.message) + "</p>";
    return;
  }

  const accessi = righe || [];

  // Raggruppo per utente: ultima attività + conteggio + pagine più viste
  const perUtente = new Map();
  for (const r of accessi) {
    const k = r.user_id || r.nome || "?";
    if (!perUtente.has(k)) perUtente.set(k, { nome: r.nome || "(senza nome)", ultimo: r.created_at, device: deviceLabel(r.user_agent), tot: 0, rotte: {} });
    const u = perUtente.get(k);
    u.tot++;
    u.rotte[r.route] = (u.rotte[r.route] || 0) + 1;
  }

  const cardsUtenti = [...perUtente.values()]
    .sort((a, b) => new Date(b.ultimo) - new Date(a.ultimo))
    .map(u => {
      const top = Object.entries(u.rotte).sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([r, n]) => esc(r) + " (" + n + ")").join(" · ");
      return `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
            <div style="font-weight:700;color:#0f172a;">${esc(u.nome)}</div>
            <div style="font-size:12px;color:#64748b;">${esc(u.device)} · ultimo: ${fmtOra(u.ultimo)}</div>
          </div>
          <div style="font-size:12px;color:#475569;margin-top:6px;">${u.tot} pagine aperte · ${top || "—"}</div>
        </div>`;
    }).join("");

  const righeTab = accessi.slice(0, 400).map(r => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:6px 10px;white-space:nowrap;">${fmtOra(r.created_at)}</td>
        <td style="padding:6px 10px;">${esc(r.nome)}</td>
        <td style="padding:6px 10px;">${esc(r.route)}</td>
        <td style="padding:6px 10px;color:#64748b;">${esc(deviceLabel(r.user_agent))}</td>
      </tr>`).join("");

  container.innerHTML = `
    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:900px;margin:0 auto;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
          <div style="width:40px;height:40px;background:#0E5A7A;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">👁️</div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">Accessi app</div>
            <div style="font-size:13px;color:#64748b;">Ultimi ${giorni} giorni · ${accessi.length} navigazioni registrate</div>
          </div>
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">Il registro parte da oggi: vedrai i movimenti fatti da questo aggiornamento in poi.</div>

        <div style="font-size:14px;font-weight:700;color:#0f172a;margin:14px 0 8px;">Per persona</div>
        <div style="display:grid;gap:10px;margin-bottom:22px;">${cardsUtenti || "<div style='color:#64748b'>Ancora nessun accesso registrato.</div>"}</div>

        <div style="font-size:14px;font-weight:700;color:#0f172a;margin:14px 0 8px;">Cronologia (ultime 400)</div>
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;overflow:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;text-align:left;color:#64748b;">
                <th style="padding:8px 10px;">Quando</th>
                <th style="padding:8px 10px;">Chi</th>
                <th style="padding:8px 10px;">Pagina</th>
                <th style="padding:8px 10px;">Dispositivo</th>
              </tr>
            </thead>
            <tbody>${righeTab || ""}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}
