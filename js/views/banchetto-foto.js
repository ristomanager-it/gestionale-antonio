// js/views/banchetto-foto.js
// 📷 Banchetto da foto: si fotografa il foglio del banchetto, Tony legge giorno, ospiti, intolleranze
// e menu e propone le ricette. L'admin controlla e corregge, poi "Crea evento": preventivo confermato,
// prenotazione, lotti e planning del Centro cottura (con le regole del cervello), come da preventivi.

const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const URL_EF = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-banchetto-foto";
const SEZIONI = ["Aperitivo", "Antipasti", "Antipasto al buffet", "Primi", "Secondi", "Contorni", "Torta", "Buffet di dolci", "Vini e bollicine", "Menu bambini"];
const TIPI = ["Matrimonio", "Battesimo", "Comunione", "Cresima", "Compleanno", "Cena aziendale", "Altro"];

// foto rimpicciolita sul telefono: invio veloce anche con poco campo
async function riduci(file) {
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = URL.createObjectURL(file); });
  const max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return { b64: c.toDataURL("image/jpeg", 0.82), mime: "image/jpeg" };
}

export async function render(app) {
  const az = window.state?.azienda;
  if (!az?.id) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  const { data: sedi } = await sb().from("sedi").select("id, nome").eq("azienda_id", az.id).order("nome");
  const sedeDefault = (sedi || []).find((s) => /catering|ricevim/i.test(s.nome))?.id || window.state?.sedeAttiva?.id || sedi?.[0]?.id;
  let B = null;
  app.innerHTML = stile() + `<div class="bf"></div>`;
  const box = app.querySelector(".bf");

  function inizio(msg) {
    box.innerHTML = `
      <h2 class="bf-tit">📷 Banchetto da foto</h2>
      <div class="bf-sub">Fotografa il foglio del banchetto (anche più foto se continua). Tony legge giorno, ospiti, intolleranze e menu; tu controlli e crei l'evento.</div>
      ${msg ? `<div class="bf-err">${esc(msg)}</div>` : ""}
      <label class="bf-foto">📷 Scatta o scegli le foto<input type="file" accept="image/*" multiple hidden></label>`;
    box.querySelector("input[type=file]").addEventListener("change", async (e) => {
      const files = [...e.target.files].slice(0, 4);
      if (!files.length) return;
      box.innerHTML = `<div class="bf-vuoto">🔎 Tony sta leggendo il foglio…</div>`;
      try {
        const foto = await Promise.all(files.map(riduci));
        const s = await sb().auth.getSession();
        const r = await fetch(URL_EF, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (s?.data?.session?.access_token || "") },
          body: JSON.stringify({ azienda_id: az.id, foto }) });
        const d = await r.json();
        if (d.errore || !d.banchetto) return inizio(d.errore || "Non riuscito");
        B = d.banchetto;
        B.sede = sedeDefault; B.luogo = "Campo Antico"; B.pp = ""; B.pp_bimbi = ""; B.acconto = "";
        (B.portate || []).forEach((p) => { p.ricetta_id = p.ricetta_id || ""; });
        scheda();
      } catch (err) { inizio("Invio non riuscito: " + (err.message || err) + ". Riprova quando hai campo."); }
    });
  }

  function scheda() {
    const ad = Number(B.adulti) || 0, bi = Number(B.bambini) || 0;
    box.innerHTML = `
      <h2 class="bf-tit">📷 Controlla il banchetto</h2>
      <div class="bf-sub">Correggi quello che Tony ha letto male, poi crea l'evento.</div>
      ${B.numero_corretto_a_mano ? `<div class="bf-warn">⚠ Il numero degli ospiti è corretto a mano sul foglio: controllalo.</div>` : ""}
      <div class="bf-c">
        <label>Evento<input class="bf-in" data-b="titolo" value="${esc(B.titolo)}"></label>
        <div class="bf-r"><label>Tipo<select class="bf-in" data-b="tipo">${TIPI.map((t) => `<option ${t === B.tipo ? "selected" : ""}>${t}</option>`).join("")}</select></label>
          <label>Sede<select class="bf-in" data-b="sede">${(sedi || []).map((s) => `<option value="${s.id}" ${s.id === B.sede ? "selected" : ""}>${esc(s.nome)}</option>`).join("")}</select></label></div>
        <div class="bf-r"><label>Giorno<input class="bf-in" type="date" data-b="data" value="${esc(B.data)}"></label>
          <label>Ora<input class="bf-in" type="time" data-b="ora" value="${esc(B.ora || "13:00")}"></label></div>
        <div class="bf-r"><label>Adulti<input class="bf-in" type="number" data-b="adulti" value="${ad}"></label>
          <label>Bambini<input class="bf-in" type="number" data-b="bambini" value="${bi}"></label>
          <label>Luogo<input class="bf-in" data-b="luogo" value="${esc(B.luogo)}"></label></div>
        <label>Intolleranze<input class="bf-in" data-b="intolleranze" value="${esc(B.intolleranze || "")}" placeholder="es. 1 celiaco, 2 lattosio"></label>
        <div class="bf-r"><label>€ a persona<input class="bf-in" type="number" step="0.5" data-b="pp" value="${esc(B.pp)}" placeholder="facoltativo"></label>
          <label>€ bambino<input class="bf-in" type="number" step="0.5" data-b="pp_bimbi" value="${esc(B.pp_bimbi)}" placeholder="facoltativo"></label>
          <label>Acconto €<input class="bf-in" type="number" step="1" data-b="acconto" value="${esc(B.acconto)}" placeholder="facoltativo"></label></div>
      </div>
      <h3 class="bf-h">Menu</h3>
      ${(B.portate || []).map((p, i) => `<div class="bf-p" data-i="${i}">
        <div class="bf-r"><select class="bf-in bf-sez" data-p="sezione">${SEZIONI.map((s) => `<option ${s === p.sezione ? "selected" : ""}>${s}</option>`).join("")}</select>
          <button class="bf-x" data-via="${i}">✕</button></div>
        <input class="bf-in" data-p="nome" value="${esc(p.nome)}">
        <select class="bf-in ${p.ricetta_id ? "" : "bf-noric"}" data-p="ricetta_id">
          <option value="">⚠ Nessuna ricetta (la colleghi dopo nella scheda evento)</option>
          ${(p.candidate || []).map((c) => `<option value="${c.id}" ${String(c.id) === String(p.ricetta_id) ? "selected" : ""}>Ricetta: ${esc(c.nome)}${c.stato === "completa" ? " ✓" : ""}</option>`).join("")}
        </select>
        ${p.a_scelta ? `<div class="bf-nota">A scelta: la quantità parte da metà degli adulti, correggila nella scheda evento.</div>` : ""}
      </div>`).join("")}
      <button class="bf-add">＋ Aggiungi portata</button>
      <div class="bf-barra"><button class="bf-ann">Rifai foto</button><button class="bf-ok">✓ Crea evento e pianifica</button></div>`;
    box.querySelectorAll("[data-b]").forEach((el) => el.addEventListener("input", () => { B[el.dataset.b] = el.value; }));
    box.querySelectorAll(".bf-p").forEach((el) => {
      const p = B.portate[Number(el.dataset.i)];
      el.querySelectorAll("[data-p]").forEach((c) => c.addEventListener(c.tagName === "SELECT" ? "change" : "input", () => { p[c.dataset.p] = c.value; if (c.dataset.p === "ricetta_id") c.classList.toggle("bf-noric", !c.value); }));
    });
    box.querySelectorAll("[data-via]").forEach((b) => b.addEventListener("click", () => { B.portate.splice(Number(b.dataset.via), 1); scheda(); }));
    box.querySelector(".bf-add").addEventListener("click", () => { B.portate.push({ sezione: "Antipasti", nome: "", ricetta_id: "", candidate: [] }); scheda(); });
    box.querySelector(".bf-ann").addEventListener("click", () => inizio());
    box.querySelector(".bf-ok").addEventListener("click", crea);
  }

  async function crea() {
    const btn = box.querySelector(".bf-ok"); btn.disabled = true; btn.textContent = "Creo l'evento…";
    try {
      const ad = Number(B.adulti) || 0, bi = Number(B.bambini) || 0, pp = Number(B.pp) || 0, ppb = Number(B.pp_bimbi) || 0, acc = Number(B.acconto) || 0;
      const portate = (B.portate || []).filter((p) => (p.nome || "").trim());
      if (!B.titolo || !B.data || !portate.length) throw new Error("servono almeno nome, giorno e una portata");
      const tot = pp * ad + ppb * bi;
      const { data: prev, error } = await sb().from("preventivi").insert({
        azienda_id: az.id, sede_uuid: B.sede, titolo_evento: B.titolo, tipo_servizio: B.tipo || "Altro", data_evento: B.data, ora_evento: B.ora || null,
        n_invitati: ad + bi, n_bambini: bi, location: B.luogo || null, intolleranze: B.intolleranze || null, stato: "trattativa", formula_servizio: "servito",
        cliente_nome: B.titolo, nome_festeggiato: B.titolo, prezzo_bambino: ppb || null, subtotale_menu: tot || null, totale: tot || null, acconto: acc || null,
        acconto_versato: acc || null, acconto_versato_il: acc ? new Date().toISOString() : null,
        note: "Caricato da foto con Tony il " + new Date().toLocaleDateString("it-IT") + (B.note ? ". " + B.note : ""),
      }).select("id").single();
      if (error) throw error;
      const adulte = portate.filter((p) => p.sezione !== "Menu bambini");
      const quota = adulte.length && pp ? Math.floor(pp / adulte.length * 100) / 100 : 0;
      const righe = portate.map((p, i) => ({
        preventivo_id: prev.id, azienda_id: az.id, sede_uuid: B.sede, sezione_menu: p.sezione, nome_portata: p.nome.trim(),
        ricetta_id: p.ricetta_id ? Number(p.ricetta_id) : null, ricetta_placeholder: !p.ricetta_id,
        quantita: p.sezione === "Menu bambini" ? bi : p.a_scelta ? Math.ceil(ad / 2) : ad,
        prezzo_unitario: p.sezione === "Menu bambini" ? (ppb || null) : (quota ? (p === adulte[adulte.length - 1] ? Math.round((pp - quota * (adulte.length - 1)) * 100) / 100 : quota) : null),
      }));
      const { error: e2 } = await sb().from("preventivi_righe").insert(righe);
      if (e2) throw e2;
      // confermato: prenotazione, lotti e planning (poi regole del cervello e lotti unici)
      const { error: e3 } = await sb().from("preventivi").update({ stato: "confermato", confermato_il: new Date().toISOString() }).eq("id", prev.id);
      if (e3) throw e3;
      await sb().rpc("evento_sincronizza_produzione", { p_preventivo: prev.id });
      box.innerHTML = `<h2 class="bf-tit">✓ Evento creato</h2>
        <div class="bf-sub"><b>${esc(B.titolo)}</b>: prenotazione, lotti e planning del Centro cottura sono pronti.</div>
        <a class="bf-link" href="#/scheda-evento?id=${prev.id}">🗂 Apri la scheda evento</a>
        <a class="bf-link bf-sec" href="#/spesa-banchetti">🛒 Spesa banchetti</a>
        <button class="bf-link bf-sec" id="bf-altro">📷 Carica un altro banchetto</button>`;
      box.querySelector("#bf-altro").addEventListener("click", () => inizio());
    } catch (err) {
      btn.disabled = false; btn.textContent = "✓ Crea evento e pianifica";
      alert("Non creato: " + (err.message || err));
    }
  }

  inizio();
}

function stile() {
  return `<style>
  .bf{max-width:720px;margin:0 auto;padding:16px 14px 90px;}
  .bf-tit{margin:0;font-size:22px;font-weight:800;}
  .bf-sub{font-size:13.5px;color:#64748b;margin:4px 0 12px;}
  .bf-h{margin:16px 0 6px;font-size:15px;font-weight:800;}
  .bf-foto{display:block;text-align:center;background:#0E5A7A;color:#fff;border-radius:14px;padding:22px;font-weight:800;font-size:17px;cursor:pointer;}
  .bf-c,.bf-p{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px;display:grid;gap:8px;margin-bottom:8px;}
  .bf-c label{font-size:12px;color:#64748b;font-weight:700;display:grid;gap:3px;flex:1;min-width:0;}
  .bf-r{display:flex;gap:8px;align-items:flex-end;}
  .bf-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:9px;padding:8px;font-size:15px;font-family:inherit;background:#fff;min-width:0;color:#0f172a;font-weight:400;}
  .bf-sez{font-weight:700;color:#0E5A7A;}
  .bf-noric{border-color:#f59e0b;background:#fffbeb;}
  .bf-x{flex:none;border:0;background:#f1f5f9;border-radius:8px;width:38px;height:38px;cursor:pointer;}
  .bf-nota{font-size:12px;color:#92400e;}
  .bf-warn{background:#fffbeb;color:#92400e;border-radius:10px;padding:8px 10px;font-size:13px;font-weight:700;margin-bottom:8px;}
  .bf-err{background:#fef2f2;color:#b91c1c;border-radius:10px;padding:8px 10px;font-size:13px;margin-bottom:10px;}
  .bf-add{width:100%;border:1.5px dashed #0E5A7A;background:#f0f9ff;color:#0E5A7A;border-radius:12px;padding:11px;font-weight:800;cursor:pointer;}
  .bf-barra{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #e2e8f0;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));display:flex;gap:8px;z-index:50;}
  .bf-barra button{border:0;border-radius:12px;padding:13px;font-weight:800;cursor:pointer;}
  .bf-ann{flex:1;background:#f1f5f9;} .bf-ok{flex:2;background:#0E5A7A;color:#fff;} .bf-ok:disabled{opacity:.5;}
  .bf-link{display:block;text-align:center;text-decoration:none;background:#0E5A7A;color:#fff;border-radius:12px;padding:13px;font-weight:800;margin-top:8px;border:0;width:100%;font-size:15px;}
  .bf-sec{background:#f1f5f9;color:#0E5A7A;}
  .bf-vuoto{color:#64748b;text-align:center;padding:40px 10px;font-size:15px;}
  </style>`;
}
