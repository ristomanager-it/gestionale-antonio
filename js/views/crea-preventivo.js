// js/views/crea-preventivo.js
// LA SCHEDA PREVENTIVO. Una domanda sola: "questo evento mi conviene?"
// In alto quattro numeri, sotto il menu dove ogni portata porta il suo margine.
// La wedding planner apre la stessa pagina, ma i costi non le vengono nemmeno
// caricati: non sono nascosti a schermo, non arrivano proprio.
// La versione precedente resta in crea-preventivo-vecchio.js.

const EF_STIMA = "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/stima-piatto";

let P = null;            // il preventivo in lavorazione
let righe = [];          // portate
let extra = [];          // servizi
let ricette = [];        // catalogo per l'aggancio dei costi
let stime = {};          // nome normalizzato -> stima di Tony
let locations = [];
let listinoServizi = [];
let sezioniNote = [];    // le sezioni gia' usate: diventano una tendina
let sezioniInfo = [];    // nome -> categoria di piatti e se va a parte nel documento
let modelli = [];        // schemi di menu predefiniti per tipo evento e formula
let richieste = [];
let vedoICosti = true;   // falso per le agenzie
let personale = null;    // quanti camerieri servono e quanto costano
let apertoDettaglio = null;  // riga di cui si stanno guardando i conti di Tony
let foto = [];           // immagini del preventivo: le nostre e quelle degli sposi

const TIPI_EVENTO = ["Matrimonio", "Nozze d'oro", "Nozze d'argento", "Battesimo", "Comunione",
  "Cresima", "Compleanno", "Laurea", "Anniversario", "Cena aziendale", "Buffet", "Altro"];

// matrimoni e anniversari hanno due intestatari
function dueNomi() {
  return ["Matrimonio", "Nozze d'oro", "Nozze d'argento", "Anniversario"].includes(P.titolo_evento);
}

export async function render(container, params = {}) {
  const supabase = window.supabaseClient || window.supabase;
  const azienda = window.state?.azienda;
  const sede = window.state?.sedeAttiva;
  if (!azienda?.id) {
    container.innerHTML = `<section class="view"><h3>Nessuna azienda attiva</h3></section>`;
    return;
  }

  const ruolo = String(window.state?.viewAs || window.state?.ruolo || "").toLowerCase();
  vedoICosti = !["agenzia", "partner", "planner"].includes(ruolo);

  const id = params.id || new URLSearchParams((location.hash.split("?")[1] || "")).get("id");

  container.innerHTML = `<div class="pv2"><div class="pv2-caric">Un attimo…</div></div>${stile()}`;

  const [ric, loc, serv, sez, mod] = await Promise.all([
    supabase.from("ricette").select("id, nome, costo_porzione, costo_materia_prima, porzioni, categoria_portata_id").eq("azienda_id", azienda.id).limit(3000),
    supabase.from("location_ricevimenti").select("id, nome, capienza_min, capienza_max, prezzo_affitto_base")
      .eq("azienda_id", azienda.id).eq("attiva", true).order("nome"),
    supabase.from("servizi_evento").select("*").eq("azienda_id", azienda.id).eq("attivo", true).order("categoria"),
    supabase.from("sezioni_menu").select("nome, ordine, usata_volte, categoria_portata_id, separata, per_bambini").eq("azienda_id", azienda.id)
      .eq("attiva", true).order("ordine").order("usata_volte", { ascending: false }),
    supabase.from("modelli_menu").select("*").eq("azienda_id", azienda.id).eq("attivo", true),
  ]);
  ricette = ric.data || [];
  locations = loc.data || [];
  listinoServizi = serv.data || [];
  sezioniInfo = sez.data || [];
  modelli = mod.data || [];
  sezioniNote = sezioniInfo.map(x => x.nome);

  if (id) await caricaPreventivo(supabase, id);
  else nuovo(azienda, sede);

  await calcolaPersonale(supabase, azienda);
  disegna(container, supabase, azienda, sede);
}

/* ── caricamento ─────────────────────────────────────────────────────── */

function nuovo(azienda, sede) {
  P = {
    id: null, azienda_id: azienda.id, sede_uuid: sede?.id || null,
    stato: "trattativa", titolo_evento: "", tipo_servizio: "",
    cliente_nome: "", cliente_cognome: "", cliente_email: "", cliente_telefono: "",
    nome_festeggiato: "", intolleranze: "", note: "",
    data_evento: "", ora_evento: "", n_invitati: 50, n_bambini: 0,
    location: "", location_id: null, location_prezzo: 0,
    sconto_perc: 0, sconto_euro: 0, acconto: 0, giorni_validita: 15,
    formula_servizio: "servito",
  };
  righe = []; extra = []; richieste = []; stime = {}; foto = [];
}

async function caricaPreventivo(supabase, id) {
  const [p, r, e, q, f] = await Promise.all([
    supabase.from("preventivi").select("*").eq("id", id).maybeSingle(),
    supabase.from("preventivi_righe").select("*").eq("preventivo_id", id).order("id"),
    supabase.from("preventivi_extra").select("*").eq("preventivo_id", id).order("id"),
    supabase.from("preventivi_richieste").select("*").eq("preventivo_id", id).order("creata_il", { ascending: false }),
    supabase.from("preventivi_allegati").select("*").eq("preventivo_id", id).order("ordine"),
  ]);
  P = p.data || null;
  righe = (r.data || []).map(x => ({
    nome: x.nome_portata, ricetta_id: x.ricetta_id, sezione: x.sezione_menu || "Menu",
    prezzo: Number(x.prezzo_unitario) || 0, costoSalvato: Number(x.food_cost_snapshot) || 0,
  }));
  // le stime tornano com'erano: numero E ragionamento
  (r.data || []).forEach(x => {
    if (x.stima_dettaglio) stime[norm(x.nome_portata)] = x.stima_dettaglio;
  });
  extra = (e.data || []).map(x => ({ descrizione: x.descrizione, prezzo: Number(x.prezzo_totale) || 0, costo: Number(x.costo_totale) || 0 }));
  richieste = q.data || [];
  foto = f.data || [];
}

async function calcolaPersonale(supabase, azienda) {
  try {
    const { data } = await supabase.rpc("personale_evento", {
      p_azienda: azienda.id, p_tipo: P.titolo_evento || "Altro",
      p_invitati: Math.max(Number(P.n_invitati) || 1, 1),
      p_bambini: Math.max(Number(P.n_bambini) || 0, 0),
    });
    personale = data?.ok ? data : null;
  } catch (e) { personale = null; }
}

/* ── conti ───────────────────────────────────────────────────────────── */

function costoDi(r) {
  if (r.ricetta_id) {
    const ric = ricette.find(x => String(x.id) === String(r.ricetta_id));
    if (ric) {
      // il campo costo_porzione e' vuoto su quasi tutte le ricette:
      // si ripiega sul costo materia prima diviso le porzioni
      const cp = Number(ric.costo_porzione) || 0;
      if (cp > 0) return { costo: cp, stimato: false, fonte: "ricetta" };
      const mp = Number(ric.costo_materia_prima) || 0;
      const por = Math.max(Number(ric.porzioni) || 0, 0);
      if (mp > 0 && por > 0) return { costo: mp / por, stimato: false, fonte: "ricetta" };
      // costo della resa senza sapere quante porzioni fa: non e' un costo a
      // porzione, quindi si lascia stimare a Tony invece di mostrarlo sbagliato
      if (mp > 0) return { costo: 0, mancante: true, resaSenzaPorzioni: true };
    }
  }
  const s = stime[norm(r.nome)];
  if (s) return { costo: Number(s.food_cost) || 0, stimato: true };
  if (Number(r.costoSalvato) > 0) return { costo: Number(r.costoSalvato), stimato: true };
  return { costo: 0, stimato: false, mancante: true };
}

// I servizi a conteggio (baby sitter, hostess) sanno da soli quanti ne servono
function quantitaServizio(s) {
  const inv = Math.max(Number(P.n_invitati) || 0, 0);
  const bimbi = Math.max(Number(P.n_bambini) || 0, 0);
  if (s.conta_su === "bambini") return bimbi === 0 ? 0 : Math.max(Math.ceil(bimbi / (s.ogni || 1)), s.minimo || 1);
  if (s.conta_su === "ospiti") return Math.max(Math.ceil(inv / (s.ogni || 1)), s.minimo || 1);
  return 1;
}

// Lo schema pronto per questo tipo di evento e questa formula.
// Si propone solo se il menu e' ancora vuoto: non si sovrascrive il lavoro fatto.
function schemaProposto() {
  if (righe.some(r => r.nome)) return null;
  if (!P.titolo_evento) return null;
  const f = P.formula_servizio === "buffet" ? "buffet" : "servito";
  const m = modelli.find(x => norm(x.tipo_evento) === norm(P.titolo_evento) && x.formula === f)
        || modelli.find(x => norm(x.tipo_evento) === "altro" && x.formula === f);
  if (!m) return null;
  const sez = Array.isArray(m.sezioni) ? m.sezioni : [];
  return sez.length ? [...sez].sort((a, b) => (a.ordine || 0) - (b.ordine || 0)) : null;
}

// Le sezioni che non stanno nello schema base ma capita spesso che le chiedano:
// un battesimo non ha l'aperitivo di serie, ma se lo chiedono deve bastare un tocco.
function modelloAttivo() {
  const f = P.formula_servizio === "buffet" ? "buffet" : "servito";
  return modelli.find(x => norm(x.tipo_evento) === norm(P.titolo_evento || "") && x.formula === f)
      || modelli.find(x => norm(x.tipo_evento) === "altro" && x.formula === f) || null;
}

function sezioniConsigliate() {
  if (!P.titolo_evento) return [];
  const extra = Array.isArray(modelloAttivo()?.sezioni_extra) ? modelloAttivo().sezioni_extra : [];
  const gia = new Set(righe.map(r => norm(r.sezione)));
  return extra.filter(x => !gia.has(norm(x.nome)));
}

function perBambini(sez) {
  return Boolean(sezioniInfo.find(x => norm(x.nome) === norm(sez))?.per_bambini);
}

function conti() {
  const inv = Math.max(Number(P.n_invitati) || 1, 1);
  let menu = 0, costoMenu = 0, stimati = 0, senzaCosto = 0;

  const bimbi = Math.max(Number(P.n_bambini) || 0, 0);
  let menuAdulti = 0, menuBimbi = 0;
  righe.forEach(r => {
    if (!r.nome) return;
    const perB = perBambini(r.sezione);
    // gli adulti sono gli invitati meno i bambini: nessuno paga due volte
    const quanti = perB ? bimbi : Math.max(inv - bimbi, 0);
    const riga = (Number(r.prezzo) || 0) * quanti;
    menu += riga;
    if (perB) menuBimbi += riga; else menuAdulti += riga;
    const c = costoDi(r);
    costoMenu += c.costo * quanti;
    if (c.stimato) stimati++;
    if (c.mancante) senzaCosto++;
  });

  const costoPersonale = Number(personale?.costo) || 0;
  const serviziTot = extra.reduce((s, x) => s + (Number(x.prezzo) || 0), 0);
  const costoServizi = extra.reduce((s, x) => s + (Number(x.costo) || 0), 0);
  const location = Number(P.location_prezzo) || 0;
  const lordo = menu + serviziTot + location;
  const scontoE = (Number(P.sconto_euro) || 0) + lordo * (Number(P.sconto_perc) || 0) / 100;
  const totale = Math.max(lordo - scontoE, 0);
  const costoTotale = costoMenu + costoPersonale + costoServizi;
  const margine = totale - costoTotale;

  return {
    inv, bimbi, menu, menuAdulti, menuBimbi, serviziTot, costoServizi, location, totale,
    costoMenu, costoPersonale, costoTotale, margine,
    marginePerc: totale > 0 ? (margine / totale) * 100 : 0,
    aPersona: totale / inv, costoPersona: costoTotale / inv,
    stimati, senzaCosto, acconto: Number(P.acconto) || 0,
  };
}

/* ── schermo ─────────────────────────────────────────────────────────── */

function disegna(container, supabase, azienda, sede) {
  const c = conti();
  const sezioni = [...new Set(righe.map(r => r.sezione || "Menu"))];
  const inAttesa = richieste.filter(x => x.stato === "da_valutare");

  container.innerHTML = `
    <div class="pv2">

      <div class="pv2-testata">
        <div class="t">
          <div class="et">${P.id ? "Preventivo " + P.id : "Nuovo preventivo"}${
            P.gruppo_proposta ? " · " + esc(P.variante_nome || (P.formula_servizio === "buffet" ? "Al buffet" : "Servito")) : ""}</div>
          <h1>${esc(nomeCliente() || "Senza nome")}</h1>
          <div class="sub">${esc(dataLunga(P.data_evento))}${c.inv ? " · " + c.inv + " invitati" : ""}${P.location ? " · " + esc(P.location) : ""}</div>
        </div>
        ${P.id ? `<div class="pv2-scad ${scaduto() ? "ko" : ""}">${esc(testoScadenza())}</div>` : ""}
        <select id="pv2-stato" class="pv2-stato">
          ${["trattativa", "confermato", "perso"].map(s =>
            `<option value="${s}"${P.stato === s ? " selected" : ""}>${s === "trattativa" ? "In trattativa" : s === "confermato" ? "Confermato" : "Perso"}</option>`).join("")}
        </select>
      </div>

      <div class="pv2-barra">
        <div class="k"><span>Totale</span><b>${euro(c.totale)}</b><small>${euro(c.aPersona)} a persona</small></div>
        ${vedoICosti ? `
          <div class="k oro"><span>Costo stimato</span><b>${euro(c.costoTotale)}</b><small>cibo ${euro(c.costoMenu)} · personale ${euro(c.costoPersonale)}</small></div>
          <div class="k ${c.marginePerc >= 60 ? "verde" : c.marginePerc >= 40 ? "" : "rosso"}">
            <span>Margine</span><b>${c.marginePerc.toFixed(1)}%</b><small>${euro(c.margine)}</small></div>` : ""}
        <div class="k"><span>Acconto</span><b>${euro(c.acconto)}</b><small>saldo ${euro(c.totale - c.acconto)}</small></div>
      </div>

      ${c.bimbi > 0 && !righe.some(r => perBambini(r.sezione)) ? `
        <div class="pv2-avviso">
          <b>Ci sono ${c.bimbi} bambini ma non c'è il menu bambini</b>
          <span>Senza, li stai contando come adulti: il totale è più alto del vero e in cucina manca la loro preparazione.</span>
          <button class="pv2-btn arancio" data-extra="Menu bambini" data-quante="3">+ Aggiungi il menu bambini</button>
        </div>` : ""}

      ${c.bimbi === 0 && righe.some(r => perBambini(r.sezione)) ? `
        <div class="pv2-avviso">
          <b>C'è il menu bambini ma i bambini sono zero</b>
          <span>Quelle portate non entrano nel conto finché non indichi quanti sono.</span>
        </div>` : ""}

      ${vedoICosti && (c.senzaCosto || c.stimati) ? `
        <div class="pv2-avviso">
          ${c.senzaCosto ? `<b>${c.senzaCosto} ${c.senzaCosto === 1 ? "portata senza costo" : "portate senza costo"}</b>
            <span>Il margine qui sopra è più alto del vero. Falle stimare a Tony, o collega la ricetta.</span>
            <button class="pv2-btn arancio" id="pv2-stima">🤖 Stima i costi mancanti</button>` : ""}
          ${c.stimati ? `<div class="stimati">${c.stimati} ${c.stimati === 1 ? "portata ha un costo stimato" : "portate hanno un costo stimato"}: da confermare prima di firmare.</div>` : ""}
        </div>` : ""}

      ${inAttesa.length ? `
        <div class="pv2-richieste">
          <div class="tit">📬 ${inAttesa.length === 1 ? "Una richiesta dagli sposi" : inAttesa.length + " richieste dagli sposi"}</div>
          ${inAttesa.map(r => `
            <div class="r">
              <div class="t"><b>${esc(r.descrizione || r.tipo)}</b><span>${quando(r.creata_il)}</span></div>
              <button class="pv2-btn piccolo" data-rich="${r.id}" data-esito="accettata">Accetto</button>
              <button class="pv2-btn piccolo grigio" data-rich="${r.id}" data-esito="rifiutata">No</button>
            </div>`).join("")}
        </div>` : ""}

      <div class="pv2-card">
        <h2>Cliente ed evento</h2>
        <div class="griglia">
          ${campo(dueNomi() ? "Lui — nome" : "Nome", "cliente_nome")}
          ${campo(dueNomi() ? "Lui — cognome" : "Cognome", "cliente_cognome")}
          ${dueNomi() ? campo("Lei — nome", "cliente2_nome") : ""}
          ${dueNomi() ? campo("Lei — cognome", "cliente2_cognome") : ""}
          ${campo("Telefono", "cliente_telefono")}
          ${campo("Email", "cliente_email", "email")}
          <div>
            <label>Evento</label>
            <select class="in" data-campo="titolo_evento">
              <option value="">— scegli —</option>
              ${TIPI_EVENTO.map(t => `<option value="${esc(t)}"${P.titolo_evento === t ? " selected" : ""}>${esc(t)}</option>`).join("")}
              ${P.titolo_evento && !TIPI_EVENTO.includes(P.titolo_evento)
                ? `<option value="${esc(P.titolo_evento)}" selected>${esc(P.titolo_evento)}</option>` : ""}
            </select>
          </div>
          <div>
            <label>Come si serve</label>
            <select class="in" data-campo="formula_servizio">
              <option value="servito"${P.formula_servizio !== "buffet" ? " selected" : ""}>Servito al tavolo</option>
              <option value="buffet"${P.formula_servizio === "buffet" ? " selected" : ""}>Al buffet</option>
            </select>
          </div>
          ${campo("Festeggiato", "nome_festeggiato")}
          ${campo("Data", "data_evento", "date")}
          ${campo("Ora", "ora_evento", "time")}
          ${campo("Invitati", "n_invitati", "number")}
          ${campo("di cui bambini", "n_bambini", "number")}
          <div>
            <label>Location</label>
            <select class="in" data-campo="location_id">
              <option value="">— scrivila a mano —</option>
              ${locations.map(l => `<option value="${l.id}"${String(P.location_id) === String(l.id) ? " selected" : ""}>${esc(l.nome)}</option>`).join("")}
            </select>
          </div>
          ${P.location_id ? "" : campo("Nome location", "location")}
          ${campo("Prezzo location", "location_prezzo", "number")}
          ${campo("Intolleranze", "intolleranze")}
          <div>
            <label>Valida per</label>
            <select class="in" data-campo="giorni_validita">
              ${[7, 10, 15, 20, 30, 45, 60, 90].map(g =>
                `<option value="${g}"${Number(P.giorni_validita || 15) === g ? " selected" : ""}>${g} giorni</option>`).join("")}
            </select>
          </div>
        </div>
        ${avvisoCapienza(c.inv)}
      </div>

      <div class="pv2-card">
        <h2>Il menu</h2>
        <div class="aiuto">Scrivi il piatto: se è in ricettario porta con sé il suo costo.</div>
        ${schemaProposto() ? `
          <div class="pv2-schema">
            <div class="t"><b>Schema ${esc(P.titolo_evento || "evento")} · ${P.formula_servizio === "buffet" ? "al buffet" : "servito"}</b>
              <span>${schemaProposto().map(x => esc(x.nome)).join(" · ")}</span></div>
            <button class="pv2-btn" id="pv2-applica-schema">Usa questo schema</button>
          </div>` : ""}

        ${(sezioniConsigliate() || []).length ? `
          <div class="pv2-consigli">
            <span class="et">Si aggiungono spesso</span>
            ${sezioniConsigliate().map(x => `
              <button class="c" data-extra="${esc(x.nome)}" data-quante="${x.quante || 1}">+ ${esc(x.nome)}</button>`).join("")}
          </div>` : ""}

        ${sezioni.length ? sezioni.map(sez => `
          <div class="pv2-sez">
            ${datalistSezione(sez)}
            <div class="top"><b>${esc(sez)}</b>
              ${sezioniInfo.find(x => norm(x.nome) === norm(sez))?.separata ? `<i class="tag">a parte</i>` : ""}
              ${perBambini(sez) ? `<i class="tag bimbi">${c.bimbi || 0} bambini</i>` : ""}
              <span>${righe.filter(r => (r.sezione || "Menu") === sez).length} portate ·
                ${euro(righe.filter(r => (r.sezione || "Menu") === sez).reduce((s, r) => s + (Number(r.prezzo) || 0), 0))} a persona
                ${catDiSezione(sez) ? "· propone solo questa categoria" : "· propone tutto il ricettario"}</span></div>
            ${righe.map((r, i) => (r.sezione || "Menu") !== sez ? "" : rigaPortata(r, i)).join("")}
            <div class="add" data-add-portata="${esc(sez)}">+ aggiungi portata</div>
          </div>`).join("") : `<div class="aiuto">Nessuna portata: crea la prima sezione qui sotto.</div>`}
        <div class="pv2-nuovasez">
          <select id="pv2-sez-scelta" class="in">
            <option value="">— scegli una sezione —</option>
            ${sezioniNote.filter(n => !sezioni.includes(n)).map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}
            <option value="__nuova__">➕ Nuova sezione…</option>
          </select>
          <input id="pv2-sez-nome" class="in" placeholder="Come si chiama" style="display:none;">
          <button class="pv2-btn" id="pv2-add-sez">Aggiungi</button>
        </div>
        <div class="aiuto" style="margin-top:6px;">Le sezioni che scrivi restano in elenco per i preventivi successivi.</div>
      </div>

      <div class="pv2-card">
        <h2>Servizi ed extra</h2>
        <div class="aiuto">Dal listino, col prezzo che hai deciso tu.</div>
        <div class="pv2-sez">
          ${extra.map((x, i) => `
            <div class="riga">
              <div class="n">${esc(x.descrizione)}</div>
              <input class="pz" type="number" step="0.01" value="${x.prezzo}" data-extra="${i}">
              <button class="x" data-del-extra="${i}">✕</button>
            </div>`).join("")}
          ${listinoServizi.length ? `
            <div class="add-serv">
              <select id="pv2-serv" class="in">
                <option value="">Scegli dal listino…</option>
                ${listinoServizi.map(s => {
                  const q = quantitaServizio(s);
                  return `<option value="${s.id}">${esc(s.categoria)} · ${esc(s.nome)}${
                    s.conta_su !== "fisso" ? ` (ne servono ${q})` : ""} — ${euro((Number(s.prezzo_cliente) || 0) * (s.unita === "a persona" ? 1 : q))}</option>`;
                }).join("")}
              </select>
              <button class="pv2-btn" id="pv2-add-serv">Aggiungi</button>
            </div>` : ""}
          <div class="add-serv">
            <input id="pv2-serv-nome" class="in" placeholder="Servizio (fotografo, auto, musica…)">
            <input id="pv2-serv-prezzo" class="in" type="number" step="0.01" placeholder="€" style="max-width:110px;">
            <button class="pv2-btn" id="pv2-add-serv-manuale">Aggiungi</button>
          </div>
          <div class="add" style="cursor:default;color:#6B7A83;">
            ${listinoServizi.length
              ? "Il listino contiene " + listinoServizi.length + " voci. Quelle aggiunte a mano non ci finiscono dentro."
              : "Il listino servizi è vuoto: qui li aggiungi a mano, oppure li censisci una volta sola in Servizi evento."}
          </div>
        </div>
      </div>

      ${vedoICosti && personale?.figure?.length ? `
        <div class="pv2-card">
          <h2>Personale in servizio</h2>
          <div class="aiuto">Calcolato sulle vostre regole: si cambiano in Servizi e personale eventi.</div>
          ${personale.figure.map(f => `
            <div class="pv2-pers">
              <div class="n"><b>${f.addetti}</b><span>${esc(f.mansione)}</span></div>
              <div class="d">
                <div>Uno ogni <b>${f.ogni}</b> ${f.conta_su === "bambini" ? "bambini" : "ospiti"}${f.minimo ? `, mai meno di <b>${f.minimo}</b>` : ""}</div>
                <div>${f.ore} ore a testa · ${euro(f.costo_orario)} l'ora</div>
                ${f.per_minimo ? `<div class="min">Ne basterebbero meno: vale il minimo di ${f.minimo}.</div>` : ""}
              </div>
              <div class="c">${euro(f.costo)}</div>
            </div>`).join("")}
        </div>` : ""}

      ${P.id ? `
        <div class="pv2-card">
          <h2>Foto della proposta</h2>
          <div class="aiuto">Torta, allestimenti, mise en place: quelle che carichi tu finiscono nel documento
            del cliente. Le ispirazioni che mandano gli sposi restano qui, per te.</div>

          <div class="pv2-foto">
            ${foto.map(f => `
              <div class="f ${f.caricato_da === "cliente" ? "loro" : ""}">
                <img src="${esc(f.url)}" alt="">
                <div class="et">${f.caricato_da === "cliente" ? "dagli sposi" : esc(f.sezione || "proposta")}</div>
                <button class="x" data-del-foto="${f.id}">✕</button>
              </div>`).join("")}
            <label class="carica">
              <input type="file" accept="image/*" multiple id="pv2-foto-file" style="display:none;">
              <span>＋</span><small>carica</small>
            </label>
          </div>

          <div class="pv2-fotosez">
            <label>Le prossime le metto in
              <select id="pv2-foto-sez" class="in">
                ${["proposta", "torta", "allestimento", "mise en place", "location"]
                  .map(x => `<option value="${x}">${x}</option>`).join("")}
              </select>
            </label>
          </div>
          <div id="pv2-foto-esito" class="aiuto"></div>
        </div>` : ""}

      <div class="pv2-card">
        <h2>Il conto</h2>
        <div class="pv2-conto">
          <div class="r"><span>Menu adulti · ${Math.max(c.inv - c.bimbi, 0)}</span><b>${euro(c.menuAdulti)}</b></div>
          ${c.bimbi ? `<div class="r"><span>Menu bambini · ${c.bimbi}</span><b>${euro(c.menuBimbi)}</b></div>` : ""}
          <div class="r"><span>Servizi ed extra</span><b>${euro(c.serviziTot)}</b></div>
          ${c.location ? `<div class="r"><span>Location</span><b>${euro(c.location)}</b></div>` : ""}
          <div class="r">
            <span>Sconto</span>
            <span><input class="mini" type="number" step="0.01" data-campo="sconto_perc" value="${P.sconto_perc || 0}"> %
                  <input class="mini" type="number" step="0.01" data-campo="sconto_euro" value="${P.sconto_euro || 0}"> €</span>
          </div>
          <div class="r tot"><span>Totale</span><span>${euro(c.totale)}</span></div>
          ${vedoICosti ? `
            <div class="r costo"><span>Costo cibo</span><b>− ${euro(c.costoMenu)}</b></div>
            ${c.costoPersonale ? `<div class="r costo"><span>Costo personale</span><b>− ${euro(c.costoPersonale)}</b></div>` : ""}
            ${c.costoServizi ? `<div class="r costo"><span>Costo servizi e fornitori</span><b>− ${euro(c.costoServizi)}</b></div>` : ""}
            <div class="r marg"><span>Margine stimato</span><span>${euro(c.margine)} · ${c.marginePerc.toFixed(1)}%</span></div>` : ""}
          <div class="r"><span>Acconto</span>
            <span><input class="mini largo" type="number" step="0.01" data-campo="acconto" value="${P.acconto || 0}"> €</span></div>
          <div class="r"><span>Saldo</span><b>${euro(c.totale - c.acconto)}</b></div>
        </div>
      </div>

      <div class="pv2-azioni">
        <button class="pv2-btn grande" id="pv2-salva">💾 Salva</button>
        ${vedoICosti && righe.some(r => r.nome) ? `<button class="pv2-btn arancio" id="pv2-stima2">🤖 Stima i costi</button>` : ""}
        ${P.id ? `
          <button class="pv2-btn sec" id="pv2-link">🔗 Link per il cliente</button>
          <button class="pv2-btn wa" id="pv2-invia">📤 Manda al cliente</button>
          <button class="pv2-btn sec" id="pv2-wa">💬 WhatsApp a mano</button>
          <button class="pv2-btn sec" id="pv2-stampa">🖨️ Stampa</button>
          <button class="pv2-btn sec" id="pv2-proroga">📅 ${scaduto() ? "Riapri" : "Proroga"}</button>
          ${P.stato === "confermato" ? `<button class="pv2-btn arancio" id="pv2-spazio">🎪 Spazio degli sposi</button>` : ""}
          <button class="pv2-btn sec" id="pv2-variante">⇄ Proposta ${P.formula_servizio === "buffet" ? "servita" : "al buffet"}</button>` : ""}
      </div>
      <div id="pv2-esito" class="pv2-esito"></div>
    </div>
    ${stile()}`;

  aggancia(container, supabase, azienda, sede);
}

// I piatti proposti sono solo quelli della categoria di quella sezione:
// una tendina con 500 voci non si usa.
function catDiSezione(sez) {
  const info = sezioniInfo.find(x => norm(x.nome) === norm(sez));
  return info?.categoria_portata_id || null;
}
function idListaSezione(sez) { return "dl-" + norm(sez).replace(/ /g, "-"); }

function datalistSezione(sez) {
  const cat = catDiSezione(sez);
  const piatti = cat ? ricette.filter(r => String(r.categoria_portata_id) === String(cat)) : ricette;
  return `<datalist id="${idListaSezione(sez)}">
    ${piatti.slice(0, 600).map(r => `<option value="${esc(r.nome)}">`).join("")}
  </datalist>`;
}

function rigaPortata(r, i) {
  const c = costoDi(r);
  const prezzo = Number(r.prezzo) || 0;
  const marg = prezzo > 0 && c.costo > 0 ? ((prezzo - c.costo) / prezzo) * 100 : null;
  return `
    <div class="riga">
      <div class="n">
        <input class="nome" value="${esc(r.nome)}" data-portata="${i}" placeholder="Scrivi il piatto…" list="${idListaSezione(r.sezione || "Menu")}">
        ${vedoICosti ? `<small>${!r.nome ? ""
          : c.mancante ? (c.resaSenzaPorzioni ? "la ricetta ha il costo totale ma non le porzioni"
                          : r.ricetta_id ? "ricetta collegata ma senza costo" : "nessuna ricetta collegata")
          : "costo " + euro(c.costo) + " · " + (c.stimato ? "stimato da Tony" : esc(c.fonte || "da ricetta"))}</small>` : ""}
      </div>
      <input class="pz" type="number" step="0.01" value="${prezzo}" data-prezzo="${i}" title="prezzo a persona">
      ${vedoICosti ? `<div class="mg ${marg == null ? "" : marg >= 55 ? "ok" : "ko"}">${marg == null ? "—" : marg.toFixed(0) + "%"}</div>` : ""}
      ${vedoICosti && c.stimato ? `<button class="lente" data-dettaglio="${i}" title="Come ha fatto il conto">${apertoDettaglio === i ? "▲" : "🔍"}</button>` : ""}
      <button class="x" data-del-portata="${i}">✕</button>
    </div>
    ${vedoICosti && apertoDettaglio === i ? dettaglioStima(r) : ""}`;
}

// Il ragionamento di Tony, in chiaro: ingredienti, quantita' e cosa non sapeva
function dettaglioStima(r) {
  const s = stime[norm(r.nome)];
  if (!s) return "";
  const ing = s.ingredienti || [];
  return `
    <div class="pv2-dett">
      <div class="tit">Come Tony è arrivato a ${euro(s.food_cost || 0)} a porzione</div>
      ${ing.length ? `<div class="ing">
        ${ing.map(x => `
          <div class="i ${x.sospetto ? "ko" : ""}">
            <span>${esc(x.nome)} <small>${x.quantita} ${esc(x.unita_misura || "")}${x.certezza === "bassa" ? " · ipotesi" : ""}</small></span>
            <span>${x.prodotto ? esc(x.prodotto) : "nessun prodotto"}</span>
            <b>${x.sospetto ? "escluso" : euro(x.costo || 0)}</b>
          </div>`).join("")}
      </div>` : `<div class="vuoto">Nessun dettaglio salvato per questa stima.</div>`}
      ${s.note ? `<div class="note">Da chiarire: ${esc(s.note)}</div>` : ""}
      <div class="note">È una stima da nome: controlla le quantità prima di firmare l'evento.</div>
      ${ing.length ? `<button class="pv2-btn piccolo" data-crea-ricetta="${esc(r.nome)}"
        style="margin-top:9px;">📋 Salva come ricetta bozza</button>` : ""}
    </div>`;
}

function avvisoCapienza(inv) {
  if (!P.location_id) return "";
  const l = locations.find(x => String(x.id) === String(P.location_id));
  if (!l) return "";
  if (l.capienza_max && inv > l.capienza_max) {
    return `<div class="pv2-cap ko">${esc(l.nome)} arriva a ${l.capienza_max} persone: con ${inv} invitati non ci stanno.</div>`;
  }
  if (l.capienza_min && inv < l.capienza_min) {
    return `<div class="pv2-cap">${esc(l.nome)} parte da ${l.capienza_min} persone.</div>`;
  }
  return "";
}

/* ── interazione ─────────────────────────────────────────────────────── */

function aggancia(container, supabase, azienda, sede) {
  const ri = () => disegna(container, supabase, azienda, sede);

  container.querySelectorAll("[data-campo]").forEach(el => {
    el.addEventListener("change", async () => {
      const k = el.dataset.campo;
      P[k] = el.type === "number" ? Number(el.value) || 0 : el.value;
      if (k === "location_id") {
        const l = locations.find(x => String(x.id) === String(P.location_id));
        if (l) { P.location = l.nome; P.location_prezzo = Number(l.prezzo_affitto_base) || 0; }
      }
      if (k === "titolo_evento" || k === "n_invitati" || k === "n_bambini" || k === "formula_servizio") {
        await calcolaPersonale(supabase, azienda);
      }
      ri();
    });
  });

  container.querySelector("#pv2-stato")?.addEventListener("change", (e) => { P.stato = e.target.value; });

  container.querySelectorAll("[data-portata]").forEach(el => {
    el.addEventListener("change", () => {
      const i = Number(el.dataset.portata);
      righe[i].nome = el.value;
      const r = ricette.find(x => norm(x.nome) === norm(el.value));
      righe[i].ricetta_id = r ? r.id : null;
      ri();
    });
  });
  container.querySelectorAll("[data-prezzo]").forEach(el => {
    el.addEventListener("change", () => { righe[Number(el.dataset.prezzo)].prezzo = Number(el.value) || 0; ri(); });
  });
  container.querySelectorAll("[data-del-portata]").forEach(el => {
    el.addEventListener("click", () => { righe.splice(Number(el.dataset.delPortata), 1); ri(); });
  });
  container.querySelectorAll("[data-add-portata]").forEach(el => {
    el.addEventListener("click", () => { righe.push({ nome: "", sezione: el.dataset.addPortata, prezzo: 0, ricetta_id: null }); ri(); });
  });

  const selSez = container.querySelector("#pv2-sez-scelta");
  const inpSez = container.querySelector("#pv2-sez-nome");
  selSez?.addEventListener("change", () => {
    const nuova = selSez.value === "__nuova__";
    if (inpSez) { inpSez.style.display = nuova ? "block" : "none"; if (nuova) inpSez.focus(); }
  });

  container.querySelectorAll("[data-extra]").forEach(b =>
    b.addEventListener("click", () => {
      const nome = b.dataset.extra;
      const quante = Math.max(Number(b.dataset.quante) || 1, 1);
      for (let i = 0; i < quante; i++) righe.push({ nome: "", sezione: nome, prezzo: 0, ricetta_id: null });
      // resta in elenco per i preventivi successivi
      supabase.rpc("sezione_menu_usata", { p_azienda: azienda.id, p_nome: nome }).catch(() => {});
      ri();
    }));

  container.querySelector("#pv2-applica-schema")?.addEventListener("click", () => {
    const schema = schemaProposto();
    if (!schema) return;
    const sugg = modelloAttivo()?.prezzo_bambino_suggerito;
    if (sugg && !Number(P.prezzo_bambino)) P.prezzo_bambino = Number(sugg);
    // una riga vuota per ogni portata prevista: si riempiono scrivendo il piatto
    schema.forEach(s => {
      const quante = Math.max(Number(s.quante) || 1, 1);
      for (let i = 0; i < quante; i++) {
        righe.push({ nome: "", sezione: s.nome, prezzo: 0, ricetta_id: null });
      }
    });
    msg(container, "Schema pronto: scrivi i piatti, le righe che avanzano si tolgono con la ✕.");
    ri();
  });

  container.querySelector("#pv2-add-sez")?.addEventListener("click", async () => {
    const scelta = selSez?.value || "";
    const n = scelta === "__nuova__" ? (inpSez?.value || "").trim() : scelta;
    if (!n) { msg(container, "Scegli o scrivi il nome della sezione.", true); return; }
    righe.push({ nome: "", sezione: n, prezzo: 0, ricetta_id: null });
    // la sezione nuova entra subito in elenco, anche prima di salvare
    if (!sezioniNote.some(x => norm(x) === norm(n))) {
      sezioniNote.push(n);
      try { await supabase.rpc("sezione_menu_usata", { p_azienda: azienda.id, p_nome: n }); } catch (e) { /* niente */ }
    }
    ri();
  });

  container.querySelectorAll("[data-extra]").forEach(el => {
    el.addEventListener("change", () => { extra[Number(el.dataset.extra)].prezzo = Number(el.value) || 0; ri(); });
  });
  container.querySelectorAll("[data-del-extra]").forEach(el => {
    el.addEventListener("click", () => { extra.splice(Number(el.dataset.delExtra), 1); ri(); });
  });
  container.querySelector("#pv2-add-serv-manuale")?.addEventListener("click", () => {
    const n = (document.getElementById("pv2-serv-nome")?.value || "").trim();
    const pz = Number(document.getElementById("pv2-serv-prezzo")?.value) || 0;
    if (!n) { msg(container, "Scrivi il nome del servizio.", true); return; }
    extra.push({ descrizione: n, prezzo: pz });
    ri();
  });

  container.querySelector("#pv2-add-serv")?.addEventListener("click", () => {
    const id = document.getElementById("pv2-serv")?.value;
    const s = listinoServizi.find(x => String(x.id) === String(id));
    if (!s) return;
    const inv = Math.max(Number(P.n_invitati) || 1, 1);
    const q = quantitaServizio(s);
    if (q === 0) { msg(container, "Questo servizio si calcola sui bambini: indica quanti sono.", true); return; }
    const prezzoU = Number(s.prezzo_cliente) || 0;
    extra.push({
      descrizione: s.conta_su === "fisso" ? s.nome : `${s.nome} × ${q}`,
      prezzo: s.unita === "a persona" ? prezzoU * inv : prezzoU * q,
      costo: (Number(s.costo_fornitore) || 0) * (s.unita === "a persona" ? inv : q),
    });
    ri();
  });

  async function lanciaStima(btn) {
    const daFare = righe.filter(r => r.nome && costoDi(r).mancante);
    if (!daFare.length) { msg(container, "Tutte le portate hanno già un costo."); return; }
    const token = (await supabase.auth.getSession())?.data?.session?.access_token || "";
    const testoOriginale = btn ? btn.textContent : "";
    if (btn) btn.disabled = true;
    for (let i = 0; i < daFare.length; i++) {
      if (btn) btn.textContent = `Stimo ${i + 1} di ${daFare.length}…`;
      try {
        const resp = await fetch(EF_STIMA, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: token },
          body: JSON.stringify({
            azienda_id: azienda.id, nome: daFare[i].nome,
            contesto: (P.titolo_evento || "") + ", servizio per banchetto",
          }),
        });
        const d = await resp.json();
        if (d.success) stime[norm(daFare[i].nome)] = {
          food_cost: d.costo?.food_cost || 0,
          note: d.piatto?.note || "",
          affidabilita: d.costo?.affidabilita || 0,
          ingredienti: d.piatto?.ingredienti || [],
        };
      } catch (e) { console.error(e); }
    }
    ri();
  }

  container.querySelector("#pv2-stima")?.addEventListener("click", (e) => lanciaStima(e.currentTarget));
  container.querySelector("#pv2-stima2")?.addEventListener("click", (e) => lanciaStima(e.currentTarget));

  container.querySelectorAll("[data-dettaglio]").forEach(el => {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.dettaglio);
      apertoDettaglio = apertoDettaglio === i ? null : i;
      ri();
    });
  });

  container.querySelectorAll("[data-crea-ricetta]").forEach(el => {
    el.addEventListener("click", async () => {
      const nome = el.dataset.creaRicetta;
      const s = stime[norm(nome)];
      if (!s) return;
      el.disabled = true; el.textContent = "Creo…";
      const { data, error } = await supabase.rpc("ricetta_da_stima", {
        p_azienda: azienda.id, p_nome: nome,
        p_ingredienti: s.ingredienti || [], p_porzioni: 1,
      });
      if (error || !data?.ok) { msg(container, "Non è andata: " + (error?.message || data?.errore || ""), true); el.disabled = false; return; }
      // da adesso quel piatto ha una ricetta vera: il costo non e' piu' stimato
      const i = righe.findIndex(x => norm(x.nome) === norm(nome));
      if (i >= 0) righe[i].ricetta_id = data.ricetta_id;
      const { data: rr } = await supabase.from("ricette")
        .select("id, nome, costo_porzione, costo_materia_prima, porzioni").eq("id", data.ricetta_id).maybeSingle();
      if (rr) ricette.push(rr);
      msg(container, `Ricetta creata con ${data.ingredienti} ingredienti. Completala nel ricettario per avere il costo esatto.`);
      ri();
    });
  });

  container.querySelectorAll("[data-rich]").forEach(el => {
    el.addEventListener("click", async () => {
      await supabase.from("preventivi_richieste")
        .update({ stato: el.dataset.esito, gestita_il: new Date().toISOString() })
        .eq("id", el.dataset.rich);
      richieste = richieste.map(r => String(r.id) === el.dataset.rich ? { ...r, stato: el.dataset.esito } : r);
      ri();
    });
  });

  container.querySelector("#pv2-foto-file")?.addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    const sez = document.getElementById("pv2-foto-sez")?.value || "proposta";
    const esito = document.getElementById("pv2-foto-esito");
    if (esito) esito.textContent = "Carico…";
    let ok = 0;
    for (const f of files.slice(0, 10)) {
      try {
        const path = `${azienda.id}/preventivi/${P.id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
        const up = await supabase.storage.from("media-aziende").upload(path, f, { contentType: f.type, upsert: false });
        if (up.error) continue;
        const { data: pub } = supabase.storage.from("media-aziende").getPublicUrl(path);
        await supabase.from("preventivi_allegati").insert({
          azienda_id: azienda.id, preventivo_id: P.id, sezione: sez,
          titolo: f.name, url: pub.publicUrl, caricato_da: "noi",
          visibile_al_cliente: true, ordine: foto.length + ok + 1,
        });
        ok++;
      } catch (err) { console.error(err); }
    }
    if (esito) esito.textContent = ok ? `${ok} ${ok === 1 ? "foto caricata" : "foto caricate"}.` : "Non è andata.";
    await caricaPreventivo(supabase, P.id);
    ri();
  });

  container.querySelectorAll("[data-del-foto]").forEach(b =>
    b.addEventListener("click", async () => {
      if (!confirm("Tolgo questa foto?")) return;
      await supabase.from("preventivi_allegati").delete().eq("id", b.dataset.delFoto);
      await caricaPreventivo(supabase, P.id);
      ri();
    }));

  container.querySelector("#pv2-salva")?.addEventListener("click", () => salva(container, supabase, azienda, sede));
  container.querySelector("#pv2-proroga")?.addEventListener("click", async () => {
    const g = Number(prompt("Per quanti giorni la riapro, da oggi?", String(P.giorni_validita || 15)));
    if (!g || g <= 0) return;
    const nuova = new Date(Date.now() + g * 86400000).toISOString();
    const { error } = await supabase.from("preventivi")
      .update({ scadenza_il: nuova, giorni_validita: g }).eq("id", P.id);
    if (error) return msg(container, "Errore: " + error.message, true);
    P.scadenza_il = nuova; P.giorni_validita = g;
    msg(container, "Valida ancora " + g + (g === 1 ? " giorno." : " giorni."));
    ri();
  });

  container.querySelector("#pv2-variante")?.addEventListener("click", async (e) => {
    const altra = P.formula_servizio === "buffet" ? "servito" : "buffet";
    if (!confirm(`Creo la stessa proposta in versione ${altra === "buffet" ? "al buffet" : "servita"}?\n\n` +
      "Cliente, data e invitati vengono copiati. Il menu no: i piatti cambiano, lo componi da zero.")) return;
    const b = e.currentTarget; b.disabled = true; b.textContent = "Creo…";
    const { data, error } = await supabase.rpc("crea_variante_preventivo", {
      p_preventivo: P.id, p_formula: altra });
    b.disabled = false;
    if (error || !data?.ok) return msg(container, error?.message || data?.errore || "Non è andata.", true);
    location.hash = "#/creaPreventivo?id=" + data.preventivo_id;
    location.reload();
  });

  container.querySelector("#pv2-spazio")?.addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.disabled = true; b.textContent = "Apro…";
    const { data, error } = await supabase.rpc("crea_spazio_evento", { p_preventivo: P.id });
    b.disabled = false; b.textContent = "🎪 Spazio degli sposi";
    if (error || !data?.ok) return msg(container, error?.message || data?.errore || "Non è andata.", true);

    const { data: sp } = await supabase.from("spazio_evento")
      .select("token_sposi").eq("id", data.spazio_id).maybeSingle();
    const base = (location.origin + location.pathname).replace(/index\.html$/, "");
    const url = base + "#/spazio?t=" + sp?.token_sposi;
    try { await navigator.clipboard.writeText(url); } catch (_) {}
    msg(container, (data.gia_esisteva ? "Spazio già aperto. " : "Spazio creato" +
      (data.voci_checklist ? " con " + data.voci_checklist + " cose da fare. " : ". ")) + "Link copiato: " + url);
  });

  container.querySelector("#pv2-stampa")?.addEventListener("click", () => {
    // stampare la scheda interna non ha senso: si stampa il documento del cliente
    if (!P.token_pubblico) { msg(container, "Salva prima il preventivo.", true); return; }
    const w = window.open(linkCliente(), "_blank");
    if (!w) { msg(container, "Il browser ha bloccato la finestra: apri il link cliente e stampa da lì.", true); return; }
    msg(container, "Si apre la pagina del cliente: da lì usa Stampa o salva in PDF.");
  });

  container.querySelector("#pv2-link")?.addEventListener("click", async () => {
    const url = linkCliente();
    try { await navigator.clipboard.writeText(url); msg(container, "Link copiato: " + url); }
    catch { prompt("Link per il cliente:", url); }
  });

  container.querySelector("#pv2-invia")?.addEventListener("click", async (e) => {
    const b = e.currentTarget;
    b.disabled = true; b.textContent = "Mando…";
    try {
      const token = (await supabase.auth.getSession())?.data?.session?.access_token || "";
      const resp = await fetch("https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/invia-preventivo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: token },
        body: JSON.stringify({ preventivo_id: P.id, canali: ["email", "whatsapp"] }),
      });
      const d = await resp.json();
      const righe = Object.entries(d.esiti || {}).map(([k, v]) => k + ": " + v).join(" · ");
      msg(container, d.success ? righe || "Mandato." : (d.error || "Non è andata."), !d.success);
    } catch (err) {
      msg(container, "Non è andata: " + err.message, true);
    }
    b.disabled = false; b.textContent = "📤 Manda al cliente";
  });

  container.querySelector("#pv2-mail")?.addEventListener("click", () => {
    if (!P.cliente_email) { msg(container, "Manca l'email del cliente.", true); return; }
    const oggetto = `Proposta per ${P.titolo_evento || "il vostro evento"} — ${nomeCliente()}`;
    const corpo = [
      `Gentili ${nomeCliente() || "clienti"},`, "",
      `ecco la proposta per ${P.titolo_evento || "il vostro evento"} del ${dataLunga(P.data_evento)}.`,
      "",
      "La trovate qui, sempre aggiornata:",
      linkCliente(),
      "",
      "Da quella pagina potete vedere il menu, aggiungere servizi e dirci cosa cambiare.",
      "", "A presto!",
    ].join("\n");
    window.location.href = "mailto:" + encodeURIComponent(P.cliente_email)
      + "?subject=" + encodeURIComponent(oggetto) + "&body=" + encodeURIComponent(corpo);
  });

  container.querySelector("#pv2-wa")?.addEventListener("click", () => {
    const tel = String(P.cliente_telefono || "").replace(/\D/g, "");
    const testo = `Ciao ${P.cliente_nome || ""}, ecco la proposta per ${P.titolo_evento || "il vostro evento"}:\n${linkCliente()}\n\nDa lì potete vedere tutto e dirci cosa cambiare.`;
    window.open("https://wa.me/" + (tel.startsWith("39") ? tel : "39" + tel) + "?text=" + encodeURIComponent(testo), "_blank");
  });
}

/* ── salvataggio ─────────────────────────────────────────────────────── */

async function salva(container, supabase, azienda, sede) {
  const c = conti();
  const testata = {
    azienda_id: azienda.id, sede_uuid: sede?.id || null,
    stato: P.stato, titolo_evento: P.titolo_evento, tipo_servizio: P.tipo_servizio || null,
    cliente_nome: P.cliente_nome, cliente_cognome: P.cliente_cognome,
    cliente_email: P.cliente_email, cliente_telefono: P.cliente_telefono,
    nome_festeggiato: P.nome_festeggiato, intolleranze: P.intolleranze, note: P.note,
    data_evento: P.data_evento || null, ora_evento: P.ora_evento || null,
    n_invitati: c.inv, n_bambini: c.bimbi, formula_servizio: P.formula_servizio || "servito",
    location: P.location, location_id: P.location_id || null,
    location_prezzo: Number(P.location_prezzo) || 0,
    sconto_perc: Number(P.sconto_perc) || 0, sconto_euro: Number(P.sconto_euro) || 0,
    subtotale_menu: c.menu, subtotale_extra: c.serviziTot,
    costo_stimato: c.costoMenu, totale: c.totale, acconto: c.acconto,
    giorni_validita: Number(P.giorni_validita) || 15,
    // la scadenza si ricalcola dalla creazione: cambiando i giorni si sposta
    scadenza_il: new Date(
      (P.created_at ? new Date(P.created_at).getTime() : Date.now())
      + (Number(P.giorni_validita) || 15) * 86400000).toISOString(),
  };

  let id = P.id;
  if (id) {
    const { error } = await supabase.from("preventivi").update(testata).eq("id", id);
    if (error) return msg(container, "Errore: " + error.message, true);
  } else {
    const { data, error } = await supabase.from("preventivi").insert(testata).select("id, token_pubblico").maybeSingle();
    if (error) return msg(container, "Errore: " + error.message, true);
    id = data.id;
  }

  await Promise.all([
    supabase.from("preventivi_righe").delete().eq("preventivo_id", id),
    supabase.from("preventivi_extra").delete().eq("preventivo_id", id),
  ]);

  const daSalvare = righe.filter(r => r.nome);
  if (daSalvare.length) {
    await supabase.from("preventivi_righe").insert(daSalvare.map(r => {
      const co = costoDi(r);
      return {
        azienda_id: azienda.id, sede_uuid: sede?.id || null, preventivo_id: id,
        ricetta_id: r.ricetta_id || null, nome_portata: r.nome, sezione_menu: r.sezione || "Menu",
        quantita: perBambini(r.sezione) ? c.bimbi : c.inv,
        prezzo_unitario: Number(r.prezzo) || 0,
        totale: (Number(r.prezzo) || 0) * (perBambini(r.sezione) ? c.bimbi : c.inv),
        food_cost_snapshot: co.costo || 0,
        ricetta_placeholder: Boolean(co.stimato || co.mancante),
        stima_dettaglio: stime[norm(r.nome)] || null,
      };
    }));
  }
  if (extra.length) {
    await supabase.from("preventivi_extra").insert(extra.map(x => ({
      azienda_id: azienda.id, sede_uuid: sede?.id || null, preventivo_id: id,
      descrizione: x.descrizione, quantita: 1,
      prezzo_unitario: Number(x.prezzo) || 0, prezzo_totale: Number(x.prezzo) || 0,
      costo_totale: Number(x.costo) || 0,
    })));
  }

  // I piatti stimati diventano ricette bozza da soli: hanno gia' ingredienti e
  // costo, quindi la scheda nasce utile invece che vuota come faceva la vecchia.
  let create = 0;
  for (const r of daSalvare) {
    if (r.ricetta_id) continue;
    const st = stime[norm(r.nome)];
    if (!st || !(st.ingredienti || []).length) continue;
    const { data: nr } = await supabase.rpc("ricetta_da_stima", {
      p_azienda: azienda.id, p_nome: r.nome, p_ingredienti: st.ingredienti, p_porzioni: 1,
    });
    if (nr?.ok) {
      create++;
      await supabase.from("preventivi_righe")
        .update({ ricetta_id: nr.ricetta_id })
        .eq("preventivo_id", id).eq("nome_portata", r.nome);
    }
  }

  // le sezioni usate restano in memoria per la prossima volta
  for (const sez of [...new Set(daSalvare.map(r => r.sezione).filter(Boolean))]) {
    try { await supabase.rpc("sezione_menu_usata", { p_azienda: azienda.id, p_nome: sez }); } catch (e) { /* niente */ }
  }

  await caricaPreventivo(supabase, id);
  if (create) {
    const { data: rr } = await supabase.from("ricette")
      .select("id, nome, costo_porzione, costo_materia_prima, porzioni").eq("azienda_id", azienda.id).limit(3000);
    ricette = rr || ricette;
  }
  disegna(container, supabase, azienda, sede);
  msg(container, create
    ? `Salvato. ${create === 1 ? "Un piatto è entrato" : create + " piatti sono entrati"} in ricettario come bozza.`
    : "Salvato.");
}

/* ── utilità ─────────────────────────────────────────────────────────── */

function campo(label, key, tipo = "text") {
  return `<div><label>${label}</label>
    <input class="in" type="${tipo}" data-campo="${key}" value="${esc(P[key] ?? "")}"></div>`;
}
function scaduto() {
  return P.scadenza_il && new Date(P.scadenza_il) < new Date() && !P.confermato_il;
}
function testoScadenza() {
  if (P.confermato_il) return "Confermato";
  if (!P.scadenza_il) return "";
  const giorni = Math.ceil((new Date(P.scadenza_il) - Date.now()) / 86400000);
  const quando = new Date(P.scadenza_il).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  if (giorni < 0) return "Scaduta il " + quando;
  if (giorni === 0) return "Scade oggi";
  return "Valida fino al " + quando + " · " + giorni + (giorni === 1 ? " giorno" : " giorni");
}

function nomeCliente() { return [P.cliente_nome, P.cliente_cognome].filter(Boolean).join(" "); }
function linkCliente() {
  const base = (location.origin + location.pathname).replace(/index\.html$/, "");
  return base + "#/preventivo?t=" + (P.token_pubblico || "");
}
function msg(container, testo, errore) {
  const e = container.querySelector("#pv2-esito");
  if (e) { e.textContent = testo; e.className = "pv2-esito " + (errore ? "ko" : "ok"); }
}
function quando(iso) {
  if (!iso) return "";
  const g = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return g <= 0 ? "oggi" : g === 1 ? "ieri" : g + " giorni fa";
}
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
function dataLunga(iso) {
  if (!iso) return "data da definire";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  const g = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric" });
  return g.charAt(0).toUpperCase() + g.slice(1) + " " + MESI[d.getMonth()] + " " + d.getFullYear();
}
function euro(n) { return (Number(n) || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"; }
function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function stile() {
  return `<style>
  .pv2{--navy:#023C59;--arancio:#E66101;--ambra:#F1B302;--verde:#348127;--rosso:#B91C1C;
       --riga:#E2E6EA;--muto:#6B7A83;max-width:780px;margin:0 auto;padding:16px 14px 80px;color:#12232E;}
  .pv2-caric{padding:40px;text-align:center;color:#94a3b8;}
  .pv2-testata{background:var(--navy);color:#fff;border-radius:18px;padding:18px 20px;margin-bottom:14px;
    display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap;}
  .pv2-testata .t{flex:1;min-width:190px;}
  .pv2-testata .et{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9FC0D2;}
  .pv2-testata h1{font-family:Georgia,serif;font-size:24px;margin:3px 0 4px;font-weight:normal;}
  .pv2-testata .sub{font-size:13.5px;color:#CFE0E8;}
  .pv2-scad{background:rgba(255,255,255,.16);color:#fff;border-radius:100px;padding:7px 13px;
    font-size:12.5px;font-weight:700;white-space:nowrap;}
  .pv2-scad.ko{background:#7F1D1D;}
  .pv2-stato{background:var(--ambra);border:none;border-radius:100px;padding:8px 14px;font-size:12.5px;
    font-weight:800;font-family:inherit;color:#3A2B00;cursor:pointer;}

  .pv2-barra{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:9px;margin-bottom:14px;}
  .pv2-barra .k{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:13px;}
  .pv2-barra .k span{display:block;font-size:11.5px;color:var(--muto);}
  .pv2-barra .k b{display:block;font-family:Georgia,serif;font-size:22px;color:var(--navy);margin-top:2px;}
  .pv2-barra .k small{font-size:11px;color:var(--muto);}
  .pv2-barra .k.oro{background:#FFFCF3;border-color:#F5DFA0;} .pv2-barra .k.oro b{color:#9A6A00;}
  .pv2-barra .k.verde{background:#F6FBF3;border-color:#CFE4C2;} .pv2-barra .k.verde b{color:var(--verde);}
  .pv2-barra .k.rosso{background:#FEF2F2;border-color:#FECACA;} .pv2-barra .k.rosso b{color:var(--rosso);}

  .pv2-avviso{background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:13px 15px;margin-bottom:14px;font-size:13.5px;}
  .pv2-avviso b{display:block;color:#9A3412;}
  .pv2-avviso span{display:block;color:#7C2D12;margin:3px 0 9px;}
  .pv2-avviso .stimati{color:#7C2D12;margin-top:7px;}

  .pv2-richieste{background:#fff;border:1px solid var(--riga);border-radius:14px;padding:14px 16px;margin-bottom:14px;}
  .pv2-richieste .tit{font-weight:700;font-size:14.5px;margin-bottom:8px;}
  .pv2-richieste .r{display:flex;gap:8px;align-items:center;padding:9px 0;border-top:1px solid #F1F4F6;flex-wrap:wrap;}
  .pv2-richieste .r .t{flex:1;min-width:160px;font-size:14px;}
  .pv2-richieste .r .t span{display:block;font-size:12px;color:var(--muto);}

  .pv2-card{background:#fff;border:1px solid var(--riga);border-radius:16px;padding:17px;margin-bottom:14px;}
  .pv2-card h2{font-size:16px;margin-bottom:3px;}
  .pv2-card .aiuto{font-size:12.5px;color:var(--muto);margin-bottom:13px;}
  .griglia{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:11px;}
  .pv2 label{display:block;font-size:12px;font-weight:700;color:var(--muto);margin-bottom:4px;}
  .pv2 .in{width:100%;padding:10px;border:1.5px solid var(--riga);border-radius:10px;font-size:15px;font-family:inherit;background:#fff;}

  .pv2-sez{border:1px solid var(--riga);border-radius:12px;margin-bottom:10px;overflow:hidden;}
  .pv2-sez .top{background:#F7F9FB;padding:9px 13px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
  .pv2-sez .top b{flex:1;font-size:14.5px;}
  .pv2-sez .top span{font-size:12px;color:var(--muto);}
  .pv2-sez .top .tag.bimbi{background:#FFF7ED;color:#9A3412;}
  .pv2-sez .top .tag{font-style:normal;font-size:10.5px;font-weight:800;text-transform:uppercase;
    letter-spacing:.06em;background:#EEF2F5;color:var(--muto);padding:2px 7px;border-radius:100px;}
  .pv2 .riga{display:flex;align-items:center;gap:8px;padding:9px 13px;border-top:1px solid #F1F4F6;}
  .pv2 .riga .n{flex:1;min-width:120px;}
  .pv2 .riga .n .nome{width:100%;border:none;font-size:15px;font-family:inherit;padding:2px 0;background:transparent;}
  .pv2 .riga .n small{display:block;font-size:11.5px;color:var(--muto);}
  .pv2 .riga .pz{width:86px;padding:7px;border:1.5px solid var(--riga);border-radius:8px;font-size:14px;text-align:right;font-family:inherit;}
  .pv2 .riga .mg{width:48px;text-align:right;font-size:13px;font-weight:700;color:var(--muto);}
  .pv2 .riga .mg.ok{color:var(--verde);} .pv2 .riga .mg.ko{color:var(--rosso);}
  .pv2 .riga .x{background:none;border:none;color:#CBD5DB;font-size:16px;cursor:pointer;}
  .pv2 .add,.pv2 .add-serv{padding:9px 13px;border-top:1px dashed var(--riga);font-size:13.5px;color:var(--navy);cursor:pointer;}
  .pv2 .add-serv{display:flex;gap:8px;cursor:default;}
  .pv2-nuovasez{display:flex;gap:8px;margin-top:8px;}
  .pv2-schema{background:#FFFCF3;border:1px solid #F5DFA0;border-radius:12px;padding:14px 16px;
    margin-bottom:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;}
  .pv2-schema .t{flex:1;min-width:190px;}
  .pv2-schema .t b{display:block;font-size:14.5px;color:#9A6A00;}
  .pv2-schema .t span{display:block;font-size:12.5px;color:#7C5800;margin-top:3px;line-height:1.5;}
  .pv2-consigli{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:12px;}
  .pv2-consigli .et{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
    color:var(--muto);margin-right:3px;}
  .pv2-consigli .c{background:#fff;border:1.5px solid var(--riga);border-radius:100px;padding:7px 13px;
    font-size:13px;color:var(--navy);font-family:inherit;cursor:pointer;}
  .pv2-consigli .c:hover{border-color:var(--arancio);color:var(--arancio);}

  .pv2-cap{margin-top:11px;background:#FFFBEB;border:1px solid #FDE68A;color:#92400E;border-radius:10px;padding:10px 12px;font-size:13.5px;}
  .pv2-cap.ko{background:#FEF2F2;border-color:#FECACA;color:var(--rosso);font-weight:700;}

  .pv2-conto{background:#F7F9FB;border-radius:12px;padding:14px 16px;}
  .pv2-conto .r{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:14.5px;}
  .pv2-conto .r.tot{border-top:1px solid var(--riga);margin-top:6px;padding-top:10px;font-size:18px;font-weight:800;color:var(--navy);}
  .pv2-conto .r.marg{color:var(--verde);font-weight:700;}
  .pv2-conto .r.costo{color:var(--muto);font-size:13.5px;}
  .pv2-pers{display:flex;align-items:center;gap:14px;background:#F7F9FB;border-radius:12px;padding:14px 16px;flex-wrap:wrap;}
  .pv2-pers .n{text-align:center;min-width:74px;}
  .pv2-pers .n b{display:block;font-family:Georgia,serif;font-size:30px;color:var(--navy);line-height:1;}
  .pv2-pers .n span{font-size:12px;color:var(--muto);}
  .pv2-pers .d{flex:1;min-width:170px;font-size:13.5px;color:#3D4C55;line-height:1.6;}
  .pv2-pers .d .min{color:#9A6A00;}
  .pv2-pers .c{font-family:Georgia,serif;font-size:22px;color:#9A6A00;}
  .pv2 .riga .lente{background:none;border:none;font-size:14px;cursor:pointer;color:var(--muto);}
  .pv2-dett{background:#FFFCF3;border-top:1px solid #F5DFA0;padding:12px 14px;font-size:13px;}
  .pv2-dett .tit{font-weight:700;color:#9A6A00;margin-bottom:7px;}
  .pv2-dett .i{display:flex;gap:8px;padding:4px 0;border-top:1px solid #F3EBD8;}
  .pv2-dett .i:first-child{border-top:none;}
  .pv2-dett .i span:first-child{flex:1;}
  .pv2-dett .i span:nth-child(2){flex:1;color:var(--muto);}
  .pv2-dett .i small{color:var(--muto);}
  .pv2-dett .i.ko{color:var(--rosso);}
  .pv2-dett .note{margin-top:8px;color:#7C2D12;line-height:1.5;}
  .pv2-dett .vuoto{color:var(--muto);}
  .pv2 .mini{width:74px;padding:6px;border:1.5px solid var(--riga);border-radius:8px;font-size:14px;text-align:right;font-family:inherit;}
  .pv2 .mini.largo{width:96px;}

  .pv2-foto{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:9px;}
  .pv2-foto .f{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;border:1px solid var(--riga);}
  .pv2-foto .f.loro{border-color:#F5DFA0;box-shadow:0 0 0 2px #FFFCF3;}
  .pv2-foto .f img{width:100%;height:100%;object-fit:cover;display:block;}
  .pv2-foto .f .et{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);color:#fff;
    font-size:10.5px;padding:3px 6px;text-align:center;}
  .pv2-foto .f .x{position:absolute;top:4px;right:4px;background:rgba(255,255,255,.9);border:none;
    border-radius:50%;width:22px;height:22px;font-size:12px;cursor:pointer;color:#B91C1C;}
  .pv2-foto .carica{aspect-ratio:1;border:1.5px dashed #CBD5DB;border-radius:10px;display:flex;
    flex-direction:column;align-items:center;justify-content:center;cursor:pointer;color:var(--muto);}
  .pv2-foto .carica span{font-size:26px;line-height:1;}
  .pv2-foto .carica small{font-size:11.5px;}
  .pv2-fotosez{margin-top:11px;font-size:12.5px;color:var(--muto);}
  .pv2-fotosez select{max-width:190px;display:inline-block;margin-left:6px;}
  .pv2-azioni{display:flex;gap:9px;flex-wrap:wrap;margin-top:6px;}
  .pv2-btn{background:var(--navy);color:#fff;border:none;border-radius:11px;padding:12px 18px;font-size:15px;
    font-weight:700;cursor:pointer;font-family:inherit;}
  .pv2-btn.grande{padding:14px 26px;font-size:16px;}
  .pv2-btn.sec{background:#fff;border:1.5px solid var(--riga);color:var(--navy);}
  .pv2-btn.wa{background:#25D366;}
  .pv2-btn.arancio{background:var(--arancio);}
  .pv2-btn.piccolo{padding:8px 13px;font-size:13px;}
  .pv2-btn.grigio{background:#fff;border:1.5px solid var(--riga);color:var(--muto);}
  .pv2-esito{margin-top:10px;font-size:14px;}
  .pv2-esito.ok{color:var(--verde);} .pv2-esito.ko{color:var(--rosso);}
  @media print{ .pv2-azioni,.pv2-avviso,.pv2-richieste,.pv2-stato{display:none !important;} }
  </style>`;
}
