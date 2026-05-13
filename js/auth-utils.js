// js/auth-utils.js
// ============================================================
// AUTH UTILS – Enterprise Permission Layer (DB READY)
// ============================================================

// ============================================================
// 🔐 Verifica singolo permesso
// ============================================================
export function hasPermesso(perm) {

  const ruolo = window.normalizeRuolo ? window.normalizeRuolo(window.state?.ruolo) : window.state?.ruolo
  const permessi = window.state?.permessi || {}
  const override = window.state?.permessi_override || {}

  // 🔥 SUPERADMIN = ACCESSO TOTALE (piattaforma + tutte aziende)
  if (window.state?.isSuperadmin === true || ruolo === "superadmin") {
    return true
  }

  // 🔥 ADMIN = tutto nella propria azienda
  if (ruolo === "admin") {
    return true
  }

  // ============================================================
  // 🔥 OVERRIDE PRIORITARIO
  // ============================================================
  if (override.hasOwnProperty(perm)) {
    return override[perm] === true
  }

  // ============================================================
  // 🔥 PERMESSI DA DB (JSONB)
  // ============================================================
  if (permessi && typeof permessi === "object") {
    if (permessi[perm] === true) return true
  }

  // ============================================================
  // 🔥 FALLBACK RUOLO (BASE MINIMA)
  // ============================================================
  if (ruolo === "manager") {
    const base = {
      "acquisti.read": true,
      "acquisti.create": true,
      "fatture.create": true,
      "price_alert.read": true,
      "dipendenti.read": true,
      "produzione.read": true,
      "ricette.read": true
    }
    return base[perm] === true
  }

  if (ruolo === "segreteria") {
    const base = {
      "fatture.read": true,
      "fatture.validate": true,
      "pagamenti.read": true,
      "acquisti.read": true
    }
    return base[perm] === true
  }

  if (ruolo === "operatore") {
    const base = {
      "produzione.read": true,
      "ricette.read": true,
      "timbrature.create": true
    }
    return base[perm] === true
  }

  return false
}


// ============================================================
// 🏢 Verifica accesso reparto
// ============================================================
export function hasReparto(repartoId) {

  const ruolo = window.normalizeRuolo ? window.normalizeRuolo(window.state?.ruolo) : window.state?.ruolo

  if (
    window.state?.isSuperadmin === true ||
    ruolo === "superadmin" ||
    ruolo === "admin"
  ) {
    return true
  }

  if (!window.state?.reparti || !Array.isArray(window.state.reparti)) {
    return false
  }

  return window.state.reparti.some(r => r.id === repartoId)
}


// ============================================================
// 🚫 Render standard access denied
// ============================================================
export function renderAccessDenied(container, message = "Accesso negato") {

  if (!container) return

  container.innerHTML = `
    <section class="view">
      <h2 style="margin-top:0;">${message}</h2>
      <p class="small-muted">
        Non disponi dei permessi necessari per questa operazione.
      </p>
    </section>
  `
}


// ============================================================
// 🛡️ Controllo completo CRUD
// ============================================================
export function requirePermessi({
  container = null,
  resource,
  action
}) {

  const perm = `${resource}.${action}`

  if (!hasPermesso(perm)) {
    if (container) renderAccessDenied(container)
    return false
  }

  return true
}
