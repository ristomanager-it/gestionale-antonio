// js/views/persone.js — Persone & KPI (Fase 2)
// KPI reali dalle timbrature + analisi Tony per collaboratore.

const supa = () => window.supabaseClient || window.supabase;
const FN_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co/functions/v1/tony-organizzazione';

let aziendaId = null;
let giorniPeriodo = 30;

function esc(s) { return String(s ?? '').replace(/</g, '&lt;'); }

export async function render(container) {
  aziendaId = window.state?.azienda?.id;
  if (!aziendaId) { container.innerHTML = '<div style="padding:40px;color:#94a3b8;">Nessuna azienda attiva.</div>'; return; }

  container.innerHTML = `
    <div style="max-width:860px;margin:0 auto;padding:16px 16px 60px;">
      <button id="pe-back" style="background:none;border:none;color:#0E5A7A;font-size:14px;font-weight:700;cursor:pointer;padding:0;margin-bottom:10px;">← Organizzazione</button>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
        <div>
          <h2 style="margin:0;">👥 Persone & KPI</h2>
          <p style="margin:6px 0 0;font-size:13px;color:#64748b;">Numeri veri dalle timbrature. I numeri descrivono, il contesto giudica.</p>
        </div>
        <select id="pe-periodo" style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;background:#fff;font-weight:700;color:#334155;">
          <option value="30">Ultimi 30 giorni</option>
          <option value="60">Ultimi 60 giorni</option>
          <option value="90">Ultimi 90 giorni</option>
        </select>
      </div>
      <div style="background:#f0f9ff;border-radius:12px;padding:11px 14px;font-size:12px;color:#0E5A7A;line-height:1.5;margin:12px 0;">
        💡 <strong>Come leggere:</strong> la variabilità d'ingresso alta di solito indica <strong>turni spezzati</strong> (pranzo/cena), non indisciplina. Media sopra le 10 ore/giorno = tieni d'occhio il carico della persona.
      </div>
      <div id="pe-lista"><div style="color:#94a3b8;font-size:13px;padding:20px;">Calcolo KPI in corso...</div></div>
    </div>
    <div id="pe-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:9999;align-items:center;justify-content:center;padding:16px;"></div>
  `;

  container.querySelector('#pe-back').onclick = () => { window.location.hash = '#/organizzazione'; };
  const sel = container.querySelector('#pe-periodo');
  sel.onchange = () => { giorniPeriodo = parseInt(sel.value); carica(container); };
  await carica(container);
}

async function carica(container) {
  const box = container.querySelector('#pe-lista');
  box.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:20px;">Calcolo KPI in corso...</div>';
  const { data: kpi, error } = await supa().rpc('get_kpi_dipendenti', { p_azienda: aziendaId, p_giorni: giorniPeriodo });
  if (error) { box.innerHTML = `<div style="color:#dc2626;font-size:13px;">❌ ${esc(error.message)}</div>`; return; }
  if (!kpi || !kpi.length) {
    box.innerHTML = `<div style="background:#fff;border:2px dashed #cbd5e1;border-radius:14px;padding:30px;text-align:center;">
      <div style="font-size:34px;margin-bottom:8px;">👥</div>
      <div style="font-size:15px;font-weight:700;color:#334155;">Nessuna timbratura nel periodo</div>
      <div style="font-size:13px;color:#94a3b8;margin-top:4px;">I KPI si calcolano dalle timbrature: appena la squadra timbra, qui compaiono i numeri.</div>
    </div>`;
    return;
  }

  const oggi = new Date();
  const mediaOre = kpi.map(k => Number(k.media_ore_giorno || 0)).filter(n => n > 0);
  const mediaSquadra = mediaOre.length ? mediaOre.reduce((a, b) => a + b, 0) / mediaOre.length : 0;

  box.innerHTML = kpi.map(k => {
    const ultimoGg = k.ultimo_giorno ? Math.floor((oggi - new Date(k.ultimo_giorno)) / 86400000) : 999;
    const badges = [];
    if (Number(k.media_ore_giorno) >= 10) badges.push('<span style="background:#fee2e2;color:#dc2626;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;">🔥 Carico alto</span>');
    if (ultimoGg > 7) badges.push(`<span style="background:#f1f5f9;color:#64748b;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;">💤 Assente da ${ultimoGg}gg</span>`);
    if (Number(k.regolarita_minuti) <= 60 && Number(k.giorni_lavorati) >= 5) badges.push('<span style="background:#dcfce7;color:#15803d;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;">🎯 Preciso</span>');
    return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="font-size:15.5px;font-weight:800;color:#0f172a;">${esc(k.dip_nome)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${badges.join('')}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(95px,1fr));gap:8px;margin-top:12px;">
        <div style="background:#f8fafc;border-radius:10px;padding:9px;text-align:center;"><div style="font-size:17px;font-weight:800;color:#0f172a;">${k.giorni_lavorati}</div><div style="font-size:10.5px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Giorni</div></div>
        <div style="background:#f8fafc;border-radius:10px;padding:9px;text-align:center;"><div style="font-size:17px;font-weight:800;color:#0f172a;">${k.ore_totali}</div><div style="font-size:10.5px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Ore tot</div></div>
        <div style="background:#f8fafc;border-radius:10px;padding:9px;text-align:center;"><div style="font-size:17px;font-weight:800;color:${Number(k.media_ore_giorno) >= 10 ? '#dc2626' : '#0f172a'};">${k.media_ore_giorno || '-'}</div><div style="font-size:10.5px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Ore/giorno</div></div>
        <div style="background:#f8fafc;border-radius:10px;padding:9px;text-align:center;"><div style="font-size:17px;font-weight:800;color:#0f172a;">${k.ingresso_medio || '-'}</div><div style="font-size:10.5px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Ingresso</div></div>
        <div style="background:#f8fafc;border-radius:10px;padding:9px;text-align:center;"><div style="font-size:17px;font-weight:800;color:#0f172a;">±${k.regolarita_minuti}′</div><div style="font-size:10.5px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Variabilità</div></div>
      </div>
      <button class="pe-analisi" data-nome="${esc(k.dip_nome)}" style="margin-top:12px;width:100%;background:linear-gradient(135deg,#0E5A7A,#1a8fb5);color:#fff;border:none;border-radius:10px;padding:11px;font-size:13.5px;font-weight:700;cursor:pointer;">🧠 Analisi di Tony</button>
    </div>`;
  }).join('');

  box.querySelectorAll('.pe-analisi').forEach(b => b.onclick = () => analisiTony(b.dataset.nome));
}

async function analisiTony(nome) {
  const modal = document.getElementById('pe-modal');
  modal.style.display = 'flex';
  modal.innerHTML = `<div style="background:#fff;border-radius:18px;max-width:600px;width:100%;padding:22px;max-height:92vh;overflow:auto;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="font-size:16px;font-weight:800;color:#0f172a;">🧠 Analisi di Tony — ${esc(nome)}</div>
      <button id="pa-chiudi" style="background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;">✕</button>
    </div>
    <div id="pa-body" style="font-size:13.5px;color:#334155;line-height:1.6;">
      <div style="text-align:center;padding:30px;color:#0E5A7A;">🧠 Tony sta incrociando timbrature, valutazioni e valori aziendali...<br><span style="font-size:12px;color:#94a3b8;">(10-20 secondi)</span></div>
    </div>
  </div>`;
  const chiudi = () => { modal.style.display = 'none'; modal.innerHTML = ''; };
  modal.querySelector('#pa-chiudi').onclick = chiudi;
  modal.onclick = (e) => { if (e.target === modal) chiudi(); };

  try {
    const { data: { session } } = await supa().auth.getSession();
    const resp = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session?.access_token || '') },
      body: JSON.stringify({ azienda_id: aziendaId, azione: 'analisi_dipendente', dip_nome: nome, giorni: giorniPeriodo })
    });
    const j = await resp.json();
    if (!j.ok) throw new Error(j.errore || 'Errore analisi');
    const p = j.proposta || {};
    const lista = (arr, icona, colore) => (arr || []).map(x => `<div style="display:flex;gap:8px;padding:5px 0;"><span>${icona}</span><span style="color:${colore};">${esc(x)}</span></div>`).join('');
    modal.querySelector('#pa-body').innerHTML = `
      <div style="background:#f0f9ff;border-radius:12px;padding:14px;margin-bottom:14px;font-style:italic;">"${esc(p.sintesi || '')}"</div>
      ${(p.punti_forza || []).length ? `<div style="font-size:11px;font-weight:800;color:#15803d;text-transform:uppercase;margin-bottom:4px;">Punti di forza</div>${lista(p.punti_forza, '✅', '#334155')}` : ''}
      ${(p.punti_attenzione || []).length ? `<div style="font-size:11px;font-weight:800;color:#d97706;text-transform:uppercase;margin:12px 0 4px;">Punti di attenzione</div>${lista(p.punti_attenzione, '⚠️', '#334155')}` : ''}
      ${(p.azioni_consigliate || []).length ? `<div style="font-size:11px;font-weight:800;color:#0E5A7A;text-transform:uppercase;margin:12px 0 4px;">Azioni consigliate questa settimana</div>${lista(p.azioni_consigliate, '👉', '#0f172a')}` : ''}
      ${p.domanda_per_il_titolare ? `<div style="margin-top:14px;background:#fef3c7;border-radius:12px;padding:12px;font-size:13px;color:#92400e;"><strong>❓ Tony ti chiede:</strong> ${esc(p.domanda_per_il_titolare)}</div>` : ''}
    `;
  } catch (e) {
    modal.querySelector('#pa-body').innerHTML = `<div style="color:#dc2626;">❌ ${esc(e.message || e)}</div>`;
  }
}
