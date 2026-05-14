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
      .select("id, codice_interno, nome, descrizione, tipo_prodotto, unita_base, unita_misura, um, scorta_minima, quantita_riordino, fornitore_preferito_id")
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

    risultati.innerHTML = data.map(p => `
      <div class="rf-search-item">
        <div>${escapeHtml(p.codice_interno || "—")}</div>
        <div>${escapeHtml(p.descrizione || p.nome || "")}</div>
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
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  const { data: prodotto, error } = await window.db
    .from("prodotti")
    .select("id, azienda_id, codice_interno, nome, descrizione, tipo_prodotto, unita_base, unita_misura, um, scorta_minima, quantita_riordino, fornitore_preferito_id, attivo")
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
          <span class="rf-product-label">Fornitore preferito</span>
          <div class="rf-product-value">${escapeHtml(fornitore)}</div>
        </div>
        <div class="rf-product-field">
          <span class="rf-product-label">Giacenza attuale</span>
          <div class="rf-product-value">${formatNumber(giacenza)}</div>
        </div>
        <div class="rf-product-field">
          <span class="rf-product-label">Scorta minima</span>
          <div class="rf-product-value">${formatNumber(scorta)}</div>
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

      <div class="rf-product-section-title">Storico movimenti</div>
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
