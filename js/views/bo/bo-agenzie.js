// js/views/bo/bo-agenzie.js
// Anagrafica agenzie di personale esterno — collegate ai dipendenti "a chiamata/agenzia"

import { createPageLayout } from "../../utils/pageLayout.js";

const supa = () => window.supabaseClient || window.supabase;

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function render(container) {
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>';
    return;
  }

  let agenzie = [];
  let modModifica = null; // id agenzia in modifica, o null

  async function caricaAgenzie() {
    const { data } = await supa()
      .from("agenzie")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("nome");
    agenzie = data || [];
  }

  await caricaAgenzie();

  container.innerHTML = createPageLayout({
    title: "Agenzie personale esterno",
    subtitle: "Anagrafica delle agenzie da cui richiami personale a chiamata",
    content: `
      <style>
        .ag-card { background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px; }
        .ag-btn { border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600; }
        .ag-row { display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap; }
        .ag-form input, .ag-form textarea { width:100%;padding:9px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:8px;box-sizing:border-box; }
        @media(max-width:600px){ .ag-row{ flex-direction:column; } }
      </style>

      <div class="ag-card">
        <h3 style="margin-top:0;">➕ Nuova agenzia</h3>
        <div class="ag-form">
          <input id="ag-nome" placeholder="Nome agenzia *">
          <input id="ag-referente" placeholder="Referente (opzionale)">
          <input id="ag-telefono" placeholder="Telefono">
          <input id="ag-email" placeholder="Email" type="email">
          <textarea id="ag-note" placeholder="Note (tariffe concordate, condizioni, ecc.)" rows="2"></textarea>
        </div>
        <button id="btn-ag-add" class="ag-btn" style="background:#7c3aed;color:white;">Aggiungi agenzia</button>
        <span id="ag-msg" style="margin-left:10px;font-size:13px;"></span>
      </div>

      <div id="ag-lista"></div>
    `
  });

  function renderLista() {
    const box = container.querySelector("#ag-lista");
    if (!agenzie.length) {
      box.innerHTML = '<div class="ag-card" style="text-align:center;color:#64748b;">Nessuna agenzia registrata ancora.</div>';
      return;
    }
    box.innerHTML = agenzie.map(a => {
      const inModifica = modModifica === a.id;
      if (inModifica) {
        return `
          <div class="ag-card">
            <div class="ag-form">
              <input id="edit-nome-${a.id}" value="${esc(a.nome)}" placeholder="Nome agenzia">
              <input id="edit-referente-${a.id}" value="${esc(a.referente || "")}" placeholder="Referente">
              <input id="edit-telefono-${a.id}" value="${esc(a.telefono || "")}" placeholder="Telefono">
              <input id="edit-email-${a.id}" value="${esc(a.email || "")}" placeholder="Email">
              <textarea id="edit-note-${a.id}" rows="2" placeholder="Note">${esc(a.note || "")}</textarea>
            </div>
            <button data-salva="${a.id}" class="ag-btn" style="background:#16a34a;color:white;">✅ Salva</button>
            <button data-annulla="${a.id}" class="ag-btn" style="background:#334155;color:white;">Annulla</button>
          </div>
        `;
      }
      return `
        <div class="ag-card">
          <div class="ag-row">
            <div>
              <div style="font-weight:700;font-size:15px;">
                ${esc(a.nome)}
                ${a.attivo === false ? '<span style="margin-left:8px;padding:1px 7px;border-radius:8px;background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;">DISATTIVA</span>' : ''}
              </div>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">
                ${a.referente ? `👤 ${esc(a.referente)} · ` : ''}${a.telefono ? `📞 ${esc(a.telefono)} · ` : ''}${a.email ? `✉️ ${esc(a.email)}` : ''}
              </div>
              ${a.note ? `<div style="font-size:12px;color:#94a3b8;margin-top:6px;">${esc(a.note)}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button data-modifica="${a.id}" class="ag-btn" style="background:#f1f5f9;color:#0f172a;">✏️</button>
              <button data-toggle="${a.id}" class="ag-btn" style="background:${a.attivo === false ? '#16a34a' : '#f59e0b'};color:white;">${a.attivo === false ? 'Riattiva' : 'Disattiva'}</button>
              <button data-elimina="${a.id}" class="ag-btn" style="background:#fee2e2;color:#dc2626;">🗑</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll("[data-modifica]").forEach(btn => {
      btn.onclick = () => { modModifica = btn.dataset.modifica; renderLista(); };
    });
    box.querySelectorAll("[data-annulla]").forEach(btn => {
      btn.onclick = () => { modModifica = null; renderLista(); };
    });
    box.querySelectorAll("[data-salva]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.salva;
        const nome = container.querySelector(`#edit-nome-${id}`).value.trim();
        if (!nome) return;
        await supa().from("agenzie").update({
          nome,
          referente: container.querySelector(`#edit-referente-${id}`).value.trim() || null,
          telefono: container.querySelector(`#edit-telefono-${id}`).value.trim() || null,
          email: container.querySelector(`#edit-email-${id}`).value.trim() || null,
          note: container.querySelector(`#edit-note-${id}`).value.trim() || null,
        }).eq("id", id);
        modModifica = null;
        await caricaAgenzie();
        renderLista();
      };
    });
    box.querySelectorAll("[data-toggle]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.toggle;
        const ag = agenzie.find(x => x.id === id);
        const nuovoStato = ag.attivo === false ? true : false;
        await supa().from("agenzie").update({ attivo: nuovoStato }).eq("id", id);
        await caricaAgenzie();
        renderLista();
      };
    });
    box.querySelectorAll("[data-elimina]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Eliminare questa agenzia? I dipendenti già collegati manterranno il nome ma perderanno il collegamento.")) return;
        await supa().from("agenzie").delete().eq("id", btn.dataset.elimina);
        await caricaAgenzie();
        renderLista();
      };
    });
  }

  renderLista();

  container.querySelector("#btn-ag-add").onclick = async () => {
    const nome = container.querySelector("#ag-nome").value.trim();
    const msg = container.querySelector("#ag-msg");
    if (!nome) { msg.style.color = "#dc2626"; msg.textContent = "Inserisci il nome dell'agenzia"; return; }

    const { error } = await supa().from("agenzie").insert({
      nome,
      referente: container.querySelector("#ag-referente").value.trim() || null,
      telefono: container.querySelector("#ag-telefono").value.trim() || null,
      email: container.querySelector("#ag-email").value.trim() || null,
      note: container.querySelector("#ag-note").value.trim() || null,
      azienda_id: azienda.id,
      attivo: true,
    });

    if (error) { msg.style.color = "#dc2626"; msg.textContent = "Errore: " + error.message; return; }

    msg.style.color = "#16a34a";
    msg.textContent = "✅ Aggiunta";
    ["#ag-nome", "#ag-referente", "#ag-telefono", "#ag-email", "#ag-note"].forEach(sel => container.querySelector(sel).value = "");
    await caricaAgenzie();
    renderLista();
  };
}
