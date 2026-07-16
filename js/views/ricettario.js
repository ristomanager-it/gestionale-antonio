import { createPageLayout, createCard } from "../utils/pageLayout.js";

let ricetteCache = [];
let categorieCache = [];
let filtroBozza = true;
let filtroInCompletamento = false;
let filtroComplete = false;


// ============================================================
// 🔐 PIN RICETTE — verifica una volta per sessione
// ============================================================

async function richiediPinRicette(container) {
  // Già verificato in questa sessione?
  if (sessionStorage.getItem("pin_ricette_ok") === "true") return true;

  const dipendente = window.state?.dipendente;
  const pinSalvato = dipendente?.pin;

  // Se non ha PIN, accesso libero
  if (!pinSalvato) {
    sessionStorage.setItem("pin_ricette_ok", "true");
    return true;
  }

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      z-index:9999;
    `;
    overlay.innerHTML = `
      <div style="
        background:white;border-radius:16px;padding:28px;
        width:300px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.2);
      ">
        <div style="font-size:32px;margin-bottom:8px;">🔐</div>
        <h3 style="margin:0 0 6px;font-size:17px;">Accesso Ricette</h3>
        <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">
          Inserisci il tuo PIN per continuare
        </p>
        <input
          id="pin-input"
          type="password"
          inputmode="numeric"
          maxlength="6"
          placeholder="••••"
          style="
            width:100%;padding:12px;font-size:22px;letter-spacing:8px;
            text-align:center;border:2px solid #e5e7eb;border-radius:10px;
            outline:none;box-sizing:border-box;margin-bottom:12px;
          "
        />
        <div id="pin-error" style="color:#dc2626;font-size:12px;min-height:16px;margin-bottom:10px;"></div>
        <button id="pin-confirm" style="
          width:100%;padding:12px;background:#0E5A7A;color:white;
          border:none;border-radius:10px;font-size:15px;cursor:pointer;
        ">Conferma</button>
        <button id="pin-cancel" style="
          width:100%;padding:10px;background:transparent;color:#6b7280;
          border:none;font-size:13px;cursor:pointer;margin-top:6px;
        ">Annulla</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#pin-input");
    const errEl = overlay.querySelector("#pin-error");
    input.focus();

    function verify() {
      if (input.value === String(pinSalvato)) {
        sessionStorage.setItem("pin_ricette_ok", "true");
        overlay.remove();
        resolve(true);
      } else {
        errEl.textContent = "PIN errato, riprova";
        input.value = "";
        input.focus();
      }
    }

    overlay.querySelector("#pin-confirm").onclick = verify;
    overlay.querySelector("#pin-cancel").onclick = () => {
      overlay.remove();
      resolve(false);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") verify();
    });
  });
}


export async function render(app) {

  // 🔐 PIN per accesso ricettario
  const pinOk = await richiediPinRicette(app);
  if (!pinOk) {
    window.history.back();
    return;
  }

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
            onclick="window.location.hash='#/crea-ricetta'">
            ➕ Nuova ricetta
          </button>

          <button class="app-button secondary"
            onclick="window.location.hash='#/abbina-articoli'">
            🔗 Abbina articoli cassa
          </button>

          <button class="app-button secondary"
            onclick="window.location.hash='#/menu-engineering'">
            📊 Menu Engineering
          </button>
          <button class="app-button secondary"
            onclick="mostraStoricoModifiche()">
            📋 Storico modifiche
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
      creato_da,
      modificato_da,
      modificato_il,
      created_at,
      creato_da_tony,
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

  // Carica nomi dipendenti per tracciamento
  const userIds = [...new Set(
    (data || []).flatMap(r => [r.creato_da, r.modificato_da].filter(Boolean))
  )];
  let dipendentiMap = {};
  if (userIds.length > 0) {
    const { data: dips } = await supabase
      .from("dipendenti")
      .select("user_id, nome, cognome")
      .in("user_id", userIds)
      .eq("azienda_id", aziendaId);
    (dips || []).forEach(d => {
      dipendentiMap[d.user_id] = [d.nome, d.cognome].filter(Boolean).join(" ");
    });
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
      prodotto_vendita_id: r.prodotto_vendita_id || null,
      creato_da: r.creato_da || null,
      creato_da_nome: r.creato_da ? (dipendentiMap[r.creato_da] || "Sconosciuto") : (r.creato_da_tony ? "🤖 Tony AI" : null),
      modificato_da_nome: r.modificato_da ? (dipendentiMap[r.modificato_da] || "Sconosciuto") : null,
      modificato_il: r.modificato_il || null,
      created_at: r.created_at || null,
      creato_da_tony: !!r.creato_da_tony
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

  const qTestoLista = normalize(document.getElementById("ric-search")?.value || "");
  if (qTestoLista) risultati = risultati.filter(r => normalize(r.nome).includes(qTestoLista));

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
            <div style="font-size:11px;color:#94a3b8;margin-top:3px;">
              ${r.creato_da_nome ? `✍️ ${escapeHtml(r.creato_da_nome)}` : ""}
              ${r.modificato_da_nome ? ` · ✏️ ${escapeHtml(r.modificato_da_nome)} ${r.modificato_il ? "il " + new Date(r.modificato_il).toLocaleDateString("it-IT") : ""}` : ""}
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <button class="app-button" type="button" data-edit-ricetta="${escapeAttribute(r.id)}">
              ✏️ Completa
            </button>
            <button class="app-button secondary" type="button" data-del-ricetta="${escapeAttribute(r.id)}" data-del-nome="${escapeAttribute(r.nome)}" title="Elimina ricetta" style="padding:8px 10px;">
              🗑
            </button>
          </div>
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

  box.querySelectorAll("[data-del-ricetta]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      eliminaRicetta(btn.dataset.delRicetta, btn.dataset.delNome);
    });
  });
}

async function eliminaRicetta(id, nome) {
  if (!id) return;
  const conferma = confirm(`Vuoi eliminare la ricetta "${nome || ""}"?\n\nLa ricetta verrà rimossa dal ricettario. Lo storico collegato (produzione, preventivi) resta intatto.`);
  if (!conferma) return;
  const supabase = window.supabaseClient;
  try {
    const { error } = await supabase
      .from("ricette")
      .update({ attivo: false })
      .eq("id", id);
    if (error) {
      alert("Errore durante l'eliminazione: " + error.message);
      return;
    }
    // rimuovo dalla cache locale e ridisegno
    ricetteCache = ricetteCache.filter(r => String(r.id) !== String(id));
    renderStats();
    renderRicetteList();
  } catch (e) {
    alert("Errore: " + (e?.message || e));
  }
}

function setupAutocomplete() {

  const input = document.getElementById("ric-search");
  const suggest = document.getElementById("ric-suggest");

  input.addEventListener("input", () => {

    const q = (input.value || "").toLowerCase().trim();
    renderRicetteList();
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
      .select("*, prodotti(costo_medio, costo_ultimo, peso_unita_g, unita_base)")
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

    <div style="border-left:5px solid ${border}; padding-left:14px; overflow:hidden; word-break:break-word; max-width:100%; box-sizing:border-box;">

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

      ${(() => {
        const fc = ingredienti.reduce((tot, i) => {
          const costoKg = Number(i.prodotti?.costo_medio || i.prodotti?.costo_ultimo || 0);
          const qta = Number(i.quantita || 0);
          const um = (i.unita_misura || "").toLowerCase();
          const qtaKg = um === "g" || um === "gr" ? qta/1000 :
                        um === "ml" ? qta/1000 :
                        um === "cl" ? qta/100 : qta;
          return tot + (qtaKg * costoKg);
        }, 0);
        return fc > 0 ? `
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;color:#166534;">🍽️ Food cost stimato</span>
            <strong style="color:#166534;font-size:16px;">€${fc.toFixed(2)}</strong>
          </div>` : "";
      })()}

      ${ricetta.note_procedimento ? `
        <div style="margin-bottom:14px;">
          <strong>Procedimento:</strong><br>
          ${escapeHtml(ricetta.note_procedimento)}
        </div>
      ` : ""}

      <h4>Ingredienti</h4>
      ${
        ingredienti.length
          ? `<div style="margin-bottom:8px;">
              ${ingredienti.map(i => {
                // Costo da join prodotti
                const costoKg = Number(i.prodotti?.costo_medio || i.prodotti?.costo_ultimo || 0);
                const qta = Number(i.quantita || 0);
                const um = (i.unita_misura || "").toLowerCase();
                // Converti UM in kg per calcolo food cost
                const qtaKg = um === "g" || um === "gr" ? qta/1000 :
                              um === "ml" ? qta/1000 :
                              um === "cl" ? qta/100 :
                              qta;
                const costoRiga = costoKg > 0 ? (qtaKg * costoKg).toFixed(3) : null;
                return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;flex-wrap:wrap;">
                  <span style="flex:1;min-width:0;word-break:break-word;">${escapeHtml(i.nome_prodotto)} — ${escapeHtml(String(i.quantita))} ${escapeHtml(i.unita_misura || "")}</span>
                  ${costoRiga ? `<span style="color:#0E5A7A;font-weight:600;white-space:nowrap;">€${costoRiga}</span>` : ""}
                </div>`;
              }).join("")}
            </div>`
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
        <button class="app-button primary" id="btn-vai-modifica-ricetta" data-ricetta-id="${id}">
          ✏️ Completa / Modifica
        </button>
      </div>

    </div>
  `;

  // Binding bottone modifica dopo innerHTML
  document.getElementById("btn-vai-modifica-ricetta")?.addEventListener("click", function() {
    const rid = this.dataset.ricettaId;
    if (rid) window.location.hash = `#/crea-ricetta-avanzata?id=${rid}`;
  });
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


// ============================================================
// 📋 STORICO MODIFICHE RICETTE
// ============================================================

async function mostraStoricoModifiche() {
  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id || null;

  // Mostra overlay
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.5);z-index:9999;
    overflow-y:auto;padding:20px;box-sizing:border-box;
  `;
  overlay.innerHTML = `
    <div style="
      max-width:700px;margin:0 auto;background:white;
      border-radius:16px;padding:24px;
    ">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;">📋 Storico modifiche ricette</h3>
        <button id="close-storico" style="
          border:none;background:#f1f5f9;border-radius:8px;
          padding:6px 12px;cursor:pointer;font-size:14px;
        ">✕ Chiudi</button>
      </div>
      <div id="storico-content">
        <div style="text-align:center;color:#64748b;padding:20px;">Caricamento...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#close-storico").onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  // Carica dati
  try {
    let query = supabase
      .from("ricette")
      .select(`
        id, nome, stato_strutturale, created_at,
        creato_da, modificato_da, modificato_il, creato_da_tony
      `)
      .eq("azienda_id", aziendaId)
      .order("modificato_il", { ascending: false, nullsFirst: false });

    if (sedeId) query = query.eq("sede_id", sedeId);

    const { data, error } = await query;
    if (error) throw error;

    // Carica nomi dipendenti
    const userIds = [...new Set(
      (data || []).flatMap(r => [r.creato_da, r.modificato_da].filter(Boolean))
    )];
    let dipMap = {};
    if (userIds.length > 0) {
      const { data: dips } = await supabase
        .from("dipendenti")
        .select("user_id, nome, cognome")
        .in("user_id", userIds)
        .eq("azienda_id", aziendaId);
      (dips || []).forEach(d => {
        dipMap[d.user_id] = [d.nome, d.cognome].filter(Boolean).join(" ");
      });
    }

    const content = document.getElementById("storico-content");
    if (!data?.length) {
      content.innerHTML = `<div style="text-align:center;color:#64748b;padding:20px;">Nessuna ricetta trovata.</div>`;
      return;
    }

    content.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;text-align:left;">
            <th style="padding:10px;border-bottom:1px solid #e5e7eb;">Ricetta</th>
            <th style="padding:10px;border-bottom:1px solid #e5e7eb;">Creata da</th>
            <th style="padding:10px;border-bottom:1px solid #e5e7eb;">Modificata da</th>
            <th style="padding:10px;border-bottom:1px solid #e5e7eb;">Ultima modifica</th>
          </tr>
        </thead>
        <tbody>
          ${(data || []).map(r => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px;">
                <strong>${escapeHtml(r.nome || "")}</strong>
                <div style="font-size:11px;color:#94a3b8;">${getBadgeStato(r.stato_strutturale || "bozza")}</div>
              </td>
              <td style="padding:10px;color:#374151;">
                ${r.creato_da_tony ? "🤖 Tony AI" : (r.creato_da ? escapeHtml(dipMap[r.creato_da] || "Sconosciuto") : "—")}
                ${r.created_at ? `<div style="font-size:11px;color:#94a3b8;">${new Date(r.created_at).toLocaleDateString("it-IT")}</div>` : ""}
              </td>
              <td style="padding:10px;color:#374151;">
                ${r.modificato_da ? escapeHtml(dipMap[r.modificato_da] || "Sconosciuto") : "—"}
              </td>
              <td style="padding:10px;color:#374151;">
                ${r.modificato_il ? new Date(r.modificato_il).toLocaleDateString("it-IT", {day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    document.getElementById("storico-content").innerHTML =
      `<div style="color:#dc2626;">Errore caricamento: ${err.message}</div>`;
  }
}
