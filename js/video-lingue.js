/* =========================================================
   VIDEO LINGUE — sottotitoli nella lingua madre di chi guarda.
   Si include una volta sola (app, siti, pagine pubbliche):
     <script defer src="https://app.ristoflow-ai.com/js/video-lingue.js"></script>
   Per ogni <video> della pagina, anche quelli aggiunti dopo:
   - se accanto al video c'e' <nome>-sottotitoli.json (lo scrive la funzione
     video-sottotitoli quando il video entra in galleria) aggiunge le tracce
     <nome>-<lingua>.vtt; se il video ha gia' le sue <track>, usa quelle
   - apre i sottotitoli nella lingua di chi guarda: scelta fatta col tasto,
     poi lingua del dipendente (app), poi lingua del telefono, poi della pagina.
     Se coincide con la lingua parlata nel video, parte senza sottotitoli.
   - mette il tasto 🌐 sul video per cambiare lingua o spegnerli.
========================================================= */
(function () {
  if (window.__rfVideoLingue) return;
  window.__rfVideoLingue = true;

  var NOMI = { it: "Italiano", en: "English", es: "Español", de: "Deutsch", nl: "Nederlands", ru: "Русский", fr: "Français", pt: "Português" };
  var SPENTI = { it: "Senza sottotitoli", en: "No subtitles", es: "Sin subtítulos", de: "Ohne Untertitel", nl: "Zonder ondertitels", ru: "Без субтитров", fr: "Sans sous-titres", pt: "Sem legendas" };
  var CHIAVE = "rf_lingua_video";
  var manifesti = {};
  var videos = [];

  function letto() { try { return localStorage.getItem(CHIAVE) || ""; } catch (e) { return ""; } }
  function salva(l) { try { localStorage.setItem(CHIAVE, l); } catch (e) {} }
  function due(l) { return String(l || "").slice(0, 2).toLowerCase(); }

  function preferite() {
    var out = [];
    if (window.RF_LINGUA) out.push(due(window.RF_LINGUA));
    var nav = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < nav.length; i++) if (nav[i]) out.push(due(nav[i]));
    if (document.documentElement.lang) out.push(due(document.documentElement.lang));
    return out;
  }

  function sorgente(v) {
    var s = v.currentSrc || v.getAttribute("src") || "";
    if (!s) { var so = v.querySelector("source[src]"); if (so) s = so.getAttribute("src") || ""; }
    try { return new URL(s, location.href).href; } catch (e) { return s; }
  }
  function base(u) {
    var m = String(u).match(/^(https?:\/\/[^?#]+\/storage\/v1\/object\/public\/[^?#]+?)\.(mp4|mov|m4v|webm)(\?.*)?$/i);
    return m ? m[1] : null;
  }
  function manifesto(b) {
    if (!manifesti[b]) {
      manifesti[b] = fetch(b + "-sottotitoli.json", { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return manifesti[b];
  }

  function stile() {
    if (document.getElementById("rfvl-stile")) return;
    var s = document.createElement("style");
    s.id = "rfvl-stile";
    s.textContent =
      ".rfvl-box{position:relative;max-width:100%}" +
      ".rfvl-btn{position:absolute;top:8px;right:8px;z-index:3;border:0;border-radius:999px;padding:6px 10px;" +
      "font:600 13px/1 system-ui,-apple-system,'Segoe UI',sans-serif;color:#fff;background:rgba(0,0,0,.55);cursor:pointer;" +
      "-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}" +
      ".rfvl-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}" +
      ".rfvl-menu{position:absolute;top:42px;right:8px;z-index:4;min-width:170px;background:rgba(20,20,20,.94);border-radius:12px;" +
      "padding:6px;display:none;box-shadow:0 8px 24px rgba(0,0,0,.35)}" +
      ".rfvl-menu.aperto{display:block}" +
      ".rfvl-menu button{display:block;width:100%;text-align:left;border:0;background:none;color:#fff;padding:9px 12px;border-radius:8px;" +
      "font:500 14px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;cursor:pointer}" +
      ".rfvl-menu button:hover,.rfvl-menu button[aria-checked=true]{background:rgba(255,255,255,.14)}" +
      "video::cue{font-size:1.05em;background:rgba(0,0,0,.7)}";
    document.head.appendChild(s);
  }

  function lingueDi(v) {
    var out = [];
    for (var i = 0; i < v.textTracks.length; i++) {
      var t = v.textTracks[i];
      if ((t.kind === "subtitles" || t.kind === "captions") && t.language && out.indexOf(due(t.language)) < 0) out.push(due(t.language));
    }
    return out;
  }

  function imposta(v, lingua) {
    for (var i = 0; i < v.textTracks.length; i++) {
      var t = v.textTracks[i];
      if (t.kind !== "subtitles" && t.kind !== "captions") continue;
      t.mode = lingua && due(t.language) === lingua ? "showing" : "disabled";
    }
    v.__rfvlLingua = lingua || "";
    var b = v.__rfvlBtn;
    if (b) b.textContent = "🌐 " + (lingua ? lingua.toUpperCase() : "OFF");
    var m = v.__rfvlMenu;
    if (m) for (var j = 0; j < m.children.length; j++) m.children[j].setAttribute("aria-checked", m.children[j].dataset.l === (lingua || "") ? "true" : "false");
  }

  function riallinea(v) {
    var l = v.__rfvlLingua || "";
    for (var i = 0; i < v.textTracks.length; i++) {
      var t = v.textTracks[i];
      if (t.kind !== "subtitles" && t.kind !== "captions") continue;
      var giusto = l && due(t.language) === l ? "showing" : "disabled";
      if (t.mode !== giusto) t.mode = giusto;
    }
  }

  function scegli(v) {
    var disp = lingueDi(v);
    if (!disp.length) return "";
    var orig = v.__rfvlOriginale || "";
    var s = letto();
    if (s === "off") return "";
    if (s && disp.indexOf(s) >= 0) return s;
    var pref = preferite();
    for (var i = 0; i < pref.length; i++) {
      if (pref[i] === orig) return ""; // parla la lingua del video: niente sottotitoli
      if (disp.indexOf(pref[i]) >= 0) return pref[i];
    }
    return disp.indexOf("en") >= 0 && orig !== "en" ? "en" : "";
  }

  function tasto(v) {
    if (v.__rfvlBtn) return;
    var disp = lingueDi(v);
    if (!disp.length) return;
    stile();
    var box = v.parentNode;
    if (!box || !box.classList || !box.classList.contains("rfvl-box")) {
      box = document.createElement("span");
      box.className = "rfvl-box";
      var cs = getComputedStyle(v);
      box.style.display = cs.display === "block" || cs.display === "flex" ? "block" : "inline-block";
      if (cs.flexShrink === "0") box.style.flexShrink = "0";
      v.parentNode.insertBefore(box, v);
      box.appendChild(v);
    }
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rfvl-btn";
    btn.setAttribute("aria-label", "Subtitles / Sottotitoli");
    var menu = document.createElement("div");
    menu.className = "rfvl-menu";
    menu.setAttribute("role", "menu");
    var voci = disp.concat([""]);
    for (var i = 0; i < voci.length; i++) {
      var o = document.createElement("button");
      o.type = "button";
      o.setAttribute("role", "menuitemradio");
      o.dataset.l = voci[i];
      o.textContent = voci[i] ? (NOMI[voci[i]] || voci[i].toUpperCase()) : (SPENTI[due(navigator.language)] || SPENTI.en);
      o.addEventListener("click", function (e) {
        e.stopPropagation();
        var l = this.dataset.l;
        salva(l || "off");
        menu.classList.remove("aperto");
        for (var k = 0; k < videos.length; k++) if (videos[k].isConnected) imposta(videos[k], lingueDi(videos[k]).indexOf(l) >= 0 ? l : "");
      });
      menu.appendChild(o);
    }
    btn.addEventListener("click", function (e) { e.stopPropagation(); menu.classList.toggle("aperto"); });
    document.addEventListener("click", function () { menu.classList.remove("aperto"); });
    box.appendChild(btn);
    box.appendChild(menu);
    v.__rfvlBtn = btn;
    v.__rfvlMenu = menu;
  }

  function aggiungiTracce(v, b, m) {
    var gia = lingueDi(v);
    var nuove = (m.lingue || []).filter(function (l) { return gia.indexOf(l) < 0; });
    if (!nuove.length) return;
    if (!v.hasAttribute("crossorigin")) {
      v.setAttribute("crossorigin", "anonymous");
      if (v.readyState > 0 && v.paused) { var t = v.currentTime; v.load(); try { v.currentTime = t; } catch (e) {} }
    }
    nuove.forEach(function (l) {
      var tr = document.createElement("track");
      tr.kind = "subtitles";
      tr.srclang = l;
      tr.label = NOMI[l] || l.toUpperCase();
      tr.src = b + "-" + l + ".vtt";
      v.appendChild(tr);
    });
  }

  function prepara(v) {
    if (v.__rfvlFatto) return;
    v.__rfvlFatto = true;
    videos.push(v);
    v.__rfvlOriginale = due(v.getAttribute("data-lingua") || "");
    var b = base(sorgente(v));
    var fine = function () {
      // i <track default> della pagina e la scelta automatica del browser non devono decidere:
      // decide la lingua di chi guarda. Nei primi secondi rimetto a posto se il browser ne accende un'altra.
      for (var i = 0; i < v.textTracks.length; i++) v.textTracks[i].mode = "disabled";
      tasto(v);
      imposta(v, scegli(v));
      v.__rfvlFino = Date.now() + 5000;
      v.textTracks.addEventListener("change", function () { if (Date.now() < v.__rfvlFino) riallinea(v); });
      var el = v.querySelectorAll("track");
      for (var k = 0; k < el.length; k++) el[k].addEventListener("load", function () { riallinea(v); });
    };
    if (!b) { fine(); return; }
    manifesto(b).then(function (m) {
      if (m && m.parlato !== false && m.lingue && m.lingue.length) {
        if (m.originale) v.__rfvlOriginale = due(m.originale);
        aggiungiTracce(v, b, m);
      } else if (!v.__rfvlOriginale && lingueDi(v).length) {
        v.__rfvlOriginale = "it"; // video della casa con tracce scritte a mano: si parla italiano
      }
      fine();
    });
  }

  function scansiona(radice) {
    var vs = (radice || document).querySelectorAll ? (radice || document).querySelectorAll("video") : [];
    for (var i = 0; i < vs.length; i++) prepara(vs[i]);
    if (radice && radice.tagName === "VIDEO") prepara(radice);
  }

  // App: la lingua del dipendente collegato (dipendenti.lingua_voce)
  function linguaDipendente() {
    try {
      var sb = window.supabase, uid = window.state && window.state.user && window.state.user.id;
      if (!sb || !sb.from || !uid || window.RF_LINGUA) return;
      sb.from("dipendenti").select("lingua_voce").eq("user_id", uid).limit(1).then(function (r) {
        var l = r && r.data && r.data[0] && r.data[0].lingua_voce;
        if (l) {
          window.RF_LINGUA = l;
          if (!letto()) for (var k = 0; k < videos.length; k++) if (videos[k].isConnected) imposta(videos[k], scegli(videos[k]));
        }
      });
    } catch (e) {}
  }

  window.RFVideoLingue = {
    imposta: function (l) { salva(l || "off"); for (var k = 0; k < videos.length; k++) imposta(videos[k], lingueDi(videos[k]).indexOf(l) >= 0 ? l : ""); },
    scansiona: scansiona
  };

  function avvia() {
    scansiona(document);
    linguaDipendente();
    setTimeout(linguaDipendente, 4000);
    new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) for (var j = 0; j < lista[i].addedNodes.length; j++) {
        var n = lista[i].addedNodes[j];
        if (n.nodeType === 1) scansiona(n);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia); else avvia();
})();
