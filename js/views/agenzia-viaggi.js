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
  return ["catalogo", "iscritti", "incassi"].includes(t) ? t : null;
}

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
  .av-tabella td{padding:9px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top}
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
  tabAttiva = tabDaHash() || "catalogo";
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
        <button data-tab="iscritti" class="av-tab">Iscritti</button>
        <button data-tab="incassi"  class="av-tab">Incassi</button>
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
    if (tabAttiva === "iscritti") return await renderIscritti();
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

  let html = tabellaApri(["Viaggio", "Periodo", "Camper intero", "Posto singolo", "Stato"]);

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
        .select("id,giorno,data,titolo,descrizione,km,tipo,stato_usa,foto_wiki")
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
      + card("Camper intero", euro(v.quota_camper), "#16a34a")
      + card("Posto singolo", Number(v.quota_posto) > 0 ? euro(v.quota_posto) : "—", "#16a34a")
      + "</div>";

    h += "<div style=\"border:1px solid #e2e8f0;border-radius:10px;padding:14px;background:#fff;margin-bottom:18px;\">"
      + "<div style=\"font-size:13px;color:#64748b;margin-bottom:6px;\">Pagina pubblica</div>"
      + "<a class=\"av-link\" href=\"" + url + "\" target=\"_blank\">" + escapeHtml(url) + "</a>"
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
      + tabellaApri(["Giorno", "Tappa", "Foto", "Km", "Colazione", "Pranzo", "Cena"]);
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
