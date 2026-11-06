// js/views/momenti.js
// Rotta PUBBLICA #/momenti?t=TOKEN_INVITATI&g=TOKEN_INVITATO  (oppure ?s=TOKEN_SPOSI per gli sposi)
// Social privato dell'evento in stile Instagram: storie 24h, post con piu' foto, like, commenti, profilo.
// Si entra solo con i link dell'evento; dal QR dei tavoli (solo t) si chiede il nome una volta.
// Tutti i dati passano dalle funzioni momenti_* (security definer); le foto dalla Edge Function momenti-upload.

const SUPA_URL = "https://cuhcscpvhypoaplcmtjk.supabase.co";
let S = null, A = null, F = null, vista = "home", filtroMomento = null, timer = null, persona = null;
const RU = () => (F?.evento?.ruolo === "Festeggiato" ? (L === "it" ? "Festeggiato" : "Host") : (L === "it" ? "Sposi" : "The couple"));

const L = (navigator.language || "it").slice(0, 2) === "it" ? "it" : "en";
const TXT = {
  it: { caric: "Un attimo…", err: "Questo collegamento non è valido.", chiudi: "Chiudi", tuaStoria: "La tua storia", nuovoPost: "Nuovo post",
    avanti: "Condividi", didascalia: "Scrivi una didascalia…", momento: "Momento", nessuno: "—", post: "Post", storia: "Storia",
    piace: (n) => n === 1 ? "1 mi piace" : n + " mi piace", tutti: (n) => "Mostra tutti e " + n + " i commenti", commenti: "Commenti",
    scrivi: "Aggiungi un commento…", pubblica: "Pubblica", vuoto: "Ancora nessuna foto. Sii il primo a condividere un momento!",
    tuoNome: "Come ti chiami?", nomeSott: "Lo vedranno gli sposi accanto alle tue foto.", entra: "Entra", caricamento: "Carico…",
    attesa: "Grazie! Gli sposi la vedranno prima di pubblicarla.", tropppoLungo: "I video possono durare al massimo 30 secondi.",
    invitati: "invitati", gestione: "Gestione", visibile: "Visibile", nascosto: "Nascosto", attivo: "Momenti attivo",
    moderazione: "Prima li guardiamo noi, poi escono", commOn: "Commenti degli invitati", videoOn: "Video (max 30 secondi)",
    album: "⬇️ Tutte le foto", qr: "🖨️ QR per i tavoli", ora: "ora", min: "min", h: "h", g: "g",
    momenti: ["Cerimonia", "Aperitivo", "Cena", "Festa"],
    storieFesta: "Le storie della festa", organizza: "Organizza qui la tua festa", orgTx: (l) => "Matrimonio, 18 anni, compleanno: chiedi una proposta", orgBtn: "Chiedi una proposta",
    recTit: "Com'è andata? Lascia una recensione", recTx: (l) => "Per noi conta tanto", recBtn: "Scrivi la recensione", tipoFesta: "Che festa?", quando: "Quando, anche indicativo", persone: "Quante persone", tuoTel: "Telefono (anche WhatsApp)", tuaMail: "Email", nota: "Qualcosa da dirci?", invia: "Invia la richiesta", grazie: "Grazie! Ti ricontattiamo a breve.", servecontatto: "Lascia un telefono o un'email.", cuori: "cuori", storieN: "storie", tipi: ["Matrimonio", "18 anni", "Compleanno", "Battesimo o comunione", "Laurea", "Cena aziendale", "Altro"],
    bacheca: "☆ Bacheca", inBacheca: "⭐ In bacheca", bachecaTx: (l) => "Le foto con ⭐ escono sul profilo di " + l + " nella tessera fidelity.", cookie: "Usiamo i cookie per misurare le visite e migliorare il servizio del locale.", accetta: "Accetta", rifiuta: "Rifiuta",
    condividi: "Condividi", tessTit: (l) => "Prendi la tessera di " + l, tessTx: (l) => "Sconti e novità, gratis", tessBtn: "Prendi la tessera" },
  en: { caric: "One moment…", err: "This link is not valid.", chiudi: "Close", tuaStoria: "Your story", nuovoPost: "New post",
    avanti: "Share", didascalia: "Write a caption…", momento: "Moment", nessuno: "—", post: "Post", storia: "Story",
    piace: (n) => n === 1 ? "1 like" : n + " likes", tutti: (n) => "View all " + n + " comments", commenti: "Comments",
    scrivi: "Add a comment…", pubblica: "Post", vuoto: "No photos yet. Be the first to share a moment!",
    tuoNome: "What's your name?", nomeSott: "The couple will see it next to your photos.", entra: "Enter", caricamento: "Uploading…",
    attesa: "Thank you! The couple will see it before it goes live.", tropppoLungo: "Videos can be up to 30 seconds.",
    invitati: "guests", gestione: "Manage", visibile: "Visible", nascosto: "Hidden", attivo: "Moments on",
    moderazione: "We review posts first", commOn: "Guest comments", videoOn: "Videos (max 30 seconds)",
    album: "⬇️ All photos", qr: "🖨️ Table QR codes", ora: "now", min: "m", h: "h", g: "d",
    momenti: ["Ceremony", "Aperitivo", "Dinner", "Party"],
    storieFesta: "Party stories", organizza: "Plan your party here", orgTx: (l) => "Wedding, birthday, party: ask for a proposal", orgBtn: "Ask for a proposal",
    recTit: "How was it? Leave a review", recTx: (l) => "It means a lot to us", recBtn: "Write a review", tipoFesta: "What kind of party?", quando: "When, roughly", persone: "How many people", tuoTel: "Phone (WhatsApp too)", tuaMail: "Email", nota: "Anything else?", invia: "Send the request", grazie: "Thank you! We will get back to you soon.", servecontatto: "Please leave a phone or an email.", cuori: "likes", storieN: "stories", tipi: ["Wedding", "18th birthday", "Birthday", "Christening", "Graduation", "Company dinner", "Other"],
    condividi: "Share", tessTit: (l) => "Get the " + l + " card", tessTx: (l) => "Offers and news, free", tessBtn: "Get the card" }
}[L];

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const q = new URLSearchParams(location.hash.split("?")[1] || "");
  const t = q.get("t") || null, g = q.get("g") || null, s = q.get("s") || null;
  if (!t && !s) { container.innerHTML = guscio(`<div class="mo-msg">${TXT.err}</div>`); return; }
  const kNome = "rf_momenti_nome_" + (t || "");
  let nome = null; try { nome = (!g && !s && t) ? localStorage.getItem(kNome) : null; } catch (_) {}
  A = { p_t: t, p_g: g, p_s: s, p_nome: nome };
  S = { supabase, container, t, g, s, kNome };
  container.innerHTML = guscio(`<div class="mo-msg">${TXT.caric}</div>`);
  await carica();
  clearInterval(timer);
  timer = setInterval(() => { if (document.visibilityState === "visible" && !document.querySelector(".mo-ov")) carica(true); }, 30000);
}

async function carica(silenzioso) {
  const { data, error } = await S.supabase.rpc("momenti_feed", A);
  if (error || !data) { if (!silenzioso) S.container.innerHTML = guscio(`<div class="mo-msg">${TXT.err}</div>`); return; }
  if (!data.ok) {
    if (data.serve_nome) return chiediNome(data.titolo);
    S.container.innerHTML = guscio(`<div class="mo-msg">${TXT.err}</div>`); return;
  }
  F = data; disegna();
}

function chiediNome(titolo) {
  S.container.innerHTML = guscio(`
    <div class="mo-app"><div class="mo-nome">
      <div class="mo-logo">${esc(titolo || "Momenti")}</div>
      <h2>${TXT.tuoNome}</h2><p>${TXT.nomeSott}</p>
      <input id="mo-nm" maxlength="40" autocomplete="name">
      <button class="mo-pb" id="mo-entra">${TXT.entra}</button>
    </div></div>`);
  const go = () => {
    const v = (S.container.querySelector("#mo-nm").value || "").trim();
    if (v.length < 2) return;
    try { localStorage.setItem(S.kNome, v); } catch (_) {}
    A.p_nome = v; carica();
  };
  S.container.querySelector("#mo-entra").addEventListener("click", go);
  S.container.querySelector("#mo-nm").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
}

function disegna() {
  const ev = F.evento || {};
  const io = F.io || {};
  const posts = filtroMomento ? (F.post || []).filter(p => p.momento === filtroMomento) : (F.post || []);
  let corpo = "";
  if (vista === "home") {
    corpo = `
      <div class="mo-stories">
        <div class="mo-st" data-nuovo="storia"><div class="mo-ring add"><div class="in">＋</div></div><span>${TXT.tuaStoria}</span></div>
        ${(F.storie || []).map((st, i) => `
          <div class="mo-st" data-storia="${i}"><div class="mo-ring"><div class="in" style="${bg(st.voci?.[st.voci.length - 1]?.media?.[0])}">${st.voci?.[0]?.media?.[0] ? "" : iniz(st.nome)}</div></div>
          <span>${esc(st.da_sposi ? RU() : primo(st.nome))}</span></div>`).join("")}
      </div>
      ${ev.passato && ev.azienda_id && !io.sposi ? `<a class="mo-tess" href="${esc(fidLink(ev))}" target="_blank" rel="noopener">
          <div class="lg" style="${ev.logo ? "background-image:url('" + esc(ev.logo) + "')" : ""}"></div>
          <div class="tx"><b>${esc(TXT.tessTit(ev.locale))}</b><span>${esc(TXT.tessTx(ev.locale || ""))}</span></div><i>›</i></a>` : ""}
      ${ev.dopo && ev.recensione && !io.sposi ? `<a class="mo-tess chiaro" href="${esc(ev.recensione)}" target="_blank" rel="noopener">
          <div class="lg ico">★</div><div class="tx"><b>${esc(TXT.recTit)}</b><span>${esc(TXT.recTx(ev.locale || ""))}</span></div><i>›</i></a>` : ""}
      ${ev.passato && ev.azienda_id && !io.sposi ? `<div class="mo-tess org" data-organizza>
          <div class="lg ico">🎉</div><div class="tx"><b>${esc(TXT.organizza)}</b><span>${esc(TXT.orgTx(ev.locale || ""))}</span></div><i>›</i></div>` : ""}
      ${posts.length ? posts.map(postHtml).join("") : `<div class="mo-vuoto">${TXT.vuoto}</div>`}`;
  } else if (vista === "profilo") {
    const momenti = TXT.momenti;
    corpo = `
      <div class="mo-pro">
        <div class="mo-prow"><div class="mo-big" style="${ev.copertina ? "background-image:url('" + esc(ev.copertina) + "')" : ""}">${ev.copertina ? "" : "💍"}</div>
          <div class="mo-nums"><div><b>${(F.post || []).length}</b><span>${TXT.post.toLowerCase()}</span></div>
          <div><b>${ev.invitati || 0}</b><span>${TXT.invitati}</span></div>
          <div><b>${ev.data ? esc(String(ev.data).slice(8, 10) + "." + String(ev.data).slice(5, 7)) : "—"}</b><span>${ev.data ? esc(String(ev.data).slice(0, 4)) : ""}</span></div></div></div>
        <div class="mo-bio"><b>${esc(ev.titolo || "")}</b></div>
        <button class="mo-pb" data-nuovo="post" style="margin-top:12px">📷 ${TXT.nuovoPost}</button>
        <div class="mo-hl">${(F.storie_tutte || []).length ? `<div data-tutte><i class="anello" style="${bg((F.storie_tutte || [])[0]?.media?.[0])}"></i>${esc(TXT.storieFesta)}</div>` : ""}${momenti.map(m => `<div data-mom="${esc(m)}" class="${filtroMomento === m ? "on" : ""}"><i style="${bg((F.post || []).find(p => p.momento === m)?.media?.[0])}"></i>${esc(m)}</div>`).join("")}</div>
      </div>
      <div class="mo-grid">${posts.map(p => `<div data-apri="${p.id}" style="${bg(p.media?.[0])}">${(p.media || []).length > 1 ? "<i>❐</i>" : ""}${p.media?.[0]?.tipo === "video" ? "<i>▶</i>" : ""}</div>`).join("")}</div>`;
  } else if (vista === "persona" && persona) {
    const suoi = (F.post || []).filter(p => p.autore === persona);
    const sueSt = (F.storie_tutte || []).filter(x => x.autore === persona);
    const nome = (suoi[0] || sueSt[0] || {}).nome || "";
    const sposi = (suoi[0] || sueSt[0] || {}).da_sposi;
    const cuori = suoi.reduce((t, p) => t + Number(p.like_n || 0), 0);
    corpo = `
      <div class="mo-pro">
        <div class="mo-prow"><div class="mo-big">${iniz(nome)}</div>
          <div class="mo-nums"><div><b>${suoi.length}</b><span>${TXT.post.toLowerCase()}</span></div>
          <div><b>${sueSt.length}</b><span>${TXT.storieN}</span></div><div><b>${cuori}</b><span>${TXT.cuori}</span></div></div></div>
        <div class="mo-bio"><b>${esc(sposi ? RU() : nome)}</b><br><span style="color:var(--m)">${esc(ev.titolo || "")}</span></div>
        ${sueSt.length ? `<div class="mo-hl"><div data-sue><i class="anello" style="${bg(sueSt[0]?.media?.[0])}"></i>${esc(TXT.storieN)}</div></div>` : ""}
      </div>
      <div class="mo-grid">${suoi.map(p => `<div data-apri="${p.id}" style="${bg(p.media?.[0])}">${(p.media || []).length > 1 ? "<i>❐</i>" : ""}${p.media?.[0]?.tipo === "video" ? "<i>▶</i>" : ""}</div>`).join("")}</div>`;
  } else if (vista === "gestione") {
    corpo = `<div id="mo-gest" class="mo-pro">${TXT.caric}</div>`;
  }
  S.container.innerHTML = guscio(`
    <div class="mo-app">
      <div class="mo-top"><div class="mo-logo">${esc(ev.titolo || "Momenti")}</div><div class="mo-ic"><span data-nuovo="post">⊕</span></div></div>
      <div class="mo-corpo">${corpo}</div>
      <div class="mo-tab">
        <span data-vista="home" class="${vista === "home" ? "on" : ""}">⌂</span>
        <span data-nuovo="post">⊕</span>
        <span data-vista="profilo" class="${vista === "profilo" ? "on" : ""}">◯</span>
        ${io.sposi ? `<span data-vista="gestione" class="${vista === "gestione" ? "on" : ""}">⚙︎</span>` : ""}
      </div>
    </div>`);
  aggancia();
  if (vista === "gestione") gestione();
}

function postHtml(p) {
  const media = p.media || [];
  return `
    <div class="mo-post" data-post="${p.id}">
      <div class="h" data-persona="${esc(p.autore || "")}"><div class="av">${iniz(p.nome)}</div><div><b>${esc(p.da_sposi ? RU() : p.nome)}</b>${p.momento ? `<span>${esc(p.momento)}</span>` : ""}</div></div>
      <div class="mo-car" data-dbl="${p.id}">
        ${media.map(m => m.tipo === "video"
          ? `<video src="${esc(m.url)}" playsinline controls preload="metadata"></video>`
          : `<img src="${esc(m.url)}" loading="lazy" alt="">`).join("")}
        <div class="mo-cuore">♥</div>
      </div>
      ${media.length > 1 ? `<div class="mo-dots">${media.map((_, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("")}</div>` : ""}
      <div class="act"><span data-like="${p.id}" class="${p.mi_piace ? "on" : ""}">${p.mi_piace ? "♥" : "♡"}</span>${F.evento?.commenti ? `<span data-comm="${p.id}">💬</span>` : ""}<span data-share="${p.id}" title="${TXT.condividi}">✈︎</span></div>
      ${p.like_n ? `<div class="likes" data-lk="${p.id}">${TXT.piace(p.like_n)}</div>` : `<div class="likes" data-lk="${p.id}"></div>`}
      ${p.testo ? `<div class="cap"><b>${esc(p.da_sposi ? RU() : p.nome)}</b> ${esc(p.testo)}</div>` : ""}
      ${p.comm_n > 2 ? `<div class="com" data-comm="${p.id}">${TXT.tutti(p.comm_n)}</div>` : ""}
      ${(p.ultimi || []).map(c => `<div class="cap"><b>${esc(c.nome)}</b> ${esc(c.testo)}</div>`).join("")}
      <div class="time">${fa(p.il)}</div>
    </div>`;
}

function aggancia() {
  const c = S.container;
  c.querySelectorAll("[data-vista]").forEach(b => b.addEventListener("click", () => { vista = b.dataset.vista; disegna(); window.scrollTo(0, 0); }));
  c.querySelectorAll("[data-nuovo]").forEach(b => b.addEventListener("click", () => nuovo(b.dataset.nuovo)));
  c.querySelectorAll("[data-storia]").forEach(b => b.addEventListener("click", () => storie(Number(b.dataset.storia))));
  c.querySelectorAll("[data-like]").forEach(b => b.addEventListener("click", () => like(b.dataset.like)));
  c.querySelectorAll("[data-comm]").forEach(b => b.addEventListener("click", () => commenti(b.dataset.comm)));
  c.querySelectorAll("[data-share]").forEach(b => b.addEventListener("click", () => condividi(b.dataset.share)));
  c.querySelectorAll("[data-persona]").forEach(b => b.addEventListener("click", () => { if (!b.dataset.persona) return; persona = b.dataset.persona; vista = "persona"; disegna(); window.scrollTo(0, 0); }));
  c.querySelectorAll("[data-tutte]").forEach(b => b.addEventListener("click", () => storieDa([{ nome: TXT.storieFesta, festa: true, voci: (F.storie_tutte || []).map(x => ({ media: x.media, testo: x.testo, il: x.il, chi: x.da_sposi ? RU() : x.nome })) }], 0)));
  c.querySelectorAll("[data-sue]").forEach(b => b.addEventListener("click", () => { const v = (F.storie_tutte || []).filter(x => x.autore === persona); if (v.length) storieDa([{ nome: v[0].da_sposi ? RU() : v[0].nome, voci: v }], 0); }));
  c.querySelectorAll("[data-organizza]").forEach(b => b.addEventListener("click", organizza));
  c.querySelectorAll("[data-mom]").forEach(b => b.addEventListener("click", () => { filtroMomento = filtroMomento === b.dataset.mom ? null : b.dataset.mom; disegna(); }));
  c.querySelectorAll("[data-apri]").forEach(b => b.addEventListener("click", () => {
    vista = "home"; disegna(); const el = S.container.querySelector(`[data-post="${b.dataset.apri}"]`); if (el) el.scrollIntoView();
  }));
  // doppio tocco sulla foto = mi piace, come Instagram
  c.querySelectorAll("[data-dbl]").forEach(el => {
    let ultimo = 0;
    el.addEventListener("click", (e) => {
      if (e.target.tagName === "VIDEO") return;
      const ora = Date.now();
      if (ora - ultimo < 320) {
        const p = (F.post || []).find(x => x.id === el.dataset.dbl);
        if (p && !p.mi_piace) like(p.id);
        const h = el.querySelector(".mo-cuore"); h.classList.remove("go"); void h.offsetWidth; h.classList.add("go");
      }
      ultimo = ora;
    });
    // pallini del carosello
    el.addEventListener("scroll", () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      el.parentElement.querySelectorAll(".mo-dots i").forEach((d, k) => d.classList.toggle("on", k === i));
    }, { passive: true });
  });
}

async function like(id) {
  const p = (F.post || []).find(x => x.id === id); if (!p) return;
  p.mi_piace = !p.mi_piace; p.like_n = Math.max(0, (p.like_n || 0) + (p.mi_piace ? 1 : -1));
  const b = S.container.querySelector(`[data-like="${id}"]`); if (b) { b.textContent = p.mi_piace ? "♥" : "♡"; b.classList.toggle("on", p.mi_piace); }
  const lk = S.container.querySelector(`[data-lk="${id}"]`); if (lk) lk.textContent = p.like_n ? TXT.piace(p.like_n) : "";
  const { data } = await S.supabase.rpc("momenti_like", Object.assign({}, A, { p_post: id }));
  if (data?.ok) { p.mi_piace = data.mi_piace; p.like_n = data.like_n; if (lk) lk.textContent = p.like_n ? TXT.piace(p.like_n) : ""; }
}

async function commenti(id) {
  const ov = overlay(`<div class="mo-sheet"><div class="mo-sh-h"><b>${TXT.commenti}</b><span data-x>✕</span></div>
      <div class="mo-cl" id="mo-cl">${TXT.caric}</div>
      <div class="mo-cin"><input id="mo-ct" maxlength="500" placeholder="${TXT.scrivi}"><button id="mo-cs">${TXT.pubblica}</button></div></div>`);
  const lista = async () => {
    const { data } = await S.supabase.rpc("momenti_commenti_lista", Object.assign({}, A, { p_post: id }));
    ov.querySelector("#mo-cl").innerHTML = (data || []).map(c => `<div class="mo-cr"><div class="av">${iniz(c.nome)}</div><div><b>${esc(c.nome)}</b> ${esc(c.testo)}<span>${fa(c.il)}</span></div></div>`).join("") || "";
  };
  await lista();
  const invia = async () => {
    const inp = ov.querySelector("#mo-ct"); const v = inp.value.trim(); if (!v) return;
    inp.value = ""; await S.supabase.rpc("momenti_commenta", Object.assign({}, A, { p_post: id, p_testo: v }));
    await lista(); carica(true);
  };
  ov.querySelector("#mo-cs").addEventListener("click", invia);
  ov.querySelector("#mo-ct").addEventListener("keydown", (e) => { if (e.key === "Enter") invia(); });
}

function storie(i) { storieDa(F.storie || [], i); }
function storieDa(tutte, i) {
  let s = i, v = 0, tm = null;
  const ov = overlay(`<div class="mo-sv"><div class="bars"></div><div class="sh"></div><span class="x" data-x>✕</span><div class="med"></div><div class="tx"></div></div>`, true);
  const mostra = () => {
    clearTimeout(tm);
    const st = tutte[s]; if (!st) return chiudi(ov);
    const voce = st.voci[v]; if (!voce) { s++; v = 0; return mostra(); }
    ov.querySelector(".bars").innerHTML = st.voci.map((_, k) => `<i class="${k < v ? "on" : k === v ? "va" : ""}"></i>`).join("");
    const chi = voce.chi || (st.da_sposi ? RU() : st.nome);
    ov.querySelector(".sh").innerHTML = `<div class="av">${iniz(chi)}</div>${esc(st.festa ? st.nome + " · " + chi : chi)} · ${fa(voce.il)}`;
    const m = voce.media?.[0];
    ov.querySelector(".med").innerHTML = m?.tipo === "video" ? `<video src="${esc(m.url)}" autoplay playsinline></video>` : `<img src="${esc(m?.url || "")}" alt="">`;
    ov.querySelector(".tx").textContent = voce.testo || "";
    const vid = ov.querySelector(".med video");
    if (vid) vid.addEventListener("ended", () => { v++; mostra(); }); else tm = setTimeout(() => { v++; mostra(); }, 5000);
  };
  ov.querySelector(".med").addEventListener("click", (e) => {
    const sx = e.clientX < window.innerWidth / 3;
    if (sx) { if (v > 0) v--; else if (s > 0) { s--; v = 0; } } else v++;
    mostra();
  });
  ov.addEventListener("rf-chiuso", () => clearTimeout(tm));
  mostra();
}

function nuovo(tipo) {
  let file = [];
  const ev = F.evento || {};
  const ov = overlay(`<div class="mo-sheet alto">
      <div class="mo-sh-h"><span data-x>✕</span><b>${tipo === "storia" ? TXT.storia : TXT.nuovoPost}</b><span id="mo-go" class="blu">${TXT.avanti}</span></div>
      <label class="mo-pick"><input type="file" id="mo-f" accept="image/*${ev.video ? ",video/*" : ""}" ${tipo === "storia" ? "" : "multiple"} hidden>
        <div id="mo-prev" class="mo-prev">＋</div></label>
      <div class="mo-thumbs" id="mo-th"></div>
      ${tipo === "storia" ? "" : `<textarea id="mo-cap" rows="3" maxlength="2200" placeholder="${TXT.didascalia}"></textarea>
      <div class="mo-mom"><span>${TXT.momento}</span>${TXT.momenti.map(m => `<button data-m="${esc(m)}">${esc(m)}</button>`).join("")}</div>`}
      <div id="mo-es" class="mo-es"></div></div>`);
  let momento = null;
  ov.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => {
    momento = momento === b.dataset.m ? null : b.dataset.m;
    ov.querySelectorAll("[data-m]").forEach(x => x.classList.toggle("on", x.dataset.m === momento));
  }));
  ov.querySelector("#mo-f").addEventListener("change", async (e) => {
    file = Array.from(e.target.files || []).slice(0, 10);
    const es = ov.querySelector("#mo-es"); es.textContent = "";
    for (const f of file) if (f.type.startsWith("video/")) { const d = await durata(f); if (d > 31) { es.textContent = TXT.tropppoLungo; file = file.filter(x => x !== f); } }
    const urls = file.map(f => URL.createObjectURL(f));
    ov.querySelector("#mo-prev").innerHTML = file[0] ? (file[0].type.startsWith("video/") ? `<video src="${urls[0]}" muted playsinline></video>` : `<img src="${urls[0]}">`) : "＋";
    ov.querySelector("#mo-th").innerHTML = file.length > 1 ? urls.map((u, k) => file[k].type.startsWith("video/") ? `<div class="v">▶</div>` : `<div style="background-image:url('${u}')"></div>`).join("") : "";
  });
  ov.querySelector("#mo-go").addEventListener("click", async () => {
    if (!file.length) { ov.querySelector("#mo-f").click(); return; }
    const go = ov.querySelector("#mo-go"); if (go.dataset.busy) return; go.dataset.busy = "1";
    const es = ov.querySelector("#mo-es"); es.textContent = TXT.caricamento;
    try {
      const pronti = [];
      for (const f of file) pronti.push(f.type.startsWith("video/") ? { blob: f, tipo: f.type || "video/mp4" } : await riduci(f));
      const r = await fetch(SUPA_URL + "/functions/v1/momenti-upload", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: A.p_t, g: A.p_g, s: A.p_s, nome: A.p_nome, file: pronti.map(p => ({ tipo: p.tipo })) }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.errore || "upload");
      const media = [];
      for (let k = 0; k < pronti.length; k++) {
        const u = j.file[k]; if (!u?.ok) continue;
        const up = await S.supabase.storage.from("momenti").uploadToSignedUrl(u.path, u.token, pronti[k].blob, { contentType: pronti[k].tipo });
        if (up.error) continue;
        media.push({ url: u.url, tipo: u.tipo, w: pronti[k].w || null, h: pronti[k].h || null });
        es.textContent = TXT.caricamento + " " + (k + 1) + "/" + pronti.length;
      }
      if (!media.length) throw new Error("upload");
      const { data } = await S.supabase.rpc("momenti_pubblica", Object.assign({}, A, {
        p_tipo: tipo, p_testo: ov.querySelector("#mo-cap")?.value || null, p_media: media, p_momento: momento }));
      if (!data?.ok) throw new Error(data?.errore || "pubblica");
      if (data.in_attesa) { es.textContent = TXT.attesa; setTimeout(() => chiudi(ov), 1800); }
      else { chiudi(ov); vista = "home"; await carica(); window.scrollTo(0, 0); }
    } catch (err) { console.error(err); es.textContent = "⚠️ " + (err.message || "errore"); delete go.dataset.busy; }
  });
  setTimeout(() => ov.querySelector("#mo-f").click(), 50);
}

async function gestione() {
  const box = S.container.querySelector("#mo-gest");
  const giro = async (azione, dati) => {
    const { data } = await S.supabase.rpc("momenti_sposi", { p_s: A.p_s, p_azione: azione || "elenco", p_dati: dati || {} });
    if (!data?.ok) { box.textContent = TXT.err; return; }
    const im = data.impostazioni || {};
    const sw = (k, l) => `<div class="mo-sw"><span>${l}</span><i data-imp="${k}" class="${im[k] ? "on" : ""}"></i></div>`;
    const linkQr = location.origin + location.pathname.replace(/index\.html$/, "") + "#/momenti?t=" + (S.t || "");
    box.innerHTML = `
      <div style="font-weight:700;font-size:16px;margin-bottom:6px">Momenti · ${data.totale} ${TXT.post.toLowerCase()}</div>
      ${(data.post || []).map(p => `<div class="mo-mrow"><div class="th" style="${bg(p.media?.[0])}"></div>
          <div class="tx"><b>${esc(p.nome)}</b> · ${p.tipo === "storia" ? TXT.storia : (p.media || []).length + " 📷"}<span>${esc(p.testo || "")} · ${fa(p.il)}</span></div>
          <button class="pill ${p.nascosto ? "no" : "ok"}" data-nasc="${p.id}" data-v="${p.nascosto ? "0" : "1"}">${p.nascosto ? TXT.nascosto : TXT.visibile}</button></div>`).join("")}
      <div style="height:10px"></div>
      ${sw("attivo", TXT.attivo)}${sw("moderazione", TXT.moderazione)}${sw("commenti", TXT.commOn)}${sw("video", TXT.videoOn)}
      <div class="mo-btnrow"><button class="mo-b2" id="mo-album">${TXT.album}</button><button class="mo-b2" id="mo-qr">${TXT.qr}</button></div>`;
    box.querySelectorAll("[data-nasc]").forEach(b => b.addEventListener("click", () => giro("nascondi", { id: b.dataset.nasc, nascosto: b.dataset.v === "1" })));
    box.querySelectorAll("[data-imp]").forEach(b => b.addEventListener("click", () => giro("impostazioni", { [b.dataset.imp]: !b.classList.contains("on") })));
    box.querySelector("#mo-album").addEventListener("click", () => {
      const urls = []; (data.post || []).forEach(p => (p.media || []).forEach(m => urls.push(m.url)));
      overlay(`<div class="mo-sheet alto"><div class="mo-sh-h"><b>${TXT.album}</b><span data-x>✕</span></div>
        <div class="mo-grid">${urls.map(u => `<a href="${esc(u)}" download target="_blank" style="background-image:url('${esc(u)}')"></a>`).join("")}</div></div>`);
    });
    box.querySelector("#mo-qr").addEventListener("click", () => {
      if (!S.t) return;
      const img = "https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=" + encodeURIComponent(linkQr);
      overlay(`<div class="mo-sheet alto" style="text-align:center"><div class="mo-sh-h"><b>${TXT.qr}</b><span data-x>✕</span></div>
        <img src="${img}" style="width:70%;max-width:280px;margin:16px auto;display:block" alt="QR">
        <div style="font-weight:700">📸 ${esc(F.evento?.titolo || "")}</div><div class="mo-es">${esc(linkQr)}</div></div>`);
    });
  };
  // gli sposi entrano con s; il link per il QR usa il token degli invitati, che qui non c'e': lo recupero dalla gestione dello spazio
  if (!S.t) { try { const r = await S.supabase.rpc("spazio_sposi", { p_token: A.p_s }); S.t = r.data?.token_invitati || null; } catch (_) {} }
  await giro();
}

// Condividi su Instagram (o dove vuole l'invitato): la foto esce con il logo del locale in basso a destra.
// Nessun collegamento all'account: si apre la condivisione del telefono e la persona sceglie storia, feed o altro.
async function condividi(id) {
  const p = (F.post || []).find(x => x.id === id); if (!p) return;
  const ev = F.evento || {}; const m = (p.media || [])[0]; if (!m) return;
  const testo = (p.testo ? p.testo + " · " : "") + (ev.titolo || "") + (ev.locale ? " · " + ev.locale : "");
  try {
    let file = null;
    if (m.tipo === "foto") {
      const img = await caricaImg(m.url);
      const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const x = cv.getContext("2d"); x.drawImage(img, 0, 0);
      if (ev.logo) {
        try {
          const lg = await caricaImg(ev.logo);
          const lw = Math.round(cv.width * 0.18), lh = Math.round(lw * lg.naturalHeight / lg.naturalWidth), pad = Math.round(cv.width * 0.03);
          x.fillStyle = "rgba(255,255,255,.82)";
          const bx = cv.width - lw - pad * 2, by = cv.height - lh - pad * 2;
          if (x.roundRect) { x.beginPath(); x.roundRect(bx, by, lw + pad * 1.2, lh + pad * 1.2, pad * 0.6); x.fill(); } else x.fillRect(bx, by, lw + pad * 1.2, lh + pad * 1.2);
          x.drawImage(lg, bx + pad * 0.6, by + pad * 0.6, lw, lh);
        } catch (_) {}
      }
      const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.9));
      file = new File([blob], "momenti.jpg", { type: "image/jpeg" });
    }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: testo }); return; }
    if (!file && navigator.share) { await navigator.share({ url: m.url, text: testo }); return; }
    // computer o telefono senza condivisione: scarico la foto con il logo
    const a = document.createElement("a"); a.href = file ? URL.createObjectURL(file) : m.url; a.download = "momenti.jpg"; a.target = "_blank"; document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { if (e && e.name !== "AbortError") console.error(e); }
}
// "Organizza qui la tua festa": la richiesta arriva nelle Richieste dal sito del locale (fonte momenti)
function organizza() {
  const ev = F.evento || {};
  const ov = overlay(`<div class="mo-sheet alto"><div class="mo-sh-h"><span data-x>✕</span><b>${esc(TXT.organizza)}</b><span></span></div>
    <div class="mo-form">
      <label>${TXT.tipoFesta}</label><div class="mo-mom">${TXT.tipi.map(t => `<button data-tp="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <label>${TXT.quando}</label><input id="of-q" maxlength="60">
      <label>${TXT.persone}</label><input id="of-p" inputmode="numeric" maxlength="4">
      <label>${TXT.tuoTel}</label><input id="of-t" type="tel" maxlength="30" autocomplete="tel">
      <label>${TXT.tuaMail}</label><input id="of-e" type="email" maxlength="120" autocomplete="email">
      <label>${TXT.nota}</label><textarea id="of-m" rows="3" maxlength="1000"></textarea>
      <button class="mo-pb" id="of-go" style="margin-top:12px">${TXT.invia}</button><div class="mo-es" id="of-es"></div>
    </div></div>`);
  let tipo = null;
  ov.querySelectorAll("[data-tp]").forEach(b => b.addEventListener("click", () => { tipo = b.dataset.tp; ov.querySelectorAll("[data-tp]").forEach(x => x.classList.toggle("on", x === b)); }));
  ov.querySelector("#of-go").addEventListener("click", async () => {
    const v = (id) => (ov.querySelector(id).value || "").trim();
    const es = ov.querySelector("#of-es");
    if (!v("#of-t") && !v("#of-e")) { es.textContent = TXT.servecontatto; return; }
    const go = ov.querySelector("#of-go"); go.disabled = true;
    const { data } = await S.supabase.rpc("momenti_richiesta", Object.assign({}, A, { p_dati: { nome: F.io?.nome || A.p_nome, tipo, quando: v("#of-q"), persone: v("#of-p"), telefono: v("#of-t"), email: v("#of-e"), messaggio: v("#of-m"), lingua: L } }));
    if (data?.ok) { ov.querySelector(".mo-form").innerHTML = `<div class="mo-vuoto">🎉<br>${esc(TXT.grazie)}</div>`; setTimeout(() => chiudi(ov), 2500); }
    else { go.disabled = false; es.textContent = "⚠️ " + (data?.errore || TXT.err); }
  });
}
function caricaImg(url) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + "cors=1"; }); }
function fidLink(ev) { return location.origin + "/fidelity.html?a=" + encodeURIComponent(ev.azienda_id) + "&utm_source=momenti"; }

// ---------- utilita' ----------
function overlay(html, scuro) {
  const ov = document.createElement("div"); ov.className = "mo-ov" + (scuro ? " scuro" : "");
  ov.innerHTML = html; document.body.appendChild(ov);
  ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest("[data-x]")) chiudi(ov); });
  return ov;
}
function chiudi(ov) { ov.dispatchEvent(new Event("rf-chiuso")); ov.remove(); }
function riduci(file) {
  return new Promise((res) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1600; let w = img.naturalWidth, h = img.naturalHeight;
      if (Math.max(w, h) > max) { const k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(img, 0, 0, w, h);
      cv.toBlob((b) => { URL.revokeObjectURL(url); res({ blob: b || file, tipo: "image/jpeg", w, h }); }, "image/jpeg", 0.82);
    };
    img.onerror = () => res({ blob: file, tipo: file.type || "image/jpeg" });
    img.src = url;
  });
}
function durata(f) { return new Promise((res) => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => res(v.duration || 0); v.onerror = () => res(0); v.src = URL.createObjectURL(f); }); }
function bg(m) { return m && m.url ? (m.tipo === "video" ? "background:#222" : `background-image:url('${esc(m.url)}')`) : ""; }
function iniz(n) { return esc(String(n || "?").trim().split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase()); }
function primo(n) { return String(n || "").trim().split(/\s+/)[0]; }
function fa(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return TXT.ora; if (s < 3600) return Math.floor(s / 60) + " " + TXT.min;
  if (s < 86400) return Math.floor(s / 3600) + " " + TXT.h; return Math.floor(s / 86400) + " " + TXT.g;
}
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function guscio(dentro) {
  return `<style>
  .mo{--bg:#fafafa;--app:#fff;--t:#0f0f0f;--m:#737373;--b:#dbdbdb;--blu:#0095f6;min-height:100vh;background:var(--bg);color:var(--t);
      font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  @media (prefers-color-scheme:dark){.mo{--bg:#000;--app:#000;--t:#f5f5f5;--m:#a8a8a8;--b:#262626}}
  .mo-msg{padding:60px 20px;text-align:center;color:var(--m)}
  .mo-app{max-width:470px;margin:0 auto;background:var(--app);min-height:100vh;padding-bottom:70px;position:relative}
  .mo-top{position:sticky;top:0;z-index:5;background:var(--app);display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px;border-bottom:1px solid var(--b)}
  .mo-logo{font:600 24px/1.1 "Snell Roundhand","Brush Script MT","Segoe Script",Georgia,serif;max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mo-ic span{font-size:24px;cursor:pointer}
  .mo-stories{display:flex;gap:12px;padding:10px 12px;overflow-x:auto;border-bottom:1px solid var(--b);scrollbar-width:none}
  .mo-st{width:66px;flex:none;text-align:center;font-size:11px;cursor:pointer}
  .mo-st span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px}
  .mo-ring{width:64px;height:64px;border-radius:50%;padding:2.5px;background:conic-gradient(#f9ce34,#ee2a7b,#6228d7,#f9ce34)}
  .mo-ring.add{background:var(--b)}
  .mo-ring .in{width:100%;height:100%;border-radius:50%;border:2.5px solid var(--app);background:#ccc center/cover;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff}
  .mo-ring.add .in{background:var(--bg);color:var(--m);font-size:26px}
  .mo-post{border-bottom:1px solid var(--b);padding-bottom:6px}
  .mo-post .h{display:flex;align-items:center;gap:10px;padding:10px 12px}
  .mo-post .h b{font-size:13px}.mo-post .h span{display:block;font-size:12px;color:var(--m)}
  .av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#C08497,#7C2D4A);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex:none}
  .mo-car{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;position:relative;scrollbar-width:none;background:#000}
  .mo-car::-webkit-scrollbar,.mo-stories::-webkit-scrollbar{display:none}
  .mo-car img,.mo-car video{flex:none;width:100%;scroll-snap-align:start;object-fit:cover;max-height:585px;aspect-ratio:4/5;display:block}
  .mo-cuore{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(0);font-size:96px;color:#fff;text-shadow:0 4px 20px rgba(0,0,0,.4);pointer-events:none;opacity:0}
  .mo-cuore.go{animation:mocu .9s ease}
  @keyframes mocu{15%{transform:translate(-50%,-50%) scale(1.15);opacity:1}30%{transform:translate(-50%,-50%) scale(.95)}70%{opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:0}}
  .mo-dots{display:flex;justify-content:center;gap:4px;margin-top:8px}.mo-dots i{width:6px;height:6px;border-radius:50%;background:var(--b)}.mo-dots i.on{background:var(--blu)}
  .mo-post .act{display:flex;gap:16px;padding:8px 12px 2px;font-size:25px}
  .mo-post .act span{cursor:pointer;user-select:none}.mo-post .act span.on{color:#ff3040}
  .likes{padding:0 12px;font-weight:600;font-size:13px;min-height:2px}
  .cap{padding:3px 12px;font-size:13px;word-wrap:break-word}
  .com{padding:2px 12px;color:var(--m);font-size:13px;cursor:pointer}
  .time{padding:4px 12px 10px;color:var(--m);font-size:11px;text-transform:uppercase}
  .mo-vuoto{padding:50px 24px;text-align:center;color:var(--m)}
  .mo-tess{display:flex;align-items:center;gap:10px;margin:8px 12px;padding:9px 12px;border-radius:14px;text-decoration:none;color:#fff;background:linear-gradient(135deg,#1f1a17,#3a2f26);border:1px solid #b08d57}
  .mo-tess .lg{width:38px;height:38px;border-radius:10px;background:#fff center/contain no-repeat;flex:none}
  .mo-tess .tx{flex:1;min-width:0}.mo-tess b{display:block;font-size:14px}.mo-tess span{display:block;font-size:12px;opacity:.85;line-height:1.3}
  .mo-tess i{font-style:normal;font-size:24px;font-weight:400;color:#e8c98a;white-space:nowrap}
  .mo-tess.chiaro{background:var(--app);color:var(--t);border-color:var(--b)}.mo-tess.chiaro i{color:var(--blu)}
  .mo-tess.org{background:linear-gradient(120deg,#f9ce34,#ee2a7b 45%,#6228d7);border:0;cursor:pointer}.mo-tess.org i{color:#fff}
  .mo-tess .lg.ico{display:flex;align-items:center;justify-content:center;font-size:24px;background:rgba(255,255,255,.9);color:#b08d57}
  .mo-hl i.anello{border:2px solid transparent;background-clip:padding-box;box-shadow:0 0 0 2px #ee2a7b}
  .mo-post .h{cursor:pointer}
  .mo-form label{display:block;font-size:13px;color:var(--m);margin:10px 0 4px}
  .mo-form input,.mo-form textarea{width:100%;box-sizing:border-box;border:1px solid var(--b);background:var(--bg);color:var(--t);border-radius:8px;padding:10px;font-size:15px;font-family:inherit}
  .mo-tab{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:470px;display:flex;justify-content:space-around;background:var(--app);border-top:1px solid var(--b);
          padding:10px 0 calc(12px + env(safe-area-inset-bottom,0px));font-size:24px;z-index:6}
  .mo-tab span{cursor:pointer;opacity:.6}.mo-tab span.on{opacity:1}
  .mo-pro{padding:14px}
  .mo-prow{display:flex;align-items:center;gap:22px}
  .mo-big{width:84px;height:84px;border-radius:50%;background:linear-gradient(135deg,#C08497,#7C2D4A) center/cover;flex:none;display:flex;align-items:center;justify-content:center;font-size:34px}
  .mo-nums{display:flex;gap:18px;text-align:center}.mo-nums b{display:block;font-size:16px}.mo-nums span{font-size:12px}
  .mo-bio{margin-top:10px;font-size:13px}
  .mo-pb{width:100%;border:0;background:var(--blu);color:#fff;border-radius:8px;padding:9px;font-weight:600;font-size:14px;cursor:pointer}
  .mo-hl{display:flex;gap:14px;margin-top:14px;overflow-x:auto}.mo-hl div{text-align:center;font-size:11px;cursor:pointer;flex:none}
  .mo-hl i{display:block;width:58px;height:58px;border-radius:50%;border:1px solid var(--b);background:var(--bg) center/cover;margin-bottom:4px}
  .mo-hl div.on i{border:2px solid var(--blu)}
  .mo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
  .mo-grid>*{aspect-ratio:1;background:#ddd center/cover;position:relative;display:block}
  .mo-grid i{position:absolute;top:6px;right:6px;color:#fff;font-style:normal;text-shadow:0 1px 3px rgba(0,0,0,.6)}
  .mo-nome{padding:60px 24px;text-align:center}.mo-nome h2{margin:22px 0 6px}.mo-nome p{color:var(--m);margin:0 0 16px}
  .mo-nome input{width:100%;box-sizing:border-box;border:1px solid var(--b);background:var(--bg);color:var(--t);border-radius:8px;padding:12px;font-size:16px;margin-bottom:12px}
  .mo-ov{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}
  .mo-ov.scuro{background:#000;align-items:stretch}
  .mo-sheet{background:var(--app,#fff);color:var(--t,#111);width:100%;max-width:470px;border-radius:14px 14px 0 0;max-height:80vh;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom,0px)}
  .mo-sheet.alto{max-height:94vh;overflow:auto;padding:0 14px 20px;box-sizing:border-box}
  .mo-sh-h{display:flex;justify-content:space-between;align-items:center;padding:14px;border-bottom:1px solid var(--b,#ddd);font-size:15px}
  .mo-sheet.alto .mo-sh-h{margin:0 -14px 12px}
  .mo-sh-h span{cursor:pointer;font-weight:600}.blu{color:#0095f6}
  .mo-cl{overflow:auto;padding:8px 14px;flex:1}
  .mo-cr{display:flex;gap:10px;padding:8px 0;font-size:13px}.mo-cr span{display:block;color:#8e8e8e;font-size:11px;margin-top:2px}
  .mo-cin{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--b,#ddd)}
  .mo-cin input{flex:1;border:0;background:transparent;color:inherit;font-size:15px;outline:0}
  .mo-cin button{border:0;background:none;color:#0095f6;font-weight:700;font-size:14px}
  .mo-pick{display:block;cursor:pointer}
  .mo-prev{width:100%;aspect-ratio:1;border-radius:6px;background:#efefef;display:flex;align-items:center;justify-content:center;font-size:40px;color:#999;overflow:hidden}
  .mo-prev img,.mo-prev video{width:100%;height:100%;object-fit:cover}
  .mo-thumbs{display:flex;gap:4px;margin-top:6px;overflow-x:auto}.mo-thumbs div{width:60px;height:60px;flex:none;border-radius:4px;background:#ddd center/cover}
  .mo-thumbs .v{display:flex;align-items:center;justify-content:center;background:#222;color:#fff}
  .mo-sheet textarea{width:100%;box-sizing:border-box;border:0;border-bottom:1px solid #ddd;background:transparent;color:inherit;font-size:15px;padding:12px 0;resize:none;font-family:inherit;outline:0}
  .mo-mom{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:12px 0;font-size:13px;color:#8e8e8e}
  .mo-mom button{border:1px solid #ddd;background:transparent;color:inherit;border-radius:999px;padding:6px 12px;font-size:13px}
  .mo-mom button.on{background:#0095f6;border-color:#0095f6;color:#fff}
  .mo-es{font-size:13px;color:#8e8e8e;margin-top:8px;word-break:break-all}
  .mo-sv{position:relative;width:100%;max-width:470px;margin:0 auto;height:100%;display:flex;align-items:center;justify-content:center;color:#fff}
  .mo-sv .bars{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));left:8px;right:8px;display:flex;gap:3px;z-index:2}
  .mo-sv .bars i{flex:1;height:2.5px;background:rgba(255,255,255,.4);border-radius:2px}.mo-sv .bars i.on,.mo-sv .bars i.va{background:#fff}
  .mo-sv .sh{position:absolute;top:calc(22px + env(safe-area-inset-top,0px));left:10px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;z-index:2}
  .mo-sv .x{position:absolute;top:calc(20px + env(safe-area-inset-top,0px));right:14px;font-size:22px;z-index:3;cursor:pointer}
  .mo-sv .med{width:100%;height:100%;display:flex;align-items:center}.mo-sv .med img,.mo-sv .med video{width:100%;max-height:100%;object-fit:contain}
  .mo-sv .tx{position:absolute;bottom:calc(40px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);background:#fff;color:#111;font-weight:700;padding:8px 14px;border-radius:10px;max-width:80%;text-align:center}
  .mo-sv .tx:empty{display:none}
  .mo-mrow{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--b)}
  .mo-mrow .th{width:52px;height:52px;border-radius:6px;background:#ddd center/cover;flex:none}
  .mo-mrow .tx{flex:1;font-size:13px;min-width:0}.mo-mrow .tx span{color:var(--m);display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pill{font-size:12px;font-weight:700;border-radius:999px;padding:6px 10px;border:0;cursor:pointer}.pill.ok{background:#e6f4ea;color:#137333}.pill.no{background:#fde8e8;color:#b91c1c}
  .mo-sw{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--b);font-size:14px}
  .mo-sw i{width:42px;height:24px;border-radius:99px;background:#c7c7cc;position:relative;cursor:pointer;flex:none}
  .mo-sw i:after{content:"";position:absolute;left:2px;top:2px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s}
  .mo-sw i.on{background:#34c759}.mo-sw i.on:after{left:20px}
  .mo-btnrow{display:flex;gap:6px;margin-top:14px}.mo-b2{flex:1;border:0;background:var(--b);color:var(--t);border-radius:8px;padding:10px;font-weight:600;font-size:13px;cursor:pointer}
  </style><div class="mo">${dentro}</div>`;
}
