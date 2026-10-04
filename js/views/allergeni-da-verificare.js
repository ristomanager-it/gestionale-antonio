// js/views/allergeni-da-verificare.js
// Allergeni delle materie prime proposti da Tony (dedotti dal nome) e prodotti
// ancora senza allergeni. Da qui finiscono in comanda: un dato sbagliato qui
// è un avviso sbagliato in cucina, quindi si conferma prodotto per prodotto
// (o a blocchi, dopo averli guardati).

const ALLERGENI = [
  ["glutine", "Glutine"], ["crostacei", "Crostacei"], ["uova", "Uova"], ["pesce", "Pesce"],
  ["arachidi", "Arachidi"], ["soia", "Soia"], ["latte", "Latte"], ["frutta_a_guscio", "Frutta a guscio"],
  ["sedano", "Sedano"], ["senape", "Senape"], ["sesamo", "Sesamo"], ["solfiti", "Solfiti"],
  ["lupini", "Lupini"], ["molluschi", "Molluschi"],
];
const NOME_A = Object.fromEntries(ALLERGENI);

export async function render(container) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  let scheda = "tony";      // tony | vuoti
  let filtroA = "";         // allergene selezionato
  let cerca = "";
  let lista = [];
  const modifiche = {};     // id -> array allergeni in modifica

  container.innerHTML = `<div class="av"><div class="av-caric">Un attimo…</div></div>${stile()}`;
  await carica();

  async function carica() {
    lista = [];
    for (let da = 0; ; da += 1000) {
      let q = supabase.from("prodotti")
        .select("id, nome, allergeni, allergeni_origine, categoria_interna")
        .eq("azienda_id", azienda.id).eq("attivo", true)
        .order("nome").range(da, da + 999);
      q = scheda === "tony" ? q.eq("allergeni_da_verificare", true) : q.or("allergeni.is.null,allergeni.eq.{}");
      const { data, error } = await q;
      if (error) { console.error(error); break; }
      lista = lista.concat(data || []);
      if (!data || data.length < 1000) break;
    }
    disegna();
  }

  function visibili() {
    const parole = cerca.toLowerCase().split(/\s+/).filter(Boolean);
    return lista.filter(p => {
      const a = modifiche[p.id] || p.allergeni || [];
      if (filtroA && !a.includes(filtroA)) return false;
      const n = (p.nome || "").toLowerCase();
      return parole.every(w => n.includes(w));
    });
  }

  function disegna() {
    const vis = visibili();
    const conteggi = {};
    lista.forEach(p => (p.allergeni || []).forEach(a => conteggi[a] = (conteggi[a] || 0) + 1));

    container.innerHTML = `
      <div class="av">
        <h1>⚠️ Allergeni da controllare</h1>
        <p class="av-sub">Questi allergeni finiscono sulle comande di cucina quando un tavolo segnala un'allergia.
          Tocca un allergene per aggiungerlo o toglierlo, poi conferma.</p>

        <div class="av-tab">
          <button data-tab="tony" class="${scheda === "tony" ? "on" : ""}">🤖 Proposti da Tony</button>
          <button data-tab="vuoti" class="${scheda === "vuoti" ? "on" : ""}">Senza allergeni</button>
        </div>

        <input id="av-cerca" class="av-cerca" placeholder="Cerca prodotto…" value="${esc(cerca)}">

        ${scheda === "tony" ? `
        <div class="av-filtri">
          <button data-f="" class="${filtroA ? "" : "on"}">Tutti (${lista.length})</button>
          ${ALLERGENI.filter(([k]) => conteggi[k]).map(([k, n]) =>
            `<button data-f="${k}" class="${filtroA === k ? "on" : ""}">${n} (${conteggi[k]})</button>`).join("")}
        </div>` : `
        <p class="av-nota">Prodotti attivi senza nessun allergene segnato. Se un prodotto non ne contiene,
          lascialo così: qui servono solo quelli da completare.</p>`}

        ${!vis.length ? `<div class="av-vuoto">${lista.length ? "Nessun prodotto con questo filtro." : "Niente da controllare."}</div>` : `
          <div class="av-conta">
            <span>${vis.length} ${vis.length === 1 ? "prodotto" : "prodotti"}${vis.length > 300 ? " · mostro i primi 300" : ""}</span>
            ${scheda === "tony" ? `<button class="av-btn" id="av-tutti">✅ Confermo tutti i ${Math.min(vis.length, 300)} mostrati</button>` : ""}
          </div>
          ${vis.slice(0, 300).map(riga).join("")}
        `}
        <div id="av-esito" class="av-esito"></div>
      </div>
      ${stile()}`;

    collega();
  }

  function riga(p) {
    const att = modifiche[p.id] || p.allergeni || [];
    const cambiato = !!modifiche[p.id];
    return `
      <div class="av-card" data-id="${p.id}">
        <div class="av-top">
          <div class="t"><b>${esc(p.nome)}</b>
            ${p.categoria_interna ? `<span>${esc(p.categoria_interna)}</span>` : ""}</div>
          <button class="av-btn ${cambiato ? "mod" : ""}" data-ok="${p.id}">
            ${scheda === "tony" ? (cambiato ? "💾 Salvo e confermo" : "✅ Confermo") : "💾 Salvo"}</button>
        </div>
        <div class="av-chips">
          ${ALLERGENI.map(([k, n]) => `<span class="c ${att.includes(k) ? "on" : ""}" data-p="${p.id}" data-a="${k}">${n}</span>`).join("")}
        </div>
      </div>`;
  }

  function collega() {
    container.querySelectorAll("[data-tab]").forEach(b => b.onclick = async () => {
      scheda = b.dataset.tab; filtroA = "";
      Object.keys(modifiche).forEach(k => delete modifiche[k]);
      container.querySelector(".av").innerHTML = `<div class="av-caric">Un attimo…</div>`;
      await carica();
    });
    container.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { filtroA = b.dataset.f; disegna(); });

    const inp = container.querySelector("#av-cerca");
    let t;
    inp.oninput = () => { clearTimeout(t); t = setTimeout(() => {
      cerca = inp.value; disegna();
      const n = container.querySelector("#av-cerca"); n.focus(); n.setSelectionRange(n.value.length, n.value.length);
    }, 250); };

    container.querySelectorAll(".av-chips .c").forEach(c => c.onclick = () => {
      const p = lista.find(x => String(x.id) === c.dataset.p);
      const att = [...(modifiche[p.id] || p.allergeni || [])];
      const i = att.indexOf(c.dataset.a);
      if (i >= 0) att.splice(i, 1); else att.push(c.dataset.a);
      modifiche[p.id] = att;
      c.classList.toggle("on");
      const b = container.querySelector(`[data-ok="${p.id}"]`);
      b.classList.add("mod");
      b.textContent = scheda === "tony" ? "💾 Salvo e confermo" : "💾 Salvo";
    });

    container.querySelectorAll("[data-ok]").forEach(b => b.onclick = async () => {
      b.disabled = true; b.textContent = "…";
      const ok = await salva([lista.find(x => String(x.id) === b.dataset.ok)]);
      if (ok) await carica(); else { b.disabled = false; b.textContent = "Riprova"; }
    });

    const tutti = container.querySelector("#av-tutti");
    if (tutti) tutti.onclick = async () => {
      const vis = visibili().slice(0, 300);
      if (!confirm(`Confermi gli allergeni di ${vis.length} prodotti così come li vedi?`)) return;
      tutti.disabled = true; tutti.textContent = "Salvo…";
      if (await salva(vis)) await carica(); else { tutti.disabled = false; tutti.textContent = "Riprova"; }
    };
  }

  async function salva(prodotti) {
    const chi = window.state?.profilo?.nome_completo || window.state?.profilo?.nome || window.state?.user?.email || "utente";
    const oggi = new Date().toLocaleDateString("it-IT");
    const esito = container.querySelector("#av-esito");
    // Raggruppo per insieme di allergeni: una chiamata per gruppo invece di una per prodotto.
    const gruppi = {};
    prodotti.forEach(p => {
      const a = [...new Set(modifiche[p.id] || p.allergeni || [])].sort();
      (gruppi[a.join(",")] = gruppi[a.join(",")] || { a, ids: [] }).ids.push(p.id);
    });
    for (const g of Object.values(gruppi)) {
      const campi = { allergeni: g.a, allergeni_da_verificare: false, allergeni_origine: `Confermato da ${chi} il ${oggi}` };
      if (scheda === "vuoti" && !g.a.length) continue;
      for (let i = 0; i < g.ids.length; i += 200) {
        const { error } = await supabase.from("prodotti").update(campi).in("id", g.ids.slice(i, i + 200));
        if (error) {
          if (esito) { esito.textContent = "Non salvato: " + error.message; esito.className = "av-esito ko"; }
          return false;
        }
      }
    }
    prodotti.forEach(p => delete modifiche[p.id]);
    return true;
  }
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stile() {
  return `<style>
  .av{--navy:#023C59;--verde:#348127;--rosso:#B91C1C;--riga:#E2E6EA;--muto:#6B7A83;
      max-width:760px;margin:0 auto;padding:16px 14px 70px;color:#12232E;}
  .av-caric{padding:40px;text-align:center;color:#94a3b8;}
  .av h1{font-size:22px;margin:0 0 4px;}
  .av-sub,.av-nota{font-size:13.5px;color:var(--muto);line-height:1.55;margin-bottom:14px;}
  .av-tab{display:flex;gap:6px;margin-bottom:10px;}
  .av-tab button,.av-filtri button{border:1.5px solid var(--riga);background:#fff;border-radius:999px;padding:7px 13px;
    font-size:13px;font-weight:700;color:var(--navy);cursor:pointer;font-family:inherit;}
  .av-tab button.on,.av-filtri button.on{background:var(--navy);border-color:var(--navy);color:#fff;}
  .av-cerca{width:100%;box-sizing:border-box;border:1.5px solid var(--riga);border-radius:10px;padding:10px 12px;
    font-size:15px;margin-bottom:10px;font-family:inherit;}
  .av-filtri{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px;}
  .av-filtri button{white-space:nowrap;font-size:12.5px;padding:6px 11px;}
  .av-conta{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;
    font-size:11.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--muto);margin-bottom:10px;}
  .av-vuoto{background:#F6FBF3;border:1px solid #CFE4C2;border-radius:14px;padding:20px;color:var(--verde);font-size:15px;}
  .av-card{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:12px 14px;margin-bottom:9px;}
  .av-top{display:flex;gap:10px;align-items:flex-start;}
  .av-top .t{flex:1;min-width:0;}
  .av-top .t b{font-size:15px;word-break:break-word;}
  .av-top .t span{display:block;font-size:12px;color:var(--muto);margin-top:2px;}
  .av-btn{background:var(--verde);color:#fff;border:none;border-radius:10px;padding:8px 12px;font-size:13px;
    font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;letter-spacing:0;text-transform:none;}
  .av-btn.mod{background:var(--navy);}
  .av-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;}
  .av-chips .c{border:1.5px solid var(--riga);border-radius:999px;padding:4px 9px;font-size:12px;color:var(--muto);
    cursor:pointer;user-select:none;}
  .av-chips .c.on{background:#FEF2F2;border-color:#FCA5A5;color:var(--rosso);font-weight:700;}
  .av-esito{margin-top:10px;font-size:14px;}
  .av-esito.ko{color:var(--rosso);}
  </style>`;
}
