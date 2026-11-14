// js/views/fatture-situazione.js
// Situazione fatture del mese: si apre dal pulsante "Fatture" nella home Gestione.
// Ordine: prima quello che va sistemato, poi l'IVA da versare, poi come va il mese.
// IVA e incassi arrivano da situazione_iva(): la stessa funzione del Fascicolo IVA del Ragioniere,
// cosi' le due pagine danno sempre lo stesso numero.

const sb = () => window.supabaseClient || window.supabase;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const euro = (n) => Number(n || 0).toLocaleString("it-IT", { maximumFractionDigits: 0 }) + " €";
const p2 = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const EMESSE = ["emessa", "inviata", "consegnata", "mancata_consegna", "accettata", "decorrenza_termini"];

const CSS = `
.fs{max-width:1100px;margin:0 auto;padding:16px}
.fs-card{background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:18px 20px}
.fs-testa{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.fs-testa h2{margin:0;font-size:19px;color:#1F2937}
.fs-sub{font-size:13px;color:#6B7280;margin-top:3px}
.fs-btn{display:inline-block;background:#0E5A7A;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:9px 14px;border-radius:9px;white-space:nowrap}
.fs-btn.sec{background:#EEF2F7;color:#0E5A7A}
.fs-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:4px 9px;border-radius:999px}
.fs-chip i{width:7px;height:7px;border-radius:50%;display:inline-block}
.fs-al{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.fs-a{display:flex;align-items:center;gap:12px;border-radius:10px;padding:11px 14px;font-size:14px;text-decoration:none}
.fs-a .ic{font-size:18px;width:22px;text-align:center}
.fs-a .tx{flex:1}
.fs-a .vai{font-size:13px;font-weight:700;white-space:nowrap}
.fs-a.r{background:#FDECEA;color:#7b241c}.fs-a.r .vai{color:#C0392B}
.fs-a.g{background:#FEF5E7;color:#7e5109}.fs-a.g .vai{color:#B7791F}
.fs-a.v{background:#E9F7EF;color:#1E8449}
.fs-gr{display:grid;grid-template-columns:330px 1fr;gap:16px}
.fs-box{border:1px solid #E5E7EB;border-radius:12px;padding:16px}
.fs-box h3{margin:0 0 3px;font-size:15px;color:#1F2937}
.fs-riga{display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-bottom:1px solid #f1f3f5}
.fs-riga span:last-child{font-weight:600;font-variant-numeric:tabular-nums}
.fs-riga.tot{border:0;padding-top:12px;font-size:16px}
.fs-riga.tot span:last-child{font-size:22px}
.fs-nota{margin-top:10px;font-size:12.5px;color:#6B7280;background:#EEF2F7;border-radius:8px;padding:8px 10px}
.fs-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:10px 0 14px}
.fs-k{background:#EEF2F7;border-radius:10px;padding:10px 12px}
.fs-k .l{font-size:12px;color:#6B7280}.fs-k .v{font-size:19px;font-weight:700;font-variant-numeric:tabular-nums}.fs-k .d{font-size:11.5px;color:#6B7280}
.fs-graf{display:flex;align-items:flex-end;gap:14px;height:170px;border-bottom:1px solid #E5E7EB;padding:0 6px}
.fs-m{flex:1;display:flex;justify-content:center;align-items:flex-end;gap:4px;height:100%}
.fs-col{width:22px;height:100%;display:flex;flex-direction:column-reverse;justify-content:flex-start}
.fs-col b:last-child{border-radius:4px 4px 0 0}
.fs-col b{display:block}
.fs-et{display:flex;gap:14px;padding:6px 6px 0}.fs-et span{flex:1;text-align:center;font-size:12px;color:#6B7280}.fs-et span.o{color:#1F2937;font-weight:700}
.fs-leg{display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:#6B7280;margin-top:10px}
.fs-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.fs-link{display:inline-block;margin-top:10px;font-size:13px;font-weight:700;color:#0E5A7A;text-decoration:none}
@media (max-width:820px){
  .fs{padding:10px}.fs-card{padding:14px}.fs-gr{grid-template-columns:1fr}
  .fs-kpi{grid-template-columns:1fr 1fr}.fs-k .v{font-size:17px}
  .fs-a{align-items:flex-start;flex-wrap:wrap}.fs-a .vai{width:100%;padding-left:34px}
  .fs-graf{height:120px;gap:8px}.fs-col{width:13px}.fs-et{gap:8px}.fs-et span{font-size:11px}
  .fs-testa .azioni{width:100%;display:flex;gap:8px}.fs-testa .azioni a{flex:1;text-align:center}
}`;

export async function render(container) {
  const az = window.state?.azienda;
  if (!az?.id) { container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Nessuna azienda attiva.</div>'; return; }
  container.innerHTML = '<style>' + CSS + '</style><div class="fs"><div class="fs-card"><div class="fs-sub">Un attimo…</div></div></div>';

  const oggi = new Date();
  const anno = oggi.getFullYear(), mese = oggi.getMonth() + 1;
  const mesi = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(anno, mese - 1 - i, 1);
    mesi.push({ anno: d.getFullYear(), mese: d.getMonth() + 1, da: iso(d), a: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) });
  }
  const tra7 = iso(new Date(Date.now() + 7 * 86400000));
  const da30 = iso(new Date(Date.now() - 30 * 86400000));
  const tre = new Date(Date.now() - 3 * 86400000).toISOString();

  const [sit, scartate, bozze, pag, cfg, ultima] = await Promise.all([
    Promise.all(mesi.map((m) => sb().rpc("situazione_iva", { p_azienda: az.id, p_da: m.da, p_a: m.a }).then((r) => r.data || null, () => null))),
    sb().from("fatture_vendita").select("id, numero, sezionale, cliente_denominazione, cliente_nome, cliente_cognome, ultimo_errore, stato").eq("azienda_id", az.id).in("stato", ["scartata", "errore"]).neq("sezionale", "PROVA").order("data_documento", { ascending: false }).limit(20),
    sb().from("fatture_vendita").select("id, created_at, cliente_denominazione, cliente_nome, cliente_cognome").eq("azienda_id", az.id).eq("stato", "bozza").neq("sezionale", "PROVA").lt("created_at", tre).order("created_at", { ascending: true }).limit(20),
    sb().from("fatture_acquisto").select("id, data_scadenza, importo_da_pagare, totale").eq("azienda_id", az.id).gte("data_scadenza", da30).lte("data_scadenza", tra7).neq("tipo_documento", "nota_credito").limit(300),
    sb().from("fe_config").select("ambiente, ricezione_attiva, ultimo_errore, ultimo_sync_il").eq("azienda_id", az.id).maybeSingle(),
    sb().from("fiscale_documenti").select("created_at").eq("azienda_id", az.id).eq("sdi_stato", "ricevuta").order("created_at", { ascending: false }).limit(1),
  ]);

  // fornitori: scadenze fino a 7 giorni (e scadute nell'ultimo mese) non ancora pagate
  // se l'azienda non ha mai segnato un pagamento in Ristoflow, le scadute non si possono distinguere da quelle
  // pagate fuori: in quel caso si mostrano solo le scadenze dei prossimi 7 giorni
  const oggiIso = iso(oggi);
  let daPagare = [];
  if ((pag.data || []).length) {
    const [{ data: pagate }, { count: nPag }] = await Promise.all([
      sb().from("pagamenti_fatture_acquisto").select("fattura_id").in("fattura_id", pag.data.map((x) => x.id)),
      sb().from("pagamenti_fatture_acquisto").select("id", { count: "exact", head: true }).eq("azienda_id", az.id),
    ]);
    const gia = new Set((pagate || []).map((x) => x.fattura_id));
    daPagare = pag.data.filter((x) => !gia.has(x.id) && (nPag > 0 || x.data_scadenza >= oggiIso));
  }
  const scadute = daPagare.filter((x) => x.data_scadenza < oggiIso).length;
  const totPagare = daPagare.reduce((t, x) => t + Number(x.importo_da_pagare || x.totale || 0), 0);

  // ---------- avvisi ----------
  const nome = (f) => f.cliente_denominazione || ((f.cliente_nome || "") + " " + (f.cliente_cognome || "")).trim() || "cliente";
  let al = "";
  const sc = scartate.data || [];
  if (sc.length) {
    const f = sc[0];
    al += '<a class="fs-a r" href="#/fatture-emesse?id=' + f.id + '"><span class="ic">⛔</span><span class="tx"><b>' + sc.length + (sc.length === 1 ? " fattura non accettata dallo SDI" : " fatture non accettate dallo SDI") + "</b> — non valgono finché non le reinvii."
      + (f.ultimo_errore ? " " + esc((f.numero ? "La " + f.numero + (f.sezionale ? "/" + f.sezionale : "") + ": " : "") + String(f.ultimo_errore).slice(0, 120)) : "") + '</span><span class="vai">Correggi →</span></a>';
  }
  if (daPagare.length) {
    al += '<a class="fs-a ' + (scadute ? "r" : "g") + '" href="#/fatture-emesse?vista=scadenze"><span class="ic">⏰</span><span class="tx"><b>' + daPagare.length + (daPagare.length === 1 ? " fattura fornitore" : " fatture fornitori") + " da pagare entro 7 giorni</b> · " + euro(totPagare)
      + (scadute ? " · " + scadute + (scadute === 1 ? " già scaduta" : " già scadute") : "") + '</span><span class="vai">Scadenzario →</span></a>';
  }
  const bz = bozze.data || [];
  if (bz.length) {
    const d = new Date(bz[0].created_at);
    al += '<a class="fs-a g" href="#/fatture-emesse?id=' + bz[0].id + '"><span class="ic">✏️</span><span class="tx"><b>' + (bz.length === 1 ? "1 bozza ferma" : bz.length + " bozze ferme") + " dal " + d.getDate() + " " + MESI[d.getMonth()].toLowerCase() + "</b> — " + esc(nome(bz[0])) + '</span><span class="vai">Apri →</span></a>';
  }
  if (!al) al = '<div class="fs-a v"><span class="ic">✅</span><span class="tx"><b>Tutto in ordine</b> — nessuna fattura da sistemare.</span></div>';

  // ---------- collegamento SDI ----------
  const c = cfg.data;
  let chip;
  if (!c) chip = ["#EEF2F7", "#6B7280", "Fatturazione elettronica da attivare"];
  else if (c.ambiente !== "produzione") chip = ["#EEF2F7", "#6B7280", "In prova (sandbox)"];
  else if (c.ultimo_errore) chip = ["#FDECEA", "#C0392B", "Collegamento SDI da controllare"];
  else {
    const u = (ultima.data || [])[0];
    const quando = u ? new Date(u.created_at) : null;
    chip = ["#E9F7EF", "#1E8449", "Collegato allo SDI" + (quando ? " · ultima ricevuta " + (iso(quando) === oggiIso ? "oggi " + p2(quando.getHours()) + ":" + p2(quando.getMinutes()) : quando.toLocaleDateString("it-IT")) : "")];
  }

  // ---------- IVA del mese ----------
  const s = sit[5] || {};
  const nAc = Number(s.acquisti?.note_credito?.n) || 0;
  const saldo = Number(s.saldo) || 0;
  const giorniMese = new Date(anno, mese, 0).getDate();
  const scadIva = "16 " + MESI[mese % 12].toLowerCase();
  let iva = '<div class="fs-box"><h3>IVA di ' + MESI[mese - 1].toLowerCase() + '</h3><div class="fs-sub" style="margin-bottom:10px;">stima sui documenti arrivati fino a oggi</div>'
    + '<div class="fs-riga"><span>IVA sugli scontrini</span><span>' + euro(s.scontrini?.iva) + "</span></div>"
    + '<div class="fs-riga"><span>IVA sulle fatture emesse</span><span>' + euro(s.fatture?.iva) + "</span></div>"
    + '<div class="fs-riga"><span>IVA sugli acquisti' + (nAc ? " (" + nAc + " note di credito tolte)" : "") + "</span><span>− " + euro(s.acquisti?.iva) + "</span></div>"
    + '<div class="fs-riga tot"><span>' + (saldo >= 0 ? "Da versare" : "A credito") + '</span><span style="color:' + (saldo >= 0 ? "#C0392B" : "#1E8449") + '">' + euro(Math.abs(saldo)) + "</span></div>"
    + '<div class="fs-nota">' + (saldo >= 0 ? "Versamento entro il <b>" + scadIva + "</b>. " : "")
    + (oggi.getDate() < giorniMese ? "Mancano ancora " + (giorniMese - oggi.getDate()) + " giorni di incassi e di fatture fornitori: la cifra cambierà." : "Il mese è chiuso: mancano solo le fatture fornitori in arrivo.") + "</div>"
    + '<a class="fs-link" href="#/bo-bilancio?anno=' + anno + "&mese=" + mese + '&iva=1">Vedi il dettaglio IVA →</a></div>';

  // ---------- incassi e costi ----------
  const v = (x) => ({
    sc: Number(x?.scontrini?.imponibile) || 0, ft: Number(x?.fatture?.imponibile) || 0,
    me: Number(x?.acquisti?.merce) || 0, al: Number(x?.acquisti?.altre) || 0,
  });
  const serie = sit.map(v);
  const scelto = 4; // i riquadri mostrano il mese scorso, l'ultimo completo; il mese in corso sta solo nel grafico
  const ms = serie[scelto], mp = serie[scelto - 1];
  const inc = ms.sc + ms.ft, cos = ms.me + ms.al, diff = inc - cos;
  // oltre il 100% vuol dire che mancano gli incassi, non che la merce costa piu' di quanto si vende
  const perc = (me, i) => (i > 0 && me / i <= 1 ? Math.round(me / i * 100) : null);
  const pMerce = perc(ms.me, inc);
  const pPrec = perc(mp.me, mp.sc + mp.ft);
  const nomeMs = MESI[mesi[scelto].mese - 1].toLowerCase();
  const max = Math.max(1, ...serie.map((x) => Math.max(x.sc + x.ft, x.me + x.al)));
  const h = (n) => Math.max(0, n / max * 100).toFixed(1) + "%"; // in percentuale: la stessa barra va bene su computer e telefono
  const barre = serie.map((x, i) => '<div class="fs-m" style="' + (i === 5 ? "opacity:.7" : "") + '">'
    + '<div class="fs-col"><b style="height:' + h(x.sc) + ';background:#0E5A7A"></b><b style="height:' + h(x.ft) + ';background:#7FB3CC"></b></div>'
    + '<div class="fs-col"><b style="height:' + h(x.me) + ';background:#E67E22"></b><b style="height:' + h(x.al) + ';background:#F5C08F"></b></div></div>').join("");
  const fonti = sit[scelto]?.fonti_scontrini || {};
  const senzaScontrini = !ms.sc && !(fonti.cassa || fonti.rt || fonti.ipratico);

  const andamento = '<div class="fs-box"><h3>Incassi e costi</h3><div class="fs-sub">IVA esclusa · ultimi 6 mesi · ' + MESI[mese - 1].toLowerCase() + " fino a oggi</div>"
    + '<div class="fs-kpi">'
    + '<div class="fs-k"><div class="l">Incassi ' + nomeMs + '</div><div class="v">' + euro(inc) + '</div><div class="d">' + euro(ms.sc) + " scontrini · " + euro(ms.ft) + " fatture</div></div>"
    + '<div class="fs-k"><div class="l">Costi ' + nomeMs + '</div><div class="v">' + euro(cos) + '</div><div class="d">' + euro(ms.me) + " merce · " + euro(ms.al) + " spese</div></div>"
    + '<div class="fs-k"><div class="l">Differenza ' + nomeMs + '</div><div class="v" style="color:' + (diff >= 0 ? "#1E8449" : "#C0392B") + '">' + (diff >= 0 ? "+ " : "− ") + euro(Math.abs(diff)) + '</div><div class="d">prima di personale e tasse</div></div>'
    + '<div class="fs-k"><div class="l">Merce su incassi</div><div class="v">' + (pMerce == null ? "—" : pMerce + "%") + '</div><div class="d">' + (pPrec == null ? "" : MESI[mesi[scelto - 1].mese - 1].toLowerCase() + " " + pPrec + "%") + "</div></div>"
    + "</div>"
    + '<div class="fs-graf">' + barre + "</div>"
    + '<div class="fs-et">' + mesi.map((m, i) => '<span class="' + (i === 5 ? "o" : "") + '">' + MESI[m.mese - 1].slice(0, 3) + "</span>").join("") + "</div>"
    + '<div class="fs-leg"><span><i style="background:#0E5A7A"></i>Scontrini</span><span><i style="background:#7FB3CC"></i>Fatture emesse</span><span><i style="background:#E67E22"></i>Merce</span><span><i style="background:#F5C08F"></i>Spese generali</span></div>'
    + (senzaScontrini ? '<div class="fs-nota">Nessuno scontrino registrato a ' + nomeMs + ": gli incassi compaiono quando si usa la cassa Ristoflow.</div>" : "")
    + (!(Number(sit[scelto]?.acquisti?.n) > 0) ? '<div class="fs-nota">Nessuna fattura fornitore di ' + nomeMs + " in Ristoflow: i costi compaiono quando le fatture arrivano dallo SDI.</div>" : "")
    + "</div>";

  container.innerHTML = '<style>' + CSS + '</style><div class="fs"><div class="fs-card">'
    + '<div class="fs-testa"><div><h2>🧾 Fatture · ' + MESI[mese - 1] + " " + anno + '</h2><div class="fs-sub">aggiornato alle ' + p2(oggi.getHours()) + ":" + p2(oggi.getMinutes())
    + ' &nbsp; <span class="fs-chip" style="background:' + chip[0] + ";color:" + chip[1] + '"><i style="background:' + chip[1] + '"></i>' + esc(chip[2]) + "</span></div></div>"
    + '<div class="azioni"><a class="fs-btn sec" href="#/fatture-emesse?vista=libera">Nuova fattura</a> <a class="fs-btn" href="#/fatture-emesse">Apri fatture</a></div></div>'
    + '<div class="fs-al">' + al + "</div>"
    + '<div class="fs-gr">' + iva + andamento + "</div>"
    + "</div></div>";
}
