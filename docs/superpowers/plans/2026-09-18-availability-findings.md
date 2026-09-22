# Disponibilità — findings: dove il piano 2 e la misura sono andati in disaccordo

**Data:** 18 settembre 2026
**Piano:** `docs/superpowers/plans/2026-09-18-salon-scheduler-availability.md`
**Spec:** `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`, revisione 5 — **non corretta** da questa
riconciliazione (salvo l'esempio di §7.4, corretto per decisione dell'utente: vedi n. 12). Le divergenze 1–11 non
toccano la spec; la n. 12, aggiunta il 22 settembre 2026, registra un esempio della spec (§7.4) che, preso alla
lettera, non faceva ciò che dichiarava. Lo stesso giorno, per decisione dell'utente, l'esempio è stato corretto in
spec §7.4 (paragrafo «Corrected on 2026-09-22»); la revisione resta la 5
**Suite al momento della scrittura:** 256 prove su 18 file, tutte verdi; 13 migrazioni
**Ledger decisione per decisione:** `.superpowers/sdd/2026-09-18-salon-scheduler-availability/progress.md`

Questa è la traccia di verifica che spec §15 chiede, gemella di
`2026-09-17-foundations-findings.md`. Vale la stessa regola: **dove un'affermazione scritta e una prova che passa
sono in disaccordo, vince la prova**, e il documento si corregge.

## Una differenza di carattere rispetto al documento del piano 1

Il piano 1 divergeva **nel comportamento**: la spec diceva una cosa e le migrazioni ne facevano un'altra, e venti
volte su venti a decidere era stata una prova. **Qui no.** Il piano 2 prescriveva il codice per intero, il codice
è stato trascritto alla lettera — verificato a macchina, byte per byte, su tutti e undici i task — e **il
comportamento non diverge mai dal piano**. Le prime undici divergenze qui sotto sono tutte fra la **prosa del
piano** e la **misura**: annotazioni di sonde, attese di conteggio, commenti con numeri sbagliati accanto a valori
giusti. La dodicesima, aggiunta dopo, è fra un esempio della **spec** e la misura.

Non sono innocue per questo. Una tabella di sonde che dichiara un esito diverso da quello reale è una **bugia sul
presidio**, ed è esattamente ciò che fa credere presidiato un ramo che non lo è: le prime due qui sotto sono di
quella specie.

Dodici divergenze: le prime undici ordinate per quanto danno stavano facendo, la n. 12 aggiunta in coda il 22
settembre 2026.

---

## 1. L'invariante D2-1 «l'unico posto in tutto il sistema» è falsa

**Il piano dice** (D2-1, e i commenti prescritti in `src/dominio/tempo.ts` e `src/dominio/tipi.ts`): `endCell` si
calcola in un posto solo, `blocco()`, e `availability_window` restituisce `cell_count` grezzo «così l'aritmetica
non esiste in due lingue». Il commento committato dice, alla lettera, «QUESTO è l'unico posto in tutto il sistema
che la calcola».

**Che cosa dice la misura.** `supabase/migrations/0005_occupancy.sql:51` calcola
`new.start_cell + new.cell_count - 1` dentro un `generate_series`, per materializzare `appointment_slot`.
**L'aritmetica dell'ultima cella inclusa esiste già in due lingue**, e quella migrazione **precede** il piano 2.

**Chi l'ha decisa.** Il revisore del Task 1, che ha nominato il rischio «duplicazione dell'aritmetica dell'ultima
cella» *prima* di cercarlo e poi ha fatto una ricerca su `src`, `tests` e `supabase`. La ricerca dichiarata
dall'implementatore («compare una volta in tutto il repo, verificato con una ricerca sull'intero albero») era vera
della stringa TypeScript e falsa dell'invariante, perché non aveva guardato l'SQL.

**Perché conta.** Le due formule oggi **concordano**, quindi nessun danno di comportamento. Il danno è sul lettore
futuro: il commento lo invita a credere che cambiare la convenzione di `endCell` si faccia in un posto solo.

**Che cosa fare.** O correggere il commento perché nomini la seconda sede — «l'unico posto in TypeScript; in SQL la
stessa regola vive nel trigger di 0005» — o ricondurre la materializzazione dei minuti a una sola definizione.
È una decisione dell'utente, non dell'esecutore, e per questo il commento è stato lasciato com'era.

**Stato (22 settembre 2026):** note corrette nel codice e nelle prove; l'utente ha scelto la prima strada. Ora
`src/dominio/tempo.ts` (commento di `blocco()`), `src/dominio/tipi.ts` (commento di `Blocco`),
`src/dominio/finestra.ts` e `tests/schema/availability-window.test.ts` dicono «l'unico posto **in TypeScript**» e
nominano come seconda sede, da tenere d'accordo, la funzione `app.sync_appointment_slots` di
`0005_occupancy.sql`, eseguita dal trigger `zz_sync_appointment_slots`. **Resta** invece il commento
falso in `supabase/migrations/0012_availability_window.sql:111-112`: la migrazione è già applicata, e quel commento
sta dentro il corpo `$$` della funzione, quindi cambiarlo cambierebbe la funzione salvata nel database. Chi legge
quella migrazione trovi qui la correzione. Il commento di testa di `tempo.ts` («l'unico posto dove una cella
diventa un orario») è stato verificato e lasciato: nessun'altra conversione da cella a orario in `src/` o in
`supabase/`.

---

## 2. La premessa della sonda 1 del Task 8 era vera al Task 5 e falsa al Task 7

**Il piano dice** (Task 8, tabella delle sonde, riga 1): mutare `i < durations.length - 1` in `true` dentro
`campataOccupata` è il buco che nessuna prova copriva, e il Task 8 esiste per chiuderlo.

**Che cosa dice la misura.** Con `durations` di lunghezza 1 la mutazione fa passare la campata da `d[0]` a
`d[0] + buffers[0]`, e **due prove del Task 7 la uccidono già di rimbalzo**: quella con `buffers:[3]`, che perde la
partenza 129, e *«onora tutte e due le pause»*, che asserisce l'elenco intero e diventerebbe
`[123..130, 152..172]` invece di `[123..132, 152..174]`. Le altre prove a servizio singolo hanno `buffers:[0]` e
non la vedono.

**Chi l'ha decisa.** L'implementatore del Task 8, che l'ha dichiarata spontaneamente; il revisore l'ha verificata e
ha **corretto l'inquadramento**: i buchi che il Task 8 chiude davvero sono la **sonda 2** (l'addendo delle pause
tolto del tutto) e la **sonda 4** (`campata` → `durations[0]` in `celleLibere`), **entrambe invisibili a tutte le
24 prove precedenti**, perché nessuna di quelle aveva più di un servizio e con un servizio solo l'addendo delle
pause vale già 0.

**Perché conta.** Il valore del Task 8 non dipende dalla frase sbagliata — anzi è maggiore di come la frase lo
descrive. Ma chi riusa il piano crederebbe che la sonda 1 sia l'unico presidio, e non aggiungerebbe la prova
diretta su `campataOccupata` in isolamento, che è il vero contributo del task.

---

## 3. La sonda 2 del Task 6 ne uccide cinque, non otto, e non «spegne» niente

**Il piano dice** (Task 6, tabella delle sonde, riga 2): mutare `inizio + campata <= fascia.endBoundary` in
`inizio <= fascia.endBoundary` è *«ampia: spegne l'enumerazione intera e ne uccide otto»*.

**Che cosa dice la misura.** Ne uccide **cinque**, e **«spegne l'enumerazione» è la descrizione sbagliata**: la
mutazione confronta un indice di **cella** con un indice di **confine**, quindi il ciclo si **allarga** e propone
partenze che sforano, non si azzera. Le quattro che restano verdi usano `toContain`/`toBeNull`, su cui la
sovra-enumerazione non toglie nulla.

**Chi l'ha decisa.** Due misure indipendenti: l'implementatore del Task 6, che l'ha segnalata, e il revisore, che
ha enumerato tutte e 17 le prove sotto la mutazione e nominato le cinque rosse.

**Perché conta.** La prova nominata diventa comunque rossa e il codice è corretto: nessun danno. Chi riesegue la
sonda, però, trova un numero diverso da quello atteso e perde tempo a cercare un difetto che non c'è.

---

## 4. Il commento della prova discriminante del Task 3 ha l'orario sbagliato accanto al numero giusto

**Il piano dice** (Task 3, commento prescritto di *«non allunga una fascia all indietro per una chiusura che sta
tutta prima»*): «Qui sono 40 minuti, dalle 07:30 alle 08:10».

**Che cosa dice la misura.** La chiusura scritta è `{ fromBoundary: 90, toBoundary: 100 }`, cioè **07:30–08:20,
50 minuti**. I **40 minuti** sono la disponibilità che la mutazione **inventerebbe** — le celle 100–108, cioè
**08:20–09:00**. Il numero 40 è giusto; l'orario che gli sta accanto è quello della chiusura, ed è sbagliato in coda.

**Chi l'ha decisa.** Il revisore del Task 3; ricalcolato da me con `ora(b) = b*5` minuti dalla mezzanotte.

**Perché conta.** I valori `90–100` sono **giusti e scelti bene** — sono l'unico caso osservabile, nel verso
pericoloso — e la prova discrimina. Ma chi ricontrolla l'aritmetica la trova incoerente e rischia di «correggere» i
valori, cioè di spostare la prova sul caso innocuo: esattamente il difetto che la seconda revisione del piano aveva
già dovuto correggere una volta.

**Stato (22 settembre 2026):** note corrette nel codice e nelle prove; il commento di `tests/dominio/fasce.test.ts`
ora dice che la chiusura è 90→100, cioè 07:30–08:20, e che i 40 minuti inventati sarebbero 08:20–09:00. Nel
secondo giro è stata corretta anche la frase subito sopra, che era falsa allo stesso modo: senza il guardiano
`a <= f.startBoundary` la fascia si allunga all'indietro fino alla **fine** della chiusura (100), non al suo inizio
(90), e nel caso `a === startBoundary` scatta **un solo** `push`, non due. Misurato togliendo il guardiano da
`sottrai()`: la prova arrossisce con `startBoundary: 100` ricevuto al posto di 108. I valori della prova non sono
cambiati.

---

## 5. Il commento della prova da capo a fondo del Task 11 descrive una chiusura al contrario

**Il piano dice** (Task 11, commento prescritto di *«porta una chiusura parziale fino al motivo salone chiuso»*):
«È l'esempio del 24 dicembre: il salone chiude alle 13:00 e l'operatrice lavorava 09:00–13:00».

**Che cosa dice la misura.** La chiusura scritta è `from_boundary: 96, to_boundary: 156`, cioè **08:00–13:00**:
una chiusura **mattutina**, che taglia via tutta la fascia da sotto. Con i numeri della narrazione — chiusura **da**
156 in poi — la fascia `[108,156)` non verrebbe svuotata affatto e il caso non esisterebbe.

**Chi l'ha decisa.** Il revisore del Task 11, che ha rifatto la sottrazione `[108,156) − [96,156) = ∅` e la cascata
di `dayStatus`.

**Perché conta.** Stessa specie della n. 4: numeri giusti, prosa fuorviante. Ed è la prova che **congiunge i Task 3
e 5** — l'unica che cattura una rottura del cablaggio fra i due moduli — quindi è quella che meno di tutte va
«corretta» da chi legge il commento invece dei numeri.

**Stato (22 settembre 2026):** note corrette nel codice e nelle prove. Le sedi erano **due**, non una: oltre a
`tests/dominio/cercaposti.test.ts:397`, la stessa narrazione stava in `tests/dominio/fasce.test.ts:154`, sopra
*«legge come salone chiuso una chiusura PARZIALE che svuota il giorno»* (numeri di riga di `a5775b4`). Il
censimento precedente l'aveva mancata.
Tutte e due le note dicevano allora che la chiusura è 96→156, cioè 08:00–13:00, e che è uno scenario **scelto per
svuotare il giorno**, non una citazione della spec; e rimandavano alla divergenza n. 12. I valori delle prove non sono
cambiati. Dopo la correzione di §7.4, lo stesso giorno, le due note sono state riscritte ancora: ora chiamano
questo scenario **equivalente** all'esempio corretto. Vedi lo Stato della n. 12.

---

## 6. Il Task 3 dice «due» e ne elenca tre

**Il piano dice** (Task 3, Passo 2): falliscono sette delle dieci prove nuove, e «restano verdi anche **due** delle
nuove», seguito da due punti elenco che ne nominano **tre**.

**Che cosa dice la misura.** Le rosse sono **sette** — il numero vincolante, e giusto — e le verdi sono **tre**:
*«lascia intatta una fascia che la chiusura non tocca»*, *«non allunga una fascia all indietro…»* e *«non
attribuisce alla chiusura parziale un giorno che era già vuoto»*.

**Chi l'ha decisa.** Verificato da me a mano nella scansione preflight, prima di dispatchare il task, e poi
misurato dall'implementatore: `Tests 7 failed | 9 passed (16)`.

**Perché conta.** Nulla: il piano stesso ordina di «verificare il conteggio invece di fidarsi di questa riga», e il
numero che conta è giusto. È registrato per completezza.

---

## 7. Il conteggio delle prove al Passo 5 del Task 10 è più vecchio del piano che lo contiene

**Il piano dice** (Task 10, Passo 5): «Le prove sono 145 più quelle scritte dai Task 1–10».

**Che cosa dice la misura.** 220 + 15 = **235**. La formula «145 più…» viene da una revisione precedente del piano,
quando il conteggio partiva da un altro punto.

**Perché conta.** Nulla, se non che il numero atteso al Passo 5 va ricavato e non letto.

---

## 8. La sonda 4 del Task 8 non è applicabile alla lettera

**Il piano dice** (Task 8, tabella delle sonde, riga 4): «in `celleLibere`, usare `durations[0]` al posto di
`campata`».

**Che cosa dice la misura.** `celleLibere` **non riceve** `durations`: la sua firma è
`(occupati, inizio, campata)`. La mutazione è eseguibile solo al **sito di chiamata**, cambiando l'argomento
passato. L'implementatore l'ha applicata lì e l'ha dichiarato; è l'unica lettura fedele, e il difetto simulato è
lo stesso.

**Perché conta.** Nulla sul codice. È registrato perché il prossimo esecutore, applicandola alla lettera, non
troverebbe dove metterla.

---

## 9. La sonda 3 del Task 10 nomina la prova con un nome che non esiste

**Il piano dice** (Task 10, tabella delle sonde, riga 3): la prova che deve arrossire è *«prende una chiusura che
ingloba l intervallo senza starci dentro»*.

**Che cosa dice la misura.** Il nome vero della prova, nel file che il piano stesso prescrive, è *«prende le
chiusure che inglobano l intervallo senza starci dentro, ordinate»* — al plurale e con la coda sull'ordine, perché
la prova ha **due** chiusure apposta, così che l'`order by c.start_date` non sia dichiarato e mai esercitato.

**Perché conta.** Nulla: è la stessa prova. Registrato perché un esecutore che cerca il nome esatto non lo trova.

---

## 10. La sonda 2 del Task 11 ha una vittima collaterale non annotata

**Il piano dice** (Task 11, tabella delle sonde, riga 2): indicizzare le eccezioni per la sola `operator_id` deve
far arrossire *«applica l eccezione solo alla sua data e alla sua operatrice»*.

**Che cosa dice la misura.** Arrossisce **anche** *«arriva al ventottesimo giorno e non al ventinovesimo»*:
applicando l'eccezione a ogni data, il documento produce righe in tutti i 28 giorni e l'atteso `[]` cade. La prova
nominata arrossisce comunque, quindi la sonda resta discriminante.

**Perché conta.** Poco, ma non zero: significa che *«arriva al ventottesimo giorno»* non è un presidio **puro** del
confine dell'orizzonte. A presidiare quel confine da sola resta la **sonda 6**, che non tocca le eccezioni.

---

## 11. Il CLI salta la migrazione, ma per una ragione leggermente diversa da quella scritta

**Il piano dice** (Trappole misurate, e Task 10): «il CLI Supabase salta in silenzio una migrazione il cui
**prefisso numerico contiene un non-cifra**, stampa una riga facile da non vedere e `db reset` esce con successo».

**Che cosa dice la misura.** Eseguita apposta la sonda 13 — rinominando il file in `0012b_availability_window.sql`
— `db reset` è uscito **0** e ha stampato, in cima all'elenco e prima di `Applying migration 0001_…`:

```
Skipping migration 0012b_availability_window.sql... (file name must match pattern "<timestamp>_name.sql")
```

La ragione che il CLI dichiara è che **il nome non corrisponde al modello**, non che il prefisso contenga un
non-cifra. L'effetto è identico, e tutte e 15 le prove del file diventano rosse con `42883`.

**Perché conta.** La trappola è **confermata alla fonte**, che è la cosa che importa. La sfumatura è registrata
perché la formulazione del piano fa pensare a una regola sulle cifre, mentre la regola vera è sul modello del nome
intero — e un file chiamato, per dire, `12_qualcosa.sql` o `0012-qualcosa.sql` cadrebbe nella stessa trappola per
ragioni che la formulazione del piano non copre.

**È inoltre l'unica sonda del piano il cui reperto è l'ASSENZA di una prova capace di coglierla**, e resta tale:
nessuna prova di questo repo si accorgerebbe di una migrazione saltata. È materiale per il piano 3.

---

## 12. L'esempio del 24 dicembre di §7.4, preso alla lettera, non svuota il giorno

**La spec diceva** (§7.4, `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md:1048` in `ad98457`):
`dayStatus` è `'salon_closed'` quando una chiusura, anche parziale, lascia il giorno senza fasce; altrimenti «a 24
December closed from 13:00, on a day Alessandra worked 09:00–13:00» risulterebbe aperto e pieno. Portava cioè quel
giorno come esempio di chiusura parziale che **svuota** il giorno.

**Che cosa dice la misura.** Una chiusura che **comincia** alle 13:00 non tocca una fascia che **finisce** alle
13:00. Lo mostra la prima metà di *«legge come salone chiuso una chiusura PARZIALE che svuota il giorno»*
(`tests/dominio/fasce.test.ts:158` in `a5775b4`): fascia 108→156, chiusura 156→288, attesa `dayStatus`
**`'open'`**, e la prova passa. L'esempio di §7.4, così com'era scritto, non produceva il caso che voleva
illustrare.

§6.5 (`:928`) nomina lo stesso giorno con «24 December until 13:00», nella stessa frase delle settimane a orario
ridotto. La lettura più naturale è «si lavora fino alle 13:00», cioè chiuso dalle 13:00, come in §7.4. È al massimo
ambigua, e non è una seconda versione su cui appoggiarsi.

Le prove che svuotano il giorno usano 96→156, cioè chiuso 08:00–13:00. È uno scenario **scelto per svuotare il
giorno**, non una citazione della spec.

**Chi l'ha decisa.** Trovata correggendo le note delle divergenze 4 e 5, il 22 settembre 2026; riformulata dopo la
revisione indipendente, che ha mostrato come la prima stesura leggesse in §6.5 una contraddizione che il testo non
impone.

**Perché conta.** Il codice e le prove sono giusti. Ma chi rileggeva §7.4 per scrivere una prova nuova l'avrebbe
scritta con la chiusura dalle 13:00 e il turno 09:00–13:00, e avrebbe ottenuto un giorno aperto invece di un giorno
chiuso.

**Che cosa fare.** Correggere l'esempio di §7.4 perché svuoti davvero il giorno era una decisione dell'utente.

**Stato (22 settembre 2026):** esempio corretto in spec §7.4, con il turno 14:00–18:00, per decisione dell'utente.
Ora dice «a 24 December closed from 13:00, on a day Alessandra worked 14:00–18:00»: la chiusura 156→288 copre
tutto il turno 168→216 e il giorno resta senza fasce. Il testo sostituito è citato nel paragrafo «**Corrected on
2026-09-22, after the availability plan:**», subito dopo la frase corretta, in
`docs/superpowers/specs/2026-09-17-salon-scheduler-design.md:1053`. Le due note delle prove ora dicono che
l'esempio corretto è «chiuso dalle 13:00, turno 14:00–18:00» e che la prova ne usa uno equivalente con la chiusura
al mattino. La nota di `fasce.test.ts` dice anche che la sua prima metà resta perché documenta l'esempio vecchio.
I valori e le attese delle prove non sono cambiati. §6.5 non è stato toccato.

La stessa correzione precisa anche la conseguenza. «Aperto e pieno», qui sopra, cita la vecchia spec, e non era il
comportamento reale: senza la regola il giorno esce `'open'` con le fasce vuote, e `proposeStarts` risponde
`operator_off` (D2-5, `src/dominio/proposte.ts:55`), non `full`. Misurato dalla revisione indipendente togliendo la
regola. Ora §7.4 dice che il cercaposti darebbe la colpa all'operatrice.

---

## Buchi di presidio trovati dopo gli undici task, e chiusi

Le dodici divergenze qui sopra riguardano la prosa. Questa sezione riguarda qualcosa di più serio: prove che
**passavano per il motivo sbagliato**. Nessuna è un difetto del codice, che in ogni caso misurato era corretto;
ognuna è una regola che il piano dichiarava presidiata e che nessuna prova avrebbe difeso da una regressione.

Li ha trovati un **test-audit avversariale** che ha eseguito 123 mutanti reali sull'intero ramo — 92 uccisi, 31
sopravvissuti — e li ha chiusi **un'ondata di correzione sola**, commit `bdf511c`, **solo nei file di prova e
ampliando prove esistenti**: il conteggio è rimasto a 256. Ogni chiusura è stata misurata eseguendo la mutazione e
vedendo arrossire la prova, poi riverificata da una re-revisione indipendente che ha rieseguito i mutanti.

| Sede | Che cosa non era presidiato | Danno se la regola si perdesse | Come è chiuso |
|---|---|---|---|
| `0012_availability_window.sql:107` | La sovrapposizione delle chiusure era provata solo con `p_from === p_to`, l'unico intervallo in cui «sovrapposizione» e «la chiusura copre tutta la finestra» coincidono | Ogni chiusura che non copre tutti i 28 giorni sparisce: il cercaposti offre le 09:00 in un giorno di ferie | Chiusura 16–17 marzo in una finestra 12–19 marzo |
| `src/dominio/proposte.ts:90` | Il riassetto sull'occupazione già privata degli esclusi: le prove su `excludeAppointmentIds` avevano **tutte le pause a zero**, e con pausa 0 filtrare o no dà lo stesso elenco | Nello spostamento di una visita (§8.6) spariscono le tre celle per lato adiacenti, cioè proprio quelle che uno spostamento piccolo usa | Pausa 3 ed elenco intero |
| `src/dominio/cercaposti.ts:76` e `:72` | Il cablaggio di `excludeAppointmentIds` e di `buffers`: tutte le prove passavano `[]` e `[0]` | Lo stesso di sopra, dal lato del cercaposti | *«riporta full…»* ampliata con pausa 3 e un secondo giro con l'esclusione |
| `src/dominio/tempo.ts:93` | `blocco()` rifiutava 289 ma nessuna prova diceva che accetta 288 | Un appuntamento legale che finisce a mezzanotte fa sollevare `RangeError` e fallire l'intera richiesta del cercaposti | `blocco('a1', 280, 8, 0)` non deve sollevare |
| `tests/schema/availability-window.test.ts`, sei asserzioni | `toEqual([])` su tabelle che la prova non seminava; una, sotto un commento che rivendicava di presidiare `salon_closure_access` | Se quella politica sparisse, un account non operatrice leggerebbe il calendario delle chiusure | Semi aggiunti; misurato indebolendo la politica a `using (true)`: prova vecchia verde, prova nuova rossa |

Prima dell'audit, i revisori dei singoli task avevano già trovato e fatto chiudere **due guardie della sezione
`exceptions`** di `availability_window` (`and o.is_active` e il filtro per operatrice), dichiarate e mai esercitate:
commit `d1dd6d1`.

Una classe ricorre in quasi tutti questi reperti: **il gemello speculare**. Una regola è presidiata su un lato e
lasciata viva sull'altro — `celleLibere` sì e il riassetto no, `weekly` sì ed `exceptions` no, il `precedente` più
vicino sì e il `seguente` no. Un piano che dichiara «presidiato» guardando una sola metà lo ripete.

## Limiti noti rimasti aperti

Non producono oggi un dato sbagliato su un percorso che un utente percorre; sono scritti perché nessuno li scopra
credendo di aver trovato un buco nuovo.

- ~~**Il fuso orario in CI — decisione dell'utente.**~~ **Chiuso il 22 settembre 2026.** In
  `src/dominio/tempo.ts:64`, sostituire `getUTCDay()` con `getDay()` lasciava la suite verde sotto `Europe/Rome`
  **e sotto `UTC`**, cioè sotto `ubuntu-latest` di `.github/workflows/ci.yml`; moriva solo sotto
  `America/New_York`. Ora `package.json` ha lo script `test:fuso` (`TZ=America/New_York vitest run tests/dominio`)
  e la CI lo esegue subito dopo `npm ci`, prima di avviare Supabase. `vitest.config.ts` non è stato toccato.
  Misura, sul codice giusto: 4 file, 96 prove, tutte verdi. Due mutanti, ciascuno eseguito e poi ripristinato:
  `getUTCDay()` → `getDay()` (lasciando `Date.UTC`), e `new Date(Date.UTC(anno, mese - 1, giorno)).getUTCDay()` →
  `new Date(data).getDay()`. Per **tutti e due**: con `npm run test:fuso` **14 prove rosse su 96** (12 in
  `cercaposti.test.ts`, 2 in `tempo.test.ts`); con `TZ=UTC` e con `TZ=Europe/Rome`, 96 verdi su 96. Il «10» scritto
  in `test-audit.md:148` era sbagliato già allora: la revisione indipendente ha rimisurato il mutante 1 su
  istantanee di `4ba27e2` (il commit dell'audit), `bdf511c` e `a5775b4`, e dà sempre 14 (12 + 2); rimisurato anche dall'esecutore su un'istantanea di `4ba27e2`: 14. Nessuna deriva.
  Rapporto:
  `.superpowers/sdd/2026-09-18-salon-scheduler-availability/seguito-22-09-report.md`.
- `src/dominio/proposte.ts:141` — la scelta del `seguente` **più vicino** contro il **più lontano** non è esercitata
  da nessuna prova con due blocchi dopo la partenza. Il codice è corretto. Da non confondere con l'equivalenza
  dichiarata dal piano, che riguarda «il più vicino contro tutti».
- `tests/dominio/cercaposti.test.ts:132` — l'ausiliaria `ingressoCerca(sopra: Record<string, unknown>)` disarma il
  controllo dei tipi: `tsc --strict` accetta un campo inesistente, quindi un refuso nel nome di un override fa
  girare la prova sul valore di difetto. Oggi i nomi sono giusti. Il rimedio, `Partial<IngressoCercaposti>`, va
  preso nel piano 3.
- `src/dominio/cercaposti.ts:44-48` — l'ordine `full > service_too_long`, che D2-7 nomina per primo, non è
  esercitato; scambiarli lascia la suite verde. Conseguenza: un messaggio di vuoto meno informativo.
- `src/dominio/tempo.ts` — le guardie di interezza di `blocco()` su `cellCount` e `bufferAfterCells`, e le ancore
  delle regex di `confineDaOra` e `pezziData`; `confineDaOra` in particolare non ha alcun chiamante di produzione.
- Tre `order by` di `availability_window` (`:55`, `:83`, `:126`) che nessuna coppia di righe distingue.
- I **dieci mutanti equivalenti** — sette dichiarati dal piano, tre trovati dal test-audit (`proposte.ts:138` e
  `:141` su un altro asse, `cercaposti.ts:75`) — sono elencati in
  `.superpowers/sdd/2026-09-18-salon-scheduler-availability/test-audit.md`: un revisore futuro non li insegua.

## Obblighi che passano al piano 3

1. Il cercaposti **tronca e non pagina**: serve un `offset` o un cursore `(date, startCell, operatorId)`.
2. L'interruttore «cerca anche fuori orario» di §8.4 dovrà **estendere la firma** di `cercaPosti` o di
   `proposeStarts`.
3. L'obbligo di **ritentare su `40P01`** (spec §10.5) non ha ancora un percorso di scrittura applicativo da ritentare.
4. **Nessun presidio di catalogo copre i permessi delle funzioni**, solo quelli delle tabelle: una funzione futura
   che dimentica la revoca non la coglie nessuno.
5. Il contorno di `cercaPosti` (`limit: 0` dà una riga, `days: 0` dà un vuoto senza motivo, operatrici duplicate
   danno righe duplicate) e `decodificaFinestra` che non valida nulla: il chiamante che il piano 3 costruisce deve
   rispettarli o chiuderli.
6. **Una migrazione saltata dal CLI non la coglie nessuna prova** (divergenza n. 11).
