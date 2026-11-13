/* Fatture emesse dal gestionale.
   Viste (hash ?vista=): elenco | evento (acconto/saldo da un preventivo, ?preventivo=ID) | modifica (?id=) | libera | scadenze
   La logica sta nelle Edge Functions:
   - fe-vendita: bozze dal preventivo, modifica, elenco, incassi, scadenze, bollo, copia di cortesia;
   - fe-fattura: anteprima e invio allo SDI (numero assegnato all'invio);
   - anagrafica-piva: dati dell'azienda cliente dalla partita IVA.
   La copia PDF al cliente parte da sola quando la fattura e' inviata (trigger sul database). */

const sb = () => window.supabaseClient || window.supabase;

export async function render(container) {
  document.querySelector(".app-header")?.style.removeProperty("display");
  document.querySelector(".topbar-global")?.style.removeProperty("display");
  const q = new URLSearchParams((window.location.hash.split("?")[1]) || "");
  const az = window.state?.azienda;
  if (!az?.id) { container.innerHTML = guscio("Fatture emesse", avviso("Nessuna azienda attiva.")); return; }
  const vista = q.get("vista") || (q.get("id") ? "modifica" : "elenco");
  if (vista === "evento") return vistaEvento(container, az, q.get("preventivo"));
  if (vista === "libera") return vistaEditor(container, az, null);
  if (vista === "modifica") return vistaEditor(container, az, q.get("id"));
  if (vista === "scadenze") return vistaScadenze(container, az);
  return vistaElenco(container, az);
}

// ---------- ELENCO ----------
async function vistaElenco(container, az) {
  container.innerHTML = guscio("Fatture emesse", carico());
  const r = await chiama("fe-vendita", { azione: "elenco", azienda_id: az.id });
  if (!r.ok) { container.innerHTML = guscio("Fatture emesse", avviso(r.errore || "Non riesco a caricare le fatture.")); return; }
  const gestore = r.ruolo !== "commercialista";
  let h = '<div style="' + S.sotto + '">' + esc(az.nome || az.ragione_sociale || "") + "</div>";
  if (gestore) h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">'
    + '<a href="#/fatture-emesse?vista=evento" style="' + S.btnPri + '">+ Fattura da un evento</a>'
    + '<a href="#/fatture-emesse?vista=libera" style="' + S.btnSec + '">+ Fattura libera</a>'
    + '<a href="#/fatture-emesse?vista=scadenze" style="' + S.btnSec + '">Scadenze</a></div>';

  const fatt = r.fatture || [];
  if (!fatt.length) h += card("Ancora nessuna fattura", '<div style="' + S.aiuto + '">Parti da un evento confermato: acconto e saldo si compilano dal preventivo.</div>');
  const perMese = {};
  fatt.forEach((f) => { const k = String(f.data_documento || "").slice(0, 7); (perMese[k] = perMese[k] || []).push(f); });
  Object.keys(perMese).sort().reverse().forEach((k) => {
    h += card(nomeMese(k), perMese[k].map((f) => {
      const bozza = ["bozza", "errore", "scartata"].indexOf(f.stato) >= 0;
      const sotto = [];
      if (f.stato === "scartata") sotto.push("Scartata dallo SDI" + (f.ultimo_errore ? ": " + f.ultimo_errore : "") + ". Correggi e rimanda");
      else if (f.stato === "errore") sotto.push("Invio non riuscito" + (f.ultimo_errore ? ": " + f.ultimo_errore : ""));
      if (!bozza) {
        if (f.incassata_il) sotto.push("incassata il " + giorno(f.incassata_il));
        else if (f.data_scadenza) sotto.push("da incassare entro il " + giorno(f.data_scadenza));
        if (f.cortesia_inviata_il) sotto.push("copia PDF mandata");
        else if (f.cortesia_errore) sotto.push("copia PDF non partita");
      }
      const azioni = !gestore ? "" : bozza
        ? '<a href="#/fatture-emesse?id=' + f.id + '" style="' + S.mini + '">Apri</a>'
        : (!f.incassata_il ? '<button type="button" data-incassa="' + f.id + '" style="' + S.mini + '">Incassata</button>' : "")
          + (f.cliente_email ? '<button type="button" data-pdf="' + f.id + '" style="' + S.mini + '">' + (f.cortesia_inviata_il ? "Rimanda PDF" : "Manda PDF") + "</button>" : "");
      return '<div style="' + S.riga + '"><div>' + (f.numero ? "n. " + esc(f.numero + (f.sezionale ? "/" + f.sezionale : "")) : "Bozza") + " · " + esc(nomeCliente(f))
        + '<small style="' + S.small + '">' + esc(tipoNome(f.tipo_documento) + (sotto.length ? " · " + sotto.join(" · ") : "")) + "</small>"
        + (azioni ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">' + azioni + "</div>" : "")
        + '</div><div style="text-align:right;white-space:nowrap;">' + euro(f.totale) + "<br>" + statoPill(f) + "</div></div>";
    }).join(""));
  });
  h += '<div id="fe-esito"></div>';
  container.innerHTML = guscio("Fatture emesse", h);
  container.querySelectorAll("[data-incassa]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true;
    const x = await chiama("fe-vendita", { azione: "incassata", azienda_id: az.id, fattura_id: b.dataset.incassa });
    if (x.ok) vistaElenco(container, az); else { b.disabled = false; esito(container, x.errore); }
  }));
  container.querySelectorAll("[data-pdf]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true; b.textContent = "Invio…";
    const x = await chiama("fe-vendita", { azione: "cortesia", azienda_id: az.id, fattura_id: b.dataset.pdf, forza: true });
    if (x.ok) vistaElenco(container, az); else { b.disabled = false; b.textContent = "Riprova"; esito(container, x.errore); }
  }));
}

// ---------- DA UN EVENTO ----------
async function vistaEvento(container, az, preventivoId) {
  container.innerHTML = guscio("Fattura da un evento", carico());
  const { data } = await sb().from("preventivi")
    .select("id, titolo_evento, tipo_servizio, data_evento, n_invitati, totale, acconto, acconto_versato, cliente_nome, cliente_cognome, cliente_email, confermato_il, stato")
    .eq("azienda_id", az.id).or("stato.eq.confermato,confermato_il.not.is.null").order("data_evento", { ascending: true }).limit(200);
  const eventi = data || [];
  const fv = await chiama("fe-vendita", { azione: "elenco", azienda_id: az.id });
  const perPrev = {};
  (fv.fatture || []).forEach((f) => { if (f.preventivo_id && ["annullata"].indexOf(f.stato) < 0) (perPrev[f.preventivo_id] = perPrev[f.preventivo_id] || []).push(f); });

  const scelto = eventi.find((e) => String(e.id) === String(preventivoId));
  if (!scelto) {
    const oggi = new Date().toISOString().slice(0, 10);
    const prossimi = eventi.filter((e) => !e.data_evento || e.data_evento >= oggi);
    const passati = eventi.filter((e) => e.data_evento && e.data_evento < oggi).reverse().slice(0, 20);
    const riga = (e) => '<a href="#/fatture-emesse?vista=evento&preventivo=' + e.id + '" style="' + S.riga + 'text-decoration:none;color:#0f172a;"><div>' + esc(titoloEvento(e))
      + '<small style="' + S.small + '">' + esc((e.n_invitati ? e.n_invitati + " persone · " : "") + euro(e.totale)
      + (Number(e.acconto_versato) ? " · acconto versato " + euro(e.acconto_versato) : "") + ((perPrev[e.id] || []).length ? " · " + perPrev[e.id].length + " fatture" : "")) + "</small></div><span>›</span></a>";
    let h = card("Scegli l'evento", prossimi.length ? prossimi.map(riga).join("") : '<div style="' + S.aiuto + '">Nessun evento confermato in arrivo.</div>');
    if (passati.length) h += card("Eventi passati", passati.map(riga).join(""));
    h += '<a href="#/fatture-emesse" style="' + S.btnSec + '">&larr; Fatture emesse</a>';
    container.innerHTML = guscio("Fattura da un evento", h);
    return;
  }

  const fatte = perPrev[scelto.id] || [];
  const haSaldo = fatte.some((f) => f.tipo_documento === "TD01");
  const accontiFatt = fatte.filter((f) => f.tipo_documento === "TD02");
  const accontoProp = Number(scelto.acconto_versato || scelto.acconto || 0);
  let h = card("Evento",
    '<div style="font-size:15px;font-weight:700;">' + esc(titoloEvento(scelto)) + "</div>"
    + '<div style="' + S.aiuto + 'margin-top:4px;">' + esc((scelto.n_invitati ? scelto.n_invitati + " persone · " : "") + "totale " + euro(scelto.totale)
      + (accontoProp ? " · acconto " + euro(accontoProp) : "")) + "</div>"
    + (fatte.length ? '<div style="' + S.aiuto + 'margin-top:6px;">Già fatte: ' + fatte.map((f) => esc(tipoNome(f.tipo_documento) + (f.numero ? " n. " + f.numero : " (bozza)"))).join(", ") + "</div>" : "")
    + '<div style="margin-top:8px;"><a href="#/fatture-emesse?vista=evento" style="font-size:13px;font-weight:700;color:#0E5A7A;">Cambia evento</a></div>');

  h += card("Cosa fatturi",
    scelte("fe-tipo", [["acconto", "Acconto"], ["saldo", "Saldo"]], haSaldo ? "acconto" : (accontiFatt.length ? "saldo" : "acconto"))
    + '<div id="fe-box-acconto">' + etichetta("Importo dell'acconto (€)") + campo("fe-importo", accontoProp ? String(accontoProp).replace(".", ",") : "", "decimal") + "</div>"
    + '<div id="fe-box-saldo" style="' + S.aiuto + 'display:none;margin-bottom:10px;">Ristoflow mette le voci dell\'evento e toglie da solo ' + (accontiFatt.length ? "l'acconto già fatturato (" + accontiFatt.length + ")" : "gli acconti già fatturati") + ".</div>"
    + (haSaldo ? avviso("Per questo evento il saldo è già stato fatto.") : "")
    + etichetta("I prezzi del preventivo sono")
    + scelte("fe-iva", [["esclusa", "IVA esclusa"], ["inclusa", "IVA inclusa"]], "esclusa")
    + '<div style="' + S.aiuto + '">IVA al 10% (somministrazione ed eventi).</div>');

  h += card("A chi", formCliente({ cliente_denominazione: scelto.cliente_cognome ? "" : (scelto.cliente_nome || ""), cliente_email: scelto.cliente_email || "", cliente_nome: scelto.cliente_cognome ? scelto.cliente_nome : "", cliente_cognome: scelto.cliente_cognome || "" }, !scelto.cliente_cognome));
  h += '<div id="fe-esito"></div><div style="display:flex;gap:8px;flex-wrap:wrap;">'
    + '<button type="button" id="fe-crea" style="' + S.btnPri + '">Prepara la fattura</button>'
    + '<a href="#/fatture-emesse" style="' + S.btnSec + '">Annulla</a></div>';
  container.innerHTML = guscio("Fattura da un evento", h);
  collegaScelte(container);
  collegaCliente(container);
  const aggiornaTipo = () => {
    const t = valoreScelta(container, "fe-tipo");
    container.querySelector("#fe-box-acconto").style.display = t === "acconto" ? "" : "none";
    container.querySelector("#fe-box-saldo").style.display = t === "saldo" ? "" : "none";
  };
  container.querySelectorAll('[data-scelta="fe-tipo"]').forEach((b) => b.addEventListener("click", aggiornaTipo));
  aggiornaTipo();

  container.querySelector("#fe-crea").addEventListener("click", async (ev) => {
    const b = ev.currentTarget;
    const tipo = valoreScelta(container, "fe-tipo");
    const cliente = leggiCliente(container);
    const errori = controllaCliente(cliente);
    const importo = numero(container.querySelector("#fe-importo").value);
    if (tipo === "acconto" && !(importo > 0)) errori.push("importo dell'acconto");
    if (errori.length) { esito(container, "Manca: " + errori.join(", ") + "."); return; }
    b.disabled = true; b.textContent = "Preparo…";
    const r = await chiama("fe-vendita", { azione: "da_preventivo", azienda_id: az.id, preventivo_id: scelto.id, tipo: tipo, importo: importo, iva_inclusa: valoreScelta(container, "fe-iva") === "inclusa", cliente: cliente });
    if (!r.ok) { b.disabled = false; b.textContent = "Prepara la fattura"; esito(container, r.errore || "Non riuscito"); return; }
    window.location.hash = "#/fatture-emesse?id=" + r.id;
  });
}

// ---------- EDITOR (bozza o fattura libera) ----------
async function vistaEditor(container, az, id) {
  container.innerHTML = guscio(id ? "Fattura" : "Fattura libera", carico());
  let f = { righe: [{ descrizione: "", quantita: 1, prezzo_unitario: "", aliquota_iva: 10 }], cliente_nazione: "IT", data_documento: oggiStr() };
  const cfg = await sb().from("fe_config").select("sezionale, ambiente").eq("azienda_id", az.id).maybeSingle();
  if (id) {
    const r = await chiama("fe-vendita", { azione: "elenco", azienda_id: az.id });
    const t = (r.fatture || []).find((x) => x.id === id);
    if (!t) { container.innerHTML = guscio("Fattura", avviso("Fattura non trovata.")); return; }
    if (["bozza", "errore", "scartata"].indexOf(t.stato) < 0) { window.location.hash = "#/fatture-emesse"; return; }
    const full = await sb().from("fatture_vendita").select("*").eq("id", id).maybeSingle();
    f = Object.assign({}, full.data || t, { righe: t.righe && t.righe.length ? t.righe : f.righe });
  }
  const azienda = !!(f.cliente_partita_iva || f.cliente_denominazione) || !id;
  let h = "";
  if (f.stato === "scartata" || f.stato === "errore") h += avviso((f.stato === "scartata" ? "Scartata dallo SDI" : "Invio non riuscito") + (f.ultimo_errore ? ": " + f.ultimo_errore : "") + ". Correggi e rimanda: il numero resta lo stesso.");
  if (cfg.data && cfg.data.ambiente !== "produzione") h += '<div style="' + S.aiuto + 'margin-bottom:10px;">Collegamento allo SDI in prova: le fatture non arrivano davvero.</div>';
  h += card("Documento",
    griglia(etichetta("Tipo") + '<div style="' + S.input + 'background:#f8fafc;">' + esc(tipoNome(f.tipo_documento || "TD01")) + "</div>",
      etichetta("Data") + '<input id="fe-data" type="date" value="' + esc(f.data_documento || oggiStr()) + '" style="' + S.input + '">')
    + griglia(etichetta("Pagamento") + '<select id="fe-mod" style="' + S.input + '">'
        + [["MP05", "Bonifico"], ["MP01", "Contanti"], ["MP08", "Carta"], ["MP02", "Assegno"]].map((m) => '<option value="' + m[0] + '"' + ((f.modalita_pagamento || "MP05") === m[0] ? " selected" : "") + ">" + m[1] + "</option>").join("") + "</select>",
      etichetta("Scadenza pagamento") + '<input id="fe-scad" type="date" value="' + esc(f.data_scadenza || "") + '" style="' + S.input + '">')
    + etichetta("Causale (facoltativa)") + '<input id="fe-causale" value="' + esc(f.causale || "") + '" style="' + S.input + '">');
  h += card("Cliente", formCliente(f, azienda));
  h += card("Righe", '<div id="fe-righe"></div><button type="button" id="fe-add" style="' + S.mini + '">+ aggiungi riga</button><div id="fe-tot" style="margin-top:12px;"></div>');
  h += '<div id="fe-esito"></div><div style="display:flex;gap:8px;flex-wrap:wrap;">'
    + '<button type="button" id="fe-invia" style="' + S.btnPri + '">Invia allo SDI</button>'
    + '<button type="button" id="fe-salva" style="' + S.btnSec + '">Salva bozza</button>'
    + (id && f.stato === "bozza" && !f.numero ? '<button type="button" id="fe-elimina" style="' + S.btnLink + '">Elimina</button>' : "")
    + '<a href="#/fatture-emesse" style="' + S.btnSec + '">Torna</a></div>';
  container.innerHTML = guscio(id ? "Fattura" + (f.numero ? " n. " + f.numero : "") : "Fattura libera", h);
  collegaScelte(container);
  collegaCliente(container);

  let righe = (f.righe || []).map((r) => ({ descrizione: r.descrizione, quantita: Number(r.quantita || 1), prezzo_unitario: r.prezzo_unitario, aliquota_iva: Number(r.aliquota_iva == null ? 10 : r.aliquota_iva) }));
  const disegnaRighe = () => {
    container.querySelector("#fe-righe").innerHTML = righe.map((r, i) => '<div data-r="' + i + '" style="border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin-bottom:8px;">'
      + '<input data-k="descrizione" placeholder="Descrizione" value="' + esc(r.descrizione || "") + '" style="' + S.input + '">'
      + '<div style="display:grid;grid-template-columns:1fr 1.4fr 1fr auto;gap:6px;align-items:start;">'
      + '<input data-k="quantita" inputmode="decimal" placeholder="Q.tà" value="' + esc(String(r.quantita).replace(".", ",")) + '" style="' + S.input + '">'
      + '<input data-k="prezzo_unitario" inputmode="decimal" placeholder="Prezzo €" value="' + esc(r.prezzo_unitario === "" ? "" : String(r.prezzo_unitario).replace(".", ",")) + '" style="' + S.input + '">'
      + '<select data-k="aliquota_iva" style="' + S.input + '">' + [10, 22, 4, 5].map((a) => '<option value="' + a + '"' + (Number(r.aliquota_iva) === a ? " selected" : "") + ">" + a + "%</option>").join("") + "</select>"
      + '<button type="button" data-del="' + i + '" style="' + S.btnLink + '">✕</button></div></div>').join("");
    container.querySelectorAll("[data-r]").forEach((box) => {
      const i = Number(box.dataset.r);
      box.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("input", () => {
        const k = el.dataset.k;
        righe[i][k] = k === "descrizione" ? el.value : (k === "aliquota_iva" ? Number(el.value) : numero(el.value));
        totali();
      }));
      box.querySelector("[data-del]").addEventListener("click", () => { righe.splice(i, 1); if (!righe.length) righe.push({ descrizione: "", quantita: 1, prezzo_unitario: "", aliquota_iva: 10 }); disegnaRighe(); });
    });
    totali();
  };
  const totali = () => {
    let imp = 0, iva = 0;
    righe.forEach((r) => { const t = r2(Number(r.quantita || 0) * Number(r.prezzo_unitario || 0)); imp += t; iva += r2(t * Number(r.aliquota_iva) / 100); });
    container.querySelector("#fe-tot").innerHTML = '<div style="' + S.riga + '"><span>Imponibile</span><span>' + euro(imp) + '</span></div><div style="' + S.riga + '"><span>IVA</span><span>' + euro(iva) + "</span></div>"
      + '<div style="' + S.riga + 'font-weight:800;border-bottom:0;"><span>Totale</span><span>' + euro(imp + iva) + "</span></div>";
  };
  container.querySelector("#fe-add").addEventListener("click", () => { righe.push({ descrizione: "", quantita: 1, prezzo_unitario: "", aliquota_iva: 10 }); disegnaRighe(); });
  disegnaRighe();

  const documento = () => ({ data_documento: container.querySelector("#fe-data").value, modalita_pagamento: container.querySelector("#fe-mod").value, data_scadenza: container.querySelector("#fe-scad").value, causale: container.querySelector("#fe-causale").value });
  const salva = async () => {
    const cliente = leggiCliente(container);
    const err = controllaCliente(cliente);
    const valide = righe.filter((r) => String(r.descrizione || "").trim() && r.prezzo_unitario !== "" && isFinite(Number(r.prezzo_unitario)));
    if (!valide.length) err.push("almeno una riga con descrizione e prezzo");
    if (err.length) { esito(container, "Manca: " + err.join(", ") + "."); return null; }
    if (id) {
      const r = await chiama("fe-vendita", { azione: "modifica", azienda_id: az.id, fattura_id: id, cliente: cliente, documento: documento(), righe: valide });
      if (!r.ok) { esito(container, r.errore || "Non salvata"); return null; }
      return id;
    }
    const r = await chiama("fe-vendita", { azione: "nuova", azienda_id: az.id, cliente: cliente, documento: documento(), righe: valide });
    if (!r.ok) { esito(container, r.errore || "Non salvata"); return null; }
    id = r.id; return id;
  };
  container.querySelector("#fe-salva").addEventListener("click", async (ev) => {
    ev.currentTarget.disabled = true;
    const ok = await salva();
    ev.currentTarget.disabled = false;
    if (ok) { window.location.hash = "#/fatture-emesse"; }
  });
  container.querySelector("#fe-invia").addEventListener("click", async (ev) => {
    const b = ev.currentTarget; b.disabled = true; b.textContent = "Invio…";
    const fid = await salva();
    if (!fid) { b.disabled = false; b.textContent = "Invia allo SDI"; return; }
    const r = await chiama("fe-fattura", { azione: "emetti", fattura_id: fid });
    if (!r.ok) { b.disabled = false; b.textContent = "Invia allo SDI"; esito(container, (r.errore || "Invio non riuscito") + (r.errori && r.errori.length ? ": " + r.errori.join("; ") : "")); return; }
    container.querySelector("#fe-esito").innerHTML = '<div style="' + S.ok + '">Inviata: n. ' + esc(r.numero) + ". La copia PDF parte da sola se il cliente ha un'email.</div>";
    setTimeout(() => { window.location.hash = "#/fatture-emesse"; }, 1500);
  });
  const el = container.querySelector("#fe-elimina");
  if (el) el.addEventListener("click", async () => {
    el.disabled = true;
    const r = await chiama("fe-vendita", { azione: "elimina", azienda_id: az.id, fattura_id: id });
    if (r.ok) window.location.hash = "#/fatture-emesse"; else { el.disabled = false; esito(container, r.errore); }
  });
}

// ---------- SCADENZE + BOLLO ----------
async function vistaScadenze(container, az) {
  container.innerHTML = guscio("Scadenze", carico("Leggo le scadenze dalle fatture ricevute…"));
  const anno = Number(oggiStr().slice(0, 4));
  const [s, b] = await Promise.all([chiama("fe-vendita", { azione: "scadenze", azienda_id: az.id }), chiama("fe-vendita", { azione: "bollo", azienda_id: az.id, anno: anno })]);
  if (!s.ok) { container.innerHTML = guscio("Scadenze", avviso(s.errore || "Non riesco a leggere le scadenze.")); return; }
  const oggi = oggiStr(), tra30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const daInc = (s.incassi || []).reduce((t, x) => t + x.importo, 0);
  const daPag = (s.pagamenti || []).filter((x) => x.scadenza >= oggi && x.scadenza <= tra30).reduce((t, x) => t + x.importo, 0);
  let h = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">'
    + numBox(euro(daInc), "da incassare") + numBox(euro(daPag), "da pagare nei prossimi 30 giorni") + "</div>";
  h += card("Da incassare", (s.incassi || []).length ? s.incassi.map((x) => '<div style="' + S.riga + '"><div>n. ' + esc(x.numero) + " · " + esc(x.cliente)
      + '<small style="' + S.small + '">' + (x.scadenza < oggi ? "scaduta il " : "scade il ") + giorno(x.scadenza) + "</small></div>"
      + '<div style="text-align:right;">' + euro(x.importo) + '<br><button type="button" data-incassa="' + x.id + '" style="' + S.mini + '">Incassata</button></div></div>').join("")
    : '<div style="' + S.aiuto + '">Niente da incassare.</div>');
  h += card("Da pagare ai fornitori", ((s.pagamenti || []).length ? s.pagamenti.map((x) => '<div style="' + S.riga + '"><div>' + esc(x.fornitore) + " · fatt. " + esc(x.numero)
      + '<small style="' + S.small + '">' + esc(x.modo ? x.modo + " · " : "") + (x.scadenza < oggi ? "scaduta il " : "scade il ") + giorno(x.scadenza) + "</small></div>"
      + '<div style="text-align:right;white-space:nowrap;' + (x.scadenza < oggi ? "color:#b91c1c;" : "") + '">' + euro(x.importo) + "</div></div>").join("")
    : '<div style="' + S.aiuto + '">Nessuna scadenza nei 60 giorni prima e dopo oggi.</div>')
    + (s.xml_da_leggere ? '<div style="' + S.aiuto + 'margin-top:8px;">Restano ' + s.xml_da_leggere + " fatture ricevute da leggere: riapri la pagina per completare.</div>" : ""));
  if (b.ok) h += card("Bollo sulle fatture senza IVA · " + anno, b.trimestri.map((t) => '<div style="' + S.riga + '"><div>' + esc(t.nome)
      + '<small style="' + S.small + '">F24 codice ' + t.tributo + " · entro il " + giorno(t.scadenza) + "</small></div><div style=\"text-align:right;white-space:nowrap;\">" + euro(t.importo) + (t.fatture ? " · " + t.fatture + " fatt." : "") + "</div></div>").join("")
    + '<div style="' + S.aiuto + 'margin-top:8px;">L\'importo lo calcola anche l\'Agenzia delle Entrate nel portale Fatture e Corrispettivi: questo serve per controllarlo.</div>');
  h += '<div id="fe-esito"></div><a href="#/fatture-emesse" style="' + S.btnSec + '">&larr; Fatture emesse</a>';
  container.innerHTML = guscio("Scadenze", h);
  container.querySelectorAll("[data-incassa]").forEach((x) => x.addEventListener("click", async () => {
    x.disabled = true;
    const r = await chiama("fe-vendita", { azione: "incassata", azienda_id: az.id, fattura_id: x.dataset.incassa });
    if (r.ok) vistaScadenze(container, az); else { x.disabled = false; esito(container, r.errore); }
  }));
}

// ---------- cliente ----------
function formCliente(f, azienda) {
  return scelte("fe-chi", [["azienda", "Azienda"], ["privato", "Privato"]], azienda ? "azienda" : "privato")
    + '<div data-chi="azienda">'
    + etichetta("Partita IVA") + '<div style="display:flex;gap:8px;align-items:flex-start;">' + '<input id="fe-piva" inputmode="numeric" value="' + esc(f.cliente_partita_iva || "") + '" style="' + S.input + 'flex:1;">'
    + '<button type="button" id="fe-compila" style="' + S.btnSec + '">Compila</button></div><div id="fe-piva-esito"></div>'
    + etichetta("Ragione sociale") + inputC("cliente_denominazione", f)
    + griglia(etichetta("Codice destinatario") + inputC("cliente_codice_destinatario", f, "0000000"), etichetta("PEC (se non c'è il codice)") + inputC("cliente_pec", f))
    + "</div>"
    + '<div data-chi="privato">'
    + griglia(etichetta("Nome") + inputC("cliente_nome", f), etichetta("Cognome") + inputC("cliente_cognome", f))
    + etichetta("Codice fiscale") + inputC("cliente_codice_fiscale", f)
    + "</div>"
    + etichetta("Indirizzo") + inputC("cliente_indirizzo", f)
    + '<div style="display:grid;grid-template-columns:1fr 2fr 1fr;gap:0 8px;">' + "<div>" + etichetta("CAP") + inputC("cliente_cap", f) + "</div><div>" + etichetta("Comune") + inputC("cliente_comune", f) + "</div><div>" + etichetta("Prov.") + inputC("cliente_provincia", f) + "</div></div>"
    + etichetta("Email per la copia PDF") + inputC("cliente_email", f, "", "email");
}
function inputC(k, f, ph, tipo) { return '<input data-c="' + k + '" type="' + (tipo || "text") + '" placeholder="' + esc(ph || "") + '" value="' + esc(f[k] || "") + '" style="' + S.input + '">'; }
function collegaCliente(container) {
  const mostra = () => {
    const chi = valoreScelta(container, "fe-chi");
    container.querySelectorAll("[data-chi]").forEach((d) => { d.style.display = d.dataset.chi === chi ? "" : "none"; });
  };
  container.querySelectorAll('[data-scelta="fe-chi"]').forEach((b) => b.addEventListener("click", mostra));
  mostra();
  const btn = container.querySelector("#fe-compila");
  if (btn) btn.addEventListener("click", async () => {
    const piva = String(container.querySelector("#fe-piva").value || "").replace(/\D/g, "");
    const out = container.querySelector("#fe-piva-esito");
    if (piva.length !== 11) { out.innerHTML = avviso("Scrivi una partita IVA di 11 cifre."); return; }
    out.innerHTML = '<div style="' + S.aiuto + 'margin-bottom:8px;">Cerco nel registro…</div>';
    const r = await chiama("anagrafica-piva", { piva: piva });
    if (!r.ok || !r.anagrafica) { out.innerHTML = avviso("Non trovata: " + (r.errore || "scrivi i dati a mano")); return; }
    const a = r.anagrafica;
    const metti = (k, v) => { const el = container.querySelector('[data-c="' + k + '"]'); if (el && v) el.value = v; };
    metti("cliente_denominazione", a.ragione_sociale); metti("cliente_indirizzo", a.indirizzo); metti("cliente_cap", a.cap);
    metti("cliente_comune", a.citta || a.comune); metti("cliente_provincia", a.provincia); metti("cliente_pec", a.pec);
    metti("cliente_codice_destinatario", a.codice_destinatario || a.codice_sdi || a.sdi);
    out.innerHTML = '<div style="' + S.ok + 'margin-bottom:10px;">Trovata: controlla i dati.</div>';
  });
}
function leggiCliente(container) {
  const chi = valoreScelta(container, "fe-chi");
  const c = { cliente_nazione: "IT" };
  container.querySelectorAll("[data-c]").forEach((el) => { c[el.dataset.c] = String(el.value || "").trim(); });
  c.cliente_partita_iva = chi === "azienda" ? String(container.querySelector("#fe-piva").value || "").replace(/\s/g, "") : "";
  if (chi === "azienda") { c.cliente_nome = ""; c.cliente_cognome = ""; c.cliente_codice_fiscale = c.cliente_codice_fiscale || c.cliente_partita_iva; }
  else { c.cliente_denominazione = ""; c.cliente_codice_destinatario = "0000000"; c.cliente_pec = ""; }
  if (!c.cliente_codice_destinatario) c.cliente_codice_destinatario = "0000000";
  return c;
}
function controllaCliente(c) {
  const e = [];
  if (c.cliente_partita_iva) { if (!/^\d{11}$/.test(c.cliente_partita_iva)) e.push("partita IVA di 11 cifre"); if (!c.cliente_denominazione) e.push("ragione sociale"); }
  else { if (!c.cliente_nome || !c.cliente_cognome) e.push("nome e cognome"); if (!/^[A-Z0-9]{16}$/i.test(c.cliente_codice_fiscale || "")) e.push("codice fiscale"); }
  if (!c.cliente_indirizzo || !c.cliente_comune) e.push("indirizzo e comune");
  if (!/^\d{5}$/.test(c.cliente_cap || "")) e.push("CAP di 5 cifre");
  if (c.cliente_email && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(c.cliente_email)) e.push("email valida");
  return e;
}

// ---------- piccoli pezzi ----------
async function chiama(fn, body) {
  try {
    const { data, error } = await sb().functions.invoke(fn, { body });
    if (!error) return data || {};
    try { const j = await error.context.json(); return Object.assign({ ok: false }, j); } catch (e) { return { ok: false, errore: error.message }; }
  } catch (e) { return { ok: false, errore: String(e && e.message ? e.message : e) }; }
}
function scelte(nome, opz, on) { return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' + opz.map((o) => '<button type="button" data-scelta="' + nome + '" data-v="' + o[0] + '" style="' + (o[0] === on ? S.sceltaOn : S.scelta) + '">' + esc(o[1]) + "</button>").join("") + "</div>"; }
function collegaScelte(container) {
  container.querySelectorAll("[data-scelta]").forEach((b) => b.addEventListener("click", () => {
    container.querySelectorAll('[data-scelta="' + b.dataset.scelta + '"]').forEach((x) => x.setAttribute("style", x === b ? S.sceltaOn : S.scelta));
  }));
}
function valoreScelta(container, nome) { let v = ""; container.querySelectorAll('[data-scelta="' + nome + '"]').forEach((b) => { if (b.getAttribute("style") === S.sceltaOn) v = b.dataset.v; }); return v; }
function statoPill(f) {
  if (f.incassata_il) return pill("Incassata", "verde");
  const m = { bozza: ["Bozza", "grigio"], emessa: ["Inviata", "blu"], inviata: ["Inviata", "blu"], consegnata: ["Consegnata", "verde"], accettata: ["Consegnata", "verde"], decorrenza_termini: ["Consegnata", "verde"],
    mancata_consegna: ["Nel cassetto fiscale", "verde"], scartata: ["Scartata", "rosso"], errore: ["Errore", "rosso"], annullata: ["Annullata", "grigio"] }[f.stato] || [f.stato, "grigio"];
  return pill(m[0], m[1]);
}
function tipoNome(t) { return { TD01: "Fattura", TD02: "Fattura di acconto", TD04: "Nota di credito", TD24: "Fattura differita" }[t] || "Fattura"; }
function titoloEvento(e) { return (e.tipo_servizio || "Evento") + (e.titolo_evento ? " · " + e.titolo_evento : (e.cliente_cognome || e.cliente_nome ? " · " + [e.cliente_nome, e.cliente_cognome].filter(Boolean).join(" ") : "")) + (e.data_evento ? " · " + giorno(e.data_evento) : ""); }
function nomeCliente(f) { return f.cliente_denominazione || [f.cliente_nome, f.cliente_cognome].filter(Boolean).join(" ") || "Cliente da completare"; }
function nomeMese(k) { const m = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]; const p = k.split("-"); return p.length === 2 ? m[Number(p[1]) - 1] + " " + p[0] : "Senza data"; }
function numBox(v, t) { return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;"><b style="display:block;font-size:1.3rem;color:#0E5A7A;">' + v + '</b><span style="font-size:12px;color:#64748b;">' + esc(t) + "</span></div>"; }
function guscio(titolo, corpo) { return '<div class="view" style="padding:20px 16px 40px;max-width:820px;margin:0 auto;"><h1 style="font-size:1.4rem;font-weight:800;margin:0 0 4px;">' + esc(titolo) + "</h1>" + corpo + "</div>"; }
function card(t, c) { return '<div style="' + S.card + '"><div style="' + S.sez + '">' + esc(t) + "</div>" + c + "</div>"; }
function carico(t) { return '<div style="font-size:13px;color:#64748b;">' + esc(t || "Carico…") + "</div>"; }
function avviso(t) { return '<div style="' + S.avviso + '">' + esc(t) + "</div>"; }
function esito(container, t) { const e = container.querySelector("#fe-esito"); if (e) e.innerHTML = avviso(t || "Non riuscito"); }
function pill(t, c) { return '<span style="' + S.pill + S[c] + '">' + esc(t) + "</span>"; }
function etichetta(t) { return '<label style="' + S.label + '">' + esc(t) + "</label>"; }
function campo(id, v, mode) { return '<input id="' + id + '" inputmode="' + (mode || "text") + '" value="' + esc(v || "") + '" style="' + S.input + '">'; }
function griglia(a, b) { return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 10px;"><div>' + a + "</div><div>" + b + "</div></div>"; }
function numero(v) { const s = String(v == null ? "" : v).trim(); if (!s) return ""; const n = Number(s.replace(/\./g, "").replace(",", ".")); return isFinite(n) ? n : ""; }
function r2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function euro(n) { return Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function giorno(t) { const s = String(t || "").slice(0, 10).split("-"); return s.length === 3 ? s[2] + "/" + s[1] + "/" + s[0] : ""; }
function oggiStr() { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date()); }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }

const S = {
  card: "background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:14px;",
  sez: "font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;margin:0 0 10px;",
  sotto: "font-size:13px;color:#64748b;margin-bottom:14px;",
  riga: "display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:14px;padding:11px 0;border-bottom:1px solid #f1f5f9;",
  small: "display:block;color:#64748b;font-size:12px;margin-top:2px;",
  label: "display:block;font-size:12px;font-weight:700;color:#334155;margin:0 0 5px;",
  input: "width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:16px;background:#fff;color:#0f172a;margin-bottom:10px;",
  btnPri: "display:inline-block;border:0;border-radius:10px;padding:11px 16px;font-size:14px;font-weight:700;background:#0E5A7A;color:#fff;cursor:pointer;text-decoration:none;",
  btnSec: "display:inline-block;border:1px solid #0E5A7A;border-radius:10px;padding:10px 14px;font-size:14px;font-weight:700;background:#fff;color:#0E5A7A;cursor:pointer;text-decoration:none;white-space:nowrap;",
  btnLink: "border:0;background:none;color:#b91c1c;font-size:14px;font-weight:600;cursor:pointer;padding:10px 6px;",
  mini: "display:inline-block;border:1px solid #0E5A7A;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;background:#fff;color:#0E5A7A;cursor:pointer;text-decoration:none;",
  scelta: "border:1px solid #cbd5e1;border-radius:10px;padding:9px 12px;font-size:14px;background:#fff;color:#0f172a;cursor:pointer;",
  sceltaOn: "border:1px solid #0E5A7A;border-radius:10px;padding:9px 12px;font-size:14px;background:#e0f2fe;color:#0E5A7A;font-weight:700;cursor:pointer;",
  aiuto: "font-size:12px;color:#64748b;",
  avviso: "background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;font-size:13px;color:#92400e;margin-bottom:10px;",
  ok: "background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13px;color:#15803d;",
  pill: "font-size:12px;font-weight:700;border-radius:99px;padding:3px 10px;white-space:nowrap;display:inline-block;",
  verde: "background:#dcfce7;color:#15803d;", giallo: "background:#fef3c7;color:#b45309;", rosso: "background:#fee2e2;color:#b91c1c;", blu: "background:#e0f2fe;color:#0E5A7A;", grigio: "background:#f1f5f9;color:#475569;",
};
