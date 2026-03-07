import { createPageLayout } from "../utils/pageLayout.js";
import { supabase } from "../supabaseClient.js";

let conversation = [];

export async function render(app) {
  conversation = [];

  const html = createPageLayout({
    title: "Tony",
    subtitle: "Il tuo assistente AI Ristoflow",

    content: `
      <div class="chat-shell">

        <div class="chat-header">
          <div class="chat-header-left">
            <div class="chat-avatar">T</div>
            <div class="chat-header-meta">
              <div class="chat-name">Tony</div>
              <div class="chat-status">Assistente operativo del gestionale</div>
            </div>
          </div>
        </div>

        <div id="chat-messages" class="chat-messages"></div>

        <div class="chat-quick-actions">
          <button class="chat-chip" data-prompt="Dammi il briefing operativo di oggi">Briefing oggi</button>
          <button class="chat-chip" data-prompt="Aiutami a usare gli ingredienti che ho nel frigo">Usa il frigo</button>
          <button class="chat-chip" data-prompt="Guidami nell'inserimento di una ricetta">Nuova ricetta</button>
          <button class="chat-chip" data-prompt="Guidami nel caricamento di una fattura">Carica fattura</button>
        </div>

        <div class="chat-input-bar">
          <textarea
            id="chat-input"
            rows="1"
            placeholder="Scrivi a Tony..."
          ></textarea>

          <button id="chat-send" class="chat-send-btn">
            ➤
          </button>
        </div>

      </div>

      <style>
        .chat-shell{
          display:flex;
          flex-direction:column;
          height:78vh;
          background:#e5ddd5;
          border-radius:18px;
          overflow:hidden;
          box-shadow:0 10px 30px rgba(0,0,0,0.08);
        }

        .chat-header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:14px 18px;
          background:#0E5A7A;
          color:#fff;
        }

        .chat-header-left{
          display:flex;
          align-items:center;
          gap:12px;
        }

        .chat-avatar{
          width:42px;
          height:42px;
          border-radius:50%;
          background:rgba(255,255,255,0.18);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:700;
          font-size:18px;
        }

        .chat-header-meta{
          display:flex;
          flex-direction:column;
        }

        .chat-name{
          font-size:16px;
          font-weight:700;
          line-height:1.1;
        }

        .chat-status{
          font-size:12px;
          opacity:0.9;
          margin-top:3px;
        }

        .chat-messages{
          flex:1;
          overflow-y:auto;
          padding:18px 16px;
          display:flex;
          flex-direction:column;
          gap:10px;
          background:
            linear-gradient(rgba(229,221,213,0.92), rgba(229,221,213,0.92)),
            radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0);
          background-size:auto, 22px 22px;
        }

        .msg-row{
          display:flex;
          width:100%;
        }

        .msg-row.user{
          justify-content:flex-end;
        }

        .msg-row.ai{
          justify-content:flex-start;
        }

        .msg-bubble{
          max-width:min(78%, 760px);
          padding:10px 12px;
          border-radius:14px;
          font-size:14px;
          line-height:1.5;
          white-space:pre-wrap;
          word-break:break-word;
          box-shadow:0 1px 2px rgba(0,0,0,0.08);
          position:relative;
        }

        .msg-row.ai .msg-bubble{
          background:#ffffff;
          color:#1f2937;
          border-top-left-radius:4px;
        }

        .msg-row.user .msg-bubble{
          background:#dcf8c6;
          color:#111827;
          border-top-right-radius:4px;
        }

        .msg-meta{
          margin-top:6px;
          font-size:11px;
          color:#6b7280;
          text-align:right;
        }

        .chat-quick-actions{
          display:flex;
          gap:8px;
          padding:10px 12px;
          background:#f8fafc;
          border-top:1px solid rgba(0,0,0,0.06);
          overflow-x:auto;
        }

        .chat-chip{
          border:none;
          background:#ffffff;
          color:#0E5A7A;
          border-radius:999px;
          padding:9px 12px;
          font-size:12px;
          white-space:nowrap;
          cursor:pointer;
          box-shadow:0 1px 3px rgba(0,0,0,0.08);
        }

        .chat-chip:hover{
          background:#eef6fa;
        }

        .chat-input-bar{
          display:flex;
          align-items:flex-end;
          gap:10px;
          padding:12px;
          background:#f0f2f5;
          border-top:1px solid rgba(0,0,0,0.08);
        }

        #chat-input{
          flex:1;
          resize:none;
          max-height:120px;
          min-height:46px;
          padding:12px 14px;
          border-radius:22px;
          border:1px solid #d1d5db;
          outline:none;
          font-size:14px;
          line-height:1.4;
          background:#fff;
        }

        #chat-input:focus{
          border-color:#0E5A7A;
          box-shadow:0 0 0 3px rgba(14,90,122,0.12);
        }

        .chat-send-btn{
          width:46px;
          height:46px;
          border:none;
          border-radius:50%;
          background:#0E5A7A;
          color:#fff;
          font-size:18px;
          cursor:pointer;
          flex:0 0 auto;
        }

        .chat-send-btn:disabled{
          opacity:0.6;
          cursor:not-allowed;
        }

        @media (max-width: 768px){
          .chat-shell{
            height:calc(100vh - 170px);
            border-radius:14px;
          }

          .msg-bubble{
            max-width:88%;
          }

          .chat-quick-actions{
            padding:8px 10px;
          }
        }
      </style>
    `,
  });

  app.innerHTML = html;

  initChat();
}

function getNowTime() {
  const now = new Date();
  return now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scrollChatToBottom() {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  container.scrollTop = container.scrollHeight;
}

function addMessage(text, type) {
  const container = document.getElementById("chat-messages");
  if (!container) return null;

  const row = document.createElement("div");
  row.className = `msg-row ${type}`;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerText = text;

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.innerText = getNowTime();

  bubble.appendChild(meta);
  row.appendChild(bubble);
  container.appendChild(row);

  scrollChatToBottom();

  return bubble;
}

async function getIngredientiFrigo() {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) return [];

  const { data, error } = await supabase
    .from("ingredienti")
    .select("nome,quantita")
    .eq("azienda_id", aziendaId)
    .gt("quantita", 0)
    .limit(20);

  if (error || !data) return [];

  return data.map((i) => i.nome);
}

async function callTony(messages) {
  const ingredienti = await getIngredientiFrigo();

  const { data, error } = await supabase.functions.invoke("assistente-ai", {
    body: {
      messages,
      azienda_id: window.state?.azienda?.id,
      azienda: window.state?.azienda?.nome ?? "ristorante",
      ingredienti,
      lat: window.state?.sedeAttiva?.latitudine,
      lon: window.state?.sedeAttiva?.longitudine,
      current_page: window.location.hash || "#/ai",
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

async function loadInitialBriefing() {
  try {
    const initialMessages = [
      {
        role: "user",
        content: "Dammi il briefing operativo di oggi e guidami nell'uso del gestionale se serve.",
      },
    ];

    const data = await callTony(initialMessages);

    const reply =
      data?.reply ||
      "Ciao! Sono Tony 👋 Posso aiutarti con menu, marketing, ricette, fatture e uso del gestionale.";

    addMessage(reply, "ai");

    conversation.push({
      role: "assistant",
      content: reply,
    });
  } catch {
    const fallback =
      "Ciao! Sono Tony 👋 Posso aiutarti con menu, marketing, ricette, fatture e gestione del ristorante.";

    addMessage(fallback, "ai");

    conversation.push({
      role: "assistant",
      content: fallback,
    });
  }
}

function initChat() {
  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");
  const chips = document.querySelectorAll(".chat-chip");

  loadInitialBriefing();

  async function sendMessage(forcedPrompt = "") {
    const prompt = (forcedPrompt || input.value || "").trim();
    if (!prompt) return;

    addMessage(prompt, "user");

    conversation.push({
      role: "user",
      content: prompt,
    });

    input.value = "";
    input.style.height = "46px";

    send.disabled = true;

    const loadingBubble = addMessage("Tony sta pensando...", "ai");

    try {
      const data = await callTony(conversation);
      const reply = data?.reply || "Non ho una risposta utile in questo momento.";

      if (loadingBubble) {
        const meta = loadingBubble.querySelector(".msg-meta");
        loadingBubble.innerText = reply;
        if (meta) {
          const newMeta = document.createElement("div");
          newMeta.className = "msg-meta";
          newMeta.innerText = getNowTime();
          loadingBubble.appendChild(newMeta);
        }
      }

      conversation.push({
        role: "assistant",
        content: reply,
      });

      scrollChatToBottom();
    } catch (err) {
      if (loadingBubble) {
        const meta = loadingBubble.querySelector(".msg-meta");
        loadingBubble.innerText = "Errore connessione Tony";
        if (meta) {
          const newMeta = document.createElement("div");
          newMeta.className = "msg-meta";
          newMeta.innerText = getNowTime();
          loadingBubble.appendChild(newMeta);
        }
      }

      console.error("Tony chat error:", err);
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  send.onclick = () => sendMessage();

  input.addEventListener("input", () => {
    input.style.height = "46px";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt || "";
      sendMessage(prompt);
    });
  });
}
