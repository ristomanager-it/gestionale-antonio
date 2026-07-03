// js/views/bo/bo-location-ricevimenti.js
// Anagrafica location per ricevimenti (interne ed esterne) + calendario disponibilità
// + generazione accesso PIN autonomo per il referente della location (stile hotel-operatore)

import { createPageLayout } from "../../utils/pageLayout.js";

const supa = () => window.supabaseClient || window.supabase;

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtData(d) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function generaToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generaPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const STATI = {
  opzione:   { label: "Opzione",   colore: "#f59e0b", bg: "#fef3c7" },
  confermata:{ label: "Confermata",colore: "#16a34a", bg: "#dcfce7" },
  bloccata:  { label: "Bloccata",  colore: "#64748b", bg: "#f1f5f9" },
  annullata: { label: "Annullata", colore: "#dc2626", bg: "#fee2e2" },
};

export async function render(container) {
  const azienda = window.state?.azienda;
  if (!azienda?.id) {
    container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>';
    return;
  }

  let locations = [];
  let sedi = [];
  let locationAperta = null; // id location di cui si vede il calendario
  let prenotazioniCorrente = [];
  let accessoCorrente = null;

  async function caricaLocations() {
    const { data } = await supa()
      .from("location_ricevimenti")
      .select("*")
      .eq("azienda_id", azienda.id)
      .order("nome");
    locations = data || [];
  }

  async function caricaSedi() {
    const { data } = await supa()
      .from("sedi")
      .select("id, nome")
      .eq("azienda_id", azienda.id)
      .order("nome");
    sedi = data || [];
  }

  async function caricaPrenotazioni(locationId) {
    const { data } = await supa()
      .from("location_prenotazioni")
      .select("*")
      .eq("location_id", locationId)
      .order("data_evento");
    prenotazioniCorrente = data || [];
  }

  async function caricaAccesso(locationId) {
    const { data } = await supa()
      .from("location_accessi")
      .select("*")
      .eq("location_id", locationId)
      .maybeSingle();
    accessoCorrente = data || null;
  }

  await caricaLocations();
  await caricaSedi();

  container.innerHTML = createPageLayout({
    title: "Location Ricevimenti",
    subtitle: "Anagrafica location, disponibilità e accesso autonomo per i referenti",
    content: `
      <style>
        .lr-card { background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px; }
        .lr-btn { border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600; }
        .lr-form input, .lr-form textarea, .lr-form select { width:100%;padding:9px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:8px;box-sizing:border-box; }
        .lr-grid2 { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
        @media(max-width:600px){ .lr-grid2{ grid-template-columns:1fr; } }
        .lr-badge { display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700; }
        .lr-row { display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap; }
      </style>

      <div class="lr-card">
        <h3 style="margin-top:0;">➕ Nuova location</h3>
        <div class="lr-form">
          <input id="loc-nome" placeholder="Nome location *">
          <div class="lr-grid2">
            <select id="loc-tipo">
              <option value="esterna">Esterna (partner terzo)</option>
              <option value="interna">Interna (mia sede)</option>
            </select>
            <select id="loc-sede" style="display:none;">
              <option value="">Collega a sede...</option>
              ${sedi.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join("")}
            </select>
          </div>
          <input id="loc-indirizzo" placeholder="Indirizzo">
          <div class="lr-grid2">
            <input id="loc-capienza-min" type="number" min="0" placeholder="Capienza minima">
            <input id="loc-capienza-max" type="number" min="0" placeholder="Capienza massima">
          </div>
          <textarea id="loc-descrizione" rows="2" placeholder="Descrizione / punti di forza"></textarea>
          <input id="loc-servizi" placeholder="Servizi inclusi (es. parcheggio, cucina attrezzata...)">
          <input id="loc-prezzo" type="number" step="0.01" min="0" placeholder="Prezzo affitto base (€)">
          <div class="lr-grid2">
            <input id="loc-ref-nome" placeholder="Referente (nome)">
            <input id="loc-ref-telefono" placeholder="Referente (telefono)">
          </div>
          <input id="loc-ref-email" type="email" placeholder="Referente (email)">
        </div>
        <button id="btn-loc-add" class="lr-btn" style="background:#0E5A7A;color:white;">Aggiungi location</button>
        <span id="loc-msg" style="margin-left:10px;font-size:13px;"></span>
      </div>

      <div id="lr-lista"></div>

      <!-- MODAL calendario/prenotazioni location -->
      <div id="modal-loc-calendario" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;align-items:center;justify-content:center;padding:16px;">
        <div style="background:white;border-radius:16px;padding:20px;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 id="modal-loc-titolo" style="margin:0;"></h3>
            <button id="btn-modal-loc-x" class="lr-btn" style="background:#f1f5f9;">✕</button>
          </div>

          <div id="blocco-accesso" style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:14px;"></div>

          <h4 style="margin:14px 0 8px;">➕ Nuova prenotazione/opzione</h4>
          <div class="lr-form">
            <div class="lr-grid2">
              <input id="pren-data" type="date">
              <select id="pren-stato">
                ${Object.entries(STATI).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}
              </select>
            </div>
            <div class="lr-grid2">
              <input id="pren-orario-inizio" type="time" placeholder="Inizio">
              <input id="pren-orario-fine" type="time" placeholder="Fine">
            </div>
            <input id="pren-cliente" placeholder="Nome cliente/sposi">
            <div class="lr-grid2">
              <input id="pren-telefono" placeholder="Telefono cliente">
              <input id="pren-invitati" type="number" min="0" placeholder="N. invitati">
            </div>
            <input id="pren-tipo-evento" placeholder="Tipo evento (matrimonio, battesimo...)">
            <textarea id="pren-note" rows="2" placeholder="Note"></textarea>
          </div>
          <button id="btn-pren-add" class="lr-btn" style="background:#7c3aed;color:white;width:100%;">Salva prenotazione</button>

          <h4 style="margin:18px 0 8px;">📅 Calendario</h4>
          <div id="lista-prenotazioni"></div>
        </div>
      </div>
    `
  });

  // Toggle campo sede visibile solo se tipo=interna
  container.querySelector("#loc-tipo").addEventListener("change", (e) => {
    container.querySelector("#loc-sede").style.display = e.target.value === "interna" ? "block" : "none";
  });

  function renderLista() {
    const box = container.querySelector("#lr-lista");
    if (!locations.length) {
      box.innerHTML = '<div class="lr-card" style="text-align:center;color:#64748b;">Nessuna location registrata ancora.</div>';
      return;
    }
    box.innerHTML = locations.map(l => `
      <div class="lr-card">
        <div class="lr-row">
          <div>
            <div style="font-weight:700;font-size:15px;">
              ${esc(l.nome)}
              <span class="lr-badge" style="background:${l.tipo === 'interna' ? '#dbeafe' : '#f3e8ff'};color:${l.tipo === 'interna' ? '#1d4ed8' : '#7c3aed'};">
                ${l.tipo === 'interna' ? '🏠 Interna' : '🤝 Esterna'}
              </span>
              ${l.attiva === false ? '<span class="lr-badge" style="background:#fee2e2;color:#dc2626;">DISATTIVA</span>' : ''}
            </div>
            <div style="font-size:13px;color:#64748b;margin-top:4px;">
              ${l.indirizzo ? `📍 ${esc(l.indirizzo)} · ` : ''}${l.capienza_min || l.capienza_max ? `👥 ${l.capienza_min || '?'}-${l.capienza_max || '?'} persone` : ''}
            </div>
            ${l.referente_nome ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Referente: ${esc(l.referente_nome)}${l.referente_telefono ? ' · ' + esc(l.referente_telefono) : ''}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button data-calendario="${l.id}" class="lr-btn" style="background:#0E5A7A;color:white;">📅 Calendario</button>
            <button data-elimina="${l.id}" class="lr-btn" style="background:#fee2e2;color:#dc2626;">🗑</button>
          </div>
        </div>
      </div>
    `).join("");

    box.querySelectorAll("[data-calendario]").forEach(btn => {
      btn.onclick = () => apriCalendario(btn.dataset.calendario);
    });
    box.querySelectorAll("[data-elimina]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Eliminare questa location? Verranno eliminate anche tutte le prenotazioni collegate.")) return;
        await supa().from("location_ricevimenti").delete().eq("id", btn.dataset.elimina);
        await caricaLocations();
        renderLista();
      };
    });
  }

  renderLista();

  container.querySelector("#btn-loc-add").onclick = async () => {
    const nome = container.querySelector("#loc-nome").value.trim();
    const msg = container.querySelector("#loc-msg");
    if (!nome) { msg.style.color = "#dc2626"; msg.textContent = "Inserisci il nome della location"; return; }

    const tipo = container.querySelector("#loc-tipo").value;
    const { error } = await supa().from("location_ricevimenti").insert({
      azienda_id: azienda.id,
      nome,
      tipo,
      sede_id: tipo === "interna" ? (container.querySelector("#loc-sede").value || null) : null,
      indirizzo: container.querySelector("#loc-indirizzo").value.trim() || null,
      capienza_min: parseInt(container.querySelector("#loc-capienza-min").value) || null,
      capienza_max: parseInt(container.querySelector("#loc-capienza-max").value) || null,
      descrizione: container.querySelector("#loc-descrizione").value.trim() || null,
      servizi_inclusi: container.querySelector("#loc-servizi").value.trim() || null,
      prezzo_affitto_base: parseFloat(container.querySelector("#loc-prezzo").value) || null,
      referente_nome: container.querySelector("#loc-ref-nome").value.trim() || null,
      referente_telefono: container.querySelector("#loc-ref-telefono").value.trim() || null,
      referente_email: container.querySelector("#loc-ref-email").value.trim() || null,
      attiva: true,
    });

    if (error) { msg.style.color = "#dc2626"; msg.textContent = "Errore: " + error.message; return; }

    msg.style.color = "#16a34a";
    msg.textContent = "✅ Location aggiunta";
    ["#loc-nome","#loc-indirizzo","#loc-capienza-min","#loc-capienza-max","#loc-descrizione","#loc-servizi","#loc-prezzo","#loc-ref-nome","#loc-ref-telefono","#loc-ref-email"]
      .forEach(sel => container.querySelector(sel).value = "");
    await caricaLocations();
    renderLista();
  };

  async function apriCalendario(locationId) {
    locationAperta = locationId;
    const loc = locations.find(l => l.id === locationId);
    container.querySelector("#modal-loc-titolo").textContent = "📅 " + loc.nome;
    container.querySelector("#modal-loc-calendario").style.display = "flex";
    await caricaPrenotazioni(locationId);
    await caricaAccesso(locationId);
    renderBloccoAccesso();
    renderPrenotazioni();
  }

  container.querySelector("#btn-modal-loc-x").onclick = () => {
    container.querySelector("#modal-loc-calendario").style.display = "none";
    locationAperta = null;
  };

  function renderBloccoAccesso() {
    const box = container.querySelector("#blocco-accesso");
    if (accessoCorrente) {
      const link = `${window.location.origin}/location-operatore.html?token=${accessoCorrente.token_accesso}`;
      box.innerHTML = `
        <div style="font-size:13px;font-weight:700;margin-bottom:6px;">🔑 Accesso autonomo attivo</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:8px;">PIN: <b style="font-size:15px;letter-spacing:2px;">${accessoCorrente.pin}</b></div>
        <div style="font-size:11px;word-break:break-all;background:white;border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;margin-bottom:8px;">${link}</div>
        <button id="btn-copia-link" class="lr-btn" style="background:#0E5A7A;color:white;">📋 Copia link</button>
        <button id="btn-rigenera-accesso" class="lr-btn" style="background:#f1f5f9;">🔄 Rigenera PIN</button>
      `;
      box.querySelector("#btn-copia-link").onclick = () => {
        navigator.clipboard.writeText(link);
        box.querySelector("#btn-copia-link").textContent = "✅ Copiato";
      };
      box.querySelector("#btn-rigenera-accesso").onclick = async () => {
        const nuovoPin = generaPin();
        await supa().from("location_accessi").update({ pin: nuovoPin }).eq("id", accessoCorrente.id);
        await caricaAccesso(locationAperta);
        renderBloccoAccesso();
      };
    } else {
      box.innerHTML = `
        <div style="font-size:13px;color:#64748b;margin-bottom:8px;">Nessun accesso autonomo creato per il referente di questa location.</div>
        <button id="btn-crea-accesso" class="lr-btn" style="background:#7c3aed;color:white;">🔑 Crea accesso PIN per il referente</button>
      `;
      box.querySelector("#btn-crea-accesso").onclick = async () => {
        const loc = locations.find(l => l.id === locationAperta);
        await supa().from("location_accessi").insert({
          location_id: locationAperta,
          token_accesso: generaToken(),
          pin: generaPin(),
          referente_nome: loc?.referente_nome || null,
          attivo: true,
        });
        await caricaAccesso(locationAperta);
        renderBloccoAccesso();
      };
    }
  }

  function renderPrenotazioni() {
    const box = container.querySelector("#lista-prenotazioni");
    if (!prenotazioniCorrente.length) {
      box.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:16px;font-size:13px;">Nessuna data registrata.</div>';
      return;
    }
    box.innerHTML = prenotazioniCorrente.map(p => {
      const s = STATI[p.stato] || STATI.opzione;
      return `
        <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:8px;">
          <div class="lr-row">
            <div>
              <div style="font-weight:700;font-size:14px;">${fmtData(p.data_evento)} ${p.orario_inizio ? '· ' + p.orario_inizio.slice(0,5) : ''}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">${esc(p.cliente_nome || 'Senza nome')}${p.tipo_evento ? ' · ' + esc(p.tipo_evento) : ''}${p.num_invitati ? ' · ' + p.num_invitati + ' inv.' : ''}</div>
            </div>
            <span class="lr-badge" style="background:${s.bg};color:${s.colore};">${s.label}</span>
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
            ${Object.entries(STATI).map(([k, v]) => `
              <button data-cambia-stato="${p.id}" data-nuovo-stato="${k}" class="lr-btn" style="background:${p.stato === k ? v.colore : '#f1f5f9'};color:${p.stato === k ? 'white' : '#374151'};padding:5px 10px;font-size:11px;">${v.label}</button>
            `).join("")}
            <button data-elimina-pren="${p.id}" class="lr-btn" style="background:#fee2e2;color:#dc2626;padding:5px 10px;font-size:11px;">🗑</button>
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll("[data-cambia-stato]").forEach(btn => {
      btn.onclick = async () => {
        await supa().from("location_prenotazioni").update({ stato: btn.dataset.nuovoStato }).eq("id", btn.dataset.cambiaStato);
        await caricaPrenotazioni(locationAperta);
        renderPrenotazioni();
      };
    });
    box.querySelectorAll("[data-elimina-pren]").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Eliminare questa data?")) return;
        await supa().from("location_prenotazioni").delete().eq("id", btn.dataset.eliminaPren);
        await caricaPrenotazioni(locationAperta);
        renderPrenotazioni();
      };
    });
  }

  container.querySelector("#btn-pren-add").onclick = async () => {
    const data_evento = container.querySelector("#pren-data").value;
    if (!data_evento) { alert("Seleziona una data"); return; }

    await supa().from("location_prenotazioni").insert({
      location_id: locationAperta,
      azienda_id: azienda.id,
      data_evento,
      stato: container.querySelector("#pren-stato").value,
      orario_inizio: container.querySelector("#pren-orario-inizio").value || null,
      orario_fine: container.querySelector("#pren-orario-fine").value || null,
      cliente_nome: container.querySelector("#pren-cliente").value.trim() || null,
      cliente_telefono: container.querySelector("#pren-telefono").value.trim() || null,
      num_invitati: parseInt(container.querySelector("#pren-invitati").value) || null,
      tipo_evento: container.querySelector("#pren-tipo-evento").value.trim() || null,
      note: container.querySelector("#pren-note").value.trim() || null,
      creato_da: "catering",
    });

    ["#pren-data","#pren-orario-inizio","#pren-orario-fine","#pren-cliente","#pren-telefono","#pren-invitati","#pren-tipo-evento","#pren-note"]
      .forEach(sel => container.querySelector(sel).value = "");

    await caricaPrenotazioni(locationAperta);
    renderPrenotazioni();
  };
}
