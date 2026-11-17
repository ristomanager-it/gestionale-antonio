// js/utils/assistenza.js
// Funzioni comuni alla chat di assistenza (lato cliente e lato operatore).

export function sb() { return window.supabase || window.supabaseClient; }

export function esc(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// testo del messaggio: link cliccabili (es. invito Meet) e a capo
export function testoHtml(t) {
  return esc(t)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;word-break:break-all;">$1</a>')
    .replace(/\n/g, "<br>");
}

export function ora(ts) {
  const d = new Date(ts), oggi = new Date();
  const stessoGiorno = d.toDateString() === oggi.toDateString();
  return stessoGiorno
    ? d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })
    : d.toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}

export function nomeUtente() {
  const d = window.state?.dipendente;
  const u = window.state?.user;
  const n = d ? [d.nome, d.cognome].filter(Boolean).join(" ") : "";
  return n || u?.user_metadata?.nome || u?.user_metadata?.full_name || u?.email || "Utente";
}

const GIORNI = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
export { GIORNI };

// ora italiana, a prescindere dal fuso del telefono
function adessoRoma() {
  const p = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date());
  const g = { dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6 }[(p.find(x => x.type === "weekday")?.value || "").slice(0, 3).toLowerCase()];
  const hh = p.find(x => x.type === "hour")?.value || "00", mm = p.find(x => x.type === "minute")?.value || "00";
  return { giorno: g ?? new Date().getDay(), hhmm: `${hh === "24" ? "00" : hh}:${mm}` };
}

// { inOrario, reperibilita, testo } dagli orari in assistenza_config
export function statoAssistenza(cfg) {
  const orari = cfg?.orari || {};
  const { giorno, hhmm } = adessoRoma();
  const oggi = orari[String(giorno)];
  const inOrario = !!(oggi && oggi[0] && oggi[1] && hhmm >= oggi[0] && hhmm < oggi[1]);
  const reperibilita = !!cfg?.reperibilita_attiva;
  let testo;
  if (inOrario) testo = `Operatori online fino alle ${oggi[1]}`;
  else {
    // prossima apertura
    let prox = "";
    for (let i = 0; i < 8; i++) {
      const g = (giorno + i) % 7, o = orari[String(g)];
      if (o && o[0] && (i > 0 || hhmm < o[0])) { prox = `${i === 0 ? "oggi" : i === 1 ? "domani" : GIORNI[g].toLowerCase()} alle ${o[0]}`; break; }
    }
    testo = `Fuori orario${prox ? ` · riapriamo ${prox}` : ""}${reperibilita ? " · reperibile per le urgenze" : ""}`;
  }
  return { inOrario, reperibilita, testo };
}

// suono breve per i nuovi messaggi (senza file audio)
export function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.08;
    o.start(); o.stop(ctx.currentTime + 0.15);
  } catch (_) {}
}
