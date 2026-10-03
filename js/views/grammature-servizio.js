// js/views/grammature-servizio.js
// Grammature di servizio: la ricetta e' una sola, cambia la porzione servita per
// locale. Trattoria e Ristorante si scrivono a mano; il Ricevimento si calcola dal
// Ristorante meno una percentuale, ma resta scrivibile: se qualcuno lo corregge
// diventa "manuale" e non si ricalcola piu' finche' non si preme ↺.
// Ogni campo si salva da solo appena si esce dal campo.

const SEZIONI = ["Primi", "Secondi", "Contorni", "Antipasti", "Dessert", "Altro"];

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  let righe = [];
  let config = { sconto_ricevimento: 40, ricevimento_vale_per: null, catering_usa: null, note: "" };

  container.innerHTML = `<div class="gs"><div class="gs-caric">Un attimo…</div></div>${stile()}`;
  await carica();
  disegna();

  async function carica() {
    const [r, c] = await Promise.all([
      supabase.from("grammature_servizio").select("*").eq("azienda_id", azienda.id).order("ordine").order("id"),
      supabase.from("grammature_servizio_config").select("*").eq("azienda_id", azienda.id).maybeSingle(),
    ]);
    righe = r.data || [];
    if (c.data) config = c.data;
  }

  function sconto() {
    const s = Number(config.sconto_ricevimento);
    return Number.isFinite(s) ? s : 40;
  }
  function calcolaRic(ris) {
    const r = Number(ris);
    if (!(r > 0)) return null;
    return Math.round(r * (1 - sconto() / 100) * 10) / 10;
  }
  function fmt(v) {
    return v === null || v === undefined || v === "" ? "" : String(Number(v)).replace(".", ",");
  }
  function num(v) {
    const n = parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function disegna() {
    const perSez = {};
    righe.forEach(r => { (perSez[r.sezione] = perSez[r.sezione] || []).push(r); });
    const sezioni = SEZIONI.filter(s => perSez[s]?.length)
      .concat(Object.keys(perSez).filter(s => !SEZIONI.includes(s)));

    container.innerHTML = `
      <div class="gs">
        <h1>⚖️ Grammature di servizio</h1>
        <p class="gs-sub">Stessa ricetta, porzione diversa per locale. Il <b>Ricevimento</b> si calcola dal
          Ristorante; se lo correggi a mano resta tuo (↺ per tornare al calcolo). Si salva da solo.</p>

        <div class="gs-card gs-conf">
          <div class="gs-nome">Ricevimento rispetto al Ristorante</div>
          <div class="gs-pct">meno <input id="gs-sconto" type="number" inputmode="decimal" min="0" max="90" step="1"
            value="${fmt(sconto())}"> %</div>
        </div>

        ${sezioni.map(s => `
          <h2>${esc(s)}</h2>
          ${perSez[s].map(cardRiga).join("")}
        `).join("")}

        <button class="gs-add" id="gs-add" type="button">+ Aggiungi una riga</button>

        <h2>Conferme</h2>
        <div class="gs-card">
          <div class="gs-nome">Il meno % del ricevimento vale per tutti i componenti?</div>
          ${scelte("ricevimento_vale_per", [["si", "Sì, tutti"], ["solo_primi", "Solo primi e contorni"], ["vedi_note", "Dipende (vedi note)"]])}
        </div>
        <div class="gs-card">
          <div class="gs-nome">Catering Ricevimenti usa le grammature "ricevimento"?</div>
          ${scelte("catering_usa", [["si", "Sì"], ["ristorante", "No, come il ristorante"], ["vedi_note", "Dipende"]])}
        </div>
        <div class="gs-card">
          <div class="gs-nome">Note</div>
          <textarea id="gs-note" rows="3" placeholder="Eccezioni, piatti al peso…">${esc(config.note || "")}</textarea>
        </div>
        <div id="gs-toast" class="gs-toast"></div>
      </div>${stile()}`;

    collega();
  }

  function scelte(campo, opzioni) {
    return `<div class="gs-opt">${opzioni.map(([v, l]) => `
      <label><input type="radio" name="${campo}" value="${v}" ${config[campo] === v ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div>`;
  }

  function cardRiga(r) {
    return `
      <div class="gs-card" data-id="${r.id}">
        <div class="gs-nome">
          <input class="gs-in gs-tit" data-f="nome" value="${esc(r.nome)}">
          <select class="gs-um" data-f="um">
            ${["g", "pz", "ml"].map(u => `<option ${r.um === u ? "selected" : ""}>${u}</option>`).join("")}
          </select>
        </div>
        <div class="gs-g">
          <label><span>Trattoria</span>
            <input class="gs-in" data-f="trattoria" type="number" inputmode="decimal" min="0" step="any" value="${fmt(r.trattoria)}"></label>
          <label><span>Ristorante</span>
            <input class="gs-in" data-f="ristorante" type="number" inputmode="decimal" min="0" step="any" value="${fmt(r.ristorante)}"></label>
          <label><span>Ricevimento ${r.ricevimento_manuale
              ? `<b class="gs-man">manuale</b> <button type="button" class="gs-reset" title="Torna al calcolo">↺</button>`
              : `<i class="gs-calc">−${fmt(sconto())}%</i>`}</span>
            <input class="gs-in ${r.ricevimento_manuale ? "gs-in-man" : "gs-in-calc"}" data-f="ricevimento" type="number"
              inputmode="decimal" min="0" step="any" value="${fmt(r.ricevimento)}"></label>
        </div>
        <label class="gs-chk"><input type="checkbox" data-f="al_peso" ${r.al_peso ? "checked" : ""}> Si vende al peso / porzione variabile</label>
        <div class="gs-riga2">
          <input class="gs-in gs-nota" data-f="nota" placeholder="Nota (facoltativa)" value="${esc(r.nota || "")}">
          <button type="button" class="gs-del" title="Elimina riga">🗑</button>
        </div>
      </div>`;
  }

  function collega() {
    const box = container.querySelector(".gs");

    box.querySelectorAll(".gs-card[data-id]").forEach(card => {
      const id = Number(card.dataset.id);
      const riga = () => righe.find(x => x.id === id);

      card.querySelectorAll("[data-f]").forEach(el => {
        el.addEventListener("change", async () => {
          const r = riga(); if (!r) return;
          const f = el.dataset.f;
          const patch = {};
          if (f === "al_peso") patch.al_peso = el.checked;
          else if (f === "nome") { const v = el.value.trim(); if (!v) { el.value = r.nome; return; } patch.nome = v; }
          else if (f === "um" || f === "nota") patch[f] = el.value.trim() || (f === "um" ? "g" : null);
          else if (f === "ricevimento") {
            const v = num(el.value);
            const calcolato = calcolaRic(r.ristorante);
            // scritto a mano e diverso dal calcolo: diventa manuale; vuoto: torna al calcolo
            if (v === null) { patch.ricevimento = calcolato; patch.ricevimento_manuale = false; }
            else { patch.ricevimento = v; patch.ricevimento_manuale = v !== calcolato; }
          } else {
            patch[f] = num(el.value);
            if (f === "ristorante" && !r.ricevimento_manuale) patch.ricevimento = calcolaRic(patch.ristorante);
          }
          const prima = r.ricevimento_manuale;
          if (!(await salvaRiga(r, patch))) return;
          // cambia lo stato manuale/calcolato: ridisegno per aggiornare etichetta e colore;
          // altrimenti aggiorno solo il numero, cosi' chi scrive non perde il campo
          if (r.ricevimento_manuale !== prima) disegna();
          else if ("ricevimento" in patch) card.querySelector("[data-f=ricevimento]").value = fmt(r.ricevimento);
        });
      });

      card.querySelector(".gs-reset")?.addEventListener("click", async () => {
        const r = riga(); if (!r) return;
        await salvaRiga(r, { ricevimento: calcolaRic(r.ristorante), ricevimento_manuale: false });
        disegna();
      });

      card.querySelector(".gs-del").addEventListener("click", async () => {
        const r = riga(); if (!r) return;
        if (!confirm(`Eliminare "${r.nome}"?`)) return;
        const { error } = await supabase.from("grammature_servizio").delete().eq("id", r.id).eq("azienda_id", azienda.id);
        if (error) return toast("Non eliminata: " + error.message, true);
        righe = righe.filter(x => x.id !== r.id);
        disegna();
      });
    });

    box.querySelector("#gs-sconto").addEventListener("change", async e => {
      const v = num(e.target.value);
      if (v === null || v < 0 || v >= 100) { e.target.value = fmt(sconto()); return; }
      await salvaConfig({ sconto_ricevimento: v });
      // ricalcolo solo le righe non corrette a mano
      const daAggiornare = righe.filter(r => !r.ricevimento_manuale);
      for (const r of daAggiornare) {
        const nuovo = calcolaRic(r.ristorante);
        if (nuovo !== Number(r.ricevimento)) await salvaRiga(r, { ricevimento: nuovo }, true);
      }
      toast("Ricevimento ricalcolato");
      disegna();
    });

    box.querySelectorAll('input[type=radio]').forEach(el =>
      el.addEventListener("change", () => salvaConfig({ [el.name]: el.value })));
    box.querySelector("#gs-note").addEventListener("change", e => salvaConfig({ note: e.target.value.trim() || null }));

    box.querySelector("#gs-add").addEventListener("click", async () => {
      const nome = prompt("Nome della riga (es. Fiorentina, Pizza)");
      if (!nome || !nome.trim()) return;
      const sez = prompt("Sezione: Primi, Secondi, Contorni, Antipasti, Dessert o Altro", "Altro") || "Altro";
      const sezione = SEZIONI.find(s => s.toLowerCase() === sez.trim().toLowerCase()) || sez.trim() || "Altro";
      const chiave = nome.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") + "_" + Date.now().toString(36);
      const ordine = (Math.max(0, ...righe.map(r => r.ordine || 0)) || 0) + 10;
      const { data, error } = await supabase.from("grammature_servizio")
        .insert({ azienda_id: azienda.id, chiave, sezione, nome: nome.trim(), ordine })
        .select("*").single();
      if (error) return toast("Non aggiunta: " + error.message, true);
      righe.push(data);
      disegna();
      container.querySelector(`.gs-card[data-id="${data.id}"] [data-f=trattoria]`)?.focus();
    });
  }

  async function salvaRiga(r, patch, silenzioso) {
    patch.aggiornato_il = new Date().toISOString();
    const { error } = await supabase.from("grammature_servizio").update(patch).eq("id", r.id).eq("azienda_id", azienda.id);
    if (error) { toast("Non salvato: " + error.message, true); return false; }
    Object.assign(r, patch);
    if (!silenzioso) toast("✓ Salvato");
    return true;
  }

  async function salvaConfig(patch) {
    Object.assign(config, patch);
    const { error } = await supabase.from("grammature_servizio_config")
      .upsert({ azienda_id: azienda.id, ...patch, aggiornato_il: new Date().toISOString() }, { onConflict: "azienda_id" });
    if (error) toast("Non salvato: " + error.message, true); else toast("✓ Salvato");
  }

  let toastTimer = null;
  function toast(msg, errore) {
    const t = container.querySelector("#gs-toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "gs-toast on" + (errore ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = "gs-toast"; }, errore ? 4000 : 1400);
  }
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stile() {
  return `<style>
    .gs{max-width:760px;margin:0 auto;padding:14px 12px 90px}
    .gs h1{font-size:22px;margin:4px 0}
    .gs h2{font-size:16px;margin:22px 0 8px;color:#0E5A7A}
    .gs-sub{color:#64748b;font-size:13.5px;margin:4px 0 12px;line-height:1.45}
    .gs-caric{padding:30px;text-align:center;color:#64748b}
    .gs-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:0 0 8px}
    .gs-nome{font-weight:600;display:flex;gap:8px;align-items:center;margin-bottom:8px}
    .gs-tit{font-weight:600;border-color:transparent!important;padding-left:2px!important;background:transparent!important}
    .gs-tit:focus{border-color:#cbd5e1!important;background:#fff!important}
    .gs-um{border:1px solid #e2e8f0;border-radius:8px;padding:6px;font-size:14px;background:#f8fafc}
    .gs-g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .gs-g label span{display:block;font-size:12px;color:#64748b;margin-bottom:3px;white-space:nowrap}
    .gs-in{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:9px 10px;border:1px solid #d1d5db;border-radius:9px;background:#fff}
    .gs-in-calc{background:#eef6f9;border-color:#cfe3ea}
    .gs-in-man{background:#fff7ed;border-color:#fdba74}
    .gs-calc{font-style:normal;color:#0E5A7A}
    .gs-man{color:#c2410c;font-weight:600}
    .gs-reset{border:0;background:none;color:#0E5A7A;font-size:15px;padding:0 2px;cursor:pointer}
    .gs-chk{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:13px;color:#64748b}
    .gs-chk input{width:18px;height:18px}
    .gs-riga2{display:flex;gap:8px;margin-top:8px}
    .gs-nota{font-size:14px}
    .gs-del{border:0;background:#fee2e2;border-radius:9px;padding:0 12px;cursor:pointer}
    .gs-pct{display:flex;gap:8px;align-items:center}.gs-pct input{width:90px;font-size:16px;padding:8px;border:1px solid #d1d5db;border-radius:9px}
    .gs-opt{display:flex;flex-wrap:wrap;gap:8px}
    .gs-opt label{border:1px solid #e2e8f0;border-radius:20px;padding:7px 12px;font-size:14px;display:flex;gap:6px;align-items:center}
    .gs textarea{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:9px;border:1px solid #d1d5db;border-radius:9px}
    .gs-add{width:100%;border:1px dashed #94a3b8;background:transparent;color:#0E5A7A;font-weight:600;border-radius:10px;padding:11px;margin-top:6px;cursor:pointer;font-size:15px}
    .gs-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#0E5A7A;color:#fff;padding:9px 16px;border-radius:20px;font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:50}
    .gs-toast.on{opacity:1}.gs-toast.err{background:#b42318}
    @media (max-width:420px){.gs-g label span{font-size:11px}}
  </style>`;
}
