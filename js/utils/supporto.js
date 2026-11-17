// js/utils/supporto.js
// Accesso assistito del supporto tecnico: entrata/uscita dall'azienda del cliente
// e barra sempre visibile mentre la sessione è aperta.
const LS = "rf_supporto";

function sb() { return window.supabaseClient || window.supabase; }
function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function sessioneLocale() {
  try { return JSON.parse(localStorage.getItem(LS) || "null"); } catch (_) { return null; }
}
export function salvaSessioneLocale(s) {
  try {
    localStorage.setItem(LS, JSON.stringify({ id: s.id, azienda_id: s.azienda_id, azienda_nome: s.azienda_nome, scade_at: s.scade_at }));
  } catch (_) {}
}
export function pulisciSessioneLocale() {
  try { localStorage.removeItem(LS); } catch (_) {}
  const b = document.getElementById("rf-supporto-bar");
  if (b) { b.remove(); document.body.style.marginTop = ""; }
}

function ripartiDa(hash) {
  window.__rfAziendeCache = null;
  window.__rfCtx = null;
  window.location.hash = hash;
  window.location.reload();
}

export function entraInAzienda(s) {
  salvaSessioneLocale(s);
  try {
    localStorage.setItem("active_azienda_id", String(s.azienda_id));
    localStorage.setItem("rf_ultima_azienda", String(s.azienda_id));
    localStorage.removeItem("active_sede_id");
  } catch (_) {}
  ripartiDa("#/home");
}

export function tornaAlSupporto() {
  pulisciSessioneLocale();
  try { localStorage.removeItem("active_azienda_id"); localStorage.removeItem("active_sede_id"); localStorage.removeItem("rf_ultima_azienda"); } catch (_) {}
  ripartiDa("#/home-supporto");
}

// barra in alto: chi è dentro, fino a quando, nota e chiusura
export async function bannerSupporto(routeName) {
  const s = sessioneLocale();
  const vecchia = document.getElementById("rf-supporto-bar");
  if (!s || routeName === "home-supporto" || routeName === "login") {
    if (vecchia) { vecchia.remove(); document.body.style.marginTop = ""; }
    return;
  }

  // ogni minuto controllo che la sessione sia ancora aperta (scaduta o revocata = fuori)
  if (!window.__rfSupportoCheck || Date.now() - window.__rfSupportoCheck > 60000) {
    window.__rfSupportoCheck = Date.now();
    const { data } = await sb().from("supporto_sessioni").select("id, scade_at, chiusa_at")
      .eq("id", s.id).maybeSingle();
    if (!data || data.chiusa_at) {
      alert("L'accesso assistito è chiuso (scaduto o revocato). Torni alla pagina del supporto.");
      return tornaAlSupporto();
    }
  }
  if (!window.__rfSupportoTimer) {
    window.__rfSupportoTimer = setInterval(() => {
      const x = sessioneLocale();
      if (!x) { clearInterval(window.__rfSupportoTimer); window.__rfSupportoTimer = null; return; }
      if (new Date(x.scade_at).getTime() < Date.now()) {
        clearInterval(window.__rfSupportoTimer); window.__rfSupportoTimer = null;
        alert("L'accesso assistito è scaduto.");
        tornaAlSupporto();
      }
    }, 30000);
  }

  if (vecchia) return;
  const scade = new Date(s.scade_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  const bar = document.createElement("div");
  bar.id = "rf-supporto-bar";
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#E66101;color:#fff;font:600 13px system-ui,sans-serif;display:flex;align-items:center;gap:8px;padding:6px 10px;box-shadow:0 2px 6px rgba(0,0,0,.2);";
  bar.innerHTML = `<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🛟 Supporto in ${esc(s.azienda_nome || "azienda")} · fino alle ${scade} · tutto registrato</span>
    <button id="rfs-nota" style="border:0;border-radius:8px;padding:5px 9px;font-weight:700;cursor:pointer;">📝 Nota</button>
    <button id="rfs-chiudi" style="border:0;border-radius:8px;padding:5px 9px;font-weight:700;cursor:pointer;background:#023C59;color:#fff;">🔒 Chiudi</button>`;
  document.body.appendChild(bar);
  document.body.style.marginTop = "36px";
  bar.querySelector("#rfs-nota").onclick = async () => {
    const t = prompt("Nota per il registro (cosa hai visto o fatto):");
    if (!t) return;
    const { error } = await sb().rpc("supporto_nota", { p_testo: t });
    alert(error ? "Errore: " + error.message : "Nota salvata nel registro ✓");
  };
  bar.querySelector("#rfs-chiudi").onclick = async () => {
    const esito = prompt("Chiudi l'accesso. Com'è andata?");
    if (esito === null) return;
    const { error } = await sb().rpc("supporto_chiudi_sessione", { p_esito: esito });
    if (error) return alert(error.message);
    tornaAlSupporto();
  };
}
