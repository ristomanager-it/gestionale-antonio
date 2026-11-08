// AVVII AGENTI — avanzamento dell'avvio dei locali firmati dagli agenti.
// Dall'8/11/2026 l'avvio si legge dal Setup guidato del cliente (RPC setup_stato, dati veri del locale):
// livelli 1-4 (Identità, Struttura, Canali, Contenuti & Tony) + prima promo + prima campagna.
// Il momento in cui tutto risulta completo è fotografato in agenti_lead.avvio_completato_il (RPC avvii_aggiorna + cron orario).
// 15% (rete_compensi.perc_agente_avvio) se l'agente è abilitato e l'avvio è completo entro 4 giorni dalla firma.
// Abilitazione: l'agente ha una sua azienda di prova (agenti.azienda_prova_id) e la porta ai livelli 1-4 completi.

const sb = () => window.supabaseClient || window.supabase;
const GIORNI_AVVIO = 4;

export const BLOCCHI = [
  { id: 'l1', titolo: '🎯 1 · Identità & Brand',     passi: ['gc', 'cliente', 'tov'],                     route: 'bo-configurazione', tab: 'identita' },
  { id: 'l2', titolo: '🏠 2 · Struttura operativa',  passi: ['sede', 'sala', 'settori', 'personale'],     route: 'bo-onboarding' },
  { id: 'l3', titolo: '📡 3 · Canali',               passi: ['wa', 'form', 'chatbot', 'sito'],            route: 'bo-onboarding' },
  { id: 'l4', titolo: '🤖 4 · Contenuti & Tony',     passi: ['foto', 'menu', 'ricettario', 'tony'],       route: 'bo-onboarding' },
  { id: 'pr', titolo: '💝 Prima promo pubblicata',   passi: ['promo'],                                    route: 'bo-promo' },
  { id: 'ca', titolo: '📣 Prima campagna lanciata',  passi: ['campagna'],                                 route: 'bo-promo' },
];
const LIVELLI_PROVA = BLOCCHI.slice(0, 4);
const TOT = BLOCCHI.reduce((n, b) => n + b.passi.length, 0);

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataIt = d => d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : '';

// compatibilità con la Home Agente: aggiorna le foto degli avvii completati dell'agente
export async function caricaPassi(agenteId) {
  try { await sb().rpc('avvii_aggiorna', { p_agente: agenteId || null }); } catch (e) { console.warn('avvii_aggiorna', e); }
  return [];
}

export function avvioOk(lead, agente) {
  if (!lead || !agente || !agente.abilitato_avvio || agente.tipo === 'segnalatore') return false;
  if (!lead.data_conversione || !lead.avvio_completato_il) return false;
  const limite = new Date(lead.data_conversione + 'T23:59:59');
  limite.setDate(limite.getDate() + GIORNI_AVVIO);
  return new Date(lead.avvio_completato_il) <= limite;
}

async function stato(aziendaId) {
  if (!aziendaId) return null;
  const { data, error } = await sb().rpc('setup_stato', { p_azienda: aziendaId, p_sede: null });
  if (error) { console.warn('setup_stato', error.message); return null; }
  return data || {};
}

function conta(s, blocchi) {
  let n = 0, tot = 0;
  blocchi.forEach(b => b.passi.forEach(p => { tot++; if (s && s[p]) n++; }));
  return { n, tot };
}

function scadenza(lead) {
  if (!lead.data_conversione) return '';
  const d = new Date(lead.data_conversione + 'T12:00:00');
  d.setDate(d.getDate() + GIORNI_AVVIO);
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

const CSS = '.av-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin-bottom:10px}' +
  '.av-testa{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;font-size:14px;color:#1f2937}' +
  '.av-conto{font-size:12px;font-weight:700;color:#059669;white-space:nowrap}' +
  '.av-barra{height:8px;background:#e5e7eb;border-radius:8px;margin:8px 0 8px;overflow:hidden}.av-barra i{display:block;height:100%;background:#059669;transition:width .3s}' +
  '.av-riga{display:flex;justify-content:space-between;gap:8px;font-size:13.5px;padding:6px 0;color:#1f2937;border-top:1px solid #f1f5f9}' +
  '.av-riga b{font-weight:700;color:#64748b}.av-riga b.ok{color:#059669}' +
  '.av-nota{font-size:12.5px;color:#64748b;line-height:1.5}' +
  '.av-t{width:100%;border-collapse:collapse;font-size:13px}.av-t th,.av-t td{text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top}' +
  '.av-btn{border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;background:#7C3AED;color:#fff}' +
  '.av-btn.grigio{background:#f1f5f9;color:#64748b}.av-btn[disabled]{opacity:.45;cursor:default}' +
  '.av-sel{border:1px solid #e5e7eb;border-radius:8px;padding:5px 8px;font-size:12px;max-width:180px}';

function righe(s, blocchi) {
  return blocchi.map(b => {
    const c = conta(s, [b]);
    const ok = c.n === c.tot;
    return '<div class="av-riga"><span>' + esc(b.titolo) + '</span><b class="' + (ok ? 'ok' : '') + '">' + (ok ? '✓ ' : '') + c.n + ' / ' + c.tot + '</b></div>';
  }).join('');
}

// HOME AGENTE — scheda Avvii
export async function montaAvviiAgente(el, agente, leads) {
  el.innerHTML = '<style>' + CSS + '</style><div style="padding:20px;color:#94a3b8;text-align:center">Caricamento…</div>';
  if (agente.tipo === 'segnalatore') {
    el.innerHTML = '<style>' + CSS + '</style><div class="av-card"><div class="av-nota">L\'avvio dei locali lo fanno gli agenti venditori. Come segnalatore porti il contatto: al resto pensa Antonio.</div></div>';
    return;
  }
  const clienti = (leads || []).filter(l => l.stato === 'pagante')
    .sort((a, b) => String(b.data_conversione || '').localeCompare(String(a.data_conversione || '')));
  const [prova, ...statiClienti] = await Promise.all([
    agente.abilitato_avvio ? Promise.resolve(null) : stato(agente.azienda_prova_id),
    ...clienti.map(l => stato(l.azienda_id)),
  ]);

  let html = '<style>' + CSS + '</style>';
  if (!agente.abilitato_avvio) {
    if (!agente.azienda_prova_id) {
      html += '<div class="av-card"><div class="av-testa"><span>La tua prova</span></div><div class="av-nota">Antonio ti assegna un\'azienda di prova vuota. Lì fai da solo i livelli da 1 a 4 del Setup guidato, come spiegato nel Libretto di istruzioni (capitoli 4 e 5). Quando sono completi, Antonio ti abilita e sui locali che fai partire in quattro giorni prendi il 15%.</div></div>';
    } else {
      const c = conta(prova, LIVELLI_PROVA);
      html += '<div class="av-card"><div class="av-testa"><span>La tua prova</span><span class="av-conto">' + c.n + ' su ' + c.tot + '</span></div>' +
        '<div class="av-barra"><i style="width:' + Math.round(c.n / c.tot * 100) + '%"></i></div>' + righe(prova, LIVELLI_PROVA) +
        '<div class="av-nota" style="margin-top:8px">Si aggiorna da solo con i dati della tua azienda di prova. Finita la prova entro lunedì 14 dicembre, Antonio ti abilita al 15%.</div></div>';
    }
  } else {
    html += '<div class="av-card"><div class="av-nota">✅ Sei abilitato all\'avvio' + (agente.abilitato_avvio_il ? ' dal ' + dataIt(agente.abilitato_avvio_il) : '') +
      '. Se il locale ha i livelli 1-4 del Setup guidato, la prima promo e la prima campagna entro quattro giorni dalla firma, la provvigione del primo anno sale al 15%.</div></div>';
  }
  if (!clienti.length) {
    html += '<div class="av-card"><div class="av-nota">Qui compaiono i clienti che hai chiuso, con l\'avanzamento del loro Setup guidato. Per ora non ce ne sono.</div></div>';
  }
  clienti.forEach((l, i) => {
    const s = statiClienti[i];
    const c = conta(s, BLOCCHI);
    const sc = scadenza(l);
    const stato15 = l.avvio_completato_il ? (avvioOk(l, agente) ? ' · fatto in tempo ✅' : ' · fatto') : (sc ? ' · entro ' + esc(sc) : '');
    html += '<div class="av-card"><div class="av-testa"><span>' + esc(l.nome_locale || 'Cliente') + '</span><span class="av-conto">' + c.n + ' su ' + TOT + stato15 + '</span></div>' +
      '<div class="av-barra"><i style="width:' + Math.round(c.n / TOT * 100) + '%"></i></div>' +
      (s ? righe(s, BLOCCHI) : '<div class="av-nota">' + (l.azienda_id ? 'Non riesco a leggere il Setup di questo cliente.' : 'Il cliente non è ancora collegato alla sua azienda: lo collega Antonio.') + '</div>') + '</div>';
  });
  el.innerHTML = html;
}

// PIATTAFORMA › Programma Agenti — scheda Avvii (solo superadmin)
export async function montaAvviiAdmin(el, agenti) {
  el.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center">Caricamento…</div>';
  try { await sb().rpc('avvii_aggiorna', { p_agente: null }); } catch (e) { /* il cron lo rifà ogni ora */ }
  const [leadRes, azRes] = await Promise.all([
    sb().from('agenti_lead').select('id, agente_id, azienda_id, nome_locale, stato, data_conversione, avvio_completato_il').eq('stato', 'pagante'),
    sb().from('aziende').select('id, nome').order('nome'),
  ]);
  const leads = leadRes.data || [];
  const aziende = azRes.data || [];
  const venditori = (agenti || []).filter(a => a.stato === 'attivo' && a.tipo !== 'segnalatore');
  const prove = await Promise.all(venditori.map(a => a.abilitato_avvio ? null : stato(a.azienda_prova_id)));

  let righeT = '';
  venditori.forEach((a, i) => {
    let abil;
    if (a.abilitato_avvio) {
      abil = 'Sì' + (a.abilitato_avvio_il ? ', dal ' + dataIt(a.abilitato_avvio_il) : '') + ' <button class="av-btn grigio" data-abil="' + a.id + '" data-v="0">Revoca</button>';
    } else {
      const opz = '<option value="">— azienda di prova —</option>' + aziende.map(z => '<option value="' + z.id + '"' + (z.id === a.azienda_prova_id ? ' selected' : '') + '>' + esc(z.nome) + '</option>').join('');
      const c = a.azienda_prova_id ? conta(prove[i], LIVELLI_PROVA) : null;
      abil = '<select class="av-sel" data-prova="' + a.id + '">' + opz + '</select>' +
        (c ? '<div style="margin-top:6px">Prova ' + c.n + '/' + c.tot + ' <button class="av-btn" data-abil="' + a.id + '" data-v="1"' + (c.n === c.tot ? '' : ' disabled title="La prova non è completa"') + '>Abilita</button></div>' : '');
    }
    const suoi = leads.filter(l => l.agente_id === a.id).map(l => esc(l.nome_locale || 'Cliente') +
      (l.avvio_completato_il ? (avvioOk(l, a) ? ' ✅' : ' · completo dopo i 4 giorni') : ' · in corso'));
    righeT += '<tr><td><b>' + esc(((a.nome || '') + ' ' + (a.cognome || '')).trim()) + '</b></td><td>' + abil + '</td><td>' + (suoi.length ? suoi.join('<br>') : '—') + '</td></tr>';
  });

  el.innerHTML = '<style>' + CSS + '</style><div class="av-card">' +
    '<div class="av-nota" style="margin-bottom:10px">Assegna a ogni agente un\'azienda di prova vuota: quando lì i livelli 1-4 del Setup guidato sono completi, si accende Abilita. Gli avvii dei clienti si leggono dal loro Setup guidato. ✅ = completo entro quattro giorni dalla firma.</div>' +
    '<div style="overflow-x:auto"><table class="av-t"><thead><tr><th>Agente</th><th>Abilitazione</th><th>Avvii</th></tr></thead><tbody>' +
    (righeT || '<tr><td colspan="3">Nessun agente venditore attivo.</td></tr>') + '</tbody></table></div></div>';

  el.querySelectorAll('select[data-prova]').forEach(s => {
    s.onchange = async () => {
      const { error } = await sb().from('agenti').update({ azienda_prova_id: s.value || null }).eq('id', s.dataset.prova);
      if (error) { alert('Non salvato: ' + error.message); return; }
      const a = (agenti || []).find(x => x.id === s.dataset.prova);
      if (a) a.azienda_prova_id = s.value || null;
      montaAvviiAdmin(el, agenti);
    };
  });
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
