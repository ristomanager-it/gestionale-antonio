// js/views/bo/bo-candidature.js
// Dashboard candidature — funnel 4 fasi, scoring 7 indicatori, WhatsApp automatico

const supa = () => window.supabaseClient || window.supabase;
const SUPABASE_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0';

const INDICATORI = {
  mentalita_proprietario: { label: 'Mentalità da proprietario', emoji: '⭐', colore: '#f59e0b', peso: 1.5 },
  curiosita:              { label: 'Curiosità attiva',          emoji: '🔍', colore: '#8b5cf6', peso: 1 },
  crescita:               { label: 'Voglia di crescita',        emoji: '📈', colore: '#10b981', peso: 1 },
  responsabilita:         { label: 'Responsabilità',            emoji: '🎯', colore: '#f59e0b', peso: 1 },
  mentalita_positiva:     { label: 'Mentalità positiva',        emoji: '💡', colore: '#0ea5e9', peso: 1 },
  pressione:              { label: 'Resistenza pressione',      emoji: '💪', colore: '#ef4444', peso: 1 },
  leadership:             { label: 'Leadership potenziale',     emoji: '🏆', colore: '#f43f5e', peso: 1 },
};

const FASI = {
  1: { label: 'Ricevuta',          colore: '#64748b', bg: '#f1f5f9', emoji: '📥' },
  2: { label: 'Fase 2 inviata',    colore: '#2563eb', bg: '#eff6ff', emoji: '📤' },
  3: { label: 'Fase 2 completata', colore: '#7c3aed', bg: '#f5f3ff', emoji: '✍️' },
  4: { label: 'Fase 3 inviata',    colore: '#d97706', bg: '#fffbeb', emoji: '🎯' },
  5: { label: 'Fase 3 completata', colore: '#0891b2', bg: '#ecfeff', emoji: '🧠' },
  6: { label: 'Colloquio',         colore: '#0E5A7A', bg: '#f0f9ff', emoji: '🤝' },
  7: { label: 'Assunto',           colore: '#15803d', bg: '#f0fdf4', emoji: '🎉' },
  8: { label: 'Non idoneo',        colore: '#dc2626', bg: '#fef2f2', emoji: '❌' },
};

function badgeScore(score) {
  if (score >= 7) return { label: 'Eccellente', bg: '#dcfce7', color: '#15803d', emoji: '🔥' };
  if (score >= 5) return { label: 'Buono',      bg: '#fef3c7', color: '#92400e', emoji: '✅' };
  if (score >= 3) return { label: 'Da valutare',bg: '#f1f5f9', color: '#475569', emoji: '⚠️' };
  return              { label: 'Basso',         bg: '#fee2e2', color: '#dc2626', emoji: '❌' };
}

function barraIndicatore(chiave, valore) {
  const ind = INDICATORI[chiave];
  if (!ind) return '';
  const pct = Math.min(100, (valore / 10) * 100);
  const isKey = chiave === 'mentalita_proprietario';
  return `
    <div style="margin-bottom:7px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span style="font-size:12px;color:#374151;font-weight:${isKey ? '700' : '500'};">${ind.emoji} ${ind.label}${isKey ? ' ⭐' : ''}</span>
        <span style="font-size:12px;font-weight:700;color:${ind.colore};">${Number(valore).toFixed(1)}</span>
      </div>
      <div style="height:${isKey ? 8 : 5}px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${ind.colore};border-radius:4px;transition:width .4s;"></div>
      </div>
    </div>`;
}

function tempoRimanente(scadenza) {
  if (!scadenza) return null;
  const diff = new Date(scadenza) - new Date();
  if (diff <= 0) return { scaduto: true, label: 'Scaduto' };
  const ore  = Math.floor(diff / 3600000);
  const min  = Math.floor((diff % 3600000) / 60000);
  return { scaduto: false, label: ore > 0 ? `${ore}h ${min}m` : `${min}m` };
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

  // Carica candidature
  const { data: candidature, error } = await supa()
    .from('candidature')
    .select('*')
    .eq('azienda_id', aziendaId)
    .order('score_totale', { ascending: false });

  if (error) {
    container.innerHTML = `<div style="color:#dc2626;padding:40px;text-align:center;">Errore: ${error.message}</div>`;
    return;
  }

  const tutte = candidature || [];

  // Conta per fase
  const contiPerFase = {};
  for (const c of tutte) contiPerFase[c.fase_attuale] = (contiPerFase[c.fase_attuale] || 0) + 1;

  // Filtri attivi
  let filtroFase  = 'tutte';
  let filtroArea  = 'tutte';
  let candidaturaAperta = null;

  function renderLista() {
    let filtrate = tutte;
    if (filtroFase !== 'tutte')  filtrate = filtrate.filter(c => String(c.fase_attuale) === filtroFase);
    if (filtroArea !== 'tutte')  filtrate = filtrate.filter(c => c.area_interesse === filtroArea);

    const el = container.querySelector('#lista-candidature');
    if (!el) return;

    if (!filtrate.length) {
      el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:32px;">Nessuna candidatura trovata.</div>';
      return;
    }

    el.innerHTML = filtrate.map(c => {
      const fase  = FASI[c.fase_attuale] || FASI[1];
      const score = badgeScore(c.score_totale || 0);
      const scad  = c.fase_attuale === 2 ? tempoRimanente(c.scadenza_fase2) : c.fase_attuale === 4 ? tempoRimanente(c.scadenza_fase3) : null;

      return `
        <div class="cand-card" data-id="${c.id}" style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px;cursor:pointer;transition:all .15s;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:180px;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                <span style="font-weight:700;font-size:15px;color:#0f172a;">${c.nome} ${c.cognome}</span>
                <span style="background:${fase.bg};color:${fase.colore};padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;">${fase.emoji} ${fase.label}</span>
                <span style="background:${score.bg};color:${score.color};padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;">${score.emoji} ${score.label}</span>
              </div>
              <div style="font-size:13px;color:#64748b;display:flex;gap:12px;flex-wrap:wrap;">
                <span>🎯 ${c.ruolo_desiderato}</span>
                <span>📍 ${c.citta || '—'}</span>
                <span>📅 ${new Date(c.created_at).toLocaleDateString('it-IT')}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
              ${scad ? `<span style="background:${scad.scaduto ? '#fee2e2' : '#fef3c7'};color:${scad.scaduto ? '#dc2626' : '#92400e'};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">⏱ ${scad.label}</span>` : ''}
              <div style="text-align:center;">
                <div style="font-size:22px;font-weight:800;color:#0E5A7A;">${Number(c.score_totale || 0).toFixed(1)}</div>
                <div style="font-size:10px;color:#94a3b8;">/ 10</div>
              </div>
            </div>
          </div>
          <!-- Mini barre -->
          <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;">
            ${Object.keys(INDICATORI).map(k => {
              const val = c[`score_${k}`] || 0;
              const ind = INDICATORI[k];
              const pct = Math.min(100, (val/10)*100);
              const isKey = k === 'mentalita_proprietario';
              return `<div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:11px;width:14px;">${ind.emoji}</span>
                <div style="flex:1;height:${isKey?5:3}px;background:#f1f5f9;border-radius:2px;overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:${ind.colore};border-radius:2px;"></div>
                </div>
                <span style="font-size:10px;color:#64748b;width:20px;">${Number(val).toFixed(0)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');

    // Click su card → apri scheda
    el.querySelectorAll('.cand-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const c = tutte.find(x => x.id === id);
        if (c) apriScheda(c);
      });
      card.addEventListener('mouseenter', () => card.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)');
      card.addEventListener('mouseleave', () => card.style.boxShadow = '');
    });
  }

  async function apriScheda(c) {
    candidaturaAperta = c;
    const fase  = FASI[c.fase_attuale] || FASI[1];
    const score = badgeScore(c.score_totale || 0);

    // Carica risposte
    const { data: risposte } = await supa()
      .from('candidature_risposte')
      .select('*')
      .eq('candidatura_id', c.id)
      .order('fase').order('created_at');

    const { data: faseLog } = await supa()
      .from('candidature_fasi_log')
      .select('*')
      .eq('candidatura_id', c.id)
      .order('created_at');

    const modal = container.querySelector('#modal-scheda');
    modal.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;overflow-y:auto;padding:20px;box-sizing:border-box;" id="modal-overlay">
        <div style="background:white;border-radius:20px;max-width:700px;margin:0 auto;overflow:hidden;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0E5A7A,#1a8fb5);padding:24px 28px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="font-size:22px;font-weight:700;color:white;">${c.nome} ${c.cognome}</div>
                <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;">
                  ${c.ruolo_desiderato} · ${c.area_interesse} · ${c.citta || '—'}
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                  <span style="background:rgba(255,255,255,.2);color:white;padding:3px 10px;border-radius:20px;font-size:12px;">${fase.emoji} ${fase.label}</span>
                  <span style="background:${score.bg};color:${score.color};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${score.emoji} ${score.label} — ${Number(c.score_totale||0).toFixed(1)}/10</span>
                </div>
              </div>
              <button id="btn-chiudi-scheda" style="background:rgba(255,255,255,.15);border:none;color:white;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:18px;flex-shrink:0;">✕</button>
            </div>
          </div>

          <div style="padding:24px 28px;max-height:75vh;overflow-y:auto;">

            <!-- Contatti -->
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f1f5f9;">
              <a href="tel:${c.telefono}" style="color:#0E5A7A;font-weight:600;font-size:14px;text-decoration:none;">📱 ${c.telefono}</a>
              ${c.email ? `<a href="mailto:${c.email}" style="color:#0E5A7A;font-weight:600;font-size:14px;text-decoration:none;">✉️ ${c.email}</a>` : ''}
              ${c.ruolo_sogno ? `<span style="font-size:13px;color:#64748b;">💭 Sogna: <em>${c.ruolo_sogno}</em></span>` : ''}
            </div>

            <!-- Score dettagliato -->
            <div style="margin-bottom:20px;">
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">📊 Punteggi per indicatore</div>
              ${Object.keys(INDICATORI).map(k => barraIndicatore(k, c[`score_${k}`] || 0)).join('')}
            </div>

            <!-- Risposte per fase -->
            ${[1,2,3].map(fase => {
              const rFase = (risposte || []).filter(r => r.fase === fase);
              if (!rFase.length) return '';
              return `
                <div style="margin-bottom:20px;">
                  <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #f1f5f9;">
                    ${fase === 1 ? '📥 Fase 1 — Candidatura iniziale' : fase === 2 ? '✍️ Fase 2 — Questionario approfondito' : '🎯 Fase 3 — Sfida pratica'}
                  </div>
                  ${rFase.map(r => `
                    <div style="margin-bottom:16px;">
                      <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">${r.domanda_testo}</div>
                      <div style="font-size:13px;color:#0f172a;line-height:1.7;background:#f8fafc;border-radius:8px;padding:12px;border-left:3px solid #0E5A7A;">
                        ${r.risposta.replace(/\n/g, '<br>')}
                      </div>
                      <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;">
                        ${(r.keywords_positive||[]).slice(0,5).map(k => `<span style="background:#dcfce7;color:#15803d;padding:1px 7px;border-radius:10px;font-size:10px;">+${k.keyword||k}</span>`).join('')}
                        ${(r.keywords_negative||[]).slice(0,3).map(k => `<span style="background:#fee2e2;color:#dc2626;padding:1px 7px;border-radius:10px;font-size:10px;">-${k.keyword||k}</span>`).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>`;
            }).join('')}

            <!-- Note interne -->
            <div style="margin-bottom:20px;">
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">📝 Note interne</div>
              <textarea id="note-interne" style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:10px;font-size:13px;font-family:inherit;resize:vertical;min-height:80px;outline:none;" placeholder="Aggiungi note private su questo candidato...">${c.note_interne || ''}</textarea>
              <button id="btn-salva-note" style="margin-top:6px;background:#f1f5f9;border:none;border-radius:8px;padding:7px 16px;cursor:pointer;font-size:12px;color:#374151;">💾 Salva note</button>
              <span id="esito-note" style="font-size:12px;margin-left:8px;"></span>
            </div>

            <!-- Storico fasi -->
            ${(faseLog||[]).length > 0 ? `
              <div style="margin-bottom:20px;">
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">🕐 Storico avanzamenti</div>
                ${(faseLog||[]).map(l => `
                  <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:0.5px solid #f8fafc;">
                    <span style="font-size:11px;color:#94a3b8;width:90px;flex-shrink:0;">${new Date(l.created_at).toLocaleDateString('it-IT')} ${new Date(l.created_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</span>
                    <span style="font-size:12px;color:#374151;">→ <strong>${l.fase_label}</strong></span>
                    ${l.whatsapp_inviato ? `<span style="background:#dcfce7;color:#15803d;padding:1px 7px;border-radius:10px;font-size:10px;">WhatsApp ✓</span>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <!-- Azioni -->
            <div style="border-top:1px solid #f1f5f9;padding-top:20px;">
              <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:12px;">⚡ Azioni</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;" id="azioni-wrap">
                ${renderAzioni(c)}
              </div>
              <div id="esito-azione" style="font-size:13px;margin-top:10px;min-height:16px;"></div>
            </div>

          </div>
        </div>
      </div>`;

    modal.style.display = 'block';

    // Chiudi
    modal.querySelector('#btn-chiudi-scheda').addEventListener('click', () => { modal.style.display = 'none'; modal.innerHTML = ''; });
    modal.querySelector('#modal-overlay').addEventListener('click', e => { if (e.target === modal.querySelector('#modal-overlay')) { modal.style.display = 'none'; modal.innerHTML = ''; } });

    // Salva note
    modal.querySelector('#btn-salva-note').addEventListener('click', async () => {
      const note = modal.querySelector('#note-interne').value;
      const esito = modal.querySelector('#esito-note');
      esito.textContent = '...'; esito.style.color = '#64748b';
      const { error } = await supa().from('candidature').update({ note_interne: note, updated_at: new Date().toISOString() }).eq('id', c.id);
      esito.textContent = error ? '❌ Errore' : '✅ Salvato';
      esito.style.color = error ? '#dc2626' : '#16a34a';
      if (!error) { c.note_interne = note; const idx = tutte.findIndex(x=>x.id===c.id); if(idx>=0) tutte[idx].note_interne=note; }
      setTimeout(() => { esito.textContent = ''; }, 3000);
    });

    // Bind azioni
    bindAzioni(c, modal);
  }

  function renderAzioni(c) {
    const fase = c.fase_attuale;
    const btns = [];

    if (fase === 1) {
      btns.push(`<button class="btn-azione" data-azione="approva-fase2" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">✅ Approva → Invia Fase 2 via WhatsApp</button>`);
      btns.push(`<button class="btn-azione" data-azione="rifiuta" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">❌ Non idoneo</button>`);
    }
    if (fase === 3) {
      btns.push(`<button class="btn-azione" data-azione="approva-fase3" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">✅ Approva → Invia Fase 3 via WhatsApp</button>`);
      btns.push(`<button class="btn-azione" data-azione="rifiuta" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">❌ Non idoneo</button>`);
    }
    if (fase === 5) {
      btns.push(`<button class="btn-azione" data-azione="convoca-colloquio" style="background:#0E5A7A;color:white;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">🤝 Convoca a colloquio via WhatsApp</button>`);
      btns.push(`<button class="btn-azione" data-azione="rifiuta" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">❌ Non idoneo</button>`);
    }
    if (fase === 6) {
      btns.push(`<button class="btn-azione" data-azione="assumi" style="background:#15803d;color:white;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;font-weight:600;">🎉 Assunto — Invia WhatsApp di benvenuto</button>`);
      btns.push(`<button class="btn-azione" data-azione="rifiuta" style="background:#fee2e2;color:#dc2626;border:none;border-radius:8px;padding:9px 16px;cursor:pointer;font-size:13px;">❌ Non idoneo</button>`);
    }
    if (fase === 7 || fase === 8) {
      btns.push(`<span style="font-size:13px;color:#94a3b8;">Candidatura chiusa — ${FASI[fase]?.label}</span>`);
    }

    return btns.join('');
  }

  function bindAzioni(c, modal) {
    modal.querySelectorAll('.btn-azione').forEach(btn => {
      btn.addEventListener('click', async () => {
        const azione = btn.dataset.azione;
        const esito = modal.querySelector('#esito-azione');
        esito.textContent = 'Elaborazione...'; esito.style.color = '#64748b';
        btn.disabled = true;

        try {
          await eseguiAzione(c, azione, esito);
          // Ricarica lista
          const idx = tutte.findIndex(x => x.id === c.id);
          if (idx >= 0) {
            const { data } = await supa().from('candidature').select('*').eq('id', c.id).single();
            if (data) { tutte[idx] = data; candidaturaAperta = data; }
          }
          renderLista();
          // Aggiorna azioni nel modal
          const wrap = modal.querySelector('#azioni-wrap');
          if (wrap) { wrap.innerHTML = renderAzioni(candidaturaAperta); bindAzioni(candidaturaAperta, modal); }

        } catch(err) {
          esito.textContent = '❌ ' + err.message;
          esito.style.color = '#dc2626';
          btn.disabled = false;
        }
      });
    });
  }

  async function eseguiAzione(c, azione, esito) {
    const mappe = {
      'approva-fase2':     { fase: 2, label: 'Fase 2 inviata',    evento: 'candidatura_fase2',    scadenza: 'scadenza_fase2' },
      'approva-fase3':     { fase: 4, label: 'Fase 3 inviata',    evento: 'candidatura_fase3',    scadenza: 'scadenza_fase3' },
      'convoca-colloquio': { fase: 6, label: 'Colloquio',          evento: 'candidatura_colloquio', scadenza: null },
      'assumi':            { fase: 7, label: 'Assunto',            evento: 'candidatura_assunto',  scadenza: null },
      'rifiuta':           { fase: 8, label: 'Non idoneo',         evento: 'candidatura_rifiuto',  scadenza: null },
    };

    const m = mappe[azione];
    if (!m) return;

    // 1. Aggiorna DB
    const scadenza = m.scadenza ? new Date(Date.now() + 48 * 3600000).toISOString() : undefined;
    const update = { fase_attuale: m.fase, fase_label: m.label, updated_at: new Date().toISOString() };
    if (scadenza && m.scadenza) update[m.scadenza] = scadenza;

    const { error } = await supa().from('candidature').update(update).eq('id', c.id);
    if (error) throw new Error(error.message);

    // 2. Log
    await supa().from('candidature_fasi_log').insert({
      candidatura_id: c.id,
      fase_da: c.fase_attuale,
      fase_a: m.fase,
      fase_label: m.label,
    });

    // 3. WhatsApp via Edge Function
    esito.textContent = 'Invio WhatsApp...'; esito.style.color = '#64748b';
    const waRes = await fetch(`${SUPABASE_URL}/functions/v1/candidatura-notifica-ts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        candidatura_id: c.id,
        azienda_id: c.azienda_id,
        evento: m.evento,
        token: c.token,
        fase: m.fase,
      })
    });
    const waData = await waRes.json();

    // 4. Aggiorna log con stato WhatsApp
    await supa().from('candidature_fasi_log')
      .update({ whatsapp_inviato: waData.success || false, whatsapp_message_id: waData.message_id || null })
      .eq('candidatura_id', c.id).eq('fase_a', m.fase);

    esito.textContent = waData.success
      ? `✅ Avanzato a "${m.label}" e WhatsApp inviato!`
      : `✅ Avanzato a "${m.label}" (WhatsApp: ${waData.error || 'errore'})`;
    esito.style.color = waData.success ? '#16a34a' : '#f59e0b';

    // Aggiorna oggetto locale
    Object.assign(c, update);
  }

  // ─── RENDER PRINCIPALE ─────────────────────────────────────────────────────
  container.innerHTML = `
    <style>
      .filtro-btn { background:white;border:1px solid #e5e7eb;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;transition:all .15s; }
      .filtro-btn.attivo { background:#0E5A7A;color:white;border-color:#0E5A7A; }
      .filtro-btn:hover:not(.attivo) { border-color:#0E5A7A;color:#0E5A7A; }
    </style>

    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:860px;margin:0 auto;">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:linear-gradient(135deg,#0E5A7A,#1a8fb5);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">👥</div>
            <div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;">Candidature</div>
              <div style="font-size:13px;color:#64748b;">${tutte.length} candidature totali</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <a id="link-form-pubblico" href="/candidatura.html?a=${aziendaId}" target="_blank"
              style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 18px;cursor:pointer;font-size:13px;font-weight:600;text-decoration:none;">
              🔗 Form pubblico
            </a>
            <button id="btn-copia-link" style="background:#f1f5f9;color:#374151;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;cursor:pointer;font-size:13px;">
              📋 Copia link
            </button>
          </div>
        </div>

        <!-- KPI fasi -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:20px;">
          ${Object.entries(FASI).map(([f, info]) => {
            const n = contiPerFase[f] || 0;
            return `<div style="background:${info.bg};border-radius:10px;padding:12px;text-align:center;border:1px solid ${info.colore}20;">
              <div style="font-size:20px;">${info.emoji}</div>
              <div style="font-size:20px;font-weight:800;color:${info.colore};">${n}</div>
              <div style="font-size:10px;color:${info.colore};font-weight:600;">${info.label}</div>
            </div>`;
          }).join('')}
        </div>

        <!-- Filtri fase -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          <button class="filtro-btn attivo" data-filtro-fase="tutte">Tutte (${tutte.length})</button>
          ${Object.entries(FASI).map(([f, info]) => {
            const n = contiPerFase[f] || 0;
            return n > 0 ? `<button class="filtro-btn" data-filtro-fase="${f}">${info.emoji} ${info.label} (${n})</button>` : '';
          }).join('')}
        </div>

        <!-- Filtri area -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
          <button class="filtro-btn attivo" data-filtro-area="tutte">Tutte le aree</button>
          ${[...new Set(tutte.map(c => c.area_interesse))].filter(Boolean).map(a =>
            `<button class="filtro-btn" data-filtro-area="${a}">📍 ${a}</button>`
          ).join('')}
        </div>

        <!-- Lista -->
        <div id="lista-candidature"></div>

        <!-- Modal scheda -->
        <div id="modal-scheda" style="display:none;"></div>

      </div>
    </div>
  `;

  // Copia link form pubblico
  const linkPubblico = `${window.location.origin}/candidatura.html?a=${aziendaId}`;
  const btnCopia = container.querySelector('#btn-copia-link');
  if (btnCopia) {
    btnCopia.addEventListener('click', () => {
      navigator.clipboard.writeText(linkPubblico).then(() => {
        btnCopia.textContent = '✅ Copiato!';
        setTimeout(() => { btnCopia.textContent = '📋 Copia link'; }, 2000);
      });
    });
  }

  // Filtri
  container.querySelectorAll('[data-filtro-fase]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-filtro-fase]').forEach(b => b.classList.remove('attivo'));
      btn.classList.add('attivo');
      filtroFase = btn.dataset.filtroFase;
      renderLista();
    });
  });
  container.querySelectorAll('[data-filtro-area]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-filtro-area]').forEach(b => b.classList.remove('attivo'));
      btn.classList.add('attivo');
      filtroArea = btn.dataset.filtroArea;
      renderLista();
    });
  });

  renderLista();
}
