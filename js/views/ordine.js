// js/views/ordine.js — Dettaglio/creazione ordine fornitore + invio WhatsApp/Email
import "../supabaseClient.js";
import "../state.js";

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
  const readonly = ["inviato", "ricevuto", "chiuso"].includes(stato);

  container.innerHTML = `
    <div class="view">
      <button class="app-button tiny gray" id="ord-back" style="margin-bottom:10px;">← Ordini</button>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <h2 style="margin:0;">${ordine ? "Ordine " + esc(ordine.numero_ordine) : "Nuovo ordine"}</h2>
        <span style="background:${stato === 'inviato' ? '#dcfce7;color:#15803d' : stato === 'bozza' ? '#fef3c7;color:#92400e' : '#e0f2fe;color:#0369a1'};border-radius:999px;padding:4px 12px;font-size:12px;font-weight:800;text-transform:uppercase;">${esc(stato)}</span>
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
      azioni.innerHTML = `<div class="small-muted">Ordine ${esc(stato)}${ordine?.inviato_at ? " il " + new Date(ordine.inviato_at).toLocaleString("it-IT") : ""}.</div>`;
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
