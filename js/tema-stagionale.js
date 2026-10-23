// js/tema-stagionale.js
// Decorazioni di stagione: i colori dell'app restano quelli di sempre.
//  - Halloween (20 ott - 1 nov): zucche luminose sotto la barra in alto e grandi pipistrelli che attraversano lo schermo
//  - Natale (1 dic - 2 gen): ghirlanda di luci e neve leggera
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
      // [direzione, posizione orizzontale, grandezza, ritardo]
      [["su", "12%", 40, 0], ["giu", "68%", 46, 4], ["su", "42%", 34, 8], ["giu", "88%", 36, 9]].forEach(function (p) {
        var b = document.createElement("div");
        b.className = "rf-bat " + p[0];
        b.textContent = "🦇";
        b.style.left = p[1];
        b.style.fontSize = p[2] + "px";
        b.style.animationDelay = "-" + p[3] + "s";
        document.body.appendChild(b);
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
  } catch (e) { /* le decorazioni non devono mai rompere l'app */ }
})();
