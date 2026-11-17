# Ristoflow — regole per chi lavora sul codice (e per il suo Claude)

Questo repo è l'app **app.ristoflow-ai.com** (GitHub Pages, JavaScript senza build).
Quello che finisce su `main` va online in un paio di minuti per tutti i clienti: per questo su `main` non si scrive mai direttamente.

## Regole fisse

1. **Mai su `main`.** Ogni intervento su un ramo `fix/<cosa>` o `supporto/<cliente>-<problema>`, poi una Pull Request. La approva solo Antonio.
2. **Il database di produzione non si tocca.** Niente connessioni dirette, niente chiavi di servizio, niente pannello Supabase.
   - Per **leggere**: app → 🛟 Supporto → 🔎 Database (solo SELECT, senza chiavi e segreti, ogni query è registrata). Il risultato si copia e si incolla in chat.
   - Per **cambiare la struttura** (tabelle, funzioni, policy): scrivi un file in `supabase/migrations/AAAAMMGG_descrizione.sql` dentro la PR. Lo applica Antonio.
   - Per **correggere dati di un cliente**: dall'app, con l'accesso assistito (🛟 Supporto → Entra in un'azienda). Motivo chiaro, durata minima, chiudi quando hai finito.
3. **Edge Function**: il sorgente modificato va in `supabase/functions/<nome>/index.ts` nella PR. La pubblica Antonio.
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
Una PR = un problema. Piccola si approva in un minuto, grande resta ferma.
