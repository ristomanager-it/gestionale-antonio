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
        <div class="chat-status" id="tony-status">
          Assistente operativo
        </div>
      </div>
    </div>
  </div>

  <div id="chat-messages" class="chat-messages"></div>

  <div class="chat-quick-actions">
    <button class="chat-chip" data-prompt="Dammi il briefing operativo di oggi">
      📊 Briefing
    </button>

    <button class="chat-chip" data-prompt="Quali piatti devo produrre oggi?">
      🍳 Produzione
    </button>

    <button class="chat-chip" data-prompt="Analizza le vendite degli ultimi giorni">
      📈 Vendite
    </button>

    <button class="chat-chip" data-prompt="Dimmi se ho prodotti sottoscorta">
      📦 Magazzino
    </button>

    <button class="chat-chip" data-prompt="Dammi suggerimenti marketing per oggi">
      📢 Marketing
    </button>

    <button class="chat-chip" data-voice="ricetta">
      🎤 Nuova ricetta
    </button>

    <button class="chat-chip" data-prompt="Cosa devo spingere in sala oggi?">
      🍽️ Sala
    </button>
  </div>

  <div
    id="voice-transcript-bar"
    style="display:none;"
  >
    🎤
    <span id="voice-transcript-text">
      Trascrizione in corso...
    </span>
  </div>

  <div class="chat-input-bar">

    <button
      id="chat-mic"
      class="chat-mic-btn"
      title="Parla con Tony"
    >
      🎤
    </button>

    <textarea
      id="chat-input"
      rows="1"
      placeholder="Scrivi a Tony..."
    ></textarea>

    <button
      id="chat-send"
      class="chat-send-btn"
    >
      ➤
    </button>

  </div>

</div>

<style>

:root{
  --app-header-height:72px;
  --bottom-nav-height:78px;

  --wa-bg:#efeae2;
  --wa-header:#0E5A7A;
  --wa-user:#d9fdd3;
  --wa-ai:#ffffff;
  --wa-input:#ffffff;
  --wa-border:#d1d7db;
}

/* =========================================================
   CHAT SHELL
========================================================= */

.chat-shell{
  position:relative;

  display:flex;
  flex-direction:column;

  width:100%;

  height:calc(
    100dvh
    - var(--app-header-height)
    - var(--bottom-nav-height)
  );

  min-height:0;

  background:var(--wa-bg);

  overflow:hidden;
}

/* =========================================================
   HEADER
========================================================= */

.chat-header{
  position:sticky;
  top:0;
  z-index:20;

  height:64px;
  min-height:64px;

  display:flex;
  align-items:center;

  padding:0 14px;

  background:var(--wa-header);
  color:white;

  box-shadow:0 1px 2px rgba(0,0,0,.15);

  flex-shrink:0;
}

.chat-header-left{
  display:flex;
  align-items:center;
  gap:10px;
}

.chat-avatar-img{
  width:40px;
  height:40px;
  border-radius:50%;
  object-fit:cover;
}

.chat-name{
  font-size:15px;
  font-weight:600;
  line-height:1;
}

.chat-status{
  margin-top:3px;
  font-size:11px;
  opacity:.85;
}

/* =========================================================
   MESSAGES
========================================================= */

.chat-messages{
  flex:1;
  min-height:0;

  overflow-y:auto;
  overflow-x:hidden;

  display:flex;
  flex-direction:column;
  gap:10px;

  padding:12px 10px 20px;

  -webkit-overflow-scrolling:touch;
  scroll-behavior:smooth;
}

.msg-row{
  width:100%;

  display:flex;
  align-items:flex-end;
  gap:6px;
}

.msg-row.user{
  justify-content:flex-end;
}

.msg-avatar{
  width:30px;
  height:30px;

  border-radius:50%;
  object-fit:cover;

  flex-shrink:0;
}

.msg-row.user .msg-avatar{
  display:none;
}

.msg-bubble{
  max-width:82%;

  padding:9px 11px 6px;

  border-radius:8px;

  font-size:14px;
  line-height:1.45;

  position:relative;

  word-break:break-word;

  background:var(--wa-ai);

  box-shadow:0 1px .5px rgba(0,0,0,.13);
}

.msg-row.user .msg-bubble{
  background:var(--wa-user);
  border-top-right-radius:2px;
}

.msg-row.ai .msg-bubble{
  border-top-left-radius:2px;
}

.msg-meta{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:4px;

  margin-top:4px;

  font-size:10px;
  color:#667781;
}

.msg-voice-badge{
  display:inline-flex;
  align-items:center;
  gap:4px;

  margin-bottom:6px;

  font-size:10px;

  padding:3px 7px;

  border-radius:999px;

  background:rgba(14,90,122,.1);
  color:#0E5A7A;
}

.msg-action-card{
  margin-top:8px;

  padding:8px 10px;

  border-radius:8px;

  background:rgba(14,90,122,.08);

  border:1px solid rgba(14,90,122,.15);

  font-size:12px;
}

/* =========================================================
   QUICK ACTIONS
========================================================= */

.chat-quick-actions{
  display:flex;
  gap:8px;

  overflow-x:auto;

  padding:8px 10px;

  background:#f0f2f5;

  border-top:1px solid #e5e7eb;

  scrollbar-width:none;

  -webkit-overflow-scrolling:touch;

  flex-shrink:0;
}

.chat-quick-actions::-webkit-scrollbar{
  display:none;
}

.chat-chip{
  flex-shrink:0;

  border:none;

  background:white;

  border-radius:999px;

  padding:8px 12px;

  font-size:12px;

  white-space:nowrap;

  cursor:pointer;

  box-shadow:0 1px 2px rgba(0,0,0,.08);
}

/* =========================================================
   INPUT BAR
========================================================= */

.chat-input-bar{
  position:sticky;
  bottom:0;
  z-index:30;

  display:flex;
  align-items:flex-end;
  gap:8px;

  padding:8px 10px;

  background:#f0f2f5;

  border-top:1px solid #dfe3e8;

  flex-shrink:0;
}

#chat-input{
  flex:1;

  min-height:42px;
  max-height:110px;

  resize:none;

  border:none;
  outline:none;

  border-radius:22px;

  padding:11px 14px;

  font-size:16px;
  line-height:1.4;

  background:var(--wa-input);

  overflow-y:auto;

  -webkit-appearance:none;
}

.chat-send-btn,
.chat-mic-btn{
  width:44px;
  height:44px;

  border:none;
  border-radius:50%;

  flex-shrink:0;

  display:flex;
  align-items:center;
  justify-content:center;

  cursor:pointer;
}

.chat-send-btn{
  background:#0E5A7A;
  color:white;
  font-size:18px;
}

.chat-mic-btn{
  background:white;
  font-size:19px;
}

.chat-mic-btn.recording{
  background:#dc2626;
  color:white;
  animation:pulse-mic 1s infinite;
}

@keyframes pulse-mic{
  0%{
    transform:scale(1);
  }

  50%{
    transform:scale(1.08);
  }

  100%{
    transform:scale(1);
  }
}

/* =========================================================
   TRANSCRIPT BAR
========================================================= */

#voice-transcript-bar{
  padding:8px 12px;
  font-size:12px;

  background:#fff3cd;
  color:#856404;

  border-top:1px solid #ffc107;
}

/* =========================================================
   CHART
========================================================= */

.chart-box{
  width:100%;

  overflow:hidden;

  background:white;

  border-radius:10px;

  padding:10px;
}

/* =========================================================
   DESKTOP
========================================================= */

@media (min-width: 900px){

  .chat-shell{
    max-width:1100px;

    margin:auto;

    border-radius:18px;

    box-shadow:0 10px 30px rgba(0,0,0,.08);
  }

}

</style>
`
  });

  app.innerHTML = html;

  initChat();
}

function getNowTime() {
  return new Date().toLocaleTimeString(
    "it-IT",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function addMessage(text, type, options = {}) {
  const container = document.getElementById("chat-messages");

  if (!container) return null;

  const row = document.createElement("div");
  row.className = `msg-row ${type}`;

  const avatar = document.createElement("img");
  avatar.className = "msg-avatar";
  avatar.src = type === "ai"
    ? TONY_AVATAR
    : USER_AVATAR;

  row.appendChild(avatar);

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  if (options.isVoice) {
    const badge = document.createElement("span");

    badge.className = "msg-voice-badge";
    badge.textContent = "🎤 vocale";

    bubble.appendChild(badge);
  }

  const textNode = document.createElement("span");
  textNode.textContent = text;

  bubble.appendChild(textNode);

  if (options.action && options.actionExecuted) {
    const card = document.createElement("div");

    card.className = "msg-action-card";

    card.innerHTML = `
      <strong>✅ Azione eseguita:</strong>
      ${escapeHtml(options.action.type.replace(/_/g, " "))}
    `;

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

  if (!container || !chart?.labels || !chart?.data) {
    return;
  }

  const box = document.createElement("div");
  box.className = "chart-box";

  const canvas = document.createElement("canvas");

  box.appendChild(canvas);

  container.appendChild(box);

  new Chart(canvas, {
    type: "bar",
    data: {
      labels: chart.labels,
      datasets: [
        {
          label: chart.label || "Vendite",
          data: chart.data,
          backgroundColor: "rgba(14,90,122,0.7)",
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      }
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

  const { data, error } = await supabase.functions.invoke(
    "assistente-ai",
    { body }
  );

  if (error) {
    throw error;
  }

  return data;
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    audioChunks = [];

    const mimeType =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

    mediaRecorder = new MediaRecorder(
      stream,
      { mimeType }
    );

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
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

    alert(
      "Impossibile accedere al microfono. Controlla i permessi del browser."
    );
  }
}

function stopRecording() {
  return new Promise((resolve) => {

    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = async () => {

      const blob = new Blob(
        audioChunks,
        { type: mediaRecorder.mimeType }
      );

      mediaRecorder.stream?.getTracks().forEach((t) => t.stop());

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

  const bar = document.getElementById("voice-transcript-bar");
  const barText = document.getElementById("voice-transcript-text");

  if (bar) {
    bar.style.display = "block";
  }

  if (barText) {
    barText.textContent = "Trascrizione in corso...";
  }

  const loadingBubble = addMessage(
    "Tony sta ascoltando...",
    "ai"
  );

  try {

    const messagesForTony = promptPrefix
      ? [
          ...conversation,
          {
            role: "system",
            content: \`Modalità: \${promptPrefix}\`
          }
        ]
      : conversation;

    const data = await callTony(
      messagesForTony,
      audioBase64
    );

    if (loadingBubble) {
      loadingBubble.parentElement?.remove();
    }

    const voiceInput = data?.voice_input;

    if (voiceInput) {

      if (barText) {
        barText.textContent = \`"\${voiceInput}"\`;
      }

      addMessage(
        voiceInput,
        "user",
        { isVoice: true }
      );

      conversation.push({
        role: "user",
        content: voiceInput
      });

    } else if (bar) {
      bar.style.display = "none";
    }

    const reply =
      data?.reply ||
      "Non ho capito, puoi ripetere?";

    addMessage(
      reply,
      "ai",
      {
        action: data?.action,
        actionExecuted: data?.action_executed,
      }
    );

    conversation.push({
      role: "assistant",
      content: reply
    });

    if (data?.chart) {
      renderChart(data.chart);
    }

    if (
      data?.action?.type === "crea_ricetta" &&
      data?.action_executed
    ) {

      setTimeout(() => {

        if (
          confirm(
            "Tony ha creato la ricetta! Vuoi aprirla per completarla?"
          )
        ) {

          const ricettaId =
            data?.action_result?.id;

          if (ricettaId) {
            window.location.hash =
              \`#/crea-ricetta?id=\${ricettaId}\`;
          }
        }

      }, 500);
    }

  } catch (err) {

    console.error("Tony voice error:", err);

    if (loadingBubble) {
      loadingBubble.textContent =
        "Errore nella risposta vocale";
    }

    if (bar) {
      bar.style.display = "none";
    }
  }

  setTonyStatus("Assistente operativo");
}

async function loadInitialBriefing() {

  try {

    setTonyStatus("⏳ Caricamento briefing...");

    const data = await callTony([
      {
        role: "user",
        content: "Dammi il briefing operativo di oggi"
      }
    ]);

    const reply =
      data?.reply ||
      "Ciao! Sono Tony, il tuo assistente operativo.";

    addMessage(reply, "ai");

    if (data?.chart) {
      renderChart(data.chart);
    }

    conversation.push({
      role: "assistant",
      content: reply
    });

    setTonyStatus("Assistente operativo");

  } catch {

    addMessage(
      "Ciao! Sono Tony. Come posso aiutarti oggi?",
      "ai"
    );

    setTonyStatus("Assistente operativo");
  }
}

function initChat() {

  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");
  const mic = document.getElementById("chat-mic");

  const chips = document.querySelectorAll(".chat-chip");

  loadInitialBriefing();

  async function sendMessage(forcedPrompt = "") {

    const prompt =
      (forcedPrompt || input?.value || "")
        .trim();

    if (!prompt) return;

    addMessage(prompt, "user");

    conversation.push({
      role: "user",
      content: prompt
    });

    if (input) {
      input.value = "";
    }

    if (send) {
      send.disabled = true;
    }

    setTonyStatus("⏳ Tony sta scrivendo...");

    const loadingBubble = addMessage(
      "Tony sta scrivendo...",
      "ai"
    );

    try {

      const data = await callTony(conversation);

      if (loadingBubble) {
        loadingBubble.parentElement?.remove();
      }

      const reply =
        data?.reply ||
        "Nessuna risposta.";

      addMessage(
        reply,
        "ai",
        {
          action: data?.action,
          actionExecuted: data?.action_executed,
        }
      );

      conversation.push({
        role: "assistant",
        content: reply
      });

      if (data?.chart) {
        renderChart(data.chart);
      }

      if (
        data?.action?.type === "crea_ricetta" &&
        data?.action_executed
      ) {

        setTimeout(() => {

          if (
            confirm(
              "Tony ha creato la ricetta! Vuoi aprirla per completarla?"
            )
          ) {

            const ricettaId =
              data?.action_result?.id;

            if (ricettaId) {
              window.location.hash =
                \`#/crea-ricetta?id=\${ricettaId}\`;
            }
          }

        }, 500);
      }

    } catch {

      if (loadingBubble) {
        loadingBubble.textContent =
          "Errore nella risposta di Tony";
      }
    }

    if (send) {
      send.disabled = false;
    }

    setTonyStatus("Assistente operativo");

    scrollChatToBottom();
  }

  if (send) {
    send.onclick = () => sendMessage();
  }

  if (input) {

    input.addEventListener(
      "keydown",
      (e) => {

        if (
          e.key === "Enter" &&
          !e.shiftKey
        ) {

          e.preventDefault();

          sendMessage();
        }
      }
    );

    input.addEventListener(
      "input",
      () => {

        input.style.height = "auto";

        input.style.height =
          Math.min(input.scrollHeight, 110) + "px";
      }
    );
  }

  chips.forEach((chip) => {

    chip.onclick = () => {

      const voiceMode = chip.dataset.voice;
      const prompt = chip.dataset.prompt;

      if (voiceMode === "ricetta") {

        if (!isRecording) {

          addMessage(
            "🎤 Parla ora: descrivi la ricetta (nome, ingredienti, dosi, conservazione, porzionatura...)",
            "ai"
          );

          startRecording();
        }

        return;
      }

      if (prompt) {
        sendMessage(prompt);
      }
    };
  });

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
