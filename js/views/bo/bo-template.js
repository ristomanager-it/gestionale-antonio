// js/views/bo/bo-template.js
// Template Manager WhatsApp — lista, crea, testa

const supa = () => window.supabaseClient || window.supabase;

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;

  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

  // Carica connessione WhatsApp
  const { data: connAll } = await supa()
    .from('whatsapp_connessioni')
    .select('meta_access_token, meta_waba_id, meta_phone_number_id')
    .eq('azienda_id', aziendaId)
    .eq('modalita', 'meta')
    .eq('attivo', true);

  const conn = (connAll || []).find(c => !c.sede_id) || connAll?.[0] || null;

  if (!conn?.meta_access_token) {
    container.innerHTML = `
      <div style="padding:40px;text-align:center;color:#64748b;">
        <div style="font-size:32px;margin-bottom:12px;">📱</div>
        <div>Nessuna connessione WhatsApp attiva.</div>
        <div style="font-size:13px;margin-top:8px;">Configura WhatsApp in Configurazione → Integrazioni.</div>
      </div>`;
    return;
  }

  const STATI = {
    APPROVED: { label: '✅ Attivo', bg: '#dcfce7', color: '#15803d' },
    PENDING: { label: '⏳ In attesa', bg: '#fef3c7', color: '#92400e' },
    REJECTED: { label: '❌ Rifiutato', bg: '#fee2e2', color: '#dc2626' },
    PAUSED: { label: '⏸ In pausa', bg: '#f1f5f9', color: '#64748b' },
    DISABLED: { label: '🚫 Disabilitato', bg: '#f1f5f9', color: '#64748b' },
  };

  const CATEGORIE = ['UTILITY', 'MARKETING', 'AUTHENTICATION'];

  container.innerHTML = `
    <div style="min-height:100vh;background:#f8fafc;padding:20px;">
      <div style="max-width:800px;margin:0 auto;">

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:#25D366;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">💬</div>
            <div>
              <div style="font-size:20px;font-weight:700;color:#0f172a;">Template WhatsApp</div>
              <div style="font-size:13px;color:#64748b;">Gestisci i template per l'invio automatico</div>
            </div>
          </div>
          <button id="btn-nuovo-template" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;">
            + Nuovo template
          </button>
        </div>

        <!-- Form nuovo template (nascosto) -->
        <div id="form-template" style="display:none;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin-bottom:20px;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">Crea nuovo template</div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:12px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Nome template *</label>
              <input id="tmpl-nome" class="input" placeholder="es. conferma_ordine" style="width:100%;box-sizing:border-box;">
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Solo lettere minuscole, numeri e _</div>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Categoria *</label>
              <select id="tmpl-categoria" class="input" style="width:100%;box-sizing:border-box;">
                ${CATEGORIE.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Testo *</label>
            <textarea id="tmpl-testo" class="input" rows="4" placeholder="Es: Ciao {{1}}, la tua prenotazione del {{2}} è confermata!" style="width:100%;box-sizing:border-box;"></textarea>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">Usa {{1}}, {{2}}, {{3}}... per le variabili. Es: Ciao {{1}}, prenotazione confermata per il {{2}}.</div>
          </div>

          <div style="margin-bottom:16px;">
            <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Valori di esempio (separati da virgola)</label>
            <input id="tmpl-esempi" class="input" placeholder="Es: Mario Rossi, 15 Giugno 2026, 20:00" style="width:100%;box-sizing:border-box;">
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Servono a Meta per approvare il template</div>
          </div>

          <div id="tmpl-esito" style="font-size:13px;min-height:16px;margin-bottom:12px;"></div>

          <div style="display:flex;gap:10px;">
            <button id="btn-crea-template" style="background:#0E5A7A;color:white;border:none;border-radius:10px;padding:10px 24px;cursor:pointer;font-size:14px;font-weight:600;">
              📤 Invia a Meta
            </button>
            <button id="btn-annulla-form" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;">
              Annulla
            </button>
          </div>
        </div>

        <!-- Lista template -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;">I tuoi template</div>
          <button id="btn-aggiorna" style="background:#f1f5f9;border:1px solid #e5e7eb;color:#374151;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;">🔄 Aggiorna</button>
        </div>

        <div id="lista-template">
          <div style="color:#94a3b8;text-align:center;padding:20px;">Caricamento template...</div>
        </div>

        <!-- Modal test -->
        <div id="modal-test" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
          <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:460px;">
            <div style="font-size:16px;font-weight:700;margin-bottom:4px;" id="modal-test-titolo">Testa template</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:16px;" id="modal-test-preview"></div>
            <div style="margin-bottom:12px;">
              <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Numero destinatario *</label>
              <input id="test-numero" class="input" placeholder="+393331234567" style="width:100%;box-sizing:border-box;">
            </div>
            <div id="test-params-wrap"></div>
            <div id="test-esito" style="font-size:13px;min-height:16px;margin-bottom:12px;"></div>
            <div style="display:flex;gap:10px;">
              <button id="btn-invia-test" style="flex:1;background:#25D366;color:white;border:none;border-radius:10px;padding:10px;cursor:pointer;font-size:14px;font-weight:600;">📤 Invia</button>
              <button id="btn-chiudi-modal" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;">Chiudi</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  let templateAttivo = null;

  // Carica template da Meta
  async function caricaTemplate() {
    const el = container.querySelector('#lista-template');
    el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">Caricamento...</div>';

    try {
      const res = await fetch(
        `https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/whatsapp-get-templates`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0`
          },
          body: JSON.stringify({ azienda_id: aziendaId })
        }
      );
      const data = await res.json();
      const templates = data.templates || [];

      if (!templates.length) {
        el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:20px;">Nessun template trovato.</div>';
        return;
      }

      el.innerHTML = templates.map(t => {
        const s = STATI[t.status] || { label: t.status, bg: '#f1f5f9', color: '#64748b' };
        const testo = t.components?.find(c => c.type === 'BODY')?.text || '';
        const nVars = (testo.match(/{{(\d+)}}/g) || []).length;

        return `
          <div style="background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div style="flex:1;min-width:200px;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                  <span style="font-weight:700;font-size:14px;font-family:monospace;">${t.name}</span>
                  <span style="background:${s.bg};color:${s.color};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;">${s.label}</span>
                  <span style="background:#f0f9ff;color:#0E5A7A;padding:2px 10px;border-radius:20px;font-size:11px;">${t.category}</span>
                </div>
                <div style="font-size:13px;color:#374151;background:#f8fafc;padding:8px 12px;border-radius:8px;margin-bottom:6px;">${testo || 'Nessun testo'}</div>
                ${nVars > 0 ? `<div style="font-size:11px;color:#64748b;">🔢 ${nVars} variabil${nVars === 1 ? 'e' : 'i'}</div>` : '<div style="font-size:11px;color:#94a3b8;">Nessuna variabile</div>'}
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${t.status === 'APPROVED' ? `
                  <button data-test="${t.name}" data-testo="${encodeURIComponent(testo)}" data-vars="${nVars}" style="background:#25D366;color:white;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:600;">🧪 Testa</button>
                ` : ''}
                <button data-del="${t.name}" style="background:#fee2e2;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12px;color:#dc2626;">🗑</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Bind testa
      el.querySelectorAll('[data-test]').forEach(btn => {
        btn.addEventListener('click', () => {
          templateAttivo = {
            name: btn.dataset.test,
            testo: decodeURIComponent(btn.dataset.testo),
            nVars: parseInt(btn.dataset.vars)
          };
          apriModalTest();
        });
      });

      // Bind elimina
      el.querySelectorAll('[data-del]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm(`Eliminare il template "${btn.dataset.del}"?`)) return;
          await eliminaTemplate(btn.dataset.del);
          await caricaTemplate();
        });
      });

    } catch(e) {
      el.innerHTML = `<div style="color:#dc2626;text-align:center;padding:20px;">Errore: ${e.message}</div>`;
    }
  }

  function apriModalTest() {
    const modal = container.querySelector('#modal-test');
    container.querySelector('#modal-test-titolo').textContent = `Testa: ${templateAttivo.name}`;
    container.querySelector('#modal-test-preview').textContent = templateAttivo.testo;

    const wrap = container.querySelector('#test-params-wrap');
    wrap.innerHTML = '';

    for (let i = 1; i <= templateAttivo.nVars; i++) {
      wrap.innerHTML += `
        <div style="margin-bottom:10px;">
          <label style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:4px;">Variabile {{${i}}}</label>
          <input id="test-var-${i}" class="input" placeholder="Valore per {{${i}}}" style="width:100%;box-sizing:border-box;">
        </div>
      `;
    }

    container.querySelector('#test-esito').textContent = '';
    modal.style.display = 'flex';
  }

  async function eliminaTemplate(nome) {
    const res = await fetch(
      `https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/whatsapp-get-templates`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0`
        },
        body: JSON.stringify({ azienda_id: aziendaId, template_name: nome })
      }
    );
    return res.json();
  }

  // Bottoni
  container.querySelector('#btn-nuovo-template').addEventListener('click', () => {
    const form = container.querySelector('#form-template');
    form.style.display = form.style.display === 'none' ? '' : 'none';
  });

  container.querySelector('#btn-annulla-form').addEventListener('click', () => {
    container.querySelector('#form-template').style.display = 'none';
  });

  container.querySelector('#btn-aggiorna').addEventListener('click', caricaTemplate);

  container.querySelector('#btn-chiudi-modal').addEventListener('click', () => {
    container.querySelector('#modal-test').style.display = 'none';
  });

  // Crea template
  container.querySelector('#btn-crea-template').addEventListener('click', async () => {
    const esito = container.querySelector('#tmpl-esito');
    const nome = container.querySelector('#tmpl-nome').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const categoria = container.querySelector('#tmpl-categoria').value;
    const testo = container.querySelector('#tmpl-testo').value.trim();
    const esempiRaw = container.querySelector('#tmpl-esempi').value.trim();

    if (!nome || !testo) {
      esito.textContent = '❌ Nome e testo obbligatori';
      esito.style.color = '#dc2626';
      return;
    }

    const esempi = esempiRaw ? esempiRaw.split(',').map(s => s.trim()) : ['esempio'];

    esito.textContent = 'Invio a Meta...'; esito.style.color = '#64748b';

    const res = await fetch(
      `https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/whatsapp-create-templates`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0`
        },
        body: JSON.stringify({
          azienda_id: aziendaId,
          single: { name: nome, category: categoria, text: testo, example: esempi }
        })
      }
    );

    const data = await res.json();
    if (data.success) {
      esito.textContent = '✅ Template inviato a Meta — in attesa di approvazione';
      esito.style.color = '#16a34a';
      container.querySelector('#tmpl-nome').value = '';
      container.querySelector('#tmpl-testo').value = '';
      container.querySelector('#tmpl-esempi').value = '';
      setTimeout(() => caricaTemplate(), 2000);
    } else {
      esito.textContent = '❌ ' + (data.error || 'Errore');
      esito.style.color = '#dc2626';
    }
  });

  // Invia test
  container.querySelector('#btn-invia-test').addEventListener('click', async () => {
    const esito = container.querySelector('#test-esito');
    const numero = container.querySelector('#test-numero').value.trim();

    if (!numero) {
      esito.textContent = '❌ Numero obbligatorio';
      esito.style.color = '#dc2626';
      return;
    }

    const params = [];
    for (let i = 1; i <= templateAttivo.nVars; i++) {
      params.push(container.querySelector(`#test-var-${i}`)?.value.trim() || `var${i}`);
    }

    esito.textContent = 'Invio...'; esito.style.color = '#64748b';

    const res = await fetch(
      `https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/whatsapp-send-ts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0`
        },
        body: JSON.stringify({
          azienda_id: aziendaId,
          numero_dest: numero,
          template_name: templateAttivo.name,
          template_params: params.length > 0 ? params : undefined,
          contesto: 'test'
        })
      }
    );

    const data = await res.json();
    if (data.success) {
      esito.textContent = '✅ Messaggio inviato!';
      esito.style.color = '#16a34a';
    } else {
      esito.textContent = '❌ ' + (data.error || 'Errore');
      esito.style.color = '#dc2626';
    }
  });

  await caricaTemplate();
}
