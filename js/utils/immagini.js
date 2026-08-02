// js/utils/immagini.js
// Ridimensiona e comprime le foto PRIMA di caricarle sullo storage.
// Una foto da telefono pesa 8-13 MB: sullo schermo di un cliente ne bastano
// 200-400 KB. Ogni MB caricato è banda che poi esce a ogni visita del menù.

const LATO_MAX_DEFAULT = 1600;   // px sul lato lungo: più che sufficiente per web e stampa piccola
const QUALITA_DEFAULT  = 0.82;   // jpeg/webp
const PESO_OBIETTIVO   = 400 * 1024;

/**
 * Restituisce un File ridimensionato. Se non è un'immagine, o se qualcosa
 * va storto, restituisce il file originale: il caricamento non deve mai
 * fallire per colpa della compressione.
 */
export async function comprimiImmagine(file, opzioni = {}) {
  const latoMax  = opzioni.latoMax  || LATO_MAX_DEFAULT;
  const qualita  = opzioni.qualita  || QUALITA_DEFAULT;
  const obiettivo = opzioni.pesoObiettivo || PESO_OBIETTIVO;

  try {
    if (!file || !file.type || !file.type.startsWith("image/")) return file;
    if (file.type === "image/gif" || file.type === "image/svg+xml") return file; // animazioni e vettoriali: si lasciano stare
    if (file.size <= obiettivo && !opzioni.forza) return file;                   // già leggera

    const bitmap = await creaBitmap(file);
    const w = bitmap.width, h = bitmap.height;
    const scala = Math.min(1, latoMax / Math.max(w, h));
    const nw = Math.max(1, Math.round(w * scala));
    const nh = Math.max(1, Math.round(h * scala));

    const canvas = document.createElement("canvas");
    canvas.width = nw; canvas.height = nh;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, nw, nh);
    if (bitmap.close) bitmap.close();

    const tipo = supportaWebp() ? "image/webp" : "image/jpeg";
    let blob = await toBlob(canvas, tipo, qualita);

    // se resta pesante si scende di qualità, non di dimensioni
    let q = qualita;
    while (blob && blob.size > obiettivo && q > 0.5) {
      q -= 0.1;
      blob = await toBlob(canvas, tipo, q);
    }
    if (!blob || blob.size >= file.size) return file; // non abbiamo guadagnato niente

    const est = tipo === "image/webp" ? "webp" : "jpg";
    const nome = file.name.replace(/\.[^.]+$/, "") + "." + est;
    return new File([blob], nome, { type: tipo, lastModified: Date.now() });
  } catch (e) {
    console.warn("comprimiImmagine: uso l'originale.", e);
    return file;
  }
}

/** Comprime una lista di file, uno alla volta, con callback di avanzamento. */
export async function comprimiTutte(files, opzioni = {}, onProgress) {
  const out = [];
  for (let i = 0; i < files.length; i++) {
    if (onProgress) onProgress(i, files.length, files[i]);
    out.push(await comprimiImmagine(files[i], opzioni));
  }
  return out;
}

/** Quanto si è risparmiato, in forma leggibile. */
export function risparmio(originale, compresso) {
  if (!originale || !compresso || compresso.size >= originale.size) return null;
  const perc = Math.round((1 - compresso.size / originale.size) * 100);
  return `${(originale.size / 1048576).toFixed(1)} MB → ${(compresso.size / 1024).toFixed(0)} KB (−${perc}%)`;
}

/* ── interni ──────────────────────────────────────────────────────────── */

function creaBitmap(file) {
  if (window.createImageBitmap) {
    // orientamento EXIF rispettato: le foto da telefono altrimenti girano
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => daImg(file));
  }
  return daImg(file);
}

function daImg(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}

function toBlob(canvas, tipo, qualita) {
  return new Promise(res => canvas.toBlob(b => res(b), tipo, qualita));
}

let _webp = null;
function supportaWebp() {
  if (_webp !== null) return _webp;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    _webp = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch { _webp = false; }
  return _webp;
}
