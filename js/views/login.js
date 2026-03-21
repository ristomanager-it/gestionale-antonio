import { supabase } from "../supabaseClient.js";

export async function render(container){

// 🔥 NASCONDE HEADER E TOPBAR
document.querySelector(".app-header")?.style.setProperty("display","none")
document.querySelector(".topbar-global")?.style.setProperty("display","none")

container.innerHTML=`

<div class="login-page">

  <div class="login-box">

    <div class="login-logo-wrap">
      <img src="assets/favicon-192.png" class="login-logo">
    </div>

    <div class="login-form">

      <div class="form-group">
        <input 
          id="login-email" 
          class="input" 
          type="email" 
          placeholder="Email"
        >
      </div>

      <div class="form-group">

        <div style="position:relative;">
          <input 
            id="login-password" 
            class="input" 
            type="password" 
            placeholder="Password"
          >

          <span id="toggle-password"
          style="
          position:absolute;
          right:10px;
          top:50%;
          transform:translateY(-50%);
          cursor:pointer;
          font-size:14px;
          color:#6b7280;
          ">
          👁
          </span>

        </div>

      </div>

      <button id="login-btn" class="app-button primary login-btn">
        Accedi
      </button>

      <div id="login-msg" class="form-result"></div>

      <div class="login-reset">
        <button id="reset-btn" class="login-reset-btn">
          Recupera accesso
        </button>
      </div>

    </div>

  </div>

</div>

`;

initLogin()

}

/* ========================= */

function initLogin(){

const btn=document.getElementById("login-btn")
const reset=document.getElementById("reset-btn")
const toggle=document.getElementById("toggle-password")

btn.onclick=doLogin
reset.onclick=resetPassword

toggle.onclick=()=>{

const input=document.getElementById("login-password")

if(input.type==="password"){
input.type="text"
toggle.innerText="🙈"
}else{
input.type="password"
toggle.innerText="👁"
}

}

document
.getElementById("login-password")
.addEventListener("keydown",(e)=>{
if(e.key==="Enter") doLogin()
})

}

/* ========================= */

async function doLogin(){

const email=document.getElementById("login-email").value.trim()
const password=document.getElementById("login-password").value.trim()

const msg=document.getElementById("login-msg")

msg.innerHTML="Accesso in corso..."

const {data,error}=await supabase.auth.signInWithPassword({
email,
password
})

if(error){
msg.innerHTML="<span class='error-text'>"+error.message+"</span>"
return
}

if(window.stateActions?.setUser){
window.stateActions.setUser(data.user)
}

// 🔥 RIPRISTINA HEADER E TOPBAR
document.querySelector(".app-header")?.style.removeProperty("display")
document.querySelector(".topbar-global")?.style.removeProperty("display")

window.location.hash="#/home"

}

/* ========================= */

async function resetPassword(){

const email=document.getElementById("login-email").value.trim()
const msg=document.getElementById("login-msg")

if(!email){
msg.innerHTML="<span class='error-text'>Inserisci prima la tua email</span>"
return
}

msg.innerHTML="Invio email..."

const {error}=await supabase.auth.resetPasswordForEmail(email,{
redirectTo:window.location.origin+"#/set-password"
})

if(error){
msg.innerHTML="<span class='error-text'>"+error.message+"</span>"
return
}

msg.innerHTML="<span class='success-text'>Email inviata ✔</span>"

}
