// js/components/messaggi-personale.js
// I messaggi per chi lavora: compaiono in home e quando si timbra l entrata.
// Nessuna notifica esterna, nessun numero di telefono: si vedono dove la
// persona sta gia guardando.

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

let stile = false;
function css() {
  if (stile) return;
  stile = true;
  const s = document.createElement('style');
  s.textContent =
    '.msgp-velo{position:fixed;inset:0;background:rgba(2,38,57,.72);display:flex;align-items:center;' +
    'justify-content:center;padding:20px;z-index:1500}' +
    '.msgp-velo[hidden]{display:none !important}' +
    '.msgp-box{background:#fff;border-radius:16px;padding:26px 22px;max-width:380px;width:100%;' +
    'text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3)}' +
    '.msgp-emoji{font-size:46px;line-height:1;margin-bottom:10px}' +
    '.msgp-tit{font-size:19px;font-weight:700;color:#023C59;margin-bottom:10px}' +
    '.msgp-testo{font-size:15px;line-height:1.55;color:#374151;white-space:pre-wrap}' +
    '.msgp-ok{margin-top:20px;background:#E16304;color:#fff;border:none;border-radius:10px;' +
    'padding:13px 30px;font-size:15px;font-weight:700;cursor:pointer;width:100%}' +
    '.msgp-card{background:#fff;border:1px solid #e5e7eb;border-left:5px solid #E16304;' +
    'border-radius:10px;padding:13px 15px;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start}' +
    '.msgp-card .e{font-size:26px;line-height:1.1;flex-shrink:0}' +
    '.msgp-card .t{font-size:14.5px;font-weight:700;color:#023C59;margin-bottom:3px;display:block}' +
    '.msgp-card .c{font-size:13.5px;line-height:1.5;color:#4b5563;white-space:pre-wrap;display:block}' +
    '.msgp-card .x{margin-left:auto;background:none;border:none;color:#9ca3af;font-size:18px;' +
    'cursor:pointer;padding:0 4px;flex-shrink:0}';
  document.head.appendChild(s);
}

async function leggi() {
  try {
    const { data, error } = await supa().rpc('miei_messaggi');
    if (error) return [];
    return data || [];
  } catch (e) { return []; }
}

async function segnaLetto(id) {
  try { await supa().rpc('segna_messaggio_letto', { p_id: id }); } catch (e) { }
}

// Popup a tutto schermo: si usa al momento della timbratura, quando la persona
// ha appena finito un gesto e sta guardando lo schermo.
export async function mostraMessaggiTimbro() {
  css();
  const tutti = await leggi();
  const da = tutti.filter(m => m.al_timbro);
  if (!da.length) return 0;

  for (const m of da) {
    await new Promise(res => {
      const velo = document.createElement('div');
      velo.className = 'msgp-velo';
      velo.innerHTML =
        '<div class="msgp-box">' +
          '<div class="msgp-emoji">' + esc(m.emoji || '🌞') + '</div>' +
          (m.titolo ? '<div class="msgp-tit">' + esc(m.titolo) + '</div>' : '') +
          '<div class="msgp-testo">' + esc(m.testo) + '</div>' +
          '<button class="msgp-ok">Grazie!</button>' +
        '</div>';
      document.body.appendChild(velo);
      velo.querySelector('.msgp-ok').onclick = async () => {
        await segnaLetto(m.id);
        velo.remove();
        res();
      };
    });
  }
  return da.length;
}

// Riquadro in home: per chi non passa dalla timbratura o non ha visto il popup
export async function montaMessaggiHome(contenitore) {
  css();
  if (document.getElementById('msgp-home')) return 0;
  const msg = await leggi();
  if (!msg.length) return 0;

  const box = document.createElement('div');
  box.id = 'msgp-home';
  box.innerHTML = msg.map(m =>
    '<div class="msgp-card" data-id="' + m.id + '">' +
      '<span class="e">' + esc(m.emoji || '🌞') + '</span>' +
      '<span>' +
        (m.titolo ? '<span class="t">' + esc(m.titolo) + '</span>' : '') +
        '<span class="c">' + esc(m.testo) + '</span>' +
      '</span>' +
      '<button class="x" title="Ho letto">✕</button>' +
    '</div>'
  ).join('');

  box.onclick = async (e) => {
    const b = e.target.closest('.x');
    if (!b) return;
    const card = b.closest('.msgp-card');
    await segnaLetto(Number(card.dataset.id));
    card.remove();
    if (!box.querySelector('.msgp-card')) box.remove();
  };

  const dove = contenitore || document.querySelector('.view') || document.body;
  dove.insertBefore(box, dove.firstChild);
  return msg.length;
}
