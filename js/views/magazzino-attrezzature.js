// js/views/magazzino-attrezzature.js
// MAGAZZINO ATTREZZATURE: stoviglie, bicchieri, pentolame, sedie, tavoli, decorazioni...
// Una "scatola" ha un codice (SC-0001), un articolo e i pezzi che contiene. L'etichetta (foto, nome, misura, pezzi, QR)
// si stampa dal telefono sulla Brother QL da 62 mm; il QR apre la scheda della scatola.
// Rotte: #/magazzino-attrezzature (elenco) e #/scatola-attrezzature?c=SC-0001 (scheda).
import { comprimiImmagine } from "../utils/immagini.js";

const sb = () => window.supabaseClient || window.supabase;

const CATEGORIE = [
  ["stoviglie", "🍽 Stoviglie"], ["bicchieri", "🥂 Bicchieri"], ["pentolame", "🍳 Pentolame"], ["posate", "🍴 Posate"],
  ["tessili", "🧺 Tessili"], ["arredi", "🪑 Arredi"], ["decorazioni", "💐 Decorazioni"], ["attrezzatura", "🔧 Attrezzatura"], ["altro", "📦 Altro"],
];
const STATI = {
  in_magazzino: ["In magazzino", "#166534", "#dcfce7"],
  fuori: ["Fuori", "#9a3412", "#ffedd5"],
  da_lavare: ["Da lavare", "#1d4ed8", "#dbeafe"],
};
const TIPI_MOV = {
  creazione: "Creata", conta: "Conta", carico: "Aggiunti", uscita: "Uscita", rientro: "Rientro", rotto: "Rotti",
  perso: "Mancanti", spostamento: "Spostata", lavaggio: "Lavata e riposta",
};
const RUOLI_SCRIVE = ["admin", "superadmin", "manager", "manager_cucina", "manager_sala", "magazziniere"];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nomeCat = (k) => (CATEGORIE.find((c) => c[0] === k) || CATEGORIE[CATEGORIE.length - 1])[1];

function puoScrivere() {
  const s = window.state || {};
  if (s.isSuperadmin === true) return true;
  const raw = String(s.viewAs || s.ruoloRaw || s.ruolo || "").toLowerCase();
  const norm = String(window.normalizeRuolo ? window.normalizeRuolo(raw) : raw);
  return RUOLI_SCRIVE.includes(raw) || RUOLI_SCRIVE.includes(norm);
}

// importi in euro: solo admin, manager e superadmin. Il magazziniere vede scatole e pezzi, non i soldi.
function vedeValori() {
  const s = window.state || {};
  if (s.isSuperadmin === true && !s.viewAs) return true;
  const raw = String(s.viewAs || s.ruoloRaw || s.ruolo || "").toLowerCase();
  const norm = String(window.normalizeRuolo ? window.normalizeRuolo(raw) : raw);
  return ["admin", "superadmin"].includes(raw) || ["admin", "superadmin"].includes(norm) || raw.startsWith("manager") || norm.startsWith("manager");
}

function urlScheda(codice) {
  const base = (location.origin && location.origin.startsWith("http")) ? location.origin : "https://app.ristoflow-ai.com";
  return base + "/#/scatola-attrezzature?c=" + encodeURIComponent(codice);
}

function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 16px;border-radius:12px;font-size:14px;font-weight:700;z-index:99999;max-width:86vw;text-align:center;";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

const CSS = `
<style>
.at-wrap{max-width:760px;margin:0 auto;padding:14px 14px 90px;font-family:inherit;}
.at-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
.at-head h2{margin:0;font-size:21px;}
.at-btn{border:0;border-radius:12px;padding:12px 16px;font-size:15px;font-weight:800;cursor:pointer;background:#0E5A7A;color:#fff;}
.at-btn.sec{background:#f1f5f9;color:#0f172a;border:1.5px solid #cbd5e1;}
.at-btn.ok{background:#16a34a;}
.at-btn.bad{background:#dc2626;}
.at-btn:disabled{opacity:.55;}
.at-in{width:100%;box-sizing:border-box;font-size:16px;padding:11px 12px;border:1.5px solid #cbd5e1;border-radius:12px;background:#fff;}
.at-lbl{display:block;font-size:12.5px;font-weight:800;color:#334155;margin:12px 0 4px;}
.at-chips{display:flex;gap:7px;overflow-x:auto;padding:10px 0 4px;-webkit-overflow-scrolling:touch;}
.at-chip{flex:0 0 auto;border:1.5px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer;}
.at-chip.on{background:#0E5A7A;border-color:#0E5A7A;color:#fff;}
.at-riep{font-size:13px;color:#64748b;margin:8px 2px 4px;}
.at-grp{margin-top:14px;}
.at-grp-h{font-size:12.5px;font-weight:800;color:#475569;margin:0 2px 6px;}
.at-card{display:flex;gap:12px;align-items:center;background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:10px;margin-bottom:8px;cursor:pointer;}
.at-th{flex:0 0 58px;width:58px;height:58px;border-radius:10px;background:#f1f5f9;object-fit:cover;display:flex;align-items:center;justify-content:center;font-size:24px;}
.at-nm{font-weight:800;font-size:15.5px;line-height:1.25;}
.at-sub{font-size:12.5px;color:#64748b;margin-top:2px;}
.at-qty{margin-left:auto;text-align:right;flex:0 0 auto;}
.at-qty b{display:block;font-size:22px;line-height:1;}
.at-qty span{font-size:11.5px;color:#64748b;}
.at-badge{display:inline-block;border-radius:999px;padding:2px 8px;font-size:11.5px;font-weight:800;margin-left:6px;}
.at-sheet{position:fixed;inset:0;background:#fff;z-index:9000;overflow:auto;padding:14px 16px 40px;}
.at-sheet h3{margin:0;font-size:19px;}
.at-foto{display:flex;align-items:center;justify-content:center;gap:8px;border:2px dashed #94a3b8;border-radius:16px;padding:22px 10px;font-weight:800;color:#0E5A7A;cursor:pointer;background:#f8fafc;text-align:center;}
.at-prev{width:100%;max-height:280px;object-fit:contain;border-radius:14px;background:#f1f5f9;margin-top:10px;display:block;}
.at-tony{font-size:13px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px;margin-top:8px;}
.at-step{display:flex;align-items:center;gap:10px;}
.at-step button{width:46px;height:46px;border-radius:50%;border:1.5px solid #cbd5e1;background:#fff;font-size:24px;font-weight:800;cursor:pointer;}
.at-step input{width:90px;text-align:center;font-size:24px;font-weight:800;}
.at-eti{border:1px solid #cbd5e1;border-radius:6px;max-width:100%;height:auto;display:block;margin:8px auto;background:#fff;}
.at-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
.at-row .at-btn{flex:1 1 140px;}
.at-hist{font-size:13px;border-top:1px solid #e2e8f0;padding:8px 2px;display:flex;justify-content:space-between;gap:10px;}
.at-tipi{display:flex;gap:8px;margin:0 0 12px;}
.at-tipo{flex:1;border:2px solid #cbd5e1;background:#fff;border-radius:14px;padding:10px 6px;cursor:pointer;text-align:center;color:#0f172a;}
.at-tipo b{display:block;font-size:14px;}
.at-tipo span{display:block;font-size:11px;color:#64748b;margin-top:2px;line-height:1.25;}
.at-tipo.on{border-color:#0E5A7A;background:#ecfeff;}
.at-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9500;display:flex;align-items:flex-end;justify-content:center;}
.at-ov > div{background:#fff;width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:18px 16px 26px;}
</style>`;

/* ───────────────── ROTTE ───────────────── */
export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) {
    container.innerHTML = `<div class="at-wrap">${CSS}<p style="padding:30px;text-align:center;color:#64748b;">Scegli prima un'azienda.</p></div>`;
    return;
  }
  const h = String(location.hash || "");
  const q = new URLSearchParams(h.includes("?") ? h.split("?")[1] : "");
  const codice = q.get("c");
  if (h.startsWith("#/scatola-attrezzature") && codice) return renderScheda(container, aziendaId, codice);
  return renderLista(container, aziendaId);
}

/* ───────────────── ELENCO ───────────────── */
async function renderLista(container, aziendaId) {
  const scrive = puoScrivere();
  const stato = { q: "", cat: "", righe: [], articoli: [], sfusi: [], selezione: false, sel: new Set() };
  container.innerHTML = `<div class="at-wrap">${CSS}
    <div class="at-head"><h2>📦 Attrezzature</h2>${scrive ? `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;"><button class="at-btn" id="at-qta">📤 Esce</button><button class="at-btn sec" id="at-sel">☑ Seleziona</button><button class="at-btn sec" id="at-nuova">➕ Nuova</button></div>` : ""}</div>
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin:0 0 10px;"><a href="/docs/guida-magazzino-attrezzature.pdf" target="_blank" rel="noopener" style="font-size:14px;font-weight:800;color:#0E5A7A;text-decoration:none;">📘 Come funziona (PDF)</a><button type="button" id="at-fogli" style="border:0;background:none;padding:0;font-size:14px;font-weight:800;color:#0E5A7A;cursor:pointer;">📄 Bolle d'uscita</button></div>
    <input class="at-in" id="at-cerca" type="search" placeholder="🔍 Cerca: bicchiere, SC-0012, scaffale…" autocomplete="off">
    <div class="at-chips" id="at-chips"></div>
    <div id="at-lavare"></div>
    <div id="at-valore"></div>
    <div class="at-riep" id="at-riep"></div>
    <div id="at-fuori"></div>
    <div id="at-lista"><p style="padding:24px;text-align:center;color:#64748b;">Carico…</p></div></div>`;

  const carica = async () => {
    const { data, error } = await sb().from("attr_scatole")
      .select("id,codice,quantita,ubicazione,stato,sede_id,destinazione_tipo,destinazione,destinazione_data,evento_id,matricola,data_acquisto,attr_articoli(id,nome,categoria,misura,materiale,foto_url,costo_sostituzione,tracciamento)")
      .eq("azienda_id", aziendaId).eq("attiva", true).order("created_at", { ascending: false }).limit(1500);
    if (error) {
      container.querySelector("#at-lista").innerHTML = `<p style="padding:24px;text-align:center;color:#b91c1c;">Non riesco a caricare il magazzino: ${esc(error.message)}</p>`;
      return;
    }
    stato.righe = (data || []).filter((r) => r.attr_articoli);
    const mappa = new Map();
    stato.righe.forEach((r) => mappa.set(r.attr_articoli.id, r.attr_articoli));
    stato.articoli = [...mappa.values()];
    // pezzi usciti senza la scatola intera (sfusi): fuori, oppure rientrati e da lavare
    try {
      const rs = await sb().from("attr_sfusi")
        .select("id,articolo_id,scatola_id,pezzi,rientrati,persi,stato,destinazione,destinazione_tipo,destinazione_data,attr_articoli(id,nome,misura,categoria,costo_sostituzione)")
        .eq("azienda_id", aziendaId).in("stato", ["fuori", "da_lavare"]).limit(1500);
      stato.sfusi = ((rs && rs.data) || []).filter((s) => s.attr_articoli);
    } catch (e) { stato.sfusi = []; }
    disegna();
  };

  const disegna = () => {
    const nFuori = stato.righe.filter((r) => r.stato === "fuori" && !isFissa(r)).length + stato.sfusi.filter((s) => s.stato === "fuori").length;
    const nFisse = stato.righe.filter(isFissa).length;
    const cats = [["", "Tutto"], ...(nFuori ? [["__fuori", "📤 Fuori (" + nFuori + ")"]] : []), ...(nFisse ? [["__fisse", "🏭 Fisse (" + nFisse + ")"]] : []), ...CATEGORIE.filter((c) => stato.righe.some((r) => !isFissa(r) && r.attr_articoli.categoria === c[0]))];
    container.querySelector("#at-chips").innerHTML = cats.map((c) => `<button type="button" class="at-chip${stato.cat === c[0] ? " on" : ""}" data-cat="${esc(c[0])}">${esc(c[1])}</button>`).join("");
    container.querySelectorAll(".at-chip").forEach((b) => (b.onclick = () => { stato.cat = b.dataset.cat; disegna(); }));

    const q = stato.q.trim().toLowerCase();
    const filtrate = stato.righe.filter((r) => {
      const a = r.attr_articoli;
      if (stato.cat === "__fisse") { if (!isFissa(r)) return false; }
      else if (isFissa(r) && !q) return false;   // le fisse hanno il loro filtro; si trovano anche cercandole
      else if (stato.cat === "__fuori") { if (r.stato !== "fuori") return false; } else if (stato.cat && a.categoria !== stato.cat) return false;
      if (!q) return true;
      return [a.nome, a.misura, a.materiale, r.codice, r.ubicazione, nomeCat(a.categoria)].join(" ").toLowerCase().includes(q);
    });

    const gruppi = new Map();
    filtrate.forEach((r) => { const k = r.attr_articoli.id; if (!gruppi.has(k)) gruppi.set(k, { a: r.attr_articoli, scatole: [] }); gruppi.get(k).scatole.push(r); });
    const ordinati = [...gruppi.values()].sort((x, y) => x.a.nome.localeCompare(y.a.nome, "it"));
    const tot = filtrate.reduce((s, r) => s + (Number(r.quantita) || 0), 0);
    const valFiltrate = filtrate.reduce((s, r) => s + valRiga(r), 0);
    container.querySelector("#at-riep").textContent = filtrate.length
      ? `${ordinati.length} articoli · ${filtrate.length} scatole · ${tot.toLocaleString("it-IT")} pezzi${valFiltrate ? " · " + euro(valFiltrate) : ""}`
      : "";
    riquadroValore(); riquadroLavare(); riquadroFuori(filtrate);

    if (!ordinati.length) {
      container.querySelector("#at-lista").innerHTML = stato.righe.length
        ? `<p style="padding:24px;text-align:center;color:#64748b;">Niente con questa ricerca.</p>`
        : `<div style="padding:30px 10px;text-align:center;color:#475569;"><div style="font-size:42px;">📦</div><p style="font-weight:800;margin:8px 0 4px;">Il magazzino è vuoto</p><p style="margin:0;font-size:14px;">${scrive ? "Tocca “Nuova scatola”, scatta una foto e Tony ti propone il resto." : "Quando il magazziniere inserisce le scatole le trovi qui."}</p></div>`;
      return;
    }
    container.querySelector("#at-lista").innerHTML = ordinati.map((g) => {
      const pezzi = g.scatole.reduce((s, r) => s + (Number(r.quantita) || 0), 0);
      const fuoriPz = g.scatole.filter((r) => r.stato === "fuori").reduce((s, r) => s + (Number(r.quantita) || 0), 0);
      const valG = g.scatole.reduce((s, r) => s + valRiga(r), 0);
      const sfG = stato.sfusi.filter((s) => s.articolo_id === g.a.id && s.stato === "fuori").reduce((x, s) => x + s.pezzi, 0);
      return `<div class="at-grp"><div class="at-grp-h">${esc(g.a.nome)}${g.a.misura ? " · " + esc(g.a.misura) : ""} — ${g.a.tracciamento === "fisso" ? (g.scatole.length === 1 ? "attrezzatura fissa" : g.scatole.length + " attrezzature fisse") : `${pezzi.toLocaleString("it-IT")} pezzi in ${g.scatole.length} ${g.scatole.length === 1 ? "scatola" : "scatole"}`}${fuoriPz ? ` · ${(pezzi - fuoriPz).toLocaleString("it-IT")} in magazzino, ${fuoriPz.toLocaleString("it-IT")} fuori` : ""}${valG ? ` · ${euro(valG)}` : ""}${sfG ? ` · ${sfG} sfusi fuori` : ""}</div>
        ${g.scatole.map((r) => {
          const st = STATI[r.stato] || STATI.in_magazzino;
          const a = r.attr_articoli;
          return `<div class="at-card" data-c="${esc(r.codice)}">
            ${stato.selezione ? `<input type="checkbox" class="at-ck" ${stato.sel.has(r.id) ? "checked" : ""} ${r.stato !== "in_magazzino" || isFissa(r) ? "disabled" : ""} aria-label="Seleziona" style="width:24px;height:24px;flex:0 0 auto;">` : ""}
            ${a.foto_url ? `<img class="at-th" src="${esc(a.foto_url)}" alt="" loading="lazy">` : `<div class="at-th">${esc(nomeCat(a.categoria).split(" ")[0])}</div>`}
            <div style="min-width:0;"><div class="at-nm">${esc(a.nome)}</div>
              <div class="at-sub">${esc(r.codice)}${r.ubicazione ? " · 📍 " + esc(r.ubicazione) : ""}${r.stato !== "in_magazzino" ? `<span class="at-badge" style="color:${st[1]};background:${st[2]};">${r.stato === "fuori" && r.destinazione ? "Fuori · " + esc(r.destinazione) : st[0]}</span>` : ""}</div></div>
            <div class="at-qty">${isFissa(r) ? `<b>🏭</b><span>${esc(r.matricola || "fissa")}</span>` : `<b>${Number(r.quantita) || 0}</b><span>pezzi</span>`}</div></div>`;
        }).join("")}</div>`;
    }).join("");
    container.querySelectorAll(".at-card").forEach((el) => (el.onclick = () => {
      if (stato.selezione) {
        const r = stato.righe.find((x) => x.codice === el.dataset.c);
        if (!r || r.stato !== "in_magazzino" || isFissa(r)) { toast(r && isFissa(r) ? "Le attrezzature fisse non escono" : "Solo le scatole in magazzino possono uscire"); return; }
        if (stato.sel.has(r.id)) stato.sel.delete(r.id); else stato.sel.add(r.id);
        const ck = el.querySelector(".at-ck"); if (ck) ck.checked = stato.sel.has(r.id);
        barra(); return;
      }
      location.hash = "#/scatola-attrezzature?c=" + encodeURIComponent(el.dataset.c);
    }));
    riquadroFuori(filtrate);
  };

  // valore delle attrezzature (costo di sostituzione x pezzi), sempre calcolato sui dati correnti
  const riquadroValore = () => {
    const box = container.querySelector("#at-valore");
    if (!box) return;
    if (!vedeValori()) { box.innerHTML = ""; return; }
    const per = { in_magazzino: 0, fuori: 0, da_lavare: 0 }; let fisse = 0; const senza = new Set();
    stato.righe.forEach((r) => {
      if (isFissa(r)) fisse += valRiga(r); else per[r.stato] = (per[r.stato] || 0) + valRiga(r);
      if (!Number(r.attr_articoli.costo_sostituzione)) senza.add(r.attr_articoli.id);
    });
    // i pezzi usciti sfusi non stanno in nessuna scatola: contano come fuori (o da lavare, se sono rientrati)
    stato.sfusi.forEach((s) => { const c = Number(s.attr_articoli.costo_sostituzione) || 0; if (s.stato === "fuori") per.fuori += s.pezzi * c; else per.da_lavare += s.rientrati * c; });
    const tot = per.in_magazzino + per.fuori + per.da_lavare;
    if (!stato.righe.length || (!tot && !fisse && !senza.size)) { box.innerHTML = ""; return; }
    box.innerHTML = `<div style="background:#ecfeff;border:1.5px solid #a5f3fc;border-radius:12px;padding:10px 12px;margin:8px 0;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;"><span style="font-size:13px;font-weight:800;color:#155e75;">💶 Valore attrezzature</span><span style="font-size:20px;font-weight:900;">${euro(tot)}</span></div>
      <div style="font-size:12.5px;color:#475569;margin-top:2px;">in magazzino ${euro(per.in_magazzino)} · fuori ${euro(per.fuori)}${per.da_lavare ? " · da lavare " + euro(per.da_lavare) : ""}${fisse ? " · 🏭 fisse " + euro(fisse) + " (a parte)" : ""}</div>
      ${senza.size ? `<div style="font-size:12px;color:#b45309;margin-top:4px;">⚠ ${senza.size} ${senza.size === 1 ? "articolo senza costo" : "articoli senza costo"}: il valore è parziale (✏️ Modifica per inserirlo)</div>` : ""}</div>`;
  };

  // pezzi sfusi rientrati: vanno lavati e rimessi nella scatola da cui erano usciti
  const riquadroLavare = () => {
    const box = container.querySelector("#at-lavare");
    if (!box) return;
    const lav = stato.sfusi.filter((s) => s.stato === "da_lavare" && s.rientrati > 0);
    if (!lav.length) { box.innerHTML = ""; return; }
    const gr = new Map();
    lav.forEach((s) => { if (!gr.has(s.articolo_id)) gr.set(s.articolo_id, { a: s.attr_articoli, pezzi: 0, ids: [] }); const g = gr.get(s.articolo_id); g.pezzi += s.rientrati; g.ids.push(s.id); });
    const ord = [...gr.values()].sort((x, y) => x.a.nome.localeCompare(y.a.nome, "it"));
    box.innerHTML = ord.map((g, i) => `<div style="display:flex;align-items:center;gap:10px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:10px 12px;margin:8px 0;"><div style="flex:1;min-width:0;font-size:14px;font-weight:800;">🧼 ${esc(g.a.nome)}${g.a.misura ? " · " + esc(g.a.misura) : ""}<div style="font-size:12.5px;font-weight:600;color:#1d4ed8;">${g.pezzi} pezzi sfusi da lavare</div></div>${scrive ? `<button class="at-btn ok" data-lavati="${i}" style="padding:9px 12px;font-size:13px;">Lavati e riposti</button>` : ""}</div>`).join("");
    box.querySelectorAll("[data-lavati]").forEach((b) => (b.onclick = async () => {
      const g = ord[+b.dataset.lavati];
      const { error } = await sb().rpc("attr_riponi_sfusi", { p_sfusi: g.ids });
      if (error) { alert("Non riesco a salvare: " + error.message); return; }
      toast(g.pezzi + " pezzi rimessi nelle scatole"); await carica();
    }));
  };

  // rientro di una destinazione: si scrive quanti pezzi di ogni articolo sono tornati, la differenza e' mancante
  const rientroGruppo = async (g) => {
    if (g.nome === "Senza destinazione") {   // vecchie uscite senza destinazione: rientrano tutte le scatole
      if (!confirm("Rientrano tutte le " + g.ids.length + " scatole?")) return;
      const { error } = await sb().rpc("attr_rientro", { p_scatole: g.ids });
      if (error) { alert("Non riesco a salvare: " + error.message); return; }
      toast("Rientrate: ora da lavare"); await carica(); return;
    }
    const mappa = new Map();
    g.righe.forEach((r) => { const k = r.attr_articoli.id; if (!mappa.has(k)) mappa.set(k, { a: r.attr_articoli, usciti: 0 }); mappa.get(k).usciti += Number(r.quantita) || 0; });
    g.sf.forEach((s) => { if (!mappa.has(s.articolo_id)) mappa.set(s.articolo_id, { a: s.attr_articoli, usciti: 0 }); mappa.get(s.articolo_id).usciti += s.pezzi; });
    const voci = [...mappa.values()];
    const righe = await chiediRientro(g.nome, voci);
    if (!righe) return;
    const { data, error } = await sb().rpc("attr_rientro_quantita", { p_azienda: aziendaId, p_destinazione: g.nome, p_data: g.data || null, p_righe: righe });
    if (error) { alert("Non riesco a salvare: " + error.message); return; }
    const manca = data && data.mancanti ? data.mancanti : 0;
    const perdita = vedeValori() ? voci.reduce((s, v) => { const r = righe.find((x) => x.articolo_id === v.a.id); return s + (v.usciti - (r ? r.rientrati : v.usciti)) * (Number(v.a.costo_sostituzione) || 0); }, 0) : 0;
    toast(manca ? `Rientrato. Mancano ${manca} pezzi${perdita ? " (" + euro(perdita) + ")" : ""}` : "Rientrato: ora da lavare");
    await carica();
  };

  // chi e' fuori, raggruppato per destinazione: scatole intere e pezzi sfusi
  const riquadroFuori = () => {
    const fz = container.querySelector("#at-fuori");
    if (!fz) return;
    if (stato.cat !== "__fuori") { fz.innerHTML = ""; return; }
    const gr = new Map();
    const gruppo = (nome, data, tipo) => {
      const k = (nome || "Senza destinazione") + "|" + (data || "");
      if (!gr.has(k)) gr.set(k, { nome: nome || "Senza destinazione", data, tipo, ids: [], sfusi: 0, valore: 0, righe: [], sf: [] });
      return gr.get(k);
    };
    stato.righe.filter((r) => r.stato === "fuori" && !isFissa(r)).forEach((r) => { const g = gruppo(r.destinazione, r.destinazione_data, r.destinazione_tipo); g.ids.push(r.id); g.righe.push(r); g.valore += valRiga(r); });
    stato.sfusi.filter((s) => s.stato === "fuori").forEach((s) => { const g = gruppo(s.destinazione, s.destinazione_data, s.destinazione_tipo); g.sfusi += s.pezzi; g.sf.push(s); if (vedeValori()) g.valore += s.pezzi * (Number(s.attr_articoli.costo_sostituzione) || 0); });
    const ord = [...gr.values()].sort((x, y) => String(x.data || "9999").localeCompare(String(y.data || "9999")));
    fz.innerHTML = ord.map((g, i) => `<div style="display:flex;align-items:center;gap:10px;background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:10px 12px;margin:8px 0;"><div style="flex:1;min-width:0;font-size:14px;font-weight:800;">${g.tipo === "evento" ? "🎪" : "📍"} ${esc(g.nome)}${g.data ? " · " + dataIt(g.data) : ""}<div style="font-size:12.5px;font-weight:600;color:#9a3412;">${g.ids.length ? `${g.ids.length} ${g.ids.length === 1 ? "scatola" : "scatole"}` : ""}${g.ids.length && g.sfusi ? " + " : ""}${g.sfusi ? `${g.sfusi} pezzi sfusi` : ""} fuori${g.valore ? " · " + euro(g.valore) : ""}</div></div>${scrive ? `<button class="at-btn ok" data-rientro="${i}" style="padding:9px 12px;font-size:13px;">📥 Rientrano</button>` : ""}</div>`).join("");
    fz.querySelectorAll("[data-rientro]").forEach((b) => (b.onclick = () => rientroGruppo(ord[+b.dataset.rientro])));
  };

  // barra in basso quando si scelgono piu' scatole: "Esce" chiede la destinazione una volta sola
  const barra = () => {
    let b = container.querySelector("#at-bar");
    if (!stato.selezione) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("div"); b.id = "at-bar"; b.style.cssText = "position:fixed;left:0;right:0;bottom:70px;z-index:8000;padding:10px 14px;background:#fff;border-top:1.5px solid #cbd5e1;box-shadow:0 -6px 20px rgba(15,23,42,.12);display:flex;gap:10px;align-items:center;"; container.appendChild(b); }
    const scelte = stato.righe.filter((r) => stato.sel.has(r.id));
    const pezzi = scelte.reduce((s, r) => s + (Number(r.quantita) || 0), 0);
    b.innerHTML = `<div style="flex:1;font-weight:800;font-size:14px;">${scelte.length ? scelte.length + (scelte.length === 1 ? " scatola" : " scatole") + " · " + pezzi.toLocaleString("it-IT") + " pezzi" : "Tocca le scatole che escono"}</div><button class="at-btn" id="at-esce" ${scelte.length ? "" : "disabled"}>📤 Esce</button>`;
    b.querySelector("#at-esce").onclick = async () => {
      const usate = [...new Set(stato.righe.map((r) => r.destinazione_tipo !== "evento" && r.destinazione).filter(Boolean))];
      const d = await chiediDestinazione(aziendaId, usate);
      if (!d) return;
      const { data, error } = await sb().rpc("attr_uscita", { p_scatole: scelte.map((r) => r.id), p_tipo: d.tipo, p_destinazione: d.destinazione, p_evento: d.evento || null, p_data: d.data || null, p_ritira: d.ritira || null });
      if (error) { alert("Non riesco a salvare: " + error.message); return; }
      toast((data && data.uscite) + (data && data.uscite === 1 ? " scatola esce" : " scatole escono") + " per: " + d.destinazione);
      stato.selezione = false; stato.sel.clear(); container.querySelector("#at-sel").textContent = "☑ Seleziona"; barra(); await carica();
      if (data && data.foglio_id) mostraFoglio(data.foglio_id);
    };
  };

  container.querySelector("#at-cerca").oninput = (e) => { stato.q = e.target.value; disegna(); };
  container.querySelector("#at-fogli").onclick = () => elencoFogli(aziendaId);
  // "Esce": si scrive quanti pezzi servono di ogni articolo; l'app prende le scatole intere e apre una scatola solo se serve
  if (scrive) container.querySelector("#at-qta").onclick = async () => {
    const disp = new Map();
    stato.righe.forEach((r) => {
      if (isFissa(r) || r.stato !== "in_magazzino" || !(Number(r.quantita) > 0)) return;
      const a = r.attr_articoli;
      if (!disp.has(a.id)) disp.set(a.id, { a, pezzi: 0, scatole: 0 });
      const d = disp.get(a.id); d.pezzi += Number(r.quantita) || 0; d.scatole += 1;
    });
    if (!disp.size) { toast("In magazzino non c'è niente da far uscire"); return; }
    const scelte = await chiediQuantita([...disp.values()]);
    if (!scelte || !scelte.length) return;
    const usate = [...new Set(stato.righe.map((r) => r.destinazione_tipo !== "evento" && r.destinazione).filter(Boolean))];
    const d = await chiediDestinazione(aziendaId, usate);
    if (!d) return;
    const { data, error } = await sb().rpc("attr_uscita_mista", { p_scatole: [], p_righe: scelte, p_tipo: d.tipo, p_destinazione: d.destinazione, p_evento: d.evento || null, p_data: d.data || null, p_ritira: d.ritira || null });
    if (error) { alert("Non riesco a salvare: " + error.message); return; }
    toast((data && data.parziali ? "Esce per: " + d.destinazione + " (aperta " + data.parziali + (data.parziali === 1 ? " scatola)" : " scatole)") : "Esce per: " + d.destinazione));
    await carica();
    if (data && data.foglio_id) mostraFoglio(data.foglio_id);
  };
  if (scrive) container.querySelector("#at-sel").onclick = () => { stato.selezione = !stato.selezione; stato.sel.clear(); container.querySelector("#at-sel").textContent = stato.selezione ? "✕ Annulla" : "☑ Seleziona"; disegna(); barra(); };
  if (scrive) container.querySelector("#at-nuova").onclick = () => apriNuova(aziendaId, stato.articoli, stato.righe, carica);
  // tempo reale: se un altro telefono cambia una scatola o dei pezzi sfusi, qui si aggiorna da solo
  try {
    if (canaleTempoReale) sb().removeChannel(canaleTempoReale);
    let attesa = null;
    const cambiato = () => {
      if (!container.querySelector("#at-lista")) { if (canaleTempoReale) sb().removeChannel(canaleTempoReale); canaleTempoReale = null; return; }
      if (stato.selezione) return;   // non cambio la lista mentre si scelgono le scatole
      clearTimeout(attesa); attesa = setTimeout(carica, 500);
    };
    canaleTempoReale = sb().channel("attr-scatole-" + aziendaId)
      .on("postgres_changes", { event: "*", schema: "public", table: "attr_scatole", filter: "azienda_id=eq." + aziendaId }, cambiato)
      .on("postgres_changes", { event: "*", schema: "public", table: "attr_sfusi", filter: "azienda_id=eq." + aziendaId }, cambiato)
      .subscribe();
  } catch (e) { /* senza tempo reale la lista si aggiorna comunque a ogni apertura */ }
  await carica();
}

/* ───────────────── NUOVA SCATOLA ───────────────── */
function apriNuova(aziendaId, articoli, righe, dopo) {
  const sedi = window.state?.sedi || [];
  const sedeAttiva = window.state?.sedeAttiva?.id || (sedi[0] && sedi[0].id) || "";
  const ubicazioni = [...new Set(righe.map((r) => r.ubicazione).filter(Boolean))].sort((a, b) => a.localeCompare(b, "it"));
  let fotoUrl = "";

  const sheet = document.createElement("div");
  sheet.className = "at-sheet";
  sheet.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><h3>➕ Nuova attrezzatura</h3><button class="at-btn sec" id="n-chiudi" style="padding:8px 14px;">✕</button></div>
    <div class="at-tipi" id="n-tipi">
      <button type="button" class="at-tipo on" data-t="quantita"><b>🍽 A pezzi</b><span>piatti, bicchieri, posate</span></button>
      <button type="button" class="at-tipo" data-t="singolo"><b>📦 Mobile</b><span>un codice per pezzo: piastre, tavoli</span></button>
      <button type="button" class="at-tipo" data-t="fisso"><b>🏭 Fissa</b><span>macchinari e arredi fissi</span></button>
    </div>
    <label class="at-foto" for="n-file">📷 Scatta o scegli la foto</label>
    <input type="file" id="n-file" accept="image/*" capture="environment" hidden>
    <img class="at-prev" id="n-prev" alt="" style="display:none;">
    <div class="at-tony" id="n-tony" style="display:none;"></div>

    <label class="at-lbl" for="n-nome">Cos'è *</label>
    <input class="at-in" id="n-nome" list="n-art" placeholder="es. Calice vino" autocomplete="off">
    <datalist id="n-art">${articoli.map((a) => `<option value="${esc(a.nome)}">${esc(a.misura || "")}</option>`).join("")}</datalist>

    <div style="display:flex;gap:10px;">
      <div style="flex:1;"><label class="at-lbl" for="n-cat">Categoria</label>
        <select class="at-in" id="n-cat">${CATEGORIE.map((c) => `<option value="${c[0]}">${c[1]}</option>`).join("")}</select></div>
      <div style="flex:1;"><label class="at-lbl" for="n-misura">Misura</label>
        <input class="at-in" id="n-misura" placeholder="es. 35 cl, Ø 27 cm" autocomplete="off"></div>
    </div>

    <div id="n-bloc-pezzi"><label class="at-lbl" id="n-pezzi-lbl">Pezzi in ogni confezione</label>
    <div class="at-step"><button type="button" id="n-meno">−</button><input class="at-in" id="n-pezzi" type="number" inputmode="numeric" min="0" value="12"><button type="button" id="n-piu">+</button></div>
    <div id="n-bloc-conf"><label class="at-lbl" for="n-conf">Quante confezioni uguali</label><div class="at-step"><button type="button" id="n-cmeno">−</button><input class="at-in" id="n-conf" type="number" inputmode="numeric" min="1" max="30" value="1"><button type="button" id="n-cpiu">+</button></div></div></div>
    <div id="n-bloc-fissa" style="display:none;"><label class="at-lbl" for="n-matr">Matricola / numero di serie</label><input class="at-in" id="n-matr" placeholder="facoltativo" autocomplete="off"><label class="at-lbl" for="n-acq">Data di acquisto</label><input class="at-in" id="n-acq" type="date"></div>

    <label class="at-lbl" for="n-ubi" id="n-ubi-lbl">Dove la metti</label>
    <input class="at-in" id="n-ubi" list="n-ubil" placeholder="es. Scaffale A2" autocomplete="off">
    <datalist id="n-ubil">${ubicazioni.map((u) => `<option value="${esc(u)}">`).join("")}</datalist>

    <details style="margin-top:12px;"><summary style="font-weight:800;color:#334155;cursor:pointer;">Altri dettagli</summary>
      <label class="at-lbl" for="n-mat">Materiale</label><input class="at-in" id="n-mat" placeholder="vetro, acciaio, legno…" autocomplete="off">
      ${vedeValori() ? `<label class="at-lbl" for="n-costo">Costo di sostituzione (€ a pezzo)</label><input class="at-in" id="n-costo" type="number" inputmode="decimal" step="0.01" placeholder="facoltativo">` : ""}
      ${sedi.length > 1 ? `<label class="at-lbl" for="n-sede">Sede</label><select class="at-in" id="n-sede">${sedi.map((s) => `<option value="${esc(s.id)}"${s.id === sedeAttiva ? " selected" : ""}>${esc(s.nome)}</option>`).join("")}</select>` : ""}
            <!-- il tipo (a pezzi, mobile, fissa) si sceglie in alto -->
    </details>

    <div id="n-err" style="color:#b91c1c;font-weight:700;margin-top:12px;"></div>
    <button class="at-btn" id="n-salva" style="width:100%;margin-top:14px;padding:15px;font-size:16px;">Salva e crea l'etichetta</button>`;
  document.body.appendChild(sheet);
  document.body.style.overflow = "hidden";
  const $ = (id) => sheet.querySelector("#" + id);
  const chiudi = () => { sheet.remove(); document.body.style.overflow = ""; };
  $("n-chiudi").onclick = chiudi;

  $("n-meno").onclick = () => { $("n-pezzi").value = Math.max(0, (parseInt($("n-pezzi").value, 10) || 0) - 1); };
  $("n-piu").onclick = () => { $("n-pezzi").value = (parseInt($("n-pezzi").value, 10) || 0) + 1; };
  $("n-cmeno").onclick = () => { $("n-conf").value = Math.max(1, (parseInt($("n-conf").value, 10) || 1) - 1); };
  $("n-cpiu").onclick = () => { $("n-conf").value = Math.min(30, (parseInt($("n-conf").value, 10) || 1) + 1); };
  // a pezzi (piatti, bicchieri), mobile (un codice per pezzo) o fissa (macchinari): cambia cosa serve scrivere
  let tipo = "quantita";
  const applicaTipo = () => {
    sheet.querySelectorAll(".at-tipo").forEach((b) => b.classList.toggle("on", b.dataset.t === tipo));
    $("n-bloc-pezzi").style.display = tipo === "fisso" ? "none" : "";
    $("n-bloc-conf").style.display = tipo === "quantita" ? "" : "none";
    $("n-bloc-fissa").style.display = tipo === "fisso" ? "" : "none";
    $("n-pezzi-lbl").textContent = tipo === "singolo" ? "Quanti pezzi (ognuno avrà il suo codice)" : "Pezzi in ogni confezione";
    $("n-ubi-lbl").textContent = tipo === "fisso" ? "Dove si trova (locale)" : "Dove la metti";
  };
  sheet.querySelectorAll(".at-tipo").forEach((b) => (b.onclick = () => { tipo = b.dataset.t; applicaTipo(); }));

  // il nome e' gia' nel catalogo: riprende categoria, misura, materiale e foto
  $("n-nome").onchange = () => {
    const a = articoli.find((x) => x.nome.toLowerCase() === $("n-nome").value.trim().toLowerCase());
    if (!a) return;
    $("n-cat").value = a.categoria || "altro";
    if (!$("n-misura").value) $("n-misura").value = a.misura || "";
    if (!$("n-mat").value) $("n-mat").value = a.materiale || "";
    if (!fotoUrl && a.foto_url) { fotoUrl = a.foto_url; $("n-prev").src = fotoUrl; $("n-prev").style.display = "block"; }
  };

  $("n-file").onchange = async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    $("n-err").textContent = "";
    $("n-tony").style.display = "block"; $("n-tony").textContent = "⏳ Carico la foto…";
    try {
      const ridotta = await comprimiImmagine(file, { latoMax: 1200, qualita: 0.8, forza: true });
      $("n-prev").src = URL.createObjectURL(ridotta); $("n-prev").style.display = "block";
      const path = `${aziendaId}/attrezzature/${(crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2))}.jpg`;
      const up = await sb().storage.from("media-aziende").upload(path, ridotta, { contentType: ridotta.type || "image/jpeg", cacheControl: "31536000" });
      if (up.error) throw up.error;
      fotoUrl = sb().storage.from("media-aziende").getPublicUrl(path).data.publicUrl;
    } catch (e) {
      $("n-tony").style.display = "none";
      $("n-err").textContent = "Non riesco a caricare la foto: " + (e.message || "errore") + ". Puoi salvare lo stesso, senza foto.";
      return;
    }
    $("n-tony").textContent = "✨ Tony sta guardando la foto…";
    try {
      const { data, error } = await sb().functions.invoke("attr-riconosci-foto", { body: { azienda_id: aziendaId, foto_url: fotoUrl } });
      const p = data && data.proposta;
      if (error || !data || !data.success || !p) throw new Error((data && data.error) || (error && error.message) || "nessuna proposta");
      if (p.nome && !$("n-nome").value.trim()) $("n-nome").value = p.nome;
      if (p.categoria) $("n-cat").value = p.categoria;
      if (p.misura && !$("n-misura").value.trim()) $("n-misura").value = p.misura;
      if (p.materiale && !$("n-mat").value.trim()) $("n-mat").value = p.materiale;
      if (p.pezzi) $("n-pezzi").value = p.pezzi;
      $("n-nome").onchange();
      $("n-tony").textContent = "✨ Proposta di Tony: controlla e correggi quello che serve. La misura e i pezzi li scrivi tu se non si leggono dalla foto.";
    } catch (e) {
      $("n-tony").textContent = "Non riesco a riconoscerla: scrivi tu cos'è, poi salva.";
    }
  };

  $("n-salva").onclick = async () => {
    const nome = $("n-nome").value.trim();
    const pezzi = Math.max(0, parseInt($("n-pezzi").value, 10) || 0);
    if (!nome) { $("n-err").textContent = "Scrivi cos'è: il nome è obbligatorio."; return; }
    if (tipo !== "fisso" && pezzi < 1) { $("n-err").textContent = "Quanti pezzi ci sono?"; return; }
    const n = tipo === "singolo" ? Math.min(pezzi, 50) : tipo === "quantita" ? Math.min(Math.max(parseInt($("n-conf").value, 10) || 1, 1), 30) : 1;
    const btn = $("n-salva");
    btn.disabled = true; btn.textContent = "Salvo…"; $("n-err").textContent = "";
    const create = [];
    try {
      for (let i = 0; i < n; i++) {
        const { data, error } = await sb().rpc("attr_crea_scatola", {
          p_azienda: aziendaId, p_nome: nome, p_categoria: $("n-cat").value, p_misura: $("n-misura").value.trim() || null,
          p_materiale: $("n-mat").value.trim() || null, p_foto_url: fotoUrl || null, p_pezzi: tipo === "quantita" ? pezzi : 1,
          p_ubicazione: $("n-ubi").value.trim() || null, p_sede: ($("n-sede") ? $("n-sede").value : sedeAttiva) || null,
          p_tracciamento: tipo, p_costo: parseFloat($("n-costo")?.value) || null,
          p_matricola: tipo === "fisso" ? ($("n-matr").value.trim() || null) : null, p_data_acquisto: tipo === "fisso" ? ($("n-acq").value || null) : null,
        });
        if (error) throw error;
        create.push({ scatola: data.scatola, articolo: data.articolo });
      }
    } catch (e) {
      btn.disabled = false; btn.textContent = "Salva e crea l'etichetta";
      $("n-err").textContent = "Non riesco a salvare: " + (e.message || "errore");
      if (create.length) { chiudi(); dopo && dopo(); mostraEtichette(create); }
      return;
    }
    chiudi();
    dopo && dopo();
    mostraEtichette(create, { nuova: () => apriNuova(aziendaId, articoli, righe, dopo) });
  };
}

/* ───────────────── ETICHETTA (Brother QL, rotolo da 62 mm) ───────────────── */
const ET_W = 696;   // punti utili di un rotolo da 62 mm a 300 dpi
const ET_H = 464;   // circa 39 mm: la lunghezza e' libera, questa basta per foto, testo e QR

function righeTesto(ctx, testo, maxW, maxRighe) {
  const parole = String(testo || "").split(/\s+/).filter(Boolean);
  const out = []; let riga = "";
  for (const p of parole) {
    const prova = riga ? riga + " " + p : p;
    if (ctx.measureText(prova).width <= maxW || !riga) riga = prova; else { out.push(riga); riga = p; }
  }
  if (riga) out.push(riga);
  if (out.length > maxRighe) { const t = out.slice(0, maxRighe); t[maxRighe - 1] = t[maxRighe - 1].replace(/.{0,2}$/, "…"); return t; }
  return out;
}

// foto in bianco e nero puro (diffusione dell'errore): sulla termica resta nitida invece di impastarsi
function bianconero(ctx, x, y, w, h) {
  const img = ctx.getImageData(x, y, w, h); const d = img.data; const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = Math.max(0, Math.min(255, (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2] - 128) * 1.3 + 128));
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const i = yy * w + xx; const old = g[i]; const nv = old < 128 ? 0 : 255; const err = old - nv; g[i] = nv;
      if (xx + 1 < w) g[i + 1] += err * 7 / 16;
      if (yy + 1 < h) { if (xx > 0) g[i + w - 1] += err * 3 / 16; g[i + w] += err * 5 / 16; if (xx + 1 < w) g[i + w + 1] += err / 16; }
    }
  }
  for (let i = 0; i < w * h; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g[i]; d[i * 4 + 3] = 255; }
  ctx.putImageData(img, x, y);
}

function caricaImmagine(url) {
  return new Promise((res) => {
    if (!url) return res(null);
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => res(im); im.onerror = () => res(null);
    im.src = url + (url.includes("?") ? "&" : "?") + "cb=1";
    setTimeout(() => res(null), 8000);
  });
}

async function creaQr(testo, lato) {
  for (let i = 0; i < 30 && !window.QRCode; i++) await new Promise((r) => setTimeout(r, 100));
  if (!window.QRCode) return null;
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:-9999px;top:0;";
  document.body.appendChild(box);
  try {
    // livello di correzione basso: l'URL e' corto e i quadratini restano grandi, piu' facili da leggere su una stampa piccola
    new window.QRCode(box, { text: testo, width: lato, height: lato, correctLevel: window.QRCode.CorrectLevel.L, colorDark: "#000000", colorLight: "#ffffff" });
    await new Promise((r) => setTimeout(r, 30));
    // la libreria disegna su un canvas e ne fa anche un'immagine: uso il canvas, e se manca l'immagine
    let sorgente = box.querySelector("canvas");
    if (!sorgente || !sorgente.width) {
      const im = box.querySelector("img");
      if (!im || !im.src) return null;
      if (!im.complete) await new Promise((r) => { im.onload = r; im.onerror = r; setTimeout(r, 2000); });
      sorgente = im;
    }
    const copia = document.createElement("canvas"); copia.width = lato; copia.height = lato;
    const cx = copia.getContext("2d"); cx.imageSmoothingEnabled = false; cx.drawImage(sorgente, 0, 0, lato, lato);
    return copia;
  } finally { box.remove(); }
}

export async function disegnaEtichetta(scatola, articolo) {
  const c = document.createElement("canvas"); c.width = ET_W; c.height = ET_H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ET_W, ET_H);
  ctx.fillStyle = "#000"; ctx.textBaseline = "alphabetic";

  // foto a sinistra
  const FX = 14, FY = 14, FS = 268;
  const foto = await caricaImmagine(articolo.foto_url);
  if (foto) {
    const lato = Math.min(foto.naturalWidth, foto.naturalHeight);
    ctx.drawImage(foto, (foto.naturalWidth - lato) / 2, (foto.naturalHeight - lato) / 2, lato, lato, FX, FY, FS, FS);
    try { bianconero(ctx, FX, FY, FS, FS); } catch (e) { /* foto non leggibile (CORS): resta com'e' */ }
  } else {
    ctx.lineWidth = 3; ctx.strokeStyle = "#000"; ctx.strokeRect(FX, FY, FS, FS);
    ctx.font = "700 30px Arial"; ctx.textAlign = "center"; ctx.fillText("senza foto", FX + FS / 2, FY + FS / 2 + 10); ctx.textAlign = "left";
  }

  // codice e pezzi sotto la foto
  ctx.textAlign = "left";
  ctx.font = "800 40px Arial"; ctx.fillText(scatola.codice, FX, 338);
  const pezzi = String(Number(scatola.quantita) || 0);
  if (articolo.tracciamento === "fisso") {
    ctx.font = "900 62px Arial"; ctx.fillText("FISSA", FX, 412);
    if (scatola.matricola) { ctx.font = "700 30px Arial"; ctx.fillText(String(scatola.matricola).slice(0, 14), FX, 448); }
  } else {
    ctx.font = "900 104px Arial"; const wP = ctx.measureText(pezzi).width;
    ctx.fillText(pezzi, FX, 440);
    ctx.font = "800 40px Arial"; ctx.fillText("pz", FX + wP + 12, 440);
  }

  // nome e misura a destra
  const TX = 304, TW = ET_W - TX - 14;
  // il nome intero in al massimo 3 righe: rimpicciolisco il carattere prima di tagliare
  let corpo = 50, righe;
  for (; corpo > 30; corpo -= 4) { ctx.font = `800 ${corpo}px Arial`; righe = righeTesto(ctx, articolo.nome, TW, 99); if (righe.length <= 3) break; }
  corpo = Math.max(corpo, 30); ctx.font = `800 ${corpo}px Arial`;
  if (!righe || righe.length > 3) righe = righeTesto(ctx, articolo.nome, TW, 3);
  let y = 14 + corpo;
  righe.forEach((r) => { ctx.fillText(r, TX, y); y += corpo + 6; });
  if (articolo.misura) { ctx.font = "700 36px Arial"; righeTesto(ctx, articolo.misura, TW, 2).forEach((r) => { y += 4; ctx.fillText(r, TX, y + 30); y += 40; }); }
  if (scatola.ubicazione) { ctx.font = "600 30px Arial"; righeTesto(ctx, "📍 " + scatola.ubicazione, 190, 2).forEach((r, i) => ctx.fillText(r, TX, 330 + i * 36)); }

  // QR in basso a destra
  const QS = 168, QM = 24;   // margine bianco di almeno 4 quadratini: serve per farlo leggere bene
  const qr = await creaQr(urlScheda(scatola.codice), QS);
  if (qr) ctx.drawImage(qr, ET_W - QS - QM, ET_H - QS - QM, QS, QS);
  else { ctx.font = "700 28px Arial"; ctx.fillText(scatola.codice, TX, 440); }
  return c;
}

const aBlob = (c) => new Promise((res) => c.toBlob(res, "image/png"));

async function condividi(canvasList, nomi) {
  const files = [];
  for (let i = 0; i < canvasList.length; i++) files.push(new File([await aBlob(canvasList[i])], nomi[i], { type: "image/png" }));
  if (navigator.canShare && navigator.canShare({ files })) {
    try { await navigator.share({ files, title: "Etichette magazzino" }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  files.forEach((f) => { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); });
  toast("Etichetta scaricata: aprila con l'app Brother");
}

export async function mostraEtichette(elenco, opzioni = {}) {
  const sheet = document.createElement("div");
  sheet.className = "at-sheet";
  sheet.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><h3>🏷 ${elenco.length === 1 ? "Etichetta pronta" : elenco.length + " etichette pronte"}</h3><button class="at-btn sec" id="e-chiudi" style="padding:8px 14px;">✕</button></div>
    <p style="margin:0 0 6px;font-size:13.5px;color:#475569;">Tocca <b>Stampa</b> e scegli l'app <b>Brother iPrint&amp;Label</b>: l'etichetta esce sul rotolo da 62 mm.</p>
    <div id="e-lista"><p style="color:#64748b;">Preparo…</p></div>
    <div class="at-row"><button class="at-btn ok" id="e-stampa">🖨 Stampa</button><button class="at-btn sec" id="e-scarica">⬇️ Salva immagine</button>${opzioni.nuova ? `<button class="at-btn sec" id="e-altra">➕ Un'altra scatola</button>` : ""}</div>`;
  document.body.appendChild(sheet); document.body.style.overflow = "hidden";
  const chiudi = () => { sheet.remove(); document.body.style.overflow = ""; };
  sheet.querySelector("#e-chiudi").onclick = chiudi;
  const canvases = [];
  const lista = sheet.querySelector("#e-lista"); lista.innerHTML = "";
  for (const e of elenco) {
    const c = await disegnaEtichetta(e.scatola, e.articolo);
    c.className = "at-eti"; canvases.push(c); lista.appendChild(c);
  }
  const nomi = elenco.map((e) => `etichetta-${e.scatola.codice}.png`);
  sheet.querySelector("#e-stampa").onclick = () => condividi(canvases, nomi);
  sheet.querySelector("#e-scarica").onclick = async () => {
    for (let i = 0; i < canvases.length; i++) { const a = document.createElement("a"); a.href = URL.createObjectURL(await aBlob(canvases[i])); a.download = nomi[i]; document.body.appendChild(a); a.click(); a.remove(); }
  };
  if (opzioni.nuova) sheet.querySelector("#e-altra").onclick = () => { chiudi(); opzioni.nuova(); };
}

/* ───────────────── VALORE ───────────────── */
const euro = (n) => Number(n || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const euro2 = (n) => Number(n || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const valRiga = (r) => (vedeValori() ? (Number(r.quantita) || 0) * (Number(r.attr_articoli?.costo_sostituzione) || 0) : 0);
let canaleTempoReale = null;
const isFissa = (r) => r.attr_articoli?.tracciamento === "fisso";

// "Cosa esce?": quanti pezzi di ogni articolo. Restituisce [{ articolo_id, pezzi }] oppure null se si annulla.
function chiediQuantita(voci) {
  return new Promise((res) => {
    const sheet = document.createElement("div"); sheet.className = "at-sheet";
    sheet.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><h3>📤 Cosa esce?</h3><button type="button" class="at-btn sec" id="q-x" style="padding:8px 14px;">✕</button></div>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Scrivi quanti pezzi servono. Se ne servono più di una scatola, l'app prende le scatole intere e ne apre una sola per il resto.</p>
      <input class="at-in" id="q-cerca" type="search" placeholder="🔍 Cerca" autocomplete="off">
      <div id="q-lista"></div>
      <div style="position:sticky;bottom:0;background:#fff;border-top:1.5px solid #cbd5e1;padding:10px 0;margin-top:10px;display:flex;gap:10px;align-items:center;"><div id="q-tot" style="flex:1;font-weight:800;font-size:14px;"></div><button type="button" class="at-btn" id="q-ok">Avanti ›</button></div>`;
    document.body.appendChild(sheet); document.body.style.overflow = "hidden";
    const qty = new Map();
    const chiudi = (v) => { sheet.remove(); document.body.style.overflow = ""; res(v); };
    const ord = [...voci].sort((x, y) => x.a.nome.localeCompare(y.a.nome, "it"));
    const totale = () => {
      let n = 0, p = 0; qty.forEach((v) => { if (v > 0) { n += 1; p += v; } });
      sheet.querySelector("#q-tot").textContent = n ? `${n} ${n === 1 ? "articolo" : "articoli"} · ${p.toLocaleString("it-IT")} pezzi` : "Scrivi quanti pezzi";
    };
    const imposta = (id, v) => { const voce = ord.find((x) => x.a.id === id); const n = Math.max(0, Math.min(voce ? voce.pezzi : 0, parseInt(v, 10) || 0)); qty.set(id, n); return n; };
    const disegna = () => {
      const q = sheet.querySelector("#q-cerca").value.trim().toLowerCase();
      const lista = ord.filter((v) => !q || (v.a.nome + " " + (v.a.misura || "")).toLowerCase().includes(q));
      sheet.querySelector("#q-lista").innerHTML = lista.map((v) => `<div style="border-top:1px solid #e2e8f0;padding:10px 0;display:flex;gap:10px;align-items:center;"><div style="flex:1;min-width:0;"><div style="font-weight:800;">${esc(v.a.nome)}${v.a.misura ? " · " + esc(v.a.misura) : ""}</div><div style="font-size:12.5px;color:#64748b;">in magazzino ${v.pezzi} pezzi (${v.scatole} ${v.scatole === 1 ? "scatola" : "scatole"})</div></div>
        <div class="at-step"><button type="button" data-meno="${esc(v.a.id)}">−</button><input class="at-in" data-q="${esc(v.a.id)}" type="number" inputmode="numeric" min="0" max="${v.pezzi}" value="${qty.get(v.a.id) || 0}"><button type="button" data-piu="${esc(v.a.id)}">+</button></div></div>`).join("") || `<p style="color:#64748b;">Niente con questa ricerca.</p>`;
      sheet.querySelectorAll("[data-meno]").forEach((b) => (b.onclick = () => { const i = b.dataset.meno; const n = imposta(i, (qty.get(i) || 0) - 1); b.parentNode.querySelector("input").value = n; totale(); }));
      sheet.querySelectorAll("[data-piu]").forEach((b) => (b.onclick = () => { const i = b.dataset.piu; const n = imposta(i, (qty.get(i) || 0) + 1); b.parentNode.querySelector("input").value = n; totale(); }));
      sheet.querySelectorAll("[data-q]").forEach((inp) => (inp.onchange = () => { inp.value = imposta(inp.dataset.q, inp.value); totale(); }));
      totale();
    };
    sheet.querySelector("#q-cerca").oninput = disegna;
    sheet.querySelector("#q-x").onclick = () => chiudi(null);
    sheet.querySelector("#q-ok").onclick = () => {
      const righe = [...qty].filter(([, n]) => n > 0).map(([id, n]) => ({ articolo_id: id, pezzi: n }));
      if (!righe.length) { toast("Scrivi almeno un pezzo"); return; }
      chiudi(righe);
    };
    disegna();
  });
}

// "Cosa rientra?": per ogni articolo quanti pezzi sono tornati (di base tutti). Restituisce [{ articolo_id, rientrati }] o null.
function chiediRientro(nome, voci) {
  return new Promise((res) => {
    const ov = document.createElement("div"); ov.className = "at-ov";
    ov.innerHTML = `<div style="max-height:90vh;overflow:auto;"><h3 style="margin:0 0 4px;">📥 Cosa rientra?</h3>
      <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Da “${esc(nome)}”. Scrivi quanti pezzi sono tornati: la differenza viene segnata come mancante.</p>
      ${voci.map((v, i) => `<div style="border-top:1px solid #e2e8f0;padding:10px 0;"><div style="font-weight:800;">${esc(v.a.nome)}${v.a.misura ? " · " + esc(v.a.misura) : ""}</div><div style="font-size:12.5px;color:#64748b;">usciti ${v.usciti} pezzi</div>
        <div class="at-step" style="margin-top:6px;"><button type="button" data-meno="${i}">−</button><input class="at-in" data-q="${i}" type="number" inputmode="numeric" min="0" max="${v.usciti}" value="${v.usciti}"><button type="button" data-piu="${i}">+</button></div></div>`).join("")}
      <div class="at-row"><button type="button" class="at-btn sec" id="r-no">Annulla</button><button type="button" class="at-btn ok" id="r-ok">Conferma rientro</button></div></div>`;
    document.body.appendChild(ov);
    const inp = (i) => ov.querySelector(`[data-q="${i}"]`);
    const fissa = (i, n) => { const max = voci[i].usciti; const v = Math.max(0, Math.min(max, parseInt(n, 10) || 0)); inp(i).value = v; return v; };
    ov.querySelectorAll("[data-meno]").forEach((b) => (b.onclick = () => fissa(+b.dataset.meno, (parseInt(inp(+b.dataset.meno).value, 10) || 0) - 1)));
    ov.querySelectorAll("[data-piu]").forEach((b) => (b.onclick = () => fissa(+b.dataset.piu, (parseInt(inp(+b.dataset.piu).value, 10) || 0) + 1)));
    ov.querySelectorAll("[data-q]").forEach((x) => (x.onchange = () => fissa(+x.dataset.q, x.value)));
    ov.querySelector("#r-no").onclick = () => { ov.remove(); res(null); };
    ov.querySelector("#r-ok").onclick = () => { const righe = voci.map((v, i) => ({ articolo_id: v.a.id, rientrati: fissa(i, inp(i).value) })); ov.remove(); res(righe); };
  });
}

/* ───────────────── DESTINAZIONE DELL'USCITA ───────────────── */
const dataIt = (iso) => { const [y, m, d] = String(iso || "").slice(0, 10).split("-"); return y ? `${d}/${m}` : ""; };

// "Dove va?": un evento in programma, una location, oppure un posto scritto a mano. Restituisce null se si annulla.
async function chiediDestinazione(aziendaId, usate) {
  let eventi = [];
  try { const { data } = await sb().rpc("attr_eventi_prossimi", { p_azienda: aziendaId }); if (Array.isArray(data)) eventi = data; } catch (e) { /* senza eventi si sceglie una location */ }
  const luoghi = [...new Set([...(window.state?.sedi || []).map((s) => s.nome), ...(usate || [])])].filter(Boolean);
  let ritiranti = []; try { ritiranti = JSON.parse(localStorage.getItem("attr_ritiranti") || "[]"); } catch (e) { ritiranti = []; }
  return new Promise((res) => {
    const ov = document.createElement("div"); ov.className = "at-ov";
    ov.innerHTML = `<div style="max-height:88vh;overflow:auto;"><h3 style="margin:0 0 4px;">Dove va?</h3>
      <p style="margin:0 0 10px;font-size:13px;color:#64748b;">Segna la destinazione: così sai dov'è finita ogni scatola.</p>
      <label class="at-lbl" for="d-rit" style="margin-top:0;">Chi ritira (nome e cognome)</label><input class="at-in" id="d-rit" list="d-ritl" placeholder="il responsabile che firma la bolla" autocomplete="off" style="margin-bottom:10px;"><datalist id="d-ritl">${ritiranti.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
      <div class="at-row" style="margin-top:0;"><button type="button" class="at-btn" id="d-ev">🎪 Evento</button><button type="button" class="at-btn sec" id="d-lo">📍 Location</button></div>
      <div id="d-lista" style="margin-top:10px;"></div>
      <div id="d-altro" style="margin-top:6px;display:none;"><label class="at-lbl" for="d-txt">Altra destinazione</label><input class="at-in" id="d-txt" placeholder="es. Villa Rossi" autocomplete="off"><button type="button" class="at-btn" id="d-ok" style="width:100%;margin-top:8px;">Conferma</button></div>
      <div class="at-row"><button type="button" class="at-btn sec" id="d-no">Annulla</button></div></div>`;
    document.body.appendChild(ov);
    const lista = ov.querySelector("#d-lista");
    const chiudi = (v) => {
      const rit = (ov.querySelector("#d-rit")?.value || "").trim();
      if (v && rit) { try { localStorage.setItem("attr_ritiranti", JSON.stringify([rit, ...ritiranti.filter((x) => x !== rit)].slice(0, 12))); } catch (e) { /* non e' grave */ } }
      ov.remove(); res(v ? { ...v, ritira: rit } : v);
    };
    const voce = (titolo, sotto, onclick) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "at-btn sec";
      b.style.cssText = "display:block;width:100%;text-align:left;margin-bottom:8px;";
      b.innerHTML = `<div>${esc(titolo)}</div>${sotto ? `<div style="font-size:12.5px;font-weight:600;color:#64748b;">${esc(sotto)}</div>` : ""}`;
      b.onclick = onclick; lista.appendChild(b);
    };
    const tabEventi = () => {
      ov.querySelector("#d-ev").className = "at-btn"; ov.querySelector("#d-lo").className = "at-btn sec"; ov.querySelector("#d-altro").style.display = "none"; lista.innerHTML = "";
      if (!eventi.length) lista.innerHTML = `<p style="font-size:13.5px;color:#64748b;">Nessun evento confermato nei prossimi giorni: scegli una location.</p>`;
      eventi.forEach((e) => voce(`${dataIt(e.data)} · ${e.titolo}`, [e.invitati ? e.invitati + " invitati" : "", e.location || ""].filter(Boolean).join(" · "), () => chiudi({ tipo: "evento", destinazione: e.titolo, evento: e.id, data: e.data })));
    };
    const tabLuoghi = () => {
      ov.querySelector("#d-ev").className = "at-btn sec"; ov.querySelector("#d-lo").className = "at-btn"; ov.querySelector("#d-altro").style.display = "block"; lista.innerHTML = "";
      luoghi.forEach((n) => voce(n, "", () => chiudi({ tipo: "location", destinazione: n })));
    };
    ov.querySelector("#d-ev").onclick = tabEventi; ov.querySelector("#d-lo").onclick = tabLuoghi;
    ov.querySelector("#d-ok").onclick = () => { const t = ov.querySelector("#d-txt").value.trim(); if (t) chiudi({ tipo: "altro", destinazione: t }); };
    ov.querySelector("#d-no").onclick = () => chiudi(null);
    (eventi.length ? tabEventi : tabLuoghi)();
  });
}

/* ───────────────── FOGLIO DI USCITA (due copie da firmare) ───────────────── */
const CSS_FOGLIO = `
.pag{width:210mm;min-height:297mm;box-sizing:border-box;padding:14mm 14mm 12mm;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;page-break-after:always;break-after:page;}
.pag:last-child{page-break-after:auto;break-after:auto;}
.testa{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px;}
.az{font-size:12px;color:#444;} .ti{font-size:22px;font-weight:800;margin-top:2px;}
.nu{text-align:right;font-size:15px;} .nu b{display:block;font-size:18px;} .cp{display:inline-block;margin-top:4px;border:1.5px solid #000;padding:2px 8px;font-size:11px;font-weight:700;letter-spacing:.04em;}
table{border-collapse:collapse;width:100%;}
.dati td{padding:4px 6px;font-size:13px;border-bottom:1px solid #ccc;} .dati td:first-child{width:30mm;color:#444;}
.el{margin-top:12px;} .el th,.el td{border:1px solid #000;padding:5px 6px;font-size:12.5px;text-align:left;} .el th{background:#eee;}
.el .n{text-align:right;width:18mm;} .el .v{text-align:center;width:22mm;} .el tfoot td{font-weight:800;background:#f5f5f5;}
.q{display:inline-block;width:14px;height:14px;border:1.5px solid #000;vertical-align:middle;}
.cod{font-size:10px;color:#555;margin-top:2px;font-weight:400;}
.rit{margin-top:14px;font-size:13px;}
.firme{display:flex;gap:14mm;margin-top:18mm;} .fi{flex:1;} .fl{font-size:12px;font-weight:700;} .fn{font-size:13px;min-height:16px;margin-top:2px;} .ft{margin-top:14mm;border-top:1px solid #000;font-size:11px;color:#444;padding-top:2px;}
.pie{margin-top:12mm;font-size:10.5px;color:#444;}
@media print{.rf-st-contenuto{display:block!important;}}`;

// il foglio: una copia per il magazzino e una per chi ritira, ciascuna da firmare
async function mostraFoglio(id) {
  const { data: f, error } = await sb().from("attr_fogli_uscita").select("*").eq("id", id).maybeSingle();
  if (error || !f) { alert("Non trovo la bolla d'uscita" + (error ? ": " + error.message : "")); return; }
  const { apriAnteprimaStampa } = await import("../utils/anteprima-stampa.js?v=" + (window.APP_V || ""));
  const azienda = window.state?.azienda?.nome || "";
  const quando = new Date(f.creato_il).toLocaleString("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const dataEv = f.destinazione_data ? new Date(f.destinazione_data + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : "";
  const dest = (f.destinazione_tipo === "evento" ? "Evento: " : f.destinazione_tipo === "location" ? "Location: " : "Destinazione: ") + f.destinazione + (dataEv ? " · " + dataEv : "");
  const righe = Array.isArray(f.righe) ? f.righe : [];
  // la bolla elenca gli ARTICOLI (non le scatole una per una): quante scatole e quanti pezzi per ciascuno
  const mappa = new Map();
  righe.forEach((r) => {
    const k = (r.nome || "") + "|" + (r.misura || "");
    if (!mappa.has(k)) mappa.set(k, { nome: r.nome || "", misura: r.misura || "", scatole: 0, pezzi: 0, codici: [], valore: 0, senzaCosto: false });
    const g = mappa.get(k); g.scatole += 1; g.pezzi += Number(r.pezzi) || 0; g.codici.push(r.codice);
    g.valore += (Number(r.pezzi) || 0) * (Number(r.costo) || 0); if (!Number(r.costo)) g.senzaCosto = true;
  });
  const gruppi = [...mappa.values()].sort((a, b) => a.nome.localeCompare(b.nome, "it") || a.misura.localeCompare(b.misura, "it", { numeric: true }));
  const conValori = vedeValori();   // chi non vede gli importi stampa la bolla senza valori
  const copia = (titolo) => `<div class="pag">
    <div class="testa"><div><div class="az">${esc(azienda)}</div><div class="ti">Bolla d'uscita attrezzature</div></div><div class="nu"><b>N. ${esc(f.numero)}</b><span class="cp">${esc(titolo)}</span></div></div>
    <table class="dati"><tr><td>Data e ora</td><td>${esc(quando)}</td></tr><tr><td>Destinazione</td><td><b>${esc(dest)}</b></td></tr>
      <tr><td>Consegna</td><td>${esc(f.consegna_nome || "")}</td></tr><tr><td>Ritira</td><td>${esc(f.ritira_nome || "")}</td></tr>${f.note ? `<tr><td>Note</td><td>${esc(f.note)}</td></tr>` : ""}</table>
    <table class="el"><thead><tr><th>N.</th><th>Articolo</th><th>Misura</th><th class="n">Scatole</th><th class="n">Pezzi</th>${conValori ? `<th class="n">Valore</th>` : ""}<th class="v">Verificato</th></tr></thead><tbody>
      ${gruppi.map((g, i) => `<tr><td>${i + 1}</td><td><b>${esc(g.nome)}</b><div class="cod">${esc(g.codici.join(", "))}</div></td><td>${esc(g.misura)}</td><td class="n">${g.scatole}</td><td class="n">${g.pezzi}</td>${conValori ? `<td class="n">${g.valore ? euro2(g.valore) : "—"}</td>` : ""}<td class="v"><span class="q"></span></td></tr>`).join("")}
      </tbody><tfoot><tr><td colspan="3">Totale</td><td class="n">${f.totale_scatole}</td><td class="n">${f.totale_pezzi}</td>${conValori ? `<td class="n"><b>${f.totale_valore ? euro2(f.totale_valore) : "—"}</b></td>` : ""}<td></td></tr></tfoot></table>
    ${conValori ? `<div class="rit" style="margin-top:6px;font-size:10.5px;color:#555;">Valore calcolato al costo di sostituzione di ogni pezzo.</div>` : ""}
    <div class="rit">Data prevista di rientro: ______ / ______ / __________</div>
    <div class="firme"><div class="fi"><div class="fl">Consegna (magazzino)</div><div class="fn">${esc(f.consegna_nome || "")}</div><div class="ft">Firma</div></div>
      <div class="fi"><div class="fl">Ritira (responsabile)</div><div class="fn">${esc(f.ritira_nome || "")}</div><div class="ft">Firma</div></div></div>
    <div class="pie">Il materiale elencato è stato consegnato a chi ritira, che firma per ricevuta. Una copia resta al magazzino, una a chi ritira.</div></div>`;
  apriAnteprimaStampa({ titolo: "Bolla d'uscita " + f.numero, css: CSS_FOGLIO, corpo: copia("COPIA MAGAZZINO") + copia("COPIA DI CHI RITIRA"), pagina: "A4" });
}

// i fogli gia' fatti, per ristamparli
async function elencoFogli(aziendaId) {
  const ov = document.createElement("div"); ov.className = "at-sheet";
  ov.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><h3>📄 Bolle d'uscita</h3><button type="button" class="at-btn sec" id="f-chiudi" style="padding:8px 14px;">✕</button></div><div id="f-lista"><p style="color:#64748b;">Carico…</p></div>`;
  document.body.appendChild(ov); document.body.style.overflow = "hidden";
  ov.querySelector("#f-chiudi").onclick = () => { ov.remove(); document.body.style.overflow = ""; };
  const { data, error } = await sb().from("attr_fogli_uscita").select("id,numero,creato_il,destinazione,destinazione_data,ritira_nome,totale_scatole,totale_pezzi").eq("azienda_id", aziendaId).order("creato_il", { ascending: false }).limit(40);
  const box = ov.querySelector("#f-lista");
  if (error) { box.innerHTML = `<p style="color:#b91c1c;">${esc(error.message)}</p>`; return; }
  if (!(data || []).length) { box.innerHTML = `<p style="color:#64748b;">Nessuna bolla ancora: si crea da sola quando una scatola esce.</p>`; return; }
  box.innerHTML = data.map((f) => `<button type="button" class="at-btn sec" data-f="${esc(f.id)}" style="display:block;width:100%;text-align:left;margin-bottom:8px;"><div>${esc(f.numero)} · ${esc(f.destinazione)}</div><div style="font-size:12.5px;font-weight:600;color:#64748b;">${new Date(f.creato_il).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · ${f.totale_scatole} ${f.totale_scatole === 1 ? "scatola" : "scatole"} · ${f.totale_pezzi} pezzi${f.ritira_nome ? " · ritira " + esc(f.ritira_nome) : ""}</div></button>`).join("");
  box.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => mostraFoglio(b.dataset.f)));
}

/* ───────────────── SCHEDA SCATOLA ───────────────── */
function chiediNumero({ titolo, valore = 1, min = 0, testoOk = "Conferma", nota = "" }) {
  return new Promise((res) => {
    const ov = document.createElement("div"); ov.className = "at-ov";
    ov.innerHTML = `<div><h3 style="margin:0 0 4px;">${esc(titolo)}</h3>${nota ? `<p style="margin:0 0 10px;font-size:13px;color:#64748b;">${esc(nota)}</p>` : ""}
      <div class="at-step" style="justify-content:center;margin:12px 0;"><button type="button" id="q-meno">−</button><input class="at-in" id="q-val" type="number" inputmode="numeric" min="${min}" value="${valore}"><button type="button" id="q-piu">+</button></div>
      <div class="at-row"><button class="at-btn sec" id="q-no">Annulla</button><button class="at-btn" id="q-ok">${esc(testoOk)}</button></div></div>`;
    document.body.appendChild(ov);
    const v = ov.querySelector("#q-val"); v.focus(); v.select();
    ov.querySelector("#q-meno").onclick = () => { v.value = Math.max(min, (parseInt(v.value, 10) || 0) - 1); };
    ov.querySelector("#q-piu").onclick = () => { v.value = (parseInt(v.value, 10) || 0) + 1; };
    ov.querySelector("#q-no").onclick = () => { ov.remove(); res(null); };
    ov.querySelector("#q-ok").onclick = () => { const n = Math.max(min, parseInt(v.value, 10) || 0); ov.remove(); res(n); };
  });
}

function chiediTesto({ titolo, valore = "", placeholder = "" }) {
  return new Promise((res) => {
    const ov = document.createElement("div"); ov.className = "at-ov";
    ov.innerHTML = `<div><h3 style="margin:0 0 10px;">${esc(titolo)}</h3><input class="at-in" id="q-t" value="${esc(valore)}" placeholder="${esc(placeholder)}">
      <div class="at-row"><button class="at-btn sec" id="q-no">Annulla</button><button class="at-btn" id="q-ok">Salva</button></div></div>`;
    document.body.appendChild(ov);
    const t = ov.querySelector("#q-t"); t.focus();
    ov.querySelector("#q-no").onclick = () => { ov.remove(); res(null); };
    ov.querySelector("#q-ok").onclick = () => { const x = t.value.trim(); ov.remove(); res(x); };
  });
}

async function renderScheda(container, aziendaId, codice) {
  const scrive = puoScrivere();
  container.innerHTML = `<div class="at-wrap">${CSS}<p style="padding:30px;text-align:center;color:#64748b;">Carico la scatola…</p></div>`;
  const { data: sc, error } = await sb().from("attr_scatole")
    .select("*,attr_articoli(*)").eq("azienda_id", aziendaId).eq("codice", codice).maybeSingle();
  if (error || !sc || !sc.attr_articoli) {
    container.innerHTML = `<div class="at-wrap">${CSS}<p style="padding:30px;text-align:center;color:#b91c1c;font-weight:700;">${error ? esc(error.message) : "Non trovo la scatola " + esc(codice)}</p>
      <div class="at-row"><button class="at-btn sec" onclick="location.hash='#/magazzino-attrezzature'">‹ Torna al magazzino</button></div></div>`;
    return;
  }
  const a = sc.attr_articoli;
  const st = STATI[sc.stato] || STATI.in_magazzino;
  const sede = (window.state?.sedi || []).find((s) => s.id === sc.sede_id);
  const { data: mov } = await sb().from("attr_movimenti").select("tipo,quantita_prima,quantita_dopo,nota,destinazione,created_at").eq("scatola_id", sc.id).order("created_at", { ascending: false }).limit(20);

  const quando = (iso) => new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  container.innerHTML = `<div class="at-wrap">${CSS}
    <button class="at-btn sec" id="s-indietro" style="padding:8px 14px;margin-bottom:10px;">‹ Magazzino</button>
    ${a.foto_url ? `<img class="at-prev" src="${esc(a.foto_url)}" alt="" style="margin-top:0;">` : ""}
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-top:12px;">
      <div style="min-width:0;"><div style="font-size:22px;font-weight:900;line-height:1.2;">${esc(a.nome)}</div>
        <div class="at-sub" style="font-size:14px;margin-top:4px;">${a.misura ? esc(a.misura) + " · " : ""}${esc(nomeCat(a.categoria))}${a.materiale ? " · " + esc(a.materiale) : ""}</div>
        <div class="at-sub" style="font-size:14px;">${esc(sc.codice)}${sc.ubicazione ? " · 📍 " + esc(sc.ubicazione) : ""}${sede ? " · " + esc(sede.nome) : ""}</div>
        ${a.tracciamento === "fisso" ? `<div class="at-sub" style="font-size:14px;">${sc.matricola ? "Matricola " + esc(sc.matricola) : "Senza matricola"}${sc.data_acquisto ? " · acquistata il " + new Date(sc.data_acquisto + "T12:00:00").toLocaleDateString("it-IT") : ""}</div>` : ""}
        <span class="at-badge" style="margin:8px 0 0;color:${st[1]};background:${st[2]};font-size:13px;padding:4px 12px;">${st[0]}${sc.stato === "fuori" && sc.destinazione ? " · " + esc(sc.destinazione) + (sc.destinazione_data ? " · " + dataIt(sc.destinazione_data) : "") : ""}</span></div>
      <div style="text-align:right;flex:0 0 auto;"><div style="font-size:44px;font-weight:900;line-height:1;">${Number(sc.quantita) || 0}</div><div class="at-sub">pezzi</div></div>
    </div>
    ${a.costo_sostituzione && vedeValori() ? `<div class="at-sub" style="margin-top:8px;">Costo di sostituzione: ${Number(a.costo_sostituzione).toLocaleString("it-IT", { style: "currency", currency: "EUR" })} a pezzo · valore della scatola ${euro2((Number(sc.quantita) || 0) * Number(a.costo_sostituzione))}</div>` : ""}
    ${scrive ? `<div class="at-row">
        ${sc.stato === "in_magazzino" ? `<button class="at-btn" data-az="uscita">📤 Esce</button>` : ""}
        ${sc.stato === "fuori" ? `<button class="at-btn" data-az="rientro">📥 Rientra</button>` : ""}
        ${sc.stato === "da_lavare" ? `<button class="at-btn ok" data-az="lavaggio">🧼 Lavata e riposta</button>` : ""}
        <button class="at-btn sec" data-az="conta">🔢 Conta i pezzi</button></div>
      <div class="at-row"><button class="at-btn sec" data-az="rotto">💥 Rotti</button><button class="at-btn sec" data-az="perso">❓ Mancanti</button><button class="at-btn sec" data-az="spostamento">📍 Sposta</button></div>` : ""}
    <div class="at-row"><button class="at-btn sec" data-az="etichetta">🏷 Etichetta</button>${scrive ? `<button class="at-btn sec" data-az="modifica">✏️ Modifica</button>` : ""}</div>
    <h3 style="margin:22px 0 6px;font-size:16px;">Storico</h3>
    ${(mov || []).map((m) => `<div class="at-hist"><span><b>${esc(TIPI_MOV[m.tipo] || m.tipo)}</b>${m.quantita_prima !== m.quantita_dopo ? ` ${m.quantita_prima} → ${m.quantita_dopo}` : ""}${m.destinazione ? ` · ${esc(m.destinazione)}` : ""}${m.nota ? ` · ${esc(m.nota)}` : ""}</span><span style="color:#64748b;white-space:nowrap;">${quando(m.created_at)}</span></div>`).join("") || `<p style="color:#64748b;font-size:13px;">Ancora nessun movimento.</p>`}
    ${scrive ? `<div class="at-row" style="margin-top:22px;"><button class="at-btn sec" data-az="archivia" style="color:#b91c1c;">🗄 Archivia questa scatola</button></div>` : ""}
  </div>`;

  const ricarica = () => renderScheda(container, aziendaId, codice);
  const uscitaScatola = async () => {
    const d = await chiediDestinazione(aziendaId, []);
    if (!d) return;
    const { data: dd, error: e } = await sb().rpc("attr_uscita", { p_scatole: [sc.id], p_tipo: d.tipo, p_destinazione: d.destinazione, p_evento: d.evento || null, p_data: d.data || null, p_ritira: d.ritira || null });
    if (e) { alert("Non riesco a salvare: " + e.message); return; }
    toast("Esce per: " + d.destinazione); ricarica();
    if (dd && dd.foglio_id) mostraFoglio(dd.foglio_id);
  };
  const muovi = async (tipo, quantita, nota) => {
    const { error: e } = await sb().rpc("attr_movimento", { p_scatola: sc.id, p_tipo: tipo, p_quantita: quantita ?? null, p_nota: nota ?? null });
    if (e) { alert("Non riesco a salvare: " + e.message); return false; }
    return true;
  };
  container.querySelector("#s-indietro").onclick = () => { location.hash = "#/magazzino-attrezzature"; };
  container.querySelectorAll("[data-az]").forEach((b) => (b.onclick = async () => {
    const az = b.dataset.az;
    if (az === "uscita") { uscitaScatola(); }
    else if (az === "rientro" || az === "lavaggio") { if (await muovi(az)) { toast(az === "uscita" ? "Segnata come uscita" : az === "rientro" ? "Rientrata: da lavare" : "Lavata e riposta"); ricarica(); } }
    else if (az === "conta") { const n = await chiediNumero({ titolo: "Quanti pezzi ci sono adesso?", valore: sc.quantita, nota: "Conta quelli che hai davanti: aggiorno la scatola." }); if (n !== null && await muovi("conta", n)) { toast("Aggiornata: " + n + " pezzi"); ricarica(); } }
    else if (az === "rotto" || az === "perso") { const n = await chiediNumero({ titolo: az === "rotto" ? "Quanti pezzi sono rotti?" : "Quanti pezzi mancano?", valore: 1, min: 1, testoOk: "Segna" }); if (n && await muovi(az, n)) { toast("Segnato"); ricarica(); } }
    else if (az === "spostamento") { const u = await chiediTesto({ titolo: "Dove la metti?", valore: sc.ubicazione || "", placeholder: "es. Scaffale B1" }); if (u !== null && await muovi("spostamento", null, u)) { toast("Spostata"); ricarica(); } }
    else if (az === "etichetta") mostraEtichette([{ scatola: sc, articolo: a }]);
    else if (az === "modifica") modificaArticolo(a, ricarica);
    else if (az === "archivia") { if (confirm("Archiviare la scatola " + sc.codice + "? Sparisce dall'elenco ma resta nello storico.")) { const { error: e } = await sb().from("attr_scatole").update({ attiva: false }).eq("id", sc.id); if (e) alert(e.message); else { toast("Archiviata"); location.hash = "#/magazzino-attrezzature"; } } }
  }));
}

function modificaArticolo(a, dopo) {
  const ov = document.createElement("div"); ov.className = "at-ov";
  ov.innerHTML = `<div style="max-height:88vh;overflow:auto;"><h3 style="margin:0 0 4px;">Modifica articolo</h3>
    <p style="margin:0;font-size:12.5px;color:#64748b;">Vale per tutte le scatole di questo articolo.</p>
    <label class="at-lbl">Nome</label><input class="at-in" id="m-nome" value="${esc(a.nome)}">
    <label class="at-lbl">Categoria</label><select class="at-in" id="m-cat">${CATEGORIE.map((c) => `<option value="${c[0]}"${c[0] === a.categoria ? " selected" : ""}>${c[1]}</option>`).join("")}</select>
    <label class="at-lbl">Misura</label><input class="at-in" id="m-mis" value="${esc(a.misura || "")}">
    <label class="at-lbl">Materiale</label><input class="at-in" id="m-mat" value="${esc(a.materiale || "")}">
    ${vedeValori() ? `<label class="at-lbl">Costo di sostituzione (€ a pezzo)</label><input class="at-in" id="m-costo" type="number" inputmode="decimal" step="0.01" value="${a.costo_sostituzione ?? ""}">` : ""}
    <div id="m-err" style="color:#b91c1c;font-weight:700;margin-top:8px;"></div>
    <div class="at-row"><button class="at-btn sec" id="m-no">Annulla</button><button class="at-btn" id="m-ok">Salva</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#m-no").onclick = () => ov.remove();
  ov.querySelector("#m-ok").onclick = async () => {
    const nome = ov.querySelector("#m-nome").value.trim();
    if (!nome) { ov.querySelector("#m-err").textContent = "Il nome è obbligatorio."; return; }
    const campi = {
      nome, categoria: ov.querySelector("#m-cat").value, misura: ov.querySelector("#m-mis").value.trim() || null,
      materiale: ov.querySelector("#m-mat").value.trim() || null,
    };
    // il costo lo cambia solo chi lo vede: il magazziniere non deve cancellarlo senza saperlo
    if (ov.querySelector("#m-costo")) campi.costo_sostituzione = parseFloat(ov.querySelector("#m-costo").value) || null;
    const { error } = await sb().from("attr_articoli").update(campi).eq("id", a.id);
    if (error) { ov.querySelector("#m-err").textContent = /duplicate|unique/i.test(error.message) ? "Esiste già un articolo con questo nome e questa misura." : error.message; return; }
    ov.remove(); toast("Salvato"); dopo();
  };
}
