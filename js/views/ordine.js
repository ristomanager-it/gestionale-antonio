// js/views/ordine.js — Dettaglio/creazione ordine fornitore + invio WhatsApp/Email
import "../supabaseClient.js";
import "../state.js";
import { apriScanner } from "./barcode-scanner-v2.js";

const supa = () => window.supabaseClient || window.supabase || window.db;
const FN_INVIO = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/invia-ordine-fornitore";

function esc(s) { return String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function eur(n) { return (Number(n) || 0).toFixed(2).replace(".", ","); }

function getParam(name) {
  const h = window.location.hash.split("?")[1] || "";
  return new URLSearchParams(h).get(name);
}

export async function render(container) {
  const azienda = window.state?.azienda;
  if (!azienda) { container.innerHTML = `<div class="view"><h3>Nessuna azienda attiva</h3></div>`; return; }
  const aziendaId = azienda.id;
  const ordineId = getParam("id");

  container.innerHTML = `<div class="view"><div class="small-muted">Caricamento ordine…</div></div>`;

  // Carico ordine + righe + fornitori + prodotti (per autocomplete)
  const [ordRes, fornRes, prodRes] = await Promise.all([
    ordineId ? supa().from("ordini_fornitore").select("*, fornitori(ragione_sociale, telefono, telefono_referente_ordini, email_amministrativa, email_referente_ordini)").eq("id", ordineId).single() : Promise.resolve({ data: null }),
    supa().from("fornitori").select("id, ragione_sociale").eq("azienda_id", aziendaId).eq("attivo", true).order("ragione_sociale"),
    supa().from("prodotti").select("id, nome, nome_interno, unita_base, costo_ultimo").eq("azienda_id", aziendaId).eq("stato", "attivo").order("nome").limit(2000)
  ]);

  const ordine = ordRes.data;
  const fornitori = fornRes.data || [];
  const prodotti = prodRes.data || [];
  const prodById = {}; prodotti.forEach(p => prodById[String(p.id)] = p);

  let righe = [];
  if (ordine) {
    const { data: r } = await supa().from("ordini_fornitore_righe").select("*").eq("ordine_id", ordine.id);
    righe = (r || []).map(x => ({
      prodotto_id: x.prodotto_id,
      nome: (prodById[String(x.prodotto_id)]?.nome_interno || prodById[String(x.prodotto_id)]?.nome || ""),
      quantita: x.quantita,
      unita_misura: x.unita_misura || prodById[String(x.prodotto_id)]?.unita_base || "",
      prezzo_unitario: x.prezzo_unitario ?? prodById[String(x.prodotto_id)]?.costo_ultimo ?? ""
    }));
  }

  const stato = ordine?.stato || "bozza";
  const readonly = ["inviato", "parziale", "ricevuto", "chiuso"].includes(stato);
  const ricevibile = ["inviato", "parziale"].includes(stato);

  container.innerHTML = `
    <div class="view">
      <button class="app-button tiny gray" id="ord-back" style="margin-bottom:10px;">← Ordini</button>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <h2 style="margin:0;">${ordine ? "Ordine " + esc(ordine.numero_ordine) : "Nuovo ordine"}</h2>
        <span style="background:${stato === 'inviato' ? '#dcfce7;color:#15803d' : stato === 'bozza' ? '#fef3c7;color:#92400e' : stato === 'parziale' ? '#fed7aa;color:#c2410c' : '#e0f2fe;color:#0369a1'};border-radius:999px;padding:4px 12px;font-size:12px;font-weight:800;text-transform:uppercase;">${esc(stato)}</span>
      </div>

      <div style="margin-top:14px;display:grid;grid-template-columns:1fr;gap:10px;max-width:520px;">
        <label style="font-size:12px;font-weight:700;color:#64748b;">Fornitore
          <select id="ord-fornitore" class="input-pill" ${readonly ? "disabled" : ""} style="margin-top:4px;">
            <option value="">— seleziona —</option>
            ${fornitori.map(f => `<option value="${f.id}" ${ordine?.fornitore_id == f.id ? "selected" : ""}>${esc(f.ragione_sociale)}</option>`).join("")}
          </select>
        </label>
        <label style="font-size:12px;font-weight:700;color:#64748b;">Note
          <input id="ord-note" class="input-pill" ${readonly ? "disabled" : ""} value="${esc(ordine?.note || "")}" placeholder="Consegna, orari, riferimenti…" style="margin-top:4px;">
        </label>
      </div>

      <h3 style="margin:18px 0 8px;">Righe</h3>
      <div id="ord-righe"></div>
      ${readonly ? "" : `
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <input id="ord-add-prod" class="input-pill" list="ord-prod-list" placeholder="🔎 Aggiungi prodotto…" style="flex:1;min-width:200px;">
          <datalist id="ord-prod-list">${prodotti.map(p => `<option value="${esc(p.nome_interno || p.nome)}">`).join("")}</datalist>
        </div>`}

      <div id="ord-totale" style="text-align:right;font-weight:800;font-size:16px;margin-top:12px;"></div>

      <div id="ord-azioni" style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;"></div>
      <div id="ord-esito" style="margin-top:10px;font-size:13px;min-height:18px;"></div>
    </div>`;

  container.querySelector("#ord-back").onclick = () => { window.location.hash = "#/ordini"; };

  const boxRighe = container.querySelector("#ord-righe");
  const boxTot = container.querySelector("#ord-totale");

  function renderRighe() {
    if (!righe.length) { boxRighe.innerHTML = `<div class="small-muted">Nessuna riga. ${readonly ? "" : "Aggiungi prodotti qui sotto."}</div>`; boxTot.textContent = ""; return; }
    boxRighe.innerHTML = righe.map((r, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <div style="flex:1;min-width:0;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.nome)}</div>
        <input type="number" class="ord-qta" data-i="${i}" value="${r.quantita}" min="0" step="0.5" ${readonly ? "disabled" : ""} style="width:70px;padding:6px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:right;font-weight:700;">
        <span class="small-muted" style="font-size:11px;width:26px;">${esc(r.unita_misura)}</span>
        <input type="number" class="ord-prezzo" data-i="${i}" value="${r.prezzo_unitario}" min="0" step="0.01" ${readonly ? "disabled" : ""} placeholder="€/u" style="width:66px;padding:6px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:right;">
        ${readonly ? "" : `<button class="ord-del" data-i="${i}" style="background:none;border:none;color:#dc2626;font-size:18px;cursor:pointer;">×</button>`}
      </div>`).join("");
    let tot = 0; righe.forEach(r => { tot += (Number(r.quantita) || 0) * (Number(r.prezzo_unitario) || 0); });
    boxTot.textContent = tot > 0 ? `Totale stimato: € ${eur(tot)}` : "";

    boxRighe.querySelectorAll(".ord-qta").forEach(el => el.oninput = () => { righe[+el.dataset.i].quantita = parseFloat(el.value) || 0; renderRighe(); });
    boxRighe.querySelectorAll(".ord-prezzo").forEach(el => el.oninput = () => { righe[+el.dataset.i].prezzo_unitario = parseFloat(el.value) || 0; renderRighe(); });
    boxRighe.querySelectorAll(".ord-del").forEach(el => el.onclick = () => { righe.splice(+el.dataset.i, 1); renderRighe(); });
  }
  renderRighe();

  // Aggiunta prodotto da datalist
  const addInput = container.querySelector("#ord-add-prod");
  if (addInput) addInput.onchange = () => {
    const val = addInput.value.trim().toLowerCase();
    const p = prodotti.find(x => (x.nome_interno || x.nome || "").toLowerCase() === val);
    if (p) {
      if (!righe.some(r => String(r.prodotto_id) === String(p.id))) {
        righe.push({ prodotto_id: p.id, nome: p.nome_interno || p.nome, quantita: 1, unita_misura: p.unita_base || "", prezzo_unitario: p.costo_ultimo ?? "" });
        renderRighe();
      }
      addInput.value = "";
    }
  };

  // ── Azioni ──
  const azioni = container.querySelector("#ord-azioni");
  const esito = container.querySelector("#ord-esito");

  async function salva(nuovoStato) {
    const fornId = container.querySelector("#ord-fornitore").value || null;
    const note = container.querySelector("#ord-note").value.trim() || null;
    if (!righe.length) { esito.style.color = "#dc2626"; esito.textContent = "Aggiungi almeno una riga."; return null; }
    let tot = 0; righe.forEach(r => { tot += (Number(r.quantita) || 0) * (Number(r.prezzo_unitario) || 0); });

    let id = ordine?.id;
    const payload = { azienda_id: aziendaId, fornitore_id: fornId ? Number(fornId) : null, note, totale: tot || null, stato: nuovoStato || stato };
    if (id) {
      const { error } = await supa().from("ordini_fornitore").update(payload).eq("id", id);
      if (error) { esito.style.color = "#dc2626"; esito.textContent = "Errore: " + error.message; return null; }
    } else {
      payload.numero_ordine = "ORD-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(Math.random() * 900 + 100);
      payload.data_ordine = new Date().toISOString().slice(0, 10);
      payload.sede_id = window.state?.sedeAttiva?.id || null;
      payload.origine = "manuale";
      const { data: nuovo, error } = await supa().from("ordini_fornitore").insert(payload).select("id").single();
      if (error) { esito.style.color = "#dc2626"; esito.textContent = "Errore: " + error.message; return null; }
      id = nuovo.id;
    }
    // riscrivo le righe
    await supa().from("ordini_fornitore_righe").delete().eq("ordine_id", id);
    const righeIns = righe.map(r => ({ azienda_id: aziendaId, ordine_id: id, prodotto_id: r.prodotto_id, quantita: Number(r.quantita) || 0, unita_misura: r.unita_misura || null, prezzo_unitario: Number(r.prezzo_unitario) || null }));
    await supa().from("ordini_fornitore_righe").insert(righeIns);
    return id;
  }

  function renderAzioni() {
    if (readonly) {
      const info = `<div class="small-muted" style="margin-bottom:8px;">Ordine ${esc(stato)}${ordine?.inviato_at ? " il " + new Date(ordine.inviato_at).toLocaleString("it-IT") : ""}.</div>`;
      if (ricevibile) {
        azioni.innerHTML = info + `<button class="app-button" id="ord-ricevi" style="background:#16a34a;color:#fff;font-weight:800;padding:12px 18px;">\u{1F4E5} Registra ricezione merce</button>`;
        azioni.querySelector("#ord-ricevi").onclick = () => apriRicezione(ordine, righe, aziendaId);
      } else {
        azioni.innerHTML = info;
      }
      return;
    }
    azioni.innerHTML = `
      <button class="app-button tiny gray" id="ord-salva">💾 Salva bozza</button>
      <button class="app-button tiny" id="ord-invia-wa" style="background:#25D366;color:#fff;">📲 WhatsApp</button>
      <button class="app-button tiny" id="ord-invia-mail" style="background:#0E5A7A;color:#fff;">📧 Email</button>
      <button class="app-button tiny" id="ord-invia-both" style="background:#7c3aed;color:#fff;">📲📧 Entrambi</button>`;
    azioni.querySelector("#ord-salva").onclick = async () => {
      esito.style.color = "#64748b"; esito.textContent = "Salvataggio…";
      const id = await salva("bozza");
      if (id) { esito.style.color = "#15803d"; esito.textContent = "✅ Bozza salvata."; }
    };
    const invia = async (canale) => {
      esito.style.color = "#64748b"; esito.textContent = "Salvataggio e invio…";
      const id = await salva(stato === "bozza" ? "bozza" : stato);
      if (!id) return;
      // contatti fornitore per eventuale override
      const fornId = container.querySelector("#ord-fornitore").value;
      let tel_override = null, email_override = null;
      const f = ordine?.fornitori;
      const telFornitore = f?.telefono_referente_ordini || f?.telefono;
      const mailFornitore = f?.email_referente_ordini || f?.email_amministrativa;
      if ((canale === "whatsapp" || canale === "entrambi") && !telFornitore) {
        tel_override = prompt("Numero WhatsApp del fornitore (con prefisso, es. 3391234567):");
        if (!tel_override) { esito.style.color = "#dc2626"; esito.textContent = "Invio annullato: manca il numero."; return; }
      }
      if ((canale === "email" || canale === "entrambi") && !mailFornitore) {
        email_override = prompt("Email del fornitore:");
        if (!email_override) { esito.style.color = "#dc2626"; esito.textContent = "Invio annullato: manca l'email."; return; }
      }
      try {
        const { data: { session } } = await supa().auth.getSession();
        const resp = await fetch(FN_INVIO, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (session?.access_token || "") },
          body: JSON.stringify({ ordine_id: id, canale, tel_override, email_override })
        });
        const j = await resp.json();
        if (!j.ok) throw new Error(j.errore || "Errore invio");
        const parti = [];
        if (j.risultato.whatsapp) parti.push(j.risultato.whatsapp.ok ? "✅ WhatsApp inviato" : "❌ WhatsApp: " + j.risultato.whatsapp.msg);
        if (j.risultato.email) parti.push(j.risultato.email.ok ? "✅ Email inviata" : "❌ Email: " + j.risultato.email.msg);
        esito.style.color = j.inviato ? "#15803d" : "#dc2626";
        esito.innerHTML = parti.join("<br>");
        if (j.inviato) setTimeout(() => { window.location.hash = "#/ordini"; }, 1400);
      } catch (e) {
        esito.style.color = "#dc2626"; esito.textContent = "Errore: " + (e.message || e);
      }
    };
    azioni.querySelector("#ord-invia-wa").onclick = () => invia("whatsapp");
    azioni.querySelector("#ord-invia-mail").onclick = () => invia("email");
    azioni.querySelector("#ord-invia-both").onclick = () => invia("entrambi");
  }
  renderAzioni();
}

// ── Modale ricezione merce: carica magazzino via trigger DB ──
async function apriRicezione(ordine, righe, aziendaId) {
  const { data: righeOrd } = await supa().from("ordini_fornitore_righe").select("id, prodotto_id, quantita, unita_misura, prezzo_unitario").eq("ordine_id", ordine.id);
  const { data: giaRic } = await supa().from("ordini_fornitore_ricezioni_righe")
    .select("ordine_riga_id, quantita_ricevuta").in("ordine_riga_id", (righeOrd || []).map(r => r.id));
  const ricevutoPer = {};
  (giaRic || []).forEach(r => { ricevutoPer[r.ordine_riga_id] = (ricevutoPer[r.ordine_riga_id] || 0) + Number(r.quantita_ricevuta || 0); });

  const pids = (righeOrd || []).map(r => r.prodotto_id);
  const nomiById = {};
  if (pids.length) {
    const { data: prods } = await supa().from("prodotti").select("id, nome, nome_interno, costo_ultimo").in("id", pids);
    (prods || []).forEach(p => nomiById[String(p.id)] = p);
  }

  if (document.getElementById("rf-ric-backdrop")) document.getElementById("rf-ric-backdrop").remove();
  document.body.insertAdjacentHTML("beforeend",
    '<div class="rf-overlay-backdrop" id="rf-ric-backdrop" style="position:fixed;inset:0;background:rgba(15,23,42,0.5);display:flex;align-items:flex-end;justify-content:center;z-index:9999;">' +
    '<div style="width:100%;max-width:640px;max-height:88vh;background:#fff;border-radius:18px 18px 0 0;overflow:hidden;display:flex;flex-direction:column;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px;border-bottom:1px solid #eee;">' +
    '<h3 style="margin:0;font-size:16px;">\u{1F4E5} Ricezione — ' + esc(ordine.numero_ordine) + '</h3>' +
    '<button class="app-button tiny gray" id="rf-ric-close">Chiudi</button></div>' +
    '<div style="padding:14px;overflow:auto;" id="rf-ric-body"></div></div></div>');
  const bd = document.getElementById("rf-ric-backdrop");
  document.getElementById("rf-ric-close").onclick = () => bd.remove();
  bd.onclick = (e) => { if (e.target === bd) bd.remove(); };

  const body = document.getElementById("rf-ric-body");
  body.innerHTML =
    '<button class="app-button" id="rf-ric-scan" style="width:100%;padding:12px;font-weight:800;background:#0f172a;color:#fff;margin-bottom:10px;">\u{1F4F7} Spara codice a barre</button>' +
    '<div class="small-muted" style="margin-bottom:10px;">Inserisci le quantità realmente arrivate, oppure spara il codice per trovare il prodotto. Il magazzino si carica in automatico.</div>' +
    (righeOrd || []).map(r => {
      const p = nomiById[String(r.prodotto_id)] || {};
      const gia = ricevutoPer[r.id] || 0;
      const residuo = Math.max(Number(r.quantita) - gia, 0);
      return '<div class="rf-ric-riga" data-rigaid="' + r.id + '" data-pid="' + r.prodotto_id + '" style="padding:9px 0;border-bottom:1px solid #f1f5f9;' + (residuo <= 0 ? 'opacity:.5;' : '') + '">' +
        '<div style="font-weight:600;font-size:14px;">' + esc(p.nome_interno || p.nome || 'Prodotto') + '</div>' +
        '<div class="small-muted" style="font-size:11.5px;margin-bottom:5px;">ordinato ' + r.quantita + (r.unita_misura ? ' ' + esc(r.unita_misura) : '') + (gia > 0 ? ' · già ricevuto ' + gia : '') + (residuo > 0 ? ' · residuo ' + residuo : ' · completo') + '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
        '<input type="number" class="rf-ric-qta" value="' + (residuo > 0 ? residuo : 0) + '" min="0" step="0.5" style="width:80px;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:right;font-weight:700;">' +
        '<input type="number" class="rf-ric-costo" value="' + (r.prezzo_unitario ?? p.costo_ultimo ?? '') + '" min="0" step="0.01" placeholder="€/u" style="width:66px;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:right;">' +
        '<input type="text" class="rf-ric-lotto" placeholder="lotto" style="flex:1;min-width:60px;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;">' +
        '<input type="date" class="rf-ric-scad" style="padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;"></div></div>';
    }).join("") +
    '<div id="rf-ric-esito" style="font-size:13px;min-height:18px;margin:10px 0;"></div>' +
    '<button class="app-button" id="rf-ric-salva" style="width:100%;padding:13px;font-weight:800;background:#16a34a;color:#fff;">\u2705 Conferma ricezione e carica magazzino</button>';

  // Scanner: trova la riga per EAN, o propone l'associazione
  document.getElementById("rf-ric-scan").onclick = () => {
    apriScanner(async (codice) => {
      const esito = document.getElementById("rf-ric-esito");
      // 1) EAN già noto?
      const { data: trovato } = await supa().rpc("trova_prodotto_da_barcode", { p_azienda: aziendaId, p_barcode: codice });
      const prod = Array.isArray(trovato) ? trovato[0] : trovato;
      if (prod) {
        const riga = body.querySelector('.rf-ric-riga[data-pid="' + prod.id + '"]');
        if (riga) {
          riga.scrollIntoView({ behavior: "smooth", block: "center" });
          riga.style.transition = "background .3s"; riga.style.background = "#dcfce7";
          const qtaInput = riga.querySelector(".rf-ric-qta");
          qtaInput.focus(); qtaInput.select();
          setTimeout(() => { riga.style.background = ""; }, 1500);
          esito.style.color = "#15803d"; esito.textContent = "✅ " + (prod.nome_interno || prod.nome) + " — inserisci la quantità.";
        } else {
          esito.style.color = "#d97706"; esito.textContent = "⚠️ " + (prod.nome_interno || prod.nome) + " non è in questo ordine.";
        }
        return;
      }
      // 2) EAN nuovo: chiedo a OpenFoodFacts cosa e', poi associo a una riga
      esito.style.color = "#0E5A7A"; esito.textContent = "Riconoscimento prodotto in corso...";
      let riconosciuto = "";
      try {
        const rl = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/lookup-barcode?barcode=" + codice);
        const jl = await rl.json();
        if (jl.ok && jl.trovato) riconosciuto = [jl.nome, jl.quantita].filter(Boolean).join(" ");
      } catch (e) {}
      const opzioni = Array.from(body.querySelectorAll(".rf-ric-riga")).map(el => ({ pid: el.dataset.pid, nome: el.querySelector("div").textContent }));
      const intro = riconosciuto
        ? "Riconosciuto: " + riconosciuto + " (codice " + codice + ")\n\nA quale prodotto dell'ordine lo associo? Scrivi il numero:\n\n"
        : "Codice " + codice + " non riconosciuto dal database mondiale.\nA quale prodotto lo associo? Scrivi il numero:\n\n";
      const scelta = prompt(intro + opzioni.map((o, i) => (i + 1) + ") " + o.nome).join("\n"));
      const idx = parseInt(scelta) - 1;
      if (isNaN(idx) || idx < 0 || idx >= opzioni.length) { esito.style.color = "#64748b"; esito.textContent = riconosciuto ? (riconosciuto + " - associazione annullata.") : "Associazione annullata."; return; }
      const pid = Number(opzioni[idx].pid);
      const { error } = await supa().from("prodotti").update({ barcode: codice }).eq("id", pid);
      if (error) { esito.style.color = "#dc2626"; esito.textContent = "Errore associazione: " + error.message; return; }
      const riga = body.querySelector('.rf-ric-riga[data-pid="' + pid + '"]');
      if (riga) { riga.style.background = "#dcfce7"; riga.querySelector(".rf-ric-qta").focus(); setTimeout(() => { riga.style.background = ""; }, 1500); }
      esito.style.color = "#15803d"; esito.textContent = "🔗 Codice associato a " + opzioni[idx].nome + ". La prossima volta sarà automatico.";
    });
  };

  document.getElementById("rf-ric-salva").onclick = async () => {
    const btn = document.getElementById("rf-ric-salva");
    const esito = document.getElementById("rf-ric-esito");
    const daInserire = [];
    body.querySelectorAll(".rf-ric-riga").forEach(el => {
      const qta = parseFloat(el.querySelector(".rf-ric-qta").value) || 0;
      if (qta <= 0) return;
      daInserire.push({
        ordine_riga_id: el.dataset.rigaid,
        prodotto_id: Number(el.dataset.pid),
        quantita_ricevuta: qta,
        costo_unitario: parseFloat(el.querySelector(".rf-ric-costo").value) || null,
        lotto: el.querySelector(".rf-ric-lotto").value.trim() || null,
        data_scadenza: el.querySelector(".rf-ric-scad").value || null
      });
    });
    if (!daInserire.length) { esito.style.color = "#dc2626"; esito.textContent = "Inserisci almeno una quantità."; return; }
    btn.disabled = true; esito.style.color = "#64748b"; esito.textContent = "Registrazione e carico magazzino…";
    try {
      const { data: ric, error: e1 } = await supa().from("ordini_fornitore_ricezioni").insert({
        azienda_id: aziendaId, ordine_id: ordine.id, data_ricezione: new Date().toISOString().slice(0, 10)
      }).select("id").single();
      if (e1) throw e1;
      const righeIns = daInserire.map(r => ({ ...r, azienda_id: aziendaId, ricezione_id: ric.id }));
      const { error: e2 } = await supa().from("ordini_fornitore_ricezioni_righe").insert(righeIns);
      if (e2) throw e2;
      esito.style.color = "#15803d"; esito.textContent = "✅ Merce ricevuta e magazzino caricato!";
      btn.textContent = "Fatto ✓";
      setTimeout(() => { document.getElementById("rf-ric-backdrop")?.remove(); window.location.hash = "#/ordini"; }, 1300);
    } catch (err) {
      esito.style.color = "#dc2626"; esito.textContent = "Errore: " + (err.message || err); btn.disabled = false;
    }
  };
}
