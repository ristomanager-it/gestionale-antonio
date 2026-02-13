// js/views/gestione-aziende.js
import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = `
      <div class="login-wrapper">
        <div class="login-card">
          <h3>Accesso negato</h3>
          <p>Sezione riservata alla piattaforma.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <h2>Gestione Aziende</h2>
        <div id="aziende-container"></div>
      </div>
    </div>
  `;

  await caricaAziende();
}

async function caricaAziende() {
  const container = document.getElementById("aziende-container");

  const { data, error } = await supabase
    .from("aziende")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p>Errore caricamento aziende</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p>Nessuna azienda presente</p>`;
    return;
  }

  container.innerHTML = data.map((az) => `
    <div class="azienda-card" data-id="${az.id}">
      
      <label>Nome</label>
      <input class="az-nome input-pill" value="${az.nome}" disabled />

      <label>Codice</label>
      <input class="az-codice input-pill" value="${az.codice}" disabled />

      <label>Stato</label>
      <select class="az-stato input-pill" disabled>
        <option value="attiva" ${az.stato === "attiva" ? "selected" : ""}>Attiva</option>
        <option value="sospesa" ${az.stato === "sospesa" ? "selected" : ""}>Sospesa</option>
      </select>

      <label>Data scadenza</label>
      <input type="date" class="az-scadenza input-pill"
        value="${az.data_scadenza || ""}" disabled />

      <label class="checkbox-row">
        <input type="checkbox" class="az-attiva"
          ${az.attiva ? "checked" : ""} disabled />
        Attiva
      </label>

      <div class="azienda-actions">
        <button class="app-button tiny edit-btn">Modifica</button>
        <button class="app-button tiny green save-btn hidden">Salva</button>
      </div>

      <hr />
    </div>
  `).join("");

  attivaEventi();
}

function attivaEventi() {
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".azienda-card");

      card.querySelectorAll("input, select").forEach(el => {
        el.disabled = false;
      });

      card.querySelector(".save-btn").classList.remove("hidden");
      e.target.classList.add("hidden");
    });
  });

  document.querySelectorAll(".save-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const card = e.target.closest(".azienda-card");
      const id = card.dataset.id;

      const nome = card.querySelector(".az-nome").value.trim();
      const codice = card.querySelector(".az-codice").value.trim();
      const stato = card.querySelector(".az-stato").value;
      const data_scadenza =
        card.querySelector(".az-scadenza").value || null;
      const attiva =
        card.querySelector(".az-attiva").checked;

      await supabase
        .from("aziende")
        .update({
          nome,
          codice,
          stato,
          data_scadenza,
          attiva,
        })
        .eq("id", id);

      await caricaAziende();
    });
  });
}
