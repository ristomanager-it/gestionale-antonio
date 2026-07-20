/* ============================================================
   MODULO STAMPA ETICHETTE via ePOS-Print (Epson TM-L100 e simili)
   - Nessun software da installare: il browser manda un XML HTTP
     alla stampante di rete (endpoint /cgi-bin/epos/service.cgi).
   - La stampante deve essere sulla stessa rete del dispositivo.
   ============================================================ */

// Carica la stampante etichette configurata per la sede/azienda attiva
export async function getStampanteEtichette() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id || null;
  if (!supabase || !aziendaId) return null;

  let q = supabase.from("stampanti")
    .select("id, nome, ip_address, porta, larghezza_mm, altezza_mm, modello, usa_epos, sede_id")
    .eq("azienda_id", aziendaId)
    .eq("tipo", "etichette")
    .eq("attiva", true);

  const { data } = await q;
  if (!data || !data.length) return null;
  // preferisco quella della sede attiva, altrimenti la prima
  return data.find(s => sedeId && String(s.sede_id) === String(sedeId)) || data[0];
}

// escape XML minimale
function xmlEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Costruisce il corpo ePOS-Print XML per UNA etichetta
function buildLabelXml(label) {
  const linee = [];
  linee.push(`<text lang="it"/>`);
  linee.push(`<text smooth="true"/>`);
  // Titolo prodotto (grande, doppia dimensione)
  linee.push(`<text dw="true" dh="true">${xmlEsc(label.titolo)}&#10;</text>`);
  linee.push(`<text dw="false" dh="false"/>`);
  // Lotto
  linee.push(`<text em="true">LOTTO: ${xmlEsc(label.lotto)}&#10;</text>`);
  linee.push(`<text em="false"/>`);
  // Date
  if (label.dataProduzione) linee.push(`<text>Prod.: ${xmlEsc(label.dataProduzione)}&#10;</text>`);
  if (label.dataScadenza) linee.push(`<text dh="true">SCAD.: ${xmlEsc(label.dataScadenza)}&#10;</text>`);
  linee.push(`<text dh="false"/>`);
  // Righe dettaglio (porzionatura, peso, conservazione...)
  (label.rows || []).filter(Boolean).forEach(r => {
    linee.push(`<text>${xmlEsc(r.k)}: ${xmlEsc(r.v)}&#10;</text>`);
  });
  // QR con il lotto (per tracciabilità)
  if (label.lotto_uuid) {
    linee.push(`<symbol type="qrcode_model_2" level="level_m" width="4" height="4">${xmlEsc(label.lotto_uuid)}</symbol>`);
  }
  linee.push(`<feed line="1"/>`);
  linee.push(`<cut type="feed"/>`);
  return linee.join("");
}

// Manda le etichette alla stampante via ePOS-Print
export async function stampaEtichetteEpos(labels, stampante) {
  if (!stampante?.ip_address) throw new Error("Stampante etichette non configurata (manca IP).");
  if (!labels?.length) throw new Error("Nessuna etichetta da stampare.");

  const url = `http://${stampante.ip_address}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`;

  let okCount = 0, errori = [];
  for (const label of labels) {
    const body =
      `<?xml version="1.0" encoding="utf-8"?>` +
      `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
      `<s:Body>` +
      `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">` +
      buildLabelXml(label) +
      `</epos-print>` +
      `</s:Body></s:Envelope>`;

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "SOAPAction": '""'
        },
        body
      });
      const txt = await resp.text();
      // ePOS risponde con success="true" nell'XML
      if (/success="true"/.test(txt)) okCount++;
      else errori.push(txt.slice(0, 120));
    } catch (e) {
      errori.push(e.message || "errore rete");
    }
  }

  return { ok: okCount, totale: labels.length, errori };
}

// Test rapido: stampa un'etichetta di prova
export async function stampaEtichettaTest(stampante) {
  const label = {
    titolo: "TEST RISTOFLOW",
    lotto: "TEST-0001",
    dataProduzione: new Date().toLocaleDateString("it-IT"),
    dataScadenza: new Date(Date.now() + 5 * 864e5).toLocaleDateString("it-IT"),
    lotto_uuid: "test-qr-ristoflow",
    rows: [
      { k: "Prodotto", v: "Etichetta di prova" },
      { k: "Stampante", v: stampante?.nome || "-" }
    ],
    footer: "Ristoflow"
  };
  return stampaEtichetteEpos([label], stampante);
}
