// js/tema-stagionale.js
// Decorazioni di stagione: i colori dell'app restano quelli di sempre.
//  - Halloween (20 - 31 ott): una zucca che salta fuori in basso a destra all'apertura dell'app e grandi pipistrelli che attraversano lo schermo
//  - Natale (10 nov - 2 gen): alberelli sotto la barra, Babbo Natale che saluta per nome (2 secondi) e neve leggera
// Prova fuori stagione (dal browser): app.ristoflow-ai.com/?tema=halloween  oppure  ?tema=natale  (30 minuti)  ·  ?tema=0 per spegnere.
(function () {
  try {
    var TEMI = {
      halloween: { da: [10, 20], a: [10, 31], zucche: true, pipistrelli: true },
      natale:    { da: [11, 10], a: [1, 2],  neve: true },
    };

    var q = new URLSearchParams(location.search);
    if (q.has("tema")) {
      var v = q.get("tema");
      if (TEMI[v]) localStorage.setItem("rf_tema_prova", v + "|" + (Date.now() + 30 * 60 * 1000));
      else localStorage.removeItem("rf_tema_prova");
    }

    var scelto = null;
    var prova = (localStorage.getItem("rf_tema_prova") || "").split("|");
    if (TEMI[prova[0]] && Number(prova[1]) > Date.now()) scelto = prova[0];

    if (!scelto) {
      var d = new Date(), md = (d.getMonth() + 1) * 100 + d.getDate();
      Object.keys(TEMI).forEach(function (k) {
        var da = TEMI[k].da[0] * 100 + TEMI[k].da[1], a = TEMI[k].a[0] * 100 + TEMI[k].a[1];
        var dentro = da <= a ? (md >= da && md <= a) : (md >= da || md <= a);   // il Natale scavalca l'anno
        if (dentro) scelto = k;
      });
    }
    if (!scelto) return;

    var t = TEMI[scelto];

    // pagine pubbliche (senza barra in alto): una fascia fissa in cima dove appendere luci o zucche
    if (!document.querySelector(".app-header")) {
      var fa = document.createElement("div");
      fa.className = "app-header rf-fascia";
      fa.style.cssText = "position:fixed;top:env(safe-area-inset-top,0px);left:0;right:0;height:0;z-index:60;pointer-events:none;";
      document.body.appendChild(fa);
    }
    var menoMoto = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("tema-" + scelto);

    var css = [];

    // ghirlanda di luci (Natale)
    if (t.luci) {
      var c = t.luci;
      css.push(".app-header::after{content:'';position:absolute;left:0;right:0;bottom:-15px;height:12px;pointer-events:none;z-index:2;" +
        "background:radial-gradient(circle at 10px 6px," + c[0] + " 0 3.5px,transparent 4.5px) 0 0/44px 12px repeat-x," +
        "radial-gradient(circle at 21px 8px," + c[1] + " 0 3.5px,transparent 4.5px) 0 0/44px 12px repeat-x," +
        "radial-gradient(circle at 32px 6px," + c[2] + " 0 3.5px,transparent 4.5px) 0 0/44px 12px repeat-x;" +
        "animation:rf-luci 1.6s ease-in-out infinite alternate;}");
      css.push("@keyframes rf-luci{from{opacity:1}to{opacity:.5}}");
      if (menoMoto) css.push(".app-header::after{animation:none}");
    }

    // la zucca che spaventa (Halloween): una sola, in basso a destra; salta fuori all'apertura dell'app, rimbalza e sparisce
    if (t.zucche) {
      css.push(".rf-zucca-paura{position:fixed;right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 74px);font-size:72px;line-height:1;pointer-events:none;z-index:60;will-change:transform;transform-origin:bottom right;filter:drop-shadow(0 0 10px #ff8a00) drop-shadow(0 0 24px #ff5a00);animation:rf-paura 5.2s ease-in-out 1.2s 1 both;}");
      css.push("@keyframes rf-paura{0%{transform:translateY(160px) scale(.4) rotate(0);opacity:0}6%{opacity:1}14%{transform:translateY(-34px) scale(1.9) rotate(-10deg)}22%{transform:translateY(0) scale(1.5) rotate(8deg)}30%{transform:translateY(-46px) scale(1.95) rotate(-9deg)}38%{transform:translateY(0) scale(1.5) rotate(7deg)}46%{transform:translateY(-28px) scale(1.8) rotate(-6deg)}54%{transform:translateY(0) scale(1.55) rotate(4deg)}60%{transform:translateY(0) scale(1.6) rotate(-4deg)}66%{transform:translateY(0) scale(1.6) rotate(4deg)}72%{transform:translateY(0) scale(1.55) rotate(-3deg);opacity:1}100%{transform:translateY(170px) scale(.5) rotate(0);opacity:0}}");
      if (menoMoto) css.push(".rf-zucca-paura{display:none}");
    }

    // pipistrelli grandi che attraversano lo schermo dal basso all'alto e viceversa
    if (t.pipistrelli) {
      css.push(".rf-bat{position:fixed;line-height:1;pointer-events:none;z-index:50;will-change:transform;}");
      // sale dal basso, si ferma a meta' schermo e saluta (agita le ali), poi sale e sparisce: una volta sola
      css.push(".rf-bat.saluto{bottom:-70px;animation:rf-saluto 10s ease-in-out 1.5s 1 both;}");
      // il fumetto sta sopra il pipistrello, rimpicciolito per compensare l'ingrandimento
      css.push(".rf-ciao{position:absolute;left:50%;bottom:100%;margin-bottom:2px;transform:translateX(-50%) scale(.55);transform-origin:bottom center;font-size:17px;font-weight:700;font-family:inherit;line-height:1.2;background:#fff;color:#7c2d12;border:1px solid #fdba74;border-radius:14px;padding:5px 12px;white-space:nowrap;opacity:0;animation:rf-ciao 10s ease-in-out 1.5s 1 both;}");
      css.push("@keyframes rf-ciao{0%,43%{opacity:0}47%,66%{opacity:1}72%,100%{opacity:0}}");
      // il pipistrello e' un disegno: le ali sbattono, e toccando il fumetto lo si risente
      css.push(".rf-bat svg{width:96px;height:auto;display:block;overflow:visible;}");
      css.push(".rf-ala{animation:rf-ali .5s ease-in-out infinite alternate;}.rf-ala-s{transform-origin:92px 100px;}.rf-ala-d{transform-origin:148px 100px;animation-direction:alternate-reverse;}");
      css.push("@keyframes rf-ali{from{transform:rotate(-14deg)}to{transform:rotate(16deg)}}");
      css.push(".rf-ciao{pointer-events:auto;cursor:pointer;}");
      // arriva al centro, si ingrandisce come se si avvicinasse e ti guarda dritto; agita un poco le ali (inclinazioni) mentre saluta
      css.push("@keyframes rf-saluto{0%{transform:translate(0,0) rotate(-8deg) scale(1)}38%{transform:translate(0,-48vh) rotate(0deg) scale(1.9)}46%{transform:translate(0,-48vh) rotate(-9deg) scale(1.9)}52%{transform:translate(0,-48vh) rotate(9deg) scale(1.9)}58%{transform:translate(0,-48vh) rotate(-9deg) scale(1.9)}64%{transform:translate(0,-48vh) rotate(9deg) scale(1.9)}70%{transform:translate(0,-48vh) rotate(0deg) scale(1.9)}100%{transform:translate(30px,-125vh) rotate(8deg) scale(1)}}");
      css.push(".rf-bat.su{bottom:-70px;animation:rf-su 12s linear infinite;}");
      css.push(".rf-bat.giu{top:-70px;animation:rf-giu 13s linear infinite;}");
      css.push("@keyframes rf-su{0%{transform:translate(0,0) rotate(-8deg)}25%{transform:translate(34px,-30vh) rotate(8deg)}50%{transform:translate(-26px,-60vh) rotate(-8deg)}75%{transform:translate(30px,-90vh) rotate(8deg)}100%{transform:translate(0,-125vh) rotate(-8deg)}}");
      css.push("@keyframes rf-giu{0%{transform:translate(0,0) rotate(8deg)}25%{transform:translate(-34px,30vh) rotate(-8deg)}50%{transform:translate(26px,60vh) rotate(8deg)}75%{transform:translate(-30px,90vh) rotate(-8deg)}100%{transform:translate(0,125vh) rotate(8deg)}}");
      if (menoMoto) css.push(".rf-bat{display:none}");
    }

    var st = document.createElement("style");
    st.id = "tema-stagionale";
    st.textContent = css.join("\n");
    document.head.appendChild(st);

    if (t.zucche && document.querySelector(".app-header")) {
      var paura = document.createElement("div");
      paura.className = "rf-zucca-paura";
      paura.textContent = "🎃";
      paura.addEventListener("animationend", function () { paura.remove(); });
      document.body.appendChild(paura);
    }

    if (t.pipistrelli) {
      // un solo pipistrello: arriva, saluta e se ne va. Non torna fino alla prossima apertura dell'app.
      // voce italiana (se il telefono la lascia partire da sola; altrimenti basta toccare il fumetto)
      var nomeSaluto = "";
      try { if (window.speechSynthesis) speechSynthesis.getVoices(); } catch (e) {}  // le voci si caricano con calma: le sveglio subito
      var parla = function (testo) {
        try {
          if (!window.speechSynthesis || !testo) return;
          var u = new SpeechSynthesisUtterance(testo);
          u.lang = "it-IT"; u.pitch = 1.6; u.rate = 1.05;
          var voci = speechSynthesis.getVoices() || [];
          var it = voci.filter(function (v) { return /^it/i.test(v.lang); })[0];
          if (it) u.voice = it;
          speechSynthesis.cancel();
          speechSynthesis.speak(u);
        } catch (e) { /* senza voce resta il fumetto */ }
      };
      // pagine di prenotazione dei clienti: niente personaggio, solo un fumetto che invita a prenotare.
      // Compare una volta dopo un attimo, resta qualche secondo e sparisce (o si chiude toccandolo).
      var doveSei = (location.pathname + " " + location.hash).toLowerCase();
      // dentro l'app (chi lavora) il fumetto "Prenota..." non serve: li' c'e' il pipistrello che saluta per nome
      var nellApp = !!document.querySelector(".app-header");
      var invitoPub = nellApp ? "" : (/compleann/.test(doveSei) ? "🎂 Prenota la tua festa"
        : (/tavolo|prenotazion|booking/.test(doveSei) ? "🍽️ Prenota il tuo tavolo" : ""));
      if (invitoPub) {
        var fum = document.createElement("div");
        fum.textContent = invitoPub;
        fum.style.cssText = "position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translate(-50%,-14px);opacity:0;z-index:60;"
          + "background:#fff;color:#7c2d12;border:1px solid #fdba74;border-radius:18px;padding:10px 18px;"
          + "font:700 16px/1.3 system-ui,-apple-system,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.18);"
          + "transition:opacity .5s ease,transform .5s ease;max-width:88vw;text-align:center;cursor:pointer;";
        document.body.appendChild(fum);
        var chiudiFum = function () { fum.style.opacity = "0"; fum.style.transform = "translate(-50%,-14px)"; setTimeout(function () { fum.remove(); }, 600); };
        setTimeout(function () { fum.style.opacity = "1"; fum.style.transform = "translate(-50%,0)"; }, 1500);
        setTimeout(chiudiFum, 8500);
        fum.addEventListener("click", chiudiFum);
      }
      // il pipistrello c'e' solo nell'app (dove ti chiama per nome); sulle pagine dei clienti c'e' solo il fumetto
      ((!invitoPub && document.querySelector(".app-header") && !document.querySelector(".rf-fascia")) ? [["saluto", "calc(50% - 48px)", 96]] : []).forEach(function (p) {
        var b = document.createElement("div");
        b.className = "rf-bat " + p[0];
        // pipistrello disegnato: testa grande, orecchie rosa, occhioni arancioni, guance, sorriso con i dentini, ali viola che sbattono
        b.innerHTML = '<svg viewBox="0 0 240 190" xmlns="http://www.w3.org/2000/svg">' +
          '<g class="rf-ala rf-ala-s"><path d="M92 98 C64 58 22 60 4 84 C18 82 28 92 31 106 C41 98 53 102 57 116 C67 108 80 112 86 126 C92 120 96 114 98 108 Z" fill="#4a3a78"/><path d="M92 100 C70 78 40 78 20 92 M80 108 C66 100 52 104 44 112 M90 112 C80 108 72 112 68 120" stroke="#2c2150" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>' +
          '<g class="rf-ala rf-ala-d"><path d="M148 98 C176 58 218 60 236 84 C222 82 212 92 209 106 C199 98 187 102 183 116 C173 108 160 112 154 126 C148 120 144 114 142 108 Z" fill="#4a3a78"/><path d="M148 100 C170 78 200 78 220 92 M160 108 C174 100 188 104 196 112 M150 112 C160 108 168 112 172 120" stroke="#2c2150" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>' +
          '<ellipse cx="120" cy="150" rx="30" ry="32" fill="#2d2640"/><ellipse cx="120" cy="157" rx="19" ry="21" fill="#4d4270"/>' +
          '<ellipse cx="106" cy="180" rx="10" ry="6" fill="#3d3358"/><ellipse cx="134" cy="180" rx="10" ry="6" fill="#3d3358"/>' +
          '<path d="M82 66 L56 6 Q102 12 114 54 Z" fill="#2d2640"/><path d="M84 58 L67 21 Q93 26 104 50 Z" fill="#f7a8b8"/>' +
          '<path d="M158 66 L184 6 Q138 12 126 54 Z" fill="#2d2640"/><path d="M156 58 L173 21 Q147 26 136 50 Z" fill="#f7a8b8"/>' +
          '<circle cx="120" cy="94" r="54" fill="#2d2640"/><ellipse cx="120" cy="108" rx="36" ry="28" fill="#3d3358"/>' +
          '<path d="M86 66 Q99 59 112 66" stroke="#171128" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M128 66 Q141 59 154 66" stroke="#171128" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
          '<ellipse cx="99" cy="88" rx="17" ry="19" fill="#fff"/><ellipse cx="141" cy="88" rx="17" ry="19" fill="#fff"/>' +
          '<circle cx="100" cy="90" r="12.5" fill="#fb923c"/><circle cx="140" cy="90" r="12.5" fill="#fb923c"/>' +
          '<circle cx="100" cy="90" r="7" fill="#150f22"/><circle cx="140" cy="90" r="7" fill="#150f22"/>' +
          '<circle cx="104" cy="84" r="3.6" fill="#fff"/><circle cx="144" cy="84" r="3.6" fill="#fff"/><circle cx="96" cy="95" r="1.8" fill="#fff"/><circle cx="136" cy="95" r="1.8" fill="#fff"/>' +
          '<circle cx="80" cy="108" r="8" fill="#f9a8c0" opacity=".55"/><circle cx="160" cy="108" r="8" fill="#f9a8c0" opacity=".55"/>' +
          '<ellipse cx="120" cy="106" rx="7.5" ry="5.4" fill="#f7a8b8"/>' +
          '<path d="M104 116 Q120 132 136 116" stroke="#150f22" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
          '<path d="M110 121 L113.5 130 L117 123 Z" fill="#fff"/><path d="M123 123 L126.5 130 L130 121 Z" fill="#fff"/>' +
          '</svg>';
        // il fumetto compare quando il pipistrello si ferma a meta' schermo
        var ciao = document.createElement("span");
        ciao.className = "rf-ciao";
        ciao.textContent = "Ciao! 👋";
        // sulle pagine di prenotazione (dove non c'e' un nome da dire) il saluto diventa un invito a prenotare;
        // nell'app, se si trova il nome, qui sotto viene sostituito da "Ciao {nome}!"
        (function () {
          var dove = "";   // il pipistrello c'e' solo nell'app: li' non si invita a prenotare, si saluta per nome
          var invito = "";
          if (/compleann/.test(dove)) invito = "Ciao! 🎂 Prenota la tua festa";
          else if (/tavolo|prenotazion|booking/.test(dove)) invito = "Ciao! 🍽️ Prenota il tuo tavolo";
          if (invito) {
            ciao.textContent = invito;
            ciao.style.whiteSpace = "normal"; ciao.style.width = "200px"; ciao.style.textAlign = "center";
          }
        })();
        b.appendChild(ciao);
        // il nome si cerca piu' volte mentre l'app finisce di caricare; se lo stato non ce l'ha, lo chiede all'accesso
        var cerca = function (meta, prof) {
          var n = String((prof && (prof.nome || prof.nome_completo)) || (meta && (meta.nome || meta.first_name || meta.nome_completo || meta.full_name)) || "").trim().split(/\s+/)[0];
          if (n && !nomeSaluto) { nomeSaluto = n; ciao.textContent = "Ciao " + n + "! 👋"; }
        };
        var tentativi = 0;
        var giro = setInterval(function () {
          tentativi++;
          try {
            var s = window.state || {};
            cerca((s.user && s.user.user_metadata) || {}, s.userProfile || s.profilo || s.dipendente || {});
            if (!nomeSaluto && tentativi === 4) {
              var sb = window.supabaseClient || window.supabase;
              if (sb && sb.auth && sb.auth.getUser) sb.auth.getUser().then(function (r) { cerca(r && r.data && r.data.user && r.data.user.user_metadata, {}); });
            }
          } catch (e) { /* resta "Ciao!" */ }
          if (nomeSaluto || tentativi >= 14) clearInterval(giro);
        }, 600);
        // parla solo nell'app (dove sa il nome), mai sulle pagine pubbliche dei clienti
        setTimeout(function () {
          if (!nomeSaluto) return;
          var testo = "Ciao " + nomeSaluto + "!";
          // alcuni telefoni lasciano parlare da soli, altri no: se la voce e' bloccata, parla al primo tocco mentre il pipistrello e' ancora li'
          var alPrimoTocco = function () {
            var fatto = false;
            var vai = function () {
              if (fatto) return; fatto = true;
              parla(testo);
              ["click", "touchend", "keydown"].forEach(function (ev) { document.removeEventListener(ev, vai, true); });
            };
            // su iPhone la voce si sblocca solo con un tocco finito (rilascio del dito / clic), non con l'inizio del tocco
            ["click", "touchend", "keydown"].forEach(function (ev) { document.addEventListener(ev, vai, true); });
            setTimeout(function () { ["click", "touchend", "keydown"].forEach(function (ev) { document.removeEventListener(ev, vai, true); }); }, 7000);
          };
          var attiva = !navigator.userActivation || navigator.userActivation.hasBeenActive;
          if (attiva) {
            parla(testo);
            setTimeout(function () { try { if (window.speechSynthesis && !speechSynthesis.speaking && !speechSynthesis.pending) alPrimoTocco(); } catch (e) {} }, 700);
          } else { alPrimoTocco(); }
        }, 6300);
        ciao.addEventListener("click", function () { parla(nomeSaluto ? "Ciao " + nomeSaluto + "!" : ciao.textContent.replace(/[^A-Za-z\u00c0-\u00ff0-9\s!?,.]/g, "")); });
        b.style.left = p[1];
        b.style.fontSize = p[2] + "px";
        b.addEventListener("animationend", function () { b.remove(); });
        document.body.appendChild(b);
      });
    }

    // Natale: alberelli in alto sotto la barra, un solo Babbo Natale che saluta per nome all'apertura e sparisce dopo 2 secondi.
    // Niente luci, niente palline, niente slitte che girano.
    if (scelto === "natale") {
      var s2 = document.createElement("style");
      s2.textContent = [
        ".app-header::after{content:'';position:absolute;left:0;right:0;bottom:-22px;height:22px;pointer-events:none;z-index:2;opacity:.9;background:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='22'><polygon points='11,2 18,12 15,12 20,19 2,19 7,12 4,12' fill='%23237a43'/><rect x='10' y='19' width='2.5' height='3' fill='%236b4226'/><polygon points='33,6 38,13 36,13 40,19 26,19 30,13 28,13' fill='%231d6b3a'/><rect x='32' y='19' width='2' height='3' fill='%236b4226'/></svg>\") 0 0/44px 22px repeat-x;}",
        ".rf-babbo{position:fixed;right:10px;bottom:calc(var(--bottom-nav-height,0px) + env(safe-area-inset-bottom,0px) + 12px);width:clamp(110px,30vw,150px);z-index:60;pointer-events:none;opacity:0;filter:drop-shadow(0 4px 10px rgba(0,0,0,.35));animation:rf-babbo 2s ease forwards;}",
        ".rf-babbo svg{display:block;width:100%;height:auto}",
        ".rf-babbo-ciao{position:absolute;right:62%;top:-6px;background:#fff;color:#7f1d1d;border:1px solid #fca5a5;border-radius:16px;padding:8px 14px;font:800 16px/1.2 system-ui,-apple-system,sans-serif;white-space:nowrap;box-shadow:0 6px 18px rgba(0,0,0,.18);}",
        ".rf-babbo-ciao::after{content:'';position:absolute;right:-7px;top:16px;border:7px solid transparent;border-left-color:#fff;border-right:0}",
        "@keyframes rf-babbo{0%{opacity:0;transform:translateY(24px) scale(.9)}15%{opacity:1;transform:none}80%{opacity:1;transform:none}100%{opacity:0;transform:translateY(12px)}}",
        ".rf-braccio{transform-box:view-box;transform-origin:148px 182px;animation:rf-saluta .3s ease-in-out 6 alternate}",
        "@keyframes rf-saluta{0%{transform:rotate(-10deg)}100%{transform:rotate(10deg)}}",
        "@media (prefers-reduced-motion:reduce){.rf-braccio{animation:none}}"
      ].join("\n");
      document.head.appendChild(s2);

      // il nome si aspetta al massimo 3 secondi mentre l'app carica; poi Babbo compare una volta sola (con il nome se c'e')
      var nellAppN = !!document.querySelector(".app-header") && !document.querySelector(".rf-fascia");
      var nomeN = "", provaN = 0;
      var trovaNome = function () {
        try {
          var s = window.state || {}, meta = (s.user && s.user.user_metadata) || {}, prof = s.userProfile || s.profilo || s.dipendente || {};
          var n = String(prof.nome || prof.nome_completo || meta.nome || meta.first_name || meta.nome_completo || meta.full_name || "").trim().split(/\s+/)[0];
          if (n) nomeN = n.charAt(0).toUpperCase() + n.slice(1);
        } catch (e) {}
      };
      var mostraBabbo = function () {
        var bb = document.createElement("div");
        bb.className = "rf-babbo";
        bb.setAttribute("aria-hidden", "true");
        bb.innerHTML = "<svg viewBox=\"0 0 210 240\" xmlns=\"http://www.w3.org/2000/svg\"><defs><radialGradient id=\"tsPelle\" cx=\"45%\" cy=\"40%\" r=\"65%\"><stop offset=\"0\" stop-color=\"#ffe2cc\"/><stop offset=\"1\" stop-color=\"#eaa47e\"/></radialGradient><linearGradient id=\"tsRosso\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#e8383a\"/><stop offset=\"1\" stop-color=\"#9e1219\"/></linearGradient><radialGradient id=\"tsPelo\" cx=\"40%\" cy=\"30%\" r=\"75%\"><stop offset=\"0\" stop-color=\"#ffffff\"/><stop offset=\"1\" stop-color=\"#d9dde6\"/></radialGradient><radialGradient id=\"tsGuanto\" cx=\"35%\" cy=\"30%\" r=\"70%\"><stop offset=\"0\" stop-color=\"#3f8a5a\"/><stop offset=\"1\" stop-color=\"#1a4d2e\"/></radialGradient></defs><g stroke=\"#3a1f14\" stroke-width=\"2\" stroke-linejoin=\"round\"><path d=\"M34 240 C34 188 62 160 100 157 C138 160 166 188 166 240 Z\" fill=\"url(#tsRosso)\"/><path d=\"M92 170 L108 170 L110 240 L90 240 Z\" fill=\"url(#tsPelo)\" stroke-width=\"1.5\"/><rect x=\"34\" y=\"214\" width=\"132\" height=\"15\" fill=\"#2b1d14\"/><rect x=\"88\" y=\"210\" width=\"24\" height=\"23\" rx=\"3\" fill=\"#f2c94c\"/><rect x=\"94\" y=\"216\" width=\"12\" height=\"11\" rx=\"2\" fill=\"#2b1d14\" stroke=\"none\"/><g class=\"rf-braccio\"><path d=\"M140 176 C160 160 170 136 170 108 L190 110 C192 142 178 172 154 192 Z\" fill=\"url(#tsRosso)\"/><ellipse cx=\"180\" cy=\"108\" rx=\"15\" ry=\"8\" fill=\"url(#tsPelo)\" transform=\"rotate(6 180 108)\"/><path d=\"M168 100 C164 82 168 66 178 62 C182 54 192 56 192 64 C198 62 202 70 198 78 C202 84 198 100 192 102 Z\" fill=\"url(#tsGuanto)\"/><path d=\"M170 92 C160 88 156 80 162 76 C166 74 170 80 172 84\" fill=\"url(#tsGuanto)\"/><path d=\"M184 66 L184 80 M192 70 L191 82\" fill=\"none\" stroke-width=\"1.5\"/></g><ellipse cx=\"62\" cy=\"102\" rx=\"8\" ry=\"11\" fill=\"url(#tsPelle)\"/><ellipse cx=\"138\" cy=\"102\" rx=\"8\" ry=\"11\" fill=\"url(#tsPelle)\"/><circle cx=\"100\" cy=\"100\" r=\"38\" fill=\"url(#tsPelle)\"/><path d=\"M60 102 C56 150 78 186 100 190 C122 186 144 150 140 102 C132 124 120 128 100 128 C80 128 68 124 60 102 Z\" fill=\"url(#tsPelo)\"/><path d=\"M66 150 C70 160 78 162 82 156 M84 170 C88 180 96 180 98 172 M104 172 C106 180 114 180 118 170 M120 156 C124 162 132 160 136 150 M76 134 C80 142 88 142 90 136 M110 136 C112 142 120 142 124 134\" fill=\"none\" stroke=\"#b9bfcc\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M100 120 C92 108 74 108 66 120 C70 128 80 130 88 126 C94 124 98 124 100 124 Z\" fill=\"url(#tsPelo)\"/><path d=\"M100 120 C108 108 126 108 134 120 C130 128 120 130 112 126 C106 124 102 124 100 124 Z\" fill=\"url(#tsPelo)\"/><path d=\"M92 130 Q100 140 108 130 Q100 134 92 130 Z\" fill=\"#8f2a2a\" stroke-width=\"1.5\"/><ellipse cx=\"100\" cy=\"110\" rx=\"9\" ry=\"8\" fill=\"#ef8f7c\"/><path d=\"M128 54 C122 30 92 20 70 30 C50 40 36 64 30 92 L42 94 C46 74 54 60 64 56 C60 64 58 72 60 80 L140 80 C140 68 136 60 128 54 Z\" fill=\"url(#tsRosso)\"/><circle cx=\"34\" cy=\"98\" r=\"11\" fill=\"url(#tsPelo)\"/><rect x=\"52\" y=\"66\" width=\"96\" height=\"21\" rx=\"10.5\" fill=\"url(#tsPelo)\"/><path d=\"M76 91 C80 87 88 87 93 90\" fill=\"none\" stroke-width=\"4\" stroke=\"#ffffff\" stroke-linecap=\"round\"/><path d=\"M107 90 C112 87 120 87 124 91\" fill=\"none\" stroke-width=\"4\" stroke=\"#ffffff\" stroke-linecap=\"round\"/></g><ellipse cx=\"85\" cy=\"99\" rx=\"4.5\" ry=\"5.5\" fill=\"#2b1d14\"/><ellipse cx=\"115\" cy=\"99\" rx=\"4.5\" ry=\"5.5\" fill=\"#2b1d14\"/><circle cx=\"86.5\" cy=\"97\" r=\"1.6\" fill=\"#fff\"/><circle cx=\"116.5\" cy=\"97\" r=\"1.6\" fill=\"#fff\"/><circle cx=\"74\" cy=\"110\" r=\"8\" fill=\"#f26b6b\" opacity=\".35\"/><circle cx=\"126\" cy=\"110\" r=\"8\" fill=\"#f26b6b\" opacity=\".35\"/><ellipse cx=\"97\" cy=\"107\" rx=\"3\" ry=\"2\" fill=\"#fff\" opacity=\".6\"/></svg>";
        var ciaoN = document.createElement("span");
        ciaoN.className = "rf-babbo-ciao";
        ciaoN.textContent = nomeN ? "Ciao " + nomeN + "! 👋" : "Ciao! 👋";
        bb.appendChild(ciaoN);
        document.body.appendChild(bb);
        setTimeout(function () { if (bb.parentNode) bb.parentNode.removeChild(bb); }, 2000);
      };
      // Babbo solo per chi usa l'app: sulle pagine pubbliche dei clienti non compare
      if (nellAppN) {
        var attesaN = setInterval(function () {
          provaN++; trovaNome();
          if (nomeN || provaN >= 10) { clearInterval(attesaN); mostraBabbo(); }
        }, 300);
      }
    }

    // neve leggera (Natale)
    if (t.neve && !menoMoto) {
      var cv = document.createElement("canvas");
      cv.id = "neve-natale";
      cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50;";
      document.body.appendChild(cv);
      var cx = cv.getContext("2d");
      var W = 0, H = 0, N = 28, fiocchi = [], tt = 0;
      var misura = function () { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
      misura();
      window.addEventListener("resize", misura);
      for (var i = 0; i < N; i++) fiocchi.push({ x: Math.random() * W, y: Math.random() * H, r: 1.2 + Math.random() * 2.2, v: 0.35 + Math.random() * 0.7, o: Math.random() * 6 });
      var giro = function () {
        if (!document.hidden) {
          tt += 0.01;
          cx.clearRect(0, 0, W, H);
          cx.fillStyle = "rgba(255,255,255,0.85)";
          cx.strokeStyle = "rgba(160,180,200,0.45)";
          for (var k = 0; k < N; k++) {
            var f = fiocchi[k];
            f.y += f.v;
            f.x += Math.sin(tt + f.o) * 0.35;
            if (f.y > H + 5) { f.y = -5; f.x = Math.random() * W; }
            cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.2832); cx.fill(); cx.stroke();
          }
        }
        requestAnimationFrame(giro);
      };
      giro();
    }

    // Tutto quello che si muove e puo' uscire dallo schermo (pipistrelli, slitte, neve) sta dentro una gabbia
    // che ritaglia: cosi' un elemento fuori dallo schermo non sposta la barra in basso su iPhone.
    var mobili = document.querySelectorAll(".rf-bat, #neve-natale, .rf-zucca-paura");
    if (mobili.length) {
      var gabbia = document.createElement("div");
      gabbia.id = "rf-gabbia";
      gabbia.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;pointer-events:none;z-index:50;contain:layout paint;";
      document.body.appendChild(gabbia);
      Array.prototype.forEach.call(mobili, function (el) { el.style.position = "absolute"; gabbia.appendChild(el); });
    }
  } catch (e) { /* le decorazioni non devono mai rompere l'app */ }
})();
