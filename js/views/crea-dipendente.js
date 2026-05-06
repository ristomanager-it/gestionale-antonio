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
                  background:${active ? "#111827" : "#e5e7eb"};
                  color:${active ? "#ffffff" : "#111827"};
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
        class="app-button secondary"
        style="width:100%;"
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
      <div style="max-width:700px;margin:auto;width:100%;">

        <div style="margin-bottom:20px;">
          <h2 style="margin:0;">Nuovo dipendente</h2>
          <div class="small-muted">Invita un membro del team</div>
        </div>

        <div class="card">

          <div class="form-group">
            <label>Nome *</label>
            <input id="nome" class="input" autocomplete="given-name">
          </div>

          <div class="form-group">
            <label>Cognome *</label>
            <input id="cognome" class="input" autocomplete="family-name">
          </div>

          <div class="form-group">
            <label>Email *</label>
            <input id="email" class="input" type="email" autocomplete="email">
          </div>

          <div class="form-group">
            <label>Telefono</label>
            <input id="telefono" class="input" autocomplete="tel">
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
                <option value="${r.id}">${r.nome}</option>
              `).join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Sede *</label>
            <select id="sede" class="input">
              <option value="">Seleziona sede</option>
              ${(sedi || []).map(s => `
                <option value="${s.id}" ${String(s.id) === String(sedeAttiva.id) ? "selected" : ""}>
                  ${s.nome}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="form-group">
            <label>Mansione</label>
            <input id="mansione" class="input" placeholder="es. pizzaiolo">
          </div>

        </div>

        <div style="margin-top:24px;">
          <h3 style="margin-bottom:12px;">
            Turni
          </h3>

          <div id="turni-container"></div>
        </div>

        <div style="margin-top:20px;">
          <button id="crea" class="app-button primary" style="width:100%;">
            Invia invito
          </button>
        </div>

        <div id="msg" style="margin-top:14px;"></div>

      </div>
    </div>
  `;

  renderTurni();

  const btn = document.getElementById("crea");
  const msg = document.getElementById("msg");

  btn.onclick = async () => {
    msg.innerHTML = "";

    const nome = document.getElementById("nome").value.trim();
    const cognome = document.getElementById("cognome").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const telefono = document.getElementById("telefono").value.trim();
    const ruolo = document.getElementById("ruolo").value.trim();
    const reparto_id = document.getElementById("reparto").value || null;
    const sede_id = document.getElementById("sede").value || null;
    const mansione = document.getElementById("mansione").value.trim();

    const turni =
      window.state?.creaDipendente?.turni ||
      getTurniDefault();

    if (!nome || !cognome || !email || !ruolo || !reparto_id || !sede_id) {
      msg.innerHTML = "<span style='color:#dc2626;'>Compila tutti i campi obbligatori</span>";
      return;
    }

    if (!azienda?.id) {
      msg.innerHTML = "<span style='color:#dc2626;'>Azienda non caricata</span>";
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
        throw new Error("Sessione non valida. Effettua nuovamente il login.");
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
        turni,
        azienda_id: azienda.id
      };

      console.log("PAYLOAD INVITA DIPENDENTE:", payload);

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
        throw new Error("Risposta non valida dal server");
      }

      console.log("RISPOSTA INVITA DIPENDENTE:", data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Errore invito");
      }

      msg.innerHTML = "<span style='color:#16a34a;'>Invito inviato ✔</span>";

      window.state.creaDipendente = {
        turni: getTurniDefault()
      };

      setTimeout(() => {
        window.location.hash = "#/dipendenti";
      }, 1000);
    } catch (err) {
      console.error("ERRORE CREA DIPENDENTE:", err);

      msg.innerHTML = "<span style='color:#dc2626;'>" + (err.message || "Errore invito") + "</span>";

      btn.disabled = false;
      btn.innerText = "Invia invito";
    }
  };
}
