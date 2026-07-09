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
      .select("id, codice_interno, nome, descrizione, tipo_prodotto, unita_base, unita_misura, um, scorta_minima, quantita_riordino, fornitore_preferito_id, categoria_bilancio_id, categoria_interna")
      .eq("azienda_id", azienda?.id)
      .or(`descrizione.ilike.%${term}%,nome.ilike.%${term}%,codice_interno.ilike.%${term}%`)
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

    risultati.innerHTML = data.map(p => {
      const haBilancio = !!p.categoria_bilancio_id;
      const haInterna = !!(p.categoria_interna && String(p.categoria_interna).trim());
      let colore = "#22c55e", titolo = "Categorie complete";
      if (!haBilancio && !haInterna) { colore = "#dc2626"; titolo = "Mancano categoria bilancio e interna"; }
      else if (!haBilancio) { colore = "#f59e0b"; titolo = "Manca categoria di bilancio"; }
      else if (!haInterna) { colore = "#f59e0b"; titolo = "Manca categoria interna"; }
      return `
      <div class="rf-search-item">
        <span title="${titolo}" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${colore};flex-shrink:0;"></span>
        <div>${escapeHtml(p.codice_interno || "—")}</div>
        <div>${escapeHtml(p.descrizione || p.nome || "")}</div>
        <button data-id="${p.id}">Apri</button>
      </div>
    `;}).join("");

    risultati.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        apriSchedaProdotto(scheda, btn.dataset.id);
      };
    });
  });
}

async function apriSchedaProdotto(box, prodottoId) {
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  const { data: prodotto, error } = await window.db
    .from("prodotti")
    .select("id, azienda_id, codice_interno, nome, descrizione, tipo_prodotto, unita_base, unita_misura, um, scorta_minima, quantita_riordino, fornitore_preferito_id, attivo, categoria_bilancio_id, categoria_interna")
    .eq("azienda_id", aziendaId)
    .eq("id", prodottoId)
    .maybeSingle();

  if (error || !prodotto) {
    console.error(error);
    box.innerHTML = "Errore caricamento";
    return;
  }

  const { data: movimenti, error: movimentiError } = await window.db
    .from("magazzino_movimenti")
    .select("sede_id, tipo_movimento, quantita, created_at, causale")
    .eq("azienda_id", aziendaId)
    .eq("prodotto_id", prodottoId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (movimentiError) {
    console.error(movimentiError);
  }

  const movimentiFiltrati = sedeId
    ? (movimenti || []).filter(m => String(m.sede_id || sedeId) === String(sedeId))
    : (movimenti || []);

  const giacenza = movimentiFiltrati.reduce((sum, movimento) => {
    const q = Number(movimento?.quantita || 0);
    const tipo = String(movimento?.tipo_movimento || "").toLowerCase();
    return ["scarico", "consumo", "rettifica_negativa", "uscita"].includes(tipo) ? sum - q : sum + q;
  }, 0);

  let fornitore = "—";

  if (prodotto.fornitore_preferito_id) {
    const { data: f } = await window.db
      .from("fornitori")
      .select("ragione_sociale, nome")
      .eq("id", prodotto.fornitore_preferito_id)
      .maybeSingle();

    fornitore = f?.ragione_sociale || f?.nome || "—";
  }

  if (fornitore === "—") {
    const { data: mapping } = await window.db
      .from("prodotti_fornitore")
      .select("fornitori:fornitore_id (ragione_sociale, nome)")
      .eq("prodotto_id", prodottoId)
      .limit(1)
      .maybeSingle();

    fornitore = mapping?.fornitori?.ragione_sociale || mapping?.fornitori?.nome || "—";
  }

  const um = prodotto.unita_base || prodotto.unita_misura || prodotto.um || "—";
  const scorta = prodotto.scorta_minima ?? prodotto.quantita_riordino ?? 0;

  // Carica lista fornitori per select
  const { data: fornitori_list } = await window.db
    .from("fornitori")
    .select("id, ragione_sociale")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("ragione_sociale");

  const fornitoriOptions = (fornitori_list || []).map(f =>
    `<option value="${f.id}" ${String(f.id) === String(prodotto.fornitore_preferito_id) ? "selected" : ""}>${escapeHtml(f.ragione_sociale)}</option>`
  ).join("");

  // Categorie di bilancio (tabella categorie_bilancio) — solo costi
  const supaDir = window.supabaseClient || window.supabase;
  const { data: catBilancio } = await supaDir
    .from("categorie_bilancio")
    .select("id, nome, tipo")
    .order("nome");
  const catBilancioOptions = (catBilancio || [])
    .filter(c => c.tipo === "costo")
    .map(c => `<option value="${c.id}" ${String(c.id) === String(prodotto.categoria_bilancio_id) ? "selected" : ""}>${escapeHtml(c.nome)}</option>`)
    .join("");

  // Categorie interne — valori distinti già usati dall'azienda
  const { data: catInterneRows } = await supaDir
    .from("prodotti")
    .select("categoria_interna")
    .eq("azienda_id", aziendaId)
    .not("categoria_interna", "is", null);
  const catInterneSet = [...new Set((catInterneRows || [])
    .map(r => (r.categoria_interna || "").trim())
    .filter(Boolean))].sort();
  const catInterneOptions = catInterneSet
    .map(c => `<option value="${escapeHtml(c)}" ${c === (prodotto.categoria_interna || "").trim() ? "selected" : ""}>${escapeHtml(c)}</option>`)
    .join("");

  box.innerHTML = `
    <div class="rf-product-card">
      <div class="rf-product-heading">
        <div class="rf-product-code">${escapeHtml(prodotto.codice_interno || "—")}</div>
        <div class="rf-product-title">${escapeHtml(prodotto.descrizione || prodotto.nome || "")}</div>
      </div>

      <div class="rf-product-grid">
        <div class="rf-product-field">
          <span class="rf-product-label">UM</span>
          <div class="rf-product-value">${escapeHtml(um)}</div>
        </div>
        <div class="rf-product-field">
          <span class="rf-product-label">Giacenza attuale</span>
          <div class="rf-product-value">${formatNumber(giacenza)}</div>
        </div>
        <div class="rf-product-field">
          <span class="rf-product-label">Tipo</span>
          <div class="rf-product-value">${escapeHtml(prodotto.tipo_prodotto || "—")}</div>
        </div>
        <div class="rf-product-field">
          <span class="rf-product-label">Stato</span>
          <div class="rf-product-value">${prodotto.attivo === false ? "Non attivo" : "Attivo"}</div>
        </div>
      </div>

      <div class="rf-product-section-title" style="margin-top:14px;">✏️ Modifica scheda</div>
      <div class="rf-product-card" style="margin-top:8px;">

        <div class="rf-field">
          <label>Nome prodotto</label>
          <input id="edit-nome" class="input" value="${escapeHtml(prodotto.nome || prodotto.descrizione || "")}" />
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>Fornitore preferito</label>
          <select id="edit-fornitore" class="input">
            <option value="">-- Seleziona fornitore --</option>
            ${fornitoriOptions}
          </select>
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>📊 Categoria di bilancio ${!prodotto.categoria_bilancio_id ? '<span style="color:#dc2626;font-weight:700;">• da assegnare</span>' : ''}</label>
          <select id="edit-cat-bilancio" class="input">
            <option value="">-- Seleziona categoria bilancio --</option>
            ${catBilancioOptions}
          </select>
        </div>

        <div class="rf-field" style="margin-top:10px;">
          <label>🍽️ Categoria interna ${!(prodotto.categoria_interna || "").trim() ? '<span style="color:#dc2626;font-weight:700;">• da assegnare</span>' : ''}</label>
          <input id="edit-cat-interna" class="input" list="cat-interne-list" value="${escapeHtml((prodotto.categoria_interna || "").trim())}" placeholder="Carni, Pesce, Farinacei..." />
          <datalist id="cat-interne-list">${catInterneOptions}</datalist>
        </div>

        <div class="rf-product-grid" style="margin-top:10px;">
          <div class="rf-field">
            <label>Scorta minima</label>
            <input id="edit-scorta" type="number" class="input" value="${prodotto.scorta_minima ?? ""}" />
          </div>
          <div class="rf-field">
            <label>Q.tà riordino</label>
            <input id="edit-riordino" type="number" class="input" value="${prodotto.quantita_riordino ?? ""}" />
          </div>
        </div>

        <div id="edit-esito" style="font-size:13px;margin-top:8px;min-height:16px;"></div>

        <button id="btn-salva-prodotto" class="app-button tiny" style="margin-top:10px;width:100%;">
          💾 Salva modifiche
        </button>
      </div>

      <div class="rf-product-section-title" style="margin-top:16px;">Storico movimenti</div>
      <div class="rf-mov-list">
        ${(movimentiFiltrati || []).length
          ? movimentiFiltrati.map(m => `
            <div class="rf-mov-item">
              <div class="rf-mov-main">${escapeHtml(m.tipo_movimento || "—")} · ${formatNumber(m.quantita)}</div>
              <div class="rf-mov-meta">${formatDateTime(m.created_at)} ${m.causale ? "· " + escapeHtml(m.causale) : ""}</div>
            </div>
          `).join("")
          : `<div class="rf-empty-state">Nessun movimento registrato</div>`
        }
      </div>
    </div>
  `;

  // Binding salvataggio
  box.querySelector("#btn-salva-prodotto").onclick = async () => {
    const esito = box.querySelector("#edit-esito");
    const nome = box.querySelector("#edit-nome").value.trim();
    const fornitoreId = box.querySelector("#edit-fornitore").value || null;
    const scorta = box.querySelector("#edit-scorta").value;
    const riordino = box.querySelector("#edit-riordino").value;
    const catBilancio = box.querySelector("#edit-cat-bilancio").value || null;
    const catInterna = box.querySelector("#edit-cat-interna").value.trim() || null;

    if (!nome) { esito.textContent = "❌ Nome obbligatorio"; esito.style.color = "#dc2626"; return; }

    esito.textContent = "Salvataggio...";
    esito.style.color = "#6b7280";

    const { error } = await window.db
      .from("prodotti")
      .update({
        nome,
        descrizione: nome,
        fornitore_preferito_id: fornitoreId,
        scorta_minima: scorta ? Number(scorta) : null,
        quantita_riordino: riordino ? Number(riordino) : null,
        categoria_bilancio_id: catBilancio ? Number(catBilancio) : null,
        categoria_interna: catInterna,
      })
      .eq("id", prodottoId)
      .eq("azienda_id", aziendaId);

    if (error) {
      console.error(error);
      esito.textContent = "❌ Errore salvataggio";
      esito.style.color = "#dc2626";
    } else {
      esito.textContent = "✅ Salvato";
      esito.style.color = "#16a34a";
    }
  };
}

function formatNumber(value) {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("it-IT", { maximumFractionDigits: 3 });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("it-IT");
}


function escapeHtml(str) {
  return String(str || "").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
