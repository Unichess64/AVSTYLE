# Prompt per il Task 3 del piano 3a-1 — `salon-scheduler`

Scritto il 24 settembre 2026 dalla chat che ha eseguito il Task 2. Si incolla in una chat fresca.
Tutto ciò che segue la riga di separazione è il prompt.

---

Sei l'esecutrice del **Task 3** del piano 3a-1 del progetto `salon-scheduler` (agenda per il centro estetico
AVStyle). Lavori in `/Users/nadiaottavi/Desktop/Git/salon-scheduler`, ramo `main`.

## Controllo d'ingresso — prima di qualunque cosa

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
git merge-base --is-ancestor 5b88d3687369607f97a7e8bcfc34d5a358f02ed2 HEAD \
  && echo "storia lineare" || echo "STORIA RISCRITTA — questo prompt è invalido"
git diff --stat 5b88d36..HEAD -- supabase tests src
git status --short
git branch --show-current
```

Atteso, una riga per comando:

- il primo stampa **`storia lineare`**: il Task 2 è ancora nella storia di questo ramo. Quel commit è
  *«docs(3a): §8.5 decide — i quattro utenti @example.test restano (spec rev. 11)»*, l'ultimo del Task 2, e
  `git log --oneline -1 5b88d36` lo conferma;
- il secondo non stampa **niente**: dopo la fine del Task 2 nessuno ha toccato `supabase/`, `tests/` o `src/`. Se
  stampa qualcosa, qualcuno ha lavorato sul codice dopo di me e questo prompt è vecchio;
- il terzo non stampa niente tranne `?? .superpowers/` e i **due** file più vecchi sotto `docs/handoffs/` (datati
  2026-09-18 e 2026-09-22), che sono preesistenti e **non si toccano**;
- il quarto stampa **`main`**.

Il controllo non nomina l'ultimo commit apposta: il commit che introduce questo file sposterebbe HEAD e renderebbe il
controllo impossibile da superare.

Se una qualunque riga diverge, **fermati e dillo**: non eseguire il Passo 1 e non proporre alternative finché non ti
rispondono.

## Che cosa leggere, prima di toccare qualunque cosa

1. `docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` — l'intestazione, i «Vincoli globali», la
   «Struttura dei file» e tutto il **Task 3** (da `### Task 3` fino a dove comincia `### Task 4`). I vincoli globali
   valgono anche se il task non li ripete.
2. Dello stesso file, l'**appendice «Esecuzione del Task 2 e revisione (24 settembre 2026)»**, in fondo. È il documento
   più importante di questo elenco: dice che cosa il Task 2 ti ha lasciato, quali presìdi restano **scoperti** e con
   quale danno misurato, e cinque trappole di processo che ti costerebbero tempo.
3. `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md` (ora **revisione 11**), §4.7 per intero, e le
   decisioni D3-11, D3-14, D3-17, D3-20 nella tabella in testa. §4.7 è la ragione di questo task.
4. `tests/helpers/db.ts` e `tests/helpers/sessioni.ts`: gli aiuti che consumerai. E
   `tests/schema/sessioni-imbracatura.test.ts`, 16 prove, per vedere come sono presidiati.
5. `supabase/migrations/0001_access_control.sql`: contiene `app.is_active_operator()` che riscriverai e le politiche
   che ridefinirai.

Dichiara all'inizio quali di questi hai letto.

## Che cosa fare

Gli **otto passi** del Task 3, in ordine, uno alla volta, spuntando le caselle `- [ ]` nel file del piano man mano che
li chiudi. Il piano contiene il testo completo degli aiuti e delle prove: **si trascrive, non si reinventa**. Se una
riga del piano non funziona, **fermati e dillo**: non aggiustarla di tua iniziativa.

Il task tocca tre file e **nient'altro**:

- crea `supabase/migrations/0014_sessione_viva.sql`
- crea `tests/schema/sessione-viva.test.ts`
- crea `supabase/rientro/0014_rientro_sessione_viva.sql` (Passo 4: **fuori** da `supabase/migrations/`, o il CLI la
  applicherebbe)

Il Passo 6 può chiederti di adattare prove esistenti: in quel caso lo dichiari file per file. Non anticipare il Task 4.

## ⚠︎ Le tre cose che ti faranno perdere tempo se non le leggi ora

**1. Il Passo 6 attende VERDE, non rosso.** La sua stesura originale diceva «rosso, all'incirca 57 prove su 81»: era la
misura del terzo giro di revisione, quando l'imbracatura scriveva i claim a mano. Il **Task 2 l'ha smentita per
misura**: con la tua funzione applicata al database la suite dà **zero rosse** (misurato su un banco usa-e-getta dalla
revisione del Task 2: 20 file, 277 verdi allora). Il testo del piano è già corretto; questo è per non farti dubitare.

**Ma che non cada niente NON ti esonera dall'obbligo del Passo 6**, ed è il punto più fragile del piano: quel passo
serve a mettere una **gemella positiva** accanto a ogni prova negativa, e quella gemella diventa l'unica difesa che
resta. Misurato dalla revisione del Task 2: con le sessioni di un'operatrice cancellate e la cache non svuotata, una
prova negativa generica (`expect(righe).toEqual([])`) resta **VERDE** e solo la gemella positiva arrossisce. Censisci
le prove negative che la tua migrazione rende sensibili alla sessione e dàgliela, una per una, e scrivi **quante** ne
hai aggiunte.

**2. Le politiche sono 15, non 13.** Il piano si contraddice: l'intestazione del Task 3 e la «Struttura dei file»
dicono 13, il messaggio di commit del Passo 8 dice 15. **Misurato il 24/09/2026: sono 15**, tutte in `public`, e tutte
e 15 nominano già `is_active_operator`. Contale da te prima di cominciare e scrivi il numero che trovi:

```bash
node -e "
import('/Users/nadiaottavi/Desktop/Git/salon-scheduler/node_modules/pg/lib/index.js').then(async (m)=>{
  const c=new m.default.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:54322/postgres'});
  await c.connect();
  const r=await c.query(\"select schemaname, tablename, policyname from pg_policies where qual like '%is_active_operator%' or with_check like '%is_active_operator%' order by 1,2,3\");
  console.table(r.rows); console.log('totale:', r.rowCount); await c.end();});"
```

**3. La politica su `realtime.messages` NON esiste, e non devi crearla.** La spec §4.7 dice che l'uguaglianza esatta
dell'audit va «estesa alla politica di `realtime.messages`». Quella frase è **superata**: `create policy` su
`realtime.messages` non è eseguibile nemmeno a mano (il ruolo delle migrazioni non possiede quella tabella, misurato il
23/09), e per questo il **Task 8 è stato riscritto** attorno a una tabella `annuncio` nostra. Misurato il 24/09/2026:
in `realtime` non c'è **nessuna** politica. Se la spec ti manda a cercarla, la frase è vecchia.

## Vincoli che non si negoziano

- ⛔ **Mai `psql`**: non è installato, e da proprietario scavalcherebbe la sicurezza per riga dando misure false in
  silenzio. Ogni misura si prende con uno script Node che usa `pg`. Se lo script sta fuori dal progetto, importa `pg`
  per path assoluto (`/Users/nadiaottavi/Desktop/Git/salon-scheduler/node_modules/pg/lib/index.js`): altrimenti esce
  con `Cannot find package 'pg'` e sembra un blocco del database.
- ⛔ **`supabase/seed.sql` non si tocca**, mai: `[db.seed]` è attivo e un `db reset --linked` lo eseguirebbe contro il
  progetto ospitato. I quattro utenti `@example.test` **restano** — deciso in spec §8.5, revisione 11 — e la tua
  imbracatura ne dipende.
- **Italiano** in prosa, commenti, nomi delle prove e messaggio di commit.
- **`create or replace function` azzera gli attributi non ripetuti** (`security definer`, `set search_path`). Tu
  riscrivi `app.is_active_operator()`, che è `security definer`: **ripetili per esteso**, o ogni politica che la
  interroga cadrà per permessi. Nel Task 1 questa era la falla che ha bloccato la revisione.
- Dopo ogni modifica alle migrazioni: `npx supabase db reset`, e controlla che **non** compaia nessuna riga
  `Skipping migration`. Un prefisso non numerico la fa saltare **in silenzio**.
- **Il gate si esegue in serie**, con l'output vero incollato nel resoconto:
  `npx supabase db reset`, `npm test`, `npm run test:fuso`, `npx tsc --noEmit`.
- Le **sonde di mutazione si eseguono davvero**: si applica la mutazione, si lancia la prova, si verifica che sia
  rossa, si ripristina, si rilancia e si verifica che sia di nuovo verde. Una sonda «ragionata» non vale. Il Passo 7 ne
  elenca cinque; se una non fa vittime, **dichiaralo** e di' che cosa farebbe davvero in produzione — «senza vittime»
  è una misura, «equivalente» è una tesi da argomentare.
- Se Docker non risponde: `open -a OrbStack`, ~30 s, poi `npx supabase start`.
- **`git push` mai**, per nessun motivo. Il commit sì, quello del Passo 8.

## Le trappole misurate prima di te — non ripeterle

1. **Mai due suite sullo stesso database.** Due `npm test` insieme danno **110-114 prove rosse** con
   `duplicate key value violates unique constraint` dentro `seedFixture`, e una suite ferma oltre dieci minuti. Non è
   il codice e non sono i contenitori. Sintomo diagnostico: se **nessun** file di prova completa, non è il codice.
   ⚠︎ Il controllo che il piano prescrive, `pgrep -f vitest`, è **troppo largo**: nel Task 2 ha dato tre falsi positivi
   su processi di `chessbooking`, un altro progetto della stessa macchina, che ha il suo database. Usa
   **`pgrep -fl vitest | grep salon-scheduler`**.
2. **Vitest esegue i file in parallelo** (la somma dei tempi dei file supera la durata della passata). Quindi
   **nessuna prova può contare righe globali in `auth.sessions`**: altri file accedono con gli stessi account e il
   conteggio sarebbe verde o rosso a seconda di chi gira nello stesso istante. Asserisci l'effetto su **una** sessione
   nominata, mai un totale.
3. **`asOperator` annulla la transazione uscendo.** Quello che scrivi lì dentro non esiste più per una connessione
   successiva: se devi asserire l'effetto di una scrittura fatta da operatrice, **leggilo dentro la stessa
   transazione**, oppure usa `asOperatorCommit`.
4. **`asOperator` NON controlla che la sessione sia viva e NON riaccede da solo.** È una scelta: il riaccesso
   automatico uccideva tre prove negative. Quando una prova chiude una sessione, chiama **`dimenticaSessioni()`** in
   coda, e usa **`asOperatorConSessione`** per la parte negativa, altrimenti la prova diventa verde per il motivo
   sbagliato. ⚠︎ Una casella della prima appendice di revisione diceva il contrario («`asOperator` controlla che la
   sessione sia viva»): è stata corretta il 24/09/2026, ma se ne trovi traccia altrove **non fidarti**.
5. **Il ripristino di un file non ripristina il database.** Dopo aver rimesso a posto una migrazione mutata serve un
   `db reset` prima di rimisurare. E per un file **non tracciato** il ripristino si fa da una copia di scorta, non con
   `git checkout --`, che lo cancellerebbe.
6. **Una sonda su codice con stato residuo nel database si misura dopo un `db reset`.** Nel Task 2 una mutazione
   appariva innocua solo perché le righe della passata precedente erano ancora lì.
7. **Attenzione al profilo.** Chiediti sempre con quale profilo gira la prova, e se quel profilo può fallire: nel
   Task 1 cinque prove giravano tutte da `asOwner`, cioè dal proprietario, e quindi non potevano accorgersi della
   perdita del `security definer`. Nel tuo task il rischio è speculare: una prova che gira da `asOwner` **non vede**
   la chiusura immediata, perché il proprietario scavalca la sicurezza per riga.
8. **`rinnovoRiesce` si chiama UNA volta per sessione.** La rotazione dei refresh token è attiva
   (`supabase/config.toml:170-173`) e la funzione **non salva** il token ruotato: una seconda chiamata sullo stesso
   oggetto `Sessione` oltre i 10 secondi può dare `false` **su una sessione viva** e può far revocare la famiglia della
   sessione — la sonda ucciderebbe ciò che misura.

## Che cosa ti ha lasciato il Task 2

Otto commit, da `53a57dc` a `5b88d36`. In sostanza: **le prove entrano con una sessione vera**, non con claim scritti a
mano, ed è la precondizione di questo task.

In `tests/helpers/sessioni.ts`: `PASSWORD_PROVA`, `EMAIL_DI`, `preparaAccountLocali()`, `accedi()`, `sessioneDi()`,
`dimenticaSessioni()`, `rinnovoRiesce()`, tipo `Sessione`.
In `tests/helpers/db.ts`: `asOperator` (rollback, dalla sessione vera), **`asOperatorCommit`** (commette),
`asOperatorConSessione(authUid, sessionId, fn)`, `asOperatorSenzaSessione(authUid, fn)`, e `esigiDatabaseLocale()`.
`resetData()` ripristina il ruolo **per id** e cancella le operatrici non previste.

**Baseline verificata il 24/09/2026 a `5b88d36`, eseguita in serie:** `npx supabase db reset` senza righe
`Skipping migration`; `npm test` → **20 file, 286 prove verdi**; `npm run test:fuso` → 4 file, **96 verdi**;
`npx tsc --noEmit` → uscita 0. `tests/schema` da solo: 16 file, 190 prove.

**Tre aiuti che ti riguardano sono nati senza sonda e la revisione ha misurato quanto costa.** `dimenticaSessioni()`
svuotato a `{}` dà **zero rosse** oggi; `rinnovoRiesce()` che ritorna sempre `false` dà **zero rosse** oggi, e la sua
unica protezione sta nel **Task 4** (due `expect(await rinnovoRiesce(sessione)).toBe(true)`: sono le gemelle positive
che rendono capaci di fallire otto prove negative). **Eserciterai tutti e tre al Passo 1**: se la loro costruzione dei
claim fosse sbagliata, le tue prove negative diventerebbero verdi senza provare nulla — che è esattamente il difetto
che il Task 2 esiste per impedire. Nel Task 2 questo buco è stato misurato e chiuso per `asOperatorSenzaSessione` e
`asOperatorConSessione`: facendo cadere il claim `sub` da entrambi, **tutte e quattro** le tue prove restavano verdi
con la chiusura immediata **assente dal database**.

Presìdi che restano scoperti, con il danno misurato, elencati nell'appendice: `asOperator` che non si accorge di una
sessione morta in cache (l'unica difesa è la gemella positiva del tuo Passo 6); `dimenticaSessioni` e `rinnovoRiesce`
senza sonda; `asOperatorCommit` che duplica il corpo di `inRole`; `salon_settings` che `resetData` non ripristina;
`EMAIL_DI` esercitata per un account su quattro.

## Due punti del piano da guardare con sospetto

- Il `git add` del Passo 8 include **`tests/helpers/`** in blocco. Se non hai modificato gli aiuti, nominali uno per
  uno: un `git add` largo porta dentro modifiche che non hai dichiarato.
- Il messaggio di commit del Passo 8 dice «Le **15** politiche», l'intestazione del task dice 13. Il numero vero è
  quello che misuri tu (vedi sopra: 15 il 24/09/2026). Scrivi quello, e correggi in sede la formula sbagliata.

## Come chiudere

Fermati dopo il commit del Passo 8 e scrivi un resoconto con:

1. i file creati o modificati e il numero del commit;
2. l'output vero del gate (le quattro voci);
3. la tabella delle sonde di mutazione: mutazione → prova che è arrossita → numero di rosse **misurato**;
4. **quante prove hai adattato al Passo 6 e quante gemelle positive hai aggiunto**, file per file;
5. il numero vero delle politiche riscritte, e come l'hai contato;
6. tutto ciò che ti ha fatto esitare, o che nel piano era sbagliato o ambiguo;
7. che cosa hai dovuto decidere da sola, e che cosa costa se hai deciso male.

**Non partire con il Task 4**: il piano lo esegue una chat alla volta, con una revisione in mezzo.

## Come si fa la revisione, dopo

Due agenti indipendenti avversariali **in parallelo**, ma con la risorsa condivisa **partizionata**: c'è un solo
database locale, e due revisore che lanciano la suite insieme producono 110-114 rosse **false** (trappola 1). Nel
Task 2 ha funzionato così, e ha trovato due reperti che né l'esecutrice né una revisione sola avevano visto:

- una **empirica**, proprietaria **esclusiva** del database e di Vitest, che rimisura le sonde dichiarate e ne inventa
  di nuove, e che ha il compito esplicito di cercare *«una mutazione invisibile oggi e letale al task successivo»*;
- una **a secco**, in sola lettura (file, `git`, `grep`, `tsc --noEmit`, `docker … env`), a cui è **vietato** lanciare
  Vitest o qualunque comando che scriva sul database, e che consegna **ipotesi falsificabili**: ognuna con il comando
  esatto che la proverebbe e l'esito che la confermerebbe. Quelle ipotesi le misura l'orchestratrice dopo.

A entrambe si dà l'elenco dei punti dove l'esecutrice si sente **debole**, non quelli dove è sicura, e si chiede
esplicitamente di verificare le affermazioni con numeri del **messaggio di commit**.
