// js/views/organizzazione.js — Ruoli organizzativi (Fase 1 Persone & Organizzazione)
// Mansionari per azienda: obiettivo, responsabilità, livello. Tony genera la proposta dall'identità.

const supa = () => window.supabaseClient || window.supabase;
const FN_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-organizzazione';
const AREE = ['Sala', 'Cucina', 'Bar', 'Hotel', 'Ricevimenti', 'Amministrazione', 'Altro'];

let aziendaId = null;
let ruoli = [];
let contaDipendenti = {};

export async function render(container) {
  aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = '<div style="padding:40px;color:#94a3b8;">Nessuna azienda attiva.</div>'; return; }

  container.innerHTML = `
    <div style="max-width:820px;margin:0 auto;padding:16px;">
      <button id="org-back" style="background:none;border:none;color:#0E5A7A;font-size:14px;font-weight:700;cursor:pointer;padding:0;margin-bottom:10px;">← Dipendenti</button>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
        <div>
          <h2 style="margin:0;">🏛️ Ruoli & Organizzazione</h2>
          <p style="margin:6px 0 0;font-size:13px;color:#64748b;">Chi fa cosa, nero su bianco: obiettivo e responsabilità di ogni ruolo. La base del manuale operativo.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="window.location.hash='#/manuale-operativo'" style="background:#fff;color:#0E5A7A;border:1.5px solid #0E5A7A;border-radius:10px;padding:11px 14px;font-size:13px;font-weight:700;cursor:pointer;">📖 Manuale</button>
          <button id="org-regolamento" style="background:#fff;color:#92400e;border:1.5px solid #f59e0b;border-radius:10px;padding:11px 14px;font-size:13px;font-weight:700;cursor:pointer;">📜 Regolamento</button>
          <button onclick="window.location.hash='#/persone'" style="background:#fff;color:#0E5A7A;border:1.5px solid #0E5A7A;border-radius:10px;padding:11px 14px;font-size:13px;font-weight:700;cursor:pointer;">👥 Persone</button>
          <button id="org-nuovo" style="background:#0E5A7A;color:#fff;border:none;border-radius:10px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer;">+ Nuovo ruolo</button>
        </div>
      </div>
      <div id="org-lista" style="margin-top:16px;"><div style="color:#94a3b8;font-size:13px;">Caricamento...</div></div>
    </div>
    <div id="org-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:9999;align-items:center;justify-content:center;padding:16px;"></div>
  `;

  container.querySelector('#org-back').onclick = () => { window.location.hash = '#/dipendenti'; };
  container.querySelector('#org-nuovo').onclick = () => apriModal(null);
  container.querySelector('#org-regolamento').onclick = () => apriRegolamento();
  await carica(container);
}

async function carica(container) {
  const [{ data: r }, { data: dip }] = await Promise.all([
    supa().from('ruoli_organizzativi').select('*').eq('azienda_id', aziendaId).order('ordine').order('created_at'),
    supa().from('dipendenti').select('id,ruolo_organizzativo_id').eq('azienda_id', aziendaId).not('ruolo_organizzativo_id', 'is', null)
  ]);
  ruoli = r || [];
  contaDipendenti = {};
  (dip || []).forEach(d => { contaDipendenti[d.ruolo_organizzativo_id] = (contaDipendenti[d.ruolo_organizzativo_id] || 0) + 1; });
  renderLista(container);
}

function esc(s) { return String(s ?? '').replace(/</g, '&lt;'); }

function renderLista(container) {
  const box = container.querySelector('#org-lista');
  const attivi = ruoli.filter(x => x.attivo);
  if (!attivi.length) {
    box.innerHTML = `<div style="background:#fff;border:2px dashed #cbd5e1;border-radius:14px;padding:30px;text-align:center;">
      <div style="font-size:34px;margin-bottom:8px;">🏛️</div>
      <div style="font-size:15px;font-weight:700;color:#334155;">Nessun ruolo definito</div>
      <div style="font-size:13px;color:#94a3b8;margin-top:4px;">Crea il primo (es. "Cameriere", "Chef", "Receptionist"): Tony scrive il mansionario per te.</div>
    </div>`;
    return;
  }
  box.innerHTML = attivi.map(r => {
    const resp = Array.isArray(r.responsabilita) ? r.responsabilita : [];
    const nDip = contaDipendenti[r.id] || 0;
    return `<div class="org-card" data-id="${r.id}" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:12px;cursor:pointer;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="font-size:16px;font-weight:800;color:#0f172a;">${esc(r.nome)}</div>
        <div style="display:flex;gap:6px;">
          ${r.area ? `<span style="background:#e0f2fe;color:#0369a1;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;">${esc(r.area)}</span>` : ''}
          <span style="background:#f1f5f9;color:#475569;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;">👥 ${nDip}</span>
        </div>
      </div>
      ${r.obiettivo ? `<div style="font-size:13px;color:#475569;margin-top:6px;line-height:1.5;">🎯 ${esc(r.obiettivo)}</div>` : ''}
      ${resp.length ? `<div style="font-size:12px;color:#94a3b8;margin-top:6px;">${resp.length} responsabilità definite</div>` : ''}
    </div>`;
  }).join('');
  box.querySelectorAll('.org-card').forEach(c => c.onclick = () => {
    const r = ruoli.find(x => String(x.id) === c.dataset.id);
    apriModal(r);
  });
}

function apriModal(ruolo) {
  const modal = document.getElementById('org-modal');
  const resp = ruolo && Array.isArray(ruolo.responsabilita) ? ruolo.responsabilita.join('\n') : '';
  modal.style.display = 'flex';
  modal.innerHTML = `<div style="background:#fff;border-radius:18px;max-width:640px;width:100%;padding:22px;max-height:92vh;overflow:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">${ruolo ? '✏️ Modifica ruolo' : '➕ Nuovo ruolo'}</div>
      <button id="om-chiudi" style="background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Nome ruolo *</label>
        <input id="om-nome" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;margin-top:4px;" placeholder="Es. Cameriere" value="${esc(ruolo?.nome || '')}">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Area</label>
        <select id="om-area" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;margin-top:4px;background:#fff;">
          <option value="">—</option>
          ${AREE.map(a => `<option ${ruolo?.area === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1.5px solid #f59e0b;border-radius:12px;padding:12px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <div style="flex:1;min-width:180px;font-size:12.5px;color:#92400e;font-weight:600;">Scrivi il nome del ruolo e lascia che Tony proponga obiettivo, responsabilità e KPI coerenti con la vostra identità.</div>
      <button id="om-tony" style="background:#0E5A7A;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;cursor:pointer;">✨ Genera con Tony</button>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Obiettivo del ruolo</label>
      <textarea id="om-obiettivo" style="width:100%;min-height:64px;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;line-height:1.5;box-sizing:border-box;margin-top:4px;" placeholder="Cosa deve garantire questa persona...">${esc(ruolo?.obiettivo || '')}</textarea>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Responsabilità (una per riga)</label>
      <textarea id="om-resp" style="width:100%;min-height:150px;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;line-height:1.7;box-sizing:border-box;margin-top:4px;" placeholder="Preparazione sala prima del servizio&#10;Accoglienza clienti entro 1 minuto&#10;...">${esc(resp)}</textarea>
    </div>
    <div style="margin-bottom:12px;">
      <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Procedure collegate al ruolo</label>
      <div id="om-procedure" style="max-height:190px;overflow:auto;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px;margin-top:4px;">
        <div style="font-size:12px;color:#94a3b8;">Caricamento procedure...</div>
      </div>
    </div>
    <div id="om-extra" style="display:none;background:#f0f9ff;border-radius:12px;padding:12px;margin-bottom:12px;font-size:12.5px;color:#0E5A7A;line-height:1.6;"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <div>
        <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Livello gerarchico</label>
        <input id="om-livello" type="number" min="0" max="10" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;margin-top:4px;" value="${ruolo?.livello ?? 0}">
      </div>
      <div style="display:flex;align-items:flex-end;padding-bottom:8px;">
        <label style="font-size:13px;color:#334155;display:flex;align-items:center;gap:8px;cursor:pointer;"><input id="om-attivo" type="checkbox" ${ruolo?.attivo !== false ? 'checked' : ''}> Ruolo attivo</label>
      </div>
    </div>
    <div id="om-esito" style="font-size:12.5px;min-height:16px;margin-bottom:10px;"></div>
    <div style="display:flex;gap:10px;">
      ${ruolo ? '<button id="om-elimina" style="background:#fee2e2;color:#dc2626;border:none;border-radius:10px;padding:12px 16px;font-size:13px;font-weight:700;cursor:pointer;">🗑</button>' : ''}
      <button id="om-salva" style="flex:1;background:#0E5A7A;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;">💾 Salva ruolo</button>
    </div>
  </div>`;

  const el = (s) => modal.querySelector(s);
  const chiudi = () => { modal.style.display = 'none'; modal.innerHTML = ''; };
  el('#om-chiudi').onclick = chiudi;
  // Carica procedure aziendali + collegamenti esistenti
  (async () => {
    const cont = el('#om-procedure');
    try {
      const [{ data: procs }, linkRes] = await Promise.all([
        supa().from('procedure_sala').select('id,nome,categoria').eq('azienda_id', aziendaId).eq('attivo', true).order('categoria').order('nome').limit(200),
        ruolo ? supa().from('ruoli_procedure').select('procedura_id').eq('ruolo_id', ruolo.id) : Promise.resolve({ data: [] })
      ]);
      const collegate = new Set((linkRes.data || []).map(l => String(l.procedura_id)));
      if (!procs || !procs.length) {
        cont.innerHTML = '<div style="font-size:12px;color:#94a3b8;">Nessuna procedura in azienda ancora: creale nella sezione Procedure (anche con Tony), poi collegale qui.</div>';
        return;
      }
      cont.innerHTML = procs.map(p => `<label style="display:flex;align-items:center;gap:8px;padding:5px 2px;font-size:13px;color:#334155;cursor:pointer;">
        <input type="checkbox" class="om-proc" value="${p.id}" ${collegate.has(String(p.id)) ? 'checked' : ''}>
        <span>${esc(p.nome)}${p.categoria ? ` <span style="color:#94a3b8;font-size:11px;">(${esc(p.categoria)})</span>` : ''}</span>
      </label>`).join('');
    } catch (e) {
      cont.innerHTML = '<div style="font-size:12px;color:#dc2626;">Errore caricamento procedure</div>';
    }
  })();
  modal.onclick = (e) => { if (e.target === modal) chiudi(); };

  el('#om-tony').onclick = async () => {
    const nome = el('#om-nome').value.trim();
    if (!nome) { el('#om-esito').textContent = 'Scrivi prima il nome del ruolo.'; el('#om-esito').style.color = '#dc2626'; return; }
    el('#om-tony').disabled = true;
    el('#om-esito').textContent = '🧠 Tony sta scrivendo il mansionario... (10-15 secondi)'; el('#om-esito').style.color = '#0E5A7A';
    try {
      const { data: { session } } = await supa().auth.getSession();
      const resp = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session?.access_token || '') },
        body: JSON.stringify({ azienda_id: aziendaId, azione: 'genera_ruolo', nome_ruolo: nome, area: el('#om-area').value })
      });
      const j = await resp.json();
      if (!j.ok) throw new Error(j.errore || 'Errore generazione');
      const p = j.proposta || {};
      if (p.obiettivo) el('#om-obiettivo').value = p.obiettivo;
      if (Array.isArray(p.responsabilita)) el('#om-resp').value = p.responsabilita.join('\n');
      const extra = [];
      if (Array.isArray(p.kpi_suggeriti) && p.kpi_suggeriti.length) extra.push('<strong>📊 KPI suggeriti:</strong> ' + p.kpi_suggeriti.map(esc).join(' · '));
      if (Array.isArray(p.procedure_consigliate) && p.procedure_consigliate.length) extra.push('<strong>📋 Procedure consigliate:</strong> ' + p.procedure_consigliate.map(x => esc(x.titolo)).join(' · '));
      if (extra.length) { el('#om-extra').innerHTML = extra.join('<br><br>'); el('#om-extra').style.display = 'block'; }
      el('#om-esito').textContent = '✨ Proposta pronta: rivedila, modifica e salva.'; el('#om-esito').style.color = '#15803d';
    } catch (e) {
      el('#om-esito').textContent = '❌ ' + (e.message || e); el('#om-esito').style.color = '#dc2626';
    }
    el('#om-tony').disabled = false;
  };

  el('#om-salva').onclick = async () => {
    const nome = el('#om-nome').value.trim();
    if (!nome) { el('#om-esito').textContent = 'Il nome del ruolo è obbligatorio.'; el('#om-esito').style.color = '#dc2626'; return; }
    const righe = el('#om-resp').value.split('\n').map(s => s.trim()).filter(Boolean);
    const payload = {
      azienda_id: aziendaId,
      nome,
      area: el('#om-area').value || null,
      obiettivo: el('#om-obiettivo').value.trim() || null,
      responsabilita: righe,
      livello: parseInt(el('#om-livello').value) || 0,
      attivo: el('#om-attivo').checked,
      updated_at: new Date().toISOString(),
    };
    el('#om-esito').textContent = 'Salvataggio...'; el('#om-esito').style.color = '#64748b';
    let ruoloId = ruolo?.id || null;
    if (ruolo) {
      const { error } = await supa().from('ruoli_organizzativi').update(payload).eq('id', ruolo.id);
      if (error) { el('#om-esito').textContent = '❌ ' + error.message; el('#om-esito').style.color = '#dc2626'; return; }
    } else {
      const { data: nuovo, error } = await supa().from('ruoli_organizzativi').insert(payload).select('id').single();
      if (error) { el('#om-esito').textContent = '❌ ' + error.message; el('#om-esito').style.color = '#dc2626'; return; }
      ruoloId = nuovo?.id || null;
    }
    // Sync procedure collegate
    if (ruoloId) {
      try {
        const scelte = Array.from(modal.querySelectorAll('.om-proc:checked')).map(c => c.value);
        await supa().from('ruoli_procedure').delete().eq('ruolo_id', ruoloId);
        if (scelte.length) {
          await supa().from('ruoli_procedure').insert(scelte.map((pid, i) => ({ ruolo_id: ruoloId, procedura_id: pid, ordine: i })));
        }
      } catch (e) { console.warn('sync procedure fallita', e); }
    }
    chiudi();
    await carica({ querySelector: (s) => document.querySelector(s) });
  };

  const btnDel = el('#om-elimina');
  if (btnDel) btnDel.onclick = async () => {
    if (!confirm('Disattivare questo ruolo? I dipendenti assegnati resteranno senza ruolo organizzativo.')) return;
    const { error } = await supa().from('ruoli_organizzativi').update({ attivo: false, updated_at: new Date().toISOString() }).eq('id', ruolo.id);
    if (error) { el('#om-esito').textContent = '❌ ' + error.message; return; }
    chiudi();
    await carica({ querySelector: (s) => document.querySelector(s) });
  };
}


// ── Regolamento aziendale (azienda_documenti, generato da Tony come le campagne) ──
async function apriRegolamento() {
  const modal = document.getElementById('org-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `<div style="background:#fff;border-radius:18px;max-width:720px;width:100%;padding:22px;max-height:92vh;overflow:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">📜 Regolamento aziendale</div>
      <button id="rg-chiudi" style="background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;">✕</button>
    </div>
    <div id="rg-stato" style="font-size:12px;color:#94a3b8;margin-bottom:10px;">Caricamento...</div>
    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1.5px solid #f59e0b;border-radius:12px;padding:12px;margin-bottom:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <div style="flex:1;min-width:180px;font-size:12.5px;color:#92400e;font-weight:600;">Tony scrive il regolamento completo (10 sezioni) partendo dall'identità e dai valori della vostra azienda. Poi rivedi, modifichi e approvi.</div>
      <button id="rg-tony" style="background:#0E5A7A;color:#fff;border:none;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;cursor:pointer;">✨ Genera con Tony</button>
    </div>
    <input id="rg-titolo" style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;font-weight:700;box-sizing:border-box;margin-bottom:10px;" placeholder="Titolo del regolamento">
    <textarea id="rg-contenuto" style="width:100%;min-height:320px;padding:12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13.5px;font-family:inherit;line-height:1.7;box-sizing:border-box;" placeholder="Il testo del regolamento..."></textarea>
    <div id="rg-esito" style="font-size:12.5px;min-height:16px;margin-top:8px;"></div>
    <div style="display:flex;gap:10px;margin-top:10px;">
      <button id="rg-salva" style="flex:1;background:#f1f5f9;color:#334155;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;">💾 Salva bozza</button>
      <button id="rg-approva" style="flex:1;background:#15803d;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;">✅ Approva e pubblica</button>
    </div>
  </div>`;

  const el = (s) => modal.querySelector(s);
  const chiudi = () => { modal.style.display = 'none'; modal.innerHTML = ''; };
  el('#rg-chiudi').onclick = chiudi;
  modal.onclick = (e) => { if (e.target === modal) chiudi(); };

  let docId = null;
  let generatoDaTony = false;

  // Carica ultimo regolamento
  const { data: doc } = await supa().from('azienda_documenti')
    .select('id,titolo,contenuto,stato,versione,generato_da_tony,updated_at')
    .eq('azienda_id', aziendaId).eq('tipo', 'regolamento')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (doc) {
    docId = doc.id;
    generatoDaTony = !!doc.generato_da_tony;
    el('#rg-titolo').value = doc.titolo || '';
    el('#rg-contenuto').value = doc.contenuto || '';
    el('#rg-stato').innerHTML = doc.stato === 'approvato'
      ? `<span style="background:#dcfce7;color:#15803d;border-radius:999px;padding:3px 10px;font-weight:700;">✅ APPROVATO v${doc.versione}</span> — modificandolo torna in bozza`
      : `<span style="background:#fef3c7;color:#92400e;border-radius:999px;padding:3px 10px;font-weight:700;">📝 BOZZA v${doc.versione}</span>`;
  } else {
    el('#rg-stato').textContent = 'Nessun regolamento ancora: generane uno con Tony o scrivilo qui.';
  }

  el('#rg-tony').onclick = async () => {
    el('#rg-tony').disabled = true;
    el('#rg-esito').textContent = '🧠 Tony sta scrivendo il regolamento della vostra azienda... (20-40 secondi)';
    el('#rg-esito').style.color = '#0E5A7A';
    try {
      const { data: { session } } = await supa().auth.getSession();
      const resp = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session?.access_token || '') },
        body: JSON.stringify({ azienda_id: aziendaId, azione: 'genera_regolamento' })
      });
      const j = await resp.json();
      if (!j.ok) throw new Error(j.errore || 'Errore generazione');
      el('#rg-titolo').value = j.proposta?.titolo || 'Regolamento interno';
      el('#rg-contenuto').value = j.proposta?.contenuto || '';
      generatoDaTony = true;
      el('#rg-esito').textContent = '✨ Regolamento generato: leggilo tutto, modifica ciò che vuoi, poi salva o approva.';
      el('#rg-esito').style.color = '#15803d';
    } catch (e) {
      el('#rg-esito').textContent = '❌ ' + (e.message || e);
      el('#rg-esito').style.color = '#dc2626';
    }
    el('#rg-tony').disabled = false;
  };

  async function salvaRegolamento(stato) {
    const titolo = el('#rg-titolo').value.trim() || 'Regolamento interno';
    const contenuto = el('#rg-contenuto').value.trim();
    if (!contenuto) { el('#rg-esito').textContent = 'Il regolamento è vuoto.'; el('#rg-esito').style.color = '#dc2626'; return; }
    el('#rg-esito').textContent = 'Salvataggio...'; el('#rg-esito').style.color = '#64748b';
    const base = {
      titolo, contenuto, stato,
      generato_da_tony: generatoDaTony,
      updated_at: new Date().toISOString(),
      ...(stato === 'approvato' ? { approvato_da: window.state?.user?.id || null, approvato_at: new Date().toISOString() } : {})
    };
    let error;
    if (docId) {
      ({ error } = await supa().from('azienda_documenti').update(base).eq('id', docId));
    } else {
      const { data: nuovo, error: e2 } = await supa().from('azienda_documenti')
        .insert({ azienda_id: aziendaId, tipo: 'regolamento', ...base }).select('id').single();
      error = e2; docId = nuovo?.id || null;
    }
    if (error) { el('#rg-esito').textContent = '❌ ' + error.message; el('#rg-esito').style.color = '#dc2626'; return; }
    el('#rg-esito').textContent = stato === 'approvato' ? '✅ Regolamento approvato e pubblicato!' : '💾 Bozza salvata.';
    el('#rg-esito').style.color = '#15803d';
    el('#rg-stato').innerHTML = stato === 'approvato'
      ? '<span style="background:#dcfce7;color:#15803d;border-radius:999px;padding:3px 10px;font-weight:700;">✅ APPROVATO</span>'
      : '<span style="background:#fef3c7;color:#92400e;border-radius:999px;padding:3px 10px;font-weight:700;">📝 BOZZA</span>';
  }
  el('#rg-salva').onclick = () => salvaRegolamento('bozza');
  el('#rg-approva').onclick = () => salvaRegolamento('approvato');
}
