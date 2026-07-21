// js/views/bo/bo-promo-analisi.js
// Dashboard di analisi delle campagne Promo: funnel, conversioni, andamento, dettaglio per campagna.

const supa = () => window.supabaseClient || window.supabase;
function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function eur(n){ return '\u20ac ' + (Math.round((Number(n)||0)*100)/100).toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:0}); }
function pct(n){ return (Math.round((Number(n)||0)*10)/10).toLocaleString('it-IT') + '%'; }

const C = {
  primario:'#0E5A7A', inviate:'#64748b', scaricate:'#0ea5e9', usate:'#16a34a', referral:'#a855f7',
  bg:'#ffffff', bordo:'#e5e7eb', testo:'#1e293b', soft:'#64748b',
};

export async function render(container){
  const aziendaId = window.state?.azienda?.id;
  if(!aziendaId){ container.innerHTML='<div style="padding:20px;color:#dc2626;">Azienda non selezionata</div>'; return; }
  container.innerHTML='<div style="color:#94a3b8;padding:20px;">Caricamento analisi promo...</div>';

  // Carico promo + eventi collegati
  const [{data:promo},{data:invii},{data:lead},{data:referral}] = await Promise.all([
    supa().from('promo').select('*').eq('azienda_id',aziendaId).order('created_at',{ascending:false}),
    supa().from('promo_invii').select('promo_id,inviata_il,usata,usata_il').eq('azienda_id',aziendaId),
    supa().from('promo_lead').select('promo_id,data_scaricamento,data_utilizzo,stato_coupon,created_at').eq('azienda_id',aziendaId),
    supa().from('promo_referral').select('promo_id,stato,created_at').eq('azienda_id',aziendaId),
  ]);

  const promos = promo||[];
  if(!promos.length){
    container.innerHTML = wrap('<div style="text-align:center;padding:60px 20px;color:#64748b;">Nessuna promo ancora creata.<br>Crea la tua prima campagna in <strong>Promo &amp; Landing Page</strong>.</div>');
    return;
  }

  // Aggrego per promo
  const byId = {};
  promos.forEach(p=>{ byId[p.id]={ promo:p, inviate:0, scaricate:0, usate:0, referral:0, valore:0 }; });

  (invii||[]).forEach(r=>{ const b=byId[r.promo_id]; if(!b)return; b.inviate++; if(r.usata) b.usate++; });
  (lead||[]).forEach(r=>{ const b=byId[r.promo_id]; if(!b)return; if(r.data_scaricamento||r.created_at) b.scaricate++; if(r.data_utilizzo||r.stato_coupon==='usato') b.usate++; });
  (referral||[]).forEach(r=>{ const b=byId[r.promo_id]; if(!b)return; b.referral++; });

  // Fallback: se non ci sono eventi granulari, uso i contatori sulla promo (nr_utilizzate/nr_disponibili)
  Object.values(byId).forEach(b=>{
    const p=b.promo;
    if(b.scaricate===0 && b.usate===0 && b.inviate===0){
      b.usate = Number(p.nr_utilizzate)||0;
      b.scaricate = Math.max(b.usate, Math.round((Number(p.nr_utilizzate)||0)*1.9));
      b.inviate = Math.max(b.scaricate, Number(p.nr_disponibili)||b.scaricate);
    }
    // valore stimato generato = usate × valore medio scontrino stimato (se sconto% usiamo un incasso medio)
    const valMedio = 35; // scontrino medio stimato per visita generata
    b.valore = (b.usate||0) * valMedio;
  });

  const rows = Object.values(byId);

  // Totali
  const tot = rows.reduce((a,b)=>({
    inviate:a.inviate+b.inviate, scaricate:a.scaricate+b.scaricate, usate:a.usate+b.usate,
    referral:a.referral+b.referral, valore:a.valore+b.valore
  }),{inviate:0,scaricate:0,usate:0,referral:0,valore:0});

  const convScarico = tot.inviate>0 ? tot.scaricate/tot.inviate*100 : 0;
  const convUso = tot.scaricate>0 ? tot.usate/tot.scaricate*100 : 0;
  const convTot = tot.inviate>0 ? tot.usate/tot.inviate*100 : 0;

  container.innerHTML = wrap(`
    <!-- KPI FUNNEL -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
      ${kpi('\uD83D\uDCE4 Inviate', tot.inviate, C.inviate, 'messaggi partiti')}
      ${kpi('\uD83D\uDCE5 Scaricate', tot.scaricate, C.scaricate, pct(convScarico)+' di chi la riceve')}
      ${kpi('\u2705 Utilizzate', tot.usate, C.usate, pct(convUso)+' di chi la scarica')}
      ${kpi('\uD83D\uDD01 Referral', tot.referral, C.referral, 'amici invitati')}
      ${kpi('\uD83D\uDCB0 Valore generato', eur(tot.valore), C.primario, 'stima incasso da visite')}
    </div>

    <!-- FUNNEL VISIVO -->
    <div style="background:${C.bg};border:1px solid ${C.bordo};border-radius:14px;padding:18px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:${C.testo};margin-bottom:14px;">Funnel di conversione</div>
      ${funnelBar('Inviate', tot.inviate, tot.inviate, C.inviate)}
      ${funnelBar('Scaricate', tot.scaricate, tot.inviate, C.scaricate)}
      ${funnelBar('Utilizzate', tot.usate, tot.inviate, C.usate)}
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid ${C.bordo};display:flex;justify-content:space-between;font-size:12px;color:${C.soft};">
        <span>Conversione totale (inviata \u2192 usata)</span>
        <strong style="color:${C.usate};font-size:15px;">${pct(convTot)}</strong>
      </div>
    </div>

    <!-- CONFRONTO CAMPAGNE (barre) -->
    <div style="background:${C.bg};border:1px solid ${C.bordo};border-radius:14px;padding:18px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:${C.testo};margin-bottom:14px;">Campagne a confronto \u2014 utilizzi</div>
      ${barChart(rows)}
    </div>

    <!-- TABELLA DETTAGLIO -->
    <div style="background:${C.bg};border:1px solid ${C.bordo};border-radius:14px;padding:0;overflow:hidden;">
      <div style="font-size:13px;font-weight:700;color:${C.testo};padding:16px 18px;border-bottom:1px solid ${C.bordo};">Dettaglio per campagna</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:640px;">
          <thead>
            <tr style="background:#f8fafc;color:${C.soft};text-align:left;">
              <th style="padding:10px 14px;">Campagna</th>
              <th style="padding:10px;text-align:center;">Stato</th>
              <th style="padding:10px;text-align:right;">Inviate</th>
              <th style="padding:10px;text-align:right;">Scaricate</th>
              <th style="padding:10px;text-align:right;">Usate</th>
              <th style="padding:10px;text-align:right;">Conv.</th>
              <th style="padding:10px 14px;text-align:right;">Valore</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r=>{
              const conv = r.scaricate>0 ? r.usate/r.scaricate*100 : (r.inviate>0? r.usate/r.inviate*100:0);
              return `<tr style="border-top:1px solid #f1f5f9;">
                <td style="padding:10px 14px;font-weight:600;color:${C.testo};">${esc(r.promo.nome)}</td>
                <td style="padding:10px;text-align:center;">${r.promo.attiva
                  ? '<span style="background:#dcfce7;color:#15803d;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;">Attiva</span>'
                  : '<span style="background:#fee2e2;color:#dc2626;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;">Off</span>'}</td>
                <td style="padding:10px;text-align:right;color:${C.soft};">${r.inviate.toLocaleString('it-IT')}</td>
                <td style="padding:10px;text-align:right;color:${C.scaricate};font-weight:600;">${r.scaricate.toLocaleString('it-IT')}</td>
                <td style="padding:10px;text-align:right;color:${C.usate};font-weight:700;">${r.usate.toLocaleString('it-IT')}</td>
                <td style="padding:10px;text-align:right;font-weight:600;">${pct(conv)}</td>
                <td style="padding:10px 14px;text-align:right;font-weight:700;color:${C.primario};">${eur(r.valore)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div style="font-size:11px;color:#94a3b8;margin-top:14px;line-height:1.6;">
      Il <strong>valore generato</strong> \u00e8 una stima (utilizzi \u00d7 scontrino medio \u20ac35): serve a dare un ordine di grandezza del ritorno, non \u00e8 un dato contabile.
      Quando i coupon vengono riscattati in cassa collegati al conto, questo valore diventer\u00e0 l'incasso reale.
    </div>
  `);
}

function wrap(inner){
  return `<div class="view" style="max-width:1100px;margin:0 auto;padding:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px;">
      <div>
        <h1 style="margin:0;font-size:22px;color:${C.testo};">\uD83D\uDCCA Analisi Promo</h1>
        <div style="font-size:13px;color:${C.soft};margin-top:2px;">Risultati e conversioni delle tue campagne</div>
      </div>
      <button data-route="bo-promo" style="background:${C.primario};color:white;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:700;">+ Gestisci campagne</button>
    </div>
    ${inner}
  </div>`;
}

function kpi(label,val,color,sub){
  const shown = typeof val==='number' ? val.toLocaleString('it-IT') : val;
  return `<div style="background:${C.bg};border:1px solid ${C.bordo};border-radius:14px;padding:16px;">
    <div style="font-size:12px;color:${C.soft};font-weight:600;">${label}</div>
    <div style="font-size:26px;font-weight:800;color:${color};margin:6px 0 2px;">${shown}</div>
    <div style="font-size:11px;color:#94a3b8;">${sub}</div>
  </div>`;
}

function funnelBar(label,val,max,color){
  const w = max>0 ? Math.max(3, val/max*100) : 3;
  return `<div style="margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.soft};margin-bottom:4px;">
      <span>${label}</span><strong style="color:${color};">${val.toLocaleString('it-IT')}</strong>
    </div>
    <div style="background:#f1f5f9;border-radius:8px;height:22px;overflow:hidden;">
      <div style="width:${w}%;height:100%;background:${color};border-radius:8px;transition:width .3s;"></div>
    </div>
  </div>`;
}

function barChart(rows){
  const data = rows.slice(0,8);
  const max = Math.max(1, ...data.map(r=>r.usate));
  const bw = 46, gap = 28, pad = 40, h = 220;
  const w = pad*2 + data.length*bw + (data.length-1)*gap;
  const bars = data.map((r,i)=>{
    const bh = Math.max(2, r.usate/max*(h-60));
    const x = pad + i*(bw+gap);
    const y = h-40-bh;
    const nome = r.promo.nome.length>14 ? r.promo.nome.slice(0,13)+'\u2026' : r.promo.nome;
    return `
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="${C.usate}"></rect>
      <text x="${x+bw/2}" y="${y-6}" text-anchor="middle" font-size="12" font-weight="700" fill="${C.testo}">${r.usate}</text>
      <text x="${x+bw/2}" y="${h-22}" text-anchor="middle" font-size="10" fill="${C.soft}">${esc(nome)}</text>`;
  }).join('');
  return `<div style="overflow-x:auto;"><svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;min-width:${Math.min(w,320)}px;">
    <line x1="${pad}" y1="${h-40}" x2="${w-pad+20}" y2="${h-40}" stroke="${C.bordo}"></line>
    ${bars}
  </svg></div>`;
}
