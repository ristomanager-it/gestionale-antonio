import { supabase } from "../supabaseClient.js";

const GIORNI_SETTIMANA = [
  { key: "lunedi", label: "Lun" },
  { key: "martedi", label: "Mar" },
  { key: "mercoledi", label: "Mer" },
  { key: "giovedi", label: "Gio" },
  { key: "venerdi", label: "Ven" },
  { key: "sabato", label: "Sab" },
  { key: "domenica", label: "Dom" }
];

function getTurniDefault() {
  return [
    {
      giorni: [],
      inizio: "",
      fine: ""
    }
  ];
}

function ensureTurniState() {
  if (!window.state) {
    window.state = {};
  }

  if (!window.state.creaDipendente) {
    window.state.creaDipendente = {};
  }

  if (!window.state.creaDipendente.turni) {
    window.state.creaDipendente.turni = getTurniDefault();
  }
}

function aggiungiTurno() {
  ensureTurniState();

  window.state.creaDipendente.turni.push({
    giorni: [],
    inizio: "",
    fine: ""
  });

  renderTurni();
}

function rimuoviTurno(index) {
  ensureTurniState();

  if (window.state.creaDipendente.turni.length <= 1) {
    return;
  }

  window.state.creaDipendente.turni.splice(index, 1);

  renderTurni();
}

function aggiornaTurno(index, campo, valore) {
  ensureTurniState();

  const turno = window.state.creaDipendente.turni[index];

  if (!turno) return;

  turno[campo] = valore;
}

function toggleGiorno(index, giorno) {
  ensureTurniState();

  const turno = window.state.creaDipendente.turni[index];

  if (!turno) return;

  const exists = turno.giorni.includes(giorno);

  if (exists) {
    turno.giorni = turno.giorni.filter(g => g !== giorno);
  } else {
    turno.giorni.push(giorno);
  }

  renderTurni();
}

function calcolaCostoOrario() {
  const tipoCompenso = document.getElementById("tipo-compenso")?.value || "orario";

  const retribuzioneBase =
    parseFloat(document.getElementById("retribuzione-base")?.value) || 0;

  const oreMensili =
    parseFloat(document.getElementById("ore-mensili")?.value) || 0;

  const oreServizio =
    parseFloat(document.getElementById("ore-servizio")?.value) || 0;

  let costo = 0;

  if (tipoCompenso === "orario") {
    costo = retribuzioneBase;
  }

  if (tipoCompenso === "mensile" && oreMensili > 0) {
    costo = retribuzioneBase / oreMensili;
  }

  if (tipoCompenso === "servizio" && oreServizio > 0) {
    costo = retribuzioneBase / oreServizio;
  }

  const output = document.getElementById("costo-orario");

  if (output) {
    output.value = isFinite(costo)
      ? costo.toFixed(2)
      : "0.00";
  }
}

function renderTurni() {
  ensureTurniState();

  const container = document.getElementById("turni-container");

  if (!container) return;

  const turni = window.state.creaDipendente.turni;

  container.innerHTML = `
    ${turni.map((turno, index) => `
      <div class="card" style="margin-top:14px;padding:16px;">

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-weight:600;">
            Turno ${index + 1}
          </div>

          ${
            turni.length > 1
              ? `
                <button
                  type="button"
                  class="app-button danger remove-turno"
                  data-index="${index}"
                >
                  Rimuovi
                </button>
              `
              : ""
          }
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
          ${GIORNI_SETTIMANA.map(giorno => {
            const active = turno.giorni.includes(giorno.key);

            return `
              <button
                type="button"
                class="giorno-btn"
                data-turno="${index}"
                data-giorno="${giorno.key}"
                style="
                  border:none;
                  border-radius:999px;
                  padding:8px 12px;
                  cursor:pointer;
                  background:${active ? '#111827' : '#e5e7eb'};
                  color:${active ? '#ffffff' : '#111827'};
                  font-size:13px;
                  font-weight:600;
                "
              >
                ${giorno.label}
              </button>
            `;
          }).join("")}
        </div>

        <div
          style="
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:12px;
          "
        >
          <div class="form-group" style="margin-bottom:0;">
            <label>Inizio</label>

            <input
              type="time"
              class="input turno-input"
              data-index="${index}"
              data-campo="inizio"
              value="${turno.inizio || ""}"
            >
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label>Fine</label>

            <input
              type="time"
              class="input turno-input"
              data-index="${index}"
              data-campo="fine"
              value="${turno.fine || ""}"
            >
          </div>
        </div>

      </div>
    `).join("")}

    <div style="margin-top:14px;">
      <button
        type="button"
        id="aggiungi-turno"
        style="
          width:100%;
          background:#111827;
          color:#ffffff;
          border:none;
          border-radius:10px;
          padding:12px;
          font-size:14px;
          font-weight:600;
          cursor:pointer;
        "
      >
        + Aggiungi turno
      </button>
    </div>
  `;

  document
    .getElementById("aggiungi-turno")
    .onclick = aggiungiTurno;

  container
    .querySelectorAll(".remove-turno")
    .forEach((btn) => {
      btn.onclick = () => {
        rimuoviTurno(Number(btn.dataset.index));
      };
    });

  container
    .querySelectorAll(".turno-input")
    .forEach((input) => {
      input.onchange = (e) => {
        aggiornaTurno(
          Number(input.dataset.index),
          input.dataset.campo,
          e.target.value
        );
      };
    });

  container
    .querySelectorAll(".giorno-btn")
    .forEach((btn) => {
      btn.onclick = () => {
        toggleGiorno(
          Number(btn.dataset.turno),
          btn.dataset.giorno
        );
      };
    });
}

export async function render(container) {
  const azienda = window.state?.azienda;
  const sedeAttiva = window.state?.sedeAttiva;

  ensureTurniState();

  if (!azienda?.id || !sedeAttiva?.id) {
    container.innerHTML = `
      <div class="view">
        <div class="login-wrapper">
          <h2 class="login-title">Errore</h2>
          <div class="login-subtitle">Azienda o sede non trovata</div>
        </div>
      </div>
    `;
    return;
  }

  const { data: reparti, error: repartiError } = await supabase
    .from("reparti")
    .select("id, nome")
    .eq("azienda_id", azienda.id)
    .order("nome", { ascending: true });

  const { data: sedi, error: sediError } = await supabase
    .from("sedi")
    .select("id, nome")
    .eq("azienda_id", azienda.id)
    .order("nome", { ascending: true });

  const { data: agenzie } = await supabase
    .from("agenzie")
    .select("id, nome")
    .eq("azienda_id", azienda.id)
    .eq("attivo", true)
    .order("nome", { ascending: true });

  if (repartiError || sediError) {
    container.innerHTML = `
      <div class="view">
        <div class="login-wrapper">
          <h2 class="login-title">Errore</h2>
          <div class="login-subtitle">Impossibile caricare reparti o sedi</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">
      <div style="max-width:760px;margin:auto;width:100%;">

        <div style="margin-bottom:20px;">
          <h2 style="margin:0;">Nuovo dipendente</h2>
          <div class="small-muted">
            Invita un membro del team
          </div>
        </div>

        <div class="card">

          <div class="form-group">
            <label>Nome *</label>
            <input id="nome" class="input">
          </div>

          <div class="form-group">
            <label>Cognome *</label>
            <input id="cognome" class="input">
          </div>

          <div class="form-group">
            <label>Email *</label>
            <input id="email" class="input" type="email">
          </div>

          <div class="form-group">
            <label>Telefono</label>
            <input id="telefono" class="input">
          </div>

          <div class="form-group">
            <label>Ruolo *</label>

            <select id="ruolo" class="input">
              <option value="">Seleziona</option>
              <option value="operatore">Operatore</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div class="form-group">
            <label>Reparto *</label>

            <select id="reparto" class="input">
              <option value="">Seleziona reparto</option>

              ${(reparti || []).map(r => `
                <option value="${r.id}">
                  ${r.nome}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Sede *</label>

            <select id="sede" class="input">
              <option value="">Seleziona sede</option>

              ${(sedi || []).map(s => `
                <option
                  value="${s.id}"
                  ${String(s.id) === String(sedeAttiva.id) ? "selected" : ""}
                >
                  ${s.nome}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Mansione</label>

            <input
              id="mansione"
              class="input"
              placeholder="es. pizzaiolo"
            >
          </div>

          <div class="form-group">
            <label>PIN accesso app (4 cifre)</label>

            <input
              id="dip-pin"
              class="input"
              inputmode="numeric"
              pattern="[0-9]{4}"
              maxlength="4"
              placeholder="es. 4821"
            >
            <div class="small-muted" style="margin-top:4px;">
              Usato per timbrature, comande e mansionario. Lascia vuoto per assegnarlo dopo.
            </div>
          </div>

        </div>

        <div class="card" style="margin-top:20px;">

          <h3 style="margin-top:0;margin-bottom:18px;">
            Contratto e costo lavoro
          </h3>

          <div class="form-group">
            <label>Tipologia contratto</label>

            <select id="tipo-contratto" class="input">
              <option value="a_chiamata">A chiamata</option>
              <option value="orario">Contratto orario</option>
              <option value="mensile">Fisso mensile</option>
              <option value="stagionale">Stagionale</option>
              <option value="part_time">Part time</option>
              <option value="full_time">Full time</option>
              <option value="apprendistato">Apprendistato</option>
              <option value="agenzia">Agenzia (personale esterno)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Contratto</label>

            <input
              id="contratto-nome"
              class="input"
              placeholder="es. Pubblici esercizi"
            >
          </div>

          <div id="blocco-agenzia" style="display:none;">
            <div class="form-group">
              <label>
                Agenzia
                <a href="#/bo-agenzie" style="float:right;font-size:12px;font-weight:600;color:#7c3aed;text-decoration:none;">Gestisci agenzie →</a>
              </label>

              <select id="agenzia-id" class="input">
                <option value="">Seleziona agenzia</option>
                ${(agenzie || []).map(a => `
                  <option value="${a.id}">${a.nome}</option>
                `).join("")}
                <option value="__nuova__">➕ Nuova agenzia...</option>
              </select>

              <input
                id="agenzia-nome-nuova"
                class="input"
                placeholder="Nome della nuova agenzia"
                style="display:none;margin-top:8px;"
              >
            </div>

            <div class="form-group">
              <label>Costo orario fatturato dall'agenzia (€)</label>

              <input
                id="costo-orario-agenzia"
                class="input"
                type="number"
                step="0.01"
                min="0"
                placeholder="es. 18.50"
              >
            </div>
          </div>

          <div class="form-group">
            <label>Tipo compenso</label>

            <select id="tipo-compenso" class="input">
              <option value="orario">A ore</option>
              <option value="mensile">Mensile</option>
              <option value="servizio">Per servizio</option>
            </select>
          </div>

          <div class="form-group">
            <label>Retribuzione base</label>

            <input
              type="number"
              step="0.01"
              id="retribuzione-base"
              class="input"
            >
          </div>

          <div class="form-group">
            <label>Ore mensili contrattuali</label>

            <input
              type="number"
              step="0.1"
              id="ore-mensili"
              class="input"
            >
          </div>

          <div class="form-group">
            <label>Ore medie per servizio</label>

            <input
              type="number"
              step="0.1"
              id="ore-servizio"
              class="input"
            >
          </div>

          <div class="form-group">
            <label>Costo medio</label>

            <input
              type="text"
              id="costo-medio"
              class="input"
            >
          </div>

          <div class="form-group">
            <label>Costo orario calcolato</label>

            <input
              type="number"
              step="0.01"
              id="costo-orario"
              class="input"
              readonly
            >
          </div>

        </div>

        <div style="margin-top:24px;">
          <h3 style="margin-bottom:12px;">
            Turni
          </h3>

          <div id="turni-container"></div>
        </div>

        <div style="margin-top:20px;">
          <button
            id="crea"
            class="app-button primary"
            style="width:100%;"
          >
            Invia invito
          </button>
        </div>

        <div id="msg" style="margin-top:14px;"></div>

      </div>
    </div>
  `;

  renderTurni();

  function toggleBloccoAgenzia() {
    const tipo = document.getElementById("tipo-contratto")?.value;
    const blocco = document.getElementById("blocco-agenzia");
    if (blocco) blocco.style.display = tipo === "agenzia" ? "block" : "none";
  }
  toggleBloccoAgenzia();
  document
    .getElementById("tipo-contratto")
    ?.addEventListener("change", toggleBloccoAgenzia);

  document
    .getElementById("agenzia-id")
    ?.addEventListener("change", (e) => {
      const nuovoInput = document.getElementById("agenzia-nome-nuova");
      if (nuovoInput) nuovoInput.style.display = e.target.value === "__nuova__" ? "block" : "none";
    });

  document
    .getElementById("tipo-compenso")
    ?.addEventListener("change", calcolaCostoOrario);

  document
    .getElementById("retribuzione-base")
    ?.addEventListener("input", calcolaCostoOrario);

  document
    .getElementById("ore-mensili")
    ?.addEventListener("input", calcolaCostoOrario);

  document
    .getElementById("ore-servizio")
    ?.addEventListener("input", calcolaCostoOrario);

  calcolaCostoOrario();

  const btn = document.getElementById("crea");
  const msg = document.getElementById("msg");

  btn.onclick = async () => {
    msg.innerHTML = "";

    const nome = document.getElementById("nome").value.trim();
    const cognome = document.getElementById("cognome").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const telefono = document.getElementById("telefono").value.trim();

    const ruolo = document.getElementById("ruolo").value.trim();

    const reparto_id =
      document.getElementById("reparto").value || null;

    const sede_id =
      document.getElementById("sede").value || null;

    const mansione =
      document.getElementById("mansione").value.trim();

    const tipo_contratto =
      document.getElementById("tipo-contratto").value;

    const contratto_nome =
      document.getElementById("contratto-nome").value.trim();

    const tipo_compenso =
      document.getElementById("tipo-compenso").value;

    const retribuzione_base =
      parseFloat(document.getElementById("retribuzione-base").value) || 0;

    const ore_mensili_contrattuali =
      parseFloat(document.getElementById("ore-mensili").value) || 0;

    const ore_medie_per_servizio =
      parseFloat(document.getElementById("ore-servizio").value) || 0;

    const costo_medio =
      document.getElementById("costo-medio").value.trim();

    const costo_orario =
      parseFloat(document.getElementById("costo-orario").value) || 0;

    const pin =
      document.getElementById("dip-pin")?.value.trim() || null;

    const agenziaSelezionata =
      tipo_contratto === "agenzia"
        ? document.getElementById("agenzia-id")?.value || null
        : null;

    const agenziaNomeNuova =
      agenziaSelezionata === "__nuova__"
        ? document.getElementById("agenzia-nome-nuova")?.value.trim() || null
        : null;

    const costo_orario_agenzia =
      tipo_contratto === "agenzia"
        ? parseFloat(document.getElementById("costo-orario-agenzia")?.value) || null
        : null;

    if (pin && !/^[0-9]{4}$/.test(pin)) {
      msg.innerHTML = `
        <span style="color:#dc2626;">
          Il PIN deve essere di 4 cifre numeriche
        </span>
      `;
      return;
    }

    if (tipo_contratto === "agenzia" && !agenziaSelezionata) {
      msg.innerHTML = `
        <span style="color:#dc2626;">
          Seleziona o crea un'agenzia
        </span>
      `;
      return;
    }

    if (agenziaSelezionata === "__nuova__" && !agenziaNomeNuova) {
      msg.innerHTML = `
        <span style="color:#dc2626;">
          Indica il nome della nuova agenzia
        </span>
      `;
      return;
    }

    const turni =
      window.state?.creaDipendente?.turni ||
      getTurniDefault();

    if (!nome || !cognome || !email || !ruolo || !reparto_id || !sede_id) {
      msg.innerHTML = `
        <span style="color:#dc2626;">
          Compila tutti i campi obbligatori
        </span>
      `;
      return;
    }

    if (!azienda?.id) {
      msg.innerHTML = `
        <span style="color:#dc2626;">
          Azienda non caricata
        </span>
      `;
      return;
    }

    btn.disabled = true;
    btn.innerText = "Invio...";

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        throw new Error(
          "Sessione non valida. Effettua nuovamente il login."
        );
      }

      // Se è stata scelta "nuova agenzia", la creo prima nell'anagrafica
      let agenzia_id = agenziaSelezionata;
      let agenzia_nome = null;
      if (tipo_contratto === "agenzia") {
        if (agenziaSelezionata === "__nuova__") {
          const { data: nuovaAg, error: nuovaAgErr } = await supabase
            .from("agenzie")
            .insert({ nome: agenziaNomeNuova, azienda_id: azienda.id, attivo: true })
            .select()
            .single();
          if (nuovaAgErr) throw nuovaAgErr;
          agenzia_id = nuovaAg.id;
          agenzia_nome = nuovaAg.nome;
        } else if (agenziaSelezionata) {
          const { data: agSel } = await supabase
            .from("agenzie")
            .select("nome")
            .eq("id", agenziaSelezionata)
            .single();
          agenzia_nome = agSel?.nome || null;
        }
      }

      const payload = {
        nome,
        cognome,
        email,
        telefono,
        ruolo,
        reparto_id,
        sede_id,
        mansione,
        tipo_contratto,
        contratto_nome,
        tipo_compenso,
        retribuzione_base,
        ore_mensili_contrattuali,
        ore_medie_per_servizio,
        costo_medio,
        costo_orario,
        turni,
        pin,
        agenzia_id,
        agenzia_nome,
        costo_orario_agenzia,
        azienda_id: azienda.id
      };

      console.log(
        "PAYLOAD INVITA DIPENDENTE:",
        payload
      );

      const res = await fetch(
        "https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/invita-dipendente",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      const raw = await res.text();

      let data = null;

      try {
        data = JSON.parse(raw);
      } catch (parseError) {
        console.error("RISPOSTA NON JSON:", raw);

        throw new Error(
          "Risposta non valida dal server"
        );
      }

      console.log(
        "RISPOSTA INVITA DIPENDENTE:",
        data
      );

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || "Errore invito"
        );
      }

      msg.innerHTML = `
        <span style="color:#16a34a;">
          Invito inviato ✔
        </span>
      `;

      window.state.creaDipendente = {
        turni: getTurniDefault()
      };

      setTimeout(() => {
        window.location.hash = "#/dipendenti";
      }, 1000);

    } catch (err) {
      console.error(
        "ERRORE CREA DIPENDENTE:",
        err
      );

      msg.innerHTML = `
        <span style="color:#dc2626;">
          ${err.message || "Errore invito"}
        </span>
      `;

      btn.disabled = false;
      btn.innerText = "Invia invito";
    }
  };
}
