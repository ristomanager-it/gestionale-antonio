/* =========================================================
   VOLI IN OFFERTA — v2
   I voli letti ogni notte dove le compagnie pubblicano i prezzi.
   Non passano da nessun modello: prezzo, date e numero di volo
   sono quelli veri, e costano zero da leggere.

   v2: da guardare a fare. Due bottoni per volo.
   "Costruisci il viaggio" crea l'occasione con il volo dentro come costo
   certo, poi chiede a Tony l'itinerario. Tony non tocca il prezzo del volo:
   lavora su un numero gia' deciso, e cerca solo hotel, giorni e ristoranti.
   "Scarta" toglie il volo dalla lista per sempre: rivedere domattina trenta
   righe gia' decise e' il modo piu' rapido per smettere di guardarla.
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
let occupato = false;

export async function render(app) {
  const supabase = client();

  app.innerHTML = '<div style="padding:24px;color:#64748b;">Carico i voli…</div>';

  const { data, error } = await supabase
    .from("vw_voli_occasioni")
    .select("id, compagnia, origine_iata, origine_nome, destinazione_iata, destinazione_nome, paese, data_partenza, data_rientro, notti, prezzo, dettaglio, prezzo_solito, giorni_osservati, sconto_perc")
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

    // I prezzi di cache non sono prenotabili: vanno segnati, altrimenti
    // finiscono in una proposta al cliente come se fossero certi.
    const daVerificare = d.prezzo_di_cache === true;

    html += '<div class="vo-volo" data-id="' + esc(v.id) + '">'
      + '<div class="vo-riga">'
      + '<div class="vo-dove">'
      + '<div class="vo-citta">' + esc(v.destinazione_nome || v.destinazione_iata) + "</div>"
      + '<div class="vo-paese">' + esc(v.paese || "") + " · da " + esc(v.origine_nome || v.origine_iata) + "</div>"
      + '<div class="vo-quando">' + esc(giornoMese(v.data_partenza))
      + (v.data_rientro ? " → " + esc(giornoMese(v.data_rientro)) : "")
      + (v.notti ? " · " + esc(v.notti) + " notti" : "") + "</div>"
      + (codici ? '<div class="vo-codici">' + esc(codici) + "</div>" : "")
      + (daVerificare ? '<div class="vo-cache">prezzo indicativo, da verificare</div>' : "")
      + "</div>"
      + '<div class="vo-prezzo">'
      + '<span class="vo-euro">' + euro(v.prezzo) + "</span>"
      + '<span class="vo-apers">a persona</span>'
      + segno
      + "</div>"
      + "</div>"
      + '<div class="vo-azioni">'
      + '<button type="button" class="vo-bot vo-scarta" data-azione="scarta">Scarta</button>'
      + '<button type="button" class="vo-bot vo-crea" data-azione="crea">Costruisci il viaggio</button>'
      + "</div>"
      + '<div class="vo-esito"></div>'
      + "</div>";
  });

  app.innerHTML = testa
    + '<div id="vo-lista" style="padding:0 20px 28px;max-width:820px;margin:0 auto;">' + html + "</div>"
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

  app.querySelectorAll(".vo-volo").forEach(function (card) {
    const id = card.getAttribute("data-id");
    const esito = card.querySelector(".vo-esito");

    const scarta = card.querySelector('[data-azione="scarta"]');
    if (scarta) scarta.addEventListener("click", async function () {
      if (occupato) return;
      scarta.disabled = true;
      const r = await client().rpc("volo_scarta", { p_volo_id: id });
      if (r.error) {
        scarta.disabled = false;
        esito.innerHTML = '<span class="vo-male">Non riesco a scartarlo: ' + esc(r.error.message) + "</span>";
        return;
      }
      tutti = tutti.filter(function (v) { return v.id !== id; });
      card.remove();
    });

    const crea = card.querySelector('[data-azione="crea"]');
    if (crea) crea.addEventListener("click", async function () {
      // Una bozza alla volta: sono ottanta secondi e mezzo dollaro l'una,
      // due click affiancati sono solo soldi buttati.
      if (occupato) {
        esito.innerHTML = '<span class="vo-attesa">Sto gia costruendo un altro viaggio, aspetta che finisca.</span>';
        return;
      }
      occupato = true;
      crea.disabled = true;
      if (scarta) scarta.disabled = true;
      esito.innerHTML = '<span class="vo-attesa">Creo l occasione…</span>';

      try {
        const rpc = await client().rpc("volo_a_occasione", { p_volo_id: id });
        if (rpc.error) throw new Error(rpc.error.message);
        const occasione = rpc.data;

        esito.innerHTML = '<span class="vo-attesa">Tony sta costruendo l itinerario: '
          + "hotel, giorni e ristoranti. Ci vuole circa un minuto, non chiudere.</span>";

        const inv = await client().functions.invoke("viaggi-bozza-itinerario", {
          body: { occasione_id: occasione }
        });
        if (inv.error) throw new Error(inv.error.message);

        const d = inv.data || {};
        if (d.tetto_raggiunto) {
          esito.innerHTML = '<span class="vo-male">' + esc(d.errore) + "</span>";
          return;
        }
        if (!d.ok) throw new Error(d.errore || "non riuscito");

        const rp = d.riepilogo || {};
        esito.innerHTML = '<div class="vo-fatto">'
          + "<b>" + esc(d.titolo || "Viaggio pronto") + "</b><br>"
          + esc(d.tappe || 0) + " giorni · costo vivo " + esc(rp.costo_vivo_a_persona || "?")
          + " · prezzo suggerito " + esc(rp.prezzo_suggerito || "?") + " a persona<br>"
          + '<a href="#/agenzia-viaggi?tab=occasioni">Aprilo nel catalogo →</a>'
          + "</div>";

        tutti = tutti.filter(function (v) { return v.id !== id; });

      } catch (e) {
        crea.disabled = false;
        if (scarta) scarta.disabled = false;
        esito.innerHTML = '<span class="vo-male">Non riuscito: ' + esc(e.message) + "</span>";
      } finally {
        occupato = false;
      }
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
    + ".vo-volo{padding:13px 2px;border-bottom:1px solid #e5e7eb;}"
    + ".vo-riga{display:flex;align-items:flex-start;gap:12px;}"
    + ".vo-dove{flex:1;min-width:0;}"
    + ".vo-citta{font-weight:700;font-size:16px;color:#111827;}"
    + ".vo-paese{color:#64748b;font-size:13px;}"
    + ".vo-quando{color:#0E5A7A;font-size:13px;font-weight:600;margin-top:3px;}"
    + ".vo-codici{color:#a3a3a3;font-size:11px;margin-top:2px;}"
    + ".vo-cache{color:#b45309;font-size:11px;margin-top:3px;font-weight:600;}"
    + ".vo-prezzo{text-align:right;white-space:nowrap;}"
    + ".vo-euro{font-size:19px;font-weight:700;color:#111827;}"
    + ".vo-apers{display:block;color:#94a3b8;font-size:11px;}"
    + ".vo-segno{display:inline-block;margin-top:4px;font-size:11px;padding:2px 7px;"
    + "border-radius:4px;font-weight:700;}"
    + ".vo-verde{background:#dcfce7;color:#166534;}"
    + ".vo-grigio{background:#f1f5f9;color:#64748b;}"
    + ".vo-azioni{display:flex;gap:8px;margin-top:10px;}"
    + ".vo-bot{flex:1;border-radius:8px;padding:9px;font-size:13px;font-weight:700;"
    + "cursor:pointer;border:1px solid #0E5A7A;background:#fff;color:#0E5A7A;}"
    + ".vo-bot:disabled{opacity:.45;cursor:default;}"
    + ".vo-crea{background:#0E5A7A;color:#fff;}"
    + ".vo-scarta{border-color:#e2e8f0;color:#64748b;flex:0 0 90px;}"
    + ".vo-esito{font-size:13px;margin-top:8px;}"
    + ".vo-esito:empty{margin-top:0;}"
    + ".vo-attesa{color:#0E5A7A;}"
    + ".vo-male{color:#b42318;}"
    + ".vo-fatto{background:#f6fdf8;border:1px solid #bbf7d0;border-radius:10px;"
    + "padding:10px 12px;color:#166534;line-height:1.5;}"
    + ".vo-fatto a{color:#0E5A7A;font-weight:700;}"
    + "</style>";
}
