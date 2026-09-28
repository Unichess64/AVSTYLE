# Piano 3b — primo giro di revisione avversariale: registro

**Data:** 28 settembre 2026
**Documento rivisto:** `docs/superpowers/specs/2026-09-28-piano-3b-dove-c-e-posto-design.md`, **revisione 1**, al commit
`0eac788`
**Base di codice durante il giro:** da `0eac788` a `86d4223` — ⚠︎ il Task 8 del piano 3a-1 **è stato committato
durante il giro** (`86d4223`, «la tabella degli annunci»). Due revisori hanno letto `0019_annunci.sql` prima del
commit, uno dopo. Vedi R16.
**Revisori:** cinque, indipendenti, tutti su Opus, lenti distinte, tutti in sola lettura. Nessuno ha eseguito Vitest,
nessuno ha toccato il database, nessuno ha modificato un file, nessuno ha creato un temporaneo.

| # | Lente | Bloccanti trovati |
|---|---|---|
| R-1 | Il contratto esteso di `cercaPosti` — cursore, passo, fuori orario, motivi, durate | 2 |
| R-2 | **Costruire** la tabella completa dei casi delle due chiamate di §4.5, poi verificarla | 2 |
| R-3 | Dati personali, sicurezza, confini fra i piani | 2 |
| R-4 | Completezza: il contratto frase per frase | 4 |
| R-5 | Lente cieca: dipendenze in volo, censimento dei `[misurato]`, composizione fra le chat | 3 |

**Esito: 13 bloccanti nominali → 10 distinti dopo la deduplicazione → 1 falso.** Quattro chiusi da decisioni
dell'utente prese durante il giro, tre da correggere in prosa, due restano aperti in attesa del consulente privacy,
uno è falso. Più 38 maggiori e 41 minori.

Il documento **non passa**. Per il criterio di §15 della spec, un giro che trova bloccanti non è l'ultimo.

---

## 1. Dove l'autocontrollo aveva ragione, e dove no

La revisione 1 dichiarava in §15 sette zone debolī. Vale misurare quanto valeva quell'autodenuncia, perché è l'unico
strumento che chi scrive ha per indirizzare chi rivede.

| Zona dichiarata | Esito |
|---|---|
| §15.2 — «cursore e passo, cursore e fuori orario, le coppie da guardare per prime» | **Centrata.** Entrambi i bloccanti di R-1 e uno di R-2 e R-4 stanno lì |
| §15.3 — «le due chiamate di §4.5 descritte a parole e non in una tabella dei casi» | **Centrata, e sottostimata.** R-2 ha costruito la tabella: **sei** dei suoi sedici reperti stanno lì e nessuno era visibile senza la tabella |
| §15.1 — «nessun numero è misurato per esecuzione» | Onesta e rispettata: R-5 ha censito **43** citazioni `[misurato]` e **nessuna** era un numero di esecuzione spacciato per misurato. I difetti sono di **sede** (sei) e di **uso** (due) |
| §15.4 — «il confine col 3a-2 è assunto e non verificato» | **Insufficiente.** Il buco vero non era col 3a-2 ma col piano 4, e non era un'assunzione fragile: era una **contraddizione già in essere** (R9, R10) |
| §15.5 — «l'annuncio poggia su una tabella in volo» | Onesta, e il rischio si è materializzato al contrario: la tabella è stata **consegnata** durante il giro (R16) |
| §15.6 — «§6 non dice che cosa vede una nata il 29 febbraio il 28 febbraio bisestile» | Nessun revisore l'ha sollevato: la dichiarazione ha funzionato come doveva |
| §15.7 — «la visita a due mani non è dimensionata» | Nessun revisore l'ha contestata |

**La lezione:** l'autodenuncia ha indirizzato bene sulle zone **tecniche** che chi scrive sospettava, e non ha visto
la classe in cui stavano tre bloccanti su dieci — le **contraddizioni con i documenti fratelli scritti nelle stesse
ore**. Una zona debole si dichiara solo se si sospetta; i documenti degli altri non si sospettano, si leggono.

---

## 2. I bloccanti, deduplicati

### 2.1 Chiusi da decisioni dell'utente prese durante il giro

| # | Reperto | Trovato da | Chiuso da |
|---|---|---|---|
| **R1** | **`fuoriOrario` come criterio d'ordine più esterno è incompatibile con il troncamento per giorno** che §4.1 dichiara vincolante (D2-11, `cercaposti.ts:56-98`). Con la struttura di oggi la pagina 1 si riempie delle righe fuori orario del giorno 1 mentre esistono posti dentro orario nel giorno 2 — letteralmente il danno che §4.5 dichiarava di prevenire. Secondo danno: l'ordine di emissione diverge da quello con cui il cursore decide «dopo questa riga», quindi righe perdute o ripetute in silenzio | **R-1 (B2), R-2 (B1), R-4 (B3)** — tre revisori, tre lenti | **D3b-14**: i ripieghi si mescolano **per giorno**. L'ordine torna `(date, fuoriOrario, startCell, preferita?, ordineChiamante)`, il criterio non sta più davanti alla data, e il troncamento per giorno resta valido. Il bloccante **sparisce** invece di essere rattoppato |
| **R2** | **Il motivo per riga non è calcolabile da ciò che il motore espone.** `GiornoRisolto` porta `ranges`, `dayStatus`, `occupancy`; le chiusure sono consumate dentro `risolviGiorno`, quindi a valle non si sa quali celle ha tagliato una chiusura. Su un giorno `'open'` con chiusura 13–14 la riga delle 13:20 direbbe «fuori dai suoi orari» — **incolpa l'operatrice per un salone chiuso**, che è il difetto che spec §7.4 ha corretto esplicitamente il 22/09. Su un giorno svuotato da una chiusura parziale direbbe «salone chiuso» anche nelle ore in cui è aperto | **R-2 (B2), R-4 (B4)** | **D3b-11**: due soli motivi, «Vera non lavora» e «fuori dagli orari inseriti». La frase «salone chiuso» non si usa per riga. **Nessuna sesta estensione al motore**, e §4.1 torna a dire il vero quando dice «il motore non si tocca» |
| **R3** | **`salva_cliente` e `cancella_cliente` non hanno codice d'invio**, quindi né D3-9 né «Controlla» (D3-21). Risposta persa dopo un `COMMIT` riuscito → il secondo «Salva» parte con la versione vecchia → `modificata_altrove` → l'app dice *«è stata modificata da una collega»* mostrandole **la sua stessa correzione**. È il caso per cui il 3a ha speso sette giri, riaperto su una schermata nuova | **R-3 (M5), R-4 (B2), R-5 (M9)** — tre revisori | **D3b-12**: codice d'invio e «Controlla» su entrambe le funzioni |
| **R4** | **Il «+» flottante non è di nessun piano.** 3a §3.1: «nessun +»; piano 3a-2: «è del 3b»; spec 3c: «non stabilito»; spec 3b: solo sotto «Route:». Il cercaposti ha una sola rotta (spec §9.5, §9.11) e nessuno la costruisce | **R-4 (B1)** | **D3b-13**: lo prende il 3b |

### 2.2 Da correggere in prosa, in questo giro

| # | Reperto | Trovato da | Rimedio |
|---|---|---|---|
| **R5** | **Il segno «dentro/fuori» ha due criteri incompatibili.** §4.5 dice «le partenze **nuove** rispetto alla prima chiamata sono fuori orario»; §4.5 poco sotto, §4.3 e la mutazione di §9.1 dicono «l'appartenenza **alla fascia risolta**». Divergono su una riga che esiste sempre: la partenza il cui **inizio** sta dentro la fascia ma la cui **campata** la scavalca. Con fascia 09:00–13:00 e campata 6 celle, `proposeStarts` si ferma a `inizio = 150` (`proposte.ts:85`): la partenza 153 è «nuova» (→ fuori) ma il suo `startCell` appartiene alla fascia (→ dentro). Danno: una proposta che **sfonda la fine del turno** mostrata fra quelle normali, senza intestazione e senza l'avviso ambra; e sul percorso paginato, emissione e confronto del cursore con criteri diversi | **R-1 (B1), R-2 (M2)**, e R-4 per implicazione | «Una riga è **dentro orario** se e solo se la sua **campata intera** `[inizio, inizio + campata)` sta in **una** fascia risolta — equivalentemente, se figura fra le partenze della **prima** chiamata. L'appartenenza del solo `startCell` non è il criterio.» Le due formulazioni coincidono perché `occupancy`, `excludeAppointmentIds` e `nowCell` sono identici nelle due chiamate |
| **R6** | **D3b-6 svuota il presidio su cui il piano 4 costruisce il diritto di opposizione**, e gli consegna un requisito insoddisfacibile. Il piano 4 §5.5 legge spec §9.7 come esclusione — «la lista è la sua unica fonte; una cliente che compare in lista riceverà gli auguri» — e riga 576 [misurato] consegna al 3b: «l'esclusione va presidiata da una prova che diventa rossa se il filtro `no_messages` sparisce». D3b-6 toglie quel filtro. Il piano 4 §9 fissa il contenuto dell'**informativa esposta in salone**: scritta su §5.5 come sta, direbbe alla cliente una cosa che l'app non fa | **R-5 (B2)**, e **R-4 (M8)** indipendentemente | Il 3b scrive il limite in §8, dichiara che D3b-6 (decisione dell'utente) **supera** la lettura letterale, e propone il presidio equivalente — «la riga con l'opt-out non ha nessuna azione». **Va mandato un messaggio alla chat del piano 4**: §5.5, §9.4 e il requisito di prova vanno rifatti |
| **R7** | **Il pulsante «esporta la sua scheda» non è di nessuno.** Il 3b (§5.6): «il pulsante **non c'è**, e la schermata non mostra un pulsante disattivato». Il piano 4, righe 127-128 e 597 [misurato]: i **pulsanti** di spec §9.6, compreso «esporta la sua scheda», sono «**piano 3b**»; i **meccanismi** sono suoi (L4-2). Composto: il piano 4 costruisce la funzione e nessuno costruisce il pulsante. Conseguenza: il limite 6 di §8 — che il 3b chiama giustamente «il più serio, perché è l'unico che riguarda un diritto dell'interessata» — passa da **temporaneo** a **permanente**, e il 3b lo dichiara solo come temporaneo | **R-5 (B3)** | §5.6 dichiara che il **posto** del pulsante è del 3b e il **meccanismo** del piano 4, e il limite 6 dice che senza quella cucitura il pulsante non è di nessuno |

### 2.3 Aperti: aspettano il consulente privacy, non una correzione

| # | Reperto | Trovato da | Stato |
|---|---|---|---|
| **R8** | **§5.5 pretende «una riga sull'informativa», ma l'informativa è del piano 4**, che arriva **dopo** il primo uso vero (D19). E spec §14 **domanda 4** — «basta un'informativa esposta in salone, dato che la maggior parte delle clienti è registrata **al telefono**?» — è aperta **esattamente sullo scenario di §5.5**. Il documento non nomina né la cosa né la domanda | **R-3 (B1)** | Si chiude con la **risposta del consulente**, non con prosa. Fino ad allora: il 3b lo dichiara in §8, e la sua chiusura è un elemento della lista di verifiche prima del rilascio del **3c** |
| **R9** | **La base giuridica degli auguri è spec §14 domanda 2**, aperta e bloccante per il rilascio: «la data di nascita è raccolta solo per l'augurio, quindi se quello scopo non ha base, il campo non ce l'ha. L'obbligo di consenso si attacca alla **comunicazione**, non allo strumento: mandarlo a mano non lo evita». `no_messages` ha `default false` [misurato: `0003:22`]: lo stato di difetto è **messaggiabile**. Il 3b è il piano che rende il messaggio spedibile, e D3b-6 allarga chi compare in lista. §5.3 fa la cosa giusta per la domanda 1 (lo storico come possibile dato sanitario) e non la fa per la 2 | **R-3 (B2), R-4 (M7)** | Come sopra. La schermata **si costruisce e si prova**; l'azione WhatsApp resta dietro la risposta |

### 2.4 Falso

| # | Reperto | Trovato da | Perché è falso |
|---|---|---|---|
| **R10** | «L'assunzione sui colori è già falsa: **D3c-6** cambia due colori su tre e la forma (coppie riempimento/bordo, l'eccezione del bianco sparisce), quindi §10 e §12 sono sbagliate» | **R-5 (B1)** | ⚠︎ **D3c-6 è REVOCATA**, e la revoca sta sulla riga stessa della decisione [misurato: spec 3c riga 119, «⚠︎ **REVOCATA.** Scioglieva una tensione che **non esiste**»], più la §4.1 «rifatta su D3-6, dopo la revoca di D3c-6» (riga 363) e la riga 1179. **D3-6 resta in vigore**: Vera `#C2185B`, Annalisa `#FFFFFF` con bordo, Alessandra `#9B1B1B`. §10 e §12 del 3b erano **corrette** |

⚠︎ **La lezione di R10 vale più del reperto.** Il revisore della lente cieca è l'unico a cui era stato chiesto di
comporre i rischi fra le quattro chat, e ha costruito un bloccante su una decisione che il documento fratello aveva
**ritirato sulla stessa riga in cui la scrive**. La composizione fra documenti scritti in parallelo non si fa
leggendo le decisioni: si fa leggendo **anche la colonna delle note**, dove una revoca vive. E chi rivede una
composizione va tenuto allo stesso standard di chi la scrive: un fatto su un documento fratello si cita con la
revisione e con la riga, e si rilegge prima di consegnare.

---

## 3. I maggiori che cambiano il piano d'esecuzione

Trentotto in tutto; questi otto sono quelli che cambiano che cosa il piano costruisce. Gli altri sono nella
revisione 2 del documento.

| # | Dove | Reperto | Trovato da |
|---|---|---|---|
| **M1** | §4.7 | **La regola «`motivi` è vuota quando `rows` non è vuota» annulla esattamente il caso che motiva D3b-4.** Se Vera dà righe e Alessandra no, `rows` non è vuota → `motivi` vuota → il fatto «Alessandra non ha una fascia abbastanza lunga» è buttato. Secondo danno: con il cursore, una **pagina vuota** (l'ultima riga prenotata fra due pagine) popola `motivi` e annuncia «Vera è piena» **dopo** venti proposte di Vera | R-1 |
| **M2** | §4.5 | **`ranges: [unione(fasce risolte, ripiego)]` non è scrivibile.** L'unione di due intervalli disgiunti non è un intervallo: una fascia 07:00–07:30 con ripiego 08:00–20:00 lascia scoperto 07:30–08:00, e lo scafo `[84,240)` lo proporrebbe. La forma corretta è `piega([...fasceRisolte, ripiego])` — **una o due** fasce; `piega()` è già esportata (`fasce.ts:83`) e `proposeStarts` scorre più fasce ordinate senza piegarle (`proposte.ts:75`), quindi concatenare senza piegare duplicherebbe le partenze e romperebbe l'unicità del cursore | R-1 (M2), R-2 (M1) |
| **M3** | §9.1, D3b-10 | **La sonda di `SEGUENTE-VICINO` è mal nominata e su un lato già chiuso.** Verificato alla sede: `test-audit.md` registra `:141` `b.startCell <` → `>` come **NOT CAUGHT — R1, confermato** (l'unico aperto); `:138` `b.endCell >` → `<` come **CAUGHT** da `tests/dominio/proposte.test.ts:297`; e `:138` `b.endCell < inizio` → `<=` come **equivalente**, con l'avviso dei findings di non inseguirlo. La ragione sotto D3b-10 — «su entrambi i lati del gemello» — è falsa, e D3b-10 si riduce a **una** prova | R-1 (M5), R-4 (M2), R-5 (M1) — tre revisori, stessa sede |
| **M4** | §4.4, §4.7 | **Il passo può azzerare le righe di un'operatrice senza generare alcun motivo:** `proposeStarts` ha risposto `reason: null`, `cercaPosti` scarta tutto perché fuori quarto d'ora, `motivi` non ha nulla da dire. Nel caso estremo `rows` vuota **e** `motivi` vuota: è il difetto di `days: 0` che §4.8 corregge, reintrodotto da D3b-1 | R-1 (M4) |
| **M5** | §4.3, §4.5 | **`RigaProposta` non viene mai ridefinita**, ma §4.3 e §4.5 pretendono da lei il segno e il motivo per riga. E il motivo per riga non è uno dei quattro codici di `MotivoAssenza`, che `tipi.ts` dichiara congelati dalla spec §7.4: infilarcelo romperebbe un tipo dichiarato congelato | R-1 (M6) |
| **M6** | §4.8 | **Le guardie coprono i tre contorni del piano 2 e nessuno dei cinque campi nuovi**, che hanno lo stesso profilo. `passoCelle: 0` → `startCell % 0` è `NaN` → **zero righe su tutto l'orizzonte, senza motivo**; `ripiego` invertito → interruttore silenziosamente inerte; `durations` per operatrice → `RangeError` da dentro `proposeStarts` con un messaggio che **non nomina l'operatrice**, mentre §4.2 dichiara la regola «per ciascuna» e §9.1 non le dà nessuna prova | R-1 (M7) |
| **M7** | §9.2 | **Il conteggio delle funzioni nuove è tre e sono quattro** (la quarta è quella del trigger d'annuncio di §7, l'unica `security definer`), e **la regola «il grant è ridondante, conta il revoke» vale solo per lo schema `public`**: sullo schema `app` il 3a-1 ha misurato che togliere il solo grant dà **19 rosse** [misurato: piano 3a-1 riga 6617, «Il `grant execute … to authenticated` NON è ridondante qui»]. L'audit di catalogo coprirebbe tre funzioni su quattro, e la scoperta è la `definer` | R-5 (M7) |
| **M8** | §7 | **La forma del trigger non si compone.** «Per istruzione» + «`is distinct from` nel corpo, la strada del Task 4»: i trigger del Task 4 sono `for each row`, e a livello di istruzione `OLD`/`NEW` non esistono — il confronto diventa una **giunzione** fra le tabelle di transizione. E serve una **funzione nuova**: `app.annuncia_giorni()` dispatcha su `tg_table_name` con un `else` che presume `visit_date` | R-5 (M6) |

---

## 4. Le sette divergenze di §14, verificate

Il documento dichiarava sette divergenze fra spec e realtà. In questo progetto le auto-accuse sono una classe con
molti falsi, quindi sono state verificate una per una.

| # | Divergenza dichiarata | Verdetto |
|---|---|---|
| 1 | spec §9.6 mette tre cose di cui **due** sono di §11.3 | **Vera nella sostanza, sbagliata nel conteggio**: spec §11.3 apre con «All three in §9.6» — sono **tre**, compresa la modifica. E la coda («nessuno dei due documenti nota la conseguenza») è falsa per il piano 4, che la nota in §1 e in L4-2 |
| 2 | 3a §4.8 e la sua prova statica sono enunciate **per tabella** | **Vera.** Ma la vittima nominata è sbagliata: vedi §5 qui sotto |
| 3 | una sola `durations` per più operatrici, e **nessun documento lo nota** | **Vera**, e cercata in spec §7.4/§8.3, 3a, findings e test-audit: nessuno la nomina |
| 4 | `cerca_clienti` tronca a 20 senza dirlo | **Vera**: `limit 20` compare solo nel testo della migrazione del Task 10 |
| 5 | `annuncio_giorni_non_vuoto` **fa fallire il chiamante** invece di far saltare l'annuncio | ⚠︎ **FALSA.** `app.annuncia_giorni()` ha **già** la guardia: `if v_giorni is null or cardinality(v_giorni) = 0 then` [misurato: `0019_annunci.sql:110`, verificato dall'orchestratrice dopo il commit `86d4223`]. E la ragione data per il Task 8 («un'istruzione su `appointment` tocca sempre almeno un giorno») è falsa: salta per **guardia esplicita**, che copre anche il nullo |
| 6 | `client_name_search` senza `lower`, la ricerca del Task 10 con `lower` | **Vera** |
| 7 | `ORIZZONTE_GIORNI` resta valore di difetto e il nome non lo dice | **Vera come fatto, mal classificata**: nessuna riga la applica come limite, e a portare `days` a 84 è D3b-3, decisa lo stesso giorno. È la conseguenza di una decisione, non un reperto trovato |

**Quattro vere, una vera con un errore di conteggio, una mal classificata, una falsa.** Nella media delle auto-accuse
di questo progetto, e la falsa è quella che avrebbe mandato qualcuno a cercare un difetto inesistente nel Task 8.

---

## 5. Il censimento delle citazioni `[misurato]`

Quarantatré citazioni sostanziali, verificate una per una da R-5 e a campione dall'orchestratrice.

**Nessuna è un numero di esecuzione spacciato per misurato**: la disciplina che il documento si dà in testa è
rispettata. I difetti sono di due classi:

**Sede sbagliata (otto).** `0002:31` → la colonna è a `:32`; `0003:30-34` → il vincolo è a `:31-34`;
`0003:42-43` → la politica è a `:43-44`; `0004:13` → `operator_id` è a `:14`; `0016:19-21` → la regola 11 è a
`:20-22`; `0019:27` → il vincolo è a `:26`; `cercaposti.ts:8` → la costante è a `:9`; `0012:37-40` → la firma è a
`:38-42`. Tutte verificate dall'orchestratrice: **confermate**.

**Uso sbagliato (due), che è la classe seria.**

- `0017_sposta_e_cancella.sql:46` citato per «`app.versione()` è la **sede unica** del formato»: `:46` è un **sito
  di chiamata**. La definizione è in `0013_invii_e_cancellate.sql:85` [verificato dall'orchestratrice]. Una riga che
  chiama non prova un'unicità.
- `0019:27` citato per «il vincolo **fa fallire** il chiamante»: il vincolo esiste, ma la conclusione è falsa perché
  la guardia lo precede (divergenza 5).

**Una attribuzione sbagliata.** «Il **piano 2** ha misurato i diciassette mesi di `last_activity_at`»: la sede è
`2026-09-17-foundations-findings.md`, cioè il **piano 1** [verificato dall'orchestratrice]. E lo **scenario** citato
è sbagliato: la misura è su due prenotazioni concorrenti della stessa cliente e la causa è il blocco di riga
assente, non «una scrittura a mano da un altro percorso». **Due revisori hanno corretto la stessa frase in modi
diversi, e non erano in conflitto: erano due errori nella stessa frase.**

**Due sedi inventate.** §10 attribuisce `1,71` a spec §9.12 e `16,8` a 3a §6.2: nessuno dei due numeri è lì
(spec §9.12 sul brand pink non porta numeri; la tabella di 3a §6.2 ha solo i tre colori delle operatrici). R-5 ha
ricalcolato `1,71` e torna (1,713), quindi **i valori sono buoni e le sedi false** — che è peggio di un valore
sbagliato, perché un valore sbagliato si scopre e una sede falsa si eredita.

---

## 6. La composizione fra le quattro chat

Quattro documenti scritti nelle stesse ore da quattro chat che **dichiarano tutte** di non aver letto le altre. Sei
cose si vedono solo leggendoli insieme, e una va nella colonna giusta.

1. **L'opt-out dei compleanni** (R6) — due sì ragionevoli che si sommano in una frase falsa nell'informativa e in un
   requisito di prova insoddisfacibile. Il caso di scuola: nessuna delle due decisioni, presa da sola, è sbagliata.
2. **Il pulsante d'export** (R7) — il 3b lo rifiuta, il piano 4 glielo assegna. Composto: non è di nessuno.
3. **Il «+» flottante** (R4) — tre piani lo nominano, nessuno lo prende.
4. **I numeri di migrazione** — tutte e tre le spec adottano la **stessa** mitigazione («libero sul disco **e** non
   rivendicato da nessun piano») e tutte e tre **rimandano** l'assegnazione al momento del proprio piano senza
   scrivere un numero; il piano 4 non nomina il problema. Una mitigazione che tutti adottano e nessuno esegue non
   protegge nessuno: al momento dell'apertura ciascuno vedrà un disco a `0019` e documenti che tacciono per scelta.
   **L'assegnazione va fatta dall'orchestratrice, in un posto solo.**
5. **La pulizia degli annunci** — il 3c ha visto che le sue scritture non passano da `chiudi_invio` e lo ha
   dichiarato; il 3b apre lo stesso percorso e non lo vede.
6. **I colori** (R10) — il caso in cui la composizione è stata fatta **male dal revisore**: D3c-6 è revocata sulla
   riga stessa in cui è scritta.

**E il controesempio, che va detto:** su `client.updated_at` la composizione ha **funzionato**. Il piano 4 §5.3
scrive «Il piano 4 **non** aggiunge quella colonna: sarebbe la stessa migrazione scritta due volte da due chat.
**Rimando al 3b**», e il 3b la prende con D3b-5. La mancanza di lettura reciproca non è fatale per costruzione: i
cinque punti sopra sono omissioni specifiche, non un destino.

---

## 7. Il Task 8 consegnato durante il giro

**R16.** `0019_annunci.sql` è stato committato in **`86d4223`** mentre il giro era in corso. Conseguenze misurate:

- Due revisori hanno letto il file **prima** del commit, mentre un'altra chat vi eseguiva sonde di mutazione. Uno ha
  letto `app.annuncia_giorni()` **senza** `set search_path = ''`, sostituito da `-- MUTAZIONE SONDA P4`, e pochi
  minuti dopo ripristinato; un altro ha letto il file a **210** righe e poi a **209**, con `mtime` passato da 11:04
  a 11:16. **Entrambi hanno dichiarato la deriva invece di scegliere una lettura**, che è la condotta giusta.
- Le citazioni per riga su `0019` **non concordano** fra i quattro documenti che lo citano, con scarti da −1 a +5:
  è la firma della deriva, non della sciatteria.
- **Tutte le citazioni su `0019` vanno rifatte sul commit `86d4223`.** L'orchestratrice ha riverificato le due che
  reggono un'affermazione (il vincolo di non-vuoto e la guardia) e ha trovato la divergenza 5 falsa.

---

## 8. Dove si ferma questo giro

Non si ferma. Il criterio di §15 della spec — due giri di fila senza bloccanti — non è soddisfatto: questo giro ne
ha trovati dieci distinti, di cui uno falso.

**Che cosa il secondo giro deve guardare per primo**, sulla base di dove questo ha trovato:

1. **Le correzioni di questo giro.** In questo progetto ogni giro trova la maggior parte dei suoi difetti nelle
   correzioni del giro prima, e stavolta le correzioni sono molte e toccano cinque sezioni tecniche.
2. **La tabella dei casi di §4.5 dopo D3b-11 e D3b-14.** Le due decisioni hanno cambiato l'ordinamento e i motivi:
   la tabella che R-2 ha costruito è ora **obsoleta nella metà che riguarda l'ordine**, e va rifatta sulla forma
   nuova. Una tabella dei casi obsoleta è peggio di nessuna tabella.
3. **I documenti fratelli, letti per intero e con le note.** Tre bloccanti su dieci stavano lì, e uno dei tre era
   falso perché il revisore ha letto una decisione senza la sua revoca.
4. **Le citazioni su `0019` rifatte sul commit.**
5. **Il capitolo dei compleanni**, se il consulente risponde: le due domande aperte cambiano che cosa si costruisce,
   non solo che cosa si scrive.
