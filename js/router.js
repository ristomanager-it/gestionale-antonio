// js/router.js

import { supabase } from "./supabaseClient.js";

let app = null;

/* =========================================================
   ROUTES
========================================================= */

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  homePiattaforma: () => import("./views/home-piattaforma.js"),
  creaAzienda: () => import("./views/crea-azienda.js"),
  gestioneAziende: () => import("./views/gestione-aziende.js"),
  modificaAzienda: () => import("./views/modifica-azienda.js"),
  setPassword: () => import("./views/set-password.js"),

  dipendenti: () => import("./views/dipendenti.js"),
  timbrature: () => import("./views/timbrature.js"),

  acquisti: () => import("./views/acquisti.js"),
  magazzino: () => import("./views/magazzino.js"),
  produzione: () => import("./views/produzione.js"),
  ricettario: () => import("./views/ricettario.js"),
  creaRicetta: () => import("./views/crea-ricetta.js"),
  preparazioni: () => import("./views/preparazioni.js"),

  venduto: () => import("./views/venduto.js"),
  margini: () => import("./views/margini.js"),

  preventivi: () => import("./views/preventivi.js"),
  creaPreventivo: () => import("./views/crea-preventivo.js"),
};

/* =========================================================
   MENU LATERALE
========================================================= */

function initMenu() {
  const menu = document.getElementById("global-menu");
  const toggle = document.getElementById("menu-toggle");

  if (!menu || !toggle) return;

  // Overlay
  let overlay = document.querySelector(".menu-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "menu-overlay";
    document.body.appendChild(overlay);
  }

  const items = [
    { label: "Home", route: "home" },
    { label: "Produzione", route: "produzione" },
    { label: "Magazzino", route: "magazzino" },
    { label: "Ricettario", route: "ricettario" },
    { label: "Dipendenti", route: "dipendenti" },
    { label: "Report", route: "report" },
  ];

  menu.innerHTML = items.map(i => `
    <div class="menu-item" data-route="${i.route}">
      ${i.label}
    </div>
  `).join("");

  function openMenu() {
    menu.classList.add("open");
    overlay.classList.add("open");
  }

  function closeMenu() {
    menu.classList.remove("open");
    overlay.classList.remove("open");
  }

  toggle.onclick = () => {
    if (menu.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  overlay.onclick = closeMenu;

  menu.querySelectorAll(".menu-item").forEach(item => {
    item.onclick = () => {
      const route = item.dataset.route;
      window.location.hash = "#/" + route;
      closeMenu();
    };
  });

  window.addEventListener("hashchange", () => {
    const current = window.location.hash.replace("#/", "");
    menu.querySelectorAll(".menu-item").forEach(i => {
      i.classList.toggle("active", i.dataset.route === current);
    });
  });
}

/* =========================================================
   PARSE HASH
========================================================= */

function parseHash() {
  const raw = window.location.hash || "#/login";
  const cleaned = raw.replace("#/", "");
  const [path, queryString] = cleaned.split("?");

  const params = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
  }

  const segments = path.split("/").filter(Boolean);

  return {
    route: segments[0] || "login",
    segments,
    params,
  };
}

/* =========================================================
   RENDER VIEW
========================================================= */

async function renderView(routeName) {
  if (!routes[routeName]) routeName = "home";
  if (!app) return;

  app.innerHTML = "";

  const module = await routes[routeName]();

  if (!module.render) {
    throw new Error(`La view ${routeName} non esporta render()`);
  }

  await module.render(app);
}

/* =========================================================
   PERMESSI
========================================================= */

function hasFeature(area) {
  const azienda = window.state?.azienda;
  if (azienda?.stato === "piattaforma") return true;

  const features = azienda?.features || {};
  return features[area] === true;
}

function hasPermission(area) {
  const ruolo = window.state?.ruolo;
  if (ruolo === "superadmin") return true;

  const azienda = window.state?.azienda;
  if (azienda?.stato === "piattaforma") return true;

  const permessi = window.state?.permessi || {};
  const override = window.state?.permessiOverride || {};

  if (!hasFeature(area)) return false;

  if (override.hasOwnProperty(area)) {
    return override[area] === true;
  }

  return permessi[`${area}.read`] === true;
}

/* =========================================================
   ROUTER CORE
========================================================= */

async function resolve() {

  if (!app) return;

  if (!window.location.hash) {
    window.location.hash = "#/login";
    return;
  }

  const { route } = parseHash();

  let { data } = await supabase.auth.getSession();
  let session = data.session;

  if (!session) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed?.session;
  }

  if (!session) {
    document.querySelector(".app-header").style.display = "none";
    await renderView("login");
    return;
  }

  document.querySelector(".app-header").style.display = "flex";

  /* HEADER POPOLAMENTO */

  const nomeAziendaEl = document.getElementById("header-azienda-nome");
  const logoEl = document.getElementById("header-logo");
  const avatarEl = document.getElementById("header-avatar");
  const userNameEl = document.getElementById("header-user-name");
  const logoutBtn = document.getElementById("logout-btn");

  if (window.state?.azienda && nomeAziendaEl) {
    nomeAziendaEl.textContent = window.state.azienda.nome || "";
  }

  if (window.state?.azienda && logoEl) {
    if (window.state.azienda.logo_url) {
      logoEl.src = window.state.azienda.logo_url;
      logoEl.style.display = "block";
    } else {
      logoEl.style.display = "none";
    }
  }

  if (userNameEl && avatarEl) {
    const email = session.user.email || "";
    const nome = email.split("@")[0];
    userNameEl.textContent = nome;
    avatarEl.textContent = nome.substring(0, 2).toUpperCase();
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      window.location.hash = "#/login";
    };
  }

  if (routes[route] && route !== "home" && route !== "homePiattaforma") {
    if (!hasPermission(route)) {
      window.location.hash = "#/home";
      return;
    }
  }

  await renderView(route);
}

/* =========================================================
   INIT
========================================================= */

window.addEventListener("hashchange", resolve);

window.addEventListener("DOMContentLoaded", () => {
  app = document.getElementById("app");
  initMenu();
  resolve();
});
