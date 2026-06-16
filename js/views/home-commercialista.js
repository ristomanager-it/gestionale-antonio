// js/views/home-commercialista.js
import { createPageLayout } from "../utils/pageLayout.js";

function getSupabase() { return window.supabase; }

export async function render(container) {
  const supabase = getSupabase();
  const aziendaId = window.state?.azienda?.id;
  const nomeUtente = window.state?.user?.user_metadata?.nome ||
                     window.state?.profilo?.nome || "Commercialista";

  container.innerHTML = createPageLayout({
    title: `👋 Ciao, ${nomeUtente}`,
    subtitle: "Pannello Commercialista — " + (window.state?.azienda?.nome || ""),
    content: `<div id="comm-home-content">
      <div style="display:flex;align-items:center;justify-content:center;padding:60px 0;">
        <div class="spinner"></div>
      </div>
    </div>`
  });

  try {
    await loadCommHome(supabase, aziendaId);
  } catch(e) {
    console.error(e);
    document.getElementById("comm-home-content").innerHTML =
      `<div class="alert alert-danger">Errore caricamento dati.</div>`;
  }
}

async function loadCommHome(supabase, aziendaId) {
  const oggi = new Date();
  const meseInizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString().split("T")[0];
  const meseFine = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0).toISOString().split("T")[0];
  const oggiStr = oggi.toISOString().split("T")[0];
  const tra30 = new Date(oggi.getTime() + 30 * 86400000).toISOString().split("T")[0];

  const [
    { data: fattureRaw },
    { data: scadenzeProssime },
    { data: fattureDaPagare },
    { data: acquistiBilancio },
  ] = await Promise.all([
    // Fatture del mese corrente
    supabase.from("fatture_acquisto")
      .select("imponibile,iva,totale,stato,data_documento,aliquota_iva")
      .eq("azienda_id", aziendaId)
      .gte("data_documento", meseInizio)
      .lte("data_documento", meseFine),
    // Scadenze pagamento prossime 30gg
    supabase.from("fatture_acquisto_scadenze")
      .select("importo_scadenza,data_scadenza,fatture_acquisto(numero_documento,fornitori(ragione_sociale))")
      .eq("azienda_id", aziendaId)
      .gte("data_scadenza", oggiStr)
      .lte("data_scadenza", tra30)
      .order("data_scadenza", { ascending: true })
      .limit(10),
    // Fatture non pagate
    supabase.from("fatture_acquisto")
      .select("id,numero_documento,data_documento,totale,fornitori(ragione_sociale)")
      .eq("azienda_id", aziendaId)
      .eq("stato", "da_pagare")
      .order("data_documento", { ascending: false })
      .limit(10),
    // Acquisti per categoria questo mese
    supabase.from("fatture_acquisto")
      .select("totale,categorie_bilancio(nome)")
      .eq("azienda_id", aziendaId)
      .gte("data_documento", meseInizio),
  ]);

  const totImponibile = (fattureRaw || []).reduce((s, f) => s + (parseFloat(f.imponibile) || 0), 0);
  const totIva = (fattureRaw || []).reduce((s, f) => s + (parseFloat(f.iva) || 0), 0);
  const totFatture = (fattureRaw || []).length;
  const totScadenze = (scadenzeProssime || []).reduce((s, r) => s + (parseFloat(r.importo_scadenza) || 0), 0);
  const totDaPagare = (fattureDaPagare || []).reduce((s, f) => s + (parseFloat(f.totale) || 0), 0);

  const fmt = v => "€" + parseFloat(v || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const kpis = [
    { icon: "🧾", label: "Fatture questo mese", value: totFatture, route: "acquisti", color: "#0E5A7A" },
    { icon: "💶", label: "Imponibile mese", value: fmt(totImponibile), route: "acquisti", color: "#0891b2" },
    { icon: "🏛️", label: "IVA mese", value: fmt(totIva), route: "bo-bilancio", color: "#7c3aed" },
    { icon: "⚠️", label: "Da pagare", value: fmt(totDaPagare), route: "acquisti", color: totDaPagare > 0 ? "#dc2626" : "#16a34a" },
  ];

  const accessi = [
    { icon: "📈", label: "Bilancio live", route: "bo-bilancio" },
    { icon: "🛒", label: "Acquisti", route: "acquisti" },
  ];

  // Categorie acquisti
  const catMap = {};
  (acquistiBilancio || []).forEach(r => {
    const cat = r.categorie_bilancio?.nome || "Non classificato";
    catMap[cat] = (catMap[cat] || 0) + (parseFloat(r.totale) || 0);
  });
  const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totCat = catSorted.reduce((s, [, v]) => s + v, 0);

  const html = `
    <!-- KPI -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
      ${kpis.map(k => `
        <div class="card" style="cursor:pointer;border-left:4px solid ${k.color}" onclick="window.navigate('${k.route}')">
          <div class="card-body" style="display:flex;align-items:center;gap:14px;padding:16px;">
            <div style="font-size:32px;line-height:1">${k.icon}</div>
            <div>
              <div style="font-size:${typeof k.value === 'string' ? '20px' : '28px'};font-weight:800;color:${k.color};line-height:1">${k.value}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px">${k.label}</div>
            </div>
          </div>
        </div>`).join("")}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">

      <!-- ACCESSO RAPIDO -->
      <div class="card">
        <div class="card-header"><h3>⚡ Accesso rapido</h3></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${accessi.map(a => `
              <button onclick="window.navigate('${a.route}')"
                style="display:flex;align-items:center;gap:10px;padding:14px 16px;
                       border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;
                       font-size:14px;font-weight:600;color:#374151;text-align:left;width:100%"
                onmouseover="this.style.borderColor='#0E5A7A';this.style.background='#f0f6fa'"
                onmouseout="this.style.borderColor='#e5e7eb';this.style.background='#fff'">
                <span style="font-size:22px">${a.icon}</span>${a.label}
              </button>`).join("")}
          </div>
        </div>
      </div>

      <!-- ACQUISTI PER CATEGORIA -->
      <div class="card">
        <div class="card-header"><h3>📊 Costi per categoria (mese)</h3></div>
        <div class="card-body" style="padding:12px 16px">
          ${catSorted.length === 0
            ? `<div style="color:#94a3b8;text-align:center;padding:20px">Nessun dato</div>`
            : catSorted.map(([cat, val]) => {
                const pct = totCat > 0 ? Math.round((val / totCat) * 100) : 0;
                return `<div style="margin-bottom:10px">
                  <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
                    <span style="font-weight:600">${cat}</span>
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

    <!-- SCADENZE PROSSIME 30GG -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3>📅 Scadenze pagamento (prossimi 30 gg) — Totale: ${fmt(totScadenze)}</h3>
        <button class="btn btn-sm btn-primary" onclick="window.navigate('acquisti')">Tutti</button>
      </div>
      <div class="card-body" style="padding:0">
        ${!scadenzeProssime || scadenzeProssime.length === 0
          ? `<div style="padding:20px;text-align:center;color:#94a3b8">Nessuna scadenza nei prossimi 30 giorni ✅</div>`
          : `<table class="table" style="margin:0">
              <thead><tr><th>Fornitore</th><th>N° Fattura</th><th>Scadenza</th><th>Importo</th></tr></thead>
              <tbody>
                ${scadenzeProssime.map(s => {
                  const forn = s.fatture_acquisto?.fornitori?.ragione_sociale || "—";
                  const num = s.fatture_acquisto?.numero_documento || "—";
                  const giorni = Math.round((new Date(s.data_scadenza) - oggi) / 86400000);
                  const color = giorni <= 7 ? "#dc2626" : giorni <= 14 ? "#d97706" : "#374151";
                  return `<tr>
                    <td><strong>${forn}</strong></td>
                    <td style="font-size:12px;color:#64748b">${num}</td>
                    <td><span style="color:${color};font-weight:700">${s.data_scadenza} (${giorni}gg)</span></td>
                    <td><strong>${fmt(s.importo_scadenza)}</strong></td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>`}
      </div>
    </div>

    <!-- FATTURE DA PAGARE -->
    <div class="card">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between">
        <h3>⚠️ Fatture da pagare — Totale: ${fmt(totDaPagare)}</h3>
        <button class="btn btn-sm btn-primary" onclick="window.navigate('acquisti')">Gestisci</button>
      </div>
      <div class="card-body" style="padding:0">
        ${!fattureDaPagare || fattureDaPagare.length === 0
          ? `<div style="padding:20px;text-align:center;color:#94a3b8">Nessuna fattura da pagare ✅</div>`
          : `<table class="table" style="margin:0">
              <thead><tr><th>Fornitore</th><th>N° Documento</th><th>Data</th><th>Totale</th></tr></thead>
              <tbody>
                ${fattureDaPagare.map(f => `<tr>
                  <td><strong>${f.fornitori?.ragione_sociale || "—"}</strong></td>
                  <td style="font-size:12px;color:#64748b">${f.numero_documento || "—"}</td>
                  <td>${f.data_documento || "—"}</td>
                  <td><strong style="color:#dc2626">${fmt(f.totale)}</strong></td>
                </tr>`).join("")}
              </tbody>
            </table>`}
      </div>
    </div>
  `;

  document.getElementById("comm-home-content").innerHTML = html;
}
