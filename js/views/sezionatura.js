// js/views/sezionatura.js
// 🔪 Sezionatura: per ogni pezzo che si compra (filetto, lombo, controfiletto...) i tagli che se ne
// ricavano, con resa attesa, peso della porzione e destinazione. Si registra ogni sezionatura con i
// pesi reali: resa reale contro attesa e costo vero di ogni taglio (il costo del pezzo si divide sui
// tagli principali e secondari; coprodotti e scarti non portano costo).
const sb = () => window.supabaseClient || window.supabase;
const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
const f2 = (n, d = 2) => (n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d }));
const fd = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("it-IT") : "—");
const TIPI = { principale: ["Principale", "#0E5A7A"], secondario: ["Secondario", "#7c3aed"], coprodotto: ["Coprodotto", "#b45309"], scarto: ["Scarto", "#64748b"] };
const UTILE = (t) => t === "principale" || t === "secondario";

export async function render(app) {
  const az = window.state?.azienda?.id;
  if (!az) { app.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`; return; }
  const ruolo = String(window.state?.ruolo || window.state?.user?.ruolo || "").toLowerCase();
  const vedeCosti = !["operatore"].includes(ruolo);
  let pezzi = [];

  app.innerHTML = `${stile()}<div class="sz">
    <h2 class="sz-tit">🔪 Sezionatura</h2>
    <div class="sz-sub">Per ogni pezzo che compriamo: i tagli che si devono ricavare, quanto rendono e dove vanno. Registra ogni sezionatura con i pesi reali.</div>
    <button id="sz-nuovo" class="sz-pri" type="button">＋ Nuovo pezzo</button>
    <input id="sz-cerca" class="sz-in" placeholder="Cerca pezzo (filetto, lombo...)" style="margin-top:10px">
    <div id="sz-lista"><div class="sz-vuoto">Un attimo…</div></div>
    <div id="sz-scheda"></div>
  </div>`;
  const elLista = app.querySelector("#sz-lista");
  const elScheda = app.querySelector("#sz-scheda");
  let cerca = "";
  app.querySelector("#sz-cerca").addEventListener("input", (e) => { cerca = e.target.value.toLowerCase(); disegnaLista(); });
  app.querySelector("#sz-nuovo").addEventListener("click", () => editPezzo(null));
  await carica();
  const daUrl = new URLSearchParams(location.hash.split("?")[1] || "").get("pezzo");
  if (daUrl) apriPezzo(daUrl);

  async function carica() {
    const { data, error } = await sb().from("sezionatura_pezzi")
      .select("id, nome, specie, fornitore, peso_medio_kg, prodotto_id, ricetta_id, note, prodotti(nome, costo_ultimo), ricette(nome), sezionatura_tagli(id), sezionatura_rese(data, peso_lordo_kg, dettaglio)")
      .eq("azienda_id", az).eq("attivo", true).order("nome");
    if (error) { elLista.innerHTML = `<div class="sz-err">Errore: ${esc(error.message)}</div>`; return; }
    pezzi = data || [];
    disegnaLista();
  }

  function disegnaLista() {
    const righe = pezzi.filter((p) => !cerca || [p.nome, p.specie, p.fornitore].join(" ").toLowerCase().includes(cerca));
    if (!righe.length) { elLista.innerHTML = `<div class="sz-vuoto">${pezzi.length ? "Nessun pezzo trovato." : "Nessun pezzo ancora. Aggiungi il primo."}</div>`; return; }
    elLista.innerHTML = righe.map((p) => {
      const rese = (p.sezionatura_rese || []).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
      const u = rese[0];
      const utile = u ? (u.dettaglio || []).filter((d) => UTILE(d.tipo)).reduce((t, d) => t + (Number(d.kg) || 0), 0) : 0;
      return `<button class="sz-card" data-id="${p.id}" type="button">
        <div class="sz-r1"><b>${esc(p.nome)}</b><span class="sz-tag">${(p.sezionatura_tagli || []).length} tagli</span></div>
        <div class="sz-r3">${esc([p.specie, p.fornitore, p.peso_medio_kg ? `~${f2(Number(p.peso_medio_kg), 1)} kg a pezzo` : ""].filter(Boolean).join(" · "))}</div>
        ${u ? `<div class="sz-r3">Ultima sezionatura ${fd(u.data)}: resa utile <b>${f2(utile / Number(u.peso_lordo_kg) * 100, 0)}%</b> su ${f2(Number(u.peso_lordo_kg))} kg</div>` : `<div class="sz-r3">Nessuna sezionatura registrata</div>`}
      </button>`;
    }).join("");
    elLista.querySelectorAll(".sz-card").forEach((b) => b.addEventListener("click", () => apriPezzo(b.dataset.id)));
  }

  async function apriPezzo(id) {
    const p = pezzi.find((x) => x.id === id);
    if (!p) return;
    const [{ data: tagli }, { data: rese }] = await Promise.all([
      sb().from("sezionatura_tagli").select("*").eq("pezzo_id", id).order("ordine"),
      sb().from("sezionatura_rese").select("*").eq("pezzo_id", id).order("data", { ascending: false }).limit(30),
    ]);
    const T = tagli || [];
    const costoProd = Number(p.prodotti?.costo_ultimo) || null;
    const sommaAttesa = T.reduce((t, x) => t + (Number(x.resa_attesa_pct) || 0), 0);
    elLista.style.display = "none";
    elScheda.innerHTML = `<div class="sz-box">
      <button id="sz-indietro" class="sz-link" type="button">← Tutti i pezzi</button>
      <div class="sz-r1" style="margin-top:6px"><h3 class="sz-h3">${esc(p.nome)}</h3><button id="sz-mod" class="sz-sec sz-small" type="button">✏️ Modifica</button></div>
      <div class="sz-r3">${esc([p.specie, p.fornitore, p.peso_medio_kg ? `~${f2(Number(p.peso_medio_kg), 1)} kg a pezzo` : ""].filter(Boolean).join(" · "))}</div>
      <div class="sz-r3">Prodotto: <b>${esc(p.prodotti?.nome || "non collegato")}</b>${vedeCosti && costoProd ? ` · ${f2(costoProd)} €/kg` : ""} · Ricetta: <b>${p.ricetta_id ? `<a href="#/crea-ricetta?id=${p.ricetta_id}">${esc(p.ricette?.nome || "ricetta")}</a>` : "nessuna"}</b></div>
      ${p.note ? `<div class="sz-nota">${esc(p.note)}</div>` : ""}

      <h4 class="sz-h4">Tagli da ricavare</h4>
      ${T.length ? `<div class="sz-tagli">${T.map((t) => `<div class="sz-taglio">
          <div class="sz-r1"><span><span class="sz-tipo" style="background:${TIPI[t.tipo]?.[1]}">${TIPI[t.tipo]?.[0] || t.tipo}</span> <b>${esc(t.nome)}</b>${t.obbligatorio ? "" : ` <span class="sz-fac">facoltativo</span>`}</span>
          <button class="sz-link sz-mt" data-t="${t.id}" type="button">✏️</button></div>
          <div class="sz-r3">${[t.resa_attesa_pct != null ? `resa ${f2(Number(t.resa_attesa_pct), 0)}%` : "", t.peso_porzione_g ? `porzione ${f2(Number(t.peso_porzione_g), 0)} g` : "", t.destinazione ? `→ ${esc(t.destinazione)}` : ""].filter(Boolean).join(" · ")}</div>
        </div>`).join("")}</div>
        <div class="sz-r3" style="margin-top:4px">Somma delle rese attese: <b style="color:${Math.abs(sommaAttesa - 100) <= 2 ? "#15803d" : "#b45309"}">${f2(sommaAttesa, 0)}%</b>${Math.abs(sommaAttesa - 100) > 2 ? " (dovrebbe fare circa 100%)" : ""}</div>`
        : `<div class="sz-vuoto">Nessun taglio. Aggiungi i tagli che si ricavano da questo pezzo.</div>`}
      <button id="sz-add-taglio" class="sz-sec" type="button" style="width:100%;margin-top:8px">＋ Aggiungi taglio</button>

      <h4 class="sz-h4">Calcolatore</h4>
      <div class="sz-g2"><div><label class="sz-lab">Peso del pezzo (kg)</label><input id="sz-calc-kg" class="sz-in" inputmode="decimal" placeholder="es. 4,74"></div>
      ${vedeCosti ? `<div><label class="sz-lab">Costo €/kg</label><input id="sz-calc-eur" class="sz-in" inputmode="decimal" value="${costoProd ? String(costoProd).replace(".", ",") : ""}"></div>` : "<div></div>"}</div>
      <div id="sz-calc-out"></div>

      <h4 class="sz-h4">Registra una sezionatura</h4>
      <div class="sz-sub" style="margin:0 0 6px">Scrivi il peso del pezzo e quanto hai ricavato di ogni taglio.</div>
      <div class="sz-g2"><div><label class="sz-lab">Data</label><input id="sz-reg-data" type="date" class="sz-in" value="${new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" })}"></div>
        <div><label class="sz-lab">Peso lordo (kg)</label><input id="sz-reg-kg" class="sz-in" inputmode="decimal"></div></div>
      ${vedeCosti ? `<label class="sz-lab">Costo €/kg (dalla fattura)</label><input id="sz-reg-eur" class="sz-in" inputmode="decimal" value="${costoProd ? String(costoProd).replace(".", ",") : ""}">` : ""}
      ${T.map((t) => `<div class="sz-reg-riga"><span>${esc(t.nome)}</span>
        <input class="sz-in sz-reg-t" data-t="${t.id}" inputmode="decimal" placeholder="kg">
        ${t.peso_porzione_g ? `<input class="sz-in sz-reg-p" data-t="${t.id}" inputmode="numeric" placeholder="pezzi">` : `<span></span>`}</div>`).join("")}
      <label class="sz-lab">Note</label><input id="sz-reg-note" class="sz-in" placeholder="es. 4 teste, lotto fornitore...">
      <div id="sz-reg-err" class="sz-err"></div>
      <button id="sz-reg-salva" class="sz-pri" type="button" style="margin-top:10px" ${T.length ? "" : "disabled"}>💾 Salva sezionatura</button>

      <h4 class="sz-h4">Storico</h4>
      <div id="sz-storico">${(rese || []).length ? (rese || []).map((r) => storicoRiga(r, T)).join("") : `<div class="sz-vuoto">Nessuna sezionatura registrata.</div>`}</div>
    </div>`;

    elScheda.querySelector("#sz-indietro").addEventListener("click", chiudi);
    elScheda.querySelector("#sz-mod").addEventListener("click", () => editPezzo(p));
    elScheda.querySelector("#sz-add-taglio").addEventListener("click", () => editTaglio(p, null, T.length));
    elScheda.querySelectorAll(".sz-mt").forEach((b) => b.addEventListener("click", () => editTaglio(p, T.find((x) => x.id === b.dataset.t), T.length)));

    const calc = () => {
      const kg = num(elScheda.querySelector("#sz-calc-kg").value);
      const eur = vedeCosti ? num(elScheda.querySelector("#sz-calc-eur")?.value) : null;
      const out = elScheda.querySelector("#sz-calc-out");
      if (!kg) { out.innerHTML = ""; return; }
      const utilePct = T.filter((t) => UTILE(t.tipo)).reduce((s, t) => s + (Number(t.resa_attesa_pct) || 0), 0);
      const costoUtile = eur && utilePct ? (kg * eur) / (kg * utilePct / 100) : null;
      out.innerHTML = `<div class="sz-tab">${T.map((t) => {
        const k = kg * (Number(t.resa_attesa_pct) || 0) / 100;
        const pz = t.peso_porzione_g ? Math.floor(k * 1000 / Number(t.peso_porzione_g)) : null;
        return `<div class="sz-tr"><span>${esc(t.nome)}</span><b>${f2(k)} kg</b><span>${pz != null ? pz + " pz" : ""}</span>${vedeCosti && costoUtile && UTILE(t.tipo) && t.peso_porzione_g ? `<span>${f2(costoUtile * Number(t.peso_porzione_g) / 1000)} €/pz</span>` : "<span></span>"}</div>`;
      }).join("")}</div>${vedeCosti && costoUtile ? `<div class="sz-r3">Costo del pezzo ${f2(kg * eur)} € · costo vero dei tagli utili <b>${f2(costoUtile)} €/kg</b></div>` : ""}`;
    };
    elScheda.querySelector("#sz-calc-kg").addEventListener("input", calc);
    elScheda.querySelector("#sz-calc-eur")?.addEventListener("input", calc);

    elScheda.querySelector("#sz-reg-salva").addEventListener("click", async () => {
      const err = elScheda.querySelector("#sz-reg-err"); err.textContent = "";
      const lordo = num(elScheda.querySelector("#sz-reg-kg").value);
      if (!lordo) { err.textContent = "Scrivi il peso lordo del pezzo."; return; }
      const dettaglio = T.map((t) => ({ taglio_id: t.id, nome: t.nome, tipo: t.tipo,
        kg: num(elScheda.querySelector(`.sz-reg-t[data-t="${t.id}"]`).value),
        pezzi: num(elScheda.querySelector(`.sz-reg-p[data-t="${t.id}"]`)?.value) })).filter((d) => d.kg != null || d.pezzi != null);
      if (!dettaglio.length) { err.textContent = "Scrivi almeno il peso di un taglio."; return; }
      const somma = dettaglio.reduce((s, d) => s + (d.kg || 0), 0);
      if (somma > lordo * 1.02) { err.textContent = `I tagli pesano ${f2(somma)} kg: piu' del pezzo intero (${f2(lordo)} kg). Controlla.`; return; }
      const b = elScheda.querySelector("#sz-reg-salva"); b.disabled = true; b.textContent = "Salvo…";
      const { error } = await sb().from("sezionatura_rese").insert({ azienda_id: az, pezzo_id: p.id, data: elScheda.querySelector("#sz-reg-data").value,
        peso_lordo_kg: lordo, costo_kg: vedeCosti ? num(elScheda.querySelector("#sz-reg-eur")?.value) : null, dettaglio,
        operatore: window.state?.dipendente?.nome || window.state?.user?.email || null, note: elScheda.querySelector("#sz-reg-note").value || null });
      if (error) { err.textContent = "Non salvata: " + error.message; b.disabled = false; b.textContent = "💾 Salva sezionatura"; return; }
      await carica(); apriPezzo(p.id);
    });
  }

  function storicoRiga(r, T) {
    const lordo = Number(r.peso_lordo_kg) || 0;
    const det = r.dettaglio || [];
    const kgUtili = det.filter((d) => UTILE(d.tipo)).reduce((s, d) => s + (Number(d.kg) || 0), 0);
    const costoUtile = vedeCosti && r.costo_kg && kgUtili ? (lordo * Number(r.costo_kg)) / kgUtili : null;
    const somma = det.reduce((s, d) => s + (Number(d.kg) || 0), 0);
    return `<div class="sz-card sz-stor">
      <div class="sz-r1"><b>${fd(r.data)} · ${f2(lordo)} kg</b><span>resa utile <b>${lordo ? f2(kgUtili / lordo * 100, 0) : "—"}%</b></span></div>
      ${det.map((d) => {
        const t = T.find((x) => x.id === d.taglio_id);
        const reale = lordo && d.kg != null ? Number(d.kg) / lordo * 100 : null;
        const att = t?.resa_attesa_pct != null ? Number(t.resa_attesa_pct) : null;
        const diff = reale != null && att != null ? reale - att : null;
        return `<div class="sz-tr"><span>${esc(d.nome)}</span><b>${d.kg != null ? f2(Number(d.kg)) + " kg" : "—"}</b><span>${d.pezzi ? d.pezzi + " pz" : ""}</span>
          <span>${reale != null ? f2(reale, 0) + "%" : ""}${diff != null && Math.abs(diff) >= 2 ? ` <i style="color:${(diff > 0) === UTILE(d.tipo) ? "#15803d" : "#b91c1c"}">${diff > 0 ? "+" : ""}${f2(diff, 0)}</i>` : ""}</span></div>`;
      }).join("")}
      ${lordo && somma < lordo * 0.97 ? `<div class="sz-r3" style="color:#b45309">Mancano ${f2(lordo - somma)} kg non pesati (calo o scarto non registrato).</div>` : ""}
      ${costoUtile ? `<div class="sz-r3">Costo ${f2(Number(r.costo_kg))} €/kg · costo vero dei tagli utili <b>${f2(costoUtile)} €/kg</b>${T.filter((t) => UTILE(t.tipo) && t.peso_porzione_g).map((t) => ` · ${esc(t.nome)} ${f2(costoUtile * Number(t.peso_porzione_g) / 1000)} €/pz`).join("")}</div>` : ""}
      ${r.note || r.operatore ? `<div class="sz-r3">${esc([r.operatore, r.note].filter(Boolean).join(" · "))}</div>` : ""}
    </div>`;
  }

  function chiudi() { elScheda.innerHTML = ""; elLista.style.display = ""; disegnaLista(); }

  // ── modifica pezzo ──
  function editPezzo(p) {
    const m = modale(`<h3 class="sz-h3">${p ? "Modifica pezzo" : "Nuovo pezzo"}</h3>
      <label class="sz-lab">Nome</label><input id="m-nome" class="sz-in" value="${esc(p?.nome || "")}" placeholder="es. Lombo di manzo">
      <div class="sz-g2"><div><label class="sz-lab">Specie</label><input id="m-specie" class="sz-in" value="${esc(p?.specie || "")}" placeholder="bovino, suino, pesce..."></div>
      <div><label class="sz-lab">Peso medio (kg)</label><input id="m-peso" class="sz-in" inputmode="decimal" value="${p?.peso_medio_kg != null ? String(p.peso_medio_kg).replace(".", ",") : ""}"></div></div>
      <label class="sz-lab">Fornitore abituale</label><input id="m-forn" class="sz-in" value="${esc(p?.fornitore || "")}">
      <label class="sz-lab">Prodotto in magazzino</label>${cercatore("m-prod", "prodotti", p?.prodotto_id, p?.prodotti?.nome)}
      <label class="sz-lab">Ricetta di lavorazione</label>${cercatore("m-ric", "ricette", p?.ricetta_id, p?.ricette?.nome)}
      <label class="sz-lab">Note</label><textarea id="m-note" class="sz-in" rows="2">${esc(p?.note || "")}</textarea>
      <div id="m-err" class="sz-err"></div>
      <div class="sz-azioni">${p ? `<button id="m-del" class="sz-sec" type="button" style="color:#b91c1c">Archivia</button>` : ""}<button id="m-annulla" class="sz-sec" type="button">Annulla</button><button id="m-ok" class="sz-pri" type="button">Salva</button></div>`);
    attivaCercatore(m, "m-prod", "prodotti");
    attivaCercatore(m, "m-ric", "ricette");
    m.querySelector("#m-annulla").onclick = () => m.remove();
    m.querySelector("#m-del")?.addEventListener("click", async () => {
      if (!confirm("Archiviare questo pezzo? Resta nello storico ma non compare piu' nell'elenco.")) return;
      await sb().from("sezionatura_pezzi").update({ attivo: false }).eq("id", p.id);
      m.remove(); chiudi(); await carica();
    });
    m.querySelector("#m-ok").onclick = async () => {
      const nome = m.querySelector("#m-nome").value.trim();
      if (!nome) { m.querySelector("#m-err").textContent = "Scrivi il nome."; return; }
      const v = { nome, specie: m.querySelector("#m-specie").value.trim() || null, peso_medio_kg: num(m.querySelector("#m-peso").value),
        fornitore: m.querySelector("#m-forn").value.trim() || null, note: m.querySelector("#m-note").value.trim() || null,
        prodotto_id: num(m.querySelector("#m-prod").dataset.id) || null, ricetta_id: num(m.querySelector("#m-ric").dataset.id) || null };
      const q = p ? sb().from("sezionatura_pezzi").update(v).eq("id", p.id).select("id").single()
                  : sb().from("sezionatura_pezzi").insert({ ...v, azienda_id: az }).select("id").single();
      const { data, error } = await q;
      if (error) { m.querySelector("#m-err").textContent = error.message; return; }
      m.remove(); await carica(); apriPezzo(data.id);
    };
  }

  // ── modifica taglio ──
  function editTaglio(p, t, n) {
    const m = modale(`<h3 class="sz-h3">${t ? "Modifica taglio" : "Nuovo taglio"} · ${esc(p.nome)}</h3>
      <label class="sz-lab">Nome del taglio</label><input id="t-nome" class="sz-in" value="${esc(t?.nome || "")}" placeholder="es. Bistecche, Straccetti, Ritagli per ragu'">
      <label class="sz-lab">Tipo</label><select id="t-tipo" class="sz-in">${Object.entries(TIPI).map(([k, v]) => `<option value="${k}" ${(t?.tipo || "principale") === k ? "selected" : ""}>${v[0]}</option>`).join("")}</select>
      <div class="sz-g2"><div><label class="sz-lab">Resa attesa (%)</label><input id="t-resa" class="sz-in" inputmode="decimal" value="${t?.resa_attesa_pct != null ? String(t.resa_attesa_pct).replace(".", ",") : ""}"></div>
      <div><label class="sz-lab">Porzione (g)</label><input id="t-g" class="sz-in" inputmode="numeric" value="${t?.peso_porzione_g ?? ""}" placeholder="vuoto se a peso"></div></div>
      <label class="sz-lab">Destinazione</label><input id="t-dest" class="sz-in" value="${esc(t?.destinazione || "")}" placeholder="es. Trattoria - griglia, banchetti, fondi">
      <label class="sz-lab">Ricetta che usa questo taglio (facoltativa)</label>${cercatore("t-ric", "ricette", t?.ricetta_id, null)}
      <label class="sz-chk"><input id="t-obb" type="checkbox" ${t ? (t.obbligatorio ? "checked" : "") : "checked"}> Si ricava sempre (togli la spunta se e' facoltativo)</label>
      <label class="sz-lab">Note</label><input id="t-note" class="sz-in" value="${esc(t?.note || "")}">
      <div id="t-err" class="sz-err"></div>
      <div class="sz-azioni">${t ? `<button id="t-del" class="sz-sec" type="button" style="color:#b91c1c">Elimina</button>` : ""}<button id="t-annulla" class="sz-sec" type="button">Annulla</button><button id="t-ok" class="sz-pri" type="button">Salva</button></div>`);
    attivaCercatore(m, "t-ric", "ricette");
    m.querySelector("#t-annulla").onclick = () => m.remove();
    m.querySelector("#t-del")?.addEventListener("click", async () => {
      if (!confirm("Eliminare questo taglio?")) return;
      await sb().from("sezionatura_tagli").delete().eq("id", t.id);
      m.remove(); apriPezzo(p.id);
    });
    m.querySelector("#t-ok").onclick = async () => {
      const nome = m.querySelector("#t-nome").value.trim();
      if (!nome) { m.querySelector("#t-err").textContent = "Scrivi il nome del taglio."; return; }
      const v = { nome, tipo: m.querySelector("#t-tipo").value, resa_attesa_pct: num(m.querySelector("#t-resa").value), peso_porzione_g: num(m.querySelector("#t-g").value),
        destinazione: m.querySelector("#t-dest").value.trim() || null, ricetta_id: num(m.querySelector("#t-ric").dataset.id) || null,
        obbligatorio: m.querySelector("#t-obb").checked, note: m.querySelector("#t-note").value.trim() || null };
      const { error } = t ? await sb().from("sezionatura_tagli").update(v).eq("id", t.id)
                          : await sb().from("sezionatura_tagli").insert({ ...v, azienda_id: az, pezzo_id: p.id, ordine: n + 1 });
      if (error) { m.querySelector("#t-err").textContent = error.message; return; }
      m.remove(); await carica(); apriPezzo(p.id);
    };
  }

  // ── piccoli aiuti ──
  function modale(html) {
    const m = document.createElement("div");
    m.className = "sz-modale";
    m.innerHTML = `<div class="sz-mbox">${html}</div>`;
    m.addEventListener("click", (e) => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    return m;
  }
  function cercatore(id, tab, valId, valNome) {
    return `<div class="sz-cerca"><input id="${id}" class="sz-in" data-id="${valId ?? ""}" value="${esc(valNome || "")}" placeholder="Cerca ${tab === "prodotti" ? "prodotto" : "ricetta"}..." autocomplete="off"><div class="sz-sugg" id="${id}-s"></div></div>`;
  }
  function attivaCercatore(m, id, tab) {
    const inp = m.querySelector("#" + id), box = m.querySelector(`#${id}-s`);
    let timer = null;
    inp.addEventListener("input", () => {
      inp.dataset.id = "";
      clearTimeout(timer);
      const q = inp.value.trim();
      if (q.length < 2) { box.innerHTML = ""; return; }
      timer = setTimeout(async () => {
        let req = sb().from(tab).select("id, nome").eq("azienda_id", az).eq("attivo", true).limit(8);
        for (const w of q.split(/\s+/).filter((x) => x.length > 1).slice(0, 3)) req = req.ilike("nome", `%${w}%`);
        const { data } = await req;
        box.innerHTML = (data || []).map((x) => `<button type="button" data-id="${x.id}">${esc(x.nome)}</button>`).join("") || `<div class="sz-r3" style="padding:6px">Nessun risultato</div>`;
        box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { inp.value = b.textContent; inp.dataset.id = b.dataset.id; box.innerHTML = ""; }));
      }, 250);
    });
  }
}

function stile() {
  return `<style>
  .sz{max-width:760px;margin:0 auto;padding:16px;}
  .sz-tit{margin:0;font-size:22px;font-weight:800;}
  .sz-sub{font-size:13.5px;color:#64748b;margin:4px 0 14px;}
  .sz-h3{margin:0;font-size:19px;font-weight:800;}
  .sz-h4{margin:18px 0 6px;font-size:15px;font-weight:800;color:#0E5A7A;}
  .sz-pri{width:100%;border:0;border-radius:12px;padding:13px;background:#0E5A7A;color:#fff;font-size:15px;font-weight:800;cursor:pointer;}
  .sz-pri:disabled{opacity:.5;}
  .sz-sec{border:1.5px solid #cbd5e1;background:#fff;border-radius:12px;padding:10px 14px;font-weight:700;color:#0E5A7A;cursor:pointer;}
  .sz-small{padding:6px 10px;font-size:13px;}
  .sz-link{border:0;background:none;color:#0E5A7A;font-weight:700;cursor:pointer;padding:0;font-size:14px;}
  .sz-in{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px;font-size:15px;font-family:inherit;background:#fff;}
  .sz-lab{display:block;font-size:12px;font-weight:700;color:#64748b;margin:10px 0 4px;}
  .sz-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .sz-card{display:block;width:100%;text-align:left;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:11px 12px;margin-top:8px;cursor:pointer;font:inherit;color:inherit;}
  .sz-stor{cursor:default;}
  .sz-box{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-top:12px;}
  .sz-r1{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:15px;}
  .sz-r3{font-size:12.5px;color:#64748b;margin-top:3px;}
  .sz-tag{font-size:12px;color:#0E5A7A;font-weight:700;}
  .sz-nota{font-size:13px;background:#f8fafc;border-radius:8px;padding:7px 9px;margin-top:8px;}
  .sz-taglio{border-bottom:1px solid #f1f5f9;padding:8px 0;}
  .sz-tipo{display:inline-block;color:#fff;font-size:11px;font-weight:800;border-radius:6px;padding:2px 6px;margin-right:4px;}
  .sz-fac{font-size:11px;color:#b45309;font-weight:700;}
  .sz-tab{margin-top:8px;}
  .sz-tr{display:grid;grid-template-columns:2fr 1fr 0.8fr 1fr;gap:6px;font-size:13.5px;padding:5px 0;border-bottom:1px solid #f1f5f9;align-items:center;}
  .sz-reg-riga{display:grid;grid-template-columns:1.6fr 1fr 0.9fr;gap:6px;align-items:center;margin-top:6px;font-size:13.5px;}
  .sz-err{color:#b91c1c;font-size:13px;margin-top:8px;}
  .sz-vuoto{color:#64748b;text-align:center;padding:18px;}
  .sz-modale{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10060;display:flex;align-items:flex-end;justify-content:center;}
  .sz-mbox{background:#fff;width:100%;max-width:560px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box;}
  .sz-azioni{display:flex;gap:8px;margin-top:14px;}
  .sz-azioni .sz-pri{flex:2;width:auto;}
  .sz-azioni .sz-sec{flex:1;}
  .sz-chk{display:flex;gap:8px;align-items:center;font-size:14px;margin-top:12px;}
  .sz-cerca{position:relative;}
  .sz-sugg{position:absolute;left:0;right:0;top:100%;background:#fff;border:1px solid #e2e8f0;border-radius:10px;z-index:5;box-shadow:0 8px 20px rgba(0,0,0,.08);}
  .sz-sugg button{display:block;width:100%;text-align:left;border:0;background:#fff;padding:9px 10px;font:inherit;cursor:pointer;border-bottom:1px solid #f1f5f9;}
  </style>`;
}
