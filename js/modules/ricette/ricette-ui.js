// ============================================================
// RICETTE UI - DESKTOP COMPLETO
// ============================================================

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
          <input id="r-pezzi" type="number" class="input" value="${ricetta.pezzi_base || ""}" />
        </div>

        <div class="form-group">
          <label>Resa totale (kg)</label>
          <input id="r-resa" type="number" step="0.001" class="input" value="${ricetta.resa_kg || ""}" />
        </div>
      </div>
    </div>
  `;
}

// =========================
// OUTPUT + PORZIONI
// =========================

export function renderOutput(output, costi) {
  return `
    <div class="card">
      <h3>Output</h3>

      <div class="form-grid">
        <div class="form-group">
          <label>Numero porzioni</label>
          <input id="r-porzioni" type="number" class="input" value="${output.porzioni || ""}" />
        </div>

        <div class="form-group">
          <label>Peso porzione (kg)</label>
          <input id="r-peso-porzione" type="number" step="0.001" class="input" value="${output.peso_porzione || ""}" />
        </div>
      </div>

      <div class="form-help">
        Costo porzione: € <strong>${format(costi.costoPorzione)}</strong>
      </div>
    </div>
  `;
}

// =========================
// CONSERVAZIONE
// =========================

export function renderConservazione(c) {
  return `
    <div class="card">
      <h3>Conservazione</h3>

      <div class="form-grid">
        <div class="form-group">
          <label>Durata (giorni)</label>
          <input id="c-giorni" type="number" class="input" value="${c.giorni || ""}" />
        </div>

        <div class="form-group">
          <label>Tipo</label>
          <select id="c-tipo" class="input">
            <option value="">--</option>
            <option value="frigo" ${c.tipo === "frigo" ? "selected" : ""}>Frigo</option>
            <option value="freezer" ${c.tipo === "freezer" ? "selected" : ""}>Freezer</option>
            <option value="ambiente" ${c.tipo === "ambiente" ? "selected" : ""}>Ambiente</option>
          </select>
        </div>
      </div>
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
        <div class="form-grid" data-cp="${i}">
          <input class="input" data-field="nome" value="${c.nome || ""}" placeholder="Nome" />
          <input class="input" type="number" data-field="quantita" value="${c.quantita || ""}" placeholder="Quantità" />
        </div>
      `).join("")}

      <button id="btn-add-cp" class="app-button secondary">+ Coprodotto</button>
    </div>
  `;
}

// =========================
// INGREDIENTI (TUO CODICE)
// =========================

export function renderIngredienti(ingredienti, prodotti) {
  if (!ingredienti.length) {
    return `
      <div class="card">
        <h3>Ingredienti</h3>
        <div class="form-help">Nessun ingrediente</div>
        <button id="btn-add-ing" class="app-button secondary">+ Ingrediente</button>
      </div>
    `;
  }

  return `
    <div class="card">
      <h3>Ingredienti</h3>

      ${ingredienti.map((ing, idx) => `
        <div class="card menu-card" data-idx="${idx}">
          <div class="form-grid">

            <div class="form-group">
              <label>Prodotto</label>
              <select class="input" data-field="prodotto_id">
                <option value="">Seleziona...</option>
                ${prodotti.map(p => `
                  <option value="${p.id}" ${String(p.id) === String(ing.prodotto_id) ? "selected" : ""}>
                    ${p.descrizione}
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="form-group">
              <label>Quantità</label>
              <input type="number" step="0.001" class="input"
                data-field="quantita"
                value="${ing.quantita || ""}" />
            </div>

            <div class="form-group">
              <label>UM</label>
              <select class="input" data-field="unita_misura">
                <option value="kg" ${ing.unita_misura === "kg" ? "selected" : ""}>kg</option>
                <option value="g" ${ing.unita_misura === "g" ? "selected" : ""}>g</option>
                <option value="pz" ${ing.unita_misura === "pz" ? "selected" : ""}>pz</option>
              </select>
            </div>

          </div>

          <button class="app-button secondary" data-action="remove">Rimuovi</button>
        </div>
      `).join("")}

      <button id="btn-add-ing" class="app-button secondary">+ Ingrediente</button>
    </div>
  `;
}

// =========================
// FASI (TUO CODICE)
// =========================

export function renderFasi(fasi) {
  if (!fasi.length) {
    return `
      <div class="card">
        <h3>Fasi</h3>
        <div class="form-help">Nessuna fase</div>
        <button id="btn-add-fase" class="app-button secondary">+ Fase</button>
      </div>
    `;
  }

  return `
    <div class="card">
      <h3>Fasi</h3>

      ${fasi.map((f, idx) => `
        <div class="card menu-card" data-fase-idx="${idx}">
          <div class="form-grid">

            <div class="form-group">
              <label>Durata (min)</label>
              <input type="number" class="input" data-field="durata_min" value="${f.durata_min || ""}" />
            </div>

            <div class="form-group">
              <label>Lavoro umano (min)</label>
              <input type="number" class="input" data-field="lavoro_umano_min" value="${f.lavoro_umano_min || ""}" />
            </div>

            <div class="form-group">
              <label>Potenza (kW)</label>
              <input type="number" step="0.1" class="input" data-field="potenza_kw" value="${f.potenza_kw || ""}" />
            </div>

          </div>

          <button class="app-button secondary" data-action="remove-fase">Rimuovi</button>
        </div>
      `).join("")}

      <button id="btn-add-fase" class="app-button secondary">+ Fase</button>
    </div>
  `;
}

// =========================
// COSTI
// =========================

export function renderCosti(costi) {
  return `
    <div class="card">
      <h3>Costi</h3>

      <div class="form-help">
        Materia: € ${format(costi.materia)}<br>
        Lavoro: € ${format(costi.lavoro)}<br>
        Energia: € ${format(costi.energia)}<br>
        <strong>Industriale: € ${format(costi.industriale)}</strong><br>
        Costo/kg: € ${format(costi.costoKg)}
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
      <button id="btn-save" class="app-button">💾 Salva ricetta</button>
    </div>
  `;
}

function format(n) {
  return Number(n || 0).toFixed(2);
}
