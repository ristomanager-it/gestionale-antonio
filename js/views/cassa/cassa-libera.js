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

// ATTENZIONE: import statico, il cache-busting di router.js (?v=APP_V) NON lo
// raggiunge. Ad ogni modifica di cassa-hardware.js bumpare manualmente il
// ?v=N qui sotto, altrimenti il browser tiene la versione vecchia in cache.
import { avviaPagamentoCarta, emettiScontrinoFiscale, emettiDocumento, emettiPreconto, configuraCassa } from './cassa-hardware.js?v=3';

// Il router chiama render(app). Recupero l'azienda dallo stato globale.
export async function render(container) {
  const azienda = window.state?.azienda || {};
  return renderCassaLibera(container, azienda);
}

export async function renderCassaLibera(container, azienda) {
  const supabase = window.supabaseClient || window.supabase;
  const aziendaId = azienda?.id || window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id || null;

  // Stato del carrello in memoria
  let carrello = []; // { prodotto_id, nome, prezzo, qta, aliquota_iva }
  let coupon = null; // { codice, cliente, promo_nome, tipo, valore } — verificato, annullato all'incasso
  let fidelityCliente = null; // { id, nome, punti } — agganciato via scan tessera
  let _displayRow = null;     // riga cassa_display per lo schermo cliente
  let _ultimoScan = null;     // dedup codici scanner
  let categorie = [];
  let prodotti = [];
  let categoriaAttiva = null;   // null = tutte le categorie
  let incasso = { doc: 'scontrino', metodo: 'contanti', cliente: null, motivo: null, busy: false };

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
    let lordo = 0, ivaTot = 0;
    for (const r of carrello) {
      const imp = r.prezzo * r.qta;
      lordo += imp;
      const al = r.aliquota_iva || 10;
      ivaTot += imp - (imp / (1 + al / 100));
    }
    // Sconto coupon: percentuale o euro sul totale (2x1/omaggio: gestione manuale in riga)
    let sconto = 0;
    if (coupon && lordo > 0) {
      if (coupon.tipo === 'sconto_perc' || coupon.tipo === 'sconto_percentuale') sconto = lordo * (Number(coupon.valore) || 0) / 100;
      else if (coupon.tipo === 'sconto_euro') sconto = Math.min(Number(coupon.valore) || 0, lordo);
    }
    sconto = round2(sconto);
    const totale = round2(lordo - sconto);
    const fattore = lordo > 0 ? totale / lordo : 1;
    const iva = round2(ivaTot * fattore);
    return { lordo: round2(lordo), sconto, totale, iva, imponibile: round2(totale - iva) };
  }

  function render() {
    const t = totali();
    container.innerHTML = `
      <div class="view" style="max-width:1100px;margin:0 auto;">
        <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">

          <!-- Griglia prodotti -->
          <div style="flex:1;min-width:300px;">
            <input id="cl-cerca" placeholder="Cerca prodotto…"
              style="width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid #d1d5db;border-radius:12px;font-size:15px;margin-bottom:10px;">
            <div id="cl-categorie" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:10px;">
              ${bottoneCategoria(null, 'Tutte')}${categorie.map(c => bottoneCategoria(c.id, c.nome)).join('')}
            </div>
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
            ${coupon ? `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px;margin-top:8px;">
              <span>🎟 ${esc(coupon.promo_nome)}${coupon.cliente ? ' · ' + esc(coupon.cliente) : ''}${t.sconto > 0 ? '' : ' <span style=\'color:#b45309\'>(da applicare a mano)</span>'}</span>
              <span style="display:flex;align-items:center;gap:8px;"><b>${t.sconto > 0 ? '− € ' + t.sconto.toFixed(2) : ''}</b>
              <button id="cl-coupon-x" style="border:none;background:none;color:#b91c1c;cursor:pointer;font-size:14px;">✕</button></span>
            </div>` : ''}
            <div style="display:flex;justify-content:space-between;font-weight:800;font-size:22px;color:#0f172a;margin-top:8px;">
              <span>Totale</span><span>€ ${t.totale.toFixed(2)}</span>
            </div>
            ${fidelityCliente ? `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#7c5c10;background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:8px 10px;margin-top:8px;">
              <span>⭐ ${esc(fidelityCliente.nome)} · ${fidelityCliente.punti} punti</span>
              <button id="cl-fid-x" style="border:none;background:none;color:#b91c1c;cursor:pointer;font-size:14px;">✕</button>
            </div>` : ''}
            <div style="display:flex;gap:8px;margin-top:10px;">
              ${coupon ? '' : `<button id="cl-coupon" style="flex:1;padding:9px;border:1px dashed #cbd5e1;border-radius:999px;background:white;color:#0E5A7A;font-size:13px;font-weight:600;cursor:pointer;">🎟 Coupon</button>`}
              <button id="cl-scan-cliente" style="flex:1;padding:9px;border:1px dashed #cbd5e1;border-radius:999px;background:white;color:#7c5c10;font-size:13px;font-weight:600;cursor:pointer;">📱 Scan cliente</button>
            </div>
            <button id="cl-paga" ${carrello.length ? '' : 'disabled'} style="
              width:100%;margin-top:14px;padding:15px;border:none;border-radius:14px;
              background:${carrello.length ? '#0E5A7A' : '#cbd5e1'};color:white;font-size:16px;font-weight:700;
              cursor:${carrello.length ? 'pointer' : 'default'};">💳 Incassa →</button>
            <button id="cl-svuota" style="width:100%;margin-top:8px;padding:10px;border:1px solid #e5e7eb;border-radius:12px;background:white;color:#64748b;font-size:13px;cursor:pointer;">Svuota</button>
          </div>
        </div>
      </div>

      <!-- Modal coupon: campo (lettore USB/manuale) + fotocamera -->
      <div id="cl-cp-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1250;align-items:center;justify-content:center;">
        <div style="background:white;border-radius:20px;padding:22px;width:min(420px,92vw);">
          <div style="font-weight:800;font-size:18px;margin-bottom:4px;">🎟 Coupon promo</div>
          <div style="color:#64748b;font-size:13px;margin-bottom:12px;">Scansiona il QR con la fotocamera, passa il lettore, o scrivi il codice.</div>
          <input id="cl-cp-input" placeholder="RFC:XXXXXX oppure XXXXXX" autocomplete="off" autocapitalize="characters"
            style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid #d1d5db;border-radius:12px;font-size:16px;letter-spacing:1px;text-transform:uppercase;">
          <div id="cl-cp-cam" style="display:none;margin-top:10px;border-radius:12px;overflow:hidden;background:#000;position:relative;">
            <video id="cl-cp-video" playsinline muted style="width:100%;max-height:260px;object-fit:cover;display:block;"></video>
            <div style="position:absolute;inset:0;border:2px solid rgba(255,255,255,.5);border-radius:12px;pointer-events:none;"></div>
          </div>
          <div id="cl-cp-msg" style="font-size:13px;min-height:18px;margin-top:8px;color:#64748b;"></div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button id="cl-cp-scan" style="flex:1;padding:12px;border:1px solid #0E5A7A;border-radius:999px;background:white;color:#0E5A7A;font-weight:700;cursor:pointer;">📷 Scansiona</button>
            <button id="cl-cp-ok" style="flex:1;padding:12px;border:none;border-radius:999px;background:#0E5A7A;color:white;font-weight:700;cursor:pointer;">Verifica</button>
            <button id="cl-cp-close" style="padding:12px 16px;border:1px solid #e5e7eb;border-radius:999px;background:white;color:#64748b;cursor:pointer;">✕</button>
          </div>
        </div>
      </div>

      <!-- Modal incasso: documento + pagamento (+ fattura, + chiusura non fiscale con motivo) -->
      <div id="cl-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1200;align-items:center;justify-content:center;">
        <div style="background:white;border-radius:20px;padding:22px;width:min(440px,94vw);max-height:92vh;overflow:auto;">
          <div id="cl-main">
            <div style="font-weight:800;font-size:19px;">Incasso</div>
            <div style="color:#64748b;font-size:14px;margin:2px 0 12px;">Totale da incassare: <strong id="cl-modal-tot"></strong></div>

            <div class="cl-lab">Documento</div>
            <div class="cl-row">
              <button class="cl-doc cl-b" data-doc="preconto">📋 Preconto</button>
              <button class="cl-doc cl-b" data-doc="scontrino">🧾 Scontrino</button>
              <button class="cl-doc cl-b" data-doc="fattura">📄 Fattura</button>
            </div>

            <div id="cl-fatt" style="display:none;">
              <div style="display:flex;gap:6px;margin-top:10px;">
                <input id="cl-piva" class="cl-in" inputmode="numeric" placeholder="Partita IVA (11 cifre) o CF" style="flex:1;">
                <button id="cl-piva-cerca" class="cl-b" style="flex:0 0 auto;min-width:0;padding:10px 14px;">🔎 Cerca</button>
              </div>
              <div id="cl-piva-esito" style="font-size:12px;min-height:16px;margin-top:4px;color:#64748b;"></div>
              <input id="cl-rs" class="cl-in" placeholder="Ragione sociale / Nome *">
              <input id="cl-ind" class="cl-in" placeholder="Indirizzo, CAP, città">
              <div style="display:flex;gap:6px;">
                <input id="cl-sdi" class="cl-in" placeholder="Codice SDI" maxlength="7" style="flex:1;text-transform:uppercase;">
                <input id="cl-pec" class="cl-in" placeholder="PEC" style="flex:2;">
              </div>
            </div>

            <div id="cl-pag-box">
              <div class="cl-lab">Pagamento</div>
              <div class="cl-row">
                <button class="cl-met cl-b" data-met="contanti">💵 Contanti</button>
                <button class="cl-met cl-b" data-met="carta">💳 Carta</button>
                <button class="cl-met cl-b" data-met="buoni_pasto">🎫 Buoni pasto</button>
              </div>
              <div class="cl-row" style="margin-top:6px;">
                <button class="cl-met cl-b" data-met="bonifico">🏦 Bonifico</button>
                <button class="cl-met cl-b" data-met="addebito">🏨 Addebito</button>
              </div>
              <div id="cl-contanti-box">
                <input id="cl-ricevuti" class="cl-in" type="number" step="0.01" inputmode="decimal" placeholder="Ricevuti € (facoltativo)">
                <div id="cl-resto" style="display:none;justify-content:space-between;background:#f0fdf4;border-radius:10px;padding:10px 12px;margin-top:8px;font-size:14px;color:#166534;"><span>Resto da dare</span><b id="cl-resto-val"></b></div>
              </div>
              <div id="cl-intest-box" style="display:none;">
                <input id="cl-intestatario" class="cl-in" placeholder="A chi (nome o azienda) *">
                <div class="cl-sp">Sullo scontrino esce come "non riscosso".</div>
              </div>
            </div>

            <div id="cl-pre-nota" class="cl-sp" style="display:none;margin-top:10px;">Documento non fiscale: il carrello resta aperto. Tieni premuto il pulsante 3 secondi per chiudere il conto senza scontrino (solo addebito, omaggio o pasto del personale).</div>

            <div id="cl-esito" style="font-size:14px;margin:12px 0;min-height:20px;"></div>
            <button id="cl-conferma" style="position:relative;overflow:hidden;width:100%;padding:14px;border:none;border-radius:12px;background:#0E5A7A;color:white;font-weight:700;font-size:15px;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;">
              <span id="cl-conf-bar" style="position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,255,255,.25);"></span>
              <span id="cl-conf-txt" style="position:relative;">Conferma e stampa scontrino</span>
            </button>
            <button id="cl-annulla" style="width:100%;margin-top:8px;padding:11px;border:1px solid #e5e7eb;border-radius:12px;background:white;color:#64748b;cursor:pointer;">Annulla</button>
          </div>

          <div id="cl-motivo" style="display:none;">
            <div style="font-weight:800;font-size:18px;">Chiudi senza scontrino</div>
            <div class="cl-sp" style="margin-bottom:10px;">Stampa il preconto, scarica il magazzino e registra il motivo. Se il cliente ha pagato, va fatto lo scontrino.</div>
            <div class="cl-row">
              <button class="cl-mot cl-b" data-mot="addebito">🏨 Addebito / fattura dopo</button>
            </div>
            <div class="cl-row" style="margin-top:6px;">
              <button class="cl-mot cl-b" data-mot="omaggio">🎁 Omaggio</button>
              <button class="cl-mot cl-b" data-mot="personale">🍽️ Personale</button>
            </div>
            <input id="cl-mot-intest" class="cl-in" placeholder="A chi addebitare (nome o azienda) *" style="display:none;">
            <div id="cl-mot-esito" style="font-size:14px;margin:10px 0;min-height:18px;"></div>
            <button id="cl-mot-ok" style="width:100%;padding:13px;border:none;border-radius:12px;background:#b45309;color:white;font-weight:700;cursor:pointer;">Chiudi il conto</button>
            <button id="cl-mot-back" style="width:100%;margin-top:8px;padding:11px;border:1px solid #e5e7eb;border-radius:12px;background:white;color:#64748b;cursor:pointer;">← Indietro</button>
          </div>
        </div>
      </div>
      <style>
        #cl-modal .cl-lab{font-size:12px;font-weight:700;color:#64748b;margin:12px 0 6px}
        #cl-modal .cl-row{display:flex;gap:6px;flex-wrap:wrap}
        #cl-modal .cl-b{flex:1;min-width:90px;padding:12px 6px;border:2px solid #e2e8f0;border-radius:12px;background:#fff;font-weight:700;font-size:13px;color:#334155;cursor:pointer}
        #cl-modal .cl-b.on{border-color:#0E5A7A;background:#e0f2fe;color:#0E5A7A}
        #cl-modal .cl-in{width:100%;box-sizing:border-box;padding:10px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;margin-top:6px}
        #cl-modal .cl-sp{font-size:12px;color:#64748b;margin-top:6px}
      </style>
    `;
    collegaEventi();
  }

  function bottoneCategoria(id, label) {
    const attiva = String(categoriaAttiva) === String(id);
    return '<button data-cl-cat="' + (id === null ? '' : esc(String(id))) + '"' +
      ' style="flex-shrink:0;padding:8px 14px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;' +
      'background:' + (attiva ? '#0E5A7A' : '#eef2f7') + ';color:' + (attiva ? 'white' : '#334155') + ';">' +
      esc(label) + '</button>';
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
    // Cerca e categoria filtrano insieme: con 1.700 prodotti a listino la
    // sola ricerca per nome non basta a trovare in fretta quello che serve.
    const cerca = container.querySelector('#cl-cerca');
    const applicaFiltri = () => {
      const q = (cerca ? cerca.value : '').toLowerCase();
      container.querySelectorAll('.cl-prod').forEach(b => {
        const p = prodotti.find(x => String(x.id) === b.dataset.id);
        if (!p) { b.style.display = 'none'; return; }
        const okNome = !q || String(p.nome || '').toLowerCase().includes(q);
        const okCat = !categoriaAttiva || String(p.categoria_vendita_id) === String(categoriaAttiva);
        b.style.display = (okNome && okCat) ? '' : 'none';
      });
    };
    if (cerca) cerca.oninput = applicaFiltri;

    container.querySelectorAll('[data-cl-cat]').forEach(b => {
      b.onclick = () => {
        categoriaAttiva = b.dataset.clCat === '' ? null : b.dataset.clCat;
        container.querySelectorAll('[data-cl-cat]').forEach(x => {
          const attiva = (x.dataset.clCat === '' ? null : x.dataset.clCat) === categoriaAttiva;
          x.style.background = attiva ? '#0E5A7A' : '#eef2f7';
          x.style.color = attiva ? 'white' : '#334155';
        });
        applicaFiltri();
      };
    });
    applicaFiltri();
    // Svuota
    const sv = container.querySelector('#cl-svuota');
    if (sv) sv.onclick = () => { carrello = []; coupon = null; fidelityCliente = null; render(); aggiornaSchermoCliente(); };
    // Coupon promo: modal con campo (lettore USB scrive qui) + fotocamera; annullo definitivo all'incasso
    const btnCp = container.querySelector('#cl-coupon');
    if (btnCp) btnCp.onclick = () => apriModalCoupon();

    function apriModalCoupon() {
      const modal = container.querySelector('#cl-cp-modal');
      const input = container.querySelector('#cl-cp-input');
      const msg = container.querySelector('#cl-cp-msg');
      modal.style.display = 'flex';
      input.value = ''; msg.textContent = '';
      setTimeout(() => input.focus(), 50); // il lettore USB "scrive" qui e manda Invio

      let stream = null, scanning = false;
      const stopCam = () => {
        scanning = false;
        if (stream) { stream.getTracks().forEach(tr => tr.stop()); stream = null; }
        container.querySelector('#cl-cp-cam').style.display = 'none';
      };
      const chiudi = () => { stopCam(); modal.style.display = 'none'; };

      const verifica = async (codice) => {
        if (!codice || !codice.trim()) { msg.textContent = 'Inserisci un codice.'; msg.style.color = '#b45309'; return; }
        msg.textContent = '⏳ Verifica in corso...'; msg.style.color = '#64748b';
        const r = await verificaCouponCodice(codice);
        if (!r.ok) { msg.innerHTML = r.msgHtml; msg.style.color = '#b91c1c'; return; }
        chiudi(); render(); aggiornaSchermoCliente();
      };

      container.querySelector('#cl-cp-ok').onclick = () => verifica(input.value);
      container.querySelector('#cl-cp-close').onclick = chiudi;
      input.onkeydown = (e) => { if (e.key === 'Enter') verifica(input.value); }; // Invio del lettore USB

      // Fotocamera: BarcodeDetector nativo, altrimenti jsQR da CDN
      container.querySelector('#cl-cp-scan').onclick = async () => {
        try {
          const camBox = container.querySelector('#cl-cp-cam');
          const video = container.querySelector('#cl-cp-video');
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          video.srcObject = stream; await video.play();
          camBox.style.display = 'block';
          msg.textContent = 'Inquadra il QR del cliente...'; msg.style.color = '#64748b';
          scanning = true;

          if ('BarcodeDetector' in window) {
            const det = new BarcodeDetector({ formats: ['qr_code'] });
            const loop = async () => {
              if (!scanning) return;
              try {
                const codes = await det.detect(video);
                if (codes.length) { stopCam(); verifica(codes[0].rawValue); return; }
              } catch(e) {}
              requestAnimationFrame(loop);
            };
            loop();
          } else {
            // fallback: jsQR via canvas
            if (!window.jsQR) {
              await new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
                s.onload = res; s.onerror = rej; document.head.appendChild(s);
              });
            }
            const cv = document.createElement('canvas');
            const ctx = cv.getContext('2d', { willReadFrequently: true });
            const loop = () => {
              if (!scanning) return;
              if (video.videoWidth) {
                cv.width = video.videoWidth; cv.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);
                const img = ctx.getImageData(0, 0, cv.width, cv.height);
                const qr = window.jsQR(img.data, cv.width, cv.height);
                if (qr && qr.data) { stopCam(); verifica(qr.data); return; }
              }
              requestAnimationFrame(loop);
            };
            loop();
          }
        } catch (e) {
          msg.textContent = 'Fotocamera non disponibile: usa il campo di testo o un lettore.'; msg.style.color = '#b45309';
        }
      };
    }
    const cpX = container.querySelector('#cl-coupon-x');
    if (cpX) cpX.onclick = () => { coupon = null; render(); aggiornaSchermoCliente(); };
    const scB = container.querySelector('#cl-scan-cliente');
    if (scB) scB.onclick = () => { scB.textContent = '📱 In attesa del cliente...'; chiediScansione(); };
    const fidX = container.querySelector('#cl-fid-x');
    if (fidX) fidX.onclick = () => { fidelityCliente = null; render(); aggiornaSchermoCliente(); };
    // ── Incasso: documento + pagamento ─────────────────────────────────
    const $ = (sel) => container.querySelector(sel);
    const paga = $('#cl-paga');
    if (paga) paga.onclick = () => {
      if (!carrello.length) return;
      incasso = { doc: 'scontrino', metodo: 'contanti', cliente: null, motivo: null, busy: false };
      $('#cl-modal-tot').textContent = '€ ' + totali().totale.toFixed(2);
      $('#cl-esito').textContent = '';
      ['#cl-piva', '#cl-rs', '#cl-ind', '#cl-sdi', '#cl-pec', '#cl-ricevuti', '#cl-intestatario', '#cl-mot-intest'].forEach(id => { const el = $(id); if (el) el.value = ''; });
      $('#cl-piva-esito').textContent = '';
      $('#cl-main').style.display = '';
      $('#cl-motivo').style.display = 'none';
      aggiornaIncassoUI();
      $('#cl-modal').style.display = 'flex';
    };

    function aggiornaIncassoUI() {
      container.querySelectorAll('.cl-doc').forEach(b => b.classList.toggle('on', b.dataset.doc === incasso.doc));
      container.querySelectorAll('.cl-met').forEach(b => b.classList.toggle('on', b.dataset.met === incasso.metodo));
      const pre = incasso.doc === 'preconto';
      $('#cl-fatt').style.display = incasso.doc === 'fattura' ? '' : 'none';
      $('#cl-pag-box').style.display = pre ? 'none' : '';
      $('#cl-pre-nota').style.display = pre ? '' : 'none';
      $('#cl-contanti-box').style.display = incasso.metodo === 'contanti' ? '' : 'none';
      $('#cl-intest-box').style.display = (incasso.metodo === 'addebito' || incasso.metodo === 'bonifico') ? '' : 'none';
      $('#cl-conf-txt').textContent = pre ? 'Stampa preconto (tieni premuto per chiudere)'
        : incasso.doc === 'fattura' ? 'Conferma e stampa (fattura)' : 'Conferma e stampa scontrino';
      aggiornaResto();
    }
    function aggiornaResto() {
      const r = Number($('#cl-ricevuti').value);
      const tot = totali().totale;
      const box = $('#cl-resto');
      if (!r || r < tot) { box.style.display = 'none'; return; }
      box.style.display = 'flex';
      $('#cl-resto-val').textContent = '€ ' + (Math.round((r - tot) * 100) / 100).toFixed(2);
    }
    container.querySelectorAll('.cl-doc').forEach(b => b.onclick = () => { incasso.doc = b.dataset.doc; aggiornaIncassoUI(); });
    container.querySelectorAll('.cl-met').forEach(b => b.onclick = () => { incasso.metodo = b.dataset.met; aggiornaIncassoUI(); });
    const ric = $('#cl-ricevuti'); if (ric) ric.oninput = aggiornaResto;
    const ann = $('#cl-annulla');
    if (ann) ann.onclick = () => { if (!incasso.busy) $('#cl-modal').style.display = 'none'; };

    // Ricerca cliente da partita IVA: archivio aziendale, poi registro UE (VIES)
    const btnPiva = $('#cl-piva-cerca');
    if (btnPiva) btnPiva.onclick = async () => {
      const v = ($('#cl-piva').value || '').trim().toUpperCase().replace(/\s+/g, '').replace(/^IT/, '');
      const out = $('#cl-piva-esito');
      if (/^[A-Z0-9]{16}$/.test(v)) { // codice fiscale di persona: niente registro, solo archivio
        const { data } = await supabase.from('clienti_fatturazione').select('*').eq('azienda_id', aziendaId).eq('codice_fiscale', v).maybeSingle();
        if (data) { riempiCliente(data); out.textContent = '✅ Trovato in archivio'; }
        else { incasso.cliente = { codice_fiscale: v }; out.textContent = 'Codice fiscale nuovo: completa nome e indirizzo.'; }
        return;
      }
      if (!/^\d{11}$/.test(v)) { out.textContent = '❌ La partita IVA deve avere 11 cifre'; return; }
      out.textContent = '⏳ Cerco…';
      const { data, error } = await supabase.functions.invoke('cerca-piva', { body: { azienda_id: aziendaId, partita_iva: v } });
      if (error || !data) { out.textContent = '❌ Ricerca non riuscita: inserisci i dati a mano'; incasso.cliente = { partita_iva: v }; return; }
      if (!data.ok) { out.textContent = '❌ ' + (data.errore || 'Non trovata'); incasso.cliente = { partita_iva: v }; return; }
      riempiCliente(data.cliente);
      out.textContent = data.fonte === 'archivio' ? '✅ Cliente già in archivio' : ('✅ Trovata nel registro UE' + (data.avviso ? ' — ' + data.avviso : ''));
    };
    function riempiCliente(c) {
      incasso.cliente = c || {};
      $('#cl-rs').value = c?.ragione_sociale || '';
      $('#cl-ind').value = [c?.indirizzo, [c?.cap, c?.citta, c?.provincia].filter(Boolean).join(' ')].filter(Boolean).join(', ');
      $('#cl-sdi').value = c?.codice_sdi || '';
      $('#cl-pec').value = c?.pec || '';
    }

    // Pulsante conferma: tocco breve = azione; tieni premuto 3 s sul preconto = chiusura con motivo
    const conf = $('#cl-conferma');
    let _premuto = null, _lungo = false;
    const bar = $('#cl-conf-bar');
    function stopPressione() { if (_premuto) { clearTimeout(_premuto.t); cancelAnimationFrame(_premuto.raf); _premuto = null; } if (bar) bar.style.width = '0'; }
    if (conf) {
      conf.addEventListener('pointerdown', (e) => {
        if (incasso.busy || incasso.doc !== 'preconto') return;
        _lungo = false;
        const t0 = performance.now();
        const anima = () => { if (!_premuto) return; bar.style.width = Math.min(100, (performance.now() - t0) / 30) + '%'; _premuto.raf = requestAnimationFrame(anima); };
        _premuto = { t: setTimeout(() => { _lungo = true; stopPressione(); apriMotivo(); }, 3000), raf: requestAnimationFrame(anima) };
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => conf.addEventListener(ev, stopPressione));
      conf.oncontextmenu = (e) => e.preventDefault();
      conf.onclick = async () => {
        if (_lungo) { _lungo = false; return; }
        if (incasso.busy) return;
        if (incasso.doc === 'preconto') return stampaPrecontoLibero();
        return confermaIncasso();
      };
    }

    async function stampaPrecontoLibero() {
      const esito = $('#cl-esito');
      const t = totali();
      incasso.busy = true;
      esito.textContent = '⏳ Stampo il preconto…';
      const r = await emettiPreconto({ righe: righeDocumento(), totale: t.totale, sconto: t.sconto, azienda: aziendaId, sede: sedeId });
      incasso.busy = false;
      esito.textContent = r.ok ? '✅ Preconto stampato. Il conto resta aperto.' : '❌ Preconto non stampato: ' + (r.errore || 'errore');
    }

    function apriMotivo() {
      incasso.motivo = null;
      $('#cl-main').style.display = 'none';
      $('#cl-motivo').style.display = '';
      $('#cl-mot-esito').textContent = coupon ? '⚠️ Il coupon non viene usato in una chiusura senza scontrino.' : '';
      container.querySelectorAll('.cl-mot').forEach(b => b.classList.remove('on'));
      $('#cl-mot-intest').style.display = 'none';
    }
    container.querySelectorAll('.cl-mot').forEach(b => b.onclick = () => {
      incasso.motivo = b.dataset.mot;
      container.querySelectorAll('.cl-mot').forEach(x => x.classList.toggle('on', x === b));
      $('#cl-mot-intest').style.display = incasso.motivo === 'addebito' ? '' : 'none';
    });
    const motBack = $('#cl-mot-back');
    if (motBack) motBack.onclick = () => { if (incasso.busy) return; $('#cl-motivo').style.display = 'none'; $('#cl-main').style.display = ''; };
    const motOk = $('#cl-mot-ok');
    if (motOk) motOk.onclick = async () => {
      const out = $('#cl-mot-esito');
      if (incasso.busy) return;
      if (!incasso.motivo) { out.textContent = 'Scegli il motivo.'; return; }
      const intest = ($('#cl-mot-intest').value || '').trim();
      if (incasso.motivo === 'addebito' && !intest) { out.textContent = 'Scrivi a chi addebitare.'; return; }
      incasso.busy = true;
      out.textContent = '⏳ Stampo il preconto e chiudo…';
      const t = totali();
      const lordo = t.lordo;
      const pre = await emettiPreconto({ righe: righeDocumento(), totale: lordo, azienda: aziendaId, sede: sedeId });
      const reg = await registraVendita('non_fiscale', t, { nonFiscale: true });
      if (!reg.ok) { incasso.busy = false; out.textContent = '❌ Chiusura NON registrata: ' + reg.errore; return; }
      const { error } = await supabase.from('chiusure_non_fiscali').insert({
        azienda_id: aziendaId, sede_id: sedeId, motivo: incasso.motivo,
        intestatario: incasso.motivo === 'addebito' ? intest : null,
        totale: lordo, righe: righeDocumento(), canale: 'cassa_libera',
        preconto_id: null,
        operatore_nome: window.state?.userProfile?.nome || window.state?.user?.email || null,
      });
      incasso.busy = false;
      if (error) { out.textContent = '⚠️ Magazzino scaricato ma motivo non salvato: ' + error.message; return; }
      out.textContent = (pre.ok ? '✅ Preconto stampato. ' : '⚠️ Preconto non stampato (' + (pre.errore || 'errore') + '). ') + 'Conto chiuso come ' + ({ addebito: 'addebito', omaggio: 'omaggio', personale: 'pasto del personale' })[incasso.motivo] + '.';
      setTimeout(() => { carrello = []; coupon = null; fidelityCliente = null; $('#cl-modal').style.display = 'none'; render(); aggiornaSchermoCliente(); }, 2500);
    };

    function righeDocumento() {
      return carrello.map(r => ({ descrizione: r.nome, quantita: r.qta, prezzo_unitario: r.prezzo, aliquota_iva: r.aliquota_iva }));
    }

    async function confermaIncasso() {
      const esito = $('#cl-esito');
      const t = totali();
      const metodo = incasso.metodo;
      // Validazioni prima di toccare qualsiasi cosa
      let cliente = null;
      if (incasso.doc === 'fattura') {
        const rs = ($('#cl-rs').value || '').trim();
        const id = ($('#cl-piva').value || '').trim().toUpperCase().replace(/\s+/g, '').replace(/^IT/, '');
        if (!id || !rs) { esito.textContent = 'Per la fattura servono partita IVA (o CF) e ragione sociale.'; return; }
        const isPiva = /^\d{11}$/.test(id);
        cliente = { partita_iva: isPiva ? id : null, codice_fiscale: isPiva ? null : id, ragione_sociale: rs };
      }
      const intest = ($('#cl-intestatario').value || '').trim();
      if ((metodo === 'addebito' || metodo === 'bonifico') && !intest && !cliente) { esito.textContent = 'Scrivi a chi addebitare.'; return; }

      incasso.busy = true;
      try {
        if (metodo === 'carta') {
          esito.textContent = '⏳ Pagamento con carta…';
          const pay = await avviaPagamentoCarta(t.totale, { descrizione: 'Cassa libera' });
          if (!pay.ok) { esito.textContent = '❌ ' + (pay.errore || 'Pagamento non riuscito'); return; }
        }
        if (coupon) {
          const { data: burn, error: burnErr } = await supabase.rpc('annulla_coupon', { p_codice: coupon.codice, p_solo_verifica: false });
          if (burnErr || !burn || !burn.ok) {
            esito.textContent = '❌ Coupon non più valido: ' + (burn?.errore || burnErr?.message || 'errore') + ' — rimosso dal conto.';
            coupon = null; render();
            return;
          }
        }
        const reg = await registraVendita(metodo, t);
        if (!reg.ok) { esito.textContent = 'Incasso NON registrato: ' + reg.errore + ' - segna il conto a mano e avvisa.'; return; }
        const puntiDati = await accreditaFidelity(t);
        if (puntiDati) esito.textContent = '⭐ +' + puntiDati + ' punti a ' + fidelityCliente.nome;
        aggiornaSchermoCliente(true, metodo);
        if (cliente) await salvaClienteFatturazione(cliente);

        esito.textContent = '⏳ Stampo…';
        const doc = await emettiDocumento({
          tipo: incasso.doc,
          righe: righeDocumento(),
          totale: t.totale,
          sconto: t.sconto,
          pagamenti: [{ metodo: metodo, importo: t.totale }],
          cliente: cliente || (intest ? { ragione_sociale: intest } : null),
          azienda: aziendaId, sede: sedeId,
        });
        if (!doc.ok) {
          esito.textContent = '⚠️ Incasso registrato ma documento NON stampato: ' + (doc.errore || 'errore sconosciuto') + ' — verifica la stampante.';
        } else {
          const resto = Number($('#cl-ricevuti').value) - t.totale;
          esito.textContent = '✅ Incassato. Scontrino: ' + (doc.numero_documento || 'n/d') + (doc.simulato ? ' (simulato)' : '')
            + (metodo === 'contanti' && resto > 0 ? ' · Resto € ' + (Math.round(resto * 100) / 100).toFixed(2) : '');
        }
        setTimeout(() => {
          carrello = []; coupon = null; fidelityCliente = null;
          $('#cl-modal').style.display = 'none';
          render(); aggiornaSchermoCliente();
        }, 3500);
      } finally {
        incasso.busy = false;
      }
    }

    // Salva o aggiorna il cliente per le fatture successive (SDI/PEC non arrivano dal registro UE)
    async function salvaClienteFatturazione(cliente) {
      try {
        const extra = {
          ragione_sociale: cliente.ragione_sociale,
          codice_sdi: (($('#cl-sdi').value || '').trim().toUpperCase()) || null,
          pec: ($('#cl-pec').value || '').trim() || null,
        };
        if (incasso.cliente?.id) {
          await supabase.from('clienti_fatturazione').update(Object.assign(extra, { updated_at: new Date().toISOString() })).eq('id', incasso.cliente.id);
        } else {
          await supabase.from('clienti_fatturazione').insert(Object.assign({
            azienda_id: aziendaId, partita_iva: cliente.partita_iva, codice_fiscale: cliente.codice_fiscale,
            indirizzo: ($('#cl-ind').value || '').trim() || null, fonte: 'manuale',
          }, extra));
        }
      } catch (e) { console.warn('salvaClienteFatturazione', e); }
    }
  }

  // ── Verifica coupon (riusata da modal e scanner cliente) ──
  async function verificaCouponCodice(codice) {
    const { data, error } = await supabase.rpc('annulla_coupon', { p_codice: String(codice).trim(), p_solo_verifica: true });
    if (error || !data || !data.ok) {
      return { ok: false, msgHtml: '❌ ' + esc(data?.errore || error?.message || 'Coupon non valido')
        + (data?.cliente ? '<br>Intestato a: ' + esc(data.cliente) : '')
        + (data?.data_utilizzo ? '<br>Usato il: ' + new Date(data.data_utilizzo).toLocaleString('it-IT') : '') };
    }
    coupon = { codice: data.codice, cliente: data.cliente, promo_nome: data.promo_nome, tipo: data.promo_tipo, valore: data.promo_valore };
    return { ok: true };
  }

  // ── Schermo cliente: riga cassa_display + realtime scanner ──
  async function assicuraDisplay() {
    if (_displayRow) return _displayRow;
    try {
      let q = supabase.from('cassa_display').select('id').eq('azienda_id', aziendaId);
      q = sedeId ? q.eq('sede_id', sedeId) : q.is('sede_id', null);
      const { data: ex } = await q.order('updated_at', { ascending: false }).limit(1);
      if (ex && ex[0]) { _displayRow = ex[0]; }
      else {
        const { data: ins } = await supabase.from('cassa_display')
          .insert({ azienda_id: aziendaId, sede_id: sedeId, stato: 'attesa', righe: [], totale: 0 })
          .select('id').maybeSingle();
        _displayRow = ins || null;
      }
      if (_displayRow) {
        supabase.channel('cassa-scan-' + _displayRow.id)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cassa_display', filter: 'id=eq.' + _displayRow.id },
            (payload) => {
              const cod = payload.new && payload.new.scanner_codice;
              if (cod && cod !== _ultimoScan) { _ultimoScan = cod; smistaScansione(cod); }
            })
          .subscribe();
      }
    } catch (e) { console.warn('display:', e?.message || e); }
    return _displayRow;
  }

  async function chiediScansione() {
    const row = await assicuraDisplay();
    if (!row) { alert('Schermo cliente non configurato.'); return; }
    await supabase.from('cassa_display').update({ scanner_richiesto: true, scanner_codice: null, updated_at: new Date().toISOString() }).eq('id', row.id);
  }

  async function smistaScansione(codice) {
    const cod = String(codice).trim();
    // pulisco il codice sul display (pronto per la prossima scansione)
    if (_displayRow) supabase.from('cassa_display').update({ scanner_codice: null }).eq('id', _displayRow.id).then(() => {});
    // coupon: vecchio formato RFC:CODICE oppure link della pagina coupon (…promo.html?…&c=CODICE)
    if (/^rfc:/i.test(cod) || /[?&]c=[A-Za-z0-9]+/i.test(cod)) {
      const r = await verificaCouponCodice(cod);
      if (!r.ok) alert(r.msgHtml.replace(/<br>/g, '\n').replace(/<[^>]+>/g, ''));
      render(); aggiornaSchermoCliente();
      return;
    }
    // altrimenti: tessera fidelity (qr_token)
    const token = cod.replace(/^fid:/i, '');
    const { data: fc } = await supabase.from('fidelity_clienti').select('id, nome, cognome, punti_totali').eq('qr_token', token).maybeSingle();
    if (fc) {
      fidelityCliente = { id: fc.id, nome: (fc.nome + ' ' + (fc.cognome || '')).trim(), punti: fc.punti_totali || 0 };
      render(); aggiornaSchermoCliente();
    } else {
      alert('Codice non riconosciuto: non risulta un coupon o una tessera fidelity.');
    }
  }

  // ── Fidelity: accredito punti all'incasso ──
  async function accreditaFidelity(t) {
    if (!fidelityCliente || !t || t.totale <= 0) return null;
    try {
      const { data: cfg } = await supabase.from('fidelity_config').select('punti_per_euro').eq('azienda_id', aziendaId).maybeSingle();
      const ppe = Number(cfg?.punti_per_euro) || 1;
      const punti = Math.round(t.totale * ppe);
      await supabase.from('fidelity_movimenti').insert({
        cliente_id: fidelityCliente.id, azienda_id: aziendaId, sede_id: sedeId,
        tipo: 'accredito', punti: punti, importo_speso: t.totale, descrizione: 'Cassa libera',
      });
      await supabase.from('fidelity_clienti').update({ punti_totali: (fidelityCliente.punti || 0) + punti }).eq('id', fidelityCliente.id);
      return punti;
    } catch (e) { console.warn('fidelity:', e?.message || e); return null; }
  }

  // Registra la vendita a DB: una riga per prodotto in vendite_giornaliere.
  // Attenzione allo schema: la sede va in sede_uuid (sede_id e' integer, resto
  // di quando le sedi erano numeriche) e riga_uuid tiene l'id del prodotto di
  // vendita, che e' un uuid e non entra in prodotto_id (bigint).
  // Se la scrittura fallisce l'operatore deve saperlo: un incasso perso in
  // silenzio non si recupera piu'.
  async function registraVendita(metodo, t, opts = {}) {
    // opts.nonFiscale: chiusura senza scontrino (addebito/omaggio/personale): scarica il
    // magazzino ma non e' incasso → totale_incassato 0 e canale dedicato.
    const nf = !!opts.nonFiscale;
    const oggi = new Date().toISOString().slice(0,10);
    const righe = carrello.map(r => ({
      azienda_id: aziendaId, sede_uuid: sedeId,
      data_vendita: oggi,
      riga_uuid: r.prodotto_id,
      nome_prodotto: r.nome,
      nome_articolo: r.nome,
      quantita: r.qta,
      prezzo_unitario: r.prezzo,
      totale_riga: round2(r.prezzo * r.qta),
      totale_incassato: nf ? 0 : round2(r.prezzo * r.qta),
      canale: nf ? 'cassa_libera_non_fiscale' : 'cassa_libera',
    }));
    if (!nf && coupon && t.sconto > 0) {
      righe.push({
        azienda_id: aziendaId, sede_uuid: sedeId,
        data_vendita: oggi,
        nome_prodotto: 'Sconto promo: ' + coupon.promo_nome + ' (' + coupon.codice + ')',
        nome_articolo: 'Sconto promo',
        quantita: 1,
        prezzo_unitario: -t.sconto,
        totale_riga: -t.sconto,
        totale_incassato: -t.sconto,
        canale: 'cassa_libera',
      });
    }
    if (!righe.length) return { ok: true };
    const { error } = await supabase.from('vendite_giornaliere').insert(righe);
    if (error) {
      console.error('registraVendita:', error);
      return { ok: false, errore: error.message };
    }
    return { ok: true };
  }

  // Aggiorna lo schermo cliente in tempo reale via canale realtime (scheletro)
  async function aggiornaSchermoCliente(pagato, metodo) {
    try {
      const row = await assicuraDisplay();
      if (!row) return;
      const t = totali();
      const righe = carrello.map(r => ({ nome_prodotto: r.nome, quantita: r.qta, prezzo_snapshot: r.prezzo }));
      if (coupon && t.sconto > 0) righe.push({ nome_prodotto: '🎟 ' + coupon.promo_nome, quantita: 1, prezzo_snapshot: -t.sconto });
      await supabase.from('cassa_display').update({
        stato: pagato ? 'pagato' : (carrello.length ? 'aperta' : 'attesa'),
        righe: righe, totale: t.totale,
        metodo_pagamento: pagato ? (metodo || null) : null,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id);
    } catch (e) { /* non bloccante */ }
  }
  assicuraDisplay();

  function round2(n) { return Math.round((Number(n)||0)*100)/100; }
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}
