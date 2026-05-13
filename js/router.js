import { supabase } from "./supabaseClient.js";
import { initMenu } from "./menu.js";
import { renderFooter, initFooter } from "./components/footer.js";

(function fixSupabaseEmailLink() {
  const hash = window.location.hash || "";

  if (hash.startsWith("#access_token=")) {
    const tokens = hash.substring(1);
    window.location.hash = "#/set-password?" + tokens;
  }
})();

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
let resolving = false;
let pendingResolve = false;

const routes = {
  login: () => import("./views/login.js"),
  home: () => import("./views/home.js"),
  "home-admin": () => import("./views/home-admin.js"),
  "home-manager": () => import("./views/home-manager.js"),
  "home-operatore": () => import("./views/home-operatore.js"),
  homePiattaforma: () => import("./views/home-piattaforma.js"),
  creaAzienda: () => import("./views/crea-azienda.js"),
  gestioneAziende: () => import("./views/gestione-aziende.js"),
  modificaAzienda: () => import("./views/modifica-azienda.js"),
  gestionePiani: () => import("./views/gestione-piani.js"),
  activate: () => import("./views/activate.js"),
  cliente: () => import("./views/cliente.js"),
  setPassword: () => import("./views/set-password.js"),
  "set-password": () => import("./views/set-password.js"),

  sceltaAzienda: () => import("./views/scelta-azienda.js"),
  "gestione-sedi": () => import("./views/gestione-sedi.js"),

  operativo: () => import("./views/operativo.js"),
  amministrazione: () => import("./views/amministrazione.js"),
  gestione: () => import("./views/gestione.js"),

  "bo-marketing": () => import("./views/bo/bo-marketing.js"),

  dipendenti: () => import("./views/dipendenti.js"),
  dipendente: () => import("./views/dipendente.js"),
  "crea-dipendente": () => import("./views/crea-dipendente.js"),
  timbrature: () => import("./views/timbrature.js"),

  "completa-profilo": () => import("./views/completa-profilo.js"),
  completaProfilo: () => import("./views/completa-profilo.js"),
  completaAzienda: () => import("./views/completa-azienda.js"),
  "scegli-sede": () => import("./views/scegli-sede.js"),

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
  manuale: () => import("./views/manuale.js"),

  sala: () => import("./views/sala.js"),

  "prenotazioni-tavoli": () => import("./views/prenotazioni-tavoli.js"),
  "prenotazione-tavolo-form": () => import("./views/prenotazione-tavolo-form.js"),
  "prenotazioni-form": () => import("./views/prenotazioni/form.js"),
  "prenotazioni-rifiutate": () => import("./views/prenotazioni/rifiutate.js"),

  prenotazioni: () => import("./views/prenotazioni/index.js"),
  "prenotazioni-dettaglio": () => import("./views/prenotazioni/scheda-prenotazione.js"),

  campagne: () => import("./views/campagne/index.js"),
  "booking-form-builder": () => import("./views/booking/booking-form-builder.js"),

  comanda: () => import("./views/comanda.js"),

  "bo-dashboard": () => import("./views/bo/bo-dashboard.js"),
  "bo-tag": () => import("./views/bo/bo-tag.js"),
  "bo-template": () => import("./views/bo/bo-template.js"),

  "bo-menu": () => import("./views/bo/bo-menu-builder.js"),
  "bo-categorie": () => import("./views/bo/categorie.js"),
  "bo-prodotti": () => import("./views/bo/prodotti.js"),

  "bo-magazzino": () => import("./views/bo/bo-magazzino.js"),
  "bo-produzione": () => import("./views/bo/bo-produzione.js"),
  "bo-comande": () => import("./views/bo/bo-comande.js"),
  "bo-ricette": () => import("./views/bo/ricette-editor.js"),

  "app-produzione": () => import("./views/app/app-produzione.js"),
};

const PUBLIC_ROUTES = new Set([
  "login",
  "activate",
  "setPassword",
  "set-password",
  "prenota",
  "booking",
]);

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
  "completa-profilo",
]);

const ROOT_ROUTES = new Set([
  "home",
  "homePiattaforma",
]);

const BO_ROUTES = new Set([
  "bo-dashboard",
  "bo-tag",
  "bo-template",
  "bo-menu",
  "bo-categorie",
  "bo-prodotti",
  "bo-magazzino",
  "bo-produzione",
  "bo-comande",
  "bo-ricette",
  "bo-marketing",
]);

const NO_SEDE_BOOTSTRAP_ROUTES = new Set([
  "login",
  "activate",
  "setPassword",
  "set-password",
  "sceltaAzienda",
  "gestione-sedi",
  "completaProfilo",
  "completaAzienda",
  "completa-profilo",
  "homePiattaforma",
  "gestioneAziende",
  "creaAzienda",
  "modificaAzienda",
  "gestionePiani",
  "booking-form-builder",
]);

const LS_KEYS = {
  ACTIVE_AZIENDA_ID: "active_azienda_id",
  ACTIVE_SEDE_ID: "active_sede_id",
};

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

async function renderView(routeName) {
  if (!routes[routeName]) {
    routeName = "home";
  }

  if (!app) return;

  app.innerHTML = "";

  const sub = document.getElementById("page-subheader");
  const foot = document.getElementById("footer-root");

  if (sub) sub.innerHTML = "";
  if (foot) foot.innerHTML = "";

  const module = await routes[routeName]();

  if (!module.render) {
    throw new Error(`La view ${routeName} non esporta render()`);
  }

  await module.render(app);

  try {
    if (foot) {
      const footerHTML = await renderFooter();
      foot.innerHTML = footerHTML;
      initFooter();
    }
  } catch (e) {
    console.error("Errore render footer:", e);
  }
}

function normalizeRole(role) {
  const value = String(role || "").toLowerCase().trim();

  if (value === "manager_cucina" || value === "manager_sala") {
    return "manager";
  }

  if (value === "operatore_cucina" || value === "operatore_sala") {
    return "operatore";
  }

  if (["superadmin", "admin", "manager", "operatore"].includes(value)) {
    return value;
  }

  return value || null;
}

function normalizeRepartoName(nome) {
  return String(nome || "").toLowerCase().trim();
}

function getCurrentRole() {
  return normalizeRole(window.state?.viewAs || window.state?.ruolo);
}

function getCurrentReparti() {
  return Array.isArray(window.state?.reparti)
    ? window.state.reparti
    : [];
}

function hasReparto(nome) {
  const target = normalizeRepartoName(nome);

  return getCurrentReparti().some(
    (r) => normalizeRepartoName(r?.nome) === target
  );
}

function isSuperadmin() {
  if (window.state?.isSuperadmin === true) {
    return true;
  }

  const aziende = window.state?.aziende || [];

  return aziende.some(
    (a) => normalizeRole(a?.ruolo) === "superadmin"
  );
}

function hasPermission(area) {
  if (area === "home") {
    return true;
  }

  if (!area) {
    return false;
  }

  const ruolo = getCurrentRole();

  if (
    !window.state?.viewAs &&
    window.state?._allAccess === true
  ) {
    return true;
  }

  if (isSuperadmin()) {
    return true;
  }

  if (BO_ROUTES.has(area)) {
    return ruolo === "admin" || ruolo === "superadmin";
  }

  if (ruolo === "admin") {
    return true;
  }

  const isCucina = hasReparto("cucina");
  const isSala = hasReparto("sala");

  if (ruolo === "manager") {
    const allowed = new Set([
      "home",
      "home-manager",
      "operativo",
      "timbrature",
      "permessi",
      "manuale",
    ]);

    if (isCucina) {
      [
        "ricettario",
        "creaRicetta",
        "planner-produzione",
        "produzione",
        "preparazioni",
        "storicoLotto",
        "magazzino",
        "acquisti",
        "dipendenti",
        "dipendente",
        "crea-dipendente",
      ].forEach((route) => allowed.add(route));
    }

    if (isSala) {
      [
        "sala",
        "comanda",
        "prenotazioni",
        "prenotazioni-dettaglio",
        "prenotazioni-form",
        "prenotazioni-rifiutate",
        "prenotazioni-tavoli",
        "prenotazione-tavolo-form",
      ].forEach((route) => allowed.add(route));
    }

    return allowed.has(area);
  }

  if (ruolo === "operatore") {
    const allowed = new Set([
      "home",
      "home-operatore",
      "operativo",
      "timbrature",
      "manuale",
    ]);

    if (isCucina) {
      [
        "produzione",
        "preparazioni",
        "ricettario",
        "magazzino",
      ].forEach((route) => allowed.add(route));
    }

    if (isSala) {
      [
        "sala",
        "comanda",
        "prenotazioni",
        "prenotazioni-dettaglio",
        "prenotazioni-form",
        "prenotazioni-rifiutate",
        "prenotazioni-tavoli",
        "prenotazione-tavolo-form",
      ].forEach((route) => allowed.add(route));
    }

    return allowed.has(area);
  }

  const permessi = window.state?.permessi || {};

  return permessi[`${area}.read`] === true;
}

function setHeaderVisible(visible) {
  const header = document.querySelector(".app-header");

  if (header) {
    header.style.display = visible ? "flex" : "none";
  }

  const topbar = document.getElementById("topbar-info");

  if (topbar) {
    topbar.style.display = visible ? "flex" : "none";
  }
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

function redirectTo(hash) {
  if (window.location.hash === hash) {
    return false;
  }

  window.location.hash = hash;
  return true;
}

function safeSetSedi(sedi) {
  const clean = Array.isArray(sedi) ? sedi : [];

  if (window.stateActions?.setSedi) {
    window.stateActions.setSedi(clean);
  } else {
    window.state.sedi = clean;
  }
}

function safeSetSedeAttiva(sede) {
  if (window.stateActions?.setSedeAttiva) {
    window.stateActions.setSedeAttiva(sede || null);
  } else {
    window.state.sedeAttiva = sede || null;
  }
}

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
    .select(`
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
    `)
    .eq("user_id", userId)
    .eq("attivo", true);

  if (error) {
    console.error("Errore caricamento aziende:", error);
    return [];
  }

  return (aziende || [])
    .filter((a) => a.aziende)
    .map((a) => ({
      ...a,
      ruolo: normalizeRole(a.ruolo),
    }));
}

function pickActiveAzienda(aziendePulite) {
  const storedId = getStoredAziendaId();

  if (storedId) {
    const match = aziendePulite.find(
      (a) => String(a.aziende.id) === String(storedId)
    );

    if (match?.aziende) {
      return match.aziende;
    }
  }

  if (aziendePulite.length === 1) {
    return aziendePulite[0].aziende;
  }

  return null;
}

function applyAziendaContextFromLink(aziendePulite, azienda) {
  if (!azienda) return;

  const recordAttivo = aziendePulite.find(
    (a) => String(a.aziende?.id) === String(azienda.id)
  );

  window.state.isSuperadmin = aziendePulite.some(
    (a) => normalizeRole(a.ruolo) === "superadmin"
  );

  const ruoloEffettivo = window.state.isSuperadmin
    ? "superadmin"
    : normalizeRole(recordAttivo?.ruolo || "admin");

  if (window.stateActions?.setRuolo) {
    window.stateActions.setRuolo(ruoloEffettivo);
  }

  window.state.ruolo = ruoloEffettivo;
  window.state.permessiOverride = recordAttivo?.permessi_override || {};
}

async function ensureAziendaContext(routeName) {
  const user = window.state?.user;

  if (!user) {
    return {
      ok: false,
      reason: "no_user",
    };
  }

  const aziendePulite = await loadAziendeForUser(user.id);

  if (window.stateActions?.setAziende) {
    window.stateActions.setAziende(aziendePulite);
  } else {
    window.state.aziende = aziendePulite;
  }

  if (aziendePulite.length === 0) {
    if (window.stateActions?.resetAzienda) {
      window.stateActions.resetAzienda();
    }

    return {
      ok: false,
      reason: "no_aziende",
    };
  }

  const activeAzienda = pickActiveAzienda(aziendePulite);

  if (!activeAzienda) {
    if (window.stateActions?.resetAzienda) {
      window.stateActions.resetAzienda();
    }

    if (routeName !== "sceltaAzienda") {
      redirectTo("#/sceltaAzienda");

      return {
        ok: false,
        redirected: true,
      };
    }

    return {
      ok: false,
      reason: "need_choice",
    };
  }

  setStoredAziendaId(activeAzienda.id);

  if (
    !window.state.azienda ||
    String(window.state.azienda.id) !== String(activeAzienda.id)
  ) {
    if (window.stateActions?.setAzienda) {
      window.stateActions.setAzienda(activeAzienda);
    } else {
      window.state.azienda = activeAzienda;
    }

    safeSetSedi([]);
    safeSetSedeAttiva(null);
    clearStoredSedeId();
  } else {
    window.state.azienda = activeAzienda;
  }

  applyAziendaContextFromLink(aziendePulite, activeAzienda);

  return {
    ok: true,
    azienda: activeAzienda,
    aziendePulite,
  };
}

async function normalizeStateRoleAndReparti() {
  const normalized = normalizeRole(window.state?.ruolo);

  if (normalized && normalized !== window.state?.ruolo) {
    if (window.stateActions?.setRuolo) {
      window.stateActions.setRuolo(normalized);
    }

    window.state.ruolo = normalized;
  }

  if (!Array.isArray(window.state.reparti)) {
    window.state.reparti = [];
  }
}

async function loadSediForCurrentUser(userId) {
  const aziendaId = window.state?.azienda?.id;

  if (!userId || !aziendaId) {
    return [];
  }

  const { data: dip, error: dipError } = await supabase
    .from("dipendenti")
    .select("id")
    .eq("user_id", userId)
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  if (dipError) {
    console.warn("Errore caricamento dipendente per sedi:", dipError);
    return [];
  }

  if (!dip?.id) {
    return Array.isArray(window.state?.sedi) ? window.state.sedi : [];
  }

  const { data: links, error: linkError } = await supabase
    .from("dipendenti_sedi")
    .select(`
      sede_id,
      is_default,
      sedi (
        id,
        nome,
        logo_url,
        azienda_id
      )
    `)
    .eq("dipendente_id", dip.id);

  if (linkError) {
    console.warn("Errore caricamento sedi dipendente:", linkError);
    return [];
  }

  return (links || [])
    .filter((link) => link.sedi)
    .map((link) => ({
      ...link.sedi,
      is_default: link.is_default === true,
    }));
}

async function ensureSedeContext(routeName, userId) {
  if (NO_SEDE_BOOTSTRAP_ROUTES.has(routeName)) {
    return {
      ok: true,
      skipped: true,
    };
  }

  if (isSuperadmin() || getCurrentRole() === "admin") {
    return {
      ok: true,
      skipped: true,
    };
  }

  const sedi = await loadSediForCurrentUser(userId);
  safeSetSedi(sedi);

  if (sedi.length === 0) {
    safeSetSedeAttiva(null);
    clearStoredSedeId();

    return {
      ok: true,
      noSedi: true,
    };
  }

  if (sedi.length === 1) {
    const sede = sedi[0];

    safeSetSedeAttiva(sede);
    setStoredSedeId(sede.id);

    if (routeName === "scegli-sede") {
      redirectTo("#/home");

      return {
        ok: false,
        redirected: true,
      };
    }

    return {
      ok: true,
      sede,
    };
  }

  const storedSedeId = getStoredSedeId();
  const storedSede = storedSedeId
    ? sedi.find((s) => String(s.id) === String(storedSedeId))
    : null;

  if (storedSede) {
    safeSetSedeAttiva(storedSede);
    setStoredSedeId(storedSede.id);

    return {
      ok: true,
      sede: storedSede,
    };
  }

  safeSetSedeAttiva(null);
  clearStoredSedeId();

  if (routeName !== "scegli-sede") {
    redirectTo("#/scegli-sede");

    return {
      ok: false,
      redirected: true,
    };
  }

  return {
    ok: true,
    needChoice: true,
  };
}

function resetRuntimeState() {
  if (window.stateActions?.setUser) {
    window.stateActions.setUser(null);
  }

  if (window.stateActions?.setAziende) {
    window.stateActions.setAziende([]);
  }

  if (window.stateActions?.resetAzienda) {
    window.stateActions.resetAzienda();
  }

  window.state.piano = null;
  window.state.featuresEffettive = {};
  window.state.sedi = [];
  window.state.sedeAttiva = null;
  window.state.permessiOverride = {};
  window.state.isSuperadmin = false;
  window.state.reparti = [];
}

async function doLogout() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("Errore logout:", e);
  }

  clearStoredAziendaId();
  clearStoredSedeId();
  resetRuntimeState();
  setHeaderVisible(false);

  redirectTo("#/login");
}

async function resolveCore() {
  if (!app) return;

  if (!window.location.hash) {
    redirectTo("#/login");
    return;
  }

  const { route, segments, params } = parseHash();

  window.routeParams = params || {};
  window.routeSegments = segments || [];

  const session = await getValidSession();

  if (!session) {
    resetRuntimeState();
    setHeaderVisible(false);

    const target = PUBLIC_ROUTES.has(route) ? route : "login";
    await renderView(target);

    return;
  }

  if (window.stateActions?.setUser) {
    window.stateActions.setUser(session.user);
  } else {
    window.state.user = session.user;
  }

  const aziendaRes = await ensureAziendaContext(route);

  if (!aziendaRes.ok) {
    if (aziendaRes.reason === "need_choice" && route === "sceltaAzienda") {
      await renderView("sceltaAzienda");
    }

    return;
  }

  if (window.stateActions?.caricaPermessiEffettivi) {
    await window.stateActions.caricaPermessiEffettivi();
  }

  if (window.stateActions?.caricaRuoloEReparti) {
    await window.stateActions.caricaRuoloEReparti();
  }

  await normalizeStateRoleAndReparti();

  const sedeRes = await ensureSedeContext(route, session.user.id);

  if (!sedeRes.ok) {
    return;
  }

  setHeaderVisible(!PUBLIC_ROUTES.has(route));

  if (route === "home") {
    const ruoloCorrente = getCurrentRole();

    if (ruoloCorrente === "admin") {
      await renderView("home-admin");
      return;
    }

    if (ruoloCorrente === "manager") {
      await renderView("home-manager");
      return;
    }

    if (ruoloCorrente === "operatore") {
      await renderView("home-operatore");
      return;
    }

    if (ruoloCorrente === "superadmin") {
      await renderView("homePiattaforma");
      return;
    }

    await renderView("home");
    return;
  }

  if (routes[route]) {
    const requiresPermission =
      !PUBLIC_ROUTES.has(route) &&
      !PREHOME_ROUTES.has(route) &&
      !ROOT_ROUTES.has(route);

    if (requiresPermission && !hasPermission(route)) {
      redirectTo("#/home");
      return;
    }

    await renderView(route);
    return;
  }

  redirectTo("#/home");
}

async function resolve() {
  if (resolving) {
    pendingResolve = true;
    return;
  }

  resolving = true;

  try {
    await resolveCore();
  } catch (e) {
    console.error("Errore router:", e);

    if (app) {
      app.innerHTML = `
        <div class="view" style="padding:40px;text-align:center;">
          <h2 style="color:#dc2626;">Errore caricamento pagina</h2>
          <p>Si è verificato un errore durante il caricamento.</p>
        </div>
      `;
    }
  } finally {
    resolving = false;

    if (pendingResolve) {
      pendingResolve = false;
      resolve();
    }
  }
}

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

  supabase.auth.onAuthStateChange((event, session) => {
    console.log("AUTH CHANGE:", event, session);

    if (session?.user) {
      if (window.stateActions?.setUser) {
        window.stateActions.setUser(session.user);
      } else {
        window.state.user = session.user;
      }
    } else if (window.stateActions?.setUser) {
      window.stateActions.setUser(null);
    } else {
      window.state.user = null;
    }
  });

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.onclick = () => doLogout();
  }

  resolve();
});
