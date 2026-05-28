import { createPageLayout, createCard } from "../utils/pageLayout.js";

let ricetteCache = [];
let categorieCache = [];
let filtroBozza = true;
let filtroInCompletamento = false;
let filtroComplete = false;

export async function render(app) {

  app.innerHTML = createPageLayout({
    title: "📖 Ricettario",
    subtitle: "Centro operativo ricette",
    content: `

      ${createCard({
        title: "Navigazione",
        body: `
          <button class="app-button secondary"
            onclick="window.location.hash='#/produzione'">
            ← Centro Produzione
          </button>

          <button class="app-button"
            onclick="window.location.hash='#/ricette-semplici'">
            🥗 Ricette semplici / Food cost
          </button>

          <button class="app-button secondary"
            onclick="window.location.hash='#/creaRicetta'">
            🏭 Ricetta avanzata / Produzione
          </button>
        `
      })}

      ${createCard({
        title: "Stato Ricettario",
        body: `
          <div id="ric-stats" style="display:flex; gap:12px; flex-wrap:wrap;"></div>
        `
      })}

      ${createCard({
        title: "Filtri",
        body: `
          <div style="display:flex; gap:16px; flex-wrap:wrap;">
            <label>
              <input type="checkbox" id="f-bozza" checked>
              Solo bozze 🔴
            </label>
            <label>
              <input type="checkbox" id="f-incomp">
              In completamento 🟡
            </label>
            <label>
              <input type="checkbox" id="f-complete">
              Complete 🟢
            </label>
          </div>
        `
      })}

      ${createCard({
        title: "Ricerca Ricetta",
        body: `
          <div class="input-wrap">
            <input id="ric-search"
              class="input"
              placeholder="Cerca ricetta o crea prodotto..."
              autocomplete="off" />
            <div id="ric-suggest" class="suggest-list"></div>
          </div>
        `
      })}

      ${createCard({
        title: "Ricette da lavorare",
        body: `
          <div id="ric-list"></div>
        `
      })}

      ${createCard({
        title: "Dettaglio Ricetta",
        body: `
          <div id="ric-viewer"></div>
        `
      })}

    `
  });

  bindFiltri();
  await loadAll();
  renderStats();
  renderRicetteList();
  setupAutocomplete();
}

function bindFiltri() {
  document.getElementById("f-bozza")?.addEventListener("change", e => {
    filtroBozza = e.target.checked;
    renderRicetteList();
  });

  document.getElementById("f-incomp")?.addEventListener("change", e => {
    filtroInCompletamento = e.target.checked;
    renderRicetteList();
  });

  document.getElementById("f-complete")?.addEventListener("change", e => {
    filtroComplete = e.target.checked;
    renderRicetteList();
  });
}

async function loadAll() {
  await Promise.all([
    loadRicette(),
    loadCategorie()
  ]);
}

async function loadRicette() {

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    ricetteCache = [];
    return;
  }

  const sedeId = window.state?.sedeAttiva?.id || null;

  let query = supabase
    .from("ricette")
    .select(`
      id,
      nome,
      stato_strutturale,
      generata_automaticamente,
      origine,
      prodotto_vendita_id,
      ricette_output (
        peso_finale,
        unita_misura
      )
    `)
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Errore caricamento ricette:", error);
    ricetteCache = [];
    return;
  }

  ricetteCache = (data || []).map(r => {
    const out = Array.isArray(r.ricette_output)
      ? r.ricette_output[0]
      : r.ricette_output;

    return {
      id: r.id,
      nome: r.nome || "",
      stato: r.stato_strutturale || "bozza",
      resa: out?.peso_finale ?? null,
      um: out?.unita_misura ?? null,
      generata: !!r.generata_automaticamente,
      origine: r.origine || null,
      prodotto_vendita_id: r.prodotto_vendita_id || null
    };
  });
}

async function loadCategorie() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    categorieCache = [];
    return;
  }

  const { data, error } = await supabase
    .from("categorie_vendita")
    .select("id, nome")
    .eq("azienda_id", aziendaId)
    .order("nome");

  if (error) {
    console.error("Errore caricamento categorie:", error);
    categorieCache = [];
    return;
  }

  categorieCache = data || [];
}

function renderStats() {
  const box = document.getElementById("ric-stats");
  if (!box) return;

  const bozze = ricetteCache.filter(r => r.stato === "bozza").length;
  const inCompletamento = ricetteCache.filter(r => r.stato === "in_completamento").length;
  const complete = ricetteCache.filter(r => r.stato === "completa").length;
  const automatiche = ricetteCache.filter(r => r.generata).length;

  box.innerHTML = `
    <div data-stat="bozza" style="cursor:pointer;padding:10px 12px;border-radius:10px;background:#ffe5e5;">
      🔴 <strong>${bozze}</strong> da completare
    </div>
    <div data-stat="in_completamento" style="cursor:pointer;padding:10px 12px;border-radius:10px;background:#fff6d6;">
      🟡 <strong>${inCompletamento}</strong> in completamento
    </div>
    <div data-stat="completa" style="cursor:pointer;padding:10px 12px;border-radius:10px;background:#e6fffa;">
      🟢 <strong>${complete}</strong> complete
    </div>
    <div style="padding:10px 12px;border-radius:10px;background:#eef2ff;">
      ⚙️ <strong>${automatiche}</strong> generate automaticamente
    </div>
  `;

  bindStatsClick();
}

function bindStatsClick() {
  document.querySelectorAll("#ric-stats [data-stat]").forEach(el => {
    el.addEventListener("click", () => {
      const stato = el.dataset.stat;

      filtroBozza = stato === "bozza";
      filtroInCompletamento = stato === "in_completamento";
      filtroComplete = stato === "completa";

      document.getElementById("f-bozza").checked = filtroBozza;
      document.getElementById("f-incomp").checked = filtroInCompletamento;
      document.getElementById("f-complete").checked = filtroComplete;

      renderRicetteList();
    });
  });
}

function getRicetteFiltrate() {
  let risultati = [...ricetteCache];

  const filtriAttivi = filtroBozza || filtroInCompletamento || filtroComplete;

  if (filtriAttivi) {
    risultati = risultati.filter(r => {
      if (filtroBozza && r.stato === "bozza") return true;
      if (filtroInCompletamento && r.stato === "in_completamento") return true;
      if (filtroComplete && r.stato === "completa") return true;
      return false;
    });
  }

  risultati.sort((a, b) => {
    const peso = {
      bozza: 0,
      in_completamento: 1,
      completa: 2
    };

    const pa = peso[a.stato] ?? 9;
    const pb = peso[b.stato] ?? 9;

    if (pa !== pb) return pa - pb;
    return String(a.nome || "").localeCompare(String(b.nome || ""));
  });

  return risultati;
}

function renderRicetteList() {
  const box = document.getElementById("ric-list");
  if (!box) return;

  const ricette = getRicetteFiltrate();

  if (!ricette.length) {
    box.innerHTML = `
      <div style="font-size:13px;color:#64748b;">
        Nessuna ricetta trovata con i filtri selezionati.
      </div>
    `;
    return;
  }

  box.innerHTML = ricette.slice(0, 50).map(r => {
    const badge = getBadgeStato(r.stato);
    const border = getBorderStato(r.stato);
    const origine = r.generata
      ? `⚙️ ${escapeHtml(r.origine || "generata")}`
      : "Manuale";

    const resaTxt = r.resa != null
      ? `${r.resa} ${escapeHtml(r.um || "")}`
      : "Resa non definita";

    return `
      <div data-ricetta-id="${escapeAttribute(r.id)}" style="
        padding:12px;
        border:1px solid #e5e7eb;
        border-left:5px solid ${border};
        border-radius:12px;
        margin-bottom:10px;
        cursor:pointer;
        background:#fff;
      ">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
          <div>
            <strong>${escapeHtml(r.nome)}</strong>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">
              ${badge} · ${origine} · ${resaTxt}
            </div>
          </div>
          <button class="app-button" type="button" data-edit-ricetta="${escapeAttribute(r.id)}">
            ✏️ Completa
          </button>
        </div>
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-ricetta-id]").forEach(el => {
    el.addEventListener("click", e => {
      if (e.target?.dataset?.editRicetta) return;
      mostraRicetta(el.dataset.ricettaId);
    });
  });

  box.querySelectorAll("[data-edit-ricetta]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      window.location.hash = `#/creaRicetta?id=${btn.dataset.editRicetta}`;
    });
  });
}

function setupAutocomplete() {

  const input = document.getElementById("ric-search");
  const suggest = document.getElementById("ric-suggest");

  input.addEventListener("input", () => {

    const q = (input.value || "").toLowerCase().trim();
    suggest.innerHTML = "";

    if (q.length < 2) {
      suggest.classList.remove("open");
      return;
    }

    let risultati = ricetteCache
     .filter(r => normalize(r.nome).includes(normalize(q)))

    if (filtroBozza)
      risultati = risultati.filter(r => r.stato === "bozza");

    if (filtroInCompletamento)
      risultati = risultati.filter(r => r.stato === "in_completamento");

    if (filtroComplete)
      risultati = risultati.filter(r => r.stato === "completa");

    risultati.sort((a, b) => {
      const an = a.nome.toLowerCase();
      const bn = b.nome.toLowerCase();
      const aStarts = an.startsWith(q) ? 0 : 1;
      const bStarts = bn.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return an.localeCompare(bn);
    });

    risultati = risultati.slice(0, 15);

    risultati.forEach(r => {
      const div = document.createElement("div");
      div.className = "suggest-item";

      const badge = getBadgeStato(r.stato);
      const resaTxt = r.resa != null ? ` — ${r.resa} ${r.um || ""}` : "";
      const generatedTxt = r.generata ? " ⚙️" : "";

      div.textContent = `${r.nome}${resaTxt} ${badge}${generatedTxt}`;

      div.onclick = () => {
        suggest.innerHTML = "";
        suggest.classList.remove("open");
        mostraRicetta(r.id);
      };

      suggest.appendChild(div);
    });

    renderCreateItem(input, suggest);
  });

  document.addEventListener("click", (e) => {
    const wrap = input?.closest(".input-wrap");
    if (!wrap) return;
    if (!wrap.contains(e.target)) {
      suggest.classList.remove("open");
    }
  });
}

function renderCreateItem(input, suggest) {
  const nome = input.value.trim();

  if (!nome) return;

  const esiste = ricetteCache.find(r =>
    normalize(r.nome) === normalize(nome)
  );

  if (esiste) {
    suggest.innerHTML = "";
    suggest.classList.remove("open");
    mostraRicetta(esiste.id);
    return;
  }

  const div = document.createElement("div");
  div.className = "suggest-item create-new";

  div.textContent = `+ Crea prodotto "${nome}"`;

  div.onclick = () => {
    suggest.innerHTML = "";
    suggest.classList.remove("open");
    openQuickModal(nome);
  };

  suggest.appendChild(div);
  suggest.classList.add("open");
}

function openQuickModal(nome) {

  document.querySelectorAll(".modal-overlay").forEach(m => m.remove());

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,0.45)";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.zIndex = "9999";

  modal.innerHTML = `
    <div class="modal-box" style="
      background:#fff;
      padding:20px;
      border-radius:14px;
      width:360px;
      max-width:calc(100vw - 32px);
      box-shadow:0 20px 50px rgba(15,23,42,.25);
    ">

      <h3 style="margin-top:0;">Nuovo prodotto</h3>

      <label>Nome</label>
      <input id="qp-nome" class="input" value="${escapeAttribute(nome)}">

      <label>Categoria</label>
      <select id="qp-categoria" class="input">
        <option value="">Seleziona</option>
        ${categorieCache.map(c => `
          <option value="${escapeAttribute(c.id)}">${escapeHtml(c.nome)}</option>
        `).join("")}
      </select>

      <div style="margin-top:12px;padding:10px;border-radius:10px;background:#f8fafc;font-size:13px;color:#475569;">
        Al salvataggio verrà creata automaticamente una ricetta bozza nel ricettario.
      </div>

      <div style="margin-top:12px; display:flex; gap:8px;">
        <button id="qp-save" class="app-button primary" type="button">Salva</button>
        <button id="qp-close" class="app-button" type="button">Annulla</button>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".modal-box").onclick = e => e.stopPropagation();
  modal.onclick = () => modal.remove();

  modal.querySelector("#qp-close").onclick = () => modal.remove();

  modal.querySelector("#qp-save").onclick = async () => {

    const nomeVal = modal.querySelector("#qp-nome").value.trim();
    const categoriaId = modal.querySelector("#qp-categoria").value;

    if (!nomeVal || !categoriaId) {
      alert("Compila nome e categoria");
      return;
    }

    const supabase = window.supabaseClient;
    const azienda_id = window.state?.azienda?.id;

    if (!azienda_id) {
      alert("Azienda non selezionata.");
      return;
    }

    const { data: prodottoEsistente, error: findProdError } = await supabase
      .from("prodotti_vendita")
      .select("id, ricetta_id")
      .eq("azienda_id", azienda_id)
      .ilike("nome", nomeVal)
      .maybeSingle();

    if (findProdError) {
      console.error("Errore ricerca prodotto:", findProdError);
      alert("Errore durante la verifica del prodotto.");
      return;
    }

    if (prodottoEsistente?.id) {
      const ricettaId = await ensureRicettaMinima({
        prodotto: prodottoEsistente,
        nome: nomeVal,
        azienda_id
      });

      modal.remove();
      await refreshAfterQuickCreate(ricettaId);
      return;
    }

    const { data: prodotto, error } = await supabase
      .from("prodotti_vendita")
      .insert({
        azienda_id,
        nome: nomeVal,
        categoria_vendita_id: categoriaId,
        stato: "bozza",
        alert_food_cost: true,
        attivo: true,
        visibile: true
      })
      .select("id, ricetta_id")
      .single();

    if (error) {
      console.error(error);
      alert("Errore creazione prodotto");
      return;
    }

    const ricettaId = await ensureRicettaMinima({
      prodotto,
      nome: nomeVal,
      azienda_id
    });

    modal.remove();
    await refreshAfterQuickCreate(ricettaId);
  };
}

async function ensureRicettaMinima({ prodotto, nome, azienda_id }) {
  const supabase = window.supabaseClient;

  if (!prodotto?.id || !azienda_id) return null;

  if (prodotto.ricetta_id) {
    return prodotto.ricetta_id;
  }

  const { data: ricettaEsistente, error: findError } = await supabase
    .from("ricette")
    .select("id")
    .eq("azienda_id", azienda_id)
    .eq("prodotto_vendita_id", prodotto.id)
    .maybeSingle();

  if (findError) {
    console.error("Errore ricerca ricetta esistente:", findError);
    return null;
  }

  if (ricettaEsistente?.id) {
    await supabase
      .from("prodotti_vendita")
      .update({
        ricetta_id: ricettaEsistente.id,
        alert_food_cost: true,
        stato: "bozza"
      })
      .eq("id", prodotto.id)
      .eq("azienda_id", azienda_id);

    return ricettaEsistente.id;
  }

  const { data: nuovaRicetta, error: createError } = await supabase
    .from("ricette")
    .insert({
      azienda_id,
      sede_id: window.state?.sedeAttiva?.id || null,
      nome,
      costo_totale: 0,
      costo_porzione: 0,
      stato_strutturale: "bozza",
      generata_automaticamente: true,
      origine: "prodotto",
      prodotto_vendita_id: prodotto.id,
      attivo: true
    })
    .select("id")
    .single();

  if (createError) {
    console.error("Errore creazione ricetta minima:", createError);
    alert("Prodotto creato, ma non è stato possibile creare la ricetta bozza.");
    return null;
  }

  await supabase
    .from("prodotti_vendita")
    .update({
      ricetta_id: nuovaRicetta.id,
      alert_food_cost: true,
      stato: "bozza"
    })
    .eq("id", prodotto.id)
    .eq("azienda_id", azienda_id);

  return nuovaRicetta?.id || null;
}

async function refreshAfterQuickCreate(ricettaId) {
  await loadAll();
  renderStats();
  renderRicetteList();

  if (ricettaId) {
    await mostraRicetta(ricettaId);
  }
}

async function mostraRicetta(id) {

  const supabase = window.supabaseClient;

  const [
    ricettaRes,
    ingredientiRes,
    fasiRes,
    outputRes
  ] = await Promise.all([

    supabase
      .from("ricette")
      .select("*")
      .eq("id", id)
      .single(),

    supabase
      .from("ricetta_ingredienti")
      .select("*")
      .eq("ricetta_id", id),

    supabase
      .from("ricette_preparazione_fasi")
      .select("*")
      .eq("ricetta_id", id)
      .order("ordine"),

    supabase
      .from("ricette_output")
      .select("*")
      .eq("ricetta_id", id)
      .maybeSingle()

  ]);

  if (ricettaRes.error || !ricettaRes.data) {
    console.error("Errore caricamento ricetta:", ricettaRes.error);
    document.getElementById("ric-viewer").innerHTML = `
      <div style="color:#b91c1c;">Errore caricamento ricetta.</div>
    `;
    return;
  }

  const ricetta = ricettaRes.data;
  const ingredienti = ingredientiRes.data || [];
  const fasi = fasiRes.data || [];
  const output = outputRes.data || null;

  const viewer = document.getElementById("ric-viewer");

  const stato = ricetta.stato_strutturale || "bozza";
  const badge = getBadgeStato(stato);
  const border = getBorderStato(stato);

  const bannerStato =
    stato === "bozza"
      ? `<div style="background:#ffe5e5;padding:10px;border-radius:8px;margin-bottom:10px;">
           🔴 Ricetta in bozza – da completare
         </div>`
      : stato === "in_completamento"
      ? `<div style="background:#fff6d6;padding:10px;border-radius:8px;margin-bottom:10px;">
           🟡 Ricetta in completamento
         </div>`
      : `<div style="background:#e6fffa;padding:10px;border-radius:8px;margin-bottom:10px;">
           🟢 Ricetta completa
         </div>`;

  const bannerOrigine = ricetta.generata_automaticamente
    ? `<div style="background:#eef2ff;padding:10px;border-radius:8px;margin-bottom:10px;">
         ⚙️ Ricetta generata automaticamente (${escapeHtml(ricetta.origine || "sistema")})
       </div>`
    : "";

  viewer.innerHTML = `

    <div style="border-left:5px solid ${border}; padding-left:14px;">

      ${bannerStato}
      ${bannerOrigine}

      <h3>${escapeHtml(ricetta.nome)}</h3>

      <div style="font-size:13px;color:#64748b;margin-bottom:12px;">
        Stato: ${badge}
      </div>

      ${ricetta.descrizione ? `
        <div class="page-subtitle" style="margin-bottom:12px;">
          ${escapeHtml(ricetta.descrizione)}
        </div>
      ` : ""}

      ${output ? `
        <div style="margin-bottom:14px;">
          <strong>Output / Resa:</strong><br>
          ${escapeHtml(output.peso_finale ?? "-")} ${escapeHtml(output.unita_misura || "")}
        </div>
      ` : `
        <div style="margin-bottom:14px;color:#b45309;">
          ⚠️ Output / resa non definiti
        </div>
      `}

      ${ricetta.note_procedimento ? `
        <div style="margin-bottom:14px;">
          <strong>Procedimento:</strong><br>
          ${escapeHtml(ricetta.note_procedimento)}
        </div>
      ` : ""}

      <h4>Ingredienti</h4>
      ${
        ingredienti.length
          ? `<ul>
              ${ingredienti.map(i =>
                `<li>${escapeHtml(i.nome_prodotto)} — ${escapeHtml(i.quantita)} ${escapeHtml(i.unita_misura || "")}</li>`
              ).join("")}
            </ul>`
          : `<div style="color:#b45309;">⚠️ Nessun ingrediente inserito</div>`
      }

      ${
        fasi.length ? `
          <h4 style="margin-top:18px;">Fasi</h4>
          <ol>
            ${fasi.map(f =>
              `<li>${escapeHtml(f.nome_fase || f.descrizione || "Fase")}</li>`
            ).join("")}
          </ol>
        ` : `
          <h4 style="margin-top:18px;">Fasi</h4>
          <div style="color:#b45309;">⚠️ Nessuna fase inserita</div>
        `
      }

      <div style="margin-top:18px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="app-button primary"
          onclick="window.location.hash='#/creaRicetta?id=${id}'">
          ✏️ Completa / Modifica
        </button>
      </div>

    </div>
  `;
}

function getBadgeStato(stato) {
  if (stato === "bozza") return "🔴 Bozza";
  if (stato === "in_completamento") return "🟡 In completamento";
  if (stato === "completa") return "🟢 Completa";
  return "🔴 Bozza";
}

function getBorderStato(stato) {
  if (stato === "bozza") return "#ef4444";
  if (stato === "in_completamento") return "#f59e0b";
  if (stato === "completa") return "#10b981";
  return "#ef4444";
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function escapeAttribute(str) {
  return escapeHtml(str);
}
