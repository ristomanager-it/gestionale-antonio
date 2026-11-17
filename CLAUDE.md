# Ristoflow — regole per chi lavora sul codice (e per il suo Claude)

Questo repo è l'app **app.ristoflow-ai.com** (GitHub Pages, JavaScript senza build).
Quello che finisce su `main` va online in un paio di minuti per tutti i clienti: per questo su `main` non si scrive mai direttamente.

## Regole fisse

1. **Mai direttamente su `main`.** Ogni intervento su un ramo `fix/<cosa>` o `supporto/<cliente>-<problema>`, poi una Pull Request.
   - Il tecnico **unisce da solo** la sua PR quando il controllo automatico (✔ `controllo`) è verde: sintassi JS, versione aggiornata, nessuna chiave nel codice.
   - Dopo l'unione l'app si aggiorna in 2-3 minuti: **verifica subito** dal cliente (accesso assistito) che funzioni.
   - Se qualcosa si rompe: sulla PR premi **Revert** e unisci la PR di annullamento. Prima si ripristina, poi si indaga.
   - Antonio vede ogni PR unita nel registro del supporto; non serve la sua approvazione.
2. **Il database di produzione non si tocca.** Niente connessioni dirette, niente chiavi di servizio, niente pannello Supabase.
   - Per **leggere**: app → 🛟 Supporto → 🔎 Database (solo SELECT, senza chiavi e segreti, ogni query è registrata). Il risultato si copia e si incolla in chat.
   - Per **correggere dati di un cliente**: dall'app, con l'accesso assistito (🛟 Supporto → Entra in un'azienda). Motivo chiaro, durata minima, chiudi quando hai finito.
3. **Edge Function e struttura del database** (tabelle, funzioni, policy): qui il tecnico NON è autonomo. Prepara il file nella PR (`supabase/functions/<nome>/index.ts` o `supabase/migrations/...sql`) e lo segnala ad Antonio, che lo applica.
4. **Niente segreti nel codice.** Chiavi API, token, password: mai nei file, mai nei messaggi di commit.
5. **Non toccare** utenti, ruoli e permessi, né il codice di accessi/sicurezza (`js/auth-utils.js`, policy RLS, `supporto_*`) senza che Antonio l'abbia chiesto esplicitamente.

## Come si pubblica una modifica JS

- Il router carica le pagine con `imp()` che aggiunge `?v=APP_V`. A ogni modifica:
  - aggiorna `const APP_V = "AAAAMMGG-N"` in `js/router.js`
  - aggiorna `js/router.js?v=` in `index.html` (+1)
- Rotte con hash e barra: `#/nome-rotta`.
- Prima della PR: `node --check` su ogni file JS toccato.

## Cose da sapere

- Supabase project: `cuhcscpvhypoaplcmtjk` (Postgres 17). Liste lunghe: caricare a pagine con `.range()`.
- La sede di un dipendente sta in due posti: `dipendenti.sede_id` (calcoli) e `utenti_sedi` (accessi e liste). Verifica entrambi.
- Nelle regex di Postgres il confine di parola è `\y`, non `\b`.
- Nei testi e negli esempi non usare nomi di dipendenti veri: usa `{nome}`.
- Nelle note che finiscono nell'app l'autore dei suggerimenti è "Tony", mai "Claude".

## La PR

Usa il modello (si apre da solo): problema, causa, cosa cambia, come l'hai provato, cliente coinvolto.
Il titolo della PR dice cosa si sistema in parole semplici (es. "Etichette lotti: formato di default se manca"): Antonio legge quello.
Una PR = un problema. Piccola si approva in un minuto, grande resta ferma.
