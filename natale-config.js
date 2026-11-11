/* PRANZO DI NATALE 2026 — configurazione unica per le pagine natale-aquila.html, natale-campoantico.html e natale-prenotazione.html.
   Finche' prezzo, orario, posti e menu sono vuoti (null / []) le pagine mostrano "prenotazioni a breve" e il modulo resta chiuso.
   Quando sono tutti compilati la prenotazione si apre da sola.
   prezzo, prezzo_bimbi, comprende, disdetta e ora possono essere un valore solo oppure uno per locale: { aquila: ..., campoantico: ... } */
window.NATALE = {
  data: "2026-12-25",          // venerdi' 25 dicembre 2026
  perc: 30,                    // acconto in percentuale sul totale
  ora: "13:00",                // orario d'inizio
  prezzo: { aquila: 50, campoantico: 55 },   // euro a persona (adulti): Trattoria 50, Campo Antico 55
  prezzo_bimbi: 30,            // menu bambini
  eta_bimbi: "4-12 anni",
  capienza: { aquila: 100, campoantico: 150 },   // posti disponibili per locale
  comprende: {
    aquila: "Il menu completo e le bevande.",
    campoantico: "Il menu completo, i vini, il caffè e i digestivi."
  },
  disdetta: null,              // regola di disdetta: finche' e' vuota la domanda non compare nella pagina
  menu: [
    { titolo: "Antipasto", piatti: ["Antipasto della tradizione"] },
    { titolo: "Primo", piatti: ["Tortellini in brodo distillato di cappone", "Pappardella rossa ripiena di ricotta e borragine, gratinata al Parmigiano Reggiano"] },
    { titolo: "Secondo", piatti: ["Brasato al Sagrantino con spuma di patate e spinaci scottati al burro"] },
    { titolo: "Dolce", piatti: ["Panettone fatto da noi ai frutti di bosco, con crema chantilly"] },
    { titolo: "Menu bambini", piatti: ["Antipasto", "Lasagna", "Cotolette di pollo", "Patatine"] }
  ]
};
