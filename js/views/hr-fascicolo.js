// js/views/hr-fascicolo.js
// Admin: fascicolo completo dipendente
// Presenze, straordinari, ferie, documenti, note

const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

  // Carica lista dipendenti
  const { data: dipendenti } = await supa()
    .from('dipendenti')
    .select('id, nome, cognome, mansione, ruolo, sede_id, foto_url, avatar_url, email, telefono, ore_mensili_contrattuali, retribuzione_base, costo_orario, attivo, created_at, codice_fiscale, iban')
    .eq('azienda_id', aziendaId)
    .order('cognome');

  if (!dipendenti?.length) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Nessun dipendente trovato.</div>';
    return;
  }

  // Dipendente selezionato (da hash o primo della lista)
  const hashParam = window.location.hash.split('?')[1];
  const paramId = hashParam ? new URLSearchParams(hashParam).get('id') : null;
  let dipAttivo = dipendenti.find(d => d.id === paramId) || dipendenti[0];

  // Mese corrente
  const now = new Date();
  const meseStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const meseEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const annoStart = `${now.getFullYear()}-01-01`;
  const annoEnd = `${now.getFullYear()}-12-31`;

  async function caricaDatiDipendente(dip) {
    const [timbrature, richieste, documenti] = await Promise.all([
      // Timbrature mese corrente
      supa().from('timbrature')
        .select('ore_lavorate, ora_inizio, ora_fine, timestamp')
        .eq('dipendente_id', dip.id)
        .gte('timestamp', meseStart)
        .lte('timestamp', meseEnd + 'T23:59:59')
        .not('ore_lavorate', 'is', null),

      // Richieste anno corrente
      supa().from('richieste_assenze')
        .select('*')
        .eq('dipendente_id', dip.id)
        .gte('data_inizio', annoStart)
        .lte('data_inizio', annoEnd)
        .order('created_at', { ascending: false }),

      // Documenti
      supa().from('hr_documenti')
        .select('*')
        .eq('dipendente_id', dip.id)
        .order('created_at', { ascending: false })
    ]);

    return {
      timbrature: timbrature.data || [],
      richieste: richieste.data || [],
      documenti: documenti.data || [],
    };
  }

  async function renderFascicolo(dip) {
    const { timbrature, richieste, documenti } = await caricaDatiDipendente(dip);

    // Calcoli presenze
    const oreLavorate = timbrature.reduce((sum, t) => sum + Number(t.ore_lavorate || 0), 0);
    const oreContrattuali = Number(dip.ore_mensili_contrattuali || 0);
    const straordinari = Math.max(0, oreLavorate - oreContrattuali);
    const deficitOre = Math.max(0, oreContrattuali - oreLavorate);

    // Calcoli ferie anno
    const FERIE_ANNUE = 26; // giorni standard — personalizzabile
    const ferieUsate = richieste
      .filter(r => r.tipo === 'ferie' && r.stato === 'approvato')
      .reduce((sum, r) => {
        const inizio = new Date(r.data_inizio);
        const fine = new Date(r.data_fine || r.data_inizio);
        const giorni = Math.ceil((fine - inizio) / (1000 * 60 * 60 * 24)) + 1;
        return sum + giorni;
      }, 0);
    const ferieResidue = FERIE_ANNUE - ferieUsate;

    const permessiUsati = richieste
      .filter(r => r.tipo === 'permesso' && r.stato === 'approvato')
      .length;

    const richiesteInAttesa = richieste.filter(r => r.stato === 'richiesto');

    const STATI = {
      richiesto: { label: '⏳ In attesa', bg: '#fef3c7', color: '#92400e' },
      approvato: { label: '✅ Approvata', bg: '#dcfce7', color: '#15803d' },
      rifiutato: { label: '❌ Rifiutata', bg: '#fee2e2', color: '#dc2626' },
    };

    const TIPI_DOC = {
      contratto: '📋 Contratto', documento_identita: '🪪 Doc. identità',
      codice_fiscale: '🔢 Cod. fiscale', busta_paga: '💶 Busta paga',
      certificato_malattia: '🤒 Cert. malattia', haccp: '🧪 HACCP',
      sicurezza: '🦺 Sicurezza', attestato: '🏅 Attestato', altro: '📄 Altro'
    };

    const avatar = dip.foto_url || dip.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(dip.nome + ' ' + dip.cognome)}&background=0E5A7A&color=fff`;

    container.innerHTML = `
      <div style="min-height:100vh;background:#f8fafc;">

        <!-- Header con lista dipendenti -->
        <div style="background:white;border-bottom:1px solid #e5e7eb;padding:16px 20px;">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div style="font-size:17px;font-weight:700;color:#0f172a;">👥 Fascicolo dipendenti</div>
            <select id="sel-dip" class="input" style="flex:1;min-width:200px;max-width:300px;">
              ${dipendenti.map(d => `
                <option value="${d.id}" ${d.id === dip.id ? 'selected' : ''}>
                  ${d.cognome} ${d.nome} ${!d.attivo ? '(non attivo)' : ''}
                </option>
              `).join('')}
            </select>
            ${richiesteInAttesa.length ? `
              <span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">
                ⏳ ${richiesteInAttesa.length} in attesa
              </span>` : ''}
          </div>
        </div>

        <div style="max-width:800px;margin:0 auto;padding:20px;">

          <!-- Anagrafica -->
          <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px;display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">
            <img src="${avatar}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;flex-shrink:0;">
            <div style="flex:1;min-width:200px;">
              <div style="font-size:20px;font-weight:700;color:#0f172a;">${dip.nome} ${dip.cognome}</div>
              <div style="font-size:13px;color:#64748b;margin-top:2px;">${dip.mansione || ''} · ${dip.ruolo || ''}</div>
              <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;">
                ${dip.email ? `<div style="font-size:12px;color:#64748b;">📧 ${dip.email}</div>` : ''}
                ${dip.telefono ? `<div style="font-size:12px;color:#64748b;">📱 ${dip.telefono}</div>` : ''}
                ${dip.codice_fiscale ? `<div style="font-size:12px;color:#64748b;">🔢 ${dip.codice_fiscale}</div>` : ''}
                ${dip.iban ? `<div style="font-size:12px;color:#64748b;">🏦 ${dip.iban}</div>` : ''}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:12px;color:#64748b;">Ore contratto/mese</div>
              <div style="font-size:22px;font-weight:700;color:#0E5A7A;">${oreContrattuali}h</div>
              ${dip.retribuzione_base ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">💶 €${Number(dip.retribuzione_base).toFixed(0)}/mese</div>` : ''}
            </div>
          </div>

          <!-- KPI Presenze mese -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">
            ${[
              { label: 'Ore lavorate', value: oreLavorate.toFixed(1) + 'h', sub: 'questo mese', color: '#0E5A7A', bg: '#f0f9ff' },
              { label: 'Straordinari', value: straordinari.toFixed(1) + 'h', sub: 'da gestire', color: straordinari > 0 ? '#dc2626' : '#15803d', bg: straordinari > 0 ? '#fff5f5' : '#f0fdf4' },
              { label: 'Deficit ore', value: deficitOre.toFixed(1) + 'h', sub: 'mancanti', color: deficitOre > 0 ? '#f59e0b' : '#15803d', bg: deficitOre > 0 ? '#fffbeb' : '#f0fdf4' },
              { label: 'Ferie residue', value: ferieResidue + 'gg', sub: `su ${FERIE_ANNUE} annui`, color: ferieResidue < 5 ? '#dc2626' : '#0E5A7A', bg: ferieResidue < 5 ? '#fff5f5' : '#f0f9ff' },
              { label: 'Ferie usate', value: ferieUsate + 'gg', sub: `anno ${now.getFullYear()}`, color: '#64748b', bg: '#f8fafc' },
              { label: 'Permessi', value: permessiUsati, sub: `anno ${now.getFullYear()}`, color: '#64748b', bg: '#f8fafc' },
            ].map(k => `
              <div style="background:${k.bg};border-radius:12px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:700;color:${k.color};">${k.value}</div>
                <div style="font-size:12px;font-weight:600;color:#374151;margin-top:2px;">${k.label}</div>
                <div style="font-size:11px;color:#94a3b8;">${k.sub}</div>
              </div>
            `).join('')}
          </div>

          <!-- Alert straordinari -->
          ${straordinari >= 8 ? `
          <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;gap:12px;align-items:center;">
            <span style="font-size:24px;">⚠️</span>
            <div>
              <div style="font-weight:700;color:#dc2626;">Straordinari elevati</div>
              <div style="font-size:13px;color:#64748b;">${dip.nome} ha accumulato ${straordinari.toFixed(1)}h di straordinari. Considera di concedere ferie o recupero.</div>
            </div>
            <button id="btn-concedi-recupero" style="margin-left:auto;background:#dc2626;color:white;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">+ Concedi recupero</button>
          </div>` : ''}

          <!-- Richieste in attesa -->
          ${richiesteInAttesa.length ? `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">⏳ Richieste in attesa (${richiesteInAttesa.length})</div>
            ${richiesteInAttesa.map(r => `
              <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;">
                  <div style="font-weight:600;font-size:14px;">${r.tipo} — ${r.data_inizio}${r.data_fine !== r.data_inizio ? ` → ${r.data_fine}` : ''}</div>
                  ${r.note ? `<div style="font-size:12px;color:#64748b;">💬 ${r.note}</div>` : ''}
                </div>
                <div style="display:flex;gap:6px;">
                  <button data-approva="${r.id}" style="background:#16a34a;color:white;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:600;">✅ Approva</button>
                  <button data-rifiuta="${r.id}" style="background:#dc2626;color:white;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:600;">❌ Rifiuta</button>
                </div>
              </div>
            `).join('')}
          </div>` : ''}

          <!-- Storico richieste -->
          <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">📆 Storico ferie e permessi ${now.getFullYear()}</div>
            ${richieste.filter(r => r.stato !== 'richiesto').length === 0
              ? '<div style="color:#94a3b8;font-size:13px;">Nessuna richiesta approvata/rifiutata.</div>'
              : richieste.filter(r => r.stato !== 'richiesto').map(r => {
                  const s = STATI[r.stato] || STATI.richiesto;
                  return `
                    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;">
                      <span style="background:${s.bg};color:${s.color};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;">${s.label}</span>
                      <span style="font-size:13px;font-weight:600;">${r.tipo}</span>
                      <span style="font-size:12px;color:#64748b;">📅 ${r.data_inizio}${r.data_fine !== r.data_inizio ? ` → ${r.data_fine}` : ''}</span>
                      ${r.note ? `<span style="font-size:12px;color:#94a3b8;">💬 ${r.note}</span>` : ''}
                    </div>
                  `;
                }).join('')
            }
          </div>

          <!-- Documenti -->
          <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
              <div style="font-size:15px;font-weight:700;color:#0f172a;">📁 Documenti (${documenti.length})</div>
              <button id="btn-vai-documenti" style="background:#f0f9ff;border:1px solid #bae6fd;color:#0E5A7A;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:600;">
                Gestisci documenti →
              </button>
            </div>
            ${documenti.length === 0
              ? '<div style="color:#94a3b8;font-size:13px;">Nessun documento caricato.</div>'
              : documenti.slice(0, 5).map(d => `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                  <span style="font-size:18px;">📄</span>
                  <div style="flex:1;">
                    <div style="font-size:13px;font-weight:600;">${TIPI_DOC[d.tipo] || d.tipo}</div>
                    <div style="font-size:11px;color:#94a3b8;">${d.nome_file}${d.data_documento ? ` · ${d.data_documento}` : ''}</div>
                  </div>
                  <a href="${d.file_url}" target="_blank" style="font-size:12px;color:#0E5A7A;font-weight:600;">Scarica</a>
                </div>
              `).join('')
            }
          </div>

          <!-- Note interne admin -->
          <div style="background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin-bottom:16px;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">📝 Note interne</div>
            <textarea id="note-interne" class="input" rows="3" placeholder="Note private sull'amministrazione di questo dipendente..." style="width:100%;box-sizing:border-box;">${dip.profilo_ai?.note_admin || ''}</textarea>
            <button id="btn-salva-note" style="margin-top:10px;background:#0E5A7A;color:white;border:none;border-radius:8px;padding:8px 18px;cursor:pointer;font-size:13px;font-weight:600;">💾 Salva note</button>
            <span id="note-esito" style="font-size:12px;margin-left:10px;"></span>
          </div>

        </div>
      </div>
    `;

    // Bind eventi
    container.querySelector('#sel-dip')?.addEventListener('change', async function() {
      dipAttivo = dipendenti.find(d => d.id === this.value);
      await renderFascicolo(dipAttivo);
    });

    container.querySelector('#btn-vai-documenti')?.addEventListener('click', () => {
      window.location.hash = `#/hr-documenti?id=${dip.id}`;
    });

    container.querySelector('#btn-salva-note')?.addEventListener('click', async () => {
      const note = container.querySelector('#note-interne').value.trim();
      const esito = container.querySelector('#note-esito');
      const profiloAi = dip.profilo_ai || {};
      const { error } = await supa()
        .from('dipendenti')
        .update({ profilo_ai: { ...profiloAi, note_admin: note } })
        .eq('id', dip.id);
      esito.textContent = error ? '❌ Errore' : '✅ Salvato';
      esito.style.color = error ? '#dc2626' : '#16a34a';
      setTimeout(() => { esito.textContent = ''; }, 2000);
    });

    // Approva/rifiuta da fascicolo
    container.querySelectorAll('[data-approva]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await supa().from('richieste_assenze')
          .update({ stato: 'approvato', updated_at: new Date().toISOString() })
          .eq('id', btn.dataset.approva);
        // Notifica dipendente
        if (window.notify && dip.user_id) {
          await window.notify({
            tipo: 'approvazione',
            titolo: '✅ Richiesta approvata',
            messaggio: 'La tua richiesta è stata approvata.',
            destinatari: [dip.user_id],
          });
        }
        await renderFascicolo(dip);
      });
    });

    container.querySelectorAll('[data-rifiuta]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const motivo = prompt('Motivo rifiuto (opzionale):') || '';
        await supa().from('richieste_assenze')
          .update({ stato: 'rifiutato', note: motivo || null, updated_at: new Date().toISOString() })
          .eq('id', btn.dataset.rifiuta);
        if (window.notify && dip.user_id) {
          await window.notify({
            tipo: 'rifiuto',
            titolo: '❌ Richiesta rifiutata',
            messaggio: motivo || 'La tua richiesta è stata rifiutata.',
            destinatari: [dip.user_id],
          });
        }
        await renderFascicolo(dip);
      });
    });

    container.querySelector('#btn-concedi-recupero')?.addEventListener('click', async () => {
      const ore = prompt(`Concedi ore di recupero a ${dip.nome} (es. 8):`);
      if (!ore || isNaN(Number(ore))) return;
      await supa().from('richieste_assenze').insert({
        azienda_id: aziendaId,
        dipendente_id: dip.id,
        tipo: 'recupero',
        data_inizio: new Date().toISOString().slice(0, 10),
        data_fine: new Date().toISOString().slice(0, 10),
        note: `Recupero straordinari: ${ore}h concesse dall'admin`,
        stato: 'approvato',
        approvato_da: window.state?.user?.id,
      });
      await renderFascicolo(dip);
    });
  }

  await renderFascicolo(dipAttivo);
}
