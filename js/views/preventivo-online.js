// PREVENTIVO ONLINE — EVENTI › 🌐 Preventivo online
// Impostazioni del "Crea il tuo preventivo" per ogni azienda Ristoflow: lista di controllo, date da verificare con le
// location esterne (✅ Data confermata → email "data disponibile" da preventivo-email), aspetto, regole, link e Pubblica.
const BASE = "https://app.ristoflow-ai.com/preventivo-online.html?p=";
const sb = () => window.supabaseClient || window.supabase;
const az = () => window.state?.azienda?.id;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (i) => document.getElementById(i);
let S = { cfg: null, azi: null, modelli: [], sedi: [], nOnline: 0, nSenzaFoto: 0, nLoc: 0, haPag: false, daVer: [], ultimi: [] };

export async function render(app) {
  app.innerHTML = '<section class="view po-v">' + CSS + '<div id="poC"><p class="po-m">Carico…</p></div></section>';
  await carica(); disegna();
}
async function carica() {
  const a = az();
  const [cfg, azi, mod, sedi, loc, dv, ul] = await Promise.all([
    sb().from("preventivi_config").select("*").eq("azienda_id", a).maybeSingle(),
    sb().from("aziende").select("nome, slug, logo_url, telefono_whatsapp, colore_brand").eq("id", a).maybeSingle(),
    sb().from("menu_modelli").select("tipo_evento").eq("azienda_id", a).eq("attivo", true).order("ordine"),
    sb().from("sedi").select("id, nome").eq("azienda_id", a).order("nome"),
    sb().from("location_ricevimenti").select("id").eq("azienda_id", a).eq("attiva", true),
    sb().from("preventivi").select("id, cliente_nome, tipo_servizio, data_evento, location, n_invitati, created_at, token_pubblico").eq("azienda_id", a).eq("origine", "online").eq("data_da_verificare", true).is("data_verificata_il", null).order("created_at", { ascending: false }).limit(30),
    sb().from("preventivi").select("id, cliente_nome, tipo_servizio, data_evento, stato, accettato_il, acconto_versato, created_at").eq("azienda_id", a).eq("origine", "online").order("created_at", { ascending: false }).limit(8),
  ]);
  S.cfg = cfg.data || null; S.azi = azi.data || {}; S.modelli = mod.data || []; S.sedi = sedi.data || []; S.nLoc = (loc.data || []).length; S.daVer = dv.data || []; S.ultimi = ul.data || [];
  const sede = S.cfg?.online_sede_id;
  let q = sb().from("prodotti_vendita").select("id, foto_url, foto_pubblica_url", { count: "exact" }).eq("azienda_id", a).eq("preventivo_online", true).eq("attivo", true);
  if (sede) q = q.eq("sede_id", sede);
  const { data: pv, count } = await q.limit(1000);
  S.nOnline = count || (pv || []).length; S.nSenzaFoto = (pv || []).filter((x) => !x.foto_pubblica_url && !x.foto_url).length;
  S.haPag = !!(S.cfg && (S.cfg.iban || S.cfg.link_pagamento));
  if (!S.haPag) { const { data: st } = await sb().from("stripe_config").select("id").eq("azienda_id", a).eq("attivo", true).limit(1); S.haPag = !!(st && st.length); }
}
function riga(ok, testo, dove, azione) {
  return '<div class="po-ck"><span class="po-i ' + (ok ? "ok" : "no") + '">' + (ok ? "✓" : "!") + '</span><span style="flex:1">' + testo + "</span>" + (dove ? '<a class="po-btn s" href="#/' + dove + '">' + (azione || "Apri") + "</a>" : "") + "</div>";
}
function link(tipi) { const s = S.azi.slug || ""; return BASE + encodeURIComponent(s) + (tipi ? "&tipi=" + encodeURIComponent(tipi) : ""); }
function disegna() {
  const c = S.cfg || {}, slug = S.azi.slug;
  const pronto = S.modelli.length && S.nOnline && S.nLoc && S.haPag && slug;
  const nozze = S.modelli.filter((m) => /matrimon|nozze/i.test(m.tipo_evento)).map((m) => m.tipo_evento);
  const feste = S.modelli.filter((m) => !/matrimon|nozze/i.test(m.tipo_evento)).map((m) => m.tipo_evento);
  let h = '<div style="margin-bottom:10px"><button class="app-button small gray" onclick="window.location.hash=\'#/preventivi\'">← Preventivi</button></div>' +
    '<h2>🌐 Preventivo online</h2><p class="po-m">Il "Crea il tuo preventivo" per il vostro sito e le campagne: i clienti compongono il menu, vedono il prezzo e bloccano la data.</p>' +
    '<div class="po-card ' + (c.online_pubblicato ? "on" : "") + '"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b>' + (c.online_pubblicato ? "🟢 Pubblicato" : "⚪ Non pubblicato") + '</b><div class="po-m">' + (c.online_pubblicato ? "Chi apre il link può creare preventivi veri." : "Il link mostra «non ancora attivo». La prova funziona sempre.") + "</div></div>" +
    '<button class="po-btn ' + (c.online_pubblicato ? "" : "p") + '" id="poPub"' + (!pronto && !c.online_pubblicato ? " disabled" : "") + ">" + (c.online_pubblicato ? "Metti in pausa" : "Pubblica") + "</button></div>" + (!pronto && !c.online_pubblicato ? '<div class="po-m" style="margin-top:6px">Per pubblicare completate la lista qui sotto.</div>' : "") + "</div>";
  h += '<div class="po-card"><b>Lista di controllo</b>' +
    riga(S.modelli.length, S.modelli.length + " modelli di menu (" + esc(S.modelli.map((m) => m.tipo_evento).join(", ")) + ")", "menu-tipo", "Modelli") +
    riga(S.nOnline, S.nOnline + " piatti e voci visibili online" + (S.nSenzaFoto && c.online_foto !== "mai" ? " · " + S.nSenzaFoto + " senza foto" + (c.online_foto === "dove_ci_sono" ? "" : ": con la regola «tutte o nessuna» le foto restano spente") : ""), "bo-prodotti", "Menu e prodotti") +
    riga(!S.nSenzaFoto, S.nSenzaFoto ? S.nSenzaFoto + " piatti ancora senza foto: si scattano dal telefono, una alla volta" : "Tutti i piatti hanno la foto", "foto-preventivo", "📷 Foto") +
    riga(S.nLoc, S.nLoc + " location con prezzi e capienze", "bo-location-ricevimenti", "Location") +
    riga(S.haPag, S.haPag ? "Pagamento dell'acconto impostato (bonifico o carta)" : "Manca il pagamento dell'acconto: IBAN o carta", "servizi-eventi", "Pagamenti") +
    riga(!!slug, slug ? "Indirizzo della vostra pagina: " + esc(slug) : "Manca lo slug dell'azienda", null) + "</div>";
  if (S.daVer.length) {
    h += '<div class="po-card warn"><b>⚠ Date da verificare con la location (' + S.daVer.length + ")</b><p class=\"po-m\">Finché non confermate, il cliente non può accettare né pagare. Confermando gli arriva l'email «la data è disponibile» con il pulsante per bloccarla.</p>" +
      S.daVer.map((p) => '<div class="po-dv"><div><b>#' + p.id + " · " + esc(p.cliente_nome) + "</b><div class=\"po-m\">" + esc(p.tipo_servizio) + " · " + esc(p.data_evento || "data da definire") + " · " + esc(p.location || "") + " · " + esc(p.n_invitati) + ' invitati</div></div><button class="po-btn p" data-conf="' + p.id + '">✅ Data confermata</button></div>').join("") + "</div>";
  }
  h += '<div class="po-card"><b>Aspetto</b>' +
    '<label class="po-f"><span>Nome da mostrare</span><input data-k="online_nome" value="' + esc(c.online_nome || S.azi.nome || "") + '"></label>' +
    '<label class="po-f"><span>Colore</span><input type="color" data-k="online_colore" value="' + esc(c.online_colore || S.azi.colore_brand || "#6e2434") + '"></label>' +
    '<label class="po-f"><span>Titolo</span><input data-k="online_titolo" value="' + esc(c.online_titolo || "Crea il vostro preventivo") + '"></label>' +
    '<label class="po-f"><span>Sottotitolo</span><input data-k="online_sottotitolo" value="' + esc(c.online_sottotitolo || "") + '"></label>' +
    '<label class="po-f"><span>Sede da cui prendere piatti e prezzi</span><select data-k="online_sede_id"><option value="">— scegliete —</option>' + S.sedi.map((s) => '<option value="' + s.id + '"' + (s.id === c.online_sede_id ? " selected" : "") + ">" + esc(s.nome) + "</option>").join("") + "</select></label></div>";
  h += '<div class="po-card"><b>Regole</b>' +
    '<label class="po-f"><span>Il preventivo vale (giorni)</span><input type="number" min="3" max="60" data-k="giorni_validita_default" value="' + esc(c.giorni_validita_default || 14) + '"></label>' +
    '<label class="po-f"><span>Acconto per bloccare la data (%)</span><input type="number" min="0" max="100" data-k="acconto_perc_default" value="' + esc(c.acconto_perc_default || 30) + '"></label>' +
    '<label class="po-f"><span>Sconto online se bloccano la data in pochi giorni (%) · 0 = spento</span><input type="number" min="0" max="30" data-k="online_sconto_perc" value="' + esc(c.online_sconto_perc || 0) + '"></label>' +
    '<label class="po-f"><span>…entro quanti giorni</span><input type="number" min="1" max="30" data-k="online_sconto_giorni" value="' + esc(c.online_sconto_giorni || 7) + '"></label>' +
    '<label class="po-f"><span>Foto dei piatti</span><select data-k="online_foto">' + [["tutte_o_nessuna", "Tutte o nessuna"], ["dove_ci_sono", "Dove ci sono"], ["mai", "Mai"]].map((o) => '<option value="' + o[0] + '"' + (c.online_foto === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") + "</select></label>" +
    '<label class="po-f"><span>Email automatiche ai clienti</span><select data-k="online_email_modo">' + [["admin", "In prova: arrivano a voi come bozza"], ["cliente", "Ai clienti"], ["spento", "Spente"]].map((o) => '<option value="' + o[0] + '"' + (c.online_email_modo === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") + "</select></label>" +
    '<div class="po-m" id="poSalv"></div></div>';
  if (slug) {
    const L = [["Tutti gli eventi", ""]];
    if (nozze.length) L.push(["Solo matrimoni · per il sito wedding", nozze.join(",")]);
    if (feste.length) L.push(["Solo feste ed eventi", feste.join(",")]);
    S.modelli.forEach((m) => L.push(["Solo " + m.tipo_evento + " · per la sua campagna", m.tipo_evento]));
    h += '<div class="po-card"><b>I vostri link</b><p class="po-m">Copiateli nel sito o negli annunci. Con «Prova» si usa tutto ma non si salva niente.</p>' +
      L.map((x, i) => '<div class="po-ln"><div style="flex:1;min-width:0"><b>' + esc(x[0]) + '</b><div class="po-url">' + esc(link(x[1])) + '</div></div><button class="po-btn s" data-cp="' + i + '">Copia</button><a class="po-btn s" target="_blank" href="' + esc(link(x[1]) + "&prova=1") + '">Prova</a></div>').join("") +
      '<details style="margin-top:8px"><summary class="po-m">Codice da incollare nel vostro sito</summary><textarea class="po-code" readonly>&lt;iframe src="' + esc(link(nozze.join(","))) + '" style="width:100%;min-height:1400px;border:0" loading="lazy" title="Crea il tuo preventivo"&gt;&lt;/iframe&gt;</textarea></details></div>';
    S._link = L;
  }
  if (S.ultimi.length) h += '<div class="po-card"><b>Ultimi preventivi dal sito</b>' + S.ultimi.map((p) => '<div class="po-ck"><span style="flex:1">#' + p.id + " · " + esc(p.cliente_nome) + ' <span class="po-m">· ' + esc(p.tipo_servizio) + " · " + esc(p.data_evento || "data da definire") + "</span></span><span class=\"po-m\">" + (Number(p.acconto_versato) > 0 ? "💶 acconto" : p.accettato_il ? "✅ accettato" : esc(p.stato)) + "</span></div>").join("") + "</div>";
  $("poC").innerHTML = h;
  $("poC").onchange = salvaCampo;
  $("poC").onclick = clic;
}
let timer = null;
function salvaCampo(e) {
  const k = e.target.getAttribute && e.target.getAttribute("data-k"); if (!k) return;
  let v = e.target.value; if (e.target.type === "number") v = v === "" ? null : Number(v); if (k === "online_sede_id" && !v) v = null;
  S.cfg = S.cfg || {}; S.cfg[k] = v; clearTimeout(timer);
  timer = setTimeout(async () => { const r = await salva({ [k]: v }); $("poSalv").textContent = r.error ? "Non salvato: " + r.error.message : "✓ Salvato"; }, 300);
}
async function salva(campi) {
  if (S.cfg && S.cfg.azienda_id) return sb().from("preventivi_config").update(campi).eq("azienda_id", az());
  const r = await sb().from("preventivi_config").insert(Object.assign({ azienda_id: az() }, campi)).select("*").single();
  if (!r.error) S.cfg = r.data; return r;
}
async function clic(e) {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "poPub") { const nuovo = !(S.cfg && S.cfg.online_pubblicato); if (nuovo && !confirm("Pubblico il preventivo online? Da adesso chi apre il link può creare preventivi veri.")) return; const r = await salva({ online_pubblicato: nuovo }); if (!r.error) { S.cfg.online_pubblicato = nuovo; disegna(); } else alert(r.error.message); return; }
  if (b.hasAttribute("data-cp")) { const u = link(S._link[+b.getAttribute("data-cp")][1]); try { await navigator.clipboard.writeText(u); b.textContent = "✓ Copiato"; } catch (_) { prompt("Copiate il link:", u); } return; }
  if (b.hasAttribute("data-conf")) {
    const id = +b.getAttribute("data-conf"), p = S.daVer.find((x) => x.id === id);
    if (!confirm("Confermate che " + (p.location || "la location") + " è disponibile il " + (p.data_evento || "") + "? Al cliente arriva l'email per bloccare la data.")) return;
    b.disabled = true; const { error } = await sb().from("preventivi").update({ data_verificata_il: new Date().toISOString() }).eq("id", id);
    if (error) { b.disabled = false; alert(error.message); return; }
    S.daVer = S.daVer.filter((x) => x.id !== id); disegna();
  }
}
const CSS = '<style>.po-v{max-width:640px;box-sizing:border-box}.po-v *{box-sizing:border-box}.po-m{color:#64748b;font-size:13px}' +
  '.po-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:10px 0}.po-card.on{border-color:#16a34a;background:#f0fdf4}.po-card.warn{border-color:#f59e0b;background:#fffbeb}' +
  '.po-btn{display:inline-block;border:1px solid #e2e8f0;background:#fff;color:#0f172a;border-radius:10px;padding:9px 13px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;white-space:nowrap}.po-btn.p{background:#023C59;color:#fff;border-color:#023C59}.po-btn.s{padding:6px 10px;font-size:13px}.po-btn[disabled]{opacity:.45}' +
  '.po-ck{display:flex;align-items:center;gap:10px;border-top:1px solid #f1f5f9;padding:8px 0}.po-i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:700;flex:none}.po-i.ok{background:#dcfce7;color:#166534}.po-i.no{background:#fee2e2;color:#991b1b}' +
  '.po-dv{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid #fde68a;padding:8px 0}' +
  '.po-f{display:block;margin:8px 0}.po-f span{display:block;font-size:13px;color:#64748b;margin-bottom:3px}.po-f input,.po-f select{width:100%;min-height:42px;border:1px solid #e2e8f0;border-radius:9px;padding:8px 10px;font:inherit;font-size:16px}.po-f input[type=color]{padding:3px;width:70px}' +
  '.po-ln{display:flex;align-items:center;gap:6px;border-top:1px solid #f1f5f9;padding:8px 0}.po-url{font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.po-code{width:100%;min-height:80px;font-family:monospace;font-size:12px;border:1px solid #e2e8f0;border-radius:8px;padding:8px}</style>';
