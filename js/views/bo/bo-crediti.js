// js/views/bo/bo-crediti.js
// Crediti Tony: saldo, consumo del mese, storico movimenti, ricarica.

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function toast(m, t = 'success') { if (window.mostraToast) window.mostraToast(m, t); }
function aziendaId() { return window.state?.azienda?.id || window.state?.azienda_id || window.state?.aziendaId; }

const TIPI = {
  ricarica:  { i: '⬆', l: 'Ricarica',  c: '#2F7D32' },
  consumo:   { i: '⬇', l: 'Consumo',   c: '#6b7280' },
  omaggio:   { i: '🎁', l: 'Omaggio',  c: '#2B5EA7' },
  rettifica: { i: '✎', l: 'Rettifica', c: '#C98A0B' },
  rimborso:  { i: '↩', l: 'Rimborso',  c: '#B3261E' },
};

export async function render(container) {
  container.innerHTML = layout();
  await carica();
}

function layout() {
  return `
  <div class="view bo-crediti">
    <h2 class="cr-h2">⚡ Crediti Tony</h2>
    <div class="cr-sub">Un credito vale un contenuto scritto da Tony: un post, una storia, una foto analizzata.</div>

    <div id="cr-saldo" class="cr-saldo"><div class="cr-caric">Un attimo…</div></div>

    <h3 class="cr-t">Ricarica</h3>
    <div id="cr-pacchetti" class="cr-pacchetti"></div>

    <h3 class="cr-t">Ultimi movimenti</h3>
    <div id="cr-movimenti"></div>

    <style>
      .bo-crediti{padding:16px;max-width:900px;margin:0 auto}
      .cr-h2{font-size:19px;margin:0}
      .cr-sub{font-size:13px;color:#6b7280;margin:4px 0 16px}
      .cr-t{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;
            margin:22px 0 10px;font-weight:600}
      .cr-saldo{display:flex;gap:10px;flex-wrap:wrap}
      .cr-box{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;min-width:120px;flex:1}
      .cr-box .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.9px;color:#6b7280}
      .cr-box .v{font-size:26px;font-weight:700;margin-top:3px;line-height:1.1}
      .cr-box.ok .v{color:#2F7D32}
      .cr-box.att .v{color:#C98A0B}
      .cr-box.no .v{color:#D32F2F}
      .cr-avviso{background:#fdf5f4;border:1px solid #f3c9c5;border-left:5px solid #D32F2F;
                 border-radius:8px;padding:12px 14px;margin-top:12px;font-size:13.5px;line-height:1.45}
      .cr-pacchetti{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
      .cr-pac{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:left}
      .cr-pac .n{font-weight:700;font-size:15px}
      .cr-pac .c{font-size:13px;color:#6b7280;margin:3px 0 10px}
      .cr-pac .p{font-size:24px;font-weight:700}
      .cr-pac .u{font-size:11.5px;color:#6b7280;margin-top:2px}
      .cr-btn{width:100%;margin-top:12px;background:#111827;color:#fff;border:none;border-radius:8px;
              padding:10px;font-size:14px;font-weight:600;cursor:pointer}
      .cr-btn:disabled{opacity:.5;cursor:default}
      .cr-riga{display:flex;gap:10px;align-items:center;background:#fff;border:1px solid #e5e7eb;
               border-radius:8px;padding:10px 12px;margin-bottom:6px;font-size:13px}
      .cr-ico{font-size:15px;width:20px;text-align:center}
      .cr-des{flex:1;line-height:1.35}
      .cr-data{font-size:11.5px;color:#9ca3af}
      .cr-num{font-weight:700;font-size:14px}
      .cr-caric{color:#9ca3af;font-size:13px;padding:8px}
      @media (max-width:640px){ .bo-crediti{padding:10px} .cr-box .v{font-size:22px} }
    </style>
  </div>`;
}

async function carica() {
  const az = aziendaId();
  if (!az) { toast('Azienda non impostata', 'error'); return; }

  const { data: cr } = await supa().from('v_ai_cruscotto').select('*').eq('azienda_id', az).maybeSingle();
  const saldo = cr ? Number(cr.saldo) : 0;
  const mese = cr ? Number(cr.crediti_mese) : 0;

  const cls = saldo <= 0 ? 'no' : (saldo <= 20 ? 'att' : 'ok');
  document.getElementById('cr-saldo').innerHTML =
    box('Crediti disponibili', saldo, cls) +
    box('Usati questo mese', mese, '') +
    box('Contenuti creati', cr ? cr.azioni_mese : 0, '') +
    (saldo <= 20
      ? '<div class="cr-avviso" style="flex-basis:100%">' +
        (saldo <= 0
          ? 'Crediti esauriti: Tony non scrive più finché non ricarichi. Il calendario e i post già scritti restano dove sono.'
          : 'Restano pochi crediti. Ricarica prima che Tony si fermi.') +
        '</div>'
      : '');

  const { data: pac } = await supa().from('ai_pacchetti')
    .select('codice,nome,crediti,prezzo_eur').eq('attivo', true).order('ordine');

  document.getElementById('cr-pacchetti').innerHTML = (pac || []).map(p => {
    const unit = (Number(p.prezzo_eur) / Number(p.crediti)).toFixed(2).replace('.', ',');
    return '<div class="cr-pac">' +
      '<div class="n">' + esc(p.nome) + '</div>' +
      '<div class="c">' + p.crediti + ' contenuti</div>' +
      '<div class="p">' + Number(p.prezzo_eur).toFixed(2).replace('.', ',') + ' €</div>' +
      '<div class="u">' + unit + ' € a contenuto</div>' +
      '<button class="cr-btn" data-pac="' + esc(p.codice) + '">Acquista</button>' +
      '</div>';
  }).join('') || '<div class="cr-caric">Nessun pacchetto disponibile</div>';

  document.getElementById('cr-pacchetti').onclick = (e) => {
    const b = e.target.closest('[data-pac]');
    if (b) acquista(b.dataset.pac, b);
  };

  const { data: mov } = await supa().from('ai_credito_movimenti')
    .select('tipo,crediti,saldo_dopo,funzione,nota,created_at')
    .eq('azienda_id', az).order('created_at', { ascending: false }).limit(30);

  document.getElementById('cr-movimenti').innerHTML = (mov || []).length
    ? mov.map(m => {
        const t = TIPI[m.tipo] || TIPI.consumo;
        const d = new Date(m.created_at);
        return '<div class="cr-riga">' +
          '<span class="cr-ico">' + t.i + '</span>' +
          '<span class="cr-des">' + t.l +
            (m.funzione ? ' · ' + esc(m.funzione) : '') +
            (m.nota ? ' · ' + esc(m.nota) : '') +
            '<div class="cr-data">' + d.toLocaleDateString('it-IT') + ' ' +
              d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + '</div>' +
          '</span>' +
          '<span class="cr-num" style="color:' + (m.crediti > 0 ? '#2F7D32' : '#6b7280') + '">' +
            (m.crediti > 0 ? '+' : '') + m.crediti + '</span>' +
          '</div>';
      }).join('')
    : '<div class="cr-caric">Ancora nessun movimento</div>';
}

function box(k, v, cls) {
  return '<div class="cr-box ' + cls + '"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>';
}

async function acquista(codice, btn) {
  btn.disabled = true;
  const testo = btn.textContent;
  btn.textContent = 'Apro il pagamento…';
  try {
    const { data, error } = await supa().functions.invoke('crediti-ricarica', {
      body: {
        azienda_id: aziendaId(),
        pacchetto: codice,
        ritorno: window.location.origin + window.location.pathname + '#/bo-crediti'
      }
    });
    if (error) throw error;
    if (!data || !data.success) throw new Error((data && data.error) || 'Pagamento non disponibile');
    window.location.href = data.url;
  } catch (e) {
    toast(e.message || String(e), 'error');
    btn.disabled = false;
    btn.textContent = testo;
  }
}
