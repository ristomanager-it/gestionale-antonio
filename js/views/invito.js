// js/views/invito.js
// Rotta PUBBLICA #/invito?t=TOKEN — quello che apre l'invitato.
// Nessun prezzo passa da qui: la funzione che serve i dati non li restituisce.

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const token = (new URLSearchParams((location.hash.split("?")[1] || ""))).get("t") || "";

  if (!token) { container.innerHTML = guscio(`<div class="iv-err">Questo collegamento non è completo.</div>`); return; }

  container.innerHTML = guscio(`<div class="iv-caric">Un attimo…</div>`);

  let d = null;
  try { const { data } = await supabase.rpc("spazio_invito", { p_token: token }); d = data; }
  catch (e) { console.error(e); }

  if (!d?.ok) {
    container.innerHTML = guscio(`<div class="iv-err">${esc(d?.errore || "Non riesco a caricare l'invito.")}</div>`);
    return;
  }

  const t = d.tema || {};
  const S = d.sezioni || {};
  const attiva = (k) => String(S[k]) === "true" || S[k] === true;

  container.innerHTML = guscio(`
    <div class="iv-foglio">
      <div class="iv-testa">
        <div class="iv-oc">${esc(t.occhiello || "Siete invitati")}</div>
        <h1>${esc(d.titolo || "")}</h1>
        <div class="iv-q">${esc(dataLunga(d.data))}</div>
        ${d.data ? `<div class="iv-conto">${mancano(d.data)}</div>` : ""}
      </div>

      <div class="iv-corpo">
        ${d.testo_invito ? `<p class="iv-intro">${esc(d.testo_invito)}</p>` : ""}

        ${attiva("come_arrivare") ? `
          <h2>Come sarà la giornata</h2>
          <div class="iv-card">
            ${d.cerimonia ? tappa(d.cerimonia.ora, "La cerimonia", d.cerimonia.luogo, d.cerimonia.indirizzo) : ""}
            ${tappa(d.ricevimento?.ora, "Il ricevimento", d.ricevimento?.luogo, d.ricevimento?.indirizzo)}
          </div>` : ""}

        ${attiva("invito") ? `
          <h2>Ci sei?</h2>
          <div class="iv-card">
            <div class="iv-scelte">
              <button class="iv-sc" data-stato="confermato">Ci sarò</button>
              <button class="iv-sc" data-stato="forse">In forse</button>
              <button class="iv-sc" data-stato="assente">Non posso</button>
            </div>
            <div class="iv-campo"><label>Come ti chiami</label><input id="iv-nome" placeholder="Nome e cognome"></div>
            <div class="iv-campo"><label>Quanti siete</label><input id="iv-quanti" type="number" min="1" value="1"></div>
            <div class="iv-campo"><label>Il tuo numero</label><input id="iv-tel" placeholder="+39 …"></div>

            ${(d.domande || []).length ? `<div class="iv-dom">
              ${d.domande.map(q => `
                <div class="iv-d" data-domanda="${esc(q.id)}" data-tipo="${esc(q.tipo)}">
                  <div class="q">${esc(q.testo)}</div>
                  ${q.tipo === "si_no" ? `
                    <div class="iv-sino">
                      <button data-val="si">Sì</button><button data-val="no">No</button>
                    </div>` :
                    q.tipo === "numero" ? `<input type="number" min="0" value="0" data-val>` :
                    `<input type="text" data-val placeholder="Scrivi qui">`}
                </div>`).join("")}
            </div>` : ""}

            ${attiva("allergie") ? `
              <div class="iv-all">
                <label>Allergie o intolleranze</label>
                <div class="iv-chips">
                  ${["Nessuna","Glutine","Lattosio","Crostacei","Frutta secca","Uova","Vegetariano","Vegano"]
                    .map(a => `<button class="iv-chip" data-all="${a}">${a}</button>`).join("")}
                </div>
                <textarea id="iv-note" rows="2" placeholder="Altro da dirci — es. mia figlia è celiaca, ha 6 anni"></textarea>
              </div>` : ""}

            <button class="iv-btn" id="iv-invia">Mandaci la risposta</button>
            <div id="iv-esito" class="iv-esito"></div>
          </div>` : ""}

        ${attiva("annunci") && (d.annunci || []).length ? `
          <h2>Vi diciamo</h2>
          ${d.annunci.map(a => `
            <div class="iv-ann"><p>${esc(a.testo)}</p><div class="w">${quando(a.quando)}</div></div>`).join("")}` : ""}

        ${d.dress_code ? `
          <h2>Come vestirsi</h2>
          <div class="iv-card">
            ${Array.isArray(d.dress_code.colori) && d.dress_code.colori.length ? `
              <div class="iv-colori">${d.dress_code.colori.map(c => `<i style="background:${esc(c)}"></i>`).join("")}</div>` : ""}
            <div class="iv-testo">${esc(d.dress_code.testo || "")}</div>
          </div>` : ""}

        ${d.piano_pioggia ? `
          <h2>Se piove</h2>
          <div class="iv-pioggia">${esc(d.piano_pioggia)}</div>` : ""}

        ${(d.strutture || []).length ? `
          <h2>Dove dormire</h2>
          <div class="iv-card">
            ${d.strutture.map(s => `
              <div class="iv-h">
                <div class="t"><b>${esc(s.nome)}</b><span>${esc(s.distanza || "")}</span>
                  ${s.convenzione ? `<span class="iv-conv">${esc(s.convenzione)}</span>` : ""}</div>
                ${s.prezzo ? `<div class="pz">${euro(s.prezzo)}<small>a notte</small></div>` : ""}
              </div>`).join("")}
          </div>` : ""}

        ${d.passaggi ? `
          <h2>Passaggi in auto</h2>
          <div class="iv-card">
            ${(d.passaggi || []).map(p => `
              <div class="iv-p">
                <i>${p.tipo === "offro" ? "🚗" : "🙋"}</i>
                <div class="t"><b>${esc(p.nome)} ${p.tipo === "offro" ? "offre un passaggio" : "cerca un passaggio"}</b>
                  <span>${esc(p.da_dove || "")}${p.posti ? " · " + p.posti + " posti" : ""}</span></div>
                ${p.telefono ? `<a href="tel:${esc(p.telefono)}">Scrivi ›</a>` : ""}
              </div>`).join("")}
            <button class="iv-btn chiaro" id="iv-passaggio">Offro un passaggio / Ne cerco uno</button>
          </div>` : ""}

        ${attiva("auguri") ? `
          <h2>Un pensiero</h2>
          <div class="iv-card">
            <textarea id="iv-augurio" rows="3" placeholder="Scrivi qualcosa…"></textarea>
            <button class="iv-btn chiaro" id="iv-manda-augurio">Lascia il tuo messaggio</button>
            <div id="iv-esito-augurio" class="iv-esito"></div>
          </div>` : ""}

        ${(d.regali || []).length ? `
          <h2>Un regalo</h2>
          <div class="iv-card">
            ${d.regali.map(r => `
              <div class="iv-h"><div class="t"><b>${esc(r.etichetta)}</b><span>${esc(r.dettaglio || "")}</span></div>
                ${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">Apri ›</a>` : ""}</div>`).join("")}
          </div>` : ""}
      </div>

      <div class="iv-pie">
        ${d.logo ? `<img src="${esc(d.logo)}" alt="">` : ""}
        Il ricevimento è curato da <b>${esc(d.locale || "")}</b>
      </div>
    </div>`, t);

  aggancia();

  /* ── interazione ─────────────────────────────────────────── */
  function aggancia() {
    let stato = null, allergie = [];

    container.querySelectorAll("[data-stato]").forEach(b =>
      b.addEventListener("click", () => {
        stato = b.dataset.stato;
        container.querySelectorAll("[data-stato]").forEach(x => x.classList.toggle("on", x === b));
      }));

    container.querySelectorAll("[data-all]").forEach(b =>
      b.addEventListener("click", () => {
        const a = b.dataset.all;
        if (a === "Nessuna") {
          allergie = [];
          container.querySelectorAll("[data-all]").forEach(x => x.classList.remove("on"));
          b.classList.add("on");
          return;
        }
        container.querySelector('[data-all="Nessuna"]')?.classList.remove("on");
        b.classList.toggle("on");
        allergie = [...container.querySelectorAll("[data-all].on")]
          .map(x => x.dataset.all).filter(x => x !== "Nessuna");
      }));

    container.querySelectorAll(".iv-sino button").forEach(b =>
      b.addEventListener("click", () => {
        b.parentElement.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
      }));

    container.querySelector("#iv-invia")?.addEventListener("click", async (ev) => {
      const b = ev.currentTarget;
      const nome = (document.getElementById("iv-nome")?.value || "").trim();
      const esito = document.getElementById("iv-esito");
      if (!stato) return mostra(esito, "Dicci prima se ci sei.", true);
      if (!nome) return mostra(esito, "Scrivi come ti chiami.", true);

      const risposte = {};
      container.querySelectorAll("[data-domanda]").forEach(el => {
        const id = el.dataset.domanda;
        if (el.dataset.tipo === "si_no") {
          const on = el.querySelector(".iv-sino button.on");
          if (on) risposte[id] = on.dataset.val === "si";
        } else {
          const v = el.querySelector("[data-val]")?.value;
          if (v) risposte[id] = v;
        }
      });

      b.disabled = true; b.textContent = "Un attimo…";
      const { data, error } = await supabase.rpc("spazio_conferma", {
        p_token: token, p_nome: nome, p_stato: stato,
        p_quanti: Number(document.getElementById("iv-quanti")?.value) || 1,
        p_telefono: document.getElementById("iv-tel")?.value || null,
        p_email: null,
        p_allergie: allergie.length ? allergie : null,
        p_note: document.getElementById("iv-note")?.value || null,
        p_risposte: risposte,
      });
      b.disabled = false; b.textContent = "Mandaci la risposta";

      if (error || !data?.ok) return mostra(esito, error?.message || data?.errore || "Non è andata.", true);
      mostra(esito, stato === "assente"
        ? "Grazie di averci avvisati, ci dispiace."
        : stato === "forse" ? "Grazie! Facci sapere appena puoi." : "Perfetto, ci vediamo lì!");
    });

    container.querySelector("#iv-manda-augurio")?.addEventListener("click", async (ev) => {
      const testo = (document.getElementById("iv-augurio")?.value || "").trim();
      const esito = document.getElementById("iv-esito-augurio");
      if (!testo) return mostra(esito, "Scrivi qualcosa prima.", true);
      const nome = (document.getElementById("iv-nome")?.value || "").trim();
      const { data } = await supabase.rpc("spazio_lascia_augurio", {
        p_token: token, p_da: nome || null, p_messaggio: testo,
      });
      if (data?.ok) { document.getElementById("iv-augurio").value = ""; mostra(esito, "Grazie, glielo faremo leggere."); }
      else mostra(esito, "Non è andata, riprova.", true);
    });

    container.querySelector("#iv-passaggio")?.addEventListener("click", async () => {
      const tipo = confirm("OK = offro un passaggio · Annulla = ne cerco uno") ? "offro" : "cerco";
      const nome = prompt("Come ti chiami?");
      if (!nome) return;
      const daDove = prompt("Da dove parti?") || "";
      const tel = prompt("Il tuo numero, per farsi trovare:") || "";
      const posti = tipo === "offro" ? Number(prompt("Quanti posti liberi?") || 0) : null;
      const { data } = await supabase.rpc("spazio_passaggio", {
        p_token: token, p_tipo: tipo, p_nome: nome, p_telefono: tel,
        p_da_dove: daDove, p_posti: posti, p_nota: null,
      });
      if (data?.ok) render(container); else alert("Non è andata, riprova.");
    });
  }
}

/* ── pezzi ───────────────────────────────────────────────────── */
function tappa(ora, titolo, luogo, indirizzo) {
  if (!luogo && !ora) return "";
  const q = luogo || indirizzo || "";
  return `<div class="iv-tappa">
    <div class="o">${ora ? String(ora).slice(0, 5) : ""}</div>
    <div class="t"><b>${esc(titolo)}</b><span>${esc(luogo || "")}${indirizzo ? "<br>" + esc(indirizzo) : ""}</span>
      ${q ? `<a href="https://maps.google.com/?q=${encodeURIComponent(q + " " + (indirizzo || ""))}"
        target="_blank" rel="noopener">Apri la mappa ›</a>` : ""}</div>
  </div>`;
}
function mostra(el, testo, ko) { if (el) { el.textContent = testo; el.className = "iv-esito " + (ko ? "ko" : "ok"); } }
function mancano(iso) {
  const g = Math.ceil((new Date(String(iso) + "T12:00:00") - Date.now()) / 86400000);
  if (g < 0) return "";
  if (g === 0) return "È oggi!";
  return g === 1 ? "Manca un giorno" : "Mancano " + g + " giorni";
}
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
function dataLunga(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  const g = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric" });
  return g.charAt(0).toUpperCase() + g.slice(1) + " " + MESI[d.getMonth()] + " " + d.getFullYear();
}
function quando(iso) {
  if (!iso) return "";
  const g = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return g <= 0 ? "oggi" : g === 1 ? "ieri" : g + " giorni fa";
}
function euro(n) { return (Number(n) || 0).toLocaleString("it-IT", { maximumFractionDigits: 0 }) + " €"; }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function guscio(dentro, tema) {
  const c1 = tema?.colore || "#7C2D4A", c2 = tema?.colore2 || "#C08497";
  return `<style>
  .iv{--vino:${c1};--rosa:${c2};--verde:#348127;--carta:#FBFAF7;--riga:#E4E0D8;--muto:#6B7A83;
      background:#DFE3E7;min-height:100vh;padding:18px 10px 50px;color:#12232E;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
  .iv-foglio{max-width:440px;margin:0 auto;background:var(--carta);border-radius:20px;overflow:hidden;
    box-shadow:0 14px 44px rgba(0,0,0,.16);}
  .iv-testa{padding:32px 24px 26px;text-align:center;color:#fff;
    background:${tema?.immagine
      ? `linear-gradient(180deg,rgba(0,0,0,.42),rgba(0,0,0,.66)), url('${tema.immagine}') center/cover`
      : `linear-gradient(160deg,${c1},${c2})`};}
  .iv-oc{font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;opacity:.9;font-weight:700;}
  .iv-testa h1{font-family:Georgia,serif;font-size:30px;margin:10px 0 6px;font-weight:normal;line-height:1.2;}
  .iv-q{font-size:15px;opacity:.95;}
  .iv-conto{display:inline-block;margin-top:12px;background:rgba(255,255,255,.18);
    border:1px solid rgba(255,255,255,.3);border-radius:100px;padding:6px 14px;font-size:12.5px;font-weight:700;}
  .iv-corpo{padding:22px 22px 28px;}
  .iv-intro{font-size:15.5px;line-height:1.65;color:#3D4C55;text-align:center;margin-bottom:20px;}
  .iv h2{font-family:Georgia,serif;font-size:18px;color:var(--vino);margin:24px 0 10px;font-weight:normal;}
  .iv-card{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:16px;}
  .iv-tappa{display:flex;gap:13px;padding:12px 0;border-top:1px solid #F1EEE8;}
  .iv-tappa:first-child{border-top:none;padding-top:0;}
  .iv-tappa .o{font-family:Georgia,serif;font-size:18px;color:var(--vino);min-width:48px;}
  .iv-tappa .t b{display:block;font-size:15px;}
  .iv-tappa .t span{display:block;font-size:13px;color:var(--muto);line-height:1.45;margin-top:2px;}
  .iv-tappa .t a{display:inline-block;margin-top:5px;color:var(--vino);font-size:13px;font-weight:700;text-decoration:none;}
  .iv-scelte{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;}
  .iv-sc{border:1.5px solid var(--riga);background:#fff;border-radius:11px;padding:13px 4px;
    font-size:13.5px;font-weight:700;color:var(--muto);font-family:inherit;cursor:pointer;}
  .iv-sc.on{border-color:var(--verde);background:#F1F8ED;color:var(--verde);}
  .iv-campo{margin-bottom:11px;}
  .iv-campo label,.iv-all label{display:block;font-size:12.5px;font-weight:700;color:var(--muto);margin-bottom:5px;}
  .iv input,.iv textarea{width:100%;padding:11px;border:1.5px solid var(--riga);border-radius:10px;
    font-size:15px;font-family:inherit;background:#fff;}
  .iv-dom{border-top:1px solid #F1EEE8;margin-top:6px;padding-top:6px;}
  .iv-d{padding:11px 0;border-top:1px solid #F1EEE8;}
  .iv-d:first-child{border-top:none;}
  .iv-d .q{font-size:14.5px;margin-bottom:8px;}
  .iv-sino{display:flex;gap:8px;}
  .iv-sino button{flex:1;border:1.5px solid var(--riga);background:#fff;border-radius:10px;padding:9px;
    font-size:13.5px;font-weight:700;color:var(--muto);font-family:inherit;cursor:pointer;}
  .iv-sino button.on{border-color:var(--vino);background:#FBF3F6;color:var(--vino);}
  .iv-all{border-top:1px solid #F1EEE8;margin-top:6px;padding-top:12px;}
  .iv-chips{margin-bottom:9px;}
  .iv-chip{border:1.5px solid var(--riga);background:#fff;border-radius:100px;padding:7px 13px;
    font-size:13px;margin:0 5px 6px 0;color:var(--muto);font-family:inherit;cursor:pointer;}
  .iv-chip.on{border-color:var(--vino);background:#FBF3F6;color:var(--vino);font-weight:700;}
  .iv-btn{width:100%;background:var(--vino);color:#fff;border:none;border-radius:12px;padding:15px;
    font-size:16px;font-weight:700;font-family:inherit;margin-top:10px;cursor:pointer;}
  .iv-btn.chiaro{background:#fff;border:1.5px solid var(--riga);color:var(--vino);}
  .iv-esito{font-size:13.5px;margin-top:9px;color:var(--verde);}
  .iv-esito.ko{color:#B91C1C;}
  .iv-ann{background:#FBF3F6;border:1px solid var(--rosa);border-radius:13px;padding:14px 15px;margin-bottom:9px;}
  .iv-ann p{font-size:14.5px;line-height:1.55;}
  .iv-ann .w{font-size:12px;color:var(--muto);margin-top:6px;}
  .iv-colori{display:flex;gap:9px;margin-bottom:10px;}
  .iv-colori i{width:32px;height:32px;border-radius:50%;box-shadow:0 0 0 1px var(--riga);}
  .iv-testo{font-size:14.5px;line-height:1.55;}
  .iv-pioggia{background:#F2F6F8;border:1px solid #CFE0E8;border-radius:12px;padding:13px 15px;
    font-size:14px;color:#2C4A5A;line-height:1.55;}
  .iv-h{display:flex;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #F1EEE8;}
  .iv-h:first-child{border-top:none;padding-top:0;}
  .iv-h .t{flex:1;}
  .iv-h .t b{display:block;font-size:14.5px;}
  .iv-h .t span{display:block;font-size:12.5px;color:var(--muto);}
  .iv-conv{display:inline-block;background:#F1F8ED;color:var(--verde);font-size:11px;font-weight:700;
    padding:3px 8px;border-radius:100px;margin-top:4px;}
  .iv-h .pz{font-weight:700;color:var(--vino);text-align:right;}
  .iv-h .pz small{display:block;font-weight:400;font-size:11px;color:var(--muto);}
  .iv-h a{color:var(--vino);font-weight:700;font-size:13px;text-decoration:none;}
  .iv-p{display:flex;gap:11px;align-items:center;padding:11px 0;border-top:1px solid #F1EEE8;}
  .iv-p:first-child{border-top:none;padding-top:0;}
  .iv-p i{font-style:normal;font-size:18px;}
  .iv-p .t{flex:1;}
  .iv-p .t b{display:block;font-size:14px;}
  .iv-p .t span{font-size:12.5px;color:var(--muto);}
  .iv-p a{color:var(--vino);font-weight:700;font-size:13px;text-decoration:none;}
  .iv-pie{background:#fff;border-top:1px solid var(--riga);padding:16px;text-align:center;
    font-size:11.5px;color:var(--muto);line-height:1.7;}
  .iv-pie img{height:24px;opacity:.75;display:block;margin:0 auto 7px;}
  .iv-caric,.iv-err{max-width:440px;margin:60px auto;background:#fff;border-radius:14px;padding:24px;
    text-align:center;font-size:15.5px;color:#3D4C55;}
  </style><div class="iv">${dentro}</div>`;
}
