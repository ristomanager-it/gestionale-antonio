// js/views/super-tony.js
// SUPER TONY — assistenza tecnica piattaforma (solo superadmin).
// Chat con l'agente che legge DB e GitHub liberamente; ogni SCRITTURA
// arriva come proposta con anteprima e parte solo su "Esegui".

import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

let chat = [];       // {role, content}
let proposte = [];   // proposte in attesa
let busy = false;

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export async function render(app) {
  app.innerHTML = createPageLayout({
    title: "🛠️ Super Tony",
    subtitle: "Tecnico AI della piattaforma — database e GitHub, con conferma umana su ogni modifica",
    content: `
      ${createCard({
        title: "Conversazione",
        body: `
          <div id="st-chat" style="display:flex; flex-direction:column; gap:8px; max-height:50vh; overflow-y:auto; padding:4px;"></div>
          <div id="st-proposte" style="margin-top:10px;"></div>
          <div style="display:flex; gap:8px; margin-top:12px;">
            <textarea id="st-input" class="input" rows="2" placeholder="Descrivi il problema del cliente o cosa serve fare…" style="flex:1; resize:vertical;"></textarea>
            <button id="st-send" class="app-button">Invia</button>
          </div>
          <div style="font-size:11px; color:#94a3b8; margin-top:6px;">
            ⚠️ Super Tony legge liberamente ma non modifica nulla senza il tuo tap su Esegui. Ogni azione è tracciata nel log di audit.
          </div>
        `
      })}
    `
  });

  document.getElementById("st-send").addEventListener("click", invia);
  document.getElementById("st-input").addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); invia(); }
  });

  aggiungiMsg("assistant", "Ciao! Sono Super Tony, il tecnico della piattaforma. Dimmi il problema — posso interrogare il database di produzione e leggere il codice su GitHub. Le modifiche te le propongo e le esegui tu con un tap.");
}

function aggiungiMsg(role, content) {
  chat.push({ role, content });
  renderChat();
}

function renderChat() {
  const cont = document.getElementById("st-chat");
  if (!cont) return;
  cont.innerHTML = chat.map(m => `
    <div style="align-self:${m.role === "user" ? "flex-end" : "flex-start"};
                max-width:88%; padding:10px 12px; border-radius:12px; white-space:pre-wrap; font-size:14px;
                background:${m.role === "user" ? "#0E5A7A" : "#f1f5f9"};
                color:${m.role === "user" ? "#fff" : "#0f172a"};">
      ${escapeHtml(m.content)}
    </div>`).join("");
  cont.scrollTop = cont.scrollHeight;
}

function renderProposte() {
  const cont = document.getElementById("st-proposte");
  if (!cont) return;
  if (!proposte.length) { cont.innerHTML = ""; return; }

  cont.innerHTML = proposte.map((p, i) => {
    const anteprima = p.type === "sql_write"
      ? `<pre style="background:#0f172a; color:#e2e8f0; padding:10px; border-radius:8px; overflow-x:auto; font-size:12px; margin:8px 0;">${escapeHtml(p.query)}</pre>`
      : `<div style="font-size:12px; margin:6px 0;"><b>${escapeHtml(p.repo)}</b> → <code>${escapeHtml(p.path)}</code> (${(p.content || "").length.toLocaleString("it-IT")} caratteri)</div>
         <details style="margin:6px 0;"><summary style="cursor:pointer; font-size:12px; color:#0E5A7A;">Mostra contenuto file</summary>
           <pre style="background:#0f172a; color:#e2e8f0; padding:10px; border-radius:8px; overflow-x:auto; font-size:11px; max-height:300px;">${escapeHtml(p.content)}</pre>
         </details>`;
    return `
    <div style="border:2px solid #d97706; border-radius:12px; padding:12px; margin-bottom:8px; background:#fffbeb;">
      <div style="font-weight:800; font-size:13px; color:#92400e;">
        ${p.type === "sql_write" ? "🗄️ Proposta modifica DATABASE" : "📦 Proposta modifica CODICE (deploy)"}
      </div>
      <div style="font-size:13px; margin-top:4px;">${escapeHtml(p.motivo || "")}</div>
      ${anteprima}
      <div style="display:flex; gap:8px;">
        <button class="app-button small st-esegui" data-idx="${i}">✅ Esegui</button>
        <button class="app-button gray small st-annulla" data-idx="${i}">Annulla</button>
      </div>
    </div>`;
  }).join("");

  cont.querySelectorAll(".st-esegui").forEach(b =>
    b.addEventListener("click", () => eseguiProposta(Number(b.dataset.idx))));
  cont.querySelectorAll(".st-annulla").forEach(b =>
    b.addEventListener("click", () => { proposte.splice(Number(b.dataset.idx), 1); renderProposte(); }));
}

async function invia() {
  if (busy) return;
  const input = document.getElementById("st-input");
  const testo = (input.value || "").trim();
  if (!testo) return;
  input.value = "";
  aggiungiMsg("user", testo);
  busy = true;
  aggiungiMsg("assistant", "⏳ Sto indagando…");

  try {
    const { data, error } = await supabase.functions.invoke("super-tony", {
      body: { messages: chat.filter(m => !m.content.startsWith("⏳")).slice(-16) }
    });
    chat.pop(); // rimuove il placeholder ⏳
    if (error || !data?.success) {
      aggiungiMsg("assistant", "❌ Errore: " + (error?.message || data?.error || "sconosciuto"));
    } else {
      aggiungiMsg("assistant", data.reply || "(nessuna risposta)");
      if (Array.isArray(data.proposals) && data.proposals.length) {
        proposte.push(...data.proposals);
        renderProposte();
      }
    }
  } catch (e) {
    chat.pop();
    aggiungiMsg("assistant", "❌ Errore di rete: " + e.message);
  } finally {
    busy = false;
  }
}

async function eseguiProposta(idx) {
  const p = proposte[idx];
  if (!p) return;
  if (!confirm(p.type === "sql_write"
    ? "Eseguire questa modifica sul DATABASE DI PRODUZIONE?"
    : `Pubblicare ${p.path} su GitHub (deploy automatico)?`)) return;

  try {
    const { data, error } = await supabase.functions.invoke("super-tony", {
      body: { confirm_action: p }
    });
    if (error || !data?.success) {
      aggiungiMsg("assistant", "❌ Esecuzione fallita: " + (error?.message || data?.error || "sconosciuto"));
    } else {
      proposte.splice(idx, 1);
      renderProposte();
      const dettaglio = p.type === "sql_write"
        ? `righe interessate: ${data.result?.affected ?? "n/d"}`
        : `commit ${String(data.result?.commit || "").slice(0, 7)} su ${p.path}`;
      aggiungiMsg("assistant", `✅ Fatto — ${dettaglio}`);
    }
  } catch (e) {
    aggiungiMsg("assistant", "❌ Errore di rete: " + e.message);
  }
}
