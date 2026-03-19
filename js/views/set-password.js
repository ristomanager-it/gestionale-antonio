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
  };

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
   REDIRECT LOGIC
========================================================= */

async function redirectPostLogin(user){

  const azienda = await loadAzienda(user.id);

  if(!azienda){
    window.location.hash = "#/login";
    return;
  }

  // salva nello state
  if(window.stateActions?.setAzienda){
    window.stateActions.setAzienda(azienda);
  }

  if(!azienda.profilo_completato){
    window.location.hash = "#/completa-azienda";
  }else{
    window.location.hash = "#/home";
  }

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

  const showForm = () => {

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

        <div class="form-group">
          <label>Nuova password</label>
          <input id="new-password" class="input" type="password">
        </div>

        <div class="form-group">
          <label>Conferma password</label>
          <input id="confirm-password" class="input" type="password">
        </div>

        <div class="form-actions">
          <button id="save-password" class="app-button primary">
            Salva password
          </button>
        </div>

        <div id="password-msg" class="form-result"></div>

      </div>

    </div>
    `;

    document.getElementById("save-password").onclick = async () => {

      const newPassword =
        document.getElementById("new-password").value.trim();

      const confirmPassword =
        document.getElementById("confirm-password").value.trim();

      const msg =
        document.getElementById("password-msg");

      msg.innerHTML = "";

      if (newPassword.length < 8) {
        msg.innerHTML = "<span class='error-text'>Minimo 8 caratteri</span>";
        return;
      }

      if (newPassword !== confirmPassword) {
        msg.innerHTML = "<span class='error-text'>Le password non coincidono</span>";
        return;
      }

      msg.innerHTML = "Salvataggio...";

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        msg.innerHTML = "<span class='error-text'>" + error.message + "</span>";
        return;
      }

      msg.innerHTML = "<span class='success-text'>Password salvata</span>";

      // 🚀 REDIRECT INTELLIGENTE
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

  };

  try {

    const { access_token, refresh_token } =
      readSupabaseTokensFromHash();

    if (access_token && refresh_token) {

      const { error } =
        await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

      if (error) throw error;

      showForm();
      return;

    }

    const { data } =
      await supabase.auth.getSession();

    if (data?.session) {
      showForm();
      return;
    }

    supabase.auth.onAuthStateChange((event) => {

      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN"
      ) {
        showForm();
      }

    });

  } catch (err) {

    console.error("Errore set-password:", err);

  }

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
