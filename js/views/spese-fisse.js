// Spese fisse — voci con importo annuo per sede. Il dashboard usa la quota pro-rata.
const COLORE = "#0E5A7A";
function supa() { return window.supabaseClient || window.supabase; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function eur(n) { return "€ " + (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const SUGGERITE = [
  "Affitto", "Utenze", "Commercialista", "Consulente del lavoro", "Marketing",
  "Tasse", "IMU", "TARI", "Canone unico (dehors/insegne)", "Canoni software",
  "Assicurazioni", "Spese condominiali", "Manutenzione impianti", "HACCP",
  "Medico del lavoro / RSPP", "Disinfestazione", "Antincendio / estintori",
  "Formazione", "Noleggio biancheria / lavanderia", "Smaltimento oli / rifiuti speciali",
  "Vigilanza / allarme", "Noleggi / leasing attrezzature", "Rate mutuo / finanziamenti",
  "Commissioni bancarie / POS", "Associazioni di categoria", "SIAE / diritti musicali",
  "Contributi INPS titolare"
];

export async function render(container) {
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva || null;
  if (!azienda?.id) { container.innerHTML = '<section style="padding:24px;"><div class="card"><h3>Nessuna azienda attiva</h3></div></section>'; return; }
  if (!sede?.id) { container.innerHTML = '<section style="padding:24px;"><div class="card"><h3>Seleziona una sede</h3><p>Le spese fisse sono per sede — scegli la sede in alto.</p></div></section>'; return; }

  const anno = new Date().getFullYear();
  container.innerHTML = '<section style="padding:16px;"><p style="color:#64748b;">Caricamento…</p></section>';

  async function carica() {
    const { data } = await supa().from("costi_fissi")
      .select("id, categoria, importo_annuo, attivo, note")
      .eq("azienda_id", azienda.id).eq("sede_uuid", sede.id).eq("anno_riferimento", anno)
      .order("categoria");
    return data || [];
  }

  let voci = await carica();

  function totale() { return voci.filter(v => v.attivo).reduce((s, v) => s + (Number(v.importo_annuo) || 0), 0); }

  function draw() {
    const tot = totale();
    const rows = voci.map(v => `
      <div class="sf-row" data-id="${v.id}" style="display:flex;gap:8px;align-items:center;padding:10px 4px;border-bottom:1px solid #f1f5f9;${v.attivo ? "" : "opacity:.5;"}">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0;">
          <input type="checkbox" class="sf-attivo" data-id="${v.id}" ${v.attivo ? "checked" : ""}>
          <span style="font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(v.categoria)}</span>
        </label>
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:13px;color:#64748b;">€/anno</span>
          <input class="sf-importo" data-id="${v.id}" type="number" step="10" min="0" inputmode="decimal" value="${v.importo_annuo != null ? v.importo_annuo : ""}" style="width:110px;padding:8px;border:1px solid #d1d5db;border-radius:8px;text-align:right;font-size:14px;">
          <button class="sf-del" data-id="${v.id}" title="Elimina" style="border:none;background:#fee2e2;color:#b91c1c;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:13px;">✕</button>
        </div>
      </div>`).join("");

    container.innerHTML = `
      <section style="padding:16px;max-width:820px;margin:0 auto;">
        <div class="card" style="border-radius:12px;padding:16px;margin-bottom:12px;">
          <h2 style="margin:0 0 4px;color:${COLORE};">💸 Spese fisse ${anno}</h2>
          <p style="margin:0 0 12px;color:#64748b;font-size:13px;">${esc(sede.nome || "")} — inserisci l'<strong>importo annuo</strong> di ogni voce. Il dashboard mostra la <strong>quota del periodo</strong> (annuo ÷ 365 × giorni), così il margine resta leggibile ogni giorno.</p>
          <div style="display:flex;gap:18px;flex-wrap:wrap;">
            <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:800;">Totale annuo</div><div style="font-size:22px;font-weight:800;color:${COLORE};">${eur(tot)}</div></div>
            <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:800;">Al mese</div><div style="font-size:22px;font-weight:800;color:#334155;">${eur(tot / 12)}</div></div>
            <div><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:800;">Al giorno</div><div style="font-size:22px;font-weight:800;color:#334155;">${eur(tot / 365)}</div></div>
          </div>
        </div>

        <div class="card" style="border-radius:12px;padding:12px 16px;margin-bottom:12px;">
          <div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:8px;">➕ Aggiungi voce</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <input id="sf-nuova-nome" list="sf-suggerite" placeholder="Nome voce (es. Affitto)" style="flex:1;min-width:180px;padding:9px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            <datalist id="sf-suggerite">${SUGGERITE.map(s => `<option value="${esc(s)}">`).join("")}</datalist>
            <input id="sf-nuova-importo" type="number" step="10" min="0" inputmode="decimal" placeholder="€/anno" style="width:120px;padding:9px;border:1px solid #d1d5db;border-radius:8px;text-align:right;font-size:14px;">
            <button id="sf-aggiungi" style="border:none;background:${COLORE};color:#fff;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer;">Aggiungi</button>
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-top:8px;">Suggerimenti: ${SUGGERITE.slice(0, 12).join(" · ")}…</div>
        </div>

        <div class="card" style="border-radius:12px;padding:8px 16px;">
          ${voci.length ? rows : '<p style="padding:16px;color:#64748b;">Nessuna voce ancora. Aggiungi la prima qui sopra.</p>'}
        </div>
      </section>`;

    wire();
  }

  function wire() {
    container.querySelector("#sf-aggiungi").onclick = async () => {
      const nome = (container.querySelector("#sf-nuova-nome").value || "").trim();
      const imp = Number(container.querySelector("#sf-nuova-importo").value);
      if (!nome) { alert("Scrivi il nome della voce."); return; }
      const { error } = await supa().from("costi_fissi").insert({
        azienda_id: azienda.id, sede_uuid: sede.id, categoria: nome,
        anno_riferimento: anno, importo_annuo: Number.isFinite(imp) ? imp : 0, attivo: true
      });
      if (error) { alert("Errore: " + error.message); return; }
      voci = await carica(); draw();
    };

    container.querySelectorAll(".sf-importo").forEach(inp => {
      inp.onchange = async () => {
        const id = Number(inp.dataset.id);
        const val = Number(inp.value) || 0;
        inp.disabled = true;
        const { error } = await supa().from("costi_fissi").update({ importo_annuo: val }).eq("id", id);
        inp.disabled = false;
        if (error) { inp.style.borderColor = "#dc2626"; return; }
        const v = voci.find(x => x.id === id); if (v) v.importo_annuo = val;
        draw();
      };
    });

    container.querySelectorAll(".sf-attivo").forEach(chk => {
      chk.onchange = async () => {
        const id = Number(chk.dataset.id);
        const { error } = await supa().from("costi_fissi").update({ attivo: chk.checked }).eq("id", id);
        if (error) { alert("Errore: " + error.message); chk.checked = !chk.checked; return; }
        const v = voci.find(x => x.id === id); if (v) v.attivo = chk.checked;
        draw();
      };
    });

    container.querySelectorAll(".sf-del").forEach(btn => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.id);
        if (!confirm("Eliminare questa voce?")) return;
        const { error } = await supa().from("costi_fissi").delete().eq("id", id);
        if (error) { alert("Errore: " + error.message); return; }
        voci = voci.filter(x => x.id !== id); draw();
      };
    });
  }

  draw();
}
