# Piano 2 — Motore della disponibilità e cercaposti

> **Per chi esegue:** SOTTO-SKILL RICHIESTA: usare `superpowers:subagent-driven-development` (consigliata) oppure `superpowers:executing-plans` per eseguire questo piano task per task. I passi usano caselle (`- [ ]`) per la tracciatura.

**Obiettivo:** costruire le funzioni pure che risolvono le fasce di disponibilità di un giorno e propongono gli orari d'inizio di una visita, più l'unica query a intervallo di date che le alimenta — e dimostrare ogni regola con una prova che diventa rossa quando la regola viene tolta.

**Architettura:** tutto il dominio è **TypeScript puro**, senza accesso al database e senza orologio: le funzioni ricevono la data, le fasce, l'occupazione e `nowCell` come argomenti. Il database entra in un solo punto, `public.availability_window(p_from, p_to, p_operator_ids)`, che restituisce **materiale grezzo** — settimana tipica, eccezioni, chiusure, occupazione — per l'intero intervallo in una sola chiamata; la risoluzione di §7.1 avviene in TypeScript, non in SQL, perché è la parte che le prove devono poter guastare una riga alla volta. Nessun Next.js, nessuna schermata, nessun percorso di scrittura: quelli sono il piano 3.

**Stack:** TypeScript, Vitest, Supabase CLI, PostgreSQL 15, `pg` (solo per le prove che parlano al database).

**Spec:** `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md` (revisione 5) — §7 per intero è ciò che questo piano implementa, §13.1 è l'elenco dei casi limite già decisi, §5 e §5.1–5.2 il modello del tempo, §6.5 e §6.6 le tabelle e la precedenza, §8.3 il cercaposti.

**Piano precedente:** `docs/superpowers/plans/2026-09-17-salon-scheduler-foundations.md` — completo, fuso su `main`, 12 migrazioni e 145 prove verdi. Questo piano non tocca nessuna delle sue migrazioni.

> **Revisione 3 di questo piano, e le due che l'hanno preceduta.**
>
> *Revisione 1 → 2.* Tre revisori avversariali indipendenti hanno **eseguito** il codice qui prescritto: 85 prove, 51 sonde di mutazione, oltre un milione di ingressi di fuzz. La revisione 1 non passava — due prove rosse alla nascita per aritmetica sbagliata nell'attesa, un file di prova che non compilava, quattro sonde incapaci di diventare rosse, otto righe di logica non toccate da alcuna mutazione.
>
> *Revisione 2 → 3.* Due revisori hanno attaccato **le correzioni**, non il piano originale, e uno di essi ha misurato il Task 10 contro un database vero. Hanno trovato una guardia dichiarata equivalente con la gemella speculare lasciata viva, una prova nuova che presidiava il caso innocuo invece di quello pericoloso, una decisione non misurata nel suo punto centrale, una sonda SQL inerte per accidente dei dati, e una funzione che con una data nulla falliva **aperta**.
>
> Tutto questo è corretto qui. Le prove riscritte per **discriminare** e non solo per passare sono marcate **⚠ discriminante**; le mutazioni **equivalenti** sono dichiarate per nome invece di essere presentate come sonde; e ciò che è stato misurato porta la misura, non l'aggettivo.

---

## Vincoli globali

Valori copiati alla lettera dalla spec. I requisiti di ogni task li includono implicitamente.

- **Le celle sono da 5 minuti.** 288 celle al giorno, indici **0–287**. Confini **0–288**. (spec §5, D16)
- **Indice di cella e indice di confine sono domini distinti** e non si confrontano mai direttamente. Un appuntamento sta in una fascia quando `start_cell >= start_boundary and start_cell + cell_count <= end_boundary`. (spec §5)
- **Le fasce sono `[start_boundary, end_boundary)`**, fine esclusa. (spec §5)
- **Nessun appuntamento scavalca la mezzanotte:** `start_cell + cell_count <= 288`, e `cell_count > 0`. (spec §5, §6.3)
- **`weekday` è 0 = lunedì … 6 = domenica.** In TypeScript la mappa è `(d.getUTCDay() + 6) % 7`, calcolata su una data costruita con `Date.UTC`. (spec §5.2). ⚠︎ La metà SQL della regola — `extract(isodow from d) - 1` — **non ha casa in questo piano**, deliberatamente: nessuna delle sue query calcola un giorno della settimana, perché `availability_window` restituisce `weekday` grezzo e a scegliere è TypeScript. Dichiararlo evita che il prossimo lettore creda §5.2 coperta per intero.
- **Le date sono date di calendario, mai istanti.** Restano stringhe `YYYY-MM-DD` dall'inizio alla fine; `pg` è già configurato per non convertirle (`tests/helpers/db.ts`). (spec §5.1)
- **«Oggi» è la data civile in `Europe/Rome`**, calcolata dal chiamante e passata dentro: nessuna funzione di questo piano legge l'orologio. (spec §5.1)
- **Precedenza: chiusura del salone batte giorno di eccezione batte settimana tipica.** Governa la risoluzione della disponibilità, non la prenotabilità. (spec §6.6)
- **Una fascia proposta non esce mai dalla disponibilità.** D18 permette di *prenotare* fuori orario per una via esplicita; *proporre* lì farebbe sembrare aperto ogni giorno chiuso. (spec §8.3)
- **Le funzioni del dominio sono pure**: nessun accesso a rete, disco, orologio o variabili globali. Stessi argomenti, stesso risultato, sempre.
- **Mai misurare con `psql` da proprietario.** Il proprietario scavalca la sicurezza per riga, e una query che dovrebbe restituire zero righe restituisce tutto. Le prove sul database passano dagli helper di `tests/helpers/db.ts`. L'unica eccezione è l'ispezione del **catalogo** (`pg_class`, `pg_proc`, `information_schema`).
- **`psql` non è installato su questa macchina.** Ogni misura fuori dalla suite si fa con un piccolo script Node e il pacchetto `pg` già presente in `node_modules`.

### Lingua degli artefatti

Decisione dell'utente del 18 settembre 2026, che **rovescia spec §2.1** per questo repo:

- **Prosa, titoli, commenti, nomi delle prove e messaggi di commit: italiano.**
- **Identificatori già congelati: invariati.** Il contratto di `proposeStarts` di spec §7.4 (`date`, `ranges`, `occupancy`, `durations`, `buffers`, `nowCell`, `excludeAppointmentIds`, `dayStatus`, `starts`, `reason`), i campi di `occupancy` (`appointmentId`, `startCell`, `endCell`, `bufferAfterCells`), i valori di `dayStatus` (`'open'`, `'salon_closed'`, `'operator_off'`) e le colonne delle 12 migrazioni esistenti restano in inglese. L'handoff vieta di reinventare il contratto di §7.4, e i nomi ne fanno parte.
- **Identificatori nuovi: italiano** — funzioni ausiliarie, tipi, variabili, nomi di file.
- **I quattro codici di motivo restano stringhe inglesi** (`'full'`, `'salon_closed'`, `'operator_off'`, `'service_too_long'`): due dei quattro coincidono alla lettera con valori di `dayStatus`, che sono congelati, e tradurne metà produrrebbe un dominio chiuso in due lingue con una conversione in mezzo.

⚠︎ Il risultato è un repo **bilingue**: spec revisione 5 e piano 1 restano in inglese finché qualcuno non li traduce. È una conseguenza accettata della decisione, non una svista.

---

## Struttura dei file

| File | Responsabilità |
|---|---|
| `src/dominio/tipi.ts` | I tipi condivisi del dominio: `Fascia`, `Blocco`, `StatoGiorno`, `MotivoAssenza` |
| `src/dominio/tempo.ts` | I due domini del tempo e le conversioni. L'unico posto dove una cella diventa un orario, e l'unico che costruisce un `Blocco` |
| `src/dominio/fasce.ts` | `risolviGiorno()` — spec §7.1 e §6.6: settimana tipica, eccezione, chiusure, piega |
| `src/dominio/proposte.ts` | `proposeStarts()` — spec §7.3 e §7.4 |
| `src/dominio/finestra.ts` | Decodifica il documento JSON di `availability_window` nei tipi del dominio |
| `src/dominio/cercaposti.ts` | `cercaPosti()` — spec §8.3: 28 giorni, ordine per orario, operatrice preferita |
| `supabase/migrations/0012_availability_window.sql` | La query a intervallo di date di spec §7.5 |
| `tests/dominio/tempo.test.ts` | Prove di `tempo.ts` |
| `tests/dominio/fasce.test.ts` | Prove di `fasce.ts` |
| `tests/dominio/proposte.test.ts` | Prove di `proposte.ts` |
| `tests/dominio/cercaposti.test.ts` | Prove di `finestra.ts` e `cercaposti.ts` |
| `tests/schema/availability-window.test.ts` | Prove della migrazione: forma del documento, sicurezza per riga, permessi |

I file del dominio sono separati per responsabilità, non per strato: una prova rossa nomina il file da aprire. `tests/schema/` continua a parlare al database; `tests/dominio/` non lo tocca mai.

---

## Decisioni prese al posto dell'utente

La spec non le fissa. Sono decise qui, con il costo se sbagliate, perché una revisione avversariale possa attaccarle per nome. **D2-9, D2-10 e D2-11 sono state prese dall'utente in persona il 18 settembre 2026**, dopo la prima revisione, e sono marcate come tali.

**D2-1 — `endCell` è l'ultima cella occupata, INCLUSA, e la calcola un posto solo.** Spec §7.4 congela il nome e non la semantica. Il nome dice «cella», e §5 dice che un indice di cella identifica un blocco: chiamare `endCell` un confine sarebbe esattamente l'off-by-one che §5 esiste per prevenire. Quindi `endCell = startCell + cellCount - 1`, e **l'unico posto che lo calcola è `blocco()` in `tempo.ts`**: `availability_window` restituisce `cell_count` grezzo e non `end_cell`, così l'aritmetica non esiste in due lingue.
*Correzione della revisione 1:* la revisione 1 faceva calcolare `end_cell` anche in SQL e faceva costruire i blocchi a mano in `finestra.ts`. `blocco()` non era mai sul percorso dei dati veri, e i suoi controlli di dominio non proteggevano nulla in produzione: il revisore lo ha misurato, e la prova del Task 1 misurava una funzione che il cercaposti non chiamava mai.
*Costo se sbagliata:* ogni proposta slitta di una cella, cioè di cinque minuti, in entrambe le direzioni del riassetto. Lo intercettano *«l'ultima cella di un blocco è occupata»* (Task 1) e *«riporta l occupazione con il conteggio delle celle e la pausa del servizio»* (Task 10).

**D2-2 — `reason` è `null` quando `starts` non è vuoto.** §7.4 dice `-> { starts, reason }` e non dice cosa vale `reason` in caso di successo. Un codice di motivo accanto a proposte valide sarebbe un campo che il chiamante deve imparare a ignorare.
*Costo se sbagliata:* la schermata del piano 3 mostrerebbe un messaggio di vuoto accanto a un elenco pieno. Lo intercetta *«non dà alcun motivo quando ci sono proposte»*.

**D2-3 — Le pause fra i servizi di una visita multipla sono dentro la campata, non fuori.** §7.3 dice che le durate «devono correre contigue, con la pausa di ciascun servizio fra l'una e l'altra», e §13.1 chiede il caso «una visita multiservizio che ci sta solo senza le pause». Quindi la campata occupata è `Σ durate + Σ pause[0..k-2]`, e la pausa dell'**ultimo** servizio è la distanza pretesa **verso l'appuntamento successivo**, non parte della campata.
*Costo se sbagliata:* una visita da due servizi rifiuta partenze che stanno, o ne accetta che non stanno. Lo intercettano le sonde 1–4 del Task 8.

**D2-4 — Le celle della pausa intermedia devono essere libere.** Discendono da D2-3: se un altro appuntamento occupasse i tre minuti fra manicure e massaggio, la visita non sarebbe contigua.
*Costo se sbagliata:* si propone una partenza sopra un appuntamento esistente. Lo intercetta *«rifiuta una partenza la cui pausa intermedia è occupata»*.

**D2-5 — `ranges` vuoto con `dayStatus` `'open'` è un ingresso incoerente e si risponde `'operator_off'`.** §7.4 dice che la distinzione «va passata dentro, non si recupera»: quindi la funzione non può indovinare. Restituire `'service_too_long'` (che è ciò che uscirebbe dal confronto con il massimo di un insieme vuoto) sarebbe una bugia sul servizio.
*Costo se sbagliata:* un messaggio meno preciso su un ingresso che il chiamante non dovrebbe produrre. Lo intercetta *«tratta fasce vuote come operatrice assente anche se lo stato dice aperto»*.

**D2-6 — `dayStatus` con chiusura intera vince su tutto.** Se una chiusura a giornata intera copre la data, lo stato è `'salon_closed'` anche se l'operatrice era comunque assente. Se la chiusura è **parziale** e le fasce erano già vuote prima, lo stato è `'operator_off'`: non è la chiusura ad aver svuotato il giorno. Se erano piene e la chiusura le svuota, è `'salon_closed'` — il caso che §7.4 nomina con il 24 dicembre.
*Costo se sbagliata:* la schermata dice «nessuno lavora» quando il salone è chiuso, o viceversa. Lo intercettano le cinque prove di stato del Task 3 e, da capo a fondo, *«porta una chiusura parziale fino al motivo salone chiuso»* del Task 11.

**D2-7 — Il motivo del cercaposti, quando 28 giorni non danno niente, è il più informativo fra quelli raccolti**, in quest'ordine: `'full'` batte `'service_too_long'` batte `'operator_off'` batte `'salon_closed'`. `'full'` per primo perché esistono giorni in cui il servizio ci starebbe, quindi «estendi l'orizzonte» è un consiglio sensato; `'service_too_long'` per secondo perché estendere non servirà mai.
*Costo se sbagliata:* il messaggio di vuoto suggerisce l'azione sbagliata. Lo intercetta *«riporta full quando almeno un giorno era aperto e pieno»*.

**D2-8 — `availability_window` è `security invoker` e `p_operator_ids` nullo significa nessuna operatrice, non tutte.** `security invoker` perché la sicurezza per riga deve arbitrare la lettura come per ogni altra tabella; `= any(null)` non restituisce righe, e questa è la lettura sicura: un errore del chiamante produce un risultato vuoto, non l'agenda di tutto il salone.
⚠︎ **La promessa vale per le tre sezioni che hanno un'operatrice** — `weekly`, `exceptions`, `occupancy`. `closures` **non è filtrato per operatrice** perché una chiusura è del salone e non di una persona: con `p_operator_ids` nullo il documento non è vuoto, contiene ancora le chiusure. La prova lo asserisce così, invece di promettere più di quanto misuri.
*Costo se sbagliata:* nel caso peggiore la funzione diventerebbe una via di lettura che scavalca la sicurezza per riga. Lo intercettano *«non restituisce nulla a un account che non è operatrice»* e *«tratta un elenco nullo di operatrici come nessuna operatrice»*.

**D2-9 — «L'appuntamento che precede» è il PIÙ VICINO, non tutti quelli prima. — DECISA DALL'UTENTE, 18 settembre 2026.**
Il caso che l'ha posta, misurato: `A` occupa 09:00–09:30 con una pausa di 60 minuti, `B` occupa subito dopo 09:30–10:00 con pausa 0. `B` è scrivibile toccando una cella spenta, che §7.3 dichiara esplicitamente legale («§8.1's tap-a-cell path bypasses proposal, so a straddling appointment is writable»). Alle 10:00 si può proporre: chi precede è `B`, che non chiede riassetto. La pausa di `A` era già stata mangiata da `B` quando `B` è stato prenotato, e pretenderla di nuovo dopo `B` nasconde un posto libero che esiste davvero.
È anche la lettera di §7.3, che scrive «l'appuntamento che precede» al singolare. La revisione 1 applicava la pausa di **ogni** blocco precedente, per conseguenza non voluta di un ciclo `for`.
*Costo se sbagliata:* si propone una partenza troppo attaccata a una visita lunga. Lo intercetta *«guarda solo l appuntamento PIÙ VICINO, non tutti quelli prima»* (Task 7).

**D2-10 — `availability_window` filtra le operatrici disattivate su DISPONIBILITÀ ed ECCEZIONI, non sull'OCCUPAZIONE. — DECISA DALL'UTENTE, 18 settembre 2026; il confine fra le sezioni è mio, e viene da una misura.**
Spec §7.4 dice che l'insieme delle idonee lo risolve il chiamante, «ristretto alle operatrici attive». La revisione 1 lo onorava con un commento e nessun presidio, e nessuna sua prova vedeva mai un'operatrice disattivata: `resetData()` le riattiva tutte a ogni prova. La funzione ora giunge `operator` e filtra `is_active`, come **difesa in profondità**: il danno che la spec nomina — «il cercaposti continua a proporre appuntamenti con chi se n'è andata il mese scorso» — diventa impossibile anche se il piano 3 sbaglia il chiamante.
⚠︎ **L'occupazione è esclusa dal filtro, e non per dimenticanza.** La revisione 2 lo applicava a tutte e tre le sezioni, e un revisore ha misurato la conseguenza: disattivata l'operatrice, la finestra dichiarava libera una cella 120–137 che l'inserimento poi rifiutava con `23505 duplicate key value violates unique constraint "appointment_slot_unique"`. La disponibilità dice chi si **può proporre**; l'occupazione dice che cosa è **già successo**, e quello resta vero. Dal cercaposti la differenza non è raggiungibile — senza fasce non si propone niente — ma da un percorso di scrittura diretta sì.
*Costo se sbagliata:* una responsabilità in due posti invece che in uno, e due giunzioni su una tabella di tre righe. Lo intercetta *«toglie le fasce di un operatrice disattivata e tiene la sua occupazione»* (Task 10), che asserisce tutti e due i lati del confine.

**D2-11 — A parità di data il cercaposti ordina per ORARIO fra tutte le operatrici, e la preferita vince solo a parità di orario. — DECISA DALL'UTENTE, 18 settembre 2026.**
La revisione 1 raccoglieva un'operatrice alla volta e tagliava al limite dentro quel ciclo: la prima pagina era «09:00 Vera, 09:05 Vera, 09:10 Vera, 09:15 Vera, 09:20 Vera», e Alessandra, che lavorava lo stesso giorno, non compariva mai. §8.3 chiede «le partenze libere più vicine fra **ogni** operatrice», e sul percorso del telefono che squilla quella era una pagina inutile.
Ordine completo: **data**, poi **orario d'inizio**, poi **la preferita**, poi l'ordine in cui il chiamante ha passato le operatrici.
*Costo se sbagliata:* chi risponde al telefono legge una pagina che non contiene la proposta migliore. Lo intercettano *«ordina per orario fra le operatrici a parità di data»* e *«mette la preferita prima a parità di orario»* (Task 11).

**D2-12 — `date` resta nel contratto di `proposeStarts` anche se la funzione non lo legge.** Un revisore ha misurato che nessuna riga di `proposeStarts` usa `date`, e che cancellarlo non renderebbe rossa alcuna prova. Resta perché **il contratto di §7.4 è congelato** e l'handoff vieta di reinventarlo; è `cercaPosti` a riattaccare la data ai risultati. Dichiararlo qui evita che il prossimo lettore lo tolga credendo di ripulire, e che il successivo lo rimetta credendo di correggere.
*Costo se sbagliata:* nessuno misurabile oggi. Se il piano 3 avesse bisogno che la funzione decida qualcosa in base alla data — per esempio una regola stagionale — il campo è già lì.

---

## Limiti dichiarati di questo piano

Non sono difetti da correggere: sono cose che il piano **non** fa, scritte perché nessuno le scopra credendo di aver trovato un buco.

- **Il cercaposti tronca, non pagina.** `cercaPosti` ha `limit` e nessun cursore: §8.3 chiede «paginato», e la seconda pagina oggi è irraggiungibile. L'estensione dell'orizzonte c'è (`days`). **Obbligo sul piano 3:** o un `offset`, o un cursore `(date, startCell, operatorId)` da cui ripartire.
- **L'interruttore «cerca anche fuori orario» di §8.4 estenderà l'ingresso del dominio.** Il percorso di difetto — interruttore spento — è completo qui, ma il piano 3 dovrà aggiungere un parametro a `cercaPosti` o a `proposeStarts`: la firma di questo piano **non è congelata contro quell'estensione**, ed è giusto così.
- **`service_role` può eseguire `availability_window`, e nessuna riga di questo piano gliene concede il permesso.** Misurato sul catalogo il 18 settembre 2026: `service_role` esiste e ha `EXECUTE` su `list_auth_accounts()`, `move_visit()` e `write_exception_day()`, che il piano 1 revoca da `public, anon` e concede solo ad `authenticated`. La concessione viene dal bootstrap di Supabase, fuori dalle migrazioni del repo. È atteso — `service_role` è il ruolo lato server che scavalca la sicurezza per riga per progetto — ma **nessuna frase di questo piano può dire «solo `authenticated`»**, perché sarebbe falsa.
- **Il contorno di `cercaPosti` non è presidiato**, misurato: `limit: 0` restituisce **una** riga invece di zero, perché il controllo sul limite viene dopo il `push`; `days: 0` restituisce un elenco vuoto **senza motivo**, perché nessun giorno è stato interrogato e `motiviVisti` è vuoto; `operatorIds` con duplicati produce righe duplicate. Nessuno dei tre è raggiungibile da un chiamante sano, e il piano 3 costruisce il chiamante — ma sono scritti qui perché una prova che li coprisse non esiste, e il silenzio li farebbe scoprire a qualcun altro.
- **Il tipo `Chiusura` ammette ancora la coppia mista** (`fromBoundary` valorizzato e `toBoundary` nullo, o viceversa), che `sottrai` convertirebbe in silenzio. Il vincolo `salon_closure_boundary_pair` della migrazione 0006 la rende non scrivibile, quindi non arriva dai dati veri — ma `decodificaFinestra` non valida nulla, a differenza di `blocco()`, e se un domani quel vincolo cadesse la coppia mista entrerebbe senza che nessuno se ne accorga.
- **Nessun presidio di catalogo copre i permessi delle FUNZIONI.** Misurato: `tests/schema/catalogue-audit.test.ts` enumera gli ACL di tabella con `aclexplode(pg_class.relacl)`, e per le funzioni guarda solo `prosecdef` e `search_path`. Che `anon` non abbia `EXECUTE` su una funzione di `public` non è verificato da nessuna parte: la coppia `revoke`/`grant` del Task 10 è protetta solo dalla prova del suo task, per nome e per firma. Una funzione futura che la dimentica non la coglie nessuno. È materiale per una remediation a sé, non per questo piano.
- **La sicurezza per riga costa circa sette volte sulla sezione più pesante.** Misurato il 18 settembre 2026 su 4.662 appuntamenti, 28 giorni e tre operatrici: 9,19 ms e 809 buffer come `authenticated`, contro 1,24 ms e 15 buffer da proprietario. `app.is_active_operator()` è `security definer` e non entra in linea, quindi finisce come filtro per riga su ogni scansione e impedisce la forma a hash join. È un costo dell'impianto del piano 1, non di questa funzione — ma il cercaposti è la strada dove §7.5 dichiara che la latenza è il punto, e quando i servizi a catalogo crescono il pianificatore passa a `Memoize` e scende a 3,26 ms.
- **L'ordine dei passi 3 e 4 di §7.1 non è osservabile, e quindi non è presidiato.** Piegare prima di sottrarre e sottrarre prima di piegare danno lo **stesso** insieme di celle su ogni ingresso legale: la sottrazione distribuisce sull'unione, e una chiusura ha `to_boundary > from_boundary`, quindi lascia sempre almeno una cella di stacco e non può creare fasce contigue. Due revisori l'hanno misurato indipendentemente con 200.000 ingressi di fuzz ciascuno. La revisione 1 aveva una prova e una sonda su questo punto: **sono state tolte**, perché una prova che non può fallire è peggio dell'assenza di prova. L'ordine scritto nel codice resta quello di §7.1 per leggibilità.

---

## Trappole misurate che questo piano deve rispettare

Vengono dal piano 1, dalla memoria dell'utente e dalla prima revisione di questo piano. Non sono ipotesi.

- **Il CLI Supabase salta in silenzio una migrazione il cui prefisso numerico contiene un non-cifra**, stampa una riga facile da non vedere e `db reset` esce con successo. Il file è `0012_availability_window.sql`, cifre sole. **Si verifica leggendo l'output del reset**, non assumendo.
- **`supabase stop` conserva un volume di backup** e `stop` + `start` ripristina il database precedente invece di ricostruirlo. L'avvio a freddo è `npx supabase db reset`.
- **Ogni migrazione che crea una TABELLA deve revocare nel proprio file.** Questo piano **non crea tabelle**: crea una funzione, e per le funzioni l'obbligo è un altro — Supabase concede `EXECUTE` a `anon` per difetto su ogni funzione nuova in `public`, quindi si revoca da `public` e da `anon` e si concede ad `authenticated`.
- **Una prova che chiama `asOwner` due volte usa due connessioni e due transazioni** e non può osservare nulla che dipenda dalla transazione. Nel piano 1 questo ha prodotto quattro prove incapaci di fallire.
- **Una prova di permesso che si limita a «chiama come `anon`, aspettati `42501`» non discrimina**: il codice è lo stesso se `EXECUTE` c'è ma il corpo inciampa in un privilegio di tabella o in una politica. Si asserisce anche `has_function_privilege`. ⚠︎ **`has_function_privilege('public', …)` funziona** — misurato il 18 settembre 2026: dà `true` su `now()`, `false` su `public.list_auth_accounts()`, e un ruolo inesistente solleva `42704`. Il pseudo-ruolo `PUBLIC` è accettato e la riga non è inerte.
- **Le fixture portano almeno due operatrici, DUE DATE, due clienti e due servizi.** Con una cosa sola di ciascuna, ogni predicato che scopa per quella cosa è dichiarato e mai esercitato. ⚠︎ La revisione 1 dichiarava questa regola e poi usava **una sola data** in nove prove su dieci del Task 10: mutando `between p_from and p_to` in `= p_from` sarebbero restate tutte verdi, cioè il comportamento «a intervallo» — l'unica ragione per cui quella funzione esiste — reggeva per accidente. Il Task 10 usa ora `DAY_ONE` **e** `DAY_TWO`.
- **Ogni task finisce con una sonda di mutazione** che rompe il presidio e pretende che prove **nominate** diventino rosse. Una sonda il cui esito è «si registra cosa succede» non è una sonda. E si muta il **singolo ramo**, non l'intera funzione.
- ⚠︎ **Una mutazione che lascia la suite verde non sempre accusa la prova.** Può essere **equivalente**: produce un programma che si comporta in modo identico, e allora nessuna prova può ucciderla e riscrivere la prova è tempo perso. Le mutazioni equivalenti note sono dichiarate per nome nelle tabelle, con la ragione. Prima di riscrivere una prova, chiediti se la mutazione cambia davvero qualcosa.
- ⚠︎ **Una sonda che uccide quattro o più prove non sta discriminando**: sta spegnendo mezza funzione. Le sonde di questo piano che lo fanno sono marcate *(ampia)* e il loro esito non dice niente sulla prova nominata.

---

## Fatti di partenza, misurati il 18 settembre 2026

- `npm test` → `Test Files 13 passed (13)`, `Tests 145 passed (145)`.
- `npx supabase db reset` applica `0001, 0002, 0003, 0004, 0005, 00051, 0006, 0007, 0008, 0009, 0010, 0011` e poi `Seeding data from supabase/seed.sql`, senza alcuna riga `Skipping migration`.
- `0012` è libero sul disco e non rivendicato da alcun documento.
- Non esiste ancora una directory `src/`: questo piano crea il primo codice applicativo del progetto.
- `tsconfig.json` ha `"include": ["tests/**/*.ts", "vitest.config.ts"]` — `src/` va aggiunto o il controllo dei tipi non lo vede.
- Le fixture: `SERVICE_REFILL` dura 18 celle con pausa 0, `SERVICE_MASSAGE` dura 10 celle con pausa 3. `DAY_ONE` è `2026-03-12` e `DAY_TWO` è `2026-03-19`: **entrambi giovedì, `weekday` 3**.
- `service_role` esiste e ha `EXECUTE` sulle funzioni del piano 1 (vedi *Limiti dichiarati*).
- `exception_range` ha due indici: la chiave primaria su `id` e quello GiST di esclusione. **Non serve un btree su `exception_day_id`**: misurato con `explain (analyze, buffers)` su 43.836 fasce e 10.959 giorni di eccezione, il pianificatore usa l'indice GiST con `Index Cond: (exception_day_id = e.id)` — 252 buffer per 84 sonde, 2,51 ms. Una revisione precedente lo aveva scritto come limite: era una deduzione, e la misura la smentisce.

---
## Task 1: L'impalcatura del codice applicativo e i due domini del tempo

**File:**
- Crea: `src/dominio/tipi.ts`, `src/dominio/tempo.ts`
- Modifica: `tsconfig.json`
- Prova: `tests/dominio/tempo.test.ts`

**Interfacce:**
- Consuma: niente.
- Produce: i tipi `IndiceCella`, `IndiceConfine`, `Fascia`, `Blocco`, `StatoGiorno`, `MotivoAssenza`; le funzioni `oraDaConfine(confine): string`, `oraDaCella(cella): string`, `confineDaOra(ora): IndiceConfine`, `giornoSettimana(data): number`, `sommaGiorni(data, n): string`, `blocco(appointmentId, startCell, cellCount, bufferAfterCells): Blocco`, `staNellaFascia(startCell, cellCount, fascia): boolean`; le costanti `CELLE_PER_GIORNO = 288`, `MINUTI_PER_CELLA = 5`.

⚠︎ **`blocco()` sta sul percorso dei dati veri** (D2-1): il Task 11 lo chiama per ogni riga di occupazione che arriva dal database. Le sue guardie non sono decorazione, e le prove qui sotto le esercitano una per una.

- [ ] **Passo 1: scrivere la prova che fallisce**

`tests/dominio/tempo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  CELLE_PER_GIORNO,
  blocco,
  confineDaOra,
  giornoSettimana,
  oraDaCella,
  oraDaConfine,
  sommaGiorni,
  staNellaFascia,
} from '../../src/dominio/tempo'

describe('i due domini del tempo', () => {
  it('conta 288 celle in un giorno', () => {
    expect(CELLE_PER_GIORNO).toBe(288)
  })

  it('traduce un confine in orario', () => {
    expect(oraDaConfine(0)).toBe('00:00')
    expect(oraDaConfine(96)).toBe('08:00')
    expect(oraDaConfine(240)).toBe('20:00')
  })

  // ⚠ discriminante: il confine 288 è la mezzanotte di CHIUSURA di un giorno.
  // È legale come fine di fascia e illegale come indice di cella: è l'unica
  // differenza osservabile fra i due domini, e se le due funzioni condividono
  // il controllo questa prova la vede.
  it('accetta il confine 288 e rifiuta la cella 288', () => {
    expect(oraDaConfine(288)).toBe('24:00')
    expect(() => oraDaCella(288)).toThrow(RangeError)
  })

  it('rifiuta un confine fuori dominio o non intero', () => {
    expect(() => oraDaConfine(-1)).toThrow(RangeError)
    expect(() => oraDaConfine(289)).toThrow(RangeError)
    expect(() => oraDaConfine(12.5)).toThrow(RangeError)
  })

  it('traduce un orario in confine, e torna indietro', () => {
    expect(confineDaOra('09:00')).toBe(108)
    expect(confineDaOra('11:15')).toBe(135)
    expect(oraDaConfine(confineDaOra('11:55'))).toBe('11:55')
  })

  it('rifiuta un orario che non cade su una cella da cinque minuti', () => {
    expect(() => confineDaOra('09:07')).toThrow(RangeError)
  })

  // ⚠ discriminante: la guardia oltre la mezzanotte. '24:00' è il confine 288
  // ed è legale; '24:05' sarebbe il 289 e non esiste. Senza questa prova la
  // guardia non è esercitata da niente.
  it('accetta le 24:00 come confine e rifiuta qualunque cosa dopo', () => {
    expect(confineDaOra('24:00')).toBe(288)
    expect(() => confineDaOra('24:05')).toThrow(RangeError)
    expect(() => confineDaOra('25:00')).toThrow(RangeError)
  })

  // ⚠ discriminante: 0 = lunedì, non la convenzione di JavaScript.
  // Il 2026-03-12 è un GIOVEDÌ: getUTCDay() dice 4, la nostra mappa dice 3.
  // Una prova su una domenica non distinguerebbe le due convenzioni.
  it('mappa il giorno della settimana con 0 = lunedì', () => {
    expect(giornoSettimana('2026-03-12')).toBe(3)
    expect(giornoSettimana('2026-03-16')).toBe(0)
    expect(giornoSettimana('2026-03-22')).toBe(6)
  })

  // ⚠ discriminante SOLO A OVEST DI UTC. `new Date('2026-03-30')` è la
  // mezzanotte UTC: letta a Roma, che è a EST, resta lo stesso giorno civile,
  // quindi una lettura locale sbagliata sarebbe verde a Perugia e rossa in una
  // CI su fuso americano. La sonda 4 si esegue con TZ=America/New_York per
  // questo motivo. La data è il giorno dopo un cambio d'ora legale italiano.
  it('non fa slittare una data attraverso il cambio dell ora legale', () => {
    expect(giornoSettimana('2026-03-30')).toBe(0)
    expect(sommaGiorni('2026-03-28', 2)).toBe('2026-03-30')
  })

  it('somma giorni attraverso la fine del mese e un anno bisestile', () => {
    expect(sommaGiorni('2026-03-12', 28)).toBe('2026-04-09')
    expect(sommaGiorni('2028-02-28', 1)).toBe('2028-02-29')
  })

  // ⚠ discriminante: D2-1. Un blocco che parte alla cella 120 e dura 18 celle
  // occupa fino alla 137, non alla 138. Se endCell fosse un confine questa
  // prova sarebbe rossa.
  it('l ultima cella di un blocco è occupata', () => {
    const b = blocco('a1', 120, 18, 3)
    expect(b.startCell).toBe(120)
    expect(b.endCell).toBe(137)
    expect(b.bufferAfterCells).toBe(3)
  })

  it('rifiuta un blocco che scavalca la mezzanotte o dura zero', () => {
    expect(() => blocco('a1', 280, 9, 0)).toThrow(RangeError)
    expect(() => blocco('a1', 120, 0, 0)).toThrow(RangeError)
  })

  // ⚠ discriminante: la guardia sul dominio di start_cell. Il database la
  // impone con un check, ma blocco() è la porta d'ingresso dei dati veri
  // (D2-1) e una riga corrotta non deve entrare in silenzio nel dominio.
  it('rifiuta un blocco che parte fuori dal dominio delle celle', () => {
    expect(() => blocco('a1', -1, 6, 0)).toThrow(RangeError)
    expect(() => blocco('a1', 288, 6, 0)).toThrow(RangeError)
    expect(() => blocco('a1', 12.5, 6, 0)).toThrow(RangeError)
  })

  // ⚠ discriminante: una pausa negativa allargherebbe la fascia proponibile
  // invece di stringerla, cioè proporrebbe partenze SOPRA l'appuntamento
  // precedente. È il solo valore di questo modulo il cui errore propone un
  // orario occupato invece di nasconderne uno libero.
  it('rifiuta una pausa di riassetto negativa', () => {
    expect(() => blocco('a1', 120, 18, -1)).toThrow(RangeError)
  })

  // ⚠ discriminante: è la regola di §5 sul confronto fra i due domini.
  // start_cell >= start_boundary and start_cell + cell_count <= end_boundary.
  // Una fascia [108, 144) accoglie una cella iniziale 138 per 6 celle (fino a
  // 143 inclusa, confine 144) ma non per 7.
  it('decide se un appuntamento sta in una fascia senza confrontare i domini', () => {
    const fascia = { startBoundary: 108, endBoundary: 144 }
    expect(staNellaFascia(138, 6, fascia)).toBe(true)
    expect(staNellaFascia(138, 7, fascia)).toBe(false)
    expect(staNellaFascia(107, 1, fascia)).toBe(false)
    expect(staNellaFascia(108, 36, fascia)).toBe(true)
  })
})
```

- [ ] **Passo 2: eseguirla e verificare che fallisce**

```bash
npm test -- tests/dominio/tempo.test.ts
```

Atteso: FALLISCE — `Failed to resolve import "../../src/dominio/tempo"`.

- [ ] **Passo 3: aggiungere `src/` al controllo dei tipi**

In `tsconfig.json`, sostituire la riga `include` con:

```json
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
```

Non serve toccare `vitest.config.ts`: senza un `include` esplicito Vitest raccoglie già `tests/dominio/*.test.ts`, e la corsa a un thread solo resta quella che serve alle prove sul database.

- [ ] **Passo 4: scrivere i tipi**

`src/dominio/tipi.ts`:

```ts
// I tipi condivisi del dominio. Spec §5, §6.5, §7.4.

/** Un indice di cella identifica un blocco di cinque minuti: 0–287. Spec §5. */
export type IndiceCella = number

/** Un indice di confine identifica un istante fra due blocchi: 0–288. Spec §5. */
export type IndiceConfine = number

/**
 * Una fascia di disponibilità, `[startBoundary, endBoundary)`, fine esclusa.
 * I nomi dei campi sono quelli delle colonne di `weekly_availability` e di
 * `exception_range` (migrazione 0006), quindi restano in inglese.
 */
export interface Fascia {
  readonly startBoundary: IndiceConfine
  readonly endBoundary: IndiceConfine
}

/**
 * Un blocco occupato da un appuntamento.
 *
 * Spec §7.4: `occupancy` porta BLOCCHI e non celle nude, perché la regola del
 * tempo di riassetto (§7.3) ha bisogno della pausa dell'appuntamento che
 * PRECEDE, e un insieme piatto di celle prese non può fornirla.
 *
 * `endCell` è l'ULTIMA CELLA OCCUPATA, INCLUSA (decisione D2-1): si costruisce
 * con `blocco()`, che è l'unico posto in tutto il sistema dove quel numero
 * viene calcolato.
 */
export interface Blocco {
  readonly appointmentId: string
  readonly startCell: IndiceCella
  readonly endCell: IndiceCella
  readonly bufferAfterCells: number
}

/** Spec §7.4. Valori congelati dalla spec: restano in inglese. */
export type StatoGiorno = 'open' | 'salon_closed' | 'operator_off'

/**
 * I quattro codici di motivo di spec §7.4: aperto ma pieno, salone chiuso,
 * operatrice assente, servizio più lungo di qualunque fascia. Al telefono sono
 * quattro frasi diverse.
 */
export type MotivoAssenza = 'full' | 'salon_closed' | 'operator_off' | 'service_too_long'
```

- [ ] **Passo 5: scrivere il modulo del tempo**

`src/dominio/tempo.ts`:

```ts
// I due domini del tempo e l'unico posto dove una cella diventa un orario.
// Spec §5, §5.1, §5.2.

import type { Blocco, Fascia, IndiceCella, IndiceConfine } from './tipi'

export const MINUTI_PER_CELLA = 5
export const CELLE_PER_GIORNO = 288

/**
 * L'orario di un CONFINE. Accetta 0–288: il confine 288 è la mezzanotte di
 * chiusura del giorno e vale '24:00', che è una fine di fascia legittima.
 */
export function oraDaConfine(confine: IndiceConfine): string {
  if (!Number.isInteger(confine) || confine < 0 || confine > CELLE_PER_GIORNO) {
    throw new RangeError(`confine fuori dal dominio 0–288: ${confine}`)
  }
  const minuti = confine * MINUTI_PER_CELLA
  return `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`
}

/**
 * L'orario in cui COMINCIA una cella. Accetta 0–287: la cella 288 non esiste,
 * e chiamarla è il sintomo di un confine usato come indice di cella.
 */
export function oraDaCella(cella: IndiceCella): string {
  if (!Number.isInteger(cella) || cella < 0 || cella > CELLE_PER_GIORNO - 1) {
    throw new RangeError(`cella fuori dal dominio 0–287: ${cella}`)
  }
  return oraDaConfine(cella)
}

/** Da 'HH:MM' al confine corrispondente. Rifiuta gli orari fuori griglia. */
export function confineDaOra(ora: string): IndiceConfine {
  const pezzi = /^(\d{2}):(\d{2})$/.exec(ora)
  if (pezzi === null) throw new RangeError(`orario non nella forma HH:MM: ${ora}`)
  const minuti = Number(pezzi[1]) * 60 + Number(pezzi[2])
  if (minuti % MINUTI_PER_CELLA !== 0) {
    throw new RangeError(`orario fuori dalla griglia da cinque minuti: ${ora}`)
  }
  const confine = minuti / MINUTI_PER_CELLA
  if (confine > CELLE_PER_GIORNO) throw new RangeError(`orario oltre la mezzanotte: ${ora}`)
  return confine
}

function pezziData(data: string): [number, number, number] {
  const pezzi = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (pezzi === null) throw new RangeError(`data non nella forma YYYY-MM-DD: ${data}`)
  return [Number(pezzi[1]), Number(pezzi[2]), Number(pezzi[3])]
}

/**
 * 0 = lunedì … 6 = domenica (spec §5.2). La data si costruisce con `Date.UTC`
 * e si legge con `getUTCDay()`.
 *
 * `new Date('2026-03-30')` sarebbe la mezzanotte UTC, e leggerla con
 * `getDay()` fa slittare la data di un giorno indietro A OVEST di UTC — verde
 * a Perugia, rossa in una CI su fuso americano. È il verso opposto a quello
 * che riguarda il parser di `pg` in `tests/helpers/db.ts`, dove una `date`
 * arriva a mezzanotte LOCALE e slitta a est: due bug speculari, e questo è
 * quello invisibile da qui.
 */
export function giornoSettimana(data: string): number {
  const [anno, mese, giorno] = pezziData(data)
  return (new Date(Date.UTC(anno, mese - 1, giorno)).getUTCDay() + 6) % 7
}

/** Somma giorni di calendario a una data, restando in UTC e in stringa. */
export function sommaGiorni(data: string, giorni: number): string {
  const [anno, mese, giorno] = pezziData(data)
  const spostata = new Date(Date.UTC(anno, mese - 1, giorno + giorni))
  return spostata.toISOString().slice(0, 10)
}

/**
 * Costruisce un blocco occupato da `start_cell` e `cell_count`, che sono i
 * nomi delle colonne di `appointment`. `endCell` è l'ultima cella occupata,
 * INCLUSA (D2-1), e QUESTO è l'unico posto in tutto il sistema che la calcola:
 * `availability_window` restituisce `cell_count` grezzo proprio per non avere
 * la stessa aritmetica anche in SQL.
 */
export function blocco(
  appointmentId: string,
  startCell: IndiceCella,
  cellCount: number,
  bufferAfterCells: number,
): Blocco {
  if (!Number.isInteger(startCell) || startCell < 0 || startCell > CELLE_PER_GIORNO - 1) {
    throw new RangeError(`start_cell fuori dal dominio 0–287: ${startCell}`)
  }
  if (!Number.isInteger(cellCount) || cellCount < 1) {
    throw new RangeError(`cell_count deve essere almeno 1: ${cellCount}`)
  }
  if (startCell + cellCount > CELLE_PER_GIORNO) {
    throw new RangeError(`l appuntamento scavalca la mezzanotte: ${startCell} + ${cellCount}`)
  }
  if (!Number.isInteger(bufferAfterCells) || bufferAfterCells < 0) {
    throw new RangeError(`buffer_after_cells non può essere negativo: ${bufferAfterCells}`)
  }
  return { appointmentId, startCell, endCell: startCell + cellCount - 1, bufferAfterCells }
}

/**
 * La regola di §5 sul confronto fra i due domini, scritta una volta sola:
 * `start_cell >= start_boundary and start_cell + cell_count <= end_boundary`.
 */
export function staNellaFascia(
  startCell: IndiceCella,
  cellCount: number,
  fascia: Fascia,
): boolean {
  return startCell >= fascia.startBoundary && startCell + cellCount <= fascia.endBoundary
}
```

- [ ] **Passo 6: eseguire le prove e verificare che passano**

```bash
npm test -- tests/dominio/tempo.test.ts
npx tsc --noEmit
```

Atteso: PASSA, 15 prove. `tsc` senza errori — è la verifica che il `tsconfig.json` modificato vede davvero `src/`.

- [ ] **Passo 7: ⚠ Sonda di mutazione — dimostrare che i due domini sono separati davvero**

In una copia di lavoro da buttare, una mutazione alla volta, rimettendo a posto dopo ciascuna:

| # | Mutazione in `src/dominio/tempo.ts` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | in `oraDaCella`, `> CELLE_PER_GIORNO - 1` → `> CELLE_PER_GIORNO` | *«accetta il confine 288 e rifiuta la cella 288»* |
| 2 | in `blocco`, `startCell + cellCount - 1` → `startCell + cellCount` | *«l ultima cella di un blocco è occupata»* — *(ampia: ne uccide anche altre nei Task 6, 7 e 8, perché il tipo attraversa tutto il dominio)* |
| 3 | in `giornoSettimana`, `(… + 6) % 7` → `…` senza spostamento | *«mappa il giorno della settimana con 0 = lunedì»* |
| 4 | in `giornoSettimana`, `Date.UTC(anno, mese - 1, giorno)` + `getUTCDay()` → `new Date(data)` + `getDay()`, **da eseguire con `TZ=America/New_York`** | *«non fa slittare una data attraverso il cambio dell ora legale»* e *«mappa il giorno della settimana con 0 = lunedì»* |
| 5 | in `staNellaFascia`, `<= fascia.endBoundary` → `< fascia.endBoundary` | *«decide se un appuntamento sta in una fascia senza confrontare i domini»* |
| 6 | in `confineDaOra`, togliere `if (confine > CELLE_PER_GIORNO) throw` | *«accetta le 24:00 come confine e rifiuta qualunque cosa dopo»* |
| 7 | in `blocco`, togliere la guardia su `startCell` | *«rifiuta un blocco che parte fuori dal dominio delle celle»* |
| 8 | in `blocco`, `bufferAfterCells < 0` → `bufferAfterCells < -1` | *«rifiuta una pausa di riassetto negativa»* |

⚠︎ **La mutazione 4 va eseguita con `TZ=America/New_York`**, non con `TZ=Europe/Rome`:

```bash
TZ=America/New_York npm test -- tests/dominio/tempo.test.ts
```

Misurato il 18 settembre 2026: con `TZ=Europe/Rome` e con `TZ=UTC` il mutante dà **le stesse risposte** dell'originale su tutte e quattro le date, perché `new Date('YYYY-MM-DD')` è mezzanotte UTC e a est di UTC cade sullo stesso giorno civile. Con `TZ=America/New_York` diverge su tutte e quattro. **Mutante equivalente da NON usare:** `new Date(anno, mese - 1, giorno)` + `getDay()` — misurato identico all'originale in ogni fuso, perché la mezzanotte locale cade sempre sulla data civile locale.

Se una mutazione lascia la suite verde, la prova corrispondente non discrimina e va riscritta **prima** di chiudere il task — a meno che la mutazione non sia dichiarata equivalente qui sopra.

- [ ] **Passo 8: commit**

```bash
git add tsconfig.json src/dominio/tipi.ts src/dominio/tempo.ts tests/dominio/tempo.test.ts
git commit -m "feat(dominio): i due domini del tempo, con la cella 288 che non esiste"
```

---
## Task 2: La settimana tipica e l'eccezione che sostituisce il giorno

**File:**
- Crea: `src/dominio/fasce.ts`
- Prova: `tests/dominio/fasce.test.ts`

**Interfacce:**
- Consuma: `Fascia`, `StatoGiorno` da `src/dominio/tipi`.
- Produce: `risolviGiorno({ weekly, exception, closures }) -> { ranges: Fascia[]; dayStatus: StatoGiorno }`; il tipo `Eccezione = { ranges: readonly Fascia[] }`; il tipo `Chiusura = { fromBoundary: number | null; toBoundary: number | null }`. In questo task `closures` è accettato e ignorato: lo consuma il Task 3.

- [ ] **Passo 1: scrivere la prova che fallisce**

`tests/dominio/fasce.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { risolviGiorno } from '../../src/dominio/fasce'

const MATTINA = { startBoundary: 108, endBoundary: 156 } // 09:00–13:00
const POMERIGGIO = { startBoundary: 180, endBoundary: 228 } // 15:00–19:00

describe('risoluzione del giorno — settimana tipica ed eccezione', () => {
  it('restituisce la settimana tipica quando non c è alcuna eccezione', () => {
    const esito = risolviGiorno({ weekly: [MATTINA, POMERIGGIO], exception: null, closures: [] })
    expect(esito.ranges).toEqual([MATTINA, POMERIGGIO])
    expect(esito.dayStatus).toBe('open')
  })

  it('dichiara l operatrice assente quando la settimana tipica è vuota', () => {
    const esito = risolviGiorno({ weekly: [], exception: null, closures: [] })
    expect(esito.ranges).toEqual([])
    expect(esito.dayStatus).toBe('operator_off')
  })

  // ⚠ discriminante: l'eccezione SOSTITUISCE il giorno, non si somma.
  // L'eccezione qui accorcia la mattina e cancella il pomeriggio: se le due
  // liste venissero unite, il pomeriggio riapparirebbe.
  it('lascia che un eccezione sostituisca il giorno invece di sommarsi', () => {
    const esito = risolviGiorno({
      weekly: [MATTINA, POMERIGGIO],
      exception: { ranges: [{ startBoundary: 108, endBoundary: 132 }] },
      closures: [],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 132 }])
    expect(esito.dayStatus).toBe('open')
  })

  it('lascia che un eccezione allunghi il giorno', () => {
    const esito = risolviGiorno({
      weekly: [MATTINA],
      exception: { ranges: [{ startBoundary: 96, endBoundary: 240 }] },
      closures: [],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 96, endBoundary: 240 }])
  })

  // ⚠ discriminante: zero fasce SIGNIFICA assente (spec §6.5, non c è un flag).
  // Con `exception` trattata come falsa quando è senza figli, questa prova
  // vedrebbe tornare la settimana tipica.
  it('tratta un eccezione senza fasce come assenza, non come assenza di eccezione', () => {
    const esito = risolviGiorno({
      weekly: [MATTINA, POMERIGGIO],
      exception: { ranges: [] },
      closures: [],
    })
    expect(esito.ranges).toEqual([])
    expect(esito.dayStatus).toBe('operator_off')
  })

  // ⚠ discriminante: l'uscita non deve condividere OGGETTI con l'ingresso, non
  // soltanto l'array. Mutare un ELEMENTO dell'uscita e pretendere l'ingresso
  // intatto è ciò che distingue una copia vera da una copia dell'array con gli
  // stessi oggetti dentro — e resta discriminante anche dopo il Task 4, dove
  // `piega` ricostruisce l'array ma potrebbe riusare gli oggetti.
  it('non lascia che l uscita condivida oggetti con le fasce del chiamante', () => {
    const weekly = [{ startBoundary: 108, endBoundary: 156 }]
    const esito = risolviGiorno({ weekly, exception: null, closures: [] })
    ;(esito.ranges[0] as { endBoundary: number }).endBoundary = 999
    expect(weekly[0].endBoundary).toBe(156)
  })
})
```

- [ ] **Passo 2: eseguirla e verificare che fallisce**

```bash
npm test -- tests/dominio/fasce.test.ts
```

Atteso: FALLISCE — `Failed to resolve import "../../src/dominio/fasce"`.

- [ ] **Passo 3: scrivere la risoluzione, fermandosi all eccezione**

`src/dominio/fasce.ts`:

```ts
// Risoluzione delle fasce di un giorno. Spec §7.1 e §6.6.

import type { Fascia, StatoGiorno } from './tipi'

/**
 * Un giorno di eccezione. La PRESENZA dell'oggetto significa che l'eccezione
 * esiste; `ranges` vuoto significa ASSENTE. Spec §6.5: non c'è alcun flag,
 * perché un flag rendeva «non assente con zero fasce» identico ad «assente» —
 * un significato con due scritture.
 */
export interface Eccezione {
  readonly ranges: readonly Fascia[]
}

/**
 * Una chiusura del salone. Entrambi i confini nulli: giornata intera.
 * Entrambi valorizzati: la finestra `[fromBoundary, toBoundary)` viene tagliata
 * via da ogni data dell'intervallo. Spec §6.5.
 */
export interface Chiusura {
  readonly fromBoundary: number | null
  readonly toBoundary: number | null
}

export interface IngressoGiorno {
  readonly weekly: readonly Fascia[]
  readonly exception: Eccezione | null
  readonly closures: readonly Chiusura[]
}

export interface EsitoGiorno {
  readonly ranges: Fascia[]
  readonly dayStatus: StatoGiorno
}

export function risolviGiorno(ingresso: IngressoGiorno): EsitoGiorno {
  // Passo 1 e 2 di §7.1: l'eccezione SOSTITUISCE il giorno per intero.
  // Si guarda `exception !== null`, non `exception.ranges.length`: zero fasce
  // è un'assenza dichiarata, non l'assenza di un'eccezione.
  const base: Fascia[] =
    ingresso.exception !== null
      ? ingresso.exception.ranges.map(copia)
      : ingresso.weekly.map(copia)

  const dayStatus: StatoGiorno = base.length === 0 ? 'operator_off' : 'open'
  return { ranges: base, dayStatus }
}

function copia(f: Fascia): Fascia {
  return { startBoundary: f.startBoundary, endBoundary: f.endBoundary }
}
```

- [ ] **Passo 4: eseguire le prove e verificare che passano**

```bash
npm test -- tests/dominio/fasce.test.ts
```

Atteso: PASSA, 6 prove.

- [ ] **Passo 5: ⚠ Sonda di mutazione**

| # | Mutazione in `src/dominio/fasce.ts` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | `ingresso.exception !== null` → `ingresso.exception !== null && ingresso.exception.ranges.length > 0` | *«tratta un eccezione senza fasce come assenza, non come assenza di eccezione»* |
| 2 | `base` costruita come `[...weekly, ...(exception?.ranges ?? [])]` | *«lascia che un eccezione sostituisca il giorno invece di sommarsi»* *(ampia)* |
| 3 | `.map(copia)` → `.slice()` (copia l'array, non gli oggetti) | *«non lascia che l uscita condivida oggetti con le fasce del chiamante»* |

⚠︎ La sonda 3 uccide **solo a questo stadio**. Dal Task 4 in poi diventa equivalente, perché `piega` ricopia per conto suo: la garanzia contro l'aliasing passa alla sonda 5 del Task 4, che muta proprio quel `copia`. È scritto qui e là perché un presidio che cambia casa senza che nessuno lo dica è un presidio che sparisce.

- [ ] **Passo 6: commit**

```bash
git add src/dominio/fasce.ts tests/dominio/fasce.test.ts
git commit -m "feat(dominio): l eccezione sostituisce il giorno, e zero fasce è assenza"
```

---

## Task 3: Le chiusure del salone, la precedenza e lo stato del giorno

**File:**
- Modifica: `src/dominio/fasce.ts`
- Prova: `tests/dominio/fasce.test.ts` (aggiunge un `describe`)

**Interfacce:**
- Consuma: `risolviGiorno` del Task 2.
- Produce: la stessa firma, ora con `closures` che sottrae davvero e con `dayStatus` che distingue `'salon_closed'` da `'operator_off'` secondo D2-6.

- [ ] **Passo 1: scrivere le prove che falliscono**

Aggiungere a `tests/dominio/fasce.test.ts`:

```ts
describe('risoluzione del giorno — chiusure e precedenza', () => {
  const GIORNATA = { startBoundary: 108, endBoundary: 228 } // 09:00–19:00

  it('svuota il giorno con una chiusura a giornata intera', () => {
    const esito = risolviGiorno({
      weekly: [GIORNATA],
      exception: null,
      closures: [{ fromBoundary: null, toBoundary: null }],
    })
    expect(esito.ranges).toEqual([])
    expect(esito.dayStatus).toBe('salon_closed')
  })

  it('taglia una chiusura parziale dentro una fascia, lasciandone due', () => {
    const esito = risolviGiorno({
      weekly: [GIORNATA],
      exception: null,
      closures: [{ fromBoundary: 150, toBoundary: 162 }], // 12:30–13:30
    })
    expect(esito.ranges).toEqual([
      { startBoundary: 108, endBoundary: 150 },
      { startBoundary: 162, endBoundary: 228 },
    ])
    expect(esito.dayStatus).toBe('open')
  })

  it('accorcia una fascia quando la chiusura ne morde solo la coda', () => {
    const esito = risolviGiorno({
      weekly: [GIORNATA],
      exception: null,
      closures: [{ fromBoundary: 156, toBoundary: 288 }], // dalle 13:00 a fine giornata
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
  })

  it('lascia intatta una fascia che la chiusura non tocca', () => {
    const esito = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: null,
      closures: [{ fromBoundary: 180, toBoundary: 228 }],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
  })

  // ⚠ discriminante: una chiusura che sta TUTTA PRIMA della fascia non deve
  // toglierle niente — e soprattutto non deve AGGIUNGERLE niente.
  //
  // Il valore di confine conta, ed è facile sbagliarlo: una chiusura che
  // finisce ESATTAMENTE dove la fascia comincia (`a === startBoundary`) NON è
  // osservabile, perché togliendo il primo guardiano i due `push` ricostruiscono
  // la fascia identica. L'unico caso osservabile è `a < startBoundary`, ed è
  // nel verso pericoloso: senza il guardiano la fascia si allungherebbe
  // all'indietro fino all'inizio della chiusura, INVENTANDO disponibilità
  // dove il salone è chiuso. Qui sono 40 minuti, dalle 07:30 alle 08:10.
  it('non allunga una fascia all indietro per una chiusura che sta tutta prima', () => {
    const tuttaPrima = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: null,
      closures: [{ fromBoundary: 90, toBoundary: 100 }],
    })
    expect(tuttaPrima.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])

    // Il caso che si tocca: stesso esito, e qui nessuna mutazione lo vede.
    const attaccata = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: null,
      closures: [{ fromBoundary: 96, toBoundary: 108 }],
    })
    expect(attaccata.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
  })

  it('somma due chiusure sovrapposte senza danno', () => {
    const esito = risolviGiorno({
      weekly: [GIORNATA],
      exception: null,
      closures: [
        { fromBoundary: 150, toBoundary: 170 },
        { fromBoundary: 160, toBoundary: 180 },
      ],
    })
    expect(esito.ranges).toEqual([
      { startBoundary: 108, endBoundary: 150 },
      { startBoundary: 180, endBoundary: 228 },
    ])
  })

  // ⚠ discriminante: è l'esempio letterale di spec §7.4. Il 24 dicembre il
  // salone chiude alle 13:00 e Alessandra lavorava 09:00–13:00: il giorno
  // resta senza fasce, e DEVE leggersi «salone chiuso», non «aperto e pieno»
  // né «operatrice assente».
  it('legge come salone chiuso una chiusura PARZIALE che svuota il giorno', () => {
    const esito = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }], // 09:00–13:00
      exception: null,
      closures: [{ fromBoundary: 156, toBoundary: 288 }], // chiuso dalle 13:00
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
    expect(esito.dayStatus).toBe('open')

    const chiusoPrima = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: null,
      closures: [{ fromBoundary: 96, toBoundary: 156 }], // chiuso fino alle 13:00
    })
    expect(chiusoPrima.ranges).toEqual([])
    expect(chiusoPrima.dayStatus).toBe('salon_closed')
  })

  // ⚠ discriminante: D2-6, il ramo che distingue chi ha svuotato il giorno.
  // Qui l'operatrice era GIÀ assente e la chiusura è parziale: non è la
  // chiusura ad aver svuotato il giorno, quindi lo stato è operator_off.
  it('non attribuisce alla chiusura parziale un giorno che era già vuoto', () => {
    const esito = risolviGiorno({
      weekly: [],
      exception: null,
      closures: [{ fromBoundary: 150, toBoundary: 162 }],
    })
    expect(esito.dayStatus).toBe('operator_off')
  })

  // ⚠ discriminante: D2-6, l'altro ramo. Con una chiusura a giornata INTERA
  // il salone è chiuso, e questo vince anche se l'operatrice era assente.
  it('dice salone chiuso quando la chiusura è intera, anche se l operatrice era assente', () => {
    const esito = risolviGiorno({
      weekly: [],
      exception: null,
      closures: [{ fromBoundary: null, toBoundary: null }],
    })
    expect(esito.dayStatus).toBe('salon_closed')
  })

  // ⚠ discriminante: §6.6. La chiusura batte l'eccezione, che batte la
  // settimana tipica. L'eccezione qui ALLUNGA il giorno, e la chiusura taglia
  // comunque: se la chiusura fosse applicata alla settimana tipica invece che
  // all'eccezione, il risultato sarebbe un altro.
  it('applica la chiusura DOPO l eccezione, non alla settimana tipica', () => {
    const esito = risolviGiorno({
      weekly: [{ startBoundary: 108, endBoundary: 156 }],
      exception: { ranges: [{ startBoundary: 96, endBoundary: 240 }] },
      closures: [{ fromBoundary: 96, toBoundary: 120 }],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 120, endBoundary: 240 }])
  })
})
```

- [ ] **Passo 2: eseguirle e verificare che falliscono**

```bash
npm test -- tests/dominio/fasce.test.ts
```

Atteso: FALLISCE — **sette delle dieci prove nuove**. Le sei del Task 2 restano verdi, e restano verdi anche due delle nuove, che non misurano il cambiamento di questo task ma il suo contorno:

- *«lascia intatta una fascia che la chiusura non tocca»* e *«non allunga una fascia all indietro per una chiusura che sta tutta prima»* — con le chiusure ancora ignorate, l'uscita è già quella attesa.
- *«non attribuisce alla chiusura parziale un giorno che era già vuoto»* — con `base` vuota, `operator_off` esce già dal Task 2.

Verifica il conteggio invece di fidarti di questa riga: se ne falliscono otto o sei, qualcosa non torna con il Task 2.

- [ ] **Passo 3: sottrarre le chiusure e calcolare lo stato**

In `src/dominio/fasce.ts`, sostituire il corpo di `risolviGiorno` e aggiungere `sottrai`:

```ts
export function risolviGiorno(ingresso: IngressoGiorno): EsitoGiorno {
  // Passo 1 e 2 di §7.1: l'eccezione SOSTITUISCE il giorno per intero.
  const base: Fascia[] =
    ingresso.exception !== null
      ? ingresso.exception.ranges.map(copia)
      : ingresso.weekly.map(copia)

  // Passo 3 di §7.1, applicato alla BASE già risolta: §6.6 dice che la
  // chiusura batte l'eccezione, che batte la settimana tipica, quindi la
  // sottrazione viene dopo la sostituzione e non prima.
  const chiusuraIntera = ingresso.closures.some((c) => c.fromBoundary === null || c.toBoundary === null)
  let ranges = base
  if (chiusuraIntera) {
    ranges = []
  } else {
    for (const chiusura of ingresso.closures) {
      ranges = ranges.flatMap((f) => sottrai(f, chiusura.fromBoundary!, chiusura.toBoundary!))
    }
  }

  // D2-6. Tre domande in quest'ordine: il salone è chiuso del tutto? il giorno
  // era già vuoto prima della chiusura? la chiusura lo ha svuotato?
  const dayStatus: StatoGiorno = chiusuraIntera
    ? 'salon_closed'
    : base.length === 0
      ? 'operator_off'
      : ranges.length === 0
        ? 'salon_closed'
        : 'open'

  return { ranges, dayStatus }
}

/**
 * Toglie `[da, a)` da una fascia. Restituisce zero, una o DUE fasce: una
 * chiusura nel mezzo di una giornata continua la spacca in due.
 */
function sottrai(f: Fascia, da: number, a: number): Fascia[] {
  if (a <= f.startBoundary || da >= f.endBoundary) return [f]
  const resto: Fascia[] = []
  if (da > f.startBoundary) resto.push({ startBoundary: f.startBoundary, endBoundary: da })
  if (a < f.endBoundary) resto.push({ startBoundary: a, endBoundary: f.endBoundary })
  return resto
}
```

- [ ] **Passo 4: eseguire le prove e verificare che passano**

```bash
npm test -- tests/dominio/fasce.test.ts
npx tsc --noEmit
```

Atteso: PASSA, 16 prove.

- [ ] **Passo 5: ⚠ Sonda di mutazione**

| # | Mutazione in `src/dominio/fasce.ts` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | in `sottrai`, togliere il secondo `push` (la coda) | *«taglia una chiusura parziale dentro una fascia, lasciandone due»* |
| 2 | in `sottrai`, togliere il primo `push` (la testa) | *«accorcia una fascia quando la chiusura ne morde solo la coda»* |
| 3 | in `sottrai`, togliere il primo guardiano `a <= f.startBoundary ||` | *«non allunga una fascia all indietro per una chiusura che sta tutta prima»* |
| 4 | togliere il ramo `chiusuraIntera ? 'salon_closed'` | *«dice salone chiuso quando la chiusura è intera, anche se l operatrice era assente»* |
| 5 | `base.length === 0 ? 'operator_off'` → `ranges.length === 0 ? 'operator_off'` | *«legge come salone chiuso una chiusura PARZIALE che svuota il giorno»* |
| 6 | scambiare i due ESITI (non le condizioni): `base.length === 0 ? 'salon_closed' : ranges.length === 0 ? 'operator_off' : 'open'` | *«legge come salone chiuso una chiusura PARZIALE che svuota il giorno»* e *«non attribuisce alla chiusura parziale un giorno che era già vuoto»* |
| 7 | sottrarre le chiusure da `ingresso.weekly` invece che da `base` | *«applica la chiusura DOPO l eccezione, non alla settimana tipica»* |

**⚠ Mutazioni EQUIVALENTI — dichiarate, NON da inseguire.** Misurate con fuzz differenziale su 200.000 ingressi legali ciascuna, zero differenze:

- in `sottrai`, `a <= f.startBoundary` → `a < f.startBoundary`. Quando `a === f.startBoundary` il ramo che cade viene ricostruito identico dai due `push`, perché `da > startBoundary` è falso e `a < endBoundary` spinge esattamente `f`. **Nessuna prova può ucciderla.** La revisione 1 la presentava come sonda e nominava *«lascia intatta una fascia che la chiusura non tocca»*, che oltre a tutto non arriva nemmeno al ramo mutato, perché il secondo congiunto corto-circuita per primo.
- in `sottrai`, `da >= f.endBoundary` → `da > f.endBoundary`. **È l'immagine speculare della precedente, ed è equivalente per lo stesso identico argomento:** quando `da === f.endBoundary` il ramo cade, `da > f.startBoundary` è vero e i due `push` ricostruiscono `f`. Misurata in modo esaustivo su 672.400 terne legali: zero differenze. ⚠︎ La revisione 2 aveva dichiarato equivalente la prima e lasciato viva la seconda, senza accorgersi che erano la stessa cosa allo specchio — dichiararne una e non la gemella è il modo tipico in cui questa classe di difetto sopravvive a una correzione.
- in `chiusuraIntera`, `||` → `&&`. Il vincolo `salon_closure_boundary_pair` della migrazione 0006 impone che i due confini siano entrambi nulli o entrambi valorizzati: una riga in cui i due operatori differiscono **non è scrivibile**, quindi la differenza non è raggiungibile dai dati veri. Il ramo resta scritto con `||` perché è la lettura difensiva giusta se un domani il vincolo cadesse.

- [ ] **Passo 6: commit**

```bash
git add src/dominio/fasce.ts tests/dominio/fasce.test.ts
git commit -m "feat(dominio): le chiusure sottraggono, e lo stato del giorno dice chi lo ha svuotato"
```

---

## Task 4: La piega delle fasce contigue

**File:**
- Modifica: `src/dominio/fasce.ts`
- Prova: `tests/dominio/fasce.test.ts` (modifica un import e aggiunge un `describe`)

**Interfacce:**
- Consuma: `risolviGiorno` del Task 3.
- Produce: `piega(fasce): Fascia[]`, esportata **per le sue prove unitarie**: nessun altro modulo di questo piano la chiama, perché la piegatura avviene dentro `risolviGiorno`. `risolviGiorno` ora restituisce fasce **ordinate e piegate**.

- [ ] **Passo 1: modificare l import e aggiungere le prove**

⚠︎ **Prima cosa, e non è un'aggiunta:** in `tests/dominio/fasce.test.ts` **sostituire** la riga

```ts
import { risolviGiorno } from '../../src/dominio/fasce'
```

con

```ts
import { piega, risolviGiorno } from '../../src/dominio/fasce'
```

Aggiungere un secondo `import` dallo stesso modulo renderebbe `risolviGiorno` un identificatore dichiarato due volte: `tsc` dà `TS2300: Duplicate identifier` ed esbuild, che è ciò che Vitest usa, **rifiuta di trasformare il file intero** — le 16 prove verdi dei Task 2 e 3 sparirebbero insieme alle nuove.

Poi aggiungere in fondo al file:

```ts
describe('la piega delle fasce contigue', () => {
  it('ordina le fasce che arrivano disordinate', () => {
    expect(
      piega([
        { startBoundary: 180, endBoundary: 228 },
        { startBoundary: 108, endBoundary: 156 },
      ]),
    ).toEqual([
      { startBoundary: 108, endBoundary: 156 },
      { startBoundary: 180, endBoundary: 228 },
    ])
  })

  // ⚠ discriminante: è l'esempio misurato di spec §7.2. 09:00–12:00 e
  // 12:00–15:00 sono due fasce legali che si TOCCANO, ed è una mattina
  // continua. Senza la piega, un massaggio da 10 celle che parte alla 140
  // (11:40) arriva alla 150 e non sta in nessuna delle due.
  it('fonde due fasce che si toccano', () => {
    expect(
      piega([
        { startBoundary: 108, endBoundary: 144 },
        { startBoundary: 144, endBoundary: 180 },
      ]),
    ).toEqual([{ startBoundary: 108, endBoundary: 180 }])
  })

  // ⚠ discriminante: TRE fasce che si toccano. È il caso che una passata a
  // coppie sbaglia e una piega azzecca. Una passata a coppie produce
  // [108,180) e [144,216), che si SOVRAPPONGONO.
  it('fonde tre fasce che si toccano in una sola, senza sovrapposizioni', () => {
    const esito = piega([
      { startBoundary: 108, endBoundary: 144 },
      { startBoundary: 144, endBoundary: 180 },
      { startBoundary: 180, endBoundary: 216 },
    ])
    expect(esito).toEqual([{ startBoundary: 108, endBoundary: 216 }])
    expect(esito).toHaveLength(1)
  })

  // ⚠ discriminante: la piega usa max(fine), non la fine dell'ultima letta.
  // Qui la seconda fascia è INTERAMENTE dentro la prima: prendere la sua fine
  // accorcerebbe il risultato da 228 a 150.
  it('usa il massimo delle fini quando una fascia è contenuta nell altra', () => {
    expect(
      piega([
        { startBoundary: 108, endBoundary: 228 },
        { startBoundary: 120, endBoundary: 150 },
      ]),
    ).toEqual([{ startBoundary: 108, endBoundary: 228 }])
  })

  it('lascia separata una vera pausa pranzo', () => {
    expect(
      piega([
        { startBoundary: 108, endBoundary: 156 },
        { startBoundary: 180, endBoundary: 228 },
      ]),
    ).toEqual([
      { startBoundary: 108, endBoundary: 156 },
      { startBoundary: 180, endBoundary: 228 },
    ])
  })

  it('non cambia niente su zero o una fascia', () => {
    expect(piega([])).toEqual([])
    expect(piega([{ startBoundary: 108, endBoundary: 156 }])).toEqual([
      { startBoundary: 108, endBoundary: 156 },
    ])
  })

  // ⚠ discriminante: la piega non deve restituire gli OGGETTI che ha ricevuto.
  // È la seconda metà della garanzia contro l'aliasing del Task 2: lì la
  // copiava `risolviGiorno`, qui l'array viene ricostruito da `piega`, e senza
  // `copia` gli oggetti tornerebbero a essere condivisi.
  it('non restituisce gli oggetti che le sono stati passati', () => {
    const dentro = [{ startBoundary: 108, endBoundary: 156 }]
    const fuori = piega(dentro)
    ;(fuori[0] as { endBoundary: number }).endBoundary = 999
    expect(dentro[0].endBoundary).toBe(156)
  })

  it('restituisce fasce piegate da risolviGiorno', () => {
    const esito = risolviGiorno({
      weekly: [
        { startBoundary: 144, endBoundary: 180 },
        { startBoundary: 108, endBoundary: 144 },
      ],
      exception: null,
      closures: [],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 180 }])
  })
})
```

- [ ] **Passo 2: eseguirle e verificare che falliscono**

```bash
npm test -- tests/dominio/fasce.test.ts
```

Atteso: FALLISCE — `piega` non esiste, quindi il file non risolve l'import.

Scritta una `piega` che non fa niente (l'identità), **falliscono sei prove delle otto nuove**, misurato: *«ordina le fasce che arrivano disordinate»*, *«fonde due fasce che si toccano»*, *«fonde tre fasce…»*, *«usa il massimo delle fini…»*, *«non restituisce gli oggetti che le sono stati passati»* e *«restituisce fasce piegate da risolviGiorno»*. Restano verdi *«lascia separata una vera pausa pranzo»* e *«non cambia niente su zero o una fascia»*, che sono i casi in cui l'identità è già la risposta giusta.

- [ ] **Passo 3: scrivere la piega e innestarla**

In `src/dominio/fasce.ts`, aggiungere:

```ts
/**
 * Passo 4 di §7.1. Ordina per inizio e PIEGA: finché `fine_prec >= inizio_succ`
 * le due fasce diventano `[inizio_prec, max(fine_prec, fine_succ))`.
 *
 * È una piega (una riduzione sull'accumulatore), NON una passata a coppie: su
 * tre fasce che si toccano, una passata a coppie produce fasce che si
 * sovrappongono fra loro.
 *
 * `>=` e non `>`: due fasce che si TOCCANO — 09:00–12:00 e 12:00–15:00 — sono
 * una mattina continua, ed è il caso per cui questo passo esiste (§7.2).
 *
 * `max(fine)` e non «la fine dell'ultima letta»: una fascia interamente
 * contenuta in quella prima di lei accorcerebbe il risultato.
 */
export function piega(fasce: readonly Fascia[]): Fascia[] {
  const ordinate = [...fasce].sort((a, b) => a.startBoundary - b.startBoundary)
  return ordinate.reduce<Fascia[]>((piegate, f) => {
    const ultima = piegate[piegate.length - 1]
    if (ultima !== undefined && ultima.endBoundary >= f.startBoundary) {
      piegate[piegate.length - 1] = {
        startBoundary: ultima.startBoundary,
        endBoundary: Math.max(ultima.endBoundary, f.endBoundary),
      }
      return piegate
    }
    piegate.push(copia(f))
    return piegate
  }, [])
}
```

e, in `risolviGiorno`, sostituire il `return { ranges, dayStatus }` finale con:

```ts
  return { ranges: piega(ranges), dayStatus }
```

⚠︎ Il calcolo di `dayStatus` resta **prima** della piega e non cambia: la piega non può creare né distruggere fasce vuote.

⚠︎ **L'ordine fra il passo 3 e il passo 4 non è osservabile.** Piegare prima di sottrarre dà lo stesso insieme di celle su ogni ingresso legale — la sottrazione distribuisce sull'unione, e una chiusura ha `to_boundary > from_boundary`, quindi non può creare fasce contigue. Due revisori l'hanno misurato indipendentemente con 200.000 ingressi di fuzz ciascuno. L'ordine scritto qui segue §7.1 per leggibilità, **non** perché una prova lo difenda: non esiste una prova che possa difenderlo, e la revisione 1 ne conteneva una che non poteva fallire.

- [ ] **Passo 4: eseguire le prove e verificare che passano**

```bash
npm test -- tests/dominio/fasce.test.ts
```

Atteso: PASSA, 24 prove.

- [ ] **Passo 5: ⚠ Sonda di mutazione**

| # | Mutazione in `src/dominio/fasce.ts` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | `ultima.endBoundary >= f.startBoundary` → `>` | *«fonde due fasce che si toccano»* |
| 2 | `Math.max(ultima.endBoundary, f.endBoundary)` → `f.endBoundary` | *«usa il massimo delle fini quando una fascia è contenuta nell altra»* |
| 3 | togliere il `.sort(...)` | *«ordina le fasce che arrivano disordinate»* |
| 4 | sostituire la riduzione con una passata a coppie che confronta solo elementi adiacenti dell'array originale e concatena i risultati | *«fonde tre fasce che si toccano in una sola, senza sovrapposizioni»* |
| 5 | `piegate.push(copia(f))` → `piegate.push(f)` | *«non restituisce gli oggetti che le sono stati passati»* |
| 6 | rieseguire la sonda 3 del Task 2 (`.map(copia)` → `.slice()`) | **nessuna — da questo task in poi è EQUIVALENTE.** `piega` fa `piegate.push(copia(f))`, quindi ogni oggetto in uscita è nuovo a prescindere da `.map(copia)`. La garanzia contro l'aliasing non è sparita: si è **spostata**, dalla sonda 3 del Task 2 alla sonda 5 di questo. Si riesegue una volta per vedere con i propri occhi che il presidio ha cambiato casa, non per aspettarsi un rosso |

La mutazione 4 è quella che il piano esiste per rendere impossibile: se resta verde, *«fonde tre fasce…»* non discrimina e va riscritta.

- [ ] **Passo 6: commit**

```bash
git add src/dominio/fasce.ts tests/dominio/fasce.test.ts
git commit -m "feat(dominio): la piega delle fasce contigue, con max(fine) e non a coppie"
```

---
## Task 5: Il contratto di `proposeStarts`, lo stato del giorno e i quattro motivi

**File:**
- Crea: `src/dominio/proposte.ts`
- Prova: `tests/dominio/proposte.test.ts`

**Interfacce:**
- Consuma: `Blocco`, `Fascia`, `MotivoAssenza`, `StatoGiorno` da `src/dominio/tipi`; `blocco` da `src/dominio/tempo`.
- Produce: `proposeStarts(ingresso: IngressoProposta): EsitoProposta`, con `IngressoProposta` esattamente nella forma di spec §7.4 e `EsitoProposta = { starts: IndiceCella[]; reason: MotivoAssenza | null }`; `campataOccupata(durations, buffers): number`. In questo task la funzione risponde ai casi di vuoto e restituisce `starts: []` con `reason: 'full'` in tutti gli altri: le partenze le calcola il Task 6.

- [ ] **Passo 1: scrivere le prove che falliscono**

`tests/dominio/proposte.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { proposeStarts } from '../../src/dominio/proposte'
import type { IngressoProposta } from '../../src/dominio/proposte'

const GIORNATA = { startBoundary: 108, endBoundary: 228 } // 09:00–19:00

function ingresso(sopra: Partial<IngressoProposta> = {}): IngressoProposta {
  return {
    date: '2026-03-12',
    ranges: [GIORNATA],
    occupancy: [],
    durations: [18],
    buffers: [0],
    nowCell: null,
    excludeAppointmentIds: [],
    dayStatus: 'open',
    ...sopra,
  }
}

describe('proposeStarts — i quattro motivi', () => {
  // ⚠ discriminante: spec §7.4 dice che la distinzione fra «salone chiuso» e
  // «l operatrice non lavora quel giorno» NON si recupera dalle fasce, perché
  // §7.1 le ha già ridotte entrambe alla stessa lista vuota. Le due prove qui
  // hanno fasce identiche e devono dare motivi diversi.
  it('dice salone chiuso quando lo stato lo dice', () => {
    const esito = proposeStarts(ingresso({ ranges: [], dayStatus: 'salon_closed' }))
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('salon_closed')
  })

  it('dice operatrice assente quando lo stato lo dice', () => {
    const esito = proposeStarts(ingresso({ ranges: [], dayStatus: 'operator_off' }))
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('operator_off')
  })

  // ⚠ discriminante: lo stato batte le fasce. Qui il salone è chiuso ma le
  // fasce sono piene: se la funzione guardasse le fasce invece dello stato,
  // proporrebbe orari dentro un salone chiuso.
  it('non propone niente in un giorno chiuso, anche con le fasce piene', () => {
    const esito = proposeStarts(ingresso({ ranges: [GIORNATA], dayStatus: 'salon_closed' }))
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('salon_closed')
  })

  // ⚠ discriminante: D2-5. Fasce vuote con stato aperto è un ingresso
  // incoerente, e la risposta è operatrice assente — non un motivo che
  // accuserebbe il servizio di essere troppo lungo.
  it('tratta fasce vuote come operatrice assente anche se lo stato dice aperto', () => {
    const esito = proposeStarts(ingresso({ ranges: [], dayStatus: 'open' }))
    expect(esito.reason).toBe('operator_off')
  })

  // ⚠ discriminante: il servizio più lungo di QUALUNQUE fascia è un motivo
  // diverso da «pieno», perché al telefono è una frase diversa: estendere
  // l orizzonte non servirà mai. La giornata qui è spezzata in due tronconi da
  // 36 celle e il servizio ne chiede 37.
  it('dice che il servizio è più lungo di qualunque fascia', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [
          { startBoundary: 108, endBoundary: 144 },
          { startBoundary: 180, endBoundary: 216 },
        ],
        durations: [37],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('service_too_long')
  })

  it('non dice troppo lungo quando il servizio sta esattamente nella fascia', () => {
    const esito = proposeStarts(
      ingresso({ ranges: [{ startBoundary: 108, endBoundary: 144 }], durations: [36], buffers: [0] }),
    )
    expect(esito.reason).not.toBe('service_too_long')
  })

  // ⚠ discriminante: «più lungo di QUALUNQUE fascia» vuol dire confrontarsi
  // con la PIÙ LUNGA, non con la prima. Qui il pomeriggio è più lungo della
  // mattina e il servizio sta solo lì: guardando `ranges[0]` la funzione
  // direbbe «troppo lungo» su un servizio che ci sta. Senza fasce di lunghezza
  // DIVERSA questa differenza non è osservabile, e ogni altra prova del piano
  // usa fasce lunghe uguali.
  it('confronta il servizio con la fascia più lunga, non con la prima', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [
          { startBoundary: 108, endBoundary: 120 }, // 12 celle
          { startBoundary: 150, endBoundary: 198 }, // 48 celle
        ],
        durations: [24],
        buffers: [0],
      }),
    )
    expect(esito.reason).not.toBe('service_too_long')
  })

  it('rifiuta durate e pause di lunghezza diversa', () => {
    expect(() => proposeStarts(ingresso({ durations: [18, 10], buffers: [0] }))).toThrow(RangeError)
    expect(() => proposeStarts(ingresso({ durations: [], buffers: [] }))).toThrow(RangeError)
  })
})
```

- [ ] **Passo 2: eseguirle e verificare che falliscono**

```bash
npm test -- tests/dominio/proposte.test.ts
```

Atteso: FALLISCE — `Failed to resolve import "../../src/dominio/proposte"`.

- [ ] **Passo 3: scrivere il contratto e i motivi**

`src/dominio/proposte.ts`:

```ts
// La proposta degli orari d'inizio. Spec §7.3 e §7.4.

import type { Blocco, Fascia, IndiceCella, MotivoAssenza, StatoGiorno } from './tipi'

/**
 * Il contratto di spec §7.4, alla lettera. I nomi dei campi sono congelati
 * dalla spec e restano in inglese.
 *
 * `occupancy` porta BLOCCHI e non celle nude, perché la regola del riassetto
 * (§7.3) ha bisogno della pausa dell'appuntamento che PRECEDE.
 *
 * `excludeAppointmentIds` è una LISTA, perché §8.6 sposta una visita intera:
 * con un solo identificativo, gli altri appuntamenti della visita continuano a
 * leggersi come occupati e lo spostamento non viene nemmeno proposto.
 *
 * `nowCell` è nullo tranne quando `date` è oggi. La funzione non legge
 * l'orologio: l'ora entra come argomento e la funzione resta pura.
 *
 * `dayStatus` va passato dentro perché §7.1 ha già ridotto «salone chiuso» e
 * «operatrice assente» alla stessa lista vuota: la distinzione non si recupera.
 *
 * `date` è nel contratto e questa funzione NON lo legge (D2-12): resta perché
 * il contratto di §7.4 è congelato, ed è `cercaPosti` a riattaccare la data ai
 * risultati. Non toglierlo credendo di ripulire.
 */
export interface IngressoProposta {
  readonly date: string
  readonly ranges: readonly Fascia[]
  readonly occupancy: readonly Blocco[]
  readonly durations: readonly number[]
  readonly buffers: readonly number[]
  readonly nowCell: IndiceCella | null
  readonly excludeAppointmentIds: readonly string[]
  readonly dayStatus: StatoGiorno
}

export interface EsitoProposta {
  readonly starts: IndiceCella[]
  /** `null` quando `starts` non è vuoto (D2-2). */
  readonly reason: MotivoAssenza | null
}

export function proposeStarts(ingresso: IngressoProposta): EsitoProposta {
  if (ingresso.durations.length === 0 || ingresso.durations.length !== ingresso.buffers.length) {
    throw new RangeError(
      `durations e buffers devono avere la stessa lunghezza, non vuota: ${ingresso.durations.length} e ${ingresso.buffers.length}`,
    )
  }

  // Lo STATO batte le fasce: proporre dentro un giorno chiuso perché le fasce
  // sono piene farebbe sembrare aperto ogni giorno chiuso (§8.3).
  if (ingresso.dayStatus === 'salon_closed') return { starts: [], reason: 'salon_closed' }
  // D2-5: fasce vuote con stato aperto è un ingresso incoerente, e la risposta
  // meno bugiarda è «assente», non un'accusa alla durata del servizio.
  if (ingresso.dayStatus === 'operator_off' || ingresso.ranges.length === 0) {
    return { starts: [], reason: 'operator_off' }
  }

  const campata = campataOccupata(ingresso.durations, ingresso.buffers)
  // La PIÙ LUNGA, non la prima: «più lungo di qualunque fascia» è un
  // confronto con il massimo.
  const fasciaPiuLunga = Math.max(...ingresso.ranges.map((f) => f.endBoundary - f.startBoundary))
  if (campata > fasciaPiuLunga) return { starts: [], reason: 'service_too_long' }

  return { starts: [], reason: 'full' }
}

/**
 * La campata che la visita OCCUPA: la somma delle durate più le pause FRA un
 * servizio e il successivo (D2-3). La pausa dell'ULTIMO servizio non è dentro
 * la campata: è la distanza pretesa verso l'appuntamento che segue, e la usa
 * la regola del riassetto.
 */
export function campataOccupata(durations: readonly number[], buffers: readonly number[]): number {
  return durations.reduce(
    (totale, durata, i) => totale + durata + (i < durations.length - 1 ? buffers[i] : 0),
    0,
  )
}
```

- [ ] **Passo 4: eseguire le prove e verificare che passano**

```bash
npm test -- tests/dominio/proposte.test.ts
```

Atteso: PASSA, 8 prove.

- [ ] **Passo 5: ⚠ Sonda di mutazione**

| # | Mutazione in `src/dominio/proposte.ts` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | fondere i due rami di stato in `if (ranges.length === 0) return { starts: [], reason: 'salon_closed' }` | *«dice operatrice assente quando lo stato lo dice»* |
| 2 | togliere il controllo su `dayStatus === 'salon_closed'` e decidere dalle fasce | *«non propone niente in un giorno chiuso, anche con le fasce piene»* |
| 3 | `campata > fasciaPiuLunga` → `campata >= fasciaPiuLunga` | *«non dice troppo lungo quando il servizio sta esattamente nella fascia»* *(ampia)* |
| 4 | `ingresso.ranges.length === 0` → togliere la condizione | *«tratta fasce vuote come operatrice assente anche se lo stato dice aperto»* |
| 5 | `Math.max(...ranges.map(…))` → `ranges[0].endBoundary - ranges[0].startBoundary` | *«confronta il servizio con la fascia più lunga, non con la prima»* |

- [ ] **Passo 6: commit**

```bash
git add src/dominio/proposte.ts tests/dominio/proposte.test.ts
git commit -m "feat(dominio): il contratto di proposeStarts e i quattro codici di motivo"
```

---

## Task 6: Le partenze dentro una fascia, e l'occupazione

**File:**
- Modifica: `src/dominio/proposte.ts`
- Prova: `tests/dominio/proposte.test.ts` (aggiunge un `describe`)

**Interfacce:**
- Consuma: `proposeStarts` del Task 5, `blocco` da `src/dominio/tempo`.
- Produce: la stessa firma, che ora enumera le partenze. Le pause di riassetto restano ignorate fino al Task 7.

- [ ] **Passo 1: scrivere le prove che falliscono**

Aggiungere a `tests/dominio/proposte.test.ts`:

```ts
import { blocco } from '../../src/dominio/tempo'

describe('proposeStarts — le partenze dentro una fascia', () => {
  it('propone ogni cella da cui il servizio ci sta, e nessuna oltre', () => {
    const esito = proposeStarts(
      ingresso({ ranges: [{ startBoundary: 108, endBoundary: 114 }], durations: [4], buffers: [0] }),
    )
    expect(esito.starts).toEqual([108, 109, 110])
    expect(esito.reason).toBeNull()
  })

  // ⚠ discriminante: D2-2. Con proposte valide non esiste alcun motivo.
  it('non dà alcun motivo quando ci sono proposte', () => {
    expect(proposeStarts(ingresso()).reason).toBeNull()
  })

  // ⚠ discriminante: è la regola di §5 sul confine di FINE, esclusa.
  // Una fascia [108, 114) accoglie un servizio da 6 celle che parte alla 108 e
  // finisce alla 113 inclusa; da 109 non ci starebbe.
  it('accetta il servizio che finisce esattamente sull ultimo confine', () => {
    const esito = proposeStarts(
      ingresso({ ranges: [{ startBoundary: 108, endBoundary: 114 }], durations: [6], buffers: [0] }),
    )
    expect(esito.starts).toEqual([108])
  })

  it('non propone partenze a cavallo di due fasce separate', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [
          { startBoundary: 108, endBoundary: 114 },
          { startBoundary: 120, endBoundary: 126 },
        ],
        durations: [4],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([108, 109, 110, 120, 121, 122])
  })

  // ⚠ discriminante: è l'esempio misurato di §7.2, che chiude il cerchio con
  // la piega del Task 4. Un massaggio da 10 celle nella mattina PIEGATA
  // [108, 180) può partire dalla 135 alla 143 — 11:15–11:55 — che sono
  // esattamente le partenze che due fasce non piegate rifiuterebbero.
  it('propone le partenze da 11:15 a 11:55 su una mattina piegata', () => {
    const esito = proposeStarts(
      ingresso({ ranges: [{ startBoundary: 108, endBoundary: 180 }], durations: [10], buffers: [0] }),
    )
    expect(esito.starts).toContain(135)
    expect(esito.starts).toContain(143)
    expect(esito.starts).toContain(140)
  })

  // ⚠ discriminante: l'ULTIMA cella del blocco è occupata (D2-1). Un blocco
  // 120–137 lascia libera la 138: se endCell fosse esclusivo, la 137 sarebbe
  // proposta e questa prova la vedrebbe.
  it('non propone una partenza sopra un appuntamento esistente', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('a1', 120, 18, 0)],
        durations: [1],
        buffers: [0],
      }),
    )
    expect(esito.starts).toContain(119)
    expect(esito.starts).not.toContain(120)
    expect(esito.starts).not.toContain(137)
    expect(esito.starts).toContain(138)
  })

  it('non propone una partenza che attraverserebbe un appuntamento più avanti', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('a1', 120, 18, 0)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toContain(114)
    expect(esito.starts).not.toContain(115)
    expect(esito.starts).toContain(138)
  })

  it('dice pieno quando l occupazione non lascia alcuna partenza', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 126 }],
        occupancy: [blocco('a1', 108, 18, 0)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('full')
  })

  it('restituisce le partenze in ordine crescente anche con le fasce disordinate', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [
          { startBoundary: 120, endBoundary: 126 },
          { startBoundary: 108, endBoundary: 114 },
        ],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([108, 120])
  })
})
```

- [ ] **Passo 2: eseguirle e verificare che falliscono**

```bash
npm test -- tests/dominio/proposte.test.ts
```

Atteso: FALLISCE — **otto delle nove prove nuove**, perché `starts` è ancora sempre vuoto. La nona, *«dice pieno quando l occupazione non lascia alcuna partenza»*, **passa già**: il Task 5 restituisce per costruzione `{ starts: [], reason: 'full' }` in quel caso, quindi quella prova misura il contorno e non il cambiamento. Verifica il conteggio invece di fidarti di questa riga.

- [ ] **Passo 3: enumerare le partenze**

In `src/dominio/proposte.ts`, sostituire il `return { starts: [], reason: 'full' }` finale con:

```ts
  // Gli appuntamenti che si stanno spostando non occupano: §8.6 sposta una
  // visita intera, e senza l'esclusione le sue stesse celle bloccherebbero
  // ogni partenza dentro la propria durata.
  const occupati = ingresso.occupancy.filter(
    (b) => !ingresso.excludeAppointmentIds.includes(b.appointmentId),
  )

  // Le fasce si scorrono ORDINATE, così le partenze escono crescenti senza
  // riordinarle dopo: riordinarle nasconderebbe un chiamante che passa fasce
  // non piegate.
  const fasce = [...ingresso.ranges].sort((a, b) => a.startBoundary - b.startBoundary)

  const starts: IndiceCella[] = []
  for (const fascia of fasce) {
    // `inizio + campata <= endBoundary` è la regola di §5: un indice di cella
    // e un indice di confine non si confrontano mai direttamente.
    for (let inizio = fascia.startBoundary; inizio + campata <= fascia.endBoundary; inizio++) {
      if (!celleLibere(occupati, inizio, campata)) continue
      starts.push(inizio)
    }
  }

  return starts.length > 0 ? { starts, reason: null } : { starts: [], reason: 'full' }
}

/**
 * Nessun blocco occupato tocca `[inizio, inizio + campata)`. `endCell` è
 * l'ultima cella OCCUPATA (D2-1), quindi il confronto è `b.endCell < inizio`.
 */
function celleLibere(occupati: readonly Blocco[], inizio: IndiceCella, campata: number): boolean {
  const ultimaProposta = inizio + campata - 1
  return occupati.every((b) => b.endCell < inizio || b.startCell > ultimaProposta)
}
```

- [ ] **Passo 4: eseguire le prove e verificare che passano**

```bash
npm test -- tests/dominio/proposte.test.ts
npx tsc --noEmit
```

Atteso: PASSA, 17 prove.

- [ ] **Passo 5: ⚠ Sonda di mutazione**

| # | Mutazione in `src/dominio/proposte.ts` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | `inizio + campata <= fascia.endBoundary` → `<` | *«accetta il servizio che finisce esattamente sull ultimo confine»* *(ampia)* |
| 2 | `inizio + campata <= fascia.endBoundary` → `inizio <= fascia.endBoundary` | *«propone ogni cella da cui il servizio ci sta, e nessuna oltre»* *(ampia: spegne l'enumerazione intera e ne uccide otto)* |
| 3 | in `celleLibere`, `b.endCell < inizio` → `b.endCell <= inizio` | *«non propone una partenza sopra un appuntamento esistente»* |
| 4 | in `celleLibere`, `b.startCell > ultimaProposta` → `b.startCell >= ultimaProposta` | *«non propone una partenza che attraverserebbe un appuntamento più avanti»* |
| 5 | togliere il `.sort(...)` sulle fasce | *«restituisce le partenze in ordine crescente anche con le fasce disordinate»* |
| 6 | `reason: null` → `reason: 'full'` quando ci sono partenze | *«non dà alcun motivo quando ci sono proposte»* |

- [ ] **Passo 6: commit**

```bash
git add src/dominio/proposte.ts tests/dominio/proposte.test.ts
git commit -m "feat(dominio): le partenze dentro una fascia, con l occupazione che le taglia"
```

---

## Task 7: Il tempo di riassetto, simmetrico e sul vicino

**File:**
- Modifica: `src/dominio/proposte.ts`
- Prova: `tests/dominio/proposte.test.ts` (aggiunge un `describe`)

**Interfacce:**
- Consuma: `proposeStarts` del Task 6.
- Produce: la stessa firma, che ora onora **entrambe** le metà della regola di §7.3, guardando **l'appuntamento più vicino** da ciascun lato (D2-9).

**Perché questo task è a sé.** Spec §7.3 dice che la regola è simmetrica e che **ogni revisione precedente ne aveva una metà**: la revisione 2 della spec onorava solo la pausa del servizio proposto e solo quando qualcosa seguiva; la revisione 3 solo quella dell'appuntamento precedente. Le prove discriminanti qui sotto sono una per metà, e nessuna delle due da sola avrebbe scoperto l'altra. La revisione 1 di *questo* piano ha aggiunto un terzo modo di sbagliare: applicare la pausa di **ogni** blocco precedente invece che del più vicino.

- [ ] **Passo 1: scrivere le prove che falliscono**

Aggiungere a `tests/dominio/proposte.test.ts`:

```ts
describe('proposeStarts — il tempo di riassetto è simmetrico', () => {
  // ⚠ discriminante: la metà che la revisione 2 della spec aveva perso. Un
  // massaggio di Alessandra finisce alle 11:00 — celle 122–131, con l ultima
  // alla 131 — e porta una pausa di 3 celle (15 minuti). Una ceretta proposta
  // alle 11:00 (cella 132) le starebbe attaccata. La prima partenza legittima
  // è la 135, cioè le 11:15. NIENTE SEGUE: la revisione 2 applicava la regola
  // solo quando c era un appuntamento dopo, e qui sarebbe verde a torto.
  it('onora la pausa dell appuntamento PRECEDENTE anche quando non segue niente', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('massaggio', 122, 10, 3)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).not.toContain(132)
    expect(esito.starts).not.toContain(134)
    expect(esito.starts).toContain(135)
  })

  // ⚠ discriminante: la metà che la revisione 3 della spec aveva perso. Qui
  // NIENTE PRECEDE: una ceretta con pausa propria di 3 celle viene proposta
  // alle 11:00 e una manicure è già prenotata alle 11:30 (cella 138). La
  // ceretta da 6 celle occuperebbe 132–137 e non lascerebbe riassetto. La
  // partenza più tarda compatibile è la 129.
  it('onora la pausa PROPRIA del servizio proposto anche quando non precede niente', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('manicure', 138, 18, 0)],
        durations: [6],
        buffers: [3],
      }),
    )
    expect(esito.starts).not.toContain(132)
    expect(esito.starts).not.toContain(130)
    expect(esito.starts).toContain(129)
  })

  // ⚠ discriminante: le due metà INSIEME, con pause DIVERSE, e sull elenco
  // INTERO invece che con toContain.
  //
  // Fascia [108, 180). `prima` occupa 108–119 con pausa 3; `dopo` occupa
  // 140–151 con pausa 0; il servizio dura 6 celle e ha pausa propria 2.
  //   - libere: 120–134 e 152–174
  //   - dopo `prima`: 123 <= inizio
  //   - prima di `dopo`: inizio + 5 + 1 + 2 <= 140, cioè inizio <= 132
  //   - dalla 152 in poi chi precede è `dopo`, che ha pausa 0, e non segue
  //     più niente: tutto il pomeriggio è legittimo
  // Una sola condizione che usasse `Math.max(pausa_del_precedente, pausa
  // propria)` darebbe [123..132] e poi 154..174, non 152: è il motivo per cui
  // l elenco va asserito per intero.
  it('onora tutte e due le pause quando c è qualcosa prima e qualcosa dopo', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('prima', 108, 12, 3), blocco('dopo', 140, 12, 0)],
        durations: [6],
        buffers: [2],
      }),
    )
    const attese = [
      123, 124, 125, 126, 127, 128, 129, 130, 131, 132,
      152, 153, 154, 155, 156, 157, 158, 159, 160, 161,
      162, 163, 164, 165, 166, 167, 168, 169, 170, 171,
      172, 173, 174,
    ]
    expect(esito.starts).toEqual(attese)
  })

  // ⚠ discriminante: D2-9. `lungo` occupa 09:00–10:00 e pretende un ora di
  // riassetto; `corto` è prenotato SUBITO DOPO, dalle 10:00 alle 10:30, e non
  // pretende niente — è scrivibile toccando una cella spenta, che §7.3
  // dichiara legale. Alle 10:30 (cella 126) si PUÒ proporre, perché chi
  // precede è `corto`. Applicando la pausa di OGNI blocco precedente la prima
  // partenza slitterebbe alla 132, cioè le 11:00, nascondendo mezz ora libera.
  it('guarda solo l appuntamento PIÙ VICINO, non tutti quelli prima', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('lungo', 108, 12, 12), blocco('corto', 120, 6, 0)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts[0]).toBe(126)
    expect(esito.starts).toContain(126)
    expect(esito.starts).toContain(131)
  })

  it('accetta una pausa nulla come nessuna pausa', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('prima', 108, 12, 0)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toContain(120)
  })

  // ⚠ discriminante: la pausa NON è occupazione (commento della migrazione
  // 0002: «advisory: applied when proposing, never as occupancy»). Se lo
  // fosse, la fascia libera prima dell appuntamento si accorcerebbe anche
  // all indietro e questa partenza sparirebbe.
  it('non tratta la pausa come occupazione all indietro', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('dopo', 138, 12, 9)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toContain(132)
  })

  it('dice pieno quando le sole partenze possibili cadono per il riassetto', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 120 }],
        occupancy: [blocco('prima', 108, 6, 3)],
        durations: [6],
        buffers: [0],
      }),
    )
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('full')
  })
})
```

- [ ] **Passo 2: eseguirle e verificare che falliscono**

```bash
npm test -- tests/dominio/proposte.test.ts
```

Atteso: FALLISCONO **quattro** delle sette prove nuove — le prime **tre** e *«dice pieno quando le sole partenze possibili cadono per il riassetto»*.

Restano verdi tre prove, e vale la pena sapere perché: *«accetta una pausa nulla come nessuna pausa»* e *«non tratta la pausa come occupazione all indietro»* sono lì per NON diventare rosse quando il riassetto entra in scena; *«guarda solo l appuntamento PIÙ VICINO, non tutti quelli prima»* è già verde perché **senza alcuna regola di riassetto** la prima cella libera dopo `corto` è comunque la 126. Quella prova non misura l'arrivo del riassetto, misura **quale** regola di riassetto: la uccide la sonda 7, non l'assenza della funzione.

- [ ] **Passo 3: scrivere la regola simmetrica**

In `src/dominio/proposte.ts`, dentro il ciclo, aggiungere il controllo dopo `celleLibere`:

```ts
      if (!celleLibere(occupati, inizio, campata)) continue
      if (!riassettoRispettato(occupati, inizio, campata, codaPropria)) continue
      starts.push(inizio)
```

e, prima del ciclo, ricavare la pausa propria:

```ts
  // La pausa dell'ULTIMO servizio della visita: è la distanza pretesa verso
  // l'appuntamento che segue (D2-3).
  const codaPropria = ingresso.buffers[ingresso.buffers.length - 1]
```

e aggiungere la funzione:

```ts
/**
 * §7.3: una partenza è proponibile solo se è LIBERA DAL RIASSETTO A ENTRAMBI I
 * CAPI — dopo l'appuntamento che precede, della pausa di QUELL'appuntamento; e
 * prima di quello che segue, della pausa PROPRIA del servizio proposto.
 *
 * La regola è simmetrica, e ogni revisione della spec ne aveva una metà: la 2
 * onorava solo la coda propria e solo quando qualcosa seguiva, la 3 solo
 * quella dell'appuntamento precedente. Le due metà sono scritte qui come due
 * condizioni distinte, apposta.
 *
 * «L'appuntamento che precede» è IL PIÙ VICINO, non tutti quelli prima
 * (D2-9): se una visita lunga con un'ora di riassetto è seguita subito da una
 * breve senza pausa — scrivibile per la via esplicita di §8.1 — la pausa della
 * prima è già stata consumata, e pretenderla di nuovo dopo la seconda
 * nasconderebbe un posto libero che esiste.
 *
 * `endCell` è inclusiva (D2-1), quindi le celle libere fra un blocco che
 * finisce alla `endCell` e una proposta che parte a `inizio` sono
 * `inizio - endCell - 1`.
 */
function riassettoRispettato(
  occupati: readonly Blocco[],
  inizio: IndiceCella,
  campata: number,
  codaPropria: number,
): boolean {
  const ultimaProposta = inizio + campata - 1

  let precedente: Blocco | null = null
  let seguente: Blocco | null = null
  for (const b of occupati) {
    if (b.endCell < inizio && (precedente === null || b.endCell > precedente.endCell)) {
      precedente = b
    }
    if (b.startCell > ultimaProposta && (seguente === null || b.startCell < seguente.startCell)) {
      seguente = b
    }
  }

  if (precedente !== null && inizio - precedente.endCell - 1 < precedente.bufferAfterCells) {
    return false
  }
  if (seguente !== null && seguente.startCell - ultimaProposta - 1 < codaPropria) {
    return false
  }
  return true
}
```

⚠︎ Non fondere le due condizioni in una sola: una sola condizione che usa `Math.max(precedente.bufferAfterCells, codaPropria)` dà la risposta giusta su parecchi esempi e quella sbagliata quando le due pause differiscono, ed è precisamente l'errore che la prova *«onora tutte e due le pause»* esiste per cogliere — motivo per cui quella prova asserisce l'elenco **intero** e non con `toContain`.

- [ ] **Passo 4: eseguire le prove e verificare che passano**

```bash
npm test -- tests/dominio/proposte.test.ts
```

Atteso: PASSA, 24 prove.

- [ ] **Passo 5: ⚠ Sonda di mutazione**

| # | Mutazione in `src/dominio/proposte.ts` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | togliere il controllo su `precedente` (la pausa di chi precede) | *«onora la pausa dell appuntamento PRECEDENTE anche quando non segue niente»* |
| 2 | togliere il controllo su `seguente` (la coda propria) | *«onora la pausa PROPRIA del servizio proposto anche quando non precede niente»* |
| 3 | usare `precedente.bufferAfterCells` in entrambi i controlli | *«onora la pausa PROPRIA del servizio proposto…»* |
| 4 | usare `codaPropria` in entrambi i controlli | *«onora la pausa dell appuntamento PRECEDENTE…»* |
| 5 | fondere le due in una sola con `Math.max(precedente.bufferAfterCells, codaPropria)` applicata a ogni blocco | *«onora tutte e due le pause quando c è qualcosa prima e qualcosa dopo»* — misurato: produce `[123..132, 154..174]` invece di `[123..132, 152..174]` |
| 6 | `inizio - precedente.endCell - 1` → `inizio - precedente.endCell` | *«onora la pausa dell appuntamento PRECEDENTE…»* |
| 7 | tornare al ciclo su TUTTI i blocchi invece che sul più vicino, per il solo lato del precedente | *«guarda solo l appuntamento PIÙ VICINO, non tutti quelli prima»* |
| 8 | `b.endCell > precedente.endCell` → `<` (sceglie il più lontano invece del più vicino) | *«guarda solo l appuntamento PIÙ VICINO, non tutti quelli prima»* |

Le mutazioni 3 e 4 sono le due revisioni storiche della spec riprodotte; la 7 e la 8 sono la revisione 1 di questo piano. Se una delle quattro resta verde, quella metà della regola non è misurata.

⚠︎ **Nota sul lato del seguente:** cercare il blocco che segue *più vicino* invece di scorrerli tutti è, per quel lato soltanto, una **mutazione equivalente** — la coda pretesa è la stessa per ogni blocco (`codaPropria` è una costante), quindi il più vicino è sempre il vincolo che lega. È scritto simmetricamente perché la simmetria è la regola, non perché una prova la difenda.

- [ ] **Passo 6: commit**

```bash
git add src/dominio/proposte.ts tests/dominio/proposte.test.ts
git commit -m "feat(dominio): il tempo di riassetto, onorato a tutti e due i capi sul vicino"
```

---
## Task 8: La visita multiservizio

**File:**
- Modifica: `src/dominio/proposte.ts` (nessuna, se il Task 5 ha scritto `campataOccupata` come prescritto)
- Prova: `tests/dominio/proposte.test.ts` (aggiunge un `describe`)

**Interfacce:**
- Consuma: `proposeStarts` e `campataOccupata` dei Task 5–7.
- Produce: nessuna interfaccia nuova. Questo task **misura** D2-3 e D2-4, che i task precedenti hanno scritto ma non hanno mai esercitato con più di un servizio.

⚠︎ Se una di queste prove è rossa, la correzione sta in `campataOccupata` o in `celleLibere`, non in una funzione nuova.

- [ ] **Passo 1: scrivere le prove**

Aggiungere a `tests/dominio/proposte.test.ts`:

```ts
import { campataOccupata } from '../../src/dominio/proposte'

describe('proposeStarts — la visita multiservizio', () => {
  // ⚠ discriminante: D2-3. Due servizi da 18 e 10 celle con una pausa di 3
  // fra loro occupano 31 celle, non 28. La pausa dell ULTIMO servizio non è
  // dentro la campata.
  it('somma le pause FRA i servizi e non quella dell ultimo', () => {
    expect(campataOccupata([18, 10], [3, 5])).toBe(31)
    expect(campataOccupata([18], [5])).toBe(18)
    expect(campataOccupata([6, 6, 6], [1, 2, 9])).toBe(21)
  })

  // ⚠ discriminante: è il caso che spec §13.1 chiede per nome — «una visita
  // multiservizio che ci sta solo senza le pause». La fascia è di 30 celle,
  // i due servizi ne chiedono 28 nude e 31 con la pausa in mezzo.
  it('rifiuta una visita che ci starebbe solo senza le pause', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 138 }],
        durations: [18, 10],
        buffers: [3, 0],
      }),
    )
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('service_too_long')
  })

  it('accetta la stessa visita in una fascia lunga abbastanza', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 139 }],
        durations: [18, 10],
        buffers: [3, 0],
      }),
    )
    expect(esito.starts).toEqual([108])
  })

  // ⚠ discriminante: D2-4. La pausa intermedia sta DENTRO la campata, quindi
  // le sue celle devono essere libere: un appuntamento di tre celle infilato
  // lì spezzerebbe la contiguità della visita.
  it('rifiuta una partenza la cui pausa intermedia è occupata', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('intruso', 126, 3, 0)],
        durations: [18, 10],
        buffers: [3, 0],
      }),
    )
    expect(esito.starts).not.toContain(108)
    expect(esito.starts).toContain(129)
  })

  // ⚠ discriminante: la coda pretesa verso l appuntamento seguente è quella
  // dell ULTIMO servizio, non del primo. Qui il primo ha pausa 9 e l ultimo 2:
  // usare quella del primo sposterebbe la partenza indietro di sette celle.
  it('pretende verso l appuntamento seguente la pausa dell ULTIMO servizio', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('dopo', 150, 6, 0)],
        durations: [6, 6],
        buffers: [9, 2],
      }),
    )
    // campata = 6 + 9 + 6 = 21; ultima cella proposta = inizio + 20
    // il blocco comincia alla 150, coda propria 2 → inizio + 20 <= 147
    expect(esito.starts).toContain(127)
    expect(esito.starts).not.toContain(128)
  })

  it('tratta tre servizi come due, senza casi speciali', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 129 }],
        durations: [6, 6, 6],
        buffers: [1, 2, 0],
      }),
    )
    expect(esito.starts).toEqual([108])
  })
})
```

- [ ] **Passo 2: eseguirle**

```bash
npm test -- tests/dominio/proposte.test.ts
```

Atteso: PASSANO tutte, 30 prove in totale. **Se una fallisce, il difetto è nei Task 5–7 e va corretto lì**, non aggirato qui: è la ragione per cui questo task esiste separato.

- [ ] **Passo 3: ⚠ Sonda di mutazione**

| # | Mutazione in `src/dominio/proposte.ts` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | in `campataOccupata`, `i < durations.length - 1` → `true` (somma anche l'ultima pausa) | *«somma le pause FRA i servizi e non quella dell ultimo»* |
| 2 | in `campataOccupata`, togliere del tutto l'addendo delle pause | *«rifiuta una visita che ci starebbe solo senza le pause»* |
| 3 | `codaPropria = ingresso.buffers[0]` | *«pretende verso l appuntamento seguente la pausa dell ULTIMO servizio»* |
| 4 | in `celleLibere`, usare `durations[0]` al posto di `campata` | *«rifiuta una partenza la cui pausa intermedia è occupata»* |

- [ ] **Passo 4: commit**

```bash
git add tests/dominio/proposte.test.ts
git commit -m "test(dominio): la visita multiservizio, con le pause dentro la campata"
```

---

## Task 9: Gli appuntamenti esclusi e l'ora corrente

**File:**
- Modifica: `src/dominio/proposte.ts`
- Prova: `tests/dominio/proposte.test.ts` (aggiunge un `describe`)

**Interfacce:**
- Consuma: `proposeStarts` dei Task 5–8.
- Produce: la stessa firma, che ora onora `nowCell`. `excludeAppointmentIds` è già stato scritto nel Task 6 e qui viene **misurato**.

- [ ] **Passo 1: scrivere le prove**

Aggiungere a `tests/dominio/proposte.test.ts`:

```ts
describe('proposeStarts — esclusioni e ora corrente', () => {
  // ⚠ discriminante: senza l esclusione, le celle dell appuntamento stesso
  // bloccano ogni partenza dentro la propria durata, e spostarlo di una cella
  // è impossibile — con il messaggio che nomina come ostacolo l appuntamento
  // che si sta trascinando.
  it('propone uno spostamento di una cella escludendo l appuntamento stesso', () => {
    const fisso = {
      ranges: [{ startBoundary: 108, endBoundary: 180 }],
      occupancy: [blocco('trascinato', 120, 18, 0)],
      durations: [18],
      buffers: [0],
    }
    expect(proposeStarts(ingresso(fisso)).starts).not.toContain(121)
    expect(
      proposeStarts(ingresso({ ...fisso, excludeAppointmentIds: ['trascinato'] })).starts,
    ).toContain(121)
  })

  // ⚠ discriminante: excludeAppointmentIds è una LISTA perché §8.6 sposta una
  // VISITA INTERA. Con un solo identificativo, l altro appuntamento della
  // visita resta occupato e lo spostamento non viene proposto. Una prova con
  // un solo appuntamento non distingue una lista da un valore singolo.
  it('sposta una visita da due appuntamenti come un unico blocco', () => {
    const fisso = {
      ranges: [{ startBoundary: 108, endBoundary: 180 }],
      occupancy: [blocco('primo', 120, 18, 0), blocco('secondo', 138, 10, 0)],
      durations: [18, 10],
      buffers: [0, 0],
    }
    expect(proposeStarts(ingresso({ ...fisso, excludeAppointmentIds: ['primo'] })).starts).not.toContain(121)
    expect(
      proposeStarts(ingresso({ ...fisso, excludeAppointmentIds: ['primo', 'secondo'] })).starts,
    ).toContain(121)
  })

  it('ignora un identificativo escluso che non corrisponde ad alcun blocco', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 180 }],
        occupancy: [blocco('a1', 120, 18, 0)],
        durations: [6],
        buffers: [0],
        excludeAppointmentIds: ['fantasma'],
      }),
    )
    expect(esito.starts).not.toContain(120)
  })

  // ⚠ discriminante: senza nowCell, alle 14:00 il cercaposti offre OGGI alle
  // 10:00. La cella 168 è le 14:00: la partenza a quell ora esatta è valida,
  // quella prima no.
  it('esclude le celle passate di oggi e tiene l ora esatta', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 228 }],
        durations: [6],
        buffers: [0],
        nowCell: 168,
      }),
    )
    expect(esito.starts).not.toContain(167)
    expect(esito.starts[0]).toBe(168)
  })

  // ⚠ discriminante: nowCell nullo significa «non è oggi», e i giorni futuri
  // NON si filtrano. Se il filtro fosse applicato con un valore di comodo,
  // questa prova perderebbe il mattino.
  it('non filtra niente sui giorni futuri', () => {
    const esito = proposeStarts(
      ingresso({ ranges: [{ startBoundary: 108, endBoundary: 228 }], durations: [6], buffers: [0] }),
    )
    expect(esito.starts[0]).toBe(108)
  })

  it('dice pieno quando l ora corrente ha mangiato tutta la giornata', () => {
    const esito = proposeStarts(
      ingresso({
        ranges: [{ startBoundary: 108, endBoundary: 228 }],
        durations: [6],
        buffers: [0],
        nowCell: 240,
      }),
    )
    expect(esito.starts).toEqual([])
    expect(esito.reason).toBe('full')
  })
})
```

- [ ] **Passo 2: eseguirle e verificare che falliscono**

```bash
npm test -- tests/dominio/proposte.test.ts
```

Atteso: FALLISCONO **due** delle tre prove su `nowCell` — *«esclude le celle passate di oggi e tiene l ora esatta»* e *«dice pieno quando l ora corrente ha mangiato tutta la giornata»*. La terza, *«non filtra niente sui giorni futuri»*, **passa già**, perché senza alcun filtro `starts[0]` è comunque 108: è lì per non diventare rossa quando il filtro entra. Le tre sulle esclusioni passano già anch'esse: misurano ciò che il Task 6 ha scritto e mai esercitato.

- [ ] **Passo 3: filtrare le celle passate**

In `src/dominio/proposte.ts`, dentro il ciclo, prima di `celleLibere`:

```ts
      // `nowCell` è nullo tranne quando `date` è oggi: sui giorni futuri non
      // si filtra niente. Una partenza ALL'ora esatta è ancora futura.
      if (ingresso.nowCell !== null && inizio < ingresso.nowCell) continue
```

- [ ] **Passo 4: eseguire le prove e verificare che passano**

```bash
npm test -- tests/dominio/proposte.test.ts
npx tsc --noEmit
```

Atteso: PASSA, 36 prove.

- [ ] **Passo 5: ⚠ Sonda di mutazione**

| # | Mutazione in `src/dominio/proposte.ts` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | `inizio < ingresso.nowCell` → `inizio <= ingresso.nowCell` | *«esclude le celle passate di oggi e tiene l ora esatta»* |
| 2 | `ingresso.nowCell !== null` → `(ingresso.nowCell ?? 0) >= 0`, cioè filtrare sempre con 0 quando è nullo | **nessuna — mutante EQUIVALENTE dichiarato.** `inizio >= 0` sempre, quindi filtrare con 0 non toglie niente. Verificato da un revisore: 0 prove uccise. Non riscrivere alcuna prova per inseguirlo |
| 3 | togliere il filtro di `excludeAppointmentIds` | *«propone uno spostamento di una cella escludendo l appuntamento stesso»* |
| 4 | `excludeAppointmentIds.includes(b.appointmentId)` → `excludeAppointmentIds[0] === b.appointmentId` | *«sposta una visita da due appuntamenti come un unico blocco»* |

- [ ] **Passo 6: commit**

```bash
git add src/dominio/proposte.ts tests/dominio/proposte.test.ts
git commit -m "feat(dominio): le celle passate di oggi e lo spostamento di una visita intera"
```

---

## Task 10: La query a intervallo di date

**File:**
- Crea: `supabase/migrations/0012_availability_window.sql`
- Prova: `tests/schema/availability-window.test.ts`

**Interfacce:**
- Consuma: `weekly_availability`, `exception_day`, `exception_range`, `salon_closure`, `appointment`, `service`, `operator` (migrazioni 0001, 0002, 0004, 0006); `app.is_active_operator()` (0001).
- Produce: `public.availability_window(p_from date, p_to date, p_operator_ids uuid[]) returns jsonb`, `stable`, `security invoker`, con `EXECUTE` revocato a `public` e `anon` e concesso ad `authenticated`.

**Perché una sola query.** Spec §7.5: il cercaposti cerca su 28 giorni, e una query al giorno sarebbe decine di viaggi di andata e ritorno proprio sul percorso dove la latenza è il punto. La funzione restituisce **materiale grezzo** — la settimana tipica, le eccezioni, le chiusure, l'occupazione — perché la risoluzione di §7.1 è la parte che le prove devono poter guastare una riga alla volta, e in SQL non si guasta.

⚠︎ **L'occupazione porta `cell_count`, non `end_cell`** (D2-1): l'aritmetica dell'ultima cella occupata vive in un posto solo, `blocco()` in `tempo.ts`. La revisione 1 la scriveva anche qui, e aveva così due copie della stessa somma in due lingue diverse.

⚠︎ **Le operatrici disattivate sono filtrate qui dentro** (D2-10), come difesa in profondità. Spec §7.4 dice che l'insieme delle idonee lo risolve il chiamante; questo filtro non lo sostituisce, gli fa da rete.

⚠︎ **Questo task non crea tabelle**, quindi l'obbligo di revoca per tabella non si applica. Si applica quello sulle funzioni: Supabase concede `EXECUTE` ad `anon` per difetto su ogni funzione nuova in `public`.

⚠︎ **Il numero `0012` è a cifre sole**: il CLI salta in silenzio una migrazione il cui prefisso contiene un non-cifra, stampa una riga facile da non vedere ed esce con successo. Il Passo 4 verifica l'output del reset invece di assumerlo.

- [ ] **Passo 1: scrivere la prova che fallisce**

`tests/schema/availability-window.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALESSANDRA,
  ANNALISA,
  OUTSIDER_AUTH,
  VERA,
  VERA_AUTH,
  asAnon,
  asOperator,
  asOwner,
  pgCode,
  resetData,
} from '../helpers/db'
import {
  CLIENT_MARIA,
  DAY_ONE,
  DAY_TWO,
  SERVICE_MASSAGE,
  SERVICE_REFILL,
  seedFixture,
} from '../helpers/fixtures'

const VISIT_UNO = '50000000-0000-4000-8000-0000000000a1'
const VISIT_DUE = '50000000-0000-4000-8000-0000000000a2'
const APPT = '60000000-0000-4000-8000-0000000000a1'
const FIRMA = 'public.availability_window(date, date, uuid[])'

// DAY_ONE è 2026-03-12 e DAY_TWO è 2026-03-19: entrambi giovedì, weekday 3.
const GIOVEDI = 3
const VENERDI = 4

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

async function finestra(from: string, to: string, operatori: string[] | null) {
  return asOperator(VERA_AUTH, async (c) => {
    const r = await c.query<{ w: Record<string, unknown[]> }>(
      'select public.availability_window($1::date, $2::date, $3::uuid[]) as w',
      [from, to, operatori],
    )
    return r.rows[0].w
  })
}

/** Una visita con un appuntamento, scritta da proprietario. */
async function prenota(
  visitId: string,
  data: string,
  operatorId: string,
  serviceId: string,
  startCell: number,
  cellCount: number,
  appointmentId?: string,
) {
  await asOwner(async (c) => {
    await c.query(
      `insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)
       on conflict (id) do nothing`,
      [visitId, CLIENT_MARIA, data],
    )
    await c.query(
      `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
       values (coalesce($1, gen_random_uuid()), $2, $3, $4, $5::date, $6, $7)`,
      [appointmentId ?? null, visitId, operatorId, serviceId, data, startCell, cellCount],
    )
  })
}

describe('availability_window', () => {
  it('restituisce quattro elenchi, vuoti quando non c è niente', async () => {
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA])
    expect(Object.keys(w).sort()).toEqual(['closures', 'exceptions', 'occupancy', 'weekly'])
    expect(w.weekly).toEqual([])
    expect(w.exceptions).toEqual([])
    expect(w.closures).toEqual([])
    expect(w.occupancy).toEqual([])
  })

  // ⚠ discriminante anche sull ORDINE: due righe per Vera, inserite col
  // venerdì PRIMA del giovedì, e l esito atteso è ordinato. Con una riga sola
  // l `order by` della sezione sarebbe dichiarato e mai esercitato.
  it('riporta la settimana tipica dell operatrice chiesta, ordinata, e non delle altre', async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $4, 180, 228), ($2, $3, 120, 168), ($1, $3, 108, 156)`,
        [VERA, ANNALISA, GIOVEDI, VENERDI],
      )
    })
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA])
    expect(w.weekly).toEqual([
      { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
      { operator_id: VERA, weekday: VENERDI, start_boundary: 180, end_boundary: 228 },
    ])
  })

  // ⚠ discriminante: l eccezione porta le sue fasce ANNIDATE e ordinate, e un
  // giorno di eccezione SENZA fasce deve comparire lo stesso con un elenco
  // vuoto — è l assenza dichiarata di §6.5, e se sparisse la risoluzione
  // tornerebbe alla settimana tipica.
  it('annida le fasce dell eccezione e conserva un eccezione senza fasce', async () => {
    await asOwner(async (c) => {
      await c.query('select public.write_exception_day($1, $2::date, $3::int[])', [
        VERA,
        DAY_ONE,
        [[120, 132], [96, 108]],
      ])
      await c.query('select public.write_exception_day($1, $2::date, null)', [ANNALISA, DAY_ONE])
    })
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA, ANNALISA])
    expect(w.exceptions).toEqual([
      {
        operator_id: VERA,
        date: DAY_ONE,
        ranges: [
          { start_boundary: 96, end_boundary: 108 },
          { start_boundary: 120, end_boundary: 132 },
        ],
      },
      { operator_id: ANNALISA, date: DAY_ONE, ranges: [] },
    ])
  })

  // ⚠ discriminante: una chiusura si sovrappone all intervallo anche se non ci
  // sta dentro. Una condizione `between p_from and p_to` sulle sue date la
  // perderebbe, e il salone risulterebbe aperto in una settimana di ferie.
  // ⚠ discriminante anche sull ORDINE: due chiusure, inserite dalla più
  // recente alla più vecchia, ed entrambe si sovrappongono al giorno chiesto.
  // Con una sola, l `order by c.start_date` sarebbe dichiarato e mai esercitato.
  it('prende le chiusure che inglobano l intervallo senza starci dentro, ordinate', async () => {
    await asOwner((c) =>
      c.query(
        `insert into salon_closure (start_date, end_date, from_boundary, to_boundary, reason)
         values ('2026-03-10', '2026-03-14', 96, 120, 'Corso'),
                ('2026-03-01', '2026-03-31', null, null, 'Ferie')`,
      ),
    )
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA])
    expect(w.closures).toEqual([
      {
        start_date: '2026-03-01',
        end_date: '2026-03-31',
        from_boundary: null,
        to_boundary: null,
        reason: 'Ferie',
      },
      {
        start_date: '2026-03-10',
        end_date: '2026-03-14',
        from_boundary: 96,
        to_boundary: 120,
        reason: 'Corso',
      },
    ])
  })

  // ⚠ discriminante: D2-1 sul lato SQL. La funzione restituisce cell_count
  // GREZZO: l ultima cella occupata la calcola blocco() e nessun altro. Se qui
  // comparisse un end_cell, l aritmetica esisterebbe in due lingue. E
  // buffer_after_cells viene dal SERVIZIO, non dall appuntamento: senza la
  // giunzione la regola del riassetto non è calcolabile.
  it('riporta l occupazione con il conteggio delle celle e la pausa del servizio', async () => {
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 120, 18, APPT)
    await prenota(VISIT_UNO, DAY_ONE, ALESSANDRA, SERVICE_MASSAGE, 150, 10)
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA, ALESSANDRA])
    const righe = w.occupancy as Array<Record<string, unknown>>
    expect(righe).toHaveLength(2)
    expect(righe.find((r) => r.appointment_id === APPT)).toEqual({
      appointment_id: APPT,
      operator_id: VERA,
      date: DAY_ONE,
      start_cell: 120,
      cell_count: 18,
      buffer_after_cells: 0,
    })
    // Il massaggio porta la pausa da 3 celle del suo SERVIZIO.
    expect(righe.find((r) => r.operator_id === ALESSANDRA)).toMatchObject({
      start_cell: 150,
      cell_count: 10,
      buffer_after_cells: 3,
    })
  })

  // ⚠ discriminante: è la ragione d ESSERE della funzione — un INTERVALLO di
  // date, non un giorno. Con una sola data positiva, mutare
  // `between p_from and p_to` in `= p_from` lascerebbe verde ogni altra prova
  // di questo file. Qui ci sono due giorni, due appuntamenti e due eccezioni,
  // e l ordine per data è asserito sull elenco intero.
  it('restituisce tutti i giorni dell intervallo, non solo il primo', async () => {
    // Il SECONDO giorno ha la cella d inizio PIÙ PICCOLA del primo: così
    // l ordine per data e l ordine per cella non coincidono, e una mutazione
    // che ordinasse per `start_cell` diventa osservabile. Con 120 e poi 150 i
    // due ordini davano lo stesso esito e la sonda era inerte.
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 150, 18)
    await prenota(VISIT_DUE, DAY_TWO, VERA, SERVICE_REFILL, 120, 18)
    await asOwner(async (c) => {
      await c.query('select public.write_exception_day($1, $2::date, $3::int[])', [
        VERA,
        DAY_TWO,
        [[96, 120]],
      ])
      await c.query('select public.write_exception_day($1, $2::date, $3::int[])', [
        VERA,
        DAY_ONE,
        [[108, 156]],
      ])
    })
    const w = await finestra(DAY_ONE, DAY_TWO, [VERA])

    const occupazione = (w.occupancy as Array<Record<string, unknown>>).map((r) => [
      r.date,
      r.start_cell,
    ])
    expect(occupazione).toEqual([
      [DAY_ONE, 150],
      [DAY_TWO, 120],
    ])

    const eccezioni = (w.exceptions as Array<Record<string, unknown>>).map((e) => e.date)
    expect(eccezioni).toEqual([DAY_ONE, DAY_TWO])
  })

  it('non riporta un appuntamento fuori dall intervallo di date', async () => {
    await prenota(VISIT_UNO, '2026-04-20', VERA, SERVICE_REFILL, 120, 18)
    const w = await finestra(DAY_ONE, '2026-04-08', [VERA])
    expect(w.occupancy).toEqual([])
  })

  // ⚠ discriminante: l occupazione si filtra per OPERATRICE, non solo per
  // data. La sicurezza per riga lascia a un operatrice attiva l agenda intera,
  // quindi senza questo filtro il cercaposti tratterebbe gli appuntamenti
  // altrui come occupanti delle proprie celle.
  it('non riporta l occupazione di un operatrice che non è stata chiesta', async () => {
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 120, 18, APPT)
    await prenota(VISIT_UNO, DAY_ONE, ALESSANDRA, SERVICE_MASSAGE, 150, 10)
    const w = await finestra(DAY_ONE, DAY_ONE, [VERA])
    const righe = w.occupancy as Array<Record<string, unknown>>
    expect(righe).toHaveLength(1)
    expect(righe[0].appointment_id).toBe(APPT)
  })

  // ⚠ discriminante: D2-10, ed è l unica prova di tutto il piano che vede
  // un operatrice disattivata — resetData() le riattiva tutte a ogni prova, e
  // senza questa il predicato `is_active` sarebbe dichiarato e mai esercitato.
  //
  // Asserisce ENTRAMBI i lati del confine: la DISPONIBILITÀ di chi è stata
  // disattivata sparisce, perché è il danno che spec §7.4 nomina — «il
  // cercaposti continua a proporre appuntamenti con chi se n è andata il mese
  // scorso» — ma la sua OCCUPAZIONE resta, perché quelle celle sono davvero
  // prese e il vincolo del database le rifiuterebbe comunque. Una finestra che
  // le dichiarasse libere direbbe una bugia che salta fuori solo al
  // salvataggio, con un errore di vincolo al posto di «occupato».
  it('toglie le fasce di un operatrice disattivata e tiene la sua occupazione', async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $3, 108, 156), ($2, $3, 108, 156)`,
        [VERA, ANNALISA, GIOVEDI],
      )
    })
    await prenota(VISIT_UNO, DAY_ONE, ANNALISA, SERVICE_REFILL, 120, 18)

    const prima = await finestra(DAY_ONE, DAY_ONE, [VERA, ANNALISA])
    expect(prima.weekly).toHaveLength(2)
    expect(prima.occupancy).toHaveLength(1)

    // Vera resta attiva: la guardia anti-blocco di 0009 rifiuterebbe di
    // disattivare l ultima operatrice collegata.
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))

    const dopo = await finestra(DAY_ONE, DAY_ONE, [VERA, ANNALISA])
    expect(dopo.weekly).toEqual([
      { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
    ])
    expect(dopo.occupancy).toHaveLength(1)
    expect((dopo.occupancy as Array<Record<string, unknown>>)[0]).toMatchObject({
      operator_id: ANNALISA,
      start_cell: 120,
      cell_count: 18,
    })
  })

  // ⚠ discriminante: D2-8. Un elenco nullo NON vale «tutte»: un errore del
  // chiamante deve produrre il vuoto sulle tre sezioni che hanno un operatrice.
  // `closures` NON è filtrato per operatrice — una chiusura è del salone — e
  // la prova lo asserisce invece di promettere un documento interamente vuoto.
  it('tratta un elenco nullo di operatrici come nessuna operatrice', async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $2, 108, 156)`,
        [VERA, GIOVEDI],
      )
      await c.query(
        `insert into salon_closure (start_date, end_date, from_boundary, to_boundary, reason)
         values ($1::date, $1::date, null, null, 'Ferie')`,
        [DAY_ONE],
      )
    })
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 120, 18)
    const w = await finestra(DAY_ONE, DAY_ONE, null)
    expect(w.weekly).toEqual([])
    expect(w.exceptions).toEqual([])
    expect(w.occupancy).toEqual([])
    expect(w.closures).toHaveLength(1)
  })

  // ⚠ discriminante: security invoker significa che la sicurezza per riga
  // arbitra. Un account autenticato che non è operatrice deve vedere elenchi
  // VUOTI, non un errore e non i dati.
  it('non restituisce nulla a un account che non è operatrice', async () => {
    await asOwner((c) =>
      c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $2, 108, 156)`,
        [VERA, GIOVEDI],
      ),
    )
    const w = await asOperator(OUTSIDER_AUTH, async (c) => {
      const r = await c.query<{ w: Record<string, unknown[]> }>(
        'select public.availability_window($1::date, $2::date, $3::uuid[]) as w',
        [DAY_ONE, DAY_ONE, [VERA]],
      )
      return r.rows[0].w
    })
    expect(w.weekly).toEqual([])
    expect(w.occupancy).toEqual([])
    // `closures` è l unica sezione non filtrata per operatrice: la sua sola
    // difesa contro un estraneo è la politica `salon_closure_access`. Senza
    // questa riga, se quella politica sparisse nessuna prova lo vedrebbe.
    expect(w.closures).toEqual([])
  })

  // ⚠ discriminante: «chiama come anon e aspettati 42501» non distingue
  // «EXECUTE revocato» da «EXECUTE concesso e il corpo inciampa altrove».
  // has_function_privilege lo distingue, e vede anche una concessione a PUBLIC.
  // Misurato il 18 settembre 2026: 'public' È accettato come pseudo-ruolo, e
  // un nome di ruolo inesistente solleva 42704, quindi la riga non è inerte.
  it('nega EXECUTE ad anon e a public, e lo concede ad authenticated', async () => {
    const codice = await asAnon(async (c) => {
      try {
        await c.query('select public.availability_window($1::date, $2::date, $3::uuid[])', [
          DAY_ONE,
          DAY_ONE,
          [VERA],
        ])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('42501')

    const privilegi = await asOwner(async (c) => {
      const r = await c.query<{ anon: boolean; pubblico: boolean; autenticato: boolean }>(
        `select has_function_privilege('anon', $1, 'EXECUTE') as anon,
                has_function_privilege('public', $1, 'EXECUTE') as pubblico,
                has_function_privilege('authenticated', $1, 'EXECUTE') as autenticato`,
        [FIRMA],
      )
      return r.rows[0]
    })
    expect(privilegi.anon).toBe(false)
    expect(privilegi.pubblico).toBe(false)
    expect(privilegi.autenticato).toBe(true)
  })

  // ⚠ discriminante: `proconfig` è asserito insieme a provolatile e prosecdef.
  // Il presidio di catalogo di catalogue-audit.test.ts filtra su prosecdef e
  // quindi NON guarda questa funzione, che è invoker: senza questa riga
  // togliere `set search_path = ''` non renderebbe rossa alcuna prova.
  it('è dichiarata stable, security invoker e con search_path vuoto', async () => {
    const riga = await asOwner(async (c) => {
      const r = await c.query<{ provolatile: string; prosecdef: boolean; proconfig: string[] | null }>(
        `select p.provolatile, p.prosecdef, p.proconfig
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'availability_window'`,
      )
      return r.rows[0]
    })
    expect(riga.provolatile).toBe('s')
    expect(riga.prosecdef).toBe(false)
    expect(riga.proconfig).toEqual(['search_path=""'])
  })

  // Misurato: con l intervallo rovesciato le tre sezioni che hanno un
  // predicato sulle date si svuotano, e `weekly` NO — non ne ha uno, perché la
  // settimana tipica non ha date. Il chiamante su un intervallo rovesciato
  // scandisce zero giorni, quindi non fa danno; l asserzione dice il vero
  // invece di promettere un documento interamente vuoto.
  it('svuota le sezioni datate quando l intervallo è rovesciato', async () => {
    await asOwner((c) =>
      c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $2, 108, 156)`,
        [VERA, GIOVEDI],
      ),
    )
    await prenota(VISIT_UNO, DAY_ONE, VERA, SERVICE_REFILL, 120, 18)
    const w = await finestra('2026-04-08', DAY_ONE, [VERA])
    expect(w.occupancy).toEqual([])
    expect(w.exceptions).toEqual([])
    expect(w.closures).toEqual([])
    expect(w.weekly).toHaveLength(1)
  })

  // ⚠ discriminante: una data NULLA deve fallire CHIUSA. Misurato sulla
  // revisione precedente di questo piano: falliva APERTA — `closures` si
  // svuotava e `weekly` restava pieno, cioè il documento diceva «l operatrice
  // lavora, il salone non è mai chiuso, niente è prenotato». È la forma
  // peggiore possibile, ed è lo stesso principio che D2-8 applica alle
  // operatrici: un errore del chiamante produce il vuoto, non la
  // disponibilità massima.
  it('restituisce un documento vuoto quando una delle due date è nulla', async () => {
    await asOwner(async (c) => {
      await c.query(
        `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
         values ($1, $2, 108, 156)`,
        [VERA, GIOVEDI],
      )
      await c.query(
        `insert into salon_closure (start_date, end_date, from_boundary, to_boundary, reason)
         values ('2026-03-01', '2026-03-31', null, null, 'Ferie')`,
      )
    })
    const coppie: Array<[string | null, string | null]> = [
      [null, DAY_ONE],
      [DAY_ONE, null],
      [null, null],
    ]
    for (const [da, a] of coppie) {
      const w = await asOperator(VERA_AUTH, async (c) => {
        const r = await c.query<{ w: Record<string, unknown[]> }>(
          'select public.availability_window($1::date, $2::date, $3::uuid[]) as w',
          [da, a, [VERA]],
        )
        return r.rows[0].w
      })
      expect(w.weekly).toEqual([])
      expect(w.exceptions).toEqual([])
      expect(w.closures).toEqual([])
      expect(w.occupancy).toEqual([])
    }
  })
})
```

- [ ] **Passo 2: eseguirla e verificare che fallisce**

```bash
npm test -- tests/schema/availability-window.test.ts
```

Atteso: FALLISCE — `42883 function public.availability_window(date, date, uuid[]) does not exist`.

- [ ] **Passo 3: scrivere la migrazione**

`supabase/migrations/0012_availability_window.sql`:

```sql
-- La query a INTERVALLO DI DATE di spec §7.5: una sola andata e ritorno per
-- tutti i 28 giorni del cercaposti (§8.3), invece di una al giorno.
--
-- Restituisce MATERIALE GREZZO e non fasce risolte: la risoluzione di §7.1 —
-- l'eccezione che sostituisce il giorno, la sottrazione delle chiusure, la
-- piega — vive in TypeScript, dove ogni sua riga si può guastare una per volta
-- e pretendere che una prova nominata diventi rossa.
--
-- security INVOKER: la sicurezza per riga deve arbitrare la lettura come per
-- ogni altra tabella. Un account autenticato che non è operatrice riceve
-- elenchi vuoti, non un errore e non i dati.
--
-- search_path vuoto e ogni riferimento qualificato per schema, come ogni altra
-- funzione di questo database.
--
-- (Nota misurata: questa funzione non viene mai messa in linea, ma NON per il
-- `search_path`. Popolare `proconfig` basterebbe a impedirlo, e infatti lo
-- impedisce su una funzione banale; qui però la bloccano già i sotto-select
-- del corpo, quindi il `set` non aggiunge niente su quel fronte. È il motivo
-- per cui `explain` sulla chiamata mostra solo un `Result` e il piano interno
-- resta invisibile senza `auto_explain`.)
--
-- OPERATRICI DISATTIVATE: filtrate su DISPONIBILITÀ ed ECCEZIONI, non
-- sull'OCCUPAZIONE (D2-10). Spec §7.4 dice che l'insieme delle idonee lo
-- risolve il chiamante, ristretto alle attive; queste due giunzioni non lo
-- sostituiscono, gli fanno da rete, perché il danno che la spec nomina —
-- proporre appuntamenti con chi se n'è andata il mese scorso — è troppo
-- silenzioso per lasciarlo a una sola difesa.
--
-- L'occupazione NON si filtra, ed è misurato perché: filtrandola, la finestra
-- dichiarava libera una cella che il vincolo `appointment_slot_unique` poi
-- rifiuta con 23505. La disponibilità dice chi si PUÒ proporre; l'occupazione
-- dice che cosa è GIÀ SUCCESSO, e quello resta vero anche se l'operatrice è
-- stata disattivata ieri. Dal cercaposti la differenza non è raggiungibile —
-- senza fasce non si propone nulla — ma da un percorso di scrittura diretta
-- sì, e lì l'agenda mostrerebbe una cella libera che esplode al salvataggio.
create function public.availability_window(
  p_from         date,
  p_to           date,
  p_operator_ids uuid[]
) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    -- La settimana tipica non ha date: si filtra per operatrice soltanto.
    'weekly', coalesce((
      select jsonb_agg(jsonb_build_object(
               'operator_id',    w.operator_id,
               'weekday',        w.weekday,
               'start_boundary', w.start_boundary,
               'end_boundary',   w.end_boundary)
             order by w.operator_id, w.weekday, w.start_boundary)
      from public.weekly_availability w
      join public.operator o on o.id = w.operator_id and o.is_active
      where w.operator_id = any(p_operator_ids)
        -- La settimana tipica non ha date, quindi è l'UNICA sezione che una
        -- data nulla non svuoterebbe da sé: senza questa riga il documento
        -- direbbe «l'operatrice lavora, il salone non è mai chiuso, niente è
        -- prenotato», cioè fallirebbe APERTO. Misurato. Le altre tre hanno un
        -- predicato sulle date e con un nullo restituiscono già zero righe.
        and p_from is not null
        and p_to is not null
    ), '[]'::jsonb),

    -- Le fasce dell'eccezione stanno ANNIDATE sotto il loro giorno, e un
    -- giorno senza fasce resta nell'elenco con `ranges` vuoto: è l'assenza
    -- dichiarata di §6.5, e perderla farebbe tornare la settimana tipica.
    'exceptions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'operator_id', e.operator_id,
               'date',        e.exception_date,
               'ranges', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'start_boundary', r.start_boundary,
                          'end_boundary',   r.end_boundary)
                        order by r.start_boundary)
                 from public.exception_range r
                 where r.exception_day_id = e.id
               ), '[]'::jsonb))
             order by e.exception_date, e.operator_id)
      from public.exception_day e
      join public.operator o on o.id = e.operator_id and o.is_active
      where e.operator_id = any(p_operator_ids)
        and e.exception_date between p_from and p_to
    ), '[]'::jsonb),

    -- SOVRAPPOSIZIONE, non contenimento: una chiusura dal 1 al 31 marzo
    -- riguarda il 12 marzo pur non stando dentro un intervallo di un giorno.
    -- `between` sulle sue date la perderebbe e il salone risulterebbe aperto
    -- in una settimana di ferie.
    --
    -- NON filtrata per operatrice: una chiusura è del salone, non di una
    -- persona. Conseguenza dichiarata in D2-8: con p_operator_ids nullo il
    -- documento non è interamente vuoto, contiene ancora le chiusure.
    'closures', coalesce((
      select jsonb_agg(jsonb_build_object(
               'start_date',    c.start_date,
               'end_date',      c.end_date,
               'from_boundary', c.from_boundary,
               'to_boundary',   c.to_boundary,
               'reason',        c.reason)
             order by c.start_date, c.id)
      from public.salon_closure c
      where c.start_date <= p_to and c.end_date >= p_from
    ), '[]'::jsonb),

    -- `cell_count` GREZZO, non `end_cell`: l'ultima cella occupata la calcola
    -- `blocco()` in src/dominio/tempo.ts e nessun altro (D2-1). Avere la
    -- stessa somma anche qui vorrebbe dire due copie in due lingue, e la
    -- seconda si corregge sempre dopo la prima.
    --
    -- La giunzione su `service` è obbligatoria: la pausa di riassetto sta sul
    -- SERVIZIO, e senza di lei la regola di §7.3 non è calcolabile dal
    -- chiamante.
    'occupancy', coalesce((
      select jsonb_agg(jsonb_build_object(
               'appointment_id',     a.id,
               'operator_id',        a.operator_id,
               'date',               a.appointment_date,
               'start_cell',         a.start_cell,
               'cell_count',         a.cell_count,
               'buffer_after_cells', s.buffer_after_cells)
             order by a.appointment_date, a.operator_id, a.start_cell)
      from public.appointment a
      join public.service s on s.id = a.service_id
      where a.operator_id = any(p_operator_ids)
        and a.appointment_date between p_from and p_to
    ), '[]'::jsonb)
  );
$$;

-- Supabase concede EXECUTE ad anon per difetto su ogni funzione nuova in
-- public. Si revoca da public (che raggiunge chiunque, compresi i ruoli
-- futuri) e da anon per nome, e si concede ad authenticated.
--
-- ⚠ Questo NON rende la funzione eseguibile dal solo `authenticated`:
-- misurato il 18 settembre 2026, `service_role` detiene EXECUTE anche sulle
-- funzioni del piano 1 che fanno esattamente questa coppia di istruzioni. La
-- concessione viene dal bootstrap di Supabase, fuori da queste migrazioni. È
-- atteso — service_role è il ruolo lato server — ma nessun commento qui può
-- dire «solo authenticated», perché sarebbe falso.
revoke execute on function public.availability_window(date, date, uuid[]) from public, anon;
grant  execute on function public.availability_window(date, date, uuid[]) to authenticated;
```

- [ ] **Passo 4: applicare la migrazione e LEGGERE l'output del reset**

```bash
npx supabase db reset
```

Atteso: fra le righe applicate compare **letteralmente** `Applying migration 0012_availability_window.sql...`, e **non** compare alcuna riga `Skipping migration`. Se la riga di applicazione manca, il file non è stato applicato e il reset è uscito comunque con successo: si controlla il prefisso numerico prima di qualunque altra cosa.

Verifica indipendente dal testo stampato:

```bash
node --input-type=module -e "
import pg from 'pg'
const c = new pg.Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' })
await c.connect()
const r = await c.query('select version from supabase_migrations.schema_migrations order by version')
console.log(r.rows.map((x) => x.version).join(', '))
await c.end()
"
```

Atteso: l'elenco finisce con `0012`.

- [ ] **Passo 5: eseguire la suite intera**

```bash
npm test
```

Atteso: PASSA. `Test Files 17 passed (17)` — i 13 file esistenti più `tempo`, `fasce`, `proposte` e `availability-window`; `cercaposti.test.ts` nasce al Task 11. Le prove sono 145 più quelle scritte dai Task 1–10.

⚠︎ Il presidio di catalogo di `tests/schema/catalogue-audit.test.ts` enumera le funzioni `security definer` e pretende `search_path` vuoto. `availability_window` è `security invoker` e ne resta fuori per costruzione: è per questo che il `proconfig` se lo asserisce da sé, nella prova qui sopra.

- [ ] **Passo 6: ⚠ Sonda di mutazione**

Ogni mutazione si applica **modificando la migrazione, rilanciando `npx supabase db reset`** e poi la sola prova nominata; si rimette a posto e si rilancia il reset prima della successiva.

| # | Mutazione in `0012_availability_window.sql` | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | `'cell_count', a.cell_count` → `'end_cell', a.start_cell + a.cell_count - 1` | *«riporta l occupazione con il conteggio delle celle e la pausa del servizio»* |
| 2 | togliere la giunzione su `service` e mettere `0` come pausa | *«riporta l occupazione con il conteggio delle celle e la pausa del servizio»* |
| 3 | `c.start_date <= p_to and c.end_date >= p_from` → `c.start_date between p_from and p_to` | *«prende una chiusura che ingloba l intervallo senza starci dentro»* |
| 4 | `coalesce(( … ), '[]'::jsonb)` sulle fasce dell'eccezione → senza `coalesce` | *«annida le fasce dell eccezione e conserva un eccezione senza fasce»* |
| 5 | `security invoker` → `security definer` | *«non restituisce nulla a un account che non è operatrice»* e *«è dichiarata stable, security invoker e con search_path vuoto»* |
| 6 | togliere la riga `revoke execute … from public, anon` | *«nega EXECUTE ad anon e a public, e lo concede ad authenticated»* |
| 7 | `a.appointment_date between p_from and p_to` → `a.appointment_date = p_from` | *«restituisce tutti i giorni dell intervallo, non solo il primo»* |
| 8 | `e.exception_date between p_from and p_to` → `e.exception_date = p_from` | *«restituisce tutti i giorni dell intervallo, non solo il primo»* |
| 9 | togliere `where a.operator_id = any(p_operator_ids)` dall'occupazione | *«non riporta l occupazione di un operatrice che non è stata chiesta»* |
| 10 | togliere `and o.is_active` dalle due giunzioni su `operator` | *«toglie le fasce di un operatrice disattivata e tiene la sua occupazione»* |
| 11 | togliere `set search_path = ''` | *«è dichiarata stable, security invoker e con search_path vuoto»* |
| 12 | `order by a.appointment_date, …` → `order by a.start_cell` | *«restituisce tutti i giorni dell intervallo, non solo il primo»* |
| 14 | `order by w.operator_id, w.weekday, w.start_boundary` → `desc` | *«riporta la settimana tipica dell operatrice chiesta, ordinata, e non delle altre»* |
| 15 | `order by c.start_date, c.id` → `desc` | *«prende le chiusure che inglobano l intervallo senza starci dentro, ordinate»* |
| 16 | togliere `and p_from is not null and p_to is not null` dalla settimana tipica | *«restituisce un documento vuoto quando una delle due date è nulla»* |
| 17 | rimettere `join public.operator o on o.id = a.operator_id and o.is_active` sull'occupazione | *«toglie le fasce di un operatrice disattivata e tiene la sua occupazione»* |
| 13 | rinominare il file in `0012b_availability_window.sql` | **nessuna prova** — è il caso che nessuna prova può cogliere: `db reset` esce 0, stampa `Skipping migration` e ogni prova di questo file diventa rossa con `42883`. Si esegue apposta, una volta, per vedere con i propri occhi la riga saltata, e poi si rimette il nome giusto |

- [ ] **Passo 7: commit**

```bash
git add supabase/migrations/0012_availability_window.sql tests/schema/availability-window.test.ts
git commit -m "feat(db): availability_window, una sola query a intervallo di date"
```

---
## Task 11: La decodifica della finestra e il cercaposti

**File:**
- Crea: `src/dominio/finestra.ts`, `src/dominio/cercaposti.ts`
- Prova: `tests/dominio/cercaposti.test.ts`

**Interfacce:**
- Consuma: `risolviGiorno` e i tipi `Eccezione` e `Chiusura` da `src/dominio/fasce`; `proposeStarts` da `src/dominio/proposte`; `blocco`, `giornoSettimana`, `sommaGiorni` da `src/dominio/tempo`.
- Produce:
  - `decodificaFinestra(documento: DocumentoFinestra): Finestra`, con `Finestra.giorno(operatorId, date) -> { ranges, dayStatus, occupancy }`;
  - `cercaPosti(ingresso: IngressoCercaposti): EsitoCercaposti`, con `EsitoCercaposti = { rows: RigaProposta[]; reason: MotivoAssenza | null }` e `RigaProposta = { date, operatorId, startCell }`;
  - la costante `ORIZZONTE_GIORNI = 28`.

- [ ] **Passo 1: scrivere le prove che falliscono**

`tests/dominio/cercaposti.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { decodificaFinestra } from '../../src/dominio/finestra'
import { ORIZZONTE_GIORNI, cercaPosti } from '../../src/dominio/cercaposti'
import type { DocumentoFinestra } from '../../src/dominio/finestra'

const VERA = 'operatrice-vera'
const ALESSANDRA = 'operatrice-alessandra'
// 2026-03-12 è giovedì: weekday 3. 2026-03-13 è venerdì: weekday 4.
const GIOVEDI = 3
const VENERDI = 4

function documento(sopra: Partial<DocumentoFinestra> = {}): DocumentoFinestra {
  return {
    weekly: [{ operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 }],
    exceptions: [],
    closures: [],
    occupancy: [],
    ...sopra,
  }
}

describe('decodifica della finestra', () => {
  it('risolve un giorno dalla settimana tipica', () => {
    const f = decodificaFinestra(documento())
    const g = f.giorno(VERA, '2026-03-12')
    expect(g.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
    expect(g.dayStatus).toBe('open')
  })

  // ⚠ discriminante: la settimana tipica si sceglie per GIORNO DELLA SETTIMANA.
  // Il 13 marzo è venerdì e l operatrice non ha fasce quel giorno.
  it('non applica la fascia del giovedì al venerdì', () => {
    const f = decodificaFinestra(documento())
    expect(f.giorno(VERA, '2026-03-13').dayStatus).toBe('operator_off')
  })

  it('lascia che l eccezione sostituisca il giorno', () => {
    const f = decodificaFinestra(
      documento({
        exceptions: [
          { operator_id: VERA, date: '2026-03-12', ranges: [{ start_boundary: 96, end_boundary: 120 }] },
        ],
      }),
    )
    expect(f.giorno(VERA, '2026-03-12').ranges).toEqual([{ startBoundary: 96, endBoundary: 120 }])
  })

  // ⚠ discriminante: l eccezione vale per la SUA data e per la sua operatrice.
  // Applicarla al giorno dopo, o all altra operatrice, è l errore che questa
  // prova coglie.
  it('applica l eccezione solo alla sua data e alla sua operatrice', () => {
    const f = decodificaFinestra(
      documento({
        weekly: [
          { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
          { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
        ],
        exceptions: [{ operator_id: VERA, date: '2026-03-12', ranges: [] }],
      }),
    )
    expect(f.giorno(VERA, '2026-03-12').dayStatus).toBe('operator_off')
    expect(f.giorno(VERA, '2026-03-19').dayStatus).toBe('open')
    expect(f.giorno(ALESSANDRA, '2026-03-12').dayStatus).toBe('open')
  })

  // ⚠ discriminante: una chiusura copre un INTERVALLO di date, ed è la ragione
  // per cui `salon_closure` ha due date invece di una.
  it('applica una chiusura a ogni data del suo intervallo', () => {
    const f = decodificaFinestra(
      documento({
        weekly: [
          { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 },
          { operator_id: VERA, weekday: VENERDI, start_boundary: 108, end_boundary: 156 },
        ],
        closures: [
          {
            start_date: '2026-03-12',
            end_date: '2026-03-13',
            from_boundary: null,
            to_boundary: null,
            reason: 'Ferie',
          },
        ],
      }),
    )
    expect(f.giorno(VERA, '2026-03-12').dayStatus).toBe('salon_closed')
    expect(f.giorno(VERA, '2026-03-13').dayStatus).toBe('salon_closed')
    expect(f.giorno(VERA, '2026-03-19').dayStatus).toBe('open')
  })

  // ⚠ discriminante: l occupazione si costruisce con blocco() a partire da
  // cell_count (D2-1), e si filtra per giorno E per operatrice. L ultima cella
  // di un blocco che parte alla 120 e dura 18 celle è la 137.
  it('costruisce i blocchi con blocco() e li filtra per giorno e operatrice', () => {
    const f = decodificaFinestra(
      documento({
        occupancy: [
          {
            appointment_id: 'a1',
            operator_id: VERA,
            date: '2026-03-12',
            start_cell: 120,
            cell_count: 18,
            buffer_after_cells: 3,
          },
          {
            appointment_id: 'a2',
            operator_id: ALESSANDRA,
            date: '2026-03-12',
            start_cell: 120,
            cell_count: 18,
            buffer_after_cells: 0,
          },
          {
            appointment_id: 'a3',
            operator_id: VERA,
            date: '2026-03-19',
            start_cell: 120,
            cell_count: 18,
            buffer_after_cells: 0,
          },
        ],
      }),
    )
    expect(f.giorno(VERA, '2026-03-12').occupancy).toEqual([
      { appointmentId: 'a1', startCell: 120, endCell: 137, bufferAfterCells: 3 },
    ])
  })
})

describe('cercaPosti', () => {
  function ingressoCerca(sopra: Record<string, unknown> = {}) {
    return {
      from: '2026-03-12',
      days: ORIZZONTE_GIORNI,
      operatorIds: [VERA],
      finestra: decodificaFinestra(documento()),
      durations: [6],
      buffers: [0],
      excludeAppointmentIds: [] as string[],
      today: null as string | null,
      nowCell: null as number | null,
      preferredOperatorId: null as string | null,
      limit: 5,
      ...sopra,
    }
  }

  it('cerca su 28 giorni', () => {
    expect(ORIZZONTE_GIORNI).toBe(28)
  })

  it('restituisce le proposte in ordine di data', () => {
    const esito = cercaPosti(ingressoCerca({ limit: 2 }))
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: VERA, startCell: 108 },
      { date: '2026-03-12', operatorId: VERA, startCell: 109 },
    ])
    expect(esito.reason).toBeNull()
  })

  // ⚠ discriminante: l orizzonte è di 28 giorni a partire da `from`, estremi
  // compresi: il 2026-04-08 è il ventottesimo ed è dentro, il 2026-04-09 è
  // fuori. Una fascia SOLO in quel giorno distingue i due confini.
  it('arriva al ventottesimo giorno e non al ventinovesimo', () => {
    const soloIlNove = documento({
      weekly: [],
      exceptions: [
        { operator_id: VERA, date: '2026-04-09', ranges: [{ start_boundary: 108, end_boundary: 156 }] },
      ],
    })
    const soloIlOtto = documento({
      weekly: [],
      exceptions: [
        { operator_id: VERA, date: '2026-04-08', ranges: [{ start_boundary: 108, end_boundary: 156 }] },
      ],
    })
    expect(cercaPosti(ingressoCerca({ finestra: decodificaFinestra(soloIlNove) })).rows).toEqual([])
    expect(
      cercaPosti(ingressoCerca({ finestra: decodificaFinestra(soloIlOtto) })).rows[0]?.date,
    ).toBe('2026-04-08')
  })

  it('si ferma al limite chiesto', () => {
    expect(cercaPosti(ingressoCerca({ limit: 3 })).rows).toHaveLength(3)
  })

  // ⚠ discriminante: D2-11. A parità di data si ordina per ORARIO fra TUTTE le
  // operatrici. Alessandra apre alle 09:00 (cella 108) e Vera alle 09:10
  // (cella 110); l elenco del chiamante mette Vera per prima. Raccogliendo
  // un operatrice alla volta — come faceva la revisione 1 — la prima riga
  // sarebbe di Vera alle 09:10, cioè una proposta PEGGIORE in cima.
  it('ordina per orario fra le operatrici a parità di data', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 110, end_boundary: 116 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [VERA, ALESSANDRA],
        limit: 2,
      }),
    )
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: ALESSANDRA, startCell: 108 },
      { date: '2026-03-12', operatorId: VERA, startCell: 110 },
    ])
  })

  // ⚠ discriminante: D2-11, la metà che decide. La preferita è Vera, che apre
  // alle 09:10; Alessandra apre alle 09:00. La preferenza NON deve scavalcare
  // un orario migliore — è il SOLO caso che combina una preferita valorizzata
  // con orari d inizio diversi nello stesso giorno, e senza di esso la sonda
  // che sposta la preferenza davanti all orario non può diventare rossa.
  it('non lascia che la preferita scavalchi un orario migliore', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 110, end_boundary: 116 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [VERA, ALESSANDRA],
        preferredOperatorId: VERA,
        limit: 2,
      }),
    )
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: ALESSANDRA, startCell: 108 },
      { date: '2026-03-12', operatorId: VERA, startCell: 110 },
    ])
  })

  // ⚠ discriminante: D2-11. La preferita vince SOLO a parità di orario. Qui le
  // due operatrici propongono entrambe le 09:00 e la preferita è Alessandra,
  // che nell elenco del chiamante viene seconda.
  it('mette la preferita prima a parità di orario', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [VERA, ALESSANDRA],
        preferredOperatorId: ALESSANDRA,
        limit: 2,
      }),
    )
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: ALESSANDRA, startCell: 108 },
      { date: '2026-03-12', operatorId: VERA, startCell: 108 },
    ])
  })

  // ⚠ discriminante: la DATA batte la preferenza. Alessandra lavora il giovedì
  // 12, Vera solo il venerdì 13, e la preferita è Vera: la prima riga deve
  // essere del 12 con Alessandra. Se la preferenza scavalcasse la data — che è
  // l errore che §8.3 nomina — la prima riga sarebbe del 13.
  it('non lascia che la preferita scavalchi una data precedente', () => {
    const due = documento({
      weekly: [
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
        { operator_id: VERA, weekday: VENERDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [VERA, ALESSANDRA],
        preferredOperatorId: VERA,
        limit: 2,
      }),
    )
    expect(esito.rows).toEqual([
      { date: '2026-03-12', operatorId: ALESSANDRA, startCell: 108 },
      { date: '2026-03-13', operatorId: VERA, startCell: 108 },
    ])
  })

  // ⚠ discriminante: §8.3 dice che quando nessuna cliente è stata scelta NON
  // si applica alcuna preferenza. A parità di orario l ordine è quello in cui
  // il chiamante ha passato le operatrici, e resta stabile.
  it('senza preferita tiene l ordine in cui il chiamante ha passato le operatrici', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({
        finestra: decodificaFinestra(due),
        operatorIds: [ALESSANDRA, VERA],
        preferredOperatorId: null,
        limit: 2,
      }),
    )
    expect(esito.rows.map((r) => r.operatorId)).toEqual([ALESSANDRA, VERA])
  })

  // ⚠ discriminante: `nowCell` si applica SOLO a `today`. Se si applicasse a
  // ogni giorno, il 19 marzo perderebbe il mattino.
  it('filtra l ora corrente solo sul giorno che è oggi', () => {
    const esito = cercaPosti(ingressoCerca({ today: '2026-03-12', nowCell: 150, limit: 3 }))
    expect(esito.rows[0]).toEqual({ date: '2026-03-12', operatorId: VERA, startCell: 150 })
    const soloFuturi = cercaPosti(ingressoCerca({ today: '2026-03-12', nowCell: 288, limit: 1 }))
    expect(soloFuturi.rows[0]?.date).toBe('2026-03-19')
    expect(soloFuturi.rows[0]?.startCell).toBe(108)
  })

  // ⚠ discriminante: D2-7. Fra 28 giorni ci sono un giorno chiuso e uno aperto
  // ma pieno: il motivo riportato è quello del giorno aperto, perché estendere
  // l orizzonte ha senso solo in quel caso.
  it('riporta full quando almeno un giorno era aperto e pieno', () => {
    const pieno = documento({
      weekly: [{ operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 }],
      occupancy: [
        {
          appointment_id: 'a1',
          operator_id: VERA,
          date: '2026-03-12',
          start_cell: 108,
          cell_count: 6,
          buffer_after_cells: 0,
        },
      ],
      closures: [
        {
          start_date: '2026-03-19',
          end_date: '2026-04-09',
          from_boundary: null,
          to_boundary: null,
          reason: 'Ferie',
        },
      ],
    })
    const esito = cercaPosti(ingressoCerca({ finestra: decodificaFinestra(pieno) }))
    expect(esito.rows).toEqual([])
    expect(esito.reason).toBe('full')
  })

  it('riporta salone chiuso quando ogni giorno dell orizzonte lo è', () => {
    const chiuso = documento({
      closures: [
        {
          start_date: '2026-03-01',
          end_date: '2026-05-01',
          from_boundary: null,
          to_boundary: null,
          reason: 'Ferie',
        },
      ],
    })
    const esito = cercaPosti(ingressoCerca({ finestra: decodificaFinestra(chiuso) }))
    expect(esito.reason).toBe('salon_closed')
  })

  // ⚠ discriminante: è §13.1 riga per riga — «ogni dayStatus col suo motivo,
  // COMPRESA la chiusura parziale che svuota il giorno, che deve leggersi
  // chiusa e non piena» — percorsa DA CAPO A FONDO, dal documento grezzo fino
  // al codice di motivo. È l esempio del 24 dicembre: il salone chiude alle
  // 13:00 e l operatrice lavorava 09:00–13:00. Le due metà di questa regola
  // sono provate separatamente nei Task 3 e 5, e questa è l unica prova che le
  // congiunge: una rottura del cablaggio fra i due moduli resterebbe verde
  // senza di lei.
  it('porta una chiusura parziale fino al motivo salone chiuso', () => {
    const vigilia = documento({
      weekly: [{ operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 156 }],
      closures: [
        {
          start_date: '2026-03-12',
          end_date: '2026-03-12',
          from_boundary: 96,
          to_boundary: 156,
          reason: 'Vigilia',
        },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({ finestra: decodificaFinestra(vigilia), days: 1 }),
    )
    expect(esito.rows).toEqual([])
    expect(esito.reason).toBe('salon_closed')
  })

  it('riporta servizio troppo lungo quando non sta in nessun giorno aperto', () => {
    const esito = cercaPosti(ingressoCerca({ durations: [60], buffers: [0] }))
    expect(esito.rows).toEqual([])
    expect(esito.reason).toBe('service_too_long')
  })

  // Di contorno, NON discriminante: `cercaPosti` cicla solo su `operatorIds`,
  // quindi questa asserzione è vera per costruzione e nessuna mutazione può
  // renderla rossa. Resta perché documenta la divisione di responsabilità di
  // §7.4 — l insieme delle idonee lo risolve il chiamante — ma non conta come
  // presidio: il presidio vero sulle disattivate è nel Task 10.
  it('non propone un operatrice che non è nell elenco ammesso', () => {
    const due = documento({
      weekly: [
        { operator_id: VERA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
        { operator_id: ALESSANDRA, weekday: GIOVEDI, start_boundary: 108, end_boundary: 114 },
      ],
    })
    const esito = cercaPosti(
      ingressoCerca({ finestra: decodificaFinestra(due), operatorIds: [VERA], limit: 50 }),
    )
    expect(esito.rows.every((r) => r.operatorId === VERA)).toBe(true)
  })
})
```

- [ ] **Passo 2: eseguirle e verificare che falliscono**

```bash
npm test -- tests/dominio/cercaposti.test.ts
```

Atteso: FALLISCE — `Failed to resolve import "../../src/dominio/finestra"`.

- [ ] **Passo 3: scrivere la decodifica**

`src/dominio/finestra.ts`:

```ts
// Dal documento JSON di `public.availability_window` ai tipi del dominio.
// I nomi dei campi del documento sono quelli delle colonne — in inglese e con
// il trattino basso — e questo modulo è l'unico posto dove compaiono.

import { risolviGiorno } from './fasce'
import type { Chiusura, Eccezione } from './fasce'
import { blocco, giornoSettimana } from './tempo'
import type { Blocco, Fascia, StatoGiorno } from './tipi'

export interface RigaSettimana {
  readonly operator_id: string
  readonly weekday: number
  readonly start_boundary: number
  readonly end_boundary: number
}

export interface RigaEccezione {
  readonly operator_id: string
  readonly date: string
  readonly ranges: readonly { readonly start_boundary: number; readonly end_boundary: number }[]
}

export interface RigaChiusura {
  readonly start_date: string
  readonly end_date: string
  readonly from_boundary: number | null
  readonly to_boundary: number | null
  readonly reason: string
}

/** Porta `cell_count` grezzo: l'ultima cella la calcola `blocco()` (D2-1). */
export interface RigaOccupazione {
  readonly appointment_id: string
  readonly operator_id: string
  readonly date: string
  readonly start_cell: number
  readonly cell_count: number
  readonly buffer_after_cells: number
}

export interface DocumentoFinestra {
  readonly weekly: readonly RigaSettimana[]
  readonly exceptions: readonly RigaEccezione[]
  readonly closures: readonly RigaChiusura[]
  readonly occupancy: readonly RigaOccupazione[]
}

export interface GiornoRisolto {
  readonly ranges: Fascia[]
  readonly dayStatus: StatoGiorno
  readonly occupancy: Blocco[]
}

export interface Finestra {
  giorno(operatorId: string, date: string): GiornoRisolto
}

export function decodificaFinestra(documento: DocumentoFinestra): Finestra {
  // Indicizzato per (operatrice, giorno della settimana): la settimana tipica
  // non ha date, e sceglierla per data sarebbe il difetto che §5.2 previene.
  const perSettimana = new Map<string, Fascia[]>()
  for (const r of documento.weekly) {
    const chiave = `${r.operator_id}|${r.weekday}`
    const fasce = perSettimana.get(chiave) ?? []
    fasce.push({ startBoundary: r.start_boundary, endBoundary: r.end_boundary })
    perSettimana.set(chiave, fasce)
  }

  // Indicizzate per (operatrice, DATA): un'eccezione vale per la sua data e
  // per la sua operatrice, e per nessun'altra.
  const perEccezione = new Map<string, Eccezione>()
  for (const r of documento.exceptions) {
    perEccezione.set(`${r.operator_id}|${r.date}`, {
      ranges: r.ranges.map((f) => ({ startBoundary: f.start_boundary, endBoundary: f.end_boundary })),
    })
  }

  // `blocco()` e non un oggetto letterale: è l'unico posto che calcola
  // l'ultima cella occupata (D2-1), ed è anche la porta che rifiuta una riga
  // fuori dominio invece di lasciarla entrare in silenzio.
  const perOccupazione = new Map<string, Blocco[]>()
  for (const r of documento.occupancy) {
    const chiave = `${r.operator_id}|${r.date}`
    const blocchi = perOccupazione.get(chiave) ?? []
    blocchi.push(blocco(r.appointment_id, r.start_cell, r.cell_count, r.buffer_after_cells))
    perOccupazione.set(chiave, blocchi)
  }

  return {
    giorno(operatorId: string, date: string): GiornoRisolto {
      // Una chiusura copre un INTERVALLO di date: si confrontano le stringhe,
      // che per il formato YYYY-MM-DD ordinano come le date.
      const chiusure: Chiusura[] = documento.closures
        .filter((c) => c.start_date <= date && c.end_date >= date)
        .map((c) => ({ fromBoundary: c.from_boundary, toBoundary: c.to_boundary }))

      const risolto = risolviGiorno({
        weekly: perSettimana.get(`${operatorId}|${giornoSettimana(date)}`) ?? [],
        exception: perEccezione.get(`${operatorId}|${date}`) ?? null,
        closures: chiusure,
      })

      return {
        ranges: risolto.ranges,
        dayStatus: risolto.dayStatus,
        occupancy: perOccupazione.get(`${operatorId}|${date}`) ?? [],
      }
    },
  }
}
```

- [ ] **Passo 4: scrivere il cercaposti**

`src/dominio/cercaposti.ts`:

```ts
// Il cercaposti: il percorso del telefono che squilla. Spec §8.3.

import type { Finestra } from './finestra'
import { proposeStarts } from './proposte'
import { sommaGiorni } from './tempo'
import type { IndiceCella, MotivoAssenza } from './tipi'

/** Spec §8.3: l'orizzonte è di 28 giorni, estremi compresi. */
export const ORIZZONTE_GIORNI = 28

export interface RigaProposta {
  readonly date: string
  readonly operatorId: string
  readonly startCell: IndiceCella
}

export interface IngressoCercaposti {
  readonly from: string
  readonly days: number
  /** Già ristretto alle operatrici ATTIVE che eseguono i servizi (§7.4). */
  readonly operatorIds: readonly string[]
  readonly finestra: Finestra
  readonly durations: readonly number[]
  readonly buffers: readonly number[]
  readonly excludeAppointmentIds: readonly string[]
  /** La data civile di oggi in Europe/Rome, o `null` se non serve filtrare. */
  readonly today: string | null
  readonly nowCell: IndiceCella | null
  readonly preferredOperatorId: string | null
  readonly limit: number
}

export interface EsitoCercaposti {
  readonly rows: RigaProposta[]
  readonly reason: MotivoAssenza | null
}

/**
 * D2-7: quando 28 giorni non danno niente, si riporta il motivo PIÙ
 * INFORMATIVO fra quelli raccolti. `full` per primo perché esistono giorni in
 * cui il servizio ci starebbe, quindi «estendi l'orizzonte» è un consiglio
 * sensato; `service_too_long` per secondo perché estendere non servirà mai.
 */
const PRECEDENZA_MOTIVI: readonly MotivoAssenza[] = [
  'full',
  'service_too_long',
  'operator_off',
  'salon_closed',
]

export function cercaPosti(ingresso: IngressoCercaposti): EsitoCercaposti {
  const rows: RigaProposta[] = []
  const motiviVisti = new Set<MotivoAssenza>()
  const ordineChiamante = new Map(ingresso.operatorIds.map((id, i) => [id, i]))

  for (let scarto = 0; scarto < ingresso.days; scarto++) {
    const date = sommaGiorni(ingresso.from, scarto)

    // Si raccoglie l'INTERA giornata, di tutte le operatrici, prima di
    // ordinare e prima di troncare (D2-11): tagliare dentro il ciclo delle
    // operatrici riempiva la prima pagina con cinque proposte della stessa
    // persona a cinque minuti l'una dall'altra, e l'altra operatrice che
    // lavorava quel giorno non compariva mai.
    const delGiorno: RigaProposta[] = []
    for (const operatorId of ingresso.operatorIds) {
      const giorno = ingresso.finestra.giorno(operatorId, date)
      const esito = proposeStarts({
        date,
        ranges: giorno.ranges,
        occupancy: giorno.occupancy,
        durations: ingresso.durations,
        buffers: ingresso.buffers,
        // `nowCell` vale SOLO per il giorno che è oggi: applicarlo a ogni
        // giorno toglierebbe il mattino a tutte le date future.
        nowCell: ingresso.today !== null && date === ingresso.today ? ingresso.nowCell : null,
        excludeAppointmentIds: ingresso.excludeAppointmentIds,
        dayStatus: giorno.dayStatus,
      })

      if (esito.reason !== null) motiviVisti.add(esito.reason)
      for (const startCell of esito.starts) delGiorno.push({ date, operatorId, startCell })
    }

    // Ordine completo, e totale: orario, poi la preferita, poi l'ordine in cui
    // il chiamante ha passato le operatrici. La data è già fissata dal ciclo
    // esterno, quindi non può essere scavalcata da una preferenza.
    delGiorno.sort((a, b) => {
      if (a.startCell !== b.startCell) return a.startCell - b.startCell
      const preferitaA = a.operatorId === ingresso.preferredOperatorId ? 0 : 1
      const preferitaB = b.operatorId === ingresso.preferredOperatorId ? 0 : 1
      if (preferitaA !== preferitaB) return preferitaA - preferitaB
      return (ordineChiamante.get(a.operatorId) ?? 0) - (ordineChiamante.get(b.operatorId) ?? 0)
    })

    for (const riga of delGiorno) {
      rows.push(riga)
      if (rows.length >= ingresso.limit) return { rows, reason: null }
    }
  }

  if (rows.length > 0) return { rows, reason: null }
  const motivo = PRECEDENZA_MOTIVI.find((m) => motiviVisti.has(m)) ?? null
  return { rows, reason: motivo }
}
```

- [ ] **Passo 5: eseguire le prove e verificare che passano**

```bash
npm test -- tests/dominio/cercaposti.test.ts
npx tsc --noEmit
```

Atteso: PASSA, 21 prove.

- [ ] **Passo 6: ⚠ Sonda di mutazione**

| # | Mutazione | Prova che DEVE diventare rossa |
|---|---|---|
| 1 | in `finestra.ts`, indicizzare la settimana tipica per `date` invece che per `giornoSettimana(date)` | *«risolve un giorno dalla settimana tipica»* *(ampia: spegne tutta la decodifica)* |
| 2 | in `finestra.ts`, indicizzare le eccezioni per la sola `operator_id` | *«applica l eccezione solo alla sua data e alla sua operatrice»* |
| 3 | in `finestra.ts`, `c.start_date <= date && c.end_date >= date` → `c.start_date === date` | *«applica una chiusura a ogni data del suo intervallo»* |
| 4 | in `finestra.ts`, non filtrare l'occupazione per `operator_id` | *«costruisce i blocchi con blocco() e li filtra per giorno e operatrice»* |
| 5 | in `finestra.ts`, sostituire `blocco(...)` con un oggetto letterale che usa `endCell: r.start_cell + r.cell_count` | *«costruisce i blocchi con blocco() e li filtra per giorno e operatrice»* |
| 6 | in `cercaposti.ts`, `scarto < ingresso.days` → `scarto < ingresso.days - 1` | *«arriva al ventottesimo giorno e non al ventinovesimo»* |
| 7 | in `cercaposti.ts`, troncare al limite DENTRO il ciclo delle operatrici, come la revisione 1 | *«ordina per orario fra le operatrici a parità di data»* |
| 8 | in `cercaposti.ts`, togliere il confronto su `startCell` dal comparatore | *«ordina per orario fra le operatrici a parità di data»* |
| 9 | in `cercaposti.ts`, togliere il confronto sulla preferita | *«mette la preferita prima a parità di orario»* |
| 10 | in `cercaposti.ts`, mettere il confronto sulla preferita PRIMA di quello sull'orario | *«non lascia che la preferita scavalchi un orario migliore»* — e **non** *«ordina per orario fra le operatrici a parità di data»*, che ha `preferredOperatorId` nullo e quindi non distingue i due ordini |
| 11 | in `cercaposti.ts`, spostare l'ordinamento fuori dal ciclo delle date, sull'elenco intero | *«non lascia che la preferita scavalchi una data precedente»* |
| 12 | in `cercaposti.ts`, togliere il confronto su `ordineChiamante` | **nessuna — EQUIVALENTE di fatto.** `Array.prototype.sort` è stabile per standard dal 2019, quindi a parità di tutto il resto l'ordine del chiamante si conserva da sé. Il confronto resta scritto perché un comparatore che dichiara l'ordine per intero non dipende da una garanzia della piattaforma, ma nessuna prova può ucciderne l'assenza |
| 13 | in `cercaposti.ts`, passare `ingresso.nowCell` sempre invece che solo su `today` | *«filtra l ora corrente solo sul giorno che è oggi»* |
| 14 | in `cercaposti.ts`, mettere `salon_closed` in testa a `PRECEDENZA_MOTIVI` | *«riporta full quando almeno un giorno era aperto e pieno»* |
| 15 | in `cercaposti.ts`, non propagare `giorno.dayStatus` e passare sempre `'open'` | *«porta una chiusura parziale fino al motivo salone chiuso»* |

⚠︎ Le mutazioni 8 e 10 vanno provate **tutte e due**: la 8 toglie l'orario dal comparatore, la 10 lo retrocede dietro la preferenza. Sono due modi diversi di rompere D2-11 e li colgono due prove diverse.

- [ ] **Passo 7: eseguire la suite intera e il gate a freddo**

```bash
npx supabase db reset
npm test
npx tsc --noEmit
```

Atteso: PASSA, `Test Files 18 passed (18)`, con l'output reale incollato nel rapporto — mai un «passa».

- [ ] **Passo 8: commit**

```bash
git add src/dominio/finestra.ts src/dominio/cercaposti.ts tests/dominio/cercaposti.test.ts
git commit -m "feat(dominio): il cercaposti su 28 giorni, ordinato per orario fra le operatrici"
```

---
## Auto-revisione

**Copertura della spec.**

| Sezione | Dove | Nota |
|---|---|---|
| §5, §5.1 | Task 1 | I due domini, le date come stringhe, le guardie |
| §5.2 | Task 1 | Solo la metà TypeScript. La metà SQL non ha casa in questo piano, deliberatamente: vedi *Vincoli globali* |
| §7.1 passi 1–2 | Task 2 | L'eccezione sostituisce, zero fasce è assenza |
| §7.1 passo 3 | Task 3 | La sottrazione delle chiusure |
| §7.1 passo 4, §7.2 | Task 4 | La piega. **L'ORDINE fra passo 3 e passo 4 non è presidiato**: non è osservabile — vedi *Limiti dichiarati* |
| §6.6 | Task 3 | La chiusura batte l'eccezione, che batte la settimana tipica |
| §7.3 | Task 6, 7, 8 | Le partenze, il riassetto simmetrico sul vicino, la visita multipla |
| §7.4 | Task 5, 9 | Il contratto, i quattro motivi, `nowCell`, `excludeAppointmentIds`, la restrizione alle attive (D2-10) |
| §7.5 | Task 10 | Una sola query a intervallo di date, misurata su **due** date |
| §8.3 | Task 11 | 28 giorni, ordine per orario, operatrice preferita, il motivo nel vuoto. **La paginazione no**: vedi *Limiti dichiarati* |
| §13.1 | Task 1–9, 11 | Vedi sotto |

**§13.1, caso per caso.** Una fascia che finisce sull'ultimo confine e un appuntamento attaccato a un capo → Task 6. Due fasce che si toccano, dove la candidata va accettata → Task 4 e 6. Tre fasce che si toccano → Task 4. Una vera pausa pranzo, dove la candidata a cavallo è rifiutata → Task 4 e 6. Un'eccezione che accorcia il giorno, una che lo allunga, una childless → Task 2. Una chiusura parziale che spacca una fascia in due → Task 3. Ogni `dayStatus` con il suo motivo, **compresa la chiusura parziale che svuota il giorno** → Task 3 e 5 per le due metà, **e Task 11 per il percorso da capo a fondo**. Un servizio più lungo di qualunque fascia → Task 5, con la fascia più lunga che non è la prima. Una visita multiservizio che ci sta solo senza le pause → Task 8. La pausa del precedente onorata quando non segue niente, e la propria quando non precede niente → Task 7. `excludeAppointmentIds` con uno spostamento di una cella e con una visita da due servizi → Task 9. `nowCell` con le celle passate di oggi escluse e i giorni futuri non filtrati → Task 9.

**Fuori perimetro, dichiarato.** Le **finestre dei compleanni** di §13.1 sono l'unico caso di quell'elenco che questo piano non copre: appartengono alla schermata *Compleanni* di §9.7 e leggono `client.birth_date`, senza toccare né la risoluzione delle fasce né la proposta né `availability_window`. Che §13.1 le elenchi sotto il titolo «The proposal function» è una stranezza della spec, non del piano. L'aritmetica di calendario che servirà loro — fine mese, fine anno, 29 febbraio — è **già in casa**: `sommaGiorni` la prova al Task 1 su `2026-03-12 + 28` e `2028-02-28 + 1`. Al piano 3 resta la finestra, non il calendario.

**Anche fuori perimetro, per costruzione:** §7.6 (il restringimento della disponibilità con prenotazioni dentro) è un percorso di **scrittura** con un elenco di telefonate da fare, e vive nel piano 3; §10.5 (`RETRY-40P01`) è un obbligo sul percorso di scrittura e non esiste ancora un percorso di scrittura applicativo da ritentare. Per §8.4 vedi *Limiti dichiarati*: metà è interfaccia, metà è un'estensione dell'ingresso del dominio che il piano 3 dovrà fare.

**Caccia ai segnaposto.** Nessun «da definire», nessun «gestire gli errori in modo appropriato», nessun «scrivere le prove per quanto sopra». Ogni passo che chiede codice porta il codice. Ogni sonda di mutazione ha un esito atteso definito e nomina la prova che deve diventare rossa, con tre eccezioni **scritte per nome**: la sonda 13 del Task 10, dove l'assenza di una prova capace di coglierla *è* il reperto; le mutazioni dichiarate **equivalenti** nei Task 3, 7 e 9, che non vanno inseguite; e le sonde marcate *(ampia)*, il cui esito verde/rosso non dice niente sulla prova nominata perché spengono mezza funzione.

**Conteggio delle prove.** `tempo` 15, `fasce` 24, `proposte` 36, `cercaposti` 21, `availability-window` 15 — **111 prove nuove**, che si sommano alle 145 del piano 1 per un totale di **256**, su **18** file.

**Coerenza dei tipi.** `startBoundary` / `endBoundary` / `startCell` / `endCell` / `cellCount` / `bufferAfterCells` / `appointmentId` / `dayStatus` / `nowCell` / `excludeAppointmentIds` si scrivono identici in tutti i task e coincidono con spec §7.4. `Fascia`, `Blocco`, `StatoGiorno`, `MotivoAssenza` sono dichiarati una volta sola nel Task 1 e importati ovunque. `risolviGiorno` restituisce `{ ranges, dayStatus }` nei Task 2, 3, 4 e 11. `campataOccupata` è esportata nel Task 5 e provata nel Task 8. `proposeStarts` mantiene la stessa firma dal Task 5 all'11 — **ma la firma non è congelata contro il piano 3**, che dovrà estenderla per §8.4.

**Una divergenza di nome, deliberata.** Nel documento JSON di `availability_window` i campi sono con il trattino basso (`start_boundary`, `cell_count`) perché sono nomi di colonne; nei tipi del dominio sono in cammello (`startBoundary`, `cellCount`) perché sono nomi di TypeScript. La traduzione avviene **in un punto solo**, `src/dominio/finestra.ts`, che è la ragione per cui quel modulo esiste separato.

**Che cosa ha cambiato la prima revisione.** Vale la pena scriverlo, perché la lezione è più utile dell'elenco: i due difetti peggiori erano **attese numeriche sbagliate dentro prove che il piano stesso eleggeva a presidio**. Una diceva `[123..132]` dimenticando che la fascia continuava oltre il secondo blocco; l'altra chiedeva una partenza alle 09:05 in una fascia che ne ammetteva una sola. Nessuna delle due è stata trovata leggendo: entrambe sono venute fuori quando un revisore ha **eseguito** il codice. Quattro sonde di mutazione non potevano diventare rosse — tre perché la mutazione era semanticamente equivalente, una perché il fuso orario prescritto era quello in cui il difetto è invisibile — e un esecutore diligente avrebbe riscritto tre prove sane per inseguirle. Da qui la nuova riga nei *Vincoli globali*: prima di riscrivere una prova, chiedersi se la mutazione cambia davvero qualcosa.

**Che cosa ha cambiato la SECONDA revisione.** Due revisori hanno attaccato le correzioni della prima invece del piano originale, ed è servito: la correzione è il momento in cui si introducono difetti, e chi corregge è cieco esattamente dove ha appena guardato. Tre reperti su tutti:

- **avevo dichiarato equivalente una guardia di `sottrai` e lasciato viva la sua gemella speculare**, che è equivalente per lo stesso identico argomento. Dichiararne una e non l'altra è il modo tipico in cui questa classe sopravvive a una correzione;
- **la prova nuova che avevo scritto per coprire quel confine aveva scelto il valore sbagliato.** Una chiusura che finisce *esattamente* dove la fascia comincia non è osservabile; l'unico caso osservabile è una chiusura che sta *tutta prima*, e lì il difetto inventa quaranta minuti di disponibilità dove il salone è chiuso. Avevo presidiato il caso innocuo;
- **D2-11 non era misurata nel suo punto centrale:** nessuna prova combinava una preferita valorizzata con orari d'inizio diversi, cioè esattamente ciò che quella decisione fissa. Era coperta solo nel caso del pareggio.

**Dove questo piano può ancora sbagliare.** Il Task 10 è stato misurato contro il database vero da un revisore che ha creato la funzione in uno schema suo: quindici prove su quindici passano e sedici sonde su diciassette uccidono la prova nominata — la diciassettesima, il rinomino del file, nessuno l'ha potuta provare senza il CLI, ed è il primo passo del Passo 6. Restano non misurati: il comportamento su un runner di CI, e le quattro asserzioni che ancora usano `toContain` invece di vincolare l'elenco intero, che è la forma in cui si era nascosto il difetto peggiore della prima revisione.
