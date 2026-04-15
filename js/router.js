import { supabase } from "./supabaseClient.js";
import { initMenu } from "./menu.js";
import { initTopbar } from "./components/topbar.js";

/* =========================================================
   SUPABASE EMAIL LINK HANDLER
   gestisce link tipo:
   https://dominio.com/#access_token=...
========================================================= */

(function fixSupabaseEmailLink() {
  const hash = window.location.hash || "";

  if (hash.startsWith("#access_token=")) {
    const tokens = hash.substring(1);
    window.location.hash = "#/set-password?" + tokens;
  }
})();

/* =========================================================
   FIX SUPABASE HASH
   #/set-password#access_token -> #/set-password?access_token
   #/activate#access_token     -> #/activate?access_token
========================================================= */

(function fixSupabaseHash() {
  const h = window.location.hash || "";

  if (h.startsWith("#/set-password#")) {
    const tokens = h.split("#")[2];
    window.location.hash = "#/set-password?" + tokens;
    return;
  }

  if (h.startsWith("#/activate#")) {
    const tokens = h.split("#")[2];
    window.location.hash = "#/activate?" + tokens;
  }
})();

let app = null;
let lastResolvedRoute = null;

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
  gestionePiani: () => import("./views/gestione-piani.js"),
  activate: () => import("./views/activate.js"),
  setPassword: () => import("./views/set-password.js"),
  "set-password": () => import("./views/set-password.js"),

  sceltaAzienda: () => import("./views/scelta-azienda.js"),
  "gestione-sedi": () => import("./views/gestione-sedi.js"),

  operativo: () => import("./views/operativo.js"),
  amministrazione: () => import("./views/amministrazione.js"),
  gestione: () => import("./views/gestione.js"),
  marketing: () => import("./views/marketing.js"),

  dipendenti: () => import("./views/dipendenti.js"),
  dipendente: () => import("./views/dipendente.js"),
  "crea-dipendente": () => import("./views/crea-dipendente.js"),
  timbrature: () => import("./views/timbrature.js"),

  completaProfilo: () => import("./views/completa-profilo.js"),
  completaAzienda: () => import("./views/completa-azienda.js"),
  acquisti: () => import("./views/acquisti/index.js"),
  magazzino: () => import("./views/magazzino/magazzino.js"),
  produzione: () => import("./views/produzione.js"),
  storicoLotto: () => import("./views/storico-lotto.js"),
  ricettario: () => import("./views/ricettario.js"),
  "planner-produzione": () => import("./views/planner-produzione.js"),
  creaRicetta: () => import("./views/crea-ricetta.js"),
  preparazioni: () => import("./views/preparazioni.js"),
  reparti: () => import("./views/reparti.js"),
  venduto: () => import("./views/venduto.js"),
  margini: () => import("./views/margini.js"),

  preventivi: () => import("./views/preventivi.js"),
  creaPreventivo: () => import("./views/crea-preventivo.js"),
  ai: () => import("./views/ai.js"),

  permessi: () => import("./views/permessi-ferie.js"),
};

/* =========================================================
   ROUTE SCOPE
========================================================= */

const PUBLIC_ROUTES = new Set(["login", "activate", "setPassword", "set-password"]);

const PLATFORM_ROUTES = new Set([
  "homePiattaforma",
  "gestioneAziende",
  "creaAzienda",
  "modificaAzienda",
  "gestionePiani",
]);

const PREHOME_ROUTES = new Set([
  "sceltaAzienda",
  "gestione-sedi",
  "completaProfilo",
  "completaAzienda",
]);

const ROOT_ROUTES = new Set(["home", "homePiattaforma"]);

/* =========================================================
   STORAGE KEYS
========================================================= */

const LS_KEYS = {
  ACTIVE_AZIENDA_ID: "active_azienda_id",
  ACTIVE_SEDE_ID: "active_sede_id",
};

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
   PERMISSION CHECK
========================================================= */

function isSuperadmin() {
  if (window.state?.isSuperadmin === true) return true;

  const aziende = window.state?.aziende || [];
  return aziende.some((a) => a.ruolo === "superadmin");
}

function hasPermission(area) {
  if (area === "home") return true;

  const ruolo = window.state?.viewAs || window.state?.ruolo;

  if (window.state?._allAccess === true) return true;

  if (isSuperadmin()) return true;

  if (area === "dipendenti" || area === "dipendente" || area === "crea-dipendente") {
    return ["admin", "segreteria", "manager_cucina", "manager_sala"].includes(ruolo);
  }

  if (area === "gestione-sedi") {
    return ruolo === "admin" || ruolo === "superadmin";
  }

  if (ruolo === "admin") return true;

  const permessi = window.state?.permessi || {};

  return permessi[`${area}.read`] === true;
}

/* =========================================================
   UI HELPERS
========================================================= */

function setHeaderVisible(visible) {
  const header = document.querySelector(".app-header");
  if (header) header.style.display = visible ? "flex" : "none";

  const topbar = document.getElementById("topbar-info");
  if (topbar) topbar.style.display = visible ? "flex" : "none";
}

function getStoredAziendaId() {
  return localStorage.getItem(LS_KEYS.ACTIVE_AZIENDA_ID);
}

function setStoredAziendaId(id) {
  if (!id) return;
  localStorage.setItem(LS_KEYS.ACTIVE_AZIENDA_ID, String(id));
}

function clearStoredAziendaId() {
  localStorage.removeItem(LS_KEYS.ACTIVE_AZIENDA_ID);
}

function getStoredSedeId() {
  return localStorage.getItem(LS_KEYS.ACTIVE_SEDE_ID);
}

function setStoredSedeId(id) {
  if (!id) return;
  localStorage.setItem(LS_KEYS.ACTIVE_SEDE_ID, String(id));
}

function clearStoredSedeId() {
  localStorage.removeItem(LS_KEYS.ACTIVE_SEDE_ID);
}

/* =========================================================
   AUTH + CONTEXT HELPERS
========================================================= */

async function getValidSession() {
  const { data } = await supabase.auth.getSession();
  let session = data?.session || null;

  if (!session) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed?.session || null;
  }

  return session;
}

async function loadAziendeForUser(userId) {
  const { data: aziende, error } = await supabase
    .from("utenti_aziende")
    .select(
      `
      ruolo,
      permessi_override,
      aziende:azienda_id (
        id,
        nome,
        codice,
        stato,
        attiva,
        data_scadenza,
        features,
        logo_path,
        logo_url,
        piano_id,
        stato_attivazione,
        profilo_completato
      )
    `
    )
    .eq("user_id", userId)
    .eq("attivo", true);

  if (error) {
    console.error("Errore caricamento aziende:", error);
    return [];
  }

  return (aziende || []).filter((a) => a.aziende);
}

function pickActiveAzienda(aziendePulite) {
  const storedId = getStoredAziendaId();

  if (storedId) {
    const match = aziendePulite.find(
      (a) => String(a.aziende.id) === String(storedId)
    );
    if (match?.aziende) return match.aziende;
  }

  if (aziendePulite.length === 1) {
    return aziendePulite[0].aziende;
  }

  return null;
}

function applyAziendaContextFromLink(aziendePulite, azienda) {
  if (!azienda) return;

  const recordAttivo = aziendePulite.find((a) => a.aziende?.id === azienda.id);

  window.state.isSuperadmin = aziendePulite.some((a) => a.ruolo === "superadmin");

  const ruoloEffettivo = window.state.isSuperadmin
    ? "superadmin"
    : recordAttivo?.ruolo || "admin";

  window.stateActions.setRuolo(ruoloEffettivo);
  window.state.ruolo = ruoloEffettivo;
  window.state.permessiOverride = recordAttivo?.permessi_override || {};
}

function isAziendaBlockedForUser(azienda, routeName) {
  if (!azienda) return true;
  if (isSuperadmin()) return false;

  if (PLATFORM_ROUTES.has(routeName)) return false;
  if (routeName === "completaAzienda") return false;

  if (azienda.stato === "piattaforma") return false;

  if (azienda.stato !== "attiva") return true;

  if (azienda.attiva === false) return true;

  return false;
}

async function ensureAziendaContext(routeName) {
  const user = window.state?.user;
  if (!user) return { ok: false, reason: "no_user" };

  const aziendePulite = await loadAziendeForUser(user.id);

  window.stateActions.setAziende(aziendePulite);

  if (aziendePulite.length === 0) {
    window.stateActions.resetAzienda();
    return { ok: false, reason: "no_aziende" };
  }

  const activeAzienda = pickActiveAzienda(aziendePulite);

  if (!activeAzienda) {
    window.stateActions.resetAzienda();
    if (routeName !== "sceltaAzienda") {
      window.location.hash = "#/sceltaAzienda";
      return { ok: false, redirected: true };
    }
    return { ok: false, reason: "need_choice" };
  }

  setStoredAziendaId(activeAzienda.id);

  if (!window.state.azienda || window.state.azienda.id !== activeAzienda.id) {
    window.stateActions.setAzienda(activeAzienda);
  } else {
    window.state.azienda = activeAzienda;
  }

  applyAziendaContextFromLink(aziendePulite, activeAzienda);

  return { ok: true, azienda: activeAzienda, aziendePulite };
}

async function loadPianoForAzienda(azienda) {
  if (!azienda) {
    window.state.piano = null;
    return;
  }

  if (azienda.piano_id) {
    const { data: piano, error } = await supabase
      .from("piani_abbonamento")
      .select("*")
      .eq("id", azienda.piano_id)
      .single();

    if (error) {
      console.error("Errore caricamento piano:", error);
      window.state.piano = null;
      return;
    }

    window.state.piano = piano || null;
  } else {
    window.state.piano = null;
  }

  const pianoFeatures = window.state.piano?.features || {};
  const aziendaOverride = azienda.features || {};

  window.state.featuresEffettive = {
    ...pianoFeatures,
    ...aziendaOverride,
  };
}

async function loadSediForAzienda(aziendaId) {
  const { data, error } = await supabase
    .from("sedi")
    .select("id, nome, indirizzo, latitudine, longitudine")
    .eq("azienda_id", aziendaId)
    .order("nome", { ascending: true });

  if (error) {
    console.error("Errore caricamento sedi:", error);
    return [];
  }

  return data || [];
}

function pickActiveSede(sedi) {
  const storedId = getStoredSedeId();
  if (storedId) {
    const match = sedi.find((s) => String(s.id) === String(storedId));
    if (match) return match;
  }
  if (sedi.length === 1) return sedi[0];
  return null;
}

async function ensureSedeContext(routeName) {
  const azienda = window.state?.azienda;
  if (!azienda?.id) return { ok: false, reason: "no_azienda" };

  const sedi = await loadSediForAzienda(azienda.id);

  if (window.stateActions?.setSedi) {
    window.stateActions.setSedi(sedi);
  } else {
    window.state.sedi = sedi;
  }

  if (sedi.length === 0) {
    clearStoredSedeId();
    window.state.sedeAttiva = null;

    if (routeName !== "gestione-sedi") {
      window.location.hash = "#/gestione-sedi?mode=first";
      return { ok: false, redirected: true };
    }
    return { ok: false, reason: "no_sedi" };
  }

  const sede = pickActiveSede(sedi);

  if (!sede) {
    window.state.sedeAttiva = null;
    clearStoredSedeId();

    if (routeName !== "gestione-sedi") {
      window.location.hash = "#/gestione-sedi?mode=select";
      return { ok: false, redirected: true };
    }
    return { ok: false, reason: "need_sede_choice" };
  }

  window.state.sedeAttiva = sede;
  setStoredSedeId(sede.id);

  return { ok: true, sede };
}

/* =========================================================
   LOGOUT
========================================================= */

async function doLogout() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("Errore logout:", e);
  }

  clearStoredAziendaId();
  clearStoredSedeId();

  if (window.stateActions?.setUser) window.stateActions.setUser(null);
  if (window.stateActions?.setAziende) window.stateActions.setAziende([]);
  if (window.stateActions?.resetAzienda) window.stateActions.resetAzienda();

  window.state.piano = null;
  window.state.featuresEffettive = {};
  window.state.sedi = [];
  window.state.sedeAttiva = null;
  window.state.permessiOverride = {};
  window.state.isSuperadmin = false;

  setHeaderVisible(false);

  window.location.hash = "#/login";
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

  const { route, segments, params } = parseHash();
  console.log("ROUTE:", route);
  window.routeParams = params || {};
  window.routeSegments = segments || [];

  const session = await getValidSession();

  if (!session) {
    if (window.stateActions?.setUser) window.stateActions.setUser(null);
    if (window.stateActions?.setAziende) window.stateActions.setAziende([]);
    if (window.stateActions?.resetAzienda) window.stateActions.resetAzienda();

    window.state.piano = null;
    window.state.featuresEffettive = {};
    window.state.sedi = [];
    window.state.sedeAttiva = null;
    window.state.permessiOverride = {};
    window.state.isSuperadmin = false;

    setHeaderVisible(false);

    const target = PUBLIC_ROUTES.has(route) ? route : "login";
    await renderView(target);
    return;
  }

  window.stateActions.setUser(session.user);

  if (
    PUBLIC_ROUTES.has(route) &&
    route !== "activate" &&
    route !== "setPassword" &&
    route !== "set-password"
  ) {
    const tmpAziende = await loadAziendeForUser(session.user.id);
    const hasPlatform = tmpAziende.some((a) => a.aziende?.stato === "piattaforma");
    const isSa = tmpAziende.some((a) => a.ruolo === "superadmin");

    if (route === "login") {
      if (hasPlatform || isSa) {
        window.location.hash = "#/homePiattaforma";
        return;
      }
      window.location.hash = "#/home";
      return;
    }

    setHeaderVisible(false);
    await renderView(route);
    return;
  }

  try {
    const { data: dipCheck, error: dipCheckErr } = await supabase
      .from("dipendenti")
      .select("profilo_completato")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!dipCheckErr && dipCheck && dipCheck.profilo_completato === false) {
      if (route !== "completaProfilo") {
        window.location.hash = "#/completaProfilo";
        return;
      }
    }
  } catch (e) {
    console.warn("Check profilo dipendente fallito:", e);
  }

  setHeaderVisible(true);

  const aziendaRes = await ensureAziendaContext(route);
  if (!aziendaRes.ok) {
    if (aziendaRes.redirected) return;

    if (aziendaRes.reason === "no_aziende") {
      app.innerHTML = `
        <div class="view" style="padding:40px; text-align:center;">
          <h2 style="color:#dc2626;">Accesso non consentito</h2>
          <p>Nessuna azienda associata al tuo utente.</p>
          <button id="btn-logout-force" style="margin-top:18px; padding:10px 14px; border-radius:12px; border:none; background:#0E5A7A; color:white; font-weight:600; cursor:pointer;">
            Torna al login
          </button>
        </div>
      `;
      const b = document.getElementById("btn-logout-force");
      if (b) b.onclick = doLogout;
      return;
    }

    if (route !== "sceltaAzienda") {
      window.location.hash = "#/sceltaAzienda";
      return;
    }

    await renderView("sceltaAzienda");
    return;
  }

  const azienda = window.state.azienda;

  try {
    if (
      azienda &&
      azienda.stato !== "piattaforma" &&
      (azienda.profilo_completato === false || azienda.stato_attivazione === "bozza")
    ) {
      if (route !== "completaAzienda") {
        window.location.hash = "#/completaAzienda";
        return;
      }
    }
  } catch (e) {
    console.warn("Check profilo azienda fallito:", e);
  }

  await loadPianoForAzienda(azienda);

  await window.stateActions.caricaPermessiEffettivi();
  await window.stateActions.caricaRuoloEReparti();

  if (window.menuController?.refresh) {
    window.menuController.refresh();
  }

  initTopbar();
  if (window.refreshTopbar) {
    window.refreshTopbar();
  }

  if (isAziendaBlockedForUser(azienda, route)) {
    app.innerHTML = `
      <div class="view" style="padding:40px; text-align:center;">
        <h2 style="color:#dc2626;">Azienda non attiva</h2>
        <p>L'accesso a questa azienda è bloccato (stato/stato_attivazione).</p>
        <div style="margin-top:18px; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
          <button id="btn-change-company" style="padding:10px 14px; border-radius:12px; border:none; background:#0E5A7A; color:white; font-weight:600; cursor:pointer;">
            Cambia azienda
          </button>
          <button id="btn-logout" style="padding:10px 14px; border-radius:12px; border:1px solid #e5e7eb; background:white; color:#111827; font-weight:600; cursor:pointer;">
            Logout
          </button>
        </div>
      </div>
    `;

    const bc = document.getElementById("btn-change-company");
    if (bc) {
      bc.onclick = () => {
        clearStoredAziendaId();
        clearStoredSedeId();
        window.stateActions.resetAzienda();
        window.location.hash = "#/sceltaAzienda";
      };
    }

    const bl = document.getElementById("btn-logout");
    if (bl) bl.onclick = doLogout;

    return;
  }

  if (
    !PLATFORM_ROUTES.has(route) &&
    route !== "completaProfilo" &&
    route !== "completaAzienda" &&
    route !== "home"
  ) {
    const sedeRes = await ensureSedeContext(route);
    if (!sedeRes.ok) {
      if (sedeRes.redirected) return;

      if (route === "gestione-sedi") {
        await renderView("gestione-sedi");
        return;
      }

      window.location.hash = "#/gestione-sedi?mode=first";
      return;
    }
  }

  if (route === "homePiattaforma") {
    if (!isSuperadmin()) {
      window.location.hash = "#/home";
      return;
    }
    await renderView("homePiattaforma");
    return;
  }

  if (route === "home") {
    await renderView("home");
    return;
  }

  if (PLATFORM_ROUTES.has(route)) {
    if (!isSuperadmin()) {
      window.location.hash = "#/home";
      return;
    }
    await renderView(route);
    return;
  }

  if (route === "sceltaAzienda") {
    await renderView("sceltaAzienda");
    return;
  }

  if (route === "gestione-sedi") {
    await renderView("gestione-sedi");
    return;
  }

  if (routes[route]) {
    if (!PUBLIC_ROUTES.has(route) && !PREHOME_ROUTES.has(route) && !ROOT_ROUTES.has(route)) {
      if (!hasPermission(route) && !isSuperadmin()) {
        window.location.hash = "#/home";
        return;
      }
    }
    await renderView(route);
    return;
  }

  await renderView("home");
}

/* =========================================================
   INIT
========================================================= */

window.router = {
  reloadCurrentRoute() {
    resolve();
  },
  logout() {
    doLogout();
  },
};

window.addEventListener("hashchange", resolve);

window.addEventListener("DOMContentLoaded", () => {
  app = document.getElementById("app");
  initMenu();
  initTopbar();

  try {
    const saved = localStorage.getItem("reparto_attivo");
    if (saved) {
      window.state.repartoAttivo = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Errore restore reparto:", e);
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = () => doLogout();
  }

  resolve();
});
