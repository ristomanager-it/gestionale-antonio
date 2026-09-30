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
      stampaEtichette({ etichetta, produttore, info, peso, quante, codiceRicetta: lotto.ricette?.codice });
    });
    box.querySelectorAll(".rl-peso, .rl-quante").forEach(i => i.addEventListener("click", e => e.stopPropagation()));
  }
}

// Retro dell'etichetta: misura unica 60x40 mm su ogni prodotto e ogni formato.
// Il corpo del testo non scende sotto i 6pt: il regolamento 1169/2011 chiede
// almeno 1,2 mm di altezza della x, sotto quella misura l'etichetta e' fuori norma.
// Il QR si genera in locale (js/vendor/qrcode.js), niente CDN: nel laboratorio
// la connessione non e' garantita.
// Etichetta lotto disegnata come IMMAGINE 62x100 mm (300 dpi): l'iPhone stampando una pagina web
// reimpagina il testo a modo suo; un'immagine invece esce identica. Formato "62 x 100 mm" della
// Brother QL-820NWBc con rotolo DK-22251 nero/rosso: allergeni e scadenza in rosso.
const ET_W = 732, ET_H = 1181, ET_PAD = 44;   // 62 x 100 mm a 300 dpi
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

async function disegnaEtichetta({ etichetta, produttore, info, peso, qrUrl }) {
  const c = document.createElement("canvas");
  c.width = ET_W; c.height = ET_H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ET_W, ET_H);
  ctx.textBaseline = "top";
  const F = "Arial, Helvetica, sans-serif";
  const W = ET_W - ET_PAD * 2;

  // --- parte bassa, fissa: produttore, lotto, scadenza, QR
  ctx.font = "26px " + F;
  const prodTxt = [produttore.ragione_sociale, produttore.indirizzo, produttore.partita_iva ? "P.IVA " + produttore.partita_iva : ""].filter(Boolean).join(" — ");
  const prodRighe = etWrap(ctx, prodTxt, W).slice(0, 3);
  let yBasso = ET_H - ET_PAD - prodRighe.length * 31;
  ctx.fillStyle = "#333";
  prodRighe.forEach((r, i) => ctx.fillText(r, ET_PAD, yBasso + i * 31));

  const QR = qrUrl ? 190 : 0;
  const wLotto = W - (QR ? QR + 18 : 0);
  const scad = info.data_scadenza ? new Date(info.data_scadenza).toLocaleDateString("it-IT") : "";
  ctx.font = "bold 36px " + F;
  const scadRighe = scad ? etWrap(ctx, (etichetta.tmc_dicitura || "Da consumarsi entro") + " il " + scad, wLotto) : [];
  ctx.font = "bold 44px " + F;
  const lottoRighe = etWrap(ctx, "LOTTO " + (info.codice_lotto || ""), wLotto);
  const hBlocco = Math.max(QR, lottoRighe.length * 50 + scadRighe.length * 42 + 8);
  const yBlocco = yBasso - 22 - hBlocco;
  ctx.fillStyle = "#000"; ctx.fillRect(ET_PAD, yBlocco - 16, W, 4);
  let y = yBlocco;
  ctx.font = "bold 44px " + F; ctx.fillStyle = "#000";
  lottoRighe.forEach(r => { ctx.fillText(r, ET_PAD, y); y += 50; });
  y += 8;
  ctx.font = "bold 36px " + F; ctx.fillStyle = ROSSO;
  scadRighe.forEach(r => { ctx.fillText(r, ET_PAD, y); y += 42; });
  if (qrUrl) {
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = qrUrl; });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, ET_PAD + W - QR, yBlocco, QR, QR);
    } catch (e) {}
  }
  const limite = yBlocco - 30;   // fin dove può arrivare la parte alta

  // --- parte alta: titolo, peso, ingredienti, allergeni, conservazione (si stringe se non entra)
  const allerg = Array.isArray(etichetta.allergeni) ? etichetta.allergeni.filter(Boolean) : [];
  const blocchi = [];
  if (etichetta.ingredienti) blocchi.push({ lab: "Ingredienti", txt: etichetta.ingredienti });
  blocchi.push({ lab: "Allergeni", txt: allerg.length ? allerg.join(", ") : "nessuno", rosso: allerg.length > 0 });
  if (etichetta.origine) blocchi.push({ lab: "Origine", txt: etichetta.origine });
  if (etichetta.peso_sgocciolato_g) blocchi.push({ lab: "Peso sgocciolato", txt: etichetta.peso_sgocciolato_g + " g" });
  if (etichetta.conservazione) blocchi.push({ txt: etichetta.conservazione });
  if (etichetta.dopo_apertura) blocchi.push({ txt: etichetta.dopo_apertura });

  function misuraEDisegna(scala, disegna) {
    let yy = ET_PAD;
    const fT = Math.round(56 * scala), fP = Math.round(40 * scala), fL = Math.round(27 * scala), fB = Math.round(32 * scala);
    ctx.font = "bold " + fT + "px " + F;
    const tit = etWrap(ctx, etichetta.denominazione || "", W).slice(0, 3);
    tit.forEach(r => { if (disegna) { ctx.fillStyle = "#000"; ctx.fillText(r, ET_PAD, yy); } yy += fT * 1.15; });
    if (peso) {
      ctx.font = "bold " + fP + "px " + F;
      if (disegna) { ctx.fillStyle = "#000"; ctx.fillText(peso + " g", ET_PAD, yy + 4); }
      yy += fP * 1.3;
    }
    if (disegna) { ctx.fillStyle = "#000"; ctx.fillRect(ET_PAD, yy + 6, W, 3); }
    yy += 24;
    blocchi.forEach(b => {
      if (b.lab) {
        ctx.font = "bold " + fL + "px " + F;
        if (disegna) { ctx.fillStyle = "#444"; ctx.fillText(b.lab.toUpperCase(), ET_PAD, yy); }
        yy += fL * 1.2;
      }
      ctx.font = (b.rosso ? "bold " : "") + fB + "px " + F;
      etWrap(ctx, b.txt, W).forEach(r => { if (disegna) { ctx.fillStyle = b.rosso ? ROSSO : "#000"; ctx.fillText(r, ET_PAD, yy); } yy += fB * 1.22; });
      yy += 12;
    });
    return yy;
  }
  let scala = 1;
  while (scala > 0.6 && misuraEDisegna(scala, false) > limite) scala -= 0.05;
  misuraEDisegna(scala, true);
  return c.toDataURL("image/png");
}

async function stampaEtichette({ etichetta, produttore, info, peso, quante, codiceRicetta }) {
  let qrUrl = "";
  try {
    const mod = await import("../vendor/qrcode.js");
    const qrcode = mod.default || window.qrcode;
    if (qrcode && codiceRicetta) {
      const url = location.origin + location.pathname + "#/prodotto/" + encodeURIComponent(codiceRicetta);
      const q = qrcode(0, "M");
      q.addData(url);
      q.make();
      qrUrl = q.createDataURL(8, 0);
    }
  } catch (e) {
    console.warn("QR non generato:", e);
  }

  // Finestra aperta subito (Safari blocca i popup aperti dopo un'attesa)
  const w = window.open("", "_blank");
  if (!w) { alert("Il browser ha bloccato la finestra di stampa. Consenti i popup e riprova."); return; }
  w.document.write('<p style="font-family:Arial;padding:20px;color:#0E5A7A;">Preparo le etichette…</p>');

  const png = await disegnaEtichetta({ etichetta, produttore, info, peso, qrUrl });
  const pagine = Array.from({ length: quante }, () => '<img class="et" src="' + png + '" alt="">').join("");

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Etichette ${escapeHtml(info.codice_lotto || "")}</title>
    <style>
      /* Nella finestra di stampa dell'iPhone scegliere il formato "62 x 100 mm" */
      @page { size: 62mm 100mm; margin: 0; }
      html, body { margin:0; padding:0; background:#fff; }
      img.et { display:block; width:62mm; height:100mm; page-break-after:always; break-after:page; }
      img.et:last-child { page-break-after:auto; break-after:auto; }
      .barra { box-sizing:border-box; background:#0E5A7A; padding:10px 14px; display:flex; gap:10px; align-items:center;
               position:sticky; top:0; z-index:9; font-family:Arial, sans-serif; }
      .barra .tit { color:#e2f2f9; font-size:12px; font-weight:700; flex:1; }
      .barra button { border-radius:7px; padding:8px 15px; font-size:13px; font-weight:800; cursor:pointer; }
      .bstampa { background:#fff; color:#0E5A7A; border:0; }
      .bchiudi { background:transparent; color:#fff; border:1px solid rgba(255,255,255,.6); }
      .nota { font-family:Arial, sans-serif; font-size:12px; color:#475569; padding:8px 14px; background:#f1f5f9; }
      @media screen { body { background:#e2e8f0; } img.et { width:62mm; margin:4mm auto; box-shadow:0 1px 4px rgba(0,0,0,.25); } }
      @media print { .barra, .nota { display:none !important; } }
    </style></head><body>
      <div class="barra">
        <span class="tit">Etichette · LOTTO ${escapeHtml(info.codice_lotto || "")} · ${quante} ${quante === 1 ? "copia" : "copie"}</span>
        <button class="bstampa" onclick="window.print()">🖨 Stampa</button>
        <button class="bchiudi" onclick="window.close()">✕ Chiudi</button>
      </div>
      <div class="nota">Nella stampa scegli la Brother e il formato <b>62 x 100 mm</b>.</div>
      ${pagine}</body></html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
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
