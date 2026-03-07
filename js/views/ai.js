import { createPageLayout } from "../utils/pageLayout.js";
import { supabase } from "../supabaseClient.js";

let conversation = [];

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
<div class="chat-status">Assistente operativo</div>
</div>

</div>

</div>

<div id="chat-messages" class="chat-messages"></div>

<div class="chat-quick-actions">

<button class="chat-chip" data-prompt="Dammi il briefing operativo di oggi">
Briefing oggi
</button>

<button class="chat-chip" data-prompt="Quali piatti devo produrre oggi?">
Produzione
</button>

<button class="chat-chip" data-prompt="Analizza le vendite degli ultimi giorni">
Vendite
</button>

<button class="chat-chip" data-prompt="Dimmi se ho prodotti sottoscorta">
Magazzino
</button>

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
height:calc(100vh - 140px);
background:#e5ddd5;
border-radius:18px;
overflow:hidden;
box-shadow:0 10px 30px rgba(0,0,0,0.08);
}

.chat-header{
display:flex;
align-items:center;
padding:14px 18px;
background:#0E5A7A;
color:#fff;
}

.chat-header-left{
display:flex;
align-items:center;
gap:12px;
}

.chat-avatar-img{
width:42px;
height:42px;
border-radius:50%;
object-fit:cover;
}

.chat-name{
font-size:16px;
font-weight:700;
}

.chat-status{
font-size:12px;
opacity:0.9;
}

.chat-messages{
flex:1;
overflow-y:auto;
padding:18px;
display:flex;
flex-direction:column;
gap:14px;
}

.msg-row{
display:flex;
gap:10px;
align-items:flex-end;
}

.msg-row.user{
flex-direction:row-reverse;
}

.msg-avatar{
width:34px;
height:34px;
border-radius:50%;
object-fit:cover;
}

.msg-bubble{
max-width:min(88%,900px);
padding:12px 14px;
border-radius:14px;
font-size:14px;
line-height:1.5;
white-space:pre-wrap;
box-shadow:0 1px 2px rgba(0,0,0,0.1);
}

.msg-row.ai .msg-bubble{
background:white;
}

.msg-row.user .msg-bubble{
background:#dcf8c6;
}

.msg-meta{
font-size:11px;
margin-top:6px;
color:#6b7280;
text-align:right;
}

.chat-quick-actions{
display:flex;
gap:8px;
padding:10px;
overflow-x:auto;
background:#f8fafc;
}

.chat-chip{
border:none;
background:white;
padding:8px 12px;
border-radius:999px;
font-size:12px;
cursor:pointer;
}

.chat-input-bar{
display:flex;
gap:10px;
padding:12px;
background:#f0f2f5;
}

#chat-input{
flex:1;
resize:none;
padding:12px;
border-radius:20px;
border:1px solid #ccc;
font-size:14px;
}

.chat-send-btn{
width:46px;
height:46px;
border-radius:50%;
border:none;
background:#0E5A7A;
color:white;
font-size:18px;
cursor:pointer;
}

.typing{
opacity:0.6;
font-style:italic;
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

  container.scrollTop = container.scrollHeight;

}

function addMessage(text,type){

const container=document.getElementById("chat-messages");

const row=document.createElement("div");
row.className=`msg-row ${type}`;

const avatar=document.createElement("img");
avatar.className="msg-avatar";
avatar.src= type==="ai" ? TONY_AVATAR : USER_AVATAR;

row.appendChild(avatar);

const bubble=document.createElement("div");
bubble.className="msg-bubble";
bubble.innerText=text;

const meta=document.createElement("div");
meta.className="msg-meta";
meta.innerText=getNowTime();

bubble.appendChild(meta);

row.appendChild(bubble);
container.appendChild(row);

scrollChatToBottom();

return bubble;

}

async function callTony(messages){

const {data,error}=await supabase.functions.invoke("assistente-ai",{

body:{
messages,
azienda_id:window.state?.azienda?.id,
azienda:window.state?.azienda?.nome,
lat:window.state?.sedeAttiva?.latitudine,
lon:window.state?.sedeAttiva?.longitudine
}

});

if(error) throw error;

return data;

}

async function loadInitialBriefing(){

try{

const initialMessages=[{
role:"user",
content:"Dammi il briefing operativo di oggi"
}];

const data=await callTony(initialMessages);

const reply=data?.reply || "Ciao! Sono Tony.";

addMessage(reply,"ai");

conversation.push({
role:"assistant",
content:reply
});

}catch{

addMessage("Ciao! Sono Tony.","ai");

}

}

function initChat(){

const input=document.getElementById("chat-input");
const send=document.getElementById("chat-send");
const chips=document.querySelectorAll(".chat-chip");

loadInitialBriefing();

async function sendMessage(forcedPrompt=""){

const prompt=(forcedPrompt||input.value||"").trim();

if(!prompt) return;

addMessage(prompt,"user");

conversation.push({
role:"user",
content:prompt
});

input.value="";

send.disabled=true;

const loadingBubble=addMessage("Tony sta scrivendo...","ai");

try{

const data=await callTony(conversation);

const reply=data?.reply || "Nessuna risposta.";

loadingBubble.innerText=reply;

conversation.push({
role:"assistant",
content:reply
});

}catch{

loadingBubble.innerText="Errore Tony";

}

send.disabled=false;

scrollChatToBottom();

}

send.onclick=()=>sendMessage();

input.addEventListener("keydown",(e)=>{

if(e.key==="Enter" && !e.shiftKey){

e.preventDefault();
sendMessage();

}

});

chips.forEach(chip=>{

chip.onclick=()=>{
sendMessage(chip.dataset.prompt);
};

});

}
