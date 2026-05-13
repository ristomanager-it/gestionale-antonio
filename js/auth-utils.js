// js/auth-utils.js
// ============================================================
// AUTH UTILS – Enterprise Permission Layer
// ============================================================

const PLATFORM_ONLY_PERMS = new Set([
  "aziende.read",
  "aziende.create",
  "aziende.update",
  "aziende.delete",
  "billing.read",
  "billing.create",
  "billing.update",
  "billing.delete",
  "saas.read",
  "saas.create",
  "saas.update",
  "saas.delete",
  "superadmin.read",
  "superadmin.create",
  "superadmin.update",
  "superadmin.delete",
  "logs.read",
  "audit.read"
]);

function getRuolo() {
  const raw = window.state?.viewAs || window.state?.ruolo;
  return window.normalizeRuolo ? window.normalizeRuolo(raw) : raw;
}

function isSuperadmin() {
  return window.state?.isSuperadmin === true || getRuolo() === "superadmin";
}

// ============================================================
// Verifica singolo permesso
// ============================================================

export function hasPermesso(perm) {
  const ruolo = getRuolo();
  const permessi = window.state?.permessi || {};
  const override = window.state?.permessi_override || {};

  if (isSuperadmin()) return true;

  // I permessi piattaforma restano sempre esclusivi del superadmin.
  if (PLATFORM_ONLY_PERMS.has(perm)) return false;

  // Admin, manager e operatore hanno accesso completo all'area azienda.
  if (["admin", "manager", "operatore"].includes(ruolo)) {
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(override, perm)) {
    return override[perm] === true;
  }

  if (permessi && typeof permessi === "object") {
    if (permessi[perm] === true) return true;
  }

  return false;
}

// ============================================================
// Verifica accesso reparto
// ============================================================

export function hasReparto(repartoId) {
  const ruolo = getRuolo();

  if (
    isSuperadmin() ||
    ruolo === "admin" ||
    ruolo === "manager" ||
    ruolo === "operatore"
  ) {
    return true;
  }

  if (!window.state?.reparti || !Array.isArray(window.state.reparti)) {
    return false;
  }

  return window.state.reparti.some(r => r.id === repartoId);
}

// ============================================================
// Render standard access denied
// ============================================================

export function renderAccessDenied(container, message = "Accesso negato") {
  if (!container) return;

  container.innerHTML = `
    <section class="view">
      <h2 style="margin-top:0;">${message}</h2>
      <p class="small-muted">
        Non disponi dei permessi necessari per questa operazione.
      </p>
    </section>
  `;
}

// ============================================================
// Controllo completo CRUD
// ============================================================

export function requirePermessi({
  container = null,
  resource,
  action
}) {
  const perm = `${resource}.${action}`;

  if (!hasPermesso(perm)) {
    if (container) renderAccessDenied(container);
    return false;
  }

  return true;
}
