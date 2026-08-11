// js/views/comanda.js — Comanda al tavolo, aperta dalla Mappa Sala
//
// Questa schermata prima leggeva la tabella "prodotti", cioe' il magazzino:
// in comanda comparivano gli articoli delle fatture d'acquisto (stampanti,
// affitti, materiale di consumo). E scriveva le righe in "comande_righe",
// una tabella morta, mentre cucina e cassa leggono "comanda_righe" al
// singolare: le comande prese da qui non arrivavano mai in cucina.
// Ora legge i prodotti di vendita e scrive dove leggono gli altri.

export async function render(container) {

  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const tavoloId = params.get("tavolo");

  const supa = () => window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;

  let comanda = null;
  let righe = [];
  let prodotti = [];
  let categorie = [];
  let categoriaAttiva = null;   // null = tutte
  let cerca = "";

  container.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h1>🍽️ Comanda</h1>
        <div id="comanda-tavolo" style="color:#64748b;font-size:14px;"></div>
      </div>

      <div class="card">
        <input id="comanda-cerca" placeholder="Cerca portata…"
          style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid #d1d5db;border-radius:12px;font-size:15px;margin-bottom:10px;">
        <div id="comanda-categorie" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:10px;"></div>
        <div id="prodotti" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;"></div>
      </div>

      <div class="card">
        <h3>🧾 Ordine</h3>
        <div id="righe"></div>
        <div id="totale" style="margin-top:10px;"></div>
        <button class="app-button" id="chiudi" style="margin-top:12px;">Chiudi Conto</button>
      </div>
    </div>
  `;

  if (!tavoloId) {
    container.querySelector("#prodotti").innerHTML =
      `<div style="color:#64748b;">Apri la comanda da un tavolo della Mappa Sala.</div>`;
    return;
  }

  await init();

  async function init() {
    try {
      const { data: tav } = await supa()
        .from("tavoli").select("nome, numero").eq("id", tavoloId).maybeSingle();
      const et = container.querySelector("#comanda-tavolo");
      if (et && tav) et.textContent = "Tavolo " + (tav.nome || tav.numero || "");
    } catch (e) { /* il nome del tavolo e' un di piu', non blocca la comanda */ }

    const { data } = await supa()
      .from("comande")
      .select("*")
      .eq("tavolo_id", tavoloId)
      .in("stato", ["aperta", "in_corso"])
      .maybeSingle();

    if (data) {
      comanda = data;
    } else {
      const { data: nuova, error } = await supa()
        .from("comande")
        .insert([{ azienda_id: aziendaId, sede_id: sedeId, tavolo_id: tavoloId }])
        .select()
        .single();
      if (error) {
        container.querySelector("#prodotti").innerHTML =
          `<div style="color:#dc2626;">Non riesco ad aprire la comanda per questo tavolo.</div>`;
        return;
      }
      comanda = nuova;
    }

    await loadProdotti();
    await loadRighe();
  }

  async function loadProdotti() {
    const [pRes, cRes] = await Promise.all([
      supa().from("prodotti_vendita")
        .select("id, nome, prezzo_base, categoria_vendita_id")
        .eq("azienda_id", aziendaId)
        .eq("attivo", true)
        .order("nome"),
      supa().from("categorie_vendita")
        .select("id, nome")
        .eq("azienda_id", aziendaId)
        .order("nome"),
    ]);
    prodotti = pRes.data || [];
    categorie = cRes.data || [];
    renderCategorie();
    renderProdotti();

    const inp = container.querySelector("#comanda-cerca");
    if (inp) inp.oninput = () => { cerca = inp.value.toLowerCase(); renderProdotti(); };
  }

  function renderCategorie() {
    const box = container.querySelector("#comanda-categorie");
    const bottone = (id, label) => {
      const attiva = String(categoriaAttiva) === String(id);
      return '<button data-cat="' + (id === null ? "" : escapeHtml(String(id))) + '"' +
        ' style="flex-shrink:0;padding:8px 14px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;' +
        'background:' + (attiva ? "#0E5A7A" : "#eef2f7") + ';color:' + (attiva ? "white" : "#334155") + ';">' +
        escapeHtml(label) + '</button>';
    };
    box.innerHTML = bottone(null, "Tutte") + categorie.map(c => bottone(c.id, c.nome)).join("");
    box.querySelectorAll("[data-cat]").forEach(b => {
      b.onclick = () => {
        categoriaAttiva = b.dataset.cat === "" ? null : b.dataset.cat;
        renderCategorie();
        renderProdotti();
      };
    });
  }

  function renderProdotti() {
    const box = container.querySelector("#prodotti");
    const lista = prodotti.filter(p => {
      if (categoriaAttiva && String(p.categoria_vendita_id) !== String(categoriaAttiva)) return false;
      if (cerca && !String(p.nome || "").toLowerCase().includes(cerca)) return false;
      return true;
    });

    if (!lista.length) {
      box.innerHTML = `<div style="color:#94a3b8;grid-column:1/-1;padding:20px;text-align:center;">Nessuna portata trovata.</div>`;
      return;
    }

    box.innerHTML = lista.map(p => `
      <button class="prodotto" data-id="${escapeHtml(String(p.id))}"
        style="text-align:left;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:10px;cursor:pointer;">
        <div style="font-weight:600;font-size:14px;color:#0f172a;">${escapeHtml(p.nome || "")}</div>
        <div style="color:#0E5A7A;font-weight:700;font-size:14px;margin-top:4px;">€ ${Number(p.prezzo_base || 0).toFixed(2)}</div>
      </button>
    `).join("");

    box.querySelectorAll(".prodotto").forEach(el => {
      el.onclick = () => aggiungiProdotto(el.dataset.id);
    });
  }

  async function aggiungiProdotto(id) {
    const p = prodotti.find(x => String(x.id) === String(id));
    if (!p) return;

    // Il prezzo si congela qui: se domani cambia il listino, il conto di
    // stasera resta quello battuto stasera.
    const { error } = await supa()
      .from("comanda_righe")
      .insert([{
        azienda_id: aziendaId,
        comanda_id: comanda.id,
        prodotto_vendita_id: p.id,
        nome_snapshot: p.nome,
        prezzo_snapshot: Number(p.prezzo_base || 0),
        quantita: 1
      }]);

    if (error) { alert("Non sono riuscito ad aggiungere la portata."); return; }
    await loadRighe();
  }

  async function loadRighe() {
    const { data } = await supa()
      .from("comanda_righe")
      .select("*")
      .eq("comanda_id", comanda.id)
      .order("created_at");
    righe = data || [];
    renderRighe();
  }

  function renderRighe() {
    const box = container.querySelector("#righe");

    if (!righe.length) {
      box.innerHTML = `<div style="color:#94a3b8;font-size:14px;padding:12px 0;">Nessuna portata. Tocca un prodotto per aggiungerlo.</div>`;
      container.querySelector("#totale").innerHTML = "";
      return;
    }

    box.innerHTML = righe.map(r => {
      const tot = Number(r.prezzo_snapshot || 0) * Number(r.quantita || 1);
      return `
        <div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <span>${escapeHtml(r.nome_snapshot || "")} ×${Number(r.quantita || 1)}</span>
          <span style="font-weight:600;white-space:nowrap;">€ ${tot.toFixed(2)}</span>
        </div>`;
    }).join("");

    const totale = righe.reduce((acc, r) =>
      acc + Number(r.prezzo_snapshot || 0) * Number(r.quantita || 1), 0);

    container.querySelector("#totale").innerHTML =
      `<strong>Totale: € ${totale.toFixed(2)}</strong>`;
  }

  container.querySelector("#chiudi").onclick = async () => {
    if (!comanda) return;
    await supa().from("comande").update({ stato: "chiusa" }).eq("id", comanda.id);
    window.location.hash = "#/sala";
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
