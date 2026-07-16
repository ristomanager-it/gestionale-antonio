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

          <div id="mp-da-completare"></div>
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
    if (term.length >= 2) daCompletareBox.innerHTML = "";
    else if (term.length === 0) caricaDaCompletare();

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
      const id = element.dataset.id;
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

  // Cache fornitori
  let fornitori_cache = [];
  const { data: f_list } = await window.supabaseClient
    .from("fornitori")
    .select("id, ragione_sociale")
    .eq("azienda_id", azienda.id)
    .eq("attivo", true)
    .order("ragione_sociale");
  fornitori_cache = f_list || [];

  // Categorie per i dropdown (caricate una volta)
  let catBilancio_cache = [];
  let catInterne_cache = [];
  const { data: cb_list } = await window.supabaseClient
    .from("categorie_bilancio").select("id, nome, tipo").order("nome");
  catBilancio_cache = (cb_list || []).filter(c => c.tipo === "costo");
  const { data: ci_list } = await window.supabaseClient
    .from("prodotti").select("categoria_interna")
    .eq("azienda_id", azienda.id).not("categoria_interna", "is", null);
  catInterne_cache = [...new Set((ci_list || []).map(r => (r.categoria_interna || "").trim()).filter(Boolean))].sort();

  // Lista prodotti da completare (categorie mancanti) — mostrata all'apertura
  const daCompletareBox = overlay.querySelector("#mp-da-completare");
  async function caricaDaCompletare() {
    const { data: incompleti } = await window.supabaseClient
      .from("prodotti")
      .select("id, nome, descrizione, categoria_bilancio_id, categoria_interna")
      .eq("azienda_id", azienda.id).eq("attivo", true)
      .or("categoria_bilancio_id.is.null,categoria_interna.is.null")
      .order("created_at", { ascending: false })
      .limit(50);
    const lista = incompleti || [];
    if (!lista.length) {
      daCompletareBox.innerHTML = `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;font-size:13px;color:#166534;margin-bottom:12px;">🟢 Tutti i prodotti hanno le categorie complete.</div>`;
      return;
    }
    daCompletareBox.innerHTML = `
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:10px;margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:8px;">⚠️ ${lista.length} prodotti da completare</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;">
          ${lista.map(p => {
            const haB = !!p.categoria_bilancio_id;
            const haI = !!(p.categoria_interna && String(p.categoria_interna).trim());
            const pallino = (!haB && !haI) ? "🔴" : "🟡";
            return `<button class="mp-completa-item" data-id="${p.id}" style="text-align:left;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;">
              <span>${pallino}</span>
              <span style="flex:1;">${escapeHtml(p.descrizione || p.nome || "—")}</span>
              <span style="color:#9ca3af;font-size:16px;">›</span>
            </button>`;
          }).join("")}
        </div>
      </div>`;
    daCompletareBox.querySelectorAll(".mp-completa-item").forEach(btn => {
      btn.onclick = () => { daCompletareBox.innerHTML = ""; openScheda(btn.getAttribute("data-id")); };
    });
  }

  async function openScheda(prodottoId) {
    scheda.innerHTML = `<div class="rf-empty-state">Caricamento scheda...</div>`;

    const sedeId = window.state?.sedeAttiva?.id;

    if (!sedeId) {
      scheda.innerHTML = `<div class="rf-empty-state">Sede attiva non trovata</div>`;
      return;
    }

    const { data: prodotto, error: prodottoError } = await window.supabaseClient
      .from("prodotti")
      .select("id, codice_interno, nome, descrizione, unita_base, unita_misura, um, scorta_minima, quantita_riordino, fornitore_preferito_id, alias_ocr, categoria_bilancio_id, categoria_interna, costo_medio, costo_ultimo, um_costo, contenuto_confezione, um_confezione")
      .eq("azienda_id", azienda.id)
      .eq("id", prodottoId)
      .maybeSingle();

    if (prodottoError || !prodotto) {
      console.error(prodottoError);
      scheda.innerHTML = `<div class="rf-empty-state">Prodotto non trovato</div>`;
      return;
    }

    const data = {
      ...prodotto,
      prodotto_id: prodotto.id,
      descrizione: prodotto.descrizione || prodotto.nome || "",
      unita_base: prodotto.unita_base || prodotto.unita_misura || prodotto.um || "—",
      scorta_minima: prodotto.scorta_minima ?? prodotto.quantita_riordino ?? 0
    };

    let movimenti = [];

    const movimentiResult = await window.supabaseClient
      .from("magazzino_movimenti")
      .select("tipo_movimento, quantita, created_at, causale")
      .eq("azienda_id", azienda.id)
      .eq("sede_id", sedeId)
      .eq("prodotto_id", prodottoId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (movimentiResult.error) {
      console.error(movimentiResult.error);
      movimenti = [];
    } else {
      movimenti = movimentiResult.data || [];
    }

    const giacenza = movimenti.reduce((sum, movimento) => {
      const q = Number(movimento?.quantita || 0);
      const tipo = String(movimento?.tipo_movimento || "").toLowerCase();

      if (["scarico", "consumo", "rettifica_negativa", "uscita"].includes(tipo)) {
        return sum - q;
      }

      return sum + q;
    }, 0);

    let fornitore = "—";

    if (data.fornitore_preferito_id) {
      const { data: fornitorePreferito } = await window.supabaseClient
        .from("fornitori")
        .select("ragione_sociale, nome")
        .eq("id", data.fornitore_preferito_id)
        .maybeSingle();

      fornitore = fornitorePreferito?.ragione_sociale || fornitorePreferito?.nome || "—";
    }

    if (fornitore === "—") {
      const { data: mapping, error: mappingError } = await window.supabaseClient
        .from("prodotti_fornitore")
        .select("fornitori:fornitore_id (ragione_sociale, nome)")
        .eq("prodotto_id", prodottoId)
        .limit(1)
        .maybeSingle();

      if (mappingError) {
        console.error(mappingError);
      }

      fornitore = mapping?.fornitori?.ragione_sociale || mapping?.fornitori?.nome || "—";
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
            <div class="rf-product-value">${escapeHtml(fornitore || "—")}</div>
          </div>

          <div class="rf-product-field">
            <span class="rf-product-label">Giacenza</span>
            <div class="rf-product-value">${formatNumber(giacenza)}</div>
          </div>

          <div class="rf-product-field">
            <span class="rf-product-label">Scorta minima</span>
            <div class="rf-product-value">${formatNumber(data.scorta_minima)}</div>
          </div>

          <div class="rf-product-field">
            <span class="rf-product-label">💰 Costo medio</span>
            <div class="rf-product-value">${data.costo_medio != null ? "€ " + formatNumber(data.costo_medio) + (data.um_costo ? " / " + escapeHtml(data.um_costo) : "") : "—"}</div>
          </div>

          <div class="rf-product-field">
            <span class="rf-product-label">Costo ultimo</span>
            <div class="rf-product-value">${data.costo_ultimo != null ? "€ " + formatNumber(data.costo_ultimo) : "—"}</div>
          </div>

          ${data.contenuto_confezione ? `
          <div class="rf-product-field">
            <span class="rf-product-label">Confezione</span>
            <div class="rf-product-value">${formatNumber(data.contenuto_confezione)} ${escapeHtml(data.um_confezione || "")} / ${escapeHtml(data.um_costo || "pz")}</div>
          </div>` : ""}
        </div>

        ${prodotto.alias_ocr?.length ? `
        <div style="margin-top:8px;font-size:12px;color:#6b7280;">
          🔍 Alias OCR: ${escapeHtml((prodotto.alias_ocr || []).join(", "))}
        </div>` : ""}

        ${(() => {
          const haB = !!prodotto.categoria_bilancio_id;
          const haI = !!(prodotto.categoria_interna && String(prodotto.categoria_interna).trim());
          const nomeB = haB ? (catBilancio_cache.find(c => String(c.id) === String(prodotto.categoria_bilancio_id))?.nome || "impostata") : null;
          if (haB && haI) {
            return `<div style="margin-top:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 10px;font-size:12px;color:#166534;">
              🟢 Categorie complete — Bilancio: <b>${escapeHtml(nomeB)}</b> · Interna: <b>${escapeHtml(prodotto.categoria_interna)}</b>
            </div>`;
          }
          const mancanti = [];
          if (!haB) mancanti.push("categoria di bilancio");
          if (!haI) mancanti.push("categoria interna");
          const colore = (!haB && !haI) ? "#dc2626" : "#f59e0b";
          const sfondo = (!haB && !haI) ? "#fef2f2" : "#fffbeb";
          const bordo = (!haB && !haI) ? "#fca5a5" : "#fcd34d";
          const pallino = (!haB && !haI) ? "🔴" : "🟡";
          return `<div style="margin-top:10px;background:${sfondo};border:1px solid ${bordo};border-radius:8px;padding:8px 10px;font-size:12px;color:${colore};font-weight:600;">
            ${pallino} Da completare: manca ${mancanti.join(" e ")}. Premi <b>Modifica</b> per assegnarle.
          </div>`;
        })()}

        <div class="rf-product-section-title">Ultimi movimenti</div>

        <div class="rf-mov-list">
          ${(movimenti || []).length
            ? movimenti.slice(0, 5).map((m) => `
              <div class="rf-mov-item">
                <div class="rf-mov-main">${escapeHtml(m.tipo_movimento || "—")} · ${formatNumber(m.quantita)}</div>
                <div class="rf-mov-meta">${formatDateTime(m.created_at)}${m.causale ? " · " + escapeHtml(m.causale) : ""}</div>
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
        renderEditForm({
          ...data,
          fornitore_preferito_id: prodotto.fornitore_preferito_id,
          quantita_riordino: prodotto.quantita_riordino,
          categoria_bilancio_id: prodotto.categoria_bilancio_id,
          categoria_interna: prodotto.categoria_interna
        }, fornitore || "—");
      };
    }
  }


  function renderEditForm(prodotto, fornitoreNome) {
    const fornitoriOptions = fornitori_cache.map(f =>
      `<option value="${f.id}" ${String(f.id) === String(prodotto.fornitore_preferito_id || "") ? "selected" : ""}>${escapeHtml(f.ragione_sociale)}</option>`
    ).join("");

    scheda.innerHTML = `
      <div class="rf-product-card">
        <div class="rf-product-section-title">✏️ Modifica prodotto</div>

        <div class="rf-field">
          <label>Codice interno</label>
          <input id="edit-mp-codice" class="input" value="${escapeAttr(prodotto.codice_interno || "")}" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Nome / Descrizione</label>
          <input id="edit-mp-descrizione" class="input" value="${escapeAttr(prodotto.descrizione || prodotto.nome || "")}" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Unità di misura</label>
          <input id="edit-mp-um" class="input" value="${escapeAttr(prodotto.unita_base || "")}" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>💰 Costo acquisto (€)</label>
          <input id="edit-mp-costo" type="number" step="0.0001" min="0" class="input" value="${escapeAttr(prodotto.costo_medio ?? "")}" placeholder="es. 17.50" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Costo riferito a</label>
          <select id="edit-mp-um-costo" class="input">
            ${["kg","gr","lt","ml","pz"].map(u => `<option value="${u}"${(prodotto.um_costo || "") === u ? " selected" : ""}>${u}</option>`).join("")}
          </select>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">Se il costo è a confezione/pezzo scegli "pz" e compila il contenuto sotto.</div>
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Contenuto confezione (se "pz")</label>
          <div style="display:flex;gap:8px;">
            <input id="edit-mp-contenuto" type="number" step="0.001" min="0" class="input" value="${escapeAttr(prodotto.contenuto_confezione ?? "")}" placeholder="es. 25" style="flex:2;" />
            <select id="edit-mp-um-conf" class="input" style="flex:1;">
              ${["", "gr", "kg", "ml", "lt"].map(u => `<option value="${u}"${(prodotto.um_confezione || "") === u ? " selected" : ""}>${u || "—"}</option>`).join("")}
            </select>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">Es. tartufo: 1 pz = 25 gr → costo "pz", contenuto 25, um gr. Così il costo/kg è calcolato giusto.</div>
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Scorta minima</label>
          <input id="edit-mp-scorta" type="number" step="0.001" min="0" class="input" value="${escapeAttr(prodotto.scorta_minima ?? "")}" placeholder="es. 5" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Quantità riordino</label>
          <input id="edit-mp-riordino" type="number" step="0.001" min="0" class="input" value="${escapeAttr(prodotto.quantita_riordino ?? "")}" placeholder="es. 20" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Fornitore preferito</label>
          <select id="edit-mp-fornitore" class="input">
            <option value="">-- Seleziona fornitore --</option>
            ${fornitoriOptions}
          </select>
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>📊 Categoria di bilancio ${!prodotto.categoria_bilancio_id ? '<span style="color:#dc2626;font-weight:700;">• da assegnare</span>' : ''}</label>
          <select id="edit-mp-cat-bilancio" class="input">
            <option value="">-- Seleziona categoria bilancio --</option>
            ${catBilancio_cache.map(c => `<option value="${c.id}" ${String(c.id) === String(prodotto.categoria_bilancio_id || "") ? "selected" : ""}>${escapeHtml(c.nome)}</option>`).join("")}
          </select>
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>🍽️ Categoria interna ${!(prodotto.categoria_interna || "").trim() ? '<span style="color:#dc2626;font-weight:700;">• da assegnare</span>' : ''}</label>
          <input id="edit-mp-cat-interna" class="input" list="mp-cat-interne-list" value="${escapeAttr((prodotto.categoria_interna || "").trim())}" placeholder="Carni, Pesce, Farinacei, Verdure..." />
          <datalist id="mp-cat-interne-list">
            ${catInterne_cache.map(c => `<option value="${escapeAttr(c)}"></option>`).join("")}
          </datalist>
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Alias OCR <span style="font-size:11px;color:#6b7280;">(termini alternativi per match fattura, separati da virgola)</span></label>
          <input id="edit-mp-alias" class="input" 
            value="${escapeAttr((prodotto.alias_ocr || []).join(", "))}" 
            placeholder="es. farina 00 spadoni, farina 00 petra, farina bianca" />
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:8px 10px;font-size:12px;color:#92400e;margin-top:6px;">
            📌 Aggiungi tutti i nomi con cui questo prodotto compare nelle fatture — il sistema userà questi termini per riconoscerlo automaticamente.
          </div>
        </div>

        <div id="mp-esito" style="margin-top:10px; font-size:13px; min-height:16px;"></div>

        <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
          <button id="btn-salva-mp" class="app-button tiny">💾 Salva</button>
          <button id="btn-annulla-mp" class="app-button tiny gray">Annulla</button>
        </div>
      </div>
    `;

    scheda.querySelector("#btn-annulla-mp").onclick = () => openScheda(prodotto.prodotto_id);

    scheda.querySelector("#btn-salva-mp").onclick = async () => {
      const esito = scheda.querySelector("#mp-esito");
      const codice = scheda.querySelector("#edit-mp-codice").value.trim();
      const descrizione = scheda.querySelector("#edit-mp-descrizione").value.trim();
      const unitaBase = scheda.querySelector("#edit-mp-um").value.trim();
      const scortaVal = scheda.querySelector("#edit-mp-scorta").value;
      const riordineVal = scheda.querySelector("#edit-mp-riordino").value;
      const fornitoreId = scheda.querySelector("#edit-mp-fornitore").value || null;
      const aliasVal = scheda.querySelector("#edit-mp-alias").value.trim();
      const catBilancio = scheda.querySelector("#edit-mp-cat-bilancio").value || null;
      const catInterna = scheda.querySelector("#edit-mp-cat-interna").value.trim() || null;
      const costoVal = scheda.querySelector("#edit-mp-costo").value;
      const umCosto = scheda.querySelector("#edit-mp-um-costo").value || null;
      const contenutoVal = scheda.querySelector("#edit-mp-contenuto").value;
      const umConf = scheda.querySelector("#edit-mp-um-conf").value || null;

      if (!descrizione) {
        esito.innerText = "❌ Inserisci il nome prodotto";
        esito.style.color = "#dc2626";
        return;
      }

      esito.innerText = "Salvataggio...";
      esito.style.color = "#6b7280";

      const { error } = await window.supabaseClient
        .from("prodotti")
        .update({
          codice_interno: codice || null,
          nome: descrizione,
          descrizione,
          unita_base: unitaBase || null,
          scorta_minima: scortaVal !== "" ? Number(scortaVal) : null,
          quantita_riordino: riordineVal !== "" ? Number(riordineVal) : null,
          fornitore_preferito_id: fornitoreId,
          alias_ocr: aliasVal ? aliasVal.split(",").map(a => a.trim().toLowerCase()).filter(Boolean) : [],
          categoria_bilancio_id: catBilancio ? Number(catBilancio) : null,
          categoria_interna: catInterna,
          costo_medio: costoVal !== "" ? Number(costoVal) : null,
          um_costo: umCosto,
          contenuto_confezione: contenutoVal !== "" ? Number(contenutoVal) : null,
          um_confezione: umConf,
        })
        .eq("id", prodotto.prodotto_id)
        .eq("azienda_id", azienda.id);

      if (error) {
        console.error(error);
        esito.innerText = "❌ Errore salvataggio";
        esito.style.color = "#dc2626";
        return;
      }

      esito.innerText = "✅ Salvato";
      esito.style.color = "#16a34a";
      setTimeout(() => openScheda(prodotto.prodotto_id), 700);
    };
  }

  // All'apertura mostro subito i prodotti da completare
  caricaDaCompletare();
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
