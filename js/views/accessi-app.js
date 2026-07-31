// ============================================================
// ACCESSI APP — registro admin: chi apre l'app, quando, dove naviga
// Route: #/accessi-app  (menu admin: 👁️ Accessi app)
// Filtri: periodo, dipendente, tipo (navigazione / aperture storiche)
// ============================================================

const ROUTE_STORICO = "app-aperta (storico)";

function supa() { return window.supabaseClient || window.supabase; }

function fmtOra(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function deviceLabel(ua) {
  ua = ua || "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "PC Windows";
  if (/Macintosh/i.test(ua)) return "Mac";
  return "Desktop";
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = "<p style='padding:30px'>Nessuna azienda attiva.</p>"; return; }

  container.innerHTML = "<div style='padding:40px;text-align:center;color:#64748b;'>Carico gli accessi…</div>";

  const q = new URLSearchParams((window.location.hash.split("?")[1] || ""));
  const giorni = Math.min(Number(q.get("giorni")) || 7, 120);

  const da = new Date(Date.now() - giorni * 24 * 3600 * 1000).toISOString();
  const { data: righe, error } = await supa()
    .from("app_accessi")
    .select("created_at,user_id,dipendente_id,nome,route,hash,user_agent")
    .eq("azienda_id", aziendaId)
    .gte("created_at", da)
    .order("created_at", { ascending: false })
    .limit(4000);

  if (error) {
    container.innerHTML = "<p style='padding:30px;color:#dc2626'>Errore: " + esc(error.message) + "</p>";
    return;
  }

  const tutti = righe || [];
  const nomi = [...new Set(tutti.map(r => r.nome || "(senza nome)"))].sort((a, b) => a.localeCompare(b, "it"));

  // Stato filtri (in memoria, ridisegno senza ricaricare)
  const filtri = { persona: "", tipo: "tutto" };

  function filtra() {
    return tutti.filter(r => {
      if (filtri.persona && (r.nome || "(senza nome)") !== filtri.persona) return false;
      const isAz = (r.route || "").startsWith("azione:");
      if (filtri.tipo === "nav" && (r.route === ROUTE_STORICO || isAz)) return false;
      if (filtri.tipo === "aperture" && r.route !== ROUTE_STORICO) return false;
      if (filtri.tipo === "az" && !isAz) return false;
      return true;
    });
  }

  function htmlRiepilogo(accessi) {
    const perUtente = new Map();
    for (const r of accessi) {
      const k = r.user_id || r.nome || "?";
      if (!perUtente.has(k)) perUtente.set(k, { nome: r.nome || "(senza nome)", ultimo: r.created_at, device: deviceLabel(r.user_agent), tot: 0, nav: 0, aperture: 0, rotte: {} });
      const u = perUtente.get(k);
      u.tot++;
      if (r.route === ROUTE_STORICO) { u.aperture++; }
      else if ((r.route || "").startsWith("azione:")) { u.az = (u.az || 0) + 1; }
      else { u.nav++; u.rotte[r.route] = (u.rotte[r.route] || 0) + 1; }
    }
    return [...perUtente.values()]
      .sort((a, b) => new Date(b.ultimo) - new Date(a.ultimo))
      .map(u => {
        const top = Object.entries(u.rotte).sort((a, b) => b[1] - a[1]).slice(0, 5)
          .map(([r, n]) => esc(r) + " (" + n + ")").join(" · ");
        return `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
              <div style="font-weight:700;color:#0f172a;">${esc(u.nome)}</div>
              <div style="font-size:12px;color:#64748b;">${esc(u.device)} · ultimo: ${fmtOra(u.ultimo)}</div>
            </div>
            <div style="font-size:12px;color:#475569;margin-top:6px;">
              ${u.nav} pagine navigate · ⚡ ${u.az || 0} azioni · 🕓 ${u.aperture} aperture app
            </div>
            <div style="font-size:12px;color:#475569;margin-top:4px;">
              ${top ? "Pagine più viste: " + top : "<span style='color:#94a3b8'>Nessuna navigazione dettagliata (il tracciamento pagine parte dal 31/07)</span>"}
            </div>
          </div>`;
      }).join("");
  }

  function htmlTabella(accessi) {
    return accessi.slice(0, 500).map(r => {
      const storico = r.route === ROUTE_STORICO;
      const isAz = (r.route || "").startsWith("azione:");
      let cella;
      if (storico) cella = "<span style='color:#94a3b8'>🕓 app aperta</span>";
      else if (isAz) cella = "⚡ " + esc(r.route.slice(8)) + (r.hash ? " <span style='color:#64748b'>— " + esc(r.hash) + "</span>" : "");
      else cella = "📄 " + esc(r.route);
      return `
        <tr style="border-bottom:1px solid #f1f5f9;${storico ? "opacity:.65;" : ""}">
          <td style="padding:6px 10px;white-space:nowrap;">${fmtOra(r.created_at)}</td>
          <td style="padding:6px 10px;">${esc(r.nome)}</td>
          <td style="padding:6px 10px;">${cella}</td>
          <td style="padding:6px 10px;color:#64748b;">${esc(deviceLabel(r.user_agent))}</td>
        </tr>`;
    }).join("");
  }

  function disegna() {
    const accessi = filtra();
    const boxR = container.querySelector("#acc-riepilogo");
    const boxT = container.querySelector("#acc-tbody");
    const boxN = container.querySelector("#acc-count");
    if (boxR) boxR.innerHTML = htmlRiepilogo(accessi) || "<div style='color:#64748b'>Nessun accesso con questi filtri.</div>";
    if (boxT) boxT.innerHTML = htmlTabella(accessi);
    if (boxN) boxN.textContent = accessi.length + " eventi";
  }

  const optPersone = nomi.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("");

  container.innerHTML = `
    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:900px;margin:0 auto;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
          <div style="width:40px;height:40px;background:#0E5A7A;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">👁️</div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">Accessi app</div>
            <div style="font-size:13px;color:#64748b;">Ultimi ${giorni} giorni · <span id="acc-count">${tutti.length} eventi</span></div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 6px;">
          <select id="acc-giorni" class="input" style="width:auto;padding:4px 8px;">
            <option value="7"${giorni === 7 ? " selected" : ""}>Ultimi 7 giorni</option>
            <option value="30"${giorni === 30 ? " selected" : ""}>Ultimi 30 giorni</option>
            <option value="60"${giorni === 60 ? " selected" : ""}>Ultimi 60 giorni</option>
            <option value="90"${giorni === 90 ? " selected" : ""}>Ultimi 90 giorni</option>
          </select>
          <select id="acc-persona" class="input" style="width:auto;padding:4px 8px;">
            <option value="">👥 Tutti i dipendenti</option>
            ${optPersone}
          </select>
          <select id="acc-tipo" class="input" style="width:auto;padding:4px 8px;">
            <option value="tutto">Tutto</option>
            <option value="nav">📄 Solo pagine navigate</option>
            <option value="az">⚡ Solo azioni (timbrature, ricette, menu…)</option>
            <option value="aperture">🕓 Solo aperture app (storico)</option>
          </select>
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">🕓 app aperta = storico sessioni (da aprile) · ⚡ azioni = timbrature (da novembre), ricette, menu, lotti, ferie · 📄 pagine navigate dal 31/07 in poi.</div>

        <div style="font-size:14px;font-weight:700;color:#0f172a;margin:14px 0 8px;">Per persona</div>
        <div id="acc-riepilogo" style="display:grid;gap:10px;margin-bottom:22px;"></div>

        <div style="font-size:14px;font-weight:700;color:#0f172a;margin:14px 0 8px;">Cronologia (ultime 500)</div>
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
            <tbody id="acc-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  disegna();

  container.querySelector("#acc-giorni")?.addEventListener("change", (e) => {
    window.location.hash = "#/accessi-app?giorni=" + e.target.value;
  });
  container.querySelector("#acc-persona")?.addEventListener("change", (e) => {
    filtri.persona = e.target.value; disegna();
  });
  container.querySelector("#acc-tipo")?.addEventListener("change", (e) => {
    filtri.tipo = e.target.value; disegna();
  });
}
