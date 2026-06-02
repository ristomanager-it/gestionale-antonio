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
    .eq('dipendente_id', user.id)
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
            </div>
            <span style="background:${s.bg};color:${s.color};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;">${s.label}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderLista();

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

    const { data: nuova, error } = await supa()
      .from('richieste_assenze')
      .insert({
        azienda_id: aziendaId,
        sede_id: sedeId,
        dipendente_id: user.id,
        tipo,
        data_inizio: dataInizio,
        data_fine: dataFine,
        note: note || null,
        stato: 'richiesto',
        richiesto_da: user.id,
        tipo_ruolo_richiedente: me.ruolo,
      })
      .select('*')
      .single();

    if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }

    // Notifica in-app agli admin
    const { data: admins } = await supa()
      .from('dipendenti')
      .select('id')
      .eq('azienda_id', aziendaId)
      .in('ruolo', ['admin', 'manager']);

    if (admins?.length) {
      await supa().from('notifiche').insert(
        admins.map(a => ({
          azienda_id: aziendaId,
          dipendente_id: a.id,
          tipo: 'richiesta_ferie',
          titolo: `${tipo} — ${me.nome} ${me.cognome}`,
          testo: `Richiesta per il ${dataInizio}${dataFine !== dataInizio ? ` → ${dataFine}` : ''}`,
          link: '#/hr-admin',
        }))
      ).catch(() => {});
    }

    esito.textContent = '✅ Richiesta inviata!'; esito.style.color = '#16a34a';
    richieste.unshift(nuova);
    renderLista();
    container.querySelector('#hr-note').value = '';
  });
}
