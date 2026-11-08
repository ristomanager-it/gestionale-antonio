// AVVII AGENTI — checklist di avvio dei locali firmati dagli agenti (13 passaggi in 4 giorni).
// Deciso con Antonio l'8/11/2026: dopo la serata del 18/01/2027 ogni locale va attivo con la promo di
// San Valentino online entro venerdì 22. L'agente spunta i passaggi nella Home Agente (scheda Avvii),
// Antonio vede l'avanzamento e abilita gli agenti in Piattaforma › Programma Agenti › Avvii.
// Chi è abilitato e chiude la checklist entro 4 giorni dalla firma prende il 15% (rete_compensi.perc_agente_avvio).
// Tabella: agenti_avvii_passi (lead_id null = prova sull'azienda DEMO).

const sb = () => window.supabaseClient || window.supabase;

export const PASSI = [
  { id: 'azienda',   giorno: 'Martedì — il locale esiste',   testo: 'Azienda e sede create, con indirizzo, orari e giorni di chiusura' },
  { id: 'accesso',   giorno: 'Martedì — il locale esiste',   testo: 'Il titolare entra con il suo accesso' },
  { id: 'personale', giorno: 'Martedì — il locale esiste',   testo: 'Personale inserito con ruolo e PIN' },
  { id: 'menu',      giorno: 'Mercoledì — il locale si vede', testo: 'Menu e prodotti caricati, con le foto se ci sono' },
  { id: 'prenota',   giorno: 'Mercoledì — il locale si vede', testo: 'Modulo prenotazioni attivo' },
  { id: 'sito',      giorno: 'Mercoledì — il locale si vede', testo: 'Sito generato e pubblicato' },
  { id: 'whatsapp',  giorno: 'Giovedì — il locale risponde', testo: 'WhatsApp collegato' },
  { id: 'fidelity',  giorno: 'Giovedì — il locale risponde', testo: 'Fidelity attiva' },
  { id: 'meta',      giorno: 'Giovedì — il locale risponde', testo: 'Pagine Facebook e Instagram collegate con Collega Meta' },
  { id: 'promo',     giorno: 'Venerdì — il locale lavora',   testo: 'Promo di San Valentino creata dal modello: nome, foto e prezzo del locale' },
  { id: 'coupon',    giorno: 'Venerdì — il locale lavora',   testo: 'Coupon attivo e provato in cassa' },
  { id: 'campagna',  giorno: 'Venerdì — il locale lavora',   testo: 'Campagna lanciata con il budget scelto dal titolare' },
  { id: 'tony',      giorno: 'Venerdì — il locale lavora',   testo: 'Quindici minuti con il titolare: come chiedere a Tony di vedere come va la campagna' },
];
const TOT = PASSI.length;
const GIORNI_AVVIO = 4;

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataIt = d => d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : '';

// passaggi spuntati: di un agente (agenteId) o di tutti (null, solo superadmin)
export async function caricaPassi(agenteId) {
  let q = sb().from('agenti_avvii_passi').select('id, agente_id, lead_id, passo, fatto_il');
  if (agenteId) q = q.eq('agente_id', agenteId);
  const { data, error } = await q;
  if (error) { console.warn('avvii: passi non letti', error); return []; }
  return data || [];
}

function passiDi(passi, agenteId, leadId) {
  return passi.filter(p => p.agente_id === agenteId && (p.lead_id || null) === (leadId || null));
}

export function stato(passi, agenteId, leadId) {
  const miei = passiDi(passi, agenteId, leadId);
  const fatti = new Set(miei.map(p => p.passo).filter(id => PASSI.some(x => x.id === id)));
  const ultimo = miei.reduce((m, p) => (!m || p.fatto_il > m ? p.fatto_il : m), null);
  return { fatti, n: fatti.size, completo: fatti.size === TOT, ultimo };
}

// 15%: agente abilitato, checklist completa, chiusa entro 4 giorni dalla firma (data_conversione)
export function avvioOk(lead, agente, passi) {
  if (!lead || !agente || !agente.abilitato_avvio || agente.tipo === 'segnalatore' || !lead.data_conversione) return false;
  const s = stato(passi, agente.id, lead.id);
  if (!s.completo || !s.ultimo) return false;
  const limite = new Date(lead.data_conversione + 'T23:59:59');
  limite.setDate(limite.getDate() + GIORNI_AVVIO);
  return new Date(s.ultimo) <= limite;
}

function scadenza(lead) {
  if (!lead.data_conversione) return '';
  const d = new Date(lead.data_conversione + 'T12:00:00');
  d.setDate(d.getDate() + GIORNI_AVVIO);
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

function checklistHtml(chiave, s, modificabile) {
  let html = '', giorno = '';
  PASSI.forEach(p => {
    if (p.giorno !== giorno) { giorno = p.giorno; html += '<div class="av-giorno">' + esc(giorno) + '</div>'; }
    const ok = s.fatti.has(p.id);
    html += '<label class="av-passo' + (ok ? ' ok' : '') + '">' +
      '<input type="checkbox" data-av="' + chiave + '" data-passo="' + p.id + '"' + (ok ? ' checked' : '') + (modificabile ? '' : ' disabled') + '>' +
      '<span>' + esc(p.testo) + '</span></label>';
  });
  return html;
}

const CSS = '.av-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:10px}' +
  '.av-testa{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;font-size:14px;color:#1f2937}' +
  '.av-conto{font-size:12px;font-weight:700;color:#059669;white-space:nowrap}' +
  '.av-barra{height:8px;background:#e5e7eb;border-radius:8px;margin:8px 0 6px;overflow:hidden}.av-barra i{display:block;height:100%;background:#059669;transition:width .3s}' +
  '.av-giorno{font-size:12px;font-weight:800;color:#7C3AED;margin:12px 0 2px}' +
  '.av-passo{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;padding:7px 0;cursor:pointer;color:#1f2937}' +
  '.av-passo input{width:20px;height:20px;flex:none;margin:0;accent-color:#059669}' +
  '.av-passo.ok span{color:#94a3b8;text-decoration:line-through}' +
  '.av-nota{font-size:12.5px;color:#64748b;line-height:1.5}' +
  '.av-t{width:100%;border-collapse:collapse;font-size:13px}.av-t th,.av-t td{text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top}' +
  '.av-btn{border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;background:#7C3AED;color:#fff}' +
  '.av-btn.grigio{background:#f1f5f9;color:#64748b}';

function barra(s) {
  return '<div class="av-barra"><i style="width:' + Math.round(s.n / TOT * 100) + '%"></i></div>';
}

async function salvaPasso(agenteId, leadId, passo, fatto) {
  if (fatto) {
    const { error } = await sb().from('agenti_avvii_passi').insert({ agente_id: agenteId, lead_id: leadId || null, passo: passo });
    if (error && error.code !== '23505') throw error;
  } else {
    let q = sb().from('agenti_avvii_passi').delete().eq('agente_id', agenteId).eq('passo', passo);
    q = leadId ? q.eq('lead_id', leadId) : q.is('lead_id', null);
    const { error } = await q;
    if (error) throw error;
  }
}

// HOME AGENTE — scheda Avvii
export async function montaAvviiAgente(el, agente, leads) {
  el.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center">Caricamento…</div>';
  let passi = await caricaPassi(agente.id);
  const clienti = (leads || []).filter(l => l.stato === 'pagante')
    .sort((a, b) => String(b.data_conversione || '').localeCompare(String(a.data_conversione || '')));

  const disegna = () => {
    let html = '<style>' + CSS + '</style>';
    if (agente.tipo === 'segnalatore') {
      html += '<div class="av-card"><div class="av-nota">L\'avvio dei locali lo fanno gli agenti venditori. Come segnalatore porti il contatto: al resto pensa Antonio.</div></div>';
      el.innerHTML = html; return;
    }
    if (!agente.abilitato_avvio) {
      const s = stato(passi, agente.id, null);
      html += '<div class="av-card"><div class="av-testa"><span>Prova sull\'azienda DEMO</span><span class="av-conto">' + s.n + ' su ' + TOT + '</span></div>' + barra(s) +
        '<div class="av-nota">Fai da solo tutti i passaggi sull\'azienda DEMO entro lunedì 14 dicembre. Quando hai finito, Antonio controlla e ti abilita: da lì sui locali che fai partire in quattro giorni prendi il 15%.</div>' +
        checklistHtml('demo', s, true) + '</div>';
    } else {
      html += '<div class="av-card"><div class="av-nota">✅ Sei abilitato all\'avvio' + (agente.abilitato_avvio_il ? ' dal ' + dataIt(agente.abilitato_avvio_il) : '') +
        '. Chiudi la checklist entro quattro giorni dalla firma e la provvigione del primo anno sale al 15%.</div></div>';
    }
    if (!clienti.length) {
      html += '<div class="av-card"><div class="av-nota">Qui compaiono i clienti che hai chiuso, ognuno con la sua checklist. Per ora non ce ne sono.</div></div>';
    }
    clienti.forEach(l => {
      const s = stato(passi, agente.id, l.id);
      const sc = scadenza(l);
      html += '<div class="av-card"><div class="av-testa"><span>' + esc(l.nome_locale || 'Cliente') + '</span><span class="av-conto">' + s.n + ' su ' + TOT +
        (s.completo ? ' · fatto' : (sc ? ' · entro ' + esc(sc) : '')) + '</span></div>' + barra(s) +
        checklistHtml(l.id, s, true) + '</div>';
    });
    el.innerHTML = html;
    el.querySelectorAll('input[data-av]').forEach(cb => {
      cb.onchange = async () => {
        const leadId = cb.dataset.av === 'demo' ? null : cb.dataset.av;
        cb.disabled = true;
        try {
          await salvaPasso(agente.id, leadId, cb.dataset.passo, cb.checked);
          passi = await caricaPassi(agente.id);
          disegna();
        } catch (e) {
          cb.checked = !cb.checked; cb.disabled = false;
          alert('Non salvato: ' + (e.message || e));
        }
      };
    });
  };
  disegna();
}

// PIATTAFORMA › Programma Agenti — scheda Avvii (solo superadmin)
export async function montaAvviiAdmin(el, agenti) {
  el.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center">Caricamento…</div>';
  const [passi, leadRes] = await Promise.all([
    caricaPassi(null),
    sb().from('agenti_lead').select('id, agente_id, nome_locale, stato, data_conversione').eq('stato', 'pagante'),
  ]);
  const leads = leadRes.data || [];
  const venditori = (agenti || []).filter(a => a.stato === 'attivo' && a.tipo !== 'segnalatore');

  let righe = '';
  venditori.forEach(a => {
    const demo = stato(passi, a.id, null);
    const abil = a.abilitato_avvio
      ? 'Sì' + (a.abilitato_avvio_il ? ', dal ' + dataIt(a.abilitato_avvio_il) : '') + ' <button class="av-btn grigio" data-abil="' + a.id + '" data-v="0">Revoca</button>'
      : 'Prova DEMO ' + demo.n + '/' + TOT + ' <button class="av-btn" data-abil="' + a.id + '" data-v="1"' + (demo.completo ? '' : ' title="La prova non è completa"') + '>Abilita</button>';
    const suoi = leads.filter(l => l.agente_id === a.id).map(l => {
      const s = stato(passi, a.id, l.id);
      return esc(l.nome_locale || 'Cliente') + ' ' + s.n + '/' + TOT + (avvioOk(l, a, passi) ? ' ✅' : '');
    });
    righe += '<tr><td><b>' + esc(((a.nome || '') + ' ' + (a.cognome || '')).trim()) + '</b></td><td>' + abil + '</td><td>' + (suoi.length ? suoi.join('<br>') : '—') + '</td></tr>';
  });

  el.innerHTML = '<style>' + CSS + '</style><div class="av-card">' +
    '<div class="av-nota" style="margin-bottom:10px">Ogni agente fa la prova completa sull\'azienda DEMO entro il 14 dicembre. Controlla la prova e abilitalo: da lì i locali che fa partire in quattro giorni gli valgono il 15%. ✅ = avvio chiuso in tempo.</div>' +
    '<div style="overflow-x:auto"><table class="av-t"><thead><tr><th>Agente</th><th>Abilitato all\'avvio</th><th>Avvii</th></tr></thead><tbody>' +
    (righe || '<tr><td colspan="3">Nessun agente venditore attivo.</td></tr>') + '</tbody></table></div></div>';

  el.querySelectorAll('button[data-abil]').forEach(b => {
    b.onclick = async () => {
      const si = b.dataset.v === '1';
      if (si && !confirm('Abiliti questo agente all\'avvio? Prenderà il 15% sui locali avviati in quattro giorni.')) return;
      b.disabled = true;
      const { error } = await sb().from('agenti').update({ abilitato_avvio: si, abilitato_avvio_il: si ? new Date().toISOString() : null }).eq('id', b.dataset.abil);
      if (error) { alert('Non salvato: ' + error.message); b.disabled = false; return; }
      const a = (agenti || []).find(x => x.id === b.dataset.abil);
      if (a) { a.abilitato_avvio = si; a.abilitato_avvio_il = si ? new Date().toISOString() : null; }
      montaAvviiAdmin(el, agenti);
    };
  });
}
