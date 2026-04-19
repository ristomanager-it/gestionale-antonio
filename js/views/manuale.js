export async function render(container) {
  const ASSETS = window.manualeRistoflowAssets || {
    logo: "",
    login: "",
    homeOperatore: "",
    homeManager: "",
    timbrature: "",
    acquisti: "",
    produzione: "",
    ricettario: "",
    planning: ""
  };

  const sections = [
    { id: "introduzione", label: "1. Introduzione" },
    { id: "accesso", label: "2. Accesso al sistema" },
    { id: "sede", label: "3. Sede di lavoro" },
    { id: "home", label: "4. Schermata iniziale" },
    { id: "inizio-turno", label: "5. Inizio turno" },
    { id: "timbrature", label: "6. Timbrature" },
    { id: "magazzino", label: "7. Magazzino" },
    { id: "carico", label: "8. Carico magazzino" },
    { id: "categorie", label: "9. Materie prime / Preparazioni / Prodotti finiti" },
    { id: "acquisti", label: "10. Acquisti" },
    { id: "ordini", label: "11. Ordini fornitori" },
    { id: "riordino", label: "12. Riordino" },
    { id: "produzione", label: "13. Produzione" },
    { id: "lotti", label: "14. Produzione (lotti)" },
    { id: "ricettario", label: "15. Ricettario" },
    { id: "planning", label: "16. Planning produzione" },
    { id: "venduto", label: "17. Venduto" },
    { id: "permessi", label: "18. Permessi e ferie" },
    { id: "giornata", label: "19. Giornata tipo" },
    { id: "errori", label: "20. Errori comuni" },
    { id: "suggerimenti", label: "21. Suggerimenti pratici" },
    { id: "verificare", label: "22. Funzionalità da verificare" },
    { id: "conclusione", label: "23. Conclusione" }
  ];

  container.innerHTML = `
    <section class="view manuale-ristoflow-view">
      <style>
        .manuale-ristoflow-view{
          background:#f7f8fb;
          min-height:100vh;
          padding:16px;
          padding-bottom:40px;
          color:#142033;
        }

        .manuale-shell{
          max-width:1100px;
          margin:0 auto;
        }

        .manuale-hero{
          background:linear-gradient(135deg, #0b5f7f 0%, #083f59 100%);
          color:#fff;
          border-radius:24px;
          padding:24px 18px;
          box-shadow:0 18px 50px rgba(8,63,89,.22);
        }

        .manuale-hero-top{
          display:flex;
          align-items:center;
          gap:16px;
          flex-wrap:wrap;
        }

        .manuale-logo-wrap{
          width:88px;
          height:88px;
          border-radius:20px;
          background:rgba(255,255,255,.12);
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
          flex:0 0 auto;
        }

        .manuale-logo-wrap img{
          width:100%;
          height:100%;
          object-fit:contain;
          display:block;
        }

        .manuale-logo-fallback{
          font-size:30px;
          font-weight:800;
          letter-spacing:.5px;
        }

        .manuale-hero h1{
          margin:0;
          font-size:32px;
          line-height:1.05;
          font-weight:900;
        }

        .manuale-hero p{
          margin:10px 0 0 0;
          font-size:15px;
          line-height:1.55;
          max-width:720px;
          opacity:.97;
        }

        .manuale-grid{
          display:grid;
          grid-template-columns:280px 1fr;
          gap:18px;
          margin-top:18px;
          align-items:start;
        }

        .manuale-sidebar{
          position:sticky;
          top:12px;
          background:#fff;
          border-radius:22px;
          padding:16px;
          box-shadow:0 10px 30px rgba(15,23,42,.08);
          border:1px solid #e8edf3;
        }

        .manuale-sidebar-title{
          font-size:13px;
          text-transform:uppercase;
          letter-spacing:.08em;
          color:#5a6780;
          margin-bottom:12px;
          font-weight:800;
        }

        .manuale-search{
          width:100%;
          border:1px solid #d8e0ea;
          border-radius:14px;
          padding:12px 14px;
          font-size:14px;
          outline:none;
          margin-bottom:12px;
          box-sizing:border-box;
        }

        .manuale-search:focus{
          border-color:#0b5f7f;
          box-shadow:0 0 0 3px rgba(11,95,127,.12);
        }

        .manuale-nav{
          display:flex;
          flex-direction:column;
          gap:8px;
          max-height:70vh;
          overflow:auto;
          padding-right:4px;
        }

        .manuale-nav a{
          text-decoration:none;
          color:#1d2a3d;
          background:#f4f7fb;
          border-radius:12px;
          padding:10px 12px;
          font-size:14px;
          line-height:1.35;
          transition:.15s ease;
          border:1px solid transparent;
        }

        .manuale-nav a:hover,
        .manuale-nav a.active{
          background:#e8f3f8;
          border-color:#bfd9e4;
          color:#0b5f7f;
        }

        .manuale-content{
          display:flex;
          flex-direction:column;
          gap:16px;
        }

        .manuale-card{
          background:#fff;
          border-radius:22px;
          padding:22px 18px;
          box-shadow:0 10px 30px rgba(15,23,42,.08);
          border:1px solid #e8edf3;
        }

        .manuale-card h2{
          margin:0 0 16px 0;
          font-size:30px;
          line-height:1.1;
          font-weight:900;
          color:#142033;
        }

        .manuale-card h3{
          margin:18px 0 10px 0;
          font-size:20px;
          line-height:1.2;
          font-weight:850;
          color:#142033;
        }

        .manuale-card p{
          margin:0 0 12px 0;
          font-size:16px;
          line-height:1.65;
          color:#263247;
        }

        .manuale-card ul,
        .manuale-card ol{
          margin:8px 0 14px 0;
          padding-left:22px;
          color:#263247;
        }

        .manuale-card li{
          margin:6px 0;
          font-size:16px;
          line-height:1.6;
        }

        .manuale-lead{
          font-size:17px;
          line-height:1.7;
        }

        .manuale-callout{
          border-radius:18px;
          padding:14px 16px;
          margin:14px 0;
          line-height:1.6;
          font-size:15px;
        }

        .manuale-callout strong{
          display:block;
          margin-bottom:6px;
          font-size:14px;
          text-transform:uppercase;
          letter-spacing:.04em;
        }

        .manuale-callout.info{
          background:#eef7fb;
          border:1px solid #d2e8f2;
          color:#12425a;
        }

        .manuale-callout.warn{
          background:#fff3f0;
          border:1px solid #ffd8cf;
          color:#7d2f1d;
        }

        .manuale-callout.ok{
          background:#effaf2;
          border:1px solid #cfe9d6;
          color:#22573a;
        }

        .manuale-shot{
          margin:16px 0 4px 0;
          background:#f8fafc;
          border:1px solid #e8edf3;
          border-radius:18px;
          overflow:hidden;
        }

        .manuale-shot img{
          display:block;
          width:100%;
          height:auto;
        }

        .manuale-shot figcaption{
          padding:10px 12px;
          font-size:13px;
          color:#5a6780;
          border-top:1px solid #e8edf3;
          background:#fff;
        }

        .manuale-shot.manuale-shot-empty{
          display:none;
        }

        .manuale-mini-title{
          margin:18px 0 8px 0;
          font-size:17px;
          font-weight:800;
          color:#172437;
        }

        .manuale-divider{
          height:1px;
          background:#ebeff5;
          margin:18px 0;
        }

        .manuale-top-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:16px;
        }

        .manuale-btn{
          appearance:none;
          border:none;
          border-radius:14px;
          background:#fff;
          color:#0b5f7f;
          padding:12px 14px;
          font-size:14px;
          font-weight:800;
          cursor:pointer;
          box-shadow:0 8px 20px rgba(0,0,0,.10);
        }

        .manuale-btn.primary{
          background:#0b5f7f;
          color:#fff;
        }

        .manuale-hidden{
          display:none !important;
        }

        @media (max-width: 960px){
          .manuale-grid{
            grid-template-columns:1fr;
          }

          .manuale-sidebar{
            position:static;
          }

          .manuale-nav{
            max-height:none;
          }

          .manuale-hero h1{
            font-size:28px;
          }

          .manuale-card h2{
            font-size:26px;
          }
        }

        @media (max-width: 640px){
          .manuale-ristoflow-view{
            padding:12px;
          }

          .manuale-hero{
            border-radius:20px;
            padding:20px 16px;
          }

          .manuale-card{
            border-radius:18px;
            padding:18px 14px;
          }

          .manuale-card h2{
            font-size:24px;
          }

          .manuale-card h3{
            font-size:18px;
          }

          .manuale-card p,
          .manuale-card li{
            font-size:15px;
          }

          .manuale-logo-wrap{
            width:72px;
            height:72px;
            border-radius:16px;
          }
        }
      </style>

      <div class="manuale-shell">
        <div class="manuale-hero">
          <div class="manuale-hero-top">
            <div class="manuale-logo-wrap">
              ${
                ASSETS.logo
                  ? `<img src="${escapeHtml(ASSETS.logo)}" alt="Logo Ristoflow" />`
                  : `<div class="manuale-logo-fallback">RF</div>`
              }
            </div>

            <div>
              <h1>📘 Manuale Operativo Ristoflow</h1>
              <p>Uso quotidiano per il personale di ristorazione. Guida pratica, chiara e consultabile direttamente dentro l’app.</p>

              <div class="manuale-top-actions">
                <button class="manuale-btn primary" id="manuale-scroll-top">Torna all’inizio</button>
                <button class="manuale-btn" id="manuale-expand-all">Apri tutte le sezioni</button>
              </div>
            </div>
          </div>
        </div>

        <div class="manuale-grid">
          <aside class="manuale-sidebar">
            <div class="manuale-sidebar-title">Indice rapido</div>
            <input id="manuale-search" class="manuale-search" type="text" placeholder="Cerca sezione o parola..." />
            <nav class="manuale-nav" id="manuale-nav">
              ${sections
                .map(
                  (section) => `
                    <a href="#${section.id}" data-manuale-link="${section.id}">
                      ${escapeHtml(section.label)}
                    </a>
                  `
                )
                .join("")}
            </nav>
          </aside>

          <div class="manuale-content" id="manuale-content">

            <article class="manuale-card" id="introduzione" data-title="introduzione sistema lavoro ristorante magazzino produzione scorte acquisti fornitori timbrature organizzazione">
              <h2>1. Introduzione</h2>
              <p class="manuale-lead">
                Ristoflow è il sistema che usi ogni giorno per lavorare.
              </p>
              <p>Serve per:</p>
              <ul>
                <li>gestire il magazzino</li>
                <li>registrare la produzione</li>
                <li>controllare le scorte</li>
                <li>gestire acquisti e fornitori</li>
                <li>timbrare il turno</li>
                <li>organizzare il lavoro</li>
              </ul>
              <div class="manuale-callout.info">
                <strong>In pratica</strong>
                Tutto quello che fai nel ristorante passa da qui.
              </div>
            </article>

            <article class="manuale-card" id="accesso" data-title="accesso login primo accesso password ruolo email link">
              <h2>2. Accesso al sistema</h2>

              <h3>2.1 Login</h3>
              <p>Per entrare:</p>
              <ul>
                <li>inserisci email e password</li>
                <li>oppure usa il link ricevuto</li>
              </ul>

              ${renderShot(ASSETS.login, "Schermata di login")}

              <h3>2.2 Primo accesso</h3>
              <p>Al primo accesso:</p>
              <ul>
                <li>vieni collegato all’azienda</li>
                <li>ti viene assegnato un ruolo</li>
              </ul>
              <div class="manuale-callout.info">
                <strong>Da sapere</strong>
                Dopo l’accesso vedrai una schermata diversa in base al tuo ruolo.
              </div>

              <h3>2.3 Password</h3>
              <ul>
                <li>è personale</li>
                <li>non va condivisa</li>
                <li>va impostata tramite link</li>
              </ul>
            </article>

            <article class="manuale-card" id="sede" data-title="sede attiva cucina laboratorio punto vendita magazzino produzione timbrature">
              <h2>3. Sede di lavoro</h2>

              <h3>3.1 Cos’è la sede attiva</h3>
              <p>È il luogo dove stai lavorando.</p>
              <p>Esempi:</p>
              <ul>
                <li>cucina</li>
                <li>laboratorio</li>
                <li>punto vendita</li>
              </ul>

              <h3>3.2 Perché è fondamentale</h3>
              <p>👉 Tutto quello che fai viene salvato sulla sede attiva:</p>
              <ul>
                <li>magazzino</li>
                <li>produzione</li>
                <li>timbrature</li>
              </ul>

              <div class="manuale-callout.warn">
                <strong>Attenzione</strong>
                Se lavori sulla sede sbagliata:
                <ul>
                  <li>il magazzino sarà errato</li>
                  <li>le produzioni finiranno nel posto sbagliato</li>
                  <li>i dati non saranno affidabili</li>
                </ul>
              </div>

              <div class="manuale-callout.ok">
                <strong>Buona pratica</strong>
                Controlla sempre la sede prima di lavorare.
              </div>
            </article>

            <article class="manuale-card" id="home" data-title="schermata iniziale home operatore manager dashboard cosa fare oggi azioni rapide servizi personale">
              <h2>4. Schermata iniziale</h2>

              <h3>4.1 Operatore</h3>
              <p>Ti mostra:</p>
              <ul>
                <li>cosa devi fare oggi</li>
                <li>azioni rapide</li>
              </ul>
              <p>Esempi:</p>
              <ul>
                <li>timbra ingresso</li>
                <li>controlla preparazioni</li>
                <li>vai al servizio</li>
              </ul>

              ${renderShot(ASSETS.homeOperatore, "Home operatore")}

              <h3>4.2 Manager</h3>
              <p>Ti mostra:</p>
              <ul>
                <li>servizi del giorno</li>
                <li>personale</li>
                <li>accesso rapido a funzioni</li>
              </ul>

              ${renderShot(ASSETS.homeManager, "Home manager / dashboard")}

              <div class="manuale-callout.info">
                <strong>Utilità pratica</strong>
                La schermata iniziale serve per capire subito cosa fare, cosa controllare e da dove partire.
              </div>
            </article>

            <article class="manuale-card" id="inizio-turno" data-title="inizio turno procedura standard checklist apri gestionale controlla sede timbra ingresso">
              <h2>5. Inizio turno (procedura standard)</h2>

              <div class="manuale-callout.ok">
                <strong>Checklist</strong>
                <ol>
                  <li>Apri gestionale</li>
                  <li>Controlla sede</li>
                  <li>Guarda cosa devi fare</li>
                  <li>Timbra ingresso</li>
                </ol>
              </div>

              <div class="manuale-callout.warn">
                <strong>Errore da evitare</strong>
                Non iniziare a lavorare senza timbrare.
              </div>
            </article>

            <article class="manuale-card" id="timbrature" data-title="timbrature entrata pausa rientro fine turno posizione timbra presenza">
              <h2>6. Timbrature</h2>

              <h3>6.1 Cosa puoi fare</h3>
              <ul>
                <li>Entrata</li>
                <li>Inizio pausa</li>
                <li>Rientro pausa</li>
                <li>Fine turno</li>
              </ul>

              <h3>6.2 Come funziona</h3>
              <p>👉 Il sistema ti mostra solo le azioni possibili in quel momento.</p>

              <h3>6.3 Posizione</h3>
              <ul>
                <li>viene controllata automaticamente</li>
                <li>serve per verificare che sei sul posto di lavoro</li>
              </ul>

              <div class="manuale-callout.warn">
                <strong>Attenzione</strong>
                Se non attivi la posizione:
                <ul>
                  <li>la timbratura può risultare non valida</li>
                </ul>
              </div>

              <div class="manuale-callout.ok">
                <strong>Buona pratica</strong>
                <ul>
                  <li>timbra sempre all’inizio</li>
                  <li>timbra sempre alla fine</li>
                </ul>
              </div>

              ${renderShot(ASSETS.timbrature, "Schermata timbrature")}
            </article>

            <article class="manuale-card" id="magazzino" data-title="magazzino tipi prodotti materie prime preparazioni prodotti finiti cercare prodotto scheda giacenza movimenti">
              <h2>7. Magazzino</h2>

              <h3>7.1 Tipi di prodotti</h3>
              <ul>
                <li>materie prime</li>
                <li>preparazioni</li>
                <li>prodotti finiti</li>
              </ul>

              <h3>7.2 Cercare un prodotto</h3>
              <p>Puoi cercare per:</p>
              <ul>
                <li>nome</li>
                <li>codice</li>
                <li>descrizione</li>
              </ul>

              <h3>7.3 Cosa vedere nella scheda</h3>
              <ul>
                <li>giacenza</li>
                <li>unità di misura</li>
                <li>ultimi movimenti</li>
              </ul>

              <h3>7.4 Giacenza</h3>
              <p>👉 Quantità disponibile reale.</p>

              <h3>7.5 Movimenti</h3>
              <ul>
                <li>carico → entra merce</li>
                <li>scarico → esce merce</li>
                <li>produzione → trasformazione</li>
              </ul>

              <div class="manuale-callout.info">
                <strong>Ricorda</strong>
                Se la giacenza è sbagliata, tutto il sistema lavora su numeri non affidabili.
              </div>
            </article>

            <article class="manuale-card" id="carico" data-title="carico magazzino quando farlo arriva merce cerca prodotto quantità data salva doppioni">
              <h2>8. Carico magazzino</h2>

              <h3>8.1 Quando farlo</h3>
              <p>👉 Ogni volta che arriva merce.</p>

              <h3>8.2 Procedura</h3>
              <ol>
                <li>Apri “Carico Magazzino”</li>
                <li>Cerca prodotto</li>
                <li>Inserisci quantità</li>
                <li>Inserisci data</li>
                <li>Salva</li>
              </ol>

              <div class="manuale-callout.ok">
                <strong>Esempio</strong>
                Arrivano 10 kg di pomodori:
                <ul>
                  <li>cerchi “pomodori”</li>
                  <li>inserisci 10</li>
                  <li>salvi</li>
                </ul>
              </div>

              <div class="manuale-callout.warn">
                <strong>Attenzione</strong>
                Controlla sempre:
                <ul>
                  <li>prodotto corretto</li>
                  <li>quantità corretta</li>
                  <li>unità di misura</li>
                </ul>
              </div>

              <h3>8.3 Prodotto non presente</h3>
              <p>👉 Puoi crearlo direttamente.</p>

              <div class="manuale-callout.warn">
                <strong>Errore comune</strong>
                Creare doppioni dello stesso prodotto.
              </div>
            </article>

            <article class="manuale-card" id="categorie" data-title="materie prime preparazioni prodotti finiti ingredienti base semilavorati prodotti pronti">
              <h2>9. Materie prime / Preparazioni / Prodotti finiti</h2>

              <h3>9.1 Materie prime</h3>
              <p>👉 Ingredienti base.</p>

              <h3>9.2 Preparazioni</h3>
              <p>👉 Semilavorati.</p>

              <h3>9.3 Prodotti finiti</h3>
              <p>👉 Prodotti pronti.</p>

              <div class="manuale-callout.ok">
                <strong>Uso pratico</strong>
                <ul>
                  <li>controllare disponibilità</li>
                  <li>verificare scorte</li>
                  <li>capire cosa manca</li>
                </ul>
              </div>
            </article>

            <article class="manuale-card" id="acquisti" data-title="acquisti fatture ddt cercare documenti filtrare data fornitore caricare documenti automatico manuale">
              <h2>10. Acquisti</h2>

              <h3>10.1 Fatture e DDT</h3>
              <p>Puoi:</p>
              <ul>
                <li>cercare documenti</li>
                <li>filtrare per data/fornitore</li>
                <li>caricare nuovi documenti</li>
              </ul>

              ${renderShot(ASSETS.acquisti, "Modulo acquisti")}

              <h3>10.2 Caricare documento</h3>
              <p>Puoi scegliere:</p>
              <ul>
                <li>caricamento automatico</li>
                <li>inserimento manuale</li>
              </ul>

              <div class="manuale-callout.ok">
                <strong>Procedura</strong>
                <ol>
                  <li>Seleziona tipo (fattura/DDT)</li>
                  <li>Inserisci fornitore</li>
                  <li>Inserisci data e numero</li>
                  <li>Inserisci righe prodotti</li>
                  <li>Salva</li>
                </ol>
              </div>

              <div class="manuale-callout.warn">
                <strong>Attenzione</strong>
                Controlla sempre:
                <ul>
                  <li>fornitore</li>
                  <li>prodotti</li>
                  <li>quantità</li>
                  <li>totale</li>
                </ul>
              </div>

              <h3>10.3 Caricamento automatico</h3>
              <p>👉 Il sistema prova a leggere il documento.</p>

              <div class="manuale-callout.warn">
                <strong>Importante</strong>
                Devi sempre verificare i dati.
              </div>
            </article>

            <article class="manuale-card" id="ordini" data-title="ordini fornitori preparare acquisti scegli prodotto quantità salva ordine">
              <h2>11. Ordini fornitori</h2>

              <h3>11.1 A cosa servono</h3>
              <p>👉 Preparare acquisti.</p>

              <h3>11.2 Procedura</h3>
              <ul>
                <li>Scegli prodotto</li>
                <li>Inserisci quantità</li>
                <li>Salva ordine</li>
              </ul>
            </article>

            <article class="manuale-card" id="riordino" data-title="riordino lista prodotti sotto scorta controlla prodotti critici aggiungi ordini">
              <h2>12. Riordino</h2>

              <h3>12.1 Cos’è</h3>
              <p>👉 Lista prodotti sotto scorta.</p>

              <h3>12.2 Come usarlo</h3>
              <ul>
                <li>controlla prodotti critici</li>
                <li>aggiungili agli ordini</li>
              </ul>

              <div class="manuale-callout.ok">
                <strong>Buona pratica</strong>
                Controllalo ogni giorno.
              </div>
            </article>

            <article class="manuale-card" id="produzione" data-title="produzione creare ricette registrare produzione gestire lotti">
              <h2>13. Produzione</h2>

              <h3>13.1 Cosa puoi fare</h3>
              <ul>
                <li>creare ricette</li>
                <li>registrare produzione</li>
                <li>gestire lotti</li>
              </ul>
            </article>

            <article class="manuale-card" id="lotti" data-title="produzione lotti procedura completa ricetta peso reale pin dati lotto confezionamento salva">
              <h2>14. Produzione (lotti)</h2>

              <h3>14.1 Procedura completa</h3>
              <ol>
                <li>Scegli ricetta</li>
                <li>Inserisci peso reale</li>
                <li>Inserisci PIN</li>
                <li>Inserisci dati lotto</li>
                <li>Inserisci confezionamento</li>
                <li>Salva</li>
              </ol>

              <div class="manuale-callout.ok">
                <strong>Cosa fa il sistema</strong>
                <ul>
                  <li>scarica ingredienti</li>
                  <li>carica prodotto finito</li>
                  <li>crea lotto</li>
                </ul>
              </div>

              <div class="manuale-callout.warn">
                <strong>Attenzione</strong>
                Il peso reale è fondamentale.
              </div>

              <div class="manuale-callout.ok">
                <strong>Esempio</strong>
                Produci 20 kg di sugo:
                <ul>
                  <li>inserisci 20 kg</li>
                  <li>salvi</li>
                  <li>il sistema aggiorna tutto</li>
                </ul>
              </div>

              ${renderShot(ASSETS.produzione, "Schermata produzione / lotto")}
            </article>

            <article class="manuale-card" id="ricettario" data-title="ricettario ingredienti quantità procedimento qualità standard">
              <h2>15. Ricettario</h2>

              <h3>15.1 Cosa contiene</h3>
              <ul>
                <li>ingredienti</li>
                <li>quantità</li>
                <li>procedimento</li>
              </ul>

              <div class="manuale-callout.ok">
                <strong>Perché è importante</strong>
                Garantisce qualità e standard.
              </div>

              ${renderShot(ASSETS.ricettario, "Ricettario")}
            </article>

            <article class="manuale-card" id="planning" data-title="planning produzione organizzare lavoro pianificare attività">
              <h2>16. Planning produzione</h2>
              <p>Serve per:</p>
              <ul>
                <li>organizzare lavoro</li>
                <li>pianificare attività</li>
              </ul>

              ${renderShot(ASSETS.planning, "Planning produzione")}
            </article>

            <article class="manuale-card" id="venduto" data-title="venduto inserire vendite filtrare per data da verificare">
              <h2>17. Venduto</h2>

              <h3>17.1 Cosa puoi fare</h3>
              <ul>
                <li>inserire vendite</li>
                <li>filtrare per data</li>
              </ul>

              <div class="manuale-callout.warn">
                <strong>Da verificare</strong>
                Automazione completa vendite.
              </div>
            </article>

            <article class="manuale-card" id="permessi" data-title="permessi ferie richiesta seleziona tipo inserisci date aggiungi note approvazione manager admin">
              <h2>18. Permessi e ferie</h2>

              <h3>18.1 Richiesta</h3>
              <ul>
                <li>seleziona tipo</li>
                <li>inserisci date</li>
                <li>aggiungi note</li>
              </ul>

              <h3>18.2 Approvazione</h3>
              <p>👉 fatta da manager/admin.</p>
            </article>

            <article class="manuale-card" id="giornata" data-title="giornata tipo operatore mattina durante turno fine turno">
              <h2>19. Giornata tipo (operatore)</h2>

              <h3>Mattina</h3>
              <ul>
                <li>login</li>
                <li>timbra ingresso</li>
                <li>controlla attività</li>
              </ul>

              <h3>Durante il turno</h3>
              <ul>
                <li>controlla magazzino</li>
                <li>registra carichi</li>
                <li>produce</li>
              </ul>

              <h3>Fine turno</h3>
              <ul>
                <li>chiudi attività</li>
                <li>timbra uscita</li>
              </ul>
            </article>

            <article class="manuale-card" id="errori" data-title="errori comuni sede sbagliata quantità errate non registrare produzione non timbrare duplicati documenti">
              <h2>20. Errori comuni</h2>
              <ul>
                <li>❌ Sede sbagliata</li>
                <li>❌ Quantità errate</li>
                <li>❌ Non registrare produzione</li>
                <li>❌ Non timbrare</li>
                <li>❌ Creare prodotti duplicati</li>
                <li>❌ Non controllare documenti</li>
              </ul>
            </article>

            <article class="manuale-card" id="suggerimenti" data-title="suggerimenti pratici inserisci dati controlla prima di salvare usa ricette corrette riordino sede giusta">
              <h2>21. Suggerimenti pratici</h2>
              <ul>
                <li>✔ Inserisci dati subito</li>
                <li>✔ Controlla sempre prima di salvare</li>
                <li>✔ Usa le ricette corrette</li>
                <li>✔ Controlla il riordino ogni giorno</li>
                <li>✔ Lavora sempre sulla sede giusta</li>
              </ul>
            </article>

            <article class="manuale-card" id="verificare" data-title="funzionalità da verificare collegamento acquisti magazzino invio ordini integrazione vendite automazioni avanzate">
              <h2>22. Funzionalità da verificare</h2>
              <ul>
                <li>collegamento automatico acquisti → magazzino</li>
                <li>invio ordini ai fornitori</li>
                <li>integrazione vendite</li>
                <li>automazioni avanzate</li>
              </ul>
            </article>

            <article class="manuale-card" id="conclusione" data-title="conclusione strumento di lavoro lavori meglio meno errori ristorante funziona meglio">
              <h2>23. Conclusione</h2>
              <p>Ristoflow non è solo un gestionale.</p>
              <p>👉 È uno strumento di lavoro.</p>
              <p>Se lo usi bene:</p>
              <ul>
                <li>lavori meglio</li>
                <li>fai meno errori</li>
                <li>il ristorante funziona meglio</li>
              </ul>
            </article>

          </div>
        </div>
      </div>
    </section>
  `;

  const searchInput = container.querySelector("#manuale-search");
  const nav = container.querySelector("#manuale-nav");
  const links = [...container.querySelectorAll("[data-manuale-link]")];
  const cards = [...container.querySelectorAll(".manuale-card")];
  const expandBtn = container.querySelector("#manuale-expand-all");
  const topBtn = container.querySelector("#manuale-scroll-top");

  searchInput?.addEventListener("input", () => {
    const q = normalizeText(searchInput.value);
    cards.forEach((card) => {
      const haystack = normalizeText(card.textContent + " " + (card.dataset.title || ""));
      const visible = !q || haystack.includes(q);
      card.classList.toggle("manuale-hidden", !visible);
    });

    links.forEach((link) => {
      const sectionId = link.getAttribute("data-manuale-link");
      const card = container.querySelector(`#${CSS.escape(sectionId)}`);
      const visible = card && !card.classList.contains("manuale-hidden");
      link.classList.toggle("manuale-hidden", !visible);
    });
  });

  expandBtn?.addEventListener("click", () => {
    searchInput.value = "";
    cards.forEach((card) => card.classList.remove("manuale-hidden"));
    links.forEach((link) => link.classList.remove("manuale-hidden"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  topBtn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const id = link.getAttribute("data-manuale-link");
      const el = container.querySelector(`#${CSS.escape(id)}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveLink(id);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible?.target?.id) return;
      setActiveLink(visible.target.id);
    },
    {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: [0.15, 0.35, 0.6]
    }
  );

  cards.forEach((card) => observer.observe(card));

  function setActiveLink(id) {
    links.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("data-manuale-link") === id);
    });
  }

  if (links[0]) {
    setActiveLink(links[0].getAttribute("data-manuale-link"));
  }
}

function renderShot(src, caption) {
  if (!src) return "";
  return `
    <figure class="manuale-shot">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(caption || "Screenshot manuale")}" />
      ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
    </figure>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
