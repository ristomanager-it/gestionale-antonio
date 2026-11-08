// CLIENTI CALDI — chi ha lasciato nome e contatto e non ha concluso: prenotazioni ferme al pagamento,
// cene aziendali, matrimoni, viaggi. Da richiamare oggi; l'esito (richiamato / preso / perso) si segna qui.
// Dati: rpc clienti_caldi(p_azienda), esiti con rpc cliente_caldo_esito. Avviso sul telefono: prenotazioni_avvisa_abbandoni (cron).
export async function render(container) {
  const supa = () => window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Nessuna azienda selezionata.</div>'; return; }
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const eur = (n) => Number(n || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const FONTI = { prenotazione: 'Prenotazione non pagata', cena_aziendale: 'Cena aziendale', matrimonio: 'Matrimonio', viaggio: 'Viaggio' };
  let lista = [], filtro = 'tutti';

  const quando = (iso) => {
    const d = new Date(iso), ore = (Date.now() - d.getTime()) / 3600000;
    if (ore < 1) return 'meno di un\'ora fa';
    if (ore < 24) return Math.round(ore) + (Math.round(ore) === 1 ? ' ora fa' : ' ore fa');
    const g = Math.round(ore / 24); return g === 1 ? 'ieri' : g + ' giorni fa';
  };
  const telInt = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '3') d = '39' + d; return d; };

  const css = '<style>'
    + '.cc{max-width:640px;margin:0 auto;padding:12px;box-sizing:border-box}.cc *{box-sizing:border-box}'
    + '.cc h1{font-size:24px;margin:4px 0}.cc .sub{color:#64748b;font-size:14px;margin:0 0 12px}'
    + '.cc .kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}'
    + '.cc .kpi div{background:#fff;border-radius:12px;padding:10px;text-align:center;border:1px solid #e2e8f0}.cc .kpi b{display:block;font-size:19px}.cc .kpi span{font-size:12px;color:#64748b}'
    + '.cc .chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.cc .chip{padding:7px 12px;border-radius:20px;background:#fff;border:1px solid #cbd5e1;font-size:13px;cursor:pointer;font:inherit}'
    + '.cc .chip.on{background:#0E5A7A;color:#fff;border-color:#0E5A7A}'
    + '.cc h2{font-size:13px;color:#475569;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.04em}'
    + '.cc .card{background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;border:1px solid #e2e8f0;border-left:5px solid #ef4444}'
    + '.cc .card.g{border-left-color:#f59e0b}.cc .card.v{border-left-color:#16a34a}.cc .card.p{border-left-color:#94a3b8;opacity:.7}'
    + '.cc .top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.cc .nome{font-weight:700;font-size:17px;word-break:break-word}'
    + '.cc .badge{font-size:11px;padding:3px 8px;border-radius:12px;background:#fee2e2;color:#991b1b;white-space:nowrap}'
    + '.cc .cosa{margin:6px 0;font-size:15px}.cc .meta{font-size:13px;color:#64748b;line-height:1.5}'
    + '.cc .az{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.cc .az a{padding:8px 12px;border-radius:9px;background:#f1f5f9;font-size:13px;font-weight:600;color:#0f172a;text-decoration:none}'
    + '.cc .az a.pri{background:#0E5A7A;color:#fff}'
    + '.cc .esito{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}.cc .esito button{padding:7px 10px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;font:inherit;font-size:13px;cursor:pointer}'
    + '.cc .vuoto{background:#fff;border-radius:14px;padding:24px;text-align:center;color:#64748b;border:1px solid #e2e8f0}'
    + '</style>';

  function scheda(c) {
    const aperto = c.stato === 'aperto';
    const cls = c.stato === 'recuperato' ? 'v' : c.stato === 'perso' ? 'p' : (c.fonte === 'prenotazione' ? '' : 'g');
    const tel = telInt(c.telefono);
    const saluto = 'Buongiorno ' + String(c.nome || '').split(' ')[0] + ', sono Antonio di Campo Antico. ';
    const az = !aperto ? '' : '<div class="az">'
      + (tel ? '<a class="pri" href="tel:+' + tel + '">📞 Chiama</a><a href="https://wa.me/' + tel + '?text=' + encodeURIComponent(saluto) + '" target="_blank" rel="noopener">💬 WhatsApp</a>' : '')
      + (c.email ? '<a href="mailto:' + esc(c.email) + '">✉️ Email</a>' : '') + '</div>'
      + '<div class="esito">'
      + (c.esito === 'richiamato' ? '<span style="font-size:13px;color:#0E5A7A;font-weight:600;padding:7px 0">✓ Richiamato ' + quando(c.esito_il) + '</span>' : '<button data-e="richiamato" data-f="' + c.fonte + '" data-r="' + esc(c.ref_id) + '">Richiamato</button>')
      + '<button data-e="preso" data-f="' + c.fonte + '" data-r="' + esc(c.ref_id) + '">✅ Preso</button>'
      + '<button data-e="perso" data-f="' + c.fonte + '" data-r="' + esc(c.ref_id) + '">❌ Perso</button></div>';
    return '<div class="card ' + cls + '"><div class="top"><div class="nome">' + esc(c.nome || 'Senza nome') + '</div><span class="badge">' + esc(FONTI[c.fonte] || c.fonte) + '</span></div>'
      + '<div class="cosa">' + esc(c.cosa || '') + (Number(c.valore) > 0 ? ' · <b>' + eur(c.valore) + '</b>' : '') + '</div>'
      + '<div class="meta">' + esc(c.motivo || '') + ' · ' + quando(c.quando) + (c.campagna ? ' · da ' + esc(c.campagna) : '')
      + (c.telefono ? '<br>📞 ' + esc(c.telefono) : '') + (c.email ? ' · ' + esc(c.email) : '') + '</div>' + az + '</div>';
  }

  function disegna() {
    const vis = lista.filter((c) => filtro === 'tutti' || c.fonte === filtro);
    const aperti = vis.filter((c) => c.stato === 'aperto'), recup = vis.filter((c) => c.stato === 'recuperato'), persi = vis.filter((c) => c.stato === 'perso');
    const inBallo = aperti.reduce((t, c) => t + (Number(c.valore) || 0), 0);
    const fonti = ['tutti'].concat(Object.keys(FONTI).filter((f) => lista.some((c) => c.fonte === f)));
    container.innerHTML = css + '<div class="cc"><h1>🔥 Clienti caldi</h1>'
      + '<p class="sub">Chi ha lasciato nome e contatto e non ha ancora concluso. Da richiamare oggi: il più importante è in cima.</p>'
      + '<div class="kpi"><div><b>' + aperti.length + '</b><span>da richiamare</span></div><div><b>' + eur(inBallo) + '</b><span>in ballo</span></div><div><b>' + recup.length + '</b><span>recuperati</span></div></div>'
      + (fonti.length > 2 ? '<div class="chips">' + fonti.map((f) => '<button class="chip' + (f === filtro ? ' on' : '') + '" data-fil="' + f + '">' + (f === 'tutti' ? 'Tutti' : FONTI[f]) + '</button>').join('') + '</div>' : '')
      + '<h2>Da richiamare</h2>' + (aperti.length ? aperti.map(scheda).join('') : '<div class="vuoto">Nessun cliente da richiamare. 👍</div>')
      + (recup.length ? '<h2>Recuperati</h2>' + recup.map(scheda).join('') : '')
      + (persi.length ? '<h2>Persi</h2>' + persi.map(scheda).join('') : '') + '</div>';
    container.querySelectorAll('[data-fil]').forEach((b) => { b.onclick = () => { filtro = b.dataset.fil; disegna(); }; });
    container.querySelectorAll('[data-e]').forEach((b) => {
      b.onclick = async () => {
        b.disabled = true;
        const { error } = await supa().rpc('cliente_caldo_esito', { p_azienda: aziendaId, p_fonte: b.dataset.f, p_ref: b.dataset.r, p_esito: b.dataset.e });
        if (error) { alert('Non salvato: ' + error.message); b.disabled = false; return; }
        await carica();
      };
    });
  }

  async function carica() {
    const { data, error } = await supa().rpc('clienti_caldi', { p_azienda: aziendaId });
    if (error) { container.innerHTML = '<div style="padding:30px;color:#b91c1c;">Errore: ' + esc(error.message) + '</div>'; return; }
    lista = Array.isArray(data) ? data : [];
    disegna();
  }
  container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;">Carico…</div>';
  await carica();
}
