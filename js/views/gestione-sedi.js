import { supabase } from "../supabaseClient.js";

function ruoloAttivo() {
  const raw = window.state?.viewAs || window.state?.ruolo;
  return window.normalizeRuolo ? window.normalizeRuolo(raw) : raw;
}

function puoGestireSedi() {
  return ["admin", "superadmin"].includes(ruoloAttivo());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function backButtonHtml(fallback = "#/home") {
  return `<button class="app-button tiny gray rf-back-button" data-back-fallback="${fallback}">← Indietro</button>`;
}

function bindBackButton(container) {
  const btn = container.querySelector(".rf-back-button");
  if (!btn) return;

  btn.onclick = () => {
    const fallback = btn.dataset.backFallback || "#/home";

    if (window.history.length > 1) {
      window.history.back();

      setTimeout(() => {
        if (!window.location.hash || window.location.hash === "#/gestione-sedi") {
          window.location.hash = fallback;
        }
      }, 200);
    } else {
      window.location.hash = fallback;
    }
  };
}

function getSedeCoords(sede = {}) {
  return {
    lat: toNumberOrNull(sede.latitudine),
    lon: toNumberOrNull(sede.longitudine),
    raggio: toNumberOrNull(sede.raggio_geofence_m) || 120,
  };
}

function geofenceSummary(sede = {}) {
  const { lat, lon, raggio } = getSedeCoords(sede);

  if (lat == null || lon == null) {
    return `<span class="small-muted">Geofence non configurata</span>`;
  }

  return `
    <span class="small-muted">
      Geofence: ${lat.toFixed(6)}, ${lon.toFixed(6)} · raggio ${Number(raggio || 0).toFixed(0)}m
    </span>
  `;
}

async function loadLeaflet() {
  if (window.L) return window.L;

  if (!document.querySelector('link[data-ristoflow-leaflet="css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.dataset.ristoflowLeaflet = "css";
    document.head.appendChild(link);
  }

  if (!document.querySelector('script[data-ristoflow-leaflet="js"]')) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.dataset.ristoflowLeaflet = "js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return window.L;
}

function setGeoFields(prefix, lat, lon, raggio = null) {
  const latEl = document.getElementById(`${prefix}-lat`);
  const lonEl = document.getElementById(`${prefix}-lon`);
  const rEl = document.getElementById(`${prefix}-raggio`);

  if (latEl && Number.isFinite(Number(lat))) latEl.value = Number(lat).toFixed(6);
  if (lonEl && Number.isFinite(Number(lon))) lonEl.value = Number(lon).toFixed(6);
  if (rEl && raggio != null && Number.isFinite(Number(raggio))) rEl.value = Number(raggio).toFixed(0);
}

async function initGeofenceMap(prefix, sede = {}) {
  const mapEl = document.getElementById(`${prefix}-map`);
  if (!mapEl) return;

  try {
    const L = await loadLeaflet();

    const fallbackLat = 41.902782;
    const fallbackLon = 12.496366;

    const coords = getSedeCoords(sede);
    const lat = coords.lat ?? fallbackLat;
    const lon = coords.lon ?? fallbackLon;
    const raggio = coords.raggio || 120;

    if (coords.lat != null && coords.lon != null) {
      setGeoFields(prefix, coords.lat, coords.lon, raggio);
    }

    const map = L.map(mapEl).setView([lat, lon], coords.lat != null ? 18 : 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    const marker = L.marker([lat, lon], { draggable: true }).addTo(map);
    const circle = L.circle([lat, lon], {
      radius: raggio,
      color: "#0E5A7A",
      fillColor: "#0E5A7A",
      fillOpacity: 0.12,
    }).addTo(map);

    const updateFromLatLng = (latlng) => {
      marker.setLatLng(latlng);
      circle.setLatLng(latlng);
      setGeoFields(prefix, latlng.lat, latlng.lng);
    };

    marker.on("dragend", () => {
      updateFromLatLng(marker.getLatLng());
    });

    map.on("click", (e) => {
      updateFromLatLng(e.latlng);
    });

    const raggioEl = document.getElementById(`${prefix}-raggio`);
    if (raggioEl) {
      raggioEl.addEventListener("input", () => {
        const next = Number(raggioEl.value);
        circle.setRadius(Number.isFinite(next) && next > 0 ? next : 120);
      });
    }

    const gpsBtn = document.getElementById(`${prefix}-gps`);
    if (gpsBtn) {
      gpsBtn.onclick = () => {
        if (!navigator.geolocation) {
          alert("Geolocalizzazione non supportata dal browser.");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const next = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            map.setView([next.lat, next.lng], 18);
            updateFromLatLng(next);
          },
          () => alert("Impossibile leggere la posizione attuale.")
        );
      };
    }

    const searchBtn = document.getElementById(`${prefix}-search-address`);
    if (searchBtn) {
      searchBtn.onclick = async () => {
        const indirizzo = document.getElementById(`${prefix}-indirizzo`)?.value?.trim();
        if (!indirizzo) {
          alert("Inserisci un indirizzo da cercare.");
          return;
        }

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(indirizzo)}`
          );
          const json = await res.json();
          const item = json?.[0];

          if (!item) {
            alert("Indirizzo non trovato. Sposta il pin manualmente sulla mappa.");
            return;
          }

          const next = {
            lat: Number(item.lat),
            lng: Number(item.lon),
          };

          map.setView([next.lat, next.lng], 18);
          updateFromLatLng(next);
        } catch (err) {
          console.error("Errore geocoding indirizzo:", err);
          alert("Errore ricerca indirizzo. Sposta il pin manualmente sulla mappa.");
        }
      };
    }

    setTimeout(() => map.invalidateSize(), 250);
  } catch (err) {
    console.error("Errore inizializzazione mappa geofence:", err);
    mapEl.innerHTML = `
      <div class="small-muted" style="padding:12px;">
        Mappa non disponibile. Inserisci latitudine, longitudine e raggio manualmente.
      </div>
    `;
  }
}

function geofenceFormHtml(prefix, sede = {}) {
  const coords = getSedeCoords(sede);

  return `
    <div class="card rf-geofence-card">
      <h3 style="margin-top:0;">Geofence sede</h3>

      <p class="small-muted" style="margin-top:0;">
        Posiziona il pin sul punto esatto dell’attività. La timbratura userà la sede attiva e questo raggio.
      </p>

      <div id="${prefix}-map" class="rf-geofence-map"></div>

      <div class="form-grid" style="margin-top:12px;">
        <div class="form-group">
          <label>Latitudine</label>
          <input id="${prefix}-lat" class="input" type="number" step="0.000001" value="${coords.lat ?? ""}" />
        </div>

        <div class="form-group">
          <label>Longitudine</label>
          <input id="${prefix}-lon" class="input" type="number" step="0.000001" value="${coords.lon ?? ""}" />
        </div>

        <div class="form-group">
          <label>Raggio geofence (metri)</label>
          <input id="${prefix}-raggio" class="input" type="number" min="20" step="10" value="${coords.raggio || 120}" />
        </div>
      </div>

      <div class="form-actions">
        <button type="button" id="${prefix}-gps" class="app-button small gray">
          📍 Usa posizione attuale
        </button>

        <button type="button" id="${prefix}-search-address" class="app-button small gray">
          🔎 Cerca indirizzo sulla mappa
        </button>
      </div>
    </div>
  `;
}

export async function render(container) {
  const azienda = window.state?.azienda;
  const mode = window.routeParams?.mode || "select";

  if (!azienda?.id) {
    container.innerHTML = `<div class="view">Nessuna azienda attiva</div>`;
    return;
  }

  await window.stateActions.caricaSedi();

  const sedi = window.state.sedi || [];

  if ((sedi.length === 0 || mode === "first") && puoGestireSedi()) {
    renderWizardPrimaSede(container, azienda.id);
    return;
  }

  if (mode === "manage" && puoGestireSedi()) {
    renderGestioneSedi(container, sedi);
    return;
  }

  renderSelezioneSede(container, sedi);
}

/* =========================
SELEZIONE
========================= */

function renderSelezioneSede(container, sedi) {
  container.innerHTML = `
    <div class="view">
      ${backButtonHtml("#/home")}
      <h2>Seleziona sede</h2>

      ${sedi.map(s => `
        <div class="card" style="margin-bottom:10px; cursor:pointer;"
          onclick="selectSede('${s.id}')">

          <div style="font-weight:700;">${escapeHtml(s.nome)}</div>
          <div style="font-size:12px; opacity:0.7;">${escapeHtml(s.indirizzo || "")}</div>
          <div style="margin-top:4px;">${geofenceSummary(s)}</div>

        </div>
      `).join("")}

    </div>
  `;

  bindBackButton(container);
}

window.selectSede = function(id){
  window.stateActions.setSedeAttiva(id);
  window.location.hash = "#/home";
};

/* =========================
GESTIONE
========================= */

function renderGestioneSedi(container, sedi){
  if (!puoGestireSedi()) {
    renderSelezioneSede(container, sedi);
    return;
  }

  container.innerHTML = `
    <div class="view">
      ${backButtonHtml("#/gestione-sedi")}

      <h2>Gestione sedi</h2>

      ${sedi.map(s => `
        <div class="card" style="margin-bottom:10px;">

          <div style="font-weight:700;">${escapeHtml(s.nome)}</div>
          <div style="font-size:12px; opacity:0.7;">${escapeHtml(s.indirizzo || "")}</div>
          <div style="margin-top:4px;">${geofenceSummary(s)}</div>

          ${s.logo_url ? `<img src="${s.logo_url}" style="height:40px; margin-top:6px;" />` : ""}

          <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button class="app-button tiny" onclick="editSede('${s.id}')">Modifica</button>
            <button class="app-button tiny red" onclick="disattivaSede('${s.id}')">Disattiva</button>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#0E5A7A;cursor:pointer;margin-left:4px;">
              <input type="checkbox" ${s.visibile_in_book !== false ? 'checked' : ''}
                onchange="toggleVisibileInBook('${s.id}', this.checked)"
                style="width:16px;height:16px;accent-color:#0E5A7A;cursor:pointer;">
              Visibile in RistoflowBook
            </label>
          </div>

        </div>
      `).join("")}

      <button class="app-button" onclick="window.location.hash='#/home'">
        ← Torna
      </button>

    </div>
  `;

  bindBackButton(container);
}

/* =========================
CREAZIONE
========================= */

function renderWizardPrimaSede(container, aziendaId){
  if (!puoGestireSedi()) {
    window.location.hash = "#/gestione-sedi";
    return;
  }

  container.innerHTML = `
    <div class="view">
      ${backButtonHtml("#/gestione-sedi")}

      <h2>Crea sede</h2>

      <div class="card">
        <div class="form-grid">
          <div class="form-group">
            <label>Nome sede</label>
            <input id="create-nome" class="input" placeholder="Nome sede" />
          </div>

          <div class="form-group">
            <label>Indirizzo</label>
            <input id="create-indirizzo" class="input" placeholder="Indirizzo" />
          </div>

          <div class="form-group">
            <label>Logo sede</label>
            <input type="file" id="create-logo" />
          </div>
        </div>
      </div>

      ${geofenceFormHtml("create", {})}

      <button id="save" class="app-button">Crea sede</button>

    </div>
  `;

  bindBackButton(container);
  initGeofenceMap("create", {});

  document.getElementById("save").onclick = async () => {
    const nome = document.getElementById("create-nome").value.trim();
    const indirizzo = document.getElementById("create-indirizzo").value.trim();
    const file = document.getElementById("create-logo").files[0];

    if(!nome){
      alert("Nome obbligatorio");
      return;
    }

    let logo_url = null;

    if (file) {
      logo_url = await uploadLogo(file, aziendaId);
    }

    const latitudine = toNumberOrNull(document.getElementById("create-lat")?.value);
    const longitudine = toNumberOrNull(document.getElementById("create-lon")?.value);
    const raggio_geofence_m = toNumberOrNull(document.getElementById("create-raggio")?.value) || 120;

    const { data, error } = await supabase
      .from("sedi")
      .insert({
        azienda_id: aziendaId,
        nome,
        indirizzo,
        logo_url,
        latitudine,
        longitudine,
        raggio_geofence_m,
        attiva: true
      })
      .select()
      .single();

    if(error){
      console.error(error);
      alert("Errore creazione sede");
      return;
    }

    await window.stateActions.caricaSedi();
    window.stateActions.setSedeAttiva(data.id);

    window.location.hash = "#/home";
  };
}

/* =========================
MODIFICA
========================= */

window.editSede = async function(id){
  if (!puoGestireSedi()) {
    alert("Non hai i permessi per modificare le sedi.");
    return;
  }

  const sede = window.state.sedi.find(s => String(s.id) === String(id));
  if(!sede) return;

  const app = document.getElementById("app") || document.body;

  app.innerHTML = `
    <div class="view">
      ${backButtonHtml("#/gestione-sedi?mode=manage")}

      <h2>Modifica sede</h2>

      <div class="card">
        <div class="form-grid">
          <div class="form-group">
            <label>Nome sede</label>
            <input id="edit-nome" class="input" value="${escapeHtml(sede.nome)}" />
          </div>

          <div class="form-group">
            <label>Indirizzo</label>
            <input id="edit-indirizzo" class="input" value="${escapeHtml(sede.indirizzo || "")}" />
          </div>

          <div class="form-group">
            <label>Logo sede</label>
            <input type="file" id="edit-logo" />
          </div>
          <div class="form-group" style="grid-column:1/-1;">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
              <input type="checkbox" id="edit-visibile-book" ${sede.visibile_in_book !== false ? 'checked' : ''}
                style="width:18px;height:18px;accent-color:#0E5A7A;cursor:pointer;">
              <span>
                <strong>Visibile in RistoflowBook</strong>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">Se deselezionato, questa sede non appare nel social (es. magazzini, centri cottura interni)</div>
              </span>
            </label>
          </div>
        </div>

        ${sede.logo_url ? `<img src="${sede.logo_url}" style="height:48px; margin-top:10px;" />` : ""}
      </div>

      ${geofenceFormHtml("edit", sede)}

      <div class="form-actions">
        <button id="saveEdit" class="app-button">Salva sede</button>
        <button class="app-button gray" onclick="window.location.hash='#/gestione-sedi?mode=manage'">Annulla</button>
      </div>
    </div>
  `;

  bindBackButton(app);
  initGeofenceMap("edit", sede);

  document.getElementById("saveEdit").onclick = async () => {
    const nome = document.getElementById("edit-nome").value.trim();
    const indirizzo = document.getElementById("edit-indirizzo").value.trim();
    const file = document.getElementById("edit-logo").files[0];

    let logo_url = sede.logo_url;

    if (file) {
      logo_url = await uploadLogo(file, sede.azienda_id);
    }

    const latitudine = toNumberOrNull(document.getElementById("edit-lat")?.value);
    const longitudine = toNumberOrNull(document.getElementById("edit-lon")?.value);
    const raggio_geofence_m = toNumberOrNull(document.getElementById("edit-raggio")?.value) || 120;

    const visibile_in_book = document.getElementById("edit-visibile-book")?.checked ?? true;

    const { error } = await supabase
      .from("sedi")
      .update({
        nome,
        indirizzo,
        logo_url,
        latitudine,
        longitudine,
        raggio_geofence_m,
        visibile_in_book
      })
      .eq("id", id);

    if(error){
      console.error(error);
      alert("Errore aggiornamento");
      return;
    }

    await window.stateActions.caricaSedi();

    const nuovaSede = window.state.sedi.find(s => String(s.id) === String(id));

    if (nuovaSede) {
      window.state.sedeAttiva = nuovaSede;
      localStorage.setItem("active_sede_id", nuovaSede.id);
    }

    if (window.renderAziendaUI) {
      window.renderAziendaUI();
    }

    window.location.hash = "#/gestione-sedi?mode=manage";
  };
};

/* =========================
UPLOAD LOGO
========================= */

async function uploadLogo(file, aziendaId){
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${aziendaId}/${fileName}`;

  const { error } = await supabase.storage
    .from("loghi-aziende")
    .upload(filePath, file, {
      upsert: true
    });

  if(error){
    console.error(error);
    alert("Errore upload logo");
    return null;
  }

  const { data } = supabase.storage
    .from("loghi-aziende")
    .getPublicUrl(filePath);

  return data.publicUrl + "?t=" + Date.now();
}

/* =========================
DISATTIVA
========================= */


window.toggleVisibileInBook = async function(id, visibile) {
  const supa = window.supabaseClient || window.supabase;
  const { error } = await supa.from("sedi").update({ visibile_in_book: visibile }).eq("id", id);
  if (error) {
    alert("Errore aggiornamento: " + error.message);
  }
};

window.disattivaSede = async function(id){
  if (!puoGestireSedi()) {
    alert("Non hai i permessi per modificare le sedi.");
    return;
  }

  if(!confirm("Disattivare sede?")) return;

  await supabase
    .from("sedi")
    .update({ attiva: false })
    .eq("id", id);

  await window.stateActions.caricaSedi();
  location.reload();
};
