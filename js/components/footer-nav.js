// js/components/footer-nav.js
// Barra in basso con i comandi veloci: Home, Prenotazioni, Planning, Magazzino.
// Solo per admin e manager (l'operatore lavora tutto dalla sua home).

const VOCI = [
  { r: "home", i: "🏠", t: "Home" },
  { r: "prenotazioni", i: "📅", t: "Prenotazioni" },
  { r: "planner-produzione", i: "📋", t: "Planning" },
  { r: "magazzino", i: "📦", t: "Magazzino" },
];
const SENZA = ["login", "menu-pubblico", "prenotazione-online", "prodotto-pubblico", "display-cucina", "kds-produzioni", "display-sala"];

function ruolo() {
  const r = String(window.state?.ruolo || "").toLowerCase();
  return window.normalizeRuolo ? window.normalizeRuolo(r) : r;
}

export function aggiornaFooter(route) {
  const ok = !!(window.state?.user && window.state?.azienda?.id)
    && ["admin", "superadmin", "manager"].includes(ruolo())
    && !SENZA.includes(route);
  let nav = document.getElementById("rf-footer");
  if (!ok) {
    if (nav) nav.style.display = "none";
    document.body.classList.remove("con-rf-footer");
    return;
  }
  if (!nav) {
    const st = document.createElement("style");
    st.textContent = `
      #rf-footer{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:flex;background:#fff;
        border-top:1px solid #E2E8F0;padding:4px 4px calc(4px + env(safe-area-inset-bottom,0px));box-shadow:0 -4px 16px rgba(2,60,89,.06);}
      #rf-footer a{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 2px;border-radius:12px;
        text-decoration:none;color:#64748B;font-size:11.5px;font-weight:700;-webkit-tap-highlight-color:transparent;}
      #rf-footer a i{font-style:normal;font-size:21px;line-height:1.1;}
      #rf-footer a.on{color:#0E5A7A;background:#EFF6FA;}
      body.con-rf-footer{padding-bottom:calc(68px + env(safe-area-inset-bottom,0px));}
      body.con-rf-footer #cam-fab{bottom:calc(84px + env(safe-area-inset-bottom,0px)) !important;}`;
    document.head.appendChild(st);
    nav = document.createElement("nav");
    nav.id = "rf-footer";
    nav.setAttribute("aria-label", "Comandi veloci");
    nav.innerHTML = VOCI.map(v => `<a href="#/${v.r}" data-r="${v.r}"><i>${v.i}</i><span>${v.t}</span></a>`).join("");
    document.body.appendChild(nav);
  }
  nav.style.display = "";
  document.body.classList.add("con-rf-footer");
  const base = String(route || "").split("?")[0];
  nav.querySelectorAll("a").forEach(a => {
    const r = a.dataset.r;
    a.classList.toggle("on", base === r || (r === "home" && base.startsWith("home")) || (r !== "home" && base.startsWith(r + "-")));
  });
}
