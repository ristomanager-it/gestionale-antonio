export async function render(container) {

  const sedi = window.state?.sedi || [];
  const sedeAttiva = window.state?.sedeAttiva || null;
  const ultimaSedeId = localStorage.getItem("active_sede_id");

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

  // Se c'è solo una sede, selezionala automaticamente senza mostrare la schermata
  if (sedi.length === 1) {
    window.stateActions.setSedeAttiva(sedi[0].id);
    window.location.hash = "#/home";
    return;
  }

  container.innerHTML = `
    <div class="view">
      <div style="max-width:500px;margin:auto;width:100%;padding:20px;">

        <div style="margin-bottom:24px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🏠</div>
          <h2 style="margin:0;font-size:20px;color:#0f172a;">Seleziona sede</h2>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">Scegli dove vuoi lavorare oggi</div>
        </div>

        <div id="lista-sedi" style="display:flex;flex-direction:column;gap:10px;">
          ${sedi.map(s => {
            const isAttiva = sedeAttiva?.id === s.id || ultimaSedeId === s.id;
            return `
              <div 
                class="sede-item"
                data-id="${s.id}"
                style="
                  padding:16px 20px;
                  cursor:pointer;
                  border:2px solid ${isAttiva ? '#0E5A7A' : '#e5e7eb'};
                  border-radius:14px;
                  background:${isAttiva ? '#f0f9ff' : 'white'};
                  display:flex;
                  align-items:center;
                  gap:14px;
                  transition:all 0.15s;
                "
              >
                <div style="width:40px;height:40px;border-radius:10px;background:${isAttiva ? '#0E5A7A' : '#f1f5f9'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;overflow:hidden;">
                  ${s.logo_url 
                    ? `<img src="${s.logo_url}" style="width:40px;height:40px;object-fit:cover;border-radius:10px;">` 
                    : `<span style="color:${isAttiva ? 'white' : '#64748b'};">🏠</span>`}
                </div>
                <div style="flex:1;">
                  <div style="font-weight:700;font-size:15px;color:#0f172a;">${s.nome || "Sede"}</div>
                  ${s.indirizzo ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${s.indirizzo}</div>` : ""}
                  ${isAttiva ? `<div style="font-size:11px;color:#0E5A7A;margin-top:3px;font-weight:600;">✓ Ultima usata</div>` : ""}
                </div>
                <div style="color:${isAttiva ? '#0E5A7A' : '#cbd5e1'};font-size:20px;">›</div>
              </div>
            `;
          }).join("")}
        </div>

      </div>
    </div>
  `;

  container.querySelectorAll(".sede-item").forEach(el => {
    el.onmouseenter = () => {
      if (el.style.borderColor !== 'rgb(14, 90, 122)') {
        el.style.borderColor = '#94a3b8';
        el.style.background = '#f8fafc';
      }
    };
    el.onmouseleave = () => {
      const id = el.dataset.id;
      const isAttiva = ultimaSedeId === id || sedeAttiva?.id === id;
      el.style.borderColor = isAttiva ? '#0E5A7A' : '#e5e7eb';
      el.style.background = isAttiva ? '#f0f9ff' : 'white';
    };
    el.onclick = () => {
      const sedeId = el.dataset.id;
      if (!sedeId) return;
      window.stateActions.setSedeAttiva(sedeId);
      window.location.hash = "#/home";
    };
  });
}
