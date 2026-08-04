// js/views/hr-costi.js
// Quanto costa il personale, e dove. Stesso dato letto in quattro modi:
// per persona, per mansione, per reparto, per sede.
// Il lavorato viene dalle timbrature, le assenze dalle richieste approvate.

let vista = "dipendente";
let periodo = "mese";

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;
  if (!azienda?.id) {
    container.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  container.innerHTML = `<div class="hc"><div class="hc-caric">Un attimo…</div></div>${stile()}`;

  const r = intervallo(periodo);
  const rPrec = intervalloPrecedente(periodo);

  const [ora, prima] = await Promise.all([
    supabase.rpc("costi_personale", { p_azienda: azienda.id, p_da: r.da, p_a: r.a, p_sede: null }),
    supabase.rpc("costi_personale", { p_azienda: azienda.id, p_da: rPrec.da, p_a: rPrec.a, p_sede: null }),
  ]);

  const righe = ora.data || [];
  const righePrec = prima.data || [];

  const tot = somma(righe);
  const totPrec = somma(righePrec);

  const gruppi = raggruppa(righe, vista);
  const max = Math.max(...gruppi.map(g => g.costo_totale), 1);

  const senzaCosto = righe.filter(x => Number(x.costo_orario) === 0 && Number(x.ore_lavorate) > 0);

  container.innerHTML = `
    <div class="hc">
      <h1>👥 Costo del personale</h1>
      <p class="hc-sub">${etichetta(r)} · confronto con ${etichetta(rPrec)}</p>

      <div class="hc-per">
        ${[["settimana", "Settimana"], ["mese", "Mese"], ["trimestre", "Trimestre"], ["anno", "Anno"]]
          .map(([p, l]) => `<button data-per="${p}" class="${p === periodo ? "on" : ""}">${l}</button>`).join("")}
      </div>

      <div class="hc-tot">
        <div class="k grande">
          <span>Costo totale</span>
          <b>€ ${fmt(tot.costo_totale)}</b>
          ${scost(tot.costo_totale, totPrec.costo_totale)}
        </div>
        <div class="k"><span>Lavorato</span><b>€ ${fmt(tot.costo_lavorato)}</b><small>${fmt(tot.ore_lavorate)} ore</small></div>
        <div class="k"><span>Assenze</span><b>€ ${fmt(tot.costo_assenze)}</b><small>${fmt(tot.giorni_assenza)} giorni</small></div>
        <div class="k"><span>Costo orario medio</span><b>€ ${tot.ore_lavorate ? (tot.costo_lavorato / tot.ore_lavorate).toFixed(2) : "—"}</b></div>
      </div>

      ${senzaCosto.length ? `
        <div class="hc-avviso">
          <b>${senzaCosto.length} ${senzaCosto.length === 1 ? "persona lavora" : "persone lavorano"} ma non ${senzaCosto.length === 1 ? "ha" : "hanno"} il costo orario</b>
          <span>${senzaCosto.map(x => esc(x.dipendente)).join(", ")} — le loro ore contano zero nel totale.</span>
        </div>` : ""}

      <div class="hc-tab">
        ${[["dipendente", "Persona"], ["mansione", "Ruolo"], ["reparto", "Reparto"], ["sede", "Sede"]]
          .map(([v, l]) => `<button data-vista="${v}" class="${v === vista ? "on" : ""}">${l}</button>`).join("")}
      </div>

      <div class="hc-barre">
        ${gruppi.length ? gruppi.map(g => {
          const lav = g.costo_lavorato, ass = g.costo_assenze;
          const wl = (lav / max) * 100, wa = (ass / max) * 100;
          return `
          <div class="hc-riga">
            <div class="hc-lab">
              <b>${esc(g.chiave)}</b>
              <span>${fmt(g.ore_lavorate)} h${g.giorni_assenza ? " · " + fmt(g.giorni_assenza) + " gg assenza" : ""}</span>
            </div>
            <div class="hc-barra">
              <div class="lav" style="width:${wl}%"></div>
              ${wa > 0 ? `<div class="ass" style="width:${wa}%"></div>` : ""}
            </div>
            <div class="hc-val">€ ${fmt(g.costo_totale)}</div>
          </div>`;
        }).join("") : `<div class="hc-vuoto">Nessun dato nel periodo.</div>`}
      </div>

      <div class="hc-legenda">
        <span><i class="q lav"></i> ore lavorate</span>
        <span><i class="q ass"></i> ferie, permessi e malattia</span>
      </div>

      <div class="hc-nota">
        Il lavorato arriva dalle timbrature, valorizzate sulla giornata di lavoro.
        Le assenze contano solo se registrate come richieste approvate: quelle prese a voce non compaiono.
      </div>
    </div>
    ${stile()}`;

  container.querySelectorAll("[data-per]").forEach(b =>
    b.addEventListener("click", () => { periodo = b.dataset.per; render(container); }));
  container.querySelectorAll("[data-vista]").forEach(b =>
    b.addEventListener("click", () => { vista = b.dataset.vista; render(container); }));
}

/* ── conti ─────────────────────────────────────────────────────────── */

function somma(righe) {
  const t = { costo_totale: 0, costo_lavorato: 0, costo_assenze: 0, ore_lavorate: 0, giorni_assenza: 0 };
  for (const r of righe) {
    t.costo_totale += Number(r.costo_totale) || 0;
    t.costo_lavorato += Number(r.costo_lavorato) || 0;
    t.costo_assenze += Number(r.costo_assenze) || 0;
    t.ore_lavorate += Number(r.ore_lavorate) || 0;
    t.giorni_assenza += (Number(r.giorni_ferie) || 0) + (Number(r.giorni_permessi) || 0) + (Number(r.giorni_malattia) || 0);
  }
  return t;
}

function raggruppa(righe, chiave) {
  const m = new Map();
  for (const r of righe) {
    const k = r[chiave] || "—";
    const cur = m.get(k) || { chiave: k, costo_totale: 0, costo_lavorato: 0, costo_assenze: 0, ore_lavorate: 0, giorni_assenza: 0 };
    cur.costo_totale += Number(r.costo_totale) || 0;
    cur.costo_lavorato += Number(r.costo_lavorato) || 0;
    cur.costo_assenze += Number(r.costo_assenze) || 0;
    cur.ore_lavorate += Number(r.ore_lavorate) || 0;
    cur.giorni_assenza += (Number(r.giorni_ferie) || 0) + (Number(r.giorni_permessi) || 0) + (Number(r.giorni_malattia) || 0);
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.costo_totale - a.costo_totale);
}

function scost(ora, prima) {
  if (!prima) return "";
  const d = ((ora - prima) / prima) * 100;
  if (Math.abs(d) < 1) return `<em class="pari">=</em>`;
  // sul costo del personale, salire non e' una buona notizia di per se'
  return `<em class="${d > 0 ? "su" : "giu"}">${d > 0 ? "+" : ""}${d.toFixed(0)}%</em>`;
}

/* ── periodi ───────────────────────────────────────────────────────── */

function intervallo(p) {
  const a = new Date(), da = new Date();
  if (p === "settimana") da.setDate(da.getDate() - ((da.getDay() + 6) % 7));
  if (p === "mese") da.setDate(1);
  if (p === "trimestre") { da.setMonth(Math.floor(da.getMonth() / 3) * 3); da.setDate(1); }
  if (p === "anno") { da.setMonth(0); da.setDate(1); }
  return { da: iso(da), a: iso(a) };
}
function intervalloPrecedente(p) {
  const r = intervallo(p);
  const d1 = new Date(r.da + "T12:00:00"), d2 = new Date(r.a + "T12:00:00");
  const giorni = Math.round((d2 - d1) / 86400000) + 1;
  const fine = new Date(d1); fine.setDate(fine.getDate() - 1);
  const inizio = new Date(fine); inizio.setDate(inizio.getDate() - giorni + 1);
  return { da: iso(inizio), a: iso(fine) };
}
function etichetta(r) {
  const f = (x) => new Date(x + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return f(r.da) + " → " + f(r.a);
}
function iso(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function fmt(n) { return Number(n || 0).toLocaleString("it-IT", { maximumFractionDigits: 0 }); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stile() {
  return `<style>
  .hc{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--verde:#348127;--rosso:#B91C1C;
      --riga:#E2E6EA;--muto:#6B7A83;max-width:760px;margin:0 auto;padding:16px 14px 70px;color:#12232E;}
  .hc-caric{padding:40px 0;text-align:center;color:#94a3b8;}
  .hc h1{font-size:23px;margin:0 0 3px;}
  .hc-sub{color:var(--muto);font-size:13.5px;margin:0 0 14px;}

  .hc-per,.hc-tab{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
  .hc-per button,.hc-tab button{flex:1;min-width:80px;border:1px solid var(--riga);background:#fff;
    border-radius:10px;padding:9px;font-size:13px;font-family:inherit;color:var(--muto);cursor:pointer;}
  .hc-per button.on,.hc-tab button.on{background:var(--navy);color:#fff;border-color:var(--navy);font-weight:700;}

  .hc-tot{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px;}
  .hc-tot .k{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:14px;}
  .hc-tot .k span{display:block;font-size:12.5px;color:var(--muto);}
  .hc-tot .k b{display:block;font-family:Georgia,serif;font-size:24px;color:var(--navy);margin-top:3px;}
  .hc-tot .k small{display:block;font-size:11.5px;color:var(--muto);margin-top:2px;}
  .hc-tot .k.grande{background:var(--navy);}
  .hc-tot .k.grande span{color:#CFE0E8;}
  .hc-tot .k.grande b{color:#fff;font-size:28px;}
  .hc-tot em{display:inline-block;margin-top:6px;font-style:normal;font-size:13px;font-weight:700;
    padding:4px 9px;border-radius:100px;background:rgba(255,255,255,.15);color:#fff;}
  .hc-tot em.su{background:#7F1D1D;}
  .hc-tot em.giu{background:#14532D;}

  .hc-avviso{background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:13.5px;}
  .hc-avviso b{display:block;color:#92400E;}
  .hc-avviso span{color:#78350F;}

  .hc-barre{background:#fff;border:1px solid var(--riga);border-radius:14px;overflow:hidden;}
  .hc-riga{display:flex;align-items:center;gap:12px;padding:12px 15px;border-top:1px solid #F1F4F6;}
  .hc-riga:first-child{border-top:none;}
  .hc-lab{width:34%;min-width:110px;}
  .hc-lab b{display:block;font-size:14.5px;}
  .hc-lab span{display:block;font-size:11.5px;color:var(--muto);margin-top:1px;}
  .hc-barra{flex:1;height:22px;background:#F1F4F6;border-radius:6px;overflow:hidden;display:flex;}
  .hc-barra .lav{background:var(--navy);height:100%;}
  .hc-barra .ass{background:var(--ambra);height:100%;}
  .hc-val{width:88px;text-align:right;font-weight:700;font-size:14px;}

  .hc-legenda{display:flex;gap:16px;margin-top:10px;font-size:12.5px;color:var(--muto);flex-wrap:wrap;}
  .hc-legenda .q{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;}
  .hc-legenda .q.lav{background:var(--navy);}
  .hc-legenda .q.ass{background:var(--ambra);}
  .hc-nota{font-size:12.5px;color:var(--muto);line-height:1.55;margin-top:14px;}
  .hc-vuoto{padding:20px;color:var(--muto);font-size:14px;}
  </style>`;
}
