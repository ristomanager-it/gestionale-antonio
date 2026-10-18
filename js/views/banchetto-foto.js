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
  // 18/10/2026: piu' banchetti nella stessa sessione (una foto = un foglio; i fogli che continuano si uniscono
  // al precedente) e pulsanti di salvataggio dentro la pagina (la barra fissa finiva sotto la barra in basso).
  const lista = [];
  let leggendo = 0;
  app.innerHTML = stile() + `<div class="bf"></div>`;
  const box = app.querySelector(".bf");

  function elenco(msg) {
    const daSalvare = lista.filter((b) => !b.salvato);
    box.innerHTML = `
      <h2 class="bf-tit">📷 Banchetti da foto</h2>
      <div class="bf-sub">Fotografa i fogli dei banchetti: anche più banchetti insieme, una foto per foglio. Se un foglio continua quello prima, Tony li unisce. Controlla ogni banchetto e salva.</div>
      ${msg ? `<div class="bf-err">${esc(msg)}</div>` : ""}
      <label class="bf-foto">📷 ${lista.length ? "Aggiungi altri fogli" : "Scatta o scegli le foto"}<input type="file" accept="image/*" multiple hidden></label>
      ${leggendo ? `<div class="bf-vuoto">🔎 Tony sta leggendo ${leggendo} ${leggendo === 1 ? "foglio" : "fogli"}…</div>` : ""}
      ${lista.map((b, i) => `<button class="bf-card ${b.salvato ? "bf-fatto" : ""}" data-i="${i}" type="button">
        <div class="bf-r1"><b>${esc(b.titolo || "Banchetto senza nome")}</b><span>${b.salvato ? "✓ salvato" : "da controllare"}</span></div>
        <div class="bf-r3">${esc([b.data ? new Date(b.data + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "numeric" }) : "giorno da indicare", b.ora, `${(Number(b.adulti) || 0) + (Number(b.bambini) || 0)} ospiti`, `${(b.portate || []).length} portate`, b.fogli > 1 ? `${b.fogli} fogli` : ""].filter(Boolean).join(" · "))}</div>
        ${b.errore ? `<div class="bf-r3" style="color:#b91c1c">${esc(b.errore)}</div>` : ""}
      </button>`).join("")}
      ${daSalvare.length > 1 ? `<button class="bf-link" id="bf-tutti" type="button">💾 Salva tutti e pianifica (${daSalvare.length})</button>` : ""}
      ${lista.length && !daSalvare.length ? `<a class="bf-link bf-sec" href="#/planner-produzione">📋 Vai al planning</a>` : ""}`;
    box.querySelector("input[type=file]").addEventListener("change", (e) => { const f = [...e.target.files]; e.target.value = ""; if (f.length) leggi(f.slice(0, 10)); });
    box.querySelectorAll(".bf-card").forEach((c) => c.addEventListener("click", () => scheda(Number(c.dataset.i))));
    box.querySelector("#bf-tutti")?.addEventListener("click", salvaTutti);
  }

  async function leggiUna(file) {
    const foto = [await riduci(file)];
    const s = await sb().auth.getSession();
    const r = await fetch(URL_EF, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (s?.data?.session?.access_token || "") },
      body: JSON.stringify({ azienda_id: az.id, foto }) });
    const d = await r.json();
    if (d.errore || !d.banchetto) throw new Error(d.errore || "foglio non letto");
    return d.banchetto;
  }

  async function leggi(files) {
    leggendo += files.length; elenco();
    // un foglio alla volta in parallelo; l'ordine delle foto resta quello scelto
    const risultati = await Promise.all(files.map((f) => leggiUna(f).then((b) => ({ b }), (e) => ({ e }))));
    leggendo -= files.length;
    const errori = [];
    for (const r of risultati) {
      if (r.e) { errori.push(r.e.message || String(r.e)); continue; }
      const b = r.b;
      (b.portate || []).forEach((p) => { p.ricetta_id = p.ricetta_id || ""; });
      const prec = lista[lista.length - 1];
      const continua = prec && !prec.salvato && ((!b.titolo && !b.data) || (b.data && b.data === prec.data && norm(b.titolo) === norm(prec.titolo)));
      if (continua) {
        // foglio che continua il precedente: si aggiungono le portate e i dati mancanti
        prec.portate = [...(prec.portate || []), ...(b.portate || [])];
        prec.fogli = (prec.fogli || 1) + 1;
        if (!prec.intolleranze && b.intolleranze) prec.intolleranze = b.intolleranze;
        continue;
      }
      b.sede = sedeDefault; b.luogo = "Campo Antico"; b.pp = ""; b.pp_bimbi = ""; b.acconto = ""; b.fogli = 1;
      lista.push(b);
    }
    elenco(errori.length ? `${errori.length} ${errori.length === 1 ? "foglio non letto" : "fogli non letti"}: ${errori[0]}. Rifai la foto.` : "");
  }

  function scheda(i) {
    const B = lista[i];
    const ad = Number(B.adulti) || 0, bi = Number(B.bambini) || 0;
    box.innerHTML = `
      <button class="bf-indietro" type="button">← Tutti i banchetti (${lista.length})</button>
      <h2 class="bf-tit">📷 Controlla il banchetto</h2>
      <div class="bf-sub">Correggi quello che Tony ha letto male, poi salva.${B.fogli > 1 ? ` Letto da ${B.fogli} fogli.` : ""}</div>
      ${B.salvato ? `<div class="bf-ok-msg">✓ Già salvato. <a href="#/scheda-evento?id=${B.prevId}">Apri la scheda evento</a></div>` : ""}
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
      ${(B.portate || []).map((p, k) => `<div class="bf-p" data-k="${k}">
        <div class="bf-r"><select class="bf-in bf-sez" data-p="sezione">${SEZIONI.map((s) => `<option ${s === p.sezione ? "selected" : ""}>${s}</option>`).join("")}</select>
          <button class="bf-x" data-via="${k}" type="button">✕</button></div>
        <input class="bf-in" data-p="nome" value="${esc(p.nome)}">
        <select class="bf-in ${p.ricetta_id ? "" : "bf-noric"}" data-p="ricetta_id">
          <option value="">⚠ Nessuna ricetta (la colleghi dopo nella scheda evento)</option>
          ${(p.candidate || []).map((c) => `<option value="${c.id}" ${String(c.id) === String(p.ricetta_id) ? "selected" : ""}>Ricetta: ${esc(c.nome)}${c.stato === "completa" ? " ✓" : ""}</option>`).join("")}
        </select>
        ${p.a_scelta ? `<div class="bf-nota">A scelta: la quantità parte da metà degli adulti, correggila nella scheda evento.</div>` : ""}
      </div>`).join("")}
      <button class="bf-add" type="button">＋ Aggiungi portata</button>
      <div class="bf-azioni">
        <button class="bf-ann" type="button">🗑 Togli</button>
        <button class="bf-ok" type="button" ${B.salvato ? "disabled" : ""}>${B.salvato ? "✓ Salvato" : "💾 Salva e pianifica"}</button>
      </div>`;
    box.querySelectorAll("[data-b]").forEach((el) => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => { B[el.dataset.b] = el.value; }));
    box.querySelectorAll(".bf-p").forEach((el) => {
      const p = B.portate[Number(el.dataset.k)];
      el.querySelectorAll("[data-p]").forEach((c) => c.addEventListener(c.tagName === "SELECT" ? "change" : "input", () => { p[c.dataset.p] = c.value; if (c.dataset.p === "ricetta_id") c.classList.toggle("bf-noric", !c.value); }));
    });
    box.querySelectorAll("[data-via]").forEach((b) => b.addEventListener("click", () => { B.portate.splice(Number(b.dataset.via), 1); scheda(i); }));
    box.querySelector(".bf-add").addEventListener("click", () => { B.portate.push({ sezione: "Antipasti", nome: "", ricetta_id: "", candidate: [] }); scheda(i); });
    box.querySelector(".bf-indietro").addEventListener("click", () => elenco());
    box.querySelector(".bf-ann").addEventListener("click", () => {
      if (B.salvato) { alert("È già salvato: per cancellarlo apri la scheda evento."); return; }
      if (!confirm("Togliere questo banchetto dall'elenco? Non viene salvato.")) return;
      lista.splice(i, 1); elenco();
    });
    box.querySelector(".bf-ok").addEventListener("click", async () => {
      const btn = box.querySelector(".bf-ok"); btn.disabled = true; btn.textContent = "Salvo…";
      try { await salva(B); elenco(); }
      catch (err) { btn.disabled = false; btn.textContent = "💾 Salva e pianifica"; alert("Non salvato: " + (err.message || err)); }
    });
  }

  async function salvaTutti() {
    const btn = box.querySelector("#bf-tutti"); if (btn) { btn.disabled = true; btn.textContent = "Salvo…"; }
    for (const B of lista.filter((b) => !b.salvato)) {
      try { await salva(B); B.errore = ""; } catch (err) { B.errore = "Non salvato: " + (err.message || err); }
    }
    const ko = lista.filter((b) => !b.salvato).length;
    elenco(ko ? `${ko} non ${ko === 1 ? "salvato" : "salvati"}: aprili, correggi e riprova.` : "");
  }

  async function salva(B) {
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
    const righe = portate.map((p) => ({
      preventivo_id: prev.id, azienda_id: az.id, sede_uuid: B.sede, sezione_menu: p.sezione, nome_portata: p.nome.trim(),
      ricetta_id: p.ricetta_id ? Number(p.ricetta_id) : null, ricetta_placeholder: !p.ricetta_id,
      quantita: p.sezione === "Menu bambini" ? bi : p.a_scelta ? Math.ceil(ad / 2) : ad,
      prezzo_unitario: p.sezione === "Menu bambini" ? (ppb || null) : (quota ? (p === adulte[adulte.length - 1] ? Math.round((pp - quota * (adulte.length - 1)) * 100) / 100 : quota) : null),
    }));
    const { error: e2 } = await sb().from("preventivi_righe").insert(righe);
    if (e2) throw e2;
    const { error: e3 } = await sb().from("preventivi").update({ stato: "confermato", confermato_il: new Date().toISOString() }).eq("id", prev.id);
    if (e3) throw e3;
    await sb().rpc("evento_sincronizza_produzione", { p_preventivo: prev.id });
    B.salvato = true; B.prevId = prev.id;
  }

  elenco();
}

const norm = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function stile() {
  return `<style>
  .bf{max-width:720px;margin:0 auto;padding:16px 14px 110px;}
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
  .bf-azioni{display:flex;gap:8px;margin-top:14px;}
  .bf-azioni button{border:0;border-radius:12px;padding:14px;font-weight:800;cursor:pointer;font-size:15px;}
  .bf-card{display:block;width:100%;text-align:left;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:11px 12px;margin-top:8px;cursor:pointer;font:inherit;color:inherit;}
  .bf-fatto{border-color:#86efac;background:#f0fdf4;}
  .bf-r1{display:flex;justify-content:space-between;gap:8px;font-size:15px;}
  .bf-r1 span{font-size:12px;font-weight:700;color:#0E5A7A;white-space:nowrap;}
  .bf-r3{font-size:12.5px;color:#64748b;margin-top:3px;}
  .bf-indietro{border:0;background:none;color:#0E5A7A;font-weight:700;cursor:pointer;padding:0 0 8px;font-size:14px;}
  .bf-ok-msg{background:#f0fdf4;color:#15803d;border-radius:10px;padding:8px 10px;font-size:13px;font-weight:700;margin-bottom:8px;}
  .bf-ann{flex:1;background:#f1f5f9;} .bf-ok{flex:2;background:#0E5A7A;color:#fff;} .bf-ok:disabled{opacity:.5;}
  .bf-link{display:block;text-align:center;text-decoration:none;background:#0E5A7A;color:#fff;border-radius:12px;padding:13px;font-weight:800;margin-top:8px;border:0;width:100%;font-size:15px;}
  .bf-sec{background:#f1f5f9;color:#0E5A7A;}
  .bf-vuoto{color:#64748b;text-align:center;padding:40px 10px;font-size:15px;}
  </style>`;
}
