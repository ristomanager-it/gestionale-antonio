/* Autofatture (TD16-TD19, TD28): le fatture estere o in inversione contabile si integrano
   con un'autofattura allo SDI entro il 15 del mese dopo.
   Tutta la logica sta nelle Edge Functions:
   - fe-autofatture: trova cosa va integrato leggendo gli XML ricevuti, prepara le bozze, legge i PDF esteri con Tony;
   - fe-fattura: invia allo SDI, controlla i permessi dello studio e blocca i doppioni.
   La stessa schermata la usano l'azienda e il commercialista (?azienda=<id> quando entra dalla sua home). */

const sb = () => window.supabaseClient || window.supabase;

export async function render(container) {
  document.querySelector(".app-header")?.style.removeProperty("display");
  document.querySelector(".topbar-global")?.style.removeProperty("display");
  const q = new URLSearchParams((window.location.hash.split("?")[1]) || "");
  const aziendaId = q.get("azienda") || window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = guscio("", avviso("Nessuna azienda attiva.")); return; }
  container.innerHTML = guscio("", '<div style="font-size:13px;color:#64748b;">Controllo le fatture ricevute&hellip;</div>');

  const [r, az] = await Promise.all([
    chiama("fe-autofatture", { azione: "elenco", azienda_id: aziendaId }),
    sb().from("aziende").select("nome, ragione_sociale").eq("id", aziendaId).maybeSingle(),
  ]);
  const nome = (az.data && (az.data.ragione_sociale || az.data.nome)) || "";
  if (!r.ok) { container.innerHTML = guscio(esc(nome), avviso(r.errore || "Non riesco a caricare le autofatture.")); return; }
  disegna(container, aziendaId, nome, r);
}

function disegna(container, aziendaId, nome, d) {
  const scrive = !!d.puo_inviare;
  const chiTesto = { noi: "le invia l'azienda", studio: "le invia lo studio", entrambi: "le inviano azienda e studio" }[d.chi] || "";
  let h = "";

  h += '<div style="' + S.aiuto + 'margin:-6px 0 14px;">' + esc("Su questa azienda " + chiTesto + ".")
    + (d.ruolo === "commercialista" && !scrive ? " Tu le vedi in sola lettura." : "")
    + ' Vanno inviate entro il 15 del mese dopo quello in cui è arrivata la fattura.</div>';

  // 1. da fare + bozze
  const tot = d.da_fare.length + d.bozze.length;
  let corpo = "";
  if (!tot) corpo = '<div style="' + S.ok + '">Niente da fare: tutte le fatture ricevute sono a posto.</div>';
  d.da_fare.forEach((x) => {
    corpo += '<div style="' + S.riga + '"><div>' + esc(x.fornitore) + " · fatt. " + esc(x.numero) + " del " + giorno(x.data)
      + '<small style="' + S.small + '">' + euro(x.imponibile) + " senza IVA · " + esc(x.paese || "") + " · entro il " + giorno(x.scadenza) + "</small></div>"
      + (scrive ? '<button type="button" data-prepara="' + x.acquisto_id + '" style="' + S.btnSec + '">Prepara ' + esc(x.tipo) + "</button>" : pill(x.tipo, "giallo"))
      + "</div>";
  });
  d.bozze.forEach((b) => { corpo += bozza(b, scrive); });
  h += card("Da fare" + (tot ? " · " + tot : ""), corpo);

  // 2. carica PDF estero
  if (scrive) {
    h += card("Fattura estera da caricare",
      '<label style="' + S.carica + '"><input type="file" id="af-file" accept="application/pdf,image/jpeg,image/png,image/webp" style="display:none">'
      + '<b style="display:block;font-size:16px;margin-bottom:4px;">📄 Carica il PDF o una foto</b>'
      + "Meta, Google, Booking e gli altri fornitori esteri non mandano la fattura allo SDI. Tony legge fornitore, numero, data e importo e prepara l'autofattura.</label>"
      + '<div id="af-file-esito" style="margin-top:10px;"></div>');
  }

  // 3. gia' integrate fuori
  if (d.gia_integrate.length) {
    h += card("Già integrate",
      d.gia_integrate.map((x) => '<div style="' + S.riga + '"><div>' + esc(x.fornitore) + " · fatt. " + esc(x.numero)
        + '<small style="' + S.small + '">' + euro(x.imponibile) + " · integrata con " + esc(x.integrata_da) + "</small></div>" + pill("A posto", "verde") + "</div>").join(""));
  }

  // 4. registro
  const reg = d.emesse.map((e) => ({ numero: e.numero, data: e.data, fornitore: e.fornitore, imponibile: e.imponibile, iva: e.iva, stato: e.stato, chi: e.inviata_da }))
    .concat(d.registro.filter((c) => !c.da_ristoflow).map((c) => ({ numero: c.numero, data: c.data, fornitore: c.fornitore, imponibile: c.imponibile, iva: c.iva, stato: "fuori" })))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  h += card("Registro", reg.length
    ? reg.slice(0, 60).map((e) => '<div style="' + S.riga + '"><div>' + esc(e.numero || "") + " · " + esc(e.fornitore) + " · " + giorno(e.data)
        + '<small style="' + S.small + '">' + euro(e.imponibile) + " + IVA " + euro(e.iva)
        + (e.stato === "fuori" ? " · fatta fuori da Ristoflow" : e.chi ? " · inviata da " + (e.chi === "commercialista" ? "lo studio" : "l'azienda") : "") + "</small></div>"
        + statoPill(e.stato) + "</div>").join("")
    : '<div style="' + S.aiuto + '">Nessuna autofattura ancora.</div>');

  if (d.non_esaminate > 0) h += '<div style="' + S.aiuto + '">Restano ' + d.non_esaminate + " fatture ricevute da controllare: riapri la pagina tra poco.</div>";
  h += '<div id="af-esito" style="margin:8px 0;"></div>';

  container.innerHTML = guscio(esc(nome), h);
  collega(container, aziendaId, d);
}

function bozza(b, scrive) {
  const ro = scrive ? "" : " disabled";
  const avvisi = [];
  if (b.doppione) avvisi.push('<div style="' + S.boxRosso + '">Doppione: questa fattura è già integrata con ' + esc(b.doppione) + ". Non inviarla.</div>");
  if (b.stato === "scartata" || b.stato === "errore") avvisi.push('<div style="' + S.avviso + '">' + (b.stato === "scartata" ? "Scartata dallo SDI" : "Invio non riuscito") + (b.errore ? ": " + esc(b.errore) : "") + ". Correggi e rimanda.</div>");
  return '<details style="' + S.bozza + '"' + (b.doppione || b.stato !== "bozza" ? " open" : "") + '>'
    + '<summary style="cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px;">'
    + "<div>" + esc(b.fornitore || "Fornitore da completare") + (b.rif_numero ? " · fatt. " + esc(b.rif_numero) : "")
    + '<small style="' + S.small + '">' + euro(b.imponibile) + " + IVA " + euro(b.iva) + (b.da_pdf ? " · letta da Tony" : "") + " · entro il " + giorno(b.scadenza) + "</small></div>"
    + (b.doppione ? pill("Doppione", "rosso") : pill("Pronta · " + b.tipo, b.stato === "bozza" ? "verde" : "giallo")) + "</summary>"
    + '<div style="margin-top:12px;" data-bozza="' + b.id + '">' + avvisi.join("")
    + griglia(etichetta("Tipo") + '<select data-f="tipo_documento" style="' + S.input + '"' + ro + ">"
      + [["TD17", "TD17 servizi dall'estero"], ["TD18", "TD18 beni dall'UE"], ["TD19", "TD19 beni già in Italia"], ["TD16", "TD16 inversione contabile Italia"], ["TD28", "TD28 San Marino con IVA"]]
        .map((t) => '<option value="' + t[0] + '"' + (b.tipo === t[0] ? " selected" : "") + ">" + t[1] + "</option>").join("") + "</select>",
      etichetta("Data autofattura") + inp("data_documento", b.data, "date", ro))
    + griglia(etichetta("Fornitore") + inp("cliente_denominazione", b.fornitore, "text", ro),
      etichetta("Partita IVA fornitore") + inp("cliente_partita_iva", b.piva, "text", ro))
    + griglia(etichetta("Paese (2 lettere)") + inp("cliente_nazione", b.paese, "text", ro),
      etichetta("Numero fattura fornitore") + inp("rif_numero", b.rif_numero, "text", ro))
    + griglia(etichetta("Data fattura fornitore") + inp("rif_data", b.rif_data, "date", ro),
      etichetta("Imponibile (€)") + '<input data-r="imponibile" inputmode="decimal" value="' + esc(String(b.imponibile).replace(".", ",")) + '" style="' + S.input + '"' + ro + ">")
    + (scrive ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">'
      + '<button type="button" data-azione="salva" style="' + S.btnSec + '">Salva</button>'
      + '<button type="button" data-azione="invia" style="' + S.btnPri + (b.doppione ? "opacity:.35;cursor:not-allowed;" : "") + '"' + (b.doppione ? " disabled" : "") + ">Invia allo SDI</button>"
      + (b.stato === "bozza" ? '<button type="button" data-azione="elimina" style="' + S.btnLink + '">Elimina</button>' : "")
      + "</div>" : "")
    + '<div data-esito style="margin-top:8px;"></div></div></details>';
}

function collega(container, aziendaId, d) {
  const esitoGen = container.querySelector("#af-esito");
  const ricarica = () => render(container);

  container.querySelectorAll("[data-prepara]").forEach((btn) => btn.addEventListener("click", async () => {
    btn.disabled = true; btn.textContent = "Preparo…";
    const r = await chiama("fe-autofatture", { azione: "prepara", azienda_id: aziendaId, acquisto_id: btn.getAttribute("data-prepara") });
    if (!r.ok) { btn.disabled = false; btn.textContent = "Riprova"; esitoGen.innerHTML = avviso(r.errore || "Non riuscito"); return; }
    ricarica();
  }));

  const file = container.querySelector("#af-file");
  if (file) file.addEventListener("change", async () => {
    const f = file.files && file.files[0];
    const out = container.querySelector("#af-file-esito");
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { out.innerHTML = avviso("File troppo grande: massimo 10 MB."); return; }
    out.innerHTML = '<div style="' + S.aiuto + '">Tony sta leggendo la fattura…</div>';
    const b64 = await new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.onerror = ko; fr.readAsDataURL(f); });
    const r = await chiama("fe-autofatture", { azione: "leggi_pdf", azienda_id: aziendaId, tipo_file: f.type || "application/pdf", file_base64: b64 });
    if (!r.ok) { out.innerHTML = avviso(r.errore || "Non sono riuscito a leggerla"); return; }
    out.innerHTML = (r.avvisi || []).map((a) => avviso(a)).join("") + '<div style="' + S.ok + '">Pronta: controlla i dati nella riga e invia.</div>';
    setTimeout(ricarica, (r.avvisi && r.avvisi.length) ? 2500 : 900);
  });

  container.querySelectorAll("[data-bozza]").forEach((box) => {
    const id = box.getAttribute("data-bozza");
    const out = box.querySelector("[data-esito]");
    const leggi = () => {
      const campi = {};
      box.querySelectorAll("[data-f]").forEach((el) => { campi[el.getAttribute("data-f")] = String(el.value || "").trim(); });
      if (campi.cliente_nazione) campi.cliente_nazione = campi.cliente_nazione.toUpperCase();
      const imp = Number(String(box.querySelector('[data-r="imponibile"]').value || "").replace(/\./g, "").replace(",", "."));
      return { campi, riga: { imponibile: imp, aliquota: 22 } };
    };
    const salva = async () => {
      const v = leggi();
      if (!(v.riga.imponibile > 0)) { out.innerHTML = avviso("Scrivi l'imponibile."); return false; }
      const r = await chiama("fe-autofatture", { azione: "modifica", azienda_id: aziendaId, fattura_id: id, campi: v.campi, riga: v.riga });
      if (!r.ok) { out.innerHTML = avviso(r.errore || "Non salvato"); return false; }
      return true;
    };
    box.querySelectorAll("[data-azione]").forEach((btn) => btn.addEventListener("click", async () => {
      const a = btn.getAttribute("data-azione");
      btn.disabled = true;
      if (a === "salva") {
        out.innerHTML = '<div style="' + S.aiuto + '">Salvo…</div>';
        if (await salva()) ricarica(); else btn.disabled = false;
      } else if (a === "elimina") {
        const r = await chiama("fe-autofatture", { azione: "elimina", azienda_id: aziendaId, fattura_id: id });
        if (r.ok) ricarica(); else { btn.disabled = false; out.innerHTML = avviso(r.errore || "Non eliminata"); }
      } else if (a === "invia") {
        out.innerHTML = '<div style="' + S.aiuto + '">Salvo e invio allo SDI…</div>';
        if (!(await salva())) { btn.disabled = false; return; }
        const r = await chiama("fe-fattura", { azione: "emetti", fattura_id: id });
        if (!r.ok) {
          btn.disabled = false;
          out.innerHTML = avviso((r.errore || "Invio non riuscito") + (r.errori && r.errori.length ? ": " + r.errori.join("; ") : ""));
          return;
        }
        out.innerHTML = '<div style="' + S.ok + '">Inviata: ' + esc(r.numero) + ". L'esito dello SDI arriva da solo.</div>";
        setTimeout(ricarica, 1500);
      }
    }));
  });
}

async function chiama(fn, body) {
  try {
    const { data, error } = await sb().functions.invoke(fn, { body });
    if (!error) return data || {};
    try { const j = await error.context.json(); return Object.assign({ ok: false }, j); } catch (e) { return { ok: false, errore: error.message }; }
  } catch (e) { return { ok: false, errore: String(e && e.message ? e.message : e) }; }
}

function statoPill(s) {
  const m = { inviata: ["Inviata", "blu"], emessa: ["Inviata", "blu"], consegnata: ["Consegnata", "verde"], decorrenza_termini: ["Consegnata", "verde"], accettata: ["Consegnata", "verde"],
    mancata_consegna: ["Nel cassetto fiscale", "verde"], scartata: ["Scartata", "rosso"], errore: ["Errore", "rosso"], fuori: ["Fuori Ristoflow", "grigio"] }[s] || [s, "grigio"];
  return pill(m[0], m[1]);
}
function guscio(sotto, corpo) {
  return '<div class="view" style="padding:20px 16px 40px;max-width:820px;margin:0 auto;">'
    + '<h1 style="font-size:1.4rem;font-weight:800;margin:0 0 2px;">Autofatture</h1>'
    + '<div style="font-size:13px;color:#64748b;margin-bottom:16px;">' + sotto + "</div>" + corpo + "</div>";
}
function card(t, c) { return '<div style="' + S.card + '"><div style="' + S.sez + '">' + esc(t) + "</div>" + c + "</div>"; }
function avviso(t) { return '<div style="' + S.avviso + '">' + esc(t) + "</div>"; }
function pill(t, c) { return '<span style="' + S.pill + S[c] + '">' + esc(t) + "</span>"; }
function etichetta(t) { return '<label style="' + S.label + '">' + esc(t) + "</label>"; }
function inp(f, v, tipo, ro) { return '<input data-f="' + f + '" type="' + tipo + '" value="' + esc(v == null ? "" : v) + '" style="' + S.input + '"' + ro + ">"; }
function griglia(a, b) { return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 10px;"><div>' + a + "</div><div>" + b + "</div></div>"; }
function euro(n) { return Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function giorno(t) { const s = String(t || "").slice(0, 10).split("-"); return s.length === 3 ? s[2] + "/" + s[1] + "/" + s[0] : ""; }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }

const S = {
  card: "background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:14px;",
  sez: "font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;margin:0 0 10px;",
  riga: "display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:14px;padding:11px 0;border-bottom:1px solid #f1f5f9;",
  small: "display:block;color:#64748b;font-size:12px;margin-top:2px;",
  bozza: "border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:10px 0;background:#fcfdfe;",
  label: "display:block;font-size:12px;font-weight:700;color:#334155;margin:0 0 5px;",
  input: "width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:16px;background:#fff;color:#0f172a;margin-bottom:10px;",
  carica: "display:block;border:2px dashed #94a3b8;border-radius:14px;padding:22px;text-align:center;color:#334155;font-size:14px;background:#f8fafc;cursor:pointer;",
  btnPri: "border:0;border-radius:10px;padding:11px 16px;font-size:14px;font-weight:700;background:#0E5A7A;color:#fff;cursor:pointer;",
  btnSec: "border:1px solid #0E5A7A;border-radius:10px;padding:9px 13px;font-size:14px;font-weight:700;background:#fff;color:#0E5A7A;cursor:pointer;white-space:nowrap;",
  btnLink: "border:0;background:none;color:#b91c1c;font-size:14px;font-weight:600;cursor:pointer;padding:10px 6px;",
  aiuto: "font-size:12px;color:#64748b;",
  avviso: "background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;font-size:13px;color:#92400e;margin-bottom:10px;",
  boxRosso: "background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;font-size:13px;color:#b91c1c;margin-bottom:10px;",
  ok: "background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13px;color:#15803d;",
  pill: "font-size:12px;font-weight:700;border-radius:99px;padding:3px 10px;white-space:nowrap;",
  verde: "background:#dcfce7;color:#15803d;", giallo: "background:#fef3c7;color:#b45309;", rosso: "background:#fee2e2;color:#b91c1c;", blu: "background:#e0f2fe;color:#0E5A7A;", grigio: "background:#f1f5f9;color:#475569;",
};
