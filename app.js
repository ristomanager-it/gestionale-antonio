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

  let timbrature = JSON.parse(localStorage.getItem("timbrature")) || [];

  // Se ci sono vecchie timbrature senza timestamp, le lasciamo ma non le usiamo per i calcoli
  function ensureTimestamp(record) {
    if (!record.timestamp) {
      // non possiamo sapere l'orario preciso, quindi saltiamo per i calcoli
      return null;
    }
    return record;
  }

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

    // Mappe per calcoli
    const perDip = {}; // chiave: dip|canale -> minuti
    const perCanale = {}; // chiave: canale -> minuti
    const ultimoEventoPerChiave = {}; // per sapere chi è dentro
    const adesso = Date.now();

    // Raggruppiamo per dipendente+canale
    const eventsByKey = {};
    timbrature.forEach((t) => {
      const rec = ensureTimestamp(t);
      const key = `${t.dip}|${t.canale}`;
      if (!eventsByKey[key]) eventsByKey[key] = [];
      eventsByKey[key].push({ ...t, timestamp: rec ? rec.timestamp : null });
    });

    Object.entries(eventsByKey).forEach(([key, events]) => {
      // Ordiniamo per timestamp (se manca, sta in fondo)
      events.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return a.timestamp - b.timestamp;
      });

      const [dip, canale] = key.split("|");

      let aperto = null;

      events.forEach((ev) => {
        // memorizziamo ultimo evento per sapere chi è dentro
        ultimoEventoPerChiave[key] = ev;

        if (!ev.timestamp) return; // saltiamo se non abbiamo timestamp

        if (ev.tipo === "Entrata") {
          // apre turno
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
          // se vuoi, potremmo chiudere il turno qui, per ora la ignoro per durata
        }
      });

      // Se c'è un turno aperto in questo momento (Entrata senza Uscita),
      // possiamo anche considerare la durata "fino ad adesso" se vuoi.
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

    // Attivi adesso
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

