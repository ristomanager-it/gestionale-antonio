// js/views/spesa-banchetti.js
// 🛒 Spesa banchetti: quello che serve per gli eventi confermati delle prossime settimane (dalle ricette,
// porzioni e formati delle portate), diviso per fornitore, con il giorno entro cui serve. Il magazzino
// e' mostrato solo come riferimento: le quantita' da ordinare le decidi tu. Ogni fornitore ha il suo
// ordine: email (come in Acquisti › Ordini), WhatsApp o testo da copiare.

const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fd = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }) : "—");
const num = (n) => Number(n || 0).toLocaleString("it-IT", { maximumFractionDigits: 2 });

export async function render(app) {
  const az = window.state?.azienda;
  if (!az?.id) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  let giorni = 14, righe = [], scelte = {};
  app.innerHTML = stile() + `<div class="sp"><div class="sp-vuoto">Un attimo…</div></div>`;
  const box = app.querySelector(".sp");

  async function carica() {
    const { data, error } = await sb().rpc("spesa_banchetti", { p_azienda: az.id, p_giorni: giorni });
    if (error) { box.innerHTML = `<div class="sp-err">Errore: ${esc(error.message)}</div>`; return; }
    righe = (data || []).map((r, i) => ({ ...r, k: i }));
    scelte = Object.fromEntries(righe.map((r) => [r.k, { ok: true, q: r.quantita }]));
    disegna();
  }

  function gruppi() {
    const g = {};
    righe.forEach((r) => { const k = r.fornitore_id ? String(r.fornitore_id) : "_"; (g[k] ||= { nome: r.fornitore || "Senza fornitore", email: r.email, tel: r.telefono, righe: [] }).righe.push(r); });
    return Object.entries(g).sort((a, b) => (a[0] === "_") - (b[0] === "_") || a[1].nome.localeCompare(b[1].nome));
  }

  function disegna() {
    const G = gruppi();
    box.innerHTML = `
      <h2 class="sp-tit">🛒 Spesa banchetti</h2>
      <div class="sp-sub">Quello che serve per gli eventi confermati, calcolato dalle ricette. Il magazzino è solo un riferimento: scegli tu cosa e quanto ordinare.</div>
      <div class="sp-tabs">${[7, 14, 21].map((g) => `<button data-g="${g}" class="${g === giorni ? "on" : ""}">${g === 7 ? "1 settimana" : g / 7 + " settimane"}</button>`).join("")}</div>
      ${!righe.length ? `<div class="sp-vuoto">Nessun evento confermato con ricette nei prossimi ${giorni} giorni.</div>` : G.map(([fid, f]) => `
        <div class="sp-f">
          <div class="sp-fh"><b>${esc(f.nome)}</b><span>${f.righe.length} prodotti${f.email ? " · " + esc(f.email) : ""}</span></div>
          ${f.righe.map((r) => `<div class="sp-r ${scelte[r.k].ok ? "" : "off"}" data-k="${r.k}">
            <input type="checkbox" ${scelte[r.k].ok ? "checked" : ""} data-ok>
            <div class="sp-n"><b>${esc(r.nome)}</b>
              <span>serve entro <b>${fd(r.serve_il)}</b>${r.in_magazzino != null ? " · in magazzino " + num(r.in_magazzino) + " " + esc(r.unita_magazzino || "") : ""}</span>
              <span class="sp-ev">${esc(r.eventi || "")}</span></div>
            <input class="sp-q" type="number" step="0.1" min="0" value="${scelte[r.k].q}" data-q><span class="sp-u">${esc(r.unita || "")}</span>
          </div>`).join("")}
          ${fid === "_" ? `<div class="sp-nota">Questi prodotti non hanno un fornitore preferito in anagrafica (o non sono collegati a un prodotto): impostalo e compariranno nel suo ordine.</div>`
            : `<div class="sp-az">
              <button data-invia="${fid}" ${f.email ? "" : "disabled"}>✉️ Invia ordine</button>
              <button data-wa="${fid}">WhatsApp</button>
              <button data-copia="${fid}">Copia testo</button></div>`}
        </div>`).join("")}`;
    collega();
  }

  function testoOrdine(f) {
    const r = f.righe.filter((x) => scelte[x.k].ok && Number(scelte[x.k].q) > 0);
    return { righe: r, testo: `Ordine ${az.nome || ""}\n` + r.map((x) => `- ${x.nome}: ${num(scelte[x.k].q)} ${x.unita || ""} (entro ${fd(x.serve_il)})`).join("\n") };
  }

  // l'ordine mandato resta nello storico (Acquisti › Ordini inviati)
  async function registra(fid, r, canale) {
    if (!fid || fid === "_" || !r?.length) return;
    const { error } = await sb().rpc("registra_ordine_inviato", {
      p_azienda: az.id, p_sede: window.state?.sedeAttiva?.id || null, p_fornitore: Number(fid),
      p_righe: r.map((x) => ({ prodotto_id: x.prodotto_id, quantita: scelte[x.k].q, um: x.unita || "", note: x.serve_il ? "serve entro " + fd(x.serve_il) : "" })),
      p_origine: "spesa banchetti", p_canale: canale });
    if (error) console.warn("registra ordine:", error);
  }

  function collega() {
    box.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => { giorni = Number(b.dataset.g); carica(); }));
    box.querySelectorAll(".sp-r").forEach((el) => {
      const k = Number(el.dataset.k);
      el.querySelector("[data-ok]").addEventListener("change", (e) => { scelte[k].ok = e.target.checked; el.classList.toggle("off", !e.target.checked); });
      el.querySelector("[data-q]").addEventListener("input", (e) => { scelte[k].q = Number(e.target.value) || 0; });
    });
    const G = Object.fromEntries(gruppi());
    box.querySelectorAll("[data-invia]").forEach((b) => b.addEventListener("click", async () => {
      const f = G[b.dataset.invia]; const { righe: r } = testoOrdine(f);
      if (!r.length) { alert("Nessun prodotto selezionato."); return; }
      if (!confirm("Invio l'ordine a " + f.nome + " (" + f.email + ") con " + r.length + " prodotti?")) return;
      b.disabled = true;
      const res = await sb().functions.invoke("send-order-email", { body: { email: f.email, fornitore_nome: f.nome, azienda_nome: az.nome,
        prodotti: r.map((x) => ({ nome: x.nome, quantita: scelte[x.k].q, um: x.unita || "" })) } });
      b.disabled = false;
      alert(res.error ? "Errore invio ordine" : "✓ Ordine inviato a " + f.nome);
    }));
    box.querySelectorAll("[data-wa]").forEach((b) => b.addEventListener("click", () => {
      const f = G[b.dataset.wa]; const { testo } = testoOrdine(f);
      const tel = String(f.tel || "").replace(/\D/g, "");
      window.open("https://wa.me/" + (tel ? (tel.startsWith("39") ? tel : "39" + tel) : "") + "?text=" + encodeURIComponent(testo), "_blank");
    }));
    box.querySelectorAll("[data-copia]").forEach((b) => b.addEventListener("click", async () => {
      const { testo } = testoOrdine(G[b.dataset.copia]);
      try { await navigator.clipboard.writeText(testo); b.textContent = "✓ Copiato"; } catch (_) { prompt("Copia il testo:", testo); }
    }));
  }

  await carica();
}

function stile() {
  return `<style>
  .sp{max-width:760px;margin:0 auto;padding:16px 14px 60px;}
  .sp-tit{margin:0;font-size:22px;font-weight:800;}
  .sp-sub{font-size:13.5px;color:#64748b;margin:3px 0 12px;}
  .sp-tabs{display:flex;gap:6px;margin-bottom:12px;}
  .sp-tabs button{flex:1;border:1.5px solid #e2e8f0;background:#fff;border-radius:10px;padding:9px 4px;font-weight:700;cursor:pointer;font-size:13px;}
  .sp-tabs button.on{background:#0E5A7A;color:#fff;border-color:#0E5A7A;}
  .sp-f{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;margin-bottom:12px;}
  .sp-fh{display:flex;justify-content:space-between;gap:8px;align-items:baseline;border-bottom:1px solid #f1f5f9;padding-bottom:6px;}
  .sp-fh b{font-size:16px;} .sp-fh span{font-size:12px;color:#64748b;text-align:right;}
  .sp-r{display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #f8fafc;}
  .sp-r.off{opacity:.45;}
  .sp-r input[type=checkbox]{width:20px;height:20px;flex:none;}
  .sp-n{flex:1;min-width:0;display:grid;gap:1px;} .sp-n b{font-size:14px;} .sp-n span{font-size:12px;color:#64748b;}
  .sp-ev{color:#0E5A7A!important;}
  .sp-q{width:76px;flex:none;border:1.5px solid #e2e8f0;border-radius:9px;padding:7px;font-size:15px;text-align:right;}
  .sp-u{width:26px;flex:none;font-size:12.5px;color:#475569;}
  .sp-az{display:flex;gap:6px;margin-top:10px;}
  .sp-az button{flex:1;border:0;border-radius:10px;padding:10px 4px;font-weight:700;cursor:pointer;background:#f1f5f9;font-size:13px;}
  .sp-az button:first-child{background:#0E5A7A;color:#fff;} .sp-az button:disabled{opacity:.4;}
  .sp-nota{font-size:12.5px;color:#92400e;background:#fffbeb;border-radius:8px;padding:8px;margin-top:8px;}
  .sp-vuoto{color:#64748b;text-align:center;padding:24px;} .sp-err{color:#b91c1c;}
  </style>`;
}
