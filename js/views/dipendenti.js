// js/views/dipendenti.js
// =======================================
// View Dipendenti – SaaS Multi-Azienda
// =======================================

export async function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento dipendenti</div>`;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <h2>Dipendenti</h2>
      <p class="small-muted">
        Gestione personale azienda
      </p>

      <form id="dipendente-form" onsubmit="return false;" style="margin-top:16px; display:flex; flex-direction:column; gap:10px;">

        <input type="hidden" id="dip-id" />

        <label>Nome
          <input type="text" id="dip-nome" class="input-pill" required />
        </label>

        <label>Mansione
          <input type="text" id="dip-mansione" class="input-pill" />
        </label>

        <label>Data nascita
          <input type="date" id="dip-data-nascita" class="input-pill" />
        </label>

        <label>Telefono
          <input type="text" id="dip-telefono" class="input-pill" />
        </label>

        <label>Email
          <input type="email" id="dip-email" class="input-pill" />
        </label>

        <label>Ruolo
          <select id="dip-ruolo" class="input-pill">
            <option value="admin">Admin</option>
            <option value="segreteria">Segreteria</option>
            <option value="manager_cucina">Manager cucina</option>
            <option value="manager_sala">Manager sala</option>
            <option value="addetto_cucina">Addetto cucina</option>
            <option value="cameriere">Cameriere</option>
          </select>
        </label>

        <label>Tipo compenso
          <select id="dip-tipo-compenso" class="input-pill">
            <option value="orario">A ore</option>
            <option value="mensile">Mensile</option>
            <option value="servizio">Per servizio</option>
          </select>
        </label>

        <label>Retribuzione base
          <input type="number" step="0.01" id="dip-retribuzione-base" class="input-pill" />
        </label>

        <label>Ore mensili contrattuali
          <input type="number" step="0.1" id="dip-ore-mensili" class="input-pill" />
        </label>

        <label>Ore medie per servizio
          <input type="number" step="0.1" id="dip-ore-servizio" class="input-pill" />
        </label>

        <label>Costo orario calcolato
          <input type="number" step="0.01" id="dip-costo" class="input-pill" readonly />
        </label>

        <label>PIN
          <input type="text" id="dip-codice" maxlength="10" class="input-pill" />
        </label>

        <label>Canale prevalente
          <select id="dip-canale" class="input-pill">
            <option value="NR">NR</option>
            <option value="RA">RA</option>
            <option value="CC">CC</option>
            <option value="CAT">Catering</option>
          </select>
        </label>

        <label>
          <input type="checkbox" id="dip-attivo" checked />
          Attivo
        </label>

        <button id="btn-salva-dip" class="app-button small green">
          Salva dipendente
        </button>

      </form>

      <h3 style="margin-top:24px;">Elenco dipendenti</h3>

      <div class="table-wrapper">
        <table class="table-timbrature">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Ruolo</th>
              <th>Costo orario</th>
              <th>Attivo</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="dipendenti-lista"></tbody>
        </table>
      </div>

    </div>
  `;

  setupEventHandlers();
  await caricaDipendenti();
}

function setupEventHandlers() {
  document
    .getElementById("btn-salva-dip")
    .addEventListener("click", salvaDipendente);

  document
    .getElementById("dip-tipo-compenso")
    .addEventListener("change", calcolaCosto);

  document
    .getElementById("dip-retribuzione-base")
    .addEventListener("input", calcolaCosto);

  document
    .getElementById("dip-ore-mensili")
    .addEventListener("input", calcolaCosto);

  document
    .getElementById("dip-ore-servizio")
    .addEventListener("input", calcolaCosto);
}

function calcolaCosto() {
  const tipo = document.getElementById("dip-tipo-compenso").value;
  const base = parseFloat(document.getElementById("dip-retribuzione-base").value) || 0;
  const oreMensili = parseFloat(document.getElementById("dip-ore-mensili").value) || 0;
  const oreServizio = parseFloat(document.getElementById("dip-ore-servizio").value) || 0;

  let costo = 0;

  if (tipo === "orario") {
    costo = base;
  } else if (tipo === "mensile" && oreMensili > 0) {
    costo = base / oreMensili;
  } else if (tipo === "servizio" && oreServizio > 0) {
    costo = base / oreServizio;
  }

  document.getElementById("dip-costo").value = costo.toFixed(2);
}

async function salvaDipendente() {
  const azienda = window.state.azienda;

  const payload = {
    azienda_id: azienda.id,
    nome: document.getElementById("dip-nome").value,
    mansione: document.getElementById("dip-mansione").value,
    data_nascita: document.getElementById("dip-data-nascita").value || null,
    telefono: document.getElementById("dip-telefono").value,
    email: document.getElementById("dip-email").value,
    ruolo: document.getElementById("dip-ruolo").value,
    tipo_compenso: document.getElementById("dip-tipo-compenso").value,
    retribuzione_base: parseFloat(document.getElementById("dip-retribuzione-base").value) || null,
    ore_mensili_contrattuali: parseFloat(document.getElementById("dip-ore-mensili").value) || null,
    ore_medie_per_servizio: parseFloat(document.getElementById("dip-ore-servizio").value) || null,
    costo_orario: parseFloat(document.getElementById("dip-costo").value) || null,
    codice: document.getElementById("dip-codice").value,
    canale_prevalente: document.getElementById("dip-canale").value,
    attivo: document.getElementById("dip-attivo").checked
  };

  const { error } = await window.supabaseClient
    .from("dipendenti")
    .insert(payload);

  if (error) {
    alert("Errore salvataggio");
    console.error(error);
    return;
  }

  document.getElementById("dipendente-form").reset();
  await caricaDipendenti();
}

async function caricaDipendenti() {
  const azienda = window.state.azienda;

  const { data, error } = await window.supabaseClient
    .from("dipendenti")
    .select("*")
    .eq("azienda_id", azienda.id)
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.getElementById("dipendenti-lista");
  tbody.innerHTML = "";

  data.forEach(d => {
    tbody.innerHTML += `
      <tr>
        <td>${d.nome}</td>
        <td>${d.ruolo || "-"}</td>
        <td>${d.costo_orario ? d.costo_orario.toFixed(2) : "-"}</td>
        <td>${d.attivo ? "✔" : "❌"}</td>
        <td>
          <button 
            class="app-button tiny red"
            onclick="eliminaDipendente('${d.id}')"
          >
            Elimina
          </button>
        </td>
      </tr>
    `;
  });
}

window.eliminaDipendente = async function (id) {
  if (!confirm("Eliminare dipendente?")) return;

  const { error } = await window.supabaseClient
    .from("dipendenti")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  await caricaDipendenti();
};
