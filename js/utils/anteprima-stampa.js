// js/utils/anteprima-stampa.js
// Anteprima di stampa DENTRO l'app (niente finestre nuove: sul telefono non si chiudevano e si vedevano in
// formato desktop). Il contenuto va in uno shadow DOM (i suoi stili non toccano l'app), rimpicciolito per
// stare nello schermo; "Stampa" stampa solo l'anteprima a grandezza vera, "Chiudi" torna all'app.
export function apriAnteprimaStampa({ titolo = "Anteprima di stampa", css = "", corpo = "", pagina = null, fontHref = null } = {}) {
  chiudiAnteprimaStampa();
  if (fontHref && ![...document.querySelectorAll("link[rel=stylesheet]")].some((l) => l.href === fontHref)) {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = fontHref; document.head.appendChild(l);
  }
  const st = document.createElement("style");
  st.id = "rf-stampa-stile";
  st.textContent = `
    #rf-stampa{position:fixed;inset:0;z-index:2147483000;background:#d9dde3;display:flex;flex-direction:column;}
    #rf-stampa .rf-st-bar{display:flex;gap:8px;align-items:center;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;background:#fff;border-bottom:1px solid #e2e8f0;}
    #rf-stampa .rf-st-bar b{flex:1;font:700 15px system-ui,-apple-system,sans-serif;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    #rf-stampa .rf-st-bar button{border:0;border-radius:999px;padding:11px 16px;font:700 14px system-ui,-apple-system,sans-serif;cursor:pointer;}
    #rf-stampa .rf-st-chiudi{background:#e2e8f0;color:#334155;} #rf-stampa .rf-st-stampa{background:#0E5A7A;color:#fff;}
    #rf-stampa .rf-st-area{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:12px 12px calc(24px + env(safe-area-inset-bottom,0px));}
    #rf-stampa .rf-st-scala{transform-origin:top left;}
    @media print {
      @page{${pagina ? `size:${pagina};` : ""}margin:0}
      html,body{background:#fff!important;margin:0!important;padding:0!important;height:auto!important;overflow:visible!important;}
      body>*:not(#rf-stampa){display:none!important;}
      #rf-stampa{position:static!important;display:block!important;background:#fff!important;}
      #rf-stampa .rf-st-bar{display:none!important;}
      #rf-stampa .rf-st-area{padding:0!important;overflow:visible!important;}
      #rf-stampa .rf-st-scala{transform:none!important;margin:0!important;width:auto!important;}
    }`;
  document.head.appendChild(st);

  const ov = document.createElement("div");
  ov.id = "rf-stampa";
  ov.innerHTML = `<div class="rf-st-bar"><button type="button" class="rf-st-chiudi">✕ Chiudi</button><b></b><button type="button" class="rf-st-stampa">🖨 Stampa</button></div>
    <div class="rf-st-area"><div class="rf-st-scala"></div></div>`;
  ov.querySelector("b").textContent = titolo;
  document.body.appendChild(ov);
  const host = ov.querySelector(".rf-st-scala");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${css}</style><div class="rf-st-contenuto" style="display:inline-block">${corpo}</div>`;

  const area = ov.querySelector(".rf-st-area");
  const adatta = () => {
    const box = root.querySelector(".rf-st-contenuto");
    if (!box) return;
    host.style.transform = "none"; host.style.marginBottom = "0";
    const w = box.offsetWidth, h = box.offsetHeight;
    const k = Math.min(1, (area.clientWidth - 24) / (w || 1));
    host.style.width = w + "px";
    host.style.transform = `scale(${k})`;
    host.style.marginBottom = -(h * (1 - k)) + "px";
  };
  adatta();
  if (document.fonts?.ready) document.fonts.ready.then(adatta);
  window.addEventListener("resize", adatta);
  ov.querySelector(".rf-st-chiudi").addEventListener("click", chiudiAnteprimaStampa);
  // stampa: margini a zero e titolo vuoto, cosi' il telefono non aggiunge in testa e in fondo al foglio
  // indirizzo della pagina, data, titolo e numero di pagina. L'anteprima NON si chiude da sola: su iPhone
  // "afterprint" arriva subito, prima che la stampa parta, e si stampava la pagina dell'app sotto.
  ov.querySelector(".rf-st-stampa").addEventListener("click", () => {
    if (!ov._titolo) ov._titolo = document.title;
    document.title = " ";
    window.print();
  });
  // tornando indietro con il telefono si chiude l'anteprima
  const suHash = () => chiudiAnteprimaStampa();
  window.addEventListener("hashchange", suHash, { once: true });
  ov._pulisci = () => { window.removeEventListener("resize", adatta); window.removeEventListener("hashchange", suHash); };
}

export function chiudiAnteprimaStampa() {
  const ov = document.getElementById("rf-stampa");
  if (ov) { ov._pulisci?.(); ov.remove(); }
  document.getElementById("rf-stampa-stile")?.remove();
}
