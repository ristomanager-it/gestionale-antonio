// js/views/super-tony.js
// SUPER TONY — assistenza tecnica piattaforma (solo superadmin).
// Chat con l'agente che legge DB e GitHub liberamente; ogni SCRITTURA
// arriva come proposta con anteprima e parte solo su "Esegui".

import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

let chat = [];       // {role, content, images?}
let proposte = [];   // proposte in attesa
let allegati = [];   // data URL immagini per il prossimo messaggio
let busy = false;

// --- Persistenza conversazione (sopravvive alla navigazione tra pagine) ---
const ST_KEY = "supertony_sessione_v1";
function salvaStato() {
  try {
    sessionStorage.setItem(ST_KEY, JSON.stringify({ chat, proposte }));
  } catch {}
}
function ripristinaStato() {
  try {
    const raw = sessionStorage.getItem(ST_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (Array.isArray(d.chat) && d.chat.length) {
      chat = d.chat;
      proposte = Array.isArray(d.proposte) ? d.proposte : [];
      // se ero rimasto "in indagine" quando ho cambiato pagina, chiudo lo stato appeso
      chat = chat.filter(m => !String(m.content).startsWith("⏳"));
      const ultimo = chat[chat.length - 1];
      if (busy || (ultimo && ultimo.role === "user")) {
        chat.push({ role: "assistant", content: "⚠️ La richiesta precedente è stata interrotta (hai cambiato pagina). Riscrivi o riprova pure." });
      }
      busy = false;
      return true;
    }
  } catch {}
  return false;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

export async function render(app) {
  // Sezione riservata alla PIATTAFORMA: stessa regola di gestione-aziende.
  // (Il gate vero resta comunque lato server nell'Edge Function: JWT + ruolo superadmin)
  const aziendaAttiva = window.state?.azienda;
  if (!window.state?.user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    app.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({ body: "<p>Sezione riservata alla piattaforma.</p>" })
    });
    return;
  }

  app.innerHTML = createPageLayout({
    title: "🛠️ Super Tony",
    subtitle: "Tecnico AI della piattaforma — database e GitHub, con conferma umana su ogni modifica",
    content: `
      ${createCard({
        title: "Conversazione",
        body: `
          <div id="st-chat" style="display:flex; flex-direction:column; gap:8px; max-height:50vh; overflow-y:auto; padding:4px;"></div>
          <div id="st-proposte" style="margin-top:10px;"></div>
          <div id="st-anteprime" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;"></div>
          <div style="display:flex; gap:8px; margin-top:12px; align-items:flex-end;">
            <button id="st-allega" class="app-button gray small" title="Allega screenshot" type="button">📎</button>
            <button id="st-cattura" class="app-button gray small" title="Cattura schermo" type="button">📸</button>
            <input id="st-file" type="file" accept="image/*" multiple style="display:none;">
            <textarea id="st-input" class="input" rows="2" placeholder="Descrivi il problema, incolla o allega uno screenshot…" style="flex:1; resize:vertical;"></textarea>
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

  document.getElementById("st-allega").addEventListener("click", () =>
    document.getElementById("st-file").click());
  document.getElementById("st-file").addEventListener("change", async e => {
    for (const f of e.target.files || []) await aggiungiAllegato(f);
    e.target.value = "";
  });

  document.getElementById("st-input").addEventListener("paste", async e => {
    for (const item of e.clipboardData?.items || []) {
      if (item.type?.startsWith("image/")) {
        e.preventDefault();
        const f = item.getAsFile();
        if (f) await aggiungiAllegato(f);
      }
    }
  });

  document.getElementById("st-cattura").addEventListener("click", catturaSchermo);

  if (ripristinaStato()) {
    renderChat();
    renderProposte();
  } else {
    aggiungiMsg("assistant", "Ciao! Sono Super Tony, il tecnico della piattaforma. Dimmi il problema — posso interrogare il database di produzione e leggere il codice su GitHub. Le modifiche te le propongo e le esegui tu con un tap.");
  }
}

function aggiungiMsg(role, content, images) {
  chat.push({ role, content, ...(images?.length ? { images } : {}) });
  renderChat();
  salvaStato();
}

// Ridimensiona a max 1600px e converte in JPEG per non gonfiare i token
function ridimensionaImmagine(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      const scala = Math.min(1, MAX / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scala);
      c.height = Math.round(img.height * scala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function aggiungiAllegato(file) {
  if (allegati.length >= 4) { alert("Massimo 4 screenshot per messaggio."); return; }
  const dataUrl = await new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });
  allegati.push(await ridimensionaImmagine(String(dataUrl)));
  renderAnteprime();
}

async function catturaSchermo() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    alert("Cattura schermo non disponibile su questo dispositivo: fai lo screenshot e allegalo con 📎 o incollalo.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const track = stream.getVideoTracks()[0];
    const video = document.createElement("video");
    video.srcObject = stream;
    await video.play();
    await new Promise(r => setTimeout(r, 300));
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext("2d").drawImage(video, 0, 0);
    track.stop();
    allegati.push(await ridimensionaImmagine(c.toDataURL("image/png")));
    renderAnteprime();
  } catch (e) {
    if (e?.name !== "NotAllowedError") alert("Cattura fallita: " + e.message);
  }
}

function renderAnteprime() {
  const cont = document.getElementById("st-anteprime");
  if (!cont) return;
  cont.innerHTML = allegati.map((a, i) => `
    <div style="position:relative;">
      <img src="${a}" style="height:56px; border-radius:8px; border:1px solid #e2e8f0;">
      <button data-idx="${i}" class="st-del-img" style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; border:none; background:#dc2626; color:#fff; font-size:11px; cursor:pointer;">✕</button>
    </div>`).join("");
  cont.querySelectorAll(".st-del-img").forEach(b =>
    b.addEventListener("click", () => { allegati.splice(Number(b.dataset.idx), 1); renderAnteprime(); }));
}

function renderChat() {
  const cont = document.getElementById("st-chat");
  if (!cont) return;
  cont.innerHTML = chat.map(m => `
    <div style="align-self:${m.role === "user" ? "flex-end" : "flex-start"};
                max-width:88%; padding:10px 12px; border-radius:12px; white-space:pre-wrap; font-size:14px;
                background:${m.role === "user" ? "#0E5A7A" : "#f1f5f9"};
                color:${m.role === "user" ? "#fff" : "#0f172a"};">
      ${(m.images || []).map(img => `<img src="${img}" style="max-width:180px; border-radius:8px; display:block; margin-bottom:6px;">`).join("")}${escapeHtml(m.content)}
    </div>`).join("");
  cont.scrollTop = cont.scrollHeight;
}

function renderProposte() {
  const cont = document.getElementById("st-proposte");
  if (!cont) return;
  if (!proposte.length) { cont.innerHTML = ""; return; }

  const box = (c) => `<pre style="background:#0f172a; color:#e2e8f0; padding:10px; border-radius:8px; overflow-x:auto; font-size:12px; margin:8px 0;">${escapeHtml(c)}</pre>`;
  const TITOLI = {
    sql_write: "🗄️ Proposta modifica DATABASE",
    github_write: "📦 Proposta modifica CODICE (deploy)",
    github_upload_media: "🖼️ Proposta caricamento FOTO/VIDEO",
    edge_deploy: "⚙️ Proposta deploy EDGE FUNCTION",
    mgmt_auth_write: "🔐 Proposta modifica CONFIG AUTH",
    resend_email: "✉️ Proposta invio EMAIL",
    edge_call: "▶️ Proposta chiamata FUNZIONE",
    stripe_write: "💳 Proposta creazione LISTINO STRIPE",
  };
  function anteprimaDi(p) {
    switch (p.type) {
      case "sql_write": return box(p.query);
      case "github_write": return `<div style="font-size:12px; margin:6px 0;"><b>${escapeHtml(p.repo)}</b> → <code>${escapeHtml(p.path)}</code> (${(p.content||"").length.toLocaleString("it-IT")} caratteri)</div>
        <details style="margin:6px 0;"><summary style="cursor:pointer; font-size:12px; color:#0E5A7A;">Mostra contenuto file</summary><pre style="background:#0f172a; color:#e2e8f0; padding:10px; border-radius:8px; overflow-x:auto; font-size:11px; max-height:300px;">${escapeHtml(p.content)}</pre></details>`;
      case "github_upload_media": return `<div style="font-size:12px; margin:6px 0;"><b>${escapeHtml(p.repo)}</b> → <code>${escapeHtml(p.path)}</code><br>da: <span style="color:#0E5A7A;">${escapeHtml((p.source_url||"").slice(0,80))}</span></div>`;
      case "edge_deploy": return `<div style="font-size:12px; margin:6px 0;">funzione <code>${escapeHtml(p.name)}</code> (${(p.code||"").length.toLocaleString("it-IT")} caratteri)</div>`;
      case "mgmt_auth_write": return box(JSON.stringify(p.payload, null, 2));
      case "resend_email": return `<div style="font-size:12px; margin:6px 0;">a <b>${escapeHtml(p.to)}</b><br>oggetto: ${escapeHtml(p.subject||"")}</div>`;
      case "edge_call": return `<div style="font-size:12px; margin:6px 0;">funzione <code>${escapeHtml(p.slug)}</code></div>${box(JSON.stringify(p.payload||{}, null, 2))}`;
      case "stripe_write": {
        const pr = p.params || {};
        const eur = pr.unit_amount ? (pr.unit_amount/100).toLocaleString("it-IT",{style:"currency",currency:"EUR"}) : "";
        const ric = pr["recurring[interval]"] ? `/${pr["recurring[interval]"]==="month"?"mese":"anno"}` : "";
        return `<div style="font-size:13px; margin:6px 0;"><code>${escapeHtml(p.path)}</code></div>
          ${eur ? `<div style="font-size:15px; font-weight:700; color:#15803d;">${eur}${ric}</div>` : ""}
          <details style="margin:6px 0;"><summary style="cursor:pointer; font-size:12px; color:#0E5A7A;">Dettagli</summary>${box(JSON.stringify(pr, null, 2))}</details>`;
      }
      default: return box(JSON.stringify(p, null, 2));
    }
  }
  cont.innerHTML = proposte.map((p, i) => {
    const rischio = p.type === "sql_write" || p.type === "stripe_write" || p.type === "mgmt_auth_write";
    const bordo = rischio ? "#b91c1c" : "#d97706";
    const sfondo = rischio ? "#fef2f2" : "#fffbeb";
    return `
    <div style="border:2px solid ${bordo}; border-radius:12px; padding:12px; margin-bottom:8px; background:${sfondo};">
      <div style="font-weight:800; font-size:13px; color:#92400e;">${TITOLI[p.type] || "Proposta"}</div>
      <div style="font-size:13px; margin-top:4px;">${escapeHtml(p.motivo || "")}</div>
      ${anteprimaDi(p)}
      <div style="display:flex; gap:8px;">
        <button class="app-button small st-esegui" data-idx="${i}">✅ Esegui</button>
        <button class="app-button gray small st-annulla" data-idx="${i}">Annulla</button>
      </div>
    </div>`;
  }).join("");

  cont.querySelectorAll(".st-esegui").forEach(b =>
    b.addEventListener("click", () => eseguiProposta(Number(b.dataset.idx))));
  cont.querySelectorAll(".st-annulla").forEach(b =>
    b.addEventListener("click", () => { proposte.splice(Number(b.dataset.idx), 1); renderProposte(); salvaStato(); }));
}

async function invia() {
  if (busy) return;
  const input = document.getElementById("st-input");
  const testo = (input.value || "").trim();
  if (!testo && !allegati.length) return;
  input.value = "";
  const imgs = allegati.slice();
  allegati = [];
  renderAnteprime();
  aggiungiMsg("user", testo || "(screenshot)", imgs);
  busy = true;
  aggiungiMsg("assistant", "⏳ Sto indagando…");

  try {
    // Sessione fresca: il JWT scade dopo un po' e il gateway respinge
    // con un non-2xx PRIMA che la funzione parta. Refresh preventivo.
    try { await supabase.auth.refreshSession(); } catch {}

    // le immagini viaggiano solo con l'ULTIMO messaggio utente (token)
    const storia = chat.filter(m => !m.content.startsWith("⏳")).slice(-16);
    const ultimoUserIdx = storia.map(m => m.role).lastIndexOf("user");
    const payload = storia.map((m, i) => ({
      role: m.role,
      content: m.content,
      ...(i === ultimoUserIdx && m.images?.length ? { images: m.images } : {})
    }));
    const { data, error } = await supabase.functions.invoke("super-tony", {
      body: { messages: payload }
    });
    chat.pop(); // rimuove il placeholder ⏳
    if (error || !data?.success) {
      let dettaglio = data?.error || error?.message || "sconosciuto";
      try {
        if (error?.context) {
          const bodyErr = await error.context.json();
          if (bodyErr?.error) dettaglio = bodyErr.error;
        }
      } catch {}
      aggiungiMsg("assistant", "❌ Errore: " + dettaglio + (String(dettaglio).includes("Sessione") ? "" : " — se persiste, ricarica la pagina."));
    } else {
      aggiungiMsg("assistant", data.reply || "(nessuna risposta)");
      if (Array.isArray(data.proposals) && data.proposals.length) {
        proposte.push(...data.proposals);
        renderProposte();
        salvaStato();
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
  const CONFERME = {
    sql_write: "Eseguire questa modifica sul DATABASE DI PRODUZIONE?",
    github_write: `Pubblicare ${p.path} su GitHub (deploy automatico)?`,
    github_upload_media: `Caricare il media in ${p.path}?`,
    edge_deploy: `Deployare la Edge Function ${p.name}?`,
    mgmt_auth_write: "Modificare la configurazione Auth del progetto?",
    resend_email: `Inviare l'email a ${p.to}?`,
    edge_call: `Chiamare la funzione ${p.slug}?`,
    stripe_write: "Creare questo LISTINO su STRIPE (pagamenti reali)?",
  };
  if (!confirm(CONFERME[p.type] || "Eseguire questa azione?")) return;

  try {
    try { await supabase.auth.refreshSession(); } catch {}
    const { data, error } = await supabase.functions.invoke("super-tony", {
      body: { confirm_action: p }
    });
    if (error || !data?.success) {
      aggiungiMsg("assistant", "❌ Esecuzione fallita: " + (error?.message || data?.error || "sconosciuto"));
    } else {
      proposte.splice(idx, 1);
      renderProposte();
      salvaStato();
      let dettaglio;
      switch (p.type) {
        case "sql_write": dettaglio = `righe interessate: ${data.result?.affected ?? "n/d"}`; break;
        case "github_write": case "github_upload_media": dettaglio = `commit ${String(data.result?.commit || "").slice(0, 7)} su ${p.path}`; break;
        case "edge_deploy": dettaglio = `${p.name} deployata (v${data.result?.version ?? "?"})`; break;
        case "stripe_write": dettaglio = `creato su Stripe: ${data.result?.id || "ok"}`; break;
        case "resend_email": dettaglio = `email inviata`; break;
        case "edge_call": dettaglio = `funzione ${p.slug} chiamata (status ${data.result?.status ?? "?"})`; break;
        case "mgmt_auth_write": dettaglio = `config aggiornata`; break;
        default: dettaglio = "completato";
      }
      aggiungiMsg("assistant", `✅ Fatto — ${dettaglio}`);
    }
  } catch (e) {
    aggiungiMsg("assistant", "❌ Errore di rete: " + e.message);
  }
}
