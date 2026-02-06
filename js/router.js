// js/router.js
// =======================================
// ROUTER MINIMO DI EMERGENZA
// (serve SOLO a far vedere il login)
// =======================================

import "./state.js";
import "./stateActions.js";

const appRoot = document.getElementById("app");

// DEBUG VISIVO IMMEDIATO
appRoot.innerHTML = "<p>Router caricato</p>";

async function renderLogin() {
  const view = await import("./views/login.js");
  appRoot.innerHTML = "";
  view.render(appRoot);
}

function init() {
  console.log("Router init");
  renderLogin();
}

window.router = { init };
window.router.init();
