import { supabase } from "../supabaseClient.js";

let conversation = [];
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

const TONY_AVATAR =
  "https://cuhcscpvhypoaplcmtjk.supabase.co/storage/v1/object/public/Avatar/Tony.png";
const USER_AVATAR =
  "https://ui-avatars.com/api/?name=U&background=0E5A7A&color=fff";

export async function render(app) {
  conversation = [];

  const ruolo = window.state?.ruolo || "operatore";

  // Chip in base al ruolo
  const chipsAdmin = `
    <button class="chat-chip" data-prompt="Dammi il briefing operativo di oggi">📊 Briefing</button>
    <button class="chat-chip" data-prompt="Analizza le vendite degli ultimi giorni">📈 Vendite</button>
    <button class="chat-chip" data-prompt="Quali piatti devo produrre oggi?">🍳 Produzione</button>
    <button class="chat-chip" data-prompt="Dimmi se ho prodotti sottoscorta">📦 Magazzino</button>
    <button class="chat-chip" data-prompt="Dammi suggerimenti marketing per oggi">📢 Marketing</button>
    <button class="chat-chip" data-prompt="Cosa devo spingere in sala oggi?">🍽️ Sala</button>
    <button class="chat-chip" data-voice="ricetta">🎤 Nuova ricetta</button>
  `;

  const chipsOperatore = `
    <button class="chat-chip" data-prompt-ruolo="briefing">📋 Il mio giorno</button>
    <button class="chat-chip" data-prompt="Quali piatti devo produrre oggi?">🍳 Produzione</button>
    <button class="chat-chip" data-prompt="Cosa devo spingere in sala oggi?">🍽️ Sala</button>
    <button class="chat-chip" data-prompt-ruolo="obiettivi">🎯 I miei obiettivi</button>
    <button class="chat-chip" data-voice="ricetta">🎤 Nuova ricetta</button>
  `;

  const chips = (ruolo === "admin" || ruolo === "manager") ? chipsAdmin : chipsOperatore;

  app.innerHTML = `
<style>
/* Reset page layout per Tony */
.page-header { display: none !important; }
.page { padding: 0 !important; margin: 0 !important; }
#footer-root { display: none !important; }

.chat-shell {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: #e5ddd5;
  overflow: hidden;
  z-index: 50;
}

.chat-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #0E5A7A;
  color: #fff;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-avatar-img {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
}

.chat-name { font-size: 15px; font-weight: 700; }
.chat-status { font-size: 11px; opacity: 0.85; }

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  -webkit-overflow-scrolling: touch;
}

.msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.msg-row.user { flex-direction: row-reverse; }

.msg-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.msg-bubble {
  max-width: 80%;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.msg-row.user .msg-bubble { background: #dcf8c6; }

.msg-meta {
  font-size: 10px;
  color: #6b7280;
  text-align: right;
  margin-top: 4px;
}

.msg-voice-badge {
  font-size: 10px;
  background: rgba(14,90,122,0.1);
  color: #0E5A7A;
  border-radius: 999px;
  padding: 2px 7px;
  margin-right: 5px;
}

.msg-action-card {
  margin-top: 8px;
  background: rgba(14,90,122,0.08);
  border: 1px solid rgba(14,90,122,0.2);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: #0E5A7A;
}

.chat-quick-actions {
  flex-shrink: 0;
  display: flex;
  gap: 7px;
  padding: 7px 10px;
  overflow-x: auto;
  background: #f8fafc;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.chat-quick-actions::-webkit-scrollbar { display: none; }

.chat-chip {
  border: none;
  background: white;
  padding: 7px 11px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

#voice-transcript-bar {
  flex-shrink: 0;
  padding: 7px 14px;
  background: #fff3cd;
  font-size: 12px;
  color: #856404;
  border-top: 1px solid #ffc107;
  display: none;
}

.chat-input-bar {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  background: #f0f2f5;
  align-items: flex-end;
}

#chat-input {
  flex: 1;
  resize: none;
  padding: 10px 14px;
  border-radius: 20px;
  border: 1px solid #ccc;
  font-size: 14px;
  max-height: 100px;
  overflow-y: auto;
  line-height: 1.4;
}

.chat-send-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: #0E5A7A;
  color: white;
  font-size: 17px;
  cursor: pointer;
  flex-shrink: 0;
}

.chat-mic-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: white;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.chat-mic-btn.recording {
  background: #dc2626;
  animation: pulse-mic 1s infinite;
}

@keyframes pulse-mic {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
}
</style>

<div class="chat-shell">

  <div class="chat-header">
    <div class="chat-header-left">
      <img src="${TONY_AVATAR}" class="chat-avatar-img"/>
      <div>
        <div class="chat-name">Tony</div>
        <div class="chat-status" id="tony-status">Assistente operativo</div>
      </div>
    </div>
  </div>

  <div id="chat-messages" class="chat-messages"></div>

  <div class="chat-quick-actions">${chips}</div>

  <div id="voice-transcript-bar">
    🎤 <span id="voice-transcript-text">Trascrizione in corso...</span>
  </div>

  <div class="chat-input-bar">
    <button id="chat-mic" class="chat-mic-btn" title="Parla con Tony">🎤</button>
    <textarea id="chat-input" rows="1" placeholder="Scrivi a Tony..."></textarea>
    <button id="chat-send" class="chat-send-btn">➤</button>
  </div>

</div>
`;

  initChat(ruolo);
}

// ── Utilities ──────────────────────────────────────────

function getNowTime() {
  return new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function scrollBottom() {
  const c = document.getElementById("chat-messages");
  if (c) c.scrollTop = c.scrollHeight;
}

function setStatus(text) {
  const el = document.getElementById("tony-status");
  if (el) el.textContent = text;
}

function addMessage(text, type, opts = {}) {
  const container = document.getElementById("chat-messages");
  if (!container) return null;

  const row = document.createElement("div");
  row.className = `msg-row ${type}`;

  const avatar = document.createElement("img");
  avatar.className = "msg-avatar";
  avatar.src = type === "ai" ? TONY_AVATAR : USER_AVATAR;
  row.appendChild(avatar);

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  if (opts.isVoice) {
    const badge = document.createElement("span");
    badge.className = "msg-voice-badge";
    badge.textContent = "🎤 vocale";
    bubble.appendChild(badge);
  }

  const span = document.createElement("span");
  span.textContent = text;
  bubble.appendChild(span);

  if (opts.action && opts.actionExecuted) {
    const card = document.createElement("div");
    card.className = "msg-action-card";
    card.textContent = "✅ " + opts.action.type.replace(/_/g, " ");
    bubble.appendChild(card);
  }

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = getNowTime();
  bubble.appendChild(meta);

  row.appendChild(bubble);
  container.appendChild(row);
  scrollBottom();
  return bubble;
}

// ── Briefing personalizzato per ruolo ──────────────────

function getBriefingPrompt(ruolo) {
  const user = window.state?.user;
  const dipendente = window.state?.dipendente;
  const nome = dipendente?.nome || user?.user_metadata?.nome || "collega";
  const profiloAI = dipendente?.profilo_ai || {};

  if (ruolo === "operatore") {
    const obiettivi = profiloAI.obiettivi_personali || profiloAI.obiettivi_professionali || "";
    const energia = profiloAI.energia || "";
    const ruoloTarget = profiloAI.ruolo_target || "";

    return `Fai un briefing personalizzato per ${nome}, ruolo operatore.
NON mostrare ricavi, margini o dati economici — non sono di sua competenza.
Mostragli: cosa produrre oggi, cosa spingere in sala, eventuali sottoscorte operative.
${obiettivi ? `I suoi obiettivi personali sono: ${obiettivi}.` : ""}
${energia ? `Si sente così al lavoro: ${energia}.` : ""}
${ruoloTarget ? `Vuole diventare: ${ruoloTarget}.` : ""}
Valuta il suo rendimento in base ai dati di produzione e sala disponibili.
Se il rendimento è positivo, complimentati e dai un rinforzo motivazionale caldo e diretto.
Se ci sono aree di miglioramento, incoraggialo con tono positivo e dai suggerimenti pratici.
Sii come un coach, non un capo. Parla in prima persona rivolgendoti a lui/lei.`;
  }

  if (ruolo === "manager") {
    return `Dammi il briefing operativo completo di oggi per il manager.
Includi: vendite, costo lavoro, produzione consigliata, magazzino, eventi imminenti.
Evidenzia le priorità urgenti e le opportunità di oggi.`;
  }

  // admin / default
  return "Dammi il briefing operativo completo di oggi con tutti i KPI.";
}

function getObiettiviPrompt() {
  const dipendente = window.state?.dipendente;
  const profiloAI = dipendente?.profilo_ai || {};
  const nome = dipendente?.nome || "collega";
  const obiettivi = profiloAI.obiettivi_personali || profiloAI.obiettivi_professionali || "";
  const ruoloTarget = profiloAI.ruolo_target || "";
  const crescita = profiloAI.crescita || profiloAI.tipo_crescita || "";

  return `Parla con ${nome} dei suoi obiettivi di crescita professionale.
${obiettivi ? `Obiettivi dichiarati: ${obiettivi}.` : "Non ha ancora dichiarato obiettivi specifici — chiediglieli."}
${ruoloTarget ? `Vuole diventare: ${ruoloTarget}.` : ""}
${crescita ? `Area di crescita: ${crescita}.` : ""}
Dammi consigli pratici su come può migliorare nel suo ruolo attuale e avvicinarsi ai suoi obiettivi.
Sii motivante, diretto e concreto. NON mostrare dati economici.`;
}


function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderChart(chart) {
  const container = document.getElementById("chat-messages");
  if (!container || !chart?.labels || !chart?.data) return;
  const box = document.createElement("div");
  box.className = "chart-box";
  box.style.cssText = "width:100%;max-width:600px;margin-top:8px;";
  const canvas = document.createElement("canvas");
  box.appendChild(canvas);
  container.appendChild(box);
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: chart.labels,
      datasets: [{ label: chart.label || "Vendite", data: chart.data, backgroundColor: "rgba(14,90,122,0.7)", borderRadius: 6 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
  scrollBottom();
}

// ── API Tony ───────────────────────────────────────────

async function callTony(messages, audioBase64 = null, tipoMessaggio = null) {
  const body = {
    messages,
    azienda_id: window.state?.azienda?.id,
    azienda: window.state?.azienda?.nome,
    sede_id: window.state?.sedeAttiva?.id || null,
    lat: window.state?.sedeAttiva?.latitudine,
    lon: window.state?.sedeAttiva?.longitudine,
    ruolo: window.state?.ruolo || "operatore",
  };
  if (audioBase64) body.audio_base64 = audioBase64;
  if (tipoMessaggio) body.tipo_messaggio = tipoMessaggio;

  // Fetch diretto con timeout 60s invece di supabase.functions.invoke
  const supabaseUrl = "https://cuhcscpvhypoaplcmtjk.supabase.co";
  const session = await window.supabase?.auth?.getSession();
  const token = session?.data?.session?.access_token || "";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/assistente-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": token,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ── Registrazione audio ────────────────────────────────

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    // Rileva il miglior formato supportato dal browser
    let mimeType = "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      mimeType = "audio/webm;codecs=opus";
    } else if (MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType = "audio/webm";
    } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
      mimeType = "audio/mp4";
    } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
      mimeType = "audio/ogg";
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    // Salva il mimeType per usarlo nella conversione
    mediaRecorder._mimeType = mimeType;
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.start(100);
    isRecording = true;

    const mic = document.getElementById("chat-mic");
    if (mic) { mic.classList.add("recording"); mic.textContent = "⏹"; }
    setStatus("🔴 Registrazione...");
  } catch {
    alert("Impossibile accedere al microfono.");
  }
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") { resolve(null); return; }
    mediaRecorder.onstop = async () => {
      const actualMime = mediaRecorder._mimeType || mediaRecorder.mimeType || "audio/webm";
      const blob = new Blob(audioChunks, { type: actualMime });
      mediaRecorder.stream?.getTracks().forEach(t => t.stop());
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    };
    mediaRecorder.stop();
    isRecording = false;

    const mic = document.getElementById("chat-mic");
    if (mic) { mic.classList.remove("recording"); mic.textContent = "🎤"; }
    setStatus("⏳ Trascrizione...");
  });
}

async function sendVoiceMessage() {
  const audioBase64 = await stopRecording();
  if (!audioBase64) { setStatus("Assistente operativo"); return; }

  const bar = document.getElementById("voice-transcript-bar");
  const barText = document.getElementById("voice-transcript-text");
  if (bar) bar.style.display = "block";
  if (barText) barText.textContent = "Trascrizione in corso...";

  const loading = addMessage("Tony sta ascoltando...", "ai");

  try {
    const data = await callTony(conversation, audioBase64);
    if (loading) loading.parentElement?.remove();

    const voiceInput = data?.voice_input;
    if (voiceInput) {
      if (barText) barText.textContent = `"${voiceInput}"`;
      addMessage(voiceInput, "user", { isVoice: true });
      conversation.push({ role: "user", content: voiceInput });
    } else {
      if (bar) bar.style.display = "none";
    }

    const reply = data?.reply || "Non ho capito, puoi ripetere?";
    addMessage(reply, "ai", { action: data?.action, actionExecuted: data?.action_executed });
    conversation.push({ role: "assistant", content: reply });

    if (data?.action?.type === "crea_ricetta" && data?.action_executed) {
      setTimeout(() => {
        if (confirm("Ricetta creata! Vuoi aprirla per completarla?")) {
          const id = data?.action_result?.id;
          if (id) window.location.hash = `#/crea-ricetta?id=${id}`;
        }
      }, 500);
    }
  } catch {
    if (loading) loading.textContent = "Errore risposta vocale";
    if (bar) bar.style.display = "none";
  }
  setStatus("Assistente operativo");
}

// ── Init ───────────────────────────────────────────────

// ── Messaggio iniziale dinamico ────────────────────────
function getSaluto() {
  const ora = new Date().getHours();
  if (ora < 12) return "Buongiorno";
  if (ora < 18) return "Buon pomeriggio";
  return "Buonasera";
}

function getSeedDelGiorno() {
  // Seed basato sul giorno — cambia ogni giorno, non ogni apertura
  const oggi = new Date();
  return `${oggi.getFullYear()}-${oggi.getMonth()}-${oggi.getDate()}`;
}

async function loadMessaggioIniziale(ruolo) {
  const nome = window.state?.dipendente?.nome || window.state?.user?.email?.split("@")[0] || "";
  const saluto = getSaluto();
  const seed = getSeedDelGiorno();

  try {
    setStatus("⏳ Tony si sveglia...");

    const prompt = `Genera il messaggio di benvenuto di Tony per oggi (${seed}).

REGOLE PRECISE:
- Inizia con "${saluto}${nome ? " " + nome : ""}!" — poi va a capo
- Una frase motivazionale breve e carica di energia (max 2 righe) — deve sembrare scritta oggi, non generica
- Usa UNA citazione dalle CITAZIONI & ANCORE EMOTIVE della knowledge base — integrata in modo naturale, senza citare la fonte, senza virgolette esplicite
- Chiudi con una frase che invita all'azione: cosa può fare Tony oggi per lui/lei
- Tono: caldo, diretto, energico — "vibrazioni emozione carica"
- Max 5 righe totali
- NON includere dati operativi, numeri o briefing — quello viene dopo a richiesta
- Il messaggio deve essere DIVERSO ogni giorno grazie al seed: ${seed}
- Ruolo utente: ${ruolo}`;

    const data = await callTony([{ role: "user", content: prompt }], null, "messaggio_iniziale");
    const reply = data?.reply || `${saluto}! Sono Tony, il tuo assistente operativo. Cosa possiamo fare di grande oggi?`;

    addMessage(reply, "ai");
    conversation.push({ role: "assistant", content: reply });
    setStatus("Assistente operativo");
  } catch {
    const fallback = `${saluto}${nome ? " " + nome : ""}!\n\nSono Tony, pronto a darti una mano oggi. Scrivi "briefing" per il riepilogo completo, oppure dimmi direttamente cosa ti serve. 🚀`;
    addMessage(fallback, "ai");
    conversation.push({ role: "assistant", content: fallback });
    setStatus("Assistente operativo");
  }
}

// Fix altezza mobile
function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
setVh();
window.addEventListener("resize", setVh);

function initChat(ruolo) {
  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");
  const mic = document.getElementById("chat-mic");

  loadMessaggioIniziale(ruolo);

  async function sendMessage(prompt) {
    prompt = (prompt || input?.value || "").trim();
    if (!prompt) return;

    addMessage(prompt, "user");
    conversation.push({ role: "user", content: prompt });
    if (input) input.value = "";
    if (send) send.disabled = true;

    setStatus("⏳ Tony sta scrivendo...");
    const loading = addMessage("Tony sta scrivendo...", "ai");

    try {
      const data = await callTony(conversation);
      if (loading) loading.parentElement?.remove();

      const reply = data?.reply || "Nessuna risposta.";
      addMessage(reply, "ai", { action: data?.action, actionExecuted: data?.action_executed });
      conversation.push({ role: "assistant", content: reply });

      if (data?.action?.type === "crea_ricetta" && data?.action_executed) {
        setTimeout(() => {
          if (confirm("Ricetta creata! Vuoi aprirla per completarla?")) {
            const id = data?.action_result?.id;
            if (id) window.location.hash = `#/crea-ricetta?id=${id}`;
          }
        }, 500);
      }
    } catch {
      if (loading) loading.textContent = "Errore Tony";
    }

    if (send) send.disabled = false;
    setStatus("Assistente operativo");
    scrollBottom();
  }

  if (send) send.onclick = () => sendMessage();

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });
  }

  if (mic) {
    mic.onclick = async () => {
      if (!isRecording) await startRecording();
      else await sendVoiceMessage();
    };
  }

  // Chip
  document.querySelectorAll(".chat-chip").forEach(chip => {
    chip.onclick = () => {
      if (chip.dataset.voice === "ricetta") {
        addMessage("🎤 Parla ora: descrivi la ricetta (nome, ingredienti, dosi, conservazione...)", "ai");
        startRecording();
        return;
      }
      if (chip.dataset.promptRuolo === "briefing") {
        sendMessage(getBriefingPrompt(ruolo));
        return;
      }
      if (chip.dataset.promptRuolo === "obiettivi") {
        sendMessage(getObiettiviPrompt());
        return;
      }
      if (chip.dataset.prompt) sendMessage(chip.dataset.prompt);
    };
  });
}
