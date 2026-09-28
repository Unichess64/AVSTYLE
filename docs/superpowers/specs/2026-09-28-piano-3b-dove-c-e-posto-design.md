# Piano 3b — Dove c'è posto: documento di design

**Data:** 28 settembre 2026
**Revisione:** 2 — dopo il **primo giro di revisione avversariale**: cinque revisori indipendenti su Opus, lenti
distinte, **dieci bloccanti distinti (uno falso)**, 38 maggiori, 41 minori. Registro completo in
`docs/superpowers/plans/2026-09-28-piano-3b-giro-1-findings.md`. Quattro bloccanti chiusi da **decisioni dell'utente**
prese durante il giro (D3b-11…D3b-14), tre da correzioni di prosa, due restano **aperti in attesa del consulente
privacy**, uno era falso. Nessuna correzione è stata misurata per esecuzione.
**Revisione 1:** prima stesura, dal brainstorming del 28 settembre 2026 (dieci decisioni, tre blocchi di domande).
**Stato:** rivista al primo giro; in attesa del secondo
**Spec di riferimento:** `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`, revisione 5 (in inglese).
«spec §N» = sezione di quella spec; «§N» senza prefisso = sezione di questo documento.
**Documento fratello:** `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md`, **revisione 20**
[verificato due volte durante il giro]. «3a §N» = sezione di quel documento.
**Base di codice:** `main` a **`86d4223`** [misurato] — ⚠︎ la revisione 1 dichiarava `ee2a679`, e il **Task 8 del
piano 3a-1 è stato committato durante il giro di revisione**: `public.annuncio` **esiste**, non è più «in volo».
**Documenti fratelli scritti nelle stesse ore**, letti per la revisione 2 e non per la 1:
`plans/2026-09-28-piano-3a2-schermate.md`, `specs/2026-09-28-piano-3c-la-preparazione-design.md`,
`specs/2026-09-28-piano-4-dati-personali-design.md`.

Questo documento fissa **che cosa** costruisce il piano 3b e **perché**. Il **come**, riga per riga, è del piano di
implementazione.

Legenda: **[misurato]** = verificato su file o comando, con la sede; **[dalla revisione]** = misurato o letto da un
revisore del primo giro; **[dai findings]** = misurato dal piano 2 e registrato in
`2026-09-18-availability-findings.md`; **[dalla spec]**; **[proposta]** = numero o scelta che il piano misura o
conferma; **[da misurare]** = fatto non stabilito.

⚠︎ **Nessun numero di questo documento è [misurato] per esecuzione.** Chi l'ha scritto non ha potuto lanciare Vitest
né toccare il database: quattro chat lavoravano sullo stesso repo. Ogni fatto marcato [misurato] è una **lettura di un
file**, con la sede.

⚠︎ **Le sedi su `0019_annunci.sql` sono state rifatte sul commit `86d4223`.** Durante il primo giro quel file era
nell'albero di lavoro di un'altra chat che vi eseguiva sonde: due revisori l'hanno letto in stati diversi (una volta
**senza** `set search_path = ''`, sostituito da un commento di sonda; e a 210 poi 209 righe). Entrambi hanno
dichiarato la deriva invece di scegliere, che è la condotta giusta. Le citazioni per riga su quel file nei quattro
documenti fratelli **non concordano fra loro**, con scarti da −1 a +5.

---

## 1. Che cos'è il 3b

Il 3a costruisce **il giorno**: l'agenda che l'operatrice guarda, la scheda con cui scrive, il percorso di scrittura
che regge una collega che scrive insieme a lei. Il 3b costruisce **la domanda che arriva da fuori**: il telefono
squilla, e la voce dall'altra parte non chiede un giorno — chiede *«quando c'è posto?»*, oppure è una cliente che il
salone deve trovare, correggere, richiamare per il compleanno.

Tre schermate, una migrazione, un bottone che nessun piano aveva preso, e due obblighi aperti del piano 2 da decidere.

| Piano | Nome | Contenuto |
|---|---|---|
| 3a | Il giorno | scheletro, accesso e sessioni, navigazione, agenda (spec §9.1–§9.3), scheda visita (§9.4), percorso di scrittura, diretta, tutta la spec §10 |
| **3b** | **Dove c'è posto** | **cercaposti (spec §9.5) con paginazione e «fuori orario», clienti (§9.6), compleanni (§9.7)** |
| 3c | La preparazione | disponibilità (§9.8) e restringimento (§7.6), impostazioni (§9.9), primo avvio (§9.10), verifiche prima del rilascio, «telefono perso» |
| 4 | Dati personali | spec §11 |

**D19 resta:** il salone non usa l'app prima della fine del 3c — e questo ha tre conseguenze che §8 dichiara, perché
il piano 4 viene **dopo** il primo uso vero.

---

## 2. Decisioni dell'utente del 28 settembre 2026

Le prime dieci dal brainstorming; le ultime quattro prese **durante il primo giro**, ciascuna per chiudere un
bloccante.

| # | Decisione | Nota |
|---|---|---|
| **D3b-1** | **Passo di 15 minuti nella lista**, con «tutti gli orari» di un giorno a richiesta | §4.4. Il motore propone una partenza ogni **5 minuti** [misurato: `src/dominio/proposte.ts:85`, `inizio++`]: una mattina libera 9–13 con un servizio da 30′ dà ~43 partenze per operatrice, e con tre operatrici ordinate per orario (D2-11) la prima pagina diventa `09:00 Vera · 09:00 Annalisa · 09:00 Alessandra · 09:05 Vera…`. Scartate: le pastiglie per giorno (vanno a capo a 375 punti) e «le prime N per giorno» (nasconde il pomeriggio libero di un giorno con la mattina libera) |
| **D3b-2** | **«Fuori orario» propone dentro l'estensione dell'agenda**, `salon_settings.day_start_boundary`–`day_end_boundary` | §4.5. Oggi 96–240, cioè 08:00–20:00 [misurato: `supabase/migrations/0002_catalogue.sql:38`]. ⚠︎ **La ragione della revisione 1 era falsa** e la 2 la sostituisce: non è vero che «così non si propone niente che l'operatrice non possa poi guardare in agenda», perché **nulla nello schema limita le fasce risolte all'estensione dell'agenda** [misurato: `0006_availability.sql`, i vincoli sono solo `between 0 and 288`] — una fascia che comincia alle 07:00 produce **già oggi**, sul ramo dentro orario, una proposta fuori da quella finestra. La ragione vera: il ripiego limita **le partenze fuori orario** a una finestra sensata, e senza di esso si proporrebbero le 03:20 |
| **D3b-3** | **L'orizzonte si estende di 28 giorni per volta, fino a 84** | §4.6 |
| **D3b-4** | **I motivi del vuoto si riportano TUTTI, nominando l'operatrice** | §4.7. `PRECEDENZA_MOTIVI` smette di decidere fra operatrici e resta a decidere **dentro** un'operatrice. Chiude `PRECEDENZA-MOTIVI` |
| **D3b-5** | **`client` prende `updated_at`**, con una migrazione nuova e il trigger che esiste già | §5.4. `app.touch_updated_at()` è in `0004_visit_appointment.sql:41` [misurato]. ⚠︎ Composizione **verificata**: il piano 4 §5.3 rinuncia esplicitamente a quella colonna e la rimanda al 3b — «sarebbe la stessa migrazione scritta due volte da due chat» |
| **D3b-6** | **Nei compleanni, chi ha l'opt-out COMPARE, senza WhatsApp e senza chiamata** | §6, L3b-4. ⚠︎ **Ha una conseguenza fuori dal 3b**, trovata dal primo giro: il piano 4 §5.5 legge la stessa frase della spec come **esclusione** e ne fa il presidio del diritto di opposizione, consegnando al 3b un requisito che D3b-6 rende insoddisfacibile. Vedi §8 limite 9 |
| **D3b-7** | **«Prenota da lei» apre il CERCAPOSTI**, con cliente e servizio già scelti | §5.7 |
| **D3b-8** | **«Elimina cliente» si anticipa nel 3b**; l'esportazione resta al piano 4 | §5.6. ⚠︎ Corretta dal primo giro: il **posto** del pulsante d'export è del 3b, il **meccanismo** del piano 4 |
| **D3b-9** | **L'annuncio di una cliente cambiata riusa `annuncio.giorni`**: si aggiorna l'agenda, non la pagina Clienti | §7 |
| **D3b-10** | **`SEGUENTE-VICINO` si chiude con una prova** | §9.1. ⚠︎ **La nota della revisione 1 era falsa**: diceva «su entrambi i lati del gemello». Tre revisori hanno verificato alla sede che il lato `precedente` è **già ucciso** e che una delle due mutazioni prescritte è **equivalente**. Si riduce a **una** prova |
| **D3b-11** | **Due soli motivi per riga fuori orario**: «Vera non lavora» e «fuori dagli orari inseriti» | §4.5. Chiude un bloccante. «Il salone è chiuso» **non si usa per riga**: non è calcolabile, perché le chiusure sono consumate dentro `risolviGiorno` e a valle non si sa più quali celle hanno tagliato. Scartata la terza via — portare le chiusure nel dominio — che sarebbe stata una **sesta** estensione a un motore che §4.1 dichiara di non toccare. Costo accettato: dalla lista non si distingue un giorno di ferie da una chiusura del salone |
| **D3b-12** | **Codice d'invio e «Controlla» anche per la cliente** | §5.4. Chiude un bloccante trovato da **tre** revisori: senza, una risposta persa dopo un `COMMIT` riuscito fa dire all'app *«è stata modificata da una collega»* mostrandole **la sua stessa correzione**. Costo: un task in più |
| **D3b-13** | **Il «+» flottante dell'agenda è del 3b** | §3.1, §10. Chiude un bloccante: il 3a dice «nessun +», il piano 3a-2 scrive che è del 3b, la spec 3c lo lascia «non stabilito». Tre piani lo nominavano, nessuno lo prendeva, e il cercaposti ha **una sola** rotta (spec §9.5, §9.11) |
| **D3b-14** | **I ripieghi si mescolano PER GIORNO**: dentro ogni giorno prima i posti dentro orario, poi quelli fuori | §4.3, §4.5, §10. Chiude un bloccante trovato da **tre** revisori. Chi cerca «questa settimana» vede i ripieghi di questa settimana, non i posti buoni del mese prossimo. ⚠︎ E lo chiude **per costruzione, non per rattoppo**: l'ordine torna ad avere `date` come primo criterio, quindi il troncamento per giorno di D2-11 (`cercaposti.ts:56-98`) resta **valido** invece di dover essere demolito. Costo: la prima pagina di un lunedì di chiusura si riempie di righe fuori orario — il rischio che la separazione voleva evitare, ma limitato al primo giorno invece che all'orizzonte |

---

## 3. Perimetro del 3b

### 3.1 Dentro

- **Cercaposti** (spec §9.5, §8.3): scelta dei servizi, risultati paginati su 28 giorni estendibili, interruttore
  «cerca anche fuori orario», stato vuoto con i motivi.
- **Il «+» flottante dell'agenda** (D3b-13): posizione, dimensione ≥ 44 punti (3a §7), deep rose. È **l'unica
  modifica che il 3b fa a una schermata del 3a-2**, e le due chat si coordinano su quel file.
- **Clienti** (spec §9.6): elenco, ricerca, scheda con le visite passate e future, creazione fuori dalla scheda
  visita, **modifica** (compresi `preferred_operator_id` e `no_messages`), **Elimina** (D3b-8), **il posto** del
  pulsante «esporta la sua scheda», «prenota da lei» (D3b-7).
- **Compleanni** (spec §9.7): oggi, questa settimana, questo mese; WhatsApp o chiamata.
- **Una migrazione**: `client.updated_at` e il suo trigger, `salva_cliente`, `cancella_cliente`, `compleanni`, e il
  trigger d'annuncio — **quattro** funzioni nuove, non tre (§9.2).
- **L'estensione della firma di `cercaPosti`**: sei estensioni (§4.1).
- **Prova 2 di spec §13.4**.

### 3.2 Obblighi aperti che il 3b chiude

| Obbligo | Come | Prova |
|---|---|---|
| `CERCAPOSTI-PAGINE` | cursore `(date, fuoriOrario, startCell, operatorId)` — **quattro** campi (§4.3) | §9.1 |
| `FUORI-ORARIO` | fasce di ripiego **piegate** con le risolte, dentro la firma (§4.5) | §9.1 |
| `CONTORNO-CERCAPOSTI`, resto | guardie sui tre contorni del piano 2 **e sui cinque campi nuovi** (§4.8) | §9.1 |
| `INGRESSO-CERCA-TIPO` | `Partial<IngressoCercaposti>` in `tests/dominio/cercaposti.test.ts:132` [misurato] (§4.8) | `tsc --noEmit` con un refuso deliberato |
| `SEGUENTE-VICINO` | **una** prova, su `proposte.ts:141` (D3b-10) | §9.1 |
| `PRECEDENZA-MOTIVI` | l'ordine smette di decidere fra operatrici (D3b-4); **due** mutazioni sulla costante, non una | §9.1 |
| `PERMESSI-FUNZIONI`, estensione | le **quattro** funzioni nuove negli elenchi nominativi dell'audit del Task 9 | §9.2 |

### 3.3 Fuori

- **3a / 3a-2:** guscio, accesso, navigazione, involucro degli errori, agenda, scheda visita, percorso di scrittura,
  diretta, tutta la spec §10.
- **3c:** disponibilità e restringimento, impostazioni — comprese le ore del salone, che D3b-2 **legge** e non
  modifica —, primo avvio, verifiche prima del rilascio, «telefono perso».
- **Piano 4:** spec §11 — il **meccanismo** dell'esportazione, la conservazione e il suo distintivo, l'export
  dell'intero insieme, l'informativa.
- **Le visite a due mani dal cercaposti:** §8 limite 1.

---

## 4. Il cercaposti

### 4.1 Che cosa esiste già, e che cosa il 3b aggiunge

⚠︎ **Il motore è finito e non si riprogetta.** Il piano 2 ha consegnato sei moduli in `src/dominio/` con 256 prove su
18 file, più `npm run test:fuso` (96 prove sotto `TZ=America/New_York`) [dai findings].

Tre decisioni del piano 2 vincolano il capitolo:

- **D2-9** — il riassetto guarda l'appuntamento **più vicino** (`proposte.ts:136-142` [misurato]).
- **D2-10** — `availability_window` filtra le disattivate su **disponibilità ed eccezioni**, non sull'**occupazione**:
  filtrarla dichiarava libera una cella che il vincolo rifiuta con `23505` (`0012_availability_window.sql:22-36`
  [misurato]).
- **D2-11** — a parità di data si **ordina per orario fra tutte le operatrici**, raccogliendo l'intera giornata prima
  di ordinare e troncare (`cercaposti.ts:58-62` [misurato]). ⚠︎ **D3b-14 la preserva**: `date` resta il primo criterio
  d'ordine, quindi il troncamento per giorno resta valido.

**Le sei estensioni**, tutte alla firma e nessuna al corpo di `proposeStarts`:

| # | Che cosa | Dove |
|---|---|---|
| 1 | `operatorIds` → `operatori: [{ id, durations }]` | §4.2 |
| 2 | `cursore` in ingresso, `prossimo` in uscita | §4.3 |
| 3 | `passoCelle` | §4.4 |
| 4 | `fuoriOrario: { attivo, ripiego }` | §4.5 |
| 5 | `reason` → `motivi` per operatrice | §4.7 |
| 6 | **`RigaProposta` cresce di `fuoriOrario` e `motivoFuori`** | §4.3 |

La sesta è **nuova alla revisione 2**: la 1 contava cinque estensioni e pretendeva da `RigaProposta` due campi che
nessuna sezione le dava [dalla revisione].

### 4.2 ⚠︎ La durata dipende dall'operatrice, e la firma di oggi non lo sa

`operator_service.duration_cells` è **per coppia (operatrice, servizio)**, e `NULL` significa «usa
`service.default_duration_cells`» (D28) [misurato: `0002_catalogue.sql:21-27`]. `IngressoCercaposti` porta invece
**una sola** `durations` per tutte [misurato: `cercaposti.ts:23`].

**Il danno.** Vera fa il semipermanente in 45 minuti, Annalisa in 60. Con `durations: [9]` il cercaposti propone per
Annalisa partenze su una campata che le sta stretta: l'orario si dice alla cliente, e al salvataggio l'appuntamento
occupa 12 celle invece di 9 — o sbatte contro il seguente (`23505`, spec §10.1) o mangia il riassetto di §7.3 in
silenzio. Passando la durata **più lunga** per tutte, spariscono le partenze buone di Vera. Non è raggiungibile oggi,
perché il 3b è **il primo chiamante**.

**Il rimedio:**

```
operatori: readonly { readonly id: string; readonly durations: readonly number[] }[]
```

⚠︎ **Il vincolo del campo vecchio va ripetuto sul nuovo**, o si perde nel rinominare: *«già ristretto alle operatrici
ATTIVE che eseguono i servizi»* (`cercaposti.ts:20` [misurato]). Dopo §4.5 non è igiene del chiamante ma un
**presupposto di correttezza**.

**Chi costruisce l'elenco:** il chiamante legge `operator_service` giuntata su `operator.is_active`, **intersecata su
tutti i servizi scelti** — un'operatrice che non esegue uno dei servizi non entra —, e per ciascuna coppia
`coalesce(operator_service.duration_cells, service.default_duration_cells)` (D28). Spec §7.4 mette questa risoluzione
esplicitamente sul chiamante, «restricted to active operators».

**`buffers` resta al livello alto:** la pausa è del **servizio** (`0002:16` [misurato]), la durata è della **coppia**.
Metterli nello stesso oggetto racconterebbe una bugia sul database. La corrispondenza `durations[i]`/`buffers[i]` è
posizionale sull'elenco dei servizi, comune a tutte; la guardia `durations.length === buffers.length`
(`proposte.ts:44-48` [misurato]) va rispettata **per ciascuna operatrice**, e §4.8 la anticipa con l'`id` nel
messaggio.

*Dalla revisione:* `campataOccupata` è invariante per permutazione delle durate, quindi un ordine sbagliato dei
servizi dà la **stessa** campata e non falsa la proposta; morde solo il prefill della scheda di §4.9.

### 4.3 La paginazione (`CERCAPOSTI-PAGINE`)

**Oggi** `cercaPosti` tronca e **non dice** che ha troncato [misurato: `cercaposti.ts:95-98`].

**Un `offset` non va bene**: fra la prima e la seconda pagina una collega prenota, una riga scompare, e la riga in
posizione 20 scala a 19 — la pagina 2 la salta.

**L'ordine totale, completo (D3b-14):**

```
(date, fuoriOrario?, startCell, preferita?, ordineChiamante)
```

⚠︎ La revisione 1 metteva `fuoriOrario?` **davanti a `date`**, e tre revisori hanno mostrato che così il troncamento
per giorno di D2-11 diventa scorretto: la pagina 1 si riempiva delle righe fuori orario del giorno 1 mentre
esistevano posti dentro orario nel giorno 2 — il danno che §4.5 dichiarava di prevenire. **D3b-14 lo chiude per
costruzione.**

**Il cursore porta quattro campi — `{ date, fuoriOrario, startCell, operatorId }`.** `operatorId` da solo non
riproduce il quarto e quinto criterio: il rango si **ricalcola** da `preferredOperatorId` e dall'ordine di
`operatori`. Il cursore porta `fuoriOrario` per **confrontare**, non per fidarsi: il segno si ricalcola con la regola
di §4.5.

Tre regole:

1. **L'ordine è totale solo senza operatrici duplicate.** ⚠︎ *La ragione della revisione 1 era sbagliata*: non è che
   «`ordineChiamante` tiene l'ultimo indice» a far confrontare uguali due righe — quello cambia solo il rango fra
   operatrici. È che **con un `id` duplicato la stessa operatrice produce le stesse righe due volte**, identiche in
   tutti e quattro i campi del cursore, che non sa quale ha già emesso. Questa è la ragione da scrivere accanto alla
   guardia di §4.8; una ragione sbagliata in un commento è il difetto che questo progetto chiama «presidio che trova
   la propria regola».
2. **La totalità poggia anche su un presupposto non nominato**: che le fasce arrivino **piegate** da `risolviGiorno`
   (`fasce.ts:66`, `piega` a `:83`). `proposeStarts` **non** piega e dichiara di non volerlo fare
   (`proposte.ts:72-75`): due fasce sovrapposte darebbero la stessa partenza due volte. Vale anche per la fascia
   costruita in §4.5, ed è la ragione della forma `piega([...])` lì.
3. **Il cursore appartiene alla richiesta**, e l'impronta è **enumerata**: `from`, `days`, `passoCelle`, `limit`,
   `buffers`, `preferredOperatorId`, `fuoriOrario.attivo` e i due confini di `ripiego`, `excludeAppointmentIds`, e la
   sequenza di `(id, durations)` di `operatori` **nell'ordine del chiamante**. ⚠︎ **Esclude `today` e `nowCell`**, che
   si muovono da soli: se fossero nell'impronta, ogni «Mostra altri» battuto un minuto dopo butterebbe il cursore e
   la paginazione **non avanzerebbe mai**. La loro deriva può solo togliere partenze già passate, cioè righe già
   emesse. Il ripiego è nell'impronta perché se il 3c lo cambia fra due pagine il **segno** di ogni riga cambia.

**«C'è una pagina dopo?» si risponde chiedendo una riga in più.** `cercaPosti` interroga `limit + 1`; se ne arrivano
`limit + 1`, scarta l'ultima e restituisce `prossimo` = il cursore dell'**ultima riga tenuta**. Dedurlo da
`rows.length === limit` è falso proprio quando le righe sono esattamente `limit`.

**Le due forme che crescono:**

```
EsitoCercaposti = { rows, motivi, prossimo }
RigaProposta    = { date, operatorId, startCell,
                    fuoriOrario: boolean,
                    motivoFuori: 'operator_off' | 'oltre_gli_orari' | null }
```

⚠︎ **`motivoFuori` è un tipo nuovo e non estende `MotivoAssenza`**, che `tipi.ts:39-47` dichiara congelato dai quattro
codici di spec §7.4 [misurato]. La revisione 1 pretendeva un motivo per riga e non lo dava a nessuna forma: chi
avesse implementato l'avrebbe infilato nel tipo congelato.

**Pagina di 20 [proposta].** La cardinalità vera si misura nel piano (§13).

**Limite dichiarato:** la paginazione **non è un lucchetto**. La pagina 2 è calcolata su uno stato più recente della
1. Il percorso che lo gestisce esiste già: il salvataggio rifiuta con `23505` e la frase di spec §10.1 nomina
l'appuntamento che possiede la cella (3a §4.3 passo 3). È la stessa forma di spec §7.6, «un invito a fare telefonate,
non un lucchetto».

### 4.4 Il passo di 15 minuti (D3b-1)

`proposeStarts` avanza di **una cella** (`inizio++`, `proposte.ts:85` [misurato]).

**Il filtro sta dentro `cercaPosti`, non a valle**, e qui la forma tecnica precisa la decisione dell'utente: un filtro
applicato **dopo** arriva **dopo il troncamento a `limit`** — 20 righe filtrate a passo 15′ possono ridursi a 2, e le
altre 18 partenze buone del giorno sono già state buttate dentro il motore. Quindi l'ingresso prende
`passoCelle: number` e `cercaPosti` scarta le partenze fuori passo **prima** di ordinare e troncare. Difetto **3**
[proposta].

**Il passo è ancorato alla mezzanotte, non all'inizio della fascia:** `startCell % passoCelle === 0`. Ancorare alla
fascia darebbe a Vera 09:10, 09:25… e ad Annalisa 09:00, 09:15… — due griglie nello stesso elenco ordinato per
orario, il disordine che D2-11 esiste per evitare. Conseguenza: una fascia che comincia alle 09:10 (cella 110) ha la
prima partenza alle **09:15**.

**«Tutti gli orari» di un giorno** è una seconda chiamata: `from = to =` quel giorno, `passoCelle: 1`, `limit` alto,
nessun cursore; **eredita lo stato dell'interruttore** della richiesta da cui nasce.

⚠︎ **Il passo può azzerare le righe di un'operatrice senza generare alcun motivo**, e la revisione 1 non lo vedeva:
`proposeStarts` risponde `reason: null` (aveva partenze), `cercaPosti` le scarta tutte perché fuori quarto d'ora, e
`motivi` non ha nulla da dire su di lei. Nel caso estremo — l'unico posto dell'orizzonte è alle 09:05 — l'esito è
`rows` vuota **e** `motivi` vuota: è il difetto di `days: 0` che §4.8 corregge, reintrodotto da D3b-1. Rimedio: il
motivo `solo_fuori_passo` di §4.7.

### 4.5 Fuori orario (`FUORI-ORARIO`, D3b-2, D3b-11, D3b-14)

L'interruttore di spec §8.4 è *off* per difetto. Acceso, deve proporre dove **oggi non c'è nessuna fascia**:
`proposeStarts` risponde `salon_closed` o `operator_off` **prima di guardare le fasce** [misurato:
`proposte.ts:52-57`], e con zero fasce non c'è nessun intervallo dentro cui cercare.

`cercaPosti` riceve `fuoriOrario: { attivo: boolean, ripiego: Fascia }`, con `ripiego` dai due confini di
`salon_settings` — oggi `{ 96, 240 }` [misurato: `0002:38`]. Con `attivo` vero, per ogni giorno e operatrice si
chiama **due volte** `proposeStarts`:

1. **C1**, la chiamata normale, con le fasce risolte e il `dayStatus` vero;
2. **C2**, con `ranges: piega([...fasceRisolte, ripiego])` e `dayStatus: 'open'`.

⚠︎ **`piega`, non «unione», e non una fascia sola.** La revisione 1 scriveva `[unione(fasce risolte, ripiego)]`, che
non è scrivibile: l'unione di due intervalli disgiunti **non è un intervallo**. Una fascia 07:00–07:30 con ripiego
08:00–20:00 dà due intervalli, e lo scafo `[84,240)` proporrebbe le **07:30**, che non è né disponibilità né
estensione dell'agenda. E concatenare **senza** piegare duplicherebbe le partenze dove le fasce si sovrappongono,
rompendo l'unicità del cursore (§4.3 regola 2). `piega()` è già esportata (`fasce.ts:83`), `proposeStarts` scorre più
fasce ordinate (`proposte.ts:82-85`) e `fasciaPiuLunga` è già un massimo (`:62`).

**Invariante che ne segue:** `partenze(C1) ⊆ partenze(C2)`, perché l'unione allarga le fasce e lascia identici
`occupancy`, `excludeAppointmentIds` e `nowCell`. È ciò che rende **ben posta** la differenza.

`occupancy` è **la stessa** nelle due chiamate: fuori orario si può prenotare (D18), sopra un appuntamento esistente
no — la stessa asimmetria di D2-10. Anche `nowCell` è invariato, quindi C2 non propone orari già passati di oggi.

⚠︎ **Il riassetto vale ATTRAVERSO il confine:** un appuntamento dentro orario impone il suo `buffer_after_cells` a una
proposta fuori orario, e la coda propria vale verso l'appuntamento che segue. Il riassetto è fisico, non contrattuale.

#### Il segno «dentro / fuori», che ha una sola definizione

⚠︎ **La revisione 1 ne dava due, e divergevano.** Diceva «le partenze **nuove** rispetto alla prima sono fuori orario»
e, poche righe sotto, «l'appartenenza della partenza **alle fasce risolte**». Con fascia 09:00–13:00 (`[108,156)`) e
campata 6 celle, C1 si ferma a `inizio = 150` (`proposte.ts:85`): la partenza **153** è «nuova» (→ fuori) ma il suo
`startCell` appartiene alla fascia (→ dentro). Danno: una proposta che **sfonda la fine del turno** — 12:45 per un
servizio da 30′ su un turno che chiude alle 13:00 — mostrata fra quelle normali, senza segno, senza motivo, e senza
l'avviso ambra di D3-8 al salvataggio. Capita ogni volta che la campata non finisce esattamente sul confine.

**La definizione, unica:** una riga è **dentro orario** se e solo se la sua **campata intera**
`[inizio, inizio + campata)` sta in **una** fascia risolta — equivalentemente, se figura fra le partenze di **C1**.
L'appartenenza del solo `startCell` non è il criterio. Le due formulazioni coincidono per l'invariante di sopra.

#### Il motivo per riga: due, non tre (D3b-11)

Una riga fuori orario porta **`operator_off`** quando `dayStatus` è `operator_off` — *«Vera non lavora»* — e
**`oltre_gli_orari`** in ogni altro caso — *«fuori dagli orari inseriti»*.

⚠︎ **Perché non tre.** La revisione 1 prometteva anche *«il salone è chiuso»*, i tre motivi che spec §8.4 chiede al
tocco di una cella attenuata. Due revisori hanno mostrato che **non è calcolabile**: `GiornoRisolto` espone `ranges`,
`dayStatus`, `occupancy`, e le chiusure sono consumate dentro `risolviGiorno` [misurato: `finestra.ts`, `fasce.ts`].
A valle non si sa più quali celle ha tagliato una chiusura, quindi su un giorno `'open'` con chiusura 13–14 la riga
delle 13:20 avrebbe detto *«fuori dai suoi orari»* — **incolpando l'operatrice per un salone chiuso**, il difetto che
la correzione del 22/09 a spec §7.4 ha eliminato; e su un giorno svuotato da una chiusura parziale avrebbe detto
*«il salone è chiuso»* nelle ore in cui è aperto. La terza via — portare le chiusure in `GiornoRisolto` — era una
**sesta estensione al motore**, e l'utente l'ha scartata.

**Conseguenza dichiarata (§8 limite 6):** dalla lista non si distingue un giorno di ferie sue da una chiusura del
salone. Lo distingue l'**avviso ambra al salvataggio**, che il 3a ha già e che nomina i tre casi correttamente (D3-8,
3a §4.5): il cercaposti **non salva**, apre la scheda.

#### L'ordine: mescolati per giorno (D3b-14)

Dentro ogni giorno, prima le righe dentro orario, poi quelle fuori, marcate e con il loro motivo. **Non** due sezioni
in fondo alla lista: la revisione 1 le separava globalmente, e con un orizzonte popolato il blocco fuori orario
finiva dopo decine di pagine — l'operatrice accendeva l'interruttore e la prima pagina non cambiava.

#### Che cosa la forzatura di `dayStatus` disattiva

`dayStatus: 'open'` in C2 disattiva di proposito le due guardie di `proposte.ts:52-57`. Ne disattiva anche **una che
non volevamo**: era `operator_off` a rendere innocua un'operatrice **disattivata** passata per errore — senza fasce
non si proponeva nulla, perché D2-10 non la filtra sull'occupazione. Con il ripiego riceverebbe un'intera giornata di
proposte, il danno che spec §7.4 nomina («keeps offering appointments with someone who left last month»). Da qui il
presupposto di §4.2.

⚠︎ **E invalida un argomento di equivalenza del piano 2.** Il test-audit registra `cercaposti.ts:69` come
sopravvissuto **equivalente**, «perché `proposeStarts` esce comunque prima sui due stati non aperti; smetterebbe di
esserlo se `proposeStarts` cambiasse l'ordine delle sue guardie» [dalla revisione]. §4.5 ottiene lo stesso effetto dal
lato del chiamante: quel mutante va **rimisurato** dopo l'estensione e gli va messa una prova (§13). Una prova nuova
che spegne un rivelatore si rimisura, non si assume.

### 4.6 L'orizzonte (D3b-3)

`ORIZZONTE_GIORNI = 28`, estremi compresi [misurato: `cercaposti.ts:9`]. L'estensione è un blocco di 28 giorni per
volta, tetto **84**; il pulsante sparisce al tetto. ⚠︎ La costante resta un **valore di difetto** e non un limite —
nessuna riga la applica come tale — e il nome non lo dice: da commentare (§13).

**L'estensione rilegge, non aggiunge:** è una richiesta nuova con `days` maggiore, quindi **il cursore si butta**
(regola 3 di §4.3). Chiedere solo i giorni 29–56 e attaccarli in fondo darebbe una lista giusta **solo se** nulla è
cambiato nei primi 28.

**Una lettura sola per richiesta:** `availability_window(p_from, p_to, p_operator_ids)` prende un intervallo apposta
(spec §7.5) [misurato: `0012_availability_window.sql:38-42`].

**Limite dichiarato:** oltre il primo mese la disponibilità potrebbe non essere inserita, e il cercaposti risponde
`operator_off` con precisione e senza utilità. Lo stato vuoto **non** può dirlo in parole, perché la distinzione
«nessuna fascia inserita» / «assente per eccezione» **non esiste** in `dayStatus` (spec §7.1 le fonde; D2-5 le chiama
entrambe `operator_off`). Portarla nel documento della finestra è decisione del **3c**.

### 4.7 Perché nessuna proposta: i motivi (`PRECEDENZA-MOTIVI`, D3b-4)

**Oggi** si riporta **un** motivo, il primo secondo `PRECEDENZA_MOTIVI` [misurato: `cercaposti.ts:44-48`]. I findings
registrano che l'ordine `full > service_too_long` **non è esercitato**.

**Perché l'ordine non va corretto ma abolito fra operatrici.** Con tre operatrici il motivo è **diverso per
ciascuna**: cerco un massaggio da 90 minuti, per Vera i giorni sono pieni, per Alessandra nessuna fascia è abbastanza
lunga. Un motivo solo, `full`, consiglia «estendo l'orizzonte» — e per Alessandra estendere non servirà **mai**. Dopo
§4.2 non è un caso di scuola: `service_too_long` dipende dalla coppia.

```
motivi: readonly { readonly operatorId: string; readonly motivo: MotivoLista }[]
MotivoLista = MotivoAssenza | 'solo_fuori_passo'
```

**Un motivo per ogni operatrice che non ha prodotto nessuna riga**, e `PRECEDENZA_MOTIVI` resta a scegliere *dentro*
l'operatrice — lì l'ordine ha un senso, e **ora è esercitato**.

⚠︎ **La regola della revisione 1 annullava la decisione che la motivava.** Diceva «`motivi` è vuota quando `rows` non
è vuota», copiata da D2-2: ma se Vera dà righe e Alessandra no, `rows` non è vuota e il fatto «Alessandra non ha una
fascia abbastanza lunga» veniva buttato — il caso per cui D3b-4 esiste. **Regola giusta:** `motivi` è vuota solo
quando **ogni** operatrice ha almeno una riga.

⚠︎ **Con un cursore, `motivi` è SEMPRE vuota.** I motivi sono un fatto sulla richiesta intera, non sulla pagina.
Senza questa regola, una **pagina vuota** — l'ultima riga prenotata fra due pagine, la corsa che §4.3 dichiara —
popolerebbe `motivi` e annuncerebbe «Vera è piena» **dopo** venti proposte di Vera.

⚠︎ **I motivi si raccolgono solo da C1.** C2 gira su una fascia inventata, e il suo `full` o `service_too_long` non
descrive nessun orario del salone: raccogliendoli, un'operatrice assente su tutto l'orizzonte con le celle fuori
orario occupate diventerebbe «Vera è piena» con l'offerta sbagliata.

⚠︎ **Il motivo del giorno che è oggi non si raccoglie.** `nowCell` fa rispondere `full` a un giorno le cui ore sono
soltanto passate (`proposte.ts:87`, `:97`), e `full` ha la precedenza massima: una ricerca alle 19:30 marcherebbe
«piena» un'operatrice in ferie per quattro settimane.

| Motivo | Frase | Offerta |
|---|---|---|
| `full` | «Vera è piena fino al 25 ottobre» | «Cerca nelle prossime 4 settimane» |
| `service_too_long` | «Alessandra non ha una fascia abbastanza lunga per 90 minuti» | «Cerca anche fuori orario», se l'interruttore è spento |
| `operator_off` | «Annalisa non lavora in questi giorni» | «Cerca anche fuori orario» |
| `salon_closed` | «Il salone è chiuso in questi giorni» | «Cerca anche fuori orario» |
| `solo_fuori_passo` | «Per Vera restano solo orari spezzati» | **«Tutti gli orari» di quel giorno** |

**La scelta dell'offerta unica:** `solo_fuori_passo` → «tutti gli orari»; altrimenti, interruttore **spento** →
«cerca anche fuori orario», qualunque sia il motivo; altrimenti `full` → estensione; altrimenti nessuna offerta.

⚠︎ **La revisione 1 sbagliava qui due volte.** Diceva «se sono tutti `service_too_long`, **nessuna offerta** — cambia
servizio, o chiama il 3c»: falso a interruttore spento, perché il ripiego è di 144 celle e nessuna fascia reale lo è,
quindi un orario prenotabile per D18 **esiste**. E offriva il fuori orario anche quando l'interruttore era già acceso.

### 4.8 Il contorno (`CONTORNO-CERCAPOSTI`, resto)

**I tre contorni del piano 2** [dai findings], riconfermati a lettura di `86d4223`:

| Contorno | Che fa oggi | Sede | Rimedio |
|---|---|---|---|
| `limit: 0` | restituisce **una** riga: il `push` precede il confronto, e `1 >= 0` è vero | `cercaposti.ts:95-98` | `RangeError` se `limit < 1` |
| `days: 0` | vuoto **senza motivo** | `cercaposti.ts:56`, `:100-103` | `RangeError` se `days < 1` |
| operatrici duplicate | **righe duplicate**: la stessa operatrice produce le stesse righe due volte | `cercaposti.ts:65` | `RangeError` sui duplicati |

**E i contorni dei cinque campi nuovi**, che la revisione 1 non aveva:

| Contorno | Che farebbe | Rimedio |
|---|---|---|
| `passoCelle: 0` | `startCell % 0` è `NaN`, `NaN === 0` è falso → **zero righe su tutto l'orizzonte, senza motivo**: il difetto di `days: 0` da un'altra porta | `RangeError` se `< 1` |
| `ripiego` invertito o vuoto | interruttore silenziosamente **inerte** | `RangeError` se `endBoundary <= startBoundary` |
| `durations` di un'operatrice vuota o non appaiata a `buffers` | `RangeError` da dentro `proposeStarts`, con un messaggio che **non nomina l'operatrice** | guardia **in testa**, con l'`id` nel messaggio |
| cursore con `operatorId` non in `operatori` | `cercaposti.ts:92` lo tratta con `?? 0`, rango 0, e ripete righe | rifiutato come impronta non coincidente |

**`RangeError` e non una correzione in silenzio:** è la forma che il modulo già usa (`proposte.ts:44-48`; `blocco()`
in `tempo.ts` [da riverificare: non riaperto in questo giro]); un `limit` a zero o un'operatrice duplicata sono
**difetti del chiamante**; e senza il rifiuto dei duplicati **il cursore non ha un ordine totale** — questa terza
ragione va nel codice accanto alla guardia, nella forma corretta della regola 1 di §4.3.

**`INGRESSO-CERCA-TIPO`:** `Partial<IngressoCercaposti>` al posto di `Record<string, unknown>`
[misurato: `tests/dominio/cercaposti.test.ts:132`], **dopo** le estensioni e non prima, con un refuso **deliberato**
che `tsc --noEmit` deve rifiutare — senza quel passo la prova del rimedio non ha vittima.

*Dalla revisione:* nessuna prova esistente passa `limit: 0`, `days: 0` o duplicati, quindi le guardie non rompono
nulla; ma il solo rinominare `operatorIds` → `operatori` tocca **tutte** le ~15 prove di `cercaPosti`.

### 4.9 Dal cercaposti alla scheda

Il cercaposti **non scrive**. Al tocco apre la **scheda visita del 3a** (spec §9.4, 3a §5.4) con operatrice, data,
ora, servizi, durate e cliente riempiti, e da lì valgono il percorso di scrittura, gli avvisi ambra e «Controlla» del
3a senza varianti: un secondo percorso di scrittura sarebbe un secondo posto dove sbagliare `40P01`, i codici d'invio
e le versioni.

**Senza cliente scelta** la scheda si apre col campo vuoto: spec §8.3 dice che **nessuna preferenza si applica**.

**Alla pagina del cercaposti viaggiano solo `id`** — cliente, servizi, operatrice — e il nome nell'intestazione si
rilegge per `id`: un nome in `searchParams` finirebbe nei log della piattaforma e nella cronologia del telefono
(3a §4.8, L3b-2).

---

## 5. Clienti (spec §9.6)

### 5.1 L'elenco

Tutte le clienti in ordine alfabetico, a pagine di 50 [proposta].

**La paginazione è per posizione (`.range()`), non per cursore alfabetico:** un cursore sarebbe
`.gt('full_name', …)`, cioè **un nome nella querystring**, contro 3a §4.8. `.range()` manda un `Range` di posizioni, e
`order=full_name.asc` porta un **nome di colonna**, non di persona. Costo: una riga può ripetersi o saltare fra due
pagine se una collega inserisce mentre si scorre — su un elenco che si consulta non è un danno.

*L3b-10:* spec §9.6 chiede la **ricerca**, non un elenco completo; l'elenco è un'aggiunta del 3b.

### 5.2 La ricerca

`public.cerca_clienti(p_testo text)` **in POST** (3a §4.8), dal **Task 10** (§12). Accento- e maiuscole-insensibile
per `public.immutable_unaccent` [misurato: `0003_client.sql:6-12`], con `pg_trgm`: è la regola di spec §8.2, dove
«maria rosi» deve trovare «Maria Rossi».

**Il testo cercato vive nello stato del componente, non in `searchParams`.** Nell'idioma dell'App Router una casella
di ricerca scrive nell'indirizzo per difetto, e quello è un nome nei log della piattaforma.

⚠︎ **Due cose che il 3b eredita e dichiara:**

- **La ricerca si ferma a 20 e non lo dice** [misurato: piano 3a-1, Task 10: `limit 20`, nessun `offset`]: con
  venticinque Marie, cinque non esistono per chi cerca. Il 3b non estende la funzione — è del Task 10 e non è ancora
  nata — e **lo scrive nella schermata**: *«prime 20 · affina la ricerca»*, quando tornano esattamente 20 righe. Una
  lista troncata senza avviso è una lista che mente. [proposta: «esattamente 20» dà un falso positivo innocuo contro
  un falso negativo che nasconde una persona.]
- **L'ordine è `somiglianza desc, full_name`**: una ricerca di sole cifre dà somiglianza ~0 a tutte le righe. Oggi non
  fa danno, perché quel ramo è molto selettivo. [da misurare] se un testo misto dia un ordine controintuitivo; se sì,
  è un reperto del Task 10.

Terzo, minore: `client_name_search` indicizza `immutable_unaccent(full_name)` **senza `lower`**
[misurato: `0003_client.sql:37`], mentre la ricerca del Task 10 confronta con `lower` e usa il suo indice trigram
nuovo: è un indice che nessuno usa più (§13).

### 5.3 La scheda di una cliente

Nome, telefono, compleanno senza anno, operatrice preferita, opt-out; **visite future** in cima in data crescente e
**passate** sotto in data decrescente, con data, ora, servizio e operatrice; «prenota da lei» in evidenza;
«Modifica»; il posto dell'export; «Elimina».

**Nessun campo di testo libero** (D26): non è un'etichetta mancante, è il vettore tolto (spec §11.1). **Nessun
prezzo** (D14).

**Lo storico dice che cosa è stato prenotato e non cancellato**, non che cosa è stato fatto: senza stati una
prenotazione mantenuta e una mancata sono identiche (spec §12 punto 3). La schermata non lo chiama «storico dei
trattamenti», che sarebbe più forte di quanto i dati sostengono — su dati la cui natura è la prima domanda aperta
della spec (§11.2, §14). L3b-8.

**La lettura delle visite non porta dati personali in URL:** si filtra su `client_id`, pseudonimo casuale
[misurato: `gen_random_uuid()`, `0003_client.sql:15`]. L3b-2.

### 5.4 Modificare una cliente (D3b-5, D3b-12)

`client` **non ha `updated_at`** [misurato: `0003_client.sql:14-35`]. `visit` e `appointment` sì, col trigger
`app.touch_updated_at()` [misurato: `0004_visit_appointment.sql:41`, `:51`, `:53`]. Quindi il compare-and-set di spec
§10.2 non ha su che cosa appoggiarsi, e due colleghe si sovrascrivono in silenzio.

**D3b-5:** la migrazione aggiunge `client.updated_at timestamptz not null default clock_timestamp()` e il trigger
`before update … for each row`. `clock_timestamp()` e non `now()`: `now()` è fisso per la transazione, quindi due
update nella stessa transazione confronterebbero uguali [misurato: `0004:39-40`].

**La scrittura passa da una funzione**, per **la regola 11 del 3a**: «con la sicurezza per riga un account chiuso
nell'istante della scrittura ne tocca zero **senza errore**, e la funzione registrerebbe un falso *salvata*»
[misurato: `0016_salva_visita.sql:20-22`]. Con un compare-and-set diretto «zero righe» ha **tre** cause
indistinguibili — versione vecchia, cliente cancellata, account chiuso — le tre che spec §10.2 pretende di
distinguere con **tre messaggi**.

```
public.salva_cliente(
  p_codice    uuid,   -- il codice d'invio, PRIMA di ogni scrittura (D3b-12)
  p_cliente   uuid,
  p_versione  text,   -- app.versione(updated_at) letta all'apertura; null per una creazione
  p_dati      jsonb
) returns jsonb       -- { esito, versione, stato }
```

**`security invoker`, `search_path = ''`, nomi qualificati, `revoke execute … from public, anon`.** Va dichiarato: una
funzione `security definer` restituirebbe le clienti **scavalcando** `client_access`, cioè anche all'operatrice appena
disattivata il cui account auth esiste ancora — il buco di offboarding che spec §11.5 nomina per esteso, sul suo
carico peggiore.

⚠︎ **`p_dati` è rifiutato con `22023` se l'insieme delle chiavi non è esattamente
`{nome, telefono, mese, giorno, preferita, no_messages}`.** Un `->> 'telefono'` su una chiave assente o con un refuso
dà **NULL**, la riga si salva, il compare-and-set coincide, l'esito è `salvata`: **il numero di telefono di una
cliente sparisce in silenzio su un salvataggio riuscito**. Non c'è traccia di chi ha cambiato che cosa (spec §12
limite 2), e la perdita è definitiva. È la forma che `0016` usa già per la stessa classe.

| Esito | Quando | Messaggio |
|---|---|---|
| `salvata` | la riga è stata scritta | «✓ Salvata» |
| `esiste_gia` | creazione su un `id` che c'è già | la scheda adotta lo stato letto |
| `modificata_altrove` | la versione non coincide | «È stata modificata da una collega», con **che cosa** è cambiato |
| `non_trovata` | la cliente non c'è più | «È stata cancellata», nessuna offerta di ricrearla |
| `42501` (errore) | l'account è stato chiuso mentre la scheda era aperta | l'uscita forzata del 3a (spec §4.4) |

**«Controlla» sulla scheda cliente** (D3b-12, D3-21, 3a §4.4), con le righe ridotte agli esiti di `salva_cliente`.
⚠︎ Senza codice d'invio, una risposta persa dopo un `COMMIT` riuscito tornava al ritentativo come
`modificata_altrove`, e l'app diceva *«è stata modificata da una collega»* mostrandole **la sua stessa correzione**:
un'accusa falsa a una collega. Tre revisori l'hanno trovato indipendentemente.

**Ritentativo su `40P01`** (3a §4.3 passo 5, spec §10.5), **con lo stesso codice d'invio**, e vale per
`salva_cliente` come per `cancella_cliente`: la revisione 1 lo prescriveva solo sulla cancellazione, ed era un gemello
speculare — `salva_cliente` prende i blocchi in un **ordine nuovo** proprio per il trigger di §7
(`client` → `visit` → `annuncio`).

**Le versioni si riportano verbatim**, mai attraverso un `Date`: i microsecondi di Postgres si troncano e producono
conflitti fantasma (spec §10.2). `app.versione()` è definita in **`0013_invii_e_cancellate.sql:85`** [misurato] — la
revisione 1 citava `0017:46`, che è un **sito di chiamata**, e una riga che chiama non prova un'unicità.

**La validazione prima di chiamare** è quella di 3a §4.3 passo 2: nome non vuoto, compleanno reale (spec §6.2.1,
vincolo `client_birthday_real` [misurato: `0003:31-34`]), telefono normalizzabile in **E.164** con
`libphonenumber-js`, paese di difetto **IT**.

⚠︎ **Non si tocca `last_activity_at`.** Lo calcolano i trigger vincolari differiti di spec §6.2.2, l'unica sede che sa
comporre il massimo fra le visite sotto concorrenza: il **piano 1** ha misurato che **senza il blocco di riga che quei
trigger prendono** due prenotazioni concorrenti della stessa cliente lo riportano indietro di diciassette mesi
[misurato: `plans/2026-09-17-foundations-findings.md`, spec §6.2.2], sul valore su cui la spazzata di §11.4 cancella
dati personali. ⚠︎ La revisione 1 attribuiva la misura al **piano 2** e a uno scenario diverso: due revisori hanno
corretto la stessa frase in due modi, e non erano in conflitto — erano due errori nella stessa frase. Nessuna
schermata del 3b lo mostra.

### 5.5 Creare una cliente fuori dalla scheda visita

Nella scheda visita la cliente nuova nasce **dentro** `salva_visita`, nella stessa transazione
[misurato: `0016_salva_visita.sql:194-201`: `id`, `full_name`, `phone`, `birth_month`, `birth_day`, e nulla più].

Da *Clienti* è `salva_cliente` con `p_versione` nulla, che qui accetta anche `preferred_operator_id` e `no_messages`
— **l'unico posto** dove si impostano: un campo che registra l'obiezione dell'interessata e non ha modo di essere
impostato è una lacuna di conformità, non un'omissione di interfaccia (spec §6.2).

**I doppioni:** `public.doppioni_cliente(p_nome, p_telefono)` (Task 10), **in POST come `cerca_clienti`** — porta un
nome e un telefono nello stesso argomento. Stesso telefono per sole cifre, o nome sopra la soglia [proposta: 0,4 —
misurata **là**, non qui]. Senza, una ricerca di «Maria Rossi» non trova «maria rosi», nasce una seconda Maria sotto
la pressione del telefono, la sua storia si divide, compare due volte fra i compleanni, e la spazzata ne cancella
metà (spec §8.2).

**Una riga sull'informativa** al punto di raccolta (spec §8.2, §11.1). ⚠︎ **E qui c'è un bloccante che non si chiude
con prosa:** l'informativa che quella riga cita è del **piano 4**, che arriva **dopo** il primo uso (D19), e spec §14
**domanda 4** chiede ancora se un'informativa esposta in salone basti per una cliente registrata **al telefono** — il
caso di questa schermata. È il **limite 8** di §8, e la sua chiusura è un elemento delle verifiche prima del rilascio
del 3c.

Una cliente creata qui e mai prenotata ha `last_activity_at` **null**: la conservazione la valuta su
`coalesce(last_activity_at, created_at::date)` (spec §6.2.2), quindi non è esente per sempre.

### 5.6 Elimina, ed esporta (D3b-8)

**Una conferma, poi non c'è più** (D15, spec §8.7, §10.4): l'unico percorso senza ritorno, e la conferma nomina la
cliente e **quante visite** spariscono con lei (§13: se nominarle una per una).

La catena è `client → visit` [`0004_visit_appointment.sql:5`], `appointment → visit` [`0004:26-29`] e
`appointment_slot → appointment` [`0005_occupancy.sql:14-17`], tutte `on delete cascade`, perché con `no action`
cancellare una visita sollevava `23503` e la promessa di spec §11.3 descriveva un fallimento.

`public.cancella_cliente(p_codice, p_cliente)` → `{ esito }` con `cancellata` o `non_trovata`, per la stessa ragione
di §5.4, e con il codice d'invio di D3b-12.

⚠︎ **Un deadlock noto e già dichiarato.** `delete from client` blocca `client` **prima** di `visit`, all'inverso
dell'ordine dei trigger, e la spec lo registra come obbligo **già rotto da un chiamante esistente**, con un `40P01`
misurato 6 su 6 (spec §12.1). Il ritentativo di §5.4 vale qui.

**L'esportazione: il posto è del 3b, il meccanismo del piano 4.** ⚠︎ Corretto: la revisione 1 diceva «il pulsante
**non c'è**», e il piano 4 assegna al 3b i **pulsanti** di spec §9.6 compreso «esporta la sua scheda», tenendo per sé
i **meccanismi** [misurato: spec piano 4 righe 127-128, 597, e la sua L4-2]. Composto, il pulsante non era di
nessuno, e il limite più serio di §8 passava da temporaneo a **permanente**. Il 3b costruisce il posto e lo lascia
inerte con una riga che dice quando arriverà; il piano 4 lo collega.

### 5.7 «Prenota da lei» (D3b-7)

Apre il **cercaposti** con la cliente scelta e prefissato il suo **ultimo servizio, operatrice e durata** — «il ritmo
di riprenotazione a tre settimane senza un motore di ricorrenze» (spec §9.6, §12 punto 9). Con la cliente scelta,
`preferredOperatorId` è la sua `preferred_operator_id`; le altre sono etichettate *«con un'altra operatrice»*
(spec §8.3).

⚠︎ **«L'ultimo servizio» è la visita più recente passata o odierna**, non l'ultima creata: una visita futura inserita
oggi è più recente di ogni visita passata, e il senso è «quello che le fa di solito» (L3b-6). [proposta: senza visite
passate, si apre con la cliente e senza servizio.]

⚠︎ **La durata si ricalcola** (D3, D28, §4.2): copiare quella di sei mesi fa propaga un tempo che il catalogo ha
cambiato.

---

## 6. Compleanni (spec §9.7, D3b-6)

**Tre viste:** oggi, questa settimana, questo mese. Scheda dentro *Clienti* (spec §9.11).

⚠︎ **La base giuridica di questa schermata è spec §14 domanda 2, aperta e bloccante per il rilascio:** «la data di
nascita è raccolta solo per l'augurio, quindi se quello scopo non ha base, il campo non ce l'ha. L'obbligo di consenso
si attacca alla **comunicazione**, non allo strumento: mandarlo a mano non lo evita». E `no_messages` ha
`default false` [misurato: `0003_client.sql:22`], cioè lo stato di difetto è **messaggiabile**: se la risposta è
«serve consenso», l'opt-out è la forma sbagliata e va rovesciato. **Il 3b è il piano che rende il messaggio
spedibile.** Fino alla risposta la schermata si **costruisce e si prova**, e l'azione WhatsApp resta dietro la
risposta: §8 limite 7. §5.3 nomina la domanda 1; la revisione 1 non nominava la 2, che è la sua.

**La finestra è un insieme di coppie (mese, giorno)**, non un `BETWEEN`: una coppia non ha ordine attraverso il
confine di un mese o di un anno, e un `BETWEEN` è sbagliato dodici volte l'anno e attraverso il 31 dicembre (spec
§6.2.1).

**Bisestile e iniezione.** Chi è nata il 29 febbraio compare il **28 febbraio** negli anni non bisestili. Poiché in un
anno non bisestile l'insieme generato non contiene `(2, 29)`, **ogni volta che la finestra contiene `(2, 28)` la
coppia `(2, 29)` va iniettata** — settimana **e** mese. In un anno **bisestile** l'iniezione non avviene e chi è nata
il 29 compare il 29: è corretto, e va scritto perché una lettura veloce lo chiami difetto.

**Le coppie si generano in TypeScript, dalla data civile di Europe/Rome**: è l'unica data di questo sistema (spec
§5.1) e il database vive in UTC. Conseguenza: **sono coperte da `npm run test:fuso`**, il banco dove questa classe di
errori muore — il piano 2 ha misurato che `getUTCDay()` → `getDay()` lascia verdi `UTC` ed `Europe/Rome` e arrossisce
solo sotto `America/New_York`, con **14 rosse su 96 per due mutanti** [dai findings] (la revisione 1 diceva «l'unico
mutante»: erano due).

**«Questa settimana» e «questo mese» sono civili** [proposta]: lunedì–domenica di Perugia, mese di calendario.
«Questo mese» è indiscutibilmente civile, e mescolarlo con «i prossimi sette giorni» darebbe due nozioni di finestra
nella stessa schermata. Costo: la domenica la vista «settimana» è quasi vuota (§13).

```
public.compleanni(p_coppie jsonb)
  returns table (id uuid, full_name text, phone text,
                 birth_month smallint, birth_day smallint,
                 no_messages boolean, preferred_operator_id uuid)
```

`security invoker`, `search_path = ''`, `revoke` da `public` e `anon`. Un filtro PostgREST su
`birth_month`/`birth_day` metterebbe il compleanno di una persona **nella querystring**, e la querystring finisce nei
log del gateway (3a §4.8); sono dati personali (spec §11.1). L'`id` serve ad aprire la scheda. Ordine: per giorno
crescente dentro la finestra, poi per nome. C'è già l'indice `client_birthday (birth_month, birth_day)`
[misurato: `0003:39`].

**Che cosa mostra una riga:** nome, data, **WhatsApp** (`https://wa.me/<E.164 senza il +>`) o **chiamata** (`tel:`),
e l'operatrice preferita se c'è. Una riga **senza telefono** mostra il nome e nessuna azione (spec §9.7).

**D3b-6 — l'opt-out.** Chi ha `no_messages` **compare**, con un segno *«non vuole messaggi»* e **nessuna azione**.
Permette gli auguri di persona e rende il messaggio **non raggiungibile da questa schermata** — non «impossibile»,
che era più forte del vero: il nome è lì, e due tocchi in *Clienti* danno il telefono.

⚠︎ **Il tocco non è un `href` statico.** Passa da una Server Action che **rilegge `no_messages`** e restituisce
l'indirizzo, o rifiuta col segno. La revisione 1 dichiarava come limite una finestra di 60 s in cui un'obiezione
appena registrata veniva scavalcata da una lista vecchia: un augurio mandato a chi l'ha appena rifiutato non è una
comodità mancata, è un'obiezione ignorata, e il rimedio costa quasi nulla.

⚠︎ **`wa.me` porta il numero a Meta.** Il divieto di 3a §4.8 riguarda gli URL verso il **proprio backend**, non una
destinazione esterna aperta deliberatamente, che è ciò che spec §9.7 chiede (L3b-3). Verificato **dalla revisione**
che la CSP di 3a §4.9 permette il salto: `connect-src` governa `fetch`/XHR/WebSocket e `form-action` l'invio di un
form, e **nessuno dei due** governa la navigazione di un collegamento; `Referrer-Policy: no-referrer` impedisce che
l'indirizzo della pagina viaggi. Ma la domanda che conta è un'altra: **Meta apprende il numero della cliente a ogni
augurio**, e spec §11.1 elenca come processori solo Supabase e Vercel. L'informativa del piano 4 lo nomina fra i
destinatari. Il collegamento porta `rel="noopener noreferrer"`.

⚠︎ **Costo dichiarato di D3b-6:** la lista mostra a ogni operatrice **chi ha fatto obiezione**. In un'app che tre
operatrici usano e in cui ognuna vede già ogni cliente [misurato: `0003:43-44`] è una differenza piccola; va scritta
perché nessuno la scopra credendola un difetto. **Alternativa non scelta (§13):** un segno di compleanno sul blocco in
agenda serve la stessa finalità — l'augurio a chi entra in salone — e mostra l'obiezione solo a chi sta già guardando
quell'appuntamento.

---

## 7. L'annuncio quando cambia una cliente (D3b-9)

`public.annuncio` **esiste**, dal commit `86d4223`: `id`, `giorni date[]`, `creato`, con
`check (cardinality(giorni) > 0)` [misurato: `0019_annunci.sql:26`], sola-lettura per le operatrici attive, nella
pubblicazione `supabase_realtime` limitata agli **inserimenti**, e trigger **per istruzione** che mandano **solo
date**.

**D3b-9:** quando cambia una cliente, un trigger annuncia **i giorni delle sue visite**. Il blocco in agenda mostra il
nome (D3-4), quindi è lì che un nome vecchio fa danno: una collega che telefona a «Maria Rosi». La pagina *Clienti*
**non** si aggiorna da sola: si ricarica al ritorno in primo piano e ogni 60 s [proposta in 3a §4.6].

Non si aggiunge una colonna perché una riga di `annuncio` **non contiene nessun identificativo di persona** — è
scritto come garanzia nella migrazione — e mandare `id` di clienti la ritirerebbe.

⚠︎ **La guardia sul vuoto ESISTE GIÀ, e la revisione 1 diceva il contrario.** `app.annuncia_giorni()` ha
`if v_giorni is null or cardinality(v_giorni) = 0 then` [misurato: `0019_annunci.sql:110`, verificato dopo il commit
`86d4223`]: il vincolo non fa fallire nessun chiamante, e copre anche il nullo. La revisione 1 lo elencava come
«divergenza 5», con la ragione «per il Task 8 va bene perché un'istruzione su `appointment` tocca sempre almeno un
giorno», che era **falsa**: salta per guardia esplicita. **La divergenza è ritirata** (§14). La prescrizione resta con
la ragione giusta: **il trigger nuovo del 3b ripete quella guardia perché è la sua**, e la sonda è togliere la guardia
dalla funzione **nuova**, non da quella del Task 8.

**La forma.** ⚠︎ Una **funzione nuova**, non quella del Task 8: `app.annuncia_giorni()` dispatcha su `tg_table_name`
con un `else` che presume `visit_date`, e legarci un trigger su `client` esplode. Per istruzione, `security definer`,
proprietaria `postgres`, `search_path = ''`, come i trigger del Task 8 e per la stessa ragione — la tabella non è
scrivibile da `authenticated`, ed è questo che impedisce a un telefono di fabbricare annunci.

⚠︎ **Il confronto è una GIUNZIONE fra le tabelle di transizione, non `is distinct from` su `OLD`/`NEW`.** A livello di
istruzione `OLD` e `NEW` **non esistono**: i trigger del Task 4 che usano `is distinct from` nel corpo sono
`for each row` [misurato: `0015_chiusura_sessioni.sql:79-89`], e la revisione 1 componeva le due cose senza vedere che
non si compongono. Il trigger scatta su UPDATE di `client` e annuncia solo se `full_name` o `phone` cambiano
[proposta]: un cambio di `no_messages` o `preferred_operator_id` non tocca nessun blocco. Forma alternativa:
`after update of full_name, phone on client`.

**`giorni` si restringe alle date ≥ oggi:** annunciare una visita del 2019 fa ricaricare tre agende su un giorno che
nessuno guarda.

⚠︎ **Gli annunci del 3b non passano da `chiudi_invio`, quindi nessuno li pulisce.** La cancellazione a un'ora vive
**dentro** `app.chiudi_invio` [misurato: `0019_annunci.sql`, ultimo blocco], che gira una volta per invio di
**visita**. La spec 3c ha visto lo stesso per sé e lo ha dichiarato; la revisione 1 del 3b no. Il piano decide fra due
forme: le due funzioni nuove eseguono come **ultima** istruzione la stessa `delete` a finestra limitata, oppure §8
dichiara il limite — in un giorno in cui si correggono schede e non si salvano visite la tabella cresce fino al
prossimo salvataggio.

**La cancellazione di una cliente** cancella in cascata visite e appuntamenti, e i trigger del Task 8 annunciano già
quei giorni: il trigger del 3b non aggiunge niente sul DELETE. ⚠︎ E la **progettazione esiste già**: c'è una prova che
lo dice, *«una cancellazione a cascata lascia un annuncio per istruzione, non per riga»*
[misurato: `tests/schema/annunci.test.ts:126`, col conteggio a 2 e il commento «con `for each row` diventano 3»]. La
revisione 1 lo dichiarava «[da misurare]» senza cercarla: resta da misurare solo l'**esecuzione**.

---

## 8. Limiti dichiarati del 3b

I limiti 7–11 riguardano **diritti di una persona**, non comodità di un'operatrice, e non appartengono alla stessa
famiglia dei primi sei: la revisione 1 non li aveva e chiamava «il più serio» il limite 6 di allora.

1. **Il cercaposti propone solo visite a operatrice unica.** `cercaPosti` calcola **una** campata contigua per **una**
   operatrice (§4.2): una visita in cui il semipermanente lo fa Vera e la ceretta Alessandra non è proponibile, anche
   se `appointment` la sostiene (ogni appuntamento ha il suo `operator_id` [misurato: `0004:14`]). Si compone
   dall'agenda. Spec §8.1 e D23 non dicono che l'operatrice sia una: qui si dichiara che il cercaposti lo assume
   (L3b-1).
2. **Un posto che esiste solo alle 09:05 non è nella lista principale** (D3b-1): c'è aprendo «tutti gli orari» di quel
   giorno, e lo stato vuoto lo dice con `solo_fuori_passo` (§4.7).
3. **La ricerca delle clienti si ferma a 20** e non pagina (§5.2): la schermata lo dice, la funzione non lo risolve.
4. **La pagina Clienti non è in diretta** (D3b-9).
5. **La paginazione del cercaposti non è un lucchetto** (§4.3).
6. **Dalla lista fuori orario non si distingue un giorno di ferie da una chiusura del salone** (D3b-11): lo dice
   l'avviso ambra al salvataggio, non la lista.
7. ⚠︎ **La base giuridica degli auguri è aperta** (spec §14 domanda 2, §6). La schermata si costruisce e si prova;
   l'azione WhatsApp aspetta la risposta del consulente. **Elemento delle verifiche prima del rilascio del 3c.**
8. ⚠︎ **L'informativa che §5.5 cita non esiste** fino al piano 4, e spec §14 domanda 4 chiede ancora se una esposta in
   salone basti per chi è registrata **al telefono** — lo scenario di quella schermata. **Il 3c non dichiara il
   rilascio** finché il titolare non ha l'informativa scritta.
9. ⚠︎ **D3b-6 svuota il presidio su cui il piano 4 costruisce il diritto di opposizione.** Il piano 4 §5.5 legge spec
   §9.7 come **esclusione** — «la lista è la sua unica fonte; una cliente che compare in lista riceverà gli auguri» —
   e consegna al 3b: «l'esclusione va presidiata da una prova che diventa rossa se il filtro `no_messages` sparisce»
   [misurato: spec piano 4 riga 576]. **D3b-6 toglie quel filtro**, e il requisito è insoddisfacibile come scritto.
   D3b-6 vince perché è una decisione dell'utente; il presidio equivalente è **«la riga con l'opt-out non ha nessuna
   azione»** più **«il tocco rilegge `no_messages`»** (§6, §9.2). ⚠︎ Il piano 4 §9 fissa il contenuto
   dell'**informativa esposta in salone**: scritta su §5.5 come sta, direbbe alla cliente una cosa che l'app non fa.
   **Va mandato alla chat del piano 4**: §5.5, §9.4 e il requisito vanno rifatti.
10. ⚠︎ **Il pulsante d'export è del 3b, il meccanismo del piano 4** (§5.6): senza quella cucitura non è di nessuno, e
    nella finestra fra la fine del 3c e il piano 4 **accesso e portabilità** non hanno percorso nell'app, con un
    termine di un mese per rispondere. La via manuale è la dashboard di Supabase, che legge **da proprietario** — cioè
    scavalcando la sicurezza per riga — e va composta su cinque tabelle: **il 3c scrive la procedura** nelle sue
    verifiche prima del rilascio, altrimenti il limite è nominato e non dichiarato.
11. **La conservazione (spec §11.4) e il suo distintivo (spec §9.11) sono del piano 4**, e il 3b legge
    `last_activity_at` senza scriverlo: dal rilascio al piano 4 non esiste né la query di eleggibilità né la
    cancellazione né il distintivo. **Non è urgente** — con `coalesce(last_activity_at, created_at::date)` nessuna
    cliente matura il termine prima che il piano 4 esista — ma è senza proprietario. ⚠︎ Il termine: la spec dice 24
    mesi, la spec del piano 4 del 28/09 lo porta a **12** (D4-1): da comporre con quella chat.
12. **Oltre il primo mese il cercaposti può rispondere «assente» su giorni la cui disponibilità non è ancora stata
    inserita**, e non sa distinguerlo da un'assenza vera (§4.6).

---

## 9. Prove

La forma è quella di 3a §8: ogni prova con la sua **sonda di mutazione** e **dati non degeneri** — la lezione più
costosa del piano 2, dove 31 mutanti su 123 sono sopravvissuti perché le prove avevano le pause a zero, gli elenchi di
esclusione vuoti e le tabelle non seminate [dai findings].

⚠︎ **Le fixture devono creare più di un'operatrice, più di un servizio e più di un giorno**, con **durate diverse per
operatrice**: con una sola combinazione ogni predicato di §4.2 è dichiarato e mai esercitato.

### 9.1 Logica pura (Vitest, `tests/dominio/`)

- **Durate per operatrice** (§4.2): due operatrici con durate diverse per lo stesso servizio, e le partenze di
  ciascuna che rispettano **la sua** campata. Mutazione: usare le durate della prima per tutte.
- **Passo** (§4.4): con `passoCelle: 3` nessuna partenza fuori quarto d'ora; con `1` tornano tutte; l'**ancoraggio a
  mezzanotte** su una fascia che comincia a cella 110, dove la prima partenza deve essere 09:15. Mutazione: ancorare
  all'inizio della fascia.
- ⚠︎ **Il passo filtra prima del troncamento**: un giorno con molte partenze e `limit` piccolo deve dare `limit` righe
  **tutte a passo**. Mutazione: filtrare dopo il troncamento. Senza questa prova D3b-1 è dichiarata e indifesa.
- **`solo_fuori_passo`** (§4.4, §4.7): un giorno la cui unica partenza è a cella non multipla di 3 → `rows` vuota e
  `motivi` che **nomina** il fatto. Mutazione: non registrarlo — senza, lo stato vuoto è muto.
- **Cursore** (§4.3): due pagine consecutive che non si sovrappongono e non saltano; `prossimo` nullo sull'ultima;
  `prossimo` **non** nullo quando arrivano esattamente `limit` righe e ce n'è una in più; il cursore **rifiutato** se
  l'impronta cambia, con la mutazione «non confrontare l'impronta» e `passoCelle` cambiato fra le due pagine.
  Mutazione: dedurre «c'è ancora» da `rows.length === limit`.
- **Cursore attraverso il confine dentro/fuori dello stesso giorno** (D3b-14): una pagina che finisce sull'ultima riga
  dentro orario di un giorno e la successiva che comincia dalla prima fuori **dello stesso giorno**. Mutazione:
  togliere `fuoriOrario` dal cursore.
- **Il segno** (§4.5): fascia 09:00–13:00, campata 6 → la partenza 153 (12:45) è **fuori** orario, benché il suo
  inizio appartenga alla fascia. Mutazione: usare l'appartenenza del solo `startCell` — è il bloccante del primo giro,
  e questa è la prova che lo tiene chiuso. Secondo caso: fascia 09:00–11:00, servizio da 180′, interruttore acceso,
  dove la partenza alle 09:00 è **fuori**.
- **`piega`** (§4.5): fascia 07:00–07:30 con ripiego 08:00–20:00 → **due** fasce, e nessuna partenza alle 07:30
  (mutazione: collassare nello scafo); fasce sovrapposte → **nessuna riga compare due volte** (mutazione: concatenare
  invece di piegare).
- **Fuori orario** (§4.5): un giorno `salon_closed` che con l'interruttore dà partenze **dentro la finestra**
  08:00–20:00, nessuna prima delle 08:00 né dopo le 20:00, tutte marcate fuori; un giorno `'open'` con partenze fuori
  prima dell'apertura; l'occupazione che blocca anche fuori orario; il **riassetto attraverso il confine** (blocco
  10:00–11:30 con pausa 15′ su una fascia che chiude alle 13:00 → la prima riga fuori orario è alle 11:45); una fascia
  che sporge oltre il ripiego **non** accorciata; `nowCell` che filtra anche in C2.
- **L'ordine per giorno** (D3b-14): giorno 1 con sole righe fuori orario, giorno 2 con righe dentro orario, `limit`
  minore delle righe del giorno 1 → la pagina 1 contiene le righe del **giorno 1**, dentro e fuori, e il giorno 2
  viene dopo. Mutazione: mettere `fuoriOrario` davanti a `date`, cioè la forma della revisione 1.
- **Motivi** (§4.7): tre operatrici con tre motivi diversi; **una operatrice con righe e un'altra senza → `motivi` NON
  è vuota** (mutazione: la regola della revisione 1); `motivi` vuota quando ogni operatrice ha righe; **con un cursore
  `motivi` è sempre vuota**; i motivi **solo da C1**; il motivo di **oggi** non raccolto (ricerca alle 19:30 su
  un'operatrice che lavora oggi e ha un'eccezione vuota nei 27 giorni seguenti → `operator_off`, non `full`);
  l'**ordine dentro l'operatrice** con una sola operatrice che colleziona `full` in un giorno e `service_too_long` in
  un altro.
- ⚠︎ **Due mutazioni su `PRECEDENZA_MOTIVI`, non una:** `full ↔ service_too_long` **e**
  `operator_off ↔ salon_closed`. Il test-audit del piano 2 ha misurato **due** relazioni indipendenti scoperte, e la
  revisione 1 ne prescriveva una sola — metà dell'obbligo restava aperta con l'etichetta «chiuso».
- **Contorno** (§4.8): sette prove, una per guardia, ciascuna con la mutazione «togliere la guardia».
- ⚠︎ **`SEGUENTE-VICINO`** (D3b-10): **una** prova, con due blocchi dopo la partenza, pause non nulle e diverse.
  **Mutazione: solo `proposte.ts:141`, `b.startCell < seguente.startCell` → `>`**, l'unica registrata
  `NOT CAUGHT — R1, confermato` [misurato: `test-audit.md:386`]. Il lato `precedente` (`:138`,
  `b.endCell > precedente.endCell` → `<`) è **già ucciso** da *«guarda solo l appuntamento PIÙ VICINO, non tutti
  quelli prima»* [misurato: `test-audit.md:398`, `tests/dominio/proposte.test.ts:297`]: la prova nuova lo rimisura per
  conferma e **non conta come chiusura nuova**. E **non si tocca** `b.endCell < inizio`: la sua mutazione a `<=` è uno
  dei tre **equivalenti** che i findings dicono di non inseguire. La revisione 1 prescriveva «entrambe devono
  arrossire», con una mutazione mal nominata su un lato già chiuso, e tre revisori l'hanno trovato.
- **Compleanni** (§6): le coppie delle tre viste; l'iniezione di `(2, 29)` quando la finestra contiene `(2, 28)` in un
  anno **non** bisestile, e la sua **assenza** in uno bisestile; **una settimana a cavallo di due mesi** (spec §13.1) e
  una a cavallo del 31 dicembre; il mese di febbraio. Mutazioni: togliere l'iniezione; generare con un `BETWEEN`.
- **Telefono:** `347 1234567` e `+39 347 1234567` → lo stesso E.164.
- ⚠︎ **Sotto `npm run test:fuso`**: le coppie dei compleanni e il `today`/`nowCell` del cercaposti.

### 9.2 Database (Vitest su Supabase locale, con sessioni vere)

Con l'imbracatura del Task 2 del 3a-1. ⚠︎ **Mai `psql`**: una misura da proprietario scavalca la sicurezza per riga,
e le viste che la applicano rispondono zero righe in silenzio.

- **`salva_cliente`**: creazione; modifica con la versione giusta; `modificata_altrove` con la versione vecchia;
  `non_trovata`; `esiste_gia`; **account disattivato a metà** → l'esito **non** è `salvata`;
  `preferred_operator_id` e `no_messages` scritti; `last_activity_at` **non** toccata; **una chiave mancante o con un
  refuso in `p_dati` dà `22023` e non azzera il campo** (mutazione: togliere il controllo delle chiavi);
  **`security invoker`** → un account che non è operatrice attiva non ottiene nulla (mutazione: `definer`); **il
  codice d'invio** registrato prima di ogni scrittura, e «Controlla» che rilegge (D3b-12).
- **Il trigger `updated_at`**: cambia a ogni update; due update nella stessa transazione danno versioni **diverse**;
  [da misurare] se un `before update` senza differenze lo cambia — il fatto va scritto in un verso o nell'altro.
- **`cancella_cliente`**: cascata fino a `appointment_slot`; `non_trovata` la seconda volta; **`40P01` ricevuto dal
  percorso** contro una cancellazione concorrente di un appuntamento della stessa visita (spec §12.1 lo misura 6 su
  6) e il ritentativo **con lo stesso codice d'invio** che lo assorbe.
- **`compleanni`**: la finestra sull'insieme; `no_messages` **incluso** con il suo segno (D3b-6), non escluso; una
  cliente senza telefono; **impostare `no_messages` fra la lettura della lista e il tocco → il tocco non restituisce
  nessun indirizzo** (§6); `security invoker`.
- **Il trigger d'annuncio** (§7): una cliente **con** visite produce un annuncio coi suoi giorni **≥ oggi**; una
  cliente **senza** visite si può modificare e **non** produce annuncio (mutazione: togliere la guardia dalla
  funzione **nuova**, non da quella del Task 8); un cambio di `no_messages` non produce annuncio; la cancellazione non
  produce annunci in più di quelli del Task 8.
- ⚠︎ **Permessi delle QUATTRO funzioni nuove** — `salva_cliente`, `cancella_cliente`, `compleanni`, e la funzione del
  trigger, che è l'unica `security definer` e vive in `app`. La revisione 1 contava tre, e l'audit ne avrebbe coperte
  tre su quattro lasciando fuori la `definer`. **E la regola va limitata:** su Supabase `anon` e `authenticated`
  hanno `EXECUTE` per difetto **sulle funzioni di `public`**, dove il grant è ridondante e il revoke è la riga che
  conta; **sullo schema `app` no** — il 3a-1 ha misurato che togliere il solo grant dà **19 rosse** con
  `permission denied for function apri_invio_come_annullato` [misurato: piano 3a-1 riga 6617]. Le quattro entrano negli
  **elenchi nominativi** dell'audit del Task 9, che è la forma che 3a §8.2 gli dà.

### 9.3 Da capo a fondo (Playwright)

**Prova 2 di spec §13.4** — prenotare una visita a **due servizi** dal cercaposti: scelta dei due servizi, la lista a
passo di 15′, il tocco, la scheda che si apre piena, il salvataggio, e i due appuntamenti contigui con la pausa fra
loro. ⚠︎ I due servizi eseguiti **dalla stessa operatrice** (limite 1), con durate dalla **sua** riga di
`operator_service`, una pausa **non nulla** fra i due, e la prova girata a **375 e 430 punti** (3a §8.3).

[proposta] Due altre: trovare una cliente dalla ricerca, correggerle il telefono, e vedere l'agenda di un altro
telefono aggiornarsi (§7); aprire i compleanni e vedere che la riga con l'opt-out non ha pulsanti.

### 9.4 Prova statica

⚠︎ **Enunciata come elenco di PERMESSI, non di divieti.** Nelle richieste **GET** a `from('client')` è ammesso
**solo** il filtro su `id`; **ogni altra colonna è vietata**, compresa `updated_at` — che nessun percorso di questo
documento filtra in GET — e comprese le colonne che il piano 4 aggiungerà. La revisione 1 enumerava quattro nomi e
**ometteva `preferred_operator_id`**, che spec §6.2 dichiara testualmente dato personale, **e `no_messages`**, che
registra un'obiezione: un elenco di divieti si apre da sé su ogni colonna futura.

Inoltre: nessun filtro concatenato dopo `.rpc(...)`; nessun `rpc(..., { get: true })`; nessun `.or()` né
`.textSearch()` su `client`; **nessuna scrittura in `searchParams` o `router.push` con un campo di dati personali**
(§5.2, §4.9). `.order('full_name')` non è un filtro: porta un nome di colonna, non un valore.

### 9.5 Che cosa le prove non coprono

- La leggibilità della lista a 375 punti con tre operatrici e le righe fuori orario marcate: si guarda, non si prova.
- Il comportamento sul progetto ospitato (latenza del canale, consegna degli annunci).
- Il ritmo reale delle collisioni fra due operatrici sulla stessa cliente, su cui D3b-5 scommette.
- ⚠︎ **Il mutante `cercaposti.ts:69`**, che §4.5 riporta in vita: va **rimisurato** e gli va messa una prova (§13).

---

## 10. Le schermate: misure

**Solo telefoni, in verticale, 375–430 punti** (D3-3). Controlli di almeno **44 punti** (3a §7).

**Colori** (spec §9.12, 3a §6.2): powder pink `#FDEDF0` di fondo; **brand pink `#F3A4BA` non può portare selezioni né
bordi**, perché il suo contrasto sul fondo è **1,71** [ricalcolato dalla revisione: 1,713 — ⚠︎ la revisione 1
attribuiva il numero a spec §9.12, che sul brand pink non porta numeri: valore buono, **sede falsa**, che è peggio di
un valore sbagliato perché una sede falsa si eredita]; **deep rose `#C2185B`** a **5,19** [misurato: 3a §6.2] fa quel
lavoro; ink `#140D18` per il testo, a **16,85** [misurato: spec 3c §4.1 — non 3a §6.2, la cui tabella ha solo i tre
colori delle operatrici].

**I colori delle operatrici sono quelli di D3-6**: Vera `#C2185B`, Annalisa `#FFFFFF` **con bordo in inchiostro**
perché da sola è a 1,13, Alessandra `#9B1B1B`. ⚠︎ Un revisore ha costruito un bloccante sostenendo che **D3c-6** li
cambiasse: **D3c-6 è REVOCATA**, e la revoca sta sulla riga stessa della decisione [misurato: spec 3c riga 119,
«⚠︎ **REVOCATA.** Scioglieva una tensione che **non esiste**», più §4.1 «rifatta su D3-6» a riga 363]. D3-6 resta in
vigore. **Il bordo si deriva dal contrasto del colore, non dal nome** (3a §6.2): scritto così, non «il bordo per
Annalisa», perché la regola vale per qualunque tinta il 3c permetta di scegliere.

**Carattere:** **Manrope** con **cifre tabulari** — qui è denso soprattutto una colonna di orari, che senza cifre
tabulari non incolonna. **Cinzel** solo per titoli e marchio (D3-5, L3). Le superfici — schede e fogli — sono bianche
`#FFFFFF` (spec §9.12).

**Il «+» flottante** (D3b-13): sull'agenda, in basso a destra, ≥ 44 punti, deep rose col glifo bianco, ombra per
staccarlo dai blocchi, e **mai sopra la linea dell'ora**. È l'unica modifica del 3b a una schermata del 3a-2.

**Cercaposti.** Intestazione col titolo e i servizi scelti (modificabili con un tocco); interruttore «anche fuori
orario»; **scelta dei servizi**: elenco per categoria (spec §8.1), multi-selezione con l'ordine di tocco che è
l'ordine della visita, l'etichetta con la durata **della coppia**, «mostra tutti i servizi» per il giorno in cui
un'operatrice copre qualcosa fuori dal suo elenco, e la lista che non parte finché non c'è almeno un servizio.
Risultati con **intestazione di giorno appiccicosa** (che è anche il tocco per «tutti gli orari» di quel giorno); la
riga porta **l'ora grossa**, il nome dell'operatrice col suo colore, e *«con un'altra operatrice»* quando non è la
preferita; dentro ogni giorno, dopo le righe dentro orario, le righe fuori orario con un segno e il loro motivo
(D3b-11, D3b-14) — **e l'etichetta del gruppo non compare quando non ci sono righe fuori**. In fondo «Mostra altri»
(cursore) e, all'esaurirsi, «Cerca nelle prossime 4 settimane» fino al tetto.

**Clienti.** Ricerca in testa; elenco alfabetico con iniziale appiccicosa; la riga porta nome e telefono. La scheda è
una pagina intera (L5) su superficie bianca: dati, «prenota da lei» in evidenza, visite future, visite passate,
«Modifica», il posto dell'export, «Elimina» — **l'azione senza ritorno sta più lontano dal pollice**. La scheda è
**unica per creare e modificare**, come D3-7 per la visita.

**Compleanni.** Tre segmenti (oggi · settimana · mese); la riga porta nome, data e i due pulsanti; la riga con
l'opt-out porta il segno al posto dei pulsanti (D3b-6).

**Stati vuoti** (spec §9.10: «ogni schermata ha uno stato vuoto che nomina il passo successivo»): Clienti senza
clienti rimanda a «Nuova cliente»; Compleanni senza compleanni in una vista dice quale vista provare; il cercaposti
senza servizi o senza operatrici che li eseguano rimanda al **primo avvio del 3c**, l'unico posto dove si
inseriscono. ⚠︎ Il 3c possiede spec §9.10 ma rivendica solo il flusso del catalogo: gli stati vuoti delle **tre
schermate del 3b** sono del 3b.

**Caricamento e rete.** Le tre schermate portano lo striscione di rete del 3a (spec §10.3, L6) e un **tempo limite
esplicito** sulla richiesta. ⚠︎ **Il cercaposti NON si iscrive al canale `agenda` e non prende la ricarica di ripiego
a 60 s**: una lista che si rifà sotto il pollice mentre l'operatrice legge un orario al telefono è peggio di una lista
vecchia, e il conflitto lo prende il salvataggio (§4.3). Clienti e Compleanni si ricaricano al ritorno in primo piano.

**Il ritorno indietro:** dalla scheda cliente all'elenco, il testo cercato **sopravvive**; dalla scheda visita aperta
dal cercaposti alla lista, **pagina e cursore sopravvivono** — chi torna indietro non vuole ricominciare la ricerca
col telefono in mano.

**Le parti vive stanno fuori** (D3-2): niente animazioni dentro la lista dei risultati.

---

## 11. Letture dichiarate della spec

- **L3b-1 — spec §8.1/§8.3 «choose the service or services»**, con D23. I servizi di una visita **proposta dal
  cercaposti** li esegue **una sola** operatrice (§8 limite 1).
- **L3b-2 — 3a §4.8**, con la prova statica che cerca «filtri su `from('client')`». Letto come **elenco di permessi
  per colonna**: in GET solo `id` (§9.4). ⚠︎ **La vittima è la LETTURA**, non un `UPDATE`: la scheda per `id` (§5.3) e
  le visite per `client_id`. La revisione 1 citava «l'`UPDATE` per `id` di §5.4», che §5.4 **esclude** — conclusione
  giusta, argomento confutabile in una riga, e portato così alla chat del 3a-2 sarebbe stato rigettato. È la stessa
  lettura che 3a §4.9 fa già quando chiama gli `id` in `localStorage` «pseudonimi e non anonimi».
- **L3b-3 — spec §9.7 «Each row offers WhatsApp or a call»**, contro 3a §4.8: il divieto riguarda gli URL verso il
  proprio backend, non una destinazione esterna aperta deliberatamente (§6, col destinatario dichiarato).
- **L3b-4 — spec §9.7 «excluding `no_messages`»**: escluse dalle **azioni**, non dall'elenco (D3b-6). ⚠︎ Il piano 4
  §5.5 legge la stessa frase come esclusione e ne fa un presidio: §8 limite 9.
- **L3b-5 — spec §9.6 «Edit, delete, and export … all live here»**, contro spec §11.3: modifica ed eliminazione
  complete nel 3b, **posto** dell'export nel 3b e **meccanismo** nel piano 4 (D3b-8, §5.6).
- **L3b-6 — spec §9.6 «prefilled with her last service»**: l'ultima visita **passata o odierna** (§5.7).
- **L3b-7 — spec §8.3 «paged, with … an option to extend»**: due cose distinte, la paginazione dentro l'orizzonte
  (§4.3) e l'estensione dell'orizzonte (§4.6), che **azzera** la paginazione.
- **L3b-8 — spec §9.6 «upcoming and past visits»**: non «trattamenti ricevuti» (§5.3).
- **L3b-9 — spec §8.3 contro spec §8.4.** ⚠︎ Nuova alla revisione 2. §8.3 dice «**Proposals never include
  out-of-availability cells.** D18 permits *booking* there deliberately; proposing there would make every closed day
  look open»; §8.4 chiede l'interruttore che propone proprio là. **Si contraddicono.** Il 3b legge §8.4 come **deroga
  esplicita**, e §4.5 passa a `proposeStarts` un `dayStatus` che non è quello del giorno: la guardia di
  `proposte.ts:52-57` è disattivata **per scelta**, non aggirata per errore. Senza questa lettura, «il motore non si
  tocca» di §4.1 è letteralmente vero e sostanzialmente falso, e il primo che legge spec §8.3 chiama bloccante una
  cosa voluta.
- **L3b-10 — spec §9.6 chiede la ricerca e non un elenco completo**: l'elenco alfabetico di §5.1 è un'aggiunta del 3b.

---

## 12. Dipendenze, e che cosa è cambiato durante il primo giro

| Dipendenza | Stato al 28/09, dopo il giro | Assunzione del 3b | Costo se è sbagliata |
|---|---|---|---|
| `public.annuncio` e i suoi trigger | ✅ **CONSEGNATA**, commit `86d4223` | esiste con `giorni date[]`, `check (cardinality > 0)`, la **guardia sul vuoto nella funzione**, solo INSERT nella pubblicazione | Le sedi sono state rifatte sul commit e §7 corretta. **Costo residuo nullo**, ma le citazioni per riga dei quattro documenti fratelli non concordano: chi le rilegge le rifà |
| `public.cerca_clienti(text)` | Task 10, non consegnata | `security invoker`, in POST, `limit 20` interno, accento- e maiuscole-insensibile con `pg_trgm` | **basso**: se arriva con un `offset`, l'avviso «prime 20» diventa superfluo |
| `public.doppioni_cliente(text, text)` | Task 10 | in POST, telefono per sole cifre, nome sopra **0,4** [proposta, misurata **là**] | **basso** sulla soglia; **alto** se non arrivasse: §5.5 perde i doppioni e spec §8.2 non è adempiuta |
| `pg_trgm` in `extensions` | Task 10 | installata, riferimenti qualificati | **basso** |
| Colori delle operatrici | Task 10 scriverà i valori di **D3-6** | D3-6 è in vigore; **D3c-6 è revocata** [misurato: spec 3c riga 119] | **nullo**, e **verificato** contro il documento fratello — non assunto |
| Guscio, navigazione, involucro errori, ricariche di ripiego | piano 3a-2 | esistono e **non si ridefiniscono**; il 3b tocca **un solo** file loro, per il «+» di D3b-13 | **medio**: si paga con una revisione del piano 3b prima dell'esecuzione, e con un coordinamento su quel file |
| La **prova statica** sugli URL | piano 3a-2 | va enunciata **per permessi** (§9.4, L3b-2) | **medio**, e va **mandato** al 3a-2 con la vittima giusta: la lettura per `id`, non un `UPDATE` |
| Il **requisito sul filtro `no_messages`** | spec piano 4 §5.5, riga 576 [misurato] | **incompatibile** con D3b-6 | **alto sul piano 4**, non sul 3b: §8 limite 9, e va mandato a quella chat |
| Il **meccanismo dell'export** | spec piano 4 §5.6 | il piano 4 lo costruisce, il 3b costruisce il posto | **alto se nessuno cuce**: §8 limite 10 |
| Il **termine di conservazione** | il piano 4 lo porta a 12 mesi (D4-1), la spec dice 24 | il 3b non lo implementa | **basso per il 3b**, da comporre |
| Numeri di migrazione **≥ 0022** | `0020` e `0021` rivendicati dal 3a-1, disco a `0019` [misurato] | ⚠︎ **la mitigazione della revisione 1 non funziona**, ed è la composizione che nessuna delle tre chat vede: 3b e 3c adottano la **stessa** formula («libero sul disco **e** non rivendicato da nessun piano») e **entrambe rimandano** l'assegnazione al momento del proprio piano senza scrivere un numero; il piano 4 non nomina il problema pur avendo migrazioni proprie. Al momento dell'apertura ciascuno vedrà un disco a `0019` e documenti che tacciono per scelta | **alto, probabilità reale.** Due `0022` sono un `db reset` che fallisce, o una migrazione che il CLI salta in silenzio. **L'assegnazione la fa l'orchestratrice, in un posto solo**, non le tre chat |

---

## 13. Aperto, da decidere o misurare nel piano

- **Il numero della migrazione**, assegnato dall'orchestratrice (§12).
- **Pagina di 20** per il cercaposti, **50** per Clienti [proposta], e la **cardinalità vera** della lista a passo 15′
  su 28 giorni con tre operatrici [da misurare]: da essa dipende se la paginazione serva.
- ⚠︎ **Rimisurare il mutante `cercaposti.ts:69`** dopo l'estensione di §4.5, che invalida il suo argomento di
  equivalenza, e mettergli una prova (§9.5).
- **«Questa settimana» civile o rotolante** (§6): [proposta] civile.
- **Su che cosa scatta l'annuncio della cliente** (§7): [proposta] `full_name` e `phone`. ⚠︎ **Questa voce è chiusa di
  fatto da un presidio**: §9.2 prescrive già la prova «un cambio di `no_messages` non produce annuncio», che inchioda
  la scelta prima che l'utente la faccia. O la prova si marca **condizionata alla decisione**, o la voce esce da qui.
  È la forma misurata in questo progetto: un presidio su una scelta che il cliente non ha preso la chiude, anche se
  la prosa la dichiara aperta.
- **Se l'opt-out debba comparire nei compleanni o come segno sul blocco in agenda** (§6): la seconda forma serve la
  stessa finalità e mostra l'obiezione solo a chi sta già guardando quell'appuntamento. Decisione dell'utente.
- **Se un `before update` senza differenze cambi `updated_at`** (§9.2) [da misurare].
- **Se un testo misto di cifre e lettere dia un ordine controintuitivo** in `cerca_clienti` (§5.2) [da misurare].
- **Se `client_name_search` vada eliminato** (§5.2).
- **Se «Elimina cliente» debba nominare le visite future una per una** o solo contarle (§5.6).
- **Se le due funzioni nuove chiamino la pulizia degli annunci** o si dichiari il limite (§7).
- **Il commento su `ORIZZONTE_GIORNI`** (§4.6): valore di difetto, non limite.
- **Il tipo di ritorno di `compleanni`** e l'ordinamento delle tre viste, da confermare sulla schermata.
- **`blocco()` in `tempo.ts`** (§4.8), citato per la forma `RangeError` e non riaperto in questo giro: da riverificare.

---

## 14. Divergenze fra spec e realtà trovate e **non** corrette

Sei vere, non sette: la quinta della revisione 1 è **ritirata** perché falsa, e la settima riclassificata. Verificate
una per una durante il primo giro, perché in questo progetto le auto-accuse sono una classe con molti falsi.

1. **spec §9.6 mette nella schermata Clienti TRE cose che spec §11.3 elenca come diritti dell'interessata** — «All
   three in §9.6», compresa la modifica. ⚠︎ La revisione 1 diceva «due»: sbagliato nel conteggio, giusto nella
   sostanza. E la coda «nessuno dei due documenti nota la conseguenza» è falsa per il **piano 4**, che la nota in §1 e
   in L4-2. Risolto da D3b-8 e §5.6.
2. **3a §4.8 e la sua prova statica sono enunciate per tabella** («filtri su `from('client')`»), e le letture del 3b
   filtrano su `id` e `client_id`. Vedi L3b-2. Da precisare **nel 3a**, con la vittima giusta.
3. **`IngressoCercaposti` porta una sola `durations` per più operatrici** (§4.2), e **nessun documento lo nota**:
   cercato in spec §7.4/§8.3, 3a, findings e test-audit [dalla revisione].
4. **`cerca_clienti` tronca a 20 senza dirlo** (§5.2): il piano 3a-1 lo scrive nella migrazione e non lo tratta come
   un fatto che una schermata deve comunicare.
5. ~~`annuncio_giorni_non_vuoto` fa fallire il chiamante.~~ ⚠︎ **RITIRATA: era falsa.** La guardia esiste già
   [misurato: `0019_annunci.sql:110`], e la ragione che la revisione 1 dava per il Task 8 era falsa a sua volta.
   Citata invece di cancellata, per la convenzione di questo progetto: chi l'avesse inseguita avrebbe cercato nel
   Task 8 un difetto che non c'è.
6. **`client_name_search` indicizza senza `lower`**, la ricerca del Task 10 confronta con `lower` (§5.2).
7. **`ORIZZONTE_GIORNI` resta un valore di difetto e il nome non lo dice** — ⚠︎ **riclassificata**: vera come fatto,
   ma **non è una divergenza fra spec e realtà**, perché nessuna riga la applica come limite e a portare `days` a 84 è
   D3b-3, decisa lo stesso giorno. È la conseguenza di una decisione: va in §13.
8. ⚠︎ **Nuova alla revisione 2: spec §8.3 e spec §8.4 si contraddicono** sul proporre fuori disponibilità. Vedi
   L3b-9.

---

## 15. Dove si ferma la revisione di questo documento

**Primo giro: cinque revisori indipendenti su Opus, lenti distinte, tutti in sola lettura.** Registro completo in
`docs/superpowers/plans/2026-09-28-piano-3b-giro-1-findings.md`: **dieci bloccanti distinti** (uno falso), 38
maggiori, 41 minori. Quattro bloccanti chiusi da decisioni dell'utente (D3b-11…D3b-14), tre da correzioni di prosa,
due **aperti in attesa del consulente privacy** (§8 limiti 7 e 8).

**Che cosa l'autocontrollo della revisione 1 aveva indovinato**, perché serve a chi scriverà la prossima spec: aveva
indicato le zone tecniche giuste — la coppia cursore × fuori orario, e le due chiamate senza tabella dei casi — e in
quelle zone stavano cinque bloccanti su dieci. **Non aveva visto la classe in cui stavano gli altri tre**: le
contraddizioni con i **documenti fratelli scritti nelle stesse ore**. Una zona debole si dichiara solo se si
sospetta; i documenti degli altri non si sospettano, si leggono.

**Il criterio di arresto**, invariato: si ferma quando due giri di fila non trovano bloccanti, le decisioni sono
ferme da almeno due giri, e i reperti residui sono **solo** cose che si chiudono con una migrazione eseguita o con una
misura. Un reperto blocca **solo se fa danno vero su un percorso raggiungibile**. **Questo criterio non è
soddisfatto: il secondo giro serve.**

**Che cosa il secondo giro deve guardare per primo:**

1. **Le correzioni di questo giro.** In questo progetto ogni giro trova la maggior parte dei suoi difetti nelle
   correzioni del giro prima, e stavolta toccano sei sezioni tecniche e cambiano due forme di dati.
2. ⚠︎ **La tabella dei casi di §4.5 va RIFATTA.** Un revisore l'ha costruita sulla revisione 1 e ha trovato sei
   reperti che nessuna lettura aveva visto; D3b-11 e D3b-14 hanno poi cambiato **l'ordinamento e i motivi**, quindi
   quella tabella è ora obsoleta nella metà che riguarda l'ordine. **Una tabella dei casi obsoleta è peggio di
   nessuna tabella.**
3. **I documenti fratelli, letti per intero e con la colonna delle note.** Tre bloccanti su dieci stavano lì, e uno
   dei tre era **falso** perché il revisore ha letto una decisione (D3c-6) senza vedere la **revoca scritta sulla
   riga stessa**. La composizione fra documenti scritti in parallelo non si fa leggendo le decisioni: si fa leggendo
   anche le loro note, e si cita con la revisione e la riga.
4. **Le citazioni su `0019_annunci.sql`**, tutte, rifatte sul commit `86d4223`.
5. **Il capitolo dei compleanni**, se il consulente risponde: le due domande aperte cambiano che cosa si costruisce,
   non solo che cosa si scrive.

**Dove questo documento resta debole, dopo un giro:**

- **Nessun numero è misurato per esecuzione**, e il primo giro l'ha confermato senza poterlo rimediare: 43 citazioni
  `[misurato]` censite, **nessuna** era un numero di esecuzione spacciato per misurato, ma otto avevano la **sede**
  sbagliata, due l'**uso** sbagliato, e due erano **sedi inventate** per valori giusti — che è peggio, perché un
  valore sbagliato si scopre e una sede falsa si eredita. Tutte corrette qui; un revisore che **possa** misurare
  chiuda i `[proposta]` di §13.
- **Le sei estensioni alla firma restano molte**, e ora cresce anche una **forma di dati** (`RigaProposta`). Il primo
  giro ha trovato che la revisione 1 pretendeva da quella forma due campi che nessuna sezione le dava: la classe
  «regola dichiarata e non presidiata» è la più frequente in questo documento, e non c'è ragione di credere che sia
  esaurita.
- **§7 e §9.2 poggiano su una migrazione che nessuno ha eseguito**: la forma del trigger per istruzione con la
  giunzione fra tabelle di transizione è stata **corretta a lettura** e non provata.
- **Il coordinamento con le altre tre chat è ora scritto ma non concordato**: §8 limiti 9 e 10 e §12 contengono tre
  messaggi che vanno **mandati**, e finché non arriva risposta il 3b dichiara una composizione che l'altra metà non
  ha accettato.
