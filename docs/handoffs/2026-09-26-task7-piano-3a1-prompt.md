# Prompt per la chat che eseguirà il Task 7 del piano 3a-1

Sei l'esecutrice del **Task 7** del piano 3a-1 del progetto `salon-scheduler` (agenda per il centro estetico AVStyle).
Lavori in `/Users/nadiaottavi/Desktop/Git/salon-scheduler`, ramo `main`.

## Controllo d'ingresso — prima di qualunque cosa

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
git merge-base --is-ancestor 23adacaef8bc5e059199c042167d6123568b4a5c HEAD \
  && echo "storia lineare" || echo "STORIA RISCRITTA — questo prompt è invalido"
git diff --stat 23adaca..HEAD -- supabase tests src
git status --short
git branch --show-current
git log --oneline -1 origin/main
```

Atteso, una riga per comando:

* il primo stampa `storia lineare`: il commit che chiude la revisione mirata del ramo dello stato vuoto è ancora nella
  storia di questo ramo. È «fix(3a): la revisione mirata del ramo dello stato vuoto, e una ragione falsa», e
  `git log --oneline -1 23adaca` lo conferma;
* il secondo **non stampa niente**: dopo la fine del Task 6 nessuno ha toccato `supabase/`, `tests/` o `src/`. Se
  stampa qualcosa, qualcuno ha lavorato sul codice dopo di me e questo prompt è vecchio;
* il terzo non stampa niente tranne `?? .superpowers/` e i **due** file più vecchi sotto `docs/handoffs/` (datati
  2026-09-18 e 2026-09-22), che sono preesistenti e non si toccano;
* il quarto stampa `main`;
* il quinto: `origin/main` dovrebbe essere a `d3cff27` (pushato il 27/09/2026) o più avanti, se nel frattempo l'utente
  ha pushato anche `7b2f085`, `23adaca` e il commit che aggiorna questo file. Se è **più avanti di HEAD**, qualcuno ha
  pushato o resettato: fermati. ⚠︎ Le `git note` (su `79574fe` e su `7b2f085`) **non viaggiano** con un push normale:
  si leggono con `git log --notes` solo in locale.

Il controllo non nomina l'ultimo commit apposta: il commit che introduce questo file sposterebbe HEAD e renderebbe il
controllo impossibile da superare. Il SHA è scritto per esteso perché nel prompt del Task 2 un segnaposto era costato
un commit di correzione.

⚠︎ **Il repo è PUBBLICO** (`github.com/Unichess64/AVSTYLE`). Fai `git pull` prima di cominciare. `git push` **mai** di
tua iniziativa: lo decide l'utente, ed è un'azione su un repo pubblico.

Se una qualunque riga diverge, fermati e dillo: non eseguire il Passo 1 e non proporre alternative finché non ti
rispondono.

## ⚠︎⚠︎ LE DUE DECISIONI DEL TASK 6 SONO PRESE — e una ti ha già cambiato il piano

Il Task 6 si era fermato su due punti, lasciandoli all'utente. **Sono stati decisi tutti e due il 27/09/2026**, e li
trovi già applicati in spec e nel piano. Non devi riaprirli: devi sapere che cosa è cambiato, perché tocca il codice
che trascriverai.

### 1. Le righe di §4.4 sono SETTE, e il piano ti dava il ramo sbagliato

`cancella_visita` (Task 6) immette in `invio` due esiti che prima non esistevano, **`cancellata`** e
**`gia_cancellata`**, e la tabella delle righe di §4.4 non ne copriva nessuno. Deciso, **spec revisione 18**:

* **`gia_cancellata` entra nell'elenco della riga 6** — è letteralmente il suo caso, «un esito che non ha scritto» —
  e mostra «Era già stata cancellata», lo stesso messaggio della risposta diretta;
* **`cancellata` prende la riga 7**, «✓ Risulta cancellata»: ha scritto, ed è l'analoga della riga 2 per «Elimina
  visita».

Il tuo contratto è quindi **`riga: 1..7`**, non `1..6`.

⚠︎ **E qui c'era un difetto vero, non solo una lacuna di forma.** Il Passo 3 del Task 7 conteneva
`elsif v_esito in ('cancellata','gia_cancellata') then v_riga := 2;` — e la riga 2 è «✓ Risulta salvata». Trascrivendo
il piano alla lettera, una **cancellazione riuscita** avrebbe detto all'operatrice che la visita è **salvata**.
Corretto in sede: il ramo ora è `elsif v_esito = 'cancellata' then v_riga := 7;` con `gia_cancellata` che ricade
nell'`else` della riga 6. **Il commento nel piano spiega perché: non "semplificarlo".**

⚠︎ **Le due righe nuove NON sono provate dal Passo 1**, perché le sue dieci prove sono state scritte quando
`cancella_visita` non esisteva e nessuna la chiama. **Devi aggiungere due prove** — una per la riga 7 (cancellazione
riuscita, poi «Controlla») e una per la riga 6 con `gia_cancellata` (due cancellazioni, poi «Controlla» sul secondo
codice) — e l'atteso del Passo 4 è già stato portato da 10 a **12**. La **settima sonda** del Passo 5 esiste apposta
per verificarle: rimette la forma sbagliata e le due prove nuove devono arrossire.

### 2. ⚠︎ IL VINCOLO CHE DEVI IMPLEMENTARE: `non_trovata` non autorizza a dire «non esiste più»

**È la cosa più importante di questo prompt dopo il punto 1, ed è lavoro tuo, non contesto.** Spec §4.4,
**revisione 19**, fra le «Regole comuni a tutti i messaggi dopo «Controlla»».

Misurato il 27/09/2026 da una revisione mirata: **tutte e tre** le funzioni di scrittura registrano in `invio`
`non_trovata` anche quando la visita **c'è ancora** e ciò che è caduto è il **permesso di leggerla** — l'operatrice
disattivata mentre l'invio è in coda perde le sessioni (`0015`), e la sicurezza per riga le nasconde tutto. Il banco
l'ha verificato: `invio = ['non_trovata']`, e la visita in `visit` con i suoi appuntamenti.

Percorso raggiungibile fino a te: disattivazione → riattivazione → l'operatrice rientra entro le **24 ore** che §4.4
concede al codice d'invio → «Controlla» passa il codice rimasto in `localStorage` → **il ricontrollo dell'account
riesce**, perché è attiva di nuovo → e la riga 6 prenderebbe il secondo messaggio di `non_trovata`, «questa visita non
esiste più», **su una visita che è lì**.

La regola che lo disinnesca era già in §4.4, prima riga delle regole comuni: **«Dove sta la visita lo dice la lettura,
mai la memoria del telefono»** — e tu la visita la **leggi**. Quindi, con `esito_invio = 'non_trovata'`:

* la lettura **trova** la visita → si tratta come **riga 1**, «Non risulta salvata: l'invio non ha scritto nulla» (ed è
  vero, `non_trovata` non scrive), con lo **stato letto** che diventa quello di partenza della scheda, così il «Salva»
  successivo non rimbalza per versioni vecchie;
* la lettura **non** la trova ed è fra le cancellate → **riga 4**; non la trova e non è fra le cancellate → **riga 5**.

Il messaggio «questa visita non esiste più» si usa **solo** quando la tua lettura conferma l'assenza. Per
`cancellata_altrove` e `gia_cancellata` la questione non si pone: quegli esiti affermano l'assenza per definizione.

✅ **Il Passo 3 del piano lo implementa già** (corretto il 27/09/2026): c'è un `elsif v_esito = 'non_trovata'` che
guarda la lettura e dà **riga 1** se la visita c'è, 4 o 5 se non c'è. **Ma nessuna prova lo pianta**: quella la scrivi
tu, ed è l'ottava sonda del Passo 5 a verificarla. La forma per costruirla è misurata e sta nell'appendice «Revisione
mirata del ramo dello stato vuoto»: guardiano che blocca un appuntamento, `sposta_visita_a` in coda, operatrice
disattivata e poi **riattivata** prima di «Controlla».

### 3. Il ramo `if v_stato is null` è ORA nelle due funzioni del Task 6

Chiuso il 27/09/2026. `0016:171-177` degrada un `modificata_altrove` con `stato` non leggibile a `non_trovata`, e
`0017` non aveva quel ramo: misurato, nello stesso istante e con la stessa forma, `salva_visita` rispondeva
`non_trovata` e le altre due `modificata_altrove` con `stato: null` — e quell'esito finiva in `invio`, cioè nel campo
su cui **tu** decidi la riga. Ora le tre gemelle rispondono uguale, e due prove lo piantano, una per funzione.

⚠︎ **Ti riguarda come precedente da imitare — ma NON copiarne la metà morta.** Anche `controlla_invio` legge
`stato_visita` e deve decidere che fare quando torna NULL: là è la differenza fra la **riga 4** e la **riga 5**, e §4.4
aggiunge che una riga del codice non visibile → *«Non so»*, **mai** la riga 1.

⚠︎ E attenzione a una differenza che conta: in `0017` la visita è sotto `for update`, quindi `v_stato is null` ha **una
sola** causa possibile, «permesso caduto». Da te no: `controlla_invio` legge **senza** bloccare, quindi NULL ha due
cause vere e distinte — visita davvero cancellata (riga 4) e visita mai esistita (riga 5). **Copiare il ragionamento
senza copiare la differenza è il modo più rapido per riaprire il reperto.**

⚠︎ E il ramo `case when v_cancellata then … else 'non_trovata' end` che vedi nelle tre funzioni è **codice morto**,
misurato: cinque mutazioni su di esso danno **0 rosse su 375**, compreso scambiare i due letterali fra le gemelle, e non
esiste porta per raggiungerlo (la visita è bloccata, e `visita_cancellata` si legge con la stessa politica di `visit`).
Sta lì per simmetria, **non perché sia presidiato**: due di quelle mutazioni sono invisibili oggi e **letali a te** —
`cancellata` è la tua riga 7 e `salvata` la tua riga 2, per un invio che non ha scritto una riga. **Nel tuo `0018` non
riprodurre la forma credendola difesa.**

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
   tuo contratto, tabella delle **sette** righe compresa, **più la regola su `non_trovata`** fra le regole comuni
   (revisione 19) — più §4.1 (le regole 0-11 e il contratto di `p_attesi`), §4.3
   passo 7 e **passo 8** (⚠︎ riscritto alla revisione 16: vedi sotto), §4.2, e le decisioni D3-9, D3-18, D3-21.
5. `tests/helpers/db.ts`, `tests/helpers/sessioni.ts`, `tests/helpers/fixtures.ts`.
6. `tests/schema/salva-visita.test.ts` (31 prove) e `tests/schema/sposta-e-cancella.test.ts` (24 prove). Del secondo
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
  **otto**; se una non fa vittime, dichiaralo e di' che cosa farebbe davvero in produzione.
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
10. ⚠︎ **`git checkout --` cancella anche la modifica NON COMMITTATA di un file TRACCIATO.** La trappola 2 registra il
    caso del file non tracciato; questa è la variante che è costata di più, il 27/09/2026: uno script di sonde finiva
    con quel comando per «ripristinare» e ha cancellato il ramo appena scritto, così **sette sonde di seguito hanno
    girato su codice senza la modifica che dovevano misurare**. Il sintomo somigliava a due prove **instabili** — verdi
    da sole, rosse nella suite — e la diagnosi sbagliata era a un passo. Lo smaschera un `grep -c` sulla riga mutata,
    **non** uno `shasum`: il file «ripristinato» ha lo shasum di HEAD, che è quello giusto per un ripristino e quello
    sbagliato per la misura. Il ripristino si fa **sempre** da copia di scorta, e la copia si fa **dopo** aver scritto
    la modifica.
11. ⚠︎ **`grep -c` esce con 1 quando conta zero**, e in una catena `&&` la spezza in silenzio. Un gate che sembra
    interrotto può essere solo un conteggio a zero.

## Che cosa ti ha lasciato il Task 6

**Cinque commit:** `3182cd6` (consegna), `d894f57` (remediation dopo due revisioni avversariali in parallelo),
`737d9bc` (l'appendice, che è quella che leggi tu), `c8cba5c` (le due ipotesi rimaste, misurate) e `7b2f085` (il ramo
dello stato vuoto, che chiude il reperto 2).

Esistono ora `public.sposta_visita_a(uuid,uuid,date,jsonb,text,jsonb)` e `public.cancella_visita(uuid,uuid,text,jsonb)`,
con **24 prove** in `tests/schema/sposta-e-cancella.test.ts`. La spec 3a è a **revisione 18**: §4.4 ha le righe 6 e 7 per gli esiti di «Elimina visita», e §4.1 dichiara
`move_visit_to` **esente** dalla parte della regola 8 sugli aggiornamenti condizionali, con la misura che lo obbliga e
il prezzo che si paga.

**Baseline verificata, eseguita in serie:** `npx supabase db reset` senza righe `Skipping migration`;
`npm test` → **24 file, 375 prove verdi**; `npm run test:fuso` → 4 file, **96 verdi**; `npx tsc --noEmit` → uscita 0.

**Presìdi che restano scoperti, con il danno misurato** (tutti nell'appendice del Task 6, nessuno bloccante):

1. ✅ **Le righe di §4.4 coprono ora `cancellata` e `gia_cancellata`** (spec revisione 18) — vedi l'avvertimento in
   testa: il contratto è `riga: 1..7` e il ramo del piano è stato corretto.
2. ✅ **Il ramo `if v_stato is null` è ORA in `0017`** (chiuso il 27/09/2026): le tre funzioni gemelle rispondono
   `non_trovata` nello stesso scenario, e due prove lo piantano — una per funzione, 1 rossa ciascuna. **Imita quella
   forma**: `controlla_invio` deve decidere che fare quando `stato_visita` torna NULL, ed è la differenza fra la riga 4
   e la riga 5.
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
* **Il Passo 4 attende «13 verdi»**: le `it(` del Passo 1 sono **10**, contate il 26/09/2026, più le **due** delle
  righe 6 e 7 e **una** per la regola su `non_trovata`, che gli avvertimenti in testa ti fanno aggiungere. Contale tu:
  se non fanno 13, **non aggiustare il numero, dillo**. E ricorda che il Passo 5 te ne fa aggiungere almeno un'altra,
  più quelle sui permessi.

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
