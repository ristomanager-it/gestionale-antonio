export async function render(container){

  const ruolo = window.state?.ruolo

  // 👑 ADMIN → dashboard completa
  if(ruolo === "admin" || ruolo === "superadmin"){
    const mod = await import("./home-admin.js")
    return mod.render(container)
  }

  // 👨‍💼 MANAGER
  if(ruolo === "manager"){
    const mod = await import("./home-manager.js")
    return mod.render(container)
  }

  // 👤 OPERATORE
  if(ruolo === "operatore"){
    const mod = await import("./home-operatore.js")
    return mod.render(container)
  }

  container.innerHTML = "Ruolo non gestito"
}
