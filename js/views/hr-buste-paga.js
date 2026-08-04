// js/views/hr-buste-paga.js
// Buste paga: si caricano tutti i PDF del mese insieme, Tony li legge e li
// smista, poi si confermano. Da qui esce il costo orario vero, il totale da
// versare e il confronto tra ore pagate e ore timbrate.

const EF = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/busta-paga-leggi";

let periodo = { anno: new Date().getFullYear(), mese: new Date().getMonth() + 1 };

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  container.innerHTML = `
    <div class="bp">
      <h1>💶 Buste paga</h1>
      <p class="bp-sub">Carica i PDF del mese: li legge Tony, li smista lui, tu confermi.</p>

      <div class="bp-periodo">
        <select id="bp-mese">${MESI.map((m, i) =>
          `<option value="${i + 1}"${i + 1 === periodo.mese ? " selected" : ""}>${m}</option>`).join("")}</select>
        <input id="bp-anno" type="number" value="${periodo.anno}" min="2020" max="2100">
      </div>

      <div class="bp-carica" id="bp-drop">
        <input id="bp-file" type="file" accept="application/pdf" multiple style="display:none;">
        <div class="bp-drop-in">
          <div class="bp-drop-ico">📄</div>
          <div><b>Trascina qui i cedolini</b> oppure <button id="bp-scegli" class="bp-link">scegli i file</button></div>
          <div class="bp-drop-note">Tutti insieme: PDF, uno per dipendente</div>
        </div>
      </div>
      <div id="bp-avanzamento"></div>

      <div id="bp-riepilogo"></div>
      <div id="bp-elenco"></div>
      <div id="bp-solleciti"></div>
    </div>
    ${stile()}`;

  document.getElementById("bp-scegli").addEventListener("click", () => document.getElementById("bp-file").click());
  document.getElementById("bp-file").addEventListener("change", (e) => carica([...e.target.files]));
  document.getElementById("bp-mese").addEventListener("change", (e) => { periodo.mese = Number(e.target.value); aggiorna(); });
  document.getElementById("bp-anno").addEventListener("change", (e) => { periodo.anno = Number(e.target.value); aggiorna(); });

  const drop = document.getElementById("bp-drop");
  ["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("su"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("su"); }));
  drop.addEventListener("drop", (e) => carica([...(e.dataTransfer?.files || [])].filter(f => f.type === "application/pdf")));

  await aggiorna();

  /* ── caricamento in blocco ─────────────────────────────────────────── */
  async function carica(files) {
    if (!files.length) return;
    const box = document.getElementById("bp-avanzamento");
    const token = (await supabase.auth.getSession())?.data?.session?.access_token || "";
    const esiti = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      box.innerHTML = `<div class="bp-lavoro">Leggo <b>${esc(f.name)}</b> — ${i + 1} di ${files.length}…</div>`;
      try {
        const b64 = await leggiFile(f);
        // il PDF va in un archivio riservato, non nella libreria media
        const path = `${azienda.id}/${periodo.anno}-${String(periodo.mese).padStart(2, "0")}/${Date.now()}-${f.name}`;
        const up = await supabase.storage.from("buste-paga").upload(path, f, { contentType: "application/pdf", upsert: false });

        const resp = await fetch(EF, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, "apikey": token },
          body: JSON.stringify({ azienda_id: azienda.id, pdf_base64: b64, file_path: up.error ? null : path }),
        });
        const data = await resp.json();
        esiti.push({ file: f.name, ...data });
      } catch (e) {
        esiti.push({ file: f.name, success: false, error: e.message || String(e) });
      }
    }

    box.innerHTML = `
      <div class="bp-esiti">
        ${esiti.map(e => `
          <div class="bp-esito ${e.success ? "ok" : "ko"}">
            <b>${esc(e.file)}</b>
            ${e.success
              ? `<span>${e.dipendente ? esc(e.dipendente.nome + " " + (e.dipendente.cognome || "")) : "da abbinare"} · ${e.busta?.ore_retribuite || "—"} h · € ${Number(e.busta?.costo_orario || 0).toFixed(2)}/h</span>`
              : `<span>${esc(e.error || "non letto")}</span>`}
            ${(e.avvisi || []).map(a => `<div class="bp-avviso">⚠️ ${esc(a)}</div>`).join("")}
          </div>`).join("")}
      </div>`;
    await aggiorna();
  }

  /* ── riepilogo, elenco, solleciti ──────────────────────────────────── */
  async function aggiorna() {
    const [{ data: rie }, { data: righe }, { data: daFirmare }] = await Promise.all([
      supabase.rpc("riepilogo_buste", { p_azienda: azienda.id, p_anno: periodo.anno, p_mese: periodo.mese }),
      supabase.from("vw_buste_vs_timbrature").select("*")
        .eq("azienda_id", azienda.id).eq("anno", periodo.anno).eq("mese", periodo.mese),
      supabase.from("vw_buste_avvisi").select("*").eq("azienda_id", azienda.id),
    ]);

    const r = rie || {};
    document.getElementById("bp-riepilogo").innerHTML = !r.buste ? "" : `
      <div class="bp-rie">
        <div class="k"><span>Buste</span><b>${r.buste}</b><small>${r.da_verificare} da confermare</small></div>
        <div class="k"><span>Netti da pagare</span><b>€ ${fmt(r.netto)}</b></div>
        <div class="k big"><span>Da versare</span><b>€ ${fmt(r.da_versare)}</b><small>contributi, IRPEF e TFR</small></div>
        <div class="k"><span>Costo azienda</span><b>€ ${fmt(r.costo_azienda)}</b><small>${fmt(r.ore_busta)} ore</small></div>
      </div>`;

    const lista = righe || [];
    document.getElementById("bp-elenco").innerHTML = !lista.length
      ? `<div class="bp-vuoto">Nessuna busta per ${MESI[periodo.mese - 1]} ${periodo.anno}.</div>`
      : `<div class="bp-sez">Cedolini del mese</div>
         <div class="bp-tab">
           ${lista.map(b => {
             const scarto = b.scarto_perc;
             const grave = scarto != null && Math.abs(scarto) > 10;
             return `
             <div class="bp-riga">
               <div class="bp-nome">
                 <b>${esc(b.dipendente || "— da abbinare —")}</b>
                 <span>${fmt(b.ore_retribuite)} h in busta · € ${Number(b.costo_orario || 0).toFixed(2)}/h</span>
               </div>
               <div class="bp-ore ${grave ? "ko" : "ok"}">
                 ${b.ore_timbrate ? fmt(b.ore_timbrate) + " h timbrate" : "nessuna timbratura"}
                 ${scarto != null ? `<small>${scarto > 0 ? "+" : ""}${scarto}%</small>` : ""}
               </div>
               <div class="bp-azioni">
                 ${b.stato === "confermata"
                   ? `<span class="bp-badge ok">confermata</span>`
                   : `<button class="bp-btn" data-conferma="${b.id}" data-dip="${b.dipendente_id || ""}">Conferma</button>`}
               </div>
             </div>`;
           }).join("")}
         </div>`;

    container.querySelectorAll("[data-conferma]").forEach(b => {
      b.addEventListener("click", async () => {
        b.disabled = true; b.textContent = "…";
        const { error } = await supabase.from("buste_paga").update({ stato: "confermata" }).eq("id", b.dataset.conferma);
        if (!error && b.dataset.dip) {
          await supabase.rpc("aggiorna_costo_orario_da_buste", { p_dipendente: b.dataset.dip });
        }
        await aggiorna();
      });
    });

    const solleciti = (daFirmare || []).filter(x => ["da avvisare", "avvisata, mai aperta", "aperta, non firmata"].includes(x.situazione));
    document.getElementById("bp-solleciti").innerHTML = !solleciti.length ? "" : `
      <div class="bp-sez">Avvisi e firme</div>
      <div class="bp-tab">
        ${solleciti.map(s => `
          <div class="bp-riga">
            <div class="bp-nome">
              <b>${esc((s.nome || "") + " " + (s.cognome || ""))}</b>
              <span>${MESI[(s.mese || 1) - 1]} ${s.anno} · ${esc(s.situazione)}${s.giorni_da_avviso ? " da " + s.giorni_da_avviso + " giorni" : ""}</span>
            </div>
            <div class="bp-azioni">
              <a class="bp-wa" target="_blank" rel="noopener" href="${waLink(s, azienda)}">💬 Avvisa</a>
            </div>
          </div>`).join("")}
      </div>`;
  }
}

/* ── messaggi ────────────────────────────────────────────────────────── */
function waLink(s, azienda) {
  const tel = String(s.telefono || "").replace(/\D/g, "");
  const numero = tel.startsWith("39") ? tel : "39" + tel.replace(/^0+/, "");
  const nome = (s.nome || "").split(" ")[0];
  const mese = MESI[(s.mese || 1) - 1];
  const percorso = "Il mio profilo → Le mie buste paga";

  let testo;
  if (s.situazione === "aperta, non firmata") {
    testo = `Ciao ${nome}, hai aperto la busta paga di ${mese} ma manca la conferma di presa visione.\n\n`
      + `Riaprila da ${percorso} e premi "Ho ricevuto e preso visione". Sono due secondi, grazie!`;
  } else if (s.situazione === "avvisata, mai aperta") {
    testo = `Ciao ${nome}, la busta paga di ${mese} è disponibile`
      + (s.giorni_da_avviso ? ` da ${s.giorni_da_avviso} giorni` : "") + ` e non l'hai ancora aperta.\n\n`
      + `La trovi in ${percorso}.`;
  } else {
    testo = `Ciao ${nome}, la busta paga di ${mese} è disponibile.\n\n`
      + `La trovi nell'app: ${percorso}.\n\n`
      + `Quando la apri, premi "Ho ricevuto e preso visione": per noi vale come ricevuta di consegna.`;
  }
  return "https://wa.me/" + numero + "?text=" + encodeURIComponent(testo);
}

/* ── utilità ─────────────────────────────────────────────────────────── */
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

function leggiFile(f) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}
function fmt(n) { return Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stile() {
  return `<style>
  .bp{--navy:#023C59;--arancio:#E66101;--verde:#348127;--rosso:#B91C1C;--riga:#E2E6EA;--muto:#6B7A83;
      max-width:820px;margin:0 auto;padding:16px 14px 70px;color:#12232E;}
  .bp h1{font-size:23px;margin:0 0 4px;}
  .bp-sub{color:var(--muto);font-size:14px;margin:0 0 18px;}
  .bp-periodo{display:flex;gap:8px;margin-bottom:14px;}
  .bp-periodo select,.bp-periodo input{padding:10px;border:1.5px solid var(--riga);border-radius:10px;font-size:15px;font-family:inherit;background:#fff;}
  .bp-periodo input{width:110px;}

  .bp-carica{border:2px dashed #CBD5DB;border-radius:16px;background:#fff;padding:26px 16px;text-align:center;transition:.15s;}
  .bp-carica.su{border-color:var(--navy);background:#F4F9FC;}
  .bp-drop-ico{font-size:30px;margin-bottom:8px;}
  .bp-carica b{font-size:15.5px;}
  .bp-drop-note{font-size:12.5px;color:var(--muto);margin-top:5px;}
  .bp-link{background:none;border:none;color:var(--navy);font-weight:700;font-size:15.5px;cursor:pointer;text-decoration:underline;font-family:inherit;padding:0;}

  .bp-lavoro{margin-top:12px;padding:12px;background:#FFFBF0;border:1px solid #F5DFA0;border-radius:10px;font-size:14px;}
  .bp-esiti{margin-top:12px;display:grid;gap:8px;}
  .bp-esito{padding:11px 13px;border-radius:10px;border:1px solid var(--riga);background:#fff;font-size:14px;}
  .bp-esito.ok{border-left:4px solid var(--verde);}
  .bp-esito.ko{border-left:4px solid var(--rosso);}
  .bp-esito span{display:block;color:var(--muto);font-size:13px;margin-top:2px;}
  .bp-avviso{font-size:12.5px;color:#92400e;margin-top:5px;}

  .bp-rie{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:20px 0;}
  .bp-rie .k{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:14px;}
  .bp-rie .k span{display:block;font-size:12.5px;color:var(--muto);}
  .bp-rie .k b{display:block;font-family:Georgia,serif;font-size:24px;color:var(--navy);margin-top:3px;}
  .bp-rie .k small{display:block;font-size:11.5px;color:var(--muto);margin-top:2px;}
  .bp-rie .k.big{background:var(--navy);}
  .bp-rie .k.big span,.bp-rie .k.big small{color:#CFE0E8;}
  .bp-rie .k.big b{color:#fff;}

  .bp-sez{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muto);margin:20px 0 9px 4px;}
  .bp-tab{background:#fff;border:1px solid var(--riga);border-radius:14px;overflow:hidden;}
  .bp-riga{display:flex;align-items:center;gap:12px;padding:13px 15px;border-top:1px solid #F1F4F6;flex-wrap:wrap;}
  .bp-riga:first-child{border-top:none;}
  .bp-nome{flex:1;min-width:160px;}
  .bp-nome b{font-size:15px;}
  .bp-nome span{display:block;font-size:12.5px;color:var(--muto);margin-top:2px;}
  .bp-ore{font-size:13.5px;text-align:right;}
  .bp-ore.ok{color:var(--verde);}
  .bp-ore.ko{color:var(--rosso);font-weight:700;}
  .bp-ore small{display:block;font-size:12px;}
  .bp-btn{background:var(--navy);color:#fff;border:none;border-radius:9px;padding:9px 14px;font-size:13.5px;font-weight:700;cursor:pointer;}
  .bp-badge{font-size:12px;font-weight:700;padding:5px 10px;border-radius:100px;background:#F1F8ED;color:var(--verde);}
  .bp-wa{background:#25D366;color:#fff;text-decoration:none;border-radius:9px;padding:9px 13px;font-size:13.5px;font-weight:700;}
  .bp-vuoto{margin-top:20px;padding:18px;background:#fff;border:1px solid var(--riga);border-radius:14px;color:var(--muto);font-size:14px;}
  </style>`;
}
