export async function renderProdottiFiniti(container, azienda) {
  const existing = document.getElementById("rf-overlay-prodotti-finiti");

  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement("div");
  overlay.id = "rf-overlay-prodotti-finiti";

  overlay.innerHTML = `
    <div class="rf-overlay-backdrop">
      <div class="rf-overlay-card">
        <div class="rf-overlay-header">
          <h3 class="rf-overlay-title">Prodotti Finiti</h3>
          <button class="app-button tiny gray" data-close-overlay>Chiudi</button>
        </div>

        <div class="rf-overlay-body">
          <div class="rf-overlay-tabs">
            <button class="app-button tiny" id="tab-cerca">Cerca prodotto</button>
            <button class="app-button tiny gray" id="tab-disponibili">Disponibili</button>
          </div>

          <div id="contenuto-prodotti-finiti"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const backdrop = overlay.querySelector(".rf-overlay-backdrop");
  const contenuto = overlay.querySelector("#contenuto-prodotti-finiti");
  const tabCerca = overlay.querySelector("#tab-cerca");
  const tabDisponibili = overlay.querySelector("#tab-disponibili");

  const close = () => overlay.remove();

  overlay.querySelector("[data-close-overlay]").onclick = close;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      close();
    }
  };

  const openRicerca = () => {
    tabCerca.classList.remove("gray");
    tabDisponibili.classList.add("gray");
    loadRicerca(contenuto, azienda);
  };

  const openDisponibili = () => {
    tabDisponibili.classList.remove("gray");
    tabCerca.classList.add("gray");
    loadDisponibili(contenuto, azienda);
  };

  tabCerca.onclick = openRicerca;
  tabDisponibili.onclick = openDisponibili;

  openRicerca();
}

function loadRicerca(box, azienda) {
  box.innerHTML = `
    <div class="rf-field">
      <label>Ricerca prodotto finito</label>
      <input
        id="search-pf"
        class="input"
        placeholder="Cerca codice o descrizione..."
        autocomplete="off"
        style="width:100%;"
      />
    </div>

    <div id="autocomplete-results"></div>
    <div id="scheda-prodotto-finito" class="rf-section-spacer"></div>
  `;

  const input = box.querySelector("#search-pf");
  const results = box.querySelector("#autocomplete-results");
  const scheda = box.querySelector("#scheda-prodotto-finito");

  input.addEventListener("input", async () => {
    const term = input.value.trim();
    scheda.innerHTML = "";

    if (term.length < 2) {
      results.innerHTML = "";
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, meta, descrizione, um")
      .eq("azienda_id", azienda.id)
      .eq("tipo_prodotto", "prodotto_finito")
      .or(`meta.ilike.%${term}%,descrizione.ilike.%${term}%`)
      .limit(10);

    if (error) {
      console.error(error);
      results.innerHTML = `<div class="rf-empty-state">Errore durante la ricerca</div>`;
      return;
    }

    if (!data || !data.length) {
      results.innerHTML = `<div class="rf-empty-state">Nessun prodotto trovato</div>`;
      return;
    }

    results.innerHTML = `
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
                class="rf-search-action prodotto-finito-action"
                data-id="${p.id}"
                aria-label="Apri scheda prodotto"
              >🔍</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    results.querySelectorAll(".prodotto-finito-action").forEach((btn) => {
      btn.onclick = () => {
        apriSchedaProdotto(scheda, azienda, btn.dataset.id, () => loadRicerca(box, azienda));
        results.innerHTML = "";
      };
    });
  });
}

async function loadDisponibili(box, azienda) {
  box.innerHTML = "Caricamento...";

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_prodotti_finiti")
    .select("prodotto_id, meta, descrizione, um, giacenza_attuale, scorta_minima")
    .eq("azienda_id", azienda.id)
    .gt("giacenza_attuale", 0)
    .order("giacenza_attuale", { ascending: false });

  if (error) {
    console.error(error);
    box.innerHTML = `<div class="rf-empty-state">Errore durante il caricamento</div>`;
    return;
  }

  if (!data || !data.length) {
    box.innerHTML = `<div class="rf-empty-state">Nessun prodotto disponibile</div>`;
    return;
  }

  box.innerHTML = `
    <div class="rf-search-list">
      ${data.map((p) => `
        <div class="rf-search-item">
          <div class="rf-search-row">
            <div class="rf-search-main">
              <div class="rf-search-code">${escapeHtml(p.meta || "—")}</div>
              <div class="rf-search-title">${escapeHtml(p.descrizione || "")}</div>
              <div class="rf-search-subtitle">Disponibili ${formatNumber(p.giacenza_attuale)}</div>
            </div>

            <button
              type="button"
              class="rf-search-action disponibile-action"
              data-id="${p.prodotto_id}"
              aria-label="Apri scheda prodotto"
            >🔍</button>
          </div>
        </div>
      `).join("")}
    </div>

    <div id="scheda-disponibili" class="rf-section-spacer"></div>
  `;

  const scheda = box.querySelector("#scheda-disponibili");

  box.querySelectorAll(".disponibile-action").forEach((btn) => {
    btn.onclick = () => {
      apriSchedaProdotto(scheda, azienda, btn.dataset.id, () => loadDisponibili(box, azienda));
    };
  });
}

async function apriSchedaProdotto(box, azienda, prodottoId, onBack) {
  box.innerHTML = `<div class="rf-empty-state">Caricamento...</div>`;

  const { data, error } = await window.supabaseClient
    .from("v_magazzino_prodotti_finiti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("prodotto_id", prodottoId)
    .single();

  if (error || !data) {
    console.error(error);
    box.innerHTML = `<div class="rf-empty-state">Prodotto non trovato</div>`;
    return;
  }

  const { data: movimenti } = await window.supabaseClient
    .from("magazzino_movimenti")
    .select("tipo_movimento, quantita, created_at")
    .eq("azienda_id", azienda.id)
    .eq("prodotto_id", prodottoId)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: mapping } = await window.supabaseClient
    .from("prodotti_fornitore")
    .select("fornitori:fornitore_id (ragione_sociale)")
    .eq("prodotto_id", prodottoId)
    .limit(1)
    .maybeSingle();

  box.innerHTML = `
    <div class="rf-product-card">
      <div class="rf-product-heading">
        <div class="rf-product-code">${escapeHtml(data.meta || "—")}</div>
        <div class="rf-product-title">${escapeHtml(data.descrizione || "")}</div>
      </div>

      <div class="rf-product-grid">
        <div class="rf-product-field">
          <span class="rf-product-label">UM</span>
          <div class="rf-product-value">${escapeHtml(data.um || "—")}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Fornitore</span>
          <div class="rf-product-value">${escapeHtml(mapping?.fornitori?.ragione_sociale || "—")}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Giacenza</span>
          <div class="rf-product-value">${formatNumber(data.giacenza_attuale)}</div>
        </div>

        <div class="rf-product-field">
          <span class="rf-product-label">Scorta minima</span>
          <div class="rf-product-value">${formatNumber(data.scorta_minima)}</div>
        </div>
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

      <div style="margin-top:12px;">
        <button class="app-button tiny gray" id="btn-indietro-pf">← Indietro</button>
      </div>
    </div>
  `;

  box.querySelector("#btn-indietro-pf").onclick = () => {
    onBack();
  };
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
