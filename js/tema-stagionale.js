// js/tema-stagionale.js
// Decorazioni di stagione: i colori dell'app restano quelli di sempre, cambiano solo
// la ghirlanda di luci sotto la barra in alto e, a Halloween, qualche pipistrello.
//  - Halloween: dal 20 ottobre al 1 novembre
//  - Natale:    dal 1 dicembre al 2 gennaio
// Prova fuori stagione (dal browser): app.ristoflow-ai.com/?tema=halloween  oppure  ?tema=natale  (30 minuti)  ·  ?tema=0 per spegnere.
(function () {
  try {
    var TEMI = {
      halloween: { da: [10, 20], a: [11, 1], colori: ["#f97316", "#7e22ce", "#84cc16"], pipistrelli: true },
      natale:    { da: [12, 1],  a: [1, 2],  colori: ["#e53935", "#f6c343", "#2e9d62"], pipistrelli: false },
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

    var t = TEMI[scelto], c = t.colori;
    document.documentElement.classList.add("tema-" + scelto);

    var css = [
      ".app-header::after{content:'';position:absolute;left:0;right:0;bottom:-15px;height:12px;pointer-events:none;z-index:2;" +
        "background:radial-gradient(circle at 10px 6px," + c[0] + " 0 3.5px,transparent 4.5px) 0 0/44px 12px repeat-x," +
        "radial-gradient(circle at 21px 8px," + c[1] + " 0 3.5px,transparent 4.5px) 0 0/44px 12px repeat-x," +
        "radial-gradient(circle at 32px 6px," + c[2] + " 0 3.5px,transparent 4.5px) 0 0/44px 12px repeat-x;" +
        "animation:rf-luci 1.6s ease-in-out infinite alternate;}",
      "@keyframes rf-luci{from{opacity:1}to{opacity:.5}}",
      ".rf-bat{position:fixed;top:64px;left:-40px;font-size:18px;line-height:1;pointer-events:none;z-index:50;animation:rf-vola 16s linear infinite;}",
      "@keyframes rf-vola{0%{transform:translate(0,0)}25%{transform:translate(28vw,14px)}50%{transform:translate(56vw,-4px)}75%{transform:translate(84vw,16px)}100%{transform:translate(112vw,2px)}}",
      "@media (prefers-reduced-motion:reduce){.app-header::after{animation:none}.rf-bat{display:none}}",
    ].join("\n");
    var st = document.createElement("style");
    st.id = "tema-stagionale";
    st.textContent = css;
    document.head.appendChild(st);

    if (t.pipistrelli) {
      [0, 8].forEach(function (ritardo) {
        var b = document.createElement("div");
        b.className = "rf-bat";
        b.textContent = "🦇";
        b.style.animationDelay = "-" + ritardo + "s";
        document.body.appendChild(b);
      });
    }
    // neve leggera a Natale (niente se l'utente ha chiesto meno animazioni)
    if (scelto === "natale" && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
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
