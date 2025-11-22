// --- ROUTER SPA ---
document.addEventListener("DOMContentLoaded", () => {
  const views = document.querySelectorAll(".view");
  const buttons = document.querySelectorAll("[data-route]");

  function navigateTo(route) {
    views.forEach((v) => (v.style.display = "none"));

    const active = document.getElementById(`view-${route}`);
    if (active) {
      active.style.display = "block";
    }

    // scroll in alto alla vista
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

  // Recupera dal localStorage
  let timbrature = JSON.parse(localStorage.getItem("timbrature")) || [];

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

  aggiornaTabella();

  function registraTimbratura(tipo) {
    const dip = dipInput.value.trim();
    const canale = canaleSelect.value;

    if (!dip) {
      alert("Inserisci il nome del dipendente");
      return;
    }

    const ora = new Date().toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const record = {
      ora,
      dip,
      canale,
      tipo, // "Entra", "Pausa", "Uscita"
    };

    timbrature.push(record);
    localStorage.setItem("timbrature", JSON.stringify(timbrature));
    aggiornaTabella();
  }

  btnEntra.addEventListener("click", () => registraTimbratura("Entrata"));
  btnPausa.addEventListener("click", () => registraTimbratura("Pausa"));
  btnEsci.addEventListener("click", () => registraTimbratura("Uscita"));
});

