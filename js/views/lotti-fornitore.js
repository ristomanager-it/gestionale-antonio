// js/views/lotti-fornitore.js
// 📷 Lotti in arrivo: foto all'etichetta della merce (pecorino, guanciale...), Tony legge
// prodotto, lotto e scadenza, l'operatore conferma. Da quel momento ogni produzione che usa
// il prodotto aggancia da sola il lotto che scade prima (tracciabilita' completa).
import { comprimiImmagine } from "../utils/immagini.js";

const URL_EF = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-etichetta-lotto";
const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fd = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("it-IT") : "—");
const giorniA = (d) => (d ? Math.round((new Date(d + "T00:00:00") - new Date(new Date().toDateString())) / 86400000) : null);

export async function render(app) {
  const az = window.state?.azienda?.id;
  if (!az) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  let scheda = "in_uso";
  let cerca = "";
  let lista = [];

  app.innerHTML = `${stile()}<div class="lf">
    <h2 class="lf-tit">📷 Lotti in arrivo</h2>
    <div class="lf-sub">Fotografa l'etichetta della merce: Tony legge lotto e scadenza. Le produzioni agganciano da sole il lotto che scade prima.</div>
    <label class="lf-foto">📷 Fotografa l'etichetta
      <input id="lf-file" type="file" accept="image/*" capture="environment" hidden></label>
    <button id="lf-mano" class="lf-mano" type="button">✏️ Inserisci a mano</button>
    <div id="lf-scheda"></div>
    <div class="lf-tabs"><button data-t="in_uso" class="on">In uso</button><button data-t="finito">Finiti</button></div>
    <input id="lf-cerca" class="lf-in" placeholder="Cerca prodotto o lotto">
    <div id="lf-lista"><div class="lf-vuoto">Un attimo…</div></div>
  </div>`;

  const elScheda = app.querySelector("#lf-scheda");
  app.querySelector("#lf-file").addEventListener("change", (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) leggiFoto(f); });
  app.querySelector("#lf-mano").addEventListener("click", () => apriScheda({ letto: {}, candidati: [] }));
  app.querySelector("#lf-cerca").addEventListener("input", (e) => { cerca = e.target.value.toLowerCase(); disegna(); });
  app.querySelectorAll(".lf-tabs button").forEach((b) => b.addEventListener("click", async () => {
    scheda = b.dataset.t;
    app.querySelectorAll(".lf-tabs button").forEach((x) => x.classList.toggle("on", x === b));
    await carica();
  }));
  await carica();

  async function carica() {
    const { data, error } = await sb().from("lotti_fornitore")
      .select("id, prodotto_id, prodotto_letto, produttore, lotto, data_scadenza, tipo_data, quantita, unita, foto_url, ricevuto_il, stato, prodotti(nome)")
      .eq("azienda_id", az).eq("stato", scheda)
      .order(scheda === "in_uso" ? "data_scadenza" : "created_at", { ascending: scheda === "in_uso", nullsFirst: false })
      .limit(300);
    if (error) { app.querySelector("#lf-lista").innerHTML = `<div class="lf-err">Errore: ${esc(error.message)}</div>`; return; }
    lista = data || [];
    disegna();
  }

  function disegna() {
    const el = app.querySelector("#lf-lista");
    const righe = lista.filter((l) => !cerca || [l.prodotti?.nome, l.prodotto_letto, l.lotto, l.produttore].join(" ").toLowerCase().includes(cerca));
    if (!righe.length) { el.innerHTML = `<div class="lf-vuoto">${scheda === "in_uso" ? "Nessun lotto in uso. Fotografa la prima etichetta." : "Nessun lotto finito."}</div>`; return; }
    el.innerHTML = righe.map((l) => {
      const g = giorniA(l.data_scadenza);
      const col = g == null ? "#64748b" : g < 0 ? "#b91c1c" : g <= 3 ? "#b45309" : "#15803d";
      const quando = g == null ? "" : g < 0 ? "scaduto" : g === 0 ? "scade oggi" : g === 1 ? "scade domani" : "tra " + g + " giorni";
      return `<div class="lf-card">
        <div class="lf-r1"><b>${esc(l.prodotti?.nome || l.prodotto_letto || "Prodotto da collegare")}</b>
          ${l.foto_url ? `<a href="${esc(l.foto_url)}" target="_blank" class="lf-ft">foto</a>` : ""}</div>
        <div class="lf-r2">Lotto <b>${esc(l.lotto)}</b> · ${l.tipo_data === "tmc" ? "pref. entro" : "scade"} <b style="color:${col}">${fd(l.data_scadenza)}</b>
          ${quando ? `<span style="color:${col}">(${quando})</span>` : ""}</div>
        <div class="lf-r3">${l.quantita ? esc(String(l.quantita).replace(".", ",")) + " " + esc(l.unita || "") + " · " : ""}arrivato il ${fd(l.ricevuto_il)}${l.produttore ? " · " + esc(l.produttore) : ""}
          ${!l.prodotto_id ? ` · <span style="color:#b45309;font-weight:700;">non collegato all'anagrafica</span>` : ""}</div>
        ${scheda === "in_uso" ? `<button class="lf-fin" data-id="${l.id}">✓ Finito</button>` : `<button class="lf-fin" data-riapri="${l.id}">↺ Rimetti in uso</button>`}
      </div>`;
    }).join("");
    el.querySelectorAll("[data-id]").forEach((b) => b.addEventListener("click", () => cambiaStato(b.dataset.id, "finito")));
    el.querySelectorAll("[data-riapri]").forEach((b) => b.addEventListener("click", () => cambiaStato(b.dataset.riapri, "in_uso")));
  }

  async function cambiaStato(id, stato) {
    const { error } = await sb().from("lotti_fornitore").update({ stato }).eq("id", id);
    if (error) { alert("Non salvato: " + error.message); return; }
    await carica();
  }

  async function leggiFoto(file) {
    elScheda.innerHTML = `<div class="lf-box"><div class="lf-leggo">🔎 Tony legge l'etichetta…</div></div>`;
    try {
      const img = await comprimiImmagine(file, { latoMax: 1600, forza: true });
      const b64 = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = ko; r.readAsDataURL(img); });
      // la foto resta come prova (tracciabilita'), in parallelo alla lettura
      const percorso = `lotti-fornitore/${az}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
      const upload = sb().storage.from("media-aziende").upload(percorso, img, { upsert: false, cacheControl: "31536000", contentType: img.type || "image/jpeg" })
        .then(({ error }) => error ? "" : sb().storage.from("media-aziende").getPublicUrl(percorso).data?.publicUrl || "").catch(() => "");
      const { data: { session } } = await sb().auth.getSession();
      const r = await fetch(URL_EF, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (session?.access_token || "") },
        body: JSON.stringify({ azienda_id: az, immagine_base64: b64, mime: img.type || "image/jpeg" }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.errore || "lettura non riuscita");
      d.foto_url = await upload;
      apriScheda(d);
    } catch (e) {
      elScheda.innerHTML = `<div class="lf-box"><div class="lf-err">Non sono riuscito a leggere la foto (${esc(e.message || e)}). Riprova con più luce o inserisci a mano.</div></div>`;
    }
  }

  function apriScheda({ letto = {}, candidati = [], foto_url = "" }) {
    const opz = candidati.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("");
    elScheda.innerHTML = `<div class="lf-box">
      ${letto.prodotto ? `<div class="lf-letto">Letto: <b>${esc(letto.prodotto)}</b>${letto.produttore ? " · " + esc(letto.produttore) : ""}</div>` : ""}
      ${letto.dubbi ? `<div class="lf-dubbi">⚠ ${esc(letto.dubbi)}</div>` : ""}
      <label class="lf-lab">Prodotto dell'anagrafica</label>
      <select id="lf-prod" class="lf-in">${opz}<option value="">— nessuno di questi —</option></select>
      <input id="lf-prod-cerca" class="lf-in" placeholder="Non c'è? Cerca un altro prodotto" style="margin-top:6px;">
      <div class="lf-g2">
        <div><label class="lf-lab">Lotto</label><input id="lf-lotto" class="lf-in lf-big" value="${esc(letto.lotto || "")}"></div>
        <div><label class="lf-lab">Scadenza</label><input id="lf-scad" type="date" class="lf-in" value="${esc(letto.scadenza || "")}"></div>
      </div>
      <div class="lf-g2">
        <div><label class="lf-lab">Tipo di data</label><select id="lf-tipo" class="lf-in">
          <option value="scadenza" ${letto.tipo_data !== "tmc" ? "selected" : ""}>Da consumarsi entro</option>
          <option value="tmc" ${letto.tipo_data === "tmc" ? "selected" : ""}>Preferibilmente entro</option></select></div>
        <div><label class="lf-lab">Quantità</label><div style="display:flex;gap:6px;">
          <input id="lf-q" type="number" step="0.01" class="lf-in" value="${esc(letto.peso ?? "")}">
          <input id="lf-u" class="lf-in" style="width:70px;" value="${esc(letto.unita || "kg")}"></div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="lf-annulla" class="lf-sec" type="button">Annulla</button>
        <button id="lf-salva" class="lf-pri" type="button">💾 Salva lotto</button>
      </div>
      <div id="lf-esito" class="lf-err"></div>
    </div>`;
    const selProd = elScheda.querySelector("#lf-prod");
    let timer;
    elScheda.querySelector("#lf-prod-cerca").addEventListener("input", (e) => {
      clearTimeout(timer);
      const t = e.target.value.trim();
      if (t.length < 3) return;
      timer = setTimeout(async () => {
        const { data } = await sb().rpc("prodotti_simili", { p_azienda: az, p_testo: t, p_max: 10 });
        selProd.innerHTML = (data || []).map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("") + `<option value="">— nessuno di questi —</option>`;
      }, 300);
    });
    elScheda.querySelector("#lf-annulla").addEventListener("click", () => { elScheda.innerHTML = ""; });
    elScheda.querySelector("#lf-salva").addEventListener("click", async (ev) => {
      const v = (id) => elScheda.querySelector(id).value.trim();
      const esito = elScheda.querySelector("#lf-esito");
      if (!v("#lf-lotto")) { esito.textContent = "Manca il lotto"; return; }
      if (!selProd.value) { esito.textContent = "Scegli il prodotto: senza, il lotto non si aggancia alle produzioni"; return; }
      ev.target.disabled = true; ev.target.textContent = "Salvo…";
      const { error } = await sb().from("lotti_fornitore").insert({
        azienda_id: az, sede_id: window.state?.sedeAttiva?.id || null,
        prodotto_id: Number(selProd.value), prodotto_letto: letto.prodotto || null, produttore: letto.produttore || null,
        lotto: v("#lf-lotto"), data_scadenza: v("#lf-scad") || null, tipo_data: v("#lf-tipo"),
        quantita: v("#lf-q") ? Number(v("#lf-q").replace(",", ".")) : null, unita: v("#lf-u") || null,
        foto_url: foto_url || null, letto_da: Object.keys(letto).length ? letto : null,
      });
      if (error) { esito.textContent = "Non salvato: " + error.message; ev.target.disabled = false; ev.target.textContent = "💾 Salva lotto"; return; }
      elScheda.innerHTML = `<div class="lf-box lf-ok">✓ Lotto salvato. Le prossime produzioni lo useranno in automatico.</div>`;
      setTimeout(() => { if (elScheda.querySelector(".lf-ok")) elScheda.innerHTML = ""; }, 4000);
      scheda = "in_uso";
      app.querySelectorAll(".lf-tabs button").forEach((x) => x.classList.toggle("on", x.dataset.t === "in_uso"));
      await carica();
    });
  }
}

function stile() {
  return `<style>
  .lf{max-width:720px;margin:0 auto;padding:16px;}
  .lf-tit{margin:0;font-size:22px;font-weight:800;}
  .lf-sub{font-size:13.5px;color:#64748b;margin:4px 0 14px;}
  .lf-foto{display:block;text-align:center;background:#0E5A7A;color:#fff;border-radius:14px;padding:16px;font-size:17px;font-weight:800;cursor:pointer;}
  .lf-mano{width:100%;margin-top:8px;border:1.5px solid #cbd5e1;background:#fff;border-radius:12px;padding:11px;font-weight:700;color:#0E5A7A;cursor:pointer;}
  .lf-box{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-top:12px;}
  .lf-leggo{font-weight:700;color:#0E5A7A;text-align:center;padding:10px;}
  .lf-letto{font-size:13.5px;margin-bottom:6px;}
  .lf-dubbi{font-size:13px;background:#fffbeb;color:#92400e;border-radius:8px;padding:7px 9px;margin-bottom:6px;}
  .lf-lab{display:block;font-size:12px;font-weight:700;color:#64748b;margin:10px 0 4px;}
  .lf-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px;font-size:15px;font-family:inherit;background:#fff;}
  .lf-big{font-size:17px;font-weight:800;letter-spacing:.5px;}
  .lf-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .lf-pri{flex:2;border:0;border-radius:12px;padding:13px;background:#0E5A7A;color:#fff;font-size:15px;font-weight:800;cursor:pointer;}
  .lf-sec{flex:1;border:0;border-radius:12px;padding:13px;background:#f1f5f9;font-size:15px;font-weight:700;cursor:pointer;}
  .lf-err{color:#b91c1c;font-size:13px;margin-top:8px;}
  .lf-ok{color:#15803d;font-weight:700;}
  .lf-tabs{display:flex;gap:6px;margin:18px 0 8px;}
  .lf-tabs button{flex:1;border:1.5px solid #e2e8f0;background:#fff;border-radius:10px;padding:9px;font-weight:700;cursor:pointer;}
  .lf-tabs button.on{background:#0E5A7A;color:#fff;border-color:#0E5A7A;}
  .lf-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:11px 12px;margin-top:8px;}
  .lf-r1{display:flex;justify-content:space-between;gap:8px;font-size:15px;}
  .lf-r2{font-size:13.5px;margin-top:3px;}
  .lf-r3{font-size:12px;color:#64748b;margin-top:3px;}
  .lf-ft{font-size:12px;color:#0E5A7A;font-weight:700;}
  .lf-fin{margin-top:8px;border:0;background:#f1f5f9;border-radius:9px;padding:7px 12px;font-weight:700;cursor:pointer;font-size:13px;}
  .lf-vuoto{color:#64748b;text-align:center;padding:24px;}
  </style>`;
}
