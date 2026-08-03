// js/views/home-operatore.js
// La home di chi lavora in servizio. Una domanda sola: "cosa devo fare adesso?"
// In cima il gesto (timbratura), poi il turno, le lavorazioni di oggi,
// il pensiero del giorno e il QR recensioni. Niente numeri che non lo riguardano.

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  const user = window.state?.user;
  const sede = window.state?.sedeAttiva;

  if (!sede) { window.location.hash = "#/scegli-sede"; return; }

  const oggi = new Date();
  const oggiISO = dataLocale(oggi);

  // ── chi è ───────────────────────────────────────────────────────────────
  let dip = window.state?.dipendente || null;
  if ((!dip || !dip.id) && azienda?.id && user?.id) {
    const { data } = await supabase.from("dipendenti")
      .select("id, nome, cognome, reparto_id, codice_recensione")
      .eq("azienda_id", azienda.id).eq("user_id", user.id).limit(1).maybeSingle();
    dip = data || null;
    if (dip) window.state.dipendente = { ...(window.state.dipendente || {}), ...dip };
  }
  const nome = (dip?.nome
    || window.state?.profilo?.displayName
    || window.state?.profilo?.nome
    || (user?.email ? user.email.split("@")[0] : "")).split(" ")[0] || "";
  const iniziali = ((dip?.nome || nome || "?")[0] + (dip?.cognome ? dip.cognome[0] : "")).toUpperCase();

  container.innerHTML = `<div class="op-home"><div class="op-caric">Un attimo…</div></div>${stile()}`;

  // ── dati, tutti in parallelo e tutti tolleranti agli errori ─────────────
  const [timbr, oreSett, turni, lavorazioni, comandamenti] = await Promise.all([
    ultimeTimbrature(supabase, azienda?.id, dip?.id),
    oreSettimana(supabase, azienda?.id, dip?.id, oggi),
    turniVicini(supabase, azienda?.id, dip?.id, oggiISO),
    lavorazioniOggi(supabase, azienda?.id, dip?.id, oggiISO),
    listaComandamenti(supabase, azienda?.id),
  ]);

  const stato = statoDaTimbrature(timbr);
  const turnoOggi = turni.find(t => t.data === oggiISO) || null;
  const prossimo = turni.find(t => t.data > oggiISO) || null;

  const com = comandamenti.length
    ? comandamenti[giornoDellAnno(oggi) % comandamenti.length] : null;

  const linkQr = dip?.id
    ? "#/recensioni"
    : null;

  container.innerHTML = `
    <div class="op-home">

      <div class="op-salve">
        Ciao ${esc(nome)}
        <span>${oggi.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</span>
      </div>

      ${dip?.id ? boxTimbratura(stato) : `
        <div class="op-timb">
          <div class="stato fuori"><i class="dot"></i> Timbratura non disponibile</div>
          <div class="dalle">Il tuo accesso non è collegato a una scheda dipendente, quindi la
          timbratura non verrebbe attribuita a nessuno.</div>
          <div class="bottoni">
            <a href="#/dipendenti" class="b esci" style="display:block;text-align:center;text-decoration:none;">Apri Dipendenti</a>
          </div>
        </div>`}

      <div class="op-righe">
        <div class="r"><i>📅</i><span class="lab">Oggi</span><b>${turnoOggi
          ? esc(ora(turnoOggi.ora_inizio_prevista)) + " – " + esc(ora(turnoOggi.ora_fine_prevista))
          : "—"}</b></div>
        <div class="r"><i>⏱️</i><span class="lab">Questa settimana</span><b>${formattaOre(oreSett)}</b></div>
        <div class="r"><i>➡️</i><span class="lab">Prossimo turno</span><b>${prossimo
          ? esc(giornoBreve(prossimo.data) + " " + ora(prossimo.ora_inizio_prevista))
          : "—"}</b></div>
      </div>

      ${lavorazioni.length ? `
        <div class="op-sez">Oggi tocca a te</div>
        <div class="op-lav">
          ${lavorazioni.map(l => `
            <div class="l ${l.fatta ? "fatto" : ""}">
              <div class="ck"></div>
              <div class="t">${esc(l.titolo)}<span>${esc(l.sotto)}</span></div>
            </div>`).join("")}
        </div>` : ""}

      ${com ? `
        <div class="op-com">
          <div class="et">Il pensiero di oggi</div>
          <p>${esc(com.testo)}</p>
        </div>` : ""}

      <div class="op-scorc">
        <a href="#/mansionario-operatore" class="s"><i>📋</i><span>Mansionario</span><b>›</b></a>
        <a href="#/hr-richieste" class="s"><i>📆</i><span>Ferie e permessi</span><b>›</b></a>
        ${linkQr ? `<a href="${linkQr}" class="s"><i>⭐</i><span>Il mio QR recensioni</span><b>›</b></a>` : ""}
      </div>

      <div class="op-pie">${esc(azienda?.nome || "")} · ${esc(sede?.nome || "")}</div>
    </div>
    ${stile()}`;

  // ── timbratura: un tap, niente conferme ────────────────────────────────
  container.querySelectorAll("[data-timbra]").forEach(b => {
    b.addEventListener("click", async () => {
      const tipo = b.getAttribute("data-timbra");
      b.disabled = true; b.textContent = "…";
      const { error } = await supabase.from("timbrature").insert({
        azienda_id: azienda.id, sede_id: sede.id, dipendente_id: dip?.id,
        dip_nome: [dip?.nome, dip?.cognome].filter(Boolean).join(" "),
        tipo, canale: "web", timestamp: new Date().toISOString(),
      });
      if (error) { alert("Non è andata: " + error.message); b.disabled = false; return; }
      render(container);
    });
  });
}

/* ── blocchi ───────────────────────────────────────────────────────────── */

function boxTimbratura(stato) {
  if (stato.dentro) {
    return `
      <div class="op-timb">
        <div class="stato"><i class="dot"></i> In servizio</div>
        <div class="conta">${stato.ore}<small>h</small> ${stato.minuti}<small>m</small></div>
        <div class="dalle">Entrato alle ${esc(stato.entrata)}</div>
        <div class="bottoni">
          <button class="b esci" data-timbra="fine_turno">Esci</button>
        </div>
      </div>`;
  }
  return `
    <div class="op-timb">
      <div class="stato fuori"><i class="dot"></i> Non sei in servizio</div>
      <div class="dalle">${stato.ultimaUscita ? "Ultima uscita alle " + esc(stato.ultimaUscita) : "Nessuna timbratura oggi"}</div>
      <div class="bottoni">
        <button class="b entra" data-timbra="inizio_turno">Entra</button>
      </div>
    </div>`;
}

/* ── dati ──────────────────────────────────────────────────────────────── */

async function ultimeTimbrature(supabase, aziendaId, dipId) {
  if (!aziendaId || !dipId) return [];
  const da = new Date(Date.now() - 36 * 3600000).toISOString();
  const { data } = await supabase.from("timbrature")
    .select("tipo, timestamp").eq("azienda_id", aziendaId).eq("dipendente_id", dipId)
    .gte("timestamp", da).order("timestamp", { ascending: false }).limit(10);
  return data || [];
}

function statoDaTimbrature(righe) {
  const ultima = righe[0];
  if (ultima && ultima.tipo === "inizio_turno") {
    const inizio = new Date(ultima.timestamp);
    const min = Math.max(Math.floor((Date.now() - inizio.getTime()) / 60000), 0);
    return { dentro: true, entrata: oraDa(inizio), ore: Math.floor(min / 60), minuti: min % 60 };
  }
  return { dentro: false, ultimaUscita: ultima ? oraDa(new Date(ultima.timestamp)) : null };
}

async function oreSettimana(supabase, aziendaId, dipId, oggi) {
  if (!aziendaId || !dipId) return 0;
  const lun = new Date(oggi);
  lun.setDate(lun.getDate() - ((lun.getDay() + 6) % 7));
  const { data } = await supabase.from("timbrature")
    .select("ore_lavorate").eq("azienda_id", aziendaId).eq("dipendente_id", dipId)
    .eq("tipo", "fine_turno").gte("data_turno", dataLocale(lun)).lte("data_turno", dataLocale(oggi));
  return (data || []).reduce((t, r) => t + (Number(r.ore_lavorate) || 0), 0);
}

async function turniVicini(supabase, aziendaId, dipId, oggiISO) {
  if (!aziendaId || !dipId) return [];
  const { data } = await supabase.from("turni_dipendenti")
    .select("data, ora_inizio_prevista, ora_fine_prevista")
    .eq("azienda_id", aziendaId).eq("dipendente_id", dipId)
    .gte("data", oggiISO).order("data").limit(8);
  return data || [];
}

async function lavorazioniOggi(supabase, aziendaId, dipId, oggiISO) {
  if (!aziendaId || !dipId) return [];
  const { data } = await supabase.from("produzione_lotti")
    .select("id, stato, quantita_output, unita_misura, ricetta_id, ricette(nome)")
    .eq("azienda_id", aziendaId).eq("operatore_id", dipId)
    .eq("data_produzione", oggiISO).limit(12);
  return (data || []).map(l => ({
    fatta: String(l.stato || "").toLowerCase().startsWith("chius"),
    titolo: l.ricette?.nome || "Lavorazione",
    sotto: [l.quantita_output ? (Number(l.quantita_output) + " " + (l.unita_misura || "")) : null,
            String(l.stato || "").toLowerCase().startsWith("chius") ? "fatto" : null]
            .filter(Boolean).join(" · "),
  }));
}

async function listaComandamenti(supabase, aziendaId) {
  if (!aziendaId) return [];
  const { data } = await supabase.from("comandamenti")
    .select("testo").eq("azienda_id", aziendaId).eq("attivo", true).order("ordine");
  return data || [];
}

/* ── utilità ───────────────────────────────────────────────────────────── */

function dataLocale(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function giornoDellAnno(d) {
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
}
function oraDa(d) { return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }); }
function ora(t) { return t ? String(t).slice(0, 5) : "—"; }
function giornoBreve(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", "");
}
function formattaOre(n) {
  const tot = Math.round((Number(n) || 0) * 60);
  return Math.floor(tot / 60) + "h " + String(tot % 60).padStart(2, "0") + "m";
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stile() {
  return `<style>
  .op-home{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--verde:#348127;
    --carta:#F4F6F8;--riga:#E2E6EA;--testo:#12232E;--muto:#6B7A83;
    padding:16px 14px 90px;max-width:520px;margin:0 auto;color:var(--testo);}
  .op-caric{padding:40px 0;text-align:center;color:#94a3b8;}
  .op-salve{font-size:22px;font-weight:800;margin-bottom:14px;}
  .op-salve span{display:block;color:var(--muto);font-weight:500;font-size:14px;margin-top:3px;text-transform:capitalize;}

  .op-timb{background:#fff;border:1px solid var(--riga);border-radius:20px;padding:20px 18px;margin-bottom:14px;
    box-shadow:0 4px 14px rgba(2,60,89,.06);}
  .op-timb .stato{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;color:var(--verde);margin-bottom:12px;}
  .op-timb .stato.fuori{color:var(--muto);}
  .op-timb .dot{width:9px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 0 4px rgba(52,129,39,.15);}
  .op-timb .conta{font-family:Georgia,serif;font-size:40px;line-height:1;color:var(--navy);margin-bottom:4px;}
  .op-timb .conta small{font-size:15px;color:var(--muto);}
  .op-timb .dalle{font-size:13px;color:var(--muto);margin-bottom:16px;}
  .op-timb .bottoni{display:grid;gap:10px;}
  .op-timb .b{border:none;border-radius:14px;padding:17px;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit;width:100%;}
  .op-timb .b.esci{background:var(--navy);color:#fff;}
  .op-timb .b.entra{background:var(--verde);color:#fff;padding:20px;font-size:18px;}

  .op-righe{background:#fff;border:1px solid var(--riga);border-radius:16px;margin-bottom:6px;}
  .op-righe .r{display:flex;align-items:center;gap:12px;padding:13px 16px;border-top:1px solid #F1F4F6;}
  .op-righe .r:first-child{border-top:none;}
  .op-righe i{font-style:normal;width:22px;flex:0 0 22px;}
  .op-righe .lab{flex:1;color:var(--muto);font-size:13.5px;}
  .op-righe b{font-size:15.5px;}

  .op-sez{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muto);margin:22px 0 10px 4px;}
  .op-lav{background:#fff;border:1px solid var(--riga);border-radius:16px;overflow:hidden;}
  .op-lav .l{display:flex;align-items:center;gap:13px;padding:14px 16px;border-top:1px solid #F1F4F6;}
  .op-lav .l:first-child{border-top:none;}
  .op-lav .ck{width:24px;height:24px;border-radius:8px;border:2px solid #CBD5DB;flex:0 0 24px;position:relative;}
  .op-lav .l.fatto .ck{background:var(--verde);border-color:var(--verde);}
  .op-lav .l.fatto .ck:after{content:"✓";color:#fff;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;}
  .op-lav .t{flex:1;font-size:15.5px;line-height:1.3;}
  .op-lav .t span{display:block;font-size:12.5px;color:var(--muto);margin-top:2px;}
  .op-lav .l.fatto .t{color:var(--muto);text-decoration:line-through;}

  .op-com{background:var(--navy);color:#fff;border-radius:16px;padding:18px;margin-top:22px;}
  .op-com .et{font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ambra);margin-bottom:8px;}
  .op-com p{font-family:Georgia,serif;font-size:18px;line-height:1.45;margin:0;}

  .op-scorc{margin-top:14px;background:#fff;border:1px solid var(--riga);border-radius:16px;overflow:hidden;}
  .op-scorc .s{display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid #F1F4F6;
    text-decoration:none;color:var(--navy);font-size:15px;}
  .op-scorc .s:first-child{border-top:none;}
  .op-scorc .s i{font-style:normal;font-size:17px;}
  .op-scorc .s span{flex:1;}
  .op-scorc .s b{color:#CBD5DB;font-size:19px;}

  .op-pie{text-align:center;font-size:11.5px;color:#9AA7AF;margin-top:22px;}
  </style>`;
}
