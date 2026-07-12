// js/views/magazzino/riordino.js — Lista "Da riordinare": approva col tap, genera ordini bozza per fornitore
import "../../supabaseClient.js";

const supa = () => window.supabaseClient || window.supabase || window.db;

function esc(s) { return String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function eur(n) { return (Number(n) || 0).toFixed(2).replace(".", ","); }

export async function apriRiordinoModal(azienda) {
  const aziendaId = azienda?.id || window.state?.azienda?.id;
  if (!aziendaId) return;

  if (document.getElementById("rf-riordino-backdrop")) document.getElementById("rf-riordino-backdrop").remove();
  document.body.insertAdjacentHTML("beforeend", `
    <div class="rf-overlay-backdrop" id="rf-riordino-backdrop">
      <div class="rf-overlay-card">
        <div class="rf-overlay-header">
          <h3 class="rf-overlay-title">⚠️ Da riordinare</h3>
          <button class="app-button tiny gray" id="rf-riordino-close">Chiudi</button>
        </div>
        <div class="rf-overlay-body" id="rf-riordino-body">
          <div class="small-muted">Controllo scorte in corso…</div>
        </div>
      </div>
    </div>
  `);
  const backdrop = document.getElementById("rf-riordino-backdrop");
  document.getElementById("rf-riordino-close").onclick = () => backdrop.remove();
  backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };

  const body = document.getElementById("rf-riordino-body");
  const { data, error } = await supa().rpc("get_prodotti_da_riordinare", { p_azienda: aziendaId });
  if (error) { body.innerHTML = `<div class="small-muted" style="color:#dc2626;">Errore: ${esc(error.message)}</div>`; return; }

  const righe = data || [];
  if (!righe.length) {
    body.innerHTML = `
      <div style="text-align:center;padding:26px 10px;">
        <div style="font-size:32px;">✅</div>
        <div style="font-weight:700;margin-top:6px;">Nessun prodotto sotto scorta</div>
        <div class="small-muted" style="margin-top:4px;">Tutto in ordine. Ricorda di impostare la scorta minima nei prodotti perché gli alert funzionino.</div>
      </div>`;
    return;
  }

  // Raggruppo per fornitore
  const gruppi = {};
  for (const r of righe) {
    const k = r.fornitore_preferito_id ? `f${r.fornitore_preferito_id}` : "nessuno";
    if (!gruppi[k]) gruppi[k] = { nome: r.fornitore_preferito || "Senza fornitore preferito", id: r.fornitore_preferito_id, items: [] };
    gruppi[k].items.push(r);
  }

  let html = `<div class="small-muted" style="margin-bottom:10px;">${righe.length} prodotti sotto scorta. Regola le quantità, deseleziona ciò che non vuoi ordinare, poi genera gli ordini bozza.</div>`;
  for (const [k, g] of Object.entries(gruppi)) {
    html += `
      <div class="rf-forn-group" data-forn="${g.id || ''}" data-forn-nome="${esc(g.nome)}" style="border:1px solid #e5e7eb;border-radius:14px;padding:12px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
          <div style="font-weight:800;">🏢 ${esc(g.nome)}</div>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" class="rf-check-all" checked> tutti</label>
        </div>
        ${g.items.map(r => `
          <div class="rf-riordino-item" data-pid="${r.prodotto_id}" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #f1f5f9;">
            <input type="checkbox" class="rf-ri-check" checked>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.nome)}</div>
              <div class="small-muted" style="font-size:11.5px;">giacenza ${eur(r.giacenza_attuale)} / soglia ${eur(r.scorta_minima)} ${esc(r.unita_misura || '')}${r.costo_ultimo ? ` · ~€${eur(r.costo_ultimo)}/${esc(r.unita_misura||'u')}` : ''}</div>
            </div>
            <input type="number" class="rf-ri-qta" value="${r.quantita_consigliata}" min="0" step="0.5" style="width:74px;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:right;font-weight:700;">
            <span class="small-muted" style="font-size:11px;width:26px;">${esc(r.unita_misura || '')}</span>
          </div>`).join("")}
      </div>`;
  }
  html += `
    <div id="rf-riordino-esito" style="font-size:13px;min-height:16px;margin:6px 0;"></div>
    <button class="app-button" id="rf-genera-ordini" style="width:100%;padding:13px;font-weight:800;">📦 Genera ordini bozza</button>`;
  body.innerHTML = html;

  // "tutti" per gruppo
  body.querySelectorAll(".rf-check-all").forEach(chk => {
    chk.onchange = () => {
      chk.closest(".rf-forn-group").querySelectorAll(".rf-ri-check").forEach(c => { c.checked = chk.checked; });
    };
  });

  document.getElementById("rf-genera-ordini").onclick = async () => {
    const btn = document.getElementById("rf-genera-ordini");
    const esito = document.getElementById("rf-riordino-esito");
    btn.disabled = true;
    esito.style.color = "#64748b";
    esito.textContent = "Creazione ordini bozza…";

    // Raccolgo per fornitore le righe selezionate con qta > 0
    const perFornitore = {};
    body.querySelectorAll(".rf-forn-group").forEach(gr => {
      const fornId = gr.dataset.forn || null;
      const fornNome = gr.dataset.fornNome;
      gr.querySelectorAll(".rf-riordino-item").forEach(it => {
        const checked = it.querySelector(".rf-ri-check").checked;
        const qta = parseFloat(it.querySelector(".rf-ri-qta").value) || 0;
        if (!checked || qta <= 0) return;
        const key = fornId || "nessuno";
        if (!perFornitore[key]) perFornitore[key] = { fornId: fornId ? Number(fornId) : null, fornNome, righe: [] };
        perFornitore[key].righe.push({ prodotto_id: Number(it.dataset.pid), quantita: qta });
      });
    });

    const gruppiOrdine = Object.values(perFornitore).filter(g => g.righe.length);
    if (!gruppiOrdine.length) { esito.style.color = "#dc2626"; esito.textContent = "Nessuna riga selezionata."; btn.disabled = false; return; }

    let creati = 0;
    try {
      for (const g of gruppiOrdine) {
        const numero = "RO-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(Math.random() * 900 + 100);
        const { data: ordine, error: e1 } = await supa().from("ordini_fornitore").insert({
          azienda_id: aziendaId,
          numero_ordine: numero,
          fornitore_id: g.fornId,
          stato: "bozza",
          data_ordine: new Date().toISOString().slice(0, 10),
          sede_id: window.state?.sedeAttiva?.id || null,
          origine: "riordino_automatico",
          creato_da: window.state?.user?.id || null,
          note: "Generato da lista Da riordinare"
        }).select("id").single();
        if (e1) throw e1;
        const righeIns = g.righe.map(r => ({
          azienda_id: aziendaId, ordine_id: ordine.id, prodotto_id: r.prodotto_id, quantita: r.quantita
        }));
        const { error: e2 } = await supa().from("ordini_fornitore_righe").insert(righeIns);
        if (e2) throw e2;
        creati++;
      }
      esito.style.color = "#15803d";
      esito.innerHTML = `✅ ${creati} ordini bozza creati. Vai su <b>Ordini Fornitore</b> per rivederli e inviarli.`;
      btn.textContent = "Fatto ✓";
    } catch (err) {
      esito.style.color = "#dc2626";
      esito.textContent = "Errore: " + (err.message || err);
      btn.disabled = false;
    }
  };
}
