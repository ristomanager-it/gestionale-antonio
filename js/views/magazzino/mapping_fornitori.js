export async function renderMapping(container, azienda) {
  const existing = document.getElementById("rf-overlay-mapping-fornitori");

  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement("div");
  overlay.id = "rf-overlay-mapping-fornitori";

  overlay.innerHTML = `
    <div class="rf-overlay-backdrop">
      <div class="rf-overlay-card">
        <div class="rf-overlay-header">
          <h3 class="rf-overlay-title">Mapping Fornitori</h3>
          <button class="app-button tiny gray" data-close-overlay>Chiudi</button>
        </div>

        <div class="rf-overlay-body">
          <div class="rf-field">
            <label>Ricerca prodotto</label>
            <input
              id="search-mapping"
              class="input"
              placeholder="Cerca codice o descrizione..."
              autocomplete="off"
              style="width:100%;"
            >
          </div>

          <div id="risultati-mapping"></div>
          <div id="scheda-mapping" class="rf-section-spacer"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const backdrop = overlay.querySelector(".rf-overlay-backdrop");
  const risultati = overlay.querySelector("#risultati-mapping");
  const scheda = overlay.querySelector("#scheda-mapping");
  const input = overlay.querySelector("#search-mapping");

  const close = () => overlay.remove();

  overlay.querySelector("[data-close-overlay]").onclick = close;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      close();
    }
  };

  input.addEventListener("input", async () => {
    const term = input.value.trim();
    scheda.innerHTML = "";

    if (term.length < 2) {
      risultati.innerHTML = "";
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, meta, descrizione, um")
      .eq("azienda_id", azienda.id)
      .or(`descrizione.ilike.%${term}%,meta.ilike.%${term}%`)
      .limit(10);

    if (error) {
      console.error(error);
      risultati.innerHTML = `<div class="rf-empty-state">Errore durante la ricerca</div>`;
      return;
    }

    if (!data || !data.length) {
      risultati.innerHTML = `<div class="rf-empty-state">Nessun prodotto trovato</div>`;
      return;
    }

    risultati.innerHTML = `
      <div class="rf-search-list">
        ${data.map((p) => `
          <div class="rf-search-item">
            <div class="rf-search-row">
              <div class="rf-search-main">
                <div class="rf-search-code">${escapeHtml(p.meta || "—")}</div>
                <div class="rf-search-title">${escapeHtml(p.descrizione || "")}</div>
                <div class="rf-search-subtitle">UM: ${escapeHtml(p.um || "—")}</div>
              </div>

              <button
                type="button"
                class="rf-search-action autocomplete-item"
                data-id="${p.id}"
                aria-label="Apri mapping fornitore"
              >🔍</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    risultati.querySelectorAll(".autocomplete-item").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        apriMapping(scheda, azienda, id);
      };
    });
  });
}

async function apriMapping(box, azienda, prodottoId) {
  box.innerHTML = `<div class="rf-empty-state">Caricamento scheda...</div>`;

  const { data: prodotto } = await window.supabaseClient
    .from("prodotti")
    .select("id, meta, descrizione, um, scorta_minima")
    .eq("azienda_id", azienda.id)
    .eq("id", prodottoId)
    .single();

  const { data: movimenti } = await window.supabaseClient
    .from("magazzino_movimenti")
    .select("tipo_movimento, quantita, created_at")
    .eq("azienda_id", azienda.id)
    .eq("prodotto_id", prodottoId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: mapping } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select(`
      codice_fornitore,
      descrizione_fornitore,
      prezzo_ultimo_acquisto,
      fornitori:fornitore_id (ragione_sociale)
    `)
    .eq("prodotto_id", prodottoId)
    .limit(5);

  if (!prodotto) {
    box.innerHTML = `<div class="rf-empty-state">Prodotto non trovato</div>`;
    return;
  }

  const giacenza = (movimenti || []).reduce((tot, mov) => {
    const q = Number(mov.quantita || 0);

    if (mov.tipo_movimento === "SCARICO") {
      return tot - q;
    }

    return tot + q;
  }, 0);

  box.innerHTML = `
    <div class="rf-product-card">
      <div class="rf-product-heading">
        <div class="rf-product-code">${escapeHtml(prodotto.meta || "—")}</div>
        <div class="rf-product-title">${escapeHtml(prodotto.descrizione || "")}</div>
      </div>

      <div class="rf-product-grid">
        <div class="rf-product-field">
          <span class="rf-product-label">UM</span>
          <div class="rf-product-value">${escapeHtml(prodotto.um || "—")}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Fornitore</span>
          <div class="rf-product-value">${escapeHtml(mapping?.[0]?.fornitori?.ragione_sociale || "—")}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Giacenza</span>
          <div class="rf-product-value">${formatNumber(giacenza)}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Scorta minima</span>
          <div class="rf-product-value">${formatNumber(prodotto.scorta_minima)}</div>
        </div>
      </div>

      <div class="rf-product-section-title">Mapping fornitori</div>

      <div class="rf-mov-list">
        ${(mapping || []).length ? mapping.map((m) => `
          <div class="rf-mov-item">
            <div class="rf-mov-main">${escapeHtml(m.fornitori?.ragione_sociale || "—")}</div>
            <div class="rf-mov-meta">
              Cod: ${escapeHtml(m.codice_fornitore || "—")}<br>
              Prezzo: ${formatNumber(m.prezzo_ultimo_acquisto)}
            </div>
          </div>
        `).join("") : `<div class="rf-empty-state">Nessun mapping trovato</div>`}
      </div>

      <div class="rf-product-section-title">Ultimi movimenti</div>

      <div class="rf-mov-list">
        ${(movimenti || []).length ? movimenti.map((m) => `
          <div class="rf-mov-item">
            <div class="rf-mov-main">${escapeHtml(m.tipo_movimento || "—")} · ${formatNumber(m.quantita)}</div>
            <div class="rf-mov-meta">${formatDateTime(m.created_at)}</div>
          </div>
        `).join("") : `<div class="rf-empty-state">Nessun movimento recente</div>`}
      </div>
    </div>
  `;
}

function formatNumber(value) {
  const n = Number(value || 0);

  if (Number.isNaN(n)) {
    return "—";
  }

  return n.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("it-IT");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
