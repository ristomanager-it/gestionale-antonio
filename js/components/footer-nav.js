// js/components/footer-nav.js
// Barra in basso con i comandi veloci: Home, Prenotazioni, Planning, Magazzino.
// Solo per admin e manager (l'operatore lavora tutto dalla sua home).

const VOCI = [
  { r: "home", i: "🏠", t: "Home" },
  { r: "prenotazioni", i: "📅", t: "Prenotazioni" },
  { r: "planner-produzione", i: "📋", t: "Planning" },
  { r: "magazzino", i: "📦", t: "Magazzino" },
  { r: "assistenza", i: "💬", t: "Aiuto" },
];
// "ai" = chat di Tony: la sua barra per scrivere sta in basso e la barra veloce la copriva
const SENZA = ["login", "menu-pubblico", "prenotazione-online", "prodotto-pubblico", "display-cucina", "kds-produzioni", "display-sala", "ai", "bo-comande"];

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
      #rf-footer a{position:relative;}
      #rf-footer .rf-badge{position:absolute;top:2px;left:calc(50% + 6px);min-width:17px;height:17px;padding:0 4px;border-radius:9px;
        background:#E66101;color:#fff;font-size:10.5px;font-weight:800;line-height:17px;text-align:center;display:none;}
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
  aggiornaBadgeAssistenza();
  ascoltaAssistenza();
}

// ── Chat di assistenza: pallino con i messaggi non letti sulla voce "Aiuto" ──
function sbc() { return window.supabase || window.supabaseClient; }

export async function aggiornaBadgeAssistenza() {
  const az = window.state?.azienda?.id;
  const a = document.querySelector('#rf-footer a[data-r="assistenza"]');
  if (!az || !a) return;
  try {
    const { data } = await sbc().from("assistenza_conversazioni").select("non_letti_cliente").eq("azienda_id", az);
    const n = (data || []).reduce((t, r) => t + (r.non_letti_cliente || 0), 0);
    let b = a.querySelector(".rf-badge");
    if (!b) { b = document.createElement("span"); b.className = "rf-badge"; a.appendChild(b); }
    b.textContent = n > 9 ? "9+" : String(n);
    b.style.display = n ? "block" : "none";
  } catch (_) {}
}
window.rfAggiornaBadgeAssistenza = aggiornaBadgeAssistenza;

// un solo ascolto per azienda: quando l'operatore risponde il pallino si accende anche su altre pagine
function ascoltaAssistenza() {
  const az = window.state?.azienda?.id;
  if (!az || window.__rfAssCanaleAz === az) return;
  try {
    if (window.__rfAssCanale) sbc().removeChannel(window.__rfAssCanale);
    window.__rfAssCanaleAz = az;
    window.__rfAssCanale = sbc().channel("ass-badge-" + az)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "assistenza_conversazioni", filter: `azienda_id=eq.${az}` },
        () => aggiornaBadgeAssistenza())
      .subscribe();
  } catch (_) {}
}
