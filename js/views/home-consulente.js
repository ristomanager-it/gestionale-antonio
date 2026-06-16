// js/views/home-consulente.js

export async function render(container) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const aziendaNome = window.state?.azienda?.nome || "";
  const user = window.state?.user;
  const nomeUtente = window.state?.profilo?.nome_completo
    || user?.user_metadata?.nome_completo
    || user?.email
    || "Consulente";

  container.innerHTML = `
    <div class="view" style="padding:24px;max-width:1100px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div>
          <h1 style="font-size:22px;font-weight:700;margin-bottom:4px">👋 Ciao, ${escHtml(nomeUtente)}</h1>
          <p style="color:#64748b;font-size:14px">Pannello Consulente del Lavoro — ${escHtml(aziendaNome)}</p>
        </div>
        <span style="background:#e0f2fe;color:#0369a1;font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px">👨‍💼 Consulente del Lavoro</span>
      </div>
      <div id="cons-content">
        <div style="display:flex;align-items:center;justify-content:center;padding:60px">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;

  if (!aziendaId || !supabase) {
    document.getElementById("cons-content").innerHTML =
      `<div class="alert alert-danger">Sessione non valida. Ricarica la pagina.</div>`;
    return;
  }

  try {
    await loadData(supabase, aziendaId);
  } catch(e) {
    console.error("home-consulente error:", e);
    document.getElementById("cons-content").innerHTML =
      `<div class="alert alert-danger">Errore caricamento dati: ${e.message}</div>`;
  }
}

async function loadData(supabase, aziendaId) {
  const oggi = new Date();
  const oggiStr = oggi.toISOString().split("T")[0];
  const meseInizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString().split("T")[0];
  const tra30 = new Date(oggi.getTime() + 30 * 86400000).toISOString().split("T")[0];

  const [
    { count: totDip },
    { count: ferieAtt },
    { count: docScad },
    { data: timb },
    { data: ferieList },
    { data: docList },
  ] = await Promise.all([
    supabase.from("dipendenti").select("*", { count: "exact", head: true }).eq("azienda_id", aziendaId).eq("attivo", true),
    supabase.from("hr_richieste").select("*", { count: "exact", head: true }).eq("azienda_id", aziendaId).eq("stato", "in_attesa"),
    supabase.from("hr_documenti").select("*", { count: "exact", head: true }).eq("azienda_id", aziendaId).gte("data_scadenza", oggiStr).lte("data_scadenza", tra30),
    supabase.from("timbrature").select("ore_lavorate").eq("azienda_id", aziendaId).gte("timestamp", meseInizio + "T00:00:00"),
    supabase.from("hr_richieste").select("id,tipo,data_inizio,data_fine,stato,dipendenti(nome,cognome)").eq("azienda_id", aziendaId).eq("stato", "in_attesa").order("created_at", { ascending: false }).limit(8),
    supabase.from("hr_documenti").select("id,tipo,nome_file,data_scadenza,dipendenti(nome,cognome)").eq("azienda_id", aziendaId).gte("data_scadenza", oggiStr).lte("data_scadenza", tra30).order("data_scadenza", { ascending: true }).limit(8),
  ]);

  const oreMese = (timb || []).reduce((s, r) => s + (parseFloat(r.ore_lavorate) || 0), 0);

  const kpis = [
    { icon: "👨‍💼", label: "Dipendenti attivi", value: totDip ?? 0, color: "#0E5A7A", route: "dipendenti" },
    { icon: "🕒", label: "Ore questo mese", value: oreMese.toFixed(1), color: "#0891b2", route: "timbrature" },
    { icon: "📆", label: "Ferie in attesa", value: ferieAtt ?? 0, color: (ferieAtt ?? 0) > 0 ? "#d97706" : "#16a34a", route: "hr-admin" },
    { icon: "📁", label: "Doc. in scadenza (30gg)", value: docScad ?? 0, color: (docScad ?? 0) > 0 ? "#dc2626" : "#16a34a", route: "hr-documenti" },
  ];

  const accessi = [
    { icon: "👨‍💼", label: "Dipendenti", route: "dipendenti" },
    { icon: "➕", label: "Nuovo dipendente", route: "crea-dipendente" },
    { icon: "🕒", label: "Timbrature", route: "timbrature" },
    { icon: "📆", label: "Gestione ferie", route: "hr-admin" },
    { icon: "👤", label: "Fascicolo HR", route: "hr-fascicolo" },
    { icon: "📁", label: "Documenti HR", route: "hr-documenti" },
  ];

  const el = document.getElementById("cons-content");
  if (!el) return;

  el.innerHTML = `
    <!-- KPI -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:22px">
      ${kpis.map(k => `
        <div class="card" style="border-left:4px solid ${k.color};cursor:pointer" onclick="location.hash='#/${k.route}'">
          <div class="card-body" style="display:flex;align-items:center;gap:14px">
            <div style="font-size:32px">${k.icon}</div>
            <div>
              <div style="font-size:26px;font-weight:800;color:${k.color};line-height:1">${k.value}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px">${k.label}</div>
            </div>
          </div>
        </div>`).join("")}
    </div>

    <!-- ACCESSO RAPIDO -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><h3>⚡ Accesso rapido</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
          ${accessi.map(a => `
            <button onclick="location.hash='#/${a.route}'"
              style="display:flex;flex-direction:column;align-items:center;gap:7px;padding:16px 8px;
                     border:1.5px solid #e5e7eb;border-radius:12px;background:#fff;cursor:pointer;
                     font-size:12px;font-weight:600;color:#374151">
              <span style="font-size:24px">${a.icon}</span>${a.label}
            </button>`).join("")}
        </div>
      </div>
    </div>

    <!-- FERIE IN ATTESA -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3>📆 Ferie / Permessi in attesa</h3>
        <button class="btn btn-sm btn-primary" onclick="location.hash='#/hr-admin'">Gestisci</button>
      </div>
      <div class="card-body" style="padding:0">
        ${!ferieList || ferieList.length === 0
          ? `<div style="padding:20px;text-align:center;color:#94a3b8">Nessuna richiesta in attesa ✅</div>`
          : `<div style="overflow-x:auto"><table class="table" style="margin:0;min-width:500px">
              <thead><tr><th>Dipendente</th><th>Tipo</th><th>Dal</th><th>Al</th></tr></thead>
              <tbody>${ferieList.map(r => {
                const nome = r.dipendenti ? `${r.dipendenti.nome || ""} ${r.dipendenti.cognome || ""}`.trim() : "—";
                return `<tr><td><strong>${escHtml(nome)}</strong></td><td>${escHtml(r.tipo || "—")}</td><td>${r.data_inizio || "—"}</td><td>${r.data_fine || "—"}</td></tr>`;
              }).join("")}</tbody>
            </table></div>`}
      </div>
    </div>

    <!-- DOCUMENTI IN SCADENZA -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3>📁 Documenti in scadenza (prossimi 30 gg)</h3>
        <button class="btn btn-sm btn-primary" onclick="location.hash='#/hr-documenti'">Tutti</button>
      </div>
      <div class="card-body" style="padding:0">
        ${!docList || docList.length === 0
          ? `<div style="padding:20px;text-align:center;color:#94a3b8">Nessun documento in scadenza ✅</div>`
          : `<div style="overflow-x:auto"><table class="table" style="margin:0;min-width:500px">
              <thead><tr><th>Dipendente</th><th>Tipo</th><th>File</th><th>Scade il</th></tr></thead>
              <tbody>${docList.map(d => {
                const nome = d.dipendenti ? `${d.dipendenti.nome || ""} ${d.dipendenti.cognome || ""}`.trim() : "—";
                const giorni = Math.round((new Date(d.data_scadenza) - oggi) / 86400000);
                const color = giorni <= 7 ? "#dc2626" : giorni <= 14 ? "#d97706" : "#16a34a";
                return `<tr>
                  <td><strong>${escHtml(nome)}</strong></td>
                  <td>${escHtml(d.tipo || "—")}</td>
                  <td style="font-size:12px;color:#64748b">${escHtml(d.nome_file || "—")}</td>
                  <td><span style="color:${color};font-weight:700">${d.data_scadenza} (${giorni}gg)</span></td>
                </tr>`;
              }).join("")}</tbody>
            </table></div>`}
      </div>
    </div>
  `;
}

function escHtml(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
