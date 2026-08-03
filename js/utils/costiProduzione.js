// js/utils/costiProduzione.js
// Calcolo di MANODOPERA ed ENERGIA di una ricetta, a partire dalle fasi.
// Sta qui e non dentro Tony di proposito: così vale per tutte le strade —
// ricetta inventata con Tony, dedotta da una foto o scritta a mano dallo chef.

const FATTORE_CARICO = 0.65;   // un forno non assorbe il massimo per tutto il tempo
const COSTO_KWH_DEFAULT = 0.28;

/** Costi orari veri per mansione, dall'anagrafica dipendenti. */
export async function caricaCostiOrari(supabase, aziendaId) {
  const out = { ruoli: {}, medio: 0 };
  if (!aziendaId) return out;
  const { data } = await supabase.from("dipendenti")
    .select("mansione, ruolo, costo_orario").eq("azienda_id", aziendaId).eq("attivo", true);

  const somma = {};
  for (const d of data || []) {
    const c = Number(d.costo_orario) || 0;
    if (c <= 0) continue;
    const k = norm(d.mansione || d.ruolo || "");
    if (!k) continue;
    somma[k] = somma[k] || { tot: 0, n: 0 };
    somma[k].tot += c; somma[k].n++;
  }
  const valori = [];
  for (const k of Object.keys(somma)) {
    out.ruoli[k] = somma[k].tot / somma[k].n;
    valori.push(out.ruoli[k]);
  }
  out.medio = valori.length ? valori.reduce((a, b) => a + b, 0) / valori.length : 0;
  return out;
}

export function costoOrarioDi(costi, ruolo) {
  const k = norm(ruolo || "");
  if (!k) return costi.medio;
  if (costi.ruoli[k] != null) return costi.ruoli[k];
  for (const kk of Object.keys(costi.ruoli)) {
    if (kk.includes(k) || k.includes(kk)) return costi.ruoli[kk];
  }
  return costi.medio;
}

/** Attrezzature con potenza + prezzo del kWh dell'azienda. */
export async function caricaEnergia(supabase, aziendaId) {
  const out = { dispositivi: {}, costoKwh: COSTO_KWH_DEFAULT };
  if (!aziendaId) return out;
  const [disp, cfg] = await Promise.all([
    supabase.from("dispositivi").select("id, nome, potenza_w").eq("azienda_id", aziendaId).eq("attivo", true),
    supabase.from("energia_config").select("costo_kwh").eq("azienda_id", aziendaId).maybeSingle(),
  ]);
  for (const d of disp.data || []) out.dispositivi[String(d.id)] = { nome: d.nome, kw: (Number(d.potenza_w) || 0) / 1000 };
  if (cfg.data?.costo_kwh) out.costoKwh = Number(cfg.data.costo_kwh);
  return out;
}

/**
 * Calcola i costi di produzione.
 * fasi: [{ descrizione, durata_min, lavoro_umano_min, ruolo, dispositivo_id }]
 * lotto: quante porzioni si producono in una sessione (default 1)
 */
export function calcolaCostiProduzione(fasi, { costi, energia, lotto = 1, porzioni = 1 }) {
  const n = Math.max(Number(lotto) || 1, 1);
  const por = Math.max(Number(porzioni) || 1, 1);

  let minuti = 0, costoLavoro = 0, kwh = 0, costoEnergia = 0;
  const dettaglio = [];

  for (const f of fasi) {
    const lav = Number(f.lavoro_umano_min) || 0;
    const dur = Number(f.durata_min) || 0;
    const oraria = costoOrarioDi(costi, f.ruolo);
    const cl = (lav / 60) * oraria;

    const dev = energia.dispositivi[String(f.dispositivo_id || "")] || null;
    const kwhFase = dev ? dev.kw * (dur / 60) * FATTORE_CARICO : 0;
    const ce = kwhFase * energia.costoKwh;

    minuti += lav; costoLavoro += cl; kwh += kwhFase; costoEnergia += ce;
    dettaglio.push({
      fase: f.descrizione || "", ruolo: f.ruolo || "—", costo_orario: arrotonda(oraria),
      minuti: lav, costo_lavoro: arrotonda(cl),
      attrezzatura: dev ? dev.nome : null, kwh: Math.round(kwhFase * 1000) / 1000, costo_energia: arrotonda(ce),
    });
  }

  // Le fasi descrivono UNA sessione di lavoro: il costo si spalma sulle porzioni
  // prodotte in quella sessione. Fare cinque tartare non costa cinque volte una.
  return {
    lotto: n,
    porzioni_ricetta: por,
    minuti_totali: Math.round(minuti * 10) / 10,
    lavoro_lotto: arrotonda(costoLavoro),
    lavoro_porzione: arrotonda(costoLavoro / n),
    kwh_lotto: Math.round(kwh * 1000) / 1000,
    energia_lotto: arrotonda(costoEnergia),
    energia_porzione: arrotonda(costoEnergia / n),
    totale_lotto: arrotonda(costoLavoro + costoEnergia),
    totale_porzione: arrotonda((costoLavoro + costoEnergia) / n),
    costo_kwh: energia.costoKwh,
    dettaglio,
  };
}

function arrotonda(x) { return Math.round((Number(x) || 0) * 100) / 100; }
function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
