// js/views/cc-sedi.js
// 🏭 Centro cottura per le sedi:
//  1) prodotti che, appena arrivano (foto in "Lotti in arrivo"), vanno lavorati al Centro cottura:
//     la lavorazione entra subito nel planning e la cucina riceve l'avviso (trigger trg_arrivo_da_lavorare)
//  2) produzioni ricorrenti per la Trattoria (ragu', sughi, dolci...): ogni domenica sera entrano nel
//     planning della settimana dopo; il giorno, se non indicato, lo decide la regola dei giorni di lavorazione.

const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const GG = ["", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

export async function render(app) {
  const az = window.state?.azienda?.id;
  if (!az) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  app.innerHTML = stile() + `<div class="cc"><div class="cc-vuoto">Un attimo…</div></div>`;
  const box = app.querySelector(".cc");
  const [{ data: sedi }, { data: dip }] = await Promise.all([
    sb().from("sedi").select("id, nome").eq("azienda_id", az).order("nome"),
    sb().from("dipendenti").select("mansione, attivo").eq("azienda_id", az),
  ]);
  const titoli = [...new Set((dip || []).filter((d) => d.attivo !== false).map((d) => (d.mansione || "").trim()).filter(Boolean))].sort();
  const cc = (sedi || []).find((s) => /centro cottura/i.test(s.nome || ""));
  const tratt = (sedi || []).find((s) => /trattoria/i.test(s.nome || ""));
  let prodotti = [], ricorrenti = [];

  async function carica() {
    const [{ data: p }, { data: r }] = await Promise.all([
      sb().from("prodotti").select("id, nome, lavora_cc_cosa, lavora_cc_titolo, lavora_cc_entro_ore").eq("azienda_id", az).eq("lavora_cc", true).order("nome"),
      sb().from("produzioni_ricorrenti").select("id, prodotto, ricetta_id, quantita, unita, giorno_settimana, sede_destinazione, attiva, note").eq("azienda_id", az).order("id"),
    ]);
    prodotti = p || []; ricorrenti = r || [];
  }

  function disegna() {
    box.innerHTML = `
      <h2 class="cc-tit">🏭 Centro cottura per le sedi</h2>
      <div class="cc-sub">Cosa il Centro cottura prepara per la Trattoria e le altre sedi. Si salva da solo.</div>

      <h3 class="cc-h">📦 Si lavorano al Centro cottura appena arrivano</h3>
      <div class="cc-sub">Quando fotografi l'etichetta in «Lotti in arrivo», la lavorazione entra subito nel planning del Centro cottura e la cucina riceve l'avviso.</div>
      ${prodotti.map((p, i) => `<div class="cc-c" data-p="${i}">
        <div class="cc-r"><b class="cc-nome">${esc(p.nome)}</b><button class="cc-x" data-togli-p="${i}">✕</button></div>
        <input class="cc-in" data-k="lavora_cc_cosa" value="${esc(p.lavora_cc_cosa || "")}" placeholder="Cosa si fa (es. sfilettatura e porzionatura)">
        <div class="cc-r"><span class="cc-l">entro</span><input class="cc-in cc-n" type="number" min="0" data-k="lavora_cc_entro_ore" value="${esc(p.lavora_cc_entro_ore ?? "")}"><span class="cc-l">ore</span>
          <select class="cc-in" data-k="lavora_cc_titolo"><option value="">Titolo</option>${titoli.map((t) => `<option ${t === p.lavora_cc_titolo ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
      </div>`).join("") || `<div class="cc-vuoto">Nessun prodotto: aggiungi il primo (es. salmone).</div>`}
      <div class="cc-add" id="cc-add-p"><input class="cc-in" placeholder="＋ Aggiungi un prodotto: cerca in anagrafica"><div class="cc-ris"></div></div>

      <h3 class="cc-h">🔁 Produzioni ricorrenti</h3>
      <div class="cc-sub">Ogni domenica sera entrano nel planning della settimana dopo. Se non scegli il giorno, lo decide la regola dei giorni di lavorazione.</div>
      ${ricorrenti.map((r, i) => `<div class="cc-c ${r.attiva ? "" : "off"}" data-r="${i}">
        <div class="cc-r"><input class="cc-in cc-nome" data-k="prodotto" value="${esc(r.prodotto)}" placeholder="Cosa (es. ragù bolognese)"><button class="cc-x" data-togli-r="${i}">✕</button></div>
        <div class="cc-r"><input class="cc-in cc-n" type="number" min="0" step="0.1" data-k="quantita" value="${esc(r.quantita ?? "")}" placeholder="q.tà">
          <input class="cc-in cc-n" data-k="unita" value="${esc(r.unita || "")}" placeholder="kg">
          <select class="cc-in" data-k="giorno_settimana"><option value="">Giorno: da regola</option>${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option value="${n}" ${r.giorno_settimana === n ? "selected" : ""}>${GG[n]}</option>`).join("")}</select></div>
        <div class="cc-r"><span class="cc-l">per</span><select class="cc-in" data-k="sede_destinazione">${(sedi || []).filter((s) => !cc || s.id !== cc.id).map((s) => `<option value="${s.id}" ${s.id === r.sede_destinazione ? "selected" : ""}>${esc(s.nome)}</option>`).join("")}</select>
          <label class="cc-on"><input type="checkbox" data-k="attiva" ${r.attiva ? "checked" : ""}> attiva</label></div>
      </div>`).join("") || `<div class="cc-vuoto">Nessuna produzione ricorrente.</div>`}
      <button class="cc-btn" id="cc-add-r">＋ Aggiungi produzione ricorrente</button>
      <button class="cc-btn cc-sec" id="cc-gen">Metti nel planning di questa settimana</button>
      <div class="cc-stato">Tutto salvato</div>`;
    collega();
  }

  const timers = {};
  function stato(t) { const s = box.querySelector(".cc-stato"); if (s) s.textContent = t; }
  function salva(tab, id, campi) {
    const k = tab + id; clearTimeout(timers[k]); stato("Salvo…");
    timers[k] = setTimeout(async () => {
      const { error } = await sb().from(tab).update(campi).eq("id", id);
      stato(error ? "Non salvato: " + error.message : "✓ Salvato");
    }, 500);
  }

  function collega() {
    box.querySelectorAll("[data-p]").forEach((el) => {
      const p = prodotti[Number(el.dataset.p)];
      el.querySelectorAll("[data-k]").forEach((c) => c.addEventListener(c.tagName === "SELECT" ? "change" : "input", () => {
        const k = c.dataset.k; const v = k === "lavora_cc_entro_ore" ? (c.value === "" ? null : Number(c.value)) : (c.value.trim() || null);
        p[k] = v; salva("prodotti", p.id, { [k]: v });
      }));
    });
    box.querySelectorAll("[data-togli-p]").forEach((b) => b.addEventListener("click", async () => {
      const p = prodotti[Number(b.dataset.togliP)];
      if (!confirm("«" + p.nome + "» non si lavora più al Centro cottura all'arrivo?")) return;
      await sb().from("prodotti").update({ lavora_cc: false }).eq("id", p.id);
      await carica(); disegna(); stato("✓ Salvato");
    }));
    const addP = box.querySelector("#cc-add-p"), inP = addP.querySelector("input"), risP = addP.querySelector(".cc-ris"); let t;
    inP.addEventListener("input", () => {
      clearTimeout(t); const q = inP.value.trim();
      if (q.length < 2) { risP.innerHTML = ""; return; }
      t = setTimeout(async () => {
        const { data } = await sb().from("prodotti").select("id, nome").eq("azienda_id", az).eq("attivo", true).ilike("nome", "%" + q + "%").order("nome").limit(12);
        risP.innerHTML = (data || []).map((x) => `<button data-id="${x.id}">${esc(x.nome)}</button>`).join("") || `<div class="cc-vuoto">Nessun prodotto trovato.</div>`;
        risP.querySelectorAll("button").forEach((b) => b.addEventListener("click", async () => {
          await sb().from("prodotti").update({ lavora_cc: true, lavora_cc_entro_ore: 24 }).eq("id", Number(b.dataset.id));
          await carica(); disegna(); stato("✓ Salvato");
          box.querySelector('[data-p] [data-k="lavora_cc_cosa"]')?.focus();
        }));
      }, 250);
    });

    box.querySelectorAll("[data-r]").forEach((el) => {
      const r = ricorrenti[Number(el.dataset.r)];
      el.querySelectorAll("[data-k]").forEach((c) => c.addEventListener(c.tagName === "SELECT" || c.type === "checkbox" ? "change" : "input", () => {
        const k = c.dataset.k; let v;
        if (k === "attiva") { v = c.checked; el.classList.toggle("off", !v); }
        else if (k === "quantita" || k === "giorno_settimana") v = c.value === "" ? null : Number(c.value);
        else v = c.value.trim() || null;
        if (k === "prodotto" && !v) return;
        r[k] = v; salva("produzioni_ricorrenti", r.id, { [k]: v });
      }));
    });
    box.querySelectorAll("[data-togli-r]").forEach((b) => b.addEventListener("click", async () => {
      const r = ricorrenti[Number(b.dataset.togliR)];
      if (!confirm("Elimino la produzione ricorrente «" + r.prodotto + "»?")) return;
      await sb().from("produzioni_ricorrenti").delete().eq("id", r.id);
      await carica(); disegna(); stato("✓ Salvato");
    }));
    box.querySelector("#cc-add-r").addEventListener("click", async () => {
      if (!cc) { alert("Non trovo la sede Centro cottura."); return; }
      const { error } = await sb().from("produzioni_ricorrenti").insert({ azienda_id: az, sede_produzione: cc.id, sede_destinazione: tratt?.id || null, prodotto: "Nuova produzione" });
      if (error) { alert(error.message); return; }
      await carica(); disegna();
      const ult = box.querySelectorAll('[data-r] [data-k="prodotto"]'); ult[ult.length - 1]?.select();
    });
    box.querySelector("#cc-gen").addEventListener("click", async () => {
      const d = new Date(); const g = (d.getDay() + 6) % 7; d.setDate(d.getDate() - g);
      const lun = d.toISOString().slice(0, 10);
      const { data, error } = await sb().rpc("genera_produzioni_ricorrenti", { p_azienda: az, p_lunedi: lun });
      alert(error ? "Errore: " + error.message : data ? data + " produzioni messe nel planning di questa settimana." : "Erano già tutte nel planning di questa settimana.");
    });
  }

  await carica(); disegna();
}

function stile() {
  return `<style>
  .cc{max-width:760px;margin:0 auto;padding:16px 14px 60px;}
  .cc-tit{margin:0;font-size:22px;font-weight:800;}
  .cc-h{margin:20px 0 2px;font-size:16px;font-weight:800;}
  .cc-sub{font-size:13px;color:#64748b;margin:2px 0 10px;}
  .cc-c{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px;margin-bottom:8px;display:grid;gap:6px;}
  .cc-c.off{opacity:.5;}
  .cc-r{display:flex;gap:6px;align-items:center;}
  .cc-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:9px;padding:8px;font-size:14px;font-family:inherit;background:#fff;min-width:0;}
  .cc-nome{font-size:15px;font-weight:800;flex:1;}
  .cc-n{width:80px;flex:none;}
  .cc-l{font-size:12.5px;color:#64748b;white-space:nowrap;}
  .cc-on{font-size:12px;color:#64748b;white-space:nowrap;display:flex;gap:3px;align-items:center;}
  .cc-x{flex:none;border:0;background:#f1f5f9;border-radius:8px;width:34px;height:34px;cursor:pointer;color:#64748b;}
  .cc-ris button{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #f1f5f9;background:#fff;padding:9px;font-size:14px;cursor:pointer;}
  .cc-btn{width:100%;border:1.5px dashed #0E5A7A;background:#f0f9ff;color:#0E5A7A;border-radius:12px;padding:12px;font-weight:800;cursor:pointer;margin-top:6px;}
  .cc-sec{border-style:solid;background:#fff;}
  .cc-stato{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));background:#0f172a;color:#fff;border-radius:20px;padding:6px 12px;font-size:12px;opacity:.85;}
  .cc-vuoto{color:#64748b;text-align:center;padding:12px;font-size:13.5px;}
  </style>`;
}
