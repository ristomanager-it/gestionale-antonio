// js/views/hr-admin.js
// Admin: gestione richieste ferie, permessi, malattia

const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

  const { data: richieste } = await supa()
    .from('hr_richieste')
    .select('*, dipendenti(nome, cognome, email, mansione, foto_url)')
    .eq('azienda_id', aziendaId)
    .order('created_at', { ascending: false });

  const { data: meAdmin } = await supa()
    .from('dipendenti')
    .select('id')
    .eq('user_id', window.state?.user?.id)
    .eq('azienda_id', aziendaId)
    .maybeSingle();

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
    approvata: { label: 'Approvata', bg: '#dcfce7', color: '#15803d' },
    rifiutata: { label: 'Rifiutata', bg: '#fee2e2', color: '#dc2626' },
    annullata: { label: 'Annullata', bg: '#f1f5f9', color: '#64748b' },
  };

  let filtroStato = 'in_attesa';

  container.innerHTML = `
    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:700px;margin:0 auto;">

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <div style="width:40px;height:40px;background:#0E5A7A;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">📋</div>
          <div>
            <div style="font-size:20px;font-weight:700;color:#0f172a;">Gestione richieste</div>
            <div style="font-size:13px;color:#64748b;">Approva o rifiuta le richieste del personale</div>
          </div>
        </div>

        <!-- Filtri -->
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          ${Object.entries(STATI).map(([k, s]) => `
            <button data-filtro="${k}" class="btn-filtro-stato" style="
              padding:6px 16px;border-radius:20px;border:1px solid ${k === filtroStato ? s.color : '#e5e7eb'};
              background:${k === filtroStato ? s.bg : 'white'};color:${k === filtroStato ? s.color : '#374151'};
              font-size:12px;font-weight:600;cursor:pointer;
            ">${s.label} <span class="badge-${k}" style="font-weight:700;"></span></button>
          `).join('')}
          <button data-filtro="" class="btn-filtro-stato" style="padding:6px 16px;border-radius:20px;border:1px solid #e5e7eb;background:white;color:#374151;font-size:12px;cursor:pointer;">Tutte</button>
        </div>

        <div id="lista-richieste-admin"></div>

        <!-- Modal risposta -->
        <div id="modal-risposta" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
          <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:460px;">
            <div style="font-size:16px;font-weight:700;margin-bottom:16px;" id="modal-titolo">Risposta richiesta</div>
            <textarea id="modal-note" class="input" rows="3" placeholder="Note per il dipendente (opzionale)..." style="width:100%;box-sizing:border-box;margin-bottom:16px;"></textarea>
            <div style="display:flex;gap:10px;">
              <button id="btn-approva" style="flex:1;background:#16a34a;color:white;border:none;border-radius:10px;padding:12px;cursor:pointer;font-size:14px;font-weight:600;">✅ Approva</button>
              <button id="btn-rifiuta" style="flex:1;background:#dc2626;color:white;border:none;border-radius:10px;padding:12px;cursor:pointer;font-size:14px;font-weight:600;">❌ Rifiuta</button>
              <button id="btn-annulla-modal" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:12px 16px;cursor:pointer;font-size:14px;">Annulla</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  let richiestaAttiva = null;

  // Badge contatori
  function aggiornaBadge() {
    Object.keys(STATI).forEach(k => {
      const badge = container.querySelector(`.badge-${k}`);
      if (badge) {
        const n = (richieste || []).filter(r => r.stato === k).length;
        badge.textContent = n > 0 ? `(${n})` : '';
      }
    });
  }

  function renderLista() {
    const el = container.querySelector('#lista-richieste-admin');
    const lista = filtroStato
      ? (richieste || []).filter(r => r.stato === filtroStato)
      : (richieste || []);

    if (!lista.length) {
      el.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:12px 0;">Nessuna richiesta.</div>';
      return;
    }

    el.innerHTML = lista.map(r => {
      const s = STATI[r.stato] || STATI.in_attesa;
      const t = TIPI[r.tipo] || r.tipo;
      const dip = r.dipendenti || {};
      const date = r.data_fine && r.data_fine !== r.data_inizio
        ? `${r.data_inizio} → ${r.data_fine}`
        : r.data_inizio;

      return `
        <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px;">
          <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
            <div style="width:36px;height:36px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
              ${dip.foto_url ? `<img src="${dip.foto_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">` : '👤'}
            </div>
            <div style="flex:1;min-width:180px;">
              <div style="font-weight:700;font-size:14px;">${dip.nome || ''} ${dip.cognome || ''}</div>
              <div style="font-size:12px;color:#64748b;">${dip.mansione || ''}</div>
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-top:6px;">${t}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">📅 ${date}${r.turno ? ` · ${r.turno}` : ''}</div>
              ${r.note_dipendente ? `<div style="font-size:12px;color:#374151;margin-top:4px;background:#f8fafc;padding:6px 10px;border-radius:6px;">💬 ${r.note_dipendente}</div>` : ''}
              ${r.allegato_url ? `<a href="${r.allegato_url}" target="_blank" style="font-size:12px;color:#0E5A7A;display:inline-block;margin-top:4px;">📎 Vedi allegato</a>` : ''}
              ${r.note_admin ? `<div style="font-size:12px;color:#0E5A7A;margin-top:4px;">👨‍💼 ${r.note_admin}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
              <span style="background:${s.bg};color:${s.color};padding:3px 12px;border-radius:20px;font-size:11px;font-weight:600;">${s.label}</span>
              ${r.stato === 'in_attesa' ? `
                <button data-id="${r.id}" class="btn-rispondi" style="background:#0E5A7A;color:white;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">Rispondi</button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.btn-rispondi').forEach(btn => {
      btn.addEventListener('click', () => {
        richiestaAttiva = richieste.find(r => r.id === btn.dataset.id);
        const dip = richiestaAttiva?.dipendenti || {};
        container.querySelector('#modal-titolo').textContent =
          `Risposta a ${dip.nome} ${dip.cognome} — ${TIPI[richiestaAttiva.tipo]}`;
        container.querySelector('#modal-note').value = '';
        const modal = container.querySelector('#modal-risposta');
        modal.style.display = 'flex';
      });
    });
  }

  aggiornaBadge();
  renderLista();

  // Filtri
  container.querySelectorAll('.btn-filtro-stato').forEach(btn => {
    btn.addEventListener('click', () => {
      filtroStato = btn.dataset.filtro;
      container.querySelectorAll('.btn-filtro-stato').forEach(b => {
        const k = b.dataset.filtro;
        const s = STATI[k] || { bg: 'white', color: '#374151' };
        const attivo = k === filtroStato;
        b.style.background = attivo ? s.bg : 'white';
        b.style.color = attivo ? s.color : '#374151';
        b.style.borderColor = attivo ? s.color : '#e5e7eb';
      });
      renderLista();
    });
  });

  // Modal
  container.querySelector('#btn-annulla-modal').addEventListener('click', () => {
    container.querySelector('#modal-risposta').style.display = 'none';
  });

  async function rispondi(nuovoStato) {
    if (!richiestaAttiva) return;
    const noteAdmin = container.querySelector('#modal-note').value.trim();

    const { error } = await supa()
      .from('hr_richieste')
      .update({
        stato: nuovoStato,
        note_admin: noteAdmin || null,
        gestita_da: meAdmin?.id || null,
        gestita_il: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', richiestaAttiva.id);

    if (error) { alert('Errore: ' + error.message); return; }

    // Aggiorna locale
    const idx = richieste.findIndex(r => r.id === richiestaAttiva.id);
    if (idx >= 0) {
      richieste[idx].stato = nuovoStato;
      richieste[idx].note_admin = noteAdmin;
    }

    // Notifica in-app al dipendente
    await supa().from('notifiche').insert({
      azienda_id: aziendaId,
      dipendente_id: richiestaAttiva.dipendente_id,
      tipo: nuovoStato === 'approvata' ? 'approvazione' : 'rifiuto',
      titolo: nuovoStato === 'approvata' ? '✅ Richiesta approvata' : '❌ Richiesta rifiutata',
      testo: noteAdmin || (nuovoStato === 'approvata' ? 'La tua richiesta è stata approvata.' : 'La tua richiesta è stata rifiutata.'),
      link: '#/hr-richieste',
      riferimento_tipo: 'hr_richiesta',
      riferimento_id: richiestaAttiva.id,
    });

    // Email al dipendente
    const dipEmail = richiestaAttiva.dipendenti?.email;
    const dipNome = `${richiestaAttiva.dipendenti?.nome} ${richiestaAttiva.dipendenti?.cognome}`;
    if (dipEmail) {
      await fetch(`${window.SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          to: [dipEmail],
          subject: nuovoStato === 'approvata' ? '✅ Richiesta approvata' : '❌ Richiesta rifiutata',
          html: `
            <h2>Ciao ${dipNome},</h2>
            <p>La tua richiesta di <strong>${TIPI[richiestaAttiva.tipo]}</strong> per il <strong>${richiestaAttiva.data_inizio}</strong> è stata <strong>${nuovoStato === 'approvata' ? 'APPROVATA ✅' : 'RIFIUTATA ❌'}</strong>.</p>
            ${noteAdmin ? `<p>Note: ${noteAdmin}</p>` : ''}
          `
        })
      }).catch(() => {});
    }

    container.querySelector('#modal-risposta').style.display = 'none';
    aggiornaBadge();
    renderLista();
  }

  container.querySelector('#btn-approva').addEventListener('click', () => rispondi('approvata'));
  container.querySelector('#btn-rifiuta').addEventListener('click', () => rispondi('rifiutata'));
}
