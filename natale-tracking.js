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
/* contatore visite Ristoflow (page_analytics) - REGOLA: nessuna landing senza contatore. Nessun dato personale. */
(function(){try{
var A="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0",U="https://cuhcscpvhypoaplcmtjk.supabase.co/rest/v1/page_analytics";
var vis=null;try{vis=localStorage.getItem("rf_vis");var vt=Number(localStorage.getItem("rf_vis_t")||0);if(!vis||Date.now()-vt>5184000000){vis=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("rf_vis",vis);localStorage.setItem("rf_vis_t",String(Date.now()));}}catch(e){}
var ses=null;try{ses=sessionStorage.getItem("rf_ses");if(!ses){ses=Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem("rf_ses",ses);}}catch(e){}
var q=new URLSearchParams(location.search),ref=document.referrer||"";
var nome=(location.pathname.split("/").pop()||"index").replace(".html","");
var sede=nome.indexOf("aquila")>=0?"4a936e52-a1e3-42fc-843c-e8d15dc86040":"c40919bb-78c2-458f-865e-0c9fd02aa0b5";
var src=q.get("utm_source")||(ref?(function(){try{return new URL(ref).hostname;}catch(e){return null;}})():"diretto");
function inv(tipo,el,val,ok){try{fetch(U,{method:"POST",keepalive:true,headers:{"Content-Type":"application/json","apikey":A,"Authorization":"Bearer "+A,"Prefer":"return=minimal"},body:JSON.stringify({azienda_id:"b331365f-17db-4dda-aa2f-77a09427fe42",sede_id:sede,pagina:nome,pagina_id:"b331365f-17db-4dda-aa2f-77a09427fe42",tipo:tipo,elemento:el,valore:val||null,completato:!!ok,referrer:ref?ref.slice(0,250):null,utm_source:src,utm_medium:q.get("utm_medium"),utm_campaign:q.get("utm_campaign"),device:/Mobi|Android/i.test(navigator.userAgent)?"mobile":"desktop",session_id:ses,visitatore:vis})}).catch(function(){});}catch(e){}}
inv("view","sito_pagina");
var sg={};addEventListener("scroll",function(){var h=document.documentElement,t=h.scrollHeight-h.clientHeight;if(t<=0)return;var p=Math.round(100*h.scrollTop/t);[25,50,75,100].forEach(function(s){if(p>=s&&!sg[s]){sg[s]=1;inv("click","scroll_"+s);}});},{passive:true});
var t0=Date.now(),fatto=false;function tempo(){if(fatto)return;var s=Math.round((Date.now()-t0)/1000);if(s<2)return;fatto=true;inv("click","tempo_pagina",String(s));}
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")tempo();});addEventListener("pagehide",tempo);
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a,button");if(!a)return;var h=a.getAttribute("href")||"",tx=(a.textContent||"").toLowerCase();if(h.indexOf("tel:")===0)inv("click","click_telefono",h);else if(h.indexOf("wa.me")>=0)inv("click","wame","whatsapp");else if(/maps/.test(h))inv("click","click_mappa");else if(/prenot|blocca/.test(h+" "+tx))inv("click","cta_prenota",(h||tx).slice(0,80));},true);
var orig=window.rfEvento;window.rfEvento=function(n,d,s){try{if(n==="Natale_Inizio_Modulo")inv("step","modulo_iniziato");else if(n==="InitiateCheckout")inv("step","submit_tentativo");else if(n==="Lead")inv("submit","prenotazione_completata",d&&d.value?d.value+" euro acconto":null,true);}catch(e){}if(orig)return orig.apply(this,arguments);};
}catch(e){}})();