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
    <div class="view">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <h2 style="margin-top:0;">Gestione Aziende</h2>
          <p class="small-muted" style="margin-top:4px;">
            Seleziona un’azienda per aprire la scheda e modificarla.
          </p>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="app-button small gray" type="button" id="btn-back-home">⬅ Dashboard</button>
          <button class="app-button small green" type="button" id="btn-go-crea">+ Crea azienda</button>
        </div>
      </div>

      <div style="margin-top:12px;">
        <label style="display:block; font-size:13px; margin-bottom:4px;">Cerca azienda</label>
        <input id="aziende-search" class="input-pill" placeholder="Nome / Codice / P.IVA / Email..." />
      </div>

      <div id="aziende-list" style="margin-top:12px; display:flex; flex-direction:column; gap:10px;"></div>
    </div>
  `;

  document.getElementById("btn-back-home").onclick = () => {
    window.location.hash = "#/home";
  };
  document.getElementById("btn-go-crea").onclick = () => {
    window.location.hash = "#/creaAzienda";
  };

  const search = document.getElementById("aziende-search");
  let cache = [];

  async function load() {
    const { data, error } = await supabase
      .from("aziende")
      .select(`
        id,
        nome,
        codice,
        stato,
        attiva,
        data_scadenza,
        email,
        referente,
        partita_iva,
        ragione_sociale
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore caricamento aziende:", error);
      document.getElementById("aziende-list").innerHTML = `
        <div class="kpi-card">
          <h3 style="margin:0;">Errore</h3>
          <p class="small-muted">Impossibile caricare le aziende.</p>
        </div>
      `;
      return;
    }

    cache = data || [];
    renderList(cache);
  }

  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }

  function fmtDate(d) {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("it-IT");
    } catch {
      return String(d);
    }
  }

  function statoBadge(az) {
    const s = az.stato || "attiva";
    const a = az.attiva !== false;

    if (!a) return `<span class="badge badge-red">disattiva</span>`;
    if (s === "sospesa") return `<span class="badge badge-orange">sospesa</span>`;
    if (s === "piattaforma") return `<span class="badge badge-blue">piattaforma</span>`;
    return `<span class="badge badge-green">attiva</span>`;
  }

  function renderList(rows) {
    const list = document.getElementById("aziende-list");

    if (!rows.length) {
      list.innerHTML = `
        <div class="kpi-card">
          <h3 style="margin:0;">Nessun risultato</h3>
          <p class="small-muted">Nessuna azienda trovata.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = rows
      .map((az) => {
        return `
          <div class="azienda-row-card">
            <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;">
              <div>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                  <strong style="font-size:15px;">${escapeHtml(az.nome || "—")}</strong>
                  ${statoBadge(az)}
                </div>

                <div class="small-muted" style="margin-top:4px;">
                  <div><strong>Codice:</strong> ${escapeHtml(az.codice || "—")}</div>
                  <div><strong>Email:</strong> ${escapeHtml(az.email || "—")}</div>
                  <div><strong>Referente:</strong> ${escapeHtml(az.referente || "—")}</div>
                  <div><strong>Scadenza:</strong> ${fmtDate(az.data_scadenza)}</div>
                </div>
              </div>

              <div style="display:flex; gap:8px;">
                <button class="app-button small" type="button" data-open="${az.id}">Apri scheda</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll("[data-open]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-open");
        window.location.hash = `#/modificaAzienda?id=${encodeURIComponent(id)}`;
      };
    });
  }

  search.addEventListener("input", () => {
    const q = norm(search.value);
    if (!q) return renderList(cache);

    const filtered = cache.filter((az) => {
      const hay = [
        az.nome,
        az.codice,
        az.email,
        az.referente,
        az.partita_iva,
        az.ragione_sociale,
      ]
        .map(norm)
        .join(" | ");

      return hay.includes(q);
    });

    renderList(filtered);
  });

  await load();
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
