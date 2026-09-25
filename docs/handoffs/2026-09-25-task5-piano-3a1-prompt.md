Sei l'esecutrice del **Task 5** del piano 3a-1 del progetto `salon-scheduler` (agenda per il centro estetico AVStyle).
Lavori in `/Users/nadiaottavi/Desktop/Git/salon-scheduler`, ramo `main`.

# Controllo d'ingresso — prima di qualunque cosa

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
git merge-base --is-ancestor bbef564bb81b0887afcf1589bd256c6593fa8f0f HEAD \
  && echo "storia lineare" || echo "STORIA RISCRITTA — questo prompt è invalido"
git diff --stat bbef564..HEAD -- supabase tests src
git status --short
git branch --show-current
```

Atteso, una riga per comando:

- il primo stampa `storia lineare`: l'appendice del Task 4 è ancora nella storia di questo ramo. Quel commit è
  «docs(3a-1): l'appendice del Task 4, che la chat del Task 5 legge», l'ultimo del Task 4, e
  `git log --oneline -1 bbef564` lo conferma;
- il secondo **non stampa niente**: dopo la fine del Task 4 nessuno ha toccato `supabase/`, `tests/` o `src/`. Se
  stampa qualcosa, qualcuno ha lavorato sul codice dopo di me e questo prompt è vecchio;
- il terzo non stampa niente tranne `?? .superpowers/` e i **due** file più vecchi sotto `docs/handoffs/` (datati
  2026-09-18 e 2026-09-22), che sono preesistenti e non si toccano;
- il quarto stampa `main`.

Il controllo non nomina l'ultimo commit apposta: il commit che introduce questo file sposterebbe HEAD e renderebbe il
controllo impossibile da superare. Il SHA è scritto per esteso perché nel prompt del Task 2 un segnaposto era costato
un commit di correzione.

**Se una qualunque riga diverge, fermati e dillo:** non eseguire il Passo 1 e non proporre alternative finché non ti
rispondono.

# Che cosa leggere, prima di toccare qualunque cosa

1. `docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` — l'intestazione, i «Vincoli globali», la
   «Struttura dei file» e tutto il **Task 5** (da `### Task 5` fino a dove comincia `### Task 6`). I vincoli globali
   valgono anche se il task non li ripete. ⚠︎ **In testa al Task 5, subito prima del Passo 1, c'è un blocco
   `⚠︎⚠︎ DA LEGGERE PRIMA DI SCRIVERE LE PROVE`: è la cosa più importante che leggerai oggi.** Non è prosa di
   contorno, è una misura presa su banco usa e getta che cambia due delle tue prove.
2. Dello stesso file, l'appendice **«Esecuzione del Task 4 e revisione (24-25 settembre 2026)»**, in fondo. Dice che
   cosa il Task 4 ti ha lasciato, quali presìdi restano scoperti con quale danno misurato, e quali due ragioni scritte
   nella consegna del Task 4 erano **false** e sono state corrette.
3. Subito prima, le appendici **del Task 3 e del Task 2**: contengono le trappole di processo, di cui **due sono false
   e segnate come tali** (vedi sotto).
4. `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md` (ora **revisione 14**), **§4.1 per intero** —
   le regole 0-11 sono il contratto che stai implementando — più §4.4 («Controlla»), §4.5, §10.2 e §10.3, e le
   decisioni D3-7, D3-9, D3-18, D3-19, D3-21 nella tabella in testa.
5. `tests/helpers/db.ts`, `tests/helpers/sessioni.ts`, `tests/helpers/fixtures.ts`: gli aiuti che consumerai.
   E `tests/schema/invii.test.ts` (14 prove) e `tests/schema/chiusura-sessioni.test.ts` (16 prove), per vedere come
   sono presidiati i due task più vicini al tuo.
6. `supabase/migrations/0013_invii_e_cancellate.sql` (`app.apri_invio`, `app.chiudi_invio`, `app.versione`, il trigger
   delle cancellate), `supabase/migrations/0014_sessione_viva.sql` (`app.is_active_operator()`),
   `supabase/migrations/0015_chiusura_sessioni.sql`, e `supabase/migrations/0005_occupancy.sql:25-27`
   (`appointment_slot_unique`, `deferrable initially deferred`) e `0008_orphan_visit.sql`
   (`zz_delete_orphan_visit`): sono i quattro oggetti su cui l'ordine delle istruzioni della tua funzione poggia.

Dichiara all'inizio quali di questi hai letto.

# Che cosa fare

I **sei passi** del Task 5, in ordine, uno alla volta, spuntando le caselle `- [ ]` nel file del piano man mano che
li chiudi. Il piano contiene il testo completo delle prove e della migrazione: **si trascrive, non si reinventa**. Se
una riga del piano non funziona, fermati e dillo: non aggiustarla di tua iniziativa. *(Al Task 4 questa regola ha
pagato: il Passo 1 prescriveva `asOperator` per due prove che rileggono da un'altra connessione, e una delle due era
verde e completamente muta.)*

Il task tocca due file nuovi:

- crea `supabase/migrations/0016_salva_visita.sql`
- crea `tests/schema/salva-visita.test.ts`

più le prove che il **Passo 5 ti farà aggiungere** (le sonde 1 e 3 lo chiedono esplicitamente). **Dichiara file per
file** quello che tocchi oltre ai due nuovi. Non anticipare il Task 6 (`sposta_visita_a`, `cancella_visita`).

# ⚠︎ Le cinque cose che ti faranno perdere tempo se non le leggi ora

## 1. Disattivare un'operatrice ora CANCELLA anche la sua sessione, e due tue prove ci poggiano sopra

**È il reperto migliore della revisione del Task 4, ed è misurato su banco usa e getta, non ragionato.** Sta per
esteso in testa al Task 5; qui il minimo indispensabile.

Da `0015_chiusura_sessioni.sql`, un `update operator set is_active = false` **committato** cancella le sessioni di
quell'account. Quindi **una sessione catturata PRIMA della disattivazione non distingue più «operatrice disattivata»
da «sessione cancellata»**: `app.is_active_operator()` è falsa per tutte e due le ragioni, e la seconda arriva prima.

Le tue due prove di concorrenza — *«l operatrice disattivata mentre il salvataggio è in coda riceve non_trovata, mai
salvata»* e *«la regola 11 ferma la scrittura quando la visibilità cade DOPO i confronti»* — catturano
`sessioneDi(VERA_AUTH)` **prima** dell'`update`. Il commento del piano dice «riparte SENZA più i permessi»
attribuendolo a `is_active`: **misurato, la causa vera è la sessione cancellata**. Presidiano le regole 2, 6 e 11 —
che è il loro scopo — ma **non** `is_active`, e il loro commento non deve lasciar credere il contrario.

⚠︎ **E l'irrobustimento naturale peggiora le cose.** Aggiungendo la precondizione asserita dentro
`access-control > shows nothing to a deactivated operator` — cioè **esattamente il gesto che la revisione del Task 3
ha imposto altrove** — con `and o.is_active` tolto da `app.is_active_operator()` le rosse scendono **da 2 a 1**: la
prova diventa sovradeterminata e smette di presidiare. **Non applicare qui quel gesto senza rimisurare la mutazione
prima e dopo.** Un rimedio di revisione non è una regola: vale per il caso in cui è stato misurato.

Decidi esplicitamente e scrivilo: o quelle prove riaprono una sessione viva dopo la disattivazione, e allora tornano a
presidiare `is_active`; oppure dichiari nel loro commento che presidiano la sicurezza per riga e non `is_active`.
**Non lasciarlo implicito.**

## 2. `asOperator` ANNULLA. Ogni prova che scrive e poi rilegge da fuori ha bisogno di `asOperatorCommit`

`inRole` chiude **sempre** con un `rollback` (`tests/helpers/db.ts`). Il tuo task è tutto scritture: `salva_visita`
scrive la visita, gli appuntamenti, a volte la cliente, e quasi ogni tua prova poi **rilegge da un'altra
connessione** (`statoDb()`), o incatena due invii, o si aspetta che la scrittura resti.

Al Task 4 il piano prescriveva `asOperator` per due prove così. Una era **rossa**; l'altra era **verde e MUTA** —
misurato: con la funzione che riscriveva la password del bersaglio, la prova restava verde, perché il rollback
annullava anche quella. **Una prova che scrive e rilegge da fuori la transazione e che è verde con `asOperator` non
sta misurando niente.** Il piano del Task 5 usa già `asOperatorCommit` in molti punti: controlla **uno per uno** che
lo usi dove serve, e dove il piano dice `asOperator` chiediti se quella prova rilegge da fuori.

## 3. Tre sonde del Passo 5 non hanno una vittima, e il piano lo dice: due chiedono prove NUOVE

Non sono difetti da segnalare, sono lavoro da fare.

- **Sonda 1** (`app.apri_invio` spostata **dopo** l'inserimento della cliente nuova): «nessuna prova esistente:
  **aggiungila**». Un invio bruciato non deve lasciare la cliente.
- **Sonda 3** (via il confronto sulla versione della visita): il piano avverte che **potrebbe restare verde** perché
  il confronto sull'insieme basta — e in quel caso **aggiungi** una prova che cambia **solo la data** da un'altra
  sessione.
- **Sonda 8** (`set constraints … deferred`): **nessuna prova di questo task** la fa arrossire, e non è un difetto —
  il vincolo è già `initially deferred` (`0005:25-27`), quindi con una sola chiamata per transazione quella riga non
  fa niente. Il presidio è la quinta prova del **Task 11**. Non inventare una prova per farla morire qui.
- **Sonda 7** asserisce il **messaggio**, non il codice, e il piano spiega perché: senza il riesame arriva comunque un
  `42501`, ma dal `with check` della politica su `appointment`. Una prova sul solo codice resterebbe verde.
- **Sonda 10** fa arrossire **una sola** prova, e il piano dice che è giusto così.

## 4. La regola «due passate per finestra di cinque minuti» è FALSA — non dedurla di nuovo

L'ha scritta chi ha eseguito il Task 4 deducendola da `supabase/config.toml` invece di provarla. **Smentita per
misura dalla revisione:** tre passate consecutive, **378 accessi in 107 secondi, zero `429`**, verdi tutte e tre.
`sign_in_sign_ups = 300` arriva al GoTrue come `GOTRUE_RATE_LIMIT_OTP` (verificato in `docker inspect`) e **non
governa** `POST /token?grant_type=password`.

Che cosa resta vero: dal Task 4 `resetData()` chiama `dimenticaSessioni()`, quindi **si accede per coppia
account/prova**, non più per file, e una passata fa **126 accessi** (contati in `auth.audit_log_entries`). Il commento
di `config.toml` è già stato corretto e dice di non dedurre di nuovo quella regola da lì. Se vedi un `429`, allora è
una misura: scrivila. Ma non rallentare il ciclo per una regola che nessuno ha provato.

## 5. Il `grant execute … to authenticated` è ridondante: la riga che porta è il `revoke`

La tua migrazione crea `public.salva_visita` e `public.stato_visita`. Misurato al Task 4, e vale per **tutte** le
funzioni di questo repo: in `public` c'è un `alter default privileges` di Supabase — da **due** concedenti,
`postgres` e `supabase_admin` — che concede `EXECUTE` ad `anon`, `authenticated` e `service_role` su **ogni** funzione
nuova. Conseguenze:

- una sonda che toglie il `grant … to authenticated` dà **0 rosse** ed è **equivalente**, non un presidio mancante:
  non scriverla in tabella come mutismo;
- la riga che porta davvero è **`revoke execute … from public, anon`**, ed è quella da presidiare;
- **non esiste nessun audit permanente sui permessi delle funzioni.** `catalogue-audit.test.ts` enumera
  `pg_class.relacl` proprio per non doverlo rifare a mano, ma `pg_proc.proacl` non compare da nessuna parte: ogni
  funzione ha solo prove scritte a mano. **Il piano assegna al Task 9 lo stringimento di `catalogue-audit`**, quindi
  per oggi scrivi le asserzioni a mano per nome di ruolo (`anon`, `public`, `authenticated`) **con la gemella
  positiva accanto**, come fanno `write-functions.test.ts`, `account-directory.test.ts` e
  `availability-window.test.ts`. Se ti sembra che valga la pena anticipare l'audit permanente, **proponilo, non
  farlo**: è del Task 9.

# Vincoli che non si negoziano

- ⛔ **Mai `psql`**: non è installato, e da proprietario scavalcherebbe la sicurezza per riga dando misure false in
  silenzio. Ogni misura si prende con uno script Node che usa `pg`. Se lo script sta fuori dal progetto, importa `pg`
  per path assoluto (`/Users/nadiaottavi/Desktop/Git/salon-scheduler/node_modules/pg/lib/index.js`): altrimenti esce
  con `Cannot find package 'pg'` e sembra un blocco del database.
- ⛔ **`supabase/seed.sql` non si tocca, mai**: `[db.seed]` è attivo e un `db reset --linked` lo eseguirebbe contro il
  progetto ospitato. I quattro utenti `@example.test` restano — deciso in spec §8.5 — e la tua imbracatura ne dipende.
- **Italiano** in prosa, commenti, nomi delle prove e messaggio di commit.
- **Migrazioni:** solo cifre nel prefisso, e il numero dev'essere libero sul disco **e** non rivendicato da un task
  successivo. `0016` è il tuo, ed è libero.
- **Ogni funzione nuova:** `search_path = ''` e ogni riferimento qualificato per schema; `security invoker` salvo dove
  il piano dice `definer`; `revoke execute … from public, anon` e `grant execute … to authenticated` nella stessa
  migrazione. Nessuna funzione imposta `default_transaction_isolation`.
- **Le versioni delle righe viaggiano come testo** prodotto da `app.versione()`, mai come `timestamptz` convertito in
  JavaScript: un `Date` tronca i microsecondi e produce falsi conflitti (spec §10.2).
- **Ogni prova che asserisce un vuoto** deve avere accanto una prova positiva che la renda capace di fallire.
- **Dati non degeneri** nelle prove: più di un servizio, più di un'operatrice, pause diverse da zero, due date.
- Dopo ogni modifica alle migrazioni: `npx supabase db reset`, e controlla che **non** compaia nessuna riga
  `Skipping migration`. Un prefisso non numerico la fa saltare in silenzio.
- ⚠︎ **`db reset` NON applica le modifiche a `config.toml` al GoTrue**: lo riavvia, non lo ricrea, e le variabili
  d'ambiente si fissano alla creazione. Serve `npx supabase stop && npx supabase start`.
- **Il gate si esegue in serie**, con l'output vero incollato nel resoconto: `npx supabase db reset`, `npm test`,
  `npm run test:fuso`, `npx tsc --noEmit`.
- **Le sonde di mutazione si eseguono davvero**: si applica la mutazione, si lancia la prova, si verifica che sia
  rossa, si ripristina, si rilancia e si verifica che sia di nuovo verde. Una sonda «ragionata» non vale. Il Passo 5
  ne elenca **undici** (numerate da 1 a 10, con una 8b); se una non fa vittime, dichiaralo e di' che cosa farebbe davvero in produzione — «senza vittime»
  è una misura, «equivalente» è una tesi da argomentare.
- Se Docker non risponde: `open -a OrbStack`, ~30 s, poi `npx supabase start`.
- **`git push` mai, per nessun motivo.** Il commit sì, quello del Passo 6.

# Le trappole misurate prima di te — non ripeterle

1. **Mai due suite sullo stesso database.** Due `npm test` insieme danno 110-114 prove rosse con `duplicate key value
   violates unique constraint` dentro `seedFixture`, e una suite ferma oltre dieci minuti. Sintomo diagnostico: se
   **nessun** file di prova completa, non è il codice. ⚠︎ `pgrep -f vitest` è **troppo largo**: nel Task 2 ha dato tre
   falsi positivi su processi di `chessbooking`, un altro progetto della stessa macchina. Usa
   `pgrep -fl vitest | grep salon-scheduler`.
2. **`asOperator` NON controlla che la sessione sia viva e NON riaccede da solo.** È una scelta deliberata: il
   riaccesso automatico uccideva tre prove negative. Quando una prova chiude una sessione, chiama `dimenticaSessioni()`
   in coda — **dentro un `finally`**, non come ultima riga: misurato, senza il `finally` una prova caduta ne trascina
   un'altra con un errore che non nomina la causa.
3. **Il ripristino di un file non ripristina il database.** Dopo aver rimesso a posto una migrazione mutata serve un
   `db reset` prima di rimisurare. E per un file **non tracciato** il ripristino si fa da una **copia di scorta**, non
   con `git checkout --`, che lo cancellerebbe. Verifica il ripristino per `shasum`.
4. **Una sonda su codice con stato residuo nel database si misura dopo un `db reset`.** Nel Task 2 una mutazione
   appariva innocua solo perché le righe della passata precedente erano ancora lì.
5. **Una mutazione che rompe il `beforeEach` dà prove SALTATE, non rosse**: restringi la mutazione al ramo della sola
   prova bersaglio.
6. **Attenzione al profilo.** Chiediti sempre con quale profilo gira la prova. Una prova che gira da `asOwner` **non
   vede** né la sicurezza per riga né la chiusura immediata, perché il proprietario le scavalca. Nel Task 1 cinque
   prove giravano tutte da `asOwner` e non potevano accorgersi della perdita del `security definer`.
7. **Un censimento si fa con una spia, non con un `grep`.** Misurato nel Task 3: censire «quali prove passano per X»
   spezzando i file per `it(` e cercando `X` nel testo del blocco dava **18** prove; strumentando la funzione con una
   spia sul nome della prova ne dava **98**, e i verdi silenti erano **27**, non 16. La regex perde ogni prova che
   chiama `X` **tramite un aiuto** del file.
8. **Un irrobustimento standard può disarmare il presidio.** Misurato al Task 4: asserire la precondizione dentro una
   prova l'ha resa sovradeterminata e ha fatto **scendere** le rosse della mutazione da 2 a 1. Dopo un irrobustimento
   si rimisurano le rosse della mutazione che quella prova deve uccidere: se scendono, hai fatto danno.
9. ⚠︎ **DUE trappole registrate nel piano sono FALSE, ed è scritto in sede.** L'appendice del Task 2 diceva «Vitest
   esegue i file in parallelo» e ne deduceva che nessuna prova può contare righe globali: `vitest.config.ts:6-7` ha
   `pool: 'threads'` con `singleThread: true`, i file girano **in serie**. E la regola «due passate per finestra» è
   smentita da 378 accessi in 107 secondi senza un `429`. Se trovi altrove quelle formule, non riscrivere prove valide
   per obbedirle.

# Che cosa ti ha lasciato il Task 4

Tre commit: `a98470d` (consegna), `e16428e` (remediation dopo due revisioni avversariali in parallelo) e `bbef564`
(l'appendice, che è quella che leggi tu).

Esistono ora `public.chiudi_sessioni(uuid)`, `app.chiudi_sessioni_di(uuid)`, `app.chiudi_sessioni_operatrice()` e i
**tre** trigger `zz_chiudi_sessioni_ins`, `_upd`, `_del` su `operator`. `resetData()` chiama `dimenticaSessioni()` in
coda. Il rientro `supabase/rientro/0014_rientro_sessione_viva.sql` spegne i tre trigger **per nome** e le sue righe
sono verificate in esecuzione: il reperto **S4-4 è chiuso**, con il limite dichiarato.

**Baseline verificata a `bbef564`, eseguita in serie:** `npx supabase db reset` senza righe `Skipping migration`;
`npm test` → **22 file, 320 prove verdi**; `npm run test:fuso` → 4 file, **96 verdi**; `npx tsc --noEmit` → uscita 0.

**Presìdi che restano scoperti, con il danno misurato** (tutti nell'appendice del Task 4, nessuno bloccante):

1. **La forma a tre trigger non è presidiata**, e il rientro li spegne per nome: fonderli o rinominarli è invisibile
   alla suite (misurato: 320 verdi con un trigger solo) e farebbe fallire il rientro con `42704`, **riaprendo S4-4 in
   silenzio**. Non toccare i trigger in questo task.
2. **Il rientro copre due dei tre consumatori di `auth.sessions`**: resta fuori `public.chiudi_sessioni`. Limite
   scritto nella spec accanto a S4-4.
3. **Nessun audit permanente su `pg_proc.proacl`** — vedi l'avvertimento 5 qui sopra. **Ti riguarda: crei due
   funzioni.**
4. **`delete from auth.refresh_tokens … session_id is null` è muto e inerte**; **la clausola `of` vale 4 chiamate su
   668**; **la sonda della password dà 2 rosse ma una è danno collaterale**; **`p_auth_user_id is null` e `new` invece
   di `old` nel ramo `is_active` sono equivalenti, non mute**. Sono dichiarati: non riaprirli.
5. **Sette prove negative senza gemella** in `availability`, `occupancy` e `orphan-visit` (dal Task 3). Danno oggi
   zero, ma il guasto si scopre a grana di file, non a grana di prova.
6. **L'audit della forma delle politiche è cieco a `(select …) or true`** (reperto **S4-6**, aperto, assegnato al
   Task 9).

# Due punti del piano da guardare con sospetto

- **Il Passo 6 fa `git add` di due soli file.** Se ne tocchi di più — e le sonde 1 e 3 ti faranno aggiungere prove nel
  file nuovo, ma potresti dover toccare anche la spec o il piano — **nominali uno per uno**. Un `git add` largo porta
  dentro modifiche che non hai dichiarato.
- **I numeri del messaggio di commit si misurano, non si ricordano.** Nel Task 3 un messaggio conteneva due numeri
  falsi, e la nota scritta per correggerli ne conteneva altri due, perché rileggeva la misura vecchia invece di
  rifarla. Nel Task 4 due **ragioni** erano false, non due numeri: «tre trigger perché una clausola WHEN…» quando una
  clausola `when` non c'era, e «due passate per finestra» dedotta invece che provata. **Prima di scrivere una ragione
  nel messaggio, chiediti se l'hai misurata o dedotta.**
- **Il Passo 4 attende «21 verdi (19 delle tre sezioni, più la prova su `non_trovata` sotto blocco e quella sulla
  regola 11)».** Conta le `it(` che hai davvero scritto: se non fanno 21, non aggiustare il numero, **dillo**.

# Come chiudere

Fermati dopo il commit del Passo 6 e scrivi un resoconto con:

1. i file creati o modificati e il numero del commit;
2. l'output vero del gate (le quattro voci);
3. la tabella delle sonde di mutazione: mutazione → prova che è arrossita → numero di rosse misurato, comprese le
   prove che hai **aggiunto** per le sonde 1 e 3;
4. che cosa hai deciso sulle due prove di concorrenza rispetto a `is_active` (avvertimento 1), e con quale misura;
5. come hai presidiato i permessi delle due funzioni nuove, e se proponi di anticipare l'audit su `pg_proc.proacl`;
6. tutto ciò che ti ha fatto esitare, o che nel piano era sbagliato o ambiguo;
7. che cosa hai dovuto decidere da sola, e che cosa costa se hai deciso male;
8. **l'elenco dei punti dove ti senti debole** — serve alla revisione, e al Task 4 è stato l'elenco più produttivo di
   tutti.

**Non partire con il Task 6:** il piano lo esegue una chat alla volta, con una revisione in mezzo.

# Come si fa la revisione, dopo

Due agenti indipendenti avversariali **in parallelo**, ma con la **risorsa condivisa partizionata**: c'è un solo
database locale, e due revisore che lanciano la suite insieme producono 110-114 rosse **false**. Nei Task 2, 3 e 4 ha
funzionato così, e ogni volta ha trovato reperti che né l'esecutrice né una revisione sola avevano visto:

- una **empirica**, proprietaria esclusiva del database e di Vitest, che rimisura le sonde dichiarate e ne inventa di
  nuove, e che ha il compito esplicito di cercare **«una mutazione invisibile oggi e letale al task successivo»** — ai
  Task 3 e 4 questo compito ha prodotto il reperto migliore di tutta la revisione;
- una **a secco**, in sola lettura (file, `git`, `grep`, `tsc --noEmit`, `docker … env`), a cui è **vietato** lanciare
  Vitest o qualunque comando che scriva sul database, e che consegna **ipotesi falsificabili**: ognuna con il comando
  esatto che la proverebbe e l'esito, in numeri, che la confermerebbe. Quelle ipotesi le misura l'orchestratrice dopo.

A entrambe si dà **l'elenco dei punti dove l'esecutrice si sente debole**, non quelli dove è sicura, e si chiede
esplicitamente di **verificare con numeri le affermazioni del messaggio di commit**.
