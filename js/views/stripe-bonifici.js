/* Bonifici Stripe: cosa c'e' dentro ogni versamento che Stripe manda in banca.
   Stripe raggruppa piu' pagamenti in un bonifico e trattiene le commissioni: qui per ogni
   bonifico si vedono i clienti (lordo, che va nei documenti fiscali), le commissioni (costo,
   fattura mensile di Stripe da integrare in Autofatture) e il netto da spuntare in banca.
   I dati li legge l'Edge Function stripe-bonifici e li salva in stripe_bonifici;
   la spunta passa dalla RPC stripe_bonifico_spunta. */

const sb = () => window.supabaseClient || window.supabase;
const euro = (n) => (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const gg = (d) => d ? new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }) : "";

let _stato = { saldo: null, msg: "" };

export async function render(container) {
  document.querySelector(".app-header")?.style.removeProperty("display");
  document.querySelector(".topbar-global")?.style.removeProperty("display");
  const az = window.state?.azienda;
  if (!az?.id) { container.innerHTML = guscio("<p>Nessuna azienda attiva.</p>"); return; }
  _stato = { saldo: null, msg: "Aggiorno da Stripe…" };
  await disegna(container, az);
  aggiorna(container, az);
}

async function aggiorna(container, az) {
  try {
    const { data } = await sb().functions.invoke("stripe-bonifici", { body: { azienda_id: az.id } });
    if (data && data.ok) _stato = { saldo: data, msg: "" };
    else _stato = { saldo: null, msg: (data && data.errore) || "Stripe non risponde: vedi i dati già salvati." };
  } catch (e) { _stato = { saldo: null, msg: "Stripe non risponde: vedi i dati già salvati." }; }
  await disegna(container, az);
}

async function disegna(container, az) {
  const { data: lista, error } = await sb().from("stripe_bonifici")
    .select("id, arrivo, stato, netto, lordo, commissioni, rimborsi, altro, n_pagamenti, righe, spuntato_il")
    .eq("azienda_id", az.id).order("arrivo", { ascending: false }).limit(200);
  if (error) { container.innerHTML = guscio('<div class="sb-box">' + esc(error.message) + "</div>"); return; }
  const bon = lista || [];

  // totali del mese corrente: lordo clienti, costi Stripe (commissioni + Radar), netto arrivato
  const mese = new Date().toISOString().slice(0, 7);
  const delMese = bon.filter((b) => String(b.arrivo).slice(0, 7) === mese);
  const costi = (b) => Math.round((Number(b.lordo) + Number(b.rimborsi) - Number(b.netto)) * 100) / 100;
  const tot = delMese.reduce((s, b) => ({ lordo: s.lordo + Number(b.lordo), costi: s.costi + costi(b), netto: s.netto + Number(b.netto) }), { lordo: 0, costi: 0, netto: 0 });
  const daSpuntare = bon.filter((b) => !b.spuntato_il && b.stato === "paid").length;

  let h = '<p class="sb-sotto">Stripe manda in banca un bonifico unico per più pagamenti, già senza le sue commissioni. Qui vedi cosa c\'è dentro ognuno.</p>';
  if (_stato.msg) h += '<div class="sb-box sb-info">' + esc(_stato.msg) + "</div>";
  if (_stato.saldo && Number(_stato.saldo.in_arrivo) > 0)
    h += '<div class="sb-box"><span>Ancora su Stripe, arriverà nei prossimi giorni</span><b>' + euro(_stato.saldo.in_arrivo) + "</b></div>";

  h += '<div class="sb-mese"><div class="t">' + new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" }) + "</div>"
    + '<div class="r"><span>Pagato dai clienti</span><b>' + euro(tot.lordo) + "</b></div>"
    + '<div class="r neg"><span>Commissioni Stripe</span><b>− ' + euro(tot.costi) + "</b></div>"
    + '<div class="r tot"><span>Arrivato in banca</span><b>' + euro(tot.netto) + "</b></div>"
    + (daSpuntare ? '<div class="nota">' + daSpuntare + (daSpuntare === 1 ? " bonifico da spuntare" : " bonifici da spuntare") + " in banca</div>" : '<div class="nota ok">✓ Tutti spuntati</div>')
    + "</div>";

  if (!bon.length) h += '<div class="sb-box">Ancora nessun bonifico letto da Stripe.</div>';
  bon.forEach((b) => {
    const righe = Array.isArray(b.righe) ? b.righe : [];
    const pag = righe.filter((r) => r.tipo === "Pagamento" || r.tipo === "Rimborso");
    h += '<div class="sb-bon' + (b.spuntato_il ? " fatto" : "") + '">'
      + '<div class="top"><div><div class="d">' + esc(gg(b.arrivo)) + (b.stato !== "paid" ? ' <i class="in">in viaggio</i>' : "") + "</div>"
      + '<div class="n">' + b.n_pagamenti + (b.n_pagamenti === 1 ? " pagamento" : " pagamenti") + "</div></div>"
      + '<div class="netto">' + euro(b.netto) + "<small>in banca</small></div></div>"
      + '<div class="conti"><span>Lordo clienti <b>' + euro(Number(b.lordo) + Number(b.rimborsi)) + "</b></span>"
      + '<span>Commissioni <b>− ' + euro(costi(b)) + "</b></span></div>"
      + '<details><summary>Chi c\'è dentro</summary><table>'
      + pag.map((r) => "<tr><td>" + esc(r.descrizione || "—") + (r.tipo === "Rimborso" ? " <i>(rimborso)</i>" : "")
        + "</td><td>" + euro(r.lordo) + '</td><td class="c">− ' + euro(r.commissione) + "</td></tr>").join("")
      + (Number(b.altro) ? '<tr><td>Costo antifrode Stripe (Radar)</td><td></td><td class="c">− ' + euro(Math.abs(Number(b.altro))) + "</td></tr>" : "")
      + "</table></details>"
      + (b.stato === "paid" ? '<button class="sb-spunta" data-id="' + b.id + '" data-ok="' + (b.spuntato_il ? "0" : "1") + '">'
        + (b.spuntato_il ? "✓ Spuntato in banca — annulla" : "Spunta: trovato in banca") + "</button>" : "")
      + "</div>";
  });

  h += '<p class="sb-sotto">Le commissioni sono un costo dell\'azienda: Stripe manda una fattura al mese, senza IVA perché è irlandese. Caricala in <a href="#/autofatture">Autofatture</a> per l\'integrazione.</p>';
  container.innerHTML = guscio(h);

  container.querySelectorAll(".sb-spunta").forEach((el) => el.addEventListener("click", async () => {
    el.disabled = true;
    const { error: e } = await sb().rpc("stripe_bonifico_spunta", { p_id: el.dataset.id, p_ok: el.dataset.ok === "1" });
    if (e) { el.disabled = false; alert("Non riesco a salvare: " + e.message); return; }
    disegna(container, az);
  }));
}

function guscio(corpo) {
  return '<div class="sb-pag"><h1>💳 Bonifici Stripe</h1>' + corpo + "</div>" + `<style>
  .sb-pag{max-width:680px;margin:0 auto;padding:16px 14px 90px;font-family:-apple-system,Segoe UI,system-ui,sans-serif;color:#132029}
  .sb-pag h1{font-size:22px;margin:4px 0 6px}
  .sb-sotto{color:#64748b;font-size:13.5px;line-height:1.5;margin:0 0 12px}
  .sb-sotto a{color:#0f5f86}
  .sb-box{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:11px 14px;margin-bottom:10px;font-size:14px}
  .sb-box span{color:#64748b}.sb-info{color:#92400e;background:#fffbeb;border-color:#fde68a}
  .sb-mese{background:#0f3b52;color:#fff;border-radius:16px;padding:14px 16px;margin-bottom:14px}
  .sb-mese .t{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.75;margin-bottom:6px}
  .sb-mese .r{display:flex;justify-content:space-between;padding:4px 0;font-size:15px}
  .sb-mese .r.neg b{color:#fecaca}.sb-mese .r.tot{border-top:1px solid rgba(255,255,255,.25);margin-top:4px;padding-top:8px;font-size:18px}
  .sb-mese .nota{font-size:12.5px;margin-top:6px;color:#fde68a}.sb-mese .nota.ok{color:#bbf7d0}
  .sb-bon{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;margin-bottom:10px}
  .sb-bon.fatto{border-color:#bbf7d0;background:#f7fdf9}
  .sb-bon .top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
  .sb-bon .d{font-weight:700;font-size:15px;text-transform:capitalize}.sb-bon .n{color:#64748b;font-size:12.5px}
  .sb-bon .in{font-style:normal;font-size:11px;background:#e0f2fe;color:#075985;border-radius:6px;padding:1px 6px;margin-left:4px}
  .sb-bon .netto{font-size:21px;font-weight:800;text-align:right}.sb-bon .netto small{display:block;font-size:11px;color:#64748b;font-weight:500}
  .sb-bon .conti{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:#64748b;margin:6px 0}.sb-bon .conti b{color:#132029}
  .sb-bon details summary{cursor:pointer;font-size:13px;color:#0f5f86;padding:4px 0}
  .sb-bon table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px}
  .sb-bon td{padding:5px 0;border-top:1px solid #f1f5f9}.sb-bon td+td{text-align:right;white-space:nowrap;padding-left:8px}
  .sb-bon td.c{color:#b91c1c}
  .sb-spunta{margin-top:8px;width:100%;border:0;border-radius:10px;padding:10px;font-weight:700;font-size:14px;background:#0f5f86;color:#fff}
  .sb-bon.fatto .sb-spunta{background:#e2e8f0;color:#334155;font-weight:600}
  </style>`;
}
