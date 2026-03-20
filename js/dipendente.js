import { supabase } from "../supabaseClient.js";
import { createPageLayout, createCard } from "../utils/pageLayout.js";

export async function render(container) {
  const user = window.state?.user;
  const azienda = window.state?.azienda;
  const sedeAttiva = window.state?.sedeAttiva;
  const dipendenteId = window.routeParams?.id || null;

  if (!user || !azienda) {
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Errore</h2>
        <p class="small-muted" style="margin-top:6px;">Sessione o azienda non disponibile.</p>
      </div>
    `;
    return;
  }

  if (!dipendenteId) {
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Dipendente non trovato</h2>
        <p class="small-muted" style="margin-top:6px;">Manca l'identificativo del dipendente nella route.</p>
        <div style="margin-top:16px;">
          <button class="app-button small gray" id="btn-back-dipendenti">⬅ Torna ai dipendenti</button>
        </div>
      </div>
    `;

    const btnBack = document.getElementById("btn-back-dipendenti");
    if (btnBack) {
      btnBack.onclick = () => {
        window.location.hash = "#/dipendenti";
      };
    }
    return;
  }

  if (!window.hasPermesso || !window.hasPermesso("dipendenti.read")) {
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Accesso negato</h2>
        <p class="small-muted" style="margin-top:6px;">
          Non hai i permessi per visualizzare la scheda dipendente.
        </p>
      </div>
    `;
    return;
  }

  const [
    dipRes,
    sediRes,
    repartiRes,
    valutazioniRes
  ] = await Promise.all([
    supabase
      .from("dipendenti")
      .select("*")
      .eq("id", dipendenteId)
      .eq("azienda_id", azienda.id)
      .single(),

    supabase
      .from("sedi")
      .select("id,nome")
      .eq("azienda_id", azienda.id)
      .order("nome", { ascending: true }),

    supabase
      .from("reparti")
      .select("id,nome")
      .eq("azienda_id", azienda.id)
      .order("sort_order", { ascending: true }),

    supabase
      .from("dipendenti_valutazioni")
      .select(`
        id,
        periodo_da,
        periodo_a,
        tipo,
        punteggio_presenza,
        punteggio_velocita,
        punteggio_qualita,
        punteggio_conoscenza,
        punteggio_autonomia,
        punteggio_collaborazione,
        punteggio_responsabilita,
        punteggio_totale,
        punti_forza,
        aree_miglioramento,
        note_manager,
        azione_consigliata,
        valutatore_ruolo,
        created_at
      `)
      .eq("azienda_id", azienda.id)
      .eq("dipendente_id", dipendenteId)
      .order("created_at", { ascending: false })
  ]);

  const dip = dipRes.data;
  const dipError = dipRes.error;

  if (dipError || !dip) {
    console.error("Errore caricamento dipendente:", dipError);
    container.innerHTML = `
      <div class="view">
        <h2 style="margin-top:0;">Errore caricamento</h2>
        <p class="small-muted" style="margin-top:6px;">Impossibile caricare la scheda dipendente.</p>
        <div style="margin-top:16px;">
          <button class="app-button small gray" id="btn-back-dipendenti">⬅ Torna ai dipendenti</button>
        </div>
      </div>
    `;

    const btnBack = document.getElementById("btn-back-dipendenti");
    if (btnBack) {
      btnBack.onclick = () => {
        window.location.hash = "#/dipendenti";
      };
    }
    return;
  }

  const sedi = sediRes.data || [];
  const reparti = repartiRes.data || [];
  const valutazioni = Array.isArray(valutazioniRes.data) ? valutazioniRes.data : [];

  const repartiMap = Object.fromEntries(reparti.map((r) => [String(r.id), r.nome]));
  const sediMap = Object.fromEntries(sedi.map((s) => [String(s.id), s.nome]));

  const profiloAI = normalizeProfiloAI(dip.profilo_ai);
  const ultimaValutazione = valutazioni.length > 0 ? valutazioni[0] : null;

  const fotoUrl = dip.foto_url || "";
  const nomeCompleto = buildNomeCompleto(dip);
  const repartoLabel = dip.reparto_id ? repartiMap[String(dip.reparto_id)] || dip.reparto_id : "-";
  const sedeLabel = dip.sede_id ? sediMap[String(dip.sede_id)] || dip.sede_id : (sedeAttiva?.nome || "-");
  const statoLabel = dip.attivo ? "Attivo" : "Non attivo";
  const tipoCompensoLabel = dip.tipo_compenso || "-";

  const content = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
      <button class="app-button small gray" id="btn-back-dipendenti">⬅ Torna ai dipendenti</button>
      ${window.hasPermesso && window.hasPermesso("dipendenti.update")
        ? `<button class="app-button small" id="btn-edit-dipendente">✏️ Modifica</button>`
        : ""}
    </div>

    <div style="display:grid; gap:16px;">

      ${createCard({
        title: "Profilo",
        body: `
          <div style="display:grid; grid-template-columns:minmax(0, 120px) minmax(0, 1fr); gap:16px; align-items:start;">
            <div>
              ${fotoUrl
                ? `<img src="${escapeHtmlAttr(fotoUrl)}" alt="${escapeHtmlAttr(nomeCompleto)}" style="width:100px;height:100px;border-radius:18px;object-fit:cover;border:1px solid #e5e7eb;background:#f9fafb;">`
                : `<div style="width:100px;height:100px;border-radius:18px;border:1px solid #e5e7eb;background:#f9fafb;display:flex;align-items:center;justify-content:center;font-size:28px;">👤</div>`}
            </div>

            <div style="display:grid; gap:10px;">
              <div>
                <div style="font-size:22px; font-weight:700; line-height:1.2;">${escapeHtml(nomeCompleto)}</div>
                <div class="small-muted" style="margin-top:4px;">Scheda anagrafica dipendente</div>
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
                ${infoRow("Email", dip.email || "-")}
                ${infoRow("Telefono", dip.telefono || "-")}
                ${infoRow("Ruolo", dip.ruolo || "-")}
                ${infoRow("Mansione", dip.mansione || "-")}
                ${infoRow("Reparto", repartoLabel)}
                ${infoRow("Sede", sedeLabel)}
                ${infoRow("Stato", statoLabel)}
                ${infoRow("Data nascita", formatDate(dip.data_nascita))}
              </div>
            </div>
          </div>
        `
      })}

      ${createCard({
        title: "Costo",
        body: `
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
            ${infoRow("Tipo compenso", tipoCompensoLabel)}
            ${infoRow("Retribuzione base", formatCurrencyOrDash(dip.retribuzione_base))}
            ${infoRow("Costo orario", formatCurrencyOrDash(dip.costo_orario))}
            ${infoRow("Ore mensili contrattuali", formatNumberOrDash(dip.ore_mensili_contrattuali))}
            ${infoRow("Ore medie per servizio", formatNumberOrDash(dip.ore_medie_per_servizio))}
            ${infoRow("Costo medio", dip.costo_medio || "-")}
          </div>
        `
      })}

      ${createCard({
        title: "Obiettivi",
        body: `
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
            ${infoRow("Obiettivi personali", profiloAI.obiettivi_personali || "-")}
            ${infoRow("Obiettivi professionali", profiloAI.obiettivi_professionali || "-")}
            ${infoRow("Tipo crescita", profiloAI.tipo_crescita || "-")}
            ${infoRow("Ruolo target", profiloAI.ruolo_target || "-")}
          </div>
        `
      })}

      ${createCard({
        title: "Valutazione",
        body: ultimaValutazione
          ? `
            <div style="display:grid; gap:14px;">
              <div class="small-muted">
                Ultima valutazione registrata il ${formatDateTime(ultimaValutazione.created_at)}
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px;">
                ${scoreRow("Presenza", ultimaValutazione.punteggio_presenza)}
                ${scoreRow("Velocità", ultimaValutazione.punteggio_velocita)}
                ${scoreRow("Qualità", ultimaValutazione.punteggio_qualita)}
                ${scoreRow("Conoscenza", ultimaValutazione.punteggio_conoscenza)}
                ${scoreRow("Autonomia", ultimaValutazione.punteggio_autonomia)}
                ${scoreRow("Collaborazione", ultimaValutazione.punteggio_collaborazione)}
                ${scoreRow("Responsabilità", ultimaValutazione.punteggio_responsabilita)}
                ${scoreRow("Punteggio totale", ultimaValutazione.punteggio_totale)}
              </div>

              <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px;">
                ${infoRow("Periodo", formatPeriodo(ultimaValutazione.periodo_da, ultimaValutazione.periodo_a))}
                ${infoRow("Tipo", ultimaValutazione.tipo || "-")}
                ${infoRow("Valutatore ruolo", ultimaValutazione.valutatore_ruolo || "-")}
                ${infoRow("Azione consigliata", ultimaValutazione.azione_consigliata || "-")}
              </div>

              <div style="display:grid; gap:10px;">
                ${longTextRow("Punti di forza", ultimaValutazione.punti_forza || "-")}
                ${longTextRow("Aree miglioramento", ultimaValutazione.aree_miglioramento || "-")}
                ${longTextRow("Note manager", ultimaValutazione.note_manager || "-")}
              </div>
            </div>
          `
          : `
            <div class="small-muted">
              Nessuna valutazione disponibile. Il blocco è pronto per collegarsi al form valutazioni e allo storico.
            </div>
          `
      })}

      ${createCard({
        title: "Storico valutazioni",
        body: valutazioni.length > 0
          ? `
            <div class="table-wrapper">
              <table class="table-timbrature">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Periodo</th>
                    <th>Tipo</th>
                    <th>Ruolo valutatore</th>
                    <th>Totale</th>
                    <th>Presenza</th>
                    <th>Velocità</th>
                    <th>Qualità</th>
                    <th>Conoscenza</th>
                    <th>Autonomia</th>
                    <th>Collaborazione</th>
                    <th>Responsabilità</th>
                  </tr>
                </thead>
                <tbody>
                  ${valutazioni.map((v) => `
                    <tr>
                      <td>${escapeHtml(formatDateTime(v.created_at))}</td>
                      <td>${escapeHtml(formatPeriodo(v.periodo_da, v.periodo_a))}</td>
                      <td>${escapeHtml(v.tipo || "-")}</td>
                      <td>${escapeHtml(v.valutatore_ruolo || "-")}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_totale))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_presenza))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_velocita))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_qualita))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_conoscenza))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_autonomia))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_collaborazione))}</td>
                      <td>${escapeHtml(formatScore(v.punteggio_responsabilita))}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          : `
            <div class="small-muted">Nessuna valutazione salvata.</div>
          `
      })}

    </div>
  `;

  container.innerHTML = createPageLayout({
    title: nomeCompleto,
    subtitle: "Scheda dipendente",
    content
  });

  const btnBack = document.getElementById("btn-back-dipendenti");
  if (btnBack) {
    btnBack.onclick = () => {
      window.location.hash = "#/dipendenti";
    };
  }

  const btnEdit = document.getElementById("btn-edit-dipendente");
  if (btnEdit) {
    btnEdit.onclick = () => {
      if (typeof window._dipEdit === "function") {
        window.location.hash = "#/dipendenti";
        setTimeout(() => {
          window._dipEdit(dipendenteId);
        }, 50);
      } else {
        window.location.hash = "#/dipendenti";
      }
    };
  }
}

function normalizeProfiloAI(profiloAI) {
  if (!profiloAI) return {};
  if (typeof profiloAI === "object") return profiloAI;

  try {
    return JSON.parse(profiloAI);
  } catch (_) {
    return {};
  }
}

function buildNomeCompleto(dip) {
  const nome = String(dip?.nome || "").trim();
  const cognome = String(dip?.cognome || "").trim();
  const full = `${nome} ${cognome}`.trim();
  return full || "Dipendente";
}

function infoRow(label, value) {
  return `
    <div style="padding:12px; border:1px solid #e5e7eb; border-radius:14px; background:#fff;">
      <div class="small-muted" style="margin-bottom:6px;">${escapeHtml(label)}</div>
      <div style="font-weight:600;">${escapeHtml(String(value ?? "-"))}</div>
    </div>
  `;
}

function longTextRow(label, value) {
  return `
    <div style="padding:12px; border:1px solid #e5e7eb; border-radius:14px; background:#fff;">
      <div class="small-muted" style="margin-bottom:6px;">${escapeHtml(label)}</div>
      <div style="white-space:pre-wrap; line-height:1.45;">${escapeHtml(String(value ?? "-"))}</div>
    </div>
  `;
}

function scoreRow(label, value) {
  return `
    <div style="padding:12px; border:1px solid #e5e7eb; border-radius:14px; background:#fff;">
      <div class="small-muted" style="margin-bottom:6px;">${escapeHtml(label)}</div>
      <div style="font-size:20px; font-weight:700;">${escapeHtml(formatScore(value))}</div>
    </div>
  `;
}

function formatPeriodo(da, a) {
  if (!da && !a) return "-";
  if (da && a) return `${formatDate(da)} → ${formatDate(a)}`;
  if (da) return `Dal ${formatDate(da)}`;
  return `Fino al ${formatDate(a)}`;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("it-IT");
}

function formatCurrencyOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(n);
}

function formatNumberOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(n);
}

function formatScore(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toFixed(2);
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttr(str) {
  return escapeHtml(str);
}
