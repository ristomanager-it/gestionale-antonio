// js/views/preventivo-isole.js
// Scelta delle portate di un'isola del buffet (matrimoni). Si apre dal menu del preventivo:
// elenco con le caselle, contatore del minimo richiesto, conferma. Per aggiungere altre pietanze
// c'e' il pulsante "dal ricettario" (per categoria, senza caricare tutto). Il chiamante mette le portate nel menu.
// Chiudi e Conferma stanno in alto (sempre visibili) e anche in basso, sopra il footer dell'app. Esc chiude.

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// gruppi: [{ nome, minimo, piatti: [nome...] }]   scelti: nomi gia' presenti nel menu   onOk(nomiScelti)
export function scegliPortate({ titolo, gruppi, scelti, onOk }) {
  const sel = new Set(scelti || []);
  // piatti gia' nel menu che non sono nell'elenco dell'isola (scritti a mano o presi dal ricettario)
  const inElenco = new Set(gruppi.flatMap((g) => g.piatti));
  const altre = [...new Set((scelti || []).filter((n) => !inElenco.has(n)))];
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;z-index:5000;background:#F6F8FA;overflow-y:auto;-webkit-overflow-scrolling:touch;";
  document.body.appendChild(ov);
  const chiudi = () => { document.removeEventListener("keydown", tasto); ov.remove(); };
  const tasto = (e) => { if (e.key === "Escape") chiudi(); };
  document.addEventListener("keydown", tasto);

  function disegna() {
    const manca = [];
    const gruppiHtml = gruppi.map((g, gi) => {
      const n = g.piatti.filter((p) => sel.has(p)).length;
      const min = Number(g.minimo) || 0;
      if (min && n < min) manca.push(`${g.nome} ${min - n}`);
      const cnt = `<span class="cnt ${min && n < min ? "" : "ok"}">${min ? `${n} di ${min}` : `${n} scelti`}</span>`;
      const testa = (gruppi.length > 1 || min) ? `<div class="gh">${cnt}${gruppi.length > 1 ? esc(g.nome) : "Portate"}</div>` : "";
      return `<div class="g">${testa}${g.piatti.map((p, pi) => `
        <label class="p"><input type="checkbox" data-g="${gi}" data-p="${pi}" ${sel.has(p) ? "checked" : ""}><span>${esc(p)}</span></label>`).join("")}</div>`;
    }).join("");
    const altreHtml = altre.length ? `<div class="g"><div class="gh">Altre pietanze</div>${altre.map((p, ai) => `
        <label class="p"><input type="checkbox" data-a="${ai}" ${sel.has(p) ? "checked" : ""}><span>${esc(p)}</span></label>`).join("")}</div>` : "";
    const avviso = manca.length ? "Mancano: " + esc(manca.join(" · ")) : "Minimi raggiunti";

    ov.innerHTML = `<style>
      .sc{max-width:680px;margin:0 auto;padding:0 16px 230px;color:#1F2937;font-family:inherit;}
      .sc .top{position:sticky;top:0;z-index:3;background:#F6F8FA;padding:12px 0 10px;border-bottom:1px solid #E5E7EB;margin-bottom:12px;display:flex;align-items:center;gap:10px;}
      .sc .top h2{margin:0;font-size:19px;flex:1;min-width:0;}
      .sc .g{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:6px 16px 4px;margin-bottom:12px;}
      .sc .gh{font-weight:700;font-size:15px;padding:12px 0 6px;}
      .sc .cnt{float:right;font-size:13px;font-weight:700;border-radius:999px;padding:3px 10px;background:#FEF3C7;color:#92400E;}
      .sc .cnt.ok{background:#DCFCE7;color:#166534;}
      .sc label.p{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid #F1F5F9;font-size:16px;cursor:pointer;}
      .sc label.p input{width:22px;height:22px;flex-shrink:0;margin-top:1px;}
      .sc .altra{width:100%;border:1.5px dashed #9FB4C0;background:#F8FBFD;border-radius:14px;padding:13px;font-size:15px;font-weight:700;color:#023C59;cursor:pointer;margin-bottom:12px;}
      .sc .bar{position:fixed;left:0;right:0;bottom:104px;background:#fff;border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;padding:10px 16px;display:flex;gap:10px;align-items:center;justify-content:space-between;z-index:4;}
      .sc .avv{font-size:13px;color:#92400E;flex:1;}
      .sc .avv.ok{color:#166534;}
    </style>
    <div class="sc">
      <div class="top"><h2>${esc(titolo)}</h2>
        <button class="app-button secondary" data-no="1">Chiudi</button>
        <button class="app-button" data-si="1">Conferma</button></div>
      ${gruppiHtml}${altreHtml}
      <button class="altra" id="sc-altra">＋ Altra pietanza dal ricettario</button></div>
    <div class="sc"><div class="bar">
      <div class="avv ${manca.length ? "" : "ok"}">${avviso}</div>
      <button class="app-button secondary" data-no="1">Annulla</button>
      <button class="app-button" data-si="1">Conferma</button>
    </div></div>`;

    const resta = () => { const y = ov.scrollTop; disegna(); ov.scrollTop = y; };
    ov.querySelectorAll("input[data-g]").forEach((el) => el.addEventListener("change", () => {
      const nome = gruppi[Number(el.dataset.g)].piatti[Number(el.dataset.p)];
      if (el.checked) sel.add(nome); else sel.delete(nome);
      resta();
    }));
    ov.querySelectorAll("input[data-a]").forEach((el) => el.addEventListener("change", () => {
      const nome = altre[Number(el.dataset.a)];
      if (el.checked) sel.add(nome); else sel.delete(nome);
      resta();
    }));
    ov.querySelector("#sc-altra").onclick = async () => {
      const m = await import("./picker-ricette.js?v=" + (window.APP_V || 1));
      m.scegliRicette({ titolo: "Altra pietanza", onOk: (lista) => {
        lista.forEach((r) => { if (!inElenco.has(r.nome) && !altre.includes(r.nome)) altre.push(r.nome); sel.add(r.nome); });
        resta();
      } });
    };
    ov.querySelectorAll("[data-no]").forEach((b) => { b.onclick = chiudi; });
    ov.querySelectorAll("[data-si]").forEach((b) => { b.onclick = () => {
      const nomi = [...gruppi.flatMap((g) => g.piatti.filter((p) => sel.has(p))), ...altre.filter((p) => sel.has(p))];
      chiudi();
      if (onOk) onOk(nomi);
    }; });
  }
  disegna();
}
