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

        <div class="card" onclick="toggleAgenti()">
          <div>
            <div class="label">Rete vendita</div>
            <div class="title">Programma Agenti</div>
            <div style="font-size:11px;color:#7C3AED;margin-top:4px;font-weight:700;" id="agenti-card-count">Caricamento...</div>
          </div>
          <div class="icon">🤝</div>
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

      <!-- AGENTI (hidden by default) -->
      <div id="agenti-section" style="display:none;margin-top:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <div class="kpi-section-label" style="margin:0;">🤝 Programma Agenti — Rete Vendita</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Segnalatori · Agenti strutturati · Area manager</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="apriModaleAgente()" style="background:#7C3AED;color:white;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;">+ Nuovo agente</button>
            <button onclick="toggleAgenti()" style="background:#f1f5f9;border:none;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;color:#64748b;">✕</button>
          </div>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:4px;background:#f1f5f9;border-radius:10px;padding:3px;margin-bottom:16px;width:fit-content;">
          <button id="ag-tab-rete" onclick="switchTabAgenti('rete')" style="padding:7px 16px;border-radius:8px;border:none;background:white;color:#0E5A7A;font-size:13px;font-weight:700;cursor:pointer;">👥 Rete</button>
          <button id="ag-tab-performance" onclick="switchTabAgenti('performance')" style="padding:7px 16px;border-radius:8px;border:none;background:transparent;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;">📊 Performance</button>
          <button id="ag-tab-provvigioni" onclick="switchTabAgenti('provvigioni')" style="padding:7px 16px;border-radius:8px;border:none;background:transparent;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;">💰 Provvigioni</button>
          <button id="ag-tab-piano" onclick="switchTabAgenti('piano')" style="padding:7px 16px;border-radius:8px;border:none;background:transparent;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;">📋 Piano economico</button>
          <button id="ag-tab-guida" onclick="switchTabAgenti('guida')" style="padding:7px 16px;border-radius:8px;border:none;background:transparent;color:#64748b;font-size:13px;font-weight:600;cursor:pointer;">📖 Guida Vendita</button>
        </div>

        <div id="agenti-content"></div>

        <!-- Modale agente -->
        <div id="agente-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;padding:16px;">
          <div style="background:white;border-radius:16px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
              <div style="font-size:16px;font-weight:800;" id="agente-modal-title">Nuovo agente</div>
              <button onclick="chiudiModaleAgente()" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;">✕</button>
            </div>
            <div id="agente-modal-body"></div>
          </div>
        </div>

        <!-- Modale lead agente -->
        <div id="ag-lead-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;align-items:center;justify-content:center;padding:16px;">
          <div style="background:white;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
              <div style="font-size:16px;font-weight:800;" id="ag-lead-modal-title">Nuova segnalazione</div>
              <button onclick="chiudiModaleAgLead()" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;">✕</button>
            </div>
            <div id="ag-lead-modal-body"></div>
          </div>
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

// ── PROGRAMMA AGENTI ─────────────────────────────────────────────────────────
let _agenti = [];
let _agentiLead = [];
let _agTabAttiva = 'rete';
let _agenteEditId = null;
let _agLeadEditId = null;

const AG_TIPI = {
  segnalatore:   { label:'Segnalatore',    colore:'#0891B2', bg:'#e0f2fe', desc:'Segnala contatti, provvigione % sul contratto' },
  strutturato:   { label:'Agente',         colore:'#7C3AED', bg:'#f5f3ff', desc:'Fisso + variabile per cliente chiuso' },
  area_manager:  { label:'Area Manager',   colore:'#059669', bg:'#d1fae5', desc:'Gestisce altri agenti, % sulla rete' },
};

const AG_PIANI_VAR = {
  starter:  { label:'Starter €69',   var_key:'var_starter' },
  business: { label:'Business €119', var_key:'var_business' },
  pro:      { label:'Pro €169',      var_key:'var_pro' },
  hotel:    { label:'Hotel €99',     var_key:'var_starter' },
  full:     { label:'Full €199',     var_key:'var_full' },
};

const AG_FORECAST_PESI = {
  segnalato: 0.20,
  visitato: 0.35,
  demo_fatta: 0.55,
  demo: 0.55,
  trial: 0.80,
  trial_attivo: 0.80,
  contratto: 0.95,
  contratto_inviato: 0.95,
  pagante: 1,
};

const AG_PIANI_VALORE_ANNUO = {
  starter: 828,
  business: 1428,
  pro: 2028,
  hotel: 1188,
  full: 2388,
};

const AG_BONUS_FATTURATO_SOGLIE = [
  { soglia: 50000, bonus: 1500 },
  { soglia: 35000, bonus: 1000 },
  { soglia: 20000, bonus: 500 },
  { soglia: 10000, bonus: 200 },
];

function agEuro(v) {
  return `€${Math.round(Number(v || 0)).toLocaleString('it-IT')}`;
}

function agNormalizzaPiano(piano) {
  return String(piano || '').toLowerCase().trim();
}

function agPesoForecast(stato) {
  return AG_FORECAST_PESI[String(stato || '').toLowerCase().trim()] ?? 0.25;
}

function agValoreAnnuoLead(l) {
  const piano = agNormalizzaPiano(l?.piano);
  const valoreContratto = Number(l?.valore_contratto || l?.fatturato_annuo || l?.valore_annuo || 0);
  return valoreContratto > 0 ? valoreContratto : (AG_PIANI_VALORE_ANNUO[piano] || AG_PIANI_VALORE_ANNUO.business);
}

function agMrrLead(l) {
  return agValoreAnnuoLead(l) / 12;
}

function agBonusFatturato(fatturatoAnnuoVenduto) {
  const valore = Number(fatturatoAnnuoVenduto || 0);
  const soglia = AG_BONUS_FATTURATO_SOGLIE.find(s => valore >= s.soglia);
  return soglia ? soglia.bonus : 0;
}

function agBaseProvvigione(l, agente) {
  const salvata = Number(l?.provvigione_calcolata || 0);
  if (salvata > 0) return salvata;

  const piano = agNormalizzaPiano(l?.piano);
  const valoreAnnuo = agValoreAnnuoLead(l);

  if (agente?.tipo === 'segnalatore') {
    const perc = Number(agente?.perc_segnalatore || 10);
    return valoreAnnuo * perc / 100;
  }

  const varKey = AG_PIANI_VAR[piano]?.var_key || 'var_business';
  const fallback = piano === 'starter' ? 100 : piano === 'business' ? 180 : piano === 'hotel' ? 120 : 250;
  return Number(agente?.[varKey] || fallback);
}

function agProvvigionePrevista(l, agente) {
  if (!l || l.stato === 'perso') return 0;
  if (l.stato === 'pagante') return Number(l.provvigione_calcolata || agBaseProvvigione(l, agente) || 0);
  return agBaseProvvigione(l, agente) * agPesoForecast(l.stato);
}

function agPipelinePrevista(leads, agenti) {
  return (leads || [])
    .filter(l => !['pagante','perso'].includes(l.stato || ''))
    .reduce((s,l) => s + agProvvigionePrevista(l, (agenti || []).find(a => a.id === l.agente_id)), 0);
}


window.toggleAgenti = function() {
  const sec = document.getElementById('agenti-section');
  if (!sec) return;
  const isHidden = sec.style.display === 'none';
  sec.style.display = isHidden ? 'block' : 'none';
  if (isHidden) caricaAgenti();
};

async function caricaAgenti() {
  const [{ data: ag }, { data: al }] = await Promise.all([
    supabase.from('agenti').select('*').order('created_at', { ascending: false }),
    supabase.from('agenti_lead').select('*').order('created_at', { ascending: false }),
  ]);
  _agenti = ag || [];
  _agentiLead = al || [];

  // Card count
  const attivi = _agenti.filter(a => a.stato === 'attivo').length;
  const cardEl = document.getElementById('agenti-card-count');
  if (cardEl) cardEl.textContent = `${attivi} agenti attivi`;

  renderTabAgenti(_agTabAttiva);
}

window.switchTabAgenti = function(tab) {
  _agTabAttiva = tab;
  ['rete','performance','provvigioni','piano','guida'].forEach(t => {
    const btn = document.getElementById(`ag-tab-${t}`);
    if (!btn) return;
    btn.style.background = t === tab ? 'white' : 'transparent';
    btn.style.color      = t === tab ? '#0E5A7A' : '#64748b';
    btn.style.fontWeight = t === tab ? '700' : '600';
  });
  renderTabAgenti(tab);
};

function renderTabAgenti(tab) {
  const el = document.getElementById('agenti-content');
  if (!el) return;
  if (tab === 'rete')         el.innerHTML = '', renderReteAgenti(el);
  if (tab === 'performance')  el.innerHTML = '', renderPerformanceAgenti(el);
  if (tab === 'provvigioni')  el.innerHTML = '', renderProvvigioniAgenti(el);
  if (tab === 'piano')        el.innerHTML = '', renderPianoEconomico(el);
  if (tab === 'guida')        el.innerHTML = '', renderGuidaVendita(el);
}

function renderReteAgenti(el) {
  if (!_agenti.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:40px;background:white;border-radius:12px;border:1px solid #e5e7eb;">
        <div style="font-size:40px;margin-bottom:12px;">🤝</div>
        <div style="font-size:16px;font-weight:700;color:#374151;margin-bottom:8px;">Nessun agente ancora</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px;">Inizia aggiungendo il primo segnalatore o agente strutturato</div>
        <button onclick="apriModaleAgente()" style="background:#7C3AED;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;">+ Aggiungi agente</button>
      </div>`;
    return;
  }

  // KPI rete
  const attivi = _agenti.filter(a => a.stato === 'attivo');
  const totLead = _agentiLead.length;
  const paganti = _agentiLead.filter(l => l.stato === 'pagante').length;
  const provDaPagare = _agentiLead.filter(l => l.stato === 'pagante' && !l.provvigione_pagata)
    .reduce((s, l) => s + parseFloat(l.provvigione_calcolata || 0), 0);
  const provPreviste = agPipelinePrevista(_agentiLead, _agenti);
  const fatturatoVenduto = _agentiLead.filter(l => l.stato === 'pagante')
    .reduce((s, l) => s + agValoreAnnuoLead(l), 0);
  const mrrGenerato = fatturatoVenduto / 12;
  const bonusMaturati = _agenti.reduce((s, a) => {
    const myVenduto = _agentiLead.filter(l => l.agente_id === a.id && l.stato === 'pagante')
      .reduce((tot, l) => tot + agValoreAnnuoLead(l), 0);
    return s + agBonusFatturato(myVenduto);
  }, 0);
  const valorePipeline = _agentiLead.filter(l => !['pagante','perso'].includes(l.stato || ''))
    .reduce((s, l) => s + agValoreAnnuoLead(l), 0);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:16px;">
      ${[
        { v: _agenti.length,     l:'Totale agenti',      c:'#374151' },
        { v: attivi.length,      l:'Attivi',              c:'#059669' },
        { v: totLead,            l:'Lead segnalati',      c:'#7C3AED' },
        { v: paganti,            l:'Clienti chiusi',      c:'#0E5A7A' },
        { v: agEuro(fatturatoVenduto), l:'Fatturato venduto', c:'#059669' },
        { v: agEuro(mrrGenerato), l:'MRR generato', c:'#0E5A7A' },
        { v: agEuro(bonusMaturati), l:'Bonus fatturato', c:'#d97706' },
        { v: agEuro(provPreviste), l:'Provv. previste', c:'#d97706' },
        { v: agEuro(provDaPagare), l:'Provv. da pagare', c:'#DC2626' },
        { v: agEuro(valorePipeline), l:'Pipeline contratti', c:'#7C3AED' },
      ].map(k => `
        <div style="background:white;border-radius:10px;border:1px solid #e5e7eb;padding:12px;text-align:center;">
          <div style="font-size:22px;font-weight:800;color:${k.c};">${k.v}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">${k.l}</div>
        </div>`).join('')}
    </div>

    ${_agenti.map(a => {
      const tipo = AG_TIPI[a.tipo] || AG_TIPI.segnalatore;
      const myLead = _agentiLead.filter(l => l.agente_id === a.id);
      const paganti = myLead.filter(l => l.stato === 'pagante').length;
      const inCorso = myLead.filter(l => !['pagante','perso'].includes(l.stato)).length;
      const provDovuta = myLead.filter(l => l.stato === 'pagante' && !l.provvigione_pagata)
        .reduce((s, l) => s + parseFloat(l.provvigione_calcolata || 0), 0);
      const provPrevista = myLead.filter(l => !['pagante','perso'].includes(l.stato || ''))
        .reduce((s, l) => s + agProvvigionePrevista(l, a), 0);
      const zone = (a.zona || []).join(', ') || '—';

      return `
      <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:16px;margin-bottom:10px;">
        <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div style="width:44px;height:44px;border-radius:12px;background:${tipo.bg};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">
            ${a.tipo === 'segnalatore' ? '👋' : a.tipo === 'area_manager' ? '👑' : '🎯'}
          </div>
          <div style="flex:1;min-width:200px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
              <span style="font-size:15px;font-weight:800;color:#111827;">${escHP(a.nome)} ${escHP(a.cognome)}</span>
              <span style="background:${tipo.bg};color:${tipo.colore};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">${tipo.label}</span>
              ${a.stato !== 'attivo' ? `<span style="background:#fee2e2;color:#DC2626;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">${a.stato}</span>` : ''}
            </div>
            <div style="font-size:12px;color:#64748b;margin-bottom:6px;">
              ${a.telefono ? `📱 ${escHP(a.telefono)} · ` : ''}
              📍 ${zone} · 
              Da: ${a.data_inizio ? new Date(a.data_inizio).toLocaleDateString('it-IT') : '—'}
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <div style="background:#f8fafc;border-radius:8px;padding:6px 10px;font-size:12px;">
                <span style="color:#64748b;">Lead: </span><strong>${myLead.length}</strong>
              </div>
              <div style="background:#f8fafc;border-radius:8px;padding:6px 10px;font-size:12px;">
                <span style="color:#64748b;">Chiusi: </span><strong style="color:#059669;">${paganti}</strong>
              </div>
              <div style="background:#f8fafc;border-radius:8px;padding:6px 10px;font-size:12px;">
                <span style="color:#64748b;">In corso: </span><strong style="color:#7C3AED;">${inCorso}</strong>
              </div>
              ${provPrevista > 0 ? `<div style="background:#fef3c7;border-radius:8px;padding:6px 10px;font-size:12px;"><span style="color:#d97706;">Provv. prevista: </span><strong style="color:#d97706;">${agEuro(provPrevista)}</strong></div>` : ''}
              ${provDovuta > 0 ? `<div style="background:#fee2e2;border-radius:8px;padding:6px 10px;font-size:12px;"><span style="color:#DC2626;">Provv. dovuta: </span><strong style="color:#DC2626;">${agEuro(provDovuta)}</strong></div>` : ''}
              ${a.tipo !== 'segnalatore' ? `<div style="background:#f8fafc;border-radius:8px;padding:6px 10px;font-size:12px;"><span style="color:#64748b;">Fisso: </span><strong>€${a.fisso_mensile}/m</strong></div>` : `<div style="background:#f8fafc;border-radius:8px;padding:6px 10px;font-size:12px;"><span style="color:#64748b;">% provv: </span><strong>${a.perc_segnalatore}%</strong></div>`}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
            ${a.telefono ? `<a href="https://wa.me/39${a.telefono.replace(/\D/g,'')}" target="_blank" style="background:#25d366;color:white;border:none;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;text-decoration:none;text-align:center;">💬 WA</a>` : ''}
            <button onclick="apriModaleAgLead('${a.id}')" style="background:#7C3AED;color:white;border:none;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">+ Lead</button>
            <button onclick="apriModaleAgente('${a.id}')" style="background:#f1f5f9;border:none;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;">✏️ Edit</button>
          </div>
        </div>

        ${myLead.length ? `
        <div style="margin-top:12px;border-top:1px solid #f1f5f9;padding-top:10px;">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Lead segnalati</div>
          ${myLead.slice(0,3).map(l => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#f8fafc;border-radius:8px;margin-bottom:4px;flex-wrap:wrap;gap:6px;">
              <div>
                <span style="font-size:13px;font-weight:600;">${escHP(l.nome_locale)}</span>
                <span style="font-size:11px;color:#64748b;margin-left:8px;">${l.piano ? `· ${l.piano}` : ''}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${l.stato==='pagante'?'#d1fae5':l.stato==='perso'?'#fee2e2':'#f1f5f9'};color:${l.stato==='pagante'?'#059669':l.stato==='perso'?'#DC2626':'#64748b'};font-weight:700;">${l.stato}</span>
                ${l.provvigione_calcolata ? `<span style="font-size:11px;color:#0E5A7A;font-weight:700;">€${l.provvigione_calcolata}</span>` : ''}
                ${l.stato==='pagante'&&!l.provvigione_pagata ? `<button onclick="segnaProvvigionePagata('${l.id}')" style="background:#059669;color:white;border:none;border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;">✓ Pagata</button>` : ''}
                <button onclick="apriModaleAgLead('${a.id}','${l.id}')" style="background:#f1f5f9;border:none;border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;">Edit</button>
              </div>
            </div>`).join('')}
          ${myLead.length > 3 ? `<div style="font-size:12px;color:#94a3b8;text-align:center;padding:4px;">+ altri ${myLead.length-3} lead</div>` : ''}
        </div>` : ''}
      </div>`;
    }).join('')}`;
}

function renderPerformanceAgenti(el) {
  if (!_agenti.length) { el.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;">Nessun agente da analizzare</div>'; return; }

  const mesi = {};
  _agentiLead.filter(l => l.stato === 'pagante' && l.data_conversione).forEach(l => {
    const m = l.data_conversione.substring(0,7);
    if (!mesi[m]) mesi[m] = { tot:0, val:0 };
    mesi[m].tot++;
    mesi[m].val += parseFloat(l.valore_contratto||0);
  });

  el.innerHTML = `
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:16px;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:14px;">📊 Performance per agente</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 12px;text-align:left;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Agente</th>
              <th style="padding:10px 12px;text-align:center;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Tipo</th>
              <th style="padding:10px 12px;text-align:center;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Lead</th>
              <th style="padding:10px 12px;text-align:center;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Paganti</th>
              <th style="padding:10px 12px;text-align:center;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Conv. %</th>
              <th style="padding:10px 12px;text-align:center;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Valore chiuso</th>
              <th style="padding:10px 12px;text-align:center;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Target/mese</th>
            </tr>
          </thead>
          <tbody>
            ${_agenti.map(a => {
              const myLead = _agentiLead.filter(l => l.agente_id === a.id);
              const paganti = myLead.filter(l => l.stato === 'pagante').length;
              const conv = myLead.length ? Math.round(paganti/myLead.length*100) : 0;
              const valore = myLead.filter(l=>l.stato==='pagante').reduce((s,l)=>s+parseFloat(l.valore_contratto||0),0);
              const tipo = AG_TIPI[a.tipo]||AG_TIPI.segnalatore;
              const vs_target = a.target_mensile ? Math.round(paganti/a.target_mensile*100) : null;
              return `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px 12px;font-weight:600;">${escHP(a.nome)} ${escHP(a.cognome)}</td>
                <td style="padding:10px 12px;text-align:center;"><span style="background:${tipo.bg};color:${tipo.colore};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">${tipo.label}</span></td>
                <td style="padding:10px 12px;text-align:center;">${myLead.length}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:#059669;">${paganti}</td>
                <td style="padding:10px 12px;text-align:center;${conv>=30?'color:#059669;font-weight:700;':conv>=15?'color:#d97706;':'color:#DC2626;'}">${conv}%</td>
                <td style="padding:10px 12px;text-align:center;font-weight:700;color:#0E5A7A;">€${Math.round(valore).toLocaleString('it-IT')}</td>
                <td style="padding:10px 12px;text-align:center;">${vs_target !== null ? `${vs_target}% del target` : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:16px;">
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:14px;">📅 Clienti chiusi per mese</div>
      ${Object.entries(mesi).sort().reverse().slice(0,6).map(([m,d]) => `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:13px;font-weight:600;color:#374151;min-width:80px;">${m}</div>
          <div style="flex:1;background:#f1f5f9;border-radius:20px;height:8px;overflow:hidden;">
            <div style="background:#7C3AED;height:100%;border-radius:20px;width:${Math.min(d.tot*10,100)}%"></div>
          </div>
          <div style="font-size:13px;font-weight:700;color:#7C3AED;min-width:30px;">${d.tot}</div>
          <div style="font-size:12px;color:#64748b;min-width:80px;">€${Math.round(d.val).toLocaleString('it-IT')}</div>
        </div>`).join('') || '<div style="color:#94a3b8;font-size:13px;">Nessun cliente chiuso ancora</div>'}
    </div>`;
}

function renderProvvigioniAgenti(el) {
  const daPagare = _agentiLead.filter(l => l.stato === 'pagante' && !l.provvigione_pagata);
  const pagate   = _agentiLead.filter(l => l.provvigione_pagata);
  const previste = _agentiLead
    .filter(l => !['pagante','perso'].includes(l.stato || ''))
    .map(l => {
      const agente = _agenti.find(a => a.id === l.agente_id);
      return { ...l, agente, peso: agPesoForecast(l.stato), provvigione_prevista: agProvvigionePrevista(l, agente) };
    })
    .sort((a,b) => b.provvigione_prevista - a.provvigione_prevista);

  const totDaPagare = daPagare.reduce((s,l) => s+parseFloat(l.provvigione_calcolata||0), 0);
  const totPagate   = pagate.reduce((s,l) => s+parseFloat(l.provvigione_calcolata||0), 0);
  const totPreviste = previste.reduce((s,l) => s+Number(l.provvigione_prevista||0), 0);
  const meseCorrente = new Date().toISOString().substring(0,7);
  const forecastMese = previste
    .filter(l => (l.created_at || '').substring(0,7) === meseCorrente)
    .reduce((s,l) => s+Number(l.provvigione_prevista||0), 0);
  const forecastTotale = totDaPagare + totPreviste;
  const valorePipeline = _agentiLead.filter(l => !['pagante','perso'].includes(l.stato || ''))
    .reduce((s, l) => s + agValoreAnnuoLead(l), 0);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px;">
      <div style="background:#fef3c7;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#d97706;">${agEuro(totPreviste)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Provvigioni previste</div>
      </div>
      <div style="background:#f5f3ff;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#7C3AED;">${agEuro(forecastMese)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Forecast mese</div>
      </div>
      <div style="background:#fee2e2;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#DC2626;">${agEuro(totDaPagare)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Da pagare (${daPagare.length})</div>
      </div>
      <div style="background:#d1fae5;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#059669;">${agEuro(totPagate)}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Già pagate (${pagate.length})</div>
      </div>
    </div>

    <div style="background:#0f172a;color:white;border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
        <div>
          <div style="font-size:11px;color:#cbd5e1;text-transform:uppercase;font-weight:700;">Forecast totale rete</div>
          <div style="font-size:24px;font-weight:900;margin-top:4px;">${agEuro(forecastTotale)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#cbd5e1;text-transform:uppercase;font-weight:700;">Valore pipeline contratti</div>
          <div style="font-size:24px;font-weight:900;margin-top:4px;">${agEuro(valorePipeline)}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#cbd5e1;text-transform:uppercase;font-weight:700;">Regola forecast</div>
          <div style="font-size:12px;line-height:1.6;margin-top:4px;">Segnalato 20% · Visitato 35% · Demo 55% · Trial 80% · Contratto 95%</div>
        </div>
      </div>
    </div>

    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:16px;margin-bottom:12px;">
      <div style="font-size:13px;font-weight:700;color:#d97706;margin-bottom:12px;">⏳ Provvigioni previste su lead in lavorazione</div>
      ${previste.length ? previste.map(l => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:#fffbeb;border-radius:8px;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:13px;font-weight:700;">${escHP(l.nome_locale)} → ${l.agente ? escHP(l.agente.nome)+' '+escHP(l.agente.cognome) : '?'}</div>
            <div style="font-size:11px;color:#64748b;">${l.piano||'—'} · Stato: ${l.stato || 'segnalato'} · Probabilità ${Math.round((l.peso || 0) * 100)}%</div>
          </div>
          <div style="font-size:16px;font-weight:800;color:#d97706;">${agEuro(l.provvigione_prevista)}</div>
        </div>`).join('') : '<div style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;">Nessun lead in lavorazione per il forecast.</div>'}
    </div>

    ${daPagare.length ? `
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:16px;margin-bottom:12px;">
      <div style="font-size:13px;font-weight:700;color:#DC2626;margin-bottom:12px;">⚠️ Provvigioni da pagare</div>
      ${daPagare.map(l => {
        const agente = _agenti.find(a => a.id === l.agente_id);
        const importo = l.provvigione_calcolata || agBaseProvvigione(l, agente);
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:#fef2f2;border-radius:8px;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:13px;font-weight:700;">${escHP(l.nome_locale)} → ${agente ? escHP(agente.nome)+' '+escHP(agente.cognome) : '?'}</div>
            <div style="font-size:11px;color:#64748b;">${l.piano||'—'} · Chiuso: ${l.data_conversione ? new Date(l.data_conversione).toLocaleDateString('it-IT') : '—'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;font-weight:800;color:#DC2626;">${agEuro(importo)}</span>
            <button onclick="segnaProvvigionePagata('${l.id}')" style="background:#059669;color:white;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;">✓ Segna pagata</button>
          </div>
        </div>`;
      }).join('')}
    </div>` : '<div style="background:#d1fae5;border-radius:12px;padding:16px;text-align:center;color:#059669;font-weight:700;margin-bottom:12px;">✅ Nessuna provvigione in sospeso</div>'}

    ${pagate.length ? `
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:16px;">
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px;">✅ Storico pagamenti</div>
      ${pagate.slice(0,10).map(l => {
        const agente = _agenti.find(a => a.id === l.agente_id);
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;gap:6px;">
          <div>
            <span style="font-size:13px;font-weight:600;">${escHP(l.nome_locale)}</span>
            <span style="font-size:11px;color:#64748b;margin-left:8px;">→ ${agente ? escHP(agente.nome) : '?'}</span>
          </div>
          <div style="font-size:13px;font-weight:700;color:#059669;">${agEuro(l.provvigione_calcolata || agBaseProvvigione(l, agente))}</div>
        </div>`;
      }).join('')}
    </div>` : ''}`;
}

function renderPianoEconomico(el) {
  el.innerHTML = `
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;padding:20px;margin-bottom:16px;">
      <div style="font-size:15px;font-weight:800;color:#374151;margin-bottom:16px;">📋 Struttura compensi</div>

      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#0891B2;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">👋 Segnalatore</div>
        <div style="font-size:13px;color:#374151;line-height:1.7;background:#e0f2fe;border-radius:8px;padding:12px;">
          Segnala un contatto qualificato → tu fai la visita → lui riceve una % sul contratto del primo anno al momento del pagamento.<br>
          <strong>Zero costi fissi. Paghi solo se chiudi.</strong>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:10px;">
          ${[
            { piano:'Starter €69/m', anno:828, perc:10, prov:83 },
            { piano:'Business €119/m', anno:1428, perc:10, prov:143 },
            { piano:'Pro €169/m', anno:2028, perc:10, prov:203 },
            { piano:'Hotel €99/m', anno:1188, perc:10, prov:119 },
            { piano:'Full €199/m', anno:2388, perc:10, prov:239 },
          ].map(p => `
            <div style="background:#f8fafc;border-radius:8px;padding:10px;text-align:center;">
              <div style="font-size:11px;color:#64748b;font-weight:600;">${p.piano}</div>
              <div style="font-size:18px;font-weight:800;color:#0891B2;margin-top:4px;">€${p.prov}</div>
              <div style="font-size:10px;color:#94a3b8;">${p.perc}% · anno 1</div>
            </div>`).join('')}
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">🎯 Agente strutturato</div>
        <div style="font-size:13px;color:#374151;line-height:1.7;background:#f5f3ff;border-radius:8px;padding:12px;">
          Primi 2-3 mesi senza fisso: solo variabile, bonus obiettivo e ricorrente. Il fisso si attiva solo dopo validazione commerciale e clienti attivi.
        </div>
        <div style="overflow-x:auto;margin-top:10px;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Componente</th>
                <th style="padding:8px 12px;text-align:center;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Importo</th>
                <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Condizione</th>
              </tr>
            </thead>
            <tbody>
              ${[
                ['Fisso mensile', '€0 primi 2-3 mesi', 'Si attiva solo dopo validazione e target minimo'],
                ['Variabile Starter', '€100/cliente', 'Al primo pagamento'],
                ['Variabile Business', '€180/cliente', 'Al primo pagamento'],
                ['Variabile Pro/Full', '€250/cliente', 'Al primo pagamento'],
                ['Bonus fatturato', '€200-1.500/mese', 'Calcolato sul fatturato annuo venduto, non sul numero clienti'],
                ['Ricorrente anno 2', '5% canone', 'Se il cliente rinnova'],
              ].map(([c,i,cond]) => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:8px 12px;font-weight:600;">${c}</td>
                  <td style="padding:8px 12px;text-align:center;font-weight:700;color:#7C3AED;">${i}</td>
                  <td style="padding:8px 12px;color:#64748b;">${cond}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div style="background:#f5f3ff;border-radius:8px;padding:12px;margin-top:10px;font-size:13px;">
          <strong>Esempio primi mesi:</strong> Agente chiude 8 clienti/mese (6 Starter + 2 Business):<br>
          Fisso €0 + variabile €960 + bonus fatturato in base all'ARR venduto = <strong style="color:#7C3AED;">premio proporzionato al valore reale</strong><br>
          Dopo validazione: possibile fisso €500-800 mantenendo target e qualità clienti.
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">🏆 Bonus su fatturato annuo venduto</div>
        <div style="font-size:13px;color:#374151;line-height:1.7;background:#fef3c7;border-radius:8px;padding:12px;">
          Il bonus non dipende dal numero di lead o clienti, ma dal valore economico generato. Cinque clienti piccoli non valgono come cinque clienti Full.
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:10px;">
          ${AG_BONUS_FATTURATO_SOGLIE.slice().reverse().map(s => `
            <div style="background:#f8fafc;border-radius:8px;padding:10px;text-align:center;">
              <div style="font-size:11px;color:#64748b;font-weight:600;">Da ${agEuro(s.soglia)} ARR</div>
              <div style="font-size:18px;font-weight:800;color:#d97706;margin-top:4px;">${agEuro(s.bonus)}</div>
            </div>`).join('')}
        </div>
      </div>

      <div>
        <div style="font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">👑 Area Manager</div>
        <div style="font-size:13px;color:#374151;line-height:1.7;background:#d1fae5;border-radius:8px;padding:12px;">
          Gestisce 3-5 agenti nella sua area. Fa training, accompagna alle prime visite, monitora risultati. Prende % sulla rete.
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:10px;">
          ${[
            { l:'Fisso mensile', v:'€1.000-1.200' },
            { l:'% su ogni contratto rete', v:'5%' },
            { l:'Bonus fatturato rete', v:'Su ARR squadra' },
            { l:'Ricorrente anno 2 (rete)', v:'2.5%' },
          ].map(k => `
            <div style="background:#f8fafc;border-radius:8px;padding:10px;">
              <div style="font-size:11px;color:#64748b;font-weight:600;">${k.l}</div>
              <div style="font-size:18px;font-weight:800;color:#059669;margin-top:4px;">${k.v}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;padding:16px;">
      <div style="font-size:13px;font-weight:700;color:#854d0e;margin-bottom:8px;">📅 Roadmap rete vendita</div>
      ${[
        { fase:'Fase 1 · Ora → Luglio', desc:'Solo tu fai visite. Testi lo script, affini il processo, capisci le obiezioni reali.', col:'#DC2626' },
        { fase:'Fase 2 · Agosto → Settembre', desc:'Attivi 2-3 segnalatori/agenti senza fisso mensile. Solo provvigioni, bonus e forecast controllato dalla piattaforma.', col:'#d97706' },
        { fase:'Fase 3 · Ottobre → Dicembre', desc:'Inserisci 1 agente strutturato su Viterbo o Terni. 2 settimane affiancamento, poi autonomo.', col:'#7C3AED' },
        { fase:'Fase 4 · 2026', desc:'Area manager + rete su Lazio, Umbria, Toscana.', col:'#059669' },
      ].map(f => `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #fde68a;">
          <div style="width:8px;height:8px;border-radius:50%;background:${f.col};flex-shrink:0;margin-top:5px;"></div>
          <div>
            <div style="font-size:12px;font-weight:700;color:${f.col};">${f.fase}</div>
            <div style="font-size:12px;color:#374151;margin-top:2px;">${f.desc}</div>
          </div>
        </div>`).join('')}
    </div>`;
}

window.apriModaleAgente = function(id) {
  _agenteEditId = id || null;
  const agente = id ? _agenti.find(a => a.id === id) : null;
  const modal = document.getElementById('agente-modal');
  const title = document.getElementById('agente-modal-title');
  const body  = document.getElementById('agente-modal-body');
  if (!modal) return;

  title.textContent = agente ? `Modifica — ${agente.nome} ${agente.cognome}` : 'Nuovo agente';
  const v = (f, def='') => agente?.[f] ?? def;
  const zone = v('zona', []);

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOME *</label>
        <input id="ag-nome" value="${escHP(v('nome'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">COGNOME *</label>
        <input id="ag-cognome" value="${escHP(v('cognome'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TELEFONO</label>
        <input id="ag-tel" value="${escHP(v('telefono'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">EMAIL</label>
        <input id="ag-email" value="${escHP(v('email'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TIPO *</label>
        <select id="ag-tipo" onchange="aggiornaFormAgente()" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          ${Object.entries(AG_TIPI).map(([k,t]) => `<option value="${k}" ${v('tipo')===k?'selected':''}>${t.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">STATO</label>
        <select id="ag-stato" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
          ${['attivo','sospeso','terminato'].map(s => `<option ${v('stato')===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">DATA INIZIO</label>
        <input id="ag-data" type="date" value="${v('data_inizio')}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">CODICE FISCALE</label>
        <input id="ag-cf" value="${escHP(v('codice_fiscale'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div style="grid-column:1/-1;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">ZONE ASSEGNATE</label>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${['Orte','Viterbo','Terni','Rieti','Roma','Altra'].map(z => `
            <label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;">
              <input type="checkbox" id="ag-zona-${z}" ${zone.includes(z)?'checked':''} style="width:16px;height:16px;"> ${z}
            </label>`).join('')}
        </div>
      </div>
      <div id="ag-compenso-section" style="grid-column:1/-1;"></div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">IBAN</label>
        <input id="ag-iban" value="${escHP(v('iban'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div style="grid-column:1/-1;">
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOTE</label>
        <textarea id="ag-note" rows="2" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;">${escHP(v('note'))}</textarea>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      ${agente ? `<button onclick="eliminaAgente('${agente.id}')" style="background:#fee2e2;color:#DC2626;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;margin-right:auto;">🗑 Elimina</button>` : ''}
      <button onclick="chiudiModaleAgente()" style="background:#f1f5f9;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">Annulla</button>
      <button onclick="salvaAgente()" style="background:#7C3AED;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;">💾 Salva</button>
    </div>`;

  modal.style.display = 'flex';
  aggiornaFormAgente();
};

window.aggiornaFormAgente = function() {
  const tipo = document.getElementById('ag-tipo')?.value;
  const sec = document.getElementById('ag-compenso-section');
  if (!sec) return;
  const agente = _agenteEditId ? _agenti.find(a => a.id === _agenteEditId) : null;
  const v = (f, def=0) => agente?.[f] ?? def;

  if (tipo === 'segnalatore') {
    sec.innerHTML = `
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">% PROVVIGIONE</label>
        <input id="ag-perc" type="number" value="${v('perc_segnalatore',10)}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Sul valore del primo anno di contratto</div>
      </div>`;
  } else {
    sec.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">FISSO MENSILE €</label>
          <input id="ag-fisso" type="number" value="${v('fisso_mensile',700)}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">TARGET MENSILE (clienti)</label>
          <input id="ag-target" type="number" value="${v('target_mensile',5)}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">VAR. STARTER €</label>
          <input id="ag-var-starter" type="number" value="${v('var_starter',100)}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">VAR. BUSINESS €</label>
          <input id="ag-var-business" type="number" value="${v('var_business',180)}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">VAR. PRO/FULL €</label>
          <input id="ag-var-pro" type="number" value="${v('var_pro',250)}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">BONUS OBIETTIVO €</label>
          <input id="ag-bonus" type="number" value="${v('bonus_obiettivo',300)}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">RICORRENTE ANNO 2 %</label>
          <input id="ag-ricorrente" type="number" value="${v('perc_ricorrente',5)}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
      </div>`;
  }
};

window.chiudiModaleAgente = function() {
  const modal = document.getElementById('agente-modal');
  if (modal) modal.style.display = 'none';
  _agenteEditId = null;
};

window.salvaAgente = async function() {
  const tipo = document.getElementById('ag-tipo')?.value;
  const zone = ['Orte','Viterbo','Terni','Rieti','Roma','Altra'].filter(z => document.getElementById(`ag-zona-${z}`)?.checked);

  const payload = {
    nome:           document.getElementById('ag-nome')?.value?.trim(),
    cognome:        document.getElementById('ag-cognome')?.value?.trim(),
    telefono:       document.getElementById('ag-tel')?.value?.trim() || null,
    email:          document.getElementById('ag-email')?.value?.trim() || null,
    tipo,
    zona:           zone,
    stato:          document.getElementById('ag-stato')?.value || 'attivo',
    data_inizio:    document.getElementById('ag-data')?.value || null,
    codice_fiscale: document.getElementById('ag-cf')?.value?.trim() || null,
    iban:           document.getElementById('ag-iban')?.value?.trim() || null,
    note:           document.getElementById('ag-note')?.value?.trim() || null,
    perc_segnalatore: tipo === 'segnalatore' ? parseFloat(document.getElementById('ag-perc')?.value||10) : null,
    fisso_mensile:  tipo !== 'segnalatore' ? parseFloat(document.getElementById('ag-fisso')?.value||0) : 0,
    target_mensile: tipo !== 'segnalatore' ? parseInt(document.getElementById('ag-target')?.value||5) : null,
    var_starter:    tipo !== 'segnalatore' ? parseFloat(document.getElementById('ag-var-starter')?.value||100) : null,
    var_business:   tipo !== 'segnalatore' ? parseFloat(document.getElementById('ag-var-business')?.value||180) : null,
    var_pro:        tipo !== 'segnalatore' ? parseFloat(document.getElementById('ag-var-pro')?.value||250) : null,
    var_full:       tipo !== 'segnalatore' ? parseFloat(document.getElementById('ag-var-pro')?.value||250) : null,
    bonus_obiettivo:tipo !== 'segnalatore' ? parseFloat(document.getElementById('ag-bonus')?.value||300) : null,
    perc_ricorrente:tipo !== 'segnalatore' ? parseFloat(document.getElementById('ag-ricorrente')?.value||5) : null,
  };

  if (!payload.nome || !payload.cognome) { alert('Inserisci nome e cognome'); return; }

  if (_agenteEditId) await supabase.from('agenti').update(payload).eq('id', _agenteEditId);
  else await supabase.from('agenti').insert(payload);

  chiudiModaleAgente();
  await caricaAgenti();
};

window.eliminaAgente = async function(id) {
  if (!confirm('Eliminare questo agente? Verranno eliminati anche i suoi lead.')) return;
  await supabase.from('agenti').delete().eq('id', id);
  chiudiModaleAgente();
  await caricaAgenti();
};

window.apriModaleAgLead = function(agenteId, leadId) {
  _agLeadEditId = leadId || null;
  const lead = leadId ? _agentiLead.find(l => l.id === leadId) : null;
  const agente = _agenti.find(a => a.id === agenteId);
  const modal = document.getElementById('ag-lead-modal');
  const title = document.getElementById('ag-lead-modal-title');
  const body  = document.getElementById('ag-lead-modal-body');
  if (!modal || !agente) return;

  title.textContent = lead ? `Modifica lead — ${lead.nome_locale}` : `Nuova segnalazione da ${agente.nome}`;
  const v = (f, def='') => lead?.[f] ?? def;

  body.innerHTML = `
    <input type="hidden" id="agl-agente-id" value="${agenteId}">
    <div style="display:grid;gap:12px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOME LOCALE *</label>
        <input id="agl-nome" value="${escHP(v('nome_locale'))}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">PIANO</label>
          <select id="agl-piano" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
            <option value="">—</option>
            ${['starter','business','pro','hotel','full'].map(p => `<option ${v('piano')===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">STATO</label>
          <select id="agl-stato" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
            ${['segnalato','visitato','trial','pagante','perso'].map(s => `<option ${v('stato')===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">DATA SEGNALAZIONE</label>
          <input id="agl-data-seg" type="date" value="${v('data_segnalazione', new Date().toISOString().split('T')[0])}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">DATA CONVERSIONE</label>
          <input id="agl-data-conv" type="date" value="${v('data_conversione')}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">VALORE CONTRATTO €</label>
          <input id="agl-valore" type="number" value="${v('valore_contratto')}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">PROVVIGIONE CALCOLATA €</label>
          <input id="agl-prov" type="number" value="${v('provvigione_calcolata')}" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">NOTE</label>
        <textarea id="agl-note" rows="2" style="width:100%;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical;">${escHP(v('note'))}</textarea>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
      <button onclick="chiudiModaleAgLead()" style="background:#f1f5f9;border:none;border-radius:8px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">Annulla</button>
      <button onclick="salvaAgLead()" style="background:#7C3AED;color:white;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;">💾 Salva</button>
    </div>`;

  modal.style.display = 'flex';
};

window.chiudiModaleAgLead = function() {
  const modal = document.getElementById('ag-lead-modal');
  if (modal) modal.style.display = 'none';
  _agLeadEditId = null;
};

window.salvaAgLead = async function() {
  const payload = {
    agente_id:             document.getElementById('agl-agente-id')?.value,
    nome_locale:           document.getElementById('agl-nome')?.value?.trim(),
    piano:                 document.getElementById('agl-piano')?.value || null,
    stato:                 document.getElementById('agl-stato')?.value || 'segnalato',
    data_segnalazione:     document.getElementById('agl-data-seg')?.value || null,
    data_conversione:      document.getElementById('agl-data-conv')?.value || null,
    valore_contratto:      parseFloat(document.getElementById('agl-valore')?.value) || null,
    provvigione_calcolata: parseFloat(document.getElementById('agl-prov')?.value) || null,
    note:                  document.getElementById('agl-note')?.value?.trim() || null,
  };

  if (!payload.nome_locale) { alert('Inserisci il nome del locale'); return; }

  if (_agLeadEditId) await supabase.from('agenti_lead').update(payload).eq('id', _agLeadEditId);
  else await supabase.from('agenti_lead').insert(payload);

  chiudiModaleAgLead();
  await caricaAgenti();
};

window.segnaProvvigionePagata = async function(id) {
  if (!confirm('Segna questa provvigione come pagata?')) return;
  await supabase.from('agenti_lead').update({
    provvigione_pagata: true,
    data_pagamento_prov: new Date().toISOString().split('T')[0]
  }).eq('id', id);
  await caricaAgenti();
};

// Carica conteggio agenti sulla card
(async function initAgentiCount() {
  try {
    const { count } = await supabase.from('agenti').select('id', {count:'exact',head:true}).eq('stato','attivo');
    const el = document.getElementById('agenti-card-count');
    if (el) el.textContent = `${count||0} agenti attivi`;
  } catch {}
})();

function renderGuidaVendita(el) {
  const sezione = (titolo, colore, contenutoHtml) => `
    <div style="background:white;border-radius:12px;border:1px solid #e5e7eb;margin-bottom:14px;overflow:hidden;">
      <div style="background:${colore};color:white;padding:12px 18px;font-size:14px;font-weight:800;">${titolo}</div>
      <div style="padding:18px;">${contenutoHtml}</div>
    </div>`;

  const script = (label, testo, colore='#0E5A7A') => `
    <div style="background:#f8fafc;border-left:3px solid ${colore};border-radius:8px;padding:12px 14px;margin-bottom:10px;">
      <div style="font-size:11px;font-weight:700;color:${colore};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">${label}</div>
      <div style="font-size:13px;color:#374151;line-height:1.6;font-style:italic;">"${testo}"</div>
    </div>`;

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#0E5A7A,#1a7a9f);border-radius:14px;padding:20px;color:white;margin-bottom:16px;">
      <div style="font-size:18px;font-weight:800;margin-bottom:6px;">📖 Guida alla Vendita Ristoflow</div>
      <div style="font-size:13px;opacity:.9;line-height:1.6;">Il processo completo per visite porta a porta, pitch per temperatura cliente e gestione delle obiezioni. Consultala prima di ogni visita.</div>
    </div>

    ${sezione('🎯 I 3 problemi universali del ristoratore', '#DC2626', `
      <div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:12px;">
        Ogni ristoratore — dal piccolo locale alla catena — condivide questi tre dolori. Sono la base di ogni conversazione di vendita.
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
        <div style="background:#fef2f2;border-radius:10px;padding:12px;">
          <div style="font-size:20px;margin-bottom:4px;">💰</div>
          <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:4px;">I conti che non tornano</div>
          <div style="font-size:12px;color:#64748b;line-height:1.5;">Lavora 16 ore, il locale è pieno, ma a fine mese non sa dove sono finiti i soldi.</div>
        </div>
        <div style="background:#fef2f2;border-radius:10px;padding:12px;">
          <div style="font-size:20px;margin-bottom:4px;">😞</div>
          <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:4px;">I dipendenti svogliati</div>
          <div style="font-size:12px;color:#64748b;line-height:1.5;">Investe tempo a formarli, poi se ne vanno o fanno il minimo indispensabile.</div>
        </div>
        <div style="background:#fef2f2;border-radius:10px;padding:12px;">
          <div style="font-size:20px;margin-bottom:4px;">👥</div>
          <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:4px;">I clienti non qualificati</div>
          <div style="font-size:12px;color:#64748b;line-height:1.5;">Il locale si riempie ma di chi spende poco e non torna. Margine basso.</div>
        </div>
      </div>
    `)}

    ${sezione('🚪 Contesto operativo della visita', '#0891B2', `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
        <div style="background:#e0f2fe;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:#64748b;font-weight:600;">CHI SEI</div>
          <div style="font-size:13px;font-weight:700;color:#0891B2;margin-top:4px;">Un collega, non un venditore</div>
        </div>
        <div style="background:#e0f2fe;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:#64748b;font-weight:600;">COSA PORTI</div>
          <div style="font-size:13px;font-weight:700;color:#0891B2;margin-top:4px;">iPad con software live</div>
        </div>
        <div style="background:#e0f2fe;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:#64748b;font-weight:600;">ZONA</div>
          <div style="font-size:13px;font-weight:700;color:#0891B2;margin-top:4px;">Orte · Viterbo · Terni</div>
        </div>
        <div style="background:#e0f2fe;border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:11px;color:#64748b;font-weight:600;">QUANDO</div>
          <div style="font-size:13px;font-weight:700;color:#0891B2;margin-top:4px;">Mattina o pre-cena</div>
        </div>
      </div>
    `)}

    ${sezione('🔢 Le 5 fasi del processo', '#7C3AED', `
      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="background:#7C3AED;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">1</span>
          <span style="font-size:13px;font-weight:700;color:#374151;">Approccio (30 secondi)</span>
        </div>
        ${script('Script di entrata', 'Salve, cerco il titolare — sono Antonio, ho un locale a Orte, Campo Antico. Volevo scambiare due parole con lui se ha un attimo, non vendo niente, ho trovato una cosa che mi ha cambiato la gestione e la condivido con chi fa il nostro lavoro.', '#7C3AED')}
        <div style="font-size:12px;color:#94a3b8;line-height:1.6;">Funziona perché: "ho un locale" → sei uno di loro · "non vendo niente" → abbatte la diffidenza · "la condivido" → curiosità, non pressione.</div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="background:#7C3AED;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">2</span>
          <span style="font-size:13px;font-weight:700;color:#374151;">Qualifica (2 minuti)</span>
        </div>
        <div style="font-size:12px;color:#374151;line-height:1.8;padding-left:32px;">
          ▸ "Quanti coperti hai?"<br>
          ▸ "Lavori anche a pranzo o solo cena?"<br>
          ▸ "Hai personale fisso o stagionale?"
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-top:6px;padding-left:32px;">Se meno di 20 coperti e lavora da solo → non è il target oggi, ringrazi e vai.</div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="background:#7C3AED;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">3</span>
          <span style="font-size:13px;font-weight:700;color:#374151;">Il problema (3 minuti)</span>
        </div>
        ${script('Domanda chiave — poi silenzio', 'Dimmi una cosa — a fine mese, quando guardi i numeri, ti tornano?', '#7C3AED')}
        <div style="font-size:12px;color:#94a3b8;line-height:1.6;">La risposta rivela la temperatura del cliente. Lascia che parli lui.</div>
      </div>

      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="background:#7C3AED;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">4</span>
          <span style="font-size:13px;font-weight:700;color:#374151;">Demo (10 minuti)</span>
        </div>
        <div style="background:#fef9c3;border-radius:8px;padding:10px 12px;font-size:12px;color:#854d0e;margin-bottom:8px;">⚡ Regola d'oro: mostra UNA cosa sola che risolve il problema specifico nominato. Mai il giro completo.</div>
        <div style="font-size:12px;color:#374151;line-height:1.8;">
          ▸ Problema conti → apri il <strong>bilancio live</strong><br>
          ▸ Problema dipendenti → apri <strong>timbrature + survey clima</strong><br>
          ▸ Problema clienti → apri <strong>promo + catenarie automatiche</strong>
        </div>
      </div>

      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="background:#7C3AED;color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">5</span>
          <span style="font-size:13px;font-weight:700;color:#374151;">Chiusura (5 minuti)</span>
        </div>
        ${script('Domanda di chiusura', 'Ti faccio una domanda diretta: quello che hai visto risolve un problema che hai?', '#7C3AED')}
        <div style="font-size:12px;color:#374151;line-height:1.8;">
          ▸ Sì → "Ti propongo 30 giorni gratis, nessun vincolo."<br>
          ▸ "Ci devo pensare" → lasci numero + video demo da guardare con calma<br>
          ▸ "Non ho tempo" → proponi un ritorno specifico (es. martedì mattina, 20 minuti)
        </div>
      </div>
    `)}

    ${sezione('🌡️ Pitch per temperatura cliente', '#d97706', `
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:800;color:#d97706;margin-bottom:6px;">🟡 TIEPIDO — sa già di avere il problema</div>
        ${script('Apertura', 'Lo scorso dicembre ho chiuso un mese con il locale pieno tutti i weekend. A fine mese guardo il conto — quasi zero. Non capivo dove erano andati i soldi. Oggi lo so, ogni mattina, prima di aprire.', '#d97706')}
        <div style="font-size:12px;color:#94a3b8;">Poi apri il bilancio live e stai zitto.</div>
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:13px;font-weight:800;color:#0891B2;margin-bottom:6px;">🔵 FREDDO — sente il disagio ma non l'ha collegato a un sistema</div>
        ${script('Apertura', 'Ti faccio vedere una cosa. Questo è quello che vedo io ogni mattina prima di aprire il locale.', '#0891B2')}
        <div style="font-size:12px;color:#94a3b8;">Apri Tony AI → briefing del giorno. Lasci che faccia domande.</div>
      </div>

      <div>
        <div style="font-size:13px;font-weight:800;color:#374151;margin-bottom:6px;">❄️ GLACIALE — "tanto cucino bene"</div>
        ${script('Apertura', 'Quante ore lavori al giorno? [...silenzio...] E quante di quelle potrebbe fare un sistema automatico? Io ne ho recuperate 3 al giorno senza assumere nessuno.', '#374151')}
        <div style="font-size:12px;color:#94a3b8;">Non parli di tecnologia — parli di tempo libero.</div>
      </div>
    `)}

    ${sezione('🛡️ Gestione obiezioni', '#059669', `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Temp.</th>
              <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Obiezione</th>
              <th style="padding:8px 10px;text-align:left;color:#64748b;font-weight:700;border-bottom:1px solid #e5e7eb;">Risposta</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['🟡','"Costa troppo"','Quanto ti costa non sapere dove vanno i soldi ogni mese?'],
              ['🟡','"Ho già un gestionale"','Che cosa ti manca di quello che hai?'],
              ['🔵','"Non ne ho bisogno"','Come tieni sotto controllo il food cost?'],
              ['🔵','"Ci penso"','Cosa ti frena? Voglio capire se posso aiutarti davvero'],
              ['❄️','"Cucino bene"','Si vede. Ma riesci a staccare un giorno a settimana?'],
              ['❄️','"Sono troppo piccolo"','Ho iniziato con 40 coperti. Il problema dei conti è uguale'],
            ].map(([t,o,r]) => `
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 10px;font-size:16px;">${t}</td>
                <td style="padding:8px 10px;font-weight:600;color:#374151;">${o}</td>
                <td style="padding:8px 10px;color:#64748b;font-style:italic;">${r}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `)}

    ${sezione('💬 Sequenza follow-up post-visita', '#0E5A7A', `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="background:#0E5A7A;color:white;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;white-space:nowrap;">GIORNO 1</div>
          <div style="font-size:13px;color:#374151;">WA immediato — 3 varianti pronte per temperatura (Messaggi → Template Vendita)</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="background:#0891B2;color:white;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;white-space:nowrap;">GIORNO 4</div>
          <div style="font-size:13px;color:#374151;">"Hai avuto modo di guardare il video? Volevo mostrarti una cosa specifica per [il suo problema]."</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="background:#7C3AED;color:white;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;white-space:nowrap;">GIORNO 10</div>
          <div style="font-size:13px;color:#374151;">"Ho aperto il trial per un locale della tua zona — in 30 giorni ha [risultato]. Se vuoi vedere come, sono qui."</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="background:#DC2626;color:white;font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;white-space:nowrap;">GIORNO 21</div>
          <div style="font-size:13px;color:#374151;">Cambio angolo, rientri come cliente: "Non ti scrivo per Ristoflow. Domani passo da voi per pranzo — c'è qualcosa che consigli?"</div>
        </div>
      </div>
    `)}

    ${sezione('📅 Percorso post-trial (30 giorni)', '#7C3AED', `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
        ${[
          ['Settimana 1','Onboarding guidato (guida 6 livelli) + chiamata check al giorno 3'],
          ['Settimana 2','Far vedere UN risultato concreto (prenotazione arrivata da sola, WA che risponde)'],
          ['Settimana 3','Aiutarli a leggere il primo dato reale che non sapevano (food cost, margine, ore)'],
          ['Settimana 4','Chiusura naturale: "Hai visto qualcosa che non sapevi?" → si vende da solo'],
        ].map(([s,d]) => `
          <div style="background:#f5f3ff;border-radius:10px;padding:12px;">
            <div style="font-size:12px;font-weight:800;color:#7C3AED;margin-bottom:6px;">${s}</div>
            <div style="font-size:12px;color:#374151;line-height:1.5;">${d}</div>
          </div>`).join('')}
      </div>
    `)}

    ${sezione('📊 I numeri del processo', '#374151', `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:12px;">
        ${[
          ['20','Visite/settimana'],
          ['10','Conversazioni reali'],
          ['3','Trial attivati'],
          ['1-2','Convertiti a pagamento'],
        ].map(([v,l]) => `
          <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#374151;">${v}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${l}</div>
          </div>`).join('')}
      </div>
      <div style="background:#fef9c3;border-radius:10px;padding:12px;font-size:13px;color:#854d0e;">
        <strong>20 visite → 1-2 clienti paganti/settimana.</strong> Per 50 clienti in 3 mesi servono ~120 visite/settimana — impossibile da soli, da qui la necessità della rete agenti.
      </div>
    `)}

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:13px;color:#0369a1;">💡 Ricorda di registrare ogni visita nel <strong>CRM Lead</strong> qui sopra — temperatura, problema emerso, demo mostrata e prossimo step.</div>
    </div>`;
}

function escHP(v) {
  return String(v == null ? "" : v)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
