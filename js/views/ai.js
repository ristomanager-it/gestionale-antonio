import { createPageLayout } from "../utils/pageLayout.js";
import { supabase } from "../supabaseClient.js";

export async function render(app){

  const html = createPageLayout({
    title:"Tony",
    subtitle:"Il tuo assistente intelligente",

    content:`

      <div class="ai-chat-wrapper">

        <div id="chat-messages" class="ai-chat-messages"></div>

        <div class="ai-chat-input">

          <input
            id="ai-prompt"
            placeholder="Chiedi a Tony..."
          />

          <button id="ai-send">
            Invia
          </button>

        </div>

      </div>

      <style>

      .ai-chat-wrapper{
        display:flex;
        flex-direction:column;
        height:70vh;
        background:white;
        border-radius:12px;
        overflow:hidden;
      }

      .ai-chat-messages{
        flex:1;
        padding:20px;
        overflow-y:auto;
        background:#f7f7f7;
      }

      .msg{
        max-width:70%;
        padding:12px 14px;
        border-radius:10px;
        margin-bottom:12px;
        line-height:1.4;
      }

      .msg.user{
        background:#0E5A7A;
        color:white;
        margin-left:auto;
      }

      .msg.ai{
        background:white;
        border:1px solid #ddd;
      }

      .ai-chat-input{
        display:flex;
        border-top:1px solid #ddd;
      }

      .ai-chat-input input{
        flex:1;
        padding:14px;
        border:none;
        outline:none;
      }

      .ai-chat-input button{
        padding:0 20px;
        border:none;
        background:#0E5A7A;
        color:white;
        cursor:pointer;
      }

      </style>

    `
  });

  app.innerHTML=html;

  initChat();
}

function addMessage(text,type){

  const box=document.getElementById("chat-messages");

  const div=document.createElement("div");
  div.className="msg "+type;
  div.innerText=text;

  box.appendChild(div);
  box.scrollTop=box.scrollHeight;

}

function initChat(){

  const input=document.getElementById("ai-prompt");
  const send=document.getElementById("ai-send");

  addMessage("Ciao! Sono Tony 👋 Posso aiutarti con menu, marketing e gestione del ristorante.", "ai");

  send.onclick=async()=>{

    const prompt=input.value.trim();
    if(!prompt) return;

    addMessage(prompt,"user");

    input.value="";

    addMessage("Tony sta pensando...","ai");

    try{

      const {data,error}=await supabase.functions.invoke(
        "assistente-ai",
        {
          body:{
            prompt,
            azienda:window.state?.azienda?.nome ?? "ristorante",
            ingredienti:window.state?.ingredienti ?? [],
            lat:window.state?.sedeAttiva?.latitudine,
            lon:window.state?.sedeAttiva?.longitudine
          }
        }
      );

      if(error) throw error;

      const messages=document.querySelectorAll(".msg.ai");
      messages[messages.length-1].innerText=data.reply;

    }catch(err){

      const messages=document.querySelectorAll(".msg.ai");
      messages[messages.length-1].innerText="Errore connessione AI";

    }

  };

}
