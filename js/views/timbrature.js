// views/timbrature.js
import { getGeofence } from "../utils/geofence.js";

export async function render(app) {
  const user = window.state?.user;
  const azienda = window.state?.azienda;
  const dipendente = window.state?.user; // Assume che lo user è il dipendente

  // Funzione per calcolare la distanza tra due punti
  const calcolaDistanza = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raggio della Terra in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanza = R * c * 1000; // Distanza in metri
    return distanza;
  };

  // Funzione per gestire la timbratura
  const timbra = async (azione) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        const geofence = await getGeofence(azienda.id); // Ottieni geofence aziendale

        const distanza = calcolaDistanza(lat, lon, geofence.lat, geofence.lon);

        const esitoValidazione = distanza <= geofence.raggio_m;

        // Salva la timbratura in Supabase
        await window.supabaseClient
          .from("timbrature")
          .insert([
            {
              dipendente_id: dipendente.id,
              azienda_id: azienda.id,
              tipo: azione,
              latitudine: lat,
              longitudine: lon,
              precisione: accuracy,
              esito_validazione: esitoValidazione,
              motivo_validazione: esitoValidazione ? "Validato" : `Fuori dal geofence (${distanza} m)`,
              timestamp: new Date().toISOString(),
            },
          ])
          .then(() => {
            // Ricarica la pagina o aggiorna il contenuto
            window.location.hash = "#/timbrature";
          })
          .catch((error) => {
            console.error("Errore nel salvataggio della timbratura:", error);
          });
      });
    } else {
      alert("Geolocalizzazione non supportata.");
    }
  };

  // Verifica se il dipendente è già in turno, pausa, o fuori turno
  const ultimoStato = await window.supabaseClient
    .from("timbrature")
    .select("tipo, timestamp")
    .eq("dipendente_id", dipendente.id)
    .eq("azienda_id", azienda.id)
    .order("timestamp", { ascending: false })
    .limit(1);

  let stato = "Fuori turno";
  let pulsanteTesto = "Entrata";

  if (ultimoStato.data && ultimoStato.data.length > 0) {
    const ultimo = ultimoStato.data[0];
    if (ultimo.tipo === "inizio_turno") {
      stato = "In turno";
      pulsanteTesto = "Fine Turno";
    } else if (ultimo.tipo === "inizio_pausa") {
      stato = "In pausa";
      pulsanteTesto = "Rientro da Pausa";
    }
  }

  // Render del componente
  app.innerHTML = `
    <div class="timbratura-container">
      <h1>Timbrature</h1>
      <p>Stato attuale: ${stato}</p>
      <button id="timbratura-btn">${pulsanteTesto}</button>
      <div id="timbrature-list"></div>
    </div>
  `;

  document.getElementById("timbratura-btn").addEventListener("click", () => {
    timbra(pulsanteTesto === "Entrata" ? "inizio_turno" : pulsanteTesto === "Rientro da Pausa" ? "fine_pausa" : "fine_turno");
  });

  // Mostra l'elenco delle ultime timbrature
  const timbrature = await window.supabaseClient
    .from("timbrature")
    .select("tipo, timestamp")
    .eq("dipendente_id", dipendente.id)
    .eq("azienda_id", azienda.id)
    .order("timestamp", { ascending: false })
    .limit(5);

  const listaTimbrature = timbrature.data.map((t) => {
    return `
      <div>
        <strong>${t.tipo}</strong> - ${new Date(t.timestamp).toLocaleString()}
      </div>
    `;
  }).join("");

  document.getElementById("timbrature-list").innerHTML = listaTimbrature;
}
