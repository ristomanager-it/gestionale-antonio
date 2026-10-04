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
const ESEGUIBILI = ["chiama_uscita", "uscita_pronta", "preparazione", "nuova_ricetta"];
const SECONDI_ANNULLA = 5;

let pagina = "";
let stato = "riposo"; // riposo | registra | elabora | conferma
let fab, pannello;
let ctxAudio = null, stream = null, rec = null, pezzi = [], mimeRec = "";
let timerSilenzio = null, timerMax = null, rafVad = null;
let timerConferma = null, azioneInAttesa = null, trascrizioneInAttesa = "";
let silenzioso = null, canale = null, ultimoTrigger = 0;
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
  fab.textContent = stato === "registra" ? "⏺" : stato === "elabora" ? "⏳" : stato === "conferma" ? "✋" : "🎙️";
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
  ov.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (b) {
      salvaImp(b.dataset.k, b.dataset.v);
      b.parentElement.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      if (b.dataset.k === "cuffie") b.dataset.v === "1" ? avviaCuffie() : fermaCuffie();
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
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (e) {
    stato = "riposo"; aggiornaFab();
    mostra({ ko: true, c: "Microfono non disponibile: dai il permesso al browser" }); return;
  }
  bip(BIP_VIA);
  mimeRec = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(m => window.MediaRecorder?.isTypeSupported?.(m)) || "";
  pezzi = [];
  rec = new MediaRecorder(stream, mimeRec ? { mimeType: mimeRec } : undefined);
  mimeRec = rec.mimeType || mimeRec || "audio/mp4";
  rec.ondataavailable = (e) => { if (e.data?.size) pezzi.push(e.data); };
  rec.onstop = invia;
  rec.start(200);
  mostra({ t: "Ti ascolto…", c: "Parla, poi fermati: mi accorgo da solo" });
  ascoltaSilenzio();
  timerMax = setTimeout(fermaRegistrazione, 15000);
}

// Si ferma da solo: 1,5 s di silenzio dopo che hai parlato, o 6 s se non parli proprio
function ascoltaSilenzio() {
  try {
    if (!ctxAudio) ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctxAudio.createMediaStreamSource(stream), an = ctxAudio.createAnalyser();
    an.fftSize = 1024; src.connect(an);
    const dati = new Float32Array(an.fftSize);
    const inizio = Date.now();
    let fondo = 0, campioni = 0, parlato = false, ultimaVoce = Date.now();
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
      if (rms > soglia) { parlato = true; diag.parlato = true; ultimaVoce = Date.now(); }
      if (parlato && Date.now() - ultimaVoce > 1500) return fermaRegistrazione();
      if (!parlato && t > 6000) return fermaRegistrazione();
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
    const d = await chiama({ modo: "capisci", audio_base64: b64, mime: mimeRec });
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
    const link = d.lotto_uuid ? `<a href="#/preparazioni?lotto=${encodeURIComponent(d.lotto_uuid)}" style="display:inline-block;margin-top:8px;color:#023C59;font-weight:800;">Apri il lotto →</a>` : "";
    mostra({ t: "Fatto", c: d.messaggio || a.conferma, extra: link, durata: d.lotto_uuid ? 9000 : 3500 });
    parla(a.tipo === "preparazione" ? "Registrato" : "Fatto");
    window.dispatchEvent(new CustomEvent("ristoflow:voce-eseguito", { detail: { azione: a, esito: d } }));
  } catch (e) {
    finisci();
    mostra({ ko: true, c: "Non riuscito: " + (e.message || e) });
    parla("Non riuscito");
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
      if (stato === "registra" || stato === "conferma") return; // non interrompo chi sta parlando
      bip([[988, 0.1], [988, 0.1]]);
      mostra({ t: r.destinatari === "sala" ? "🍽️ Dalla cucina" : "🔔 Dalla sala", c: r.testo, annuncio: true, durata: 7000 });
      parla(r.testo);
    })
    .subscribe();
  canale.__az = az;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
