import { supabase } from "../supabaseClient.js";

export async function render(container) {
  const azienda = window.state?.azienda;
  const mode = window.routeParams?.mode || "select";

  if (!azienda?.id) {
    container.innerHTML = `
      <div class="view" style="padding:40px; text-align:center;">
        <h2 style="color:#dc2626;">Contesto mancante</h2>
        <p>Nessuna azienda attiva.</p>
        <button id="btn-home" style="margin-top:18px; padding:10px 14px; border-radius:12px; border:none; background:#0E5A7A; color:white; font-weight:600; cursor:pointer;">
          Vai a scelta azienda
        </button>
      </div>
    `;
    const b = document.getElementById("btn-home");
    if (b) b.onclick = () => (window.location.hash = "#/sceltaAzienda");
    return;
  }

  const sedi = await caricaSedi(azienda.id);

  if (window.stateActions?.setSedi) {
    window.stateActions.setSedi(sedi);
  } else {
    window.state.sedi = sedi;
  }

  // 🔥 NUOVO: limite piano
  const sediMax = azienda?.sedi_max || 1;
  const sediUsate = sedi.length;
  const canCreate = sediUsate < sediMax;

  if ((sedi || []).length === 0 || mode === "first") {
    renderWizardPrimaSede(container, azienda.id);
    return;
  }

  if ((sedi || []).length === 1 && mode !== "manage") {
    localStorage.setItem("active_sede_id", String(sedi[0].id));
    window.location.hash = "#/home";
    return;
  }

  renderSelezioneSede(container, sedi, { sediMax, sediUsate, canCreate });
}

async function caricaSedi(aziendaId) {
  const { data, error } = await supabase
    .from("sedi")
    .select("id, nome, indirizzo, latitudine, longitudine")
    .eq("azienda_id", aziendaId)
    .order("nome", { ascending: true });

  if (error) {
    console.error("Errore caricamento sedi:", error);
    return [];
  }

  return data || [];
}

function renderWizardPrimaSede(container, aziendaId) {
  container.innerHTML = `
    <div class="view" style="padding:24px; max-width:760px; margin:0 auto;">
      <h2 style="margin:0 0 8px 0;">Crea una sede</h2>
      <p style="margin:0 0 18px 0; opacity:0.7;">
        Inserisci i dati della sede.
      </p>

      <div style="background:white; border:1px solid #e5e7eb; border-radius:18px; padding:16px;">
        <div style="display:grid; gap:12px;">
          <div>
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Nome sede</label>
            <input id="sede-nome" placeholder="Es. Sede Centrale" style="width:100%; padding:12px 12px; border-radius:12px; border:1px solid #e5e7eb; font-size:15px;" />
          </div>

          <div>
            <label style="display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px;">Indirizzo (opzionale)</label>
            <input id="sede-indirizzo" placeholder="Es. Via Roma 10, Milano" style="width:100%; padding:12px 12px; border-radius:12px; border:1px solid #e5e7eb; font-size:15px;" />
          </div>

          <button id="btn-crea" style="margin-top:6px; padding:12px 14px; border-radius:12px; border:none; background:#0E5A7A; color:white; font-weight:700; cursor:pointer;">
            Salva sede
          </button>

          <div id="err" style="color:#dc2626; font-size:13px;"></div>

          <button id="btn-back" style="margin-top:4px; padding:10px 14px; border-radius:12px; border:1px solid #e5e7eb; background:white; color:#111827; font-weight:600; cursor:pointer;">
            ← Torna indietro
          </button>
        </div>
      </div>
    </div>
  `;

  const btn = document.getElementById("btn-crea");
  const err = document.getElementById("err");
  const backBtn = document.getElementById("btn-back");

  if (backBtn) {
    backBtn.onclick = () => {
      window.location.hash = "#/gestione-sedi";
    };
  }

  if (btn) {
    btn.onclick = async () => {
      err.textContent = "";

      const nome = document.getElementById("sede-nome").value.trim();
      const indirizzo = document.getElementById("sede-indirizzo").value.trim();

      if (!nome) {
        err.textContent = "Inserisci il nome della sede.";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Salvataggio...";

      const payload = {
        azienda_id: aziendaId,
        nome,
        indirizzo: indirizzo || null,
      };

      const { data, error } = await supabase.functions.invoke("create-sede", {
        body: payload
      });

      if (error || !data?.data?.id) {
        console.error("Errore creazione sede:", error, data);
        err.textContent = data?.error || "Errore creazione sede.";
        btn.disabled = false;
        btn.textContent = "Salva sede";
        return;
      }

      localStorage.setItem("active_sede_id", String(data.data.id));
      window.location.hash = "#/gestione-sedi";
    };
  }
}

function renderSelezioneSede(container, sedi, config) {

  const { sediMax, sediUsate, canCreate } = config;

  container.innerHTML = `
    <div class="view" style="padding:24px; max-width:980px; margin:0 auto;">
      <h2 style="margin:0 0 8px 0;">Seleziona sede</h2>

      <!-- 🔥 CONTATORE -->
      <div style="margin-bottom:14px; font-size:13px; color:#6b7280;">
        ${sediUsate} / ${sediMax} sedi utilizzate
      </div>

      <div style="
        display:grid;
        gap:14px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      ">
        ${(sedi || [])
          .map(
            (s) => `
              <button
                data-sede-id="${s.id}"
                style="
                  text-align:left;
                  background:white;
                  border:1px solid #e5e7eb;
                  border-radius:18px;
                  padding:16px;
                  cursor:pointer;
                "
              >
                <div style="font-weight:700;">
                  ${escapeHtml(s.nome)}
                </div>
                <div style="font-size:13px; opacity:0.7;">
                  ${escapeHtml(s.indirizzo || "")}
                </div>
              </button>
            `
          )
          .join("")}
      </div>

      <div style="margin-top:20px;">
        <button id="btn-new-sede" 
          style="
            width:100%;
            padding:12px;
            border-radius:12px;
            font-weight:600;
            ${canCreate ? "background:#111827;color:white;" : "background:#e5e7eb;color:#9ca3af;cursor:not-allowed;"}
          "
          ${canCreate ? "" : "disabled"}
        >
          ${canCreate ? "+ Nuova sede" : "Limite sedi raggiunto"}
        </button>
      </div>

    </div>
  `;

  container.querySelectorAll("[data-sede-id]").forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-sede-id");
      localStorage.setItem("active_sede_id", id);
      window.location.hash = "#/home";
    };
  });

  const newBtn = document.getElementById("btn-new-sede");
  if (newBtn && canCreate) {
    newBtn.onclick = () => {
      window.location.hash = "#/gestione-sedi?mode=first";
    };
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
