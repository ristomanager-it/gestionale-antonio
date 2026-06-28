import { supabase } from "../supabaseClient.js";

export async function render(container) {

  const user = window.state.user;
  const azienda = window.state.azienda;
  const ruolo = window.state?.viewAs || window.state?.ruolo;

  if (!user) {
    container.innerHTML = `<div class="view">Errore caricamento</div>`;
    return;
  }

  // MRR e abbonamenti
  const { data: abbonamenti } = await supabase
    .from("abbonamenti")
    .select("stato, intervallo, importo_pagato, piano_id, piani_abbonamento(nome,icona,colore)")
    .eq("stato", "attivo");

  const mrr = (abbonamenti||[]).reduce((s, a) => {
    const imp = Number(a.importo_pagato || 0);
    return s + (a.intervallo === 'annuale' ? imp/12 : a.intervallo === 'lifetime' ? 0 : imp);
  }, 0);
  const arr = mrr * 12;

  // Clienti per piano
  const perPiano = {};
  (abbonamenti||[]).forEach(a => {
    const nome = a.piani_abbonamento?.nome || 'Senza piano';
    const icona = a.piani_abbonamento?.icona || '📋';
    if (!perPiano[nome]) perPiano[nome] = { count:0, icona };
    perPiano[nome].count++;
  });

  const { count: totaleAziende } = await supabase
    .from("aziende").select("id", { count: "exact", head: true }).neq("stato","piattaforma");
  const { count: aziendeTrial } = await supabase
    .from("aziende").select("id", { count: "exact", head: true }).eq("piano", "trial");
  let leadDemo = 0;
  try {
    const { count } = await supabase
      .from("demo_leads").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
    leadDemo = count || 0;
  } catch {}

  // Utenti RistoflowBook — tutte le fonti
  const [
    { count: utentiSocial },
    { count: utentiSocial7gg },
    { count: postSocial },
    { count: utentiDipendenti },
    { count: utentiFidelity },
    { data: utentiList }
  ] = await Promise.all([
    supabase.from("clienti_profilo").select("id", { count: "exact", head: true }),
    supabase.from("clienti_profilo").select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from("social_post").select("id", { count: "exact", head: true }).eq("visibile", true),
    supabase.from("dipendenti").select("id", { count: "exact", head: true }),
    supabase.from("clienti_profilo").select("id", { count: "exact", head: true }).eq("tipo_utente", "fidelity"),
    supabase.from("clienti_profilo")
      .select("nome_completo,email,citta,tipo_utente,punti_totali,punti_social,created_at,avatar_url")
      .order("created_at", { ascending: false })
      .limit(200)
  ]);

  container.innerHTML = `
    <div class="view piattaforma">

      <!-- HEADER -->
      <div class="header">
        <div>
          <h2>Ristoflow – Piattaforma</h2>
          <p class="sub">Gestione SaaS e aziende</p>
        </div>
        <div class="header-actions">
          <button id="btn-logout" class="logout">Esci</button>
        </div>
      </div>

      <!-- VIEW SWITCH -->
      <div class="view-switch">
        ${renderRoleButton("admin", ruolo)}
        ${renderRoleButton("manager", ruolo)}
        ${renderRoleButton("operatore", ruolo)}
      </div>

      <!-- AZIENDA ATTIVA -->
      <div class="azienda-attiva">
        <div>
          <div class="label">Azienda attiva</div>
          <div class="title">${azienda?.nome || "Nessuna"}</div>
        </div>
        <button id="btn-switch-azienda" class="switch-btn">Cambia</button>
      </div>

      <!-- KPI MRR -->
      <div class="kpi-section-label">💶 Revenue</div>
      <div class="kpi-bar" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
        <div class="kpi">
          <div class="kpi-val" style="color:#059669;">€${Math.round(mrr).toLocaleString('it-IT')}</div>
          <div class="kpi-label">MRR</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#0E5A7A;">€${Math.round(arr).toLocaleString('it-IT')}</div>
          <div class="kpi-label">ARR</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#7c3aed;">${(abbonamenti||[]).length}</div>
          <div class="kpi-label">Abbonati attivi</div>
        </div>
        ${Object.entries(perPiano).map(([nome,v])=>`
          <div class="kpi">
            <div class="kpi-val" style="font-size:18px;">${v.count}</div>
            <div class="kpi-label">${v.icona} ${nome}</div>
          </div>
        `).join('')}
      </div>

      <!-- KPI BAR GESTIONALE -->
      <div class="kpi-section-label">&#127979; Gestionale</div>
      <div class="kpi-bar">
        <div class="kpi">
          <div class="kpi-val">${totaleAziende || 0}</div>
          <div class="kpi-label">Clienti totali</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#d97706;">${aziendeTrial || 0}</div>
          <div class="kpi-label">In trial</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#059669;">${(totaleAziende || 0) - (aziendeTrial || 0)}</div>
          <div class="kpi-label">Paganti</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#0E5A7A;">${leadDemo || 0}</div>
          <div class="kpi-label">Lead 7gg</div>
        </div>
      </div>

      <!-- KPI BAR SOCIAL -->
      <div class="kpi-section-label">&#127759; RistoflowBook — Contatti</div>
      <div class="kpi-bar" style="grid-template-columns:repeat(4,1fr)">
        <div class="kpi" style="cursor:pointer" onclick="filtraContatti('tutti')">
          <div class="kpi-val" style="color:#0E5A7A;">${utentiSocial || 0}</div>
          <div class="kpi-label">Iscritti social</div>
        </div>
        <div class="kpi" style="cursor:pointer" onclick="filtraContatti('nuovi')">
          <div class="kpi-val" style="color:#059669;">+${utentiSocial7gg || 0}</div>
          <div class="kpi-label">Nuovi 7gg</div>
        </div>
        <div class="kpi" style="cursor:pointer" onclick="filtraContatti('fidelity')">
          <div class="kpi-val" style="color:#d97706;">${utentiFidelity || 0}</div>
          <div class="kpi-label">Fidelity</div>
        </div>
        <div class="kpi">
          <div class="kpi-val" style="color:#7c3aed;">${postSocial || 0}</div>
          <div class="kpi-label">Post</div>
        </div>
      </div>

      <!-- CONTATTI INLINE -->
      <div class="contatti-section">
        <div class="contatti-header">
          <div style="font-size:15px;font-weight:800;color:#111827">Contatti RistoflowBook</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input id="contatti-search" placeholder="&#128269; Cerca..." class="contatti-search" oninput="filtraContatti()"/>
            <select id="contatti-filtro-tipo" class="contatti-select" onchange="filtraContatti()">
              <option value="">Tutti</option>
              <option value="cliente">Clienti</option>
              <option value="chef">Chef</option>
              <option value="titolare">Titolari</option>
              <option value="fidelity">Fidelity</option>
              <option value="fornitore">Fornitori</option>
            </select>
            <button class="contatti-export-btn" onclick="esportaContatti()">&#11015; CSV</button>
          </div>
        </div>
        <div id="contatti-list"></div>
        <div id="contatti-more" style="text-align:center;padding:12px;display:none">
          <button class="contatti-more-btn" onclick="mostraAltri()">Carica altri</button>
        </div>
      </div>

      <!-- LEAD WHATSAPP -->
      <div class="kpi-section-label">📱 Lead WhatsApp Chatbot</div>
      <div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="font-size:13px;color:#64748b;">Lead raccolti dal chatbot commerciale</div>
          <div style="display:flex;gap:8px;">
            <select id="lead-filtro-tipo" class="contatti-select" onchange="caricaLeadWA()">
              <option value="">Tutti</option>
              <option value="prova_gratuita">Prova gratuita</option>
              <option value="demo">Demo</option>
              <option value="consulente">Consulente</option>
            </select>
            <button onclick="esportaLeadWA()" class="contatti-export-btn">⬇️ CSV</button>
          </div>
        </div>
        <div id="lead-wa-list"><div style="font-size:13px;color:#94a3b8;text-align:center;padding:20px;">Caricamento...</div></div>
      </div>

      <!-- CONVERSAZIONI WHATSAPP -->
      <div class="kpi-section-label">💬 Conversazioni WhatsApp</div>
      <div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="font-size:13px;color:#64748b;">Messaggi in entrata al numero Ristoflow</div>
          <input id="conv-search" placeholder="🔍 Cerca numero..." class="contatti-search" style="max-width:180px;" oninput="filtraConversazioni()"/>
        </div>
        <div id="conv-wa-list"><div style="font-size:13px;color:#94a3b8;text-align:center;padding:20px;">Caricamento...</div></div>
      </div>

      <!-- MOTORI DI RISTORAZIONE -->
      <div class="kpi-section-label">⚙️ Motori di Ristorazione</div>
      <div style="background:white;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;" id="motori-kpi">
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:10px;">
            <div style="font-size:22px;font-weight:800;color:#0E5A7A;" id="m-pren-oggi">—</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">🍽️ Prenotazioni oggi</div>
          </div>
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:10px;">
            <div style="font-size:22px;font-weight:800;color:#0E5A7A;" id="m-pren-mese">—</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">📅 Prenotazioni mese</div>
          </div>
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:10px;">
            <div style="font-size:22px;font-weight:800;color:#0E5A7A;" id="m-coperti-mese">—</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">👥 Coperti mese</div>
          </div>
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:10px;">
            <div style="font-size:22px;font-weight:800;color:#1B4F72;" id="m-hotel-oggi">—</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">🏨 Arrivi hotel oggi</div>
          </div>
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:10px;">
            <div style="font-size:22px;font-weight:800;color:#1B4F72;" id="m-hotel-mese">—</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">🏨 Notti hotel mese</div>
          </div>
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:10px;">
            <div style="font-size:22px;font-weight:800;color:#7C3AED;" id="m-tasting-mese">—</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">🎫 Biglietti Tasting mese</div>
          </div>
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:10px;">
            <div style="font-size:22px;font-weight:800;color:#16a34a;" id="m-incasso-tasting">—</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">💰 Incasso Tasting mese</div>
          </div>
          <div style="text-align:center;padding:12px;background:#f8fafc;border-radius:10px;">
            <div style="font-size:22px;font-weight:800;color:#d97706;" id="m-analytics-visite">—</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">👁️ Visite form 7gg</div>
          </div>
        </div>

        <!-- Breakdown per azienda -->
        <div style="margin-top:16px;border-top:1px solid #f1f5f9;padding-top:14px;">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Attività per azienda (ultimi 30gg)</div>
          <div id="motori-breakdown" style="font-size:13px;color:#94a3b8;">Caricamento...</div>
        </div>
      </div>

      <!-- GRID -->
      <div class="grid">

        <div class="card" data-route="creaAzienda">
          <div>
            <div class="label">Provisioning</div>
            <div class="title">Crea Azienda</div>
          </div>
          <div class="icon">➕</div>
        </div>

        <div class="card" data-route="gestioneAziende">
          <div>
            <div class="label">Clienti</div>
            <div class="title">Gestione Aziende</div>
          </div>
          <div class="icon">🏢</div>
        </div>

        <div class="card" data-route="demo-leads">
          <div>
            <div class="label">Acquisizione</div>
            <div class="title">Lead Demo</div>
          </div>
          <div class="icon">🎯</div>
        </div>

        <div class="card" id="card-supporto">
          <div>
            <div class="label">Supporto clienti</div>
            <div class="title">Chat Live</div>
            <div id="tawk-status" style="font-size:11px;color:#6b7280;margin-top:4px;">Caricamento...</div>
          </div>
          <div class="icon">💬</div>
        </div>

        <div class="card" id="card-social-users" onclick="window.location.hash='#/social-utenti'">
          <div>
            <div class="label">RistoflowBook</div>
            <div class="title">Utenti Social</div>
            <div style="font-size:11px;color:#7c3aed;margin-top:4px;font-weight:700;">${utentiSocial || 0} iscritti</div>
          </div>
          <div class="icon">&#127759;</div>
        </div>

        <div class="card dark" id="enter-operativo">
          <div>
            <div class="label">Operatività</div>
            <div class="title">Entra nel gestionale</div>
          </div>
          <div class="icon">🧪</div>
        </div>

        <div class="card" id="card-prezzi" onclick="togglePrezzi()">
          <div>
            <div class="label">Sales Tool</div>
            <div class="title">Piani & Prezzi</div>
            <div style="font-size:11px;color:#7c3aed;margin-top:4px;font-weight:700;">Solo superadmin</div>
          </div>
          <div class="icon">💰</div>
        </div>

        <div class="card" onclick="window.location.hash='#/bo-onboarding'">
          <div>
            <div class="label">Onboarding</div>
            <div class="title">Setup guidato</div>
            <div style="font-size:11px;color:#059669;margin-top:4px;font-weight:700;">6 livelli · ~3h30</div>
          </div>
          <div class="icon">🚀</div>
        </div>

        <div class="card" onclick="toggleCRM()">
          <div>
            <div class="label">Vendita</div>
            <div class="title">CRM Lead</div>
            <div style="font-size:11px;color:#DC2626;margin-top:4px;font-weight:700;" id="crm-card-count">Caricamento...</div>
          </div>
          <div class="icon">🎯</div>
        </div>

      </div>

      <!-- PREZZI (hidden by default) -->
      <div id="prezzi-section" style="display:none;margin-top:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div>
            <div class="kpi-section-label" style="margin:0;">💰 Piani & Prezzi — Sales Tool</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Riservato superadmin · non pubblico</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <div style="background:#f1f5f9;border-radius:30px;display:flex;padding:3px;gap:2px;" id="billing-toggle">
              <button data-mode="mensile" class="toggle-btn active" style="padding:5px 14px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:700;background:#0E5A7A;color:#fff;">Mensile</button>
              <button data-mode="3rate" class="toggle-btn" style="padding:5px 14px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:700;background:transparent;color:#64748b;">3 Rate −10%</button>
              <button data-mode="annuale" class="toggle-btn" style="padding:5px 14px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:700;background:transparent;color:#64748b;">Annuale −20%</button>
            </div>
            <button onclick="togglePrezzi()" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;color:#64748b;">✕ Chiudi</button>
          </div>
        </div>
        <div id="prezzi-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:24px;"></div>
        <div id="prezzi-confronto" style="background:white;border-radius:14px;border:1px solid #e5e7eb;padding:20px;margin-bottom:16px;">
          <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:14px;">📊 Confronto modalità di pagamento</div>
          <div id="confronto-table"></div>
        </div>
        <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;padding:14px;font-size:13px;color:#92400e;margin-bottom:16px;">
          💡 <strong>Note commerciali:</strong>
          Annuale unica = sconto 20% applicato sul prezzo annuo di listino ·
          3 rate = 10% sconto, prima rata subito poi 2° e 3° mese ·
          Mensile = prezzo pieno, disdetta in qualsiasi momento
        </div>
      </div>

      <!-- CRM LEAD (hidden by default) -->
      <div id="crm-section" style="display:none;margin-top:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div class="kpi-section-label" style="margin:0;">🎯 CRM Lead — Pipeline Vendita</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Traccia visite, temperature, follow-up</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="apriModaleLead()" style="background:#DC2626;color:white;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;">+ Nuova visita</button>
            <button onclick="toggleCRM()" style="background:#f1f5f9;border:none;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;color:#64748b;">✕</button>
          </div>
        </div>

        <!-- KPI Pipeline -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;" id="crm-kpi"></div>

        <!-- Filtri -->
        <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:14px;margin-bottom:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          <select id="crm-filter-stato" onchange="renderCRM()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
            <option value="">Tutti gli stati</option>
            <option value="visitato">Visitato</option>
            <option value="demo_fatta">Demo fatta</option>
            <option value="trial_attivo">Trial attivo</option>
            <option value="pagante">Pagante ✅</option>
            <option value="perso">Perso ❌</option>
          </select>
          <select id="crm-filter-temp" onchange="renderCRM()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
            <option value="">Tutte le temperature</option>
            <option value="tiepido">🟡 Tiepido</option>
            <option value="freddo">🔵 Freddo</option>
            <option value="glaciale">❄️ Glaciale</option>
          </select>
          <select id="crm-filter-zona" onchange="renderCRM()" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
            <option value="">Tutte le zone</option>
            <option value="Orte">Orte</option>
            <option value="Viterbo">Viterbo</option>
            <option value="Terni">Terni</option>
            <option value="Altra">Altra</option>
          </select>
          <input id="crm-search" onkeyup="renderCRM()" placeholder="🔍 Cerca locale..." style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;flex:1;min-width:140px;">
        </div>

        <!-- Lista lead -->
        <div id="crm-lista"></div>

        <!-- Alert follow-up -->
        <div id="crm-followup" style="margin-top:12px;"></div>

        <!-- Modale nuovo/modifica lead -->
        <div id="crm-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:none;align-items:center;justify-content:center;padding:16px;">
          <div style="background:white;border-radius:16px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
              <div style="font-size:16px;font-weight:800;" id="crm-modal-title">Nuova visita</div>
              <button onclick="chiudiModaleLead()" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;">✕</button>
            </div>
            <div id="crm-modal-body"></div>
          </div>
        </div>
      </div>

      <!-- MODALE -->
      <div id="azienda-modal" class="modal hidden">
        <div class="modal-box">
          <div class="modal-header">
            <div>Seleziona Azienda</div>
            <button id="close-modal">✖</button>
          </div>
          <input id="search-azienda" placeholder="Cerca azienda..." class="search" />
          <div id="azienda-list" class="list"></div>
        </div>
      </div>

    </div>

    <style>
      .view-switch { display:flex; gap:8px; margin-bottom:16px; }
      .role-btn { flex:1; padding:10px; border-radius:10px; border:none; cursor:pointer; background:#e5e7eb; }
      .role-btn.active { background:#111827; color:white; }
      .piattaforma { padding:16px; }
      .header { display:flex; justify-content:space-between; margin-bottom:20px; }
      .sub { color:#6b7280; font-size:13px; }

      .kpi-bar {
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:12px;
        margin-bottom:20px;
      }
      .kpi {
        background:white;
        border-radius:12px;
        padding:14px;
        text-align:center;
        border:1px solid #e5e7eb;
      }
      .kpi-val { font-size:24px; font-weight:800; color:#111827; }
      .kpi-label { font-size:11px; color:#6b7280; margin-top:2px; }

      .azienda-attiva { display:flex; justify-content:space-between; background:white; padding:14px; border-radius:12px; margin-bottom:16px; }
      .switch-btn { background:#111827; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer; }
      .grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); }
      .card { background:white; padding:20px; border-radius:16px; display:flex; justify-content:space-between; cursor:pointer; border:1px solid #e5e7eb; transition:box-shadow 0.15s; }
      .card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); }
      .card.dark { background:#111827; color:white; border-color:#111827; }
      .card .label { font-size:11px; color:#6b7280; margin-bottom:4px; }
      .card.dark .label { color:#9ca3af; }
      .card .title { font-size:15px; font-weight:700; color:#111827; }
      .card.dark .title { color:white; }
      .card .icon { font-size:28px; }
      .modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
      .hidden { display:none; }
      .modal-box { background:white; width:400px; max-height:80vh; border-radius:14px; padding:16px; overflow:auto; }
      .modal-header { display:flex; justify-content:space-between; margin-bottom:10px; }
      .search { width:100%; padding:10px; border-radius:8px; border:1px solid #ddd; margin-bottom:10px; box-sizing:border-box; }
      .list-item { padding:10px; border-bottom:1px solid #eee; cursor:pointer; }
      .list-item:hover { background:#f3f4f6; }

      .kpi-section-label { font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;margin-top:4px; }
      .contatti-section { background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:20px; }
      .contatti-header { display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #f3f4f6;flex-wrap:wrap;gap:10px; }
      .contatti-search { padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;outline:none;width:180px; }
      .contatti-search:focus { border-color:#0E5A7A; }
      .contatti-select { padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-family:inherit;outline:none;cursor:pointer; }
      .contatti-export-btn { padding:8px 14px;background:#111827;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer; }
      .contatto-row { display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #f9fafb;transition:background .1s; }
      .contatto-row:hover { background:#f9fafb; }
      .contatto-av { width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#e8f4f8,#1a8fb5);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#0E5A7A;flex-shrink:0;overflow:hidden; }
      .contatto-av img { width:100%;height:100%;object-fit:cover; }
      .contatto-info { flex:1;min-width:0; }
      .contatto-nome { font-size:14px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .contatto-sub { font-size:12px;color:#6b7280;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
      .contatto-badge { font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;flex-shrink:0; }
      .contatto-badge.cliente { background:#e8f4f8;color:#0E5A7A; }
      .contatto-badge.chef { background:#fef3c7;color:#d97706; }
      .contatto-badge.titolare { background:#dcfce7;color:#16a34a; }
      .contatto-badge.fidelity { background:#f5f3ff;color:#7c3aed; }
      .contatto-badge.fornitore { background:#f3f4f6;color:#374151; }
      .contatto-punti { font-size:12px;font-weight:800;color:#0E5A7A;flex-shrink:0; }
      .contatto-data { font-size:11px;color:#9ca3af;flex-shrink:0; }
      .contatti-more-btn { padding:8px 20px;border:1.5px solid #e5e7eb;border-radius:8px;background:#fff;font-size:13px;font-weight:700;cursor:pointer;color:#374151; }
      .contatti-empty { text-align:center;padding:32px;color:#9ca3af;font-size:14px; }
      @media(max-width:600px) {
        .kpi-bar { grid-template-columns:repeat(2,1fr); }
        .contatti-search { width:120px; }
        .contatto-data,.contatto-punti { display:none; }
      }
    </style>
  `;

  bindEvents();
  initTawkStatus();
  window.initContatti(utentiList || []);
  window.caricaLeadWA();
  caricaConversazioniWA();
  caricaMotori();
}

// ── TAWK STATUS ───────────────────────────────────────────────────────────────
function initTawkStatus() {
  const el = document.getElementById("tawk-status");
  if (!el) return;

  // Polling ogni 3 secondi per leggere lo stato da Tawk_API
  let attempts = 0;
  const check = setInterval(() => {
    attempts++;
    const api = window.Tawk_API;
    if (api && typeof api.isChatOngoing === "function") {
      const ongoing = api.isChatOngoing();
      el.innerHTML = ongoing
        ? `<span style="color:#059669;">● Chat attiva in corso</span>`
        : `<span style="color:#6b7280;">● Nessuna chat attiva</span>`;
      clearInterval(check);
    } else if (attempts > 20) {
      el.innerHTML = `<span style="color:#9ca3af;">Widget non caricato</span>`;
      clearInterval(check);
    }
  }, 500);

  // Card click → apre dashboard Tawk
  document.getElementById("card-supporto").onclick = () => {
    window.open("https://dashboard.tawk.to", "_blank");
  };
}

// ── ROLE BUTTON ───────────────────────────────────────────────────────────────
function renderRoleButton(role, current) {
  return `<button class="role-btn ${current === role ? "active" : ""}" data-role="${role}">${role.toUpperCase()}</button>`;
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
function bindEvents() {

  document.querySelectorAll(".card[data-route]").forEach(card => {
    card.onclick = () => {
      if (window.router?.go) window.router.go(card.dataset.route);
      else window.location.hash = "#/" + card.dataset.route;
    };
  });

  document.getElementById("btn-logout").onclick = async () => {
    await supabase.auth.signOut();
    window.state = {};
    localStorage.removeItem("viewAs");
    window.location.hash = "#/login";
  };

  document.getElementById("enter-operativo").onclick = () => {
    if (window.router?.go) window.router.go("home");
    else window.location.hash = "#/home";
  };

  document.querySelectorAll(".role-btn").forEach(btn => {
    btn.onclick = () => {
      const role = btn.dataset.role;
      window.state.viewAs = role;
      localStorage.setItem("viewAs", role);
      window.state.previewMode = true;
      if (window.menuController?.refresh) window.menuController.refresh();
      if (window.router?.go) window.router.go("home");
      else window.location.hash = "#/home";
    };
  });

  document.getElementById("btn-switch-azienda").onclick = openModal;
  document.getElementById("close-modal").onclick = closeModal;
  document.getElementById("search-azienda").oninput = filterAziende;

  loadAziende();
}

// ── MODAL ────────────────────────────────────────────────────────────────────
function openModal() { document.getElementById("azienda-modal").classList.remove("hidden"); }
function closeModal() { document.getElementById("azienda-modal").classList.add("hidden"); }

// ── AZIENDE ──────────────────────────────────────────────────────────────────
let aziendeCache = [];

async function loadAziende() {
  const { data } = await supabase
    .from("utenti_aziende")
    .select("azienda_id, aziende(nome)")
    .eq("user_id", window.state.user.id);
  aziendeCache = data || [];
  renderLista(aziendeCache);
}

function renderLista(list) {
  const container = document.getElementById("azienda-list");
  container.innerHTML = list.map(a => `
    <div class="list-item" data-id="${a.azienda_id}">${a.aziende?.nome || "Senza nome"}</div>
  `).join("");
  container.querySelectorAll(".list-item").forEach(el => {
    el.onclick = () => selectAzienda(el.dataset.id);
  });
}

function filterAziende(e) {
  const q = e.target.value.toLowerCase();
  renderLista(aziendeCache.filter(a => (a.aziende?.nome || "").toLowerCase().includes(q)));
}

function selectAzienda(id) {
  const azienda = aziendeCache.find(a => a.azienda_id === id);
  if (!azienda) return;
  window.state.azienda = { id: azienda.azienda_id, nome: azienda.aziende?.nome };
  localStorage.setItem("azienda_attiva", JSON.stringify(window.state.azienda));
  window.location.reload();
}

// ── CONTATTI RISTOFLOWBOOK ────────────────────────────────────────────────────
let _contatti = [];
let _contattiShown = 30;

function getLivello(punti) {
  if (punti >= 10000) return "💎";
  if (punti >= 5000) return "🥇";
  if (punti >= 2000) return "🥈";
  return "🥉";
}

window.initContatti = function(lista) {
  _contatti = lista || [];
  filtraContatti();
};

window.filtraContatti = function(preset) {
  const search = (document.getElementById("contatti-search")?.value || "").toLowerCase().trim();
  const tipo = document.getElementById("contatti-filtro-tipo")?.value || "";

  let filtered = _contatti.filter(u => {
    if (tipo && (u.tipo_utente || "cliente") !== tipo) return false;
    if (preset === "fidelity" && (u.tipo_utente || "") !== "fidelity") return false;
    if (preset === "nuovi") {
      const cutoff = new Date(Date.now() - 7 * 86400000);
      if (new Date(u.created_at) < cutoff) return false;
    }
    if (search && !(
      (u.nome_completo || "").toLowerCase().includes(search) ||
      (u.email || "").toLowerCase().includes(search) ||
      (u.citta || "").toLowerCase().includes(search)
    )) return false;
    return true;
  });

  _contattiShown = 30;
  renderContatti(filtered);
};

function renderContatti(filtered) {
  const el = document.getElementById("contatti-list");
  const more = document.getElementById("contatti-more");
  if (!el) return;

  const slice = filtered.slice(0, _contattiShown);

  if (slice.length === 0) {
    el.innerHTML = `<div class="contatti-empty">Nessun contatto trovato</div>`;
    if (more) more.style.display = "none";
    return;
  }

  el.innerHTML = slice.map(u => {
    const nome = u.nome_completo || "—";
    const tipo = u.tipo_utente || "cliente";
    const punti = (u.punti_totali || 0) + (u.punti_social || 0);
    const lv = getLivello(punti);
    const av = u.avatar_url
      ? `<img src="${u.avatar_url}" />`
      : `<span>${nome.charAt(0).toUpperCase()}</span>`;
    const data = u.created_at
      ? new Date(u.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" })
      : "";
    const sub = [u.email, u.citta && u.citta.trim() ? u.citta : null].filter(Boolean).join(" · ");

    return `<div class="contatto-row">
      <div class="contatto-av">${av}</div>
      <div class="contatto-info">
        <div class="contatto-nome">${escHP(nome)}</div>
        <div class="contatto-sub">${escHP(sub)}</div>
      </div>
      <span class="contatto-badge ${tipo}">${tipo}</span>
      <div class="contatto-punti">${lv} ${punti > 0 ? punti.toLocaleString("it-IT") + " pt" : ""}</div>
      <div class="contatto-data">${data}</div>
    </div>`;
  }).join("");

  if (more) more.style.display = filtered.length > _contattiShown ? "block" : "none";
  // salva filtered per "mostra altri"
  el.dataset.filtered = JSON.stringify(filtered.map((u, i) => i));
  window._contattiFiltered = filtered;
}

window.mostraAltri = function() {
  _contattiShown += 30;
  if (window._contattiFiltered) renderContatti(window._contattiFiltered);
};

window.esportaContatti = function() {
  const lista = window._contattiFiltered || _contatti;
  const header = ["Nome", "Email", "Città", "Tipo", "Punti", "Iscritto"];
  const rows = lista.map(u => [
    u.nome_completo || "",
    u.email || "",
    (u.citta || "").trim(),
    u.tipo_utente || "cliente",
    (u.punti_totali || 0) + (u.punti_social || 0),
    u.created_at ? new Date(u.created_at).toLocaleDateString("it-IT") : ""
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `contatti-rfbook-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

// ── LEAD WHATSAPP ────────────────────────────────────────────
let _leadWA = [];

window.caricaLeadWA = async function() {
  const tipo = document.getElementById("lead-filtro-tipo")?.value || "";
  const el = document.getElementById("lead-wa-list");
  if (!el) return;

  let q = (window.supabaseClient || supabase)
    .from("ristoflow_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (tipo) q = q.eq("tipo", tipo);

  const { data, error } = await q;
  _leadWA = data || [];

  if (!_leadWA.length) {
    el.innerHTML = `<div style="font-size:13px;color:#94a3b8;text-align:center;padding:20px;">Nessun lead ancora</div>`;
    return;
  }

  const tipoColor = { prova_gratuita: "#059669", demo: "#0E5A7A", consulente: "#7c3aed" };
  const tipoLabel = { prova_gratuita: "🎁 Prova gratuita", demo: "📅 Demo", consulente: "👤 Consulente" };

  el.innerHTML = _leadWA.map(l => {
    const data = l.created_at ? new Date(l.created_at).toLocaleDateString("it-IT") : "—";
    const colore = tipoColor[l.tipo] || "#64748b";
    const label = tipoLabel[l.tipo] || l.tipo || "—";
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#111827;">${escHP(l.nome || "—")}</div>
          <div style="font-size:11px;color:#64748b;">${escHP(l.email || "—")} · ${escHP(l.telefono || "—")}</div>
          ${l.tipo_locale ? `<div style="font-size:11px;color:#94a3b8;">🏠 ${escHP(l.tipo_locale)}</div>` : ""}
          ${l.note ? `<div style="font-size:11px;color:#94a3b8;">📝 ${escHP(l.note)}</div>` : ""}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:11px;font-weight:700;color:${colore};">${label}</div>
          <div style="font-size:11px;color:#94a3b8;">${data}</div>
          <a href="https://wa.me/${(l.telefono||'').replace(/\D/g,'')}" target="_blank"
            style="font-size:11px;color:#25d366;text-decoration:none;">💬 Scrivi</a>
        </div>
      </div>`;
  }).join("");
};

window.esportaLeadWA = function() {
  const header = ["Nome","Email","Telefono","Tipo locale","Tipo","Note","Data"];
  const rows = _leadWA.map(l => [
    l.nome||"", l.email||"", l.telefono||"", l.tipo_locale||"", l.tipo||"", l.note||"",
    l.created_at ? new Date(l.created_at).toLocaleDateString("it-IT") : ""
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `lead-wa-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

// ── CONVERSAZIONI WHATSAPP ───────────────────────────────────
let _convWA = [];

async function caricaConversazioniWA() {
  const el = document.getElementById("conv-wa-list");
  if (!el) return;

  const RISTOFLOW_AZ = "a43d41b5-f4ac-494f-8144-6574347a754f";
  const { data } = await (window.supabaseClient || supabase)
    .from("whatsapp_messaggi")
    .select("from_numero, from_nome, testo, intent, created_at, risposta_inviata, risposta_testo")
    .eq("azienda_id", RISTOFLOW_AZ)
    .order("created_at", { ascending: false })
    .limit(200);

  // Raggruppa per numero
  const byNum = {};
  (data || []).forEach(function(m) {
    if (!byNum[m.from_numero]) {
      byNum[m.from_numero] = { nome: m.from_nome, numero: m.from_numero, messaggi: [], ultimo: m.created_at };
    }
    byNum[m.from_numero].messaggi.push(m);
  });

  _convWA = Object.values(byNum);

  if (!_convWA.length) {
    el.innerHTML = `<div style="font-size:13px;color:#94a3b8;text-align:center;padding:20px;">Nessuna conversazione</div>`;
    return;
  }

  renderConversazioni(_convWA);
}

function renderConversazioni(lista) {
  const el = document.getElementById("conv-wa-list");
  if (!el) return;
  el.innerHTML = lista.map(c => {
    const ultimo = c.messaggi[0];
    const data = c.ultimo ? new Date(c.ultimo).toLocaleDateString("it-IT") : "—";
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;"
        onclick="apriConversazione('${escHP(c.numero)}')">
        <div style="width:36px;height:36px;border-radius:50%;background:#f0f9ff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">💬</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:#111827;">${escHP(c.nome || c.numero)}</div>
          <div style="font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHP(ultimo?.testo || "—")}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-size:11px;color:#94a3b8;">${data}</div>
          <div style="font-size:11px;color:#64748b;">${c.messaggi.length} msg</div>
          <a href="https://wa.me/${c.numero.replace(/\D/g,'')}" target="_blank"
            style="font-size:11px;color:#25d366;text-decoration:none;" onclick="event.stopPropagation()">📤 Scrivi</a>
        </div>
      </div>`;
  }).join("");
}

window.filtraConversazioni = function() {
  const q = (document.getElementById("conv-search") )?.value.toLowerCase() || "";
  const filtrate = _convWA.filter(c =>
    (c.nome||"").toLowerCase().includes(q) || c.numero.includes(q)
  );
  renderConversazioni(filtrate);
};

window.apriConversazione = function(numero) {
  const conv = _convWA.find(c => c.numero === numero);
  if (!conv) return;
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;";
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:16px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-weight:700;">${escHP(conv.nome || conv.numero)}</div>
          <div style="font-size:12px;color:#64748b;">${conv.numero}</div>
        </div>
        <button onclick="this.closest('.conv-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;">
        ${conv.messaggi.slice().reverse().map(m => `
          <div style="background:#f8fafc;border-radius:8px;padding:10px;font-size:13px;">
            <div style="color:#0E5A7A;font-weight:600;margin-bottom:4px;">👤 ${escHP(m.testo || "—")}</div>
            ${m.risposta_testo ? `<div style="color:#059669;margin-top:6px;padding-top:6px;border-top:1px solid #e5e7eb;">🤖 ${escHP(m.risposta_testo)}</div>` : ""}
            <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${new Date(m.created_at).toLocaleString("it-IT")}</div>
          </div>`).join("")}
      </div>
      <div style="padding:12px;border-top:1px solid #e5e7eb;">
        <a href="https://wa.me/${conv.numero.replace(/\D/g,'')}" target="_blank"
          style="display:block;text-align:center;background:#25d366;color:white;padding:10px;border-radius:8px;text-decoration:none;font-weight:700;">
          💬 Apri su WhatsApp
        </a>
      </div>
    </div>`;
  modal.className = "conv-modal";
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
};

// ── MOTORI DI RISTORAZIONE ────────────────────────────────────────────────────
async function caricaMotori() {
  const oggi = new Date().toISOString().split("T")[0];
  const inizioMese = oggi.substring(0, 7) + "-01";
  const sett = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const fmtE = n => "€ " + Number(n||0).toLocaleString("it-IT", {minimumFractionDigits:0, maximumFractionDigits:0});
  const fmt  = n => Number(n||0).toLocaleString("it-IT");

  try {
    const [
      prenOggi, prenMese, hotelOggi, hotelMese,
      tastingMese, tastingIncasso, analytics,
      aziende
    ] = await Promise.all([
      // Prenotazioni ristorante oggi
      supabase.from("prenotazioni_tavoli").select("id,coperti", {count:"exact"})
        .eq("data", oggi).neq("stato","annullata"),
      // Prenotazioni ristorante mese
      supabase.from("prenotazioni_tavoli").select("id,coperti")
        .gte("data", inizioMese).neq("stato","annullata"),
      // Hotel arrivi oggi
      supabase.from("hotel_prenotazioni").select("id", {count:"exact"})
        .eq("data_checkin", oggi).neq("stato","annullata"),
      // Hotel notti mese
      supabase.from("hotel_prenotazioni").select("notti")
        .gte("data_checkin", inizioMese).neq("stato","annullata"),
      // Tasting biglietti mese
      supabase.from("ticket_ordini").select("id,quantita", {count:"exact"})
        .gte("created_at", inizioMese+"T00:00:00").eq("stato","pagato"),
      // Tasting incasso mese
      supabase.from("ticket_ordini").select("totale")
        .gte("created_at", inizioMese+"T00:00:00").eq("stato","pagato"),
      // Analytics visite 7gg
      supabase.from("page_analytics").select("id", {count:"exact"})
        .eq("tipo","view").gte("created_at", sett+"T00:00:00"),
      // Aziende attive con dati
      supabase.from("aziende").select("id,nome,stato")
        .neq("stato","piattaforma").eq("stato","attiva"),
    ]);

    // KPI principali
    const prenOggiN  = prenOggi.count || 0;
    const prenMeseN  = prenMese.data?.length || 0;
    const copertiMese = (prenMese.data||[]).reduce((s,p) => s + (p.coperti||0), 0);
    const hotelOggiN  = hotelOggi.count || 0;
    const hotelNottiM = (hotelMese.data||[]).reduce((s,p) => s + (p.notti||0), 0);
    const tastingN    = tastingMese.count || 0;
    const tastingInc  = (tastingIncasso.data||[]).reduce((s,o) => s + parseFloat(o.totale||0), 0);
    const visite7gg   = analytics.count || 0;

    // Aggiorna KPI
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set("m-pren-oggi",      fmt(prenOggiN));
    set("m-pren-mese",      fmt(prenMeseN));
    set("m-coperti-mese",   fmt(copertiMese));
    set("m-hotel-oggi",     fmt(hotelOggiN));
    set("m-hotel-mese",     fmt(hotelNottiM));
    set("m-tasting-mese",   fmt(tastingN));
    set("m-incasso-tasting", fmtE(tastingInc));
    set("m-analytics-visite", fmt(visite7gg));

    // Breakdown per azienda
    const azList = aziende.data || [];
    if (!azList.length) {
      const el = document.getElementById("motori-breakdown");
      if (el) el.innerHTML = '<span style="color:#94a3b8;">Nessuna azienda attiva</span>';
      return;
    }

    const breakdownRows = await Promise.all(azList.map(async (az) => {
      const [pren, hotel, tasting] = await Promise.all([
        supabase.from("prenotazioni_tavoli").select("id,coperti")
          .eq("azienda_id", az.id).gte("data", inizioMese).neq("stato","annullata"),
        supabase.from("hotel_prenotazioni").select("id,notti")
          .eq("azienda_id", az.id).gte("data_checkin", inizioMese).neq("stato","annullata"),
        supabase.from("ticket_ordini").select("id,totale")
          .eq("azienda_id", az.id).gte("created_at", inizioMese+"T00:00:00").eq("stato","pagato"),
      ]);
      return {
        nome: az.nome,
        pren: pren.data?.length || 0,
        coperti: (pren.data||[]).reduce((s,p)=>s+(p.coperti||0),0),
        hotelNotti: (hotel.data||[]).reduce((s,p)=>s+(p.notti||0),0),
        tastingInc: (tasting.data||[]).reduce((s,o)=>s+parseFloat(o.totale||0),0),
      };
    }));

    const bdEl = document.getElementById("motori-breakdown");
    if (bdEl) {
      bdEl.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="color:#94a3b8;text-align:left;">
              <th style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">Azienda</th>
              <th style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;">🍽️ Prenotazioni</th>
              <th style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;">👥 Coperti</th>
              <th style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;">🏨 Notti hotel</th>
              <th style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;">🎫 Incasso Tasting</th>
            </tr>
          </thead>
          <tbody>
            ${breakdownRows.map(r => `
              <tr style="border-bottom:1px solid #f9fafb;">
                <td style="padding:8px;font-weight:600;color:#374151;">${r.nome}</td>
                <td style="padding:8px;text-align:center;">${fmt(r.pren)}</td>
                <td style="padding:8px;text-align:center;">${fmt(r.coperti)}</td>
                <td style="padding:8px;text-align:center;">${r.hotelNotti > 0 ? fmt(r.hotelNotti) : '—'}</td>
                <td style="padding:8px;text-align:center;font-weight:700;color:#16a34a;">${r.tastingInc > 0 ? fmtE(r.tastingInc) : '—'}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>`;
    }
  } catch(e) {
    console.error("caricaMotori error:", e);
    const el = document.getElementById("motori-breakdown");
    if (el) el.innerHTML = '<span style="color:#ef4444;font-size:12px;">Errore caricamento dati</span>';
  }
}

// ── PIANI & PREZZI ────────────────────────────────────────────────────────────
const PIANI_PREZZI = [
  { id:'starter',  nome:'Starter',         icona:'🌱', colore:'#0E5A7A', desc:'Per chi inizia', mensile:69,  annuale:790,  features:['Cassa & ordini','Menu digitale','Prenotazioni base','WhatsApp notifiche','Fidelity','1 sede · 3 utenti'] },
  { id:'business', nome:'Business',        icona:'🚀', colore:'#7C3AED', desc:'Per chi cresce',  mensile:119, annuale:1490, popolare:true, features:['Tutto Starter +','Promo & marketing','Food cost & ricettario','Gestione dipendenti','Acquisti & magazzino','Report KPI','3 sedi · 10 utenti'] },
  { id:'pro',      nome:'Pro',             icona:'⚡', colore:'#059669', desc:'Per chi scala',   mensile:169, annuale:2490, features:['Tutto Business +','Chatbot WhatsApp','RistoflowBook Social','API access','Multi-sede illimitata','Utenti illimitati'] },
  { id:'hotel',    nome:'Hotel',           icona:'🏨', colore:'#1B4F72', desc:'Modulo hotel',    mensile:99,  annuale:1490, features:['Prenotazioni hotel','Calendario Gantt','Check-in online','Operations & task','Colazione','Marketing hotel'] },
  { id:'full',     nome:'Full',            icona:'👑', colore:'#B45309', desc:'Ristorante + Hotel', mensile:199, annuale:3490, features:['Tutto Pro +','Tutto Hotel +','Chatbot WhatsApp','Priorità supporto','5 sedi · utenti illimitati'] },
  { id:'fondatore',nome:'Fondatore 2026',  icona:'🏅', colore:'#DC2626', desc:'Accesso lifetime a tutto', mensile:null, annuale:1500, lifetime:true, features:['TUTTO incluso','Aggiornamenti futuri gratuiti','Badge Fondatore','5 sedi · utenti illimitati','Prezzo bloccato per sempre'] },
];

let _billingMode = 'mensile';

window.togglePrezzi = function() {
  const sec = document.getElementById('prezzi-section');
  if (!sec) return;
  const isHidden = sec.style.display === 'none';
  sec.style.display = isHidden ? 'block' : 'none';
  if (isHidden) renderPrezziGrid();
};

function renderPrezziGrid() {
  const grid = document.getElementById('prezzi-grid');
  if (!grid) return;

  grid.innerHTML = PIANI_PREZZI.map(p => {
    const { prezzo, label, sub } = calcolaPrezzo(p, _billingMode);
    return `
    <div style="background:white;border-radius:16px;border:2px solid ${p.popolare ? p.colore : '#e5e7eb'};padding:20px;position:relative;${p.popolare ? `box-shadow:0 4px 20px ${p.colore}22;` : ''}">
      ${p.popolare ? `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:${p.colore};color:white;font-size:10px;font-weight:800;padding:3px 12px;border-radius:20px;white-space:nowrap;">⭐ PIÙ SCELTO</div>` : ''}
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:24px;">${p.icona}</span>
        <div>
          <div style="font-weight:800;font-size:16px;color:#111827;">${p.nome}</div>
          <div style="font-size:12px;color:#64748b;">${p.desc}</div>
        </div>
      </div>
      <div style="margin-bottom:14px;">
        <div style="font-size:28px;font-weight:800;color:${p.colore};">${prezzo}</div>
        <div style="font-size:12px;color:#64748b;">${label}</div>
        ${sub ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">${sub}</div>` : ''}
      </div>
      <div style="border-top:1px solid #f1f5f9;padding-top:12px;">
        ${p.features.map(f => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;color:#374151;"><span style="color:${p.colore};">✓</span>${f}</div>`).join('')}
      </div>
      <button onclick="copiaPrezzoWhatsapp('${p.id}')"
        style="margin-top:14px;width:100%;padding:8px;border:1.5px solid ${p.colore};background:transparent;color:${p.colore};border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">
        📋 Copia messaggio WA
      </button>
    </div>`;
  }).join('');

  renderConfrontoTabella();

  // Binding toggle
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.onclick = () => {
      _billingMode = btn.dataset.mode;
      document.querySelectorAll('.toggle-btn').forEach(b => {
        b.style.background = b.dataset.mode === _billingMode ? '#0E5A7A' : 'transparent';
        b.style.color = b.dataset.mode === _billingMode ? '#fff' : '#64748b';
      });
      renderPrezziGrid();
    };
  });
}

function calcolaPrezzo(p, mode) {
  if (p.lifetime) return { prezzo: `€ ${p.annuale.toLocaleString('it-IT')}`, label: 'una tantum · accesso lifetime', sub: 'Prezzo bloccato per sempre' };
  if (!p.mensile) return { prezzo: '—', label: '', sub: '' };

  if (mode === 'mensile') {
    return { prezzo: `€ ${p.mensile}/mese`, label: 'fatturato mensilmente', sub: `€ ${(p.mensile*12).toLocaleString('it-IT')}/anno` };
  }
  if (mode === 'annuale') {
    const sconto = Math.round(p.annuale * 0.8);
    const alMese = Math.round(sconto / 12);
    return { prezzo: `€ ${sconto.toLocaleString('it-IT')}/anno`, label: 'unica rata · sconto 20%', sub: `≈ € ${alMese}/mese · risparmi € ${(p.mensile*12-sconto).toLocaleString('it-IT')}` };
  }
  if (mode === '3rate') {
    const totale = Math.round(p.annuale * 0.9);
    const rata = Math.round(totale / 3);
    return { prezzo: `€ ${rata}/mese`, label: '3 rate · sconto 10%', sub: `€ ${totale.toLocaleString('it-IT')} totale · 1ª+2ª+3ª mese` };
  }
  return { prezzo: '', label: '', sub: '' };
}

function renderConfrontoTabella() {
  const el = document.getElementById('confronto-table');
  if (!el) return;
  const piani = PIANI_PREZZI.filter(p => p.mensile);
  el.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Piano</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Mensile</th>
            <th style="padding:8px 12px;text-align:center;color:#7C3AED;font-weight:700;border-bottom:1px solid #e5e7eb;">3 Rate −10%</th>
            <th style="padding:8px 12px;text-align:center;color:#059669;font-weight:700;border-bottom:1px solid #e5e7eb;">Annuale −20%</th>
            <th style="padding:8px 12px;text-align:center;color:#94a3b8;font-weight:700;border-bottom:1px solid #e5e7eb;">Risparmio max</th>
          </tr>
        </thead>
        <tbody>
          ${piani.map(p => {
            const listino = p.mensile * 12;
            const rate3   = Math.round(p.annuale * 0.9);
            const annuale = Math.round(p.annuale * 0.8);
            const risparmio = listino - annuale;
            return `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 12px;font-weight:700;">${p.icona} ${p.nome}</td>
              <td style="padding:10px 12px;text-align:center;">€ ${p.mensile}/mese<br><span style="color:#94a3b8;font-size:11px;">€ ${listino.toLocaleString('it-IT')}/anno</span></td>
              <td style="padding:10px 12px;text-align:center;color:#7C3AED;font-weight:700;">€ ${Math.round(rate3/3)}/mese × 3<br><span style="color:#94a3b8;font-size:11px;">€ ${rate3.toLocaleString('it-IT')} totale</span></td>
              <td style="padding:10px 12px;text-align:center;color:#059669;font-weight:700;">€ ${annuale.toLocaleString('it-IT')}/anno<br><span style="color:#94a3b8;font-size:11px;">≈ € ${Math.round(annuale/12)}/mese</span></td>
              <td style="padding:10px 12px;text-align:center;color:#dc2626;font-weight:700;">− € ${risparmio.toLocaleString('it-IT')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

window.copiaPrezzoWhatsapp = function(pianoId) {
  const p = PIANI_PREZZI.find(x => x.id === pianoId);
  if (!p) return;
  const { prezzo, label } = calcolaPrezzo(p, _billingMode);
  const modeLabel = _billingMode === 'mensile' ? 'mensile' : _billingMode === '3rate' ? '3 rate (−10%)' : 'annuale (−20%)';
  const msg = `Ciao! 👋\n\nTi propongo il piano *${p.nome}* di Ristoflow.AI:\n\n${p.icona} *${p.nome}* — ${p.desc}\n💰 *${prezzo}* (${modeLabel})\n\nInclude:\n${p.features.map(f=>`✅ ${f}`).join('\n')}\n\nVuoi che ti facciamo una demo? 🚀\nhttps://ristoflow-ai.com`;
  navigator.clipboard.writeText(msg).then(() => {
    alert('✅ Messaggio copiato! Incollalo su WhatsApp.');
  }).catch(() => {
    prompt('Copia questo messaggio:', msg);
  });
};

// ── CRM LEAD ─────────────────────────────────────────────────────────────────
let _crmLeads = [];
let _crmEditId = null;

const CRM_STATI = {
  visitato:    { label:'Visitato',     colore:'#64748b', bg:'#f1f5f9' },
  demo_fatta:  { label:'Demo fatta',   colore:'#d97706', bg:'#fef9c3' },
  trial_attivo:{ label:'Trial attivo', colore:'#7C3AED', bg:'#f5f3ff' },
  pagante:     { label:'Pagante ✅',   colore:'#059669', bg:'#d1fae5' },
  perso:       { label:'Perso ❌',     colore:'#DC2626', bg:'#fee2e2' },
};

const CRM_TEMP = {
  tiepido:  { label:'🟡 Tiepido',  colore:'#d97706' },
  freddo:   { label:'🔵 Freddo',   colore:'#0891B2' },
  glaciale: { label:'❄️ Glaciale', colore:'#374151' },
};

window.toggleCRM = function() {
  const sec = document.getElementById('crm-section');
  if (!sec) return;
  const isHidden = sec.style.display === 'none';
  sec.style.display = isHidden ? 'block' : 'none';
  if (isHidden) caricaCRM();
};

async function caricaCRM() {
  const { data } = await supabase
    .from('crm_lead')
    .select('*')
    .order('data_visita', { ascending: false });
  _crmLeads = data || [];

  // KPI card count
  const cardCount = document.getElementById('crm-card-count');
  if (cardCount) {
    const attivi = _crmLeads.filter(l => !['perso','pagante'].includes(l.stato)).length;
    cardCount.textContent = `${attivi} lead attivi`;
  }

  renderCRMKpi();
  renderCRM();
  renderFollowUp();
}

function renderCRMKpi() {
  const el = document.getElementById('crm-kpi');
  if (!el) return;
  const tot = _crmLeads.length;
  const byStato = {};
  _crmLeads.forEach(l => { byStato[l.stato] = (byStato[l.stato]||0)+1; });
  const conv = tot > 0 ? Math.round((byStato.pagante||0)/tot*100) : 0;

  el.innerHTML = [
    { val: tot,                      label:'Totali',       col:'#64748b' },
    { val: byStato.visitato||0,      label:'Visitati',     col:'#64748b' },
    { val: byStato.demo_fatta||0,    label:'Demo fatte',   col:'#d97706' },
    { val: byStato.trial_attivo||0,  label:'Trial attivi', col:'#7C3AED' },
    { val: byStato.pagante||0,       label:'Paganti ✅',   col:'#059669' },
    { val: byStato.perso||0,         label:'Persi ❌',     col:'#DC2626' },
    { val: conv+'%',                 label:'Conversione',  col:'#0E5A7A' },
  ].map(k => `
    <div style="background:white;border-radius:10px;border:1px solid #e5e7eb;padding:12px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:${k.col};">${k.val}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">${k.label}</div>
    </div>`).join('');
}

window.renderCRM = function() {
  const el = document.getElementById('crm-lista');
  if (!el) return;
  const stato = document.getElementById('crm-filter-stato')?.value || '';
  const temp  = document.getElementById('crm-filter-temp')?.value  || '';
  const zona  = document.getElementById('crm-filter-zona')?.value  || '';
  const q     = (document.getElementById('crm-search')?.value || '').toLowerCase();

  const filtered = _crmLeads.filter(l =>
    (!stato || l.stato === stato) &&
    (!temp  || l.temperatura === temp) &&
    (!zona  || l.zona === zona) &&
    (!q     || l.nome_locale?.toLowerCase().includes(q) || l.nome_titolare?.toLowerCase().includes(q))
  );

  if (!filtered.length) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px;">Nessun lead trovato</div>';
    return;
  }

  el.innerHTML = filtered.map(l => {
    const st = CRM_STATI[l.stato] || CRM_STATI.visitato;
    const tp = CRM_TEMP[l.temperatura] || { label:'—', colore:'#94a3b8' };
    const oggi = new Date().toISOString().split('T')[0];
    const scaduto = l.data_prossimo_step && l.data_prossimo_step < oggi;
    const problemi = (l.problema_emerso||[]).join(', ') || '—';
    return `
    <div style="background:white;border-radius:12px;border:1px solid ${scaduto?'#fca5a5':'#e5e7eb'};padding:14px 16px;margin-bottom:8px;display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
          <span style="font-size:14px;font-weight:800;color:#111827;">${escHP(l.nome_locale)}</span>
          <span style="background:${st.bg};color:${st.colore};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">${st.label}</span>
          <span style="color:${tp.colore};font-size:11px;font-weight:600;">${tp.label}</span>
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:4px;">
          ${l.nome_titolare ? `👤 ${escHP(l.nome_titolare)} · ` : ''}
          ${l.zona ? `📍 ${escHP(l.zona)} · ` : ''}
          ${l.tipo_locale ? `🍽️ ${escHP(l.tipo_locale)} · ` : ''}
          ${l.coperti ? `${l.coperti} coperti` : ''}
        </div>
        <div style="font-size:12px;color:#64748b;">
          ${l.data_visita ? `📅 Visita: ${new Date(l.data_visita).toLocaleDateString('it-IT')} · ` : ''}
          ${l.visitato_da ? `👤 ${escHP(l.visitato_da)} · ` : ''}
          Problema: <strong>${problemi}</strong>
        </div>
        ${l.prossimo_step ? `
        <div style="margin-top:6px;font-size:12px;color:${scaduto?'#DC2626':'#7C3AED'};font-weight:600;">
          ${scaduto?'⚠️':'📌'} ${escHP(l.prossimo_step)} ${l.data_prossimo_step ? `· ${new Date(l.data_prossimo_step).toLocaleDateString('it-IT')}` : ''}
        </div>` : ''}
        ${l.note ? `<div style="margin-top:6px;font-size:12px;color:#94a3b8;font-style:italic;">${escHP(l.note)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
        ${l.telefono ? `<a href="https://wa.me/39${l.telefono.replace(/\D/g,'')}" target="_blank" style="background:#25d366;color:white;border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;">💬 WA</a>` : ''}
        <button onclick="apriModaleLead('${l.id}')" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;">✏️ Edit</button>
        <button onclick="avanzaStato('${l.id}')" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;">→ Avanza</button>
      </div>
    </div>`;
  }).join('');
};

function renderFollowUp() {
  const el = document.getElementById('crm-followup');
  if (!el) return;
  const oggi = new Date().toISOString().split('T')[0];
  const domani = new Date(Date.now()+86400000).toISOString().split('T')[0];
  const urgenti = _crmLeads.filter(l =>
    l.data_prossimo_step && l.data_prossimo_step <= domani &&
    !['pagante','perso'].includes(l.stato)
  );
  if (!urgenti.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;">
      <div style="font-size:12px;font-weight:700;color:#854d0e;margin-bottom:10px;">⚠️ Follow-up urgenti (oggi/domani)</div>
      ${urgenti.map(l => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #fde68a;flex-wrap:wrap;gap:6px;">
          <div>
            <span style="font-weight:700;font-size:13px;">${escHP(l.nome_locale)}</span>
            <span style="font-size:12px;color:#64748b;margin-left:8px;">${escHP(l.prossimo_step||'')}</span>
          </div>
          <div style="display:flex;gap:6px;">
            ${l.telefono ? `<a href="https://wa.me/39${l.telefono.replace(/\D/g,'')}" target="_blank" style="background:#25d366;color:white;border:none;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:700;text-decoration:none;">💬 Scrivi</a>` : ''}
            <button onclick="apriModaleLead('${l.id}')" style="background:#854d0e;color:white;border:none;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;">Aggiorna</button>
          </div>
        </div>`).join('')}
    </div>`;
}

window.avanzaStato = async function(id) {
  const lead = _crmLeads.find(l => l.id === id);
  if (!lead) return;
  const ordine = ['visitato','demo_fatta','trial_attivo','pagante'];
  const idx = ordine.indexOf(lead.stato);
  if (idx === -1 || idx >= ordine.length-1) return;
  const nuovoStato = ordine[idx+1];
  await supabase.from('crm_lead').update({ stato: nuovoStato }).eq('id', id);
  await caricaCRM();
};

window.apriModaleLead = function(id) {
  _crmEditId = id || null;
  const lead = id ? _crmLeads.find(l => l.id === id) : null;
  const modal = document.getElementById('crm-modal');
  const title = document.getElementById('crm-modal-title');
  const body  = document.getElementById('crm-modal-body');
  if (!modal) return;

  title.textContent = lead ? `Modifica — ${lead.nome_locale}` : 'Nuova visita';

  const v = (field, def='') => lead?.[field] ?? def;
  const checked = (field, val) => (v(field,[]).includes(val)) ? 'checked' : '';

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div style="grid-column:1/-1;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOME LOCALE *</label>
        <input id="cl-nome" value="${escHP(v('nome_locale'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TITOLARE</label>
        <input id="cl-titolare" value="${escHP(v('nome_titolare'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TELEFONO</label>
        <input id="cl-tel" value="${escHP(v('telefono'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">ZONA</label>
        <select id="cl-zona" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          ${['Orte','Viterbo','Terni','Altra'].map(z => `<option ${v('zona')===z?'selected':''}>${z}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TIPO LOCALE</label>
        <select id="cl-tipo" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          ${['ristorante','pizzeria','hotel','catering','bar','altro'].map(t => `<option ${v('tipo_locale')===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">COPERTI</label>
        <input id="cl-coperti" type="number" value="${v('coperti')}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">DATA VISITA</label>
        <input id="cl-data" type="date" value="${v('data_visita')}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">VISITATO DA</label>
        <input id="cl-visitato" value="${escHP(v('visitato_da','Antonio'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">MODALITÀ</label>
        <select id="cl-modalita" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          ${['porta_a_porta','referral','rete','social'].map(m => `<option ${v('modalita')===m?'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TEMPERATURA</label>
        <select id="cl-temp" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          <option value="">—</option>
          ${['tiepido','freddo','glaciale'].map(t => `<option ${v('temperatura')===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">STATO</label>
        <select id="cl-stato" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          ${Object.entries(CRM_STATI).map(([k,s]) => `<option value="${k}" ${v('stato')===k?'selected':''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div style="grid-column:1/-1;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">PROBLEMA EMERSO</label>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${['conti','dipendenti','clienti','tempo','altro'].map(p => `
            <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;">
              <input type="checkbox" id="cl-prob-${p}" ${checked('problema_emerso',p)} style="width:16px;height:16px;"> ${p}
            </label>`).join('')}
        </div>
      </div>
      <div style="grid-column:1/-1;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">DEMO MOSTRATA</label>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${['bilancio','tony','prenotazioni','marketing','cassa','hr'].map(d => `
            <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;">
              <input type="checkbox" id="cl-demo-${d}" ${checked('demo_mostrata',d)} style="width:16px;height:16px;"> ${d}
            </label>`).join('')}
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">PIANO INTERESSE</label>
        <select id="cl-piano" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          <option value="">—</option>
          ${['starter','business','pro','hotel','full'].map(p => `<option ${v('piano_interesse')===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">DATA PROSSIMO STEP</label>
        <input id="cl-next-data" type="date" value="${v('data_prossimo_step')}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div style="grid-column:1/-1;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">PROSSIMO STEP</label>
        <input id="cl-next" value="${escHP(v('prossimo_step'))}" placeholder="Es. Richiamare martedì, mandare video demo..." style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div style="grid-column:1/-1;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOTE</label>
        <textarea id="cl-note" rows="3" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;">${escHP(v('note'))}</textarea>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      ${lead ? `<button onclick="eliminaLead('${lead.id}')" style="background:#fee2e2;color:#DC2626;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;margin-right:auto;">🗑 Elimina</button>` : ''}
      <button onclick="chiudiModaleLead()" style="background:#f1f5f9;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">Annulla</button>
      <button onclick="salvaLead()" style="background:#DC2626;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;">💾 Salva</button>
    </div>`;

  modal.style.display = 'flex';
};

window.chiudiModaleLead = function() {
  const modal = document.getElementById('crm-modal');
  if (modal) modal.style.display = 'none';
  _crmEditId = null;
};

window.salvaLead = async function() {
  const getProblemi = () => ['conti','dipendenti','clienti','tempo','altro'].filter(p => document.getElementById(`cl-prob-${p}`)?.checked);
  const getDemo    = () => ['bilancio','tony','prenotazioni','marketing','cassa','hr'].filter(d => document.getElementById(`cl-demo-${d}`)?.checked);

  const payload = {
    nome_locale:       document.getElementById('cl-nome')?.value?.trim(),
    nome_titolare:     document.getElementById('cl-titolare')?.value?.trim() || null,
    telefono:          document.getElementById('cl-tel')?.value?.trim() || null,
    zona:              document.getElementById('cl-zona')?.value || null,
    tipo_locale:       document.getElementById('cl-tipo')?.value || null,
    coperti:           parseInt(document.getElementById('cl-coperti')?.value) || null,
    data_visita:       document.getElementById('cl-data')?.value || null,
    visitato_da:       document.getElementById('cl-visitato')?.value?.trim() || null,
    modalita:          document.getElementById('cl-modalita')?.value || null,
    temperatura:       document.getElementById('cl-temp')?.value || null,
    stato:             document.getElementById('cl-stato')?.value || 'visitato',
    problema_emerso:   getProblemi(),
    demo_mostrata:     getDemo(),
    piano_interesse:   document.getElementById('cl-piano')?.value || null,
    prossimo_step:     document.getElementById('cl-next')?.value?.trim() || null,
    data_prossimo_step:document.getElementById('cl-next-data')?.value || null,
    note:              document.getElementById('cl-note')?.value?.trim() || null,
  };

  if (!payload.nome_locale) { alert('Inserisci il nome del locale'); return; }

  if (_crmEditId) {
    await supabase.from('crm_lead').update(payload).eq('id', _crmEditId);
  } else {
    await supabase.from('crm_lead').insert(payload);
  }

  chiudiModaleLead();
  await caricaCRM();
};

window.eliminaLead = async function(id) {
  if (!confirm('Eliminare questo lead?')) return;
  await supabase.from('crm_lead').delete().eq('id', id);
  chiudiModaleLead();
  await caricaCRM();
};

// Carica conteggio CRM sulla card anche senza aprire la sezione
(async function initCRMCount() {
  try {
    const { count } = await supabase.from('crm_lead').select('id', {count:'exact',head:true})
      .not('stato','in','(pagante,perso)');
    const el = document.getElementById('crm-card-count');
    if (el) el.textContent = `${count||0} lead attivi`;
  } catch {}
})();

function escHP(v) {
  return String(v == null ? "" : v)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
