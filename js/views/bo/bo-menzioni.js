// js/views/bo/bo-menzioni.js
// Chi ci ha taggato. Si guarda e si decide: niente viene ripubblicato da solo.
// In una storia dove ti taggano puo esserci qualunque cosa.

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function toast(m, t) { if (window.mostraToast) window.mostraToast(m, t || 'success'); }
function aziendaId() { return window.state?.azienda?.id || window.state?.azienda_id; }

let TUTTE = [];
let FILTRO = 'da_vedere';

export async function render(container) {
  container.innerHTML = layout();
  await carica();
  bind();
}

function layout() {
  return `
  <div class="view bo-menzioni">
    <h2 class="mz-h2">📸 Chi ci tagga</h2>
    <div class="mz-sub">Storie e post in cui vi hanno nominato. Decidete voi cosa ripubblicare.</div>
    <div class="mz-filtri" id="mz-filtri"></div>
    <div id="mz-elenco"><div class="mz-vuoto">Carico…</div></div>

    <style>
      .bo-menzioni{padding:16px;max-width:900px;margin:0 auto}
      .mz-h2{font-size:19px;margin:0}
      .mz-sub{font-size:13px;color:#6b7280;margin:4px 0 16px}
      .mz-filtri{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px}
      .mz-f{background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:7px 14px;
            font-size:13px;cursor:pointer;font-weight:600;color:#6b7280}
      .mz-f.on{background:#023C59;color:#fff;border-color:#023C59}
      .mz-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;
               margin-bottom:14px;display:flex}
      .mz-img{width:150px;flex-shrink:0;background:#f1f3f5;object-fit:cover;display:block}
      .mz-corpo{padding:13px 15px;flex:1;min-width:0}
      .mz-chi{font-size:14.5px;font-weight:700;color:#023C59}
      .mz-quando{font-size:11.5px;color:#9ca3af;margin-bottom:7px}
      .mz-testo{font-size:13px;line-height:1.45;color:#374151;white-space:pre-wrap;
                max-height:88px;overflow:hidden;margin-bottom:11px}
      .mz-azioni{display:flex;gap:7px;flex-wrap:wrap}
      .mz-a{border:none;border-radius:8px;padding:8px 13px;font-size:12.5px;
            font-weight:600;cursor:pointer}
      .mz-a.si{background:#449531;color:#fff}
      .mz-a.no{background:#f1f3f5;color:#6b7280}
      .mz-a.link{background:#0E76A3;color:#fff;text-decoration:none;display:inline-block}
      .mz-vuoto{text-align:center;padding:50px 20px;color:#9ca3af;font-size:14px}
      .mz-scaduta{font-size:11.5px;color:#B3261E;font-weight:600;margin-top:6px}
      @media (max-width:640px){
        .bo-menzioni{padding:11px}
        .mz-card{flex-direction:column}
        .mz-img{width:100%;height:190px}
      }
    </style>
  </div>`;
}

async function carica() {
  const { data, error } = await supa().from('menzioni_social')
    .select('*').eq('azienda_id', aziendaId())
    .order('ricevuta_at', { ascending: false }).limit(80);

  if (error) {
    document.getElementById('mz-elenco').innerHTML =
      '<div class="mz-vuoto">Non riesco a leggere: ' + esc(error.message) + '</div>';
    return;
  }
  TUTTE = data || [];
  disegnaFiltri();
  disegna();
}

function disegnaFiltri() {
  const conta = {};
  TUTTE.forEach(m => { conta[m.stato] = (conta[m.stato] || 0) + 1; });

  const voci = [
    ['da_vedere', 'Da guardare'],
    ['ripubblicata', 'Ripubblicate'],
    ['ignorata', 'Lasciate stare'],
    ['tutte', 'Tutte']
  ];

  document.getElementById('mz-filtri').innerHTML = voci.map(v => {
    const k = v[0], et = v[1];
    const n = k === 'tutte' ? TUTTE.length : (conta[k] || 0);
    return '<button class="mz-f' + (k === FILTRO ? ' on' : '') + '" data-f="' + k + '">' +
      et + (n ? ' <span style="opacity:.65">' + n + '</span>' : '') + '</button>';
  }).join('');
}

function disegna() {
  const box = document.getElementById('mz-elenco');
  const righe = FILTRO === 'tutte' ? TUTTE : TUTTE.filter(m => m.stato === FILTRO);

  if (!righe.length) {
    box.innerHTML = '<div class="mz-vuoto">' +
      (FILTRO === 'da_vedere' ? 'Nessuno vi ha taggato di recente.' : 'Niente qui.') + '</div>';
    return;
  }

  box.innerHTML = righe.map(m => {
    const d = new Date(m.ricevuta_at);
    const vecchia = (Date.now() - d.getTime()) > 86400000;
    const decisa = m.stato !== 'da_vedere';

    return '<div class="mz-card" data-id="' + m.id + '">' +
      (m.media_url
        ? '<img class="mz-img" src="' + esc(m.media_url) + '" alt="" loading="lazy">'
        : '<div class="mz-img" style="display:flex;align-items:center;justify-content:center;font-size:30px">💬</div>') +
      '<div class="mz-corpo">' +
        '<div class="mz-chi">@' + esc(m.autore || 'sconosciuto') + '</div>' +
        '<div class="mz-quando">' + d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) +
          ' · ' + esc(m.tipo) + '</div>' +
        (m.testo ? '<div class="mz-testo">' + esc(m.testo) + '</div>' : '') +
        '<div class="mz-azioni">' +
          (m.permalink
            ? '<a class="mz-a link" href="' + esc(m.permalink) + '" target="_blank" rel="noopener">Vedi su Instagram</a>'
            : '') +
          (!decisa && !vecchia
            ? '<button class="mz-a si" data-si="' + m.id + '">Ripubblica come storia</button>'
            : '') +
          (!decisa ? '<button class="mz-a no" data-no="' + m.id + '">Lascia stare</button>' : '') +
        '</div>' +
        (vecchia && !decisa
          ? '<div class="mz-scaduta">Piu vecchia di 24 ore: la storia originale non ce piu, ' +
            'ma il testo e la foto restano utili per un post.</div>'
          : '') +
      '</div>' +
    '</div>';
  }).join('');
}

function bind() {
  document.getElementById('mz-filtri').onclick = (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    FILTRO = b.dataset.f;
    disegnaFiltri();
    disegna();
  };

  document.getElementById('mz-elenco').onclick = async (e) => {
    const no = e.target.closest('[data-no]');
    const si = e.target.closest('[data-si]');

    if (no) return decidi(Number(no.dataset.no), 'ignorata');

    if (si) {
      const id = Number(si.dataset.si);
      const m = TUTTE.find(x => x.id === id);
      if (!m) return;
      if (!window.confirm('Ripubblicare la storia di @' + (m.autore || '') + ' sul vostro profilo?')) return;

      si.disabled = true;
      si.textContent = 'Preparo…';
      try {
        const { data: nuova, error } = await supa().from('storie').insert({
          azienda_id: aziendaId(),
          sede_id: m.sede_id,
          immagine_url: m.media_url,
          testo: 'Grazie @' + (m.autore || ''),
          origine: 'ripresa',
          stato: 'bozza',
          canale: 'entrambi'
        }).select('id').single();
        if (error) throw error;

        await supa().from('menzioni_social')
          .update({ stato: 'ripubblicata', decisa_at: new Date().toISOString(), storia_id: nuova.id })
          .eq('id', id);

        toast('Pronta fra le storie: approvala e va online');
        await carica();
      } catch (err) {
        toast('Non riuscito: ' + (err.message || err), 'error');
        si.disabled = false;
        si.textContent = 'Ripubblica come storia';
      }
    }
  };
}

async function decidi(id, stato) {
  const { error } = await supa().from('menzioni_social')
    .update({ stato: stato, decisa_at: new Date().toISOString() }).eq('id', id);
  if (error) { toast('Non salvato: ' + error.message, 'error'); return; }
  await carica();
}
