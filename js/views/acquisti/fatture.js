import { escapeHtml } from "./utils.js";

export async function renderFatture(container, azienda) {

  const supabase = window.supabaseClient;

  container.innerHTML = `
  <div class="card">

    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3>Fatture acquisto</h3>

      <div style="display:flex; gap:8px;">
        <button id="btn-carica-fattura" class="btn-primary">
          Carica documento
        </button>
      </div>
    </div>

    <div style="display:flex; gap:12px; margin-top:16px; flex-wrap:wrap">

      <input id="filter-numero" class="input" placeholder="Numero fattura">

      <input id="filter-fornitore" class="input" placeholder="Fornitore">

      <input id="filter-data-da" type="date" class="input">

      <input id="filter-data-a" type="date" class="input">

      <button id="btn-cerca" class="btn-secondary">
        Cerca
      </button>

    </div>

  </div>

  <div class="card">

    <table class="app-table" style="margin-top:16px">

      <thead>
        <tr>
          <th>Numero</th>
          <th>Data</th>
          <th>Fornitore</th>
          <th>Totale</th>
          <th>Stato</th>
        </tr>
      </thead>

      <tbody id="fatture-body"></tbody>

    </table>

  </div>
  `;

  const body = document.getElementById("fatture-body");

  async function loadFatture(filters = {}) {

    let query = supabase
      .from("fatture_acquisto")
      .select(`
        id,
        numero_documento,
        data_documento,
        totale,
        stato,
        fornitori:fornitore_id (
          ragione_sociale
        )
      `)
      .eq("azienda_id", azienda.id)
      .order("data_documento", { ascending: false });

    if (filters.numero) {
      query = query.ilike("numero_documento", `%${filters.numero}%`);
    }

    if (filters.data_da) {
      query = query.gte("data_documento", filters.data_da);
    }

    if (filters.data_a) {
      query = query.lte("data_documento", filters.data_a);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      body.innerHTML = `<tr><td colspan="5">Errore caricamento</td></tr>`;
      return;
    }

    body.innerHTML = (data || []).map(f => `
      <tr>
        <td>${escapeHtml(f.numero_documento || "")}</td>
        <td>${f.data_documento || ""}</td>
        <td>${escapeHtml(f.fornitori?.ragione_sociale || "")}</td>
        <td>${f.totale || 0}</td>
        <td>${escapeHtml(f.stato || "")}</td>
      </tr>
    `).join("");
  }

  await loadFatture();

  document.getElementById("btn-cerca").onclick = () => {

    const filters = {
      numero: document.getElementById("filter-numero").value,
      fornitore: document.getElementById("filter-fornitore").value,
      data_da: document.getElementById("filter-data-da").value,
      data_a: document.getElementById("filter-data-a").value
    };

    loadFatture(filters);
  };

  document.getElementById("btn-carica-fattura").onclick = () => {
    openUploadDocumento(azienda);
  };

}

function openUploadDocumento(azienda) {

  const modal = document.createElement("div");

  modal.innerHTML = `
  <div class="modal-back">

    <div class="modal">

      <h3>Carica documento</h3>

      <select id="tipo-doc" class="input">
        <option value="fattura">Fattura</option>
        <option value="ddt">DDT</option>
      </select>

      <input type="file" id="file-doc" class="input">

      <div style="margin-top:16px; display:flex; gap:8px;">
        <button id="btn-upload-doc" class="btn-primary">Carica</button>
        <button id="btn-close-modal" class="btn-secondary">Chiudi</button>
      </div>

    </div>

  </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("btn-close-modal").onclick = () => modal.remove();

  document.getElementById("btn-upload-doc").onclick = async () => {

    const file = document.getElementById("file-doc").files[0];
    const tipo = document.getElementById("tipo-doc").value;

    if (!file) return;

    const fileName = `${azienda.id}_${Date.now()}_${file.name}`;

    const { error } = await window.supabaseClient
      .storage
      .from("fatture")
      .upload(fileName, file);

    if (error) {
      alert("Errore upload");
      console.error(error);
      return;
    }

    const { data } = window.supabaseClient
      .storage
      .from("fatture")
      .getPublicUrl(fileName);

    const imageUrl = data.publicUrl;

    if (tipo === "fattura") {

      const res = await fetch("/functions/v1/ocr-fattura", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ imageUrl })
      });

      const ocr = await res.json();

      console.log("OCR result", ocr);

      alert("OCR completato — controlla console");

    }

    modal.remove();

  };

}
