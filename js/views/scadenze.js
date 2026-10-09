// js/views/scadenze.js
// ⏰ Scadenze: cosa scade (lotti di produzione e lotti dei fornitori) e cosa ne facciamo.
// Usato, buttato (finisce negli sprechi con il costo) o congelato (nuova scadenza).
// In alto: quanto abbiamo buttato questo mese, il numero che oggi nessuno misura.

const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const euro = (n) => Number(n || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const fd = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" }) : "—");

export async function render(app) {
  const az = window.state?.azienda?.id;
  if (!az) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  let giorni = 3;

  app.innerHTML = `${stile()}<div class="sc">
    <h2 class="sc-tit">⏰ Scadenze</h2>
    <div class="sc-sub">Lotti di produzione e merce dei fornitori. Per ogni voce: usato, buttato o congelato.</div>
    <div id="sc-sprechi"></div>
    <div class="sc-tabs"><button data-g="1">Oggi e domani</button><button data-g="3" class="on">3 giorni</button><button data-g="7">Settimana</button></div>
    <div id="sc-lista"><div class="sc-vuoto">Un attimo…</div></div>
  </div>`;
  app.querySelectorAll(".sc-tabs button").forEach((b) => b.addEventListener("click", () => {
    giorni = Number(b.dataset.g);
    app.querySelectorAll(".sc-tabs button").forEach((x) => x.classList.toggle("on", x === b));
    carica();
  }));
  await Promise.all([carica(), caricaSprechi()]);

  async function carica() {
    const el = app.querySelector("#sc-lista");
    const { data, error } = await sb().rpc("scadenze_vicine", { p_azienda: az, p_sede: null, p_giorni: giorni });
    if (error) { el.innerHTML = `<div class="sc-err">Errore: ${esc(error.message)}</div>`; return; }
    const voci = data || [];
    if (!voci.length) { el.innerHTML = `<div class="sc-vuoto">✅ Niente in scadenza${giorni === 1 ? " oggi e domani" : " nei prossimi " + giorni + " giorni"}.</div>`; return; }
    const gruppi = [
      ["Scaduti", voci.filter((v) => v.giorni < 0), "#b91c1c"],
      ["Oggi", voci.filter((v) => v.giorni === 0), "#c2410c"],
      ["Domani", voci.filter((v) => v.giorni === 1), "#b45309"],
      ["Prossimi giorni", voci.filter((v) => v.giorni > 1), "#15803d"],
    ].filter((g) => g[1].length);
    el.innerHTML = gruppi.map(([tit, lista, col]) => `
      <div class="sc-gr" style="color:${col}">${tit} · ${lista.length}</div>
      ${lista.map((v) => `<div class="sc-card" style="border-left-color:${col}">
        <div class="sc-r1"><b>${esc(v.nome)}</b><span>${v.tipo === "fornitore" ? "fornitore" : v.tipo === "veloce" ? "🏷 al volo" : "produzione"}</span></div>
        <div class="sc-r2">Lotto ${esc(v.lotto || "—")} · scade ${fd(v.scadenza)}${v.quantita ? " · " + esc(String(v.quantita).replace(".", ",")) + " " + esc(v.unita || "") : ""}${v.luogo ? " · " + esc(v.luogo) : ""}${v.costo ? " · vale " + euro(v.costo) : ""}</div>
        <div class="sc-az">
          <button data-e="usato" data-t="${v.tipo}" data-id="${v.id}">✓ Usato</button>
          <button data-e="pasto" data-t="${v.tipo}" data-id="${v.id}">🍽 Pasto personale</button>
          <button data-e="congelato" data-t="${v.tipo}" data-id="${v.id}" data-nome="${esc(v.nome)}">❄️ Abbatti -18 °C</button>
          <button data-e="buttato" data-t="${v.tipo}" data-id="${v.id}" class="sc-but">🗑 Buttato</button>
        </div></div>`).join("")}`).join("");
    el.querySelectorAll(".sc-az button").forEach((b) => b.addEventListener("click", () => esito(b)));
  }

  async function esito(b) {
    if (b.dataset.e === "buttato" && !confirm("Lo segno come buttato? Finisce negli sprechi del mese con il suo costo.")) return;
    b.disabled = true;
    const { data, error } = await sb().rpc("scadenza_esito", { p_tipo: b.dataset.t, p_id: Number(b.dataset.id), p_esito: b.dataset.e });
    if (error || !data?.ok) { alert("Non salvato: " + (error?.message || data?.messaggio)); b.disabled = false; return; }
    const card = b.closest(".sc-card");
    card.innerHTML = `<div class="sc-fatto">${esc(data.messaggio)}</div>`;
    // abbattuto in negativo: serve l'etichetta nuova con la scadenza nuova
    if (b.dataset.e === "congelato") {
      if (b.dataset.t === "veloce") {
        import("../components/etichetta-veloce.js?v=" + (window.APP_V || 1)).then((m) => m.apriEtichettaVeloce({ cosa: b.dataset.nome, cons: 2 }));
      } else {
        alert("Abbattuto in negativo: ristampa l'etichetta del lotto con la nuova scadenza (dalla lavorazione o dal Registro lotti).");
      }
    }
    setTimeout(() => { carica(); caricaSprechi(); }, 1200);
  }

  async function caricaSprechi() {
    const inizio = new Date(); inizio.setDate(1); inizio.setHours(0, 0, 0, 0);
    const { data } = await sb().from("sprechi").select("nome, costo, quantita, unita").eq("azienda_id", az).gte("created_at", inizio.toISOString()).limit(1000);
    const el = app.querySelector("#sc-sprechi");
    const righe = data || [];
    const tot = righe.reduce((s, r) => s + Number(r.costo || 0), 0);
    const perNome = {};
    righe.forEach((r) => { perNome[r.nome] = (perNome[r.nome] || 0) + Number(r.costo || 0); });
    const top = Object.entries(perNome).sort((a, b) => b[1] - a[1]).slice(0, 3);
    el.innerHTML = `<div class="sc-spr">
      <div><div class="sc-spr-l">Buttato questo mese</div><div class="sc-spr-n">${euro(tot)}</div></div>
      <div class="sc-spr-d">${righe.length ? righe.length + (righe.length === 1 ? " voce" : " voci") + (top.length ? "<br>" + top.map(([n, c]) => esc(n) + " " + euro(c)).join("<br>") : "") : "Ancora niente: bene così"}</div>
    </div>`;
  }
}

function stile() {
  return `<style>
  .sc{max-width:720px;margin:0 auto;padding:16px;}
  .sc-tit{margin:0;font-size:22px;font-weight:800;}
  .sc-sub{font-size:13.5px;color:#64748b;margin:4px 0 12px;}
  .sc-spr{display:flex;justify-content:space-between;gap:12px;background:#0f172a;color:#fff;border-radius:14px;padding:14px 16px;}
  .sc-spr-l{font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
  .sc-spr-n{font-size:26px;font-weight:800;margin-top:2px;}
  .sc-spr-d{font-size:12.5px;color:#cbd5e1;text-align:right;}
  .sc-tabs{display:flex;gap:6px;margin:14px 0 6px;}
  .sc-tabs button{flex:1;border:1.5px solid #e2e8f0;background:#fff;border-radius:10px;padding:9px 4px;font-weight:700;cursor:pointer;font-size:13px;}
  .sc-tabs button.on{background:#0E5A7A;color:#fff;border-color:#0E5A7A;}
  .sc-gr{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin:16px 0 4px;}
  .sc-card{background:#fff;border:1px solid #e2e8f0;border-left:4px solid;border-radius:12px;padding:11px 12px;margin-top:8px;}
  .sc-r1{display:flex;justify-content:space-between;gap:8px;font-size:15px;}
  .sc-r1 span{font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;}
  .sc-r2{font-size:12.5px;color:#475569;margin-top:3px;}
  .sc-az{display:flex;gap:6px;margin-top:9px;}
  .sc-az button{flex:1;border:0;background:#f1f5f9;border-radius:9px;padding:9px 4px;font-weight:700;cursor:pointer;font-size:13px;}
  .sc-az .sc-but{background:#fef2f2;color:#b91c1c;}
  .sc-fatto{font-weight:700;color:#15803d;font-size:14px;}
  .sc-vuoto{color:#64748b;text-align:center;padding:24px;}
  .sc-err{color:#b91c1c;}
  </style>`;
}
