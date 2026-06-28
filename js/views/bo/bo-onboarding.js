// bo-onboarding.js — Guida configurazione Ristoflow
// "Costruisci il tuo Ristoflow" — 6 livelli, 20 step

export async function render(container) {
  const supa = () => window.supabaseClient || window.supabase;
  const aziendaId = window.state?.azienda?.id;
  const sedeId = window.state?.sedeAttiva?.id;
  const isAdmin = ['admin','manager','superadmin'].includes(window.state?.ruolo);

  const LIVELLI = [
    {
      id: 'identita',
      n: 1,
      icona: '🎯',
      titolo: 'Identità & Brand',
      tempo: '20 min',
      colore: '#0E5A7A',
      perche: 'Le persone non comprano cosa fai — comprano perché lo fai. Un cliente entra nel tuo locale non per il menu, ma perché si fida di te. E quella fiducia nasce da una visione chiara di chi sei.',
      cosa_succede: 'Senza identità, Tony AI risponde in modo generico, il sito è vuoto, le campagne non convertono. Tutto il sistema lavora al minimo.',
      cosa_cambia: 'Con l\'identità configurata, ogni testo generato da Tony, ogni post social, ogni campagna Meta parla con la tua voce e attrae il tuo cliente ideale.',
      steps: [
        { id:'gc', titolo:'Golden Circle (WHY/HOW/WHAT)', desc:'Il perché della tua esistenza — la tua mission profonda. Non "serviamo buon cibo" ma il vero motivo per cui sei qui.', dove:'Configurazione → Identità', route:'bo-configurazione', tab:'identita', urgente:true },
        { id:'cliente', titolo:'Cliente ideale', desc:'Chi è il cliente che vuoi attirare? Età, abitudini, valori. Tony AI e le tue campagne parleranno esattamente a lui.', dove:'Configurazione → Identità', route:'bo-configurazione', tab:'identita', urgente:true },
        { id:'tov', titolo:'Tono di voce & Parole chiave', desc:'Come parli ai tuoi clienti? Formale o informale? Caldo o professionale? Questo diventa il DNA di tutta la tua comunicazione.', dove:'Configurazione → Identità', route:'bo-configurazione', tab:'identita', urgente:false },
      ]
    },
    {
      id: 'operativo',
      n: 2,
      icona: '🏠',
      titolo: 'Struttura Operativa',
      tempo: '30 min',
      colore: '#059669',
      perche: 'Un locale organizzato non è solo più efficiente — è più redditizio. Ogni minuto perso a cercare informazioni, a ripetere istruzioni, a gestire il caos è un euro che esce dal tuo margine.',
      cosa_succede: 'Senza struttura operativa, il sistema non sa come sei organizzato. Le prenotazioni non hanno sala, la cucina non ha settori, il personale non ha ruoli.',
      cosa_cambia: 'Con la struttura configurata puoi delegare, formare, far crescere il team. Meno sprechi, più margine. L\'organizzazione libera te.',
      steps: [
        { id:'sede', titolo:'Dati sede & orari', desc:'Indirizzo, orari di apertura, giorni di chiusura. La base da cui parte tutto — prenotazioni, sito, WhatsApp.', dove:'Configurazione → Operativo', route:'bo-configurazione', tab:'operativo', urgente:true },
        { id:'sala', titolo:'Sale & tavoli', desc:'Disegna la piantina della tua sala. Ogni tavolo con coperti e nome. Il sistema gestirà le prenotazioni e la cassa per tavolo.', dove:'Configurazione → Sala', route:'bo-configurazione', tab:'sala', urgente:true },
        { id:'settori', titolo:'Settori cucina', desc:'Cucina calda, fredda, pizzeria, bar — definisci i settori. Il display cucina mostrerà gli ordini al reparto giusto.', dove:'Configurazione → Operativo', route:'bo-configurazione', tab:'operativo', urgente:false },
        { id:'personale', titolo:'Personale & PIN', desc:'Aggiungi i tuoi collaboratori con ruolo e PIN. Ognuno accede solo alle sue funzioni. Puoi vedere chi fa cosa e quando.', dove:'Dipendenti → Nuovo dipendente', route:'dipendenti', urgente:true },
      ]
    },
    {
      id: 'connessioni',
      n: 3,
      icona: '📡',
      titolo: 'Canali & Connessioni',
      tempo: '45 min',
      colore: '#7C3AED',
      perche: 'Ogni prenotazione persa è un tavolo regalato alla concorrenza. Alle 20:00 nel caos del servizio non puoi rispondere al telefono — ma il form online e WhatsApp lavorano per te 24 ore su 24.',
      cosa_succede: 'Senza connessioni attive, i clienti chiamano e tu non rispondi. Il sito non esiste. WhatsApp non risponde. Perdi clienti ogni giorno senza saperlo.',
      cosa_cambia: 'Il form prenotazione lavora mentre sei in servizio. WhatsApp risponde in automatico. Il sito converte chi ti cerca su Google. Tre canali che portano tavoli.',
      steps: [
        { id:'wa', titolo:'WhatsApp Business', desc:'Connetti il tuo numero WhatsApp Business. Da qui partono le conferme prenotazione, i reminder, le comunicazioni automatiche ai clienti.', dove:'Configurazione → Integrazioni', route:'bo-configurazione', tab:'integrazioni', urgente:true },
        { id:'form', titolo:'Form prenotazione online', desc:'Configura il form di prenotazione — orari disponibili, servizi (pranzo/cena/aperitivo), regole. Il link va sul sito e sui social.', dove:'Configurazione → Prenotazioni', route:'bo-configurazione', tab:'prenotazioni', urgente:true },
        { id:'chatbot', titolo:'Chatbot WhatsApp', desc:'Attiva il chatbot che risponde automaticamente su WhatsApp. Il cliente scrive, il bot prende la prenotazione — anche alle 23:00.', dove:'Marketing & CRM → Chatbot', route:'bo-chatbot', urgente:false },
        { id:'sito', titolo:'Sito web', desc:'Genera il tuo sito in 5 minuti — home, chi siamo, menu, contatti. Si pubblica automaticamente. Il tuo biglietto da visita digitale.', dove:'Marketing & CRM → Sito', route:'bo-sito', urgente:true },
      ]
    },
    {
      id: 'contenuti',
      n: 4,
      icona: '🤖',
      titolo: 'Contenuti & Tony AI',
      tempo: '60 min',
      colore: '#B45309',
      perche: 'Tony non è un chatbot — è il tuo direttore operativo digitale. Controlla il food cost, ti dice quali piatti guadagnano e quali ti costano, gestisce il magazzino e gli ordini, tiene d\'occhio il team.',
      cosa_succede: 'Senza ricettario, menu e dati, Tony risponde nel vuoto. Non sa cosa vendi, quanto costa, cosa piace. Le sue analisi sono generiche e inutili.',
      cosa_cambia: 'Con il ricettario completo e la dettatura Tony, ogni mattina hai un briefing reale — cosa produrre, cosa spingere, cosa eliminare. Il menu digitale con foto belle vende di più.',
      steps: [
        { id:'foto', titolo:'Foto del locale & piatti', desc:'Carica almeno 5-10 foto di qualità — sala, piatti, cucina, team. Le foto vanno sul sito, sul menu digitale, sui social. Sono il tuo strumento di vendita n°1.', dove:'Media & Libreria', route:'bo-media', urgente:true },
        { id:'menu', titolo:'Menu digitale & prezzi', desc:'Inserisci i tuoi piatti con foto, descrizione e prezzo. I clienti al tavolo lo vedono dal QR. Tony lo usa per le analisi. Il sito lo mostra ai potenziali clienti.', dove:'Menu → Prodotti', route:'prodotti', urgente:true },
        { id:'ricettario', titolo:'Ricettario & food cost', desc:'Le ricette con ingredienti e grammature attivano il controllo food cost automatico. Tony sa quanto ti costa ogni piatto e ti dice dove stai perdendo margine.', dove:'Cucina → Ricettario', route:'ricettario', urgente:false },
        { id:'tony', titolo:'Dettatura guidata Tony AI', desc:'8 domande, 10 minuti. Tony impara chi sei, come lavori, cosa hai già provato. Da quel momento ogni risposta è personalizzata per il tuo locale.', dove:'Tony AI → 🧠 Memoria', route:'ai', urgente:true },
      ]
    },
    {
      id: 'economia',
      n: 5,
      icona: '💰',
      titolo: 'Controllo Economico',
      tempo: '30 min',
      colore: '#DC2626',
      perche: 'Sapere quanto guadagni non è un optional — è la differenza tra sopravvivere e prosperare. Il ragioniere interno lavora in tempo reale, non aspetta la chiusura mensile.',
      cosa_succede: 'Senza controllo economico lavori alla cieca. Sai che incassi ma non sai se guadagni. Il commercialista riceve dati in ritardo e a fine anno le sorprese sono brutte.',
      cosa_cambia: 'Con il bilancio live sai ogni giorno dove sei. Il commercialista accede direttamente ai dati — niente telefonate, niente scartoffie. Tu hai tempo per fare il ristoratore.',
      steps: [
        { id:'categorie', titolo:'Categorie di spesa', desc:'Configura le categorie di acquisto (materie prime, utenze, personale, manutenzione). Il sistema classifica automaticamente le fatture per categoria e IVA.', dove:'Acquisti → Fatture', route:'acquisti', urgente:true },
        { id:'fornitori', titolo:'Anagrafica fornitori', desc:'Aggiungi i tuoi fornitori con PIVA e dati. Ogni ordine e fattura sarà collegato. Il sistema monitora i prezzi e ti avvisa se aumentano.', dove:'Acquisti → Fornitori', route:'acquisti', urgente:true },
        { id:'commercialista', titolo:'Accesso commercialista', desc:'Crea un accesso consulente per il tuo commercialista. Vede bilancio, IVA e movimenti in tempo reale. Niente più raccolta documenti a fine mese.', dove:'Configurazione → Consulenti', route:'bo-consulenti', urgente:false },
      ]
    },
    {
      id: 'hr',
      n: 6,
      icona: '👥',
      titolo: 'HR & Personale',
      tempo: '30 min',
      colore: '#0891B2',
      perche: 'Il personale è il tuo asset più importante e il tuo costo più alto. Sapere esattamente quanto costa ogni turno, chi rende e chi no — non è burocrazia, è gestione.',
      cosa_succede: 'Senza HR configurato, il costo del lavoro è opaco. Non sai chi timbrare, chi ha ferie arretrate, quanto costa ogni servizio. Il consulente del lavoro lavora su dati incompleti.',
      cosa_cambia: 'Con le timbrature GPS e i fascicoli dipendente, il consulente del lavoro ha tutto in tempo reale. Tu vedi il costo del lavoro per ogni servizio. Il team sa che è tracciato e rispetta i tempi.',
      steps: [
        { id:'dipendenti', titolo:'Schede dipendenti complete', desc:'Per ogni collaboratore: contratto, ora di ingresso/uscita, costo orario, obiettivi. Il fascicolo digitale sostituisce i file Excel sparsi.', dove:'Personale → Dipendenti', route:'dipendenti', urgente:true },
        { id:'timbrature', titolo:'Timbrature & presenze', desc:'Attiva le timbrature con validazione GPS. Ogni turno viene tracciato automaticamente. Il report presenze è pronto per il consulente del lavoro.', dove:'Personale → Timbrature', route:'timbrature', urgente:true },
        { id:'consulente', titolo:'Accesso consulente del lavoro', desc:'Come per il commercialista, crea un accesso dedicato al consulente del lavoro. Vede presenze, contratti e richieste ferie in tempo reale.', dove:'Configurazione → Consulenti', route:'bo-consulenti', urgente:false },
      ]
    },
  ];

  // Calcola progresso totale steps
  const totSteps = LIVELLI.reduce((s,l) => s + l.steps.length, 0);

  container.innerHTML = `
  <style>
    .onb-wrap{max-width:860px;margin:0 auto;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    .onb-hero{background:linear-gradient(135deg,#0E5A7A,#1a7a9f);border-radius:20px;padding:28px 32px;color:white;margin-bottom:24px;}
    .onb-hero h1{font-size:24px;font-weight:800;margin-bottom:6px;}
    .onb-hero p{font-size:14px;opacity:.85;line-height:1.6;max-width:600px;}
    .onb-progress{background:rgba(255,255,255,.2);border-radius:20px;height:8px;margin-top:16px;}
    .onb-progress-fill{height:100%;border-radius:20px;background:white;transition:width .4s;}
    .onb-progress-label{font-size:12px;opacity:.8;margin-top:6px;}
    .onb-livello{background:white;border-radius:16px;border:1px solid #e5e7eb;margin-bottom:16px;overflow:hidden;}
    .onb-livello-header{padding:20px 24px;cursor:pointer;display:flex;align-items:center;gap:16px;}
    .onb-livello-header:hover{background:#f8fafc;}
    .onb-livello-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
    .onb-livello-info{flex:1;}
    .onb-livello-title{font-size:16px;font-weight:800;color:#111827;}
    .onb-livello-sub{font-size:12px;color:#64748b;margin-top:2px;}
    .onb-livello-badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap;}
    .onb-livello-body{display:none;border-top:1px solid #f1f5f9;}
    .onb-livello-body.open{display:block;}
    .onb-perche{padding:20px 24px;border-bottom:1px solid #f1f5f9;}
    .onb-perche-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;}
    .onb-perche-text{font-size:14px;color:#374151;line-height:1.7;font-style:italic;}
    .onb-dettagli{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px 24px;border-bottom:1px solid #f1f5f9;}
    @media(max-width:600px){.onb-dettagli{grid-template-columns:1fr;}}
    .onb-detail-box{background:#f8fafc;border-radius:10px;padding:12px 14px;}
    .onb-detail-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
    .onb-detail-text{font-size:13px;color:#374151;line-height:1.5;}
    .onb-steps{padding:16px 24px 20px;}
    .onb-step{display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:10px;margin-bottom:8px;border:1px solid #f1f5f9;transition:all .15s;}
    .onb-step:hover{background:#f8fafc;border-color:#e5e7eb;}
    .onb-step-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;margin-top:1px;}
    .onb-step-body{flex:1;}
    .onb-step-title{font-size:14px;font-weight:700;color:#111827;margin-bottom:2px;display:flex;align-items:center;gap:6px;}
    .onb-step-desc{font-size:13px;color:#64748b;line-height:1.5;margin-bottom:8px;}
    .onb-step-dove{font-size:11px;color:#94a3b8;}
    .onb-step-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:8px;border:none;font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;}
    .onb-urgente{background:#fee2e2;color:#991b1b;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;}
    .onb-tempo{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:6px 12px;font-size:12px;color:#0369a1;font-weight:600;display:inline-flex;align-items:center;gap:4px;}
  </style>

  <div class="onb-wrap">
    <div class="onb-hero">
      <h1>🚀 Costruisci il tuo Ristoflow</h1>
      <p>Segui questi 6 livelli nell'ordine. Ogni livello attiva il successivo e potenzia tutto il sistema. In circa 3 ore passi da zero al 100%.</p>
      <div class="onb-progress">
        <div class="onb-progress-fill" id="onb-fill" style="width:0%"></div>
      </div>
      <div class="onb-progress-label" id="onb-label">0 / ${totSteps} step completati</div>
    </div>

    <div id="onb-livelli"></div>

    <div style="background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;padding:16px 20px;margin-top:8px;">
      <div style="font-size:13px;color:#64748b;line-height:1.7;">
        💡 <strong>Suggerimento:</strong> Non devi fare tutto in un giorno.
        Inizia con i livelli 1, 2 e 3 — bastano per avere il sistema operativo e le prenotazioni che entrano.
        I livelli 4, 5 e 6 si attivano nelle settimane successive man mano che prendi confidenza.
      </div>
    </div>
  </div>`;

  // ── Funzioni globali definite PRIMA del render HTML ──────────────
  window.toggleOnbLivello = function(i) {
    const body = document.getElementById(`body-${i}`);
    const chev = document.getElementById(`chevron-${i}`);
    if (!body) return;
    const isOpen = body.classList.contains('open');
    document.querySelectorAll('.onb-livello-body').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('[id^="chevron-"]').forEach(c => c.style.transform = 'rotate(0deg)');
    if (!isOpen) {
      body.classList.add('open');
      if (chev) chev.style.transform = 'rotate(180deg)';
    }
  };

  window.vaiASezione = function(route, tab) {
    window.location.hash = tab ? `#/${route}?tab=${tab}` : `#/${route}`;
  };

  window.toggleStep = function(li, si) {
    const key = `onb_${aziendaId}_${li}_${si}`;
    const done = localStorage.getItem(key) === '1';
    if (done) localStorage.removeItem(key); else localStorage.setItem(key, '1');
    aggiornaStep(li, si);
    aggiornaBadge();
    aggiornaProgressGlobale();
  };

  // Render livelli
  const livelliEl = document.getElementById('onb-livelli');
  LIVELLI.forEach((liv, li) => {
    const div = document.createElement('div');
    div.className = 'onb-livello';
    div.innerHTML = `
      <div class="onb-livello-header" onclick="toggleOnbLivello(${li})">
        <div class="onb-livello-icon" style="background:${liv.colore}22;">
          <span>${liv.icona}</span>
        </div>
        <div class="onb-livello-info">
          <div class="onb-livello-title">Livello ${liv.n} — ${liv.titolo}</div>
          <div class="onb-livello-sub">${liv.steps.length} passaggi · <span class="onb-tempo">⏱ ${liv.tempo}</span></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="onb-livello-badge" id="badge-${li}" style="background:#f1f5f9;color:#64748b;">
            0 / ${liv.steps.length}
          </div>
          <span id="chevron-${li}" style="font-size:16px;color:#94a3b8;transition:transform .2s;">▼</span>
        </div>
      </div>
      <div class="onb-livello-body" id="body-${li}">
        <div class="onb-perche">
          <div class="onb-perche-label" style="color:${liv.colore};">💡 Perché è fondamentale</div>
          <div class="onb-perche-text">"${liv.perche}"</div>
        </div>
        <div class="onb-dettagli">
          <div class="onb-detail-box">
            <div class="onb-detail-label">❌ Senza questo</div>
            <div class="onb-detail-text">${liv.cosa_succede}</div>
          </div>
          <div class="onb-detail-box">
            <div class="onb-detail-label">✅ Con questo</div>
            <div class="onb-detail-text">${liv.cosa_cambia}</div>
          </div>
        </div>
        <div class="onb-steps">
          <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Passaggi</div>
          ${liv.steps.map((step, si) => `
          <div class="onb-step" id="step-${li}-${si}">
            <div class="onb-step-num" style="background:${liv.colore}22;color:${liv.colore};"
              onclick="toggleStep(${li},${si})" style="cursor:pointer;">${si+1}</div>
            <div class="onb-step-body">
              <div class="onb-step-title">
                ${step.titolo}
                ${step.urgente ? '<span class="onb-urgente">PRIORITÀ</span>' : ''}
              </div>
              <div class="onb-step-desc">${step.desc}</div>
              <div class="onb-step-dove">📍 Dove: ${step.dove}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;">
              <button class="onb-step-btn" style="background:${liv.colore};color:white;"
                onclick="vaiASezione('${step.route}','${step.tab||''}')">
                Vai →
              </button>
              <button class="onb-step-btn check-btn-${li}-${si}" style="background:#f1f5f9;color:#374151;"
                onclick="toggleStep(${li},${si})">
                ☐ Fatto
              </button>
            </div>
          </div>`).join('')}
        </div>
      </div>`;
    livelliEl.appendChild(div);
  });

  // Apri primo livello e carica stato
  toggleOnbLivello(0);
  caricaStatoOnboarding();

  function aggiornaStep(li, si) {
    const key = `onb_${aziendaId}_${li}_${si}`;
    const done = localStorage.getItem(key) === '1';
    const stepEl = document.getElementById(`step-${li}-${si}`);
    const numEl = stepEl?.querySelector('.onb-step-num');
    const btn = stepEl?.querySelector(`.check-btn-${li}-${si}`);
    if (!stepEl) return;
    if (done) {
      stepEl.style.background = '#f0fdf4';
      stepEl.style.borderColor = '#86efac';
      if (numEl) { numEl.textContent = '✓'; numEl.style.background = '#dcfce7'; numEl.style.color = '#16a34a'; }
      if (btn) { btn.textContent = '✓ Fatto'; btn.style.background = '#dcfce7'; btn.style.color = '#16a34a'; }
    } else {
      stepEl.style.background = '';
      stepEl.style.borderColor = '#f1f5f9';
      if (numEl) { numEl.textContent = String(si+1); numEl.style.background = `${LIVELLI[li].colore}22`; numEl.style.color = LIVELLI[li].colore; }
      if (btn) { btn.textContent = '☐ Fatto'; btn.style.background = '#f1f5f9'; btn.style.color = '#374151'; }
    }
  }

  function aggiornaBadge() {
    LIVELLI.forEach((liv, li) => {
      const done = liv.steps.filter((_, si) => localStorage.getItem(`onb_${aziendaId}_${li}_${si}`) === '1').length;
      const badge = document.getElementById(`badge-${li}`);
      if (!badge) return;
      badge.textContent = `${done} / ${liv.steps.length}`;
      if (done === liv.steps.length) {
        badge.style.background = '#dcfce7'; badge.style.color = '#16a34a';
      } else if (done > 0) {
        badge.style.background = '#fef9c3'; badge.style.color = '#854d0e';
      } else {
        badge.style.background = '#f1f5f9'; badge.style.color = '#64748b';
      }
    });
  }

  function aggiornaProgressGlobale() {
    let doneTot = 0;
    LIVELLI.forEach((liv, li) => {
      liv.steps.forEach((_, si) => {
        if (localStorage.getItem(`onb_${aziendaId}_${li}_${si}`) === '1') doneTot++;
      });
    });
    const pct = Math.round(doneTot / totSteps * 100);
    const fill = document.getElementById('onb-fill');
    const label = document.getElementById('onb-label');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = `${doneTot} / ${totSteps} step completati — ${pct}% configurato`;
  }

  function caricaStatoOnboarding() {
    LIVELLI.forEach((liv, li) => {
      liv.steps.forEach((_, si) => {
        if (localStorage.getItem(`onb_${aziendaId}_${li}_${si}`) === '1') {
          aggiornaStep(li, si);
        }
      });
    });
    aggiornaBadge();
    aggiornaProgressGlobale();
  }
}
