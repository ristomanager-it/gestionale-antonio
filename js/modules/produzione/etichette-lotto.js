// Etichette lotto per Brother QL-820NWBc (misura scelta dal rotolo montato), condivise tra Registro lotti e Produzione.
// L'immagine si disegna qui e il Raspberry la manda alla stampante (coda_stampe, tipo "etichetta").

// Il corpo del testo non scende sotto i 6pt (25 punti a 300 dpi): il regolamento 1169/2011
// chiede un'altezza minima della x; sotto quella misura l'etichetta e' fuori norma.
// Se il testo non ci sta, l'etichetta NON si stampa e si chiede di accorciarlo.
// Etichetta lotto 62x40 mm orizzontale, disegnata come IMMAGINE alla risoluzione della Brother
// QL-820NWBc (696x472 punti = area stampabile rotolo 62 mm x 40 mm, 300 dpi). Rotolo DK-22251
// nero/rosso: allergeni e scadenza in rosso. Esce dal Raspberry (coda_stampe, tipo etichetta):
// dall'iPhone la Brother offre solo 62x100.
const ET_PAD = 22;
const ROSSO = "#e00000";
const DPMM = 300 / 25.4; // punti per millimetro a 300 dpi

// Rotoli Brother QL: larghezza stampabile in punti (300 dpi) e nome usato dal Raspberry.
// Continui: la lunghezza la scegli tu. Pretagliati: misura fissa.
export const FORMATI_ETICHETTA = {
  "62red":  { nome: "62 mm nero e rosso (DK-22251)", w: 696, rosso: true,  continuo: true },
  "62":     { nome: "62 mm solo nero (DK-22205)",    w: 696, rosso: false, continuo: true },
  "54":     { nome: "54 mm solo nero",               w: 590, rosso: false, continuo: true },
  "50":     { nome: "50 mm solo nero (DK-22223)",    w: 554, rosso: false, continuo: true },
  "38":     { nome: "38 mm solo nero (DK-22225)",    w: 413, rosso: false, continuo: true },
  "29":     { nome: "29 mm solo nero (DK-22210)",    w: 306, rosso: false, continuo: true },
  "62x29":  { nome: "Pretagliate 62 x 29 mm (DK-11209)",  w: 696, h: 271,  rosso: false, continuo: false },
  "62x100": { nome: "Pretagliate 62 x 100 mm (DK-11202)", w: 696, h: 1109, rosso: false, continuo: false },
};

// { id, lunghezza } -> misure in punti e dati per il Raspberry
export function misureEtichetta(id, lunghezza) {
  const f = FORMATI_ETICHETTA[id] || FORMATI_ETICHETTA["62red"];
  const key = FORMATI_ETICHETTA[id] ? id : "62red";
  const mm = Math.max(25, Math.min(200, Math.round(Number(lunghezza) || 40)));
  const h = f.continuo ? Math.round(mm * DPMM) : f.h;
  const larghezzaMm = Number(key.split("x")[0].replace("red", ""));
  const descr = f.continuo ? larghezzaMm + "x" + mm : key;
  return { id: key, w: f.w, h, rosso: f.rosso, label: key, descr, larghezzaMm, lunghezzaMm: f.continuo ? mm : Number(key.split("x")[1]) };
}

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

export function disegnaEtichetta({ etichetta, produttore, info, peso, formato }) {
  const m = formato || misureEtichetta("62red", 40);
  const ET_W = m.w, ET_H = m.h;
  const ROSSO = m.rosso ? "#e00000" : "#000";
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
  // conservazione e dopo apertura: due frasi, col punto in mezzo anche se nella scheda manca
  const cons = [etichetta.conservazione, etichetta.dopo_apertura].map(t => String(t || "").trim()).filter(Boolean)
    .map(t => /[.!?]$/.test(t) ? t : t + ".").join(" ");
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
  riduciATreColori(ctx, ET_W, ET_H);
  return { png: c.toDataURL("image/png"), troppoLungo: false };
}

function sbEt() { return window.supabaseClient || window.supabase; }

export async function stampanteEtichette() {
  const az = window.state?.azienda?.id;
  if (!az) return null;
  const sede = window.state?.sedeAttiva?.id || null;
  const { data } = await sbEt().from("stampanti_comande").select("id, ip, porta, sede_id, etichetta_formato, etichetta_lunghezza_mm")
    .eq("azienda_id", az).eq("reparto", "etichette").eq("attiva", true);
  const lista = data || [];
  return lista.find(s => sede && s.sede_id === sede) || lista.find(s => !s.sede_id) || lista[0] || null;
}


// Solo bianco, nero e rosso: la Brother stampa questi tre e l'immagine pesa ~10 volte meno
// (arriva al Raspberry con la notifica istantanea invece che col controllo ogni 30 s).
function riduciATreColori(ctx, ET_W, ET_H) {
  const img = ctx.getImageData(0, 0, ET_W, ET_H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let o;
    if (r > 140 && r - g > 70 && r - b > 70) o = [224, 0, 0];
    else if ((r * 299 + g * 587 + b * 114) / 1000 < 150) o = [0, 0, 0];
    else o = [255, 255, 255];
    d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Mette in coda le etichette di un lotto. Ritorna { ok: true } oppure { ok: false, motivo }.
export async function inviaEtichetteLotto({ etichetta, produttore, info, peso, copie, formato }) {
  const st = await stampanteEtichette();
  const fmt = formato || misureEtichetta(st?.etichetta_formato || "62red", st?.etichetta_lunghezza_mm || 40);
  const dis = disegnaEtichetta({ etichetta, produttore, info, peso, formato: fmt });
  if (dis.troppoLungo) return { ok: false, motivo: "troppo_lungo", png: null, formato: fmt };
  if (!st) return { ok: false, motivo: "nessuna_stampante", png: dis.png };
  const { data: job, error } = await sbEt().from("coda_stampe").insert({
    azienda_id: window.state.azienda.id, sede_id: st.sede_id || window.state?.sedeAttiva?.id || null,
    stampante_id: st.id, stampante_ip: st.ip, stampante_porta: st.porta || 9100, larghezza: fmt.larghezzaMm,
    tipo: "etichetta", reparto: "etichette",
    contenuto: { png: dis.png, copie, formato: fmt.descr, label: fmt.label, rosso: fmt.rosso, lotto: info.codice_lotto || null },
  }).select("id, sede_id").single();
  if (error) return { ok: false, motivo: error.message, png: dis.png };
  if (job?.id) controllaStampaPresa(job.id, job.sede_id);
  return { ok: true, png: dis.png };
}

/* Il Raspberry di solito prende la stampa in 2-3 secondi. Se dopo 20 secondi e'
   ancora in coda, il ponte non sta leggendo: lo diciamo subito a chi ha premuto
   Stampa, invece di lasciarlo davanti a una stampante muta. */
function controllaStampaPresa(jobId, sedeId) {
  setTimeout(async () => {
    try {
      const { data } = await sbEt().from("coda_stampe").select("stato").eq("id", jobId).maybeSingle();
      if (!data || data.stato !== "in_attesa") return;
      let quando = "";
      try {
        let q = sbEt().from("agenti_ponte").select("ultimo_contatto").order("ultimo_contatto", { ascending: false }).limit(1);
        if (sedeId) q = q.eq("sede_id", sedeId);
        const { data: ap } = await q;
        if (ap && ap[0]) {
          const d = new Date(ap[0].ultimo_contatto);
          quando = " Ultimo contatto del Raspberry: " + d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + ".";
        }
      } catch (e) { /* tabella non leggibile: avviso comunque */ }
      mostraAvvisoStampa("🖨️ L'etichetta non è ancora partita: il ponte di stampa non risponde." + quando +
        " Controlla che il Raspberry sia acceso e in rete. Resta in coda ed esce da sola appena riparte.");
    } catch (e) { /* controllo facoltativo */ }
  }, 20000);
}

function mostraAvvisoStampa(testo) {
  document.getElementById("avviso-stampa-ferma")?.remove();
  const box = document.createElement("div");
  box.id = "avviso-stampa-ferma";
  box.setAttribute("role", "alert");
  box.style.cssText = "position:fixed;left:12px;right:12px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:99999;" +
    "background:#b91c1c;color:#fff;padding:14px 44px 14px 16px;border-radius:12px;font-size:14px;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.25);";
  box.textContent = testo;
  const x = document.createElement("button");
  x.type = "button"; x.textContent = "✕"; x.setAttribute("aria-label", "Chiudi");
  x.style.cssText = "position:absolute;top:8px;right:10px;background:none;border:0;color:#fff;font-size:18px;cursor:pointer;";
  x.onclick = () => box.remove();
  box.appendChild(x);
  document.body.appendChild(box);
}

/* Prima di stampare: quale rotolo c'e' nella Brother e quanto lunga tagliare l'etichetta.
   La scelta resta salvata sulla stampante (per admin e manager) e su questo dispositivo.
   Ritorna le misure da passare a inviaEtichetteLotto, oppure null se si annulla. */
export async function scegliFormatoEtichetta() {
  const st = await stampanteEtichette();
  let locale = {};
  try { locale = JSON.parse(localStorage.getItem("rf_brother_formato") || "{}"); } catch (e) { locale = {}; }
  const idIniz = (st && st.etichetta_formato) || locale.id || "62red";
  const lungIniz = (st && st.etichetta_lunghezza_mm) || locale.lunghezza || 40;

  return new Promise((resolve) => {
    const bg = document.createElement("div");
    bg.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;";
    const opzioni = Object.entries(FORMATI_ETICHETTA)
      .map(([id, f]) => '<option value="' + id + '"' + (id === idIniz ? " selected" : "") + ">" + f.nome + "</option>").join("");
    bg.innerHTML =
      '<div class="view" style="width:min(460px,100%);border-radius:14px;padding:16px;">' +
        '<h3 style="margin:0 0 6px;">🏷 Misura etichetta Brother</h3>' +
        '<div class="form-help">Scegli il rotolo montato nella stampante. Resta salvato per le prossime stampe.</div>' +
        '<div class="form-group" style="margin-top:12px;"><label>Rotolo</label><select id="et-fmt" class="input">' + opzioni + "</select></div>" +
        '<div class="form-group" id="et-lung-box"><label>Lunghezza etichetta (mm)</label>' +
          '<input id="et-lung" class="input" type="number" min="25" max="200" step="1" inputmode="numeric" value="' + lungIniz + '" /></div>' +
        '<div id="et-descr" class="form-help" style="font-weight:600;"></div>' +
        '<div class="form-actions" style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
          '<button type="button" id="et-ok" class="app-button">🖨️ Stampa</button>' +
          '<button type="button" id="et-no" class="app-button gray">Annulla</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(bg);
    const sel = bg.querySelector("#et-fmt"), lung = bg.querySelector("#et-lung");
    const box = bg.querySelector("#et-lung-box"), descr = bg.querySelector("#et-descr");
    const aggiorna = () => {
      const f = FORMATI_ETICHETTA[sel.value];
      box.style.display = f.continuo ? "" : "none";
      const m = misureEtichetta(sel.value, lung.value);
      descr.textContent = "Etichetta " + m.larghezzaMm + " x " + m.lunghezzaMm + " mm" + (m.rosso ? ", allergeni e scadenza in rosso" : ", solo nero (allergeni in grassetto)");
    };
    sel.addEventListener("change", aggiorna); lung.addEventListener("input", aggiorna); aggiorna();
    const chiudi = (v) => { bg.remove(); resolve(v); };
    bg.querySelector("#et-no").onclick = () => chiudi(null);
    bg.addEventListener("click", (e) => { if (e.target === bg) chiudi(null); });
    bg.querySelector("#et-ok").onclick = async () => {
      const m = misureEtichetta(sel.value, lung.value);
      try { localStorage.setItem("rf_brother_formato", JSON.stringify({ id: m.id, lunghezza: m.lunghezzaMm })); } catch (e) { /* facoltativo */ }
      if (st && (st.etichetta_formato !== m.id || (FORMATI_ETICHETTA[m.id].continuo && st.etichetta_lunghezza_mm !== m.lunghezzaMm))) {
        try {
          await sbEt().from("stampanti_comande").update({
            etichetta_formato: m.id,
            etichetta_lunghezza_mm: FORMATI_ETICHETTA[m.id].continuo ? m.lunghezzaMm : st.etichetta_lunghezza_mm,
          }).eq("id", st.id);
        } catch (e) { /* senza permessi vale solo per questo dispositivo */ }
      }
      chiudi(m);
    };
  });
}
