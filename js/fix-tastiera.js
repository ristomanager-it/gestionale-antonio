// js/fix-tastiera.js
// Su iPhone, dopo aver scritto in un campo, il footer fisso in basso a volte resta spostato a meta' schermo.
// Mentre la tastiera e' aperta il footer si nasconde; quando si chiude la pagina viene rimessa a posto.
(function () {
  try {
    var root = document.documentElement;
    var st = document.createElement("style");
    st.textContent = "html.tastiera .app-footer, html.tastiera .footer-brand{display:none !important;}";
    document.head.appendChild(st);

    var campo = function (el) {
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return false;
      return !/^(checkbox|radio|button|submit|range|file|color)$/.test(el.type || "");
    };
    document.addEventListener("focusin", function (e) {
      if (campo(e.target)) root.classList.add("tastiera");
    });
    document.addEventListener("focusout", function (e) {
      if (!campo(e.target)) return;
      setTimeout(function () {
        if (campo(document.activeElement)) return;
        root.classList.remove("tastiera");
        // rimette a posto la vista rimasta spostata dalla tastiera
        window.scrollTo(window.scrollX, window.scrollY);
        setTimeout(function () { window.scrollTo(window.scrollX, window.scrollY); }, 250);
      }, 120);
    });
  } catch (e) { /* mai rompere l'app */ }
})();
