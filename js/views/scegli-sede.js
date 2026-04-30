export async function render(container) {

  const sedi = window.state?.sedi || [];
  const sedeAttiva = window.state?.sedeAttiva || null;

  if (!sedi || sedi.length === 0) {
    container.innerHTML = `
      <div class="view">
        <div style="padding:40px;text-align:center;">
          <h2 style="color:#dc2626;">Nessuna sede disponibile</h2>
          <p>Contatta l'amministratore.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <div style="max-width:600px;margin:auto;width:100%;">

        <div style="margin-bottom:20px;text-align:center;">
          <h2 style="margin:0;">Seleziona sede</h2>
          <div class="small-muted">Scegli dove vuoi lavorare</div>
        </div>

        <div id="lista-sedi" style="display:flex;flex-direction:column;gap:12px;">
          ${sedi.map(s => `
            <div 
              class="card sede-item"
              data-id="${s.id}"
              style="
                padding:16px;
                cursor:pointer;
                border:2px solid ${sedeAttiva?.id === s.id ? '#0E5A7A' : '#e5e7eb'};
                border-radius:12px;
              "
            >
              <div style="font-weight:600;font-size:16px;">
                ${s.nome || "Sede"}
              </div>
              ${s.indirizzo ? `
                <div style="font-size:13px;color:#6b7280;margin-top:4px;">
                  ${s.indirizzo}
                </div>
              ` : ""}

              ${s.is_default ? `
                <div style="margin-top:6px;font-size:12px;color:#0E5A7A;">
                  Sede predefinita
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>

      </div>
    </div>
  `;

  const items = document.querySelectorAll(".sede-item");

  items.forEach(el => {
    el.onclick = () => {
      const sedeId = el.dataset.id;

      if (!sedeId) return;

      window.stateActions.setSedeAttiva(sedeId);

      // 👉 redirect app
      window.location.hash = "#/home";
    };
  });

}
