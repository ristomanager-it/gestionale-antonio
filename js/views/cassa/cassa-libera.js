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
import { avviaPagamentoCarta, emettiScontrinoFiscale, emettiDocumento, emettiPreconto, configuraCassa } from './cassa-hardware.js?v=9';

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
  // Cassa unica: scheda Sala (tavoli, si incassa chi paga al banco) e scheda Banco (vendita al volo)
  // si puo' aprire direttamente sulla scheda Banco: #/cassa-libera?modo=banco (pulsante Cassa di Comande)
  // Scheda Prenotazioni: conti aperti da prenotazioni, preventivi e camere con gli acconti scalati.
  // Si apre anche da link: #/cassa-libera?modo=pren&origine=tavolo&rif=ID (pulsante nella scheda prenotazione)
  const _qs = new URLSearchParams((window.location.hash.split('?')[1]) || '');
  let modo = _qs.get('modo') === 'banco' ? 'banco' : (_qs.get('modo') === 'pren' ? 'pren' : 'sala');
  let pren = { data: oggiRoma(), lista: [], caricato: false, msg: '', errore: '' };
  let accontoScontrino = 'intero';   // da cassa_impostazioni: 'intero' | 'solo_saldo'
  function oggiRoma() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date()); }
  let contoAperto = false;   // telefono: conto a comparsa dal basso
  const stretto = () => (window.matchMedia ? window.matchMedia('(max-width: 760px)').matches : window.innerWidth <= 760);
  let _ultimoStretto = stretto();
  const _onResize = () => {
    if (!container.isConnected) { window.removeEventListener('resize', _onResize); return; }
    const ora = stretto();
    if (ora !== _ultimoStretto) { _ultimoStretto = ora; if (!incasso.busy && container.querySelector('#cl-modal')?.style.display !== 'flex') render(); }
  };
  window.addEventListener('resize', _onResize);
  let tavoloAttivo = null;   // { comanda, tavolo } quando si incassa un tavolo dalla cassa
  let sala = { tavoli: [], sale: [], salaSel: null, aperte: [], totali: {}, preconti: new Set(), errori: {}, incassatoOggi: 0, caricato: false };

  container.innerHTML = '<div class="view"><p style="color:#64748b;">Caricamento cassa…</p></div>';

  // --- Carico prodotti di vendita + categorie (con aliquota IVA) ---
  try {
    // Solo prodotti e categorie della sede in cui si e': prima uscivano tutte le sedi insieme, con le categorie doppie
    let qProdotti = supabase.from('prodotti_vendita')
      .select('id, nome, prezzo_base, iva, categoria_vendita_id')
      .eq('azienda_id', aziendaId).eq('attivo', true).eq('disponibile', true);
    let qCategorie = supabase.from('categorie_vendita')
      .select('id, nome, aliquota_iva')
      .eq('azienda_id', aziendaId);
    if (sedeId) {
      qProdotti = qProdotti.or('sede_id.eq.' + sedeId + ',sede_id.is.null');
      qCategorie = qCategorie.eq('sede_id', sedeId);
    }
    const [pRes, cRes] = await Promise.all([qProdotti.order('nome'), qCategorie.order('nome')]);
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

  await caricaSala();
  try {
    const ci = await supabase.from('cassa_impostazioni').select('acconto_scontrino').eq('azienda_id', aziendaId).maybeSingle();
    if (ci.data && ci.data.acconto_scontrino) accontoScontrino = ci.data.acconto_scontrino;
  } catch (_) {}
  if (_qs.get('origine') && _qs.get('rif')) await apriPratica(_qs.get('origine'), _qs.get('rif'));
  else render();

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

  // Acconti gia' versati sulla pratica del conto aperto (prenotazione, preventivo, camera)
  function accontoPratica() { return tavoloAttivo && tavoloAttivo.pratica ? round2(Number(tavoloAttivo.pratica.pagato) || 0) : 0; }
  function daPagare() { return round2(Math.max(totali().totale - accontoPratica(), 0)); }
  // Pagamenti per lo scontrino: con acconto e impostazione 'intero' lo scontrino copre tutto il conto,
  // l'acconto figura come gia' pagato (elettronico, bonifico o contanti come e' stato incassato)
  function pagamentiDocumento(metodo, totale) {
    const acc = Math.min(accontoPratica(), totale);
    if (!acc) return [{ metodo: metodo, importo: totale }];
    const mov = (tavoloAttivo.pratica.movimenti || []).filter(m => m.tipo !== 'rimborso');
    const m0 = String((mov[0] && mov[0].metodo) || 'carta');
    const metAcc = accontoScontrino === 'solo_saldo' ? 'acconto' : (m0 === 'contanti' ? 'contanti' : m0 === 'bonifico' ? 'bonifico' : 'carta');
    const out = [{ metodo: metAcc, importo: round2(acc) }];
    const resto = round2(totale - acc);
    if (resto > 0) out.push({ metodo: metodo, importo: resto });
    return out;
  }

  function barraSchede() {
    const tab = (id, label) => '<button class="cl-tab" data-modo="' + id + '" style="padding:10px 18px;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;'
      + (modo === id ? 'background:#0E5A7A;color:#fff;' : 'background:#f1f5f9;color:#334155;') + '">' + label + '</button>';
    return '<div style="display:flex;align-items:center;gap:8px;background:#fff;border-radius:14px;padding:8px 10px;margin-bottom:12px;box-shadow:0 1px 2px rgba(0,0,0,.06);">'
      + tab('sala', '🪑 Sala') + tab('pren', '📅 Prenotazioni') + tab('banco', '🛒 Banco')
      + '<span style="margin-left:auto;font-size:12px;color:#64748b;">' + (modo === 'sala' ? 'Chi viene a pagare al banco' : modo === 'pren' ? 'Conti con acconto' : 'Asporto, bar, caffè al banco') + '</span></div>';
  }

  function render() {
    if (modo === 'sala' && !tavoloAttivo) { renderSala(); return; }
    if (modo === 'pren' && !tavoloAttivo) { renderPratiche(); return; }
    const t = totali();
    const bannerTavolo = tavoloAttivo
      ? '<div style="display:flex;align-items:center;gap:10px;background:#e0f2fe;border:1px solid #bae6fd;border-radius:12px;padding:10px 12px;margin-bottom:12px;">'
        + '<button id="cl-torna-sala" style="border:none;background:#fff;border-radius:8px;padding:6px 10px;cursor:pointer;font-weight:700;color:#0E5A7A;">← ' + (tavoloAttivo.pratica ? 'Prenotazioni' : 'Sala') + '</button>'
        + '<b style="color:#0E5A7A;">' + (tavoloAttivo.pratica ? esc(tavoloAttivo.pratica.nome || '') : 'Tavolo ' + esc(tavoloAttivo.tavolo?.nome || '')) + '</b>'
        + '<span style="font-size:13px;color:#334155;">' + (tavoloAttivo.comanda.coperti ? tavoloAttivo.comanda.coperti + ' coperti · ' : '') + esc(tavoloAttivo.comanda.cliente_nome || '') + '</span>'
        + '<span style="margin-left:auto;font-size:12px;color:#64748b;">' + (tavoloAttivo.pratica ? 'Aggiungi gli extra dal listino' : 'Per modificare il conto usa Comande') + '</span></div>'
      : '';
    container.innerHTML = `
      <div class="view" style="max-width:1100px;margin:0 auto;">
        ${barraSchede()}
        ${bannerTavolo}
        <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;">

          <!-- Griglia prodotti -->
          <div style="flex:1;min-width:300px;${tavoloAttivo && !tavoloAttivo.pratica ? 'display:none;' : ''}">
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
          <div id="cl-conto" class="${contoAperto || tavoloAttivo ? 'aperto' : ''}" style="width:340px;flex-shrink:0;position:sticky;top:12px;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:16px;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
            <div class="cl-desk" style="font-weight:800;font-size:17px;margin-bottom:12px;color:#0f172a;">🧾 Conto</div>
            <button id="cl-conto-toggle" class="cl-head-mob" style="width:100%;border:none;background:none;padding:0 0 8px;cursor:pointer;align-items:center;gap:8px;font-size:15px;color:#0f172a;">
              <b>🧾 Conto</b><span style="color:#64748b;font-size:13px;">${carrello.reduce((n, r) => n + r.qta, 0)} pz</span>
              <b style="margin-left:auto;font-size:18px;">€ ${t.totale.toFixed(2)}</b><span style="color:#64748b;">${contoAperto || tavoloAttivo ? '▼' : '▲'}</span>
            </button>
            <div class="cl-dett">
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
            ${accontoPratica() > 0 ? `
            <div style="display:flex;justify-content:space-between;font-size:14px;color:#15803d;margin-top:4px;">
              <span>Acconti già versati</span><span>− € ${accontoPratica().toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:800;font-size:20px;color:#0E5A7A;margin-top:4px;">
              <span>Da pagare</span><span>€ ${daPagare().toFixed(2)}</span>
            </div>` : ''}
            ${fidelityCliente ? `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#7c5c10;background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:8px 10px;margin-top:8px;">
              <span>⭐ ${esc(fidelityCliente.nome)} · ${fidelityCliente.punti} punti</span>
              <button id="cl-fid-x" style="border:none;background:none;color:#b91c1c;cursor:pointer;font-size:14px;">✕</button>
            </div>` : ''}
            </div>
            <div class="cl-dett" style="display:flex;gap:8px;margin-top:10px;">
              ${coupon ? '' : `<button id="cl-coupon" style="flex:1;padding:9px;border:1px dashed #cbd5e1;border-radius:999px;background:white;color:#0E5A7A;font-size:13px;font-weight:600;cursor:pointer;">🎟 Coupon</button>`}
              <button id="cl-scan-cliente" style="flex:1;padding:9px;border:1px dashed #cbd5e1;border-radius:999px;background:white;color:#7c5c10;font-size:13px;font-weight:600;cursor:pointer;">📱 Scan cliente</button>
            </div>
            <button id="cl-paga" ${carrello.length ? '' : 'disabled'} style="
              width:100%;margin-top:14px;padding:15px;border:none;border-radius:14px;
              background:${carrello.length ? '#0E5A7A' : '#cbd5e1'};color:white;font-size:16px;font-weight:700;
              cursor:${carrello.length ? 'pointer' : 'default'};">💳 Incassa →</button>
            <button id="cl-svuota" class="cl-dett" style="width:100%;margin-top:8px;padding:10px;border:1px solid #e5e7eb;border-radius:12px;background:white;color:#64748b;font-size:13px;cursor:pointer;">Svuota</button>
          </div>
        </div>
        <div class="cl-spazio-mob"></div>
      </div>
      <style>
        .cl-head-mob{display:none}
        .cl-spazio-mob{display:none}
        @media (max-width:760px){
          #cl-conto{position:fixed!important;left:0;right:0;bottom:0;top:auto!important;width:auto!important;z-index:60;
            border-radius:18px 18px 0 0!important;max-height:82vh;overflow:auto;padding:12px 14px calc(12px + env(safe-area-inset-bottom,0px))!important;
            box-shadow:0 -8px 24px rgba(0,0,0,.14)!important}
          #cl-conto .cl-desk{display:none}
          #cl-conto .cl-head-mob{display:flex}
          #cl-conto:not(.aperto) .cl-dett{display:none!important}
          #cl-conto #cl-paga{margin-top:6px!important;padding:13px!important}
          .cl-spazio-mob{display:block;height:130px}
          #cl-griglia{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))!important}
        }
      </style>

      <!-- Modal coupon: campo (lettore USB/manuale) + fotocamera -->
      <div id="cl-cp-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1250;align-items:center;justify-content:center;">
        <div style="background:white;border-radius:20px;padding:22px;width:min(420px,92vw);">
          <div style="font-weight:800;font-size:18px;margin-bottom:4px;">🎟 Promo o tessera fidelity</div>
          <div style="color:#64748b;font-size:13px;margin-bottom:12px;">Inquadra il QR del cliente con la fotocamera, passa il lettore, o scrivi il codice.</div>
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
              <input id="cl-email" class="cl-in" type="email" placeholder="Email per ricevere il PDF (facoltativa)">
              <div class="cl-sp">La fattura va allo SDI; dalla stampante dei preconti esce la copia di cortesia. Niente scontrino.</div>
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
    if (tavoloAttivo) {
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;">'
        + '<div style="flex:1;min-width:0;font-size:13px;font-weight:600;color:#0f172a;">' + esc(r.nome) + '</div>'
        + '<span style="font-size:13px;color:#64748b;">× ' + r.qta + '</span>'
        + '<span style="min-width:64px;text-align:right;font-weight:700;">€ ' + (r.prezzo * r.qta).toFixed(2) + '</span></div>';
    }
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
    container.querySelectorAll('.cl-tab').forEach(b => b.onclick = () => {
      if (incasso.busy) return;
      if (tavoloAttivo) { tavoloAttivo = null; carrello = []; coupon = null; fidelityCliente = null; }
      modo = b.dataset.modo;
      if (modo === 'pren') pren.caricato = false;
      if (modo === 'sala') caricaSala().then(render); else render();
    });
    const tg = container.querySelector('#cl-conto-toggle');
    if (tg) tg.onclick = () => { contoAperto = !contoAperto; const c = container.querySelector('#cl-conto'); if (c) c.classList.toggle('aperto', contoAperto || !!tavoloAttivo); tg.lastElementChild.textContent = (contoAperto || tavoloAttivo) ? '▼' : '▲'; };
    const torna = container.querySelector('#cl-torna-sala');
    if (torna) torna.onclick = () => {
      const daPren = !!(tavoloAttivo && tavoloAttivo.pratica);
      tavoloAttivo = null; carrello = []; coupon = null; fidelityCliente = null;
      if (daPren) { modo = 'pren'; pren.caricato = false; render(); } else { modo = 'sala'; caricaSala().then(render); }
    };
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

    function apriModalCoupon(conCamera) {
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
        if (!r.ok) {
          // Non e' una promo: forse e' la tessera fidelity del cliente (stesso scanner della cassa)
          const token = String(codice).trim().replace(/^fid:/i, '');
          const { data: fc } = await supabase.from('fidelity_clienti').select('id, nome, cognome, punti_totali').eq('qr_token', token).maybeSingle();
          if (fc) {
            fidelityCliente = { id: fc.id, nome: (fc.nome + ' ' + (fc.cognome || '')).trim(), punti: fc.punti_totali || 0 };
            chiudi(); render(); aggiornaSchermoCliente();
            return;
          }
          msg.innerHTML = r.msgHtml; msg.style.color = '#b91c1c'; return;
        }
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
      if (conCamera) container.querySelector('#cl-cp-scan').click();
    }
    const cpX = container.querySelector('#cl-coupon-x');
    if (cpX) cpX.onclick = () => { coupon = null; render(); aggiornaSchermoCliente(); };
    const scB = container.querySelector('#cl-scan-cliente');
    // Scan cliente: QR della promo o della tessera fidelity con la fotocamera di questo dispositivo
    if (scB) scB.onclick = () => apriModalCoupon(true);
    const fidX = container.querySelector('#cl-fid-x');
    if (fidX) fidX.onclick = () => { fidelityCliente = null; render(); aggiornaSchermoCliente(); };
    // ── Incasso: documento + pagamento ─────────────────────────────────
    const $ = (sel) => container.querySelector(sel);
    const paga = $('#cl-paga');
    if (paga) paga.onclick = () => {
      if (!carrello.length) return;
      incasso = { doc: 'scontrino', metodo: 'contanti', cliente: null, motivo: null, busy: false };
      $('#cl-modal-tot').textContent = '€ ' + daPagare().toFixed(2) + (accontoPratica() > 0 ? ' (conto € ' + totali().totale.toFixed(2) + ', acconti € ' + accontoPratica().toFixed(2) + ')' : '');
      $('#cl-esito').textContent = '';
      ['#cl-piva', '#cl-rs', '#cl-nome', '#cl-cognome', '#cl-ind', '#cl-cap', '#cl-comune', '#cl-prov', '#cl-sdi', '#cl-pec', '#cl-email', '#cl-ricevuti', '#cl-intestatario', '#cl-mot-intest'].forEach(id => { const el = $(id); if (el) el.value = ''; });
      $('#cl-piva-esito').textContent = '';
      $('#cl-persona').style.display = 'none'; $('#cl-rs').style.display = '';
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
      const tot = daPagare();
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

    // Codice fiscale di 16 caratteri = persona: nome e cognome al posto della ragione sociale
    const tipoCliente = () => {
      const v = ($('#cl-piva').value || '').trim().toUpperCase().replace(/\s+/g, '');
      const persona = /^[A-Z0-9]{16}$/.test(v) && !/^\d{11}$/.test(v);
      $('#cl-persona').style.display = persona ? 'flex' : 'none';
      $('#cl-rs').style.display = persona ? 'none' : '';
      return persona;
    };
    const inPiva = $('#cl-piva'); if (inPiva) inPiva.oninput = tipoCliente;

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
      // il registro UE non da' CAP separato ne' codice SDI: li prende dal registro imprese (si paga una volta per P.IVA)
      if (!$('#cl-cap').value || !$('#cl-sdi').value) {
        try {
          const { data: a } = await supabase.functions.invoke('anagrafica-piva', { body: { piva: v } });
          const x = a && a.ok ? a.anagrafica : null;
          if (x) {
            const metti = (id, val) => { const el = $(id); if (el && val && !el.value) el.value = val; };
            metti('#cl-rs', x.ragione_sociale); metti('#cl-ind', x.indirizzo); metti('#cl-cap', x.cap);
            metti('#cl-comune', x.citta || x.comune); metti('#cl-prov', x.provincia); metti('#cl-sdi', x.codice_sdi); metti('#cl-pec', x.pec);
            out.textContent += ' · dati completati dal registro imprese';
          }
        } catch (e) { /* restano i dati trovati */ }
      }
    };
    function riempiCliente(c) {
      incasso.cliente = c || {};
      tipoCliente();
      $('#cl-rs').value = c?.ragione_sociale || '';
      // archivio vecchio: indirizzo tutto in un campo; il CAP si ripesca se c'e'
      let ind = c?.indirizzo || '', cap = c?.cap || '', com = c?.citta || '';
      if (!cap) { const m = /(\d{5})\s+([^,(]+)/.exec(ind); if (m) { cap = m[1]; com = com || m[2].trim(); ind = ind.slice(0, m.index).replace(/[,\s]+$/, ''); } }
      $('#cl-ind').value = ind; $('#cl-cap').value = cap; $('#cl-comune').value = com; $('#cl-prov').value = c?.provincia || '';
      $('#cl-sdi').value = c?.codice_sdi || '';
      $('#cl-pec').value = c?.pec || '';
      $('#cl-email').value = c?.email || '';
      if (/^[A-Z0-9]{16}$/.test(c?.codice_fiscale || '') && !c?.partita_iva) {
        const p = String(c.ragione_sociale || '').trim().split(/\s+/);
        $('#cl-nome').value = p.slice(0, -1).join(' '); $('#cl-cognome').value = p.slice(-1).join(' ');
      }
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
      const r = await emettiPreconto(Object.assign({ righe: righeDocumento(), totale: t.totale, sconto: t.sconto, azienda: aziendaId, sede: sedeId }, datiTavolo()));
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
      const chiusura = ({ addebito: 'ADDEBITO: ' + intest, omaggio: 'OMAGGIO', personale: 'PASTO PERSONALE' })[incasso.motivo];
      const pre = await emettiPreconto(Object.assign({ righe: righeDocumento(), totale: lordo, azienda: aziendaId, sede: sedeId, chiusura: chiusura }, datiTavolo()));
      const reg = tavoloAttivo
        ? await chiudiComandaTavolo({ totale: lordo, metodo_pagamento: 'non_fiscale', tipo_documento: 'preconto' })
        : await registraVendita('non_fiscale', t, { nonFiscale: true });
      if (!reg.ok) { incasso.busy = false; out.textContent = '❌ Chiusura NON registrata: ' + reg.errore; return; }
      const { error } = await supabase.from('chiusure_non_fiscali').insert({
        azienda_id: aziendaId, sede_id: sedeId, motivo: incasso.motivo,
        intestatario: incasso.motivo === 'addebito' ? intest : null,
        totale: lordo, righe: righeDocumento(), canale: tavoloAttivo ? 'cassa_tavolo' : 'cassa_libera',
        comanda_uuid: tavoloAttivo ? tavoloAttivo.comanda.id : null,
        preconto_id: null,
        operatore_nome: window.state?.userProfile?.nome || window.state?.user?.email || null,
      });
      incasso.busy = false;
      if (error) { out.textContent = '⚠️ Magazzino scaricato ma motivo non salvato: ' + error.message; return; }
      out.textContent = (pre.ok ? '✅ Preconto stampato. ' : '⚠️ Preconto non stampato (' + (pre.errore || 'errore') + '). ') + 'Conto chiuso come ' + ({ addebito: 'addebito', omaggio: 'omaggio', personale: 'pasto del personale' })[incasso.motivo] + '.';
      dopoChiusura(2500);
    };

    function righeDocumento() {
      return carrello.filter(r => Number(r.prezzo) > 0)
        .map(r => ({ descrizione: r.nome, quantita: r.qta, prezzo_unitario: r.prezzo, aliquota_iva: r.aliquota_iva }));
    }
    // Dati del tavolo da passare alla stampante (preconto/scontrino)
    function datiTavolo() {
      if (!tavoloAttivo) return {};
      return { numero_tavolo: tavoloAttivo.tavolo?.nome || null, coperti: tavoloAttivo.comanda.coperti || null, comanda_uuid: tavoloAttivo.comanda.id };
    }
    // Chiude la comanda del tavolo (al posto di registrare una vendita al banco:
    // il magazzino del tavolo è già stato scaricato quando il cameriere ha ordinato)
    async function chiudiComandaTavolo(campi) {
      const upd = Object.assign({ stato: 'chiusa', chiusa_at: new Date().toISOString(),
        cameriere_chiusura: window.state?.userProfile?.nome || window.state?.user?.email || 'cassa' }, campi);
      const { error } = await supabase.from('comande').update(upd).eq('id', tavoloAttivo.comanda.id);
      return error ? { ok: false, errore: error.message } : { ok: true };
    }
    function dopoChiusura(ms) {
      setTimeout(() => {
        carrello = []; coupon = null; fidelityCliente = null;
        const eraTavolo = !!tavoloAttivo;
        const eraPratica = !!(tavoloAttivo && tavoloAttivo.pratica);
        contoAperto = false;
        tavoloAttivo = null;
        $('#cl-modal').style.display = 'none';
        if (eraPratica) { modo = 'pren'; pren.caricato = false; render(); }
        else if (eraTavolo) { modo = 'sala'; caricaSala().then(render); } else render();
        aggiornaSchermoCliente();
      }, ms);
    }

    async function confermaIncasso() {
      const esito = $('#cl-esito');
      const t = totali();
      const metodo = incasso.metodo;
      // Validazioni prima di toccare qualsiasi cosa
      let cliente = null;
      if (incasso.doc === 'fattura') {
        const val = (sel) => ($(sel).value || '').trim();
        const id = val('#cl-piva').toUpperCase().replace(/\s+/g, '').replace(/^IT/, '');
        const isPiva = /^\d{11}$/.test(id), isCf = /^[A-Z0-9]{16}$/.test(id);
        const persona = !isPiva && isCf;
        const rs = persona ? (val('#cl-nome') + ' ' + val('#cl-cognome')).trim() : val('#cl-rs');
        const manca = [];
        if (!isPiva && !isCf) manca.push('partita IVA (11 cifre) o codice fiscale');
        if (persona ? !(val('#cl-nome') && val('#cl-cognome')) : !rs) manca.push(persona ? 'nome e cognome' : 'ragione sociale');
        if (!val('#cl-ind')) manca.push('via');
        if (!/^\d{5}$/.test(val('#cl-cap'))) manca.push('CAP di 5 cifre');
        if (!val('#cl-comune')) manca.push('comune');
        const sdi = val('#cl-sdi').toUpperCase();
        if (sdi && !/^[A-Z0-9]{7}$/.test(sdi)) manca.push('codice SDI di 7 caratteri (o lascialo vuoto)');
        if (manca.length) { esito.textContent = 'Per la fattura manca: ' + manca.join(', ') + '.'; return; }
        cliente = { partita_iva: isPiva ? id : null, codice_fiscale: isPiva ? null : id, ragione_sociale: rs,
          nome: persona ? val('#cl-nome') : null, cognome: persona ? val('#cl-cognome') : null,
          indirizzo: val('#cl-ind'), cap: val('#cl-cap'), citta: val('#cl-comune'), provincia: val('#cl-prov').toUpperCase() || null,
          codice_sdi: sdi || null, pec: val('#cl-pec') || null, email: val('#cl-email') || null };
      }
      const intest = ($('#cl-intestatario').value || '').trim();
      if ((metodo === 'addebito' || metodo === 'bonifico') && !intest && !cliente) { esito.textContent = 'Scrivi a chi addebitare.'; return; }

      incasso.busy = true;
      try {
        const dovuto = daPagare();
        const pratica = tavoloAttivo && tavoloAttivo.pratica ? tavoloAttivo.pratica : null;
        let avvisoPratica = '';
        if (metodo === 'carta' && dovuto > 0) {
          esito.textContent = '⏳ Pagamento con carta…';
          const pay = await avviaPagamentoCarta(dovuto, { descrizione: pratica ? 'Saldo ' + (pratica.nome || '') : 'Cassa libera' });
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
        const reg = tavoloAttivo
          ? await chiudiComandaTavolo({
              totale: t.totale, metodo_pagamento: metodo, tipo_documento: incasso.doc === 'fattura' ? 'fattura' : 'scontrino',
              fattura_cf: cliente ? (cliente.partita_iva || cliente.codice_fiscale) : null,
              fattura_ragione_sociale: cliente ? cliente.ragione_sociale : null,
              promo_codice: coupon ? coupon.codice : null, promo_sconto: t.sconto > 0 ? t.sconto : null,
            })
          : await registraVendita(metodo, t, { fattura: incasso.doc === 'fattura' });
        if (!reg.ok) { esito.textContent = 'Incasso NON registrato: ' + reg.errore + ' - segna il conto a mano e avvisa.'; return; }
        if (pratica) {
          const ex = await salvaExtraPratica();
          if (!ex.ok) avvisoPratica += '⚠️ Extra non salvati nelle righe del conto (' + ex.errore + '). ';
          if (dovuto > 0) {
            const rs = await supabase.rpc('incasso_registra', { p_origine: pratica.origine, p_rif: String(pratica.rif), p_importo: dovuto, p_metodo: metodo, p_tipo: 'saldo', p_comanda: tavoloAttivo.comanda.id });
            if (rs.error || !(rs.data && rs.data.ok)) avvisoPratica += '⚠️ Saldo non registrato nella pratica (' + (rs.error?.message || rs.data?.errore || 'errore') + '): registralo dalla scheda. ';
          }
        }
        const puntiDati = await accreditaFidelity(t);
        if (puntiDati) esito.textContent = '⭐ +' + puntiDati + ' punti a ' + fidelityCliente.nome;
        aggiornaSchermoCliente(true, metodo);
        if (cliente) await salvaClienteFatturazione(cliente);

        if (incasso.doc === 'fattura') {
          esito.textContent = '⏳ Mando la fattura allo SDI…';
          const righeDoc = righeDocumento();
          const { data: fr, error: fe } = await supabase.functions.invoke('fe-vendita', { body: {
            azione: 'da_cassa', azienda_id: aziendaId, comanda_id: tavoloAttivo ? tavoloAttivo.comanda.id : null,
            tavolo: tavoloAttivo ? (tavoloAttivo.tavolo?.nome || '') : '', metodo: metodo, sconto: t.sconto > 0 ? t.sconto : 0,
            righe: righeDoc,
            cliente: { cliente_partita_iva: cliente.partita_iva, cliente_codice_fiscale: cliente.codice_fiscale,
              cliente_denominazione: cliente.nome ? null : cliente.ragione_sociale, cliente_nome: cliente.nome, cliente_cognome: cliente.cognome,
              cliente_indirizzo: cliente.indirizzo, cliente_cap: cliente.cap, cliente_comune: cliente.citta, cliente_provincia: cliente.provincia,
              cliente_codice_destinatario: cliente.codice_sdi || '0000000', cliente_pec: cliente.pec, cliente_email: cliente.email },
          } });
          const r = fr || {};
          let msg;
          if (fe && !r.fattura_id) msg = '⚠️ Incasso registrato ma la fattura NON è partita: ' + (r.errore || fe.message || 'errore') + ' — rifalla da Fatture emesse.';
          else if (r.ok) msg = '✅ Fattura ' + (r.numero || '') + ' inviata allo SDI.';
          else msg = '⚠️ Fattura ' + (r.numero || 'creata') + ' non accettata: ' + (r.errore || 'errore') + ' — la trovi in rosso nella home Gestione.';
          if (r.cortesia) {
            const st = await emettiCortesia(Object.assign({ righe: righeDoc, totale: t.totale, sconto: t.sconto, cortesia: r.cortesia, azienda: aziendaId, sede: sedeId }, datiTavolo()));
            msg += st.ok ? ' Copia di cortesia stampata.' : ' Copia di cortesia non stampata: ' + (st.errore || 'stampante') + '.';
          }
          if (cliente.email) msg += ' PDF in arrivo a ' + cliente.email + '.';
          const resto = Number($('#cl-ricevuti').value) - dovuto;
          if (metodo === 'contanti' && resto > 0) msg += ' · Resto € ' + (Math.round(resto * 100) / 100).toFixed(2);
          esito.textContent = (avvisoPratica || '') + msg;
          dopoChiusura(r.ok ? 4500 : 8000);
          return;
        }

        esito.textContent = '⏳ Stampo…';
        const doc = await emettiDocumento(Object.assign({
          tipo: incasso.doc,
          righe: righeDocumento(),
          totale: t.totale,
          sconto: t.sconto,
          pagamenti: pagamentiDocumento(metodo, t.totale),
          cliente: cliente || (intest ? { ragione_sociale: intest } : null),
          azienda: aziendaId, sede: sedeId,
        }, datiTavolo()));
        if (!doc.ok) {
          esito.textContent = '⚠️ Incasso registrato ma documento NON stampato: ' + (doc.errore || 'errore sconosciuto') + ' — verifica la stampante.';
        } else {
          const resto = Number($('#cl-ricevuti').value) - dovuto;
          esito.textContent = '✅ Incassato. Scontrino: ' + (doc.numero_documento || 'n/d') + (doc.simulato ? ' (simulato)' : '')
            + (metodo === 'contanti' && resto > 0 ? ' · Resto € ' + (Math.round(resto * 100) / 100).toFixed(2) : '');
        }
        if (avvisoPratica) esito.textContent = avvisoPratica + esito.textContent;
        dopoChiusura(avvisoPratica ? 6000 : 3500);
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
          indirizzo: cliente.indirizzo || null, cap: cliente.cap || null, citta: cliente.citta || null, provincia: cliente.provincia || null,
          email: cliente.email || null,
        };
        if (incasso.cliente?.id) {
          await supabase.from('clienti_fatturazione').update(Object.assign(extra, { updated_at: new Date().toISOString() })).eq('id', incasso.cliente.id);
        } else {
          await supabase.from('clienti_fatturazione').insert(Object.assign({
            azienda_id: aziendaId, partita_iva: cliente.partita_iva, codice_fiscale: cliente.codice_fiscale, fonte: 'manuale',
          }, extra));
        }
      } catch (e) { console.warn('salvaClienteFatturazione', e); }
    }
  }

  // ── SCHEDA SALA ────────────────────────────────────────────────────────
  async function caricaSala() {
    try {
      let qt = supabase.from('tavoli').select('id, nome, sala_id, pos_x, pos_y, forma, coperti_max, attivo').eq('azienda_id', aziendaId).eq('attivo', true);
      if (sedeId) qt = qt.eq('sede_id', sedeId);
      const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
      const [tRes, cRes, zRes] = await Promise.all([
        qt.order('nome'),
        supabase.from('comande').select('id, tavolo_id, coperti, cliente_nome, created_at, totale, stato')
          .eq('azienda_id', aziendaId).in('stato', ['aperta', 'in_corso']),
        supabase.from('coda_fiscale').select('comanda_uuid, tipo_documento, stato, totale, created_at')
          .eq('azienda_id', aziendaId).gte('created_at', oggi.toISOString()),
      ]);
      sala.tavoli = tRes.data || [];
      const idTavoli = new Set(sala.tavoli.map(t => String(t.id)));
      sala.aperte = (cRes.data || []).filter(c => c.tavolo_id && idTavoli.has(String(c.tavolo_id)));
      sala.sale = [...new Set(sala.tavoli.map(t => t.sala_id).filter(Boolean))];
      if (sala.salaSel && !sala.sale.includes(sala.salaSel)) sala.salaSel = null;
      // totali veri dalle righe (comande.totale può essere indietro)
      sala.totali = {};
      const ids = sala.aperte.map(c => c.id);
      if (ids.length) {
        const { data: righe } = await supabase.from('comanda_righe').select('comanda_id, prezzo_snapshot, quantita, stato').in('comanda_id', ids);
        (righe || []).filter(r => r.stato !== 'annullato').forEach(r => {
          sala.totali[r.comanda_id] = (sala.totali[r.comanda_id] || 0) + Number(r.prezzo_snapshot || 0) * Number(r.quantita || 1);
        });
      }
      const docs = zRes.data || [];
      sala.preconti = new Set(docs.filter(d => d.tipo_documento === 'preconto' && d.stato === 'completato' && d.comanda_uuid).map(d => String(d.comanda_uuid)));
      sala.incassatoOggi = docs.filter(d => (d.tipo_documento === 'scontrino' || d.tipo_documento === 'fattura') && d.stato === 'completato')
        .reduce((s, d) => s + Number(d.totale || 0), 0);
      // tavoli chiusi oggi con scontrino finito in errore
      sala.errori = {};
      const errate = docs.filter(d => (d.tipo_documento === 'scontrino' || d.tipo_documento === 'fattura') && d.stato === 'errore' && d.comanda_uuid).map(d => d.comanda_uuid);
      if (errate.length) {
        const { data: ce } = await supabase.from('comande').select('id, tavolo_id').in('id', errate);
        (ce || []).forEach(c => { if (c.tavolo_id) sala.errori[String(c.tavolo_id)] = true; });
      }
      sala.caricato = true;
    } catch (e) {
      console.warn('caricaSala', e);
    }
  }

  function minutiDa(ts) {
    if (!ts) return null;
    const s = String(ts);
    const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + 'Z');
    const m = Math.round((Date.now() - d.getTime()) / 60000);
    return (m >= 0 && m < 24 * 60) ? m : null;
  }

  function renderSala() {
    if (!sala.caricato) {
      container.innerHTML = '<div class="view" style="max-width:1100px;margin:0 auto;">' + barraSchede() + '<p style="color:#64748b;">Carico la sala…</p></div>';
      collegaEventi();
      caricaSala().then(render);
      return;
    }
    const griglia = stretto();   // telefono: griglia come in Comande; tablet/PC: piantina
    const tavoliVis = (sala.salaSel ? sala.tavoli.filter(t => t.sala_id === sala.salaSel) : sala.tavoli).slice()
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'it', { numeric: true }));
    let coperti = 0, daIncassare = 0;
    sala.aperte.forEach(c => { coperti += Number(c.coperti || 0); daIncassare += Number(sala.totali[c.id] || 0); });
    const stile = {
      libero: 'background:#f8fafc;border-color:#e2e8f0;color:#94a3b8;',
      aperto: 'background:#e0f2fe;border-color:#0E5A7A;color:#0E5A7A;',
      preconto: 'background:#fef3c7;border-color:#d97706;color:#92400e;',
      errore: 'background:#fee2e2;border-color:#dc2626;color:#991b1b;',
    };
    const tavoliHtml = tavoliVis.map(t => {
      const c = sala.aperte.find(x => String(x.tavolo_id) === String(t.id));
      let st = 'libero', info = 'libero';
      if (c) {
        const tot = Number(sala.totali[c.id] || 0);
        const min = minutiDa(c.created_at);
        st = sala.preconti.has(String(c.id)) ? 'preconto' : 'aperto';
        info = (c.coperti ? c.coperti + ' pers · ' : '') + '€ ' + tot.toFixed(2)
          + (st === 'preconto' ? '<br>📋 preconto' : (min != null ? '<br>' + (min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) : min + ' min') : ''));
      } else if (sala.errori[String(t.id)]) {
        st = 'errore'; info = '⚠ scontrino<br>non stampato';
      }
      const tondo = String(t.forma || '').toLowerCase().includes('tond') || String(t.forma || '').toLowerCase().includes('rotond');
      const posizione = griglia ? 'position:relative;width:100%;' : 'position:absolute;left:' + (Number(t.pos_x) || 0) + '%;top:' + (Number(t.pos_y) || 0) + '%;width:clamp(64px,10%,104px);';
      return '<button class="cl-tavolo" data-tavolo="' + t.id + '" style="' + posizione
        + 'aspect-ratio:1;border:2px solid;border-radius:' + (tondo && !griglia ? '50%' : '14px') + ';' + stile[st]
        + 'display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:700;font-size:13px;cursor:pointer;padding:4px;line-height:1.2;">'
        + '<span>' + esc(t.nome || '') + '</span><span style="font-size:10px;font-weight:600;">' + info + '</span></button>';
    }).join('');
    const selSala = sala.sale.length > 1
      ? '<select id="cl-sala-sel" style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:8px;"><option value="">Tutte le sale</option>'
        + sala.sale.map((id, i) => '<option value="' + id + '"' + (id === sala.salaSel ? ' selected' : '') + '>Sala ' + (i + 1) + '</option>').join('') + '</select>'
      : '';
    const leg = (st, l) => '<span style="display:inline-flex;align-items:center;gap:6px;"><i style="width:14px;height:14px;border-radius:4px;border:2px solid;display:inline-block;' + stile[st] + '"></i>' + l + '</span>';
    const box = (v, l) => '<div style="background:#fff;border-radius:12px;padding:10px 12px;box-shadow:0 1px 2px rgba(0,0,0,.06);"><b style="font-size:18px;">' + v + '</b><div style="font-size:12px;color:#64748b;">' + l + '</div></div>';
    container.innerHTML = '<div class="view" style="max-width:1100px;margin:0 auto;">' + barraSchede()
      + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">' + selSala
      + '<button id="cl-sala-agg" style="margin-left:auto;border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;">↻ Aggiorna</button></div>'
      + (sala.tavoli.length
          ? (griglia
              ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;">' + tavoliHtml + '</div>'
              : '<div style="position:relative;background:#fff;border-radius:14px;aspect-ratio:4/3;min-height:340px;box-shadow:0 1px 2px rgba(0,0,0,.06);overflow:hidden;">' + tavoliHtml + '</div>')
          : '<div style="background:#fff;border-radius:14px;padding:24px;color:#64748b;">Nessun tavolo per questa sede. Si configurano in Mappa Sala.</div>')
      + '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;margin-top:8px;">'
      + leg('libero', 'Libero') + leg('aperto', 'Aperto') + leg('preconto', 'Preconto stampato') + leg('errore', 'Chiuso, scontrino non stampato') + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:10px;">'
      + box(sala.aperte.length, 'tavoli aperti') + box(coperti, 'coperti in sala')
      + box('€ ' + daIncassare.toFixed(2), 'da incassare') + box('€ ' + sala.incassatoOggi.toFixed(2), 'incassato oggi') + '</div>'
      + '<div id="cl-sala-msg" style="font-size:13px;color:#64748b;margin-top:10px;min-height:18px;">Tocca un tavolo aperto per incassarlo qui.</div>'
      + '</div>';
    collegaEventi();
    const agg = container.querySelector('#cl-sala-agg');
    if (agg) agg.onclick = () => caricaSala().then(render);
    const ss = container.querySelector('#cl-sala-sel');
    if (ss) ss.onchange = () => { sala.salaSel = ss.value || null; render(); };
    container.querySelectorAll('.cl-tavolo').forEach(b => b.onclick = () => apriTavoloInCassa(b.dataset.tavolo));
  }

  // ── Scheda Prenotazioni: pratiche del giorno con acconti (tavoli, preventivi, camere) ──
  async function caricaPratiche() {
    try {
      const r = await supabase.rpc('cassa_pratiche', { p_azienda: aziendaId, p_data: pren.data, p_sede: sedeId });
      pren.lista = Array.isArray(r.data) ? r.data : [];
      pren.errore = r.error ? r.error.message : '';
    } catch (e) { pren.lista = []; pren.errore = String(e && e.message || e); }
    pren.caricato = true;
  }

  function gruppiPratiche() {
    const gruppi = [], idx = {};
    pren.lista.forEach(p => {
      const k = p.origine + '|' + (p.gruppo || p.nome || p.riferimento_id);
      if (!(k in idx)) { idx[k] = gruppi.length; gruppi.push({ nome: p.gruppo || p.nome || '', origine: p.origine, righe: [] }); }
      gruppi[idx[k]].righe.push(p);
    });
    return gruppi;
  }

  function renderPratiche() {
    if (!pren.caricato) {
      container.innerHTML = '<div class="view" style="max-width:1100px;margin:0 auto;">' + barraSchede() + '<p style="color:#64748b;">Carico le prenotazioni…</p></div>';
      collegaEventi();
      caricaPratiche().then(render);
      return;
    }
    const eur = (n) => '€ ' + (Number(n) || 0).toFixed(2);
    const tipoNome = { tavolo: '', preventivo: 'Evento', camera: 'Camera' };
    let tot = 0, pag = 0, res = 0, pers = 0;
    pren.lista.forEach(p => { tot += Number(p.totale) || 0; pag += Number(p.pagato) || 0; res += Number(p.resto) || 0; pers += Number(p.coperti) || 0; });
    const box = (v, l) => '<div style="background:#fff;border-radius:12px;padding:10px 12px;box-shadow:0 1px 2px rgba(0,0,0,.06);"><b style="font-size:18px;">' + v + '</b><div style="font-size:12px;color:#64748b;">' + l + '</div></div>';
    const stato = (p) => {
      if (Number(p.resto) <= 0 && p.conto_chiuso != null) return '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:#dcfce7;color:#166534;">saldato</span>';
      if (p.stato_pagamento === 'bonifico_in_attesa') return '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:#fef3c7;color:#92400e;">bonifico in attesa</span>';
      if (Number(p.pagato) > 0) return '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:#e0f2fe;color:#0E5A7A;">acconto ' + eur(p.pagato) + '</span>';
      return '';
    };
    const gruppi = gruppiPratiche();
    const html = gruppi.map(g => {
      const righe = g.righe.map(p => {
        const chiuso = Number(p.resto) <= 0 && p.conto_chiuso != null;
        const lab = chiuso ? '✓' : (p.comanda_aperta ? 'Riprendi' : 'Apri conto');
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px dashed #e2e8f0;">'
          + '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:14px;">' + esc(p.nome || '') + (tipoNome[p.origine] ? ' <span style="font-size:11px;color:#64748b;">' + tipoNome[p.origine] + '</span>' : '') + '</div>'
          + '<div style="font-size:12px;color:#64748b;">' + (p.coperti ? p.coperti + ' pers · ' : '') + 'totale ' + eur(p.totale) + ' · resto <b style="color:#0f172a;">' + eur(p.resto) + '</b> ' + stato(p) + '</div></div>'
          + '<button class="pr-apri" data-o="' + esc(p.origine) + '" data-r="' + esc(p.riferimento_id) + '" ' + (chiuso ? 'disabled ' : '')
          + 'style="border:none;border-radius:10px;padding:10px 12px;font-weight:700;font-size:13px;cursor:pointer;' + (chiuso ? 'background:#dcfce7;color:#166534;' : 'background:#0E5A7A;color:#fff;') + '">' + lab + '</button></div>';
      }).join('');
      const persG = g.righe.reduce((s, p) => s + (Number(p.coperti) || 0), 0);
      const resG = g.righe.reduce((s, p) => s + (Number(p.resto) || 0), 0);
      return '<div style="background:#fff;border-radius:14px;padding:12px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,.06);">'
        + '<div style="display:flex;align-items:baseline;gap:8px;"><b style="font-size:15px;">' + esc(g.nome) + '</b>'
        + '<span style="font-size:12px;color:#64748b;">' + (g.righe.length > 1 ? g.righe.length + ' prenotazioni · ' : '') + persG + ' pers</span>'
        + '<span style="margin-left:auto;font-size:13px;">resta <b>' + eur(resG) + '</b></span></div>' + righe + '</div>';
    }).join('');
    container.innerHTML = '<div class="view" style="max-width:1100px;margin:0 auto;">' + barraSchede()
      + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">'
      + '<input id="pr-data" type="date" value="' + esc(pren.data) + '" style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:15px;">'
      + '<button id="pr-agg" style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;">↻ Aggiorna</button>'
      + '<button id="pr-stampa" style="margin-left:auto;border:none;background:#0E5A7A;color:#fff;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;">🖨 Stampa resoconto</button></div>'
      + (pren.msg ? '<div style="font-size:13px;margin-bottom:8px;color:#b91c1c;">' + esc(pren.msg) + '</div>' : '')
      + (pren.errore ? '<div style="font-size:13px;margin-bottom:8px;color:#b91c1c;">❌ ' + esc(pren.errore) + '</div>' : '')
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px;">'
      + box(pers, 'persone') + box(eur(tot), 'totale') + box(eur(pag), 'già pagato') + box(eur(res), 'da incassare') + '</div>'
      + (gruppi.length ? html : '<div style="background:#fff;border-radius:14px;padding:24px;color:#64748b;">Nessuna prenotazione con acconto o prezzo concordato per questa data.</div>')
      + '</div>';
    collegaEventi();
    const d = container.querySelector('#pr-data');
    if (d) d.onchange = () => { pren.data = d.value || oggiRoma(); pren.caricato = false; pren.msg = ''; render(); };
    const ag = container.querySelector('#pr-agg');
    if (ag) ag.onclick = () => { pren.caricato = false; pren.msg = ''; render(); };
    const st = container.querySelector('#pr-stampa');
    if (st) st.onclick = stampaResoconto;
    container.querySelectorAll('.pr-apri').forEach(b => b.onclick = () => { if (!b.disabled) { b.textContent = '⏳'; apriPratica(b.dataset.o, b.dataset.r); } });
  }

  // Apre (o riprende) il conto della pratica: riga del prezzo concordato + acconti da scalare
  async function apriPratica(origine, rif) {
    modo = 'pren';
    const r = await supabase.rpc('conto_apri_da_pratica', { p_origine: origine, p_rif: String(rif), p_sede: sedeId });
    if (r.error || !(r.data && r.data.ok)) {
      pren.msg = 'Conto non aperto: ' + ((r.error && r.error.message) || (r.data && r.data.errore) || 'errore');
      pren.caricato = false; render(); return;
    }
    const cid = r.data.comanda_id;
    const [cRes, rRes, sRes] = await Promise.all([
      supabase.from('comande').select('id, tavolo_id, coperti, cliente_nome, created_at, totale, stato').eq('id', cid).maybeSingle(),
      supabase.from('comanda_righe').select('prodotto_vendita_id, nome_snapshot, prezzo_snapshot, quantita, stato').eq('comanda_id', cid),
      supabase.rpc('incasso_situazione', { p_origine: origine, p_rif: String(rif) }),
    ]);
    if (cRes.error || !cRes.data) { pren.msg = 'Conto non letto: ' + ((cRes.error && cRes.error.message) || 'errore'); pren.caricato = false; render(); return; }
    const s = (sRes.data && sRes.data.ok) ? sRes.data : {};
    const pmap = new Map(prodotti.map(p => [String(p.id), p]));
    carrello = (rRes.data || []).filter(x => x.stato !== 'annullato').map(x => {
      const p = pmap.get(String(x.prodotto_vendita_id));
      const q = Number(x.quantita) || 1;
      return { prodotto_id: x.prodotto_vendita_id, nome: x.nome_snapshot, prezzo: Number(x.prezzo_snapshot) || 0, qta: q, qtaComanda: q, aliquota_iva: p ? ivaDi(p) : 10 };
    });
    coupon = null; fidelityCliente = null; pren.msg = '';
    const nome = s.nome || cRes.data.cliente_nome || '';
    tavoloAttivo = { comanda: cRes.data, tavolo: { nome: nome },
      pratica: { origine: origine, rif: String(rif), nome: nome, pagato: Number(s.pagato) || 0, movimenti: s.movimenti || [] } };
    render();
    aggiornaSchermoCliente();
  }

  // Gli extra battuti in cassa finiscono nelle righe del conto (statistiche e scarico magazzino)
  async function salvaExtraPratica() {
    const extra = carrello
      .map(r => ({ prodotto_vendita_id: r.prodotto_id || null, nome: r.nome, prezzo: r.prezzo, quantita: r.qta - (r.qtaComanda || 0) }))
      .filter(r => r.quantita > 0);
    if (!extra.length) return { ok: true };
    const { data, error } = await supabase.rpc('conto_aggiungi_righe', { p_comanda: tavoloAttivo.comanda.id, p_righe: extra });
    return (error || !(data && data.ok)) ? { ok: false, errore: (error && error.message) || (data && data.errore) || 'errore' } : { ok: true };
  }

  // Resoconto della serata: una riga per tavolo/gruppo, totali e incassato per metodo
  async function stampaResoconto() {
    await caricaPratiche();
    const eur = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');
    const perMetodo = {};
    pren.lista.forEach(p => (p.movimenti || []).forEach(m => {
      const k = (m.tipo === 'saldo' ? 'saldo ' : 'acconto ') + (m.metodo || '');
      perMetodo[k] = (perMetodo[k] || 0) + (m.tipo === 'rimborso' ? -1 : 1) * (Number(m.importo) || 0);
    }));
    let tot = 0, pag = 0, res = 0, pers = 0;
    const righe = gruppiPratiche().map(g => {
      const t = g.righe.reduce((s, p) => s + (Number(p.totale) || 0), 0);
      const pg = g.righe.reduce((s, p) => s + (Number(p.pagato) || 0), 0);
      const rs = g.righe.reduce((s, p) => s + (Number(p.resto) || 0), 0);
      const ps = g.righe.reduce((s, p) => s + (Number(p.coperti) || 0), 0);
      const come = [...new Set(g.righe.flatMap(p => (p.movimenti || []).map(m => (m.tipo === 'saldo' ? 'saldo ' : '') + m.metodo)))].join(', ')
        || (g.righe.some(p => p.stato_pagamento === 'bonifico_in_attesa') ? 'bonifico in attesa' : '');
      tot += t; pag += pg; res += rs; pers += ps;
      return '<tr><td>' + esc(g.nome) + (g.righe.length > 1 ? ' <small>(' + g.righe.length + ')</small>' : '') + '</td><td class="n">' + ps + '</td><td class="n">' + eur(t) + '</td><td class="n">' + eur(pg) + '</td><td>' + esc(come) + '</td><td class="n"><b>' + eur(rs) + '</b></td></tr>';
    }).join('');
    const dataIt = pren.data.split('-').reverse().join('/');
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>Resoconto ' + dataIt + '</title><style>'
      + 'body{font:13px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;margin:16px;color:#000}h1{font-size:17px;margin:0 0 4px}'
      + 'table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border-bottom:1px solid #999;padding:5px 4px;text-align:left}td.n,th.n{text-align:right}'
      + 'tfoot td{font-weight:700;border-top:2px solid #000}</style></head><body>'
      + '<h1>Resoconto ' + dataIt + '</h1><div>' + esc(window.state?.sedeAttiva?.nome || window.state?.azienda?.nome || '') + ' · stampato alle ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + '</div>'
      + '<table><thead><tr><th>Tavolo / gruppo</th><th class="n">Pers</th><th class="n">Totale</th><th class="n">Pagato</th><th>Come</th><th class="n">Da incassare</th></tr></thead><tbody>' + righe + '</tbody>'
      + '<tfoot><tr><td>Totale</td><td class="n">' + pers + '</td><td class="n">' + eur(tot) + '</td><td class="n">' + eur(pag) + '</td><td></td><td class="n">' + eur(res) + '</td></tr></tfoot></table>'
      + (Object.keys(perMetodo).length ? '<h1 style="margin-top:16px;">Incassato per metodo</h1><table><tbody>' + Object.keys(perMetodo).sort().map(k => '<tr><td>' + esc(k) + '</td><td class="n">' + eur(perMetodo[k]) + '</td></tr>').join('') + '</tbody></table>' : '')
      + '</body></html>';
    const w = window.open('', '_blank');
    if (!w) { pren.msg = 'Il telefono ha bloccato la finestra di stampa: consenti i popup per questo sito.'; render(); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 300);
  }

  async function apriTavoloInCassa(tavoloId) {
    const msg = container.querySelector('#cl-sala-msg');
    const c = sala.aperte.find(x => String(x.tavolo_id) === String(tavoloId));
    const t = sala.tavoli.find(x => String(x.id) === String(tavoloId));
    if (!c) {
      if (msg) msg.textContent = sala.errori[String(tavoloId)]
        ? '⚠ L\'ultimo conto di ' + (t?.nome || 'questo tavolo') + ' è chiuso ma lo scontrino non è uscito: lo trovi in Chiusura cassa.'
        : (t?.nome || 'Il tavolo') + ' è libero: si apre da Comande.';
      return;
    }
    const { data: righe, error } = await supabase.from('comanda_righe')
      .select('prodotto_vendita_id, nome_snapshot, prezzo_snapshot, quantita, stato').eq('comanda_id', c.id);
    if (error) { if (msg) msg.textContent = '❌ ' + error.message; return; }
    const pmap = new Map(prodotti.map(p => [String(p.id), p]));
    carrello = (righe || []).filter(r => r.stato !== 'annullato').map(r => {
      const p = pmap.get(String(r.prodotto_vendita_id));
      return { prodotto_id: r.prodotto_vendita_id, nome: r.nome_snapshot, prezzo: Number(r.prezzo_snapshot) || 0, qta: Number(r.quantita) || 1, aliquota_iva: p ? ivaDi(p) : 10 };
    });
    if (!carrello.length) { if (msg) msg.textContent = (t?.nome || 'Il tavolo') + ' è aperto ma senza righe.'; return; }
    coupon = null; fidelityCliente = null;
    tavoloAttivo = { comanda: c, tavolo: t };
    render();
    aggiornaSchermoCliente();
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
    const fatt = !!opts.fattura;
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
      canale: nf ? 'cassa_libera_non_fiscale' : fatt ? 'cassa_libera_fattura' : 'cassa_libera',
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
        canale: fatt ? 'cassa_libera_fattura' : 'cassa_libera',
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
