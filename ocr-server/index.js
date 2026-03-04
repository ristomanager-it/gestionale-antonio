import express from "express";
import OpenAI from "openai";
import cors from "cors";
import sharp from "sharp";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function preprocessImage(imageUrl) {
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const processed = await sharp(buffer)
    .grayscale()              // rimuove rumore colore
    .normalize()              // aumenta contrasto
    .sharpen()                // migliora contorni numeri
    .resize({ width: 2000 })  // upscale per OCR
    .toBuffer();

  return `data:image/png;base64,${processed.toString("base64")}`;
}

app.post("/ocr", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: "imageUrl mancante" });
    }

    // 🔥 PREPROCESS
    const improvedImage = await preprocessImage(imageUrl);

    const response = await openai.responses.create({
      model: "gpt-4o",
      temperature: 0,
      max_output_tokens: 1500,
      response_format: { type: "json_object" },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Estrai i dati della fattura.

REGOLE IMPORTANTI:
- I numeri sono in formato europeo (virgola = decimale).
- NON confondere 6 con 8.
- Se totale_riga esiste, verifica che quantita * prezzo_unitario ≈ totale_riga.
- Se i conti non tornano, correggi il numero più probabile.
- Restituisci SOLO JSON valido.

Struttura:
{
  "documento": {
    "numero_documento": "",
    "data_documento": ""
  },
  "fornitore": {
    "ragione_sociale": ""
  },
  "righe": [
    {
      "descrizione": "",
      "quantita": 0,
      "prezzo_unitario": 0,
      "totale_riga": 0,
      "um": ""
    }
  ]
}
`
            },
            {
              type: "input_image",
              image_url: improvedImage
            }
          ]
        }
      ]
    });

    const text = response.output[0].content[0].text;
    const parsed = JSON.parse(text);

    // 🔥 CONTROLLO MATEMATICO DI SICUREZZA
    parsed.righe = (parsed.righe || []).map(r => {
      const q = Number(r.quantita || 0);
      const pu = Number(r.prezzo_unitario || 0);
      const tot = Number(r.totale_riga || 0);

      if (q > 0 && pu > 0 && tot > 0) {
        const calc = q * pu;
        if (Math.abs(calc - tot) > 0.05) {
          // ricalcolo prezzo unitario se totale è più affidabile
          r.prezzo_unitario = Number((tot / q).toFixed(3));
        }
      }

      return r;
    });

    res.json({
      success: true,
      ...parsed
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Errore OCR" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("OCR server avviato su porta " + PORT);
});
