// js/views/bo/bo-tag.js
// Gestione Tag + Sistema LTV — tag sistema / tag custom / configurazione soglie / LTV

import { LTV_LIVELLI, badgeLTV, calcolaLivelloLocale, caricaConfigLTV, salvaConfigLTV, ricalcolaLTVAzienda } from '../../utils/ltv.js';

const supa = () => window.supabaseClient || window.supabase;

const DEFAULT_SOGLIE_TAG = {
  vip:         { soglia_visite: 3, soglia_giorni_visite: 30 },
  inattivo:    { soglia_inattivo_giorni: 45 },
  big_spender: { soglia_importo_min: 500, soglia_importo_giorni: 90 },
  wine_lover:  { soglia_categoria: 'bollicine' },
};

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

  const [
    { data: tagSistema },
    { data: tagCustom },
    { data: configTag },
    configLTV,
  ] = await Promise.all([
    supa().from('ristoflow_tag_sistema').select('*').eq('attivo', true).order('ordine'),
    supa().from('contatti_tag_custom').select('*').eq('azienda_id', aziendaId).eq('attivo', true).order('label'),
    supa().from('tag_configurazione_azienda').select('*').eq('azienda_id', aziendaId),
    caricaConfigLTV(aziendaId),
  ]);

  const sistema   = tagSistema  || [];
  const custom    = tagCustom   || [];
  const configMap = Object.fromEntries((configTag || []).map(c => [c.tag_nome, c]));

  function buildLTVPreview(cfg) {
    return Object.entries(LTV_LIVELLI).map(([nome, l]) => {
      let soglia = '';
      if      (nome === 'nuovo')       soglia = `< ${cfg.min_visite} visite o spesa < €${cfg.min_spesa || 0}`;
      else if (nome === 'occasionale') soglia = `≥ €${cfg.soglia_occasionale}/visita`;
      else if (nome === 'abituale')    soglia = `≥ €${cfg.soglia_abituale}/visita`;
      else if (nome === 'fedele')      soglia = `≥ €${cfg.soglia_fedele}/visita`;
      else if (nome === 'vip')         soglia = `≥ €${cfg.soglia_vip}/visita`;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid #f1f5f9;">
          <div style="font-size:22px;width:32px;text-align:center;">${l.emoji}</div>
          <div style="flex:1;font-weight:600;font-size:13px;color:#0f172a;">${l.label}</div>
          <div style="font-size:12px;color:#64748b;text-align:right;">${soglia}</div>
        </div>`;
    }).join('');
  }

  container.innerHTML = `
    <style>
      .rf-tab{display:none}.rf-tab.attiva{display:block}
      .rf-nav-btn{background:none;border:none;padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;transition:all .2s}
      .rf-nav-btn.attiva{color:#0E5A7A;border-bottom-color:#0E5A7A}
      .rf-nav-btn:hover:not(.attiva){color:#0E5A7A}
      .input{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:14px;outline:none;transition:border .2s;font-family:inherit;background:white}
      .input:focus{border-color:#0E5A7A}
      .input-sm{border:1px solid #e2e8f0;border-radius:8px;padding:5px 8px;font-size:13px;outline:none;transition:border .2s;font-family:inherit;background:white;width:80px;text-align:center}
      .input-sm:focus{border-color:#0E5A7A}
      .card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px}
      .lbl{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px}
      .toggle{position:relative;display:inline-block;width:40px;height:22px}
      .toggle input{opacity:0;width:0;height:0}
      .toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#cbd5e1;border-radius:22px;transition:.3s}
      .toggle-slider:before{position:absolute;content:"";height:16px;width:16px;left:3px;bottom:3px;background:white;border-radius:50%;transition:.3s}
      .toggle input:checked+.toggle-slider{background:#0E5A7A}
      .toggle input:checked+.toggle-slider:before{transform:translateX(18px)}
      .tag-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;margin:3px}
      .ltv-soglia-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 0;border-bottom:0.5px solid #f8fafc}
      .info-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1d4ed8;line-height:1.5}
    </style>

    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:820px;margin:0 auto;">

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:0;">
          <div style="width:40px;height:40px;background:linear-gradient(135deg,#0E5A7A,#1a8fb5);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">🏷️</div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">Tag & LTV</div>
            <div style="font-size:13px;color:#64748b;">Tag comportamentali, personalizzati e livelli fedeltà cliente</div>
          </div>
        </div>

        <div style="display:flex;border-bottom:1px solid #e5e7eb;margin:16px 0 20px;overflow-x:auto;">
          <button class="rf-nav-btn attiva" data-tab="tab-ltv">💎 Livelli LTV</button>
          <button class="rf-nav-btn" data-tab="tab-sistema">⚙️ Tag sistema</button>
          <button class="rf-nav-btn" data-tab="tab-custom">✏️ Tag personalizzati</button>
          <button class="rf-nav-btn" data-tab="tab-panoramica">👁 Panoramica</button>
        </div>

        <!-- TAB LTV -->
        <div id="tab-ltv" class="rf-tab attiva">
          <div class="info-box">
            💎 Il <strong>livello LTV</strong> si calcola sulla <strong>media €/visita</strong> di ogni cliente nella finestra impostata. Appare accanto al nome del cliente in tutto il gestionale.
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;" id="ltv-grid">

            <div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">Configurazione</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:14px;">Imposta le soglie per il tuo ristorante</div>

              <div class="card" style="margin-bottom:12px;">
                <div class="lbl">Finestra di calcolo</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                  <input type="number" id="ltv-finestra" min="0" max="60" value="${configLTV.finestra_mesi}" class="input-sm">
                  <span style="font-size:13px;color:#374151;">mesi di storico</span>
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:4px;">0 = tutto lo storico</div>
              </div>

              <div class="card" style="margin-bottom:12px;">
                <div class="lbl">Requisiti minimi per qualificarsi</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;">
                  <span style="font-size:13px;color:#374151;">Almeno</span>
                  <input type="number" id="ltv-min-visite" min="1" max="20" value="${configLTV.min_visite}" class="input-sm">
                  <span style="font-size:13px;color:#374151;">visite</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap;">
                  <span style="font-size:13px;color:#374151;">Spesa min. €</span>
                  <input type="number" id="ltv-min-spesa" min="0" value="${configLTV.min_spesa}" class="input-sm">
                  <span style="font-size:13px;color:#374151;">nella finestra</span>
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Sotto questi minimi il cliente resta 🌱 Nuovo</div>
              </div>

              <div class="card">
                <div class="lbl">Soglie media €/visita</div>
                <div class="ltv-soglia-row">
                  <div style="font-size:22px;width:32px;text-align:center;">☕</div>
                  <span style="font-size:13px;color:#374151;flex:1;">Occasionale da €</span>
                  <input type="number" id="ltv-soglia-occasionale" min="0" value="${configLTV.soglia_occasionale}" class="input-sm">
                </div>
                <div class="ltv-soglia-row">
                  <div style="font-size:22px;width:32px;text-align:center;">🍽️</div>
                  <span style="font-size:13px;color:#374151;flex:1;">Abituale da €</span>
                  <input type="number" id="ltv-soglia-abituale" min="0" value="${configLTV.soglia_abituale}" class="input-sm">
                </div>
                <div class="ltv-soglia-row">
                  <div style="font-size:22px;width:32px;text-align:center;">⭐</div>
                  <span style="font-size:13px;color:#374151;flex:1;">Fedele da €</span>
                  <input type="number" id="ltv-soglia-fedele" min="0" value="${configLTV.soglia_fedele}" class="input-sm">
                </div>
                <div class="ltv-soglia-row" style="border-bottom:none;">
                  <div style="font-size:22px;width:32px;text-align:center;">💎</div>
                  <span style="font-size:13px;color:#374151;flex:1;">VIP da €</span>
                  <input type="number" id="ltv-soglia-vip" min="0" value="${configLTV.soglia_vip}" class="input-sm">
                </div>
              </div>

              <div id="ltv-esito" style="font-size:13px;min-height:16px;margin:8px 0;"></div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button id="btn-salva-ltv" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;font-size:13px;font-weight:600;">💾 Salva</button>
                <button id="btn-ricalcola-ltv" style="background:#f1f5f9;color:#374151;border:1px solid #e5e7eb;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">🔄 Ricalcola tutti</button>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:6px;">
                "Ricalcola" aggiorna i livelli di tutti i clienti con la nuova configurazione
              </div>
            </div>

            <div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">Anteprima livelli</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:14px;">Si aggiorna mentre modifichi le soglie</div>
              <div class="card">
                <div id="ltv-preview">${buildLTVPreview(configLTV)}</div>
              </div>

              <div style="margin-top:12px;">
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:2px;">Simulatore</div>
                <div style="font-size:11px;color:#64748b;margin-bottom:8px;">Inserisci i dati di un cliente per vedere il livello assegnato</div>
                <div class="card">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                    <span style="font-size:13px;color:#374151;">Media €</span>
                    <input type="number" id="sim-media" min="0" value="80" class="input-sm">
                    <span style="font-size:13px;color:#374151;">su</span>
                    <input type="number" id="sim-visite" min="0" value="5" class="input-sm">
                    <span style="font-size:13px;color:#374151;">visite</span>
                  </div>
                  <div id="sim-risultato"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB SISTEMA -->
        <div id="tab-sistema" class="rf-tab">
          <div class="info-box">
            ℹ️ <strong>Tag di sistema Ristoflow</strong> — disponibili su tutti i ristoranti. Puoi abilitarli/disabilitarli e configurare le soglie.
          </div>
          ${sistema.map(tag => {
            const cfg  = configMap[tag.nome] || {};
            const abil = cfg.abilitato !== false;
            const def  = DEFAULT_SOGLIE_TAG[tag.nome] || {};
            let sogliaCampi = '';
            if (tag.configurabile) {
              if (tag.nome === 'vip') {
                sogliaCampi = `
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    <span style="font-size:13px;color:#374151;">Almeno</span>
                    <input type="number" min="1" max="50" value="${cfg.soglia_visite ?? def.soglia_visite}" class="input-sm" data-cfg="${tag.nome}" data-campo="soglia_visite">
                    <span style="font-size:13px;color:#374151;">visite negli ultimi</span>
                    <input type="number" min="1" max="365" value="${cfg.soglia_giorni_visite ?? def.soglia_giorni_visite}" class="input-sm" data-cfg="${tag.nome}" data-campo="soglia_giorni_visite">
                    <span style="font-size:13px;color:#374151;">giorni</span>
                  </div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Default: ${def.soglia_visite} visite in ${def.soglia_giorni_visite} giorni</div>`;
              } else if (tag.nome === 'inattivo') {
                sogliaCampi = `
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    <span style="font-size:13px;color:#374151;">Non viene da almeno</span>
                    <input type="number" min="1" max="365" value="${cfg.soglia_inattivo_giorni ?? def.soglia_inattivo_giorni}" class="input-sm" data-cfg="${tag.nome}" data-campo="soglia_inattivo_giorni">
                    <span style="font-size:13px;color:#374151;">giorni</span>
                  </div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Default: ${def.soglia_inattivo_giorni} giorni</div>`;
              } else if (tag.nome === 'big_spender') {
                sogliaCampi = `
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    <span style="font-size:13px;color:#374151;">Spesa min €</span>
                    <input type="number" min="1" value="${cfg.soglia_importo_min ?? def.soglia_importo_min}" class="input-sm" style="width:90px;" data-cfg="${tag.nome}" data-campo="soglia_importo_min">
                    <span style="font-size:13px;color:#374151;">negli ultimi</span>
                    <input type="number" min="1" max="365" value="${cfg.soglia_importo_giorni ?? def.soglia_importo_giorni}" class="input-sm" data-cfg="${tag.nome}" data-campo="soglia_importo_giorni">
                    <span style="font-size:13px;color:#374151;">giorni</span>
                  </div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Default: €${def.soglia_importo_min} in ${def.soglia_importo_giorni} giorni</div>`;
              } else if (tag.nome === 'wine_lover') {
                sogliaCampi = `
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    <span style="font-size:13px;color:#374151;">Categoria prodotto:</span>
                    <input type="text" value="${cfg.soglia_categoria ?? def.soglia_categoria}" placeholder="es. bollicine" class="input" style="width:160px;" data-cfg="${tag.nome}" data-campo="soglia_categoria">
                  </div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Default: "${def.soglia_categoria}"</div>`;
              }
            }
            return `
              <div class="card" id="card-tag-${tag.nome}" style="opacity:${abil ? '1' : '.5'};transition:opacity .2s;">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                  <div style="display:flex;align-items:center;gap:12px;flex:1;">
                    <div style="width:38px;height:38px;background:${tag.colore}20;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${tag.icona}</div>
                    <div>
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <span style="font-weight:700;font-size:14px;color:#0f172a;">${tag.label}</span>
                        <code style="font-size:11px;background:#f1f5f9;color:#64748b;padding:1px 6px;border-radius:4px;">${tag.nome}</code>
                        ${tag.configurabile ? `<span style="background:#f0fdf4;color:#15803d;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:600;">⚙️ Configurabile</span>` : ''}
                      </div>
                      <div style="font-size:12px;color:#64748b;margin-top:2px;">${tag.descrizione || ''}</div>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    <span style="font-size:12px;color:#64748b;">${abil ? 'Attivo' : 'Disattivato'}</span>
                    <label class="toggle">
                      <input type="checkbox" ${abil ? 'checked' : ''} data-toggle-sistema="${tag.nome}">
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                </div>
                ${tag.configurabile && abil ? `
                  <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;">
                    <div class="lbl">Soglia per questo ristorante</div>
                    ${sogliaCampi}
                    <button class="btn-salva-soglia" data-tag="${tag.nome}" style="margin-top:10px;background:#0E5A7A;color:white;border:none;border-radius:8px;padding:7px 16px;cursor:pointer;font-size:12px;font-weight:600;">💾 Salva</button>
                    <span class="esito-soglia" data-esito="${tag.nome}" style="font-size:12px;margin-left:8px;"></span>
                  </div>
                ` : ''}
              </div>`;
          }).join('')}
        </div>

        <!-- TAB CUSTOM -->
        <div id="tab-custom" class="rf-tab">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;">Tag personalizzati</div>
              <div style="font-size:12px;color:#64748b;">Specifici del tuo ristorante — assegnati sempre manualmente</div>
            </div>
            <button id="btn-nuovo-custom" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:9px 18px;cursor:pointer;font-size:13px;font-weight:600;">+ Nuovo tag</button>
          </div>
          <div id="form-custom" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:10px;">
              <div><span class="lbl">Nome chiave *</span><input id="ct-nome" class="input" placeholder="es. habitue_venerdi" style="width:100%;box-sizing:border-box;"><div style="font-size:11px;color:#94a3b8;margin-top:2px;">Minuscolo, no spazi</div></div>
              <div><span class="lbl">Etichetta *</span><input id="ct-label" class="input" placeholder="es. Habitué venerdì" style="width:100%;box-sizing:border-box;"></div>
              <div><span class="lbl">Icona (emoji)</span><input id="ct-icona" class="input" placeholder="🍽️" style="width:100%;box-sizing:border-box;"></div>
              <div><span class="lbl">Colore</span><input id="ct-colore" type="color" value="#0E5A7A" style="height:38px;width:100%;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;padding:2px;"></div>
            </div>
            <div style="margin-bottom:10px;"><span class="lbl">Descrizione</span><input id="ct-desc" class="input" placeholder="A cosa serve questo tag..." style="width:100%;box-sizing:border-box;"></div>
            <div id="ct-esito" style="font-size:13px;min-height:14px;margin-bottom:8px;"></div>
            <div style="display:flex;gap:8px;">
              <button id="btn-salva-custom" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;font-size:13px;font-weight:600;">💾 Salva</button>
              <button id="btn-annulla-custom" style="background:#f1f5f9;color:#374151;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">Annulla</button>
            </div>
          </div>
          <div id="lista-custom">
            ${custom.length === 0
              ? `<div style="text-align:center;padding:40px;color:#94a3b8;"><div style="font-size:28px;margin-bottom:8px;">✏️</div><div>Nessun tag personalizzato ancora.</div></div>`
              : `<div style="display:flex;flex-wrap:wrap;gap:10px;">${custom.map(t => `
                  <div class="card" style="display:flex;align-items:center;gap:12px;min-width:220px;flex:1;">
                    <div style="width:36px;height:36px;background:${t.colore}20;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${t.icona}</div>
                    <div style="flex:1;min-width:0;">
                      <div style="font-weight:700;font-size:14px;color:#0f172a;">${t.label}</div>
                      <code style="font-size:11px;color:#94a3b8;">${t.nome}</code>
                      ${t.descrizione ? `<div style="font-size:12px;color:#64748b;">${t.descrizione}</div>` : ''}
                    </div>
                    <button data-del-custom="${t.id}" style="background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;flex-shrink:0;">🗑</button>
                  </div>`).join('')}</div>`
            }
          </div>
        </div>

        <!-- TAB PANORAMICA -->
        <div id="tab-panoramica" class="rf-tab">
          <div style="font-size:12px;color:#64748b;margin-bottom:16px;">Tutti i tag e livelli attivi — usali come filtri nei template WhatsApp.</div>
          <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Livelli LTV</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
            ${Object.entries(LTV_LIVELLI).map(([nome, l]) =>
              `<span style="display:inline-flex;align-items:center;gap:6px;background:${l.bg};color:${l.colore};border:1px solid ${l.colore}30;border-radius:20px;padding:4px 12px;font-size:13px;font-weight:600;">
                ${l.emoji} ${l.label}
              </span>`
            ).join('')}
          </div>
          <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Tag di sistema</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
            ${sistema.filter(t => configMap[t.nome]?.abilitato !== false).map(t =>
              `<span class="tag-chip" style="background:${t.colore}15;color:${t.colore};border:1px solid ${t.colore}30;">${t.icona} ${t.label} <code style="font-size:10px;opacity:.7;">${t.nome}</code></span>`
            ).join('')}
          </div>
          ${custom.length > 0 ? `
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Tag personalizzati</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${custom.map(t =>
                `<span class="tag-chip" style="background:${t.colore}15;color:${t.colore};border:1px dashed ${t.colore}50;">${t.icona} ${t.label} <code style="font-size:10px;opacity:.7;">${t.nome}</code></span>`
              ).join('')}
            </div>` : ''}
        </div>

      </div>
    </div>
  `;

  // ─── TABS ──────────────────────────────────────────────────────────────────
  container.querySelectorAll('.rf-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.rf-nav-btn').forEach(b => b.classList.remove('attiva'));
      container.querySelectorAll('.rf-tab').forEach(t => t.classList.remove('attiva'));
      btn.classList.add('attiva');
      container.querySelector('#' + btn.dataset.tab).classList.add('attiva');
    });
  });

  // ─── LTV PREVIEW LIVE ─────────────────────────────────────────────────────
  function leggiCfgLTV() {
    return {
      finestra_mesi:      parseInt(container.querySelector('#ltv-finestra')?.value) || 12,
      min_visite:         parseInt(container.querySelector('#ltv-min-visite')?.value) || 2,
      min_spesa:          parseFloat(container.querySelector('#ltv-min-spesa')?.value) || 0,
      soglia_occasionale: parseFloat(container.querySelector('#ltv-soglia-occasionale')?.value) || 1,
      soglia_abituale:    parseFloat(container.querySelector('#ltv-soglia-abituale')?.value) || 50,
      soglia_fedele:      parseFloat(container.querySelector('#ltv-soglia-fedele')?.value) || 120,
      soglia_vip:         parseFloat(container.querySelector('#ltv-soglia-vip')?.value) || 250,
    };
  }

  function aggiornaPreview() {
    container.querySelector('#ltv-preview').innerHTML = buildLTVPreview(leggiCfgLTV());
    aggiornaSimulatore();
  }

  function aggiornaSimulatore() {
    const cfg    = leggiCfgLTV();
    const media  = parseFloat(container.querySelector('#sim-media')?.value) || 0;
    const visite = parseInt(container.querySelector('#sim-visite')?.value) || 0;
    const livello = calcolaLivelloLocale(media, visite, { ...cfg, totale_spesa: media * visite });
    const l = LTV_LIVELLI[livello];
    container.querySelector('#sim-risultato').innerHTML =
      `<span style="font-size:24px;">${l.emoji}</span>
       <span style="font-size:14px;font-weight:600;color:${l.colore};margin-left:8px;">${l.label}</span>
       <span style="font-size:12px;color:#94a3b8;margin-left:8px;">€${media.toFixed(0)}/vis × ${visite} visite</span>`;
  }

  ['#ltv-finestra','#ltv-min-visite','#ltv-min-spesa',
   '#ltv-soglia-occasionale','#ltv-soglia-abituale','#ltv-soglia-fedele','#ltv-soglia-vip']
    .forEach(id => container.querySelector(id)?.addEventListener('input', aggiornaPreview));
  ['#sim-media','#sim-visite']
    .forEach(id => container.querySelector(id)?.addEventListener('input', aggiornaSimulatore));
  aggiornaSimulatore();

  // ─── LTV SALVA ────────────────────────────────────────────────────────────
  container.querySelector('#btn-salva-ltv').addEventListener('click', async () => {
    const esito = container.querySelector('#ltv-esito');
    esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
    const ok = await salvaConfigLTV(aziendaId, leggiCfgLTV());
    esito.textContent = ok ? '✅ Salvato!' : '❌ Errore nel salvataggio';
    esito.style.color  = ok ? '#16a34a'    : '#dc2626';
    if (ok) setTimeout(() => { esito.textContent = ''; }, 3000);
  });

  container.querySelector('#btn-ricalcola-ltv').addEventListener('click', async () => {
    const esito = container.querySelector('#ltv-esito');
    if (!confirm('Ricalcola i livelli LTV di tutti i clienti con la configurazione attuale?')) return;
    esito.textContent = '⏳ Ricalcolo in corso...'; esito.style.color = '#64748b';
    const res = await ricalcolaLTVAzienda(aziendaId);
    esito.textContent = res?.success ? `✅ Ricalcolati ${res.n_contatti || ''} clienti` : '❌ ' + (res?.error || 'Errore');
    esito.style.color  = res?.success ? '#16a34a' : '#dc2626';
  });

  // ─── TAG SISTEMA TOGGLE ───────────────────────────────────────────────────
  container.querySelectorAll('[data-toggle-sistema]').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const tagNome = toggle.dataset.toggleSistema;
      container.querySelector('#card-tag-' + tagNome).style.opacity = toggle.checked ? '1' : '.5';
      await supa().from('tag_configurazione_azienda').upsert(
        { azienda_id: aziendaId, tag_nome: tagNome, abilitato: toggle.checked, updated_at: new Date().toISOString() },
        { onConflict: 'azienda_id,tag_nome' }
      );
    });
  });

  // ─── TAG SISTEMA SOGLIE ───────────────────────────────────────────────────
  container.querySelectorAll('.btn-salva-soglia').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tagNome = btn.dataset.tag;
      const esito   = container.querySelector('[data-esito="' + tagNome + '"]');
      esito.textContent = '...'; esito.style.color = '#64748b';
      const campi = {};
      container.querySelectorAll('[data-cfg="' + tagNome + '"]').forEach(input => {
        campi[input.dataset.campo] = isNaN(input.value) ? input.value : (parseFloat(input.value) || null);
      });
      const { error } = await supa().from('tag_configurazione_azienda').upsert(
        { azienda_id: aziendaId, tag_nome: tagNome, abilitato: true, ...campi, updated_at: new Date().toISOString() },
        { onConflict: 'azienda_id,tag_nome' }
      );
      esito.textContent = error ? '❌ ' + error.message : '✅ Salvato';
      esito.style.color  = error ? '#dc2626' : '#16a34a';
      if (!error) setTimeout(() => { esito.textContent = ''; }, 3000);
    });
  });

  // ─── TAG CUSTOM ───────────────────────────────────────────────────────────
  container.querySelector('#btn-nuovo-custom').addEventListener('click', () => {
    const f = container.querySelector('#form-custom');
    f.style.display = f.style.display === 'none' ? '' : 'none';
  });
  container.querySelector('#btn-annulla-custom').addEventListener('click', () => {
    container.querySelector('#form-custom').style.display = 'none';
  });
  container.querySelector('#btn-salva-custom').addEventListener('click', async () => {
    const esito = container.querySelector('#ct-esito');
    const nome  = container.querySelector('#ct-nome').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const label = container.querySelector('#ct-label').value.trim();
    if (!nome || !label) { esito.textContent = '❌ Nome e label obbligatori'; esito.style.color = '#dc2626'; return; }
    if (sistema.find(t => t.nome === nome)) { esito.textContent = `❌ "${nome}" è già un tag di sistema`; esito.style.color = '#dc2626'; return; }
    esito.textContent = 'Salvataggio...'; esito.style.color = '#64748b';
    const { error } = await supa().from('contatti_tag_custom').insert({
      azienda_id: aziendaId, nome, label,
      icona: container.querySelector('#ct-icona').value.trim() || '🏷️',
      colore: container.querySelector('#ct-colore').value,
      descrizione: container.querySelector('#ct-desc').value.trim(),
    });
    if (error) { esito.textContent = error.code === '23505' ? '❌ Tag già esistente' : '❌ ' + error.message; esito.style.color = '#dc2626'; }
    else { esito.textContent = '✅ Salvato!'; esito.style.color = '#16a34a'; setTimeout(() => render(container), 800); }
  });
  container.querySelectorAll('[data-del-custom]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Eliminare questo tag personalizzato?')) return;
      await supa().from('contatti_tag_custom').update({ attivo: false }).eq('id', btn.dataset.delCustom);
      render(container);
    });
  });
}
