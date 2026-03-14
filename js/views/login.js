import { supabase } from "../supabaseClient.js";

/* =========================================================
   RENDER LOGIN
========================================================= */

export async function render(container){

container.innerHTML=`

<div class="view">

<div class="login-wrapper">

<div class="login-logo-wrap">

<img 
src="/assets/logo-ristoflow.png"
class="login-logo"
>

</div>

<h2 class="login-title">Accesso</h2>

<div class="login-subtitle">
Accedi al tuo gestionale
</div>

<div class="form-group">
<label>Email</label>
<input 
id="login-email" 
class="input" 
type="email" 
placeholder="email@azienda.it"
>
</div>

<div class="form-group">
<label>Password</label>
<input 
id="login-password" 
class="input" 
type="password" 
placeholder="••••••••"
>
</div>

<div class="form-actions">
<button id="login-btn" class="app-button primary">
Accedi
</button>
</div>

<div id="login-msg" class="form-result"></div>

<div class="login-reset">

Password dimenticata?

<button id="reset-btn" class="login-reset-btn">
Recupera accesso
</button>

</div>

</div>

</div>

`;

initLogin()

}

/* =========================================================
   INIT LOGIN
========================================================= */

function initLogin(){

const btn=document.getElementById("login-btn")
const reset=document.getElementById("reset-btn")

btn.onclick=doLogin
reset.onclick=resetPassword

document
.getElementById("login-password")
.addEventListener("keydown",(e)=>{

if(e.key==="Enter") doLogin()

})

}

/* =========================================================
   LOGIN
========================================================= */

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

window.location.hash="#/home"

}

/* =========================================================
   RESET PASSWORD
========================================================= */

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

msg.innerHTML="<span class='success-text'>Email inviata</span>"

}
