// ============================================================================
// cassa-hardware.js — Scheletro integrazione hardware di cassa
// ----------------------------------------------------------------------------
// Due responsabilità, entrambe come SCHELETRO pronto da collegare:
//   1) Pagamento elettronico Tap-to-Pay (SumUp / Revolut / Nexi)
//   2) Scontrino fiscale sul registratore telematico Epson FP-81 II RT
//
// Ogni funzione è progettata per funzionare anche SENZA hardware collegato
// (modalità "simulazione"): restituisce un esito coerente così la cassa è
// testabile subito. Quando colleghi il provider/stampante, si sostituisce
// solo il corpo della funzione contrassegnato con  >>> COLLEGARE QUI <<<.
// ============================================================================

// ---------------------------------------------------------------------------
// CONFIGURAZIONE — questi valori arriveranno dalle impostazioni azienda/sede
// ---------------------------------------------------------------------------
const CASSA_CONFIG = {
  // Provider pagamento: 'sumup' | 'revolut' | 'nexi' | 'nessuno'
  paymentProvider: 'nessuno',
  // Modalità simulazione scontrino: true = numero finto, nessuna scrittura in
  // coda_fiscale. L'IP/porta della stampante non sono più qui: vengono letti
  // da stampanti_fiscali (tabella azienda/sede) al momento dell'emissione.
  simulazione: false,
};

// Permette di sovrascrivere la config leggendo dalle impostazioni della sede
export function configuraCassa(overrides = {}) {
  Object.assign(CASSA_CONFIG, overrides);
  return { ...CASSA_CONFIG };
}

// ============================================================================
// 1) PAGAMENTO ELETTRONICO — Tap to Pay
// ============================================================================
//
// Flusso previsto: la cassa chiama avviaPagamentoCarta(importo) → il lettore
// (o il telefono in Tap-to-Pay) attende l'avvicinamento della carta → ritorna
// l'esito. Qui è tutto simulato; l'aggancio reale dipende dal provider.
//
// SumUp:    SDK mobile "SumUp Card Reader" o "Tap to Pay on iPhone/Android".
// Revolut:  Revolut Reader SDK / Tap to Pay.
// Nexi/SIA: SoftPOS.
//
// Tutti richiedono: account business del provider + registrazione app + SDK
// nativo (non pura web). In web/PWA la strada tipica è il deep-link all'app
// del provider passando l'importo, con ritorno via URL scheme.
// ---------------------------------------------------------------------------

/**
 * Avvia un pagamento con carta (tap).
 * @param {number} importo - importo in euro
 * @param {object} opts - { descrizione, riferimento }
 * @returns {Promise<{ok:boolean, transazione_id?:string, metodo:string, importo:number, simulato:boolean, errore?:string}>}
 */
export async function avviaPagamentoCarta(importo, opts = {}) {
  const euro = Number(importo) || 0;
  if (euro <= 0) return { ok: false, metodo: 'carta', importo: euro, simulato: true, errore: 'Importo non valido' };

  // Modalità simulazione: conferma immediata, così la cassa è testabile.
  if (CASSA_CONFIG.simulazione || CASSA_CONFIG.paymentProvider === 'nessuno') {
    await _attesa(600); // finto tempo di lettura carta
    return {
      ok: true,
      transazione_id: 'SIM-' + Date.now(),
      metodo: 'carta',
      importo: euro,
      simulato: true,
    };
  }

  // >>> COLLEGARE QUI <<<  — integrazione reale per provider
  try {
    switch (CASSA_CONFIG.paymentProvider) {
      case 'sumup':
        return await _pagaSumUp(euro, opts);
      case 'revolut':
        return await _pagaRevolut(euro, opts);
      case 'nexi':
        return await _pagaNexi(euro, opts);
      default:
        return { ok: false, metodo: 'carta', importo: euro, simulato: false, errore: 'Provider non configurato' };
    }
  } catch (e) {
    return { ok: false, metodo: 'carta', importo: euro, simulato: false, errore: String(e?.message || e) };
  }
}

// --- Stub provider (da implementare quando colleghi l'account) --------------
async function _pagaSumUp(euro, opts) {
  // Esempio deep-link SumUp (app installata sul dispositivo cassa):
  //   sumupmerchant://pay/1.0?amount=EURO&currency=EUR&title=DESCRIZIONE&callback=CALLBACK
  // In una PWA si apre l'app e si torna via callback URL. In nativo si usa l'SDK.
  throw new Error('SumUp non ancora collegato (stub)');
}
async function _pagaRevolut(euro, opts) {
  // Revolut Reader SDK / Tap to Pay: richiede SDK nativo + account business.
  throw new Error('Revolut non ancora collegato (stub)');
}
async function _pagaNexi(euro, opts) {
  // Nexi SoftPOS: SDK nativo.
  throw new Error('Nexi non ancora collegato (stub)');
}

// ============================================================================
// 2) SCONTRINO FISCALE — Epson FP-81 II RT via coda_fiscale
// ============================================================================
//
// La RT sta sulla rete locale della sede; questa pagina gira su HTTPS
// (GitHub Pages), quindi un fetch diretto browser→stampante verrebbe
// bloccato (mixed content) e comunque non funzionerebbe da remoto. Il
// flusso reale è:
//   1) L'app inserisce una riga in coda_fiscale con stato 'in_coda'
//   2) Un agente sul Raspberry della sede fa polling su coda_fiscale, monta
//      il comando XML e lo invia a fpmate.cgi sulla stampante (porta 80)
//   3) L'agente riscrive la riga con stato 'stampato'/'errore' + numero
//      documento
//   4) Questa funzione fa polling sulla riga finché non cambia stato
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 1200;
const POLL_TIMEOUT_MS = 20000;

/**
 * Emette lo scontrino/documento commerciale.
 * @param {object} doc - {
 *    righe: [{descrizione, quantita, prezzo_unitario, aliquota_iva}],
 *    totale, pagamenti: [{metodo, importo}], sconto, azienda, sede
 * }
 * @returns {Promise<{ok:boolean, numero_documento?:string, simulato:boolean, errore?:string}>}
 */
export async function emettiScontrinoFiscale(doc) {
  const righe = Array.isArray(doc?.righe) ? doc.righe : [];
  if (!righe.length) return { ok: false, simulato: false, errore: 'Nessuna riga da stampare' };

  // Simulazione: numero documento finto, nessuna stampa reale.
  // Lascio true di default: va sbloccata a mano quando si vuole davvero
  // testare l'emissione reale dalla cassa (configuraCassa({simulazione:false})).
  if (CASSA_CONFIG.simulazione) {
    await _attesa(400);
    return {
      ok: true,
      numero_documento: 'SIM-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*9999),
      simulato: true,
    };
  }

  const supabase = window.supabaseClient || window.supabase;
  const aziendaId = doc?.azienda;
  const sedeId = doc?.sede || null;
  if (!aziendaId) return { ok: false, simulato: false, errore: 'Azienda mancante' };

  // Stampante fiscale attiva: prima cerco quella specifica della sede,
  // poi in fallback quella registrata a livello azienda (sede_id null,
  // es. "Tutte le sedi").
  let stampante = null;
  if (sedeId) {
    const { data } = await supabase
      .from('stampanti_fiscali')
      .select('ip, porta')
      .eq('azienda_id', aziendaId)
      .eq('sede_id', sedeId)
      .eq('attiva', true)
      .limit(1)
      .maybeSingle();
    stampante = data;
  }
  if (!stampante) {
    const { data } = await supabase
      .from('stampanti_fiscali')
      .select('ip, porta')
      .eq('azienda_id', aziendaId)
      .is('sede_id', null)
      .eq('attiva', true)
      .limit(1)
      .maybeSingle();
    stampante = data;
  }
  if (!stampante) {
    return { ok: false, simulato: false, errore: 'Nessuna stampante fiscale attiva configurata per questa sede' };
  }

  const righeDb = righe.map(r => ({
    descrizione: r.descrizione || '',
    quantita: Number(r.quantita) || 1,
    prezzo_unitario: Number(r.prezzo_unitario) || 0,
    aliquota_iva: Number(r.aliquota_iva ?? 10),
  }));
  const pagamenti = Array.isArray(doc?.pagamenti) ? doc.pagamenti : [];
  const metodoPagamento = pagamenti[0]?.metodo || 'contanti';

  const { data: riga, error: insErr } = await supabase.from('coda_fiscale').insert({
    azienda_id: aziendaId,
    sede_id: sedeId,
    tipo_documento: 'scontrino',
    righe: righeDb,
    metodo_pagamento: metodoPagamento,
    totale: Number(doc?.totale) || 0,
    stato: 'in_attesa',
    stampante_ip: stampante.ip,
    stampante_porta: stampante.porta,
  }).select('id').single();

  if (insErr || !riga) {
    return { ok: false, simulato: false, errore: 'Scrittura coda fiscale fallita: ' + (insErr?.message || 'errore') };
  }

  // Polling sull'esito scritto dall'agente sul Raspberry
  const scadenza = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < scadenza) {
    await _attesa(POLL_INTERVAL_MS);
    const { data: aggiornata } = await supabase
      .from('coda_fiscale')
      .select('stato, numero_scontrino, errore_msg')
      .eq('id', riga.id)
      .single();
    if (!aggiornata) continue;
    if (aggiornata.stato === 'completato') {
      return { ok: true, numero_documento: aggiornata.numero_scontrino, simulato: false };
    }
    if (aggiornata.stato === 'errore') {
      return { ok: false, simulato: false, errore: aggiornata.errore_msg || 'Errore stampa fiscale' };
    }
  }
  return { ok: false, simulato: false, errore: 'Timeout: documento ancora in coda, controlla il Raspberry/la stampante' };
}

// ============================================================================
// UTILITÀ
// ============================================================================
function _attesa(ms) { return new Promise(r => setTimeout(r, ms)); }

// Espongo la config in lettura per debug/UI
export function statoCassaHardware() {
  return {
    pagamento: CASSA_CONFIG.paymentProvider,
    simulazione: CASSA_CONFIG.simulazione,
  };
}
