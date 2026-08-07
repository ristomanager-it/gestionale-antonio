// js/components/scorciatoie.js
// Le due cose che si guardano ogni giorno, a portata di pollice in home:
// il calendario per chi fa marketing, la galleria per chi porta le foto.

const supa = () => window.supabaseClient || window.supabase;

function ruolo() {
  const s = window.state || {};
  return String(s.ruolo || s.ruoloRaw || '').toLowerCase();
}
function puoMarketing() {
  const r = ruolo();
  return ['superadmin', 'admin', 'manager', 'addetto_marketing'].indexOf(r) !== -1
      || window.state?.isSuperadmin === true;
}

export async function montaScorciatoie() {
  if (document.getElementById('sc-barra')) return;
  if (!puoMarketing()) return;

  const box = document.createElement('div');
  box.id = 'sc-barra';

  // quanti post aspettano di essere guardati
  let daFare = 0;
  try {
    const az = window.state?.azienda?.id;
    const oggi = new Date().toISOString().slice(0, 10);
    const fra7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const { count } = await supa().from('calendario_editoriale')
      .select('id', { count: 'exact', head: true })
      .eq('azienda_id', az).gte('data', oggi).lte('data', fra7)
      .in('stato', ['bozza', 'da_generare']);
    daFare = count || 0;
  } catch (e) { }

  box.innerHTML =
    '<button class="sc-b" data-r="bo-calendario">' +
      '<span class="sc-e">📅</span><span class="sc-t">Calendario</span>' +
      (daFare ? '<span class="sc-n">' + daFare + '</span>' : '') +
    '</button>' +
    '<button class="sc-b" data-r="bo-media">' +
      '<span class="sc-e">🖼</span><span class="sc-t">Galleria</span>' +
    '</button>';

  box.onclick = (e) => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    const r = b.dataset.r;
    if (window.router && window.router.go) window.router.go(r);
    else window.location.hash = '#/' + r;
  };

  // sotto l intestazione, non dietro: si misura quanto e alta e si scende
  const dove = document.querySelector('.view') || document.body;
  dove.insertBefore(box, dove.firstChild);

  const header = document.querySelector('header, .app-header, #app-header, .topbar');
  if (header) {
    const h = header.getBoundingClientRect();
    const fissa = getComputedStyle(header).position;
    if ((fissa === 'fixed' || fissa === 'sticky') && h.height > 0) {
      box.style.marginTop = Math.round(h.height + 12) + 'px';
    }
  }

  const s = document.createElement('style');
  s.textContent =
    '#sc-barra{display:flex;gap:10px;margin-bottom:14px}' +
    '.sc-b{flex:1;background:#fff;border:1px solid #e5e7eb;border-left:4px solid #E16304;' +
    'border-radius:10px;padding:13px 12px;display:flex;align-items:center;gap:9px;' +
    'cursor:pointer;font:inherit;position:relative}' +
    '.sc-b:active{transform:scale(.98)}' +
    '.sc-e{font-size:21px;line-height:1}' +
    '.sc-t{font-size:14px;font-weight:600;color:#023C59}' +
    '.sc-n{margin-left:auto;background:#E16304;color:#fff;border-radius:11px;' +
    'min-width:22px;height:22px;display:flex;align-items:center;justify-content:center;' +
    'font-size:12px;font-weight:700;padding:0 6px}';
  document.head.appendChild(s);
}
