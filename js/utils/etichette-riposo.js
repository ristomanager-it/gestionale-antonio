// js/utils/etichette-riposo.js
// 🏷 Etichette dei RIPOSI dentro la lavorazione. Per ogni fase di riposo (biga, lievitazione, marinatura,
// raffreddamento, abbattimento...) si stampa l'etichetta da mettere sul contenitore: cos'e', lotto, quando e'
// iniziato il riposo, A CHE ORA fare la fase dopo e quale. L'inizio e' la firma della fase (o adesso).
const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const perInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const leggibile = (d) => d.toLocaleString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const durataTesto = (min) => { const h = Math.floor(min / 60), m = min % 60; return h && m ? `${h} h ${m}′` : h ? `${h} h` : `${m}′`; };

export function montaRiposi(box, { lotto }) {
  if (!box) return;
  box.innerHTML = `<style>${stile()}</style><div class="rp"><div class="rp-tit">🖨 Stampa fase</div>
    <div class="rp-lista"></div></div>`;
  const elLista = box.querySelector(".rp-lista");
  let dati = null;

  async function carica() {
    const l = lotto?.();
    if (!l?.lotto_uuid) { box.style.display = "none"; return; }
    const { data: r } = await sb().from("produzione_lotti").select("id, codice_lotto, ricetta_id, ricette(nome)").eq("lotto_uuid", l.lotto_uuid).maybeSingle();
    if (!r) { box.style.display = "none"; return; }
    const [{ data: fasi }, { data: firme }] = await Promise.all([
      sb().from("ricette_preparazione_fasi").select("id, ordine, nome_fase, durata_min, temperatura, riposo").eq("ricetta_id", r.ricetta_id).order("ordine"),
      sb().from("produzione_log_haccp").select("fase_id, fase_ordine, firmato_il").eq("lotto_id", l.lotto_uuid),
    ]);
    const F = fasi || [];
    const riposi = F.filter((f) => f.riposo && F.some((n) => n.ordine > f.ordine));
    if (!riposi.length) { box.style.display = "none"; return; }
    box.style.display = "";
    const firmaDi = (f) => (firme || []).find((x) => x.fase_id === f.id || x.fase_ordine === f.ordine)?.firmato_il || null;
    dati = { r, F, riposi };
    elLista.innerHTML = riposi.map((f, i) => {
      const dopo = F.find((n) => n.ordine > f.ordine);
      // il riposo comincia quando si firma la fase di riposo, oppure finita la fase prima
      const prima = [...F].reverse().find((n) => n.ordine < f.ordine);
      const inizio = firmaDi(f) || (prima && firmaDi(prima)) || new Date().toISOString();
      return `<div class="rp-riga" data-i="${i}">
        <div><b>${esc(f.ordine)}. ${esc(f.nome_fase)}</b>${f.temperatura ? ` · ${esc(f.temperatura)} °C` : ""}</div>
        <div class="rp-r3">poi: ${esc(dopo?.nome_fase || "—")}</div>
        <div class="rp-g">
          <label>Inizio<input type="datetime-local" class="rp-in" data-k="inizio" value="${perInput(new Date(inizio))}"></label>
          <label>Ore<input class="rp-in" inputmode="decimal" data-k="ore" value="${f.durata_min ? String(Math.round(f.durata_min / 6) / 10).replace(".", ",") : ""}" placeholder="?"></label>
        </div>
        <div class="rp-pronto" data-k="pronto"></div>
        ${!f.durata_min ? `<label class="rp-ck"><input type="checkbox" data-k="salva" checked> salva questa durata nella ricetta</label>` : ""}
        <button type="button" class="rp-pri" data-stampa="${i}">🏷 Stampa etichetta</button>
      </div>`;
    }).join("");
    elLista.querySelectorAll(".rp-riga").forEach((el) => {
      const aggiorna = () => {
        const p = calcola(el);
        el.querySelector('[data-k="pronto"]').innerHTML = p ? `Fase dopo: <b>${esc(leggibile(p.fine))}</b> (dopo ${esc(durataTesto(p.min))})` : `<span style="color:#b45309">Scrivi quante ore dura il riposo</span>`;
      };
      el.querySelectorAll("input").forEach((x) => x.addEventListener("input", aggiorna));
      aggiorna();
    });
    elLista.querySelectorAll("[data-stampa]").forEach((b) => b.addEventListener("click", () => stampa(Number(b.dataset.stampa))));
  }

  function calcola(el) {
    const ini = new Date(el.querySelector('[data-k="inizio"]').value);
    const ore = parseFloat(String(el.querySelector('[data-k="ore"]').value).replace(",", "."));
    if (!Number.isFinite(ore) || ore <= 0 || isNaN(ini)) return null;
    const min = Math.round(ore * 60);
    return { ini, min, fine: new Date(ini.getTime() + min * 60000) };
  }

  async function stampa(i) {
    const el = elLista.querySelector(`.rp-riga[data-i="${i}"]`);
    const p = calcola(el);
    if (!p) { alert("Scrivi quante ore dura il riposo."); return; }
    const f = dati.riposi[i];
    const dopo = dati.F.find((n) => n.ordine > f.ordine);
    if (el.querySelector('[data-k="salva"]')?.checked) await sb().from("ricette_preparazione_fasi").update({ durata_min: p.min }).eq("id", f.id);
    const etichetta = `<div class="et">
      <div class="et-cosa">${esc(dati.r.ricette?.nome || "")}</div>
      <div class="et-fase">${esc(f.nome_fase)}${f.temperatura ? ` · ${esc(f.temperatura)} °C` : ""}</div>
      <div class="et-riga"><span>Lotto</span><b>${esc(dati.r.codice_lotto)}</b></div>
      <div class="et-riga"><span>Inizio</span><b>${esc(leggibile(p.ini))}</b></div>
      <div class="et-pronto"><span>PRONTO</span><b>${esc(leggibile(p.fine))}</b><small>dopo ${esc(durataTesto(p.min))}</small></div>
      <div class="et-poi">Poi: <b>${esc(dopo?.nome_fase || "—")}</b></div></div>`;
    const { apriAnteprimaStampa } = await import("./anteprima-stampa.js");
    apriAnteprimaStampa({ titolo: "Etichetta riposo", pagina: "100mm 60mm", corpo: etichetta, css: `
      .et{width:100mm;height:60mm;box-sizing:border-box;padding:4mm 5mm;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;gap:1.2mm;overflow:hidden;}
      .et-cosa{font-size:13pt;font-weight:800;line-height:1.1;}
      .et-fase{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:.4mm solid #000;padding-bottom:1mm;}
      .et-riga{display:flex;justify-content:space-between;font-size:9.5pt;}
      .et-riga span{color:#333;}
      .et-pronto{display:flex;align-items:baseline;gap:2mm;border:.5mm solid #000;border-radius:1.5mm;padding:1.2mm 2mm;margin-top:auto;}
      .et-pronto span{font-size:9pt;font-weight:800;} .et-pronto b{font-size:14pt;} .et-pronto small{font-size:8pt;margin-left:auto;}
      .et-poi{font-size:9.5pt;}` });
  }

  carica();
  // la lavorazione puo' aprirsi dopo (prima firma): finche' non c'e' si ricontrolla ogni 5 secondi
  const attesa = setInterval(() => {
    if (!document.body.contains(box)) { clearInterval(attesa); return; }
    if (!dati && lotto?.()?.lotto_uuid) carica();
    if (dati) clearInterval(attesa);
  }, 5000);
  box.querySelector(".rp-tit").addEventListener("click", carica);
}

function stile() {
  return `
  .rp{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:12px 0;}
  .rp-tit{font-weight:800;font-size:16px;cursor:pointer;}
  .rp-sub{font-size:13px;color:#64748b;margin:3px 0 6px;}
  .rp-riga{border-top:1px solid #f1f5f9;padding:10px 0;font-size:14px;}
  .rp-r3{font-size:12.5px;color:#64748b;margin-top:2px;}
  .rp-g{display:grid;grid-template-columns:1.8fr .8fr;gap:8px;margin-top:6px;}
  .rp-g label{font-size:12px;font-weight:700;color:#64748b;}
  .rp-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:9px;padding:8px;font-size:15px;font-family:inherit;background:#fff;color:#0f172a;margin-top:2px;}
  .rp-pronto{font-size:13.5px;margin-top:6px;}
  .rp-ck{display:flex;gap:6px;align-items:center;font-size:12.5px;color:#475569;margin-top:6px;}
  .rp-pri{width:100%;border:0;border-radius:11px;padding:11px;background:#0E5A7A;color:#fff;font-weight:800;font-size:14px;cursor:pointer;margin-top:8px;}`;
}
