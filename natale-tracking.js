(function(){
  var PIXEL = "1474015191346752", GA4 = "G-TZQVKD4KEV";
  window.rfEvento = function(nome, dati, standard){
    try {
      if (localStorage.getItem("rf_consenso") !== "si") return;
      if (window.fbq) { if (standard) fbq("track", nome, dati || {}); else fbq("trackCustom", nome, dati || {}); }
      if (window.gtag) gtag("event", nome, dati || {});
    } catch (e) {}
  };
  function carica(){
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", PIXEL); fbq("track", "PageView");
    var g = document.createElement("script"); g.async = true; g.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4; document.head.appendChild(g);
    window.dataLayer = window.dataLayer || []; window.gtag = function(){ dataLayer.push(arguments); };
    gtag("js", new Date()); gtag("config", GA4);
    document.dispatchEvent(new Event("rf-pronto"));
  }
  var c = null; try { c = localStorage.getItem("rf_consenso"); } catch (e) {}
  if (c === "si") { carica(); return; }
  if (c === "no") return;
  var box = document.getElementById("cookie"); box.hidden = false;
  document.getElementById("ck-si").onclick = function(){ try { localStorage.setItem("rf_consenso", "si"); } catch (e) {} box.hidden = true; carica(); };
  document.getElementById("ck-no").onclick = function(){ try { localStorage.setItem("rf_consenso", "no"); } catch (e) {} box.hidden = true; };
})();