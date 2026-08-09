// js/views/home-admin.js
// LA BUSSOLA. Una domanda sola: "sto guadagnando?"
// Tre numeri con lo scostamento sul periodo precedente, e sotto solo
// le cose che aspettano una decisione. Tutto il resto sta nei moduli:
// la dashboard completa di prima resta su #/dashboard-dettaglio.

// il tab notifiche si carica a runtime: se il file non c'e' ancora
// su Pages la home deve restare in piedi lo stesso.

let periodo = "settimana";
let daPers = null, aPers = null;   // intervallo scelto a mano

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

  const [ora, prima, decisioni, comandamenti, fissi] = await Promise.all([
    kpi(supabase, azienda.id, sede?.id, per),
    kpi(supabase, azienda.id, sede?.id, prec),
    listaDecisioni(supabase, azienda.id),
    listaComandamenti(supabase, azienda.id),
    fissiPeriodo(supabase, azienda.id, sede?.id, per),
  ]);

  const com = comandamenti.length
    ? comandamenti[giornoDellAnno(oggi) % comandamenti.length] : null;

  const fcOra = ora.incasso ? (ora.materiaPrima / ora.incasso) * 100 : null;
  const fcPrima = prima.incasso ? (prima.materiaPrima / prima.incasso) * 100 : null;
  const lavPerc = ora.incasso ? (ora.costoLavoro / ora.incasso) * 100 : null;

  container.innerHTML = `
    <div class="ad-home">

      <div class="ad-salve">${esc(azienda?.nome || "")}
        <span>${sede?.nome ? esc(sede.nome) : "tutte le sedi"}</span>
      </div>

      <div id="notifiche-tab"></div>

      <div class="ad-per">
        ${[["oggi","Oggi"],["settimana","Settimana"],["mese","Mese"],["anno","Anno"],["pers","Scegli"]].map(([p,l]) =>
          `<button data-per="${p}" class="${p === periodo ? "on" : ""}">${l}</button>`).join("")}
      </div>

      ${periodo === "pers" ? `
        <div class="ad-date">
          <input type="date" id="ad-da" value="${per.da}">
          <span>→</span>
          <input type="date" id="ad-a" value="${per.a}">
        </div>` : ""}

      <div class="ad-quando">
        <b>${etichettaPeriodo(per)}</b>
        <span>confronto con ${etichettaPeriodo(prec)}</span>
      </div>

${sintesi(ora)}

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
        <a href="#/prenotazioni" class="p spicca"><i>📖</i><b>Prenotazioni</b><span>Sala e coperti</span></a>
        <a href="#/bo-bilancio" class="p"><i>📊</i><b>Bilancio</b><span>Conto economico</span></a>
        <a href="#/menu-intelligence" class="p"><i>🍽️</i><b>Menu engineering</b><span>Cosa rende davvero</span></a>
        <a href="#/acquisti" class="p"><i>🧾</i><b>Fatture</b><span>Acquisti e costi</span></a>
        <a href="#/persone" class="p"><i>👥</i><b>Personale</b><span>Ore e costi</span></a>
        <a href="#/dashboard-dettaglio" class="p spicca"><i>📈</i><b>Cruscotto</b><span>Grafici del periodo</span></a>
        <a href="#/venduto" class="p spicca"><i>🧾</i><b>Venduto</b><span>Prodotti e quantità</span></a>
      </div>

      <div class="ad-pie">${esc(azienda?.nome || "")}</div>
    </div>
    ${stile()}`;

  import("../components/notifiche-tab.js?v=" + (window.APP_V || "1"))
    .then(m => m.initNotificheTab())
    .catch(e => console.warn("tab notifiche non caricato:", e));

  import("../components/camera.js?v=" + (window.APP_V || "1"))
    .then(m => m.montaBottoneCamera())
    .catch(e => console.warn("camera non caricata:", e));

  import("../components/supertony-fab.js?v=" + (window.APP_V || "1"))
    .then(m => m.montaSuperTony())
    .catch(e => console.warn("super tony non caricato:", e));

  import("../components/messaggi-personale.js?v=" + (window.APP_V || "1"))
    .then(m => m.montaMessaggiHome())
    .catch(e => console.warn("messaggi non caricati:", e));

  // scorciatoia al calendario: e la cosa che si guarda ogni giorno
  import("../components/scorciatoie.js?v=" + (window.APP_V || "1"))
    .then(m => m.montaScorciatoie())
    .catch(e => console.warn("scorciatoie non caricate:", e));

  container.querySelectorAll("[data-per]").forEach(b => {
    b.addEventListener("click", () => {
      periodo = b.getAttribute("data-per");
      if (periodo === "pers" && !daPers) {
        const d = new Date(); d.setDate(d.getDate() - 30);
        daPers = iso(d); aPers = iso(new Date());
      }
      render(container);
    });
  });

  ["ad-da", "ad-a"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      daPers = document.getElementById("ad-da").value;
      aPers = document.getElementById("ad-a").value;
      if (daPers && aPers && daPers <= aPers) render(container);
    });
  });
}

/* ── numeri ────────────────────────────────────────────────────────────── */

// I numeri si calcolano dal venduto, non dalla funzione dashboard-kpi:
// e' la stessa logica della dashboard completa, cosi' i due schermi coincidono.
async function kpi(supabase, aziendaId, sedeId, range) {
  const out = { incasso: 0, materiaPrima: 0, costoLavoro: 0, coperti: 0, giorni: [], venduto: [] };
  const norm = (x) => String(x == null ? "" : x).trim().toLowerCase();

  try {
    // ── incasso e materia prima, dal venduto giornaliero ──
    let vq = supabase.from("vendite_giornaliere")
      .select("data_vendita, nome_prodotto, nome_articolo, quantita, totale_incassato, totale_riga")
      .eq("azienda_id", aziendaId)
      .gte("data_vendita", range.da).lte("data_vendita", range.a).limit(50000);
    if (sedeId != null) vq = vq.eq("sede_uuid", sedeId);
    const { data: vendite } = await vq;

    if (vendite && vendite.length) {
      out.incasso = vendite.reduce((s, r) => s + Number(r.totale_incassato ?? r.totale_riga ?? 0), 0);

      // I coperti si battono in cassa come articolo: sono la fonte piu' affidabile
      // che abbiamo, molto piu' della tabella coperti_giornalieri che nessuno compila.
      const eCoperto = (r) => norm(r.nome_prodotto || r.nome_articolo).startsWith("coperto");
      out.coperti = vendite.filter(eCoperto).reduce((s, r) => s + (Number(r.quantita) || 0), 0);

      // giorno per giorno
      const perGiorno = new Map();
      vendite.forEach(r => {
        const g = r.data_vendita;
        if (!g) return;
        const o = perGiorno.get(g) || { data: g, incasso: 0, coperti: 0 };
        o.incasso += Number(r.totale_incassato ?? r.totale_riga ?? 0);
        if (eCoperto(r)) o.coperti += Number(r.quantita) || 0;
        perGiorno.set(g, o);
      });
      out.giorni = [...perGiorno.values()].sort((a, b) => a.data < b.data ? -1 : 1);

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

      // venduto per piatto, coperti esclusi
      const perPiatto = new Map();
      vendite.forEach(r => {
        if (eCoperto(r)) return;
        const n = r.nome_prodotto || r.nome_articolo || "—";
        const o = perPiatto.get(n) || { nome: n, pezzi: 0, incasso: 0, costo: 0 };
        const q = Number(r.quantita) || 0;
        o.pezzi += q;
        o.incasso += Number(r.totale_incassato ?? r.totale_riga ?? 0);
        o.costo += (fc.get(norm(r.nome_prodotto || r.nome_articolo)) || 0) * q;
        perPiatto.set(n, o);
      });
      perPiatto.forEach(o => { o.margine = o.incasso - o.costo; });
      out.venduto = [...perPiatto.values()].sort((a, b) => b.incasso - a.incasso).slice(0, 40);

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

// Costi fissi: in tabella stanno come importo annuo, qui servono a giornata.
// Attenzione: costi_fissi e' una tabella vecchia, la sede si filtra con sede_uuid.
async function fissiPeriodo(supabase, aziendaId, sedeId, range) {
  try {
    let q = supabase.from("costi_fissi")
      .select("importo_annuo, sede_uuid, attivo, anno_riferimento")
      .eq("azienda_id", aziendaId).eq("attivo", true);
    const { data } = await q;
    if (!data || !data.length) return { giorno: 0, periodo: 0 };
    const righe = sedeId == null ? data
      : data.filter(r => r.sede_uuid == null || String(r.sede_uuid) === String(sedeId));
    const annuo = righe.reduce((s, r) => s + (Number(r.importo_annuo) || 0), 0);
    const giorno = annuo / 365;
    const gg = Math.max(1, Math.round((new Date(range.a) - new Date(range.da)) / 86400000) + 1);
    return { giorno, periodo: giorno * gg, giorni: gg };
  } catch (e) { console.warn("costi fissi:", e); return { giorno: 0, periodo: 0 }; }
}


/* ── cruscotto ─────────────────────────────────────────────────────────── */

// Usata anche da #/dashboard-dettaglio (il pulsante "Andamento"),
// cosi' il cruscotto e' identico nei due schermi e si mantiene in un posto solo.
export async function bloccoCruscotto(supabase, aziendaId, sedeId, range) {
  const [ora, fissi] = await Promise.all([
    kpi(supabase, aziendaId, sedeId, range),
    fissiPeriodo(supabase, aziendaId, sedeId, range),
  ]);
  return cruscotto(ora, null, fissi) + stile();
}


// L'arco mostra dove va l'incasso: lavoro, materia prima, fissi e cio' che resta.
// La lancetta si ferma sul risultato, la tacca dorata sul punto di pareggio.
// In home si mostra l'essenziale: quanto e entrato e l'andamento dei giorni.
// Arco del margine, ripartizione dei costi, coperti e venduto stanno nel
// Cruscotto, che si apre dal pulsante: in home erano troppa roba da leggere
// con il telefono in mano durante il servizio.
function sintesi(ora) {
  const inc = Number(ora.incasso) || 0;
  if (inc <= 0) {
    return `<div class="cr-vuoto">Nessun incasso registrato in questo periodo.</div>`;
  }
  const gg = ora.giorni || [];
  const maxG = Math.max(1, ...gg.map(g => g.incasso));

  return `
    <div class="cr-testa">
      <span>Incasso</span><b>${euro(inc)}</b>
      <i>IVA non scorporata</i>
    </div>

    ${gg.length ? `
    <details class="cr-apri">
      <summary>
        <span>Giorno per giorno</span>
        <em>${gg.length} giorni</em>
        <b>›</b>
      </summary>
    <div class="cr-giorni">
      ${gg.map(g => {
        const cm = g.coperti ? g.incasso / g.coperti : 0;
        return `
        <details class="g">
          <summary>
            <span class="dd">${giornoBreve(g.data)}</span>
            <span class="bar"><i style="width:${Math.max(2, (g.incasso / maxG) * 100).toFixed(1)}%"></i></span>
            <b>${euro(g.incasso)}</b>
            <span class="cop">${g.coperti || ""}</span>
          </summary>
          <div class="gd">
            <div><span>Coperto medio</span><b>${cm ? euro(cm) : "—"}</b></div>
            <div><span>Coperti</span><b>${g.coperti || "—"}</b></div>
            <div><span>Incasso</span><b>${euro(g.incasso)}</b></div>
          </div>
        </details>`;
      }).join("")}
    </div>
    </details>` : ""}
  `;
}

// NON PIU' USATA IN HOME: il cruscotto completo vive in #/dashboard-dettaglio.
// Resta qui perche' rimetterlo in home e' questione di una riga.
function cruscotto(ora, prima, fissi) {
  const inc = Number(ora.incasso) || 0;
  const lav = Number(ora.costoLavoro) || 0;
  const foo = Number(ora.materiaPrima) || 0;
  const fis = Number(fissi.periodo) || 0;
  const costi = lav + foo + fis;
  const margine = inc - costi;

  if (inc <= 0) {
    return `<div class="cr-vuoto">Nessun incasso registrato in questo periodo.</div>`;
  }

  const pLav = (lav / inc) * 100, pFoo = (foo / inc) * 100;
  const pFis = (fis / inc) * 100, pMar = (margine / inc) * 100;
  const R = 118, C = Math.PI * R;
  const cum = (p) => Math.max(0, Math.min(100, p)) / 100 * C;
  const d1 = cum(pLav), d2 = cum(pLav + pFoo), d3 = cum(pLav + pFoo + pFis);

  const frazioneCosti = Math.max(0, Math.min(1, costi / inc));
  const punto = (frazione, raggio) => {
    const a = Math.PI * Math.max(0, Math.min(1, frazione));
    return { x: 150 - raggio * Math.cos(a), y: 150 - raggio * Math.sin(a) };
  };
  // lancetta a meta' del margine: e' li' che sta il risultato del periodo
  const pl = punto(frazioneCosti + (1 - frazioneCosti) / 2, 88);
  const t1 = punto(frazioneCosti, 108), t2 = punto(frazioneCosti, 130);

  const coperti = Math.round(Number(ora.coperti) || 0);
  const medio = coperti ? inc / coperti : 0;
  const copPareggio = medio > 0 ? Math.ceil(costi / medio) : 0;
  const gg = ora.giorni || [];
  const maxG = Math.max(1, ...gg.map(g => g.incasso));
  const migliore = Math.max(0, ...gg.map(g => g.coperti));
  const mediaG = gg.length ? Math.round(coperti / gg.length) : 0;

  const vend = ora.venduto || [];

  return `
    <div class="cr-testa">
      <span>Incasso</span><b>${euro(inc)}</b>
      <i>IVA non scorporata</i>
    </div>

    <div class="cr-arco">
      <svg viewBox="0 0 300 168" width="100%">
        <defs>
          <linearGradient id="gLav" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#f2a09a"/><stop offset="100%" stop-color="#cf3f36"/></linearGradient>
          <linearGradient id="gFoo" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#f3bd8a"/><stop offset="100%" stop-color="#d97a25"/></linearGradient>
          <linearGradient id="gFis" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#ecd98c"/><stop offset="100%" stop-color="#c9a81f"/></linearGradient>
          <linearGradient id="gMar" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#8ed3b0"/><stop offset="100%" stop-color="#1c8a56"/></linearGradient>
        </defs>
        <path d="M32 150 A118 118 0 0 1 268 150" fill="none" stroke="#f1f3f5" stroke-width="19" stroke-linecap="round"/>
        <path d="M32 150 A118 118 0 0 1 268 150" fill="none" stroke="url(#gMar)" stroke-width="19" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)} ${C.toFixed(1)}"/>
        <path d="M32 150 A118 118 0 0 1 268 150" fill="none" stroke="url(#gFis)" stroke-width="19" stroke-dasharray="${d3.toFixed(1)} ${C.toFixed(1)}"/>
        <path d="M32 150 A118 118 0 0 1 268 150" fill="none" stroke="url(#gFoo)" stroke-width="19" stroke-dasharray="${d2.toFixed(1)} ${C.toFixed(1)}"/>
        <path d="M32 150 A118 118 0 0 1 268 150" fill="none" stroke="url(#gLav)" stroke-width="19" stroke-linecap="round" stroke-dasharray="${d1.toFixed(1)} ${C.toFixed(1)}"/>
        <line x1="${t1.x.toFixed(1)}" y1="${t1.y.toFixed(1)}" x2="${t2.x.toFixed(1)}" y2="${t2.y.toFixed(1)}" stroke="#b98a3e" stroke-width="3" stroke-linecap="round"/>
        <line x1="150" y1="150" x2="${pl.x.toFixed(1)}" y2="${pl.y.toFixed(1)}" stroke="#132029" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="150" cy="150" r="12" fill="#132029"/><circle cx="150" cy="150" r="4.5" fill="#fff"/>
      </svg>
    </div>

    <div class="cr-bep"><span>Pareggio</span><b>${euro(costi)}</b></div>

    <div class="cr-margine ${margine >= 0 ? "su" : "giu"}">
      <span>Margine</span>
      <b>${margine >= 0 ? "+" : ""}${euro(margine)}</b>
      <i>${perc(pMar)} dell'incasso</i>
    </div>

    <div class="cr-tit">Dove va l'incasso</div>
    <div class="cr-barra">
      <i style="width:${Math.max(0,pLav).toFixed(1)}%;background:linear-gradient(90deg,#f2a09a,#cf3f36)"></i>
      <i style="width:${Math.max(0,pFoo).toFixed(1)}%;background:linear-gradient(90deg,#f3bd8a,#d97a25)"></i>
      <i style="width:${Math.max(0,pFis).toFixed(1)}%;background:linear-gradient(90deg,#ecd98c,#c9a81f)"></i>
      <i style="width:${Math.max(0,pMar).toFixed(1)}%;background:linear-gradient(90deg,#8ed3b0,#1c8a56)"></i>
    </div>
    <div class="cr-chiavi">
      <span><s style="background:linear-gradient(135deg,#f2a09a,#cf3f36)"></s>
        <em>Lavoro</em><b>${euro(lav)}</b><u>${perc(pLav)}</u></span>
      <span><s style="background:linear-gradient(135deg,#f3bd8a,#d97a25)"></s>
        <em>Food cost</em><b>${euro(foo)}</b><u>${perc(pFoo)}</u></span>
      <span><s style="background:linear-gradient(135deg,#ecd98c,#c9a81f)"></s>
        <em>Fissi</em><b>${euro(fis)}</b><u>${perc(pFis)}</u></span>
      <span><s style="background:linear-gradient(135deg,#8ed3b0,#1c8a56)"></s>
        <em>Margine</em><b>${euro(margine)}</b><u>${perc(pMar)}</u></span>
    </div>

    ${coperti ? `
    <div class="cr-cop">
      <div class="t">
        <div><span>Coperti</span><b>${coperti}</b></div>
        <div class="d">${copPareggio ? `ne servivano <b>${copPareggio}</b><br>${coperti - copPareggio >= 0
          ? (coperti - copPareggio) + " in più del pareggio"
          : Math.abs(coperti - copPareggio) + " sotto il pareggio"}` : ""}</div>
      </div>
      <div class="pista">
        <div class="fatto" style="width:${copPareggio ? Math.min(100, (coperti / Math.max(coperti, copPareggio)) * 100).toFixed(1) : 0}%"></div>
        ${copPareggio ? `<div class="tacca" style="left:${Math.min(99, (copPareggio / Math.max(coperti, copPareggio)) * 100).toFixed(1)}%"></div>` : ""}
      </div>
      <div class="pie">
        <div>Coperto medio<b>${euro(medio)}</b></div>
        <div style="text-align:center">Media al giorno<b>${mediaG}</b></div>
        <div style="text-align:right">Giorno migliore<b>${migliore}</b></div>
      </div>
    </div>` : ""}

    ${gg.length ? `
    <div class="cr-tit">Giorno per giorno <em>tocca per aprire</em></div>
    <div class="cr-giorni">
      ${gg.map(g => {
        const cm = g.coperti ? g.incasso / g.coperti : 0;
        return `<details class="g">
          <summary>
            <span class="dt">${giornoBreve(g.data)}</span>
            <span class="bar"><i style="width:${((g.incasso / maxG) * 100).toFixed(0)}%"></i></span>
            <span class="vl">${euro(g.incasso)}</span>
            <span class="cp">${g.coperti || "—"}</span>
          </summary>
          <div class="dett">
            <div><span>Coperto medio</span><b>${cm ? euro(cm) : "—"}</b></div>
            <div><span>Coperti</span><b>${g.coperti || "—"}</b></div>
            <div><span>Incasso</span><b>${euro(g.incasso)}</b></div>
            <a href="#/venduto">Vedi il venduto del giorno ›</a>
          </div>
        </details>`;
      }).join("")}
    </div>` : ""}

    ${vend.length ? `
    <div class="cr-tit">Venduto del periodo</div>
    <div class="cr-ordina">
      <span>Ordina per</span>
      <select onchange="window.__ordinaVenduto(this.value)">
        <option value="incasso">Incasso</option>
        <option value="pezzi">Quantità</option>
        <option value="margine">Margine</option>
      </select>
    </div>
    <div class="cr-intest"><span>Piatto</span><span>Nr</span><span id="cr-col">Venduto</span></div>
    <div class="cr-lista" id="cr-lista">
      ${vend.map(v => rigaVenduto(v)).join("")}
    </div>` : ""}
  `;
}

function rigaVenduto(v) {
  const mar = Number(v.margine) || 0;
  return `<a class="v" href="#/menu-intelligence"
     data-pezzi="${v.pezzi}" data-incasso="${v.incasso}" data-margine="${mar}">
    <span class="nm">${esc(v.nome)}</span>
    <span class="qt">${Math.round(v.pezzi)}</span>
    <span class="im" data-eu-incasso="${euro(v.incasso)}" data-eu-margine="${mar ? euro(mar) : "—"}">${euro(v.incasso)}</span><b>›</b>
  </a>`;
}

// definita sul modulo: cosi' funziona sia in home admin sia nella pagina Cruscotto
window.__ordinaVenduto = function (campo) {
  const lista = document.querySelector("#cr-lista");
  if (!lista) return;
  const col = document.querySelector("#cr-col");
  if (col) col.textContent = campo === "margine" ? "Margine" : "Venduto";
  lista.querySelectorAll(".im").forEach(el => {
    el.textContent = campo === "margine" ? el.dataset.euMargine : el.dataset.euIncasso;
  });
  [...lista.children]
    .sort((a, z) => Number(z.dataset[campo]) - Number(a.dataset[campo]))
    .forEach(n => lista.appendChild(n));
};

function giornoBreve(iso) {
  const gg = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  const d = new Date(iso + "T12:00:00");
  return gg[d.getDay()] + " " + d.getDate();
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
      livello: "rosso", link: "#/acquisti",   // bo-fatture non esiste come rotta: il click non portava da nessuna parte
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
    const { data } = await supabase.from("ricette")
      .select("id, nome").eq("azienda_id", aziendaId).eq("da_verificare", true).limit(200);
    if ((data || []).length) out.push({
      livello: "giallo", link: "#/ricette-da-verificare",
      titolo: data.length + (data.length === 1 ? " ricetta scritta da Tony" : " ricette scritte da Tony"),
      sotto: "Da controllare prima di usarne il costo: " + data.slice(0, 3).map(r => r.nome).join(", "),
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

  // ── PRODUZIONI APERTE ───────────────────────────────────────────────────
  // Un lotto aperto e cibo che sta lavorando senza che nessuno lo chiuda:
  // dopo un giorno diventa un problema di HACCP, non di ordine.
  try {
    const { data } = await supabase.from("produzione_lotti")
      .select("id, codice_lotto, created_at, ricette(nome)")
      .eq("azienda_id", aziendaId).eq("stato", "aperta").limit(50);
    if ((data || []).length) {
      const vecchie = (data || []).filter(l =>
        (Date.now() - new Date(l.created_at).getTime()) / 3600000 >= 24);
      out.push({
        livello: vecchie.length ? "rosso" : "giallo",
        link: "#/produzioni-aperte",
        titolo: data.length + (data.length === 1 ? " produzione aperta" : " produzioni aperte"),
        sotto: vecchie.length
          ? vecchie.length + " ferme da piu di un giorno: " + vecchie.slice(0, 2).map(l => l.ricette?.nome || l.codice_lotto).join(", ")
          : data.slice(0, 2).map(l => l.ricette?.nome || l.codice_lotto).join(", "),
      });
    }
  } catch (e) { /* niente */ }

  // ── LOTTI IN SCADENZA ───────────────────────────────────────────────────
  try {
    const oggi = new Date();
    const fra3 = new Date(oggi.getTime() + 3 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase.from("produzione_lotti")
      .select("codice_lotto, data_scadenza, ricette(nome)")
      .eq("azienda_id", aziendaId).not("data_scadenza", "is", null)
      .lte("data_scadenza", fra3).neq("stato", "aperta").limit(50);
    const scaduti = (data || []).filter(l => l.data_scadenza < oggi.toISOString().slice(0, 10));
    if ((data || []).length) out.push({
      livello: scaduti.length ? "rosso" : "giallo",
      link: "#/produzioni-storico",
      titolo: scaduti.length
        ? scaduti.length + (scaduti.length === 1 ? " lotto scaduto" : " lotti scaduti")
        : data.length + (data.length === 1 ? " lotto in scadenza" : " lotti in scadenza"),
      sotto: (scaduti.length ? scaduti : data).slice(0, 3)
        .map(l => (l.ricette?.nome || l.codice_lotto) + " · " + l.data_scadenza.split("-").reverse().join("/")).join(" · "),
    });
  } catch (e) { /* niente */ }

  // ── RECENSIONI SENZA RISPOSTA ───────────────────────────────────────────
  // Una recensione bassa lasciata li la leggono tutti, per sempre.
  try {
    const { data } = await supabase.from("recensioni")
      .select("id, voto, testo, created_at")
      .eq("azienda_id", aziendaId).is("risposta_titolare", null)
      .order("created_at", { ascending: false }).limit(50);
    const basse = (data || []).filter(r => Number(r.voto) <= 3);
    if ((data || []).length) out.push({
      livello: basse.length ? "rosso" : "giallo",
      link: "#/recensioni-ricevute",
      titolo: basse.length
        ? basse.length + (basse.length === 1 ? " recensione critica da gestire" : " recensioni critiche da gestire")
        : data.length + (data.length === 1 ? " recensione senza risposta" : " recensioni senza risposta"),
      sotto: (basse.length ? basse : data)[0]?.testo
        ? String((basse.length ? basse : data)[0].testo).slice(0, 90)
        : "Rispondere conta piu di quanto sembri",
    });
  } catch (e) { /* niente */ }

  // ── PREVENTIVI IN ATTESA DI RISPOSTA ────────────────────────────────────
  try {
    const { data } = await supabase.from("preventivi")
      .select("id, titolo_evento, data_evento, scadenza_il, totale")
      .eq("azienda_id", aziendaId).eq("stato", "inviato").limit(50);
    if ((data || []).length) {
      const oggi = new Date().toISOString().slice(0, 10);
      const inScadenza = (data || []).filter(p => p.scadenza_il && String(p.scadenza_il).slice(0, 10) <= oggi);
      out.push({
        livello: inScadenza.length ? "rosso" : "giallo",
        link: "#/preventivi",
        titolo: data.length + (data.length === 1 ? " preventivo in attesa" : " preventivi in attesa"),
        sotto: inScadenza.length
          ? inScadenza.length + " gia scaduti: " + inScadenza.slice(0, 2).map(p => p.titolo_evento).join(", ")
          : data.slice(0, 2).map(p => p.titolo_evento).join(", "),
      });
    }
  } catch (e) { /* niente */ }

  // ── TEST DI COMPETENZA NON COMPLETATI ───────────────────────────────────
  try {
    const { data } = await supabase.from("test_competenze_invii")
      .select("id, stato, scadenza, dipendenti(nome)")
      .eq("azienda_id", aziendaId).in("stato", ["inviato", "aperto"]).limit(100);
    if ((data || []).length) {
      const oggi = new Date().toISOString();
      const scaduti = (data || []).filter(i => i.scadenza && i.scadenza < oggi);
      out.push({
        livello: scaduti.length ? "rosso" : "giallo",
        link: "#/bo-test",
        titolo: data.length + (data.length === 1 ? " test non ancora fatto" : " test non ancora fatti"),
        sotto: scaduti.length ? scaduti.length + " oltre la scadenza" : "In attesa di risposta",
      });
    }
  } catch (e) { /* niente */ }

  // ── PRODOTTI CON CONVERSIONE INVENTATA ──────────────────────────────────
  // Comprati a pezzo o a cassa ma usati in ricetta a grammi: senza sapere
  // quanto contiene un pezzo, il costo viene calcolato come se pesasse un chilo.
  // Non da' errore, da' un numero credibile e sbagliato.
  // Il controllo guarda i dati, non un elenco fisso: un prodotto caricato
  // domani compare qui da solo il giorno stesso.
  try {
    const { data } = await supabase.rpc("prodotti_da_correggere", { p_azienda_id: aziendaId });
    if ((data || []).length) {
      const primi = data.slice(0, 3).map(r => r.prodotto).join(", ");
      const ricette = data.reduce((s, r) => s + (Number(r.ricette_coinvolte) || 0), 0);
      out.push({
        livello: "rosso",
        link: "#/prodotti-da-correggere",
        titolo: data.length + (data.length === 1
          ? " prodotto con costo non attendibile"
          : " prodotti con costo non attendibile"),
        sotto: "Comprati a pezzo, usati a peso: manca quanto contiene un pezzo. "
          + "Toccano " + ricette + (ricette === 1 ? " ricetta" : " ricette") + ". " + primi,
      });
    }
  } catch (e) { /* niente */ }

  // ── CONFIGURAZIONE DELL'AZIENDA ─────────────────────────────────────────
  // La percentuale e' calcolata sui dati veri, non sul flag profilo_completato,
  // che risultava vero anche per aziende senza partita IVA ne' indirizzo.
  try {
    const { data } = await supabase.rpc("stato_requisiti", { p_azienda_id: aziendaId });
    const obbligatori = (data || []).filter(r => r.obbligatorio);
    const mancanti = obbligatori.filter(r => !r.completato);
    if (obbligatori.length && mancanti.length) {
      const perc = Math.round(((obbligatori.length - mancanti.length) * 100) / obbligatori.length);
      out.push({
        livello: perc < 60 ? "rosso" : "giallo",
        link: "#/completaAzienda",
        titolo: "Configurazione al " + perc + "%",
        sotto: "Mancano " + mancanti.length + (mancanti.length === 1 ? " voce: " : " voci: ")
          + mancanti.slice(0, 3).map(r => r.etichetta).join(", ")
          + (mancanti.length > 3 ? " e altre" : ""),
      });
    }
  } catch (e) { /* niente */ }

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
  if (p === "pers" && daPers && aPers) return { da: daPers, a: aPers };
  const a = new Date(oggi);
  const da = new Date(oggi);
  if (p === "settimana") da.setDate(da.getDate() - ((da.getDay() + 6) % 7));
  if (p === "mese") da.setDate(1);
  if (p === "anno") { da.setMonth(0); da.setDate(1); }
  return { da: iso(da), a: iso(a) };
}

function etichettaPeriodo(r) {
  const f = (x) => new Date(x + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  const anno = (x) => new Date(x + "T12:00:00").getFullYear();
  if (r.da === r.a) return f(r.da) + " " + anno(r.da);
  if (anno(r.da) !== anno(r.a)) return f(r.da) + " " + anno(r.da) + " → " + f(r.a) + " " + anno(r.a);
  return f(r.da) + " → " + f(r.a) + " " + anno(r.a);
}

function intervalloPrecedente(p, oggi) {
  // periodo a mano o anno: si guarda indietro dello stesso numero di giorni
  if (p === "pers" || p === "anno") {
    const r = intervallo(p, oggi);
    const d1 = new Date(r.da + "T12:00:00"), d2 = new Date(r.a + "T12:00:00");
    const giorni = Math.round((d2 - d1) / 86400000) + 1;
    const fine = new Date(d1); fine.setDate(fine.getDate() - 1);
    const inizio = new Date(fine); inizio.setDate(inizio.getDate() - giorni + 1);
    return { da: iso(inizio), a: iso(fine) };
  }
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
  .cr-apri{background:#fff;border:1px solid #e8ecef;border-radius:14px;margin:0 0 14px;overflow:hidden}
.cr-apri>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;
  padding:15px 16px;font-weight:800;font-size:15px;color:#122A38}
.cr-apri>summary::-webkit-details-marker{display:none}
.cr-apri>summary em{margin-left:auto;font-style:normal;font-weight:600;font-size:13px;color:#94a3b8}
.cr-apri>summary b{color:#94a3b8;transition:transform .18s}
.cr-apri[open]>summary b{transform:rotate(90deg)}
.cr-apri[open]>summary{border-bottom:1px solid #f1f3f5}
.cr-apri .cr-giorni{padding:4px 10px 10px}
.cr-vuoto{margin:14px 16px;padding:22px;text-align:center;color:#8a94a2;background:#faf9f7;
    border:1px solid #e8ecf0;border-radius:14px;font-size:13.5px}
  .cr-arco{padding:6px 16px 0;text-align:center}
  .cr-arco svg{max-width:330px;width:100%}
  .cr-testa{text-align:center;padding:14px 16px 0}
  .cr-testa span{display:block;font-size:9.5px;letter-spacing:2.2px;color:#8a94a2;text-transform:uppercase}
  .cr-testa b{display:block;font-size:30px;font-weight:700;letter-spacing:-.6px;margin-top:2px}
  .cr-testa i{display:block;font-style:normal;font-size:10px;color:#b6c1cb;margin-top:2px}
  .cr-bep{text-align:center;margin:-14px 16px 0}
  .cr-bep span{font-size:9.5px;letter-spacing:2.2px;color:#8a94a2;text-transform:uppercase;margin-right:7px}
  .cr-bep b{font-size:17px;font-weight:700;color:#b98a3e}
  .cr-margine{margin:12px 16px 0;border-radius:14px;padding:13px;text-align:center;border:1px solid}
  .cr-margine.su{background:#eefaf3;border-color:#c3e9d5}
  .cr-margine.giu{background:#fdf0ef;border-color:#f3ccc9}
  .cr-margine span{display:block;font-size:9.5px;letter-spacing:2.2px;text-transform:uppercase;color:#8a94a2}
  .cr-margine b{display:block;font-size:27px;font-weight:700;letter-spacing:-.5px;margin-top:2px}
  .cr-margine.su b{color:#1c8a56} .cr-margine.giu b{color:#cf3f36}
  .cr-margine i{display:block;font-style:normal;font-size:11.5px;color:#8a94a2;margin-top:3px}
  .cr-tit{padding:18px 16px 0;font-size:9.5px;letter-spacing:2px;color:#8a94a2;text-transform:uppercase;font-weight:700}
  .cr-tit em{font-style:normal;color:#b6c1cb;letter-spacing:.6px;margin-left:6px;font-size:9px;font-weight:400}
  .cr-barra{display:flex;height:12px;border-radius:999px;overflow:hidden;margin:10px 16px 0;background:#f1f3f5}
  .cr-barra i{display:block;height:100%}
  .cr-chiavi{display:grid;grid-template-columns:1fr 1fr;gap:9px 12px;padding:13px 16px 0}
  .cr-chiavi span{display:grid;grid-template-columns:11px 1fr;grid-template-rows:auto auto auto;
    column-gap:8px;align-items:center}
  .cr-chiavi s{width:9px;height:9px;border-radius:3px;display:block;text-decoration:none;grid-row:1/4}
  .cr-chiavi em{font-style:normal;font-size:10px;letter-spacing:1.1px;text-transform:uppercase;color:#8a94a2}
  .cr-chiavi b{font-size:14px;font-weight:700;color:#132029;line-height:1.25}
  .cr-chiavi u{text-decoration:none;font-size:11px;color:#8a94a2}
  .cr-cop{margin:16px 16px 0;background:#faf9f7;border:1px solid #e8ecf0;border-radius:14px;padding:16px}
  .cr-cop .t{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:13px}
  .cr-cop .t span{font-size:9.5px;letter-spacing:2.2px;color:#8a94a2;text-transform:uppercase}
  .cr-cop .t b{display:block;font-size:26px;font-weight:700}
  .cr-cop .d{font-size:11.5px;color:#8a94a2;text-align:right;line-height:1.5}
  .cr-cop .d b{color:#b98a3e;font-size:inherit;display:inline}
  .cr-cop .pista{position:relative;height:9px;background:#eceae5;border-radius:999px}
  .cr-cop .fatto{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:linear-gradient(90deg,#8fd0ae,#2fa36b)}
  .cr-cop .tacca{position:absolute;top:-6px;bottom:-6px;width:2px;background:#b98a3e}
  .cr-cop .pie{display:flex;justify-content:space-between;margin-top:14px;font-size:11.5px;color:#8a94a2}
  .cr-cop .pie b{display:block;color:#132029;font-size:15px;margin-top:2px}
  .cr-giorni{margin:8px 16px 0}
  .cr-giorni .g{border-bottom:1px solid #eef1f4}
  .cr-giorni .g:last-child{border-bottom:none}
  .cr-giorni summary{display:flex;align-items:center;gap:10px;padding:11px 0;cursor:pointer;list-style:none}
  .cr-giorni summary::-webkit-details-marker{display:none}
  .cr-giorni .dt{font-size:12px;color:#8a94a2;width:46px}
  .cr-giorni .bar{flex:1;height:6px;background:#f1f3f5;border-radius:999px;overflow:hidden}
  .cr-giorni .bar i{display:block;height:100%;background:linear-gradient(90deg,#9dc4d8,#3f7f9e)}
  .cr-giorni .vl{font-size:12px;font-weight:700;width:68px;text-align:right}
  .cr-giorni .cp{font-size:11px;color:#8a94a2;width:32px;text-align:right}
  .cr-giorni .dett{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:2px 0 14px}
  .cr-giorni .dett div{background:#faf9f7;border:1px solid #e8ecf0;border-radius:10px;padding:9px 6px;text-align:center}
  .cr-giorni .dett span{display:block;font-size:10px;color:#8a94a2}
  .cr-giorni .dett b{font-size:14px}
  .cr-giorni .dett a{grid-column:1/-1;text-align:center;font-size:12px;color:#2c6f8f;font-weight:600;
    text-decoration:none;padding-top:2px}
  .cr-ordina{display:flex;align-items:center;gap:6px;padding:10px 16px 0}
  .cr-ordina span{font-size:11px;color:#8a94a2;margin-right:2px}
  .cr-ordina select{border:1px solid #e8ecf0;background:#fff;border-radius:8px;padding:6px 10px;
    font-size:12px;font-weight:600;color:#132029;font-family:inherit}
  .cr-intest{display:flex;gap:10px;padding:14px 16px 6px;font-size:9.5px;letter-spacing:1.4px;
    color:#b6c1cb;text-transform:uppercase}
  .cr-intest span:first-child{flex:1}
  .cr-intest span:nth-child(2){width:34px;text-align:right}
  .cr-intest span:nth-child(3){width:76px;text-align:right;padding-right:14px}
  .cr-lista{padding:0 16px}
  .cr-lista .v{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #eef1f4;
    text-decoration:none;color:inherit}
  .cr-lista .v:last-child{border-bottom:none}
  .cr-lista .nm{flex:1;font-size:13px}
  .cr-lista .qt{width:34px;text-align:right;font-size:12.5px;color:#8a94a2}
  .cr-lista .im{width:76px;text-align:right;font-size:13px;font-weight:700}
  .cr-lista .v b{color:#c3ccd4;font-weight:400}
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

  .ad-date{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
  .ad-date input{flex:1;padding:9px;border:1px solid var(--riga);border-radius:10px;font-size:14px;font-family:inherit;background:#fff;}
  .ad-date span{color:var(--muto);}
  .ad-quando{background:#fff;border:1px solid var(--riga);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:13.5px;}
  .ad-quando b{color:var(--navy);}
  .ad-quando span{display:block;color:var(--muto);font-size:12.5px;margin-top:2px;}
  .ad-legenda{font-size:12.5px;color:var(--muto);line-height:1.5;margin:-6px 4px 18px;}
  .ad-per button{white-space:nowrap;}
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
