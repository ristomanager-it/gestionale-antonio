/* =========================================================
   PRODUTTIVITÀ & COSTO LAVORO — analisi produzioni (management)
   Silenziosa: calcola dai timestamp delle firme di fase.
   - Durata fase = firma fase - firma fase precedente (la prima = apertura lotto)
   - Costo lavoro = minuti-lavoro × costo_orario/60 (le fasi 'attesa' non sono lavoro)
   ========================================================= */

let righeCache = [];

const PASSIVE = new Set(["attesa", "raffreddamento"]);

export async function render(app) {
  const azienda = window.state?.azienda;
  const oggi = new Date();
  const daDef = new Date(oggi.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const alDef = oggi.toISOString().slice(0, 10);

  app.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:16px;">
      <h1 style="margin:0 0 4px;font-size:22px;">📊 Produttività & costo lavoro</h1>
      <div style="color:#64748b;font-size:13px;margin-bottom:16px;">${escapeHtml(azienda?.nome || "")} — medie delle lavorazioni e costo reale di produzione</div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:end;">
        <div><label style="font-size:12px;color:#64748b;display:block;">Dal</label><input id="pp-dal" type="date" class="input" value="${daDef}"></div>
        <div><label style="font-size:12px;color:#64748b;display:block;">Al</label><input id="pp-al" type="date" class="input" value="${alDef}"></div>
        <button id="pp-carica" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 18px;font-weight:600;cursor:pointer;">Aggiorna</button>
      </div>

      <div id="pp-body"><div style="color:#64748b;">Caricamento...</div></div>
    </div>
  `;
  document.getElementById("pp-carica")?.addEventListener("click", carica);
  await carica();
}

async function carica() {
  const body = document.getElementById("pp-body");
  const aziendaId = window.state.azienda.id;
  const dal = document.getElementById("pp-dal")?.value;
  const al = document.getElementById("pp-al")?.value;

  // lotti chiusi nel periodo
  let q = window.supabaseClient.from("produzione_lotti")
    .select("id, lotto_uuid, ricetta_id, created_at, data_produzione, quantita_output, ricette(nome)")
    .eq("azienda_id", aziendaId).in("stato", ["firmato", "chiuso"]).order("data_produzione", { ascending: false }).limit(500);
  if (dal) q = q.gte("data_produzione", dal);
  if (al) q = q.lte("data_produzione", al);
  const { data: lotti } = await q;

  if (!lotti || !lotti.length) { body.innerHTML = vuoto(); return; }

  const uuids = lotti.map(l => l.lotto_uuid).filter(Boolean);
  const ricetteIds = [...new Set(lotti.map(l => l.ricetta_id).filter(Boolean))];

  const [{ data: haccp }, { data: fasiMeta }, { data: dip }] = await Promise.all([
    window.supabaseClient.from("produzione_log_haccp")
      .select("lotto_id, ricetta_id, fase_id, fase_ordine, fase_nome, fase_tipo, operatore_id, operatore_nome, firmato_il, firme")
      .in("lotto_id", uuids),
    window.supabaseClient.from("ricette_preparazione_fasi")
      .select("id, lavoro_umano_min, durata_min, tipo_fase").in("ricetta_id", ricetteIds),
    window.supabaseClient.from("dipendenti").select("id, nome, costo_orario").eq("azienda_id", aziendaId),
  ]);

  const metaById = new Map((fasiMeta || []).map(f => [String(f.id), f]));
  const costoById = new Map((dip || []).map(d => [String(d.id), Number(d.costo_orario) || 0]));
  const lottoById = new Map(lotti.map(l => [l.lotto_uuid, l]));

  // raggruppa fasi per lotto, ordinate
  const perLotto = {};
  (haccp || []).forEach(h => { (perLotto[h.lotto_id] = perLotto[h.lotto_id] || []).push(h); });

  const righe = [];
  for (const uuid in perLotto) {
    const lotto = lottoById.get(uuid);
    if (!lotto) continue;
    const fasi = perLotto[uuid].slice().sort((a, b) => (a.fase_ordine || 0) - (b.fase_ordine || 0));
    let prevTs = lotto.created_at ? new Date(lotto.created_at).getTime() : null;
    fasi.forEach(f => {
      const end = f.firmato_il ? new Date(f.firmato_il).getTime() : null;
      let durataMin = (end && prevTs) ? Math.max(0, Math.round((end - prevTs) / 60000)) : null;
      if (end) prevTs = end;
      const meta = metaById.get(String(f.fase_id)) || {};
      const passive = PASSIVE.has((f.fase_tipo || "").toLowerCase());
      // minuti-lavoro: attesa/raffreddamento = lavoro umano previsto (di solito ~0), altrimenti durata reale
      let lavoroMin = passive ? (Number(meta.lavoro_umano_min) || 0) : (durataMin ?? Number(meta.lavoro_umano_min) || 0);
      // ogni firmatario della fase ha lavorato la fase intera: costo = somma delle ore-uomo
      const firmatari = (Array.isArray(f.firme) && f.firme.length)
        ? f.firme
        : [{ operatore_id: f.operatore_id, operatore_nome: f.operatore_nome }];
      firmatari.forEach(sig => {
        const costoOrario = costoById.get(String(sig.operatore_id)) || 0;
        righe.push({
          lotto_uuid: uuid, ricetta_id: lotto.ricetta_id, ricetta: lotto.ricette?.nome || "Ricetta",
          fase_nome: f.fase_nome, fase_tipo: f.fase_tipo, operatore_id: sig.operatore_id, operatore: sig.operatore_nome || "—",
          durata_min: durataMin, durata_prevista: Number(meta.durata_min) || null, lavoro_min: lavoroMin, costo_lavoro: lavoroMin * costoOrario / 60,
        });
      });
    });
  }
  righeCache = righe;
  render_(body, lotti, righe);
}

function render_(body, lotti, righe) {
  // Aggregati
  const perRicetta = {};
  const perOperatore = {};
  const perLotto = {};
  righe.forEach(r => {
    const ric = perRicetta[r.ricetta] = perRicetta[r.ricetta] || { n: new Set(), lavoro: 0, costo: 0 };
    ric.n.add(r.lotto_uuid); ric.lavoro += (r.lavoro_min || 0); ric.costo += r.costo_lavoro;
    const op = perOperatore[r.operatore] = perOperatore[r.operatore] || { lavoro: 0, costo: 0, fasi: 0 };
    op.lavoro += (r.lavoro_min || 0); op.costo += r.costo_lavoro; op.fasi += 1;
    const lo = perLotto[r.lotto_uuid] = perLotto[r.lotto_uuid] || { costo: 0, lavoro: 0 };
    lo.costo += r.costo_lavoro; lo.lavoro += (r.lavoro_min || 0);
  });

  const costoTot = righe.reduce((s, r) => s + r.costo_lavoro, 0);
  const lavoroTot = righe.reduce((s, r) => s + (r.lavoro_min || 0), 0);

  const ricRows = Object.entries(perRicetta).sort((a, b) => b[1].costo - a[1].costo).map(([nome, v]) => {
    const nprod = v.n.size;
    return `<tr>
      <td style="padding:8px;">${escapeHtml(nome)}</td>
      <td style="padding:8px;text-align:center;">${nprod}</td>
      <td style="padding:8px;text-align:right;">${fmtMin(v.lavoro / nprod)}</td>
      <td style="padding:8px;text-align:right;">€ ${(v.costo / nprod).toFixed(2)}</td>
      <td style="padding:8px;text-align:right;font-weight:700;">€ ${v.costo.toFixed(2)}</td>
    </tr>`;
  }).join("");

  const opRows = Object.entries(perOperatore).sort((a, b) => b[1].costo - a[1].costo).map(([nome, v]) => `
    <tr>
      <td style="padding:8px;">${escapeHtml(nome)}</td>
      <td style="padding:8px;text-align:center;">${v.fasi}</td>
      <td style="padding:8px;text-align:right;">${fmtMin(v.lavoro)}</td>
      <td style="padding:8px;text-align:right;font-weight:700;">€ ${v.costo.toFixed(2)}</td>
    </tr>`).join("");

  body.innerHTML = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
      ${kpi("Produzioni", String(Object.keys(perLotto).length))}
      ${kpi("Ore-uomo totali", fmtMin(lavoroTot))}
      ${kpi("Costo lavoro totale", "€ " + costoTot.toFixed(2))}
      ${kpi("Costo medio / produzione", "€ " + (Object.keys(perLotto).length ? (costoTot / Object.keys(perLotto).length).toFixed(2) : "0.00"))}
    </div>

    <h2 style="font-size:15px;color:#0E5A7A;margin:16px 0 8px;">Per ricetta</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;background:white;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#f8fafc;"><th style="padding:8px;text-align:left;">Ricetta</th><th style="padding:8px;">Prod.</th><th style="padding:8px;text-align:right;">Ore-uomo medie</th><th style="padding:8px;text-align:right;">Costo medio</th><th style="padding:8px;text-align:right;">Costo tot.</th></tr></thead>
      <tbody>${ricRows || `<tr><td colspan="5" style="padding:12px;color:#64748b;">—</td></tr>`}</tbody>
    </table>

    <h2 style="font-size:15px;color:#0E5A7A;margin:20px 0 8px;">Per collaboratore</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;background:white;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead><tr style="background:#f8fafc;"><th style="padding:8px;text-align:left;">Collaboratore</th><th style="padding:8px;">Fasi</th><th style="padding:8px;text-align:right;">Ore-uomo</th><th style="padding:8px;text-align:right;">Costo lavoro</th></tr></thead>
      <tbody>${opRows || `<tr><td colspan="4" style="padding:12px;color:#64748b;">—</td></tr>`}</tbody>
    </table>

    <div style="font-size:11px;color:#94a3b8;margin-top:14px;">Durata fase calcolata dai timestamp delle firme. Le fasi di attesa/raffreddamento non contano come lavoro. Costo = ore-uomo × costo orario del collaboratore.</div>
  `;
}

function vuoto() {
  return `<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:24px;text-align:center;color:#64748b;">Nessuna produzione chiusa nel periodo. I dati compaiono man mano che le produzioni vengono completate e firmate.</div>`;
}
function kpi(label, val) {
  return `<div style="flex:1;min-width:160px;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b;">${escapeHtml(label)}</div>
    <div style="font-size:22px;font-weight:800;color:#0E5A7A;margin-top:4px;">${escapeHtml(val)}</div></div>`;
}
function fmtMin(m) { const v = Math.round(Number(m) || 0); if (v < 60) return v + " min"; return Math.floor(v / 60) + "h " + (v % 60) + "m"; }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
