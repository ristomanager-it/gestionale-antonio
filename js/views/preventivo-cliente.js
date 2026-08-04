// js/views/preventivo-cliente.js
// Rotta PUBBLICA #/preventivo?t=TOKEN — nessun login.
// È il documento che riceve il cliente: piatti, servizi, totale, acconto.
// Nessun costo, nessun margine: la funzione che serve i dati non li restituisce
// proprio, quindi non possono uscire nemmeno per errore.

export async function render(container) {
  const supabase = window.supabase || window.supabaseClient;
  const qs = new URLSearchParams((window.location.hash || "").split("?")[1] || "");
  const token = (qs.get("t") || "").trim();

  const guscio = (dentro) => `
    <style>
      .pv{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--carta:#FBFAF7;--riga:#E4E0D8;
          --testo:#12232E;--muto:#6B7A83;background:#DFE3E7;min-height:100vh;padding:20px 10px 60px;
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:var(--testo);}
      .pv-foglio{max-width:640px;margin:0 auto;background:var(--carta);border-radius:8px;
        box-shadow:0 12px 40px rgba(0,0,0,.14);overflow:hidden;}
      .pv-testa{text-align:center;padding:34px 30px 24px;border-bottom:3px solid var(--ambra);}
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
      .pv-errore{max-width:520px;margin:60px auto;background:#fff;border-radius:14px;padding:26px;text-align:center;font-size:16px;color:#3D4C55;}
    </style>
    <div class="pv">${dentro}</div>`;

  if (!token) {
    container.innerHTML = guscio(`<div class="pv-errore">Questo collegamento non è completo.</div>`);
    return;
  }

  let d = null;
  try {
    const { data } = await supabase.rpc("preventivo_pubblico", { p_token: token });
    d = data || null;
  } catch (e) { console.error(e); }

  if (!d || !d.ok) {
    container.innerHTML = guscio(`<div class="pv-errore">${esc((d && d.errore) || "Non riesco a caricare la proposta. Riprova tra poco.")}</div>`);
    return;
  }

  // le portate arrivano piatte: si raggruppano per sezione mantenendo l'ordine
  const perSezione = new Map();
  (d.portate || []).forEach((p) => {
    const k = p.sezione || "Menu";
    if (!perSezione.has(k)) perSezione.set(k, []);
    perSezione.get(k).push(p.nome);
  });

  const invitati = Number(d.invitati) || 0;
  const totale = Number(d.totale) || 0;
  const acconto = Number(d.acconto) || 0;
  const nostre = (d.foto || []).filter(f => f.sezione !== "ispirazione");

  container.innerHTML = guscio(`
    <div class="pv-foglio">
      <div class="pv-testa">
        ${d.logo ? `<img src="${esc(d.logo)}" alt="">` : ""}
        <div class="pv-oc">Proposta per il vostro ricevimento</div>
        <h1>${esc(d.cliente || "")}</h1>
        <div class="pv-quando">${esc(dataLunga(d.data_evento))}${invitati ? " · " + invitati + " invitati" : ""}</div>
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
  `);

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

  document.getElementById("pv-conferma")?.addEventListener("click", (e) => {
    e.preventDefault();
    alert("Grazie! Vi ricontattiamo subito per chiudere i dettagli.");
  });
}

/* ── utilità ─────────────────────────────────────────────────────────── */
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
