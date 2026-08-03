// js/views/home-admin.js
// LA BUSSOLA. Una domanda sola: "sto guadagnando?"
// Tre numeri con lo scostamento sul periodo precedente, e sotto solo
// le cose che aspettano una decisione. Tutto il resto sta nei moduli:
// la dashboard completa di prima resta su #/dashboard-dettaglio.

let periodo = "settimana";

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;

  if (!azienda?.id) {
    container.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  container.innerHTML = `<div class="ad-home"><div class="ad-caric">Un attimo…</div></div>${stile()}`;

  const oggi = new Date();
  const per = intervallo(periodo, oggi);
  const prec = intervalloPrecedente(periodo, oggi);

  const [ora, prima, decisioni, comandamenti] = await Promise.all([
    kpi(supabase, azienda.id, sede?.id, per),
    kpi(supabase, azienda.id, sede?.id, prec),
    listaDecisioni(supabase, azienda.id),
    listaComandamenti(supabase, azienda.id),
  ]);

  const com = comandamenti.length
    ? comandamenti[giornoDellAnno(oggi) % comandamenti.length] : null;

  const fcOra = ora.incasso ? (ora.materiaPrima / ora.incasso) * 100 : null;
  const fcPrima = prima.incasso ? (prima.materiaPrima / prima.incasso) * 100 : null;
  const lavPerc = ora.incasso ? (ora.costoLavoro / ora.incasso) * 100 : null;

  container.innerHTML = `
    <div class="ad-home">

      <div class="ad-salve">Come va
        <span>${oggi.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}${sede?.nome ? " · " + esc(sede.nome) : " · tutte le sedi"}</span>
      </div>

      <div class="ad-per">
        ${["oggi", "settimana", "mese"].map(p =>
          `<button data-per="${p}" class="${p === periodo ? "on" : ""}">${p[0].toUpperCase() + p.slice(1)}</button>`).join("")}
      </div>

      <div class="ad-num">
        ${riga("Incassato", euro(ora.incasso), scost(ora.incasso, prima.incasso, "su"), null)}
        ${riga("Food cost", fcOra == null ? "—" : perc(fcOra), scostPunti(fcOra, fcPrima), null)}
        ${riga("Costo del lavoro", euro(ora.costoLavoro),
               scost(ora.costoLavoro, prima.costoLavoro, "giu"),
               lavPerc == null ? null : perc(lavPerc) + " sull'incassato")}
      </div>

      <div class="ad-sez">Aspettano una tua decisione</div>
      <div class="ad-dec">
        ${decisioni.length
          ? decisioni.map(d => `
            <a href="${d.link}" class="d ${d.livello}">
              <i class="pun"></i>
              <div class="t">${esc(d.titolo)}<span>${esc(d.sotto)}</span></div>
              <b>›</b>
            </a>`).join("")
          : `<div class="vuoto">Niente in sospeso. Buon segno.</div>`}
      </div>

      ${com ? `
        <div class="ad-com">
          <div class="et">Il pensiero di oggi</div>
          <p>${esc(com.testo)}</p>
        </div>` : ""}

      <div class="ad-sez">Vai a</div>
      <div class="ad-griglia">
        <a href="#/bo-bilancio" class="p"><i>📊</i><b>Bilancio</b><span>Conto economico</span></a>
        <a href="#/menu-intelligence" class="p"><i>🍽️</i><b>Menu engineering</b><span>Cosa rende davvero</span></a>
        <a href="#/bo-fatture" class="p"><i>🧾</i><b>Fatture</b><span>Acquisti e costi</span></a>
        <a href="#/persone" class="p"><i>👥</i><b>Personale</b><span>Ore e costi</span></a>
        <a href="#/dashboard-dettaglio" class="p spicca"><i>📈</i><b>Andamento</b><span>Grafici del periodo</span></a>
        <a href="#/venduto" class="p spicca"><i>🧾</i><b>Venduto</b><span>Prodotti e quantità</span></a>
      </div>

      <div class="ad-pie">${esc(azienda?.nome || "")}</div>
    </div>
    ${stile()}`;

  container.querySelectorAll("[data-per]").forEach(b => {
    b.addEventListener("click", () => { periodo = b.getAttribute("data-per"); render(container); });
  });
}

/* ── numeri ────────────────────────────────────────────────────────────── */

// I numeri si calcolano dal venduto, non dalla funzione dashboard-kpi:
// e' la stessa logica della dashboard completa, cosi' i due schermi coincidono.
async function kpi(supabase, aziendaId, sedeId, range) {
  const out = { incasso: 0, materiaPrima: 0, costoLavoro: 0 };
  const norm = (x) => String(x == null ? "" : x).trim().toLowerCase();

  try {
    // ── incasso e materia prima, dal venduto giornaliero ──
    let vq = supabase.from("vendite_giornaliere")
      .select("nome_prodotto, nome_articolo, quantita, totale_incassato, totale_riga")
      .eq("azienda_id", aziendaId)
      .gte("data_vendita", range.da).lte("data_vendita", range.a).limit(50000);
    if (sedeId != null) vq = vq.eq("sede_uuid", sedeId);
    const { data: vendite } = await vq;

    if (vendite && vendite.length) {
      out.incasso = vendite.reduce((s, r) => s + Number(r.totale_incassato ?? r.totale_riga ?? 0), 0);

      const { data: pvsAll } = await supabase.from("prodotti_vendita")
        .select("nome, sede_id, food_cost_manuale, ricette(costo_porzione)")
        .eq("azienda_id", aziendaId).limit(20000);
      const cur = sedeId != null ? String(sedeId) : null;
      const pvs = (pvsAll || []).filter(p => cur == null || p.sede_id == null || String(p.sede_id) === cur);

      const fc = new Map();
      const setFc = (p) => {
        const rc = p.ricette?.costo_porzione != null ? Number(p.ricette.costo_porzione) : 0;
        const v = rc > 0 ? rc : (p.food_cost_manuale != null ? Number(p.food_cost_manuale) : 0);
        if (v > 0) fc.set(norm(p.nome), v);
      };
      pvs.filter(p => p.sede_id == null).forEach(setFc);   // prima il generico
      pvs.filter(p => p.sede_id != null).forEach(setFc);   // poi la sede, che prevale

      const { data: ov } = await supabase.from("food_cost_venduto")
        .select("sede_uuid, nome_norm, costo").eq("azienda_id", aziendaId);
      (ov || []).filter(o => cur == null || o.sede_uuid == null || String(o.sede_uuid) === cur)
        .forEach(o => { if (Number(o.costo) > 0 && !fc.has(o.nome_norm)) fc.set(o.nome_norm, Number(o.costo)); });

      out.materiaPrima = vendite.reduce((s, r) => {
        const c = fc.get(norm(r.nome_prodotto || r.nome_articolo)) || 0;
        return s + c * (Number(r.quantita) || 0);
      }, 0);
    }
  } catch (e) { console.warn("kpi venduto:", e); }

  try {
    // ── costo del lavoro: ore per costo orario, col ripiego sull'anagrafica ──
    let tq = supabase.from("timbrature")
      .select("dipendente_id, ore_lavorate, costo_orario")
      .eq("azienda_id", aziendaId).eq("tipo", "fine_turno")
      .gte("data_turno", range.da).lte("data_turno", range.a).limit(5000);
    if (sedeId != null) tq = tq.eq("sede_id", sedeId);
    const { data: timb } = await tq;

    if (timb && timb.length) {
      const { data: dips } = await supabase.from("dipendenti")
        .select("id, costo_orario").eq("azienda_id", aziendaId);
      const costoDip = new Map((dips || []).map(d => [String(d.id), Number(d.costo_orario) || 0]));
      out.costoLavoro = timb.reduce((s, r) => {
        const ore = Number(r.ore_lavorate) || 0;
        const co = Number(r.costo_orario) > 0 ? Number(r.costo_orario) : (costoDip.get(String(r.dipendente_id)) || 0);
        return s + ore * co;
      }, 0);
    }
  } catch (e) { console.warn("kpi lavoro:", e); }

  return out;
}

/* ── cose che aspettano te ─────────────────────────────────────────────── */

async function listaDecisioni(supabase, aziendaId) {
  const out = [];

  try {
    const { data } = await supabase.from("vw_menu_engineering")
      .select("nome, margine_unitario, quadrante").eq("azienda_id", aziendaId);
    const sotto = (data || []).filter(r => r.quadrante !== "SENZA_COSTO" && Number(r.margine_unitario) <= 0);
    if (sotto.length) out.push({
      livello: "rosso", link: "#/menu-intelligence",
      titolo: sotto.length + (sotto.length === 1 ? " piatto sotto margine" : " piatti sotto margine"),
      sotto: sotto.slice(0, 3).map(r => r.nome).join(", "),
    });
  } catch (e) { /* la vista puo' non esserci */ }

  try {
    const { data } = await supabase.from("fiscale_documenti_righe")
      .select("documento_id, prodotto_id, match_confermato, match_metodo")
      .eq("azienda_id", aziendaId).eq("match_confermato", false).limit(500);
    const daFare = (data || []).filter(r => !["non_prodotto", "descrittiva"].includes(r.match_metodo));
    const doc = new Set(daFare.map(r => r.documento_id));
    if (doc.size) out.push({
      livello: "rosso", link: "#/bo-fatture",
      titolo: doc.size + (doc.size === 1 ? " fattura da completare" : " fatture da completare"),
      sotto: daFare.length + " righe senza prodotto o categoria",
    });
  } catch (e) { /* niente */ }

  try {
    const { data } = await supabase.from("prodotti")
      .select("id").eq("azienda_id", aziendaId).eq("attivo", true)
      .or("categoria_bilancio_id.is.null,categoria_interna.is.null").limit(500);
    if ((data || []).length) out.push({
      livello: "giallo", link: "#/bo-prodotti",
      titolo: data.length + " prodotti senza categoria",
      sotto: "Finché restano così non entrano nei costi",
    });
  } catch (e) { /* niente */ }

  try {
    const { data } = await supabase.from("hr_richieste")
      .select("id, tipo, data_inizio, dipendenti(nome, cognome)")
      .eq("azienda_id", aziendaId).eq("stato", "in_attesa").limit(20);
    if ((data || []).length) out.push({
      livello: "giallo", link: "#/hr-richieste",
      titolo: data.length + (data.length === 1 ? " richiesta da approvare" : " richieste da approvare"),
      sotto: data.slice(0, 2).map(r =>
        [r.dipendenti?.nome, r.tipo].filter(Boolean).join(" · ")).join(" · "),
    });
  } catch (e) { /* la tabella puo' avere un altro nome */ }

  return out;
}

async function listaComandamenti(supabase, aziendaId) {
  const { data } = await supabase.from("comandamenti")
    .select("testo").eq("azienda_id", aziendaId).eq("attivo", true).order("ordine");
  return data || [];
}

/* ── presentazione ─────────────────────────────────────────────────────── */

function riga(etichetta, valore, scostamento, nota) {
  return `
    <div class="n">
      <div class="lab">
        <b>${etichetta}</b>
        <div class="v">${valore}</div>
        ${nota ? `<span class="nota">${nota}</span>` : ""}
      </div>
      ${scostamento}
    </div>`;
}

// verso = "su" se crescere è bene (incasso), "giu" se crescere è male (costi)
function scost(ora, prima, verso) {
  if (!prima) return `<div class="sc pari">—</div>`;
  const delta = ((ora - prima) / prima) * 100;
  if (Math.abs(delta) < 1) return `<div class="sc pari">=</div>`;
  const bene = verso === "su" ? delta > 0 : delta < 0;
  return `<div class="sc ${bene ? "su" : "giu"}">${delta > 0 ? "+" : ""}${delta.toFixed(0)}%</div>`;
}

function scostPunti(ora, prima) {
  if (ora == null || prima == null) return `<div class="sc pari">—</div>`;
  const d = ora - prima;
  if (Math.abs(d) < 0.3) return `<div class="sc pari">=</div>`;
  return `<div class="sc ${d < 0 ? "su" : "giu"}">${d > 0 ? "+" : ""}${d.toFixed(1)} pt</div>`;
}

function euro(n) {
  return Math.round(Number(n) || 0).toLocaleString("it-IT") + ' <small>€</small>';
}
function perc(n) { return (Number(n) || 0).toFixed(1).replace(".", ",") + ' <small>%</small>'; }

/* ── periodi ───────────────────────────────────────────────────────────── */

function intervallo(p, oggi) {
  const a = new Date(oggi);
  const da = new Date(oggi);
  if (p === "settimana") da.setDate(da.getDate() - ((da.getDay() + 6) % 7));
  if (p === "mese") da.setDate(1);
  return { da: iso(da), a: iso(a) };
}

function intervalloPrecedente(p, oggi) {
  if (p === "oggi") {
    const d = new Date(oggi); d.setDate(d.getDate() - 1);
    return { da: iso(d), a: iso(d) };
  }
  if (p === "settimana") {
    const fine = new Date(oggi);
    fine.setDate(fine.getDate() - ((fine.getDay() + 6) % 7) - 1);
    const inizio = new Date(fine); inizio.setDate(inizio.getDate() - 6);
    return { da: iso(inizio), a: iso(fine) };
  }
  const fine = new Date(oggi.getFullYear(), oggi.getMonth(), 0);
  const inizio = new Date(fine.getFullYear(), fine.getMonth(), 1);
  return { da: iso(inizio), a: iso(fine) };
}

function iso(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function giornoDellAnno(d) {
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stile() {
  return `<style>
  .ad-home{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--verde:#348127;--rosso:#B91C1C;
    --riga:#E2E6EA;--testo:#12232E;--muto:#6B7A83;
    padding:16px 14px 90px;max-width:560px;margin:0 auto;color:var(--testo);}
  .ad-caric{padding:40px 0;text-align:center;color:#94a3b8;}
  .ad-salve{font-size:21px;font-weight:800;}
  .ad-salve span{display:block;color:var(--muto);font-weight:500;font-size:14px;margin-top:3px;text-transform:capitalize;}

  .ad-per{display:flex;gap:6px;margin:14px 0;}
  .ad-per button{flex:1;border:1px solid var(--riga);background:#fff;border-radius:10px;padding:9px;
    font-size:13px;font-family:inherit;color:var(--muto);cursor:pointer;}
  .ad-per button.on{background:var(--navy);color:#fff;border-color:var(--navy);font-weight:700;}

  .ad-num{background:#fff;border:1px solid var(--riga);border-radius:18px;overflow:hidden;margin-bottom:18px;}
  .ad-num .n{display:flex;align-items:center;gap:14px;padding:16px;border-top:1px solid #F1F4F6;}
  .ad-num .n:first-child{border-top:none;}
  .ad-num .lab{flex:1;}
  .ad-num .lab b{display:block;font-size:13.5px;color:var(--muto);font-weight:600;}
  .ad-num .v{font-family:Georgia,serif;font-size:29px;color:var(--navy);line-height:1.15;margin-top:2px;}
  .ad-num .v small{font-size:15px;color:var(--muto);}
  .ad-num .nota{font-size:12.5px;color:var(--muto);}
  .ad-num .sc{font-size:13px;font-weight:700;padding:6px 10px;border-radius:100px;white-space:nowrap;}
  .ad-num .sc.su{background:#F1F8ED;color:var(--verde);}
  .ad-num .sc.giu{background:#FEF2F2;color:var(--rosso);}
  .ad-num .sc.pari{background:#F4F6F8;color:var(--muto);}

  .ad-sez{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muto);margin:0 0 9px 4px;}
  .ad-dec{background:#fff;border:1px solid var(--riga);border-radius:16px;overflow:hidden;margin-bottom:20px;}
  .ad-dec .d{display:flex;align-items:center;gap:12px;padding:14px 15px;border-top:1px solid #F1F4F6;text-decoration:none;color:var(--testo);}
  .ad-dec .d:first-child{border-top:none;}
  .ad-dec .pun{width:9px;height:9px;border-radius:50%;flex:0 0 9px;font-style:normal;}
  .ad-dec .d.rosso .pun{background:var(--rosso);}
  .ad-dec .d.giallo .pun{background:var(--ambra);}
  .ad-dec .t{flex:1;font-size:15px;line-height:1.3;}
  .ad-dec .t span{display:block;font-size:12.5px;color:var(--muto);margin-top:2px;}
  .ad-dec b{color:#CBD5DB;font-size:19px;}
  .ad-dec .vuoto{padding:18px 15px;font-size:14px;color:var(--verde);background:#F6FBF3;}

  .ad-com{background:var(--navy);color:#fff;border-radius:16px;padding:18px;margin-bottom:20px;}
  .ad-com .et{font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ambra);margin-bottom:8px;}
  .ad-com p{font-family:Georgia,serif;font-size:18px;line-height:1.45;margin:0;}

  .ad-griglia{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .ad-griglia .p{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:16px 14px;text-decoration:none;color:var(--navy);}
  .ad-griglia .p i{font-style:normal;font-size:20px;display:block;margin-bottom:8px;}
  .ad-griglia .p b{display:block;font-size:15.5px;}
  .ad-griglia .p span{font-size:12.5px;color:var(--muto);}

  .ad-griglia .p.spicca{background:#F6FAFC;border-color:#CFE0E8;}
  .ad-pie{text-align:center;font-size:11.5px;color:#9AA7AF;margin-top:22px;}
  </style>`;
}
