// js/views/home-commercialista.js

export async function render(container) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const aziendaNome = window.state?.azienda?.nome || "";
  const user = window.state?.user;
  const nomeUtente = window.state?.profilo?.nome_completo
    || user?.user_metadata?.nome_completo
    || user?.email
    || "Commercialista";

  container.innerHTML = `
    <div class="view" style="padding:24px;max-width:1100px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div>
          <h1 style="font-size:22px;font-weight:700;margin-bottom:4px">👋 Ciao, ${escHtml(nomeUtente)}</h1>
          <p style="color:#64748b;font-size:14px">Pannello Commercialista — ${escHtml(aziendaNome)}</p>
        </div>
        <span style="background:#ede9fe;color:#6d28d9;font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px">📊 Commercialista</span>
      </div>
      <div id="comm-content">
        <div style="display:flex;align-items:center;justify-content:center;padding:60px">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;

  if (!aziendaId || !supabase) {
    document.getElementById("comm-content").innerHTML =
      `<div class="alert alert-danger">Sessione non valida. Ricarica la pagina.</div>`;
    return;
  }

  try {
    await loadData(supabase, aziendaId);
  } catch(e) {
    console.error("home-commercialista error:", e);
    document.getElementById("comm-content").innerHTML =
      `<div class="alert alert-danger">Errore caricamento dati: ${e.message}</div>`;
  }
}

async function loadData(supabase, aziendaId) {
  const oggi = new Date();
  const oggiStr = oggi.toISOString().split("T")[0];
  const meseInizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString().split("T")[0];
  const meseFine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0).toISOString().split("T")[0];
  const tra30 = new Date(oggi.getTime() + 30 * 86400000).toISOString().split("T")[0];

  const [
    { data: fattureRaw },
    { data: scadenzeProssime },
    { data: fattureDaPagare },
    { data: acquistiBilancio },
  ] = await Promise.all([
    supabase.from("fatture_acquisto").select("imponibile,iva,totale,stato").eq("azienda_id", aziendaId).gte("data_documento", meseInizio).lte("data_documento", meseFine),
    supabase.from("fatture_acquisto_scadenze")
      .select("importo_scadenza,data_scadenza,fatture_acquisto(numero_documento,fornitori(ragione_sociale))")
      .eq("azienda_id", aziendaId).gte("data_scadenza", oggiStr).lte("data_scadenza", tra30)
      .order("data_scadenza", { ascending: true }).limit(10),
    supabase.from("fatture_acquisto")
      .select("id,numero_documento,data_documento,totale,fornitori(ragione_sociale)")
      .eq("azienda_id", aziendaId).eq("stato", "da_pagare")
      .order("data_documento", { ascending: false }).limit(10),
    supabase.from("fatture_acquisto")
      .select("totale,categorie_bilancio(nome)")
      .eq("azienda_id", aziendaId).gte("data_documento", meseInizio),
  ]);

  const totImponibile = (fattureRaw || []).reduce((s, f) => s + (parseFloat(f.imponibile) || 0), 0);
  const totIva = (fattureRaw || []).reduce((s, f) => s + (parseFloat(f.iva) || 0), 0);
  const totFatture = (fattureRaw || []).length;
  const totScadenze = (scadenzeProssime || []).reduce((s, r) => s + (parseFloat(r.importo_scadenza) || 0), 0);
  const totDaPagare = (fattureDaPagare || []).reduce((s, f) => s + (parseFloat(f.totale) || 0), 0);

  const catMap = {};
  (acquistiBilancio || []).forEach(r => {
    const cat = r.categorie_bilancio?.nome || "Non classificato";
    catMap[cat] = (catMap[cat] || 0) + (parseFloat(r.totale) || 0);
  });
  const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const totCat = catSorted.reduce((s, [, v]) => s + v, 0);

  const fmt = v => "€" + parseFloat(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const kpis = [
    { icon: "🧾", label: "Fatture questo mese", value: totFatture, color: "#0E5A7A", route: "acquisti" },
    { icon: "💶", label: "Imponibile mese", value: fmt(totImponibile), color: "#0891b2", route: "acquisti" },
    { icon: "🏛️", label: "IVA mese", value: fmt(totIva), color: "#7c3aed", route: "bo-bilancio" },
    { icon: "⚠️", label: "Da pagare", value: fmt(totDaPagare), color: totDaPagare > 0 ? "#dc2626" : "#16a34a", route: "acquisti" },
  ];

  const el = document.getElementById("comm-content");
  if (!el) return;

  el.innerHTML = `
    <!-- KPI -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:22px">
      ${kpis.map(k => `
        <div class="card" style="border-left:4px solid ${k.color};cursor:pointer" onclick="window.navigate && window.navigate('${k.route}')">
          <div class="card-body" style="display:flex;align-items:center;gap:14px">
            <div style="font-size:32px">${k.icon}</div>
            <div>
              <div style="font-size:${typeof k.value === 'number' ? '26px' : '20px'};font-weight:800;color:${k.color};line-height:1">${k.value}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px">${k.label}</div>
            </div>
          </div>
        </div>`).join("")}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

      <!-- ACCESSO RAPIDO -->
      <div class="card">
        <div class="card-header"><h3>⚡ Accesso rapido</h3></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
          ${[{icon:"📈",label:"Bilancio live",route:"bo-bilancio"},{icon:"🛒",label:"Acquisti e fatture",route:"acquisti"}].map(a => `
            <button onclick="window.navigate && window.navigate('${a.route}')"
              style="display:flex;align-items:center;gap:10px;padding:13px 16px;
                     border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;
                     cursor:pointer;font-size:13px;font-weight:600;color:#374151;text-align:left;width:100%">
              <span style="font-size:22px">${a.icon}</span>${a.label}
            </button>`).join("")}
        </div>
      </div>

      <!-- COSTI PER CATEGORIA -->
      <div class="card">
        <div class="card-header"><h3>📊 Costi per categoria (mese)</h3></div>
        <div class="card-body">
          ${catSorted.length === 0
            ? `<div style="color:#94a3b8;text-align:center;padding:16px">Nessun dato disponibile</div>`
            : catSorted.map(([cat, val]) => {
                const pct = totCat > 0 ? Math.round((val / totCat) * 100) : 0;
                return `<div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                    <span style="font-weight:600;color:#374151">${escHtml(cat)}</span>
                    <span style="color:#0E5A7A;font-weight:700">${fmt(val)}</span>
                  </div>
                  <div style="background:#f0f6fa;border-radius:999px;height:6px;overflow:hidden">
                    <div style="height:100%;background:#0E5A7A;border-radius:999px;width:${pct}%"></div>
                  </div>
                </div>`;
              }).join("")}
        </div>
      </div>
    </div>

    <!-- SCADENZE -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3>📅 Scadenze pagamento (30 gg) — ${fmt(totScadenze)}</h3>
        <button class="btn btn-sm btn-primary" onclick="window.navigate && window.navigate('acquisti')">Tutti</button>
      </div>
      <div class="card-body" style="padding:0">
        ${!scadenzeProssime || scadenzeProssime.length === 0
          ? `<div style="padding:20px;text-align:center;color:#94a3b8">Nessuna scadenza nei prossimi 30 giorni ✅</div>`
          : `<div style="overflow-x:auto"><table class="table" style="margin:0;min-width:500px">
              <thead><tr><th>Fornitore</th><th>N° Fattura</th><th>Scadenza</th><th>Importo</th></tr></thead>
              <tbody>${scadenzeProssime.map(s => {
                const forn = s.fatture_acquisto?.fornitori?.ragione_sociale || "—";
                const num = s.fatture_acquisto?.numero_documento || "—";
                const giorni = Math.round((new Date(s.data_scadenza) - oggi) / 86400000);
                const color = giorni <= 7 ? "#dc2626" : giorni <= 14 ? "#d97706" : "#374151";
                return `<tr>
                  <td><strong>${escHtml(forn)}</strong></td>
                  <td style="font-size:12px;color:#64748b">${escHtml(num)}</td>
                  <td><span style="color:${color};font-weight:700">${s.data_scadenza} (${giorni}gg)</span></td>
                  <td><strong>${fmt(s.importo_scadenza)}</strong></td>
                </tr>`;
              }).join("")}</tbody>
            </table></div>`}
      </div>
    </div>

    <!-- DA PAGARE -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3>⚠️ Fatture da pagare — ${fmt(totDaPagare)}</h3>
        <button class="btn btn-sm btn-primary" onclick="window.navigate && window.navigate('acquisti')">Gestisci</button>
      </div>
      <div class="card-body" style="padding:0">
        ${!fattureDaPagare || fattureDaPagare.length === 0
          ? `<div style="padding:20px;text-align:center;color:#94a3b8">Nessuna fattura da pagare ✅</div>`
          : `<div style="overflow-x:auto"><table class="table" style="margin:0;min-width:500px">
              <thead><tr><th>Fornitore</th><th>N° Documento</th><th>Data</th><th>Totale</th></tr></thead>
              <tbody>${fattureDaPagare.map(f => `<tr>
                <td><strong>${escHtml(f.fornitori?.ragione_sociale || "—")}</strong></td>
                <td style="font-size:12px;color:#64748b">${escHtml(f.numero_documento || "—")}</td>
                <td>${f.data_documento || "—"}</td>
                <td><strong style="color:#dc2626">${fmt(f.totale)}</strong></td>
              </tr>`).join("")}</tbody>
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
