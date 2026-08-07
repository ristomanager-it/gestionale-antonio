// js/views/bo/bo-storie.js
// Le storie durano ventiquattro ore: si fanno al volo e si guardano subito.
// Nessuna esce senza che qualcuno l abbia approvata col proprio nome.

const supa = () => window.supabaseClient || window.supabase;
function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function toast(m, t) { if (window.mostraToast) window.mostraToast(m, t || 'success'); }
function aziendaId() { return window.state?.azienda?.id || window.state?.azienda_id; }

let TUTTE = [];

export async function render(container) {
  container.innerHTML = layout();
  await carica();
}

function layout() {
  return `
  <div class="view bo-storie">
    <h2 class="st-h2">📱 Storie</h2>
    <div class="st-sub">Durano ventiquattro ore. Guardale e mandale, o lasciale scadere.</div>
    <div id="st-elenco"><div class="st-vuoto">Carico…</div></div>

    <style>
      .bo-storie{padding:16px;max-width:900px;margin:0 auto}
      .st-h2{font-size:19px;margin:0}
      .st-sub{font-size:13px;color:#6b7280;margin:4px 0 16px}
      .st-griglia{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:13px}
      .st-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
      .st-img{width:100%;aspect-ratio:9/16;object-fit:cover;display:block;background:#eef1f4}
      .st-sotto{padding:9px 10px}
      .st-stato{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
      .st-stato.bozza{color:#C98A0B}
      .st-stato.approvata{color:#0E76A3}
      .st-stato.pubblicata{color:#449531}
      .st-stato.scaduta{color:#9ca3af}
      .st-quando{font-size:11px;color:#9ca3af;margin-bottom:8px}
      .st-b{width:100%;border:none;border-radius:8px;padding:9px;font-size:12.5px;
            font-weight:700;cursor:pointer;margin-top:5px}
      .st-b.ok{background:#0E76A3;color:#fff}
      .st-b.go{background:#449531;color:#fff}
      .st-b.no{background:#f1f3f5;color:#6b7280}
      .st-vuoto{text-align:center;padding:50px 20px;color:#9ca3af;font-size:14px}
      .st-canale{font-size:11px;color:#6b7280;margin-top:4px}
    </style>
  </div>`;
}

async function carica() {
  const { data, error } = await supa().from('storie')
    .select('*').eq('azienda_id', aziendaId())
    .order('created_at', { ascending: false }).limit(40);

  const box = document.getElementById('st-elenco');
  if (error) { box.innerHTML = '<div class="st-vuoto">' + esc(error.message) + '</div>'; return; }

  TUTTE = data || [];
  if (!TUTTE.length) {
    box.innerHTML = '<div class="st-vuoto">Nessuna storia. Scatta una foto e scegli 📱 Storia.</div>';
    return;
  }

  box.innerHTML = '<div class="st-griglia">' + TUTTE.map(s => {
    const d = new Date(s.created_at);
    const ore = Math.floor((Date.now() - d.getTime()) / 3600000);
    return '<div class="st-card" data-id="' + s.id + '">' +
      (s.immagine_url
        ? '<img class="st-img" src="' + esc(s.immagine_url) + '" alt="" loading="lazy">'
        : '<div class="st-img"></div>') +
      '<div class="st-sotto">' +
        '<div class="st-stato ' + esc(s.stato) + '">' + esc(s.stato) + '</div>' +
        '<div class="st-quando">' + (ore < 1 ? 'adesso' : ore + ' ore fa') +
          (s.origine === 'ripresa' ? ' · ripresa' : '') + '</div>' +
        (s.stato === 'bozza'
          ? '<button class="st-b ok" data-appr="' + s.id + '">Approva</button>' +
            '<button class="st-b no" data-scarta="' + s.id + '">Scarta</button>'
          : '') +
        (s.stato === 'approvata'
          ? '<div class="st-canale">Esce su: ' + esc(s.canale) + '</div>' +
            '<button class="st-b go" data-pub="' + s.id + '">Manda ora</button>'
          : '') +
        (s.stato === 'pubblicata' ? '<div class="st-canale">✅ Online</div>' : '') +
      '</div>' +
    '</div>';
  }).join('') + '</div>';

  box.onclick = async (e) => {
    const a = e.target.closest('[data-appr]');
    const s = e.target.closest('[data-scarta]');
    const p = e.target.closest('[data-pub]');

    if (a) return decidi(Number(a.dataset.appr), 'approvata');
    if (s) return decidi(Number(s.dataset.scarta), 'scartata');

    if (p) {
      const id = Number(p.dataset.pub);
      if (!window.confirm('Mandare questa storia online adesso?')) return;
      p.disabled = true; p.textContent = 'Mando…';
      try {
        const { data, error } = await supa().functions.invoke('storie-pubblica', {
          body: { azienda_id: aziendaId(), storia_id: id, conferma: true }
        });
        if (error) throw error;
        if (!data || !data.success) {
          const det = data && data.esiti ? JSON.stringify(data.esiti) : (data && data.error) || 'non riuscito';
          throw new Error(det);
        }
        toast('Storia online');
        await carica();
      } catch (err) {
        toast('Non riuscito: ' + (err.message || err), 'error');
        p.disabled = false; p.textContent = 'Manda ora';
      }
    }
  };
}

async function decidi(id, stato) {
  const agg = { stato: stato };
  if (stato === 'approvata') {
    const u = await supa().auth.getUser();
    agg.approvata_da = u.data?.user?.id || null;
    agg.approvata_at = new Date().toISOString();
  }
  const { error } = await supa().from('storie').update(agg).eq('id', id);
  if (error) { toast('Non salvato: ' + error.message, 'error'); return; }
  await carica();
}
