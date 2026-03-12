export async function render(container) {

  let ruolo = window.state?.ruolo;
  const reparto = window.state?.repartoAttivo?.nome;

  // Se il superadmin sta simulando una vista
  if (ruolo === "superadmin" && window.state?.viewAs) {
    ruolo = window.state.viewAs;
  }

  // Admin
  if (ruolo === "admin") {
    const mod = await import("./home-admin.js");
    return mod.render(container);
  }

  // Manager
  if (ruolo === "manager") {
    const mod = await import("./home-manager.js");
    return mod.render(container, reparto);
  }

  // Operatore
  if (ruolo === "operatore") {
    const mod = await import("./home-operatore.js");
    return mod.render(container);
  }

  // Default sicurezza
  const mod = await import("./home-admin.js");
  return mod.render(container);
}
