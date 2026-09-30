/* =========================================================
   REGISTRO LOTTI — storico produzioni (sola lettura)
   Tutti i lotti (aperta/firmato/chiuso/...) con filtri e dettaglio HACCP
   ========================================================= */

let lottiCache = [];

const STATO_LABEL = {
  aperta: { t: "🟢 Aperta", c: "#16a34a" },
  firmato: { t: "✅ Chiusa", c: "#0E5A7A" },
  chiuso: { t: "✅ Chiusa", c: "#0E5A7A" },
  bozza: { t: "✏️ Bozza", c: "#94a3b8" },
  confermato: { t: "🔵 Confermata", c: "#2563eb" },
  annullato: { t: "✖ Annullata", c: "#dc2626" },
};

export async function render(app) {
  const azienda = window.state?.azienda;
  app.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:16px;">
      <h1 style="margin:0 0 4px;font-size:22px;">📒 Registro lotti</h1>
      <div style="color:#64748b;font-size:13px;margin-bottom:16px;">${escapeHtml(azienda?.nome || "")} — storico delle produzioni</div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:end;">
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Stato</label>
          <select id="rl-stato" class="input"><option value="">Tutti</option><option value="aperta">Aperte</option><option value="firmato">Chiuse</option><option value="annullato">Annullate</option></select>
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Dal</label>
          <input id="rl-dal" type="date" class="input">
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Al</label>
          <input id="rl-al" type="date" class="input">
        </div>
        <div style="flex:1;min-width:180px;">
          <label style="font-size:12px;color:#64748b;display:block;">Cerca (ricetta / lotto)</label>
          <input id="rl-cerca" class="input" placeholder="Es: Impasto pane" style="width:100%;box-sizing:border-box;">
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <button id="rl-stampa-registro" style="background:#fff;color:#0E5A7A;border:1px solid #0E5A7A;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;">🖨 Stampa registro</button>
      </div>

      <div id="rl-lista"><div style="color:#64748b;">Caricamento...</div></div>
    </div>
  `;

  ["rl-stato", "rl-dal", "rl-al"].forEach(id => document.getElementById(id)?.addEventListener("change", carica));
  document.getElementById("rl-cerca")?.addEventListener("input", () => renderLista());
  document.getElementById("rl-stampa-registro")?.addEventListener("click", stampaRegistro);

  await carica();
}

async function carica() {
  const cont = document.getElementById("rl-lista");
  const stato = document.getElementById("rl-stato")?.value || "";
  const dal = document.getElementById("rl-dal")?.value || "";
  const al = document.getElementById("rl-al")?.value || "";

  let q = window.supabaseClient
    .from("produzione_lotti")
    .select("id, lotto_uuid, codice_lotto, data_produzione, data_scadenza, quantita_output, unita_misura, luogo, note, stato, created_at, firmato_at, ricette(nome, codice), dipendenti!produzione_lotti_operatore_id_fkey(nome)")
    .eq("azienda_id", window.state.azienda.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (stato) q = q.eq("stato", stato);
  if (dal) q = q.gte("data_produzione", dal);
  if (al) q = q.lte("data_produzione", al);

  const { data, error } = await q;
  if (error) { cont.innerHTML = `<div style="color:#dc2626;">Errore: ${escapeHtml(error.message)}</div>`; return; }
  lottiCache = data || [];
  renderLista();
}

function renderLista() {
  const cont = document.getElementById("rl-lista");
  const cerca = (document.getElementById("rl-cerca")?.value || "").toLowerCase().trim();
  let lotti = lottiCache;
  if (cerca) lotti = lotti.filter(l => ((l.ricette?.nome || "") + " " + (l.codice_lotto || "")).toLowerCase().includes(cerca));

  if (!lotti.length) { cont.innerHTML = `<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;color:#64748b;">Nessun lotto trovato.</div>`; return; }

  cont.innerHTML = `<div style="font-size:12px;color:#64748b;margin-bottom:8px;">${lotti.length} lotti</div>` + lotti.map(l => {
    const st = STATO_LABEL[l.stato] || { t: l.stato || "—", c: "#64748b" };
    const nome = l.ricette?.nome || "Ricetta";
    const dataP = l.data_produzione ? new Date(l.data_produzione).toLocaleDateString("it-IT") : "—";
    const scad = l.data_scadenza ? new Date(l.data_scadenza).toLocaleDateString("it-IT") : "—";
    const op = l.dipendenti?.nome || "";
    return `
      <div class="card" data-lotto="${l.lotto_uuid || ""}" data-id="${l.id}" style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;margin-bottom:8px;cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;">${escapeHtml(nome)} <span style="color:${st.c};font-size:12px;font-weight:700;margin-left:6px;">${st.t}</span></div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">
              ${l.codice_lotto ? escapeHtml(l.codice_lotto) + " · " : ""}Prod. ${dataP} · Scad. ${scad}${l.quantita_output ? " · " + formatNum(l.quantita_output) + " kg" : ""}${l.luogo ? " · 📍 " + escapeHtml(l.luogo) : ""}${op ? " · " + escapeHtml(op) : ""}
            </div>
          </div>
          <div style="font-size:12px;color:#0E5A7A;">dettaglio ▾</div>
        </div>
        <div class="rl-dettaglio" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;"></div>
      </div>`;
  }).join("");

  cont.querySelectorAll("[data-lotto]").forEach(card => {
    card.addEventListener("click", () => toggleDettaglio(card));
  });
}

async function toggleDettaglio(card) {
  const box = card.querySelector(".rl-dettaglio");
  if (!box) return;
  if (box.style.display === "block") { box.style.display = "none"; return; }
  const uuid = card.dataset.lotto;
  const id = card.dataset.id;
  box.style.display = "block";
  box.innerHTML = `<div style="font-size:12px;color:#64748b;">Caricamento scheda...</div>`;

  const supa = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;

  const lotto = lottiCache.find(l => String(l.id) === String(id)) || {};

  const [fasiRes, ingrRes, lottoRes, prodRes] = await Promise.all([
    uuid ? supa.from("produzione_log_haccp")
      .select("fase_ordine, fase_nome, temperatura_rilevata, valore_misurato, valore_um, durata_reale_min, ccp, esito, firmato_da, operatore_nome, firmato_il, note")
      .eq("lotto_id", uuid).order("fase_ordine", { nullsFirst: false }) : Promise.resolve({ data: [] }),
    supa.from("produzione_lotto_ingredienti")
      .select("quantita, unita_misura, costo_totale, lotto_materia_prima, prodotti(nome)")
      .eq("lotto_id", id),
    supa.from("produzione_lotti")
      .select("ricetta_id, dettaglio_confezionamento, conforme, nc_motivo, firma_tramite, note, quantita_output, unita_misura, data_scadenza, codice_lotto, data_produzione")
      .eq("id", id).maybeSingle(),
    supa.from("etichette_produttore")
      .select("ragione_sociale, indirizzo, stabilimento, partita_iva, marchio")
      .eq("azienda_id", azienda?.id).maybeSingle(),
  ]);

  const fasi = fasiRes?.data || [];
  const ingredienti = ingrRes?.data || [];
  const info = lottoRes?.data || {};
  const produttore = prodRes?.data || null;

  let etichetta = null;
  if (info.ricetta_id) {
    const { data } = await supa.from("etichette")
      .select("denominazione, denominazione_extra, ingredienti, allergeni, peso_netto_g, peso_sgocciolato_g, tmc_dicitura, conservazione, dopo_apertura, origine")
      .eq("ricetta_id", info.ricetta_id).maybeSingle();
    etichetta = data || null;
  }

  const H = [];

  // --- fasi
  H.push(`<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Tracciabilità fasi</div>`);
  if (!fasi.length) {
    H.push(`<div style="font-size:12px;color:#94a3b8;margin-bottom:12px;">Nessuna fase registrata su questo lotto.</div>`);
  } else {
    H.push(fasi.map(f => {
      const chi = f.firmato_da || f.operatore_nome || "";
      const quando = f.firmato_il ? new Date(f.firmato_il).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
      const mis = [];
      if (f.temperatura_rilevata != null) mis.push("🌡 " + f.temperatura_rilevata + "°C");
      else if (f.valore_misurato != null) mis.push(f.valore_misurato + " " + (f.valore_um || ""));
      if (f.durata_reale_min != null) mis.push(f.durata_reale_min + " min");
      const nc = f.ccp && f.esito !== "ok";
      return `<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px dotted #e5e7eb;gap:10px;">
        <span>${f.ccp ? "🔺 " : ""}${f.fase_ordine ? f.fase_ordine + ". " : ""}${escapeHtml(f.fase_nome || "Fase")}${mis.length ? " · " + escapeHtml(mis.join(" · ")) : ""}</span>
        <span style="color:${nc ? "#dc2626" : chi ? "#16a34a" : "#94a3b8"};white-space:nowrap;">${nc ? "⚠ fuori limite" : chi ? "✅ " + escapeHtml(chi) + (quando ? " · " + quando : "") : "non firmata"}</span>
      </div>`;
    }).join("") + `<div style="height:12px;"></div>`);
  }

  // --- materie prime
  if (ingredienti.length) {
    H.push(`<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Materie prime</div>`);
    H.push(ingredienti.map(i => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px dotted #e5e7eb;">
      <span>${escapeHtml(i.prodotti?.nome || "—")}${i.lotto_materia_prima ? " · lotto " + escapeHtml(i.lotto_materia_prima) : ""}</span>
      <span>${formatNum(i.quantita)} ${escapeHtml(i.unita_misura || "")}</span></div>`).join("") + `<div style="height:12px;"></div>`);
  }

  // --- confezionamento
  const conf = Array.isArray(info.dettaglio_confezionamento) ? info.dettaglio_confezionamento : [];
  if (conf.length) {
    H.push(`<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Confezionamento</div>`);
    H.push(conf.map(c => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px dotted #e5e7eb;">
      <span>${escapeHtml(c.label || "Confezione")}</span>
      <span>${formatNum(c.numero_confezioni)} pz × ${formatNum(c.peso_porzione_kg)} kg</span></div>`).join("") + `<div style="height:12px;"></div>`);
  }

  // --- etichetta
  H.push(`<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Etichetta</div>`);
  const mancano = [];
  if (!etichetta) mancano.push("la scheda etichetta della ricetta");
  if (!produttore) mancano.push("i dati del produttore");
  if (mancano.length) {
    H.push(`<div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;padding:10px 12px;font-size:12px;">
      <b>Non stampabile.</b> Manca ${escapeHtml(mancano.join(" e "))}.</div>`);
  } else {
    const pesoDefault = etichetta.peso_netto_g || (conf.length ? Math.round((conf[0].peso_porzione_kg || 0) * 1000) : "");
    const nDefault = conf.length ? (conf[0].numero_confezioni || 1) : 1;
    H.push(`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;font-size:12px;">
      <div><label style="display:block;color:#64748b;">Peso netto (g)</label>
        <input class="input rl-peso" type="number" value="${pesoDefault}" style="width:110px;"></div>
      <div><label style="display:block;color:#64748b;">Quante</label>
        <input class="input rl-quante" type="number" min="1" value="${nDefault}" style="width:90px;"></div>
      <button class="rl-stampa" style="background:#0E5A7A;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">🏷 Stampa etichette</button>
      <div style="width:100%;font-size:11px;color:#94a3b8;margin-top:2px;">Retro 60 × 40 mm · QR alla scheda del prodotto</div>
    </div>`);
  }

  // --- firma
  if (info.conforme != null || info.firma_tramite) {
    H.push(`<div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;">
      ${info.conforme === false ? `<span style="color:#dc2626;font-weight:700;">NON CONFORME</span>${info.nc_motivo ? " · " + escapeHtml(info.nc_motivo) : ""}` : info.conforme === true ? "Dichiarato conforme" : ""}
      ${info.firma_tramite ? " · registrato via " + escapeHtml(info.firma_tramite) : ""}</div>`);
  }

  box.innerHTML = H.join("");

  const btn = box.querySelector(".rl-stampa");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const peso = box.querySelector(".rl-peso")?.value || "";
      const quante = Math.max(1, parseInt(box.querySelector(".rl-quante")?.value || "1", 10));
      stampaEtichette({ etichetta, produttore, info, peso, quante });
    });
    box.querySelectorAll(".rl-peso, .rl-quante").forEach(i => i.addEventListener("click", e => e.stopPropagation()));
  }
}

// Il corpo del testo non scende sotto i 6pt (25 punti a 300 dpi): il regolamento 1169/2011
// chiede un'altezza minima della x; sotto quella misura l'etichetta e' fuori norma.
// Se il testo non ci sta, l'etichetta NON si stampa e si chiede di accorciarlo.
// Etichetta lotto 62x40 mm orizzontale, disegnata come IMMAGINE alla risoluzione della Brother
// QL-820NWBc (696x472 punti = area stampabile rotolo 62 mm x 40 mm, 300 dpi). Rotolo DK-22251
// nero/rosso: allergeni e scadenza in rosso. Esce dal Raspberry (coda_stampe, tipo etichetta):
// dall'iPhone la Brother offre solo 62x100.
const ET_W = 696, ET_H = 472, ET_PAD = 22;
const ROSSO = "#e00000";

function etWrap(ctx, testo, maxW) {
  const parole = String(testo || "").split(/\s+/).filter(Boolean);
  const righe = [];
  let riga = "";
  parole.forEach(w => {
    const prova = riga ? riga + " " + w : w;
    if (ctx.measureText(prova).width <= maxW || !riga) riga = prova;
    else { righe.push(riga); riga = w; }
  });
  if (riga) righe.push(riga);
  return righe;
}

function disegnaEtichetta({ etichetta, produttore, info, peso }) {
  const c = document.createElement("canvas");
  c.width = ET_W; c.height = ET_H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ET_W, ET_H);
  ctx.textBaseline = "top";
  const F = "Arial, Helvetica, sans-serif";
  const W = ET_W - ET_PAD * 2;

  // --- fondo, sempre nello stesso posto: produttore, lotto, scadenza
  ctx.font = "25px " + F;
  const prod = etWrap(ctx, [produttore.ragione_sociale, produttore.indirizzo, produttore.partita_iva ? "P.IVA " + produttore.partita_iva : ""].filter(Boolean).join(" — "), W).slice(0, 3);
  const yP = ET_H - ET_PAD + 2 - prod.length * 28;
  ctx.fillStyle = "#000";
  prod.forEach((r, i) => ctx.fillText(r, ET_PAD, yP + i * 28));
  const scad = info.data_scadenza ? new Date(info.data_scadenza).toLocaleDateString("it-IT") : "";
  ctx.font = "bold 26px " + F;
  const sc = scad ? etWrap(ctx, (etichetta.tmc_dicitura || "Da consumarsi entro") + " il " + scad, W) : [];
  const yS = yP - 6 - sc.length * 30;
  ctx.fillStyle = ROSSO;
  sc.forEach((r, i) => ctx.fillText(r, ET_PAD, yS + i * 30));
  ctx.font = "bold 31px " + F; ctx.fillStyle = "#000";
  const yL = yS - 36;
  ctx.fillText("LOTTO " + (info.codice_lotto || ""), ET_PAD, yL);
  ctx.fillRect(ET_PAD, yL - 9, W, 3);
  const limite = yL - 16;

  // --- alto: nome e peso, poi ingredienti, allergeni, origine, conservazione
  const allerg = Array.isArray(etichetta.allergeni) ? etichetta.allergeni.filter(Boolean) : [];
  const pezzi = [];
  if (etichetta.ingredienti) pezzi.push({ b: "Ingredienti:", t: etichetta.ingredienti });
  pezzi.push({ b: "Allergeni:", t: allerg.length ? allerg.join(", ") : "nessuno", rosso: allerg.length > 0 });
  if (etichetta.origine) pezzi.push({ b: "Origine:", t: etichetta.origine });
  if (etichetta.peso_sgocciolato_g) pezzi.push({ b: "Sgocciolato:", t: etichetta.peso_sgocciolato_g + " g" });
  const cons = [etichetta.conservazione, etichetta.dopo_apertura].filter(Boolean).join(" ");
  if (cons) pezzi.push({ b: "", t: cons });

  function fai(scala, disegna) {
    let y = ET_PAD - 2;
    const fT = Math.round(34 * scala), fB = Math.max(25, Math.round(27 * scala)), lh = fB * 1.18;
    ctx.font = "bold " + fT + "px " + F;
    const tit = etWrap(ctx, (etichetta.denominazione || "") + (peso ? " · " + peso + " g" : ""), W).slice(0, 2);
    tit.forEach(r => { if (disegna) { ctx.fillStyle = "#000"; ctx.fillText(r, ET_PAD, y); } y += fT * 1.12; });
    y += 4;
    pezzi.forEach(p => {
      // etichetta in grassetto e testo sulla stessa riga, a capo parola per parola
      const parole = (p.b ? p.b + " " : "").split(/\s+/).filter(Boolean).map(w => ({ w, bold: true, rosso: false }))
        .concat(String(p.t).split(/\s+/).filter(Boolean).map(w => ({ w, bold: !!p.rosso, rosso: !!p.rosso })));
      let x = ET_PAD;
      parole.forEach(o => {
        ctx.font = (o.bold ? "bold " : "") + fB + "px " + F;
        const lw = ctx.measureText(o.w).width;
        if (x + lw > ET_PAD + W && x > ET_PAD) { x = ET_PAD; y += lh; }
        if (disegna) { ctx.fillStyle = o.rosso ? ROSSO : "#000"; ctx.fillText(o.w, x, y); }
        x += ctx.measureText(o.w + " ").width;
      });
      y += lh + 2;
    });
    return y;
  }
  let scala = 1;
  while (scala > 0.9 && fai(scala, false) > limite) scala -= 0.02;
  if (fai(scala, false) > limite) return { png: null, troppoLungo: true };
  fai(scala, true);
  return { png: c.toDataURL("image/png"), troppoLungo: false };
}

function sbEt() { return window.supabaseClient || window.supabase; }

async function stampanteEtichette() {
  const az = window.state?.azienda?.id;
  if (!az) return null;
  const sede = window.state?.sedeAttiva?.id || null;
  const { data } = await sbEt().from("stampanti_comande").select("id, ip, porta, sede_id")
    .eq("azienda_id", az).eq("reparto", "etichette").eq("attiva", true);
  const lista = data || [];
  return lista.find(s => sede && s.sede_id === sede) || lista.find(s => !s.sede_id) || lista[0] || null;
}

async function stampaEtichette({ etichetta, produttore, info, peso, quante }) {
  const dis = disegnaEtichetta({ etichetta, produttore, info, peso });
  if (dis.troppoLungo) {
    alert("Il testo non entra nell'etichetta 62x40 senza scendere sotto la misura minima di legge.\n\nAccorcia ingredienti o conservazione nella scheda etichetta della ricetta.");
    return;
  }
  const png = dis.png;
  const st = await stampanteEtichette();

  if (st) {
    // Strada normale: la manda il Raspberry alla Brother, 62x40 esatti, nessuna finestra di stampa
    const { error } = await sbEt().from("coda_stampe").insert({
      azienda_id: window.state.azienda.id, sede_id: st.sede_id || window.state?.sedeAttiva?.id || null,
      stampante_id: st.id, stampante_ip: st.ip, stampante_porta: st.porta || 9100, larghezza: 62,
      tipo: "etichetta", reparto: "etichette",
      contenuto: { png, copie: quante, formato: "62x40", rosso: true, lotto: info.codice_lotto || null },
    });
    if (error) { alert("Errore invio etichette: " + error.message); return; }
    alert("🏷 " + quante + " " + (quante === 1 ? "etichetta inviata" : "etichette inviate") + " alla stampante");
    return;
  }

  // Nessuna etichettatrice collegata: mostro l'immagine, da condividere con l'app Brother iPrint&Label
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:9999;overflow-y:auto;padding:16px;box-sizing:border-box;font-family:Arial,sans-serif;";
  ov.innerHTML = '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;">'
    + '<div style="background:#0E5A7A;color:#fff;padding:12px 14px;font-size:13px;line-height:1.45;"><b>Nessuna etichettatrice collegata a Ristoflow.</b><br>'
    + 'Tieni premuta l\'immagine › Condividi › Brother iPrint&amp;Label, rotolo 62 mm continuo. Copie: ' + quante + '.</div>'
    + '<img src="' + png + '" alt="Etichetta" style="display:block;width:100%;border-bottom:1px solid #e2e8f0;">'
    + '<div style="padding:12px;text-align:right;"><button type="button" style="border:0;border-radius:8px;padding:10px 16px;font-weight:700;background:#f1f5f9;cursor:pointer;">Chiudi</button></div></div>';
  ov.querySelector("button").onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
}

// Stampa il registro cosi' come e' filtrato a schermo: e' il documento
// che si mostra in caso di controllo.
function stampaRegistro() {
  const cerca = (document.getElementById("rl-cerca")?.value || "").toLowerCase().trim();
  let lotti = lottiCache;
  if (cerca) lotti = lotti.filter(l => ((l.ricette?.nome || "") + " " + (l.codice_lotto || "")).toLowerCase().includes(cerca));
  if (!lotti.length) { alert("Nessun lotto da stampare."); return; }

  const azienda = window.state?.azienda?.nome || "";
  const sede = window.state?.sedeAttiva?.nome || "";
  const oggi = new Date().toLocaleDateString("it-IT");

  const righe = lotti.map(l => {
    const st = (STATO_LABEL[l.stato]?.t || l.stato || "").replace(/[^A-Za-zàèéìòù ]/g, "").trim();
    return `<tr>
      <td>${escapeHtml(l.codice_lotto || "—")}</td>
      <td>${escapeHtml(l.ricette?.nome || "—")}</td>
      <td>${l.data_produzione ? new Date(l.data_produzione).toLocaleDateString("it-IT") : "—"}</td>
      <td>${l.data_scadenza ? new Date(l.data_scadenza).toLocaleDateString("it-IT") : "—"}</td>
      <td class="n">${l.quantita_output ? formatNum(l.quantita_output) + " " + escapeHtml(l.unita_misura || "") : "—"}</td>
      <td>${escapeHtml(l.dipendenti?.nome || "—")}</td>
      <td>${escapeHtml(st)}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Registro lotti</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Arial, Helvetica, sans-serif; font-size:9pt; color:#000; margin:0; }
      h1 { font-size:14pt; margin:0 0 2mm; }
      .sub { font-size:8pt; color:#333; margin-bottom:4mm; }
      table { width:100%; border-collapse:collapse; }
      th, td { border:0.5pt solid #666; padding:1.5mm 2mm; text-align:left; }
      th { background:#eee; font-size:8pt; text-transform:uppercase; }
      .n { text-align:right; }
      tr { page-break-inside:avoid; }
      .firma { margin-top:8mm; font-size:8pt; }
      .barra { background:#0E5A7A; padding:10px 14px; display:flex; gap:10px; align-items:center;
               margin:-0mm 0 6mm; border-radius:8px; }
      .barra .tit { color:#e2f2f9; font-size:11pt; font-weight:700; flex:1; }
      .barra button { border-radius:7px; padding:8px 15px; font-size:11pt; font-weight:800; cursor:pointer; }
      .bstampa { background:#fff; color:#0E5A7A; border:0; }
      .bchiudi { background:transparent; color:#fff; border:1px solid rgba(255,255,255,.6); }
      @media print { .barra { display:none !important; } }
    </style></head><body>
      <div class="barra">
        <span class="tit">Registro lotti · ${lotti.length} lotti</span>
        <button class="bstampa" onclick="window.print()">🖨 Stampa</button>
        <button class="bchiudi" onclick="window.close()">✕ Chiudi</button>
      </div>
      <h1>Registro lotti di produzione</h1>
      <div class="sub">${escapeHtml(azienda)}${sede ? " — " + escapeHtml(sede) : ""} · stampato il ${oggi} · ${lotti.length} lotti</div>
      <table>
        <thead><tr><th>Lotto</th><th>Prodotto</th><th>Produzione</th><th>Scadenza</th><th>Quantità</th><th>Operatore</th><th>Stato</th></tr></thead>
        <tbody>${righe}</tbody>
      </table>
      <div class="firma">Il responsabile ____________________________</div>
    </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Il browser ha bloccato la finestra di stampa. Consenti i popup e riprova."); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}

function formatNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString("it-IT", { maximumFractionDigits: 3 }) : n; }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
