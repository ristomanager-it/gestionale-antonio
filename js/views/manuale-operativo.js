// js/views/manuale-operativo.js — Manuale operativo dinamico (Fase 1)
// Identità + valori/comportamenti + ruolo del dipendente + le sue procedure. Sempre aggiornato, per ruolo.

const supa = () => window.supabaseClient || window.supabase;

function esc(s) { return String(s ?? '').replace(/</g, '&lt;'); }

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = '<div style="padding:40px;color:#94a3b8;">Nessuna azienda attiva.</div>'; return; }

  container.innerHTML = '<div style="padding:40px;color:#94a3b8;text-align:center;">📖 Preparazione del manuale...</div>';

  // Ruolo da mostrare: ?ruolo=ID (anteprima) oppure quello del dipendente loggato
  const hashQuery = (window.location.hash.split('?')[1] || '');
  const params = new URLSearchParams(hashQuery);
  let ruoloId = params.get('ruolo') || null;

  const [identRes, valoriRes, ruoliRes, meRes] = await Promise.all([
    supa().from('azienda_identita').select('gc_why,mission,promessa_cliente,standard_servizio,tone_of_voice').eq('azienda_id', aziendaId).maybeSingle(),
    supa().from('azienda_valori').select('nome,descrizione,azienda_valori_comportamenti(tipo,testo,ordine)').eq('azienda_id', aziendaId).eq('attivo', true).order('ordine'),
    supa().from('ruoli_organizzativi').select('id,nome,area,obiettivo,responsabilita').eq('azienda_id', aziendaId).eq('attivo', true).order('ordine'),
    supa().from('dipendenti').select('id,nome,ruolo_organizzativo_id').eq('azienda_id', aziendaId).eq('user_id', window.state?.user?.id).maybeSingle()
  ]);

  const ident = identRes.data;
  const valori = valoriRes.data || [];
  const ruoli = ruoliRes.data || [];
  const me = meRes.data;
  if (!ruoloId && me?.ruolo_organizzativo_id) ruoloId = me.ruolo_organizzativo_id;
  const ruolo = ruoli.find(r => String(r.id) === String(ruoloId)) || null;

  const nomeAzienda = window.state?.azienda?.nome || 'La nostra azienda';
  const nomeSede = window.state?.sedeAttiva?.nome || '';

  let html = `
    <div style="max-width:760px;margin:0 auto;padding:16px 16px 60px;">
      <button id="man-back" style="background:none;border:none;color:#0E5A7A;font-size:14px;font-weight:700;cursor:pointer;padding:0;margin-bottom:10px;">← Indietro</button>

      <div style="background:linear-gradient(135deg,#0E5A7A,#1a8fb5);color:#fff;border-radius:16px;padding:26px 22px;margin-bottom:18px;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.85;">Manuale operativo</div>
        <div style="font-size:24px;font-weight:800;margin-top:4px;">${esc(nomeAzienda)}</div>
        ${nomeSede ? `<div style="font-size:13px;opacity:.85;margin-top:2px;">${esc(nomeSede)}</div>` : ''}
        ${me ? `<div style="font-size:13px;margin-top:10px;background:rgba(255,255,255,.15);display:inline-block;padding:5px 12px;border-radius:999px;">👋 Ciao ${esc(me.nome)}</div>` : ''}
      </div>`;

  // ── Selettore ruolo (anteprima titolare / dipendente senza ruolo) ──
  if (ruoli.length) {
    html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap;">
      <span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Ruolo:</span>
      <select id="man-ruolo" style="flex:1;min-width:180px;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;background:#fff;">
        <option value="">— Solo parte generale —</option>
        ${ruoli.map(r => `<option value="${r.id}" ${ruolo && String(ruolo.id) === String(r.id) ? 'selected' : ''}>${esc(r.nome)}${r.area ? ' (' + esc(r.area) + ')' : ''}</option>`).join('')}
      </select>
    </div>`;
  }

  // ── 1. Chi siamo ──
  if (ident && (ident.gc_why || ident.mission || ident.promessa_cliente)) {
    html += `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:14px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:12px;">🏠 Chi siamo e perché lo facciamo</div>
      ${ident.gc_why ? `<div style="font-size:14px;color:#334155;line-height:1.7;font-style:italic;border-left:3px solid #0E5A7A;padding-left:14px;margin-bottom:12px;">"${esc(ident.gc_why)}"</div>` : ''}
      ${ident.mission ? `<div style="font-size:13.5px;color:#475569;line-height:1.6;margin-bottom:10px;">${esc(ident.mission)}</div>` : ''}
      ${ident.promessa_cliente ? `<div style="background:#f0f9ff;border-radius:10px;padding:12px;font-size:13.5px;color:#0E5A7A;line-height:1.6;"><strong>🤝 La nostra promessa a ogni cliente:</strong><br>${esc(ident.promessa_cliente)}</div>` : ''}
      ${ident.standard_servizio ? `<div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.7;"><strong>I nostri standard:</strong> ${esc(ident.standard_servizio)}</div>` : ''}
    </div>`;
  } else {
    html += `<div style="background:#fef3c7;border-radius:12px;padding:14px;font-size:13px;color:#92400e;margin-bottom:14px;">⚠️ L'identità aziendale non è ancora compilata: il titolare può crearla in 5 minuti con il wizard in Configurazione → Identità.</div>`;
  }

  // ── 2. I nostri valori ──
  if (valori.length) {
    html += `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px;margin-bottom:14px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px;">⭐ I nostri valori</div>
      <div style="font-size:12.5px;color:#94a3b8;margin-bottom:14px;">Non parole: comportamenti. È così che ci riconosciamo.</div>
      ${valori.map(v => {
        const comp = (v.azienda_valori_comportamenti || []).sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
        const attesi = comp.filter(c => (c.tipo || 'atteso') === 'atteso');
        const no = comp.filter(c => c.tipo === 'non_accettato');
        return `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:10px;">
          <div style="font-size:14.5px;font-weight:800;color:#0f172a;">${esc(v.nome)}</div>
          ${v.descrizione ? `<div style="font-size:12.5px;color:#64748b;margin-top:2px;">${esc(v.descrizione)}</div>` : ''}
          ${attesi.length ? `<div style="margin-top:8px;font-size:13px;color:#15803d;line-height:1.7;">${attesi.map(c => '✅ ' + esc(c.testo)).join('<br>')}</div>` : ''}
          ${no.length ? `<div style="margin-top:6px;font-size:13px;color:#dc2626;line-height:1.7;">${no.map(c => '🚫 ' + esc(c.testo)).join('<br>')}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── 3. Il tuo ruolo ──
  if (ruolo) {
    const resp = Array.isArray(ruolo.responsabilita) ? ruolo.responsabilita : [];
    html += `<div style="background:#fff;border:2px solid #0E5A7A;border-radius:14px;padding:20px;margin-bottom:14px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">🎯 Il tuo ruolo: ${esc(ruolo.nome)}</div>
      ${ruolo.obiettivo ? `<div style="font-size:13.5px;color:#334155;line-height:1.6;margin-top:8px;background:#f0f9ff;border-radius:10px;padding:12px;"><strong>La tua missione:</strong> ${esc(ruolo.obiettivo)}</div>` : ''}
      ${resp.length ? `<div style="margin-top:12px;">
        <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Le tue responsabilità</div>
        ${resp.map((r, i) => `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px;color:#334155;line-height:1.5;"><span style="color:#0E5A7A;font-weight:800;min-width:22px;">${i + 1}.</span><span>${esc(r)}</span></div>`).join('')}
      </div>` : ''}
      <div id="man-procedure" style="margin-top:14px;"></div>
    </div>`;
  } else if (ruoli.length) {
    html += `<div style="background:#f1f5f9;border-radius:12px;padding:14px;font-size:13px;color:#475569;margin-bottom:14px;">Seleziona un ruolo qui sopra per vedere mansionario e procedure.</div>`;
  }

  html += `<div style="text-align:center;font-size:11px;color:#cbd5e1;margin-top:20px;">Manuale sempre aggiornato · generato da Ristoflow</div></div>`;
  container.innerHTML = html;

  container.querySelector('#man-back').onclick = () => { window.location.hash = '#/organizzazione'; };
  const sel = container.querySelector('#man-ruolo');
  if (sel) sel.onchange = () => { window.location.hash = '#/manuale-operativo' + (sel.value ? '?ruolo=' + sel.value : ''); };

  // ── 4. Le procedure del ruolo ──
  if (ruolo) {
    const box = container.querySelector('#man-procedure');
    const { data: legami } = await supa().from('ruoli_procedure')
      .select('ordine, procedure_sala(id,nome,categoria,difficolta,durata_min,obiettivo)')
      .eq('ruolo_id', ruolo.id).order('ordine');
    const procs = (legami || []).map(l => l.procedure_sala).filter(Boolean);
    if (procs.length) {
      box.innerHTML = `<div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Le tue procedure (${procs.length})</div>` +
        procs.map(p => `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px;">
          <div style="font-size:13.5px;font-weight:700;color:#0f172a;">📋 ${esc(p.nome)}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${[p.categoria, p.difficolta ? 'Difficoltà: ' + p.difficolta : '', p.durata_min ? p.durata_min + ' min' : ''].filter(Boolean).join(' · ')}</div>
          ${p.obiettivo ? `<div style="font-size:12.5px;color:#475569;margin-top:4px;line-height:1.5;">${esc(p.obiettivo)}</div>` : ''}
        </div>`).join('');
    } else {
      box.innerHTML = `<div style="font-size:12.5px;color:#94a3b8;background:#f8fafc;border-radius:10px;padding:12px;">Nessuna procedura collegata a questo ruolo ancora. Si collegano da 🏛️ Ruoli & Organizzazione (in arrivo) o dalle Procedure.</div>`;
    }
  }
}
