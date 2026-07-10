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
  // Stampante fiscale
  fiscalPrinter: {
    enabled: false,
    ip: '192.168.0.150',   // Epson FP-81 II RT (rete locale)
    port: 9100,
    model: 'FP-81-II-RT',
  },
  // Modalità simulazione: true finché non colleghi l'hardware reale
  simulazione: true,
};

// Permette di sovrascrivere la config leggendo dalle impostazioni della sede
export function configuraCassa(overrides = {}) {
  Object.assign(CASSA_CONFIG, overrides);
  if (overrides.fiscalPrinter) {
    Object.assign(CASSA_CONFIG.fiscalPrinter, overrides.fiscalPrinter);
  }
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
// 2) SCONTRINO FISCALE — Epson FP-81 II RT
// ============================================================================
//
// La FP-81 II RT è un registratore telematico Epson. Si comanda via rete
// (protocollo ePOS / XML su HTTP alla porta della stampante) oppure via un
// bridge locale. Poiché una pagina web non può aprire una socket TCP grezza
// verso la porta 9100, lo scenario reale è uno di questi:
//   a) La stampante espone l'interfaccia ePOS-Print (HTTP/XML) → fetch diretto
//   b) Un piccolo bridge locale (Raspberry/PC) riceve il JSON e parla con la
//      stampante → si fa fetch al bridge
//
// Qui produciamo il "documento commerciale" in forma strutturata + una bozza
// del payload XML ePOS, e in simulazione restituiamo un esito con numero
// scontrino finto. Da collegare quando testi con la stampante reale.
// ---------------------------------------------------------------------------

/**
 * Emette lo scontrino/documento commerciale.
 * @param {object} doc - {
 *    righe: [{descrizione, quantita, prezzo_unitario, aliquota_iva}],
 *    totale, pagamenti: [{metodo, importo}], sconto, azienda, sede
 * }
 * @returns {Promise<{ok:boolean, numero_documento?:string, simulato:boolean, xml?:string, errore?:string}>}
 */
export async function emettiScontrinoFiscale(doc) {
  const righe = Array.isArray(doc?.righe) ? doc.righe : [];
  if (!righe.length) return { ok: false, simulato: true, errore: 'Nessuna riga da stampare' };

  // Costruisco il payload ePOS-Print (bozza) — utile già ora per la stampante
  const xml = _costruisciXmlEpos(doc);

  // Simulazione: numero documento finto, nessuna stampa reale
  if (CASSA_CONFIG.simulazione || !CASSA_CONFIG.fiscalPrinter.enabled) {
    await _attesa(400);
    return {
      ok: true,
      numero_documento: 'SIM-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*9999),
      simulato: true,
      xml, // ritorno anche l'XML così lo puoi ispezionare
    };
  }

  // >>> COLLEGARE QUI <<<  — invio reale alla stampante/bridge
  try {
    const url = 'http://' + CASSA_CONFIG.fiscalPrinter.ip + '/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '""' },
      body: xml,
    });
    if (!res.ok) throw new Error('Stampante HTTP ' + res.status);
    const testo = await res.text();
    // TODO: parsare la risposta ePOS per estrarre numero documento ed esito reale
    return { ok: true, numero_documento: _estraiNumeroDaRisposta(testo), simulato: false, xml };
  } catch (e) {
    return { ok: false, simulato: false, xml, errore: String(e?.message || e) };
  }
}

// Costruisce il corpo XML ePOS-Print (bozza minima, da rifinire sul modello reale)
function _costruisciXmlEpos(doc) {
  const righe = doc?.righe || [];
  let corpo = '';
  for (const r of righe) {
    const desc = _esc(r.descrizione || '');
    const prezzo = (Number(r.prezzo_unitario) || 0).toFixed(2);
    const qta = Number(r.quantita) || 1;
    const iva = Number(r.aliquota_iva ?? 10);
    // <printRecItem> è il comando tipico per una riga di vendita sui RT
    corpo += '<printRecItem operator="1" description="' + desc + '" quantity="' + qta +
             '" unitPrice="' + prezzo + '" department="1" justification="1" vatRate="' + iva + '"/>';
  }
  // Pagamenti
  for (const p of (doc?.pagamenti || [])) {
    const tipo = p.metodo === 'contanti' ? '0' : '2'; // 0=contanti, 2=carta (mappatura tipica)
    const imp = (Number(p.importo) || 0).toFixed(2);
    corpo += '<printRecTotal operator="1" description="' + _esc(p.metodo || '') + '" payment="' + imp + '" paymentType="' + tipo + '"/>';
  }
  return '<?xml version="1.0" encoding="utf-8"?>' +
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
    '<printerCommand>' +
    '<beginFiscalReceipt operator="1"/>' +
    corpo +
    '<endFiscalReceipt operator="1"/>' +
    '</printerCommand>' +
    '</s:Body></s:Envelope>';
}

function _estraiNumeroDaRisposta(testo) {
  // TODO: dipende dal formato di risposta della FP-81. Placeholder.
  const m = String(testo || '').match(/receiptNumber="?(\d+)"?/i);
  return m ? m[1] : ('RT-' + Date.now());
}

// ============================================================================
// UTILITÀ
// ============================================================================
function _attesa(ms) { return new Promise(r => setTimeout(r, ms)); }
function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Espongo la config in lettura per debug/UI
export function statoCassaHardware() {
  return {
    pagamento: CASSA_CONFIG.paymentProvider,
    stampante: CASSA_CONFIG.fiscalPrinter.enabled ? CASSA_CONFIG.fiscalPrinter.ip : 'disattivata',
    simulazione: CASSA_CONFIG.simulazione,
  };
}
