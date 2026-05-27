import { createPageLayout } from "../utils/pageLayout.js";
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

  const html = createPageLayout({
    title: "Tony",
    subtitle: "Il tuo assistente AI Ristoflow",
    content: `
<div class="chat-shell">

  <div class="chat-header">
    <div class="chat-header-left">
      <img src="${TONY_AVATAR}" class="chat-avatar-img"/>
      <div class="chat-header-meta">
        <div class="chat-name">Tony</div>
        <div class="chat-status" id="tony-status">Assistente operativo</div>
      </div>
    </div>
  </div>

  <div id="chat-messages" class="chat-messages"></div>

  <div class="chat-quick-actions">
    <button class="chat-chip" data-prompt="Dammi il briefing operativo di oggi">📊 Briefing</button>
    <button class="chat-chip" data-prompt="Quali piatti devo produrre oggi?">🍳 Produzione</button>
    <button class="chat-chip" data-prompt="Analizza le vendite degli ultimi giorni">📈 Vendite</button>
    <button class="chat-chip" data-prompt="Dimmi se ho prodotti sottoscorta">📦 Magazzino</button>
    <button class="chat-chip" data-prompt="Dammi suggerimenti marketing per oggi">📢 Marketing</button>
    <button class="chat-chip" data-voice="ricetta">🎤 Nuova ricetta</button>
    <button class="chat-chip" data-prompt="Cosa devo spingere in sala oggi?">🍽️ Sala</button>
  </div>

  <div id="voice-transcript-bar" style="display:none; padding:8px 14px; background:#fff3cd; font-size:13px; color:#856404; border-top:1px solid #ffc107;">
    🎤 <span id="voice-transcript-text">Trascrizione in corso...</span>
  </div>

  <div class="chat-input-bar">
    <button id="chat-mic" class="chat-mic-btn" title="Parla con Tony">🎤</button>
    <textarea id="chat-input" rows="1" placeholder="Scrivi a Tony..."></textarea>
    <button id="chat-send" class="chat-send-btn">➤</button>
  </div>

</div>

<style>

.chat-shell {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  background: #e5ddd5;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  background: #0E5A7A;
  color: #fff;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-avatar-img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
}

.chat-name {
  font-size: 16px;
  font-weight: 700;
}

.chat-status {
  font-size: 12px;
  opacity: 0.9;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.msg-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.msg-row.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.msg-bubble {
  max-width: min(88%, 900px);
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  background: white;
}

.msg-row.user .msg-bubble {
  background: #dcf8c6;
}

.msg-meta {
  font-size: 11px;
  margin-top: 6px;
  color: #6b7280;
  text-align: right;
}

.msg-voice-badge {
  font-size: 10px;
  background: rgba(14,90,122,0.1);
  color: #0E5A7A;
  border-radius: 999px;
  padding: 2px 8px;
  margin-right: 6px;
}

.msg-action-card {
  margin-top: 10px;
  background: rgba(14,90,122,0.08);
  border: 1px solid rgba(14,90,122,0.2);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
}

.msg-action-card strong {
  color: #0E5A7A;
}

.chart-box {
  width: 100%;
  max-width: 650px;
  margin-top: 10px;
}

.chat-quick-actions {
  display: flex;
  gap: 8px;
  padding: 10px;
  overflow-x: auto;
  background: #f8fafc;
  scrollbar-width: none;
}

.chat-quick-actions::-webkit-scrollbar {
  display: none;
}

.chat-chip {
  border: none;
  background: white;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: background 0.15s;
}

.chat-chip:hover {
  background: #f0f0f0;
}

.chat-input-bar {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #f0f2f5;
  align-items: flex-end;
}

#chat-input {
  flex: 1;
  resize: none;
  padding: 12px;
  border-radius: 20px;
  border: 1px solid #ccc;
  font-size: 14px;
  max-height: 120px;
  overflow-y: auto;
}

.chat-send-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: #0E5A7A;
  color: white;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.chat-send-btn:hover {
  background: #0a4560;
}

.chat-mic-btn {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: white;
  font-size: 20px;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: all 0.15s;
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
`
  });

  app.innerHTML = html;
  initChat();
}

function getNowTime() {
  return new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function scrollChatToBottom() {
  const container = document.getElementById("chat-messages");
  if (container) container.scrollTop = container.scrollHeight;
}

function setTonyStatus(text) {
  const el = document.getElementById("tony-status");
  if (el) el.textContent = text;
}

function addMessage(text, type, options = {}) {
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

  // Badge vocale
  if (options.isVoice) {
    const badge = document.createElement("span");
    badge.className = "msg-voice-badge";
    badge.textContent = "🎤 vocale";
    bubble.appendChild(badge);
  }

  const textNode = document.createElement("span");
  textNode.textContent = text;
  bubble.appendChild(textNode);

  // Card azione eseguita
  if (options.action && options.actionExecuted) {
    const card = document.createElement("div");
    card.className = "msg-action-card";
    card.innerHTML = `<strong>✅ Azione eseguita:</strong> ${escapeHtml(options.action.type.replace(/_/g, " "))}`;
    bubble.appendChild(card);
  }

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = getNowTime();
  bubble.appendChild(meta);

  row.appendChild(bubble);
  container.appendChild(row);
  scrollChatToBottom();

  return bubble;
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
  const canvas = document.createElement("canvas");
  box.appendChild(canvas);
  container.appendChild(box);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: chart.labels,
      datasets: [{
        label: chart.label || "Vendite",
        data: chart.data,
        backgroundColor: "rgba(14,90,122,0.7)",
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });

  scrollChatToBottom();
}

async function callTony(messages, audioBase64 = null) {
  const body = {
    messages,
    azienda_id: window.state?.azienda?.id,
    azienda: window.state?.azienda?.nome,
    lat: window.state?.sedeAttiva?.latitudine,
    lon: window.state?.sedeAttiva?.longitudine,
  };

  if (audioBase64) {
    body.audio_base64 = audioBase64;
  }

  const { data, error } = await supabase.functions.invoke("assistente-ai", { body });

  if (error) throw error;
  return data;
}

// ============================================================
// REGISTRAZIONE AUDIO
// ============================================================

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.start(100);
    isRecording = true;

    const mic = document.getElementById("chat-mic");
    if (mic) {
      mic.classList.add("recording");
      mic.textContent = "⏹";
      mic.title = "Ferma registrazione";
    }

    setTonyStatus("🔴 Registrazione in corso...");

  } catch (err) {
    console.error("Microfono non disponibile:", err);
    alert("Impossibile accedere al microfono. Controlla i permessi del browser.");
  }
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });

      // Ferma stream microfono
      mediaRecorder.stream?.getTracks().forEach(t => t.stop());

      // Converti in base64
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    };

    mediaRecorder.stop();
    isRecording = false;

    const mic = document.getElementById("chat-mic");
    if (mic) {
      mic.classList.remove("recording");
      mic.textContent = "🎤";
      mic.title = "Parla con Tony";
    }

    setTonyStatus("⏳ Trascrizione in corso...");
  });
}

async function sendVoiceMessage(promptPrefix = "") {
  const audioBase64 = await stopRecording();

  if (!audioBase64) {
    setTonyStatus("Assistente operativo");
    return;
  }

  // Mostra bar trascrizione
  const bar = document.getElementById("voice-transcript-bar");
  const barText = document.getElementById("voice-transcript-text");
  if (bar) bar.style.display = "block";
  if (barText) barText.textContent = "Trascrizione in corso...";

  const loadingBubble = addMessage("Tony sta ascoltando...", "ai");

  try {
    // Se c'è un prefix (es. "Crea questa ricetta:"), lo aggiungiamo nel contesto
    const messagesForTony = promptPrefix
      ? [...conversation, { role: "system", content: `Modalità: ${promptPrefix}` }]
      : conversation;

    const data = await callTony(messagesForTony, audioBase64);

    if (loadingBubble) loadingBubble.parentElement?.remove();

    // Mostra testo trascritto
    const voiceInput = data?.voice_input;
    if (voiceInput) {
      if (barText) barText.textContent = `"${voiceInput}"`;
      addMessage(voiceInput, "user", { isVoice: true });
      conversation.push({ role: "user", content: voiceInput });
    } else {
      if (bar) bar.style.display = "none";
    }

    const reply = data?.reply || "Non ho capito, puoi ripetere?";
    addMessage(reply, "ai", {
      action: data?.action,
      actionExecuted: data?.action_executed,
    });

    conversation.push({ role: "assistant", content: reply });

    if (data?.chart) renderChart(data.chart);

    // Gestione azione ricetta
    if (data?.action?.type === "crea_ricetta" && data?.action_executed) {
      setTimeout(() => {
        if (confirm("Tony ha creato la ricetta! Vuoi aprirla per completarla?")) {
          const ricettaId = data?.action_result?.id;
          if (ricettaId) {
            window.location.hash = `#/crea-ricetta?id=${ricettaId}`;
          }
        }
      }, 500);
    }

  } catch (err) {
    console.error("Tony voice error:", err);
    if (loadingBubble) loadingBubble.textContent = "Errore nella risposta vocale";
    if (bar) bar.style.display = "none";
  }

  setTonyStatus("Assistente operativo");
}

// ============================================================
// INIT CHAT
// ============================================================

async function loadInitialBriefing() {
  try {
    setTonyStatus("⏳ Caricamento briefing...");

    const data = await callTony([{
      role: "user",
      content: "Dammi il briefing operativo di oggi"
    }]);

    const reply = data?.reply || "Ciao! Sono Tony, il tuo assistente operativo.";
    addMessage(reply, "ai");

    if (data?.chart) renderChart(data.chart);

    conversation.push({ role: "assistant", content: reply });
    setTonyStatus("Assistente operativo");

  } catch {
    addMessage("Ciao! Sono Tony. Come posso aiutarti oggi?", "ai");
    setTonyStatus("Assistente operativo");
  }
}

function setVh() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}
setVh();
window.addEventListener("resize", setVh);

function initChat() {
  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");
  const mic = document.getElementById("chat-mic");
  const chips = document.querySelectorAll(".chat-chip");

  loadInitialBriefing();

  // ── Invia messaggio testo ──
  async function sendMessage(forcedPrompt = "") {
    const prompt = (forcedPrompt || input?.value || "").trim();
    if (!prompt) return;

    addMessage(prompt, "user");
    conversation.push({ role: "user", content: prompt });

    if (input) input.value = "";
    if (send) send.disabled = true;

    setTonyStatus("⏳ Tony sta scrivendo...");
    const loadingBubble = addMessage("Tony sta scrivendo...", "ai");

    try {
      const data = await callTony(conversation);

      if (loadingBubble) loadingBubble.parentElement?.remove();

      const reply = data?.reply || "Nessuna risposta.";
      addMessage(reply, "ai", {
        action: data?.action,
        actionExecuted: data?.action_executed,
      });

      conversation.push({ role: "assistant", content: reply });

      if (data?.chart) renderChart(data.chart);

      // Gestione azione ricetta
      if (data?.action?.type === "crea_ricetta" && data?.action_executed) {
        setTimeout(() => {
          if (confirm("Tony ha creato la ricetta! Vuoi aprirla per completarla?")) {
            const ricettaId = data?.action_result?.id;
            if (ricettaId) window.location.hash = `#/crea-ricetta?id=${ricettaId}`;
          }
        }, 500);
      }

    } catch {
      if (loadingBubble) loadingBubble.textContent = "Errore nella risposta di Tony";
    }

    if (send) send.disabled = false;
    setTonyStatus("Assistente operativo");
    scrollChatToBottom();
  }

  // ── Bottone invio ──
  if (send) send.onclick = () => sendMessage();

  // ── Enter per inviare ──
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
    });
  }

  // ── Chip rapidi ──
  chips.forEach(chip => {
    chip.onclick = () => {
      const voiceMode = chip.dataset.voice;
      const prompt = chip.dataset.prompt;

      if (voiceMode === "ricetta") {
        // Attiva microfono con modalità ricetta
        if (!isRecording) {
          addMessage("🎤 Parla ora: descrivi la ricetta (nome, ingredienti, dosi, conservazione, porzionatura...)", "ai");
          startRecording().then(() => {
            // Il bottone mic gestirà lo stop
          });
        }
        return;
      }

      if (prompt) sendMessage(prompt);
    };
  });

  // ── Bottone microfono ──
  if (mic) {
    mic.onclick = async () => {
      if (!isRecording) {
        await startRecording();
      } else {
        await sendVoiceMessage();
      }
    };
  }
}
