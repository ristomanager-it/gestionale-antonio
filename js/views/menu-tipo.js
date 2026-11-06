// MENU TIPO — EVENTI › 🍽 Menu tipo
// Ordine di servizio del ristoratore (preventivi_config.ordine_portate / ordine_primi) e menu tipo composti da Tony (tony-menu-tipo).
// L'ordine lo decide solo l'admin, qui: lo seguono preventivi, menu tipo e landing. Il cliente sulla landing non riordina.
const NOMI = { aperitivo: "Aperitivo", antipasti: "Antipasti", angoli: "Angoli e buffet", primi: "Primi", secondi: "Secondi", contorni: "Contorni", dolci: "Dolci", servizi: "Servizi" };
const NOMI_PRIMI = { zuppa: "Zuppe", risotto: "Risotti", gratinato: "Gratinati", pasta: "Paste saltate" };
const DEF_PORT = ["aperitivo", "antipasti", "angoli", "primi", "secondi", "contorni", "dolci"];
const DEF_PRIMI = ["zuppa", "risotto", "gratinato", "pasta"];
const URL_FN = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-menu-tipo";

let S = { menu: [], att: null, oPort: DEF_PORT.slice(), oPrimi: DEF_PRIMI.slice(), haConfig: false };
let app = null, tr = null, salvaTimer = null, rec = null;
const sb = () => window.supabaseClient || window.supabase;
const az = () => window.state?.azienda?.id;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (i) => document.getElementById(i);

export async function render(container) {
  app = container;
  app.innerHTML = '<section class="view mt-v">' + CSS + '<div id="mtL"><p class="mt-m">Carico…</p></div><div id="mtD" class="mt-h"></div></section>';
  await carica();
  lista();
  if (!window.__mtTrascina) { window.__mtTrascina = true; agganciaTrascinamento(); }
}

async function carica() {
  const [cfg, m] = await Promise.all([
    sb().from("preventivi_config").select("azienda_id, ordine_portate, ordine_primi").eq("azienda_id", az()).maybeSingle(),
    sb().from("menu_tipo").select("*").eq("azienda_id", az()).neq("stato", "archiviato").order("created_at", { ascending: false }),
  ]);
  if (cfg.data) {
    S.haConfig = true;
    if (Array.isArray(cfg.data.ordine_portate) && cfg.data.ordine_portate.length) S.oPort = cfg.data.ordine_portate.filter((k) => NOMI[k]);
    if (Array.isArray(cfg.data.ordine_primi) && cfg.data.ordine_primi.length) S.oPrimi = cfg.data.ordine_primi.filter((k) => NOMI_PRIMI[k]);
    DEF_PORT.forEach((k) => { if (S.oPort.indexOf(k) < 0) S.oPort.push(k); });
  }
  S.menu = (m.data || []).map((x) => { (x.voci || []).forEach((v, i) => { v._id = "v" + i + "_" + Math.random().toString(36).slice(2, 6); }); return x; });
}
const daScegliere = (m) => (m.voci || []).filter((v) => v.dubbio || (!v.trovato && !v.dubbio)).length;

function lista() {
  $("mtD").classList.add("mt-h"); $("mtL").classList.remove("mt-h");
  const voce = window.SpeechRecognition || window.webkitSpeechRecognition;
  $("mtL").innerHTML =
    '<div style="margin-bottom:10px"><button class="app-button small gray" onclick="window.location.hash=\'#/preventivi\'">← Preventivi</button></div>' +
    '<h2>🍽 Menu tipo</h2><p class="mt-m">Menu già pronti da usare nei preventivi e da mostrare nella landing come "Menu consigliato".</p>' +
    '<div class="mt-cfg"><b>⚙️ Ordine di servizio</b><p class="mt-m" style="margin:2px 0 8px">Come servite di solito: vale per i preventivi, per i menu tipo e per la landing. Tenete premuto ≡ e trascinate.</p>' +
    '<div class="mt-m" style="font-weight:700">Le portate</div><ul class="mt-ol" id="oPort"></ul>' +
    '<div class="mt-m" style="font-weight:700;margin-top:10px">Dentro i primi</div><ul class="mt-ol" id="oPrimi"></ul><div class="mt-m" id="oSalvato"></div></div>' +
    '<div class="mt-tony"><b>✨ Detta a Tony</b><p class="mt-m" style="margin:4px 0 8px">Dite il menu come lo direste in cucina: Tony riconosce i piatti che avete già e vi chiede solo quelli in dubbio.</p>' +
    '<textarea id="mtTesto" placeholder="es. menu comunione: antipasto della casa, crêpes ricotta e spinaci, poi tagliatelle al ragù, filetto con patate, torta"></textarea>' +
    '<div class="mt-mic">' + (voce ? '<button class="mt-btn" id="mtMic">🎙 Parla</button>' : '<span class="mt-m" style="flex:1">Per dettare usate il microfono della tastiera</span>') + '<button class="mt-btn p" id="mtComp">Componi</button></div><div class="mt-m" id="mtStato"></div></div>' +
    '<div id="mtCards">' + (S.menu.length ? S.menu.map((m, i) => {
      const d = daScegliere(m);
      return '<div class="mt-c" data-apri="' + i + '"><div class="mt-ch"><div><b>' + esc(m.nome) + '</b><div class="mt-m">' + esc(m.tipo_evento || "") + " · " + (m.voci || []).length + " voci" + (d ? " · " + d + " da scegliere" : "") + (m.online ? " · 🌐 nella landing" : "") + '</div></div><span class="mt-st ' + (m.stato === "confermato" ? "cf" : "bz") + '">' + (m.stato === "confermato" ? "CONFERMATO" : "BOZZA") + "</span></div></div>";
    }).join("") : '<p class="mt-m">Ancora nessun menu tipo: dettatene uno a Tony.</p>') + "</div>";
  disegnaOrdine();
  $("mtComp").onclick = componi;
  if ($("mtMic")) $("mtMic").onclick = microfono;
  $("mtCards").onclick = (e) => { const c = e.target.closest("[data-apri]"); if (c) apri(+c.getAttribute("data-apri")); };
}

function disegnaOrdine() {
  if (!$("oPort")) return;
  $("oPort").innerHTML = S.oPort.map((k, i) => '<li data-o="p:' + k + '"><span class="mt-mn" data-do="p:' + k + '">≡</span>' + (i + 1) + ". " + NOMI[k] + "</li>").join("");
  $("oPrimi").innerHTML = S.oPrimi.map((k, i) => '<li data-o="r:' + k + '"><span class="mt-mn" data-do="r:' + k + '">≡</span>' + (i + 1) + ". " + NOMI_PRIMI[k] + "</li>").join("");
}
async function salvaOrdine() {
  const riga = { ordine_portate: S.oPort, ordine_primi: S.oPrimi };
  let r = S.haConfig ? await sb().from("preventivi_config").update(riga).eq("azienda_id", az()) : await sb().from("preventivi_config").insert(Object.assign({ azienda_id: az() }, riga));
  if (!r.error) S.haConfig = true;
  if ($("oSalvato")) $("oSalvato").textContent = r.error ? "Non salvato: " + r.error.message : "✓ Ordine salvato";
}

function microfono() {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  const b = $("mtMic");
  if (rec) { rec.stop(); return; }
  rec = new R(); rec.lang = "it-IT"; rec.continuous = true; rec.interimResults = false;
  const base = $("mtTesto").value ? $("mtTesto").value.trim() + " " : "";
  let detto = "";
  rec.onresult = (e) => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) detto += e.results[i][0].transcript + " "; $("mtTesto").value = base + detto; };
  rec.onend = () => { rec = null; b.textContent = "🎙 Parla"; b.classList.remove("rec"); };
  rec.onerror = () => { rec = null; b.textContent = "🎙 Parla"; b.classList.remove("rec"); };
  rec.start(); b.textContent = "■ Fine"; b.classList.add("rec");
}

async function componi() {
  const testo = $("mtTesto").value.trim();
  if (testo.length < 5) { $("mtTesto").focus(); return; }
  const b = $("mtComp"); b.disabled = true; $("mtStato").textContent = "Tony sta componendo il menu…";
  try {
    const { data: sess } = await sb().auth.getSession();
    const r = await fetch(URL_FN, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (sess?.session?.access_token || "") },
      body: JSON.stringify({ azienda_id: az(), sede_id: window.state?.sedeAttiva?.id || null, testo: testo }) });
    const j = await r.json();
    if (!j.success) throw new Error(j.error || "errore");
    await carica(); lista();
    const i = S.menu.findIndex((m) => m.id === j.id); if (i >= 0) apri(i);
  } catch (e) { b.disabled = false; $("mtStato").textContent = "Tony non è riuscito: " + e.message; }
}

function apri(i) { S.att = S.menu[i]; $("mtL").classList.add("mt-h"); $("mtD").classList.remove("mt-h"); disegna(); scrollTo(0, 0); }

function ordinePortate(m) {
  const pres = []; (m.voci || []).forEach((v) => { if (pres.indexOf(v.portata) < 0) pres.push(v.portata); });
  const base = (m.ordine_portate && m.ordine_portate.length ? m.ordine_portate : S.oPort.concat(["servizi"]));
  const out = base.filter((k) => pres.indexOf(k) >= 0); pres.forEach((k) => { if (out.indexOf(k) < 0) out.push(k); });
  return out;
}
function disegna() {
  const m = S.att; m.ordine_portate = ordinePortate(m);
  let h = '<button class="mt-btn" id="mtIndietro">← Menu tipo</button>' +
    '<input class="mt-nome" id="mtNome" value="' + esc(m.nome) + '"><div class="mt-m">' + esc(m.tipo_evento || "") + " · composto da Tony · tenete premuto ≡ per spostare portate e piatti</div><div style=\"margin-top:12px\">";
  m.ordine_portate.forEach((p) => {
    const vs = (m.voci || []).filter((v) => v.portata === p); if (!vs.length) return;
    h += '<div class="mt-port" data-p="' + p + '"><div class="mt-ph"><span class="mt-mn" data-dp="' + p + '">≡</span>' + (NOMI[p] || p) + "</div>";
    vs.forEach((v) => {
      const nome = v.nome_catalogo || v.nome, diverso = v.nome_catalogo && v.nome_catalogo.toLowerCase() !== String(v.nome).toLowerCase();
      const mancante = !v.trovato && !v.dubbio;
      h += '<div class="mt-vo" data-v="' + v._id + '"><div class="mt-vr"><span class="mt-mn" data-dv="' + v._id + '" style="font-size:18px">≡</span><b>' + esc(v.dubbio || mancante ? v.nome : nome) + "</b>" +
        (v.dubbio ? '<span class="mt-ic dub">Scegli</span>' : mancante ? '<span class="mt-ic man">Non trovato</span>' : '<span class="mt-ic ok">✓</span>') + '<button class="mt-x" data-del="' + v._id + '" aria-label="Togli">×</button></div>' +
        (!v.dubbio && !mancante && diverso ? '<div class="mt-m">Detto: "' + esc(v.nome) + '"</div>' : "") +
        (v.dubbio ? '<div class="mt-m" style="margin-top:4px">Tony ha trovato più piatti possibili: quale intendete?</div><div class="mt-chips">' + (v.alternative || []).map((a, j) => '<button data-sc="' + v._id + "|" + j + '">' + esc(a.nome) + "</button>").join("") + "</div>" : "") +
        (mancante ? '<div class="mt-m" style="margin-top:4px">Non c\'è in Menu e prodotti: aggiungetelo lì, oppure togliete la voce.</div>' : "") +
        '<input class="mt-nota" data-no="' + v._id + '" placeholder="Nota (es. con due contorni)" value="' + esc(v.nota || "") + '"></div>';
    });
    h += "</div>";
  });
  const d = daScegliere(m);
  h += '</div><div class="mt-sw"><div><b>Mostralo nella landing</b><div class="mt-m">Gli sposi lo vedono come "Menu consigliato" e partono da qui</div></div><button class="mt-tg' + (m.online ? " on" : "") + '" id="mtOn" aria-label="Online"></button></div>' +
    '<button class="mt-btn p big" id="mtConf"' + (d ? " disabled" : "") + ">" + (d ? "Scegliete ancora " + d + (d === 1 ? " voce" : " voci") : m.stato === "confermato" ? "✓ Confermato" : "Conferma il menu tipo") + "</button>" +
    '<div class="mt-m" id="mtSalvato" style="text-align:center;margin-top:6px"></div>' +
    '<details style="margin-top:12px"><summary class="mt-m">Testo dettato</summary><p class="mt-m">' + esc(m.testo_dettato || "") + "</p></details>" +
    '<button class="mt-btn" id="mtArch" style="margin-top:14px">Archivia questo menu tipo</button>';
  $("mtD").innerHTML = h;
  $("mtIndietro").onclick = async () => { await salvaOra(); lista(); };
  $("mtNome").onchange = (e) => { m.nome = e.target.value.trim() || m.nome; salva(); };
  $("mtOn").onclick = () => { m.online = !m.online; salva(); disegna(); };
  $("mtConf").onclick = () => { if (daScegliere(m)) return; m.stato = "confermato"; salva(); disegna(); };
  $("mtArch").onclick = async () => { if (!confirm("Archivio il menu tipo? Non comparirà più qui né nella landing.")) return; m.stato = "archiviato"; await salvaOra(); await carica(); lista(); };
  $("mtD").onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-sc")) { const q = b.getAttribute("data-sc").split("|"), v = m.voci.find((x) => x._id === q[0]), a = v.alternative[+q[1]];
      v.nome_catalogo = a.nome; v.nome = a.nome; v.dubbio = false; v.trovato = true; if (a.tipo === "servizio") { v.servizio_id = a.id; v.prodotto_id = null; } else { v.prodotto_id = a.id; v.servizio_id = null; } salva(); disegna(); }
    if (b.hasAttribute("data-del")) { m.voci = m.voci.filter((x) => x._id !== b.getAttribute("data-del")); salva(); disegna(); }
  };
  $("mtD").oninput = (e) => { if (e.target.hasAttribute("data-no")) { const v = m.voci.find((x) => x._id === e.target.getAttribute("data-no")); if (v) { v.nota = e.target.value; salva(); } } };
}
function salva() { clearTimeout(salvaTimer); salvaTimer = setTimeout(salvaOra, 600); }
async function salvaOra() {
  clearTimeout(salvaTimer); const m = S.att; if (!m) return;
  const voci = (m.voci || []).map((v) => { const c = Object.assign({}, v); delete c._id; return c; });
  const { error } = await sb().from("menu_tipo").update({ nome: m.nome, voci: voci, ordine_portate: m.ordine_portate, online: m.online, stato: m.stato, updated_at: new Date().toISOString() }).eq("id", m.id);
  if ($("mtSalvato")) $("mtSalvato").textContent = error ? "Non salvato: " + error.message : "✓ Salvato";
}

function agganciaTrascinamento() {
  document.addEventListener("pointerdown", (e) => {
    const m = e.target.closest(".mt-v .mt-mn"); if (!m) return; e.preventDefault();
    if (m.hasAttribute("data-do")) { tr = { t: "o", k: m.getAttribute("data-do") }; m.closest("li").classList.add("drag"); return; }
    if (!S.att) return;
    if (m.hasAttribute("data-dp")) { tr = { t: "p", k: m.getAttribute("data-dp") }; m.closest(".mt-port").classList.add("drag"); }
    else { tr = { t: "v", k: m.getAttribute("data-dv") }; m.closest(".mt-vo").classList.add("drag"); }
  });
  document.addEventListener("pointermove", (e) => {
    if (!tr) return; e.preventDefault();
    const el = document.elementFromPoint(e.clientX, e.clientY); if (!el) return;
    if (tr.t === "o") {
      const li = el.closest(".mt-ol li"); if (!li) return; const a = tr.k.split(":"), b = li.getAttribute("data-o").split(":"); if (a[0] !== b[0] || a[1] === b[1]) return;
      const L = a[0] === "p" ? S.oPort : S.oPrimi, i = L.indexOf(a[1]), j = L.indexOf(b[1]); L.splice(i, 1); L.splice(j, 0, a[1]); disegnaOrdine();
      const n = document.querySelector('.mt-ol li[data-o="' + tr.k + '"]'); if (n) n.classList.add("drag"); return;
    }
    const m = S.att;
    if (tr.t === "p") { const p2 = el.closest(".mt-port"); if (!p2 || p2.getAttribute("data-p") === tr.k) return; const o = m.ordine_portate, i = o.indexOf(tr.k), j = o.indexOf(p2.getAttribute("data-p")); o.splice(i, 1); o.splice(j, 0, tr.k); disegna(); const n = document.querySelector('.mt-port[data-p="' + tr.k + '"]'); if (n) n.classList.add("drag"); return; }
    const v2 = el.closest(".mt-vo"); if (!v2 || v2.getAttribute("data-v") === tr.k) return;
    const a = m.voci.find((x) => x._id === tr.k), b2 = m.voci.find((x) => x._id === v2.getAttribute("data-v")); if (!a || !b2 || a.portata !== b2.portata) return;
    const ia = m.voci.indexOf(a), ib = m.voci.indexOf(b2); m.voci.splice(ia, 1); m.voci.splice(ib, 0, a); disegna(); const n2 = document.querySelector('.mt-vo[data-v="' + tr.k + '"]'); if (n2) n2.classList.add("drag");
  }, { passive: false });
  const fine = () => { if (!tr) return; const t = tr.t; tr = null; if (t === "o") { disegnaOrdine(); salvaOrdine(); } else if (S.att) { disegna(); salva(); } };
  document.addEventListener("pointerup", fine); document.addEventListener("pointercancel", fine);
}

const CSS = '<style>.mt-v{max-width:620px;box-sizing:border-box}.mt-v *{box-sizing:border-box}.mt-h{display:none}.mt-m{color:#64748b;font-size:13px}' +
  '.mt-btn{display:inline-block;border:1px solid #e2e8f0;background:#fff;color:#0f172a;border-radius:10px;padding:10px 14px;font:inherit;font-weight:600;cursor:pointer}.mt-btn.p{background:#023C59;color:#fff;border-color:#023C59}.mt-btn.big{display:block;width:100%;text-align:center;padding:14px;margin-top:10px}.mt-btn[disabled]{opacity:.45}.mt-btn.rec{background:#dc2626;color:#fff;border-color:#dc2626}' +
  '.mt-cfg{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:10px 0}.mt-ol{list-style:none;margin:4px 0 0;padding:0}.mt-ol li{display:flex;align-items:center;gap:8px;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:6px;background:#f8fafc;touch-action:none;font-weight:600}.mt-ol li.drag{border-color:#023C59;box-shadow:0 6px 18px rgba(0,0,0,.15)}' +
  '.mt-tony{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:12px;margin:10px 0}.mt-tony b{color:#6d28d9}.mt-tony textarea{width:100%;min-height:90px;border:1px solid #e2e8f0;border-radius:10px;padding:10px;font:inherit;font-size:16px}.mt-mic{display:flex;gap:8px;margin-top:8px;align-items:center}.mt-mic .mt-btn{flex:1;text-align:center}' +
  '.mt-c{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;cursor:pointer}.mt-ch{display:flex;justify-content:space-between;gap:8px;align-items:center}.mt-st{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px}.mt-st.bz{background:#fef3c7;color:#92400e}.mt-st.cf{background:#dcfce7;color:#166534}' +
  '.mt-nome{display:block;width:100%;font-size:20px;font-weight:700;border:0;border-bottom:1px dashed #cbd5e1;padding:6px 0;margin:12px 0 4px;background:none;color:#0f172a}' +
  '.mt-port{background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;margin-bottom:10px;padding:8px 10px;touch-action:none}.mt-port.drag{border-color:#023C59;box-shadow:0 6px 18px rgba(0,0,0,.15)}.mt-ph{display:flex;align-items:center;gap:8px;font-weight:700}.mt-mn{font-size:22px;color:#64748b;cursor:grab;user-select:none;padding:2px 6px;touch-action:none}' +
  '.mt-vo{border-top:1px solid #e2e8f0;padding:8px 0 8px 30px}.mt-vo.drag{background:#f8fafc}.mt-vr{display:flex;align-items:center;gap:8px}.mt-vr b{flex:1;font-weight:600}.mt-ic{font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px}.mt-ic.ok{background:#dcfce7;color:#166534}.mt-ic.dub{background:#fef3c7;color:#92400e}.mt-ic.man{background:#fee2e2;color:#991b1b}' +
  '.mt-x{border:0;background:none;color:#64748b;font-size:20px;cursor:pointer}.mt-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.mt-chips button{border:1.5px solid #e2e8f0;background:#fff;border-radius:999px;padding:7px 11px;font:inherit;font-size:13px;cursor:pointer}' +
  '.mt-nota{width:100%;margin-top:6px;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;font:inherit;font-size:14px}.mt-sw{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-top:10px}' +
  '.mt-tg{position:relative;width:46px;height:28px;border-radius:999px;background:#cbd5e1;border:0;cursor:pointer;flex:none}.mt-tg::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:left .15s}.mt-tg.on{background:#16a34a}.mt-tg.on::after{left:21px}</style>';
