// js/views/magazzino/ricezione.js — Ricezione merce del magazziniere: scanner + carico magazzino
// Due modalità: "Spara e carica" (senza ordine) · "Ricevi ordine" (con controllo qta vs ordine)
import { apriScanner } from "../barcode-scanner-v2.js";

const supa = () => window.supabaseClient || window.supabase || window.db;
const FN_LOOKUP = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/lookup-barcode";

function esc(s) { return String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

export async function apriRicezioneModal(azienda) {
  const aziendaId = azienda?.id || window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id || null;
  if (!aziendaId) return;

  if (document.getElementById("rf-ricmag-backdrop")) document.getElementById("rf-ricmag-backdrop").remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="rf-overlay-backdrop" id="rf-ricmag-backdrop" style="position:fixed;inset:0;background:rgba(15,23,42,0.5);display:flex;align-items:flex-end;justify-content:center;z-index:9998;">
      <div style="width:100%;max-width:720px;max-height:90vh;background:#fff;border-radius:18px 18px 0 0;overflow:hidden;display:flex;flex-direction:column;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;border-bottom:1px solid #eee;">
          <h3 style="margin:0;font-size:16px;">📥 Ricezione merce</h3>
          <button class="app-button tiny gray" id="rf-ricmag-close">Chiudi</button>
        </div>
        <div style="padding:14px;overflow:auto;" id="rf-ricmag-body"></div>
      </div>
    </div>`);
  const bd = document.getElementById("rf-ricmag-backdrop");
  document.getElementById("rf-ricmag-close").onclick = () => bd.remove();
  bd.onclick = (e) => { if (e.target === bd) bd.remove(); };

  const body = document.getElementById("rf-ricmag-body");
  // Scelta modalità
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <button id="rf-mod-libera" style="padding:20px 12px;border:2px solid #16a34a;background:#f0fdf4;border-radius:14px;cursor:pointer;text-align:center;">
        <div style="font-size:30px;">📷</div>
        <div style="font-weight:800;margin-top:6px;">Spara e carica</div>
        <div style="font-size:11.5px;color:#64748b;margin-top:2px;">Merce arrivata senza ordine</div>
      </button>
      <button id="rf-mod-ordine" style="padding:20px 12px;border:2px solid #0E5A7A;background:#f0f9ff;border-radius:14px;cursor:pointer;text-align:center;">
        <div style="font-size:30px;">📋</div>
        <div style="font-weight:800;margin-top:6px;">Ricevi ordine</div>
        <div style="font-size:11.5px;color:#64748b;margin-top:2px;">Controlla vs bolla/ordine</div>
      </button>
    </div>`;
  body.querySelector("#rf-mod-libera").onclick = () => modalitaLibera(body, aziendaId, sedeId);
  body.querySelector("#rf-mod-ordine").onclick = () => modalitaOrdine(body, aziendaId, sedeId);
}

// ─────────────── MODALITÀ 1: Spara e carica (senza ordine) ───────────────
async function modalitaLibera(body, aziendaId, sedeId) {
  const carrello = []; // {prodotto_id, nome, quantita, costo, um}
  body.innerHTML = `
    <button class="app-button tiny gray" id="rf-back-mod" style="margin-bottom:10px;">← Modalità</button>
    <button class="app-button" id="rf-scan-libera" style="width:100%;padding:14px;font-weight:800;background:#16a34a;color:#fff;margin-bottom:12px;">📷 Spara codice a barre</button>
    <div class="small-muted" style="margin-bottom:8px;">Spara i codici: ogni prodotto si aggiunge alla lista. Poi carica tutto in una volta.</div>
    <div id="rf-carrello"></div>
    <div id="rf-libera-esito" style="font-size:13px;min-height:18px;margin:8px 0;"></div>
    <button class="app-button" id="rf-carica-tutto" style="width:100%;padding:13px;font-weight:800;background:#16a34a;color:#fff;display:none;">✅ Carica in magazzino</button>`;

  body.querySelector("#rf-back-mod").onclick = () => apriRicezioneModal({ id: aziendaId });

  const boxCarrello = body.querySelector("#rf-carrello");
  const esito = body.querySelector("#rf-libera-esito");
  const btnCarica = body.querySelector("#rf-carica-tutto");

  function renderCarrello() {
    if (!carrello.length) { boxCarrello.innerHTML = `<div class="small-muted" style="text-align:center;padding:16px;">Nessun prodotto ancora. Spara un codice per iniziare.</div>`; btnCarica.style.display = "none"; return; }
    boxCarrello.innerHTML = carrello.map((r, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <div style="flex:1;min-width:0;font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.nome)}</div>
        <input type="number" class="rf-cq" data-i="${i}" value="${r.quantita}" min="0" step="0.5" style="width:70px;padding:6px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:right;font-weight:700;">
        <span class="small-muted" style="font-size:11px;width:24px;">${esc(r.um || "")}</span>
        <input type="number" class="rf-cc" data-i="${i}" value="${r.costo ?? ""}" min="0" step="0.01" placeholder="€/u" style="width:62px;padding:6px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:right;">
        <button class="rf-cx" data-i="${i}" style="background:none;border:none;color:#dc2626;font-size:18px;cursor:pointer;">×</button>
      </div>`).join("");
    boxCarrello.querySelectorAll(".rf-cq").forEach(el => el.oninput = () => { carrello[+el.dataset.i].quantita = parseFloat(el.value) || 0; });
    boxCarrello.querySelectorAll(".rf-cc").forEach(el => el.oninput = () => { carrello[+el.dataset.i].costo = parseFloat(el.value) || null; });
    boxCarrello.querySelectorAll(".rf-cx").forEach(el => el.onclick = () => { carrello.splice(+el.dataset.i, 1); renderCarrello(); });
    btnCarica.style.display = "block";
  }
  renderCarrello();

  body.querySelector("#rf-scan-libera").onclick = () => {
    apriScanner(async (codice) => {
      esito.style.color = "#0E5A7A"; esito.textContent = "🔍 Cerco il prodotto…";
      // 1) barcode già associato?
      const { data: trovato } = await supa().rpc("trova_prodotto_da_barcode", { p_azienda: aziendaId, p_barcode: codice });
      const p = Array.isArray(trovato) ? trovato[0] : trovato;
      if (p) {
        const ex = carrello.find(r => String(r.prodotto_id) === String(p.id));
        if (ex) { ex.quantita += 1; }
        else carrello.push({ prodotto_id: p.id, nome: p.nome_interno || p.nome, quantita: 1, costo: p.costo_ultimo ?? null, um: p.unita_base || "" });
        esito.style.color = "#15803d"; esito.textContent = "✅ " + (p.nome_interno || p.nome) + " aggiunto.";
        renderCarrello();
        return;
      }
      // 2) EAN nuovo → OpenFoodFacts + scelta prodotto
      esito.textContent = "🔍 Riconoscimento…";
      let riconosciuto = "";
      try { const r = await fetch(FN_LOOKUP + "?barcode=" + codice); const j = await r.json(); if (j.ok && j.trovato) riconosciuto = [j.nome, j.quantita].filter(Boolean).join(" "); } catch (e) {}
      // cerca prodotti per nome per associare
      const termine = prompt((riconosciuto ? "📦 Riconosciuto: " + riconosciuto + "\n\n" : "Codice " + codice + " non riconosciuto.\n\n") + "Scrivi il nome del prodotto in magazzino da associare:", riconosciuto.split(" ")[0] || "");
      if (!termine) { esito.style.color = "#64748b"; esito.textContent = "Annullato."; return; }
      const { data: prods } = await supa().from("prodotti").select("id, nome, nome_interno, unita_base, costo_ultimo").eq("azienda_id", aziendaId).eq("stato", "attivo").or(`nome.ilike.%${termine}%,nome_interno.ilike.%${termine}%`).limit(8);
      if (!prods || !prods.length) { esito.style.color = "#d97706"; esito.textContent = "Nessun prodotto trovato per «" + termine + "». Crealo prima in Materie Prime."; return; }
      const scelta = prompt("Quale prodotto?\n\n" + prods.map((x, i) => (i + 1) + ") " + (x.nome_interno || x.nome)).join("\n"));
      const idx = parseInt(scelta) - 1;
      if (isNaN(idx) || idx < 0 || idx >= prods.length) { esito.style.color = "#64748b"; esito.textContent = "Annullato."; return; }
      const prod = prods[idx];
      await supa().from("prodotti").update({ barcode: codice }).eq("id", prod.id);
      carrello.push({ prodotto_id: prod.id, nome: prod.nome_interno || prod.nome, quantita: 1, costo: prod.costo_ultimo ?? null, um: prod.unita_base || "" });
      esito.style.color = "#15803d"; esito.textContent = "🔗 Codice associato a " + (prod.nome_interno || prod.nome) + " (automatico d'ora in poi).";
      renderCarrello();
    });
  };

  btnCarica.onclick = async () => {
    const validi = carrello.filter(r => (Number(r.quantita) || 0) > 0);
    if (!validi.length) { esito.style.color = "#dc2626"; esito.textContent = "Nessuna quantità da caricare."; return; }
    btnCarica.disabled = true; esito.style.color = "#64748b"; esito.textContent = "Carico in magazzino…";
    try {
      const movimenti = validi.map(r => ({
        azienda_id: aziendaId, sede_id: sedeId, prodotto_id: r.prodotto_id,
        tipo_movimento: "carico", quantita: Number(r.quantita),
        costo: r.costo ? Number(r.costo) * Number(r.quantita) : null,
        causale: "Ricezione rapida (scanner)"
      }));
      const { error } = await supa().from("magazzino_movimenti").insert(movimenti);
      if (error) throw error;
      esito.style.color = "#15803d"; esito.textContent = "✅ " + validi.length + " prodotti caricati in magazzino!";
      btnCarica.textContent = "Fatto ✓";
      setTimeout(() => { document.getElementById("rf-ricmag-backdrop")?.remove(); }, 1300);
    } catch (err) { esito.style.color = "#dc2626"; esito.textContent = "Errore: " + (err.message || err); btnCarica.disabled = false; }
  };
}

// ─────────────── MODALITÀ 2: Ricevi ordine (con controllo) ───────────────
async function modalitaOrdine(body, aziendaId, sedeId) {
  body.innerHTML = `<button class="app-button tiny gray" id="rf-back-mod2" style="margin-bottom:10px;">← Modalità</button>
    <div class="small-muted" style="margin-bottom:8px;">Ordini in attesa di consegna:</div>
    <div id="rf-lista-ordini"><div class="small-muted">Caricamento…</div></div>`;
  body.querySelector("#rf-back-mod2").onclick = () => apriRicezioneModal({ id: aziendaId });

  const lista = body.querySelector("#rf-lista-ordini");
  const { data: ordini } = await supa().from("ordini_fornitore")
    .select("id, numero_ordine, data_ordine, stato, fornitori(ragione_sociale)")
    .eq("azienda_id", aziendaId).in("stato", ["inviato", "parziale", "bozza"])
    .order("data_ordine", { ascending: false }).limit(30);

  if (!ordini || !ordini.length) {
    lista.innerHTML = `<div class="small-muted" style="text-align:center;padding:16px;">Nessun ordine in attesa. Usa "Spara e carica" per ricevere senza ordine.</div>`;
    return;
  }
  lista.innerHTML = ordini.map(o => `
    <div class="rf-ord-item" data-id="${o.id}" style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div>
          <div style="font-weight:700;">${esc(o.numero_ordine)}</div>
          <div class="small-muted" style="font-size:12px;">${esc(o.fornitori?.ragione_sociale || "—")} · ${esc(o.data_ordine || "")}</div>
        </div>
        <span style="background:${o.stato === 'parziale' ? '#fed7aa;color:#c2410c' : '#dcfce7;color:#15803d'};border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;">${esc(o.stato)}</span>
      </div>
    </div>`).join("");
  lista.querySelectorAll(".rf-ord-item").forEach(el => el.onclick = () => riceviOrdine(body, aziendaId, sedeId, el.dataset.id));
}

async function riceviOrdine(body, aziendaId, sedeId, ordineId) {
  const { data: righeOrd } = await supa().from("ordini_fornitore_righe").select("id, prodotto_id, quantita, unita_misura, prezzo_unitario").eq("ordine_id", ordineId);
  const { data: giaRic } = await supa().from("ordini_fornitore_ricezioni_righe").select("ordine_riga_id, quantita_ricevuta").in("ordine_riga_id", (righeOrd || []).map(r => r.id));
  const ricevuto = {};
  (giaRic || []).forEach(r => { ricevuto[r.ordine_riga_id] = (ricevuto[r.ordine_riga_id] || 0) + Number(r.quantita_ricevuta || 0); });
  const pids = (righeOrd || []).map(r => r.prodotto_id);
  const nomi = {};
  if (pids.length) { const { data: pr } = await supa().from("prodotti").select("id, nome, nome_interno").in("id", pids); (pr || []).forEach(p => nomi[String(p.id)] = p); }

  body.innerHTML = `<button class="app-button tiny gray" id="rf-back-ord" style="margin-bottom:10px;">← Ordini</button>
    <button class="app-button" id="rf-scan-ord" style="width:100%;padding:12px;font-weight:800;background:#0f172a;color:#fff;margin-bottom:10px;">📷 Spara per trovare la riga</button>
    <div class="small-muted" style="margin-bottom:8px;">Verifica le quantità arrivate rispetto all'ordine.</div>
    <div id="rf-ord-righe">${(righeOrd || []).map(r => {
      const p = nomi[String(r.prodotto_id)] || {};
      const gia = ricevuto[r.id] || 0;
      const residuo = Math.max(Number(r.quantita) - gia, 0);
      return `<div class="rf-ord-riga" data-rigaid="${r.id}" data-pid="${r.prodotto_id}" style="padding:9px 0;border-bottom:1px solid #f1f5f9;${residuo <= 0 ? 'opacity:.5;' : ''}">
        <div style="font-weight:600;font-size:14px;">${esc(p.nome_interno || p.nome || "Prodotto")}</div>
        <div class="small-muted" style="font-size:11.5px;margin-bottom:5px;">ordinato ${r.quantita}${r.unita_misura ? ' ' + esc(r.unita_misura) : ''}${gia > 0 ? ' · già ric. ' + gia : ''}${residuo > 0 ? ' · residuo ' + residuo : ' · ✓ completo'}</div>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="number" class="rf-or-qta" value="${residuo > 0 ? residuo : 0}" min="0" step="0.5" style="width:80px;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:right;font-weight:700;">
          <input type="number" class="rf-or-costo" value="${r.prezzo_unitario ?? ''}" min="0" step="0.01" placeholder="€/u" style="width:64px;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:right;">
          <input type="text" class="rf-or-lotto" placeholder="lotto" style="flex:1;min-width:50px;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;">
          <input type="date" class="rf-or-scad" style="padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;">
        </div>
      </div>`;
    }).join("")}</div>
    <div id="rf-ord-esito" style="font-size:13px;min-height:18px;margin:10px 0;"></div>
    <button class="app-button" id="rf-ord-conferma" style="width:100%;padding:13px;font-weight:800;background:#16a34a;color:#fff;">✅ Conferma e carica magazzino</button>`;

  const boxRighe = body.querySelector("#rf-ord-righe");
  const esito = body.querySelector("#rf-ord-esito");
  body.querySelector("#rf-back-ord").onclick = () => modalitaOrdine(body, aziendaId, sedeId);

  body.querySelector("#rf-scan-ord").onclick = () => {
    apriScanner(async (codice) => {
      const { data: trovato } = await supa().rpc("trova_prodotto_da_barcode", { p_azienda: aziendaId, p_barcode: codice });
      const p = Array.isArray(trovato) ? trovato[0] : trovato;
      if (p) {
        const riga = boxRighe.querySelector('.rf-ord-riga[data-pid="' + p.id + '"]');
        if (riga) { riga.scrollIntoView({ behavior: "smooth", block: "center" }); riga.style.background = "#dcfce7"; riga.querySelector(".rf-or-qta").focus(); setTimeout(() => { riga.style.background = ""; }, 1500); esito.style.color = "#15803d"; esito.textContent = "✅ " + (p.nome_interno || p.nome); }
        else { esito.style.color = "#d97706"; esito.textContent = "⚠️ " + (p.nome_interno || p.nome) + " non è in questo ordine."; }
      } else { esito.style.color = "#d97706"; esito.textContent = "Codice non associato. Associalo dalla modalità «Spara e carica»."; }
    });
  };

  body.querySelector("#rf-ord-conferma").onclick = async () => {
    const btn = body.querySelector("#rf-ord-conferma");
    const daIns = [];
    boxRighe.querySelectorAll(".rf-ord-riga").forEach(el => {
      const qta = parseFloat(el.querySelector(".rf-or-qta").value) || 0;
      if (qta <= 0) return;
      daIns.push({ ordine_riga_id: el.dataset.rigaid, prodotto_id: Number(el.dataset.pid), quantita_ricevuta: qta, costo_unitario: parseFloat(el.querySelector(".rf-or-costo").value) || null, lotto: el.querySelector(".rf-or-lotto").value.trim() || null, data_scadenza: el.querySelector(".rf-or-scad").value || null });
    });
    if (!daIns.length) { esito.style.color = "#dc2626"; esito.textContent = "Inserisci almeno una quantità."; return; }
    btn.disabled = true; esito.style.color = "#64748b"; esito.textContent = "Registrazione e carico…";
    try {
      const { data: ric, error: e1 } = await supa().from("ordini_fornitore_ricezioni").insert({ azienda_id: aziendaId, ordine_id: ordineId, data_ricezione: new Date().toISOString().slice(0, 10) }).select("id").single();
      if (e1) throw e1;
      const { error: e2 } = await supa().from("ordini_fornitore_ricezioni_righe").insert(daIns.map(r => ({ ...r, azienda_id: aziendaId, ricezione_id: ric.id })));
      if (e2) throw e2;
      esito.style.color = "#15803d"; esito.textContent = "✅ Merce ricevuta e magazzino caricato!";
      btn.textContent = "Fatto ✓";
      setTimeout(() => { document.getElementById("rf-ricmag-backdrop")?.remove(); }, 1300);
    } catch (err) { esito.style.color = "#dc2626"; esito.textContent = "Errore: " + (err.message || err); btn.disabled = false; }
  };
}
