// js/views/bo/bo-sondaggi-clienti.js
// Sondaggi dei clienti ("Com'è andata?" dopo la visita): chi ha risposto, i voti domanda per domanda,
// cosa vorrebbe la prossima volta e il regalo ricevuto. Dati da survey_invii + survey_risposte + survey_domande.

const supa = () => window.supabaseClient || window.supabase;
function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function data(iso){ if(!iso) return ''; const d=new Date(iso); return d.toLocaleDateString('it-IT',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); }
const C = { primario:'#0E5A7A', bordo:'#e5e7eb', testo:'#1e293b', soft:'#64748b', ok:'#16a34a', medio:'#f59e0b', ko:'#dc2626' };

let filtro = 'risposti';

export async function render(container){
  const aziendaId = window.state?.azienda?.id;
  if(!aziendaId){ container.innerHTML='<div style="padding:20px;color:#dc2626;">Azienda non selezionata</div>'; return; }
  container.innerHTML = guscio('<div style="color:#94a3b8;padding:20px;">Caricamento sondaggi...</div>', {});
  bind(container);

  const da = new Date(Date.now() - 90*86400000).toISOString();
  const { data: invii, error } = await supa().from('survey_invii')
    .select('id, survey_id, contatto_nome, contatto_email, contatto_telefono, origine, completato, completato_il, created_at, igs, fascia, regalo_codice')
    .eq('azienda_id', aziendaId).not('contatto_nome','is',null).gte('created_at', da)
    .order('created_at', { ascending:false }).limit(300);
  if(error){ container.innerHTML = guscio('<div style="padding:20px;color:#dc2626;">Non riesco a leggere i sondaggi: '+esc(error.message)+'</div>', {}); bind(container); return; }

  const tutti = invii || [];
  const risposti = tutti.filter(i => i.completato);
  const ids = risposti.map(i => i.id);
  let risposte = [], domande = {};
  if(ids.length){
    const { data: r } = await supa().from('survey_risposte').select('invio_id, domanda_id, risposta_scala, risposta_testo, risposta_scelta').in('invio_id', ids);
    risposte = r || [];
    const sIds = [...new Set(risposti.map(x => x.survey_id))];
    if(sIds.length){
      const { data: d } = await supa().from('survey_domande').select('id, survey_id, testo, tipo, ordine, scala_max, condizione_mostra').in('survey_id', sIds);
      (d||[]).forEach(x => domande[x.id] = x);
    }
  }
  const perInvio = {};
  risposte.forEach(r => { (perInvio[r.invio_id] = perInvio[r.invio_id] || []).push(r); });

  const nps = risposti.map(i => (perInvio[i.id]||[]).find(r => (domande[r.domanda_id]?.scala_max||0) >= 10)?.risposta_scala).filter(v => v != null);
  const media = nps.length ? (nps.reduce((a,b)=>a+b,0)/nps.length).toLocaleString('it-IT',{maximumFractionDigits:1}) : '—';
  const bassi = risposti.filter(i => i.fascia === 'bassa').length;

  const elenco = filtro === 'risposti' ? risposti : filtro === 'bassi' ? risposti.filter(i => i.fascia === 'bassa') : tutti.filter(i => !i.completato);
  const kpi = { inviati: tutti.length, risposti: risposti.length, media, bassi };

  const card = (i) => {
    // tutte le domande del sondaggio: quelle lasciate vuote si vedono come "lasciata vuota";
    // le domande del perché (mostrate solo con voto basso) compaiono solo se sono state chieste
    const date = {}; (perInvio[i.id]||[]).forEach(r => date[r.domanda_id] = r);
    const delSondaggio = Object.values(domande).filter(d => d.survey_id === i.survey_id).sort((a,b) => (a.ordine||0)-(b.ordine||0));
    const votoDi = (ord) => { const d = delSondaggio.find(x => Number(x.ordine) === Number(ord)); return d && date[d.id] ? date[d.id].risposta_scala : null; };
    const chiesta = (d) => {
      if(date[d.id]) return true;
      const c = d.condizione_mostra; if(!c) return true;
      if(c.minore != null){ const v = votoDi(c.ordine); return v != null && v < Number(c.minore); }
      return false;
    };
    const rr = delSondaggio.filter(chiesta).map(d => date[d.id] || { domanda_id: d.id, vuota: true });
    const righe = rr.map(r => {
      const d = domande[r.domanda_id] || {};
      if(r.vuota) return `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid #f1f5f9;font-size:14px;"><span style="color:${C.soft};">${esc(d.testo||'Domanda')}</span><span style="white-space:nowrap;color:#cbd5e1;font-style:italic;">lasciata vuota</span></div>`;
      let val = '';
      if(r.risposta_scala != null){
        const max = d.scala_max || 5; const q = r.risposta_scala / max;
        const col = q >= 0.8 ? C.ok : q >= 0.6 ? C.medio : C.ko;
        val = `<b style="color:${col};">${r.risposta_scala} su ${max}</b>`;
      } else val = `<b>${esc(r.risposta_scelta || r.risposta_testo || '—')}</b>`;
      return `<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid #f1f5f9;font-size:14px;"><span style="color:${C.soft};">${esc(d.testo||'Domanda')}</span><span style="white-space:nowrap;">${val}</span></div>`;
    }).join('');
    const fascia = i.fascia === 'bassa' ? `<span style="background:#fee2e2;color:${C.ko};border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;">Da richiamare</span>`
      : i.fascia === 'alta' ? `<span style="background:#dcfce7;color:${C.ok};border-radius:20px;padding:2px 10px;font-size:12px;font-weight:700;">Soddisfatto</span>` : '';
    const contatti = [i.contatto_telefono ? `<a href="tel:${esc(i.contatto_telefono)}" style="color:${C.primario};">📞 ${esc(i.contatto_telefono)}</a>` : '', i.contatto_email ? `<a href="mailto:${esc(i.contatto_email)}" style="color:${C.primario};">✉️ ${esc(i.contatto_email)}</a>` : ''].filter(Boolean).join(' · ');
    return `<div style="background:#fff;border:1px solid ${C.bordo};border-radius:14px;padding:14px 16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="font-size:17px;font-weight:800;color:${C.testo};">${esc(i.contatto_nome)}</div>${fascia}
      </div>
      <div style="font-size:12.5px;color:${C.soft};margin:3px 0 8px;">${i.completato ? 'Ha risposto il '+data(i.completato_il) : 'Inviato il '+data(i.created_at)+' · non ha ancora risposto'}</div>
      ${contatti ? `<div style="font-size:13px;margin-bottom:6px;">${contatti}</div>` : ''}
      ${righe}
      ${i.regalo_codice ? `<div style="margin-top:8px;font-size:13px;color:${C.soft};">🎁 Regalo inviato: <b style="color:${C.testo};">${esc(i.regalo_codice)}</b></div>` : ''}
    </div>`;
  };

  container.innerHTML = guscio(elenco.length ? elenco.map(card).join('') : `<div style="padding:30px;text-align:center;color:#94a3b8;">Nessun sondaggio in questa lista negli ultimi 90 giorni.</div>`, kpi);
  bind(container);
}

function guscio(inner, k){
  const box = (n,l,col) => `<div style="flex:1;min-width:120px;background:#fff;border:1px solid ${C.bordo};border-radius:12px;padding:12px;"><div style="font-size:22px;font-weight:800;color:${col||C.testo};">${n==null?'—':n}</div><div style="font-size:12px;color:${C.soft};">${l}</div></div>`;
  const chip = (v,l) => `<button data-filtro="${v}" style="border:1px solid ${filtro===v?C.primario:C.bordo};background:${filtro===v?C.primario:'#fff'};color:${filtro===v?'#fff':C.soft};border-radius:20px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;">${l}</button>`;
  return `<div class="view" style="max-width:800px;margin:0 auto;padding:16px;">
    <h1 style="margin:0;font-size:22px;color:${C.testo};">📝 Sondaggi clienti</h1>
    <div style="font-size:13px;color:${C.soft};margin:2px 0 14px;">Le risposte a "Com'è andata?" dopo la visita, ultimi 90 giorni</div>
    ${k.inviati != null ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">${box(k.inviati,'Inviati')}${box(k.risposti,'Hanno risposto')}${box(k.media,'Voto medio su 10',C.primario)}${box(k.bassi,'Da richiamare',k.bassi?C.ko:null)}</div>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">${chip('risposti','Hanno risposto')}${chip('bassi','Da richiamare')}${chip('attesa','Senza risposta')}</div>
    ${inner}
  </div>`;
}

function bind(container){
  container.querySelectorAll('[data-filtro]').forEach(b => b.onclick = () => { filtro = b.dataset.filtro; render(container); });
}
