import { createPageLayout, createCard } from "../utils/pageLayout.js";
import { creaPinModal, verificaPin } from "../components/pinModal.js";

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

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      const err = new Error("GEO_UNSUPPORTED");
      err.code = "GEO_UNSUPPORTED";
      reject(err);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
        ...options,
      }
    );
  });
}

async function fetchActiveGeofences(aziendaId) {
  const { data, error } = await window.supabaseClient
    .from("geofence_aziende")
    .select("id, nome, lat, lon, raggio_m, attivo")
    .eq("azienda_id", aziendaId)
    .eq("attivo", true);

  if (error) throw error;
  return data || [];
}

async function insertTimbratura(payload) {
  const { error } = await window.supabaseClient.from("timbrature").insert([payload]);
  if (error) throw error;
}

async function fetchLastTipo(aziendaId, dipendenteId) {
  const { data, error } = await window.supabaseClient
    .from("timbrature")
    .select("tipo, timestamp")
    .eq("azienda_id", aziendaId)
    .eq("dipendente_id", dipendenteId)
    .order("timestamp", { ascending: false })
    .limit(1);

  if (error) throw error;
  const row = (data || [])[0];
  return row?.tipo || null;
}

async function fetchRecentForDipendente(aziendaId, dipendenteId, limit = 50) {
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

async function fetchRecentForAzienda(aziendaId, limit = 250) {
  const { data, error } = await window.supabaseClient
    .from("timbrature")
    .select("dipendente_id, dip_nome, tipo, timestamp, geo_esito, geo_motivo, lat, lon, accuracy_m, canale")
    .eq("azienda_id", aziendaId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

function tipoToLabel(tipo) {
  switch (tipo) {
    case "inizio_turno":
      return "Entrata";
    case "inizio_pausa":
      return "Inizia pausa";
    case "fine_pausa":
      return "Rientro da pausa";
    case "fine_turno":
      return "Fine turno";
    default:
      return tipo || "-";
  }
}

function tipoToState(tipo) {
  if (tipo === "inizio_turno" || tipo === "fine_pausa") return "Dentro";
  if (tipo === "inizio_pausa") return "In pausa";
  if (tipo === "fine_turno") return "Fuori";
  return "Fuori";
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
    ui.primaryLabel = "Entrata";
    ui.primaryAction = "inizio_turno";
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

  if (lastTipo === "fine_turno") {
    ui.primaryLabel = "Fine turno";
    return ui;
  }

  return ui;
}

function buildGeoResultView(geo_esito, geo_motivo) {
  if (!geo_esito) return `<span style="opacity:.7;">—</span>`;
  const badge = `<span style="
    display:inline-block;
    padding:2px 8px;
    border-radius:999px;
    font-size:12px;
    font-weight:800;
    border:1px solid rgba(0,0,0,.12);
    background:${geo_esito === "OK" ? "rgba(22,163,74,.10)" : "rgba(220,38,38,.10)"};
  ">${escapeHtml(geo_esito)}</span>`;

  const motive = geo_motivo ? ` <span style="opacity:.7;">(${escapeHtml(geo_motivo)})</span>` : "";
  return `${badge}${motive}`;
}

function svgIcon(name) {
  const common = `class="tb-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"`;
  if (name === "play") {
    return `<svg ${common} fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
  }
  if (name === "pause") {
    return `<svg ${common} fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>`;
  }
  if (name === "stop") {
    return `<svg ${common} fill="currentColor"><path d="M6 6h12v12H6z"/></svg>`;
  }
  return `<svg ${common} fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`;
}

function canSeeAll(ruolo) {
  return ruolo === "admin" || ruolo === "manager" || ruolo === "superadmin";
}

function buildRowsTable(rows) {
  if (!rows.length) {
    return `<div class="timbrature-muted">Nessuna timbratura trovata.</div>`;
  }

  const head = `
    <table class="tb-table">
      <thead>
        <tr>
          <th>Dipendente</th>
          <th>Tipo</th>
          <th>Data/Ora</th>
          <th>Geofence</th>
          <th>Posizione</th>
        </tr>
      </thead>
      <tbody>
  `;

  const body = rows
    .map((r) => {
      const geo = buildGeoResultView(r.geo_esito, r.geo_motivo);
      const coords =
        r.lat != null && r.lon != null
          ? `${Number(r.lat).toFixed(6)}, ${Number(r.lon).toFixed(6)} ± ${r.accuracy_m != null ? Number(r.accuracy_m).toFixed(0) : "?"}m`
          : `posizione non disponibile`;

      return `
        <tr>
          <td><strong>${escapeHtml(r.dip_nome || "")}</strong><br><span style="opacity:.7;">${escapeHtml(r.canale || "")}</span></td>
          <td>${escapeHtml(tipoToLabel(r.tipo))}</td>
          <td>${escapeHtml(formatDateTime(r.timestamp))}</td>
          <td>${geo}</td>
          <td style="opacity:.8;">${escapeHtml(coords)}</td>
        </tr>
      `;
    })
    .join("");

  const tail = `</tbody></table>`;
  return head + body + tail;
}

function computeEmployeesFromRows(rows) {
  const latestByEmp = new Map();
  for (const r of rows) {
    const key = r.dipendente_id || r.dip_nome || "unknown";
    if (!latestByEmp.has(key)) {
      latestByEmp.set(key, r);
    }
  }

  const list = Array.from(latestByEmp.values()).map((r) => {
    const stato = tipoToState(r.tipo);
    return { dipendente_id: r.dipendente_id, dip_nome: r.dip_nome, stato, ts: r.timestamp };
  });

  const dentro = list.filter((x) => x.stato === "Dentro");
  const pausa = list.filter((x) => x.stato === "In pausa");
  const fuori = list.filter((x) => x.stato === "Fuori");

  return { list, dentro, pausa, fuori };
}
async function richiediPin(dipendenteId, aziendaId) {

  const pin = prompt("Inserisci PIN dipendente");

  if (!pin) return false;

  const { data, error } = await window.supabaseClient
    .from("dipendenti")
    .select("pin, codice_pin")
    .eq("id", dipendenteId)
    .eq("azienda_id", aziendaId)
    .maybeSingle();

  if (error || !data) return false;

  const pinDb = data.pin || data.codice_pin;

  if (!pinDb) {
    alert("PIN non configurato");
    return false;
  }

  if (String(pinDb) !== String(pin)) {
    alert("PIN errato");
    return false;
  }

  return true;
}
export async function render(app) {
  try {
    console.log("TIMBRATURE LOAD START");
    console.log("render start");

    const azienda = window.state?.azienda;
    const user = window.state?.user;
    const ruolo = window.state?.ruolo;

    if (!azienda || !user) {
      app.innerHTML = `
        <div class="login-wrapper">
          <div class="login-card">
            <h3>Sessione non valida</h3>
          </div>
        </div>
      `;
      return;
    }

   const { data: dipendentiData, error: dipErr } =
  await window.supabaseClient
    .from("dipendenti")
    .select("id")
    .eq("user_id", user.id)
    .eq("azienda_id", azienda.id)
    .limit(1);

if (dipErr) {

  console.error(
    "ERRORE DIPENDENTE:",
    dipErr
  );

  throw dipErr;

}

const dipendenteData =
  dipendentiData?.[0] || null;

if (!dipendenteData) {

  const ruoloNorm =
    window.normalizeRuolo
      ? window.normalizeRuolo(
          window.state?.viewAs ||
          window.state?.ruolo
        )
      : (
          window.state?.viewAs ||
          window.state?.ruolo
        );

  // ADMIN / MANAGER / SUPERADMIN
  // possono entrare senza record dipendente

  if (
    ruoloNorm === "admin" ||
    ruoloNorm === "manager" ||
    ruoloNorm === "superadmin"
  ) {

    console.warn(
      "Accesso admin senza dipendente"
    );

  } else {

    throw new Error(
      "Dipendente non trovato"
    );

  }

}


const dipendenteId =
  dipendenteData?.id || null;
    const dipNome = user?.user_metadata?.full_name || user?.email || "Dipendente";

    const isManager = canSeeAll(ruolo);

    let panelOpen = false;
    let cachedRowsAll = [];
    let cachedRowsMine = [];
    let selectedDip = "ALL";

    app.innerHTML = createPageLayout({
      title: "Timbrature",
      subtitle: "",
      content: `
    <div class="timbrature-page">

      ${createCard({
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

          <div id="tb-last-geo" class="timbrature-muted" style="margin-top:12px;"></div>
          <div id="tb-msg" style="margin-top:10px;"></div>
        `
      })}

     ${isManager ? createCard({
  title: "Stato Dipendenti",
  body: `
    <div id="tb-chips" class="tb-chips"></div>
    <div id="tb-people" style="margin-top:10px;"></div>
  `
}) : ""}

${createCard({
  title: isManager ? "Storico Timbrature" : "Le tue timbrature",
  body: `
    
    ${isManager ? `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <button id="tb-toggle" class="app-button small">Mostra Timbrature 📋</button>
      </div>
    ` : ""}

    <div id="tb-panel" class="timbrature-card" style="margin-top:12px; ${isManager ? "display:none;" : ""}">
      
      ${isManager ? `
        <div class="timbrature-toolbar">
          <input id="tb-search" class="input-pill" placeholder="Cerca..." style="flex:1; min-width:220px;" />
          <select id="tb-filter" class="input-pill" style="max-width:260px;"></select>
        </div>
      ` : ""}

      <div id="tb-list" class="timbrature-muted" style="margin-top:10px;">
        Caricamento...
      </div>

    </div>
  `
})}
    </div>
  `
});

    const elStatus = app.querySelector("#tb-status");
    const elPrimary = app.querySelector("#btn-primary");
    const elPausa = app.querySelector("#btn-pausa");
    const elFine = app.querySelector("#btn-fine");
    const elMsg = app.querySelector("#tb-msg");
    const elList = app.querySelector("#tb-list");
    const elLastGeo = app.querySelector("#tb-last-geo");

    const elToggle = app.querySelector("#tb-toggle");
    const elPanel = app.querySelector("#tb-panel");
    const elSearch = app.querySelector("#tb-search");
    const elFilter = app.querySelector("#tb-filter");

    const elChips = app.querySelector("#tb-chips");
    const elPeople = app.querySelector("#tb-people");

    if (!elStatus || !elPrimary || !elPausa || !elFine || !elMsg || !elLastGeo) {
      throw new Error("TIMBRATURE_DOM_MISSING");
    }

    function setMsg(text, kind = "info") {
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
        <div style="padding:10px 12px; border-radius:10px; background:${bg}; border:1px solid ${border};">${text}</div>
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

    function refreshTimbratureList() {
      if (!elList) return;

      const rowsBase = isManager ? cachedRowsAll : cachedRowsMine;
      const rows = applyListFilters(rowsBase);
      elList.innerHTML = buildRowsTable(rows);

      const last = rowsBase[0];
      if (last) {
        elLastGeo.innerHTML = `Ultimo esito geofence: ${buildGeoResultView(last.geo_esito, last.geo_motivo)}`;
      } else {
        elLastGeo.innerHTML = "";
      }
    }

    function refreshDipendentiSummary() {
      if (!isManager || !elChips || !elPeople) return;

      const base = isManager ? cachedRowsAll : cachedRowsMine;
      const { dentro, pausa, fuori } = computeEmployeesFromRows(base);

      elChips.innerHTML = `
        <span class="tb-chip"><span class="tb-dot in"></span> Dentro: ${dentro.length}</span>
        <span class="tb-chip"><span class="tb-dot pause"></span> Pausa: ${pausa.length}</span>
        <span class="tb-chip"><span class="tb-dot out"></span> Fuori: ${fuori.length}</span>
      `;

      const renderGroup = (title, items, dotClass) => {
        if (!items.length) return "";
        const names = items
          .sort((a, b) => String(a.dip_nome || "").localeCompare(String(b.dip_nome || "")))
          .map((x) => `<span class="tb-chip"><span class="tb-dot ${dotClass}"></span>${escapeHtml(x.dip_nome || "")}</span>`)
          .join(" ");
        return `<div style="margin-top:10px;"><div style="font-weight:900; margin-bottom:6px;">${escapeHtml(title)}</div><div style="display:flex; gap:8px; flex-wrap:wrap;">${names}</div></div>`;
      };

      elPeople.innerHTML =
        renderGroup("Dentro", dentro, "in") +
        renderGroup("In pausa", pausa, "pause") +
        renderGroup("Fuori", fuori, "out");
    }

    async function loadData() {
      try {
        cachedRowsMine = await fetchRecentForDipendente(azienda.id, dipendenteId, 120);
      } catch (e) {
        console.error("TIMBRATURE fetchRecentForDipendente ERROR:", e);
        throw e;
      }

      if (isManager) {
        try {
          cachedRowsAll = await fetchRecentForAzienda(azienda.id, 500);
        } catch (e) {
          console.error("TIMBRATURE fetchRecentForAzienda ERROR:", e);
          throw e;
        }
      } else {
        cachedRowsAll = [];
      }

      if (isManager && elFilter) {
        const options = [];
        const seen = new Map();
        for (const r of cachedRowsAll) {
          if (!r.dipendente_id) continue;
          if (!seen.has(r.dipendente_id)) seen.set(r.dipendente_id, r.dip_nome || "Dipendente");
        }
        for (const [id, name] of seen.entries()) {
          options.push({ id, name });
        }
        options.sort((a, b) => String(a.name).localeCompare(String(b.name)));

        elFilter.innerHTML =
          `<option value="ALL">Tutti i dipendenti</option>` +
          options.map((o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)}</option>`).join("");
      }
    }

    async function refreshUi() {
      elMsg.innerHTML = "";

      let lastTipo = null;
      try {
        lastTipo = await fetchLastTipo(azienda.id, dipendenteId);
      } catch (e) {
        console.error("TIMBRATURE fetchLastTipo ERROR:", e);
        throw e;
      }

      const ui = computeUiFromLastTipo(lastTipo);

      elStatus.textContent = `Stato attuale: ${ui.stato}`;

      const primaryLabel = ui.primaryLabel;
      const primaryLabelEl = elPrimary.querySelector(".tb-label");
      if (!primaryLabelEl) throw new Error("TIMBRATURE_PRIMARY_LABEL_MISSING");
      primaryLabelEl.textContent = primaryLabel;

      elPrimary.disabled = !ui.primaryEnabled;
      elPausa.disabled = !ui.pausaEnabled;
      elFine.disabled = !ui.fineEnabled;

      elPrimary.classList.remove("active");
      elPausa.classList.remove("active");
      elFine.classList.remove("active");

      if (ui.stato === "Fuori turno") {
        elPrimary.classList.add("active");
      }

      if (ui.stato === "In turno") {
        elPausa.classList.add("active");
      }

      if (ui.stato === "In pausa") {
        elPrimary.classList.add("active");
      }

      await loadData();
      refreshDipendentiSummary();
      if (panelOpen) refreshTimbratureList();
    }

   async function doTimbratura(tipo) {

  const pin = await creaPinModal();

  if (!pin) {
    setMsg("PIN non inserito", "error");
    return;
  }

  const ok = await verificaPin({
    dipendenteId,
    aziendaId: azienda.id,
    pin
  });

  if (!ok) {
    setMsg("PIN errato", "error");
    return;
  }

  elPrimary.disabled = true;
  elPausa.disabled = true;
  elFine.disabled = true;

      setMsg("Acquisizione posizione...", "info");

      const basePayload = {
        azienda_id: azienda.id,
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
          setMsg(`Timbratura registrata, ma geolocalizzazione non disponibile (${escapeHtml(motivo)}).`, "error");
        } catch (e2) {
          console.error("TIMBRATURE insertTimbratura GEO FALLBACK ERROR:", e2);
          setMsg(`Errore salvataggio timbratura: ${escapeHtml(e2.message || e2)}`, "error");
        }

        await refreshUi();
        return;
      }

      let geo_esito = "KO";
      let geo_motivo = "NO_GEOFENCE_CONFIGURED";

      try {
        const fences = await fetchActiveGeofences(azienda.id);

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

      await refreshUi();
    }

    if (elToggle && elPanel) {
      elToggle.addEventListener("click", () => {
        panelOpen = !panelOpen;
        elPanel.style.display = panelOpen ? "block" : "none";
        elToggle.textContent = panelOpen ? "Nascondi Timbrature 📋" : "Mostra Timbrature 📋";
        if (panelOpen) refreshTimbratureList();
      });
    }

    if (elSearch) {
      elSearch.addEventListener("input", () => {
        if (!panelOpen) return;
        refreshTimbratureList();
      });
    }

    if (elFilter) {
      elFilter.addEventListener("change", () => {
        selectedDip = elFilter.value || "ALL";
        if (!panelOpen) return;
        refreshTimbratureList();
      });
    }

    elPrimary.addEventListener("click", async () => {
      const lastTipo = await fetchLastTipo(azienda.id, dipendenteId);
      const ui = computeUiFromLastTipo(lastTipo);

      if (ui.stato === "Fuori turno") {
        await doTimbratura("inizio_turno");
        return;
      }
      if (ui.stato === "In pausa") {
        await doTimbratura("fine_pausa");
        return;
      }
    });

    elPausa.addEventListener("click", async () => {
      const lastTipo = await fetchLastTipo(azienda.id, dipendenteId);
      const ui = computeUiFromLastTipo(lastTipo);
      if (ui.stato !== "In turno") return;
      await doTimbratura("inizio_pausa");
    });

    elFine.addEventListener("click", async () => {
      const lastTipo = await fetchLastTipo(azienda.id, dipendenteId);
      const ui = computeUiFromLastTipo(lastTipo);
      if (ui.stato === "Fuori turno") return;
      await doTimbratura("fine_turno");
    });

    await refreshUi();
    console.log("analisi completata");
  } catch (e) {
    console.error("TIMBRATURE ERROR:", e);
    app.innerHTML = "<div>Errore caricamento</div>";
  }
}
