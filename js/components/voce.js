// js/components/voce.js
// 🎙️ Comandi vocali di sala e cucina.
// Si attiva con: tocco sul pulsante, telecomando Bluetooth (manda "Invio"),
// tasto play/pausa dell'auricolare Bluetooth.
//   1° click  -> bip, registra; si ferma da solo dopo 1,5 s di silenzio (o 2° click)
//   Tony capisce e RILEGGE ad alta voce cosa sta per fare
//   5 secondi per annullare (un click qualsiasi o il tasto Annulla), poi esegue.
// Riceve anche gli annunci in tempo reale: "Tavolo 12, seconda uscita pronta"
// arriva in sala, "Tavolo 12, via la seconda uscita" arriva in cucina.

const URL_EF = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-voce";
const ESEGUIBILI = ["chiama_uscita", "uscita_pronta", "preparazione", "nuova_ricetta", "lavorazione", "inizio_lavoro", "stampa_etichette"];
const SECONDI_ANNULLA = 5;
// 🧠 Sulle pagine del cervello operativo, l'admin detta le regole: Tony propone le modifiche e aspetta la conferma
const URL_CERVELLO = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-cervello-voce";
const modoCervello = () => /^(giorni-lavorazione|modelli-buffet|cc-sedi|scheda-evento)/.test(pagina || "")
  && ["admin", "superadmin"].includes(String(window.state?.ruoloRaw || window.state?.ruolo || "").toLowerCase());
let propostaCervello = null;
const VAPID_PUBBLICA = "BNb6u5McWxUNv_4pyvih-b5gl7KyJezR7pSefqdKnXU_4udgvkDbd0uqxa-bRI46HSCFw5pNO7mUWOqnJafQpF8";
const VIBRA = [300, 120, 300, 120, 600];

let pagina = "";
let stato = "riposo"; // riposo | registra | elabora | conferma
let fab, pannello;
let ctxAudio = null, stream = null, rec = null, pezzi = [], mimeRec = "";
let timerSilenzio = null, timerMax = null, rafVad = null;
let timerConferma = null, azioneInAttesa = null, trascrizioneInAttesa = "";
let silenzioso = null, canale = null, ultimoTrigger = 0;
// Dettatura (ricette lunghe): niente stop sulle pause, si ferma col tocco. Si attiva nelle pagine
// delle ricette o da sola se parli piu' di 6 secondi di fila.
let dettatura = false;
const DETTATURA_MAX = 180000, DETTATURA_SILENZIO = 30000;
let diag = { picco: 0, fondo: 0, parlato: false, vad: false, inizio: 0 };

const sb = () => window.supabaseClient || window.supabase;
const imp = (k, d) => { try { const v = localStorage.getItem("voce_" + k); return v === null ? d : v; } catch { return d; } };
const salvaImp = (k, v) => { try { localStorage.setItem("voce_" + k, v); } catch {} };

function annunciDefault() {
  const m = String(window.state?.dipendente?.mansione || window.state?.dipendente?.ruolo || "").toLowerCase();
  if (/cuoc|cucin|chef|pizz|pastic|lavapiatt/.test(m)) return "cucina";
  if (/camer|sala|bar|maitre|maître|runner|commis/.test(m)) return "sala";
  return "tutti";
}

export function initVoce(routeName) {
  pagina = routeName || "";
  const loggato = !!(window.state?.user && window.state?.azienda?.id);
  const escluse = ["login", "menu-pubblico", "prenotazione-online", "prodotto-pubblico"];
  if (!loggato || escluse.includes(pagina) || imp("spento", "0") === "1") {
    if (fab) fab.style.display = "none";
    return;
  }
  if (!fab) creaInterfaccia();
  fab.style.display = "";
  avviaAnnunci();
  registraServiceWorker();
  if (pagina === "bo-comande" || pagina === "display-cucina") setTimeout(proponiNotifiche, 1500);
}

/* ─────────────── notifiche push: vibrano anche a telefono bloccato ─────────────── */
const pushPossibile = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const daHome = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

function registraServiceWorker() {
  if (!("serviceWorker" in navigator) || registraServiceWorker.fatto) return;
  registraServiceWorker.fatto = true;
  navigator.serviceWorker.register("/sw.js").then(() => aggiornaIscrizione()).catch(() => {});
}

function statoNotifiche() {
  if (isIphone() && !daHome()) return "home";       // su iPhone servono dall'icona sulla Home
  if (!pushPossibile()) return "no";
  if (Notification.permission === "granted") return "attive";
  if (Notification.permission === "denied") return "bloccate";
  return "da_attivare";
}

function chiaveBin(b64) {
  const p = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + p).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function attivaNotifiche() {
  const st = statoNotifiche();
  if (st === "home") { mostra({ c: "Su iPhone: tocca Condividi → «Aggiungi alla schermata Home», apri Ristoflow dall'icona e attiva qui le notifiche", durata: 12000 }); return false; }
  if (st === "no") { mostra({ ko: true, c: "Questo browser non supporta le notifiche" }); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { mostra({ ko: true, c: "Notifiche non permesse: abilitale nelle impostazioni del telefono" }); return false; }
  const ok = await aggiornaIscrizione(true);
  if (ok) { try { navigator.vibrate?.(VIBRA); } catch {} mostra({ c: "🔔 Notifiche attive su questo telefono", durata: 3500 }); }
  return ok;
}

// Salva (o aggiorna) l'iscrizione di questo telefono: reparto e sede seguono le impostazioni
async function aggiornaIscrizione(forza) {
  try {
    if (!pushPossibile() || Notification.permission !== "granted") return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub && forza) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveBin(VAPID_PUBBLICA) });
    if (!sub) return false;
    const j = sub.toJSON();
    const { data, error } = await sb().rpc("push_iscrivi", {
      p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
      p_azienda: window.state?.azienda?.id, p_sede: window.state?.sedeAttiva?.id || null,
      p_annunci: imp("annunci", annunciDefault()), p_dispositivo: navigator.userAgent,
    });
    if (error) { console.warn("push:", error.message); return false; }
    return data === true;
  } catch (e) { console.warn("push:", e); return false; }
}

// Una volta sola, in sala o in cucina: proposta discreta di attivare le notifiche
function proponiNotifiche() {
  const st = statoNotifiche();
  if (st === "attive" || st === "no" || st === "bloccate" || imp("proposta_push", "0") === "1" || stato !== "riposo") return;
  salvaImp("proposta_push", "1");
  mostra({
    t: "🔔 Portate pronte anche a telefono bloccato",
    c: st === "home" ? "Su iPhone aggiungi Ristoflow alla schermata Home (Condividi → Aggiungi a Home) e attiva da lì." : "Il telefono vibra quando la cucina dice che il tuo tavolo è pronto.",
    extra: st === "home" ? "" : `<div class="va" style="margin-top:10px"><button class="ann" data-pno>Non ora</button><button class="ora" data-psi>Attiva</button></div>`,
    durata: 15000,
  });
  pannello.querySelector("[data-psi]")?.addEventListener("click", () => { sblocca(); attivaNotifiche(); });
  pannello.querySelector("[data-pno]")?.addEventListener("click", () => { pannello.style.display = "none"; });
}

/* ─────────────── interfaccia ─────────────── */
function creaInterfaccia() {
  const st = document.createElement("style");
  st.textContent = `
  #voce-fab{position:fixed;left:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:9990;width:62px;height:62px;border-radius:50%;
    border:none;background:#023C59;color:#fff;font-size:27px;box-shadow:0 6px 20px rgba(2,60,89,.35);cursor:pointer;
    display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;}
  #voce-fab.registra{background:#DC2626;animation:vocePulse 1s infinite;}
  #voce-fab.elabora{background:#E66101;}
  #voce-fab.conferma{background:#348127;}
  @keyframes vocePulse{0%{box-shadow:0 0 0 0 rgba(220,38,38,.55)}70%{box-shadow:0 0 0 16px rgba(220,38,38,0)}100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}
  #voce-pan{position:fixed;left:12px;right:12px;bottom:calc(156px + env(safe-area-inset-bottom,0px));z-index:9991;max-width:520px;margin:0 auto;
    background:#fff;border-radius:16px;box-shadow:0 10px 36px rgba(0,0,0,.25);padding:14px 16px;font-family:inherit;color:#12232E;display:none;}
  #voce-pan .vt{font-size:12.5px;color:#6B7A83;margin-bottom:4px;}
  #voce-pan .vc{font-size:18px;font-weight:800;line-height:1.3;}
  #voce-pan .vb{height:6px;border-radius:3px;background:#E2E6EA;margin:12px 0 10px;overflow:hidden;}
  #voce-pan .vb i{display:block;height:100%;background:#348127;width:100%;transition:width linear;}
  #voce-pan .va{display:flex;gap:8px;}
  #voce-pan button{flex:1;border:none;border-radius:11px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;}
  #voce-pan .ann{background:#FEE2E2;color:#B91C1C;} #voce-pan .ora{background:#348127;color:#fff;}
  #voce-pan .ok{background:#F0FDF4;} #voce-pan.ko .vc{color:#B91C1C;}
  #voce-pan.annuncio{background:#023C59;color:#fff;} #voce-pan.annuncio .vt{color:#BFD7E3;}
  #voce-imp{position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center;}
  #voce-imp .s{background:#fff;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));}
  #voce-imp h3{margin:0 0 12px;font-size:18px;} #voce-imp .r{margin:14px 0 6px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#6B7A83;}
  #voce-imp .g{display:flex;gap:6px;flex-wrap:wrap;}
  #voce-imp .g button{border:1.5px solid #E2E6EA;background:#fff;border-radius:999px;padding:8px 14px;font-size:14px;font-weight:700;color:#023C59;cursor:pointer;}
  #voce-imp .g button.on{background:#023C59;border-color:#023C59;color:#fff;}
  #voce-imp .n{font-size:13px;color:#6B7A83;line-height:1.5;margin-top:6px;}
  #voce-imp .chiudi{margin-top:16px;width:100%;border:none;border-radius:12px;padding:13px;background:#023C59;color:#fff;font-size:15px;font-weight:700;}`;
  document.head.appendChild(st);

  fab = document.createElement("button");
  fab.id = "voce-fab"; fab.type = "button"; fab.textContent = "🎙️";
  fab.setAttribute("aria-label", "Comando vocale (tieni premuto per le impostazioni)");
  document.body.appendChild(fab);
  pannello = document.createElement("div");
  pannello.id = "voce-pan";
  document.body.appendChild(pannello);

  // tocco = comando; tieni premuto = impostazioni
  let tLungo = null, lungo = false;
  fab.addEventListener("pointerdown", () => { lungo = false; tLungo = setTimeout(() => { lungo = true; apriImpostazioni(); }, 650); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(e => fab.addEventListener(e, () => clearTimeout(tLungo)));
  fab.addEventListener("click", (e) => { e.preventDefault(); if (lungo) return; sblocca(); premi("tocco"); });
  fab.addEventListener("contextmenu", (e) => e.preventDefault());

  // Telecomando Bluetooth: si presenta come tastiera e manda "Invio"
  document.addEventListener("keydown", (e) => {
    if (imp("telecomando", "1") !== "1" || fab.style.display === "none") return;
    if (e.key !== "Enter" && e.key !== "AudioVolumeUp" && e.code !== "NumpadEnter") return;
    const el = document.activeElement;
    const scrive = el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
    if (scrive) return;
    e.preventDefault(); e.stopPropagation();
    premi("telecomando");
  }, true);

  aggiornaFab();
}

function aggiornaFab() {
  if (!fab) return;
  fab.className = stato === "riposo" ? "" : stato;
  fab.textContent = stato === "registra" ? (dettatura ? "⏹" : "⏺") : stato === "elabora" ? "⏳" : stato === "conferma" ? "✋" : "🎙️";
}

function apriImpostazioni() {
  const annunci = imp("annunci", annunciDefault());
  const cuffie = imp("cuffie", "1"), tele = imp("telecomando", "1");
  const ov = document.createElement("div");
  ov.id = "voce-imp";
  const g = (k, val, opz) => `<div class="g">${opz.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${val === v ? "on" : ""}">${l}</button>`).join("")}</div>`;
  ov.innerHTML = `<div class="s">
    <h3>🎙️ Comandi vocali</h3>
    <div class="r">Annunci su questo telefono</div>
    ${g("annunci", annunci, [["sala", "Sala"], ["cucina", "Cucina"], ["tutti", "Tutti"], ["nessuno", "Nessuno"]])}
    <div class="n">Sala riceve "uscita pronta", cucina riceve "via la seconda uscita".</div>
    <div class="r">Notifiche a telefono bloccato</div>
    <div class="g"><button data-push>${({ attive: "✅ Attive", home: "Da attivare dalla Home", bloccate: "Bloccate dal telefono", no: "Non supportate", da_attivare: "🔔 Attiva" })[statoNotifiche()]}</button></div>
    <div class="n">${statoNotifiche() === "home" ? "Su iPhone: Condividi → «Aggiungi alla schermata Home», poi apri Ristoflow dall'icona." : "Vibra quando arriva «portata pronta» per i tuoi tavoli."}</div>
    <div class="r">Tasto dell'auricolare</div>
    ${g("cuffie", cuffie, [["1", "Attivo"], ["0", "Spento"]])}
    <div class="r">Telecomando Bluetooth (Invio)</div>
    ${g("telecomando", tele, [["1", "Attivo"], ["0", "Spento"]])}
    <div class="r">Pulsante</div>
    ${g("spento", imp("spento", "0"), [["0", "Visibile"], ["1", "Nascondi"]])}
    <div class="n">Si comanda così: un click, parli ("tavolo 12 via i secondi", "il 7 è pronto",
      "fatti 40 budini di zucca abbattuti", "nuova ricetta…"), poi ti fermi. Tony rilegge e dopo 5 secondi esegue:
      un click in quei 5 secondi annulla.</div>
    <button class="chiudi">Fatto</button></div>`;
  document.body.appendChild(ov);
  ov.addEventListener("click", async (e) => {
    const bp = e.target.closest("[data-push]");
    if (bp) { const ok = await attivaNotifiche(); if (ok) bp.textContent = "✅ Attive"; return; }
    const b = e.target.closest("[data-k]");
    if (b) {
      salvaImp(b.dataset.k, b.dataset.v);
      b.parentElement.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      if (b.dataset.k === "cuffie") b.dataset.v === "1" ? avviaCuffie() : fermaCuffie();
      if (b.dataset.k === "annunci") aggiornaIscrizione();
      return;
    }
    if (e.target === ov || e.target.classList.contains("chiudi")) {
      ov.remove();
      if (imp("spento", "0") === "1" && fab) fab.style.display = "none";
    }
  });
}

/* ─────────────── sblocco audio (iPhone vuole un tocco vero) ─────────────── */
function sblocca() {
  try {
    if (!ctxAudio) ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxAudio.state === "suspended") ctxAudio.resume();
  } catch {}
  try { if (window.speechSynthesis && !sblocca.fatto) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u); sblocca.fatto = true; } } catch {}
  if (imp("cuffie", "1") === "1") avviaCuffie();
}

function bip(note) {
  try {
    if (!ctxAudio) return;
    let t = ctxAudio.currentTime;
    note.forEach(([f, d]) => {
      const o = ctxAudio.createOscillator(), g = ctxAudio.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(ctxAudio.destination); o.start(t); o.stop(t + d + 0.02);
      t += d + 0.04;
    });
  } catch {}
}
const BIP_VIA = [[880, 0.12]], BIP_STOP = [[660, 0.09], [990, 0.12]], BIP_ANNULLA = [[440, 0.18]], BIP_FATTO = [[784, 0.1], [1046, 0.16]];

function parla(testo) {
  return new Promise((ok) => {
    try {
      if (!window.speechSynthesis || !testo) return ok();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(testo).replace(/[\u{1F300}-\u{1FAFF}]/gu, ""));
      u.lang = "it-IT"; u.rate = 1.08;
      const v = speechSynthesis.getVoices().find(x => /^it/i.test(x.lang));
      if (v) u.voice = v;
      u.onend = () => ok(); u.onerror = () => ok();
      speechSynthesis.speak(u);
      setTimeout(ok, 6000);
    } catch { ok(); }
  });
}

/* ─────────────── auricolare: il tasto play/pausa arriva come Media Session ─────────────── */
// Il browser passa i tasti dell'auricolare solo alla pagina che "sta suonando":
// teniamo in loop un audio muto, così il click arriva a noi.
function audioMuto() {
  const sr = 8000, n = sr; // 1 secondo
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, "data"); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
function avviaCuffie() {
  if (!("mediaSession" in navigator)) return;
  try {
    if (!silenzioso) { silenzioso = new Audio(audioMuto()); silenzioso.loop = true; silenzioso.setAttribute("playsinline", ""); }
    silenzioso.play().catch(() => {});
    navigator.mediaSession.metadata = new MediaMetadata({ title: "Ristoflow · comandi vocali", artist: "Click per parlare" });
    const h = () => { premi("auricolare"); silenzioso.play().catch(() => {}); navigator.mediaSession.playbackState = "playing"; };
    ["play", "pause", "stop", "nexttrack", "previoustrack"].forEach(a => { try { navigator.mediaSession.setActionHandler(a, h); } catch {} });
    navigator.mediaSession.playbackState = "playing";
  } catch {}
}
function fermaCuffie() {
  try { silenzioso?.pause(); ["play", "pause", "stop", "nexttrack", "previoustrack"].forEach(a => navigator.mediaSession.setActionHandler(a, null)); } catch {}
}

/* ─────────────── il click: cosa fa dipende da dove siamo ─────────────── */
function premi(da) {
  const ora = Date.now();
  if (ora - ultimoTrigger < 450) return; // alcuni auricolari mandano play+pausa insieme
  ultimoTrigger = ora;
  if (stato === "riposo") return avviaRegistrazione();
  if (stato === "registra") return fermaRegistrazione();
  if (stato === "conferma") return annulla("Annullato");
}

async function avviaRegistrazione() {
  if (!navigator.mediaDevices?.getUserMedia) { mostra({ ko: true, c: "Questo browser non può usare il microfono" }); return; }
  stato = "registra"; aggiornaFab();
  try { speechSynthesis?.cancel(); } catch {}
  try { silenzioso?.pause(); } catch {} // su iPhone l'audio muto in riproduzione puo' disturbare il microfono
  diag = { picco: 0, fondo: 0, parlato: false, vad: false, inizio: Date.now() };
  const vincoli = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
  try {
    stream = await navigator.mediaDevices.getUserMedia(vincoli);
  } catch (e1) {
    // Su iPhone il microfono e' spesso solo "occupato" per un attimo (Tony che parla, auricolare che si collega,
    // altra app): riprovo una volta, poi con le impostazioni di base. Il permesso negato non si riprova.
    let e = e1;
    if (e1?.name !== "NotAllowedError") {
      await new Promise(r => setTimeout(r, 450));
      try { stream = await navigator.mediaDevices.getUserMedia(vincoli); e = null; }
      catch (e2) {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); e = null; } catch (e3) { e = e3; }
      }
    }
    if (e) {
      stato = "riposo"; aggiornaFab();
      const nome = e?.name || "Errore";
      const msg = nome === "NotAllowedError" || nome === "SecurityError"
        ? "Il microfono non ha il permesso. Chiudi Ristoflow dal multitasking, riaprilo e alla domanda tocca «Consenti». Se non chiede niente: Impostazioni › App › Safari › Microfono › Chiedi."
        : nome === "NotFoundError"
          ? "Nessun microfono trovato: se usi l'auricolare, controlla che sia acceso e collegato."
          : "Microfono occupato (chiamata, altra app o auricolare che si collega). Riprova tra un attimo.";
      mostra({ ko: true, c: msg + " (" + nome + ")", durata: 9000 });
      try {
        sb().from("voce_log").insert({ azienda_id: window.state?.azienda?.id, sede_id: window.state?.sedeAttiva?.id || null,
          pagina: (location.hash || "").replace(/^#\/?/, ""), azione: { tipo: "microfono_ko" },
          esito: { fase: "microfono", errore: nome, messaggio: String(e?.message || "").slice(0, 200), ua: navigator.userAgent } }).then(() => {}, () => {});
      } catch (_) { /* il registro e' facoltativo */ }
      return;
    }
  }
  bip(BIP_VIA);
  mimeRec = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(m => window.MediaRecorder?.isTypeSupported?.(m)) || "";
  pezzi = [];
  rec = new MediaRecorder(stream, mimeRec ? { mimeType: mimeRec } : undefined);
  mimeRec = rec.mimeType || mimeRec || "audio/mp4";
  rec.ondataavailable = (e) => { if (e.data?.size) pezzi.push(e.data); };
  rec.onstop = invia;
  rec.start(200);
  dettatura = /ricett/.test(pagina || "") || modoCervello(); aggiornaFab();
  mostra(modoCervello()
    ? { t: "🧠 Istruisci il cervello", c: "Detta le regole con calma (giorni, fasi, chi fa cosa, ricorrenti, buffet). Tocca 🎙️ quando hai finito." }
    : dettatura
    ? { t: "📝 Dettatura", c: "Detta con calma, anche con pause. Tocca 🎙️ quando hai finito." }
    : { t: "Ti ascolto…", c: "Parla, poi fermati: mi accorgo da solo" });
  ascoltaSilenzio();
  timerMax = setTimeout(fermaRegistrazione, dettatura ? DETTATURA_MAX : 15000);
}

// Si ferma da solo: 1,5 s di silenzio dopo che hai parlato, o 6 s se non parli proprio
function ascoltaSilenzio() {
  try {
    if (!ctxAudio) ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctxAudio.createMediaStreamSource(stream), an = ctxAudio.createAnalyser();
    an.fftSize = 1024; src.connect(an);
    const dati = new Float32Array(an.fftSize);
    const inizio = Date.now();
    let fondo = 0, campioni = 0, parlato = false, ultimaVoce = Date.now(), primaVoce = 0;
    const giro = () => {
      if (stato !== "registra") return;
      an.getFloatTimeDomainData(dati);
      let s = 0; for (let i = 0; i < dati.length; i++) s += dati[i] * dati[i];
      const rms = Math.sqrt(s / dati.length);
      const t = Date.now() - inizio;
      if (t < 350) { fondo += rms; campioni++; }
      if (rms > 0.0005) diag.vad = true;
      if (rms > diag.picco) diag.picco = rms;
      diag.fondo = campioni ? fondo / campioni : 0;
      const soglia = Math.max(0.015, Math.min(0.02, campioni ? fondo / campioni : 0.01) * 2.2); // se parli subito il "fondo" non deve alzare troppo la soglia
      if (rms > soglia) { if (!parlato) primaVoce = Date.now(); parlato = true; diag.parlato = true; ultimaVoce = Date.now(); }
      // parla da piu' di 6 secondi: e' una dettatura (es. "nuova ricetta..."), non un comando
      if (!dettatura && parlato && Date.now() - primaVoce > 6000 && Date.now() - ultimaVoce < 1200) {
        dettatura = true; aggiornaFab();
        clearTimeout(timerMax); timerMax = setTimeout(fermaRegistrazione, DETTATURA_MAX);
        mostra({ t: "📝 Dettatura", c: "Continua con calma, anche con pause. Tocca 🎙️ quando hai finito." });
      }
      if (parlato && Date.now() - ultimaVoce > (dettatura ? DETTATURA_SILENZIO : 1500)) return fermaRegistrazione();
      if (!parlato && t > (dettatura ? 15000 : 6000)) return fermaRegistrazione();
      rafVad = requestAnimationFrame(giro);
    };
    rafVad = requestAnimationFrame(giro);
  } catch {}
}

function fermaRegistrazione() {
  if (stato !== "registra") return;
  stato = "elabora"; aggiornaFab();
  clearTimeout(timerMax); cancelAnimationFrame(rafVad);
  bip(BIP_STOP);
  try { rec?.state !== "inactive" && rec.stop(); } catch { invia(); }
}

async function invia() {
  try { stream?.getTracks().forEach(t => t.stop()); } catch {}
  stream = null;
  if (imp("cuffie", "1") === "1") setTimeout(avviaCuffie, 300); // il microfono chiuso libera di nuovo il tasto
  const blob = new Blob(pezzi, { type: mimeRec });
  const durata = Date.now() - diag.inizio;
  if (blob.size < 2500 || (diag.vad && diag.picco < 0.008)) {
    finisci(); mostra({ ko: true, c: "Non ti ho sentito: parla più vicino al microfono e riprova" });
    parla("Non ti ho sentito"); return;
  }
  mostra({ t: "Tony sta capendo…", c: "…" });
  try {
    const b64 = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
    if (modoCervello()) {
      mostra({ t: "🧠 Tony legge il cervello…", c: "Preparo le modifiche da farti confermare" });
      const dc = await chiamaCervello({ modo: "capisci", audio_base64: b64, mime: mimeRec });
      if (dc.errore) throw new Error(dc.errore);
      return mostraCervello(dc);
    }
    const d = await chiama({ modo: "capisci", audio_base64: b64, mime: mimeRec,
      diag: { byte: blob.size, ms: durata, picco: +diag.picco.toFixed(4), fondo: +diag.fondo.toFixed(4), parlato: diag.parlato, vad: diag.vad, ua: navigator.userAgent.slice(0, 120) } });
    if (d.errore) throw new Error(d.errore);
    gestisci(d.trascrizione || "", d.azione || {});
  } catch (e) {
    finisci();
    mostra({ ko: true, c: "Non riuscito: " + (e.message || e) });
    parla("Non riuscito");
  }
}

async function chiama(corpo) {
  const s = await sb().auth.getSession();
  const tok = s?.data?.session?.access_token || "";
  const r = await fetch(URL_EF, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
    body: JSON.stringify({ ...corpo, azienda_id: window.state?.azienda?.id, sede_id: window.state?.sedeAttiva?.id || null, pagina }),
  });
  return await r.json();
}

/* ─────────────── rilettura, 5 secondi per annullare, esecuzione ─────────────── */
function gestisci(trascrizione, a) {
  const detto = trascrizione ? "«" + trascrizione + "»" : "";
  if (!ESEGUIBILI.includes(a.tipo)) {
    finisci();
    mostra({ t: detto, c: a.conferma || "Non ho capito, ripeti", ko: a.tipo === "non_capito", durata: a.tipo === "risposta" ? 9000 : 5000 });
    parla(a.conferma || "Non ho capito, ripeti");
    return;
  }
  stato = "conferma"; aggiornaFab();
  azioneInAttesa = a; trascrizioneInAttesa = trascrizione;
  pannello.className = ""; pannello.style.display = "block";
  pannello.innerHTML = `<div class="vt">${esc(detto)}</div><div class="vc">${esc(a.conferma)}</div>
    <div class="vb"><i></i></div>
    <div class="va"><button class="ann">✕ Annulla</button><button class="ora">✓ Fai subito</button></div>`;
  pannello.querySelector(".ann").onclick = () => annulla("Annullato");
  pannello.querySelector(".ora").onclick = () => esegui();
  const barra = pannello.querySelector(".vb i");
  requestAnimationFrame(() => { barra.style.transitionDuration = SECONDI_ANNULLA + "s"; barra.style.width = "0%"; });
  parla(a.conferma);
  timerConferma = setTimeout(esegui, SECONDI_ANNULLA * 1000);
}

function annulla(msg) {
  clearTimeout(timerConferma);
  azioneInAttesa = null; finisci();
  bip(BIP_ANNULLA);
  mostra({ c: msg, durata: 2000 });
  parla(msg);
}

async function esegui() {
  clearTimeout(timerConferma);
  const a = azioneInAttesa; azioneInAttesa = null;
  if (!a) return;
  stato = "elabora"; aggiornaFab();

  if (a.tipo === "nuova_ricetta") {
    finisci(); bip(BIP_FATTO);
    apriRicetta(a.testo || trascrizioneInAttesa);
    mostra({ c: "Apro la ricetta con Tony", durata: 2500 });
    return;
  }
  try {
    const d = await chiama({ modo: "esegui", azione: a, trascrizione: trascrizioneInAttesa });
    finisci();
    if (!d || d.errore || d.ok === false) throw new Error(d?.messaggio || d?.errore || "errore");
    bip(BIP_FATTO);
    const u = d.lotto_uuid ? encodeURIComponent(d.lotto_uuid) : "";
    const link = d.lotto_uuid ? `<div class="va" style="margin-top:10px;">
      <a href="#/registro-lotti?lotto=${u}&etichetta=1" class="ora" style="flex:2;text-align:center;text-decoration:none;border-radius:11px;padding:12px;font-weight:700;">🏷 Etichetta e scadenza</a>
      <a href="#/preparazioni?lotto=${u}" style="flex:1;text-align:center;text-decoration:none;border-radius:11px;padding:12px;font-weight:700;background:#E2E6EA;color:#023C59;">Fasi HACCP</a></div>` : "";
    const st = d.stampa || null;
    const btnStampa = st && st.pronta && !st.richiesta
      ? `<button type="button" id="voce-stampa" class="ora" style="width:100%;margin-top:8px;border:0;border-radius:11px;padding:12px;font-weight:700;cursor:pointer;">🖨 Stampa ${st.copie} ${st.copie === 1 ? "etichetta" : "etichette"}</button>` : "";
    const avviso = st && st.richiesta && !st.pronta
      ? `<div style="margin-top:8px;background:#fffbeb;color:#92400e;border-radius:10px;padding:8px 10px;font-size:13px;font-weight:700;">Etichetta non stampata: ${st.motivo || "da controllare"}</div>` : "";
    mostra({ t: "Fatto", c: d.messaggio || a.conferma, extra: avviso + link + btnStampa, durata: d.lotto_uuid ? 12000 : 3500 });
    document.getElementById("voce-stampa")?.addEventListener("click", () => stampaDaVoce(st));
    if (st && st.richiesta && st.pronta) {
      parla("Registrato, stampo le etichette");
      stampaDaVoce(st);
    } else if (st && st.richiesta) {
      parla("Registrato. Etichetta non stampata: " + (st.motivo || "da controllare"));
    } else {
      parla(a.tipo === "inizio_lavoro" ? "Tempo partito" : a.tipo === "preparazione" || a.tipo === "lavorazione" ? "Registrato" : "Fatto");
    }
    window.dispatchEvent(new CustomEvent("ristoflow:voce-eseguito", { detail: { azione: a, esito: d } }));
  } catch (e) {
    finisci();
    mostra({ ko: true, c: "Non riuscito: " + (e.message || e) });
    parla("Non riuscito");
  }
}

// 🖨 Etichette chieste a voce: l'immagine si disegna qui sul telefono (come dal registro lotti)
// e va alla Brother tramite il ponte, nel formato impostato sulla stampante.
async function stampaDaVoce(st) {
  if (!st || !st.lotto_uuid) return;
  try {
    const az = window.state?.azienda?.id;
    const { data: info } = await sb().from("produzione_lotti").select("*").eq("lotto_uuid", st.lotto_uuid).maybeSingle();
    if (!info) throw new Error("lotto non trovato");
    const [{ data: etichetta }, { data: produttore }] = await Promise.all([
      sb().from("etichette").select("*").eq("ricetta_id", info.ricetta_id).order("id", { ascending: false }).limit(1).maybeSingle(),
      sb().from("etichette_produttore").select("*").eq("azienda_id", az).maybeSingle(),
    ]);
    if (!etichetta || etichetta.confermata === false) throw new Error("etichetta da confermare");
    if (!produttore) throw new Error("mancano i dati del produttore");
    const { inviaEtichetteLotto } = await import("../modules/produzione/etichette-lotto.js");
    const peso = st.peso_g || etichetta.peso_netto_g || "";
    const r = await inviaEtichetteLotto({ etichetta, produttore, info, peso, copie: st.copie || 1 });
    if (r.ok) { mostra({ t: "🖨 In stampa", c: (st.copie || 1) + " " + ((st.copie || 1) === 1 ? "etichetta" : "etichette") + " · lotto " + (info.codice_lotto || ""), durata: 4000 }); return; }
    throw new Error(r.motivo === "nessuna_stampante" ? "nessuna etichettatrice collegata" : r.motivo === "troppo_lungo" ? "il testo non entra nell'etichetta" : r.motivo);
  } catch (e) {
    mostra({ ko: true, c: "Etichette non stampate: " + (e.message || e), durata: 6000 });
    parla("Etichette non stampate");
  }
}

// Nuova ricetta: se la chat di Tony e' gia' aperta scrivo li', altrimenti apro Crea ricetta
function apriRicetta(testo) {
  const inp = document.querySelector("#rc-input"), invio = document.querySelector("#rc-send");
  if (inp && invio) { inp.value = testo; invio.click(); return; }
  window.__tonyRicettaVoce = testo;
  if (location.hash.startsWith("#/crea-ricetta")) { location.hash = "#/crea-ricetta?voce=" + Date.now(); }
  else location.hash = "#/crea-ricetta";
}

function finisci() { stato = "riposo"; aggiornaFab(); }

let timerPannello = null;
function mostra({ t = "", c = "", ko = false, extra = "", durata = 0, annuncio = false }) {
  if (!pannello) return;
  clearTimeout(timerPannello);
  pannello.className = (ko ? "ko" : "") + (annuncio ? " annuncio" : "");
  pannello.style.display = "block";
  pannello.innerHTML = (t ? `<div class="vt">${esc(t)}</div>` : "") + `<div class="vc">${esc(c)}</div>` + extra;
  if (durata || ko) timerPannello = setTimeout(() => { if (stato !== "conferma") pannello.style.display = "none"; }, durata || 4500);
  if (!durata && !ko && stato === "riposo") timerPannello = setTimeout(() => { pannello.style.display = "none"; }, 4000);
}

/* ─────────────── annunci in tempo reale ─────────────── */
function avviaAnnunci() {
  const az = window.state?.azienda?.id;
  if (!az || canale?.__az === az) return;
  try { canale && sb().removeChannel(canale); } catch {}
  canale = sb().channel("voce-annunci-" + az)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "voce_annunci", filter: "azienda_id=eq." + az }, (p) => {
      const r = p.new || {};
      if (r.creato_da && r.creato_da === window.state?.user?.id) return;
      const sede = window.state?.sedeAttiva?.id;
      if (r.sede_id && sede && r.sede_id !== sede) return;
      const voglio = imp("annunci", annunciDefault());
      if (voglio === "nessuno") return;
      if (voglio !== "tutti" && r.destinatari !== "tutti" && r.destinatari !== voglio) return;
      // portata pronta per un cameriere preciso: la sente lui (e chi segue "tutti")
      if (r.destinatario_user_id && r.destinatario_user_id !== window.state?.user?.id && voglio !== "tutti") return;
      if (stato === "registra" || stato === "conferma") return; // non interrompo chi sta parlando
      bip([[988, 0.1], [988, 0.1]]);
      try { navigator.vibrate?.(VIBRA); } catch {}
      mostra({ t: r.destinatari === "sala" ? "🍽️ Dalla cucina" : "🔔 Dalla sala", c: r.testo, annuncio: true, durata: 7000 });
      parla(r.testo);
    })
    .subscribe();
  canale.__az = az;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
