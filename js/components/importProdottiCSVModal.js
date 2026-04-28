export function openImportProdottiCSVModal({ onComplete } = {}) {

  const supabase = window.supabaseClient;
  const azienda_id = window.state?.azienda?.id;

  if (!azienda_id) {
    alert("Azienda non trovata");
    return;
  }

  document.querySelectorAll(".modal-overlay").forEach(m => m.remove());

  const modal = document.createElement("div");
  modal.style = `
    position:fixed; inset:0; background:rgba(0,0,0,0.5);
    display:flex; align-items:center; justify-content:center;
    z-index:9999;
  `;

  modal.innerHTML = `
    <div style="background:white; padding:20px; border-radius:12px; width:520px;">
      <h3>📥 Import prodotti + categorie (CSV)</h3>

      <input type="file" id="csv-file" class="input" accept=".csv">

      <div id="csv-preview" style="
        margin-top:10px; max-height:200px; overflow:auto;
        font-size:12px; background:#f8fafc; padding:8px; border-radius:8px;
      "></div>

      <div style="margin-top:12px; display:flex; gap:8px;">
        <button id="btn-parse" class="app-button">Analizza</button>
        <button id="btn-import" class="app-button primary">Importa</button>
        <button id="btn-close" class="app-button">Chiudi</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  let rows = [];

  const qs = s => modal.querySelector(s);

  qs("#btn-close").onclick = () => modal.remove();
  modal.firstElementChild.onclick = e => e.stopPropagation();
  modal.onclick = () => modal.remove();

  qs("#btn-parse").onclick = parseCSV;
  qs("#btn-import").onclick = importAll;

  function parseCSV() {
    const file = qs("#csv-file").files?.[0];
    if (!file) return alert("Seleziona file");

    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;

      rows = text.split("\n")
        .map(r => r.trim())
        .filter(Boolean)
        .map(r => {
          const [categoria, prodotto, descrizione, prezzo, iva] = r.split(",");
          return {
            categoria: (categoria || "").trim(),
            nome: (prodotto || "").trim(),
            descrizione: (descrizione || "").trim(),
            prezzo: Number(prezzo || 0),
            iva: Number(iva || 10)
          };
        })
        .filter(r => r.nome);

      renderPreview();
    };

    reader.readAsText(file);
  }

  function renderPreview() {
    qs("#csv-preview").innerHTML = rows.slice(0, 50).map(r => `
      <div>
        <strong>${escapeHtml(r.nome)}</strong> →
        ${escapeHtml(r.categoria)}
      </div>
    `).join("");
  }

  async function importAll() {

    if (!rows.length) {
      alert("Nessun dato");
      return;
    }

    // 1. carica categorie esistenti
    const { data: catDB } = await supabase
      .from("categorie_vendita")
      .select("id, nome")
      .eq("azienda_id", azienda_id);

    const catMap = {};
    (catDB || []).forEach(c => {
      catMap[normalize(c.nome)] = c.id;
    });

    // 2. crea categorie mancanti
    for (const r of rows) {
      const key = normalize(r.categoria);
      if (!key) continue;

      if (!catMap[key]) {
        const { data, error } = await supabase
          .from("categorie_vendita")
          .insert({
            azienda_id,
            nome: r.categoria,
            attivo: true
          })
          .select("id")
          .single();

        if (!error && data) {
          catMap[key] = data.id;
        }
      }
    }

    // 3. prodotti esistenti
    const { data: prodDB } = await supabase
      .from("prodotti_vendita")
      .select("id, nome")
      .eq("azienda_id", azienda_id);

    const prodSet = new Set(
      (prodDB || []).map(p => normalize(p.nome))
    );

    let creati = 0;

    // 4. crea prodotti
    for (const r of rows) {

      const nomeKey = normalize(r.nome);
      if (prodSet.has(nomeKey)) continue;

      const categoriaId = catMap[normalize(r.categoria)] || null;

      const { data: prodotto } = await supabase
        .from("prodotti_vendita")
        .insert({
          azienda_id,
          nome: r.nome,
          descrizione: r.descrizione || null,
          categoria_vendita_id: categoriaId,
          prezzo_base: r.prezzo || 0,
          iva: r.iva || 10,
          stato: "bozza",
          attivo: true
        })
        .select()
        .single();

      if (!prodotto) continue;

      // 5. crea ricetta minima
      const { data: ricetta } = await supabase
        .from("ricette")
        .insert({
          azienda_id,
          nome: r.nome,
          stato_strutturale: "bozza",
          generata_automaticamente: true,
          origine: "import_csv",
          prodotto_vendita_id: prodotto.id,
          attivo: true
        })
        .select("id")
        .single();

      if (ricetta?.id) {
        await supabase
          .from("prodotti_vendita")
          .update({ ricetta_id: ricetta.id })
          .eq("id", prodotto.id);
      }

      creati++;
    }

    alert(`Import completato: ${creati} prodotti creati`);

    modal.remove();
    if (onComplete) onComplete();
  }

  function normalize(s) {
    return String(s || "").toLowerCase().trim();
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }
}
