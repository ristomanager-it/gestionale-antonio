// js/auth.js
(function () {
  const CURRENT_USER_KEY = "ga_current_user_v1";

  const supabase = window.supabaseClient;
  const AppState = window.AppState;

  // -----------------------------
  //  RUOLI
  // -----------------------------
  function isManagerRole(ruolo) {
    return (
      ruolo === "admin" ||
      ruolo === "manager_cucina" ||
      ruolo === "manager_sala"
    );
  }

  function formatRuolo(ruolo) {
    switch (ruolo) {
      case "admin":
        return "Admin";
      case "manager_cucina":
        return "Manager cucina";
      case "manager_sala":
        return "Manager sala";
      case "addetto_cucina":
        return "Addetto cucina";
      case "cameriere":
        return "Cameriere";
      default:
        return "";
    }
  }

  // -----------------------------
  //  UTENTE CORRENTE
  // -----------------------------
  function setCurrentUser(user, persist = false) {
    AppState.currentUser = {
      id: user.id ?? null,
      nome: user.nome,
      ruolo: user.ruolo || "",
      canalePrevalente: user.canalePrevalente || "NR",
      virtualAdmin: !!user.virtualAdmin,
    };

    if (persist) {
      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(AppState.currentUser)
      );
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  function restoreUserFromStorage(dipendenti = []) {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;

    try {
      const saved = JSON.parse(raw);
      if (!saved) return null;

      if (saved.virtualAdmin) {
        AppState.currentUser = saved;
        return saved;
      }

      const found = dipendenti.find((d) => d.id === saved.id);
      if (found) {
        setCurrentUser(found, true);
        return found;
      }

      const byName = dipendenti.find(
        (d) =>
          d.nome &&
          d.nome.toLowerCase() === String(saved.nome || "").toLowerCase()
      );
      if (byName) {
        setCurrentUser(byName, true);
        return byName;
      }
    } catch {
      return null;
    }
  }

  function logout() {
    AppState.currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  // -----------------------------
  //  LOGIN (PIN semplice)
  // -----------------------------
  async function loginWithPin(nome, pin, remember = false) {
    if (!nome || !pin) return null;

    const { data, error } = await supabase
      .from("dipendenti")
      .select("*")
      .eq("nome", nome)
      .eq("codice", pin)
      .eq("attivo", true)
      .maybeSingle();

    if (error || !data) return null;

    const user = {
      id: data.id,
      nome: data.nome,
      ruolo: data.ruolo,
      canalePrevalente: data.canale_prevalente || "NR",
    };

    setCurrentUser(user, remember);
    return user;
  }

  // -----------------------------
  //  EXPORT GLOBALE
  // -----------------------------
  window.Auth = {
    loginWithPin,
    logout,
    setCurrentUser,
    restoreUserFromStorage,
    isManagerRole,
    formatRuolo,
  };
})();
