// js/components/cerca.js
// 🔍 Barra "Cerca" in alto: chi lavora chiede "a quanto cuocio il salmone" o "come gestisco una lamentela".
// 1) mentre scrive, risposta immediata dalle regole e dalle ricette del locale (RPC cerca_sapere, gratis)
// 2) se non basta, "Chiedi a Tony" (Edge Function tony-cerca): risponde dalle stesse fonti, non inventa tempi e temperature
// 3) le domande finiscono in ricerca_domande: quelle senza risposta sono le regole da scrivere (le vede l'admin)

const URL_TONY = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-cerca";
const URL_TRASCRIVI = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-trascrivi";
const CHIAVE_RECENTI = "rf_cerca_recenti";

let ov = null, inp = null, lista = null, timer = null, ultimaQ = "", ultimoLog = "", nRisultati = 0, seq = 0;
let rec = null, pezzi = [], stream = null;

const sb = () => window.supabaseClient || window.supabase;
const aziendaId = () => window.state?.azienda?.id || null;
const isAdmin = () => ["admin", "superadmin", "manager"].includes(String(window.state?.ruoloRaw || window.state?.ruolo || "").toLowerCase());
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = (n) => (n == null || n === "" ? null : String(+(+n).toFixed(1)).replace(".", ","));

function recenti() { try { return JSON.parse(localStorage.getItem(CHIAVE_RECENTI) || "[]"); } catch (_) { return []; } }
function salvaRecente(q) {
  try { const r = [q, ...recenti().filter((x) => x !== q)].slice(0, 6); localStorage.setItem(CHIAVE_RECENTI, JSON.stringify(r)); } catch (_) {}
}

/* ─────────────── pulsante nell'header ─────────────── */
export function montaCerca() {
  if (!window.state?.user || !aziendaId()) { document.getElementById("cerca-btn-header")?.remove(); return; }
  const hr = document.getElementById("header-right");
  if (!hr || document.getElementById("cerca-btn-header")) return;
  stile();
  const b = document.createElement("button");
  b.id = "cerca-btn-header";
  b.type = "button";
  b.title = "Cerca o chiedi";
  b.setAttribute("aria-label", "Cerca o chiedi");
  b.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0E5A7A" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>';
  b.onclick = apri;
  hr.insertBefore(b, hr.firstChild);
}

function stile() {
  if (document.getElementById("cerca-stile")) return;
  const st = document.createElement("style");
  st.id = "cerca-stile";
  st.textContent = `
  #cerca-btn-header{width:36px;height:36px;border-radius:50%;border:none;background:#f0f7ff;display:flex;align-items:center;justify-content:center;margin-right:6px;flex-shrink:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
  #cerca-ov{position:fixed;inset:0;z-index:10000;background:#fff;display:flex;flex-direction:column;font-family:inherit;color:#1d2330}
  #cerca-ov .ct{padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;border-bottom:1px solid #eef0f3;display:flex;gap:8px;align-items:center}
  #cerca-ov .cb{flex:1;display:flex;align-items:center;gap:8px;background:#f3f4f6;border-radius:24px;padding:4px 6px 4px 14px}
  #cerca-ov input{flex:1;border:none;background:transparent;font-size:16px;padding:8px 0;outline:none;min-width:0;font-family:inherit}
  #cerca-ov .cm{width:36px;height:36px;border-radius:50%;border:none;background:#1f6f5c;color:#fff;font-size:17px;flex-shrink:0}
  #cerca-ov .cm.rec{background:#DC2626;animation:cercaPulse 1s infinite}
  @keyframes cercaPulse{0%{box-shadow:0 0 0 0 rgba(220,38,38,.5)}70%{box-shadow:0 0 0 12px rgba(220,38,38,0)}100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}
  #cerca-ov .cx{border:none;background:none;font-size:15px;color:#0E5A7A;font-weight:600;padding:8px 4px}
  #cerca-ov .cl{flex:1;overflow:auto;padding:12px 12px calc(24px + env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:touch}
  #cerca-ov .lb{font-size:12px;color:#6b7280;margin:4px 0 8px}
  #cerca-ov .chips{display:flex;flex-wrap:wrap;gap:6px}
  #cerca-ov .chip{border:none;font-size:13px;background:#eef6f3;color:#1f6f5c;border-radius:14px;padding:6px 11px;font-family:inherit}
  #cerca-ov .card{border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:10px}
  #cerca-ov .src{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1f6f5c}
  #cerca-ov .src.gen{color:#b45309}
  #cerca-ov .tt{font-size:16px;font-weight:600;margin:4px 0 6px}
  #cerca-ov .fr{display:flex;gap:8px;font-size:14px;padding:6px 0;border-top:1px dashed #eef0f3;line-height:1.4}
  #cerca-ov .fr b{min-width:52px;flex-shrink:0}
  #cerca-ov .big{font-size:20px;font-weight:700}
  #cerca-ov .tx{font-size:14px;line-height:1.45;white-space:pre-line;color:#374151}
  #cerca-ov .warn{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:8px 10px;font-size:13px;color:#9a3412;margin-top:8px}
  #cerca-ov .b2{display:inline-block;border:1px solid #1f6f5c;color:#1f6f5c;background:#fff;border-radius:10px;padding:8px 12px;font-size:14px;font-weight:600;margin-top:10px;font-family:inherit}
  #cerca-ov .tony{display:block;width:100%;text-align:center;background:#1d2330;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:600;margin-top:4px;font-family:inherit}
  #cerca-ov .muted{color:#6b7280;font-size:13px}
  #cerca-ov textarea{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:10px;font-size:15px;font-family:inherit;min-height:110px}
  #cerca-ov .in2{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:10px;font-size:15px;font-family:inherit;margin-bottom:8px}
  `;
  document.head.appendChild(st);
}

/* ─────────────── apertura ─────────────── */
function apri() {
  if (ov) { ov.style.display = "flex"; inp.focus(); return; }
  ov = document.createElement("div");
  ov.id = "cerca-ov";
  ov.innerHTML = `
    <div class="ct">
      <div class="cb"><span aria-hidden="true">🔍</span>
        <input type="search" enterkeyhint="search" autocomplete="off" placeholder="Cerca o chiedi… es. a quanto cuocio il salmone">
        <button class="cm" type="button" aria-label="Detta la domanda">🎤</button></div>
      <button class="cx" type="button">Chiudi</button>
    </div>
    <div class="cl"></div>`;
  document.body.appendChild(ov);
  inp = ov.querySelector("input");
  lista = ov.querySelector(".cl");
  ov.querySelector(".cx").onclick = chiudi;
  ov.querySelector(".cm").onclick = microfono;
  inp.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => cerca(inp.value), 250); });
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); cerca(inp.value, true); inp.blur(); } });
  window.addEventListener("hashchange", chiudi);
  vuoto();
  setTimeout(() => inp.focus(), 50);
}

function chiudi() {
  if (!ov || ov.style.display === "none") return;
  registra(ultimaQ, nRisultati, false);
  ov.style.display = "none";
  fermaMic();
}

function vuoto() {
  const r = recenti();
  lista.innerHTML = `
    <div class="lb">Prova con</div>
    <div class="chips">${["a quanto cuocio il salmone", "abbattimento", "menu del giorno", "allergeni"].map((c) => `<button class="chip" data-q="${esc(c)}">${esc(c)}</button>`).join("")}</div>
    ${r.length ? `<div class="lb" style="margin-top:18px">Cercate di recente</div><div class="chips">${r.map((c) => `<button class="chip" data-q="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}`;
  lista.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => { inp.value = b.dataset.q; cerca(b.dataset.q, true); }));
}

/* ─────────────── ricerca immediata ─────────────── */
async function cerca(q, invio = false) {
  q = String(q || "").trim();
  if (q.length < 2) { ultimaQ = ""; vuoto(); return; }
  const mio = ++seq;
  const { data, error } = await sb().rpc("cerca_sapere", { p_q: q, p_azienda: aziendaId() });
  if (mio !== seq) return; // è arrivata una ricerca più nuova
  if (error) { lista.innerHTML = `<div class="warn">Ricerca non riuscita: ${esc(error.message)}</div>`; return; }
  ultimaQ = q; nRisultati = (data || []).length;
  if (invio) { salvaRecente(q); registra(q, nRisultati, false); }
  mostra(q, data || []);
}

function mostra(q, righe) {
  const ricette = righe.filter((r) => r.fonte === "ricetta");
  const altre = righe.filter((r) => r.fonte !== "ricetta");
  const conFasi = ricette.filter((r) => (r.dettagli?.fasi || []).length);
  // le prime 3 ricette con fasi scritte in scheda, le altre in una riga di nomi
  const inScheda = [...altre.slice(0, 4), ...conFasi.slice(0, 3)].sort((a, b) => b.punteggio - a.punteggio);
  const resto = ricette.filter((r) => !inScheda.includes(r)).slice(0, 8);
  let h = righe.length ? `<div class="lb">Dalle regole e dalle ricette · risposta immediata</div>` : `<div class="lb">Nessuna regola o ricetta su questo</div>`;
  h += inScheda.map(scheda).join("");
  if (resto.length) h += `<div class="lb">Altre ricette: ${resto.map((r) => `<a href="#/crea-ricetta?id=${esc(r.rif)}" style="color:#0E5A7A">${esc(r.titolo)}</a>`).join(" · ")}</div>`;
  h += `<button class="tony" type="button">✨ Chiedi a Tony</button><div id="cerca-tony"></div>`;
  lista.innerHTML = h;
  lista.querySelector(".tony").onclick = () => chiediTony(q);
}

function scheda(r) {
  if (r.fonte === "ricetta") {
    const fasi = r.dettagli?.fasi || [];
    const cons = r.dettagli?.conservazione || [];
    const vuote = fasi.filter((f) => !f.descrizione && f.temperatura == null).map((f) => f.ordine);
    return `<div class="card"><div class="src">Ricettario · ${esc(r.azienda)}</div><div class="tt">${esc(r.titolo)}</div>
      ${fasi.map((f) => `<div class="fr"><b>Fase ${esc(f.ordine)}</b><span>${f.nome ? esc(f.nome) + "<br>" : ""}${f.temperatura != null ? `<span class="big">${num(f.temperatura)} °C</span>` : ""}${f.minuti != null ? `${f.temperatura != null ? " · " : ""}circa ${num(f.minuti)} min` : ""}${f.ccp ? ` · <b>CCP</b> ${num(f.ccp_min) ?? ""}–${num(f.ccp_max) ?? ""} ${esc(f.ccp_um || "")}` : ""}${f.descrizione ? `<div class="muted">${esc(String(f.descrizione).slice(0, 220))}</div>` : ""}</span></div>`).join("")}
      ${cons.map((c) => `<div class="fr"><b>Conserv.</b><span>${esc(c.titolo || "")}${c.temperatura != null ? ` · ${num(c.temperatura)} °C` : ""}${c.minuti != null ? ` · ${num(c.minuti)} min` : ""}</span></div>`).join("")}
      ${vuote.length ? `<div class="warn">Fas${vuote.length > 1 ? "i" : "e"} ${vuote.join(" e ")} senza istruzioni scritte. Completa la ricetta.</div>` : ""}
      <a class="b2" href="#/crea-ricetta?id=${esc(r.rif)}" style="text-decoration:none">Apri la ricetta</a></div>`;
  }
  const etichetta = r.fonte === "comandamento" ? "Comandamenti" : "Regole · " + (r.dettagli?.ambito || "locale");
  return `<div class="card"><div class="src">${esc(etichetta)}</div><div class="tt">${esc(r.titolo)}</div><div class="tx">${esc(r.testo)}</div></div>`;
}

/* ─────────────── Tony ─────────────── */
async function chiediTony(q) {
  const box = document.getElementById("cerca-tony");
  const btn = lista.querySelector(".tony");
  if (btn) { btn.disabled = true; btn.textContent = "Tony sta leggendo le regole…"; }
  salvaRecente(q);
  ultimoLog = q; // lo registra la funzione, con chiesto_tony
  try {
    const s = await sb().auth.getSession();
    const tok = s?.data?.session?.access_token || "";
    const r = await fetch(URL_TONY, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
      body: JSON.stringify({ domanda: q, azienda_id: aziendaId() }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.errore) throw new Error(j.errore || "risposta " + r.status);
    btn?.remove();
    box.innerHTML = `<div class="card"><div class="src ${j.generica ? "gen" : ""}">Tony${j.generica ? " · indicazione generica" : ""}</div>
      <div class="tx" style="margin-top:6px">${esc(j.risposta)}</div>
      ${j.generica ? `<div class="warn">Non è una regola del locale. Decidete voi come si fa da voi.</div>${isAdmin() ? `<button class="b2" type="button" data-salva>Salva come regola del locale</button>` : ""}` : ""}</div>`;
    box.querySelector("[data-salva]")?.addEventListener("click", () => formRegola(q, j.risposta));
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = "✨ Chiedi a Tony"; }
    box.innerHTML = `<div class="warn">Tony non ha risposto: ${esc(e.message || e)}. Riprova tra un attimo.</div>`;
  }
}

function formRegola(q, testo) {
  const box = document.getElementById("cerca-tony");
  const pulito = String(testo || "").replace(/^indicazione generale:\s*/i, "");
  box.innerHTML = `<div class="card"><div class="src">Nuova regola del locale</div>
    <input class="in2" maxlength="120" value="${esc(q.charAt(0).toUpperCase() + q.slice(1))}">
    <div class="chips" style="margin-bottom:8px">${["cucina", "sala", "locale"].map((a, i) => `<button class="chip" type="button" data-amb="${a}" style="${i === 0 ? "background:#1f6f5c;color:#fff" : ""}">${a}</button>`).join("")}</div>
    <textarea>${esc(pulito)}</textarea>
    <div class="muted" style="margin-top:6px">Correggi il testo come si fa da voi: da adesso la barra la trova e Tony la usa.</div>
    <button class="b2" type="button" data-ok>Salva regola</button></div>`;
  let ambito = "cucina";
  box.querySelectorAll("[data-amb]").forEach((b) => (b.onclick = () => {
    ambito = b.dataset.amb;
    box.querySelectorAll("[data-amb]").forEach((x) => { x.style.background = x === b ? "#1f6f5c" : ""; x.style.color = x === b ? "#fff" : ""; });
  }));
  box.querySelector("[data-ok]").onclick = async (ev) => {
    const titolo = box.querySelector(".in2").value.trim();
    const contenuto = box.querySelector("textarea").value.trim();
    if (!titolo || !contenuto) return;
    ev.target.disabled = true;
    const { error } = await sb().from("tony_sapere").insert({ azienda_id: aziendaId(), ambito, titolo, contenuto, attivo: true, priorita: 5 });
    if (error) { ev.target.disabled = false; box.insertAdjacentHTML("beforeend", `<div class="warn">Non salvata: ${esc(error.message)}</div>`); return; }
    box.innerHTML = `<div class="card"><div class="src">Regola salvata</div><div class="tt">${esc(titolo)}</div><div class="tx">${esc(contenuto)}</div></div>`;
  };
}

/* ─────────────── registro domande ─────────────── */
function registra(q, n, tony) {
  q = String(q || "").trim();
  if (q.length < 4 || q === ultimoLog || !aziendaId()) return;
  ultimoLog = q;
  try { sb().from("ricerca_domande").insert({ azienda_id: aziendaId(), domanda: q.slice(0, 400), n_risultati: n, chiesto_tony: !!tony }).then(() => {}, () => {}); } catch (_) {}
}

/* ─────────────── microfono: tocco per parlare, tocco per fermare ─────────────── */
async function microfono() {
  const b = ov.querySelector(".cm");
  if (rec && rec.state === "recording") { rec.stop(); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    pezzi = [];
    rec.ondataavailable = (e) => { if (e.data?.size) pezzi.push(e.data); };
    rec.onstop = async () => {
      fermaMic();
      b.textContent = "…";
      try {
        const blob = new Blob(pezzi, { type: rec.mimeType || "audio/webm" });
        const b64 = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
        const s = await sb().auth.getSession();
        const tok = s?.data?.session?.access_token || "";
        const r = await fetch(URL_TRASCRIVI, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok, apikey: tok },
          body: JSON.stringify({ audio_base64: b64 }) });
        const j = await r.json().catch(() => ({}));
        const testo = j?.success ? String(j.text || "").trim() : "";
        if (testo) { inp.value = testo; cerca(testo, true); }
        else lista.insertAdjacentHTML("afterbegin", `<div class="warn">Non ti ho sentito: riprova più vicino al telefono.</div>`);
      } catch (e) {
        lista.insertAdjacentHTML("afterbegin", `<div class="warn">Dettatura non riuscita: ${esc(e.message || e)}</div>`);
      }
      b.textContent = "🎤";
    };
    rec.start();
    b.classList.add("rec");
    setTimeout(() => { if (rec && rec.state === "recording") rec.stop(); }, 15000);
  } catch (e) {
    lista.insertAdjacentHTML("afterbegin", `<div class="warn">Microfono non disponibile: ${esc(e.message || e)}</div>`);
  }
}

function fermaMic() {
  ov?.querySelector(".cm")?.classList.remove("rec");
  try { stream?.getTracks().forEach((t) => t.stop()); } catch (_) {}
  stream = null;
}
