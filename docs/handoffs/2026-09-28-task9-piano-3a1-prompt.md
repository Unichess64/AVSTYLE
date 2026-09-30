# Prompt per la chat che eseguirà il Task 9 del piano 3a-1

Sei l'esecutrice del **Task 9** del piano 3a-1 del progetto `salon-scheduler` (agenda per il centro estetico AVStyle,
Perugia). Lavori in `/Users/nadiaottavi/Desktop/Git/salon-scheduler`, ramo `main`.

Il task si chiama **«l'audit di catalogo si stringe, e la vecchia `move_visit` esce di scena»**. Chiude quattro obblighi
del piano — `PERMESSI-FUNZIONI`, `MIGRAZIONE-SALTATA`, `OUTSIDER-WRITE` e la divergenza L8 dalla spec §4.6 — e non
crea nessun oggetto nuovo tranne una migrazione di sola revoca.

⚠︎ **Questo task è particolare: è l'unico il cui prodotto sono presìdi, non funzionalità.** Un presidio scritto male è
verde e muto, e nessuna schermata si accorgerà mai di lui. Per questo il prompt insiste tanto sulle misure: qui «la
prova passa» e «la prova morde» sono due fatti diversi, e solo il secondo vale.

---

## Controllo d'ingresso — prima di qualunque cosa

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
git merge-base --is-ancestor a63b996 HEAD \
  && echo "storia lineare" || echo "STORIA RISCRITTA — questo prompt è invalido"
git log -1 --format='%s' a63b996
git diff --stat a63b996..HEAD -- supabase tests src package.json
git status --short
git branch --show-current
git log --oneline -1 origin/main
ls supabase/migrations/ | tail -3
ls tests/schema/ | grep -c outsider-write
```

Atteso, una riga per comando:

* il primo stampa `storia lineare`. `a63b996` è **l'ultimo lavoro sul 3a-1**: la seconda correzione al Task 8. Il
  controllo non nomina HEAD apposta — il commit che introduce questo file sposterebbe HEAD e renderebbe il controllo
  impossibile da superare;
* il secondo stampa **esattamente** `fix(3a-1): un riscaldamento che fallisce dia una rossa, non dieci saltate`. Se
  stampa altro, il SHA punta a un commit diverso da quello per cui questo prompt è scritto: fermati;
* il terzo **non stampa niente**: dopo la fine del Task 8 nessuno ha toccato `supabase/`, `tests/`, `src/` né
  `package.json`. I commit fra `a63b996` e HEAD sono **tutti di sola documentazione** — il numero non è scritto qui
  apposta, perché cresce ogni volta che una chat sorella committa un documento. Quello che conta è che **il terzo
  comando resti vuoto**;
* il quarto stampa **quindici righe, e sono esattamente queste** (rimisurate il 30/09/2026, dopo che questo prompt
  è stato committato in `58572fd` — è la ragione per cui non figura più fra gli untracked). ⚠︎ `git status --short`
  elenca **prima** i file tracciati modificati e **poi** gli untracked in ordine di path: la riga ` M` è quindi la
  **prima**, non in mezzo alle altre di `docs/`:

  ```
   M docs/handoffs/2026-09-26-task7-piano-3a1-prompt.md
  ?? .DS_Store
  ?? .superpowers/
  ?? docs/.DS_Store
  ?? docs/handoffs/2026-09-18-salon-scheduler-plan2-handoff.md
  ?? docs/handoffs/2026-09-22-salon-scheduler-plan3-handoff.md
  ?? docs/handoffs/2026-09-28-piano-3a2-prompt.md
  ?? docs/handoffs/2026-09-28-spec-3b-prompt.md
  ?? docs/handoffs/2026-09-28-spec-3c-prompt.md
  ?? docs/handoffs/2026-09-28-spec-piano4-prompt.md
  ?? docs/handoffs/2026-09-28-task8-piano-3a1-prompt.md
  ?? docs/superpowers/specs/2026-09-28-piano-3c-la-preparazione-design.md
  ?? docs/superpowers/specs/2026-09-28-piano-4-dati-personali-design.md
  ?? supabase/.DS_Store
  ?? tests/.DS_Store
  ```

  ⚠︎ **Nessuna di queste righe si tocca e nessuna entra nel tuo commit.** In particolare:
  — ` M docs/handoffs/2026-09-26-task7-piano-3a1-prompt.md` è una modifica **dell'utente** lasciata in albero di
  proposito, nota da prima del Task 8: **non tua, non si committa, non si tocca**;
  — le **due spec sotto `docs/superpowers/specs/`** appartengono ad altre due chat che hanno finito di scrivere:
  **non si committano e non si sovrascrivono**;
  — i prompt dei Task 8 e del 3a-2 restano untracked; **questo file no**, è committato in `58572fd`.

  **Divergenze innocue, che NON fermano:**
  — righe untracked in **meno** sotto `docs/handoffs/` o `docs/superpowers/specs/`: l'utente o una chat sorella le ha
  committate nel frattempo. È già successo il 28/09 con l'handoff;
  — una riga `?? …/.DS_Store` in **più**, in qualunque cartella — `supabase/`, `src/`, `tests/` comprese: la scrive il
  Finder aprendo una finestra, non è un segnale;
  — `?? .superpowers/` presente o assente.

  **Divergenze che fermano:** qualunque riga che nomini un file `.sql`, `.ts`, `.tsx`, `.json` o `.toml` sotto
  `supabase/`, `tests/`, `src/`, oppure `package.json`. ⚠︎ La distinzione è deliberata: un controllo che grida a ogni
  `.DS_Store` viene spento dopo il secondo falso allarme, e da lì in poi non presidia più nemmeno il caso vero;
* il quinto stampa `main`;
* il sesto stampa `ee2a679 fix(3a-1): «Controlla» dopo le due revisioni, e un criterio di misura vacuo`. `origin/main`
  è **indietro di una decina di commit** rispetto a `main` (10 al 29/09): è normale e voluto, l'utente non ha ancora
  pushato, e il numero cresce da sé. Se risultasse **più avanti** di HEAD, qualcuno ha pushato o resettato: fermati;
* il settimo stampa `0017_sposta_e_cancella.sql`, `0018_controlla_invio.sql`, `0019_annunci.sql`. **`0020` è libero sul
  disco ed è tuo** (`0021` è rivendicato dal Task 10: non usarlo);
* l'ottavo stampa `0`: `tests/schema/outsider-write.test.ts` non esiste ancora, lo crei tu. ⚠︎ Se stampa `1` qualcuno ha
  già cominciato questo task: fermati e chiedi.

⚠︎ **Il repo è PUBBLICO** (`github.com/Unichess64/AVSTYLE`) — scelta informata dell'utente, non riproporla. `git push`
**mai** di tua iniziativa: lo decide l'utente.

Se una qualunque riga diverge, fermati e dillo: non eseguire il Passo 1 e non proporre alternative finché non ti
rispondono. *(Ai Task 7 e 8 questo controllo ha intercettato due volte uno stato d'albero inatteso, e chiedere è
costato un giro invece di un commit sbagliato.)*

---

## ⚠︎ Il Task 8 NON ha lasciato un'appendice, e questo cambia come ti informi

Ogni task da 1 a 7 ha in fondo al piano un'appendice «Esecuzione del Task N e revisione». **Per il Task 8 quella
appendice non è stata scritta** — misurato: l'ultima appendice del piano è quella del Task 7, e il commit `86d4223` ha
modificato il piano per **sole caselle spuntate** (16 righe). Non è un file che manca: non esiste.

Quindi ciò che il Task 8 ha imparato sta **nei messaggi dei suoi tre commit**, e li leggi per esteso così:

```bash
git show --stat --format='%B' 86d4223 | head -80
git show --stat --format='%B' bc79743
git show --stat --format='%B' a63b996
```

**Quello che ti riguarda, già estratto — e che il messaggio di `86d4223` dichiara come correzioni al piano:**

1. **`app.chiudi_invio` è stata riscritta PER ESTESO** dentro `0019_annunci.sql` (`create or replace`, riga 179), non
   col solo frammento che il piano mostrava: `create or replace function` azzera ogni attributo non ripetuto, e senza
   `security definer` + `search_path = ''` ogni scrittura di visita sarebbe fallita. **Perché ti riguarda:** la tua
   prova `DEFINER_PER_AUTHENTICATED` la conta fra le sei, ed è l'unica funzione dell'elenco che esiste in **due sedi**
   (`0013:126` e `0019:179`). Se un giorno arrossisce, la sede viva è la **seconda**.
2. **`grant select on table annuncio to anon, authenticated`** (`0019:58`) — aggiunto, e **chiude** una fuga invece di
   aprirla: senza quel grant Realtime consegna a chi ha la sola chiave pubblica un guscio vuoto per ogni inserimento,
   cioè il **fatto** che il salone ha appena scritto e a che ritmo. Con il grant: zero messaggi. **Perché ti riguarda:**
   è un `grant` ad `anon` su una tabella nuova, e la tua prova sui privilegi di tabella deve **non** inciamparci —
   `SELECT` ad `anon` su `annuncio` è voluto e presidiato dalla politica per riga.
3. **Un `beforeAll` di riscaldamento** in `annunci.test.ts`: il primo canale aperto su `annuncio` dopo un `db reset` non
   consegna (misurato su sei tentativi: 0, 1, 1, 1, 1, 1). `a63b996` l'ha poi reso capace di dare **una rossa e non
   dieci saltate**. **Perché ti riguarda:** se il tuo gate mostra prove **saltate** in `annunci.test.ts`, non è colpa
   tua e non è il tuo task — ma va **riportato**, perché saltate e verdi non sono la stessa cosa.
4. Due numeri del piano nel Task 8 erano sbagliati e sono stati corretti **in sede**: le rosse attese al suo Passo 4
   erano 7 e sono **10**, e la sua sonda 2 non aveva vittime in nessuna delle due letture separate. Non ti serve per
   eseguire; ti serve per sapere che **in questo piano i numeri attesi sono spesso sbagliati, e si misurano**.

---

## La baseline da cui parti

**Misurata il 28/09/2026 fra le 15:36:43 e le 15:37:40 sull'albero `a9c4996`.** ⚠︎ HEAD si è spostato da allora
(`ad30ee9`, il passaggio di consegne), ma **solo** per commit di documentazione: il terzo comando del controllo
d'ingresso — `git diff --stat a63b996..HEAD -- supabase tests src package.json` — resta **vuoto**, ed è quello che
rende valida questa baseline:

* `npm run db:reset` → applica fino a `0019_annunci.sql`, semina, riavvia i container, stampa
  `Finished supabase db reset on branch main.`, **uscita 0**, **nessuna riga `Skipping migration`**;
* `npm test` → **`Test Files 26 passed (26)`** e **`Tests 412 passed (412)`**, **zero rosse, zero saltate**, ≈ 57 s,
  uscita 0.

**Non rimisurate il 28/09 alle 15:36** — vengono dal gate del Task 8 (`86d4223`, la mattina del 28/09) e sono quindi
`[da verificare]` per te: `npm run test:fuso` → 4 file, **96 verdi**; `npx tsc --noEmit` → uscita 0. Le misuri tu al
Passo 5 e **scrivi i numeri che ottieni**, non questi.

⛔ **L'esito si riporta con rosse, saltate e denominatore, mai col colore.** Una mutazione che rompe una fixture dà
**saltate**, non rosse, e non dimostra niente.

---

## Che cosa leggere, prima di toccare qualunque cosa

1. `docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` — l'intestazione, i **«Vincoli globali»**, la
   **«Struttura dei file»**, e tutto il **Task 9** (da `### Task 9`, riga 4147, fino a `### Task 10`, riga 4549). I
   vincoli globali valgono anche se il task non li ripete. Il testo del Task 9 è anche in **appendice a questo
   prompt**, estratto byte per byte dal piano: se le due copie divergessero, **vince il piano**.
2. Dello stesso file, l'appendice **«Esecuzione del Task 7 e revisione (27 settembre 2026)»** (riga 6488) — l'ultima che
   esiste — e in particolare le sue sezioni «⚠︎ Il `grant execute … to authenticated` NON è ridondante qui: 19 rosse»
   (6617), «⚠︎ Il criterio di durata del Passo 4 era vacuo» (6599) e «Reperti aperti, con il danno misurato» (6647):
   **il primo dei reperti aperti del Task 7 è proprio il tuo task** («`controlla_invio` è `invoker` e nessun audit
   permanente la vede — lo stringimento è del Task 9»).
3. Le appendici dei Task 6, 5, 4, 3 e 2. ⚠︎ **Due trappole registrate nel piano sono FALSE** e segnate come tali.
4. `tests/schema/catalogue-audit.test.ts` **per intero** (216 righe, **7** prove — righe 5, 18, 40, 66, 129, 180, 204;
   nessun `it.each`, nessun `test(`): è il file che stringi, e i suoi commenti
   portano tre misure che ti servono — perché `information_schema.role_table_grants` è **cieca a MAINTAIN**, perché le
   due query usano `left join pg_roles` con `coalesce(r.rolname, 'PUBLIC')`, e perché un `grant … to public` (grantee
   OID 0) sfugge a un inner join.
5. `tests/schema/write-functions.test.ts` **per intero** (423 righe): `describe('move_visit')` (righe 55–215) e
   `describe('write function privileges')` (382–423).
6. `supabase/migrations/0010_write_functions.sql` — dove `move_visit` è definita (riga 31) e dove sta il suo blocco
   `revoke`/`grant` (216–226). È il file che la tua `0020` corregge **senza** modificarlo.
7. `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md` (**revisione 20**): **§4.1** (perché
   `sposta_visita_a` sostituisce `move_visit`: scarto relativo e nessun controllo di versione — la frase è a riga 175)
   e **§9, riga 1073**, dove è dichiarata la lettura **L8**.
   ⚠︎ **Il §4.6 che elenca `move_visit` fra le quattro funzioni di scrittura NON è in questo file** — il §4.6 del
   design 3a è «Aggiornamento in diretta» e non la nomina. È il §4.6 della **spec madre**
   `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`, **riga 365**: *«The four functions are
   `public.move_visit(uuid, date, integer)`, …»*. Ogni volta che questo prompt o il piano scrivono «la spec §4.6» a
   proposito di L8, intendono **quella**.
8. `tests/helpers/db.ts` e `tests/helpers/sessioni.ts`: `asOwner`, `asOperator`, **`asOperatorCommit`**, `pgCode`,
   `resetData`, `OUTSIDER_AUTH`, `dimenticaSessioni`.

**Dichiara all'inizio quali di questi hai letto.**

---

## Che cosa fare

I **cinque passi** del Task 9, in ordine, uno alla volta, spuntando le caselle `- [ ]` nel file del piano man mano che
li chiudi. Il piano contiene il testo completo delle prove e della migrazione: **si trascrive, non si reinventa.**
Se una riga del piano non funziona, **fermati e dillo**: non aggiustarla di tua iniziativa — tranne dove questo prompt
dice già che va corretta. *(Ai Task 4, 5, 6, 7 e 8 questa regola ha pagato sei volte.)*

Il task tocca:

* modifica `tests/schema/catalogue-audit.test.ts` (**dodici** prove nuove: le nove del Passo 1 più le tre del
  Passo 1-bis)
* modifica `tests/schema/write-functions.test.ts` (le prove che chiamano `move_visit`, più una nuova)
* crea `supabase/migrations/0020_revoca_move_visit.sql` (**solo revoca**, nessun oggetto nuovo)
* crea `tests/schema/outsider-write.test.ts` (4 casi × 4 prove = **16**)
* modifica il file del piano (le caselle spuntate)

**Dichiara file per file** quello che tocchi oltre a questi. **Non anticipare il Task 10 né il Task 11.**

---

## ⚠︎ Passo 1-bis: i tre presìdi che il piano ha rimandato al Task 9 e non ha scritto nei suoi passi

**Deciso dall'utente il 29/09/2026, dopo il giro di revisione: questi tre entrano nel Task 9.** Non sono un'aggiunta
di iniziativa: sono obblighi che i task precedenti hanno **rimandato qui per nome**, e che né il testo del Task 9 né
la revisione precedente di questo prompt avevano raccolto. Il Task 9 dichiara nelle sue *Interfaces* di chiudere
`PERMESSI-FUNZIONI`: senza questi tre, **chiude un presidio che non ha scritto**.

**1. L'uguaglianza esatta della forma delle politiche.** La Struttura dei file (piano, riga 70) assegna a
`catalogue-audit.test.ts` «**uguaglianza esatta delle politiche**», e il reperto **S4-6** del piano ne misura il danno:
l'audit di oggi (`catalogue-audit.test.ts:40`) usa `not like '%is_active_operator%'`, cioè una sottostringa, ed è
**cieco a `(select app.is_active_operator()) or true`**. Spalancando `salon_closure_access` l'audit resta **verde** e
arrossisce **una sola** prova di comportamento.

Misurato il 29/09 sul catalogo: in `public` ci sono **16 politiche**, e le loro espressioni `polqual`/`polwithcheck`
hanno **una sola forma distinta**, che compare **28 volte**:

```
( SELECT app.is_active_operator() AS is_active_operator)
```

Forma della prova: per ogni politica di `public`, ogni `pg_get_expr(polqual, …)` e `pg_get_expr(polwithcheck, …)` non
nullo dev'essere **uguale** — `===`, non `like` — a quel letterale; e il numero di politiche esaminate dev'essere
**esattamente 16**, così che una politica cancellata arrossisca invece di essere assorbita. ⚠︎ Poi **rileggi la vecchia
prova col `not like`** e dichiara se la togli o perché resta.

**2. Il presidio su `schemas` in `config.toml`.** L'appendice del Task 1, punto 4, dice: `schemas = ["public",
"graphql_public"]` è «l'**unico** vero presidio dietro l'irraggiungibilità delle funzioni `app`, e **nessuna prova lo
pianta**. Da portare al Task 9». Misurato: nel repo compare a `supabase/config.toml:13`, e in `tests/` **solo dentro
un commento**. La stessa appendice misura il danno: «un account estraneo con sessione `authenticated` eseguirebbe
`app.apri_invio` e **brucerebbe il codice di un'altra**, se lo schema fosse esposto».

Forma della prova: legge `supabase/config.toml`, isola la sezione `[api]`, e asserisce che `schemas` sia
**esattamente** `["public", "graphql_public"]`. ⚠︎ Il percorso dev'essere relativo alla radice del repo, come già fa
`access-control.test.ts:24`.

**3. L'elenco nominativo delle `security definer`.** Appendice del Task 1, punto 5: il filtro `where p.prosecdef` in
`catalogue-audit.test.ts:73` è «da sostituire con un elenco nominativo delle funzioni che **devono** essere
`security definer`. Da portare al Task 9». ⚠︎ `DEFINER_PER_AUTHENTICATED` **non** è quell'elenco: è un insieme
diverso e più piccolo — le 6 chiamabili da `authenticated`, coi trigger esclusi. Misurato: le funzioni `prosecdef` in
`public` + `app` sono **14**, quindi **otto** oggi non sono piantate da nessuna prova.

E fra quelle otto c'è `app.registra_visita_cancellata`, il cui `definer` perduto era il **bloccante** della revisione
del Task 1: «ogni *Elimina visita*, ogni *Togli* sull'ultimo servizio e ogni cancellazione di cliente fallirebbero con
`42501` per le operatrici vere **con la suite tutta verde**».

Forma della prova: un terzo elenco `DEFINER_DICHIARATE` con tutte e **14**, trigger compresi, ciascuna con la sua
ragione scritta accanto, confrontato con `select … where prosecdef` **senza** il filtro `prorettype <> 'trigger'`.

⚠︎ **Tutti e tre i numeri — 16, 28, 14 — misurali tu prima di scriverli**, e se non tornano **dillo invece di
aggiustarli**: sono stati presi il 29/09 e il catalogo può essere cambiato. E ciascuna delle tre prove nuove vuole la
sua sonda, come le altre: una politica allargata con `or true`, un `schemas` con uno schema in più, una `definer`
tolta dall'elenco.

---

## ⚠︎⚠︎ Le nove cose misurate che il piano non sa, e che ti faranno perdere tempo o produrre un presidio muto

Tutte misurate il 28/09/2026 leggendo i file al commit `a9c4996`. Nessuna è un'opinione.

### 1. I tre elenchi del Passo 1 sono GIÀ CORRETTI, e il Passo 2 ti dice il contrario

Il Passo 2 scrive: *«Atteso: rossa «ha esattamente queste funzioni security definer…» finché gli elenchi non
corrispondono al catalogo vero.»* **È probabilmente falso**, e il piano lo ha scritto il 23/09 prima che i Task 1–8
esistessero.

Misurato leggendo **ogni** blocco `revoke execute` / `grant execute` di tutte e venti le migrazioni:

* ogni funzione nuova dei Task 1–8 porta il suo `revoke execute … from public, anon` — `0013:214`, `0015:125`,
  `0016:318`, `0017:262`, `0018:171`, `0019:160`. Nessuna resta eseguibile da `anon`;
* `app.chiudi_sessioni_di(uuid)` è `definer` e **non** è granted ad `authenticated`: sta in schema `app`, dove il
  `revoke … from public` toglie anche l'EXECUTE implicito di PostgreSQL (misurato al Task 7: 19 rosse). Correttamente
  **assente** da `DEFINER_PER_AUTHENTICATED`;
* le sei `definer` non-trigger chiamabili da `authenticated` sono **esattamente** le sei dichiarate;
* l'unica funzione di `public`/`app` senza `search_path` è `app.touch_updated_at` (0004): l'unica dichiarata. Le
  quattro funzioni di `0010` usano `set search_path = public, pg_catalog`, che è la ragione per cui la query del piano
  accetta quel secondo letterale;
* nessuna funzione impone `default_transaction_isolation` (misurato: zero occorrenze in `supabase/migrations/`);
* i trigger non interni su `public` sono **17** — misurati sul **catalogo**, che è la sede che la prova interroga.
  ⚠︎ Un `grep 'create trigger'` sulle migrazioni ne dà **14**, e il 14 è falso: perde le tre `create constraint
  trigger` (`zz_touch_client_activity` ×2 in `0007`, `operator_lockout_guard` in `0009:97`). È la classe «censimento
  con la spia sbagliata» già misurata in questo progetto. `toBeGreaterThan(10)` regge largamente — ma se ne contassi
  meno di 11, **non abbassare la soglia: dillo**.

**Che cosa fare con questa informazione:** esegui e **misura**. Se gli elenchi passano al primo colpo, quello è il
risultato e va **riportato come tale** — con una conseguenza da scrivere nel resoconto: un audit che passa subito non ha
**scoperto** niente, ha messo un **lucchetto**. Il suo valore è tutto nel futuro, e si dimostra solo con le sonde del
test-audit (togli una voce dall'elenco → una rossa; aggiungi un `grant` → una rossa).

⚠︎ **E se una prova è rossa, la correzione NON è allargare l'elenco.** Prima capisci **perché** una funzione ci è
finita; poi scegli fra due rimedi, e **dichiara quale**: (a) la voce è legittima → si aggiunge all'elenco **con la sua
ragione scritta accanto**, come il piano fa per le sette già dichiarate; (b) la voce è un `revoke` dimenticato dai
Task 1–8 → **il rimedio è la revoca, e la sede è la tua `0020`**, non l'elenco. Non modificare una migrazione già
applicata **come rimedio permanente**: `0020` è l'ultima ed è tua.

⚠︎ **Le sonde sono l'unica eccezione, ed è esplicita:** mutano una migrazione o il catalogo **temporaneamente**, e ogni
ripristino è seguito da `npx supabase db reset` **prima** di rimisurare. Nessuna mutazione di sonda entra nel commit —
verificalo con `git status --short -- supabase tests` prima del Passo 5. Senza questa deroga scritta, la sonda 10 — che
questo prompt chiama «la sonda che conta più di tutte» — non verrebbe eseguita.

### 2. Il letterale `'search_path=public, pg_catalog'` va verificato, non assunto

La query accetta `s = 'search_path=""'` **oppure** `s = 'search_path=public, pg_catalog'`, cioè un confronto **esatto**
su come Postgres ha normalizzato `proconfig`. Se lo spazio dopo la virgola, le virgolette o l'ordine non coincidono con
quello che il catalogo contiene davvero, la prova arrossisce con **quattro** voci di troppo (le quattro funzioni di
`0010`) e la tesi «mancano il search_path» è **falsa**.

Prima di toccare l'elenco, leggi il valore vero con uno script Node:
`select proname, proconfig from pg_proc where proname = 'move_visit'`. **Se il letterale è diverso, si corregge il
letterale**, non `SENZA_SEARCH_PATH_DICHIARATE`.

### 3. La prova su TRUNCATE/MAINTAIN è un DOPPIONE più debole di una che esiste già

Il Passo 1 aggiunge *«non lascia ad anon o authenticated TRUNCATE o MAINTAIN sulle tabelle nuove»*. Ma
`catalogue-audit.test.ts` ha **già** *«grants no table truncate, references or trigger to anon/authenticated, and no
insert/update/delete to anon»*, che copre `TRUNCATE`, `REFERENCES`, `TRIGGER` **e** `MAINTAIN`, su **tutte** le tabelle,
per `anon`, `authenticated` **e `PUBLIC`**.

E la versione nuova è **strettamente più debole**: usa `a.grantee::regrole::text in ('anon','authenticated')`, mentre un
`grant … to public` è memorizzato con grantee **OID 0**, che non è `anon` né `authenticated`. È esattamente il punto
cieco che una re-revisione ha già misurato dal vivo su questo file — `grant maintain on client to public` seguito da un
`lock table client in access exclusive mode` come `anon` **riusciva** con l'audit verde — e che la prova esistente ha
chiuso con `left join pg_roles` + `coalesce(r.rolname, 'PUBLIC')`.

⚠︎ **E il rimedio che viene in mente per primo NON ripara niente.** Misurato il 28/09 su banco e sul database del
progetto: **`0::regrole::text` vale `'-'`, non `'PUBLIC'`**. Quindi aggiungere `'PUBLIC'` alla lista `in (…)` su
`a.grantee::regrole::text` lascia la prova **esattamente cieca com'era**. L'unica forma che vede il grant a `PUBLIC` è
`left join pg_roles r on r.oid = a.grantee` con `coalesce(r.rolname, 'PUBLIC')`, che è già quella della prova
esistente. *(Tre lenti indipendenti hanno misurato questo numero, ed è il reperto su cui sono convergite.)*

**Non trascriverla alla lettera.** Scegli, **dichiarando la scelta e la ragione**: (a) **non la aggiungi**, perché
sussunta dalla prova esistente — e allora **dimostralo con una sonda**: aggiungi `grant truncate on annuncio to anon`,
verifica che la prova esistente arrossisca, ripristina, `db reset`, rilancia; oppure (b) la aggiungi **riscritta** col
`left join pg_roles` e la piegatura di `PUBLIC`, e spieghi che cosa aggiunge alla sorella. ⛔ **Quello che non si fa è
aggiungere la forma del piano così com'è:** sarebbe un secondo audit che sembra presidiare e non presidia la forma di
grant più probabile.

⚠︎ **Il criterio per scegliere, che non è di gusto:** esegui **prima** la sonda 11. Se `grant truncate on annuncio to
anon` fa arrossire la prova esistente, la sussunzione è **misurata** e la scelta è **(a)** — non aggiungi niente, e
riporti la sonda come prova. Solo se la prova esistente resta **verde** si passa a (b), e in quel caso la prova nuova
nasce già col `left join pg_roles`.

### 4. Il «9 prove» del piano è GIUSTO: quello che manca è la sede, non il numero

⚠︎ **Una revisione precedente di questo prompt accusava il piano di avere un numero irriproducibile. L'accusa era
falsa, ed è stata ritirata il 29/09 dopo che tre lenti indipendenti e l'orchestratrice hanno misurato la stessa
cosa.** Lo scrivo qui perché il difetto che ti prepari a cercare **non esiste**, e in questo progetto le auto-accuse
sono una classe con molti falsi: la falsa manda qualcuno a cercare un difetto che non c'è.

Il Passo 3 dice *«le **9 prove** che la chiamano diventano prove sul comportamento della funzione da proprietario
(`asOwner`)»*. Misurato in `tests/schema/write-functions.test.ts` al commit `a9c4996`:

* `describe('move_visit')` (righe 55–215) ha **8** `it(`: righe 57, 62, 74, 95, 136, 166, 198, 204 — e tutte e otto
  chiamano `move_visit`;
* la **nona** chiamante è l'istanza `move_visit` di `it.each(SIGNATURES)('refuses %s to an unauthenticated caller')`
  (`:420`), che esegue davvero `select move_visit(null, null, null)`. **8 + 1 = 9**;
* le altre **due** che la *toccano* senza chiamarla sono `it.each(SIGNATURES)('anon lacks EXECUTE on %s')` (`:412`) e
  `it.each(SIGNATURES)('authenticated has EXECUTE on %s')` (`:416`). **9 + 2 = 11**.

E il conto è già scritto in un documento fratello: `2026-09-22-piano-3a-il-giorno-design.md`, **riga 343** — *«oggi la
chiamano **9 prove** e **11 la toccano**»*.

**Quello che il piano davvero non nomina è la SEDE:** il `describe('write function privileges')` (382–423), dove sta
la nona insieme alle altre due. È lì che il Passo 3 deve arrivare, ed è lì che nasce il lavoro sullo `SIGNATURES`
spaccato (punto 5.4).

⚠︎ **E l'imbracatura delle otto non è quella che il piano lascia intendere.** Misurato riga per riga:

* usano `asOwner` **tre**: 57, 74, 198;
* usano `asOperator` **due**: 62 (`VERA_AUTH`) e 204 (`OUTSIDER_AUTH`) — **sono le sole due che cambiano identità**;
* **tre — 95, 136, 166 — aprono la connessione con `connect()` e gestiscono da sé `begin`/`commit` in un
  `try/finally`**, perché misurano un comportamento **dentro** una transazione esplicita (il `set constraints …
  deferred`, la collisione dentro la transazione, `last_activity_at` differito al commit). ⛔ **Non convertirle a
  `asOwner` e non toccarle**: avvolgerle cambierebbe proprio la cosa che misurano.

### 5. La revoca rompe TRE cose, e due di esse sono una COPPIA dichiarata

Dopo `revoke execute … from authenticated`, misurato per lettura:

| Sede | Prova | Che cosa succede |
|---|---|---|
| `write-functions.test.ts:62` | `is callable by the application role` — chiama da `asOperator(VERA_AUTH)` | **rossa**: `42501`. È la prova che il Passo 3 sostituisce con la sua nuova |
| `write-functions.test.ts:204` | `raises P0002, not a silent success, when the caller cannot see the visit` — chiama da `asOperator(OUTSIDER_AUTH)` | **rossa**: riceve `42501`, non `P0002`. Il piano **non la nomina** |
| `write-functions.test.ts:416` | `it.each(SIGNATURES)('authenticated has EXECUTE on %s')` | **una rossa** sulla riga `move_visit`. Il piano **non la nomina**. ⚠︎ La riga è la **416**: la 419 è vuota, e a 420 c'è `refuses %s`, che invece resta **verde** |

⚠︎ **E la seconda riga è il punto serio di tutto il task.** Il commento di quella prova, alle righe 205–210, dice
letteralmente: *«La sua gemella positiva è `is callable by the application role`, sopra: stessa funzione, stessa
imbracatura, un'operatrice attiva. Senza di lei questo P0002 sarebbe sollevato anche da una sessione morta in cache, e
la prova misurerebbe l'imbracatura rotta (misurato col Task 3).»*

Cioè: le due prove che la revoca rende rosse **sono le due metà di una coppia dichiarata**, e la revoca le uccide
entrambe. E il ramo che quella coppia presidiava — *`move_visit` solleva `P0002` invece di non far niente in silenzio,
quando la sicurezza per riga nasconde la visita a chi chiama* — **non ha più nessun chiamante che possa esercitarlo**:
`asOwner` scavalca la sicurezza per riga, quindi da proprietario la visita è **sempre** visibile.

**Che cosa devi fare, ed è il contrario di cancellare:**

1. **misura la perdita** — è la sonda che conta più di tutte in questo task. Guasta il controllo `FOUND` di
   `move_visit` in `0010` (togli il `raise … P0002`), `db reset`, `npm test`: **quante rosse?** Fallo **prima** della
   tua `0020` e **dopo**. Se il numero scende, hai il numero esatto del presidio che la revoca spegne;
2. **non cancellare la prova del `P0002`**: convertila a `asOwner` col caso che il proprietario **può** ancora
   raggiungere — una visita che **non esiste** — se e solo se non duplica la prova della riga 198, che fa già
   esattamente questo. Se la duplica, **la prova va dichiarata perduta**, non riscritta in una forma che passa;
3. **scrivilo nel resoconto come reperto**, con il numero. È la classe che in questo progetto si chiama *«una prova
   nuova che spegne un rivelatore»*: si **rimisura**, non si assume. La decisione su come chiuderla è dell'utente e
   dell'orchestratrice, non tua: tu porti la misura.
4. **`SIGNATURES` va spaccata in due**: le tre funzioni che `authenticated` può ancora chiamare, e `move_visit` che non
   può più. La prova *«anon lacks EXECUTE on %s»* resta su tutte e quattro; *«refuses %s to an unauthenticated
   caller»* resta verde su `move_visit` (l'anon prendeva già `42501`) — **e quindi non discrimina più niente sulla tua
   revoca**: serve l'asserzione positiva su `authenticated`, che è la sola capace di arrossire.

   ⛔ **Non togliere e basta la riga `move_visit` da `SIGNATURES`**: è la correzione che viene naturale davanti alla
   rossa, e cancella **in silenzio** anche i due presìdi su `anon` che stanno nello stesso elenco. **Forma letterale**,
   perché questa è l'unica modifica di codice del task che il piano non scrive:

   ```ts
   // Le tre che authenticated può ancora chiamare dopo la 0020.
   const SIGNATURES_VIVE: [string, string][] = [ /* le tre esistenti, senza move_visit */ ]
   // Tutte e quattro: anon non deve poterne chiamare nessuna, move_visit compresa.
   const SIGNATURES: [string, string][] = [
     ['public.move_visit(uuid, date, integer)', 'move_visit(null, null, null)'],
     ...SIGNATURES_VIVE,
   ]
   ```

   `anon lacks EXECUTE on %s` e `refuses %s to an unauthenticated caller` restano su `SIGNATURES` (4 istanze ciascuna);
   `authenticated has EXECUTE on %s` passa a `SIGNATURES_VIVE` (3). E si aggiunge la prova nominativa, che è **il vero
   presidio della `0020`** perché interroga il permesso invece del comportamento:

   ```ts
   it('authenticated non ha più EXECUTE su public.move_visit(uuid, date, integer)', async () => {
     expect(await hasExecute('authenticated', 'public.move_visit(uuid, date, integer)')).toBe(false)
   })
   ```

   Totale delle prove di quel `describe`: **invariato a 12**. ⚠︎ La prova *comportamentale* del Passo 3 (`42501` da
   `asOperator(VERA_AUTH)`) **non** è il presidio della revoca: `42501` è anche ciò che risponde una sessione morta in
   cache o un'imbracatura rotta. Scrivilo nel suo commento.

### 6. Il Passo 4 si contraddice, e la seconda metà è quella giusta

Il Passo 4 apre con *«`sposta_visita_a` e `cancella_visita` chiamate da un estraneo **non sollevano niente**: la visita
è invisibile e l'esito è `non_trovata` (misurato)»*, e chiude con *«**Deciso dall'utente il 23/09:** tutte e quattro le
funzioni cominciano con la guardia esplicita, quindi l'esito per un estraneo o per un'operatrice disattivata è **sempre
`42501`**, mai `non_trovata`»*.

**La seconda è quella vera, e la decisione è stata applicata.** Misurato alla sede, riga per riga:

| Funzione | Guardia | Sede |
|---|---|---|
| `public.salva_visita` | `if not (select app.is_active_operator()) then raise … errcode = '42501'` | `0016_salva_visita.sql:102-103` |
| `public.sposta_visita_a` | idem | `0017_sposta_e_cancella.sql:32-33` |
| `public.cancella_visita` | idem | `0017_sposta_e_cancella.sql:197-198` |
| `public.controlla_invio` | idem | `0018_controlla_invio.sql:77-78` |

Quindi la quarta `it` del `describe.each` — *«risponde sempre 42501, mai un esito di dominio»* — è **autorevole**, e il
paragrafo d'apertura descrive un mondo che non esiste più. **Non riscrivere le asserzioni per accomodarlo.**

⚠︎ **E le firme sono quelle che il Passo 4 usa** — verificato una per una: `salva_visita` 8 argomenti,
`sposta_visita_a` 6, `cancella_visita` 4, `controlla_invio` 2. Se una firma fosse sbagliata, Postgres darebbe `42883`,
e **le due prove negative resterebbero verdi** (`42883` non è né `salvata` né `cancellata`, e niente è stato scritto):
sarebbero verdi per il motivo sbagliato. Le smaschera solo la quarta `it`, che pretende **esattamente** `42501`. È la
ragione per cui esiste.

⚠︎ **E la quarta `it` copre solo l'estranea: il ramo dell'operatrice DISATTIVATA non è pinnato da nessuna parte.** Le
sue uniche asserzioni sono `not.toContain(['salvata','cancellata'])` e `dopo === prima`, che **`42883`, `22023` e
qualunque altro errore soddisfano**. Metà della decisione dell'utente del 23/09 resta senza presidio. Rimedio: dentro
`it('non scrive niente per un operatrice disattivata')`, subito dopo `expect(dopo).toEqual(prima)`, aggiungi

```ts
expect(esito).toBe('42501')
```

Il conteggio resta 4 × 4 = 16. ⚠︎ Il danno non è teorico: una disattivata che riceve `non_trovata` invece di `42501`
legge un falso «non risulta» su una visita che esiste, e il token in suo possesso rende quel percorso percorribile.

### 7. Due dettagli meccanici di `outsider-write.test.ts`

* **Non serve un `beforeAll(preparaAccountLocali)`** e il piano ha ragione a non metterlo: `sessioneDi` → `accedi` →
  `preparaAccountLocali()` (`tests/helpers/sessioni.ts:88`), quindi l'imbracatura si prepara da sé al primo accesso. Se
  invece **aggiungessi** un `beforeAll` che può fallire, un suo errore darebbe **16 prove saltate e zero rosse** — la
  trappola che `a63b996` ha appena finito di chiudere nel Task 8.
* **`dimenticaSessioni()` e il ripristino di `is_active` in coda a quella prova sono RIDONDANTI.** ⚠︎ Una revisione
  precedente di questo prompt scriveva il contrario — «`resetData()` ripulisce il database ma **non** la cache dei
  token» — ed **era falso**: misurato, `resetData()` rimette `is_active = true` sulle tre operatrici (`db.ts:241`) e
  **chiude con `dimenticaSessioni()`** (`db.ts:260`). Quindi il `finally` mancante non fa danno. Lasciali o toglili,
  ma **non perderci tempo**: il difetto vero di quella prova è un altro, ed è che non asserisce `42501` (punto 6).

### 8. Le prove nuove del Passo 1 sono `it(` nudi, e il file le vuole dentro il suo `describe`

`catalogue-audit.test.ts` avvolge tutte le sue **sette** prove in un unico `describe('catalogue audit')` (riga 4, chiuso a
216). Il frammento del piano è scritto come `it(...)` di primo livello: trascritto alla lettera finirebbe **fuori** dal
`describe`. Funziona, ma spezza il raggruppamento e rende illeggibile l'output. **Mettile dentro**, e nota che le
costanti (`ESEGUIBILI_DA_ANON` e le altre) vanno dentro o sopra coerentemente.

### 9. ⛔ `controlla_invio` NON restituisce `esito`, e tre delle sue quattro prove nascono mute

**È il reperto più grave trovato dal giro di revisione del 29/09, e non è nel piano.** Misurato:
`public.controlla_invio` ha **un solo** `return` (`0018_controlla_invio.sql:145`), ed è

```sql
return jsonb_build_object('riga', v_riga, 'esito_invio', v_esito, 'stato', v_stato);
```

**Nessuna chiave `esito`.** Ma `prova()` legge `r.rows[0]?.r?.esito`, quindi per `controlla_invio` `esito` è
**sempre** `'valore senza esito'`. Conseguenza, caso per caso:

| Prova | Perché non può arrossire |
|---|---|
| *«non scrive niente per un account che non è operatrice»* | `expect(['salvata','cancellata']).not.toContain('valore senza esito')` è vero per costruzione |
| *«non scrive niente per un operatrice disattivata»* | idem, e `statoDb()` legge `appointment`, dove `controlla_invio` **non scrive mai**: `dopo === prima` è vero comunque |
| *«ma un operatrice attiva sì»* (la **gemella positiva**) | `'valore senza esito' !== 'ignoto'` → verde. E resterebbe verde **anche se `controlla_invio` rispondesse `42501` a un'operatrice attiva**, cioè proprio il guasto che la gemella esiste per vedere |

Il quartetto è tenuto in piedi dalla sola quarta `it`. Il percorso reale del danno: la lettura che un'operatrice attiva
fa del proprio invio comincia a essere rifiutata — una sessione, un claim, un `grant` — e **4 prove su 16 restano
verdi**, mentre il task chiude `OUTSIDER-WRITE` dichiarando presidiata una funzione che non lo è.

**Rimedio, in forma letterale.** In `prova()`, sostituisci le due righe del `try` con:

```ts
      // controlla_invio non restituisce `esito`: il suo unico return (0018:145) è
      // jsonb_build_object('riga', …, 'esito_invio', …, 'stato', …).
      const r = await c.query<{ r: { esito?: string; riga?: number } | null }>(sql, params)
      const v = r.rows[0]?.r
      return v?.esito ?? (v?.riga !== undefined ? `riga ${v.riga}` : 'valore senza esito')
```

Nella gemella positiva, **togli** `expect(esito).not.toBe('ignoto')` — inghiotte qualunque codice d'errore, che è
esattamente il difetto — e dai a `controlla_invio` un'asserzione capace di fallire. Serve il nome del caso, quindi
`_nome` torna `nome` nella firma del `describe.each`:

```ts
describe.each(CASI)('%s', (nome, sql, params) => {
```

```ts
  it('ma un operatrice attiva sì, con la stessa imbracatura', async () => {
    const { esito, prima, dopo } = await prova(VERA_AUTH, sql, params(versioni))
    if (nome === 'controlla_invio') {
      expect(esito).toMatch(/^riga \d+$/)
      expect(dopo).toEqual(prima)
    } else {
      expect(dopo).not.toEqual(prima)
    }
  })
```

⚠︎ **Non ho inchiodato qui il valore di `esito` per le tre funzioni di scrittura** (`'salvata'` per `salva_visita` e
`sposta_visita_a` — misurato `0017:161-164` — e presumibilmente `'cancellata'` per `cancella_visita`): **misuralo tu
alla sede e dillo nel resoconto**. `expect(dopo).not.toEqual(prima)` morde già per tutte e tre, quindi l'asserzione
sull'esito è un rafforzamento, non il presidio. E per le due prove negative vale lo stesso: **ciò che morde è
`expect(dopo).toEqual(prima)`**, non la lista `['salvata','cancellata']`, che per `controlla_invio` è satura e per le
altre ridondante. Non toglierla, ma non contarla come presidio.

---

## Vincoli che non si negoziano

* ⛔ **Mai `psql`**: non è installato, e da proprietario scavalcherebbe la sicurezza per riga dando misure false in
  silenzio. Ogni misura si prende con uno script Node che usa `pg`. Se lo script sta fuori dal progetto, importa `pg`
  per path assoluto (`/Users/nadiaottavi/Desktop/Git/salon-scheduler/node_modules/pg/lib/index.js`): altrimenti esce
  con `Cannot find package 'pg'` e sembra un blocco del database.
* ⛔ **`supabase/seed.sql` non si tocca, mai**: `[db.seed]` è attivo e un `db reset --linked` lo eseguirebbe contro il
  progetto ospitato. I quattro utenti `@example.test` restano, e la tua imbracatura ne dipende.
* ⛔ **`git push` mai**, per nessun motivo. Il commit del Passo 5 sì.
* ⛔ **Non lasciare mai file in stage fra due comandi**: l'indice di git è condiviso, e fra `git add` e `git commit`
  chiunque committi si porta via il tuo lavoro. I due comandi si fanno **insieme**, in un comando solo.
* ⛔ **Non lanciare una seconda suite mentre una gira**: due `npm test` insieme danno 110–114 rosse da
  `duplicate key value violates unique constraint` dentro `seedFixture`, e una suite appesa. Il gate si esegue **in
  serie**. Sintomo diagnostico: se **nessun** file completa, non è il codice. ⚠︎ `pgrep -f vitest` è troppo largo: usa
  `pgrep -fl vitest | grep salon-scheduler`.
* ⛔ **Non toccare `chessbooking` né `unichess-widget`**: sono altri progetti, e al 28/09 erano entrambi vivi.
* **Italiano** in prosa, commenti, nomi delle prove e messaggio di commit. Restano in inglese solo gli identificatori
  già congelati — e in `write-functions.test.ts` i nomi delle prove **esistenti** sono in inglese: le tue nuove righe
  in quel file sono in italiano, come già fa il commento delle righe 205–210.
* **Il `git add` del Passo 5 dice `tests/schema/`, che è troppo largo**: **nomina i file uno per uno**, compreso il
  file del piano con le caselle spuntate. ⛔ **E nel blocco del Passo 5 `add` e `commit` stanno su due righe, in
  contraddizione col vincolo qui sopra**: falli in **un comando solo**, così —

  ```bash
  git add tests/schema/catalogue-audit.test.ts tests/schema/write-functions.test.ts \
          tests/schema/outsider-write.test.ts supabase/migrations/0020_revoca_move_visit.sql \
          docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md && git commit -m "…"
  ```

* ⚠︎ **Il file del piano lo modifichi tu, al Passo 5, e altre chat ci scrivono.** Prima del `git add` rilancia
  `git log --oneline -1 -- docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md`: se il SHA non è
  quello che hai visto al controllo d'ingresso, un'altra chat l'ha toccato — **fermati e chiedi**, non fare merge.
* **Migrazioni:** solo cifre nel prefisso e il modello `<numero>_nome.sql`. `0020` è tuo. Dopo ogni modifica alle
  migrazioni: `npx supabase db reset`, e controlla che **non** compaia nessuna riga `Skipping migration` — un prefisso
  non numerico la fa saltare in **silenzio** e il reset esce **0**.
* ⚠︎ **`00051_privilege_baseline.sql` ha cinque cifre dove tutte le altre ne hanno quattro.** Non «correggerlo»: la tua
  ultima prova del Passo 1 confronta i file sul disco con `supabase_migrations.schema_migrations`, quindi è **la prima
  prova del progetto che guarda quell'ordine**. Se arrossisce, hai trovato qualcosa di vero: **riportalo, non
  rinominare niente.**
* **Ogni prova che asserisce un vuoto** deve avere accanto una prova positiva che la renda capace di fallire. In questo
  task è la regola più importante: **tre delle nove prove nuove asseriscono `toEqual([])`** — isolamento,
  TRUNCATE/MAINTAIN, e la seconda metà di quella sui trigger spenti, che la gemella ce l'ha già incorporata
  (`toBeGreaterThan(10)`). ⚠︎ Le altre sei asseriscono un **insieme esatto** o un oggetto: non sono asserzioni di
  vuoto, e la loro capacità di fallire si dimostra con le sonde 1, 3, 3b, 5, 6 e 7, non con una gemella inventata.
* **Il gate si esegue in serie**, con l'output vero incollato nel resoconto: `npx supabase db reset`, `npm test`,
  `npm run test:fuso`, `npx tsc --noEmit`.
* Se Docker non risponde: `open -a OrbStack`, ~30 s, poi `npx supabase start`. ⚠︎ `db reset` **non** applica le
  modifiche a `config.toml` al GoTrue: serve `npx supabase stop && npx supabase start`.

---

## Le sonde di mutazione: il Task 9 non ne ha in elenco, e ne devi costruire tu

⚠︎ **Il Passo 7 esiste nei Task 1–8 e nel Task 9 NON c'è.** Non è una dispensa: è una lacuna del piano, e su un task
che produce **solo presìdi** è la lacuna peggiore possibile. Un audit enumerativo verde è indistinguibile da un audit
enumerativo spento, e l'unica cosa che li separa è una mutazione.

⚠︎ **Prima della prima sonda, prendi possesso esclusivo del database e dichiaralo.** Le sonde fanno DDL e `db reset`:
basta un'altra chat che lanci la suite perché ogni numero di questa tabella diventi irriproducibile, e non te ne
accorgeresti. Esegui `pgrep -fl vitest | grep salon-scheduler` e `pgrep -fl supabase | grep salon-scheduler`: se
rispondono qualcosa che non è tuo, **fermati e chiedi** — non «aspetta e riprova». Rilancia lo stesso controllo **dopo**
l'ultima sonda e riporta entrambe le uscite: un numero di rosse misurato mentre girava un'altra passata non è una
misura.

Costruisci e **esegui** almeno queste, una per volta, con la disciplina di sempre — applica, lancia, verifica la
rossa, **ripristina, `db reset`, rilancia, verifica il verde** — e riporta il numero di rosse **misurato**:

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | togli una voce da `ESEGUIBILI_DA_ANON` | *«lascia eseguibili da anon esattamente le funzioni dichiarate»* |
| 2 | `grant execute on function public.salva_visita(uuid, uuid, uuid, jsonb, date, jsonb, text, jsonb) to anon` — ⚠︎ la firma **per esteso**: `(…)` non è SQL, e questo prompt esige la forma letterale | la stessa |
| 3 | togli una voce da `DEFINER_PER_AUTHENTICATED` | *«ha esattamente queste funzioni security definer…»* |
| 4 | in `0020`, togli il `revoke` (file vuoto con solo il commento) | *«authenticated has EXECUTE on …»* spaccata, e la prova nuova del Passo 3 |
| 5 | `alter function public.stato_visita(uuid) set search_path = public` — ⚠︎ **una funzione `security invoker`**, non `app.apri_invio`: quella è `definer` e farebbe arrossire **anche** la prova preesistente `catalogue-audit.test.ts:66` (*«pins search_path on every security definer function»*), e non sapresti quale delle due ha morso. Verifica la firma di `stato_visita` prima di usarla | *«non lascia nessuna funzione nuova senza search_path vuoto»*, **da sola** |
| 3b | `alter function public.controlla_invio(uuid, uuid) security definer` — ⚠︎ è **il** caso del reperto aperto del Task 7 (una `invoker` che diventa `definer` senza che nessun audit permanente la veda). Ripristino con `db reset`, **non** con un secondo `alter` | *«ha esattamente queste funzioni security definer chiamabili da authenticated»*. È l'unica sonda **lato-mondo** di quell'elenco: la 3 muta la prova, questa muta il catalogo |
| 6 | `alter function public.salva_visita(uuid, uuid, uuid, jsonb, date, jsonb, text, jsonb) set default_transaction_isolation = 'serializable'` — firma per esteso, e attenzione: dopo l'`alter` ogni chiamata a `salva_visita` può fallire, quindi aspettati **rosse collaterali** in altri file. Ristringi la misura al solo `catalogue-audit.test.ts` e dichiaralo | *«non lascia nessuna funzione a imporre un livello di isolamento proprio»* |
| 7 | `alter publication supabase_realtime set (publish = 'insert, update')` | *«pubblica esattamente la tabella degli annunci, e solo gli inserimenti»* |
| 8 | `alter table appointment disable trigger zz_sync_appointment_slots` — ⚠︎ **il nome è quello giusto, misurato nel catalogo**: il «o il nome vero» era prudenza superflua. Ma spegnerlo disattiva la sincronizzazione di `appointment_slot`: aspettati rosse collaterali, **ristringi al solo `catalogue-audit.test.ts`** e dichiaralo | *«non lascia nessun trigger applicativo spento»* |
| 9 | ⛔ **NON rinominare una migrazione esistente** — il prompt lo vieta due righe più giù, e rinominarne una la fa saltare **davvero**: il suo schema sparisce e ottieni decine di prove **SALTATE**, non una rossa. Forma eseguibile: **aggiungi** `supabase/migrations/zz_prova_saltata.sql` con la sola riga `-- sonda 9: prefisso non numerico, il CLI deve saltarla`, poi `npx supabase db reset` (deve stampare `Skipping migration`). Ripristino: `rm supabase/migrations/zz_prova_saltata.sql && npx supabase db reset` | *«applica ogni file di supabase/migrations»* — ⚠︎ **è la sonda che prova `MIGRAZIONE-SALTATA`**, la cosa che il piano dichiara: *«nessuna prova di questo repo coglie una migrazione saltata»* |
| 10 | togli il `raise … P0002` dal controllo `FOUND` di `move_visit` in `0010` | **la sonda del punto 5 qui sopra**: misurala **prima** e **dopo** la `0020`, e riporta i due numeri |
| 11 | `grant truncate on annuncio to anon` | la prova esistente su TRUNCATE/MAINTAIN — è la sonda che decide il punto 3 qui sopra |
| 11b | `grant truncate on annuncio to public` — ⚠︎ **a `public`, non ad `anon`**: è la forma di grant più probabile e quella che la forma del piano **non vede** (grantee OID 0, e `0::regrole::text` vale `'-'`) | la prova **esistente** deve arrossire; se aggiungessi la forma del piano, **quella** resterebbe verde. È la dimostrazione del punto 3 |
| 12 | `revoke select on table auth.sessions from postgres` — ⚠︎ `postgres` **non** è superuser qui (misurato: `rolsuper = false`, il superuser è `supabase_admin`), quindi la revoca morde davvero. Ripristino con `db reset` | *«lascia al proprietario i diritti su `auth.sessions` da cui dipende la chiusura immediata»* — ⚠︎ **è l'unica delle nove prove nuove che nessuna sonda copriva** |

⚠︎ **Se una sonda non fa vittime, dichiaralo** e di' che cosa farebbe davvero in produzione. Una sonda «ragionata» non
vale: al Task 7 la forma **letterale** di una sonda del piano si è rivelata **non eseguibile**, e al Task 8 due sonde
su otto non avevano la vittima che il piano prometteva.

⚠︎ **Una mutazione che rompe il `beforeEach` dà prove SALTATE, non rosse**: restringila al ramo della sola prova
bersaglio, e **dichiara che l'hai ristretta**.

⚠︎ **Il ripristino di un file NON ripristina il database.** Ripreso in flagrante **tre volte** in questo progetto.
Dopo aver rimesso a posto una migrazione serve un `db reset` **prima** di rimisurare. E ⚠︎ **`git checkout --` cancella
la modifica non committata di un file tracciato e cancella del tutto un file NON tracciato**: il ripristino si fa
**sempre da copia di scorta**, fatta **dopo** aver scritto la mutazione, e lo smaschera un `grep -c` sulla riga mutata,
**non** uno `shasum`. ⚠︎ `grep -c` esce con **1 quando conta zero** e in una catena `&&` la spezza in silenzio.

---

## Le verifiche di fine lavoro — obbligatorie su questo task, non solo a fine piano

Il processo di questo progetto le richiede sul diff, tutte avversariali. Su **questo** task non sono un rito: il task
produce l'audit di sicurezza, quindi è l'unico in cui una prova tautologica sarebbe invisibile **e** lascerebbe il
progetto convinto di essere presidiato.

1. **I gate automatici**, in serie, con l'**output reale incollato** — mai un «passa»:
   `npx supabase db reset` (e **nessuna** riga `Skipping migration`), `npm test`, `npm run test:fuso`,
   `npx tsc --noEmit`. Scrivi **rosse, saltate e denominatore**.

   ⚠︎ **Il denominatore atteso è `Test Files 27 passed (27)` e `Tests 441 passed (441)`**: 412 di baseline + 12
   dell'audit (nove del Passo 1 più tre del Passo 1-bis) + 16 di `outsider-write` + 1 al Passo 3, con le 12 di
   `SIGNATURES` che restano 12. **Se il denominatore
   non è 441, fermati e conta**: un blocco di prove non raccolto — un `describe.each` che non si espande, un import
   che vitest scarta — è **invisibile**, dà zero rosse e zero saltate, e abbassa solo il denominatore. È l'unico
   guasto che questo task non può vedere in nessun altro modo. ⚠︎ Il 441 è **calcolato, non misurato**: se ottieni un
   numero diverso, potrebbe essere sbagliato il mio — riportalo e spiega da dove viene lo scarto, non aggiustare il
   tuo lavoro per farlo tornare.
2. **`/security-review`** sulle modifiche del ramo.
3. **Un test-audit distinto**, con la tabella **mutazione → prova che la uccide**, oppure `NOT CAUGHT`. È l'unica cosa
   che trova «la prova passa per il motivo sbagliato». La tabella delle undici sonde qui sopra è il suo punto di
   partenza, non il suo sostituto: il test-audit enumera **ogni riga toccata dal diff** e la guasta una per volta.
4. ⛔ **`/code-review` NON fa parte di questo ciclo**: l'utente non lo usa. Non aggiungerlo e non sostituirlo al
   test-audit.

**Regola di arresto, per quando arriveranno i reperti:** un finding blocca **solo** se può produrre un danno concreto —
un dato sbagliato, una prenotazione persa, un dato personale esposto — su un percorso che un utente può **davvero
percorrere**, e la raggiungibilità si **dimostra** sui dati e sui flussi veri, non si argomenta. Tutto il resto va in
«limiti noti». Non usare la severità dichiarata da un agente come criterio.

---

## Come chiudere

Fermati dopo il commit del Passo 5 e scrivi un resoconto con:

1. i file creati o modificati e il numero del commit;
2. l'**output vero** del gate (le quattro voci), con rosse, saltate e denominatore;
3. la tabella delle sonde: mutazione → prova arrossita → numero di rosse **misurato**, comprese le sonde che non hanno
   fatto vittime;
4. **gli elenchi dichiarati come sono finiti**: che cosa conteneva ciascuno dei tre alla fine, quali voci hai aggiunto o
   tolto, e **per ciascuna la ragione**. Se un elenco è passato al primo colpo, dillo esplicitamente;
5. **che cosa hai fatto della prova sul `P0002`** (punto 5 qui sopra) e i **due numeri** della sonda 10, prima e dopo
   la `0020`;
6. **che cosa hai deciso sulla prova doppia di TRUNCATE/MAINTAIN** (punto 3), con la sonda 11 a sostegno;
7. tutto ciò che ti ha fatto esitare, o che nel piano era sbagliato o ambiguo — e in questo task il piano ha **almeno
   nove** punti già noti, elencati sopra — più i tre presidi del Passo 1-bis: se ne trovi un decimo, è il reperto
   più prezioso del task;
8. che cosa hai dovuto decidere da sola, e **che cosa costa se hai deciso male**;
9. **l'elenco dei punti dove ti senti debole.** Ai Task 4–8 è stato l'elenco più produttivo di tutti, e al Task 7 tre
   punti deboli dichiarati sono stati **smentiti** dalla misura mentre due sono diventati i reperti principali.
   Dichiarare un dubbio non è ammettere un difetto: è il modo più rapido di trovarne uno vero.

**Non partire con il Task 10.** Il piano lo esegue una chat alla volta, con una revisione in mezzo.

---

## Come si fa la revisione, dopo

Due agenti indipendenti avversariali **in parallelo**, su **Opus**, ma con la risorsa condivisa **partizionata**: c'è un
solo database locale, e due revisore che lanciano la suite insieme producono 110–114 rosse **false**. Nei Task 2–8 ha
funzionato così, e ogni volta ha trovato reperti che né l'esecutrice né una revisione sola avevano visto:

* una **empirica**, proprietaria esclusiva del database e di Vitest, che rimisura le sonde dichiarate e ne inventa di
  nuove, col compito esplicito di cercare **«una mutazione invisibile oggi e letale al task successivo»** — ai Task
  3–7 questo compito ha prodotto il reperto migliore di tutta la revisione. Su questo task le si chiede in più:
  **quante delle dodici prove nuove sono capaci di arrossire?**, una per una;
* una **a secco**, in sola lettura (file, `git`, `grep`, `tsc --noEmit`), a cui è **vietato** lanciare Vitest o
  qualunque comando che scriva sul database, e che consegna **ipotesi falsificabili**: ognuna con il comando esatto che
  la proverebbe, l'esito in numeri che la confermerebbe, **e il rimedio scritto come codice**, non descritto.

⚠︎ **La partizione giusta è empirica + a secco, mai due letture:** al Task 5 due letture concordi hanno sbagliato
insieme lo stesso numero. Quando le due convergono su un reperto **da lati diversi** — una dal contratto, l'altra dalla
mutazione — quello è il reperto vero. ⚠︎ E le due possono **«confermare» e «smentire» la stessa tesi perché rispondono a
domande diverse**: una conferma vale solo per la domanda che quel revisore si è posto. Se divergono, si misura la forma
**letterale** che una delle due ha scritto, mai «il rimedio».

⚠︎ **Ai revisori si impone un prefisso concordato per i file temporanei** (`tests/zz-misura-<lente>.test.ts`), la loro
esclusione quando si conta, e la **cancellazione dichiarata** nel rapporto: due revisori che lasciano file in `tests/`
fanno leggere al terzo un denominatore sbagliato, cioè il numero contro cui misura tutto il resto. E **chi legge
dichiari da quale versione legge** (`git show <sha>:<file>`), perché la partizione della risorsa non basta quando
l'altra sta mutando i file.

A entrambe si dà l'elenco dei punti dove l'esecutrice si sente debole, **non** quelli dove è sicura.

---

## Appendice — il testo del Task 9, estratto dal piano

Le righe che seguono sono le righe **4147–4547** di
`docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` al commit `a9c4996`, estratte con `sed` e non
ritrascritte a mano. Se divergessero dal piano, **vince il piano**. ⚠︎ Verificato il 29/09 con `diff`: le due copie
sono **identiche**, quindi oggi questa regola non ha nessun caso da arbitrare. E **non riapre le nove correzioni**
qui sopra, che sono misurate e vincono sul piano: arbitra solo una differenza fra questa appendice e il file.

⚠︎ **Due cose dell'appendice vanno cambiate quando le trascrivi, e stanno scritte qui perché l'appendice non si
tocca:**

1. **Il messaggio di commit del Passo 5 dice il falso.** Scrive «nessuna tabella nella pubblicazione standard»,
   mentre la prova che quello stesso passo descrive asserisce che in `supabase_realtime` c'è **esattamente
   `annuncio`** (misurato: `pg_publication_tables` dà `annuncio`, con `insert` vero e `update`/`delete` falsi).
   Sostituisci quella frase con: «nella pubblicazione `supabase_realtime` esattamente `annuncio`, e solo gli
   inserimenti». Un messaggio di commit resta nella storia per sempre, e questo è il commit che dichiara di aver
   stretto l'audit.
2. **`add` e `commit` vanno in un comando solo**, coi file nominati uno per uno — vedi i vincoli.

### Task 9: l'audit di catalogo si stringe, e la vecchia `move_visit` esce di scena

**Files:**
- Modify: `tests/schema/catalogue-audit.test.ts`
- Modify: `tests/schema/write-functions.test.ts` (le 9 prove che chiamano `move_visit`)
- Create: `supabase/migrations/0020_revoca_move_visit.sql`

**Interfaces:**
- Consuma: tutte le funzioni dei Task 1–8.
- Produce: nessun oggetto nuovo. Chiude `PERMESSI-FUNZIONI`, `MIGRAZIONE-SALTATA`, `OUTSIDER-WRITE` e la divergenza
  L8 dalla spec §4.6.

- [ ] **Passo 1: scrivi le prove nuove dell'audit**

Aggiungi a `tests/schema/catalogue-audit.test.ts`:

```ts
// L'insieme delle funzioni eseguibili da anon deve essere ESATTAMENTE questo.
// Non «nessuna»: sei funzioni di trigger dello schema app e immutable_unaccent
// lo sono da prima di questo piano, e l'elenco le dichiara con la loro ragione.
const ESEGUIBILI_DA_ANON = [
  'app.delete_orphan_visit()',
  'app.guard_operator_lockout()',
  'app.is_active_operator()',
  'app.sync_appointment_slots()',
  'app.touch_client_activity()',
  'app.touch_updated_at()',
  'public.immutable_unaccent(text)',
]

it('lascia eseguibili da anon esattamente le funzioni dichiarate', async () => {
  const trovate = await asOwner(async (c) => {
    const r = await c.query<{ f: string }>(`
      select n.nspname || '.' || p.proname || '(' ||
             pg_get_function_arguments(p.oid) || ')' as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'app')
        and has_function_privilege('anon', p.oid, 'EXECUTE')
      order by 1
    `)
    return r.rows.map((x) => x.f)
  })
  expect(trovate).toEqual(ESEGUIBILI_DA_ANON)
})

// Le funzioni security definer che NON sono trigger e che authenticated può
// chiamare: ognuna deve avere la guardia sul predicato, e una prova che ne
// misura l'EFFETTO da un account chiuso.
const DEFINER_PER_AUTHENTICATED = [
  'app.apri_invio(p_codice uuid)',
  'app.apri_invio_come_annullato(p_codice uuid)',
  'app.chiudi_invio(p_codice uuid, p_esito text)',
  'app.is_active_operator()',
  'public.chiudi_sessioni(p_operator_id uuid)',
  'public.list_auth_accounts()',
]

it('ha esattamente queste funzioni security definer chiamabili da authenticated', async () => {
  const trovate = await asOwner(async (c) => {
    const r = await c.query<{ f: string }>(`
      select n.nspname || '.' || p.proname || '(' || pg_get_function_arguments(p.oid) || ')' as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'app')
        and p.prosecdef
        and p.prorettype <> 'trigger'::regtype
        and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      order by 1
    `)
    return r.rows.map((x) => x.f)
  })
  expect(trovate).toEqual(DEFINER_PER_AUTHENTICATED)
})

// Postgres scrive un search_path vuoto come `search_path=""`, non come
// `search_path=` (lo dice già catalogue-audit.test.ts:63). E app.touch_updated_at
// (0004) non ha proconfig affatto: è un trigger invoker che tocca solo NEW, e
// resta dichiarato qui invece di essere nascosto allargando la prova.
const SENZA_SEARCH_PATH_DICHIARATE = ['touch_updated_at']

it('non lascia nessuna funzione nuova senza search_path vuoto', async () => {
  const senza = await asOwner(async (c) => {
    const r = await c.query<{ f: string }>(`
      select p.proname as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'app')
        and not exists (
          select 1 from unnest(coalesce(p.proconfig, '{}')) s
          where s = 'search_path=""' or s = 'search_path=public, pg_catalog'
        )
      order by 1
    `)
    return r.rows.map((x) => x.f)
  })
  expect(senza).toEqual(SENZA_SEARCH_PATH_DICHIARATE)
})

it('non lascia nessuna funzione a imporre un livello di isolamento proprio', async () => {
  const strane = await asOwner(async (c) => {
    const r = await c.query<{ f: string }>(`
      select p.proname as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'app')
        and exists (
          select 1 from unnest(coalesce(p.proconfig, '{}')) s
          where s like 'default_transaction_isolation=%'
        )
      order by 1
    `)
    return r.rows.map((x) => x.f)
  })
  expect(strane).toEqual([])
})

it('non lascia ad anon o authenticated TRUNCATE o MAINTAIN sulle tabelle nuove', async () => {
  const troppo = await asOwner(async (c) => {
    const r = await c.query<{ t: string; g: string; p: string }>(`
      select c.relname as t, a.grantee::regrole::text as g, a.privilege_type as p
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(c.relacl) a
      where n.nspname = 'public' and c.relkind = 'r'
        and a.grantee::regrole::text in ('anon', 'authenticated')
        and a.privilege_type in ('TRUNCATE', 'MAINTAIN')
      order by 1, 2, 3
    `)
    return r.rows
  })
  expect(troppo).toEqual([])
})

it('pubblica esattamente la tabella degli annunci, e solo gli inserimenti', async () => {
  const stato = await asOwner(async (c) => {
    const t = await c.query<{ t: string }>(
      "select tablename as t from pg_publication_tables where pubname = 'supabase_realtime' order by 1",
    )
    const p = await c.query<{ i: boolean; u: boolean; d: boolean }>(
      "select pubinsert as i, pubupdate as u, pubdelete as d from pg_publication where pubname = 'supabase_realtime'",
    )
    return { tabelle: t.rows.map((x) => x.t), ...p.rows[0] }
  })
  expect(stato).toEqual({ tabelle: ['annuncio'], i: true, u: false, d: false })
})

// Un trigger spento non fa rumore: un `disable` dimenticato, o un guasto a metà
// migrazione, toglierebbe un presidio senza che nessuno se ne accorga.
it('non lascia nessun trigger applicativo spento, e ne esamina più di zero', async () => {
  const esaminati = await asOwner(async (c) => {
    const r = await c.query<{ n: string }>(`
      select count(*) as n from pg_trigger g
      join pg_class c on c.oid = g.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not g.tgisinternal
    `)
    return Number(r.rows[0].n)
  })
  expect(esaminati).toBeGreaterThan(10)
  const spenti = await asOwner(async (c) => {
    const r = await c.query<{ t: string; g: string }>(`
      select c.relname as t, g.tgname as g
      from pg_trigger g join pg_class c on c.oid = g.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not g.tgisinternal and g.tgenabled <> 'O'
      order by 1, 2
    `)
    return r.rows
  })
  expect(spenti).toEqual([])
})

// La chiusura immediata poggia su una tabella interna di Supabase: se una
// versione futura togliesse al proprietario il diritto di leggerla, ogni
// richiesta fallirebbe. Il guasto sarebbe rumoroso, ma questa prova lo trova
// prima, in CI.
it('lascia al proprietario i diritti su auth.sessions da cui dipende la chiusura immediata', async () => {
  const stato = await asOwner(async (c) => {
    const r = await c.query<{ sel: boolean; del: boolean; bypass: boolean; colonne: number }>(`
      select has_table_privilege('postgres', 'auth.sessions', 'SELECT') as sel,
             has_table_privilege('postgres', 'auth.sessions', 'DELETE') as del,
             (select rolbypassrls from pg_roles where rolname = 'postgres') as bypass,
             (select count(*)::int from information_schema.columns
               where table_schema = 'auth' and table_name = 'sessions'
                 and column_name in ('id', 'user_id')) as colonne
    `)
    return r.rows[0]
  })
  expect(stato).toEqual({ sel: true, del: true, bypass: true, colonne: 2 })
})

// MIGRAZIONE-SALTATA: un file che il CLI salta in silenzio non lo vede nessuno.
it('applica ogni file di supabase/migrations, senza saltarne nessuno', async () => {
  const { readdirSync } = await import('node:fs')
  const suDisco = readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.replace(/_.*$/, ''))
    .sort()
  const applicate = await asOwner(async (c) => {
    const r = await c.query<{ v: string }>('select version as v from supabase_migrations.schema_migrations order by 1')
    return r.rows.map((x) => x.v)
  })
  expect(applicate).toEqual(suDisco)
})
```

- [ ] **Passo 2: esegui e guarda quali falliscono**

Run: `npx vitest run tests/schema/catalogue-audit.test.ts`
Atteso: rossa *«ha esattamente queste funzioni security definer…»* finché gli elenchi non corrispondono al catalogo
vero. **Correggi l'elenco dichiarato solo dopo aver capito perché** una funzione ci è finita: un elenco allargato per
far passare la prova è il modo di spegnerla. Le due voci già note e dichiarate sono `app.touch_updated_at` (senza
`search_path`, da 0004) e le sei funzioni di `app` eseguibili da `anon` — cinque trigger più
`app.is_active_operator()`, che trigger non è.

- [ ] **Passo 3: revoca la vecchia `move_visit` e adatta le sue prove**

```sql
-- supabase/migrations/0020_revoca_move_visit.sql
--
-- La vecchia move_visit(uuid, date, integer) sposta di uno SCARTO RELATIVO e
-- non controlla nessuna versione: un invio ripetuto sposterebbe due volte, e
-- due operatrici che spostano la stessa visita si sovrascrivono in silenzio
-- (design 3a §4.1, reperto B2). Il 3a la sostituisce con sposta_visita_a.
--
-- Non si CANCELLA, si revoca: resta leggibile nella 0010 e nelle sue prove,
-- che continuano a esercitarla da proprietario. È una divergenza dichiarata
-- dalla spec §4.6, che la elenca fra le quattro funzioni (lettura L8).
revoke execute on function public.move_visit(uuid, date, integer) from authenticated;
```

In `tests/schema/write-functions.test.ts`, le **9 prove** che la chiamano diventano prove sul comportamento della
funzione **da proprietario** (`asOwner`), più una prova nuova:

```ts
it('non è più chiamabile da un operatrice: il 3a usa sposta_visita_a', async () => {
  const codiceErrore = await asOperator(VERA_AUTH, async (c) => {
    try {
      await c.query('select move_visit($1, $2::date, 6)', [V1, DAY_TWO])
      return 'nessun errore'
    } catch (e) {
      return pgCode(e)
    }
  })
  expect(codiceErrore).toBe('42501')
})
```

- [ ] **Passo 4: `OUTSIDER-WRITE` sulle funzioni nuove**

Un file proprio, `tests/schema/outsider-write.test.ts`, invece di un innesto in `access-control.test.ts`: quel file
non semina le fixture e non conosce le costanti che servono.

**Attenzione a che cosa si asserisce.** `sposta_visita_a` e `cancella_visita` chiamate da un estraneo **non
sollevano niente**: la visita è invisibile e l'esito è `non_trovata` (misurato). E `salva_visita` con un elenco vuoto
solleva `22023` **prima** di qualunque questione di autorizzazione, quindi una prova scritta così passerebbe anche
per un'operatrice attiva. Si asserisce l'**effetto**: nessuna scrittura, e mai `salvata` o `cancellata`.

```ts
// tests/schema/outsider-write.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ANNALISA,
  ANNALISA_AUTH,
  OUTSIDER_AUTH,
  VERA,
  VERA_AUTH,
  asOperatorCommit,
  asOwner,
  pgCode,
  resetData,
} from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { dimenticaSessioni } from '../helpers/sessioni'

const V1 = '50000000-0000-4000-8000-0000000000f9'
const A1 = '60000000-0000-4000-8000-0000000000f9'
let seq = 0
// Un contatore, non l'orologio: due chiamate nello stesso millisecondo
// darebbero lo stesso codice d'invio, e la seconda riceverebbe l'esito della
// prima dal registro.
const COD = () => `70000000-0000-4000-8000-4${String(++seq).padStart(11, '0')}`
const APP = [{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]

let versioni: { visita: string; appuntamenti: unknown[] }

beforeEach(async () => {
  await resetData()
  await seedFixture()
  versioni = await asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: { visita: string; appuntamenti: unknown[] } }>(
      'select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r',
      [COD(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify(APP)],
    )
    return r.rows[0].r
  })
})

const statoDb = () =>
  asOwner(async (c) => {
    const r = await c.query<{ id: string; s: number }>('select id, start_cell as s from appointment order by id')
    return r.rows
  })

async function prova(authUid: string, sql: string, params: unknown[]) {
  const prima = await statoDb()
  const esito = await asOperatorCommit(authUid, async (c) => {
    try {
      const r = await c.query<{ r: { esito?: string } | null }>(sql, params)
      return r.rows[0]?.r?.esito ?? 'valore senza esito'
    } catch (e) {
      return pgCode(e) ?? 'ignoto'
    }
  }).catch((e) => pgCode(e) ?? 'ignoto')
  return { esito, prima, dopo: await statoDb() }
}

const CASI: [string, string, (v: typeof versioni) => unknown[]][] = [
  [
    'salva_visita',
    'select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r',
    (v) => [COD(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([{ ...APP[0], inizio: 200 }]), v.visita, JSON.stringify(v.appuntamenti)],
  ],
  [
    'sposta_visita_a',
    'select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r',
    (v) => [COD(), V1, DAY_ONE, JSON.stringify([{ id: A1, inizio: 200 }]), v.visita, JSON.stringify(v.appuntamenti)],
  ],
  [
    'cancella_visita',
    'select cancella_visita($1,$2,$3,$4) as r',
    (v) => [COD(), V1, v.visita, JSON.stringify(v.appuntamenti)],
  ],
  ['controlla_invio', 'select controlla_invio($1,$2) as r', () => [COD(), V1]],
]

describe.each(CASI)('%s', (_nome, sql, params) => {
  it('non scrive niente per un account che non è operatrice', async () => {
    const { esito, prima, dopo } = await prova(OUTSIDER_AUTH, sql, params(versioni))
    expect(['salvata', 'cancellata']).not.toContain(esito)
    expect(dopo).toEqual(prima)
  })

  it('non scrive niente per un operatrice disattivata', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const { esito, prima, dopo } = await prova(ANNALISA_AUTH, sql, params(versioni))
    expect(['salvata', 'cancellata']).not.toContain(esito)
    expect(dopo).toEqual(prima)
    await asOwner((c) => c.query('update operator set is_active = true where id = $1', [ANNALISA]))
    dimenticaSessioni()
  })

  // La gemella positiva: senza, le due prove sopra resterebbero verdi anche se
  // l'imbracatura fosse rotta e nessuno riuscisse più a scrivere.
  it('ma un operatrice attiva sì, con la stessa imbracatura', async () => {
    const { esito, prima, dopo } = await prova(VERA_AUTH, sql, params(versioni))
    expect(esito).not.toBe('ignoto')
    if (sql.includes('controlla_invio')) {
      expect(dopo).toEqual(prima)
    } else {
      expect(dopo).not.toEqual(prima)
    }
  })
})
```

**Deciso dall'utente il 23/09:** tutte e quattro le funzioni cominciano con la guardia esplicita, quindi l'esito per
un estraneo o per un'operatrice disattivata è **sempre `42501`**, mai `non_trovata`. La prova che lo pinna va
**dentro** il `describe.each`, come quarta `it`, perché usa `sql`, `params` e `versioni`:

```ts
  it('risponde sempre 42501, mai un esito di dominio', async () => {
    const { esito } = await prova(OUTSIDER_AUTH, sql, params(versioni))
    expect(esito).toBe('42501')
  })
```

Il file arriva così a **4 casi × 4 prove = 16**.

- [ ] **Passo 5: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add tests/schema/ supabase/migrations/0020_revoca_move_visit.sql
git commit -m "test(3a-1): l'audit di catalogo diventa un elenco nominativo, e move_visit esce di scena

Le funzioni eseguibili da anon e quelle security definer chiamabili da
authenticated sono ora due insiemi ESATTI, dichiarati con la ragione di ogni
voce: un audit che cerca «nessuna» non si accorge di una funzione nuova, e uno
che usa un like accetta un predicato allargato.

In più: nessun livello di isolamento imposto da una funzione, nessun TRUNCATE
o MAINTAIN per anon e authenticated, nessuna tabella nella pubblicazione
standard, i diritti su auth.sessions da cui dipende la chiusura immediata, e
la corrispondenza fra i file di migrazione e quelli applicati.

La vecchia move_visit resta nella 0010 ma non è più chiamabile da
un'operatrice: sposta di uno scarto relativo e non guarda nessuna versione.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---
