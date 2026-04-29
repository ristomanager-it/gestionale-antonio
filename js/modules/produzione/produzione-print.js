// ==========================================================
// STAMPA ETICHETTA LOTTO
// ==========================================================

export function stampaEtichettaLotto({ lotto, ricetta, operatore }) {

  const dataProd = formatDate(lotto.data_produzione);
  const dataScad = formatDate(lotto.data_scadenza);

  const html = `
    <html>
      <head>
        <title>Etichetta Lotto</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }

          .label {
            width: 320px;
            border: 2px solid #000;
            padding: 12px;
          }

          .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 6px;
          }

          .lotto {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
          }

          .row {
            font-size: 14px;
            margin-bottom: 4px;
          }

          .note {
            margin-top: 10px;
            font-size: 13px;
            border-top: 1px dashed #000;
            padding-top: 6px;
          }

          .qr {
            margin-top: 10px;
            text-align: center;
            font-size: 12px;
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">

        <div class="label">

          <div class="title">
            ${escapeHtml(ricetta?.nome || "Prodotto")}
          </div>

          <div class="lotto">
            Lotto: ${escapeHtml(lotto.codice_lotto || lotto.id)}
          </div>

          <div class="row">
            Produzione: ${dataProd}
          </div>

          <div class="row">
            Scadenza: ${dataScad}
          </div>

          <div class="row">
            Operatore: ${escapeHtml(operatore?.nome || operatore?.codice || "-")}
          </div>

          <div class="note">
            ${escapeHtml(lotto.note || "")}
          </div>

          <div class="qr">
            ${escapeHtml(lotto.codice_lotto || "")}
          </div>

        </div>

      </body>
    </html>
  `;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
}

// ==========================================================
// UTILS
// ==========================================================

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
