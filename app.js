document.addEventListener("DOMContentLoaded", () => {
  // --- ROUTER SPA ---
  const views = document.querySelectorAll(".view");
  const buttons = document.querySelectorAll("[data-route]");

  function navigateTo(route) {
    views.forEach((v) => (v.style.display = "none"));

    const active = document.getElementById(`view-${route}`);
    if (active) {
      active.style.display = "block";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.getAttribute("data-route");
      window.location.hash = route;
      navigateTo(route);
    });
  });

  window.addEventListener("hashchange", () => {
    const route = window.location.hash.replace("#", "");
    navigateTo(route);
  });

  const initialRoute = window.location.hash.replace("#", "") || "timbratura";
  navigateTo(initialRoute);

  // --- TIMBRATURA ---

  const dipInput = document.getElementById("timbratura-dipendente");
  const canaleSelect = document.getElementById("timbratura-canale");
  const lista = document.getElementById("timbratura-lista");

  const btnEntra = document.getElementById("btn-entra");
  const btnPausa = document.getElementById("btn-pausa");
  const btnEsci = document.getElementById("btn-esci");

  const riepilogoDipEl = document.getElementById("riepilogo-dipendenti");
  const riepilogoCanaliEl = document.getElementById("riepilogo-canali");
  const attiviListaEl = document.getElementById("attivi-lista");

  // Carica timbrature dal localStorage e garantisce un timestamp per tutte
  let timbratureRaw = JSON.parse(localStorage.getItem("timbrature")) || [];
  let timbrature = timbratureRaw.map((t) => {
    // Se manca il timestamp (vecchia versione), lo metto "adesso"
    if (!t.timestamp) {
      const now = Date.now();
      return { ...t, timestamp: now };
    }
    return t;
  });

  function formatDurationMinutes(totalMinutes) {
    const ore = Math.floor(totalMinutes / 60);
    const min = Math.round(totalMinutes % 60);
    return `${ore}h ${min.toString().padStart(2, "0")}m`;
  }

  function aggiornaTabella() {
    lista.innerHTML = "";

    timbrature.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.ora}</td>
        <td>${t.dip}</td>
        <td>${t.canale}</td>
        <td>${t.tipo}</td>
      `;
      lista.appendChild(tr);
    });
  }

  function aggiornaRiepilogo() {
    if (!riepilogoDipEl || !riepilogoCanaliEl || !attiviListaEl) return;

    const perDip = {}; // "dip|canale" -> minuti
    const perCanale = {}; // canale -> minuti
    const ultimoEventoPerChiave = {}; // "dip|canale" -> ultimo evento
    const adesso = Date.now();

    // Raggruppa eventi per dipendente+canale
    const eventsByKey = {};
    timbrature.forEach((t) => {
      const key = `${t.dip}|${t.canale}`;
      if (!eventsByKey[key]) eventsByKey[key] = [];
      eventsByKey[key].push(t);
    });

    Object.entries(eventsByKey).forEach(([key, events]) => {
      const [dip, canale] = key.split("|");

      // Ordina per timestamp
      events.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      let aperto = null;

      events.forEach((ev) => {
        ultimoEventoPerChiave[key] = ev;

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
        } else if (ev.tipo === "Pausa") {
          // per ora la pausa non incide sul conteggio,
          // ma potremmo in futuro chiudere/riaprire il turno qui
        }
      });

      // Se il turno è ancora aperto, aggiungo la durata fino ad ora
      if (aperto && aperto.timestamp) {
        const diffMin = (adesso - aperto.timestamp) / 60000;
        if (diffMin > 0) {
          perDip[key] = (perDip[key] || 0) + diffMin;
          perCanale[canale] = (perCanale[canale] || 0) + diffMin;
        }
      }
    });

    // Riepilogo per dipendente
    riepilogoDipEl.innerHTML = "";
    Object.entries(perDip).forEach(([key, minuti]) => {
      const [dip, canale] = key.split("|");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dip}</td>
        <td>${canale}</td>
        <td>${formatDurationMinutes(minuti)}</td>
      `;
      riepilogoDipEl.appendChild(tr);
    });

    // Riepilogo per canale
    riepilogoCanaliEl.innerHTML = "";
    Object.entries(perCanale).forEach(([canale, minuti]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${canale}</td>
        <td>${formatDurationMinutes(minuti)}</td>
      `;
      riepilogoCanaliEl.appendChild(tr);
    });

    // Attivi adesso: ultimo evento = Entrata
    attiviListaEl.innerHTML = "";
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
  }

  function salvaEaggiorna() {
    localStorage.setItem("timbrature", JSON.stringify(timbrature));
    aggiornaTabella();
    aggiornaRiepilogo();
  }

  // Prima visualizzazione
  aggiornaTabella();
  aggiornaRiepilogo();

  function registraTimbratura(tipo) {
    const dip = dipInput.value.trim();
    const canale = canaleSelect.value;

    if (!dip) {
      alert("Inserisci il nome del dipendente");
      return;
    }

    const now = new Date();
    const ora = now.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const record = {
      ora,
      dip,
      canale,
      tipo, // "Entrata", "Pausa", "Uscita"
      timestamp: now.getTime(),
    };

    timbrature.push(record);
    salvaEaggiorna();
  }

  btnEntra.addEventListener("click", () => registraTimbratura("Entrata"));
  btnPausa.addEventListener("click", () => registraTimbratura("Pausa"));
  btnEsci.addEventListener("click", () => registraTimbratura("Uscita"));
});

