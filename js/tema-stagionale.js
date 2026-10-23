// js/tema-stagionale.js
// Decorazioni di stagione: i colori dell'app restano quelli di sempre.
//  - Halloween (20 ott - 1 nov): zucche luminose sotto la barra in alto e grandi pipistrelli che attraversano lo schermo
//  - Natale (10 nov - 2 gen): ghirlanda di luci e neve leggera
// Prova fuori stagione (dal browser): app.ristoflow-ai.com/?tema=halloween  oppure  ?tema=natale  (30 minuti)  ·  ?tema=0 per spegnere.
(function () {
  try {
    var TEMI = {
      halloween: { da: [10, 20], a: [11, 1], zucche: true, pipistrelli: true },
      natale:    { da: [11, 10], a: [1, 2],  luci: ["#e53935", "#f6c343", "#2e9d62"], neve: true },
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

    // zucche luminose (Halloween)
    if (t.zucche) {
      css.push(".rf-zucche{position:absolute;left:0;right:0;bottom:-30px;display:flex;justify-content:space-around;align-items:flex-start;pointer-events:none;z-index:2;}");
      css.push(".rf-zucca{font-size:24px;line-height:1;filter:drop-shadow(0 0 5px #ff8a00) drop-shadow(0 0 11px #ff6a00);animation:rf-zucca 1.9s ease-in-out infinite alternate;}");
      css.push("@keyframes rf-zucca{from{filter:drop-shadow(0 0 3px #ff8a00) drop-shadow(0 0 6px #ff6a00);transform:scale(.97)}to{filter:drop-shadow(0 0 7px #ffb300) drop-shadow(0 0 16px #ff7a00);transform:scale(1.04)}}");
      if (menoMoto) css.push(".rf-zucca{animation:none}");
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
      css.push(".rf-bat svg{width:68px;height:auto;display:block;overflow:visible;}");
      css.push(".rf-ala{animation:rf-ali .5s ease-in-out infinite alternate;}.rf-ala-s{transform-origin:70px 80px;}.rf-ala-d{transform-origin:130px 80px;animation-direction:alternate-reverse;}");
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

    if (t.zucche) {
      var testata = document.querySelector(".app-header");
      if (testata) {
        var fila = document.createElement("div");
        fila.className = "rf-zucche";
        for (var z = 0; z < 7; z++) {
          var s = document.createElement("span");
          s.className = "rf-zucca";
          s.textContent = "🎃";
          s.style.animationDelay = "-" + (z * 0.37).toFixed(2) + "s";
          s.style.marginTop = (z % 2 ? "4px" : "0");
          s.style.fontSize = (z % 2 ? "22px" : "26px");
          fila.appendChild(s);
        }
        testata.appendChild(fila);
      }
    }

    if (t.pipistrelli) {
      // un solo pipistrello: arriva, saluta e se ne va. Non torna fino alla prossima apertura dell'app.
      // voce italiana (se il telefono la lascia partire da sola; altrimenti basta toccare il fumetto)
      var nomeSaluto = "";
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
      // [animazione, posizione orizzontale, grandezza]
      [["saluto", "calc(50% - 34px)", 68]].forEach(function (p) {
        var b = document.createElement("div");
        b.className = "rf-bat " + p[0];
        // pipistrello disegnato: orecchie grandi, occhioni arancioni, nasino rosa, ali che sbattono
        b.innerHTML = '<svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">' +
          '<g class="rf-ala rf-ala-s"><path d="M70 78 C44 44 12 52 2 92 C14 86 22 96 26 108 C36 100 44 106 50 120 C58 106 68 108 76 120 Z" fill="#2a2a33"/><path d="M70 82 C50 62 28 66 14 90 M62 96 C48 90 38 96 32 106 M66 104 C58 100 54 106 52 116" stroke="#1a1a20" stroke-width="2" fill="none"/></g>' +
          '<g class="rf-ala rf-ala-d"><path d="M130 78 C156 44 188 52 198 92 C186 86 178 96 174 108 C164 100 156 106 150 120 C142 106 132 108 124 120 Z" fill="#2a2a33"/><path d="M130 82 C150 62 172 66 186 90 M138 96 C152 90 162 96 168 106 M134 104 C142 100 146 106 148 116" stroke="#1a1a20" stroke-width="2" fill="none"/></g>' +
          '<ellipse cx="100" cy="118" rx="34" ry="38" fill="#34343f"/><ellipse cx="100" cy="126" rx="20" ry="24" fill="#4b4b59"/>' +
          '<ellipse cx="88" cy="154" rx="9" ry="6" fill="#2a2a33"/><ellipse cx="112" cy="154" rx="9" ry="6" fill="#2a2a33"/>' +
          '<path d="M70 46 L52 4 Q82 8 94 38 Z" fill="#2f2f3a"/><path d="M71 40 L60 14 Q78 18 87 36 Z" fill="#f4a3a3"/>' +
          '<path d="M130 46 L148 4 Q118 8 106 38 Z" fill="#2f2f3a"/><path d="M129 40 L140 14 Q122 18 113 36 Z" fill="#f4a3a3"/>' +
          '<circle cx="100" cy="70" r="36" fill="#2f2f3a"/>' +
          '<circle cx="85" cy="66" r="13" fill="#fff"/><circle cx="115" cy="66" r="13" fill="#fff"/>' +
          '<circle cx="86" cy="67" r="9" fill="#f59e0b"/><circle cx="114" cy="67" r="9" fill="#f59e0b"/>' +
          '<circle cx="86" cy="67" r="5" fill="#111"/><circle cx="114" cy="67" r="5" fill="#111"/>' +
          '<circle cx="89" cy="63" r="2.4" fill="#fff"/><circle cx="117" cy="63" r="2.4" fill="#fff"/>' +
          '<ellipse cx="100" cy="82" rx="6.5" ry="4.8" fill="#f4a3a3"/>' +
          '<path d="M90 90 Q100 99 110 90" stroke="#111" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M95 93 L97.5 99 L100 94 Z" fill="#fff"/>' +
          '</svg>';
        // il fumetto compare quando il pipistrello si ferma a meta' schermo
        var ciao = document.createElement("span");
        ciao.className = "rf-ciao";
        ciao.textContent = "Ciao! 👋";
        b.appendChild(ciao);
        // il nome si legge quando il pipistrello arriva: a quel punto l'app ha gia' caricato chi e' entrato
        setTimeout(function () {
          try {
            var s = window.state || {};
            var meta = (s.user && s.user.user_metadata) || {};
            var prof = s.userProfile || s.profilo || s.dipendente || {};
            var nome = String(prof.nome || meta.nome || meta.first_name || "").trim().split(/\s+/)[0];
            if (nome) { ciao.textContent = "Ciao " + nome + "! 👋"; nomeSaluto = nome; }
          } catch (e) { /* resta "Ciao!" */ }
        }, 4500);
        b.style.left = p[1];
        b.style.fontSize = p[2] + "px";
        b.addEventListener("animationend", function () { b.remove(); });
        document.body.appendChild(b);
      });
    }

    // alberelli lungo il fondo e Babbo Natale con le renne che attraversano lo schermo (Natale)
    if (scelto === "natale") {
      var s2 = document.createElement("style");
      s2.textContent = [
        ".rf-alberi{position:fixed;left:0;right:0;bottom:calc(var(--bottom-nav-height,0px) + env(safe-area-inset-bottom,0px));display:flex;justify-content:space-around;align-items:flex-end;pointer-events:none;z-index:50;}",
        ".rf-albero{line-height:1;animation:rf-albero 2.4s ease-in-out infinite alternate;}",
        "@keyframes rf-albero{from{filter:brightness(1)}to{filter:brightness(1.2) drop-shadow(0 0 4px #f6c343)}}",
        ".rf-slitta{position:fixed;left:0;line-height:1;white-space:nowrap;pointer-events:none;z-index:51;will-change:transform;}",
        ".rf-slitta.dx{top:18vh;font-size:34px;animation:rf-dx 24s linear infinite;}",
        ".rf-slitta.sx{top:46vh;font-size:30px;animation:rf-sx 28s linear infinite;}",
        "@keyframes rf-dx{0%{transform:translate(-170px,0)}50%{transform:translate(52vw,-26px)}100%{transform:translate(calc(100vw + 40px),0)}}",
        "@keyframes rf-sx{0%{transform:translate(calc(100vw + 40px),0) scaleX(-1)}50%{transform:translate(42vw,22px) scaleX(-1)}100%{transform:translate(-170px,0) scaleX(-1)}}",
        "@media (prefers-reduced-motion:reduce){.rf-albero{animation:none}.rf-slitta{display:none}}"
      ].join("\n");
      document.head.appendChild(s2);

      var alb = document.createElement("div");
      alb.className = "rf-alberi";
      for (var a = 0; a < 8; a++) {
        var al = document.createElement("span");
        al.className = "rf-albero";
        al.textContent = "🎄";
        al.style.fontSize = (a % 2 ? "22px" : "28px");
        al.style.animationDelay = "-" + (a * 0.45).toFixed(2) + "s";
        alb.appendChild(al);
      }
      document.body.appendChild(alb);

      [["dx", 0], ["sx", 11]].forEach(function (p) {
        var sl = document.createElement("div");
        sl.className = "rf-slitta " + p[0];
        // slitta disegnata: Babbo Natale seduto, sacco di regali e due renne davanti (guardano verso destra; la seconda e' specchiata dall'animazione)
        var ren = function (x, naso) {
          return '<g transform="translate(' + x + ',0)"><path d="M-2 50 L1 56" stroke="#6d4526" stroke-width="3" stroke-linecap="round"/>' +
            '<line x1="5" y1="58" x2="-1" y2="76" stroke="#6d4526" stroke-width="3" stroke-linecap="round"/><line x1="10" y1="60" x2="8" y2="77" stroke="#6d4526" stroke-width="3" stroke-linecap="round"/>' +
            '<line x1="21" y1="60" x2="28" y2="74" stroke="#6d4526" stroke-width="3" stroke-linecap="round"/><line x1="25" y1="58" x2="34" y2="70" stroke="#6d4526" stroke-width="3" stroke-linecap="round"/>' +
            '<ellipse cx="14" cy="54" rx="15" ry="8" fill="#8d5a34"/><path d="M25 50 L31 38" stroke="#8d5a34" stroke-width="6" stroke-linecap="round"/>' +
            '<circle cx="34" cy="35" r="5.5" fill="#8d5a34"/><ellipse cx="39" cy="37" rx="3.6" ry="2.6" fill="#a86f45"/>' +
            '<path d="M33 30 L30 19 M30 23 L26 21 M36 30 L40 19 M40 23 L44 21" stroke="#6d4526" stroke-width="2" fill="none" stroke-linecap="round"/>' +
            '<circle cx="34" cy="34" r="1.1" fill="#222"/>' + (naso ? '<circle cx="42" cy="37" r="2.4" fill="#e53935"/>' : '') + '</g>';
        };
        sl.innerHTML = '<svg viewBox="0 0 230 90" xmlns="http://www.w3.org/2000/svg" style="width:' + (p[0] === "dx" ? 150 : 130) + 'px;height:auto;display:block;">' +
          '<path d="M22 76 H108 Q122 76 119 62" fill="none" stroke="#c99a2e" stroke-width="3.5" stroke-linecap="round"/>' +
          '<path d="M26 70 L30 46 H96 Q113 46 115 60 L109 72 H30 Z" fill="#c62828"/><path d="M30 53 H111" stroke="#c99a2e" stroke-width="2"/>' +
          '<line x1="40" y1="72" x2="40" y2="76" stroke="#c99a2e" stroke-width="3"/><line x1="95" y1="72" x2="95" y2="76" stroke="#c99a2e" stroke-width="3"/>' +
          '<circle cx="38" cy="38" r="12" fill="#8d6e63"/><path d="M32 29 Q38 25 44 29" stroke="#5d4037" stroke-width="2" fill="none"/>' +
          '<rect x="54" y="30" width="28" height="20" rx="9" fill="#d32f2f"/><circle cx="68" cy="24" r="8" fill="#f5c9a6"/>' +
          '<path d="M60 26 Q68 44 76 26 Z" fill="#fff"/><path d="M59 22 Q68 2 78 20 Z" fill="#d32f2f"/><rect x="58" y="19" width="21" height="4" rx="2" fill="#fff"/>' +
          '<circle cx="79" cy="10" r="3" fill="#fff"/><circle cx="71" cy="23" r="1.2" fill="#333"/>' +
          '<path d="M115 58 Q125 52 134 55" fill="none" stroke="#c99a2e" stroke-width="1.8"/><path d="M162 55 Q168 51 176 55" fill="none" stroke="#c99a2e" stroke-width="1.8"/>' +
          ren(125, false) + ren(176, true) + '</svg>';
        sl.style.animationDelay = "-" + p[1] + "s";
        document.body.appendChild(sl);
      });
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
    var mobili = document.querySelectorAll(".rf-bat, .rf-slitta, #neve-natale");
    if (mobili.length) {
      var gabbia = document.createElement("div");
      gabbia.id = "rf-gabbia";
      gabbia.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;pointer-events:none;z-index:50;contain:layout paint;";
      document.body.appendChild(gabbia);
      Array.prototype.forEach.call(mobili, function (el) { el.style.position = "absolute"; gabbia.appendChild(el); });
    }
  } catch (e) { /* le decorazioni non devono mai rompere l'app */ }
})();
