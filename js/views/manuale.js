// js/views/manuale.js
import { createPageLayout } from "../utils/pageLayout.js";

export async function render(container) {
  const PDF_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co/storage/v1/object/public/assets/Ristoflow_Manuale_Utente.pdf";

  container.innerHTML = createPageLayout({
    title: "📘 Manuale d'uso",
    subtitle: "Guida completa a tutte le funzioni di Ristoflow.AI",
    content: `
      <div style="max-width:600px;margin:40px auto;text-align:center;">
        <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;padding:48px 32px;">
          <div style="font-size:64px;margin-bottom:16px;">📘</div>
          <div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:8px;">Manuale d'uso Ristoflow.AI</div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:32px;">Versione Giugno 2026 — guida completa a tutte le funzioni</div>
          <a href="${PDF_URL}" target="_blank" rel="noopener"
            style="display:inline-flex;align-items:center;gap:10px;background:#0E5A7A;color:white;border-radius:10px;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;">
            📄 Apri il manuale
          </a>
          <div style="margin-top:16px;">
            <a href="${PDF_URL}" download
              style="font-size:13px;color:#0E5A7A;text-decoration:none;font-weight:600;">
              ⬇️ Scarica PDF
            </a>
          </div>
        </div>
      </div>
    `
  });
}
