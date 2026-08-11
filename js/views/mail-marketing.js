import { supabase } from "../supabaseClient.js";

/* Archivio dei destinatari delle campagne.
   Non e' un elenco di indirizzi: e' l'elenco di chi ha fatto qualcosa.
   Chi ha lasciato il preventivo a meta' sta in cima, perche' quella
   e' la telefonata che vale. */


const CATEGORIE = [
  { v: "", e: "Tutte" },
  { v: "sport", e: "🏟️ Sport" },
  { v: "arte", e: "🏛️ Arte e borghi" },
  { v: "lavoro", e: "💼 Lavoro" },
  { v: "fede", e: "⛪ Fede" },
  { v: "spettacoli", e: "🎭 Spettacoli" },
  { v: "altro", e: "📍 Altro" },
];

const FILTRI = [
  { v: "caldi", e: "Da richiamare" },
  { v: "tutti", e: "Tutti" },
  { v: "bozze", e: "Mail da leggere" },
  { v: "proposto", e: "Da decidere" },
  { v: "inviata", e: "Contattati" },
  { v: "da_chiamare", e: "Senza email" },
];

// L'ultima sezione aperta resta: chi ci lavora ogni giorno vuole ritrovarsi
// dove stava, non ricominciare dalla prima scheda.
let sezioneAperta = "contatti";
let categoriaFiltro = "";

function montaCategorie(container, azienda) {
  const barra = container.querySelector("#mm-categoria");
  if (!barra) return;
  barra.innerHTML = "";
  CATEGORIE.forEach((c) => {
    const b = document.createElement("button");
    b.textContent = c.e;
    b.style.cssText = "border-radius:99px;padding:6px 12px;font-size:12.5px;font-weight:700;border:1px solid #CBD5DD;background:#fff;color:#334155;cursor:pointer;";
    if (categoriaFiltro === c.v) selezionato(b, true);
    b.onclick = async () => {
      categoriaFiltro = c.v;
      barra.querySelectorAll("button").forEach((x) => selezionato(x, false));
      selezionato(b, true);
      await apriSezione(container, azienda);
    };
    barra.appendChild(b);
  });
}

function montaSezioni(container, azienda) {
  const barra = container.querySelector("#mm-sezioni");
  const sezioni = [
    { v: "contatti", e: "Chi abbiamo contattato" },
    { v: "attrattive", e: "Attrattive" },
    { v: "costi", e: "Costi e risultati" },
  ];
  barra.innerHTML = "";
  sezioni.forEach((sz) => {
    const b = document.createElement("button");
    b.textContent = sz.e;
    b.style.cssText = "border-radius:10px;padding:8px 14px;font-size:13.5px;font-weight:700;border:1px solid #CBD5DD;background:#fff;color:#334155;cursor:pointer;";
    if (sezioneAperta === sz.v) selezionato(b, true);
    b.onclick = async () => {
      sezioneAperta = sz.v;
      barra.querySelectorAll("button").forEach((x) => selezionato(x, false));
      selezionato(b, true);
      await apriSezione(container, azienda);
    };
    barra.appendChild(b);
  });
}

async function apriSezione(container, azienda) {
  const corpo = container.querySelector("#mm-corpo");
  if (sezioneAperta === "attrattive") {
    corpo.innerHTML = '<div style="font-size:13px;color:#64748b;">Un momento&hellip;</div>';
    try {
      const mod = await import("./richiami.js?v=" + (window.APP_V || ""));
      await mod.render(corpo);
    } catch (e) {
      corpo.innerHTML = '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px;font-size:13.5px;color:#b45309;">Non sono riuscito ad aprire le attrattive. Riprova fra poco.</div>';
    }
    return;
  }
  if (sezioneAperta === "costi") {
    await mostraCostiRisultati(corpo, azienda);
    return;
  }
  // torna l'elenco dei contattati
  corpo.innerHTML = '<div id="ca-filtri" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px;"></div>'
    + '<div id="ca-lista"></div>';
  montaFiltri(container, azienda);
  await carica(container, azienda, "caldi");
}

// Il funnel intero: dalla spesa in ricerca fino al preventivo chiuso.
// Chi apre, chi clicca, chi molla il form a meta': sono strade diverse,
// non un percorso a scalini, ma leggerle vicine dice dove si perde gente.
async function mostraCostiRisultati(corpo, azienda) {
  corpo.innerHTML = '<div style="font-size:13px;color:#64748b;">Un momento&hellip;</div>';
  const [{ data, error }, chiusiRes] = await Promise.all([
    supabase.from("v_costi_risultati").select("*").eq("azienda_id", azienda.id).maybeSingle(),
    supabase.from("campagne_target").select("id, ragione_sociale, preventivo_valore")
      .eq("azienda_id", azienda.id).eq("preventivo_chiuso", true).order("preventivo_chiuso_il", { ascending: false }),
  ]);
  const daChiudere = await supabase.from("campagne_target")
    .select("id, ragione_sociale, citta, note")
    .eq("azienda_id", azienda.id).eq("stato", "preventivo").eq("preventivo_chiuso", false);

  if (error || !data) {
    corpo.innerHTML = '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px;font-size:13.5px;color:#b45309;">Non sono riuscito a leggere i numeri. Riprova fra poco.</div>';
    return;
  }

  const spesa = Number(data.spesa_ricerca_usd) || 0;
  const contatti = Number(data.contatti_trovati) || 0;
  const conEmail = Number(data.contatti_con_email) || 0;
  const attrTrovate = Number(data.attrattive_trovate) || 0;
  const attrConf = Number(data.attrattive_confermate) || 0;
  const mailInviate = Number(data.mail_inviate) || 0;
  const mailAperte = Number(data.mail_aperte) || 0;
  const cliccati = Number(data.link_cliccati) || 0;
  const aMeta = Number(data.form_lasciati_a_meta) || 0;
  const richiesti = Number(data.preventivi_richiesti) || 0;
  const chiusi = Number(data.preventivi_chiusi) || 0;
  const valoreChiuso = Number(data.valore_chiuso) || 0;

  const costoPerContatto = contatti > 0 ? spesa / contatti : null;
  const costoPerChiuso = chiusi > 0 ? spesa / chiusi : null;

  const euro = (n) => "$" + n.toFixed(n < 1 ? 4 : 2);
  const soldi = (n) => "\u20ac" + n.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const cellaGrande = (numero, etichettaTesto, colore, sotto) =>
    '<div style="background:#fff;border:1px solid #E3E8EC;border-radius:14px;padding:16px;flex:1;min-width:140px;">'
    + '<div style="font-size:1.6rem;font-weight:800;color:' + colore + ';line-height:1.1;">' + numero + '</div>'
    + '<div style="font-size:12.5px;color:#64748b;margin-top:4px;font-weight:700;">' + etichettaTesto + '</div>'
    + (sotto ? '<div style="font-size:11.5px;color:#94a3b8;margin-top:3px;">' + sotto + '</div>' : "")
    + '</div>';

  let html = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">'
    + cellaGrande(euro(spesa), "Speso in ricerca", "#0E5A7A", "solo ricerca destinatari, oggi")
    + cellaGrande(contatti, "Contatti trovati", "#334155", conEmail + " con email verificata")
    + cellaGrande(chiusi, "Preventivi chiusi", chiusi > 0 ? "#15803d" : "#94a3b8", richiesti + " richiesti in tutto")
    + '</div>';

  // Il funnel: da chi ha ricevuto la mail fino a chi ha chiuso davvero.
  html += '<div style="background:#fff;border:1px solid #E3E8EC;border-radius:14px;padding:14px;margin-bottom:12px;">'
    + '<div style="font-size:12px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">Cosa succede dopo l\'invio</div>'
    + barraFunnel("Mail inviate", mailInviate, mailInviate)
    + barraFunnel("Hanno aperto", mailAperte, mailInviate)
    + barraFunnel("Hanno cliccato il link", cliccati, mailInviate)
    + barraFunnel("Hanno lasciato il form a meta\'", aMeta, mailInviate, "#d97706")
    + barraFunnel("Hanno chiesto il preventivo", richiesti, mailInviate, "#0E5A7A")
    + barraFunnel("Preventivo chiuso", chiusi, mailInviate, "#15803d")
    + '</div>';

  html += '<div style="background:#fff;border:1px solid #E3E8EC;border-radius:14px;padding:14px;margin-bottom:12px;">'
    + '<div style="font-size:12px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">Nel dettaglio</div>'
    + rigaDettaglio("Contatti con email", conEmail + " su " + contatti, conEmail > 0 ? Math.round(conEmail / Math.max(contatti, 1) * 100) + "%" : "")
    + rigaDettaglio("Attrattive trovate", attrTrovate + " proposte, " + attrConf + " confermate", "")
    + rigaDettaglio("Valore chiuso", valoreChiuso > 0 ? soldi(valoreChiuso) : "non segnato", "")
    + '</div>';

  html += '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:14px;margin-bottom:12px;">'
    + '<div style="font-size:12px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#94a3b8;margin-bottom:10px;">Costo per risultato</div>'
    + rigaDettaglio("Per contatto trovato", costoPerContatto != null ? euro(costoPerContatto) : "\u2014", "")
    + rigaDettaglio("Per preventivo chiuso", costoPerChiuso != null ? euro(costoPerChiuso) : "ancora nessuno", "")
    + '</div>';

  // Chi ha chiesto e aspetta di essere segnato: da qui si chiude.
  const inAttesa = daChiudere.data || [];
  if (inAttesa.length) {
    html += '<div style="background:#fff;border:1px solid #fde68a;border-radius:14px;padding:14px;margin-bottom:12px;">'
      + '<div style="font-size:12px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:#b45309;margin-bottom:10px;">Preventivi da chiudere (' + inAttesa.length + ')</div>';
    inAttesa.forEach((r) => {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #F1F5F9;">'
        + '<span style="font-size:13.5px;color:#1F2A33;">' + esc(r.ragione_sociale) + (r.citta ? ' <span style="color:#94a3b8;">(' + esc(r.citta) + ')</span>' : '') + '</span>'
        + '<button class="app-button small" data-chiudi="' + r.id + '" style="background:#15803d;color:#fff;white-space:nowrap;">Segna chiuso</button>'
        + '</div>';
    });
    html += '</div>';
  }

  const chiusiLista = chiusiRes.data || [];
  if (chiusiLista.length) {
    html += '<details style="margin-bottom:12px;"><summary style="cursor:pointer;font-size:13px;font-weight:700;color:#334155;">Preventivi chiusi (' + chiusiLista.length + ')</summary>'
      + '<div style="margin-top:8px;">';
    chiusiLista.forEach((r) => {
      html += '<div style="display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid #F1F5F9;font-size:13px;">'
        + '<span>' + esc(r.ragione_sociale) + '</span>'
        + '<span style="color:#15803d;font-weight:700;">' + (r.preventivo_valore ? soldi(Number(r.preventivo_valore)) : "chiuso") + '</span>'
        + '</div>';
    });
    html += '</div></details>';
  }

  html += '<div style="font-size:12px;color:#94a3b8;line-height:1.5;">La spesa conta solo la ricerca dei destinatari (tony-target-cerca): le altre ricerche (attrattive, calendari sportivi, lettura contatti) non registrano ancora il costo reale, quindi il numero qui sopra e\' per difetto, non per eccesso.</div>';

  corpo.innerHTML = html;

  corpo.querySelectorAll("[data-chiudi]").forEach((b) => {
    b.onclick = async () => {
      const valore = prompt("Valore dell\'evento in euro (lascia vuoto se non vuoi segnarlo):");
      if (valore === null) return;
      const numero = valore.trim() ? Number(valore.replace(",", ".")) : null;
      b.disabled = true; b.textContent = "Salvo...";
      const { error } = await supabase.rpc("segna_preventivo_chiuso", { p_target: b.dataset.chiudi, p_valore: numero });
      if (error) { b.disabled = false; b.textContent = "Segna chiuso"; alert("Non sono riuscito a salvare: " + error.message); return; }
      await mostraCostiRisultati(corpo, azienda);
    };
  });
}

// Una riga del funnel con una barretta proporzionale al totale delle mail
// inviate: fa vedere a colpo d\'occhio dove si perde gente lungo la strada.
function barraFunnel(etichettaTesto, valore, totale, colore) {
  const perc = totale > 0 ? Math.min(100, Math.round(valore / totale * 100)) : 0;
  const col = colore || "#0E5A7A";
  return '<div style="margin-bottom:9px;">'
    + '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">'
    + '<span style="color:#475569;">' + etichettaTesto + '</span>'
    + '<span style="font-weight:700;color:#1F2A33;">' + valore + (totale > 0 ? ' <span style="color:#94a3b8;font-weight:400;">(' + perc + '%)</span>' : '') + '</span>'
    + '</div>'
    + '<div style="height:6px;background:#F1F5F9;border-radius:99px;overflow:hidden;">'
    + '<div style="height:100%;width:' + perc + '%;background:' + col + ';"></div></div>'
    + '</div>';
}

function rigaDettaglio(etichettaTesto, valore, percentuale) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-top:1px solid #F1F5F9;font-size:13.5px;">'
    + '<span style="color:#475569;">' + etichettaTesto + '</span>'
    + '<span style="font-weight:700;color:#1F2A33;">' + valore + (percentuale ? ' <span style="color:#94a3b8;font-weight:400;">(' + percentuale + ')</span>' : '') + '</span>'
    + '</div>';
}

// I quattro numeri in cima: cosa c'e' da fare, in un colpo d'occhio.
async function numeri(container, azienda) {
  const box = container.querySelector("#mm-numeri");
  if (!box) return;
  const conta = async (tabella, filtro) => {
    let q = supabase.from(tabella).select("id", { count: "exact", head: true })
      .eq("azienda_id", azienda.id);
    q = filtro(q);
    const { count } = await q;
    return count || 0;
  };
  try {
    const [attrattive, daDecidere, daLeggere, caldi] = await Promise.all([
      conta("richiami_territorio", (q) => q.eq("stato", "confermato")),
      conta("campagne_target", (q) => q.eq("stato", "proposto").eq("disiscritto", false)),
      conta("campagne_target", (q) => q.eq("mail_stato", "bozza").eq("disiscritto", false)),
      conta("campagne_eventi", (q) => q.eq("tipo", "form_abbandonato")),
    ]);
    const cella = (n, etichettaTesto, colore) =>
      '<div style="background:#fff;border:1px solid #E3E8EC;border-radius:12px;padding:11px 12px;">'
      + '<div style="font-size:1.35rem;font-weight:800;color:' + colore + ';line-height:1.1;">' + n + '</div>'
      + '<div style="font-size:11.5px;color:#64748b;margin-top:3px;">' + etichettaTesto + '</div></div>';
    box.innerHTML =
      cella(attrattive, "attrattive", "#0E5A7A")
      + cella(daDecidere, "da decidere", daDecidere ? "#d97706" : "#94a3b8")
      + cella(daLeggere, "mail da leggere", daLeggere ? "#d97706" : "#94a3b8")
      + cella(caldi, "da richiamare", caldi ? "#dc2626" : "#94a3b8");
  } catch (e) {
    box.innerHTML = "";
  }
}

function montaFiltri(container, azienda) {
  const barra = container.querySelector("#ca-filtri");
  if (!barra) return;
  barra.innerHTML = "";
  FILTRI.forEach((f, i) => {
    const b = document.createElement("button");
    b.textContent = f.e;
    b.dataset.f = f.v;
    b.style.cssText = "border-radius:99px;padding:7px 14px;font-size:13px;font-weight:700;border:1px solid #CBD5DD;background:#fff;color:#334155;cursor:pointer;";
    if (i === 0) selezionato(b, true);
    b.onclick = () => {
      barra.querySelectorAll("button").forEach((x) => selezionato(x, false));
      selezionato(b, true);
      carica(container, azienda, f.v);
    };
    barra.appendChild(b);
  });
}

export async function render(container) {
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = '<div style="max-width:780px;margin:22px auto;padding:0 16px;">Nessuna azienda attiva.</div>';
    return;
  }

  container.innerHTML =
    '<div style="max-width:820px;margin:22px auto;padding:0 14px 50px;overflow-x:hidden;">'
    + '<h1 style="font-size:1.4rem;font-weight:800;margin:0 0 2px;">Mail marketing</h1>'
    + '<div style="font-size:13px;color:#64748b;margin-bottom:14px;">' + esc(azienda.nome || "") + '</div>'
    + '<div id="mm-numeri" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,110px),1fr));gap:8px;margin-bottom:14px;"></div>'
    + '<div id="mm-sezioni" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px;border-bottom:1px solid #E3E8EC;padding-bottom:12px;"></div>'
    + '<div id="mm-categoria" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;"></div>'
    + '<div id="mm-corpo">'
    + '<div id="ca-filtri" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px;"></div>'
    + '<div id="ca-lista"><div style="font-size:13px;color:#64748b;">Un momento&hellip;</div></div>'
    + '</div>'
    + '</div>';

  // Le attrattive stanno qui dentro, non nel menu: e' lo stesso lavoro, e il
  // menu laterale e' gia' lungo abbastanza.
  montaSezioni(container, azienda);
  montaCategorie(container, azienda);
  numeri(container, azienda);

  await apriSezione(container, azienda);
}

function selezionato(b, si) {
  b.style.background = si ? "#0E5A7A" : "#fff";
  b.style.color = si ? "#fff" : "#334155";
  b.style.borderColor = si ? "#0E5A7A" : "#CBD5DD";
}

async function carica(container, azienda, filtro) {
  const lista = container.querySelector("#ca-lista");
  lista.innerHTML = '<div style="font-size:13px;color:#64748b;">Un momento&hellip;</div>';

  let q = supabase.from("v_campagne_stato").select("*").eq("azienda_id", azienda.id);
  if (filtro === "bozze") q = q.not("mail_testo", "is", null).neq("mail_stato", "inviata");
  else if (filtro === "proposto") q = q.eq("stato", "proposto");
  else if (filtro === "da_chiamare") q = q.eq("stato", "da_chiamare");
  else if (filtro === "inviata") q = q.not("inviata_il", "is", null);
  if (categoriaFiltro) q = q.eq("categoria", categoriaFiltro);

  const { data, error } = await q.order("ultimo_segnale", { ascending: false, nullsFirst: false }).limit(200);

  if (error) {
    lista.innerHTML = avviso("Non sono riuscito a leggere l'archivio. Riprova fra poco.");
    return;
  }

  let righe = data || [];
  if (filtro === "caldi") {
    righe = righe.filter((r) => !r.disiscritto &&
      (r.form_lasciato_a_meta || r.ha_aperto_form || r.ha_cliccato || r.richiesta_completa));
    righe.sort((a, b) => peso(b) - peso(a));
  }

  if (!righe.length) {
    lista.innerHTML = avviso(
      filtro === "caldi"
        ? "Nessuno ha ancora dato segnali. Qui compaiono quelli che aprono il preventivo: sono le telefonate che valgono."
        : filtro === "bozze"
          ? "Nessuna mail scritta. Chiedi a Tony di scriverle per i destinatari che hai accettato."
          : "Niente in archivio con questo filtro.");
    return;
  }

  let html = '<div style="font-size:12.5px;color:#64748b;margin-bottom:10px;">' + righe.length + (righe.length === 1 ? " destinatario" : " destinatari") + '</div>';

  righe.forEach((r) => {
    const colore = r.richiesta_completa ? "#16a34a"
      : r.form_lasciato_a_meta ? "#dc2626"
      : r.ha_cliccato ? "#d97706" : "#94a3b8";

    html += '<div style="background:#fff;border:1px solid #E3E8EC;border-radius:14px;padding:13px 14px;margin-bottom:9px;overflow-wrap:anywhere;">'
      + '<div style="display:flex;gap:9px;align-items:flex-start;">'
      + '<span style="width:9px;height:9px;border-radius:50%;background:' + colore + ';margin-top:6px;flex:0 0 9px;"></span>'
      + '<div style="flex:1;min-width:0;overflow-wrap:anywhere;">'
      + '<div style="font-size:14.5px;font-weight:800;">' + esc(r.ragione_sociale) + '</div>'
      + '<div style="font-size:12px;color:' + colore + ';font-weight:700;margin-top:2px;">' + esc(r.a_che_punto) + '</div>'
      + (r.citta ? '<div style="font-size:12px;color:#94a3b8;margin-top:2px;">' + esc(r.citta) + ' · ' + esc(r.segmento) + '</div>' : "")
      + (r.motivo ? '<div style="font-size:12.5px;color:#475569;margin-top:6px;">' + esc(r.motivo) + '</div>' : "")
      + (r.note ? '<div style="font-size:12.5px;color:#334155;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:9px;padding:8px;margin-top:8px;white-space:pre-wrap;">' + esc(r.note) + '</div>' : "")
      + '</div></div>'
      + (r.mail_testo
          ? '<details style="margin-top:10px;border-top:1px solid #F1F5F9;padding-top:10px;" data-mail="' + r.id + '">'
            + '<summary style="cursor:pointer;font-size:13px;font-weight:700;color:#0E5A7A;">'
            + (r.mail_stato === 'approvata' ? 'Mail approvata, pronta a partire' : 'Leggi la mail che ha scritto Tony')
            + '</summary>'
            + '<div style="margin-top:10px;">'
            + '<label style="font-size:11.5px;font-weight:700;color:#94a3b8;">Oggetto</label>'
            + '<input type="text" data-ogg="' + r.id + '" value="' + esc(r.mail_oggetto || '') + '" style="width:100%;border:1px solid #CBD5DD;border-radius:8px;padding:9px;font-size:13.5px;margin:4px 0 10px;font-family:inherit;">'
            + '<label style="font-size:11.5px;font-weight:700;color:#94a3b8;">Testo</label>'
            + '<textarea data-txt="' + r.id + '" rows="12" style="width:100%;border:1px solid #CBD5DD;border-radius:8px;padding:10px;font-size:13.5px;font-family:inherit;line-height:1.5;margin:4px 0 10px;">' + esc(r.mail_testo) + '</textarea>'
            + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
            + '<button class="app-button small" data-salva="' + r.id + '" style="background:#0E5A7A;color:#fff;">Salva correzioni</button>'
            + (r.mail_stato === 'approvata'
                ? '<button class="app-button small gray" data-sblocca="' + r.id + '">Rimetti in bozza</button>'
                : '<button class="app-button small" data-approva="' + r.id + '" style="background:#15803d;color:#fff;">Approva</button>')
            + '</div>'
            + '<div style="font-size:11.5px;color:#94a3b8;margin-top:8px;">Approvare non fa partire niente: le mail approvate partono quando lo dici a Tony.</div>'
            + '</div></details>'
          : '')
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;max-width:100%;">'
      + (r.telefono ? '<a href="tel:' + esc(r.telefono) + '" class="app-button small" style="background:#0E5A7A;color:#fff;text-decoration:none;">Chiama</a>' : "")
      + (r.email ? '<a href="mailto:' + esc(r.email) + '" class="app-button small gray" style="text-decoration:none;">Scrivi</a>' : "")
      + (r.sito ? '<a href="' + esc(r.sito) + '" target="_blank" rel="noopener" class="app-button small gray" style="text-decoration:none;">Sito</a>' : "")
      + (r.fonte_url ? '<a href="' + esc(r.fonte_url) + '" target="_blank" rel="noopener" style="font-size:11.5px;color:#94a3b8;align-self:center;text-decoration:none;">da dove viene</a>' : "")
      + '</div></div>';
  });

  lista.innerHTML = html;

  // Correzioni e approvazione: quello che parte e' quello che si legge qui.
  lista.querySelectorAll("[data-salva]").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.salva;
      const ogg = lista.querySelector('[data-ogg="' + id + '"]').value.trim();
      const txt = lista.querySelector('[data-txt="' + id + '"]').value.trim();
      if (!ogg || !txt) { alert("Servono sia l'oggetto sia il testo."); return; }
      b.disabled = true; b.textContent = "Salvo...";
      const { error } = await supabase.from("campagne_target")
        .update({ mail_oggetto: ogg, mail_testo: txt, mail_stato: "bozza" }).eq("id", id);
      b.disabled = false; b.textContent = "Salva correzioni";
      if (error) { alert("Non sono riuscito a salvare."); return; }
      await carica(container, azienda, filtro);
      numeri(container, azienda);
    };
  });

  lista.querySelectorAll("[data-approva]").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.approva;
      const ogg = lista.querySelector('[data-ogg="' + id + '"]').value.trim();
      const txt = lista.querySelector('[data-txt="' + id + '"]').value.trim();
      b.disabled = true;
      const { error } = await supabase.from("campagne_target")
        .update({ mail_oggetto: ogg, mail_testo: txt, mail_stato: "approvata" }).eq("id", id);
      b.disabled = false;
      if (error) { alert("Non sono riuscito ad approvare."); return; }
      await carica(container, azienda, filtro);
      numeri(container, azienda);
    };
  });

  lista.querySelectorAll("[data-sblocca]").forEach((b) => {
    b.onclick = async () => {
      b.disabled = true;
      const { error } = await supabase.from("campagne_target")
        .update({ mail_stato: "bozza" }).eq("id", b.dataset.sblocca);
      b.disabled = false;
      if (error) { alert("Non riesco a rimetterla in bozza."); return; }
      await carica(container, azienda, filtro);
      numeri(container, azienda);
    };
  });
}

function peso(r) {
  return (r.form_lasciato_a_meta ? 60 : 0)
    + (r.ha_aperto_form ? 20 : 0)
    + (r.ha_cliccato ? 25 : 0)
    + (r.richiesta_completa ? 40 : 0);
}

function avviso(testo) {
  return '<div style="background:#fff;border:1px dashed #CBD5DD;border-radius:12px;padding:14px;font-size:13.5px;color:#5A6873;">' + esc(testo) + '</div>';
}

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
