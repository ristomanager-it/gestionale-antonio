// RETE COMPENSI — regole dei compensi della rete vendita, in un posto solo.
// Le regole stanno nella tabella rete_compensi (una riga, modificabile solo dal superadmin),
// i prezzi nei piani (piani_abbonamento): li usano la home agente, Piattaforma › Programma Agenti
// e il PDF da stampare. Deciso con Antonio il 2/11/2026: 10% agente sul primo anno, 3% segnalatore,
// niente anticipo, premi a target mensile (contratti) e annuale (venduto, clienti attivi a fine anno).

const sb = () => window.supabaseClient || window.supabase;

const DEFAULT = {
  perc_agente: 10, perc_agente_avvio: 15, perc_segnalatore: 3, perc_ricorrente: 5, anticipo_mensile: 0,
  premi_mese: [{ contratti: 4, premio: 500 }, { contratti: 6, premio: 900 }],
  premi_anno: [{ venduto: 100000, premio: 3000 }, { venduto: 150000, premio: 6000 }],
  regole: [], in_vigore_dal: null,
};

// pacchetti in vendita (prezzi aggiornati dal database)
const PACCHETTI = [
  { slug: 'ristorante', nome: 'Ristorante', mensile: 349, annuale: 3560 },
  { slug: 'catering', nome: 'Catering ed eventi', mensile: 449, annuale: 4580 },
  { slug: 'hotel-ristorante', nome: 'Hotel con ristorante', mensile: 429, annuale: 4376 },
  { slug: 'solo-hotel', nome: 'Hotel (solo camere)', mensile: 229, annuale: 2336 },
  { slug: 'bar', nome: 'Bar', mensile: 149, annuale: 1520 },
  { slug: 'tasting', nome: 'Tasting e pro loco', mensile: 99, annuale: 1010 },
  { slug: 'fondatore', nome: 'Fondatore', mensile: null, annuale: 2000, soloAnnuale: true },
];
const SCONTO_LANCIO = 0.30;

let _regole = { ...DEFAULT };
let _caricate = false;

export function regole() { return _regole; }
export function pacchetti() { return PACCHETTI; }

export async function caricaRegole(forza) {
  if (_caricate && !forza) return _regole;
  try {
    const [r, p] = await Promise.all([
      sb().from('rete_compensi').select('*').eq('id', 1).maybeSingle(),
      sb().from('piani_abbonamento').select('slug, prezzo_mensile, prezzo_annuale').in('slug', PACCHETTI.map(x => x.slug)),
    ]);
    if (r.data) _regole = { ...DEFAULT, ...r.data };
    (p.data || []).forEach(x => {
      const k = PACCHETTI.find(y => y.slug === x.slug);
      if (!k) return;
      if (!k.soloAnnuale && x.prezzo_mensile) k.mensile = Number(x.prezzo_mensile);
      if (x.prezzo_annuale) k.annuale = Number(x.prezzo_annuale);
    });
    _caricate = true;
  } catch (e) { console.warn('rete-compensi: uso le regole di riserva', e); }
  return _regole;
}

// valore annuo dei piani, anche dei piani vecchi (per i contratti gia' chiusi)
export function valoreAnnuoPiano(piano) {
  const k = PACCHETTI.find(x => x.slug === piano);
  if (k) return k.annuale;
  const vecchi = { starter: 828, business: 1428, pro: 2028, hotel: 1188, full: 2388 };
  return vecchi[piano] || PACCHETTI[0].annuale;
}

// avvio = l'agente abilitato ha fatto partire il locale entro 4 giorni dalla firma (componente avvii-agenti)
export function provvigione(valoreAnnuo, tipoAgente, avvio) {
  const p = tipoAgente === 'segnalatore' ? _regole.perc_segnalatore : (avvio ? (_regole.perc_agente_avvio || _regole.perc_agente) : _regole.perc_agente);
  return Number(valoreAnnuo || 0) * Number(p || 0) / 100;
}
export function ricorrente(valoreAnnuo, tipoAgente) {
  if (tipoAgente === 'segnalatore') return 0;
  return Number(valoreAnnuo || 0) * Number(_regole.perc_ricorrente || 0) / 100;
}
export function premioMese(contratti) {
  const s = [...(_regole.premi_mese || [])].sort((a, b) => b.contratti - a.contratti).find(x => contratti >= x.contratti);
  return s ? Number(s.premio) : 0;
}
export function premioAnno(venduto) {
  const s = [...(_regole.premi_anno || [])].sort((a, b) => b.venduto - a.venduto).find(x => venduto >= x.venduto);
  return s ? Number(s.premio) : 0;
}

const euro = n => Math.round(Number(n || 0)).toLocaleString('it-IT') + ' €';
const perc = n => String(Number(n || 0)).replace('.', ',') + '%';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lancio = k => k.soloAnnuale ? k.annuale : Math.round(k.mensile * 12 * 0.85 * (1 - SCONTO_LANCIO));

function contenuto(r) {
  const pm = [...(r.premi_mese || [])].sort((a, b) => a.contratti - b.contratti);
  const pa = [...(r.premi_anno || [])].sort((a, b) => a.venduto - b.venduto);
  const dal = r.in_vigore_dal ? new Date(r.in_vigore_dal).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const righe = PACCHETTI.map(k => {
    const pieno = k.annuale, l = lancio(k);
    return '<tr><td>' + esc(k.nome) + '</td><td>' + euro(pieno) + '</td><td><b>' + euro(provvigione(pieno)) + '</b></td><td>' + euro(provvigione(l)) + '</td><td>' + euro(provvigione(pieno, 'segnalatore')) + '</td></tr>';
  }).join('');
  // esempio: 4 Ristoranti + 1 Bar al mese con sconto di lancio
  const R = PACCHETTI.find(k => k.slug === 'ristorante'), B = PACCHETTI.find(k => k.slug === 'bar');
  const esempio = (nr, nb) => {
    const vMese = nr * lancio(R) + nb * lancio(B);
    const prov = provvigione(vMese), pM = premioMese(nr + nb), pA = premioAnno(vMese * 12) / 12;
    return '<tr><td>' + nr + ' Ristoranti + ' + nb + ' Bar, con lancio</td><td>' + euro(prov) + '</td><td>' + euro(pM) + '</td><td>' + euro(pA) + '</td><td><b>≈ ' + euro(prov + pM + pA) + '</b></td></tr>';
  };
  const regoleTxt = (r.regole && r.regole.length) ? r.regole : DEFAULT.regole;
  return '' +
    '<div class="rc-barra"><i></i><i></i><i></i><i></i></div>' +
    '<h1 class="rc-h1">Come guadagni con Ristoflow</h1>' +
    '<p class="rc-sotto">Compensi della rete vendita' + (dal ? ' · in vigore dal ' + dal : '') + '</p>' +
    '<h2 class="rc-h2">Le regole in cifre</h2>' +
    '<div class="rc-carte">' +
      '<div class="rc-carta"><b>' + perc(r.perc_agente) + '</b><span>di quello che il cliente paga il primo anno, per ogni contratto che chiudi</span></div>' +
      (Number(r.perc_agente_avvio) > 0 ? '<div class="rc-carta"><b>' + perc(r.perc_agente_avvio) + '</b><span>se chiudi il contratto e fai partire il locale entro quattro giorni (serve l\'abilitazione)</span></div>' : '') +
      '<div class="rc-carta"><b>' + perc(r.perc_segnalatore) + '</b><span>se porti solo il contatto e il contratto lo chiude un altro</span></div>' +
      (pm.length ? '<div class="rc-carta"><b>' + euro(pm[0].premio) + '</b><span>nel mese in cui chiudi ' + pm[0].contratti + ' contratti pagati' + (pm[1] ? '. ' + euro(pm[1].premio) + ' se arrivi a ' + pm[1].contratti : '') + '</span></div>' : '') +
      (pa.length ? '<div class="rc-carta"><b>' + euro(pa[0].premio) + '</b><span>a fine anno con ' + euro(pa[0].venduto) + ' venduti' + (pa[1] ? '. ' + euro(pa[1].premio) + ' con ' + euro(pa[1].venduto) : '') + '</span></div>' : '') +
    '</div>' +
    '<p class="rc-p">' + (Number(r.anticipo_mensile) > 0 ? 'Anticipo mensile ' + euro(r.anticipo_mensile) + ', da scalare dalle provvigioni. ' : 'Nessun anticipo. ') +
      (Number(r.perc_ricorrente) > 0 ? 'Sui rinnovi ' + perc(r.perc_ricorrente) + ' all\'anno, finché il cliente resta.' : 'La provvigione vale sul primo anno: sui rinnovi oggi è 0%.') + '</p>' +
    '<h2 class="rc-h2">Quanto vale un contratto</h2>' +
    '<div class="rc-scroll"><table class="rc-t"><thead><tr><th>Pacchetto</th><th>Annuale a listino</th><th>Tu, a listino</th><th>Tu, con lancio</th><th>Segnalatore</th></tr></thead><tbody>' + righe + '</tbody></table></div>' +
    '<p class="rc-p">Più sconti, meno guadagni: la provvigione si calcola su quello che il cliente paga davvero.</p>' +
    '<h2 class="rc-h2">Esempio: un anno a ritmo costante</h2>' +
    '<div class="rc-scroll"><table class="rc-t"><thead><tr><th>Ogni mese</th><th>Provvigioni</th><th>Premio mese</th><th>Premio anno (quota mese)</th><th>Totale al mese</th></tr></thead><tbody>' + esempio(4, 1) + esempio(6, 2) + '</tbody></table></div>' +
    '<p class="rc-p">Il premio annuale si paga a fine anno: qui è diviso per dodici solo per confronto.</p>' +
    '<h2 class="rc-h2">Come funziona</h2>' +
    '<ol class="rc-ol">' + regoleTxt.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>';
}

const CSS = '' +
  '.rc-wrap{max-width:760px;margin:0 auto;color:#1d2a33;font-size:15px;line-height:1.5}' +
  '.rc-barra{display:flex;height:6px;border-radius:3px;overflow:hidden;margin-bottom:12px}.rc-barra i{flex:1}' +
  '.rc-barra i:nth-child(1){background:#023C59}.rc-barra i:nth-child(2){background:#E66101}.rc-barra i:nth-child(3){background:#F1B302}.rc-barra i:nth-child(4){background:#348127}' +
  '.rc-h1{font-size:23px;color:#023C59;margin:0 0 2px}.rc-sotto{color:#5b6b76;margin:0 0 10px}' +
  '.rc-h2{font-size:17px;color:#023C59;margin:22px 0 8px;padding-top:10px;border-top:3px solid #E66101}' +
  '.rc-p{color:#5b6b76;font-size:13px;margin:8px 0}' +
  '.rc-carte{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}' +
  '.rc-carta{background:#fff;border:1px solid #dfe6ea;border-radius:12px;padding:10px}.rc-carta b{display:block;font-size:24px;color:#E66101}.rc-carta span{font-size:12px;color:#5b6b76}' +
  '.rc-scroll{overflow-x:auto;background:#fff;border:1px solid #dfe6ea;border-radius:12px}' +
  '.rc-t{border-collapse:collapse;width:100%;min-width:520px;font-size:13px}.rc-t th,.rc-t td{padding:8px 9px;text-align:right;border-bottom:1px solid #eef2f4;white-space:nowrap}' +
  '.rc-t th:first-child,.rc-t td:first-child{text-align:left}.rc-t th{font-size:11px;color:#5b6b76;background:#f6f8f9}' +
  '.rc-ol li{margin:5px 0}' +
  '.rc-pdf{background:#E66101;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer;font-size:14px}' +
  '.rc-admin{background:#fff;border:2px dashed #dfe6ea;border-radius:12px;padding:12px;margin-top:22px;font-size:14px}' +
  '.rc-admin label{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #eef2f4}' +
  '.rc-admin input{width:110px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px;text-align:right;font-size:14px}' +
  '.rc-admin input.lungo{width:200px}' +
  '.rc-salva{margin-top:10px;background:#023C59;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-weight:700;cursor:pointer}';

function pdf() {
  const w = window.open('', '_blank');
  if (!w) { alert('Il telefono ha bloccato la finestra: consenti i popup e riprova.'); return; }
  w.document.write('<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Ristoflow — Compensi rete vendita</title><style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:24px;background:#fff}' + CSS +
    '.rc-scroll{overflow:visible}.rc-t{min-width:0}@media print{.no-print{display:none}body{margin:12mm}}</style></head><body><div class="rc-wrap">' +
    contenuto(_regole) + '<p class="no-print" style="margin-top:20px"><button class="rc-pdf" onclick="window.print()">🖨 Stampa o salva PDF</button></p></div></body></html>');
  w.document.close();
  setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 400);
}

function pannelloAdmin(r) {
  const m = [...(r.premi_mese || [])].map(x => x.contratti + '=' + x.premio).join(', ');
  const a = [...(r.premi_anno || [])].map(x => x.venduto + '=' + x.premio).join(', ');
  return '<div class="rc-admin"><b>Solo per te: le regole</b>' +
    '<label>Provvigione agente, primo anno (%)<input id="rc-agente" type="number" step="0.5" value="' + r.perc_agente + '"></label>' +
    '<label>Agente con avvio in 4 giorni (%)<input id="rc-avvio" type="number" step="0.5" value="' + (r.perc_agente_avvio == null ? '' : r.perc_agente_avvio) + '"></label>' +
    '<label>Segnalatore (%)<input id="rc-segn" type="number" step="0.5" value="' + r.perc_segnalatore + '"></label>' +
    '<label>Sui rinnovi (%)<input id="rc-ric" type="number" step="0.5" value="' + r.perc_ricorrente + '"></label>' +
    '<label>Anticipo mensile (€)<input id="rc-ant" type="number" step="50" value="' + r.anticipo_mensile + '"></label>' +
    '<label>Premi mensili (contratti=premio)<input id="rc-pm" class="lungo" value="' + esc(m) + '"></label>' +
    '<label>Premi annuali (venduto=premio)<input id="rc-pa" class="lungo" value="' + esc(a) + '"></label>' +
    '<button class="rc-salva" id="rc-salva">Salva le regole</button> <span id="rc-esito" style="font-size:13px;color:#5b6b76"></span>' +
    '<p class="rc-p">Gli agenti vedono questa pagina senza questo riquadro. Il PDF si aggiorna da solo.</p></div>';
}

function leggiCoppie(s, a, b) {
  return String(s || '').split(',').map(x => x.split('=').map(y => Number(String(y).replace(/[^\d.]/g, '')))).filter(x => x.length === 2 && x[0] > 0 && x[1] >= 0).map(x => ({ [a]: x[0], [b]: x[1] }));
}

// monta la schermata dentro el. opzioni: { admin: true } mostra il riquadro per cambiare le regole
export async function montaCompensi(el, opzioni) {
  const admin = !!(opzioni && opzioni.admin);
  el.innerHTML = '<div style="padding:20px;color:#94a3b8;text-align:center">Caricamento…</div>';
  await caricaRegole(true);
  const disegna = () => {
    el.innerHTML = '<style>' + CSS + '</style><div class="rc-wrap"><div style="display:flex;justify-content:flex-end;margin-bottom:8px">' +
      '<button class="rc-pdf" id="rc-pdf">🖨 Scarica il PDF da stampare</button></div>' + contenuto(_regole) + (admin ? pannelloAdmin(_regole) : '') + '</div>';
    el.querySelector('#rc-pdf').onclick = pdf;
    const salva = el.querySelector('#rc-salva');
    if (salva) salva.onclick = async () => {
      const esito = el.querySelector('#rc-esito');
      const agg = {
        perc_agente: Number(el.querySelector('#rc-agente').value) || 0,
        perc_agente_avvio: Number(el.querySelector('#rc-avvio').value) || 0,
        perc_segnalatore: Number(el.querySelector('#rc-segn').value) || 0,
        perc_ricorrente: Number(el.querySelector('#rc-ric').value) || 0,
        anticipo_mensile: Number(el.querySelector('#rc-ant').value) || 0,
        premi_mese: leggiCoppie(el.querySelector('#rc-pm').value, 'contratti', 'premio'),
        premi_anno: leggiCoppie(el.querySelector('#rc-pa').value, 'venduto', 'premio'),
        in_vigore_dal: new Date().toISOString().slice(0, 10),
        aggiornato_at: new Date().toISOString(),
      };
      esito.textContent = 'Salvataggio…';
      const { error } = await sb().from('rete_compensi').update(agg).eq('id', 1);
      if (error) { esito.textContent = 'Non salvato: ' + error.message; return; }
      await caricaRegole(true);
      disegna();
    };
  };
  disegna();
}
