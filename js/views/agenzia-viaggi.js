/* =========================================================
   AGENZIA VIAGGI — catalogo viaggi, iscritti, incassi
   Solo admin. Le regole del database filtrano gia per azienda.
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

export async function render(app) {
  const azienda = window.state?.azienda;

  app.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:16px;">
      <h1 style="margin:0 0 4px;font-size:22px;">🚐 Agenzia viaggi</h1>
      <div style="color:#64748b;font-size:13px;margin-bottom:16px;">${escapeHtml(azienda?.nome || "")} — viaggi in catalogo, iscritti e incassi</div>

      <div id="av-tabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        <button data-tab="catalogo" class="av-tab">Catalogo</button>
        <button data-tab="iscritti" class="av-tab">Iscritti</button>
        <button data-tab="incassi"  class="av-tab">Incassi</button>
      </div>

      <div id="av-corpo"><div style="color:#64748b;">Caricamento...</div></div>
    </div>
  `;

  app.querySelectorAll(".av-tab").forEach(function (b) {
    b.style.cssText = "background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;color:#0E5A7A;";
    b.addEventListener("click", function () {
      tabAttiva = b.dataset.tab;
      disegnaTabs();
      caricaTab();
    });
  });

  disegnaTabs();
  await caricaViaggi();
  await caricaTab();
}

function disegnaTabs() {
  document.querySelectorAll(".av-tab").forEach(function (b) {
    const on = b.dataset.tab === tabAttiva;
    b.style.background = on ? "#0E5A7A" : "#fff";
    b.style.color = on ? "#fff" : "#0E5A7A";
    b.style.borderColor = "#0E5A7A";
  });
}

async function caricaViaggi() {
  const supa = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;

  const r = await supa
    .from("viaggi")
    .select("id,slug,titolo,sottotitolo,data_inizio,data_fine,stato,modalita_prezzo,quota_camper,quota_adulto,posti_totali,posti_per_mezzo,catalogo")
    .eq("azienda_id", azienda?.id)
    .order("data_inizio", { ascending: true });

  viaggiCache = r.data || [];
  if (!viaggioSel && viaggiCache.length) viaggioSel = viaggiCache[0].id;
}

async function caricaTab() {
  if (tabAttiva === "catalogo") return renderCatalogo();
  if (tabAttiva === "iscritti") return renderIscritti();
  return renderIncassi();
}

/* ---------------- CATALOGO ---------------- */

function renderCatalogo() {
  const box = document.getElementById("av-corpo");
  if (!box) return;

  if (!viaggiCache.length) {
    box.innerHTML = vuoto("Nessun viaggio ancora. Il primo si crea dal database o duplicando una proposta del catalogo.");
    return;
  }

  let html = tabellaApri(["Viaggio", "Periodo", "Quota", "Posti", "Stato"]);

  viaggiCache.forEach(function (v) {
    const st = STATO_VIAGGIO[v.stato] || STATO_VIAGGIO.bozza;
    const quota = v.modalita_prezzo === "camper"
      ? euro(v.quota_camper) + " <span style=\"color:#64748b;\">a camper</span>"
      : euro(v.quota_adulto) + " <span style=\"color:#64748b;\">a persona</span>";

    html += "<tr>"
      + td("<b>" + escapeHtml(v.titolo) + "</b><div style=\"color:#64748b;font-size:12px;\">" + escapeHtml(v.sottotitolo || "") + "</div>")
      + td(periodo(v.data_inizio, v.data_fine))
      + td(quota)
      + td(v.posti_totali == null ? "—" : String(v.posti_totali))
      + td("<span style=\"color:" + st.c + ";font-weight:700;\">" + st.t + "</span>")
      + "</tr>";
  });

  box.innerHTML = html + tabellaChiudi();
}

/* ---------------- ISCRITTI ---------------- */

async function renderIscritti() {
  const box = document.getElementById("av-corpo");
  if (!box) return;
  box.innerHTML = "<div style=\"color:#64748b;\">Caricamento...</div>";

  const supa = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;

  const r = await supa
    .from("viaggi_iscrizioni")
    .select("id,viaggio_id,referente_nome,nucleo_familiare,n_adulti,n_bambini,quota_totale,stato,modalita_pagamento,chi_paga,cadenza_mesi,mezzo_id")
    .eq("azienda_id", azienda?.id)
    .order("creato_il", { ascending: false });

  const iscr = r.data || [];
  if (!iscr.length) {
    box.innerHTML = vuoto("Nessuna iscrizione. Arrivano dal modulo di adesione sulla pagina pubblica.");
    return;
  }

  const s = await supa
    .from("vw_viaggi_saldi")
    .select("iscrizione_id,versato,residuo,prossima_scadenza,prossimo_importo")
    .eq("azienda_id", azienda?.id);

  const saldi = {};
  (s.data || []).forEach(function (x) { saldi[x.iscrizione_id] = x; });

  let html = tabellaApri(["Nucleo", "Persone", "Come paga", "Quota", "Versato", "Residuo", "Prossima"]);

  iscr.forEach(function (i) {
    const sa = saldi[i.id] || {};
    const persone = (i.n_adulti || 0) + (i.n_bambini || 0);
    const come = (MODALITA_LABEL[i.modalita_pagamento] || i.modalita_pagamento)
      + (i.chi_paga === "pro_capite" ? " · ognuno la sua" : " · un pagatore")
      + (i.modalita_pagamento === "rate_mensili" ? " · ogni " + i.cadenza_mesi + (i.cadenza_mesi === 1 ? " mese" : " mesi") : "");

    html += "<tr>"
      + td("<b>" + escapeHtml(i.nucleo_familiare || i.referente_nome) + "</b><div style=\"color:#64748b;font-size:12px;\">" + escapeHtml(i.referente_nome) + "</div>")
      + td(String(persone))
      + td("<span style=\"font-size:12px;\">" + escapeHtml(come) + "</span>")
      + td(euro(i.quota_totale))
      + td(euro(sa.versato))
      + td("<b>" + euro(sa.residuo) + "</b>")
      + td(sa.prossima_scadenza ? data(sa.prossima_scadenza) + "<div style=\"color:#64748b;font-size:12px;\">" + euro(sa.prossimo_importo) + "</div>" : "—")
      + "</tr>";
  });

  box.innerHTML = html + tabellaChiudi();
}

/* ---------------- INCASSI ---------------- */

async function renderIncassi() {
  const box = document.getElementById("av-corpo");
  if (!box) return;
  box.innerHTML = "<div style=\"color:#64748b;\">Caricamento...</div>";

  const supa = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  const oggi = new Date().toISOString().slice(0, 10);

  const s = await supa
    .from("vw_viaggi_saldi")
    .select("quota_totale,versato,residuo")
    .eq("azienda_id", azienda?.id);

  const righe = s.data || [];
  let quote = 0, versato = 0;
  righe.forEach(function (x) {
    quote += Number(x.quota_totale || 0);
    versato += Number(x.versato || 0);
  });

  const sc = await supa
    .from("viaggi_rate")
    .select("id,tipo,importo,scadenza,stato,iscrizione_id")
    .eq("azienda_id", azienda?.id)
    .eq("stato", "attesa")
    .lt("scadenza", oggi)
    .order("scadenza", { ascending: true });

  const scadute = sc.data || [];
  let arretrato = 0;
  scadute.forEach(function (r) { arretrato += Number(r.importo || 0); });

  let html = "<div style=\"display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;\">"
    + card("Quote totali", euro(quote), "#0E5A7A")
    + card("Incassato", euro(versato), "#16a34a")
    + card("Da incassare", euro(quote - versato), "#64748b")
    + card("Arretrato", euro(arretrato), arretrato > 0 ? "#dc2626" : "#64748b")
    + "</div>";

  if (!scadute.length) {
    html += "<div style=\"color:#64748b;\">Nessuna rata scaduta.</div>";
  } else {
    html += "<h2 style=\"font-size:16px;margin:0 0 8px;\">Rate scadute</h2>";
    html += tabellaApri(["Scadenza", "Tipo", "Importo"]);
    scadute.forEach(function (r) {
      html += "<tr>" + td(data(r.scadenza)) + td(escapeHtml(r.tipo)) + td(euro(r.importo)) + "</tr>";
    });
    html += tabellaChiudi();
  }

  box.innerHTML = html;
}

/* ---------------- utilita ---------------- */

function card(titolo, valore, colore) {
  return "<div style=\"flex:1 1 160px;border:1px solid #e2e8f0;border-radius:10px;padding:14px;background:#fff;\">"
    + "<div style=\"font-size:22px;font-weight:700;color:" + colore + ";\">" + valore + "</div>"
    + "<div style=\"font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;\">" + escapeHtml(titolo) + "</div></div>";
}

function tabellaApri(intestazioni) {
  let h = "<div style=\"overflow-x:auto;\"><table style=\"width:100%;border-collapse:collapse;font-size:14px;\"><thead><tr>";
  intestazioni.forEach(function (t) {
    h += "<th style=\"text-align:left;padding:8px 6px;border-bottom:2px solid #0E5A7A;font-size:12px;color:#64748b;text-transform:uppercase;\">" + escapeHtml(t) + "</th>";
  });
  return h + "</tr></thead><tbody>";
}

function tabellaChiudi() { return "</tbody></table></div>"; }

function td(html) {
  return "<td style=\"padding:9px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top;\">" + html + "</td>";
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
