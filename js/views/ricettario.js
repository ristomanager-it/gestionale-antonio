import { createPageLayout, createCard } from "../utils/pageLayout.js";

let ricetteCache = [];
let categorieCache = [];
let filtroBozza = true;
let filtroInCompletamento = false;
let filtroComplete = false;
// Market/conserve: e' una dimensione diversa dallo stato, quindi si somma agli
// altri filtri invece di sostituirli. Sono le ricette che finiscono in vendita
// dentro una confezione con una grafica sopra.
let filtroMarket = false;
// Tipo (basi o piatti finiti) e, per i piatti, la categoria di portata
let filtroTipo = "";
let filtroTestate = false;
let filtroPortata = "";

function tipoRicetta(r) {
  return r.tipo === "base" ? "base" : (r.tipo === "market" ? "market" : "piatto");
}

// righe di pallini: Basi / Piatti finiti, e sotto le categorie dei piatti
function disegnaFiltriTipo() {
  const boxT = document.getElementById("ric-tipo");
  const boxP = document.getElementById("ric-porta");
  if (!boxT || !boxP) return;
  if (!document.getElementById("ric-pill-style")) {
    const st = document.createElement("style");
    st.id = "ric-pill-style";
    st.textContent = ".ric-pill{border:0;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:600;background:#EEF2F7;color:#374151;white-space:nowrap;} .ric-pill.on{background:#0E5A7A;color:#fff;} .ric-chips.ric-scorri{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;}";
    document.head.appendChild(st);
  }
  const basi = ricetteCache.filter(r => tipoRicetta(r) === "base").length;
  const piatti = ricetteCache.filter(r => tipoRicetta(r) === "piatto").length;
  const pill = (attr, val, testo, on) => `<button type="button" class="ric-pill ${on ? "on" : ""}" ${attr}="${escapeAttribute(val)}">${testo}</button>`;
  boxT.innerHTML = pill("data-tipo", "", "Tutti i tipi", !filtroTipo)
    + pill("data-tipo", "base", `🍲 Basi ${basi}`, filtroTipo === "base")
    + pill("data-tipo", "piatto", `🍽 Piatti finiti ${piatti}`, filtroTipo === "piatto");

  if (filtroTipo === "piatto") {
    const conta = new Map();
    let senza = 0;
    ricetteCache.filter(r => tipoRicetta(r) === "piatto").forEach(r => {
      if (r.portata) {
        const e = conta.get(r.portata) || { n: 0, o: r.portata_ordine ?? 999 };
        e.n++;
        conta.set(r.portata, e);
      } else senza++;
    });
    const cat = [...conta.entries()].sort((a, b) => a[1].o - b[1].o || a[0].localeCompare(b[0], "it"));
    boxP.style.display = "flex";
    boxP.innerHTML = pill("data-porta", "", "Tutte", !filtroPortata)
      + cat.map(([nome, e]) => pill("data-porta", nome, `${escapeHtml(nome)} ${e.n}`, filtroPortata === nome)).join("")
      + (senza ? pill("data-porta", "__none", `Senza categoria ${senza}`, filtroPortata === "__none") : "");
  } else {
    boxP.style.display = "none";
    boxP.innerHTML = "";
  }

  if (!boxT.dataset.legato) {
    boxT.dataset.legato = "1";
    boxT.addEventListener("click", e => {
      const b = e.target.closest("[data-tipo]");
      if (!b) return;
      filtroTipo = b.dataset.tipo;
      filtroPortata = "";
      disegnaFiltriTipo();
      renderRicetteList();
    });
    boxP.addEventListener("click", e => {
      const b = e.target.closest("[data-porta]");
      if (!b) return;
      filtroPortata = b.dataset.porta;
      disegnaFiltriTipo();
      renderRicetteList();
    });
  }
}
// Il Centro cottura cucina per tutte le sedi: di default vede tutte le ricette dell'azienda
let tutteLeSedi = null;
let nomiSedi = {};
const mostraTutteLeSedi = () => tutteLeSedi ?? /centro cottura/i.test(window.state?.sedeAttiva?.nome || "");


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
    subtitle: "",
    content: `

      <style>
        .ric-top{display:flex;gap:8px;align-items:center;margin:0 0 10px;}
        .ric-top .input-wrap{flex:1;margin:0;}
        .ric-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px;}
        .ric-chip{position:relative;cursor:pointer;}
        .ric-chip input{position:absolute;opacity:0;pointer-events:none;}
        .ric-chip span{display:inline-block;padding:8px 12px;border-radius:999px;background:#EEF2F7;color:#374151;font-size:13px;font-weight:600;}
        .ric-chip input:checked + span{background:#0E5A7A;color:#fff;}
        .ric-altro summary{cursor:pointer;color:#0E5A7A;font-weight:700;font-size:14px;padding:10px 0;}
        .ric-altro .app-button{margin:0 6px 8px 0;}
        .ric-chip.on span{background:#0E5A7A !important;color:#fff !important;}
        #ric-list [data-ricetta-id] > div{flex-direction:column !important;gap:10px !important;}
        #ric-list [data-ricetta-id] > div > div:last-child{justify-content:flex-start !important;}
        #ric-list [data-ricetta-id] .app-button{padding:8px 12px;font-size:13px;}
      </style>

      <div class="ric-top">
        <div class="input-wrap">
          <input id="ric-search"
            class="input"
            placeholder="Cerca una ricetta…"
            autocomplete="off" />
          <div id="ric-suggest" class="suggest-list"></div>
        </div>
        <button class="app-button"
          onclick="window.location.hash='#/crea-ricetta'">
          ➕ Nuova
        </button>
      </div>

      <div class="ric-chips">
        <label class="ric-chip"><input type="checkbox" id="f-bozza" checked><span>🔴 Da completare <b id="cnt-bozza"></b></span></label>
        <label class="ric-chip"><input type="checkbox" id="f-incomp"><span>🟡 In corso <b id="cnt-incomp"></b></span></label>
        <label class="ric-chip"><input type="checkbox" id="f-complete"><span>🟢 Complete <b id="cnt-complete"></b></span></label>
        <label class="ric-chip"><input type="checkbox" id="f-market"><span>🫙 Market</span></label>
        ${window.state?.isSuperadmin === true && !window.state?.viewAs ? '<label class="ric-chip"><input type="checkbox" id="f-testate"><span>✅ Testate</span></label>' : ""}
        <label class="ric-chip"><input type="checkbox" id="f-tutte-sedi" ${mostraTutteLeSedi() ? "checked" : ""}><span>🏢 Tutte le sedi</span></label>
      </div>

      <div id="ric-tipo" class="ric-chips"></div>
      <div id="ric-porta" class="ric-chips ric-scorri" style="display:none;"></div>

      <div id="ric-list"></div>

      <div id="ric-viewer"></div>

      <details class="ric-altro">
        <summary>Altro</summary>
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
      </details>

    `
  });

  bindFiltri();
  await loadAll();
  renderStats();
  renderRicetteList();
  setupAutocomplete();
}

/* Costo di un ingrediente, con la conversione che prima mancava.
   Il calcolo precedente faceva:
       costoKg = costo_medio || costo_ultimo
   e trattava quel numero come euro al chilo. Ma per i prodotti tenuti a
   confezione quello e' il prezzo del SACCO: la farina da 25 kg a 19,92 euro
   diventava 19,92 euro/kg e sei chili facevano 119,50 invece di 4,78.
   La Baguette usciva a 201,76 euro invece di 11,73.
   Ora, se il prodotto e' a pezzi, si divide per il contenuto della confezione
   preso da peso_unita_g oppure da contenuto_confezione. */
function riUmBase(q, um) {
  const u = String(um || "").toLowerCase().replace(/[^a-z]/g, "");
  if (u === "g" || u === "gr" || u === "grammi") return q / 1000;
  if (u === "hg") return q / 10;
  if (u === "ml") return q / 1000;
  if (u === "cl") return q / 100;
  return q;
}
function riPrezzoBase(p) {
  if (!p) return 0;
  const prezzo = Number(p.costo_ultimo) > 0 ? Number(p.costo_ultimo) : Number(p.costo_medio) || 0;
  if (prezzo <= 0) return 0;

  // Conta unita_misura, cioe' come il prodotto e' STOCCATO, non um_costo.
  // Su farina e semola um_costo dice "kg" mentre unita_misura dice "pz": sono
  // sacchi, e dando retta a um_costo il prezzo del sacco (19,93) veniva letto
  // come prezzo al chilo. Sul sale e' il contrario, um_costo dice "pz" ma il
  // prodotto e' a chilo. Quel campo e' compilato male su meta' del magazzino.
  const um = String(p.unita_misura || p.unita_base || "").toLowerCase().replace(/[^a-z]/g, "");

  if (um === "pz" || um === "pezzi") {
    const pesoG = Number(p.peso_unita_g) || 0;
    if (pesoG > 0) return prezzo / (pesoG / 1000);
    const cont = Number(p.contenuto_confezione) || 0;
    if (cont > 0) {
      const base = riUmBase(cont, p.um_confezione);
      if (base > 0) return prezzo / base;
    }
    return 0;   // confezione di contenuto ignoto: non valorizzabile
  }
  if (um === "gr" || um === "g" || um === "ml") return prezzo * 1000;
  return prezzo;   // kg, lt
}
function riCostoRiga(i) {
  const prezzo = riPrezzoBase(i.prodotti);
  if (prezzo <= 0) return 0;
  return riUmBase(Number(i.quantita || 0), i.unita_misura) * prezzo;
}

function bindFiltri() {
  // i pallini dei filtri si colorano quando sono accesi
  const sincChips = () => document.querySelectorAll(".ric-chip").forEach(l => l.classList.toggle("on", !!l.querySelector("input")?.checked));
  document.querySelector(".ric-chips")?.addEventListener("change", sincChips);
  document.getElementById("f-testate")?.addEventListener("change", e => {
    filtroTestate = e.target.checked;
    renderRicetteList();
  });
  sincChips();

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

  document.getElementById("f-market")?.addEventListener("change", e => {
    filtroMarket = e.target.checked;
    renderRicetteList();
  });

  document.getElementById("f-tutte-sedi")?.addEventListener("change", async e => {
    tutteLeSedi = e.target.checked;
    await loadRicette();
    renderStats();
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
      codice,
      tipo_ricetta,
      stato_strutturale,
      generata_automaticamente,
      origine,
      prodotto_vendita_id,
      creato_da,
      modificato_da,
      modificato_il,
      created_at,
      creato_da_tony,
      sede_id,
      ricette_output (
        peso_finale,
        unita_misura
      )
    `)
    .eq("azienda_id", aziendaId)
    .eq("attivo", true)
    .order("nome");

  // la sede attiva vede le sue ricette e quelle senza sede; con "Tutte le sedi" vede tutto
  if (sedeId && !mostraTutteLeSedi()) {
    query = query.or(`sede_id.eq.${sedeId},sede_id.is.null`);
  }

  const [{ data, error }, { data: sediData }] = await Promise.all([
    query,
    supabase.from("sedi").select("id, nome").eq("azienda_id", aziendaId),
  ]);
  nomiSedi = Object.fromEntries((sediData || []).map(s => [s.id, s.nome]));

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
      codice: r.codice || null,
      market: r.tipo_ricetta === "market",
      stato: r.stato_strutturale || "bozza",
      sede_nome: r.sede_id ? (nomiSedi[r.sede_id] || null) : null,
      resa: out?.peso_finale ?? null,
      um: out?.unita_misura ?? null,
      generata: !!r.generata_automaticamente,
      origine: r.origine || null,
      prodotto_vendita_id: r.prodotto_vendita_id || null,
      creato_da: r.creato_da || null,
      creato_da_nome: r.creato_da ? ((dipendentiMap[r.creato_da] || "Sconosciuto") + (r.creato_da_tony ? " 🤖" : "")) : (r.creato_da_tony ? "🤖 Tony AI" : null),
      modificato_da_nome: r.modificato_da ? (dipendentiMap[r.modificato_da] || "Sconosciuto") : null,
      modificato_il: r.modificato_il || null,
      created_at: r.created_at || null,
      creato_da_tony: !!r.creato_da_tony
    };
  });

  // cosa manca a ogni ricetta (i conteggi si fanno sul database)
  try {
    const { data: man } = await supabase.rpc("ricette_mancanze", { p_azienda: aziendaId });
    const perId = new Map((man || []).map(m => [String(m.ricetta_id), m]));
    ricetteCache.forEach(r => {
      const m = perId.get(String(r.id));
      if (!m) return;
      const manca = [];
      // le ricette generate dalla composizione menu non hanno ingredienti e fasi: per loro non conta
      if (!r.generata && m.n_ing === 0) manca.push("ingredienti");
      else if (!r.generata && m.n_fasi === 0) manca.push("fasi");
      if (m.n_scollegati > 0) manca.push(`${m.n_scollegati} ${m.n_scollegati === 1 ? "ingrediente" : "ingredienti"} da collegare`);
      // il prodotto finale non si chiede: i semilavorati lo creano da soli e per i piatti non serve
      r.manca = manca;
      r.tipo = m.tipo || "";
      r.testata = !!m.testata;
      r.portata = m.portata || null;
      r.portata_ordine = m.portata_ordine ?? null;
    });
  } catch (e) { /* senza il dettaglio la lista funziona uguale */ }
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
  // i conteggi stanno dentro i pallini dei filtri
  const conta = (stato) => ricetteCache.filter(r => r.stato === stato).length;
  const metti = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  metti("cnt-bozza", conta("bozza"));
  metti("cnt-incomp", conta("in_completamento"));
  metti("cnt-complete", conta("completa"));
  disegnaFiltriTipo();

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
  const cercando = !!normalize(document.getElementById("ric-search")?.value || "");

  // quando cerchi un nome, la ricerca guarda tutti gli stati (bozze, in completamento, complete)
  if (filtriAttivi && !cercando) {
    risultati = risultati.filter(r => {
      if (filtroBozza && r.stato === "bozza") return true;
      if (filtroInCompletamento && r.stato === "in_completamento") return true;
      if (filtroComplete && r.stato === "completa") return true;
      return false;
    });
  }

  // market restringe: vale insieme allo stato, non al posto suo
  if (filtroMarket) risultati = risultati.filter(r => r.market);

  // solo le ricette che ho provato io
  if (filtroTestate) risultati = risultati.filter(r => r.testata);

  // tipo: basi o piatti finiti; per i piatti anche la categoria
  if (filtroTipo) risultati = risultati.filter(r => tipoRicetta(r) === filtroTipo);
  if (filtroTipo === "piatto" && filtroPortata) {
    risultati = risultati.filter(r => filtroPortata === "__none" ? !r.portata : r.portata === filtroPortata);
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
    // la resa non conta nello stato: si vedra' dalla media delle lavorazioni
    const resaTxt = r.resa != null ? ` · ${r.resa} ${escapeHtml(r.um || "")}` : "";
    const mancaTxt = r.manca && r.manca.length
      ? `<div style="font-size:12px;color:#b91c1c;margin-top:3px;">Manca: ${escapeHtml(r.manca.join(" · "))}</div>`
      : "";

    // una riga semplice: nome, stato e una freccia. Toccando si apre la ricetta, con Completa ed Elimina dentro
    return `
      <div data-ricetta-id="${escapeAttribute(r.id)}" style="
        padding:12px 14px;
        border:1px solid #e5e7eb;
        border-left:5px solid ${border};
        border-radius:12px;
        margin-bottom:8px;
        cursor:pointer;
        background:#fff;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
      ">
        <div style="min-width:0;">
          <div style="font-size:15px;font-weight:600;color:#1F2937;">${escapeHtml(r.nome)}${r.testata && window.state?.isSuperadmin === true && !window.state?.viewAs ? " ✅" : ""}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">
            ${badge}${resaTxt}${mostraTutteLeSedi() && r.sede_nome ? ` · 🏢 ${escapeHtml(r.sede_nome)}` : ""}
          </div>
          ${mancaTxt}
        </div>
        <span style="color:#9CA3AF;font-size:22px;">›</span>
      </div>
    `;
  }).join("");

  box.querySelectorAll("[data-ricetta-id]").forEach(el => {
    el.addEventListener("click", () => apriVediRicetta(el.dataset.ricettaId));
  });
}

// 👁 Vedi ricetta: la stessa lettura di Preparazioni, ingredienti con le grammature dentro ogni fase
async function apriVediRicetta(id) {
  if (!id) return;
  const supabase = window.supabaseClient || window.supabase;
  document.getElementById("ric-vedi-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "ric-vedi-overlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:10000;display:flex;align-items:flex-end;justify-content:center;";
  overlay.innerHTML = `
    <div style="background:#fff;width:100%;max-width:720px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px 16px calc(28px + env(safe-area-inset-bottom, 0px));">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;">
        <div id="ric-vedi-titolo" style="font-size:19px;font-weight:800;">📖 Ricetta</div>
        <button type="button" class="app-button secondary" id="ric-vedi-chiudi">Chiudi</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button type="button" class="app-button" id="ric-vedi-edit">✏️ Completa</button>
        <button type="button" class="app-button secondary" id="ric-vedi-del">🗑 Elimina</button>
        <button type="button" class="app-button secondary" id="ric-vedi-test"></button>
      </div>
      <div id="ric-vedi-corpo" style="color:#64748b;">Caricamento...</div>
    </div>`;
  document.body.appendChild(overlay);
  const chiudi = () => overlay.remove();
  overlay.querySelector("#ric-vedi-chiudi").addEventListener("click", chiudi);
  overlay.querySelector("#ric-vedi-edit").addEventListener("click", () => {
    chiudi();
    window.location.hash = `#/creaRicetta?id=${id}`;
  });
  // segno "Testata": riguarda il pacchetto da vendere, lo vede solo chi gestisce Ristoflow (superadmin)
  const btnTest = overlay.querySelector("#ric-vedi-test");
  if (!(window.state?.isSuperadmin === true && !window.state?.viewAs)) {
    btnTest.remove();
  } else {
    const scrivi = () => {
      const rc = ricetteCache.find(x => String(x.id) === String(id));
      btnTest.textContent = rc?.testata ? "✅ Testata (togli)" : "☑️ Segna come testata";
    };
    scrivi();
    btnTest.addEventListener("click", async () => {
      const rc = ricetteCache.find(x => String(x.id) === String(id));
      const nuova = !rc?.testata;
      const { error } = await supabase.from("ricette").update({
        verificata_il: nuova ? new Date().toISOString() : null,
        verificata_da: nuova ? (window.state?.user?.id || null) : null,
        da_verificare: !nuova
      }).eq("id", id);
      if (error) { alert("Non sono riuscito a salvare. Riprova."); return; }
      if (rc) rc.testata = nuova;
      scrivi();
      renderRicetteList();
    });
  }
  overlay.querySelector("#ric-vedi-del").addEventListener("click", () => {
    const r = ricetteCache.find(x => String(x.id) === String(id));
    chiudi();
    eliminaRicetta(id, r?.nome || "");
  });
  overlay.addEventListener("click", e => { if (e.target === overlay) chiudi(); });

  const [ingRes, fasiRes, ricRes] = await Promise.all([
    supabase.from("ricetta_ingredienti").select("*, prodotti(nome)").eq("ricetta_id", id).order("ordine"),
    supabase.from("ricette_preparazione_fasi").select("*").eq("ricetta_id", id).order("ordine"),
    supabase.from("ricette").select("nome, descrizione, note_procedimento, disegno_url, schizzo_url, foto_url").eq("id", id).maybeSingle()
  ]);
  const corpo = overlay.querySelector("#ric-vedi-corpo");
  const ric = ricRes.data;
  if (!ric) { corpo.textContent = "Ricetta non disponibile."; return; }
  overlay.querySelector("#ric-vedi-titolo").textContent = "📖 " + (ric.nome || "Ricetta");

  const ingredienti = ingRes.data || [];
  const fasi = fasiRes.data || [];
  const nomeIng = i => escapeHtml(i.nome_prodotto || i.prodotti?.nome || i.nome_ingrediente || i.nome || "Ingrediente");
  const qta = i => {
    const n = Number(i.quantita ?? i.qta);
    const q = Number.isFinite(n) ? String(Math.round(n * 1000) / 1000).replace(".", ",") : "";
    return escapeHtml([q, i.unita_misura || i.unita || ""].filter(Boolean).join(" "));
  };
  const riga = i => `<li style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span>${nomeIng(i)}</span><b style="white-space:nowrap;">${qta(i)}</b></li>`;
  const ingFase = fid => ingredienti.filter(i => i.fase_id === fid);
  const senzaFase = ingredienti.filter(i => !i.fase_id || !fasi.some(f => f.id === i.fase_id));
  const meta = f => [
    f.temperatura ? `🌡 ${escapeHtml(f.temperatura)} °C` : "",
    f.durata_min ? `⏱ ${f.durata_min >= 60 ? (Math.round(f.durata_min / 6) / 10).toString().replace(".", ",") + " h" : f.durata_min + " min"}` : "",
    f.giorni_prima ? `📅 ${f.giorni_prima} ${f.giorni_prima === 1 ? "giorno" : "giorni"} prima` : ""
  ].filter(Boolean).join(" · ");
  const foto = ric.foto_url || ric.disegno_url;
  const card = "border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:12px;";

  corpo.style.color = "inherit";
  corpo.innerHTML = `
    ${(foto || ric.schizzo_url) ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
      ${foto ? `<img src="${escapeAttribute(foto)}" alt="" style="flex:1;min-width:180px;max-width:300px;border-radius:10px;">` : ""}
      ${ric.schizzo_url ? `<img src="${escapeAttribute(ric.schizzo_url)}" alt="" style="flex:1;min-width:180px;max-width:300px;border-radius:10px;">` : ""}</div>` : ""}
    ${(ric.descrizione || ric.note_procedimento) ? `<div style="${card}"><b>Note</b>
      ${ric.descrizione ? `<div style="margin-top:6px;">${escapeHtml(ric.descrizione)}</div>` : ""}
      ${ric.note_procedimento ? `<div style="margin-top:8px;">${escapeHtml(ric.note_procedimento)}</div>` : ""}</div>` : ""}
    ${senzaFase.length ? `<div style="${card}"><b style="font-size:15px;">Ingredienti</b>
      <ul style="margin:8px 0 0;padding:0;list-style:none;">${senzaFase.map(riga).join("")}</ul></div>` : ""}
    ${fasi.length ? fasi.map(f => {
      const ii = ingFase(f.id);
      return `<div style="${card}">
        <div style="font-weight:800;font-size:18px;">${escapeHtml(f.ordine ?? "")}. ${escapeHtml(f.nome_fase || "Fase")}</div>
        ${meta(f) ? `<div style="color:#64748b;font-size:15px;margin-top:3px;">${meta(f)}</div>` : ""}
        ${ii.length ? `<ul style="margin:10px 0 0;padding:10px 12px;list-style:none;background:#f8fafc;border-radius:10px;">${ii.map(riga).join("")}</ul>` : ""}
        ${f.descrizione_operativa ? `<div style="margin-top:10px;font-size:17px;line-height:1.5;">${escapeHtml(f.descrizione_operativa)}</div>` : ""}
      </div>`;
    }).join("") : (senzaFase.length ? "" : `<div style="color:#64748b;">Nessuna fase né ingrediente disponibile.</div>`)}`;
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
    outputRes,
    formatiRes
  ] = await Promise.all([

    supabase
      .from("ricette")
      .select("*")
      .eq("id", id)
      .single(),

    supabase
      .from("ricetta_ingredienti")
      .select("*, prodotti(costo_medio, costo_ultimo, peso_unita_g, unita_base, unita_misura, um_costo, contenuto_confezione, um_confezione)")
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
      .maybeSingle(),

    supabase
      .from("ricette_porzione")
      .select("id, label, peso_porzione, unita_misura, attivo, grafica_url, grafica_path, tipo_porzione, pezzi_per_stampo, pezzi_per_porzione")
      .eq("ricetta_id", id)
      .order("peso_porzione")

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
  const formati = (formatiRes?.data || []).filter(f => f.attivo !== false);

  // La grafica di rappresentanza riguarda solo i prodotti finiti. I semilavorati
  // restano in casa e portano la sola etichetta di lotto stampata dal registro.
  let semilavorato = false;
  if (ricetta.tipo_ricetta === "market" && ricetta.prodotto_output_id) {
    const { data: po } = await supabase
      .from("prodotti")
      .select("tipo_prodotto")
      .eq("id", ricetta.prodotto_output_id)
      .maybeSingle();
    semilavorato = po?.tipo_prodotto === "semilavorato";
  }
  const mostraGrafica = ricetta.tipo_ricetta === "market" && !semilavorato && formati.length > 0;

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
        const fc = ingredienti.reduce((tot, i) => tot + riCostoRiga(i), 0);
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
                const cr = riCostoRiga(i);
                const costoRiga = cr > 0 ? cr.toFixed(3) : null;
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

      ${mostraGrafica ? `
        <h4 style="margin-top:22px;">🎨 Grafica etichetta (fronte)</h4>
        <div style="font-size:12px;color:#64748b;margin-bottom:10px;">
          Una grafica per formato. Il retro con ingredienti, allergeni, lotto e QR
          resta quello generato dal registro lotti a 60 × 40 mm.
        </div>
        ${formati.map(f => `
          <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div style="width:96px;height:120px;border:1px dashed #cbd5e1;border-radius:8px;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
              ${f.grafica_url
                ? `<img src="${escapeAttribute(f.grafica_url)}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;">`
                : `<span style="font-size:11px;color:#94a3b8;text-align:center;padding:6px;">nessuna<br>grafica</span>`}
            </div>
            <div style="flex:1;min-width:180px;">
              <div style="font-weight:700;font-size:14px;">${escapeHtml(f.label || "Formato")}</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:8px;">
                ${f.tipo_porzione === "pezzi" && f.pezzi_per_stampo ? escapeHtml(f.pezzi_per_stampo + " pz a teglia" + (Number(f.pezzi_per_porzione) > 0 && Number(f.pezzi_per_porzione) !== 1 ? " · " + f.pezzi_per_porzione + " pz a porzione" : "") + (f.unita_misura !== "pz" ? " · " + f.peso_porzione + " " + f.unita_misura : "")) : escapeHtml(String(f.peso_porzione ?? "") + " " + (f.unita_misura || ""))}
              </div>
              <input type="file" class="gr-file" data-porzione="${f.id}"
                     accept="image/png,image/jpeg,image/webp,application/pdf"
                     style="font-size:12px;max-width:100%;">
              <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
                <button class="app-button small gr-carica" data-porzione="${f.id}">Carica</button>
                ${f.grafica_url ? `
                  <a class="app-button small gray" href="${escapeAttribute(f.grafica_url)}" target="_blank" rel="noopener">Apri</a>
                  <button class="app-button small gray gr-rimuovi" data-porzione="${f.id}"
                          data-path="${escapeAttribute(f.grafica_path || "")}">Rimuovi</button>` : ""}
              </div>
              <div class="gr-esito" data-porzione="${f.id}" style="font-size:12px;margin-top:6px;"></div>
            </div>
          </div>
        `).join("")}
      ` : ""}

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

  if (mostraGrafica) bindGrafica(id, ricetta);
}

// ============================================================
// 🎨 GRAFICA ETICHETTA — fronte confezione, una per formato
// Il bucket media-aziende non ha una policy di UPDATE: quindi mai upsert,
// si carica sempre un file nuovo e si cancella il vecchio dopo.
// ============================================================

function bindGrafica(ricettaId, ricetta) {
  const supabase = window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id;
  const viewer = document.getElementById("ric-viewer");
  if (!viewer || !aziendaId) return;

  const esito = (pid, testo, colore) => {
    const el = viewer.querySelector(`.gr-esito[data-porzione="${pid}"]`);
    if (el) el.innerHTML = `<span style="color:${colore};">${escapeHtml(testo)}</span>`;
  };

  viewer.querySelectorAll(".gr-carica").forEach(btn => {
    btn.addEventListener("click", async () => {
      const pid = btn.dataset.porzione;
      const input = viewer.querySelector(`.gr-file[data-porzione="${pid}"]`);
      const file = input?.files?.[0];
      if (!file) { esito(pid, "Scegli prima un file.", "#b45309"); return; }
      if (file.size > 5 * 1024 * 1024) { esito(pid, "File troppo grande: massimo 5 MB.", "#b91c1c"); return; }

      btn.disabled = true;
      esito(pid, "Carico…", "#64748b");

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const codice = ricetta.codice || `ric${ricettaId}`;
      const path = `etichette/${aziendaId}/${codice}/${pid}-${Date.now()}.${ext}`;

      const { error: errUp } = await supabase.storage
        .from("media-aziende")
        .upload(path, file, { contentType: file.type || undefined });

      if (errUp) { btn.disabled = false; esito(pid, "Errore caricamento: " + errUp.message, "#b91c1c"); return; }

      const { data: pub } = supabase.storage.from("media-aziende").getPublicUrl(path);
      const url = pub?.publicUrl || null;

      // il vecchio file si cancella solo dopo che il nuovo e' salvato in tabella
      const { data: prima } = await supabase
        .from("ricette_porzione").select("grafica_path").eq("id", pid).maybeSingle();

      const { error: errDb } = await supabase
        .from("ricette_porzione")
        .update({ grafica_url: url, grafica_path: path })
        .eq("id", pid);

      if (errDb) { btn.disabled = false; esito(pid, "Errore salvataggio: " + errDb.message, "#b91c1c"); return; }

      if (prima?.grafica_path && prima.grafica_path !== path) {
        await supabase.storage.from("media-aziende").remove([prima.grafica_path]);
      }

      esito(pid, "Grafica caricata.", "#166534");
      await mostraRicetta(ricettaId);
    });
  });

  viewer.querySelectorAll(".gr-rimuovi").forEach(btn => {
    btn.addEventListener("click", async () => {
      const pid = btn.dataset.porzione;
      if (!confirm("Rimuovere la grafica di questo formato?")) return;
      btn.disabled = true;

      const { error } = await supabase
        .from("ricette_porzione")
        .update({ grafica_url: null, grafica_path: null })
        .eq("id", pid);

      if (error) { btn.disabled = false; esito(pid, "Errore: " + error.message, "#b91c1c"); return; }

      if (btn.dataset.path) {
        await supabase.storage.from("media-aziende").remove([btn.dataset.path]);
      }
      await mostraRicetta(ricettaId);
    });
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
                ${r.creato_da ? (escapeHtml(dipMap[r.creato_da] || "Sconosciuto") + (r.creato_da_tony ? " 🤖" : "")) : (r.creato_da_tony ? "🤖 Tony AI" : "—")}
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
