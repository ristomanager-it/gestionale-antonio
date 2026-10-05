export async function renderOrdini(container, azienda) {

  const supabase = window.supabaseClient;

  // Match prodotto tollerante: prima esatto, poi "contiene", poi per parole.
  // Serve perché i nomi sono lunghi (es. "cime di rapa porz kg2,5") e l'utente
  // digita solo una parte ("cime di rapa").
  function trovaProdotto(lista, testo) {
    const q = (testo || "").trim().toLowerCase();
    if (!q) return null;
    const nomeOf = p => (p.nome || "").toLowerCase();
    const intOf  = p => (p.nome_interno || "").toLowerCase();
    // 1) match esatto
    let prod = lista.find(p => nomeOf(p) === q || intOf(p) === q);
    if (prod) return prod;
    // 2) il nome del prodotto inizia con quello che ho scritto
    prod = lista.find(p => nomeOf(p).startsWith(q) || intOf(p).startsWith(q));
    if (prod) return prod;
    // 3) il nome contiene quello che ho scritto
    prod = lista.find(p => nomeOf(p).includes(q) || intOf(p).includes(q));
    if (prod) return prod;
    // 4) tutte le parole digitate sono presenti nel nome
    const parole = q.split(/\s+/).filter(Boolean);
    if (parole.length) {
      prod = lista.find(p => { const n = nomeOf(p); return parole.every(w => n.includes(w)); });
      if (prod) return prod;
    }
    return null;
  }

  // Carica sedi per trasferimenti
  const { data: sediData } = await supabase
    .from("sedi")
    .select("id, nome")
    .eq("azienda_id", azienda.id)
    .eq("attiva", true)
    .order("nome");
  const sedi = sediData || [];
  const sedeAttivaId = window.state?.sedeAttiva?.id;

  container.innerHTML = `

  <div class="card">

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="btn-primary tab-ordini-btn active" data-tab="ordini-fornitori">📦 Ordine fornitore</button>
      <button class="btn-secondary tab-ordini-btn" data-tab="trasferimenti">🔄 Trasferimento interno</button>
      <button class="btn-secondary tab-ordini-btn" data-tab="storico-trasf">📋 Storico trasferimenti</button>
      <button class="btn-secondary tab-ordini-btn" data-tab="inviati">📨 Ordini inviati</button>
    </div>

    <div id="tab-ordini-fornitori">
    <div id="ordini-da-banchetti"></div>
    <h3>Aggiungi altro a mano</h3>

    <div id="lista-ordine"></div>

    <div style="margin-top:12px">
      <button id="btn-add-riga" class="btn-primary">
        Aggiungi riga
      </button>
    </div>

  </div>

  <div id="ordini-generati" style="margin-top:16px"></div>
  </div><!-- fine tab ordini-fornitori -->

  <div id="tab-trasferimenti" style="display:none;">
    <h3>🔄 Trasferimento interno</h3>
    <p style="font-size:13px;color:#64748b;">Sposta prodotti/preparazioni dal Centro cottura ad un'altra sede.</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
      <div>
        <label style="font-size:13px;">Da sede</label>
        <select id="trasf-origine" class="input">
          ${sedi.map(s => `<option value="${s.id}" ${s.id === sedeAttivaId ? 'selected' : ''}>${s.nome}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:13px;">A sede</label>
        <select id="trasf-dest" class="input">
          <option value="">-- Seleziona sede --</option>
          ${sedi.filter(s => s.id !== sedeAttivaId).map(s => `<option value="${s.id}">${s.nome}</option>`).join('')}
        </select>
      </div>
    </div>

    <div style="margin-bottom:12px;">
      <label style="font-size:13px;">Data</label>
      <input id="trasf-data" type="date" class="input" value="${new Date().toISOString().slice(0,10)}">
    </div>

    <div id="trasf-righe"></div>

    <button id="btn-add-trasf-riga" class="btn-secondary" style="margin-top:8px;">+ Aggiungi prodotto</button>

    <div style="margin-top:16px;">
      <button id="btn-conferma-trasferimento" class="btn-primary">✅ Conferma trasferimento</button>
    </div>
    <div id="trasf-feedback" style="margin-top:8px;font-size:13px;"></div>
  </div>

  <div id="tab-inviati" style="display:none;">
    <h3>📨 Ordini inviati</h3>
    <div id="inviati-content"><div style="color:#64748b;font-size:13px;">Caricamento...</div></div>
  </div>

  <div id="tab-storico-trasf" style="display:none;">
    <h3>📋 Storico trasferimenti</h3>
    <div id="storico-trasf-content"><div style="color:#64748b;font-size:13px;">Caricamento...</div></div>
  </div>

  `;

  const lista = container.querySelector("#lista-ordine");
  const wrapperOrdini = container.querySelector("#ordini-generati");

  let prodotti = [];
  let fornitori = [];

  async function loadData(){

    const { data:prodottiData } = await supabase
      .from("prodotti")
      .select("id,nome,fornitore_preferito_id,unita_misura")
      .eq("azienda_id", azienda.id)
      .eq("attivo", true)
      .order("nome");

    prodotti = prodottiData || [];

    // Popolo/aggiorno la datalist per l'autocompletamento degli input prodotto
    let dl = document.getElementById("prodotti-list");
    if (!dl) {
      dl = document.createElement("datalist");
      dl.id = "prodotti-list";
      document.body.appendChild(dl);
    }
    dl.innerHTML = prodotti.map(p => '<option value="' + (p.nome || "").replace(/"/g, "&quot;") + '"></option>').join("");

    const { data:fornitoriData } = await supabase
      .from("fornitori")
      .select("id,ragione_sociale,email_referente_ordini,telefono_referente_ordini")
      .eq("azienda_id", azienda.id);

    fornitori = fornitoriData || [];

  }

  function addRiga(prodottoId=null, qta=1){

    const row = document.createElement("div");

    row.className = "card";

    row.innerHTML = `

      <div class="rf-grid">

        <div>
          <label>Prodotto</label>

          <input 
            class="input input-prodotto"
            list="prodotti-list"
            placeholder="Scrivi o scegli prodotto"
          >

        </div>

        <div>
          <label>UM</label>

          <select class="input um-prodotto">

            <option value="">--</option>
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="l">l</option>
            <option value="ml">ml</option>
            <option value="pz">pz</option>
            <option value="conf">conf</option>

          </select>

        </div>

        <div>
          <label>Quantità</label>
          <input class="input qta-prodotto" type="number" value="${qta}">
        </div>

      </div>

      <div class="fornitore-missing" style="margin-top:8px"></div>

    `;

    lista.appendChild(row);

    const input=row.querySelector(".input-prodotto");
    const um=row.querySelector(".um-prodotto");

    input.addEventListener("input",()=>{

      const nome=input.value.toLowerCase();

      const prod=trovaProdotto(prodotti, nome);

      if(prod){

        um.value=prod.unita_misura||"";

        if(!prod.fornitore_preferito_id){
          renderSelectFornitore(row,prod.id);
        }else{
          row.querySelector(".fornitore-missing").innerHTML="";
        }

      }else{

        renderSelectFornitore(row,null);

      }

      generaOrdini();

    });

    if(prodottoId){

      const prod=prodotti.find(p=>p.id==prodottoId);

      if(prod){
        input.value=prod.nome;
        um.value=prod.unita_misura||"";
      }

    }

  }

  document
    .getElementById("btn-add-riga")
    .addEventListener("click",()=>addRiga());

  async function initOrdineDraft(){

    const draft = window.state?.ordineDraft || [];

    if(!draft.length){
      addRiga();
      return;
    }

    draft.forEach(r=>{
      addRiga(r.prodotto_id,r.quantita);
    });

    generaOrdini();

  }

  container.addEventListener("input", generaOrdini);

  function generaOrdini(){

    const ordini={};

    container.querySelectorAll("#lista-ordine > .card").forEach(r=>{

      const nome=r.querySelector(".input-prodotto").value.trim().toLowerCase();
      const qta=parseFloat(r.querySelector(".qta-prodotto").value||0);
      const um=r.querySelector(".um-prodotto").value;

      if(!nome || qta<=0) return;

      const prodotto=trovaProdotto(prodotti, nome);

      if(!prodotto) return;

      const fornId=prodotto.fornitore_preferito_id;

      if(!fornId){
        renderSelectFornitore(r,prodotto.id);
        return;
      }

      if(!ordini[fornId]){
        ordini[fornId]=[];
      }

      ordini[fornId].push({
        nome:prodotto.nome,
        prodotto_id:prodotto.id,
        quantita:qta,
        um:um||prodotto.unita_misura
      });

    });

    renderOrdiniFornitori(ordini);

  }

  function renderSelectFornitore(element, prodottoId){

    const div=element.querySelector(".fornitore-missing");

    div.innerHTML=`

      <select class="input">

        <option value="">Fornitore</option>

        ${fornitori.map(f=>`
          <option value="${f.id}">
            ${f.ragione_sociale}
          </option>
        `).join("")}

      </select>

    `;

    div.querySelector("select")
      .addEventListener("change",async e=>{

        const fornId=e.target.value;

        if(!fornId) return;

        if(prodottoId){

          await supabase
            .from("prodotti")
            .update({fornitore_preferito_id:fornId})
            .eq("id",prodottoId);

          const prod=prodotti.find(p=>p.id==prodottoId);

          if(prod) prod.fornitore_preferito_id=fornId;

        }

        generaOrdini();

      });

  }

  function renderOrdiniFornitori(ordini){

    let html="";

    for(const fid in ordini){

      const forn=fornitori.find(f=>f.id==fid);

      const prodottiForn=ordini[fid];

      const testoMail = prodottiForn
        .map(p=>`${p.nome} ${p.quantita} ${p.um}`)
        .join("\\n");

      html+=`

      <div class="card">

        <strong>${forn?.ragione_sociale||"Fornitore non assegnato"}</strong>

        <div style="font-size:13px;color:#666">

          ${forn?.telefono_referente_ordini||""}<br>
          ${forn?.email_referente_ordini||""}

        </div>

        ${prodottiForn.map(p=>`

          <div class="rf-grid" style="margin-top:8px">

            <div>${p.nome}</div>
            <div>${p.quantita}</div>
            <div>${p.um||""}</div>

          </div>

        `).join("")}

        <div style="margin-top:10px">

          <button class="btn-primary send-order-btn" data-fornitore="${fid}">
            Invia ordine
          </button>

        </div>

      </div>

      `;

    }

    wrapperOrdini.innerHTML=html;

    wrapperOrdini.querySelectorAll(".send-order-btn").forEach(btn=>{

      btn.addEventListener("click", async ()=>{

        const fid = btn.dataset.fornitore;

        const forn = fornitori.find(f=>f.id==fid);

        const prodottiForn = ordini[fid];

        if(!forn?.email_referente_ordini){
          alert("Email fornitore non disponibile");
          return;
        }

        const res = await supabase.functions.invoke("send-order-email",{
          body:{
            email:forn.email_referente_ordini,
            fornitore_nome:forn.ragione_sociale,
            azienda_nome:azienda.nome,
            prodotti:prodottiForn
          }
        });

        if(res.error){
          alert("Errore invio ordine");
        }else{
          // l'ordine resta registrato: lo si ritrova in "Ordini inviati" e in Ordini
          const { error: errReg } = await supabase.rpc("registra_ordine_inviato", {
            p_azienda: azienda.id, p_sede: window.state?.sedeAttiva?.id || null, p_fornitore: Number(fid),
            p_righe: prodottiForn, p_origine: "acquisti", p_canale: "email"
          });
          if (errReg) console.warn("registra ordine:", errReg);
          alert("Ordine inviato" + (errReg ? " (non registrato nello storico)" : ""));
        }

      });

    });

  }

  await loadData();
  await initOrdineDraft();
  daOrdinare(7);

  // ── DA ORDINARE: banchetti, preparazioni delle sedi (trattoria compresa) e sotto scorta, tutto insieme ──
  async function daOrdinare(giorni) {
    const box = container.querySelector("#ordini-da-banchetti");
    if (!box) return;
    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const num = (n) => Number(n || 0).toLocaleString("it-IT", { maximumFractionDigits: 2 });
    const fd = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "numeric" }) : "";
    box.innerHTML = `<div style="color:#64748b;font-size:13px;margin-bottom:12px;">Calcolo cosa c'è da ordinare…</div>`;
    const { data, error } = await supabase.rpc("fabbisogno_acquisti", { p_azienda: azienda.id, p_giorni: giorni });
    if (error) { box.innerHTML = `<div style="color:#b91c1c;font-size:13px;margin-bottom:12px;">Non riesco a calcolare il fabbisogno.</div>`; return; }
    const righe = (Array.isArray(data) ? data : []).map((r, k) => ({ ...r, k, ok: true, q: Number(r.quantita) || 0 }));
    const gruppi = {};
    righe.forEach((r) => { const id = r.fornitore_id ? String(r.fornitore_id) : "_"; (gruppi[id] ||= { id, nome: r.fornitore || "Senza fornitore", email: r.email, tel: r.telefono, righe: [] }).righe.push(r); });
    const ordine = Object.values(gruppi).sort((a, b) => (a.id === "_") - (b.id === "_") || a.nome.localeCompare(b.nome));

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <h3 style="margin:0;">🛒 Da ordinare</h3>
        <div style="display:flex;gap:6px;">
          ${[7, 14].map((g) => `<button class="${g === giorni ? "btn-primary" : "btn-secondary"}" data-giorni="${g}">${g} giorni</button>`).join("")}
        </div>
      </div>
      <div style="font-size:12.5px;color:#64748b;margin-bottom:10px;">Banchetti confermati, preparazioni in planning di tutte le sedi e prodotti sotto scorta. Togli la spunta o cambia la quantità prima di inviare.</div>
      ${!righe.length ? `<div style="color:#64748b;font-size:13px;margin-bottom:14px;">Niente da ordinare nei prossimi ${giorni} giorni.</div>` : ordine.map((g) => `
        <div class="card" style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <strong>${esc(g.nome)}</strong>
            <span style="font-size:12px;color:#64748b;">${g.righe.length} prodotti</span>
          </div>
          ${g.righe.map((r) => `
            <div class="do-r" data-k="${r.k}" style="display:flex;gap:8px;align-items:center;padding:7px 0;border-top:1px solid #f1f5f9;">
              <input type="checkbox" data-ok checked style="width:20px;height:20px;flex:none;">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:14px;">${esc(r.nome)}</div>
                <div style="font-size:11.5px;color:#64748b;">per ${esc(r.per || "")}${r.serve_il ? " · entro " + fd(r.serve_il) : ""}${r.in_magazzino != null ? " · in magazzino " + num(r.in_magazzino) + " " + esc(r.unita_magazzino || "") : ""}</div>
                ${g.id === "_" ? `<select data-forn style="margin-top:4px;font-size:12px;max-width:100%;"><option value="">Assegna fornitore…</option>${fornitori.map((f) => `<option value="${f.id}">${esc(f.ragione_sociale)}</option>`).join("")}</select>` : ""}
              </div>
              <input type="number" step="0.1" min="0" data-q value="${r.q}" style="width:76px;flex:none;">
              <span style="width:28px;font-size:12px;color:#64748b;flex:none;">${esc(r.unita || "")}</span>
            </div>`).join("")}
          ${g.id !== "_" ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
              <button class="btn-primary" data-invia="${g.id}">✉️ Invia${g.email ? "" : " (manca email)"}</button>
              <button class="btn-secondary" data-wa="${g.id}">WhatsApp</button>
              <button class="btn-secondary" data-copia="${g.id}">Copia</button>
            </div>` : `<div style="font-size:12px;color:#92400e;margin-top:6px;">Assegna un fornitore: il prodotto passa nel suo ordine.</div>`}
        </div>`).join("")}`;

    box.querySelectorAll("[data-giorni]").forEach((b) => b.addEventListener("click", () => daOrdinare(Number(b.dataset.giorni))));
    box.querySelectorAll(".do-r").forEach((el) => {
      const r = righe[Number(el.dataset.k)];
      el.querySelector("[data-ok]").addEventListener("change", (e) => { r.ok = e.target.checked; el.style.opacity = r.ok ? 1 : 0.45; });
      el.querySelector("[data-q]").addEventListener("input", (e) => { r.q = Number(e.target.value) || 0; });
      const sel = el.querySelector("[data-forn]");
      if (sel) sel.addEventListener("change", async (e) => {
        if (!e.target.value || !r.prodotto_id) { if (!r.prodotto_id) alert("Questo ingrediente non è collegato a un prodotto di magazzino: collegalo nella ricetta."); return; }
        await supabase.from("prodotti").update({ fornitore_preferito_id: Number(e.target.value) }).eq("id", r.prodotto_id);
        daOrdinare(giorni);
      });
    });
    const scelti = (g) => g.righe.filter((r) => r.ok && r.q > 0);
    const testo = (g) => `Ordine ${azienda.nome || ""}\n` + scelti(g).map((r) => `- ${r.nome}: ${num(r.q)} ${r.unita || ""}${r.serve_il ? " (entro " + fd(r.serve_il) + ")" : ""}`).join("\n");
    const registra = async (g, canale) => {
      const { error: e } = await supabase.rpc("registra_ordine_inviato", {
        p_azienda: azienda.id, p_sede: window.state?.sedeAttiva?.id || null, p_fornitore: Number(g.id),
        p_righe: scelti(g).map((r) => ({ prodotto_id: r.prodotto_id, quantita: r.q, um: r.unita || "", note: "per " + (r.per || "") })),
        p_origine: "acquisti", p_canale: canale });
      if (e) console.warn("registra ordine:", e);
    };
    box.querySelectorAll("[data-invia]").forEach((b) => b.addEventListener("click", async () => {
      const g = gruppi[b.dataset.invia];
      if (!scelti(g).length) { alert("Nessun prodotto selezionato."); return; }
      if (!g.email) { alert("Manca l'email ordini di " + g.nome + ": aggiungila in Fornitori, oppure usa WhatsApp o Copia."); return; }
      if (!confirm("Invio l'ordine a " + g.nome + " (" + g.email + ") con " + scelti(g).length + " prodotti?")) return;
      b.disabled = true;
      const res = await supabase.functions.invoke("send-order-email", { body: { email: g.email, fornitore_nome: g.nome, azienda_nome: azienda.nome,
        prodotti: scelti(g).map((r) => ({ nome: r.nome, quantita: r.q, um: r.unita || "" })) } });
      b.disabled = false;
      if (res.error) { alert("Errore invio ordine"); return; }
      await registra(g, "email");
      alert("✓ Ordine inviato a " + g.nome);
    }));
    box.querySelectorAll("[data-wa]").forEach((b) => b.addEventListener("click", () => {
      const g = gruppi[b.dataset.wa];
      if (!scelti(g).length) { alert("Nessun prodotto selezionato."); return; }
      const tel = String(g.tel || "").replace(/\D/g, "");
      registra(g, "WhatsApp");
      window.open("https://wa.me/" + (tel ? (tel.startsWith("39") ? tel : "39" + tel) : "") + "?text=" + encodeURIComponent(testo(g)), "_blank");
    }));
    box.querySelectorAll("[data-copia]").forEach((b) => b.addEventListener("click", async () => {
      const g = gruppi[b.dataset.copia];
      try { await navigator.clipboard.writeText(testo(g)); b.textContent = "✓ Copiato"; } catch (_) { prompt("Copia il testo:", testo(g)); }
    }));
  }

  // ── Tab switching ──
  container.querySelectorAll(".tab-ordini-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".tab-ordini-btn").forEach(b => {
        b.className = "btn-secondary tab-ordini-btn";
      });
      btn.className = "btn-primary tab-ordini-btn active";

      ["tab-ordini-fornitori", "tab-trasferimenti", "tab-storico-trasf", "tab-inviati"].forEach(id => {
        const el = container.querySelector("#" + id);
        if (el) el.style.display = "none";
      });

      // gli id dei pannelli hanno il prefisso "tab-": prima non si trovavano e restava tutto vuoto
      const target = container.querySelector("#tab-" + btn.dataset.tab);
      if (target) target.style.display = "block";

      if (btn.dataset.tab === "storico-trasf") loadStoricoTrasferimenti();
      if (btn.dataset.tab === "inviati") loadOrdiniInviati();
    });
  });

  // ── Ordini inviati ai fornitori ──
  async function loadOrdiniInviati() {
    const el = container.querySelector("#inviati-content");
    if (!el) return;
    const { data, error } = await supabase.from("ordini_fornitore")
      .select("id, numero_ordine, data_ordine, stato, note, inviato_at, origine, fornitori(ragione_sociale), ordini_fornitore_righe(id)")
      .eq("azienda_id", azienda.id).order("data_ordine", { ascending: false }).order("id", { ascending: false }).limit(50);
    if (error) { el.innerHTML = `<div style="color:#b91c1c;font-size:13px;">Errore nel caricamento degli ordini.</div>`; return; }
    if (!data?.length) { el.innerHTML = `<div style="color:#64748b;font-size:13px;">Nessun ordine inviato finora. Da adesso ogni ordine mandato ai fornitori resta qui.</div>`; return; }
    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    el.innerHTML = data.map((o) => `
      <div class="card" data-ordine="${o.id}" style="cursor:pointer;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;gap:8px;">
          <strong>${esc(o.fornitori?.ragione_sociale || "Fornitore")}</strong>
          <span style="font-size:12px;font-weight:700;color:${o.stato === "inviato" ? "#166534" : "#92400e"};">${esc(o.stato || "")}</span>
        </div>
        <div style="font-size:13px;color:#64748b;margin-top:2px;">
          ${esc(o.numero_ordine || "")} · ${o.data_ordine ? new Date(o.data_ordine + "T12:00:00").toLocaleDateString("it-IT") : ""}
          · ${(o.ordini_fornitore_righe || []).length} prodotti${o.note ? " · " + esc(o.note) : ""}
        </div>
      </div>`).join("");
    el.querySelectorAll("[data-ordine]").forEach((c) => c.addEventListener("click", () => {
      window.location.hash = "#/ordine?id=" + c.dataset.ordine;
    }));
  }

  // ── Trasferimenti interni ──
  function addTrasferimentoRiga() {
    const row = document.createElement("div");
    row.className = "card";
    row.style.marginBottom = "8px";
    row.innerHTML = `
      <div class="rf-grid">
        <div>
          <label style="font-size:13px;">Prodotto/Preparazione</label>
          <input class="input input-trasf-prodotto" list="prodotti-list" placeholder="Cerca prodotto..." autocomplete="off">
        </div>
        <div>
          <label style="font-size:13px;">Quantità</label>
          <input class="input qta-trasf" type="number" min="0" step="0.001" value="1">
        </div>
        <div>
          <label style="font-size:13px;">UM</label>
          <select class="input um-trasf">
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="l">l</option>
            <option value="pz">pz</option>
          </select>
        </div>
        <div>
          <label style="font-size:13px;">Costo/unità €</label>
          <input class="input costo-trasf" type="number" min="0" step="0.01" value="0" placeholder="0.00">
        </div>
      </div>
      <button class="btn-secondary" style="margin-top:4px;font-size:12px;" onclick="this.closest('.card').remove()">🗑 Rimuovi</button>
    `;

    const inputProd = row.querySelector(".input-trasf-prodotto");
    const costInput = row.querySelector(".costo-trasf");
    const umInput = row.querySelector(".um-trasf");

    inputProd.addEventListener("input", () => {
      const nome = inputProd.value.toLowerCase();
      const prod = trovaProdotto(prodotti, nome);
      if (prod) {
        costInput.value = Number(prod.costo_medio || 0).toFixed(4);
        umInput.value = prod.unita_base || "kg";
      }
    });

    container.querySelector("#trasf-righe").appendChild(row);
  }

  container.querySelector("#btn-add-trasf-riga")?.addEventListener("click", addTrasferimentoRiga);
  addTrasferimentoRiga(); // Prima riga automatica

  container.querySelector("#btn-conferma-trasferimento")?.addEventListener("click", async () => {
    const feedback = container.querySelector("#trasf-feedback");
    const origineId = container.querySelector("#trasf-origine").value;
    const destId = container.querySelector("#trasf-dest").value;
    const data = container.querySelector("#trasf-data").value;

    if (!origineId || !destId) { feedback.innerHTML = `<span style="color:#dc2626;">Seleziona sede origine e destinazione</span>`; return; }
    if (origineId === destId) { feedback.innerHTML = `<span style="color:#dc2626;">Le sedi devono essere diverse</span>`; return; }
    if (!data) { feedback.innerHTML = `<span style="color:#dc2626;">Inserisci la data</span>`; return; }

    const righe = [];
    container.querySelectorAll("#trasf-righe .card").forEach(row => {
      const nomeProd = row.querySelector(".input-trasf-prodotto").value.trim();
      const qta = parseFloat(row.querySelector(".qta-trasf").value || 0);
      const um = row.querySelector(".um-trasf").value;
      const costo = parseFloat(row.querySelector(".costo-trasf").value || 0);
      if (!nomeProd || qta <= 0) return;
      const prod = trovaProdotto(prodotti, nomeProd);
      righe.push({ nomeProd, prodottoId: prod?.id || null, qta, um, costo });
    });

    if (!righe.length) { feedback.innerHTML = `<span style="color:#dc2626;">Aggiungi almeno un prodotto</span>`; return; }

    feedback.innerHTML = `<span style="color:#64748b;">Salvataggio...</span>`;

    try {
      for (const r of righe) {
        // Inserisce trasferimento
        await supabase.from("trasferimenti_sede").insert({
          azienda_id: azienda.id,
          sede_origine_id: origineId,
          sede_destinazione_id: destId,
          prodotto_id: r.prodottoId,
          descrizione: r.nomeProd,
          quantita: r.qta,
          unita_misura: r.um,
          costo_unitario: r.costo,
          data: data
        });

        // Scarico da sede origine
        if (r.prodottoId) {
          await supabase.from("magazzino_movimenti").insert({
            azienda_id: azienda.id,
            sede_id: origineId,
            prodotto_id: r.prodottoId,
            tipo_movimento: "scarico",
            quantita: r.qta,
            costo: r.costo,
            causale: `Trasferimento a ${sedi.find(s=>s.id===destId)?.nome || destId}`
          });

          // Carico su sede destinazione
          await supabase.from("magazzino_movimenti").insert({
            azienda_id: azienda.id,
            sede_id: destId,
            prodotto_id: r.prodottoId,
            tipo_movimento: "carico",
            quantita: r.qta,
            costo: r.costo,
            causale: `Trasferimento da ${sedi.find(s=>s.id===origineId)?.nome || origineId}`
          });
        }
      }

      feedback.innerHTML = `<span style="color:#16a34a;">✅ Trasferimento registrato — ${righe.length} prodotti</span>`;
      container.querySelector("#trasf-righe").innerHTML = "";
      addTrasferimentoRiga();
    } catch(e) {
      feedback.innerHTML = `<span style="color:#dc2626;">Errore: ${e.message}</span>`;
    }
  });

  async function loadStoricoTrasferimenti() {
    const el = container.querySelector("#storico-trasf-content");
    const { data, error } = await supabase
      .from("trasferimenti_sede")
      .select("*, sedi_origine:sede_origine_id(nome), sedi_dest:sede_destinazione_id(nome)")
      .eq("azienda_id", azienda.id)
      .order("data", { ascending: false })
      .limit(50);

    if (error || !data?.length) {
      el.innerHTML = `<div style="color:#64748b;font-size:13px;">Nessun trasferimento registrato</div>`;
      return;
    }

    el.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f8fafc;">
          <th style="padding:8px;text-align:left;border-bottom:1px solid #e5e7eb;">Data</th>
          <th style="padding:8px;text-align:left;border-bottom:1px solid #e5e7eb;">Da</th>
          <th style="padding:8px;text-align:left;border-bottom:1px solid #e5e7eb;">A</th>
          <th style="padding:8px;text-align:left;border-bottom:1px solid #e5e7eb;">Prodotto</th>
          <th style="padding:8px;text-align:right;border-bottom:1px solid #e5e7eb;">Qtà</th>
          <th style="padding:8px;text-align:right;border-bottom:1px solid #e5e7eb;">Costo</th>
        </tr></thead>
        <tbody>${data.map(t => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px;">${t.data || ""}</td>
            <td style="padding:8px;">${t.sedi_origine?.nome || ""}</td>
            <td style="padding:8px;">${t.sedi_dest?.nome || ""}</td>
            <td style="padding:8px;">${t.descrizione || ""}</td>
            <td style="padding:8px;text-align:right;">${Number(t.quantita).toFixed(2)} ${t.unita_misura || ""}</td>
            <td style="padding:8px;text-align:right;">€${Number(t.costo_totale || 0).toFixed(2)}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

}
