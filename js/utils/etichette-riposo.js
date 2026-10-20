// js/utils/etichette-riposo.js
// 🖨 STAMPA FASE dentro la scheda di ogni fase di riposo (rigenero, biga, lievitazione, marinatura,
// raffreddamento...). Etichetta per il contenitore su rotolo da 62 mm: cos'e', lotto, inizio, A CHE ORA fare
// la fase dopo e quale. L'inizio e' la firma della fase (o della fase prima, o adesso). La schermata delle
// fasi si ridisegna spesso: un osservatore rimette il pulsante nelle fasi ogni volta.
const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const perInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const leggibile = (d) => d.toLocaleString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const durataTesto = (min) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h} h ${m}′` : h ? `${h} h` : `${m}′`; };

export function montaRiposi(vecchiaCard, { lotto }) {
  if (vecchiaCard) vecchiaCard.style.display = "none";
  if (!document.getElementById("sf-stile")) {
    const st = document.createElement("style"); st.id = "sf-stile"; st.textContent = stile(); document.head.appendChild(st);
  }
  let base = null; // ricetta e fasi del lotto aperto

  async function leggi() {
    const l = lotto?.();
    if (!l?.lotto_uuid) return null;
    if (!base || base.uuid !== l.lotto_uuid) {
      const { data: r } = await sb().from("produzione_lotti").select("id, codice_lotto, ricetta_id, ricette(nome)").eq("lotto_uuid", l.lotto_uuid).maybeSingle();
      if (!r) return null;
      const { data: fasi } = await sb().from("ricette_preparazione_fasi").select("id, ordine, nome_fase, durata_min, temperatura, riposo").eq("ricetta_id", r.ricetta_id).order("ordine");
      base = { uuid: l.lotto_uuid, r, F: fasi || [] };
    }
    const { data: firme } = await sb().from("produzione_log_haccp").select("fase_id, fase_ordine, firmato_il").eq("lotto_id", l.lotto_uuid);
    return { ...base, firme: firme || [] };
  }

  let occupato = false;
  async function riempi() {
    const vuoti = [...document.querySelectorAll(".rf-stampa-fase:not([data-fatto])")];
    if (!vuoti.length || occupato) return;
    occupato = true;
    try {
      const d = await leggi();
      if (!d) return;
      const firmaDi = (f) => d.firme.find((x) => x.fase_id === f.id || x.fase_ordine === f.ordine)?.firmato_il || null;
      for (const el of vuoti) {
        el.dataset.fatto = "1";
        const f = d.F.find((x) => x.ordine === Number(el.dataset.ordine));
        const dopo = f && d.F.find((n) => n.ordine > f.ordine);
        if (!f || !f.riposo || !dopo) continue;
        const prima = [...d.F].reverse().find((n) => n.ordine < f.ordine);
        const inizio = firmaDi(f) || (prima && firmaDi(prima)) || new Date().toISOString();
        el.innerHTML = `<div class="sf">
          <div class="sf-g"><label>Inizio<input type="datetime-local" class="sf-in" data-k="inizio" value="${perInput(new Date(inizio))}"></label>
            <label>Ore<input class="sf-in" inputmode="decimal" data-k="ore" value="${f.durata_min ? String(Math.round(f.durata_min / 6) / 10).replace(".", ",") : ""}" placeholder="?"></label></div>
          <div class="sf-pronto" data-k="pronto"></div>
          ${!f.durata_min ? `<label class="sf-ck"><input type="checkbox" data-k="salva" checked> salva questa durata nella ricetta</label>` : ""}
          <button type="button" class="sf-btn">🖨 Stampa fase</button></div>`;
        const aggiorna = () => {
          const p = calcola(el);
          el.querySelector('[data-k="pronto"]').innerHTML = p ? `Poi <b>${esc(dopo.nome_fase)}</b> alle <b>${esc(leggibile(p.fine))}</b>` : `<span style="color:#b45309">Scrivi quante ore dura</span>`;
        };
        el.querySelectorAll("input").forEach((x) => x.addEventListener("input", aggiorna));
        aggiorna();
        el.querySelector(".sf-btn").addEventListener("click", () => stampa(el, d, f, dopo));
      }
    } finally { occupato = false; }
  }

  function calcola(el) {
    const ini = new Date(el.querySelector('[data-k="inizio"]').value);
    const ore = parseFloat(String(el.querySelector('[data-k="ore"]').value).replace(",", "."));
    if (!Number.isFinite(ore) || ore <= 0 || isNaN(ini)) return null;
    const min = Math.round(ore * 60);
    return { ini, min, fine: new Date(ini.getTime() + min * 60000) };
  }

  async function stampa(el, d, f, dopo) {
    const p = calcola(el);
    if (!p) { alert("Scrivi quante ore dura."); return; }
    if (el.querySelector('[data-k="salva"]')?.checked) { await sb().from("ricette_preparazione_fasi").update({ durata_min: p.min }).eq("id", f.id); f.durata_min = p.min; }
    const etichetta = `<div class="et">
      <div class="et-cosa">${esc(d.r.ricette?.nome || "")}</div>
      <div class="et-fase">${esc(f.nome_fase)}${f.temperatura ? ` · ${esc(f.temperatura)} °C` : ""}</div>
      <div class="et-riga"><span>Lotto</span><b>${esc(d.r.codice_lotto)}</b></div>
      <div class="et-riga"><span>Inizio</span><b>${esc(leggibile(p.ini))}</b></div>
      <div class="et-pronto"><span>PRONTO</span><b>${esc(leggibile(p.fine))}</b><small>dopo ${esc(durataTesto(p.min))}</small></div>
      <div class="et-poi">Poi: <b>${esc(dopo?.nome_fase || "—")}</b></div></div>`;
    // rotolo da 62 mm: l'altezza si adatta al contenuto (si misura prima di stampare)
    const css = `
      .et{width:62mm;box-sizing:border-box;padding:3mm 3mm 4mm;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;}
      .et>div{margin-bottom:1.4mm;}
      .et-cosa{font-size:12pt;font-weight:800;line-height:1.15;}
      .et-fase{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:.03em;border-bottom:.4mm solid #000;padding-bottom:1mm;}
      .et-riga{display:flex;justify-content:space-between;gap:2mm;font-size:9pt;}
      .et-riga span{color:#333;}
      .et-pronto{border:.5mm solid #000;border-radius:1.5mm;padding:1.2mm 2mm;}
      .et-pronto span{display:block;font-size:8pt;font-weight:800;} .et-pronto b{display:block;font-size:13pt;line-height:1.15;} .et-pronto small{display:block;font-size:8pt;}
      .et-poi{font-size:9pt;}`;
    const prova = document.createElement("div");
    prova.style.cssText = "position:fixed;left:-9999px;top:0;visibility:hidden;";
    const ombra = prova.attachShadow({ mode: "open" });
    ombra.innerHTML = `<style>${css}</style>${etichetta}`;
    document.body.appendChild(prova);
    const hmm = Math.ceil(ombra.querySelector(".et").getBoundingClientRect().height * 25.4 / 96) + 1;
    prova.remove();
    const { apriAnteprimaStampa } = await import("./anteprima-stampa.js");
    apriAnteprimaStampa({ titolo: "Stampa fase", pagina: `62mm ${hmm}mm`, corpo: etichetta, css });
  }

  // le schede delle fasi si ridisegnano: si rimette il pulsante ogni volta che compaiono
  let t = null;
  const oss = new MutationObserver(() => { clearTimeout(t); t = setTimeout(riempi, 200); });
  oss.observe(document.body, { childList: true, subtree: true });
  const via = () => { if (!location.hash.startsWith("#/preparazioni")) { oss.disconnect(); window.removeEventListener("hashchange", via); } };
  window.addEventListener("hashchange", via);
  riempi();
}

function stile() {
  return `
  .sf{margin-top:10px;padding:10px;border:1.5px solid #e9d5ff;background:#faf5ff;border-radius:12px;}
  .sf-g{display:grid;grid-template-columns:1.8fr .8fr;gap:8px;}
  .sf-g label{font-size:12px;font-weight:700;color:#64748b;}
  .sf-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:9px;padding:8px;font-size:15px;font-family:inherit;background:#fff;color:#0f172a;margin-top:2px;}
  .sf-pronto{font-size:13.5px;margin-top:6px;}
  .sf-ck{display:flex;gap:6px;align-items:center;font-size:12.5px;color:#475569;margin-top:6px;}
  .sf-btn{width:100%;border:0;border-radius:11px;padding:11px;background:#0E5A7A;color:#fff;font-weight:800;font-size:14px;cursor:pointer;margin-top:8px;}`;
}
