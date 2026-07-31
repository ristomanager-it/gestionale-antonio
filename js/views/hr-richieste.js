// js/views/hr-richieste.js
// Operatore: richiedi ferie, permessi, malattia
// Usa tabella richieste_assenze (già esistente)

const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  const user = window.state?.user;
  const sedeId = window.state?.sedeAttiva?.id || null;

  // Trova dipendente loggato
  const { data: me } = await supa()
    .from('dipendenti')
    .select('id, nome, cognome, email, ruolo')
    .eq('user_id', user.id)
    .eq('azienda_id', aziendaId)
    .maybeSingle();

  if (!me) {
    container.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b;">Profilo dipendente non trovato. Contatta l'amministratore.</div>`;
    return;
  }

  // Carica le mie richieste
  const { data: richieste } = await supa()
    .from('richieste_assenze')
    .select('*')
    .eq('dipendente_id', me.id)
    .order('created_at', { ascending: false });

  const STATI = {
    richiesto:  { label: '⏳ In attesa',  bg: '#fef3c7', color: '#92400e' },
    approvato:  { label: '✅ Approvata',  bg: '#dcfce7', color: '#15803d' },
    rifiutato:  { label: '❌ Rifiutata',  bg: '#fee2e2', color: '#dc2626' },
  };

  const oggi = new Date().toISOString().slice(0, 10);

  container.innerHTML = `
    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:600px;margin:0 auto;">

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <div style="width:40px;height:40px;background:#0E5A7A;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">📆</div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">Ferie e Permessi</div>
            <div style="font-size:13px;color:#64748b;">Ciao ${me.nome} — invia una nuova richiesta</div>
          </div>
        </div>

        <!-- Form nuova richiesta -->
        <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;padding:24px;margin-bottom:24px;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">+ Nuova richiesta</div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Tipo *</label>
              <select id="hr-tipo" class="input" style="width:100%;box-sizing:border-box;">
                <option value="ferie">🏖️ Ferie</option>
                <option value="permesso">⏰ Permesso</option>
                <option value="malattia">🤒 Malattia</option>
                <option value="recupero">🔄 Recupero</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Data inizio *</label>
              <input id="hr-data-inizio" type="date" class="input" value="${oggi}" style="width:100%;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Data fine</label>
              <input id="hr-data-fine" type="date" class="input" value="${oggi}" style="width:100%;box-sizing:border-box;">
            </div>
          </div>

          <div style="margin-top:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Note</label>
            <textarea id="hr-note" class="input" rows="2" placeholder="Motivo, dettagli..." style="width:100%;box-sizing:border-box;"></textarea>
          </div>

          <!-- Allegato — visibile solo per malattia -->
          <div id="hr-allegato-wrap" style="display:none;margin-top:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px;">
            <label style="font-size:12px;font-weight:600;color:#0E5A7A;display:block;margin-bottom:8px;">📎 Certificato medico</label>
            <div style="display:flex;gap:8px;margin-bottom:10px;">
              <button id="btn-mode-file" data-mode="file" class="btn-allegato-mode" style="flex:1;padding:8px;border-radius:8px;border:2px solid #0E5A7A;background:#f0f9ff;color:#0E5A7A;cursor:pointer;font-size:12px;font-weight:600;">📁 Carica file</button>
              <button id="btn-mode-url" data-mode="url" class="btn-allegato-mode" style="flex:1;padding:8px;border-radius:8px;border:1px solid #e5e7eb;background:white;color:#64748b;cursor:pointer;font-size:12px;">🔗 Inserisci link</button>
            </div>
            <div id="allegato-file-wrap">
              <input id="hr-allegato" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" style="font-size:13px;width:100%;">
              <div style="font-size:11px;color:#64748b;margin-top:4px;">Foto o PDF — max 10MB</div>
            </div>
            <div id="allegato-url-wrap" style="display:none;">
              <input id="hr-allegato-url" class="input" placeholder="https://... (link al documento)" style="width:100%;box-sizing:border-box;">
              <div style="font-size:11px;color:#64748b;margin-top:4px;">Es. link Google Drive, Dropbox, email del medico</div>
            </div>
          </div>

          <div id="hr-esito" style="font-size:13px;min-height:16px;margin-top:12px;"></div>

          <button id="btn-invia" style="margin-top:16px;background:#0E5A7A;color:white;border:none;border-radius:10px;padding:12px 24px;cursor:pointer;font-size:14px;font-weight:600;width:100%;">
            📤 Invia richiesta
          </button>
        </div>

        <!-- Lista richieste -->
        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">Le mie richieste</div>
        <div id="lista-richieste"></div>

      </div>
    </div>
  `;

  function renderLista() {
    const el = container.querySelector('#lista-richieste');
    if (!richieste?.length) {
      el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:12px 0;">Nessuna richiesta ancora.</div>';
      return;
    }
    el.innerHTML = richieste.map(r => {
      const s = STATI[r.stato] || STATI.richiesto;
      const date = r.data_fine && r.data_fine !== r.data_inizio
        ? `${r.data_inizio} → ${r.data_fine}`
        : r.data_inizio;
      return `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-weight:700;font-size:14px;">${r.tipo}</div>
              <div style="font-size:12px;color:#64748b;margin-top:3px;">📅 ${date}</div>
              ${r.note ? `<div style="font-size:12px;color:#64748b;margin-top:3px;">💬 ${r.note}</div>` : ''}
              ${r.allegato_url ? `<a href="${r.allegato_url}" target="_blank" style="font-size:12px;color:#0E5A7A;display:inline-block;margin-top:4px;">📎 ${r.allegato_nome || 'Vedi allegato'}</a>` : ''}
            </div>
            <span style="background:${s.bg};color:${s.color};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;">${s.label}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderLista();

  // Mostra/nascondi allegato per malattia
  container.querySelector('#hr-tipo').addEventListener('change', function() {
    const wrap = container.querySelector('#hr-allegato-wrap');
    wrap.style.display = this.value === 'malattia' ? '' : 'none';
  });

  // Toggle file / url
  container.querySelectorAll('.btn-allegato-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      container.querySelectorAll('.btn-allegato-mode').forEach(b => {
        const attivo = b.dataset.mode === mode;
        b.style.border = attivo ? '2px solid #0E5A7A' : '1px solid #e5e7eb';
        b.style.background = attivo ? '#f0f9ff' : 'white';
        b.style.color = attivo ? '#0E5A7A' : '#64748b';
      });
      container.querySelector('#allegato-file-wrap').style.display = mode === 'file' ? '' : 'none';
      container.querySelector('#allegato-url-wrap').style.display = mode === 'url' ? '' : 'none';
    });
  });

  container.querySelector('#btn-invia').addEventListener('click', async () => {
    const esito = container.querySelector('#hr-esito');
    const tipo = container.querySelector('#hr-tipo').value;
    const dataInizio = container.querySelector('#hr-data-inizio').value;
    const dataFine = container.querySelector('#hr-data-fine').value || dataInizio;
    const note = container.querySelector('#hr-note').value.trim();

    if (!dataInizio) {
      esito.textContent = '❌ Data inizio obbligatoria';
      esito.style.color = '#dc2626';
      return;
    }

    esito.textContent = 'Invio...'; esito.style.color = '#64748b';

    // Gestione allegato
    let allegatoUrl = null;
    let allegatoNome = null;

    if (tipo === 'malattia') {
      const modeUrl = container.querySelector('#allegato-url-wrap')?.style.display !== 'none';
      if (modeUrl) {
        allegatoUrl = container.querySelector('#hr-allegato-url')?.value.trim() || null;
        allegatoNome = allegatoUrl ? 'link esterno' : null;
      } else {
        const file = container.querySelector('#hr-allegato')?.files?.[0];
        if (file) {
          esito.textContent = 'Caricamento allegato...'; esito.style.color = '#64748b';
          const path = `${aziendaId}/${me.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supa().storage.from('documenti-hr').upload(path, file);
          if (upErr) {
            esito.textContent = '❌ Errore caricamento: ' + upErr.message;
            esito.style.color = '#dc2626';
            return;
          }
          // Crea signed URL valido 1 anno
          const { data: signed } = await supa().storage
            .from('documenti-hr')
            .createSignedUrl(path, 365 * 24 * 60 * 60);
          allegatoUrl = signed?.signedUrl || null;
          allegatoNome = file.name;
        }
      }
    }

    const { data: nuova, error } = await supa()
      .from('richieste_assenze')
      .insert({
        azienda_id: aziendaId,
        sede_id: null, // sede_id è integer nel DB, UUID non compatibile
        dipendente_id: me.id,
        tipo,
        data_inizio: dataInizio,
        data_fine: dataFine,
        note: note || null,
        stato: 'richiesto',
        richiesto_da: user.id,
        tipo_ruolo_richiedente: me.ruolo,
        allegato_url: allegatoUrl,
        allegato_nome: allegatoNome,
      })
      .select('*')
      .single();

    if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }

    // Notifica in-app agli admin via window.notify
    const { data: admins } = await supa()
      .from('dipendenti')
      .select('id, user_id')
      .eq('azienda_id', aziendaId)
      .in('ruolo', ['admin', 'manager']);

    if (admins?.length && window.notify) {
      const destinatari = admins.map(a => a.user_id).filter(Boolean);
      await window.notify({
        tipo: 'richiesta_ferie',
        titolo: `${tipo} — ${me.nome} ${me.cognome}`,
        messaggio: `Richiesta per il ${dataInizio}${dataFine !== dataInizio ? ` → ${dataFine}` : ''}`,
        destinatari,
        riferimento_id: nuova.id,
        riferimento_tipo: 'richiesta_assenza',
        priorita: 'normale'
      });
    }

    esito.textContent = '✅ Richiesta inviata!'; esito.style.color = '#16a34a';
    richieste.unshift(nuova);
    renderLista();
    container.querySelector('#hr-note').value = '';
  });
}
