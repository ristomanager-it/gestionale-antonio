// js/views/gestione-piani.js
import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {
  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({
        body: `<p>Sezione riservata alla piattaforma.</p>`,
      }),
    });
    return;
  }

  const content = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
      <div>
        <div style="font-size:14px; color:#6b7280;">SaaS</div>
        <div style="margin-top:4px; font-weight:800; font-size:18px;">Piani abbonamento</div>
        <div style="margin-top:6px; font-size:13px; color:#6b7280;">
          Gestisci prezzi e limiti sedi. (Feature per piano: da abilitare con colonna features)
        </div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="app-button green" id="btn-nuovo-piano">➕ Nuovo Piano</button>
        <button class="app-button small gray" id="btn-home">⬅ Dashboard</button>
      </div>
    </div>

    <div id="piani-list" style="margin-top:16px;"></div>
    <div id="piano-editor" style="margin-top:16px;"></div>
  `;

  container.innerHTML = createPageLayout({
    title: "Gestione Piani",
    subtitle: "Piattaforma",
    content: createCard({ body: content }),
  });

  document.getElementById("btn-home").onclick = () => {
    window.location.hash = "#/homePiattaforma";
  };

  document.getElementById("btn-nuovo-piano").onclick = () => {
    renderEditor(null);
  };

  await caricaPiani();
}

async function caricaPiani() {
  const { data, error } = await supabase
    .from("piani_abbonamento")
    .select("id, nome, prezzo_mensile, sedi_max")
    .order("prezzo_mensile", { ascending: true });

  const container = document.getElementById("piani-list");
  container.innerHTML = "";

  if (error) {
    container.innerHTML = `<div style="color:#dc2626;">Errore caricamento piani.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p class="small-muted">Nessun piano configurato.</p>`;
    return;
  }

  data.forEach((p) => {
    const div = document.createElement("div");
    div.style.background = "white";
    div.style.border = "1px solid #e5e7eb";
    div.style.borderRadius = "18px";
    div.style.padding = "16px";
    div.style.marginBottom = "12px";
    div.style.boxShadow = "0 10px 26px rgba(0,0,0,0.04)";

    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div style="min-width:220px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="font-weight:900; font-size:16px;">${String(p.nome || "").toUpperCase()}</div>
          </div>

          <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
            <span style="font-size:12px; padding:6px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#f9fafb;">
              € <strong>${p.prezzo_mensile}</strong> / mese
            </span>
            <span style="font-size:12px; padding:6px 10px; border-radius:999px; border:1px solid #e5e7eb; background:#f9fafb;">
              Sedi max: <strong>${p.sedi_max}</strong>
            </span>
          </div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="app-button small gray" data-edit="${p.id}">Modifica</button>
        </div>
      </div>
    `;

    container.appendChild(div);
  });

  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-edit");
      const { data: piano } = await supabase
        .from("piani_abbonamento")
        .select("id, nome, prezzo_mensile, sedi_max")
        .eq("id", id)
        .single();
      renderEditor(piano || null);
    });
  });
}

function renderEditor(piano) {
  const editor = document.getElementById("piano-editor");
  const isEdit = !!piano?.id;

  editor.innerHTML = `
    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:22px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
        <div>
          <div style="font-size:14px; color:#6b7280;">Editor piano</div>
          <div style="margin-top:4px; font-weight:900; font-size:16px;">
            ${isEdit ? `Modifica: ${String(piano.nome || "").toUpperCase()}` : "Nuovo piano"}
          </div>
        </div>

        <button class="app-button small gray" id="btn-cancel-editor">Chiudi</button>
      </div>

      <div style="margin-top:14px; display:grid; gap:14px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
        <div style="background:white; border:1px solid #e5e7eb; border-radius:18px; padding:14px;">
          <label>
            Nome
            <input id="p-nome" class="input-pill" value="${piano?.nome || ""}" placeholder="Es. Business" />
          </label>

          <label>
            Prezzo mensile
            <input id="p-prezzo" type="number" class="input-pill" value="${piano?.prezzo_mensile ?? 0}" />
          </label>

          <label>
            Sedi max
            <input id="p-sedi" type="number" class="input-pill" value="${piano?.sedi_max ?? 1}" />
          </label>
        </div>
      </div>

      <div id="piano-editor-error" style="margin-top:12px; color:#dc2626;"></div>

      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="app-button green" id="btn-save-piano">${isEdit ? "Salva modifiche" : "Crea piano"}</button>
        ${isEdit ? `<button class="app-button small red" id="btn-delete-piano">Elimina</button>` : ""}
      </div>
    </div>
  `;

  document.getElementById("btn-cancel-editor").onclick = () => {
    editor.innerHTML = "";
  };

  const errorEl = document.getElementById("piano-editor-error");

  document.getElementById("btn-save-piano").onclick = async () => {
    errorEl.textContent = "";

    const nome = document.getElementById("p-nome").value.trim();
    const prezzo = Number(document.getElementById("p-prezzo").value || 0);
    const sedi = Number(document.getElementById("p-sedi").value || 1);

    if (!nome) {
      errorEl.textContent = "Inserisci un nome piano.";
      return;
    }

    const payload = {
      nome,
      prezzo_mensile: prezzo,
      sedi_max: sedi,
    };

    let res;
    if (isEdit) {
      res = await supabase
        .from("piani_abbonamento")
        .update(payload)
        .eq("id", piano.id)
        .select();
    } else {
      res = await supabase
        .from("piani_abbonamento")
        .insert(payload)
        .select();
    }

    if (res.error) {
      errorEl.textContent = res.error.message || "Errore salvataggio piano.";
      return;
    }

    window.router.reloadCurrentRoute();
  };

  const btnDelete = document.getElementById("btn-delete-piano");
  if (btnDelete) {
    btnDelete.onclick = async () => {
      const ok = confirm("Confermi eliminazione piano? Questa azione non è reversibile.");
      if (!ok) return;

      const { error } = await supabase
        .from("piani_abbonamento")
        .delete()
        .eq("id", piano.id);

      if (error) {
        errorEl.textContent = error.message || "Errore eliminazione piano.";
        return;
      }

      window.router.reloadCurrentRoute();
    };
  }
}
