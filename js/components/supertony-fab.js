// js/components/supertony-fab.js
// Super Tony a portata di pollice: un pulsante che resta su ogni schermata,
// senza dover passare da Piattaforma né cambiare azienda.
// Visibile a superadmin e admin: e' l'admin che sa come si parla in casa sua.
// Super Tony (gestione della piattaforma) resta solo al superadmin: da qui ci
// si arriva col link in fondo alla pagina del cervello.

function isSuperadmin() {
  const s = window.state || {};
  return s.isSuperadmin === true ||
         s.ruolo === "superadmin" ||
         s.ruoloRaw === "superadmin" ||
         (s.aziende || []).some(a => a.ruolo === "superadmin");
}

function isAdmin() {
  const s = window.state || {};
  return s.ruolo === "admin" ||
         s.ruoloRaw === "admin" ||
         (s.aziende || []).some(a => a.ruolo === "admin");
}

export function montaSuperTony() {
  if (!isSuperadmin() && !isAdmin()) return;
  if (document.getElementById("st-fab")) return;

  const b = document.createElement("button");
  b.id = "st-fab";
  b.title = "Il cervello di Tony";
  b.setAttribute("aria-label", "Apri il cervello di Tony");
  b.textContent = "🧠";

  // apre il cervello senza toccare l azienda attiva:
  // al ritorno ci si ritrova dove si era
  b.onclick = () => {
    const attuale = (window.location.hash || "").replace("#/", "");
    if (attuale === "tony-cervello") {
      const indietro = sessionStorage.getItem("st_ritorno");
      sessionStorage.removeItem("st_ritorno");
      vai(indietro || "home");
      return;
    }
    if (attuale) sessionStorage.setItem("st_ritorno", attuale);
    vai("tony-cervello");
  };

  document.body.appendChild(b);

  const s = document.createElement("style");
  s.textContent =
    "#st-fab{position:fixed;right:18px;bottom:154px;width:54px;height:54px;border-radius:27px;" +
    "background:#1f2937;color:#fff;border:2px solid #C98A0B;font-size:23px;cursor:pointer;" +
    "z-index:800;box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;align-items:center;" +
    "justify-content:center;transition:transform .12s}" +
    "#st-fab:active{transform:scale(.93)}" +
    "@media (max-width:640px){#st-fab{right:14px;bottom:140px;width:50px;height:50px;font-size:21px}}";
  document.head.appendChild(s);
}

function vai(rotta) {
  if (window.router && window.router.go) window.router.go(rotta);
  else window.location.hash = "#/" + rotta;
}

export function smontaSuperTony() {
  const b = document.getElementById("st-fab");
  if (b) b.remove();
}
