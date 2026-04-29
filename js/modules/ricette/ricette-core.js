// ============================================================
// RICETTE CORE
// Logica pura per calcoli economici e conversioni
// NO DOM
// NO Supabase
// AI-ready
// ============================================================

// =========================
// 🔧 UTILS BASE
// =========================

export function toNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export function convertiInKg(qta, um) {
  const val = toNumber(qta);

  switch ((um || "").toLowerCase()) {
    case "kg":
      return val;
    case "g":
      return val / 1000;
    case "l":
      return val; // assumiamo densità acqua-like (AI-ready da migliorare)
    case "ml":
      return val / 1000;
    case "pz":
      return val; // fallback → da gestire con peso medio prodotto in futuro
    default:
      return val;
  }
}

// =========================
// 🥩 FOOD COST
// =========================

export function calcolaFoodCost(ingredienti = [], prodottiMap = new Map()) {
  let totale = 0;

  for (const ing of ingredienti) {
    const prod = prodottiMap.get(String(ing.prodotto_id));
    if (!prod) continue;

    const costoUnitario = toNumber(prod.costo_medio);
    const qtaKg = convertiInKg(ing.quantita, ing.unita_misura);

    totale += costoUnitario * qtaKg;
  }

  return totale;
}

// =========================
// 👨‍🍳 COSTO LAVORO
// =========================

export function calcolaCostoLavoro(fasi = [], costoOrario = 15) {
  let minutiTot = 0;

  for (const f of fasi) {
    minutiTot += toNumber(f.lavoro_umano_min);
  }

  return (minutiTot / 60) * costoOrario;
}

// =========================
// ⚡ COSTO ENERGIA
// =========================

export function calcolaCostoEnergia(fasi = [], costoKwh = 0.25) {
  let totale = 0;

  for (const f of fasi) {
    const potenza = toNumber(f.potenza_kw);
    const durataOre = toNumber(f.durata_min) / 60;

    if (!potenza || !durataOre) continue;

    totale += potenza * durataOre * costoKwh;
  }

  return totale;
}

// =========================
// 🏭 COSTO INDUSTRIALE
// =========================

export function calcolaCostoIndustriale({
  materia = 0,
  lavoro = 0,
  energia = 0
} = {}) {
  return toNumber(materia) + toNumber(lavoro) + toNumber(energia);
}

// =========================
// 📦 RESA
// =========================

export function calcolaCostoPerKg(costoTotale, resaKg) {
  const resa = toNumber(resaKg);
  if (!resa) return 0;
  return toNumber(costoTotale) / resa;
}

export function calcolaCostoPorzione(costoPerKg, pesoPorzione, um = "kg") {
  const kg = convertiInKg(pesoPorzione, um);
  return toNumber(costoPerKg) * kg;
}

// =========================
// 🧠 SNAPSHOT COMPLETO (AI READY)
// =========================

export function calcolaCostoRicettaCompleto({
  ingredienti = [],
  prodottiMap = new Map(),
  fasi = [],
  resaKg = 0,
  costoOrario = 15,
  costoKwh = 0.25
} = {}) {
  const materia = calcolaFoodCost(ingredienti, prodottiMap);
  const lavoro = calcolaCostoLavoro(fasi, costoOrario);
  const energia = calcolaCostoEnergia(fasi, costoKwh);

  const industriale = calcolaCostoIndustriale({
    materia,
    lavoro,
    energia
  });

  const costoKg = calcolaCostoPerKg(industriale, resaKg);

  return {
    materia,
    lavoro,
    energia,
    industriale,
    costoKg,
    timestamp: new Date().toISOString()
  };
}
