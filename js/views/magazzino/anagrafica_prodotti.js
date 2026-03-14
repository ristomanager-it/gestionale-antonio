export async function renderAnagraficaProdotti(container) {
  const azienda = window.state?.azienda;

  const existing = document.getElementById("rf-overlay-anagrafica-prodotti");

  if (existing) {
    existing.remove();
  }

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
            <input
              id="search-prodotti"
              class="input"
              placeholder="Cerca codice o descrizione..."
              style="width:100%;"
              autocomplete="off"
            />
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
      .select("id, meta, descrizione, tipo_prodotto, um")
      .eq("azienda_id", azienda.id)
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

    risultati.innerHTML = `
      <div class="rf-search-list">
        ${data.map((p) => `
          <div class="rf-search-item">
            <div class="rf-search-row">
              <div class="rf-search-main">
                <div class="rf-search-code">${escapeHtml(p.meta || "—")}</div>
                <div class="rf-search-title">${escapeHtml(p.descrizione || "")}</div>
                <div class="rf-search-subtitle">${escapeHtml(p.tipo_prodotto || "—")} · UM ${escapeHtml(p.um || "—")}</div>
              </div>

              <button
                type="button"
                class="rf-search-action risultato-prodotto"
                data-id="${p.id}"
                aria-label="Apri scheda prodotto"
              >🔍</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    risultati.querySelectorAll(".risultato-prodotto").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        apriSchedaProdotto(scheda, azienda, id, () => {
          risultati.innerHTML = "";
          input.value = "";
          scheda.innerHTML = "";
        });
      };
    });
  });
}

async function apriSchedaProdotto(box, azienda, prodottoId, onBack) {
  box.innerHTML = `<div class="rf-empty-state">Caricamento...</div>`;

  const { data, error } = await window.supabaseClient
    .from("prodotti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .eq("id", prodottoId)
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
          <div class="rf-product-value">
            <input id="um" class="input" value="${escapeAttr(data.um || "")}">
          </div>
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
          <div class="rf-product-value">
            <input id="scorta" class="input" value="${escapeAttr(data.scorta_minima || "")}">
          </div>
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

      <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="app-button tiny" id="salva-prodotto">Salva</button>
        <button class="app-button tiny gray" id="indietro">Indietro</button>
      </div>
    </div>
  `;

  box.querySelector("#indietro").onclick = () => {
    onBack();
  };

  box.querySelector("#salva-prodotto").onclick = async () => {
    const um = box.querySelector("#um").value.trim();
    const scorta = box.querySelector("#scorta").value.trim();

    const { error: updateError } = await window.supabaseClient
      .from("prodotti")
      .update({
        um,
        scorta_minima: scorta || null
      })
      .eq("id", prodottoId);

    if (updateError) {
      console.error(updateError);
      alert("Errore durante il salvataggio");
      return;
    }

    alert("Salvato");
  };
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const n = Number(value);

  if (Number.isNaN(n)) {
    return escapeHtml(value);
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

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
