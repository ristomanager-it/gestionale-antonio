/* =========================================================
   AGENZIA VIAGGI — catalogo viaggi, iscritti, incassi
   Solo admin, solo azienda Ristoflow (gate nel router).
   v2: creazione viaggio e iscrizione, tab letto dall'hash.
   ========================================================= */

let viaggiCache = [];
let tabAttiva = "catalogo";
let viaggioSel = null;

const STATO_VIAGGIO = {
  bozza:       { t: "✏️ Bozza",      c: "#94a3b8" },
  pubblicato:  { t: "🟢 Pubblicato", c: "#16a34a" },
  chiuso:      { t: "🔒 Chiuso",     c: "#0E5A7A" },
  archiviato:  { t: "📦 Archiviato", c: "#64748b" },
};

const MODALITA_LABEL = {
  acconto_saldo: "Acconto e saldo",
  rate_mensili:  "Rate",
  libero:        "Versamenti liberi",
};

function supa() { return window.supabaseClient || window.supabase; }
function aziendaId() { return window.state?.azienda?.id; }

function tabDaHash() {
  const h = String(window.location.hash || "");
  const q = h.split("?")[1];
  if (!q) return null;
  const t = new URLSearchParams(q).get("tab");
  return ["catalogo", "occasioni", "iscritti", "incassi", "acquisti", "richieste"].includes(t) ? t : null;
}

// L avviso via email porta dritto alla richiesta da guardare, non al catalogo.
function richiestaDaHash() {
  const h = String(window.location.hash || "");
  const q = h.split("?")[1];
  if (!q) return null;
  return new URLSearchParams(q).get("richiesta");
}
let richiestaAperta = null;

const CSS_VIAGGI = `
  .av-wrap{max-width:1100px;margin:0 auto;padding:14px;overflow-x:hidden}
  .av-wrap *{max-width:100%}
  .av-num{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}
  .av-num > div{flex:1 1 calc(50% - 5px);border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#fff}
  .av-num b{display:block;font-size:20px;font-weight:700;line-height:1.1}
  .av-num span{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
  .av-due{display:flex;gap:12px;flex-wrap:wrap}
  .av-due > div{flex:1 1 150px;min-width:0}
  .av-link{display:block;word-break:break-all;overflow-wrap:anywhere;color:#0E5A7A;font-weight:700;font-size:14px}
  .av-tab-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .av-tabella{width:100%;border-collapse:collapse;font-size:14px}
  .av-tabella th{text-align:left;padding:8px 6px;border-bottom:2px solid #0E5A7A;
                 font-size:11px;color:#64748b;text-transform:uppercase}
  .av-tabella td{padding:9px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top;
                 overflow-wrap:break-word;word-break:normal}
  @media (max-width: 700px) {
    .av-wrap{padding:10px}
    .av-num > div{flex:1 1 calc(50% - 5px);padding:10px}
    .av-num b{font-size:17px}
    /* le tabelle diventano schede impilate: sette colonne su un telefono non ci stanno */
    .av-tabella, .av-tabella tbody, .av-tabella tr, .av-tabella td{display:block;width:100%}
    .av-tabella thead{display:none}
    .av-tabella tr{border:1px solid #e2e8f0;border-radius:10px;background:#fff;
                   margin-bottom:10px;padding:6px 10px}
    .av-tabella td{border:0;border-bottom:1px solid #f1f5f9;padding:7px 0;display:flex;gap:10px}
    .av-tabella td:last-child{border-bottom:0}
    .av-tabella td:before{content:attr(data-et);flex:0 0 40%;font-size:11px;color:#64748b;
                          text-transform:uppercase;letter-spacing:.03em;padding-top:2px}
    .av-tabella td > *{flex:1;min-width:0}
    .av-tabella td.av-vuoto{display:none}
  }
`;

function iniettaCss() {
  if (document.getElementById("av-css")) return;
  const st = document.createElement("style");
  st.id = "av-css";
  st.textContent = CSS_VIAGGI;
  document.head.appendChild(st);
}

// Copia l'intestazione di colonna dentro ogni cella, cosi su telefono
// la tabella puo diventare una scheda con le etichette a sinistra.
function etichetta(box) {
  if (!box) return;
  box.querySelectorAll("table.av-tabella").forEach(function (t) {
    const teste = Array.prototype.map.call(t.querySelectorAll("thead th"), function (th) {
      return th.textContent.trim();
    });
    t.querySelectorAll("tbody tr").forEach(function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) {
        td.setAttribute("data-et", teste[i] || "");
        const testo = td.textContent.replace(/\s/g, "");
        if (testo === "" || testo === "\u2014") td.classList.add("av-vuoto");
      });
    });
  });
}

export async function render(app) {
  const azienda = window.state?.azienda;
  richiestaAperta = richiestaDaHash();
  tabAttiva = tabDaHash() || (richiestaAperta ? "richieste" : "catalogo");
  iniettaCss();

  app.innerHTML = `
    <div class="av-wrap">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap;">
        <div>
          <h1 style="margin:0 0 4px;font-size:22px;">🚐 Agenzia viaggi</h1>
          <div style="color:#64748b;font-size:13px;margin-bottom:16px;">${escapeHtml(azienda?.nome || "")} — viaggi, iscritti e incassi</div>
        </div>
        <button id="av-nuovo" style="background:#0E5A7A;color:#fff;border:0;border-radius:8px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer;">➕ Nuovo viaggio</button>
      </div>

      <div id="av-tabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        <button data-tab="catalogo" class="av-tab">Catalogo</button>
        <button data-tab="occasioni" class="av-tab">Occasioni</button>
        <button data-tab="iscritti" class="av-tab">Iscritti</button>
        <button data-tab="incassi"  class="av-tab">Incassi</button>
        <button data-tab="acquisti" class="av-tab">Da comprare</button>
        <button data-tab="richieste" class="av-tab">Richieste</button>
      </div>

      <div id="av-corpo"><div style="color:#64748b;">Caricamento...</div></div>
    </div>
  `;

  app.querySelectorAll(".av-tab").forEach(function (b) {
    b.style.cssText = "background:#fff;border:1px solid #0E5A7A;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;color:#0E5A7A;";
    b.addEventListener("click", function () {
      tabAttiva = b.dataset.tab;
      disegnaTabs();
      caricaTab();
    });
  });

  const bNuovo = document.getElementById("av-nuovo");
  if (bNuovo) bNuovo.addEventListener("click", formNuovoViaggio);

  disegnaTabs();

  try {
    await caricaViaggi();
    await caricaTab();
  } catch (e) {
    mostraErrore(e);
  }
}

function disegnaTabs() {
  document.querySelectorAll(".av-tab").forEach(function (b) {
    const on = b.dataset.tab === tabAttiva;
    b.style.background = on ? "#0E5A7A" : "#fff";
    b.style.color = on ? "#fff" : "#0E5A7A";
  });
}

function mostraErrore(e) {
  const box = document.getElementById("av-corpo");
  if (!box) return;
  box.innerHTML = "<div style=\"border:1px solid #fca5a5;background:#fef2f2;border-radius:10px;padding:16px;color:#991b1b;\">"
    + "<b>Qualcosa non ha risposto.</b><div style=\"font-size:13px;margin-top:6px;\">"
    + escapeHtml(e && e.message ? e.message : String(e)) + "</div></div>";
}

async function caricaViaggi() {
  const r = await supa()
    .from("viaggi")
    .select("id,slug,titolo,sottotitolo,data_inizio,data_fine,stato,modalita_prezzo,quota_camper,quota_posto,quota_adulto,posti_per_mezzo,posti_condivisi_max,catalogo")
    .eq("azienda_id", aziendaId())
    .order("data_inizio", { ascending: true });

  if (r.error) throw r.error;
  viaggiCache = r.data || [];
  if (!viaggioSel && viaggiCache.length) viaggioSel = viaggiCache[0].id;
}

async function caricaTab() {
  try {
    if (tabAttiva === "catalogo") return renderCatalogo();
    if (tabAttiva === "occasioni") return await renderOccasioni();
    if (tabAttiva === "iscritti") return await renderIscritti();
    if (tabAttiva === "acquisti") return await renderAcquisti();
    if (tabAttiva === "richieste") return await renderRichieste();
    return await renderIncassi();
  } catch (e) {
    mostraErrore(e);
  }
}

/* ---------------- NUOVO VIAGGIO ---------------- */

function formNuovoViaggio() {
  const box = document.getElementById("av-corpo");
  if (!box) return;

  box.innerHTML = ""
    + "<div style=\"border:1px solid #e2e8f0;border-radius:12px;padding:18px;background:#fff;max-width:640px;\">"
    + "<h2 style=\"margin:0 0 14px;font-size:18px;\">Nuovo viaggio</h2>"
    + campo("nv-titolo", "Titolo", "text", "Route 66 in camper")
    + campo("nv-sotto", "Sottotitolo", "text", "Da Chicago a Santa Monica")
    + "<div class=\"av-due\">"
    +   "<div style=\"flex:1 1 160px;\">" + campo("nv-dal", "Partenza", "date", "") + "</div>"
    +   "<div style=\"flex:1 1 160px;\">" + campo("nv-al", "Rientro", "date", "") + "</div>"
    + "</div>"
    + "<label style=\"font-size:12px;color:#64748b;display:block;margin-top:10px;\">Come si vende</label>"
    + "<select id=\"nv-modalita\" style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;\">"
    +   "<option value=\"camper\">A camper (fino a 5 persone)</option>"
    +   "<option value=\"persona\">A persona</option>"
    + "</select>"
    + "<div class=\"av-due\">"
    +   "<div style=\"flex:1 1 160px;\">" + campo("nv-quota", "Quota (€)", "number", "12500") + "</div>"
    +   "<div style=\"flex:1 1 160px;\">" + campo("nv-quota-posto", "Quota posto singolo (€)", "number", "1250") + "</div>"
    + "</div>"
    + "<div class=\"av-due\">"
    +   "<div style=\"flex:1 1 160px;\">" + campo("nv-acconto", "Acconto %", "number", "25") + "</div>"
    +   "<div style=\"flex:1 1 160px;\">" + campo("nv-slug", "Indirizzo pagina", "text", "route66-2027") + "</div>"
    + "</div>"
    + "<div id=\"nv-msg\" style=\"margin-top:12px;font-size:13px;\"></div>"
    + "<div style=\"margin-top:16px;display:flex;gap:10px;\">"
    +   "<button id=\"nv-salva\" style=\"background:#0E5A7A;color:#fff;border:0;border-radius:8px;padding:11px 20px;font-weight:700;cursor:pointer;\">Crea viaggio</button>"
    +   "<button id=\"nv-annulla\" style=\"background:#fff;color:#64748b;border:1px solid #cbd5e1;border-radius:8px;padding:11px 20px;font-weight:700;cursor:pointer;\">Annulla</button>"
    + "</div></div>";

  document.getElementById("nv-annulla").addEventListener("click", function () {
    tabAttiva = "catalogo"; disegnaTabs(); caricaTab();
  });

  document.getElementById("nv-salva").addEventListener("click", async function () {
    const msg = document.getElementById("nv-msg");
    const titolo = val("nv-titolo");
    let slug = val("nv-slug").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");

    if (!titolo) { msg.innerHTML = rosso("Serve almeno il titolo."); return; }
    if (!slug) slug = "viaggio-" + Date.now();

    const modalita = val("nv-modalita");
    const quota = Number(val("nv-quota") || 0);

    const riga = {
      azienda_id: aziendaId(),
      slug: slug,
      titolo: titolo,
      sottotitolo: val("nv-sotto") || null,
      data_inizio: val("nv-dal") || null,
      data_fine: val("nv-al") || null,
      stato: "bozza",
      pubblico: false,
      adesioni_aperte: false,
      modalita_prezzo: modalita,
      quota_camper: modalita === "camper" ? quota : 0,
      quota_adulto: modalita === "persona" ? quota : 0,
      quota_posto: Number(val("nv-quota-posto") || 0),
      acconto_percentuale: Number(val("nv-acconto") || 30),
    };

    msg.innerHTML = "<span style=\"color:#64748b;\">Salvo...</span>";
    const r = await supa().from("viaggi").insert(riga).select("id").single();

    if (r.error) {
      msg.innerHTML = rosso(r.error.message.indexOf("duplicate") >= 0
        ? "Esiste gia un viaggio con questo indirizzo pagina. Cambialo."
        : r.error.message);
      return;
    }

    viaggioSel = r.data.id;
    await caricaViaggi();
    tabAttiva = "catalogo";
    disegnaTabs();
    renderCatalogo();
  });
}

/* ---------------- NUOVA ISCRIZIONE ---------------- */

function formNuovaIscrizione() {
  const box = document.getElementById("av-corpo");
  if (!box) return;

  if (!viaggiCache.length) {
    box.innerHTML = vuoto("Prima serve un viaggio.");
    return;
  }

  let opzioni = "";
  viaggiCache.forEach(function (v) {
    opzioni += "<option value=\"" + v.id + "\">" + escapeHtml(v.titolo) + "</option>";
  });

  box.innerHTML = ""
    + "<div style=\"border:1px solid #e2e8f0;border-radius:12px;padding:18px;background:#fff;max-width:640px;\">"
    + "<h2 style=\"margin:0 0 14px;font-size:18px;\">Nuova iscrizione</h2>"
    + "<label style=\"font-size:12px;color:#64748b;display:block;\">Viaggio</label>"
    + "<select id=\"ni-viaggio\" style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;\">" + opzioni + "</select>"
    + campo("ni-referente", "Referente", "text", "Nome e cognome")
    + campo("ni-nucleo", "Nucleo o gruppo", "text", "Famiglia Rossi")
    + campo("ni-email", "Email", "email", "")
    + "<div class=\"av-due\">"
    +   "<div style=\"flex:1 1 120px;\">" + campo("ni-adulti", "Adulti", "number", "2") + "</div>"
    +   "<div style=\"flex:1 1 120px;\">" + campo("ni-bambini", "Bambini", "number", "0") + "</div>"
    +   "<div style=\"flex:1 1 160px;\">" + campo("ni-quota", "Quota totale (€)", "number", "") + "</div>"
    + "</div>"
    + "<label style=\"font-size:12px;color:#64748b;display:block;margin-top:10px;\">Come paga</label>"
    + "<select id=\"ni-modalita\" style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;\">"
    +   "<option value=\"acconto_saldo\">Acconto e saldo</option>"
    +   "<option value=\"rate_mensili\">A rate</option>"
    +   "<option value=\"libero\">Versa quando puo</option>"
    + "</select>"
    + "<div class=\"av-due\" style=\"margin-top:10px;\">"
    +   "<div style=\"flex:1 1 200px;\">"
    +     "<label style=\"font-size:12px;color:#64748b;display:block;\">Chi paga</label>"
    +     "<select id=\"ni-chipaga\" style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;\">"
    +       "<option value=\"unico\">Un solo pagatore</option>"
    +       "<option value=\"pro_capite\">Ognuno la sua quota</option>"
    +     "</select></div>"
    +   "<div style=\"flex:1 1 200px;\">"
    +     "<label style=\"font-size:12px;color:#64748b;display:block;\">Ogni quanto</label>"
    +     "<select id=\"ni-cadenza\" style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;\">"
    +       "<option value=\"1\">Ogni mese</option>"
    +       "<option value=\"2\">Ogni due mesi</option>"
    +       "<option value=\"3\">Ogni tre mesi</option>"
    +       "<option value=\"6\">Ogni sei mesi</option>"
    +     "</select></div>"
    + "</div>"
    + "<div style=\"font-size:12px;color:#64748b;margin-top:8px;\">Con \"ognuno la sua quota\" i partecipanti vanno aggiunti prima di generare il piano.</div>"
    + "<div id=\"ni-msg\" style=\"margin-top:12px;font-size:13px;\"></div>"
    + "<div style=\"margin-top:16px;display:flex;gap:10px;\">"
    +   "<button id=\"ni-salva\" style=\"background:#0E5A7A;color:#fff;border:0;border-radius:8px;padding:11px 20px;font-weight:700;cursor:pointer;\">Crea e genera il piano</button>"
    +   "<button id=\"ni-annulla\" style=\"background:#fff;color:#64748b;border:1px solid #cbd5e1;border-radius:8px;padding:11px 20px;font-weight:700;cursor:pointer;\">Annulla</button>"
    + "</div></div>";

  const vSel = document.getElementById("ni-viaggio");
  const qCampo = document.getElementById("ni-quota");
  function proponiQuota() {
    const v = viaggiCache.find(function (x) { return x.id === vSel.value; });
    if (!v || qCampo.value) return;
    qCampo.value = v.modalita_prezzo === "camper" ? (v.quota_camper || "") : (v.quota_adulto || "");
  }
  vSel.addEventListener("change", function () { qCampo.value = ""; proponiQuota(); });
  proponiQuota();

  document.getElementById("ni-annulla").addEventListener("click", function () {
    tabAttiva = "iscritti"; disegnaTabs(); caricaTab();
  });

  document.getElementById("ni-salva").addEventListener("click", async function () {
    const msg = document.getElementById("ni-msg");
    const referente = val("ni-referente");
    if (!referente) { msg.innerHTML = rosso("Serve il nome del referente."); return; }

    const chiPaga = val("ni-chipaga");
    const riga = {
      viaggio_id: vSel.value,
      azienda_id: aziendaId(),
      referente_nome: referente,
      nucleo_familiare: val("ni-nucleo") || null,
      referente_email: val("ni-email") || null,
      n_adulti: Number(val("ni-adulti") || 1),
      n_bambini: Number(val("ni-bambini") || 0),
      quota_totale: Number(val("ni-quota") || 0),
      modalita_pagamento: val("ni-modalita"),
      chi_paga: chiPaga,
      cadenza_mesi: Number(val("ni-cadenza") || 1),
      stato: "richiesta",
    };

    msg.innerHTML = "<span style=\"color:#64748b;\">Salvo...</span>";
    const r = await supa().from("viaggi_iscrizioni").insert(riga).select("id").single();
    if (r.error) { msg.innerHTML = rosso(r.error.message); return; }

    if (chiPaga === "pro_capite") {
      msg.innerHTML = "<span style=\"color:#16a34a;\">Iscrizione creata. Aggiungi i partecipanti, poi genera il piano.</span>";
    } else {
      const g = await supa().rpc("viaggi_genera_rate", { p_iscrizione: r.data.id });
      if (g.error) { msg.innerHTML = rosso("Iscrizione creata, ma il piano no: " + g.error.message); return; }
    }

    tabAttiva = "iscritti";
    disegnaTabs();
    await caricaTab();
  });
}

/* ---------------- CATALOGO ---------------- */

function renderCatalogo() {
  const box = document.getElementById("av-corpo");
  if (!box) return;

  if (!viaggiCache.length) {
    box.innerHTML = vuoto("Nessun viaggio ancora. Premi Nuovo viaggio qui sopra per crearne uno.");
    return;
  }

  let html = tabellaApri(["Viaggio", "Periodo", "Mezzo intero", "A persona", "Stato"]);

  viaggiCache.forEach(function (v) {
    const st = STATO_VIAGGIO[v.stato] || STATO_VIAGGIO.bozza;
    const quota = v.modalita_prezzo === "camper"
      ? euro(v.quota_camper) + " <span style=\"color:#64748b;\">a camper</span>"
      : euro(v.quota_adulto) + " <span style=\"color:#64748b;\">a persona</span>";

    html += "<tr class=\"av-riga\" data-id=\"" + v.id + "\" style=\"cursor:pointer;\">"
      + td("<b style=\"color:#0E5A7A;\">" + escapeHtml(v.titolo) + "</b><div style=\"color:#64748b;font-size:12px;\">" + escapeHtml(v.sottotitolo || "") + "</div>")
      + td(periodo(v.data_inizio, v.data_fine))
      + td(euro(v.quota_camper))
      + td(Number(v.quota_posto) > 0 ? euro(v.quota_posto) : "—")
      + td("<span style=\"color:" + st.c + ";font-weight:700;\">" + st.t + "</span>")
      + "</tr>";
  });

  box.innerHTML = html + tabellaChiudi();
  etichetta(box);

  box.querySelectorAll(".av-riga").forEach(function (tr) {
    tr.addEventListener("click", function () { apriViaggio(tr.dataset.id); });
  });
}

/* ---------------- SCHEDA DEL VIAGGIO ---------------- */

async function apriViaggio(id) {
  const box = document.getElementById("av-corpo");
  if (!box) return;
  box.innerHTML = "<div style=\"color:#64748b;\">Carico il viaggio...</div>";

  const v = viaggiCache.find(function (x) { return x.id === id; });
  if (!v) { box.innerHTML = vuoto("Viaggio non trovato."); return; }

  try {
    const [tp, bg, sc, mz] = await Promise.all([
      supa().from("viaggi_tappe")
        // foto_url mancava: la colonna Foto mostrava "carica" anche sulle tappe
        // che la foto ce l avevano gia. I campi alloggio servono alla colonna nuova.
        .select("id,giorno,data,titolo,descrizione,km,tipo,stato_usa,foto_wiki,foto_url,"
          + "alloggio_nome,alloggio_indirizzo,alloggio_note,alloggio_telefono,alloggio_mappa")
        .eq("viaggio_id", id).order("giorno"),
      supa().from("viaggi_budget")
        .select("voce,dettaglio,importo_min,importo_max,categoria")
        .eq("viaggio_id", id).order("ordine"),
      supa().from("viaggi_scadenze")
        .select("titolo,descrizione,mese_target,completato")
        .eq("viaggio_id", id).order("mese_target"),
      supa().from("viaggi_mezzi")
        .select("id,nome,modello,posti_max,posti_letto,stato,note").eq("viaggio_id", id).order("nome"),
    ]);
    if (tp.error) throw tp.error;

    const tappe = tp.data || [];
    const ids = tappe.map(function (t) { return t.id; });
    let pasti = [];
    if (ids.length) {
      const pa = await supa().from("viaggi_tappe_pasti")
        .select("tappa_id,momento,dove,locale,citta,piatto,ricetta_camper,spesa_persona,prenotazione_necessaria")
        .in("tappa_id", ids);
      pasti = pa.data || [];
    }
    const perTappa = {};
    pasti.forEach(function (p) { (perTappa[p.tappa_id] = perTappa[p.tappa_id] || []).push(p); });

    let km = 0;
    tappe.forEach(function (t) { km += Number(t.km || 0); });

    const url = location.origin + "/viaggi/v/?s=" + encodeURIComponent(v.slug);

    let h = "<div style=\"margin-bottom:14px;\"><button id=\"av-indietro\" style=\"background:#fff;color:#0E5A7A;border:1px solid #0E5A7A;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;\">← Catalogo</button></div>";

    h += "<h2 style=\"margin:0 0 2px;font-size:24px;\">" + escapeHtml(v.titolo) + "</h2>"
      + "<div style=\"color:#64748b;margin-bottom:14px;font-size:14px;\">" + escapeHtml(v.sottotitolo || "") + "<br>" + periodo(v.data_inizio, v.data_fine) + "</div>";

    h += "<div class=\"av-num\">"
      + card("Giorni", String(tappe.length), "#0E5A7A")
      + card("Chilometri", km.toLocaleString("it-IT"), "#0E5A7A")
      + (Number(v.quota_camper) > 0
          ? card((v.mezzo_etichetta || "camper") === "camper" ? "Camper intero" : "Mezzo intero",
                 euro(v.quota_camper), "#16a34a")
            + card("A persona", Number(v.quota_posto) > 0 ? euro(v.quota_posto) : "—", "#16a34a")
          : card("Prezzo a persona", Number(v.quota_posto) > 0 ? euro(v.quota_posto) : "—", "#16a34a"))
      + "</div>";

    h += "<div style=\"border:1px solid #e2e8f0;border-radius:10px;padding:14px;background:#fff;margin-bottom:18px;\">"
      + "<div style=\"font-size:13px;color:#64748b;margin-bottom:6px;\">Pagina pubblica</div>"
      + (v.stato === "pubblicato" && v.pubblico !== false
          ? "<a class=\"av-link\" href=\"" + url + "\" target=\"_blank\">" + escapeHtml(url) + "</a>"
          : "<div style=\"color:#94a3b8;word-break:break-all;\">" + escapeHtml(url) + "</div>"
            + "<div style=\"margin-top:6px;color:#b45309;font-size:13px;\">"
            + "Non ancora online: il link risponde <i>viaggio non trovato</i> finche non premi Pubblica.</div>")
      + "<div style=\"margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;\">"
      + "<button id=\"av-stato\" data-id=\"" + v.id + "\" style=\"background:" + (v.stato === "pubblicato" ? "#fff" : "#16a34a") + ";color:" + (v.stato === "pubblicato" ? "#64748b" : "#fff") + ";border:1px solid " + (v.stato === "pubblicato" ? "#cbd5e1" : "#16a34a") + ";border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer;\">"
      + (v.stato === "pubblicato" ? "Riporta in bozza" : "Pubblica") + "</button>"
      + "</div></div>";

    let fotoMezzi = {};
    if ((mz.data || []).length) {
      const idsM = mz.data.map(function (m) { return m.id; });
      const fm = await supa().from("viaggi_mezzi_foto")
        .select("id,mezzo_id,url,didascalia,ordine").in("mezzo_id", idsM).order("ordine");
      (fm.data || []).forEach(function (f) {
        (fotoMezzi[f.mezzo_id] = fotoMezzi[f.mezzo_id] || []).push(f);
      });

      h += "<h3 style=\"font-size:16px;margin:18px 0 6px;\">Mezzi</h3>" + tabellaApri(["Mezzo", "Modello", "Posti", "Stato", "Foto"]);
      mz.data.forEach(function (m) {
        const gal = fotoMezzi[m.id] || [];
        let cella = "<div style=\"display:flex;gap:4px;flex-wrap:wrap;align-items:center;\">";
        gal.forEach(function (f) {
          cella += "<span style=\"position:relative;display:inline-block;\">"
            + "<img src=\"" + escapeHtml(f.url) + "\" style=\"width:52px;height:38px;object-fit:cover;border-radius:4px;display:block;\">"
            + "<button class=\"av-foto-del\" data-foto=\"" + f.id + "\" title=\"Togli\" style=\"position:absolute;top:-6px;right:-6px;background:#dc2626;color:#fff;border:0;border-radius:50%;width:18px;height:18px;font-size:11px;line-height:1;cursor:pointer;padding:0;\">×</button></span>";
        });
        cella += "<button class=\"av-mezzo-foto\" data-mezzo=\"" + m.id + "\" style=\"background:#fff;border:1px dashed #cbd5e1;border-radius:6px;padding:8px 10px;font-size:11px;color:#64748b;cursor:pointer;\">+ foto</button></div>";

        h += "<tr>" + td("<b>" + escapeHtml(m.nome) + "</b>") + td(escapeHtml(m.modello || ""))
          + td(String(m.posti_max || "")) + td(escapeHtml(m.stato)) + td(cella) + "</tr>";
      });
      h += tabellaChiudi();
    }

    h += "<h3 style=\"font-size:16px;margin:22px 0 6px;\">Programma e pasti</h3>"
      + "<div style=\"font-size:13px;color:#64748b;margin-bottom:8px;\">Senza foto propria la pagina pubblica prende quella di Wikimedia. Carica la tua e vince la tua.</div>"
      + tabellaApri(["Giorno", "Tappa", "Foto", "Km", "Dove si dorme", "Colazione", "Pranzo", "Cena"]);
    tappe.forEach(function (t) {
      const p = perTappa[t.id] || [];
      function pasto(momento) {
        const x = p.find(function (y) { return y.momento === momento; });
        if (!x) return "—";
        const testo = x.locale || x.ricetta_camper || "da decidere";
        const dove = x.dove === "camper" ? "camper" : (x.dove === "fuori" ? "fuori" : "a scelta");
        return "<span style=\"font-size:12px;color:#64748b;\">" + dove + "</span><br>" + escapeHtml(testo)
          + (x.prenotazione_necessaria ? " <span style=\"color:#dc2626;font-size:11px;\">prenotare</span>" : "");
      }
      function dormire(x) {
        if (!x.alloggio_nome) {
          return "<span style=\"color:#b45309;font-size:12px;\">da scegliere</span>";
        }
        let c = "<b>" + escapeHtml(x.alloggio_nome) + "</b>";
        if (x.alloggio_indirizzo) {
          c += "<div style=\"font-size:12px;color:#64748b;\">" + escapeHtml(x.alloggio_indirizzo) + "</div>";
        }
        if (x.alloggio_telefono) {
          c += "<div style=\"font-size:12px;color:#64748b;\">" + escapeHtml(x.alloggio_telefono) + "</div>";
        }
        if (x.alloggio_mappa) {
          c += "<a href=\"" + escapeHtml(x.alloggio_mappa) + "\" target=\"_blank\" rel=\"noopener\" "
            + "style=\"font-size:12px;color:#0E5A7A;\">mappa</a>";
        }
        return c;
      }
      const fermo = t.tipo === "fermi";
      const foto = t.foto_url
        ? "<img src=\"" + escapeHtml(t.foto_url) + "\" style=\"width:64px;height:44px;object-fit:cover;border-radius:4px;display:block;\">"
          + "<button class=\"av-foto\" data-tappa=\"" + t.id + "\" style=\"margin-top:4px;background:none;border:0;color:#0E5A7A;font-size:11px;cursor:pointer;padding:0;text-decoration:underline;\">cambia</button>"
        : "<button class=\"av-foto\" data-tappa=\"" + t.id + "\" style=\"background:#fff;border:1px dashed #cbd5e1;border-radius:6px;padding:6px 10px;font-size:11px;color:#64748b;cursor:pointer;\">carica</button>";

      h += "<tr" + (fermo ? " style=\"background:#f1f5f9;\"" : "") + ">"
        + td("<b>" + t.giorno + "</b><div style=\"font-size:11px;color:#64748b;\">" + data(t.data) + "</div>")
        + td("<b>" + escapeHtml(t.titolo) + "</b><div style=\"font-size:12px;color:#64748b;\">" + escapeHtml(t.stato_usa || "") + "</div>")
        + td(foto)
        + td(Number(t.km) > 0 ? String(t.km) : "—")
        + td(dormire(t))
        + td(pasto("colazione")) + td(pasto("pranzo")) + td(pasto("cena"))
        + "</tr>";
    });
    h += tabellaChiudi();

    if ((bg.data || []).length) {
      let bmin = 0, bmax = 0;
      bg.data.forEach(function (b) { bmin += Number(b.importo_min || 0); bmax += Number(b.importo_max || 0); });
      h += "<h3 style=\"font-size:16px;margin:22px 0 6px;\">Budget</h3>" + tabellaApri(["Voce", "Categoria", "Da", "A"]);
      bg.data.forEach(function (b) {
        h += "<tr>" + td("<b>" + escapeHtml(b.voce) + "</b><div style=\"font-size:12px;color:#64748b;\">" + escapeHtml(b.dettaglio || "") + "</div>")
          + td(escapeHtml(b.categoria || "")) + td(euro(b.importo_min)) + td(euro(b.importo_max)) + "</tr>";
      });
      h += "<tr>" + td("<b>Totale</b>") + td("") + td("<b>" + euro(bmin) + "</b>") + td("<b>" + euro(bmax) + "</b>") + "</tr>";
      h += tabellaChiudi();
    }

    if ((sc.data || []).length) {
      h += "<h3 style=\"font-size:16px;margin:22px 0 6px;\">Scadenze</h3>" + tabellaApri(["Cosa", "Entro", "Fatto"]);
      sc.data.forEach(function (s) {
        h += "<tr>" + td("<b>" + escapeHtml(s.titolo) + "</b><div style=\"font-size:12px;color:#64748b;\">" + escapeHtml(s.descrizione || "") + "</div>")
          + td(data(s.mese_target)) + td(s.completato ? "Sì" : "—") + "</tr>";
      });
      h += tabellaChiudi();
    }

    box.innerHTML = h;
    etichetta(box);

    document.getElementById("av-indietro").addEventListener("click", function () {
      tabAttiva = "catalogo"; disegnaTabs(); renderCatalogo();
    });

    box.querySelectorAll(".av-foto").forEach(function (b) {
      b.addEventListener("click", function () { caricaFotoTappa(b.dataset.tappa, v.id); });
    });

    box.querySelectorAll(".av-mezzo-foto").forEach(function (b) {
      b.addEventListener("click", function () { caricaFotoMezzo(b.dataset.mezzo, v.id); });
    });

    box.querySelectorAll(".av-foto-del").forEach(function (b) {
      b.addEventListener("click", async function () {
        const r = await supa().from("viaggi_mezzi_foto").delete().eq("id", b.dataset.foto);
        if (r.error) { alert(r.error.message); return; }
        apriViaggio(v.id);
      });
    });

    const bStato = document.getElementById("av-stato");
    bStato.addEventListener("click", async function () {
      const nuovo = v.stato === "pubblicato" ? "bozza" : "pubblicato";
      bStato.disabled = true;
      const r = await supa().from("viaggi")
        .update({ stato: nuovo, pubblico: nuovo === "pubblicato", adesioni_aperte: nuovo === "pubblicato" })
        .eq("id", v.id);
      if (r.error) { bStato.disabled = false; alert(r.error.message); return; }
      await caricaViaggi();
      apriViaggio(v.id);
    });

  } catch (e) {
    mostraErrore(e);
  }
}

/* ---------------- ISCRITTI ---------------- */

async function renderIscritti() {
  const box = document.getElementById("av-corpo");
  if (!box) return;
  box.innerHTML = "<div style=\"color:#64748b;\">Caricamento...</div>";

  const r = await supa()
    .from("viaggi_iscrizioni")
    .select("id,viaggio_id,referente_nome,nucleo_familiare,n_adulti,n_bambini,quota_totale,stato,modalita_pagamento,chi_paga,cadenza_mesi,tipo_posto")
    .eq("azienda_id", aziendaId())
    .order("creato_il", { ascending: false });
  if (r.error) throw r.error;

  const iscr = r.data || [];
  const barra = "<div style=\"margin-bottom:14px;\"><button id=\"av-nuova-iscr\" style=\"background:#fff;color:#0E5A7A;border:1px solid #0E5A7A;border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer;\">➕ Nuova iscrizione</button></div>";

  if (!iscr.length) {
    box.innerHTML = barra + vuoto("Nessuna iscrizione. Le adesioni dalla pagina pubblica arrivano qui, oppure la aggiungi a mano.");
    aggancioNuovaIscrizione();
    return;
  }

  const s = await supa()
    .from("vw_viaggi_saldi")
    .select("iscrizione_id,versato,residuo,prossima_scadenza,prossimo_importo")
    .eq("azienda_id", aziendaId());

  const saldi = {};
  (s.data || []).forEach(function (x) { saldi[x.iscrizione_id] = x; });

  let html = barra + tabellaApri(["Nucleo", "Persone", "Formula", "Come paga", "Quota", "Versato", "Residuo", "Prossima"]);

  iscr.forEach(function (i) {
    const sa = saldi[i.id] || {};
    const persone = (i.n_adulti || 0) + (i.n_bambini || 0);
    const come = (MODALITA_LABEL[i.modalita_pagamento] || i.modalita_pagamento)
      + (i.chi_paga === "pro_capite" ? " · ognuno la sua" : " · un pagatore")
      + (i.modalita_pagamento === "rate_mensili" ? " · ogni " + i.cadenza_mesi + (i.cadenza_mesi === 1 ? " mese" : " mesi") : "");

    html += "<tr>"
      + td("<b>" + escapeHtml(i.nucleo_familiare || i.referente_nome) + "</b><div style=\"color:#64748b;font-size:12px;\">" + escapeHtml(i.referente_nome) + "</div>")
      + td(String(persone))
      + td("<span style=\"font-size:12px;\">" + (i.tipo_posto === "posto_condiviso" ? "Posto condiviso" : "Camper intero") + "</span>")
      + td("<span style=\"font-size:12px;\">" + escapeHtml(come) + "</span>")
      + td(euro(i.quota_totale))
      + td(euro(sa.versato))
      + td("<b>" + euro(sa.residuo) + "</b>")
      + td(sa.prossima_scadenza ? data(sa.prossima_scadenza) + "<div style=\"color:#64748b;font-size:12px;\">" + euro(sa.prossimo_importo) + "</div>" : "—")
      + "</tr>";
  });

  box.innerHTML = html + tabellaChiudi();
  etichetta(box);
  aggancioNuovaIscrizione();
}

function aggancioNuovaIscrizione() {
  const b = document.getElementById("av-nuova-iscr");
  if (b) b.addEventListener("click", formNuovaIscrizione);
}

/* ---------------- INCASSI ---------------- */


// Cosa c'e da comprare per i clienti che hanno pagato: volo, hotel, auto,
// ingressi. Ogni riga ha il link gia pronto e si spunta quando e comprata.
// In cima il margine vero: incassato meno speso davvero.
async function renderAcquisti() {
  const box = document.getElementById("av-corpo");
  if (!box) return;
  box.innerHTML = '<div style="padding:30px;text-align:center;color:#64748b;">Carico...</div>';

  const r = await supa().from("viaggi_acquisti")
    .select("*, viaggi_iscrizioni(referente_nome,referente_email,quota_totale), viaggi(titolo,data_inizio)")
    .eq("azienda_id", aziendaId())
    .order("stato", { ascending: true })
    .order("entro", { ascending: true });
  if (r.error) throw r.error;

  const righe = r.data || [];
  if (!righe.length) {
    box.innerHTML = '<div style="border:2px dashed #cbd5e1;border-radius:12px;padding:36px;text-align:center;color:#64748b;">'
      + "Niente da comprare.<br><span style=\"font-size:13px;\">"
      + "La lista nasce da sola quando un cliente paga la prima rata.</span></div>";
    return;
  }

  let previsto = 0, reale = 0, aperte = 0, incassato = 0;
  const viste = {};
  righe.forEach(function (x) {
    previsto += Number(x.costo_previsto || 0);
    reale += Number(x.costo_reale || 0);
    if (x.stato === "da_comprare") aperte += 1;
    // la quota si conta una volta per iscrizione, non per riga
    if (!viste[x.iscrizione_id]) {
      viste[x.iscrizione_id] = true;
      incassato += Number((x.viaggi_iscrizioni || {}).quota_totale || 0);
    }
  });
  const speso = reale > 0 ? reale : previsto;

  let h = '<div class="av-num" style="margin-bottom:16px;">'
    + "<div><b>" + euro(incassato) + "</b><span>Incassato</span></div>"
    + "<div><b>" + euro(previsto) + "</b><span>Da spendere</span></div>"
    + "<div><b>" + euro(reale) + "</b><span>Speso davvero</span></div>"
    + '<div><b style="color:' + (incassato - speso >= 0 ? "#16a34a" : "#b91c1c") + ';">'
    + euro(incassato - speso) + "</b><span>Margine</span></div>"
    + "<div><b>" + aperte + "</b><span>Da comprare</span></div>"
    + "</div>";

  if (incassato - speso < 0) {
    h += '<div style="border:1px solid #fca5a5;background:#fef2f2;border-radius:10px;padding:12px 14px;margin-bottom:14px;color:#991b1b;">'
      + "<b>Attenzione: si spende piu di quanto si incassa.</b>"
      + '<div style="font-size:13px;margin-top:4px;">Controlla il listino: il prezzo deve coprire tutte le voci qui sotto.</div>'
      + "</div>";
  }

  const oggi = new Date().toISOString().slice(0, 10);
  const ICONE = { volo: "\u2708\uFE0F", hotel: "\uD83C\uDFE8", auto: "\uD83D\uDE97",
                  trasferimento: "\uD83D\uDE8C", ingresso: "\uD83C\uDFAB", extra: "\u2795" };

  righe.forEach(function (x) {
    const comprato = x.stato === "comprato";
    const scaduta = !comprato && x.entro && x.entro < oggi;
    const isc = x.viaggi_iscrizioni || {};
    const via = x.viaggi || {};

    h += '<div style="border:1px solid ' + (scaduta ? "#fca5a5" : "#e2e8f0")
      + ';border-radius:12px;padding:14px;margin-bottom:10px;background:'
      + (comprato ? "#f0fdf4" : scaduta ? "#fef2f2" : "#fff") + ';">';

    h += '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">'
      + "<div style=\"flex:1;min-width:200px;\">"
      + '<div style="font-size:12px;color:#64748b;">' + escapeHtml(via.titolo || "")
      + " · " + escapeHtml(isc.referente_nome || "") + "</div>"
      + "<b>" + (ICONE[x.tipo] || "") + " " + escapeHtml(x.descrizione) + "</b>"
      + (x.note ? '<div style="font-size:13px;color:#64748b;margin-top:3px;">' + escapeHtml(x.note) + "</div>" : "")
      + "</div>"
      + '<div style="text-align:right;">'
      + "<div><b>" + euro(x.costo_previsto) + "</b></div>"
      + (Number(x.costo_reale) > 0
          ? '<div style="font-size:13px;color:#16a34a;">pagato ' + euro(x.costo_reale) + "</div>" : "")
      + (x.entro ? '<div style="font-size:12px;color:' + (scaduta ? "#b91c1c" : "#64748b") + ';">'
          + (scaduta ? "scaduta il " : "entro il ") + data(x.entro) + "</div>" : "")
      + "</div></div>";

    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center;">';
    if (x.link) {
      h += '<a href="' + escapeHtml(x.link) + '" target="_blank" rel="noopener" '
        + 'style="background:#0E5A7A;color:#fff;text-decoration:none;border-radius:8px;padding:8px 14px;font-weight:700;font-size:14px;">Vai a comprare</a>';
    }
    if (!comprato) {
      h += '<button class="acq-ok" data-id="' + x.id + '" data-prev="' + Number(x.costo_previsto || 0) + '" '
        + 'style="background:#fff;color:#16a34a;border:2px solid #16a34a;border-radius:8px;'
        + 'padding:7px 13px;font-weight:700;cursor:pointer;font-size:14px;">Segna comprato</button>'
        + '<button class="acq-no" data-id="' + x.id + '" '
        + 'style="background:#fff;color:#64748b;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:14px;">Non serve</button>';
    } else {
      h += '<span style="background:#16a34a;color:#fff;border-radius:8px;padding:7px 13px;'
        + 'font-weight:700;font-size:14px;">\u2713 Comprato'
        + (x.riferimento ? " · " + escapeHtml(x.riferimento) : "") + "</span>"
        + '<button class="acq-annulla" data-id="' + x.id + '" '
        + 'style="background:#fff;color:#64748b;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:13px;">Annulla</button>';
    }
    h += "</div></div>";
  });

  box.innerHTML = h;

  document.querySelectorAll(".acq-ok").forEach(function (b) {
    b.addEventListener("click", async function () {
      const speso = prompt("Quanto hai pagato davvero?", b.dataset.prev);
      if (speso === null) return;
      const rif = prompt("Codice di prenotazione (facoltativo)") || null;
      const u = await supa().from("viaggi_acquisti").update({
        stato: "comprato", costo_reale: Number(speso) || 0,
        riferimento: rif, comprato_il: new Date().toISOString()
      }).eq("id", b.dataset.id);
      if (u.error) return alert("Non salvato: " + u.error.message);
      await renderAcquisti();
    });
  });

  document.querySelectorAll(".acq-no").forEach(function (b) {
    b.addEventListener("click", async function () {
      if (!confirm("Segno che questa voce non serve?")) return;
      await supa().from("viaggi_acquisti").update({ stato: "non_serve" }).eq("id", b.dataset.id);
      await renderAcquisti();
    });
  });

  document.querySelectorAll(".acq-annulla").forEach(function (b) {
    b.addEventListener("click", async function () {
      await supa().from("viaggi_acquisti").update({
        stato: "da_comprare", costo_reale: null, riferimento: null, comprato_il: null
      }).eq("id", b.dataset.id);
      await renderAcquisti();
    });
  });
}

async function renderIncassi() {
  const box = document.getElementById("av-corpo");
  if (!box) return;
  box.innerHTML = "<div style=\"color:#64748b;\">Caricamento...</div>";

  const oggi = new Date().toISOString().slice(0, 10);

  const s = await supa()
    .from("vw_viaggi_saldi")
    .select("quota_totale,versato,residuo")
    .eq("azienda_id", aziendaId());
  if (s.error) throw s.error;

  let quote = 0, versato = 0;
  (s.data || []).forEach(function (x) {
    quote += Number(x.quota_totale || 0);
    versato += Number(x.versato || 0);
  });

  const sc = await supa()
    .from("viaggi_rate")
    .select("id,tipo,importo,scadenza,stato")
    .eq("azienda_id", aziendaId())
    .eq("stato", "attesa")
    .lt("scadenza", oggi)
    .order("scadenza", { ascending: true });

  const scadute = sc.data || [];
  let arretrato = 0;
  scadute.forEach(function (r) { arretrato += Number(r.importo || 0); });

  let html = "<div class=\"av-num\">"
    + card("Quote totali", euro(quote), "#0E5A7A")
    + card("Incassato", euro(versato), "#16a34a")
    + card("Da incassare", euro(quote - versato), "#64748b")
    + card("Arretrato", euro(arretrato), arretrato > 0 ? "#dc2626" : "#64748b")
    + "</div>";

  if (!scadute.length) {
    html += "<div style=\"color:#64748b;\">Nessuna rata scaduta.</div>";
  } else {
    html += "<h2 style=\"font-size:16px;margin:0 0 8px;\">Rate scadute</h2>" + tabellaApri(["Scadenza", "Tipo", "Importo"]);
    scadute.forEach(function (r) {
      html += "<tr>" + td(data(r.scadenza)) + td(escapeHtml(r.tipo)) + td(euro(r.importo)) + "</tr>";
    });
    html += tabellaChiudi();
  }

  box.innerHTML = html;
  etichetta(box);
}

/* ---------------- FOTO DELLE TAPPE ---------------- */

// Carica su Storage (bucket viaggi-foto) e scrive l'indirizzo in viaggi_tappe.foto_url.
function caricaFotoTappa(tappaId, viaggioId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";

  input.addEventListener("change", async function () {
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("La foto supera i 10 MB."); return; }

    const box = document.getElementById("av-corpo");
    if (box) box.insertAdjacentHTML("afterbegin", "<div id=\"av-upl\" style=\"color:#64748b;margin-bottom:8px;\">Carico la foto...</div>");

    const est = (file.name.split(".").pop() || "jpg").toLowerCase();
    const percorso = aziendaId() + "/" + viaggioId + "/" + tappaId + "-" + Date.now() + "." + est;

    const up = await supa().storage.from("viaggi-foto").upload(percorso, file, { upsert: true });
    if (up.error) { alert(up.error.message); const e = document.getElementById("av-upl"); if (e) e.remove(); return; }

    const pub = supa().storage.from("viaggi-foto").getPublicUrl(percorso);
    const url = pub && pub.data ? pub.data.publicUrl : null;
    if (!url) { alert("Caricata, ma non riesco a ricavare l'indirizzo pubblico."); return; }

    const r = await supa().from("viaggi_tappe").update({ foto_url: url }).eq("id", tappaId);
    if (r.error) { alert(r.error.message); return; }

    apriViaggio(viaggioId);
  });

  input.click();
}

// Piu foto per mezzo: finiscono nella slide della pagina pubblica.
function caricaFotoMezzo(mezzoId, viaggioId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";
  input.multiple = true;

  input.addEventListener("change", async function () {
    const files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;

    const box = document.getElementById("av-corpo");
    if (box) box.insertAdjacentHTML("afterbegin", "<div style=\"color:#64748b;margin-bottom:8px;\">Carico " + files.length + " foto...</div>");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) { alert(file.name + " supera i 10 MB, saltata."); continue; }

      const est = (file.name.split(".").pop() || "jpg").toLowerCase();
      const percorso = aziendaId() + "/" + viaggioId + "/mezzi/" + mezzoId + "-" + Date.now() + "-" + i + "." + est;

      const up = await supa().storage.from("viaggi-foto").upload(percorso, file, { upsert: true });
      if (up.error) { alert(up.error.message); continue; }

      const pub = supa().storage.from("viaggi-foto").getPublicUrl(percorso);
      const url = pub && pub.data ? pub.data.publicUrl : null;
      if (!url) continue;

      const r = await supa().from("viaggi_mezzi_foto").insert({
        mezzo_id: mezzoId, azienda_id: aziendaId(), url: url, ordine: i
      });
      if (r.error) alert(r.error.message);
    }

    apriViaggio(viaggioId);
  });

  input.click();
}

/* ---------------- utilita ---------------- */

function campo(id, etichetta, tipo, placeholder) {
  return "<label style=\"font-size:12px;color:#64748b;display:block;margin-top:10px;\">" + escapeHtml(etichetta) + "</label>"
    + "<input id=\"" + id + "\" type=\"" + tipo + "\" placeholder=\"" + escapeHtml(placeholder || "") + "\""
    + " style=\"width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;\">";
}

function val(id) {
  const el = document.getElementById(id);
  return el ? String(el.value || "") : "";
}

function rosso(t) { return "<span style=\"color:#dc2626;\">" + escapeHtml(t) + "</span>"; }

function card(titolo, valore, colore) {
  return "<div><b style=\"color:" + colore + ";\">" + valore + "</b><span>" + escapeHtml(titolo) + "</span></div>";
}

/* ---------------- OCCASIONI ---------------- */

async function renderOccasioni() {
  const box = document.getElementById("av-corpo");
  if (!box) return;
  box.innerHTML = '<div style="color:#64748b;">Carico le occasioni...</div>';

  const [occ, rotte] = await Promise.all([
    supa().from("viaggi_occasioni")
      .select("*, viaggi_rotte(nome,origine_iata,destinazione_iata,modello_viaggio_id)")
      .eq("azienda_id", aziendaId())
      .in("stato", ["nuova", "vista", "pubblicata"])
      .order("trovata_il", { ascending: false })
      .limit(60),
    supa().from("viaggi_rotte").select("*").eq("azienda_id", aziendaId()).order("nome")
  ]);

  if (occ.error) throw occ.error;
  if (rotte.error) throw rotte.error;

  const lista = occ.data || [];
  const nuove = lista.filter(function (o) { return o.stato === "nuova"; });

  let h = '<div class="av-num">'
    + "<div><b>" + nuove.length + "</b><span>Nuove</span></div>"
    + "<div><b>" + (rotte.data || []).filter(function (r) { return r.attiva; }).length + "</b><span>Rotte sorvegliate</span></div>"
    + "</div>";

  // I menu si riempiono dalle rotte: aggiungendo una rotta nuova compaiono da soli.
  const elenco = function (campo) {
    const v = [];
    (rotte.data || []).forEach(function (r) {
      if (r[campo] && v.indexOf(r[campo]) === -1) v.push(r[campo]);
    });
    return v.sort();
  };
  const TIPI = {
    volo_hotel: "Volo e hotel", volo_auto: "Volo e auto", crociera: "Crociera",
    camper: "Camper", gruppo: "Gruppo", tour: "Tour organizzato"
  };

  const menu = function (id, vuoto, valori, etichette) {
    return '<select id="' + id + '" class="occ-f" style="border:1px solid #cbd5e1;border-radius:8px;'
      + 'padding:10px 12px;font-weight:600;">'
      + '<option value="">' + vuoto + "</option>"
      + valori.map(function (v) {
          return '<option value="' + escapeHtml(v) + '">'
            + escapeHtml(etichette ? (etichette[v] || v) : v) + "</option>";
        }).join("")
      + "</select>";
  };

  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center;">'
    + menu("occ-continente", "Tutti i continenti", elenco("continente"))
    + menu("occ-nazione", "Tutte le nazioni", elenco("nazione"))
    + menu("occ-tipo", "Tutti i tipi", elenco("tipo"), TIPI)
    + '<button id="occ-cerca" style="background:#0E5A7A;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer;">🔎 Cerca adesso</button>'
    + '<button id="occ-rotte" style="background:#fff;color:#0E5A7A;border:1px solid #0E5A7A;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer;">Rotte</button>'
    + '<button id="occ-nuova" style="background:#fff;color:#0E5A7A;border:1px dashed #0E5A7A;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer;">+ Destinazione</button>'
    + "</div>";

  // Il continente restringe le nazioni: si tiene la lista completa per rifiltrarla.
  window.__rotteViaggi = rotte.data || [];

  if (!lista.length) {
    h += '<div style="border:1px dashed #cbd5e1;border-radius:10px;padding:28px;text-align:center;color:#64748b;">'
      + "Nessuna occasione ancora. La ricerca gira ogni notte alle 4:20, "
      + "oppure si lancia a mano con il pulsante qui sopra.</div>";
    box.innerHTML = h;
    agganciaOccasioni();
    return;
  }

  h += tabellaApri(["Rotta", "Partenza", "Volo a persona", "Dove si dorme", "Auto", "Costo vivo a persona", "Prezzo suggerito", ""]);

  lista.forEach(function (o) {
    const r = o.viaggi_rotte || {};
    const nuova = o.stato === "nuova";
    h += "<tr" + (nuova ? ' style="background:#f0fdf4;"' : "") + ">"
      // Tutto dentro un contenitore solo: su telefono la cella diventa flessibile
      // e i pezzi separati finivano affiancati come colonne strette.
      + '<td><div><b>' + escapeHtml(r.nome || "—") + "</b>"
      + (function () {
          const d = o.dettaglio || {};
          const parti = [];
          if (o.origine_iata) parti.push("da " + escapeHtml(d.partenza_da || o.origine_iata));
          if (d.nazione) parti.push(escapeHtml(d.nazione));
          if (d.tipo && TIPI[d.tipo]) parti.push(escapeHtml(TIPI[d.tipo]));
          return parti.length
            ? '<div style="color:#64748b;font-size:12px;">' + parti.join(" · ") + "</div>"
            : "";
        })()
      + '<div style="color:#64748b;font-size:12px;">' + escapeHtml(o.vettore || "")
      + " · " + (o.notti || 0) + " notti</div></div></td>"
      + "<td>" + data(o.data_partenza) + '<div style="color:#64748b;font-size:12px;">'
      + data(o.data_rientro) + "</div></td>"
      + "<td>" + euro(o.volo_prezzo) + "</td>"
      // Dal motore v9 arriva il nome dell albergo: senza, restava solo un importo
      // e non si sapeva dove si dormiva.
      + "<td>" + (function () {
          const d = o.dettaglio || {};
          let c = "";
          if (d.hotel_nome) {
            c += "<b>" + escapeHtml(d.hotel_nome) + "</b>";
            const sotto = [];
            if (d.hotel_zona) sotto.push(escapeHtml(d.hotel_zona));
            if (d.hotel_stelle) sotto.push(d.hotel_stelle + "\u2605");
            if (d.hotel_a_notte) sotto.push(euro(d.hotel_a_notte) + " a notte");
            if (sotto.length) {
              c += '<div style="color:#64748b;font-size:12px;">' + sotto.join(" \u00B7 ") + "</div>";
            }
            if (d.hotel_link) {
              c += '<a href="' + escapeHtml(d.hotel_link) + '" target="_blank" rel="noopener" '
                + 'style="color:#0E5A7A;font-size:12px;">apri</a> ';
            }
            c += '<div style="color:#64748b;font-size:12px;">'
              + euro(o.alloggio_prezzo) + " camera intera</div>";
          } else {
            c = euro(o.alloggio_prezzo)
              + '<div style="color:#b45309;font-size:12px;">albergo non indicato</div>';
          }
          return c;
        })() + "</td>"
      + "<td>" + (function () {
          const d = o.dettaglio || {};
          if (!o.auto_prezzo) return '<span style="color:#94a3b8;">\u2014</span>';
          return euro(o.auto_prezzo)
            + (d.auto_a_giorno
                ? '<div style="color:#64748b;font-size:12px;">' + euro(d.auto_a_giorno) + " al giorno</div>"
                : "");
        })() + "</td>"
      + "<td><b>" + euro(o.costo_vivo) + "</b></td>"
      + '<td><b style="color:#16a34a;">' + euro(o.prezzo_suggerito) + "</b>"
      + '<div style="color:#64748b;font-size:12px;">+' + Math.round(Number(o.margine_perc || 0)) + "%</div></td>"
      + '<td style="white-space:nowrap;">'
      + (o.stato === "pubblicata"
          ? '<span style="color:#16a34a;font-weight:700;">Pubblicata</span>'
          : '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">'
            + '<button class="occ-prev" data-id="' + o.id + '" style="background:#fff;color:#0E5A7A;border:1px solid #0E5A7A;border-radius:6px;padding:7px 11px;font-weight:700;cursor:pointer;white-space:nowrap;font-size:14px;">'
            + (o.bozza ? "Rivedi" : "Anteprima") + "</button>"
            + '<button class="occ-vetr" data-id="' + o.id + '" data-prezzo="' + Number(o.prezzo_suggerito || 0)
            + '" style="background:' + (o.in_vetrina ? "#0E5A7A" : "#fff") + ";color:"
            + (o.in_vetrina ? "#fff" : "#0E5A7A") + ';border:1px solid #0E5A7A;border-radius:6px;padding:7px 11px;font-weight:700;cursor:pointer;white-space:nowrap;font-size:14px;">'
            + (o.in_vetrina ? "✓ In vetrina" : "Vetrina") + "</button>"
            + '<button class="occ-no" data-id="' + o.id + '" style="background:#fff;color:#991b1b;border:1px solid #fca5a5;border-radius:6px;padding:7px 10px;cursor:pointer;white-space:nowrap;font-size:14px;">Scarta</button>'
            + "</div>")
      + "</td></tr>";
  });

  h += tabellaChiudi();
  box.innerHTML = h;
  etichetta(box);          // senza questa, su telefono restano numeri senza nome
  agganciaOccasioni();
}

function agganciaOccasioni() {
  const bCerca = document.getElementById("occ-cerca");
  if (bCerca) bCerca.addEventListener("click", async function () {
    bCerca.disabled = true;
    bCerca.textContent = "Sto cercando...";
    try {
      const leggi = function (id) {
        const e = document.getElementById(id);
        return e && e.value ? e.value : null;
      };
      const filtri = {};
      if (leggi("occ-continente")) filtri.continente = leggi("occ-continente");
      if (leggi("occ-nazione")) filtri.nazione = leggi("occ-nazione");
      if (leggi("occ-tipo")) filtri.tipo = leggi("occ-tipo");
      const r = await supa().functions.invoke("viaggi-cerca-occasioni", { body: filtri });
      const d = r.data || {};
      if (d.ok === false) {
        // l'errore vero, non un generico "0 trovate"
        alert("La ricerca non e partita.\n\n" + (d.errore || "errore sconosciuto"));
      } else {
        let msg = "Trovate " + (d.occasioni_nuove || 0) + " occasioni su "
                + (d.rotte || 0) + " rotte (" + (d.filtri || "tutte") + ").";
        if (d.nota) msg = d.nota;
        if ((d.sopra_soglia || []).length) {
          msg += "\n\nScartate perche sopra soglia:\n" + d.sopra_soglia.slice(0, 6).join("\n");
        }
        if ((d.errori || []).length) msg += "\n\nProblemi:\n" + d.errori.join("\n");
        alert(msg);
      }
      await renderOccasioni();
    } catch (e) {
      alert("Errore: " + (e.message || e));
    } finally {
      bCerca.disabled = false;
      bCerca.textContent = "🔎 Cerca adesso";
    }
  });

  const selCont = document.getElementById("occ-continente");
  const selNaz = document.getElementById("occ-nazione");
  if (selCont && selNaz) selCont.addEventListener("change", function () {
    const tutte = window.__rotteViaggi || [];
    const naz = [];
    tutte.forEach(function (r) {
      if (selCont.value && r.continente !== selCont.value) return;
      if (r.nazione && naz.indexOf(r.nazione) === -1) naz.push(r.nazione);
    });
    naz.sort();
    selNaz.innerHTML = '<option value="">Tutte le nazioni</option>'
      + naz.map(function (n) { return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + "</option>"; }).join("");
  });

  const bRotte = document.getElementById("occ-rotte");
  if (bRotte) bRotte.addEventListener("click", renderRotte);

  const bNuova = document.getElementById("occ-nuova");
  if (bNuova) bNuova.addEventListener("click", nuovaDestinazione);

  document.querySelectorAll(".occ-no").forEach(function (b) {
    b.addEventListener("click", async function () {
      await supa().from("viaggi_occasioni").update({ stato: "scartata" }).eq("id", b.dataset.id);
      await renderOccasioni();
    });
  });

  document.querySelectorAll(".occ-prev").forEach(function (b) {
    b.addEventListener("click", function () { anteprimaOccasione(b.dataset.id); });
  });

  // La vetrina e' quello che vedono i clienti: il prezzo lo decide Antonio,
  // non il suggerimento della funzione.
  document.querySelectorAll(".occ-vetr").forEach(function (b) {
    b.addEventListener("click", async function () {
      const dentro = b.textContent.indexOf("✓") === -1;
      let prezzo = null;
      let titolo = null;

      if (dentro) {
        const p = prompt("A che prezzo la vendi?\nA persona, in euro.", b.dataset.prezzo || "");
        if (p === null) return;
        prezzo = Number(p);
        if (!(prezzo > 0)) return alert("Serve un prezzo valido.");
        titolo = prompt("Come si chiama in vetrina?\nLascia vuoto per usare il titolo dell'itinerario.") || null;
      } else {
        if (!confirm("La tolgo dalla vetrina pubblica?")) return;
      }

      const r = await supa().rpc("occasione_vetrina", {
        p_occasione: b.dataset.id, p_dentro: dentro,
        p_prezzo: prezzo, p_titolo: titolo
      });
      if (r.error) return alert("Non salvato: " + r.error.message);
      const d = r.data || {};
      if (d.ok === false) return alert(d.errore || "Non salvato.");

      if (dentro) {
        alert("In vetrina a " + euro(d.prezzo) + ".\n\n"
          + "La vedi su app.ristoflow-ai.com/viaggi/offerte/");
      }
      await renderOccasioni();
    });
  });
}

// Anteprima dell'itinerario: si genera con Claude, si legge, e solo dopo si pubblica.
// Il viaggio non esiste finche' non si preme il pulsante verde in fondo.
async function anteprimaOccasione(id) {
  const box = document.getElementById("av-corpo");
  if (!box) return;

  const r = await supa().from("viaggi_occasioni")
    .select("*, viaggi_rotte(nome,origine_iata,destinazione_iata,zona,destinazione_nome,nazione)").eq("id", id).single();
  if (r.error) return alert("Non trovo l'occasione: " + r.error.message);
  const o = r.data;
  const rotta = o.viaggi_rotte || {};

  if (!o.bozza) {
    box.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">'
      + "Sto costruendo l'itinerario per " + escapeHtml(rotta.nome || "") + ".<br>"
      + '<span style="font-size:13px;">Cerco hotel e ristoranti veri: ci vuole un minuto.</span></div>';
    try {
      const g = await supa().functions.invoke("viaggi-bozza-itinerario", { body: { occasione_id: id } });
      const d = g.data || {};
      if (d.ok === false || !d.bozza) {
        // L'errore va detto per intero: il caso piu frequente e' il credito finito,
        // e prima si vedeva solo un itinerario "Senza titolo" che non si pubblicava.
        const testo = String(d.errore || "errore sconosciuto");
        const credito = testo.indexOf("credit balance") !== -1;
        box.innerHTML = '<div style="border:1px solid #fca5a5;background:#fef2f2;border-radius:12px;padding:20px;color:#991b1b;">'
          + "<b>L'itinerario non e stato creato.</b>"
          + (credito
              ? '<p style="margin:10px 0;">Il credito Anthropic e finito: la ricerca non puo girare.<br>'
                + 'Ricaricalo su <a href="https://console.anthropic.com/settings/billing" target="_blank" '
                + 'style="color:#991b1b;font-weight:700;">console.anthropic.com</a>, poi riprova.</p>'
              : '<p style="margin:10px 0;font-size:14px;">' + escapeHtml(testo.slice(0, 300)) + "</p>")
          + '<button id="ant-torna" style="background:#fff;color:#0E5A7A;border:1px solid #0E5A7A;'
          + 'border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer;">← Torna alle occasioni</button>'
          + "</div>";
        const bt = document.getElementById("ant-torna");
        if (bt) bt.addEventListener("click", renderOccasioni);
        return;
      }
      o.bozza = d.bozza;
    } catch (e) {
      box.innerHTML = '<div style="padding:30px;color:#991b1b;">Errore: ' + escapeHtml(e.message || String(e)) + "</div>";
      return;
    }
  }

  const b = o.bozza || {};
  const tappe = b.tappe || [];
  const pronta = tappe.length > 0 && b.titolo;

  let h = '<div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">'
    + '<button id="ant-indietro" style="background:#fff;color:#0E5A7A;border:1px solid #0E5A7A;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;">← Occasioni</button>'
    + '<button id="ant-rifai" style="background:#fff;color:#64748b;border:1px solid #cbd5e1;border-radius:8px;padding:8px 14px;cursor:pointer;">Rifai l\'itinerario</button>'
    + "</div>";

  h += '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:18px;background:#fff;margin-bottom:16px;">'
    + '<div style="color:#64748b;font-size:13px;letter-spacing:.06em;text-transform:uppercase;">'
    + escapeHtml(rotta.nome || "") + " · " + data(o.data_partenza) + " → " + data(o.data_rientro) + "</div>"
    + '<h2 style="margin:6px 0 2px;font-size:26px;">' + escapeHtml(b.titolo || "Senza titolo") + "</h2>"
    + '<div style="color:#64748b;">' + escapeHtml(b.sottotitolo || "") + "</div>"
    + '<p style="margin:12px 0 0;">' + escapeHtml(b.descrizione || "") + "</p>"
    + "</div>";

  h += '<div class="av-num" style="margin-bottom:16px;">'
    + "<div><b>" + euro(o.costo_vivo) + "</b><span>Costo vivo</span></div>"
    + "<div><b>" + euro(o.prezzo_suggerito) + "</b><span>Suggerito</span></div>"
    + "<div><b>" + euro(Number(o.prezzo_suggerito || 0) - Number(o.costo_vivo || 0)) + "</b><span>Margine a persona</span></div>"
    + "<div><b>" + tappe.length + "</b><span>Giorni</span></div>"
    + "</div>";

  tappe.forEach(function (t) {
    const pasti = t.pasti || [];
    h += '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#fff;margin-bottom:10px;">'
      + '<div style="display:flex;gap:12px;align-items:baseline;">'
      + '<div style="font-size:22px;font-weight:800;color:#0E5A7A;min-width:34px;">' + (t.giorno || "") + "</div>"
      + "<div style=\"flex:1;\"><b style=\"font-size:17px;\">" + escapeHtml(t.titolo || "") + "</b>"
      + '<div style="color:#64748b;font-size:13px;">' + escapeHtml(t.citta || "")
      + (Number(t.km) > 0 ? " · " + t.km + " km" : "") + "</div></div></div>"
      + '<p style="margin:10px 0 0;color:#334155;">' + escapeHtml(t.descrizione || "") + "</p>";

    if (t.alloggio) {
      h += '<div style="margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;border-left:4px solid #0E5A7A;">'
        + "<b>Dove si dorme:</b> " + escapeHtml(t.alloggio)
        + (t.alloggio_indirizzo ? '<div style="color:#64748b;font-size:13px;">' + escapeHtml(t.alloggio_indirizzo) + "</div>" : "")
        + (t.alloggio_note ? '<div style="color:#64748b;font-size:13px;">' + escapeHtml(t.alloggio_note) + "</div>" : "")
        + "</div>";
    }

    pasti.forEach(function (p) {
      h += '<div style="margin-top:8px;padding:10px;background:#fffdf7;border-radius:8px;border-left:4px solid #d97706;">'
        + '<span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">'
        + escapeHtml(p.momento || "") + "</span> "
        + "<b>" + escapeHtml(p.locale || "da decidere") + "</b>"
        + (p.piatto ? '<div style="font-size:14px;">' + escapeHtml(p.piatto) + "</div>" : "")
        + (p.note ? '<div style="color:#64748b;font-size:12px;">' + escapeHtml(p.note) + "</div>" : "")
        + (p.spesa ? '<div style="color:#64748b;font-size:12px;">circa ' + euro(p.spesa) + " a testa</div>" : "")
        + "</div>";
    });

    h += "</div>";
  });

  h += '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:18px;background:#fff;margin-top:16px;">'
    + '<label style="display:block;font-weight:700;margin-bottom:6px;">Prezzo di vendita a persona</label>'
    + '<input id="ant-prezzo" type="number" value="' + Math.round(Number(o.prezzo_suggerito || 0)) + '" '
    + 'style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;font-size:18px;width:160px;">'
    + '<div style="color:#64748b;font-size:13px;margin:6px 0 14px;">Costo vivo ' + euro(o.costo_vivo)
    + ". Quello che metti sopra e il tuo margine.</div>"
    + (pronta
        ? '<button id="ant-pubblica" style="background:#16a34a;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-weight:700;font-size:16px;cursor:pointer;">Pubblica questo viaggio</button>'
          + '<div style="color:#64748b;font-size:12px;margin-top:8px;">Nasce in bozza e non pubblico: si rilegge nel Catalogo prima di mandarlo online.</div>'
        : '<div style="color:#b45309;font-weight:700;">Itinerario incompleto: premi Rifai prima di pubblicare.</div>')
    + "</div>";

  box.innerHTML = h;

  const bi = document.getElementById("ant-indietro");
  if (bi) bi.addEventListener("click", renderOccasioni);

  const br = document.getElementById("ant-rifai");
  if (br) br.addEventListener("click", async function () {
    if (!confirm("Rifaccio l'itinerario da capo?")) return;
    br.disabled = true;
    br.textContent = "Rifaccio...";
    await supa().functions.invoke("viaggi-bozza-itinerario", { body: { occasione_id: id, rifai: true } });
    await anteprimaOccasione(id);
  });

  const bp = document.getElementById("ant-pubblica");
  if (bp) bp.addEventListener("click", async function () {
    const campo = document.getElementById("ant-prezzo");
    const p = Number(campo ? campo.value : 0);
    if (!(p > 0)) return alert("Metti un prezzo valido.");

    bp.disabled = true;
    bp.textContent = "Pubblico...";
    const res = await supa().rpc("occasione_pubblica", { p_occasione: id, p_prezzo: p });
    if (res.error) {
      bp.disabled = false;
      bp.textContent = "Pubblica questo viaggio";
      return alert("Non pubblicato: " + res.error.message);
    }
    const d = res.data || {};
    if (d.ok === false) {
      bp.disabled = false;
      bp.textContent = "Pubblica questo viaggio";
      return alert(d.errore || "Non pubblicato.");
    }
    alert("Fatto: " + d.tappe + " giornate e " + d.pasti + " pasti.\n\n"
      + "Il viaggio e nel Catalogo in bozza. Controllalo e poi mettilo pubblico.");
    await renderOccasioni();
  });
}


// Aggiungere una destinazione qualsiasi senza toccare il database: basta il
// nome, il resto ha valori sensati e si corregge dopo dalla schermata Rotte.
async function nuovaDestinazione() {
  const dove = prompt("Dove si va?\n\nEsempi: Maldive, Tokyo, Safari in Kenya, Crociera Baltico");
  if (!dove || !dove.trim()) return;

  const TIPI_SCELTA = "1 = volo e hotel\n2 = volo e auto\n3 = crociera\n4 = camper\n5 = tour di gruppo";
  const n = prompt("Che tipo di viaggio?\n\n" + TIPI_SCELTA, "1");
  if (n === null) return;
  const tipo = { "1": "volo_hotel", "2": "volo_auto", "3": "crociera",
                 "4": "camper", "5": "gruppo" }[String(n).trim()] || "volo_hotel";

  const nazione = prompt("In che nazione? (facoltativo)") || null;
  const continente = prompt("Continente?\n\nEuropa, Asia, Africa, America del Nord,\nAmerica centrale, America del Sud, Oceania") || null;
  const notti = Number(prompt("Quante notti?", "7")) || 7;
  const iata = prompt("Codice aeroporto, se lo sai (facoltativo)\nEsempio: MLE per le Maldive") || null;
  const tetto = Number(prompt("Sopra quanto NON e piu un'occasione?\nCosto vivo a persona, in euro", "1500")) || null;

  const r = await supa().rpc("rotta_crea_veloce", {
    p_azienda: aziendaId(), p_destinazione: dove.trim(), p_nazione: nazione,
    p_continente: continente, p_iata: iata, p_tipo: tipo, p_notti: notti,
    p_soglia_totale: tetto
  });

  if (r.error) return alert("Non creata: " + r.error.message);
  const d = r.data || {};
  if (d.ok === false) return alert(d.errore || "Non creata.");

  if (confirm("Creata: " + d.nome + (d.nota ? "\n\n" + d.nota : "")
              + "\n\nCerco subito le occasioni su questa rotta?")) {
    const g = await supa().functions.invoke("viaggi-cerca-occasioni",
                { body: { rotta_id: d.rotta_id } });
    const e = g.data || {};
    if (e.ok === false) alert("La ricerca non e partita:\n\n" + (e.errore || "errore"));
    else alert("Trovate " + (e.occasioni_nuove || 0) + " occasioni.");
  }
  await renderOccasioni();
}

async function renderRotte() {
  const box = document.getElementById("av-corpo");
  if (!box) return;
  const r = await supa().from("viaggi_rotte").select("*").eq("azienda_id", aziendaId()).order("nome");
  if (r.error) return mostraErrore(r.error);

  let h = '<div style="margin-bottom:14px;"><button id="occ-indietro" style="background:#fff;color:#0E5A7A;border:1px solid #0E5A7A;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;">← Occasioni</button></div>';
  h += "<p style=\"color:#64748b;font-size:13px;\">Le rotte che la ricerca controlla ogni notte. "
    + "Sotto le soglie l'occasione viene segnalata, sopra viene scartata.</p>";
  h += tabellaApri(["Rotta", "Tratta", "Notti", "Soglia volo", "Soglia totale", "Attiva"]);

  (r.data || []).forEach(function (x) {
    h += "<tr><td><b>" + escapeHtml(x.nome) + "</b></td>"
      + "<td>" + escapeHtml(x.origine_iata) + " → " + escapeHtml(x.destinazione_iata) + "</td>"
      + "<td>" + x.notti + "</td>"
      + "<td>" + euro(x.soglia_volo) + "</td>"
      + "<td>" + euro(x.soglia_totale) + "</td>"
      + "<td>" + (x.attiva ? "🟢" : "⚪") + "</td></tr>";
  });
  h += tabellaChiudi();
  box.innerHTML = h;
  etichetta(box);

  const b = document.getElementById("occ-indietro");
  if (b) b.addEventListener("click", renderOccasioni);
}

function tabellaApri(intestazioni) {
  let h = "<div class=\"av-tab-wrap\"><table class=\"av-tabella\"><thead><tr>";
  intestazioni.forEach(function (t) {
    h += "<th>" + escapeHtml(t) + "</th>";
  });
  return h + "</tr></thead><tbody>";
}

function tabellaChiudi() { return "</tbody></table></div>"; }

function td(html) {
  return "<td><div>" + html + "</div></td>";
}

function vuoto(testo) {
  return "<div style=\"border:1px dashed #cbd5e1;border-radius:10px;padding:24px;color:#64748b;text-align:center;\">" + escapeHtml(testo) + "</div>";
}

function euro(n) {
  const v = Number(n || 0);
  return v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function data(iso) {
  if (!iso) return "—";
  const p = String(iso).slice(0, 10).split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

function periodo(a, b) {
  if (!a) return "da definire";
  return data(a) + (b ? " – " + data(b) : "");
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}


// La bozza porta il nome di una voce Wikipedia, non un indirizzo: la foto si
// risolve qui. Scarta stemmi, mappe e ritratti di persone, come fa la pagina
// pubblica: su una richiesta per "Hollywood Studios" tornava un attore.
async function fotoDaWiki(titolo) {
  if (!titolo) return null;
  const lingue = ["it", "en"];
  for (const l of lingue) {
    try {
      const r = await fetch("https://" + l + ".wikipedia.org/api/rest_v1/page/summary/"
        + encodeURIComponent(titolo), { headers: { accept: "application/json" } });
      if (!r.ok) continue;
      const j = await r.json();
      if (!j || j.type === "disambiguation") continue;
      const d = String(j.description || "").toLowerCase();
      const persone = ["attore", "attrice", "actor", "actress", "cantante", "singer",
                       "politico", "politician", "calciatore", "footballer", "regista",
                       "director", "scrittore", "writer", "born ", "nato ", "nata "];
      if (persone.some(function (p) { return d.indexOf(p) !== -1; })) continue;
      const url = (j.originalimage && j.originalimage.source)
        || (j.thumbnail && j.thumbnail.source);
      if (!url) continue;
      if (/flag|coat_of_arms|stemma|bandiera|\.svg$|map|mappa|logo/i.test(url)) continue;
      return url.replace(/\/\d+px-/, "/640px-");
    } catch (e) { /* si prova la lingua dopo */ }
  }
  return null;
}

async function riempiCopertine(box) {
  const posti = box.querySelectorAll("[data-wiki]");
  for (const p of posti) {
    const u = await fotoDaWiki(p.getAttribute("data-wiki"));
    if (u) {
      p.innerHTML = "<img src=\"" + escapeHtml(u) + "\" alt=\"\" "
        + "style=\"width:100%;height:150px;object-fit:cover;border-radius:8px;\">";
    } else {
      p.remove();
    }
  }
}

/* ---------------- RICHIESTE SU MISURA ---------------- */

const STATI_RICHIESTA = {
  nuova: { testo: "Nuova", colore: "#0E5A7A" },
  in_lavorazione: { testo: "Da fare a mano", colore: "#b45309" },
  proposta_inviata: { testo: "Mandata", colore: "#0E5A7A" },
  vista: { testo: "Letta dal cliente", colore: "#0E5A7A" },
  modifiche_chieste: { testo: "Chiede modifiche", colore: "#B8860B" },
  accettata: { testo: "Accettata", colore: "#16a34a" },
  scaduta: { testo: "Scaduta", colore: "#64748b" },
  persa: { testo: "Persa", colore: "#64748b" }
};

function bolloStato(st) {
  const s = STATI_RICHIESTA[st] || { testo: st || "", colore: "#64748b" };
  return "<span style=\"display:inline-block;background:" + s.colore
    + ";color:#fff;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700;\">"
    + escapeHtml(s.testo) + "</span>";
}

async function renderRichieste() {
  const box = document.getElementById("av-corpo");
  if (!box) return;

  const r = await supa()
    .from("viaggi_richieste")
    .select("id,token,nome,email,telefono,destinazione,data_partenza,data_rientro,"
      + "date_rigide,adulti,bambini,budget_persona,budget_massimo,fase,con_chi,occasione,"
      + "interessi,da_evitare,note,stato,prezzo_vendita,prezzo_pieno,valida_fino,"
      + "inviata_il,vista_il,risposta,risposta_il,creata_il,in_coda,bozza")
    .eq("azienda_id", aziendaId())
    .order("creata_il", { ascending: false })
    .limit(100);
  if (r.error) throw r.error;

  const righe = r.data || [];
  if (!righe.length) {
    box.innerHTML = "<div style=\"border:1px solid #e2e8f0;border-radius:12px;padding:20px;"
      + "background:#fff;color:#64748b;\">Nessuna richiesta ancora. "
      + "Arrivano dal modulo pubblico e la proposta parte da sola.</div>";
    return;
  }

  // quelle che aspettano una mano vanno sopra a tutto
  const daFare = righe.filter(function (x) {
    return x.stato === "in_lavorazione" || x.stato === "modifiche_chieste" || x.stato === "accettata";
  });

  // Con venti richieste in lista non si trova piu niente: si guarda una cosa
  // per volta. Il filtro sta in memoria, non ricarica.
  const GRUPPI = [
    { chiave: "da_fare", testo: "Da fare",
      dentro: ["in_lavorazione", "modifiche_chieste", "accettata"] },
    { chiave: "in_corso", testo: "Mandate",
      dentro: ["proposta_inviata", "vista"] },
    { chiave: "nuove", testo: "Nuove", dentro: ["nuova"] },
    { chiave: "chiuse", testo: "Chiuse", dentro: ["persa", "scaduta"] }
  ];

  let h = "";
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">';
  h += '<button class="ri-filtro" data-f="tutte" style="padding:7px 13px;border-radius:20px;'
    + 'border:1px solid #0E5A7A;background:#0E5A7A;color:#fff;font-size:13px;font-weight:700;'
    + 'cursor:pointer;">Tutte ' + righe.length + "</button>";
  GRUPPI.forEach(function (g) {
    const n = righe.filter(function (x) { return g.dentro.indexOf(x.stato) !== -1; }).length;
    if (!n) return;
    h += '<button class="ri-filtro" data-f="' + g.chiave + '" '
      + 'style="padding:7px 13px;border-radius:20px;border:1px solid #cbd5e1;background:#fff;'
      + 'color:#0f172a;font-size:13px;cursor:pointer;">' + g.testo + " " + n + "</button>";
  });
  h += "</div>";

  // Le destinazioni non si scrivono a mano: si prendono da quelle che ci sono.
  const mete = {};
  righe.forEach(function (x) {
    const m = String(x.destinazione || "").trim();
    if (m) mete[m] = (mete[m] || 0) + 1;
  });
  const eleMete = Object.keys(mete).sort();
  if (eleMete.length > 1) {
    h += '<select id="ri-meta" style="width:100%;max-width:320px;margin-bottom:12px;">'
      + '<option value="">Tutte le destinazioni</option>';
    eleMete.forEach(function (m) {
      h += '<option value="' + escapeHtml(m) + '">' + escapeHtml(m)
        + " (" + mete[m] + ")</option>";
    });
    h += "</select>";
  }

  if (daFare.length) {
    h += "<div style=\"background:#FFF8E1;border:1px solid #B8860B;border-radius:10px;"
      + "padding:12px 14px;margin-bottom:14px;\"><b>" + daFare.length
      + (daFare.length === 1 ? " richiesta aspetta" : " richieste aspettano")
      + " una risposta.</b></div>";
  }

  h += "<div class=\"av-tab-wrap\"><table class=\"av-tabella\">"
    + "<thead><tr><th>Cliente</th><th>Dove e quando</th><th>Budget</th>"
    + "<th>Prezzo</th><th>Stato</th><th></th></tr></thead><tbody>";

  righe.forEach(function (x) {
    const persone = Number(x.adulti || 0) + Number(x.bambini || 0);
    const aperta = richiestaAperta && String(x.id) === String(richiestaAperta);
    const gruppo = (GRUPPI.find(function (g) { return g.dentro.indexOf(x.stato) !== -1; })
                    || { chiave: "altro" }).chiave;
    h += "<tr id=\"ri-" + x.id + "\" data-g=\"" + gruppo + "\""
      + " data-m=\"" + escapeHtml(String(x.destinazione || "")) + "\""
      + (aperta ? " style=\"outline:3px solid #B8860B;\"" : "") + ">"
      + "<td data-et=\"Cliente\"><b>" + escapeHtml(x.nome || "") + "</b>"
      + "<div style=\"font-size:12px;color:#64748b;\">" + escapeHtml(x.email || "")
      + (x.telefono ? " &middot; " + escapeHtml(x.telefono) : "") + "</div></td>"
      + "<td data-et=\"Dove e quando\">" + escapeHtml(x.destinazione || "")
      + "<div style=\"font-size:12px;color:#64748b;\">" + data(x.data_partenza)
      + " &rarr; " + data(x.data_rientro)
      + (x.date_rigide ? " &middot; date fisse" : " &middot; date libere")
      + " &middot; " + persone + (persone === 1 ? " persona" : " persone") + "</div></td>"
      + "<td data-et=\"Budget\">" + (x.budget_persona ? euro(x.budget_persona) : "&mdash;")
      + "<div style=\"font-size:12px;color:#64748b;\">a persona</div></td>"
      + "<td data-et=\"Prezzo\">" + (x.prezzo_vendita ? "<b>" + euro(x.prezzo_vendita) + "</b>" : "&mdash;")
      + (x.valida_fino ? "<div style=\"font-size:12px;color:#64748b;\">vale fino al "
          + data(x.valida_fino) + "</div>" : "") + "</td>"
      + "<td data-et=\"Stato\">" + bolloStato(x.stato)
      + (x.in_coda ? "<div style=\"font-size:12px;color:#b45309;\">in coda</div>" : "") + "</td>"
      + "<td data-et=\"\"><button class=\"ri-apri\" data-id=\"" + x.id + "\" "
      + "style=\"padding:8px 12px;border:1px solid #0E5A7A;background:#fff;color:#0E5A7A;"
      + "border-radius:8px;font-size:13px;cursor:pointer;\">Guarda</button></td>"
      + "</tr>"
      + "<tr class=\"ri-dett\" id=\"rd-" + x.id + "\" data-g=\"" + gruppo + "\""
      + " data-m=\"" + escapeHtml(String(x.destinazione || "")) + "\" style=\"display:none;\">"
      + "<td colspan=\"6\">" + dettaglioRichiesta(x) + "</td></tr>";
  });

  h += "</tbody></table></div>";
  box.innerHTML = h;
  etichetta(box);

  let filtroStato = "tutte";
  let filtroMeta = "";

  function applicaFiltri() {
    box.querySelectorAll("tbody tr").forEach(function (r) {
      const dett = r.classList.contains("ri-dett");
      const okStato = filtroStato === "tutte" || r.dataset.g === filtroStato;
      const okMeta = !filtroMeta || r.dataset.m === filtroMeta;
      if (!okStato || !okMeta) { r.style.display = "none"; return; }
      r.style.display = dett ? "none" : "";
    });
    box.querySelectorAll(".ri-apri").forEach(function (x) { x.textContent = "Guarda"; });
  }

  box.querySelectorAll(".ri-filtro").forEach(function (b) {
    b.addEventListener("click", function () {
      filtroStato = b.dataset.f;
      box.querySelectorAll(".ri-filtro").forEach(function (x) {
        const suo = x.dataset.f === filtroStato;
        x.style.background = suo ? "#0E5A7A" : "#fff";
        x.style.color = suo ? "#fff" : "#0f172a";
        x.style.borderColor = suo ? "#0E5A7A" : "#cbd5e1";
        x.style.fontWeight = suo ? "700" : "400";
      });
      applicaFiltri();
    });
  });

  const selMeta = document.getElementById("ri-meta");
  if (selMeta) selMeta.addEventListener("change", function () {
    filtroMeta = selMeta.value;
    applicaFiltri();
  });

  box.querySelectorAll(".ri-apri").forEach(function (b) {
    b.addEventListener("click", function () {
      const d = document.getElementById("rd-" + b.dataset.id);
      if (!d) return;
      const chiuso = d.style.display === "none";
      d.style.display = chiuso ? "table-row" : "none";
      b.textContent = chiuso ? "Chiudi" : "Guarda";
    });
  });

  box.querySelectorAll(".ri-rifai").forEach(function (b) {
    b.addEventListener("click", async function () {
      b.disabled = true;
      b.textContent = "Sto rifacendo...";
      try {
        const res = await supa().functions.invoke("viaggi-proposta-auto",
          { body: { richiesta_id: b.dataset.id, rifai: true } });
        if (res.error) throw res.error;
        const out = res.data || {};
        alert(out.ok ? "Proposta rifatta e mandata."
                     : "Non e partita: " + (out.errore || (out.problemi || []).join(", ")));
        renderRichieste();
      } catch (e) {
        alert("Non ha risposto: " + e.message);
        b.disabled = false;
        b.textContent = "Rifai la proposta";
      }
    });
  });

  // se si arriva dall email, si apre gia il dettaglio giusto
  riempiCopertine(box);

  if (richiestaAperta) {
    const d = document.getElementById("rd-" + richiestaAperta);
    const riga = document.getElementById("ri-" + richiestaAperta);
    if (d) d.style.display = "table-row";
    if (riga) riga.scrollIntoView({ behavior: "smooth", block: "center" });
    const b = box.querySelector('.ri-apri[data-id="' + richiestaAperta + '"]');
    if (b) b.textContent = "Chiudi";
  }
}

function dettaglioRichiesta(x) {
  const b = x.bozza || {};
  const link = "https://app.ristoflow-ai.com/viaggi/proposta/?t=" + encodeURIComponent(x.token || "");
  let h = "<div style=\"background:#f8fafc;border-radius:10px;padding:14px;\">";

  if (x.risposta) {
    h += "<div style=\"background:#fff;border-left:4px solid #B8860B;padding:10px 12px;"
      + "border-radius:6px;margin-bottom:12px;\"><b>Il cliente ha scritto</b><br>"
      + escapeHtml(x.risposta) + "</div>";
  }

  h += "<div style=\"font-size:13px;color:#334155;line-height:1.7;\">";
  if (x.fase) h += "<div><b>A che punto e:</b> " + escapeHtml(x.fase) + "</div>";
  if (x.con_chi) h += "<div><b>Parte:</b> " + escapeHtml(x.con_chi) + "</div>";
  if (x.occasione) h += "<div><b>Occasione:</b> " + escapeHtml(x.occasione) + "</div>";
  if (x.interessi && x.interessi.length) {
    h += "<div><b>Interessa:</b> " + escapeHtml(x.interessi.join(", ")) + "</div>";
  }
  if (x.da_evitare) h += "<div><b>Da evitare:</b> " + escapeHtml(x.da_evitare) + "</div>";
  if (x.note) h += "<div><b>Note:</b> " + escapeHtml(x.note) + "</div>";
  if (x.budget_massimo) h += "<div><b>Massimo:</b> " + euro(x.budget_massimo) + " a persona</div>";
  h += "</div>";

  if (b.titolo) {
    const tappe = b.tappe || [];
    const vere = tappe.filter(function (t) { return t.foto_url; }).slice(0, 4);
    let foto = "";
    if (vere.length) {
      foto = "<div style=\"display:flex;gap:6px;margin-top:12px;overflow-x:auto;\">";
      vere.forEach(function (t) {
        foto += "<img src=\"" + escapeHtml(t.foto_url) + "\" alt=\"\" "
          + "style=\"width:150px;height:110px;object-fit:cover;border-radius:8px;flex:0 0 auto;\">";
      });
      foto += "</div>";
    } else {
      const voce = b.copertina_wiki
        || (tappe.find(function (t) { return t.foto_wiki; }) || {}).foto_wiki;
      if (voce) {
        foto = "<div data-wiki=\"" + escapeHtml(voce) + "\" "
          + "style=\"margin-top:12px;height:150px;background:#e2e8f0;border-radius:8px;\"></div>";
      }
    }
    h += "<div style=\"margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0;\">"
      + "<b>" + escapeHtml(b.titolo) + "</b>" + foto
      + "<div style=\"font-size:13px;color:#64748b;\">"
      + ((b.tappe || []).length) + " giornate"
      + ((b.hotel || []).length ? " &middot; " + b.hotel.length + " alberghi" : "")
      + "</div></div>";
  }

  h += "<div style=\"margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;\">"
    + "<a href=\"" + link + "\" target=\"_blank\" rel=\"noopener\" "
    + "style=\"padding:9px 14px;background:#0E5A7A;color:#fff;border-radius:8px;"
    + "text-decoration:none;font-size:13px;font-weight:700;\">Vedi come la vede il cliente</a>"
    + "<button class=\"ri-rifai\" data-id=\"" + x.id + "\" "
    + "style=\"padding:9px 14px;background:#B8860B;color:#fff;border:0;border-radius:8px;"
    + "font-size:13px;font-weight:700;cursor:pointer;\">Rifai la proposta</button>"
    + (x.email ? "<a href=\"mailto:" + escapeHtml(x.email) + "\" "
        + "style=\"padding:9px 14px;border:1px solid #cbd5e1;border-radius:8px;"
        + "text-decoration:none;font-size:13px;color:#0f172a;\">Scrivi</a>" : "")
    + (x.telefono ? "<a href=\"tel:" + escapeHtml(x.telefono) + "\" "
        + "style=\"padding:9px 14px;border:1px solid #cbd5e1;border-radius:8px;"
        + "text-decoration:none;font-size:13px;color:#0f172a;\">Chiama</a>" : "")
    + "</div></div>";
  return h;
}
