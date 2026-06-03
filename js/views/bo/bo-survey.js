// js/views/bo/bo-survey.js
// Survey dipendenti — pulse survey trimestrale

const supa = () => window.supabaseClient || window.supabase;
const SUPABASE_URL = 'https://cuhcscpvhypoaplcmtjk.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1aGNzY3B2aHlwb2FwbGNtdGprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjY4MjgsImV4cCI6MjA3OTQwMjgyOH0.q9zAs0oh8F1-whtORHBIORF5jIn1NTS3LvSMWleP0a0';

// ─── DOMANDE DEFAULT ──────────────────────────────────────────────────────────
const DOMANDE_DEFAULT = [
  // PARTE 1 — Scala nominale
  { ordine: 1,  testo: 'Come ti senti in questo periodo al lavoro?',                         tipo: 'scala',  anonima: false, scala_min: 1, scala_max: 5 },
  { ordine: 2,  testo: 'Ti senti valorizzato per quello che fai?',                           tipo: 'scala',  anonima: false, scala_min: 1, scala_max: 5 },
  { ordine: 3,  testo: 'Il carico di lavoro è sostenibile?',                                 tipo: 'scala',  anonima: false, scala_min: 1, scala_max: 5 },
  { ordine: 4,  testo: 'Ti senti parte di un team?',                                         tipo: 'scala',  anonima: false, scala_min: 1, scala_max: 5 },
  { ordine: 5,  testo: 'Sei soddisfatto di come stai crescendo professionalmente?',          tipo: 'scala',  anonima: false, scala_min: 1, scala_max: 5 },
  // PARTE 2 — Aperte nominali
  { ordine: 6,  testo: 'Cosa ti sta dando più soddisfazione ultimamente?',                   tipo: 'aperta', anonima: false },
  { ordine: 7,  testo: 'C\'è qualcosa che ti pesa o ti frena nel lavoro quotidiano?',        tipo: 'aperta', anonima: false },
  { ordine: 8,  testo: 'Hai tutto quello che ti serve per lavorare bene?',                   tipo: 'aperta', anonima: false },
  { ordine: 9,  testo: 'C\'è qualcosa che vorresti imparare o fare di più?',                 tipo: 'aperta', anonima: false },
  // PARTE 3 — Anonime
  { ordine: 10, testo: 'Se potessi cambiare una cosa in questa azienda, quale sarebbe?',     tipo: 'aperta', anonima: true  },
  { ordine: 11, testo: 'C\'è qualcosa che vedi ogni giorno che non funziona e che nessuno dice?', tipo: 'aperta', anonima: true },
  { ordine: 12, testo: 'Cosa ti farebbe venire voglia di restare qui a lungo?',              tipo: 'aperta', anonima: true  },
  { ordine: 13, testo: 'Consiglieresti questo posto a un amico che cerca lavoro? Perché?',   tipo: 'aperta', anonima: true  },
  // DOMANDA FINALE — anonima con alert
  { ordine: 14, testo: 'Tra 6 mesi ti vedi ancora qui?', tipo: 'scelta', anonima: true,
    opzioni: ['Sì, assolutamente', 'Probabilmente sì', 'Non so', 'Probabilmente no', 'No'],
    alert_valori: ['Probabilmente no', 'No'] },
];

function emoji_scala(v) {
  return ['','😞','😕','😐','🙂','😊'][v] || v;
}

function colore_scala(v) {
  if (v >= 4) return '#15803d';
  if (v === 3) return '#d97706';
  return '#dc2626';
}

export async function render(container) {
  const aziendaId = window.state?.azienda?.id;
  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;">Caricamento...</div>';

  // Carica survey esistenti
  const { data: surveys } = await supa()
    .from('survey')
    .select('*')
    .eq('azienda_id', aziendaId)
    .order('created_at', { ascending: false });

  const lista = surveys || [];
  let surveySelezionato = lista.find(s => s.stato === 'attivo') || lista[0] || null;

  function renderMain() {
    container.innerHTML = `
      <style>
        .sv-tab { display:none; } .sv-tab.attiva { display:block; }
        .sv-nav { background:none;border:none;padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600;color:#64748b;border-bottom:3px solid transparent;transition:all .2s; }
        .sv-nav.attiva { color:#0E5A7A;border-bottom-color:#0E5A7A; }
        .card { background:white;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:10px; }
        .input { border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:14px;outline:none;transition:border .2s;font-family:inherit;background:white; }
        .input:focus { border-color:#0E5A7A; }
        .lbl { font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px; }
        .stella { font-size:20px;cursor:pointer;transition:transform .1s; }
        .stella:hover { transform:scale(1.2); }
        .badge { display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600; }
      </style>

      <div style="min-height:100vh;background:#f8fafc;padding:20px;">
        <div style="max-width:860px;margin:0 auto;">

          <!-- Header -->
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:40px;height:40px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;">💬</div>
              <div>
                <div style="font-size:20px;font-weight:700;color:#0f172a;">Survey dipendenti</div>
                <div style="font-size:13px;color:#64748b;">Pulse survey trimestrale — ascolto del team</div>
              </div>
            </div>
            <button id="btn-nuovo-survey" style="background:#7c3aed;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;">
              + Nuovo survey
            </button>
          </div>

          <!-- Lista survey -->
          ${lista.length === 0 ? `
            <div class="card" style="text-align:center;padding:40px;">
              <div style="font-size:32px;margin-bottom:12px;">💬</div>
              <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Nessun survey ancora</div>
              <div style="font-size:13px;color:#64748b;">Crea il primo survey trimestrale per il tuo team.</div>
            </div>
          ` : `
            <!-- Selettore survey -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
              ${lista.map(s => `
                <button class="btn-sel-survey ${surveySelezionato?.id === s.id ? 'attivo' : ''}"
                  data-sid="${s.id}"
                  style="border:1.5px solid ${surveySelezionato?.id === s.id ? '#7c3aed' : '#e5e7eb'};
                         background:${surveySelezionato?.id === s.id ? '#f5f3ff' : 'white'};
                         color:${surveySelezionato?.id === s.id ? '#7c3aed' : '#374151'};
                         border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;">
                  ${s.titolo} — ${new Date(s.created_at).toLocaleDateString('it-IT',{month:'short',year:'numeric'})}
                  <span style="margin-left:6px;background:${s.stato==='attivo'?'#f0fdf4':s.stato==='chiuso'?'#f1f5f9':'#fef3c7'};
                               color:${s.stato==='attivo'?'#15803d':s.stato==='chiuso'?'#64748b':'#92400e'};
                               padding:1px 7px;border-radius:10px;font-size:10px;">
                    ${s.stato}
                  </span>
                </button>
              `).join('')}
            </div>

            <!-- Tabs -->
            <div style="display:flex;border-bottom:1px solid #e5e7eb;margin-bottom:20px;">
              <button class="sv-nav attiva" data-tab="tab-overview">📊 Overview</button>
              <button class="sv-nav" data-tab="tab-risposte">💬 Risposte</button>
              <button class="sv-nav" data-tab="tab-invii">📤 Invii</button>
            </div>

            <div id="tab-overview" class="sv-tab attiva"></div>
            <div id="tab-risposte" class="sv-tab"></div>
            <div id="tab-invii" class="sv-tab"></div>
          `}

          <!-- Modal nuovo survey -->
          <div id="modal-survey" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
            <div style="background:white;border-radius:20px;max-width:520px;width:100%;padding:28px;">
              <div style="font-size:17px;font-weight:700;color:#0f172a;margin-bottom:16px;">📋 Nuovo survey</div>
              <div style="margin-bottom:14px;">
                <span class="lbl">Titolo</span>
                <input id="sv-titolo" class="input" value="Come stai?" style="width:100%;box-sizing:border-box;">
              </div>
              <div style="margin-bottom:14px;">
                <span class="lbl">Descrizione (opzionale)</span>
                <textarea id="sv-desc" class="input" rows="2" placeholder="Poche righe introduttive per i dipendenti..." style="width:100%;box-sizing:border-box;resize:none;"></textarea>
              </div>
              <div style="background:#f5f3ff;border-radius:10px;padding:12px;font-size:13px;color:#7c3aed;margin-bottom:16px;">
                ℹ️ Verranno create automaticamente le <strong>14 domande standard</strong> (5 scala + 4 aperte nominali + 4 anonime + 1 finale con alert).
              </div>
              <div id="sv-esito" style="font-size:13px;min-height:14px;margin-bottom:12px;"></div>
              <div style="display:flex;gap:8px;">
                <button id="btn-crea-survey" style="flex:1;background:#7c3aed;color:white;border:none;border-radius:10px;padding:11px;cursor:pointer;font-size:14px;font-weight:600;">
                  Crea survey
                </button>
                <button id="btn-chiudi-modal-sv" style="background:#f1f5f9;color:#374151;border:none;border-radius:10px;padding:11px 18px;cursor:pointer;">
                  Annulla
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>`;

    // Event listeners tabs
    container.querySelectorAll('.sv-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.sv-nav').forEach(b => b.classList.remove('attiva'));
        container.querySelectorAll('.sv-tab').forEach(t => t.classList.remove('attiva'));
        btn.classList.add('attiva');
        container.querySelector('#' + btn.dataset.tab).classList.add('attiva');
      });
    });

    // Selettore survey
    container.querySelectorAll('.btn-sel-survey').forEach(btn => {
      btn.addEventListener('click', () => {
        surveySelezionato = lista.find(s => s.id === btn.dataset.sid);
        renderMain();
        setTimeout(() => caricaContenuto(), 100);
      });
    });

    // Nuovo survey
    container.querySelector('#btn-nuovo-survey')?.addEventListener('click', () => {
      container.querySelector('#modal-survey').style.display = 'flex';
    });
    container.querySelector('#btn-chiudi-modal-sv')?.addEventListener('click', () => {
      container.querySelector('#modal-survey').style.display = 'none';
    });
    container.querySelector('#btn-crea-survey')?.addEventListener('click', creaSurvey);

    if (surveySelezionato) caricaContenuto();
  }

  // ─── CREA SURVEY ─────────────────────────────────────────────────────────
  async function creaSurvey() {
    const esito = container.querySelector('#sv-esito');
    const titolo = container.querySelector('#sv-titolo').value.trim();
    const desc = container.querySelector('#sv-desc').value.trim();
    if (!titolo) { esito.textContent = '❌ Titolo obbligatorio'; esito.style.color = '#dc2626'; return; }

    esito.textContent = 'Creazione...'; esito.style.color = '#64748b';

    // 1. Crea survey
    const { data: sv, error } = await supa().from('survey').insert({
      azienda_id: aziendaId, titolo, descrizione: desc || null, stato: 'bozza'
    }).select().single();

    if (error) { esito.textContent = '❌ ' + error.message; esito.style.color = '#dc2626'; return; }

    // 2. Inserisci domande default
    const domande = DOMANDE_DEFAULT.map(d => ({
      survey_id: sv.id,
      ordine: d.ordine,
      testo: d.testo,
      tipo: d.tipo,
      anonima: d.anonima,
      opzioni: d.opzioni || null,
      scala_min: d.scala_min || 1,
      scala_max: d.scala_max || 5,
      alert_valori: d.alert_valori || null,
    }));

    const { error: errD } = await supa().from('survey_domande').insert(domande);
    if (errD) { esito.textContent = '⚠️ Survey creato ma errore domande: ' + errD.message; esito.style.color = '#f59e0b'; }
    else {
      esito.textContent = '✅ Survey creato!'; esito.style.color = '#16a34a';
      setTimeout(() => render(container), 800);
    }
  }

  // ─── CARICA CONTENUTO SURVEY SELEZIONATO ─────────────────────────────────
  async function caricaContenuto() {
    if (!surveySelezionato) return;
    const sid = surveySelezionato.id;

    const [
      { data: domande },
      { data: invii },
      { data: risposte },
      { data: dipendenti },
    ] = await Promise.all([
      supa().from('survey_domande').select('*').eq('survey_id', sid).order('ordine'),
      supa().from('survey_invii').select('*, dipendenti(nome,cognome,foto_url)').eq('survey_id', sid),
      supa().from('survey_risposte').select('*').eq('survey_id', sid),
      supa().from('dipendenti').select('id,nome,cognome,telefono,foto_url').eq('azienda_id', aziendaId).eq('attivo', true),
    ]);

    const nDipendenti = (dipendenti || []).length;
    const nInviati = (invii || []).filter(i => i.whatsapp_inviato).length;
    const nCompletati = (invii || []).filter(i => i.completato).length;
    const percCompletati = nInviati > 0 ? Math.round((nCompletati / nInviati) * 100) : 0;

    renderOverview(domande || [], invii || [], risposte || [], nDipendenti, nInviati, nCompletati, percCompletati);
    renderRisposte(domande || [], risposte || [], invii || []);
    renderInvii(invii || [], dipendenti || [], sid);
  }

  // ─── TAB OVERVIEW ────────────────────────────────────────────────────────
  function renderOverview(domande, invii, risposte, nDip, nInv, nComp, perc) {
    const el = container.querySelector('#tab-overview');
    if (!el) return;

    // KPI
    const alertRisposte = risposte.filter(r => r.alert_triggerato);

    // Media per domande scala
    const domandaScala = domande.filter(d => d.tipo === 'scala');
    const medie = domandaScala.map(d => {
      const vals = risposte.filter(r => r.domanda_id === d.id && r.risposta_scala).map(r => r.risposta_scala);
      const media = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null;
      return { ...d, media, n: vals.length };
    });

    el.innerHTML = `
      <!-- Alert se ci sono risposte preoccupanti -->
      ${alertRisposte.length > 0 ? `
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
          <div style="font-size:24px;">⚠️</div>
          <div>
            <div style="font-weight:700;color:#dc2626;font-size:14px;">${alertRisposte.length} dipendente${alertRisposte.length>1?'i':''} ${alertRisposte.length>1?'hanno':'ha'} risposto negativamente alla domanda finale</div>
            <div style="font-size:12px;color:#b91c1c;margin-top:2px;">Vai al tab "Risposte" per vedere i dettagli</div>
          </div>
        </div>
      ` : ''}

      <!-- KPI -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px;">
        <div class="card" style="text-align:center;padding:20px 12px;">
          <div style="font-size:28px;font-weight:800;color:#7c3aed;">${nDip}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Dipendenti attivi</div>
        </div>
        <div class="card" style="text-align:center;padding:20px 12px;">
          <div style="font-size:28px;font-weight:800;color:#0E5A7A;">${nInv}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Invii WhatsApp</div>
        </div>
        <div class="card" style="text-align:center;padding:20px 12px;">
          <div style="font-size:28px;font-weight:800;color:#15803d;">${nComp}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Completati</div>
        </div>
        <div class="card" style="text-align:center;padding:20px 12px;">
          <div style="font-size:28px;font-weight:800;color:${perc>=70?'#15803d':perc>=40?'#d97706':'#dc2626'};">${perc}%</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Tasso risposta</div>
        </div>
      </div>

      <!-- Medie domande scala -->
      ${medie.length > 0 ? `
        <div class="card">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:16px;">📊 Medie domande scala (1-5)</div>
          ${medie.map(d => `
            <div style="margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:13px;color:#374151;">${d.testo}</span>
                <span style="font-size:15px;font-weight:700;color:${d.media ? colore_scala(parseFloat(d.media)) : '#94a3b8'};">
                  ${d.media ? emoji_scala(Math.round(parseFloat(d.media))) + ' ' + d.media : '—'}
                </span>
              </div>
              <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${d.media ? (parseFloat(d.media)/5)*100 : 0}%;background:${d.media ? colore_scala(parseFloat(d.media)) : '#e2e8f0'};border-radius:4px;transition:width .4s;"></div>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${d.n} risposte</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Azioni -->
      ${surveySelezionato?.stato !== 'chiuso' ? `
        <div class="card">
          <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px;">⚡ Azioni</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${surveySelezionato?.stato === 'bozza' ? `
              <button id="btn-invia-survey" style="background:#25D366;color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;">
                📤 Invia WhatsApp a tutti i dipendenti
              </button>
            ` : ''}
            ${surveySelezionato?.stato === 'attivo' ? `
              <button id="btn-reinvia-survey" style="background:#f1f5f9;color:#374151;border:1px solid #e5e7eb;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;">
                🔄 Reinvia a chi non ha risposto
              </button>
              <button id="btn-chiudi-survey" style="background:#fee2e2;color:#dc2626;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:13px;">
                🔒 Chiudi survey
              </button>
            ` : ''}
          </div>
          <div id="sv-azione-esito" style="font-size:13px;margin-top:10px;min-height:14px;"></div>
        </div>
      ` : ''}
    `;

    // Listeners azioni
    container.querySelector('#btn-invia-survey')?.addEventListener('click', () => inviaSurvey(false));
    container.querySelector('#btn-reinvia-survey')?.addEventListener('click', () => inviaSurvey(true));
    container.querySelector('#btn-chiudi-survey')?.addEventListener('click', chiudiSurvey);
  }

  // ─── TAB RISPOSTE ─────────────────────────────────────────────────────────
  function renderRisposte(domande, risposte, invii) {
    const el = container.querySelector('#tab-risposte');
    if (!el) return;

    if (!risposte.length) {
      el.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:32px;">Nessuna risposta ancora.</div>';
      return;
    }

    // Mappa invio → dipendente
    const invioMap = Object.fromEntries(invii.map(i => [i.id, i]));

    el.innerHTML = domande.map(d => {
      const rDomanda = risposte.filter(r => r.domanda_id === d.id);
      if (!rDomanda.length) return '';

      let contenuto = '';

      if (d.tipo === 'scala') {
        const vals = rDomanda.map(r => r.risposta_scala).filter(Boolean);
        const media = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : '—';
        // Distribuzione
        const dist = [1,2,3,4,5].map(v => ({ v, n: vals.filter(x=>x===v).length }));
        contenuto = `
          <div style="font-size:24px;font-weight:800;color:${colore_scala(parseFloat(media))};margin-bottom:12px;">
            ${emoji_scala(Math.round(parseFloat(media)))} Media: ${media}/5
          </div>
          <div style="display:flex;gap:8px;align-items:flex-end;height:60px;margin-bottom:8px;">
            ${dist.map(({v,n}) => `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div style="font-size:11px;color:#64748b;">${n}</div>
                <div style="width:100%;background:${colore_scala(v)};border-radius:4px 4px 0 0;height:${vals.length?Math.max(4,(n/vals.length)*50):4}px;"></div>
                <div style="font-size:12px;">${emoji_scala(v)}</div>
              </div>
            `).join('')}
          </div>
          ${!d.anonima ? `
            <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
              ${rDomanda.map(r => {
                const inv = invioMap[r.invio_id];
                const dip = inv?.dipendenti;
                return dip ? `<span style="background:#f1f5f9;border-radius:8px;padding:4px 10px;font-size:12px;">
                  ${dip.nome} ${dip.cognome}: <strong>${emoji_scala(r.risposta_scala)} ${r.risposta_scala}</strong>
                </span>` : '';
              }).join('')}
            </div>
          ` : '<div style="font-size:11px;color:#94a3b8;margin-top:6px;">🔒 Domanda anonima</div>'}`;

      } else if (d.tipo === 'aperta') {
        contenuto = rDomanda.map(r => {
          const inv = invioMap[r.invio_id];
          const dip = inv?.dipendenti;
          return `
            <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:8px;border-left:3px solid ${d.anonima ? '#94a3b8' : '#7c3aed'};">
              ${!d.anonima && dip ? `<div style="font-size:11px;font-weight:600;color:#7c3aed;margin-bottom:4px;">${dip.nome} ${dip.cognome}</div>` : '<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">🔒 Anonimo</div>'}
              <div style="font-size:13px;color:#374151;line-height:1.6;">${r.risposta_testo || '—'}</div>
            </div>`;
        }).join('');

      } else if (d.tipo === 'scelta') {
        const opzioni = d.opzioni || [];
        const dist = opzioni.map(op => ({ op, n: rDomanda.filter(r => r.risposta_scelta === op).length }));
        contenuto = dist.map(({op, n}) => {
          const isAlert = (d.alert_valori || []).includes(op);
          const perc = rDomanda.length ? Math.round((n/rDomanda.length)*100) : 0;
          return `
            <div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                <span style="font-size:13px;color:${isAlert?'#dc2626':'#374151'};font-weight:${isAlert?'700':'400'};">
                  ${isAlert ? '⚠️ ' : ''}${op}
                </span>
                <span style="font-size:13px;font-weight:600;color:${isAlert?'#dc2626':'#374151'};">${n} (${perc}%)</span>
              </div>
              <div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${perc}%;background:${isAlert?'#dc2626':'#7c3aed'};border-radius:3px;"></div>
              </div>
            </div>`;
        }).join('');
        // Alert nominale
        const alertInvii = rDomanda.filter(r => r.alert_triggerato && !d.anonima);
        if (alertInvii.length > 0) {
          contenuto += `<div style="margin-top:10px;background:#fee2e2;border-radius:8px;padding:10px 12px;font-size:12px;color:#dc2626;">
            ⚠️ Attenzione: ${alertInvii.length} dipendente${alertInvii.length>1?'i':''} ha risposto in modo preoccupante.
          </div>`;
        }
      }

      return `
        <div class="card" style="margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="font-size:11px;background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:10px;">${d.ordine}</span>
            <span style="font-size:14px;font-weight:600;color:#0f172a;">${d.testo}</span>
            ${d.anonima ? '<span style="background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:10px;font-size:11px;">🔒 Anonima</span>' : ''}
          </div>
          ${contenuto}
        </div>`;
    }).join('');
  }

  // ─── TAB INVII ────────────────────────────────────────────────────────────
  function renderInvii(invii, dipendenti, sid) {
    const el = container.querySelector('#tab-invii');
    if (!el) return;

    if (!invii.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:32px;color:#64748b;">
          <div style="font-size:28px;margin-bottom:8px;">📤</div>
          <div>Nessun invio ancora. Vai in Overview e invia il survey.</div>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div style="font-size:13px;color:#64748b;margin-bottom:12px;">${invii.filter(i=>i.completato).length} / ${invii.length} completati</div>
      ${invii.map(i => {
        const dip = i.dipendenti || dipendenti.find(d => d.id === i.dipendente_id);
        return `
          <div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 16px;">
            <div style="width:36px;height:36px;background:#f1f5f9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">
              ${dip?.foto_url ? `<img src="${dip.foto_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">` : '👤'}
            </div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:14px;">${dip?.nome || '—'} ${dip?.cognome || ''}</div>
              <div style="font-size:12px;color:#64748b;">Inviato: ${i.whatsapp_inviato ? '✅' : '❌'} ${i.whatsapp_inviato ? new Date(i.created_at).toLocaleDateString('it-IT') : 'non inviato'}</div>
            </div>
            <div style="flex-shrink:0;">
              ${i.completato
                ? `<span style="background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">✅ Completato</span>`
                : `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">⏳ In attesa</span>`
              }
            </div>
          </div>`;
      }).join('')}`;
  }

  // ─── INVIA SURVEY ─────────────────────────────────────────────────────────
  async function inviaSurvey(soloNonRispondenti = false) {
    const esito = container.querySelector('#sv-azione-esito');
    if (!confirm(soloNonRispondenti
      ? 'Inviare un reminder via WhatsApp a chi non ha ancora risposto?'
      : 'Inviare il survey via WhatsApp a TUTTI i dipendenti attivi?')) return;

    esito.textContent = '⏳ Invio in corso...'; esito.style.color = '#64748b';

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/survey-invia-ts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          survey_id: surveySelezionato.id,
          azienda_id: aziendaId,
          solo_non_rispondenti: soloNonRispondenti,
        })
      });
      const data = await res.json();
      if (data.success) {
        esito.textContent = `✅ Inviato a ${data.inviati} dipendenti`;
        esito.style.color = '#15803d';
        setTimeout(() => render(container), 2000);
      } else {
        esito.textContent = '❌ ' + (data.error || 'Errore');
        esito.style.color = '#dc2626';
      }
    } catch(e) {
      esito.textContent = '❌ ' + e.message;
      esito.style.color = '#dc2626';
    }
  }

  // ─── CHIUDI SURVEY ────────────────────────────────────────────────────────
  async function chiudiSurvey() {
    if (!confirm('Chiudere il survey? I dipendenti non potranno più rispondere.')) return;
    await supa().from('survey').update({ stato: 'chiuso', chiuso_il: new Date().toISOString() }).eq('id', surveySelezionato.id);
    render(container);
  }

  renderMain();
  if (surveySelezionato) setTimeout(() => caricaContenuto(), 100);
}
