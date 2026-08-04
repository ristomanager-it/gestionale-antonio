// js/views/preventivo-cliente.js
// Rotta PUBBLICA #/preventivo?t=TOKEN — nessun login.
// È il documento che riceve il cliente: piatti, servizi, totale, acconto.
// Nessun costo, nessun margine: la funzione che serve i dati non li restituisce
// proprio, quindi non possono uscire nemmeno per errore.

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;
  const qs = new URLSearchParams((window.location.hash || "").split("?")[1] || "");
  const token = (qs.get("t") || "").trim();

  const guscio = (dentro, tema) => `
    <style>
      .pv{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--carta:#FBFAF7;--riga:#E4E0D8;
          --testo:#12232E;--muto:#6B7A83;background:#DFE3E7;min-height:100vh;padding:20px 10px 60px;
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:var(--testo);}
      .pv-foglio{max-width:640px;margin:0 auto;background:var(--carta);border-radius:8px;
        box-shadow:0 12px 40px rgba(0,0,0,.14);overflow:hidden;}
      .pv-testa{text-align:center;padding:34px 30px 26px;position:relative;
        border-bottom:3px solid ${tema?.colore2 || "#F1B302"};
        background:${tema?.immagine ? `linear-gradient(180deg, rgba(0,0,0,.42), rgba(0,0,0,.62)), url('${tema.immagine}') center/cover` : `linear-gradient(160deg, ${tema?.colore || "#023C59"}, ${tema?.colore2 || "#7FA3B8"})`};
        color:#fff;}
      .pv-testa h1,.pv-quando{color:#fff !important;}
      .pv-oc{color:${tema?.immagine ? "#fff" : "rgba(255,255,255,.85)"} !important;}
      .pv-testa img{height:66px;margin-bottom:14px;}
      .pv-oc{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--arancio);font-weight:700;}
      .pv-testa h1{font-family:Georgia,serif;font-size:29px;margin:9px 0 5px;font-weight:normal;color:var(--navy);}
      .pv-quando{font-size:15.5px;color:#3D4C55;}
      .pv-corpo{padding:26px 30px 30px;}
      .pv-intro{font-size:15.5px;line-height:1.65;color:#3D4C55;margin-bottom:24px;}
      .pv-dati{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;background:#fff;border:1px solid var(--riga);
        border-radius:12px;padding:15px 17px;margin-bottom:24px;}
      .pv-dati span{display:block;font-size:11px;color:var(--muto);text-transform:uppercase;letter-spacing:.08em;}
      .pv-dati b{font-size:15px;}
      .pv h2{font-family:Georgia,serif;font-size:19px;color:var(--navy);margin:24px 0 11px;font-weight:normal;}
      .pv-blocco{background:#fff;border:1px solid var(--riga);border-radius:12px;overflow:hidden;}
      .pv-sez{padding:13px 17px;border-top:1px solid #F1EEE8;}
      .pv-sez:first-child{border-top:none;}
      .pv-tit{font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--arancio);font-weight:700;margin-bottom:7px;}
      .pv-p{font-size:15.5px;line-height:1.5;padding:3px 0;}
      .pv-r{display:flex;justify-content:space-between;padding:11px 17px;border-top:1px solid #F1EEE8;font-size:15px;}
      .pv-r:first-child{border-top:none;}
      .pv-conto{background:var(--navy);color:#fff;border-radius:14px;padding:19px 21px;margin-top:22px;}
      .pv-conto .r{display:flex;justify-content:space-between;padding:6px 0;font-size:15px;color:#CFE0E8;}
      .pv-conto .r b{color:#fff;}
      .pv-tot{border-top:1px solid rgba(255,255,255,.2);margin-top:7px;padding-top:13px;display:flex;justify-content:space-between;align-items:baseline;}
      .pv-tot span{font-size:15px;color:#CFE0E8;}
      .pv-tot b{font-family:Georgia,serif;font-size:29px;}
      .pv-pp{text-align:right;font-size:13px;color:#9FC0D2;margin-top:2px;}
      .pv-pag{background:#fff;border:1px solid var(--riga);border-radius:12px;padding:15px 17px;margin-top:13px;font-size:14.5px;}
      .pv-pag .r{display:flex;justify-content:space-between;padding:4px 0;}
      .pv-foto{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:9px;}
      .pv-foto img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;border:1px solid var(--riga);}
      .pv-carica{background:#fff;border:1.5px dashed #CBD5DB;border-radius:12px;padding:18px;text-align:center;margin-top:12px;}
      .pv-carica b{display:block;font-size:15px;margin-bottom:4px;}
      .pv-carica p{font-size:13.5px;color:var(--muto);line-height:1.5;margin-bottom:12px;}
      .pv-btn{background:var(--navy);color:#fff;border:none;border-radius:11px;padding:12px 20px;
        font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;}
      .pv-cta{text-align:center;margin-top:24px;}
      .pv-cta a{display:inline-block;background:var(--arancio);color:#fff;text-decoration:none;font-weight:700;
        font-size:16.5px;padding:15px 32px;border-radius:12px;}
      .pv-cta p{font-size:13px;color:var(--muto);margin-top:9px;}
      .pv-note{font-size:12.5px;color:var(--muto);line-height:1.6;margin-top:24px;padding-top:16px;border-top:1px solid var(--riga);}
      .pv-pie{background:#fff;border-top:1px solid var(--riga);padding:16px 30px;text-align:center;font-size:12px;color:var(--muto);line-height:1.7;}
      .pv-timer{margin-top:12px;display:inline-block;background:#FFF7ED;border:1px solid #FED7AA;color:#9A3412;
        font-size:13px;font-weight:700;padding:7px 14px;border-radius:100px;}
      .pv-timer.ok{background:#F1F8ED;border-color:#CFE4C2;color:#2F6B24;}
      .pv-stampa{display:block;margin:14px auto 0;background:#fff;border:1.5px solid var(--riga);color:var(--navy);
        border-radius:10px;padding:9px 16px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;}
      .pv-mod{background:#fff;border:1px solid var(--riga);border-radius:12px;padding:16px 18px;}
      .pv-mod .r{padding:12px 0;border-top:1px solid #F1EEE8;}
      .pv-mod .r:first-child{border-top:none;padding-top:0;}
      .pv-mod label{display:block;font-size:13px;font-weight:700;color:var(--navy);margin-bottom:6px;}
      .pv-mod small{display:block;font-size:12.5px;color:var(--muto);margin-top:6px;line-height:1.45;}
      .pv-mod .riga2{display:flex;gap:8px;}
      .pv-mod input,.pv-mod textarea{flex:1;width:100%;padding:10px;border:1.5px solid var(--riga);border-radius:10px;
        font-size:15px;font-family:inherit;background:#fff;}
      .pv-mod textarea{margin-bottom:8px;}
      .pv-btn.piccolo{padding:10px 15px;font-size:14px;white-space:nowrap;}
      .pv-serv{display:flex;align-items:center;gap:12px;padding:12px 17px;border-top:1px solid #F1EEE8;flex-wrap:wrap;}
      .pv-serv:first-child{border-top:none;}
      .pv-serv .t{flex:1;min-width:150px;}
      .pv-serv .t b{display:block;font-size:15px;}
      .pv-serv .t span{font-size:12.5px;color:var(--muto);}
      .pv-serv .pz{font-weight:700;color:var(--navy);}
      .pv-avviso{background:#F1F8ED;border:1px solid #CFE4C2;color:#2F6B24;border-radius:10px;
        padding:11px 13px;font-size:13.5px;margin-top:10px;line-height:1.5;}
      .pv-avviso.attesa{background:#FFF7ED;border-color:#FED7AA;color:#9A3412;}
      @media print{
        body{background:#fff;padding:0;}
        .pv-foglio{box-shadow:none;max-width:none;}
        .pv-mod,.pv-carica,.pv-cta,.pv-stampa,.pv-timer{display:none !important;}
        .pv h2{page-break-after:avoid;}
      }
      .pv-iban{background:#fff;border:1px solid var(--riga);border-radius:12px;padding:16px 18px;}
      .pv-iban .testo{font-size:14px;color:#3D4C55;line-height:1.6;margin-bottom:14px;}
      .pv-iban .riga-iban{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #F1EEE8;flex-wrap:wrap;}
      .pv-iban .riga-iban:first-of-type{border-top:none;}
      .pv-iban .et{width:96px;font-size:11.5px;color:var(--muto);text-transform:uppercase;letter-spacing:.07em;}
      .pv-iban .val{flex:1;min-width:150px;font-size:15px;}
      .pv-iban .val.mono{font-family:ui-monospace,Menlo,monospace;font-size:14.5px;letter-spacing:.02em;}
      .pv-iban .riga-iban.importo .val b{font-size:18px;color:var(--navy);}
      .pv-iban .copia{background:#fff;border:1.5px solid var(--riga);border-radius:8px;padding:7px 12px;
        font-size:12.5px;font-weight:700;color:var(--navy);cursor:pointer;font-family:inherit;}
      .pv-iban .carta{display:block;text-align:center;margin-top:14px;background:var(--navy);color:#fff;
        text-decoration:none;padding:14px;border-radius:11px;font-weight:700;font-size:15.5px;}
      .pv-iban .nota{font-size:12px;color:var(--muto);text-align:center;margin-top:7px;}
      .pv-iban .copiato{font-size:13px;color:#2F6B24;margin-top:9px;}
      .pv-errore{max-width:520px;margin:60px auto;background:#fff;border-radius:14px;padding:26px;text-align:center;font-size:16px;color:#3D4C55;}
    </style>
    <div class="pv">${dentro}</div>`;

  if (!token) {
    container.innerHTML = guscio(`<div class="pv-errore">Questo collegamento non è completo.</div>`);
    return;
  }

  let d = null, pag = null;
  try {
    const [r1, r2] = await Promise.all([
      supabase.rpc("preventivo_pubblico", { p_token: token }),
      supabase.rpc("preventivo_pagamento", { p_token: token }),
    ]);
    d = r1.data || null;
    pag = r2.data?.ok ? r2.data : null;
  } catch (e) { console.error(e); }

  if (!d || !d.ok) {
    container.innerHTML = guscio(`<div class="pv-errore">${esc((d && d.errore) || "Non riesco a caricare la proposta. Riprova tra poco.")}</div>`);
    return;
  }

  // le portate arrivano piatte: si raggruppano per sezione mantenendo l'ordine
  const perSezione = new Map();
  const aParte = new Map();
  (d.portate || []).forEach((p) => {
    const k = p.sezione || "Menu";
    const dove = p.separata ? aParte : perSezione;
    if (!dove.has(k)) dove.set(k, []);
    dove.get(k).push(p.nome);
  });

  if (d.scaduto) {
    container.innerHTML = guscio(`<div class="pv-errore">${esc(d.testo_scaduto || "Questa proposta è scaduta.")}</div>`, d.tema);
    return;
  }

  const invitati = Number(d.invitati) || 0;
  const totale = Number(d.totale) || 0;
  const acconto = Number(d.acconto) || 0;
  const nostre = (d.foto || []).filter(f => f.sezione !== "ispirazione");

  container.innerHTML = guscio(`
    <div class="pv-foglio">
      <div class="pv-testa">
        ${d.logo ? `<img src="${esc(d.logo)}" alt="">` : ""}
        <div class="pv-oc">${esc(d.tema?.occhiello || "Proposta per il vostro ricevimento")}</div>
        <h1>${esc(d.cliente || "")}</h1>
        <div class="pv-quando">${esc(dataLunga(d.data_evento))}${invitati ? " · " + invitati + " invitati" : ""}</div>
        ${d.confermato
          ? `<div class="pv-timer ok">✅ Proposta confermata — grazie!</div>`
          : `<div class="pv-timer">${esc(scadenzaTesto(d.scadenza))}</div>`}
        <button class="pv-stampa" id="pv-print">🖨️ Stampa o salva in PDF</button>
      </div>

      <div class="pv-corpo">
        <p class="pv-intro">${esc(d.intro || "")}</p>

        <div class="pv-dati">
          <div><span>Data</span><b>${esc(dataLunga(d.data_evento))}</b></div>
          <div><span>Evento</span><b>${esc(d.evento || "—")}</b></div>
          <div><span>Location</span><b>${esc(d.location || "—")}</b></div>
          <div><span>Invitati</span><b>${invitati || "—"}</b></div>
        </div>

        ${perSezione.size ? `
          <h2>Il menu</h2>
          <div class="pv-blocco">
            ${[...perSezione.entries()].map(([sez, piatti]) => `
              <div class="pv-sez">
                <div class="pv-tit">${esc(sez)}</div>
                ${piatti.map(n => `<div class="pv-p">${esc(n)}</div>`).join("")}
              </div>`).join("")}
          </div>` : ""}

        ${aParte.size ? [...aParte.entries()].map(([sez, piatti]) => `
          <h2>${esc(sez)}</h2>
          <div class="pv-blocco"><div class="pv-sez">
            ${piatti.map(n => `<div class="pv-p">${esc(n)}</div>`).join("")}
          </div></div>`).join("") : ""}

        ${(d.servizi || []).length ? `
          <h2>Servizi compresi</h2>
          <div class="pv-blocco">
            ${d.servizi.map(s => `<div class="pv-r"><span>${esc(s.descrizione)}</span><span>compreso</span></div>`).join("")}
          </div>` : ""}

        ${nostre.length ? `
          <h2>Qualche immagine</h2>
          <div class="pv-foto">
            ${nostre.map(f => `<img src="${esc(f.url)}" alt="${esc(f.titolo || "")}">`).join("")}
          </div>` : ""}

        <div class="pv-conto">
          <div class="pv-tot"><span>Totale</span><b>${euro(totale)}</b></div>
          ${d.mostra_prezzo_a_persona && invitati ? `<div class="pv-pp">${euro(totale / invitati)} a persona</div>` : ""}
        </div>

        ${acconto ? `
          <div class="pv-pag">
            <div class="r"><span>Acconto alla conferma</span><b>${euro(acconto)}</b></div>
            <div class="r"><span>Saldo il giorno dell'evento</span><b>${euro(totale - acconto)}</b></div>
          </div>` : ""}

        ${pag ? `
          <h2>Come versare l'acconto</h2>
          <div class="pv-iban">
            <p class="testo">${esc(pag.testo || "")}</p>
            ${pag.iban ? `
              <div class="riga-iban">
                <div class="et">Intestatario</div>
                <div class="val">${esc(pag.intestatario || d.locale)}</div>
              </div>
              <div class="riga-iban">
                <div class="et">IBAN</div>
                <div class="val mono" id="pv-iban">${esc(pag.iban)}</div>
                <button class="copia" data-copia="${esc(pag.iban)}">Copia</button>
              </div>
              ${pag.banca ? `<div class="riga-iban"><div class="et">Banca</div><div class="val">${esc(pag.banca)}</div></div>` : ""}
              <div class="riga-iban">
                <div class="et">Causale</div>
                <div class="val">${esc(pag.causale)}</div>
                <button class="copia" data-copia="${esc(pag.causale)}">Copia</button>
              </div>
              <div class="riga-iban importo">
                <div class="et">Importo</div>
                <div class="val"><b>${euro(pag.importo)}</b></div>
              </div>` : ""}
            ${pag.link ? `
              <a class="carta" href="${esc(pag.link)}" target="_blank" rel="noopener">💳 Paga con carta</a>
              <div class="nota">Pagamento sicuro: non trattiamo noi i dati della vostra carta.</div>` : ""}
            <div id="pv-copiato" class="copiato"></div>
          </div>` : ""}

        ${d.confermato ? "" : `
        <h2>Volete cambiare qualcosa?</h2>
        <div class="pv-mod">
          <div class="r">
            <label>Quante persone sarete</label>
            <div class="riga2">
              <input id="pv-invitati" type="number" min="1" value="${invitati || 1}">
              <button class="pv-btn piccolo" data-mod="invitati">Aggiorna</button>
            </div>
            <small>Fino a ${d.variazione_max} persone in più o in meno si aggiorna da solo.</small>
          </div>
          <div class="r">
            <label>A che ora iniziamo</label>
            <div class="riga2">
              <input id="pv-ora" type="time" value="${esc((d.ora_evento || "").slice(0,5))}">
              <button class="pv-btn piccolo" data-mod="orario">Aggiorna</button>
            </div>
          </div>
          <div class="r">
            <label>Avete una richiesta particolare?</label>
            <textarea id="pv-nota" rows="3" placeholder="Una torta diversa, un allestimento su misura, un'esigenza dei vostri ospiti..."></textarea>
            <button class="pv-btn" data-mod="personalizzazione">Mandaci la richiesta</button>
            <small>Le richieste che cambiano il prezzo le valutiamo noi e vi rispondiamo.</small>
          </div>
          <div id="pv-mod-esito"></div>
        </div>

        ${(d.servizi_disponibili || []).length ? `
        <h2>Volete aggiungere altro?</h2>
        <div class="pv-blocco">
          ${d.servizi_disponibili.map(s => `
            <div class="pv-serv">
              <div class="t"><b>${esc(s.nome)}</b><span>${esc(s.descrizione || s.categoria)}</span></div>
              <div class="pz">${euro(s.prezzo)}${s.unita === "a persona" ? " <small>a persona</small>" : ""}</div>
              <button class="pv-btn piccolo" data-servizio="${esc(s.id)}">Aggiungi</button>
            </div>`).join("")}
        </div>` : ""}
        `}

        <h2>Le vostre idee</h2>
        <div class="pv-carica">
          <b>Avete una foto di quello che vi piace?</b>
          <p>La torta vista da qualche parte, i fiori, l'allestimento che avete in mente.
             Caricatela qui: arriva direttamente a noi e la teniamo con il vostro evento.</p>
          <input id="pv-file" type="file" accept="image/*" multiple style="display:none;">
          <button class="pv-btn" id="pv-scegli">Carica una foto</button>
          <div id="pv-esito" style="font-size:13.5px;color:var(--muto);margin-top:10px;"></div>
        </div>

        <div class="pv-cta">
          <a href="#" id="pv-conferma">Confermo la proposta</a>
          <p>Oppure rispondete al messaggio: modifichiamo insieme quello che serve.</p>
        </div>

        <div class="pv-note">${esc(d.condizioni || "")}</div>
      </div>

      <div class="pv-pie"><b>${esc(d.locale || "")}</b></div>
    </div>
  `, d.tema);

  // ── caricamento foto degli sposi ────────────────────────────────────────
  const inp = document.getElementById("pv-file");
  document.getElementById("pv-scegli")?.addEventListener("click", () => inp?.click());

  inp?.addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const esito = document.getElementById("pv-esito");
    esito.textContent = "Caricamento…";
    let ok = 0;

    for (const f of files.slice(0, 8)) {
      try {
        const path = `ispirazioni/${token}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
        const up = await supabase.storage.from("media-aziende").upload(path, f, { contentType: f.type });
        if (up.error) continue;
        const { data: pub } = supabase.storage.from("media-aziende").getPublicUrl(path);
        await supabase.rpc("preventivo_allega_foto", {
          p_token: token, p_url: pub.publicUrl, p_sezione: "ispirazione", p_titolo: f.name,
        });
        ok++;
      } catch (err) { console.error(err); }
    }
    esito.textContent = ok
      ? `Grazie: ${ok === 1 ? "foto ricevuta" : ok + " foto ricevute"}. Le guardiamo subito.`
      : "Non è andata. Riprova o mandacele su WhatsApp.";
    inp.value = "";
  });

  document.getElementById("pv-print")?.addEventListener("click", () => window.print());

  container.querySelectorAll("[data-copia]").forEach((b) => {
    b.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copia);
        const e = document.getElementById("pv-copiato");
        if (e) { e.textContent = "Copiato."; setTimeout(() => { e.textContent = ""; }, 2000); }
      } catch { prompt("Copiate questo:", b.dataset.copia); }
    });
  });

  async function manda(tipo, valore, nota) {
    const esito = document.getElementById("pv-mod-esito");
    if (esito) esito.innerHTML = `<div class="pv-avviso attesa">Un attimo…</div>`;
    try {
      const { data } = await supabase.rpc("preventivo_richiesta", {
        p_token: token, p_tipo: tipo, p_valore: String(valore ?? ""), p_nota: nota ?? null,
      });
      if (esito) {
        esito.innerHTML = data?.ok
          ? `<div class="pv-avviso ${data.applicata ? "" : "attesa"}">${esc(data.messaggio || "Fatto.")}</div>`
          : `<div class="pv-avviso attesa">${esc(data?.errore || "Non è andata, riprovate.")}</div>`;
      }
      if (data?.applicata) setTimeout(() => render(container), 1400);
    } catch (e) {
      if (esito) esito.innerHTML = `<div class="pv-avviso attesa">Non è andata, riprovate.</div>`;
    }
  }

  container.querySelectorAll("[data-mod]").forEach((b) => {
    b.addEventListener("click", () => {
      const tipo = b.dataset.mod;
      if (tipo === "invitati") return manda("invitati", document.getElementById("pv-invitati")?.value);
      if (tipo === "orario") return manda("orario", document.getElementById("pv-ora")?.value);
      const nota = (document.getElementById("pv-nota")?.value || "").trim();
      if (!nota) { alert("Scrivete cosa vi serve."); return; }
      manda("personalizzazione", nota, nota);
    });
  });

  container.querySelectorAll("[data-servizio]").forEach((b) => {
    b.addEventListener("click", () => manda("servizio", b.dataset.servizio));
  });

  document.getElementById("pv-conferma")?.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!confirm("Confermate la proposta così com'è?")) return;
    const { data } = await supabase.rpc("preventivo_conferma", { p_token: token });
    if (data?.ok) render(container);
    else alert(data?.errore || "Non è andata, riprovate.");
  });
}

/* ── utilità ─────────────────────────────────────────────────────────── */
function scadenzaTesto(iso) {
  if (!iso) return "";
  const giorni = Math.ceil((new Date(iso) - Date.now()) / 86400000);
  if (giorni <= 0) return "Scade oggi";
  if (giorni === 1) return "Valida ancora 1 giorno";
  return "Valida ancora " + giorni + " giorni";
}

const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
  "luglio","agosto","settembre","ottobre","novembre","dicembre"];

function dataLunga(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  const g = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric" });
  return g.charAt(0).toUpperCase() + g.slice(1) + " " + MESI[d.getMonth()] + " " + d.getFullYear();
}
function euro(n) {
  return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
