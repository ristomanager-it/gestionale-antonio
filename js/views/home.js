export async function render(container) {

  const ruolo = window.state?.ruolo;
  const reparto = window.state?.repartoAttivo?.nome;

  if (ruolo === "superadmin") {
    const mod = await import("./home-admin.js");
    return mod.render(container);
  }

  if (ruolo === "admin") {
    const mod = await import("./home-admin.js");
    return mod.render(container);
  }

  if (ruolo === "manager") {
    const mod = await import("./home-manager.js");
    return mod.render(container, reparto);
  }

  const mod = await import("./home-operatore.js");
  return mod.render(container);
}
