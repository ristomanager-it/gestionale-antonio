import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {

  const user = window.state.user;
  const aziendaAttiva = window.state.azienda;

  if (!user || !aziendaAttiva || aziendaAttiva.stato !== "piattaforma") {
    container.innerHTML = createPageLayout({
      title: "Accesso negato",
      content: createCard({
        body: "<p>Sezione riservata alla piattaforma.</p>"
      })
    });
    return;
  }

  const content = `
    <div style="display:flex;gap:26px;flex-wrap:wrap;align-items:center;margin-top:20px;">
      <canvas id="grafico-scadenze" width="200" height="200"></canvas>

      <div id="status-cards" style="flex:1;display:flex;gap:16px;flex-wrap:wrap;"></div>
    </div>

    <div id="lista-dettaglio" style="margin-top:24px;overflow:hidden;max-height:0;transition:max-height 0.4s ease;"></div>

    <div style="margin-top:30px;">
      <input
        id="search-input"
        class="input-pill"
        placeholder="Cerca azienda (min 2 caratteri)"
        style="font-size:16px;padding:12px 16px;"
      />
    </div>

    <div id="search-results" style="margin-top:16px;"></div>

    <div style="margin-top:28px;">
      <button class="app-button small gray" id="btn-home">⬅ Dashboard</button>
    </div>
  `;

  container.innerHTML = createPageLayout({
    title: "Gestione Aziende",
    subtitle: "Controllo stato attivazione e scadenze",
    content: createCard({ body: content })
  });

  document.getElementById("btn-home").onclick = () => {
    window.location.hash = "#/homePiattaforma";
  };

  // Ricerca live
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    if (q.length >= 2) cercaAziende(q);
    else document.getElementById("search-results").innerHTML = "";
  });

  await caricaStatoScadenzeAziende();
}

async function caricaStatoScadenzeAziende() {

  // Carica TUTTE le aziende, inclusa piattaforma — la escludiamo solo dal grafico
  const { data, error } = await supabase
    .from("aziende")
    .select("id,nome,data_scadenza,stato,stato_attivazione,profilo_completato")
    .order("nome");

  if (error || !data) return;

  // Escludi la piattaforma dal grafico scadenze
  const aziendeFiltrate = data.filter(az => az.stato !== "piattaforma");

  const oggi = new Date();
  oggi.setHours(0,0,0,0);

  const gruppi = { verde: [], giallo: [], rosso: [] };

  aziendeFiltrate.forEach((az) => {
    if (!az.data_scadenza) {
      gruppi.verde.push(az);
      return;
    }
    const scadenza = new Date(az.data_scadenza);
    scadenza.setHours(0,0,0,0);
    const diff = Math.floor((scadenza - oggi) / (1000*60*60*24));
    if (diff < 0) {
      gruppi.rosso.push({ ...az, giorni: diff });
    } else if (diff <= 15) {
      gruppi.giallo.push({ ...az, giorni: diff });
    } else {
      gruppi.verde.push({ ...az, giorni: diff });
    }
  });

  const totale = aziendeFiltrate.length || 1;
  const percentuali = {
    verde: Math.round((gruppi.verde.length / totale) * 100),
    giallo: Math.round((gruppi.giallo.length / totale) * 100),
    rosso: Math.round((gruppi.rosso.length / totale) * 100)
  };

  creaGrafico(percentuali);
  creaCardStato(gruppi, percentuali);
}

function creaGrafico(percentuali) {
  const canvas = document.getElementById("grafico-scadenze");
  const ctx = canvas.getContext("2d");
  const colori = { verde: "#16a34a", giallo: "#eab308", rosso: "#dc2626" };
  let start = 0;
  Object.keys(percentuali).forEach((key) => {
    const slice = (percentuali[key] / 100) * (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(100,100);
    ctx.arc(100,100,90,start,start+slice);
    ctx.closePath();
    ctx.fillStyle = colori[key];
    ctx.fill();
    start += slice;
  });
  ctx.beginPath();
  ctx.arc(100,100,60,0,Math.PI*2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

function creaCardStato(gruppi, percentuali) {
  const container = document.getElementById("status-cards");
  const dettaglio = document.getElementById("lista-dettaglio");
  container.innerHTML = "";

  const config = [
    { key:"verde", colore:"#16a34a", label:"Regolari" },
    { key:"giallo", colore:"#eab308", label:"In scadenza" },
    { key:"rosso", colore:"#dc2626", label:"Scadute" }
  ];

  config.forEach((c) => {
    const card = document.createElement("div");
    card.style.cssText = "flex:1;min-width:200px;padding:16px;border-radius:16px;background:#ffffff;box-shadow:0 8px 20px rgba(0,0,0,0.05);cursor:pointer;";
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:12px;height:12px;border-radius:50%;background:${c.colore};"></div>
          <strong>${c.label}</strong>
        </div>
        <span style="font-size:13px;color:#6b7280;">${percentuali[c.key]}%</span>
      </div>
      <div style="font-size:28px;margin-top:10px;">${gruppi[c.key].length}</div>
    `;
    card.onclick = () => mostraDettaglio(gruppi[c.key], c.label);
    container.appendChild(card);
  });

  function mostraDettaglio(lista, titolo) {
    dettaglio.innerHTML = createCard({
      title: titolo,
      body: '<div id="lista-interna"></div>'
    });

    const interno = document.getElementById("lista-interna");

    if (lista.length === 0) {
      interno.innerHTML = '<p class="small-muted">Nessuna azienda.</p>';
    } else {
      lista.forEach((az) => renderRigaAzienda(az, interno));
    }

    dettaglio.style.maxHeight = "1200px";
  }
}

async function cercaAziende(q) {
  const { data, error } = await supabase
    .from("aziende")
    .select("id,nome,stato,stato_attivazione,profilo_completato,data_scadenza")
    .ilike("nome", `%${q}%`)
    .order("nome")
    .limit(20);

  const container = document.getElementById("search-results");
  container.innerHTML = "";

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="small-muted">Nessun risultato.</p>';
    return;
  }

  const wrap = document.createElement("div");
  data.forEach(az => renderRigaAzienda(az, wrap));
  container.appendChild(wrap);
}

function renderRigaAzienda(az, parent) {
  const riga = document.createElement("div");
  riga.style.cssText = "display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:12px 0;border-bottom:1px solid #e5e7eb;";

  const oggi = new Date();
  oggi.setHours(0,0,0,0);
  let scadenzaTesto = "";
  if (az.data_scadenza) {
    const sc = new Date(az.data_scadenza);
    sc.setHours(0,0,0,0);
    const diff = Math.floor((sc - oggi) / (1000*60*60*24));
    scadenzaTesto = diff < 0
      ? ` — scaduta da ${Math.abs(diff)} giorni`
      : ` — scade tra ${diff} giorni`;
  }

  const bozza = !az.profilo_completato || az.stato_attivazione === "bozza";

  riga.innerHTML = `
    <div>
      <div style="font-size:15px;"><strong>${az.nome}</strong>${scadenzaTesto}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">
        Stato: ${az.stato}
        ${bozza ? ' &nbsp;|&nbsp; <span style="color:#f97316;">⚠ Profilo incompleto</span>' : ''}
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button class="btn-mini btn-open">Apri</button>
      <button class="btn-mini btn-edit">✏️ Modifica</button>
      <button class="btn-mini ${az.stato === "sospesa" ? "btn-green" : "btn-yellow"}">
        ${az.stato === "sospesa" ? "Riattiva" : "Sospendi"}
      </button>
      <button class="btn-mini btn-red btn-elimina">🗑 Elimina</button>
    </div>
  `;

  riga.querySelector(".btn-open").onclick = () => {
    window.location.hash = "#/completaAzienda?id=" + az.id;
  };

  riga.querySelector(".btn-edit").onclick = () => {
    window.location.hash = "#/modificaAzienda?id=" + az.id;
  };

  riga.querySelector(".btn-yellow, .btn-green").onclick = async () => {
    const nuovoStato = az.stato === "sospesa" ? "attiva" : "sospesa";
    if (!confirm(`Imposta azienda come "${nuovoStato}"?`)) return;
    const { error } = await supabase.from("aziende").update({ stato: nuovoStato }).eq("id", az.id);
    if (error) { alert("Errore aggiornamento stato."); return; }
    alert("Stato aggiornato.");
    window.router.reloadCurrentRoute();
  };

  riga.querySelector(".btn-elimina").onclick = async () => {
    if (!confirm(`⚠️ Elimina definitivamente "${az.nome}"?\n\nQuesta azione è irreversibile e rimuove anche utenti collegati, sedi e tutti i dati.`)) return;
    if (!confirm(`Seconda conferma: sei assolutamente sicuro di voler eliminare "${az.nome}"?`)) return;
    await eliminaAzienda(az.id, az.nome);
  };

  parent.appendChild(riga);
}

async function eliminaAzienda(aziendaId, nome) {
  try {
    // 1. Rimuovi link utenti
    await supabase.from("utenti_aziende").delete().eq("azienda_id", aziendaId);

    // 2. Rimuovi sedi
    await supabase.from("sedi").delete().eq("azienda_id", aziendaId);

    // 3. Rimuovi l'azienda
    const { error } = await supabase.from("aziende").delete().eq("id", aziendaId);

    if (error) throw error;

    alert(`Azienda "${nome}" eliminata.`);
    window.router.reloadCurrentRoute();

  } catch (err) {
    alert("Errore eliminazione: " + (err.message || err));
  }
}
