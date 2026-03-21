export async function render(container){

  // 🔥 RUOLO CORRETTO (supporto viewAs per superadmin)
  const ruolo = window.state?.viewAs || window.state?.ruolo

  // 👑 ADMIN / SUPERADMIN
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

  // ⚠️ FALLBACK
  container.innerHTML = `
    <div class="view">
      <h3>Ruolo non gestito</h3>
      <p>Controlla configurazione utente</p>
    </div>
  `
}
