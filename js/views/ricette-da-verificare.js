// js/views/ricette-da-verificare.js
// Le ricette nate da una stima di Tony non sono ancora buone: hanno ingredienti
// ipotizzati e quantità da confermare. Qui si controllano e si approvano.
// Possono farlo admin e manager: è un controllo di cucina, non di amministrazione.

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  container.innerHTML = `<div class="rv"><div class="rv-caric">Un attimo…</div></div>${stile()}`;
  await disegna();

  async function disegna() {
    const { data } = await supabase
      .from("ricette")
      .select("id, nome, porzioni, costo_porzione, costo_materia_prima, origine_stima, created_at")
      .eq("azienda_id", azienda.id).eq("da_verificare", true)
      .order("created_at", { ascending: false }).limit(200);

    const lista = data || [];
    const ids = lista.map(r => r.id);
    let perRicetta = {};
    if (ids.length) {
      const { data: ing } = await supabase.from("ricetta_ingredienti")
        .select("ricetta_id, nome_prodotto, quantita, unita_misura, prodotto_id, note")
        .in("ricetta_id", ids).order("ordine");
      (ing || []).forEach(x => {
        (perRicetta[x.ricetta_id] = perRicetta[x.ricetta_id] || []).push(x);
      });
    }

    container.innerHTML = `
      <div class="rv">
        <h1>🤖 Ricette da controllare</h1>
        <p class="rv-sub">Le ha scritte Tony da una stima: gli ingredienti sono ipotesi e le quantità
          vanno confermate. Finché restano qui, il loro costo è indicativo.</p>

        ${!lista.length ? `<div class="rv-vuoto">Niente da controllare. Buon segno.</div>` : `
          <div class="rv-conta">${lista.length} ${lista.length === 1 ? "ricetta" : "ricette"} in attesa</div>
          ${lista.map(r => {
            const ing = perRicetta[r.id] || [];
            const ipotesi = ing.filter(x => (x.note || "").includes("ipotesi"));
            const senzaProdotto = ing.filter(x => !x.prodotto_id);
            return `
            <div class="rv-card">
              <div class="rv-top">
                <div class="t">
                  <b>${esc(r.nome)}</b>
                  <span>${ing.length} ingredienti · ${r.porzioni || 1} ${(r.porzioni || 1) === 1 ? "porzione" : "porzioni"}
                    ${r.costo_porzione ? " · " + euro(r.costo_porzione) + " a porzione" : ""}</span>
                </div>
                <div class="a">
                  <button class="rv-btn" data-ok="${r.id}">✅ Confermo</button>
                  <a class="rv-btn sec" href="#/crea-ricetta-avanzata?id=${r.id}">✏️ Apri</a>
                </div>
              </div>

              ${ipotesi.length || senzaProdotto.length ? `
                <div class="rv-avvisi">
                  ${ipotesi.length ? `<div>⚠️ ${ipotesi.length} ${ipotesi.length === 1 ? "ingrediente è un'ipotesi" : "ingredienti sono ipotesi"}: ${ipotesi.slice(0,3).map(x => esc(x.nome_prodotto)).join(", ")}</div>` : ""}
                  ${senzaProdotto.length ? `<div>⚠️ ${senzaProdotto.length} senza prodotto collegato: non entrano nel costo</div>` : ""}
                </div>` : ""}

              <div class="rv-ing">
                ${ing.map(x => `
                  <div class="i ${x.prodotto_id ? "" : "ko"}">
                    <span>${esc(x.nome_prodotto || "—")}</span>
                    <span>${Number(x.quantita) || 0} ${esc(x.unita_misura || "")}</span>
                  </div>`).join("")}
              </div>
            </div>`;
          }).join("")}
        `}
        <div id="rv-esito" class="rv-esito"></div>
      </div>
      ${stile()}`;

    container.querySelectorAll("[data-ok]").forEach(b => {
      b.addEventListener("click", async () => {
        b.disabled = true; b.textContent = "…";
        const { data: res } = await supabase.rpc("ricetta_verifica", { p_ricetta: Number(b.dataset.ok), p_ok: true });
        const e = container.querySelector("#rv-esito");
        if (res?.ok) { await disegna(); }
        else if (e) { e.textContent = res?.errore || "Non è andata."; e.className = "rv-esito ko"; b.disabled = false; }
      });
    });
  }
}

function euro(n) { return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stile() {
  return `<style>
  .rv{--navy:#023C59;--arancio:#E66101;--verde:#348127;--rosso:#B91C1C;--riga:#E2E6EA;--muto:#6B7A83;
      max-width:760px;margin:0 auto;padding:16px 14px 70px;color:#12232E;}
  .rv-caric{padding:40px;text-align:center;color:#94a3b8;}
  .rv h1{font-size:22px;margin:0 0 4px;}
  .rv-sub{font-size:13.5px;color:var(--muto);line-height:1.55;margin-bottom:16px;}
  .rv-conta{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muto);margin-bottom:10px;}
  .rv-vuoto{background:#F6FBF3;border:1px solid #CFE4C2;border-radius:14px;padding:20px;color:var(--verde);font-size:15px;}
  .rv-card{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:14px 16px;margin-bottom:11px;}
  .rv-top{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;}
  .rv-top .t{flex:1;min-width:180px;}
  .rv-top .t b{font-size:16px;}
  .rv-top .t span{display:block;font-size:12.5px;color:var(--muto);margin-top:2px;}
  .rv-top .a{display:flex;gap:7px;}
  .rv-btn{background:var(--verde);color:#fff;border:none;border-radius:10px;padding:9px 14px;font-size:13.5px;
    font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block;}
  .rv-btn.sec{background:#fff;border:1.5px solid var(--riga);color:var(--navy);}
  .rv-avvisi{background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:9px 11px;margin-top:10px;
    font-size:12.5px;color:#7C2D12;line-height:1.6;}
  .rv-ing{margin-top:10px;font-size:13px;}
  .rv-ing .i{display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #F1F4F6;}
  .rv-ing .i:first-child{border-top:none;}
  .rv-ing .i.ko span:first-child{color:var(--rosso);}
  .rv-ing .i span:last-child{color:var(--muto);}
  .rv-esito{margin-top:10px;font-size:14px;}
  .rv-esito.ko{color:var(--rosso);}
  </style>`;
}
