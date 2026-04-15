import { supabase } from "../supabaseClient.js";

// js/views/dipendenti.js
// =======================================
// View Dipendenti – SaaS Multi-Azienda
// - Tab Elenco / Nuovo-Modifica
// - Invito accesso gestionale via Edge Function
// - Soft delete (attivo=false) + disattivazione accessi collegati
// - Niente canale_prevalente
// =======================================

export async function render(container) {
  const user = window.state.user;
  const azienda = window.state.azienda;

  if (!user || !azienda) {
    container.innerHTML = `<div class="view">Errore caricamento dipendenti</div>`;
    return;
  }

  if (!window.hasPermesso || !window.hasPermesso("dipendenti.read")) {
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Accesso negato</h2>
        <p class="small-muted" style="margin-top:6px;">
          Non hai i permessi per visualizzare i dipendenti.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="view">

      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <button class="app-button small gray" id="btn-back-dashboard">⬅ Torna in Dashboard</button>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="app-button small" id="tab-elenco">👥 Elenco</button>
          <button class="app-button small gray" id="tab-nuovo">➕ Nuovo</button>
        </div>
      </div>

      <div style="margin-top:14px;">
        <h2 style="margin:0;">Dipendenti</h2>
        <p class="small-muted" style="margin-top:6px;">
          Gestione personale azienda (anagrafica + accessi)
        </p>
      </div>

      <div id="dip-view-elenco" style="margin-top:16px;"></div>
      <div id="dip-view-form" style="margin-top:16px; display:none;"></div>

    </div>
  `;

  document.getElementById("btn-back-dashboard").onclick = () => {
    window.location.hash = "#/home";
  };

  document.getElementById("tab-elenco").onclick = () => setTab("elenco");
  document.getElementById("tab-nuovo").onclick = () => {
    window.location.hash = "#/crea-dipendente";
  };

  const btnNuovo = document.getElementById("tab-nuovo");
  if (btnNuovo && (!window.hasPermesso || !window.hasPermesso("dipendenti.create"))) {
    btnNuovo.style.display = "none";
  }

  await renderElenco();
  setTab("elenco");
}

function setTab(tab) {
  const elenco = document.getElementById("dip-view-elenco");
  const form = document.getElementById("dip-view-form");

  const btnElenco = document.getElementById("tab-elenco");
  const btnNuovo = document.getElementById("tab-nuovo");

  if (tab === "elenco") {
    elenco.style.display = "block";
    form.style.display = "none";
    btnElenco.className = "app-button small";
    if (btnNuovo) btnNuovo.className = "app-button small gray";
  } else {
    elenco.style.display = "none";
    form.style.display = "block";
    btnElenco.className = "app-button small gray";
    if (btnNuovo) btnNuovo.className = "app-button small";
  }
}

async function renderElenco() {
  const host = document.getElementById("dip-view-elenco");

  host.innerHTML = `
    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
      <input id="dip-search" class="input-pill" placeholder="Cerca per nome..." style="max-width:320px;" />
      <label class="small-muted" style="display:flex; align-items:center; gap:8px;">
        <input type="checkbox" id="dip-only-attivi" checked />
        Solo attivi
      </label>
      <button class="app-button small" id="dip-refresh">↻ Aggiorna</button>
    </div>

    <div class="table-wrapper">
      <table class="table-timbrature">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Mansione</th>
            <th>Costo orario</th>
            <th>Costo medio</th>
            <th>Email</th>
            <th>Attivo</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="dip-lista"></tbody>
      </table>
    </div>

    <div id="dip-elenco-msg" style="margin-top:10px;"></div>
  `;

  document.getElementById("dip-refresh").onclick = () => caricaDipendenti();
  document.getElementById("dip-search").addEventListener("input", () => caricaDipendenti());
  document.getElementById("dip-only-attivi").addEventListener("change", () => caricaDipendenti());

  await caricaDipendenti();
}

async function caricaDipendenti() {
  const azienda = window.state.azienda;
  const q = (document.getElementById("dip-search")?.value || "").trim().toLowerCase();
  const onlyAttivi = !!document.getElementById("dip-only-attivi")?.checked;

  let query = supabase
    .from("dipendenti")
    .select("id,nome,cognome,mansione,email,costo_orario,costo_medio,attivo,created_at")
    .eq("azienda_id", azienda.id)
    .order("nome");

  if (onlyAttivi) query = query.eq("attivo", true);

  const { data, error } = await query;

  const tbody = document.getElementById("dip-lista");
  const msg = document.getElementById("dip-elenco-msg");

  if (error) {
    console.error(error);
    if (msg) msg.innerHTML = `<span style="color:#dc2626;">Errore caricamento dipendenti</span>`;
    if (tbody) tbody.innerHTML = "";
    return;
  }

  const filtered = (data || []).filter((d) => {
    if (!q) return true;
    const nomeCompleto = `${d.nome || ""} ${d.cognome || ""}`.toLowerCase();
    return nomeCompleto.includes(q);
  });

  if (!tbody) return;
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="small-muted">Nessun dipendente trovato</td>
      </tr>
    `;
    return;
  }

  const canUpdate = !!(window.hasPermesso && window.hasPermesso("dipendenti.update"));
  const canDelete = !!(window.hasPermesso && window.hasPermesso("dipendenti.delete"));
  const canRead = !!(window.hasPermesso && window.hasPermesso("dipendenti.read"));

  filtered.forEach((d) => {
    const nomeCompleto = [d.nome, d.cognome].filter(Boolean).join(" ").trim() || d.nome || "-";

    tbody.innerHTML += `
      <tr>
        <td>${escapeHtml(nomeCompleto)}</td>
        <td>${escapeHtml(d.mansione || "-")}</td>
        <td>${typeof d.costo_orario === "number" ? d.costo_orario.toFixed(2) : "-"}</td>
        <td>${escapeHtml(d.costo_medio || "-")}</td>
        <td>${escapeHtml(d.email || "-")}</td>
        <td>${d.attivo ? "✔" : "❌"}</td>
        <td style="display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
          ${canRead ? `<button class="app-button tiny gray" onclick="window._dipOpen('${d.id}')">Scheda</button>` : ""}
          ${canUpdate ? `<button class="app-button tiny" onclick="window._dipEdit('${d.id}')">Modifica</button>` : ""}
          ${canDelete ? `<button class="app-button tiny red" onclick="window._dipDelete('${d.id}')">Elimina</button>` : ""}
        </td>
      </tr>
    `;
  });
}

function renderForm(dip) {
  const host = document.getElementById("dip-view-form");
  if (!host) return;

  const isEdit = !!dip?.id;

  host.innerHTML = `
    <div class="view" style="margin-top:0;">
      <h3 style="margin-top:0;">${isEdit ? "Modifica Dipendente" : "Nuovo Dipendente"}</h3>

      <form id="dip-form" onsubmit="return false;" style="display:flex; flex-direction:column; gap:10px;">

        <input type="hidden" id="dip-id" value="${dip?.id || ""}" />

        <label>Nome *
          <input type="text" id="dip-nome" class="input-pill" required value="${dip?.nome || ""}" />
        </label>

        <label>Mansione
          <input type="text" id="dip-mansione" class="input-pill" value="${dip?.mansione || ""}" />
        </label>

        <label>Data nascita
          <input type="date" id="dip-data-nascita" class="input-pill" value="${dip?.data_nascita || ""}" />
        </label>

        <label>Telefono
          <input type="text" id="dip-telefono" class="input-pill" value="${dip?.telefono || ""}" />
        </label>

        <label>Email (opzionale)
          <input type="email" id="dip-email" class="input-pill" value="${dip?.email || ""}" />
        </label>

        <div class="view" style="margin-top:10px;">
          <h4 style="margin:0;">Compenso</h4>

          <label style="margin-top:10px;">Tipo compenso
            <select id="dip-tipo-compenso" class="input-pill">
              <option value="orario">A ore</option>
              <option value="mensile">Mensile</option>
              <option value="servizio">Per servizio</option>
            </select>
          </label>

          <label>Retribuzione base
            <input type="number" step="0.01" id="dip-retribuzione-base" class="input-pill" value="${dip?.retribuzione_base ?? ""}" />
          </label>

          <label>Ore mensili contrattuali
            <input type="number" step="0.1" id="dip-ore-mensili" class="input-pill" value="${dip?.ore_mensili_contrattuali ?? ""}" />
          </label>

          <label>Ore medie per servizio
            <input type="number" step="0.1" id="dip-ore-servizio" class="input-pill" value="${dip?.ore_medie_per_servizio ?? ""}" />
          </label>

          <label>Costo medio (libero)
            <input type="text" id="dip-costo-medio" class="input-pill" value="${dip?.costo_medio ?? ""}" />
          </label>

          <label>Costo orario (calcolato)
            <input type="number" step="0.01" id="dip-costo" class="input-pill" readonly value="${dip?.costo_orario ?? ""}" />
          </label>
        </div>

        <label style="display:flex; align-items:center; gap:10px; margin-top:6px;">
          <input type="checkbox" id="dip-attivo" ${dip?.attivo === false ? "" : "checked"} />
          Attivo
        </label>

        <div class="view" style="margin-top:10px;">
          <h4 style="margin:0;">Accesso al gestionale</h4>
          <p class="small-muted" style="margin-top:6px;">
            Se abiliti l’accesso, inviamo una mail per creare la password e accedere.
          </p>

          <label style="display:flex; align-items:center; gap:10px; margin-top:8px;">
            <input type="checkbox" id="dip-accesso" />
            Abilita accesso al gestionale (invio invito)
          </label>

          <div id="dip-accesso-box" style="margin-top:10px; display:none;">
            <label>Ruolo gestionale
              <select id="dip-ruolo-app" class="input-pill">
                <option value="operatore">Operatore</option>
                <option value="manager_cucina">Manager cucina</option>
                <option value="manager_sala">Manager sala</option>
                <option value="segreteria">Segreteria</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <div class="small-muted" style="margin-top:8px;">
              (I moduli visibili saranno filtrati da features azienda + permessi ruolo + override.)
            </div>
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">
          <button class="app-button small green" id="btn-dip-save">
            ${isEdit ? "Salva modifiche" : "Crea dipendente"}
          </button>
          <button class="app-button small gray" id="btn-dip-cancel">Annulla</button>
        </div>

        <div id="dip-form-msg" style="margin-top:6px;"></div>

      </form>
    </div>
  `;

  const tipoCompenso = dip?.tipo_compenso || "orario";
  const selTipo = document.getElementById("dip-tipo-compenso");
  if (selTipo) selTipo.value = tipoCompenso;

  const accessoCb = document.getElementById("dip-accesso");
  const accessoBox = document.getElementById("dip-accesso-box");
  if (accessoCb && accessoBox) {
    accessoCb.addEventListener("change", () => {
      accessoBox.style.display = accessoCb.checked ? "block" : "none";
    });
  }

  document.getElementById("dip-tipo-compenso")?.addEventListener("change", calcolaCosto);
  document.getElementById("dip-retribuzione-base")?.addEventListener("input", calcolaCosto);
  document.getElementById("dip-ore-mensili")?.addEventListener("input", calcolaCosto);
  document.getElementById("dip-ore-servizio")?.addEventListener("input", calcolaCosto);

  document.getElementById("btn-dip-cancel").onclick = async () => {
    setTab("elenco");
    await caricaDipendenti();
  };

  document.getElementById("btn-dip-save").onclick = async () => {
    await salvaDipendente(isEdit);
  };

  calcolaCosto();
}

function calcolaCosto() {
  const tipo = document.getElementById("dip-tipo-compenso")?.value || "orario";
  const base = parseFloat(document.getElementById("dip-retribuzione-base")?.value) || 0;
  const oreMensili = parseFloat(document.getElementById("dip-ore-mensili")?.value) || 0;
  const oreServizio = parseFloat(document.getElementById("dip-ore-servizio")?.value) || 0;

  let costo = 0;

  if (tipo === "orario") costo = base;
  if (tipo === "mensile" && oreMensili > 0) costo = base / oreMensili;
  if (tipo === "servizio" && oreServizio > 0) costo = base / oreServizio;

  const out = document.getElementById("dip-costo");
  if (out) out.value = (isFinite(costo) ? costo : 0).toFixed(2);
}

async function salvaDipendente(isEdit) {
  const azienda = window.state.azienda;
  const msg = document.getElementById("dip-form-msg");
  if (msg) msg.innerHTML = "";

  if (!window.hasPermesso) {
    if (msg) msg.innerHTML = `<span style="color:#dc2626;">Permessi non disponibili</span>`;
    return;
  }
  if (!isEdit && !window.hasPermesso("dipendenti.create")) {
    if (msg) msg.innerHTML = `<span style="color:#dc2626;">Non hai i permessi per creare dipendenti.</span>`;
    return;
  }
  if (isEdit && !window.hasPermesso("dipendenti.update")) {
    if (msg) msg.innerHTML = `<span style="color:#dc2626;">Non hai i permessi per modificare dipendenti.</span>`;
    return;
  }

  const id = document.getElementById("dip-id")?.value || null;

  const nome = (document.getElementById("dip-nome")?.value || "").trim();
  if (!nome) {
    if (msg) msg.innerHTML = `<span style="color:#dc2626;">Nome obbligatorio</span>`;
    return;
  }

  const email = (document.getElementById("dip-email")?.value || "").trim() || null;

  const payload = {
    azienda_id: azienda.id,
    nome,
    mansione: (document.getElementById("dip-mansione")?.value || "").trim() || null,
    data_nascita:
      document.getElementById("dip-data_nascita")?.value ||
      document.getElementById("dip-data-nascita")?.value ||
      null,
    telefono: (document.getElementById("dip-telefono")?.value || "").trim() || null,
    email,
    tipo_compenso: document.getElementById("dip-tipo-compenso")?.value || "orario",
    retribuzione_base: numOrNull("dip-retribuzione-base"),
    ore_mensili_contrattuali: numOrNull("dip-ore-mensili"),
    ore_medie_per_servizio: numOrNull("dip-ore-servizio"),
    costo_medio: (document.getElementById("dip-costo-medio")?.value || "").trim() || null,
    costo_orario: numOrNull("dip-costo"),
    attivo: !!document.getElementById("dip-attivo")?.checked,
  };

  let res;

  if (isEdit && id) {
    res = await supabase
      .from("dipendenti")
      .update(payload)
      .eq("id", id)
      .eq("azienda_id", azienda.id)
      .select("id,email")
      .single();
  } else {
    res = await supabase
      .from("dipendenti")
      .insert(payload)
      .select("id,email")
      .single();
  }

  if (res.error) {
    console.error(res.error);
    if (msg) msg.innerHTML = `<span style="color:#dc2626;">Errore salvataggio dipendente</span>`;
    return;
  }

  const wantAccess = !!document.getElementById("dip-accesso")?.checked;
  const ruoloApp = document.getElementById("dip-ruolo-app")?.value || "operatore";

  if (wantAccess) {
    if (!email) {
      if (msg) msg.innerHTML = `<span style="color:#dc2626;">Per l’accesso serve una email.</span>`;
      return;
    }

    const invio = await inviaInvitoDipendenteWhiteLabel({
      email,
      aziendaId: azienda.id,
      ruolo: ruoloApp,
      dipendenteId: res.data.id,
    });

    if (!invio.ok) {
      const extra = invio.message ? `<div class="small-muted" style="margin-top:6px;">${escapeHtml(invio.message)}</div>` : "";
      if (msg) msg.innerHTML = `<span style="color:#dc2626;">Errore invio email invito</span>${extra}`;
      return;
    }
  }

  if (msg) msg.innerHTML = `<span style="color:#16a34a;">Salvato ✔</span>`;

  setTab("elenco");
  await caricaDipendenti();
}

window._dipOpen = function (id) {
  window.location.hash = `#/dipendente?id=${id}`;
};

window._dipEdit = async function (id) {
  if (!window.hasPermesso || !window.hasPermesso("dipendenti.update")) {
    alert("Accesso negato: non hai i permessi per modificare i dipendenti.");
    return;
  }

  const azienda = window.state.azienda;

  const { data, error } = await supabase
    .from("dipendenti")
    .select("*")
    .eq("id", id)
    .eq("azienda_id", azienda.id)
    .single();

  if (error || !data) {
    console.error(error);
    alert("Errore caricamento dipendente");
    return;
  }

  setTab("form");
  renderForm(data);
};

window._dipDelete = async function (id) {
  if (!window.hasPermesso || !window.hasPermesso("dipendenti.delete")) {
    alert("Accesso negato: non hai i permessi per eliminare i dipendenti.");
    return;
  }

  const azienda = window.state.azienda;

  const { data: dip, error: dipErr } = await supabase
    .from("dipendenti")
    .select("id,email,attivo")
    .eq("id", id)
    .eq("azienda_id", azienda.id)
    .single();

  if (dipErr || !dip) {
    console.error(dipErr);
    alert("Errore caricamento dipendente");
    return;
  }

  if (dip.attivo) {
    if (!confirm("Disattivare il dipendente?")) return;

    const { error } = await supabase
      .from("dipendenti")
      .update({ attivo: false })
      .eq("id", id)
      .eq("azienda_id", azienda.id);

    if (error) {
      console.error(error);
      alert("Errore disattivazione dipendente");
      return;
    }

    if (dip.email) {
      const ua = await supabase
        .from("utenti_aziende")
        .update({ attivo: false })
        .eq("azienda_id", azienda.id)
        .eq("email", dip.email);

      if (ua.error) console.warn("Impossibile disattivare utenti_aziende:", ua.error);
    }
  } else {
    if (!confirm("Eliminare definitivamente questo dipendente?")) return;

    const { error } = await supabase
      .from("dipendenti")
      .delete()
      .eq("id", id)
      .eq("azienda_id", azienda.id);

    if (error) {
      console.error(error);
      alert("Errore eliminazione definitiva");
      return;
    }
  }

  await caricaDipendenti();
};

async function inviaInvitoDipendenteWhiteLabel({ email, aziendaId, ruolo, dipendenteId, mode = "invite" }) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token || null;
    if (!token) {
      console.error("Sessione mancante: impossibile chiamare Edge Function");
      return { ok: false, message: "Sessione mancante" };
    }

    const supabaseUrl = supabase?.supabaseUrl || window.SUPABASE_URL;
    const endpoint = `${supabaseUrl}/functions/v1/invita-dipendente`;

    const body = JSON.stringify({
      email,
      azienda_id: aziendaId,
      ruolo,
      dipendente_id: dipendenteId,
      mode,
    });

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("Edge function invita-dipendente error:", r.status, t);
      return { ok: false, message: t || `Errore invio (HTTP ${r.status})` };
    }

    return { ok: true };
  } catch (e) {
    console.error("Errore invio invito:", e);
    return { ok: false, message: "Errore rete o funzione" };
  }
}

function numOrNull(id) {
  const v = document.getElementById(id)?.value;
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
