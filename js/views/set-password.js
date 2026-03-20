import { supabase } from "../supabaseClient.js";

/* =========================================================
   TOKEN FROM HASH
========================================================= */

function readSupabaseTokensFromHash() {

  const hash = window.location.hash || "";

  let tokenString = "";

  if (hash.includes("access_token=")) {
    tokenString = hash.substring(hash.indexOf("access_token="));
  }

  const params = new URLSearchParams(tokenString);

  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  };

}

/* =========================================================
   LOAD RELAZIONE UTENTE
========================================================= */

async function loadRelazione(userId){

  const { data, error } = await supabase
    .from("utenti_aziende")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if(error) throw error;

  return data;

}

/* =========================================================
   LOAD AZIENDA
========================================================= */

async function loadAzienda(userId){

  const { data, error } = await supabase
    .from("utenti_aziende")
    .select(`
      azienda_id,
      aziende(*)
    `)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if(error) throw error;

  return data?.aziende;

}

/* =========================================================
   REDIRECT LOGIC (RUOLI)
========================================================= */

async function redirectPostLogin(user){

  const relazione = await loadRelazione(user.id);

  if(!relazione){
    window.location.hash = "#/login";
    return;
  }

  const azienda = await loadAzienda(user.id);

  if(window.stateActions?.setAzienda){
    window.stateActions.setAzienda(azienda);
  }

  if(relazione.ruolo === "admin"){

    if(!azienda?.profilo_completato){
      window.location.hash = "#/completaAzienda";
      return;
    }

    if(azienda?.stato_attivazione === "bozza"){
      window.location.hash = "#/completaAzienda";
      return;
    }

    window.location.hash = "#/home";
    return;
  }

  const { data: dipendente } = await supabase
    .from("dipendenti")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if(!dipendente){
    window.location.hash = "#/login";
    return;
  }

  if(window.stateActions?.setSede){
    window.stateActions.setSede(dipendente.sede_id);
  }

  if(!dipendente.profilo_completato){
    window.location.hash = "#/completaProfilo";
  }else{
    window.location.hash = "#/home";
  }

}

/* =========================================================
   UI HELPERS
========================================================= */

function togglePasswordVisibility(inputId, toggleId) {
  const input = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);

  if (!input || !toggle) return;

  toggle.onclick = () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    toggle.textContent = isPassword ? "🙈" : "👁";
  };
}

function buildPasswordField(id, label, toggleId) {
  return `
    <div class="form-group">
      <label>${label}</label>
      <div style="position:relative;">
        <input id="${id}" class="input" type="password" style="padding-right:42px;">
        <span
          id="${toggleId}"
          style="
            position:absolute;
            right:12px;
            top:50%;
            transform:translateY(-50%);
            cursor:pointer;
            user-select:none;
            font-size:16px;
            color:#6b7280;
          "
        >👁</span>
      </div>
    </div>
  `;
}

/* =========================================================
   RENDER PASSWORD FORM
========================================================= */

function renderPasswordForm(container) {

  container.innerHTML = `

    <div class="view">

      <div class="login-wrapper">

        <div class="login-logo-wrap">
          <img src="assets/favicon-192.png" class="login-logo">
        </div>

        <h2 class="login-title">Crea password</h2>

        <div class="login-subtitle">
          Imposta la password per accedere
        </div>

        ${buildPasswordField("new-password", "Nuova password", "toggle-new-password")}
        ${buildPasswordField("confirm-password", "Conferma password", "toggle-confirm-password")}

        <div class="form-actions">
          <button id="save-password" class="app-button primary">
            Salva password
          </button>
        </div>

        <div id="password-msg" class="form-result"></div>

      </div>

    </div>
  `;

  togglePasswordVisibility("new-password", "toggle-new-password");
  togglePasswordVisibility("confirm-password", "toggle-confirm-password");

  const btn = document.getElementById("save-password");
  const msg = document.getElementById("password-msg");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  const handleSave = async () => {

    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    msg.innerHTML = "";

    if (newPassword.length < 8) {
      msg.innerHTML = "<span class='error-text'>Minimo 8 caratteri</span>";
      return;
    }

    if (newPassword !== confirmPassword) {
      msg.innerHTML = "<span class='error-text'>Le password non coincidono</span>";
      return;
    }

    btn.disabled = true;
    btn.innerText = "Salvataggio...";

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      msg.innerHTML = "<span class='error-text'>" + error.message + "</span>";
      btn.disabled = false;
      btn.innerText = "Salva password";
      return;
    }

    msg.innerHTML = "<span class='success-text'>Password salvata</span>";

    setTimeout(async () => {

      const { data: sessionData } =
        await supabase.auth.getSession();

      const user = sessionData?.session?.user;

      if(user){
        await redirectPostLogin(user);
      }else{
        window.location.hash = "#/login";
      }

    }, 800);

  };

  btn.onclick = handleSave;

  newPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSave();
  });

  confirmPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSave();
  });
}

/* =========================================================
   INVALID SESSION UI
========================================================= */

function renderInvalidSession(container) {
  container.innerHTML = `

    <div class="view">

      <div class="login-wrapper">

        <div class="login-logo-wrap">
          <img src="assets/favicon-192.png" class="login-logo">
        </div>

        <h2 class="login-title">Sessione non valida</h2>

        <div class="login-subtitle">
          Apri nuovamente il link ricevuto via email
        </div>

      </div>

    </div>

  `;
}

/* =========================================================
   RENDER
========================================================= */

export async function render(container) {

  container.innerHTML = `
    <div class="view">
      <div class="login-wrapper">
        <h2 class="login-title">Verifica in corso...</h2>
      </div>
    </div>
  `;

  let authListenerBound = false;

  try {

    const { access_token, refresh_token, type } =
      readSupabaseTokensFromHash();

    if (access_token && refresh_token) {

      const { error } =
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

      if (error) throw error;

      renderPasswordForm(container);
      return;

    }

    const { data } =
      await supabase.auth.getSession();

    if (data?.session) {
      renderPasswordForm(container);
      return;
    }

    if (!authListenerBound) {
      authListenerBound = true;

      supabase.auth.onAuthStateChange((event) => {

        if (
          event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN"
        ) {
          renderPasswordForm(container);
        }

      });
    }

    if (type === "recovery") {
      renderPasswordForm(container);
      return;
    }

  } catch (err) {

    console.error("Errore set-password:", err);

  }

  renderInvalidSession(container);

}
