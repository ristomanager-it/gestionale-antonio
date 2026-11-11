let preventiviCache = [];
let filteredPreventivi = [];
// lista corta: di base solo gli eventi da fare e quelli senza data; i passati si aprono a parte o si trovano cercando
let cercando = false;
let mostraPassati = false;

export async function render(app) {

  app.innerHTML = `
    <section class="view">

      <div style="margin-bottom:12px;">
        <button class="app-button small gray"
          onclick="window.location.hash='#/home'">
          ← Torna alla Home
        </button>
      </div>

      <h2>📑 Preventivi</h2>

      <div id="prev-dal-sito"></div>
      <div id="prev-bozze"></div>

      <!-- Barra di ricerca -->
      <div style="margin-bottom: 20px;">
        <input type="text" id="search-preventivi" placeholder="🔎 Cerca per nome, evento o data (es. 18/09)" class="input-pill" style="width: 100%; max-width: 400px;">
      </div>

      <!-- Pulsante Crea Nuovo Preventivo -->
      <div style="margin-bottom: 20px;">
        <button class="app-button large green"
          onclick="window.location.hash='#/creaPreventivo'">
          + Crea Nuovo Preventivo
        </button>
      </div>

      <div id="preventivi-list"></div> <!-- Qui visualizzeremo la lista dei preventivi -->

    </section>
  `;

  // Carichiamo i preventivi
  await loadPreventivi();
  richiesteDalSito();
  bozzeOnline();

  // Aggiungi evento di ricerca
  const searchInput = document.getElementById("search-preventivi");
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    filterPreventivi(searchTerm);
  });
}

/* ============================================================ */
/* RIQUADRO "RICHIESTE DAL SITO" (matrimoni, eventi, viaggi)     */
/* ============================================================ */
async function richiesteDalSito() {
  const box = document.getElementById("prev-dal-sito");
  if (!box) return;
  const sb = window.supabaseClient || window.supabase;
  try {
    const [w, t] = await Promise.all([
      sb.from("wedding_richieste").select("id", { count: "exact", head: true }).eq("stato", "nuova"),
      sb.from("tour_prenotazioni").select("id", { count: "exact", head: true }).in("stato", ["bonifico_in_attesa", "richiesta_info"]),
    ]);
    const n = (w.count || 0) + (t.count || 0);
    box.innerHTML = '<a href="#/richieste-sito" style="display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:0 0 16px;text-decoration:none;color:#0f172a">'
      + '<span><b>🌍 Richieste dal sito</b><span style="display:block;font-size:13px;color:#64748b">' + (n ? n + (n === 1 ? " da gestire" : " da gestire") : "Matrimoni, eventi e viaggi che arrivano dalle vostre pagine") + '</span></span>'
      + (n ? '<span style="background:#dc2626;color:#fff;border-radius:999px;padding:2px 9px;font-weight:700">' + n + '</span>' : '<span style="color:#023C59;font-weight:700">→</span>') + '</a>';
  } catch (_) { box.innerHTML = ""; }
}

/* ============================================================ */
/* PREVENTIVI ONLINE IN BOZZA: iniziati sul sito e non salvati    */
/* ============================================================ */
// Il cliente ha composto (anche in parte) il preventivo sul sito ma non l'ha salvato:
// qui si vede cosa aveva scelto, per richiamarlo con una proposta diversa.
async function bozzeOnline() {
  const box = document.getElementById("prev-bozze");
  if (!box) return;
  const sb = window.supabaseClient || window.supabase;
  const az = window.state?.azienda?.id;
  if (!az) return;
  const dal = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data, error } = await sb.from("preventivi_online_bozze")
    .select("id, nomi, email, telefono, tipo, invitati, data_testo, location, scelte, totale, totale_pieno, ultimo_passo, passi_fatti, passi_totali, utm_source, updated_at")
    .eq("azienda_id", az).eq("completata", false).eq("gestita", false).gte("updated_at", dal)
    .order("updated_at", { ascending: false }).limit(50);
  if (error || !data || !data.length) { box.innerHTML = ""; return; }
  const e = (x) => String(x == null ? "" : x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const eur = (n) => Number(n).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const quando = (t) => new Date(t).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
  const giorno = (t) => !t ? "data da definire" : /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(t + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" }) : t;
  const wa = (t) => { let n = String(t || "").replace(/[^0-9]/g, ""); if (n && n.length <= 10) n = "39" + n; return n; };
  const scheda = (b) => {
    const arrivo = b.ultimo_passo === "riepilogo" ? "ha visto il prezzo finale"
      : b.ultimo_passo && b.ultimo_passo !== "inizio" ? "fermo a: " + e(b.ultimo_passo) + (b.passi_totali ? " (" + b.passi_fatti + "/" + b.passi_totali + ")" : "")
      : "ha messo solo i dati iniziali";
    const scelte = (b.scelte || []).map((z) => '<div style="margin:4px 0"><b style="font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#64748b">' + e(z.passo) + "</b><div>" + (z.voci || []).map(e).join(", ") + "</div></div>").join("");
    const tel = b.telefono ? '<a class="app-button small" href="tel:' + e(b.telefono) + '">📞 Chiama</a> <a class="app-button small" target="_blank" href="https://wa.me/' + wa(b.telefono) + '">💬 WhatsApp</a> ' : "";
    const mail = b.email ? '<a class="app-button small" href="mailto:' + e(b.email) + '">✉️ Email</a> ' : "";
    return '<div style="border-top:1px solid #f1f5f9;padding:10px 0">'
      + '<div style="display:flex;justify-content:space-between;gap:8px"><b>' + e(b.nomi || "Senza nome") + '</b><span style="font-size:12px;color:#64748b;white-space:nowrap">' + quando(b.updated_at) + "</span></div>"
      + '<div style="font-size:13px;color:#334155">' + [b.tipo, b.invitati ? b.invitati + " invitati" : "", giorno(b.data_testo), b.location].filter(Boolean).map(e).join(" · ") + "</div>"
      + '<div style="font-size:13px;color:' + (b.ultimo_passo === "riepilogo" ? "#b45309" : "#64748b") + '">' + arrivo + (b.totale ? " · prezzo visto " + eur(b.totale) : "") + (b.utm_source ? " · da " + e(b.utm_source) : "") + "</div>"
      + (scelte ? '<details style="margin-top:6px"><summary style="font-size:13px;cursor:pointer">Cosa aveva scelto</summary><div style="font-size:13.5px;margin-top:4px">' + scelte + "</div></details>" : "")
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' + tel + mail + '<button class="app-button small gray" data-bozza-fatta="' + e(b.id) + '">✓ Richiamato</button></div>'
      + "</div>";
  };
  box.innerHTML = '<details style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:0 0 16px">'
    + '<summary style="display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none">'
    + '<span><b>🌐 Preventivi online in bozza</b><span style="display:block;font-size:13px;color:#64748b">Iniziati sul sito e non salvati: cosa avevano scelto</span></span>'
    + '<span style="background:#f59e0b;color:#fff;border-radius:999px;padding:2px 9px;font-weight:700">' + data.length + "</span></summary>"
    + data.map(scheda).join("") + "</details>";
  box.onclick = async (ev) => {
    const btn = ev.target.closest("[data-bozza-fatta]");
    if (!btn) return;
    btn.disabled = true;
    const { error: er } = await sb.from("preventivi_online_bozze").update({ gestita: true }).eq("id", btn.getAttribute("data-bozza-fatta"));
    if (er) { btn.disabled = false; alert(er.message); return; }
    bozzeOnline();
  };
}

/* ============================================================ */
/* LOAD PREVENTIVI */
/* ============================================================ */

async function loadPreventivi() {

  const supabase = window.supabaseClient;
  const aziendaId = window.state?.azienda?.id;

  if (!aziendaId) {
    console.warn("Nessuna azienda attiva per i preventivi");
    preventiviCache = [];
    return;
  }

  const { data, error } = await supabase
    .from("preventivi")
    .select(`
      id,
      titolo_evento,
      data_evento,
      totale,
      stato,
      n_invitati,
      cliente_nome,
      cliente_cognome,
      cliente_telefono,
      cliente2_nome,
      cliente2_cognome,
      scadenza_il,
      confermato_il,
      costo_stimato,
      costo_lavoro,
      cliente_id (
        nome,
        cognome
      )
    `)
    .eq("azienda_id", aziendaId)  // Filtro per azienda
    .order("data_evento", { ascending: true });

  if (error) {
    console.error("Errore caricamento preventivi:", error);
    preventiviCache = [];
    return;
  }

  preventiviCache = data || [];
  filteredPreventivi = preventiviCache;  // Inizialmente visualizziamo tutti i preventivi

  renderPreventiviList();
}

/* ============================================================ */
/* FILTRARE I PREVENTIVI IN BASE AL TERMINE DI RICERCA */
/* ============================================================ */

function filterPreventivi(searchTerm) {
  // si cerca su tutto quello che si legge nella riga: il nome scritto sul preventivo (non solo il cliente collegato
  // in anagrafica), il secondo intestatario, evento, telefono, stato e data. Senza accenti, e piu' parole insieme:
  // "paola lanchi" trova Paola Lanchi anche se nome e cognome stanno in campi diversi.
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const termini = norm(searchTerm).split(/\s+/).filter(Boolean);
  cercando = termini.length > 0;

  filteredPreventivi = preventiviCache.filter((p) => {
    const iso = p.data_evento ? String(p.data_evento).slice(0, 10) : "";
    const dataIt = iso ? iso.split("-").reverse().join("/") : "";
    const dataLoc = iso ? new Date(iso + "T12:00:00").toLocaleDateString() : "";
    const testo = norm([
      p.cliente_nome, p.cliente_cognome, p.cliente2_nome, p.cliente2_cognome,
      p.cliente_id ? p.cliente_id.nome : "", p.cliente_id ? p.cliente_id.cognome : "",
      p.titolo_evento, p.cliente_telefono, p.stato, iso, dataIt, dataLoc,
    ].join(" "));
    return termini.every((x) => testo.includes(x));
  });

  renderPreventiviList();
}

/* ============================================================ */
/* RENDER LISTA PREVENTIVI */
/* ============================================================ */

function renderPreventiviList() {
  const preventiviListContainer = document.getElementById("preventivi-list");
  if (!preventiviListContainer) return;

  if (!filteredPreventivi.length) {
    preventiviListContainer.innerHTML = `
      <p class="small-muted">Nessun preventivo trovato.</p>
    `;
    return;
  }

  const oggi = new Date().toISOString().slice(0, 10);

  const html = filteredPreventivi
    .map((p) => {
      // il nome sta quasi sempre sul preventivo, non nell'anagrafica collegata:
      // prima si leggeva solo cliente_id e usciva "Senza cliente"
      const clienteNome = [p.cliente_nome, p.cliente_cognome].filter(Boolean).join(" ")
        || (p.cliente_id ? `${p.cliente_id.nome || ""} ${p.cliente_id.cognome || ""}`.trim() : "")
        || "Cliente da completare";

      const dataEvento = p.data_evento
        ? new Date(p.data_evento + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long" })
        : "data da fissare";

      const totale = Number(p.totale || 0);
      const costi = Number(p.costo_stimato || 0) + Number(p.costo_lavoro || 0);
      const margine = totale - costi;
      const marginePerc = totale > 0 ? Math.round((margine / totale) * 100) : null;

      const scaduto = p.stato === "inviato" && p.scadenza_il && String(p.scadenza_il).slice(0, 10) < oggi;
      const colore = p.confermato_il ? "#16a34a" : (scaduto ? "#dc2626" : (p.stato === "inviato" ? "#f59e0b" : "#94a3b8"));
      const statoTxt = p.confermato_il ? "confermato" : (scaduto ? "scaduto" : (p.stato || "bozza"));

      return `
        <div class="preventivo-list-item" data-id="${p.id}"
          style="background:#fff;border:1px solid #e5e7eb;border-left:5px solid ${colore};
                 border-radius:14px;padding:14px 16px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:flex-start;">
            <div style="min-width:0;flex:1;">
              <div style="font-weight:800;font-size:16px;line-height:1.3;">
                ${p.titolo_evento || "(evento senza nome)"}
              </div>
              <div style="color:#64748b;font-size:14px;margin-top:3px;">
                ${dataEvento}${p.n_invitati ? " · " + p.n_invitati + " invitati" : ""}
              </div>
              <div style="color:#64748b;font-size:14px;margin-top:2px;">
                ${clienteNome}${p.cliente_telefono ? " · " + p.cliente_telefono : ""}
              </div>
              <div style="margin-top:8px;display:flex;gap:14px;flex-wrap:wrap;align-items:baseline;">
                <span style="font-size:19px;font-weight:800;">€ ${totale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                ${marginePerc !== null && costi > 0
                  ? `<span style="font-size:13px;color:${margine > 0 ? "#166534" : "#b91c1c"};font-weight:700;">
                       margine ${marginePerc}% · € ${margine.toLocaleString("it-IT", { maximumFractionDigits: 0 })}</span>`
                  : `<span style="font-size:13px;color:#b45309;">costi non stimati</span>`}
                <span style="background:${colore}1a;color:${colore};padding:2px 10px;border-radius:999px;
                             font-size:12px;font-weight:700;">${statoTxt}</span>
              </div>
            </div>
            <button class="app-button small" data-apri="${p.id}" style="flex:none;">Apri</button>
          </div>
        </div>
      `;
    })
    .join('');

  preventiviListContainer.innerHTML = html;

  const apri = (id) => { window.location.hash = '#/creaPreventivo?id=' + id; };

  preventiviListContainer.querySelectorAll('[data-apri]').forEach((b) => {
    b.addEventListener('click', (e) => { e.stopPropagation(); apri(Number(b.dataset.apri)); });
  });

  preventiviListContainer.querySelectorAll('.preventivo-list-item').forEach((el) => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => apri(Number(el.getAttribute('data-id'))));
  });
}

/* ============================================================ */
/* VISUALIZZAZIONE DETTAGLI PREVENTIVO */
/* ============================================================ */

async function openPreventivo(preventivoId) {
  // Funzione per caricare e mostrare i dettagli di un preventivo
  const supabase = window.supabaseClient;

  const { data: preventivo, error } = await supabase
    .from('preventivi')
    .select('*')
    .eq('id', preventivoId)
    .single();

  if (error || !preventivo) {
    alert('Preventivo non trovato.');
    return;
  }

  // Render dettagli preventivo
  const app = document.getElementById('app');
  app.innerHTML = `
    <section class="view">
      <h2>Preventivo #${preventivoId}</h2>
      <p><strong>Cliente:</strong> ${preventivo.cliente_id.nome} ${preventivo.cliente_id.cognome}</p>
      <p><strong>Data evento:</strong> ${new Date(preventivo.data_evento).toLocaleDateString()}</p>
      <p><strong>Totale:</strong> € ${preventivo.totale}</p>
      <button class="app-button small gray" onclick="window.location.hash='#/preventivi'">← Indietro</button>
    </section>
  `;
}
