/* =========================================================
   VOLI IN OFFERTA
   I voli letti ogni notte dove le compagnie pubblicano i prezzi.
   Non passano da nessun modello: prezzo, date e numero di volo
   sono quelli veri, e costano zero da leggere.

   Il confronto col prezzo solito ha senso solo quando c'e' storico:
   finche' i giorni osservati sono pochi il segno resta grigio e dice
   da quanto stiamo guardando, invece di fingere uno sconto.
========================================================= */

function client() {
  return window.supabaseClient || window.supabase;
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno",
              "luglio","agosto","settembre","ottobre","novembre","dicembre"];

function giornoMese(iso) {
  if (!iso) return "";
  const p = String(iso).split("-");
  if (p.length !== 3) return iso;
  return Number(p[2]) + " " + MESI[Number(p[1]) - 1].slice(0, 3);
}

function meseAnno(iso) {
  const p = String(iso || "").split("-");
  if (p.length < 2) return "";
  return MESI[Number(p[1]) - 1] + " " + p[0];
}

function euro(n) {
  const v = Number(n || 0);
  return v.toFixed(2).replace(".", ",");
}

// Lo sconto si mostra solo quando c'e' abbastanza storico dietro.
// Sotto i cinque giorni osservati un "-30%" sarebbe solo rumore.
const GIORNI_MINIMI = 5;

let tutti = [];
let filtro = "tutti";

export async function render(app) {
  const supabase = client();

  app.innerHTML = '<div style="padding:24px;color:#64748b;">Carico i voli…</div>';

  const { data, error } = await supabase
    .from("vw_voli_occasioni")
    .select("origine_iata, origine_nome, destinazione_iata, destinazione_nome, paese, data_partenza, data_rientro, notti, prezzo, dettaglio, prezzo_solito, giorni_osservati, sconto_perc")
    .order("prezzo", { ascending: true })
    .limit(300);

  if (error) {
    console.error("vw_voli_occasioni:", error);
    app.innerHTML = '<div style="padding:24px;color:#b42318;">Non riesco a leggere i voli: '
      + esc(error.message) + "</div>";
    return;
  }

  tutti = data || [];
  disegna(app);
}

function disegna(app) {
  const aeroporti = [];
  tutti.forEach(function (v) {
    if (aeroporti.indexOf(v.origine_iata) === -1) aeroporti.push(v.origine_iata);
  });

  const voli = tutti.filter(function (v) {
    if (filtro === "tutti") return true;
    if (filtro === "estero") return v.paese !== "Italia";
    if (filtro === "sotto50") return Number(v.prezzo) < 50;
    return v.origine_iata === filtro;
  });

  const chip = function (chiave, testo) {
    return '<button type="button" class="vo-chip' + (filtro === chiave ? " on" : "") + '" '
      + 'data-filtro="' + esc(chiave) + '">' + esc(testo) + "</button>";
  };

  let barra = chip("tutti", "Tutti") + chip("sotto50", "Sotto 50") + chip("estero", "Estero");
  aeroporti.forEach(function (a) { barra += chip(a, a); });

  const testa = '<div style="padding:24px 20px 8px;max-width:820px;margin:0 auto;">'
    + '<h2 style="margin:0 0 6px;font-size:20px;">Voli in offerta</h2>'
    + '<p style="margin:0 0 4px;font-size:14px;color:#64748b;line-height:1.55;">'
    + "Letti stanotte dove le compagnie pubblicano i prezzi. Andata e ritorno a persona, "
    + "date e numero di volo veri."
    + "</p>"
    + '<p style="margin:0 0 14px;font-size:13px;color:#94a3b8;">'
    + tutti.length + " voli · " + aeroporti.length + " aeroporti"
    + "</p>"
    + '<div class="vo-barra">' + barra + "</div>"
    + "</div>";

  if (!voli.length) {
    app.innerHTML = testa
      + '<div style="padding:0 20px 24px;max-width:820px;margin:0 auto;">'
      + '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;font-size:14px;color:#64748b;">'
      + "Nessun volo con questo filtro. Il giro gira ogni notte alle 3."
      + "</div></div>" + stile();
    aggancia(app);
    return;
  }

  // Dentro il filtro si guarda per data, non per prezzo: serve capire
  // quando si parte, non fare la classifica del piu' economico.
  const ordinati = voli.slice().sort(function (a, b) {
    return String(a.data_partenza).localeCompare(String(b.data_partenza));
  });

  let html = "";
  let meseCorrente = "";

  ordinati.forEach(function (v) {
    const m = meseAnno(v.data_partenza);
    if (m !== meseCorrente) {
      meseCorrente = m;
      html += '<div class="vo-mese">' + esc(m) + "</div>";
    }

    const giorni = Number(v.giorni_osservati || 0);
    const sconto = Number(v.sconto_perc || 0);
    const segnoVerde = giorni >= GIORNI_MINIMI && sconto >= 10;

    const segno = segnoVerde
      ? '<span class="vo-segno vo-verde">−' + Math.round(sconto) + "% sul solito</span>"
      : '<span class="vo-segno vo-grigio">storico: ' + giorni
        + (giorni === 1 ? " giorno" : " giorni") + "</span>";

    const d = v.dettaglio || {};
    const codici = (d.volo_andata || "") + (d.volo_ritorno ? " / " + d.volo_ritorno : "");

    html += '<div class="vo-volo">'
      + '<div class="vo-dove">'
      + '<div class="vo-citta">' + esc(v.destinazione_nome || v.destinazione_iata) + "</div>"
      + '<div class="vo-paese">' + esc(v.paese || "") + " · da " + esc(v.origine_nome || v.origine_iata) + "</div>"
      + '<div class="vo-quando">' + esc(giornoMese(v.data_partenza))
      + (v.data_rientro ? " → " + esc(giornoMese(v.data_rientro)) : "")
      + (v.notti ? " · " + esc(v.notti) + " notti" : "") + "</div>"
      + (codici ? '<div class="vo-codici">' + esc(codici) + "</div>" : "")
      + "</div>"
      + '<div class="vo-prezzo">'
      + '<span class="vo-euro">' + euro(v.prezzo) + "</span>"
      + '<span class="vo-apers">a persona</span>'
      + segno
      + "</div>"
      + "</div>";
  });

  app.innerHTML = testa
    + '<div style="padding:0 20px 28px;max-width:820px;margin:0 auto;">' + html + "</div>"
    + stile();

  aggancia(app);
}

function aggancia(app) {
  app.querySelectorAll(".vo-chip").forEach(function (b) {
    b.addEventListener("click", function () {
      filtro = b.getAttribute("data-filtro");
      disegna(app);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function stile() {
  return "<style>"
    + ".vo-barra{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px;}"
    + ".vo-chip{border:1px solid #e2e8f0;border-radius:99px;padding:5px 12px;font-size:13px;"
    + "color:#64748b;background:#fff;cursor:pointer;font-weight:600;}"
    + ".vo-chip.on{background:#0E5A7A;border-color:#0E5A7A;color:#fff;}"
    + ".vo-mese{padding:16px 0 6px;font-size:12px;font-weight:700;color:#64748b;"
    + "text-transform:uppercase;letter-spacing:.4px;}"
    + ".vo-volo{display:flex;align-items:flex-start;gap:12px;padding:13px 2px;"
    + "border-bottom:1px solid #e5e7eb;}"
    + ".vo-dove{flex:1;min-width:0;}"
    + ".vo-citta{font-weight:700;font-size:16px;color:#111827;}"
    + ".vo-paese{color:#64748b;font-size:13px;}"
    + ".vo-quando{color:#0E5A7A;font-size:13px;font-weight:600;margin-top:3px;}"
    + ".vo-codici{color:#a3a3a3;font-size:11px;margin-top:2px;}"
    + ".vo-prezzo{text-align:right;white-space:nowrap;}"
    + ".vo-euro{font-size:19px;font-weight:700;color:#111827;}"
    + ".vo-apers{display:block;color:#94a3b8;font-size:11px;}"
    + ".vo-segno{display:inline-block;margin-top:4px;font-size:11px;padding:2px 7px;"
    + "border-radius:4px;font-weight:700;}"
    + ".vo-verde{background:#dcfce7;color:#166534;}"
    + ".vo-grigio{background:#f1f5f9;color:#64748b;}"
    + "</style>";
}
