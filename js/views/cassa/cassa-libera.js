// ============================================================================
// cassa-libera.js — Cassa "libera" per bar / asporto (senza tavolo)
// ----------------------------------------------------------------------------
// Batti i prodotti al volo, vedi il totale in tempo reale, incassi e (se
// collegati) emetti scontrino fiscale + pagamento carta tap.
// Riusa i prodotti di vendita già esistenti e i moduli:
//   - cassa-hardware.js  (pagamento carta + scontrino)
//   - lo schermo cliente  (cliente-cassa.html) via canale realtime
//
// Questo è lo SCHELETRO funzionante in simulazione: aggiunge prodotti,
// calcola totale e IVA, registra la vendita. Da rifinire graficamente e
// collegare a hardware/fidelity quando testi.
// ============================================================================

import { avviaPagamentoCarta, emettiScontrinoFiscale, configuraCassa } from './cassa-hardware.js';

export async function renderCassaLibera(container, azienda) {
  const supabase = window.supabaseClient || window.supabase;
  const aziendaId = azienda?.id || window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id || null;

  // Stato del carrello in memoria
  let carrello = []; // { prodotto_id, nome, prezzo, qta, aliquota_iva }
  let categorie = [];
  let prodotti = [];

  container.innerHTML = '<div class="view"><p style="color:#64748b;">Caricamento cassa…</p></div>';

  // --- Carico prodotti di vendita + categorie (con aliquota IVA) ---
  try {
    const [pRes, cRes] = await Promise.all([
      supabase.from('prodotti_vendita')
        .select('id, nome, prezzo_base, iva, categoria_vendita_id')
        .eq('azienda_id', aziendaId).eq('attivo', true).eq('disponibile', true)
        .order('nome'),
      supabase.from('categorie_vendita')
        .select('id, nome, aliquota_iva')
        .eq('azienda_id', aziendaId).order('nome'),
    ]);
    prodotti = pRes.data || [];
    categorie = cRes.data || [];
  } catch (e) {
    container.innerHTML = '<div class="view"><p style="color:#dc2626;">Errore nel caricamento dei prodotti.</p></div>';
    return;
  }

  const catMap = new Map(categorie.map(c => [String(c.id), c]));
  // IVA effettiva di un prodotto: override sul prodotto, altrimenti categoria, altrimenti 10
  const ivaDi = (p) => {
    if (p.iva != null) return Number(p.iva);
    const c = catMap.get(String(p.categoria_vendita_id));
    if (c && c.aliquota_iva != null) return Number(c.aliquota_iva);
    return 10;
  };

  render();

  function totali() {
    let totale = 0, ivaTot = 0;
    for (const r of carrello) {
      const imp = r.prezzo * r.qta;
      totale += imp;
      const al = r.aliquota_iva || 10;
      ivaTot += imp - (imp / (1 + al / 100));
    }
    return { totale: round2(totale), iva: round2(ivaTot), imponibile: round2(totale - ivaTot) };
  }

  function render() {
    const t = totali();
    container.innerHTML = `
      <div class="view" style="max-width:1100px;margin:0 auto;">
        <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">

          <!-- Griglia prodotti -->
          <div style="flex:1;min-width:300px;">
            <input id="cl-cerca" placeholder="Cerca prodotto…"
              style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid #d1d5db;border-radius:12px;font-size:15px;margin-bottom:12px;">
            <div id="cl-griglia" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;">
              ${prodotti.map(p => cardProdotto(p)).join('')}
            </div>
          </div>

          <!-- Carrello / conto -->
          <div style="width:340px;flex-shrink:0;position:sticky;top:12px;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
            <div style="font-weight:800;font-size:17px;margin-bottom:12px;color:#0f172a;">🧾 Conto</div>
            <div id="cl-righe" style="max-height:40vh;overflow:auto;">
              ${carrello.length ? carrello.map((r,i)=>rigaCarrello(r,i)).join('') :
                '<div style="color:#94a3b8;font-size:14px;padding:16px 0;text-align:center;">Nessun prodotto.<br>Tocca un prodotto per aggiungerlo.</div>'}
            </div>
            <div style="border-top:1px dashed #e5e7eb;margin:12px 0;"></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;">
              <span>Imponibile</span><span>€ ${t.imponibile.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:#64748b;margin-top:2px;">
              <span>IVA</span><span>€ ${t.iva.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:800;font-size:22px;color:#0f172a;margin-top:8px;">
              <span>Totale</span><span>€ ${t.totale.toFixed(2)}</span>
            </div>
            <button id="cl-paga" ${carrello.length ? '' : 'disabled'} style="
              width:100%;margin-top:14px;padding:15px;border:none;border-radius:14px;
              background:${carrello.length ? '#0E5A7A' : '#cbd5e1'};color:white;font-size:16px;font-weight:700;
              cursor:${carrello.length ? 'pointer' : 'default'};">💳 Incassa →</button>
            <button id="cl-svuota" style="width:100%;margin-top:8px;padding:10px;border:1px solid #e5e7eb;border-radius:12px;background:white;color:#64748b;font-size:13px;cursor:pointer;">Svuota</button>
          </div>
        </div>
      </div>

      <!-- Modal pagamento -->
      <div id="cl-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1200;align-items:center;justify-content:center;">
        <div style="background:white;border-radius:20px;padding:24px;width:min(420px,92vw);">
          <div style="font-weight:800;font-size:19px;margin-bottom:4px;">Incasso</div>
          <div style="color:#64748b;font-size:14px;margin-bottom:16px;">Totale da incassare: <strong id="cl-modal-tot"></strong></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            <button class="cl-met" data-met="contanti" style="flex:1;padding:14px;border:2px solid #16a34a;border-radius:12px;background:#16a34a12;font-weight:700;color:#16a34a;cursor:pointer;">💵 Contanti</button>
            <button class="cl-met" data-met="carta" style="flex:1;padding:14px;border:2px solid #3b82f6;border-radius:12px;background:white;font-weight:700;color:#3b82f6;cursor:pointer;">💳 Carta (tap)</button>
          </div>
          <div id="cl-esito" style="font-size:14px;margin-bottom:12px;min-height:20px;"></div>
          <div style="display:flex;gap:8px;">
            <button id="cl-conferma" style="flex:1;padding:13px;border:none;border-radius:12px;background:#0E5A7A;color:white;font-weight:700;cursor:pointer;">Conferma e scontrino</button>
            <button id="cl-annulla" style="padding:13px 18px;border:1px solid #e5e7eb;border-radius:12px;background:white;color:#64748b;cursor:pointer;">Annulla</button>
          </div>
        </div>
      </div>
    `;
    collegaEventi();
  }

  function cardProdotto(p) {
    return `<button class="cl-prod" data-id="${p.id}" style="
      padding:12px 8px;border:1px solid #e5e7eb;border-radius:12px;background:white;cursor:pointer;
      text-align:left;display:flex;flex-direction:column;gap:4px;min-height:64px;">
      <span style="font-size:13px;font-weight:600;color:#0f172a;line-height:1.2;">${esc(p.nome)}</span>
      <span style="font-size:14px;font-weight:800;color:#0E5A7A;">€ ${(Number(p.prezzo_base)||0).toFixed(2)}</span>
    </button>`;
  }

  function rigaCarrello(r, i) {
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(r.nome)}</div>
        <div style="font-size:12px;color:#94a3b8;">€ ${r.prezzo.toFixed(2)} · IVA ${r.aliquota_iva}%</div>
      </div>
      <button class="cl-meno" data-i="${i}" style="width:26px;height:26px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-weight:700;">−</button>
      <span style="min-width:20px;text-align:center;font-weight:700;">${r.qta}</span>
      <button class="cl-piu" data-i="${i}" style="width:26px;height:26px;border:1px solid #e5e7eb;border-radius:8px;background:white;cursor:pointer;font-weight:700;">+</button>
      <span style="min-width:56px;text-align:right;font-weight:700;">€ ${(r.prezzo*r.qta).toFixed(2)}</span>
    </div>`;
  }

  function collegaEventi() {
    // Aggiungi prodotto
    container.querySelectorAll('.cl-prod').forEach(b => b.onclick = () => {
      const p = prodotti.find(x => String(x.id) === b.dataset.id);
      if (!p) return;
      const ex = carrello.find(r => r.prodotto_id === p.id);
      if (ex) ex.qta++;
      else carrello.push({ prodotto_id: p.id, nome: p.nome, prezzo: Number(p.prezzo_base)||0, qta: 1, aliquota_iva: ivaDi(p) });
      render();
      aggiornaSchermoCliente();
    });
    // +/- quantità
    container.querySelectorAll('.cl-piu').forEach(b => b.onclick = () => { carrello[+b.dataset.i].qta++; render(); aggiornaSchermoCliente(); });
    container.querySelectorAll('.cl-meno').forEach(b => b.onclick = () => {
      const i = +b.dataset.i; carrello[i].qta--; if (carrello[i].qta <= 0) carrello.splice(i,1); render(); aggiornaSchermoCliente();
    });
    // Cerca
    const cerca = container.querySelector('#cl-cerca');
    if (cerca) cerca.oninput = () => {
      const q = cerca.value.toLowerCase();
      container.querySelectorAll('.cl-prod').forEach(b => {
        const p = prodotti.find(x => String(x.id) === b.dataset.id);
        b.style.display = (!q || (p && p.nome.toLowerCase().includes(q))) ? '' : 'none';
      });
    };
    // Svuota
    const sv = container.querySelector('#cl-svuota');
    if (sv) sv.onclick = () => { carrello = []; render(); aggiornaSchermoCliente(); };
    // Apri pagamento
    const paga = container.querySelector('#cl-paga');
    if (paga) paga.onclick = () => {
      if (!carrello.length) return;
      container.querySelector('#cl-modal-tot').textContent = '€ ' + totali().totale.toFixed(2);
      container.querySelector('#cl-esito').textContent = '';
      container.querySelector('#cl-modal').style.display = 'flex';
      _metodoScelto = 'contanti';
    };
    // Metodo
    let _metodoScelto = 'contanti';
    container.querySelectorAll('.cl-met').forEach(b => b.onclick = () => {
      _metodoScelto = b.dataset.met;
      container.querySelectorAll('.cl-met').forEach(x => { x.style.background = 'white'; });
      b.style.background = (_metodoScelto === 'carta' ? '#3b82f612' : '#16a34a12');
    });
    // Annulla
    const ann = container.querySelector('#cl-annulla');
    if (ann) ann.onclick = () => { container.querySelector('#cl-modal').style.display = 'none'; };
    // Conferma incasso
    const conf = container.querySelector('#cl-conferma');
    if (conf) conf.onclick = async () => {
      const esito = container.querySelector('#cl-esito');
      const t = totali();
      // 1) Se carta: avvia pagamento tap (scheletro simulato)
      if (_metodoScelto === 'carta') {
        esito.textContent = '⏳ Avvicina la carta…';
        const pay = await avviaPagamentoCarta(t.totale, { descrizione: 'Cassa libera' });
        if (!pay.ok) { esito.textContent = '❌ ' + (pay.errore || 'Pagamento non riuscito'); return; }
        esito.textContent = pay.simulato ? '✅ Pagamento simulato' : '✅ Pagamento ok';
      }
      // 2) Registra la vendita
      await registraVendita(_metodoScelto, t);
      // 3) Scontrino fiscale (scheletro simulato)
      const scontrino = await emettiScontrinoFiscale({
        righe: carrello.map(r => ({ descrizione: r.nome, quantita: r.qta, prezzo_unitario: r.prezzo, aliquota_iva: r.aliquota_iva })),
        totale: t.totale,
        pagamenti: [{ metodo: _metodoScelto, importo: t.totale }],
        azienda: aziendaId, sede: sedeId,
      });
      esito.textContent = '✅ Incassato. Scontrino: ' + (scontrino.numero_documento || 'n/d') + (scontrino.simulato ? ' (simulato)' : '');
      // 4) Reset dopo un attimo
      setTimeout(() => {
        carrello = [];
        container.querySelector('#cl-modal').style.display = 'none';
        render();
        aggiornaSchermoCliente();
      }, 1400);
    };
  }

  // Registra la vendita a DB: una riga per prodotto in vendite_giornaliere
  // (schema reale: data_vendita, prodotto_id, nome_prodotto, quantita,
  //  prezzo_unitario, totale_riga, canale, sede_id).
  // Il metodo di pagamento andrà su una tabella incassi dedicata quando la
  // colleghi: qui lo passo nel canale per traccia futura.
  async function registraVendita(metodo, t) {
    try {
      const oggi = new Date().toISOString().slice(0,10);
      const righe = carrello.map(r => ({
        azienda_id: aziendaId, sede_id: sedeId,
        data_vendita: oggi,
        prodotto_id: r.prodotto_id,
        nome_prodotto: r.nome,
        quantita: r.qta,
        prezzo_unitario: r.prezzo,
        totale_riga: round2(r.prezzo * r.qta),
        canale: 'cassa_libera',
      }));
      if (righe.length) await supabase.from('vendite_giornaliere').insert(righe);
    } catch (e) {
      console.warn('registraVendita:', e?.message || e);
    }
  }

  // Aggiorna lo schermo cliente in tempo reale via canale realtime (scheletro)
  function aggiornaSchermoCliente() {
    try {
      // >>> COLLEGARE QUI <<< : broadcast sul canale che cliente-cassa.html ascolta.
      // Esempio con Supabase Realtime broadcast:
      // const ch = supabase.channel('cassa-' + sedeId);
      // ch.send({ type:'broadcast', event:'conto', payload:{ righe:carrello, totale: totali().totale } });
    } catch (e) { /* non bloccante */ }
  }

  function round2(n) { return Math.round((Number(n)||0)*100)/100; }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}
