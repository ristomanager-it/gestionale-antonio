export async function render(container) {
  const aziendeLink = window.state?.aziende || [];

  const aziende = aziendeLink
    .map((a) => a.aziende)
    .filter(Boolean)
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

  if (aziende.length === 0) {
    container.innerHTML = `
      <div class="view" style="padding:40px; text-align:center;">
        <h2 style="color:#dc2626;">Nessuna azienda</h2>
        <p>Nessuna azienda associata al tuo utente.</p>
        <button id="btn-logout" style="margin-top:18px; padding:10px 14px; border-radius:12px; border:none; background:#0E5A7A; color:white; font-weight:600; cursor:pointer;">
          Logout
        </button>
      </div>
    `;
    const b = document.getElementById("btn-logout");
    if (b) b.onclick = () => window.router?.logout?.();
    return;
  }

  container.innerHTML = `
    <div class="view" style="padding:24px; max-width:980px; margin:0 auto;">
      <h2 style="margin:0 0 8px 0;">Seleziona azienda</h2>
      <p style="margin:0 0 18px 0; opacity:0.7;">Hai accesso a più aziende. Scegli con quale operare.</p>

      <div style="
        display:grid;
        gap:14px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      ">
        ${aziende
          .map(
            (az) => `
              <button
                data-azienda-id="${az.id}"
                style="
                  text-align:left;
                  background:white;
                  border:1px solid #e5e7eb;
                  border-radius:18px;
                  padding:16px;
                  cursor:pointer;
                  box-shadow:0 10px 22px rgba(0,0,0,0.04);
                "
              >
                <div style="font-weight:700; font-size:16px; color:#111827;">
                  ${escapeHtml(az.nome || "Azienda")}
                </div>
                <div style="margin-top:6px; font-size:13px; opacity:0.75;">
                  Codice: ${escapeHtml(az.codice || "-")}
                </div>
                <div style="margin-top:10px; font-size:12px; opacity:0.8;">
                  Stato: <strong>${escapeHtml(az.stato || "-")}</strong>
                  ${az.stato_attivazione ? ` · Attivazione: <strong>${escapeHtml(az.stato_attivazione)}</strong>` : ""}
                </div>
              </button>
            `
          )
          .join("")}
      </div>

      <div style="margin-top:18px;">
        <button id="btn-logout" style="padding:10px 14px; border-radius:12px; border:1px solid #e5e7eb; background:white; color:#111827; font-weight:600; cursor:pointer;">
          Logout
        </button>
      </div>
    </div>
  `;

  container.querySelectorAll("[data-azienda-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-azienda-id");
      if (!id) return;

      localStorage.setItem("active_azienda_id", String(id));
      localStorage.removeItem("active_sede_id");

      window.location.hash = "#/home";
    });
  });

  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) logoutBtn.onclick = () => window.router?.logout?.();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
