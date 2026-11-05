// js/views/manuale.js — Libretto di istruzioni dell'app (edizione novembre 2026)
import { createPageLayout } from "../utils/pageLayout.js";

export async function render(container) {
  const PDF_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co/storage/v1/object/public/assets/Ristoflow_Libretto_Istruzioni_App.pdf?v=20261105";

  const capitoli = [
    "Come si usa questo libretto", "Entrare nell'app e i ruoli", "Creare l'azienda del cliente",
    "Il Setup guidato in 6 livelli", "Identità e Golden Circle", "Struttura: sedi, sale, persone",
    "Canali: WhatsApp, prenotazioni, sito", "Contenuti: foto, menu, ricette", "Acquisti, fatture e magazzino",
    "Personale e presenze", "Le tre home e la barra in basso", "Sala: comande, prenotazioni, cassa",
    "Cucina: produzione, planning, HACCP", "I numeri: margini e menu engineering", "Eventi e preventivi",
    "Marketing, clienti e fedeltà", "Tony controlla e migliora le campagne", "Tony, l'assistente: tutto quello che fa",
    "Hotel e Tasting", "Esercitazioni e domande frequenti"
  ];

  container.innerHTML = createPageLayout({
    title: "📘 Libretto di istruzioni",
    subtitle: "Il percorso completo: dalla creazione dell'azienda al Golden Circle, fino a tutte le funzioni, con Tony",
    content: `
      <div style="max-width:640px;margin:24px auto;">
        <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;padding:36px 24px;text-align:center;">
          <div style="font-size:56px;margin-bottom:12px;">📘</div>
          <div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:6px;">Libretto di istruzioni dell'app</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:28px;">Edizione novembre 2026 · 24 pagine · 20 capitoli</div>
          <a href="${PDF_URL}" target="_blank" rel="noopener"
            style="display:inline-flex;align-items:center;gap:10px;background:#0E5A7A;color:white;border-radius:10px;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;">
            📄 Apri il libretto
          </a>
          <div style="margin-top:16px;">
            <a href="${PDF_URL}" download="Ristoflow_Libretto_Istruzioni_App.pdf"
              style="font-size:13px;color:#0E5A7A;text-decoration:none;font-weight:600;">⬇️ Scarica PDF</a>
          </div>
        </div>
        <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;padding:20px 24px;margin-top:16px;">
          <div style="font-size:14px;font-weight:700;color:#0E5A7A;margin-bottom:10px;">Indice</div>
          <ol style="margin:0;padding-left:22px;font-size:14px;line-height:1.9;color:#374151;">
            ${capitoli.map(c => `<li>${c}</li>`).join("")}
          </ol>
        </div>
      </div>
    `
  });
}
