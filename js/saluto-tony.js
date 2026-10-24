// js/saluto-tony.js
// Tony ti saluta quando apri l'app: ti chiama per nome e ti invita a fare la cosa che serve adesso
// (prenotazioni da confermare, lavorazioni di oggi, preventivi in trattativa).
// Una volta per apertura, solo nell'app (mai nelle pagine dei clienti). Si chiude con la X o da solo.
// Tocca "🔊" per sentirlo parlare.
(function () {
  "use strict";
  if (window.__rfSalutoTony) return;
  window.__rfSalutoTony = true;
  if (!document.querySelector(".app-header")) return;                 // pagine pubbliche: niente
  try { if (sessionStorage.getItem("rf_saluto_tony")) return; } catch (e) {}

  var AVATAR = "https://cuhcscpvhypoaplcmtjk.supabase.co/storage/v1/object/public/Avatar/Tony.png";
  var menoMoto = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sb = function () { return window.supabaseClient || window.supabase; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var dataLocale = function (d) { var p = function (n) { return String(n).padStart(2, "0"); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };

  // aspetta che l'app abbia caricato chi sei e la sede (fino a 60 secondi)
  var tent = 0;
  var giro = setInterval(function () {
    tent++;
    var s = window.state || {};
    if (s.user && s.azienda && s.azienda.id && s.sedeAttiva && s.sedeAttiva.id && (s.ruolo || s.viewAs)) { clearInterval(giro); avvia(s); }
    else if (tent > 120) clearInterval(giro);
  }, 500);

  function primoNome(s) {
    var meta = (s.user && s.user.user_metadata) || {};
    var prof = s.userProfile || s.profilo || s.dipendente || {};
    return String(prof.nome || meta.nome || meta.first_name || "").trim().split(/\s+/)[0];
  }

  async function inviti(s, ruolo) {
    var oggi = dataLocale(new Date()), aid = s.azienda.id, sid = s.sedeAttiva.id;
    var admin = ruolo === "admin" || ruolo === "superadmin";
    var resp = admin || ruolo === "manager";
    var puo = function (r) { return window.hasPermission ? window.hasPermission(r) : true; };
    var conta = async function (q) { try { var r = await q; return r.count || 0; } catch (e) { return 0; } };
    var lav = await conta(sb().from("produzioni_settimanali").select("id", { count: "exact", head: true }).eq("azienda_id", aid).eq("sede_id", sid).eq("data", oggi).in("stato", ["da_fare", "in_corso"]));
    var pren = resp ? await conta(sb().from("prenotazioni_tavoli").select("id", { count: "exact", head: true }).eq("azienda_id", aid).eq("sede_id", sid).gte("data", oggi).eq("stato", "in_attesa")) : 0;
    var prev = admin ? await conta(sb().from("preventivi").select("id", { count: "exact", head: true }).eq("azienda_id", aid).eq("stato", "trattativa")) : 0;
    var l = [];
    if (pren && puo("prenotazioni")) l.push({ t: pren === 1 ? "1 prenotazione da confermare" : pren + " prenotazioni da confermare", r: "prenotazioni", i: "📅" });
    if (lav && puo("planner-produzione")) l.push({ t: lav === 1 ? "Oggi c'è 1 lavorazione da fare" : "Oggi ci sono " + lav + " lavorazioni da fare", r: "planner-produzione", i: "🍳" });
    if (prev && puo("preventivi")) l.push({ t: prev === 1 ? "1 preventivo in trattativa" : prev + " preventivi in trattativa", r: "preventivi", i: "📑" });
    // chi lavora in cucina vede prima le lavorazioni
    if (!resp) l.sort(function (a, b) { return (a.r === "planner-produzione" ? 0 : 1) - (b.r === "planner-produzione" ? 0 : 1); });
    return l.slice(0, 3);
  }

  function parla(testo) {
    try {
      if (!window.speechSynthesis || !testo) return;
      var u = new SpeechSynthesisUtterance(testo);
      u.lang = "it-IT"; u.pitch = 1.05; u.rate = 1.02;
      var voci = speechSynthesis.getVoices() || [];
      var it = voci.filter(function (v) { return /^it/i.test(v.lang); })[0];
      if (it) u.voice = it;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { /* resta il fumetto */ }
  }

  async function avvia(s) {
    try { sessionStorage.setItem("rf_saluto_tony", "1"); } catch (e) {}
    var ruolo = String((window.normalizeRuolo ? window.normalizeRuolo(s.viewAs || s.ruolo) : (s.viewAs || s.ruolo)) || "").toLowerCase();
    var nome = primoNome(s);
    var h = new Date().getHours();
    var saluto = h < 12 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
    var titolo = saluto + (nome ? " " + nome : "") + "!";
    var lista = [];
    try { lista = await inviti(s, ruolo); } catch (e) {}
    var frase = lista.length ? "Ti segnalo " + (lista.length === 1 ? "una cosa" : "alcune cose") + ":" : "Tutto sotto controllo. Buon lavoro!";
    mostra(titolo, frase, lista);
  }

  function mostra(titolo, frase, lista) {
    var box = document.createElement("div");
    box.id = "rf-tony-saluto";
    box.style.cssText = "position:fixed;right:12px;bottom:calc(112px + env(safe-area-inset-bottom,0px));z-index:3000;width:min(92vw,340px);font-family:inherit;";
    box.innerHTML = '<style>'
      + '#rf-tony-saluto .c{background:#fff;border:1px solid #D9E2E8;border-radius:18px;box-shadow:0 10px 30px rgba(2,60,89,.22);padding:12px 14px;' + (menoMoto ? "" : 'animation:rts-su .45s cubic-bezier(.2,1.2,.4,1) both;') + '}'
      + '#rf-tony-saluto .t{display:flex;gap:10px;align-items:flex-start;}'
      + '#rf-tony-saluto img{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #0E5A7A;flex-shrink:0;' + (menoMoto ? "" : 'animation:rts-onda 1.6s ease-in-out .5s 2;transform-origin:50% 90%;') + '}'
      + '#rf-tony-saluto .x{margin-left:auto;border:0;background:transparent;font-size:18px;color:#94a3b8;cursor:pointer;padding:0 2px;line-height:1;}'
      + '#rf-tony-saluto b{display:block;font-size:16px;color:#0f172a;}'
      + '#rf-tony-saluto .f{font-size:13.5px;color:#475569;margin-top:2px;}'
      + '#rf-tony-saluto .i{display:flex;align-items:center;gap:8px;width:100%;margin-top:8px;border:0;border-radius:12px;padding:11px 12px;background:#0E5A7A;color:#fff;font-size:14.5px;font-weight:700;cursor:pointer;text-align:left;}'
      + '#rf-tony-saluto .v{border:0;background:#EEF2F7;border-radius:999px;font-size:13px;padding:4px 10px;margin-top:8px;cursor:pointer;color:#334155;}'
      + '@keyframes rts-su{from{transform:translateY(40px) scale(.96);opacity:0}to{transform:none;opacity:1}}'
      + '@keyframes rts-onda{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}'
      + '</style>'
      + '<div class="c"><div class="t"><img src="' + AVATAR + '" alt="Tony"><div><b>' + esc(titolo) + ' 👋</b><div class="f">' + esc(frase) + '</div></div>'
      + '<button class="x" aria-label="Chiudi">✕</button></div>'
      + lista.map(function (x, n) { return '<button class="i" data-n="' + n + '"><span>' + x.i + '</span><span>' + esc(x.t) + '</span></button>'; }).join("")
      + '<button class="v" aria-label="Ascolta">🔊 Ascolta</button></div>';
    document.body.appendChild(box);

    var chiudi = function () { if (box.parentNode) box.remove(); };
    box.querySelector(".x").onclick = chiudi;
    box.querySelectorAll(".i").forEach(function (b) {
      b.onclick = function () { var x = lista[Number(b.dataset.n)]; chiudi(); window.location.hash = "#/" + x.r; };
    });
    var testoVoce = titolo + " " + (lista.length ? lista.map(function (x) { return x.t; }).join(". ") : "Tutto sotto controllo.");
    box.querySelector(".v").onclick = function () { parla(testoVoce); };
    // se il telefono lo permette parla da solo, altrimenti basta toccare "Ascolta"
    try { if (navigator.userActivation && navigator.userActivation.hasBeenActive) parla(testoVoce); } catch (e) {}
    // si chiude da solo, salvo che tu lo stia toccando
    var timer = setTimeout(chiudi, 15000);
    box.addEventListener("pointerdown", function () { clearTimeout(timer); timer = setTimeout(chiudi, 30000); });
  }
})();
