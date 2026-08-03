const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

let gaugeChart = null;
let currentPeriod = "day";
let currentProducts = [];
let currentMetrics = null;

// Drill-down periodo corrente
let _drillFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
let _drillTo = new Date().toISOString().slice(0,10);

const PERIOD_LABELS = {
  day: "Giorno",
  week: "Settimana",
  month: "Mese",
  year: "Anno",
  custom: "Personalizzato"
};

/* =========================================================
   RENDER VIEW
========================================================= */


async function exportAcquistiCSV() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) return;
  const { data } = await supabase
    .from("magazzino_movimenti")
    .select("created_at, causale, quantita, costo, categorie_bilancio(nome), prodotti(nome, nome_interno)")
    .eq("azienda_id", aziendaId).eq("tipo_movimento", "carico").gt("costo", 0)
    .order("created_at", { ascending: false }).limit(5000);
  const { data: spese } = await supabase
    .from("spese_extra")
    .select("data, descrizione, importo, categorie_bilancio(nome)")
    .eq("azienda_id", aziendaId).order("data", { ascending: false });
  const rows = [["Data","Prodotto","Causale","Categoria","Quantita","Costo/kg","Totale"]];
  (data||[]).forEach(r => rows.push([
    new Date(r.created_at).toLocaleDateString("it-IT"),
    r.prodotti?.nome_interno||r.prodotti?.nome||"",
    r.causale||"",
    r.categorie_bilancio?.nome||"",
    String(r.quantita||0).replace(".",","),
    String(r.costo||0).replace(".",","),
    String(Math.round((r.quantita||0)*(r.costo||0)*100)/100).replace(".",",")
  ]));
  (spese||[]).forEach(r => rows.push([
    new Date(r.data).toLocaleDateString("it-IT"),
    r.descrizione||"","Spesa extra",
    r.categorie_bilancio?.nome||"","1",
    String(r.importo||0).replace(".",","),
    String(r.importo||0).replace(".",",")
  ]));
  const csv = rows.map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\n");
  const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download="acquisti_"+new Date().toISOString().slice(0,10)+".csv"; a.click();
  URL.revokeObjectURL(url);
}

async function openDrillDown(tipo, from, to) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) return;
  const titoli = {mp:"📦 Materie Prime",sf:"📋 Spese Fisse",cl:"👥 Costo Lavoro"};
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;";
  const box = document.createElement("div");
  box.style.cssText = "background:white;border-radius:16px;padding:24px;width:100%;max-width:700px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);";
  box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h3 style="margin:0;font-size:17px;">'+titoli[tipo]+'</h3><button id="close-drill" style="border:none;background:#f1f5f9;border-radius:8px;padding:8px 14px;cursor:pointer;">✕ Chiudi</button></div><div id="drill-body"><div style="text-align:center;padding:30px;color:#64748b;">Caricamento...</div></div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  box.querySelector("#close-drill").onclick = () => overlay.remove();
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  const el = box.querySelector("#drill-body");
  const f = from||_drillFrom; const t = to||_drillTo;
  try {
    if (tipo==="mp") {
      const {data} = await supabase.from("magazzino_movimenti")
        .select("created_at,quantita,costo,prodotti(nome,nome_interno)")
        .eq("azienda_id",aziendaId).eq("tipo_movimento","carico").gt("costo",0)
        .gte("created_at",f).lte("created_at",t+"T23:59:59")
        .in("categoria_bilancio_id",[3,7]).order("created_at",{ascending:false}).limit(200);
      const tot = (data||[]).reduce((s,r)=>s+(r.quantita||0)*(r.costo||0),0);
      el.innerHTML = '<div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;"><span style="color:#166534;font-weight:500;">Totale periodo</span><strong style="color:#166534;font-size:20px;">€'+Math.round(tot*100)/100+'</strong></div><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#f8fafc;"><th style="padding:8px;text-align:left;">Data</th><th style="padding:8px;text-align:left;">Prodotto</th><th style="padding:8px;text-align:right;">Qtà</th><th style="padding:8px;text-align:right;">Totale</th></tr></thead><tbody>'+(data||[]).map(r=>'<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px;color:#64748b;">'+new Date(r.created_at).toLocaleDateString("it-IT")+'</td><td style="padding:8px;">'+(r.prodotti?.nome_interno||r.prodotti?.nome||"")+'</td><td style="padding:8px;text-align:right;">'+Number(r.quantita||0).toFixed(2)+'</td><td style="padding:8px;text-align:right;font-weight:600;">€'+Math.round((r.quantita||0)*(r.costo||0)*100)/100+'</td></tr>').join("")+'</tbody></table>';
    } else if (tipo==="sf") {
      const {data} = await supabase.from("spese_extra")
        .select("data,descrizione,importo,categorie_bilancio(nome)")
        .eq("azienda_id",aziendaId).neq("categoria_bilancio_id",14)
        .gte("data",f).lte("data",t).order("data",{ascending:false});
      const tot = (data||[]).reduce((s,r)=>s+Number(r.importo||0),0);
      el.innerHTML = '<div style="background:#fffbeb;border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;"><span style="color:#92400e;font-weight:500;">Totale spese fisse</span><strong style="color:#92400e;font-size:20px;">€'+Math.round(tot*100)/100+'</strong></div>'+(!data?.length?'<div style="color:#64748b;text-align:center;padding:20px;">Nessuna spesa nel periodo</div>':'<table style="width:100%;border-collapse:collapse;font-size:13px;"><tbody>'+data.map(r=>'<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px;">'+new Date(r.data).toLocaleDateString("it-IT")+'</td><td style="padding:8px;">'+(r.descrizione||"")+'</td><td style="padding:8px;color:#64748b;">'+(r.categorie_bilancio?.nome||"")+'</td><td style="padding:8px;text-align:right;font-weight:600;">€'+Number(r.importo||0).toFixed(2)+'</td></tr>').join("")+'</tbody></table>');
    } else if (tipo==="cl") {
      const sedeDrill = window.state?.sedeAttiva?.id ?? null;
      let pqD = supabase.from("spese_extra").select("data,descrizione,importo").eq("azienda_id",aziendaId).eq("categoria_bilancio_id",14).gte("data",f).lte("data",t).order("data",{ascending:false});
      if (sedeDrill != null) pqD = pqD.or("sede_id.is.null,sede_id.eq." + sedeDrill);
      const {data:paghe} = await pqD;
      let tqD = supabase.from("timbrature").select("dipendente_id,dip_nome,ore_lavorate,costo_orario").eq("azienda_id",aziendaId).eq("tipo","fine_turno").gte("data_turno",f).lte("data_turno",t).limit(5000);
      if (sedeDrill != null) tqD = tqD.eq("sede_id", sedeDrill);
      const {data:timb} = await tqD;
      const {data:dips} = await supabase.from("dipendenti").select("id,costo_orario").eq("azienda_id",aziendaId);
      const costoDip = new Map((dips||[]).map(d=>[String(d.id),Number(d.costo_orario)||0]));
      const totP = (paghe||[]).reduce((s,r)=>s+Number(r.importo||0),0);
      const totT = (timb||[]).reduce((s,r)=>{
        const ore=Number(r.ore_lavorate||0);
        const co=Number(r.costo_orario)>0?Number(r.costo_orario):(costoDip.get(String(r.dipendente_id))||0);
        return s+ore*co;
      },0);
      el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;"><div style="background:#eff6ff;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:12px;color:#1d4ed8;margin-bottom:4px;">💳 Paghe</div><strong style="font-size:22px;color:#1d4ed8;">€'+totP.toFixed(2)+'</strong></div><div style="background:#f0fdf4;border-radius:10px;padding:14px;text-align:center;"><div style="font-size:12px;color:#166534;margin-bottom:4px;">⏱️ Timbrature</div><strong style="font-size:22px;color:#166534;">€'+totT.toFixed(2)+'</strong></div></div>'+(paghe?.length?'<table style="width:100%;border-collapse:collapse;font-size:13px;"><tbody>'+paghe.map(r=>'<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px;">'+new Date(r.data).toLocaleDateString("it-IT")+'</td><td style="padding:8px;">'+(r.descrizione||"")+'</td><td style="padding:8px;text-align:right;">€'+Number(r.importo).toFixed(2)+'</td></tr>').join("")+'</tbody></table>':'<div style="color:#64748b;font-size:13px;">Nessuna paga nel periodo</div>');
    }
  } catch(e) { el.innerHTML = '<div style="color:#dc2626;">Errore: '+e.message+'</div>'; }
}

export async function render(container) {
  const user = window.state?.user;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;

  destroyGauge();
  updateHeader(azienda, sede);
  hideLegacyTopbar();

  container.innerHTML = `
  <div class="view home-admin">
    <div class="home-grid">
      <section class="card admin-kpi-card">
        <div class="admin-kpi-top">
          <div>
            <div class="admin-saluto" id="home-saluto"></div>
            <div class="admin-utente" id="home-utente"></div>
          </div>

          <div class="admin-top-right">
            <div class="admin-data" id="home-data"></div>
            <div class="admin-meteo" id="home-weather">☁️</div>
          </div>
        </div>

        <div class="admin-filters">
          <div class="admin-filter-buttons">
            <button type="button" class="period-btn active" data-period="day">Giorno</button>
            <button type="button" class="period-btn" data-period="week">Settimana</button>
            <button type="button" class="period-btn" data-period="month">Mese</button>
            <button type="button" class="period-btn" data-period="year">Anno</button>

          </div>

          <div class="admin-filter-range">
            <label>
              <span>Dal</span>
              <input id="filter-from" type="date">
            </label>
            <label>
              <span>Al</span>
              <input id="filter-to" type="date">
            </label>
            <button type="button" id="apply-custom-range" class="range-btn">Applica</button>
          </div>
        </div>

        <div class="admin-period-label" id="period-label">Periodo: Giorno</div>

        <div class="admin-incasso-row" style="display:flex;gap:28px;flex-wrap:wrap;align-items:flex-end;">
          <div>
            <div class="admin-incasso-label">Incasso</div>
            <div class="admin-incasso-value" id="incassoTotale">€ 0</div>
            <div class="admin-incasso-iva">Con IVA <span id="incassoIva">€ 0</span></div>
          </div>
          <div>
            <div class="admin-incasso-label">Coperti</div>
            <div style="font-size:26px;font-weight:800;color:#0f172a;line-height:1.1;" id="copertiValore">0</div>
            <div class="admin-incasso-iva">medio <span id="copertoMedio">€ 0</span></div>
          </div>
        </div>

        <div class="admin-gauge-wrap">
          <canvas id="admin-gauge"></canvas>
        </div>

        <div class="admin-bep">
          BEP <span id="bepValore">€ 0</span>
        </div>

        <div class="admin-kpi-row">
          <div class="admin-kpi-col">
            <div class="admin-kpi-name">MP</div>
            <div class="admin-kpi-euro" id="materiaPrimaValore" style="cursor:pointer;text-decoration:underline dotted;" title="Clicca per dettaglio">€ 0</div>
            <div class="admin-kpi-perc" id="materiaPrimaPerc">0%</div>
            <div id="acquisti-breakdown" style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.6;"></div>
          </div>

          <div class="admin-kpi-col">
            <div class="admin-kpi-name">SF</div>
            <div class="admin-kpi-euro" id="speseFisseValore" style="cursor:pointer;text-decoration:underline dotted;" title="Clicca per dettaglio">€ 0</div>
            <div class="admin-kpi-perc" id="speseFissePerc">0%</div>
          </div>

          <div class="admin-kpi-col">
            <div class="admin-kpi-name">CL</div>
            <div class="admin-kpi-euro" id="costoLavoroValore" style="cursor:pointer;text-decoration:underline dotted;" title="Clicca per dettaglio">€ 0</div>
            <div class="admin-kpi-perc" id="costoLavoroPerc">0%</div>
          </div>

          <div class="admin-kpi-col admin-kpi-col-strong">
            <div class="admin-kpi-name">Margine</div>
            <div class="admin-kpi-euro" id="margineValore">€ 0</div>
            <div class="admin-kpi-perc" id="marginePerc">0%</div>
          </div>
        </div>
      </section>

      <section class="card admin-sales-card">
        <div class="admin-sales-head">
          <div>
            <h3>Prodotti venduti</h3>
            <div class="admin-sales-subtitle">Ordina l’elenco per KPI e filtra per categoria</div>
          </div>

          <div class="admin-sales-filters">
            <select id="sales-category-filter">
              <option value="all">Tutte le categorie</option>
            </select>

            <select id="sales-sort-filter">
              <option value="incasso">Incasso</option>
              <option value="numero">Numero</option>
              <option value="margine">Margine</option>
            </select>
          </div>
        </div>

        <div id="sales-list" class="admin-sales-list"></div>
      </section>
    </div>

    <section class="card" style="margin-top:16px;">
      <div style="font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px;">🔗 Accesso rapido</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;">
        <div onclick="location.hash='#/mansionario-sala'" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;text-align:center;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'" onmouseout="this.style.boxShadow='none'">
          <div style="font-size:26px;margin-bottom:6px;">🪑</div>
          <div style="font-size:13px;font-weight:700;">Mansionario Sala</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Procedure & formazione</div>
        </div>
        <div onclick="location.hash='#/dipendenti'" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;text-align:center;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'" onmouseout="this.style.boxShadow='none'">
          <div style="font-size:26px;margin-bottom:6px;">👥</div>
          <div style="font-size:13px;font-weight:700;">Brigata</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Gestione dipendenti</div>
        </div>
        <div onclick="location.hash='#/ricettario'" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;text-align:center;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'" onmouseout="this.style.boxShadow='none'">
          <div style="font-size:26px;margin-bottom:6px;">📖</div>
          <div style="font-size:13px;font-weight:700;">Ricettario</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Produzione & ricette</div>
        </div>
        <div onclick="location.hash='#/prenotazioni'" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;text-align:center;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'" onmouseout="this.style.boxShadow='none'">
          <div style="font-size:26px;margin-bottom:6px;">📅</div>
          <div style="font-size:13px;font-weight:700;">Prenotazioni</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Tavoli & servizi</div>
        </div>
        <div onclick="location.hash='#/magazzino'" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;text-align:center;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'" onmouseout="this.style.boxShadow='none'">
          <div style="font-size:26px;margin-bottom:6px;">📦</div>
          <div style="font-size:13px;font-weight:700;">Magazzino</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Giacenze & riordino</div>
        </div>
        <div onclick="location.hash='#/acquisti'" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;text-align:center;" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'" onmouseout="this.style.boxShadow='none'">
          <div style="font-size:26px;margin-bottom:6px;">🚚</div>
          <div style="font-size:13px;font-weight:700;">Acquisti</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px;">Ordini, fatture, fornitori</div>
        </div>
      </div>
    </section>
  </div>

  <style>
    .home-admin{
      padding:16px !important;
    }

    .home-grid{
      display:grid;
      grid-template-columns:1.2fr 0.9fr;
      gap:16px;
      align-items:start;
    }

    .admin-kpi-card,
    .admin-sales-card{
      padding:18px !important;
      border-radius:18px;
    }

    .admin-kpi-top{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:16px;
      margin-bottom:14px;
    }

    .admin-saluto{
      font-size:22px;
      line-height:1.1;
      font-weight:800;
      color:var(--color-text);
    }

    .admin-utente{
      margin-top:4px;
      font-size:13px;
      color:var(--color-text-muted);
    }

    .admin-top-right{
      text-align:right;
      display:flex;
      flex-direction:column;
      gap:4px;
      min-width:110px;
    }

    .admin-data{
      font-size:13px;
      color:var(--color-text-muted);
      font-weight:600;
    }

    .admin-meteo{
      font-size:16px;
      font-weight:700;
      color:var(--color-text);
    }

    .admin-filters{
      display:flex;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom:10px;
    }

    .admin-filter-buttons{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }

    .period-btn,
    .range-btn{
      border:none;
      background:#EEF2F7;
      color:var(--color-text);
      padding:8px 12px;
      border-radius:10px;
      font-size:13px;
      font-weight:700;
      cursor:pointer;
    }

    .period-btn.active{
      background:var(--color-primary);
      color:#fff;
    }

    .admin-filter-range{
      display:flex;
      align-items:end;
      gap:8px;
      flex-wrap:wrap;
    }

    .admin-filter-range label{
      display:flex;
      flex-direction:column;
      gap:4px;
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:700;
    }

    .admin-filter-range input{
      border:1px solid var(--color-border);
      background:#fff;
      border-radius:10px;
      padding:8px 10px;
      min-height:36px;
      font-size:13px;
    }

    .admin-period-label{
      font-size:13px;
      color:var(--color-text-muted);
      margin-bottom:14px;
      font-weight:700;
    }

    .admin-incasso-row{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      margin-bottom:12px;
    }

    .admin-incasso-label{
      font-size:12px;
      color:var(--color-text-muted);
      text-transform:uppercase;
      letter-spacing:0.4px;
      font-weight:700;
    }

    .admin-incasso-value{
      font-size:28px;
      line-height:1;
      font-weight:900;
      margin-top:4px;
      color:var(--color-text);
    }

    .admin-incasso-iva{
      margin-top:6px;
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:600;
    }

    .admin-gauge-wrap{
      position:relative;
      height:220px;
      margin:4px 0 6px;
    }

    .admin-bep{
      text-align:center;
      font-size:14px;
      font-weight:800;
      margin-bottom:16px;
      color:var(--color-text);
    }

    .admin-kpi-row{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:12px;
      align-items:start;
      text-align:center;
    }

    .admin-kpi-col{
      padding:0 4px;
    }

    .admin-kpi-col-strong .admin-kpi-euro,
    .admin-kpi-col-strong .admin-kpi-perc{
      color:var(--color-primary);
    }

    .admin-kpi-name{
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:800;
      text-transform:uppercase;
      letter-spacing:0.4px;
    }

    .admin-kpi-euro{
      margin-top:6px;
      font-size:18px;
      font-weight:800;
      color:var(--color-text);
      line-height:1.1;
    }

    .admin-kpi-perc{
      margin-top:4px;
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:700;
      line-height:1.1;
    }

    .admin-sales-head{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:16px;
      flex-wrap:wrap;
      margin-bottom:14px;
    }

    .admin-sales-head h3{
      margin:0;
      font-size:20px;
      line-height:1.1;
    }

    .admin-sales-subtitle{
      margin-top:4px;
      font-size:12px;
      color:var(--color-text-muted);
      font-weight:600;
    }

    .admin-sales-filters{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }

    .admin-sales-filters select{
      border:1px solid var(--color-border);
      background:#fff;
      border-radius:10px;
      padding:8px 10px;
      min-height:38px;
      font-size:13px;
      font-weight:700;
    }

    .admin-sales-list{
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .admin-sales-row{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:14px;
      border:none;
      border-bottom:1px solid var(--color-border);
      border-radius:0;
      padding:9px 2px;
      background:transparent;
    }

    .admin-sales-left{
      min-width:0;
      flex:1;
    }

    .admin-sales-name{
      font-size:14px;
      font-weight:600;
      color:var(--color-text);
      line-height:1.15;
    }

    .admin-sales-category{
      font-size:11px;
      color:var(--color-text-muted);
      font-weight:500;
      margin-top:2px;
    }

    .admin-sales-value-card{
      min-width:auto;
      padding:0 2px;
      border-radius:0;
      background:transparent;
      text-align:right;
      flex-shrink:0;
    }

    .admin-sales-value-label{
      font-size:10px;
      color:var(--color-text-muted);
      font-weight:600;
      text-transform:uppercase;
      letter-spacing:0.3px;
      line-height:1;
    }

    .admin-sales-value{
      margin-top:4px;
      font-size:14px;
      font-weight:700;
      color:var(--color-text);
      line-height:1.1;
    }

    @media (max-width: 1100px){
      .home-grid{
        grid-template-columns:1fr;
      }
    }

    @media (max-width: 767px){
      .home-admin{
        padding:12px !important;
      }

      .admin-kpi-card,
      .admin-sales-card{
        padding:14px !important;
      }

      .admin-saluto{
        font-size:18px;
      }

      .admin-gauge-wrap{
        height:180px;
      }

      .admin-kpi-row{
        grid-template-columns:repeat(2,1fr);
        gap:14px 10px;
      }

      .admin-sales-row{
        align-items:flex-start;
      }

      .admin-sales-value-card{
        min-width:92px;
      }
    }
  </style>
  `;

  initTopbar(user);
  initDateRangeDefaults();
  initPeriodFilter();
  initSalesFilters();
  hydrateWeather();
  await refreshDashboard("day");

  // Binding click KPI drill-down
  setTimeout(() => {
    document.getElementById("kpi-mp-click")?.addEventListener("click", () => openDrillDown("mp", _drillFrom, _drillTo));
    document.getElementById("kpi-sf-click")?.addEventListener("click", () => openDrillDown("sf", _drillFrom, _drillTo));
    document.getElementById("kpi-cl-click")?.addEventListener("click", () => openDrillDown("cl", _drillFrom, _drillTo));

  }, 300);
}

/* =========================================================
   HEADER / TOPBAR
========================================================= */

function hideLegacyTopbar() {
  const bar = document.querySelector(".topbar-info");
  if (bar) {
    bar.style.display = "none";
  }
}

function updateHeader(azienda, sede) {
  const box = document.getElementById("header-azienda-nome");

  if (!box) return;

  if (sede && sede.nome) {
    box.innerText = sede.nome;
    return;
  }

  if (azienda && azienda.nome) {
    box.innerText = azienda.nome;
    return;
  }

  box.innerText = "Ristoflow";
}

function initTopbar(user) {
  const salutoBox = document.getElementById("home-saluto");
  const utenteBox = document.getElementById("home-utente");
  const dataBox = document.getElementById("home-data");

  if (!salutoBox || !utenteBox || !dataBox) return;

  const ora = new Date().getHours();

  let saluto = "Buongiorno";
  if (ora >= 12 && ora < 18) saluto = "Buon pomeriggio";
  if (ora >= 18) saluto = "Buonasera";

  const email = user?.email || "";
  const nomeUtente = email ? email.split("@")[0] : "utente";

  salutoBox.innerText = saluto;
  utenteBox.innerText = nomeUtente;

  dataBox.innerText = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

/* =========================================================
   FILTERS
========================================================= */

function initDateRangeDefaults() {
  const fromInput = document.getElementById("filter-from");
  const toInput = document.getElementById("filter-to");

  if (!fromInput || !toInput) return;

  const today = new Date();
  const prior = new Date();
  prior.setDate(today.getDate() - 6);

  fromInput.value = toISODate(prior);
  toInput.value = toISODate(today);
}

function initPeriodFilter() {
  const buttons = Array.from(document.querySelectorAll(".period-btn"));
  const applyBtn = document.getElementById("apply-custom-range");

  buttons.forEach((btn) => {
    btn.onclick = async () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      await refreshDashboard(btn.dataset.period || "day");
    };
  });

  if (applyBtn) {
    applyBtn.onclick = async () => {
      buttons.forEach((b) => b.classList.remove("active"));
      await refreshDashboard("custom");
    };
  }
}

function initSalesFilters() {
  const categorySelect = document.getElementById("sales-category-filter");
  const sortSelect = document.getElementById("sales-sort-filter");

  if (!categorySelect || !sortSelect) return;

  categorySelect.onchange = () => renderSalesList();
  sortSelect.onchange = () => renderSalesList();
}

function populateSalesCategoryFilter(items = []) {
  const categorySelect = document.getElementById("sales-category-filter");
  if (!categorySelect) return;

  const currentValue = categorySelect.value || "all";
  const categories = Array.from(
    new Set(
      items
        .map((item) => item.categoria || "Senza categoria")
        .filter(Boolean)
    )
  ).sort((a, b) => String(a).localeCompare(String(b), "it"));

  categorySelect.innerHTML = `<option value="all">Tutte le categorie</option>`;

  categories.forEach((categoria) => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    categorySelect.appendChild(option);
  });

  if (categories.includes(currentValue)) {
    categorySelect.value = currentValue;
  } else {
    categorySelect.value = "all";
  }
}

/* =========================================================
   KPI / DASHBOARD
========================================================= */

async function refreshDashboard(period) {
  const _r = getDateRange(period);
  if (_r?.from) _drillFrom = _r.from.slice(0,10);
  if (_r?.to) _drillTo = _r.to.slice(0,10);
  currentPeriod = period;

  const { from: _f, to: _t } = getDateRange(period);
  _drillFrom = _f || _drillFrom;
  _drillTo = _t || _drillTo;
  const metrics = await fetchDashboardData(period);

  if (!metrics) {
    setText("period-label", "Periodo: " + getPeriodLabel(period, getDaysByPeriod(period)));
    setText("incassoTotale", formatCurrency(0));
    setText("incassoIva", formatCurrency(0));
    setText("copertiValore", "0");
    setText("copertoMedio", formatCurrency(0));
    setText("bepValore", formatCurrency(0));

    setText("materiaPrimaValore", formatCurrency(0));
    setText("speseFisseValore", formatCurrency(0));
    setText("costoLavoroValore", formatCurrency(0));
    setText("margineValore", formatCurrency(0));

    resetPercStyle("materiaPrimaPerc");
    setText("materiaPrimaPerc", "0%");
    setText("speseFissePerc", "0%");
    resetPercStyle("costoLavoroPerc");
    setText("costoLavoroPerc", "0%");
    setText("marginePerc", "0%");

    currentMetrics = {
      label: getPeriodLabel(period, getDaysByPeriod(period)),
      incasso: 0,
      incassoIva: 0,
      materiaPrima: 0,
      speseFisse: 0,
      costoLavoro: 0,
      margine: 0,
      bep: 0,
      materiaPrimaPerc: 0,
      speseFissePerc: 0,
      costoLavoroPerc: 0,
      marginePerc: 0
    };
    currentProducts = [];
    populateSalesCategoryFilter(currentProducts);
    renderGauge(currentMetrics);
    renderSalesList();
    return;
  }

  currentMetrics = metrics;
  currentProducts = Array.isArray(metrics.prodotti) ? metrics.prodotti : [];

  setText("period-label", "Periodo: " + metrics.label);
  setText("incassoTotale", formatCurrency(metrics.incasso));
  setText("incassoIva", formatCurrency(metrics.incassoIva));
  setText("copertiValore", (metrics.coperti != null ? Math.round(metrics.coperti) : 0).toLocaleString("it-IT"));
  setText("copertoMedio", formatCurrency(metrics.copertoMedio || 0));
  setText("bepValore", formatCurrency(metrics.bep));

  setText("materiaPrimaValore", formatCurrency(metrics.materiaPrima));
  const breakdownEl = document.getElementById("acquisti-breakdown");
  if (breakdownEl) {
    breakdownEl.innerHTML = metrics.mp_nota ? `<span>${metrics.mp_nota}</span>` : "";
  }
  setText("speseFisseValore", formatCurrency(metrics.speseFisse));
  setText("costoLavoroValore", formatCurrency(metrics.costoLavoro));
  setText("margineValore", formatCurrency(metrics.margine));

  // FC e CL con target visivo: verde entro soglia, giallo in tolleranza, rosso oltre
  setPercTarget("materiaPrimaPerc", metrics.materiaPrimaPerc, 30, "Food cost target ≤ 30%");
  setText("speseFissePerc", metrics.speseFissePerc + "%");
  setPercTarget("costoLavoroPerc", metrics.costoLavoroPerc, 32, "Costo lavoro target ≤ 32%");
  setText("marginePerc", metrics.marginePerc + "%");

  await enrichProductCategories();
  populateSalesCategoryFilter(currentProducts);
  renderGauge(metrics);
  await loadSalesFoodCost();
  renderSalesList();
}

async function fetchDashboardData(period) {
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;
  const supabase = window.supabaseClient;

  if (!azienda || !supabase) return null;

  const { from, to } = getDateRange(period);
  const days = getDaysByPeriod(period);

  const payload = {
    azienda_id: azienda.id,
    data_da: from,
    data_a: to
  };

  if (sede?.id != null) {
    payload.sede_id = sede.id;
  }

  try {
    const { data, error } = await supabase.functions.invoke("dashboard-kpi", {
      body: payload
    });

    if (error) {
      console.error("dashboard-kpi invoke error:", error);
      return null;
    }

    let incasso = toNumber(data?.incasso);
    let materiaPrima = toNumber(data?.materia_prima);
    let acquisti_categorie = [];
    let mpNota = "";
    let coperti = 0;
    const _norm = (x) => String(x == null ? "" : x).trim().toLowerCase();
    // Incasso + Materia prima = FOOD COST del venduto giornaliero.
    // La materia prima non viene più dagli acquisti: è la somma di
    // (quantità venduta × food cost del prodotto), agganciando il venduto
    // ai prodotti_vendita per sede + nome (univoco dopo la pulizia doppioni).
    // Gli acquisti restano sulla Ragioniere.
    try {
      let vq = supabase
        .from("vendite_giornaliere")
        .select("nome_prodotto, nome_articolo, quantita, totale_incassato, totale_riga, sede_uuid")
        .eq("azienda_id", azienda.id)
        .gte("data_vendita", from)
        .lte("data_vendita", to)
        .limit(50000);
      if (sede?.id != null) vq = vq.eq("sede_uuid", sede.id);
      const { data: vendite, error: vErr } = await vq;
      if (vErr) console.warn("Venduto query error:", vErr.message);

      if (vendite && vendite.length) {
        const totInc = vendite.reduce((s, r) => s + Number(r.totale_incassato ?? r.totale_riga ?? 0), 0);
        if (totInc > 0) incasso = roundCurrency(totInc);

        // Mappa food cost per NOME (filtro sede lato client: robusto, niente .or()/attivo).
        const { data: pvsAll } = await supabase
          .from("prodotti_vendita")
          .select("nome, sede_id, food_cost_manuale, ricette(costo_porzione)")
          .eq("azienda_id", azienda.id)
          .limit(20000);
        const curSede = sede?.id != null ? String(sede.id) : null;
        const pvs = (pvsAll || []).filter((p) => curSede == null || p.sede_id == null || String(p.sede_id) === curSede);
        const fcMap = new Map();
        const setFc = (p) => {
          const rc = p.ricette?.costo_porzione != null ? Number(p.ricette.costo_porzione) : 0;
          const fc = rc > 0 ? rc : (p.food_cost_manuale != null ? Number(p.food_cost_manuale) : 0);
          if (fc > 0) fcMap.set(_norm(p.nome), fc);
        };
        // prima i prodotti a sede NULL (fallback), poi quelli della sede (prevalgono)
        pvs.filter((p) => p.sede_id == null).forEach(setFc);
        pvs.filter((p) => p.sede_id != null).forEach(setFc);
        // override food cost (food_cost_venduto) per voci vendute non a catalogo
        const { data: ovRows } = await supabase
          .from("food_cost_venduto").select("sede_uuid, nome_norm, costo").eq("azienda_id", azienda.id);
        (ovRows || [])
          .filter((o) => curSede == null || o.sede_uuid == null || String(o.sede_uuid) === curSede)
          .forEach((o) => {
            if (o.costo > 0 && !fcMap.has(o.nome_norm)) fcMap.set(o.nome_norm, Number(o.costo));
          });

        let mp = 0, incCoperto = 0, incTot = 0;
        for (const r of vendite) {
          const nomeN = _norm(r.nome_prodotto || r.nome_articolo);
          if (nomeN.startsWith("copert")) coperti += Number(r.quantita) || 0;
          const fc = fcMap.get(nomeN) || 0;
          const inc = Number(r.totale_incassato ?? r.totale_riga ?? 0);
          incTot += inc;
          if (fc > 0) { mp += fc * (Number(r.quantita) || 0); incCoperto += inc; }
        }
        materiaPrima = roundCurrency(mp);
        const perc = incTot > 0 ? Math.round(incCoperto / incTot * 100) : 0;
        mpNota = "da food cost venduto · " + perc + "% del venduto coperto";
      }
    } catch (e) { console.warn("Errore materia prima food cost:", e); }
    const incassoIva = data?.incasso_iva != null ? toNumber(data.incasso_iva) : Math.round(incasso * 1.1);
    let speseFisse = toNumber(data?.spese_fisse);
    // Spese fisse = quota pro-rata dell'annuo (costi_fissi): annuo / 365 * giorni periodo.
    try {
      const annoRif = new Date().getFullYear();
      let cq = supabase.from("costi_fissi").select("importo_annuo")
        .eq("azienda_id", azienda.id).eq("attivo", true).eq("anno_riferimento", annoRif);
      if (sede?.id != null) cq = cq.eq("sede_uuid", sede.id);
      const { data: cf } = await cq;
      if (cf && cf.length) {
        const annuo = cf.reduce((s, r) => s + (Number(r.importo_annuo) || 0), 0);
        speseFisse = roundCurrency(annuo / 365 * (days || 1));
      }
    } catch (e) { console.warn("Spese fisse pro-rata:", e); }
    let costoLavoro = toNumber(data?.costo_lavoro);
    try {
      // Fix CL: le timbrature spesso NON hanno costo_orario (sta sui
      // dipendenti). Ricalcolo ore × costo con fallback su dipendenti.
      // Il costo del lavoro e' PER SEDE: contano solo le ore timbrate in quella sede.
      let tq = supabase
        .from("timbrature")
        .select("dipendente_id, ore_lavorate, costo_orario")
        .eq("azienda_id", azienda.id)
        .eq("tipo", "fine_turno")
        .gte("timestamp", from)
        .lte("timestamp", to + "T23:59:59")
        .limit(5000);
      if (sede?.id != null) tq = tq.eq("sede_id", sede.id);
      const { data: timb } = await tq;
      if (timb?.length) {
        // Mappa costo_orario dei dipendenti
        const { data: dips } = await supabase
          .from("dipendenti")
          .select("id, costo_orario")
          .eq("azienda_id", azienda.id);
        const costoDip = new Map((dips || []).map(d => [String(d.id), Number(d.costo_orario) || 0]));
        let totCL = 0;
        for (const r of timb) {
          const ore = Number(r.ore_lavorate) || 0;
          const costoOra = Number(r.costo_orario) > 0
            ? Number(r.costo_orario)
            : (costoDip.get(String(r.dipendente_id)) || 0);
          totCL += ore * costoOra;
        }
        // Aggiungo eventuali paghe extra (spese_extra categoria 14)
        // Le paghe spesso non hanno la sede compilata: quelle senza restano
        // aziendali (visibili ovunque), ma escludo quelle di un'altra sede.
        let pq = supabase
          .from("spese_extra")
          .select("importo")
          .eq("azienda_id", azienda.id)
          .eq("categoria_bilancio_id", 14)
          .gte("data", from).lte("data", to);
        if (sede?.id != null) pq = pq.or("sede_id.is.null,sede_id.eq." + sede.id);
        const { data: paghe } = await pq;
        const totPaghe = (paghe || []).reduce((s, r) => s + Number(r.importo || 0), 0);
        const clCalcolato = Math.round((totCL + totPaghe) * 100) / 100;
        if (clCalcolato > 0) costoLavoro = clCalcolato;
      }
    } catch (e) { console.warn("Errore ricalcolo CL:", e); }
    const margine = roundCurrency(incasso - materiaPrima - speseFisse - costoLavoro);
    const bep = roundCurrency(materiaPrima + speseFisse + costoLavoro);

    const prodotti = normalizeProducts(data?.prodotti || []);

    return {
      label: getPeriodLabel(period, days),
      days,
      incasso,
      incassoIva,
      coperti,
      copertoMedio: coperti > 0 ? incasso / coperti : 0,
      materiaPrima,
      speseFisse,
      costoLavoro,
      margine,
      bep,
      materiaPrimaPerc: toPercent(materiaPrima, incasso),
      speseFissePerc: toPercent(speseFisse, incasso),
      costoLavoroPerc: toPercent(costoLavoro, incasso),
      marginePerc: toPercent(margine, incasso),
      acquisti_categorie,
      mp_nota: mpNota,
      prodotti
    };
  } catch (err) {
    console.error("dashboard-kpi unexpected error:", err);
    return null;
  }
}

async function enrichProductCategories() {
  try {
    const sedeId = window.state?.sedeAttiva?.id;
    const supa = window.supabaseClient || window.supabase;
    if (!sedeId || !supa || !currentProducts.length) return;
    const { data: pv } = await supa.from("prodotti_vendita")
      .select("nome, categoria_vendita_id, sede_id")
      .or("sede_id.eq." + sedeId + ",sede_id.is.null").limit(5000);
    const catIds = [...new Set((pv || []).map((r) => r.categoria_vendita_id).filter(Boolean))];
    const catMap = {};
    if (catIds.length) {
      const { data: cats } = await supa.from("categorie_vendita").select("id, nome").in("id", catIds);
      (cats || []).forEach((c) => { catMap[c.id] = c.nome; });
    }
    const nomeCat = new Map();
    // prima i prodotti con sede NULL (fallback), poi quelli della sede (prevalgono)
    (pv || []).filter((r) => !r.sede_id).forEach((r) => {
      const cat = catMap[r.categoria_vendita_id];
      if (r.nome && cat) nomeCat.set(_normNome(r.nome), cat);
    });
    (pv || []).filter((r) => r.sede_id).forEach((r) => {
      const cat = catMap[r.categoria_vendita_id];
      if (r.nome && cat) nomeCat.set(_normNome(r.nome), cat);
    });
    currentProducts.forEach((p) => {
      const c = nomeCat.get(_normNome(p.nome || ""));
      if (c) p.categoria = c;
    });
  } catch (e) { /* categorie non disponibili, resta il default */ }
}

function normalizeProducts(list) {
  return (Array.isArray(list) ? list : []).map((item) => {
    const nome = item?.nome || item?.nome_prodotto || item?.descrizione || `Prodotto ${item?.prodotto_id ?? ""}`.trim();
    const categoria = item?.categoria || item?.categoria_nome || item?.categoria_portata || "Senza categoria";
    const incasso = toNumber(item?.incasso);
    const numero = toNumber(item?.numero ?? item?.pezzi ?? item?.quantita);
    const margine = item?.margine != null ? toNumber(item.margine) : incasso;

    return {
      prodotto_id: item?.prodotto_id ?? null,
      nome,
      categoria,
      incasso,
      numero,
      margine
    };
  });
}

/* =========================================================
   GAUGE
========================================================= */

function renderGauge(metrics) {
  const canvas = document.getElementById("admin-gauge");
  if (!canvas) return;
  if (typeof Chart === "undefined") return;

  destroyGauge();

  gaugeChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Materia prima", "Spese fisse", "Costo lavoro", "Margine"],
      datasets: [
        {
          data: [
            metrics.materiaPrima || 0,
            metrics.speseFisse || 0,
            metrics.costoLavoro || 0,
            Math.max(metrics.margine || 0, 0)
          ],
          backgroundColor: [
            "#f97316",
            "#8b5cf6",
            "#ef4444",
            "#22c55e"
          ],
          borderWidth: 0,
          hoverOffset: 0
        }
      ]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      rotation: -90,
      circumference: 180,
      cutout: "72%",
      events: [],
      interaction: {
        mode: null
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        tooltip: {
          enabled: false
        }
      }
    }
  });
}

function destroyGauge() {
  if (gaugeChart) {
    try {
      gaugeChart.destroy();
    } catch (e) {
      console.warn("Gauge destroy error:", e);
    }
    gaugeChart = null;
  }
}

/* =========================================================
   SALES
========================================================= */

let salesFoodCost = {};
function _normNome(s) { return String(s == null ? "" : s).trim().toLowerCase(); }
async function loadSalesFoodCost() {
  salesFoodCost = {};
  try {
    const supabase = window.supabaseClient;
    const azienda = window.state?.azienda;
    const sede = window.state?.sedeAttiva;
    if (!supabase || !azienda) return;
    const { data: pvsAll } = await supabase.from("prodotti_vendita")
      .select("id, nome, sede_id, ricetta_id, food_cost_manuale")
      .eq("azienda_id", azienda.id).limit(20000);
    const curSede = sede?.id != null ? String(sede.id) : null;
    const pvs = (pvsAll || []).filter((p) => curSede == null || p.sede_id == null || String(p.sede_id) === curSede);
    const ricIds = [...new Set((pvs || []).map((p) => p.ricetta_id).filter(Boolean))];
    const ricCost = {};
    if (ricIds.length) {
      const { data: rics } = await supabase.from("ricette").select("id, costo_porzione").in("id", ricIds);
      (rics || []).forEach((r) => { ricCost[String(r.id)] = r.costo_porzione != null ? Number(r.costo_porzione) : 0; });
    }
    (pvs || []).forEach((p) => {
      const rc = p.ricetta_id != null ? (ricCost[String(p.ricetta_id)] || 0) : 0;
      const k = _normNome(p.nome);
      // il prodotto con sede specifica prevale su quello a sede NULL
      if (salesFoodCost[k] && p.sede_id == null) return;
      salesFoodCost[k] = {
        id: p.id,
        ricettaCost: rc > 0 ? rc : null,
        manuale: p.food_cost_manuale != null ? Number(p.food_cost_manuale) : null
      };
    });
    // override food cost per voci non a catalogo (food_cost_venduto)
    let ovQ = supabase.from("food_cost_venduto").select("nome_norm, costo").eq("azienda_id", azienda.id);
    if (sede?.id) ovQ = ovQ.eq("sede_uuid", sede.id);
    const { data: ov } = await ovQ;
    (ov || []).forEach((o) => {
      if (!salesFoodCost[o.nome_norm]) salesFoodCost[o.nome_norm] = { id: null, ricettaCost: null, manuale: null };
      salesFoodCost[o.nome_norm].override = o.costo != null ? Number(o.costo) : null;
    });
  } catch (e) { console.warn("loadSalesFoodCost:", e); }
}

function renderSalesList() {
  const box = document.getElementById("sales-list");
  const categoryFilter = document.getElementById("sales-category-filter");
  const sortFilter = document.getElementById("sales-sort-filter");

  if (!box) return;

  const category = categoryFilter?.value || "all";
  const sortBy = sortFilter?.value || "incasso";

  let items = Array.isArray(currentProducts) ? [...currentProducts] : [];

  if (category !== "all") {
    items = items.filter((item) => (item.categoria || "Senza categoria") === category);
  }

  // Margine reale = incasso - (food cost unitario x pezzi), usando il food cost
  // inserito in lista (ricetta o manuale/override), non il costo-ricetta del KPI.
  items.forEach((item) => {
    const fc = salesFoodCost[_normNome(item.nome)];
    let fcUnit = 0;
    if (fc) {
      if (fc.ricettaCost != null && fc.ricettaCost > 0) fcUnit = fc.ricettaCost;
      else if (fc.manuale != null) fcUnit = Number(fc.manuale) || 0;
      else if (fc.override != null) fcUnit = Number(fc.override) || 0;
    }
    item._margineReale = toNumber(item.incasso) - fcUnit * toNumber(item.numero);
  });

  items.sort((a, b) => {
    if (sortBy === "numero") return toNumber(b.numero) - toNumber(a.numero);
    if (sortBy === "margine") return toNumber(b._margineReale) - toNumber(a._margineReale);
    return toNumber(b.incasso) - toNumber(a.incasso);
  });

  if (!items.length) {
    box.innerHTML = `
      <div class="admin-sales-row">
        <div class="admin-sales-left">
          <div class="admin-sales-name">Nessun prodotto nel periodo</div>
          <div class="admin-sales-category">Prova a cambiare filtro o intervallo date</div>
        </div>
      </div>
    `;
    return;
  }

  const _totInc = items.reduce((s, it) => s + toNumber(it.incasso), 0);
  const _totMar = items.reduce((s, it) => s + toNumber(it._margineReale), 0);
  const _catLabel = category === "all" ? "Tutte le categorie" : category;
  const _summaryHtml = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 2px 12px;border-bottom:2px solid #e2e8f0;margin-bottom:6px;font-size:13px;"><span style="font-weight:800;color:#0f172a;">${escapeHtml(_catLabel)}</span><span style="color:#64748b;">Incasso <b style="color:#0f172a;">${formatCurrency(_totInc)}</b> · Margine <b style="color:#0E5A7A;">${formatCurrency(_totMar)}</b></span></div>`;

  box.innerHTML = _summaryHtml + items.map((item) => {
    const fc = salesFoodCost[_normNome(item.nome)];
    const hasFc = fc && (fc.ricettaCost != null || fc.manuale != null || fc.override != null);
    let fcHtml = "";
    if (!hasFc) {
      // Mostra l'input SOLO per i piatti che NON hanno ancora un food cost.
      fcHtml = `<div style="text-align:center;flex-shrink:0;"><div style="font-size:11px;color:#94a3b8;font-weight:800;text-transform:uppercase;margin-bottom:3px;">Food cost €</div><input class="fc-inline" data-id="${fc && fc.id != null ? fc.id : ""}" data-nome="${escapeHtml(item.nome)}" type="number" step="0.10" min="0" inputmode="decimal" value="" placeholder="—" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" style="width:82px;padding:8px;border:1.5px solid #0E5A7A;border-radius:8px;text-align:right;font-size:14px;background:#fff;position:relative;z-index:2;"></div>`;
    }
    return `
      <div class="admin-sales-row">
        <div class="admin-sales-left">
          <div class="admin-sales-name">${escapeHtml(item.nome)}</div>
          <div class="admin-sales-category">${escapeHtml(item.categoria || "Senza categoria")}</div>
        </div>
        ${fcHtml}
        <div class="admin-sales-value-card">
          <div class="admin-sales-value-label">${sortByLabel(sortBy)}</div>
          <div class="admin-sales-value">${sortBy === "numero" ? formatNumber(item.numero) : (sortBy === "margine" ? formatCurrency(item._margineReale) : formatCurrency(item[sortBy]))}</div>
        </div>
      </div>
    `;
  }).join("");

  box.querySelectorAll(".fc-inline").forEach((inp) => {
    inp.addEventListener("change", async () => {
      const idRaw = inp.getAttribute("data-id");
      const nome = inp.getAttribute("data-nome") || "";
      const raw = inp.value.trim().replace(",", ".");
      const val = raw === "" ? null : Number(raw);
      if (val != null && (!Number.isFinite(val) || val < 0)) { inp.style.borderColor = "#dc2626"; return; }
      inp.disabled = true;
      try {
        let error = null;
        if (idRaw) {
          const r = await window.supabaseClient.from("prodotti_vendita")
            .update({ food_cost_manuale: val, updated_at: new Date().toISOString() }).eq("id", idRaw);
          error = r.error;
          if (!error) { const k = Object.keys(salesFoodCost).find((kk) => String(salesFoodCost[kk].id) === String(idRaw)); if (k) salesFoodCost[k].manuale = val; }
        } else {
          const azienda = window.state?.azienda; const sede = window.state?.sedeAttiva;
          const r = await window.supabaseClient.from("food_cost_venduto").upsert({
            azienda_id: azienda?.id, sede_uuid: sede?.id || null, nome_norm: _normNome(nome), costo: val, updated_at: new Date().toISOString()
          }, { onConflict: "azienda_id,sede_uuid,nome_norm" });
          error = r.error;
          if (!error) { const k = _normNome(nome); if (!salesFoodCost[k]) salesFoodCost[k] = { id: null, ricettaCost: null, manuale: null }; salesFoodCost[k].override = val; }
        }
        inp.disabled = false;
        if (error) { inp.style.borderColor = "#dc2626"; return; }
        inp.style.borderColor = val != null ? "#16a34a" : "#cbd5e1";
        if (typeof refreshDashboard === "function") refreshDashboard(currentPeriod);
      } catch (e) { inp.disabled = false; inp.style.borderColor = "#dc2626"; }
    });
  });
}

/* =========================================================
   TONY
========================================================= */



/* =========================================================
   METEO
========================================================= */

async function hydrateWeather() {
  const box = document.getElementById("home-weather");
  if (!box) return;

  try {
    const res = await fetch(
      `${OPEN_METEO_URL}?latitude=41.9&longitude=12.49&current=temperature_2m`
    );
    const data = await res.json();

    if (data?.current?.temperature_2m != null) {
      box.innerHTML = "🌤 " + Math.round(data.current.temperature_2m) + "°";
      return;
    }

    box.innerHTML = "☁️";
  } catch {
    box.innerHTML = "☁️";
  }
}

/* =========================================================
   HELPERS
========================================================= */

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

// Colora una percentuale KPI in base al target: verde se <= target,
// giallo se entro +2 punti (zona di attenzione), rosso se oltre.
function setPercTarget(id, perc, target, titolo) {
  const el = document.getElementById(id);
  if (!el) return;
  const v = Number(perc) || 0;
  el.innerText = v + "%";
  let colore, bg, icona;
  if (v <= target)            { colore = "#15803d"; bg = "#dcfce7"; icona = "✓"; }
  else if (v <= target + 2)   { colore = "#b45309"; bg = "#fef9c3"; icona = "!"; }
  else                        { colore = "#dc2626"; bg = "#fee2e2"; icona = "▲"; }
  el.style.color = colore;
  el.style.background = bg;
  el.style.borderRadius = "6px";
  el.style.padding = "1px 7px";
  el.style.fontWeight = "700";
  el.style.display = "inline-block";
  if (titolo) el.title = titolo + " — attuale " + v + "%";
  el.innerText = icona + " " + v + "%";
}

function resetPercStyle(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.color = "";
  el.style.background = "";
  el.style.borderRadius = "";
  el.style.padding = "";
  el.style.display = "";
  el.title = "";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function toPercent(value, total) {
  const safeTotal = toNumber(total);
  if (!safeTotal) return 0;
  return Math.round((toNumber(value) / safeTotal) * 100);
}

function roundCurrency(value) {
  return Math.round(toNumber(value));
}

function toNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(period) {
  const today = new Date();

  if (period === "day") {
    // La home apre sull'ultima giornata CHIUSA (ieri): il venduto di oggi
    // non è ancora completo/importato.
    const ieri = new Date(today);
    ieri.setDate(today.getDate() - 1);
    const d = toISODate(ieri);
    return { from: d, to: d };
  }

  if (period === "week") {
    const from = new Date();
    from.setDate(today.getDate() - 6);
    return { from: toISODate(from), to: toISODate(today) };
  }

  if (period === "month") {
    const from = new Date();
    from.setDate(today.getDate() - 29);
    return { from: toISODate(from), to: toISODate(today) };
  }

  if (period === "year") {
    const from = new Date();
    from.setDate(today.getDate() - 364);
    return { from: toISODate(from), to: toISODate(today) };
  }

  const fromInput = document.getElementById("filter-from");
  const toInput = document.getElementById("filter-to");

  return {
    from: fromInput?.value || toISODate(today),
    to: toInput?.value || toISODate(today)
  };
}

function getDaysByPeriod(period) {
  if (period === "week") return 7;
  if (period === "month") return 30;
  if (period === "year") return 365;
  if (period === "custom") {
    const fromInput = document.getElementById("filter-from");
    const toInput = document.getElementById("filter-to");

    if (!fromInput?.value || !toInput?.value) return 1;

    const from = new Date(fromInput.value + "T00:00:00");
    const to = new Date(toInput.value + "T00:00:00");

    const diff = Math.round((to - from) / 86400000) + 1;

    return diff > 0 ? diff : 1;
  }

  return 1;
}

function getPeriodLabel(period, days) {
  if (period !== "custom") return PERIOD_LABELS[period] || "Giorno";

  const fromInput = document.getElementById("filter-from");
  const toInput = document.getElementById("filter-to");

  if (!fromInput?.value || !toInput?.value) {
    return PERIOD_LABELS.custom;
  }

  return `Dal ${fromInput.value} al ${toInput.value} (${days} gg)`;
}

function sortByLabel(sortBy) {
  if (sortBy === "numero") return "Numero";
  if (sortBy === "margine") return "Margine";
  return "Incasso";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

