// js/views/bo/bo-promo-analisi.js
// Analisi delle promo: aperture della pagina, coupon scaricati, coupon usati.
// Dati reali dalla funzione promo_analisi (niente stime): aperture = persone diverse che hanno aperto la landing,
// senza robot e senza chi riapre il proprio coupon. Fonte = da dove arrivano (Meta, Google, WhatsApp, diretto/QR).

const supa = () => window.supabaseClient || window.supabase;
function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function num(n){ return (Number(n)||0).toLocaleString('it-IT'); }
function pct(a,b){ return b>0 ? (Math.round(a/b*1000)/10).toLocaleString('it-IT')+'%' : '—'; }
function quando(iso){
  if(!iso) return '';
  const d = new Date(iso), ora = new Date();
  const min = Math.round((ora - d)/60000);
  if(min < 1) return 'adesso';
  if(min < 60) return min+' min fa';
  const h = Math.round(min/60);
  if(h < 24) return h+' ore fa';
  return d.toLocaleDateString('it-IT',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
}

const C = { primario:'#0E5A7A', aperture:'#64748b', scaricati:'#0ea5e9', usati:'#16a34a', attesa:'#f59e0b', bordo:'#e5e7eb', testo:'#1e293b', soft:'#64748b' };
const FONTI_COLORE = { 'Meta':'#1877F2', 'Google':'#EA4335', 'WhatsApp':'#25D366', 'Email':'#a855f7', 'Diretto / QR':'#0E5A7A', 'Altro':'#94a3b8' };

let periodo = 30;

export async function render(container){
  const aziendaId = window.state?.azienda?.id;
  if(!aziendaId){ container.innerHTML='<div style="padding:20px;color:#dc2626;">Azienda non selezionata</div>'; return; }
  container.innerHTML = wrap('<div style="color:#94a3b8;padding:20px;">Caricamento analisi...</div>');
  bindPeriodo(container);

  const { data, error } = await supa().rpc('promo_analisi', { p_azienda: aziendaId, p_giorni: periodo });
  if(error || !data){
    container.innerHTML = wrap('<div style="padding:20px;color:#dc2626;">Non riesco a leggere i dati: '+esc(error?.message||'errore')+'</div>');
    bindPeriodo(container); return;
  }

  const tutte = data.promo || [];
  const promo = tutte.filter(p => !p.kit_ruolo && !p.bozza);
  const regali = tutte.filter(p => p.kit_ruolo);
  if(!promo.length){
    container.innerHTML = wrap('<div style="text-align:center;padding:60px 20px;color:#64748b;">Nessuna promo ancora pubblicata.<br>Creala in <strong>Promo &amp; Offerte</strong> o chiedila a Tony.</div>');
    bindPeriodo(container); return;
  }

  const tot = promo.reduce((a,p)=>({ ap:a.ap+p.aperture, sc:a.sc+p.scaricati, us:a.us+p.usati, att:a.att+p.da_usare }), {ap:0,sc:0,us:0,att:0});

  container.innerHTML = wrap(`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px;">
      ${kpi('👀 Aperture', num(tot.ap), C.aperture, 'persone che hanno aperto la pagina')}
      ${kpi('📥 Scaricati', num(tot.sc), C.scaricati, pct(tot.sc,tot.ap)+' di chi apre')}
      ${kpi('✅ Usati', num(tot.us), C.usati, pct(tot.us,tot.sc)+' di chi scarica')}
      ${kpi('⏳ Da usare', num(tot.att), C.attesa, 'coupon in mano ai clienti')}
    </div>

    ${box('Dall’apertura al tavolo', `
      ${barra('Aperture', tot.ap, tot.ap, C.aperture)}
      ${barra('Scaricati', tot.sc, tot.ap, C.scaricati, pct(tot.sc,tot.ap))}
      ${barra('Usati', tot.us, tot.ap, C.usati, pct(tot.us,tot.ap))}
    `)}

    ${box('Giorno per giorno', grafico(data.serie||[]))}

    ${box('Da dove arrivano', fonti(data.fonti||{}))}

    ${box('Promo per promo', tabella(promo), true)}

    ${regali.some(r=>r.scaricati>0) ? box('Regali del sondaggio', tabella(regali, true), true) : ''}

    ${box('Ultimi coupon', ultimi(data.ultimi||[]))}

    <div style="font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.6;">
      Le <strong>aperture</strong> contano le persone diverse che hanno aperto la pagina della promo, senza robot e senza chi riapre il proprio coupon.
      La <strong>fonte</strong> arriva dal link: Meta e Google si riconoscono da soli, WhatsApp ed email quando il link ha la sua etichetta.
    </div>
  `);
  bindPeriodo(container);
}

function bindPeriodo(container){
  container.querySelectorAll('[data-periodo]').forEach(b=>{
    b.onclick = () => { periodo = Number(b.dataset.periodo); render(container); };
  });
}

function wrap(inner){
  const chip = (g,l) => `<button data-periodo="${g}" style="border:1px solid ${periodo===g?C.primario:C.bordo};background:${periodo===g?C.primario:'#fff'};color:${periodo===g?'#fff':C.soft};border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;">${l}</button>`;
  return `<div class="view" style="max-width:1100px;margin:0 auto;padding:16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div>
        <h1 style="margin:0;font-size:22px;color:${C.testo};">📊 Analisi Promo</h1>
        <div style="font-size:13px;color:${C.soft};margin-top:2px;">Aperture, coupon scaricati e coupon usati</div>
      </div>
      <button data-route="bo-promo" style="background:${C.primario};color:white;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:700;">🎁 Le mie promo</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">${chip(7,'7 giorni')}${chip(30,'30 giorni')}${chip(90,'90 giorni')}${chip(0,'Da sempre')}</div>
    ${inner}
  </div>`;
}

function kpi(label,val,color,sub){
  return `<div style="background:#fff;border:1px solid ${C.bordo};border-radius:14px;padding:16px;">
    <div style="font-size:12px;color:${C.soft};font-weight:600;">${label}</div>
    <div style="font-size:26px;font-weight:800;color:${color};margin:6px 0 2px;">${val}</div>
    <div style="font-size:11px;color:#94a3b8;">${sub}</div>
  </div>`;
}

function box(titolo, corpo, senzaPadding){
  return `<div style="background:#fff;border:1px solid ${C.bordo};border-radius:14px;margin-bottom:16px;overflow:hidden;">
    <div style="font-size:13px;font-weight:700;color:${C.testo};padding:14px 16px ${senzaPadding?'12px':'0'};${senzaPadding?'border-bottom:1px solid '+C.bordo+';':''}">${titolo}</div>
    <div style="padding:${senzaPadding?'0':'12px 16px 16px'};">${corpo}</div>
  </div>`;
}

function barra(label,val,max,color,nota){
  const w = max>0 ? Math.max(2, val/max*100) : 2;
  return `<div style="margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:${C.soft};margin-bottom:4px;">
      <span>${label}${nota?' <span style="color:#94a3b8;">· '+nota+'</span>':''}</span><strong style="color:${color};">${num(val)}</strong>
    </div>
    <div style="background:#f1f5f9;border-radius:8px;height:20px;overflow:hidden;"><div style="width:${w}%;height:100%;background:${color};border-radius:8px;"></div></div>
  </div>`;
}

function grafico(serie){
  if(!serie.length) return '<div style="color:#94a3b8;font-size:13px;">Nessun dato nel periodo.</div>';
  const n = serie.length, W = 640, H = 200, pl = 28, pb = 26, pt = 10;
  const max = Math.max(1, ...serie.map(s=>Math.max(s.aperture, s.scaricati, s.usati)));
  const x = i => pl + (n===1 ? (W-pl-8)/2 : i*(W-pl-8)/(n-1));
  const y = v => pt + (H-pt-pb) * (1 - v/max);
  const bw = Math.max(2, (W-pl-8)/n*0.6);
  const barre = serie.map((s,i)=> s.aperture ? `<rect x="${x(i)-bw/2}" y="${y(s.aperture)}" width="${bw}" height="${H-pb-y(s.aperture)}" rx="2" fill="${C.aperture}" opacity=".25"></rect>` : '').join('');
  const linea = (k,c) => `<polyline fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" points="${serie.map((s,i)=>x(i)+','+y(s[k])).join(' ')}"></polyline>`;
  const passo = Math.max(1, Math.ceil(n/6));
  const etich = serie.map((s,i)=> (i%passo===0 || i===n-1) ? `<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="10" fill="${C.soft}">${new Date(s.giorno+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'})}</text>` : '').join('');
  const leg = (c,t,op) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px;"><span style="width:10px;height:10px;border-radius:3px;background:${c};opacity:${op||1};"></span>${t}</span>`;
  return `<div style="font-size:11px;color:${C.soft};margin-bottom:6px;">${leg(C.aperture,'Aperture',.35)}${leg(C.scaricati,'Scaricati')}${leg(C.usati,'Usati')}</div>
    <div style="overflow-x:auto;"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:320px;">
      <line x1="${pl}" y1="${H-pb}" x2="${W-4}" y2="${H-pb}" stroke="${C.bordo}"></line>
      <text x="4" y="${pt+8}" font-size="10" fill="${C.soft}">${max}</text>
      ${barre}${linea('scaricati',C.scaricati)}${linea('usati',C.usati)}${etich}
    </svg></div>`;
}

function fonti(f){
  const voci = Object.entries(f).sort((a,b)=>b[1]-a[1]);
  if(!voci.length) return '<div style="color:#94a3b8;font-size:13px;">Nessuna apertura nel periodo.</div>';
  const tot = voci.reduce((a,v)=>a+v[1],0);
  return voci.map(([k,v])=>barra(k, v, tot, FONTI_COLORE[k]||'#94a3b8', pct(v,tot))).join('');
}

function tabella(righe, regali){
  return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:620px;">
    <thead><tr style="background:#f8fafc;color:${C.soft};text-align:left;">
      <th style="padding:10px 14px;">${regali?'Regalo':'Promo'}</th>
      ${regali?'':'<th style="padding:10px;text-align:right;">Aperture</th>'}
      <th style="padding:10px;text-align:right;">${regali?'Emessi':'Scaricati'}</th>
      ${regali?'':'<th style="padding:10px;text-align:right;">% su aperture</th>'}
      <th style="padding:10px;text-align:right;">Usati</th>
      <th style="padding:10px;text-align:right;">% su scaricati</th>
      <th style="padding:10px 14px;">${regali?'Da usare':'Da dove arrivano'}</th>
    </tr></thead>
    <tbody>${righe.map(r=>{
      const fontiTop = Object.entries(r.fonti||{}).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,v])=>`<span style="background:${(FONTI_COLORE[k]||'#94a3b8')}1a;color:${FONTI_COLORE[k]||'#64748b'};border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700;margin-right:4px;white-space:nowrap;">${esc(k)} ${v}</span>`).join('');
      const avviso = !regali && r.aperture>=20 && r.scaricati/r.aperture < 0.03
        ? `<div style="font-size:11px;color:#b45309;margin-top:3px;">Molti la aprono, pochi scaricano: rivedi titolo, foto o offerta della pagina.</div>` : '';
      const stato = r.attiva ? '' : ' <span style="background:#fee2e2;color:#dc2626;padding:1px 8px;border-radius:20px;font-size:10px;font-weight:700;">Off</span>';
      return `<tr style="border-top:1px solid #f1f5f9;vertical-align:top;">
        <td style="padding:10px 14px;font-weight:600;color:${C.testo};">${esc(r.nome)}${stato}${avviso}</td>
        ${regali?'':`<td style="padding:10px;text-align:right;color:${C.aperture};">${num(r.aperture)}</td>`}
        <td style="padding:10px;text-align:right;color:${C.scaricati};font-weight:700;">${num(r.scaricati)}</td>
        ${regali?'':`<td style="padding:10px;text-align:right;">${pct(r.scaricati,r.aperture)}</td>`}
        <td style="padding:10px;text-align:right;color:${C.usati};font-weight:700;">${num(r.usati)}</td>
        <td style="padding:10px;text-align:right;">${pct(r.usati,r.scaricati)}</td>
        <td style="padding:10px 14px;">${regali ? num(r.da_usare) : (fontiTop || '<span style="color:#cbd5e1;">—</span>')}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function ultimi(lista){
  if(!lista.length) return '<div style="color:#94a3b8;font-size:13px;">Nessun coupon scaricato finora.</div>';
  const badge = s => s==='utilizzato'||s==='usato' ? ['Usato',C.usati] : s==='scaduto' ? ['Scaduto','#dc2626'] : ['Da usare',C.attesa];
  return lista.slice(0,10).map(u=>{
    const [t,c] = badge(u.stato);
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
      <div style="flex:1;min-width:0;"><strong style="color:${C.testo};">${esc(u.nome||'Cliente')}</strong> <span style="color:${C.soft};">· ${esc(u.promo)}${u.regalo?' (regalo)':''}</span></div>
      <span style="color:#94a3b8;font-size:12px;white-space:nowrap;">${quando(u.quando)}</span>
      <span style="background:${c}1a;color:${c};border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700;">${t}</span>
    </div>`;
  }).join('');
}
