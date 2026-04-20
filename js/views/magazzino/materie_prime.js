export async function renderMateriePrime(container, azienda, startTab = "cerca") {
  const existing = document.getElementById("rf-overlay-materie-prime");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "rf-overlay-materie-prime";

  overlay.innerHTML = `
    <div class="rf-overlay-backdrop">
      <div class="rf-overlay-card">
        <div class="rf-overlay-header">
          <h3 class="rf-overlay-title">Materie Prime</h3>
          <button class="app-button tiny gray" data-close-overlay>Chiudi</button>
        </div>

        <div class="rf-overlay-body">
          <div class="rf-field">
            <label>Ricerca prodotto</label>
            <input
              id="search-mp"
              class="input"
              placeholder="Codice o descrizione..."
              autocomplete="off"
            />
          </div>

          <div id="mp-results"></div>
          <div id="mp-scheda" class="rf-section-spacer"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const backdrop = overlay.querySelector(".rf-overlay-backdrop");
  const results = overlay.querySelector("#mp-results");
  const scheda = overlay.querySelector("#mp-scheda");
  const input = overlay.querySelector("#search-mp");

  const close = () => overlay.remove();

  overlay.querySelector("[data-close-overlay]").onclick = close;

  backdrop.onclick = (e) => {
    if (e.target === backdrop) close();
  };

  input.oninput = async () => {
    const term = input.value.trim();

    scheda.innerHTML = "";

    if (term.length < 2) {
      results.innerHTML = "";
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("prodotti")
      .select("id, codice_interno, descrizione, unita_base")
      .eq("azienda_id", azienda.id)
      .or(`codice_interno.ilike.%${term}%,descrizione.ilike.%${term}%`)
      .order("descrizione", { ascending: true })
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
            <div class="rf-search-row rf-mp-result-row" data-id="${p.id}" style="cursor:pointer;">
              <div class="rf-search-main">
                <div class="rf-search-code">${escapeHtml(p.codice_interno || "—")}</div>
                <div class="rf-search-title">${escapeHtml(p.descrizione || "")}</div>
                <div class="rf-search-subtitle">UM ${escapeHtml(p.unita_base || "—")}</div>
              </div>

              <button
                type="button"
                class="rf-search-action open-mp"
                data-id="${p.id}"
                aria-label="Apri scheda prodotto"
              >🔍</button>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    const apriDaElemento = (element) => {
      const id = Number(element.dataset.id);
      if (!id) return;
      openScheda(id);
      results.innerHTML = "";
    };

    results.querySelectorAll(".rf-mp-result-row").forEach((row) => {
      row.onclick = () => apriDaElemento(row);
    });

    results.querySelectorAll(".open-mp").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        apriDaElemento(btn);
      };
    });
  };

  async function openScheda(prodottoId) {
    scheda.innerHTML = `<div class="rf-empty-state">Caricamento scheda...</div>`;

    const sedeId = window.state?.sedeAttiva?.id;

    if (!sedeId) {
      scheda.innerHTML = `<div class="rf-empty-state">Sede attiva non trovata</div>`;
      return;
    }

    const { data, error } = await window.supabaseClient
      .from("v_magazzino_giacenze")
      .select("*")
      .eq("azienda_id", azienda.id)
      .eq("sede_id", sedeId)
      .eq("prodotto_id", prodottoId)
      .maybeSingle();

    if (error) {
  console.error(error);
}

let giacenza = 0;

if (data) {
  giacenza = data.giacenza_attuale || 0;
}

    const { data: movimenti, error: movimentiError } = await window.supabaseClient
      .from("magazzino_movimenti")
      .select("tipo_movimento, quantita, data_movimento")
      .eq("azienda_id", azienda.id)
      .eq("sede_id", sedeId)
      .eq("prodotto_id", prodottoId)
      .order("data_movimento", { ascending: false })
      .limit(5);

    if (movimentiError) {
      console.error(movimentiError);
    }

    const { data: mapping, error: mappingError } = await window.supabaseClient
      .from("prodotti_fornitore")
      .select("fornitori:fornitore_id (ragione_sociale)")
      .eq("prodotto_id", prodottoId)
      .limit(1)
      .maybeSingle();

    if (mappingError) {
      console.error(mappingError);
    }

    const canEdit = ["admin", "manager"].includes(window.state?.ruolo);

    scheda.innerHTML = `
      <div class="rf-product-card">
        <div class="rf-product-heading">
          <div class="rf-product-code">${escapeHtml(data.codice_interno || "—")}</div>
          <div class="rf-product-title">${escapeHtml(data.descrizione || "")}</div>
        </div>

        <div class="rf-product-grid">
          <div class="rf-product-field">
            <span class="rf-product-label">UM</span>
            <div class="rf-product-value">${escapeHtml(data.unita_base || "—")}</div>
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
          ${(movimenti || []).length
            ? movimenti.map((m) => `
              <div class="rf-mov-item">
                <div class="rf-mov-main">${escapeHtml(m.tipo_movimento || "—")} · ${formatNumber(m.quantita)}</div>
                <div class="rf-mov-meta">${formatDateTime(m.data_movimento)}</div>
              </div>
            `).join("")
            : `<div class="rf-empty-state">Nessun movimento</div>`
          }
        </div>

        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
          ${canEdit ? `<button id="btn-modifica-mp" class="app-button tiny">Modifica</button>` : ""}
          <button id="btn-chiudi-scheda-mp" class="app-button tiny gray">Chiudi scheda</button>
        </div>
      </div>
    `;

    const btnChiudiScheda = scheda.querySelector("#btn-chiudi-scheda-mp");
    if (btnChiudiScheda) {
      btnChiudiScheda.onclick = () => {
        scheda.innerHTML = "";
      };
    }

    const btnModifica = scheda.querySelector("#btn-modifica-mp");
    if (btnModifica) {
      btnModifica.onclick = () => {
        renderEditForm(data, mapping?.fornitori?.ragione_sociale || "—");
      };
    }
  }

  function renderEditForm(prodotto, fornitore) {
    scheda.innerHTML = `
      <div class="rf-product-card">
        <div class="rf-product-section-title">Modifica prodotto</div>

        <div class="rf-field">
          <label>Codice interno</label>
          <input id="edit-mp-codice" class="input" value="${escapeAttr(prodotto.codice_interno || "")}" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Descrizione</label>
          <input id="edit-mp-descrizione" class="input" value="${escapeAttr(prodotto.descrizione || "")}" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>UM</label>
          <input id="edit-mp-um" class="input" value="${escapeAttr(prodotto.unita_base || "")}" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Scorta minima</label>
          <input id="edit-mp-scorta" type="number" step="0.001" class="input" value="${escapeAttr(prodotto.scorta_minima ?? 0)}" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Fornitore</label>
          <input class="input" value="${escapeAttr(fornitore || "—")}" disabled />
        </div>

        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
          <button id="btn-salva-mp" class="app-button tiny">Salva</button>
          <button id="btn-annulla-mp" class="app-button tiny gray">Annulla</button>
        </div>

        <div id="mp-esito" style="margin-top:10px; font-size:13px;"></div>
      </div>
    `;

    const btnAnnulla = scheda.querySelector("#btn-annulla-mp");
    const btnSalva = scheda.querySelector("#btn-salva-mp");
    const esito = scheda.querySelector("#mp-esito");

    btnAnnulla.onclick = () => openScheda(prodotto.prodotto_id);

    btnSalva.onclick = async () => {
      const codice = scheda.querySelector("#edit-mp-codice").value.trim();
      const descrizione = scheda.querySelector("#edit-mp-descrizione").value.trim();
      const unitaBase = scheda.querySelector("#edit-mp-um").value.trim();
      const scortaMinima = Number(scheda.querySelector("#edit-mp-scorta").value || 0);

      if (!descrizione) {
        esito.innerText = "Inserisci la descrizione";
        return;
      }

      esito.innerText = "Salvataggio...";

      const { error } = await window.supabaseClient
        .from("prodotti")
        .update({
          codice_interno: codice || null,
          descrizione,
          unita_base: unitaBase || null,
          scorta_minima: scortaMinima
        })
        .eq("id", prodotto.prodotto_id)
        .eq("azienda_id", azienda.id);

      if (error) {
        console.error(error);
        esito.innerText = "Errore durante il salvataggio";
        return;
      }

      openScheda(prodotto.prodotto_id);
    };
  }
}

function formatNumber(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

function formatDateTime(v) {
  if (!v) return "—";
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("it-IT");
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
