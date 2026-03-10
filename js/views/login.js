import { supabase } from "../supabaseClient.js";

/* =========================================================
   RENDER LOGIN
========================================================= */

export async function render(container){

container.innerHTML=`

<div class="view">

<div style="max-width:420px;margin:0 auto;text-align:center">

<img src="/logo.png" style="width:90px;margin-bottom:20px">

<h2 style="margin-bottom:6px">Accesso</h2>

<div style="color:var(--color-text-muted);margin-bottom:26px">
Accedi al tuo gestionale
</div>

<div class="form-group">
<label>Email</label>
<input id="login-email" class="input" type="email" placeholder="email@azienda.it">
</div>

<div class="form-group">
<label>Password</label>
<input id="login-password" class="input" type="password" placeholder="••••••••">
</div>

<div class="form-actions">
<button id="login-btn" class="app-button primary">
Accedi
</button>
</div>

<div id="login-msg" class="form-result"></div>

<div style="margin-top:20px;font-size:14px;color:var(--color-text-muted)">
Password dimenticata?
<button id="reset-btn" style="border:none;background:none;color:var(--color-primary);cursor:pointer">
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
