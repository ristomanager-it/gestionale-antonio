import { createPageLayout } from "../utils/pageLayout.js";
import { supabase } from "../supabaseClient.js";

let conversation = [];

export async function render(app){

  const html = createPageLayout({
    title:"Tony",
    subtitle:"Il tuo assistente AI Ristoflow",

    content:`

      <div class="chat-container">

        <div id="chat-messages" class="chat-messages"></div>

        <div class="chat-input-bar">

          <input
            id="chat-input"
            placeholder="Scrivi a Tony..."
          />

          <button id="chat-send">
            ➤
          </button>

        </div>

      </div>

      <style>

      .chat-container{
        display:flex;
        flex-direction:column;
        height:75vh;
        background:#ece5dd;
        border-radius:14px;
        overflow:hidden;
      }

      .chat-messages{
        flex:1;
        padding:20px;
        overflow-y:auto;
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .message{
        max-width:70%;
        padding:12px 14px;
        border-radius:12px;
        font-size:15px;
        line-height:1.4;
      }

      .message.user{
        align-self:flex-end;
        background:#dcf8c6;
      }

      .message.ai{
        align-self:flex-start;
        background:white;
        border:1px solid #ddd;
      }

      .chat-input-bar{
        display:flex;
        padding:10px;
        background:white;
        border-top:1px solid #ddd;
      }

      .chat-input-bar input{
        flex:1;
        padding:12px;
        border-radius:20px;
        border:1px solid #ccc;
        outline:none;
      }

      .chat-input-bar button{
        margin-left:10px;
        padding:0 18px;
        border:none;
        border-radius:20px;
        background:#0E5A7A;
        color:white;
        font-size:18px;
        cursor:pointer;
      }

      </style>

    `
  });

  app.innerHTML = html;

  initChat();

}

function addMessage(text,type){

  const container = document.getElementById("chat-messages");

  const div = document.createElement("div");
  div.className = "message "+type;
  div.innerText = text;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

}

async function getIngredientiFrigo(){

  const aziendaId = window.state?.azienda?.id;

  if(!aziendaId) return [];

  const {data,error} = await supabase
    .from("ingredienti")
    .select("nome,quantita")
    .eq("azienda_id",aziendaId)
    .gt("quantita",0)
    .limit(20);

  if(error || !data) return [];

  return data.map(i => i.nome);

}

function initChat(){

  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");

  addMessage(
    "Ciao! Sono Tony 👋 Posso aiutarti con menu, marketing e gestione del ristorante.",
    "ai"
  );

  async function sendMessage(){

    const prompt = input.value.trim();
    if(!prompt) return;

    addMessage(prompt,"user");

    conversation.push({
      role:"user",
      content:prompt
    });

    input.value="";

    const loadingMsg = document.createElement("div");
    loadingMsg.className="message ai";
    loadingMsg.innerText="Tony sta pensando...";
    document.getElementById("chat-messages").appendChild(loadingMsg);

    try{

      const ingredienti = await getIngredientiFrigo();

      const {data,error} = await supabase.functions.invoke(
        "assistente-ai",
        {
          body:{
            messages:conversation,
            azienda:window.state?.azienda?.nome ?? "ristorante",
            ingredienti,
            lat:window.state?.sedeAttiva?.latitudine,
            lon:window.state?.sedeAttiva?.longitudine
          }
        }
      );

      if(error) throw error;

      loadingMsg.innerText = data.reply;

      conversation.push({
        role:"assistant",
        content:data.reply
      });

    }catch(err){

      loadingMsg.innerText="Errore connessione Tony";

    }

  }

  send.onclick = sendMessage;

  input.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"){
      sendMessage();
    }
  });

}
