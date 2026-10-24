// js/views/isole-buffet.js
// 🍽 Isole del buffet (matrimoni): nome, descrizione per il cliente, minimo, tipo e piatti di ogni isola.
// Si salva da solo mentre scrivi. Il nome dell'isola e' anche il nome della sezione nel preventivo,
// quindi cambiandolo si aggiornano anche i modelli di menu (schema e pulsanti "si aggiungono spesso").
// I preventivi gia' fatti restano con il nome vecchio.

const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const MODI = { fissa: "Fissa: tutte le portate sono sempre dentro", scegli: "Con scelta: si scelgono le portate", opzionale: "Opzionale: si aggiunge a richiesta" };

export async function render(app) {
  const az = window.state?.azienda?.id;
  if (!az) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  app.innerHTML = stile() + `<div class="ib"><div class="ib-v">Un attimo…</div></div>`;
  const box = app.querySelector(".ib");
  let isole = [], piatti = [], modelli = [];

  async function carica() {
    const [a, b, c] = await Promise.all([
      sb().from("buffet_isole").select("*").eq("azienda_id", az).eq("tipo_evento", "Matrimonio").order("ordine").order("id"),
      sb().from("buffet_isole_piatti").select("*").eq("azienda_id", az).order("ordine").order("id"),
      sb().from("modelli_menu").select("id, formula, sezioni, sezioni_extra").eq("azienda_id", az).eq("tipo_evento", "Matrimonio"),
    ]);
    isole = a.data || []; piatti = b.data || []; modelli = c.data || [];
  }
  const chiave = (i) => i.gruppo || i.nome;
  const posizione = (i) => {
    const k = norm(chiave(i)), m = modelli[0];
    if (!m) return "nessuna";
    if ((m.sezioni || []).some((x) => norm(x.nome) === k)) return "schema";
    if ((m.sezioni_extra || []).some((x) => norm(x.nome) === k)) return "extra";
    return "nessuna";
  };
  // schema e pulsanti dei modelli da matrimonio (buffet e servito) seguono sempre le isole
  async function setPos(vecchia, nuova, ordine, pos) {
    for (const m of modelli) {
      const togli = (arr) => (arr || []).filter((x) => ![norm(vecchia), norm(nuova)].includes(norm(x.nome)));
      const sez = togli(m.sezioni), ext = togli(m.sezioni_extra);
      const voce = { nome: nuova, ordine: Number(ordine) || 0, quante: 1 };
      if (pos === "schema") sez.push(voce); else if (pos === "extra") ext.push(voce);
      const per = (a, b) => (Number(a.ordine) || 0) - (Number(b.ordine) || 0);
      sez.sort(per); ext.sort(per);
      const { error } = await sb().from("modelli_menu").update({ sezioni: sez, sezioni_extra: ext }).eq("id", m.id);
      if (error) throw error;
      m.sezioni = sez; m.sezioni_extra = ext;
    }
  }
  const stato = (t) => { const s = box.querySelector(".ib-stato"); if (s) { s.textContent = t; clearTimeout(stato.t); stato.t = setTimeout(() => { s.textContent = ""; }, 2500); } };
  async function upd(id, patch) {
    const { error } = await sb().from("buffet_isole").update(patch).eq("id", id);
    stato(error ? "Non salvato, riprova" : "Salvato ✓");
    return !error;
  }
  async function ridisegna() { const y = window.scrollY; await carica(); disegna(); window.scrollTo(0, y); }

  function disegna() {
    const primoDelGruppo = new Set();
    box.innerHTML = `
      <div class="ib-top"><div><h2>🍽 Isole del buffet</h2>
        <div class="ib-sub">Matrimoni. Nome, descrizione che vede il cliente, piatti da cui scegliere. Si salva da solo.</div></div>
        <span class="ib-stato"></span></div>
      <div class="ib-avviso">Se cambi il nome di un'isola, i preventivi già fatti restano con il nome vecchio.</div>
      ${isole.map((i, n) => {
        const mio = piatti.filter((p) => p.isola_id === i.id);
        const grp = i.gruppo ? ` · gruppo «${esc(i.gruppo)}»` : "";
        let pos = "";
        if (!i.gruppo) {
          const p = posizione(i);
          pos = `<label>Dove compare<select data-id="${i.id}" data-f="pos">
            <option value="schema" ${p === "schema" ? "selected" : ""}>Nello schema (si carica da solo)</option>
            <option value="extra" ${p === "extra" ? "selected" : ""}>Come pulsante «si aggiungono spesso»</option>
            <option value="nessuna" ${p === "nessuna" ? "selected" : ""}>Non compare</option></select></label>`;
        } else if (!primoDelGruppo.has(i.gruppo)) {
          primoDelGruppo.add(i.gruppo);
          pos = `<div class="ib-nota">Compare nel preventivo come una sola sezione: «${esc(i.gruppo)}».</div>`;
        }
        return `<div class="ib-c">
          <div class="ib-capo"><b>${esc(i.nome)}</b><span class="ib-mut">${mio.length} piatti${grp}</span>
            <span class="ib-fr"><button data-su="${i.id}" ${n === 0 ? "disabled" : ""} aria-label="Sposta su">▲</button><button data-giu="${i.id}" ${n === isole.length - 1 ? "disabled" : ""} aria-label="Sposta giù">▼</button></span></div>
          <label>Nome<input data-id="${i.id}" data-f="nome" value="${esc(i.nome)}"></label>
          <label>Descrizione per il cliente<textarea data-id="${i.id}" data-f="descrizione" rows="2">${esc(i.descrizione || "")}</textarea></label>
          <div class="ib-riga">
            <label>Tipo<select data-id="${i.id}" data-f="modo">${Object.entries(MODI).map(([k, v]) => `<option value="${k}" ${i.modo === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
            ${i.modo === "scegli" ? `<label class="ib-min">Minimo<input type="number" min="0" data-id="${i.id}" data-f="minimo" value="${i.minimo ?? ""}" placeholder="—"></label>` : ""}
          </div>
          ${pos}
          <div class="ib-piatti"><div class="ib-t">Piatti</div>
            ${mio.map((p) => `<div class="ib-p"><input data-p="${p.id}" value="${esc(p.nome)}"><button data-del-p="${p.id}" aria-label="Togli il piatto">✕</button></div>`).join("") || `<div class="ib-mut">Nessun piatto.</div>`}
            <div class="ib-p ib-nuovo"><input data-nuovo-p="${i.id}" placeholder="Aggiungi un piatto…"><button data-add-p="${i.id}">＋</button></div>
          </div>
          <div class="ib-del" data-del-isola="${i.id}">Elimina questa isola</div>
        </div>`;
      }).join("")}
      <button class="ib-nuova" id="ib-nuova">＋ Nuova isola</button>`;
  }

  box.addEventListener("change", async (e) => {
    const t = e.target;
    try {
      if (t.dataset.p) {
        const nome = t.value.trim();
        if (!nome) { await ridisegna(); return; }
        const { error } = await sb().from("buffet_isole_piatti").update({ nome }).eq("id", Number(t.dataset.p));
        stato(error ? "Non salvato, riprova" : "Salvato ✓");
        const p = piatti.find((x) => x.id === Number(t.dataset.p)); if (p) p.nome = nome;
        return;
      }
      const id = Number(t.dataset.id), i = isole.find((x) => x.id === id);
      if (!i) return;
      if (t.dataset.f === "nome") {
        const nuovo = t.value.trim();
        if (!nuovo) { t.value = i.nome; return; }
        const vecchio = i.nome, pos = posizione(i);
        if (await upd(id, { nome: nuovo })) { i.nome = nuovo; if (!i.gruppo) await setPos(vecchio, nuovo, i.ordine, pos); }
      } else if (t.dataset.f === "descrizione") {
        if (await upd(id, { descrizione: t.value.trim() || null })) i.descrizione = t.value.trim() || null;
      } else if (t.dataset.f === "minimo") {
        const v = t.value === "" ? null : Math.max(Number(t.value) || 0, 0);
        if (await upd(id, { minimo: v })) i.minimo = v;
      } else if (t.dataset.f === "modo") {
        if (await upd(id, { modo: t.value })) { i.modo = t.value; await ridisegna(); }
      } else if (t.dataset.f === "pos") {
        await setPos(chiave(i), chiave(i), i.ordine, t.value);
        stato("Salvato ✓");
      }
    } catch (err) { stato("Non salvato, riprova"); }
  });

  box.addEventListener("click", async (e) => {
    const b = e.target.closest("button, [data-del-isola]");
    if (!b) { return; }
    try {
      if (b.id === "ib-nuova") {
        const nome = (prompt("Come si chiama la nuova isola?") || "").trim();
        if (!nome) return;
        const ordine = (isole.reduce((m, x) => Math.max(m, x.ordine || 0), 0)) + 10;
        const chiaveNuova = nome.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40) + "_" + Date.now().toString(36);
        const { error } = await sb().from("buffet_isole").insert({ azienda_id: az, tipo_evento: "Matrimonio", chiave: chiaveNuova, nome, modo: "scegli", ordine });
        if (error) throw error;
        await setPos(nome, nome, ordine, "extra");
        await ridisegna();
      } else if (b.dataset.addP) {
        const inp = box.querySelector(`input[data-nuovo-p="${b.dataset.addP}"]`), nome = (inp?.value || "").trim();
        if (!nome) return;
        const isolaId = Number(b.dataset.addP);
        const ord = piatti.filter((p) => p.isola_id === isolaId).reduce((m, p) => Math.max(m, p.ordine || 0), 0) + 1;
        const { error } = await sb().from("buffet_isole_piatti").insert({ azienda_id: az, isola_id: isolaId, nome, ordine: ord });
        if (error) throw error;
        await ridisegna();
      } else if (b.dataset.delP) {
        await sb().from("buffet_isole_piatti").delete().eq("id", Number(b.dataset.delP));
        await ridisegna();
      } else if (b.dataset.su || b.dataset.giu) {
        const id = Number(b.dataset.su || b.dataset.giu), n = isole.findIndex((x) => x.id === id), altro = isole[b.dataset.su ? n - 1 : n + 1];
        if (!altro) return;
        const a = isole[n];
        await sb().from("buffet_isole").update({ ordine: altro.ordine }).eq("id", a.id);
        await sb().from("buffet_isole").update({ ordine: a.ordine }).eq("id", altro.id);
        if (!a.gruppo) await setPos(a.nome, a.nome, altro.ordine, posizione(a));
        if (!altro.gruppo) await setPos(altro.nome, altro.nome, a.ordine, posizione(altro));
        await ridisegna();
      } else if (b.dataset.delIsola) {
        const i = isole.find((x) => x.id === Number(b.dataset.delIsola));
        if (!i || !confirm(`Eliminare l'isola «${i.nome}» con i suoi piatti?`)) return;
        await sb().from("buffet_isole").delete().eq("id", i.id);
        const resta = isole.some((x) => x.id !== i.id && chiave(x) === chiave(i));
        if (!resta) await setPos(chiave(i), chiave(i), i.ordine, "nessuna");
        await ridisegna();
      }
    } catch (err) { stato("Non riuscito, riprova"); }
  });

  await carica();
  disegna();
}

function stile() {
  return `<style>
  .ib{max-width:760px;margin:0 auto;padding:16px 14px 90px;color:#12232E;font-family:inherit;}
  .ib h2{margin:0;font-size:22px;} .ib-sub{font-size:13px;color:#6B7A83;margin-top:3px;}
  .ib-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
  .ib-stato{font-size:13px;font-weight:700;color:#166534;white-space:nowrap;}
  .ib-avviso{background:#FFF7E6;border:1px solid #F1D9A0;color:#7A5200;border-radius:12px;padding:10px 12px;font-size:13px;margin:12px 0;}
  .ib-v{padding:40px;text-align:center;color:#94a3b8;}
  .ib-c{background:#fff;border:1px solid #E2E6EA;border-radius:16px;padding:14px 16px;margin-bottom:12px;}
  .ib-capo{display:flex;align-items:center;gap:10px;margin-bottom:6px;} .ib-capo b{font-size:16px;}
  .ib-mut{font-size:12.5px;color:#6B7A83;} .ib-fr{margin-left:auto;display:flex;gap:4px;}
  .ib-fr button{border:1px solid #E2E6EA;background:#fff;border-radius:8px;width:34px;height:30px;cursor:pointer;} .ib-fr button:disabled{opacity:.35;cursor:default;}
  .ib label{display:block;font-size:12px;font-weight:700;color:#6B7A83;margin-top:10px;}
  .ib input,.ib textarea,.ib select{display:block;width:100%;box-sizing:border-box;margin-top:4px;border:1px solid #D5DBE0;border-radius:10px;padding:9px 11px;font:inherit;font-size:15px;color:#12232E;background:#fff;}
  .ib-riga{display:flex;gap:10px;align-items:flex-end;} .ib-riga label{flex:1;} .ib-riga .ib-min{flex:0 0 110px;}
  .ib-nota{font-size:12.5px;color:#6B7A83;margin-top:10px;}
  .ib-t{font-size:12px;font-weight:700;color:#6B7A83;margin:14px 0 4px;}
  .ib-p{display:flex;gap:8px;align-items:center;margin-top:6px;} .ib-p input{margin-top:0;}
  .ib-p button{border:1px solid #E2E6EA;background:#fff;border-radius:10px;width:40px;height:40px;cursor:pointer;flex-shrink:0;font-size:16px;}
  .ib-nuovo button{background:#023C59;color:#fff;border-color:#023C59;}
  .ib-del{margin-top:14px;font-size:12px;color:#9CA3AF;text-decoration:underline;cursor:pointer;}
  .ib-nuova{width:100%;border:1.5px dashed #9FB4C0;background:#F8FBFD;border-radius:14px;padding:14px;font-size:15px;font-weight:700;color:#023C59;cursor:pointer;}
  </style>`;
}
