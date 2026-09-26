# Prompt per la chat che eseguirà il Task 7 del piano 3a-1

Sei l'esecutrice del **Task 7** del piano 3a-1 del progetto `salon-scheduler` (agenda per il centro estetico AVStyle).
Lavori in `/Users/nadiaottavi/Desktop/Git/salon-scheduler`, ramo `main`.

## Controllo d'ingresso — prima di qualunque cosa

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
git merge-base --is-ancestor c8cba5c21171ce016e8be9bedf496f1ede8bff31 HEAD \
  && echo "storia lineare" || echo "STORIA RISCRITTA — questo prompt è invalido"
git diff --stat c8cba5c..HEAD -- supabase tests src
git status --short
git branch --show-current
git log --oneline -1 origin/main
```

Atteso, una riga per comando:

* il primo stampa `storia lineare`: il commit che porta le due ipotesi misurate del Task 6 è ancora nella storia di
  questo ramo. È «docs(3a-1): le due ipotesi rimaste del Task 6, ora misurate», e `git log --oneline -1 c8cba5c` lo
  conferma;
* il secondo **non stampa niente**: dopo la fine del Task 6 nessuno ha toccato `supabase/`, `tests/` o `src/`. Se
  stampa qualcosa, qualcuno ha lavorato sul codice dopo di me e questo prompt è vecchio;
* il terzo non stampa niente tranne `?? .superpowers/` e i **due** file più vecchi sotto `docs/handoffs/` (datati
  2026-09-18 e 2026-09-22), che sono preesistenti e non si toccano;
* il quarto stampa `main`;
* il quinto: ⚠︎ **il ramo è avanti di quattro commit sul remoto** (`3182cd6`, `d894f57`, `737d9bc`, `c8cba5c`, più il
  commit che introduce questo file). `origin/main` dovrebbe essere a `1173eb3` o più avanti se nel frattempo l'utente
  ha pushato. Se è **più avanti di HEAD**, qualcuno ha pushato o resettato: fermati.

Il controllo non nomina l'ultimo commit apposta: il commit che introduce questo file sposterebbe HEAD e renderebbe il
controllo impossibile da superare. Il SHA è scritto per esteso perché nel prompt del Task 2 un segnaposto era costato
un commit di correzione.

⚠︎ **Il repo è PUBBLICO** (`github.com/Unichess64/AVSTYLE`). Fai `git pull` prima di cominciare. `git push` **mai** di
tua iniziativa: lo decide l'utente, ed è un'azione su un repo pubblico.

Se una qualunque riga diverge, fermati e dillo: non eseguire il Passo 1 e non proporre alternative finché non ti
rispondono.

## ⚠︎⚠︎ DUE DECISIONI CHE NON SONO TUE, E CHE VANNO PRESE PRIMA DI SCRIVERE `0018`

Non sono difetti da correggere né dettagli da interpretare: sono due punti su cui il Task 6 si è fermato apposta,
lasciandoli all'utente. **Portali all'utente nel tuo primo messaggio, prima del Passo 1**, e non proseguire oltre il
Passo 1 finché non rispondono. Stanno per esteso nell'appendice del Task 6.

### Decisione A — le sei righe di §4.4 non coprono due esiti che ORA esistono

È il reperto su cui le due revisioni avversariali del Task 6 sono convergute **da lati diversi**, ed è quello che ti
riguarda più di ogni altra cosa: **tu codifichi quelle righe come `riga: 1..6`.**

`cancella_visita` (Task 6) immette in `invio` due esiti che prima non esistevano, **`cancellata`** e
**`gia_cancellata`**, e la tabella delle sei righe di spec §4.4 non ne copre nessuno:

* le righe **2-5** pretendono tutte `esito = 'salvata'`;
* la riga **6** è «un esito che **non** ha scritto», e ne elenca quattro (`esiste_gia`, `modificata_altrove`,
  `cancellata_altrove`, `non_trovata`). **`cancellata` HA scritto**, e `gia_cancellata` non è nell'elenco.

La prosa di §4.4 li tratta, ma in un capoverso separato («**«Elimina visita»** incerta») che la tabella non nomina. Le
due strade sono: **una riga 7** («esito `cancellata` → ✓ Risulta cancellata»), oppure **allargare la riga 6** a
`gia_cancellata` e trattare `cancellata` come le righe 2/3 sul «è ancora lì?». **Proponi, non decidere.** Chiuderlo
dopo vuol dire scoprirlo con l'interfaccia già scritta.

### Decisione B — il ramo `if v_stato is null` non è in `0017`, ed è MISURATO

`0016:171-177` degrada un `modificata_altrove` con `stato` non leggibile a `non_trovata`/`cancellata_altrove`; le due
funzioni del Task 6 non hanno quel ramo. Misurato il 26/09/2026 su banco usa e getta, **stesso istante, stessa forma**
(guardiano che blocca un appuntamento, operatrice disattivata mentre la funzione è in coda):

| funzione | esito | `stato` |
|---|---|---|
| `salva_visita` | **`non_trovata`** | assente |
| `sposta_visita_a` | **`modificata_altrove`** | **`null`** |
| `cancella_visita` | **`modificata_altrove`** | **`null`** |

⚠︎ **Ti riguarda direttamente:** quell'esito finisce in `invio`, e `invio.esito` è **l'ingresso su cui tu decidi la
riga**. Un `modificata_altrove` registrato dove la gemella registrerebbe `non_trovata` ti manda sulla riga 6 invece
che sulla 5. Il rimedio è copiare il ramo di `0016:171-177` in tutti e due i punti di `0017` (righe 67 e 173) con la
prova che lo pianta — ma **è una modifica al Task 6, non al tuo**: proponila, non farla.

## Che cosa leggere, prima di toccare qualunque cosa

1. `docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` — l'intestazione, i «Vincoli globali», la
   «Struttura dei file» e tutto il **Task 7** (da `### Task 7` fino a dove comincia `### Task 8`). I vincoli globali
   valgono anche se il task non li ripete. ⚠︎ In testa al Task 7, **prima** dei «Files», c'è un blocco
   `⚠⚠ public.stato_visita è stable, e §4.4 vieta qui le funzioni stable`: è la cosa più importante che leggerai oggi,
   e decide la forma della tua funzione.
2. Dello stesso file, l'appendice **«Esecuzione del Task 6 e revisione (25 settembre 2026)»**, in fondo. Dice che cosa
   il Task 6 ti ha lasciato, i **dieci** reperti aperti con il danno misurato, e **quattro punti deboli dichiarati che
   la misura ha smentito** — quell'ultimo elenco vale quanto i reperti.
3. Subito prima, le appendici dei Task 5, 4, 3 e 2: contengono le trappole di processo, di cui **due sono FALSE** e
   segnate come tali (vedi sotto).
4. `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md` (ora **revisione 17**): **§4.4 per intero** — è il
   tuo contratto, tabella delle sei righe compresa — più §4.1 (le regole 0-11 e il contratto di `p_attesi`), §4.3
   passo 7 e **passo 8** (⚠︎ riscritto alla revisione 16: vedi sotto), §4.2, e le decisioni D3-9, D3-18, D3-21.
5. `tests/helpers/db.ts`, `tests/helpers/sessioni.ts`, `tests/helpers/fixtures.ts`.
6. `tests/schema/salva-visita.test.ts` (31 prove) e `tests/schema/sposta-e-cancella.test.ts` (22 prove). Del secondo
   guarda in particolare le **due prove che leggono `invio.esito`**: sono il presidio nato apposta per te.
7. `supabase/migrations/0013_invii_e_cancellate.sql` per intero — `invio`, `visita_cancellata`, `app.versione`,
   `app.apri_invio`, `app.chiudi_invio`, il trigger delle cancellate: è la migrazione che consumi di più. Più
   `0016_salva_visita.sql` (il commento di testa di `stato_visita` ha i **due vincoli** che ti riguardano) e
   `0017_sposta_e_cancella.sql`.

Dichiara all'inizio quali di questi hai letto.

## Che cosa fare

I **sei passi** del Task 7, in ordine, uno alla volta, spuntando le caselle `- [ ]` nel file del piano man mano che li
chiudi. Il piano contiene il testo completo delle prove e della migrazione: **si trascrive, non si reinventa**. Se una
riga del piano non funziona, fermati e dillo: non aggiustarla di tua iniziativa. *(Ai Task 4, 5 e 6 questa regola ha
pagato tre volte: `asOperator` prescritto per due prove che rileggono da un'altra connessione, una verde e muta; il
rimedio della sonda 3 del Task 5 che **non funzionava**; e al Task 6 il numero «cinque ritorni anticipati», che sono
tre.)*

Il task tocca due file nuovi:

* crea `supabase/migrations/0018_controlla_invio.sql` (`public.controlla_invio`, `app.apri_invio_come_annullato`)
* crea `tests/schema/controlla-invio.test.ts`

più le prove che il Passo 5 ti farà aggiungere (la sonda 4 ne chiede una esplicitamente) e quelle sui permessi delle
funzioni nuove. **Dichiara file per file** quello che tocchi oltre ai due nuovi. Non anticipare il Task 8 (`annuncio`)
né il Task 9.

## ⚠︎ Le sette cose che ti faranno perdere tempo se non le leggi ora

### 1. Il registro degli invii ha un lettore da ieri, e quel lettore sei tu

Fino al Task 6 **nessuna prova leggeva `invio.esito`**: falsificare ciò che le funzioni di scrittura *registrano*,
lasciando giusto ciò che *restituiscono*, dava **0 rosse su 369** in tre forme diverse. La remediation del Task 6 ha
aggiunto due prove che lo leggono, e ora ognuna di quelle tre mutazioni dà **1 rossa**.

⚠︎ **Ma tu sei il consumatore vero**, e la cosa ti riguarda al contrario: ogni tua prova che asserisce una `riga` sta
implicitamente asserendo che `invio.esito` sia quello giusto. Quando una tua prova arrossisce, chiediti **sempre** se
il difetto è nella tua funzione o in ciò che una funzione di scrittura ha registrato.

### 2. `stato_visita` è `stable`, e §4.4 te la vieta — tranne in un modo

Sta in testa al Task 7 per esteso e nel commento di `0016`. Il minimo: la chiami in un'**istruzione propria, dopo**
l'attesa sul codice d'invio. Mai nella stessa istruzione dell'`insert into invio`, mai in una CTE con esso. Una
funzione `stable` prende la fotografia all'inizio dell'**istruzione** che la chiama, non della transazione: in
un'istruzione successiva vede il commit che ha appena atteso, nella stessa no.

⚠︎ **E c'è una trappola di lettura:** `0017` chiama `stato_visita` **due volte senza una riga di commento** che
rimandi a questo vincolo. La sua forma è corretta **per accidente**, e se copi da lì copi una regola che non c'è.
Copia da `0016`, dove il vincolo è scritto (reperto 3 dell'appendice del Task 6).

### 3. Il contratto degli errori è per PROPRIETÀ, dalla revisione 16 — non riaprire la lacuna

§4.3 passo 8 **non enumera più** i codici che provano l'annullamento: era quella la forma sbagliata, perché ogni
funzione nuova che ne sollevasse uno fuori elenco allargava la lacuna in silenzio. Il criterio è ora: **un errore che
arriva con un SQLSTATE prova l'annullamento**, perché in PostgreSQL un errore porta la transazione in stato abortito e
il COMMIT diventa ROLLBACK — e vale anche per un errore sollevato **dal commit** su un vincolo differito. Non prova
nulla solo ciò che accade **fuori** dal database: rete, tempo scaduto della piattaforma, risposta persa dopo un COMMIT
riuscito, errore di PostgREST senza SQLSTATE. I sei codici (`40P01`, `57014`, `23505`, `23503`, `23514`, `42501`)
restano come elenco di quelli che meritano un **messaggio proprio**.

**Che cosa cambia per te:** i codici che `controlla_invio` solleva sono **già coperti**, qualunque siano, e non devi
aggiungerli a nessun elenco né segnalarli come lacuna. Se però sollevi un codice **di dominio** che merita un
messaggio proprio all'operatrice, quello va scritto in §4.3: **proponilo, non aggiungerlo da sola**.

⚠︎ Il censimento misurato dei codici raggiungibili fuori dai sei è a **quattro**: `22023`, `22P02`, `23502` e — dal
26/09/2026 — **`22003`**. `P0003` **non è raggiungibile dall'app** (servirebbe una chiamata diretta a `app.*`, e
`config.toml` non espone quello schema a PostgREST): la revisione a secco del Task 5 l'aveva dedotto raggiungibile **a
lettura**, e la misura l'ha smentita. È il precedente da tenere in mente su ogni lettura che farai.

### 4. `asOperator` ANNULLA. Ogni prova che scrive e poi rilegge da fuori ha bisogno di `asOperatorCommit`

`inRole` chiude **sempre** con un `rollback` (`tests/helpers/db.ts`). Il tuo task incatena invii e riletture da
connessioni diverse quasi in ogni prova. Il Passo 1 usa già `asOperatorCommit` nei suoi due aiuti: controlla **uno per
uno** che lo usi dove serve, e dove dice `asOperator` chiediti se quella prova rilegge da fuori. Al Task 4 una prova
così era **verde e MUTA**.

⚠︎ **E le asserzioni di stato messe DOPO un rollback sono inerti.** Misurato al Task 5: sette asserzioni «non ha
scritto niente» rileggevano ciò che il setup aveva committato; tolte tutte e sette, la suite restava verde. Spostarle
dentro la callback **non** le salva, perché l'atomicità è una proprietà del motore e non del codice consegnato. La
forma che morde asserisce ciò che il **codice** decide.

### 5. Le due prove di concorrenza devono DURARE, e il piano te lo chiede

Il Passo 4 dice che la prova **(b)** e la **(b bis)** devono durare **circa mezzo secondo**: se finiscono subito,
«Controlla» non sta aspettando e il meccanismo non regge. **Scrivi nel resoconto la durata misurata**, non «sembrava
lenta».

Per aspettare una condizione e non un tempo, copia `attendiBlocco` da `salva-visita.test.ts` o da
`sposta-e-cancella.test.ts`: il margine misurato al Task 6 è **4-5 ms contro 5000**, cioè ~1000×. Un `setTimeout`
fisso rende rosse le prove di concorrenza su macchina lenta, senza che ci sia un difetto sotto.

### 6. La sonda 5 è dichiarata senza vittime, e il piano spiega perché — non inventarle una vittima

`on conflict do nothing` → blocco `exception when unique_violation` in `app.apri_invio_come_annullato`: **nessuna
prova arrossisce**, ed è riverificato su banco. In `read committed`, il livello che questo piano fissa, le due
varianti danno lo stesso risultato. La differenza si vede solo in `repeatable read`, dove la variante `on conflict`
aborta con `40001` e quella con `exception` restituisce **`null` in silenzio**. A tenere in piedi la riga è la prova
di catalogo del **Task 9** sull'isolamento. **Dichiarala senza vittime e spiega che cosa farebbe in produzione** —
«senza vittime» è una misura, «equivalente» è una tesi da argomentare.

### 7. Il `grant execute … to authenticated` è ridondante: la riga che porta è il `revoke`

Misurato ai Task 4, 5 e 6, e vale per **tutte** le funzioni di questo repo: in `public` c'è un
`alter default privileges` di Supabase — da **due** concedenti, `postgres` e `supabase_admin` — che concede `EXECUTE`
ad `anon`, `authenticated` e `service_role` su ogni funzione nuova. Conseguenze:

* togliere il `grant … to authenticated` dà **0 rosse** ed è **equivalente**: non scriverlo in tabella come mutismo;
* la riga che porta è **`revoke execute … from public, anon`**;
* **non esiste nessun audit permanente su `pg_proc.proacl`**: `catalogue-audit.test.ts` enumera `pg_class.relacl` e
  filtra le funzioni su `prosecdef`. ⚠︎ `controlla_invio` è `invoker` e **nessun audit la vedrà**;
  `app.apri_invio_come_annullato` è `definer` e va guardata come le sue sorelle di `0013`. Scrivi le asserzioni a mano
  per nome di ruolo (`anon`, `public`, `authenticated`) **con la gemella positiva accanto**, come fanno le quattro
  prove del describe `permessi delle due funzioni nuove` in `salva-visita.test.ts` e in `sposta-e-cancella.test.ts`.
  Lo stringimento dell'audit è del **Task 9**: se ti sembra che valga la pena anticiparlo, **proponilo, non farlo**.

## Vincoli che non si negoziano

* ⛔ **Mai `psql`**: non è installato, e da proprietario scavalcherebbe la sicurezza per riga dando misure false in
  silenzio. Ogni misura si prende con uno script Node che usa `pg`. Se lo script sta fuori dal progetto, importa `pg`
  per path assoluto (`/Users/nadiaottavi/Desktop/Git/salon-scheduler/node_modules/pg/lib/index.js`): altrimenti esce
  con `Cannot find package 'pg'` e sembra un blocco del database.
* ⛔ **`supabase/seed.sql` non si tocca, mai**: `[db.seed]` è attivo e un `db reset --linked` lo eseguirebbe contro il
  progetto ospitato. I quattro utenti `@example.test` restano — deciso in spec §8.5 — e la tua imbracatura ne dipende.
* ⛔ **`git push` mai**, per nessun motivo: il repo è pubblico e il push lo decide l'utente. Il commit del Passo 6 sì.
* ⛔ **Non lasciare mai file in stage fra due comandi**: l'indice di git è condiviso, e fra `git add` e `git commit`
  chiunque committi si porta via il tuo lavoro. I due comandi si fanno **insieme**, in un comando solo.
* **Italiano** in prosa, commenti, nomi delle prove e messaggio di commit.
* **Migrazioni:** solo cifre nel prefisso, e il numero dev'essere libero sul disco **e** non rivendicato da un task
  successivo. **`0018` è il tuo, ed è libero** (verificato il 26/09/2026: sul disco si arriva a `0017`).
* **Ogni funzione nuova:** `search_path = ''` e ogni riferimento qualificato per schema; `security invoker` salvo dove
  il piano dice `definer`; `revoke execute … from public, anon` e `grant execute … to authenticated` nella stessa
  migrazione. Nessuna funzione imposta `default_transaction_isolation`.
* **Le versioni delle righe viaggiano come testo** prodotto da `app.versione()`, mai come `timestamptz` convertito in
  JavaScript: un `Date` tronca i microsecondi e produce falsi conflitti (spec §10.2).
* **Ogni prova che asserisce un vuoto** deve avere accanto una prova positiva che la renda capace di fallire.
* **Dati non degeneri** nelle prove: più di un servizio, più di un'operatrice, pause diverse da zero, due date.
* Dopo ogni modifica alle migrazioni: `npx supabase db reset`, e controlla che **non** compaia nessuna riga
  `Skipping migration`. Un prefisso non numerico la fa saltare in silenzio.
* ⚠︎ `db reset` **non** applica le modifiche a `config.toml` al GoTrue: lo riavvia, non lo ricrea, e le variabili
  d'ambiente si fissano alla creazione. Serve `npx supabase stop && npx supabase start`.
* **Il gate si esegue in serie**, con l'output vero incollato nel resoconto: `npx supabase db reset`, `npm test`,
  `npm run test:fuso`, `npx tsc --noEmit`.
* **Le sonde di mutazione si eseguono davvero**: si applica la mutazione, si lancia, si verifica che sia rossa, si
  ripristina, si rilancia e si verifica che sia di nuovo verde. Una sonda «ragionata» non vale. Il Passo 5 ne elenca
  **sei**; se una non fa vittime, dichiaralo e di' che cosa farebbe davvero in produzione.
* Se Docker non risponde: `open -a OrbStack`, ~30 s, poi `npx supabase start`.

## Le trappole misurate prima di te — non ripeterle

1. **Mai due suite sullo stesso database.** Due `npm test` insieme danno 110-114 prove rosse con `duplicate key value
   violates unique constraint` dentro `seedFixture`, e una suite ferma oltre dieci minuti. Sintomo diagnostico: se
   **nessun** file di prova completa, non è il codice. ⚠︎ `pgrep -f vitest` è troppo largo: nel Task 2 ha dato tre
   falsi positivi su processi di `chessbooking`, un altro progetto della stessa macchina. Usa
   `pgrep -fl vitest | grep salon-scheduler`.
2. ⚠︎ **Il ripristino di un file NON ripristina il database.** Ripresa in flagrante **tre volte**, l'ultima al Task 6:
   file ripristinato e verificato per `shasum`, due prove rosse, e la mutazione era ancora viva nel database. Dopo
   aver rimesso a posto una migrazione serve un `db reset` **prima** di rimisurare. E per un file **non tracciato** il
   ripristino si fa da una **copia di scorta**, non con `git checkout --`, che lo cancellerebbe.
3. **Una sonda su codice con stato residuo nel database si misura dopo un `db reset`.** Nel Task 2 una mutazione
   appariva innocua solo perché le righe della passata precedente erano ancora lì.
4. **Una mutazione che rompe il `beforeEach` dà prove SALTATE, non rosse**: restringila al ramo della sola prova
   bersaglio, e dichiara che l'hai ristretta. ⚠︎ E una mutazione può essere **sovradeterminata**: al Task 5 una sonda
   nella forma letterale del piano dava 9 rosse di cui 8 collaterali. Se una sonda fa più vittime di quella nominata,
   guarda il **messaggio** di ciascuna rossa e riporta **entrambi** i numeri — al Task 6 una sonda ne faceva 5, e la
   tesi «sono tutte lo stesso percorso» era vera per tre e **falsa per una**, che era setup.
5. **Attenzione al profilo.** Chiediti sempre con quale profilo gira la prova. Una prova che gira da `asOwner` non vede
   né la sicurezza per riga né la chiusura immediata, perché il proprietario le scavalca. Nel Task 1 cinque prove
   giravano tutte da `asOwner` e non potevano accorgersi della perdita del `security definer`.
6. **Un censimento si fa con una spia, non con un `grep`.** Misurato nel Task 3: la regex dava **18** prove dove la
   spia ne dava **98**, perché perde ogni prova che passa per un aiuto del file.
7. **Un irrobustimento standard può disarmare il presidio.** Al Task 4 asserire la precondizione dentro una prova l'ha
   resa sovradeterminata e ha fatto **scendere** le rosse da 2 a 1. Al Task 5 lo stesso gesto **non** ha disarmato, e
   al Task 6 nemmeno. Non è una regola: è una misura da rifare ogni volta, prima e dopo.
8. ⚠︎ **DUE trappole registrate nel piano sono FALSE, ed è scritto in sede.** «Vitest esegue i file in parallelo»:
   `vitest.config.ts:6-7` ha `pool: 'threads'` con `singleThread: true`, i file girano **in serie**. E «due passate per
   finestra di cinque minuti» è smentita da **378 accessi in 107 secondi senza un `429`**. Se le trovi citate altrove,
   non riscrivere prove valide per obbedirle.
9. ⚠︎ **Una lettura concorde non è una misura, e due misure che sembrano contraddirsi spesso non lo sono.** Al Task 5
   la consegna dichiarava «8 rosse», la revisione a secco lo **confermò contandolo a lettura**, e la misura ne diede
   **9**. Al Task 6 le due revisioni si contraddicevano su un rimedio: si è misurata la **forma letterale** che una
   delle due aveva scritto, e aveva ragione lei — l'altra aveva applicato il rimedio in una forma diversa. Prima di
   scrivere un numero o una ragione nel messaggio di commit, chiediti se l'hai **misurata** o **dedotta**.
10. ⚠︎ **`grep -c` esce con 1 quando conta zero**, e in una catena `&&` la spezza in silenzio. Un gate che sembra
    interrotto può essere solo un conteggio a zero.

## Che cosa ti ha lasciato il Task 6

**Quattro commit:** `3182cd6` (consegna), `d894f57` (remediation dopo due revisioni avversariali in parallelo),
`737d9bc` (l'appendice, che è quella che leggi tu) e `c8cba5c` (le due ipotesi rimaste, misurate).

Esistono ora `public.sposta_visita_a(uuid,uuid,date,jsonb,text,jsonb)` e `public.cancella_visita(uuid,uuid,text,jsonb)`,
con **22 prove** in `tests/schema/sposta-e-cancella.test.ts`. La spec 3a è a **revisione 17**: §4.1 dichiara
`move_visit_to` **esente** dalla parte della regola 8 sugli aggiornamenti condizionali, con la misura che lo obbliga e
il prezzo che si paga.

**Baseline verificata a `c8cba5c`, eseguita in serie:** `npx supabase db reset` senza righe `Skipping migration`;
`npm test` → **24 file, 373 prove verdi**; `npm run test:fuso` → 4 file, **96 verdi**; `npx tsc --noEmit` → uscita 0.

**Presìdi che restano scoperti, con il danno misurato** (tutti nell'appendice del Task 6, nessuno bloccante):

1. **Le sei righe di §4.4 non coprono `cancellata` né `gia_cancellata`** — è la **decisione A** qui sopra, ed è tua.
2. **Il ramo `if v_stato is null` non è in `0017`** — **decisione B**, misurata.
3. **`0017` chiama `stato_visita` senza la riga di commento** sul vincolo di §4.4: copia da `0016`, non da `0017`.
4. **La guardia `app.is_active_operator()` delle funzioni del Task 6: senza vittime, NON equivalente.** Senza, tutte e
   due rispondono `esito = non_trovata`, un esito di dominio. Il presidio è la prova OUTSIDER-WRITE del **Task 9**.
   ⚠︎ **Ti riguarda: anche `controlla_invio` ha la stessa guardia**, e le tue due prove sul ricontrollo dell'account
   (sonde 3 e 4) sono il primo presidio vero di quella forma in questo piano.
5. **`set constraints … immediate` non è eseguito sui tre ritorni anticipati di `sposta_visita_a`** — irraggiungibile
   da PostgREST, una chiamata per transazione.
6. **Il blocco della regola 2 in `0016` resta l'unica delle tre copie scoperta** (0 rosse su 373). Le due di `0017`
   sono presidiate. **Non toccarlo.**
7. **`sposta_visita_a` non è presidiata sotto `40P01` né con più di due appuntamenti**, benché misurato che si comporti
   correttamente in tutti e due i casi.
8. **Quattro divergenze di sola prosa nella spec**, elencate nell'appendice: nessun danno.
9. Dai task precedenti: i tre trigger su `operator` non presidiati, sette prove negative senza gemella, l'audit cieco a
   `(select …) or true` (S4-6, Task 9), nessun audit su `pg_proc.proacl` (Task 9). **Non toccarli.**

## Due punti del piano da guardare con sospetto

* **Il Passo 6 fa `git add` di due soli file.** Se ne tocchi di più — e il Passo 5 ti farà aggiungere prove, e le due
  decisioni in testa potrebbero farti toccare la spec — **nominali uno per uno**. Un `git add` largo porta dentro
  modifiche che non hai dichiarato. Le caselle `- [ ]` del piano che spunti sono una modifica al piano: va nel commit,
  nominata.
* **Il Passo 4 attende «10 verdi».** Le `it(` del Passo 1 sono **10**, contate il 26/09/2026 — ma contale tu: se non
  fanno 10, **non aggiustare il numero, dillo**. E ricorda che il Passo 5 te ne fa aggiungere almeno una, più quelle
  sui permessi.

## Come chiudere

Fermati dopo il commit del Passo 6 e scrivi un resoconto con:

1. i file creati o modificati e il numero del commit;
2. l'output vero del gate (le quattro voci);
3. la tabella delle sonde: mutazione → prova arrossita → numero di rosse **misurato**, comprese le prove aggiunte;
4. **la durata misurata delle prove (b) e (b bis)** (avvertimento 5): se non arrivano a circa mezzo secondo, dillo;
5. che cosa hai fatto delle **decisioni A e B**, e che cosa ha risposto l'utente;
6. come hai presidiato i permessi delle funzioni nuove, e se proponi di anticipare l'audit su `pg_proc.proacl`;
7. tutto ciò che ti ha fatto esitare, o che nel piano era sbagliato o ambiguo;
8. che cosa hai dovuto decidere da sola, e che cosa costa se hai deciso male;
9. **l'elenco dei punti dove ti senti debole** — serve alla revisione, e ai Task 4, 5 e 6 è stato l'elenco più
   produttivo di tutti. ⚠︎ Al Task 5 quattro punti deboli dichiarati sono stati **smentiti dalla misura**, e al Task 6
   altri quattro: dichiarare un dubbio non è ammettere un difetto.

Non partire con il Task 8: il piano lo esegue una chat alla volta, con una revisione in mezzo.

## Come si fa la revisione, dopo

Due agenti indipendenti avversariali **in parallelo**, ma con la risorsa condivisa **partizionata**: c'è un solo
database locale, e due revisore che lanciano la suite insieme producono 110-114 rosse **false**. Nei Task 2, 3, 4, 5 e
6 ha funzionato così, e ogni volta ha trovato reperti che né l'esecutrice né una revisione sola avevano visto:

* una **empirica**, proprietaria esclusiva del database e di Vitest, che rimisura le sonde dichiarate e ne inventa di
  nuove, e che ha il compito esplicito di cercare **«una mutazione invisibile oggi e letale al task successivo»** — ai
  Task 3, 4, 5 e 6 questo compito ha prodotto il reperto migliore di tutta la revisione;
* una **a secco**, in sola lettura (file, `git`, `grep`, `tsc --noEmit`, `docker … env`), a cui è **vietato** lanciare
  Vitest o qualunque comando che scriva sul database, e che consegna **ipotesi falsificabili**: ognuna con il comando
  esatto che la proverebbe e l'esito, in numeri, che la confermerebbe. Quelle ipotesi le misura l'orchestratrice dopo.

⚠︎ **La partizione giusta è empirica + a secco, mai due letture:** al Task 5 le due letture concordi hanno sbagliato
insieme lo stesso numero. Quando le due convergono su un reperto **da lati diversi** — una dal contratto, l'altra dalla
mutazione — quello è il reperto vero, e di solito una prova sola lo chiude: è successo al Task 6, sul registro degli
invii. E quando **divergono**, si misura la forma **letterale** che una delle due ha scritto, non «il rimedio».

A entrambe si dà l'elenco dei punti dove l'esecutrice si sente debole, **non** quelli dove è sicura, e si chiede
esplicitamente di verificare **con numeri** le affermazioni del messaggio di commit.
