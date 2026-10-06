import { inviaEtichetteLotto, scegliFormatoEtichetta } from "../modules/produzione/etichette-lotto.js?v=20261006";
/* =========================================================
   REGISTRO LOTTI — storico produzioni (sola lettura)
   Tutti i lotti (aperta/firmato/chiuso/...) con filtri e dettaglio HACCP
   ========================================================= */

let lottiCache = [];

const STATO_LABEL = {
  aperta: { t: "🟢 Aperta", c: "#16a34a" },
  firmato: { t: "✅ Chiusa", c: "#0E5A7A" },
  chiuso: { t: "✅ Chiusa", c: "#0E5A7A" },
  bozza: { t: "✏️ Bozza", c: "#94a3b8" },
  confermato: { t: "🔵 Confermata", c: "#2563eb" },
  annullato: { t: "✖ Annullata", c: "#dc2626" },
};

export async function render(app) {
  const azienda = window.state?.azienda;
  app.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;padding:16px;">
      <h1 style="margin:0 0 4px;font-size:22px;">📒 Registro lotti</h1>
      <div style="color:#64748b;font-size:13px;margin-bottom:16px;">${escapeHtml(azienda?.nome || "")} — storico delle produzioni</div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:end;">
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Stato</label>
          <select id="rl-stato" class="input"><option value="">Tutti</option><option value="aperta">Aperte</option><option value="firmato">Chiuse</option><option value="annullato">Annullate</option></select>
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Dal</label>
          <input id="rl-dal" type="date" class="input">
        </div>
        <div>
          <label style="font-size:12px;color:#64748b;display:block;">Al</label>
          <input id="rl-al" type="date" class="input">
        </div>
        <div style="flex:1;min-width:180px;">
          <label style="font-size:12px;color:#64748b;display:block;">Cerca (ricetta / lotto)</label>
          <input id="rl-cerca" class="input" placeholder="Es: Impasto pane" style="width:100%;box-sizing:border-box;">
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <button id="rl-stampa-registro" style="background:#fff;color:#0E5A7A;border:1px solid #0E5A7A;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;">🖨 Stampa registro</button>
      </div>

      <div id="rl-lista"><div style="color:#64748b;">Caricamento...</div></div>
    </div>
  `;

  ["rl-stato", "rl-dal", "rl-al"].forEach(id => document.getElementById(id)?.addEventListener("change", carica));
  document.getElementById("rl-cerca")?.addEventListener("input", () => renderLista());
  document.getElementById("rl-stampa-registro")?.addEventListener("click", stampaRegistro);

  await carica();

  // Arrivo da un comando vocale: apro subito quel lotto (e, se chiesto, la sua etichetta)
  const pr = window.routeParams || {};
  if (pr.lotto) {
    const card = document.querySelector(`[data-lotto="${CSS.escape(String(pr.lotto))}"]`);
    if (card) {
      await toggleDettaglio(card);
      card.scrollIntoView({ behavior: "smooth", block: "start" });
      if (pr.etichetta) setTimeout(() => card.querySelector(".rl-compila")?.click(), 300);
    }
  }
}

async function carica() {
  const cont = document.getElementById("rl-lista");
  const stato = document.getElementById("rl-stato")?.value || "";
  const dal = document.getElementById("rl-dal")?.value || "";
  const al = document.getElementById("rl-al")?.value || "";

  let q = window.supabaseClient
    .from("produzione_lotti")
    .select("id, lotto_uuid, codice_lotto, data_produzione, data_scadenza, quantita_output, unita_misura, luogo, note, stato, created_at, firmato_at, ricette(nome, codice), dipendenti!produzione_lotti_operatore_id_fkey(nome)")
    .eq("azienda_id", window.state.azienda.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (stato) q = q.eq("stato", stato);
  if (dal) q = q.gte("data_produzione", dal);
  if (al) q = q.lte("data_produzione", al);

  const { data, error } = await q;
  if (error) { cont.innerHTML = `<div style="color:#dc2626;">Errore: ${escapeHtml(error.message)}</div>`; return; }
  lottiCache = data || [];
  renderLista();
}

function renderLista() {
  const cont = document.getElementById("rl-lista");
  const cerca = (document.getElementById("rl-cerca")?.value || "").toLowerCase().trim();
  let lotti = lottiCache;
  if (cerca) lotti = lotti.filter(l => ((l.ricette?.nome || "") + " " + (l.codice_lotto || "")).toLowerCase().includes(cerca));

  if (!lotti.length) { cont.innerHTML = `<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;color:#64748b;">Nessun lotto trovato.</div>`; return; }

  cont.innerHTML = `<div style="font-size:12px;color:#64748b;margin-bottom:8px;">${lotti.length} lotti</div>` + lotti.map(l => {
    const st = STATO_LABEL[l.stato] || { t: l.stato || "—", c: "#64748b" };
    const nome = l.ricette?.nome || "Ricetta";
    const dataP = l.data_produzione ? new Date(l.data_produzione).toLocaleDateString("it-IT") : "—";
    const scad = l.data_scadenza ? new Date(l.data_scadenza).toLocaleDateString("it-IT") : "—";
    const op = l.dipendenti?.nome || "";
    return `
      <div class="card" data-lotto="${l.lotto_uuid || ""}" data-id="${l.id}" style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;margin-bottom:8px;cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;">${escapeHtml(nome)} <span style="color:${st.c};font-size:12px;font-weight:700;margin-left:6px;">${st.t}</span></div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">
              ${l.codice_lotto ? escapeHtml(l.codice_lotto) + " · " : ""}Prod. ${dataP} · Scad. ${scad}${l.quantita_output ? " · " + formatNum(l.quantita_output) + " " + escapeHtml(l.unita_misura || "kg") : ""}${l.luogo ? " · 📍 " + escapeHtml(l.luogo) : ""}${op ? " · " + escapeHtml(op) : ""}
            </div>
          </div>
          <div style="font-size:12px;color:#0E5A7A;">dettaglio ▾</div>
        </div>
        <div class="rl-dettaglio" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;"></div>
      </div>`;
  }).join("");

  cont.querySelectorAll("[data-lotto]").forEach(card => {
    card.addEventListener("click", () => toggleDettaglio(card));
  });
}

async function toggleDettaglio(card) {
  const box = card.querySelector(".rl-dettaglio");
  if (!box) return;
  if (box.style.display === "block") { box.style.display = "none"; return; }
  const uuid = card.dataset.lotto;
  const id = card.dataset.id;
  box.style.display = "block";
  box.innerHTML = `<div style="font-size:12px;color:#64748b;">Caricamento scheda...</div>`;

  const supa = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;

  const lotto = lottiCache.find(l => String(l.id) === String(id)) || {};

  const [fasiRes, ingrRes, lottoRes, prodRes] = await Promise.all([
    uuid ? supa.from("produzione_log_haccp")
      .select("fase_ordine, fase_nome, temperatura_rilevata, valore_misurato, valore_um, durata_reale_min, ccp, esito, firmato_da, operatore_nome, firmato_il, note")
      .eq("lotto_id", uuid).order("fase_ordine", { nullsFirst: false }) : Promise.resolve({ data: [] }),
    supa.from("produzione_lotto_ingredienti")
      .select("id, prodotto_id, quantita, unita_misura, costo_totale, lotto_materia_prima, scadenza_materia_prima, lotto_interno_id, scelto_auto, prodotti(nome, ricetta_id)")
      .eq("lotto_id", id),
    supa.from("produzione_lotti")
      .select("id, ricetta_id, dettaglio_confezionamento, conforme, nc_motivo, firma_tramite, note, quantita_output, unita_misura, data_scadenza, codice_lotto, data_produzione, conservazione_libera, durata_min, scarto_quantita, destinazione, prodotto_lavorato_id, inizio_at, fine_at")
      .eq("id", id).maybeSingle(),
    supa.from("etichette_produttore")
      .select("ragione_sociale, indirizzo, stabilimento, partita_iva, marchio")
      .eq("azienda_id", azienda?.id).maybeSingle(),
  ]);

  const fasi = fasiRes?.data || [];
  const ingredienti = ingrRes?.data || [];
  const info = lottoRes?.data || {};
  const produttore = prodRes?.data || null;

  let etichetta = null;
  if (info.ricetta_id) {
    const { data } = await supa.from("etichette")
      .select("id, denominazione, denominazione_extra, ingredienti, allergeni, peso_netto_g, peso_sgocciolato_g, tmc_dicitura, conservazione, dopo_apertura, origine, confermata")
      .eq("ricetta_id", info.ricetta_id).order("id", { ascending: false }).limit(1).maybeSingle();
    etichetta = data || null;
  }

  const H = [];

  // --- lavoro del dipendente (lavorazioni a voce: tempo, scarto, destinazione)
  if (info.durata_min != null || info.scarto_quantita != null || info.destinazione) {
    const um = info.unita_misura || "";
    const netto = Number(info.quantita_output) || 0, scarto = Number(info.scarto_quantita) || 0;
    const resa = netto && scarto ? Math.round(netto / (netto + scarto) * 100) : null;
    const resaOra = netto && Number(info.durata_min) > 0 ? formatNum(Math.round(netto / Number(info.durata_min) * 60 * 10) / 10) + " " + escapeHtml(um) + "/ora" : null;
    H.push(`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
      ${info.durata_min != null ? `<span style="background:#eff6ff;color:#1e3a8a;border-radius:8px;padding:5px 9px;font-size:12px;font-weight:700;">⏱ ${formatNum(Math.round(Number(info.durata_min)))} min${resaOra ? " · " + resaOra : ""}</span>` : ""}
      ${scarto ? `<span style="background:#fef3c7;color:#92400e;border-radius:8px;padding:5px 9px;font-size:12px;font-weight:700;">Scarto ${formatNum(scarto)} ${escapeHtml(um)}${resa != null ? " · resa " + resa + "%" : ""}</span>` : ""}
      ${info.destinazione ? `<span style="background:#f1f5f9;color:#334155;border-radius:8px;padding:5px 9px;font-size:12px;font-weight:700;">Per ${escapeHtml(info.destinazione)}</span>` : ""}
    </div>`);
  }

  // --- fasi
  H.push(`<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Tracciabilità fasi</div>`);
  if (!fasi.length) {
    H.push(`<div style="font-size:12px;color:#94a3b8;margin-bottom:12px;">Nessuna fase registrata su questo lotto.</div>`);
  } else {
    H.push(fasi.map(f => {
      const chi = f.firmato_da || f.operatore_nome || "";
      const quando = f.firmato_il ? new Date(f.firmato_il).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
      const mis = [];
      if (f.temperatura_rilevata != null) mis.push("🌡 " + f.temperatura_rilevata + "°C");
      else if (f.valore_misurato != null) mis.push(f.valore_misurato + " " + (f.valore_um || ""));
      if (f.durata_reale_min != null) mis.push(f.durata_reale_min + " min");
      const nc = f.ccp && f.esito !== "ok";
      return `<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px dotted #e5e7eb;gap:10px;">
        <span>${f.ccp ? "🔺 " : ""}${f.fase_ordine ? f.fase_ordine + ". " : ""}${escapeHtml(f.fase_nome || "Fase")}${mis.length ? " · " + escapeHtml(mis.join(" · ")) : ""}</span>
        <span style="color:${nc ? "#dc2626" : chi ? "#16a34a" : "#94a3b8"};white-space:nowrap;">${nc ? "⚠ fuori limite" : chi ? "✅ " + escapeHtml(chi) + (quando ? " · " + quando : "") : "non firmata"}</span>
      </div>`;
    }).join("") + `<div style="height:12px;"></div>`);
  }

  // --- materie prime
  if (ingredienti.length) {
    H.push(`<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Materie prime</div>`);
    H.push(ingredienti.map(i => {
      // semilavorato fatto in casa: lotto interno agganciato da solo (il primo che scade), cambiabile
      const interno = i.lotto_interno_id || i.scelto_auto || (i.prodotti && i.prodotti.ricetta_id);
      const scad = i.scadenza_materia_prima ? " (scade " + new Date(i.scadenza_materia_prima).toLocaleDateString("it-IT") + ")" : "";
      const lotto = i.lotto_materia_prima
        ? `<div style="color:#0E5A7A;font-weight:700;">lotto ${escapeHtml(i.lotto_materia_prima)}${scad}${i.scelto_auto ? ' <span style="color:#94a3b8;font-weight:400;">· scelto da Tony</span>' : ""}</div>`
        : (interno ? `<div style="color:#b45309;font-weight:700;">⚠ nessun lotto disponibile</div>` : "");
      const cambia = interno ? `<a href="#" class="rl-cambia-lotto" data-riga="${i.id}" data-prodotto="${i.prodotto_id}" style="color:#0E5A7A;font-weight:700;margin-left:8px;">cambia</a>` : "";
      return `<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:5px 0;border-bottom:1px dotted #e5e7eb;">
      <span>${escapeHtml(i.prodotti?.nome || "—")}${lotto}</span>
      <span style="white-space:nowrap;">${formatNum(i.quantita)} ${escapeHtml(i.unita_misura || "")}${cambia}</span></div>`;
    }).join("") + `<div style="height:12px;"></div>`);
  }

  // --- confezionamento
  const conf = Array.isArray(info.dettaglio_confezionamento) ? info.dettaglio_confezionamento : [];
  if (conf.length) {
    H.push(`<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Confezionamento</div>`);
    H.push(conf.map(c => `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px dotted #e5e7eb;">
      <span>${escapeHtml(c.label || "Confezione")}</span>
      <span>${formatNum(c.numero_confezioni)} pz × ${formatNum(c.peso_porzione_kg)} kg</span></div>`).join("") + `<div style="height:12px;"></div>`);
  }

  // --- etichetta
  H.push(`<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Etichetta</div>`);
  const mancano = [];
  if (!etichetta) mancano.push("la scheda etichetta della ricetta");
  if (!produttore) mancano.push("i dati del produttore");
  const bozza = etichetta && etichetta.confermata === false;
  const linkRicetta = `<button type="button" class="rl-compila" style="display:inline-block;margin-top:8px;background:#0E5A7A;color:#fff;border:0;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;">✏️ ${bozza ? "Controlla e conferma qui" : "Compila qui"} l'etichetta</button>`;
  if (mancano.length || bozza) {
    H.push(`<div style="background:${bozza ? "#fffbeb" : "#fef2f2"};border-left:4px solid ${bozza ? "#d97706" : "#dc2626"};border-radius:6px;padding:10px 12px;font-size:12px;">
      <b>Non stampabile.</b> ${bozza ? "La scheda etichetta è una bozza: vanno verificati ingredienti e allergeni." : "Manca " + escapeHtml(mancano.join(" e ")) + "."}
      ${etichetta || !produttore ? "" : "<br>"}${(!etichetta || bozza) ? linkRicetta : ""}</div>`);
  } else {
    // prima le confezioni di QUESTO lotto ("6 da 2 kg"), poi il peso della scheda etichetta
    const pesoDefault = (conf.length && conf[0].peso_porzione_kg ? Math.round(conf[0].peso_porzione_kg * 1000) : "") || etichetta.peso_netto_g || "";
    const nDefault = conf.length ? (conf[0].numero_confezioni || 1) : 1;
    H.push(`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;font-size:12px;">
      <div><label style="display:block;color:#64748b;">Peso netto (g)</label>
        <input class="input rl-peso" type="number" value="${pesoDefault}" style="width:110px;"></div>
      <div><label style="display:block;color:#64748b;">Quante</label>
        <input class="input rl-quante" type="number" min="1" value="${nDefault}" style="width:90px;"></div>
      <button class="rl-stampa" style="background:#0E5A7A;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">🏷 Stampa etichette</button>
      <div style="width:100%;font-size:11px;color:#94a3b8;margin-top:2px;">Retro 60 × 40 mm · QR alla scheda del prodotto · <a href="#" class="rl-compila" style="color:#0E5A7A;font-weight:700;">✏️ modifica etichetta</a></div>
    </div>`);
  }

  // --- firma
  if (info.conforme != null || info.firma_tramite) {
    H.push(`<div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:12px;color:#64748b;">
      ${info.conforme === false ? `<span style="color:#dc2626;font-weight:700;">NON CONFORME</span>${info.nc_motivo ? " · " + escapeHtml(info.nc_motivo) : ""}` : info.conforme === true ? "Dichiarato conforme" : ""}
      ${info.firma_tramite ? " · registrato via " + escapeHtml(info.firma_tramite) : ""}</div>`);
  }

  box.innerHTML = H.join("");

  box.querySelectorAll(".rl-cambia-lotto").forEach(b => b.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    cambiaLottoSemilavorato({ rigaId: b.dataset.riga, prodottoId: b.dataset.prodotto, card: box.closest("[data-lotto]") });
  }));

  box.querySelectorAll(".rl-compila").forEach(b => b.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    apriEditorEtichetta({ info, etichetta, card: box.closest("[data-lotto]") });
  }));

  const btn = box.querySelector(".rl-stampa");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const peso = box.querySelector(".rl-peso")?.value || "";
      const quante = Math.max(1, parseInt(box.querySelector(".rl-quante")?.value || "1", 10));
      stampaEtichette({ etichetta, produttore, info, peso, quante });
    });
    box.querySelectorAll(".rl-peso, .rl-quante").forEach(i => i.addEventListener("click", e => e.stopPropagation()));
  }
}

// 🔁 Il semilavorato usato non e' quello proposto: scelgo un altro lotto interno
async function cambiaLottoSemilavorato({ rigaId, prodottoId, card }) {
  const supa = window.supabaseClient || window.supabase;
  const az = window.state?.azienda?.id;
  const { data: prod } = await supa.from("prodotti").select("nome, ricetta_id").eq("id", prodottoId).maybeSingle();
  let subId = prod?.ricetta_id;
  if (!subId) {
    const { data: r } = await supa.from("ricette").select("id").eq("prodotto_output_id", prodottoId).limit(1).maybeSingle();
    subId = r?.id;
  }
  if (!subId) { alert("Non trovo la ricetta di questo semilavorato"); return; }
  const oggi = new Date().toISOString().slice(0, 10);
  const { data: lotti } = await supa.from("produzione_lotti")
    .select("id, codice_lotto, data_produzione, data_scadenza, quantita_output, unita_misura, luogo, stato")
    .eq("azienda_id", az).eq("ricetta_id", subId).not("stato", "in", "(annullato,annullata,bozza)")
    .order("data_scadenza", { ascending: true, nullsFirst: false }).limit(30);
  const validi = (lotti || []).filter(l => !l.data_scadenza || l.data_scadenza >= oggi);
  const fd = (d) => d ? new Date(d).toLocaleDateString("it-IT") : "—";
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9998;display:flex;align-items:flex-end;justify-content:center;";
  ov.innerHTML = `<div style="background:#fff;width:100%;max-width:560px;max-height:85vh;overflow-y:auto;border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));box-sizing:border-box;">
    <div style="font-size:17px;font-weight:800;">Quale lotto hai usato?</div>
    <div style="font-size:13px;color:#64748b;margin:2px 0 12px;">${escapeHtml(prod?.nome || "")} · in alto quello che scade prima</div>
    ${validi.length ? validi.map((l, k) => `<button type="button" data-id="${l.id}" style="display:block;width:100%;text-align:left;border:1.5px solid ${k ? "#e2e8f0" : "#0E5A7A"};background:#fff;border-radius:12px;padding:11px 12px;margin-bottom:8px;cursor:pointer;font-size:14px;">
        <b>${escapeHtml(l.codice_lotto || "")}</b> · scade ${fd(l.data_scadenza)}
        <div style="font-size:12px;color:#64748b;">prodotto ${fd(l.data_produzione)}${l.quantita_output ? " · " + formatNum(l.quantita_output) + " " + escapeHtml(l.unita_misura || "") : ""}${l.luogo ? " · " + escapeHtml(l.luogo) : ""}</div></button>`).join("")
      : `<div style="color:#b45309;font-weight:700;padding:10px 0;">Nessun lotto valido di questo semilavorato: va prima registrata la sua produzione.</div>`}
    <button type="button" data-chiudi style="width:100%;border:0;border-radius:12px;padding:13px;background:#f1f5f9;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px;">Annulla</button>
  </div>`;
  document.body.appendChild(ov);
  const chiudi = () => ov.remove();
  ov.querySelector("[data-chiudi]").onclick = chiudi;
  ov.addEventListener("click", (e) => { if (e.target === ov) chiudi(); });
  ov.querySelectorAll("[data-id]").forEach(b => b.onclick = async () => {
    const l = validi.find(x => String(x.id) === b.dataset.id);
    const { error } = await supa.from("produzione_lotto_ingredienti").update({
      lotto_interno_id: l.id, lotto_materia_prima: l.codice_lotto, scadenza_materia_prima: l.data_scadenza, scelto_auto: false,
    }).eq("id", rigaId);
    if (error) { alert("Non salvato: " + error.message); return; }
    chiudi();
    if (card) { const d = card.querySelector(".rl-dettaglio"); if (d) d.style.display = "none"; await toggleDettaglio(card); }
  });
}

// ✏️ Etichetta compilata a mano direttamente dal lotto: stessa scheda di Crea ricetta
// (tabella etichette, una per ricetta) + la scadenza di QUESTO lotto.
const ALLERGENI_UE = ["glutine", "crostacei", "uova", "pesce", "arachidi", "soia", "latte", "frutta a guscio", "sedano", "senape", "sesamo", "solfiti", "lupini", "molluschi"];

async function apriEditorEtichetta({ info, etichetta, card }) {
  const supa = window.supabaseClient || window.supabase;
  const et = { ...(etichetta || {}) };
  // niente scheda: la preparo io dalla ricetta (ingredienti in ordine di peso, allergeni delle materie prime)
  if (!et.id && info.ricetta_id) {
    const [{ data: ric }, { data: ingr }] = await Promise.all([
      supa.from("ricette").select("nome").eq("id", info.ricetta_id).maybeSingle(),
      supa.from("ricetta_ingredienti").select("nome_prodotto, quantita, unita_misura, prodotti(nome, allergeni)").eq("ricetta_id", info.ricetta_id),
    ]);
    const peso = (r) => (Number(r.quantita) || 0) * (["kg", "l", "lt"].includes(String(r.unita_misura || "").toLowerCase()) ? 1000 : 1);
    const righe = (ingr || []).slice().sort((a, b) => peso(b) - peso(a));
    et.denominazione = ric?.nome || "";
    et.ingredienti = righe.map(r => r.prodotti?.nome || r.nome_prodotto).filter(Boolean).join(", ");
    et.allergeni = [...new Set(righe.flatMap(r => (r.prodotti?.allergeni || []).map(a => String(a).replace(/_/g, " ").toLowerCase())))];
    et.tmc_dicitura = "Da consumarsi entro";
  }
  if (!et.conservazione && info.conservazione_libera) et.conservazione = info.conservazione_libera;
  const allerg = (Array.isArray(et.allergeni) ? et.allergeni : []).map(a => String(a).replace(/_/g, " "));
  const v = (x) => escapeHtml(x == null ? "" : String(x));
  const lab = "display:block;font-size:12px;font-weight:700;color:#64748b;margin:12px 0 4px;";
  const inp = "width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px;font-size:15px;font-family:inherit;";

  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9998;display:flex;align-items:flex-end;justify-content:center;";
  ov.innerHTML = `<div style="background:#fff;width:100%;max-width:620px;max-height:92vh;overflow-y:auto;border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));box-sizing:border-box;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="flex:1;"><div style="font-size:18px;font-weight:800;">🏷 Etichetta</div>
        <div style="font-size:12.5px;color:#64748b;">${v(info.codice_lotto || "")} · vale per tutti i lotti di questa ricetta; la scadenza solo per questo lotto</div></div>
      <button type="button" data-chiudi style="border:0;background:#f1f5f9;border-radius:10px;padding:8px 12px;font-size:16px;cursor:pointer;">✕</button>
    </div>
    ${!etichetta?.id ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:10px;padding:9px 11px;font-size:12.5px;margin-top:10px;">Preparata dalla ricetta: controlla ingredienti e allergeni.</div>` : ""}
    <label style="${lab}">Denominazione</label><input data-f="denominazione" style="${inp}" value="${v(et.denominazione)}">
    <label style="${lab}">Ingredienti (dal più al meno pesante)</label>
    <textarea data-f="ingredienti" rows="3" style="${inp}">${v(et.ingredienti)}</textarea>
    <label style="${lab}">Allergeni presenti</label>
    <div data-allerg style="display:flex;flex-wrap:wrap;gap:6px;">${ALLERGENI_UE.map(a => `<label style="display:flex;align-items:center;gap:5px;font-size:13px;border:1.5px solid #e2e8f0;border-radius:16px;padding:6px 10px;cursor:pointer;"><input type="checkbox" value="${a}" ${allerg.includes(a) ? "checked" : ""}> ${a}</label>`).join("")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div><label style="${lab}">Scadenza di questo lotto</label><input data-scad type="date" style="${inp}" value="${v(info.data_scadenza || "")}"></div>
      <div><label style="${lab}">Peso netto (g)</label><input data-f="peso_netto_g" type="number" min="0" style="${inp}" value="${v(et.peso_netto_g)}"></div>
    </div>
    <label style="${lab}">Dicitura</label>
    <select data-f="tmc_dicitura" style="${inp}">
      <option value="Da consumarsi entro" ${et.tmc_dicitura !== "Da consumarsi preferibilmente entro" ? "selected" : ""}>Da consumarsi entro (deperibili)</option>
      <option value="Da consumarsi preferibilmente entro" ${et.tmc_dicitura === "Da consumarsi preferibilmente entro" ? "selected" : ""}>Da consumarsi preferibilmente entro</option>
    </select>
    <label style="${lab}">Conservazione</label><input data-f="conservazione" style="${inp}" value="${v(et.conservazione)}" placeholder="Es. Conservare a -18 °C">
    <label style="${lab}">Dopo l'apertura (facoltativo)</label><input data-f="dopo_apertura" style="${inp}" value="${v(et.dopo_apertura)}">
    <label style="${lab}">Origine (facoltativo)</label><input data-f="origine" style="${inp}" value="${v(et.origine)}" placeholder="Es. Italia">
    <label style="display:flex;gap:8px;align-items:flex-start;font-size:13.5px;margin-top:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px;">
      <input data-conferma type="checkbox" ${etichetta?.id && etichetta.confermata !== false ? "checked" : ""} style="margin-top:2px;width:18px;height:18px;">
      <span><b>Ho verificato ingredienti e allergeni</b>, anche sulle etichette dei fornitori. Solo così l'etichetta si stampa.</span></label>
    <div style="display:flex;gap:8px;margin-top:14px;">
      <button type="button" data-chiudi style="flex:1;border:0;border-radius:12px;padding:13px;background:#f1f5f9;font-size:15px;font-weight:700;cursor:pointer;">Annulla</button>
      <button type="button" data-salva style="flex:2;border:0;border-radius:12px;padding:13px;background:#0E5A7A;color:#fff;font-size:15px;font-weight:700;cursor:pointer;">💾 Salva etichetta</button>
    </div>
    <div data-esito style="font-size:13px;margin-top:8px;color:#b91c1c;"></div>
  </div>`;
  document.body.appendChild(ov);
  const chiudi = () => ov.remove();
  ov.querySelectorAll("[data-chiudi]").forEach(b => b.onclick = chiudi);
  ov.addEventListener("click", (e) => { if (e.target === ov) chiudi(); });

  ov.querySelector("[data-salva]").onclick = async () => {
    const esito = ov.querySelector("[data-esito]");
    const f = (k) => ov.querySelector(`[data-f="${k}"]`)?.value?.trim() || "";
    const rec = {
      azienda_id: window.state?.azienda?.id, ricetta_id: info.ricetta_id,
      denominazione: f("denominazione"), ingredienti: f("ingredienti"),
      allergeni: [...ov.querySelectorAll("[data-allerg] input:checked")].map(c => c.value),
      peso_netto_g: Number(f("peso_netto_g")) || null, tmc_dicitura: f("tmc_dicitura"),
      conservazione: f("conservazione") || null, dopo_apertura: f("dopo_apertura") || null, origine: f("origine") || null,
      confermata: ov.querySelector("[data-conferma]").checked,
    };
    if (!rec.denominazione || !rec.ingredienti) { esito.textContent = "Servono denominazione e ingredienti"; return; }
    const btn = ov.querySelector("[data-salva]"); btn.disabled = true; btn.textContent = "Salvo…";
    const q = etichetta?.id ? supa.from("etichette").update(rec).eq("id", etichetta.id) : supa.from("etichette").insert(rec);
    const { error } = await q;
    if (!error) {
      const scad = ov.querySelector("[data-scad]").value || null;
      if (info.id && scad !== (info.data_scadenza || null)) {
        const r2 = await supa.from("produzione_lotti").update({ data_scadenza: scad }).eq("id", info.id);
        if (r2.error) { esito.textContent = "Etichetta salvata, scadenza no: " + r2.error.message; btn.disabled = false; btn.textContent = "💾 Salva etichetta"; return; }
        const l = lottiCache.find(x => String(x.id) === String(info.id)); if (l) l.data_scadenza = scad;
      }
    }
    if (error) { esito.textContent = "Non salvata: " + error.message; btn.disabled = false; btn.textContent = "💾 Salva etichetta"; return; }
    chiudi();
    // riapro il dettaglio aggiornato
    if (card) { const b = card.querySelector(".rl-dettaglio"); if (b) b.style.display = "none"; await toggleDettaglio(card); }
    if (!rec.confermata) alert("Salvata come bozza: per stampare spunta «Ho verificato ingredienti e allergeni».");
  };
}

// Come in Produzione: senza data di scadenza l'etichetta non esce. Se il lotto non ce l'ha,
// la propongo da produzione + durata della ricetta e la salvo sul lotto.
async function scadenzaDelLotto(info) {
  if (info.data_scadenza) return info.data_scadenza;
  const supa = window.supabaseClient || window.supabase;
  let giorni = null;
  if (info.ricetta_id) {
    const [{ data: r }, { data: cons }] = await Promise.all([
      supa.from("ricette").select("shelf_life_giorni").eq("id", info.ricetta_id).maybeSingle(),
      supa.from("ricette_conservazione").select("shelf_life_giorni").eq("ricetta_id", info.ricetta_id).eq("attivo", true),
    ]);
    giorni = r?.shelf_life_giorni || (cons || []).map(c => c.shelf_life_giorni).filter(Boolean).sort((a, b) => a - b)[0] || null;
  }
  let proposta = "";
  if (giorni && info.data_produzione) {
    const d = new Date(info.data_produzione + "T00:00:00");
    d.setDate(d.getDate() + Number(giorni));
    proposta = d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
  const scritta = prompt("Questo lotto non ha la data di scadenza e senza non si può etichettare." +
    (proposta ? "\n\nProposta: produzione + " + giorni + " giorni." : "") + "\n\nData di scadenza (gg/mm/aaaa):", proposta);
  if (!scritta) return null;
  const m = String(scritta).trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!m) { alert("Data non valida: scrivila come gg/mm/aaaa."); return null; }
  const anno = m[3].length === 2 ? "20" + m[3] : m[3];
  const iso = anno + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
  if (isNaN(new Date(iso + "T00:00:00").getTime())) { alert("Data non valida."); return null; }
  if (info.id) {
    const { error } = await supa.from("produzione_lotti").update({ data_scadenza: iso }).eq("id", info.id);
    if (error) console.warn("Scadenza non salvata sul lotto:", error.message);
  }
  info.data_scadenza = iso;
  return iso;
}

async function stampaEtichette({ etichetta, produttore, info, peso, quante }) {
  if (!(await scadenzaDelLotto(info))) return;
  const g = Number(String(peso || "").replace(",", "."));
  if (peso && g > 0 && g < 20 && !confirm("Peso netto " + peso + " g: è giusto?\n\nSe intendevi " + peso + " kg, premi Annulla e scrivi " + Math.round(g * 1000) + ".")) return;
  const formato = await scegliFormatoEtichetta();
  if (!formato) return;
  // chi ha firmato le fasi del lotto va sull'etichetta
  if (info.id && !info.operatore) {
    try { const { data: op } = await (window.supabaseClient || window.supabase).rpc("operatori_lotto", { p_lotto: info.id }); if (op) info.operatore = op; } catch (_) {}
  }
  // lotto unico per piu' eventi: stessa etichetta, una per evento con "PER: ..."
  const supaD = window.supabaseClient || window.supabase;
  const { data: dest } = info.id ? await supaD.from("produzione_lotti_destinazioni").select("evento_titolo, quantita, formato").eq("lotto_id", info.id).order("id") : { data: [] };
  if ((dest || []).length > 1) {
    // quante etichette per ogni evento (es. il ragu' di un evento in due sacchetti)
    const scelta = await chiediEtichettePerEvento(dest, quante, peso);
    if (!scelta) return;
    const conte = scelta.map((x) => x.n);
    let ok = 0, tot = 0, ultimo = null;
    for (let i = 0; i < dest.length; i++) {
      const d = dest[i], n = conte[i];
      for (let k = 1; k <= n; k++) {
        tot++;
        const quale = (d.evento_titolo || "evento") + (d.formato ? " · " + d.formato : "") + (n > 1 ? " · " + k + "/" + n : (d.quantita ? " · " + formatNum(d.quantita) + " pz" : ""));
        // peso netto dell'evento, diviso tra le sue etichette (es. 2 teglie = meta' ciascuna)
        const pesoEv = Number(scelta[i].peso) > 0 ? String(Math.round(Number(scelta[i].peso) / n)) : peso;
        const rr = await inviaEtichetteLotto({ etichetta, produttore, info: { ...info, destinazione: quale }, peso: pesoEv, copie: 1, formato });
        if (rr.motivo === "troppo_lungo") { alert("Il testo non entra nell'etichetta: allungala o accorcia ingredienti e conservazione."); return; }
        if (rr.ok) ok++; else ultimo = rr;
      }
    }
    if (ok === tot) { alert("🏷 " + tot + " etichette inviate: " + dest.map((d, i) => d.evento_titolo + " " + conte[i]).join(", ")); return; }
    if (ultimo && ultimo.motivo !== "nessuna_stampante") { alert("Errore invio etichette: " + ultimo.motivo); return; }
  }
  const r = await inviaEtichetteLotto({ etichetta, produttore, info, peso, copie: quante, formato });
  if (r.motivo === "troppo_lungo") {
    alert("Il testo non entra nell'etichetta " + formato.larghezzaMm + "x" + formato.lunghezzaMm + " senza scendere sotto la misura minima di legge.\n\nAllunga l'etichetta, oppure accorcia ingredienti o conservazione nella scheda etichetta della ricetta.");
    return;
  }
  if (r.ok) { alert("🏷 " + quante + " " + (quante === 1 ? "etichetta inviata" : "etichette inviate") + " alla stampante"); return; }
  if (r.motivo !== "nessuna_stampante") { alert("Errore invio etichette: " + r.motivo); return; }
  const png = r.png;

  // Nessuna etichettatrice collegata: mostro l'immagine, da condividere con l'app Brother iPrint&Label
  const ov = document.createElement("div");
  ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:9999;overflow-y:auto;padding:16px;box-sizing:border-box;font-family:Arial,sans-serif;";
  ov.innerHTML = '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;">'
    + '<div style="background:#0E5A7A;color:#fff;padding:12px 14px;font-size:13px;line-height:1.45;"><b>Nessuna etichettatrice collegata a Ristoflow.</b><br>'
    + 'Tieni premuta l\'immagine › Condividi › Brother iPrint&amp;Label, rotolo 62 mm continuo. Copie: ' + quante + '.</div>'
    + '<img src="' + png + '" alt="Etichetta" style="display:block;width:100%;border-bottom:1px solid #e2e8f0;">'
    + '<div style="padding:12px;text-align:right;"><button type="button" style="border:0;border-radius:8px;padding:10px 16px;font-weight:700;background:#f1f5f9;cursor:pointer;">Chiudi</button></div></div>';
  ov.querySelector("button").onclick = () => ov.remove();
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
}

// Lotto unico per piu' eventi: chiede quante etichette per ogni evento (sacchetti, vaschette...)
function chiediEtichettePerEvento(dest, quante, pesoTot) {
  // peso proposto: quello del lotto diviso in proporzione alle quantita' di ogni evento
  const tot = Number(String(pesoTot || "").replace(",", ".")) || 0;
  const somma = dest.reduce((a, d) => a + (Number(d.quantita) || 0), 0);
  const pesoProposto = (i) => tot > 0 && somma > 0 ? Math.round(tot * (Number(dest[i].quantita) || 0) / somma) : "";
  return new Promise((risolvi) => {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;";
    ov.innerHTML = `<div style="background:#fff;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));box-sizing:border-box;">
      <div style="font-size:18px;font-weight:800;">🏷 Etichette per evento</div>
      <div style="font-size:13px;color:#64748b;margin:4px 0 12px;">Stesso lotto, un'etichetta per ogni sacchetto o contenitore. Se un evento ne ha più di una, escono numerate (1/2, 2/2). Scrivi il peso netto di ogni evento: se ha più etichette, il peso si divide tra loro.</div>
      ${dest.map((d, i) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <div style="flex:1;"><b>${escapeHtml(d.evento_titolo || "Evento")}</b><div style="font-size:12.5px;color:#64748b;">${d.quantita ? formatNum(d.quantita) + " pz" : ""}${d.formato ? " · " + escapeHtml(d.formato) : ""}</div></div>
        <button type="button" data-m="${i}" style="width:38px;height:38px;border:0;border-radius:10px;background:#f1f5f9;font-size:20px;">−</button>
        <input data-n="${i}" type="number" min="0" value="${Math.max(1, Number(quante) || 1)}" style="width:56px;text-align:center;border:1.5px solid #e2e8f0;border-radius:10px;padding:8px;font-size:16px;">
        <button type="button" data-p="${i}" style="width:38px;height:38px;border:0;border-radius:10px;background:#f1f5f9;font-size:20px;">+</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:2px 0 8px;font-size:13px;color:#475569;">
        Peso netto ${escapeHtml(d.evento_titolo || "evento")}
        <input data-g="${i}" type="number" min="0" inputmode="numeric" placeholder="g" value="${pesoProposto(i)}" style="width:96px;border:1.5px solid #e2e8f0;border-radius:10px;padding:7px;font-size:15px;"> g
      </div>`).join("")}
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button type="button" data-no style="flex:1;border:0;border-radius:12px;padding:13px;font-weight:700;background:#f1f5f9;">Annulla</button>
        <button type="button" data-si style="flex:2;border:0;border-radius:12px;padding:13px;font-weight:800;background:#0E5A7A;color:#fff;">Stampa</button>
      </div></div>`;
    const leggi = () => dest.map((_, i) => Math.max(0, Math.round(Number(ov.querySelector(`[data-n="${i}"]`).value) || 0)));
    ov.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { const x = ov.querySelector(`[data-n="${b.dataset.m}"]`); x.value = Math.max(0, (Number(x.value) || 0) - 1); });
    ov.querySelectorAll("[data-p]").forEach((b) => b.onclick = () => { const x = ov.querySelector(`[data-n="${b.dataset.p}"]`); x.value = (Number(x.value) || 0) + 1; });
    ov.querySelector("[data-no]").onclick = () => { ov.remove(); risolvi(null); };
    ov.querySelector("[data-si]").onclick = () => {
      const c = leggi();
      const pesi = dest.map((_, i) => Number(String(ov.querySelector(`[data-g="${i}"]`).value || "").replace(",", ".")) || 0);
      ov.remove();
      risolvi(c.some((n) => n > 0) ? c.map((n, i) => ({ n, peso: pesi[i] })) : null);
    };
    document.body.appendChild(ov);
  });
}

// Stampa il registro cosi' come e' filtrato a schermo: e' il documento
// che si mostra in caso di controllo.
function stampaRegistro() {
  const cerca = (document.getElementById("rl-cerca")?.value || "").toLowerCase().trim();
  let lotti = lottiCache;
  if (cerca) lotti = lotti.filter(l => ((l.ricette?.nome || "") + " " + (l.codice_lotto || "")).toLowerCase().includes(cerca));
  if (!lotti.length) { alert("Nessun lotto da stampare."); return; }

  const azienda = window.state?.azienda?.nome || "";
  const sede = window.state?.sedeAttiva?.nome || "";
  const oggi = new Date().toLocaleDateString("it-IT");

  const righe = lotti.map(l => {
    const st = (STATO_LABEL[l.stato]?.t || l.stato || "").replace(/[^A-Za-zàèéìòù ]/g, "").trim();
    return `<tr>
      <td>${escapeHtml(l.codice_lotto || "—")}</td>
      <td>${escapeHtml(l.ricette?.nome || "—")}</td>
      <td>${l.data_produzione ? new Date(l.data_produzione).toLocaleDateString("it-IT") : "—"}</td>
      <td>${l.data_scadenza ? new Date(l.data_scadenza).toLocaleDateString("it-IT") : "—"}</td>
      <td class="n">${l.quantita_output ? formatNum(l.quantita_output) + " " + escapeHtml(l.unita_misura || "") : "—"}</td>
      <td>${escapeHtml(l.dipendenti?.nome || "—")}</td>
      <td>${escapeHtml(st)}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><title>Registro lotti</title>
    <style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Arial, Helvetica, sans-serif; font-size:9pt; color:#000; margin:0; }
      h1 { font-size:14pt; margin:0 0 2mm; }
      .sub { font-size:8pt; color:#333; margin-bottom:4mm; }
      table { width:100%; border-collapse:collapse; }
      th, td { border:0.5pt solid #666; padding:1.5mm 2mm; text-align:left; }
      th { background:#eee; font-size:8pt; text-transform:uppercase; }
      .n { text-align:right; }
      tr { page-break-inside:avoid; }
      .firma { margin-top:8mm; font-size:8pt; }
      .barra { background:#0E5A7A; padding:10px 14px; display:flex; gap:10px; align-items:center;
               margin:-0mm 0 6mm; border-radius:8px; }
      .barra .tit { color:#e2f2f9; font-size:11pt; font-weight:700; flex:1; }
      .barra button { border-radius:7px; padding:8px 15px; font-size:11pt; font-weight:800; cursor:pointer; }
      .bstampa { background:#fff; color:#0E5A7A; border:0; }
      .bchiudi { background:transparent; color:#fff; border:1px solid rgba(255,255,255,.6); }
      @media print { .barra { display:none !important; } }
    </style></head><body>
      <div class="barra">
        <span class="tit">Registro lotti · ${lotti.length} lotti</span>
        <button class="bstampa" onclick="window.print()">🖨 Stampa</button>
        <button class="bchiudi" onclick="window.close()">✕ Chiudi</button>
      </div>
      <h1>Registro lotti di produzione</h1>
      <div class="sub">${escapeHtml(azienda)}${sede ? " — " + escapeHtml(sede) : ""} · stampato il ${oggi} · ${lotti.length} lotti</div>
      <table>
        <thead><tr><th>Lotto</th><th>Prodotto</th><th>Produzione</th><th>Scadenza</th><th>Quantità</th><th>Operatore</th><th>Stato</th></tr></thead>
        <tbody>${righe}</tbody>
      </table>
      <div class="firma">Il responsabile ____________________________</div>
    </body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Il browser ha bloccato la finestra di stampa. Consenti i popup e riprova."); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 350);
}

function formatNum(n) { const v = Number(n); return Number.isFinite(v) ? v.toLocaleString("it-IT", { maximumFractionDigits: 3 }) : n; }
function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
