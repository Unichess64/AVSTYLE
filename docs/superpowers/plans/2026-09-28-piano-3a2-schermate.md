# Piano 3a-2 — Le schermate

**Revisione 4** — 28 settembre 2026, dopo il **secondo giro avversariale**, partizionato in modo diverso dal primo:
un revisore sulle **sedici correzioni** della revisione 2, uno su **ciò che non era stato corretto**. Tutti e due in
sola lettura, tutti e due leggendo da `git show 17ee3ec:…` invece che dal disco, perché altre quattro chat
scrivevano nello stesso repo.

**Sei bloccanti, tutti corretti.** Quattro verificati a lettura dall'orchestratrice prima di essere accolti.

| # | Reperto | Chi l'ha trovato |
|---|---|---|
| 1 | **`EMAIL_DI` è indicizzato per uuid, non per nome**: `EMAIL_DI.vera` è `undefined`, e `Record<string,string>` senza `noUncheckedIndexedAccess` lo tipizza `string` — **`tsc` resta verde** e sette prove muoiono a runtime | correzioni |
| 2 | Il blocco del **Task 3 riscriveva la CSP** con il jolly `*.supabase.co` che il Task 1 vieta, più una `CSP()` duplicata e un capoverso residuo che invitava a riaprire una decisione già presa | correzioni |
| 3 | `new URL(process.env…!)` **a livello di modulo**: senza `.env.local` — che il Task 1 non crea — il middleware lancia a modulo e risponde **500 su ogni rotta**, e `npm run build` esce 0 perché compila senza eseguire | correzioni |
| 4 | `statoDiProva({ versioneVisita: … })`: `StatoVisita` ha `visita`, non `versioneVisita`. **TS2353**, trenta righe sotto una riga sorella scritta giusta | correzioni |
| 5 | **«Togli» su un'operatrice disattivata fallisce per sempre**: passa da `salva_visita` con l'elenco completo, e un `operatriceId: null` dà `23502`, fuori dai sei, cioè «riprova» su un'operazione impossibile | copertura |
| 6 | **Il Task 10 non nominava `stato_visita`**: la decisione sulle versioni era stata presa nel Task 5 e non era arrivata dove si trascina | **tutti e due, da lati diversi** |

⚠️ **Due correzioni della revisione 2 ricadevano nell'errore che stavano chiudendo.** La 4 (`accedi(EMAIL_DI.vera)`)
aveva letto che il simbolo esiste senza leggerne le chiavi — che è **esattamente** il difetto che chiudeva. La 10
(`clienteEsisteAncora`) aveva chiuso un `TS2353` e ne aveva aperto un altro trenta righe sotto. Due giri di
revisione non bastano contro un **modo** di sbagliare.

⚠️ **E il dato di metodo, più utile dei singoli reperti:** delle dodici correzioni della revisione 2, le **cinque
che dovevano attraversare un confine di task** sono rimaste **tutte e cinque** nel task dove il reperto era stato
trovato. Una correzione che cambia un contratto si cerca con `grep` su tutte le righe, non si scrive dove fa male.

**Chiusa anche la famiglia dei tipi**: otto tipi usati nelle firme e mai definiti (`ServizioInScheda`,
`ClienteScelta`, `ClienteNuova`, `SchedaSerializzata`, `MessaggioSpostamento`, `MessaggioAnnulla`,
`OperatriceInColonna`, `Settimana`), più `StatoVisita` della revisione 2: **nove tipi, tre bloccanti**. La sezione
«Coerenza dei tipi» elencava gli otto **definiti** e taceva sugli otto mancanti — un inventario che elenca ciò che
c'è non trova mai ciò che manca.

**Un mio sospetto SMENTITO dalla misura**: temevo che `chiIsiede` rispondesse 503 alla prima visita.
`AuthSessionMissingError` porta `status: 400` (`@supabase/auth-js/dist/main/lib/errors.js:117`) e `_getUser` lo
**restituisce** invece di lanciarlo: la prima visita va all'accesso. La correzione regge.

**Restano aperti e dichiarati**, con la riga che li nomina nella tabella di copertura: il **segnale periodico di
connessione** (§10.3), il **selettore dei servizi** di spec §8.1, l'**aggancio del tocco**, e una dozzina di minori
dei due rapporti.

**Revisione 3** — 28 settembre 2026, composizione con il piano 3b: la prova statica di §4.8 scritta per **permessi**
e non per divieti, e il «+» flottante passato al 3b con D3b-13. ⚠︎ Quella prova **non esisteva**: era nominata una
volta sola come «prova statica da scrivere» dentro una sonda. Trovata da una chat vicina, non da un revisore.

**Revisione 2** — 28 settembre 2026, dopo **due revisioni avversariali indipendenti in parallelo**. Il database e
Vitest erano della chat che eseguiva il Task 8 del piano 3a-1, quindi la partizione consueta «empirica + a secco» non
era possibile: due revisioni **entrambe a lettura** concordano sullo stesso errore e sembrano una conferma. Sono
state partizionate per **angolo** — una dalla **norma** verso il piano (spec, migrazioni, poi il piano), una
dall'**artefatto** verso la norma (piano e codice vero, con il divieto esplicito di aprire le spec per prime).

**Esito: dodici reperti bloccanti, tutti corretti in questa revisione.** Quattro sono stati verificati a lettura
dall'orchestratrice sul codice vero prima di essere accettati.

| # | Reperto | Dove |
|---|---|---|
| 1 | **`operator.full_name` non esiste** — la colonna è `name`. `operatriceCorrente()` sollevava `NonOperatrice` a **ogni accesso riuscito**: l'app non autenticava nessuno | Task 3 |
| 2 | **`confineDaOra('09:70')` restituiva 122** — nessuna guardia sui minuti sotto 60, e il Task 2 si **autobloccava** sulla propria regola del Passo 5 | Task 2 |
| 3 | **Le chiusure a giornata intera hanno i due confini nulli** — il validatore non compilava, e forzato a compilare sollevava su **ogni giorno di ferie** | Task 2 |
| 4 | **Le firme dell'imbracatura erano inventate** — `accedi('vera')`, `access_token`, `rinnovoRiesce(stringa)`: le quattro prove del Task 3 non giravano, e una sarebbe rimasta **verde per la ragione sbagliata** | Task 3 |
| 5 | **Il middleware rispondeva 503 a chiunque non avesse una sessione valida** — prima visita compresa — e non leggeva mai `operator`, quindi **l'uscita forzata di §4.7 non era implementata** | Task 3 |
| 6 | **La CSP era azzerabile** mandando un'intestazione di richiesta, e stava in **due posti** con un `'nonce-SEGNAPOSTO'` che avrebbe bloccato ogni script | Task 1, 3 |
| 7 | **`StatoVisita` non era definito in nessuna delle 3377 righe**, e l'autocontrollo affermava il contrario. È il tipo che regge **C1** | Task 7 |
| 8 | **`(riga 6, esiste_gia)` dava messaggio vuoto e nessuna rilettura** — la scheda restava bloccata su `esiste_gia` per sempre | Task 9 |
| 9 | **Il numero di generazione non era nominato** — zero occorrenze, mentre §4.4 e §8.1 lo impongono | Task 9 |
| 10 | **`clienteEsisteAncora` non era un campo di `Scheda`**, e tre aiuti delle prove non erano definiti | Task 7, 9 |
| 11 | **Il ricontrollo dell'account su `42501` non aveva casa** — `serveRicontrolloAccount` prendeva un *esito*, e `42501` non ne è uno: l'operatrice disattivata **restava dentro l'app** | Task 4 |
| 12 | **Il primo trascinamento non aveva una fonte valida per le versioni** — `app.versione` e PostgREST rendono forme diverse, quindi lo spostamento avrebbe **rimbalzato per sempre** | Task 5, 10 |

**E un buco che non era nessuno dei dodici:** la mutazione «l'involucro usa sempre il soggetto `'invio'`» dava **zero
rosse al Task 8** (rimandata) e **zero al Task 9** (bersaglio sbagliato). **C2 — uno dei cinque contratti che il
piano dichiara di non poter sbagliare — non aveva un presidio armato in nessun task.** Ora ce l'ha, ed è una prova
sulla rotta con un `55P03` vero.

⚠︎ **La causa comune di sette dei dodici era una sola: il piano assumeva il codice invece di leggerlo.** Nessuno di
quei sette stava nell'elenco dei punti deboli dichiarati, che pure ne prevedeva dieci.

**Non ancora corretti:** i reperti **maggiori e minori** dei due rapporti — fra cui il selettore dei servizi di
spec §8.1, il segnale periodico di connessione ridotto a un nome di file, l'aggancio del tocco senza funzione né
prova, e le coppie `(4, non_trovata)` / `(5, non_trovata)` che *sono* state corrette ma di cui resta da rivedere il
testo nel Task 10. Sono elencati nel rapporto della revisione e vanno in un secondo giro.

**Revisione 1** — 28 settembre 2026, prima stesura.

> **Per chi esegue:** questo piano si esegue in una **chat fresca lanciata dall'utente**, un task alla volta, con
> l'orchestratrice che rivede fra un task e l'altro. **Non** si applicano `superpowers:subagent-driven-development` né
> `superpowers:executing-plans`: lo dice il processo di questo progetto. I passi usano le caselle `- [ ]`.

**Obiettivo:** costruire l'applicazione Next.js che il salone usa per vedere e scrivere il giorno — accesso,
navigazione, le tre agende, la scheda visita, il percorso di scrittura con le Server Actions, «Controlla»,
il trascinamento e l'aggiornamento in diretta — sopra le funzioni che il piano 3a-1 ha consegnato nel database.

**Architettura:** App Router di Next.js. Le **letture** vanno dritte al database con la sessione dell'operatrice,
sotto la sicurezza per riga (D3-13); le **scritture** passano da Server Actions con il solo JWT dell'utente, mai con
`service_role`. Ogni decisione che si può prendere senza il database vive in `src/dominio/` come **logica pura** con
le sue prove in `tests/dominio/` — è il bacino che `npm run test:fuso` esercita su un fuso americano. Le schermate
consumano quelle funzioni e non ridecidono niente.

**Stack:** Next.js (App Router) ≥ 15.2.3, React 19, TypeScript 5.9, `@supabase/ssr` e `@supabase/supabase-js`,
`libphonenumber-js`, Vitest 2.1 con `jsdom` per i componenti, Playwright per le prove da capo a fondo, Node 22.

**Spec:** `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md` — **letto alla revisione 20** — e
`docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`, revisione 5. Il piano argomenta da lì: chi esegue
legge tutti e due.

⚠︎ **Su quale revisione è scritto questo piano.** Revisione **20** della spec 3a, quella in vigore il 28/09/2026
mentre il piano veniva scritto. La chat che esegue il **Task 8 del piano 3a-1** stava lavorando nello stesso
momento e potrebbe aver portato la spec a **revisione 21**: chi esegue **rilegge la testa della spec** e, se la
revisione è cambiata, confronta il registro della revisione nuova con i cinque contratti della sezione «Che cosa
questo piano non può sbagliare» qui sotto **prima** di toccare il Task 1.

---

## Che cosa è stato letto per scrivere questo piano

- `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md` — **per intero**, revisione 20.
- `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md` — §7.4, §8 (intera), §9 (intera), §10 (intera), §13.4.
- `docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` — «Vincoli globali», «Struttura dei file»,
  il Task 8 (contratto di `annuncio`), e le appendici di esecuzione dei **Task 5, 6 e 7**, comprese le tabelle delle
  sonde e i reperti aperti.
- `docs/superpowers/plans/2026-09-18-availability-findings.md` — «Obblighi che passano al piano 3» e i limiti aperti
  di `cercaPosti`, `decodificaFinestra` e `tempo.ts`.
- Le migrazioni `0013`, `0014`, `0015`, `0016`, `0017`, `0018` — riga per riga per le firme e le forme di ritorno;
  `0011` e `0012` per le due funzioni di lettura che già esistono.
- `supabase/migrations/0019_annunci.sql` e `tests/schema/annunci.test.ts` **esistevano già sul disco** mentre questo
  piano veniva scritto, ma appartengono al Task 8 in esecuzione: **non sono stati letti come contratto**. Il
  contratto usato è quello scritto nel piano 3a-1, Task 8.
- `tests/helpers/db.ts`, `tests/helpers/sessioni.ts` (firme), `package.json`, `tsconfig.json`, `vitest.config.ts`,
  `supabase/config.toml`, `src/dominio/*.ts` (interfacce esportate e corpo di `tempo.ts` e `finestra.ts`).
- `next.config.*` **non esiste**: non c'è ancora una sola riga di applicazione.

**Non è stato eseguito nessun comando che tocchi il database, Vitest o l'indice di git.** Ogni numero di questo piano
è quindi **[proposta]** o **[da misurare]**, mai [misurato]: chi ha scritto il piano non poteva misurare niente.
I numeri **[misurato]** che compaiono sono citazioni della spec o del piano 3a-1, con la fonte accanto.

---

## Che cosa questo piano non può sbagliare

Cinque contratti che il piano 3a-1 ha pagato con revisioni avversariali. Ogni task che li tocca li ripete in testa;
chi esegue non li deduce dal codice.

**C1 — «Controlla» decide sulla coppia `(riga, esito_invio)`, mai su `riga`.** Spec §4.4, revisione 20. La riga 1
arriva da due esiti con prescrizioni **opposte** sulle versioni: `annullato` → «Salva» riparte con le **versioni di
partenza della scheda**, mai rilette; `non_trovata` con la visita trovata → la scheda **adotta lo stato letto** e le
sue versioni, e con esso vale «La scheda aggiornata» (le modifiche non inviate si perdono). Chi decide sul solo
numero sbaglia uno dei due casi, e nel verso `annullato` sbaglia **in silenzio**, togliendo il lavoro della collega.
⚠︎ `controlla_invio` **non restituisce mai `riga: 3`**: l'immagine della funzione è `{1, 2, 4, 5, 6, 7}`, e la
distinzione 2/3 la fa l'app confrontando `stato` con la scheda.

**C2 — L'involucro degli errori distingue per SOGGETTO prima che per codice.** Spec §4.3 passo 8, revisione 20. Un
SQLSTATE di un **invio** prova l'annullamento della scrittura; un SQLSTATE di **«Controlla»** non prova niente,
perché l'invio può ancora arrivare, e §4.4 impone *«Non so se è stata salvata»*, mai «non risulta», mai «riprova a
salvare». ⚠︎ `55P03` — attesa sulla chiave d'invio oltre `lock_timeout`, misurato dalla prova (c) del Task 7 — **non
è fra i sei** con un messaggio proprio: un involucro che applicasse il criterio del passo 8 anche a «Controlla»
darebbe la frase che §4.4 vieta. L'involucro **non ha un elenco di codici riconosciuti**: distingue *SQLSTATE
presente* da *SQLSTATE assente*, e dentro il primo caso cerca i sei che hanno un messaggio proprio.

**C3 — `p_attesi` va PROIETTATO e ORDINATO a ogni chiamata.** Spec §4.1 regola 6, misurato il 25/09/2026. Il
confronto è un `is distinct from` fra due array `jsonb`, che in PostgreSQL è **posizionale**. Chi chiama deve ogni
volta **proiettare** su `{"id","versione"}` e **solo** quelle due chiavi — `stato_visita` ne restituisce **sei** —
e **ordinare per `id`**. Chi riparte dalla risposta di un `salvata` è già conforme; chi riparte da `stato` dopo un
`modificata_altrove` — che è ciò che §4.4 gli impone — **deve** proiettare e ordinare.

**C4 — Le versioni viaggiano come TESTO, mai attraverso un `Date` di JavaScript.** Spec §10.2. Un `Date` tronca i
microsecondi e ogni salvataggio diventa un falso «modificata altrove». Le versioni arrivano da `app.versione()` come
stringa e si rimandano indietro **così come sono**. ⚠︎ Nell'imbracatura delle prove servono i parser per `date`
(OID 1082) e `date[]` (OID 1182): senza, a est di UTC ogni data torna il giorno precedente — verde in CI, rosso a
Perugia. Tutti e due sono già in `tests/helpers/db.ts` [dal piano 3a-1, Task 8 passo 2].

**C5 — `RETRY-40P01` è un obbligo aperto con una prova deterministica, e vive qui.** Spec §4.3 passo 5 e §3.2: fino
a **3 ritentativi** con attese brevi e casuali, **dentro la stessa Server Action**, **con lo stesso codice d'invio**,
prima di rispondere. Non è un «Riprova» dell'utente. Bilancio: 1 s di `deadlock_timeout` per ogni `40P01`, fino a
8 s per chiamata (`statement_timeout`), e il piano deve **misurare** che il caso tipico stia nei 10 s di D3-9. ⚠︎ La
prova che il percorso ha ricevuto **almeno un** `40P01` vive in **questo** piano, non nel 3a-1 (spec §8.2): il
ritentativo vive nell'app.

---

## Vincoli globali

Valgono per **ogni** task; non si ripetono task per task.

- **Italiano** in prosa, commenti, nomi delle prove, messaggi di commit, nomi di funzioni e di file nuovi, testi
  dell'interfaccia. Restano in inglese solo gli identificatori già congelati: il contratto di `proposeStarts`, le
  colonne delle 19 migrazioni esistenti, i codici dei motivi (`full`, `salon_closed`, `operator_off`,
  `service_too_long`), i nomi degli esiti delle funzioni del database (`salvata`, `modificata_altrove`, …), che sono
  già italiani, e i nomi propri di Next.js e React.
- **Rotte in italiano:** `/accesso`, `/agenda`, `/clienti`, `/disponibilita`, `/impostazioni`.
- ⛔ **Questo piano non aggiunge nessuna migrazione.** Il percorso di scrittura è tutto nel database dal piano 3a-1, e
  le letture passano da PostgREST sotto la sicurezza per riga (§4.8). Se durante l'esecuzione emerge un bisogno di
  SQL nuovo, **non si scrive**: si ferma il task e si riporta all'orchestratrice, perché i numeri `0020` e `0021`
  sono rivendicati dai Task 9 e 10 del piano 3a-1.
- ⛔ **Mai `psql`**: non è installato e da proprietario scavalca la sicurezza per riga. Si misura con `pg` da Node o
  dall'app con la sessione dell'operatrice.
- **Nessun dato personale in un URL**, né nell'indirizzo della pagina né nella querystring verso PostgREST (§4.8).
  La data nell'indirizzo sì: è `/agenda?giorno=2026-10-03`, e si **valida prima di usarla**. La prova statica che lo
  presidia è al **Task 5**, ed è scritta come **elenco di permessi**, non di divieti — vedi lì la ragione, che è
  misurata.
- **Nessun `service_role`** nell'ambiente di esecuzione dell'app: né in `.env.local`, né in `next.config.ts`, né in
  CI. Una prova statica lo presidia (Task 1).
- **Identità sempre con `getUser()`**, mai `getSession()`, mai `getClaims()` (§4.2).
- **Le versioni viaggiano come testo** (C4). Nessun `new Date(...)` su un valore che arriva da `app.versione()`:
  una prova statica cerca la forma (Task 4).
- **Prove prima del codice.** Ogni passo di implementazione è preceduto dal passo che scrive la prova e da quello
  che la vede **fallire con il messaggio atteso**.
- **Ogni prova che asserisce un vuoto** ha accanto una prova positiva che la renda capace di fallire.
- **Dati non degeneri** nelle prove: più di un servizio, più di un'operatrice, pause diverse da zero, due date, due
  appuntamenti nella stessa visita.
- **Gate del progetto**, alla fine di ogni task, con l'output vero incollato nel resoconto:
  `npx supabase db reset`, `npm test`, `npm run test:fuso`, `npx tsc --noEmit`, e dal Task 1 anche `npm run build`.
  Dal Task 12 anche `npm run e2e`.
  ⚠︎ **In serie, mai in parallelo**: due suite insieme sullo stesso database danno righe duplicate dentro
  `seedFixture` e una suite appesa [dal piano 3a-1].
- **Prerequisito:** Docker (OrbStack). Se `docker info` fallisce: `open -a OrbStack`, ~30 s, poi `npx supabase start`.
- **Sonde di mutazione** alla fine di ogni task, con la tabella `mutazione → prova che deve arrossire` e il numero di
  rosse **misurato**, non dedotto. Ogni sonda si ripristina **da copia di scorta fatta dopo aver scritto la
  mutazione**, mai con `git checkout --`, che sui file non tracciati li cancella.

---

## Le quattro decisioni prese dall'utente il 28 settembre 2026

Non stanno nella spec: sono nate scrivendo questo piano e sono state chieste in blocco.

| # | Decisione | Dove pesa |
|---|---|---|
| **D2-1** | **La vista colonne/lista e l'operatrice della settimana si ricordano in `localStorage`**, allargando l'eccezione di §4.9. Non sono dati personali: sono due preferenze di vista. ⚠︎ La frase «Unica eccezione dichiarata» di §4.9 diventa **falsa** e va corretta nella spec | Task 5, Task 6 |
| **D2-2** | **Un'operatrice disattivata non compare MAI nell'elenco delle operatrici della scheda.** Conseguenza accettata dall'utente: per cambiare l'orario di un suo appuntamento **dalla scheda** bisogna prima riassegnarlo a una collega attiva. Il **trascinamento** e l'**eliminazione** restano possibili senza riassegnare, perché `sposta_visita_a` e `cancella_visita` non toccano l'operatrice | Task 7, Task 8, Task 10 |
| **D2-3** | **Niente link «Password dimenticata».** La schermata d'accesso porta una riga di testo: *«Se hai dimenticato la password, chiedi a chi gestisce il salone.»* Coerente con D3-20 e onesta oggi, che l'SMTP predefinito non consegna alle operatrici | Task 3 |
| **D2-4** | **Gli invii pendenti trovati alla riapertura si mostrano come una striscia in testa all'agenda, toccabile** («3 salvataggi da controllare»), non come un foglio bloccante. Costo accettato: «prima di tutto» di §4.4 punto 3 diventa «bene in vista», non «bloccante» | Task 9 |

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `next.config.ts` | intestazioni di §4.9, `serverActions.allowedOrigins` **non** allargato, nessun service worker |
| `.nvmrc`, `package.json` (`engines`) | `NODE-PIN` su Node 22 |
| `src/middleware.ts` | rinnovo della sessione, uscita forzata, `Cache-Control: no-store` |
| `src/app/layout.tsx` | scheletro, caratteri, nonce della CSP |
| `src/app/accesso/pagina.tsx` → `page.tsx` | accesso con email e password (D2-3) |
| `src/app/(salone)/layout.tsx` | navigazione a quattro voci, striscia degli invii pendenti (D2-4) |
| `src/app/(salone)/agenda/page.tsx` | agenda: colonne, lista, settimana |
| `src/app/(salone)/clienti/page.tsx`, `disponibilita/page.tsx`, `impostazioni/page.tsx` | segnaposto |
| `src/app/api/controlla/route.ts` | «Controlla», **fuori dalla fila** delle Server Actions |
| `src/app/api/battito/route.ts` | segnale periodico di connessione |
| `src/server/supabase.ts` | client con la sola sessione dell'utente, `getUser()` |
| `src/server/involucro.ts` | l'involucro unico di §4.2 attorno a ogni Server Action |
| `src/server/azioni-visita.ts` | `salva`, `elimina`, `togli`, `sposta`, `annulla` |
| `src/server/lettura-giorno.ts` | la lettura del giorno, con `availability_window` e PostgREST |
| `src/dominio/perugia.ts` | data e ora di Europe/Rome, linea dell'ora |
| `src/dominio/validazione.ts` | `DATE-IMPOSSIBILI`, contorno di `decodificaFinestra`, telefono E.164 |
| `src/dominio/errori.ts` | **C2**: classificazione per soggetto |
| `src/dominio/esiti.ts` | traduzione di ogni esito nel suo messaggio |
| `src/dominio/controlla.ts` | **C1**: la decisione sulla coppia `(riga, esito_invio)` |
| `src/dominio/attesi.ts` | **C3**: proiezione e ordinamento di `p_attesi` |
| `src/dominio/ritentativi.ts` | **C5**: la politica dei ritentativi su `40P01` |
| `src/dominio/avvisi.ts` | avvisi con chiave (§4.5) |
| `src/dominio/conflitti.ts` | la frase di spec §10.1 |
| `src/dominio/scheda.ts` | il modello della scheda visita e il confronto «uguale alla scheda» |
| `src/dominio/invii-pendenti.ts` | i codici in `localStorage`, con scadenza a 24 ore |
| `src/dominio/blocchi.ts` | dalla lettura del giorno ai blocchi dell'agenda (contiguità, §9.1) |
| `src/cliente/…` | i componenti React dell'agenda, della scheda e del trascinamento |
| `tests/dominio/*.test.ts` | tutta la logica pura — **eseguita anche da `npm run test:fuso`** |
| `tests/app/*.test.ts` | le Server Actions e la rotta contro Supabase locale con sessioni vere |
| `tests/e2e/*.spec.ts` | Playwright, telefono simulato a 375 e 430 punti |
| `playwright.config.ts` | i due telefoni, il server di prova |
| `.github/workflows/ci.yml` (modifica) | il passo Playwright dopo quelli attuali |

---

## L'ordine dei task, e perché

1. **Scheletro e contorno** — senza `next build` che passa non si misura niente.
2. **Il tempo di Perugia e le validazioni che mancano** — logica pura, chiude tre obblighi di §3.2, e ogni task
   successivo la consuma.
3. **Accesso, sessioni, navigazione** — dà il guscio dentro cui le schermate vivono.
4. **L'involucro e la traduzione degli esiti** — **C2**, logica pura, prima di qualunque scrittura.
5. **Lettura del giorno e agenda a colonne** — la schermata d'atterraggio.
6. **Agenda a lista e settimana** — le altre due viste, piccole.
7. **Scheda visita in lettura** — cliente, data, servizi, durate, avvisi; ancora senza scrivere.
8. **Le Server Actions di scrittura** — **C3**, **C5**; salva, elimina, togli.
9. **«Controlla»** — **C1**; la rotta, i codici pendenti, l'abbandono, «Esci».
10. **Trascinamento e «Annulla»** — l'ultima superficie di scrittura, la più ricca di casi.
11. **Aggiornamento in diretta** — dipende dal Task 8 del piano 3a-1.
12. **Playwright e gate finale**.

---

### Task 1: lo scheletro Next.js, le intestazioni e il contorno

**Files:**
- Create: `next.config.ts`
- Create: `.nvmrc`
- Create: `src/middleware.ts` (**solo la CSP e le intestazioni**; l'identità la aggiunge il Task 3)
- Create: `src/app/layout.tsx`
- Create: `src/app/pagina-di-prova/page.tsx` (provvisoria, cancellata dal Task 3)
- Create: `src/app/manifest.ts`
- Create: `tests/app/contorno.test.ts`
- Modify: `package.json` (dipendenze, `engines`, script `dev`, `build`, `start`)
- Modify: `tsconfig.json` (`jsx`, `paths`, `include` su `src/app`)
- Modify: `.github/workflows/ci.yml` (passo `npm run build`)
- Modify: `.gitignore` (`.next/`, `.env.local`)

**Interfaces:**
- Consuma: niente; è il primo task.
- Produce: un'applicazione che risponde su `http://127.0.0.1:3000`, `npm run build` che esce 0, e le intestazioni
  di §4.9 su ogni risposta.

**Perché Next non può essere una versione qualsiasi.** Spec §3.1: «versione di Next non inferiore a quelle che
correggono CVE-2025-29927» [dalla revisione]. Quella falla permette di **scavalcare il middleware** con
un'intestazione, e il middleware di questo progetto è ciò che butta fuori un'operatrice disattivata (§4.7). Le
versioni corrette sono `15.2.3`, `14.2.25`, `13.5.9` e `12.3.5`: il piano prende il ramo **15**, e fissa
`"next": "^15.2.3"` [proposta] con la versione esatta scritta in `package-lock.json`.

**Perché `serverActions.allowedOrigins` non si allarga.** È la difesa contro un POST diretto a una Server Action da
un'altra origine. §4.2 dice che ogni Server Action è comunque raggiungibile con un POST diretto e **si protegge da
sola** (l'account attivo si ricontrolla dentro, passo 1): l'origine è la seconda difesa, non la prima, e allargarla
toglie la seconda senza aggiungere niente.

- [ ] **Passo 1: installa e fissa Node 22**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
printf '22\n' > .nvmrc
npm pkg set engines.node=">=22 <23"
npm install next@^15.2.3 react@^19 react-dom@^19
npm install --save-dev @types/react @types/react-dom @types/node jsdom @testing-library/react @testing-library/user-event
npm install @supabase/ssr @supabase/supabase-js libphonenumber-js
```

`@supabase/supabase-js` risulterà già presente come dipendenza di sviluppo dal Task 8 del piano 3a-1: **spostala fra
le dipendenze vere** (`npm install @supabase/supabase-js`), perché ora la usa anche l'applicazione.

- [ ] **Passo 2: scrivi le prove del contorno, che falliscono**

```ts
// tests/app/contorno.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const leggi = (percorso: string) => readFileSync(new URL(`../../${percorso}`, import.meta.url), 'utf8')

describe('il contorno dell applicazione', () => {
  it('fissa Node 22 in .nvmrc e in engines, come la CI', () => {
    expect(leggi('.nvmrc').trim()).toBe('22')
    const pacchetto = JSON.parse(leggi('package.json'))
    // ⚠︎ `toMatch(/22/)` sarebbe soddisfatto da ">=12 <22": si asserisce il
    // pavimento, che è ciò che NODE-PIN vuole.
    expect(pacchetto.engines.node).toContain('>=22')
    // La CI è la fonte: NODE-PIN esiste perché i tre numeri non divergano.
    // ⚠︎ Gli apici sono FACOLTATIVI in YAML e `ci.yml:11` porta oggi
    // `node-version: 22` SENZA apici: un `toContain("node-version: '22'")`
    // — la forma della prima stesura — resterebbe rosso a fine task per un
    // fatto di sintassi, non di versione. Si accettano tutte e due le forme.
    expect(leggi('.github/workflows/ci.yml')).toMatch(/node-version:\s*'?"?22'?"?\s*$/m)
  })

  it('non allarga serverActions.allowedOrigins', () => {
    expect(leggi('next.config.ts')).not.toContain('allowedOrigins')
  })

  it('non registra nessun service worker (spec §4.1)', () => {
    const pacchetto = JSON.parse(leggi('package.json'))
    const dipendenze = { ...pacchetto.dependencies, ...pacchetto.devDependencies }
    expect(Object.keys(dipendenze).filter((n) => /workbox|next-pwa|serwist/.test(n))).toEqual([])
    expect(leggi('src/app/layout.tsx')).not.toContain('serviceWorker')
  })

  it('non nomina mai service_role in nessun file di configurazione', () => {
    for (const f of ['next.config.ts', 'package.json', '.github/workflows/ci.yml']) {
      expect(leggi(f)).not.toContain('service_role')
      expect(leggi(f)).not.toContain('SERVICE_ROLE')
    }
  })

  it('la CSP sta in UN SOLO posto: il middleware', () => {
    // ⚠︎ La prima stesura la scriveva in due posti — `next.config.ts` con un
    // 'nonce-SEGNAPOSTO' e il middleware con il nonce vero — e si prometteva
    // di «misurare quale vince». Se vince il config, il browser riceve
    // 'nonce-SEGNAPOSTO' e BLOCCA OGNI SCRIPT dell'app. Una CSP che si scrive
    // in due posti e vince l'ultima è il modo classico di perderla.
    expect(leggi('next.config.ts')).not.toContain('Content-Security-Policy')
    const mw = leggi('src/middleware.ts')
    expect(mw).toContain("'strict-dynamic'")
    expect(mw).not.toContain('unsafe-inline')
    expect(mw).not.toContain('unsafe-eval')
    expect(mw).toContain("frame-ancestors 'none'")
    expect(mw).toContain("base-uri 'none'")
    expect(mw).toContain("object-src 'none'")
    expect(mw).toContain("form-action 'self'")
  })

  it('connect-src nomina il progetto, non ogni progetto Supabase del mondo', () => {
    // §4.9 scrive `https://<progetto>.supabase.co`. Un jolly renderebbe ogni
    // progetto Supabase una destinazione ammessa, e §4.9 dichiara che i cookie
    // di sessione sono leggibili da JavaScript: la CSP è la mitigazione
    // dichiarata contro una XSS, e con il jolly perde la metà che conta.
    const mw = leggi('src/middleware.ts')
    expect(mw).toContain('connect-src')
    expect(mw).not.toMatch(/connect-src[^;]*\*\.supabase\.co/)
  })

  it('porta le altre intestazioni di §4.9', () => {
    const config = leggi('next.config.ts')
    expect(config).toContain('Referrer-Policy')
    expect(config).toContain('no-referrer')
    expect(config).toContain('X-Content-Type-Options')
    expect(config).toContain('nosniff')
    expect(config).toContain('Strict-Transport-Security')
  })

  it('non spegne lo zoom: axe lo conta come violazione', () => {
    // La regola `meta-viewport` di axe-core segnala un `maximum-scale` sotto 2
    // come «Zooming and scaling must not be disabled». Il Task 12 fa girare axe
    // su ogni schermata: senza questa riga, la prima riga del piano si scopre
    // sbagliata all'ultimo task. D3-3 chiede telefoni in verticale, NON di
    // spegnere lo zoom.
    expect(leggi('src/app/layout.tsx')).not.toContain('maximumScale')
  })
})
```

- [ ] **Passo 3: vedi le prove fallire**

Esegui: `npx vitest run tests/app/contorno.test.ts`
Atteso: **8 rosse** [proposta], tutte con `ENOENT` su `next.config.ts` o `src/middleware.ts`, che il Passo 1 non ha
ancora creato. ⚠︎ **Non** con `ENOENT .nvmrc`: il Passo 1 lo ha già scritto, e questa è la correzione di un errore
della prima stesura, che dava «6 rosse, la prima con ENOENT .nvmrc».

⚠︎ Il numero è **[proposta]**: chi esegue **scrive il numero vero**. E lo scrive nella **categoria giusta** — queste
prove leggono file, quindi girano davvero e danno rosse vere; le prove degli altri task importano moduli, e lì un
modulo mancante dà `1 file failed, 0 tests`, non N rosse.

⚠︎ **La prova 1 potrebbe essere rossa per il quoting, non per la versione.** `ci.yml:11` porta oggi
`node-version: 22` senza apici; la regex del Passo 2 li accetta facoltativi, quindi **non deve** esserlo. Se lo è, il
reperto è la regex.

- [ ] **Passo 4: scrivi `next.config.ts`**

La CSP con il nonce non si può scrivere tutta qui, perché il nonce cambia a ogni richiesta: le intestazioni fisse
stanno in `next.config.ts`, e la riga `script-src` con il nonce la scrive il **middleware** (Task 3). Qui si scrive
la forma completa con il segnaposto, così la prova del Passo 2 la vede e il middleware la sostituisce.

```ts
// next.config.ts
import type { NextConfig } from 'next'

// ⚠︎ La CSP NON sta qui. Il nonce di §4.9 cambia a ogni richiesta, quindi la
// CSP la scrive `src/middleware.ts`, in UN SOLO posto. La prima stesura di
// questo piano la scriveva in tutti e due — qui con un 'nonce-SEGNAPOSTO' — e
// rimandava a «misurare quale vince»: se avesse vinto questa, il browser
// avrebbe ricevuto il segnaposto e bloccato ogni script dell'app. Reperto
// bloccante della revisione del 28/09/2026.
//
// Qui restano le tre intestazioni che NON dipendono dalla richiesta.

const config: NextConfig = {
  // serverActions.allowedOrigins NON si allarga (§3.1).
  async headers() {
    return [
      {
        source: '/:percorso*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default config
```

⚠︎ **`src/middleware.ts` nasce qui, non al Task 3.** La prima stesura lo creava al Task 3 e faceva leggere la CSP a
una prova del Task 1: una prova che legge un file che non esiste ancora. Qui il middleware porta **solo** la CSP e le
intestazioni, con `matcher` già al suo posto; il Task 3 vi **aggiunge** l'identità (`chiIsiede`, i tre esiti, il
redirect). Così ogni task resta provabile da sé.

La CSP prende l'origine del progetto dall'ambiente, mai un jolly:

```ts
/**
 * L'origine del progetto, non `*.supabase.co`: §4.9 scrive
 * `https://<progetto>.supabase.co`, e un jolly renderebbe ogni progetto
 * Supabase del mondo una destinazione ammessa — cioè toglierebbe alla CSP la
 * metà che conta contro la XSS che §4.9 dichiara possibile.
 *
 * ⚠︎ PIGRA E DIFENSIVA, e non è pignoleria. Scritta come
 * `const SUPABASE = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin` a
 * livello di modulo — la forma della prima stesura — una variabile mancante
 * fa lanciare `TypeError: Invalid URL` DURANTE LA VALUTAZIONE DEL MODULO, e un
 * middleware che fallisce a modulo risponde 500 su OGNI rotta del matcher,
 * `/accesso` compresa. ⚠︎ E `npm run build` COMPILA il middleware senza
 * eseguirlo, quindi esce 0: il gate non lo vedrebbe. Reperto bloccante del
 * secondo giro di revisione.
 */
function origineSupabase(): { https: string; wss: string } | null {
  const grezza = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (grezza === undefined || grezza === '') return null
  try {
    const origine = new URL(grezza).origin
    return { https: origine, wss: origine.replace(/^http/, 'ws') }
  } catch {
    return null
  }
}

function CSP(nonce: string): string {
  const s = origineSupabase()
  if (s === null) {
    // Degrada invece di spegnere l'applicazione, e lo dice a chi sviluppa.
    console.warn('NEXT_PUBLIC_SUPABASE_URL assente o non valida: connect-src ristretto a self')
  }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    s === null ? "connect-src 'self'" : `connect-src 'self' ${s.https} ${s.wss}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
  ].join('; ')
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|webp)$).*)'],
}
```

⚠︎ **`new URL('https://x.supabase.co').origin` dà `'https://x.supabase.co'`, e `.replace(/^http/, 'ws')` dà
`'wss://x.supabase.co'`** — l'ancora `^` sostituisce solo `http` in testa, e la `s` di `https` resta. Verificato
carattere per carattere dal secondo giro di revisione.

- [ ] **Passo 4b: crea l'ambiente locale, che il middleware pretende**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
cat > .env.local.esempio <<'FINE'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# La chiave anonima locale: `npx supabase status` la stampa come «anon key».
NEXT_PUBLIC_SUPABASE_ANON_KEY=<da `npx supabase status`>
FINE
cp .env.local.esempio .env.local   # poi si incolla la chiave vera
```

⚠︎ `.env.local` è in `.gitignore` (Passo 6); `.env.local.esempio` **si committa**. ⚠︎ E **nessun `SERVICE_ROLE`**:
la prova del Passo 2 lo cerca.

⚠︎ **`style-src 'self'` senza nonce è da misurare al Passo 7**: `next/font/google` in App Router emette `<style>`
in linea, e se il browser li blocca la pagina arriva senza caratteri. Se morde, **è un reperto del Task 1**, non una
riga da allargare a `unsafe-inline`: la strada è `'nonce-…'` anche su `style-src`.

- [ ] **Passo 5: scrivi lo scheletro e il manifesto**

```ts
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Cinzel, Cinzel_Decorative, Manrope } from 'next/font/google'
import './globale.css'

// D3-5: Manrope per l'interfaccia, con le cifre tabulari (§6.1); Cinzel solo
// per titoli e marchio, perché è un carattere da display e a densità d'agenda
// non si legge (spec §9.12).
const manrope = Manrope({ subsets: ['latin'], variable: '--carattere-testo' })
const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '600'], variable: '--carattere-titolo' })
const cinzelDecorativo = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--carattere-marchio',
})

export const metadata: Metadata = { title: 'AVStyle' }

// D3-3: solo telefoni, in verticale, 375–430 punti.
// ⚠︎ NIENTE `maximumScale`. La prima stesura scriveva `maximumScale: 1`, che
// la regola `meta-viewport` di axe-core conta come violazione («Zooming and
// scaling must not be disabled») — e il Task 12 fa girare axe su ogni
// schermata. D3-3 chiede telefoni in verticale, non di spegnere lo zoom: in un
// salone, con le mani occupate, ingrandire è la prima cosa che si fa.
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function Scheletro({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${manrope.variable} ${cinzel.variable} ${cinzelDecorativo.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

`src/app/globale.css` porta i cinque gettoni di spec §9.12 e le cifre tabulari:

```css
:root {
  --rosa-cipria: #FDEDF0;
  --rosa-marchio: #F3A4BA;
  --rosa-profondo: #C2185B;
  --inchiostro: #140D18;
  --bianco: #FFFFFF;
}
body {
  background: var(--rosa-cipria);
  color: var(--inchiostro);
  font-family: var(--carattere-testo), system-ui, sans-serif;
  /* §6.1, D3-5: senza questa riga le ore non si incolonnano. */
  font-variant-numeric: tabular-nums;
  margin: 0;
}
```

`src/app/manifest.ts` restituisce nome, colori e `display: 'standalone'` — **e niente `serviceWorker`**.

- [ ] **Passo 6: allinea `tsconfig.json`, gli script e la CI**

```bash
npm pkg set scripts.dev="next dev" scripts.build="next build" scripts.start="next start"
```

In `tsconfig.json`: `"jsx": "preserve"`, `"lib": ["ES2022", "DOM", "DOM.Iterable"]`,
`"plugins": [{ "name": "next" }]`, `"paths": { "@/*": ["./src/*"] }`, e `include` esteso a `src/**/*.tsx` e
`.next/types/**/*.ts`. In `.gitignore`: `.next/`, `.env.local`.

In `.github/workflows/ci.yml`, **dopo** i passi esistenti: `- run: npm run build`.

- [ ] **Passo 7: vedi le prove passare, e il build**

Esegui, in quest'ordine e **mai in parallelo**:
```bash
npx vitest run tests/app/contorno.test.ts
npm run build
```
Atteso: prove verdi; `npm run build` esce 0. ⚠︎ Il build fallisce se `src/app/pagina-di-prova/page.tsx` non esiste:
Next vuole almeno una pagina. È provvisoria e la cancella il Task 3.

⚠️⚠️ **E poi CHIEDI UNA PAGINA, che è la sola cosa che prova ciò che questo task dichiara di produrre.**

```bash
npm run dev &
sleep 4
curl -sS -i http://127.0.0.1:3000/pagina-di-prova | head -20
kill %1
```

Atteso: **200**, e nell'intestazione un `Content-Security-Policy` che contiene `'nonce-` e **non** contiene
`*.supabase.co`.

**Perché non basta il build.** `npm run build` **compila** il middleware e non lo esegue: un errore a livello di
modulo esce 0 al gate e 500 al primo visitatore. Le `Interfaces` di questo task promettono «un'applicazione che
risponde su `http://127.0.0.1:3000`», e senza questa riga quella promessa resta **non verificata fino al Task 12**.
Reperto bloccante del secondo giro di revisione.

⚠︎ Questo `curl` è anche la **vittima della sonda 6 del Task 3** («`senzaCache` legge un'intestazione della
richiesta»): quella sonda nominava «la prova del Task 1 che legge l'intestazione vera della risposta», e prima di
questo passo **quella prova non esisteva in nessun task**.

- [ ] **Passo 8: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire | Rosse attese |
|---|---|---|---|
| 1 | `.nvmrc` a `20` | «fissa Node 22 in .nvmrc e in engines» | 1 [da misurare] |
| 1b | `engines.node` a `">=12 <22"` | idem — ⚠︎ con il `toMatch(/22/)` della prima stesura sarebbe stata **0**: la stringa contiene «22» | 1 [da misurare] |
| 2 | aggiungi `allowedOrigins: ['*']` in `next.config.ts` | «non allarga serverActions.allowedOrigins» | 1 [da misurare] |
| 3 | in `src/middleware.ts`, `'strict-dynamic'` → `'unsafe-inline'` | «la CSP sta in UN SOLO posto: il middleware» | 1 [da misurare] |
| 3b | rimetti la CSP **anche** in `next.config.ts` (la forma della prima stesura) | «la CSP sta in UN SOLO posto» | 1 [da misurare] |
| 3c | `connect-src` torna a `https://*.supabase.co` | «connect-src nomina il progetto» | 1 [da misurare] |
| 4 | togli `Referrer-Policy` | «porta le altre intestazioni» | 1 [da misurare] |
| 5 | aggiungi una riga di commento con `service_role` in `next.config.ts` | «non nomina mai service_role» | 1 [da misurare] |
| 5b | **svuota `next.config.ts`** (file vuoto, non mancante) | ⚠︎ **forse nessuna**: le prove 2, 3 e 5 sono tutte `not.toContain` e un file vuoto le soddisfa tutte. Se dà 0, **si aggiunge** un'asserzione positiva («il config esporta `headers`») | [da misurare] |
| 6 | rimetti `maximumScale: 1` | «non spegne lo zoom» | 1 [da misurare] |
| 7 | togli `font-variant-numeric` da `globale.css` | **nessuna** — dichiarato: la prova visiva è del Task 5 | 0 [da misurare] |

⚠︎ La sonda 5 è la **controprova della prova sul `service_role`**: senza di lei quella prova è un `not.toContain` che
resterebbe verde anche su un file vuoto. La **5b** è la stessa lezione generalizzata, ed è nuova dopo la revisione:
tre prove su otto di questo task sono `not.toContain`, e un `not.toContain` non distingue «il file è giusto» da «il
file non dice niente». La sonda 7 è dichiarata **senza vittime** in partenza: serve a non far credere che il
carattere sia presidiato qui.

- [ ] **Passo 9: gate e commit**

```bash
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit && npm run build
```

```bash
git add next.config.ts .nvmrc .gitignore package.json package-lock.json tsconfig.json \
        src/middleware.ts src/app/layout.tsx src/app/globale.css src/app/manifest.ts \
        src/app/pagina-di-prova/page.tsx tests/app/contorno.test.ts .github/workflows/ci.yml
git commit -m "$(cat <<'MESSAGGIO'
feat(3a-2): lo scheletro Next.js, le intestazioni e NODE-PIN

Next sul ramo 15 (>= 15.2.3), che è la prima versione a correggere
CVE-2025-29927: quella falla scavalca il middleware, e il middleware di questo
progetto è ciò che butta fuori un'operatrice disattivata. `allowedOrigins` NON
è allargato: §4.2 dice che ogni Server Action si protegge da sola, quindi
l'origine è la seconda difesa e allargarla la toglie senza dare niente.

La CSP sta in UN SOLO posto, il middleware, perché il nonce cambia a ogni
richiesta. La prima stesura la metteva anche in next.config.ts con un
'nonce-SEGNAPOSTO' e rimandava a «misurare quale vince»: se avesse vinto il
config, il browser avrebbe ricevuto il segnaposto e bloccato ogni script
dell'app. In next.config.ts restano le tre intestazioni che non dipendono
dalla richiesta.

`connect-src` nomina l'origine del progetto, presa dall'ambiente, e non
`*.supabase.co`: §4.9 dichiara che i cookie di sessione sono leggibili da
JavaScript e che la CSP è la mitigazione contro la XSS, e un jolly le
toglierebbe la metà che conta.

Niente `maximumScale`: la regola meta-viewport di axe conta lo zoom spento
come violazione, e il Task 12 fa girare axe su ogni schermata. D3-3 chiede
telefoni in verticale, non di spegnere lo zoom.

NODE-PIN chiuso su tre fonti che devono restare d'accordo: .nvmrc, engines e
il node-version della CI. La prova le legge tutte e tre, e accetta gli apici
di YAML come facoltativi, perché ci.yml oggi non li porta.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MESSAGGIO
)"
```

---

### Task 2: il tempo di Perugia, le date impossibili e le guardie che nessuno prova

**Files:**
- Create: `src/dominio/perugia.ts`
- Create: `src/dominio/validazione.ts`
- Create: `tests/dominio/perugia.test.ts`
- Create: `tests/dominio/validazione.test.ts`
- Modify: `src/dominio/tempo.ts` (esporta `pezziData`, **e aggiunge a `confineDaOra` la guardia sui minuti** — vedi
  il reperto qui sotto)

**Interfaces:**
- Consuma: `src/dominio/tempo.ts` (`MINUTI_PER_CELLA`, `CELLE_PER_GIORNO`, `blocco`, `confineDaOra`, `sommaGiorni`),
  `src/dominio/finestra.ts` (`DocumentoFinestra`, `decodificaFinestra`).
- Produce:
  ```ts
  // src/dominio/perugia.ts
  export function oggiAPerugia(adesso?: Date): string            // 'YYYY-MM-DD'
  export function minutiTrascorsiAPerugia(adesso?: Date): number // 0..1440, dall'orologio, non dai millisecondi
  export function confineDellOraAPerugia(adesso?: Date): number  // la linea dell'ora, in celle frazionarie
  // src/dominio/validazione.ts
  export function dataReale(data: string): string                // solleva su 2026-02-31
  export function dataDallIndirizzo(grezza: string | null, oggi: string): string
  export function telefonoE164(grezzo: string, paese?: 'IT'): string
  export function validaDocumentoFinestra(d: DocumentoFinestra): DocumentoFinestra
  ```

**Perché questo task sta prima delle schermate.** §3.2 gli assegna tre obblighi aperti — `DATE-IMPOSSIBILI`,
`GUARDIE-TEMPO` e la parte `decodificaFinestra` di `CONTORNO-CERCAPOSTI` — e §7 impone che date e ore siano di
**Europe/Rome** qualunque sia il fuso del telefono. Ogni schermata successiva chiama queste funzioni: scriverle dopo
significherebbe riscriverle.

⚠︎ **La linea dell'ora non si calcola dai millisecondi dalla mezzanotte.** Spec §7: il 25 ottobre 2026 alle 10:00 a
Perugia ne sono trascorse **11**, e il 28 marzo 2027 alle 10:00 ne sono trascorse **9**, perché quei due giorni
durano 25 e 23 ore. La posizione si prende da **ora e minuti dell'orologio di Perugia** letti con `Intl`.

⚠︎ **`DATE-IMPOSSIBILI` è un buco vero, non una formalità.** `pezziData` in `tempo.ts:45` valida la **forma**
`YYYY-MM-DD` con una regex ancorata, e niente più: `sommaGiorni('2026-02-31', 0)` restituisce `'2026-03-03'`, perché
`Date.UTC(2026, 1, 31)` trabocca in silenzio. Una data impossibile entrerebbe nell'indirizzo della pagina, si
trasformerebbe in un'altra data e l'agenda mostrerebbe un giorno che l'operatrice non ha chiesto.

⚠︎⚠︎ **REPERTO BLOCCANTE, trovato dalle due revisioni del 28/09/2026 da lati diversi e verificato a lettura
dall'orchestratrice: `confineDaOra('09:70')` NON solleva — restituisce 122.** `src/dominio/tempo.ts:33-43` valida la
**forma** `HH:MM` e la **griglia da cinque minuti**, e **non** valida che i minuti stiano sotto 60. Il conto:
`9·60 + 70 = 610`; `610 % 5 === 0`, quindi la guardia della griglia **non scatta**; `610 / 5 = 122 ≤ 288`, quindi
non scatta nemmeno quella della mezzanotte. La funzione restituisce **122**, cioè le **10:10**. Lo stesso per
`'19:60'` (= 20:00), `'23:60'`, `'00:99'`.

**Che cosa cambia in questo task.** La prima stesura diceva «questo task non riscrive le guardie, scrive le prove che
le rendono capaci di fallire», e al Passo 5 ordinava di **fermare il task** se una di quelle prove fosse rimasta
rossa. Con `09:70` la prova sarebbe rossa **contro il codice non mutato**, e il task si sarebbe bloccato sulla
propria regola — con la tentazione, per chi esegue, di **ammorbidire la prova** (`'09:70'` → `'0x:70'`) invece di
chiudere il buco. Quindi: **il Task 2 scrive una guardia**, dichiarandolo, e la prova che oggi è rossa **è il
reperto**, non un errore di trascrizione.

**Raggiungibilità.** Oggi nessuna: `confineDaOra` non ha chiamanti di produzione (divergenza 7). Dal **Task 5** ne
avrà uno — l'agenda che traduce un'ora in confine — e `'09:70' → 10:10` diventerebbe un orario sbagliato mostrato in
silenzio. Un `'09:70'` non nasce da una tastiera: nasce da un'aritmetica su ore e minuti, che è esattamente ciò da
cui il dominio a due indici difende.

⚠︎ **Le guardie di `blocco()` esistono già** (`tempo.ts:91-102`), e **quattro asserzioni su otto sono già
esercitate** da `tests/dominio/tempo.test.ts:86-119`: lo scavalco della mezzanotte dai due lati (`280+9` solleva,
`280+8` no), `cellCount` zero, il dominio di `startCell` (negativo, 288, frazionario) e `bufferAfterCells` negativo.
⚠︎ La prima stesura diceva «**nessuna** prova le esercita»: **è falso**, misurato a lettura il 28/09/2026. Restano
scoperti **quattro** casi soltanto — `cellCount` negativo e frazionario, `bufferAfterCells` frazionario, e
`endCell === 287` —, e le prove di questo task **si sovrappongono** a quelle esistenti. Conseguenza sui numeri: le
sonde 9, 10 e 11 danno **due** rosse ciascuna, non una.

Le **ancore** delle regex di `confineDaOra` e `pezziData` sono invece davvero `^…$` e davvero non presidiate: una
mutazione a `\d{2}:\d{2}` senza ancore lascerebbe passare `x09:00y`.

- [ ] **Passo 1: scrivi le prove del tempo di Perugia, che falliscono**

```ts
// tests/dominio/perugia.test.ts
import { describe, expect, it } from 'vitest'
import { confineDellOraAPerugia, minutiTrascorsiAPerugia, oggiAPerugia } from '../../src/dominio/perugia'

// Gli istanti sono scritti in UTC, che è l'unico modo di scriverli senza
// dipendere dal fuso di chi esegue. `npm run test:fuso` esegue questo file con
// TZ=America/New_York: se una sola riga leggesse l'orologio locale, qui
// diventerebbe rossa.
describe('data e ora di Europe/Rome, §7', () => {
  it('a mezzanotte e dieci di Perugia il giorno è già quello nuovo, anche se a New York è ieri', () => {
    // 2026-10-03T00:10 a Perugia = 2026-10-02T22:10Z (ora legale, +2).
    expect(oggiAPerugia(new Date('2026-10-02T22:10:00Z'))).toBe('2026-10-03')
  })

  it('alle 23:50 di Perugia il giorno è ancora quello vecchio', () => {
    expect(oggiAPerugia(new Date('2026-10-03T21:50:00Z'))).toBe('2026-10-03')
  })

  it('il 25 ottobre 2026 alle 10:00 di Perugia sono trascorse 11 ore, non 10 (§7)', () => {
    // Il giorno dura 25 ore: alle 10:00 locali sono passati 660 minuti dalla
    // mezzanotte locale. Contarli come 600 metterebbe la linea un'ora sopra.
    const alle10 = new Date('2026-10-25T09:00:00Z') // +1 dopo il cambio
    expect(minutiTrascorsiAPerugia(alle10)).toBe(600)
    const dallaMezzanotte = alle10.getTime() - new Date('2026-10-24T22:00:00Z').getTime()
    expect(dallaMezzanotte / 60000).toBe(660) // ← e questo è il numero da NON usare
  })

  it('il 28 marzo 2027 alle 10:00 di Perugia sono trascorse 9 ore, non 10', () => {
    const alle10 = new Date('2027-03-28T08:00:00Z') // +2 dopo il cambio
    expect(minutiTrascorsiAPerugia(alle10)).toBe(600)
    const dallaMezzanotte = alle10.getTime() - new Date('2027-03-27T23:00:00Z').getTime()
    expect(dallaMezzanotte / 60000).toBe(540)
  })

  it('la linea dell ora sta a 10:00 in tutti e due i giorni del cambio', () => {
    expect(confineDellOraAPerugia(new Date('2026-10-25T09:00:00Z'))).toBe(120)
    expect(confineDellOraAPerugia(new Date('2027-03-28T08:00:00Z'))).toBe(120)
  })

  it('la linea dell ora è frazionaria: alle 10:02 sta dopo la cella delle 10:00', () => {
    const alle1002 = new Date('2026-07-01T08:02:00Z')
    expect(confineDellOraAPerugia(alle1002)).toBeCloseTo(120.4, 5)
  })
})
```

⚠︎ Le ultime due asserzioni di ciascuna delle due prove sul cambio d'ora **non provano il codice**: provano che i due
istanti scelti siano davvero i due giorni del cambio. Sono lì perché una prova che dicesse solo `toBe(600)`
resterebbe verde anche su un giorno normale, e non si accorgerebbe di aver perso il caso.

- [ ] **Passo 2: vedi le prove fallire**

Esegui: `npx vitest run tests/dominio/perugia.test.ts`
Atteso: **6 rosse** con `Cannot find module '../../src/dominio/perugia'` [proposta — si scrive il numero vero].

- [ ] **Passo 3: scrivi `src/dominio/perugia.ts`**

```ts
// src/dominio/perugia.ts
//
// §7: date e ore di Europe/Rome qualunque sia il fuso del telefono. Niente qui
// legge il fuso di chi esegue: `Intl` riceve il nome del fuso per esteso, che
// è l'unico modo di leggere l'orologio di Perugia da un telefono in vacanza.
import { CELLE_PER_GIORNO, MINUTI_PER_CELLA } from './tempo'

const FUSO = 'Europe/Rome'

const PEZZI = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function leggiOrologio(adesso: Date): { data: string; ore: number; minuti: number } {
  const p = Object.fromEntries(PEZZI.formatToParts(adesso).map((x) => [x.type, x.value]))
  return {
    data: `${p.year}-${p.month}-${p.day}`,
    ore: Number(p.hour),
    minuti: Number(p.minute),
  }
}

/** Il giorno di Perugia, in 'YYYY-MM-DD'. */
export function oggiAPerugia(adesso: Date = new Date()): string {
  return leggiOrologio(adesso).data
}

/**
 * I minuti dell'OROLOGIO, non quelli trascorsi dall'istante di mezzanotte.
 *
 * §7 lo dice con due esempi: il 25 ottobre 2026 alle 10:00 sono trascorse 11
 * ore dalla mezzanotte, e il 28 marzo 2027 ne sono trascorse 9. La linea
 * dell'ora deve stare alle 10:00 in tutti e due i giorni, quindi si legge
 * l'orologio e non si sottraggono istanti.
 */
export function minutiTrascorsiAPerugia(adesso: Date = new Date()): number {
  const { ore, minuti } = leggiOrologio(adesso)
  return ore * 60 + minuti
}

/** La posizione della linea dell'ora, in celle FRAZIONARIE (§5.1). */
export function confineDellOraAPerugia(adesso: Date = new Date()): number {
  const cella = minutiTrascorsiAPerugia(adesso) / MINUTI_PER_CELLA
  return Math.min(cella, CELLE_PER_GIORNO)
}
```

- [ ] **Passo 4: scrivi le prove della validazione, che falliscono**

```ts
// tests/dominio/validazione.test.ts
import { describe, expect, it } from 'vitest'
import { blocco, confineDaOra } from '../../src/dominio/tempo'
import {
  dataDallIndirizzo,
  dataReale,
  telefonoE164,
  validaDocumentoFinestra,
} from '../../src/dominio/validazione'

describe('DATE-IMPOSSIBILI', () => {
  it('accetta una data vera e la restituisce com era', () => {
    expect(dataReale('2026-10-03')).toBe('2026-10-03')
    expect(dataReale('2028-02-29')).toBe('2028-02-29') // bisestile vero
  })

  it('rifiuta il 31 febbraio, che oggi diventa il 3 marzo in silenzio', () => {
    expect(() => dataReale('2026-02-31')).toThrow(RangeError)
  })

  it('rifiuta il 29 febbraio di un anno non bisestile', () => {
    expect(() => dataReale('2026-02-29')).toThrow(RangeError)
  })

  it('rifiuta il mese 13 e il giorno 00', () => {
    expect(() => dataReale('2026-13-01')).toThrow(RangeError)
    expect(() => dataReale('2026-10-00')).toThrow(RangeError)
  })

  it('rifiuta una forma che la regex non ancorata lascerebbe passare', () => {
    expect(() => dataReale('x2026-10-03')).toThrow(RangeError)
    expect(() => dataReale('2026-10-03y')).toThrow(RangeError)
  })
})

describe('la data che arriva dall indirizzo della pagina', () => {
  it('senza parametro dà oggi', () => {
    expect(dataDallIndirizzo(null, '2026-10-03')).toBe('2026-10-03')
  })

  it('con una data vera dà quella', () => {
    expect(dataDallIndirizzo('2026-12-24', '2026-10-03')).toBe('2026-12-24')
  })

  it('con una data impossibile dà oggi, senza sollevare: l indirizzo è dell utente', () => {
    expect(dataDallIndirizzo('2026-02-31', '2026-10-03')).toBe('2026-10-03')
    expect(dataDallIndirizzo('ieri', '2026-10-03')).toBe('2026-10-03')
  })
})

describe('GUARDIE-TEMPO: le guardie di blocco() e le ancore delle regex', () => {
  it('blocco() accetta un appuntamento vero', () => {
    expect(blocco('a', 120, 6, 2)).toEqual({
      appointmentId: 'a', startCell: 120, endCell: 125, bufferAfterCells: 2,
    })
  })

  it('blocco() rifiuta cellCount zero, negativo e frazionario', () => {
    expect(() => blocco('a', 120, 0, 2)).toThrow(RangeError)
    expect(() => blocco('a', 120, -1, 2)).toThrow(RangeError)
    expect(() => blocco('a', 120, 1.5, 2)).toThrow(RangeError)
  })

  it('blocco() rifiuta bufferAfterCells negativo e frazionario, e accetta lo zero', () => {
    expect(() => blocco('a', 120, 6, -1)).toThrow(RangeError)
    expect(() => blocco('a', 120, 6, 0.5)).toThrow(RangeError)
    expect(blocco('a', 120, 6, 0).bufferAfterCells).toBe(0)
  })

  it('blocco() rifiuta lo scavalco della mezzanotte e accetta l ultima cella intera', () => {
    expect(() => blocco('a', 287, 2, 0)).toThrow(RangeError)
    expect(blocco('a', 287, 1, 0).endCell).toBe(287)
  })

  it('confineDaOra accetta 287 come inizio e 288 come fine, e rifiuta 289', () => {
    expect(confineDaOra('23:55')).toBe(287)
    expect(confineDaOra('24:00')).toBe(288)
    expect(() => confineDaOra('24:05')).toThrow(RangeError)
  })

  it('confineDaOra rifiuta 09:70 e le forme che una regex senza ancore accetterebbe', () => {
    expect(() => confineDaOra('09:70')).toThrow(RangeError)
    expect(() => confineDaOra('x09:00')).toThrow(RangeError)
    expect(() => confineDaOra('09:00y')).toThrow(RangeError)
  })
})

describe('CONTORNO-CERCAPOSTI, parte decodificaFinestra: l agenda valida ciò che riceve', () => {
  // ⚠︎ La chiusura è A GIORNATA INTERA, con i due confini NULLI: è la forma
  // normale (ferie, lutto, domenica), e `salon_closure_boundary_pair`
  // (0006:56) impone che siano nulli INSIEME. Il documento «buono» la porta
  // apposta: senza, le sei prove negative passerebbero su un documento che non
  // somiglia a quelli veri, e il ramo delle chiusure resterebbe scoperto.
  const documentoBuono = {
    weekly: [{ operator_id: 'v', weekday: 5, start_boundary: 108, end_boundary: 156 }],
    exceptions: [],
    closures: [
      { start_date: '2026-12-25', end_date: '2026-12-26', from_boundary: null, to_boundary: null, reason: 'Natale' },
      { start_date: '2026-12-24', end_date: '2026-12-24', from_boundary: 156, to_boundary: 288, reason: 'Vigilia' },
    ],
    occupancy: [
      { operator_id: 'v', date: '2026-10-03', appointment_id: 'a1', start_cell: 120, cell_count: 6, buffer_after_cells: 2 },
    ],
  }

  it('lascia passare un documento buono, invariato', () => {
    expect(validaDocumentoFinestra(documentoBuono)).toEqual(documentoBuono)
  })

  it('una chiusura a giornata intera, con i due confini nulli, passa', () => {
    // La gemella della prova qui sotto: senza di lei, «rifiuta un confine
    // spaiato» resterebbe verde anche con un validatore che rifiuta OGNI nullo.
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        closures: [documentoBuono.closures[0]],
      }),
    ).not.toThrow()
  })

  it('rifiuta una chiusura con un solo confine nullo, che il vincolo del database vieta', () => {
    for (const spaiata of [
      { from_boundary: 156, to_boundary: null },
      { from_boundary: null, to_boundary: 288 },
    ]) {
      expect(() =>
        validaDocumentoFinestra({
          ...documentoBuono,
          closures: [{ ...documentoBuono.closures[0], ...spaiata }],
        }),
      ).toThrow(RangeError)
    }
  })

  it('rifiuta una chiusura parziale con i confini rovesciati', () => {
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        closures: [{ ...documentoBuono.closures[1], from_boundary: 288, to_boundary: 156 }],
      }),
    ).toThrow(RangeError)
  })

  it('rifiuta un giorno della settimana fuori da 0-6', () => {
    expect(() =>
      validaDocumentoFinestra({ ...documentoBuono, weekly: [{ ...documentoBuono.weekly[0], weekday: 7 }] }),
    ).toThrow(RangeError)
  })

  it('rifiuta una fascia che finisce prima di cominciare', () => {
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        weekly: [{ ...documentoBuono.weekly[0], start_boundary: 156, end_boundary: 108 }],
      }),
    ).toThrow(RangeError)
  })

  it('rifiuta un confine fuori da 0-288', () => {
    expect(() =>
      validaDocumentoFinestra({ ...documentoBuono, weekly: [{ ...documentoBuono.weekly[0], end_boundary: 289 }] }),
    ).toThrow(RangeError)
  })

  it('rifiuta una data impossibile in un occupazione', () => {
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        occupancy: [{ ...documentoBuono.occupancy[0], date: '2026-02-31' }],
      }),
    ).toThrow(RangeError)
  })

  it('rifiuta due occupazioni con lo stesso appointment_id, che darebbero righe duplicate', () => {
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        occupancy: [documentoBuono.occupancy[0], documentoBuono.occupancy[0]],
      }),
    ).toThrow(RangeError)
  })
})

describe('il telefono in E.164 (spec riga 511)', () => {
  it('normalizza le due forme italiane nello stesso numero', () => {
    expect(telefonoE164('347 1234567')).toBe('+393471234567')
    expect(telefonoE164('+39 347 1234567')).toBe('+393471234567')
  })

  it('rifiuta un numero che non si normalizza', () => {
    expect(() => telefonoE164('12')).toThrow(RangeError)
  })
})
```

- [ ] **Passo 5: vedi le prove fallire, e conta**

Esegui: `npx vitest run tests/dominio/validazione.test.ts`
Atteso: **il file non si carica**. ⚠︎ Quando un `import` non risolve, Vitest fallisce la **raccolta**: riporta
`1 file failed, 0 tests` con un errore non gestito, **non** N prove rosse. Chi esegue scrive quello che vede, non un
numero di rosse che non esiste ancora. (La stessa avvertenza vale per i Passi 2 di questo task, del Task 1 e del
Task 4: la prima stesura del piano vi scriveva «N rosse», che è una categoria sbagliata.)

⚠︎ **Cinque delle sei prove di `GUARDIE-TEMPO` diventano verdi senza scrivere una riga di `tempo.ts`.** La sesta —
`confineDaOra('09:70')` — **resta rossa, ed è il reperto**: la guardia sui minuti non esiste (vedi il reperto
bloccante in testa al task). Il Passo 6 la scrive. **Non si ammorbidisce la prova.** Se una delle altre cinque è
rossa dopo il Passo 6, *quello* sì che è un reperto nuovo, e lì il task si ferma.

- [ ] **Passo 6: scrivi `src/dominio/validazione.ts` ed esporta `pezziData`**

```ts
// src/dominio/validazione.ts
import parseTelefono from 'libphonenumber-js/min'
import type { DocumentoFinestra } from './finestra'
import { CELLE_PER_GIORNO, pezziData } from './tempo'

/**
 * DATE-IMPOSSIBILI. `pezziData` valida la FORMA con una regex ancorata e basta:
 * `sommaGiorni('2026-02-31', 0)` restituisce '2026-03-03', perché
 * `Date.UTC(2026, 1, 31)` trabocca in silenzio. Qui si costruisce la data e si
 * controlla che i tre pezzi tornino uguali: è l'unico modo di distinguere il
 * traboccamento senza riscrivere il calendario.
 */
export function dataReale(data: string): string {
  const [anno, mese, giorno] = pezziData(data)
  const costruita = new Date(Date.UTC(anno, mese - 1, giorno))
  if (
    costruita.getUTCFullYear() !== anno ||
    costruita.getUTCMonth() !== mese - 1 ||
    costruita.getUTCDate() !== giorno
  ) {
    throw new RangeError(`data che non esiste nel calendario: ${data}`)
  }
  return data
}

/**
 * §4.8: «la data dall'indirizzo della pagina si valida prima di usarla».
 * Non solleva: l'indirizzo lo scrive chi usa l'app, e una barra degli indirizzi
 * storta non deve dare una schermata d'errore. Ripiega su oggi.
 */
export function dataDallIndirizzo(grezza: string | null, oggi: string): string {
  if (grezza === null) return oggi
  try {
    return dataReale(grezza)
  } catch {
    return oggi
  }
}

export function telefonoE164(grezzo: string, paese: 'IT' = 'IT'): string {
  const numero = parseTelefono(grezzo, paese)
  if (numero === undefined || !numero.isValid()) {
    throw new RangeError('numero di telefono non riconosciuto')
  }
  return numero.number
}

function confineValido(c: number, dove: string): void {
  if (!Number.isInteger(c) || c < 0 || c > CELLE_PER_GIORNO) {
    throw new RangeError(`confine fuori da 0-${CELLE_PER_GIORNO} in ${dove}: ${c}`)
  }
}

function fasciaValida(da: number, a: number, dove: string): void {
  confineValido(da, dove)
  confineValido(a, dove)
  if (a <= da) throw new RangeError(`fascia che finisce prima di cominciare in ${dove}: ${da}-${a}`)
}

/**
 * I confini di una CHIUSURA sono nullabili, e lo sono INSIEME.
 *
 * ⚠︎ `salon_closure` (`0006_availability.sql:46-56`) dichiara `from_boundary` e
 * `to_boundary` come `smallint` senza `not null`, con il vincolo
 * `salon_closure_boundary_pair check ((from_boundary is null) = (to_boundary is
 * null))`: due nulli sono la GIORNATA INTERA, cioè la forma normale di una
 * chiusura — ferie, lutto, un giorno di riposo. `availability_window`
 * (`0012:100-105`) li emette grezzi, quindi arrivano come `null` in JSON.
 *
 * La prima stesura di questo piano passava quei `null` a `fasciaValida(da:
 * number, a: number)`: non compilava, e forzata a compilare avrebbe sollevato
 * su OGNI giorno coperto da una chiusura intera — cioè `leggiGiorno` avrebbe
 * mostrato una pagina d'errore al posto di un salone chiuso, a ogni
 * caricamento. Reperto bloccante della revisione del 28/09/2026.
 */
function chiusuraValida(
  da: number | null,
  a: number | null,
  dove: string,
): void {
  if (da === null || a === null) {
    // Il vincolo del database, replicato alla porta: o tutti e due o nessuno.
    if (da !== a) throw new RangeError(`chiusura con un solo confine nullo in ${dove}: ${da}-${a}`)
    return
  }
  fasciaValida(da, a, dove)
}

/**
 * CONTORNO-CERCAPOSTI, parte `decodificaFinestra`: §3.2 dice che «l'agenda è il
 * primo chiamante; valida ciò che riceve». `decodificaFinestra` non valida
 * nulla, e le sue tre trappole misurate dal piano della disponibilità —
 * operatrici duplicate che danno righe duplicate, confini fuori dominio,
 * fasce rovesciate — entrerebbero nell'agenda e uscirebbero come blocchi.
 *
 * Non si valida dentro `decodificaFinestra`: quella funzione è congelata dal
 * piano 2 e ha le sue prove. Si valida alla porta.
 */
export function validaDocumentoFinestra(d: DocumentoFinestra): DocumentoFinestra {
  for (const r of d.weekly) {
    if (!Number.isInteger(r.weekday) || r.weekday < 0 || r.weekday > 6) {
      throw new RangeError(`giorno della settimana fuori da 0-6: ${r.weekday}`)
    }
    fasciaValida(r.start_boundary, r.end_boundary, 'weekly')
  }
  for (const r of d.exceptions) {
    dataReale(r.date)
    for (const f of r.ranges) fasciaValida(f.start_boundary, f.end_boundary, 'exceptions')
  }
  for (const c of d.closures) {
    dataReale(c.start_date)
    dataReale(c.end_date)
    if (c.end_date < c.start_date) throw new RangeError('chiusura che finisce prima di cominciare')
    chiusuraValida(c.from_boundary, c.to_boundary, 'closures')
  }
  const visti = new Set<string>()
  for (const o of d.occupancy) {
    dataReale(o.date)
    if (visti.has(o.appointment_id)) {
      throw new RangeError(`occupazione ripetuta per l appuntamento ${o.appointment_id}`)
    }
    visti.add(o.appointment_id)
    // Le guardie di dominio su start_cell, cell_count e buffer le porta già
    // `blocco()`, che `decodificaFinestra` chiama: qui non si duplicano.
  }
  return d
}
```

In `src/dominio/tempo.ts` si cambiano **due cose, e solo queste**.

**La prima è una parola:** `function pezziData` diventa `export function pezziData`.

**La seconda è la guardia mancante**, tre righe dentro `confineDaOra`, subito dopo l'`exec` e **prima** del calcolo
dei minuti:

```ts
export function confineDaOra(ora: string): IndiceConfine {
  const pezzi = /^(\d{2}):(\d{2})$/.exec(ora)
  if (pezzi === null) throw new RangeError(`orario non nella forma HH:MM: ${ora}`)
  // ⚠︎ AGGIUNTA il 28/09/2026 dopo la revisione avversariale. Senza questa
  // riga `'09:70'` non solleva: 9·60+70 = 610, che è multiplo di 5 e sta sotto
  // 288, quindi passa indenne tutte e due le guardie sotto e la funzione
  // restituisce 122 — le 10:10. La griglia da cinque minuti non implica un
  // orologio valido, e la regex della FORMA nemmeno.
  if (Number(pezzi[2]) > 59) throw new RangeError(`minuti oltre i 59: ${ora}`)
  const minuti = Number(pezzi[1]) * 60 + Number(pezzi[2])
  …
}
```

⚠︎ Non si tocca nient'altro. In particolare **non** si aggiunge una guardia sulle ore: `'24:00'` deve restare valido,
perché 288 è il confine di fine giornata e `confineDaOra('24:00') === 288` è asserito da una prova.

- [ ] **Passo 7: vedi tutto verde, sui due fusi**

```bash
npx vitest run tests/dominio/perugia.test.ts tests/dominio/validazione.test.ts
TZ=America/New_York npx vitest run tests/dominio/perugia.test.ts tests/dominio/validazione.test.ts
```
Le due passate devono dare **lo stesso numero di prove verdi**. Una differenza è un difetto di fuso, non un caso.

- [ ] **Passo 8: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire | Rosse attese |
|---|---|---|---|
| 1 | `minutiTrascorsiAPerugia` calcola dai millisecondi dalla mezzanotte invece che dall'orologio | «il 25 ottobre 2026 …» e «il 28 marzo 2027 …» e «la linea dell ora sta a 10:00 …» | 3 [da misurare] |
| 2 | in `PEZZI`, `timeZone: FUSO` → `timeZone: undefined` | tutte quelle di `perugia.test.ts` sotto `test:fuso`; **zero** sotto `npm test` a Perugia | 0 / 6 [da misurare] |
| 3 | `hourCycle: 'h23'` → `'h12'` | «la linea dell ora sta a 10:00 …» — ⚠︎ **forse nessuna**: alle 10:00 h12 e h23 coincidono. Se dà 0, si aggiunge una prova alle **22:00** | [da misurare] |
| 4 | `dataReale` restituisce `data` senza il confronto dei tre pezzi | «rifiuta il 31 febbraio», «rifiuta il 29 febbraio», «rifiuta il mese 13 e il giorno 00», «con una data impossibile dà oggi», «rifiuta una data impossibile in un occupazione» | **5** [da misurare] |
| 5 | `dataReale` confronta solo l'anno | le stesse cinque: tutti e tre i traboccamenti restano dentro il 2026 | **5** [da misurare] |
| 6 | `dataDallIndirizzo` non cattura: propaga il `RangeError` | «con una data impossibile dà oggi» | 1 [da misurare] |
| 7 | in `tempo.ts`, `/^(\d{4})-(\d{2})-(\d{2})$/` → `/(\d{4})-(\d{2})-(\d{2})/` | «rifiuta una forma che la regex non ancorata lascerebbe passare» | 1 [da misurare] |
| 8 | in `tempo.ts`, `/^(\d{2}):(\d{2})$/` → senza ancore | «confineDaOra rifiuta 09:70 e le forme …» | 1 [da misurare] |
| **8b** | **in `tempo.ts`, via la guardia NUOVA `Number(pezzi[2]) > 59`** | «confineDaOra rifiuta 09:70 …» — ⚠︎ è la sonda che presidia la riga aggiunta da questo task: **deve** dare almeno 1 | 1 [da misurare] |
| 9 | in `tempo.ts`, via la guardia su `cellCount` | «blocco() rifiuta cellCount zero …» **più** «rifiuta un blocco che scavalca la mezzanotte o dura zero» di `tempo.test.ts:94` | **2** [da misurare] |
| 10 | in `tempo.ts`, via la guardia su `bufferAfterCells` | «blocco() rifiuta bufferAfterCells negativo …» **più** quella di `tempo.test.ts:118` | **2** [da misurare] |
| 11 | in `tempo.ts`, `startCell + cellCount > CELLE_PER_GIORNO` → `>=` | «blocco() rifiuta lo scavalco …» **più** il `not.toThrow()` su `280+8` di `tempo.test.ts:101` | **2** [da misurare] |
| 12 | `validaDocumentoFinestra` restituisce `d` senza controllare niente | le **otto** prove negative del contorno | **8** [da misurare] |
| 13 | `fasciaValida` usa `a < da` invece di `a <= da` | **forse nessuna**: nessuna prova passa una fascia vuota `108-108`. Se dà 0, **si aggiunge la prova** | [da misurare] |
| **13b** | **`chiusuraValida` chiama `fasciaValida` anche sui nulli** (la forma della prima stesura) | «una chiusura a giornata intera … passa» e «lascia passare un documento buono» | 2 [da misurare] |
| **13c** | **`chiusuraValida` accetta qualunque nullo** (`if (da === null \|\| a === null) return`) | «rifiuta una chiusura con un solo confine nullo» | 1 [da misurare] |
| 14 | `visti` non viene mai riempito | «rifiuta due occupazioni con lo stesso appointment_id» | 1 [da misurare] |

⚠︎ **I numeri delle sonde 4, 5, 9, 10, 11 e 12 sono stati corretti il 28/09/2026 dopo la revisione avversariale**, e
la prima stesura li dava tutti a 1 o 2. Le due cause erano di **metodo**, non di distrazione, e chi esegue le eviti
entrambe: (a) non aver contato le prove **che esistono già** in `tests/dominio/tempo.test.ts`; (b) non aver seguito i
**consumatori a valle** di `dataReale`, che è chiamata anche da `dataDallIndirizzo` e da tre rami di
`validaDocumentoFinestra`. Restano **[da misurare]**: una revisione a lettura di questo progetto ha già detto «8» dove
la macchina ne ha date 9.

⚠︎ Le sonde **3** e **13** sono scritte con il loro esito **incerto** apposta. Se danno zero rosse, la risposta non è
cancellare la sonda: è **aggiungere la prova mancante** e rimisurare. Il piano 3a-1 ha imparato due volte che una
sonda a zero rosse è un presidio muto, non una mutazione equivalente.

⚠︎ La sonda **2** è quella che misura se `test:fuso` sta davvero facendo il suo lavoro: se dà zero rosse **anche**
sotto `TZ=America/New_York`, allora `Intl` sta leggendo il fuso da qualche altra parte e il presidio è falso.

- [ ] **Passo 9: gate e commit**

```bash
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit && npm run build
```

```bash
git add src/dominio/perugia.ts src/dominio/validazione.ts src/dominio/tempo.ts \
        tests/dominio/perugia.test.ts tests/dominio/validazione.test.ts
git commit -m "$(cat <<'MESSAGGIO'
feat(3a-2): il tempo di Perugia, le date impossibili e le guardie mute

Tre obblighi aperti di §3.2 chiusi insieme, perché condividono una causa: una
grandezza che sembra validata e non lo è.

DATE-IMPOSSIBILI era un buco vero. `pezziData` valida la forma e basta, quindi
`sommaGiorni('2026-02-31', 0)` restituisce '2026-03-03': la data impossibile
non veniva rifiutata, veniva convertita in un'altra data, e l'agenda avrebbe
mostrato un giorno che nessuno ha chiesto. `dataReale` costruisce la data e
ricontrolla i tre pezzi, che è l'unico modo di distinguere il traboccamento
senza riscrivere il calendario.

GUARDIE-TEMPO ha aggiunto UNA riga a `tempo.ts`, e non era in programma.
`confineDaOra('09:70')` non sollevava: 9·60+70 = 610, multiplo di 5 e sotto
288, quindi passava tutte e due le guardie e la funzione restituiva 122 — le
10:10. La griglia da cinque minuti non implica un orologio valido. Trovato
dalle due revisioni avversariali da lati diversi.

Delle otto asserzioni di `blocco()`, quattro erano GIÀ esercitate da
`tests/dominio/tempo.test.ts`: la prima stesura del piano diceva «nessuna
prova le esercita» ed era falsa. Le sonde 9, 10 e 11 danno quindi due rosse
ciascuna, non una.

Le chiusure a giornata intera hanno i due confini NULLI insieme
(`salon_closure_boundary_pair`, 0006:56), ed è la forma normale: ferie, lutto,
riposo. Il validatore della prima stesura le passava a una funzione che vuole
due `number`, quindi non compilava, e forzato a compilare avrebbe sollevato su
ogni giorno di ferie — una pagina d'errore al posto di un salone chiuso.

La linea dell'ora si legge dall'OROLOGIO di Perugia, mai dai millisecondi
dalla mezzanotte: §7 dice che il 25 ottobre 2026 alle 10:00 ne sono trascorse
11 e il 28 marzo 2027 alle 10:00 ne sono trascorse 9. Le prove portano i due
istanti in UTC e asseriscono anche il numero SBAGLIATO, così una prova che
smettesse di cadere sul giorno del cambio si vedrebbe.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MESSAGGIO
)"
```

---

### Task 3: accesso, sessioni e la navigazione a quattro voci

**Files:**
- Create: `src/server/supabase.ts`
- Modify: `src/middleware.ts` (**esiste dal Task 1** con la sola CSP: qui gli si aggiunge l'identità)
- Create: `src/app/accesso/page.tsx`, `src/app/accesso/azioni.ts`
- Create: `src/app/(salone)/layout.tsx`
- Create: `src/app/(salone)/agenda/page.tsx` (guscio; il contenuto è del Task 5)
- Create: `src/app/(salone)/clienti/page.tsx`, `disponibilita/page.tsx`, `impostazioni/page.tsx`
- Create: `src/cliente/navigazione.tsx`
- Create: `tests/app/identita.test.ts`
- Delete: `src/app/pagina-di-prova/page.tsx`
- Modify: `.env.local.esempio` (creato qui), `.gitignore`

**Interfaces:**
- Consuma: `public.chiudi_sessioni(uuid)` (0015) — **non** in questo task, ma la sua esistenza è il motivo per cui
  «Esci» chiude solo questo telefono; `app.is_active_operator()` (0014), che arbitra ogni lettura.
- Produce:
  ```ts
  // src/server/supabase.ts
  export async function clientServer(): Promise<SupabaseClient>       // con i cookie della richiesta
  export async function operatriceCorrente(client: SupabaseClient): Promise<Operatrice>
  export interface Operatrice { readonly authUserId: string; readonly operatorId: string
                                readonly nome: string; readonly colore: string }
  ```

**Perché `getUser()` e non `getSession()`.** §4.2: `getSession()` legge il cookie e si fida; `getUser()` interroga
GoTrue e vede una sessione **revocata**. E non `getClaims()`, che con chiavi di firma asimmetriche non vede la
revoca [dalla revisione, documentazione Supabase]. Con D3-17 le sessioni si chiudono **subito** quando
un'operatrice viene disattivata: una funzione che non vede la revoca renderebbe D3-17 decorativa.

**Perché il middleware non chiude sessioni sugli errori.** §4.7: zero righe **confermate** → esce da questo
telefono; **errore** (rete, disservizio) → rifiuta la richiesta senza chiudere niente. Un disservizio di Supabase
che buttasse fuori il salone sarebbe peggio del disservizio.

**D2-3:** niente link «Password dimenticata». Una riga di testo, e basta.

- [ ] **Passo 1: scrivi le prove dell'identità, che falliscono**

`tests/app/identita.test.ts` gira contro Supabase locale con **sessioni vere**, riusando l'imbracatura del piano
3a-1 (`tests/helpers/sessioni.ts`: `preparaAccountLocali`, `accedi`, `dimenticaSessioni`).

```ts
// tests/app/identita.test.ts
import { createClient } from '@supabase/supabase-js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ALESSANDRA, OUTSIDER_AUTH, VERA, VERA_AUTH, asOwner, resetData } from '../helpers/db'
import { seedFixture } from '../helpers/fixtures'
import { preparaAccountLocali, rinnovoRiesce, sessioneDi } from '../helpers/sessioni'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.SUPABASE_ANON_KEY ?? '…' // la stessa costante di annunci.test.ts

const conToken = (token: string) =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })

beforeAll(async () => { await preparaAccountLocali() })
beforeEach(async () => { await resetData(); await seedFixture() })

describe('chi è chi, §4.2 e §4.4', () => {
  it('un operatrice attiva legge la propria riga e il proprio colore', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    const { data, error } = await conToken(sessione.accessToken)
      .from('operator').select('id, name, color').eq('id', VERA).single()
    expect(error).toBeNull()
    expect(data!.id).toBe(VERA)
    expect(data!.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('un account autenticato che NON è operatrice non legge nessuna operatrice', async () => {
    const sessione = await sessioneDi(OUTSIDER_AUTH)
    const { data } = await conToken(sessione.accessToken).from('operator').select('id')
    expect(data).toEqual([])
  })

  it('un operatrice disattivata mentre la sessione è viva non legge più niente, e il rinnovo fallisce', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    // La disattivazione da proprietario: è la forma di spec §13.4 e di §8.3.
    await asOwner(async (c) => {
      await c.query('update public.operator set is_active = false where id = $1', [VERA])
    })
    const { data } = await conToken(sessione.accessToken).from('client').select('id')
    expect(data).toEqual([])                       // chiusura immediata, D3-17
    expect(await rinnovoRiesce(sessione)).toBe(false)
  })

  it('la gemella positiva: un operatrice che resta attiva legge le clienti e rinnova', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    await asOwner(async (c) => {
      // un cambio che NON deve chiudere niente (§4.7)
      await c.query('update public.operator set sort_order = 9 where id = $1', [ALESSANDRA])
    })
    const { data } = await conToken(sessione.accessToken).from('client').select('id')
    expect(data!.length).toBeGreaterThan(0)
    expect(await rinnovoRiesce(sessione)).toBe(true)
  })
})
```

⚠︎⚠︎ **Quattro correzioni del 28/09/2026, tutte da un reperto bloccante della revisione avversariale.** La prima
stesura di questo blocco aveva **quattro errori indipendenti**, e nessuno di loro sarebbe emerso come «l'app è
sbagliata»: sarebbero emersi come «le prove non girano», che è il modo più facile di perdere un difetto.

| Errore della prima stesura | La forma vera | Dove sta scritta |
|---|---|---|
| `accedi('vera')` | **`sessioneDi(VERA_AUTH)`** — vedi il riquadro qui sotto: la prima correzione era a sua volta sbagliata | `tests/helpers/sessioni.ts`, `tests/helpers/db.ts` |
| `const { access_token, refresh_token } = …` | `Sessione` è **camelCase**: `{ accessToken, refreshToken, sessionId, userId }` | `tests/helpers/sessioni.ts:77` |
| `rinnovoRiesce(refresh_token)` | vuole la **`Sessione` intera**, non la stringa | idem |
| `.select('id, full_name, color')` | la colonna è **`name`**: `operator` non ha `full_name`, che è di `client` | `0001_access_control.sql:15`, `0003_client.sql:16` |

⚠︎ Il terzo errore era il più insidioso: con una stringa al posto della `Sessione`, `sessione.refreshToken` sarebbe
`undefined`, GoTrue risponderebbe 400 e `rinnovoRiesce` darebbe **`false`** — cioè la prova **negativa** sarebbe
rimasta **verde per la ragione sbagliata**, e solo la gemella positiva sarebbe stata rossa. È la forma esatta della
«guardia muta» che questo progetto ha già pagato due volte.

⚠︎⚠︎ **LA PRIMA CORREZIONE ERA A SUA VOLTA SBAGLIATA, ed è il reperto più istruttivo di tutto il piano.** La
revisione 2 aveva sostituito `accedi('vera')` con **`accedi(EMAIL_DI.vera)`**. Il secondo giro di revisione l'ha
misurato il 28/09/2026: **`EMAIL_DI` è indicizzato per uuid dell'account, non per nome**
(`tests/helpers/sessioni.ts`):

```ts
export const EMAIL_DI: Record<string, string> = {
  '00000000-0000-4000-8000-000000000001': 'vera@example.test',
  …
  '00000000-0000-4000-8000-000000000009': 'outsider@example.test',
}
```

`EMAIL_DI.vera` è **`undefined`**. E `Record<string, string>` più l'assenza di `noUncheckedIndexedAccess` in
`tsconfig.json` fanno sì che TypeScript lo tipizzi `string`: **`npx tsc --noEmit` resta verde**, e le sette prove
muoiono a runtime con `accesso fallito per undefined: 400`, un messaggio che non nomina la causa.

**È esattamente l'errore che quella correzione stava chiudendo**: aver letto che il simbolo esiste, senza leggerne
le chiavi. La tabella qui sopra citava perfino `tests/helpers/sessioni.ts, EMAIL_DI` come fonte. Due giri di
revisione avversariale non bastano contro un modo di sbagliare: bisogna cambiare il modo.

**La forma definitiva usa `sessioneDi(<uuid>)`**, che è l'uso stabilito nel repo
(`tests/schema/sessioni-imbracatura.test.ts` fa `EMAIL_DI[ANNALISA_AUTH]`), restituisce già una `Sessione` e
**riusa la cache dei token** — che è anche ciò che il punto debole 7 di questo stesso piano prescriveva, e che la
correzione sbagliata disattendeva.

⚠︎ Tolto anche `dimenticaSessioni()` dal `beforeEach`: `resetData()` la chiama già in coda (`tests/helpers/db.ts`),
e non è `async`.

⚠︎ La quarta prova è la **gemella positiva** della terza, e senza di lei la terza resterebbe verde anche se ogni
lettura fosse sempre vuota. È il primo obbligo dei Vincoli globali.

⚠︎ Queste quattro prove **non provano il middleware**: provano il database sotto la sessione, che è ciò che il
middleware consuma. L'uscita forzata dal browser la prova il Task 12 con Playwright (spec §8.3, «Operatrice
disattivata scrivendo sul database da proprietario → uscita forzata»). **Dichiarato**, non nascosto.

- [ ] **Passo 2: vedi le prove fallire**

Esegui: `npx vitest run tests/app/identita.test.ts`
Atteso: rosse per modulo o per costante mancante [da misurare]. ⚠︎ Se sono **verdi** subito, il task non è inutile:
vuol dire che stanno provando il database e non l'app. Lo si dichiara e si prosegue.

- [ ] **Passo 3: scrivi `src/server/supabase.ts`**

```ts
// src/server/supabase.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// service_role NON sta qui e non sta nell'ambiente (§4.2). Solo la chiave
// anonima, che senza un JWT valido non legge niente: la sicurezza per riga fa
// il resto.
export async function clientServer(): Promise<SupabaseClient> {
  const deposito = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => deposito.getAll(),
        setAll: (nuovi) => {
          for (const { name, value, options } of nuovi) deposito.set(name, value, options)
        },
      },
    },
  )
}

export class NonAutenticata extends Error {}
export class NonOperatrice extends Error {}

export interface Operatrice {
  readonly authUserId: string
  readonly operatorId: string
  readonly nome: string
  readonly colore: string
}

/**
 * §4.2: `getUser()`, mai `getSession()`, mai `getClaims()`.
 *
 * `getUser()` interroga GoTrue e vede una sessione revocata; `getSession()`
 * legge il cookie e si fida, e `getClaims()` con chiavi asimmetriche non vede
 * la revoca. Con D3-17 le sessioni si chiudono SUBITO quando un'operatrice
 * viene disattivata: una lettura che non vedesse la revoca renderebbe D3-17
 * decorativa.
 *
 * La seconda lettura — la riga `operator` — non è ridondante: dice se questo
 * account è un'operatrice ATTIVA, e la sicurezza per riga la rende vuota per
 * chiunque non lo sia.
 */
export async function operatriceCorrente(client: SupabaseClient): Promise<Operatrice> {
  const { data: utente, error } = await client.auth.getUser()
  if (error !== null || utente.user === null) throw new NonAutenticata()

  // ⚠︎ La colonna è `name`. `operator` (0001_access_control.sql:15) NON ha un
  // `full_name`: quello è di `client` (0003_client.sql:16). La prima stesura di
  // questo piano scriveva `full_name` qui e nella prova, e l'effetto sarebbe
  // stato un 42703 da PostgREST, `maybeSingle()` a null e un `NonOperatrice`
  // sollevato a OGNI accesso riuscito: l'app non avrebbe autenticato nessuno.
  // Reperto bloccante, trovato dalle due revisioni del 28/09/2026 da lati
  // diversi e verificato sul catalogo.
  const { data: riga } = await client
    .from('operator')
    .select('id, name, color')
    .eq('auth_user_id', utente.user.id)
    .maybeSingle()
  if (riga === null) throw new NonOperatrice()

  return { authUserId: utente.user.id, operatorId: riga.id, nome: riga.name, colore: riga.color }
}
```

⚠︎ **Questa funzione è il collo di bottiglia dell'intera applicazione**: la chiamano il guscio `(salone)/layout.tsx`,
ogni Server Action al passo 1 di §4.3 e la rotta di «Controlla». Un difetto qui non degrada niente: **spegne tutto**.
Ed è la ragione per cui il Passo 1 di questo task, che prova il database e non l'app, è insufficiente — vedi il
Passo 8, sonda 4, che ora ha una prova sua.

- [ ] **Passo 4: AGGIUNGI l'identità a `src/middleware.ts`**

⚠️⚠️ **Non si riscrive il file: lo si estende.** `src/middleware.ts` **esiste dal Task 1** e porta già `CSP()`,
`senzaCache()`, la costante dell'origine di Supabase e il `matcher`. Questo passo aggiunge **soltanto**: i tre
import, la creazione del client, il calcolo di `pubblica`, i tre rami su `chiIsiede`, e la funzione `chiIsiede`.

⚠️ **NON si riscrive `CSP()` e NON si tocca `connect-src`.** Il blocco qui sotto mostra il file **risultante** per
leggibilità, ma `CSP()` e `senzaCache()` sono **quelle del Task 1** e vanno lasciate dove sono. Una seconda copia
di `CSP()` con `https://*.supabase.co` fa arrossire la prova del Task 1 «connect-src nomina il progetto», e la
reazione sbagliata sotto pressione è allargare la prova invece di togliere la copia. Reperto bloccante del secondo
giro di revisione: la prima stesura di questo passo mostrava un file intero e autosufficiente, etichettato
«Modify», con il jolly dentro.

```ts
// src/middleware.ts — AGGIUNTE di questo task; CSP(), senzaCache() e il
// matcher restano quelli del Task 1 e non si ripetono qui.
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(richiesta: NextRequest) {
  // Il nonce della CSP, nuovo a ogni richiesta (§4.9). `btoa` e non
  // `Buffer.from`: nell'Edge Runtime di Next `Buffer` è un polyfill che non è
  // garantito in ogni versione.
  const nonce = btoa(crypto.randomUUID())

  let risposta = NextResponse.next({ request: richiesta })
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => richiesta.cookies.getAll(),
        setAll: (nuovi) => {
          for (const { name, value } of nuovi) richiesta.cookies.set(name, value)
          risposta = NextResponse.next({ request: richiesta })
          for (const { name, value, options } of nuovi) risposta.cookies.set(name, value, options)
        },
      },
    },
  )

  const pubblica = richiesta.nextUrl.pathname === '/accesso'
                || richiesta.nextUrl.pathname.startsWith('/accesso/')

  if (!pubblica) {
    const esito = await chiIsiede(client)
    // ⚠︎ §4.7 distingue TRE casi, non due, e la prima stesura di questo piano
    // ne distingueva due sbagliati. «Zero righe CONFERMATE → esce da questo
    // telefono»; «ERRORE (rete, disservizio) → rifiuta la richiesta SENZA
    // chiudere sessioni». Il terzo — nessuna sessione del tutto — non è né
    // l'uno né l'altro: è il visitatore che deve accedere.
    if (esito === 'guasto') {
      return senzaCache(new NextResponse('servizio non raggiungibile', { status: 503 }), nonce)
    }
    if (esito !== 'operatrice') {
      // Sessione assente, scaduta, revocata, oppure account che non è
      // un'operatrice attiva: in tutti e quattro i casi si va all'accesso, che
      // è l'uscita forzata di §4.4 quando la sessione c'era.
      return senzaCache(NextResponse.redirect(new URL('/accesso', richiesta.url)), nonce)
    }
  }

  return senzaCache(risposta, nonce)
}

/**
 * Le tre risposte che §4.7 pretende, e il modo di distinguerle.
 *
 * ⚠︎ `getUser()` restituisce un `error` in TRE situazioni diverse: nessun
 * cookie (`AuthSessionMissingError`), token scaduto o sessione REVOCATA (401
 * da GoTrue), e servizio irraggiungibile. La prima stesura di questo piano
 * trattava tutte e tre come «guasto» e rispondeva 503 — quindi: 503 alla prima
 * visita di chiunque; 503 per sempre dopo l'ora di `jwt_expiry` (3600 s,
 * `config.toml:164`); e 503, mai l'uscita forzata, all'operatrice disattivata,
 * che è il caso per cui D3-17 esiste. Il redirect era codice morto. Reperto
 * bloccante della revisione del 28/09/2026.
 *
 * ⚠︎ E la seconda metà del reperto: §4.7 vuole «zero righe CONFERMATE», che è
 * una lettura di `operator`. Senza quella lettura non si produce mai «zero
 * righe confermate», e la distinzione che questo middleware esiste per fare
 * non è implementata. Quindi il ricontrollo dell'operatrice sta QUI, non solo
 * in `operatriceCorrente()`.
 */
async function chiIsiede(
  client: SupabaseClient,
): Promise<'operatrice' | 'fuori' | 'guasto'> {
  let utente
  try {
    const { data, error } = await client.auth.getUser()
    if (error !== null) {
      // 400/401/403 = risposta CONFERMATA di GoTrue: non c'è sessione valida.
      // Tutto il resto (5xx, fetch caduta) è un guasto di trasporto.
      const stato = (error as { status?: number }).status
      return stato !== undefined && stato >= 400 && stato < 500 ? 'fuori' : 'guasto'
    }
    utente = data.user
  } catch {
    return 'guasto'                       // fetch caduta: mai «fuori»
  }
  if (utente === null) return 'fuori'

  const { data: riga, error } = await client
    .from('operator').select('id').eq('auth_user_id', utente.id).maybeSingle()
  if (error !== null) return 'guasto'     // PostgREST irraggiungibile ≠ zero righe
  return riga === null ? 'fuori' : 'operatrice'
}

function senzaCache(r: NextResponse, nonce: string): NextResponse {
  // La CSP si scrive QUI e in un posto solo (vedi il Task 1): il nonce cambia a
  // ogni richiesta. ⚠︎ Non si legge nessuna intestazione della RICHIESTA per
  // decidere che cosa scrivere: la prima stesura lo faceva, e bastava mandare
  // un'intestazione `Content-Security-Policy` per azzerare la CSP di risposta.
  r.headers.set('Content-Security-Policy', CSP(nonce))
  r.headers.set('x-nonce', nonce)
  // §4.9: la bozza della scheda non deve restare in nessuna cache — e nemmeno
  // un 503, che un intermediario terrebbe buono dopo la fine del disservizio.
  r.headers.set('Cache-Control', 'no-store')
  return r
}

// ⚠︎ `CSP()`, `senzaCache()`, la costante dell'origine di Supabase e
// `export const config` STANNO GIÀ NEL FILE dal Task 1. Non si ricopiano, non
// si riscrivono, e in particolare NON si tocca `connect-src`.
```

⚠︎ **Il ricontrollo dell'account prima di «Controlla»** (§8.1) lo fa la rotta del Task 9 chiamando
`operatriceCorrente`, non questo middleware: le due cose si assomigliano e non sono la stessa. La prova che lo
presidia è al Task 9.

- [ ] **Passo 5: scrivi l'accesso (D2-3)**

`src/app/accesso/page.tsx`: logo sull'acquerello, «AVStyle» in Cinzel Decorative, entrata animata breve (§5.5),
campo email, campo password, pulsante **«Entra»**, e la riga di D2-3:

> Se hai dimenticato la password, chiedi a chi gestisce il salone.

`src/app/accesso/azioni.ts` è una Server Action che chiama `signInWithPassword` e, **se riesce**, controlla con
`operatriceCorrente()` che l'account sia un'operatrice attiva. Tre esiti, tre frasi:

| Caso | Frase |
|---|---|
| credenziali sbagliate | «Email o password non corretti.» |
| autenticata ma **non operatrice** | «Questo account non è collegato a nessuna operatrice. Chiedi a chi gestisce il salone.» [proposta] |
| autenticata e operatrice attiva | si va a `/agenda` |

⚠︎ La seconda frase è **[proposta]**: non sta in nessun documento. Se l'orchestratrice la cambia, cambia anche la
prova di Playwright del Task 12.

`«Esci»` (nel guscio, Passo 6) chiama `signOut({ scope: 'local' })`: **solo questo telefono** (§3.1). Non è
`global`, che chiuderebbe anche gli altri dispositivi della stessa operatrice; per chiudere quelle di una collega
c'è il pulsante del 3c su `public.chiudi_sessioni`.

- [ ] **Passo 6: scrivi il guscio e la navigazione a quattro voci**

`src/app/(salone)/layout.tsx` chiama `operatriceCorrente()` — se solleva, rimanda a `/accesso` — e rende:

- l'intestazione con il logo piccolo, il titolo in Cinzel e il pulsante «Esci»;
- lo spazio in cui il Task 9 metterà la striscia degli invii pendenti (D2-4);
- `children`;
- `src/cliente/navigazione.tsx`: quattro voci — **Agenda · Clienti · Disponibilità · Impostazioni** — ciascuna un
  bersaglio di almeno **44 punti** (§7), con la voce corrente segnata **anche senza colore** (peso e bordo, non solo
  il rosa: §6.2 dice che la selezione si segna anche con bordo, ombra o sollevamento).

⚠︎ **Nessun «+», e nessun segnaposto al suo posto** (§3.2). Il cercaposti è del 3b, e un «+» che non porta da nessuna
parte è peggio di nessun «+». ⚠︎ **Il confine è ora chiuso da D3b-13** (spec 3b, revisione 2, `69f5dd5`): il «+» lo
**costruisce il 3b**, sull'agenda, in basso a destra, ≥ 44 punti, deep rose `#C2185B` con il glifo bianco, ombra per
staccarlo dai blocchi, e **mai sopra la linea dell'ora**. Era un buco di confine vero: 3a §3.1 diceva «nessun +»,
questo piano scriveva «è del 3b», la spec 3c lo lasciava «non stabilito» — tre piani lo nominavano, **nessuno lo
prendeva**, e il cercaposti ha **una sola** rotta (spec §9.5, §9.11), cioè era irraggiungibile.

⚠︎ **Per chi esegue:** `src/cliente/agenda-colonne.tsx` è **l'unico file di questo piano che il 3b modificherà**. Non
si lascia un posto vuoto, un `TODO`, né un pulsante spento: si costruisce l'agenda come se il «+» non esistesse, e il
3b lo aggiunge. Al momento dell'esecuzione del 3b ci si coordina su quel file.
La pastiglia del badge su Impostazioni (spec §9.11, clienti eliminabili) è del **piano 4**: qui non si disegna.

Le tre pagine segnaposto portano una riga sola ciascuna, in Cinzel il titolo e in Manrope il testo:

| Pagina | Testo [proposta] |
|---|---|
| `/clienti` | «Le clienti arrivano con il prossimo pezzo dell'app.» |
| `/disponibilita` | «Gli orari arrivano con il prossimo pezzo dell'app.» |
| `/impostazioni` | «Le impostazioni arrivano con il prossimo pezzo dell'app.» |

- [ ] **Passo 7: cancella la pagina provvisoria e misura**

```bash
rm -r src/app/pagina-di-prova
npx vitest run tests/app/identita.test.ts
npm run build
```

- [ ] **Passo 8: sonde di mutazione**

⚠︎ **Prima delle sonde: il Passo 1 va completato con tre prove che chiamano l'APP, non il database.** La prima
stesura di questo task aveva quattro prove che esercitavano la sicurezza per riga sotto una sessione vera e **nessuna
che attraversasse `operatriceCorrente()` o il middleware** — e la revisione ha mostrato che cosa costa: `full_name`
sarebbe sopravvissuto nove task. Si aggiungono a `tests/app/identita.test.ts`:

```ts
describe('l app legge il database nel modo giusto, non solo il database', () => {
  let sessioneVera: Sessione
  let sessioneOutsider: Sessione
  beforeEach(async () => {
    sessioneVera = await sessioneDi(VERA_AUTH)
    sessioneOutsider = await sessioneDi(OUTSIDER_AUTH)
  })

  it('operatriceCorrente restituisce nome e colore di chi ha la sessione', async () => {
    // ⚠︎ È la prova che il `full_name` della prima stesura avrebbe reso rossa.
    // Senza di lei, una colonna sbagliata in `operatriceCorrente()` non si vede
    // finché non parte Playwright, nove task più avanti.
    const o = await operatriceCorrente(conToken(sessioneVera.accessToken))
    expect(o.operatorId).toBe(VERA)
    expect(o.nome).toBe('Vera')
    expect(o.colore).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('operatriceCorrente solleva NonOperatrice per un account che non è operatrice', async () => {
    await expect(operatriceCorrente(conToken(sessioneOutsider.accessToken))).rejects.toThrow(NonOperatrice)
  })

  it('operatriceCorrente solleva NonOperatrice per un operatrice disattivata', async () => {
    await asOwner(async (c) => {
      await c.query('update public.operator set is_active = false where id = $1', [VERA])
    })
    await expect(operatriceCorrente(conToken(sessioneVera.accessToken))).rejects.toThrow(NonOperatrice)
  })
})
```

⚠️⚠️ **Nessun montaggio di cookie, e per una ragione che la revisione 2 aveva sbagliato.** La prima stesura di
queste prove passava da un aiuto `conSessioneDi(chi, corpo)` che avrebbe dovuto «montare i cookie di
`@supabase/ssr` attorno a una sessione vera», e ammetteva che se montarlo fosse costato troppo «si ferma il task» —
cioè si sarebbe fermata sul reperto appena pagato. **Non è montabile**: `clientServer()` chiama `cookies()` di
`next/headers`, che fuori da una richiesta lancia.

La soluzione è **cambiare la firma**, non l'imbracatura: `operatriceCorrente(client)` prende il client come
argomento, e le prove gli passano `conToken(sessione.accessToken)` — lo stesso client che le altre quattro prove di
questo file usano già. `clientServer()` la chiama chi ha una richiesta vera: il guscio, le Server Actions, la rotta.

⚠︎ **E lo stesso cambio dimezza le andate e ritorni.** Il middleware ha già un client aperto: passandogli il proprio
invece di farne aprire un secondo a `operatriceCorrente`, una pagina passa da **quattro** letture di identità a due.
Il numero va comunque **misurato** al Passo 7 e scritto nel resoconto: `getUser()` è una richiesta vera a GoTrue,
non una lettura di cookie, e D3-9 concede 10 s complessivi.

| # | Mutazione | Prova che deve arrossire | Rosse attese |
|---|---|---|---|
| 1 | `operatriceCorrente` usa `getSession()` invece di `getUser()` | ⚠︎ **forse nessuna**: `getSession()` legge il cookie e per una sessione **revocata** risponde comunque. Serve una prova che revochi e poi chiami. Se dà 0, si aggiunge una prova statica che cerca `getSession(` sotto `src/` | [da misurare] |
| 2 | `.select('id, name, color')` → `'id, full_name, color'` (la forma della prima stesura) | «operatriceCorrente restituisce nome e colore …» | 1 [da misurare] |
| 3 | `operatriceCorrente` non controlla la riga `operator` | «solleva NonOperatrice per un account che non è operatrice» e «… per un operatrice disattivata» | 2 [da misurare] |
| 4 | `chiIsiede` restituisce `'guasto'` per ogni `error` (la forma della prima stesura) | ⚠︎ **nessuna qui**: il middleware lo prova Playwright al Task 12, con la prima visita e con l'operatrice disattivata. **Dichiarato**, e le due prove e2e sono nominate nel Task 12 | 0 [da misurare] |
| 5 | `chiIsiede` non legge `operator` | idem: Task 12 | 0 [da misurare] |
| 6 | `senzaCache` legge un'intestazione della **richiesta** per decidere la CSP (la forma della prima stesura) | la prova del Task 1 che legge l'**intestazione vera** della risposta | 1 [da misurare] |
| 7 | `signOut({ scope: 'local' })` → `{ scope: 'global' }` | **prova statica** che cerca `scope: 'global'` sotto `src/` | 1 [da misurare] |
| 8 | `pubblica` torna a `PUBBLICHE.some(p => pathname.startsWith(p))` | **prova statica o e2e**: `/accessorio` non deve essere pubblica | [da misurare] |

⚠︎ **Due sonde restano a zero, e sono dichiarate**: il middleware non è provabile da Vitest, perché vive nell'Edge
Runtime e la fila delle richieste è del browser. Le chiude Playwright. Ma la differenza con la prima stesura è che
ora le altre sei hanno **una vittima vera**, e il difetto che la revisione ha trovato — `full_name` — sarebbe morto
alla sonda 2, al Task 3, invece che al Task 12.

- [ ] **Passo 9: gate e commit**

```bash
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit && npm run build
```

```bash
git add src/server/supabase.ts src/middleware.ts src/app/accesso src/app/\(salone\) \
        src/cliente/navigazione.tsx tests/app/identita.test.ts .env.local.esempio .gitignore
git rm -r --cached src/app/pagina-di-prova 2>/dev/null; true
git commit -m "$(cat <<'MESSAGGIO'
feat(3a-2): accesso, sessioni e la navigazione a quattro voci

`getUser()` e mai `getSession()`: la prima interroga GoTrue e vede una sessione
revocata, la seconda legge il cookie e si fida. Con D3-17 le sessioni si
chiudono SUBITO alla disattivazione, quindi una lettura che non vedesse la
revoca renderebbe D3-17 decorativa.

Il middleware distingue TRE casi, non due (§4.7): «zero righe CONFERMATE» butta
fuori questo telefono, un guasto di trasporto risponde 503 senza chiudere
niente, e un visitatore senza sessione va all'accesso. La prima stesura ne
distingueva due, e sbagliati: `getUser()` restituisce un `error` anche quando
non c'è cookie e quando la sessione è REVOCATA, quindi rispondeva 503 alla
prima visita di chiunque, 503 per sempre dopo l'ora di `jwt_expiry`, e 503 —
mai l'uscita forzata — all'operatrice disattivata, che è il caso per cui D3-17
esiste. E non leggeva mai `operator`, quindi «zero righe confermate» non
poteva nascere.

`operator` ha la colonna `name`, non `full_name`: quello è di `client`. La
prima stesura scriveva `full_name` in `operatriceCorrente()`, che è la funzione
che chiamano il guscio, ogni Server Action e la rotta di «Controlla» — l'app
non avrebbe autenticato nessuno. Il Passo 1 ha ora tre prove che chiamano
`operatriceCorrente()`, perché le quattro della prima stesura provavano il
DATABASE e non l'app, e con esse il difetto sarebbe sopravvissuto nove task.

D2-3: niente link «Password dimenticata». L'SMTP predefinito non consegna alle
operatrici, quindi il link sarebbe un guasto silenzioso; al suo posto una riga
che dice a chi rivolgersi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MESSAGGIO
)"
```

---

### Task 4: l'involucro che distingue per soggetto, la traduzione degli esiti, i ritentativi e `p_attesi`

⚠︎ **Questo task porta C2, C3 e C5.** È il task in cui questo piano può fare il danno peggiore, e il danno è
**silenzioso** in tutti e tre i casi. Chi esegue rilegge i tre contratti in testa al piano prima del Passo 1.

**Files:**
- Create: `src/dominio/errori.ts`
- Create: `src/dominio/esiti.ts`
- Create: `src/dominio/ritentativi.ts`
- Create: `src/dominio/attesi.ts`
- Create: `tests/dominio/errori.test.ts`
- Create: `tests/dominio/esiti.test.ts`
- Create: `tests/dominio/ritentativi.test.ts`
- Create: `tests/dominio/attesi.test.ts`
- Create: `tests/dominio/niente-date.test.ts` (prova statica di C4)

**Interfaces:**
- Consuma: niente. È **logica pura**: nessun import di `next`, di `@supabase/*` o di `node:*`. È ciò che la rende
  eseguibile da `npm run test:fuso`.
- Produce:
  ```ts
  // src/dominio/errori.ts
  export type Soggetto = 'invio' | 'controlla'
  export interface GuastoGrezzo {
    readonly sqlstate?: string | null   // il `code` che PostgREST mette in risposta
    readonly azioneMancante?: boolean   // la Server Action non esiste più: nuovo rilascio
  }
  export type Classe =
    | { readonly tipo: 'annullato'; readonly sqlstate: string; readonly proprio: boolean }
    | { readonly tipo: 'non_so' }
    | { readonly tipo: 'uscita_forzata' }
    | { readonly tipo: 'app_aggiornata' }
  export const SEI_CON_MESSAGGIO_PROPRIO: ReadonlySet<string>
  export function classifica(soggetto: Soggetto, guasto: GuastoGrezzo): Classe
  // ⚠︎ AGGIUNTA il 28/09/2026: §4.3 passi 5, 6 e 7 fissano SEI frasi e §8.1 ne
  // chiede la prova, ma `classifica` restituisce un booleano `proprio` e non un
  // testo. Senza questa funzione le sei frasi nascerebbero dentro
  // `src/server/azioni-visita.ts`, cioè fuori da `src/dominio/` e fuori da
  // `npm run test:fuso`, senza una sola prova pura.
  export function messaggioPerSqlstate(sqlstate: string, nomeVincolo?: string): string

  // src/dominio/esiti.ts
  export type Esito = 'salvata' | 'cancellata' | 'gia_cancellata' | 'esiste_gia'
                    | 'modificata_altrove' | 'cancellata_altrove' | 'non_trovata' | 'annullato'
  export interface Messaggio {
    readonly testo: string
    readonly spunta: boolean          // il ✓ di §4.4, ultimo capoverso
    readonly schedaAdottaStato: boolean
    readonly ricaricaIlGiorno: boolean
  }
  export function messaggioPerEsito(esito: Esito, accountChiuso: boolean): Messaggio
  // ⚠︎ Prende l'ESITO oppure un SQLSTATE: §4.3 passo 7 elenca tre ingressi —
  // «su `42501`, su un `salvata` che non ha eseguito alcun UPDATE, e su ogni
  // esito diverso da `salvata` e `cancellata`» — e `42501` NON è un esito. La
  // prima stesura prendeva solo `Esito`, quindi il ramo `42501` non aveva dove
  // stare e §8.1, che chiede la prova «ricontrollo dell'account su `42501`,
  // `non_trovata`, `cancellata_altrove`», restava scoperta per un terzo.
  export function serveRicontrolloAccount(
    esito: Esito | { readonly sqlstate: string },
    haFattoUpdate: boolean,
  ): boolean

  // src/dominio/ritentativi.ts
  export interface PoliticaRitentativi { readonly massimo: number
                                         readonly attesaMs: (tentativo: number, caso: number) => number }
  export const POLITICA: PoliticaRitentativi
  export async function conRitentativi<T>(
    chiamata: (tentativo: number) => Promise<T>,
    estraiSqlstate: (e: unknown) => string | null,
    dormi: (ms: number) => Promise<void>,
    caso: () => number,
  ): Promise<{ valore: T; tentativi: number }>

  // src/dominio/attesi.ts
  export interface Atteso { readonly id: string; readonly versione: string }
  export function proiettaAttesi(appuntamenti: readonly { id: string; versione: string }[]): Atteso[]
  ```

---

#### 4a — L'involucro (C2)

- [ ] **Passo 1: scrivi le prove di `errori.ts`, che falliscono**

```ts
// tests/dominio/errori.test.ts
import { describe, expect, it } from 'vitest'
import { SEI_CON_MESSAGGIO_PROPRIO, classifica } from '../../src/dominio/errori'

describe('l involucro distingue per SOGGETTO prima che per codice (§4.3 passo 8)', () => {
  // ————— soggetto «invio» —————
  it('un SQLSTATE dell invio prova l annullamento, anche se non è fra i sei', () => {
    // §4.1, censimento misurato il 25/09/2026: salva_visita solleva anche
    // 22023, 22P02 e 23502, e sono fuori dai sei.
    for (const codice of ['22023', '22P02', '23502']) {
      expect(classifica('invio', { sqlstate: codice })).toEqual({
        tipo: 'annullato', sqlstate: codice, proprio: false,
      })
    }
  })

  it('i sei codici dell invio hanno un messaggio proprio', () => {
    for (const codice of ['40P01', '57014', '23505', '23503', '23514', '42501']) {
      expect(classifica('invio', { sqlstate: codice })).toEqual({
        tipo: 'annullato', sqlstate: codice, proprio: true,
      })
    }
    expect([...SEI_CON_MESSAGGIO_PROPRIO].sort()).toEqual(
      ['23503', '23505', '23514', '40P01', '42501', '57014'],
    )
  })

  it('un guasto dell invio SENZA sqlstate non prova niente: «Non so»', () => {
    expect(classifica('invio', {})).toEqual({ tipo: 'non_so' })
    expect(classifica('invio', { sqlstate: null })).toEqual({ tipo: 'non_so' })
    expect(classifica('invio', { sqlstate: '' })).toEqual({ tipo: 'non_so' })
  })

  it('un errore di PostgREST senza sqlstate è «Non so», non un fallimento', () => {
    // Un 500 generico, un PGRST…: sono FUORI dal database, e §4.3 passo 8 li
    // manda su «Non so se è stata salvata» con «Controlla».
    expect(classifica('invio', { sqlstate: undefined })).toEqual({ tipo: 'non_so' })
  })

  it('un azione che non esiste più è un rilascio nuovo, non un guasto del database', () => {
    expect(classifica('invio', { azioneMancante: true })).toEqual({ tipo: 'app_aggiornata' })
    // e vince sul codice, perché è una diagnosi del trasporto
    expect(classifica('invio', { azioneMancante: true, sqlstate: '23505' })).toEqual({
      tipo: 'app_aggiornata',
    })
  })

  // ————— soggetto «controlla» —————
  it('55P03 di «Controlla» dà «Non so», MAI «riprova a salvare»', () => {
    // È il caso che la revisione 20 ha scritto: 55P03 non è fra i sei, quindi
    // un involucro fedele al passo 8 direbbe «Non sono riuscita a salvare,
    // riprova» — la frase che §4.4 vieta.
    expect(classifica('controlla', { sqlstate: '55P03' })).toEqual({ tipo: 'non_so' })
  })

  it('anche i codici che PER L INVIO sono un fallimento, per «Controlla» sono «Non so»', () => {
    for (const codice of ['57014', '40P01', '40001', '23505', '22P02', 'P0003']) {
      expect(classifica('controlla', { sqlstate: codice })).toEqual({ tipo: 'non_so' })
    }
  })

  it('42501 di «Controlla» è uscita forzata, senza affermazioni sulla visita', () => {
    expect(classifica('controlla', { sqlstate: '42501' })).toEqual({ tipo: 'uscita_forzata' })
  })

  it('un «Controlla» caduto per rete dà «Non so»', () => {
    expect(classifica('controlla', {})).toEqual({ tipo: 'non_so' })
  })

  it('lo stesso codice dà due risposte diverse a seconda del soggetto', () => {
    // La prova che nomina il contratto: è il SOGGETTO a decidere, non il codice.
    expect(classifica('invio', { sqlstate: '57014' }).tipo).toBe('annullato')
    expect(classifica('controlla', { sqlstate: '57014' }).tipo).toBe('non_so')
  })
})
```

⚠︎ L'ultima prova è quella che **non si può togliere**: le altre si potrebbero soddisfare per caso, questa nomina la
divergenza fra i due soggetti sullo stesso codice.

- [ ] **Passo 2: vedi le prove fallire**

Esegui: `npx vitest run tests/dominio/errori.test.ts` — atteso: tutte rosse, modulo mancante.

- [ ] **Passo 3: scrivi `src/dominio/errori.ts`**

```ts
// src/dominio/errori.ts
//
// §4.3 passo 8, revisione 20. Due cose, e nessuna delle due è un elenco.
//
// 1. IL CRITERIO È PER PROPRIETÀ, NON PER ELENCO. «Un errore che arriva con un
//    SQLSTATE del database prova l'annullamento»: in PostgreSQL un errore
//    dentro una transazione la porta in stato abortito e il COMMIT successivo
//    diventa un ROLLBACK. Non esistono commit parziali, e vale anche per un
//    errore sollevato DAL commit (un vincolo differito). I sei codici qui sotto
//    NON definiscono che cosa prova l'annullamento: sono i sei che meritano un
//    messaggio PROPRIO. Un involucro che enumerasse riaprirebbe la lacuna che
//    la revisione 16 ha chiuso — misurato: `salva_visita` solleva anche 22023,
//    22P02 e 23502, e per il vecchio criterio avrebbero dato all'operatrice
//    «Non so se è stata salvata», un'incertezza FALSA su una transazione
//    certamente annullata.
//
// 2. IL SOGGETTO VIENE PRIMA DEL CODICE. Un SQLSTATE di un INVIO prova
//    l'annullamento della scrittura; un SQLSTATE di «CONTROLLA» non prova
//    niente sull'invio, che può ancora arrivare. §4.4: la risposta è SEMPRE di
//    nuovo «Non so se è stata salvata» con «Controlla» disponibile — mai «non
//    risulta», mai «riprova a salvare». ⚠︎ 55P03 (attesa sulla chiave d'invio
//    oltre lock_timeout, che la prova (c) del Task 7 del piano 3a-1 misura) NON
//    è fra i sei: applicare il criterio del punto 1 anche a «Controlla» darebbe
//    esattamente la frase vietata.

export type Soggetto = 'invio' | 'controlla'

export interface GuastoGrezzo {
  readonly sqlstate?: string | null
  readonly azioneMancante?: boolean
}

export type Classe =
  | { readonly tipo: 'annullato'; readonly sqlstate: string; readonly proprio: boolean }
  | { readonly tipo: 'non_so' }
  | { readonly tipo: 'uscita_forzata' }
  | { readonly tipo: 'app_aggiornata' }

/** I sei con un messaggio PROPRIO (§4.3 passi 5, 6, 7). Non è la definizione di «annullato». */
export const SEI_CON_MESSAGGIO_PROPRIO: ReadonlySet<string> = new Set([
  '40P01', '57014', '23505', '23503', '23514', '42501',
])

export function classifica(soggetto: Soggetto, guasto: GuastoGrezzo): Classe {
  if (guasto.azioneMancante === true) return { tipo: 'app_aggiornata' }

  const sqlstate = guasto.sqlstate
  const presente = typeof sqlstate === 'string' && sqlstate.length > 0

  if (soggetto === 'controlla') {
    // §4.4: 42501 è l'uscita forzata, senza affermazioni sulla visita. Tutto il
    // resto — presente o assente — è «Non so». Non si guarda nei sei.
    if (presente && sqlstate === '42501') return { tipo: 'uscita_forzata' }
    return { tipo: 'non_so' }
  }

  if (!presente) return { tipo: 'non_so' }
  return { tipo: 'annullato', sqlstate, proprio: SEI_CON_MESSAGGIO_PROPRIO.has(sqlstate) }
}
```

---

#### 4b — La traduzione degli esiti

- [ ] **Passo 4: scrivi le prove di `esiti.ts`**

```ts
// tests/dominio/esiti.test.ts
import { describe, expect, it } from 'vitest'
import { messaggioPerEsito, serveRicontrolloAccount } from '../../src/dominio/esiti'

describe('ogni esito ha il suo messaggio (§4.1)', () => {
  it('salvata e cancellata portano il ✓; nessun altro lo porta', () => {
    expect(messaggioPerEsito('salvata', false)).toMatchObject({ testo: '✓ Salvata', spunta: true })
    expect(messaggioPerEsito('cancellata', false)).toMatchObject({ testo: '✓ Cancellata', spunta: true })
    for (const e of ['gia_cancellata', 'esiste_gia', 'modificata_altrove',
                     'cancellata_altrove', 'non_trovata', 'annullato'] as const) {
      expect(messaggioPerEsito(e, false).spunta).toBe(false)
    }
  })

  it('modificata_altrove fa adottare lo stato corrente alla scheda («La scheda aggiornata»)', () => {
    expect(messaggioPerEsito('modificata_altrove', false).schedaAdottaStato).toBe(true)
  })

  it('gia_cancellata dice «Era già stata cancellata» e non offre di ricreare', () => {
    expect(messaggioPerEsito('gia_cancellata', false).testo).toBe('Era già stata cancellata')
  })

  it('cancellata_altrove dice che è stata cancellata da un altra parte', () => {
    expect(messaggioPerEsito('cancellata_altrove', false).testo)
      .toBe('È stata cancellata da un’altra parte')
  })

  it('non_trovata ha DUE messaggi, e li separa il ricontrollo dell account', () => {
    expect(messaggioPerEsito('non_trovata', true).testo).toMatch(/account/i)
    expect(messaggioPerEsito('non_trovata', false).testo).toBe('Questa visita non esiste più')
  })

  it('annullato non è un messaggio per l operatrice: la risposta si scarta (§4.1)', () => {
    expect(messaggioPerEsito('annullato', false).testo).toBe('')
  })

  it('esiste_gia non ha messaggio: il server rilegge e mostra (§4.1)', () => {
    expect(messaggioPerEsito('esiste_gia', false).testo).toBe('')
  })
})

describe('quando si ricontrolla l account (§4.3 passo 7)', () => {
  it('su ogni esito diverso da salvata e cancellata', () => {
    for (const e of ['esiste_gia', 'modificata_altrove', 'cancellata_altrove',
                     'non_trovata', 'gia_cancellata', 'annullato'] as const) {
      expect(serveRicontrolloAccount(e, true)).toBe(true)
    }
  })

  it('NON su salvata e cancellata, quando la scrittura ha toccato righe', () => {
    expect(serveRicontrolloAccount('salvata', true)).toBe(false)
    expect(serveRicontrolloAccount('cancellata', true)).toBe(false)
  })

  it('SÌ su un salvata che non ha eseguito alcun UPDATE: lì la regola 11 non ha righe da contare', () => {
    // §4.3 passo 7, il caso che una lettura distratta perde: uno stato già
    // identico a quello chiesto tocca zero righe, e un account chiuso in quel
    // momento riceverebbe un `salvata` falso senza che niente sollevi.
    expect(serveRicontrolloAccount('salvata', false)).toBe(true)
  })

  it('e SÌ anche su un cancellata che non ha toccato righe: è lo stesso rischio', () => {
    // La gemella della prova di sopra. Senza di lei, `haFattoUpdate` sarebbe un
    // ingresso variato per un esito solo.
    expect(serveRicontrolloAccount('cancellata', false)).toBe(true)
  })

  it('SÌ su 42501, che non è un esito ma un errore sollevato (§4.3 passo 7, §8.1)', () => {
    // ⚠︎ È il terzo dei tre ingressi che §4.3 passo 7 elenca, e la prima stesura
    // di questo piano non aveva dove metterlo: `serveRicontrolloAccount`
    // prendeva un `Esito`, e `42501` non ne è uno. Il danno era che
    // un'operatrice disattivata a metà invio riceveva un messaggio di
    // fallimento generico e RESTAVA DENTRO L'APP — mentre per lo stesso codice
    // su «Controlla» §4.4 impone l'uscita forzata. L'asimmetria era nel piano,
    // non nella norma.
    expect(serveRicontrolloAccount({ sqlstate: '42501' }, true)).toBe(true)
  })

  it('NO sugli altri SQLSTATE: provano l annullamento e basta', () => {
    for (const c of ['23505', '23503', '23514', '57014', '22023']) {
      expect(serveRicontrolloAccount({ sqlstate: c }, true)).toBe(false)
    }
  })
})
```

- [ ] **Passo 5: vedi fallire, poi scrivi `src/dominio/esiti.ts`** secondo la tabella di §4.1 e i tre rami di
      §4.3 passo 7. Il ✓ compare **solo** per `salvata`, `cancellata`, «✓ Risulta salvata» e «✓ Risulta cancellata»
      (§4.4, ultimo capoverso): le ultime due nascono nel Task 9, non qui.

- [ ] **Passo 5b: le sei frasi dei SQLSTATE con un messaggio proprio**

Prove, una per frase, più le due che si distinguono **solo** per il nome del vincolo:

```ts
describe('i sei SQLSTATE con un messaggio proprio (§4.3 passi 5, 6, 7)', () => {
  it('40P01 esauriti e 57014 dicono di riprovare', () => {
    expect(messaggioPerSqlstate('40P01')).toBe('Non sono riuscita a salvare, riprova')
    expect(messaggioPerSqlstate('57014')).toBe('Non sono riuscita a salvare, riprova')
  })

  it('23503 ha DUE frasi, e le distingue il nome del vincolo', () => {
    // ⚠︎ È la coppia che una prova sola non separerebbe. §4.3 passo 6: sulla
    // cliente «La cliente è stata cancellata», senza offerta di ricrearla; su
    // servizio od operatrice «Il servizio o l'operatrice non esiste più», e la
    // scheda si ricarica. Due messaggi, due comportamenti.
    expect(messaggioPerSqlstate('23503', 'visit_client_id_fkey'))
      .toBe('La cliente è stata cancellata')
    expect(messaggioPerSqlstate('23503', 'appointment_service_id_fkey'))
      .toBe('Il servizio o l’operatrice non esiste più')
    expect(messaggioPerSqlstate('23503', 'appointment_operator_id_fkey'))
      .toBe('Il servizio o l’operatrice non esiste più')
  })

  it('23505 su appointment_slot_unique rimanda al controllo dei conflitti', () => {
    // §4.3 passo 6: la frase la ricostruisce il passo 3, con TUTTI i conflitti.
    expect(messaggioPerSqlstate('23505', 'appointment_slot_unique')).toBe('')
  })

  it('23505 su una chiave primaria è un invio doppio: il server rilegge, non ripete', () => {
    expect(messaggioPerSqlstate('23505', 'visit_pkey')).toBe('')
  })

  it('23514 e 42501 hanno le loro frasi', () => { … })

  it('un codice fuori dai sei dà la frase generica, e non una stringa vuota', () => {
    // §4.3 passo 8: «ogni altro SQLSTATE con "Non sono riuscita a salvare,
    // riprova", registrato per chi sviluppa». Mai «Non so se è stata salvata».
    for (const c of ['22023', '22P02', '23502', '22003']) {
      expect(messaggioPerSqlstate(c)).toBe('Non sono riuscita a salvare, riprova')
    }
  })
})
```

⚠︎ `22003` è il quarto codice raggiungibile fuori dai sei, misurato dal Task 6 del piano 3a-1 (`sposta_visita_a` con
`inizio: 40000`). La prima stesura di questo piano ne citava **tre**: la citazione era incompleta rispetto a una
misura che il piano dichiarava di aver letto. Non cambia niente nel comportamento — il criterio è per proprietà, non
per elenco — ma è il tipo di imprecisione che questo progetto paga.

---

#### 4c — I ritentativi su `40P01` (C5)

- [ ] **Passo 6: scrivi le prove di `ritentativi.ts`**

```ts
// tests/dominio/ritentativi.test.ts
import { describe, expect, it, vi } from 'vitest'
import { POLITICA, conRitentativi } from '../../src/dominio/ritentativi'

const sqlstateDi = (e: unknown) => (e as { sqlstate?: string }).sqlstate ?? null
const guasto = (sqlstate: string) => Object.assign(new Error(sqlstate), { sqlstate })

describe('RETRY-40P01 (§4.3 passo 5, §3.2)', () => {
  it('due 40P01 poi successo: tre tentativi, e il valore è quello del terzo', async () => {
    const dormito: number[] = []
    let n = 0
    const esito = await conRitentativi(
      async () => { n += 1; if (n <= 2) throw guasto('40P01'); return 'salvata' },
      sqlstateDi,
      async (ms) => { dormito.push(ms) },
      () => 0.5,
    )
    expect(esito).toEqual({ valore: 'salvata', tentativi: 3 })
    expect(dormito).toHaveLength(2)
  })

  it('quattro 40P01: solleva, e i tentativi sono 4 — uno più i tre ritentativi', async () => {
    let n = 0
    await expect(
      conRitentativi(
        async () => { n += 1; throw guasto('40P01') },
        sqlstateDi,
        async () => {},
        () => 0.5,
      ),
    ).rejects.toThrow()
    expect(n).toBe(1 + POLITICA.massimo)
    expect(POLITICA.massimo).toBe(3)
  })

  it('un codice diverso NON fa ritentare: si solleva al primo colpo', async () => {
    let n = 0
    await expect(
      conRitentativi(
        async () => { n += 1; throw guasto('23505') },
        sqlstateDi,
        async () => {},
        () => 0.5,
      ),
    ).rejects.toThrow()
    expect(n).toBe(1)
  })

  it('un guasto SENZA sqlstate non fa ritentare: potrebbe essere già arrivato', async () => {
    // §4.4: un invio senza risposta può ancora scrivere. Ritentarlo alla cieca
    // è esattamente ciò che D3-21 ha scartato.
    let n = 0
    await expect(
      conRitentativi(
        async () => { n += 1; throw new Error('rete') },
        sqlstateDi,
        async () => {},
        () => 0.5,
      ),
    ).rejects.toThrow()
    expect(n).toBe(1)
  })

  it('le attese crescono e sono casuali dentro la loro finestra', async () => {
    const conCaso = (caso: number) =>
      [0, 1, 2].map((t) => POLITICA.attesaMs(t, caso))
    const basse = conCaso(0)
    const alte = conCaso(0.999)
    expect(basse[0]).toBeLessThan(basse[1])
    expect(basse[1]).toBeLessThan(basse[2])
    for (let t = 0; t < 3; t += 1) expect(alte[t]).toBeGreaterThan(basse[t])
  })

  it('il bilancio di tempo delle attese sta largamente dentro i 10 s di D3-9', () => {
    // §4.3 passo 5: 1 s di deadlock_timeout per ogni 40P01. Le ATTESE nostre
    // sono l'unica parte che questo modulo controlla, e devono restare piccole
    // accanto a quei quattro secondi.
    const peggio = [0, 1, 2].reduce((s, t) => s + POLITICA.attesaMs(t, 0.999), 0)
    expect(peggio).toBeLessThan(1500)
  })

  it('il tentativo arriva alla chiamata, così l invio può portare lo stesso codice', async () => {
    const visti: number[] = []
    await conRitentativi(
      async (t) => { visti.push(t); if (t < 2) throw guasto('40P01'); return 'ok' },
      sqlstateDi,
      async () => {},
      () => 0.5,
    )
    expect(visti).toEqual([0, 1, 2])
  })
})
```

⚠︎ **`conRitentativi` non genera il codice d'invio e non lo tocca.** §4.3 passo 5 dice «con lo **stesso** codice
d'invio»: il modo di garantirlo è che il codice sia **argomento della chiamata**, deciso dal chiamante **prima** di
entrare qui. La prova «il tentativo arriva alla chiamata» presidia che la chiusura sia una sola, e il Task 8 ne
scrive la gemella contro il database vero.

⚠︎ **L'ultima prova non misura i 10 s di D3-9.** Misura le **nostre** attese. Il bilancio vero — 1 s di
`deadlock_timeout` per ogni `40P01`, fino a 8 s per chiamata di `statement_timeout` — si misura al **Task 8** contro
il database, con la prova deterministica di §8.2. **Dichiarato**: questa prova da sola non chiude C5.

- [ ] **Passo 7: scrivi `src/dominio/ritentativi.ts`**

```ts
// src/dominio/ritentativi.ts
//
// §4.3 passo 5. Fino a 3 ritentativi, dentro la stessa Server Action, con lo
// stesso codice d'invio, PRIMA di rispondere. Non è un «Riprova» dell'utente:
// D3-21 ha scartato la ripetizione automatica alla cieca, e questa non lo è —
// un 40P01 prova che la transazione è stata ANNULLATA per intero, quindi
// rifarla non può scrivere due volte.
//
// ⚠︎ Si ritenta SOLO su 40P01. Un guasto senza SQLSTATE potrebbe essere una
// risposta persa dopo un COMMIT riuscito: ritentarlo scriverebbe due volte, ed
// è il caso per cui «Controlla» esiste.

export interface PoliticaRitentativi {
  readonly massimo: number
  /** `caso` in [0,1): lo passa il chiamante, così la prova è deterministica. */
  readonly attesaMs: (tentativo: number, caso: number) => number
}

// [proposta] 50–150, 100–300, 200–600 ms. Piccole accanto al secondo di
// deadlock_timeout che ogni 40P01 costa comunque, e casuali perché due
// scrittori che ritentassero all'unisono rifarebbero lo stesso incrocio.
export const POLITICA: PoliticaRitentativi = {
  massimo: 3,
  attesaMs: (tentativo, caso) => {
    const base = 50 * 2 ** tentativo
    return Math.round(base + caso * base * 2)
  },
}

export async function conRitentativi<T>(
  chiamata: (tentativo: number) => Promise<T>,
  estraiSqlstate: (e: unknown) => string | null,
  dormi: (ms: number) => Promise<void>,
  caso: () => number,
  // ⚠︎ IL POSTO DOVE IL TETTO DI TEMPO POTRÀ ENTRARE, aggiunto il 28/09/2026
  // dopo la revisione. La quinta decisione (vedi in fondo al piano) non è
  // presa, e finché non lo è vale l'opzione (a) — nessun tetto —, che è ciò che
  // §4.3 passo 5 dice alla lettera: il valore predefinito è `Infinity`.
  //
  // Sta qui e non altrove perché senza questo parametro il Task 4 sarebbe il
  // PUNTO DI NON RITORNO: prendere la decisione dopo vorrebbe dire riaprire la
  // firma, e con essa le sette prove che la usano. Con il parametro, chiudere
  // la decisione costa una riga al chiamante.
  scadenzaMs: number = Infinity,
  adesso: () => number = Date.now,
): Promise<{ valore: T; tentativi: number }> {
  const inizio = adesso()
  let ultimo: unknown
  for (let tentativo = 0; tentativo <= POLITICA.massimo; tentativo += 1) {
    try {
      return { valore: await chiamata(tentativo), tentativi: tentativo + 1 }
    } catch (e) {
      ultimo = e
      if (estraiSqlstate(e) !== '40P01' || tentativo === POLITICA.massimo) throw e
      if (adesso() - inizio >= scadenzaMs) throw e
      await dormi(POLITICA.attesaMs(tentativo, caso()))
    }
  }
  throw ultimo
}
```

⚠︎ **Il `throw ultimo` in fondo è irraggiungibile per costruzione** — l'ultima iterazione o ritorna o solleva —, ed è
lì perché TypeScript pretende che il flusso sia completo. Non è un difetto e non ha una sonda: **dichiarato**, così
nessuno lo insegue.

Una prova in più, che il parametro non nasca muto:

```ts
it('con una scadenza già passata non ritenta, anche su 40P01', () => {
  // ⚠︎ Presidia il parametro PRIMA che la decisione lo usi: un parametro che
  // nessuna prova esercita è un parametro che si può cancellare per sbaglio.
  let n = 0
  return expect(
    conRitentativi(
      async () => { n += 1; throw guasto('40P01') },
      sqlstateDi, async () => {}, () => 0.5,
      0,                                    // scadenza a zero millisecondi
      () => 1000,                           // un orologio fermo, oltre la scadenza
    ),
  ).rejects.toThrow().then(() => expect(n).toBe(1))
})
```

---

#### 4d — `p_attesi` proiettato e ordinato (C3)

- [ ] **Passo 8: scrivi le prove di `attesi.ts`**

```ts
// tests/dominio/attesi.test.ts
import { describe, expect, it } from 'vitest'
import { proiettaAttesi } from '../../src/dominio/attesi'

// Gli id sono scritti in ordine DECRESCENTE apposta: è la forma che il piano
// 3a-1 ha misurato come letale il 25/09/2026 (togliere `order by a.id` dal lato
// database fa rimbalzare un salvataggio conforme).
const STATO = [
  { id: 'ffffffff-0000-4000-8000-000000000002', versione: '2026-10-03 09:00:00.123456+00',
    operatrice: 'v', servizio: 's1', inizio: 120, durata: 6 },
  { id: '00000000-0000-4000-8000-000000000001', versione: '2026-10-03 09:00:00.654321+00',
    operatrice: 'a', servizio: 's2', inizio: 132, durata: 4 },
]

describe('il contratto di p_attesi (§4.1 regola 6, misurato)', () => {
  it('proietta su DUE chiavi sole: stato_visita ne restituisce sei', () => {
    for (const a of proiettaAttesi(STATO)) {
      expect(Object.keys(a).sort()).toEqual(['id', 'versione'])
    }
  })

  it('ordina per id, perché il confronto in PostgreSQL è posizionale', () => {
    expect(proiettaAttesi(STATO).map((a) => a.id)).toEqual([
      '00000000-0000-4000-8000-000000000001',
      'ffffffff-0000-4000-8000-000000000002',
    ])
  })

  it('non tocca la versione: viaggia come TESTO, com è arrivata (§10.2)', () => {
    const v = proiettaAttesi(STATO).map((a) => a.versione)
    expect(v).toContain('2026-10-03 09:00:00.123456+00')
    expect(v).toContain('2026-10-03 09:00:00.654321+00')
    for (const x of v) expect(typeof x).toBe('string')
  })

  it('l elenco vuoto resta vuoto, e non diventa null', () => {
    expect(proiettaAttesi([])).toEqual([])
  })

  it('non modifica l elenco che riceve', () => {
    const copia = STATO.map((a) => ({ ...a }))
    proiettaAttesi(STATO)
    expect(STATO).toEqual(copia)
  })

  it('l ordine delle stringhe uuid minuscole coincide con l ordine di PostgreSQL', () => {
    // PostgreSQL ordina `uuid` per BYTE. La forma testuale è 8-4-4-4-12 di hex
    // MINUSCOLO con i trattini in posizione fissa, quindi il confronto
    // lessicografico delle stringhe dà lo stesso ordine — e i trattini, essendo
    // nelle stesse posizioni in ogni uuid, non decidono mai.
    // ⚠︎ Regge finché gli id arrivano minuscoli: PostgreSQL li rende sempre
    // così. Un id costruito a mano in maiuscolo romperebbe l'accordo, ed è il
    // motivo di questa prova.
    const ids = ['0a000000-0000-4000-8000-000000000000', '9f000000-0000-4000-8000-000000000000',
                 'a0000000-0000-4000-8000-000000000000', 'f0000000-0000-4000-8000-000000000000']
    const mescolati = [ids[3], ids[0], ids[2], ids[1]].map((id) => ({ id, versione: 'x' }))
    expect(proiettaAttesi(mescolati).map((a) => a.id)).toEqual(ids)
  })
})
```

- [ ] **Passo 9: scrivi `src/dominio/attesi.ts`**

```ts
// src/dominio/attesi.ts
//
// §4.1 regola 6, contratto MISURATO il 25/09/2026. Il confronto lato database
// è un `is distinct from` fra due array jsonb, che in PostgreSQL è
// POSIZIONALE: «insieme» lì significa «insieme confrontato in una forma
// canonica», non confronto insiemistico. Chi chiama deve quindi, ogni volta:
//
//   — PROIETTARE su {id, versione} e SOLO quelle due chiavi. `stato_visita` ne
//     restituisce sei (id, versione, operatrice, servizio, inizio, durata), e
//     passarlo così com'è dà `modificata_altrove` per sempre;
//   — ORDINARE per id. Gli stessi elementi in ordine diverso danno
//     `modificata_altrove`.
//
// Chi riparte dalla risposta di un `salvata` è già conforme: la funzione la
// restituisce in questa forma. Chi riparte da `stato` dopo un
// `modificata_altrove` — che è ciò che §4.4 gli IMPONE — deve passare di qui.

export interface Atteso {
  readonly id: string
  readonly versione: string
}

export function proiettaAttesi(
  appuntamenti: readonly { id: string; versione: string }[],
): Atteso[] {
  return appuntamenti
    .map(({ id, versione }) => ({ id, versione }))
    .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
}
```

---

#### 4e — La prova statica di C4

- [ ] **Passo 10: scrivi `tests/dominio/niente-date.test.ts`**

```ts
// tests/dominio/niente-date.test.ts
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sorgenti(radice: string): string[] {
  return readdirSync(radice).flatMap((nome) => {
    const percorso = join(radice, nome)
    if (statSync(percorso).isDirectory()) return sorgenti(percorso)
    return /\.(ts|tsx)$/.test(percorso) ? [percorso] : []
  })
}

describe('C4: le versioni viaggiano come testo', () => {
  it('nessun sorgente costruisce un Date da una versione', () => {
    const colpevoli: string[] = []
    for (const f of sorgenti('src')) {
      const testo = readFileSync(f, 'utf8')
      // Si cerca la FORMA, non il nome: `new Date(` con `version` o `updated_at`
      // sulla stessa riga. Un Date sull'orologio (`new Date()`) è legittimo.
      for (const riga of testo.split('\n')) {
        if (/new Date\s*\(\s*[^)]/.test(riga) && /versione|updated_at/i.test(riga)) {
          colpevoli.push(`${f}: ${riga.trim()}`)
        }
      }
    }
    expect(colpevoli).toEqual([])
  })

  it('la gemella positiva: la spia trova una riga colpevole quando c è', () => {
    // Senza questa, la prova di sopra resterebbe verde anche con una regex
    // che non riconosce nulla — il difetto «censimento con spia» del 3a-1.
    const riga = "const x = new Date(stato.versione)"
    expect(/new Date\s*\(\s*[^)]/.test(riga) && /versione|updated_at/i.test(riga)).toBe(true)
  })
})
```

⚠︎ La seconda prova è la **spia della spia**. Il piano 3a-1 ha misurato due volte che un censimento fatto con una
regex trova meno di quel che esiste: qui la regex non è il censimento, è il presidio, e ha bisogno di una gemella
che dimostri che sa mordere.

- [ ] **Passo 11: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire | Rosse attese |
|---|---|---|---|
| 1 | `classifica` ignora il soggetto: sempre il ramo `'invio'` | «55P03 di «Controlla» dà «Non so»», «anche i codici che PER L INVIO …», «42501 di «Controlla» …», «lo stesso codice dà due risposte …» | 4 [da misurare] |
| 2 | il ramo `'invio'` usa `SEI…has(sqlstate)` come **definizione** di annullato (fuori elenco → `non_so`) | «un SQLSTATE dell invio prova l annullamento, anche se non è fra i sei» | 1 [da misurare] |
| 3 | nel ramo `'controlla'`, `42501` → `non_so` | «42501 di «Controlla» è uscita forzata» | 1 [da misurare] |
| 4 | `presente` diventa `sqlstate !== undefined` (la stringa vuota passa) | «un guasto dell invio SENZA sqlstate …» | 1 [da misurare] |
| 5 | `azioneMancante` controllato **dopo** lo sqlstate | «un azione che non esiste più …» (secondo caso) | 1 [da misurare] |
| 6 | `SEI_CON_MESSAGGIO_PROPRIO` perde `42501` | «i sei codici dell invio hanno un messaggio proprio» | 1 [da misurare] |
| 6b | `messaggioPerSqlstate` fonde i due rami di `23503` | «23503 ha DUE frasi, e le distingue il nome del vincolo» | 1 [da misurare] |
| 6c | `messaggioPerSqlstate` restituisce `''` per un codice fuori dai sei | «un codice fuori dai sei dà la frase generica» | 1 [da misurare] |
| 7 | `serveRicontrolloAccount('salvata', false)` → `false` | «SÌ su un salvata che non ha eseguito alcun UPDATE» **e** «e SÌ anche su un cancellata …» | 2 [da misurare] |
| 7b | `serveRicontrolloAccount` ignora il ramo SQLSTATE | «SÌ su 42501, che non è un esito» | 1 [da misurare] |
| 7c | `serveRicontrolloAccount` dice `true` per **ogni** SQLSTATE | «NO sugli altri SQLSTATE» | 1 [da misurare] |
| 8 | `messaggioPerEsito('modificata_altrove').schedaAdottaStato` → `false` | «modificata_altrove fa adottare lo stato corrente» | 1 [da misurare] |
| 9 | `messaggioPerEsito('non_trovata')` dà sempre «questa visita non esiste più» | «non_trovata ha DUE messaggi» | 1 [da misurare] |
| 10 | `POLITICA.massimo` → `0` | «due 40P01 poi successo», «quattro 40P01 …», **e** «il tentativo arriva alla chiamata» | **3** [da misurare] |
| 10b | `conRitentativi` ignora `scadenzaMs` | «con una scadenza già passata non ritenta» | 1 [da misurare] |
| 11 | `conRitentativi` ritenta su **ogni** errore | «un codice diverso NON fa ritentare», «un guasto SENZA sqlstate …» | 2 [da misurare] |
| 12 | `conRitentativi` chiama `chiamata()` senza passare `tentativo` | «il tentativo arriva alla chiamata» | 1 [da misurare] |
| 13 | `attesaMs` costante: `() => 100` | «le attese crescono e sono casuali» | 1 [da misurare] |
| 14 | `proiettaAttesi` restituisce gli oggetti interi (`(a) => a`) | «proietta su DUE chiavi sole» | 1 [da misurare] |
| 15 | `proiettaAttesi` non ordina | «ordina per id», «l ordine delle stringhe uuid …» | 2 [da misurare] |
| 16 | `proiettaAttesi` ordina con `localeCompare` | ⚠︎ **forse nessuna**: su hex minuscolo `localeCompare` e `<` spesso coincidono. Se dà 0, **si dichiara** — è un mutante che l'ordine di PostgreSQL non distingue sui dati di prova, e serve un id con caratteri che le due regole ordinano diversamente | [da misurare] |
| 17 | `proiettaAttesi` muta l'array in ingresso (`appuntamenti.sort(...)`) | ⚠︎ **mutante equivalente, dichiarato**: `appuntamenti` è `readonly`, e `.map()` copia **prima** di `.sort()`, quindi ordina sempre una copia fresca. La mutazione non è applicabile senza **riscrivere** la funzione | 0, per costruzione |
| 18 | la regex della **prima** prova di `niente-date.test.ts` diventa `/mai-trovato/` | ⚠︎ **nessuna**: la gemella ne tiene una **copia** inline, quindi non se ne accorge. Vedi la correzione qui sotto | 0 [da misurare] |

⚠︎ La sonda **1** è la più importante del piano: se dà meno di 4 rosse, **il task non si chiude**. È la mutazione
che riapre la lacuna che la revisione 20 ha pagato.

⚠︎ **La sonda 18 ha scoperto un difetto nella prova che doveva presidiare**, e la correzione è nella prova, non nella
sonda. `niente-date.test.ts` va riscritto perché la gemella **chiami la stessa espressione** invece di copiarla:

```ts
// La spia, definita UNA VOLTA e usata dalle due prove: nella prima stesura la
// gemella ne teneva una copia inline, quindi mutando la spia vera restava
// verde. È esattamente il difetto «censimento con spia» che il commento
// dichiarava di voler evitare, reintrodotto dalla duplicazione.
const sospetta = (riga: string) =>
  /new Date\s*\(\s*[^)]/.test(riga) && /versione|updated_at/i.test(riga)

it('nessun sorgente costruisce un Date da una versione', () => {
  const file = sorgenti('src')
  expect(file.length).toBeGreaterThan(0)   // ⚠︎ senza questa, un cwd sbagliato rende la prova vuota e verde
  const colpevoli = file.flatMap((f) =>
    readFileSync(f, 'utf8').split('\n').filter(sospetta).map((r) => `${f}: ${r.trim()}`))
  expect(colpevoli).toEqual([])
})

it('la gemella positiva: la spia trova una riga colpevole quando c è', () => {
  expect(sospetta('const x = new Date(stato.versione)')).toBe(true)
  expect(sospetta('const ora = new Date()')).toBe(false)   // e non morde dove non deve
})
```

⚠︎ La spia resta **riga per riga**, quindi perde `new Date(\n versione\n)`, `Date.parse(versione)` e
`+new Date(v)`. **Dichiarato**: è un presidio contro la distrazione, non contro chi vuole aggirarlo.

- [ ] **Passo 12: gate e commit**

```bash
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit && npm run build
```

```bash
git add src/dominio/errori.ts src/dominio/esiti.ts src/dominio/ritentativi.ts src/dominio/attesi.ts \
        tests/dominio/errori.test.ts tests/dominio/esiti.test.ts tests/dominio/ritentativi.test.ts \
        tests/dominio/attesi.test.ts tests/dominio/niente-date.test.ts
git commit -m "$(cat <<'MESSAGGIO'
feat(3a-2): l'involucro per soggetto, gli esiti, i ritentativi e p_attesi

Tre contratti che il piano 3a-1 ha pagato con revisioni avversariali, e tutti
e tre falliscono IN SILENZIO se si sbagliano.

L'involucro distingue per SOGGETTO prima che per codice. Un SQLSTATE di un
invio prova l'annullamento — in PostgreSQL non esistono commit parziali —, un
SQLSTATE di «Controlla» non prova niente, perché l'invio può ancora arrivare.
55P03 non è fra i sei con un messaggio proprio: un involucro fedele al criterio
del passo 8 darebbe a un «Controlla» scaduto sul blocco «Non sono riuscita a
salvare, riprova», che è la frase che §4.4 vieta. E l'involucro NON ha un
elenco di codici riconosciuti: distingue sqlstate presente da assente, e dentro
il primo caso cerca i sei che hanno un messaggio proprio.

`proiettaAttesi` proietta su due chiavi e ordina per id. `stato_visita` ne
restituisce sei, e il confronto lato database è un `is distinct from` fra array
jsonb, che è POSIZIONALE: chi riparte da `stato` dopo un `modificata_altrove` —
cioè chi fa ciò che §4.4 gli impone — senza questa funzione rimbalza per
sempre.

I ritentativi su 40P01 stanno dentro la Server Action e portano lo stesso
codice d'invio, che qui è garantito dalla forma: il codice è deciso dal
chiamante PRIMA di entrare. Si ritenta solo su 40P01: un guasto senza SQLSTATE
potrebbe essere una risposta persa dopo un COMMIT riuscito, e ritentarlo
scriverebbe due volte.

⚠︎ La prova sul bilancio dei 10 s di D3-9 qui misura le NOSTRE attese, non il
tempo vero: quello si misura al Task 8 contro il database. C5 non è chiuso qui.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MESSAGGIO
)"
```

---

### Task 5: la lettura del giorno e l'agenda a colonne

**Files:**
- Create: `src/server/lettura-giorno.ts`
- Create: `src/dominio/blocchi.ts`
- Create: `src/cliente/agenda-colonne.tsx`, `src/cliente/striscia-giorni.tsx`, `src/cliente/vista.ts`
- Create: `tests/dominio/blocchi.test.ts`
- Create: `tests/dominio/niente-dati-negli-url.test.ts` (**la prova statica di §4.8**)
- Create: `tests/app/lettura-giorno.test.ts`
- Modify: `src/app/(salone)/agenda/page.tsx`

**Interfaces:**
- Consuma: `public.availability_window(date, date, uuid[])` (0012); `dataDallIndirizzo`, `validaDocumentoFinestra`
  (Task 2); `oggiAPerugia`, `confineDellOraAPerugia` (Task 2); `decodificaFinestra`, `blocco` (piano 2).
- Produce:
  ```ts
  // src/server/lettura-giorno.ts
  // Una colonna dell'agenda: attiva, oppure disattivata ma con appuntamenti
  // nel giorno mostrato (spec §9.1).
  export interface OperatriceInColonna {
    readonly id: string
    readonly nome: string
    readonly colore: string       // da `operator.color`, mai inchiodato
    readonly attiva: boolean      // false = resta perché ha appuntamenti
    readonly sonoIo: boolean      // l'etichetta «tu» di §5.1, non un colore
  }

  export interface Giorno {
    readonly data: string
    readonly operatrici: readonly OperatriceInColonna[]   // già ordinate
    readonly finestra: { readonly da: number; readonly a: number }  // il taglio verticale
    readonly appuntamenti: readonly AppuntamentoLetto[]
    readonly risolti: ReadonlyMap<string, GiornoRisolto>  // per operatrice
  }
  // ⚠︎ NESSUNA versione qui. Le versioni vengono solo da `stato_visita`
  // (vedi il Passo 3): `appointment.updated_at` ha una forma diversa da quella
  // di `app.versione()`, e un campo che somiglia a una versione senza esserlo
  // è un invito a sbagliare che costa uno spostamento che rimbalza per sempre.
  export interface AppuntamentoLetto {
    readonly id: string; readonly visitaId: string; readonly operatriceId: string
    readonly servizioId: string; readonly servizioNome: string
    readonly clienteId: string; readonly clienteNome: string
    readonly inizio: number; readonly durata: number; readonly pausa: number
  }
  export async function leggiGiorno(data: string): Promise<Giorno>
  // src/dominio/blocchi.ts
  export interface BloccoAgenda {
    readonly visitaId: string; readonly operatriceId: string
    readonly appuntamenti: readonly AppuntamentoLetto[]
    readonly inizio: number; readonly fine: number
    readonly intera: boolean          // true se il blocco è TUTTA la visita
    readonly segnoDiVisita: boolean   // il segnino di §9.1 quando la visita è spezzata
  }
  export function componiBlocchi(a: readonly AppuntamentoLetto[]): BloccoAgenda[]
  export function finestraVerticale(a: readonly AppuntamentoLetto[],
                                    fasce: readonly Fascia[],
                                    confini: { da: number; a: number }): { da: number; a: number }
  ```

**Perché la lettura sta in due chiamate e non in una.** `availability_window` porta **materiale grezzo** di
disponibilità e occupazione, e non porta né il nome della cliente né quello del servizio: sono fuori dal suo
contratto e allargarlo vorrebbe una migrazione, che questo piano non fa. La seconda chiamata è un `select` di
PostgREST su `appointment` con le risorse annidate `visit → client`, `service`, filtrato **solo** su
`appointment_date` — §4.8 vieta i **filtri** su dati delle clienti nell'indirizzo, non la lettura del nome che
l'agenda deve disegnare. **Nessun filtro su `client.…`, nessun `.or()`, nessun `.textSearch()`.**

⚠︎ **`availability_window` filtra le operatrici disattivate su disponibilità ed eccezioni ma NON sull'occupazione**
(0012, nota misurata). È esattamente ciò che serve a §9.1: la colonna di una disattivata **continua a comparire
finché ha appuntamenti nel giorno mostrato**. Non si aggiunge nessun filtro sopra.

- [ ] **Passo 1: scrivi le prove di `blocchi.ts`, che falliscono**

Le prove coprono, con dati **non degeneri** (due operatrici, tre servizi, pause diverse da zero):

| Prova | Che cosa afferma |
|---|---|
| «una visita di due servizi contigui della stessa operatrice è UN blocco» | §9.1, «contiguo» = *in sequenza con in mezzo solo la pausa del servizio precedente* (spec §8.1), **non** cella-adiacente |
| «una visita con una pausa diversa da zero resta UN blocco» | la trappola esplicita di spec §8.1 |
| «una visita di due servizi con un buco più lungo della pausa è DUE blocchi, con il segno di visita» | §9.1 |
| «una visita spartita fra due operatrici è DUE blocchi, con il segno di visita» | §9.1, l'esempio che la revisione 2 sbagliava |
| «un blocco unico porta `intera: true`; i blocchi spezzati portano `intera: false`» | serve al trascinamento: `intera` decide fra `sposta_visita_a` e `salva_visita` (§5.1) |
| «i blocchi escono in ordine d'inizio dentro la colonna» | la lista e la colonna leggono lo stesso ordine |
| «la finestra verticale contiene un appuntamento fuori dagli orari del salone» | spec §9.1: senza l'espansione un appuntamento D18 sarebbe creato e mai disegnato |
| «la finestra verticale contiene anche una fascia di disponibilità fuori dai confini» | «availability and appointments alike» |
| «senza niente nel giorno, la finestra è quella dei confini del salone» | la gemella positiva della prova di sopra |

- [ ] **Passo 2: vedi fallire, poi scrivi `src/dominio/blocchi.ts`**

La contiguità si decide così, e **solo** così:

```ts
// Due appuntamenti della STESSA visita e della STESSA operatrice sono contigui
// quando il secondo comincia esattamente dove il primo finisce, pausa compresa:
//
//     b.inizio === a.inizio + a.durata + a.pausa
//
// spec §8.1: «"Contiguous" in §9.1 means *in sequence with only turnaround
// between*, not *cell-adjacent*». Un confronto `b.inizio === a.inizio + a.durata`
// spezzerebbe in due blocchi ogni visita con una pausa, che è il caso normale.
```

- [ ] **Passo 3: scrivi `src/server/lettura-giorno.ts`**

```ts
const { data: documento } = await client.rpc('availability_window', {
  p_from: data, p_to: data, p_operator_ids: idOperatrici,
})
validaDocumentoFinestra(documento)          // Task 2, CONTORNO-CERCAPOSTI

const { data: righe } = await client
  .from('appointment')
  .select(`
    id, visit_id, operator_id, service_id, start_cell, cell_count,
    service:service_id ( name, buffer_after_cells ),
    visit:visit_id ( client:client_id ( id, full_name ) )
  `)
  .eq('appointment_date', data)             // ⚠︎ l'UNICO filtro. Mai su client.*
  .order('start_cell')
```

⚠︎ **`updated_at` NON è nella `select`, ed è una decisione, non una dimenticanza.** Vedi il capoverso qui sotto: le
versioni vengono **solo** da `stato_visita`, e una colonna che nessuno può usare come versione ma che *somiglia* a
una versione è un invito a sbagliare. `AppuntamentoLetto` non porta quindi `versione` né `versioneVisita`: chi
scrive le prende al momento del gesto.

⚠︎ **`updated_at` arriva qui come stringa e resta una stringa.** È C4: nessun `new Date(...)` su quel valore, e la
prova statica del Task 4 lo presidia. La colonna si legge grezza; la versione che le funzioni di scrittura
pretendono è quella di `app.versione()`, che `stato_visita` e i ritorni delle funzioni producono già nel formato
giusto — quindi **il percorso di scrittura non usa questa lettura per le versioni**: usa quelle che la scrittura
precedente ha restituito, oppure `stato_visita` dopo un `modificata_altrove` (Task 8).

⚠︎⚠︎ **DECISO il 28/09/2026 dopo la revisione: le versioni NON vengono mai da questa lettura.**

La prima stesura lasciava la questione aperta («potrebbero non essere la stessa stringa») e rimandava alla misura del
Passo 4. La revisione ha letto il corpo di `app.versione` (`0013_invii_e_cancellate.sql:85-92`):

```sql
select to_char(p_quando at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
```

Sempre **sei** cifre di frazione e una **`Z` letterale**. PostgREST rende invece un `timestamptz` con la
serializzazione JSON di PostgreSQL: offset `+00:00`, frazione con gli zeri finali tagliati e **assente** quando è
zero. **Non sono la stessa stringa**, e non per un dettaglio: per tre differenze indipendenti.

**Il danno che questo evitava**, e che nella prima stesura era raggiungibile: il **primo trascinamento di una visita
in una sessione** non ha una scrittura precedente da cui prendere le versioni, né un `modificata_altrove` da cui
ripartire. Se le prendesse da qui, `sposta_visita_a` risponderebbe `modificata_altrove` per il confronto posizionale
su versioni di forma diversa, §4.4 imporrebbe alla scheda di adottare lo stato corrente, il blocco tornerebbe dov'era
— **e l'operatrice non riuscirebbe a spostare niente, mai**.

**Quindi, e vale per i Task 7, 8, 9 e 10:**

- `AppuntamentoLetto.versione` e `AppuntamentoLetto.versioneVisita` si popolano **da `stato_visita`**, non da
  `appointment.updated_at`. La lettura del giorno chiama `stato_visita` per le visite che servono, oppure l'agenda
  **non porta versioni affatto** e chi scrive le prende al momento del gesto;
- `updated_at` resta nella `select` **solo** se serve a ordinare o a mostrare, mai come versione. Se non serve a
  nessuno dei due, **si toglie dalla `select`**, che è la scelta che il Task 5 fa;
- il **primo trascinamento** chiama `stato_visita(p_visita)` al rilascio, prima di `sposta_visita_a`.

La prova del Passo 4 **resta**, e cambia di segno: non misura più una speranza, **pianta una differenza**.

- [ ] **Passo 4: la prova che misura l'uguaglianza delle due versioni**

```ts
// tests/app/lettura-giorno.test.ts
it('la versione di PostgREST NON è quella di app.versione: le due strade non si mescolano', async () => {
  const sessione = await sessioneDi(VERA_AUTH)
  const daRest = (await conToken(sessione.accessToken)
    .from('appointment').select('updated_at').eq('id', A1).single()).data!.updated_at
  const daFunzione = (await conToken(sessione.accessToken)
    .rpc('stato_visita', { p_visita: V1 })).data!.appuntamenti[0].versione

  // ⚠︎ Questa prova PIANTA una differenza, non verifica una speranza.
  // `app.versione` è `to_char(… 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`: sei cifre di
  // frazione e una Z letterale. PostgREST rende `+00:00`, con gli zeri finali
  // tagliati e la frazione assente quando è zero.
  expect(daRest).not.toBe(daFunzione)
  expect(daFunzione).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)

  // ⚠︎ Se un giorno diventassero UGUALI, la prova diventa rossa ed è un fatto
  // nuovo, non un fastidio: vorrebbe dire che `app.versione` o PostgREST hanno
  // cambiato forma, e la regola «le versioni vengono solo da stato_visita» va
  // rivista invece che assunta. Non si aggiusta in silenzio.
})
```

- [ ] **Passo 4b: la prova statica di §4.8, scritta come ELENCO DI PERMESSI**

**Files:** Create `tests/dominio/niente-dati-negli-url.test.ts`.

⚠︎ **Perché per permessi e non per divieti.** §4.8 la descrive per **enumerazione**: «una prova statica cerca filtri
su `from('client')`, filtri concatenati dopo `.rpc(...)`, `rpc(..., { get: true })`, `head`, filtri su risorse
annidate, `.or()`, `.textSearch()`». Un elenco di divieti **si apre da sé su ogni colonna che qualcuno aggiunge
dopo**, e non è un'ipotesi: la revisione 1 della spec 3b ha provato a enumerare le colonne vietate — `full_name`,
`phone`, `birth_month`, `birth_day` — e un revisore ha trovato che l'elenco **ometteva `preferred_operator_id`**,
che spec §6.2 dichiara testualmente *«It is personal data»*, e **`no_messages`**, che registra un'obiezione
dell'interessata. Il 3b aggiungerà `client.updated_at`, il piano 4 altre colonne ancora. Misurato il 28/09/2026;
richiesta dalla chat della spec 3b, revisione 2 (`69f5dd5`).

⚠︎ **Che cosa NON è un dato personale, e va lasciato passare.** `client.id` è `gen_random_uuid()`
(`0003_client.sql:15` [misurato]): è uno **pseudonimo casuale**, ed è la stessa lettura che §4.9 fa già quando
chiama gli id in `localStorage` «pseudonimi e non anonimi». Senza questa distinzione la prova colpirebbe la
schermata Clienti del 3b, che legge una cliente con `from('client').eq('id', …)`. Passano anche
**`.order('full_name')`**, che porta il **nome di una colonna** e non di una persona, e **`.range()`**, che porta
**posizioni**.

```ts
// tests/dominio/niente-dati-negli-url.test.ts
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sorgenti(radice: string): string[] { /* come in niente-date.test.ts */ }

// I metodi di PostgREST che mettono un VALORE nella querystring. `select`,
// `order`, `range`, `limit`, `single` e `maybeSingle` non ci sono: portano nomi
// di colonna o posizioni.
const FILTRI = ['eq','neq','gt','gte','lt','lte','like','ilike','is','in','contains',
                'containedBy','overlaps','match','filter','not']

// ⚠︎ L'ELENCO DEI PERMESSI, ed è l'unica riga che si cambia quando il permesso
// cambia. Non c'è nessun elenco di colonne vietate, da nessuna parte.
const COLONNE_AMMESSE_SU_CLIENT = new Set(['id'])

describe('§4.8: nessun dato personale in un URL', () => {
  it('trova almeno un sorgente: altrimenti la prova è vuota e verde', () => {
    expect(sorgenti('src').length).toBeGreaterThan(0)
  })

  it('su from(\'client\') è ammesso SOLO il filtro su id', () => {
    const colpevoli: string[] = []
    for (const f of sorgenti('src')) {
      const testo = readFileSync(f, 'utf8')
      // Dal `from('client')` fino alla fine dell'istruzione: si raccolgono le
      // coppie `.metodo('colonna'` e si controlla la colonna.
      for (const m of testo.matchAll(/\.from\(\s*['"]client['"]\s*\)([\s\S]*?)(?=\n\s*\n|$)/g)) {
        for (const c of m[1].matchAll(/\.(\w+)\(\s*['"]([\w.]+)['"]/g)) {
          const [, metodo, colonna] = c
          if (FILTRI.includes(metodo) && !COLONNE_AMMESSE_SU_CLIENT.has(colonna)) {
            colpevoli.push(`${f}: .${metodo}('${colonna}') su from('client')`)
          }
        }
      }
    }
    expect(colpevoli).toEqual([])
  })

  it('nessun filtro su una colonna di client dentro una risorsa annidata', () => {
    // §4.8 lo nomina: `client.full_name` in una lettura di `visit`. Stessa
    // regola, stesso elenco di permessi: dopo `client.` può stare solo `id`.
    const colpevoli: string[] = []
    for (const f of sorgenti('src')) {
      for (const c of readFileSync(f, 'utf8').matchAll(/\.(\w+)\(\s*['"]([\w.]*client\.[\w.]+)['"]/g)) {
        const [, metodo, percorso] = c
        const colonna = percorso.split('.').pop()!
        if (FILTRI.includes(metodo) && !COLONNE_AMMESSE_SU_CLIENT.has(colonna)) {
          colpevoli.push(`${f}: .${metodo}('${percorso}')`)
        }
      }
    }
    expect(colpevoli).toEqual([])
  })

  it('niente .or(), .textSearch(), rpc in GET, head, né filtri dopo .rpc()', () => {
    const colpevoli: string[] = []
    for (const f of sorgenti('src')) {
      const testo = readFileSync(f, 'utf8')
      for (const forma of [/\.or\(/, /\.textSearch\(/, /get:\s*true/, /head:\s*true/]) {
        if (forma.test(testo)) colpevoli.push(`${f}: ${forma.source}`)
      }
      // Un filtro concatenato dopo `.rpc(...)` finisce nella querystring.
      for (const c of testo.matchAll(/\.rpc\([^)]*\)\s*\.(\w+)\(/g)) {
        if (FILTRI.includes(c[1])) colpevoli.push(`${f}: .${c[1]}() dopo .rpc()`)
      }
    }
    expect(colpevoli).toEqual([])
  })

  it('nessun dato di una cliente finisce nell indirizzo della pagina', () => {
    // ⚠︎ Nell'idioma dell'App Router una casella di ricerca scrive
    // nell'indirizzo PER DIFETTO, e quello è un nome nei log della piattaforma
    // e nella cronologia del telefono. Richiesta dalla chat della spec 3b, che
    // tiene il testo cercato nello stato del componente e passa SOLO id.
    const colpevoli: string[] = []
    const PERSONALI = /full_name|phone|birth_month|birth_day|preferred_operator|no_messages|cliente(Nome|Telefono)/
    for (const f of sorgenti('src')) {
      for (const riga of readFileSync(f, 'utf8').split('\n')) {
        if (/searchParams\.set|router\.(push|replace)|URLSearchParams/.test(riga) && PERSONALI.test(riga)) {
          colpevoli.push(`${f}: ${riga.trim()}`)
        }
      }
    }
    expect(colpevoli).toEqual([])
  })

  it('la gemella positiva: la spia riconosce le forme colpevoli e lascia passare quelle ammesse', () => {
    // Senza questa, tutte le prove di sopra restano verdi anche con una regex
    // che non riconosce niente. È la lezione «censimento con spia».
    const vietata = ".from('client').eq('full_name', nome)"
    const ammessa = ".from('client').eq('id', clienteId).order('full_name').range(0, 19)"
    const filtriDi = (s: string) =>
      [...s.matchAll(/\.(\w+)\(\s*['"]([\w.]+)['"]/g)]
        .filter((c) => FILTRI.includes(c[1]) && !COLONNE_AMMESSE_SU_CLIENT.has(c[2]))
    expect(filtriDi(vietata)).toHaveLength(1)
    expect(filtriDi(ammessa)).toHaveLength(0)   // ⚠︎ order e range NON sono filtri
  })
})
```

⚠︎ **Limite dichiarato.** È una scansione di testo, non un analizzatore sintattico: perde un filtro costruito a
runtime (`.eq(colonna, valore)` con `colonna` in una variabile) e una catena spezzata su due istruzioni. È un
presidio **contro la distrazione**, non contro chi vuole aggirarlo — e la difesa vera resta che ogni filtro su dati
delle clienti passa da una funzione in POST.

⚠︎ **Questa prova sta in `tests/dominio/`**, quindi `npm run test:fuso` la esegue: non ha bisogno del database.

- [ ] **Passo 5: scrivi l'agenda a colonne**

Le misure, tutte da §5.1 e §7:

| Cosa | Valore | Marchio |
|---|---|---|
| mezz'ora | 42 punti | [dalla spec, proposta] |
| altezza minima di un blocco | 21 punti | [dalla spec] |
| bersaglio toccabile | ≥ 44 punti | [dalla spec] |
| colonne prima che si scorra in orizzontale | più di **tre attive** | [dalla spec] |
| linea dell'ora | inchiostro con alone chiaro, a `confineDellOraAPerugia()` | [dalla spec] |

Regole che si scrivono una volta e non si ridecidono:

- **Una colonna per operatrice attiva O con appuntamenti nel giorno mostrato.** Con tre attive e una disattivata con
  appuntamenti le colonne sono **quattro**, e vale la stessa regola dello scorrimento orizzontale.
- **La colonna dell'account si etichetta «tu», non con un colore** (§5.1). Il colore resta quello dell'operatrice.
- Il **fuori orario** ha righe diagonali, è **toccabile** (spec §8.4), e porta il segno sul blocco **oggi e nei
  giorni futuri**; nei giorni di chiusura la fascia porta il `reason`.
- Il **tocco su uno spazio libero** apre la scheda al **più tardi fra** il quarto d'ora inferiore e la fine
  dell'appuntamento precedente nella colonna.
- Il giorno si cambia **scorrendo di lato**; con più di tre colonne attive lo scorrimento **cede alla striscia dei
  giorni**.
- Il testo del blocco: **ora d'inizio, nome, servizio**; nei blocchi bassi **solo il nome** (D3-4).
- Il colore del testo e del bordo si calcolano dal **contrasto** del colore dell'operatrice, **non dal nome**
  (§6.2). `src/cliente/vista.ts` porta la funzione che li calcola, con la prova sui tre colori di D3-6 e i loro
  rapporti misurati (Vera 5,19; Annalisa 1,13 con bordo in inchiostro; Alessandra 7,23).

⚠︎ **I colori di D3-6 non sono ancora nel database**: `0001_access_control.sql:55-56` porta Annalisa `#7B3F61` e
Alessandra `#2F6F6B`, e i colori nuovi li consegna il **Task 10 del piano 3a-1** (migrazione `0021`). L'agenda
**legge `operator.color`** e non inchioda nessun colore: la prova sui contrasti si scrive sui **valori di D3-6
passati come argomento**, non su quelli letti. Vedi «Dipendenze non ancora consegnate».

**D2-1:** la scelta colonne/lista e l'operatrice della settimana stanno in `localStorage`, sotto due chiavi
`avstyle.vista` e `avstyle.operatriceSettimana`. Non sono dati personali e non contengono `id` di clienti.

- [ ] **Passo 6: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire | Rosse attese |
|---|---|---|---|
| 1 | contiguità senza la pausa (`b.inizio === a.inizio + a.durata`) | «una visita con una pausa diversa da zero resta UN blocco» | 1 [da misurare] |
| 2 | contiguità senza il controllo sull'operatrice | «una visita spartita fra due operatrici è DUE blocchi» | 1 [da misurare] |
| 3 | `segnoDiVisita` sempre `false` | le due prove sulle visite spezzate | 2 [da misurare] |
| 4 | `intera` sempre `true` | «un blocco unico porta intera: true; …» | 1 [da misurare] |
| 5 | `finestraVerticale` restituisce solo i confini del salone | «contiene un appuntamento fuori dagli orari», «contiene anche una fascia …» | 2 [da misurare] |
| 6 | le colonne si filtrano su `is_active` | ⚠︎ **prova da scrivere in `tests/app/`**: «la colonna di una disattivata con appuntamenti resta» | [da misurare] |
| 7 | il filtro della lettura diventa `.eq('visit.client.full_name', …)` | «nessun filtro su una colonna di client dentro una risorsa annidata» | 1 [da misurare] |
| 7b | in una lettura si aggiunge `.from('client').eq('phone', …)` | «su `from('client')` è ammesso SOLO il filtro su id» | 1 [da misurare] |
| 7c | `COLONNE_AMMESSE_SU_CLIENT` diventa `new Set(['id', 'full_name'])` | le due prove di sopra, **e** la gemella positiva | 3 [da misurare] |
| 7d | la gemella positiva perde il caso `ammessa` | ⚠︎ **nessuna**, ed è il punto: senza quel caso l'elenco dei permessi si può stringere fino a vietare tutto e nessuna prova se ne accorge. **Dichiarata**: serve a tenere la gemella onesta nei due versi |
| 7e | si scrive `router.push(\`/clienti?nome=${clienteNome}\`)` in un componente | «nessun dato di una cliente finisce nell indirizzo della pagina» | 1 [da misurare] |
| 8 | `validaDocumentoFinestra` non viene chiamata | ⚠︎ **forse nessuna**: la validazione morde solo su dati storti, che il database non produce. Se dà 0, **si dichiara**: il presidio è al Task 2, e qui è il collegamento a essere muto | [da misurare] |

⚠︎ La sonda **8** è il caso «una guardia ha due assi: la logica e il collegamento». Se dà zero rosse, si aggiunge una
prova che chiami `leggiGiorno` con un documento storto iniettato, o si dichiara il presidio muto — **non si lascia
credere che sia coperto**.

- [ ] **Passo 7: gate e commit**

```bash
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit && npm run build
```

Messaggio di commit: `feat(3a-2): la lettura del giorno e l'agenda a colonne`, con nel corpo — per esteso — la
ragione delle due chiamate invece di una, la nota su `availability_window` che non filtra l'occupazione, e **l'esito
della prova del Passo 4** sull'uguaglianza delle due versioni, che è un reperto in ogni caso: verde o rossa.

---

### Task 6: l'agenda a lista e la settimana di un'operatrice

**Files:**
- Create: `src/cliente/agenda-lista.tsx`, `src/cliente/settimana.tsx`
- Create: `src/server/lettura-settimana.ts`
- Create: `tests/dominio/settimana.test.ts`
- Modify: `src/app/(salone)/agenda/page.tsx`, `src/cliente/vista.ts`

**Interfaces:**
- Consuma: `leggiGiorno` e `componiBlocchi` (Task 5), `sommaGiorni` e `giornoSettimana` (piano 2), `dataReale`
  (Task 2).
- Produce:
  ```ts
  export interface GiornoDiSettimana {
    readonly data: string                      // 'YYYY-MM-DD'
    readonly inizi: readonly number[]          // le sole ore d'inizio, in celle, crescenti
  }
  export interface Settimana {
    readonly operatriceId: string
    readonly lunedi: string
    readonly giorni: readonly GiornoDiSettimana[]   // sempre SETTE, anche i vuoti
  }
  export async function leggiSettimana(operatriceId: string, lunedi: string): Promise<Settimana>
  ```

**Lista (spec §9.2, §5.2).** Tutti gli appuntamenti del giorno in ordine d'ora: pallino dell'operatrice **con bordo
in inchiostro**, ora, nome, servizio. L'interruttore sta nell'intestazione dell'agenda, ed è ricordato per
dispositivo (**D2-1**).

**Settimana (spec §9.3, §5.3).** Sette colonne di circa **48 punti** [dalla spec, proposta] con la **sola ora
d'inizio**; toccando un giorno si apre quel giorno. La rotta è il **selettore dell'operatrice** nell'intestazione —
non una testata di colonna, che nella vista a lista non esiste.

Prove pure in `tests/dominio/settimana.test.ts`:

| Prova | Che cosa afferma |
|---|---|
| «il lunedì della settimana di un mercoledì è due giorni prima» | §5.2, 0 = lunedì |
| «la settimana di una domenica comincia il lunedì precedente, non il giorno dopo» | l'errore classico di `getDay()` |
| «la settimana che contiene il cambio d'ora ha sette giorni e sette date distinte» | 25 ottobre 2026 e 28 marzo 2027 |
| «un giorno senza appuntamenti resta nella settimana, vuoto» | la gemella che distingue «vuoto» da «assente» |

⚠︎ Queste quattro prove stanno in `tests/dominio/`, quindi **`npm run test:fuso` le esegue** su fuso americano: è
lì che un `getDay()` al posto di `getUTCDay()` si vede.

**Sonde:** il lunedì calcolato con `getDay()`; la settimana di sei giorni; il pallino senza bordo (→ **nessuna
prova**: si dichiara, il contrasto di Annalisa a 1,13 lo porta il bordo e la verifica è visiva, §8.4); `sommaGiorni`
sostituito da un'aritmetica sui millisecondi (→ deve arrossire la prova sul cambio d'ora).

**Commit:** `feat(3a-2): l'agenda a lista e la settimana di un'operatrice`.

---

### Task 7: la scheda visita, in lettura e in compilazione

⚠︎ **Questo task non scrive nel database.** Costruisce la scheda, la riempie, calcola le durate e gli avvisi, e si
ferma davanti al pulsante «Salva», che è del Task 8. Separarli è voluto: la scheda ha molte regole di dominio, e
mescolarle al percorso di scrittura renderebbe impossibile capire quale delle due metà ha rotto una prova.

**Files:**
- Create: `src/dominio/stato-visita.ts` (**il tipo che i Task 8, 9 e 10 consumano**)
- Create: `src/dominio/scheda.ts`, `src/dominio/durate.ts`, `src/dominio/avvisi.ts`, `src/dominio/conflitti.ts`
- Create: `src/cliente/scheda-visita.tsx`, `src/cliente/cerca-cliente.tsx`
- Create: `src/server/lettura-scheda.ts`
- Create: `tests/dominio/scheda.test.ts`, `tests/dominio/durate.test.ts`, `tests/dominio/avvisi.test.ts`,
  `tests/dominio/conflitti.test.ts`

**Interfaces:**
- Consuma: `telefonoE164`, `dataReale` (Task 2); `proiettaAttesi` (Task 4); `leggiGiorno` (Task 5);
  `public.stato_visita(uuid)` (0016); `public.cerca_clienti` e `public.doppioni_cliente` — **che non esistono
  ancora**, vedi «Dipendenze non ancora consegnate».
- Produce:
  ```ts
  // src/dominio/stato-visita.ts — la forma che `public.stato_visita(uuid)` restituisce.
  //
  // ⚠︎ TRASCRITTA DA `0016_salva_visita.sql:46-58`, non inventata. Due trappole,
  // tutte e due misurate sul corpo della funzione il 28/09/2026:
  //
  //   1. `visita` è la VERSIONE della visita (`app.versione(v.updated_at)`), NON
  //      il suo identificativo. Per questo `apriSchedaSuVisita` prende
  //      `visitaId` come argomento a parte. Chi legge `visita` come un id
  //      scrive `versioneVisita: null` e OGNI salvataggio dopo un
  //      `modificata_altrove` rimbalza per sempre.
  //   2. `cliente` è un uuid NUDO, mentre `Scheda.cliente` è un OGGETTO. È il
  //      confronto che `ugualeAllaScheda` deve fare con attenzione, ed è la
  //      metà vera del rischio che questo piano aveva dichiarato sul tipo di
  //      `inizio`/`durata` — che invece NON esiste: `start_cell` e `cell_count`
  //      sono `smallint` (`0004:17-18`) e `jsonb_build_object` li rende NUMERI.
  export interface AppuntamentoNelloStato {
    readonly id: string          // uuid
    readonly versione: string    // app.versione(a.updated_at) — TESTO, mai un Date (C4)
    readonly operatrice: string  // uuid
    readonly servizio: string    // uuid
    readonly inizio: number      // start_cell, 0..287
    readonly durata: number      // cell_count, ≥ 1
  }
  export interface StatoVisita {
    readonly visita: string      // ⚠︎ la VERSIONE della visita, non l'id
    readonly data: string        // 'YYYY-MM-DD'
    readonly cliente: string     // ⚠︎ uuid NUDO
    readonly appuntamenti: readonly AppuntamentoNelloStato[]  // già ordinati per id dal database
  }

  // src/dominio/scheda.ts
  //
  // ⚠︎⚠︎ I TIPI CHE LA PRIMA E LA SECONDA STESURA USAVANO SENZA DEFINIRLI.
  // Il secondo giro di revisione ne ha contati OTTO in tutto il piano, tutti
  // con zero definizioni: `ServizioInScheda`, `ClienteScelta`, `ClienteNuova`,
  // `SchedaSerializzata`, `MessaggioSpostamento`, `MessaggioAnnulla`,
  // `OperatriceInColonna`, `Settimana`. `StatoVisita` era il nono, e la
  // revisione 2 lo aveva chiuso da solo — uno per uno è il modo in cui ci si
  // arriva la seconda volta. Qui si chiude la famiglia.
  export interface ClienteScelta {
    readonly tipo: 'esistente'
    readonly id: string            // uuid, l'unica cosa che viaggia
  }
  export interface ClienteNuova {
    readonly tipo: 'nuova'
    readonly id: string            // crypto.randomUUID() all'apertura (§4.4)
    readonly nome: string
    readonly telefono: string | null   // già normalizzato in E.164
    readonly meseDiNascita: number | null
    readonly giornoDiNascita: number | null
  }
  export interface ServizioInScheda {
    readonly id: string            // uuid dell'appuntamento
    readonly nuovo: boolean        // true se l'id non esiste ancora nel database
    // ⚠︎ Mai `null`. Su un appuntamento di un'operatrice disattivata questo
    // campo CONSERVA il suo id anche se l'elenco non la mostra (D2-2): un
    // `null` qui diventa un `23502` che nessuna riprova può risolvere.
    readonly operatriceId: string
    readonly servizioId: string
    readonly inizio: number        // start_cell, 0..287
    readonly durata: number        // cell_count, ≥ 1
    readonly durataAMano: boolean  // true = non si ricalcola più (§5.4 punto 3)
  }

  export interface Scheda {
    readonly visitaId: string                  // crypto.randomUUID() all'apertura
    readonly modo: 'creazione' | 'modifica'
    readonly cliente: ClienteScelta | ClienteNuova | null
    readonly clienteEsisteAncora: boolean      // serve alla riga 4 di «Controlla» (Task 9)
    readonly data: string
    readonly servizi: readonly ServizioInScheda[]
    readonly versioneVisita: string | null     // null in creazione; viene da stato.visita
    readonly attesi: readonly Atteso[]         // già proiettati e ordinati
    readonly avvisiConfermati: ReadonlySet<string>
  }
  export function apriSchedaVuota(data: string, operatriceId: string, inizio: number): Scheda
  export function apriSchedaSuVisita(stato: StatoVisita, visitaId: string): Scheda
  export function adottaStato(scheda: Scheda, stato: StatoVisita): Scheda
  export function ugualeAllaScheda(scheda: Scheda, stato: StatoVisita | null): boolean

  // La forma che attraversa il confine client → Server Action. È `Scheda` senza
  // ciò che non si serializza: `avvisiConfermati` diventa un array.
  export interface SchedaSerializzata extends Omit<Scheda, 'avvisiConfermati'> {
    readonly avvisiConfermati: readonly string[]
  }
  ```

⚠︎⚠︎ **`StatoVisita` era il buco più grosso della prima stesura.** Compariva nelle firme dei Task 7, 8, 9 e 10 e
**non era definito in nessuna delle 3377 righe**; l'autocontrollo affermava «è definita al Task 7», e il Task 7 la
**usava**. Chi avesse eseguito si sarebbe trovato a inventarne la forma proprio sul tipo che regge la distinzione
riga 2 / riga 3 — cioè su **C1**. Reperto bloccante della revisione del 28/09/2026, chiuso trascrivendola dal corpo
di `stato_visita`.

⚠︎ **`clienteEsisteAncora` è un campo di `Scheda`, non un argomento in più.** Nella prima stesura le prove del Task 9
lo passavano come proprietà in eccesso di un letterale tipato `Scheda` — un errore `TS2353` sotto `strict`. Sta qui
perché è uno stato della scheda, e `ugualeAllaScheda` **non lo guarda**: la riga 4 di «Controlla» decide con lui se
offrire «Crea di nuovo», e l'uguaglianza fra scheda e stato non c'entra.

**Le tre cose che questo task non può sbagliare.**

1. **Gli `id` si generano all'apertura della scheda**, tutti con `crypto.randomUUID()` **senza ripieghi** (§4.4):
   quello della visita, quello di ogni appuntamento, quello della cliente nuova. Un ripiego — `Math.random`, un
   contatore — produrrebbe collisioni e `esiste_gia` su una creazione.
2. **`adottaStato` passa da `proiettaAttesi`** (C3). È la funzione che §4.4 impone dopo ogni `modificata_altrove`,
   e senza la proiezione la scheda rimbalza per sempre.
3. **`ugualeAllaScheda` è la definizione di §4.4**, e non una approssimazione: *stessa data, stessa cliente, stesso
   insieme di appuntamenti con, per ciascuno, **stessa operatrice, servizio, inizio e durata***. È ciò che distingue
   la riga 2 dalla riga 3 di «Controlla» — la distinzione che `controlla_invio` **non fa** e lascia all'app.

**D2-2, con la conseguenza scritta.** L'elenco delle operatrici della scheda contiene **solo le attive**. Se
l'appuntamento aperto appartiene a un'operatrice disattivata, la scheda:

- **conserva l'`operatriceId` originale nel modello** — vedi il riquadro qui sotto, è la parte che conta — e mostra
  la riga del servizio con il nome dell'operatrice e la dicitura **«non più attiva»**, senza **nessuna** selezione
  nell'elenco;
- tiene **«Salva» spento** con una riga ambra: *«Scegli un'operatrice attiva per questo servizio.»* [proposta];
- lascia **«Elimina visita»** e **«Togli»** accesi;
- non impedisce il **trascinamento** dall'agenda, che passa da `sposta_visita_a` e non cambia l'operatrice.

Questa è la conseguenza che l'utente ha accettato il 28/09/2026 scegliendo «non compare mai»: per cambiare
l'**orario** dalla scheda bisogna prima riassegnare.

⚠️⚠️ **«Togli» NON è come «Elimina visita», e la prima stesura di questo riquadro diceva il contrario.** Scriveva
che «Togli» resta acceso «perché non tocca l'operatrice». **È falso**, e §4.4 lo dice testualmente: *«"Togli" su un
servizio che non è l'ultimo passa da `save_visit`»* — con l'elenco **completo** degli appuntamenti voluti (§4.1
regola 7), `operatrice` compresa, **anche per gli appuntamenti che non si stanno togliendo**. Quindi:

- se il modello della scheda rappresentasse «nessuna selezione» come `operatriceId: null`, la chiamata partirebbe
  con `operatrice` assente dall'oggetto JSON;
- §4.1, censimento **misurato**: quella forma solleva **`23502`**;
- `23502` è **fuori dai sei**, quindi §4.3 passo 8 dà la frase generica *«Non sono riuscita a salvare, riprova»* —
  un invito a riprovare su un'operazione che **non riuscirà mai**.

**Raggiungibile** appena una collega lascia il salone con appuntamenti futuri in agenda, cioè esattamente lo
scenario per cui spec §9.1 fa sopravvivere la sua colonna. Reperto bloccante del secondo giro di revisione.

**La regola, in una riga:** *la selezione nell'interfaccia e il valore nel modello sono due cose diverse.* L'elenco
non mostra le disattivate; il modello conserva l'`operatriceId` che ha letto, e lo rimanda indietro tale e quale.

Due prove e una sonda, in `tests/dominio/scheda.test.ts`:

| Prova | Che cosa afferma |
|---|---|
| «una scheda aperta su un appuntamento di un'operatrice disattivata conserva il suo `operatriceId`» | il modello, non l'elenco |
| «`togli` su una visita con un servizio di un'operatrice disattivata produce un elenco completo con tutte le operatrici valorizzate» | nessun `null` nell'oggetto che parte |

| Sonda | Prova che deve arrossire | Rosse attese |
|---|---|---|
| la scheda azzera l'`operatriceId` quando l'operatrice non è nell'elenco | tutte e due | 2 [da misurare] |

- [ ] **Passo 1: scrivi le prove di `durate.ts`**

| Prova | Che cosa afferma |
|---|---|
| «la durata viene da `operator_service.duration_cells` quando c'è» | spec §8.1, D3, D28 |
| «altrimenti da `service.default_duration_cells`» | `0002_catalogue.sql:25`, `:13` |
| «al cambio di servizio la durata si ricalcola» | §5.4 punto 3 |
| «al cambio di operatrice la durata si ricalcola» | idem |
| «una durata modificata A MANO non si ricalcola più, né al cambio di servizio né a quello di operatrice» | §5.4 punto 3, la metà che si perde |
| «“+ Aggiungi servizio” accoda con la pausa del precedente» | `buffer_after_cells`, `0002:16` |
| «i servizi accodati seguono il precedente finché non sono modificati a mano» | §5.4 punto 3 |
| «spostando a mano il primo servizio, il secondo NON lo segue più» | la gemella della prova di sopra |

- [ ] **Passo 2: scrivi le prove di `avvisi.ts`**

Tre avvisi (§4.5), ciascuno con la **sua chiave**:

| Avviso | Chiave [proposta] | Fonte |
|---|---|---|
| fuori orario | `fuori-orario:<appuntamentoId>` | D18, spec §8.4 |
| cliente già prenotata lo stesso giorno | `gia-prenotata:<clienteId>:<data>` | D25, spec §8.5 |
| la stessa cliente in due servizi **sovrapposti della stessa visita** | `sovrapposta:<idA>:<idB>` | §4.5 |

| Prova | Che cosa afferma |
|---|---|
| «un avviso con chiave non confermata ferma il salvataggio» | D3-19 |
| «gli avvisi confermati non fermano il salvataggio» | la gemella positiva |
| «un avviso NUOVO, con una chiave mai confermata, ferma un salvataggio già confermato una volta» | D3-19, che è il punto di tutto il meccanismo delle chiavi |
| «la chiave contiene l'appuntamento, non solo il tipo» | altrimenti confermare un fuori orario li confermerebbe tutti |
| «la stessa cliente in due servizi sovrapposti della STESSA visita dà l'avviso» | §4.5 |
| «la stessa cliente in due servizi NON sovrapposti della stessa visita non dà nessun avviso» | la gemella negativa |

- [ ] **Passo 3: scrivi le prove di `conflitti.ts`** (spec §10.1)

| Prova | Che cosa afferma |
|---|---|
| «la frase nomina l'appuntamento CHE POSSIEDE la cella, non la cella» | «Annalisa ha un appuntamento alle 14:00 con Maria Rossi», per una prenotazione alle 14:30 |
| «due appuntamenti in conflitto si nominano entrambi» | una violazione di unicità ne riporta una sola: la frase si rifà dal controllo preventivo |
| «uno spostamento dentro la propria durata non nomina sé stesso» | l'esclusione di `excludeAppointmentIds`, che copre **tutti** gli id in scrittura: nuovi, modificati **e tolti** |
| «un appuntamento tolto e rimesso allo stesso orario non dà conflitto con sé stesso» | §4.3 passo 3 |
| «la frase porta il bersaglio del pulsante “vai lì”» | spec §10.1 |

- [ ] **Passo 4: scrivi le prove di `scheda.ts`**

| Prova | Che cosa afferma |
|---|---|
| «una scheda aperta vuota ha `modo: 'creazione'` e `versioneVisita: null`» | §4.1 regola 1 |
| «gli id della scheda sono uuid distinti a ogni apertura» | §4.4 |
| «una scheda aperta su una visita porta gli attesi PROIETTATI e ORDINATI» | **C3** |
| «`adottaStato` riproietta e riordina, anche partendo da uno `stato` in ordine decrescente» | **C3**, il caso misurato |
| «`adottaStato` butta le modifiche non inviate» | §4.4, «La scheda aggiornata» |
| «`ugualeAllaScheda` guarda data, cliente, operatrice, servizio, inizio e durata» | sei prove, una per campo cambiato |
| «`ugualeAllaScheda` con `stato: null` è falso» | il ramo della visita assente |
| «`ugualeAllaScheda` non guarda le versioni» | due stati identici con versioni diverse restano uguali: le versioni dicono *quando*, non *che cosa* |
| «`ugualeAllaScheda` non guarda `clienteEsisteAncora`» | è uno stato della scheda, non della visita: due schede identiche con quel campo diverso restano uguali |
| «`ugualeAllaScheda` confronta la cliente fra un OGGETTO e un uuid nudo» | ⚠︎ `stato.cliente` è un uuid, `scheda.cliente` è `ClienteScelta \| ClienteNuova \| null`. La prova costruisce i due lati nelle loro forme vere e li dichiara uguali; una seconda li dichiara diversi cambiando il solo id |
| «`apriSchedaSuVisita` prende `versioneVisita` da `stato.visita`, che è una VERSIONE» | la prova passa uno `stato` con `visita: '2026-10-03T09:00:00.123456Z'` e asserisce che `scheda.versioneVisita` sia quella stringa — non l'id, non `null` |

⚠︎ Le sei prove su `ugualeAllaScheda` si scrivono **una per campo**, non una sola con sei campi cambiati insieme:
una prova che cambia tutto resta verde anche se il confronto guarda un campo solo. È l'errore che il piano 3a-1 ha
chiamato «prova sovradeterminata».

- [ ] **Passo 5: scrivi le quattro implementazioni, poi la scheda**

La scheda (spec §9.4, §5.4) è una **pagina intera che si apre sopra l'agenda** (L5), con:

1. **Cliente:** ricerca per nome o telefono; «Nuova cliente» con nome, telefono, compleanno e la **riga
   sull'informativa** (spec §8.2, §11.1) — senza quella riga §11.1 dichiara un obbligo che nessuna schermata
   mantiene; doppioni per **stesso telefono E.164** o **nome simile**.
2. **Data.**
3. **Servizi**, con le durate di `durate.ts` e «+ Aggiungi servizio».
4. **Riga ambra** degli avvisi, con il motivo; il pulsante diventa **«Salva comunque»** (D3-8).
5. **«Salva»**; su una visita esistente **«Elimina visita»** e **«Togli»**, ciascuno con **una** conferma (spec
   §8.7, §10.4). «Togli» sull'unico servizio **è** «Elimina visita».
6. Lo spazio per **«Controlla»**, che riempie il Task 9.

**Nessun campo di testo libero** (D26). **Nessun «+»** fluttuante (§3.2).

- [ ] **Passo 6: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire | Rosse attese |
|---|---|---|---|
| 1 | la durata a mano viene ricalcolata comunque | «una durata modificata A MANO non si ricalcola più» | 1 [da misurare] |
| 2 | l'accodamento ignora `buffer_after_cells` | «“+ Aggiungi servizio” accoda con la pausa» | 1 [da misurare] |
| 3 | la chiave dell'avviso perde l'id (`fuori-orario` nudo) | «la chiave contiene l'appuntamento, non solo il tipo» | 1 [da misurare] |
| 4 | un avviso non confermato non ferma | «un avviso con chiave non confermata ferma il salvataggio», «un avviso NUOVO …» | 2 [da misurare] |
| 5 | l'esclusione copre solo gli id **nuovi**, non i tolti | «un appuntamento tolto e rimesso …» | 1 [da misurare] |
| 6 | la frase nomina la **cella** invece dell'appuntamento che la possiede | «la frase nomina l'appuntamento CHE POSSIEDE la cella» | 1 [da misurare] |
| 7 | `adottaStato` non chiama `proiettaAttesi` | «`adottaStato` riproietta e riordina …» | 1 [da misurare] |
| 8 | `adottaStato` conserva le modifiche non inviate | «`adottaStato` butta le modifiche non inviate» | 1 [da misurare] |
| 9 | `ugualeAllaScheda` non guarda la **durata** | la prova per campo sulla durata | 1 [da misurare] |
| 10 | `ugualeAllaScheda` guarda **anche** le versioni | «`ugualeAllaScheda` non guarda le versioni» | 1 [da misurare] |
| 10b | `apriSchedaSuVisita` legge `stato.visita` come un **id** e lascia `versioneVisita: null` | «`apriSchedaSuVisita` prende `versioneVisita` da `stato.visita` …» | 1 [da misurare] |
| 10c | `ugualeAllaScheda` confronta `scheda.cliente` con `stato.cliente` **senza estrarne l'id** | «confronta la cliente fra un OGGETTO e un uuid nudo» | 1 [da misurare] |
| 10d | `ugualeAllaScheda` guarda **anche** `clienteEsisteAncora` | «non guarda `clienteEsisteAncora`» | 1 [da misurare] |
| 11 | l'elenco delle operatrici include le disattivate (contro D2-2) | **prova da scrivere sul componente** con `@testing-library` | [da misurare] |
| 12 | `crypto.randomUUID()` → un contatore | «gli id della scheda sono uuid distinti a ogni apertura» | 1 [da misurare] |

⚠︎ La sonda **10** è la meno ovvia e la più utile: un `ugualeAllaScheda` che confrontasse anche le versioni darebbe
**sempre** la riga 3 al posto della riga 2, cioè *«È diversa da come l'avevi lasciata»* per una visita identica —
e con essa «La scheda aggiornata», che butta le modifiche dell'operatrice per niente.

- [ ] **Passo 7: gate e commit** — `feat(3a-2): la scheda visita, in lettura e in compilazione`.

---

### Task 8: le Server Actions di scrittura

⚠︎ **Porta C3 e C5 al contatto con il database.** È il primo task in cui l'app scrive.

**Files:**
- Create: `src/server/involucro.ts`
- Create: `src/server/azioni-visita.ts`
- Create: `src/server/controllo-preventivo.ts`
- Create: `tests/app/scrittura.test.ts`
- Create: `tests/app/ritentativi-veri.test.ts`
- Modify: `src/cliente/scheda-visita.tsx`

**Interfaces:**
- Consuma: `public.salva_visita(uuid,uuid,uuid,jsonb,date,jsonb,text,jsonb)` (0016);
  `public.cancella_visita(uuid,uuid,text,jsonb)` (0017); `public.stato_visita(uuid)` (0016);
  `classifica`, `messaggioPerEsito`, `serveRicontrolloAccount`, `conRitentativi`, `proiettaAttesi` (Task 4);
  `operatriceCorrente` (Task 3); `telefonoE164`, `dataReale` (Task 2).
- Produce:
  ```ts
  export type Risposta =
    | { readonly tipo: 'esito'; readonly esito: Esito; readonly messaggio: Messaggio
        readonly visita?: string; readonly appuntamenti?: readonly Atteso[]
        readonly stato?: StatoVisita | null }
    | { readonly tipo: 'fallita'; readonly sqlstate: string; readonly testo: string }
    | { readonly tipo: 'non_so' }             // → «Controlla», Task 9
    | { readonly tipo: 'da_confermare'; readonly chiavi: readonly string[] }
    | { readonly tipo: 'conflitto'; readonly frase: string; readonly vaiA: string }
    | { readonly tipo: 'uscita_forzata' }
    | { readonly tipo: 'app_aggiornata' }
  export async function salva(scheda: SchedaSerializzata, codice: string): Promise<Risposta>
  export async function elimina(visitaId: string, versione: string,
                                attesi: readonly Atteso[], codice: string): Promise<Risposta>
  export async function togli(scheda: SchedaSerializzata, codice: string): Promise<Risposta>
  ```

**Gli otto passi di §4.3, nell'ordine, e nessuno saltato.**

1. **Account attivo** — `operatriceCorrente()`; se solleva → `uscita_forzata`.
2. **Validazione di dominio** — date reali, celle 0–287, durate positive, fine ≤ 288, nome non vuoto, compleanno
   reale, telefono normalizzabile in E.164 con paese predefinito **IT**. ⚠︎ È il passo che impedisce che `22023`,
   `22P02` e `23502` — i tre codici **misurati** fuori dall'elenco dei sei — nascano da ciò che l'operatrice digita.
3. **Controllo preventivo dei conflitti**, escludendo **tutti** gli id in scrittura: nuovi, modificati **e tolti**
   (spec §10.1). Avvisi ricalcolati: una chiave non confermata → `da_confermare` **senza chiamare la funzione**
   (D3-19).
4. **Scrittura** con la funzione.
5. **`40P01`** → `conRitentativi`, **con lo stesso codice d'invio**, dentro questa Server Action.
6. **`23505` per nome del vincolo:** `appointment_slot_unique` → rifà il passo 3 e dà la frase con **tutti** i
   conflitti; chiave primaria di `visit`, `appointment` o `client` → invio doppio concorrente, il server **non
   ripete**, rilegge e mostra come le righe 2 o 3 di §4.4. **`23503`** su `visit.client_id` → «La cliente è stata
   cancellata», nessuna offerta di ricrearla; su servizio od operatrice → «Il servizio o l'operatrice non esiste
   più», e la scheda si ricarica.
7. **Ricontrollo dell'account** secondo `serveRicontrolloAccount(esito, haFattoUpdate)`.
8. **Altro** → `classifica('invio', …)` (**C2**).

- [ ] **Passo 1: scrivi `src/server/involucro.ts`**

```ts
// src/server/involucro.ts
//
// §4.2: «Un involucro UNICO attorno a ogni Server Action cattura ogni errore e
// restituisce solo esito e codice». §4.9: nei log solo `code` e `id`, MAI
// `details` né `hint` — un vincolo come client_birthday_real porterebbe nel
// log la riga rifiutata, cioè nome e compleanno di una cliente.
//
// ⚠︎ Il soggetto è un ARGOMENTO, non una deduzione: è C2. `avvolgi('invio', …)`
// e `avvolgi('controlla', …)` non sono la stessa funzione con un codice
// diverso, sono due politiche opposte.

export async function avvolgi<T>(
  soggetto: Soggetto,
  id: string,
  corpo: () => Promise<T>,
): Promise<T | Classe> { … }

export function sqlstateDi(e: unknown): string | null {
  // PostgREST mette il SQLSTATE in `code`. Un 500 generico e un PGRST… NON ne
  // hanno uno, ed è la distinzione su cui §4.3 passo 8 è costruito.
  const c = (e as { code?: unknown })?.code
  return typeof c === 'string' && /^[0-9A-Z]{5}$/.test(c) ? c : null
}
```

⚠︎ `sqlstateDi` **non deve riconoscere i codici di PostgREST**, che hanno la forma `PGRST116`: sono otto caratteri e
la regex li esclude. Se un giorno PostgREST cambiasse forma, questa riga diventerebbe il difetto. **Prova
dedicata:** «`PGRST116` non è uno sqlstate», con la gemella «`23505` lo è».

- [ ] **Passo 2: scrivi le prove di scrittura contro il database vero**

`tests/app/scrittura.test.ts`, con sessioni vere e `seedFixture()`:

| Prova | Che cosa afferma |
|---|---|
| «una creazione riuscita restituisce `salvata` e le versioni nuove» | §4.1 regola 10 |
| «le versioni restituite si rimandano indietro e il secondo salvataggio riesce» | **C3**: la risposta di `salvata` è già conforme |
| «dopo un `modificata_altrove`, la scheda che adotta `stato` e riproietta salva al secondo colpo» | **C3**, il caso che §4.4 impone |
| «dopo un `modificata_altrove`, passare `stato` COM'È dà di nuovo `modificata_altrove`» | la gemella che rende la precedente capace di fallire — è la trappola misurata del 25/09 |
| «una collega che aggiunge un servizio dà `modificata_altrove`, e il suo servizio RESTA» | §8.2, famiglia B5 |
| «una creazione su un id che esiste già dà `esiste_gia` senza scrivere» | §4.1 regola 3 |
| «`cancella_visita` su una già cancellata dà `gia_cancellata`» | §4.1 |
| «un elenco vuoto non arriva mai alla funzione: lo ferma il passo 2» | il presidio dei tre codici fuori elenco |
| «un avviso non confermato dà `da_confermare` e la funzione NON viene chiamata» | D3-19; si misura che `invio` non ha la riga del codice |
| «un conflitto preventivo dà la frase con TUTTI i conflitti» | spec §10.1 |
| «un `23503` sulla cliente cancellata fra due invii dà la frase giusta e nessuna offerta» | §4.3 passo 6 |

- [ ] **Passo 3: la prova deterministica di `RETRY-40P01`** (C5, §8.2, §3.2)

```ts
// tests/app/ritentativi-veri.test.ts
//
// La forma la fissa §8.2: «la prova tiene aperta una transazione su una propria
// connessione con un deadlock_timeout PIÙ ALTO, così che ad abortire sia il
// PERCORSO DI SCRITTURA». Afferma ALMENO DUE TENTATIVI e il salvataggio.
it('il percorso di scrittura riceve almeno un 40P01, ritenta e salva', async () => {
  const spia: number[] = []                     // i tentativi visti
  const avversaria = await connect()
  await avversaria.query('begin')
  await avversaria.query("set local deadlock_timeout = '10s'")
  // … costruisce il ciclo di attesa incrociato, come le due prove di
  // concorrenza del Task 5 del piano 3a-1 …
  const risposta = await salva(scheda, codice, { spiaTentativi: (t) => spia.push(t) })
  expect(spia.length).toBeGreaterThanOrEqual(2)  // almeno un ritentativo
  expect(risposta).toMatchObject({ tipo: 'esito', esito: 'salvata' })
  // E il codice d'invio è LO STESSO su tutti i tentativi: `invio` ha UNA riga.
  const { rows } = await avversaria.query('select count(*)::int n from public.invio where codice = $1', [codice])
  expect(rows[0].n).toBe(1)
})

it('il caso tipico sta nei 10 s di D3-9', async () => {
  const inizio = Date.now()
  // … lo stesso scenario, misurato dal TOCCO alla risposta …
  expect(Date.now() - inizio).toBeLessThan(10_000)
})
```

⚠︎ **La seconda asserzione della prima prova è quella che chiude C5 davvero**: «lo stesso codice d'invio» non si
prova contando i tentativi, si prova contando le **righe di `invio`**. Se fossero due, ogni ritentativo avrebbe
aperto un invio nuovo e «Controlla» non saprebbe più quale bruciare.

⚠︎ **La seconda prova può essere fragile.** Un `deadlock_timeout` di 1 s per ogni `40P01` più le attese dà un caso
tipico di poco più di un secondo, con un margine largo; ma una macchina carica può allungarlo. **Se è intermittente,
non si allarga il limite in silenzio**: si misura il tempo vero su dieci passate e si scrive il numero nel
resoconto, e se il caso tipico non sta nei 10 s **è un reperto per la spec**, non un numero da aggiustare.

- [ ] **Passo 4: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire | Rosse attese |
|---|---|---|---|
| 1 | `salva` passa `stato.appuntamenti` **così com'è** invece di `proiettaAttesi(...)` | «dopo un `modificata_altrove`, la scheda che adotta `stato` …» | 1 [da misurare] |
| 2 | il codice d'invio si genera **dentro** `conRitentativi` | «il percorso … ritenta e salva» (il conteggio delle righe) | 1 [da misurare] |
| 3 | il passo 3 si salta quando non ci sono avvisi | «un avviso non confermato dà `da_confermare`» | 1 [da misurare] |
| 4 | `serveRicontrolloAccount` non viene chiamato | ⚠︎ **forse nessuna**: serve una prova che chiuda l'account fra il passo 1 e la risposta. Se dà 0, **si scrive quella prova** | [da misurare] |
| 5 | `sqlstateDi` accetta anche `PGRST116` | «`PGRST116` non è uno sqlstate» | 1 [da misurare] |
| 6 | l'involucro registra `details` e `hint` nel log | **prova statica** su `src/server/` che cerca `details` e `hint` | [da misurare] |
| 7 | il passo 6 non distingue il vincolo per **nome** | «un conflitto … dà la frase con TUTTI i conflitti» | 1 [da misurare] |
| 8 | il passo 2 lascia passare un elenco vuoto | «un elenco vuoto non arriva mai alla funzione» | 1 [da misurare] |
| 9 | `avvolgi` usa sempre il soggetto `'invio'` | **nessuna qui**, perché il soggetto `'controlla'` arriva al Task 9. ⚠︎ **La sonda si ripete al Task 9 (11b), dove ora ha una vittima vera.** Nella prima stesura era rimandata qui e sbagliava bersaglio là: C2 sul soggetto `'controlla'` **non era presidiato in nessun task** | 0 [da misurare] |

- [ ] **Passo 5: gate e commit** — `feat(3a-2): le Server Actions di scrittura, con i ritentativi su 40P01`, con
      nel corpo i due numeri misurati: i tentativi visti e il tempo del caso tipico.

---

### Task 9: «Controlla», la coppia `(riga, esito_invio)` e gli invii pendenti

⚠︎ **Questo task porta C1.** Il danno di sbagliarlo è **silenzioso** e toglie il lavoro di una collega. Chi esegue
rilegge C1 e §4.4 per intero prima del Passo 1.

**Files:**
- Create: `src/dominio/controlla.ts`
- Create: `src/dominio/scheda-viva.ts` (**il numero di generazione**, §4.4 e §8.1)
- Create: `src/dominio/invii-pendenti.ts`
- Create: `src/app/api/controlla/route.ts`
- Create: `src/app/api/battito/route.ts`
- Create: `src/cliente/striscia-invii.tsx`
- Create: `tests/dominio/controlla.test.ts`, `tests/dominio/invii-pendenti.test.ts`
- Create: `tests/app/controlla-fuori-fila.test.ts`
- Modify: `src/cliente/scheda-visita.tsx`, `src/app/(salone)/layout.tsx`

**Interfaces:**
- Consuma: `public.controlla_invio(uuid, uuid)` (0018), che restituisce **`{riga, esito_invio, stato}`** con
  `riga ∈ {1,2,4,5,6,7}`; `ugualeAllaScheda`, `adottaStato` (Task 7); `classifica('controlla', …)` (Task 4).
- Produce:
  ```ts
  export type EsitoInvio = 'annullato' | 'salvata' | 'cancellata' | 'gia_cancellata'
                         | 'esiste_gia' | 'modificata_altrove' | 'cancellata_altrove' | 'non_trovata'
  export interface RispostaControlla {
    readonly riga: 1 | 2 | 4 | 5 | 6 | 7
    readonly esito_invio: EsitoInvio
    readonly stato: StatoVisita | null
  }
  export type Decisione = {
    readonly testo: string
    readonly spunta: boolean
    readonly versioni: 'partenza' | 'lette'      // ⚠︎ C1: dipende dall'ESITO, non dalla riga
    readonly schedaAdottaStato: boolean
    readonly riaccende: 'salva' | 'elimina' | 'togli' | null
    readonly offreCreaDiNuovo: boolean
    readonly ricaricaIlGiorno: boolean
    readonly errore: boolean
  }
  export function decidiControlla(r: RispostaControlla, scheda: Scheda,
                                  invio: 'salva' | 'elimina' | 'togli'): Decisione
  ```

**Perché «Controlla» passa da una rotta e non da una Server Action.** §4.4: le Server Actions partono dal telefono
**una alla volta, in fila** [dalla revisione, documentazione di React]. Un «Controlla» come Server Action resterebbe
**in fila dietro l'invio bloccato** — cioè dietro esattamente ciò che deve diagnosticare. «Controlla» e il segnale
periodico di connessione passano da una **rotta del server** chiamata con `fetch`, **fuori dalla fila**.

- [ ] **Passo 1: scrivi le prove di `controlla.ts`, che falliscono**

```ts
// tests/dominio/controlla.test.ts
import { describe, expect, it } from 'vitest'
import { decidiControlla } from '../../src/dominio/controlla'

// Due aiuti locali di questo file, definiti QUI e non altrove: costruiscono una
// `Scheda` e uno `StatoVisita` completi (Task 7) partendo dai soli campi che la
// prova vuole variare. ⚠︎ Nella prima stesura erano usati e mai definiti.
function schedaDiProva(p: Partial<Scheda> & { inizio?: number } = {}): Scheda { … }
function statoDiProva(p: Partial<StatoVisita> & { inizio?: number } = {}): StatoVisita { … }

// La scheda di partenza e lo stato letto sono COSTRUITI DIVERSI apposta: se
// fossero uguali, «adotta lo stato letto» e «tieni le versioni di partenza»
// darebbero lo stesso risultato e nessuna prova distinguerebbe i due rami.
// ⚠︎ `visita` è la VERSIONE (0016:47), non l'id: vedi `stato-visita.ts`.
const SCHEDA = schedaDiProva({ inizio: 120, versioneVisita: 'V-VECCHIA' })
const LETTO  = statoDiProva({ inizio: 132, visita: 'V-NUOVA' })

describe('C1: la riga 1 è sovraccarica, e il contratto è la coppia', () => {
  it('riga 1 con `annullato`: «Salva» riparte con le versioni DI PARTENZA, mai rilette', () => {
    const d = decidiControlla({ riga: 1, esito_invio: 'annullato', stato: LETTO }, SCHEDA, 'salva')
    expect(d.testo).toBe('Non risulta salvata: l’invio non ha scritto nulla')
    expect(d.versioni).toBe('partenza')
    expect(d.schedaAdottaStato).toBe(false)
    expect(d.riaccende).toBe('salva')
  })

  it('riga 1 con `non_trovata`: la scheda ADOTTA lo stato letto e le sue versioni', () => {
    const d = decidiControlla({ riga: 1, esito_invio: 'non_trovata', stato: LETTO }, SCHEDA, 'salva')
    expect(d.testo).toBe('Non risulta salvata: l’invio non ha scritto nulla')
    expect(d.versioni).toBe('lette')
    expect(d.schedaAdottaStato).toBe(true)   // «La scheda aggiornata» vale anche qui
  })

  it('la SOLA differenza fra i due casi è l esito: la riga è la stessa', () => {
    // La prova che nomina il contratto. Un app che decidesse sul solo `riga`
    // la fallirebbe, e nel verso `annullato` toglierebbe in silenzio il lavoro
    // della collega (famiglia B5, R6-1).
    const a = decidiControlla({ riga: 1, esito_invio: 'annullato', stato: LETTO }, SCHEDA, 'salva')
    const b = decidiControlla({ riga: 1, esito_invio: 'non_trovata', stato: LETTO }, SCHEDA, 'salva')
    expect(a.testo).toBe(b.testo)
    expect(a.versioni).not.toBe(b.versioni)
  })
})

describe('le altre righe di §4.4', () => {
  it('riga 2 con lo stato UGUALE alla scheda: «✓ Risulta salvata»', () => {
    const uguale = statoDiProva({ inizio: 120, visita: 'V-NUOVA' })
    const d = decidiControlla({ riga: 2, esito_invio: 'salvata', stato: uguale }, SCHEDA, 'salva')
    expect(d.testo).toBe('✓ Risulta salvata')
    expect(d.spunta).toBe(true)
  })

  it('riga 2 con lo stato DIVERSO dalla scheda diventa la riga 3: la distingue l app', () => {
    // ⚠︎ `controlla_invio` non restituisce MAI riga 3: l'immagine è {1,2,4,5,6,7}.
    const d = decidiControlla({ riga: 2, esito_invio: 'salvata', stato: LETTO }, SCHEDA, 'salva')
    expect(d.testo).toBe('È diversa da come l’avevi lasciata: ecco com’è ora')
    expect(d.schedaAdottaStato).toBe(true)
    expect(d.versioni).toBe('lette')
    expect(d.spunta).toBe(false)
  })

  it('riga 4: cancellata dopo il salvataggio; «Crea di nuovo» SOLO se la cliente esiste ancora', () => {
    // `clienteEsisteAncora` è un campo di `Scheda` (Task 7), non una proprietà
    // in eccesso: nella prima stesura questo letterale era un TS2353.
    const conCliente = decidiControlla({ riga: 4, esito_invio: 'salvata', stato: null },
                                       schedaDiProva({ clienteEsisteAncora: true }), 'salva')
    expect(conCliente.testo).toBe('È stata cancellata dopo il salvataggio')
    expect(conCliente.offreCreaDiNuovo).toBe(true)
    const senza = decidiControlla({ riga: 4, esito_invio: 'salvata', stato: null },
                                  schedaDiProva({ clienteEsisteAncora: false }), 'salva')
    expect(senza.offreCreaDiNuovo).toBe(false)
  })

  it('riga 4 con `non_trovata`: NON dice «dopo il salvataggio», perché non c è stato nessun salvataggio', () => {
    // ⚠︎ C1 fino in fondo: la coppia, non la riga. `controlla_invio` manda su
    // riga 4 anche `non_trovata` con la visita assente e fra le cancellate
    // (0018:96-102), ed è il caso misurato che ha prodotto la revisione 19:
    // Vera disattivata mentre l'invio è in coda, la collega cancella, Vera
    // riattivata entro 24 ore. Dire «È stata cancellata dopo il salvataggio»
    // e offrire «Crea di nuovo» AFFERMA un salvataggio che non è mai avvenuto.
    const d = decidiControlla({ riga: 4, esito_invio: 'non_trovata', stato: null },
                              schedaDiProva({ clienteEsisteAncora: true }), 'salva')
    expect(d.testo).toBe('La visita è stata cancellata')
    expect(d.spunta).toBe(false)
    expect(d.offreCreaDiNuovo).toBe(false)
  })

  it('riga 5 con `non_trovata` è il caso ordinario, non un errore', () => {
    // La gemella della prova qui sotto. Con `salvata` la riga 5 «non deve
    // accadere»; con `non_trovata` è la modifica di una visita che davvero non
    // c è più, e §4.1 le dà il suo messaggio.
    const d = decidiControlla({ riga: 5, esito_invio: 'non_trovata', stato: null }, SCHEDA, 'salva')
    expect(d.testo).toBe('Questa visita non esiste più')
    expect(d.errore).toBe(false)
    expect(d.ricaricaIlGiorno).toBe(true)
  })

  it('riga 6 con `esiste_gia`: la visita si rilegge e si mostra come riga 2 o 3', () => {
    // ⚠︎ §4.4 lo scrive nella riga 6 stessa, e nella prima stesura di questo
    // piano `esiste_gia` cadeva nel ramo generico — che dà il messaggio di
    // `messaggioPerEsito('esiste_gia')`, cioè la STRINGA VUOTA. Percorso
    // raggiungibile: una creazione la cui risposta si perde, con l'invio che
    // arriva (§4.3 passo 6, l'invio doppio concorrente). L'operatrice non
    // vedeva NIENTE, la scheda teneva gli id già consumati, e ogni «Salva»
    // successivo dava `esiste_gia` PER SEMPRE.
    const uguale = statoDiProva({ inizio: 120, visita: 'V-NUOVA' })
    expect(decidiControlla({ riga: 6, esito_invio: 'esiste_gia', stato: uguale }, SCHEDA, 'salva').testo)
      .toBe('✓ Risulta salvata')
    expect(decidiControlla({ riga: 6, esito_invio: 'esiste_gia', stato: LETTO }, SCHEDA, 'salva').testo)
      .toBe('È diversa da come l’avevi lasciata: ecco com’è ora')
  })

  it('riga 6 con `esiste_gia` e la visita SPARITA prima della rilettura vale come riga 4 o 5', () => {
    // §4.4, regole comuni: «`esiste_gia` con la visita sparita prima della
    // rilettura → la rilettura si tratta come riga 4 o 5».
    const d = decidiControlla({ riga: 6, esito_invio: 'esiste_gia', stato: null }, SCHEDA, 'salva')
    expect(d.testo).not.toBe('')
    expect(d.ricaricaIlGiorno).toBe(true)
  })

  it('riga 5 è un errore, e l agenda si ricarica', () => {
    const d = decidiControlla({ riga: 5, esito_invio: 'salvata', stato: null }, SCHEDA, 'salva')
    expect(d.errore).toBe(true)
    expect(d.ricaricaIlGiorno).toBe(true)
    expect(d.spunta).toBe(false)
  })

  it('riga 6 porta il messaggio dell esito, e per `gia_cancellata` è QUELLO della risposta diretta', () => {
    expect(decidiControlla({ riga: 6, esito_invio: 'gia_cancellata', stato: null }, SCHEDA, 'elimina').testo)
      .toBe('Era già stata cancellata')
    expect(decidiControlla({ riga: 6, esito_invio: 'modificata_altrove', stato: LETTO }, SCHEDA, 'salva').testo)
      .toBe('È diversa da come l’avevi lasciata: ecco com’è ora')
  })

  it('riga 6 con `modificata_altrove` e con `cancellata_altrove` NON portano il ✓', () => {
    // I due esiti che, misurati al Task 7 del 3a-1, nessuna prova esercitava.
    for (const e of ['modificata_altrove', 'cancellata_altrove'] as const) {
      expect(decidiControlla({ riga: 6, esito_invio: e, stato: null }, SCHEDA, 'salva').spunta).toBe(false)
    }
  })

  it('riga 6 con `modificata_altrove` fa adottare lo stato: altrimenti il «Salva» dopo toglie il servizio della collega', () => {
    const d = decidiControlla({ riga: 6, esito_invio: 'modificata_altrove', stato: LETTO }, SCHEDA, 'salva')
    expect(d.schedaAdottaStato).toBe(true)
    expect(d.versioni).toBe('lette')
  })

  it('riga 7: «✓ Risulta cancellata», con il ✓, e NON «✓ Risulta salvata»', () => {
    const d = decidiControlla({ riga: 7, esito_invio: 'cancellata', stato: null }, SCHEDA, 'elimina')
    expect(d.testo).toBe('✓ Risulta cancellata')
    expect(d.spunta).toBe(true)
  })

  it('dopo la riga 1 di un «Togli» si riaccende «Togli», non «Elimina»', () => {
    expect(decidiControlla({ riga: 1, esito_invio: 'annullato', stato: LETTO }, SCHEDA, 'togli').riaccende)
      .toBe('togli')
    expect(decidiControlla({ riga: 1, esito_invio: 'annullato', stato: LETTO }, SCHEDA, 'elimina').riaccende)
      .toBe('elimina')
  })

  it('«Elimina» incerta con il codice annullato e la visita PRESENTE mostra la visita LETTA', () => {
    const d = decidiControlla({ riga: 1, esito_invio: 'annullato', stato: LETTO }, SCHEDA, 'elimina')
    // «Dove sta la visita lo dice la lettura, mai la memoria del telefono.»
    expect(d.testo).toContain('non ha scritto nulla')
    expect(d.versioni).toBe('partenza')  // la visita letta è uguale a quella di partenza? lo decide il chiamante
  })

  it('«Crea di nuovo» usa id NUOVI: riusare quello della visita darebbe `cancellata_altrove` per sempre', () => {
    const d = decidiControlla({ riga: 4, esito_invio: 'salvata', stato: null },
                              { ...SCHEDA, clienteEsisteAncora: true }, 'salva')
    expect(d.offreCreaDiNuovo).toBe(true)
    // l'id nuovo lo genera il componente; qui si prova che l'offerta esiste.
  })
})

describe('le risposte tardive si scartano per numero di generazione (§4.4, §8.1)', () => {
  // ⚠︎ BLOCCANTE della revisione del 28/09/2026: la prima stesura di questo
  // piano NON nominava mai il numero di generazione — zero occorrenze in 3377
  // righe — mentre §4.4 lo impone («Le risposte tardive dell'invio abbandonato
  // si scartano (numero di generazione)») e §8.1 ne chiede la prova.
  //
  // Il percorso raggiungibile è quello che il Task 12 mette in Playwright:
  // 10 s scaduti → «Non so» → l'operatrice tocca «Controlla», che brucia il
  // codice e risponde riga 1/`annullato` riaccendendo «Salva» con le versioni
  // DI PARTENZA (C1) → POI la promessa della Server Action abbandonata si
  // risolve. Senza generazione quel secondo handler riscrive pulsanti,
  // versioni e messaggio sopra la decisione di «Controlla».

  it('una risposta con una generazione vecchia non tocca lo stato della scheda', () => {
    const s = nuovoStatoScheda(SCHEDA)
    const gen = s.generazione                      // la scheda parte da 0
    s.applica(gen, { tipo: 'esito', esito: 'salvata' })
    expect(s.messaggio).toBe('✓ Salvata')
  })

  it('«Controlla» incrementa la generazione, e l invio abbandonato che arriva dopo si scarta', () => {
    const s = nuovoStatoScheda(SCHEDA)
    const genInvio = s.generazione
    s.scaduto()                                    // 10 s di D3-9
    s.controlla()                                  // incrementa
    s.applica(s.generazione, { tipo: 'riga', riga: 1, esito_invio: 'annullato', stato: LETTO })
    expect(s.versioni).toBe('partenza')
    // …e ORA arriva la risposta dell'invio abbandonato, con la generazione vecchia
    s.applica(genInvio, { tipo: 'esito', esito: 'salvata', visita: 'V-TARDIVA' })
    expect(s.versioni).toBe('partenza')            // invariato
    expect(s.messaggio).not.toBe('✓ Salvata')
  })

  it('anche un nuovo «Salva» incrementa la generazione', () => {
    // La gemella: senza questa, un contatore che si muove solo su «Controlla»
    // passerebbe la prova di sopra e lascerebbe scoperto il caso di due
    // salvataggi consecutivi.
    const s = nuovoStatoScheda(SCHEDA)
    const primo = s.generazione
    s.salva()
    expect(s.generazione).not.toBe(primo)
  })
})

describe('un «Controlla» che fallisce dà di nuovo «Non so» (§4.4)', () => {
  // ⚠︎ Queste due prove NON chiamano la rotta: passano da `classifica`, che è
  // logica pura (Task 4), e provano che QUESTO percorso la chiami con il
  // soggetto `'controlla'`. `esitoDelPercorsoControlla` è un aiuto locale che
  // applica la stessa traduzione della rotta a un guasto grezzo.
  const esitoDelPercorsoControlla = (g: GuastoGrezzo) => classifica('controlla', g).tipo

  it('per 57014, 55P03, 40001, 40P01 e per la rete', () => {
    for (const c of ['57014', '55P03', '40001', '40P01', null]) {
      expect(esitoDelPercorsoControlla({ sqlstate: c })).toBe('non_so')
    }
  })
  it('e 42501 è uscita forzata, senza affermazioni sulla visita', () => {
    expect(esitoDelPercorsoControlla({ sqlstate: '42501' })).toBe('uscita_forzata')
  })
})
```

⚠️ **`scheda-viva.ts`, dichiarata per intero** — la revisione 2 l'aveva inventata in dodici righe di prova, con otto
membri mai tipizzati e due forme di `risposta` di cui non dava l'unione. È la macchina a stati che regge §4.4: se
chi esegue ne inventa il contratto, è lo stesso errore che `StatoVisita` è già costato.

```ts
// src/dominio/scheda-viva.ts
export type RispostaAllaScheda =
  | { readonly tipo: 'esito'; readonly esito: Esito
      readonly visita?: string; readonly appuntamenti?: readonly Atteso[]
      readonly stato?: StatoVisita | null }
  | { readonly tipo: 'riga'; readonly riga: RispostaControlla['riga']
      readonly esito_invio: EsitoInvio; readonly stato: StatoVisita | null }
  | { readonly tipo: 'guasto'; readonly classe: Classe }

export interface SchedaViva {
  readonly generazione: number
  readonly messaggio: string
  readonly versioni: 'partenza' | 'lette'
  readonly pulsanti: { readonly salva: boolean; readonly controlla: boolean }
  /** Incrementa la generazione e restituisce quella con cui l'invio parte. */
  salva(): number
  /** I 10 s di D3-9 sono scaduti. ⚠︎ NON incrementa: l'invio può ancora arrivare. */
  scaduto(): void
  /** Incrementa: da qui in poi le risposte dell'invio precedente si scartano. */
  controlla(): number
  /** Scarta se `generazione` non è quella corrente. */
  applica(generazione: number, risposta: RispostaAllaScheda): void
}
export function nuovoStatoScheda(scheda: Scheda): SchedaViva
```

⚠️ **`scaduto()` non incrementa, e `controlla()` sì.** È la distinzione che decide il caso vero: se a incrementare
fosse lo scadere dei 10 s, la risposta di un invio **ancora in volo** verrebbe scartata **prima** che «Controlla»
ne abbia bruciato il codice — e l'operatrice vedrebbe «Non so» su un salvataggio che sta per riuscire. La prova che
lo pianta:

```ts
it('lo scadere dei 10 s NON incrementa la generazione: l invio può ancora arrivare', () => {
  const s = nuovoStatoScheda(SCHEDA)
  const gen = s.salva()
  s.scaduto()
  expect(s.generazione).toBe(gen)
  // e la risposta tardiva dell'invio, che è ancora la corrente, si applica
  s.applica(gen, { tipo: 'esito', esito: 'salvata' })
  expect(s.messaggio).toBe('✓ Salvata')
})
```

⚠️ E nella prima prova del blocco qui sopra si aggiunge `expect(s.generazione).toBe(gen)`: così com'era asseriva
solo `s.messaggio === '✓ Salvata'`, che viene da `messaggioPerEsito` del **Task 4** — cioè provava la traduzione
almeno quanto la generazione, e si sarebbe rotta ritoccando quella stringa.

È logica pura, quindi sta in `tests/dominio/` e gira anche sotto `npm run test:fuso`.

⚠︎ **`SCHEDA` e `LETTO` sono costruiti diversi apposta.** È la trappola che questo task può nascondere meglio: con
una scheda e uno stato identici, «adotta lo stato letto» e «tieni le versioni di partenza» producono lo stesso
risultato, e **la prova resterebbe verde con il codice sbagliato**. Chi esegue non li renda uguali per comodità.

- [ ] **Passo 2: vedi fallire, poi scrivi `src/dominio/controlla.ts`**

Il corpo si scrive `switch` sulla **coppia**, con il caso `riga: 1` che apre su `esito_invio`:

```ts
// ⚠︎ C1. Questo switch è su (riga, esito_invio), e non si semplifica.
// La riga 1 arriva da DUE esiti con prescrizioni OPPOSTE sulle versioni
// (spec §4.4, revisione 20, 27/09/2026):
//   — `annullato`   → versioni DI PARTENZA, mai rilette. Se una collega ha
//                     cambiato la visita, il «Salva» successivo DEVE ricevere
//                     `modificata_altrove`: è il solo modo perché nulla venga
//                     tolto in silenzio.
//   — `non_trovata` → la scheda ADOTTA lo stato letto, e con esso vale «La
//                     scheda aggiornata»: le modifiche non inviate si perdono.
// Chi decide sul solo `riga` sbaglia uno dei due, e nel verso `annullato`
// sbaglia IN SILENZIO (famiglia B5, R6-1).
```

E la distinzione 2/3:

```ts
// `controlla_invio` non restituisce mai riga 3 (immagine {1,2,4,5,6,7}):
// la fa qui `ugualeAllaScheda`, che è la definizione di §4.4 — stessa data,
// stessa cliente, stesso insieme di appuntamenti con operatrice, servizio,
// inizio e durata — e NON guarda le versioni.
```

- [ ] **Passo 3: scrivi la rotta `src/app/api/controlla/route.ts`**

Un `POST` che riceve `{ codice, visitaId }`, chiama `operatriceCorrente()`, poi
`rpc('controlla_invio', { p_codice, p_visita })`, e **avvolge con il soggetto `'controlla'`** (C2). Restituisce
`{riga, esito_invio, stato}` grezzi: la **decisione** la prende il telefono con `decidiControlla`, perché deve
confrontare con la scheda, che il server non ha.

⚠︎ **Non è una Server Action.** Se chi esegue la scrive come Server Action, l'intero meccanismo di §4.4 smette di
funzionare nel caso per cui esiste: resterebbe in fila dietro l'invio appeso. La **prova** è al Passo 5.

- [ ] **Passo 4: scrivi `src/dominio/invii-pendenti.ts`** (§4.4 punto 3, §4.9)

Ogni invio pendente tiene in `localStorage`, sotto `avstyle.invii`:

```ts
export interface InvioPendente {
  readonly codice: string        // crypto.randomUUID(), senza ripieghi
  readonly visitaId: string
  readonly clienteId: string | null   // solo se ESISTENTE
  readonly operatriceId: string       // chi lo ha scritto
  readonly toccatoIl: number          // epoch ms
}
```

**Solo identificativi casuali e un orario: nessun nome, nessun telefono, nessun orario di appuntamento.**

| Prova | Che cosa afferma |
|---|---|
| «il codice si scrive al TOCCO, non alla risposta» | §4.4 punto 3 |
| «il codice si cancella alla risposta DEFINITIVA» | idem |
| «un codice più vecchio di 24 ore si butta SENZA controllarlo» | §4.4 punto 3: «Controlla» su un codice già ripulito direbbe «non risulta salvato» di un invio salvato |
| «un codice di 23 ore e 59 minuti si controlla» | la gemella che rende la precedente capace di fallire |
| «alla riapertura si controllano solo i codici DELLA STESSA operatrice che ha fatto l'accesso» | §4.4 punto 3 |
| «i codici di un'altra operatrice restano lì» | la gemella |
| «il record non contiene nomi né numeri di telefono» | §4.9, prova sulle chiavi dell'oggetto |
| «il nome della cliente compare solo se letto dal database» | §4.4: altrimenti «Il salvataggio delle 10:04 non risulta salvato» |
| «`localStorage` assente o pieno non fa cadere l'app» | il contorno che nessun documento chiede e che un telefono in navigazione privata produce |

**D2-4:** i risultati si mostrano in una **striscia in testa all'agenda**, toccabile, che dice «N salvataggi da
controllare» e si apre a richiesta.

**L'abbandono** (§4.4 punti 1, 2, 4):

- chiudere o lasciare la pagina **mentre un invio è pendente** chiede conferma dove il browser lo permette —
  **su iPhone non basta**, e il limite si dichiara nel commento;
- all'abbandono parte un «Controlla» con `fetch` `keepalive` **solo** su `pagehide` con `persisted === false`:
  ⚠︎ su iPhone `pagehide` scatta **anche al semplice passaggio a un'altra app**, e bruciare lì il codice di un invio
  in volo lo farebbe tornare `annullato`. La prova: «`pagehide` con `persisted === true` non manda niente»;
- **«Esci»** esegue «Controlla» sugli invii pendenti **prima** di chiudere la sessione, con un limite di **5 s**
  [proposta] e un **«Esci comunque»**: i codici restano in `localStorage` e si controllano alla riapertura, così non
  si resta chiusi dentro quando la rete è giù.

- [ ] **Passo 5: la prova che «Controlla» non è in fila**

```ts
// tests/app/controlla-fuori-fila.test.ts

it('«Controlla» risponde mentre un invio è ancora appeso', async () => {
  // Si tiene un invio appeso bloccando la riga della visita da una seconda
  // connessione, poi si chiama la ROTTA con fetch e si misura che risponda.
  const avversaria = await connect()
  await avversaria.query('begin')
  await avversaria.query('select 1 from public.visit where id = $1 for update', [V1])
  const partito = salva(scheda, codice)            // resta appeso sul lock
  try {
    const r = await fetch(`${BASE}/api/controlla`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookieDi(sessione) },
      body: JSON.stringify({ codice, visitaId: V1 }),
    })
    expect(r.status).toBe(200)                     // ⚠︎ asserzione vera, non un corpo vuoto
    expect(await r.json()).toHaveProperty('riga')
  } finally {
    await avversaria.query('rollback')
    await partito
  }
})

it('la rotta risponde «Non so» a un 55P03, non «riprova a salvare»', async () => {
  // ⚠︎ È LA PROVA CHE ARMA C2 SUL SOGGETTO «controlla», e prima della revisione
  // del 28/09/2026 non esisteva in NESSUN task: la mutazione «l'involucro usa
  // sempre il soggetto 'invio'» dava zero rosse al Task 8 (rimandata al 9) e
  // zero al Task 9 (bersaglio sbagliato). Il contratto che il piano dichiara di
  // non poter sbagliare non aveva un presidio armato da nessuna parte.
  //
  // 55P03 è il codice che la prova (c) del Task 7 del piano 3a-1 ha MISURATO:
  // attesa sulla chiave d'invio oltre `lock_timeout`. Non è fra i sei con un
  // messaggio proprio, quindi un involucro che applicasse il criterio di §4.3
  // passo 8 anche a «Controlla» risponderebbe «Non sono riuscita a salvare,
  // riprova» — la frase che §4.4 vieta.
  const avversaria = await connect()
  await avversaria.query('begin')
  await avversaria.query("set local lock_timeout = '100ms'")
  await avversaria.query('insert into public.invio (codice, esito) values ($1, $2)', [codice, 'in_corso'])
  // la riga dell'invio resta bloccata: «Controlla» ci si mette in coda e muore
  try {
    const r = await fetch(`${BASE}/api/controlla`, { … })
    const corpo = await r.json()
    expect(corpo.tipo).toBe('non_so')
    expect(JSON.stringify(corpo)).not.toContain('riprova')
    expect(JSON.stringify(corpo)).not.toContain('non risulta')
  } finally {
    await avversaria.query('rollback')
  }
})
```

⚠︎ **Dichiarato:** la **prima** prova presidia che la rotta esista e risponda, **non** che stia fuori dalla fila. La
fila è un fatto del client di React e si misura solo da un browser vero: §8.3 lo chiede esplicitamente («Controlla
funziona anche mentre un invio è ancora appeso»), ed è la prova del Task 12. Chi esegue **non scriva nel resoconto
che la fila è provata qui**.

⚠︎ La prima stesura di questa prova aveva il **corpo vuoto**, con i soli commenti. In Vitest una prova senza
asserzioni è **verde**: era un presidio che non poteva mordere, dichiarato «parziale» quando era **nullo**.

- [ ] **Passo 6: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire | Rosse attese |
|---|---|---|---|
| 1 | `decidiControlla` decide sul solo `riga`: riga 1 → sempre `versioni: 'partenza'` | «riga 1 con `non_trovata`…», «la SOLA differenza fra i due casi…» | 2 [da misurare] |
| 2 | riga 1 → sempre `versioni: 'lette'` | «riga 1 con `annullato`…», «la SOLA differenza…» | 2 [da misurare] |
| 3 | `schedaAdottaStato` sempre `false` | le tre prove che lo asseriscono vero | 3 [da misurare] |
| 4 | la distinzione 2/3 si fa confrontando **anche le versioni** | «riga 2 con lo stato UGUALE alla scheda» | 1 [da misurare] |
| 5 | riga 7 → «✓ Risulta salvata» (la forma pre-27/09) | «riga 7: «✓ Risulta cancellata»…» | 1 [da misurare] |
| 6 | riga 6 con `gia_cancellata` → «✓ Risulta salvata» | «riga 6 porta il messaggio dell esito…» | 1 [da misurare] |
| 7 | riga 6 con `modificata_altrove` → `spunta: true` | «riga 6 con `modificata_altrove` e `cancellata_altrove` NON portano il ✓» | 1 [da misurare] |
| 8 | riga 5 → `errore: false` | «riga 5 è un errore, e l agenda si ricarica» | 1 [da misurare] |
| 9 | «Crea di nuovo» offerto anche senza cliente | «riga 4: … SOLO se la cliente esiste ancora» | 1 [da misurare] |
| 10 | dopo la riga 1 si riaccende sempre «Salva» | «dopo la riga 1 di un «Togli» si riaccende «Togli»» | 1 [da misurare] |
| 11 | `esitoDelPercorsoControlla` usa `classifica('invio', …)` | «un «Controlla» che fallisce dà di nuovo «Non so»» e «42501 è uscita forzata» | **2** [da misurare] |
| 11b | **nella rotta**, `avvolgi('controlla', …)` → `avvolgi('invio', …)` | **prova nuova, da scrivere in `tests/app/controlla-fuori-fila.test.ts`**: «la rotta risponde “Non so” a un 55P03, non “riprova a salvare”» — vedi l'avvertenza qui sotto | 1 [da misurare] |
| 11c | riga 6 con `esiste_gia` cade nel ramo generico (la forma della prima stesura) | «riga 6 con `esiste_gia`: la visita si rilegge …» (2 asserzioni, 1 prova) e «… con la visita SPARITA …» | 2 [da misurare] |
| 11d | riga 4 dà lo stesso testo per `salvata` e per `non_trovata` | «riga 4 con `non_trovata`: NON dice “dopo il salvataggio”» | 1 [da misurare] |
| 11e | riga 5 è sempre `errore: true` | «riga 5 con `non_trovata` è il caso ordinario» | 1 [da misurare] |
| 11f | `applica` ignora la generazione e applica sempre | «l invio abbandonato che arriva dopo si scarta» | 1 [da misurare] |
| 11g | solo «Controlla» incrementa la generazione, non «Salva» | «anche un nuovo «Salva» incrementa la generazione» | 1 [da misurare] |
| 11h | **`scaduto()` incrementa la generazione** | «lo scadere dei 10 s NON incrementa» — ⚠︎ la sonda che la revisione 2 non aveva: senza di lei le tre prove restavano verdi qualunque cosa incrementasse | 1 [da misurare] |
| 12 | la scadenza dei codici passa da 24 ore a 30 giorni | «un codice più vecchio di 24 ore si butta SENZA controllarlo» | 1 [da misurare] |
| 13 | `pagehide` manda «Controlla» anche con `persisted === true` | «`pagehide` con `persisted === true` non manda niente» | 1 [da misurare] |
| 14 | alla riapertura si controllano i codici di **tutte** le operatrici | «si controllano solo i codici DELLA STESSA operatrice» | 1 [da misurare] |
| 15 | il record di `localStorage` porta anche il nome della cliente | «il record non contiene nomi né numeri di telefono» | 1 [da misurare] |
| 16 | «Esci» chiude la sessione **prima** di «Controlla» | «“Esci” controlla prima di chiudere la sessione» | 1 [da misurare] |

⚠︎ Le sonde **1** e **2** sono la coppia che misura C1. Se una delle due dà meno di 2 rosse, **il task non si
chiude**: vuol dire che `SCHEDA` e `LETTO` sono troppo simili e le prove non distinguono i due rami.

- [ ] **Passo 7: gate e commit** — `feat(3a-2): «Controlla», la coppia (riga, esito_invio) e gli invii pendenti`,
      con nel corpo la ragione per cui la riga 1 è sovraccarica e il danno del decidere sul solo numero.

---

### Task 10: il trascinamento e «Annulla»

**Files:**
- Create: `src/dominio/trascinamento.ts`, `src/dominio/annulla.ts`
- Create: `src/cliente/trascina.tsx`
- Create: `tests/dominio/trascinamento.test.ts`, `tests/dominio/annulla.test.ts`
- Create: `tests/app/spostamento.test.ts`
- Modify: `src/server/azioni-visita.ts` (aggiunge `sposta` e `annullaSpostamento`),
  `src/cliente/agenda-colonne.tsx`

**Interfaces:**
- Consuma: `public.sposta_visita_a(uuid,uuid,date,jsonb,text,jsonb)` (0017); `public.salva_visita` (0016);
  **`public.stato_visita(uuid)` (0016)**; `decidiControlla` (Task 9); `proiettaAttesi` (Task 4);
  `componiBlocchi` (Task 5).

⚠️⚠️ **DA DOVE VENGONO LE VERSIONI, e perché è la prima cosa che questo task deve sapere.** `BloccoAgenda` porta
`AppuntamentoLetto`, e `AppuntamentoLetto` **non ha versioni**: è una decisione esplicita del Task 5, presa perché
`appointment.updated_at` di PostgREST e `app.versione()` rendono forme diverse e mescolarle farebbe rimbalzare ogni
spostamento **per sempre**.

Quindi, **al rilascio di ogni gesto**, prima di chiamare `sposta_visita_a` o `salva_visita`:

```ts
// 1. leggi lo stato corrente della visita: è l'unica fonte valida di versioni
const stato = await client.rpc('stato_visita', { p_visita: visitaId })
// 2. proietta e ordina (C3), altrimenti il confronto posizionale rimbalza
const attesi = proiettaAttesi(stato.appuntamenti)
// 3. `stato.visita` è la VERSIONE della visita, non il suo id
await client.rpc('sposta_visita_a', {
  p_codice: codice, p_visita: visitaId, p_data: data,
  p_destinazioni: destinazioni(blocco, scarto),
  p_visita_attesa: stato.visita, p_attesi: attesi,
})
```

**Dal secondo gesto in poi** si possono usare le versioni **restituite** dalla scrittura precedente, che sono già
nella forma giusta — ed è la regola «dopo ogni ✓ l'agenda adotta le versioni restituite» qui sotto. `stato_visita`
serve al **primo** gesto di ogni visita, e dopo ogni ricarica del giorno.

⚠︎ La revisione 2 aveva preso questa decisione **nel Task 5** e non l'aveva portata qui: tutti e due i revisori del
secondo giro l'hanno trovata, da lati diversi. Il danno dichiarato era «l'operatrice non riuscirebbe a spostare
niente, **mai**».
- Produce:
  ```ts
  export function destinazioni(blocco: BloccoAgenda, scartoCelle: number):
    readonly { readonly id: string; readonly inizio: number }[]

  // ⚠︎ L'ingresso è la `Risposta` del Task 8, NON `Esito | 'errore'`. La prima
  // stesura usava quest'ultima, e `Risposta` ha due varianti che `Esito` non
  // contiene: `uscita_forzata` e `app_aggiornata`. Cioè il trascinamento non
  // aveva NESSUN MODO DI TIPO per dire «sei stata disattivata, esci» né «l'app
  // è stata aggiornata, ricarica» — e `42501` è raggiungibile sul percorso del
  // gesto (regola 11: visibilità persa durante la scrittura, §4.1), dove §4.3
  // passo 7 impone il ricontrollo dell'account. Reperto del secondo giro.
  export interface MessaggioSpostamento {
    readonly testo: string
    readonly spunta: boolean
    readonly posizione: 'nuova' | 'letta' | 'sparisce'   // mai «ricordata»
    readonly offreAnnulla: boolean
    readonly apreLaScheda: boolean
    readonly ricaricaIlGiorno: boolean
    readonly esciDallApp: boolean          // uscita_forzata
    readonly ricaricaLaPagina: boolean     // app_aggiornata
  }
  export interface MessaggioAnnulla extends Omit<MessaggioSpostamento, 'offreAnnulla'> {}

  export function messaggioDiSpostamento(r: Risposta, letto: StatoVisita | null): MessaggioSpostamento
  export function messaggioDiAnnulla(r: Risposta, letto: StatoVisita | null,
                                     oraDiPrima: number): MessaggioAnnulla
  ```

⚠️ **La riga che mancava alle due tabelle, e che vale per tutte e due:**

| Caso | Che cosa mostra |
|---|---|
| **`42501`**, oppure `uscita_forzata` | **uscita forzata**, senza affermazioni sulla visita (§4.4). Il blocco non si muove e non si commenta: si esce |
| `app_aggiornata` | «L'app è stata aggiornata, ricarica» (§4.3 passo 8) |
| **ogni altro SQLSTATE** (`23514`, `23502`, `22023`, `22P02`, `22003`…) | «Non sono riuscita a spostarla»; il blocco va alla posizione **letta**, il giorno si ricarica. È la stessa frase di `57014`/`40P01` esauriti, perché per l'operatrice il fatto è lo stesso: non è stata spostata, ed è certo |

⚠︎ Tre prove in più, una per riga. Senza di loro un `23514` lascia il blocco con «Salvo…» acceso e nessun messaggio
definitivo — e un'operatrice disattivata a metà gesto **resta dentro l'app**, che è lo stesso danno del bloccante
sul ricontrollo dell'account, riaperto su un'altra superficie.

**Le regole del gesto (D3-15, §5.1), che non si ridecidono:**

- pressione lunga **0,4 s** [proposta, **da provare su un iPhone vero**], selezione e menu contestuale spenti;
- **solo verticale**, a passi di **5 minuti**; niente cambio di colonna né di giorno; scorrimento del giorno sospeso;
- blocco di **tutta** la visita → `sposta_visita_a`; blocco di **un solo** appuntamento → `salva_visita` con
  l'**insieme completo** degli appuntamenti di quella visita, che l'agenda conosce perché stanno tutti nello stesso
  giorno (`0004:26-29`);
- gli avvisi che la posizione **di partenza** aveva già si passano come **confermati**;
- al rilascio ogni invio ha il suo **codice d'invio**; il blocco resta nella posizione nuova con **«Salvo…»** ben
  visibile, con gli stessi 10 s di D3-9;
- dopo ogni ✓ l'agenda **adotta le versioni restituite** (o rilette da «Controlla»), altrimenti il trascinamento
  successivo della stessa visita darebbe «È diversa» **contro sé stesso**;
- una ricarica messa da parte durante il gesto **non si applica** se è stata letta **prima** del ✓: finito il gesto
  si rilegge il giorno;
- **«Annulla»** compare solo dopo un `salvata` diretto o un «✓ Spostata» di «Controlla», si spegne al primo tocco,
  ha **un suo** codice d'invio, e riscrive la posizione di prima con le **versioni adottate**.

⚠︎ **`sposta_visita_a` alza la versione anche degli appuntamenti che non si muovono**, e quella della visita, perché
è **esente** dalla regola 8 (spec revisione 17, misurato il 25/09/2026: aggiungere `is distinct from` fa sollevare
un falso `42501` su uno spostamento nello stesso giorno — che §5.1 rende **il caso normale**, perché il
trascinamento è solo verticale). Conseguenza: la scheda aperta di una collega riceve `modificata_altrove` anche per
un blocco che non si è mosso. **Non si tenta di aggirarla.**

⚠︎ **`destinazioni` conserva gli scarti.** §4.1: `sposta_visita_a` riceve il **nuovo inizio di ciascun
appuntamento**, calcolato dall'app, e l'insieme degli `id` di destinazione deve **coincidere** con l'insieme atteso.
Prove: «due servizi con una pausa mantengono la pausa dopo lo spostamento»; «l'insieme degli id di destinazione è lo
stesso dell'insieme atteso»; «uno scarto che porterebbe un appuntamento sotto la cella 0 o oltre la 288 si rifiuta
prima di chiamare».

- [ ] **Passo 1: scrivi le prove di `trascinamento.ts`** — gli **otto esiti** di §5.1, uno per prova:

| Esito | Che cosa mostra |
|---|---|
| `salvata` | ✓ e poi «Spostata alle 16:15 · Annulla» per 6 s |
| `da_confermare` o conflitto | si apre la scheda |
| `modificata_altrove` | il blocco **torna dov'era**, «È diversa da come l'avevi lasciata», il giorno si ricarica |
| `cancellata_altrove` o `non_trovata` | «La visita è stata cancellata», il giorno si ricarica, **nessuna offerta** |
| `57014` o `40P01` esauriti | «Non sono riuscita a spostarla»; la visita **si rilegge** e il blocco va alla posizione **letta**, non a quella ricordata |
| nessuna risposta, o risposta «Non so» | «?» e **«Controlla» automatico** |
| riga 1 con la visita **presente** | il blocco va alla posizione **letta**, «Lo spostamento non è stato salvato» |
| riga 1 con la visita **assente** | «Lo spostamento non è stato salvato: la visita è stata cancellata», il blocco sparisce |

più: riga 2 → «✓ Spostata alle 16:15»; riga 3 → «È diversa da come l'avevi lasciata»; riga 4 → «La visita è stata
cancellata», **senza offerta** (L12: nel trascinamento l'operatrice voleva spostare, non ricreare); riga 6 → il
messaggio di quell'esito. Poi il giorno si ricarica.

Se anche «Controlla» non risponde, il «?» resta **toccabile** e ripete «Controlla»; l'app ritenta da sola **al
massimo tre volte a distanza crescente** [proposta]. **Solo quel blocco** resta in attesa: le ricariche degli altri
blocchi e degli altri giorni **non** si sospendono.

⚠︎ La prova «l'orario nel messaggio è quello LETTO, non quello ricordato» si scrive con un `letto` **diverso** dalla
posizione di partenza **e** dalla destinazione: con tre valori distinti, un'implementazione che usasse la memoria del
telefono si vede. Con due, no.

- [ ] **Passo 2: scrivi le prove di `annulla.ts`** — **ogni voce** della tabella di §5.1, dieci prove:

| Voce | Messaggio |
|---|---|
| `salvata`, oppure riga 2 | «✓ Riportata alle 15:00» |
| riga 1, visita presente | «L'annullamento non è stato salvato: la visita ora è alle HH:MM» — orario **letto** |
| riga 1, visita assente | «L'annullamento non è stato salvato: la visita è stata cancellata»; il blocco sparisce |
| riga 3 | «Riportata alle 15:00, ma poi la visita è stata cambiata»; l'orario si nomina **solo se è cambiato** |
| riga 4 | «La visita è stata cancellata»: il blocco sparisce, il giorno si ricarica, **nessuna offerta** |
| `modificata_altrove` diretto, o riga 6 con `modificata_altrove` | «Non ho annullato: la visita è stata cambiata»; l'orario **solo se la rilettura ne trova uno** |
| `cancellata_altrove` diretto o riga 6 con `cancellata_altrove` | «Non ho annullato: la visita è stata cancellata» |
| `non_trovata`, oppure riga 5 | «Non ho annullato: non trovo più questa visita»; il giorno si ricarica. **Non** si dice «è stata cancellata», che la tabella delle cancellate smentirebbe |
| `57014` o `40P01` esauriti | «Non sono riuscita ad annullare»; la visita si rilegge, l'orario è quello **letto** |
| `da_confermare` o conflitto | si apre la scheda sulla posizione **di prima**, con gli avvisi che quella posizione **aveva già** ripassati come confermati |

⚠︎ La riga 3 di «Annulla» è la voce più facile da sbagliare: l'orario si nomina **solo se è cambiato**, perché la
collega può aver cambiato servizio od operatrice **senza toccare l'ora**. Due prove, non una: «lo nomina quando
l'ora è cambiata» e «non lo nomina quando l'ora è la stessa».

- [ ] **Passo 3: la fila degli invii** (§5.1, ultimo capoverso)

Finché un invio è appeso nella fila, gli invii successivi dallo stesso telefono **aspettano dietro di esso**:
l'app lo **mostra** («In attesa del salvataggio precedente») invece di far sembrare fermi i pulsanti. I **10 s di
D3-9 contano dal TOCCO**, non dalla partenza effettiva — è la parte che una lettura distratta perde, e la prova la
nomina: «il conto alla rovescia parte dal tocco, anche se l'invio parte tre secondi dopo».

⚠︎ §10 della spec dice che «il piano misura la fila **anche per gli invii**, non solo per «Controlla»». La misura è
al **Task 12** con Playwright: due invii consecutivi dal browser, con il primo trattenuto.

- [ ] **Passo 4: le prove contro il database** (`tests/app/spostamento.test.ts`)

| Prova | Che cosa afferma |
|---|---|
| «uno spostamento nello stesso giorno riesce» | il caso normale di §5.1 |
| «dopo il ✓ l'agenda adotta le versioni restituite, e il secondo trascinamento riesce» | la regola che impedisce «È diversa» contro sé stesso |
| «senza adottare le versioni, il secondo trascinamento dà `modificata_altrove`» | la **gemella** che rende la precedente capace di fallire |
| «uno spostamento alza la versione anche degli appuntamenti che non si muovono» | il prezzo dichiarato dell'esenzione dalla regola 8 |
| «l'insieme di destinazione diverso dall'atteso è rifiutato» | §4.1 |
| ««Annulla» con le versioni adottate riporta la visita e restituisce `salvata`» | §5.1 |

- [ ] **Passo 5: la verifica a mano, dichiarata** (§8.4)

Il trascinamento **su un iPhone vero** non è coperto da nessuna prova automatica. Chi esegue:

1. apre l'app su un iPhone vero, in verticale;
2. prova la pressione lunga a **0,4 s** e registra se arma il gesto senza far partire la selezione del testo o il
   menu contestuale;
3. prova che lo scorrimento del giorno resti **sospeso** durante il gesto;
4. **scrive l'esito nel resoconto**, compreso il valore che ha funzionato se 0,4 s si è rivelato sbagliato.

⚠︎ Se 0,4 s non funziona, **il numero nuovo è una misura**, non una proposta: si scrive nel piano e nella spec.

- [ ] **Passo 6: sonde di mutazione** — almeno: `destinazioni` che non conserva gli scarti; il messaggio che usa
      l'orario **ricordato** invece di quello letto (deve arrossire in tre punti: trascinamento `57014`, riga 1, e
      «Annulla» riga 1); riga 4 di «Annulla» che offre di ricreare; la riga 3 che nomina l'orario **sempre**;
      l'agenda che non adotta le versioni dopo il ✓; il conto alla rovescia che parte dalla partenza invece che dal
      tocco; «Annulla» che riusa il codice d'invio dello spostamento invece di averne uno suo.

- [ ] **Passo 7: gate e commit** — `feat(3a-2): il trascinamento e «Annulla»`, con nell'ultimo capoverso l'esito
      della verifica a mano sull'iPhone.

---

### Task 11: l'aggiornamento in diretta

⚠︎ **Dipende dal Task 8 del piano 3a-1**, che era **in esecuzione** mentre questo piano veniva scritto. Chi esegue
**rilegge il contratto vero** in `supabase/migrations/0019_annunci.sql` e nell'appendice di esecuzione del Task 8,
e **se diverge da quello assunto qui, lo dichiara e adatta il codice, non il database**.

**Files:**
- Create: `src/cliente/diretta.ts`
- Create: `src/dominio/ricariche.ts`
- Create: `tests/dominio/ricariche.test.ts`
- Create: `tests/app/diretta.test.ts`
- Modify: `src/app/(salone)/agenda/page.tsx`

**Contratto assunto** (dal piano 3a-1, Task 8): `public.annuncio(id bigint, giorni date[], creato timestamptz)`;
trigger **per istruzione** su `appointment` e su `visit`; tabella nella pubblicazione `supabase_realtime`,
**limitata agli inserimenti**; una riga per istruzione con i **soli giorni toccati, vecchi e nuovi**; contenuto
**solo date** — nessun nome, nessun telefono, nessun `id` di cliente.

**Che cosa fa l'app:**

- si iscrive a `postgres_changes` sugli **INSERT** di `public.annuncio`;
- se uno dei giorni nominati è quello mostrato, **ricarica il giorno intero**. Non si tenta un aggiornamento
  incrementale: il messaggio porta solo date, ed è **voluto**;
- **ripieghi**: ricarica alla **riconnessione** del canale, al ritorno in primo piano (`visibilitychange`,
  `pageshow`), alla **mezzanotte di Perugia**, e **ogni 60 s** [proposta] in primo piano. Al ritorno in primo piano
  **«oggi» si ricalcola**;
- durante **un gesto o un salvataggio** le ricariche si mettono da parte e si applicano **subito dopo**.

Le prove pure di `ricariche.ts`:

| Prova | Che cosa afferma |
|---|---|
| «un annuncio che nomina il giorno mostrato provoca una ricarica» | D3-12 |
| «un annuncio che nomina solo altri giorni non provoca niente» | la gemella negativa |
| «un annuncio che nomina il giorno VECCHIO e quello NUOVO di uno spostamento tocca tutti e due» | il contratto «vecchi e nuovi» |
| «durante un gesto la ricarica si mette da parte» | §4.6 |
| «finito il gesto la ricarica si applica» | la gemella |
| «una ricarica letta PRIMA del ✓ non si applica: si rilegge il giorno» | §5.1, la regola che salva il trascinamento |
| «al ritorno in primo piano “oggi” si ricalcola» | §4.6; la prova usa i due giorni del cambio d'ora |
| «alla mezzanotte di Perugia il giorno mostrato cambia se era “oggi”» | §4.6 + §7 |

**Limiti dichiarati** (§4.6), da scrivere nel commento e nel resoconto:

- Realtime valuta le politiche **all'ingresso** nel canale e al **cambio di token**: un telefono già iscritto il cui
  account viene chiuso riceve ancora **date** fino al rinnovo, al massimo `jwt_expiry = 3600` s
  (`supabase/config.toml:164` [misurato]). Sono **solo date**, ed è la ragione per cui il messaggio non porta altro.
- Senza il servizio Realtime le partizioni mancano e i messaggi si **perdono in silenzio**: la prova di §8.2
  verifica la **ricezione**, e i ripieghi coprono il caso.

**Sonde:** i ripieghi tolti uno per uno (ognuno deve arrossire la sua prova); la ricarica applicata anche durante il
gesto; l'iscrizione su `*` invece che su `INSERT`; il confronto dei giorni fatto su `Date` invece che su stringhe
(→ deve arrossire sotto `test:fuso`).

**Commit:** `feat(3a-2): l'aggiornamento in diretta, e i quattro ripieghi`.

---

### Task 12: le prove da capo a fondo, e il gate finale

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/*.spec.ts`
- Modify: `package.json` (script `e2e`), `.github/workflows/ci.yml`

**Telefono simulato a 375 e 430 punti** (§8.3), in verticale.

**Da spec §13.4:** le prove **1**, **3**, **4** (con la conferma), **5**, **7** (con il motivo).

**Due telefoni:**

| Prova | Che cosa afferma |
|---|---|
| «Annalisa prenota → il blocco compare da Vera entro 3 s» | D3-12 [proposta] |
| «Annalisa sposta a domani → sparisce da oggi» | il contratto «vecchi e nuovi» |
| «Annalisa aggiunge un servizio mentre Vera ha la scheda aperta → “modificata altrove”» | §8.2, famiglia B5 |

**Le prove che chiudono ciò che i task precedenti hanno dichiarato aperto:**

| Prova | Chiude |
|---|---|
| «operatrice disattivata scrivendo sul database da proprietario → uscita forzata» | il collegamento del Task 3, sonde 1-4 |
| «rete bloccata a metà salvataggio → “Controlla”, con il salvataggio ARRIVATO → “✓ Risulta salvata”, e una sola visita» | riga 2 |
| «con il salvataggio arrivato e poi cancellato da Annalisa → “È stata cancellata dopo il salvataggio”» | riga 4 |
| «con il salvataggio TRATTENUTO NEL BROWSER prima che la richiesta parta e rilasciato dopo “Controlla” → “Non risulta salvata”, e il salvataggio tardivo NON compare in agenda» | riga 1 con `annullato`, cioè **C1** dal lato che conta |
| «“Controlla” funziona anche mentre un invio è ancora appeso» | la **fila**, che il Task 9 ha dichiarato non provata |
| «due invii consecutivi con il primo trattenuto: il secondo mostra “In attesa del salvataggio precedente”» | §10, «il piano misura la fila anche per gli invii» |
| «avviso nuovo al salvataggio → la scheda si ferma» | D3-19 |
| «trascinamento: “Annulla”; rilascio su un conflitto → scheda; rilascio senza risposta → “?”, “Controlla” automatico e messaggio definitivo» | Task 10 |
| «rete assente → striscione; app ripresa il giorno dopo → “oggi” nuovo» | §10.3, §4.6 |
| «accessibilità automatica (axe) su ogni schermata» | §7 |
| «fuso America/New_York, orologio al 25 ottobre 2026 e al 28 marzo 2027 alle 10:00» | §7, la linea dell'ora |

- [ ] **Passo finale: il gate di fine piano**

```bash
npx supabase db reset
npm test
npm run test:fuso
npx tsc --noEmit
npm run build
npm run e2e
```

Poi, come vuole §8.6:

- **`/security-review`** sul ramo;
- **test-audit** con la tabella `mutazione → prova` oppure `NOT CAUGHT` per ogni presidio;
- il **censimento delle prove fatto con una spia, non con una regex**: un `grep` su `it(` perde le chiamate via
  helper — il piano 3a-1 ha misurato **18 contro 98**. Si conta con il reporter di Vitest, non con `grep`.

**Commit:** `feat(3a-2): le prove da capo a fondo, e il gate finale del piano`.

---

## Dipendenze non ancora consegnate

Tre cose non esistevano mentre questo piano veniva scritto. Per ciascuna: che cosa si è **assunto** e che cosa
**costa** se l'assunzione è sbagliata. L'orchestratrice ricongiunge quando quei task chiudono.

| # | Che cosa manca | Assunzione | Costo se è sbagliata |
|---|---|---|---|
| 1 | **`public.annuncio` e i suoi trigger** — Task 8 del piano 3a-1, **in esecuzione** il 28/09/2026 | `annuncio(id bigint, giorni date[], creato timestamptz)`; trigger **per istruzione** su `appointment` e `visit`; pubblicazione **limitata agli inserimenti**; una riga per istruzione con i soli giorni **vecchi e nuovi**; contenuto solo date | Tocca **solo il Task 11**. Se la forma diverge — per esempio se `giorni` diventa `jsonb`, o se la pubblicazione include gli UPDATE — cambia l'iscrizione e il parser dell'array, non la logica di `ricariche.ts`. ⚠︎ Se il trigger risultasse **per riga** invece che per istruzione, il Task 11 riceverebbe **N messaggi per salvataggio** invece di uno, e i 60 s di ripiego diventerebbero il meccanismo principale |
| 2 | **`public.cerca_clienti` e `public.doppioni_cliente`** — Task 10 del piano 3a-1 | Due funzioni chiamate **in POST** (§4.8), che ricevono il testo cercato e restituiscono righe di `client`; i doppioni per **stesso telefono E.164** o **nome simile** (`pg_trgm`, soglia **0,4** [proposta] misurata sull'esempio «maria rosi» / «Maria Rossi») | Tocca **solo il Task 7**, nella parte «Cliente» della scheda. Il piano **non progetta la loro forma**: è del Task 10. Se le firme differiscono, cambia una funzione di `src/server/lettura-scheda.ts` |
| 3 | **I colori di D3-6** — Task 10 del piano 3a-1, migrazione `0021` | `operator.color` porterà Vera `#C2185B`, Annalisa `#FFFFFF`, Alessandra `#9B1B1B`. Oggi `0001:55-56` porta Annalisa `#7B3F61` e Alessandra `#2F6F6B` | Tocca il **Task 5**. Mitigato in partenza: l'agenda **legge** `operator.color` e non inchioda nessun colore, e la prova sui contrasti passa i valori di D3-6 **come argomento**. ⚠︎ Il caso di Annalisa (`#FFFFFF`, contrasto 1,13, che si vede solo grazie al **bordo in inchiostro**) resta provato con i valori di D3-6 anche prima che siano nel database |

**Una quarta dipendenza, più leggera:** la **revoca della vecchia `move_visit`** (Task 9 del piano 3a-1, migrazione
`0020`). Questo piano **non la chiama mai**, quindi la sua esistenza non cambia niente; ma finché non è revocata,
`authenticated` può ancora chiamarla via PostgREST — e quella funzione **non ha controllo di versione**
(`0010:31-83`). Non è un rischio introdotto da qui, è un rischio che resta.

---

## Composizione con il piano 3b, e la conseguenza che nessuna delle due chat vedeva

Scritto il 28/09/2026, dopo la richiesta della chat della spec 3b (revisione 2, `69f5dd5`). Due decisioni loro
toccano questo piano, e sono state **verificate alla fonte** prima di essere accolte: `client.id` è davvero
`gen_random_uuid()` (`0003_client.sql:15`), spec §6.2 dice davvero di `preferred_operator_id` *«It is personal
data»*, `no_messages` esiste davvero, e D3b-13 sta davvero nella spec committata.

**Accolte tutte e due**, e sono migliorie vere: l'elenco di permessi del Passo 4b del Task 5, e il «+» che passa al
3b senza segnaposto.

⚠︎ **Ma comporre le due decisioni produce una conseguenza che nessuna delle due chat poteva vedere da sola, perché
sta fra i due piani.** L'elenco dei permessi dice: *«nelle richieste GET a `from('client')` è ammesso solo il filtro
su `id`»*. La prova che lo impone è **mia** (§4.8 la assegna al 3a) e gira su **tutto `src/`**, quindi vale anche per
il codice che il 3b e il piano 4 scriveranno. Conseguenza:

| Schermata | Di chi | Su che cosa filtra | Che cosa impone l'elenco dei permessi |
|---|---|---|---|
| **Compleanni** (spec §9.7) | 3b | `birth_month`, `birth_day`, e l'esclusione di `no_messages` | **non può** essere un GET su `from('client')`: serve una funzione in POST, che **oggi non esiste** |
| **Revisione delle conservazioni** (spec §11.4) | piano 4 | `last_activity_at` | idem |
| **Ricerca clienti** (spec §9.6) | 3b | nome e telefono | già prevista in POST (`cerca_clienti`, Task 10 del 3a-1): **nessun costo** |

Il costo non è grande — è una funzione `security invoker` in più per i compleanni — **ma non è zero, e non è
nominato in nessuno dei due documenti**. Se il 3b l'ha già previsto, bene; se non l'ha previsto, lo scopre quando la
mia prova statica diventa rossa sul **suo** codice, in un task che credeva chiuso.

**Questo piano non decide per il 3b**: scrive la conseguenza e la rimanda. ⚠︎ Ed è esattamente il caso di «due sì
ragionevoli in due chat diverse che si sommano in un rischio che nessuna delle due vede»: chi consegna per ultimo
compone.

---

## Divergenze fra spec e realtà, trovate e non corrette

Come chiesto: elencate, non corrette. Nessuna è bloccante per questo piano.

1. ⚠︎ **§4.9 «Unica eccezione dichiarata» è resa falsa da D2-1.** La spec 3a §4.9 dice che l'unica eccezione alla
   regola «solo in memoria» sono i codici degli invii pendenti; l'utente ha deciso il 28/09/2026 che anche la vista
   colonne/lista e l'operatrice della settimana stanno in `localStorage`. Non sono dati personali, ma la frase «unica»
   va corretta, altrimenti la prossima revisione la troverà superata e non saprà se è una svista o una decisione.

2. **La spec 3a §1 dice che il 3a fa «tutta la spec §10»**, e §10.5 della spec originale impone il ritentativo su
   `40P01` a **ogni percorso di scrittura che tocca `operator`**. Le scritture su `operator` sono di **3c**
   (impostazioni), e §3.3 lo dice esplicitamente: «ritentativi su `40P01` anche per le scritture su `operator`» è
   nell'elenco del 3c. Le due frasi convivono solo leggendo «tutta la §10» come «tutta la §10 per i percorsi che il
   3a costruisce». Questo piano la legge così.

3. **Spec originale §9.2 dice che l'interruttore lista/colonne è «remembered per device (D13)»**; la spec 3a §5.2
   descrive la lista senza nominare la memoria. D2-1 chiude la divergenza a favore di D13.

4. **Spec originale §9.11 vuole una pastiglia su Impostazioni** quando ci sono clienti eliminabili (§11.4). §11 è del
   **piano 4** (spec 3a §3.3), quindi la pastiglia non si disegna qui. La navigazione del Task 3 la lascia fuori;
   quando il piano 4 la aggiungerà, tocca `src/cliente/navigazione.tsx`.

5. **Spec 3a §8.1 dice «decisione di «Controlla» per ciascuna delle SEI righe»**, ma dalla revisione 18 le righe
   sono **sette**. È un residuo testuale: la tabella di §4.4 ne elenca sette e l'appendice del Task 7 del piano 3a-1
   lo dichiara. Questo piano scrive le prove per **sette** righe, cioè per l'immagine `{1,2,4,5,6,7}` più la riga 3
   che l'app produce da sé.

6. **Spec 3a §4.6 descrive «il canale privato `agenda`» con `realtime.send`** e una politica su `realtime.messages`.
   La revisione 12 dichiara quella politica **non creabile**, e il piano 3a-1 ha riscritto il Task 8 attorno a una
   tabella `annuncio` nostra. Il testo di §4.6 porta ancora la descrizione superata accanto all'avviso: chi legge §4.6
   senza leggere l'avviso costruirebbe la cosa sbagliata. Questo piano si attiene al **Task 8 del piano 3a-1**.

7. **`src/dominio/tempo.ts` non ha alcun chiamante di produzione per `confineDaOra`** [dal piano della
   disponibilità]. Dopo il Task 5 ne avrà uno (l'agenda), e l'obbligo `GUARDIE-TEMPO` si chiude al Task 2 con le
   prove — non con un chiamante.

8. **Spec originale §10.2 dice che la cancellazione arriva come `P0002`.** L11 della spec 3a lo dichiara superato:
   le funzioni nuove restituiscono gli esiti come **valori**, e `P0002` resta solo nella vecchia `move_visit`. Questo
   piano non tratta `P0002` in nessun punto, ed è voluto.

9. ⚠︎ **Reperto misurabile e non misurato: `appointment.updated_at` letto da PostgREST contro `app.versione()`.**
   Il Task 5 Passo 4 porta la prova che lo decide. Se le due stringhe differiscono, la scheda prende le versioni
   **solo** da `stato_visita`, e l'agenda non le usa mai per scrivere. **Non è stato misurato** perché scriverlo
   avrebbe voluto toccare il database.

---

## Punti deboli dichiarati

Al Task 7 del piano 3a-1, tre punti deboli dichiarati sono stati **smentiti** dalla misura e due sono diventati i
reperti principali. Questo elenco è andato ai due revisori del 28/09/2026, e sotto ciascuno c'è ora il loro verdetto.

⚠︎ **Bilancio del giro, scritto prima dell'elenco perché è la cosa che serve al prossimo revisore.** Dei dieci punti,
**sei confermati** (e tre di questi *peggiori* di come erano dichiarati), **uno smentito nel merito** (il 4: il
timore era infondato, e al suo posto c'era un rischio diverso che nessuno dei due aveva visto), **uno deciso dal
config** (il 7), **due non decidibili a lettura** (il 2 e il 9). Ma il dato che conta è un altro: **sette dei dodici
reperti bloccanti non stanno in questo elenco**. Dichiarare i dubbi non ha protetto dai difetti che non sospettavo —
`full_name`, `09:70`, le firme dell'imbracatura, `StatoVisita`, le chiusure nulle, il middleware, il numero di
generazione. Tutti e sette venivano dall'aver **assunto il codice invece di leggerlo**, ed è la lezione di questo
giro: un elenco di punti deboli è una mappa di ciò che so di non sapere, e i difetti veri stavano altrove.

1. ⚠︎ **Il Task 3 prova il database, non l'app, e lo so.** Le quattro prove dell'identità esercitano la sicurezza
   per riga sotto una sessione vera; **nessuna** di loro chiama `operatriceCorrente()` o attraversa il middleware.
   Tre delle quattro sonde sono dichiarate incerte per questo motivo. Se il revisore empirico misura che tutte e
   quattro danno **zero rosse**, il Task 3 è **scoperto** fino al Task 12 e va detto nel resoconto, non attenuato.

2. ⚠︎ **Non so se `sqlstateDi` legge il campo giusto.** Ho scritto che PostgREST mette lo SQLSTATE in `code`, e la
   regex `/^[0-9A-Z]{5}$/` lo distingue dai `PGRST…`. **Non l'ho misurato**: nessuna riga di questo repo chiama oggi
   PostgREST da JavaScript con un errore del database. Se `code` portasse invece un codice di PostgREST anche per gli
   errori SQL, **C2 cadrebbe in silenzio nel verso peggiore**: ogni errore diventerebbe `non_so`, e l'operatrice
   andrebbe a «Controlla» per transazioni certamente annullate. È la prima cosa che il revisore empirico dovrebbe
   misurare.

3. ⚠︎ **Il bilancio dei 10 s di D3-9 non l'ho calcolato, l'ho rimandato.** §4.3 passo 5 dice 1 s di
   `deadlock_timeout` per `40P01` e fino a 8 s per chiamata di `statement_timeout`: quattro tentativi che andassero
   ciascuno in `statement_timeout` costerebbero **32 s**, cioè tre volte i 10 s di D3-9. Le mie attese (50–600 ms)
   sono irrilevanti accanto a quel numero. **La politica dei ritentativi non ha un tetto di tempo complessivo**, e
   forse dovrebbe averlo: è la quinta decisione, elencata sotto.

4. ~~**La distinzione riga 2 / riga 3 la fa `ugualeAllaScheda`, e non so se il suo ingresso è confrontabile**~~ —
   **SMENTITO nel merito il 28/09/2026, e sostituito da un rischio diverso.** Il timore era che `stato_visita`
   restituisse `inizio` come `'120'` contro il `120` della scheda: è **falso**, perché `start_cell` e `cell_count`
   sono `smallint` (`0004_visit_appointment.sql:17-18`) e `jsonb_build_object` li rende **numeri JSON**.
   ⚠︎ Al loro posto la revisione ha trovato due disallineamenti **veri**, che non avevo visto: `stato.cliente` è un
   **uuid nudo** mentre `Scheda.cliente` è un **oggetto**, e `stato.visita` è la **versione** della visita, non il
   suo id — chi lo legge come id scrive `versioneVisita: null` e ogni salvataggio dopo un `modificata_altrove`
   rimbalza per sempre. Tutti e due stanno ora nel tipo `StatoVisita` (Task 7) con il commento che li dichiara, e
   hanno due prove e tre sonde. **È il punto debole che ha reso di più, e non perché avessi ragione: perché
   guardare dove indicavo ha fatto trovare altro.**

5. ⚠︎ **Non so se `componiBlocchi` e §9.1 dicono la stessa cosa su «stessa operatrice».** §9.1 dice «its
   appointments are contiguous **and share an operator**»; io ho scritto la contiguità come una relazione fra
   appuntamenti **consecutivi**, quindi tre appuntamenti A-B-C con A e C della stessa operatrice e B di un'altra
   danno tre blocchi. Mi sembra giusto, ma non è scritto da nessuna parte e non l'ho provato: **è un caso che le
   prove del Task 5 non contengono**, e dovrebbero.

6. ⚠︎ **Il Task 7 è il più grande e il meno specificato.** La scheda visita porta durate, accodamento, avvisi,
   conflitti, ricerca cliente, doppioni, D2-2, e l'intera macchina di `ugualeAllaScheda`. L'ho scritto come **un**
   task perché ha **un** deliverable testabile — una scheda che si compila —, ma se chi esegue lo trova troppo
   grande, la frattura naturale è fra **7a** (durate, accodamento, `scheda.ts`) e **7b** (avvisi, conflitti,
   cliente). Lo dichiaro invece di far finta che la stima regga.

7. ~~**Non so se `tests/app/` deve girare dentro `npm test`**~~ — **DECISO dal config, non da me.**
   `vitest.config.ts` non ha `include`, quindi il default `**/*.{test,spec}.?(c|m)[jt]s?(x)` prende già
   `tests/app/*.test.ts`; e `test:fuso` (`vitest run tests/dominio`) **non** li prende. Ci stanno, oggi, senza
   toccare niente. ⚠︎ Resta un costo che non avevo nemmeno nominato e che la revisione ha trovato: ogni passata fa
   **24 accessi veri** a GoTrue (misurato al Task 2 del piano 3a-1) contro un limite locale di **30**
   (`supabase/config.toml:206`). I file di `tests/app/` previsti sono **sei**, e ciascuno che accede si somma a quel
   conto. **Chi esegue riusa `sessioneDi()` invece di chiamare `accedi()` in ogni prova**, e misura il totale al
   Task 3.

8. ⚠︎ **Le mie stime di «rosse attese» sono tutte [da misurare], e diverse di quelle a 1 saranno sbagliate.** Al
   Task 5 del piano 3a-1 una revisione a lettura confermò «8 rosse» contandole, e la misura ne diede 9. Io non ho
   potuto contare nemmeno una volta. Chi esegue **scriva i numeri veri** e non provi a farli tornare.

9. ⚠︎ **Non ho verificato che Next 15 con React 19 e Vitest 2.1 convivano senza attrito.** `@testing-library/react`
   per React 19 vuole una versione recente, e `jsdom` per docblock (`// @vitest-environment jsdom`) funziona in
   Vitest 2 ma non l'ho eseguito. Se il Task 1 trova attrito, **è un reperto del Task 1**, non una svista da
   aggiustare in silenzio.

10. ⚠︎ **La striscia degli invii pendenti (D2-4) indebolisce «prima di tutto» di §4.4 punto 3, e l'utente lo sa.**
    Ma c'è un caso che nessuno dei due ha considerato: se alla riapertura c'è **un solo** invio pendente e il suo
    esito è la **riga 4** («È stata cancellata dopo il salvataggio», con «Crea di nuovo»), la striscia potrebbe
    restare non toccata per ore. Mi sembra accettabile e **non l'ho riproposto come decisione**; se il revisore lo
    trova grave, è una decisione da riaprire.

---

## Una quinta decisione, emersa dopo il blocco di domande

Non è stata chiesta perché è arrivata scrivendo il Task 4, dopo che il blocco era già partito. **Non è stata
presa**: è qui per l'orchestratrice.

> **I ritentativi su `40P01` devono avere un tetto di tempo complessivo?**
>
> §4.3 passo 5 dice «fino a 3 ritentativi» e basta. Con `statement_timeout = 8s`, quattro tentativi che andassero
> tutti in timeout costerebbero **32 s**, contro i **10 s** di D3-9: il telefono avrebbe già smesso di aspettare e
> mostrato «Non so», e la Server Action continuerebbe a ritentare per altri 22 s — scrivendo, alla fine, con lo
> stesso codice d'invio che «Controlla» potrebbe aver già bruciato. In quel caso l'invio tardivo riceve `annullato` e
> non scrive, quindi **non c'è danno ai dati**; c'è spreco, e un'operatrice che vede «Non risulta salvata» mentre il
> server sta ancora provando.
>
> - **(a)** Nessun tetto, come la spec dice alla lettera. Semplice, e il danno è solo lo spreco.
> - **(b)** Tetto a **7 s** dal tocco [proposta]: il ritentativo successivo non parte se il tempo è finito. Il
>   server smette quando il telefono smette. Costo: si può fare meno di 3 ritentativi, e §4.3 passo 5 va annotata.
> - **(c)** Tetto uguale ai 10 s di D3-9. Costo: la risposta arriva esattamente quando il telefono ha già smesso di
>   aspettarla, cioè il caso peggiore dei tre.

Fino alla risposta, il Task 4 implementa **(a)**, che è ciò che la spec dice alla lettera, e il Task 8 **misura** il
tempo vero: se il caso tipico sta nei 10 s, la domanda si chiude da sé.

---

## Autocontrollo del piano

**Copertura della spec 3a §3.1, voce per voce:**

| Voce di §3.1 | Task |
|---|---|
| Scheletro Next.js, manifesto, niente service worker, versione ≥ CVE-2025-29927, `allowedOrigins` | 1 |
| Accesso con email e password; «Esci» chiude solo questo telefono | 3 |
| Uscita forzata di un'operatrice disattivata; chiusura delle sessioni (D3-14, D3-17) | 3 (guscio), 12 (prova) |
| Navigazione a quattro voci; tre segnaposto; nessun «+» | 3 |
| Agenda a colonne, a lista, settimana per operatrice | 5, 6 |
| Scheda visita: creare, modificare, aggiungere e togliere servizi, cancellare con una conferma | 7, 8 |
| Trascinamento secondo D3-15 | 10 |
| Cercare la cliente o crearla, E.164, doppioni per nome simile | 7 — ⚠︎ **solo prosa**: una riga al Passo 5 e una dipendenza dichiarata, **nessuna prova**. La prima stesura la segnava coperta |
| ⚠︎ **Il selettore dei servizi di spec §8.1** (per categoria, ciò che l'operatrice fa, «mostra tutti i servizi») | ❌ **NON COPERTO**, e nessuna riga del piano lo nomina. Il database c'è (`service_category`, `operator_service`, `service.is_active`): manca il piano. Resta **aperto e dichiarato** |
| ⚠︎ **L'aggancio del tocco** (§5.1, e §8.1 lo elenca fra le prove pure) | ❌ **solo prosa** al Task 5. Le altre due voci della stessa riga di §8.1 sono coperte; questa no |
| Tutta la spec §10 — §10.1 conflitti, §10.2 versioni, §10.4 cancellazione, §10.5 ritentativi | 7, 4, 8, 4+8 |
| ⚠︎ **§10.3, il segnale periodico di connessione** | ❌ **NON COPERTO.** `src/app/api/battito/route.ts` compare solo nella tabella dei file e nell'elenco `Create` del Task 9: **zero passi, zero periodo, zero tempo limite, zero prove**. La prima stesura di questa tabella lo dichiarava coperto dal Task 9 — **falso**, e il Task 12 gli scrive perfino una prova Playwright («rete assente → striscione») contro una funzione che nessun task costruisce. Resta **aperto e dichiarato** |
| Aggiornamento in diretta | 11 |
| Dati di prova (§8.5) | le fixture esistenti, riusate; nessuna modifica |

**Copertura di §3.2, gli obblighi aperti che il 3a chiude:**

| Obbligo | Task | Prova |
|---|---|---|
| `RETRY-40P01` | 4 (politica), 8 (misura) | `tests/app/ritentativi-veri.test.ts` |
| `DATE-IMPOSSIBILI` | 2 (lettura), 8 (scrittura) | `tests/dominio/validazione.test.ts` |
| `GUARDIE-TEMPO` | 2 | `tests/dominio/validazione.test.ts` |
| `CONTORNO-CERCAPOSTI`, parte `decodificaFinestra` | 2 (validazione), 5 (collegamento) | `tests/dominio/validazione.test.ts` |
| `NODE-PIN` | 1 | `tests/app/contorno.test.ts` |
| `PERMESSI-FUNZIONI`, `MIGRAZIONE-SALTATA`, `OUTSIDER-WRITE` | **nessuno**: sono del piano 3a-1 (§8.2), non di questo | — |

**Scansione dei segnaposto.** ⚠︎ **La prima stesura di questa sezione era materialmente falsa**, e la revisione del
28/09/2026 l'ha smontata. Diceva: «restano **due** luoghi in cui il piano descrive invece di scrivere: i componenti
React». Non sono due, e non sono componenti. Il piano **descrive invece di scrivere** in questi luoghi, dichiarati
uno per uno:

| Dove | Che cosa manca | Chi lo scrive |
|---|---|---|
| `src/server/involucro.ts` | il corpo di `avvolgi` è letteralmente `{ … }` — ed è la funzione che porta **C2** | Task 8, primo passo |
| `src/dominio/esiti.ts` | nessun codice: solo «scrivi secondo la tabella di §4.1». ⚠︎ Ma le prove asseriscono **stringhe esatte**: chi implementa le copia dalle prove, carattere per carattere, apostrofi tipografici compresi | Task 4 |
| `src/dominio/controlla.ts` | nessun codice: due commenti e la forma dello `switch`. Porta **C1** | Task 9 |
| `src/dominio/blocchi.ts`, `scheda.ts`, `durate.ts`, `avvisi.ts`, `conflitti.ts`, `invii-pendenti.ts`, `scheda-viva.ts` | interfacce e regole, non corpi | Task 5, 7, 9 |
| Task 6, 10, 11 | nessun blocco di codice **e nessun blocco di prove**: solo tabelle in prosa | — |
| i componenti React dei Task 5, 6, 7, 10, 11 | regole, misure e prove, ma non il JSX | — |

Per i **componenti** è una scelta difendibile: il JSX di un'agenda a colonne non si scrive in un piano senza
inventare un'impaginazione che non è stata disegnata, e le bozze visive stanno in
`.superpowers/brainstorm/7081-1790078630/content/`, **non versionate** — chi esegue le guarda. Per i **moduli di
dominio** è un debito, e i due che portano C1 e C2 vanno scritti per esteso prima che quei task partano.

⚠︎ **Un traduttore che manca del tutto, e che nessuna riga del piano assegna:** §4.3 passi 5, 6 e 7 fissano **sei
frasi** per i sei SQLSTATE con un messaggio proprio, e §8.1 ne chiede la prova. `classifica` restituisce un booleano
`proprio`, **non un testo**; `messaggioPerEsito` traduce gli **esiti**, non i codici. Il testo nascerebbe dentro
`src/server/azioni-visita.ts`, cioè **fuori da `src/dominio/`** e fuori da `npm run test:fuso`, senza una sola prova
pura. Serve `messaggioPerSqlstate(sqlstate, nomeVincolo)` in `src/dominio/errori.ts`, con sei prove e la sonda «i due
rami di `23503` si fondono» — le due frasi di `23503` («La cliente è stata cancellata» contro «Il servizio o
l'operatrice non esiste più») si distinguono **solo** dal nome del vincolo. Assegnato al **Task 4**.

**Coerenza dei tipi.** ⚠︎⚠︎ **La prima stesura di questa sezione era un presidio finto, e il secondo giro di
revisione l'ha smontata.** Elencava otto tipi e ne affermava la coerenza: erano gli otto **definiti**. Taceva su
**otto tipi usati nelle firme e mai definiti da nessuna riga** — `ServizioInScheda`, `ClienteScelta`,
`ClienteNuova`, `SchedaSerializzata`, `MessaggioSpostamento`, `MessaggioAnnulla`, `OperatriceInColonna`,
`Settimana`. È la tecnica per cui `StatoVisita` era sopravvissuto al primo giro: **un inventario che elenca ciò che
c'è non trova mai ciò che manca**.

**La regola, per chi rivede questa sezione in futuro:** si parte dai tipi **usati** — `grep` sulle `Interfaces` di
tutti i task — e per ciascuno si cerca la definizione. Mai il contrario.

Tutti e otto sono ora definiti (Task 3, 5, 6, 7, 10), e `ServizioInScheda` in particolare porta il campo
`operatriceId` non nullabile da cui dipende D2-2. Con `StatoVisita` della revisione 2, la famiglia è chiusa:
**nove tipi, tre bloccanti**.

`Atteso`, `Esito`, `EsitoInvio`, `RispostaControlla`, `Scheda`, `StatoVisita`, `AppuntamentoLetto`, `BloccoAgenda`
compaiono con lo stesso nome e la stessa forma in ogni task che li nomina.
⚠︎ **`StatoVisita` è ora definito per davvero**, in `src/dominio/stato-visita.ts` (Task 7), trascritto da
`0016_salva_visita.sql:46-58`. La prima stesura affermava qui che «è definita al Task 7» e il Task 7 la **usava**
soltanto: non esisteva in nessuna delle 3377 righe. Era il tipo che regge la distinzione riga 2 / riga 3, cioè **C1**.

⚠︎ **`Esito` e `EsitoInvio` hanno gli stessi otto membri con due nomi diversi**, in due moduli. Non è un difetto —
`EsitoInvio` è ciò che `invio.esito` può contenere, `Esito` è ciò che una funzione di scrittura restituisce, e oggi
coincidono — ma va **dichiarato** invece di lasciarlo scoprire: chi esegue definisca `EsitoInvio` come alias di
`Esito` e scriva perché i due nomi restano.

---

## Che cosa NON è in questo piano

- **Nessuna migrazione.** Se ne serve una, si ferma il task.
- **Il cercaposti**, i **clienti** (compresa la modifica di una cliente) e i **compleanni**: 3b.
- **Disponibilità**, **restringimento**, **impostazioni**, **primo avvio**, **verifiche prima del rilascio**,
  **procedura «telefono perso»**: 3c.
- **Dati personali** (spec §11), la **pastiglia** su Impostazioni, l'**esportazione**: piano 4.
- **Il «+»** fluttuante e la pagina del cercaposti: **3b**, per **D3b-13** (spec 3b revisione 2, `69f5dd5`), che
  chiude un buco di confine fra tre piani. `src/cliente/agenda-colonne.tsx` è l'unico file di questo piano che il 3b
  tocca: **nessun segnaposto**, e coordinamento su quel file all'esecuzione.
- **Lo scambio fra operatrici** (`swap_appointment_operators`): non esposto, per decisione di §3.3.
- **La revoca di `move_visit`** e l'audit su `pg_proc.proacl`: Task 9 del piano 3a-1.

---

## Esecuzione del Task 1

**5 ottobre 2026.** Next 15.5.27, React 19.3; prova del contorno scritta come da Passo 2. **Passo 3:** 7 rosse e 1
verde, non 8: la prova su Node è già verde perché il Passo 1 ha scritto `.nvmrc` ed `engines` e `ci.yml` porta 22.
**Gate:** `db reset` 0; `vitest run` **465 verdi su 30 file** (erano 457); `test:fuso` 96 verdi; `tsc` 0; `build` 0.
**Passo 7:** `curl` su `/pagina-di-prova` in `next dev` → **200**, CSP con `'nonce-…'` e `'strict-dynamic'`,
`connect-src` su `http://127.0.0.1:54321`, nessun `*.supabase.co`; 14 script su 14 portano il nonce, zero `<style>`
in linea (`next/font` passa da un foglio collegato: `style-src 'self'` regge). In `next start` la pagina si idrata.
**Sonda 5b** (`next.config.ts` vuoto): **1 rossa**, «porta le altre intestazioni di §4.9», che è positiva; l'asserzione
aggiuntiva non serve. Ripristino da copia, suite di nuovo 465 verdi.

Divergenze dal testo:
- I commenti del piano in `next.config.ts` e `layout.tsx` contenevano `allowedOrigins` e `maximumScale`: le prove li
  trovavano (2 rosse). Riformulati senza il nome letterale.
- Il piano non dà il corpo di `middleware()`: scritto con `btoa(crypto.randomUUID())` e la CSP anche sulla richiesta.
- `export const dynamic = 'force-dynamic'` nel layout: una pagina prerenderizzata esce senza nonce e `'strict-dynamic'`
  blocca ogni script. Il Task 3 renderà dinamiche le pagine con i cookie.
- ⚠︎ In `next dev` la pagina non si idratava (React Refresh usa `eval`): chiuso nella revisione, vedi sotto.
- `supabase-js` fra le dipendenze; `@types/node` a `^22`; `tsconfig.json` con le quattro opzioni che Next aggiunge;
  `.gitignore` con `*.tsbuildinfo` e `next-env.d.ts`; `.env.local.esempio` committato, che il Passo 9 non nomina.

**Revisione del Task 1** (un revisore, 05/10/2026): nessun bloccante. Corretti, su decisione dell'utente:
- La CSP passa in `src/server/csp.ts`, con il ramo di sviluppo (`'unsafe-eval'` sugli script, `'unsafe-inline'` sugli
  stili, per React Refresh e l'overlay degli errori). Le prove la **valutano** in produzione (niente `unsafe-`) e in
  sviluppo (controprova), chiamano il middleware (CSP e nonce sulla risposta) e controllano il matcher. Prove: 8 → 11.
- Prova dello zoom estesa a `userScalable`; `engines` asserito come `'>=22 <23'` intero (`'>=220'` passava).
- Il commento «pigra» era falso: `NEXT_PUBLIC_SUPABASE_URL` si fissa **al build**; corretto, e l'avviso esce una volta.
- Mutazioni misurate, 1 rossa ciascuna sulla prova attesa: CSP tolta dalla risposta, matcher su nessuna rotta, ramo di
  sviluppo sempre acceso, `userScalable: false`, `engines` `'>=220'`. `next dev` ora si idrata; `next start` manda la
  CSP senza deroghe.

Annotati per la fase 2:
- `style-src 'self'` toglie lo stile alla 404 di Next e a ogni `style="…"` nell'HTML dal server: quando morde, nonce
  anche su `style-src`, mai `unsafe-inline` in produzione.
- Il matcher è provato come espressione regolare, mentre Next lo legge con `path-to-regexp`: equivalenti su questa forma.
- Del Passo 8 sono state misurate la 5b e le cinque qui sopra; le sonde 1, 2, 3, 3b, 3c, 4, 5, 6 e 7 non sono state rifatte.
- Il gate locale gira su Node 24: npm non fa rispettare `engines`, quindi NODE-PIN vale solo in CI.
- Playwright e axe (Task 12) vanno fatti girare su `build` + `start`, mai su `dev`, dove la CSP ha le deroghe.

## Esecuzione del Task 3

**5 ottobre 2026, `ef0583c`.** `operatriceCorrente`, identità nel middleware (tre esiti di §4.7), accesso (D2-3), guscio
con «Esci» `local`, navigazione a quattro voci, segnaposto; via `pagina-di-prova`, logo in `public/`. **Gate:** 485 verdi
su 31 file, `test:fuso` 96, `tsc` e `build` 0. **`curl` in `next start`:** `/accesso` 200 con il nonce su 10 script su 10;
`/agenda` con la sessione di Vera 200 e 12 su 12; senza cookie `/agenda` e `/accessorio` → 307 su `/accesso`.
**Letture d'identità: 4 per pagina** (middleware e guscio), ~50 ms in locale. Sonde 1-9 misurate, ciascuna ≥ 1 rossa.
Divergenze: il middleware **si prova da Vitest** (sonde 4, 5, 8 con vittima); il nonce si ricostruisce sulla richiesta a
ogni `next()`; `page.tsx` (`/` → `/agenda`), `accesso/modulo.tsx`, `(salone)/azioni.ts`, tre `.module.css`; logo in
`<img>`, perché `next/image` scrive uno `style` che la CSP blocca. La disattivata con la sessione **già aperta** dà
`NonAutenticata` (D3-17 chiude la sessione); quella che **accede dopo** la disattivazione dà `NonOperatrice`.
Frasi decise dall'utente: «Questo account non è attivo. Chiedi a chi gestisce il salone.» e, per un guasto o un 429
all'accesso, «Il servizio non risponde. Riprova tra qualche istante.» ⚠︎ **Task 12:** Playwright con la frase nuova.

**Revisione del Task 3** (due revisori, 05/10/2026): nessun bloccante. Il reperto più grave — cookie rinnovati persi sul
503, poi riuso del refresh token consumato — è **misurato innocuo**: GoTrue riaccetta il token vecchio dopo 11,5 s. Corretti:
- 503 e redirect portano i cookie di `setAll`; «fuori» fa `signOut({ scope: 'local' })`, quindi esce davvero da questo
  telefono (`curl`: `set-cookie: sb-127-auth-token=; Max-Age=0`). Il 429 è un guasto (`src/server/gotrue.ts`, regola
  unica). «Entra» chiude la sessione anche su un guasto dopo il login.
- Prove nuove: `tests/app/accesso.test.ts` chiama «Entra» e il guscio con `next/headers` simulato; in `identita` guasti
  finti di PostgREST e GoTrue, token scaduto, cookie sul 503 e sul redirect, ogni `signOut` `local`, `force-dynamic`,
  `aria-current`. Vitest con `jsx: 'automatic'`. Gate: **504 verdi su 32 file**, `test:fuso` 96, `tsc`, `build` 0.
- 15 mutazioni, tutte con ≥ 1 rossa: le 11 della revisione che davano 0 (guscio senza `operatriceCorrente`, `signOut()`
  senza argomento, «Entra» senza `signOut`, i quattro guasti scambiati per «fuori», `setAll` muto, errori di «Entra»,
  `aria-current`, `force-dynamic`) e 4 sulle correzioni.

Fase 2: le Server Actions non passano dal middleware e si proteggono da sole (involucro del Task 4); il matcher salta
ogni percorso in `.png/.svg/.webp`; due copie della regola d'identità e 4 letture per pagina; un PostgREST giù costa
~7 s di ritentativi prima del 503; dopo un errore il modulo d'accesso si svuota (React 19).

## Esecuzione del Task 4

**5 ottobre 2026.** `errori.ts`, `esiti.ts`, `ritentativi.ts`, `attesi.ts` in `src/dominio/`, senza import di `next`,
`@supabase/*` o `node:*`; cinque file di prove. Prove viste rosse (modulo mancante) prima del codice. **Gate:** `db reset` 0;
`vitest run` **552 verdi su 37 file** (erano 504); `test:fuso` **144** (erano 96); `tsc` 0; `build` 0.
**Sonde del Passo 11**, copia di scorta e ripristino dalla copia, rosse misurate su `tests/dominio`:
1 → **4** · 2, 3, 4, 5, 6, 6b, 6c → 1 · 7 → 2 · 7b, 7c, 8 → 1 · 9 → 2 · 10 → 3 · 10b → 1 · 11 → 2 · 12, 13, 14 → 1 ·
15 → 2 · 18 → 1 (gemella). Frasi nuove: 23514 → generica 1, 42501 → generica 1, tutte e due su «23514 e 42501 hanno le loro frasi».
**16** (`localeCompare`) → 0: misurato che nessun uuid minuscolo separa le due regole (tutte le coppie che differiscono
in un carattere, in ogni posizione, più 10⁶ coppie casuali: 1.008.192 confronti, 0 diversi). Dichiarato.
**17**, misurata riscrivendo (`sort` sul posto prima di `map`) invece di dichiararla equivalente: dava **0**, perché le
prove precedenti ordinavano `STATO` sul posto prima che «non modifica l elenco» lo fotografasse. Corretta la prova:
`STATO` congelato e un ingresso fresco decrescente → **4**.

Divergenze dal testo:
- Le due frasi decise il 05/10 con l'apostrofo tipografico (`L’orario`), come le altre frasi del piano.
- `messaggioPerSqlstate`: un `23503` o `23505` su un vincolo che nessun ramo nomina dà la frase generica, non `''`;
  le chiavi primarie sono `visit_pkey`, `appointment_pkey` e `client_pkey`. Una prova in più.
- `messaggioPerEsito` con `accountChiuso` dà per **ogni** esito la frase del Task 3 per l'account non attivo, senza ✓ e
  senza adottare lo stato (§4.3 passo 7: un `modificata_altrove` con l'account chiuso porta uno stato vuoto). La sonda 9
  è adattata a questa forma. `ricaricaIlGiorno` è vero per `cancellata_altrove`, `gia_cancellata` e `non_trovata`
  **[proposta]**; `modificata_altrove` ha il testo vuoto (§4.1 non dà una frase). Tre prove in più, gemella compresa.
- Nessun campo nuovo per il comportamento di 23514 e 42501: lo esegue il Task 8 a partire dal codice.
- `niente-date.test.ts` nella forma del Passo 11, con il percorso risolto da `import.meta.url`.
- Quinta decisione aperta: `scadenzaMs = Infinity`, presidiata dalla 10b.
