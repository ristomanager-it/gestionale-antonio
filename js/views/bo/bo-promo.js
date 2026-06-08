// js/views/bo/bo-promo.js

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function mostraToast(msg, tipo='success') { if(window.mostraToast) window.mostraToast(msg,tipo); }

const TIPI_PROMO = [
  { v:'sconto_perc', l:'Sconto %',  icon:'%' },
  { v:'sconto_euro', l:'Sconto €',  icon:'€' },
  { v:'omaggio',     l:'Omaggio',   icon:'🎁' },
  { v:'2x1',         l:'2x1',       icon:'2×1' },
];

const BLOCK_TYPES  = ['immagine','testo','box_offerta','valutazioni','form','cta_button'];
const BLOCK_LABELS = ['🖼 Immagine','📝 Testo','🎁 Box offerta','⭐ Valutazioni','📋 Form','🔘 CTA Button'];

const GIORNI_NOMI = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
const TURNI_LIST  = [{ v:'pranzo', l:'🌞 Pranzo' },{ v:'cena', l:'🌙 Cena' }];

const FONT_LIST = [
  { v:'system',      l:'System (default)' },
  { v:'Georgia',     l:'Georgia (serif)' },
  { v:'Playfair Display', l:'Playfair Display' },
  { v:'Montserrat',  l:'Montserrat' },
  { v:'Lato',        l:'Lato' },
  { v:'Raleway',     l:'Raleway' },
  { v:'Merriweather',l:'Merriweather' },
];

const STILE_DEFAULT = {
  font: 'system',
  font_size_base: 14,
  colore_primario: '#0E5A7A',
  colore_sfondo: '#ffffff',
  colore_testo: '#1e293b',
  colore_bottone: '#0E5A7A',
  colore_testo_bottone: '#ffffff',
  border_radius: 12,
};

const PROMO_BENVENUTO_TEMPLATE = {
  nome: '🍽 2x1 sul nostro piatto forte',
  tipo: '2x1',
  valore: null,
  codice: 'BENVENUTO2X1',
  descrizione: 'Porta un amico e il secondo piatto forte è offerto da noi. La nostra offerta di benvenuto più generosa.',
  validita_giorni: 30,
  privacy_richiesta: true,
  consenso_marketing: true,
  referral_attivo: true,
  messaggio_wa: `Ciao {{nome}}! 🍽\n\nTi regaliamo il nostro piatto forte in 2x1.\nVieni con chi vuoi — il secondo lo offriamo noi.\n\nValido 30 giorni • Codice: {{codice}}\n👉 Scarica qui: {{link_promo}}`,
  messaggio_reminder: `Ciao {{nome}}! ⏰\nLa tua promo 2x1 scade il {{scadenza}}.\nNon perdere il piatto forte gratis!\n👉 {{link_promo}}`,
  messaggio_scadenza: `Ciao {{nome}}, la tua promo 2x1 è scaduta 😔\nMa hai ancora la possibilità di tornare — ti aspettiamo con qualcosa di speciale.`,
  regolamento: `Promozione valida per i nuovi clienti. Acquistando un piatto forte dal menu, il secondo è offerto gratuitamente. Non cumulabile con altre offerte. Il locale si riserva il diritto di modificare o revocare la promozione.`,
  landing_config: {
    blocks: [
      { tipo:'immagine',    label:'🖼 Immagine',    contenuto:'' },
      { tipo:'testo',       label:'📝 Testo',        contenuto:'Benvenuto nella nostra famiglia! Ti aspettavamo.' },
      { tipo:'box_offerta', label:'🎁 Box offerta',  contenuto:'' },
      { tipo:'form',        label:'📋 Form',         contenuto:'' },
      { tipo:'cta_button',  label:'🔘 CTA Button',   contenuto:'Voglio il mio 2x1!' },
    ]
  },
  thankyou_config: {
    blocks: [
      { tipo:'testo',      label:'📝 Testo',       contenuto:'🎉 Perfetto! La tua promo è confermata.' },
      { tipo:'box_offerta',label:'🎁 Box offerta', contenuto:'' },
      { tipo:'cta_button', label:'🔘 CTA Button',  contenuto:'Prenota il tuo tavolo' },
    ]
  },
  stile: { ...STILE_DEFAULT },
  giorni_disponibili: null,
  turni: null,
  attiva: true,
};

export async function renderPromo(container, aziendaId) {
  container.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const [{ data: promoData }, { data: tagList }] = await Promise.all([
    supa().from('promo').select('*').eq('azienda_id', aziendaId).order('created_at', { ascending: false }),
    supa().from('tags').select('id,nome').eq('azienda_id', aziendaId).order('nome'),
  ]);
  const lista = promoData || [];

  container.innerHTML = `
    <style>
      .promo-input{padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;background:white;outline:none;}
      .promo-input:focus{border-color:#0E5A7A;}
      .promo-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;}
      .promo-card{background:white;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;margin-bottom:12px;transition:box-shadow .15s;}
      .promo-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);}
      .toggle-btn{border:none;border-radius:20px;padding:4px 14px;cursor:pointer;font-size:11px;font-weight:700;transition:all .2s;}
      .toggle-btn.attiva{background:#dcfce7;color:#15803d;}
      .toggle-btn.inattiva{background:#fee2e2;color:#dc2626;}
      .giorno-chip{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;border:2px solid #e5e7eb;cursor:pointer;font-size:11px;font-weight:700;color:#64748b;transition:all .15s;user-select:none;}
      .giorno-chip.sel{background:#0E5A7A;border-color:#0E5A7A;color:white;}
      .turno-chip{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:20px;border:2px solid #e5e7eb;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;transition:all .15s;user-select:none;}
      .turno-chip.sel{background:#0E5A7A;border-color:#0E5A7A;color:white;}
      .block-item{background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:8px;}
      .block-item span{flex:1;font-size:12px;font-weight:600;}
      /* Colonna preview fissa */
      .modal-layout{display:flex;gap:0;align-items:stretch;}
      .modal-form-col{flex:1;padding:20px;min-width:0;max-height:80vh;overflow-y:auto;}
      .modal-preview-col{width:300px;flex-shrink:0;background:#1e293b;padding:20px;display:flex;flex-direction:column;align-items:center;border-radius:0 0 20px 0;position:sticky;top:0;}
      .preview-phone{width:240px;border:8px solid #334155;border-radius:32px;overflow:hidden;background:white;box-shadow:0 20px 60px rgba(0,0,0,.5);flex-shrink:0;}
      .preview-inner{max-height:460px;overflow-y:auto;font-family:sans-serif;}
      .preview-tabs{display:flex;gap:4px;margin-bottom:10px;}
      .preview-tab-btn{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.6);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;font-weight:600;}
      .preview-tab-btn.active{background:rgba(255,255,255,.25);color:white;}
      .color-swatch{width:32px;height:32px;border-radius:6px;border:2px solid #e5e7eb;cursor:pointer;display:inline-block;vertical-align:middle;}
      @media(max-width:900px){.modal-preview-col{display:none;}}
      @media(max-width:640px){.promo-grid-2{grid-template-columns:1fr!important;}}
    </style>

    <!-- Header pagina -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
      <div>
        <div style="font-size:18px;font-weight:700;color:#0f172a;">🎁 Promo & Offerte</div>
        <div style="font-size:13px;color:#64748b;">Crea promo personalizzate — landing, tracking Meta, referral</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="btn-usa-template" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:700;">✨ Template 2x1</button>
        <button id="btn-nuova-promo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:700;">+ Nuova promo</button>
      </div>
    </div>

    <div id="lista-promo"></div>

    <!-- MODAL -->
    <div id="modal-promo" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;overflow-y:auto;padding:16px;box-sizing:border-box;">
      <div style="background:white;border-radius:20px;max-width:1140px;margin:0 auto;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0E5A7A,#1a8aad);color:white;padding:18px 24px;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:16px;font-weight:700;" id="modal-promo-title">Nuova promo</div>
          <button id="btn-chiudi-modal" style="background:rgba(255,255,255,.2);border:none;color:white;border-radius:8px;padding:5px 14px;cursor:pointer;">✕</button>
        </div>

        <!-- Layout split: form | preview -->
        <div class="modal-layout">

          <!-- Colonna form scrollabile -->
          <div class="modal-form-col">

            <!-- Tabs -->
            <div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;margin-bottom:18px;overflow-x:auto;">
              ${[
                {id:'info',     l:'📋 Info'},
                {id:'visual',   l:'🖼 Landing'},
                {id:'thankyou', l:'🎉 Thank you'},
                {id:'stile',    l:'🎨 Stile'},
                {id:'tracking', l:'📊 Tracking'},
                {id:'messaggi', l:'💬 Messaggi'},
                {id:'regole',   l:'⚙️ Regole'},
              ].map(t=>`<button data-tab-promo="${t.id}" style="padding:8px 12px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap;">${t.l}</button>`).join('')}
            </div>

            <!-- TAB: INFO BASE -->
            <div data-tab-content-promo="info">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;" class="promo-grid-2">
                <div>
                  <label class="promo-label">Nome promo *</label>
                  <input id="p-nome" class="promo-input" placeholder="Es. 2x1 sul piatto forte">
                </div>
                <div>
                  <label class="promo-label">Tipo</label>
                  <select id="p-tipo" class="promo-input">
                    ${TIPI_PROMO.map(t=>`<option value="${t.v}">${t.icon} ${t.l}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label class="promo-label">Valore</label>
                  <input id="p-valore" type="number" min="0" step="0.01" class="promo-input" placeholder="Es. 10">
                </div>
                <div>
                  <label class="promo-label">Codice promo</label>
                  <input id="p-codice" class="promo-input" placeholder="Es. BENVENUTO2X1">
                </div>
              </div>
              <div style="margin-bottom:12px;">
                <label class="promo-label">Descrizione</label>
                <textarea id="p-desc" class="promo-input" rows="2" style="resize:vertical;" placeholder="Visibile nella landing..."></textarea>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;" class="promo-grid-2">
                <div>
                  <label class="promo-label">Data scadenza</label>
                  <input id="p-data-scad" type="date" class="promo-input">
                </div>
                <div>
                  <label class="promo-label">Validità (giorni)</label>
                  <input id="p-validita" type="number" min="1" value="30" class="promo-input">
                </div>
                <div>
                  <label class="promo-label">Nr. disponibili</label>
                  <input id="p-nr-disp" type="number" min="0" class="promo-input" placeholder="∞">
                </div>
              </div>
              <div style="margin-bottom:14px;">
                <label class="promo-label">📅 Giorni disponibili (vuoto = tutti)</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;" id="p-giorni-chips">
                  ${GIORNI_NOMI.map((g,i)=>`<div class="giorno-chip" data-giorno="${i+1}">${g}</div>`).join('')}
                </div>
              </div>
              <div style="margin-bottom:16px;">
                <label class="promo-label">🕐 Turni validi (vuoto = tutti)</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;" id="p-turni-chips">
                  ${TURNI_LIST.map(t=>`<div class="turno-chip" data-turno="${t.v}">${t.l}</div>`).join('')}
                </div>
              </div>
              <!-- Link e QR (solo promo già salvate) -->
              <div id="p-link-section" style="display:none;">
                <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
                  <div style="font-size:13px;font-weight:700;margin-bottom:10px;">🔗 Link & QR Code</div>
                  <div style="margin-bottom:10px;">
                    <label class="promo-label">Link landing</label>
                    <div style="display:flex;gap:8px;">
                      <input id="p-link-display" class="promo-input" readonly style="background:#f1f5f9;color:#0E5A7A;font-size:12px;cursor:pointer;" onclick="this.select()">
                      <button id="p-btn-copy-link" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 12px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">📋 Copia</button>
                    </div>
                  </div>
                  <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">
                    <div>
                      <label class="promo-label">QR Code</label>
                      <div id="p-qr-container"></div>
                    </div>
                    <div style="flex:1;min-width:160px;">
                      <label class="promo-label">Invia QR</label>
                      <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
                        <button id="p-btn-send-wa" disabled style="background:#25D366;color:white;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:12px;font-weight:600;opacity:.5;text-align:left;">📲 Invia via WhatsApp</button>
                        <button id="p-btn-dl-mail" style="background:#f0f9ff;color:#0E5A7A;border:1px solid #bae6fd;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:12px;font-weight:600;text-align:left;">📧 Scarica per mail</button>
                        <div style="font-size:11px;color:#94a3b8;">🔜 Short link prossimamente</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB: LANDING -->
            <div data-tab-content-promo="visual" style="display:none;">
              <div style="margin-bottom:14px;">
                <label class="promo-label">Immagine promo</label>
                <div style="display:flex;gap:8px;align-items:flex-end;">
                  <input id="p-immagine-url" class="promo-input" placeholder="https://... oppure carica →" style="flex:1;">
                  <label style="background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:9px 14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0;">
                    📎 Carica<input type="file" id="p-immagine-file" accept="image/*" style="display:none;">
                  </label>
                </div>
                <div id="p-immagine-preview" style="margin-top:8px;display:none;">
                  <img id="p-immagine-img" src="" style="max-width:100%;max-height:120px;border-radius:8px;object-fit:cover;">
                  <div style="font-size:11px;color:#15803d;margin-top:4px;">✅ Immagine caricata — visibile nell'anteprima →</div>
                </div>
              </div>
              <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:6px;">🏗 Blocchi landing</div>
                <div style="font-size:12px;color:#64748b;margin-bottom:10px;">Aggiungi e rimuovi blocchi — l'ordine è quello che vedi qui.</div>
                <div id="landing-blocks" style="margin-bottom:10px;min-height:20px;"></div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${BLOCK_LABELS.map((l,i)=>`<button data-add-block="${i}" style="background:white;border:1px solid #e5e7eb;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;">${l}</button>`).join('')}
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:8px;">Il blocco Form include Nome, Telefono, Privacy e Consenso marketing.</div>
              </div>
            </div>

            <!-- TAB: THANK YOU -->
            <div data-tab-content-promo="thankyou" style="display:none;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;margin-bottom:14px;">
                <div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:4px;">🎉 Pagina post-scaricamento</div>
                <div style="font-size:12px;color:#166534;">Mostrata dopo che il cliente compila il form. Traccia conversioni su Meta e Google Ads.</div>
              </div>
              <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:10px;">🏗 Blocchi thank you page</div>
                <div id="thankyou-blocks" style="margin-bottom:10px;min-height:20px;"></div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${BLOCK_LABELS.map((l,i)=>`<button data-add-ty-block="${i}" style="background:white;border:1px solid #e5e7eb;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;">${l}</button>`).join('')}
                </div>
              </div>
            </div>

            <!-- TAB: STILE -->
            <div data-tab-content-promo="stile" style="display:none;">
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:12px;margin-bottom:16px;">
                <div style="font-size:12px;color:#0E5A7A;">🎨 Personalizza l'aspetto della landing. Le modifiche sono visibili in tempo reale nell'anteprima →</div>
              </div>

              <!-- Font -->
              <div style="margin-bottom:16px;">
                <label class="promo-label">Famiglia font</label>
                <select id="s-font" class="promo-input">
                  ${FONT_LIST.map(f=>`<option value="${f.v}">${f.l}</option>`).join('')}
                </select>
              </div>

              <!-- Dimensione testo -->
              <div style="margin-bottom:16px;">
                <label class="promo-label">Dimensione testo base — <span id="s-fontsize-label">14px</span></label>
                <input id="s-fontsize" type="range" min="12" max="20" step="1" value="14" style="width:100%;accent-color:#0E5A7A;">
              </div>

              <!-- Border radius -->
              <div style="margin-bottom:16px;">
                <label class="promo-label">Arrotondamento angoli — <span id="s-radius-label">12px</span></label>
                <input id="s-radius" type="range" min="0" max="28" step="2" value="12" style="width:100%;accent-color:#0E5A7A;">
              </div>

              <!-- Colori -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;" class="promo-grid-2">
                <div>
                  <label class="promo-label">Colore primario (box offerta)</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="color" id="s-colore-primario" value="#0E5A7A" style="width:40px;height:36px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;padding:2px;">
                    <input id="s-colore-primario-hex" class="promo-input" value="#0E5A7A" style="font-family:monospace;font-size:12px;" maxlength="7">
                  </div>
                </div>
                <div>
                  <label class="promo-label">Colore sfondo pagina</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="color" id="s-colore-sfondo" value="#ffffff" style="width:40px;height:36px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;padding:2px;">
                    <input id="s-colore-sfondo-hex" class="promo-input" value="#ffffff" style="font-family:monospace;font-size:12px;" maxlength="7">
                  </div>
                </div>
                <div>
                  <label class="promo-label">Colore testo principale</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="color" id="s-colore-testo" value="#1e293b" style="width:40px;height:36px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;padding:2px;">
                    <input id="s-colore-testo-hex" class="promo-input" value="#1e293b" style="font-family:monospace;font-size:12px;" maxlength="7">
                  </div>
                </div>
                <div>
                  <label class="promo-label">Colore bottone CTA</label>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="color" id="s-colore-bottone" value="#0E5A7A" style="width:40px;height:36px;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;padding:2px;">
                    <input id="s-colore-bottone-hex" class="promo-input" value="#0E5A7A" style="font-family:monospace;font-size:12px;" maxlength="7">
                  </div>
                </div>
              </div>

              <!-- Preset palette -->
              <div style="margin-top:16px;">
                <label class="promo-label">Palette veloci</label>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                  ${[
                    {l:'Oceano',    p:'#0E5A7A', s:'#f0f9ff', t:'#1e293b', b:'#0E5A7A'},
                    {l:'Rosso',     p:'#dc2626', s:'#fff5f5', t:'#1e293b', b:'#dc2626'},
                    {l:'Verde',     p:'#15803d', s:'#f0fdf4', t:'#1e293b', b:'#15803d'},
                    {l:'Viola',     p:'#7c3aed', s:'#faf5ff', t:'#1e293b', b:'#7c3aed'},
                    {l:'Arancio',   p:'#ea580c', s:'#fff7ed', t:'#1e293b', b:'#ea580c'},
                    {l:'Scuro',     p:'#1e293b', s:'#0f172a', t:'#f8fafc', b:'#334155'},
                  ].map(pal=>`<button data-palette='${JSON.stringify(pal)}' style="background:${pal.p};color:white;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:11px;font-weight:700;">${pal.l}</button>`).join('')}
                </div>
              </div>
              <div style="margin-top:14px;">
                <button id="s-reset-stile" style="background:#f1f5f9;color:#64748b;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12px;">↺ Ripristina stile default</button>
              </div>
            </div>

            <!-- TAB: TRACKING -->
            <div data-tab-content-promo="tracking" style="display:none;">
              <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📌 Eventi tracciati automaticamente</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;" class="promo-grid-2">
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;">
                  <div style="font-size:11px;font-weight:700;color:#15803d;margin-bottom:6px;">⬇️ SCARICAMENTO</div>
                  <label class="promo-label">Nome evento</label>
                  <input id="p-tag-scaricamento" class="promo-input" value="Lead">
                  <div style="font-size:11px;color:#64748b;margin-top:6px;">Fired quando il cliente compila il form</div>
                </div>
                <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px;">
                  <div style="font-size:11px;font-weight:700;color:#d97706;margin-bottom:6px;">✅ UTILIZZO</div>
                  <label class="promo-label">Nome evento</label>
                  <input id="p-tag-utilizzata" class="promo-input" value="Purchase">
                  <div style="font-size:11px;color:#64748b;margin-top:6px;">Fired quando il cliente usa la promo</div>
                </div>
                <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:10px;padding:12px;">
                  <div style="font-size:11px;font-weight:700;color:#dc2626;margin-bottom:6px;">⏰ SCADENZA</div>
                  <label class="promo-label">Nome evento</label>
                  <input id="p-tag-scaduta" class="promo-input" value="PromoExpired">
                  <div style="font-size:11px;color:#64748b;margin-top:6px;">Fired quando la promo scade senza uso</div>
                </div>
              </div>
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px;">
                <div style="font-size:13px;font-weight:700;color:#0E5A7A;margin-bottom:6px;">🔗 Questi tag alimentano la catenaria</div>
                <div style="font-size:12px;color:#64748b;">I tre eventi sopra vengono aggiunti come tag al cliente e possono triggerare step nelle catenarie automatiche.</div>
              </div>
            </div>

            <!-- TAB: MESSAGGI -->
            <div data-tab-content-promo="messaggi" style="display:none;">
              <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Variabili: {{nome}}, {{promo_nome}}, {{promo_valore}}, {{scadenza}}, {{codice}}, {{link_promo}}</div>
              <div style="margin-bottom:12px;">
                <label class="promo-label">💬 WhatsApp — invio promo</label>
                <textarea id="p-msg-wa" class="promo-input" rows="4" style="resize:vertical;font-family:monospace;font-size:12px;"></textarea>
              </div>
              <div style="margin-bottom:12px;">
                <label class="promo-label">⏰ Reminder</label>
                <textarea id="p-msg-reminder" class="promo-input" rows="3" style="resize:vertical;font-family:monospace;font-size:12px;"></textarea>
              </div>
              <div style="margin-bottom:12px;">
                <label class="promo-label">💀 Scadenza</label>
                <textarea id="p-msg-scadenza" class="promo-input" rows="3" style="resize:vertical;font-family:monospace;font-size:12px;"></textarea>
              </div>
            </div>

            <!-- TAB: REGOLE -->
            <div data-tab-content-promo="regole" style="display:none;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;" class="promo-grid-2">
                <div>
                  <label class="promo-label">🟢 Solo clienti con questi tag</label>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;max-height:130px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:6px;" id="p-tag-inclusi">
                    ${(tagList||[]).map(t=>`<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;background:#f1f5f9;padding:3px 8px;border-radius:6px;white-space:nowrap;"><input type="checkbox" value="${esc(t.nome)}" class="chk-incl"> ${esc(t.nome)}</label>`).join('')}
                    ${!(tagList||[]).length?'<div style="color:#94a3b8;font-size:12px;">Nessun tag</div>':''}
                  </div>
                </div>
                <div>
                  <label class="promo-label">🔴 Escludi clienti con questi tag</label>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;max-height:130px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:6px;" id="p-tag-esclusi">
                    ${(tagList||[]).map(t=>`<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;background:#f1f5f9;padding:3px 8px;border-radius:6px;white-space:nowrap;"><input type="checkbox" value="${esc(t.nome)}" class="chk-escl"> ${esc(t.nome)}</label>`).join('')}
                    ${!(tagList||[]).length?'<div style="color:#94a3b8;font-size:12px;">Nessun tag</div>':''}
                  </div>
                </div>
              </div>
              <div style="margin-bottom:12px;">
                <label class="promo-label">📜 Regolamento</label>
                <textarea id="p-regolamento" class="promo-input" rows="4" style="resize:vertical;"></textarea>
              </div>
              <div style="display:flex;gap:14px;flex-wrap:wrap;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" id="p-privacy" checked style="accent-color:#0E5A7A;"> Privacy Policy</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" id="p-consenso" checked style="accent-color:#0E5A7A;"> Consenso marketing</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" id="p-referral" style="accent-color:#0E5A7A;"> 🔗 Referral</label>
              </div>
            </div>

            <!-- Footer -->
            <div id="p-esito" style="font-size:13px;min-height:16px;margin-top:14px;margin-bottom:8px;"></div>
            <div style="display:flex;gap:8px;justify-content:flex-end;border-top:1px solid #f1f5f9;padding-top:14px;">
              <button id="btn-salva-promo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 26px;cursor:pointer;font-size:14px;font-weight:700;">💾 Salva</button>
              <button id="btn-annulla-promo" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:14px;">Annulla</button>
            </div>
          </div><!-- fine form col -->

          <!-- Colonna preview fissa -->
          <div class="modal-preview-col">
            <div class="preview-tabs">
              <button class="preview-tab-btn active" data-ptab="landing">📱 Landing</button>
              <button class="preview-tab-btn" data-ptab="thankyou">🎉 TY</button>
            </div>
            <div class="preview-phone">
              <div class="preview-inner" id="preview-landing-inner">
                <div style="padding:20px;text-align:center;color:#94a3b8;font-size:11px;">Inizia a configurare per vedere l'anteprima</div>
              </div>
              <div class="preview-inner" id="preview-thankyou-inner" style="display:none;">
                <div style="padding:20px;text-align:center;color:#94a3b8;font-size:11px;">Configura la thank you page</div>
              </div>
            </div>
            <div style="color:rgba(255,255,255,.4);font-size:10px;margin-top:10px;text-align:center;">Anteprima live — si aggiorna mentre modifichi</div>
          </div>

        </div><!-- fine modal-layout -->
      </div>
    </div>
  `;

  // ── Stato locale ──────────────────────────────────────────────
  let giorniSel    = [];
  let turniSel     = [];
  let landingBlocks  = [];
  let thankyouBlocks = [];
  let stileCorrente  = { ...STILE_DEFAULT };

  // ── Preview tab switch ────────────────────────────────────────
  container.querySelectorAll('[data-ptab]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-ptab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.ptab;
      container.querySelector('#preview-landing-inner').style.display  = tab==='landing' ? '' : 'none';
      container.querySelector('#preview-thankyou-inner').style.display = tab==='thankyou' ? '' : 'none';
    });
  });

  // ── Preview live ──────────────────────────────────────────────
  function getPreviewCSS(s) {
    const fontStack = s.font==='system' ? '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' : `"${s.font}",sans-serif`;
    return `font-family:${fontStack};font-size:${s.font_size_base}px;background:${s.colore_sfondo};color:${s.colore_testo};`;
  }

  function buildPreviewHTML(blocks, s) {
    const nome   = container.querySelector('#p-nome')?.value || 'Nome promo';
    const desc   = container.querySelector('#p-desc')?.value || '';
    const imgUrl = container.querySelector('#p-immagine-url')?.value || '';
    const tipo   = container.querySelector('#p-tipo')?.value || 'sconto_perc';
    const valore = container.querySelector('#p-valore')?.value || '';
    const codice = container.querySelector('#p-codice')?.value || '';
    const r      = s.border_radius;

    const valLabel = tipo==='sconto_perc'?`${valore}%`:tipo==='sconto_euro'?`€${valore}`:tipo==='2x1'?'2×1':'🎁';

    return blocks.map(b => {
      if (b.tipo==='immagine') {
        return imgUrl
          ? `<img src="${imgUrl}" style="width:100%;height:150px;object-fit:cover;display:block;" onerror="this.style.display='none'">`
          : `<div style="width:100%;height:150px;background:linear-gradient(135deg,${s.colore_primario},${s.colore_primario}99);display:flex;align-items:center;justify-content:center;font-size:48px;">🍽</div>`;
      }
      if (b.tipo==='testo') {
        const t = b.contenuto || desc;
        return t ? `<div style="padding:12px 14px;font-size:${s.font_size_base}px;color:${s.colore_testo};line-height:1.6;">${esc(t)}</div>` : '';
      }
      if (b.tipo==='box_offerta') {
        return `<div style="margin:10px;background:linear-gradient(135deg,${s.colore_primario},${s.colore_primario}cc);border-radius:${r}px;padding:18px;color:white;text-align:center;">
          <div style="font-size:36px;font-weight:900;">${valLabel||'—'}</div>
          <div style="font-size:12px;opacity:.85;margin-top:4px;">${esc(nome)}</div>
          ${codice?`<div style="margin-top:10px;background:rgba(255,255,255,.2);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;letter-spacing:2px;">${esc(codice)}</div>`:''}
        </div>`;
      }
      if (b.tipo==='valutazioni') {
        return `<div style="padding:10px;text-align:center;color:#f59e0b;font-size:16px;">★★★★★ <span style="font-size:11px;color:${s.colore_testo};opacity:.6;">4.9 · 320 recensioni</span></div>`;
      }
      if (b.tipo==='form') {
        return `<div style="margin:10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:${r}px;padding:14px;">
          <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:${s.colore_testo};">📋 Scarica la promo</div>
          <div style="background:white;border:1.5px solid #e5e7eb;border-radius:8px;padding:7px 10px;margin-bottom:6px;font-size:11px;color:#94a3b8;">Nome</div>
          <div style="background:white;border:1.5px solid #e5e7eb;border-radius:8px;padding:7px 10px;margin-bottom:8px;font-size:11px;color:#94a3b8;">Telefono</div>
          <div style="background:${s.colore_bottone};border-radius:${r}px;padding:9px;text-align:center;color:white;font-size:12px;font-weight:800;">🎁 Voglio la mia promo!</div>
        </div>`;
      }
      if (b.tipo==='cta_button') {
        return `<div style="padding:0 10px 10px;"><div style="background:${s.colore_bottone};border-radius:${r}px;padding:10px;text-align:center;color:white;font-size:12px;font-weight:800;">${esc(b.contenuto||'CTA')}</div></div>`;
      }
      return '';
    }).join('');
  }

  function aggiornaPreview() {
    const landingEl  = container.querySelector('#preview-landing-inner');
    const thankyouEl = container.querySelector('#preview-thankyou-inner');
    const css = getPreviewCSS(stileCorrente);

    if (landingEl) {
      landingEl.style.cssText = css;
      if (landingBlocks.length) {
        // Carica font Google se necessario
        if (stileCorrente.font !== 'system') caricaGoogleFont(stileCorrente.font);
        landingEl.innerHTML = buildPreviewHTML(landingBlocks, stileCorrente);
      } else {
        landingEl.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:11px;">Aggiungi blocchi nella tab Landing →</div>';
      }
    }
    if (thankyouEl) {
      thankyouEl.style.cssText = css;
      if (thankyouBlocks.length) {
        thankyouEl.innerHTML = buildPreviewHTML(thankyouBlocks, stileCorrente);
      } else {
        thankyouEl.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:11px;">Aggiungi blocchi nella tab Thank you →</div>';
      }
    }
  }

  function caricaGoogleFont(font) {
    const id = 'gfont-'+font.replace(/\s+/g,'-');
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id=id; l.rel='stylesheet';
    l.href=`https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g,'+')}:wght@400;700;900&display=swap`;
    document.head.appendChild(l);
  }

  // ── Stile: sync input colore <-> hex ─────────────────────────
  function bindColorPair(colorId, hexId, stileKey) {
    const colorInput = container.querySelector('#'+colorId);
    const hexInput   = container.querySelector('#'+hexId);
    colorInput.addEventListener('input', () => {
      hexInput.value = colorInput.value;
      stileCorrente[stileKey] = colorInput.value;
      aggiornaPreview();
    });
    hexInput.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
        colorInput.value = hexInput.value;
        stileCorrente[stileKey] = hexInput.value;
        aggiornaPreview();
      }
    });
  }
  bindColorPair('s-colore-primario','s-colore-primario-hex','colore_primario');
  bindColorPair('s-colore-sfondo',  's-colore-sfondo-hex',  'colore_sfondo');
  bindColorPair('s-colore-testo',   's-colore-testo-hex',   'colore_testo');
  bindColorPair('s-colore-bottone', 's-colore-bottone-hex', 'colore_bottone');

  container.querySelector('#s-font').addEventListener('change', e => {
    stileCorrente.font = e.target.value; aggiornaPreview();
  });
  container.querySelector('#s-fontsize').addEventListener('input', e => {
    stileCorrente.font_size_base = parseInt(e.target.value);
    container.querySelector('#s-fontsize-label').textContent = e.target.value+'px';
    aggiornaPreview();
  });
  container.querySelector('#s-radius').addEventListener('input', e => {
    stileCorrente.border_radius = parseInt(e.target.value);
    container.querySelector('#s-radius-label').textContent = e.target.value+'px';
    aggiornaPreview();
  });

  // Palette veloci
  container.querySelectorAll('[data-palette]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = JSON.parse(btn.dataset.palette);
      stileCorrente.colore_primario = p.p;
      stileCorrente.colore_sfondo   = p.s;
      stileCorrente.colore_testo    = p.t;
      stileCorrente.colore_bottone  = p.b;
      ['primario','sfondo','testo','bottone'].forEach(k => {
        const key = 'colore_'+k;
        container.querySelector(`#s-${key}`).value     = stileCorrente[key];
        container.querySelector(`#s-${key}-hex`).value = stileCorrente[key];
      });
      aggiornaPreview();
    });
  });

  container.querySelector('#s-reset-stile').addEventListener('click', () => {
    stileCorrente = { ...STILE_DEFAULT };
    applicaStileAiCampi(stileCorrente);
    aggiornaPreview();
  });

  function applicaStileAiCampi(s) {
    container.querySelector('#s-font').value = s.font;
    container.querySelector('#s-fontsize').value = s.font_size_base;
    container.querySelector('#s-fontsize-label').textContent = s.font_size_base+'px';
    container.querySelector('#s-radius').value = s.border_radius;
    container.querySelector('#s-radius-label').textContent = s.border_radius+'px';
    ['primario','sfondo','testo','bottone'].forEach(k => {
      const key = 'colore_'+k;
      container.querySelector(`#s-${key}`).value     = s[key];
      container.querySelector(`#s-${key}-hex`).value = s[key];
    });
  }

  // ── Live update da campi principali ──────────────────────────
  ['p-nome','p-desc','p-tipo','p-valore','p-codice'].forEach(id => {
    container.querySelector('#'+id)?.addEventListener('input', aggiornaPreview);
  });
  container.querySelector('#p-immagine-url').addEventListener('input', e => {
    const url = e.target.value.trim();
    if (url) {
      container.querySelector('#p-immagine-img').src = url;
      container.querySelector('#p-immagine-preview').style.display = '';
    }
    aggiornaPreview();
  });

  // ── Chips giorni/turni ────────────────────────────────────────
  function syncChips() {
    container.querySelectorAll('.giorno-chip').forEach(c => c.classList.toggle('sel', giorniSel.includes(parseInt(c.dataset.giorno))));
    container.querySelectorAll('.turno-chip').forEach(c  => c.classList.toggle('sel', turniSel.includes(c.dataset.turno)));
  }
  container.querySelectorAll('.giorno-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const g = parseInt(chip.dataset.giorno);
      giorniSel.includes(g) ? giorniSel.splice(giorniSel.indexOf(g),1) : giorniSel.push(g);
      syncChips();
    });
  });
  container.querySelectorAll('.turno-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const t = chip.dataset.turno;
      turniSel.includes(t) ? turniSel.splice(turniSel.indexOf(t),1) : turniSel.push(t);
      syncChips();
    });
  });

  // ── Builder blocchi ───────────────────────────────────────────
  function renderBlocks(arr, containerId) {
    const el = container.querySelector('#'+containerId);
    if (!arr.length) { el.innerHTML=''; return; }
    el.innerHTML = arr.map((b,idx)=>`
      <div class="block-item">
        <span style="color:#94a3b8;font-size:12px;">${idx+1}.</span>
        <span>${b.label||b.tipo}</span>
        <button data-del="${idx}" data-target="${containerId}" style="background:#fee2e2;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;color:#dc2626;">✕</button>
      </div>`).join('');
    el.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.del);
        if (btn.dataset.target==='landing-blocks') landingBlocks.splice(i,1);
        else thankyouBlocks.splice(i,1);
        renderBlocks(arr, containerId);
        aggiornaPreview();
      });
    });
  }

  container.querySelectorAll('[data-add-block]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.addBlock);
      landingBlocks.push({ tipo: BLOCK_TYPES[i], label: BLOCK_LABELS[i], contenuto:'' });
      renderBlocks(landingBlocks,'landing-blocks');
      aggiornaPreview();
    });
  });
  container.querySelectorAll('[data-add-ty-block]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.addTyBlock);
      thankyouBlocks.push({ tipo: BLOCK_TYPES[i], label: BLOCK_LABELS[i], contenuto:'' });
      renderBlocks(thankyouBlocks,'thankyou-blocks');
      aggiornaPreview();
    });
  });

  // ── Upload immagine ───────────────────────────────────────────
  container.querySelector('#p-immagine-file').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fileName = `promo/${aziendaId}/${Date.now()}-${file.name}`;
    const { error } = await supa().storage.from('immagini-promo').upload(fileName, file, { upsert:true });
    if (error) { mostraToast('Errore upload: '+error.message,'error'); return; }
    const { data: urlData } = supa().storage.from('immagini-promo').getPublicUrl(fileName);
    container.querySelector('#p-immagine-url').value = urlData.publicUrl;
    container.querySelector('#p-immagine-img').src   = urlData.publicUrl;
    container.querySelector('#p-immagine-preview').style.display='';
    aggiornaPreview();
  });

  // ── QR Code ───────────────────────────────────────────────────
  let _qrDataUrl = null;

  function generaQR(url) {
    const qrEl = container.querySelector('#p-qr-container');
    if (!qrEl) return;
    qrEl.innerHTML = '';
    if (!url || !window.QRCode) return;
    const tmp = document.createElement('div');
    new window.QRCode(tmp, { text: url, width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.M });
    setTimeout(() => {
      const canvas = tmp.querySelector('canvas');
      const img    = tmp.querySelector('img');
      if (canvas) _qrDataUrl = canvas.toDataURL('image/png');
      else if (img) _qrDataUrl = img.src;
      const display = document.createElement('div');
      display.style.cssText = 'background:white;padding:6px;border:1px solid #e5e7eb;border-radius:8px;display:inline-block;';
      if (canvas) {
        const c2 = document.createElement('canvas'); c2.width=110; c2.height=110;
        c2.getContext('2d').drawImage(canvas,0,0,110,110);
        display.appendChild(c2);
      } else if (img) {
        const i2 = document.createElement('img'); i2.src=img.src; i2.style.cssText='width:110px;height:110px;';
        display.appendChild(i2);
      }
      qrEl.appendChild(display);
      const btnWA = container.querySelector('#p-btn-send-wa');
      if (btnWA) { btnWA.disabled=false; btnWA.style.opacity='1'; }
    }, 100);
  }

  function caricaQRLib(url) {
    if (window.QRCode) { generaQR(url); return; }
    const s = document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload=()=>generaQR(url); document.head.appendChild(s);
  }

  async function inviaQRWhatsApp(promoId, landingUrl) {
    if (!_qrDataUrl) { mostraToast('QR non ancora generato','error'); return; }
    const btn = container.querySelector('#p-btn-send-wa');
    btn.disabled=true; btn.textContent='⏳ Invio...';
    try {
      const { data: az } = await supa().from('azienda_identita').select('whatsapp_phone_id').eq('id', aziendaId).single();
      if (!az?.whatsapp_phone_id) { mostraToast('WhatsApp non configurato in Impostazioni','error'); return; }
      const blob = await (await fetch(_qrDataUrl)).blob();
      const fileName = `promo-qr/${promoId}-${Date.now()}.png`;
      const { error: upErr } = await supa().storage.from('immagini-promo').upload(fileName, blob, { contentType:'image/png', upsert:true });
      if (upErr) { mostraToast('Errore upload QR: '+upErr.message,'error'); return; }
      const { data: urlD } = supa().storage.from('immagini-promo').getPublicUrl(fileName);
      const { error: waErr } = await supa().functions.invoke('send-whatsapp', {
        body: { azienda_id: aziendaId, tipo:'media', media_url: urlD.publicUrl, media_type:'image', caption:`🎁 QR promo!\n👉 ${landingUrl}`, _test:true }
      });
      if (waErr) { mostraToast('Errore WA: '+waErr.message,'error'); return; }
      mostraToast('QR inviato via WhatsApp ✅','success');
    } catch(e) { mostraToast('Errore: '+e.message,'error'); }
    finally { btn.disabled=false; btn.textContent='📲 Invia via WhatsApp'; }
  }

  function downloadQR(promoNome) {
    if (!_qrDataUrl) { mostraToast('QR non ancora generato','error'); return; }
    const a = document.createElement('a');
    a.href=_qrDataUrl; a.download=`qr-${(promoNome||'promo').replace(/[^a-z0-9]/gi,'-').toLowerCase()}.png`;
    a.click();
    mostraToast('QR scaricato ✅','success');
  }

  // ── Tab interni ───────────────────────────────────────────────
  function initTabs() {
    container.querySelectorAll('[data-tab-promo]').forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
    });
    const btns     = container.querySelectorAll('[data-tab-promo]');
    const contents = container.querySelectorAll('[data-tab-content-promo]');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => { b.style.color='#64748b'; b.style.borderBottomColor='transparent'; });
        contents.forEach(c => c.style.display='none');
        btn.style.color='#0E5A7A'; btn.style.borderBottomColor='#0E5A7A';
        const target = container.querySelector(`[data-tab-content-promo="${btn.dataset.tabPromo}"]`);
        if (target) target.style.display='';
        aggiornaPreview();
      });
    });
    if (btns.length) btns[0].click();
  }

  // ── Apri/Chiudi modal ─────────────────────────────────────────
  let promoAttiva = null;

  function apriModal(promo = null) {
    promoAttiva = promo;
    landingBlocks  = (promo?.landing_config?.blocks||[]).map(b=>({...b, label: BLOCK_LABELS[BLOCK_TYPES.indexOf(b.tipo)]||b.tipo}));
    thankyouBlocks = (promo?.thankyou_config?.blocks||[]).map(b=>({...b, label: BLOCK_LABELS[BLOCK_TYPES.indexOf(b.tipo)]||b.tipo}));
    giorniSel = promo?.giorni_disponibili ? [...promo.giorni_disponibili] : [];
    turniSel  = promo?.turni ? [...promo.turni] : [];
    stileCorrente = { ...STILE_DEFAULT, ...(promo?.stile||{}) };

    container.querySelector('#modal-promo-title').textContent = promo?.id && !promo._isTemplate ? 'Modifica promo' : 'Nuova promo';
    container.querySelector('#p-nome').value        = promo?.nome||'';
    container.querySelector('#p-tipo').value        = promo?.tipo||'sconto_perc';
    container.querySelector('#p-valore').value      = promo?.valore||'';
    container.querySelector('#p-codice').value      = promo?.codice||'';
    container.querySelector('#p-desc').value        = promo?.descrizione||'';
    container.querySelector('#p-data-scad').value   = promo?.data_scadenza||'';
    container.querySelector('#p-validita').value    = promo?.validita_giorni||30;
    container.querySelector('#p-nr-disp').value     = promo?.nr_disponibili||'';
    container.querySelector('#p-immagine-url').value= promo?.immagine_url||'';
    if (promo?.immagine_url) {
      container.querySelector('#p-immagine-img').src = promo.immagine_url;
      container.querySelector('#p-immagine-preview').style.display='';
    } else {
      container.querySelector('#p-immagine-preview').style.display='none';
    }
    container.querySelector('#p-tag-scaricamento').value = promo?.meta_pixel_evento_scaricamento||'Lead';
    container.querySelector('#p-tag-utilizzata').value   = promo?.meta_pixel_evento_uso||'Purchase';
    container.querySelector('#p-tag-scaduta').value      = promo?.meta_pixel_evento_scaduto||'PromoExpired';
    container.querySelector('#p-msg-wa').value       = promo?.messaggio_wa||'';
    container.querySelector('#p-msg-reminder').value = promo?.messaggio_reminder||'';
    container.querySelector('#p-msg-scadenza').value = promo?.messaggio_scadenza||'';
    container.querySelector('#p-regolamento').value  = promo?.regolamento||'';
    container.querySelector('#p-privacy').checked    = promo?.privacy_richiesta ?? true;
    container.querySelector('#p-consenso').checked   = promo?.consenso_marketing ?? true;
    container.querySelector('#p-referral').checked   = promo?.referral_attivo ?? false;
    container.querySelectorAll('.chk-incl').forEach(c => c.checked=(promo?.tag_inclusi||[]).includes(c.value));
    container.querySelectorAll('.chk-escl').forEach(c => c.checked=(promo?.tag_esclusi||[]).includes(c.value));

    applicaStileAiCampi(stileCorrente);

    // Link e QR
    const hasId = promo?.id && !promo._isTemplate;
    const linkSection = container.querySelector('#p-link-section');
    if (hasId) {
      const url = `https://ristoflow-ai.com/promo.html?id=${promo.id}`;
      linkSection.style.display='';
      container.querySelector('#p-link-display').value = url;
      container.querySelector('#p-btn-copy-link').onclick = () =>
        navigator.clipboard?.writeText(url).then(()=>mostraToast('Link copiato!','success'));
      const btnWA = container.querySelector('#p-btn-send-wa');
      if (btnWA) btnWA.onclick = () => inviaQRWhatsApp(promo.id, url);
      const btnMail = container.querySelector('#p-btn-dl-mail');
      if (btnMail) btnMail.onclick = () => downloadQR(promo.nome);
      caricaQRLib(url);
    } else {
      linkSection.style.display='none';
    }

    syncChips();
    renderBlocks(landingBlocks,'landing-blocks');
    renderBlocks(thankyouBlocks,'thankyou-blocks');
    container.querySelector('#p-esito').textContent='';
    container.querySelector('#modal-promo').style.display='';
    initTabs();
    aggiornaPreview();
  }

  function chiudiModal() { container.querySelector('#modal-promo').style.display='none'; }

  // ── Salva promo ───────────────────────────────────────────────
  container.querySelector('#btn-salva-promo').addEventListener('click', async () => {
    const esito = container.querySelector('#p-esito');
    const nome  = container.querySelector('#p-nome').value.trim();
    if (!nome) { esito.textContent='❌ Nome obbligatorio'; esito.style.color='#dc2626'; return; }
    esito.textContent='Salvataggio...'; esito.style.color='#64748b';

    const tagInclusi = [...container.querySelectorAll('.chk-incl:checked')].map(c=>c.value);
    const tagEsclusi = [...container.querySelectorAll('.chk-escl:checked')].map(c=>c.value);

    const payload = {
      azienda_id: aziendaId, nome,
      descrizione:  container.querySelector('#p-desc').value.trim()||null,
      tipo:         container.querySelector('#p-tipo').value,
      valore:       parseFloat(container.querySelector('#p-valore').value)||null,
      codice:       container.querySelector('#p-codice').value.trim()||null,
      data_scadenza:container.querySelector('#p-data-scad').value||null,
      validita_giorni: parseInt(container.querySelector('#p-validita').value)||30,
      nr_disponibili: parseInt(container.querySelector('#p-nr-disp').value)||null,
      immagine_url: container.querySelector('#p-immagine-url').value.trim()||null,
      meta_pixel_evento_scaricamento: container.querySelector('#p-tag-scaricamento').value.trim()||'Lead',
      meta_pixel_evento_uso:          container.querySelector('#p-tag-utilizzata').value.trim()||'Purchase',
      meta_pixel_evento_scaduto:      container.querySelector('#p-tag-scaduta').value.trim()||'PromoExpired',
      tag_scaricamento:'promo_scaricata', tag_utilizzata:'promo_usata', tag_scaduta:'promo_scaduta',
      messaggio_wa:       container.querySelector('#p-msg-wa').value.trim()||null,
      messaggio_reminder: container.querySelector('#p-msg-reminder').value.trim()||null,
      messaggio_scadenza: container.querySelector('#p-msg-scadenza').value.trim()||null,
      regolamento:  container.querySelector('#p-regolamento').value.trim()||null,
      privacy_richiesta:  container.querySelector('#p-privacy').checked,
      consenso_marketing: container.querySelector('#p-consenso').checked,
      referral_attivo:    container.querySelector('#p-referral').checked,
      tag_inclusi: tagInclusi.length ? tagInclusi : null,
      tag_esclusi: tagEsclusi.length ? tagEsclusi : null,
      giorni_disponibili: giorniSel.length ? giorniSel : null,
      turni: turniSel.length ? turniSel : null,
      landing_config:  { blocks: landingBlocks },
      thankyou_config: { blocks: thankyouBlocks },
      stile: stileCorrente,
      attiva: promoAttiva?.id && !promoAttiva._isTemplate ? promoAttiva.attiva : true,
    };

    if (promoAttiva?.id && !promoAttiva._isTemplate) {
      const { error } = await supa().from('promo').update(payload).eq('id', promoAttiva.id);
      if (error) { esito.textContent='❌ '+error.message; esito.style.color='#dc2626'; return; }
      const idx = lista.findIndex(p=>p.id===promoAttiva.id);
      if (idx>=0) lista[idx] = { ...lista[idx], ...payload };
    } else {
      const { data, error } = await supa().from('promo').insert(payload).select('*').single();
      if (error) { esito.textContent='❌ '+error.message; esito.style.color='#dc2626'; return; }
      lista.unshift(data);
    }
    chiudiModal(); renderLista(); mostraToast('Promo salvata ✅','success');
  });

  container.querySelector('#btn-nuova-promo').addEventListener('click', () => apriModal(null));
  container.querySelector('#btn-chiudi-modal').addEventListener('click', chiudiModal);
  container.querySelector('#btn-annulla-promo').addEventListener('click', chiudiModal);
  container.querySelector('#modal-promo').addEventListener('click', e => { if(e.target===container.querySelector('#modal-promo')) chiudiModal(); });
  container.querySelector('#btn-usa-template').addEventListener('click', () => {
    if (!confirm('Aprire il template 2x1 preimpostato?')) return;
    apriModal({ ...PROMO_BENVENUTO_TEMPLATE, id:null, _isTemplate:true });
  });

  // ── Render lista ──────────────────────────────────────────────
  function renderLista() {
    const el = container.querySelector('#lista-promo');
    if (!lista.length) {
      el.innerHTML=`<div style="text-align:center;padding:48px 24px;color:#94a3b8;background:white;border:2px dashed #e5e7eb;border-radius:14px;">
        <div style="font-size:40px;margin-bottom:12px;">🎁</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:6px;">Nessuna promo ancora</div>
        <div style="font-size:13px;">Usa il template 2x1 già pronto — la promo più potente per acquisire nuovi clienti.</div>
      </div>`; return;
    }
    el.innerHTML = lista.map(p => {
      const tipo = TIPI_PROMO.find(t=>t.v===p.tipo)||TIPI_PROMO[0];
      const valore = p.tipo==='sconto_perc'?`${p.valore}%`:p.tipo==='sconto_euro'?`€${p.valore}`:tipo.icon;
      const giorniLabel = p.giorni_disponibili?.length ? p.giorni_disponibili.map(g=>GIORNI_NOMI[g-1]).join(', ') : null;
      const turniLabel  = p.turni?.length ? p.turni.map(t=>t==='pranzo'?'Pranzo':'Cena').join(' + ') : null;
      const accentColor = p.stile?.colore_primario || '#0E5A7A';
      return `<div class="promo-card">
        <div style="display:flex;align-items:stretch;">
          ${p.immagine_url
            ? `<img src="${esc(p.immagine_url)}" style="width:110px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">`
            : `<div style="width:110px;background:linear-gradient(135deg,${accentColor},${accentColor}99);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:34px;">${tipo.icon}</div>`}
          <div style="flex:1;padding:14px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
              <div>
                <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(p.nome)}</div>
                <div style="font-size:13px;color:#64748b;margin-top:2px;">${tipo.l} · <strong style="color:${accentColor};">${valore}</strong> · ${p.validita_giorni||30}gg</div>
                ${p.descrizione?`<div style="font-size:12px;color:#94a3b8;margin-top:4px;">${esc(p.descrizione)}</div>`:''}
                ${giorniLabel||turniLabel?`<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
                  ${giorniLabel?`<span style="background:#f0f9ff;border:1px solid #bae6fd;color:#0E5A7A;border-radius:10px;padding:2px 10px;font-size:11px;font-weight:600;">📅 ${giorniLabel}</span>`:''}
                  ${turniLabel ?`<span style="background:#fef3c7;border:1px solid #fde68a;color:#d97706;border-radius:10px;padding:2px 10px;font-size:11px;font-weight:600;">🕐 ${turniLabel}</span>`:''}
                </div>`:''}
              </div>
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <button data-toggle-promo="${p.id}" class="toggle-btn ${p.attiva?'attiva':'inattiva'}">${p.attiva?'✅ Attiva':'⏸ Disattiva'}</button>
                <button data-copy-url="https://ristoflow-ai.com/promo.html?id=${p.id}" style="background:#f0f9ff;border:1px solid #bae6fd;color:#0E5A7A;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;font-weight:600;">🔗 Link</button>
                <button data-edit-promo="${p.id}" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;">✏️</button>
                <button data-del-promo="${p.id}" style="background:#fee2e2;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;color:#dc2626;">🗑</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('[data-copy-url]').forEach(btn => {
      btn.addEventListener('click', () => navigator.clipboard?.writeText(btn.dataset.copyUrl).then(()=>mostraToast('Link copiato!','success')));
    });
    el.querySelectorAll('[data-edit-promo]').forEach(btn => {
      btn.addEventListener('click', () => apriModal(lista.find(p=>p.id===btn.dataset.editPromo)));
    });
    el.querySelectorAll('[data-del-promo]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questa promo?')) return;
        await supa().from('promo').delete().eq('id', btn.dataset.delPromo);
        const idx = lista.findIndex(p=>p.id===btn.dataset.delPromo);
        if (idx>=0) lista.splice(idx,1);
        renderLista(); mostraToast('Promo eliminata','success');
      });
    });
    el.querySelectorAll('[data-toggle-promo]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const p = lista.find(x=>x.id===btn.dataset.togglePromo); if (!p) return;
        const nuovo = !p.attiva;
        const { error } = await supa().from('promo').update({ attiva: nuovo }).eq('id', p.id);
        if (error) { mostraToast('Errore: '+error.message,'error'); return; }
        p.attiva = nuovo;
        btn.textContent = nuovo?'✅ Attiva':'⏸ Disattiva';
        btn.className = `toggle-btn ${nuovo?'attiva':'inattiva'}`;
        mostraToast(nuovo?'Promo attivata ✅':'Promo disattivata ⏸','success');
      });
    });
  }

  renderLista();
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML='<div style="padding:20px;color:#dc2626;">Azienda non selezionata</div>'; return; }
  await renderPromo(container, aziendaId);
}
