// views/timbrature.js

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

async function fetchRecent(aziendaId, dipendenteId, limit = 10) {
  const { data, error } = await window.supabaseClient
    .from("timbrature")
    .select("tipo, timestamp, geo_esito, geo_motivo, lat, lon, accuracy_m")
    .eq("azienda_id", aziendaId)
    .eq("dipendente_id", dipendenteId)
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

function computeUiFromLastTipo(lastTipo) {
  // Stato + abilitazioni secondo regola:
  // - Entrata (solo quando fuori turno), oppure "Rientro da pausa" quando in pausa
  // - Inizia pausa (solo quando in turno e non in pausa)
  // - Fine turno (solo quando in turno o in pausa)
  const ui = {
    stato: "Fuori turno",
    primaryLabel: "Entrata 🟢",
    primaryAction: "inizio_turno",
    primaryEnabled: true,
    pausaEnabled: false,
    fineEnabled: false,
  };

  if (lastTipo === "inizio_turno" || lastTipo === "fine_pausa") {
    ui.stato = "In turno";
    ui.primaryLabel = "Entrata 🟢";
    ui.primaryAction = "inizio_turno";
    ui.primaryEnabled = false; // entrata non ripetibile in turno
    ui.pausaEnabled = true;
    ui.fineEnabled = true;
    return ui;
  }

  if (lastTipo === "inizio_pausa") {
    ui.stato = "In pausa";
    ui.primaryLabel = "Rientro da pausa ⏸️";
    ui.primaryAction = "fine_pausa";
    ui.primaryEnabled = true;
    ui.pausaEnabled = false;
    ui.fineEnabled = true;
    return ui;
  }

  if (lastTipo === "fine_turno") {
    ui.primaryLabel = "Fine turno ❌";
    return ui;
  }

  return ui;
}

function buildGeoResultView(geo_esito, geo_motivo) {
  if (!geo_esito) return `<span style="opacity:.7;">—</span>`;
  const ok = geo_esito === "OK";
  const badge = `<span style="
    display:inline-block;
    padding:2px 8px;
    border-radius:999px;
    font-size:12px;
    font-weight:700;
    border:1px solid rgba(0,0,0,.12);
  ">${escapeHtml(geo_esito)}</span>`;

  const motive = geo_motivo ? ` <span style="opacity:.7;">(${escapeHtml(geo_motivo)})</span>` : "";
  return `${ok ? badge : badge}${motive}`;
}

export async function render(app) {
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

  const dipendenteId = user.id;
  const dipNome = user?.user_metadata?.full_name || user?.email || "Dipendente";

  app.innerHTML = `
    <div class="page">
      <div class="page-header">
        <h2>Timbrature</h2>
        <div style="opacity:.7; margin-top:4px;">Azienda: ${escapeHtml(azienda.nome || "")}</div>
      </div>

      <div class="card" style="margin-top:12px;">
        <div id="tb-status" style="opacity:.75;">Caricamento stato...</div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
          <button id="btn-primary" class="btn-green">Entrata 🟢</button>
          <button id="btn-pausa" class="btn-gray">Inizia Pausa ⏸️</button>
          <button id="btn-fine" class="btn-red">Fine Turno ❌</button>
        </div>

        <div id="tb-last-geo" style="margin-top:12px; opacity:.75;"></div>
        <div id="tb-msg" style="margin-top:10px;"></div>
      </div>

      <div class="card" style="margin-top:12px;">
        <h3 style="margin:0 0 10px 0;">Ultime timbrature</h3>
        <div id="tb-list" style="opacity:.75;">Caricamento...</div>
      </div>
    </div>
  `;

  const elStatus = app.querySelector("#tb-status");
  const elPrimary = app.querySelector("#btn-primary");
  const elPausa = app.querySelector("#btn-pausa");
  const elFine = app.querySelector("#btn-fine");
  const elMsg = app.querySelector("#tb-msg");
  const elList = app.querySelector("#tb-list");
  const elLastGeo = app.querySelector("#tb-last-geo");

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

  async function refreshUi() {
    elMsg.innerHTML = "";

    const lastTipo = await fetchLastTipo(azienda.id, dipendenteId);
    const ui = computeUiFromLastTipo(lastTipo);

    elStatus.textContent = `Stato attuale: ${ui.stato}`;

    elPrimary.textContent = ui.primaryLabel;
    elPrimary.disabled = !ui.primaryEnabled;

    elPausa.disabled = !ui.pausaEnabled;
    elFine.disabled = !ui.fineEnabled;

    const rows = await fetchRecent(azienda.id, dipendenteId, 10);
    if (!rows.length) {
      elList.innerHTML = `<div style="opacity:.7;">Nessuna timbratura trovata.</div>`;
      elLastGeo.innerHTML = "";
      return;
    }

    const last = rows[0];
    elLastGeo.innerHTML = `Ultimo esito geofence: ${buildGeoResultView(last.geo_esito, last.geo_motivo)}`;

    elList.innerHTML = rows
      .map((r) => {
        const geo = buildGeoResultView(r.geo_esito, r.geo_motivo);
        const coords =
          r.lat != null && r.lon != null
            ? `<span style="opacity:.7;">• ${Number(r.lat).toFixed(6)}, ${Number(r.lon).toFixed(6)} ± ${r.accuracy_m != null ? Number(r.accuracy_m).toFixed(0) : "?"}m</span>`
            : `<span style="opacity:.7;">• posizione non disponibile</span>`;

        return `        
          <div style="padding:10px 0; border-bottom:1px solid rgba(0,0,0,0.06);">
            <div><strong>${escapeHtml(tipoToLabel(r.tipo))}</strong> • ${escapeHtml(formatDateTime(r.timestamp))}</div>
            <div style="opacity:.7;">${geo} ${coords}</div>
          </div>
        `;
      })
      .join("");
  }

  async function doTimbratura(tipo) {
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
      setMsg(`Errore salvataggio timbratura: ${escapeHtml(err.message || err)}`, "error");
    }

    await refreshUi();
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
}
