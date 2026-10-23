// js/tema-natale.js
// Tema natalizio: si accende da solo dal 1 dicembre al 2 gennaio e poi si spegne.
// Cambia i colori principali, mette una ghirlanda di luci sotto la barra in alto e una nevicata leggera.
// Prova fuori stagione (dal browser, non dall'app installata): app.ristoflow-ai.com/?natale=1  (dura 30 minuti)  ·  ?natale=0 per spegnerlo.
(function () {
  try {
    var INIZIO = { mese: 12, giorno: 1 };   // primo giorno
    var FINE = { mese: 1, giorno: 2 };      // ultimo giorno (compreso)

    var q = new URLSearchParams(location.search);
    if (q.has("natale")) {
      if (q.get("natale") === "0") localStorage.removeItem("rf_natale_prova");
      else localStorage.setItem("rf_natale_prova", String(Date.now() + 30 * 60 * 1000));
    }
    var prova = Number(localStorage.getItem("rf_natale_prova") || 0) > Date.now();

    var d = new Date(), m = d.getMonth() + 1, g = d.getDate();
    var inStagione = (m === INIZIO.mese && g >= INIZIO.giorno) || (m > INIZIO.mese) || (m === FINE.mese && g <= FINE.giorno);
    if (!prova && !inStagione) return;

    document.documentElement.classList.add("tema-natale");

    var css = [
      ":root.tema-natale{--color-primary:#A4202E;--color-primary-soft:#BE3140;--color-primary-dark:#7E1522;--color-accent:#C99A2E;--color-accent-dark:#A87C1C;--color-bg-app:#FBF6F0;--color-bg-app-soft:#F3EAE0;}",
      /* ghirlanda di luci sotto la barra in alto */
      ".tema-natale .app-header{border-bottom:3px solid #1F6B45;}",
      ".tema-natale .app-header::after{content:'';position:absolute;left:0;right:0;bottom:-15px;height:12px;pointer-events:none;z-index:2;" +
        "background:radial-gradient(circle at 10px 6px,#e53935 0 3.5px,transparent 4.5px) 0 0/44px 12px repeat-x," +
        "radial-gradient(circle at 21px 8px,#f6c343 0 3.5px,transparent 4.5px) 0 0/44px 12px repeat-x," +
        "radial-gradient(circle at 32px 6px,#2e9d62 0 3.5px,transparent 4.5px) 0 0/44px 12px repeat-x;" +
        "animation:rf-luci 1.6s ease-in-out infinite alternate;}",
      "@keyframes rf-luci{from{opacity:1}to{opacity:.55}}",
      /* menu laterale verde scuro */
      ".tema-natale #global-menu{background:#10261B !important;}",
      /* i pulsanti grandi delle home */
      ".tema-natale .pr-btn,.tema-natale .ps-btn{background:#A4202E !important;}",
      ".tema-natale .pr-home .pr-link{color:#A4202E !important;}",
      "@media (prefers-reduced-motion:reduce){.tema-natale .app-header::after{animation:none}}",
    ].join("\n");
    var st = document.createElement("style");
    st.id = "tema-natale";
    st.textContent = css;
    document.head.appendChild(st);

    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute("content", "#A4202E");

    // neve leggera: niente se l'utente ha chiesto meno animazioni
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var cv = document.createElement("canvas");
    cv.id = "neve-natale";
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50;";
    document.body.appendChild(cv);
    var cx = cv.getContext("2d");
    var W = 0, H = 0, N = 28, fiocchi = [];
    function misura() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
    misura();
    window.addEventListener("resize", misura);
    for (var i = 0; i < N; i++) fiocchi.push({ x: Math.random() * W, y: Math.random() * H, r: 1.2 + Math.random() * 2.2, v: 0.35 + Math.random() * 0.7, o: Math.random() * 6 });
    var t = 0;
    function giro() {
      if (document.hidden) { requestAnimationFrame(giro); return; }
      t += 0.01;
      cx.clearRect(0, 0, W, H);
      cx.fillStyle = "rgba(255,255,255,0.85)";
      cx.strokeStyle = "rgba(160,180,200,0.45)";
      for (var k = 0; k < N; k++) {
        var f = fiocchi[k];
        f.y += f.v;
        f.x += Math.sin(t + f.o) * 0.35;
        if (f.y > H + 5) { f.y = -5; f.x = Math.random() * W; }
        cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.2832); cx.fill(); cx.stroke();
      }
      requestAnimationFrame(giro);
    }
    giro();
  } catch (e) { /* il tema non deve mai rompere l'app */ }
})();
