// js/views/hr-documenti.js
// Fascicolo documenti dipendente
// Admin: vede e carica documenti per tutti
// Operatore: vede solo i propri documenti visibili

const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  const ruolo = window.state?.ruolo;
  const isAdmin = ['admin', 'manager', 'superadmin'].includes(ruolo);
  const hash = window.location.hash;
  const isMeMode = hash.includes('hr-documenti-me') || !isAdmin;

  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

  // Carica dipendenti
  const { data: dipendenti } = await supa()
    .from('dipendenti')
    .select('id, nome, cognome, mansione, foto_url, attivo')
    .eq('azienda_id', aziendaId)
    .eq('attivo', true)
    .order('cognome');

  // Dipendente loggato
  const { data: me } = await supa()
    .from('dipendenti')
    .select('id, nome, cognome')
    .eq('user_id', window.state?.user?.id)
    .eq('azienda_id', aziendaId)
    .maybeSingle();

  const TIPI = {
    contratto: '📋 Contratto',
    documento_identita: '🪪 Documento identità',
    codice_fiscale: '🔢 Codice fiscale',
    busta_paga: '💶 Busta paga',
    certificato_malattia: '🤒 Certificato malattia',
    haccp: '🧪 HACCP',
    sicurezza: '🦺 Sicurezza',
    attestato: '🏅 Attestato',
    altro: '📄 Altro'
  };

  let dipSelezionato = isMeMode ? me : (dipendenti?.[0] || null);
  let documenti = [];

  async function caricaDocumenti(dipId) {
    let q = supa()
      .from('hr_documenti')
      .select('*')
      .eq('dipendente_id', dipId)
      .order('created_at', { ascending: false });

    if (!isAdmin) q = q.eq('visibile_dipendente', true);

    const { data } = await q;
    documenti = data || [];
  }

  if (dipSelezionato) await caricaDocumenti(dipSelezionato.id);

  const sediOpts = (dipendenti || []).map(d =>
    `<option value="${d.id}" ${d.id === dipSelezionato?.id ? 'selected' : ''}>${d.cognome} ${d.nome}</option>`
  ).join('');

  container.innerHTML = `
    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:700px;margin:0 auto;">

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <div style="width:40px;height:40px;background:#0E5A7A;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">📁</div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">${isAdmin ? 'Fascicolo dipendenti' : 'I miei documenti'}</div>
            <div style="font-size:13px;color:#64748b;">${isAdmin ? 'Gestisci i documenti del personale' : 'Documenti condivisi dall\'amministrazione'}</div>
          </div>
        </div>

        ${isAdmin ? `
        <!-- Selezione dipendente -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:20px;">
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:6px;">Seleziona dipendente</label>
          <select id="sel-dipendente" class="input" style="width:100%;box-sizing:border-box;">
            ${sediOpts}
          </select>
        </div>
        ` : `
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#0369a1;">
          👋 Ciao <strong>${me?.nome} ${me?.cognome}</strong> — qui trovi i documenti che l'amministrazione ha condiviso con te.
        </div>
        `}

        ${isAdmin ? `
        <!-- Upload documento -->
        <div style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin-bottom:20px;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">+ Carica documento</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Tipo *</label>
              <select id="doc-tipo" class="input" style="width:100%;box-sizing:border-box;">
                ${Object.entries(TIPI).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Data documento</label>
              <input id="doc-data" type="date" class="input" style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Data scadenza</label>
              <input id="doc-scadenza" type="date" class="input" style="width:100%;box-sizing:border-box;">
            </div>
          </div>

          <!-- Busta paga: mese/anno -->
          <div id="busta-paga-wrap" style="display:none;display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Mese</label>
              <select id="doc-mese" class="input" style="width:100%;box-sizing:border-box;">
                ${['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'].map((m,i) => `<option value="${i+1}">${m}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Anno</label>
              <input id="doc-anno" type="number" value="${new Date().getFullYear()}" class="input" style="width:100%;box-sizing:border-box;">
            </div>
          </div>

          <div style="margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Descrizione</label>
            <input id="doc-descrizione" class="input" placeholder="Es. Contratto a tempo indeterminato..." style="width:100%;box-sizing:border-box;">
          </div>

          <div style="margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">File * (PDF o immagine)</label>
            <input id="doc-file" type="file" accept=".pdf,image/*" style="font-size:13px;">
          </div>

          <div style="margin-top:12px;display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="doc-visibile" style="width:16px;height:16px;">
            <label for="doc-visibile" style="font-size:13px;">👁️ Visibile al dipendente</label>
          </div>

          <div id="doc-esito" style="font-size:13px;min-height:16px;margin-top:12px;"></div>

          <button id="btn-carica-doc" style="margin-top:16px;background:#0E5A7A;color:white;border:none;border-radius:10px;padding:12px 24px;cursor:pointer;font-size:14px;font-weight:600;">
            📤 Carica documento
          </button>
        </div>
        ` : ''}

        <!-- Lista documenti -->
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;" id="lista-title">
          Documenti ${dipSelezionato ? `di ${dipSelezionato.nome} ${dipSelezionato.cognome}` : ''}
        </div>
        <div id="lista-documenti"></div>

      </div>
    </div>
  `;

  function renderListaDocumenti() {
    const el = container.querySelector('#lista-documenti');
    if (!documenti.length) {
      el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:12px 0;">Nessun documento caricato.</div>';
      return;
    }

    // Raggruppa per tipo
    const gruppi = {};
    documenti.forEach(d => {
      if (!gruppi[d.tipo]) gruppi[d.tipo] = [];
      gruppi[d.tipo].push(d);
    });

    el.innerHTML = Object.entries(gruppi).map(([tipo, docs]) => `
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;font-weight:700;color:#64748b;margin-bottom:8px;">${TIPI[tipo] || tipo}</div>
        ${docs.map(d => {
          const scadenza = d.data_scadenza
            ? new Date(d.data_scadenza) < new Date()
              ? `<span style="color:#dc2626;font-size:11px;">⚠️ Scaduto</span>`
              : `<span style="color:#64748b;font-size:11px;">Scade: ${d.data_scadenza}</span>`
            : '';
          const bustaPaga = d.tipo === 'busta_paga' && d.mese_riferimento
            ? `${['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][d.mese_riferimento-1]} ${d.anno_riferimento}`
            : '';

          return `
            <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <div style="font-size:24px;">📄</div>
              <div style="flex:1;min-width:150px;">
                <div style="font-weight:600;font-size:14px;">${d.nome_file}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">
                  ${bustaPaga ? `📅 ${bustaPaga} · ` : ''}
                  ${d.data_documento ? `${d.data_documento} · ` : ''}
                  ${d.descrizione ? `${d.descrizione}` : ''}
                  ${scadenza}
                </div>
                ${isAdmin && d.visibile_dipendente ? '<div style="font-size:11px;color:#0E5A7A;">👁️ Visibile al dipendente</div>' : ''}
              </div>
              <div style="display:flex;gap:6px;">
                <a href="${d.file_url}" target="_blank" style="background:#f0f9ff;border:1px solid #bae6fd;padding:6px 14px;border-radius:8px;text-decoration:none;font-size:12px;color:#0E5A7A;font-weight:600;">📥 Scarica</a>
                ${isAdmin ? `<button data-del="${d.id}" style="background:#fee2e2;border:none;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');

    el.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Eliminare questo documento?')) return;
        await supa().from('hr_documenti').delete().eq('id', btn.dataset.del);
        documenti = documenti.filter(d => d.id !== btn.dataset.del);
        renderListaDocumenti();
      });
    });
  }

  renderListaDocumenti();

  if (isAdmin) {
    // Selezione dipendente
    container.querySelector('#sel-dipendente')?.addEventListener('change', async function() {
      dipSelezionato = dipendenti.find(d => d.id === this.value);
      container.querySelector('#lista-title').textContent =
        `Documenti di ${dipSelezionato?.nome} ${dipSelezionato?.cognome}`;
      await caricaDocumenti(dipSelezionato.id);
      renderListaDocumenti();
    });

    // Mostra campi busta paga
    container.querySelector('#doc-tipo')?.addEventListener('change', function() {
      const wrap = container.querySelector('#busta-paga-wrap');
      if (wrap) wrap.style.display = this.value === 'busta_paga' ? 'grid' : 'none';
    });

    // Upload documento
    container.querySelector('#btn-carica-doc')?.addEventListener('click', async () => {
      const esito = container.querySelector('#doc-esito');
      const file = container.querySelector('#doc-file')?.files?.[0];
      const tipo = container.querySelector('#doc-tipo').value;

      if (!file) { esito.textContent = '❌ Seleziona un file'; esito.style.color = '#dc2626'; return; }
      if (!dipSelezionato) { esito.textContent = '❌ Seleziona un dipendente'; esito.style.color = '#dc2626'; return; }

      esito.textContent = 'Caricamento...'; esito.style.color = '#64748b';

      // Upload su Supabase Storage
      const path = `hr/${aziendaId}/${dipSelezionato.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supa().storage.from('documenti-hr').upload(path, file);

      if (upErr) {
        // Storage non configurato — salva URL placeholder
        console.warn('Storage non disponibile:', upErr.message);
      }

      const { data: pub } = supa().storage.from('documenti-hr').getPublicUrl(path);

      const { data: nuovoDoc, error } = await supa()
        .from('hr_documenti')
        .insert({
          azienda_id: aziendaId,
          dipendente_id: dipSelezionato.id,
          tipo,
          nome_file: file.name,
          file_url: pub?.publicUrl || path,
          dimensione_bytes: file.size,
          mime_type: file.type,
          descrizione: container.querySelector('#doc-descrizione').value.trim() || null,
          data_documento: container.querySelector('#doc-data').value || null,
          data_scadenza: container.querySelector('#doc-scadenza').value || null,
          visibile_dipendente: container.querySelector('#doc-visibile').checked,
          mese_riferimento: tipo === 'busta_paga' ? parseInt(container.querySelector('#doc-mese').value) : null,
          anno_riferimento: tipo === 'busta_paga' ? parseInt(container.querySelector('#doc-anno').value) : null,
          uploaded_by: me?.id || null,
        })
        .select('*')
        .single();

      if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }

      esito.textContent = '✅ Documento caricato!'; esito.style.color = '#16a34a';
      documenti.unshift(nuovoDoc);
      renderListaDocumenti();

      // Notifica dipendente se visibile
      if (container.querySelector('#doc-visibile').checked) {
        await supa().from('notifiche').insert({
          azienda_id: aziendaId,
          dipendente_id: dipSelezionato.id,
          tipo: 'documento',
          titolo: '📄 Nuovo documento disponibile',
          testo: `${TIPI[tipo]} — ${file.name}`,
          link: '#/hr-documenti-me',
        }).catch(() => {});
      }

      // Reset
      container.querySelector('#doc-file').value = '';
      container.querySelector('#doc-descrizione').value = '';
    });
  }
}
