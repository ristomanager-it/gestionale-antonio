// js/locali.js
(function () {
  const supabase = window.supabaseClient;
  const AppState = window.AppState;

  const localeSelect = document.getElementById("locale-select");

  if (!localeSelect) {
    console.warn("⚠️ locale-select non trovato nel DOM");
    return;
  }

  // =========================
  // CARICA LOCALI
  // =========================
  async function caricaLocali() {
    const { data, error } = await supabase
      .from("locali")
      .select("*")
      .eq("attivo", true)
      .order("nome");

    if (error) {
      console.error("❌ Errore caricamento locali", error);
      localeSelect.innerHTML =
        "<option value=''>Errore caricamento</option>";
      return;
    }

    if (!data || data.length === 0) {
      localeSelect.innerHTML =
        "<option value=''>Nessun locale</option>";
      return;
    }

    localeSelect.innerHTML = "";

    data.forEach((loc) => {
      const opt = document.createElement("option");
      opt.value = loc.id;
      opt.textContent = `${loc.nome} (${loc.tipo})`;
      opt.dataset.locale = JSON.stringify(loc);
      localeSelect.appendChild(opt);
    });

    // ripristina locale salvato
    const saved = AppState.getCurrentLocale();
    if (saved) {
      const match = [...localeSelect.options].find(
        (o) => Number(o.value) === Number(saved.id)
      );
      if (match) {
        match.selected = true;
        AppState.setCurrentLocale(saved);
        return;
      }
    }

    // default: primo locale
    const first = data[0];
    localeSelect.value = first.id;
    AppState.setCurrentLocale(first);
  }

  // =========================
  // CHANGE LOCALE
  // =========================
  localeSelect.addEventListener("change", () => {
    const opt = localeSelect.selectedOptions[0];
    if (!opt) return;

    try {
      const locale = JSON.parse(opt.dataset.locale);
      AppState.setCurrentLocale(locale);
      console.log("📍 Locale selezionato:", locale.nome);
    } catch {
      console.error("❌ Errore parsing locale");
    }
  });

  // =========================
  // INIT
  // =========================
  caricaLocali();
})();
