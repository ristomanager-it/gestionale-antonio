# Ristoflow.AI — Manuale Operativo Completo
> Aggiornato: Giugno 2026 | Versione ecosistema attuale

---

## 🗺️ PANORAMICA ECOSISTEMA

Ristoflow è composto da **5 app separate** che condividono lo stesso database Supabase.

| App | URL | Repo GitHub | Stato |
|-----|-----|-------------|-------|
| **Gestionale** | app.ristoflow-ai.com | `gestionale-antonio` | ✅ Live |
| **Hotel** | hotel.ristoflow-ai.com | `hotel.ristoflow-ai` | ✅ Live |
| **Tasting** | tasting.ristoflow-ai.com | `Tasting` | ✅ Live |
| **Social** | social.ristoflow-ai.com | `ristoflow-cliente` | ✅ Live |
| **Siti clienti** | ristomanager-it.github.io/siti-clienti | `siti-clienti` | ✅ Live |

**Database unico:** `cuhcscpvhypoaplcmtjk.supabase.co` (eu-central-2)

---

## 🔐 CREDENZIALI FISSE

| Dato | Valore |
|------|--------|
| Superadmin email | carulloantonio@icloud.com |
| Superadmin user ID | 5da91398-947a-4f13-bdaa-f2a593c03e54 |
| Azienda principale | Campo Antico Ricevimenti |
| Azienda ID | b331365f-17db-4dda-aa2f-77a09427fe42 |
| Superadmin azienda ID | aa568c35-477a-474d-9bc3-97a954d78d8d |

**Sedi Campo Antico:**

| Sede | ID |
|------|----|
| Centro cottura | 09649aaa-2b3b-4553-b20c-23c69512836a |
| Campo Antico Ristorante | d7cafc19-d707-4b37-82b8-b491b36e7a2b |
| Catering Ricevimenti | c40919bb-78c2-458f-865e-0c9fd02aa0b5 |
| Trattoria dell'Aquila | 4a936e52-a1e3-42fc-843c-e8d15dc86040 |

---

## 📱 APP 1 — GESTIONALE (app.ristoflow-ai.com)

### Accesso e ruoli

L'app usa autenticazione Supabase. I ruoli disponibili sono:

| Ruolo | Cosa vede |
|-------|-----------|
| `superadmin` | Tutto — dashboard piattaforma, tutte le aziende |
| `admin` | Tutto il gestionale della propria azienda |
| `manager` | Operativo + report, no configurazione |
| `operatore` | Solo comande, timbrature, display cucina |
| `commercialista` | Solo bilancio e acquisti |
| `consulente` | Vista limitata su dati assegnati |

### Menu — Sezioni disponibili

**PIATTAFORMA** *(solo superadmin)*
- 🖥️ Dashboard SaaS — KPI piattaforma, clienti attivi, MRR
- 🏢 Gestione Aziende — lista clienti, piani, moduli
- ➕ Crea Azienda — onboarding nuovo cliente
- 💳 Piani Abbonamento — gestione piani Stripe

**OPERATIVO**
- 🏠 Home — dashboard operativa giornaliera
- 🪑 Comande — gestione tavoli, ordini, pagamenti (PIN auth)
- 📅 Prenotazioni — lista prenotazioni, gestione slot
- 🗓️ Tavoli — mappa sala, prenotazioni tavolo
- 📑 Preventivi — creazione preventivi catering/eventi
- 👨‍🍳 Display Cucina — schermo KDS per cucina (tablet)
- 📦 Magazzino — scarico merci, inventario
- 🕒 Timbratura — entrata/uscita dipendenti con GPS

**CUCINA**
- 📖 Ricettario — schede tecniche, food cost
- ➕ Nuova ricetta — editor semplificato
- 🏭 Produzione — planning cotture, lotti
- 🧪 Preparazioni — semilavorati e preparazioni base
- 📋 Planning — planner produzione settimanale
- 🔌 Dispositivi — configurazione display cucina

**GESTIONE**
- 📊 Dashboard — KPI azienda, ricavi, coperti
- 📈 Bilancio live — P&L, IVA, fascicolo fiscale
- 🛒 Acquisti — fatture passive, DDT, fornitori
- 💰 Venduto — analisi vendite per periodo
- 📈 Margini — margini per piatto/categoria

**MENU & PRODOTTI**
- 📋 Menu Builder — costruzione menu digitale per sede
- 🧺 Prodotti — anagrafica prodotti
- 📂 Categorie — categorie menu
- 🍳 Ricette BO — editor ricette avanzato
- 📦 Magazzino BO — gestione magazzino back-office
- 👨‍🍳 Produzione BO — produzione back-office

**MARKETING & CRM**
- 📉 Analytics — funnel conversioni, visite, UTM, device
- 🏷️ Tag & LTV — segmentazione clienti, lifetime value
- 💬 Template WhatsApp — gestione template Meta approvati
- 📣 Campagne — campagne marketing
- 🎁 Promo — landing promo con form lead + QR
- 🎫 Fidelity & Network — programma fedeltà
- 🔗 Catenarie — automazioni sequenziali WhatsApp
- 📱 WhatsApp Inbox — messaggi in entrata (badge contatore)
- 🤖 Chatbot — configurazione chatbot WA
- 🖼️ Media Library — gestione foto/video per sede
- 🌐 Sito Web — builder sito statico multi-pagina

**PERSONALE**
- 👥 Candidature — job posting, scoring AI candidati
- 💬 Survey team — sondaggi interni
- 👨‍💼 Dipendenti — anagrafica, contratti
- ➕ Nuovo dipendente — onboarding
- 🔐 Permessi — gestione permessi per ruolo
- 📆 Gestione ferie — approvazione ferie
- 👤 Fascicolo HR — documenti dipendente
- 📘 Manuale — manuale operativo interno

**CONFIGURAZIONE**
- ⚙️ Impostazioni — dati azienda, sedi, sale/tavoli, brand, Golden Circle
- 🔗 Accessi Consulenti — gestione accessi esterni

**Link esterni dal menu:**
- 🏨 Vai a Ristoflow Hotel
- 🍷 Vai a Tasting

---

### Come funziona il routing

L'app è una **SPA (Single Page App)** — tutto è su `index.html`, le pagine cambiano via hash URL.

```
app.ristoflow-ai.com/#/bo-comande    → Comande
app.ristoflow-ai.com/#/bo-analytics → Analytics
app.ristoflow-ai.com/#/prenotazioni → Prenotazioni
```

Per navigare direttamente a una sezione, cambia il hash nell'URL.

---

### Tony AI

Accessibile dal pulsante avatar in alto a destra (o `#/ai`).

- Conosce **48 concetti** di gestione ristorazione sviluppati da Antonio Carullo
- Ha **memoria persistente** — usa frasi come *"ricordati che..."*
- Può generare copy per il sito web
- Risponde in base al ruolo dell'utente loggato
- Usa le API OpenAI configurate

---

### Comande — Guida rapida

1. Vai su **Comande** (`#/bo-comande`)
2. Inserisci PIN operatore
3. Seleziona tavolo dalla mappa sala
4. Aggiungi prodotti → invia a cucina
5. Per pagare: click su tavolo → **Paga** → scegli metodo (preconto / scontrino / fattura)
6. Opzioni split: conto unico / per piatto / alla romana

---

### Prenotazione Online — Come configurare

1. Vai su **Impostazioni** (`#/bo-configurazione`)
2. Configura slot disponibili per servizio (pranzo/cena/aperitivo)
3. Vai su **Booking Form Builder** (`#/booking-form-builder`)
4. Copia il link pubblico → incollalo sul sito o nei social
5. Il link pubblico è: `app.ristoflow-ai.com/prenotazione-online.html?form_id=XXX`

---

### WhatsApp — Configurazione

**Dati fissi:**
- Phone Number ID: `1079292468608484`
- WABA ID: `969232959308152`
- Token: salvato in Supabase come `WHATSAPP_TOKEN`

**Numeri collegati:**

| Numero | Azienda | Stato |
|--------|---------|-------|
| +39 334 948 7644 | Ristoflow AI | ✅ Attivo |
| +39 375 990 7993 | Trattoria dell'Aquila | ⏳ In sospeso |
| +39 333 583 1766 | Campo Antico | ❌ Non verificato |

**Template approvati:**
- `ristoflow_notifica` ✅
- `timbratura_ingresso/uscita/promemoria` ⏳
- `conferma_prenotazione`, `preventivo_pronto` ⏳

---

### Promo — Come creare una promo

1. Vai su **Marketing & CRM → Promo** (`#/bo-promo`)
2. Click **Nuova promo**
3. Compila: nome, tipo sconto (%, €, 2x1, omaggio), valore
4. Tab **Visual/Landing** → personalizza immagine, colori, blocchi
5. Tab **Tracking** → inserisci Meta Pixel ID se vuoi
6. Tab **Messaggi** → configura messaggio WhatsApp automatico
7. Tab **Segmentazione** → giorni/turni disponibili
8. **Attiva** → copia link → condividi su WhatsApp/Instagram
9. Link pubblico: `app.ristoflow-ai.com/promo.html?id=XXX`

---

### Sito Web — Come pubblicare

1. Vai su **Marketing & CRM → Sito Web** (`#/bo-sito`)
2. Seleziona la sede (se hai più sedi)
3. Tab **Contenuti** → compila hero, highlights, chi siamo, contatti
4. Usa **✨ Tony** per generare copy automatico
5. Tab **Media** → seleziona foto cover, video reel, foto locale
6. Tab **Sezioni** → attiva/disattiva sezioni visibili
7. Tab **Pubblica** → inserisci slug URL → click **🚀 Pubblica ora**
8. Il sito va live su: `ristomanager-it.github.io/siti-clienti/SLUG/`

---

### Analytics — Come leggere i dati

Vai su **Marketing & CRM → Analytics** (`#/bo-analytics`)

- **Filtri:** 7 / 30 / 90 giorni + (superadmin) filtra per azienda
- **KPI:** Visite, Prenotazioni completate, % Conversione, Abbandoni
- **Funnel:** mostra dove si perdono gli utenti nel form prenotazione
- **Dove abbandonano:** step esatto (inizio / dopo data / dopo slot / dati personali)
- **Slot preferiti:** orari più cliccati
- **Fonte traffico:** UTM source, referrer
- **Device:** mobile vs desktop
- **Benchmark:** (solo superadmin) confronto conversione tra aziende

---

## 🏨 APP 2 — HOTEL (hotel.ristoflow-ai.com)

### Menu Hotel

| Sezione | Funzione |
|---------|----------|
| 🏠 Home | Dashboard hotel, KPI giornalieri |
| 🛏️ Camere | Anagrafica camere, foto, tipologie |
| 💶 Tariffe | 5 tipi regole tariffarie (stagionale, weekend, ecc.) |
| 📅 Prenotazioni | Lista prenotazioni, disponibilità, prezzi automatici |
| 🗓️ Calendario | Gantt camere con drag-and-drop |
| ✅ Check-in | Gestione arrivi, documenti ospiti |
| 👥 Ospiti | Anagrafica ospiti, storico soggiorni |
| 💬 Messaggi | Template WhatsApp (5 template hotel) |
| 📊 Marketing | Campagne hotel |
| ⚙️ Configurazione | 7 tab: dati hotel, servizi, colazione, ecc. |
| 📋 Operations | Task, regole, turni, produttività staff |

### Booking Hotel pubblico

Link pubblico: `hotel.ristoflow-ai.com/booking.html?az=AZIENDA_ID`

**Flusso ospite:**
1. Seleziona date check-in/check-out
2. Vede camere disponibili con prezzi calcolati automaticamente
3. Seleziona camera → inserisce dati → paga con Stripe
4. Riceve conferma + link biglietto

### Check-in Online

Link: `hotel.ristoflow-ai.com/public/checkin.html`

Ospite compila documento + firma digitale prima dell'arrivo.

### App Operatore Hotel (PWA mobile)

URL: `hotel.ristoflow-ai.com/hotel-operatore.html`

- Login con PIN
- Gestione task giornalieri
- Notifiche WhatsApp automatiche

---

## 🍷 APP 3 — TASTING (tasting.ristoflow-ai.com)

### Tipi di evento

| Tipo | Descrizione |
|------|-------------|
| `ingresso` | Solo QR scan all'ingresso |
| `consumazione` | Prezzo fisso + N consumazioni incluse |
| `pacchetti` | Più tier di prezzo |

### Flusso acquisto biglietto

1. **evento.html?s=SLUG** — landing pubblica evento
   - Info evento, countdown, programma, postazioni
   - Selezione categoria biglietto + slot orario
   - Modal checkout con Stripe

2. **biglietto.html?t=TOKEN** — biglietto personale
   - QR code per ingresso
   - Barra consumazioni (se tipo consumazione)
   - Sezione **referral** — condividi e porta amici
   - Cambio slot orario (fino a 2h prima)
   - Annulla biglietto

3. **gruppo.html?o=ID** — biglietti multipli (se qty > 1)

### Referral system

Ogni biglietto genera un link referral univoco:
```
tasting.ristoflow-ai.com/evento.html?s=SLUG&ref=TOKEN_BIGLIETTO
```
Chi usa questo link viene tracciato come referral nell'ordine.

### Pannello gestione Tasting

Nel gestionale principale → `#/ticket-eventi`

- Crea/modifica eventi
- Gestione categorie prezzo, slot, postazioni, foto
- Vendite e check-in (da sviluppare: `ticket-vendite.js`, `ticket-checkin.js`)
- Scanner QR: `scanner.html` (da sviluppare)

---

## 📱 APP 4 — RISTOFLOWBOOK (social.ristoflow-ai.com)

Social network per clienti dei ristoranti Ristoflow.

**Logo:** Risto=`#0E5A7A` / flow=`#00c896` / Book=`#f97316`

**Funzionalità attive:**
- Registrazione email/password
- Completamento profilo (foto, città, interessi)
- Feed post
- Reactions e commenti
- Fidelity card digitale

**In sviluppo:**
- Video player
- Sistema follower (tab Per te / Scopri)
- Storie
- Notifiche push
- Integrazione con gestionale

---

## 🌐 APP 5 — SITI CLIENTI

Siti statici generati da `bo-sito.js` e pubblicati su GitHub Pages.

**URL base:** `ristomanager-it.github.io/siti-clienti/SLUG/`

**Pagine generate per ogni sito:**
- `index.html` — Home
- `chi-siamo.html` — Chi siamo
- `menu.html` — Menu digitale (dati da Supabase)
- `contatti.html` — Contatti con mappa Google

**Sito attivo:**
- Trattoria dell'Aquila: `ristomanager-it.github.io/siti-clienti/trattoria-aquila/`

---

## ⚙️ INFRASTRUTTURA TECNICA

### Supabase

**Progetto:** `cuhcscpvhypoaplcmtjk.supabase.co` (eu-central-2)

**Secrets configurati:**

| Secret | Uso |
|--------|-----|
| `STRIPE_RISTOFLOW_SK` | Pagamenti Stripe live |
| `STRIPE_RISTOFLOW_WEBHOOK_SECRET` | Webhook Stripe |
| `SUPABASE_SERVICE_ROLE_KEY` | Operazioni admin |
| `WHATSAPP_TOKEN` | Invio messaggi Meta |
| `MY_SERVICE_KEY` | Auth interna Edge Functions |
| `GITHUB_TOKEN` | Deploy siti su GitHub Pages |

### Edge Functions attive

| Funzione | Scopo |
|----------|-------|
| `track` | Analytics — salva eventi in `page_analytics` |
| `whatsapp-send-ts` | Invio messaggi WhatsApp |
| `whatsapp-webhook` v7 | Ricezione messaggi in entrata |
| `whatsapp-create-templates` | Crea template Meta |
| `whatsapp-get-templates` | Lista template Meta |
| `github-deploy` v2 | Pubblica siti clienti su GitHub Pages |
| `ristoflow-registra-utente` | Registrazione self-service + trial 30gg |
| `ristoflow-crea-abbonamento` | Crea link pagamento Stripe |
| `ristoflow-webhook-stripe` | Gestisce eventi Stripe |
| `ristoflow-portale-cliente` | Portale self-service clienti |
| `hotel-crea-payment-intent` | Pagamenti hotel Stripe |

### Abbonamenti SaaS (Stripe live)

| Piano | Prezzo |
|-------|--------|
| Starter | €69/mese |
| Business | €119/mese |
| Catering/Pro | €169/mese |
| Hotel | €99/mese |
| Hotel+Ristorante | €199/mese |
| Fondatore 2026 | €1.500/anno |

---

## 📊 ANALYTICS — SISTEMA TRACKING

### Pagine tracciate

| Pagina | Evento principale |
|--------|------------------|
| `prenotazione-online.js` | view, slot, submit, abbandono |
| `booking.html` hotel | view, step 1-4, completata |
| Siti da `bo-sito.js` | view, click prenota, menu, mappa |
| `promo.html` | view, click scarica, submit lead |
| `evento.html` | view, biglietto, checkout, acquisto |
| `biglietto.html` | view, referral WA, copia link |

### Tabella `page_analytics`

```sql
id, azienda_id, sede_id, pagina, pagina_id, tipo, elemento, valore,
step, completato, referrer, utm_source, utm_medium, utm_campaign,
device, browser, ip_hash, session_id, created_at
```

### Tipi di eventi tracciati

| tipo | Quando |
|------|--------|
| `view` | Apertura pagina |
| `click` | Click su elemento |
| `step` | Avanzamento in un flusso |
| `submit` | Completamento azione |
| `abbandono` | Uscita senza completare |
| `error` | Errore validazione o pagamento |

---

## 🛠️ CONVENZIONI CODICE

```javascript
// Pattern export standard
export async function render(container) { ... }

// Client Supabase
const supa = () => window.supabaseClient || window.supabase;

// Colore primario
#0E5A7A

// Border radius standard
border-radius: 12px;

// Tracking analytics
window._rfTrack?.('tipo', 'elemento', { extra });
```

**Regole:**
- Mobile-first sempre, stile inline
- RLS su tutte le tabelle: sempre `USING` + `WITH CHECK`
- Secret interni: `MY_SERVICE_KEY`
- Mai inventare strutture DB — verificare sempre lo schema reale
- File sempre completi, mai snippet parziali
- Un task alla volta

---

## 🚀 OPERAZIONI COMUNI

### Aggiornare un file nel repo

Con Claude (via GitHub API):
1. Carica il file aggiornato in chat
2. Di' a Claude cosa modificare
3. Claude fa le modifiche e pusha direttamente

### Aggiungere una nuova sezione al menu

1. Apri `js/views/bo/menu.js`
2. Aggiungi voce nell'array `items` della sezione giusta
3. Apri `js/router.js`
4. Aggiungi la route: `"nome-route": () => import("./views/bo/nome-file.js")`
5. Crea il file `js/views/bo/nome-file.js` con `export async function render(container)`

### Creare una nuova Edge Function

1. In Supabase Dashboard → Edge Functions → New Function
2. Scrivi il codice Deno
3. Deploy con: `supabase functions deploy nome-funzione`
4. Aggiungi secrets necessari in Settings → Edge Functions → Secrets

### Aggiungere un template WhatsApp

1. Vai su `#/bo-template` nel gestionale
2. Crea template con variabili `{{1}}`, `{{2}}` (NON nomi)
3. Lingua: `it` (NON `it_IT`)
4. Attendi approvazione Meta (24-72h)

### Pubblicare un sito cliente

1. Vai su `#/bo-sito`
2. Seleziona sede → compila contenuti → scegli foto
3. Imposta slug URL (es. `trattoria-aquila`)
4. Click **🚀 Pubblica ora**
5. Sito live su: `ristomanager-it.github.io/siti-clienti/SLUG/`

---

## ❗ PROBLEMI COMUNI E SOLUZIONI

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| WhatsApp non invia | Token scaduto o lingua errata | Verifica `WHATSAPP_TOKEN` in Supabase; usa `"it"` non `"it_IT"` |
| Edge Function 401 | `MY_SERVICE_KEY` mancante | Aggiungi header `Authorization: Bearer MY_SERVICE_KEY` |
| Sito non si pubblica | `GITHUB_TOKEN` scaduto | Rigenera token su GitHub e aggiorna secret Supabase |
| Analytics non arrivano | Edge Function `track` JWT | JWT verification deve essere OFF su `track` |
| Stripe non funziona | Chiave test vs live | Verifica che `STRIPE_RISTOFLOW_SK` sia la chiave LIVE |
| RLS blocca query | Policy mancante | Aggiungi policy `USING (azienda_id = auth.uid())` |
| Template WA rifiutato | Variabili errate | Usa `{{1}}` `{{2}}` non `{{nome}}` `{{data}}` |

---

## 📅 ROADMAP

### Urgente
- [ ] `scanner.html` — scanner QR Tasting
- [ ] `ticket-vendite.js` — report vendite Tasting
- [ ] `ticket-checkin.js` — check-in Tasting
- [ ] Verifica numero Trattoria WA (+39 375 990 7993)
- [ ] Deploy `home.js` e `booking.html` hotel nel repo
- [ ] Completare sito Trattoria dell'Aquila con foto reali

### Breve termine
- [ ] Feature gating per piano abbonamento
- [ ] Tony AI con Claude API + dati DB in tempo reale
- [ ] Timer display cucina (alert 5 min, lampeggio+suono)
- [ ] Pagina guest hotel (`hotel.ristoflow-ai.com/guest?token=XXX`)
- [ ] Slider foto multi-immagine nel sito

### Medio termine
- [ ] App mobile Capacitor.js
- [ ] WhatsApp Chatbot completo con Tony AI
- [ ] Chat inbox bidirezionale
- [ ] Menu digitale QR code
- [ ] Google Business API
- [ ] Dashboard Motori Ristorazione
- [ ] Fatture passive AdE/Aruba

### Lungo termine
- [ ] Marketing automation catenaria libera
- [ ] Onboarding self-service con landing page pubblica
- [ ] Registrazione marchio Ristoflow UIBM (€300)

---

*Documento generato automaticamente analizzando i repository GitHub di Ristoflow.AI*
*Per aggiornamenti contatta il team di sviluppo o apri una nuova sessione Claude.*
