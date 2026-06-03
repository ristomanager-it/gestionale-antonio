// js/utils/candidature-scoring.js
// Motore di scoring per le candidature Ristoflow
// Analizza le risposte libere e assegna un punteggio per ognuno dei 7 indicatori

// ─── DIZIONARIO KEYWORD ───────────────────────────────────────────────────────
// Ogni indicatore ha keyword positive (peso +) e negative (peso -)
// I pesi sono calibrati: più specifica la keyword, più alto il peso

const INDICATORI = {

  curiosita: {
    label: 'Curiosità attiva',
    emoji: '🔍',
    colore: '#8b5cf6',
    positivi: [
      { kw: ['imparato da solo', 'ho studiato da solo', 'mi sono messo a studiare'],       peso: 3 },
      { kw: ['volevo capire come', 'volevo capire perché', 'mi chiedevo come'],            peso: 3 },
      { kw: ['per curiosità', 'per pura curiosità', 'mi incuriosiva'],                     peso: 2 },
      { kw: ['ho approfondito', 'ho ricercato', 'ho letto', 'ho studiato'],                peso: 2 },
      { kw: ['ho imparato', 'mi sono informato', 'mi sono documentato'],                   peso: 1 },
      { kw: ['non sapevo e ho cercato', 'non capivo e ho chiesto'],                        peso: 2 },
      { kw: ['fuori dall\'orario', 'dopo il lavoro', 'nel tempo libero'],                  peso: 2 },
    ],
    negativi: [
      { kw: ['non mi interessa', 'non ho tempo', 'non serve'],                             peso: -2 },
      { kw: ['lo fanno gli altri', 'qualcuno mi spiegherà'],                               peso: -2 },
    ]
  },

  crescita: {
    label: 'Voglia di crescita',
    emoji: '📈',
    colore: '#10b981',
    positivi: [
      { kw: ['voglio diventare', 'voglio crescere', 'voglio arrivare', 'voglio costruire'], peso: 3 },
      { kw: ['tra 5 anni', 'tra 3 anni', 'nel futuro voglio', 'obiettivo a lungo'],        peso: 2 },
      { kw: ['sto imparando', 'sto studiando', 'sto migliorando', 'sto lavorando su'],     peso: 2 },
      { kw: ['migliorare sempre', 'non mi accontento', 'voglio di più'],                   peso: 3 },
      { kw: ['investire su me stesso', 'formarmi', 'crescere professionalmente'],          peso: 2 },
      { kw: ['obiettivo', 'traguardo', 'ambizione', 'sogno professionale'],                peso: 1 },
      { kw: ['non voglio fermarmi', 'non mi fermo', 'vado avanti'],                        peso: 2 },
    ],
    negativi: [
      { kw: ['stabile', 'tranquillo', 'non cambiare', 'restare dove sono'],                peso: -2 },
      { kw: ['non so', 'vedremo', 'non ci ho pensato', 'non ho piani'],                    peso: -1 },
    ]
  },

  responsabilita: {
    label: 'Responsabilità',
    emoji: '🎯',
    colore: '#f59e0b',
    positivi: [
      { kw: ['ho sbagliato', 'errore mio', 'colpa mia', 'mi sono sbagliato'],              peso: 3 },
      { kw: ['ho rimediato', 'ho corretto', 'ho sistemato', 'ho risolto'],                 peso: 3 },
      { kw: ['mi sono assunto la responsabilità', 'ho preso in carico'],                   peso: 3 },
      { kw: ['non ho scaricato', 'non ho dato la colpa', 'ho ammesso'],                    peso: 2 },
      { kw: ['avrei dovuto', 'avrei potuto fare meglio', 'la prossima volta'],             peso: 2 },
      { kw: ['mi sono impegnato', 'ho dato il massimo', 'ho fatto la mia parte'],          peso: 1 },
    ],
    negativi: [
      { kw: ['colpa di', 'per colpa del', 'è stato lui', 'è stata lei', 'sono stati loro'], peso: -3 },
      { kw: ['non dipendeva da me', 'non potevo fare nulla', 'era inevitabile'],           peso: -2 },
      { kw: ['il capo non', 'i colleghi non', 'l\'azienda non'],                           peso: -1 },
      { kw: ['nessuno mi aveva detto', 'nessuno mi ha spiegato', 'non mi hanno formato'],  peso: -2 },
    ]
  },

  mentalita_positiva: {
    label: 'Mentalità positiva',
    emoji: '💡',
    colore: '#0ea5e9',
    positivi: [
      { kw: ['ho trovato il modo', 'ho trovato una soluzione', 'si può fare'],             peso: 3 },
      { kw: ['ho proposto', 'ho suggerito', 'ho migliorato', 'ho ottimizzato'],            peso: 2 },
      { kw: ['opportunità', 'occasione per imparare', 'esperienza utile'],                 peso: 2 },
      { kw: ['positivo', 'costruttivo', 'affrontare', 'superare'],                         peso: 1 },
      { kw: ['invece di lamentarmi', 'invece di aspettare', 'ho agito'],                   peso: 3 },
    ],
    negativi: [
      { kw: ['impossibile', 'non si può', 'non serve a niente', 'inutile'],                peso: -3 },
      { kw: ['sempre così', 'è sempre stato così', 'non cambierà mai'],                    peso: -2 },
      { kw: ['non hanno capito', 'non ascoltano', 'ci provai ma tanto'],                   peso: -2 },
      { kw: ['mi lamento', 'mi lamentavo', 'non sopporto', 'odio quando'],                 peso: -1 },
    ]
  },

  pressione: {
    label: 'Resistenza alla pressione',
    emoji: '💪',
    colore: '#ef4444',
    positivi: [
      { kw: ['sotto pressione', 'situazione difficile', 'momento critico'],                peso: 1 },
      { kw: ['ce l\'ho fatta', 'l\'ho superata', 'ne sono uscito', 'ho retto'],            peso: 3 },
      { kw: ['più carico c\'è', 'adoro il caos', 'mi piace quando è intenso'],             peso: 3 },
      { kw: ['non mi sono perso', 'sono rimasto lucido', 'ho mantenuto la calma'],         peso: 3 },
      { kw: ['12 ore', '14 ore', 'turno lungo', 'doppio turno', 'senza pausa'],            peso: 2 },
      { kw: ['servizio pieno', 'locale pieno', 'sala piena', 'tutto esaurito'],            peso: 2 },
      { kw: ['stressante ma', 'duro ma', 'difficile ma', 'faticoso ma'],                   peso: 2 },
      { kw: ['ho resistito', 'ho tenuto duro', 'non ho mollato'],                          peso: 2 },
    ],
    negativi: [
      { kw: ['non reggo', 'non riesco sotto pressione', 'mi blocco'],                      peso: -3 },
      { kw: ['troppo stress', 'non ne posso più', 'sono esaurito'],                        peso: -2 },
      { kw: ['ho abbandonato', 'me ne sono andato', 'ho lasciato'],                        peso: -1 },
    ]
  },

  leadership: {
    label: 'Leadership potenziale',
    emoji: '🏆',
    colore: '#f43f5e',
    positivi: [
      { kw: ['ho aiutato il collega', 'ho formato', 'ho insegnato', 'ho guidato'],         peso: 3 },
      { kw: ['ho organizzato', 'ho coordinato', 'ho gestito il team', 'ho diretto'],       peso: 3 },
      { kw: ['ho preso l\'iniziativa', 'ho deciso io', 'ho gestito la situazione'],        peso: 2 },
      { kw: ['senza che nessuno me lo chiedesse', 'di mia iniziativa', 'spontaneamente'],  peso: 3 },
      { kw: ['ho motivato', 'ho supportato il team', 'ho tenuto alta la morale'],          peso: 2 },
      { kw: ['ho proposto al responsabile', 'ho parlato con il titolare'],                 peso: 1 },
    ],
    negativi: [
      { kw: ['aspettavo ordini', 'aspettavo che qualcuno', 'aspettavo istruzioni'],        peso: -2 },
      { kw: ['non era compito mio', 'non spettava a me decidere'],                         peso: -1 },
    ]
  },

  mentalita_proprietario: {
    label: 'Mentalità da proprietario',
    emoji: '⭐',
    colore: '#f59e0b',
    peso_moltiplicatore: 1.5,                // questo indicatore vale di più
    positivi: [
      { kw: ['non era richiesto ma', 'nessuno me lo aveva chiesto ma', 'non era compito mio ma'], peso: 4 },
      { kw: ['dopo il turno', 'a fine servizio', 'dopo le 12 ore', 'fuori orario'],        peso: 4 },
      { kw: ['ho voluto capire come funzionava', 'volevo sapere perché', 'mi interessava capire'], peso: 3 },
      { kw: ['ho fatto in più', 'ho dato qualcosa in più', 'ho superato quello che mi chiedevano'], peso: 3 },
      { kw: ['mi sono fermato dopo', 'sono rimasto oltre', 'non sono andato via subito'],  peso: 3 },
      { kw: ['ho proposto un miglioramento', 'ho suggerito una modifica', 'ho ottimizzato'], peso: 2 },
      { kw: ['trattavo il locale come mio', 'come se fosse mio', 'come un proprietario'], peso: 4 },
      { kw: ['senza aspettare', 'da solo', 'di mia sponte', 'autonomamente'],              peso: 2 },
      { kw: ['per il puro piacere', 'per passione', 'perché mi piaceva', 'non per obbligo'], peso: 3 },
    ],
    negativi: [
      { kw: ['aspettavo', 'aspettato', 'nessuno mi diceva', 'nessuno mi spiegava'],        peso: -3 },
      { kw: ['non era compito mio e quindi', 'non ero pagato per'],                        peso: -4 },
      { kw: ['finito il turno sono andato', 'finite le ore sono uscito'],                  peso: -2 },
      { kw: ['non mi riguardava', 'non era affar mio'],                                    peso: -3 },
    ]
  }
};

// ─── FUNZIONE PRINCIPALE DI SCORING ──────────────────────────────────────────
// Analizza il testo di una risposta e ritorna i punteggi per ogni indicatore
export function analizzaRisposta(testo) {
  if (!testo || testo.trim().length < 10) {
    return { scores: {}, keywords_positive: [], keywords_negative: [], score_totale: 0 };
  }

  const testoNorm = testo.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // rimuove accenti
    .replace(/['']/g, "'");

  const scores = {};
  const keywords_positive = [];
  const keywords_negative = [];

  for (const [nomeIndicatore, indicatore] of Object.entries(INDICATORI)) {
    let punti = 0;

    // Keyword positive
    for (const { kw, peso } of (indicatore.positivi || [])) {
      for (const k of kw) {
        const kNorm = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['']/g, "'");
        if (testoNorm.includes(kNorm)) {
          punti += peso;
          keywords_positive.push({ indicatore: nomeIndicatore, keyword: k, peso });
          break; // conta solo una volta per gruppo
        }
      }
    }

    // Keyword negative
    for (const { kw, peso } of (indicatore.negativi || [])) {
      for (const k of kw) {
        const kNorm = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['']/g, "'");
        if (testoNorm.includes(kNorm)) {
          punti += peso; // peso è già negativo
          keywords_negative.push({ indicatore: nomeIndicatore, keyword: k, peso });
          break;
        }
      }
    }

    // Bonus lunghezza risposta (chi scrive di più ci pensa di più)
    const parole = testo.trim().split(/\s+/).length;
    if (parole > 80)       punti += 2;
    else if (parole > 40)  punti += 1;
    else if (parole < 15)  punti -= 1;

    // Applica moltiplicatore se presente
    const moltiplicatore = indicatore.peso_moltiplicatore || 1;
    scores[nomeIndicatore] = Math.max(0, Math.min(10, punti * moltiplicatore));
  }

  // Score totale = media pesata (mentalita_proprietario vale 1.5x)
  const pesi = { curiosita: 1, crescita: 1, responsabilita: 1, mentalita_positiva: 1, pressione: 1, leadership: 1, mentalita_proprietario: 1.5 };
  const totPesi = Object.values(pesi).reduce((a, b) => a + b, 0);
  const scorePesato = Object.entries(scores).reduce((acc, [k, v]) => acc + v * (pesi[k] || 1), 0);
  const score_totale = Math.round((scorePesato / totPesi) * 10) / 10;

  return { scores, keywords_positive, keywords_negative, score_totale };
}

// ─── AGGREGA I PUNTEGGI DI TUTTE LE RISPOSTE ─────────────────────────────────
export function calcolaPunteggioTotale(risposte) {
  const aggregato = { curiosita: 0, crescita: 0, responsabilita: 0, mentalita_positiva: 0, pressione: 0, leadership: 0, mentalita_proprietario: 0 };
  let nRisposte = 0;

  for (const risposta of risposte) {
    if (!risposta.risposta || risposta.risposta.trim().length < 5) continue;
    const { scores } = analizzaRisposta(risposta.risposta);
    for (const [k, v] of Object.entries(scores)) {
      if (aggregato[k] !== undefined) aggregato[k] += v;
    }
    nRisposte++;
  }

  if (nRisposte === 0) return { ...aggregato, score_totale: 0 };

  // Media per indicatore
  for (const k of Object.keys(aggregato)) aggregato[k] = Math.round((aggregato[k] / nRisposte) * 10) / 10;

  // Score totale pesato
  const pesi = { curiosita: 1, crescita: 1, responsabilita: 1, mentalita_positiva: 1, pressione: 1, leadership: 1, mentalita_proprietario: 1.5 };
  const totPesi = Object.values(pesi).reduce((a, b) => a + b, 0);
  const scorePesato = Object.entries(aggregato).reduce((acc, [k, v]) => acc + v * (pesi[k] || 1), 0);
  const score_totale = Math.round((scorePesato / totPesi) * 10) / 10;

  return { ...aggregato, score_totale };
}

// ─── RENDER BADGE PUNTEGGIO ───────────────────────────────────────────────────
export function badgeScore(score) {
  if (score >= 7)  return { label: 'Eccellente', bg: '#dcfce7', color: '#15803d', emoji: '🔥' };
  if (score >= 5)  return { label: 'Buono',      bg: '#fef3c7', color: '#92400e', emoji: '✅' };
  if (score >= 3)  return { label: 'Da valutare',bg: '#f1f5f9', color: '#475569', emoji: '⚠️' };
  return               { label: 'Basso',         bg: '#fee2e2', color: '#dc2626', emoji: '❌' };
}

// ─── RENDER BARRA INDICATORE ──────────────────────────────────────────────────
export function barraIndicatore(nome, valore, maxValore = 10) {
  const ind = INDICATORI[nome];
  if (!ind) return '';
  const pct = Math.min(100, (valore / maxValore) * 100);
  return `
    <div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span style="font-size:12px;color:#374151;font-weight:500;">${ind.emoji} ${ind.label}${nome === 'mentalita_proprietario' ? ' ⭐' : ''}</span>
        <span style="font-size:12px;font-weight:700;color:${ind.colore};">${valore}/10</span>
      </div>
      <div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${ind.colore};border-radius:3px;transition:width .3s;"></div>
      </div>
    </div>`;
}

// Esporta i metadati degli indicatori per usarli nella UI
export { INDICATORI };
