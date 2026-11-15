const E = require("../www/escpos.js");
const casi = require("./casi.json");
const ora = new Date("2026-11-15T11:45:00Z");
for (const c of casi) console.log(E.base64(E.comanda(c, 42, ora)));
console.log(E.base64(E.prova("Ciao è €")));
