// js/router.js
// =======================================
// ROUTER MINIMO – LOGIN → HOME
// =======================================

import "./state.js";
import "./stateActions.js";
import "./supabaseClient.js";

const appRoot = document.getElementById("app");

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
};

function getRoute() {
  return window.location.hash.replace("#/", "") || "login";
}

async function renderView(name) {
  appRoot.innerHTML = "";
  const view = await routes[name]();
  await view.render(appRoot);
}

async function resolve() {
  const {
    data: { session },
  } = await window.supabaseClient.auth.getSession();

  const route = getRoute();

  // 🔴 NON LOGGATO → LOGIN
  if (!session) {
    await renderView("login");
    return;
  }

  // ✅ LOGGATO → HOME (SEMPRE)
  window.stateActions.setUser(session.user);

  if (route !== "home") {
    window.location.hash = "#/home";
    return;
  }

  await renderView("home");
}

function init() {
  window.addEventListener("hashchange", resolve);
  resolve();
}

window.router = { init };
window.router.init();
