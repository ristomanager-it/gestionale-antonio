import { supabase } from "../supabaseClient.js";

/* Impostazioni della fatturazione elettronica dell'azienda attiva.
   Qui l'admin inserisce i dati dell'emittente che finiscono in ogni XML
   (P.IVA, sede, regime, REA, capitale, IBAN). Il database permette la modifica
   solo all'admin dell'azienda (policy fe_config_modifica_admin): i manager
   vedono la schermata in sola lettura.
   Fornitore SDI, ambiente, email registrata e segreto del webhook non si toccano
   da qui: li gestisce il sistema. Il riquadro del collegamento lo vede solo il
   superadmin. */

const REGIMI = [
  { v: "RF01", t: "Ordinario (RF01)" },
  { v: "RF19", t: "Forfettario (RF19)" },
  { v: "RF02", t: "Contribuenti minimi (RF02)" },
];

const COLONNE = "azienda_id, provider, ambiente, partita_iva, ragione_sociale, email_provider, ricezione_attiva, invio_attivo, "
  + "ultimo_sync_il, ultimo_errore, codice_fiscale, pec, indirizzo, cap, comune, provincia, regime_fiscale, "
  + "rea_ufficio, rea_numero, capitale_sociale, socio_unico, iban, sezionale, autofatture_chi, af_sezionale, af_ultimo_numero_esterno";

export async function render(container) {
  document.querySelector(".app-header")?.style.removeProperty("display");
  document.querySelector(".topbar-global")?.style.removeProperty("display");

  const azienda = window.state?.azienda;
  const aziendaId = azienda?.id;
  const superadmin = window.state?.isSuperadmin === true;
  const admin = superadmin || window.state?.ruolo === "admin";

  if (!aziendaId) {
    container.innerHTML = guscio("", avviso("Nessuna azienda attiva."));
    return;
  }

  container.innerHTML = guscio(esc(azienda.nome || azienda.ragione_sociale || ""),
    '<div style="font-size:13px;color:#64748b;">Carico le impostazioni&hellip;</div>');

  const anno = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date()).slice(0, 4));
  const [cfgR, azR] = await Promise.all([
    supabase.from("fe_config").select(COLONNE).eq("azienda_id", aziendaId).maybeSingle(),
    supabase.from("aziende").select("iban").eq("id", aziendaId).maybeSingle(),
  ]);

  if (cfgR.error) {
    console.error("fe_config:", cfgR.error);
    container.innerHTML = guscio("", avviso("Non riesco a leggere le impostazioni. Riprova tra poco."));
    return;
  }
  const cfg = cfgR.data;
  if (!cfg) {
    container.innerHTML = guscio(esc(azienda.nome || ""),
      avviso("La fatturazione elettronica non è ancora attiva per questa azienda. Scrivi a Ristoflow per attivarla."));
    return;
  }
  const ibanAzienda = azR.data?.iban || "";

  const ult = await supabase.from("fatture_vendita").select("numero")
    .eq("azienda_id", aziendaId).eq("anno", anno).eq("sezionale", cfg.sezionale || "")
    .not("numero", "is", null).order("numero", { ascending: false }).limit(1);
  const prossimo = ((ult.data && ult.data[0] && ult.data[0].numero) || 0) + 1;

  disegna(container, azienda, cfg, { admin, superadmin, ibanAzienda, prossimo, anno });
}

function disegna(container, azienda, cfg, ctx) {
  const ro = ctx.admin ? "" : " disabled";
  const mancanti = cosaManca(cfg, ctx.ibanAzienda);

  let h = "";

  // 1. Pronta per fatturare?
  h += card("Pronta per fatturare?",
    (mancanti.length
      ? '<div style="' + S.avviso + '">Mancano ' + mancanti.length + (mancanti.length === 1 ? " dato" : " dati")
        + " prima di emettere fatture vere: " + esc(mancanti.join(", ")) + ".</div>"
      : '<div style="' + S.ok + '">Tutto pronto per emettere.</div>')
    + voce("Dati azienda", gruppoOk(cfg, ["partita_iva", "ragione_sociale", "indirizzo", "cap", "comune", "provincia"]))
    + voce("Iscrizione REA", gruppoOk(cfg, ["rea_ufficio", "rea_numero", "capitale_sociale", "socio_unico"]))
    + voce("IBAN per i bonifici", (cfg.iban || ctx.ibanAzienda) ? pill("Presente", "verde") : pill("Manca", "giallo"))
    + voce("Collegamento allo SDI", cfg.ambiente === "produzione" ? pill("Attivo", "verde") : pill("Prova (sandbox)", "giallo")));

  if (!ctx.admin) {
    h += '<div style="' + S.avviso + '">Puoi vedere le impostazioni, solo l\'amministratore dell\'azienda può modificarle.</div>';
  }

  // 2. Chi emette
  h += card("Chi emette la fattura",
    '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:4px;">'
    + '<div style="flex:1;min-width:180px;">' + etichetta("Partita IVA") + campo("fi-piva", cfg.partita_iva, "11 cifre", ro, "numeric") + "</div>"
    + (ctx.admin ? '<button type="button" id="fi-dapiva" style="' + S.btnSec + 'margin-bottom:10px;">Compila da P.IVA</button>' : "")
    + "</div>"
    + '<div id="fi-piva-esito" style="' + S.aiuto + '">Prende ragione sociale e indirizzo dal registro: controlla e salva.</div>'
    + etichetta("Ragione sociale") + campo("fi-rs", cfg.ragione_sociale, "", ro)
    + griglia2(etichetta("Codice fiscale") + campo("fi-cf", cfg.codice_fiscale, "", ro),
               etichetta("PEC") + campo("fi-pec", cfg.pec, "es. amministrazione@pec.it", ro, "email"))
    + griglia3(etichetta("Indirizzo") + campo("fi-ind", cfg.indirizzo, "", ro),
               etichetta("CAP") + campo("fi-cap", cfg.cap, "5 cifre", ro, "numeric"),
               etichetta("Provincia") + campo("fi-prov", cfg.provincia, "es. VT", ro))
    + etichetta("Comune") + campo("fi-com", cfg.comune, "", ro)
    + etichetta("Regime fiscale")
    + '<select id="fi-regime" style="' + S.input + '"' + ro + ">"
    + REGIMI.map((r) => '<option value="' + r.v + '"' + (cfg.regime_fiscale === r.v ? " selected" : "") + ">" + esc(r.t) + "</option>").join("")
    + (REGIMI.some((r) => r.v === cfg.regime_fiscale) ? "" : '<option value="' + esc(cfg.regime_fiscale) + '" selected>' + esc(cfg.regime_fiscale) + "</option>")
    + "</select>");

  // 3. REA
  h += card("Iscrizione al registro imprese (REA)",
    '<div style="' + S.aiuto + 'margin:0 0 10px;">Per le società va in fattura. Li trovi nella visura camerale.</div>'
    + griglia2(etichetta("Ufficio (provincia)") + campo("fi-reau", cfg.rea_ufficio || cfg.provincia, "es. VT", ro),
               etichetta("Numero REA") + campo("fi-rean", cfg.rea_numero, "es. 123456", ro, "numeric", !cfg.rea_numero))
    + etichetta("Capitale sociale (€)") + campo("fi-cap-soc", cfg.capitale_sociale != null ? String(cfg.capitale_sociale).replace(".", ",") : "", "es. 1000,00", ro, "decimal", cfg.capitale_sociale == null)
    + etichetta("Soci")
    + '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:10px;font-size:14px;">'
    + radio("fi-soci", "SU", "Socio unico", cfg.socio_unico === "SU", ro)
    + radio("fi-soci", "SM", "Più soci", cfg.socio_unico === "SM", ro)
    + "</div>"
    + '<div style="' + S.aiuto + '">Società in liquidazione: no.</div>');

  // 4. Pagamenti e numerazione
  h += card("Pagamenti e numerazione",
    etichetta("IBAN su cui ricevere i bonifici")
    + campo("fi-iban", cfg.iban, ctx.ibanAzienda ? "uguale all'anagrafica: " + mascheraIban(ctx.ibanAzienda) : "IT..", ro)
    + '<div style="' + S.aiuto + '">' + (ctx.ibanAzienda ? "Se lo lasci vuoto si usa quello dell'anagrafica dell'azienda." : "Serve per le fatture pagate con bonifico.") + "</div>"
    + griglia2(etichetta("Prossima fattura") + '<div style="' + S.input + 'background:#f8fafc;color:#475569;">n. ' + ctx.prossimo + (cfg.sezionale ? "/" + esc(cfg.sezionale) : "") + " / " + ctx.anno + "</div>",
               etichetta("Serie (facoltativa)") + campo("fi-serie", cfg.sezionale, "vuota = serie unica", ro))
    + '<div style="' + S.aiuto + '">Il numero lo assegna l\'app quando emetti: non si sceglie a mano.</div>');

  // 5. Collegamento (solo superadmin)
  if (ctx.superadmin) {
    h += card("Collegamento allo SDI · solo superadmin",
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
      + pill("Fornitore: " + esc(cfg.provider), "grigio")
      + pill("Ambiente: " + (cfg.ambiente === "produzione" ? "produzione" : "prova"), cfg.ambiente === "produzione" ? "verde" : "giallo")
      + pill("Ricezione " + (cfg.ricezione_attiva ? "attiva" : "spenta"), cfg.ricezione_attiva ? "verde" : "giallo")
      + pill("Invio " + (cfg.invio_attivo ? "attivo" : "spento"), cfg.invio_attivo ? "verde" : "giallo")
      + "</div>"
      + (cfg.ambiente !== "produzione" ? '<div style="' + S.avviso + '">Ambiente di prova: le fatture non arrivano allo SDI vero.</div>' : "")
      + etichetta("Email registrata presso il fornitore")
      + '<div style="' + S.input + 'background:#f8fafc;color:#475569;">' + esc(cfg.email_provider || "—") + "</div>"
      + '<div style="' + S.aiuto + '">Non si può cambiare dopo la registrazione.</div>'
      + voce("Ultimo controllo", esc(dataOra(cfg.ultimo_sync_il)))
      + voce("Ultimo errore", cfg.ultimo_errore ? '<span style="color:#b91c1c;">' + esc(cfg.ultimo_errore) + "</span>" : '<span style="color:#15803d;">nessuno</span>')
      + '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:10px;">'
      + '<button type="button" id="fi-controlla" style="' + S.btnSec + '">Controlla ora</button>'
      + '<button type="button" id="fi-ricollega" style="' + S.btnSec + '">Ricollega</button>'
      + "</div>"
      + '<div id="fi-sdi-esito" style="' + S.aiuto + 'margin-top:8px;"></div>');
  }

  h += '<div id="fi-esito" style="margin:4px 0 10px;"></div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">'
    + '<a href="#/home" style="' + S.btnSec + 'text-decoration:none;">&larr; Torna</a>'
    + (ctx.admin ? '<button type="button" id="fi-salva" style="' + S.btnPri + '">Salva</button>' : "")
    + "</div>";

  container.innerHTML = guscio(esc(azienda.nome || azienda.ragione_sociale || ""), h);

  if (ctx.admin) collegaAzioni(container, azienda, cfg, ctx);
  if (ctx.superadmin) collegaSdi(container, azienda);
}

function collegaAzioni(container, azienda, cfg, ctx) {
  const $ = (id) => container.querySelector("#" + id);

  $("fi-dapiva").addEventListener("click", async () => {
    const piva = String($("fi-piva").value || "").replace(/\D/g, "");
    const out = $("fi-piva-esito");
    if (piva.length !== 11) { out.textContent = "Scrivi una P.IVA di 11 cifre."; return; }
    out.textContent = "Cerco nel registro…";
    const r = await chiama("anagrafica-piva", { piva });
    if (!r.ok || !r.anagrafica) { out.textContent = "Non trovata: " + (r.errore || "riprova") ; return; }
    const a = r.anagrafica;
    const metti = (id, v) => { if (v) $(id).value = v; };
    metti("fi-rs", a.ragione_sociale); metti("fi-cf", a.codice_fiscale || piva); metti("fi-pec", a.pec);
    metti("fi-ind", a.indirizzo); metti("fi-cap", a.cap); metti("fi-com", a.citta); metti("fi-prov", a.provincia);
    out.textContent = a.vies_valida === false
      ? "Attenzione: il VIES dice che questa P.IVA non è attiva per operazioni UE. Controlla i dati."
      : "Dati compilati dal registro. Controlla e premi Salva.";
  });

  $("fi-salva").addEventListener("click", async () => {
    const esito = $("fi-esito");
    const v = (id) => String($(id).value || "").trim();
    const capSoc = v("fi-cap-soc").replace(/\./g, "").replace(",", ".");
    const sociSel = container.querySelector('input[name="fi-soci"]:checked');
    const dati = {
      partita_iva: v("fi-piva").replace(/\D/g, ""),
      ragione_sociale: v("fi-rs") || null,
      codice_fiscale: v("fi-cf").toUpperCase() || null,
      pec: v("fi-pec").toLowerCase() || null,
      indirizzo: v("fi-ind") || null,
      cap: v("fi-cap") || null,
      comune: v("fi-com") || null,
      provincia: v("fi-prov").toUpperCase() || null,
      regime_fiscale: $("fi-regime").value,
      rea_ufficio: v("fi-reau").toUpperCase() || null,
      rea_numero: v("fi-rean").replace(/\s/g, "") || null,
      capitale_sociale: capSoc ? Number(capSoc) : null,
      socio_unico: sociSel ? sociSel.value : null,
      iban: v("fi-iban").replace(/\s/g, "").toUpperCase() || null,
      sezionale: v("fi-serie").toUpperCase(),
      updated_at: new Date().toISOString(),
    };

    const errori = [];
    if (!/^\d{11}$/.test(dati.partita_iva)) errori.push("P.IVA di 11 cifre");
    if (dati.cap && !/^\d{5}$/.test(dati.cap)) errori.push("CAP di 5 cifre");
    if (dati.provincia && !/^[A-Z]{2}$/.test(dati.provincia)) errori.push("provincia di 2 lettere (es. VT)");
    if (dati.rea_ufficio && !/^[A-Z]{2}$/.test(dati.rea_ufficio)) errori.push("ufficio REA di 2 lettere");
    if (dati.capitale_sociale != null && !(dati.capitale_sociale >= 0)) errori.push("capitale sociale in euro");
    if (dati.pec && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(dati.pec)) errori.push("PEC valida");
    if (dati.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(dati.iban)) errori.push("IBAN valido");
    if (errori.length) { esito.innerHTML = '<div style="' + S.avviso + '">Controlla: ' + esc(errori.join(", ")) + ".</div>"; return; }

    $("fi-salva").disabled = true;
    esito.innerHTML = '<div style="font-size:13px;color:#64748b;">Salvo…</div>';
    const { data, error } = await supabase.from("fe_config").update(dati).eq("azienda_id", azienda.id).select("azienda_id");
    $("fi-salva").disabled = false;
    if (error || !data || !data.length) {
      console.error("salva fe_config:", error);
      esito.innerHTML = '<div style="' + S.avviso + '">Non salvato' + (error ? ": " + esc(error.message) : ": serve il ruolo di amministratore") + ".</div>";
      return;
    }
    esito.innerHTML = '<div style="' + S.ok + '">Salvato.</div>';
    setTimeout(() => render(container), 700);
  });
}

function collegaSdi(container, azienda) {
  const out = container.querySelector("#fi-sdi-esito");
  const azione = async (nome, testo) => {
    out.textContent = testo;
    const r = await chiama("fe-ponte", { azienda_id: azienda.id, azione: nome });
    out.textContent = r.ok
      ? (nome === "aggiorna" ? "Fatto: " + (r.esiti_aggiornati || 0) + " esiti aggiornati, " + (r.ricevute_nuove || 0) + " fatture ricevute nuove." : "Collegamento rifatto.")
      : "Errore: " + (r.errore || "riprova");
  };
  container.querySelector("#fi-controlla").addEventListener("click", () => azione("aggiorna", "Controllo in corso…"));
  container.querySelector("#fi-ricollega").addEventListener("click", () => {
    if (confirm("Rifaccio la registrazione dei collegamenti presso il fornitore?")) azione("configura", "Ricollego…");
  });
}

// le Edge Functions rispondono con errori leggibili anche su 4xx: si legge il corpo
async function chiama(nome, body) {
  try {
    const { data, error } = await supabase.functions.invoke(nome, { body });
    if (!error) return data || {};
    try { const j = await error.context.json(); return Object.assign({ ok: false }, j); } catch (e) { return { ok: false, errore: error.message }; }
  } catch (e) {
    return { ok: false, errore: String(e && e.message ? e.message : e) };
  }
}

function cosaManca(cfg, ibanAzienda) {
  const m = [];
  if (!cfg.partita_iva) m.push("P.IVA");
  if (!cfg.indirizzo || !cfg.cap || !cfg.comune || !cfg.provincia) m.push("sede completa");
  if (!cfg.rea_numero) m.push("numero REA");
  if (cfg.capitale_sociale == null) m.push("capitale sociale");
  if (!cfg.socio_unico) m.push("socio unico o più soci");
  if (!cfg.iban && !ibanAzienda) m.push("IBAN");
  return m;
}
function gruppoOk(cfg, campi) {
  return campi.every((c) => cfg[c] != null && cfg[c] !== "") ? pill("Completi", "verde") : pill("Da completare", "giallo");
}
function mascheraIban(i) { const s = String(i).replace(/\s/g, ""); return s.length > 8 ? s.slice(0, 4) + " •••• " + s.slice(-4) : s; }
function dataOra(t) {
  if (!t) return "mai";
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(t));
}

const S = {
  card: "background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:14px;",
  sez: "font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#94a3b8;margin:0 0 10px;",
  label: "display:block;font-size:12px;font-weight:700;color:#334155;margin:0 0 4px;",
  input: "display:block;width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:16px;background:#fff;margin-bottom:10px;color:#0f172a;",
  aiuto: "font-size:11px;color:#64748b;margin:-6px 0 10px;",
  avviso: "background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;font-size:13px;color:#92400e;margin-bottom:10px;",
  ok: "background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;font-size:13px;color:#15803d;margin-bottom:10px;",
  btnPri: "border:0;border-radius:10px;padding:11px 16px;font-size:14px;font-weight:700;background:#0E5A7A;color:#fff;cursor:pointer;",
  btnSec: "border:1px solid #0E5A7A;border-radius:10px;padding:10px 14px;font-size:14px;font-weight:700;background:#fff;color:#0E5A7A;cursor:pointer;",
};
const PILL = { verde: "background:#dcfce7;color:#15803d;", giallo: "background:#fef3c7;color:#b45309;", grigio: "background:#e2e8f0;color:#334155;" };

function guscio(nome, corpo) {
  return '<div style="max-width:760px;margin:24px auto;padding:0 16px 40px;">'
    + '<h1 style="font-size:1.4rem;font-weight:800;color:#0f172a;margin:0 0 2px;">Fatturazione elettronica</h1>'
    + '<div style="font-size:13px;color:#64748b;margin-bottom:18px;">' + (nome ? nome + " · " : "") + "Impostazioni</div>"
    + corpo + "</div>";
}
function card(titolo, corpo) { return '<div style="' + S.card + '"><div style="' + S.sez + '">' + esc(titolo) + "</div>" + corpo + "</div>"; }
function etichetta(t) { return '<label style="' + S.label + '">' + esc(t) + "</label>"; }
function campo(id, val, ph, ro, mode, manca) {
  return '<input id="' + id + '" style="' + S.input + (manca ? "border-color:#f59e0b;background:#fffbeb;" : "") + '" value="' + esc(val == null ? "" : val) + '" placeholder="' + esc(ph || "") + '"'
    + (mode ? ' inputmode="' + mode + '"' : "") + ' autocomplete="off"' + (ro || "") + ">";
}
function radio(nome, val, testo, on, ro) {
  return '<label style="display:flex;gap:6px;align-items:center;"><input type="radio" name="' + nome + '" value="' + val + '"' + (on ? " checked" : "") + (ro || "") + ">" + esc(testo) + "</label>";
}
function griglia2(a, b) { return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 10px;"><div>' + a + "</div><div>" + b + "</div></div>"; }
function griglia3(a, b, c) { return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0 10px;"><div>' + a + "</div><div>" + b + "</div><div>" + c + "</div></div>"; }
function voce(t, v) { return '<div style="display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:8px 0;border-bottom:1px solid #f1f5f9;"><span>' + esc(t) + "</span><span>" + v + "</span></div>"; }
function pill(t, c) { return '<span style="font-size:12px;font-weight:700;border-radius:99px;padding:5px 10px;' + PILL[c] + '">' + t + "</span>"; }
function avviso(t) { return '<div style="' + S.avviso + '">' + esc(t) + "</div>"; }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
