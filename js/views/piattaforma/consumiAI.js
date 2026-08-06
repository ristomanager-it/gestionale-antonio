// js/views/piattaforma/consumiAI.js
// Superadmin: quanto consuma ogni azienda, quanto costa a noi, quanto ha pagato.

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function usd(n) { return Number(n || 0).toFixed(3) + ' 

export async function render(container) {
  container.innerHTML = layout();
  await carica();
}

function layout() {
  return `
  <div class="view pf-consumi">
    <h2 class="pf-h2">⚡ Consumi AI per azienda</h2>
    <div class="pf-sub">Costo vivo pagato ad Anthropic e crediti venduti.</div>

    <div id="pf-totali" class="pf-totali"><div class="pf-caric">Un attimo…</div></div>

    <h3 class="pf-t">Per azienda</h3>
    <div id="pf-aziende"></div>

    <h3 class="pf-t">Per funzione, questo mese</h3>
    <div id="pf-funzioni"></div>

    <style>
      .pf-consumi{padding:16px;max-width:1000px;margin:0 auto}
      .pf-h2{font-size:19px;margin:0}
      .pf-sub{font-size:13px;color:#6b7280;margin:4px 0 16px}
      .pf-t{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;
            margin:22px 0 10px;font-weight:600}
      .pf-totali{display:flex;gap:10px;flex-wrap:wrap}
      .pf-box{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:13px 16px;flex:1;min-width:130px}
      .pf-box .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.9px;color:#6b7280}
      .pf-box .v{font-size:22px;font-weight:700;margin-top:3px}
      .pf-box.ok .v{color:#2F7D32}
      .pf-riga{display:grid;grid-template-columns:1.6fr .7fr .7fr .8fr .8fr;gap:8px;align-items:center;
               background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;
               margin-bottom:6px;font-size:13px}
      .pf-riga.testa{background:transparent;border:none;padding:2px 12px;font-size:10.5px;
                     text-transform:uppercase;letter-spacing:.8px;color:#9ca3af;margin-bottom:2px}
      .pf-nome{font-weight:600;line-height:1.3}
      .pf-num{text-align:right;font-variant-numeric:tabular-nums}
      .pf-basso{color:#D32F2F;font-weight:700}
      .pf-caric{color:#9ca3af;font-size:13px;padding:8px}
      @media (max-width:640px){
        .pf-consumi{padding:10px}
        .pf-riga{grid-template-columns:1.4fr .8fr .8fr;font-size:12px}
        .pf-riga .solo-largo{display:none}
      }
    </style>
  </div>`;
}

async function carica() {
  const { data: cru, error } = await supa().from('v_ai_cruscotto').select('*');
  if (error) {
    document.getElementById('pf-totali').innerHTML =
      '<div class="pf-caric">Non riesco a leggere i consumi: ' + esc(error.message) + '</div>';
    return;
  }
  const righe = cru || [];

  let costoTot = 0, creditiVend = 0, saldoTot = 0, azioniMese = 0;
  righe.forEach(r => {
    costoTot += Number(r.costo_usd_mese || 0);
    creditiVend += Number(r.crediti_acquistati || 0);
    saldoTot += Number(r.saldo || 0);
    azioniMese += Number(r.azioni_mese || 0);
  });

  document.getElementById('pf-totali').innerHTML =
    box('Aziende attive', righe.length, '') +
    box('Contenuti nel mese', azioniMese, '') +
    box('Costo del mese', usd(costoTot), '') +
    box('Crediti venduti', creditiVend, 'ok') +
    box('Crediti in giro', saldoTot, '');

  righe.sort((a, b) => Number(b.costo_usd_mese || 0) - Number(a.costo_usd_mese || 0));

  document.getElementById('pf-aziende').innerHTML =
    '<div class="pf-riga testa">' +
      '<span>Azienda</span>' +
      '<span class="pf-num">Saldo</span>' +
      '<span class="pf-num">Mese</span>' +
      '<span class="pf-num solo-largo">Costo</span>' +
      '<span class="pf-num solo-largo">Acquistati</span>' +
    '</div>' +
    (righe.length ? righe.map(r =>
      '<div class="pf-riga">' +
        '<span class="pf-nome">' + esc(r.azienda || '—') +
          (r.bloccato ? ' <span class="pf-basso">sospesa</span>' : '') + '</span>' +
        '<span class="pf-num' + (Number(r.saldo) <= 0 ? ' pf-basso' : '') + '">' + r.saldo + '</span>' +
        '<span class="pf-num">' + (r.crediti_mese || 0) + '</span>' +
        '<span class="pf-num solo-largo">' + usd(r.costo_usd_mese) + '</span>' +
        '<span class="pf-num solo-largo">' + (r.crediti_acquistati || 0) + '</span>' +
      '</div>'
    ).join('') : '<div class="pf-caric">Nessuna azienda ha ancora consumato</div>');

  const mese = new Date();
  const primo = new Date(mese.getFullYear(), mese.getMonth(), 1).toISOString().slice(0, 10);
  const { data: fun } = await supa().from('v_ai_costi_mensili')
    .select('funzione,chiamate,input_tokens,output_tokens,costo_usd')
    .gte('mese', primo);

  const somma = {};
  (fun || []).forEach(f => {
    const k = f.funzione;
    if (!somma[k]) somma[k] = { chiamate: 0, inp: 0, out: 0, costo: 0 };
    somma[k].chiamate += Number(f.chiamate || 0);
    somma[k].inp += Number(f.input_tokens || 0);
    somma[k].out += Number(f.output_tokens || 0);
    somma[k].costo += Number(f.costo_usd || 0);
  });

  const chiavi = Object.keys(somma).sort((a, b) => somma[b].costo - somma[a].costo);
  document.getElementById('pf-funzioni').innerHTML =
    '<div class="pf-riga testa">' +
      '<span>Funzione</span><span class="pf-num">Chiamate</span>' +
      '<span class="pf-num">Costo</span>' +
      '<span class="pf-num solo-largo">Token in</span>' +
      '<span class="pf-num solo-largo">Token out</span>' +
    '</div>' +
    (chiavi.length ? chiavi.map(k =>
      '<div class="pf-riga">' +
        '<span class="pf-nome">' + esc(k) + '</span>' +
        '<span class="pf-num">' + somma[k].chiamate + '</span>' +
        '<span class="pf-num">' + usd(somma[k].costo) + '</span>' +
        '<span class="pf-num solo-largo">' + somma[k].inp.toLocaleString('it-IT') + '</span>' +
        '<span class="pf-num solo-largo">' + somma[k].out.toLocaleString('it-IT') + '</span>' +
      '</div>'
    ).join('') : '<div class="pf-caric">Nessun consumo registrato questo mese</div>');
}

function box(k, v, cls) {
  return '<div class="pf-box ' + cls + '"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
}
; }
function eur(n) { return Number(n || 0).toFixed(2).replace('.', ',') + ' €'; }
// cambio indicativo: serve solo a mettere ricavo e costo sulla stessa scala
const USD_EUR = 0.92;

export async function render(container) {
  container.innerHTML = layout();
  await carica();
}

function layout() {
  return `
  <div class="view pf-consumi">
    <h2 class="pf-h2">⚡ Consumi AI per azienda</h2>
    <div class="pf-sub">Costo vivo pagato ad Anthropic e crediti venduti.</div>

    <div id="pf-totali" class="pf-totali"><div class="pf-caric">Un attimo…</div></div>

    <h3 class="pf-t">Per azienda</h3>
    <div id="pf-aziende"></div>

    <h3 class="pf-t">Per funzione, questo mese</h3>
    <div id="pf-funzioni"></div>

    <style>
      .pf-consumi{padding:16px;max-width:1000px;margin:0 auto}
      .pf-h2{font-size:19px;margin:0}
      .pf-sub{font-size:13px;color:#6b7280;margin:4px 0 16px}
      .pf-t{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;
            margin:22px 0 10px;font-weight:600}
      .pf-totali{display:flex;gap:10px;flex-wrap:wrap}
      .pf-box{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:13px 16px;flex:1;min-width:130px}
      .pf-box .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.9px;color:#6b7280}
      .pf-box .v{font-size:22px;font-weight:700;margin-top:3px}
      .pf-box.ok .v{color:#2F7D32}
      .pf-riga{display:grid;grid-template-columns:1.6fr .7fr .7fr .8fr .8fr;gap:8px;align-items:center;
               background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;
               margin-bottom:6px;font-size:13px}
      .pf-riga.testa{background:transparent;border:none;padding:2px 12px;font-size:10.5px;
                     text-transform:uppercase;letter-spacing:.8px;color:#9ca3af;margin-bottom:2px}
      .pf-nome{font-weight:600;line-height:1.3}
      .pf-num{text-align:right;font-variant-numeric:tabular-nums}
      .pf-basso{color:#D32F2F;font-weight:700}
      .pf-caric{color:#9ca3af;font-size:13px;padding:8px}
      @media (max-width:640px){
        .pf-consumi{padding:10px}
        .pf-riga{grid-template-columns:1.4fr .8fr .8fr;font-size:12px}
        .pf-riga .solo-largo{display:none}
      }
    </style>
  </div>`;
}

async function carica() {
  const { data: cru, error } = await supa().from('v_ai_cruscotto').select('*');
  if (error) {
    document.getElementById('pf-totali').innerHTML =
      '<div class="pf-caric">Non riesco a leggere i consumi: ' + esc(error.message) + '</div>';
    return;
  }
  const righe = cru || [];

  let costoTot = 0, creditiVend = 0, saldoTot = 0, azioniMese = 0;
  righe.forEach(r => {
    costoTot += Number(r.costo_usd_mese || 0);
    creditiVend += Number(r.crediti_acquistati || 0);
    saldoTot += Number(r.saldo || 0);
    azioniMese += Number(r.azioni_mese || 0);
  });

  document.getElementById('pf-totali').innerHTML =
    box('Aziende attive', righe.length, '') +
    box('Contenuti nel mese', azioniMese, '') +
    box('Costo del mese', usd(costoTot), '') +
    box('Crediti venduti', creditiVend, 'ok') +
    box('Crediti in giro', saldoTot, '');

  righe.sort((a, b) => Number(b.costo_usd_mese || 0) - Number(a.costo_usd_mese || 0));

  document.getElementById('pf-aziende').innerHTML =
    '<div class="pf-riga testa">' +
      '<span>Azienda</span>' +
      '<span class="pf-num">Saldo</span>' +
      '<span class="pf-num">Mese</span>' +
      '<span class="pf-num solo-largo">Costo</span>' +
      '<span class="pf-num solo-largo">Acquistati</span>' +
    '</div>' +
    (righe.length ? righe.map(r =>
      '<div class="pf-riga">' +
        '<span class="pf-nome">' + esc(r.azienda || '—') +
          (r.bloccato ? ' <span class="pf-basso">sospesa</span>' : '') + '</span>' +
        '<span class="pf-num' + (Number(r.saldo) <= 0 ? ' pf-basso' : '') + '">' + r.saldo + '</span>' +
        '<span class="pf-num">' + (r.crediti_mese || 0) + '</span>' +
        '<span class="pf-num solo-largo">' + usd(r.costo_usd_mese) + '</span>' +
        '<span class="pf-num solo-largo">' + (r.crediti_acquistati || 0) + '</span>' +
      '</div>'
    ).join('') : '<div class="pf-caric">Nessuna azienda ha ancora consumato</div>');

  const mese = new Date();
  const primo = new Date(mese.getFullYear(), mese.getMonth(), 1).toISOString().slice(0, 10);
  const { data: fun } = await supa().from('v_ai_costi_mensili')
    .select('funzione,chiamate,input_tokens,output_tokens,costo_usd')
    .gte('mese', primo);

  const somma = {};
  (fun || []).forEach(f => {
    const k = f.funzione;
    if (!somma[k]) somma[k] = { chiamate: 0, inp: 0, out: 0, costo: 0 };
    somma[k].chiamate += Number(f.chiamate || 0);
    somma[k].inp += Number(f.input_tokens || 0);
    somma[k].out += Number(f.output_tokens || 0);
    somma[k].costo += Number(f.costo_usd || 0);
  });

  const chiavi = Object.keys(somma).sort((a, b) => somma[b].costo - somma[a].costo);
  document.getElementById('pf-funzioni').innerHTML =
    '<div class="pf-riga testa">' +
      '<span>Funzione</span><span class="pf-num">Chiamate</span>' +
      '<span class="pf-num">Costo</span>' +
      '<span class="pf-num solo-largo">Token in</span>' +
      '<span class="pf-num solo-largo">Token out</span>' +
    '</div>' +
    (chiavi.length ? chiavi.map(k =>
      '<div class="pf-riga">' +
        '<span class="pf-nome">' + esc(k) + '</span>' +
        '<span class="pf-num">' + somma[k].chiamate + '</span>' +
        '<span class="pf-num">' + usd(somma[k].costo) + '</span>' +
        '<span class="pf-num solo-largo">' + somma[k].inp.toLocaleString('it-IT') + '</span>' +
        '<span class="pf-num solo-largo">' + somma[k].out.toLocaleString('it-IT') + '</span>' +
      '</div>'
    ).join('') : '<div class="pf-caric">Nessun consumo registrato questo mese</div>');
}

function box(k, v, cls) {
  return '<div class="pf-box ' + cls + '"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
}
