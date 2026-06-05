// js/views/bo/bo-template.js
// Template Manager WhatsApp — Wildcard + Trigger + Tag System

const supa = () => window.supabaseClient || window.supabase;
const SUPABASE_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0';

// ─── WILDCARD DISPONIBILI ─────────────────────────────────────────────────────
const WILDCARD_GRUPPI = [
  {
    gruppo: '👤 Cliente',
    items: [
      { key: 'nome',          label: 'Nome' },
      { key: 'cognome',       label: 'Cognome' },
      { key: 'nome_completo', label: 'Nome completo' },
      { key: 'telefono',      label: 'Telefono' },
    ]
  },
  {
    gruppo: '📅 Prenotazione',
    items: [
      { key: 'data_prenotazione', label: 'Data prenotazione' },
      { key: 'ora_prenotazione',  label: 'Ora prenotazione' },
      { key: 'num_persone',       label: 'N° persone' },
      { key: 'nome_sala',         label: 'Sala' },
      { key: 'numero_tavolo',     label: 'Tavolo' },
    ]
  },
  {
    gruppo: '🎉 Evento',
    items: [
      { key: 'data_evento',  label: 'Data evento' },
      { key: 'tipo_evento',  label: 'Tipo evento' },
      { key: 'nome_evento',  label: 'Nome evento' },
      { key: 'importo',      label: 'Importo' },
    ]
  },
  {
    gruppo: '⏱ Timbrature',
    items: [
      { key: 'ora_ingresso', label: 'Ora ingresso' },
      { key: 'ora_uscita',   label: 'Ora uscita' },
      { key: 'data_oggi',    label: 'Data oggi' },
    ]
  },
  {
    gruppo: '🏠 Ristorante',
    items: [
      { key: 'nome_ristorante',    label: 'Nome ristorante' },
      { key: 'telefono_ristorante',label: 'Tel. ristorante' },
      { key: 'indirizzo',          label: 'Indirizzo' },
    ]
  }
];

// ─── TRIGGER DISPONIBILI ─────────────────────────────────────────────────────
const TRIGGER_LISTA = [
  { value: '',                          label: '🚫 Solo manuale (nessun automatismo)' },
  { value: 'prenotazione_confermata',   label: '✅ Prenotazione confermata' },
  { value: 'prenotazione_annullata',    label: '❌ Prenotazione annullata' },
  { value: 'prenotazione_reminder_24h', label: '⏰ Reminder 24h prima' },
  { value: 'prenotazione_reminder_2h',  label: '⏰ Reminder 2h prima' },
  { value: 'evento_confermato',         label: '🎉 Evento confermato' },
  { value: 'preventivo_pronto',         label: '📋 Preventivo pronto' },
  { value: 'timbratura_ingresso',       label: '🟢 Timbratura ingresso' },
  { value: 'timbratura_uscita',         label: '🔴 Timbratura uscita' },
  { value: 'nuovo_documento',           label: '📄 Nuovo documento caricato' },
  { value: 'tag_assegnato',             label: '🏷️ Tag assegnato (specifica il tag)' },
  { value: 'inattivo_45giorni',         label: '😴 Cliente inattivo da 45 giorni' },
  { value: 'compleanno',                label: '🎂 Compleanno cliente' },
  { value: 'richiesta_recensione',      label: '⭐ Richiesta recensione (X giorni dopo evento)' },
];

// ─── STATI META ───────────────────────────────────────────────────────────────
const STATI = {
  APPROVED: { label: '✅ Attivo',        bg: '#dcfce7', color: '#15803d' },
  PENDING:  { label: '⏳ In attesa',     bg: '#fef3c7', color: '#92400e' },
  REJECTED: { label: '❌ Rifiutato',     bg: '#fee2e2', color: '#dc2626' },
  PAUSED:   { label: '⏸ In pausa',      bg: '#f1f5f9', color: '#64748b' },
  DISABLED: { label: '🚫 Disabilitato', bg: '#f1f5f9', color: '#64748b' },
};

const CATEGORIE = ['UTILITY', 'MARKETING', 'AUTHENTICATION'];

// ─── HELPER: converti {{nome_completo}} → {{1}} e ritorna la mappa ────────────
function convertiWildcard(testo) {
  const map = {}; // {"1": "nome_completo", "2": "data_prenotazione"}
  let idx = 1;
  const testoConvertito = testo.replace(/\{\{([a-z_]+)\}\}/g, (match, key) => {
    // Controlla se la wildcard è già stata mappata
    const esistente = Object.entries(map).find(([, v]) => v === key);
    if (esistente) return `{{${esistente[0]}}}`;
    map[String(idx)] = key;
    return `{{${idx++}}}`;
  });
  return { testoConvertito, map };
}

// ─── HELPER: inserisci testo al cursore ───────────────────────────────────────
function inserisciAlCursore(textarea, testo) {
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  const val   = textarea.value;
  textarea.value = val.substring(0, start) + testo + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + testo.length;
  textarea.focus();
  textarea.dispatchEvent(new Event('input'));
}

// ─── HELPER: anteprima con wildcard colorate ──────────────────────────────────
function anteprimaColorata(testo) {
  const colori = ['#0ea5e9','#8b5cf6','#f59e0b','#10b981','#f43f5e','#6366f1'];
  const usati = {};
  let ci = 0;
  return testo
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\{\{([a-z_0-9]+)\}\}/g, (match, key) => {
      if (!usati[key]) usati[key] = colori[ci++ % colori.length];
      return `<span style="background:${usati[key]}20;color:${usati[key]};border:1px solid ${usati[key]}40;border-radius:4px;padding:0 4px;font-size:12px;font-weight:600;">{{${key}}}</span>`;
    });
}

// ─── RENDER PRINCIPALE ────────────────────────────────────────────────────────
export async function render(container) {
  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

  const { data: connAll } = await supa()
    .from('whatsapp_connessioni')
    .select('meta_access_token, meta_waba_id, meta_phone_number_id')
    .eq('azienda_id', aziendaId)
    .eq('modalita', 'meta')
    .eq('attivo', true);

  const conn = (connAll || []).find(c => !c.sede_id) || connAll?.[0] || null;

  if (!conn?.meta_access_token) {
    container.innerHTML = `
      <div style="padding:40px;text-align:center;color:#64748b;">
        <div style="font-size:32px;margin-bottom:12px;">📱</div>
        <div>Nessuna connessione WhatsApp attiva.</div>
        <div style="font-size:13px;margin-top:8px;">Configura WhatsApp in Configurazione → Integrazioni.</div>
      </div>`;
    return;
  }

  // Carica tag definizioni e mapping dal DB
  const [{ data: tagDefs }, { data: templateMappings }] = await Promise.all([
    supa().from('contatti_tag_definizioni').select('*').eq('azienda_id', aziendaId).eq('attivo', true).order('label'),
    supa().from('whatsapp_template_mapping').select('*').eq('azienda_id', aziendaId),
  ]);

  const allTags = tagDefs || [];
  const allMappings = templateMappings || [];

  container.innerHTML = `
    <style>
      .rf-tab { display:none; }
      .rf-tab.attiva { display:block; }
      .rf-nav-btn { background:none;border:none;padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;transition:all .2s; }
      .rf-nav-btn.attiva { color:#0E5A7A;border-bottom-color:#0E5A7A; }
      .rf-nav-btn:hover { color:#0E5A7A; }
      .wc-btn { display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;color:#334155;border-radius:6px;padding:3px 8px;font-size:11px;font-family:monospace;cursor:pointer;margin:2px;transition:all .15s; }
      .wc-btn:hover { background:#0E5A7A;color:white;border-color:#0E5A7A; }
      .tag-chip { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:2px solid transparent;transition:all .15s;margin:2px; }
      .tag-chip.selected { border-color:#0f172a; }
      .tag-chip-remove { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:2px solid transparent;opacity:.6;transition:all .15s;margin:2px; }
      .tag-chip-remove.selected { opacity:1;border-color:#dc2626; }
      .input { border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:14px;outline:none;transition:border .2s;font-family:inherit; }
      .input:focus { border-color:#0E5A7A; }
      .card { background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px; }
      .sezione-label { font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;margin-top:16px; }
    </style>

    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:860px;margin:0 auto;">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:0;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:#25D366;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">💬</div>
            <div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;">Template WhatsApp</div>
              <div style="font-size:13px;color:#64748b;">Automazioni, tag e wildcard</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="btn-guida" style="background:white;color:#0E5A7A;border:1.5px solid #0E5A7A;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:14px;font-weight:600;">📖 Come funziona</button>
            <button id="btn-nuovo-template" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;">+ Nuovo template</button>
          </div>
        </div>

        <!-- Tabs -->
        <div style="display:flex;border-bottom:1px solid #e5e7eb;margin:16px 0 20px;">
          <button class="rf-nav-btn attiva" data-tab="tab-template">💬 Template</button>
          <button class="rf-nav-btn" data-tab="tab-tag">🏷️ Tag</button>
          <button class="rf-nav-btn" data-tab="tab-regole">⚡ Regole automatiche</button>
        </div>

        <!-- ═══ TAB TEMPLATE ═══════════════════════════════════════════════ -->
        <div id="tab-template" class="rf-tab attiva">

          <!-- Form nuovo template -->
          <div id="form-template" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin-bottom:20px;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">✏️ Crea nuovo template</div>

            <!-- Nome + Categoria -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:12px;">
              <div>
                <div class="sezione-label">Nome template *</div>
                <input id="tmpl-nome" class="input" placeholder="es. conferma_prenotazione" style="width:100%;box-sizing:border-box;">
                <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Solo lettere minuscole, numeri e _</div>
              </div>
              <div>
                <div class="sezione-label">Categoria *</div>
                <select id="tmpl-categoria" class="input" style="width:100%;box-sizing:border-box;">
                  ${CATEGORIE.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Wildcard buttons -->
            <div style="margin-bottom:8px;">
              <div class="sezione-label">Inserisci variabile (clicca per aggiungere nel testo)</div>
              <div id="wc-gruppi" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
                ${WILDCARD_GRUPPI.map(g => `
                  <div style="margin-bottom:8px;">
                    <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:4px;">${g.gruppo}</div>
                    <div>${g.items.map(it =>
                      `<button class="wc-btn" data-wc="${it.key}" title="${it.label}">{{${it.key}}}</button>`
                    ).join('')}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Testo -->
            <div style="margin-bottom:8px;">
              <div class="sezione-label">Testo del messaggio *</div>
              <textarea id="tmpl-testo" class="input" rows="4" placeholder="Es: Ciao {{nome_completo}}, la tua prenotazione del {{data_prenotazione}} alle {{ora_prenotazione}} è confermata!" style="width:100%;box-sizing:border-box;resize:vertical;"></textarea>
            </div>

            <!-- Anteprima -->
            <div id="tmpl-anteprima-wrap" style="margin-bottom:12px;display:none;">
              <div class="sezione-label">Anteprima</div>
              <div id="tmpl-anteprima" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.6;"></div>
              <div id="tmpl-mappa-wrap" style="margin-top:6px;font-size:11px;color:#64748b;"></div>
            </div>

            <!-- Esempi per Meta -->
            <div style="margin-bottom:16px;">
              <div class="sezione-label">Valori di esempio <span style="font-weight:400;text-transform:none;">(separati da virgola, per approvazione Meta)</span></div>
              <input id="tmpl-esempi" class="input" placeholder="Es: Mario Rossi, 15 Giugno 2026, 20:00" style="width:100%;box-sizing:border-box;">
            </div>

            <!-- ─── SEZIONE TRIGGER ─── -->
            <div style="border-top:1px solid #f1f5f9;padding-top:16px;margin-bottom:16px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px;">⚡ Trigger — quando parte il messaggio</div>
              <div style="margin-bottom:10px;">
                <div class="sezione-label">Evento scatenante</div>
                <select id="tmpl-trigger" class="input" style="width:100%;box-sizing:border-box;">
                  ${TRIGGER_LISTA.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                </select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" id="trigger-extra" style="display:none;">
                <div>
                  <div class="sezione-label">Ritardo dopo l'evento</div>
                  <select id="tmpl-delay" class="input" style="width:100%;box-sizing:border-box;">
                    <option value="0">Immediato</option>
                    <option value="30">30 minuti</option>
                    <option value="60">1 ora</option>
                    <option value="120">2 ore</option>
                    <option value="360">6 ore</option>
                    <option value="1440">1 giorno</option>
                    <option value="2880">2 giorni</option>
                    <option value="10080">1 settimana</option>
                  </select>
                </div>
                <div id="trigger-ora-wrap">
                  <div class="sezione-label">Ora di invio <span style="font-weight:400;text-transform:none;">(per reminder)</span></div>
                  <input id="tmpl-ora-invio" type="time" class="input" value="09:00" style="width:100%;box-sizing:border-box;">
                </div>
              </div>
              <div id="trigger-tag-extra" style="display:none;margin-top:10px;">
                <div class="sezione-label">Tag scatenante</div>
                <input id="tmpl-trigger-tag" class="input" placeholder="es. inattivo" style="width:100%;box-sizing:border-box;">
              </div>
              <div id="trigger-giorni-extra" style="display:none;margin-top:10px;">
                <div class="sezione-label">Giorni dopo l'evento</div>
                <input id="tmpl-trigger-giorni" type="number" min="1" max="365" value="7" class="input" placeholder="es. 7" style="width:120px;box-sizing:border-box;">
              </div>
            </div>

            <!-- ─── SEZIONE TAG FILTRI ─── -->
            <div style="border-top:1px solid #f1f5f9;padding-top:16px;margin-bottom:16px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">🏷️ Filtri tag — a chi mandare</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Senza filtri, il messaggio parte a tutti i clienti che scatenano il trigger</div>

              ${allTags.length === 0 ? `
                <div style="font-size:12px;color:#94a3b8;background:#f8fafc;border-radius:8px;padding:10px;">
                  Nessun tag definito ancora. Creane uno nel tab "Tag".
                </div>
              ` : `
                <div style="margin-bottom:10px;">
                  <div class="sezione-label">✅ Invia SOLO a chi ha questi tag <span style="font-weight:400;text-transform:none;">(vuoto = tutti)</span></div>
                  <div id="tag-includi-wrap">
                    ${allTags.map(t => `
                      <span class="tag-chip" data-tag-includi="${t.nome}" style="background:${t.colore}20;color:${t.colore};">
                        ${t.icona} ${t.label}
                      </span>
                    `).join('')}
                  </div>
                  <div style="margin-top:6px;">
                    <label style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px;cursor:pointer;">
                      <input type="radio" name="tag-logica" value="OR" checked style="accent-color:#0E5A7A;">
                      <span>OR — basta che abbia <strong>almeno uno</strong></span>
                    </label>
                    <label style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:6px;cursor:pointer;margin-top:2px;">
                      <input type="radio" name="tag-logica" value="AND" style="accent-color:#0E5A7A;">
                      <span>AND — deve avere <strong>tutti</strong> i tag selezionati</span>
                    </label>
                  </div>
                </div>

                <div>
                  <div class="sezione-label">🚫 NON inviare a chi ha questi tag</div>
                  <div id="tag-escludi-wrap">
                    ${allTags.map(t => `
                      <span class="tag-chip-remove" data-tag-escludi="${t.nome}" style="background:${t.colore}15;color:${t.colore};">
                        ${t.icona} ${t.label}
                      </span>
                    `).join('')}
                  </div>
                </div>
              `}
            </div>

            <!-- ─── PULSANTE CTA (opzionale) ─── -->
            <div style="border-top:1px solid #f1f5f9;padding-top:16px;margin-bottom:16px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">🔘 Pulsante CTA <span style="font-weight:400;font-size:12px;color:#64748b;">(consigliato per link — Meta approva più facilmente)</span></div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <input type="checkbox" id="tmpl-has-button" style="accent-color:#0E5A7A;width:16px;height:16px;">
                <label for="tmpl-has-button" style="font-size:13px;cursor:pointer;">Aggiungi pulsante al template</label>
              </div>
              <div id="tmpl-button-wrap" style="display:none;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                  <div>
                    <div class="sezione-label">Testo pulsante</div>
                    <input id="tmpl-btn-text" class="input" placeholder="Es. Crea password, Prenota ora" style="width:100%;box-sizing:border-box;" value="Visita il sito">
                  </div>
                  <div>
                    <div class="sezione-label">Tipo</div>
                    <select id="tmpl-btn-type" class="input" style="width:100%;box-sizing:border-box;">
                      <option value="URL">🔗 Visita sito web (URL)</option>
                      <option value="PHONE_NUMBER">📞 Chiama numero</option>
                    </select>
                  </div>
                </div>
                <div id="tmpl-btn-url-wrap">
                  <div class="sezione-label">URL del pulsante</div>
                  <input id="tmpl-btn-url" class="input" placeholder="https://ristoflow-ai.com/reset-password.html" style="width:100%;box-sizing:border-box;">
                </div>
                <div id="tmpl-btn-phone-wrap" style="display:none;">
                  <div class="sezione-label">Numero di telefono</div>
                  <input id="tmpl-btn-phone" class="input" placeholder="+39 333 1234567" style="width:100%;box-sizing:border-box;">
                </div>
              </div>
            </div>

            <div id="tmpl-esito" style="font-size:13px;min-height:16px;margin-bottom:12px;"></div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button id="btn-crea-template" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 24px;cursor:pointer;font-size:14px;font-weight:600;">📤 Invia a Meta</button>
              <button id="btn-annulla-form" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;">Annulla</button>
            </div>
          </div>

          <!-- Lista template -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;">I tuoi template</div>
            <button id="btn-aggiorna" style="background:#f1f5f9;border:1px solid #e5e7eb;color:#374151;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;">🔄 Aggiorna</button>
          </div>
          <div id="lista-template">
            <div style="color:#94a3b8;text-align:center;padding:20px;">Caricamento template...</div>
          </div>
        </div>

        <!-- ═══ TAB TAG ════════════════════════════════════════════════════ -->
        <div id="tab-tag" class="rf-tab">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;">🏷️ Gestione Tag</div>
              <div style="font-size:12px;color:#64748b;">I tag vengono assegnati ai clienti manualmente o in automatico dalle regole</div>
            </div>
            <button id="btn-nuovo-tag" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuovo tag</button>
          </div>

          <!-- Form nuovo tag -->
          <div id="form-tag" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
              <div>
                <div class="sezione-label">Nome (chiave) *</div>
                <input id="tag-nome" class="input" placeholder="es. vip" style="width:100%;box-sizing:border-box;">
                <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Minuscolo, no spazi</div>
              </div>
              <div>
                <div class="sezione-label">Etichetta visibile *</div>
                <input id="tag-label" class="input" placeholder="es. VIP" style="width:100%;box-sizing:border-box;">
              </div>
              <div>
                <div class="sezione-label">Icona (emoji)</div>
                <input id="tag-icona" class="input" placeholder="⭐" style="width:100%;box-sizing:border-box;">
              </div>
              <div>
                <div class="sezione-label">Colore</div>
                <input id="tag-colore" type="color" value="#0E5A7A" style="height:38px;width:100%;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;padding:2px;">
              </div>
            </div>
            <div style="margin-top:10px;">
              <div class="sezione-label">Descrizione</div>
              <input id="tag-desc" class="input" placeholder="A cosa serve questo tag..." style="width:100%;box-sizing:border-box;">
            </div>
            <div style="margin-top:10px;">
              <div class="sezione-label">Tipo</div>
              <select id="tag-fonte" class="input">
                <option value="manuale">🖐 Manuale (assegnato a mano)</option>
                <option value="automatico">⚡ Automatico (da regole)</option>
                <option value="misto">🔀 Misto</option>
              </select>
            </div>
            <div id="tag-esito" style="font-size:13px;min-height:14px;margin:10px 0;"></div>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <button id="btn-salva-tag" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;font-size:13px;font-weight:600;">💾 Salva tag</button>
              <button id="btn-annulla-tag" style="background:#f1f5f9;color:#374151;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">Annulla</button>
            </div>
          </div>

          <div id="lista-tag">
            <div style="color:#94a3b8;text-align:center;padding:20px;">Caricamento...</div>
          </div>
        </div>

        <!-- ═══ TAB REGOLE ═════════════════════════════════════════════════ -->
        <div id="tab-regole" class="rf-tab">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;">⚡ Regole automatiche</div>
              <div style="font-size:12px;color:#64748b;">Il sistema assegna/rimuove tag automaticamente in base al comportamento del cliente</div>
            </div>
            <button id="btn-nuova-regola" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuova regola</button>
          </div>

          <!-- Form nuova regola -->
          <div id="form-regola" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:10px;">
              <div>
                <div class="sezione-label">Tag da gestire *</div>
                <select id="regola-tag" class="input" style="width:100%;box-sizing:border-box;">
                  <option value="">— seleziona —</option>
                  ${allTags.map(t => `<option value="${t.nome}">${t.icona} ${t.label}</option>`).join('')}
                </select>
              </div>
              <div>
                <div class="sezione-label">Azione *</div>
                <select id="regola-azione" class="input" style="width:100%;box-sizing:border-box;">
                  <option value="assegna">✅ Assegna tag</option>
                  <option value="rimuovi">❌ Rimuovi tag</option>
                </select>
              </div>
              <div>
                <div class="sezione-label">Condizione *</div>
                <select id="regola-condizione" class="input" style="width:100%;box-sizing:border-box;">
                  <option value="visite_in_giorni">🗓 N° visite in X giorni</option>
                  <option value="inattivo_da_giorni">😴 Inattivo da X giorni</option>
                  <option value="prodotto_ordinato">🍷 Prodotto/categoria ordinato</option>
                  <option value="importo_totale">💰 Importo totale speso</option>
                  <option value="primo_accesso">👋 Prima prenotazione</option>
                  <option value="compleanno_oggi">🎂 Compleanno oggi</option>
                  <option value="n_eventi">🎉 N° eventi di un tipo</option>
                </select>
              </div>
            </div>

            <!-- Parametri condizione (dinamici) -->
            <div id="regola-params-wrap" style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:10px;">
              <!-- Riempito da JS -->
            </div>

            <div>
              <div class="sezione-label">Descrizione interna</div>
              <input id="regola-desc" class="input" placeholder="es. 3 visite in 30 giorni → VIP" style="width:100%;box-sizing:border-box;">
            </div>

            <div id="regola-esito" style="font-size:13px;min-height:14px;margin:10px 0;"></div>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <button id="btn-salva-regola" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;font-size:13px;font-weight:600;">💾 Salva regola</button>
              <button id="btn-annulla-regola" style="background:#f1f5f9;color:#374151;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">Annulla</button>
            </div>
          </div>

          <div id="lista-regole">
            <div style="color:#94a3b8;text-align:center;padding:20px;">Caricamento...</div>
          </div>
        </div>

        <!-- Modal test -->
        <div id="modal-test" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
          <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;">
            <div style="font-size:16px;font-weight:700;margin-bottom:4px;" id="modal-test-titolo">Testa template</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:16px;line-height:1.5;" id="modal-test-preview"></div>
            <div style="margin-bottom:12px;">
              <div class="sezione-label">Numero destinatario *</div>
              <input id="test-numero" class="input" placeholder="+393331234567" style="width:100%;box-sizing:border-box;">
            </div>
            <div id="test-params-wrap"></div>
            <div id="test-esito" style="font-size:13px;min-height:16px;margin-bottom:12px;"></div>
            <div style="display:flex;gap:10px;">
              <button id="btn-invia-test" style="flex:1;background:#25D366;color:white;border:none;border-radius:10px;padding:10px;cursor:pointer;font-size:14px;font-weight:600;">📤 Invia test</button>
              <button id="btn-chiudi-modal" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;">Chiudi</button>
            </div>
          </div>
        </div>


        <!-- Modal guida -->
        <div id="modal-guida" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:9999;align-items:flex-start;justify-content:center;padding:20px;box-sizing:border-box;overflow-y:auto;">
          <div style="background:white;border-radius:20px;width:100%;max-width:620px;margin:0 auto;overflow:hidden;">

            <div style="background:linear-gradient(135deg,#0E5A7A,#1a8fb5);padding:24px 28px 20px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">📖</div>
                  <div>
                    <div style="font-size:18px;font-weight:700;color:white;">Guida ai Template WhatsApp</div>
                    <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:2px;">Come creare messaggi automatici per il tuo ristorante</div>
                  </div>
                </div>
                <button id="btn-chiudi-guida" style="background:rgba(255,255,255,0.15);border:none;color:white;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">✕</button>
              </div>
            </div>

            <div style="padding:24px 28px;max-height:72vh;overflow-y:auto;">

              <div style="margin-bottom:22px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <div style="width:28px;height:28px;background:#eff6ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;">💬</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;">Cos&#39;&#232; un template?</div>
                </div>
                <div style="font-size:13px;color:#374151;line-height:1.7;background:#f8fafc;border-radius:10px;padding:14px;">
                  Un template &#232; un <strong>messaggio preimpostato</strong> che Ristoflow invia automaticamente via WhatsApp ai tuoi clienti. Lo crei una volta, lo fai approvare da Meta, e poi parte da solo nei momenti giusti.<br><br>
                  Esempio: ogni volta che confermi una prenotazione, il cliente riceve: <em style="color:#15803d;">"Ciao Mario, la tua prenotazione per sabato 14 alle 20:00 &#232; confermata! Ti aspettiamo &#128522;"</em>
                </div>
              </div>

              <div style="margin-bottom:22px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <div style="width:28px;height:28px;background:#fef3c7;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;">📂</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;">Le 3 categorie Meta</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <div style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:12px 14px;">
                    <div style="font-weight:700;font-size:13px;color:#15803d;">UTILITY &#8212; usa questa per quasi tutto &#9989;</div>
                    <div style="font-size:12px;color:#374151;margin-top:3px;line-height:1.5;">Conferme prenotazione, reminder, documenti, timbrature. Approvazione rapida (minuti/ore), gratuita.</div>
                  </div>
                  <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:12px 14px;">
                    <div style="font-weight:700;font-size:13px;color:#92400e;">MARKETING &#8212; per promozioni e campagne</div>
                    <div style="font-size:12px;color:#374151;margin-top:3px;line-height:1.5;">Offerte, inviti eventi, messaggi a clienti inattivi. Approvazione pi&#249; lenta, ha un costo per messaggio.</div>
                  </div>
                  <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;">
                    <div style="font-weight:700;font-size:13px;color:#64748b;">AUTHENTICATION &#8212; solo codici OTP, non serve per la ristorazione</div>
                  </div>
                </div>
              </div>

              <div style="margin-bottom:22px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <div style="width:28px;height:28px;background:#f0fdf4;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;">🔧</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;">Variabili: personalizza ogni messaggio</div>
                </div>
                <div style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:8px;">Clicca i bottoni colorati per inserire le variabili. Ristoflow le sostituisce con i dati reali del cliente:</div>
                <div style="background:#f8fafc;border-radius:10px;padding:14px;">
                  <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Tu scrivi</div>
                  <div style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px;font-family:monospace;font-size:12px;color:#374151;line-height:1.6;">Ciao <span style="background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:4px;">{{nome_completo}}</span>, prenotazione del <span style="background:#d1fae5;color:#065f46;padding:1px 5px;border-radius:4px;">{{data_prenotazione}}</span> alle <span style="background:#fef9c3;color:#713f12;padding:1px 5px;border-radius:4px;">{{ora_prenotazione}}</span> confermata!</div>
                  <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin:10px 0 6px;">Il cliente riceve</div>
                  <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:8px;padding:10px;font-size:12px;color:#15803d;line-height:1.6;">Ciao <strong>Mario Rossi</strong>, prenotazione del <strong>sabato 14 giugno</strong> alle <strong>20:00</strong> confermata!</div>
                </div>
                <div style="margin-top:8px;font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;line-height:1.5;">
                  &#9888;&#65039; Meta richiede {{1}}, {{2}}... non i nomi. <strong>Ristoflow converte tutto automaticamente</strong> &#8212; tu scrivi i nomi leggibili, il sistema fa il resto.
                </div>
              </div>

              <div style="margin-bottom:22px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <div style="width:28px;height:28px;background:#fce7f3;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;">&#9889;</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;">Trigger: quando parte il messaggio</div>
                </div>
                <div style="font-size:13px;color:#374151;margin-bottom:10px;line-height:1.5;">Ogni template pu&#242; partire automaticamente quando accade qualcosa, oppure restare manuale.</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;"><div style="font-weight:600;color:#0f172a;">&#9989; Prenotazione confermata</div><div style="color:#64748b;margin-top:1px;">Parte subito quando confermi</div></div>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;"><div style="font-weight:600;color:#0f172a;">&#9200; Reminder 24h prima</div><div style="color:#64748b;margin-top:1px;">Promemoria il giorno prima</div></div>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;"><div style="font-weight:600;color:#0f172a;">&#128564; Cliente inattivo 45gg</div><div style="color:#64748b;margin-top:1px;">Messaggio riattivazione</div></div>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;"><div style="font-weight:600;color:#0f172a;">&#127874; Compleanno</div><div style="color:#64748b;margin-top:1px;">Auguri automatici</div></div>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;"><div style="font-weight:600;color:#0f172a;">&#11088; Richiesta recensione</div><div style="color:#64748b;margin-top:1px;">X giorni dopo l&#39;evento</div></div>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;"><div style="font-weight:600;color:#0f172a;">&#128683; Solo manuale</div><div style="color:#64748b;margin-top:1px;">Lo invii tu quando vuoi</div></div>
                </div>
              </div>

              <div style="margin-bottom:22px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <div style="width:28px;height:28px;background:#f3e8ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;">&#127991;&#65039;</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;">Tag e LTV: invia al cliente giusto</div>
                </div>
                <div style="font-size:13px;color:#374151;margin-bottom:10px;line-height:1.5;">Filtra chi riceve ogni messaggio in base ai tag e al livello fidelti (LTV):</div>
                <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;">
                  <div style="background:#f0fdf4;border-radius:8px;padding:10px 12px;display:flex;gap:10px;align-items:flex-start;"><span>&#128142;</span><div><strong>Offerta esclusiva:</strong> solo ai clienti con tag <code style="background:white;padding:1px 4px;border-radius:3px;">vip</code></div></div>
                  <div style="background:#eff6ff;border-radius:8px;padding:10px 12px;display:flex;gap:10px;align-items:flex-start;"><span>&#127863;</span><div><strong>Serata degustazione:</strong> solo a chi ha tag <code style="background:white;padding:1px 4px;border-radius:3px;">wine_lover</code></div></div>
                  <div style="background:#fef3c7;border-radius:8px;padding:10px 12px;display:flex;gap:10px;align-items:flex-start;"><span>&#128564;</span><div><strong>Riattivazione:</strong> tag <code style="background:white;padding:1px 4px;border-radius:3px;">inattivo</code>, escludi sempre <code style="background:white;padding:1px 4px;border-radius:3px;">blacklist</code></div></div>
                </div>
              </div>

              <div style="margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <div style="width:28px;height:28px;background:#fef3c7;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;">&#9203;</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;">Dopo aver inviato a Meta</div>
                </div>
                <div style="font-size:13px;color:#374151;line-height:1.7;background:#f8fafc;border-radius:10px;padding:14px;">
                  Il template va in revisione. <strong>UTILITY</strong>: approvato in minuti/ore. <strong>MARKETING</strong>: fino a 24h.<br><br>
                  Finch&#232; &#232; <span style="background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;">&#9203; In attesa</span> non puoi inviarlo &#8212; clicca "Aggiorna" per controllare.<br><br>
                  Se &#232; <span style="background:#fee2e2;color:#dc2626;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;">&#10060; Rifiutato</span>: tono troppo commerciale in UTILITY, o URL non approvato. Eliminalo e ricrealo con testo pi&#249; neutro.<br><br>
                  &#128161; <strong>Inizia con questi 3:</strong> <em>conferma prenotazione</em> + <em>reminder 24h</em> + <em>richiesta recensione</em>. Coprono il 90% dei casi.
                </div>
              </div>

            </div>

            <div style="padding:16px 28px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;">
              <button id="btn-chiudi-guida-bottom" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 24px;cursor:pointer;font-size:14px;font-weight:600;">
                Ho capito, iniziamo &#128640;
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `;

  // ─── STATE ─────────────────────────────────────────────────────────────────
  let templateAttivo = null;
  let tagIncludi = new Set();
  let tagEscludi = new Set();

  // ─── TABS ──────────────────────────────────────────────────────────────────
  container.querySelectorAll('.rf-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.rf-nav-btn').forEach(b => b.classList.remove('attiva'));
      container.querySelectorAll('.rf-tab').forEach(t => t.classList.remove('attiva'));
      btn.classList.add('attiva');
      container.querySelector(`#${btn.dataset.tab}`).classList.add('attiva');
    });
  });

  // ─── WILDCARD BUTTONS ─────────────────────────────────────────────────────
  container.querySelectorAll('.wc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const textarea = container.querySelector('#tmpl-testo');
      inserisciAlCursore(textarea, `{{${btn.dataset.wc}}}`);
      aggiornaAnteprima();
    });
  });

  // ─── ANTEPRIMA LIVE ───────────────────────────────────────────────────────
  function aggiornaAnteprima() {
    const testo = container.querySelector('#tmpl-testo').value.trim();
    const wrap = container.querySelector('#tmpl-anteprima-wrap');
    const el   = container.querySelector('#tmpl-anteprima');
    const mapWrap = container.querySelector('#tmpl-mappa-wrap');

    if (!testo) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    el.innerHTML = anteprimaColorata(testo);

    const { map } = convertiWildcard(testo);
    const entries = Object.entries(map);
    if (entries.length > 0) {
      mapWrap.innerHTML = '🔄 Conversione Meta: ' + entries.map(([n, k]) =>
        `<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:11px;">{{${k}}} → {{${n}}}</code>`
      ).join(' ');
    } else {
      mapWrap.innerHTML = '';
    }
  }

  container.querySelector('#tmpl-testo').addEventListener('input', aggiornaAnteprima);

  // ─── TRIGGER EXTRA FIELDS ─────────────────────────────────────────────────
  container.querySelector('#tmpl-trigger').addEventListener('change', function() {
    const v = this.value;
    const extra = container.querySelector('#trigger-extra');
    const tagExtra = container.querySelector('#trigger-tag-extra');
    const giorniExtra = container.querySelector('#trigger-giorni-extra');
    const oraWrap = container.querySelector('#trigger-ora-wrap');

    extra.style.display = v && v !== '' ? 'grid' : 'none';
    tagExtra.style.display = v === 'tag_assegnato' ? '' : 'none';
    giorniExtra.style.display = v === 'richiesta_recensione' ? '' : 'none';
    oraWrap.style.display = ['prenotazione_reminder_24h','prenotazione_reminder_2h','richiesta_recensione','compleanno','inattivo_45giorni'].includes(v) ? '' : 'none';
  });

  // ─── TAG INCLUDI/ESCLUDI ──────────────────────────────────────────────────
  container.querySelectorAll('[data-tag-includi]').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tagIncludi;
      if (tagIncludi.has(tag)) { tagIncludi.delete(tag); chip.classList.remove('selected'); }
      else { tagIncludi.add(tag); chip.classList.add('selected'); }
    });
  });

  container.querySelectorAll('[data-tag-escludi]').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tagEscludi;
      if (tagEscludi.has(tag)) { tagEscludi.delete(tag); chip.classList.remove('selected'); }
      else { tagEscludi.add(tag); chip.classList.add('selected'); }
    });
  });

  // ─── PARAMETRI REGOLA (dinamici) ─────────────────────────────────────────
  function aggiornaCampiRegola() {
    const tipo = container.querySelector('#regola-condizione').value;
    const wrap = container.querySelector('#regola-params-wrap');
    const TMPL = {
      visite_in_giorni: `
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <label style="font-size:13px;color:#374151;">Almeno</label>
          <input id="rp-visite" type="number" min="1" value="3" class="input" style="width:70px;">
          <label style="font-size:13px;color:#374151;">visite negli ultimi</label>
          <input id="rp-giorni" type="number" min="1" value="30" class="input" style="width:70px;">
          <label style="font-size:13px;color:#374151;">giorni</label>
        </div>`,
      inattivo_da_giorni: `
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <label style="font-size:13px;color:#374151;">Non viene da almeno</label>
          <input id="rp-giorni" type="number" min="1" value="45" class="input" style="width:70px;">
          <label style="font-size:13px;color:#374151;">giorni</label>
        </div>`,
      prodotto_ordinato: `
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <label style="font-size:13px;color:#374151;">Categoria/prodotto</label>
          <input id="rp-categoria" class="input" placeholder="es. bollicine" style="width:160px;">
        </div>`,
      importo_totale: `
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <label style="font-size:13px;color:#374151;">Spesa minima €</label>
          <input id="rp-importo" type="number" min="1" value="500" class="input" style="width:90px;">
          <label style="font-size:13px;color:#374151;">negli ultimi</label>
          <input id="rp-giorni" type="number" min="1" value="90" class="input" style="width:70px;">
          <label style="font-size:13px;color:#374151;">giorni</label>
        </div>`,
      primo_accesso: `<div style="font-size:13px;color:#64748b;font-style:italic;">Nessun parametro — si attiva alla prima prenotazione del cliente</div>`,
      compleanno_oggi: `<div style="font-size:13px;color:#64748b;font-style:italic;">Nessun parametro — si attiva nel giorno del compleanno</div>`,
      n_eventi: `
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <label style="font-size:13px;color:#374151;">Almeno</label>
          <input id="rp-n" type="number" min="1" value="1" class="input" style="width:70px;">
          <label style="font-size:13px;color:#374151;">eventi di tipo</label>
          <input id="rp-tipo" class="input" placeholder="es. matrimonio" style="width:140px;">
        </div>`,
    };
    wrap.innerHTML = TMPL[tipo] || '';
  }

  container.querySelector('#regola-condizione').addEventListener('change', aggiornaCampiRegola);
  aggiornaCampiRegola();

  function leggiParamsRegola() {
    const tipo = container.querySelector('#regola-condizione').value;
    const v = (id) => container.querySelector(`#${id}`)?.value;
    const vi = (id) => parseInt(v(id)) || 0;
    switch(tipo) {
      case 'visite_in_giorni':    return { visite: vi('rp-visite'), giorni: vi('rp-giorni') };
      case 'inattivo_da_giorni':  return { giorni: vi('rp-giorni') };
      case 'prodotto_ordinato':   return { categoria: v('rp-categoria') };
      case 'importo_totale':      return { importo_min: vi('rp-importo'), periodo: vi('rp-giorni') };
      case 'primo_accesso':       return {};
      case 'compleanno_oggi':     return {};
      case 'n_eventi':            return { n: vi('rp-n'), tipo: v('rp-tipo') };
      default: return {};
    }
  }

  // ─── CARICA TEMPLATE DA META ──────────────────────────────────────────────
  async function caricaTemplate() {
    const el = container.querySelector('#lista-template');
    el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">Caricamento...</div>';

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-get-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ azienda_id: aziendaId })
      });
      const data = await res.json();
      const templates = data.templates || [];

      if (!templates.length) {
        el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">Nessun template trovato.</div>';
        return;
      }

      el.innerHTML = templates.map(t => {
        const s = STATI[t.status] || { label: t.status, bg: '#f1f5f9', color: '#64748b' };
        const testo = t.components?.find(c => c.type === 'BODY')?.text || '';
        const nVars = (testo.match(/\{\{(\d+)\}\}/g) || []).length;
        const mapping = allMappings.find(m => m.template_name === t.name);

        // Badge trigger
        const triggerInfo = mapping?.trigger_evento
          ? TRIGGER_LISTA.find(tl => tl.value === mapping.trigger_evento)
          : null;
        const triggerBadge = triggerInfo
          ? `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">${triggerInfo.label}</span>`
          : `<span style="background:#f1f5f9;color:#94a3b8;padding:2px 8px;border-radius:20px;font-size:11px;">Solo manuale</span>`;

        // Tag richiesti
        let tagBadges = '';
        if (mapping?.tag_richiesti?.length > 0) {
          tagBadges = mapping.tag_richiesti.map(tg => {
            const def = allTags.find(d => d.nome === tg);
            return `<span style="background:${def?.colore || '#64748b'}20;color:${def?.colore || '#64748b'};padding:2px 7px;border-radius:10px;font-size:11px;">${def?.icona || '🏷️'} ${def?.label || tg}</span>`;
          }).join('');
          tagBadges = `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;"><span style="font-size:11px;color:#64748b;">Solo a:</span>${tagBadges}</div>`;
        }

        return `
          <div class="card">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                  <span style="font-weight:700;font-size:14px;font-family:monospace;">${t.name}</span>
                  <span style="background:${s.bg};color:${s.color};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;">${s.label}</span>
                  <span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:20px;font-size:11px;">${t.category}</span>
                  ${nVars > 0 ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:20px;font-size:11px;">${nVars} var</span>` : ''}
                </div>
                <div style="font-size:13px;color:#374151;line-height:1.5;">${testo}</div>
                <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                  ${triggerBadge}
                </div>
                ${tagBadges}
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;">
                ${t.status === 'APPROVED' ? `
                  <button class="btn-test" data-test="${t.name}" data-testo="${encodeURIComponent(testo)}" data-vars="${nVars}"
                    style="background:#dcfce7;color:#15803d;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;">
                    📤 Testa
                  </button>` : ''}
                <button class="btn-del" data-del="${t.name}"
                  style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;">
                  🗑
                </button>
              </div>
            </div>
          </div>`;
      }).join('');

      el.querySelectorAll('.btn-test').forEach(btn => {
        btn.addEventListener('click', () => {
          templateAttivo = { name: btn.dataset.test, testo: decodeURIComponent(btn.dataset.testo), nVars: parseInt(btn.dataset.vars) };
          apriModalTest();
        });
      });

      el.querySelectorAll('.btn-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm(`Eliminare il template "${btn.dataset.del}"?`)) return;
          await eliminaTemplate(btn.dataset.del);
          await caricaTemplate();
        });
      });

    } catch(e) {
      el.innerHTML = `<div style="color:#dc2626;text-align:center;padding:20px;">Errore: ${e.message}</div>`;
    }
  }

  // ─── CARICA TAG ───────────────────────────────────────────────────────────
  async function caricaTag() {
    const el = container.querySelector('#lista-tag');
    const { data, error } = await supa().from('contatti_tag_definizioni').select('*').eq('azienda_id', aziendaId).order('label');
    if (error || !data?.length) {
      el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">Nessun tag definito ancora.</div>';
      return;
    }
    el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:10px;">` +
      data.map(t => `
        <div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 16px;min-width:220px;flex:1;">
          <div style="width:36px;height:36px;background:${t.colore}20;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${t.icona}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:14px;color:#0f172a;">${t.label}</div>
            <div style="font-family:monospace;font-size:11px;color:#94a3b8;">{{${t.nome}}}</div>
            ${t.descrizione ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${t.descrizione}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
            <span style="background:${t.colore}20;color:${t.colore};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${t.fonte}</span>
            <button data-del-tag="${t.id}" style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;">🗑</button>
          </div>
        </div>
      `).join('') + `</div>`;

    el.querySelectorAll('[data-del-tag]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questo tag?')) return;
        await supa().from('contatti_tag_definizioni').delete().eq('id', btn.dataset.delTag);
        await caricaTag();
      });
    });
  }

  // ─── CARICA REGOLE ────────────────────────────────────────────────────────
  async function caricaRegole() {
    const el = container.querySelector('#lista-regole');
    const { data } = await supa().from('tag_regole_automatiche').select('*').eq('azienda_id', aziendaId).order('priorita');
    if (!data?.length) {
      el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">Nessuna regola automatica. Creane una!</div>';
      return;
    }
    el.innerHTML = data.map(r => {
      const tagDef = allTags.find(t => t.nome === r.tag_nome);
      const azioneColor = r.azione === 'assegna' ? '#15803d' : '#dc2626';
      const azioneBg = r.azione === 'assegna' ? '#dcfce7' : '#fee2e2';
      const azioneLabel = r.azione === 'assegna' ? '✅ Assegna' : '❌ Rimuovi';
      return `
        <div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span style="background:${azioneBg};color:${azioneColor};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${azioneLabel}</span>
          <span style="background:${tagDef?.colore || '#64748b'}20;color:${tagDef?.colore || '#64748b'};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">${tagDef?.icona || '🏷️'} ${tagDef?.label || r.tag_nome}</span>
          <span style="font-size:13px;color:#374151;flex:1;">quando: <strong>${r.condizione_tipo.replace(/_/g,' ')}</strong> — ${JSON.stringify(r.condizione_valore)}</span>
          ${r.descrizione ? `<span style="font-size:12px;color:#94a3b8;">${r.descrizione}</span>` : ''}
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
              <input type="checkbox" ${r.attiva ? 'checked' : ''} data-toggle-regola="${r.id}" style="accent-color:#0E5A7A;">
              <span style="font-size:12px;color:#64748b;">Attiva</span>
            </label>
            <button data-del-regola="${r.id}" style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;">🗑</button>
          </div>
        </div>`;
    }).join('');

    el.querySelectorAll('[data-toggle-regola]').forEach(cb => {
      cb.addEventListener('change', async () => {
        await supa().from('tag_regole_automatiche').update({ attiva: cb.checked }).eq('id', cb.dataset.toggleRegola);
      });
    });
    el.querySelectorAll('[data-del-regola]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questa regola?')) return;
        await supa().from('tag_regole_automatiche').delete().eq('id', btn.dataset.delRegola);
        await caricaRegole();
      });
    });
  }

  // ─── MODAL TEST ───────────────────────────────────────────────────────────
  function apriModalTest() {
    const modal = container.querySelector('#modal-test');
    container.querySelector('#modal-test-titolo').textContent = `Testa: ${templateAttivo.name}`;
    container.querySelector('#modal-test-preview').innerHTML = anteprimaColorata(templateAttivo.testo);

    const wrap = container.querySelector('#test-params-wrap');
    wrap.innerHTML = '';
    for (let i = 1; i <= templateAttivo.nVars; i++) {
      wrap.innerHTML += `
        <div style="margin-bottom:10px;">
          <div class="sezione-label">Variabile {{${i}}}</div>
          <input id="test-var-${i}" class="input" placeholder="Valore per {{${i}}}" style="width:100%;box-sizing:border-box;">
        </div>`;
    }

    container.querySelector('#test-esito').textContent = '';
    modal.style.display = 'flex';
  }

  async function eliminaTemplate(nome) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-get-templates`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ azienda_id: aziendaId, template_name: nome })
    });
    return res.json();
  }

  // ─── EVENT LISTENERS PRINCIPALI ──────────────────────────────────────────
  container.querySelector('#btn-nuovo-template').addEventListener('click', () => {
    const form = container.querySelector('#form-template');
    form.style.display = form.style.display === 'none' ? '' : 'none';
  });

  container.querySelector('#btn-annulla-form').addEventListener('click', () => {
    container.querySelector('#form-template').style.display = 'none';
  });

  container.querySelector('#btn-aggiorna').addEventListener('click', caricaTemplate);

  container.querySelector('#btn-chiudi-modal').addEventListener('click', () => {
    container.querySelector('#modal-test').style.display = 'none';
  });

  // ─── MODAL GUIDA ──────────────────────────────────────────────────────────
  const modalGuida  = container.querySelector('#modal-guida');
  const apriGuida   = () => { modalGuida.style.display = 'flex'; };
  const chiudiGuida = () => { modalGuida.style.display = 'none'; };
  container.querySelector('#btn-guida').addEventListener('click', apriGuida);
  container.querySelector('#btn-chiudi-guida').addEventListener('click', chiudiGuida);
  container.querySelector('#btn-chiudi-guida-bottom').addEventListener('click', chiudiGuida);
  modalGuida.addEventListener('click', e => { if (e.target === modalGuida) chiudiGuida(); });

  // Nuovo tag
  container.querySelector('#btn-nuovo-tag').addEventListener('click', () => {
    const f = container.querySelector('#form-tag');
    f.style.display = f.style.display === 'none' ? '' : 'none';
  });
  container.querySelector('#btn-annulla-tag').addEventListener('click', () => {
    container.querySelector('#form-tag').style.display = 'none';
  });

  // Nuova regola
  container.querySelector('#btn-nuova-regola').addEventListener('click', () => {
    const f = container.querySelector('#form-regola');
    f.style.display = f.style.display === 'none' ? '' : 'none';
  });
  container.querySelector('#btn-annulla-regola').addEventListener('click', () => {
    container.querySelector('#form-regola').style.display = 'none';
  });

  // ─── SALVA TAG ────────────────────────────────────────────────────────────
  container.querySelector('#btn-salva-tag').addEventListener('click', async () => {
    const esito = container.querySelector('#tag-esito');
    const nome = container.querySelector('#tag-nome').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const label = container.querySelector('#tag-label').value.trim();
    if (!nome || !label) { esito.textContent = '❌ Nome e label obbligatori'; esito.style.color = '#dc2626'; return; }

    esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
    const { error } = await supa().from('contatti_tag_definizioni').insert({
      azienda_id: aziendaId,
      nome,
      label,
      icona: container.querySelector('#tag-icona').value || '🏷️',
      colore: container.querySelector('#tag-colore').value,
      descrizione: container.querySelector('#tag-desc').value,
      fonte: container.querySelector('#tag-fonte').value,
    });

    if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }
    esito.textContent = '✅ Tag salvato!'; esito.style.color = '#16a34a';
    container.querySelector('#form-tag').style.display = 'none';
    await caricaTag();
  });

  // ─── SALVA REGOLA ─────────────────────────────────────────────────────────
  container.querySelector('#btn-salva-regola').addEventListener('click', async () => {
    const esito = container.querySelector('#regola-esito');
    const tag = container.querySelector('#regola-tag').value;
    const azione = container.querySelector('#regola-azione').value;
    const condizione = container.querySelector('#regola-condizione').value;
    if (!tag) { esito.textContent = '❌ Seleziona un tag'; esito.style.color = '#dc2626'; return; }

    const params = leggiParamsRegola();
    esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';

    const { error } = await supa().from('tag_regole_automatiche').insert({
      azienda_id: aziendaId,
      tag_nome: tag,
      azione,
      condizione_tipo: condizione,
      condizione_valore: params,
      descrizione: container.querySelector('#regola-desc').value,
    });

    if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }
    esito.textContent = '✅ Regola salvata!'; esito.style.color = '#16a34a';
    container.querySelector('#form-regola').style.display = 'none';
    await caricaRegole();
  });

  // ─── CREA TEMPLATE ────────────────────────────────────────────────────────
  // ── Pulsante CTA binding ──
  container.querySelector('#tmpl-has-button')?.addEventListener('change', (e) => {
    container.querySelector('#tmpl-button-wrap').style.display = e.target.checked ? '' : 'none';
  });
  container.querySelector('#tmpl-btn-type')?.addEventListener('change', (e) => {
    container.querySelector('#tmpl-btn-url-wrap').style.display = e.target.value === 'URL' ? '' : 'none';
    container.querySelector('#tmpl-btn-phone-wrap').style.display = e.target.value === 'PHONE_NUMBER' ? '' : 'none';
  });

  container.querySelector('#btn-crea-template').addEventListener('click', async () => {
    const esito = container.querySelector('#tmpl-esito');
    const nome = container.querySelector('#tmpl-nome').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const categoria = container.querySelector('#tmpl-categoria').value;
    const testoOriginale = container.querySelector('#tmpl-testo').value.trim();
    const esempiRaw = container.querySelector('#tmpl-esempi').value.trim();
    const triggerEvento = container.querySelector('#tmpl-trigger').value;
    const triggerDelay = parseInt(container.querySelector('#tmpl-delay')?.value || '0');
    const triggerOra = container.querySelector('#tmpl-ora-invio')?.value || null;

    if (!nome || !testoOriginale) {
      esito.textContent = '❌ Nome e testo obbligatori';
      esito.style.color = '#dc2626';
      return;
    }

    // Converti wildcard → {{1}}, {{2}}...
    const { testoConvertito, map } = convertiWildcard(testoOriginale);
    // Conta le variabili nel testo convertito
    const nVarConvertite = Object.keys(map).length;

    let esempi;
    if (esempiRaw) {
      esempi = esempiRaw.split(',').map(s => s.trim());
      // Padding: se esempi < variabili, aggiunge placeholder
      while (esempi.length < nVarConvertite) esempi.push('esempio');
    } else {
      // Genera esempi automatici uno per variabile
      esempi = Object.values(map).map(k => {
        const defaults = {
          nome: 'Mario', cognome: 'Rossi', nome_completo: 'Mario Rossi',
          telefono: '+393331234567', data_prenotazione: '15 Giugno 2026',
          ora_prenotazione: '20:00', num_persone: '4', nome_sala: 'Sala Principale',
          numero_tavolo: '5', data_evento: '20 Luglio 2026', tipo_evento: 'Matrimonio',
          nome_evento: 'Evento Rossi', importo: '1500', ora_ingresso: '08:30',
          ora_uscita: '17:30', data_oggi: new Date().toLocaleDateString('it-IT'),
          nome_ristorante: 'Campo Antico', telefono_ristorante: '+390123456789',
          indirizzo: 'Via Roma 1',
        };
        return defaults[k] || k;
      });
      if (esempi.length === 0) esempi = ['esempio'];
    }

    // Validazione: esempi devono corrispondere alle variabili
    if (nVarConvertite > 0 && esempi.length < nVarConvertite) {
      esito.textContent = `❌ Hai ${nVarConvertite} variabili ma solo ${esempi.length} esempi. Aggiungili nel campo "Valori di esempio".`;
      esito.style.color = '#dc2626';
      return;
    }

    esito.textContent = 'Invio a Meta...'; esito.style.color = '#64748b';

    // 1. Invia a Meta
    const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-create-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      // Costruisci payload con eventuale pulsante CTA
      const hasButton = container.querySelector('#tmpl-has-button')?.checked;
      const btnType = container.querySelector('#tmpl-btn-type')?.value;
      const btnText = container.querySelector('#tmpl-btn-text')?.value.trim();
      const btnUrl = container.querySelector('#tmpl-btn-url')?.value.trim();
      const btnPhone = container.querySelector('#tmpl-btn-phone')?.value.trim();

      const buttons = hasButton && btnText ? [{
        type: btnType || 'URL',
        text: btnText,
        ...(btnType === 'URL' ? { url: btnUrl || 'https://ristoflow-ai.com' } : {}),
        ...(btnType === 'PHONE_NUMBER' ? { phone_number: btnPhone || '' } : {}),
      }] : [];

      body: JSON.stringify({
        azienda_id: aziendaId,
        single: { name: nome, category: categoria, text: testoConvertito, example: esempi, buttons }
      })
    });

    const data = await res.json();
    if (!data.success) {
      const dettaglio = data.error || 'Errore Meta';
      console.error('[Template] Errore Meta:', data);
      esito.innerHTML = `❌ ${dettaglio}<br><span style="font-size:11px;color:#94a3b8;">Controlla la console per i dettagli completi</span>`;
      esito.style.color = '#dc2626';
      return;
    }

    // 2. Salva mapping nel DB
    const { error: dbErr } = await supa().from('whatsapp_template_mapping').upsert({
      azienda_id: aziendaId,
      template_name: nome,
      wildcard_map: map,
      testo_originale: testoOriginale,
      trigger_evento: triggerEvento || null,
      trigger_delay_minuti: triggerDelay,
      trigger_ora_invio: triggerOra,
      tag_richiesti: Array.from(tagIncludi),
      tag_esclusi: Array.from(tagEscludi),
      tag_logica: container.querySelector('[name="tag-logica"]:checked')?.value || 'OR',
      attivo: true,
    }, { onConflict: 'azienda_id,template_name' });

    if (dbErr) {
      esito.textContent = '✅ Inviato a Meta, ma errore salvataggio DB: ' + dbErr.message;
      esito.style.color = '#f59e0b';
    } else {
      esito.textContent = '✅ Template inviato a Meta e configurazione salvata!';
      esito.style.color = '#16a34a';
    }

    // Reset form
    container.querySelector('#tmpl-nome').value = '';
    container.querySelector('#tmpl-testo').value = '';
    container.querySelector('#tmpl-esempi').value = '';
    container.querySelector('#tmpl-anteprima-wrap').style.display = 'none';
    tagIncludi.clear(); tagEscludi.clear();
    container.querySelectorAll('.tag-chip, .tag-chip-remove').forEach(c => c.classList.remove('selected'));

    setTimeout(() => caricaTemplate(), 2000);
  });

  // ─── INVIA TEST ───────────────────────────────────────────────────────────
  container.querySelector('#btn-invia-test').addEventListener('click', async () => {
    const esito = container.querySelector('#test-esito');
    const numero = container.querySelector('#test-numero').value.trim();
    if (!numero) { esito.textContent = '❌ Numero obbligatorio'; esito.style.color = '#dc2626'; return; }

    const params = [];
    for (let i = 1; i <= templateAttivo.nVars; i++) {
      params.push(container.querySelector(`#test-var-${i}`)?.value.trim() || `var${i}`);
    }

    esito.textContent = 'Invio...'; esito.style.color = '#64748b';

    const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send-ts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        azienda_id: aziendaId,
        numero_dest: numero,
        template_name: templateAttivo.name,
        template_params: params.length > 0 ? params : undefined,
        contesto: 'test'
      })
    });

    const data = await res.json();
    if (data.success) { esito.textContent = '✅ Messaggio inviato!'; esito.style.color = '#16a34a'; }
    else { esito.textContent = '❌ ' + (data.error || 'Errore'); esito.style.color = '#dc2626'; }
  });

  // ─── INIT ─────────────────────────────────────────────────────────────────
  await Promise.all([caricaTemplate(), caricaTag(), caricaRegole()]);
}
