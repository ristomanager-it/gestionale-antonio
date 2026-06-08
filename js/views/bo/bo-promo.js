// js/views/bo/bo-promo.js
// Gestione promo — file dedicato

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

// ── Template Benvenuto 2x1 ────────────────────────────────────────────────────
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
  regolamento: `Promozione valida per i nuovi clienti. Acquistando un piatto forte dal menu, il secondo è offerto gratuitamente. Non cumulabile con altre offerte. Valida nei giorni e orari indicati. Il locale si riserva il diritto di modificare o revocare la promozione.`,
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
  giorni_disponibili: null,
  turni: null,
  attiva: true,
};

// ── Descrizione del potere della promo (testo motivazionale) ─────────────────
const TESTO_PERCHE_2X1 = `
<div style="background:linear-gradient(135deg,#fff7ed,#fef3c7);border:1px solid #fde68a;border-radius:14px;padding:16px;margin-bottom:20px;">
  <div style="font-size:14px;font-weight:800;color:#92400e;margin-bottom:8px;">💡 Perché il 2x1 sul piatto forte è la promo più potente?</div>
  <div style="font-size:13px;color:#78350f;line-height:1.7;">
    Il 2x1 <strong>obbliga il cliente a venire con qualcuno</strong> — porta traffico doppio al tavolo. 
    Il piatto forte è quello che il locale sa fare meglio: usarlo come esca è la mossa più intelligente perché 
    trasforma un nuovo cliente in un <strong>ambassadore convinto</strong>. Chi viene porta un amico, 
    chi assaggia il meglio torna. Il costo reale per il locale è marginale rispetto al valore 
    di un cliente acquisito che porta altri clienti. <strong>Il regalo potente crea memoria.</strong>
  </div>
</div>`;

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
      /* Preview mobile */
      .preview-phone{width:280px;min-height:500px;border:8px solid #1e293b;border-radius:36px;overflow:hidden;background:white;box-shadow:0 20px 60px rgba(0,0,0,.3);flex-shrink:0;}
      .preview-inner{height:100%;overflow-y:auto;font-family:'Segoe UI',sans-serif;}
      @media(max-width:640px){.promo-grid-2{grid-template-columns:1fr!important;}.preview-phone{display:none;}}
    </style>

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
      <div>
        <div style="font-size:18px;font-weight:700;color:#0f172a;">🎁 Promo & Offerte</div>
        <div style="font-size:13px;color:#64748b;">Crea promo personalizzate — landing, tracking Meta, referral</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="btn-usa-template" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:700;">✨ Template Benvenuto 2x1</button>
        <button id="btn-nuova-promo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:700;">+ Nuova promo</button>
      </div>
    </div>

    <!-- Lista -->
    <div id="lista-promo"></div>

    <!-- Modal editor -->
    <div id="modal-promo" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;overflow-y:auto;padding:16px;box-sizing:border-box;">
      <div style="background:white;border-radius:20px;max-width:1100px;margin:0 auto;">

        <!-- Header modal -->
        <div style="background:linear-gradient(135deg,#0E5A7A,#1a8aad);color:white;padding:20px 24px;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:17px;font-weight:700;" id="modal-promo-title">Nuova promo</div>
          <button id="btn-chiudi-modal" style="background:rgba(255,255,255,.2);border:none;color:white;border-radius:8px;padding:6px 14px;cursor:pointer;">✕ Chiudi</button>
        </div>

        <!-- Layout: form + preview -->
        <div style="display:flex;gap:0;">

          <!-- Colonna form -->
          <div style="flex:1;padding:20px;min-width:0;">

            <!-- Tab interni -->
            <div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;margin-bottom:20px;overflow-x:auto;">
              ${[
                {id:'info',     l:'📋 Info base'},
                {id:'visual',   l:'🖼 Landing'},
                {id:'thankyou', l:'🎉 Thank you'},
                {id:'tracking', l:'📊 Tracking'},
                {id:'messaggi', l:'💬 Messaggi'},
                {id:'regole',   l:'⚙️ Regole'},
                {id:'preview',  l:'👁 Anteprima'},
              ].map(t=>`<button data-tab-promo="${t.id}" style="padding:9px 12px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap;">${t.l}</button>`).join('')}
            </div>

            <!-- TAB: INFO BASE -->
            <div data-tab-content-promo="info">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;" class="promo-grid-2">
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
                <div id="p-valore-wrap">
                  <label class="promo-label">Valore</label>
                  <input id="p-valore" type="number" min="0" step="0.01" class="promo-input" placeholder="Es. 10">
                </div>
                <div>
                  <label class="promo-label">Codice promo</label>
                  <input id="p-codice" class="promo-input" placeholder="Es. BENVENUTO2X1">
                </div>
              </div>
              <div style="margin-bottom:14px;">
                <label class="promo-label">Descrizione breve</label>
                <textarea id="p-desc" class="promo-input" rows="2" style="resize:vertical;" placeholder="Descrizione visibile nella landing..."></textarea>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;" class="promo-grid-2">
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
                  <input id="p-nr-disp" type="number" min="0" class="promo-input" placeholder="Vuoto = illimitato">
                </div>
              </div>

              <!-- Giorni e turni -->
              <div style="margin-bottom:16px;">
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

              <!-- Link e QR -->
              <div id="p-link-section" style="display:none;">
                <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
                  <div style="font-size:13px;font-weight:700;margin-bottom:12px;">🔗 Link promo & QR Code</div>
                  <div style="margin-bottom:10px;">
                    <label class="promo-label">Link landing</label>
                    <div style="display:flex;gap:8px;align-items:center;">
                      <input id="p-link-display" class="promo-input" readonly style="background:#f1f5f9;color:#0E5A7A;font-size:12px;cursor:pointer;" onclick="this.select()">
                      <button id="p-btn-copy-link" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">📋 Copia</button>
                    </div>
                  </div>
                  <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">
                    <div>
                      <label class="promo-label">QR Code</label>
                      <div id="p-qr-container" style="background:white;padding:8px;border:1px solid #e5e7eb;border-radius:8px;display:inline-block;"></div>
                    </div>
                    <div style="flex:1;min-width:160px;">
                      <label class="promo-label">Short link</label>
                      <div style="background:#f1f5f9;border:1px dashed #cbd5e1;border-radius:8px;padding:10px;font-size:12px;color:#94a3b8;">
                        🔜 Short link disponibile prossimamente
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB: LANDING (Visual) -->
            <div data-tab-content-promo="visual" style="display:none;">
              <div style="margin-bottom:14px;">
                <label class="promo-label">Immagine promo (URL o upload)</label>
                <div style="display:flex;gap:8px;align-items:flex-end;">
                  <input id="p-immagine-url" class="promo-input" placeholder="https://..." style="flex:1;">
                  <label style="background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:9px 14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
                    📎 Carica<input type="file" id="p-immagine-file" accept="image/*" style="display:none;">
                  </label>
                </div>
                <div id="p-immagine-preview" style="margin-top:10px;display:none;">
                  <img id="p-immagine-img" src="" style="max-width:100%;max-height:160px;border-radius:10px;object-fit:cover;">
                </div>
              </div>
              <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:6px;">🏗 Blocchi landing</div>
                <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Aggiungi e rimuovi blocchi. L'ordine è quello che vedi qui.</div>
                <div id="landing-blocks" style="margin-bottom:10px;min-height:40px;"></div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${BLOCK_LABELS.map((l,i)=>`<button data-add-block="${i}" style="background:white;border:1px solid #e5e7eb;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;">${l}</button>`).join('')}
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:8px;">Il blocco Form include automaticamente Nome, Telefono, Privacy e Consenso marketing.</div>
              </div>
            </div>

            <!-- TAB: THANK YOU -->
            <div data-tab-content-promo="thankyou" style="display:none;">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;margin-bottom:16px;">
                <div style="font-size:13px;font-weight:700;color:#15803d;margin-bottom:6px;">🎉 Pagina post-scaricamento</div>
                <div style="font-size:12px;color:#166534;">Questa pagina viene mostrata dopo che il cliente ha compilato il form. Usala per confermare la promo, mostrare il codice e tracciare conversioni su Meta e Google Ads.</div>
              </div>
              <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
                <div style="font-size:13px;font-weight:700;margin-bottom:6px;">🏗 Blocchi thank you page</div>
                <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Stessa logica della landing — aggiungi i blocchi che vuoi mostrare dopo il form.</div>
                <div id="thankyou-blocks" style="margin-bottom:10px;min-height:40px;"></div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${BLOCK_LABELS.map((l,i)=>`<button data-add-ty-block="${i}" style="background:white;border:1px solid #e5e7eb;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;">${l}</button>`).join('')}
                </div>
              </div>
            </div>

            <!-- TAB: TRACKING -->
            <div data-tab-content-promo="tracking" style="display:none;">
              <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📌 Eventi tracciati automaticamente</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;" class="promo-grid-2">
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;">
                  <div style="font-size:11px;font-weight:700;color:#15803d;margin-bottom:6px;">⬇️ SCARICAMENTO</div>
                  <label class="promo-label">Nome evento</label>
                  <input id="p-tag-scaricamento" class="promo-input" value="Lead" placeholder="Lead">
                  <div style="font-size:11px;color:#64748b;margin-top:6px;">Fired quando il cliente compila il form</div>
                </div>
                <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px;">
                  <div style="font-size:11px;font-weight:700;color:#d97706;margin-bottom:6px;">✅ UTILIZZO</div>
                  <label class="promo-label">Nome evento</label>
                  <input id="p-tag-utilizzata" class="promo-input" value="Purchase" placeholder="Purchase">
                  <div style="font-size:11px;color:#64748b;margin-top:6px;">Fired quando il cliente usa la promo</div>
                </div>
                <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:10px;padding:12px;">
                  <div style="font-size:11px;font-weight:700;color:#dc2626;margin-bottom:6px;">⏰ SCADENZA</div>
                  <label class="promo-label">Nome evento</label>
                  <input id="p-tag-scaduta" class="promo-input" value="PromoExpired" placeholder="PromoExpired">
                  <div style="font-size:11px;color:#64748b;margin-top:6px;">Fired quando la promo scade senza uso</div>
                </div>
              </div>
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:14px;">
                <div style="font-size:13px;font-weight:700;color:#0E5A7A;margin-bottom:8px;">🔗 Questi tag alimentano la catenaria</div>
                <div style="font-size:12px;color:#64748b;">I tre eventi sopra vengono automaticamente aggiunti come tag al profilo cliente e possono triggerare step nelle catenarie automatiche. Es. "promo_scaduta" → attiva step reminder.</div>
              </div>
            </div>

            <!-- TAB: MESSAGGI -->
            <div data-tab-content-promo="messaggi" style="display:none;">
              <div style="font-size:12px;color:#64748b;margin-bottom:14px;">Variabili: {{nome}}, {{promo_nome}}, {{promo_valore}}, {{scadenza}}, {{codice}}, {{link_promo}}</div>
              <div style="margin-bottom:14px;">
                <label class="promo-label">💬 Messaggio WhatsApp — invio promo</label>
                <textarea id="p-msg-wa" class="promo-input" rows="4" style="resize:vertical;font-family:monospace;font-size:12px;"></textarea>
              </div>
              <div style="margin-bottom:14px;">
                <label class="promo-label">⏰ Reminder (promo non usata)</label>
                <textarea id="p-msg-reminder" class="promo-input" rows="3" style="resize:vertical;font-family:monospace;font-size:12px;"></textarea>
              </div>
              <div style="margin-bottom:14px;">
                <label class="promo-label">💀 Messaggio scadenza</label>
                <textarea id="p-msg-scadenza" class="promo-input" rows="3" style="resize:vertical;font-family:monospace;font-size:12px;"></textarea>
              </div>
            </div>

            <!-- TAB: REGOLE -->
            <div data-tab-content-promo="regole" style="display:none;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;" class="promo-grid-2">
                <div>
                  <label class="promo-label">🟢 Solo clienti con questi tag</label>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;max-height:150px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:6px;" id="p-tag-inclusi">
                    ${(tagList||[]).map(t=>`<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;background:#f1f5f9;padding:4px 8px;border-radius:6px;white-space:nowrap;"><input type="checkbox" value="${esc(t.nome)}" class="chk-incl"> ${esc(t.nome)}</label>`).join('')}
                    ${!(tagList||[]).length?'<div style="color:#94a3b8;font-size:12px;">Nessun tag</div>':''}
                  </div>
                </div>
                <div>
                  <label class="promo-label">🔴 Escludi clienti con questi tag</label>
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;max-height:150px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:6px;" id="p-tag-esclusi">
                    ${(tagList||[]).map(t=>`<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;background:#f1f5f9;padding:4px 8px;border-radius:6px;white-space:nowrap;"><input type="checkbox" value="${esc(t.nome)}" class="chk-escl"> ${esc(t.nome)}</label>`).join('')}
                    ${!(tagList||[]).length?'<div style="color:#94a3b8;font-size:12px;">Nessun tag</div>':''}
                  </div>
                </div>
              </div>
              <div style="margin-bottom:14px;">
                <label class="promo-label">📜 Regolamento</label>
                <textarea id="p-regolamento" class="promo-input" rows="4" style="resize:vertical;" placeholder="Regolamento mostrato nella landing in accordion..."></textarea>
              </div>
              <div style="display:flex;gap:16px;flex-wrap:wrap;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" id="p-privacy" checked style="accent-color:#0E5A7A;"> Privacy Policy nel form</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" id="p-consenso" checked style="accent-color:#0E5A7A;"> Consenso marketing nel form</label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" id="p-referral" style="accent-color:#0E5A7A;"> 🔗 Referral attivo</label>
              </div>
            </div>

            <!-- TAB: ANTEPRIMA -->
            <div data-tab-content-promo="preview" style="display:none;">
              <div style="display:flex;gap:24px;align-items:flex-start;justify-content:center;flex-wrap:wrap;">
                <!-- Phone mock -->
                <div>
                  <div style="font-size:12px;font-weight:700;color:#64748b;text-align:center;margin-bottom:8px;">📱 Landing page</div>
                  <div class="preview-phone">
                    <div class="preview-inner" id="preview-landing-inner">
                      <div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Configura la promo per vedere l'anteprima</div>
                    </div>
                  </div>
                </div>
                <!-- Phone mock thank you -->
                <div>
                  <div style="font-size:12px;font-weight:700;color:#64748b;text-align:center;margin-bottom:8px;">🎉 Thank you page</div>
                  <div class="preview-phone">
                    <div class="preview-inner" id="preview-thankyou-inner">
                      <div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Configura la thank you page per vedere l'anteprima</div>
                    </div>
                  </div>
                </div>
              </div>
              <div style="text-align:center;margin-top:16px;">
                <button id="btn-refresh-preview" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 24px;cursor:pointer;font-size:13px;font-weight:700;">🔄 Aggiorna anteprima</button>
              </div>
            </div>

            <!-- Footer modal -->
            <div id="p-esito" style="font-size:13px;min-height:16px;margin-top:16px;margin-bottom:10px;"></div>
            <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid #f1f5f9;padding-top:16px;">
              <button id="btn-salva-promo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:11px 28px;cursor:pointer;font-size:14px;font-weight:700;">💾 Salva promo</button>
              <button id="btn-annulla-promo" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:11px 18px;cursor:pointer;font-size:14px;">Annulla</button>
            </div>
          </div><!-- fine colonna form -->
        </div><!-- fine layout -->
      </div>
    </div>
  `;

  // ── Stato locale ──────────────────────────────────────────
  let giorniSel    = [];
  let turniSel     = [];
  let landingBlocks  = [];
  let thankyouBlocks = [];

  // ── Chips giorni/turni ────────────────────────────────────
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

  // ── Builder blocchi landing ───────────────────────────────
  function renderBlocks(arr, containerId) {
    const el = container.querySelector('#'+containerId);
    if (!arr.length) { el.innerHTML=''; return; }
    el.innerHTML = arr.map((b,idx)=>`
      <div class="block-item">
        <span style="color:#94a3b8;font-size:13px;">${idx+1}.</span>
        <span>${b.label||b.tipo}</span>
        <button data-del="${idx}" data-target="${containerId}" style="background:#fee2e2;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;color:#dc2626;">✕</button>
      </div>`).join('');
    el.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.del);
        if (btn.dataset.target==='landing-blocks') landingBlocks.splice(i,1);
        else thankyouBlocks.splice(i,1);
        renderBlocks(arr, containerId);
      });
    });
  }

  // Pulsanti add landing
  container.querySelectorAll('[data-add-block]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.addBlock);
      landingBlocks.push({ tipo: BLOCK_TYPES[i], label: BLOCK_LABELS[i], contenuto:'' });
      renderBlocks(landingBlocks,'landing-blocks');
    });
  });
  // Pulsanti add thank you
  container.querySelectorAll('[data-add-ty-block]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.addTyBlock);
      thankyouBlocks.push({ tipo: BLOCK_TYPES[i], label: BLOCK_LABELS[i], contenuto:'' });
      renderBlocks(thankyouBlocks,'thankyou-blocks');
    });
  });

  // ── Upload immagine ───────────────────────────────────────
  container.querySelector('#p-immagine-file').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fileName = `promo/${aziendaId}/${Date.now()}-${file.name}`;
    const { error } = await supa().storage.from('immagini-promo').upload(fileName, file, { upsert:true });
    if (error) { mostraToast('Errore upload: '+error.message,'error'); return; }
    const { data: urlData } = supa().storage.from('immagini-promo').getPublicUrl(fileName);
    container.querySelector('#p-immagine-url').value = urlData.publicUrl;
    container.querySelector('#p-immagine-img').src   = urlData.publicUrl;
    container.querySelector('#p-immagine-preview').style.display='';
  });
  container.querySelector('#p-immagine-url').addEventListener('input', e => {
    const url = e.target.value.trim();
    if (url) { container.querySelector('#p-immagine-img').src=url; container.querySelector('#p-immagine-preview').style.display=''; }
  });

  // ── QR Code ───────────────────────────────────────────────
  let qrInstance = null;
  function generaQR(url) {
    const qrEl = container.querySelector('#p-qr-container');
    qrEl.innerHTML = '';
    if (!url || !window.QRCode) return;
    qrInstance = new window.QRCode(qrEl, { text: url, width: 120, height: 120, correctLevel: window.QRCode.CorrectLevel.M });
  }

  function caricaQRLib(url) {
    if (window.QRCode) { generaQR(url); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    s.onload = () => generaQR(url);
    document.head.appendChild(s);
  }

  // ── Preview live ──────────────────────────────────────────
  function buildPreviewHTML(blocks, nome, desc, imgUrl, tipo, valore, codice) {
    const tipoObj = TIPI_PROMO.find(t=>t.v===tipo)||TIPI_PROMO[0];
    const valoreLabel = tipo==='sconto_perc'?`${valore}%`:tipo==='sconto_euro'?`€${valore}`:tipoObj.icon;
    return blocks.map(b => {
      if (b.tipo==='immagine') {
        const src = imgUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400';
        return `<img src="${src}" style="width:100%;height:160px;object-fit:cover;display:block;">`;
      }
      if (b.tipo==='testo') return `<div style="padding:14px;font-size:13px;color:#374151;line-height:1.6;">${esc(nome||'Nome promo')}<br><span style="font-size:12px;color:#64748b;">${esc(desc||'Descrizione...')}</span></div>`;
      if (b.tipo==='box_offerta') return `<div style="margin:12px;background:linear-gradient(135deg,#0E5A7A,#1a8aad);border-radius:14px;padding:18px;color:white;text-align:center;"><div style="font-size:28px;font-weight:900;">${valoreLabel}</div><div style="font-size:13px;margin-top:4px;">${esc(nome||'Offerta')}</div>${codice?`<div style="margin-top:10px;background:rgba(255,255,255,.2);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;letter-spacing:1px;">${esc(codice)}</div>`:''}</div>`;
      if (b.tipo==='valutazioni') return `<div style="padding:12px;text-align:center;"><div style="font-size:18px;color:#f59e0b;">★★★★★</div><div style="font-size:11px;color:#64748b;margin-top:4px;">4.9 · 320 recensioni</div></div>`;
      if (b.tipo==='form') return `<div style="margin:12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px;"><div style="font-size:12px;font-weight:700;margin-bottom:10px;">📋 Scarica la promo</div><div style="background:white;border:1px solid #e5e7eb;border-radius:6px;padding:8px;margin-bottom:6px;font-size:11px;color:#94a3b8;">Il tuo nome</div><div style="background:white;border:1px solid #e5e7eb;border-radius:6px;padding:8px;margin-bottom:6px;font-size:11px;color:#94a3b8;">Telefono</div><div style="background:#0E5A7A;border-radius:8px;padding:10px;text-align:center;color:white;font-size:12px;font-weight:700;">Scarica ora</div></div>`;
      if (b.tipo==='cta_button') return `<div style="margin:12px;"><div style="background:#0E5A7A;border-radius:10px;padding:13px;text-align:center;color:white;font-size:13px;font-weight:700;">${esc(b.contenuto||'CTA')}</div></div>`;
      return '';
    }).join('');
  }

  function aggiornaPreview() {
    const nome   = container.querySelector('#p-nome')?.value||'';
    const desc   = container.querySelector('#p-desc')?.value||'';
    const imgUrl = container.querySelector('#p-immagine-url')?.value||'';
    const tipo   = container.querySelector('#p-tipo')?.value||'sconto_perc';
    const valore = container.querySelector('#p-valore')?.value||'';
    const codice = container.querySelector('#p-codice')?.value||'';

    const landingEl  = container.querySelector('#preview-landing-inner');
    const thankyouEl = container.querySelector('#preview-thankyou-inner');
    if (landingEl)  landingEl.innerHTML  = landingBlocks.length  ? buildPreviewHTML(landingBlocks, nome, desc, imgUrl, tipo, valore, codice)  : '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Nessun blocco</div>';
    if (thankyouEl) thankyouEl.innerHTML = thankyouBlocks.length ? buildPreviewHTML(thankyouBlocks,nome, desc, imgUrl, tipo, valore, codice)  : '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Nessun blocco</div>';
  }

  container.querySelector('#btn-refresh-preview').addEventListener('click', aggiornaPreview);

  // ── Tab interni ───────────────────────────────────────────
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
        if (btn.dataset.tabPromo==='preview') aggiornaPreview();
      });
    });
    if (btns.length) btns[0].click();
  }

  // ── Apri/Chiudi modal ─────────────────────────────────────
  let promoAttiva = null;

  function apriModal(promo = null) {
    promoAttiva = promo;
    landingBlocks  = (promo?.landing_config?.blocks||[]).map(b=>({...b, label: BLOCK_LABELS[BLOCK_TYPES.indexOf(b.tipo)]||b.tipo}));
    thankyouBlocks = (promo?.thankyou_config?.blocks||[]).map(b=>({...b, label: BLOCK_LABELS[BLOCK_TYPES.indexOf(b.tipo)]||b.tipo}));
    giorniSel = promo?.giorni_disponibili ? [...promo.giorni_disponibili] : [];
    turniSel  = promo?.turni ? [...promo.turni] : [];

    container.querySelector('#modal-promo-title').textContent = promo?.id ? 'Modifica promo' : 'Nuova promo';
    container.querySelector('#p-nome').value        = promo?.nome||'';
    container.querySelector('#p-tipo').value        = promo?.tipo||'sconto_perc';
    container.querySelector('#p-valore').value      = promo?.valore||'';
    container.querySelector('#p-codice').value      = promo?.codice||'';
    container.querySelector('#p-desc').value        = promo?.descrizione||'';
    container.querySelector('#p-data-scad').value   = promo?.data_scadenza||'';
    container.querySelector('#p-validita').value    = promo?.validita_giorni||30;
    container.querySelector('#p-nr-disp').value     = promo?.nr_disponibili||'';
    container.querySelector('#p-immagine-url').value= promo?.immagine_url||'';
    if (promo?.immagine_url) { container.querySelector('#p-immagine-img').src=promo.immagine_url; container.querySelector('#p-immagine-preview').style.display=''; }
    else container.querySelector('#p-immagine-preview').style.display='none';
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

    // Link e QR (solo per promo già salvate con ID reale)
    const hasId = promo?.id && !promo._isTemplate;
    const linkSection = container.querySelector('#p-link-section');
    if (hasId) {
      const url = `https://ristoflow-ai.com/promo.html?id=${promo.id}`;
      linkSection.style.display='';
      container.querySelector('#p-link-display').value = url;
      container.querySelector('#p-btn-copy-link').onclick = () => {
        navigator.clipboard?.writeText(url).then(()=>mostraToast('Link copiato!','success'));
      };
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
  }

  function chiudiModal() { container.querySelector('#modal-promo').style.display='none'; }

  // ── Salva promo ───────────────────────────────────────────
  container.querySelector('#btn-salva-promo').addEventListener('click', async () => {
    const esito = container.querySelector('#p-esito');
    const nome  = container.querySelector('#p-nome').value.trim();
    if (!nome) { esito.textContent='❌ Nome obbligatorio'; esito.style.color='#dc2626'; return; }
    esito.textContent='Salvataggio...'; esito.style.color='#64748b';

    const tagInclusi = [...container.querySelectorAll('.chk-incl:checked')].map(c=>c.value);
    const tagEsclusi = [...container.querySelectorAll('.chk-escl:checked')].map(c=>c.value);

    const payload = {
      azienda_id: aziendaId,
      nome,
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
      tag_scaricamento: 'promo_scaricata',
      tag_utilizzata:   'promo_usata',
      tag_scaduta:      'promo_scaduta',
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
      attiva: promoAttiva?.id ? promoAttiva.attiva : true,
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

    chiudiModal();
    renderLista();
    mostraToast('Promo salvata ✅','success');
  });

  container.querySelector('#btn-nuova-promo').addEventListener('click', () => apriModal(null));
  container.querySelector('#btn-chiudi-modal').addEventListener('click', chiudiModal);
  container.querySelector('#btn-annulla-promo').addEventListener('click', chiudiModal);
  container.querySelector('#modal-promo').addEventListener('click', e => { if(e.target===container.querySelector('#modal-promo')) chiudiModal(); });

  // ── Template Benvenuto ────────────────────────────────────
  container.querySelector('#btn-usa-template').addEventListener('click', () => {
    if (!confirm('Aprire il template "2x1 sul piatto forte" preimpostato? Potrai personalizzarlo e poi salvarlo.')) return;
    apriModal({ ...PROMO_BENVENUTO_TEMPLATE, id: null, _isTemplate: true });
  });

  // ── Render lista ──────────────────────────────────────────
  function renderLista() {
    const el = container.querySelector('#lista-promo');
    if (!lista.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:48px 24px;color:#94a3b8;background:white;border:2px dashed #e5e7eb;border-radius:14px;">
          <div style="font-size:40px;margin-bottom:12px;">🎁</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:6px;">Nessuna promo ancora</div>
          <div style="font-size:13px;margin-bottom:16px;">Usa il template Benvenuto 2x1 già pronto — la promo più potente per acquisire nuovi clienti.</div>
        </div>`;
      return;
    }
    el.innerHTML = lista.map(p => {
      const tipo = TIPI_PROMO.find(t=>t.v===p.tipo)||TIPI_PROMO[0];
      const valore = p.tipo==='sconto_perc'?`${p.valore}%`:p.tipo==='sconto_euro'?`€${p.valore}`:tipo.icon;
      const giorniLabel = p.giorni_disponibili?.length ? p.giorni_disponibili.map(g=>GIORNI_NOMI[g-1]).join(', ') : null;
      const turniLabel  = p.turni?.length ? p.turni.map(t=>t==='pranzo'?'Pranzo':'Cena').join(' + ') : null;
      return `
        <div class="promo-card">
          <div style="display:flex;align-items:stretch;">
            ${p.immagine_url
              ? `<img src="${esc(p.immagine_url)}" style="width:110px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">`
              : `<div style="width:110px;background:linear-gradient(135deg,#0E5A7A,#1a8aad);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:34px;">${tipo.icon}</div>`}
            <div style="flex:1;padding:14px 16px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                <div>
                  <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(p.nome)}</div>
                  <div style="font-size:13px;color:#64748b;margin-top:2px;">${tipo.l} · <strong style="color:#0E5A7A;">${valore}</strong> · ${p.validita_giorni||30}gg</div>
                  ${p.descrizione?`<div style="font-size:12px;color:#94a3b8;margin-top:4px;">${esc(p.descrizione)}</div>`:''}
                  ${giorniLabel||turniLabel?`<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
                    ${giorniLabel?`<span style="background:#f0f9ff;border:1px solid #bae6fd;color:#0E5A7A;border-radius:10px;padding:2px 10px;font-size:11px;font-weight:600;">📅 ${giorniLabel}</span>`:''}
                    ${turniLabel ?`<span style="background:#fef3c7;border:1px solid #fde68a;color:#d97706;border-radius:10px;padding:2px 10px;font-size:11px;font-weight:600;">🕐 ${turniLabel}</span>`:''}
                  </div>`:''}
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                  <button data-toggle-promo="${p.id}" class="toggle-btn ${p.attiva?'attiva':'inattiva'}">${p.attiva?'✅ Attiva':'⏸ Disattiva'}</button>
                  <button data-copy-url="https://ristoflow-ai.com/promo.html?id=${p.id}" style="background:#f0f9ff;border:1px solid #bae6fd;color:#0E5A7A;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;font-weight:600;">🔗 Link</button>
                  <button data-edit-promo="${p.id}" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;">✏️ Modifica</button>
                  <button data-del-promo="${p.id}" style="background:#fee2e2;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;color:#dc2626;">🗑</button>
                </div>
              </div>
              <div style="display:flex;gap:16px;margin-top:10px;font-size:12px;color:#64748b;flex-wrap:wrap;">
                ${p.nr_disponibili?`<span>📦 ${p.nr_disponibili-(p.nr_utilizzate||0)} rimaste su ${p.nr_disponibili}</span>`:''}
                ${p.data_scadenza?`<span>📅 Scade: ${new Date(p.data_scadenza).toLocaleDateString('it-IT')}</span>`:''}
                ${p.referral_attivo?`<span>🔗 Referral</span>`:''}
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
        renderLista();
        mostraToast('Promo eliminata','success');
      });
    });
    el.querySelectorAll('[data-toggle-promo]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const p = lista.find(x=>x.id===btn.dataset.togglePromo); if (!p) return;
        const nuovo = !p.attiva;
        const { error } = await supa().from('promo').update({ attiva: nuovo }).eq('id', p.id);
        if (error) { mostraToast('Errore: '+error.message,'error'); return; }
        p.attiva = nuovo;
        btn.textContent = nuovo ? '✅ Attiva' : '⏸ Disattiva';
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
