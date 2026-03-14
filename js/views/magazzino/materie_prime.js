import { renderCaricoModal, apriCaricoModal } from "./carico_magazzino.js";

export async function renderMateriePrime(container, azienda) {

  container.innerHTML = `<p>Caricamento magazzino...</p>`;

  const { data: candidati, error } = await window.supabaseClient
    .from("v_magazzino_materie_prime")
    .select("*")
    .eq("azienda_id", azienda.id)
    .gt("scorta_minima", 0)
    .order("giacenza_attuale", { ascending: true })
    .limit(200);

  if (error) {
    container.innerHTML = `<p style="color:red;">Errore: ${error.message}</p>`;
    return;
  }

  const sottoScorta = (candidati || [])
    .filter(p => Number(p.giacenza_attuale || 0) <= Number(p.scorta_minima || 0))
    .slice(0, 50);

  container.innerHTML = `
    <h3>Magazzino Materie Prime</h3>

    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
      <input 
        type="text" 
        id="magazzino-search" 
        class="input-pill" 
        placeholder="🔎 Cerca materia prima..."
        style="flex:1 1 260px;"
      />
      <button class="app-button tiny gray" id="btn-back-mag-home">← Menu Magazzino</button>
    </div>

    <div id="magazzino-risultati"></div>

    <h4 style="margin-top:20px;">⚠️ Prodotti Sottoscorta</h4>
    <div id="magazzino-sottoscorta"></div>

    ${renderCaricoModal()}
  `;

  const risultati = document.getElementById("magazzino-risultati");
  const sottoScortaBox = document.getElementById("magazzino-sottoscorta");

  if (!sottoScorta.length) {
    sottoScortaBox.innerHTML = `<p style="opacity:0.7;">Nessun sottoscorta 🎉</p>`;
  } else {
    renderTable(sottoScortaBox, sottoScorta, azienda, container);
  }

}

function renderTable(target, data, azienda, container) {

  target.innerHTML = `
    <table class="table-timbrature">
      <thead>
        <tr>
          <th>Codice</th>
          <th>Descrizione</th>
          <th>Giacenza</th>
          <th>Scorta Min.</th>
          <th>Fornitore</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        ${(data || []).map(p => `
          <tr>
            <td>${p.codice_interno || ""}</td>
            <td>${p.descrizione || ""}</td>
            <td>${Number(p.giacenza_attuale || 0).toFixed(3)}</td>
            <td>${Number(p.scorta_minima || 0)}</td>
            <td>${p.fornitore_nome || ""}</td>
            <td>
              <button class="app-button tiny gray btn-apri-carico"
                data-prodotto-id="${p.prodotto_id}">
                + Carico
              </button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  target.querySelectorAll(".btn-apri-carico").forEach(btn => {

    btn.addEventListener("click", () => {

      const prodottoId = btn.dataset.prodottoId;

      apriCaricoModal({
        aziendaId: azienda.id,
        prodottoId
      });

    });

  });

}
