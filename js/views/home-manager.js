// js/views/home-manager.js
// La home di chi guida il servizio. Una domanda sola: "stasera regge?"
// Timbratura (timbra anche lui), tre numeri, la riga di domani,
// gli avvisi da guardare adesso, e i sei posti dove va davvero.

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  const user = window.state?.user;
  const sede = window.state?.sedeAttiva;

  if (!sede) { window.location.hash = "#/scegli-sede"; return; }

  const oggi = new Date();
  const oggiISO = dataLocale(oggi);
  const domaniISO = dataLocale(new Date(oggi.getTime() + 86400000));

  let dip = window.state?.dipendente || null;
  if ((!dip || !dip.id) && azienda?.id && user?.id) {
    const { data } = await supabase.from("dipendenti")
      .select("id, nome, cognome").eq("azienda_id", azienda.id).eq("user_id", user.id).limit(1).maybeSingle();
    dip = data || null;
  }
  const nome = (dip?.nome || window.state?.profilo?.displayName
    || (user?.email ? user.email.split("@")[0] : "")).split(" ")[0] || "";

  container.innerHTML = `<div class="mg-home"><div class="mg-caric">Un attimo…</div></div>${stile()}`;

  const [mie, coperti, copertiDom, squadra, produzioni, prodDom, avvisi, comandamenti] = await Promise.all([
    mieTimbrature(supabase, azienda?.id, dip?.id),
    copertiDelGiorno(supabase, azienda?.id, sede?.id, oggiISO),
    copertiDelGiorno(supabase, azienda?.id, sede?.id, domaniISO),
    statoSquadra(supabase, azienda?.id, sede?.id, oggiISO),
    produzioniDelGiorno(supabase, azienda?.id, oggiISO),
    produzioniDelGiorno(supabase, azienda?.id, domaniISO),
    listaAvvisi(supabase, azienda?.id, sede?.id, oggiISO),
    listaComandamenti(supabase, azienda?.id),
  ]);

  // stesso pensiero per tutti, nello stesso giorno: se ne parla in servizio
  const indiceCom = comandamenti.length ? giornoDellAnno(oggi) % comandamenti.length : 0;
  const com = comandamenti.length ? comandamenti[indiceCom] : null;

  const stato = statoDaTimbrature(mie);
  const capienza = Number(sede?.coperti_max) || null;
  const mancanti = squadra.previsti ? Math.max(squadra.previsti - squadra.inTurno, 0) : 0;

  container.innerHTML = `
    <div class="mg-home">

      <div class="mg-salve">Ciao ${esc(nome)}
        <span>${oggi.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} · ${esc(sede?.nome || "")}</span>
      </div>

      ${dip?.id ? boxTimbratura(stato) : ""}

      <div class="mg-tre">
        <div class="k">
          <div class="n">${coperti.coperti}${capienza ? `<small>/${capienza}</small>` : ""}</div>
          <div class="l">Coperti<br>prenotati</div>
        </div>
        <div class="k ${mancanti ? "att" : ""}">
          <div class="n">${squadra.inTurno}${squadra.previsti ? `<small>/${squadra.previsti}</small>` : ""}</div>
          <div class="l">In turno<br>${squadra.previsti ? "su previsti" : "adesso"}</div>
        </div>
        <div class="k">
          <div class="l">Produzioni<br>aperte</div>
        </div>
      </div>

      <div class="mg-dom">
        <i>➡️</i><b>Domani</b>
        ${copertiDom.coperti} coperti · ${prodDom.totali} produzioni
        ${copertiDom.prenotazioni ? `<span>${copertiDom.prenotazioni} prenotazioni</span>` : ""}
      </div>

      <div class="mg-sez">Da guardare adesso</div>
      <div class="mg-avvisi">
        ${avvisi.length
          ? avvisi.map(a => `
            <a href="${a.link}" class="a ${a.livello}">
              <i class="pun"></i>
              <div class="t">${esc(a.titolo)}<span>${esc(a.sotto)}</span></div>
              <b>›</b>
            </a>`).join("")
          : `<div class="vuoto">Tutto in ordine: niente che richieda attenzione adesso.</div>`}
      </div>

      ${com ? `
        <div class="mg-com">
          <div class="et">Il pensiero di oggi</div>
          <p>${esc(com.testo)}</p>
        </div>` : ""}

      <div class="mg-sez">Vai a</div>
      <div class="mg-griglia">
        <a href="#/prenotazioni" class="p"><i>🪑</i><b>Prenotazioni</b><span>Sala e tavoli</span></a>
        <a href="#/ordini" class="p"><i>📦</i><b>Ordini</b><span>Fornitori</span></a>
        <a href="#/magazzino" class="p"><i>🧊</i><b>Magazzino</b><span>Giacenze e scorte</span></a>
        <a href="#/planning-lavoro" class="p"><i>📆</i><b>Turni</b><span>Planning squadra</span></a>
        <a href="#/dipendenti" class="p"><i>👥</i><b>Brigata</b><span>Chi c'è oggi</span></a>
        <a href="#/timbrature" class="p"><i>🕒</i><b>Timbrature</b><span>Entrate e uscite</span></a>
      </div>

      <div class="mg-pie">${esc(azienda?.nome || "")}</div>
    </div>
    ${stile()}`;

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
      <div class="mg-timb">
        <div class="stato"><i class="dot"></i> In servizio da ${esc(stato.entrata)}</div>
        <div class="conta">${stato.ore}<small>h</small> ${stato.minuti}<small>m</small></div>
        <button class="b esci" data-timbra="fine_turno">Esci</button>
      </div>`;
  }
  return `
    <div class="mg-timb">
      <div class="stato fuori"><i class="dot"></i> Non sei in servizio</div>
      <button class="b entra" data-timbra="inizio_turno">Entra</button>
    </div>`;
}

/* ── dati ──────────────────────────────────────────────────────────────── */

async function mieTimbrature(supabase, aziendaId, dipId) {
  if (!aziendaId || !dipId) return [];
  const da = new Date(Date.now() - 36 * 3600000).toISOString();
  const { data } = await supabase.from("timbrature").select("tipo, timestamp")
    .eq("azienda_id", aziendaId).eq("dipendente_id", dipId)
    .gte("timestamp", da).order("timestamp", { ascending: false }).limit(5);
  return data || [];
}

function statoDaTimbrature(righe) {
  const ultima = righe[0];
  if (ultima && ultima.tipo === "inizio_turno") {
    const inizio = new Date(ultima.timestamp);
    const min = Math.max(Math.floor((Date.now() - inizio.getTime()) / 60000), 0);
    return { dentro: true, entrata: oraDa(inizio), ore: Math.floor(min / 60), minuti: min % 60 };
  }
  return { dentro: false };
}

async function copertiDelGiorno(supabase, aziendaId, sedeId, giorno) {
  if (!aziendaId) return { coperti: 0, prenotazioni: 0, daConfermare: 0 };
  let q = supabase.from("prenotazioni_tavoli").select("coperti, stato")
    .eq("azienda_id", aziendaId).eq("data", giorno);
  if (sedeId) q = q.eq("sede_id", sedeId);
  const { data } = await q;
  const righe = (data || []).filter(r => !["annullata", "annullato", "rifiutata"].includes(String(r.stato || "").toLowerCase()));
  return {
    coperti: righe.reduce((t, r) => t + (Number(r.coperti) || 0), 0),
    prenotazioni: righe.length,
    daConfermare: righe.filter(r => ["in attesa", "in_attesa", "richiesta"].includes(String(r.stato || "").toLowerCase())).length,
  };
}

async function statoSquadra(supabase, aziendaId, sedeId, giorno) {
  if (!aziendaId) return { inTurno: 0, previsti: 0, senzaTimbratura: [] };
  const { data: timb } = await supabase.from("timbrature")
    .select("dipendente_id, dip_nome, tipo, timestamp")
    .eq("azienda_id", aziendaId).eq("data_turno", giorno)
    .order("timestamp", { ascending: true });

  const ultimo = new Map();
  (timb || []).forEach(t => ultimo.set(t.dipendente_id, t));
  const inTurno = [...ultimo.values()].filter(t => t.tipo === "inizio_turno").length;

  let q = supabase.from("turni_dipendenti")
    .select("dipendente_id, ora_inizio_prevista").eq("azienda_id", aziendaId).eq("data", giorno);
  if (sedeId) q = q.eq("sede_uuid", sedeId);
  const { data: previstiRows } = await q;

  const adesso = new Date();
  const senzaTimbratura = (previstiRows || []).filter(p => {
    const t = ultimo.get(p.dipendente_id);
    if (t && t.tipo === "inizio_turno") return false;
    if (!p.ora_inizio_prevista) return false;
    const [h, m] = String(p.ora_inizio_prevista).split(":");
    const attesa = new Date(adesso); attesa.setHours(Number(h), Number(m), 0, 0);
    return adesso > new Date(attesa.getTime() + 15 * 60000);
  });

  return { inTurno, previsti: (previstiRows || []).length, senzaTimbratura };
}

async function produzioniDelGiorno(supabase, aziendaId, giorno) {
  if (!aziendaId) return { totali: 0, aperte: 0 };
  const { data } = await supabase.from("produzione_lotti")
    .select("stato").eq("azienda_id", aziendaId).eq("data_produzione", giorno);
  const righe = data || [];
  return {
    totali: righe.length,
    aperte: righe.filter(r => !String(r.stato || "").toLowerCase().startsWith("chius")).length,
  };
}

async function listaComandamenti(supabase, aziendaId) {
  if (!aziendaId) return [];
  const { data } = await supabase.from("comandamenti")
    .select("testo").eq("azienda_id", aziendaId).eq("attivo", true).order("ordine");
  return data || [];
}

async function listaAvvisi(supabase, aziendaId, sedeId, oggiISO) {
  const out = [];
  if (!aziendaId) return out;

  const squadra = await statoSquadra(supabase, aziendaId, sedeId, oggiISO);
  if (squadra.senzaTimbratura.length) {
    out.push({
      livello: "rosso", link: "#/timbrature",
      titolo: squadra.senzaTimbratura.length === 1 ? "1 persona non ha timbrato" : squadra.senzaTimbratura.length + " persone non hanno timbrato",
      sotto: "Turno già iniziato",
    });
  }

  // sotto scorta: si guarda solo chi ha una soglia impostata
  const { data: prod } = await supabase.from("prodotti")
    .select("id, nome, scorta_minima").eq("azienda_id", aziendaId)
    .eq("attivo", true).gt("scorta_minima", 0).limit(200);
  const conSoglia = prod || [];
  if (conSoglia.length) {
    const ids = conSoglia.map(p => p.id);
    const { data: mov } = await supabase.from("magazzino_movimenti")
      .select("prodotto_id, tipo_movimento, quantita").eq("azienda_id", aziendaId).in("prodotto_id", ids);
    const giac = new Map();
    (mov || []).forEach(m => {
      const seg = String(m.tipo_movimento || "").toLowerCase().startsWith("caric") ? 1 : -1;
      giac.set(m.prodotto_id, (giac.get(m.prodotto_id) || 0) + seg * (Number(m.quantita) || 0));
    });
    const sotto = conSoglia.filter(p => (giac.get(p.id) || 0) < Number(p.scorta_minima));
    if (sotto.length) {
      out.push({
        livello: "rosso", link: "#/magazzino",
        titolo: sotto.length + (sotto.length === 1 ? " prodotto sotto scorta" : " prodotti sotto scorta"),
        sotto: sotto.slice(0, 3).map(p => p.nome).join(", "),
      });
    }
  }

  const { data: ordini } = await supabase.from("ordini_fornitore")
    .select("id, stato, data_consegna_prevista").eq("azienda_id", aziendaId)
    .is("inviato_at", null).limit(20);
  if ((ordini || []).length) {
    out.push({
      livello: "giallo", link: "#/ordini",
      titolo: ordini.length + (ordini.length === 1 ? " ordine da inviare" : " ordini da inviare"),
      sotto: "Preparati ma non ancora partiti",
    });
  }

  try {
    const { data } = await supabase.from("ricette")
      .select("id, nome").eq("azienda_id", aziendaId).eq("da_verificare", true).limit(50);
    if ((data || []).length) out.push({
      livello: "giallo", link: "#/ricette-da-verificare",
      titolo: data.length + (data.length === 1 ? " ricetta da controllare" : " ricette da controllare"),
      sotto: "Scritte da Tony: quantità e ingredienti da confermare",
    });
  } catch (e) { /* niente */ }

  const coperti = await copertiDelGiorno(supabase, aziendaId, sedeId, oggiISO);
  if (coperti.daConfermare) {
    out.push({
      livello: "giallo", link: "#/prenotazioni",
      titolo: coperti.daConfermare + (coperti.daConfermare === 1 ? " prenotazione da confermare" : " prenotazioni da confermare"),
      sotto: "In attesa di risposta",
    });
  }

  return out;
}

/* ── utilità ───────────────────────────────────────────────────────────── */

function giornoDellAnno(d) {
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
}
function dataLocale(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function oraDa(d) { return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stile() {
  return `<style>
  .mg-home{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--verde:#348127;--rosso:#B91C1C;
    --riga:#E2E6EA;--testo:#12232E;--muto:#6B7A83;
    padding:16px 14px 90px;max-width:560px;margin:0 auto;color:var(--testo);}
  .mg-caric{padding:40px 0;text-align:center;color:#94a3b8;}
  .mg-salve{font-size:21px;font-weight:800;margin-bottom:14px;}
  .mg-salve span{display:block;color:var(--muto);font-weight:500;font-size:14px;margin-top:3px;text-transform:capitalize;}

  .mg-timb{background:#fff;border:1px solid var(--riga);border-radius:18px;padding:16px 18px;margin-bottom:14px;
    display:flex;align-items:center;gap:14px;flex-wrap:wrap;box-shadow:0 4px 14px rgba(2,60,89,.06);}
  .mg-timb .stato{font-size:13.5px;font-weight:700;color:var(--verde);display:flex;align-items:center;gap:8px;flex:1;min-width:150px;}
  .mg-timb .stato.fuori{color:var(--muto);}
  .mg-timb .dot{width:9px;height:9px;border-radius:50%;background:currentColor;box-shadow:0 0 0 4px rgba(52,129,39,.15);}
  .mg-timb .conta{font-family:Georgia,serif;font-size:26px;color:var(--navy);}
  .mg-timb .conta small{font-size:13px;color:var(--muto);}
  .mg-timb .b{border:none;border-radius:12px;padding:13px 24px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:inherit;}
  .mg-timb .b.esci{background:var(--navy);color:#fff;}
  .mg-timb .b.entra{background:var(--verde);color:#fff;}

  .mg-tre{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:10px;}
  .mg-tre .k{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:14px 8px;text-align:center;}
  .mg-tre .n{font-family:Georgia,serif;font-size:29px;line-height:1;color:var(--navy);}
  .mg-tre .n small{font-size:14px;color:var(--muto);}
  .mg-tre .l{font-size:11.5px;color:var(--muto);margin-top:6px;line-height:1.3;}
  .mg-tre .k.att{border-color:#F5DFA0;background:#FFFCF3;}
  .mg-tre .k.att .n{color:#9A6A00;}

  .mg-dom{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:12px 15px;
    display:flex;align-items:center;gap:9px;font-size:14.5px;margin-bottom:20px;}
  .mg-dom i{font-style:normal;}
  .mg-dom b{color:var(--navy);}
  .mg-dom span{color:var(--muto);font-size:13px;margin-left:auto;}

  .mg-sez{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muto);margin:0 0 9px 4px;}
  .mg-avvisi{background:#fff;border:1px solid var(--riga);border-radius:16px;overflow:hidden;margin-bottom:20px;}
  .mg-avvisi .a{display:flex;align-items:center;gap:12px;padding:14px 15px;border-top:1px solid #F1F4F6;text-decoration:none;color:var(--testo);}
  .mg-avvisi .a:first-child{border-top:none;}
  .mg-avvisi .pun{width:9px;height:9px;border-radius:50%;flex:0 0 9px;font-style:normal;}
  .mg-avvisi .a.rosso .pun{background:var(--rosso);}
  .mg-avvisi .a.giallo .pun{background:var(--ambra);}
  .mg-avvisi .t{flex:1;font-size:15px;line-height:1.3;}
  .mg-avvisi .t span{display:block;font-size:12.5px;color:var(--muto);margin-top:2px;}
  .mg-avvisi b{color:#CBD5DB;font-size:19px;}
  .mg-avvisi .vuoto{padding:18px 15px;font-size:14px;color:var(--verde);background:#F6FBF3;}

  .mg-com{background:var(--navy);color:#fff;border-radius:16px;padding:18px;margin:0 0 20px;}
  .mg-com .et{font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ambra);margin-bottom:8px;}
  .mg-com p{font-family:Georgia,serif;font-size:18px;line-height:1.45;margin:0;}
  .mg-griglia{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .mg-griglia .p{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:16px 14px;text-decoration:none;color:var(--navy);}
  .mg-griglia .p i{font-style:normal;font-size:20px;display:block;margin-bottom:8px;}
  .mg-griglia .p b{display:block;font-size:15.5px;}
  .mg-griglia .p span{font-size:12.5px;color:var(--muto);}

  .mg-pie{text-align:center;font-size:11.5px;color:#9AA7AF;margin-top:22px;}
  </style>`;
}
