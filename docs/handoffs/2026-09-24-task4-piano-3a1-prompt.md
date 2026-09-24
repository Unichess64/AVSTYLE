Sei l'esecutrice del **Task 4** del piano 3a-1 del progetto `salon-scheduler` (agenda per il centro estetico AVStyle).
Lavori in `/Users/nadiaottavi/Desktop/Git/salon-scheduler`, ramo `main`.

# Controllo d'ingresso — prima di qualunque cosa

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
git merge-base --is-ancestor 15f34c6342135ab5f6300930ff0ce6b35beedbc7 HEAD \
  && echo "storia lineare" || echo "STORIA RISCRITTA — questo prompt è invalido"
git diff --stat 15f34c6..HEAD -- supabase tests src
git status --short
git branch --show-current
```

Atteso, una riga per comando:

- il primo stampa `storia lineare`: la remediation del Task 3 è ancora nella storia di questo ramo. Quel commit è
  «fix(3a-1): Task 3, i quattro presìdi che la revisione ha trovato muti», l'ultimo del Task 3, e
  `git log --oneline -1 15f34c6` lo conferma;
- il secondo **non stampa niente**: dopo la fine del Task 3 nessuno ha toccato `supabase/`, `tests/` o `src/`. Se
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
   «Struttura dei file» e tutto il **Task 4** (da `### Task 4` fino a dove comincia `### Task 5`). I vincoli globali
   valgono anche se il task non li ripete.
2. Dello stesso file, l'appendice **«Esecuzione del Task 3 e revisione (24 settembre 2026)»**, in fondo. È il
   documento più importante di questo elenco: dice che cosa il Task 3 ti ha lasciato, quali presìdi restano scoperti
   con quale danno misurato, e — soprattutto — **che cosa di tuo cadrà**, perché la revisione del Task 3 ha installato
   i tuoi trigger dal vivo e ha misurato il risultato.
3. Subito prima, l'appendice **«Esecuzione del Task 2 e revisione»**: contiene le trappole di processo, di cui **una è
   falsa e segnata come tale** (vedi sotto).
4. `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md` (ora **revisione 12**), §4.7 per intero, e le
   decisioni D3-11, D3-14, D3-17, D3-20 nella tabella in testa. §4.7 è la ragione di questo task.
5. `tests/helpers/db.ts` e `tests/helpers/sessioni.ts`: gli aiuti che consumerai. E
   `tests/schema/sessione-viva.test.ts` (12 prove) e `tests/schema/sessioni-imbracatura.test.ts` (16 prove), per
   vedere come sono presidiati.
6. `supabase/migrations/0014_sessione_viva.sql` e `supabase/rientro/0014_rientro_sessione_viva.sql`: la funzione su
   cui appoggi, e il file di rientro che **devi finire tu**.

Dichiara all'inizio quali di questi hai letto.

# Che cosa fare

I **sei passi** del Task 4, in ordine, uno alla volta, spuntando le caselle `- [ ]` nel file del piano man mano che
li chiudi. Il piano contiene il testo completo delle prove e della migrazione: **si trascrive, non si reinventa**. Se
una riga del piano non funziona, fermati e dillo: non aggiustarla di tua iniziativa.

Il task tocca due file nuovi:

- crea `supabase/migrations/0015_chiusura_sessioni.sql`
- crea `tests/schema/chiusura-sessioni.test.ts`

più i file di prova esistenti che il Passo 4 ti farà adattare, e — vedi sotto — `tests/helpers/db.ts` e
`supabase/rientro/0014_rientro_sessione_viva.sql`. **Dichiara file per file** quello che tocchi oltre ai due nuovi.
Non anticipare il Task 5.

# ⚠︎ Le quattro cose che ti faranno perdere tempo se non le leggi ora

## 1. Il primo `npm test` dopo i trigger dà due rosse FALSE, e la riparazione ovvia distrugge un presidio

Misurato dalla revisione del Task 3, installando i tuoi trigger dal vivo e lanciando la suite intera: **2 rosse**, e
sono la coppia di gemelle positive che il Task 3 ha appena consegnato —

- `access-control.test.ts > lets that same operator read once she is active again, with the same harness`
- `account-directory.test.ts > returns the accounts to that same operator once she is active again`

Il meccanismo: la prova **precedente** disattiva Alessandra con `asOwner`, che **committa**; il `beforeEach`
successivo chiama `resetData()`, il cui `update … is_active = true` diventa `false → true`, il tuo trigger scatta e
**cancella le sessioni di Alessandra**; `resetData()` **non** chiama `dimenticaSessioni()`, quindi la cache serve una
sessione morta e la gemella legge zero righe.

Quelle rosse sono **false**: colpa dell'imbracatura, non del tuo codice. La riparazione che verrà naturale —
indebolire o togliere la gemella — rimetterebbe le due prove negative *«shows nothing to a deactivated operator»* e
*«returns nothing to a deactivated operator»* **nello stato decorativo** che il Passo 6 del Task 3 esiste per
chiudere.

**Il rimedio è una riga: `dimenticaSessioni()` dentro `resetData()`**, e va messo **prima** di creare i trigger, così
non vedi mai le due rosse. Tocca `tests/helpers/db.ts`: dichiaralo, e scrivi la sonda che lo prova (togli la riga e
verifica che le due gemelle arrossiscano).

## 2. `rinnovoRiesce` non è mai stata eseguita da nessuna prova, e tu ci appoggi dieci asserzioni

Misurato: `rinnovoRiesce()` ha **zero chiamanti** in tutta la suite; azzerata a `return false` dà **0 rosse**. Non è
«equivalente», è **non esercitata**. Il tuo file la chiama dieci volte: sette `toBe(false)` e due `toBe(true)`.

- **Le due `toBe(true)`** (dentro le prove *«NON chiude niente…»*) sono le uniche gemelle positive che rendono capaci
  di fallire i sette `toBe(false)`. **Non tagliarle, non indebolirle, non spostarle.** Se le togli, sette prove
  negative diventano decorative all'istante.
- ⛔ **`rinnovoRiesce` si chiama UNA volta sola per sessione.** La rotazione dei refresh token è attiva
  (`supabase/config.toml:170-173`) e la funzione **non salva** il token ruotato: una seconda chiamata sullo stesso
  oggetto `Sessione` oltre i 10 secondi può dare `false` su una sessione **viva** e può far **revocare la famiglia**
  della sessione. Una sonda che la chiamasse due volte **ucciderebbe ciò che misura**.

Prima di fidarti dei sette `toBe(false)`, chiediti se `rinnovoRiesce` è capace di fallire nella direzione giusta, e
dillo nel resoconto.

## 3. Una trappola di processo registrata nel piano è FALSA, ed è quella che ti toccherebbe

L'appendice del Task 2, trappola 4, diceva «**Vitest esegue i file in parallelo**» e ne deduceva che «nessuna prova
può contare righe globali in `auth.sessions`». **Smentita per misura** dalla revisione del Task 3:
`vitest.config.ts:6-7` ha `pool: 'threads'` con `singleThread: true`, i file girano **in serie**, zero coppie
sovrapposte. La trappola è già corretta in sede nel piano.

Perché ti riguarda: il tuo aiuto `vive(authUid)` conta **tutte** le sessioni di un account, globalmente, ed è
**lecito**. Se trovi altrove la formula vecchia, non riscrivere prove valide per obbedirle.

## 4. Il rientro del Task 3 aspetta te

`supabase/rientro/0014_rientro_sessione_viva.sql` ha, commentate, le tre righe che neutralizzano i tuoi trigger:

```sql
-- alter table public.operator disable trigger zz_chiudi_sessioni_ins;
-- alter table public.operator disable trigger zz_chiudi_sessioni_upd;
-- alter table public.operator disable trigger zz_chiudi_sessioni_del;
```

Sono commentate perché oggi i trigger non esistono e `alter table … disable trigger` darebbe `42704`. **Appena li
crei, scommentale**, e verifica a mano che le tre istruzioni girino davvero (è l'unico modo di sapere che i nomi
combaciano). Finché restano commentate il reperto **S4-4** della spec è **aperto**, e la spec lo dice: chiuderlo è
parte di questo task, non del prossimo. Aggiorna §4.7 di conseguenza.

# Vincoli che non si negoziano

- ⛔ **Mai `psql`**: non è installato, e da proprietario scavalcherebbe la sicurezza per riga dando misure false in
  silenzio. Ogni misura si prende con uno script Node che usa `pg`. Se lo script sta fuori dal progetto, importa `pg`
  per path assoluto (`/Users/nadiaottavi/Desktop/Git/salon-scheduler/node_modules/pg/lib/index.js`): altrimenti esce
  con `Cannot find package 'pg'` e sembra un blocco del database.
- ⛔ **`supabase/seed.sql` non si tocca, mai**: `[db.seed]` è attivo e un `db reset --linked` lo eseguirebbe contro il
  progetto ospitato. I quattro utenti `@example.test` restano — deciso in spec §8.5 — e la tua imbracatura ne dipende.
- **Italiano** in prosa, commenti, nomi delle prove e messaggio di commit.
- **Migrazioni:** solo cifre nel prefisso, e il numero dev'essere libero sul disco **e** non rivendicato da un task
  successivo. `0015` è il tuo.
- Dopo ogni modifica alle migrazioni: `npx supabase db reset`, e controlla che **non** compaia nessuna riga
  `Skipping migration`. Un prefisso non numerico la fa saltare in silenzio.
- ⚠︎ **`db reset` NON applica le modifiche a `config.toml` al GoTrue**: lo riavvia, non lo ricrea, e le variabili
  d'ambiente si fissano alla creazione. Serve `npx supabase stop && npx supabase start`.
- **Il gate si esegue in serie**, con l'output vero incollato nel resoconto: `npx supabase db reset`, `npm test`,
  `npm run test:fuso`, `npx tsc --noEmit`.
- **Le sonde di mutazione si eseguono davvero**: si applica la mutazione, si lancia la prova, si verifica che sia
  rossa, si ripristina, si rilancia e si verifica che sia di nuovo verde. Una sonda «ragionata» non vale. Il Passo 5
  ne elenca sette; se una non fa vittime, dichiaralo e di' che cosa farebbe davvero in produzione — «senza vittime» è
  una misura, «equivalente» è una tesi da argomentare.
- Se Docker non risponde: `open -a OrbStack`, ~30 s, poi `npx supabase start`.
- **`git push` mai, per nessun motivo.** Il commit sì, quello del Passo 6.

# Le trappole misurate prima di te — non ripeterle

1. **Mai due suite sullo stesso database.** Due `npm test` insieme danno 110-114 prove rosse con `duplicate key value
   violates unique constraint` dentro `seedFixture`, e una suite ferma oltre dieci minuti. Sintomo diagnostico: se
   **nessun** file di prova completa, non è il codice. ⚠︎ Il controllo `pgrep -f vitest` è **troppo largo**: nel Task 2
   ha dato tre falsi positivi su processi di `chessbooking`, un altro progetto della stessa macchina. Usa
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
6. **Attenzione al profilo.** Chiediti sempre con quale profilo gira la prova. Nel Task 1 cinque prove giravano tutte
   da `asOwner` e non potevano accorgersi della perdita del `security definer`; nel Task 3 il rischio era speculare.
   Qui: una prova che gira da `asOwner` **non vede** la chiusura immediata, perché il proprietario scavalca la
   sicurezza per riga.
7. **Un censimento si fa con una spia, non con un `grep`.** Misurato nel Task 3: censire «quali prove passano per X»
   spezzando i file per `it(` e cercando `X` nel testo del blocco dava **18** prove; strumentando la funzione con una
   spia sul nome della prova ne dava **98**, e i verdi silenti erano **27**, non 16. La regex perde ogni prova che
   chiama `X` **tramite un aiuto** del file, e con essa perdeva tre file interi.
8. **Il limite di accesso può morderti.** Da questo task il `beforeEach` azzera le sessioni e chiama
   `dimenticaSessioni()`, quindi **si accede per prova**, non più per file. Il limite locale è 300 ogni 5 minuti per
   IP (`sign_in_sign_ups`, che nel CLI 2.117.0 si mappa su `GOTRUE_RATE_LIMIT_OTP`): un ciclo TDD stretto può
   arrivarci. **Sintomo: `429` all'accesso.** `token_refresh = 150` è abbondante finché quasi nessuno rinnova, ma tu
   rinnovi dieci volte per passata: tienilo d'occhio.

# Che cosa ti ha lasciato il Task 3

Due commit, `440b6f7` (consegna) e `15f34c6` (remediation dopo due revisioni avversariali).

`app.is_active_operator()` ora è vera solo se esiste **anche** la sessione del token, e se quella sessione è **di chi
presenta il token**. Le **15** politiche di `public` sono riscritte nella forma `(select app.is_active_operator())`.
`supabase/rientro/0014_rientro_sessione_viva.sql` toglie il controllo, e aspetta da te le tre righe sui trigger.

**Baseline verificata a `15f34c6`, eseguita in serie:** `npx supabase db reset` senza righe `Skipping migration`;
`npm test` → **21 file, 304 prove verdi**; `npm run test:fuso` → 4 file, **96 verdi**; `npx tsc --noEmit` → uscita 0.

**Sonde del Task 3, per riferimento** (rosse sulla suite intera): via il secondo `exists` **6**; via
`and s.user_id = auth.uid()` **1**; `using` nudo **1**; `with check` nudo **1**; primo `exists` sempre falso **72** su
15 file; via il `nullif` interno **1**; via il `nullif` esterno **1**.

**Presìdi che restano scoperti, con il danno misurato** (tutti nell'appendice del Task 3, nessuno bloccante):

1. **Sette prove negative senza gemella**, in `availability`, `occupancy` e `orphan-visit`: sono i file che il
   censimento a regex aveva perso. Danno oggi zero, perché ogni file contiene almeno un'altra prova che arrossisce —
   ma il guasto si scopre **a grana di file, per accidente**, non a grana di prova.
2. **L'audit della forma delle politiche è cieco a `(select …) or true`**: usa `like` su sottostringa, non
   l'uguaglianza esatta che la spec pretende (reperto **S4-6**, aperto; il piano lo assegna al Task 9). Misurato:
   spalancando `client_access` l'audit resta verde; spalancando `salon_closure_access` arrossisce **una** sola prova.
3. **`refuses a direct insert on appointment_slot` è sovradeterminata** (`occupancy.test.ts:166-168` lo dice già).
4. **`rinnovoRiesce` non esercitata** — vedi l'avvertimento 2 qui sopra: sei **tu** a chiuderlo.
5. **Un `session_id` valido come JSON ma non come uuid** (`"abc"`) solleva `22P02` dentro ogni politica: misurato,
   raggiungibile solo da chi scrive i claim. Non difeso.
6. **La clausola `realtime` della prova di forma è a vuoto**: zero politiche in quello schema.

# Due punti del piano da guardare con sospetto

- **Il Passo 6 fa `git add` di due soli file.** Tu ne toccherai di più (`tests/helpers/db.ts`, i file di prova
  adattati, il rientro, la spec): **nominali uno per uno**. Un `git add` largo porta dentro modifiche che non hai
  dichiarato.
- **Il messaggio di commit del Passo 6 non nomina né `resetData()` né il rientro.** Se li tocchi — e li toccherai —
  il messaggio va esteso: deve dire che cosa hai cambiato e perché, con i numeri veri. ⚠︎ **I numeri del messaggio si
  misurano, non si ricordano**: nel Task 3 un messaggio conteneva due numeri falsi, e la nota scritta per correggerli
  ne conteneva altri due, perché rileggeva la misura vecchia invece di rifarla.

# Come chiudere

Fermati dopo il commit del Passo 6 e scrivi un resoconto con:

1. i file creati o modificati e il numero del commit;
2. l'output vero del gate (le quattro voci);
3. la tabella delle sonde di mutazione: mutazione → prova che è arrossita → numero di rosse misurato;
4. quali prove esistenti hai adattato e perché, **file per file**, e che cosa hai fatto delle due gemelle che la
   revisione del Task 3 aveva previsto rosse;
5. che cosa hai misurato su `rinnovoRiesce`: è capace di fallire nella direzione giusta?
6. lo stato del rientro `0014` e del reperto S4-4;
7. tutto ciò che ti ha fatto esitare, o che nel piano era sbagliato o ambiguo;
8. che cosa hai dovuto decidere da sola, e che cosa costa se hai deciso male.

**Non partire con il Task 5:** il piano lo esegue una chat alla volta, con una revisione in mezzo.

# Come si fa la revisione, dopo

Due agenti indipendenti avversariali **in parallelo**, ma con la **risorsa condivisa partizionata**: c'è un solo
database locale, e due revisore che lanciano la suite insieme producono 110-114 rosse **false**. Nei Task 2 e 3 ha
funzionato così, e ogni volta ha trovato reperti che né l'esecutrice né una revisione sola avevano visto:

- una **empirica**, proprietaria esclusiva del database e di Vitest, che rimisura le sonde dichiarate e ne inventa di
  nuove, e che ha il compito esplicito di cercare **«una mutazione invisibile oggi e letale al task successivo»** — al
  Task 3 questo compito ha prodotto il reperto migliore di tutta la revisione;
- una **a secco**, in sola lettura (file, `git`, `grep`, `tsc --noEmit`, `docker … env`), a cui è **vietato** lanciare
  Vitest o qualunque comando che scriva sul database, e che consegna **ipotesi falsificabili**: ognuna con il comando
  esatto che la proverebbe e l'esito, in numeri, che la confermerebbe. Quelle ipotesi le misura l'orchestratrice dopo.

A entrambe si dà **l'elenco dei punti dove l'esecutrice si sente debole**, non quelli dove è sicura, e si chiede
esplicitamente di **verificare con numeri le affermazioni del messaggio di commit**.
