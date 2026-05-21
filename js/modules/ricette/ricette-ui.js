// ============================================================
// RICETTE UI - DESKTOP COMPLETO AI READY
// ============================================================

const UNITA_RESA = ["kg", "gr", "lt", "ml", "pz"];

export function renderLayout() {
  return `
    <div id="ricette-editor-root" style="display:flex; gap:20px; align-items:flex-start;">
      <div id="col-left" style="flex:2; display:flex; flex-direction:column; gap:16px;"></div>
      <div id="col-right" style="flex:1; display:flex; flex-direction:column; gap:16px;"></div>
    </div>
  `;
}

// =========================
// ANAGRAFICA
// =========================

export function renderAnagrafica(ricetta) {
  return `
    <div class="card">
      <h3>Anagrafica</h3>

      <div class="form-grid">

        <div class="form-group">
          <label>Nome ricetta</label>
          <input id="r-nome" class="input" value="${ricetta.nome || ""}" />
        </div>

        <div class="form-group">
          <label>Pezzi base</label>
          <input
            id="r-pezzi"
            type="number"
            class="input"
            value="${ricetta.pezzi_base || ""}"
          />
        </div>

        <div class="form-group">
          <label>Resa produzione</label>

          <div style="display:flex; gap:8px;">
            <input
              id="r-resa"
              type="number"
              step="0.001"
              class="input"
              style="flex:1;"
              value="${ricetta.resa_quantita || ""}"
            />

            <select
              id="r-resa-um"
              class="input"
              style="max-width:120px;"
            >
              ${UNITA_RESA.map(um => `
                <option
                  value="${um}"
                  ${ricetta.resa_um === um ? "selected" : ""}
                >
                  ${um}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="form-help">
            Produzione multi-unità AI-ready
          </div>
        </div>

      </div>
    </div>
  `;
}

// =========================
// OUTPUT
// =========================

export function renderOutput(output, costi, ricetta) {
  return `
    <div class="card">
      <h3>Output</h3>

      <div class="form-grid">

        <div class="form-group">
          <label>Numero porzioni</label>

          <input
            id="r-porzioni"
            type="number"
            class="input"
            value="${output.porzioni || ""}"
          />
        </div>

        <div class="form-group">
          <label>Quantità porzione</label>

          <input
            id="r-peso-porzione"
            type="number"
            step="0.001"
            class="input"
            value="${output.peso_porzione || ""}"
          />
        </div>

      </div>

      <div class="form-help">
        Resa totale:
        <strong>
          ${format(ricetta.resa_quantita)}
          ${ricetta.resa_um || "kg"}
        </strong>
        <br>

        Costo porzione:
        € <strong>${format(costi.costoPorzione)}</strong>
      </div>
    </div>
  `;
}

// =========================
// CONSERVAZIONE
// =========================

export function renderConservazioneScenari(lista) {
  return `
    <div class="card">
      <h3>Scenari conservazione</h3>

      ${lista.length === 0 ? `
        <div class="form-help">Nessuno scenario</div>
      ` : `
        ${lista.map((s, i) => `
          <div class="card menu-card" data-scenario-idx="${i}">
            <div class="form-grid">

              <input
                class="input"
                data-field="scenario_label"
                placeholder="Nome scenario"
                value="${s.scenario_label || ""}"
              />

              <input
                class="input"
                data-field="abbattimento"
                placeholder="Abbattimento"
                value="${s.abbattimento || ""}"
              />

              <input
                class="input"
                data-field="confezionamento"
                placeholder="Confezionamento"
                value="${s.confezionamento || ""}"
              />

              <input
                class="input"
                type="number"
                data-field="shelf_life_giorni"
                placeholder="Giorni"
                value="${s.shelf_life_giorni || ""}"
              />

            </div>

            <button
              class="app-button secondary"
              data-action="remove-scenario"
            >
              Rimuovi
            </button>
          </div>
        `).join("")}
      `}

      <button
        id="btn-add-scenario"
        class="app-button secondary"
      >
        + Scenario
      </button>
    </div>
  `;
}

// =========================
// COPRODOTTI
// =========================

export function renderCoprodotti(lista) {
  return `
    <div class="card">
      <h3>Coprodotti</h3>

      ${lista.map((c, i) => `
        <div class="form-grid" data-cp-idx="${i}">
          <input
            class="input"
            data-field="nome"
            value="${c.nome || ""}"
            placeholder="Nome"
          />

          <input
            class="input"
            type="number"
            data-field="peso"
            value="${c.peso || ""}"
            placeholder="Quantità"
          />
        </div>
      `).join("")}

      <button
        id="btn-add-cp"
        class="app-button secondary"
      >
        + Coprodotto
      </button>
    </div>
  `;
}

// =========================
// INGREDIENTI
// =========================

export function renderIngredienti(ingredienti, prodotti) {
  if (!ingredienti.length) {
    return `
      <div class="card">
        <h3>Ingredienti</h3>

        <div class="form-help">
          Nessun ingrediente
        </div>

        <button
          id="btn-add-ing"
          class="app-button secondary"
        >
          + Ingrediente
        </button>
      </div>
    `;
  }

  return `
    <div class="card">
      <h3>Ingredienti</h3>

      ${ingredienti.map((ing, idx) => `
        <div class="card menu-card" data-idx="${idx}">
          <div class="form-grid">

            <select class="input" data-field="prodotto_id">
              <option value="">Seleziona...</option>

              ${prodotti.map(p => `
                <option
                  value="${p.id}"
                  ${String(p.id) === String(ing.prodotto_id)
                    ? "selected"
                    : ""}
                >
                  ${p.descrizione}
                </option>
              `).join("")}
            </select>

            <input
              type="number"
              step="0.001"
              class="input"
              data-field="quantita"
              value="${ing.quantita || ""}"
            />

            <select
              class="input"
              data-field="unita_misura"
            >
              <option value="kg" ${ing.unita_misura === "kg" ? "selected" : ""}>kg</option>
              <option value="gr" ${ing.unita_misura === "gr" ? "selected" : ""}>gr</option>
              <option value="lt" ${ing.unita_misura === "lt" ? "selected" : ""}>lt</option>
              <option value="ml" ${ing.unita_misura === "ml" ? "selected" : ""}>ml</option>
              <option value="pz" ${ing.unita_misura === "pz" ? "selected" : ""}>pz</option>
            </select>

          </div>

          <button
            class="app-button secondary"
            data-action="remove-ingrediente"
          >
            Rimuovi
          </button>
        </div>
      `).join("")}

      <button
        id="btn-add-ing"
        class="app-button secondary"
      >
        + Ingrediente
      </button>
    </div>
  `;
}

// =========================
// FASI
// =========================

export function renderFasi(fasi) {
  if (!fasi.length) {
    return `
      <div class="card">
        <h3>Fasi</h3>

        <div class="form-help">
          Nessuna fase
        </div>

        <button
          id="btn-add-fase"
          class="app-button secondary"
        >
          + Fase
        </button>
      </div>
    `;
  }

  return `
    <div class="card">
      <h3>Fasi</h3>

      ${fasi.map((f, idx) => `
        <div class="card menu-card" data-fase-idx="${idx}">
          <div class="form-grid">

            <input
              type="number"
              class="input"
              data-field="durata_min"
              value="${f.durata_min || ""}"
            />

            <input
              type="number"
              class="input"
              data-field="lavoro_umano_min"
              value="${f.lavoro_umano_min || ""}"
            />

            <input
              type="number"
              step="0.1"
              class="input"
              data-field="potenza_kw"
              value="${f.potenza_kw || ""}"
            />

          </div>

          <button
            class="app-button secondary"
            data-action="remove-fase"
          >
            Rimuovi
          </button>
        </div>
      `).join("")}

      <button
        id="btn-add-fase"
        class="app-button secondary"
      >
        + Fase
      </button>
    </div>
  `;
}

// =========================
// COSTI
// =========================

export function renderCosti(costi, ricetta) {
  return `
    <div class="card">
      <h3>Costi</h3>

      <div class="form-help">
        Materia: € ${format(costi.materia)}<br>
        Lavoro: € ${format(costi.lavoro)}<br>
        Energia: € ${format(costi.energia)}<br>

        <strong>
          Industriale: € ${format(costi.industriale)}
        </strong>
        <br>

        Costo/${ricetta.resa_um || "kg"}:
        € ${format(costi.costoKg)}
      </div>
    </div>
  `;
}

// =========================
// AZIONI
// =========================

export function renderAzioni() {
  return `
    <div class="form-actions">
      <button id="btn-save" class="app-button">
        💾 Salva ricetta
      </button>

      <div
        id="ricetta-save-result"
        class="form-help"
      ></div>
    </div>
  `;
}

function format(n) {
  return Number(n || 0).toFixed(2);
}
