import { createPageLayout, createCard } from "../utils/pageLayout.js";
import { creaPinModal } from "../components/pinModal.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value ?? "");
  }
}

function toNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizePin(value) {
  return String(value ?? "").trim();
}

function getRuoloAttivo() {
  const raw =
    window.state?.viewAs ||
    window.state?.ruolo ||
    window.state?.utenteAzienda?.ruolo ||
    "";

  if (window.normalizeRuolo) return window.normalizeRuolo(raw);
  return String(raw || "").trim().toLowerCase();
}

function canSeeAll(ruolo) {
  return ruolo === "admin" || ruolo === "manager" || ruolo === "superadmin";
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const p1 = toRad(lat1);
  const p2 = toRad(lat2);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      const err = new Error("GEO_UNSUPPORTED");
      err.code = "GEO_UNSUPPORTED";
      reject(err);
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
      ...options,
    });
  });
}

async function fetchDipendenteByUser(aziendaId, userId) {
  if (!aziendaId || !userId) return null;

  const { data, error } = await window.supabaseClient
    .from("dipendenti")
    .select("id, nome, cognome, pin")
    .eq("azienda_id", aziendaId)
    .eq("user_id", userId)
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

async function fetchDipendentiAzienda(
  aziendaId,
  sedeUuid
) {

  if (!aziendaId) {
    return [];
  }

  let userIds = [];

  if (sedeUuid) {
    let utentiSedeQuery =
      window.supabaseClient
        .from("utenti_sedi")
        .select("user_id, sede_uuid")
        .eq("sede_uuid", sedeUuid);

    utentiSedeQuery =
      utentiSedeQuery.eq(
        "azienda_id",
        aziendaId
      );

    const {
      data: utentiSede,
      error: utentiSedeError
    } =
      await utentiSedeQuery;

    if (utentiSedeError) {
      throw utentiSedeError;
    }

    userIds =
      Array.from(
        new Set(
          (utentiSede || [])
            .map((row) => row?.user_id)
            .filter(Boolean)
            .map((id) => String(id))
        )
      );

    if (!userIds.length) {
      return [];
    }
  }

  let query =
    window.supabaseClient
      .from("dipendenti")
      .select(
        "id, nome, cognome, attivo, user_id"
      )
      .eq("azienda_id", aziendaId);

  if (sedeUuid) {
    query =
      query.in(
        "user_id",
        userIds
      );
  }

  const { data, error } =
    await query.order(
      "nome",
      { ascending: true }
    );

  if (error) {
    throw error;
  }

  return data || [];

}

async function fetchActiveGeofences(aziendaId, sedeUuid = null) {
  if (!aziendaId) return [];

  const sede =
    (window.state?.sedeAttiva && String(window.state.sedeAttiva.id) === String(sedeUuid || window.state.sedeAttiva.id)
      ? window.state.sedeAttiva
      : null) ||
    (Array.isArray(window.state?.sedi)
      ? window.state.sedi.find((s) => String(s.id) === String(sedeUuid))
      : null);

  const lat = toNum(sede?.latitudine);
  const lon = toNum(sede?.longitudine);
  const raggio = toNum(sede?.raggio_geofence_m) || 120;

  if (lat == null || lon == null) {
    return [];
  }

  return [{
    id: sede?.id || sedeUuid || "sede-attiva",
    nome: sede?.nome || "Sede attiva",
    lat,
    lon,
    raggio_m: raggio,
    attivo: true,
    sede_uuid: sede?.id || sedeUuid || null
  }];
}

async function insertTimbratura(payload) {
  if (!payload?.azienda_id) throw new Error("azienda_id mancante");
  if (!payload?.dipendente_id) throw new Error("dipendente_id mancante");
  if (!payload?.tipo) throw new Error("tipo timbratura mancante");

  const { error } = await window.supabaseClient.from("timbrature").insert([payload]);
  if (error) throw error;
}

async function fetchLastTipo(aziendaId, dipendenteId) {
  if (!aziendaId || !dipendenteId) return null;

  const { data, error } = await window.supabaseClient
    .from("timbrature")
    .select("tipo, timestamp")
    .eq("azienda_id", aziendaId)
    .eq("dipendente_id", dipendenteId)
    .order("timestamp", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0]?.tipo || null;
}

async function fetchRecentForDipendente(aziendaId, dipendenteId, limit = 80) {
  if (!aziendaId || !dipendenteId) return [];

  const { data, error } = await window.supabaseClient
    .from("timbrature")
    .select("dipendente_id, dip_nome, tipo, timestamp, geo_esito, geo_motivo, lat, lon, accuracy_m, canale")
    .eq("azienda_id", aziendaId)
    .eq("dipendente_id", dipendenteId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function fetchRecentForAzienda(
  aziendaId,
  sedeUuid,
  limit = 500
) {

  if (!aziendaId) {
    return [];
  }

  let query =
    window.supabaseClient
      .from("timbrature")
      .select(`
        dipendente_id,
        dip_nome,
        tipo,
        timestamp,
        geo_esito,
        geo_motivo,
        lat,
        lon,
        accuracy_m,
        canale,
        sede_uuid
      `)
      .eq("azienda_id", aziendaId);

  if (sedeUuid) {
    query =
      query.eq(
        "sede_uuid",
        sedeUuid
      );
  }

  const { data, error } =
    await query
      .order(
        "timestamp",
        { ascending: false }
      )
      .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];

}

async function verificaPinTimbrature({ aziendaId, dipendenteId, pin }) {
  if (!aziendaId || !dipendenteId) return false;

  const pinInserito = normalizePin(pin);
  if (!pinInserito) return false;

  const { data, error } = await window.supabaseClient
    .from("dipendenti")
    .select("pin")
    .eq("azienda_id", aziendaId)
    .eq("id", dipendenteId)
    .maybeSingle();

  if (error || !data) return false;

  const pinDb = normalizePin(data.pin);

  if (!pinDb) {
    alert("PIN non configurato");
    return false;
  }

  return pinDb === pinInserito;
}

function tipoToLabel(tipo) {
  switch (tipo) {
    case "inizio_turno":
      return "Entrata";
    case "inizio_pausa":
      return "Pausa";
    case "fine_pausa":
      return "Rientro";
    case "fine_turno":
      return "Fine turno";
    default:
      return tipo || "-";
  }
}

function tipoToState(tipo) {
  if (tipo === "inizio_turno" || tipo === "fine_pausa") return "Dentro";
  if (tipo === "inizio_pausa") return "In pausa";
  return "Fuori turno";
}

function computeUiFromLastTipo(lastTipo) {
  const ui = {
    stato: "Fuori turno",
    primaryLabel: "Entrata",
    primaryAction: "inizio_turno",
    primaryEnabled: true,
    pausaEnabled: false,
    fineEnabled: false,
  };

  if (lastTipo === "inizio_turno" || lastTipo === "fine_pausa") {
    ui.stato = "In turno";
    ui.primaryEnabled = false;
    ui.pausaEnabled = true;
    ui.fineEnabled = true;
    return ui;
  }

  if (lastTipo === "inizio_pausa") {
    ui.stato = "In pausa";
    ui.primaryLabel = "Rientro";
    ui.primaryAction = "fine_pausa";
    ui.primaryEnabled = true;
    ui.pausaEnabled = false;
    ui.fineEnabled = true;
    return ui;
  }

  return ui;
}

function buildGeoResultView(geoEsito, geoMotivo) {
  if (!geoEsito) return `<span style="opacity:.7;">—</span>`;

  const badge = `
    <span style="
      display:inline-block;
      padding:2px 8px;
      border-radius:999px;
      font-size:12px;
      font-weight:800;
      border:1px solid rgba(0,0,0,.12);
      background:${geoEsito === "OK" ? "rgba(22,163,74,.10)" : "rgba(220,38,38,.10)"};
    ">${escapeHtml(geoEsito)}</span>
  `;

  return `${badge}${geoMotivo ? ` <span style="opacity:.7;">(${escapeHtml(geoMotivo)})</span>` : ""}`;
}

function svgIcon(name) {
  const common = `class="tb-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"`;

  if (name === "play") return `<svg ${common} fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  if (name === "pause") return `<svg ${common} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`;
  if (name === "stop") return `<svg ${common} fill="currentColor"><path d="M6 6h12v12H6z"/></svg>`;

  return `<svg ${common} fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`;
}

function getDipendenteNome(d) {
  return normalizeText(`${d?.nome || ""} ${d?.cognome || ""}`) || "Dipendente";
}

function buildRowsTable(rows, options = {}) {
  const showSensitive = options.showSensitive === true;
  const showDetails = options.showDetails === true;

  if (!rows.length) {
    return `<div class="timbrature-muted">Nessuna timbratura trovata.</div>`;
  }

  if (!showSensitive) {
    return `
      <div class="tb-operator-list">
        ${rows
          .map((r) => `
            <div class="tb-operator-row">
              <div class="tb-operator-main">
                <strong>${escapeHtml(tipoToLabel(r.tipo))}</strong>
                <span>${escapeHtml(formatDateTime(r.timestamp))}</span>
              </div>
              <span class="tb-status-pill">${escapeHtml(tipoToState(r.tipo))}</span>
            </div>
          `)
          .join("")}
      </div>
    `;
  }

  return `
    <div class="tb-table-wrapper">
      <table class="tb-table">
      <thead>
        <tr>
          <th>Dipendente</th>
          <th>Tipo</th>
          <th>Data/Ora</th>
          <th>Geofence</th>
          <th>Posizione</th>
          ${showDetails ? `<th>Dettagli</th>` : ""}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((r, index) => {
            const coords =
              r.lat != null && r.lon != null
                ? `${Number(r.lat).toFixed(6)}, ${Number(r.lon).toFixed(6)} ± ${r.accuracy_m != null ? Number(r.accuracy_m).toFixed(0) : "?"}m`
                : "posizione non disponibile";

            return `
              <tr>
                <td>
                  <strong>${escapeHtml(r.dip_nome || "Dipendente")}</strong>
                  <br>
                  <span style="opacity:.7;">${escapeHtml(r.canale || "")}</span>
                </td>
                <td>${escapeHtml(tipoToLabel(r.tipo))}</td>
                <td>${escapeHtml(formatDateTime(r.timestamp))}</td>
                <td>${buildGeoResultView(r.geo_esito, r.geo_motivo)}</td>
                <td style="opacity:.8;">${escapeHtml(coords)}</td>
                ${
                  showDetails
                    ? `<td><button class="app-button small tb-detail-btn" type="button" data-tb-index="${index}">Dettagli</button></td>`
                    : ""
                }
              </tr>
            `;
          })
          .join("")}
      </tbody>
      </table>
    </div>
  `;
}

function computeOperatorSummary(rows) {
  const ordered = [...rows].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const byDay = new Map();

  for (const row of ordered) {
    const ts = row?.timestamp ? new Date(row.timestamp) : null;
    if (!ts || Number.isNaN(ts.getTime())) continue;

    const dayKey = ts.toISOString().slice(0, 10);
    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, {
        dayKey,
        label: ts.toLocaleDateString(),
        ms: 0,
        openStart: null,
        pausaStart: null,
      });
    }

    const day = byDay.get(dayKey);

    if (row.tipo === "inizio_turno") {
      day.openStart = ts;
      day.pausaStart = null;
    } else if (row.tipo === "inizio_pausa" && day.openStart) {
      day.ms += Math.max(0, ts - day.openStart);
      day.openStart = null;
      day.pausaStart = ts;
    } else if (row.tipo === "fine_pausa") {
      day.openStart = ts;
      day.pausaStart = null;
    } else if (row.tipo === "fine_turno") {
      if (day.openStart) {
        day.ms += Math.max(0, ts - day.openStart);
      }
      day.openStart = null;
      day.pausaStart = null;
    }
  }

  const items = [...byDay.values()]
    .sort((a, b) => String(b.dayKey).localeCompare(String(a.dayKey)))
    .slice(0, 7);

  if (!items.length) {
    return `<div class="timbrature-muted">Resoconto ore non disponibile.</div>`;
  }

  const formatMs = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  return `
    <div class="tb-summary">
      <div class="tb-summary-title">Resoconto ore</div>
      ${items
        .map((item) => `
          <div class="tb-summary-row">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(formatMs(item.ms))}</strong>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function buildTimbraturaDetailsModal(row) {
  const coords =
    row?.lat != null && row?.lon != null
      ? `${Number(row.lat).toFixed(6)}, ${Number(row.lon).toFixed(6)}`
      : "Posizione non disponibile";

  const accuracy =
    row?.accuracy_m != null
      ? `${Number(row.accuracy_m).toFixed(0)} m`
      : "Non disponibile";

  return `
    <div class="tb-modal-backdrop" data-tb-modal-close="1">
      <div class="tb-modal-card" role="dialog" aria-modal="true" aria-label="Dettagli timbratura">
        <div class="tb-modal-header">
          <div>
            <div class="tb-modal-kicker">Dettagli timbratura</div>
            <h3>${escapeHtml(row?.dip_nome || "Dipendente")}</h3>
          </div>
          <button class="tb-modal-close" type="button" data-tb-modal-close="1" aria-label="Chiudi">×</button>
        </div>

        <div class="tb-modal-grid">
          <div class="tb-detail-field">
            <span>Tipo</span>
            <strong>${escapeHtml(tipoToLabel(row?.tipo))}</strong>
          </div>
          <div class="tb-detail-field">
            <span>Data/Ora</span>
            <strong>${escapeHtml(formatDateTime(row?.timestamp))}</strong>
          </div>
          <div class="tb-detail-field">
            <span>Geofence</span>
            <strong>${row?.geo_esito ? escapeHtml(row.geo_esito) : "—"}</strong>
          </div>
          <div class="tb-detail-field">
            <span>Motivo geofence</span>
            <strong>${escapeHtml(row?.geo_motivo || "—")}</strong>
          </div>
          <div class="tb-detail-field">
            <span>Coordinate GPS</span>
            <strong>${escapeHtml(coords)}</strong>
          </div>
          <div class="tb-detail-field">
            <span>Precisione GPS</span>
            <strong>${escapeHtml(accuracy)}</strong>
          </div>
          <div class="tb-detail-field">
            <span>Canale</span>
            <strong>${escapeHtml(row?.canale || "—")}</strong>
          </div>
          <div class="tb-detail-field">
            <span>Sede</span>
            <strong>${escapeHtml(row?.sede_uuid || "—")}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

function computeEmployeesStatus(dipendenti, rows) {
  const latestByDip = new Map();

  for (const r of rows) {
    if (!r.dipendente_id) continue;
    if (!latestByDip.has(r.dipendente_id)) latestByDip.set(r.dipendente_id, r);
  }

  const list = dipendenti.map((d) => {
    const latest = latestByDip.get(d.id);
    return {
      dipendente_id: d.id,
      dip_nome: latest?.dip_nome || getDipendenteNome(d),
      stato: tipoToState(latest?.tipo),
      ts: latest?.timestamp || null,
      attivo: d.attivo !== false,
    };
  });

  return {
    list,
    dentro: list.filter((x) => x.stato === "Dentro"),
    pausa: list.filter((x) => x.stato === "In pausa"),
    fuori: list.filter((x) => x.stato === "Fuori turno"),
  };
}

function renderOperatorCard() {
  return createCard({
    title: "Timbratura",
    body: `
      <div class="timbrature-muted" id="tb-status">Caricamento stato...</div>

      <div class="tb-scroll-actions">
        <div class="tb-actions-mobile">
          <button id="btn-primary" class="btn-timbratura big green" type="button">
            ${svgIcon("play")}
            <div class="tb-label">Entrata</div>
          </button>

          <button id="btn-pausa" class="btn-timbratura big gray" type="button">
            ${svgIcon("pause")}
            <div class="tb-label">Pausa</div>
          </button>

          <button id="btn-fine" class="btn-timbratura big red" type="button">
            ${svgIcon("stop")}
            <div class="tb-label">Fine turno</div>
          </button>
        </div>
      </div>

      <div id="tb-msg" style="margin-top:10px;"></div>
    `,
  });
}

function renderManagerCards() {
  return `
    ${createCard({
      title: "Monitor live",
      body: `
        <div id="tb-chips" class="tb-chips"></div>
        <div id="tb-people" style="margin-top:10px;"></div>
      `,
    })}

    ${createCard({
      title: "Storico Timbrature",
      body: `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <button id="tb-toggle" class="app-button small" type="button">
            Mostra Timbrature 📋
          </button>
        </div>

        <div
          id="tb-manager-panel"
          class="timbrature-card"
          style="margin-top:12px; display:none;"
        >
          <div class="timbrature-toolbar">
            <input
              id="tb-manager-search"
              class="input-pill"
              placeholder="Cerca..."
              style="flex:1; min-width:220px;"
            />

            <select
              id="tb-manager-filter"
              class="input-pill"
              style="max-width:260px;"
            ></select>
          </div>

          <div id="tb-manager-list" style="margin-top:10px;"></div>
        </div>
      `,
    })}
  `;
}

function renderOperatorHistoryCard() {
  return createCard({
    title: "Le tue timbrature",
    body: `
      <div
        id="tb-operator-panel"
        class="timbrature-card"
        style="margin-top:12px;"
      >
        <div id="tb-operator-list" style="margin-top:10px;"></div>
      </div>
    `,
  });
}

export async function render(app) {
  try {
    const azienda = window.state?.azienda;
    const user = window.state?.user;
    const ruolo = getRuoloAttivo();
    const isManager = canSeeAll(ruolo);

    if (!azienda?.id || !user?.id) {
      app.innerHTML = `
        <div class="login-wrapper">
          <div class="login-card">
            <h3>Sessione non valida</h3>
          </div>
        </div>
      `;
      return;
    }

    const dipendenteData = await fetchDipendenteByUser(azienda.id, user.id);
    const dipendenteId = dipendenteData?.id || null;
    const canTimbrare = !!dipendenteId;
    const isOperatore = canTimbrare;

    if (!canTimbrare && !isManager) {
      app.innerHTML = createPageLayout({
        title: "Timbrature",
        subtitle: "",
        content: createCard({
          title: "Dipendente non collegato",
          body: `
            <div class="timbrature-muted">
              Il tuo utente non è collegato a un record dipendente valido.
              Contatta un amministratore per completare l'associazione.
            </div>
          `,
        }),
      });
      return;
    }

    let panelOpen = !isManager;
    let cachedRowsAll = [];
    let cachedRowsMine = [];
    let cachedDipendenti = [];
    let selectedDip = "ALL";

    app.innerHTML = createPageLayout({
      title: "Timbrature",
      subtitle: "",
      content: `
        <div class="timbrature-page">
          ${canTimbrare ? renderOperatorCard() : ""}
          ${isManager ? renderManagerCards() : ""}
          ${canTimbrare ? renderOperatorHistoryCard() : ""}
        </div>
      `,
    });

    const elStatus = app.querySelector("#tb-status");
    const elPrimary = app.querySelector("#btn-primary");
    const elPausa = app.querySelector("#btn-pausa");
    const elFine = app.querySelector("#btn-fine");
    const elMsg = app.querySelector("#tb-msg");
    const elManagerList = app.querySelector("#tb-manager-list");
    const elOperatorList = app.querySelector("#tb-operator-list");
    const elToggle = app.querySelector("#tb-toggle");
    const elPanel = app.querySelector("#tb-manager-panel");
    const elSearch = app.querySelector("#tb-manager-search");
    const elFilter = app.querySelector("#tb-manager-filter");
    const elChips = app.querySelector("#tb-chips");
    const elPeople = app.querySelector("#tb-people");

    function setMsg(text, kind = "info") {
      if (!elMsg) return;

      const bg =
        kind === "ok"
          ? "rgba(0,160,80,.10)"
          : kind === "error"
            ? "rgba(220,60,60,.10)"
            : "rgba(0,0,0,.05)";

      const border =
        kind === "ok"
          ? "rgba(0,160,80,.25)"
          : kind === "error"
            ? "rgba(220,60,60,.25)"
            : "rgba(0,0,0,.10)";

      elMsg.innerHTML = `
        <div style="padding:10px 12px; border-radius:10px; background:${bg}; border:1px solid ${border};">
          ${text}
        </div>
      `;
    }

    function applyListFilters(rows) {
      const q = String(elSearch?.value || "").trim().toLowerCase();
      let out = rows;

      if (isManager && selectedDip && selectedDip !== "ALL") {
        out = out.filter((r) => String(r.dipendente_id || "") === String(selectedDip));
      }

      if (q) {
        out = out.filter((r) => {
          const dip = String(r.dip_nome || "").toLowerCase();
          const tipo = String(tipoToLabel(r.tipo) || "").toLowerCase();
          const ts = String(formatDateTime(r.timestamp) || "").toLowerCase();
          return dip.includes(q) || tipo.includes(q) || ts.includes(q);
        });
      }

      return out;
    }

    function refreshManagerTimbratureList() {
      if (!isManager || !elManagerList) return;

      const rows = applyListFilters(cachedRowsAll);
      elManagerList.innerHTML = buildRowsTable(rows, {
        showSensitive: true,
        showDetails: true,
      });
    }

    function refreshOperatorTimbratureList() {
      if (!isOperatore || !elOperatorList) return;

      const rows = applyListFilters(cachedRowsMine);
      elOperatorList.innerHTML = `
        ${computeOperatorSummary(cachedRowsMine)}
        ${buildRowsTable(rows, {
          showSensitive: false,
          showDetails: false,
        })}
      `;
    }

    function openTimbraturaDetails(index) {
      if (!isManager) return;

      const rows = applyListFilters(cachedRowsAll);
      const row = rows[Number(index)];

      if (!row) return;

      const existing = app.querySelector(".tb-modal-backdrop");
      if (existing) existing.remove();

      app.insertAdjacentHTML("beforeend", buildTimbraturaDetailsModal(row));

      const modal = app.querySelector(".tb-modal-backdrop");
      modal?.addEventListener("click", (event) => {
        if (event.target?.dataset?.tbModalClose === "1") {
          modal.remove();
        }
      });
    }

    function refreshDipendentiSummary() {
      if (!isManager || !elChips || !elPeople) return;

      const { dentro, pausa, fuori } = computeEmployeesStatus(cachedDipendenti, cachedRowsAll);

      elChips.innerHTML = `
        <span class="tb-chip"><span class="tb-dot in"></span> Presenti: ${dentro.length}</span>
        <span class="tb-chip"><span class="tb-dot pause"></span> In pausa: ${pausa.length}</span>
        <span class="tb-chip"><span class="tb-dot out"></span> Fuori turno: ${fuori.length}</span>
      `;

      const renderGroup = (title, items, dotClass) => {
        if (!items.length) return "";

        const names = items
          .sort((a, b) => String(a.dip_nome || "").localeCompare(String(b.dip_nome || "")))
          .map((x) => `
            <span class="tb-chip">
              <span class="tb-dot ${dotClass}"></span>
              ${escapeHtml(x.dip_nome || "Dipendente")}
            </span>
          `)
          .join("");

        return `
          <div style="margin-top:10px;">
            <div style="font-weight:900; margin-bottom:6px;">${escapeHtml(title)}</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">${names}</div>
          </div>
        `;
      };

      elPeople.innerHTML =
        renderGroup("Presenti", dentro, "in") +
        renderGroup("In pausa", pausa, "pause") +
        renderGroup("Fuori turno", fuori, "out");
    }

    function refreshFilterOptions() {
      if (!isManager || !elFilter) return;

      const options = cachedDipendenti
        .map((d) => ({
          id: d.id,
          name: getDipendenteNome(d),
        }))
        .filter((x) => x.id)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));

      elFilter.innerHTML =
        `<option value="ALL">Tutti i dipendenti</option>` +
        options
          .map((o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)}</option>`)
          .join("");

      elFilter.value = selectedDip;
    }

    async function loadManagerData() {
      if (!isManager) return;

    const sedeUuid =
  window.state?.sedeAttiva?.id ||
  null;

cachedDipendenti =
  await fetchDipendentiAzienda(
    azienda.id,
    sedeUuid
  );

cachedRowsAll =
  await fetchRecentForAzienda(
    azienda.id,
    sedeUuid,
    500
  );
      refreshFilterOptions();
      refreshDipendentiSummary();

      if (panelOpen) refreshManagerTimbratureList();
    }

    async function loadOperatorData() {
      if (!isOperatore || !dipendenteId) return;

      cachedRowsMine = await fetchRecentForDipendente(azienda.id, dipendenteId, 120);
      refreshOperatorTimbratureList();
    }

    async function refreshOperatorUi() {
      if (!isOperatore || !dipendenteId) return;

      if (elMsg) elMsg.innerHTML = "";

      const lastTipo = await fetchLastTipo(azienda.id, dipendenteId);
      const ui = computeUiFromLastTipo(lastTipo);

      if (elStatus) elStatus.textContent = `Stato attuale: ${ui.stato}`;

      const primaryLabelEl = elPrimary?.querySelector(".tb-label");
      if (primaryLabelEl) primaryLabelEl.textContent = ui.primaryLabel;

      if (elPrimary) elPrimary.disabled = !ui.primaryEnabled;
      if (elPausa) elPausa.disabled = !ui.pausaEnabled;
      if (elFine) elFine.disabled = !ui.fineEnabled;

      elPrimary?.classList.remove("active");
      elPausa?.classList.remove("active");
      elFine?.classList.remove("active");

      if (ui.stato === "Fuori turno") elPrimary?.classList.add("active");
      if (ui.stato === "In turno") elPausa?.classList.add("active");
      if (ui.stato === "In pausa") elPrimary?.classList.add("active");

      await loadOperatorData();
    }

    async function doTimbratura(tipo) {
      if (!isOperatore || !dipendenteId) return;

    const pinRaw = await creaPinModal();

console.log("PIN RAW:", pinRaw);
console.log("TIPO PIN:", typeof pinRaw);

if (typeof pinRaw === "object") {
  console.log(
    "PIN OBJECT:",
    JSON.stringify(pinRaw)
  );
}

const pinNormalizzato =
  normalizePin(
    typeof pinRaw === "object"
      ? (
          pinRaw?.pin ||
          pinRaw?.value ||
          pinRaw?.codice ||
          ""
        )
      : pinRaw
  );

console.log(
  "PIN NORMALIZZATO:",
  pinNormalizzato
);

if (!pinNormalizzato) {
  setMsg("PIN non inserito", "error");
  return;
}

const pinOk = await verificaPinTimbrature({
  aziendaId: azienda.id,
  dipendenteId,
  pin: pinNormalizzato,
});

      if (!pinOk) {
        setMsg("PIN errato", "error");
        return;
      }

      if (elPrimary) elPrimary.disabled = true;
      if (elPausa) elPausa.disabled = true;
      if (elFine) elFine.disabled = true;

      setMsg("Acquisizione posizione...", "info");

      const dipNome =
        getDipendenteNome(dipendenteData) ||
        user?.user_metadata?.full_name ||
        user?.email ||
        "Dipendente";

      const basePayload = {
        azienda_id: azienda.id,
        sede_uuid:
          window.state?.sedeAttiva?.id || null,
        dipendente_id: dipendenteId,
        dip_nome: dipNome,
        canale: "web",
        tipo,
        timestamp: new Date().toISOString(),
        device_info: navigator.userAgent || "unknown",
        geo_ts: new Date().toISOString(),
      };

      let lat = null;
      let lon = null;
      let accuracy_m = null;

      try {
        const pos = await getPosition();
        lat = toNum(pos?.coords?.latitude);
        lon = toNum(pos?.coords?.longitude);
        accuracy_m = toNum(pos?.coords?.accuracy);
      } catch (err) {
        const code = typeof err?.code === "number" ? err.code : null;
        let motivo = "GEO_UNAVAILABLE";

        if (err?.message === "GEO_UNSUPPORTED" || err?.code === "GEO_UNSUPPORTED") motivo = "GEO_UNSUPPORTED";
        else if (code === 1) motivo = "GEO_DENIED";
        else if (code === 2) motivo = "GEO_UNAVAILABLE";
        else if (code === 3) motivo = "GEO_TIMEOUT";

        try {
          await insertTimbratura({
            ...basePayload,
            lat,
            lon,
            accuracy_m,
            geo_esito: "KO",
            geo_motivo: motivo,
          });

          setMsg(
            `Timbratura registrata, ma geolocalizzazione non disponibile (${escapeHtml(motivo)}).`,
            "error"
          );
        } catch (e2) {
          console.error("TIMBRATURE insertTimbratura GEO FALLBACK ERROR:", e2);
          setMsg(`Errore salvataggio timbratura: ${escapeHtml(e2.message || e2)}`, "error");
        }

        await refreshOperatorUi();
        return;
      }

      let geo_esito = "KO";
      let geo_motivo = "NO_GEOFENCE_CONFIGURED";

      try {
        const fences = await fetchActiveGeofences(
          azienda.id,
          window.state?.sedeAttiva?.id || null
        );

        if (!fences.length) {
          geo_esito = "KO";
          geo_motivo = "NO_GEOFENCE_CONFIGURED";
        } else if (lat == null || lon == null) {
          geo_esito = "KO";
          geo_motivo = "GEO_UNAVAILABLE";
        } else {
          let best = null;

          for (const f of fences) {
            const fLat = toNum(f.lat);
            const fLon = toNum(f.lon);
            const raggio = Number(f.raggio_m ?? 0);

            if (fLat == null || fLon == null || !Number.isFinite(raggio) || raggio <= 0) continue;

            const dist = haversineMeters(lat, lon, fLat, fLon);
            if (!best || dist < best.dist) best = { f, dist, raggio };
          }

          if (!best) {
            geo_esito = "KO";
            geo_motivo = "GEOFENCE_INVALID_CONFIG";
          } else if (best.dist <= best.raggio) {
            geo_esito = "OK";
            geo_motivo = `IN (${Math.round(best.dist)}m <= ${best.raggio}m) ${best.f.nome || ""}`.trim();
          } else {
            geo_esito = "KO";
            geo_motivo = `OUT (${Math.round(best.dist)}m > ${best.raggio}m) ${best.f.nome || ""}`.trim();
          }
        }
      } catch (e) {
        console.error("TIMBRATURE fetchActiveGeofences ERROR:", e);
        geo_esito = "KO";
        geo_motivo = "GEOFENCE_ERROR";
      }

      try {
        await insertTimbratura({
          ...basePayload,
          lat,
          lon,
          accuracy_m,
          geo_esito,
          geo_motivo,
        });

        setMsg(
          `Timbratura registrata: <strong>${escapeHtml(tipoToLabel(tipo))}</strong> • Geofence: <strong>${escapeHtml(geo_esito)}</strong>`,
          geo_esito === "OK" ? "ok" : "error"
        );
      } catch (err) {
        console.error("TIMBRATURE insertTimbratura ERROR:", err);
        setMsg(`Errore salvataggio timbratura: ${escapeHtml(err.message || err)}`, "error");
      }

      await refreshOperatorUi();
    }

    if (isManager) {
      if (elToggle && elPanel) {
        elToggle.addEventListener("click", () => {
          panelOpen = !panelOpen;
          elPanel.style.display = panelOpen ? "block" : "none";
          elToggle.textContent = panelOpen ? "Nascondi Timbrature 📋" : "Mostra Timbrature 📋";
          if (panelOpen) refreshManagerTimbratureList();
        });
      }

      if (elSearch) {
        elSearch.addEventListener("input", () => {
          if (panelOpen) refreshManagerTimbratureList();
        });
      }

      if (elFilter) {
        elFilter.addEventListener("change", () => {
          selectedDip = elFilter.value || "ALL";
          if (panelOpen) refreshManagerTimbratureList();
        });
      }


      if (elManagerList) {
        elManagerList.addEventListener("click", (event) => {
          const btn = event.target?.closest?.("[data-tb-index]");
          if (!btn) return;
          openTimbraturaDetails(btn.dataset.tbIndex);
        });
      }

      await loadManagerData();
    }

    if (isOperatore) {
      elPrimary?.addEventListener("click", async () => {
        if (!dipendenteId) return;

        const lastTipo = await fetchLastTipo(azienda.id, dipendenteId);
        const ui = computeUiFromLastTipo(lastTipo);

        if (ui.stato === "Fuori turno") {
          await doTimbratura("inizio_turno");
          return;
        }

        if (ui.stato === "In pausa") {
          await doTimbratura("fine_pausa");
        }
      });

      elPausa?.addEventListener("click", async () => {
        if (!dipendenteId) return;

        const lastTipo = await fetchLastTipo(azienda.id, dipendenteId);
        const ui = computeUiFromLastTipo(lastTipo);

        if (ui.stato !== "In turno") return;
        await doTimbratura("inizio_pausa");
      });

      elFine?.addEventListener("click", async () => {
        if (!dipendenteId) return;

        const lastTipo = await fetchLastTipo(azienda.id, dipendenteId);
        const ui = computeUiFromLastTipo(lastTipo);

        if (ui.stato === "Fuori turno") return;
        await doTimbratura("fine_turno");
      });

      await refreshOperatorUi();
    }
  } catch (e) {
    console.error("TIMBRATURE ERROR:", e);
    app.innerHTML = createPageLayout({
      title: "Timbrature",
      subtitle: "",
      content: createCard({
        title: "Errore caricamento",
        body: `
          <div class="timbrature-muted">
            ${escapeHtml(e?.message || "Errore imprevisto durante il caricamento delle timbrature.")}
          </div>
        `,
      }),
    });
  }
}
