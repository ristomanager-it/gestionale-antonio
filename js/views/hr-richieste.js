// js/views/hr-richieste.js
// Operatore: richiedi ferie, permessi, malattia

const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  const user = window.state?.user;

  // Trova il dipendente loggato
  const { data: me } = await supa()
    .from('dipendenti')
    .select('id, nome, cognome, email')
    .eq('user_id', user.id)
    .eq('azienda_id', aziendaId)
    .maybeSingle();

  if (!me) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b;">Profilo dipendente non trovato.</div>`;
    return;
  }

  const { data: richieste } = await supa()
    .from('hr_richieste')
    .select('*')
    .eq('dipendente_id', me.id)
    .order('created_at', { ascending: false });

  const TIPI = {
    ferie: '🏖️ Ferie',
    permesso_orario: '⏰ Permesso orario',
    permesso_giornaliero: '📅 Permesso giornaliero',
    malattia: '🤒 Malattia',
    recupero: '🔄 Recupero',
    altro: '📝 Altro'
  };

  const STATI = {
    in_attesa: { label: 'In attesa', bg: '#fef3c7', color: '#92400e' },
    approvata: { label: 'Approvata ✅', bg: '#dcfce7', color: '#15803d' },
    rifiutata: { label: 'Rifiutata ❌', bg: '#fee2e2', color: '#dc2626' },
    annullata: { label: 'Annullata', bg: '#f1f5f9', color: '#64748b' },
  };

  container.innerHTML = `
    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:600px;margin:0 auto;">

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <div style="width:40px;height:40px;background:#0E5A7A;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">📆</div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">Richieste ferie e permessi</div>
            <div style="font-size:13px;color:#64748b;">Ciao ${me.nome} — invia una nuova richiesta</div>
          </div>
        </div>

        <!-- Form nuova richiesta -->
        <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;padding:24px;margin-bottom:24px;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">+ Nuova richiesta</div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Tipo *</label>
              <select id="hr-tipo" class="input" style="width:100%;box-sizing:border-box;">
                ${Object.entries(TIPI).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Turno</label>
              <select id="hr-turno" class="input" style="width:100%;box-sizing:border-box;">
                <option value="intero">Intera giornata</option>
                <option value="mattina">Solo mattina</option>
                <option value="pomeriggio">Solo pomeriggio</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Data inizio *</label>
              <input id="hr-data-inizio" type="date" class="input" style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Data fine</label>
              <input id="hr-data-fine" type="date" class="input" style="width:100%;box-sizing:border-box;">
            </div>
          </div>

          <div style="margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Note (opzionale)</label>
            <textarea id="hr-note" class="input" rows="2" placeholder="Motivo, dettagli..." style="width:100%;box-sizing:border-box;"></textarea>
          </div>

          <!-- Upload allegato per malattia -->
          <div id="hr-allegato-wrap" style="display:none;margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Certificato medico</label>
            <input id="hr-allegato" type="file" accept="image/*,.pdf" style="font-size:13px;">
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">Carica foto o PDF del certificato</div>
          </div>

          <div id="hr-esito" style="font-size:13px;min-height:16px;margin-top:12px;"></div>

          <button id="btn-invia-richiesta" style="margin-top:16px;background:#0E5A7A;color:white;border:none;border-radius:10px;padding:12px 24px;cursor:pointer;font-size:14px;font-weight:600;width:100%;">
            📤 Invia richiesta
          </button>
        </div>

        <!-- Lista richieste precedenti -->
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">Le mie richieste</div>

        <div id="lista-richieste"></div>

      </div>
    </div>
  `;

  // Mostra/nascondi allegato per malattia
  container.querySelector('#hr-tipo').addEventListener('change', function() {
    const wrap = container.querySelector('#hr-allegato-wrap');
    wrap.style.display = this.value === 'malattia' ? '' : 'none';
  });

  // Data inizio default oggi
  const oggi = new Date().toISOString().slice(0, 10);
  container.querySelector('#hr-data-inizio').value = oggi;

  // Render lista richieste
  function renderLista() {
    const el = container.querySelector('#lista-richieste');
    if (!richieste?.length) {
      el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:12px 0;">Nessuna richiesta ancora.</div>';
      return;
    }
    el.innerHTML = richieste.map(r => {
      const s = STATI[r.stato] || STATI.in_attesa;
      const t = TIPI[r.tipo] || r.tipo;
      const date = r.data_fine && r.data_fine !== r.data_inizio
        ? `${r.data_inizio} → ${r.data_fine}`
        : r.data_inizio;
      return `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-weight:700;font-size:14px;">${t}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px;">📅 ${date}${r.turno ? ` · ${r.turno}` : ''}</div>
              ${r.note_dipendente ? `<div style="font-size:12px;color:#64748b;margin-top:3px;">💬 ${r.note_dipendente}</div>` : ''}
              ${r.note_admin ? `<div style="font-size:12px;color:#0E5A7A;margin-top:3px;">👨‍💼 Admin: ${r.note_admin}</div>` : ''}
            </div>
            <span style="background:${s.bg};color:${s.color};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;">${s.label}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderLista();

  // Invia richiesta
  container.querySelector('#btn-invia-richiesta').addEventListener('click', async () => {
    const esito = container.querySelector('#hr-esito');
    const tipo = container.querySelector('#hr-tipo').value;
    const dataInizio = container.querySelector('#hr-data-inizio').value;
    const dataFine = container.querySelector('#hr-data-fine').value;
    const turno = container.querySelector('#hr-turno').value;
    const note = container.querySelector('#hr-note').value.trim();
    const allegatoFile = container.querySelector('#hr-allegato')?.files?.[0];

    if (!dataInizio) {
      esito.textContent = '❌ Data inizio obbligatoria';
      esito.style.color = '#dc2626';
      return;
    }

    esito.textContent = 'Invio in corso...';
    esito.style.color = '#64748b';

    let allegatoUrl = null;
    let allegatoNome = null;

    // Upload allegato se presente
    if (allegatoFile) {
      const path = `hr/${aziendaId}/${me.id}/${Date.now()}-${allegatoFile.name}`;
      const { data: uploaded, error: upErr } = await supa()
        .storage.from('documenti-hr')
        .upload(path, allegatoFile);
      if (upErr) {
        esito.textContent = '❌ Errore caricamento allegato: ' + upErr.message;
        esito.style.color = '#dc2626';
        return;
      }
      const { data: pub } = supa().storage.from('documenti-hr').getPublicUrl(path);
      allegatoUrl = pub.publicUrl;
      allegatoNome = allegatoFile.name;
    }

    const { data: nuova, error } = await supa()
      .from('hr_richieste')
      .insert({
        azienda_id: aziendaId,
        sede_id: window.state?.sedeAttiva?.id || null,
        dipendente_id: me.id,
        tipo,
        data_inizio: dataInizio,
        data_fine: dataFine || dataInizio,
        turno,
        note_dipendente: note || null,
        allegato_url: allegatoUrl,
        allegato_nome: allegatoNome,
        stato: 'in_attesa',
      })
      .select('*')
      .single();

    if (error) {
      esito.textContent = '❌ ' + error.message;
      esito.style.color = '#dc2626';
      return;
    }

    // Notifica in-app all'admin
    await inviaNotificaAdmin(me, tipo, dataInizio, dataFine, nuova.id);

    esito.textContent = '✅ Richiesta inviata! L\'admin riceverà una notifica.';
    esito.style.color = '#16a34a';

    richieste.unshift(nuova);
    renderLista();

    // Reset form
    container.querySelector('#hr-note').value = '';
    container.querySelector('#hr-data-fine').value = '';
  });

  async function inviaNotificaAdmin(dip, tipo, dataInizio, dataFine, richiestaId) {
    try {
      // Trova admin dell'azienda
      const { data: admins } = await supa()
        .from('dipendenti')
        .select('id, email, nome')
        .eq('azienda_id', aziendaId)
        .in('ruolo', ['admin', 'manager']);

      if (!admins?.length) return;

      // Notifica in-app per ogni admin
      const notifiche = admins.map(a => ({
        azienda_id: aziendaId,
        dipendente_id: a.id,
        tipo: 'richiesta_ferie',
        titolo: `${TIPI[tipo]} — ${dip.nome} ${dip.cognome}`,
        testo: `Richiesta per il ${dataInizio}${dataFine && dataFine !== dataInizio ? ` → ${dataFine}` : ''}`,
        link: '#/hr-admin',
        riferimento_tipo: 'hr_richiesta',
        riferimento_id: richiestaId,
      }));

      await supa().from('notifiche').insert(notifiche);

      // Email via Edge Function Resend
      if (admins[0]?.email) {
        await fetch(`${window.SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            to: admins.map(a => a.email).filter(Boolean),
            subject: `Nuova richiesta ${TIPI[tipo]} — ${dip.nome} ${dip.cognome}`,
            html: `
              <h2>Nuova richiesta ricevuta</h2>
              <p><strong>${dip.nome} ${dip.cognome}</strong> ha inviato una richiesta di <strong>${TIPI[tipo]}</strong>.</p>
              <p>📅 Periodo: ${dataInizio}${dataFine && dataFine !== dataInizio ? ` → ${dataFine}` : ''}</p>
              <p>Accedi a Ristoflow per approvare o rifiutare.</p>
            `
          })
        }).catch(() => {}); // Non bloccare se email fallisce
      }
    } catch(e) {
      console.warn('Notifica admin non inviata:', e);
    }
  }
}
