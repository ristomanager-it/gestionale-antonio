// js/auth-utils.js
// ============================================================
// AUTH UTILS – Enterprise Permission Layer
// ============================================================

// ============================================================
// 🔐 Verifica singolo permesso
// ============================================================
export function hasPermesso(perm) {
  const ruolo = window.state?.ruolo;

  // 🔥 SUPERADMIN = ACCESSO TOTALE (piattaforma + tutte aziende)
  if (window.state?.isSuperadmin === true || ruolo === "superadmin") {
    return true;
  }

  // 🔥 ADMIN = tutto nella propria azienda
  if (ruolo === "admin") {
    return true;
  }

  // 🔥 SEGRETERIA = solo gestione (preventivi, acquisti, dipendenti, timbrature)
  if (ruolo === "segreteria") {
    const allowed = [
      "preventivi.read", "preventivi.create", "preventivi.update",
      "acquisti.read", "acquisti.create", "acquisti.update",
      "dipendenti.read", "dipendenti.update",
      "timbrature.read"
    ];
    return allowed.includes(perm);
  }

  if (!window.state?.permessi) return false;

  return window.state.permessi[perm] === true;
}

// ============================================================
// 🏢 Verifica accesso reparto
// ============================================================
export function hasReparto(repartoId) {
  const ruolo = window.state?.ruolo;

  // Superadmin e Admin vedono tutti i reparti
  if (
    window.state?.isSuperadmin === true ||
    ruolo === "superadmin" ||
    ruolo === "admin"
  ) {
    return true;
  }

  if (!window.state?.reparti || !Array.isArray(window.state.reparti)) {
    return false;
  }

  return window.state.reparti.some(r => r.id === repartoId);
}

// ============================================================
// 🚫 Render standard access denied
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
// 🛡️ Controllo completo CRUD
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
