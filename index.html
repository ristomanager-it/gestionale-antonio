// app.js - VERSIONE RIORGANIZZATA
// Assistente Gestionale Antonio - file completo con modulo Preventivi integrato
// Struttura a blocchi per facilitare interventi: [0] Riferimenti DOM, [1] Stato/let, [2] Utility, [3] Supabase, [4] Routing/Visibilità, [5] Autenticazione/Login,
// [6] Dipendenti, [7] Timbrature, [8] Ricette, [9] Acquisti/Fatture, [10] Magazzino, [11] Preventivi, [12] Init

/* ==========================================================
   [0] RIFERIMENTI DOM (principali / comuni)
   ========================================================== */

const views = Array.from(document.querySelectorAll('.view'));
const loginView = document.getElementById('view-login');
const homeDipView = document.getElementById('view-home-dip');
const managerMenu = document.getElementById('manager-menu');
const routeButtons = Array.from(document.querySelectorAll('[data-route]'));

// header
const btnTheme = document.getElementById('btn-theme');
const currentUserLabel = document.getElementById('current-user-label');
const btnLogout = document.getElementById('btn-logout');

// login
const loginNomeInput = document.getElementById('login-nome');
const loginPinInput = document.getElementById('login-pin');
const loginRememberInput = document.getElementById('login-remember');
const btnLogin = document.getElementById('btn-login');

// timbratura (esempio)
const timbUtenteNomeEl = document.getElementById('timbratura-utente-nome');
const timbCanaleSelect = document.getElementById('timbratura-canale-select');
const btnEntra = document.getElementById('btn-entra');
const btnPausa = document.getElementById('btn-pausa');
const btnEsci = document.getElementById('btn-esci');

// dipendenti
const dipLista = document.getElementById('dipendenti-lista');

// acquisti / fatture
const fatturaRigheBody = document.getElementById('fattura-righe-body');

// magazzino (solo riferimenti di esempio)
const magazzinoListaEl = document.getElementById('magazzino-lista');

// RICETTE viewer
const ricetteSearchInput = document.getElementById('ricette-search');

// ====== PREVENTIVI (blocchi DOM forniti dall'utente) ======
const prevClienteNome = document.getElementById('prev-cliente-nome');
const prevContattiList = document.getElementById('prev-contatti-list');
const prevClienteEmail = document.getElementById('prev-cliente-email');
const prevClienteTelefono = document.getElementById('prev-cliente-telefono');
const prevAddContattoBtn = document.getElementById('prev-add-contatto');

const prevTitolo = document.getElementById('prev-titolo');
const prevTipoServizio = document.getElementById('prev-tipo-servizio');
const prevDataEvento = document.getElementById('prev-data-evento');
const prevNInvitati = document.getElementById('prev-n-invitati');
const prevLocation = document.getElementById('prev-location');
const prevNote = document.getElementById('prev-note');

const prevPiattiContainer = document.getElementById('prev-piatti-container');
const prevPiattiSuggestions = document.getElementById('prev-piatti-suggestions');
const prevAddPiattoBtn = document.getElementById('prev-add-piatto');

const prevExtraContainer = document.getElementById('prev-extra-container');
const prevExtraSuggestions = document.getElementById('prev-extra-suggestions');
const prevAddExtraBtn = document.getElementById('prev-add-extra');

const prevTotalePiatti = document.getElementById('prev-totale-piatti');
const prevTotaleExtra = document.getElementById('prev-totale-extra');
const prevTotale = document.getElementById('prev-totale');
const prevTotalePP = document.getElementById('prev-totale-pp');

const prevStato = document.getElementById('prev-stato');
const prevAccontoCard = document.getElementById('prev-acconto-card');
const prevAcconto = document.getElementById('prev-acconto');
const prevSaldo = document.getElementById('prev-saldo');
const prevGeneraPrenotazione = document.getElementById('prev-genera-prenotazione');

const prevSalvaBtn = document.getElementById('prev-salva');
const prevStampaBtn = document.getElementById('prev-stampa');
const prevEmailBtn = document.getElementById('prev-email');
const prevApriPrenotazioneBtn = document.getElementById('prev-apri-prenotazione');

const prevLista = document.getElementById('prev-lista');

/* ==========================================================
   [1] STATO / VARIABILI GLOBALI
   ========================================================== */
let dipendenti = [];
let timbrature = [];
let currentUser = null;
let periodoCorrente = 'oggi';

// Ricette / magazzino cache
let ricetteCache = [];
let magazzinoDati = [];

// Preventivi state
let preventivoCorrenteId = null;
let contattiCache = [];
let ricetteCachePreventivi = [];
let serviziExtraCatalogo = [];

/* ==========================================================
   [2] UTILITY GENERICHE
   ========================================================== */
function parseNumber(val) {
  if (val == null) return 0;
  const str = String(val).replace(',', '.');
  const n = parseFloat(str);
  return Number.isNaN(n) ? 0 : n;
}

function showOnlyView(viewId) {
  views.forEach(v => v.style.display = (v.id === viewId) ? 'block' : 'none');
}

function isManagerRole(ruolo) {
  return ruolo === 'admin' || ruolo === 'manager_cucina' || ruolo === 'manager_sala';
}

/* ==========================================================
   [3] SUPABASE - usare window.supabaseClient creato da index.html
   ========================================================== */
const supabase = window.supabaseClient || null;

/* ==========================================================
   [4] ROUTING E VISIBILITA' (header/user)
   ========================================================== */
function updateHeaderUser() {
  if (!currentUserLabel) return;
  if (!currentUser) {
    currentUserLabel.textContent = 'Nessun utente';
  } else {
    const ruoloLabel = currentUser.ruolo || 'Dipendente';
    currentUserLabel.textContent = `${currentUser.nome} (${ruoloLabel})`;
  }
  if (btnLogout) btnLogout.style.display = currentUser ? 'inline-block' : 'none';
}

function applyRoleVisibility() {
  const modalita = currentUser && isManagerRole(currentUser.ruolo) ? 'manager' : 'dipendente';
  document.querySelectorAll('[data-manager-only="true"], .manager-only').forEach(el => {
    el.style.display = modalita === 'manager' ? '' : 'none';
  });
  if (managerMenu) managerMenu.style.display = modalita === 'manager' ? 'grid' : 'none';
  updateHeaderUser();
}

/* ==========================================================
   [5] AUTENTICAZIONE / LOGIN
   ========================================================== */
function setCurrentUser(user, persist) {
  currentUser = user ? { id: user.id||null, nome: user.nome, ruolo: user.ruolo||'', canalePrevalente: user.canalePrevalente||'NR', virtualAdmin: !!user.virtualAdmin } : null;
  if (persist && currentUser) localStorage.setItem('ga_current_user_v1', JSON.stringify(currentUser));
  else localStorage.removeItem('ga_current_user_v1');
  updateHeaderUser();
  applyRoleVisibility();
}

if (btnLogin) {
  btnLogin.addEventListener('click', async () => {
    const nome = (loginNomeInput?.value||'').trim();
    const pin = (loginPinInput?.value||'').trim();
    const remember = loginRememberInput?.checked || false;
    if (!nome) return alert('Inserisci il nome');
    if (!pin) return alert('Inserisci il PIN');

    if (!dipendenti || dipendenti.length === 0) await caricaDipendentiDaSupabase();

    if (nome.toLowerCase() === 'admin' && pin === '9999') {
      setCurrentUser({ id:null, nome:'Admin', ruolo:'admin', canalePrevalente:'NR', virtualAdmin:true }, remember);
      showOnlyView('view-timbratura');
      return;
    }

    const dip = dipendenti.find(d => d.attivo && d.nome && d.nome.toLowerCase() === nome.toLowerCase() && d.codice && d.codice.toString() === pin.toString());
    if (!dip) return alert('Nome o PIN non corretti');
    setCurrentUser(dip, remember);

    if (isManagerRole(dip.ruolo)) showOnlyView('view-timbratura'); else showOnlyView('view-home-dip');
  });
}

if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    setCurrentUser(null, false);
    showOnlyView('view-login');
  });
}

/* ==========================================================
   [6] DIPENDENTI - esempi di funzioni chiave (caricamento)
   ========================================================== */
async function caricaDipendentiDaSupabase() {
  if (!supabase) return;
  const { data, error } = await supabase.from('dipendenti').select('*').order('nome', { ascending: true });
  if (error) { console.error('Errore caricamento dipendenti:', error); return; }
  dipendenti = (data||[]).map(r => ({ id:r.id, nome:r.nome, ruolo:r.ruolo, codice:r.codice, attivo: r.attivo !== false, costoOrario: r.costo_orario }));
}

/* ==========================================================
   [7] TIMBRATURE - placeholder (la logica esistente dovrebbe essere copiata qui)
   ========================================================== */
async function caricaTimbratureDaSupabase() { /* ... */ }

/* ==========================================================
   [8] RICETTE - caricamento cache necessario per i preventivi
   ========================================================== */
async function caricaRicetteInCache() {
  if (!supabase) return;
  const { data, error } = await supabase.from('ricette').select('id,nome').order('nome',{ascending:true});
  if (!error && data) {
    ricetteCache = data;
  }
}

/* ==========================================================
   [9] ACQUISTI / FATTURE - placeholder
   ========================================================== */
async function caricaFatture() { /* ... */ }

/* ==========================================================
   [10] MAGAZZINO - placeholder
   ========================================================== */
async function caricaMagazzinoDati() { /* ... */ }

/* ==========================================================
   [11] PREVENTIVI - modulo integrato (DOM refs e funzioni fornite dall'utente)
   ========================================================== */
// Caricamento dati iniziali per Preventivi
async function caricaContatti() {
  if (!supabase) return;
  const res = await supabase.from('contatti').select('*').order('nome');
  if (res.error) { console.error('Errore caricando contatti:', res.error); return; }
  contattiCache = res.data || [];
  if (!prevContattiList) return;
  prevContattiList.innerHTML = '';
  contattiCache.forEach(function(c) {
    const opt = document.createElement('option');
    const nomeCompleto = ((c.nome||'') + ' ' + (c.cognome||'')).trim();
    opt.value = nomeCompleto;
    prevContattiList.appendChild(opt);
  });
}

async function caricaRicettePreventivi() {
  if (!supabase) return;
  const res = await supabase.from('ricette').select('id,nome');
  if (!res.error && res.data) {
    ricetteCachePreventivi = res.data;
    if (!prevPiattiSuggestions) return;
    prevPiattiSuggestions.innerHTML = '';
    res.data.forEach(function(r) { const opt = document.createElement('option'); opt.value = r.nome; prevPiattiSuggestions.appendChild(opt); });
  }
}

async function caricaCatalogoExtra() {
  if (!supabase) return;
  const res = await supabase.from('extra_servizi_catalogo').select('*');
  if (!res.error && res.data) {
    serviziExtraCatalogo = res.data;
    if (!prevExtraSuggestions) return;
    prevExtraSuggestions.innerHTML = '';
    res.data.forEach(function(s) { const opt = document.createElement('option'); opt.value = s.nome; prevExtraSuggestions.appendChild(opt); });
  }
}

async function caricaPreventiviEsistenti() {
  if (!supabase || !prevLista) return;
  const res = await supabase.from('preventivi').select('*, contatti:cliente_id (nome, cognome)').order('created_at',{ascending:false});
  if (res.error) { console.error('Errore caricando preventivi:', res.error); return; }
  prevLista.innerHTML = '';
  (res.data||[]).forEach(function(p) {
    const tr = document.createElement('tr');
    const cont = p.contatti||{};
    const clienteNome = ((cont.nome||'') + ' ' + (cont.cognome||'')).trim();
    const dataEvento = p.data_evento || '-';
    const titolo = p.titolo_evento || '-';
    const invitati = (p.n_invitati != null ? p.n_invitati : '-');
    const totaleStr = (p.totale != null ? Number(p.totale).toFixed(2) : '0.00');
    const stato = p.stato || '-';
    var html = '<td>'+dataEvento+'</td><td>'+(clienteNome||'-')+'</td><td>'+titolo+'</td><td>'+invitati+'</td><td>'+totaleStr+'</td><td>'+stato+'</td><td><button class="app-button tiny gray" data-edit-prev="'+p.id+'">Apri</button></td>';
    tr.innerHTML = html;
    prevLista.appendChild(tr);
  });
  const buttons = prevLista.querySelectorAll('[data-edit-prev]');
  buttons.forEach(function(btn){ btn.addEventListener('click', function(){ const id = parseInt(btn.getAttribute('data-edit-prev'),10); if (!isNaN(id)) caricaPreventivoInModifica(id); }); });
}

// PIATTI / MENU: aggiungi riga piatto
function aggiungiRigaPiatto(piatto) {
  if (!prevPiattiContainer) return;
  const div = document.createElement('div');
  div.className = 'form-grid-2';
  div.style.marginTop = '8px';
  let defaultQty = 1;
  if (prevNInvitati && prevNInvitati.value) {
    const parsed = parseInt(prevNInvitati.value,10);
    if (!isNaN(parsed) && parsed>0) defaultQty = parsed;
  }
  const nomeVal = piatto && typeof piatto.nome_piatto !== 'undefined' ? piatto.nome_piatto : '';
  const qtyVal = piatto && typeof piatto.quantita !== 'undefined' && piatto.quantita !== null ? piatto.quantita : defaultQty;
  const costoUnitVal = piatto && typeof piatto.costo_unitario !== 'undefined' && piatto.costo_unitario !== null ? piatto.costo_unitario : '';
  const costoTotVal = piatto && typeof piatto.costo_totale !== 'undefined' && piatto.costo_totale !== null ? piatto.costo_totale : '';

  div.innerHTML =
    '<label>Portata<input class="input-pill prev-piatto-nome" list="prev-piatti-suggestions" value="'+nomeVal+'"></label>'+
    '<label>Quantità<input type="number" class="input-pill prev-piatto-qty" min="1" value="'+qtyVal+'"></label>'+
    '<label>Prezzo unitario (€)<input class="input-pill prev-piatto-costo" readonly value="'+costoUnitVal+'"></label>'+
    '<label>Totale (€)<input class="input-pill prev-piatto-tot" readonly value="'+costoTotVal+'"></label>'+
    '<button class="app-button tiny red prev-del-piatto" type="button">X</button>';

  prevPiattiContainer.appendChild(div);
  const btnDel = div.querySelector('.prev-del-piatto');
  const inputNome = div.querySelector('.prev-piatto-nome');
  const inputQty = div.querySelector('.prev-piatto-qty');

  if (btnDel) btnDel.addEventListener('click', function(){ div.remove(); calcolaTotaliPreventivo(); });
  if (inputNome) inputNome.addEventListener('change', function(){ aggiornaCostoPiatto(div, true).then(()=>calcolaTotaliPreventivo()); });
  if (inputQty) inputQty.addEventListener('input', function(){ aggiornaCostoPiatto(div, false).then(()=>calcolaTotaliPreventivo()); });
}

// aggiorna costo piatto (fa query a ricette_ingredienti e prodotti.costo_medio)
async function aggiornaCostoPiatto(div, force) {
  if (!supabase) return;
  const nomeInput = div.querySelector('.prev-piatto-nome');
  const qtyInput = div.querySelector('.prev-piatto-qty');
  const costoInput = div.querySelector('.prev-piatto-costo');
  const totInput = div.querySelector('.prev-piatto-tot');
  if (!nomeInput || !qtyInput || !costoInput || !totInput) return;
  const nome = (nomeInput.value||'').trim();
  const qty = parseFloat(qtyInput.value||'1');
  if (!nome) return;

  let ric = null;
  for (let i=0;i<ricetteCachePreventivi.length;i++){
    const r = ricetteCachePreventivi[i];
    if (r.nome && r.nome.toLowerCase()===nome.toLowerCase()) { ric = r; break; }
  }

  let ricettaId = null;
  let prezzoUnitario = 0;

  if (ric) {
    ricettaId = ric.id;
    const res = await supabase.from('ricette_ingredienti').select('quantita, prodotto:prodotto_id (costo_medio)').eq('ricetta_id', ric.id);
    if (!res.error && res.data) {
      res.data.forEach(function(ing){
        const q = parseFloat(ing.quantita||'0');
        let costoMedio = 0;
        if (ing.prodotto && typeof ing.prodotto.costo_medio !== 'undefined') costoMedio = parseFloat(ing.prodotto.costo_medio||'0');
        prezzoUnitario += q * costoMedio;
      });
    }
  } else {
    // crea ricetta provvisoria
    const inserimento = await supabase.from('ricette').insert({ nome: nome, descrizione: 'Ricetta da completare', tipo: 'piatto' }).select().single();
    if (!inserimento.error && inserimento.data) {
      ricettaId = inserimento.data.id;
      ricetteCachePreventivi.push({ id: inserimento.data.id, nome: nome });
      if (prevPiattiSuggestions) { const opt = document.createElement('option'); opt.value = nome; prevPiattiSuggestions.appendChild(opt); }
    }
  }

  div.dataset.ricettaId = ricettaId;
  costoInput.value = prezzoUnitario.toFixed(2);
  totInput.value = (prezzoUnitario * qty).toFixed(2);
}

// EXTRA
function aggiungiRigaExtra(extra) {
  if (!prevExtraContainer) return;
  const div = document.createElement('div');
  div.className = 'form-grid-2';
  div.style.marginTop = '8px';
  const descVal = extra && typeof extra.descrizione !== 'undefined' ? extra.descrizione : '';
  const qtyVal = extra && typeof extra.quantita !== 'undefined' && extra.quantita !== null ? extra.quantita : 1;
  const prezzoUnitVal = extra && typeof extra.prezzo_unitario !== 'undefined' && extra.prezzo_unitario !== null ? extra.prezzo_unitario : 0;
  const prezzoTotVal = extra && typeof extra.prezzo_totale !== 'undefined' && extra.prezzo_totale !== null ? extra.prezzo_totale : 0;

  const labelServ = document.createElement('label');
  const inputServ = document.createElement('input');
  inputServ.className = 'input-pill prev-extra-desc';
  inputServ.setAttribute('list','prev-extra-suggestions');
  inputServ.value = descVal;
  labelServ.appendChild(document.createTextNode('Servizio'));
  labelServ.appendChild(document.createElement('br'));
  labelServ.appendChild(inputServ);

  const labelQty = document.createElement('label');
  const inputQty = document.createElement('input'); inputQty.type='number'; inputQty.className='input-pill prev-extra-qty'; inputQty.min='1'; inputQty.value = qtyVal;
  labelQty.appendChild(document.createTextNode('Quantità')); labelQty.appendChild(document.createElement('br')); labelQty.appendChild(inputQty);

  const labelPrezzo = document.createElement('label');
  const inputPrezzo = document.createElement('input'); inputPrezzo.type='number'; inputPrezzo.className='input-pill prev-extra-prezzo'; inputPrezzo.step='0.01'; inputPrezzo.value = prezzoUnitVal;
  labelPrezzo.appendChild(document.createTextNode('Prezzo unitario (€)')); labelPrezzo.appendChild(document.createElement('br')); labelPrezzo.appendChild(inputPrezzo);

  const labelTot = document.createElement('label');
  const inputTot = document.createElement('input'); inputTot.className='input-pill prev-extra-tot'; inputTot.readOnly = true; inputTot.value = prezzoTotVal;
  labelTot.appendChild(document.createTextNode('Totale (€)')); labelTot.appendChild(document.createElement('br')); labelTot.appendChild(inputTot);

  const btnDel = document.createElement('button'); btnDel.type='button'; btnDel.className='app-button tiny red prev-del-extra'; btnDel.textContent='X';

  div.appendChild(labelServ); div.appendChild(labelQty); div.appendChild(labelPrezzo); div.appendChild(labelTot); div.appendChild(btnDel);
  prevExtraContainer.appendChild(div);

  const aggiornaExtra = () => { const q = parseFloat(inputQty.value||'1'); const p = parseFloat(inputPrezzo.value||'0'); inputTot.value = (q*p).toFixed(2); calcolaTotaliPreventivo(); };
  inputQty.addEventListener('input', aggiornaExtra);
  inputPrezzo.addEventListener('input', aggiornaExtra);
  btnDel.addEventListener('click', ()=>{ div.remove(); calcolaTotaliPreventivo(); });
}

// CALCOLO TOTALI
function calcolaTotaliPreventivo() {
  let totPiatti = 0; let totExtra = 0;
  if (prevPiattiContainer) {
    const righePiatti = prevPiattiContainer.querySelectorAll('.prev-piatto-tot');
    righePiatti.forEach(el => { totPiatti += parseFloat(el.value||'0'); });
  }
  if (prevExtraContainer) {
    const righeExtra = prevExtraContainer.querySelectorAll('.prev-extra-tot');
    righeExtra.forEach(el => { totExtra += parseFloat(el.value||'0'); });
  }
  if (prevTotalePiatti) prevTotalePiatti.value = totPiatti.toFixed(2);
  if (prevTotaleExtra) prevTotaleExtra.value = totExtra.toFixed(2);
  const totale = totPiatti + totExtra;
  if (prevTotale) prevTotale.value = totale.toFixed(2);
  if (prevTotalePP) {
    let nInv = 0; if (prevNInvitati && prevNInvitati.value) nInv = parseFloat(prevNInvitati.value);
    prevTotalePP.value = nInv>0 ? (totale / nInv).toFixed(2) : '';
  }
  if (prevStato && prevStato.value === 'accettato' && prevSaldo) {
    let ac = 0; if (prevAcconto && prevAcconto.value) ac = parseFloat(prevAcconto.value||'0');
    prevSaldo.value = (totale - ac).toFixed(2);
  }
}

// SALVA PREVENTIVO (salva record + righe)
async function salvaPreventivo() {
  if (!supabase) return; if (!prevClienteNome) return alert('Seleziona un cliente.');
  const cliente = (prevClienteNome.value||'').trim(); if (!cliente) return alert('Seleziona un cliente.');

  // trova o crea contatto
  let contattoId = null;
  let contatto = contattiCache.find(function(c){ const nc = ((c.nome||'')+' '+(c.cognome||'')).trim(); return nc.toLowerCase()===cliente.toLowerCase(); });
  if (contatto) contattoId = contatto.id; else {
    const parti = cliente.split(' '); const nome = parti.shift()||cliente; const cognome = parti.join(' ');
    const resIns = await supabase.from('contatti').insert({ nome: nome, cognome: cognome||null, email: prevClienteEmail? (prevClienteEmail.value||null) : null, telefono: prevClienteTelefono? (prevClienteTelefono.value||null) : null }).select().single();
    if (resIns.error) { console.error(resIns.error); return alert('Errore creando contatto'); }
    contattoId = resIns.data.id; contattiCache.push(resIns.data);
  }

  const payload = {
    cliente_id: contattoId,
    titolo_evento: prevTitolo? (prevTitolo.value||null) : null,
    tipo_servizio: prevTipoServizio? (prevTipoServizio.value||null) : null,
    data_evento: prevDataEvento? (prevDataEvento.value||null) : null,
    n_invitati: prevNInvitati && prevNInvitati.value ? parseInt(prevNInvitati.value,10) : null,
    location: prevLocation? (prevLocation.value||null) : null,
    note: prevNote? (prevNote.value||null) : null,
    stato: prevStato? (prevStato.value||'bozza') : 'bozza',
    acconto: prevAcconto && prevAcconto.value ? parseFloat(prevAcconto.value||'0') : 0,
    totale: prevTotale && prevTotale.value ? parseFloat(prevTotale.value||'0') : 0
  };

  let id = preventivoCorrenteId;
  if (id) {
    const resUpd = await supabase.from('preventivi').update(payload).eq('id', id);
    if (resUpd.error) { console.error(resUpd.error); return alert('Errore salvando preventivo'); }
  } else {
    const resNew = await supabase.from('preventivi').insert(payload).select().single();
    if (resNew.error) { console.error(resNew.error); return alert('Errore creando preventivo'); }
    id = resNew.data.id; preventivoCorrenteId = id;
  }

  // righe menù
  await supabase.from('preventivi_ricette').delete().eq('preventivo_id', id);
  if (prevPiattiContainer) {
    const righe = prevPiattiContainer.children;
    for (let i=0;i<righe.length;i++){ const div = righe[i]; const inputNome = div.querySelector('.prev-piatto-nome'); const inputQty = div.querySelector('.prev-piatto-qty'); const inputCU = div.querySelector('.prev-piatto-costo'); const inputTot = div.querySelector('.prev-piatto-tot'); const nomePiatto = inputNome? (inputNome.value||'') : ''; if (!nomePiatto) continue; await supabase.from('preventivi_ricette').insert({ preventivo_id: id, ricetta_id: div.dataset.ricettaId || null, nome_piatto: nomePiatto, quantita: inputQty? inputQty.value : 0, costo_unitario: inputCU? inputCU.value : 0, costo_totale: inputTot? inputTot.value : 0, ricetta_completa: !!div.dataset.ricettaId }); }
  }

  // righe extra
  await supabase.from('preventivi_extra').delete().eq('preventivo_id', id);
  if (prevExtraContainer) {
    const righeE = prevExtraContainer.children;
    for (let i=0;i<righeE.length;i++){ const div = righeE[i]; const inputDesc = div.querySelector('.prev-extra-desc'); const inputQty = div.querySelector('.prev-extra-qty'); const inputPU = div.querySelector('.prev-extra-prezzo'); const desc = inputDesc? (inputDesc.value||'') : ''; if (!desc) continue; await supabase.from('preventivi_extra').insert({ preventivo_id: id, descrizione: desc, quantita: inputQty? inputQty.value : 0, prezzo_unitario: inputPU? inputPU.value : 0 }); }
  }

  if (prevStato && prevStato.value === 'accettato') await generaPrenotazione(id);
  alert('Preventivo salvato.');
  await caricaPreventiviEsistenti();
}

// Genera prenotazione
async function generaPrenotazione(id) {
  if (!supabase) return;
  let ac = 0; let tot = 0; if (prevAcconto && prevAcconto.value) ac = parseFloat(prevAcconto.value||'0'); if (prevTotale && prevTotale.value) tot = parseFloat(prevTotale.value||'0');
  const resPrev = await supabase.from('preventivi').select('*').eq('id', id).single(); if (resPrev.error || !resPrev.data) return;
  const resPren = await supabase.from('prenotazioni').upsert({ preventivo_id: id, cliente_id: resPrev.data.cliente_id, data_evento: resPrev.data.data_evento, acconto: ac, saldo_residuo: tot - ac });
  if (resPren.error) console.error('Errore creando prenotazione:', resPren.error);
}

// Carica in modifica
async function caricaPreventivoInModifica(id) {
  if (!supabase) return;
  preventivoCorrenteId = id;
  const res = await supabase.from('preventivi').select('*').eq('id', id).single();
  if (res.error || !res.data) { console.error(res.error); return alert('Errore caricando preventivo'); }
  const p = res.data;
  const contatto = contattiCache.find(c => c.id === p.cliente_id);
  if (contatto) {
    if (prevClienteNome) prevClienteNome.value = ((contatto.nome||'') + ' ' + (contatto.cognome||'')).trim();
    if (prevClienteEmail) prevClienteEmail.value = contatto.email || '';
    if (prevClienteTelefono) prevClienteTelefono.value = contatto.telefono || '';
  }
  if (prevTitolo) prevTitolo.value = p.titolo_evento || '';
  if (prevTipoServizio) prevTipoServizio.value = p.tipo_servizio || 'buffet';
  if (prevDataEvento) prevDataEvento.value = p.data_evento || '';
  if (prevNInvitati) prevNInvitati.value = p.n_invitati || '';
  if (prevLocation) prevLocation.value = p.location || '';
  if (prevNote) prevNote.value = p.note || '';
  if (prevStato) prevStato.value = p.stato || 'bozza';
  if (prevAcconto) prevAcconto.value = p.acconto || '0';
  if (prevPiattiContainer) prevPiattiContainer.innerHTML = '';
  if (prevExtraContainer) prevExtraContainer.innerHTML = '';

  const resPiatti = await supabase.from('preventivi_ricette').select('*').eq('preventivo_id', id);
  if (!resPiatti.error && resPiatti.data) resPiatti.data.forEach(function(riga){ aggiungiRigaPiatto(riga); });
  const resExtra = await supabase.from('preventivi_extra').select('*').eq('preventivo_id', id);
  if (!resExtra.error && resExtra.data) resExtra.data.forEach(function(e){ aggiungiRigaExtra(e); });
  calcolaTotaliPreventivo();
  if (prevAccontoCard) prevAccontoCard.style.display = p.stato === 'accettato' ? 'block' : 'none';
  if (prevApriPrenotazioneBtn) prevApriPrenotazioneBtn.style.display = p.stato === 'accettato' ? 'block' : 'none';
  showOnlyView('view-preventivi'); applyRoleVisibility();
}

// EVENT LISTENERS preventivi
if (prevAddPiattoBtn) prevAddPiattoBtn.addEventListener('click', ()=> aggiungiRigaPiatto());
if (prevAddExtraBtn) prevAddExtraBtn.addEventListener('click', ()=> aggiungiRigaExtra());
if (prevSalvaBtn) prevSalvaBtn.addEventListener('click', ()=> salvaPreventivo());
if (prevStato) prevStato.addEventListener('change', ()=> { if (prevAccontoCard) prevAccontoCard.style.display = prevStato.value === 'accettato' ? 'block' : 'none'; if (prevApriPrenotazioneBtn) prevApriPrenotazioneBtn.style.display = prevStato.value === 'accettato' ? 'block' : 'none'; calcolaTotaliPreventivo(); });
if (prevAcconto) prevAcconto.addEventListener('input', ()=> calcolaTotaliPreventivo());
if (prevNInvitati) prevNInvitati.addEventListener('input', ()=> calcolaTotaliPreventivo());

/* ==========================================================
   [12] INIT - funzione di inizializzazione eseguita al caricamento
   ========================================================== */
async function initApp() {
  // carica risorse principali
  await caricaDipendentiDaSupabase().catch(()=>{});
  await caricaRicetteInCache().catch(()=>{});
  // init preventivi
  await caricaContatti().catch(()=>{});
  await caricaRicettePreventivi().catch(()=>{});
  await caricaCatalogoExtra().catch(()=>{});
  await caricaPreventiviEsistenti().catch(()=>{});

  // mostra login all'apertura
  showOnlyView('view-login');
}

// avvio immediato
document.addEventListener('DOMContentLoaded', function(){ initApp(); });

// fine file
