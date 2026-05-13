// js/auth-utils.js
// ============================================================
// AUTH UTILS – Enterprise Permission Layer (DB READY)
// ============================================================

// ============================================================
// 🔐 Verifica singolo permesso
// ============================================================
export function hasPermesso(perm) {

  const ruolo = window.state?.ruolo

  const permessi =
    window.state?.permessi || {}

  const override =
    window.state?.permessi_override || {}

  const reparti =
    window.state?.reparti || []

  const isCucina = reparti.some(
    r =>
      r.nome === "cucina" ||
      r.codice === "cucina"
  )

  const isSala = reparti.some(
    r =>
      r.nome === "sala" ||
      r.codice === "sala"
  )

  // ============================================================
  // 🔥 SUPERADMIN = ACCESSO TOTALE
  // ============================================================

  if (
    window.state?.isSuperadmin === true ||
    ruolo === "superadmin"
  ) {
    return true
  }

  // ============================================================
  // 🔥 ADMIN = TUTTO NELLA PROPRIA AZIENDA
  // ============================================================

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

  if (
    permessi &&
    typeof permessi === "object"
  ) {
    if (permessi[perm] === true) {
      return true
    }
  }

  // ============================================================
  // 🔥 MANAGER
  // ============================================================

  if (ruolo === "manager") {

    const base = {

      // GENERICI
      "timbrature.read": true,
      "timbrature.create": true,

      "prenotazioni.read": true,
      "prenotazioni.create": true,
      "prenotazioni.update": true,

      "permessi.read": true,

      // PERSONALE
      "dipendenti.read": true,

      // PRODUZIONE
      "produzione.read": true,

      // MAGAZZINO
      "magazzino.read": true,

      // ACQUISTI
      "acquisti.read": true,

      // RICETTE
      "ricette.read": true
    }

    // ========================================================
    // MANAGER CUCINA
    // ========================================================

    if (isCucina) {

      base["ricette.create"] = true
      base["ricette.update"] = true

      base["produzione.create"] = true
      base["produzione.update"] = true

      base["magazzino.update"] = true

      base["acquisti.create"] = true
      base["acquisti.update"] = true
    }

    // ========================================================
    // MANAGER SALA
    // ========================================================

    if (isSala) {

      base["comande.read"] = true
      base["comande.create"] = true
      base["comande.update"] = true
    }

    return base[perm] === true
  }

  // ============================================================
  // 🔥 SEGRETERIA
  // ============================================================

  if (ruolo === "segreteria") {

    const base = {
      "fatture.read": true,
      "fatture.validate": true,
      "pagamenti.read": true,
      "acquisti.read": true
    }

    return base[perm] === true
  }

  // ============================================================
  // 🔥 OPERATORE
  // ============================================================

  if (ruolo === "operatore") {

    const base = {

      // BASE
      "timbrature.create": true,

      // PRODUZIONE
      "produzione.read": true,

      // RICETTE
      "ricette.read": true
    }

    // ========================================================
    // OPERATORE CUCINA
    // ========================================================

    if (isCucina) {

      base["magazzino.read"] = true
      base["preparazioni.read"] = true
    }

    // ========================================================
    // OPERATORE SALA
    // ========================================================

    if (isSala) {

      base["comande.read"] = true
      base["comande.create"] = true

      base["prenotazioni.read"] = true
    }

    return base[perm] === true
  }

  return false
}


// ============================================================
// 🏢 Verifica accesso reparto
// ============================================================

export function hasReparto(repartoId) {

  const ruolo = window.state?.ruolo

  if (
    window.state?.isSuperadmin === true ||
    ruolo === "superadmin" ||
    ruolo === "admin"
  ) {
    return true
  }

  if (
    !window.state?.reparti ||
    !Array.isArray(window.state.reparti)
  ) {
    return false
  }

  return window.state.reparti.some(
    r => r.id === repartoId
  )
}


// ============================================================
// 🚫 Render standard access denied
// ============================================================

export function renderAccessDenied(
  container,
  message = "Accesso negato"
) {

  if (!container) return

  container.innerHTML = `
    <section class="view">
      <h2 style="margin-top:0;">
        ${message}
      </h2>

      <p class="small-muted">
        Non disponi dei permessi necessari
        per questa operazione.
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

  const perm =
    `${resource}.${action}`

  if (!hasPermesso(perm)) {

    if (container) {
      renderAccessDenied(container)
    }

    return false
  }

  return true
}
