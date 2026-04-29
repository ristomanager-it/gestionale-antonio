// /modules/produzione/produzione-core.js

/* =========================================================
   PRODUZIONE CORE
   Motore centrale lotti + magazzino + HACCP
========================================================= */

export async function creaLottoProduzione({
  ricetta,
  dati,
  confezioni,
  coprodotti,
  porzioniCache,
  scenariConservazione
}) {

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!supabase || !aziendaId) {
    throw new Error("Supabase o azienda non disponibile");
  }

  if (!ricetta?.id) throw new Error("Ricetta non valida");

  const scenario = scenariConservazione.find(
    s => String(s.id) === String(dati.scenarioId)
  );

  const resaTeoKg = getResaTeoricaKg(ricetta);
  const pesoRealeKg = dati.pesoRealeKg;

  const moltiplicatore = getMoltiplicatore(ricetta, pesoRealeKg);

  const dettaglioConfezionamento = confezioni
    .filter(c => c.porzione_id && c.pezzi_per_confezione > 0 && c.numero_confezioni > 0)
    .map(c => {
      const porz = porzioniCache.find(p => String(p.id) === String(c.porzione_id));
      const pesoKg = toKg(porz?.peso_porzione, porz?.unita_misura);

      const kgConf = pesoKg * c.pezzi_per_confezione;
      const kgTot = kgConf * c.numero_confezioni;

      return {
        ...c,
        label: porz?.label || "",
        peso_porzione_kg: pesoKg,
        kg_per_confezione: kgConf,
        kg_totali_riga: kgTot
      };
    });

  /* =========================================================
     1. CREA LOTTO
  ========================================================= */

  const { data: lotto, error } = await supabase
    .from("produzione_lotti")
    .insert({
      azienda_id: aziendaId,
      ricetta_id: ricetta.id,
      data_produzione: dati.dataProduzione,
      data_scadenza: dati.scadenza,
      quantita_output: pesoRealeKg,
      unita_misura: "kg",
      scenario_conservazione_id: dati.scenarioId,
      stato: "firmato",
      note: dati.noteLotto || "",
      operatore_id: dati.operatore.id,
      firmato_at: new Date().toISOString(),
      dettaglio_confezionamento: dettaglioConfezionamento,
      resa_percentuale: resaTeoKg ? (pesoRealeKg / resaTeoKg) * 100 : null
    })
    .select()
    .single();

  if (error) throw error;

  const lottoId = lotto.lotto_uuid || lotto.id;

  /* =========================================================
     2. RIGHE PRODUZIONE
  ========================================================= */

  await salvaRighe({
    lotto,
    lottoId,
    ricetta,
    confezioni: dettaglioConfezionamento,
    coprodotti,
    moltiplicatore,
    dati
  });

  /* =========================================================
     3. MAGAZZINO
  ========================================================= */

  await generaMovimentiMagazzino({
    lotto,
    lottoId,
    ricetta,
    confezioni: dettaglioConfezionamento,
    coprodotti,
    moltiplicatore,
    dati
  });

  /* =========================================================
     4. HACCP
  ========================================================= */

  await logHaccp(lottoId, "LOTTO_COMPLETATO", {
    ricetta_id: ricetta.id,
    peso: pesoRealeKg
  });

  return lotto;
}

/* =========================================================
   RIGHE PRODUZIONE
========================================================= */

async function salvaRighe({
  lotto,
  lottoId,
  ricetta,
  confezioni,
  coprodotti,
  moltiplicatore,
  dati
}) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  const righe = confezioni.map(c => ({
    azienda_id: aziendaId,
    produzione_id: lottoId,
    ricetta_id: ricetta.id,
    formato_label: c.label,
    quantita: c.kg_totali_riga,
    unita: "kg",
    lotto: lotto.codice_lotto,
    porzione_id: Number(c.porzione_id)
  }));

  if (righe.length) {
    const { error } = await supabase
      .from("schede_produzione_righe")
      .insert(righe);

    if (error) throw error;
  }

  // coprodotti
  for (const c of coprodotti) {
    if (!c.prodotto_id) continue;

    await supabase.from("schede_produzione_righe").insert({
      azienda_id: aziendaId,
      produzione_id: lottoId,
      ricetta_id: ricetta.id,
      formato_label: "COPRODOTTO",
      quantita: Number(c.quantita),
      unita: c.unita_misura || "kg",
      lotto: lotto.codice_lotto,
      prodotto_id: Number(c.prodotto_id)
    });
  }
}

/* =========================================================
   MAGAZZINO
========================================================= */

async function generaMovimentiMagazzino({
  lotto,
  lottoId,
  ricetta,
  confezioni,
  coprodotti,
  moltiplicatore,
  dati
}) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  // SCARICO INGREDIENTI
  const { data: ingredienti } = await supabase
    .from("ricetta_ingredienti")
    .select("*")
    .eq("ricetta_id", ricetta.id)
    .eq("azienda_id", aziendaId);

  for (const ing of ingredienti || []) {
    const q = (ing.quantita || 0) * moltiplicatore;

    await supabase.from("magazzino_movimenti").insert({
      azienda_id: aziendaId,
      prodotto_id: ing.prodotto_id,
      tipo_movimento: "SCARICO",
      quantita: q,
      riferimento_id: lottoId
    });
  }

  // CARICO PRODOTTO
  for (const c of confezioni) {
    await supabase.from("magazzino_movimenti").insert({
      azienda_id: aziendaId,
      prodotto_id: ricetta.prodotto_output_id,
      tipo_movimento: "CARICO",
      quantita: c.kg_totali_riga,
      riferimento_id: lottoId
    });
  }

  // COPRODOTTI
  for (const c of coprodotti) {
    if (!c.prodotto_id) continue;

    await supabase.from("magazzino_movimenti").insert({
      azienda_id: aziendaId,
      prodotto_id: Number(c.prodotto_id),
      tipo_movimento: "CARICO",
      quantita: Number(c.quantita),
      riferimento_id: lottoId
    });
  }
}

/* =========================================================
   HACCP
========================================================= */

async function logHaccp(produzioneId, tipo, payload) {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  try {
    await supabase.from("produzione_eventi_log").insert({
      azienda_id: aziendaId,
      produzione_id: produzioneId,
      tipo_evento: tipo,
      payload
    });
  } catch {}
}

/* =========================================================
   UTILS
========================================================= */

function getResaTeoricaKg(ricetta) {
  if (!ricetta?.resa_teorica) return null;
  return Number(ricetta.resa_teorica) || null;
}

function getMoltiplicatore(ricetta, peso) {
  const resa = getResaTeoricaKg(ricetta);
  if (!resa) return 1;
  return peso / resa;
}

function toKg(val, unit) {
  if (!val) return 0;
  if (unit === "g") return val / 1000;
  return val;
}
