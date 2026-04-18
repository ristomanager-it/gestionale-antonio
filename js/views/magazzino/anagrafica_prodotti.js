import "../../db.js";

export async function renderAnagraficaProdotti(container) {
  const azienda = window.state?.azienda;

  const existing = document.getElementById("rf-overlay-anagrafica-prodotti");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "rf-overlay-anagrafica-prodotti";

  overlay.innerHTML = `
    <div class="rf-overlay-backdrop">
      <div class="rf-overlay-card">
        <div class="rf-overlay-header">
          <h3 class="rf-overlay-title">Anagrafica Prodotti</h3>
          <button class="app-button tiny gray" data-close-overlay>Chiudi</button>
        </div>

        <div class="rf-overlay-body">
          <div class="rf-field">
            <label>Ricerca prodotto</label>
            <input id="search-prodotti" class="input" placeholder="Cerca codice o descrizione..." />
          </div>

          <div id="risultati-prodotti"></div>
          <div id="scheda-anagrafica" class="rf-section-spacer"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const backdrop = overlay.querySelector(".rf-overlay-backdrop");
  const risultati = overlay.querySelector("#risultati-prodotti");
  const scheda = overlay.querySelector("#scheda-anagrafica");
  const input = overlay.querySelector("#search-prodotti");

  const close = () => overlay.remove();

  overlay.querySelector("[data-close-overlay]").onclick = close;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) close();
  };

  input.addEventListener("input", async () => {
    const term = input.value.trim();
    scheda.innerHTML = "";

    if (term.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    const { data, error } = await window.db
      .from("prodotti")
      .select("id, meta, descrizione, tipo_prodotto, um")
      .or(`descrizione.ilike.%${term}%,meta.ilike.%${term}%`)
      .limit(15);

    if (error) {
      console.error(error);
      risultati.innerHTML = `<div class="rf-empty-state">Errore durante la ricerca</div>`;
      return;
    }

    if (!data || !data.length) {
      risultati.innerHTML = `<div class="rf-empty-state">Nessun prodotto trovato</div>`;
      return;
    }

    risultati.innerHTML = data.map(p => `
      <div class="rf-search-item">
        <div>${escapeHtml(p.meta || "")}</div>
        <div>${escapeHtml(p.descrizione || "")}</div>
        <button data-id="${p.id}">Apri</button>
      </div>
    `).join("");

    risultati.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        apriSchedaProdotto(scheda, btn.dataset.id);
      };
    });
  });
}

async function apriSchedaProdotto(box, prodottoId) {

  const { data, error } = await window.db
    .from("prodotti")
    .select("*")
    .eq("id", prodottoId)
    .single();

  if (error || !data) {
    box.innerHTML = "Errore caricamento";
    return;
  }

  box.innerHTML = `
    <div>
      <h3>${escapeHtml(data.descrizione)}</h3>
      <p>UM: ${escapeHtml(data.um)}</p>
      <p>Giacenza: ${data.giacenza_attuale || 0}</p>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str || "").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
