// js/views/manuale.js
import { createPageLayout } from "../utils/pageLayout.js";

export async function render(container) {
  const PDF_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co/storage/v1/object/public/assets/Ristoflow_Manuale_Operativo.pdf";

  container.innerHTML = createPageLayout({
    title: "📘 Manuale Operativo",
    subtitle: "Guida completa a tutte le funzioni di Ristoflow.AI",
    content: `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div style="font-size:13px;color:#6b7280;">Versione Giugno 2026 — aggiornato con tutte le funzioni attuali</div>
        <a href="${PDF_URL}" target="_blank"
          style="background:#0E5A7A;color:white;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
          ⬇️ Scarica PDF
        </a>
      </div>

      <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <iframe
          src="${PDF_URL}"
          width="100%"
          height="820px"
          style="border:none;display:block;"
          title="Manuale Operativo Ristoflow">
          <p style="padding:20px;color:#6b7280;">
            Il tuo browser non supporta la visualizzazione inline del PDF.
            <a href="${PDF_URL}" target="_blank" style="color:#0E5A7A;font-weight:700;">Apri il PDF</a>
          </p>
        </iframe>
      </div>
    `
  });
}
