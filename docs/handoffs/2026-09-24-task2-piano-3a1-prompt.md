# Prompt per il Task 2 del piano 3a-1 — `salon-scheduler`

Scritto il 24 settembre 2026 dalla chat che ha eseguito il Task 1. Si incolla in una chat fresca.
Tutto ciò che segue la riga di separazione è il prompt.

---

Sei l'esecutrice del **Task 2** del piano 3a-1 del progetto `salon-scheduler` (agenda per il centro estetico
AVStyle). Lavori in `/Users/nadiaottavi/Desktop/Git/salon-scheduler`, ramo `main`.

## Controllo d'ingresso — prima di qualunque cosa

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
git merge-base --is-ancestor e655d131eba6fdc9a316e09977366aa1e76d7c61 HEAD \
  && echo "storia lineare" || echo "STORIA RISCRITTA — questo prompt è invalido"
git diff --stat e655d131eba6fdc9a316e09977366aa1e76d7c61..HEAD -- supabase tests src
git status --short
git branch --show-current
```

Atteso, una riga per comando:

- il primo stampa **`storia lineare`**: il Task 1 è ancora nella storia di questo ramo;
- il secondo non stampa **niente**: dopo la fine del Task 1 nessuno ha toccato `supabase/`, `tests/` o `src/`. Se
  stampa qualcosa, qualcuno ha lavorato sul codice dopo di me e questo prompt è vecchio;
- il terzo non stampa niente tranne `?? .superpowers/` e i due file più vecchi sotto `docs/handoffs/`, che sono
  preesistenti e **non si toccano**;
- il quarto stampa **`main`**.

Il controllo non nomina l'ultimo commit apposta: il commit che introduce questo file sposterebbe HEAD e renderebbe
il controllo impossibile da superare.

Se una qualunque riga diverge, **fermati e dillo**: non eseguire il Passo 1 e non proporre alternative finché non
ti rispondono.

## Che cosa leggere, prima di toccare qualunque cosa

1. `docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` — l'intestazione, i «Vincoli globali», la
   «Struttura dei file» e tutto il **Task 2** (da `### Task 2` fino a dove comincia `### Task 3`). I vincoli globali
   valgono anche se il task non li ripete.
2. Dello stesso file, l'**appendice in fondo**, «Esecuzione del Task 1 e revisione (24 settembre 2026)»: dice che
   cosa è stato consegnato, che cosa è rimasto scoperto e perché.
3. `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md`, §4.7 e D3-14/D3-17 (la chiusura delle sessioni):
   è la ragione per cui questo task esiste **prima** del Task 3.
4. `tests/helpers/db.ts` e `tests/helpers/fixtures.ts`: il Task 2 modifica il primo.
5. `supabase/seed.sql` (solo per leggerlo: **non si tocca**, il perché sta nel Passo 1) e `supabase/config.toml:206`.

Dichiara all'inizio quali di questi hai letto.

## Che cosa fare

I **sette passi** del Task 2, in ordine, uno alla volta, spuntando le caselle `- [ ]` nel file del piano man mano che
li chiudi. Il piano contiene il testo completo degli aiuti e delle prove: **si trascrive, non si reinventa**. Se una
riga del piano non funziona, **fermati e dillo**: non aggiustarla di tua iniziativa.

Il task tocca quattro file e **nient'altro**:

- crea `tests/helpers/sessioni.ts`
- modifica `tests/helpers/db.ts`
- modifica `supabase/config.toml` (solo il limite locale di accessi: si **sostituisce** il valore alla riga 206, non
  si aggiunge una seconda chiave)
- crea `tests/schema/sessioni-imbracatura.test.ts`

Non anticipare il Task 3.

## Vincoli che non si negoziano

- ⛔ **Mai `psql`**: non è installato, e da proprietario scavalcherebbe la sicurezza per riga dando misure false in
  silenzio. Ogni misura si prende con uno script Node che usa `pg`. Se lo script sta fuori dal progetto, importa `pg`
  per path assoluto (`/Users/nadiaottavi/Desktop/Git/salon-scheduler/node_modules/pg/lib/index.js`): altrimenti esce
  con `Cannot find package 'pg'` e sembra un blocco del database.
- ⛔ **`supabase/seed.sql` non si tocca**, mai: `[db.seed]` è attivo e un `db reset --linked` lo eseguirebbe contro il
  progetto ospitato.
- **Italiano** in prosa, commenti, nomi delle prove e messaggio di commit.
- Dopo ogni modifica alle migrazioni o a `config.toml`: `npx supabase db reset`, e controlla che **non** compaia
  nessuna riga `Skipping migration`.
- **Il gate si esegue in serie**, con l'output vero incollato nel resoconto:
  `npx supabase db reset`, `npm test`, `npm run test:fuso`, `npx tsc --noEmit`.
- Le **sonde di mutazione si eseguono davvero**: si applica la mutazione, si lancia la prova, si verifica che sia
  rossa, si ripristina, si rilancia e si verifica che sia di nuovo verde. Una sonda «ragionata» non vale.
- Se Docker non risponde: `open -a OrbStack`, ~30 s, poi `npx supabase start`.
- **`git push` mai**, per nessun motivo. Il commit sì, quello del Passo 7.

## Le trappole misurate nel Task 1 — non ripeterle

1. **Mai due suite insieme.** Lanciare un secondo `npm test` mentre il primo gira dà **110-114 prove rosse** con
   `duplicate key value violates unique constraint` dentro `seedFixture`, e una suite ferma oltre dieci minuti.
   Non è il codice e non sono i contenitori. Prima di lanciare il gate: `pgrep -f vitest` deve dare **zero**.
   Sintomo diagnostico: se **nessun** file di prova completa, non è il codice — il codice rotto lascia finire gli
   altri file.
2. **`asOperator` annulla la transazione uscendo.** Quello che scrivi lì dentro non esiste più per una connessione
   successiva: se devi asserire l'effetto di una scrittura fatta da operatrice, **leggilo dentro la stessa
   transazione**, non con un `asOwner` dopo.
3. **Il ripristino di un file non ripristina il database.** Dopo aver rimesso a posto una migrazione mutata serve un
   `db reset` prima di rimisurare. E per un file **non tracciato** il ripristino si fa da una copia di scorta, non
   con `git checkout --`, che lo cancellerebbe.
4. **«Senza vittime» non vuol dire «equivalente».** La prima è una misura, la seconda è una tesi da argomentare. Nel
   Task 1 tre righe della tabella delle sonde le confondevano, e in un caso la mutazione «equivalente» fermava ogni
   cancellazione di visita del database. Se una mutazione non fa arrossire niente, **dichiaralo** e di' che cosa
   farebbe davvero in produzione; non spacciarla per innocua.
5. **Attenzione al caso facile.** Nel Task 1 cinque prove giravano tutte da `asOwner`, cioè dal proprietario, e
   quindi non potevano accorgersi della perdita del `security definer`. Chiediti sempre con quale **profilo** gira
   la prova, e se quel profilo può fallire.
6. **`create or replace function` azzera gli attributi non ripetuti** (`security definer`, `set search_path`). Se
   riscrivi una funzione, ripetili per esteso.

## Che cosa ti ha lasciato il Task 1

`supabase/migrations/0013_invii_e_cancellate.sql` con le tabelle `invio` e `visita_cancellata`, le funzioni
`app.versione`, `app.apri_invio`, `app.chiudi_invio` e il trigger `zz_registra_visita_cancellata`; e
`tests/schema/invii.test.ts` con **14 prove**. Baseline verificata il 24/09/2026 a `e655d13`, eseguita in serie:
`npm test` → **19 file, 270 prove verdi** in 8,48 s; `npm run test:fuso` → 96 verdi; `npx tsc --noEmit` → uscita 0;
`npx supabase db reset` senza righe `Skipping migration`.

Il Task 2 modifica `tests/helpers/db.ts`, che **tutte** le prove usano: il Passo 6 ti chiede di eseguire tutta la
suite apposta. Se qualcosa si rompe, si rompe lì.

## Come chiudere

Fermati dopo il commit del Passo 7 e scrivi un resoconto con:

1. i file creati o modificati e il numero del commit;
2. l'output vero del gate (le quattro voci);
3. la tabella delle sonde di mutazione: mutazione → prova che è arrossita → numero di rosse **misurato**;
4. tutto ciò che ti ha fatto esitare, o che nel piano era sbagliato o ambiguo;
5. che cosa hai dovuto decidere da sola, e che cosa costa se hai deciso male.

**Non partire con il Task 3**: il piano lo esegue una chat alla volta, con una revisione in mezzo. La revisione del
Task 1 — due agenti indipendenti avversariali, in parallelo — ha trovato un presidio scoperto che l'esecutrice e la
prima revisora non avevano visto: vale la pena rifarla uguale.
