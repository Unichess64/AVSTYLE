# Prompt per la chat che eseguirà il Task 6 del piano 3a-1

Sei l'esecutrice del **Task 6** del piano 3a-1 del progetto `salon-scheduler` (agenda per il centro estetico AVStyle).
Lavori in `/Users/nadiaottavi/Desktop/Git/salon-scheduler`, ramo `main`.

## Controllo d'ingresso — prima di qualunque cosa

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
git merge-base --is-ancestor acaf2635d6be8b5328e3aef91c1c2a8b856e6dc1 HEAD \
  && echo "storia lineare" || echo "STORIA RISCRITTA — questo prompt è invalido"
git diff --stat acaf263..HEAD -- supabase tests src
git status --short
git branch --show-current
git log --oneline -1 origin/main
```

Atteso, una riga per comando:

* il primo stampa `storia lineare`: il commit che rende leggibili i tre errori di `79574fe` è ancora nella storia di
  questo ramo. È «docs(3a-1): i tre errori di 79574fe, leggibili senza la git note», e `git log --oneline -1 acaf263`
  lo conferma;
* il secondo **non stampa niente**: dopo la fine del Task 5 nessuno ha toccato `supabase/`, `tests/` o `src/`. Se
  stampa qualcosa, qualcuno ha lavorato sul codice dopo di me e questo prompt è vecchio;
* il terzo non stampa niente tranne `?? .superpowers/` e i due file più vecchi sotto `docs/handoffs/` (datati
  2026-09-18 e 2026-09-22), che sono preesistenti e non si toccano;
* il quarto stampa `main`;
* il quinto: **il ramo è stato pushato il 25/09/2026**, e `origin/main` deve essere a `acaf263` o al commit che
  introduce questo file. Se è indietro di più, qualcuno ha pushato o resettato: fermati.

Il controllo non nomina l'ultimo commit apposta: il commit che introduce questo file sposterebbe HEAD e renderebbe il
controllo impossibile da superare. Il SHA è scritto per esteso perché nel prompt del Task 2 un segnaposto era costato
un commit di correzione.

⚠︎ **Il repo è PUBBLICO** (`github.com/Unichess64/AVSTYLE`) e il ramo è allineato al remoto. Fai `git pull` prima di
cominciare. `git push` **mai** di tua iniziativa: lo decide l'utente, ed è un'azione su un repo pubblico.

Se una qualunque riga diverge, fermati e dillo: non eseguire il Passo 1 e non proporre alternative finché non ti
rispondono.

## Che cosa leggere, prima di toccare qualunque cosa

1. `docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` — l'intestazione, i «Vincoli globali», la
   «Struttura dei file» e tutto il **Task 6** (da `### Task 6` fino a dove comincia `### Task 7`). I vincoli globali
   valgono anche se il task non li ripete. ⚠︎ In testa al Task 6, subito dopo il capoverso sulla destinazione
   assoluta, c'è un blocco `⚠⚠ DA LEGGERE PRIMA DI SCRIVERE LE PROVE` con **tre** cose misurate dalle revisioni del
   Task 5: è la cosa più importante che leggerai oggi, e cambia le tue prove.
2. Dello stesso file, l'appendice **«Esecuzione del Task 5 e revisione (25 settembre 2026)»**, in fondo. Dice che cosa
   il Task 5 ti ha lasciato, quali presìdi restano scoperti con quale danno misurato, quali tre affermazioni del
   messaggio di `79574fe` erano false, e **quali quattro punti deboli dichiarati la misura ha smentito** — quell'ultimo
   elenco vale quanto i reperti.
3. Subito prima, le appendici dei Task 4, 3 e 2: contengono le trappole di processo, di cui **due sono false** e
   segnate come tali (vedi sotto).
4. `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md` (ora **revisione 15**), §4.1 per intero — le regole
   0-11 sono il contratto, e la **regola 6 ha guadagnato il contratto di `p_attesi`**, che è nuovo e ti riguarda
   direttamente — più §4.4 («Controlla», dove c'è il vincolo nuovo su `stato_visita`), §4.5, e le decisioni D3-7,
   D3-15, D3-18, D3-21.
5. `tests/helpers/db.ts`, `tests/helpers/sessioni.ts`, `tests/helpers/fixtures.ts`.
6. `tests/schema/salva-visita.test.ts` (31 prove): è il tuo modello, e le sue **quattro prove della remediation** sono
   quelle che devi imitare per le tue due funzioni.
7. `supabase/migrations/0016_salva_visita.sql` per intero: le tue due funzioni ne copiano le regole 0, 2, 5, 6, 8, 9,
   10, 11. Più `0013_invii_e_cancellate.sql` (`app.apri_invio`, `app.chiudi_invio`, `app.versione`, e il **trigger
   delle cancellate**, che la tua sonda 5 tocca), `0008_orphan_visit.sql` (`zz_delete_orphan_visit`) e
   `0004_visit_appointment.sql` (`appointment_visit_date_fk`, la cascata, i due trigger `touch_updated_at`).

Dichiara all'inizio quali di questi hai letto.

## Che cosa fare

I sei passi del Task 6, in ordine, uno alla volta, spuntando le caselle `- [ ]` nel file del piano man mano che li
chiudi. Il piano contiene il testo completo delle prove e della migrazione: **si trascrive, non si reinventa**. Se una
riga del piano non funziona, fermati e dillo: non aggiustarla di tua iniziativa. (Al Task 4 e al Task 5 questa regola
ha pagato due volte: il Passo 1 del Task 4 prescriveva `asOperator` per due prove che rileggono da un'altra
connessione, e una era verde e completamente muta; e il rimedio che il Task 5 prescriveva per la sua sonda 3 **non
funzionava**, misurato.)

Il task tocca due file nuovi:

* crea `supabase/migrations/0017_sposta_e_cancella.sql`
* crea `tests/schema/sposta-e-cancella.test.ts`

più le prove che il Passo 5 e l'avvertimento in testa al task ti faranno aggiungere. Dichiara file per file quello che
tocchi oltre ai due nuovi. Non anticipare il Task 7 (`controlla_invio`) né il Task 9.

## ⚠︎ Le sei cose che ti faranno perdere tempo se non le leggi ora

### 1. `stato_visita` aveva tre campi che nessuno leggeva, e tu ne TRIPLICHI i consumatori

È il reperto del giro di revisione del Task 5, trovato da tutte e due le revisore da lati diversi, e misurato.

Le tue due funzioni restituiscono `'stato', public.stato_visita(p_visita)` esattamente come `salva_visita`. Alla
consegna del Task 5, dentro `stato_visita`:

| Mutazione | Rosse alla consegna del Task 5 | Dopo la sua remediation |
|---|---|---|
| `'versione', app.versione(a.updated_at)` → costante | **0 su 347** | 2 |
| `'operatrice', a.operator_id, 'servizio', a.service_id` → `null, null` | **0 su 347** | 1 |

Erano i tre campi che non servono a **mostrare** la visita ma a **riscriverla**, e nessuna prova faceva il giro che li
usa. Design 3a §4.4: dopo `modificata_altrove` la scheda «prende lo stato corrente e le sue versioni, che diventano
quelle di partenza». Il Task 5 ha chiuso il buco con una prova sola, *«il giro si chiude: dopo modificata_altrove la
scheda riparte dallo stato e salva»*.

⚠︎ **Le dieci prove del tuo Passo 1 asseriscono `esito` e le righe del database: `stato` non compare in nessuna.**
Aggiungi il giro anche per `sposta_visita_a`, o i tuoi due consumatori nascono senza lettore — e misura che la tua
prova uccida le due mutazioni della tabella qui sopra, non darlo per fatto.

### 2. Il contratto di `p_attesi` è POSIZIONALE, ed è nuovo nella spec

Spec §4.1 regola 6, revisione 15. Il confronto è un `is distinct from` fra due array `jsonb`, quindi posizionale, dove
la spec prima diceva «insieme». Misurato:

| `p_attesi` | esito |
|---|---|
| gli stessi elementi in ordine invertito | `modificata_altrove` |
| `stato.appuntamenti` così com'è (**sei** chiavi) | `modificata_altrove` |
| proiettato su `{id, versione}` e ordinato per `id` | `salvata` |

Il tuo `p_destinazioni` è `[{"id","inizio"}]` e **deve coincidere con l'insieme di `p_attesi`**: se lo confronti con un
`is distinct from` fra array, vale la stessa canonicalizzazione, e **va scritta**. Tre prove del Task 5 la piantano;
renderla insiemistica le fa arrossire, ed è voluto.

### 3. `order by a.id` in `v_correnti` non è ridondante, e l'asse non è quello che sembra

La revisione empirica del Task 5 non riusciva a costruire il danno: gli UPDATE sono HOT, il `ctid` cambia ma l'indice
punta al puntatore vecchio e la scansione conserva l'ordine. **L'asse è l'INSERIMENTO**: creando gli appuntamenti in
ordine di `id` decrescente, l'ordine fisico è l'inverso di quello degli id, e senza `order by` un salvataggio conforme
al contratto rimbalza (misurato: verde sul consegnato, rossa con l'`order by` tolto). Gli id vengono da
`crypto.randomUUID()` sul telefono (§4.4): l'ordine in cui la scheda crea i blocchi non ha **nessuna** relazione con
quello dei loro id. **Copi quella riga in tutte e due le funzioni: copiala con l'`order by`.**

### 4. Il blocco della regola 2 sugli appuntamenti non è presidiato da niente, e tu ne fai tre copie

`perform 1 from public.appointment a where a.visit_id = p_visita order by a.id for update` (`0016:124`). Togliendo
**l'intera riga**: **0 rosse su 347**. Le due prove di concorrenza del Task 5 bloccano la riga della *visita* e quella
della *cliente*, mai un appuntamento. Argomentato (non misurato): il blocco sulla visita, che precede, serializza
comunque i due scrittori. ⚠︎ **Tu copi quella riga in `sposta_visita_a` e in `cancella_visita`: là avrà tre copie e
zero presìdi.** Se scrivi la prova che la uccide, dillo e misurala; se decidi di no, dichiaralo — «senza vittime» è
una misura, «equivalente» è una tesi da argomentare.

### 5. `asOperator` ANNULLA. Ogni prova che scrive e poi rilegge da fuori ha bisogno di `asOperatorCommit`

`inRole` chiude sempre con un `rollback` (`tests/helpers/db.ts`). Il tuo task è tutto scritture, e quasi ogni prova
rilegge da un'altra connessione (`inizi()`), o incatena due invii. Il Passo 1 del Task 6 usa già `asOperatorCommit`
nel suo `crea()`: controlla uno per uno che lo usi **dove serve**, e dove dice `asOperator` chiediti se quella prova
rilegge da fuori. Al Task 4 una prova così era **verde e MUTA**.

⚠︎ **E le asserzioni di stato messe DOPO un rollback sono inerti.** Misurato al Task 5: sette asserzioni «non ha
scritto niente» rileggevano ciò che il setup aveva committato, non ciò che la funzione aveva fatto; tolte tutte e
sette, la suite restava verde. **Spostarle dentro la callback non le salva**, perché l'atomicità di una transazione
PostgreSQL è una proprietà del motore e non del codice consegnato. La forma che morde è quella della prova *«un invio
fallito lascia il codice libero, e lo stesso codice salva al secondo tentativo»*: si asserisce ciò che il **codice**
decide, non ciò che il motore garantisce.

### 6. Il `grant execute … to authenticated` è ridondante: la riga che porta è il `revoke`

Misurato al Task 4 e confermato al Task 5, e vale per tutte le funzioni di questo repo: in `public` c'è un
`alter default privileges` di Supabase — da due concedenti, `postgres` e `supabase_admin` — che concede `EXECUTE` ad
`anon`, `authenticated` e `service_role` su ogni funzione nuova. Conseguenze:

* una sonda che toglie il `grant … to authenticated` dà **0 rosse** ed è **equivalente**, non un presidio mancante:
  non scriverla in tabella come mutismo;
* la riga che porta davvero è `revoke execute … from public, anon`;
* **non esiste nessun audit permanente su `pg_proc.proacl`**: `catalogue-audit.test.ts` enumera `pg_class.relacl` e
  filtra le funzioni su `prosecdef`, quindi le tue due — `invoker` — non le vede nessuno. Scrivi le asserzioni a mano
  per nome di ruolo (`anon`, `public`, `authenticated`) con la gemella positiva accanto, come fanno le quattro prove
  del describe `permessi delle due funzioni nuove` in `salva-visita.test.ts`. Lo stringimento dell'audit è del
  **Task 9**: se ti sembra che valga la pena anticiparlo, **proponilo, non farlo**.

## Vincoli che non si negoziano

* ⛔ **Mai `psql`**: non è installato, e da proprietario scavalcherebbe la sicurezza per riga dando misure false in
  silenzio. Ogni misura si prende con uno script Node che usa `pg`. Se lo script sta fuori dal progetto, importa `pg`
  per path assoluto (`/Users/nadiaottavi/Desktop/Git/salon-scheduler/node_modules/pg/lib/index.js`): altrimenti esce
  con `Cannot find package 'pg'` e sembra un blocco del database.
* ⛔ **`supabase/seed.sql` non si tocca, mai**: `[db.seed]` è attivo e un `db reset --linked` lo eseguirebbe contro il
  progetto ospitato. I quattro utenti `@example.test` restano — deciso in spec §8.5 — e la tua imbracatura ne dipende.
* ⛔ **`git push` mai**, per nessun motivo: il repo è pubblico e il push lo decide l'utente. Il commit del Passo 6 sì.
* **Italiano** in prosa, commenti, nomi delle prove e messaggio di commit.
* **Migrazioni:** solo cifre nel prefisso, e il numero dev'essere libero sul disco **e** non rivendicato da un task
  successivo. **`0017` è il tuo, ed è libero** (verificato: sul disco si arriva a `0016`).
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
  **cinque**; se una non fa vittime, dichiaralo e di' che cosa farebbe davvero in produzione.
* Se Docker non risponde: `open -a OrbStack`, ~30 s, poi `npx supabase start`.

## Le trappole misurate prima di te — non ripeterle

1. **Mai due suite sullo stesso database.** Due `npm test` insieme danno 110-114 prove rosse con
   `duplicate key value violates unique constraint` dentro `seedFixture`, e una suite ferma oltre dieci minuti.
   Sintomo diagnostico: se **nessun** file di prova completa, non è il codice. ⚠︎ `pgrep -f vitest` è troppo largo:
   nel Task 2 ha dato tre falsi positivi su processi di `chessbooking`, un altro progetto della stessa macchina. Usa
   `pgrep -fl vitest | grep salon-scheduler`.
2. ⚠︎ **Il ripristino di un file NON ripristina il database.** Ripreso in flagrante durante la remediation del Task 5:
   file ripristinato e verificato per `shasum`, suite rossa, e la causa era la funzione mutata ancora viva nel
   database. Dopo aver rimesso a posto una migrazione serve un `db reset` **prima** di rimisurare. E per un file non
   tracciato il ripristino si fa da una copia di scorta, non con `git checkout --`, che lo cancellerebbe.
3. **Una sonda su codice con stato residuo nel database si misura dopo un `db reset`.** Nel Task 2 una mutazione
   appariva innocua solo perché le righe della passata precedente erano ancora lì.
4. **Una mutazione che rompe il `beforeEach` dà prove SALTATE, non rosse:** restringi la mutazione al ramo della sola
   prova bersaglio, e dichiara che l'hai ristretta. ⚠︎ E una mutazione può essere **sovradeterminata**: al Task 5 la
   sonda 1 nella forma letterale del piano dava 9 rosse di cui **8 collaterali**, perché spostava anche altro. Se una
   sonda fa più vittime di quella nominata, restringila e riporta **entrambi** i numeri.
5. ⚠︎ **La sonda 5 del tuo Passo 5 tocca il trigger del Task 1**, non il tuo file. Mutare una migrazione **superata**
   per provare un presidio può lasciare la suite verde e fabbricare un reperto che non esiste: cerca prima l'ultima
   migrazione che **ridefinisce** quell'oggetto, e muta quella.
6. **Attenzione al profilo.** Chiediti sempre con quale profilo gira la prova. Una prova che gira da `asOwner` non vede
   né la sicurezza per riga né la chiusura immediata, perché il proprietario le scavalca. Nel Task 1 cinque prove
   giravano tutte da `asOwner` e non potevano accorgersi della perdita del `security definer`.
7. **Un censimento si fa con una spia, non con un `grep`.** Misurato nel Task 3: censire «quali prove passano per X»
   spezzando i file per `it(` e cercando `X` nel testo del blocco dava **18** prove; strumentando la funzione con una
   spia sul nome della prova ne dava **98**, e i verdi silenti erano 27 e non 16. La regex perde ogni prova che chiama
   `X` tramite un aiuto del file. Al Task 5 la spia ha dato 158 chiamate su 27 prove, e lo scarto col `grep` era 2
   contro 4.
8. **Un irrobustimento standard può disarmare il presidio.** Misurato al Task 4: asserire la precondizione dentro una
   prova l'ha resa sovradeterminata e ha fatto scendere le rosse da 2 a 1. Dopo un irrobustimento si **rimisurano** le
   rosse della mutazione che quella prova deve uccidere: se scendono, hai fatto danno. (Al Task 5 lo stesso gesto
   **non** ha disarmato: 1 rossa prima e dopo. Non è una regola, è una misura da rifare ogni volta.)
9. ⚠︎ **DUE trappole registrate nel piano sono FALSE, ed è scritto in sede.** L'appendice del Task 2 diceva «Vitest
   esegue i file in parallelo» e ne deduceva che nessuna prova può contare righe globali: `vitest.config.ts:6-7` ha
   `pool: 'threads'` con `singleThread: true`, i file girano **in serie**. E la regola «due passate per finestra di
   cinque minuti» è smentita da **378 accessi in 107 secondi senza un `429`**. Se trovi altrove quelle formule, non
   riscrivere prove valide per obbedirle.
10. ⚠︎ **Una lettura concorde non è una misura.** Al Task 5 la consegna dichiarava «8 rosse» per una sonda, la
    revisione a secco lo ha **confermato contandolo a lettura**, e la misura ne ha date **9**. Due letture indipendenti
    possono condividere lo stesso modello sbagliato del codice. Prima di scrivere un numero nel messaggio di commit,
    chiediti se l'hai **misurato** o **dedotto**.

## Che cosa ti ha lasciato il Task 5

**Quattro commit:** `79574fe` (consegna, con una `git note` che corregge i suoi tre numeri falsi), `970b68c`
(remediation dopo due revisioni avversariali in parallelo), `1ee6502` (l'appendice, che è quella che leggi tu) e
`acaf263` (i tre errori resi leggibili senza la nota).

Esistono ora `public.salva_visita(uuid,uuid,uuid,jsonb,date,jsonb,text,jsonb)` e `public.stato_visita(uuid)`, con 31
prove in `tests/schema/salva-visita.test.ts`. La spec 3a è a **revisione 15**: §4.1 regola 6 ha il contratto di
`p_attesi`, §4.4 ha il vincolo su `stato_visita` `stable`, e l'elenco degli errori ha un capoverso «aperto».

**Baseline verificata a `acaf263`, eseguita in serie:** `npx supabase db reset` senza righe `Skipping migration`;
`npm test` → **23 file, 351 prove verdi**; `npm run test:fuso` → 4 file, **96 verdi**; `npx tsc --noEmit` → uscita 0.

**Presìdi che restano scoperti, con il danno misurato** (tutti nell'appendice del Task 5, nessuno bloccante):

1. **`set constraints … immediate` non è eseguito sui cinque ritorni anticipati**, quindi il vincolo resta differito
   per il resto della transazione: misurato, un `23505` successivo arriva al **COMMIT** invece che all'istruzione.
   Irraggiungibile oggi (PostgREST: una chiamata per transazione) e **non esercitato dal Task 11**. ⚠︎ **Ti riguarda:**
   `sposta_visita_a` ha lo stesso `set constraints` in testa e gli stessi ritorni anticipati. Non è un difetto da
   correggere qui — ma non scrivere che il Task 11 lo presidia, perché è falso.
2. **`P0003` e `22023` viaggiano fuori dall'elenco di errori** di §4.1 e §4.3 passo 8, insieme a `23502` e `22P02`.
   Scritto nella spec come aperto, da chiudere prima del 3a-2. Le tue funzioni ereditano `P0003` da
   `app.apri_invio`/`app.chiudi_invio`.
3. **Il blocco della regola 2 sugli appuntamenti non è presidiato** (0 rosse su 347) — vedi l'avvertimento 4.
4. **`case when v.id is null then null` in `stato_visita` è irraggiungibile**, e `case when v_registrato = 'annullato'`
   è un'identità. Non sono difetti: sono righe che un lettore futuro potrebbe credere portanti. Il piano scrive già la
   forma nuda per `sposta_visita_a`: **tienila nuda**.
5. **Nessun audit permanente su `pg_proc.proacl`** — vedi l'avvertimento 6. Ti riguarda: crei due funzioni.
6. **`salva_visita` non è presidiata sotto `40P01`** né con più di due appuntamenti in modifica, benché misurato che si
   comporti correttamente in tutti e due i casi. Spec §10.5 dà `40P01` per atteso.
7. Dal Task 4: la forma a tre trigger su `operator` non è presidiata e il rientro li spegne per nome; sette prove
   negative senza gemella in `availability`, `occupancy` e `orphan-visit`; l'audit delle politiche è cieco a
   `(select …) or true` (S4-6, assegnato al Task 9). **Non toccarli.**

## Due punti del piano da guardare con sospetto

* **Il Passo 6 fa `git add` di due soli file.** Se ne tocchi di più — e l'avvertimento in testa al task ti farà
  aggiungere prove, e potresti dover toccare la spec o il piano — **nominali uno per uno**. Un `git add` largo porta
  dentro modifiche che non hai dichiarato. Le caselle `- [ ]` del piano che spunti sono una modifica al piano: va nel
  commit, nominata.
* **I numeri del messaggio di commit si misurano, non si ricordano.** Nel Task 3 un messaggio conteneva due numeri
  falsi, e la nota scritta per correggerli ne conteneva altri due, perché rileggeva la misura vecchia invece di
  rifarla. Nel Task 4 erano false due **ragioni**. Nel Task 5 erano falsi due numeri **e** una ragione, e uno dei due
  numeri era stato confermato a lettura da una revisione. Prima di scrivere una ragione, chiediti se l'hai misurata o
  dedotta.
* **Il Passo 4 attende «10 verdi».** Conta le `it(` che hai davvero scritto: se non fanno 10, **non aggiustare il
  numero, dillo**. E ricorda che l'avvertimento in testa al task te ne fa aggiungere almeno una.

## Come chiudere

Fermati dopo il commit del Passo 6 e scrivi un resoconto con:

1. i file creati o modificati e il numero del commit;
2. l'output vero del gate (le quattro voci);
3. la tabella delle sonde di mutazione: mutazione → prova che è arrossita → numero di rosse misurato, comprese le
   prove che hai aggiunto;
4. **che cosa hai fatto del giro di ripresa** (avvertimento 1): la prova che hai scritto, e la misura che dimostra che
   uccide le due mutazioni di `stato_visita`;
5. che cosa hai deciso sul blocco della regola 2 sugli appuntamenti (avvertimento 4), e con quale misura;
6. come hai presidiato i permessi delle due funzioni nuove;
7. tutto ciò che ti ha fatto esitare, o che nel piano era sbagliato o ambiguo;
8. che cosa hai dovuto decidere da sola, e che cosa costa se hai deciso male;
9. l'elenco dei punti dove ti senti debole — serve alla revisione, e ai Task 4 e 5 è stato l'elenco più produttivo di
   tutti. ⚠︎ Al Task 5, **quattro** dei punti deboli dichiarati sono stati **smentiti dalla misura**: dichiarare un
   dubbio non è ammettere un difetto, e quattro dubbi falsi sono stati utili quanto i reperti veri.

Non partire con il Task 7: il piano lo esegue una chat alla volta, con una revisione in mezzo.

## Come si fa la revisione, dopo

Due agenti indipendenti avversariali **in parallelo**, ma con la risorsa condivisa **partizionata**: c'è un solo
database locale, e due revisore che lanciano la suite insieme producono 110-114 rosse false. Nei Task 2, 3, 4 e 5 ha
funzionato così, e ogni volta ha trovato reperti che né l'esecutrice né una revisione sola avevano visto:

* una **empirica**, proprietaria esclusiva del database e di Vitest, che rimisura le sonde dichiarate e ne inventa di
  nuove, e che ha il compito esplicito di cercare **«una mutazione invisibile oggi e letale al task successivo»** — ai
  Task 3, 4 e 5 questo compito ha prodotto il reperto migliore di tutta la revisione;
* una **a secco**, in sola lettura (file, `git`, `grep`, `tsc --noEmit`, `docker … env`), a cui è **vietato** lanciare
  Vitest o qualunque comando che scriva sul database, e che consegna **ipotesi falsificabili**: ognuna con il comando
  esatto che la proverebbe e l'esito, in numeri, che la confermerebbe. Quelle ipotesi le misura l'orchestratrice dopo.

⚠︎ **La partizione giusta è empirica + a secco, mai due letture:** al Task 5 le due letture concordi hanno sbagliato
insieme lo stesso numero. E quando le due convergono su un reperto **da lati diversi** — una dal contratto, l'altra
dalla mutazione — quello è il reperto vero, e di solito una prova sola lo chiude.

A entrambe si dà l'elenco dei punti dove l'esecutrice si sente debole, **non** quelli dove è sicura, e si chiede
esplicitamente di verificare **con numeri** le affermazioni del messaggio di commit.
