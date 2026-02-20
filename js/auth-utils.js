// js/auth-utils.js
// ============================================================
// AUTH UTILS – Enterprise Permission Layer
// ============================================================

// ============================================================
// 🔐 Verifica singolo permesso
// ============================================================
export function hasPermesso(perm) {

  // 🔥 SUPERADMIN = ACCESSO TOTALE
  if (window.state?.ruolo === "superadmin") {
    return true;
  }

  if (!window.state?.permessi) return false;

  return window.state.permessi[perm] === true;
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
  resource,     // es: "ricette"
  action        // "read" | "create" | "update" | "delete"
}) {

  const perm = `${resource}.${action}`;

  if (!hasPermesso(perm)) {
    if (container) {
      renderAccessDenied(container);
    }
    return false;
  }

  return true;
}
