/* PRANZO DI NATALE 2026 — configurazione unica per le pagine natale-aquila.html, natale-campoantico.html e natale-prenotazione.html.
   Finche' prezzo, orario, posti e menu sono vuoti (null / []) le pagine mostrano "prenotazioni a breve" e il modulo resta chiuso.
   Quando sono tutti compilati la prenotazione si apre da sola. */
window.NATALE = {
  data: "2026-12-25",          // venerdi' 25 dicembre 2026
  perc: 30,                    // acconto in percentuale sul totale
  ora: null,                   // orario d'inizio, es. "12:30"
  prezzo: null,                // euro a persona (adulti), es. 65
  prezzo_bimbi: null,          // euro per un bambino, es. 30
  eta_bimbi: "4-12 anni",
  capienza: { aquila: null, campoantico: null },   // posti disponibili per locale, es. 80
  comprende: null,             // cosa comprende il prezzo, es. "Il menu completo che vedi sopra, acqua, vino della casa e caffè."
  disdetta: null,              // regola di disdetta, es. "Disdicendo entro il 20 dicembre ricevi un buono del valore dell'acconto."
  menu: []                     // es. [{ titolo: "Antipasti", piatti: ["...", "..."] }, { titolo: "Primi", piatti: ["..."] }]
};
