// js/views/bo/bo-voucher.js
// I buoni regalo: l unica cosa che un ristorante vende senza occupare un tavolo.
// Si incassa a dicembre e si consuma a marzo, e chi lo regala porta qualcuno
// che non sarebbe mai venuto.

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function toast(m, t) { if (window.mostraToast) window.mostraToast(m, t || 'success'); }
function aziendaId() { return window.state?.azienda?.id || window.state?.azienda_id; }
function eur(n) { return (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 }) + ' euro'; }

let TIPI = [], CONF = null, QUADRO = null, EMESSI = [], SFONDI = [], MISURE = null;

export async function render(container) {
  container.innerHTML = layout();
  await carica();
  bind();
}

function layout() {
  return `
  <div class="view bo-voucher">
    <h2 class="vc-h2">🎁 Buoni regalo</h2>
    <div class="vc-sub">Chi regala una cena porta un cliente che non sarebbe mai venuto.</div>

    <div id="vc-quadro" class="vc-quadro"></div>

    <div class="vc-tit">Cosa vendete</div>
    <div id="vc-tipi" class="vc-griglia"></div>

    <div class="vc-tit">La pagina per chi compra</div>
    <div id="vc-conf"></div>

    <div class="vc-tit">Sfondi a disposizione</div>
    <div id="vc-sfondi"></div>

    <div class="vc-tit">Emessi di recente</div>
    <div id="vc-emessi"></div>

    <style>
      .bo-voucher{padding:16px;max-width:1000px;margin:0 auto}
      .vc-h2{font-size:19px;margin:0}
      .vc-sub{font-size:13px;color:#6b7280;margin:4px 0 18px}
      .vc-tit{font-size:11px;text-transform:uppercase;letter-spacing:.8px;
              color:#6b7280;margin:26px 0 11px;font-weight:700}
      .vc-quadro{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
      .vc-q{background:#fff;border:1px solid #e5e7eb;border-radius:11px;padding:13px}
      .vc-q .n{font-size:22px;font-weight:800;color:#023C59;line-height:1.15}
      .vc-q .e{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
      .vc-q.soldi .n{color:#449531}
      .vc-q.impegno .n{color:#C98A0B}

      .vc-griglia{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:13px}
      .vc-card{background:#fff;border:1px solid #e5e7eb;border-radius:13px;overflow:hidden;cursor:pointer}
      .vc-card:active{transform:scale(.99)}
      .vc-img{height:92px;background:#122A38;background-size:cover;background-position:center;position:relative}
      .vc-img::after{content:'';position:absolute;inset:0;background:linear-gradient(transparent,rgba(0,0,0,.6))}
      .vc-nome{position:absolute;bottom:8px;left:11px;right:11px;color:#fff;font-size:14.5px;
               font-weight:700;z-index:1;text-shadow:0 1px 4px rgba(0,0,0,.55)}
      .vc-body{padding:11px 13px}
      .vc-comp{font-size:12px;color:#6b7280;line-height:1.5;min-height:34px}
      .vc-riga{display:flex;align-items:center;justify-content:space-between;margin-top:9px}
      .vc-prezzo{font-size:17px;font-weight:800;color:#023C59}
      .vc-venduti{font-size:11.5px;color:#9ca3af}
      .vc-spento{opacity:.5}
      .vc-nuovo{border:2px dashed #cbd5e1;background:#fafbfc;display:flex;align-items:center;
                justify-content:center;min-height:170px;color:#6b7280;font-size:14px;
                font-weight:600;cursor:pointer;border-radius:13px}

      .vc-conf{background:#fff;border:1px solid #e5e7eb;border-radius:13px;padding:15px}
      .vc-campo{margin-bottom:13px}
      .vc-campo label{display:block;font-size:12px;color:#6b7280;margin-bottom:4px;font-weight:600}
      .vc-campo input,.vc-campo textarea{width:100%;border:1px solid #e5e7eb;border-radius:9px;
                                         padding:10px 12px;font:14px inherit}
      .vc-due{display:grid;grid-template-columns:1fr 1fr;gap:11px}
      .vc-link{background:#f6f9fb;border:1px dashed #c8d8e2;border-radius:9px;padding:11px;
               font-size:12.5px;color:#023C59;word-break:break-all;margin-bottom:13px}
      .vc-salva{background:#023C59;color:#fff;border:none;border-radius:9px;padding:12px 22px;
                font-size:14px;font-weight:700;cursor:pointer}
      .vc-sf{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:9px}
      .vc-sf div{aspect-ratio:1.41;border-radius:9px;background-size:cover;background-position:center;
                 border:2px solid transparent;position:relative}
      .vc-sf div span{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);
                      color:#fff;font-size:10.5px;padding:4px 6px;border-radius:0 0 7px 7px;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .vc-mis{background:#fffdf5;border:1px solid #f0e2b8;border-radius:10px;padding:12px;
              font-size:12.5px;color:#6b5b २d;white-space:pre-wrap;line-height:1.55;margin-top:11px}
      .vc-em{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:11px 13px;
             margin-bottom:8px;display:flex;align-items:center;gap:12px}
      .vc-em .c{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#6b7280}
      .vc-em .s{margin-left:auto;font-size:11px;font-weight:700;text-transform:uppercase}
      .s.valido{color:#449531} .s.usato{color:#9ca3af} .s.da_pagare{color:#C98A0B}
      .s.scaduto{color:#B3261E}
      .vc-vuoto{text-align:center;padding:28px;color:#9ca3af;font-size:13.5px}
      @media(max-width:640px){ .vc-due{grid-template-columns:1fr} }
    </style>
  </div>`;
}

async function carica() {
  const az = aziendaId();
  const [t, c, q, e, s, m] = await Promise.all([
    supa().from('voucher_tipi').select('*').eq('azienda_id', az).order('ordine'),
    supa().from('voucher_config').select('*').eq('azienda_id', az).maybeSingle(),
    supa().from('v_voucher_quadro').select('*').eq('azienda_id', az).maybeSingle(),
    supa().from('voucher').select('codice,per_nome,stato,prezzo_pagato,created_at,tipo_id,occasione')
      .eq('azienda_id', az).order('created_at', { ascending: false }).limit(12),
    supa().from('voucher_sfondi').select('*').eq('azienda_id', az).order('ordine'),
    supa().from('voucher_misure').select('*').eq('id', 1).maybeSingle()
  ]);

  TIPI = t.data || []; CONF = c.data || null; QUADRO = q.data || null;
  EMESSI = e.data || []; SFONDI = s.data || []; MISURE = m.data || null;

  disegnaQuadro(); disegnaTipi(); disegnaConf(); disegnaSfondi(); disegnaEmessi();
}

function disegnaQuadro() {
  const q = QUADRO || {};
  document.getElementById('vc-quadro').innerHTML =
    '<div class="vc-q soldi"><div class="n">' + eur(q.incassato) + '</div><div class="e">Incassato</div></div>' +
    '<div class="vc-q impegno"><div class="n">' + eur(q.impegno_futuro) + '</div><div class="e">Da onorare</div></div>' +
    '<div class="vc-q"><div class="n">' + (q.da_onorare || 0) + '</div><div class="e">Buoni validi</div></div>' +
    '<div class="vc-q"><div class="n">' + (q.usati || 0) + '</div><div class="e">Usati</div></div>';
}

function disegnaTipi() {
  document.getElementById('vc-tipi').innerHTML = TIPI.map(t =>
    '<div class="vc-card' + (t.attivo ? '' : ' vc-spento') + '" data-tipo="' + t.id + '">' +
      '<div class="vc-img" style="' +
        (t.immagine_url ? "background-image:url(" + esc(t.immagine_url) + ")" :
         'background:' + esc(t.colore_fondo || '#122A38')) + '">' +
        '<div class="vc-nome">' + esc(t.nome) +
          (t.sottotitolo ? '<div style="font-size:11.5px;font-weight:400;opacity:.9">' +
            esc(t.sottotitolo) + '</div>' : '') + '</div>' +
      '</div>' +
      '<div class="vc-body">' +
        '<div class="vc-comp">' + (t.comprende || []).map(x => '· ' + esc(x)).join('<br>') + '</div>' +
        '<div class="vc-riga"><span class="vc-prezzo">' + eur(t.prezzo) + '</span>' +
        '<span class="vc-venduti">' + (t.venduti || 0) + ' venduti</span></div>' +
      '</div></div>').join('') +
    '<div class="vc-nuovo" id="vc-nuovo">+ Nuovo buono</div>';
}

function disegnaConf() {
  const c = CONF || {};
  const link = 'https://app.ristoflow-ai.com/regalo.html?l=' + (c.slug || '');
  document.getElementById('vc-conf').innerHTML =
    '<div class="vc-conf">' +
      (c.slug ? '<div class="vc-link">🔗 ' + esc(link) +
        '<div style="font-size:11px;color:#6b7280;margin-top:5px">' +
        'Da mettere sul sito, in bio su Instagram, o su un cartello in sala.</div></div>' : '') +
      '<div class="vc-campo"><label>Titolo della pagina</label>' +
        '<input id="vc-titolo" value="' + esc(c.titolo_pagina || '') + '"></div>' +
      '<div class="vc-campo"><label>Frase di apertura</label>' +
        '<input id="vc-intro" value="' + esc(c.intro || '') + '" ' +
        'placeholder="Regala una serata, non un oggetto."></div>' +
      '<div class="vc-due">' +
        '<div class="vc-campo"><label>Colore di fondo</label>' +
          '<input id="vc-fondo" type="color" value="' + esc(c.colore_fondo || '#122A38') + '"></div>' +
        '<div class="vc-campo"><label>Colore accento</label>' +
          '<input id="vc-accento" type="color" value="' + esc(c.colore_accento || '#C9A227') + '"></div>' +
      '</div>' +
      '<div class="vc-campo"><label>Email da cui partono i buoni</label>' +
        '<input id="vc-mail" value="' + esc(c.email_mittente || '') + '"></div>' +
      '<div class="vc-campo"><label>Condizioni scritte in fondo al buono</label>' +
        '<textarea id="vc-cond" rows="2">' + esc(c.condizioni || '') + '</textarea></div>' +
      '<button class="vc-salva" id="vc-salva">Salva</button>' +
    '</div>';
}

function disegnaSfondi() {
  const box = document.getElementById('vc-sfondi');
  box.innerHTML =
    (SFONDI.length
      ? '<div class="vc-sf">' + SFONDI.map(s =>
          '<div style="background-image:url(' + esc(s.url) + ')">' +
          '<span>' + esc((s.nome || '').slice(0, 40)) + '</span></div>').join('') + '</div>'
      : '<div class="vc-vuoto">Nessuno sfondo. Scegline dalla galleria.</div>') +
    (MISURE ? '<div class="vc-mis"><b>Se chi compra carica una sua foto:</b>\n' +
      esc(MISURE.nota || '') + '</div>' : '');
}

function disegnaEmessi() {
  const box = document.getElementById('vc-emessi');
  if (!EMESSI.length) { box.innerHTML = '<div class="vc-vuoto">Nessun buono emesso.</div>'; return; }
  box.innerHTML = EMESSI.map(v => {
    const t = TIPI.find(x => x.id === v.tipo_id);
    return '<div class="vc-em"><div>' +
      '<div style="font-size:13.5px;font-weight:600;color:#023C59">' + esc(t ? t.nome : 'buono') +
      (v.per_nome ? ' <span style="font-weight:400;color:#6b7280">per ' + esc(v.per_nome) + '</span>' : '') +
      '</div><div class="c">' + esc(v.codice) + '</div></div>' +
      '<span class="s ' + esc(v.stato) + '">' + esc(String(v.stato).replace('_', ' ')) + '</span></div>';
  }).join('');
}

function bind() {
  document.getElementById('vc-tipi').onclick = (e) => {
    if (e.target.closest('#vc-nuovo')) { toast('La scheda per creare un buono arriva a breve', 'error'); return; }
    if (e.target.closest('[data-tipo]')) toast('La modifica arriva a breve', 'error');
  };

  const s = document.getElementById('vc-salva');
  if (s) s.onclick = async () => {
    s.disabled = true; s.textContent = 'Salvo…';
    const { error } = await supa().from('voucher_config').upsert({
      azienda_id: aziendaId(),
      titolo_pagina: document.getElementById('vc-titolo').value.trim(),
      intro: document.getElementById('vc-intro').value.trim(),
      colore_fondo: document.getElementById('vc-fondo').value,
      colore_accento: document.getElementById('vc-accento').value,
      email_mittente: document.getElementById('vc-mail').value.trim(),
      condizioni: document.getElementById('vc-cond').value.trim(),
      aggiornato_at: new Date().toISOString()
    }, { onConflict: 'azienda_id' });
    s.disabled = false; s.textContent = 'Salva';
    if (error) { toast('Non salvato: ' + error.message, 'error'); return; }
    toast('Salvato');
  };
}
