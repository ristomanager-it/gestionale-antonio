// js/locali.js
(function () {
  const supabase = window.supabaseClient;
  const AppState = window.AppState;

  const localeSelect = document.getElementById("locale-select");

  // =========================
  // CARICA LOCALI PER AZIENDA
  // =========================
  async function caricaLocaliPerAzienda(aziendaId) {
    const { data, error } = await supabase
      .from("locali")
      .select("*")
      .eq("azienda_id", aziendaId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento locali:", error);
      return [];
    }

    return data || [];
  }

  // =========================
  // POPOLA SELECT
  // =========================
  function popolaSelectLocali(locali) {
    if (!localeSelect) return;

    localeSelect.innerHTML = "";

    locali.forEach((loc) => {
      const opt = document.createElement("option");
      opt.value = loc.id;
      opt.textContent = loc.nome;
      localeSelect.appendChild(opt);
    });

    localeSelect.onchange = () => {
      const localeId = Number(localeSelect.value);
      const locale = locali.find((l) => l.id === localeId);
      if (locale) {
        AppState.setCurrentLocale(locale);
        console.log("📍 Locale attivo:", locale.nome);
      }
    };
  }

  // =========================
  // INIZIALIZZAZIONE
  // =========================
  async function initLocali() {
    const user = AppState.getCurrentUser();
    if (!user || !user.azienda_id) return;

    const locali = await caricaLocaliPerAzienda(user.azienda_id);

    if (locali.length === 0) {
      alert("Nessun locale associato all’azienda");
      return;
    }

    // 1 solo locale → entra diretto
    if (locali.length === 1) {
      AppState.setCurrentLocale(locali[0]);
      console.log("📍 Locale unico:", locali[0].nome);
      return;
    }

    // più locali → mostra select
    popolaSelectLocali(locali);

    // ripristino da stato
    const saved = AppState.getCurrentLocale();
    if (saved) {
      localeSelect.value = saved.id;
    }
  }

  // =========================
  // EXPORT
  // =========================
  window.Locali = {
    initLocali,
  };
})();
