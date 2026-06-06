// js/views/bo/bo-promo.js
// Gestione promo — file dedicato
// Incluso in bo-marketing.js come sezione

const SUPABASE_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co';
const supa = () => window.supabaseClient || window.supabase;

function esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function mostraToast(msg, tipo='success') { if(window.mostraToast) window.mostraToast(msg,tipo); }

const TIPI_PROMO = [
  { v:'sconto_perc', l:'Sconto %',  icon:'%' },
  { v:'sconto_euro', l:'Sconto €',  icon:'€' },
  { v:'omaggio',     l:'Omaggio',   icon:'🎁' },
  { v:'2x1',         l:'2x1',       icon:'2×1' },
];

export async function renderPromo(container, aziendaId) {
  container.innerHTML = '<div style="color:#94a3b8;padding:20px;">Caricamento...</div>';

  const [{ data: promoList }, { data: tagList }] = await Promise.all([
    supa().from('promo').select('*').eq('azienda_id', aziendaId).order('created_at', { ascending: false }),
    supa().from('tags').select('id,nome').eq('azienda_id', aziendaId).order('nome'),
  ]);

  container.innerHTML = `
    <style>
      .promo-input { padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;background:white;outline:none; }
      .promo-input:focus { border-color:#0E5A7A; }
      .promo-label { font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px; }
      .promo-card { background:white;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;margin-bottom:12px;transition:box-shadow .15s; }
      .promo-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.08); }
      @media(max-width:640px) { .promo-grid-2 { grid-template-columns:1fr!important; } }
    </style>

    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:20px;">
      <div>
        <div style="font-size:18px;font-weight:700;color:#0f172a;">🎁 Promo & Offerte</div>
        <div style="font-size:13px;color:#64748b;">Crea promo personalizzate — landing, tracking Meta, referral</div>
      </div>
      <button id="btn-nuova-promo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:700;">+ Nuova promo</button>
    </div>

    <!-- Lista promo -->
    <div id="lista-promo"></div>

    <!-- Modal editor promo -->
    <div id="modal-promo" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;overflow-y:auto;padding:16px;box-sizing:border-box;">
      <div style="background:white;border-radius:20px;max-width:780px;margin:0 auto;">

        <!-- Header modal -->
        <div style="background:linear-gradient(135deg,#0E5A7A,#1a8aad);color:white;padding:20px 24px;border-radius:20px 20px 0 0;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:17px;font-weight:700;" id="modal-promo-title">Nuova promo</div>
          <button id="btn-chiudi-modal" style="background:rgba(255,255,255,.2);border:none;color:white;border-radius:8px;padding:6px 14px;cursor:pointer;">✕ Chiudi</button>
        </div>

        <div style="padding:20px;">

          <!-- Tab interni -->
          <div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;margin-bottom:20px;overflow-x:auto;">
            ${[
              {id:'info',     l:'📋 Info base'},
              {id:'visual',   l:'🖼 Visual & Landing'},
              {id:'tracking', l:'📊 Tracking'},
              {id:'messaggi', l:'💬 Messaggi'},
              {id:'regole',   l:'⚙️ Regole'},
            ].map(t=>`<button data-tab-promo="${t.id}" style="padding:9px 14px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;border-bottom:2px solid transparent;white-space:nowrap;">${t.l}</button>`).join('')}
          </div>

          <!-- TAB: INFO BASE -->
          <div data-tab-content-promo="info">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;" class="promo-grid-2">
              <div>
                <label class="promo-label">Nome promo *</label>
                <input id="p-nome" class="promo-input" placeholder="Es. Benvenuto 10%">
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
                <label class="promo-label">Codice promo (opzionale)</label>
                <input id="p-codice" class="promo-input" placeholder="Es. BENVENUTO10">
              </div>
            </div>
            <div style="margin-bottom:14px;">
              <label class="promo-label">Descrizione breve</label>
              <textarea id="p-desc" class="promo-input" rows="2" style="resize:vertical;" placeholder="Descrizione visibile al cliente nella landing..."></textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;" class="promo-grid-2">
              <div>
                <label class="promo-label">Data scadenza</label>
                <input id="p-data-scad" type="date" class="promo-input">
              </div>
              <div>
                <label class="promo-label">Oppure: validità (giorni)</label>
                <input id="p-validita" type="number" min="1" value="30" class="promo-input">
              </div>
              <div>
                <label class="promo-label">Nr. promo disponibili</label>
                <input id="p-nr-disp" type="number" min="0" class="promo-input" placeholder="Lascia vuoto = illimitato">
              </div>
            </div>
          </div>

          <!-- TAB: VISUAL & LANDING -->
          <div data-tab-content-promo="visual" style="display:none;">
            <div style="margin-bottom:14px;">
              <label class="promo-label">Immagine promo (URL o upload)</label>
              <div style="display:flex;gap:8px;align-items:flex-end;">
                <input id="p-immagine-url" class="promo-input" placeholder="https://... oppure carica sotto" style="flex:1;">
                <label style="background:#f1f5f9;border:1px solid #e5e7eb;border-radius:8px;padding:9px 14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
                  📎 Carica
                  <input type="file" id="p-immagine-file" accept="image/*" style="display:none;">
                </label>
              </div>
              <div id="p-immagine-preview" style="margin-top:10px;display:none;">
                <img id="p-immagine-img" src="" style="max-width:100%;max-height:200px;border-radius:10px;object-fit:cover;">
              </div>
            </div>
            <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:14px;">
              <div style="font-size:13px;font-weight:700;margin-bottom:10px;">🏗 Builder landing draggable</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:12px;">Trascina i blocchi per costruire la landing della promo. I clienti vedranno questa pagina quando aprono il link WhatsApp.</div>
              <div id="landing-builder" style="min-height:100px;border:2px dashed #e5e7eb;border-radius:10px;padding:12px;">
                <div id="landing-blocks" style="margin-bottom:10px;"></div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${['🖼 Immagine','📝 Testo','🎁 Box offerta','⭐ Valutazioni','📋 Form','🔘 CTA Button'].map((b,i)=>`<button data-add-block="${i}" style="background:white;border:1px solid #e5e7eb;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:11px;">${b}</button>`).join('')}
                </div>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:8px;">Il form include automaticamente: Nome, Telefono, Privacy policy e Consenso marketing (se abilitati)</div>
            </div>
          </div>

          <!-- TAB: TRACKING -->
          <div data-tab-content-promo="tracking" style="display:none;">
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;margin-bottom:16px;">
              <div style="font-size:13px;font-weight:700;color:#ea580c;margin-bottom:8px;">📊 Meta Pixel & Tag Manager</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="promo-grid-2">
                <div>
                  <label class="promo-label">Meta Pixel ID</label>
                  <input id="p-pixel-id" class="promo-input" placeholder="Es. 924572413940466">
                </div>
                <div>
                  <label class="promo-label">Google Tag Manager ID</label>
                  <input id="p-gtm-id" class="promo-input" placeholder="Es. GTM-XXXXXXX">
                </div>
              </div>
            </div>
            <div style="font-size:13px;font-weight:700;margin-bottom:10px;">📌 Eventi tracciati automaticamente</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;" class="promo-grid-2">
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;">
                <div style="font-size:11px;font-weight:700;color:#15803d;margin-bottom:6px;">⬇️ SCARICAMENTO</div>
                <label class="promo-label">Nome evento</label>
                <input id="p-tag-scaricamento" class="promo-input" value="Lead" placeholder="Lead">
                <div style="font-size:11px;color:#64748b;margin-top:6px;">Fired quando il cliente scarica/accetta la promo</div>
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
            <div style="font-size:12px;color:#64748b;margin-bottom:14px;">Puoi usare: {{nome}}, {{promo_nome}}, {{promo_valore}}, {{scadenza}}, {{codice}}, {{link_promo}}</div>
            <div style="margin-bottom:14px;">
              <label class="promo-label">💬 Messaggio WhatsApp — invio promo</label>
              <textarea id="p-msg-wa" class="promo-input" rows="3" style="resize:vertical;font-family:monospace;font-size:12px;" placeholder="Ciao {{nome}}! 🎁 Hai una promo esclusiva per te: {{promo_nome}}&#10;Valore: {{promo_valore}}&#10;Scade il: {{scadenza}}&#10;&#10;👉 Scaricala qui: {{link_promo}}"></textarea>
            </div>
            <div style="margin-bottom:14px;">
              <label class="promo-label">⏰ Messaggio reminder (promo non usata)</label>
              <textarea id="p-msg-reminder" class="promo-input" rows="3" style="resize:vertical;font-family:monospace;font-size:12px;" placeholder="Ciao {{nome}}! La tua promo {{promo_nome}} sta per scadere 😱&#10;Hai ancora tempo fino al {{scadenza}}.&#10;👉 {{link_promo}}"></textarea>
            </div>
            <div style="margin-bottom:14px;">
              <label class="promo-label">💀 Messaggio scadenza</label>
              <textarea id="p-msg-scadenza" class="promo-input" rows="3" style="resize:vertical;font-family:monospace;font-size:12px;" placeholder="Ciao {{nome}}, purtroppo la tua promo {{promo_nome}} è scaduta.&#10;Ma abbiamo qualcosa di nuovo per te..."></textarea>
            </div>
          </div>

          <!-- TAB: REGOLE -->
          <div data-tab-content-promo="regole" style="display:none;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;" class="promo-grid-2">
              <div>
                <label class="promo-label">🟢 Invia SOLO a clienti con questi tag</label>
                <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;max-height:150px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:6px;" id="p-tag-inclusi">
                  ${(tagList||[]).map(t=>`<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;background:#f1f5f9;padding:4px 8px;border-radius:6px;white-space:nowrap;"><input type="checkbox" value="${esc(t.nome)}" class="chk-incl"> ${esc(t.nome)}</label>`).join('')}
                  ${!(tagList||[]).length ? '<div style="color:#94a3b8;font-size:12px;">Nessun tag configurato</div>' : ''}
                </div>
              </div>
              <div>
                <label class="promo-label">🔴 NON inviare a clienti con questi tag</label>
                <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;max-height:150px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:6px;" id="p-tag-esclusi">
                  ${(tagList||[]).map(t=>`<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;background:#f1f5f9;padding:4px 8px;border-radius:6px;white-space:nowrap;"><input type="checkbox" value="${esc(t.nome)}" class="chk-escl"> ${esc(t.nome)}</label>`).join('')}
                  ${!(tagList||[]).length ? '<div style="color:#94a3b8;font-size:12px;">Nessun tag configurato</div>' : ''}
                </div>
              </div>
            </div>
            <div style="margin-bottom:14px;">
              <label class="promo-label">📜 Regolamento</label>
              <textarea id="p-regolamento" class="promo-input" rows="4" style="resize:vertical;" placeholder="Inserisci qui il regolamento della promo (verrà mostrato nella landing)..."></textarea>
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px;">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                <input type="checkbox" id="p-privacy" checked style="accent-color:#0E5A7A;">
                Richiedi accettazione Privacy Policy nel form
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                <input type="checkbox" id="p-consenso" checked style="accent-color:#0E5A7A;">
                Richiedi consenso marketing nel form
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
                <input type="checkbox" id="p-referral" style="accent-color:#0E5A7A;">
                🔗 Abilita referral (il cliente può girare la promo a un amico)
              </label>
            </div>
          </div>

          <!-- Footer modal -->
          <div id="p-esito" style="font-size:13px;min-height:16px;margin-bottom:10px;"></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;border-top:1px solid #f1f5f9;padding-top:16px;margin-top:8px;">
            <button id="btn-salva-promo" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:11px 28px;cursor:pointer;font-size:14px;font-weight:700;">💾 Salva promo</button>
            <button id="btn-annulla-promo" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:11px 18px;cursor:pointer;font-size:14px;">Annulla</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Render lista promo ─────────────────────────────────────
  function renderLista() {
    const el = container.querySelector('#lista-promo');
    if (!promoList?.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:48px 24px;color:#94a3b8;background:white;border:2px dashed #e5e7eb;border-radius:14px;">
          <div style="font-size:40px;margin-bottom:12px;">🎁</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:6px;">Nessuna promo ancora</div>
          <div style="font-size:13px;">Crea la tua prima promo per iniziare a fidelizzare i clienti</div>
        </div>`;
      return;
    }
    el.innerHTML = promoList.map(p => {
      const tipo = TIPI_PROMO.find(t=>t.v===p.tipo)||TIPI_PROMO[0];
      const valore = p.tipo==='sconto_perc' ? `${p.valore}%` : p.tipo==='sconto_euro' ? `€${p.valore}` : tipo.icon;
      const landingUrl = `${window.location.origin}/promo.html?id=${p.id}`;
      return `
        <div class="promo-card">
          <div style="display:flex;gap:0;align-items:stretch;">
            ${p.immagine_url ? `<img src="${esc(p.immagine_url)}" style="width:120px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">` : `<div style="width:120px;background:linear-gradient(135deg,#0E5A7A,#1a8aad);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><div style="font-size:36px;">${tipo.icon}</div></div>`}
            <div style="flex:1;padding:14px 16px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                <div>
                  <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(p.nome)}</div>
                  <div style="font-size:13px;color:#64748b;margin-top:2px;">${tipo.l} · <strong style="color:#0E5A7A;">${valore}</strong> · ${p.validita_giorni||30} giorni</div>
                  ${p.descrizione ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px;">${esc(p.descrizione)}</div>` : ''}
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                  <span style="background:${p.attiva?'#dcfce7':'#fee2e2'};color:${p.attiva?'#15803d':'#dc2626'};padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;">${p.attiva?'✅ Attiva':'⏸ Disattiva'}</span>
                  <button data-copy-url="${landingUrl}" style="background:#f0f9ff;border:1px solid #bae6fd;color:#0E5A7A;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;font-weight:600;">🔗 Link</button>
                  <button data-edit-promo="${p.id}" style="background:#f1f5f9;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;">✏️ Modifica</button>
                  <button data-del-promo="${p.id}" style="background:#fee2e2;border:none;border-radius:8px;padding:5px 10px;cursor:pointer;font-size:11px;color:#dc2626;">🗑</button>
                </div>
              </div>
              <div style="display:flex;gap:16px;margin-top:10px;font-size:12px;color:#64748b;">
                ${p.nr_disponibili ? `<span>📦 ${p.nr_disponibili - (p.nr_utilizzate||0)} rimaste su ${p.nr_disponibili}</span>` : ''}
                ${p.data_scadenza ? `<span>📅 Scade: ${new Date(p.data_scadenza).toLocaleDateString('it-IT')}</span>` : ''}
                ${p.referral_attivo ? `<span>🔗 Referral attivo</span>` : ''}
                ${p.meta_pixel_id ? `<span>📊 Pixel: ${esc(p.meta_pixel_id)}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('[data-copy-url]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard?.writeText(btn.dataset.copyUrl).then(()=>mostraToast('Link copiato!','success'));
      });
    });
    el.querySelectorAll('[data-edit-promo]').forEach(btn => {
      btn.addEventListener('click', () => apriModal(promoList.find(p=>p.id===btn.dataset.editPromo)));
    });
    el.querySelectorAll('[data-del-promo]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questa promo?')) return;
        await supa().from('promo').delete().eq('id', btn.dataset.delPromo);
        const idx = promoList.findIndex(p=>p.id===btn.dataset.delPromo);
        if (idx>=0) promoList.splice(idx,1);
        renderLista();
        mostraToast('Promo eliminata','success');
      });
    });
  }

  // ── Tab interni modal ─────────────────────────────────────
  function initTabs() {
    const btns = container.querySelectorAll('[data-tab-promo]');
    const contents = container.querySelectorAll('[data-tab-content-promo]');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => { b.style.color='#64748b'; b.style.borderBottomColor='transparent'; });
        contents.forEach(c => c.style.display='none');
        btn.style.color='#0E5A7A'; btn.style.borderBottomColor='#0E5A7A';
        container.querySelector(`[data-tab-content-promo="${btn.dataset.tabPromo}"]`).style.display='';
      });
    });
    // Attiva primo tab
    if (btns.length) btns[0].click();
  }

  // ── Upload immagine ──────────────────────────────────────
  container.querySelector('#p-immagine-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      // Upload su Supabase Storage
      const fileName = `promo/${aziendaId}/${Date.now()}-${file.name}`;
      const { data, error } = await supa().storage.from('immagini-promo').upload(fileName, file, { upsert: true });
      if (error) { mostraToast('Errore upload: '+error.message,'error'); return; }
      const { data: urlData } = supa().storage.from('immagini-promo').getPublicUrl(fileName);
      container.querySelector('#p-immagine-url').value = urlData.publicUrl;
      container.querySelector('#p-immagine-img').src = urlData.publicUrl;
      container.querySelector('#p-immagine-preview').style.display='';
    };
    reader.readAsDataURL(file);
  });

  container.querySelector('#p-immagine-url').addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url) {
      container.querySelector('#p-immagine-img').src = url;
      container.querySelector('#p-immagine-preview').style.display='';
    }
  });

  // ── Builder landing blocks ───────────────────────────────
  let landingBlocks = [];
  const BLOCK_TYPES = ['immagine','testo','box_offerta','valutazioni','form','cta_button'];
  
  container.querySelectorAll('[data-add-block]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tipo = BLOCK_TYPES[parseInt(btn.dataset.addBlock)];
      landingBlocks.push({ tipo, contenuto: '' });
      renderLandingBlocks();
    });
  });

  function renderLandingBlocks() {
    const el = container.querySelector('#landing-blocks');
    if (!landingBlocks.length) { el.innerHTML=''; return; }
    el.innerHTML = landingBlocks.map((b, idx) => `
      <div draggable="true" data-block-idx="${idx}" style="background:white;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:8px;cursor:grab;">
        <span style="color:#94a3b8;font-size:16px;">⠿</span>
        <span style="flex:1;font-size:12px;font-weight:600;">${btn.textContent||b.tipo}</span>
        <button data-del-block="${idx}" style="background:#fee2e2;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;color:#dc2626;">✕</button>
      </div>
    `).join('');
    el.querySelectorAll('[data-del-block]').forEach(b => {
      b.addEventListener('click', () => { landingBlocks.splice(parseInt(b.dataset.delBlock),1); renderLandingBlocks(); });
    });
  }

  // ── Apri/Chiudi modal ────────────────────────────────────
  let promoAttiva = null;

  function apriModal(promo = null) {
    promoAttiva = promo;
    landingBlocks = promo?.landing_config?.blocks || [];
    container.querySelector('#modal-promo-title').textContent = promo ? 'Modifica promo' : 'Nuova promo';
    container.querySelector('#p-nome').value = promo?.nome||'';
    container.querySelector('#p-tipo').value = promo?.tipo||'sconto_perc';
    container.querySelector('#p-valore').value = promo?.valore||'';
    container.querySelector('#p-codice').value = promo?.codice||'';
    container.querySelector('#p-desc').value = promo?.descrizione||'';
    container.querySelector('#p-data-scad').value = promo?.data_scadenza||'';
    container.querySelector('#p-validita').value = promo?.validita_giorni||30;
    container.querySelector('#p-nr-disp').value = promo?.nr_disponibili||'';
    container.querySelector('#p-immagine-url').value = promo?.immagine_url||'';
    if (promo?.immagine_url) { container.querySelector('#p-immagine-img').src=promo.immagine_url; container.querySelector('#p-immagine-preview').style.display=''; }
    else container.querySelector('#p-immagine-preview').style.display='none';
    container.querySelector('#p-pixel-id').value = promo?.meta_pixel_id||'';
    container.querySelector('#p-gtm-id').value = promo?.landing_config?.gtm_id||'';
    container.querySelector('#p-tag-scaricamento').value = promo?.meta_pixel_evento_scaricamento||'Lead';
    container.querySelector('#p-tag-utilizzata').value = promo?.meta_pixel_evento_uso||'Purchase';
    container.querySelector('#p-tag-scaduta').value = promo?.meta_pixel_evento_scaduto||'PromoExpired';
    container.querySelector('#p-msg-wa').value = promo?.messaggio_wa||'';
    container.querySelector('#p-msg-reminder').value = promo?.messaggio_reminder||'';
    container.querySelector('#p-msg-scadenza').value = promo?.messaggio_scadenza||'';
    container.querySelector('#p-regolamento').value = promo?.regolamento||'';
    container.querySelector('#p-privacy').checked = promo?.privacy_richiesta ?? true;
    container.querySelector('#p-consenso').checked = promo?.consenso_marketing ?? true;
    container.querySelector('#p-referral').checked = promo?.referral_attivo ?? false;
    // Tag
    container.querySelectorAll('.chk-incl').forEach(c => c.checked = (promo?.tag_inclusi||[]).includes(c.value));
    container.querySelectorAll('.chk-escl').forEach(c => c.checked = (promo?.tag_esclusi||[]).includes(c.value));
    renderLandingBlocks();
    container.querySelector('#p-esito').textContent='';
    container.querySelector('#modal-promo').style.display='';
    initTabs();
  }

  function chiudiModal() {
    container.querySelector('#modal-promo').style.display='none';
  }

  // ── Salva promo ──────────────────────────────────────────
  container.querySelector('#btn-salva-promo').addEventListener('click', async () => {
    const esito = container.querySelector('#p-esito');
    const nome = container.querySelector('#p-nome').value.trim();
    if (!nome) { esito.textContent='❌ Nome obbligatorio'; esito.style.color='#dc2626'; return; }
    esito.textContent='Salvataggio...'; esito.style.color='#64748b';

    const tagInclusi = [...container.querySelectorAll('.chk-incl:checked')].map(c=>c.value);
    const tagEsclusi = [...container.querySelectorAll('.chk-escl:checked')].map(c=>c.value);
    const gtmId = container.querySelector('#p-gtm-id').value.trim();

    const payload = {
      azienda_id: aziendaId,
      nome,
      descrizione: container.querySelector('#p-desc').value.trim()||null,
      tipo: container.querySelector('#p-tipo').value,
      valore: parseFloat(container.querySelector('#p-valore').value)||null,
      codice: container.querySelector('#p-codice').value.trim()||null,
      data_scadenza: container.querySelector('#p-data-scad').value||null,
      validita_giorni: parseInt(container.querySelector('#p-validita').value)||30,
      nr_disponibili: parseInt(container.querySelector('#p-nr-disp').value)||null,
      immagine_url: container.querySelector('#p-immagine-url').value.trim()||null,
      meta_pixel_id: container.querySelector('#p-pixel-id').value.trim()||null,
      meta_pixel_evento_scaricamento: container.querySelector('#p-tag-scaricamento').value.trim()||'Lead',
      meta_pixel_evento_uso: container.querySelector('#p-tag-utilizzata').value.trim()||'Purchase',
      meta_pixel_evento_scaduto: container.querySelector('#p-tag-scaduta').value.trim()||'PromoExpired',
      tag_scaricamento: container.querySelector('#p-tag-scaricamento').value.trim()||'promo_scaricata',
      tag_utilizzata: container.querySelector('#p-tag-utilizzata').value.trim()||'promo_usata',
      tag_scaduta: container.querySelector('#p-tag-scaduta').value.trim()||'promo_scaduta',
      messaggio_wa: container.querySelector('#p-msg-wa').value.trim()||null,
      messaggio_reminder: container.querySelector('#p-msg-reminder').value.trim()||null,
      messaggio_scadenza: container.querySelector('#p-msg-scadenza').value.trim()||null,
      regolamento: container.querySelector('#p-regolamento').value.trim()||null,
      privacy_richiesta: container.querySelector('#p-privacy').checked,
      consenso_marketing: container.querySelector('#p-consenso').checked,
      referral_attivo: container.querySelector('#p-referral').checked,
      tag_inclusi: tagInclusi.length ? tagInclusi : null,
      tag_esclusi: tagEsclusi.length ? tagEsclusi : null,
      landing_config: { blocks: landingBlocks, gtm_id: gtmId||null },
      attiva: true,
    };

    if (promoAttiva?.id) {
      const { error } = await supa().from('promo').update(payload).eq('id', promoAttiva.id);
      if (error) { esito.textContent='❌ '+error.message; esito.style.color='#dc2626'; return; }
      const idx = promoList.findIndex(p=>p.id===promoAttiva.id);
      if (idx>=0) promoList[idx] = { ...promoAttiva, ...payload };
    } else {
      const { data, error } = await supa().from('promo').insert(payload).select('*').single();
      if (error) { esito.textContent='❌ '+error.message; esito.style.color='#dc2626'; return; }
      promoList.unshift(data);
    }

    chiudiModal();
    renderLista();
    mostraToast('Promo salvata ✅','success');
  });

  container.querySelector('#btn-nuova-promo').addEventListener('click', () => apriModal(null));
  container.querySelector('#btn-chiudi-modal').addEventListener('click', chiudiModal);
  container.querySelector('#btn-annulla-promo').addEventListener('click', chiudiModal);
  container.querySelector('#modal-promo').addEventListener('click', e => { if(e.target===container.querySelector('#modal-promo')) chiudiModal(); });

  renderLista();
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML='<div style="padding:20px;color:#dc2626;">Azienda non selezionata</div>'; return; }
  await renderPromo(container, aziendaId);
}
