import { supabase } from "../supabaseClient.js";

export async function render(container){

document.querySelector(".app-header")?.style.setProperty("display","none")
document.querySelector(".topbar-global")?.style.setProperty("display","none")

container.innerHTML=`

<div class="login-page">
  <div class="login-box">

    <div class="login-logo-wrap">
      <img src="assets/favicon-192.png" class="login-logo">
    </div>

    <!-- TAB SWITCHER -->
    <div style="display:flex;border-bottom:2px solid #e5e7eb;margin-bottom:20px;">
      <button id="tab-login" style="
        flex:1;padding:10px;border:none;background:none;
        font-weight:700;font-size:0.95rem;cursor:pointer;
        color:#0E5A7A;border-bottom:2px solid #0E5A7A;margin-bottom:-2px;
      ">Accedi</button>
      <button id="tab-register" style="
        flex:1;padding:10px;border:none;background:none;
        font-weight:700;font-size:0.95rem;cursor:pointer;
        color:#9ca3af;border-bottom:2px solid transparent;margin-bottom:-2px;
      ">Registrati gratis</button>
    </div>

    <!-- FORM LOGIN -->
    <div id="form-login" class="login-form">
      <div class="form-group">
        <input id="login-email" class="input" type="email" placeholder="Email">
      </div>
      <div class="form-group">
        <div style="position:relative;">
          <input id="login-password" class="input" type="password" placeholder="Password">
          <span id="toggle-password" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:14px;color:#6b7280;">👁</span>
        </div>
      </div>
      <button id="login-btn" class="app-button primary login-btn">Accedi</button>
      <div id="login-msg" class="form-result"></div>
      <div class="login-reset">
        <button id="reset-btn" class="login-reset-btn">Recupera accesso</button>
      </div>
    </div>

    <!-- FORM REGISTRAZIONE -->
    <div id="form-register" class="login-form" style="display:none;">
      <div style="background:#e8f4f8;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:0.85rem;color:#0E5A7A;font-weight:500;">
        🎁 30 giorni gratis — nessuna carta di credito richiesta
      </div>
      <div class="form-group">
        <input id="reg-nome" class="input" type="text" placeholder="Nome e cognome">
      </div>
      <div class="form-group">
        <input id="reg-locale" class="input" type="text" placeholder="Nome del ristorante / locale">
      </div>
      <div class="form-group">
        <select id="reg-tipo" class="input" style="color:#374151;">
          <option value="">Tipo di locale...</option>
          <option value="ristorante">Ristorante</option>
          <option value="pizzeria">Pizzeria</option>
          <option value="trattoria">Trattoria</option>
          <option value="bar_bistrot">Bar / Bistrot</option>
          <option value="catering_eventi">Catering / Eventi</option>
          <option value="fast_casual">Fast casual / Street food</option>
          <option value="hotel_restaurant">Ristorante d'albergo</option>
          <option value="altro">Altro</option>
        </select>
      </div>
      <div class="form-group">
        <input id="reg-email" class="input" type="email" placeholder="Email">
      </div>
      <div class="form-group">
        <div style="position:relative;">
          <input id="reg-password" class="input" type="password" placeholder="Password (min. 8 caratteri)">
          <span id="toggle-reg-password" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:14px;color:#6b7280;">👁</span>
        </div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:16px;">
        <input type="checkbox" id="reg-privacy" style="margin-top:3px;flex-shrink:0;">
        <label for="reg-privacy" style="font-size:0.78rem;color:#6b7280;line-height:1.5;">
          Accetto la <a href="https://ristoflow-ai.com/privacy.html" target="_blank" style="color:#0E5A7A;">Privacy Policy</a> e i <a href="https://ristoflow-ai.com/terms.html" target="_blank" style="color:#0E5A7A;">Termini di servizio</a>
        </label>
      </div>
      <button id="reg-btn" class="app-button primary login-btn">Crea account gratis →</button>
      <div id="reg-msg" class="form-result"></div>
    </div>

  </div>
</div>
`;

initLogin();
initRegister();
initTabs();
}

/* ── TABS ──────────────────────────────────────────────── */

function initTabs(){
  const tabLogin = document.getElementById("tab-login");
  const tabReg = document.getElementById("tab-register");
  const formLogin = document.getElementById("form-login");
  const formReg = document.getElementById("form-register");

  tabLogin.onclick = () => {
    formLogin.style.display = "";
    formReg.style.display = "none";
    tabLogin.style.color = "#0E5A7A";
    tabLogin.style.borderBottomColor = "#0E5A7A";
    tabReg.style.color = "#9ca3af";
    tabReg.style.borderBottomColor = "transparent";
  };

  tabReg.onclick = () => {
    formLogin.style.display = "none";
    formReg.style.display = "";
    tabReg.style.color = "#0E5A7A";
    tabReg.style.borderBottomColor = "#0E5A7A";
    tabLogin.style.color = "#9ca3af";
    tabLogin.style.borderBottomColor = "transparent";
  };

  // Se arriva da ?register=1 apre direttamente la tab registrazione
  if (window.location.search.includes("register=1") || window.location.hash.includes("register")) {
    tabReg.click();
  }
}

/* ── LOGIN ─────────────────────────────────────────────── */

function initLogin(){
  const btn = document.getElementById("login-btn");
  const reset = document.getElementById("reset-btn");
  const toggle = document.getElementById("toggle-password");

  btn.onclick = doLogin;
  reset.onclick = resetPassword;

  toggle.onclick = () => {
    const input = document.getElementById("login-password");
    if(input.type === "password"){ input.type = "text"; toggle.innerText = "🙈"; }
    else { input.type = "password"; toggle.innerText = "👁"; }
  };

  document.getElementById("login-password").addEventListener("keydown", (e) => {
    if(e.key === "Enter") doLogin();
  });
}

async function doLogin(){
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const msg = document.getElementById("login-msg");

  msg.innerHTML = "Accesso in corso...";

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if(error){
    msg.innerHTML = "<span class='error-text'>" + error.message + "</span>";
    return;
  }

  if(window.stateActions?.setUser) window.stateActions.setUser(data.user);
  document.querySelector(".app-header")?.style.removeProperty("display");
  document.querySelector(".topbar-global")?.style.removeProperty("display");
  window.location.hash = "#/home";
}

async function resetPassword(){
  const email = document.getElementById("login-email").value.trim();
  const msg = document.getElementById("login-msg");

  if(!email){
    msg.innerHTML = "<span class='error-text'>Inserisci prima la tua email</span>";
    return;
  }

  msg.innerHTML = "Invio email...";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "#/set-password"
  });

  if(error){
    msg.innerHTML = "<span class='error-text'>" + error.message + "</span>";
    return;
  }

  msg.innerHTML = "<span class='success-text'>Email inviata ✔</span>";
}

/* ── REGISTRAZIONE ─────────────────────────────────────── */

function initRegister(){
  const toggle = document.getElementById("toggle-reg-password");
  toggle.onclick = () => {
    const input = document.getElementById("reg-password");
    if(input.type === "password"){ input.type = "text"; toggle.innerText = "🙈"; }
    else { input.type = "password"; toggle.innerText = "👁"; }
  };

  document.getElementById("reg-btn").onclick = doRegister;
}

async function doRegister(){
  const nome = document.getElementById("reg-nome").value.trim();
  const locale = document.getElementById("reg-locale").value.trim();
  const tipo = document.getElementById("reg-tipo").value;
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  const privacy = document.getElementById("reg-privacy").checked;
  const msg = document.getElementById("reg-msg");
  const btn = document.getElementById("reg-btn");

  // Validazione
  if(!nome){ msg.innerHTML = "<span class='error-text'>Inserisci il tuo nome</span>"; return; }
  if(!locale){ msg.innerHTML = "<span class='error-text'>Inserisci il nome del locale</span>"; return; }
  if(!tipo){ msg.innerHTML = "<span class='error-text'>Seleziona il tipo di locale</span>"; return; }
  if(!email){ msg.innerHTML = "<span class='error-text'>Inserisci l'email</span>"; return; }
  if(password.length < 8){ msg.innerHTML = "<span class='error-text'>Password minimo 8 caratteri</span>"; return; }
  if(!privacy){ msg.innerHTML = "<span class='error-text'>Accetta la privacy policy per continuare</span>"; return; }

  btn.disabled = true;
  btn.textContent = "Creazione account...";
  msg.innerHTML = "";

  try {
    // 1. Crea utente Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome_completo: nome }
      }
    });

    if(authError) throw new Error(authError.message);
    if(!authData?.user) throw new Error("Errore creazione utente");

    const userId = authData.user.id;

    // 2. Crea azienda in trial
    // 2-5. Crea azienda + collega utente + notifica Antonio via Edge Function (service role)
    const { data: regData, error: regError } = await supabase.functions.invoke("ristoflow-registra-utente", {
      body: { user_id: userId, nome, locale, tipo, email }
    });

    if(regError || !regData?.ok) {
      throw new Error(regData?.error || regError?.message || "Errore registrazione azienda");
    }

    const aziendaId = regData.azienda_id;

    // 5. Accedi automaticamente
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if(loginError) {
      // Account creato ma login fallito — manda alla verifica email
      msg.innerHTML = "<span class='success-text'>✅ Account creato! Controlla la tua email per confermare.</span>";
      btn.disabled = false;
      btn.textContent = "Crea account gratis →";
      return;
    }

    if(window.stateActions?.setUser) window.stateActions.setUser(loginData.user);
    document.querySelector(".app-header")?.style.removeProperty("display");
    document.querySelector(".topbar-global")?.style.removeProperty("display");

    // Vai al completamento profilo
    window.location.hash = "#/completaAzienda";

  } catch(err) {
    msg.innerHTML = "<span class='error-text'>" + (err.message || "Errore registrazione") + "</span>";
    btn.disabled = false;
    btn.textContent = "Crea account gratis →";
  }
}
