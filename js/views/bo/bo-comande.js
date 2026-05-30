// js/views/bo/bo-comande.js
// Sistema comande completo — tavoli, ordini, up-sell, cross-sell, cucina, cassa

const supa = () => window.supabaseClient || window.supabase;

async function waitForAuth(maxWait = 3000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const s = supa();
    if (s) {
      const { data } = await s.auth.getSession();
      if (data?.session) return true;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

// ── Configurazione up-sell / cross-sell ──
const UPSELL_RULES = {
  'secondi':    { msg: '🥗 Aggiungi un contorno?', cat: 'Contorni' },
  'antipasti':  { msg: '🍷 Abbina un calice di vino?', cat: 'Vini rossi' },
  'primi':      { msg: '💧 Aggiungi acqua naturale o frizzante?', cat: 'Bevande' },
  'dessert':    { msg: '☕ Caffè o amaro per concludere?', cat: 'Caffetteria' },
};

const CROSS_SELL_FINE_PASTO = [
  { msg: '☕ Caffè?', cat: 'Caffetteria' },
  { msg: '🥃 Amaro digestivo?', cat: 'Amari' },
  { msg: '🍰 Dolce?', cat: 'Dolci' },
];

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;
  const ruolo = window.state?.ruolo;

  if (!aziendaId) {
    container.innerHTML = '<section class="view"><h2>Azienda non selezionata</h2></section>';
    return;
  }

  // Aspetta sessione auth prima di fare query
  const authOk = await waitForAuth();
  if (!authOk) {
    container.innerHTML = '<section class="view"><h2>Sessione non disponibile. Ricarica la pagina.</h2></section>';
    return;
  }

  // Stato locale
  let sale = [];
  let tavoli = [];
  let comande = [];
  let prodottiVendita = [];
  let categorieVendita = [];
  let prenotazioniOggi = [];
  let comandaAttiva = null;
  let righeComanda = [];
  let categoriaSelezionata = null;
  let salaSelezionata = null;
  let viewMode = 'tavoli'; // tavoli | comanda | cucina

  // ── Render shell ──
  container.innerHTML = `
    <div class="comande-shell" style="display:flex;flex-direction:column;height:100vh;overflow:hidden;background:#f1f5f9;">

      <!-- Topbar -->
      <div style="background:#0E5A7A;color:white;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="btn-view-tavoli" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;">🪑 Tavoli</button>
          <button id="btn-view-cucina" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:13px;">👨‍🍳 Cucina</button>
        </div>
        <div style="font-size:13px;opacity:0.85;" id="top-sede">${window.state?.sedeAttiva?.nome || 'Tutte le sedi'}</div>
        <div style="display:flex;gap:8px;">
          <button id="btn-refresh" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:6px 10px;border-radius:8px;cursor:pointer;">🔄</button>
          <div id="top-ora" style="font-size:13px;opacity:0.85;padding:6px 0;"></div>
        </div>
      </div>

      <!-- Body -->
      <div style="flex:1;overflow:hidden;display:flex;">

        <!-- Vista tavoli -->
        <div id="view-tavoli" style="flex:1;overflow-y:auto;padding:16px;">
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
            <div id="sale-tabs" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
            <button id="btn-nuova-sala" style="padding:6px 12px;background:#e2e8f0;border:none;border-radius:8px;cursor:pointer;font-size:12px;">+ Sala</button>
            <button id="btn-nuovo-tavolo" style="padding:6px 12px;background:#e2e8f0;border:none;border-radius:8px;cursor:pointer;font-size:12px;">+ Tavolo</button>
          </div>
          <div id="mappa-tavoli" style="display:flex;flex-wrap:wrap;gap:12px;"></div>
        </div>

        <!-- Vista comanda -->
        <div id="view-comanda" style="flex:1;overflow:hidden;display:none;flex-direction:column;">

          <!-- Header comanda -->
          <div style="background:white;border-bottom:1px solid #e5e7eb;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:10px;">
              <button id="btn-back-tavoli" style="background:#f1f5f9;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;">← Tavoli</button>
              <div>
                <strong id="comanda-tavolo-nome" style="font-size:16px;">Tavolo</strong>
                <div id="comanda-cliente-info" style="font-size:12px;color:#64748b;"></div>
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              <button id="btn-invia-cucina" style="background:#16a34a;color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;">📤 Invia cucina</button>
              <button id="btn-preconto" style="background:#f59e0b;color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;">🧾 Preconto</button>
              <button id="btn-chiudi-comanda" style="background:#dc2626;color:white;border:none;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;">✅ Chiudi</button>
            </div>
          </div>

          <!-- Body comanda: prodotti + righe -->
          <div style="flex:1;overflow:hidden;display:grid;grid-template-columns:1fr 340px;">

            <!-- Selezione prodotti -->
            <div style="overflow:hidden;display:flex;flex-direction:column;border-right:1px solid #e5e7eb;">

              <!-- Categorie -->
              <div style="overflow-x:auto;white-space:nowrap;padding:8px 12px;background:white;border-bottom:1px solid #e5e7eb;flex-shrink:0;" id="cat-tabs"></div>

              <!-- Cerca prodotto -->
              <div style="padding:8px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb;flex-shrink:0;">
                <input id="search-prodotto" class="input" placeholder="🔍 Cerca prodotto..." style="width:100%;box-sizing:border-box;">
              </div>

              <!-- Griglia prodotti -->
              <div id="griglia-prodotti" style="flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;align-content:start;"></div>

              <!-- Up-sell banner -->
              <div id="upsell-banner" style="display:none;padding:10px 12px;background:#fef3c7;border-top:1px solid #fcd34d;">
                <div style="font-size:13px;font-weight:500;color:#92400e;" id="upsell-msg"></div>
                <div style="display:flex;gap:6px;margin-top:6px;overflow-x:auto;" id="upsell-prodotti"></div>
              </div>
            </div>

            <!-- Righe comanda + totale -->
            <div style="overflow:hidden;display:flex;flex-direction:column;background:white;">

              <!-- Note coperti -->
              <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb;display:flex;gap:8px;align-items:center;flex-shrink:0;">
                <div style="font-size:13px;color:#64748b;">Coperti:</div>
                <input id="comanda-coperti" type="number" min="1" max="30" value="2" style="width:60px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;">
                <input id="comanda-note" class="input" placeholder="Note tavolo..." style="flex:1;font-size:13px;">
              </div>

              <!-- Lista righe -->
              <div id="righe-comanda" style="flex:1;overflow-y:auto;padding:8px;"></div>

              <!-- Totale + azioni -->
              <div style="border-top:1px solid #e5e7eb;padding:12px;flex-shrink:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <strong style="font-size:16px;">Totale</strong>
                  <strong style="font-size:20px;color:#0E5A7A;" id="comanda-totale">€ 0,00</strong>
                </div>
                <!-- Cross-sell fine pasto -->
                <div id="crosssell-box" style="display:none;margin-bottom:10px;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Vista cucina -->
        <div id="view-cucina" style="flex:1;overflow-y:auto;padding:16px;display:none;">
          <h3 style="margin:0 0 12px;">👨‍🍳 Display cucina</h3>
          <div id="cucina-righe" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;"></div>
        </div>

      </div>
    </div>
  `;

  // ── Orologio ──
  function aggiornaOra() {
    const el = container.querySelector('#top-ora');
    if (el) el.textContent = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  aggiornaOra();
  setInterval(aggiornaOra, 30000);

  // ── Carica dati ──
  async function loadAll() {
    await Promise.all([
      loadSale(),
      loadTavoli(),
      loadComande(),
      loadProdotti(),
      loadCategorie(),
      loadPrenotazioniOggi(),
    ]);
    renderSaleTabs();
    renderMapTavoli();
  }

  async function loadSale() {
    let q = supa().from('sale').select('*').eq('azienda_id', aziendaId);
    if (sedeId) q = q.eq('sede_id', sedeId);
    const { data } = await q.order('nome');
    sale = data || [];
  }

  async function loadTavoli() {
    let q = supa().from('tavoli').select('*').eq('azienda_id', aziendaId);
    if (sedeId) q = q.eq('sede_id', sedeId);
    if (salaSelezionata) q = q.eq('sala_id', salaSelezionata);
    const { data } = await q.order('nome');
    tavoli = data || [];
  }

  async function loadComande() {
    const { data } = await supa()
      .from('comande')
      .select('*')
      .eq('azienda_id', aziendaId)
      .neq('stato', 'chiusa')
      .order('created_at', { ascending: false });
    comande = data || [];
  }

  async function loadProdotti() {
    let q = supa().from('prodotti_vendita').select('*').eq('azienda_id', aziendaId);
    if (sedeId) q = q.eq('sede_id', sedeId);
    const { data } = await q.order('nome');
    prodottiVendita = data || [];
  }

  async function loadCategorie() {
    const { data } = await supa().from('categorie_vendita').select('*').eq('azienda_id', aziendaId).order('nome');
    categorieVendita = data || [];
  }

  async function loadPrenotazioniOggi() {
    const oggi = new Date().toISOString().slice(0, 10);
    const { data } = await supa()
      .from('prenotazioni_tavoli')
      .select('*')
      .eq('azienda_id', aziendaId)
      .eq('data', oggi)
      .in('stato', ['confermata', 'arrivata']);
    prenotazioniOggi = data || [];
  }

  async function loadRigheComanda(comandaId) {
    const { data } = await supa()
      .from('comanda_righe')
      .select('*')
      .eq('comanda_id', comandaId)
      .order('created_at');
    righeComanda = data || [];
  }

  // ── Render sale tabs ──
  function renderSaleTabs() {
    const box = container.querySelector('#sale-tabs');
    const all = [{ id: null, nome: 'Tutte' }, ...sale];
    box.innerHTML = all.map(s => `
      <button data-sala="${s.id || ''}" style="
        padding:6px 14px;border:none;border-radius:8px;cursor:pointer;font-size:13px;
        background:${salaSelezionata === s.id ? '#0E5A7A' : '#e2e8f0'};
        color:${salaSelezionata === s.id ? 'white' : '#374151'};
      ">${esc(s.nome)}</button>
    `).join('');

    box.querySelectorAll('[data-sala]').forEach(btn => {
      btn.onclick = async () => {
        salaSelezionata = btn.dataset.sala || null;
        await loadTavoli();
        renderSaleTabs();
        renderMapTavoli();
      };
    });
  }

  // ── Render mappa tavoli ──
  function renderMapTavoli() {
    const box = container.querySelector('#mappa-tavoli');
    if (!tavoli.length) {
      box.innerHTML = `<div style="color:#64748b;padding:20px;">Nessun tavolo configurato. Clicca "+ Tavolo" per aggiungerne uno.</div>`;
      return;
    }

    box.innerHTML = tavoli.map(t => {
      const comanda = comande.find(c => String(c.tavolo_id) === String(t.id));
      const prenotazione = prenotazioniOggi.find(p => String(p.tavolo_id) === String(t.id));
      const isOccupato = !!comanda;
      const haPrenotazione = !!prenotazione && !isOccupato;

      return `
        <button data-tavolo="${t.id}" style="
          width:120px;height:120px;
          border-radius:16px;
          border:3px solid ${isOccupato ? '#dc2626' : haPrenotazione ? '#f59e0b' : '#22c55e'};
          background:${isOccupato ? '#fee2e2' : haPrenotazione ? '#fef3c7' : '#f0fdf4'};
          cursor:pointer;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
          transition:transform 0.1s;
          padding:8px;
        ">
          <div style="font-size:28px;">${isOccupato ? '🔴' : haPrenotazione ? '🟡' : '🟢'}</div>
          <strong style="font-size:14px;">${esc(t.nome)}</strong>
          <div style="font-size:11px;color:#64748b;">${t.coperti_max || ''} coperti</div>
          ${isOccupato ? `<div style="font-size:11px;color:#dc2626;">€${Number(comanda.totale||0).toFixed(2)}</div>` : ''}
          ${haPrenotazione ? `<div style="font-size:11px;color:#92400e;">${esc(prenotazione.cliente_nome||'')}</div>` : ''}
        </button>
      `;
    }).join('');

    box.querySelectorAll('[data-tavolo]').forEach(btn => {
      btn.onclick = () => apriComanda(btn.dataset.tavolo);
    });
  }

  // ── Apri comanda ──
  async function apriComanda(tavoloId) {
    const tavolo = tavoli.find(t => String(t.id) === String(tavoloId));
    if (!tavolo) return;

    // Cerca comanda aperta
    let comanda = comande.find(c => String(c.tavolo_id) === String(tavoloId));

    if (!comanda) {
      // Crea nuova comanda
      const prenotazione = prenotazioniOggi.find(p => String(p.tavolo_id) === String(tavoloId));
      const { data, error } = await supa().from('comande').insert({
        azienda_id: aziendaId,
        sede_id: sedeId,
        tavolo_id: tavoloId,
        stato: 'aperta',
        totale: 0,
        coperti: prenotazione?.coperti || tavolo.coperti_min || 1,
        prenotazione_id: prenotazione?.id || null,
        cliente_id: prenotazione?.cliente_id || null,
      }).select('*').single();

      if (error) { alert('Errore apertura comanda'); return; }
      comanda = data;
      comande.push(comanda);
    }

    comandaAttiva = comanda;
    await loadRigheComanda(comanda.id);

    // Mostra info cliente se c'è prenotazione
    const prenotazione = prenotazioniOggi.find(p => String(p.tavolo_id) === String(tavoloId));
    const clienteInfo = container.querySelector('#comanda-cliente-info');
    if (prenotazione && clienteInfo) {
      clienteInfo.textContent = `${prenotazione.cliente_nome || ''} — ${prenotazione.coperti || ''} coperti — ${prenotazione.ora || ''}`;
    } else if (clienteInfo) {
      clienteInfo.textContent = '';
    }

    container.querySelector('#comanda-tavolo-nome').textContent = tavolo.nome;
    container.querySelector('#comanda-coperti').value = comanda.coperti || 2;
    container.querySelector('#comanda-note').value = comanda.note || '';

    switchView('comanda');
    categoriaSelezionata = null;
    renderCategorieTabs();
    renderGrigliaProdotti();
    renderRighe();
    renderTotale();
  }

  // ── Render categorie tabs ──
  function renderCategorieTabs() {
    const box = container.querySelector('#cat-tabs');
    const all = [{ id: null, nome: 'Tutti' }, ...categorieVendita];
    box.innerHTML = all.map(c => `
      <button data-cat="${c.id || ''}" style="
        display:inline-block;padding:8px 14px;margin-right:4px;
        border:none;border-radius:8px;cursor:pointer;font-size:13px;
        background:${String(categoriaSelezionata) === String(c.id) ? '#0E5A7A' : '#f1f5f9'};
        color:${String(categoriaSelezionata) === String(c.id) ? 'white' : '#374151'};
        white-space:nowrap;
      ">${esc(c.nome)}</button>
    `).join('');

    box.querySelectorAll('[data-cat]').forEach(btn => {
      btn.onclick = () => {
        categoriaSelezionata = btn.dataset.cat || null;
        renderCategorieTabs();
        renderGrigliaProdotti();
      };
    });
  }

  // ── Render griglia prodotti ──
  function renderGrigliaProdotti(searchTerm = '') {
    const box = container.querySelector('#griglia-prodotti');
    let list = prodottiVendita;

    if (categoriaSelezionata) {
      list = list.filter(p => String(p.categoria_vendita_id) === String(categoriaSelezionata));
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => (p.nome || '').toLowerCase().includes(q));
    }

    if (!list.length) {
      box.innerHTML = `<div style="color:#64748b;font-size:13px;grid-column:1/-1;">Nessun prodotto.</div>`;
      return;
    }

    box.innerHTML = list.map(p => `
      <button data-prodotto="${p.id}" style="
        background:white;border:1px solid #e5e7eb;border-radius:12px;
        padding:12px 8px;cursor:pointer;text-align:center;
        display:flex;flex-direction:column;align-items:center;gap:6px;
        transition:background 0.1s;
        ${!p.disponibile ? 'opacity:0.4;pointer-events:none;' : ''}
      ">
        ${p.foto_url ? `<img src="${p.foto_url}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">` : '<div style="font-size:32px;">🍽️</div>'}
        <div style="font-size:12px;font-weight:600;line-height:1.3;color:#0f172a;">${esc(p.nome)}</div>
        <div style="font-size:13px;color:#0E5A7A;font-weight:700;">€${Number(p.prezzo_base||0).toFixed(2).replace('.',',')}</div>
      </button>
    `).join('');

    box.querySelectorAll('[data-prodotto]').forEach(btn => {
      btn.onclick = () => aggiungiProdotto(btn.dataset.prodotto);
    });
  }

  // ── Aggiungi prodotto alla comanda ──
  async function aggiungiProdotto(prodottoId) {
    if (!comandaAttiva) return;
    const prodotto = prodottiVendita.find(p => String(p.id) === String(prodottoId));
    if (!prodotto) return;

    // Cerca riga esistente non ancora inviata
    const rigaEsistente = righeComanda.find(r =>
      String(r.prodotto_vendita_id) === String(prodottoId) && r.stato === 'in_attesa'
    );

    if (rigaEsistente) {
      // Incrementa quantità
      const { error } = await supa()
        .from('comanda_righe')
        .update({ quantita: rigaEsistente.quantita + 1 })
        .eq('id', rigaEsistente.id);
      if (!error) rigaEsistente.quantita += 1;
    } else {
      // Determina stampante in base alla categoria
      const cat = categorieVendita.find(c => String(c.id) === String(prodotto.categoria_vendita_id));
      const catNome = (cat?.nome || '').toLowerCase();
      const stampante = ['bevande','vini rossi','vini bianchi','le bollicine','amari','caffetteria'].some(c => catNome.includes(c)) ? 'bar' : 'cucina';

      const { data, error } = await supa().from('comanda_righe').insert({
        azienda_id: aziendaId,
        comanda_id: comandaAttiva.id,
        prodotto_vendita_id: prodotto.id,
        nome_snapshot: prodotto.nome,
        prezzo_snapshot: prodotto.prezzo_base || 0,
        quantita: 1,
        stato: 'in_attesa',
        stampante,
      }).select('*').single();

      if (!error && data) righeComanda.push(data);
    }

    await aggiornaTotale();
    renderRighe();
    renderTotale();
    checkUpsell(prodotto);
    checkCrossSell();
  }

  // ── Aggiorna totale comanda ──
  async function aggiornaTotale() {
    const totale = righeComanda
      .filter(r => r.stato !== 'annullato')
      .reduce((s, r) => s + (Number(r.prezzo_snapshot || 0) * Number(r.quantita || 1)), 0);

    await supa().from('comande').update({ totale }).eq('id', comandaAttiva.id);
    comandaAttiva.totale = totale;
  }

  // ── Render righe comanda ──
  function renderRighe() {
    const box = container.querySelector('#righe-comanda');
    const righeAttive = righeComanda.filter(r => r.stato !== 'annullato');

    if (!righeAttive.length) {
      box.innerHTML = `<div style="color:#94a3b8;text-align:center;padding:30px;font-size:13px;">Nessun prodotto aggiunto</div>`;
      return;
    }

    box.innerHTML = righeAttive.map(r => {
      const statoColori = {
        'in_attesa': '#64748b',
        'in_preparazione': '#f59e0b',
        'pronto': '#16a34a',
        'servito': '#94a3b8',
      };
      const statoLabel = {
        'in_attesa': '⏳',
        'in_preparazione': '🔥',
        'pronto': '✅',
        'servito': '🍽️',
      };

      return `
        <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #f1f5f9;" data-riga="${r.id}">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:500;color:#0f172a;">${esc(r.nome_snapshot)}</div>
            ${r.note ? `<div style="font-size:11px;color:#64748b;">${esc(r.note)}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
            <button data-decr="${r.id}" style="width:24px;height:24px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;">−</button>
            <span style="min-width:20px;text-align:center;font-size:14px;font-weight:600;">${r.quantita}</span>
            <button data-incr="${r.id}" style="width:24px;height:24px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;">+</button>
          </div>
          <div style="font-size:13px;font-weight:600;color:#0E5A7A;min-width:52px;text-align:right;">
            €${(Number(r.prezzo_snapshot||0)*Number(r.quantita||1)).toFixed(2).replace('.',',')}
          </div>
          <span style="color:${statoColori[r.stato]||'#64748b'};font-size:16px;" title="${r.stato}">${statoLabel[r.stato]||'⏳'}</span>
          <button data-note-riga="${r.id}" style="background:#f1f5f9;border:none;border-radius:6px;padding:4px 6px;cursor:pointer;font-size:11px;">📝</button>
          <button data-annulla="${r.id}" style="background:#fee2e2;border:none;border-radius:6px;padding:4px 6px;cursor:pointer;font-size:11px;color:#dc2626;">✕</button>
        </div>
      `;
    }).join('');

    // Binding bottoni
    box.querySelectorAll('[data-incr]').forEach(btn => {
      btn.onclick = () => cambiaQuantita(btn.dataset.incr, 1);
    });
    box.querySelectorAll('[data-decr]').forEach(btn => {
      btn.onclick = () => cambiaQuantita(btn.dataset.decr, -1);
    });
    box.querySelectorAll('[data-annulla]').forEach(btn => {
      btn.onclick = () => annullaRiga(btn.dataset.annulla);
    });
    box.querySelectorAll('[data-note-riga]').forEach(btn => {
      btn.onclick = () => aggiungiNoteRiga(btn.dataset.noteRiga);
    });
  }

  async function cambiaQuantita(rigaId, delta) {
    const riga = righeComanda.find(r => String(r.id) === String(rigaId));
    if (!riga) return;
    const nuova = riga.quantita + delta;
    if (nuova <= 0) { annullaRiga(rigaId); return; }
    await supa().from('comanda_righe').update({ quantita: nuova }).eq('id', rigaId);
    riga.quantita = nuova;
    await aggiornaTotale();
    renderRighe();
    renderTotale();
  }

  async function annullaRiga(rigaId) {
    await supa().from('comanda_righe').update({ stato: 'annullato' }).eq('id', rigaId);
    const riga = righeComanda.find(r => String(r.id) === String(rigaId));
    if (riga) riga.stato = 'annullato';
    await aggiornaTotale();
    renderRighe();
    renderTotale();
  }

  async function aggiungiNoteRiga(rigaId) {
    const riga = righeComanda.find(r => String(r.id) === String(rigaId));
    if (!riga) return;
    const nota = prompt('Note per questo piatto:', riga.note || '');
    if (nota === null) return;
    await supa().from('comanda_righe').update({ note: nota }).eq('id', rigaId);
    riga.note = nota;
    renderRighe();
  }

  function renderTotale() {
    const totale = righeComanda
      .filter(r => r.stato !== 'annullato')
      .reduce((s, r) => s + (Number(r.prezzo_snapshot||0) * Number(r.quantita||1)), 0);
    container.querySelector('#comanda-totale').textContent = `€ ${totale.toFixed(2).replace('.',',')}`;
  }

  // ── Up-sell ──
  function checkUpsell(prodottoAggiunto) {
    const cat = categorieVendita.find(c => String(c.id) === String(prodottoAggiunto.categoria_vendita_id));
    if (!cat) return;
    const catNome = (cat.nome || '').toLowerCase();
    const rule = Object.entries(UPSELL_RULES).find(([k]) => catNome.includes(k));
    if (!rule) { nascondiUpsell(); return; }

    const [, { msg, cat: catTarget }] = rule;
    const catObj = categorieVendita.find(c => c.nome === catTarget);
    if (!catObj) { nascondiUpsell(); return; }

    const suggeriti = prodottiVendita
      .filter(p => String(p.categoria_vendita_id) === String(catObj.id))
      .slice(0, 4);

    if (!suggeriti.length) { nascondiUpsell(); return; }

    const banner = container.querySelector('#upsell-banner');
    const msgEl = container.querySelector('#upsell-msg');
    const prodEl = container.querySelector('#upsell-prodotti');

    msgEl.textContent = msg;
    prodEl.innerHTML = suggeriti.map(p => `
      <button data-up="${p.id}" style="
        background:white;border:1px solid #fcd34d;border-radius:10px;
        padding:6px 10px;cursor:pointer;font-size:12px;white-space:nowrap;
      ">
        ${esc(p.nome)} €${Number(p.prezzo_base||0).toFixed(2).replace('.',',')}
      </button>
    `).join('');

    prodEl.querySelectorAll('[data-up]').forEach(btn => {
      btn.onclick = () => { aggiungiProdotto(btn.dataset.up); nascondiUpsell(); };
    });

    banner.style.display = 'block';
    setTimeout(nascondiUpsell, 8000);
  }

  function nascondiUpsell() {
    const banner = container.querySelector('#upsell-banner');
    if (banner) banner.style.display = 'none';
  }

  // ── Cross-sell fine pasto ──
  function checkCrossSell() {
    const haSecondo = righeComanda.some(r => {
      const p = prodottiVendita.find(x => String(x.id) === String(r.prodotto_vendita_id));
      const cat = categorieVendita.find(c => String(c.id) === String(p?.categoria_vendita_id));
      return cat && (cat.nome === 'Secondi piatti' || cat.nome === 'La Griglia');
    });

    if (!haSecondo) return;

    const box = container.querySelector('#crosssell-box');
    box.style.display = 'block';
    box.innerHTML = `
      <div style="font-size:12px;color:#64748b;margin-bottom:6px;">Completa il pasto:</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${CROSS_SELL_FINE_PASTO.map(cs => {
          const catObj = categorieVendita.find(c => c.nome === cs.cat);
          if (!catObj) return '';
          return `<button data-cs="${catObj.id}" style="
            background:#f0fdf4;border:1px solid #86efac;border-radius:8px;
            padding:5px 10px;cursor:pointer;font-size:12px;
          ">${cs.msg}</button>`;
        }).join('')}
      </div>
    `;

    box.querySelectorAll('[data-cs]').forEach(btn => {
      btn.onclick = () => {
        categoriaSelezionata = btn.dataset.cs;
        renderCategorieTabs();
        renderGrigliaProdotti();
      };
    });
  }

  // ── Invia in cucina ──
  async function inviaInCucina() {
    const righeNuove = righeComanda.filter(r => r.stato === 'in_attesa');
    if (!righeNuove.length) { alert('Nessun prodotto da inviare.'); return; }

    for (const r of righeNuove) {
      await supa().from('comanda_righe').update({ stato: 'in_preparazione' }).eq('id', r.id);
      r.stato = 'in_preparazione';
    }

    await supa().from('comande').update({ stato: 'in_corso' }).eq('id', comandaAttiva.id);
    comandaAttiva.stato = 'in_corso';

    renderRighe();
    alert(`✅ ${righeNuove.length} piatti inviati in cucina!`);
  }

  // ── Preconto ──
  function mostraPreconto() {
    const righeAttive = righeComanda.filter(r => r.stato !== 'annullato');
    const totale = righeAttive.reduce((s, r) => s + (Number(r.prezzo_snapshot||0) * Number(r.quantita||1)), 0);

    const testo = righeAttive.map(r =>
      `${r.quantita}x ${r.nome_snapshot} — €${(Number(r.prezzo_snapshot||0)*Number(r.quantita||1)).toFixed(2)}`
    ).join('\n');

    alert(`📋 PRECONTO\n\n${testo}\n\n──────────\nTOTALE: €${totale.toFixed(2)}`);
  }

  // ── Chiudi comanda ──
  async function chiudiComanda() {
    if (!comandaAttiva) return;
    if (!confirm('Chiudere la comanda e liberare il tavolo?')) return;

    await supa().from('comande').update({
      stato: 'chiusa',
      chiusa_at: new Date().toISOString(),
    }).eq('id', comandaAttiva.id);

    comande = comande.filter(c => String(c.id) !== String(comandaAttiva.id));
    comandaAttiva = null;
    righeComanda = [];

    switchView('tavoli');
    await loadComande();
    renderMapTavoli();
  }

  // ── Vista cucina ──
  async function loadCucinaDisplay() {
    const { data } = await supa()
      .from('comanda_righe')
      .select('*, comande(tavoli(nome))')
      .eq('azienda_id', aziendaId)
      .or('stato.eq.in_preparazione,stato.eq.pronto')
      .eq('stampante', 'cucina')
      .order('created_at');

    const box = container.querySelector('#cucina-righe');
    if (!data?.length) {
      box.innerHTML = '<div style="color:#64748b;">Nessun ordine in cucina.</div>';
      return;
    }

    box.innerHTML = data.map(r => `
      <div style="background:white;border-radius:12px;padding:14px;border-left:4px solid ${r.stato==='pronto'?'#16a34a':'#f59e0b'};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:15px;">${esc(r.nome_snapshot)}</strong>
          <span style="background:${r.stato==='pronto'?'#f0fdf4':'#fef3c7'};padding:3px 8px;border-radius:6px;font-size:12px;">
            ${r.stato === 'pronto' ? '✅ Pronto' : '🔥 In prep.'}
          </span>
        </div>
        <div style="font-size:13px;color:#64748b;">
          Tavolo: <strong>${r.comande?.tavoli?.nome || '?'}</strong> — Qtà: <strong>${r.quantita}</strong>
          ${r.note ? `— Note: ${esc(r.note)}` : ''}
        </div>
        <div style="margin-top:8px;display:flex;gap:6px;">
          ${r.stato === 'in_preparazione' ? `
            <button data-pronto="${r.id}" style="background:#16a34a;color:white;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;">✅ Pronto</button>
          ` : `
            <button data-servito="${r.id}" style="background:#64748b;color:white;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;">🍽️ Servito</button>
          `}
        </div>
      </div>
    `).join('');

    box.querySelectorAll('[data-pronto]').forEach(btn => {
      btn.onclick = async () => {
        await supa().from('comanda_righe').update({ stato: 'pronto' }).eq('id', btn.dataset.pronto);
        loadCucinaDisplay();
      };
    });
    box.querySelectorAll('[data-servito]').forEach(btn => {
      btn.onclick = async () => {
        await supa().from('comanda_righe').update({ stato: 'servito' }).eq('id', btn.dataset.servito);
        loadCucinaDisplay();
      };
    });
  }

  // ── Crea sala ──
  async function creaNuovaSala() {
    const nome = prompt('Nome sala (es. Interno, Terrazza, Privé):');
    if (!nome?.trim()) return;
    const { data } = await supa().from('sale').insert({
      azienda_id: aziendaId,
      sede_id: sedeId,
      nome: nome.trim(),
      attiva: true,
    }).select('*').single();
    if (data) { sale.push(data); renderSaleTabs(); }
  }

  // ── Crea tavolo ──
  async function creaNuovoTavolo() {
    const nome = prompt('Numero/nome tavolo:');
    if (!nome?.trim()) return;
    const coperti = parseInt(prompt('Coperti massimi:', '4') || '4');
    const { data } = await supa().from('tavoli').insert({
      azienda_id: aziendaId,
      sede_id: sedeId,
      sala_id: salaSelezionata || sale[0]?.id || null,
      nome: nome.trim(),
      coperti_min: 1,
      coperti_max: coperti,
      attivo: true,
    }).select('*').single();
    if (data) { tavoli.push(data); renderMapTavoli(); }
  }

  // ── Switch view ──
  function switchView(view) {
    viewMode = view;
    container.querySelector('#view-tavoli').style.display = view === 'tavoli' ? 'block' : 'none';
    container.querySelector('#view-comanda').style.display = view === 'comanda' ? 'flex' : 'none';
    container.querySelector('#view-cucina').style.display = view === 'cucina' ? 'block' : 'none';
  }

  // ── Binding eventi topbar ──
  container.querySelector('#btn-view-tavoli').onclick = () => switchView('tavoli');
  container.querySelector('#btn-view-cucina').onclick = () => { switchView('cucina'); loadCucinaDisplay(); };
  container.querySelector('#btn-refresh').onclick = () => loadAll();
  container.querySelector('#btn-back-tavoli').onclick = () => switchView('tavoli');
  container.querySelector('#btn-invia-cucina').onclick = () => inviaInCucina();
  container.querySelector('#btn-preconto').onclick = () => mostraPreconto();
  container.querySelector('#btn-chiudi-comanda').onclick = () => chiudiComanda();
  container.querySelector('#btn-nuova-sala').onclick = () => creaNuovaSala();
  container.querySelector('#btn-nuovo-tavolo').onclick = () => creaNuovoTavolo();

  container.querySelector('#search-prodotto').addEventListener('input', e => {
    renderGrigliaProdotti(e.target.value);
  });

  // ── Auto-refresh cucina ogni 30s ──
  setInterval(() => {
    if (viewMode === 'cucina') loadCucinaDisplay();
    else if (viewMode === 'tavoli') { loadComande().then(renderMapTavoli); }
  }, 30000);

  // ── Start ──
  await loadAll();
}

function esc(s) {
  return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
}
