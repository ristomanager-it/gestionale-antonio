/* views/timbrature.js */

// Funzione per caricare le timbrature da Supabase
async function caricaTimbratureDaSupabase() {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("timbrature")
    .select("*")
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("Errore caricamento timbrature:", error);
    alert("Errore nel caricare le timbrature da Supabase");
    return;
  }

  timbrature = (data || []).map((row) => ({
    id: row.id,
    dipendente_id: row.dipendente_id || null,
    dip: row.dip_nome,
    canale: row.canale,
    tipo: row.tipo,
    ora: row.ora,
    timestamp: row.timestamp ? new Date(row.timestamp).getTime() : null,
  }));

  aggiornaTabellaTimbrature();
  aggiornaRiepilogo();
}

// Funzione per formattare la durata in ore e minuti
function formatDurationMinutes(totalMinutes) {
  const ore = Math.floor(totalMinutes / 60);
  const min = Math.round(totalMinutes % 60);
  return `${ore}h ${min.toString().padStart(2, "0")}m`;
}

// Funzione per aggiornare la tabella delle timbrature
function aggiornaTabellaTimbrature() {
  if (!lista) return;
  lista.innerHTML = "";

  timbrature.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.ora || ""}</td>
      <td>${t.dip}</td>
      <td>${t.canale}</td>
      <td>${t.tipo}</td>
    `;
    lista.appendChild(tr);
  });
}

// Funzione per ottenere lo stato corrente di un dipendente
function getStatoCorrenteDipendente(nomeDip) {
  const eventiDip = timbrature
    .filter((t) => t.dip === nomeDip && t.timestamp)
    .sort((a, b) => a.timestamp - b.timestamp);

  let inside = false;
  let canaleCorrente = null;

  for (const ev of eventiDip) {
    if (ev.tipo === "Entrata") {
      inside = true;
      canaleCorrente = ev.canale;
    } else if (ev.tipo === "Uscita") {
      inside = false;
      canaleCorrente = null;
    }
  }

  return { inside, canaleCorrente };
}

// Funzione per aggiornare la lista delle presenze dei dipendenti
function aggiornaPresenzeDipendenti() {
  if (!presenzeListaEl) return;

  presenzeListaEl.innerHTML = "";

  dipendenti.forEach((d) => {
    if (!d || !d.nome) return;
    const stato = getStatoCorrenteDipendente(d.nome);
    const inside = stato.inside;
    const canale = inside ? stato.canaleCorrente || "-" : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.nome}</td>
      <td>${canale}</td>
      <td>${inside ? "Dentro" : "Fuori"}</td>
    `;
    presenzeListaEl.appendChild(tr);
  });
}

// Funzione per aggiornare il riepilogo delle presenze
function aggiornaRiepilogo() {
  if (
    !riepilogoDipEl ||
    !riepilogoCanaliEl ||
    !attiviListaEl ||
    !costoDipEl ||
    !costoCanaliEl
  )
    return;

  const perDip = {};
  const perCanale = {};

  const adessoDate = new Date();
  const adesso = adessoDate.getTime();

  const startGiorno = new Date(adessoDate);
  startGiorno.setHours(0, 0, 0, 0);

  const startSettimana = new Date(startGiorno);
  const day = startSettimana.getDay() || 7;
  startSettimana.setDate(startSettimana.getDate() - (day - 1));

  const startMese = new Date(
    adessoDate.getFullYear(),
    adessoDate.getMonth(),
    1
  );
  startMese.setHours(0, 0, 0, 0);

  let startPeriodoMs = startGiorno.getTime();
  if (periodoCorrente === "settimana")
    startPeriodoMs = startSettimana.getTime();
  if (periodoCorrente === "mese") startPeriodoMs = startMese.getTime();

  const eventiPeriodo = timbrature.filter((t) => {
    if (!t.timestamp) return false;
    const ts = t.timestamp;
    return ts >= startPeriodoMs && ts <= adesso;
  });

  const eventsByKey = {};
  eventiPeriodo.forEach((t) => {
    const key = `${t.dip}|${t.canale}`;
    if (!eventsByKey[key]) eventsByKey[key] = [];
    eventsByKey[key].push(t);
  });

  Object.entries(eventsByKey).forEach(([key, events]) => {
    const [dip, canale] = key.split("|");
    events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    let aperto = null;

    events.forEach((ev) => {
      if (!ev.timestamp) return;

      if (ev.tipo === "Entrata") {
        aperto = ev;
      } else if (ev.tipo === "Uscita") {
        if (aperto && aperto.timestamp) {
          const diffMin = (ev.timestamp - aperto.timestamp) / 60000;
          if (diffMin > 0) {
            perDip[key] = (perDip[key] || 0) + diffMin;
            perCanale[canale] = (perCanale[canale] || 0) + diffMin;
          }
        }
        aperto = null;
      }
    });

    if (aperto && aperto.timestamp) {
      const diffMin = (adesso - aperto.timestamp) / 60000;
      if (diffMin > 0) {
        perDip[key] = (perDip[key] || 0) + diffMin;
        perCanale[canale] = (perCanale[canale] || 0) + diffMin;
      }
    }
  });

  const costoPerDip = {};
  const costoPerCanale = {};

  Object.entries(perDip).forEach(([key, minuti]) => {
    const [nome, canale] = key.split("|");
    const dip = dipendenti.find((d) => d.nome === nome);
    const costoOrario = dip?.costoOrario || 0;
    const ore = minuti / 60;
    const costo = ore * costoOrario;
    costoPerDip[key] = costo;
    costoPerCanale[canale] = (costoPerCanale[canale] || 0) + costo;
  });

  riepilogoDipEl.innerHTML = "";
  Object.entries(perDip).forEach(([key, minuti]) => {
    const [nome, canale] = key.split("|");
    const ore = minuti / 60;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nome}</td>
      <td>${canale}</td>
      <td>${ore.toFixed(2)}</td>
    `;
    riepilogoDipEl.appendChild(tr);
  });

  riepilogoCanaliEl.innerHTML = "";
  Object.entries(perCanale).forEach(([canale, minuti]) => {
    const ore = minuti / 60;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${canale}</td>
      <td>${ore.toFixed(2)}</td>
    `;
    riepilogoCanaliEl.appendChild(tr);
  });

  costoDipEl.innerHTML = "";
  Object.entries(perDip).forEach(([key, minuti]) => {
    const [nome, canale] = key.split("|");
    const ore = minuti / 60;
    const costo = costoPerDip[key] || 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nome}</td>
      <td>${canale}</td>
      <td>${ore.toFixed(2)}</td>
      <td>${costo.toFixed(2)}</td>
    `;
    costoDipEl.appendChild(tr);
  });

  costoCanaliEl.innerHTML = "";
  Object.entries(costoPerCanale).forEach(([canale, costo]) => {
    const minuti = perCanale[canale] || 0;
    const ore = minuti / 60;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${canale}</td>
      <td>${ore.toFixed(2)}</td>
      <td>${costo.toFixed(2)}</td>
    `;
    costoCanaliEl.appendChild(tr);
  });

  attiviListaEl.innerHTML = "";
  const ultimoEventoPerChiave = {};
  timbrature.forEach((t) => {
    const key = `${t.dip}|${t.canale}`;
    if (
      !ultimoEventoPerChiave[key] ||
      (t.timestamp || 0) > (ultimoEventoPerChiave[key].timestamp || 0)
    ) {
      ultimoEventoPerChiave[key] = t;
    }
  });

  Object.entries(ultimoEventoPerChiave).forEach(([key, ev]) => {
    if (ev.tipo === "Entrata" && ev.timestamp) {
      const [dip, canale] = key.split("|");
      const durataMin = (adesso - ev.timestamp) / 60000;
      const durataTxt = formatDurationMinutes(durataMin);

      const oraDa = new Date(ev.timestamp).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dip}</td>
        <td>${canale}</td>
        <td>${oraDa}</td>
        <td>${durataTxt}</td>
      `;
      attiviListaEl.appendChild(tr);
    }
  });

  aggiornaPresenzeDipendenti();
}

// Funzione per rendere visibili i pulsanti grandi e colorati
function renderPulsantiStato() {
  const container = document.getElementById("pulsanti-timbratura");
  container.innerHTML = `
    <button id="btn-entrata" class="btn-large green">Entrata 🟢</button>
    <button id="btn-pausa" class="btn-large gray">Inizia Pausa ⏸️</button>
    <button id="btn-fine" class="btn-large red">Fine Turno ❌</button>
  `;

  document.getElementById("btn-entrata").addEventListener("click", () => {
    registraTimbratura("Entrata");
  });

  document.getElementById("btn-pausa").addEventListener("click", () => {
    registraTimbratura("Pausa");
  });

  document.getElementById("btn-fine").addEventListener("click", () => {
    registraTimbratura("Uscita");
  });
}

// Funzione per aggiornare la visibilità e stato attuale dei dipendenti
function aggiornaStatoDipendenti() {
  const statoDipendentiEl = document.getElementById("stato-dipendenti");
  statoDipendentiEl.innerHTML = "";
  dipendenti.forEach((dipendente) => {
    const stato = getStatoCorrenteDipendente(dipendente.nome);
    const statoTesto = stato.inside ? "Dentro" : "Fuori";
    const canale = stato.canaleCorrente || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dipendente.nome}</td>
      <td>${canale}</td>
      <td>${statoTesto}</td>
    `;
    statoDipendentiEl.appendChild(tr);
  });
}

// Funzione per mostrare il riepilogo con il tempo lavorato
function aggiornaRiepilogo() {
  const riepilogoEl = document.getElementById("riepilogo-lavoro");
  riepilogoEl.innerHTML = "";

  timbrature.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.dip}</td>
      <td>${t.canale}</td>
      <td>${t.tipo}</td>
      <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
    `;
    riepilogoEl.appendChild(tr);
  });
}

// Visualizza pulsanti
renderPulsantiStato();
aggiornaStatoDipendenti();
aggiornaRiepilogo();
