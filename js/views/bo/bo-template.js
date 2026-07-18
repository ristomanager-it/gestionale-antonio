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
      { key: 'link_gestione',     label: 'Link gestione prenotazione' },
    ]
  },
  {
    gruppo: '🎂 Compleanno',
    items: [
      { key: 'data_compleanno',  label: 'Data compleanno (gg/mm)' },
      { key: 'link_compleanno',  label: 'Link prenotazione compleanno' },
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

// ─── MOMENTI (catalogo in linguaggio semplice per lo staff) ──────────────────
const MOMENTI = [
  { key:'prenotazione_creata',       ic:'🆕', tit:'Nuova prenotazione',    cosa:'Messaggio appena una prenotazione viene salvata.',       quando:'Appena salvi la prenotazione. (già attivo)',  cat:'Prenotazioni' },
  { key:'prenotazione_confermata',   ic:'✅', tit:'Prenotazione confermata', cosa:'Conferma al cliente che il tavolo è prenotato.',        quando:'Appena confermi la prenotazione.',            cat:'Prenotazioni' },
  { key:'prenotazione_annullata',    ic:'❌', tit:'Prenotazione annullata',  cosa:'Avvisa il cliente che la prenotazione è annullata.',    quando:'Appena annulli la prenotazione.',             cat:'Prenotazioni' },
  { key:'prenotazione_reminder_24h', ic:'⏰', tit:'Promemoria 24 ore prima',  cosa:'Ricorda al cliente che ha prenotato.',                  quando:'24 ore prima dell\u2019orario.',              cat:'Prenotazioni' },
  { key:'prenotazione_reminder_2h',  ic:'⏰', tit:'Promemoria 2 ore prima',   cosa:'Ultimo promemoria prima dell\u2019arrivo.',             quando:'2 ore prima dell\u2019orario.',               cat:'Prenotazioni' },
  { key:'evento_confermato',         ic:'🎉', tit:'Evento confermato',        cosa:'Conferma un evento o ricevimento prenotato.',           quando:'Appena confermi l\u2019evento.',              cat:'Eventi' },
  { key:'preventivo_pronto',         ic:'📋', tit:'Preventivo pronto',        cosa:'Avvisa il cliente che il preventivo è pronto.',         quando:'Quando salvi o invii il preventivo.',         cat:'Eventi' },
  { key:'compleanno',                ic:'🎂', tit:'Compleanno cliente',       cosa:'Fai gli auguri, magari con un\u2019offerta.',           quando:'Il giorno del compleanno.',                   cat:'Fidelizzazione' },
  { key:'richiesta_recensione',      ic:'⭐', tit:'Richiesta recensione',     cosa:'Chiedi una recensione dopo la visita.',                 quando:'Qualche giorno dopo l\u2019evento o la visita.', cat:'Fidelizzazione' },
  { key:'inattivo_45giorni',         ic:'😴', tit:'Cliente che non torna',    cosa:'Riporta indietro chi non viene da un po\u2019.',        quando:'45 giorni dopo l\u2019ultima visita.',        cat:'Fidelizzazione' },
  { key:'tag_assegnato',             ic:'🏷️', tit:'Etichetta assegnata',     cosa:'Messaggio quando metti un\u2019etichetta a un cliente (es. VIP).', quando:'Appena assegni l\u2019etichetta.',  cat:'Fidelizzazione' },
  { key:'timbratura_ingresso',       ic:'🟢', tit:'Entrata dipendente',       cosa:'Notifica quando un dipendente timbra l\u2019entrata.',   quando:'Alla timbratura di ingresso.',                cat:'Personale' },
  { key:'timbratura_uscita',         ic:'🔴', tit:'Uscita dipendente',        cosa:'Notifica quando un dipendente timbra l\u2019uscita.',    quando:'Alla timbratura di uscita.',                  cat:'Personale' },
  { key:'nuovo_documento',           ic:'📄', tit:'Nuovo documento',          cosa:'Avvisa che è stato caricato un documento.',             quando:'Al caricamento di un documento.',             cat:'Personale' },
];
const MOMENTI_CAT = ['Prenotazioni', 'Eventi', 'Fidelizzazione', 'Personale'];

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
  const waConnesso = !!conn?.meta_access_token;

  // Carica tag definizioni, mapping WhatsApp e template email dal DB
  const [{ data: tagDefs }, { data: templateMappings }, { data: emailTemplates }] = await Promise.all([
    supa().from('contatti_tag_definizioni').select('*').eq('azienda_id', aziendaId).eq('attivo', true).order('label'),
    supa().from('whatsapp_template_mapping').select('*').eq('azienda_id', aziendaId),
    supa().from('messaggi_template').select('*').eq('azienda_id', aziendaId).eq('tipo', 'email').order('created_at', { ascending: false }),
  ]);

  const allTags = tagDefs || [];
  const allMappings = templateMappings || [];
  let allEmail = emailTemplates || [];

  // Meta Ads (campagne self-service) + sedi per momento/campagne
  const [{ data: metaConnRow }, { data: metaCampRows }, { data: sediRows }] = await Promise.all([
    supa().from('meta_ads_connessioni').select('ad_account_id, ad_account_nome, page_nome, token_scadenza, attivo').eq('azienda_id', aziendaId).maybeSingle(),
    supa().from('meta_ads_campagne').select('*').eq('azienda_id', aziendaId).order('created_at', { ascending: false }).limit(10),
    supa().from('sedi').select('id, nome, citta').eq('azienda_id', aziendaId).order('nome'),
  ]);
  const metaConn = metaConnRow || null;
  const metaCamps = metaCampRows || [];
  const sediList = sediRows || [];

  const momentiHtml = MOMENTI_CAT.map(cat => {
    const items = MOMENTI.filter(m => m.cat === cat);
    return `
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin:0 0 10px;">${cat}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
          ${items.map(m => {
            const attached = allMappings.some(x => x.trigger_evento === m.key);
            const active   = allMappings.some(x => x.trigger_evento === m.key && x.trigger_attivo);
            const pill = active
              ? '<span style="background:#dcfce7;color:#15803d;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600;">✅ Messaggio attivo</span>'
              : (attached
                ? '<span style="background:#fef3c7;color:#92400e;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600;">⏸ Messaggio in pausa</span>'
                : '<span style="background:#f1f5f9;color:#64748b;border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600;">⚪ Nessun messaggio</span>');
            return `
            <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:22px;">${m.ic}</span>
                <span style="font-size:15px;font-weight:700;color:#0f172a;">${m.tit}</span>
              </div>
              <div style="font-size:13px;color:#475569;line-height:1.5;">${m.cosa}</div>
              <div style="font-size:12px;color:#94a3b8;">🕒 ${m.quando}</div>
              <div>${pill}</div>
              <button class="momento-btn" data-momento="${m.key}" style="margin-top:4px;background:#0E5A7A;color:white;border:none;border-radius:9px;padding:9px 14px;cursor:pointer;font-size:13px;font-weight:600;">${attached ? '✏️ Modifica messaggio' : '✏️ Scrivi messaggio'}</button>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');

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
          <button class="rf-nav-btn attiva" data-tab="tab-momenti">📅 Momenti</button>
          <button class="rf-nav-btn" data-tab="tab-email">✉️ Messaggi</button>
          <button class="rf-nav-btn" data-tab="tab-template">💬 Template</button>
          <button class="rf-nav-btn" data-tab="tab-tag">🏷️ Tag</button>
          <button class="rf-nav-btn" data-tab="tab-regole">⚡ Regole automatiche</button>
          <button class="rf-nav-btn" data-tab="tab-metaads">📣 Meta Ads</button>
        </div>

        <!-- ═══ TAB MOMENTI ══════════════════════════════════════════════════ -->
        <div id="tab-momenti" class="rf-tab attiva">
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:18px;font-size:13px;color:#475569;line-height:1.6;">
            Qui trovi <b>tutti i momenti</b> in cui il gestionale può mandare un messaggio, al cliente o al personale.
            Per ognuno vedi <b>cosa fa</b> e <b>quando parte</b>. Premi <b>Scrivi messaggio</b> per decidere cosa dire.
          </div>
          ${momentiHtml}
        </div>

        <!-- ═══ TAB META ADS ═════════════════════════════════════════════════ -->
        <div id="tab-metaads" class="rf-tab">
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:#475569;line-height:1.6;">
            Collega il tuo account pubblicitario Meta <b>una sola volta</b>: da quel momento Tony può creare le campagne per te (es. <b>🎂 Compleanni</b>: intercetta chi compie gli anni nei prossimi 20/30 giorni vicino al tuo locale). Le campagne nascono <b>in pausa</b>: le attivi tu quando vuoi.
          </div>

          <div style="margin-bottom:16px;font-size:13px;">
            ${metaConn && metaConn.attivo
              ? `<div style="color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;">✅ Meta collegato — <b>${metaConn.ad_account_nome || metaConn.ad_account_id}</b>${metaConn.page_nome ? ` · ${metaConn.page_nome}` : ''}</div>`
              : `<div style="color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;">⚠️ Meta non collegato — vai in <a href="#bo-configurazione?tab=integrazioni" style="color:#0E5A7A;font-weight:600;">Configurazione → Integrazioni</a> e premi "Collega Meta".</div>`}
          </div>

          <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">🎂 Campagna Compleanni</div>
            <div style="font-size:13px;color:#64748b;margin-bottom:14px;">Pubblico: chi compie gli anni il mese prossimo, vicino al locale. Annuncio con foto dalla tua libreria e bottone che porta al form "la torta è il nostro regalo".</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:12px;">
              <div><div class="sezione-label">Sede</div>
                <select id="meta-sede" class="input" style="width:100%;box-sizing:border-box;">
                  ${sediList.map(s => `<option value="${s.id}" data-citta="${s.citta || ''}">${s.nome}</option>`).join('')}
                </select></div>
              <div><div class="sezione-label">Città (targeting)</div><input id="meta-citta" class="input" style="width:100%;box-sizing:border-box;" placeholder="es. Orte"></div>
              <div><div class="sezione-label">Raggio km</div><input id="meta-raggio" class="input" type="number" value="30" min="5" max="80" style="width:100%;box-sizing:border-box;"></div>
              <div><div class="sezione-label">Budget €/giorno</div><input id="meta-budget" class="input" type="number" value="10" min="1" style="width:100%;box-sizing:border-box;"></div>
            </div>
            <button id="btn-meta-crea" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;">🎂 Crea campagna (in pausa)</button>
            <div id="meta-esito" style="margin-top:12px;font-size:13px;"></div>
          </div>

          <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:10px;">📋 Campagne create da Ristoflow</div>
            ${metaCamps.length === 0 ? '<div style="font-size:13px;color:#94a3b8;">Nessuna campagna ancora.</div>' : metaCamps.map(cp => `
              <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9;padding:8px 0;font-size:13px;">
                <div>🎂 <b>${cp.tipo}</b> · ${(cp.dettagli && cp.dettagli.citta) || ''} · €${(cp.budget_giornaliero_cent || 0) / 100}/gg · ${new Date(cp.created_at).toLocaleDateString('it-IT')}</div>
                <span style="color:${cp.stato === 'ACTIVE' ? '#16a34a' : '#b45309'};font-weight:600;">${cp.stato}</span>
              </div>`).join('')}
          </div>
        </div>

        <!-- ═══ TAB EMAIL ══════════════════════════════════════════════════ -->
        <div id="tab-email" class="rf-tab">
          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:#475569;line-height:1.6;">
            Scrivi <b>una volta</b> il messaggio del momento. Scegli se mandarlo come <b>Email</b>, <b>WhatsApp</b> o entrambi, e a chi (filtri per tag). L'email parte subito; il WhatsApp viene mandato in approvazione a Meta.
          </div>
          <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
            <button id="btn-nuova-email" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600;">+ Nuovo messaggio</button>
          </div>

          <div id="form-email" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin-bottom:20px;">
            <input type="hidden" id="email-id">
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">✏️ Messaggio del momento</div>

            <div style="margin-bottom:12px;">
              <div class="sezione-label">In quale momento parte?</div>
              <select id="email-momento" class="input" style="width:100%;box-sizing:border-box;">
                <option value="">— Scegli un momento —</option>
                ${MOMENTI.map(m => `<option value="${m.key}">${m.ic} ${m.tit}</option>`).join('')}
              </select>
            </div>

            <div style="margin-bottom:12px;">
              <div class="sezione-label">Per quale sede parla? <span style="color:#94a3b8;font-weight:400;">(nome nel messaggio e link prenotazione)</span></div>
              <select id="email-sede" class="input" style="width:100%;box-sizing:border-box;">
                <option value="">— Tutta l'azienda —</option>
                ${sediList.map(s => `<option value="${s.id}">${s.nome}</option>`).join('')}
              </select>
            </div>

            <div style="margin-bottom:12px;">
              <div class="sezione-label">Come lo mando?</div>
              <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center;">
                <label style="display:flex;align-items:center;gap:6px;font-size:14px;color:#0f172a;cursor:pointer;">
                  <input type="checkbox" id="canale-email" checked> 📧 Email
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:14px;color:${waConnesso ? '#0f172a' : '#94a3b8'};cursor:${waConnesso ? 'pointer' : 'not-allowed'};">
                  <input type="checkbox" id="canale-whatsapp" ${waConnesso ? '' : 'disabled'}> 💬 WhatsApp ${waConnesso ? '' : '(collega WhatsApp per usarlo)'}
                </label>
              </div>
              <div id="wa-nota" style="display:none;font-size:12px;color:#92400e;background:#fef3c7;border-radius:8px;padding:8px 10px;margin-top:8px;">
                Il WhatsApp viene mandato in approvazione a Meta e diventa attivo appena approvato (di solito pochi minuti).
              </div>
              <label id="wa-bottone-wrap" style="display:none;align-items:center;gap:6px;font-size:13px;color:#374151;cursor:pointer;margin-top:8px;">
                <input type="checkbox" id="wa-bottone-link" checked> Su WhatsApp il link diventa un <b style="margin:0 3px;">bottone</b> "Gestisci prenotazione" <span style="color:#94a3b8;">(consigliato: Meta rifiuta i link scritti nel testo)</span>
              </label>
            </div>

            <div style="margin-bottom:12px;">
              <div class="sezione-label">Oggetto <span style="font-weight:400;text-transform:none;">(solo email)</span> *</div>
              <input id="email-oggetto" class="input" placeholder="Es: La tua prenotazione è confermata" style="width:100%;box-sizing:border-box;">
            </div>

            <div style="margin-bottom:8px;">
              <div class="sezione-label">Inserisci un dato (clicca per aggiungerlo nel testo)</div>
              <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px;">
                ${WILDCARD_GRUPPI.map(g => `
                  <div style="margin-bottom:8px;">
                    <div style="font-size:11px;color:#94a3b8;font-weight:600;margin-bottom:4px;">${g.gruppo}</div>
                    <div>${g.items.map(it => `<button class="wc-btn-email" data-wc="${it.key}" title="{{${it.key}}}">${it.label}</button>`).join('')}</div>
                  </div>`).join('')}
              </div>
            </div>

            <div style="margin-bottom:12px;">
              <div class="sezione-label">Testo dell'email *</div>
              <textarea id="email-testo" class="input" rows="6" placeholder="Ciao {{nome_completo}}, ..." style="width:100%;box-sizing:border-box;resize:vertical;"></textarea>
            </div>

            <div id="email-anteprima-wrap" style="margin-bottom:12px;display:none;">
              <div class="sezione-label">Anteprima</div>
              <div id="email-anteprima" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.6;"></div>
            </div>

            <div style="margin-bottom:16px;">
              <div class="sezione-label">A chi lo mando? <span style="font-weight:400;text-transform:none;">(filtri per tag, facoltativi)</span></div>
              ${allTags.length ? `
                <div style="font-size:12px;color:#64748b;margin:4px 0;">Solo clienti con questi tag:</div>
                <div>${allTags.map(t => `<span class="tag-chip" data-email-includi="${t.nome}" style="background:${t.colore}20;color:${t.colore};">${t.icona || '🏷️'} ${t.label}</span>`).join('')}</div>
                <div style="font-size:12px;color:#64748b;margin:8px 0 4px;">Escludi chi ha questi tag:</div>
                <div>${allTags.map(t => `<span class="tag-chip-remove" data-email-escludi="${t.nome}" style="background:${t.colore}15;color:${t.colore};">${t.icona || '🏷️'} ${t.label}</span>`).join('')}</div>
              ` : `<div style="font-size:12px;color:#94a3b8;">Nessun tag definito: senza filtri il messaggio vale per tutti.</div>`}
            </div>

            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#374151;cursor:pointer;margin-bottom:16px;">
              <input type="checkbox" id="email-attivo" checked> Attiva (parte in automatico nel momento scelto)
            </label>

            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button id="btn-salva-email" style="background:#16a34a;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;">Salva</button>
              <button id="btn-annulla-email" style="background:#f1f5f9;color:#475569;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;">Annulla</button>
            </div>

            <div style="border-top:1px solid #f1f5f9;margin-top:16px;padding-top:14px;">
              <div class="sezione-label">Invia un'email di prova (salva prima)</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <input id="email-test-dest" class="input" placeholder="tua@email.it" style="flex:1;min-width:180px;box-sizing:border-box;">
                <button id="btn-email-test" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">Invia prova</button>
              </div>
              <div id="email-test-esito" style="font-size:12px;margin-top:6px;"></div>
            </div>

            <div id="email-feedback" style="margin-top:8px;"></div>
          </div>

          <div id="email-lista"></div>
        </div>

        <!-- ═══ TAB TEMPLATE ═══════════════════════════════════════════════ -->
        <div id="tab-template" class="rf-tab">

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

            <!-- ─── PULSANTE CTA ─── -->
            <div style="border-top:1px solid #f1f5f9;padding-top:16px;margin-bottom:16px;">
              <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:4px;">🔘 Pulsante CTA <span style="font-weight:400;font-size:12px;color:#64748b;">(consigliato per link)</span></div>
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
                      <option value="URL">🔗 Visita sito web</option>
                      <option value="PHONE_NUMBER">📞 Chiama numero</option>
                    </select>
                  </div>
                </div>
                <div id="tmpl-btn-url-wrap">
                  <div class="sezione-label">URL pulsante</div>
                  <input id="tmpl-btn-url" class="input" placeholder="https://app.ristoflow-ai.com/reset-password.html" style="width:100%;box-sizing:border-box;">
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
  // ── Meta Ads: precompila citta dalla sede + creazione campagna
  const metaSedeSel = container.querySelector('#meta-sede');
  const metaCitta = container.querySelector('#meta-citta');
  if (metaSedeSel && metaCitta) {
    const syncCitta = () => { const o = metaSedeSel.selectedOptions[0]; if (o && o.dataset.citta && !metaCitta.value) metaCitta.value = o.dataset.citta; };
    syncCitta();
    metaSedeSel.addEventListener('change', () => { const o = metaSedeSel.selectedOptions[0]; metaCitta.value = (o && o.dataset.citta) || metaCitta.value; });
  }
  const btnMetaCrea = container.querySelector('#btn-meta-crea');
  if (btnMetaCrea) btnMetaCrea.addEventListener('click', async () => {
    const esito = container.querySelector('#meta-esito');
    const cittaV = (metaCitta?.value || '').trim();
    if (!cittaV) { esito.innerHTML = '<span style="color:#dc2626;">Indica la città per il targeting.</span>'; return; }
    if (!confirm('Tony creerà la campagna Compleanni su Meta IN PAUSA (nessuna spesa finché non la attivi). Procedo?')) return;
    esito.innerHTML = '<span style="color:#64748b;">⏳ Creazione in corso (30-60 secondi)...</span>';
    btnMetaCrea.disabled = true;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tony-meta-campagne`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
        body: JSON.stringify({
          azienda_id: aziendaId,
          sede_id: metaSedeSel?.value || null,
          tipo: 'compleanni',
          citta: cittaV,
          raggio_km: Number(container.querySelector('#meta-raggio')?.value) || 30,
          budget_cent: Math.round((Number(container.querySelector('#meta-budget')?.value) || 10) * 100),
        }),
      });
      const j = await res.json();
      if (j.success) {
        esito.innerHTML = `<div style="color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 12px;">
          ✅ Campagna creata <b>in pausa</b> · Filtro compleanno: ${j.filtro_compleanno} ·
          <a href="${j.ads_manager}" target="_blank" style="color:#0E5A7A;font-weight:600;">Aprila in Gestione inserzioni</a> per controllarla e attivarla.</div>`;
      } else {
        esito.innerHTML = `<span style="color:#dc2626;">Errore: ${j.error?.message || j.error || 'creazione non riuscita'}${j.codice === 'NON_COLLEGATO' ? ' — usa prima il bottone Collega Meta qui sopra.' : ''}</span>`;
      }
    } catch (err) {
      esito.innerHTML = `<span style="color:#dc2626;">Errore di rete: ${err.message}</span>`;
    }
    btnMetaCrea.disabled = false;
  });

  container.querySelectorAll('.rf-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.rf-nav-btn').forEach(b => b.classList.remove('attiva'));
      container.querySelectorAll('.rf-tab').forEach(t => t.classList.remove('attiva'));
      btn.classList.add('attiva');
      container.querySelector(`#${btn.dataset.tab}`).classList.add('attiva');
    });
  });

  // ─── MOMENTI → apri l'editor unificato col momento preimpostato ───────────
  container.querySelectorAll('.momento-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.momento;
      const esistente = allEmail.find(x => x.trigger_evento === key);
      container.querySelectorAll('.rf-nav-btn').forEach(b => b.classList.remove('attiva'));
      container.querySelectorAll('.rf-tab').forEach(t => t.classList.remove('attiva'));
      const navE = container.querySelector('.rf-nav-btn[data-tab="tab-email"]');
      if (navE) navE.classList.add('attiva');
      const panE = container.querySelector('#tab-email');
      if (panE) panE.classList.add('attiva');
      apriFormEmail(esistente || null, key);
    });
  });

  // ─── EMAIL (messaggi_template tipo=email) ─────────────────────────────────
  const momentoLabel = (k) => {
    const m = MOMENTI.find(x => x.key === k);
    return m ? (m.ic + ' ' + m.tit) : '✋ Solo manuale';
  };

  function caricaEmail() {
    const el = container.querySelector('#email-lista');
    if (!allEmail.length) {
      el.innerHTML = `<div style="color:#94a3b8;padding:12px;">Nessuna email ancora. Premi "+ Nuova email" per crearne una.</div>`;
      return;
    }
    el.innerHTML = allEmail.map(e => `
      <div class="card" style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;margin-bottom:8px;${e.attivo ? '' : 'opacity:.55;'}">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;color:#0f172a;">${e.oggetto || e.nome || '(senza oggetto)'}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">${momentoLabel(e.trigger_evento)}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:4px;white-space:pre-wrap;">${(e.contenuto || '').slice(0,120)}${(e.contenuto||'').length>120?'…':''}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
          <span style="background:${e.attivo ? '#dcfce7' : '#f1f5f9'};color:${e.attivo ? '#15803d' : '#64748b'};padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;text-align:center;">${e.attivo ? 'Attiva' : 'In pausa'}</span>
          <button class="email-edit" data-id="${e.id}" style="background:#e0f2fe;color:#0369a1;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;">Modifica</button>
          <button class="email-del" data-id="${e.id}" style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;">Elimina</button>
        </div>
      </div>`).join('');

    el.querySelectorAll('.email-edit').forEach(b => b.addEventListener('click', () => {
      const e = allEmail.find(x => String(x.id) === String(b.dataset.id));
      if (e) apriFormEmail(e);
    }));
    el.querySelectorAll('.email-del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Eliminare questa email?')) return;
      await supa().from('messaggi_template').delete().eq('id', b.dataset.id);
      allEmail = allEmail.filter(x => String(x.id) !== String(b.dataset.id));
      caricaEmail();
    }));
  }

  function aggiornaAnteprimaEmail() {
    const wrap = container.querySelector('#email-anteprima-wrap');
    const box = container.querySelector('#email-anteprima');
    const testo = container.querySelector('#email-testo').value;
    if (!testo.trim()) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    box.innerHTML = anteprimaColorata(testo).replace(/\n/g, '<br>');
  }

  function apriFormEmail(e = null, presetMomento = null) {
    const form = container.querySelector('#form-email');
    form.style.display = 'block';
    container.querySelector('#email-id').value = e?.id || '';
    container.querySelector('#email-momento').value = e?.trigger_evento || presetMomento || '';
    const sedSel = container.querySelector('#email-sede'); if (sedSel) sedSel.value = e?.sede_id || '';
    container.querySelector('#email-oggetto').value = e?.oggetto || '';
    container.querySelector('#email-testo').value = e?.contenuto || '';
    container.querySelector('#email-attivo').checked = e ? !!e.attivo : true;
    container.querySelector('#canale-email').checked = e ? !!e.invia_email : true;
    const waC = container.querySelector('#canale-whatsapp');
    if (waC && !waC.disabled) waC.checked = e ? !!e.invia_whatsapp : false;
    const waNota = container.querySelector('#wa-nota');
    if (waNota) waNota.style.display = (waC && waC.checked) ? 'block' : 'none';
    const waBtnWrap = container.querySelector('#wa-bottone-wrap');
    if (waBtnWrap) waBtnWrap.style.display = (waC && waC.checked) ? 'flex' : 'none';
    const waBtn = container.querySelector('#wa-bottone-link');
    if (waBtn) waBtn.checked = false;
    // filtri tag
    emailTagIncludi.clear(); emailTagEscludi.clear();
    (e?.tag_richiesti || []).forEach(t => emailTagIncludi.add(t));
    (e?.tag_esclusi || []).forEach(t => emailTagEscludi.add(t));
    container.querySelectorAll('[data-email-includi]').forEach(c => c.classList.toggle('selected', emailTagIncludi.has(c.dataset.emailIncludi)));
    container.querySelectorAll('[data-email-escludi]').forEach(c => c.classList.toggle('selected', emailTagEscludi.has(c.dataset.emailEscludi)));
    container.querySelector('#email-feedback').innerHTML = '';
    container.querySelector('#email-test-esito').innerHTML = '';
    aggiornaAnteprimaEmail();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const emailTagIncludi = new Set();
  const emailTagEscludi = new Set();
  container.querySelectorAll('[data-email-includi]').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.emailIncludi;
      if (emailTagIncludi.has(tag)) { emailTagIncludi.delete(tag); chip.classList.remove('selected'); }
      else { emailTagIncludi.add(tag); chip.classList.add('selected'); }
    });
  });
  container.querySelectorAll('[data-email-escludi]').forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.emailEscludi;
      if (emailTagEscludi.has(tag)) { emailTagEscludi.delete(tag); chip.classList.remove('selected'); }
      else { emailTagEscludi.add(tag); chip.classList.add('selected'); }
    });
  });
  const _waCheck = container.querySelector('#canale-whatsapp');
  if (_waCheck) _waCheck.addEventListener('change', () => {
    const n = container.querySelector('#wa-nota');
    if (n) n.style.display = _waCheck.checked ? 'block' : 'none';
    const b = container.querySelector('#wa-bottone-wrap');
    if (b) b.style.display = _waCheck.checked ? 'flex' : 'none';
  });

  container.querySelector('#btn-nuova-email').addEventListener('click', () => apriFormEmail());
  container.querySelector('#btn-annulla-email').addEventListener('click', () => {
    container.querySelector('#form-email').style.display = 'none';
  });
  container.querySelector('#email-testo').addEventListener('input', aggiornaAnteprimaEmail);
  container.querySelectorAll('.wc-btn-email').forEach(btn => {
    btn.addEventListener('click', () => {
      inserisciAlCursore(container.querySelector('#email-testo'), `{{${btn.dataset.wc}}}`);
      aggiornaAnteprimaEmail();
    });
  });

  const WA_ESEMPI = { nome:'Mario', cognome:'Rossi', nome_completo:'Mario Rossi', telefono:'+393331234567', data_prenotazione:'15 Giugno 2026', ora_prenotazione:'20:00', num_persone:'4', nome_sala:'Sala Principale', numero_tavolo:'5', data_evento:'20 Luglio 2026', tipo_evento:'Matrimonio', nome_evento:'Evento Rossi', importo:'1500', ora_ingresso:'08:30', ora_uscita:'17:30', data_oggi: new Date().toLocaleDateString('it-IT'), nome_ristorante:'Ristorante', telefono_ristorante:'+390123456789', indirizzo:'Via Roma 1', link_gestione:'https://app.ristoflow-ai.com/prenotazione.html?t=abc123', data_compleanno:'28/07', giorni_al_compleanno:'10', link_compleanno:'https://app.ristoflow-ai.com/prenotazione-compleanno.html?a=esempio' };

  container.querySelector('#btn-salva-email').addEventListener('click', async () => {
    const fb = container.querySelector('#email-feedback');
    const id = container.querySelector('#email-id').value;
    const oggetto = container.querySelector('#email-oggetto').value.trim();
    const contenuto = container.querySelector('#email-testo').value.trim();
    const trigger = container.querySelector('#email-momento').value;
    const attivo = container.querySelector('#email-attivo').checked;
    const cEmail = container.querySelector('#canale-email').checked;
    const waC = container.querySelector('#canale-whatsapp');
    const cWa = !!(waC && waC.checked && !waC.disabled);

    if (!cEmail && !cWa) { fb.innerHTML = '<span style="color:#dc2626;">Scegli almeno un canale (Email o WhatsApp).</span>'; return; }
    if (cEmail && !oggetto) { fb.innerHTML = '<span style="color:#dc2626;">Per l\'email serve l\'oggetto.</span>'; return; }
    if (!contenuto) { fb.innerHTML = '<span style="color:#dc2626;">Scrivi il testo.</span>'; return; }

    fb.innerHTML = '<span style="color:#64748b;">Salvataggio...</span>';
    const tagInc = Array.from(emailTagIncludi);
    const tagEsc = Array.from(emailTagEscludi);

    // 1) Record master (messaggi_template)
    const payload = {
      azienda_id: aziendaId,
      nome: (oggetto || contenuto).slice(0, 80),
      tipo: 'email',
      oggetto: oggetto || null,
      contenuto,
      trigger_evento: trigger || null,
      timing_tipo: 'subito',
      attivo,
      invia_email: cEmail,
      invia_whatsapp: cWa,
      tag_richiesti: tagInc,
      tag_esclusi: tagEsc,
      tag_logica: 'AND',
      sede_id: (container.querySelector('#email-sede')?.value || null),
    };
    let saved, error;
    if (id) ({ data: saved, error } = await supa().from('messaggi_template').update(payload).eq('id', id).select().single());
    else    ({ data: saved, error } = await supa().from('messaggi_template').insert(payload).select().single());
    if (error) { fb.innerHTML = `<span style="color:#dc2626;">Errore: ${error.message}</span>`; return; }

    // 2) WhatsApp: genera template Meta + mapping
    let waMsg = '';
    if (cWa) {
      try {
        // Meta rifiuta i link "nudi" nel testo: se c'è {{link_gestione}} o {{link_compleanno}}
        // usiamo SEMPRE il bottone, anche senza spunta, cosi il template passa l'approvazione.
        const haLinkGestione  = contenuto.includes('{{link_gestione}}');
        const haLinkCompleanno = contenuto.includes('{{link_compleanno}}');
        const conBottone = (!!container.querySelector('#wa-bottone-link')?.checked) || haLinkGestione || haLinkCompleanno;
        let testoWa = contenuto;
        let buttons = [];
        if (conBottone) {
          // il link diventa bottone: tolgo i segnaposto link dal testo (e ripulisco righe vuote)
          testoWa = contenuto
            .replace(/\{\{link_gestione\}\}/g, '')
            .replace(/\{\{link_compleanno\}\}/g, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          if (haLinkCompleanno) {
            // URL statico: contiene gia' l'azienda, nessun parametro dinamico richiesto
            const urlCompleanno = window.location.origin + '/prenotazione-compleanno.html?a=' + aziendaId;
            buttons = [{ type: 'URL', text: 'Prenota ora 🎂', url: urlCompleanno }];
          } else {
            const base = window.location.origin + '/prenotazione.html?t=';
            buttons = [{ type: 'URL', text: 'Gestisci prenotazione', url: base + '{{1}}', example: base + 'abc123token' }];
          }
        }
        // --- Conformità Meta: niente campi attaccati, il testo non deve iniziare/finire con un campo ---
        testoWa = testoWa.replace(/(\}\})([ \t]*\n[ \t]*|[ \t]+)(\{\{)/g, (_m, a, ws, b) => a + (ws.includes('\n') ? '\n' : ' ') + '· ' + b);
        if (/^\s*\{\{/.test(testoWa)) testoWa = 'Ciao ' + testoWa.replace(/^\s+/, '');
        if (/\}\}\s*$/.test(testoWa)) testoWa = testoWa.replace(/\s+$/, '') + '\nA presto! 🙏';

        const { testoConvertito, map } = convertiWildcard(testoWa);
        const esempi = Object.values(map).map(k => WA_ESEMPI[k] || 'esempio');
        const waName = ('msg_' + (trigger || 'manuale') + '_' + Date.now().toString(36)).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 60);
        const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-create-templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
          body: JSON.stringify({ azienda_id: aziendaId, single: { name: waName, category: 'UTILITY', text: testoConvertito, example: esempi.length ? esempi : ['esempio'], buttons } })
        });
        const wd = await res.json();
        if (wd.success) {
          await supa().from('whatsapp_template_mapping').insert({
            azienda_id: aziendaId, template_name: waName, wildcard_map: map, testo_originale: contenuto,
            trigger_evento: trigger || null, trigger_delay_minuti: 0, trigger_attivo: attivo,
            tag_richiesti: tagInc, tag_esclusi: tagEsc, tag_logica: 'AND', attivo: true,
          });
          await supa().from('messaggi_template').update({ wa_template_name: waName }).eq('id', saved.id);
          saved.wa_template_name = waName;
          waMsg = ' · 💬 WhatsApp inviato a Meta per approvazione';
        } else {
          waMsg = ' · ⚠️ WhatsApp non inviato: ' + (wd.error || 'errore Meta');
        }
      } catch (e) { waMsg = ' · ⚠️ WhatsApp: ' + e.message; }
    }

    allEmail = allEmail.filter(x => String(x.id) !== String(saved.id));
    allEmail.unshift(saved);
    container.querySelector('#email-id').value = saved.id;
    fb.innerHTML = `<span style="color:#16a34a;">Salvato${waMsg}</span>`;
    caricaEmail();
  });

  container.querySelector('#btn-email-test').addEventListener('click', async () => {
    const esito = container.querySelector('#email-test-esito');
    const id = container.querySelector('#email-id').value;
    const dest = container.querySelector('#email-test-dest').value.trim();
    if (!id) { esito.style.color = '#dc2626'; esito.textContent = 'Salva prima l\'email, poi invia la prova.'; return; }
    if (!dest) { esito.style.color = '#dc2626'; esito.textContent = 'Inserisci un indirizzo email.'; return; }
    esito.style.color = '#64748b'; esito.textContent = 'Invio in corso...';
    // dati ristorante dalla SEDE attiva (non dall'azienda)
    let sede = { nome: window.state?.sedeAttiva?.nome || '', telefono: '', indirizzo: '', citta: '' };
    const sedeId = window.state?.sedeAttiva?.id;
    if (sedeId) {
      try {
        const { data: s } = await supa().from('sedi').select('nome,telefono,indirizzo,citta').eq('id', sedeId).maybeSingle();
        if (s) sede = s;
      } catch (e) { /* uso i default */ }
    }
    const mitt = sede.nome || window.state?.azienda?.nome || 'Ristoflow';
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/invia-email-momento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
        body: JSON.stringify({
          azienda_id: aziendaId,
          template_id: id,
          destinatario: dest,
          mittente_nome: mitt,
          dati: {
            nome: 'Mario', cognome: 'Rossi', nome_completo: 'Mario Rossi',
            data_prenotazione: '15 giugno', ora_prenotazione: '20:30', num_persone: '4',
            nome_ristorante: sede.nome || '', telefono_ristorante: sede.telefono || '',
            indirizzo: sede.indirizzo || '', citta: sede.citta || '',
            link_gestione: window.location.origin + '/prenotazione.html?t=ESEMPIO123'
          }
        })
      });
      const j = await res.json();
      if (j.success && j.inviate > 0) { esito.style.color = '#16a34a'; esito.textContent = '✅ Email di prova inviata a ' + dest; }
      else { esito.style.color = '#dc2626'; esito.textContent = '❌ ' + (j.errori?.[0] || j.error || j.note || 'Invio non riuscito'); }
    } catch (err) {
      esito.style.color = '#dc2626'; esito.textContent = '❌ ' + err.message;
    }
  });

  caricaEmail();

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
    if (!waConnesso) {
      el.innerHTML = `
        <div style="padding:30px;text-align:center;color:#64748b;">
          <div style="font-size:28px;margin-bottom:10px;">📱</div>
          <div>WhatsApp non è ancora collegato.</div>
          <div style="font-size:13px;margin-top:6px;">Puoi comunque usare le <b>Email</b> qui accanto. Per i messaggi WhatsApp, collega WhatsApp in Configurazione → Integrazioni.</div>
        </div>`;
      return;
    }
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
      body: (() => {
        const hasBtn = container.querySelector('#tmpl-has-button')?.checked;
        const btnType = container.querySelector('#tmpl-btn-type')?.value || 'URL';
        const btnText = container.querySelector('#tmpl-btn-text')?.value?.trim() || '';
        const btnUrl = container.querySelector('#tmpl-btn-url')?.value?.trim() || '';
        const btnPhone = container.querySelector('#tmpl-btn-phone')?.value?.trim() || '';
        const buttons = hasBtn && btnText ? [{
          type: btnType,
          text: btnText,
          ...(btnType === 'URL' ? { url: btnUrl || 'https://app.ristoflow-ai.com' } : {}),
          ...(btnType === 'PHONE_NUMBER' ? { phone_number: btnPhone } : {}),
        }] : [];
        return JSON.stringify({
          azienda_id: aziendaId,
          single: { name: nome, category: categoria, text: testoConvertito, example: esempi, buttons }
        });
      })()
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
