// Etichette lotto 62x40 per Brother QL-820NWBc, condivise tra Registro lotti e Produzione.
// L'immagine si disegna qui e il Raspberry la manda alla stampante (coda_stampe, tipo "etichetta").

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

export function disegnaEtichetta({ etichetta, produttore, info, peso }) {
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
  riduciATreColori(ctx);
  return { png: c.toDataURL("image/png"), troppoLungo: false };
}

function sbEt() { return window.supabaseClient || window.supabase; }

export async function stampanteEtichette() {
  const az = window.state?.azienda?.id;
  if (!az) return null;
  const sede = window.state?.sedeAttiva?.id || null;
  const { data } = await sbEt().from("stampanti_comande").select("id, ip, porta, sede_id")
    .eq("azienda_id", az).eq("reparto", "etichette").eq("attiva", true);
  const lista = data || [];
  return lista.find(s => sede && s.sede_id === sede) || lista.find(s => !s.sede_id) || lista[0] || null;
}


// Solo bianco, nero e rosso: la Brother stampa questi tre e l'immagine pesa ~10 volte meno
// (arriva al Raspberry con la notifica istantanea invece che col controllo ogni 30 s).
function riduciATreColori(ctx) {
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
export async function inviaEtichetteLotto({ etichetta, produttore, info, peso, copie }) {
  const dis = disegnaEtichetta({ etichetta, produttore, info, peso });
  if (dis.troppoLungo) return { ok: false, motivo: "troppo_lungo", png: null };
  const st = await stampanteEtichette();
  if (!st) return { ok: false, motivo: "nessuna_stampante", png: dis.png };
  const { error } = await sbEt().from("coda_stampe").insert({
    azienda_id: window.state.azienda.id, sede_id: st.sede_id || window.state?.sedeAttiva?.id || null,
    stampante_id: st.id, stampante_ip: st.ip, stampante_porta: st.porta || 9100, larghezza: 62,
    tipo: "etichetta", reparto: "etichette",
    contenuto: { png: dis.png, copie, formato: "62x40", rosso: true, lotto: info.codice_lotto || null },
  });
  if (error) return { ok: false, motivo: error.message, png: dis.png };
  return { ok: true, png: dis.png };
}
