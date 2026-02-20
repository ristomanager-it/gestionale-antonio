// js/auth-utils.js
// ============================================================
// AUTH UTILS – Enterprise Permission Layer
// ============================================================

// Verifica singolo permesso
export function hasPermesso(perm) {
  if (!window.state?.permessi) return false;
  return window.state.permessi[perm] === true;
}

// Render standard access denied
export function renderAccessDenied(container, message = "Accesso negato") {
  container.innerHTML = `
    <section class="view">
      <h2 style="margin-top:0;">${message}</h2>
      <p class="small-muted">
        Non disponi dei permessi necessari per questa operazione.
      </p>
    </section>
  `;
}

// Controllo completo CRUD
export function requirePermessi({
  container,
  resource,     // es: "ricette"
  action,       // "read" | "create" | "update" | "delete"
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
