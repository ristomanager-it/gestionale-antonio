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
      const { data: r } = await sb().from("produzione_lotti").select("id, codice_lotto, ricetta_id, evento_titolo, destinazione, ricette(nome)").eq("lotto_uuid", l.lotto_uuid).maybeSingle();
      if (!r) return null;
      const [{ data: fasi }, { data: ing }, { data: ric }, { data: lp }] = await Promise.all([
        sb().from("ricette_preparazione_fasi").select("id, ordine, nome_fase, durata_min, temperatura, riposo").eq("ricetta_id", r.ricetta_id).order("ordine"),
        sb().from("ricetta_ingredienti").select("nome_prodotto, quantita, unita_misura, fase_id, ordine").eq("ricetta_id", r.ricetta_id).order("ordine"),
        sb().from("ricette").select("porzioni").eq("id", r.ricetta_id).maybeSingle(),
        sb().from("produzione_lotti").select("porzioni_equivalenti").eq("lotto_uuid", l.lotto_uuid).maybeSingle(),
      ]);
      // grammature riportate alla quantita' di questa lavorazione
      const k = Number(lp?.porzioni_equivalenti) > 0 && Number(ric?.porzioni) > 0 ? Number(lp.porzioni_equivalenti) / Number(ric.porzioni) : 1;
      base = { uuid: l.lotto_uuid, r, F: fasi || [], ing: ing || [], k };
    }
    const { data: firme } = await sb().from("produzione_log_haccp").select("fase_id, fase_ordine, firmato_il").eq("lotto_id", l.lotto_uuid);
    return { ...base, firme: firme || [] };
  }

  // 📦 in ogni fase gli ingredienti che servono, con le grammature (non serve riaprire la ricetta)
  function grammature(d) {
    for (const el of document.querySelectorAll(".rf-ing-fase:not([data-fatto])")) {
      el.dataset.fatto = "1";
      const f = d.F.find((x) => x.ordine === Number(el.dataset.ordine));
      const ii = f ? d.ing.filter((i) => i.fase_id === f.id) : [];
      if (!ii.length) continue;
      const q = (i) => {
        const n = Number(i.quantita) * d.k;
        const t = Number.isInteger(n) ? n.toLocaleString("it-IT") : n.toLocaleString("it-IT", { maximumFractionDigits: n < 10 ? 2 : 0 });
        return `${t} ${i.unita_misura || ""}`.trim();
      };
      el.innerHTML = `<ul class="sf-ing">${ii.map((i) => `<li><span>${esc(i.nome_prodotto)}</span><b>${esc(q(i))}</b></li>`).join("")}</ul>`;
    }
  }

  let occupato = false;
  async function riempi() {
    const vuoti = [...document.querySelectorAll(".rf-stampa-fase:not([data-fatto])")];
    const senzaIng = document.querySelector(".rf-ing-fase:not([data-fatto])");
    if ((!vuoti.length && !senzaIng) || occupato) return;
    occupato = true;
    try {
      const d = await leggi();
      if (!d) return;
      grammature(d);
      const firmaDi = (f) => d.firme.find((x) => x.fase_id === f.id || x.fase_ordine === f.ordine)?.firmato_il || null;
      for (const el of vuoti) {
        el.dataset.fatto = "1";
        const f = d.F.find((x) => x.ordine === Number(el.dataset.ordine));
        const dopo = f && d.F.find((n) => n.ordine > f.ordine);
        if (!f) continue;
        const attesa = Boolean(f.riposo && dopo);   // fase di riposo: serve la durata, l'etichetta dice a che ora e' pronta
        const prima = [...d.F].reverse().find((n) => n.ordine < f.ordine);
        const inizio = firmaDi(f) || (prima && firmaDi(prima)) || new Date().toISOString();
        el.innerHTML = `<div class="sf">
          <div class="sf-g"><label>Inizio<input type="datetime-local" class="sf-in" data-k="inizio" value="${perInput(new Date(inizio))}"></label>
            <label>Ore<input class="sf-in" inputmode="decimal" data-k="ore" value="${f.durata_min ? String(Math.round(f.durata_min / 6) / 10).replace(".", ",") : ""}" placeholder="?"></label></div>
          <div class="sf-pronto" data-k="pronto"></div>
          ${!f.durata_min ? `<label class="sf-ck"><input type="checkbox" data-k="salva" checked> salva questa durata nella ricetta</label>` : ""}
          <button type="button" class="sf-btn">🖨 Stampa fase</button></div>`;
        const aggiorna = () => {
          const p = calcola(el, attesa);
          el.querySelector('[data-k="pronto"]').innerHTML = !attesa
            ? (p && p.fine ? `Finisce alle <b>${esc(leggibile(p.fine))}</b>` : "")
            : p ? `Poi <b>${esc(dopo.nome_fase)}</b> alle <b>${esc(leggibile(p.fine))}</b>` : `<span style="color:#b45309">Scrivi quante ore dura</span>`;
        };
        el.querySelectorAll("input").forEach((x) => x.addEventListener("input", aggiorna));
        aggiorna();
        el.querySelector(".sf-btn").addEventListener("click", () => stampa(el, d, f, dopo));
      }
    } finally { occupato = false; }
  }

  function calcola(el, richiestaDurata = true) {
    const ini = new Date(el.querySelector('[data-k="inizio"]').value);
    const ore = parseFloat(String(el.querySelector('[data-k="ore"]').value).replace(",", "."));
    if (isNaN(ini)) return null;
    // fase che non e' un riposo: la durata e' facoltativa, l'etichetta esce anche senza
    if (!Number.isFinite(ore) || ore <= 0) return richiestaDurata ? null : { ini, min: null, fine: null };
    const min = Math.round(ore * 60);
    return { ini, min, fine: new Date(ini.getTime() + min * 60000) };
  }

  async function stampa(el, d, f, dopo) {
    const p = calcola(el, Boolean(f.riposo && dopo));
    if (!p) { alert(f.riposo && dopo ? "Scrivi quante ore dura." : "Controlla la data di inizio."); return; }
    if (p.min && el.querySelector('[data-k="salva"]')?.checked) { await sb().from("ricette_preparazione_fasi").update({ durata_min: p.min }).eq("id", f.id); f.durata_min = p.min; }
    const btn = el.querySelector(".sf-btn");
    btn.disabled = true; btn.textContent = "Invio all'etichettatrice…";
    try {
      // come le etichette dei lotti: immagine alla risoluzione della Brother, in coda al Raspberry
      const et = await import("../modules/produzione/etichette-lotto.js?v=" + (window.APP_V || ""));
      const st = await et.stampanteEtichette();
      // rotolo da 62 mm (continuo o pretagliato da 62); qualsiasi altra misura salvata -> 62 continuo
      const id = /^62/.test(String(st?.etichetta_formato || "")) && et.FORMATI_ETICHETTA[st.etichetta_formato] ? st.etichetta_formato : "62";
      const base = et.FORMATI_ETICHETTA[id];
      const png = disegna(d, f, dopo, p, base.w, base.continuo ? null : base.h);
      if (!png) { alert("Sul rotolo montato l'etichetta non entra: monta il rotolo continuo da 62 mm."); return; }
      if (!st) { await anteprima(d, f, dopo, p); return; }
      const fmt = et.misureEtichetta(id, png.mm);
      const { error } = await sb().from("coda_stampe").insert({
        azienda_id: window.state.azienda.id, sede_id: st.sede_id || null,   // la stampa segue la stampante, non la sede in cui sta lavorando chi stampa
        stampante_id: st.id, stampante_ip: st.ip, stampante_porta: st.porta || 9100, larghezza: fmt.larghezzaMm,
        tipo: "etichetta", reparto: "etichette",
        // "lotto_fase", non "lotto": l'etichetta del lotto chiude la lavorazione, quella della fase no
        contenuto: { png: png.url, copie: 1, formato: fmt.descr, label: fmt.label, rosso: false, lotto_fase: d.r.codice_lotto },
      });
      if (error) { alert("Non mandata all'etichettatrice: " + error.message); return; }
      btn.textContent = "✅ Mandata all'etichettatrice";
      setTimeout(() => { btn.textContent = "🖨 Stampa fase"; }, 4000);
    } finally { btn.disabled = false; if (btn.textContent.startsWith("Invio")) btn.textContent = "🖨 Stampa fase"; }
  }

  // etichetta disegnata come immagine (300 dpi, bianco e nero) larga quanto il rotolo; altezza sul contenuto
  function disegna(d, f, dopo, p, larghezza, altezzaFissa) {
    const DPMM = 300 / 25.4, PAD = 26, W = larghezza - PAD * 2, F = "Arial, Helvetica, sans-serif";
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const righe = (testo, font) => {
      ctx.font = font;
      const out = []; let r = "";
      for (const w of String(testo || "").split(/\s+/).filter(Boolean)) {
        const prova = r ? r + " " + w : w;
        if (ctx.measureText(prova).width <= W || !r) r = prova; else { out.push(r); r = w; }
      }
      if (r) out.push(r);
      return out;
    };
    const fai = (scrivi) => {
      let y = PAD;
      const testo = (t, font, lh, x = PAD) => { ctx.font = font; if (scrivi) ctx.fillText(t, x, y); y += lh; };
      for (const r of righe(d.r.ricette?.nome || "", "bold 46px " + F)) testo(r, "bold 46px " + F, 52);
      y += 4;
      const fase = (f.nome_fase + (f.temperatura ? ` · ${f.temperatura} °C` : "")).toUpperCase();
      for (const r of righe(fase, "bold 34px " + F)) testo(r, "bold 34px " + F, 40);
      if (scrivi) ctx.fillRect(PAD, y + 4, W, 5);
      y += 20;
      const coppia = (a, b) => {
        if (scrivi) { ctx.font = "31px " + F; ctx.fillText(a, PAD, y); ctx.font = "bold 31px " + F; ctx.fillText(b, PAD + W - ctx.measureText(b).width, y); }
        y += 42;
      };
      coppia("Lotto", d.r.codice_lotto);
      // a chi va la lavorazione: l'evento (o piu' eventi insieme, es. "Battesimo di X + Matrimonio di Y") o la destinazione
      const per = [d.r.evento_titolo, d.r.destinazione].map((t) => String(t || "").trim()).filter(Boolean).filter((t, i, a) => a.indexOf(t) === i).join(" · ");
      if (per) { testo("PER", "bold 24px " + F, 30); for (const r of righe(per, "bold 36px " + F)) testo(r, "bold 36px " + F, 42); y += 8; }
      coppia("Inizio", leggibile(p.ini));
      y += 6;
      if (p.fine) {
        const top = y;
        y += 14;
        testo("PRONTO", "bold 30px " + F, 38, PAD + 18);
        for (const r of righe(leggibile(p.fine), "bold 58px " + F)) testo(r, "bold 58px " + F, 64, PAD + 18);
        testo("dopo " + durataTesto(p.min), "30px " + F, 38, PAD + 18);
        y += 8;
        if (scrivi) { ctx.lineWidth = 5; ctx.strokeRect(PAD + 2, top, W - 4, y - top); }
        y += 16;
      }
      if (dopo) {
        const poi = righe("Poi: " + dopo.nome_fase, "bold 32px " + F);
        poi.forEach((r) => testo(r, "bold 32px " + F, 40));
      }
      return y + PAD;
    };
    c.width = larghezza; c.height = 2000;
    ctx.textBaseline = "top";
    const hNec = fai(false);
    let mm = Math.max(25, Math.ceil(hNec / DPMM));
    const h = altezzaFissa || Math.round(mm * DPMM);
    if (altezzaFissa && hNec > altezzaFissa) return null;
    c.height = h;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, larghezza, h);
    ctx.fillStyle = "#000"; ctx.strokeStyle = "#000"; ctx.textBaseline = "top";
    fai(true);
    return { url: c.toDataURL("image/png"), mm };
  }

  // senza etichettatrice configurata: anteprima e stampa dal telefono
  async function anteprima(d, f, dopo, p) {
    const etichetta = `<div class="et">
      <div class="et-cosa">${esc(d.r.ricette?.nome || "")}</div>
      <div class="et-fase">${esc(f.nome_fase)}${f.temperatura ? ` · ${esc(f.temperatura)} °C` : ""}</div>
      <div class="et-riga"><span>Lotto</span><b>${esc(d.r.codice_lotto)}</b></div>
      <div class="et-riga"><span>Inizio</span><b>${esc(leggibile(p.ini))}</b></div>
      ${p.fine ? `<div class="et-pronto"><span>PRONTO</span><b>${esc(leggibile(p.fine))}</b><small>dopo ${esc(durataTesto(p.min))}</small></div>` : ""}
      ${dopo ? `<div class="et-poi">Poi: <b>${esc(dopo.nome_fase)}</b></div>` : ""}</div>`;
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
    const { apriAnteprimaStampa } = await import("./anteprima-stampa.js?v=" + (window.APP_V || ""));
    apriAnteprimaStampa({ titolo: "Stampa fase", pagina: "62mm 60mm", corpo: etichetta, css });
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
  .sf-ing{list-style:none;margin:0 0 10px;padding:8px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;font-size:17px;}
  .sf-ing li{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid #ffedd5;}
  .sf-ing li:last-child{border-bottom:0;}
  .sf-ing b{white-space:nowrap;}
  .sf-btn{width:100%;border:0;border-radius:11px;padding:11px;background:#0E5A7A;color:#fff;font-weight:800;font-size:14px;cursor:pointer;margin-top:8px;}`;
}
