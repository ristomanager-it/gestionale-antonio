// js/views/spazio-sposi.js
// Rotta PUBBLICA #/spazio?t=TOKEN — lo spazio di chi si sposa o festeggia.
// Sei sezioni: Invitati, Da fare, Fornitori, Ricevimento, Idee, La pagina.
// Il token degli sposi è diverso da quello degli invitati: da qui si vede tutto
// del proprio evento, da lì nessun prezzo.

let D = null, sez = "invitati", token = "";

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  token = (new URLSearchParams((location.hash.split("?")[1] || ""))).get("t") || "";
  if (!token) { container.innerHTML = guscio(`<div class="sp-err">Collegamento incompleto.</div>`); return; }

  container.innerHTML = guscio(`<div class="sp-caric">Un attimo…</div>`);
  try { const { data } = await supabase.rpc("spazio_sposi", { p_token: token }); D = data; }
  catch (e) { console.error(e); }

  if (!D?.ok) { container.innerHTML = guscio(`<div class="sp-err">${esc(D?.errore || "Non riesco a caricare lo spazio.")}</div>`); return; }
  disegna(container, supabase);
}

function disegna(container, supabase) {
  const t = D.tema || {};
  const c = D.conteggi || {};
  const linguette = [["invitati","Invitati"],["dafare","Da fare"],["fornitori","Fornitori"],
                     ["ricevimento","Ricevimento"],["idee","Idee"],["pagina","La pagina"]];

  container.innerHTML = guscio(`
    <div class="sp-foglio">
      <div class="sp-testa">
        <div class="sp-oc">${esc(t.occhiello || "Il vostro evento")}</div>
        <h1>${esc(D.titolo || "")}</h1>
        <div class="sp-q">${esc(dataLunga(D.data))}</div>
        ${D.data ? `<div class="sp-conto">${mancano(D.data)}</div>` : ""}
      </div>

      <div class="sp-nav">
        ${linguette.map(([k, l]) => `<button data-sez="${k}" class="${sez === k ? "on" : ""}">${l}</button>`).join("")}
      </div>

      <div class="sp-corpo">${pagina()}</div>

      <div class="sp-pie">Compreso nel vostro ricevimento</div>
    </div>`, t);

  container.querySelectorAll("[data-sez]").forEach(b =>
    b.addEventListener("click", () => { sez = b.dataset.sez; disegna(container, supabase); window.scrollTo(0, 0); }));

  aggancia(container, supabase);

  function pagina() {
    if (sez === "invitati") return `
      <div class="sp-k3">
        <div><b>${c.confermati || 0}</b><span>confermati</span></div>
        <div><b>${c.attesa || 0}</b><span>in attesa</span></div>
        <div><b>${c.allergie || 0}</b><span>allergie</span></div>
      </div>
      <div class="sp-card">
        ${(D.invitati || []).length ? D.invitati.map(i => `
          <div class="r">
            <div class="t"><b>${esc(i.nome)}</b>
              <span>${i.quanti} ${i.quanti === 1 ? "persona" : "persone"}${i.gruppo ? " · " + esc(i.gruppo) : ""}${
                (i.allergie || []).length ? " · " + i.allergie.map(esc).join(", ") : ""}</span></div>
            <span class="pill ${i.stato === "confermato" ? "si" : i.stato === "assente" ? "no" : "forse"}">${
              i.stato === "confermato" ? "c'è" : i.stato === "assente" ? "non può" : i.stato === "forse" ? "in forse" : "in attesa"}</span>
          </div>`).join("") : `<div class="vuoto">Nessun invitato ancora. Aggiungeteli qui sotto.</div>`}
      </div>
      <div class="sp-mod">
        <div class="tit">Aggiungi un invitato</div>
        <div class="g">
          <input id="in-nome" placeholder="Nome e cognome">
          <input id="in-quanti" type="number" min="1" value="1" placeholder="quanti">
          <input id="in-tel" placeholder="Telefono">
          <input id="in-gruppo" placeholder="Gruppo (famiglia, amici…)">
        </div>
        <button class="sp-btn" id="in-add">Aggiungi</button>
      </div>
      <button class="sp-btn ch" id="sp-link-invito">🔗 Copia il link dell'invito</button>`;

    if (sez === "dafare") {
      const fatte = (D.checklist || []).filter(x => x.fatta).length;
      const fasi = [...new Set((D.checklist || []).map(x => x.fase))];
      return `
      <div class="sp-avanz">
        <div class="n"><b>${fatte} su ${(D.checklist || []).length}</b><span>cose fatte</span></div>
        <div class="barra"><i style="width:${(D.checklist || []).length ? Math.round(fatte / D.checklist.length * 100) : 0}%"></i></div>
      </div>
      ${fasi.map(f => `
        <h2>${esc(f)}</h2>
        <div class="sp-card">
          ${D.checklist.filter(x => x.fase === f).map(x => `
            <div class="r ${x.fatta ? "fatto" : ""}">
              <i class="box" data-voce="${esc(x.id)}" data-fatta="${x.fatta}"></i>
              <div class="t"><b>${esc(x.voce)}</b>${x.scadenza ? `<span>entro il ${data(x.scadenza)}</span>` : ""}</div>
              <span class="tag ${x.di_chi === "noi" ? "noi" : "voi"}">${x.di_chi === "noi" ? "con noi" : "vostro"}</span>
            </div>`).join("")}
        </div>`).join("")}
      <div class="sp-mod">
        <div class="tit">Aggiungete una cosa da fare</div>
        <div class="g"><input id="ck-voce" placeholder="Cosa c'è da fare"><input id="ck-quando" type="date"></div>
        <button class="sp-btn" id="ck-add">Aggiungi</button>
      </div>`;
    }

    if (sez === "fornitori") return `
      <div class="sott">Chi lavora al vostro evento, con l'ora in cui arriva.</div>
      <div class="sp-card">
        ${(D.fornitori || []).length ? D.fornitori.map(f => `
          <div class="r">
            <div class="t"><b>${esc(f.nome)}</b><span>${esc(f.categoria)}${f.referente ? " · " + esc(f.referente) : ""}${
              f.telefono ? " · " + esc(f.telefono) : ""}</span></div>
            <em>${f.ora_arrivo ? String(f.ora_arrivo).slice(0, 5) : "—"}</em>
          </div>`).join("") : `<div class="vuoto">Nessun fornitore ancora.</div>`}
      </div>
      <div class="sp-mod">
        <div class="tit">Aggiungi un fornitore</div>
        <div class="g">
          <select id="fo-cat">
            <option>Fotografo</option><option>Video</option><option>Fiorista</option><option>Musica</option>
            <option>Parrucchiere</option><option>Trucco</option><option>Auto</option><option>Abito</option>
            <option>Bomboniere</option><option>Altro</option>
          </select>
          <input id="fo-nome" placeholder="Nome dell'azienda">
          <input id="fo-ref" placeholder="Referente">
          <input id="fo-tel" placeholder="Telefono">
          <input id="fo-ora" type="time">
          <select id="fo-dove">
            <option>in location</option><option>a casa</option><option>in chiesa</option>
          </select>
        </div>
        <button class="sp-btn" id="fo-add">Aggiungi</button>
      </div>
      ${(D.strutture || []).length ? `
        <h2>Dove far dormire chi viene da fuori</h2>
        <div class="sp-card">
          ${D.strutture.map(s => `<div class="r"><div class="t"><b>${esc(s.nome)}</b>
            <span>${esc(s.distanza || "")}</span></div><em>${s.prezzo ? euro(s.prezzo) : ""}</em></div>`).join("")}
        </div>` : ""}`;

    if (sez === "ricevimento") {
      const r = D.ricevimento;
      return `
      <div class="sott">Quello che avete preso con noi.</div>
      ${r ? `<div class="sp-card">
        <div class="r"><div class="t"><b>Invitati previsti</b></div><em>${r.invitati || "—"}</em></div>
        <div class="r"><div class="t"><b>Totale</b></div><em>${euro(r.totale)}</em></div>
        <div class="r"><div class="t"><b>Acconto versato</b></div><em>${euro(r.acconto)}</em></div>
        <div class="r"><div class="t"><b>Saldo il giorno dell'evento</b></div><em>${euro((r.totale || 0) - (r.acconto || 0))}</em></div>
      </div>` : `<div class="vuoto">Non c'è ancora un preventivo collegato.</div>`}
      <div class="sott" style="margin-top:16px;">Per aggiungere o cambiare qualcosa, scriveteci: vi rispondiamo con il prezzo aggiornato.</div>`;
    }

    if (sez === "idee") return `
      <h2>Le foto che vi piacciono</h2>
      <div class="sp-idee">
        ${(D.idee || []).map(i => `<div style="background-image:url('${esc(i.url)}')" title="${esc(i.nota || "")}"></div>`).join("")}
        <label class="piu"><input type="file" accept="image/*" id="id-file" style="display:none;">＋</label>
      </div>
      <h2>I vostri appunti</h2>
      ${(D.appunti || []).length ? `<div class="sp-note">
        ${D.appunti.map(a => `· ${esc(a.testo)}`).join("<br>")}</div>` : ""}
      <div class="sp-mod">
        <div class="tit">Scrivi un appunto</div>
        <textarea id="ap-testo" rows="3" placeholder="Quello che vi viene in mente…"></textarea>
        <button class="sp-btn" id="ap-add">Salva</button>
      </div>`;

    // LA PAGINA
    const S = D.sezioni || {};
    const voci = [["invito","💌","Invito e conferma","con le allergie"],
                  ["come_arrivare","📍","Come arrivare","cerimonia e ricevimento"],
                  ["dress_code","👗","Come vestirsi","i vostri colori"],
                  ["hotel","🛏️","Dove dormire","strutture convenzionate"],
                  ["passaggi","🚗","Passaggi in auto","si organizzano tra loro"],
                  ["auguri","📖","Libro degli auguri","i messaggi degli invitati"],
                  ["annunci","📣","Annunci","scrivete voi, leggono loro"],
                  ["regali","🎁","Dove farci un regalo","i vostri link"]];
    return `
      <div class="sott">Questa è la pagina che vedono gli invitati. Accendete solo quello che volete.</div>
      <div class="sp-card">
        ${voci.map(([k, ic, tit, sub]) => `
          <div class="sw"><div class="ic">${ic}</div>
            <div class="t">${tit}<span>${sub}</span></div>
            <div class="tg ${String(S[k]) === "true" || S[k] === true ? "on" : ""}" data-sez-toggle="${k}"></div></div>`).join("")}
      </div>
      <button class="sp-btn" id="sp-apri-invito">Guarda com'è venuta</button>
      <button class="sp-btn ch" id="sp-link-invito2">🔗 Copia il link per gli invitati</button>

      <h2>Annunci</h2>
      <div class="sp-card">
        ${(D.annunci || []).length ? D.annunci.map(a => `
          <div class="r"><div class="t"><b>${esc(a.testo)}</b><span>${quando(a.quando)}</span></div></div>`).join("")
          : `<div class="vuoto">Nessun annuncio.</div>`}
      </div>
      <div class="sp-mod">
        <div class="tit">Scrivi un annuncio</div>
        <textarea id="an-testo" rows="2" placeholder="Es. chi vuole il pullman ce lo dica entro venerdì"></textarea>
        <button class="sp-btn" id="an-add">Pubblica</button>
      </div>

      <h2>I link per i regali</h2>
      <div class="sp-card">
        ${(D.regali || []).length ? D.regali.map(r => `
          <div class="r"><div class="t"><b>${esc(r.etichetta)}</b><span>${esc(r.dettaglio || "")}</span></div></div>`).join("")
          : `<div class="vuoto">Nessun link.</div>`}
      </div>
      <div class="sp-mod">
        <div class="tit">Aggiungi un link</div>
        <div class="g"><input id="rg-et" placeholder="Es. Lista in negozio"><input id="rg-url" placeholder="https://…"></div>
        <button class="sp-btn" id="rg-add">Aggiungi</button>
      </div>`;
  }
}

/* ── scritture ───────────────────────────────────────────────── */
function aggancia(container, supabase) {
  const ricarica = () => render(container);
  const v = (id) => (document.getElementById(id)?.value || "").trim();

  container.querySelector("#in-add")?.addEventListener("click", async () => {
    if (!v("in-nome")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "invitato", p_dati: {
      nome: v("in-nome"), quanti: Number(v("in-quanti")) || 1,
      telefono: v("in-tel"), gruppo: v("in-gruppo") } });
    ricarica();
  });

  container.querySelector("#ck-add")?.addEventListener("click", async () => {
    if (!v("ck-voce")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "checklist", p_dati: {
      voce: v("ck-voce"), scadenza: v("ck-quando") || null } });
    ricarica();
  });

  container.querySelectorAll("[data-voce]").forEach(b =>
    b.addEventListener("click", async () => {
      await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "checklist_spunta", p_dati: {
        id: b.dataset.voce, fatta: b.dataset.fatta !== "true" } });
      ricarica();
    }));

  container.querySelector("#fo-add")?.addEventListener("click", async () => {
    if (!v("fo-nome")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "fornitore", p_dati: {
      categoria: v("fo-cat"), nome: v("fo-nome"), referente: v("fo-ref"),
      telefono: v("fo-tel"), ora_arrivo: v("fo-ora") || null, dove: v("fo-dove") } });
    ricarica();
  });

  container.querySelector("#ap-add")?.addEventListener("click", async () => {
    if (!v("ap-testo")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "appunto", p_dati: { testo: v("ap-testo") } });
    ricarica();
  });

  container.querySelector("#an-add")?.addEventListener("click", async () => {
    if (!v("an-testo")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "annuncio", p_dati: { testo: v("an-testo") } });
    ricarica();
  });

  container.querySelector("#rg-add")?.addEventListener("click", async () => {
    if (!v("rg-et")) return;
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "regalo", p_dati: {
      etichetta: v("rg-et"), url: v("rg-url") } });
    ricarica();
  });

  container.querySelectorAll("[data-sez-toggle]").forEach(b =>
    b.addEventListener("click", async () => {
      await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "sezione", p_dati: {
        chiave: b.dataset.sezToggle, attiva: !b.classList.contains("on") } });
      ricarica();
    }));

  const linkInvito = () => (location.origin + location.pathname).replace(/index\.html$/, "")
    + "#/invito?t=" + D.token_invitati;

  ["#sp-link-invito", "#sp-link-invito2"].forEach(s =>
    container.querySelector(s)?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(linkInvito()); alert("Link copiato:\n" + linkInvito()); }
      catch { prompt("Link per gli invitati:", linkInvito()); }
    }));

  container.querySelector("#sp-apri-invito")?.addEventListener("click", () => window.open(linkInvito(), "_blank"));

  document.getElementById("id-file")?.addEventListener("change", async (e) => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    const path = `spazi/${token}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
    const up = await supabase.storage.from("media-aziende").upload(path, f, { contentType: f.type });
    if (up.error) return alert("Non è andata: " + up.error.message);
    const { data: pub } = supabase.storage.from("media-aziende").getPublicUrl(path);
    await supabase.rpc("spazio_scrivi", { p_token: token, p_cosa: "idea", p_dati: { url: pub.publicUrl } });
    render(container);
  });
}

/* ── utilità ─────────────────────────────────────────────────── */
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
function dataLunga(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  const g = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric" });
  return g.charAt(0).toUpperCase() + g.slice(1) + " " + MESI[d.getMonth()] + " " + d.getFullYear();
}
function data(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  return d.getDate() + " " + MESI[d.getMonth()].slice(0, 3);
}
function mancano(iso) {
  const g = Math.ceil((new Date(String(iso) + "T12:00:00") - Date.now()) / 86400000);
  if (g < 0) return "";
  if (g === 0) return "È oggi!";
  return g === 1 ? "manca un giorno" : "mancano " + g + " giorni";
}
function quando(iso) {
  if (!iso) return "";
  const g = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return g <= 0 ? "oggi" : g === 1 ? "ieri" : g + " giorni fa";
}
function euro(n) { return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function guscio(dentro, tema) {
  const c1 = tema?.colore || "#7C2D4A", c2 = tema?.colore2 || "#C08497";
  return `<style>
  .sp{--vino:${c1};--rosa:${c2};--verde:#348127;--carta:#FBFAF7;--riga:#E4E0D8;--muto:#6B7A83;
      background:#DFE3E7;min-height:100vh;padding:16px 10px 50px;color:#12232E;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
  .sp-foglio{max-width:460px;margin:0 auto;background:var(--carta);border-radius:20px;overflow:hidden;
    box-shadow:0 14px 44px rgba(0,0,0,.16);}
  .sp-testa{padding:24px 22px 20px;text-align:center;color:#fff;
    background:${tema?.immagine ? `linear-gradient(180deg,rgba(0,0,0,.4),rgba(0,0,0,.64)), url('${tema.immagine}') center/cover`
                                : `linear-gradient(160deg,${c1},${c2})`};}
  .sp-oc{font-size:10px;letter-spacing:.2em;text-transform:uppercase;opacity:.85;font-weight:700;}
  .sp-testa h1{font-family:Georgia,serif;font-size:25px;margin:6px 0 3px;font-weight:normal;}
  .sp-q{font-size:13.5px;opacity:.92;}
  .sp-conto{display:inline-block;margin-top:10px;background:rgba(255,255,255,.18);
    border:1px solid rgba(255,255,255,.3);border-radius:100px;padding:5px 12px;font-size:12px;font-weight:700;}
  .sp-nav{display:flex;background:#fff;border-bottom:1px solid var(--riga);overflow-x:auto;}
  .sp-nav button{flex:0 0 auto;background:none;border:none;padding:13px 14px;font-size:13.5px;
    font-family:inherit;color:var(--muto);cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;}
  .sp-nav button.on{color:var(--vino);font-weight:800;border-bottom-color:var(--vino);}
  .sp-corpo{padding:18px 20px 26px;}
  .sott{font-size:13px;color:var(--muto);margin-bottom:12px;line-height:1.5;}
  .sp h2{font-family:Georgia,serif;font-size:17px;color:var(--vino);margin:20px 0 9px;font-weight:normal;}
  .sp-k3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
  .sp-k3 div{background:#fff;border:1px solid var(--riga);border-radius:12px;padding:11px;text-align:center;}
  .sp-k3 b{display:block;font-family:Georgia,serif;font-size:22px;color:var(--vino);line-height:1;}
  .sp-k3 span{display:block;font-size:11px;color:var(--muto);margin-top:4px;}
  .sp-card{background:#fff;border:1px solid var(--riga);border-radius:13px;overflow:hidden;}
  .sp-card .r{display:flex;gap:10px;align-items:center;padding:11px 14px;border-top:1px solid #F1EEE8;font-size:14px;}
  .sp-card .r:first-child{border-top:none;}
  .sp-card .r .t{flex:1;}
  .sp-card .r .t b{display:block;font-size:14px;font-weight:600;}
  .sp-card .r .t span{display:block;font-size:12px;color:var(--muto);margin-top:1px;}
  .sp-card .r em{font-style:normal;font-size:13px;color:var(--vino);font-weight:700;white-space:nowrap;}
  .sp-card .vuoto{padding:16px;color:var(--muto);font-size:13.5px;text-align:center;}
  .pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:100px;white-space:nowrap;}
  .pill.si{background:#F1F8ED;color:var(--verde);} .pill.no{background:#FEF2F2;color:#B91C1C;}
  .pill.forse{background:#FFFCF3;color:#9A6A00;}
  .tag{font-size:10px;font-weight:800;text-transform:uppercase;padding:3px 7px;border-radius:100px;}
  .tag.noi{background:#FBF3F6;color:var(--vino);} .tag.voi{background:#F1F4F6;color:var(--muto);}
  .box{width:19px;height:19px;border-radius:5px;border:2px solid #CFC7C1;flex-shrink:0;position:relative;cursor:pointer;}
  .fatto .box{background:var(--verde);border-color:var(--verde);}
  .fatto .box:after{content:"✓";position:absolute;inset:0;color:#fff;font-size:12px;display:flex;
    align-items:center;justify-content:center;font-weight:700;}
  .fatto .t b{color:var(--muto);text-decoration:line-through;}
  .sp-avanz{background:#fff;border:1px solid var(--riga);border-radius:13px;padding:14px;margin-bottom:6px;}
  .sp-avanz .n{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px;}
  .sp-avanz .n b{font-family:Georgia,serif;font-size:22px;color:var(--vino);}
  .sp-avanz .n span{font-size:12.5px;color:var(--muto);}
  .barra{height:8px;background:#EDE7E2;border-radius:100px;overflow:hidden;}
  .barra i{display:block;height:100%;background:linear-gradient(90deg,${c1},${c2});}
  .sp-mod{background:#fff;border:1.5px solid var(--rosa);border-radius:13px;padding:14px;margin-top:11px;}
  .sp-mod .tit{font-size:12px;font-weight:800;color:var(--vino);text-transform:uppercase;
    letter-spacing:.08em;margin-bottom:10px;}
  .sp-mod .g{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .sp input,.sp select,.sp textarea{width:100%;padding:10px;border:1.5px solid var(--riga);border-radius:9px;
    font-size:14.5px;font-family:inherit;background:#fff;}
  .sp-btn{width:100%;background:var(--vino);color:#fff;border:none;border-radius:11px;padding:13px;
    font-size:15px;font-weight:700;font-family:inherit;margin-top:10px;cursor:pointer;}
  .sp-btn.ch{background:#fff;border:1.5px solid var(--riga);color:var(--vino);}
  .sw{display:flex;align-items:center;gap:11px;padding:12px 14px;border-top:1px solid #F1EEE8;}
  .sw:first-child{border-top:none;}
  .sw .ic{font-size:18px;width:24px;text-align:center;}
  .sw .t{flex:1;font-size:14px;}
  .sw .t span{display:block;font-size:11.5px;color:var(--muto);}
  .tg{width:42px;height:25px;border-radius:100px;background:#D7D2CC;position:relative;flex-shrink:0;cursor:pointer;}
  .tg.on{background:var(--verde);}
  .tg:after{content:"";position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;background:#fff;}
  .tg.on:after{left:20px;}
  .sp-idee{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
  .sp-idee div{aspect-ratio:1;border-radius:9px;background-size:cover;background-position:center;
    background-color:#EDE2E6;border:1px solid var(--riga);}
  .sp-idee .piu{aspect-ratio:1;border:1.5px dashed #CBD5DB;border-radius:9px;display:flex;
    align-items:center;justify-content:center;color:var(--muto);font-size:20px;cursor:pointer;}
  .sp-note{background:#FFFDF5;border:1px solid #F0E3C0;border-radius:11px;padding:13px;
    font-size:13.5px;line-height:1.7;color:#5A4A2A;}
  .sp-pie{background:#fff;border-top:1px solid var(--riga);padding:14px;text-align:center;
    font-size:11px;color:var(--muto);}
  .sp-caric,.sp-err{max-width:440px;margin:60px auto;background:#fff;border-radius:14px;padding:24px;
    text-align:center;font-size:15.5px;color:#3D4C55;}
  </style><div class="sp">${dentro}</div>`;
}
