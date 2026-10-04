// js/views/guida-preparazioni.js
// Guida operativa "Preparazioni e lotti": si apre dal pulsante ❓ Come si usa e si può stampare.
// Stesso contenuto della guida stampabile (Claude Doc "Preparazioni e lotti — guida operativa").

const GUIDA_HTML = `
<h1>Preparazioni e lotti — guida operativa</h1>

<h2>A cosa serve</h2>
<p>Preparazioni trasforma una ricetta in un <b>lotto tracciato</b>: dosi calcolate, fasi HACCP registrate, scadenza, confezioni ed etichette. Alla registrazione il magazzino si aggiorna da solo.</p>
<ul>
  <li><b>Scarico ingredienti</b>: le materie prime usate escono dal magazzino, in proporzione a quanto hai prodotto davvero.</li>
  <li><b>Carico prodotto</b>: il prodotto finito entra in magazzino con il suo numero di lotto, diviso per confezione.</li>
  <li><b>Tracciabilità</b>: ogni lotto è firmato con il PIN dell'operatore e non si può più modificare.</li>
</ul>

<h2>Passo per passo</h2>
<p>Segui le schede dall'alto in basso: il lotto nasce solo al passo 10, prima puoi correggere tutto.</p>
<ol>
  <li><b>Scegli la ricetta.</b> Scrivi una parte del nome, anche a parole sparse ("base guacamole" trova "Base avocado per guacamole"). Con <b>👁 Vedi ricetta</b> leggi ingredienti e procedimento.</li>
  <li><b>Decidi quanto farne</b> (riquadro "Quanto ne devo fare").
    <ul>
      <li><i>Porzioni da fare</i>: scrivi il numero di porzioni e premi <b>Calcola le dosi</b>.</li>
      <li><i>Ho questa quantità di…</i>: scrivi quanto hai di un ingrediente (es. 3 kg di pelati) e il sistema calcola il resto.</li>
      <li>Ricette in stampo o teglia: nel riquadro <b>Stampo di oggi</b> scegli forma, misure e quanti pezzi, poi <b>Calcola le dosi per questo stampo</b>.</li>
    </ul>
  </li>
  <li><b>Punto di partenza</b> (solo ricette a stadi). <i>Entro da</i> = da dove inizi, <i>Chiudo a</i> = dove ti fermi, <i>Quanto ne ho</i> = quantità che hai in mano. Premi <b>Calcola ingredienti</b>. Se chiudi prima della fine, esce un semilavorato con un lotto suo.</li>
  <li><b>Dati lotto.</b> Controlla la data di produzione e inserisci il tuo <b>PIN operatore</b>: è la tua firma sul lotto. In <i>Note lotto / destinatario</i> scrivi per chi è (es. un evento): la nota esce anche in stampa.</li>
  <li><b>Fasi HACCP.</b> Le fasi arrivano dalla ricetta. Per ognuna compila ora di inizio e fine, temperatura rilevata ed esito; dove richiesto inserisci il pH. Se fai un passaggio in più, usa <b>➕ Aggiungi fase</b>.</li>
  <li><b>Pesa il prodotto finito</b>, prima di confezionarlo, e scrivi il peso in <i>Resa: peso totale reale prodotto (kg)</i>. Da questo il sistema calcola quanta materia prima scaricare e lo scarto rispetto alla resa teorica.</li>
  <li><b>Conservazione.</b> Scegli lo scenario (frigo o congelatore): scadenza e temperatura si compilano da sole. Se la tendina è vuota, il manager deve aggiungere gli scenari nella ricetta (Crea ricetta → Conservazione).</li>
  <li><b>Confezionamento.</b> Premi <b>+ Aggiungi confezione</b> per ogni formato: porzionatura, kg o pezzi per confezione, numero di confezioni. Il <i>Totale confezionato</i> deve avvicinarsi al peso reale; la differenza (ritagli, calo) è solo informativa.</li>
  <li><b>Coprodotti</b>, se ci sono (es. il brodo di cottura che tieni): <b>+ Aggiungi coprodotto</b> con quantità e unità.</li>
  <li><b>Registra.</b> Premi <b>💾 Registra / apri in Produzioni</b>. Nasce il lotto con il suo codice, firmato e non più modificabile; il magazzino scarica gli ingredienti e carica prodotto e coprodotti.</li>
</ol>

<h2>Etichette e stampe</h2>
<p>Dopo la registrazione si sbloccano i pulsanti di stampa nella scheda <b>Azioni</b>. Esce un'etichetta per ogni confezione.</p>
<table>
  <tr><th>Pulsante</th><th>Cosa fa</th><th>Quando usarlo</th></tr>
  <tr><td>🖨️ Stampa su etichettatrice</td><td>Manda le etichette alla Brother del laboratorio</td><td>Sempre, è la strada normale</td></tr>
  <tr><td>🏷 Stampa etichette (PDF)</td><td>Crea il PDF delle etichette</td><td>Se l'etichettatrice non è disponibile</td></tr>
  <tr><td>🏷 Stampa etichette coprodotti</td><td>Etichette dei coprodotti</td><td>Se hai registrato coprodotti</td></tr>
  <tr><td>📋 Stampa registro HACCP</td><td>Il registro con fasi, temperature e firme</td><td>Per il raccoglitore HACCP</td></tr>
  <tr><td>🖨 Stampa scheda produzione</td><td>La scheda di lavoro con dosi e fasi</td><td>Prima di iniziare, da tenere sul banco</td></tr>
</table>
<p>L'etichetta riporta prodotto, codice lotto, data di produzione, scadenza, temperatura di conservazione e la nota del lotto. Con <b>🏷 Etichetta (anteprima)</b> in alto la vedi prima di stampare.</p>

<h2>Errori comuni e cosa fare</h2>
<table>
  <tr><th>Cosa succede</th><th>Perché</th><th>Cosa fare</th></tr>
  <tr><td>"Inserisci prima il PIN operatore"</td><td>Manca la firma</td><td>Scrivi il tuo PIN nei Dati lotto</td></tr>
  <tr><td>La ricetta non si trova</td><td>Nome scritto diverso</td><td>Prova con una sola parola chiave</td></tr>
  <tr><td>Tendina conservazione vuota</td><td>La ricetta non ha scenari</td><td>Chiedi al manager di aggiungerli in Crea ricetta</td></tr>
  <tr><td>Riquadro rosso "l'etichetta non è ancora partita"</td><td>Il Raspberry del laboratorio non risponde</td><td>Controlla che sia acceso e collegato: la stampa resta in coda ed esce da sola</td></tr>
  <tr><td>Peso reale molto diverso dal confezionato</td><td>Confezioni scritte male o calo</td><td>Ricontrolla numero confezioni e kg per confezione prima di registrare</td></tr>
  <tr><td>Errore scoperto dopo la registrazione</td><td>Il lotto è bloccato</td><td>Non rifare il lotto: avvisa il manager</td></tr>
</table>
<p>Regola d'oro: <b>pesa sempre prima di confezionare e registra subito</b>, non a fine turno.</p>
`;

const STILE = `
  .gp-doc { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; line-height: 1.5; font-size: 14.5px; }
  .gp-doc h1 { font-size: 22px; margin: 0 0 12px; }
  .gp-doc h2 { font-size: 17px; margin: 22px 0 8px; color: #0E5A7A; }
  .gp-doc ol, .gp-doc ul { padding-left: 22px; }
  .gp-doc li { margin: 6px 0; }
  .gp-doc table { border-collapse: collapse; width: 100%; font-size: 13.5px; margin: 8px 0; }
  .gp-doc th, .gp-doc td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
  .gp-doc th { background: #f1f5f9; }
`;

function stampaGuida() {
  const w = window.open("", "_blank");
  if (!w) { alert("Il browser ha bloccato la finestra di stampa: consenti i popup per questo sito."); return; }
  w.document.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Preparazioni e lotti — guida operativa</title>
    <style>${STILE} body{margin:24px;} @page{margin:16mm;} h2{break-after:avoid;} tr,li{break-inside:avoid;}</style></head>
    <body><div class="gp-doc">${GUIDA_HTML}</div></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export function apriGuidaPreparazioni() {
  document.getElementById("guida-prep-overlay")?.remove();
  const ov = document.createElement("div");
  ov.id = "guida-prep-overlay";
  ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;padding:calc(16px + env(safe-area-inset-top,0px)) 12px 16px;overflow:auto;";
  ov.innerHTML = `
    <style>${STILE}</style>
    <div role="dialog" aria-label="Guida Preparazioni e lotti" style="background:#fff;border-radius:14px;max-width:760px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3);">
      <div style="position:sticky;top:0;background:#fff;border-bottom:1px solid #e2e8f0;border-radius:14px 14px 0 0;padding:10px 14px;display:flex;gap:8px;justify-content:flex-end;">
        <button type="button" id="guida-prep-stampa" class="app-button secondary">🖨️ Stampa la guida</button>
        <button type="button" id="guida-prep-chiudi" class="app-button secondary">✕ Chiudi</button>
      </div>
      <div class="gp-doc" style="padding:16px 20px 24px;">${GUIDA_HTML}</div>
    </div>`;
  document.body.appendChild(ov);
  const chiudi = () => ov.remove();
  ov.addEventListener("click", (e) => { if (e.target === ov) chiudi(); });
  ov.querySelector("#guida-prep-chiudi").onclick = chiudi;
  ov.querySelector("#guida-prep-stampa").onclick = stampaGuida;
}
