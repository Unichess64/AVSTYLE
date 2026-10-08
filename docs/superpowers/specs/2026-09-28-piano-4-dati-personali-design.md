# Piano 4 — Dati personali: documento di design

**Data:** 28 settembre 2026
**Revisione:** 3 — dopo il **secondo giro avversariale, quattro revisori su Opus** con lenti **diverse** dal primo giro
(§6 come ingegneria; le tabelle delle mutazioni riga per riga; §8 e le undici domande **rimisurate**; le cuciture e il
piano **3a-2**, che nessuno aveva letto). Esito: **21 bloccanti, 49 maggiori, 22 minori** — gli stessi ordini di
grandezza del primo giro, ma i bloccanti si sono spostati dal **disegno** alle **prove del disegno** e alle **sedi
lasciate indietro dalle correzioni**. Registro in **§14.0-bis**.
⚠︎ **I tre reperti che hanno cambiato il disegno:** **§8 diceva il falso sul fatto più importante del documento** — il
nome del servizio è testo libero non vincolato e attraversa il confine di D26 per un'altra porta (L29); **§6 misurava di
nuovo la grandezza sbagliata**, nel verso opposto, e chi prenota a marzo per settembre era eleggibile il marzo dopo; e
**le correzioni della revisione 2 erano applicate per sede e non per fatto**, quindi §12, §2 e §5.0 contraddicevano le
sezioni riscritte.
⚠︎⚠︎ **E la conseguenza che governa questa revisione: D4-11.** §6 è stata sbagliata due volte su due giri di lettura, e
il suo meccanismo **non si chiude leggendo**: le correzioni che una lettura può fare sono applicate, ma la forma resta
`[proposta]` e si stabilisce **quando il piano scrive la migrazione ed esegue le prove**. L'avvertenza è in testa a §6.
**Revisione 2** — dopo il primo giro (20 bloccanti): §6.2, §6.3, §7.4, §7.5 e §7.6 rifatte. Registro in **§14.0**.
**Revisione 1** — prima stesura, mai rivista.
**Stato:** bozza; non committata. ⚠︎ **§6 aspetta il banco di prova, non un terzo giro di lettura** (D4-11)
**Spec di riferimento:** `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`, **revisione 5** (in inglese).
«spec §N» = sezione di quel documento.
**Spec 3a di riferimento:** `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md`, **revisione 20**
(27/09/2026). «3a §N» = sezione di quel documento. **«§N» senza prefisso = sezione di questo documento.**
**Base di codice:** `main` a **`a9c4996`** — ⚠︎ la revisione 2 dichiarava `ee2a679`, e nel frattempo il **Task 8 del
piano 3a-1 è stato committato**: `public.annuncio` **esiste**, e le revisioni 3 del 3b e 4 del 3a-2 sono in `main`.
⚠︎ **E un avviso che il 3b ha misurato e che riguarda le citazioni di questo documento:** durante il primo giro
`0019_annunci.sql` era nell'albero di lavoro di un'altra chat che vi eseguiva sonde, e **le citazioni per riga su quel
file nei quattro documenti fratelli non concordano fra loro**, con scarti da −1 a +5. ✅ **Le mie sono state
riverificate il 28/09/2026 sul file committato (210 righe)**: `0019:21`, `:37`, `:155`, `:157` esatte al carattere; le
tre `delete` di `app.chiudi_invio` stanno a **`194`, `200` e `206`**, quindi gli intervalli che le citano partono a metà
istruzione e sono corretti qui sotto.
**Perimetro assegnato:** spec 3a §3.3, riga «**Piano 4:** dati personali (spec §11)».

**Che cosa è stato letto per scrivere questo documento**, perché una spec che non dichiara le sue fonti non è
verificabile:

| Documento | Che cosa se n'è preso |
|---|---|
| `specs/2026-09-17-salon-scheduler-design.md`, **rev. 5** | §11 per intero, §8.2, §6.2–§6.2.2, §5.1, §4.4, §9.6, §9.7, §9.9, §9.11, §12 e §12.1, §14, §15.1, e le decisioni D9, D10, D11, D14, D15, D21, D26 |
| `specs/2026-09-22-piano-3a-il-giorno-design.md`, **rev. 20** | §3.1–§3.3, §4.2, §4.4 (punto 3 e le sette righe), §4.7, §4.8, §4.9, §8.5, §8.7, §9, §10, §11 — e la **forma** di questo documento |
| `supabase/migrations/0003_client.sql` | che cosa è davvero una cliente |
| `supabase/migrations/0013_invii_e_cancellate.sql` | le due tabelle di servizio, i loro commenti, e le tre pulizie |
| `supabase/migrations/0007_client_activity.sql` | `last_activity_at`, il blocco, e il limite del TRUNCATE |
| `supabase/migrations/0019_annunci.sql` | il canale in diretta, e la terza pulizia |
| `supabase/migrations/0004_visit_appointment.sql` | le due cascate del diritto di cancellazione |
| `plans/2026-09-17-foundations-rulings.md` | cercate le decisioni in materia di dati personali: **non ce ne sono** — sono tutte di imbracatura e di catalogo. Registrato invece di far finta |
| `plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` | l'appendice del Task 7, **reperto 9** (L3) |
| `.gitignore`, `src/`, `tests/` | che cosa esiste e che cosa no (§1) |
| ⚠︎ `specs/2026-09-28-piano-3c-la-preparazione-design.md`, **rev. 1** | **letta il 28/09/2026 mentre questo documento si scriveva**, dopo che il 3c ha consegnato: **D3c-2** e **D3c-3** cambiano §5.4, §7.5, §7.6, §9.2, §9.4 e aggiungono §6.3.3. ⚠︎ Quel documento è nuovo e può cambiare: le sue decisioni sono citate come `[dalla spec 3c, revisione 1]` |

**Non letti**, e dichiarato: la spec 3b e il piano 3a-2, che si scrivevano nelle stesse ore. Le sovrapposizioni con
loro sono **rimandate** (§12.1), non decise.

---

## ⚠︎ Il limite di questo documento, in testa e non in fondo

**Chi scrive non è un consulente legale, e questo documento non è un parere legale.**

Quello che c'è qui dentro è una descrizione tecnica: **quali dati il sistema tocca, dove finiscono, quanto ci
restano, chi può leggerli, e che cosa una persona deve fare per rispondere a una cliente che chiede di vedere,
correggere o cancellare i propri dati.** Serve a mettere il titolare in condizione di far scrivere l'informativa e di
far valutare gli obblighi da chi ne ha la competenza.

Dove serve un **giudizio giuridico** — la base giuridica di un trattamento, la qualificazione del registro dei
servizi ricevuti, l'adeguatezza di un trasferimento, il termine di risposta a una richiesta, la necessità di una
valutazione d'impatto — questo documento **scrive la domanda e dice a chi va posta** (§13), e **non scrive la
risposta**. Dove un numero sembra una regola, è marcato `[proposta]` e §12 lo dichiara aperto.

⚠︎ **E c'è una cosa da registrare in testa, non a metà: con D4-4 il titolare ha scelto di rispondere lui alle **undici**
domande di §13, senza un consulente esterno.** È una decisione sua e questo documento la esegue — §13 è scritta come
una **guida da usare** invece di un elenco da girare a un legale. Ma la conseguenza va detta una volta: **le risposte
che il titolare darà a quelle domande non saranno verificate da nessuno**, e due di loro (la 1 e la 2) cambiano
l'informativa, la base giuridica e forse il termine di conservazione. Il documento le tiene visibili invece di
assorbirle.

Una conseguenza pratica: **nessuna frase di questo documento va copiata dentro l'informativa esposta in salone.**
§9 fissa il **contenuto minimo** che l'informativa deve coprire; il **testo** lo scrive il titolare — e ⚠︎ **nessuno lo
rivede**, perché D4-4 ha scelto di non avere un consulente. È la ragione per cui §9 elenca il contenuto minimo riga per
riga invece di fidarsi di una rilettura.

---

## Legenda

| Marca | Significato |
|---|---|
| **[dalla spec]** | affermato dalla spec originale (rev. 5) o dalla spec 3a (rev. 20), con la sezione |
| **[letto]** | letto da chi scrive in un file committato, con file e riga. **Non è una misura:** dice che il file dice così, non che il database si comporti così — quello lo stabilisce solo una prova eseguita |
| **[dalla revisione]** | misurato o letto da un revisore o da chi ha eseguito un task, con la fonte |
| **[proposta]** | numero o scelta che questo documento propone e che il piano o l'utente confermano |
| **[da misurare]** | fatto non stabilito, e che una prova o una verifica sul progetto ospitato può stabilire |
| **[giudizio giuridico]** | richiede un giudizio che questo documento non dà: §13 lo raccoglie. ⚠︎ Alla revisione 1 la marca si chiamava `[da chiedere al consulente]`, e nominava una figura che il progetto **non ha** (D4-4): rinominata, perché una marca si legge alla lettera |

⚠︎ **In questo documento non c'è nessun `[misurato]`, e non è una dimenticanza.** Chi scrive non ha eseguito né
prove né comandi sul database: quando questo documento è stato scritto c'erano **cinque chat sullo stesso repository
e sullo stesso computer**, e due suite Vitest insieme sullo stesso database locale danno 110–114 prove rosse false e
una suite appesa [dalla revisione, regola di processo del progetto]. Ogni numero qui è `[proposta]`, `[letto]` o
`[da misurare]`.

⚠︎ E la disciplina, per un documento come questo, vale doppio: **un termine di conservazione scritto come fatto
quando è una proposta diventa una promessa** che qualcuno leggerà come impegno preso verso le clienti. Per questo
D21 resta `[proposta]` finché non è confermata, e per questo §6 distingue fra il termine *dichiarato* e il
comportamento *che il codice ha oggi*, che non coincidono.

---

## 1. Che cosa fa questo piano, e che cosa non fa

La spec §11 esiste già e porta cinque sezioni: §11.1 che cosa si raccoglie, §11.2 il confine con i dati sanitari,
§11.3 le richieste degli interessati, §11.4 la conservazione, §11.5 export e backup. Sono **principi dichiarati**, e
sono buoni. Ma nessuno di loro, oggi, è **una cosa che il codice fa o che una persona può eseguire**:

| Spec §11 dice | Oggi, nel repository |
|---|---|
| «Export her record as a file» (§11.3) | non esiste nessuna funzione di export: `src/` contiene solo `src/dominio/` (logica pura, 6 file) [letto] |
| «Settings lists who is about to be removed and a person confirms» (§11.4) | non esiste nessuna query di eleggibilità, nessuna schermata Impostazioni, nessun badge. ⚠︎ E la seconda metà — «a person confirms» — è **superata** da D4-2 (§6.3) |
| «A server action produces a CSV of clients and appointments» (§11.5) | non esiste |
| «A privacy notice is displayed in the salon» (§11.1) | non esiste il testo, e non è deciso chi lo scrive |
| «All three in §9.6» (§11.3) | spec §9.6 è del piano 3b, e i suoi tre pulsanti hanno bisogno di funzioni che nessun piano ha ancora scritto |
| «Backup coverage … must be measured before go-live» (§11.5) | assegnato al 3c, che l'ha **spostata in §9.3 A2** e **non l'ha ancora eseguita**: D3c-2 è **sospesa** (§7.5) |

Il piano 4 chiude questa colonna di destra. **Non riscrive la spec §11**: la porta da principio a meccanismo, e
dove il principio non basta a decidere — perché serve una scelta del titolare o un giudizio giuridico — lo dice
invece di inventare.

### 1.1 Dentro il piano 4

1. **Le richieste degli interessati** (spec §11.3) rese eseguibili: chi le riceve, come si verifica chi chiede, in
   quanto tempo si risponde, che cosa fa materialmente l'app, che cosa fa una persona a mano, e che cosa **resta**
   dopo (§5).
2. **La conservazione** (spec §11.4, D21): il termine — **12 mesi**, D4-1 —, la query di eleggibilità, **il lavoro
   pianificato che cancella da sé** (D4-2) con i presidi che una cancellazione senza testimoni richiede, e il divario
   fra il termine dichiarato e le tre conservazioni brevi che il codice ha già (§6).
3. **Export e backup** (spec §11.5): l'export della singola cliente, l'export dell'intero insieme, dove i file
   vanno e dove non vanno mai, e che cosa l'export fa alla conservazione (§7).
4. **Il censimento dei luoghi** dove un dato personale vive fuori dalla tabella `client`: log, memoria, browser,
   canale in diretta, file esportati, backup, repository pubblico (§4).
5. **Il contenuto minimo dell'informativa** esposta in salone, e la riga al punto di raccolta (§9).
6. **Il confine con i dati sanitari** (spec §11.2), che è la ragione per cui non esistono campi di testo libero
   (§8).
7. **I limiti dichiarati** in materia di dati personali, sparsi oggi in cinque documenti, **raccolti in un posto
   solo** e mantenuti (§10).

### 1.2 Fuori dal piano 4

- **Le schermate** — piano 3a-2. Compresa la riga al punto di raccolta di spec §8.2: il piano 4 ne fissa il
  **contenuto**, 3a-2 la **posizione e la resa**.
- **Il cercaposti, le clienti e i compleanni** — piano 3b. Compresi i **pulsanti** «modifica», «cancella» ed
  «esporta la sua scheda» di spec §9.6: il piano 4 scrive i **meccanismi** che quei pulsanti chiamano (§5.6).
- **La preparazione e le verifiche prima del rilascio** — piano 3c. Vedi §1.3.
- **Il registro dei trattamenti** (art. 30), la valutazione d'impatto, la nomina di un responsabile della
  protezione dei dati: sono adempimenti del titolare, non pezzi di software. §13 li porta come domande.
- **Il testo dell'informativa.** §9 dice che cosa deve contenere. Il testo è del titolare (D4-4).

### 1.3 ⚠︎ Dove il piano 4 e il piano 3c si toccano, e chi decide

La spec 3a **§8.7** («Verifiche prima del rilascio») è **del 3c**, ed è l'elenco eseguibile delle verifiche sul
progetto ospitato. Tre delle sue voci sono anche mie, e **sono state scritte una volta sola, dal 3c**. Qui **rimando
e non decido**:

| Voce | Chi la possiede | Che cosa il piano 4 aggiunge, e niente di più |
|---|---|---|
| **Accordo sul trattamento (DPA) con Supabase e con Vercel** | 3c §8.7 lo verifica | il piano 4 dice **perché serve** (spec §11.1: sono due responsabili) e **che l'esistenza dell'accordo è un fatto da accertare, non da assumere** (§9.3). La forma della verifica è del 3c |
| **Esistenza e prova di un ripristino** sul piano in uso | 3c **§9.3 A2**, e **non è eseguita**: D3c-2 è **sospesa** | il piano 4 **condiziona** ogni conseguenza a quella misura (§7.5), e non ne trae nessuna come fatto |
| **Intestazioni di sicurezza in produzione** (CSP, HSTS, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`) | 3a §4.9 le prescrive, 3c §8.7 le verifica lassù | il piano 4 dice **quale dato proteggono**: `no-referrer` è ciò che tiene un indirizzo di pagina fuori dai registri di terzi, e la CSP è la sola riduzione della probabilità del limite di D3-11 (§10) |

**Una voce nuova** che il piano 4 chiede di aggiungere e che **il 3c decide se accogliere** (§12.1 punto 7):

- **per quanto tempo il piano Supabase in uso conserva i log del database**, e per quanto Vercel conserva i log di
  richiesta, perché è il termine di conservazione reale del limite «una riga rifiutata finisce nel log» (§3.3,
  `[da misurare]`).

La seconda voce che questo documento stava per chiedere — **la regione dei due progetti** — **c'è già**: la spec 3c
del 28/09/2026 la porta ai passi **A1** e **F3** della sua procedura di apertura, con la nota «fuori dall'UE cambia il
discorso sul trasferimento dei dati». Chiesta e trovata: non si chiede due volte.

### 1.3.1 ⚠︎ Tre decisioni del 3c, prese nelle stesse ore, che cambiano questo documento

⚠︎⚠︎ **La revisione 1 di questo documento citava «la spec 3c, revisione 1». Quel file non esiste più.** Il 3c ha subìto
il proprio giro avversariale — cinque revisori, **21 bloccanti, 42 maggiori, 18 minori**, quattro sezioni su sei
**rifatte** — ed è ora alla **revisione 2**. La 1 non era committata, quindi **non è più leggibile da nessuno**: ogni
tesi che la riguardava è inverificabile, e questo documento non ne sostiene più nessuna.

⚠︎⚠︎ **E alla revisione 2 è ricapitato, dall'altro lato: il 3c è passato alla REVISIONE 3 ventun minuti prima che questa
revisione 2 fosse salvata.** La sua intestazione: «*secondo giro avversariale, cinque revisori su Opus … circa **30
bloccanti**. §6 è **ritirata e rifatta**, §9 è rifatta di nuovo, e **tre decisioni su tre prese fra i due giri erano
sbagliate**»* [letto il 28/09/2026]. La revisione 2 del 3c non era committata: **non è più leggibile da nessuno**, e
ogni citazione verbatim che la revisione 2 di questo documento ne faceva è inverificabile.

⚠︎ **La regola che ne segue, e vale da qui in avanti:** i documenti gemelli si citano **per identificativo di decisione e
per contenuto** (D3c-2, D3b-6, L3c-4), **non per numero di sezione**, e non si cita verbatim un documento non committato.

⚠︎⚠︎ **E una seconda regola, che la chat del 3b ha insegnato a questa il 28/09/2026 dopo averci inciampato: in questi
documenti una decisione ritirata RESTA SCRITTA, per citazione** — è la convenzione del progetto, e questo documento la usa
su D21. Quindi **citare un identificativo non basta: va letta la colonna delle note sulla riga stessa.** Nel giro del 3b
un revisore ha costruito un bloccante su D3c-6 senza vedere che quella riga porta «⚠︎ **REVOCATA**».
✅ **Controllato il 28/09/2026 su tutte le decisioni 3c che questo documento cita** — D3c-2 (sospesa, ed è registrata),
D3c-3, D3c-4, D3c-5 (corretta alla rev. 3), D3c-7 (regge; era il suo corollario a essere falso): **nessuna è revocata**.
Un numero di sezione è la cosa che cambia per prima quando un documento viene rifatto — «3c §8.7» è già diventato «§9»
una volta.

✅ **E la seconda metà del rimedio è stata decisa dall'utente il 28/09/2026: le revisioni delle spec si committano su un
ramo di lavoro** (`bozze-specifiche`), separato da `main`. Così ogni revisione lascia una traccia leggibile, e **il
commit su `main` continua a voler dire «approvo»** — la regola del progetto non cambia.
⚠︎ **Con una conseguenza meccanica che va scritta perché non è ovvia:** le cinque chat condividono **una sola copia di
lavoro e un solo ramo**, quindi il cambio di ramo non è per chat — **chi lo fa lo fa per tutte e cinque nello stesso
istante**. Il comando (`git checkout -b`) **non perde il lavoro non salvato**, ma va dato una volta, dall'orchestratrice,
e comunicato alle altre chat: una di loro che tornasse su `main` riporterebbe indietro tutte.

**Alla revisione 3, le citazioni del 3c sono della sua revisione 3, letta il 28/09/2026 fra le 12:31 e le 12:38.**

⚠︎ **E i rimandi a «3c §8.7» non valgono più:** quella sezione è diventata **§9**, con le verifiche in §9.2–§9.11, la
misura sul piano in §9.3 A2, il backup e la rinuncia in §9.7, i contratti in §9.8. Chi eseguisse i rimandi della
revisione 1 non troverebbe le sezioni.

Tre decisioni dell'utente prese nella chat del 3c ricadono sul piano 4.

| Decisione del 3c | Che cosa cambia qui |
|---|---|
| ⚠︎⚠︎ **D3c-2 — SOSPESA alla revisione 2**: «si misura prima, si decide dopo», e la misura è **3c §9.3 A2** | **§7.5 è rifatta.** La revisione 1 di questo documento la trattava come un fatto («nessun backup») e su quell'asserzione aveva riscritto sei sezioni, fatto prendere all'utente **due decisioni** e proposto un numero per l'informativa **esposta in salone**. ⚠︎ Il 3c l'ha ritirata **per la stessa colpa**. Alla revisione 2 ogni conseguenza è **condizionata ad A2**: §3, §5.4, §6.3.3, §9.4, L13, L21 |
| **D3c-3 — le credenziali della dashboard le tengono la titolare e una seconda persona** | «Due persone possono cambiare la password di chiunque e **leggere tutto il database dalla dashboard**, clienti comprese. **Il piano 4 lo dichiara nell'informativa**» — parole del 3c. Fatto: **§9.2** e **L22**, ⚠︎ e con D4-6 quelle due persone ne portano via **un file** (§7.6.5) |
| **D3c-5 — alla revisione 3: «dopo la prima settimana si smette di SCRIVERE sulla carta; i registri NON si distruggono e restano l'archivio storico»** | ⚠︎ **La revisione 2 di questo documento diceva «dall'ottavo giorno la carta non c'è più» e ne traeva una finestra completamente scoperta: era più larga del vero.** Il 3c conta **tre** copie e nomina la finestra: fra l'apertura e la consegna di D4-6 il salone vive sul **dump manuale** della sua procedura di dispiegamento. §6.3.4 punto 2 è corretto di conseguenza. ⚠︎ Un presidio che descrive un rischio **più grande** del vero è la colpa che il 3c ha corretto due volte, e quel numero finisce in una rinuncia che la titolare **firma** |
| **D3c-4 — il restringimento elenca e lascia proseguire**, e l'elenco dei conflitti si trascrive a mano | ⚠︎ **Richiesta del 3c a questo documento, che la revisione 1 non aveva vista:** quell'elenco porta **nome e telefono di decine di clienti su carta**, ed è una sede del censimento (§3). Aggiunta alla revisione 2 |
| **D3c-2, seconda metà — la sospensione per inattività del progetto è `[da misurare]`**, e il salone chiude due settimane ad agosto | ricade sul **lavoro pianificato** della cancellazione automatica: un progetto sospeso non esegue niente (§6.3.1) |

⚠︎ E una conferma che vale la pena registrare: la spec 3c **legge L4-1 come questo documento** — «il 3c costruisce il
contenitore e **lascia i due posti vuoti**», esportazione e conservazione al piano 4. Due chat che non si sono parlate
hanno letto la stessa riga nello stesso modo; non è una prova che sia giusta, ma è meglio di una lettura sola.

---

## 2. Che dati raccoglie il sistema

**Dalla spec §11.1, e confermato riga per riga in `supabase/migrations/0003_client.sql` [letto]:**

| Dato | Colonna | Riga | Perché c'è |
|---|---|---|---|
| Nome e cognome | `full_name text not null` | `0003:16` | identificare la cliente sull'agenda |
| Telefono | `phone text`, annullabile | `0003:17` | richiamarla; spec §9.7 apre WhatsApp, e `347 1234567` non lo aprirebbe [dalla spec, §6.2]. ⚠︎ **La normalizzazione in E.164 è una richiesta della spec (§6.2), non una proprietà dello schema:** `0003:17` è `phone text` e nient'altro — nessun vincolo, nessun dominio, nessun trigger [letto]. Alla revisione 1 era scritta come se fosse letta nel codice. Oggi **niente la presidia**: L23 |
| Compleanno **senza l'anno** | `birth_month`, `birth_day` smallint | `0003:19-20` | gli auguri di D9. **L'anno non si raccoglie**: non serve, le clienti lo danno a malincuore, e un anno inventato finirebbe per essere letto come vero [dalla spec, §6.2.1] |
| Operatrice preferita | `preferred_operator_id` | `0003:21` | le clienti appartengono alla *loro* tecnica; senza, il cercaposti offre la cliente di Vera ad Annalisa [dalla spec, §6.2] |
| Opposizione agli auguri | `no_messages boolean not null default false` | `0003:22` | registra un'opposizione (§5.5) |
| Quando è stata creata | `created_at` | `0003:23` | ⚠︎ **non è più il ripiego della conservazione:** §6.2 ha eliminato il `coalesce(last_activity_at, created_at::date)`, che era la causa del difetto peggiore del primo giro. Resta come dato di nascita della scheda |
| Ultima attività | `last_activity_at date` | `0003:26` | ⚠︎ **non è più il valore su cui la conservazione cancella:** lo è `ultimo_contatto` (§6.2.1). Se `last_activity_at` serva ancora a qualcosa è aperto, con il censimento dei suoi consumatori (§12.1) |
| **Ultimo contatto** `[proposta]` | `ultimo_contatto date not null` | non esiste ancora | **è il valore su cui la conservazione cancella** (§6.2). Monotono, tocca ogni contatto compresa la disdetta (D4-10) |
| Registro dei servizi ricevuti | `visit` + `appointment` (data, servizio, operatrice) | `0004` | è l'agenda stessa |

**Nessuna email delle clienti.** Non esiste la colonna, e la conseguenza è concreta: nessuna risposta a una richiesta
di accesso può essere spedita per email, perché non c'è un indirizzo a cui spedirla (§5.2).

**Nessun campo di testo libero su una cliente o su un appuntamento (D26).** Le cose che le operatrici avrebbero più
bisogno di annotare sono *allergica al gel*, *incinta*, *attenzione alla cera calda*; un'etichetta «non scrivete
qui informazioni mediche» non le avrebbe fermate, e togliere il campo toglie la via [dalla spec, §11.1]. L'unico
testo libero che resta è `salon_closure.reason`, che riguarda **il salone** e non una persona [dalla spec, §11.1].

⚠︎ **Questa è una decisione dell'utente presa dopo che un revisore ha mostrato che l'etichetta non è un controllo**,
e §8 spiega perché è anche la mossa che tiene il sistema lontano dal confine dei dati sanitari.

**Nessun prezzo, nessun pagamento, nessun incasso (D14).** Quindi dentro questa applicazione **non esiste nessun
dato contabile o fiscale che possa opporsi a una cancellazione** — il che non dice niente su quello che vive fuori
(§5.4).

**Nessun registro di chi ha creato, cambiato o cancellato che cosa (D15, limite dichiarato 2 della spec §12).** Ha
due conseguenze in materia di dati personali, e sono in §10.

⚠︎ **Le ultime due righe sono state confermate esplicitamente (D4-5, 28/09/2026), e vale la pena dire perché.**
Rispondendo a D4-1 l'utente aveva elencato «nome, numero di telefono e compleanno», senza l'operatrice preferita e
senza il registro dei trattamenti — non una risposta sbagliata: **l'agenda non sembra «dati che teniamo», sembra
l'agenda.** Messo davanti alla scelta fra tenere lo storico e dichiararlo, mostrarne solo l'ultimo, o cancellare le
visite vecchie, l'utente ha scelto il primo. Quindi **la tabella qui sopra è completa e confermata**, il software non
cambia, e **l'informativa elenca anche i trattamenti ricevuti con le date** (§9.1). ⚠︎ Resta vero che è il dato su cui
pesa la **domanda 1 di §13**, che con D4-4 il titolare si è assunto di risolvere da sé.

---

## 3. Dove i dati personali vivono davvero

La tabella `client` è il posto ovvio. **Le richieste degli interessati e la conservazione si giocano sugli altri
posti**, e questo è l'elenco completo che il piano 4 si impegna a mantenere. Ogni riga dice: che cosa contiene,
quanto ci resta, chi lo può leggere, e se una cancellazione lo raggiunge.

| Sede | Che cosa contiene | Quanto resta | Una cancellazione la raggiunge? |
|---|---|---|---|
| `client`, `visit`, `appointment`, `appointment_slot` | tutto ciò che §2 elenca | **12 mesi** (D4-1, §6) | **sì**, per cascata |
| `visita_cancellata` | `id` di visita e istante. **Pseudonimo, non anonimo** | 30 giorni `[proposta]`, ma vedi §6.4 | **no**: la cancellazione della cliente ce li *mette* (§3.1) |
| `invio` | codice d'invio, esito, istante. **Nessun `id` di cliente né di visita** | 30 giorni `[proposta]`, §6.4 | non la riguarda |
| `annuncio` | **solo un elenco di date** | 1 ora `[proposta]`, §6.4 | non la riguarda |
| `localStorage` del telefono | codici d'invio pendenti con gli `id` di visita e cliente, l'istante del tocco, l'operatrice. **Pseudonimo, non anonimo** | 24 ore `[proposta]` (3a §4.4) | **no**, ed è sul telefono, non nel database (§3.2) |
| Bozza della scheda visita | nome e telefono della cliente in chiaro | **solo in memoria**, e al massimo 24 ore (3a §4.9) | non serve: muore con la pagina |
| Log di Postgres del progetto ospitato | **una riga rifiutata, con i valori** (§3.3) | `[da misurare]`, §1.3 | **no** |
| Log dell'applicazione (Vercel) | solo `code` e `id`, mai `details` né `hint` (3a §4.9) | `[da misurare]`, §1.3 | **no** |
| File esportati | **tutto**, in chiaro (§7) | fuori dal sistema | **no**, ed è il punto di §7.3 |
| **Copie settimanali nel secchio privato** (D4-6) | **tutto**, in chiaro | **quattro copie, cioè fino a quattro settimane** (D4-7) | **no**, ed è il loro mestiere: §7.6 |
| **Backup / PITR del fornitore** | `[da misurare]` — **non è accertato che non esistano**: 3c §9.3 A2 non è eseguita e D3c-2 è **sospesa** (§7.5) | `[da misurare]` | **no**, se esistono |
| Agenda di carta del salone | nomi, orari, servizi | finché il quaderno esiste | **no**, e nessun programma la tocca |
| Repository pubblico GitHub | **nessun dato di cliente reale, nessuna credenziale** (§11) | per sempre | non la riguarda |

⚠︎⚠︎ **Sei sedi mancavano alla revisione 1, e le ha trovate il primo giro.** Sono qui sotto, separate perché la lezione
è comune a tutte: **cinque su sei sono state descritte a partire da una regola invece che dal meccanismo**, e una era
creata dal piano 4 stesso.

| Sede mancante | Che cosa contiene | Quanto resta | La cancellazione la raggiunge? |
|---|---|---|---|
| ⚠︎ **WhatsApp, e la rubrica e il registro chiamate del telefono** | numero, nome, testo degli auguri | finché la chat esiste, più la copia in nuvola del telefono | **no** — §3.5, L24 |
| ⚠︎ **`annuncio`, dopo una cancellazione** | **le date delle visite della cliente cancellata** | 1 ora, «e poi al primo invio» (§6.4) | **no** — §3.4, che alla revisione 1 diceva il contrario |
| ⚠︎ **Log di richiesta di Vercel** (li scrive la piattaforma, non noi) | percorso, stringa di query — quindi gli `id` che stanno nelle URL —, IP dell'operatrice | `[da misurare]`, §12.1 | **no** — §3.3, L25 |
| **Cache del browser e cache avanti/indietro del telefono** | la pagina resa, con i nomi in chiaro | finché il browser la tiene | **no**, e nessuna cancellazione remota la raggiunge — L26 |
| **`auth.audit_log_entries`, `auth.users`, `auth.sessions`** | accessi con **IP** delle tre operatrici; indirizzi di posta e impronte | `[da misurare]` — **nessuna pulizia esiste**, e nessuna delle tre pulizie brevi la tocca | **no**; e non sono dati di cliente ma **delle operatrici** — §3.6, L27 |
| ⚠︎ **`passata_conservazione`** (la crea il piano 4, §6.3.1 presidio 3) | **gli `id` delle clienti cancellate**: dopo la cancellazione è l'unico posto che dice *chi* | **cinque settimane** `[proposta]` | **no**, ed è il suo mestiere |
| ⚠︎ **Il dump manuale del dispiegamento** (procedura del 3c; **lo causa il piano 4**, che fa `db push` su un database vivo) | **tutte le clienti, in chiaro, in un file `.sql`** | «va cancellato quando il dispiegamento è confermato» — **nessun software lo fa rispettare** | **no**. ⚠︎ Richiesta esplicita del 3c, che la revisione 2 non aveva vista: è la sede più grossa del censimento |
| ⚠︎ **Il registro cartaceo delle richieste** (lo crea il piano 4, §5.6) | nome di chi ha chiesto, che cosa, quando — e per una cancellazione, **il nome di chi ha chiesto di essere cancellata** | `[proposta]` va scelto: non «finché il quaderno esiste» | **no**, e solo a mano |
| **Il foglio A4 stampato** (D4-8) e la coda di stampa del telefono | la scheda di una cliente | finché il foglio e il file di stampa esistono | **no**: è quello che si produce a **ogni** richiesta di accesso |
| ⚠︎ **L'elenco dei conflitti**, trascritto a mano (3c §3.5, D3c-4) — ⚠︎ **e questa sede non è ferma:** 3c §3.6 tiene **aperta come decisione di dominio** l'alternativa che non conserva l'elenco, e il caso vero è la **disattivazione** di un'operatrice, non il restringimento | **nome e telefono** di decine di clienti, su carta, **perché l'app invita a trascriverli** | finché il foglio esiste | **no** — richiesta del 3c, §12.1 |

### 3.1 Il dato delle visite cancellate è pseudonimo, non anonimo

`public.visita_cancellata` tiene due colonne: `id` (uuid, chiave primaria) e `cancellata_il`
(`supabase/migrations/0013_invii_e_cancellate.sql:46-51` [letto]). Il commento della migrazione lo dichiara già:
«Dato PSEUDONIMO e non anonimo — un id si ricollega a una persona nel database —, senza nomi né telefoni»
(`0013:17-19` [letto]).

**Tre cose seguono, e vanno dette per intero:**

1. **Finché la visita esiste**, l'`id` si ricollega alla cliente con una sola join. Non è anonimo in nessun senso
   utile.
2. **Ogni strada che cancella una visita passa da qui**, e la cascata dalla cliente è una di quelle: il trigger
   `zz_registra_visita_cancellata` sta su `visit` e non nelle funzioni di scrittura, proprio perché deve prendere
   anche la cancellazione diretta, la visita rimasta orfana (`0008`) e **la cascata dalla cliente** (`0004:5`,
   `on delete cascade`) — `0013:200-213` [letto]. Quindi **cancellare una cliente scrive in
   `visita_cancellata` una riga per ogni sua visita.**
3. **Dopo la cancellazione resta il numero delle sue visite, l'istante, e — finché l'annuncio non è ripulito —
   l'insieme delle date in cui erano.** ⚠︎ **La revisione 1 diceva «non resta *quando* erano» e «per ricollegarlo a una
   persona serve una copia esterna»: falso su entrambi i punti, e l'ha trovato il primo giro.** La cascata su `visit`
   fa scattare anche `zz_annuncia_visite_del` (`0019:155-157`, `after delete on visit`, `referencing old table as
   vecchie` [letto]), che scrive in `annuncio` **l'insieme esatto delle date** delle sue visite, con lo stesso istante
   delle righe che la stessa cancellazione mette in `visita_cancellata`. Le due tabelle sono leggibili da qualunque
   operatrice attiva e **correlano per istante**: *N visite cancellate alle 03:14:07* accanto a *i giorni toccati alle
   03:14:07 erano il 12/03, il 19/03 e il 04/06*. **Nessuna copia esterna serve.** Il nome, quello, non resta: per
   arrivare alla persona serve ancora una copia presa prima.

⚠︎ Questo non è un difetto da correggere di corsa: quella tabella esiste per rendere **vera** la risposta di
«Controlla» (3a §4.4), e la stessa migrazione spiega che senza di essa «Non risulta salvata» è una frase che il
database può smentire un attimo dopo (`0013:6-13` [letto]). È un **limite dichiarato**, sta in §10, e la domanda che
lo riguarda è in §13.

### 3.2 Il `localStorage` tiene identificativi, non nomi

3a §4.9 dichiara l'**unica eccezione** alla regola «la bozza vive solo in memoria»: i codici degli invii pendenti
restano in `localStorage` con gli `id` di visita e cliente, l'istante del tocco e l'operatrice — «identificativi
casuali e un orario, **pseudonimi e non anonimi** (un `id` si ricollega a una persona nel database), **senza nomi e
senza numeri di telefono**; si cancellano alla risposta definitiva e comunque dopo 24 ore» [dalla spec, 3a §4.9 e
§4.4 punto 3].

Due cose che il piano 4 aggiunge e che 3a non aveva bisogno di dire:

- ⚠︎ **Nel database niente difende quella coppia.** `invio` non porta né la visita né l'operatrice, e
  `controlla_invio(p_codice, p_visita)` accetta **qualunque** coppia: la regola «i codici di un'altra operatrice si
  controllano quando rientra lei» vive solo nel `localStorage` [dalla revisione, appendice del Task 7 del piano
  3a-1, reperto 9]. Non è sfruttabile indovinando — i codici sono `crypto.randomUUID()` — e lo renderebbero
  raggiungibile **un dispositivo condiviso o un `localStorage` mescolato**. Il rimedio sarebbe una colonna su
  `invio`, che è del Task 1 del 3a-1. Per il piano 4 è un **limite dichiarato** (§10), non un lavoro.
- **La scadenza a 24 ore è del telefono, non del database.** Un telefono spento per una settimana la applica al
  rientro, non a scadenza. Chi cancella i dati del salone da remoto non tocca quel `localStorage`: lo tocca solo
  chi ha il telefono in mano (§5.4).

### 3.3 Un vincolo che scatta scrive dati personali in un log

**Limite dichiarato, già in 3a §4.9 e ripetuto qui perché è un fatto sui dati personali:** se un vincolo come
`client_birthday_real` scatta nonostante la validazione dell'applicazione, **il log di Postgres del progetto
contiene la riga rifiutata** — cioè nome, telefono e compleanno in chiaro, in un registro che non è una tabella e
che nessuna cancellazione raggiunge.

Il presidio che esiste: **nei log dell'applicazione vanno solo `code` e `id`, mai `details` né `hint`**, e la stessa
regola vale per Server Actions, middleware, Server Components e route handler [dalla spec, 3a §4.9].

⚠︎⚠︎ **Ma sono TRE registri, non due, e la revisione 1 li confondeva.** 3a §4.9 è una **regola su ciò che
l'applicazione scrive**, non un fatto su ciò che la piattaforma registra:

| Registro | Chi lo scrive | Che cosa contiene |
|---|---|---|
| Log dell'applicazione | noi | `code` e `id`, **per regola**, oggi senza nessuna prova che la pianti (L5) |
| Log di Postgres | il database | la STATEMENT di ogni scrittura rifiutata (qui sotto) |
| ⚠︎ **Log di richiesta di Vercel** | **la piattaforma** | metodo, percorso, **stringa di query**, indirizzo IP, user agent — di **ogni** chiamata, qualunque disciplina l'applicazione si dia |

La riga di §3 che diceva «log dell'applicazione (Vercel): solo `code` e `id`» **fondeva il primo e il terzo**, e non
portava nessuna marca: era scritta come un fatto in un documento che dichiara di non contenerne nessuno misurato. Se una
sola rotta porta un identificativo di cliente nel percorso — e la scheda cliente di spec §9.6 e la scheda visita di
§9.4 sono esattamente quelle rotte — quel registro tiene **identificativi pseudonimi di cliente più l'IP
dell'operatrice**, per un periodo che nessuno ha guardato.

`[proposta]` **La sola cosa che il software può fare è tenere gli identificativi fuori dalle URL** — cioè estendere la
regola di 3a §4.8 («nessun dato personale in un URL», che oggi parla dei *filtri*) agli **identificativi nei percorsi
delle pagine**. È un requisito per il 3b e per il 3a-2, e §12.1 lo manda.

⚠︎ **E il limite del log di Postgres è più grave di come la revisione 1 lo scriveva.** Diceva «se un vincolo come
`client_birthday_real` scatta **nonostante** la validazione»: cioè un caso raro. Ma `public.salva_visita` prende la
cliente nuova **come parametro** (`p_cliente_nuova jsonb`, `0016:195-201` [letto]) e solleva in dodici punti, e la
maggior parte **non** sono vincoli che sfuggono alla validazione: sono **rifiuti di progetto** che accadono nel
funzionamento normale — versione superata, insieme cambiato altrove, codice già in corso, operatrice disattivata a metà
scrittura — più lo stallo `40P01` che L16 dichiara misurato 6 su 6. **Validare prima non riduce nessuno di questi:
esistono per essere raggiunti.** Ogni volta, Postgres registra l'errore con la sua STATEMENT; se sul progetto ospitato
i parametri vi finiscono, vi finiscono **nome e telefono in chiaro**. `[da misurare]`, §12.1.

Il presidio che **non** esiste: niente impedisce al log del *database* di ricevere la riga. Si può solo ridurre la
probabilità che un vincolo scatti — validando prima, che è ciò che 3a §4.3 passo 2 e §4.8 già fanno — e **sapere per
quanto quel log resta**, che è la voce che §1.3 chiede di aggiungere a 3c §8.7.

`[proposta]` Il piano 4 aggiunge **una prova statica** che cerca, nei punti dove si registra un errore, il passaggio
di `details` o di `hint` a una funzione di log. 3a §4.9 prescrive la regola; oggi nessuna prova la pianta, e la
regola senza prova è un'etichetta — esattamente l'argomento con cui D26 ha tolto il campo di testo libero.

### 3.4 Il canale in diretta: niente mentre funziona, le date quando si cancella

`public.annuncio` contiene **un elenco di date e nient'altro**: `giorni date[]`, `creato timestamptz`
(`supabase/migrations/0019_annunci.sql:21-28` [letto]), e la migrazione lo dichiara: «Il contenuto è solo un elenco
di DATE: nessun nome, nessun telefono, nessun id di cliente» (`0019:18-19` [letto]).

⚠︎ **Ma dice qualcosa comunque**, e va detto: un annuncio dichiara che **in agenda è stato scritto qualcosa, in
quell'istante, per quei giorni**. La migrazione ha già affrontato esattamente questa fuga per `anon`, e la sua
conclusione è controintuitiva: **il `grant select … to anon` è ciò che chiude la fuga, non ciò che la apre** —
senza il grant, Realtime consegna a chiunque abbia la chiave pubblica un guscio vuoto con `errors: ["Error 401:
Unauthorized"]`, cioè il **fatto** della scrittura e il suo ritmo; con il grant, la politica per riga sopprime il
messaggio e non arriva niente (`0019:38-58` [dalla revisione, misurato il 28/09/2026 su banco usa-e-getta]). La
politica resta l'unica cosa che concede righe, e `anon` non la supera mai.

⚠︎⚠︎ **Ma la conclusione della revisione 1 era sbagliata, e l'ha trovata il primo giro.** Diceva: «il canale in diretta
non è una sede di dati personali, e non entra nel censimento delle cancellazioni». **Ci entra, e in un modo che rende
più ricco il residuo.**

`0019:155-159` [letto] installa `zz_annuncia_visite_del` **after delete on visit**, `referencing old table as vecchie`,
`for each statement`; e `app.annuncia_giorni()` fa `select array_agg(distinct v.visit_date) … from vecchie` e inserisce
la riga. Quindi **la cancellazione di una cliente — per cascata, esattamente la strada che §3.1 punto 2 descrive —
scrive in `annuncio` l'insieme esatto delle date delle sue visite.**

La tabella non contiene nomi né telefoni, e la sua politica per riga regge (`anon` non la passa mai). Ma:

- il residuo **correla per istante** con `visita_cancellata` (§3.1 punto 3);
- il suo termine **non è «1 ora»**: la pulizia vive in `app.chiudi_invio`, che la passata automatica non chiama. È «1
  ora, e poi al primo invio che si chiude» — cioè l'apertura del salone il mattino dopo, o **due settimane ad agosto**
  (§6.4). La revisione 1 applicava questo ragionamento alle altre due tabelle e non a questa.

**Quindi il canale in diretta non porta dati personali *mentre funziona*, e ne porta *quando qualcuno cancella*.** Ed è
la risposta giusta alla domanda «e il canale in diretta?», che è la prima che un revisore pone.

### 3.5 ⚠︎ WhatsApp: un terzo destinatario, che questa applicazione apre

**Questo è il reperto più grosso del primo giro sul censimento, e il documento aveva in mano tutti i pezzi senza
metterli insieme.**

§2 dice, citando la spec: «spec §9.7 **apre WhatsApp**, e `347 1234567` non lo aprirebbe». §7.3 vieta di mandare gli
export in una chat WhatsApp. E poi §5.4 metteva «chat WhatsApp con la cliente» fra i «registri fuori dall'app», insieme
agli scontrini e ai quaderni, con la nota **«non è questo sistema»**.

⚠︎ **Non è uno scontrino: la chat la apre questa applicazione.** Spec §9.6 e §9.7 mettono il pulsante su ogni riga di
cliente e su ogni riga dell'elenco compleanni, e toccarlo **trasmette il numero di telefono della cliente a Meta** — un
collegamento `wa.me/<numero>` porta il numero nell'indirizzo. Poi resta una conversazione con numero, nome e testo degli
auguri nel WhatsApp dell'operatrice, nella copia in nuvola di quel telefono, e nei sistemi di Meta.

**E per gli auguri di D9 non è un caso occasionale: è la via di consegna prevista della sola finalità per cui si
raccoglie il compleanno.**

Quattro conseguenze, tutte su percorsi che il salone percorre ogni settimana:

1. **§4.2 e §9.3 fanno scrivere un'informativa che nomina DUE destinatari quando ce n'è un terzo.**
2. **§5.4 faceva rispondere a una cancellazione «resta solo ciò che è fuori da questo sistema»**, classificando come
   esterno un residuo che il sistema ha creato.
3. **§10 non aveva nessun limite su questo**, quindi nessuno l'avrebbe ritrovato. Ora è **L24**.
4. **Lo stesso vale per la chiamata:** spec §9.6 offre «WhatsApp **o una chiamata**», e il numero resta nel registro
   chiamate e nella rubrica del telefono.

⚠︎ **Che cosa Meta sia in questo trattamento — responsabile, o titolare autonomo — è un giudizio che questo documento
non dà.** È la **domanda 9** di §13, e cambia l'informativa.

### 3.6 Le operatrici sono anche persone i cui dati sono trattati

⚠︎ **La revisione 1 trattava le tre operatrici soltanto come *chi tocca* i dati (§4), mai come *persone di cui si
trattano* i dati.** Il censimento non aveva nessuna riga per lo schema `auth`, che è l'unico posto del sistema con
indirizzi di posta dentro.

- **`auth.audit_log_entries`** registra ogni accesso con l'**indirizzo IP**. Che si riempia è già misurato in questo
  progetto — `supabase/config.toml` porta la nota «misurati in `auth.audit_log_entries`, sono **126 per passata**»
  [letto]. **Nessuna delle venti migrazioni la pulisce**, e nessuna delle tre pulizie brevi la tocca: è un registro
  degli accessi delle tre operatrici che cresce **senza termine dichiarato**.
- **`auth.users`** tiene gli indirizzi e le impronte delle password; **`auth.sessions`** è toccata dai trigger di `0015`.
- ⚠︎ **`public.list_auth_accounts()`** (`0011`) restituisce `id` ed **email** di *tutti* gli account, in chiaro, a
  *qualunque* operatrice attiva — compresi quelli della titolare e della seconda persona di D3c-3. La funzione è scritta
  bene e il suo commento è onesto; è **§4.1** che diceva soltanto «un'operatrice ha accesso all'intera **base
  clienti**»: legge anche l'intera rubrica degli account. **L27.**

⚠︎ **E c'è un obbligo che questo documento dichiara FUORI perimetro invece di tacerlo:** §9 scrive il contenuto minimo
dell'informativa **per le clienti**, e un'informativa verso **il personale** è un adempimento distinto che **nessuno dei
cinque piani si è preso**. Non è software, e non lo si risolve qui. Va in §12.1 e la sua qualificazione è la **domanda
10** di §13.

---

## 4. Chi tocca i dati

### 4.1 Dentro il salone

**Tre account, permessi identici, nessun ruolo (D10, D11).** Ogni operatrice attiva legge **tutte** le clienti: nome,
telefono, compleanno, storico dei servizi. Non esiste una visibilità ristretta alle proprie clienti, e non è una
dimenticanza: `preferred_operator_id` serve al cercaposti, non a chiudere una porta (spec §6.2).

La conseguenza in materia di dati personali, dichiarata: **un'operatrice ha accesso all'intera base clienti del
salone** — ⚠︎ **e anche all'intera rubrica degli account**, perché `public.list_auth_accounts()` restituisce `id` ed
email di tutti a qualunque operatrice attiva (§3.6, L27) — e l'unico controllo sulla cessazione di quell'accesso è la
**disattivazione**, che è immediata — con D3-17
la politica `app.is_active_operator()` esige anche l'esistenza della sessione del token, e i trigger di `0015`
cancellano da `auth.sessions` le sessioni dell'account appena `is_active` cambia davvero [dalla spec, 3a §4.7].

Perché conta qui: **l'offboarding di un'operatrice è una misura di protezione dei dati**, non solo una voce di
Impostazioni, e il fatto che funzioni *subito* è ciò che rende difendibile la frase «solo il personale autorizzato
accede». Il pulsante sta nel 3c; il piano 4 lo dichiara come misura e lo nomina nell'informativa (§9.2).

### 4.2 Fuori dal salone: i due responsabili

**Supabase** (base di dati, autenticazione, canale in diretta) e **Vercel** (esecuzione dell'applicazione, log di
richiesta) [dalla spec, §11.1 e D20]. ⚠︎ **E un terzo: Meta**, perché l'applicazione apre WhatsApp per gli auguri
(§3.5). La revisione 1 ne contava due.

⚠︎ **Due qualificazioni giuridiche, e la revisione 1 era scettica su una sola delle due.** Diceva, correttamente, che
l'affermazione di spec §11.1 «ciascuno comporta un trasferimento» è `[da misurare]` — dipende dalla **regione** del
progetto e dai sotto-responsabili, e nessuno l'ha guardata (la regione è assegnata al 3c, §1.3). Ma nella stessa riga
accettava come dato «**Sono due responsabili del trattamento**». **Sono qualificazioni dello stesso genere, prese dallo
stesso paragrafo della spec**: se una si marca, si marcano entrambe.

Quindi, alla revisione 2: che Supabase e Vercel siano responsabili del trattamento e non titolari autonomi è
un'affermazione **della spec**, plausibile e non verificata qui; **per Meta la domanda è aperta e pesa** (domanda 9 di
§13), perché da essa dipende che cosa l'informativa deve dire del pulsante WhatsApp.

### 4.3 Con che identità il sistema scrive

Non è un dettaglio da architetti: **è la ragione per cui un'operatrice disattivata non può esportare la base
clienti.**

- Le letture e le scritture dell'app passano con la **sessione dell'operatrice**, e la sicurezza per riga le filtra
  [dalla spec, 3a §4.2].
- La chiave `service_role` **non arriva mai al browser**, non esiste nessun route handler pubblico e nessun bucket
  di archiviazione pubblico [dalla spec, §11.5].
- **Ogni export sta dietro due controlli, non uno:** la sessione **e** `app.is_active_operator()`. Una sessione
  valida da sola permetterebbe a un'operatrice appena disattivata di esportare l'intera base clienti, che è «il buco
  dell'offboarding con il carico peggiore possibile» [dalla spec, §11.5 e §4.4].

⚠︎ **Questo è il punto dove il piano 4 può fare il danno più grosso di tutto il progetto**, e la ragione è aritmetica:
ogni altra schermata mostra una cliente per volta, l'export ne mostra tutte. §7.4 dice quali prove lo presidiano, e
sono le prove più importanti del piano.

---

## 5. Le richieste degli interessati, rese eseguibili

Spec §11.3 dice «All three in §9.6» ed elenca modifica, cancellazione ed export della scheda; `no_messages` registra
l'opposizione agli auguri. Sono i meccanismi. **Quello che manca, e che il piano 4 scrive, è la procedura**: chi
riceve la richiesta, come si verifica chi chiede, che cosa si consegna, in quanto tempo, e che cosa resta dopo.

### 5.0 Il canale: in salone, di persona (D4-3)

**Decisione dell'utente del 28/09/2026, D4-3: le richieste si fanno e si soddisfano in salone, di persona.**

Prima di questa decisione il salone non aveva **nessun** canale, e un meccanismo che funziona con nessun posto dove
chiedere di usarlo non è un diritto esercitabile. Ora ce l'ha, ed è quello che costa meno e verifica meglio: **la
verifica dell'identità è il riconoscimento di persona**, che è più solido di qualunque controllo scrivibile in
software (§5.2).

**Il costo, dichiarato:** chi si è trasferita e non passa più dal salone **deve venire di persona**, e oggi non c'è
altra via. ⚠︎ **La consegna a distanza non è risolta** (§5.2): le due forme possibili sono scritte lì e **non sono
state scelte** — è la domanda 11 di §13. Finché non è scelta, la risposta è «deve passare in salone». Per un salone di
quartiere è un costo piccolo; per una cliente che si è trasferita a Milano è un ostacolo vero, e va trattato come tale
quando accade.

⚠︎ Alla revisione 2 questa riga diceva «deve venire di persona **o scrivere per posta**», rimandando a un capoverso di
§5.2 che dice l'opposto: §5.2 aveva eliminato quel percorso e §5.0 lo offriva ancora. È il difetto di metodo della
revisione 2 — la correzione applicata in una sede sola.

⚠︎ **L'informativa deve nominare quel canale** (§9.5): un'informativa che elenca i diritti senza dire dove si
esercitano è incompleta, ed è la parte più facile da dimenticare.

`[proposta]` **Tre cose che la revisione 1 non diceva, e senza le quali la procedura non si esegue il mercoledì
pomeriggio col telefono che suona:**

- **Chi riceve la richiesta la scrive sul registro e basta.** La risposta non si prepara col telefono in mano. Chi la
  prepara è la titolare, entro l'obiettivo qui sotto. Se la cliente è davanti e la si può servire subito, **si può**;
  **non si deve**, e «torni domani» è una risposta legittima.
- **Se non risulta nessuna scheda**, si risponde che **non risulta nessun dato** — è una risposta, e va data — e si
  scrive anche questo sul registro.
- **Il registro dice anche entro quando**: data della richiesta, **data entro cui rispondere**, data della risposta.
  Senza la colonna di mezzo l'obiettivo non si vede.

**Il termine di risposta.** ⚠︎ Il termine è fissato dalla normativa e **non lo scrive questo documento**: è la
domanda 5 di §13, e va confermato da chi risponde alle domande giuridiche — con D4-4, il titolare. Quello che il
piano 4 propone è l'**obiettivo interno**, che è
un'altra cosa: `[proposta]` **7 giorni lavorativi** dalla richiesta, per avere margine sul termine di legge qualunque
esso sia. Un obiettivo interno più corto del termine non è zelo: è ciò che assorbe una chiusura, una malattia e un
telefono rotto senza sforare.

### 5.1 Accesso e portabilità: «voglio vedere che cosa avete su di me» (D4-8)

**Che cosa si consegna.** Tutto ciò che §2 elenca **per quella cliente**: i suoi dati, e il registro delle sue
visite con data, servizi e operatrice. Niente di altre clienti.

**Un formato solo: un foglio stampabile (D4-8).** Una pagina A4 resa dal server — i suoi dati in alto, l'elenco delle
visite sotto — che l'operatrice stampa e le mette in mano.

⚠︎⚠︎ **E questo passo presuppone una stampante in salone, che nessuno ha verificato** (§12.1). Con **un solo** formato,
il diritto di accesso ha **un solo supporto**: mostrare il foglio sullo schermo **non è una consegna**. Se non si
stampa dal telefono che le operatrici usano, **D4-8 va riaperta prima del rilascio** — non per ripensarci, ma perché è
stata scelta assumendo la stampa.

⚠︎ **Questa è una correzione a una proposta di questo stesso documento**, e vale la pena dire come è andata: la prima
stesura proponeva **due** formati, il foglio e un CSV «per chi chiede i dati in forma riutilizzabile». Messo davanti
al costo — due rese e due serie di prove sulla parte più delicata del piano, per un caso che in un salone di tre
persone arriva forse una volta ogni molti anni — l'utente ha scelto **uno**. È la scelta giusta: il caso frequente
è una signora al banco, e per lei il file non è una risposta.

**Il costo, dichiarato:** se una cliente chiedesse i propri dati **in forma riutilizzabile**, il foglio non lo è, e
glieli si preparerebbe **a mano** — cioè copiando a mano ciò che il foglio già mostra. `[proposta]` Sta nella procedura
di §5.6, non nel software, e se il caso arrivasse due volte allora il CSV si costruisce: **a quel punto ci sarà una
ragione misurata, invece di un'ipotesi.**

⚠︎ **Quello che si consegna non è l'export di §11.5.** Sono due artefatti diversi, e la spec lo dice già: «il CSV di
tutto l'insieme di §11.5 è un artefatto diverso e non risponde a una richiesta dell'interessato» [dalla spec,
§11.3]. Consegnare il CSV completo a una cliente che chiede la propria scheda sarebbe una comunicazione di dati di
**tutte le altre**.

### 5.2 Come si consegna, e come si verifica chi chiede

**Il vincolo di partenza:** non esistono email delle clienti (§2). Quindi non c'è nessun canale digitale verso una
cliente che il salone possa considerare suo.

**La consegna avviene di persona, in salone** (D4-3). Se la richiesta arriva comunque per telefono o per messaggio —
e arriverà, perché è così che le clienti parlano col salone — il salone **richiama il numero registrato in scheda**
per fissare il ritiro. Mai per messaggio, **mai su WhatsApp** —
la spec lo dice già per l'export completo, che «rivelerebbe di nuovo l'intero insieme a un terzo» [dalla spec,
§11.5], e la ragione vale identica per una scheda singola: un messaggio finisce su un telefono che può non essere
più di chi credi.

⚠︎⚠︎ **E il passo che manca, che è il caso normale e non il caso limite: «non la riconosco».**

Mercoledì pomeriggio. Una signora al banco chiede la sua scheda. C'è Alessandra; la cliente è di Vera, che oggi non c'è,
e Alessandra non l'ha mai vista. «Essere davanti» è soddisfatto; **riconoscerla no**. Con tre operatrici e le clienti
divise per tecnica (`preferred_operator_id`, spec §6.2), succede spesso. Alla revisione 2 la procedura non diceva
niente, e i due esiti disponibili erano entrambi sbagliati: consegnare a una persona non riconosciuta, o rifiutare una
cliente legittima senza una regola da mostrarle.

`[proposta]` **Se chi è al banco non riconosce la persona, la richiesta si scrive sul registro e la risposta la prepara
chi la conosce**, oppure la titolare. **La scheda non si consegna sul riconoscimento di nessun altro che chi la
consegna.** Non è un rifiuto: è la stessa «torni domani» del caso normale, con la data di risposta scritta sul quaderno
e detta alla cliente.

⚠︎⚠︎ **Prima di consegnare, e prima di cancellare, si cerca il doppione.** Spec §8.2 dichiara già il modo di guasto, e
la revisione 1 non ne teneva conto in nessuna delle due procedure: «una seconda Maria è creata sotto la pressione del
telefono, **la sua storia si spacca**». Il foglio si costruisce su **una** scheda e la cancellazione cancella **una**
scheda: su una cliente sdoppiata la risposta a una richiesta di accesso è **incompleta** e la cancellazione è
**parziale** — i due esiti peggiori dei due percorsi più delicati. `[proposta]` Si cerca per telefono **e** per nome
senza accenti (spec §8.2 dà già la ricerca), e se compaiono due schede si guardano entrambe. §7.4.1 porta la prova che
il foglio contiene **tutte** le visite di quella scheda; che le **schede** siano una sola, quello lo può guardare solo
una persona.

⚠︎ **E per la cancellazione guardarle non basta: si cancellano tutte le schede trovate**, una per una, rileggendo
l'elenco dopo ciascuna (§5.4). Alla revisione 2 la diagnosi c'era e il rimedio no: chi esegue era avvertito che la sua
cancellazione sarebbe stata parziale e non gli si diceva di cancellarle tutte. **Una cancellazione parziale è il
peggiore dei due esiti e non lascia nessuna traccia di essere parziale.**

**Perché la verifica di identità non è un formalismo.** Il salone conosce le sue clienti di vista, e questa è la sua
forza: la verifica **di persona** è più solida di qualunque controllo che si possa scrivere. Il caso da temere è
l'altro: **chi telefona dicendo un nome.** Nome e cognome di una cliente sono la cosa più facile da sapere al mondo,
e una scheda consegnata al telefono è una comunicazione di dati a un terzo — un ex compagno, un parente, un
conoscente. Da qui la regola: **nessuna scheda esce senza che la persona sia davanti a chi la consegna.**

⚠︎⚠︎ **Se la cliente non può venire, questo documento NON risolve la consegna a distanza — e la revisione 1 credeva di
averla risolta.** Diceva: «la richiesta si soddisfa per posta all'indirizzo che lei indica». È **lo stesso attacco che
questa sezione dice di temere, spostato di un passo**: prima bastava telefonare dicendo un nome, così basta telefonare
dicendo un nome e un indirizzo. Nessuna verifica era prevista su quel percorso, e il percorso è dichiarato raggiungibile
da §5.0 («chi si è trasferita deve venire di persona o scrivere per posta»).

**Il riconoscimento di persona è l'unica verifica che il salone ha.** Per posta non ce n'è nessuna, e un indirizzo detto
al telefono non è una verifica. `[proposta]` Due vie possibili, e vanno **scelte**, non sottintese:

- **(a)** si spedisce solo dopo una richiesta **scritta e firmata** con la copia di un documento, che l'operatrice
  confronta con il nome in scheda. ⚠︎ **«Non conserva» non basta come istruzione:** «non c'è dove» vale per il
  database, ma una copia arrivata per posta è **un foglio**, che esiste finché qualcuno non lo distrugge. Se si sceglie
  questa via, **la copia si distrugge subito dopo il confronto** e il registro di §5.6 annota *verificata su documento,
  copia distrutta il …* — altrimenti la via (a) crea una sede di dati personali su carta che §3 non elenca;
- **(b)** la fa ritirare da una persona che lei indica **per iscritto**.

⚠︎ Quale delle due sia adeguata è la **domanda 11** di §13. **Finché non è scelta, la risposta alla cliente lontana è:
«deve passare in salone»** — che è scomodo e onesto, e non è la risposta che la revisione 1 dava.

### 5.3 Rettifica: «il mio numero è cambiato»

Il meccanismo esiste: «Modifica» sulla scheda cliente, spec §9.6, **costruito dal piano 3b**.

⚠︎ **Due limiti che il piano 4 dichiara e non chiude:**

- **La rettifica non lascia traccia.** `client` non ha `updated_at` — le colonne sono quelle di §2 e quella non c'è
  (`0003:14-35` [letto]) — e D15 rinuncia a un registro delle modifiche. Il salone **non può dimostrare quando** ha
  corretto un dato. Costo se sbagliato: una contestazione non si risolve con un documento, si risolve con la parola
  di chi era presente. Il rimedio, se un giorno servisse, è il registro cartaceo di §5.6.
- ⚠︎ **`client` senza `updated_at` è già un problema del 3b** per un'altra ragione — il controllo di concorrenza
  sulla modifica di una cliente [dalla revisione, 3a §3.3]. **Se il 3b aggiunge `updated_at`, la prima metà di
  questo limite si chiude da sé.** Il piano 4 **non** aggiunge quella colonna: sarebbe la stessa migrazione scritta
  due volte da due chat. **Rimando al 3b** e §12 lo elenca.

### 5.4 Cancellazione: «cancellatemi»

**Il meccanismo.** «Cancella» sulla scheda cliente (spec §9.6, piano 3b) esegue una cancellazione della riga
`client`; la cascata porta via `visit` (`0004:5`), `appointment` (`0004:29`) e le celle di occupazione, per
`on delete cascade` e non fallendo su una chiave esterna [dalla spec, §11.3; `[letto]` su `0004`].

**Che cosa NON raggiunge.** È la parte che conta, e va nell'informativa (§9.4):

| Sede | Perché resta | Per quanto |
|---|---|---|
| `visita_cancellata` | la cancellazione ce li **mette**: una riga per visita (§3.1) | 30 giorni `[proposta]`, §6.4 |
| **Le quattro copie settimanali** (D4-6) | sono copie del passato, ed è il loro mestiere | **fino a quattro settimane** (D4-7, §7.6) |
| **Backup / PITR del fornitore** | `[da misurare]`: 3c §9.3 A2 non è eseguita, D3c-2 **sospesa** (§7.5) | `[da misurare]` |
| **Agenda di carta** | non la tocca nessun programma | finché il quaderno esiste |
| File esportati a mano | l'export **sconfigge** la conservazione, e la spec lo dice (§7.3). ⚠︎ **Alla revisione 1 questa riga diceva «sono l'unica copia di sicurezza, quindi non si cancellano a cuor leggero»**, cioè l'istruzione **opposta** a §7.3 e §7.5 punto 3: con D4-6 la copia la fa il sistema, e un export a mano **si cancella quando ha finito di servire** | fuori dal sistema |
| Log di Postgres | se un vincolo era scattato (§3.3) | `[da misurare]` |
| `localStorage` dei telefoni | vive sul telefono; nessuna cancellazione remota lo tocca | 24 ore dal tocco `[proposta]` |
| ⚠︎ **WhatsApp, rubrica e registro chiamate** | **la chat l'apre l'applicazione** (§3.5): non è un registro esterno. Numero, nome e testo restano sul telefono, nella sua copia in nuvola e presso Meta | finché la chat esiste |
| **`annuncio`** | la cancellazione ci scrive **le date delle sue visite** (§3.4) | 1 ora, «e poi al primo invio» (§6.4) |
| **`passata_conservazione`** | se l'ha cancellata la passata automatica, resta il suo `id` (§6.3.1 presidio 3) | cinque settimane `[proposta]` |
| **Log di richiesta di Vercel** | gli `id` che stanno nelle URL, più l'IP dell'operatrice (§3.3) | `[da misurare]` |
| Registri davvero fuori dall'app | scontrini, quaderni, agenda di carta | **non è questo sistema** |

⚠︎ **L'ultima riga è la più importante e la più facile da dimenticare.** Questa applicazione non tiene prezzi né
incassi (D14), quindi dentro di essa niente si oppone a una cancellazione; ma **una cancellazione nell'app non è la
cancellazione dei dati della cliente presso il salone.** Un nome su uno scontrino, in un quaderno o nella rubrica di
un telefono resta dov'è. L'informativa deve dire di che cosa parla, e la procedura di §5.6 deve ricordare a chi
esegue di guardare anche fuori. `[giudizio giuridico]` §13, domanda 6.

⚠︎ **Un appuntamento futuro.** Cancellare una cliente cancella **anche le sue visite future**. Chi esegue deve
guardare le prossime visite e dirglielo: «se la cancello, l'appuntamento di giovedì non esiste più». ⚠︎ **Già nel 3b**: «la conferma nomina la cliente e **quante visite** spariscono con lei» (3b §5.6), e il 3b è più
avanti — sta decidendo se mostrarle per nome e ora (§12.1). Alla revisione 2 questa riga lo mandava come nuovo.

⚠︎ **La cancellazione può fallire con `40P01`, ed è misurato.** La cascata blocca `client` **prima** di `visit`, cioè
il contrario dell'ordine dei trigger, e un `delete from appointment` concorrente su una visita a due appuntamenti
**va in stallo 6 volte su 6** — «questo è il diritto di cancellazione di §11.3, raggiungibile oggi» [dalla
revisione, spec §12.1, quarta forma misurata di §10.5]. Conseguenza per il piano 4: **la cancellazione di una
cliente ha bisogno della stessa disciplina di ritentativo su `40P01` del percorso di scrittura** (3a §4.3 passo 5).
Il pulsante è del 3b, e ⚠︎ **il requisito è già soddisfatto**: 3b §5.6 lo decide, con la stessa misura 6 su 6
(§12.1). Alla revisione 2 questa riga lo mandava come nuovo.

✅ **La cancellazione passa da «Controlla», e questo documento diceva il contrario fino al 28/09/2026.** Scriveva: «non
ha un codice d'invio, quindi se la risposta non arriva l'operatrice non sa se è avvenuta», e proponeva la rilettura come
ripiego. **Falso dal 3b revisione 2:** `public.cancella_cliente(p_codice, p_cliente)` **prende il codice d'invio** [letto,
3b riga 635], quindi la cancellazione di una cliente è una scrittura come le altre — se la risposta non arriva,
«Controlla» dice se ha scritto, e l'esito è `cancellata` o `non_trovata` (3a §4.4, righe 6 e 7). **L15 è chiuso**, e il
ripiego della rilettura non serve.

### 5.5 Opposizione, e la limitazione che non c'è

**Opposizione agli auguri di compleanno.** `no_messages` (`0003:22` [letto]) la registra, e l'interruttore sta sulla
scheda cliente (3b).

⚠︎⚠︎ **Ma il presidio NON è quello che la revisione 1 descriveva, e la differenza è sostanziale.** Diceva: «§9.7 esclude
dalle liste dei compleanni le clienti che l'hanno alzato … una cliente che compare in lista riceverà gli auguri; una che
non compare, no». **Falso nel sistema che verrà costruito**, per una decisione dell'utente presa nella chat del 3b:

> **D3b-6** — «**Nei compleanni, chi ha l'opt-out COMPARE, senza WhatsApp e senza chiamata.** Permette gli auguri di
> persona e rende impossibile il messaggio. È una lettura più larga di spec §9.7 («excluding `no_messages`»)» [dalla
> spec 3b, letta il 28/09/2026]

Quindi: **compaiono tutte**, e l'opposizione è presidiata **dall'assenza delle azioni sulla riga**, non da un filtro.

⚠︎⚠︎ **E il presidio è DUPLICE, non singolo: la chat del 3b l'ha precisato il 28/09/2026, ed è più forte di come la
revisione 2 di questo documento lo scriveva.** La revisione 2 diceva soltanto «la riga non ha azioni», che è un controllo
al momento in cui la lista si disegna. Il 3b prescrive anche la seconda metà, e chiude una corsa vera:

| | Che cosa presidia | La prova, e la sua mutazione |
|---|---|---|
| **La riga** | chi ha l'opt-out compare **senza WhatsApp e senza chiamata** | prova di database; mutazione: **rimetti i pulsanti** |
| ⚠︎ **Il tocco** | **non è un indirizzo statico**: passa da una Server Action che **rilegge `no_messages` dal database e rifiuta** | **impostare `no_messages` fra la lettura della lista e il tocco → il tocco non restituisce nessun indirizzo** (3b §9.2) |

⚠︎ **Perché la seconda metà conta per il piano 4, e non è un dettaglio del 3b:** senza di essa una cliente che alza
l'interruttore **mentre la lista è già aperta sul telefono di un'operatrice** riceverebbe gli auguri comunque, perché i
pulsanti erano già disegnati. Con essa, il rifiuto avviene **al momento del tocco**. È la differenza fra «i pulsanti non
erano disegnati» e «l'invio è stato rifiutato», e cambia che cosa l'informativa può promettere (§9.5).

Tre conseguenze:

1. La frase della revisione 1 era falsa, e va sostituita da questa.
2. **Il presidio è più debole di come il documento lo dichiarava:** dipende da una persona che legge un segno accanto a
   un nome, non da una riga che non c'è. Cambia che cosa l'informativa può promettere sull'opposizione (§9.5), e che una
   persona possa sbagliare **è una cosa che va detta** invece di chiamarla «presidio tecnico».
3. ⚠︎ **La prova che la revisione 1 ordinava al 3b — «rossa se il filtro `no_messages` sparisce» — presidiava un filtro
   che il 3b non scrive.** Chi l'avesse scritta alla lettera avrebbe piantato nel 3b il comportamento che D3b-6 ha
   scartato. Il requisito corretto è: **una prova che diventa rossa se la riga con `no_messages` riacquista WhatsApp o
   la chiamata.**

⚠︎ **Con la base dichiarata da D4-1b — il consenso — `no_messages` è anche una revoca parziale di consenso**, non solo
un'opposizione: la data di nascita si raccoglie **solo** per gli auguri [dalla spec, §14 domanda 2], quindi una
cliente che alza quell'interruttore ha revocato l'unica finalità per cui quel campo esiste. `[proposta]` Il piano 4 la
tratta così e **lo dichiara come domanda**, non come conclusione: se la revoca del consenso agli auguri debba
comportare anche la cancellazione di `birth_month` e `birth_day` è la coda della domanda 2 di §13. Oggi il campo
resta, e nessuno lo legge più.

✅ **Requisito per il 3b: già soddisfatto, e in forma migliore di come lo chiedevo.** 3b §9.2 prescrive entrambe le
prove della tabella qui sopra. Il piano 4 **non manda più nessun requisito** su questo, e registra che la forma è del 3b.
Spec §6.2 dice che «una colonna che registra un'opposizione e non ha modo di essere impostata è una lacuna di
conformità, non un'omissione di interfaccia»; ⚠︎ **estenderla a «una colonna impostata che nessuno legge» era
un'analogia di chi scrive, non della spec**, e alla revisione 2 si dichiara come tale.

⚠︎ **La limitazione del trattamento non ha nessun meccanismo, e non se ne può fabbricare uno.** «Sospendete l'uso
dei miei dati senza cancellarli» chiederebbe di marcare la scheda — e **con D26 non esiste nessun posto dove
scrivere una marca**. Non c'è testo libero, e inventare una colonna `limitata boolean` sarebbe una decisione di
dominio presa al posto dell'utente per un caso che in un salone di tre persone non si è mai presentato.

`[proposta]` **Il ripiego, dichiarato:** una richiesta di limitazione si tratta **fuori dall'app**, sul registro
cartaceo di §5.6, e si converte in una cancellazione **se la cliente è d'accordo**. ⚠︎ **E se non è d'accordo** — ramo
che la revisione 1 non aveva — la richiesta **resta aperta sul registro** e si risponde **per iscritto** che il salone
non ha un modo di sospendere l'uso senza cancellare. **È una risposta, e va data.** Se il caso arriva una volta, la
colonna si costruisce: a quel punto c'è una ragione misurata invece di un'ipotesi. §13, domanda 7.

### 5.6 Che cosa costruisce il piano 4, e che cosa chiama chi

⚠︎ **Questa è la cucitura più delicata del piano 4, e va letta insieme a §12.**

| Pezzo | Chi lo costruisce | Perché |
|---|---|---|
| **Il foglio A4** della singola cliente: la funzione **e la pagina resa** (§5.1) | **piano 4** | ⚠︎ D4-8 ha trasformato il consegnabile da file a **pagina resa**, e alla revisione 1 §5.6 non era stata aggiornata: la pagina, il suo stile di stampa e l'impaginazione **non avevano un proprietario** |
| **Pulsanti** «modifica» e «cancella» su spec §9.6 | **piano 3b** | 3a §3.3 assegna «clienti» al 3b |
| **Il POSTO del pulsante «esporta la sua scheda»** | **piano 3b**, che lo costruisce inerte con una riga che dice quando arriverà | ✅ **composto con la chat del 3b il 28/09/2026**: D3b-8, rev. 2 |
| **Il COLLEGAMENTO del pulsante alla funzione** | **piano 4** | è la metà che resta mia |
| Funzione di export **dell'intero insieme** (§7.2) | **piano 4** | spec §11.5 |
| Query di eleggibilità alla conservazione + esecuzione della cancellazione (§6) | **piano 4** | spec §11.4 |
| **Sezione «Dati personali» dentro Impostazioni** (export completo + elenco in sola lettura di chi sta per essere cancellata) | **piano 4** `[proposta]` | vedi la lettura L4-1 di §11 |
| **Il lavoro pianificato** della cancellazione automatica **e della copia settimanale** | **piano 4** | D4-2, §6.3.1 — è **uno solo** per le due cose |
| **`client.ultimo_contatto` e la sua scrittura nel trigger di `0007`** | **piano 4** | §6.2.1. ⚠︎ Collide con `updated_at` del 3b: **L30**, e l'ordine delle due migrazioni su `client` è dell'orchestratrice |
| **`public.passata_conservazione`**, con la sua linea di base dei permessi | **piano 4** | §6.3.1 presidio 3 |
| **Il secchio privato di archiviazione e i suoi permessi in quattro direzioni** | ⚠︎ **da assegnare**: si crea nella dashboard, non nel codice — è il mestiere del 3c, e il 3c ha chiuso la sua procedura senza una voce per esso | §7.6.3. **Buco dichiarato**, §12.1 |
| **`app.dimentica_clienti(p_tetto int)`**, la funzione che cancella | **piano 4** | §6.2.3 |
| **Contrassegno** su Impostazioni quando ci sono clienti eleggibili (spec §9.11) | **piano 4** `[proposta]`, sul punto d'innesto che il 3a-2 ha già nominato | ⚠︎ Alla revisione 2 questa riga diceva «nessuno, non si costruisce», e §12.1 la dichiarava superata: **tre sezioni, tre risposte**. Alla revisione 3 il piano 4 lo prende (L4-3), perché è l'unico rivelatore del margine di §6.3.2 |
| **Riga al punto di raccolta** (spec §8.2) | **piano 4** il testo (§9.6), **3a-2** la posizione | 3a §3.1 costruisce la creazione della cliente nella scheda |
| **Registro cartaceo delle richieste** | **titolare**, non è software | §5.6, qui sotto |

✅ **Il pulsante di export: era un buco, ed è stato composto con la chat del 3b il 28/09/2026.**

**Com'era.** La revisione 1 di questo documento assegnava il pulsante al 3b «e se il 3b arriva prima, nasce spento con un
segnaposto dichiarato»; la **revisione 1 del 3b** diceva l'opposto — «il pulsante **non c'è**, e la schermata **non**
mostra un pulsante disattivato». Composto: una funzione scritta che **nessuna schermata chiama**, spec §11.3 inadempiuta
con tutto il codice al suo posto, e — come il 3b lo scrive nel suo §8 — **il limite più serio del 3b, l'unico che
riguarda un diritto dell'interessata, passava da temporaneo a permanente.**

**Com'è adesso.** La **revisione 2 del 3b** (D3b-8, commit `69f5dd5`, verificata il 28/09/2026) **costruisce il posto del
pulsante e lo lascia inerte, con una riga che dice quando arriverà**; il piano 4 **lo collega**. Il piano 4 non lo
costruisce e non lo dà per costruito: sono due metà dichiarate su entrambi i lati.

⚠︎ **Come si è chiusa è la parte istruttiva:** nessuno dei due ha ceduto all'altro, e nessuno l'ha dato per fatto —
**le due chat si sono parlate**. È il rimedio che §6.3.3 descrive in astratto per le composizioni fra piani, applicato
una volta.

**Il registro cartaceo delle richieste.** `[proposta]` Un quaderno in salone con: data della richiesta, **data entro cui
rispondere**, che cosa chiedeva, chi ha verificato l'identità e come, che cosa è stato consegnato, data della risposta.
Serve a due cose: dimostrare di aver risposto, e ricordarsi delle richieste che il software non sa trattare (la
limitazione di §5.5, i registri fuori dall'app di §5.4).

⚠︎ **E va istruito, non solo nominato — alla revisione 1 si dicevano solo i campi.** `[proposta]` Sta in un posto chiuso,
lo tiene la titolare, lo leggono le tre operatrici, e **una pagina si cancella quando non serve più a dimostrare di aver
risposto**: il termine va scelto, non lasciato a «finché il quaderno esiste».

⚠︎ **E la cosa più contraria all'intuito, che va scritta:** una richiesta di **cancellazione** crea un foglio che nomina
la persona che ha chiesto di essere cancellata. È una sede di dati personali che il piano 4 crea da sé, sta nel
censimento di §3, e non ha nessun modo di essere cancellata se non a mano.

⚠︎ **Quel quaderno non entra nel repository, e non entra in nessun file di questo progetto.** Il repository è
pubblico (§11).

---

## 6. La conservazione (spec §11.4, D21)

> ⚠︎⚠︎ **AVVERTENZA, D4-11 (28/09/2026): il meccanismo di questa sezione NON è chiuso, e non lo chiuderà una lettura.**
>
> Due giri avversariali hanno trovato **due volte** che §6 misurava la grandezza sbagliata — la revisione 1 cancellava
> una cliente viva per **regressione**, la revisione 2 per **anticipo** (§6.2) — e ogni volta il difetto sarebbe morto
> in mezzo secondo contro un database. La spec originale si è già data la regola, al suo §15: *«il rischio residuo si
> sposta dove può essere estinto: il piano scrive le migrazioni e le prove le eseguono.»*
>
> **Quindi, per decisione dell'utente:** le correzioni che una lettura può fare sono applicate qui sotto, ma **la forma
> del meccanismo resta `[proposta]`**, e si stabilisce quando il piano scrive la migrazione ed esegue le prove di §7.4.
> Nessuna riga di §6 va letta come «misurata», e **una prova che passa e questo testo che divergono: vince la prova**.
> Un terzo giro di lettura su §6 è stato scartato di proposito — il quarto giro del piano 3a fu esattamente questo, e la
> spec scrisse che «un quarto giro produrrebbe una quarta lista dello stesso tipo».

### 6.1 Il termine: 12 mesi (D4-1)

**Decisione dell'utente del 28/09/2026, D4-1:** i dati si conservano **12 mesi dall'ultimo appuntamento**. «Se una non
viene per un anno, si cancella».

⚠︎ **D21 è superata sul numero, e si cita invece di cancellarla**, come fa il resto di questo progetto. D21 diceva:
«Client data deleted after 24 months of inactivity, on confirmation», con il periodo marcato **proposto** e rimandato
alla domanda 3 di spec §14. Il periodo è ora **12 mesi**; la seconda metà di D21 — «on confirmation» — è superata da
D4-2 (§6.3).

**Un termine più corto è più facile da difendere, non più difficile**, e questo è l'unico commento che chi scrive il
software può fare: 12 mesi tiene meno dati di 24, e ogni giustificazione che regge per 24 regge per 12. La conferma
**giuridica** resta la domanda 3 di §13, e con D4-4 vi risponde il titolare.

**D4-1b, e va verbalizzata con precisione perché la revisione 1 la registrava in due modi diversi.**

- **La domanda posta** riguardava il **termine di conservazione**, non la base giuridica.
- **La risposta, verbatim:** «i dati che teniamo sono nome, numero di telefono e compleanno. prestano il consenso quando
  vengono la prima volta a negozio. e restano i dati per 12 mesi dall'ultimo appuntamento. se una non viene per un anno,
  si cancella».

⚠︎⚠︎ **Che cosa si può ricavarne, e che cosa no.** Il titolare ha dichiarato **che cosa succede in salone**: le clienti
danno i dati la prima volta che vengono. **Che quello sia "il consenso" in senso giuridico è la domanda 2 di §13, non un
dato di partenza di questo documento** — una qualificazione giuridica non è un fatto dichiarabile dall'interessato, e la
revisione 1, chiamandolo «un fatto dichiarato dal titolare», si metteva al riparo da un giudizio che aveva comunque
adottato. Il primo giro ha anche trovato che le due citazioni della revisione 1 **non coincidevano**: in un punto le
virgolette contenevano solo il momento, in un altro anche «prestano il consenso», e dal documento non si poteva più
sapere quale fosse ricostruita.

Restano due limiti, **aperti per intero**: **L18** (il consenso, qualunque sia, non è dimostrabile dal sistema) e **L19**
(la scheda nasce al telefono, prima di quel momento). Sono in §10, e li governa la domanda 2 di §13.
### 6.2 Che cosa rende una cliente eleggibile — **rifatta alla revisione 2**

⚠︎⚠︎ **La revisione 1 di questa sezione era sbagliata, e il difetto era il peggiore possibile: cancellava una cliente
viva.** Va scritto per esteso, perché è la lezione più costosa del primo giro.

**Che cosa diceva:** eleggibile una cliente «senza nessuna visita, passata o futura, da 12 mesi, misurata su
`coalesce(last_activity_at, created_at::date)`».

**Perché era sbagliata.** `last_activity_at` **non** è «l'ultima volta che l'abbiamo vista»: è la data della visita più
lontana **fra quelle che esistono ancora**. Il trigger di `0007:45-54` la ricalcola come `max(v.visit_date)` sulle
visite residue, e **quando non ne resta nessuna scrive NULL** [letto]. Allora il `coalesce` ripiegava su `created_at`,
cioè sul giorno in cui la scheda è nata. La composizione, con date vere:

1. gennaio 2025: una signora telefona, la si registra in agenda. Non viene. `last_activity_at` è vuoto.
2. settembre 2026, venti mesi dopo: telefona e prenota per giovedì. `last_activity_at` = giovedì. Non eleggibile.
3. mercoledì **disdice**. Nessuna visita residua → `last_activity_at` torna **vuoto**.
4. quella notte il predicato la giudica su `created_at` di gennaio 2025: venti mesi. **Eleggibile.**
5. la passata la cancella. Nessuno guarda (D4-2), e la copia di §7.6 può non esistere ancora (§7.5).

⚠︎ **Non serve nessuna misura per stabilirlo: le due metà sono già dimostrate da due prove verdi nella suite
committata** [letto, `tests/schema/client-activity.test.ts:83-87` e `:111-123`]:
*«recomputes downward when the appointment is deleted»* asserisce `toBeNull()`, e *«makes an aged, never-booked client
eligible through created_at»* asserisce che il `coalesce` rende eleggibile una cliente anziana con attività nulla.
Serve una misura solo per sapere **quante** clienti stanno in quello stato oggi.

⚠︎ **E il difetto ha una gemella che il primo giro ha trovato nello stesso punto:** la stessa regressione avviene
quando una visita è **riassegnata** a un'altra cliente — la prima torna a `null` [letto, la prova *«moves the activity
when a visit is reassigned to another client»*, `client-activity.test.ts:70`].

**La causa, detta in una riga:** `coalesce(last_activity_at, created_at)` **confonde due situazioni diverse** — «non ha
mai prenotato» e «aveva prenotato, e adesso non ha più nessuna visita» — e le tratta entrambe come «ferma da quando è
nata la scheda».

#### 6.2.1 Che cosa la sostituisce (D4-10)

**Decisione dell'utente del 28/09/2026, D4-10:** una cliente che prenota e poi disdice **ha avuto a che fare con il
salone**, e i 12 mesi ripartono da quella telefonata.

`[proposta]` **Una colonna nuova, `client.ultimo_contatto date not null`, che non torna mai indietro.** Tre proprietà,
e ciascuna esiste per un difetto misurato del primo giro.

⚠︎⚠︎ **Il NOME è un impegno verso il 3b, non una scelta libera.** `app.touch_client_updated_at()` del 3b (migrazione
`0022`) **esclude `ultimo_contatto` per nome, in anticipo**, ed è ciò che chiude L30 e rende indifferente l'ordine fra
`0022` e la mia `0024`. **Se questo piano cambiasse il nome, l'esclusione non morderebbe e la collisione tornerebbe in
silenzio** (L32). Quindi: **il nome è `ultimo_contatto`, confermato**, e un cambio va comunicato al 3b **prima** di
scrivere `0024`.

1. ⚠︎⚠︎ **Monotona, e il confronto ha TRE termini, non due.** La revisione 2 scriveva
   `greatest(ultimo_contatto, <oggi>)`, e il secondo giro ha mostrato che **misura il giorno della scrittura, non la
   data dell'appuntamento** — cioè cancella una cliente **mesi prima** del termine che il cartello dichiara. Con date
   vere: il 15 marzo prenota per il 20 settembre (`ultimo_contatto` = 15 marzo); **il 20 settembre viene, e nessuna
   scrittura avviene**, perché la visita era già in agenda e il sistema non registra le presenze (D15); il 16 marzo
   dell'anno dopo la sua data ha dodici mesi e un giorno, la visita di settembre è passata e non la protegge più →
   **eleggibile, sei mesi dopo essere stata in salone**, con il cartello che dice «12 mesi dall'ultimo appuntamento».
   Nel caso estremo — prenotazione a più di 12 mesi — era eleggibile **la notte dopo la visita**.

   `[proposta]` La forma: **`greatest(ultimo_contatto, <oggi>, <visit_date della visita toccata>)`**. Così spec §6.2.2
   («il massimo di `visit_date`, futuro compreso») resta il **pavimento**, D4-10 aggiunge «oggi» per i contatti, e D4-1
   («12 mesi dall'ultimo **appuntamento**») è soddisfatta alla lettera.
   ⚠︎ **Conseguenza accettata:** disdire una prenotazione lontana tiene la protezione fino a quella data più 12 mesi.
   È **sovra-conservazione**, cioè il verso giusto in cui sbagliare, e va dichiarata invece di scoprirla.

   **Perché monotona:** un valore che può tornare indietro per effetto collaterale è un valore su cui non si cancella.
   ⚠︎ **E la monotonia va PRESIDIATA, non affermata:** oggi `00051` lascia `insert, update, delete` su `client` ad
   `authenticated` e ogni rettifica è una scrittura diretta dal telefono, quindi una colonna nuova sarebbe scrivibile a
   **qualunque** valore da qualunque sessione di operatrice attiva. `[proposta]` La impone un `before update` su
   `client` che rimette `greatest(new.ultimo_contatto, old.ultimo_contatto, …)`, **oppure** si revoca l'UPDATE di quella
   colonna ad `authenticated`.
2. **`not null`, con default il giorno della creazione.** Sparisce il `coalesce`, e con esso il ripiego che ha causato
   il difetto. Una cliente appena creata ha `ultimo_contatto` = oggi, quindi non è eleggibile: la stessa protezione che
   il `coalesce` cercava di dare, senza confondere i due casi.
   `[proposta]` Il default è `(now() at time zone 'Europe/Rome')::date`, **non** `current_date` né `created_at::date`:
   `created_at` è un `timestamptz` (`0003:23` [letto]) e `created_at::date` si legge nel fuso **della sessione**, che
   sul server è UTC — una cliente creata alle 00:30 ora di Roma verrebbe datata al giorno prima. È la stessa ragione
   per cui il taglio non usa `current_date` (§6.2.2 punto 2), e la revisione 1 l'aveva applicata a un solo lato del
   confronto.
3. **Tocca ogni contatto, non solo le visite** — inserimento, spostamento e **cancellazione** di una sua visita o di
   un suo appuntamento (la cancellazione è il punto di D4-10), e la **modifica dei suoi dati di contatto**.

   ⚠︎⚠︎ **Ma la SEDE non è un trigger nuovo, e la revisione 2 non la diceva.** Un trigger nuovo su `visit`/`appointment`
   che scrive su `client` è **esattamente la forma che `0007:60-75` ha misurato come blocco incondizionato** della suite
   committata: «*a plain AFTER ROW trigger here would run its `update client` synchronously inside each insert … this is
   an unconditional hang, not a slow test*». Per quello i due trigger esistenti sono `deferrable initially deferred`. E
   `0008:75-79` lascia un obbligo permanente sull'ordine dei blocchi fra `client` e `visit`, che un secondo trigger
   raddoppierebbe per nulla.

   `[proposta]` **`ultimo_contatto` si scrive dentro l'`update public.client` del trigger differito che esiste già**
   (`app.touch_client_activity`, `0007:45-54`): una colonna in più in quell'istruzione. Nessun trigger nuovo, nessun
   ordine di blocco nuovo, nessuna forma di stallo nuova. ⚠︎ E c'è un guadagno che la revisione 2 non si prendeva:
   **siccome la scrittura è `greatest(...)`, il pericolo di EvalPlanQual documentato in `0007:28-42` non può renderla
   sbagliata** — uno snapshot vecchio può solo proporre un valore più piccolo, che `greatest` scarta. È il primo
   vantaggio vero della monotonia.

   ⚠︎ **E il trigger sul contatto si restringe ai campi che sono un contatto:** `full_name`, `phone`, `birth_month`,
   `birth_day`. **Non** `preferred_operator_id`, che una cascata `on delete set null` (`0003:21`) può azzerare su
   un'intera coorte in un colpo; **non** `no_messages`, che è il modo in cui §5.5 esegue un'**opposizione** — esercitare
   un diritto non deve allungare la conservazione di dodici mesi.

   ⚠︎⚠︎ **E una collisione con il 3b, che nessuna delle due chat poteva vedere da sola: L30.** `client.updated_at`
   (D3b-5) ha un trigger **incondizionato** (`0004:41-47` [letto]), e la colonna è la **versione** del compare-and-set
   della scheda cliente. Quindi ogni aggiornamento di `ultimo_contatto` bumpa quella versione, e una collega che ha la
   scheda aperta riceve «**è stata modificata da una collega**» quando di suo non è cambiato niente — sul percorso più
   frequente del salone. I tre rimedi possibili e il fatto che decida l'orchestratrice sono in **L30**.

#### 6.2.2 Il predicato, scritto per esteso

`[proposta]` Sono **due** condizioni con due significati distinti, e la revisione 1 ne aveva una sola sovraccarica:

```
ultimo_contatto < ((now() at time zone 'Europe/Rome')::date - interval '12 months')::date
and not exists (select 1 from public.visit v
                 where v.client_id = c.id
                   and v.visit_date >= (now() at time zone 'Europe/Rome')::date)
```

1. **`<` stretto, e va scritto.** La revisione 1 non scriveva mai l'operatore di confronto: in tutto il documento non
   compariva né `<` né `<=`. Un giorno di scarto su una cancellazione irreversibile senza testimoni è precisamente il
   rischio che questa sezione dice di chiudere. Con `<`, una cliente il cui `ultimo_contatto` cade **esattamente** sul
   taglio **non** è eleggibile: si tiene un giorno in più, che è il verso giusto in cui sbagliare.
2. **Il taglio lo calcola il server, mai il browser.** È l'**eccezione dichiarata** alla regola di spec §5.1: «oggi» è
   la data civile in `Europe/Rome` calcolata sul telefono, **tranne** il taglio della conservazione, perché «una
   pulizia distruttiva su dati personali non deve prendere la data dal browser» [dalla spec, §5.1]. `current_date`
   dipende dal fuso della sessione, e sul server quel fuso è UTC: per un'ora o due ogni notte darebbe il giorno
   sbagliato.
3. **La visita futura è una condizione a sé.** Serve anche con `ultimo_contatto`: una cliente che prenota oggi per il
   giugno di due anni dopo avrebbe `ultimo_contatto` = oggi, e a dodici mesi e un giorno sarebbe eleggibile **con un
   appuntamento in agenda**. Le due condizioni non si sostituiscono: la prima dice «da quanto non ci parliamo», la
   seconda «ci aspettiamo di vederla».

⚠︎ **Aperto per il piano, e non lo decide questo documento:** con `ultimo_contatto` in piedi, **`last_activity_at`
serve ancora a qualcosa?** Nasceva per la conservazione (spec §6.2.2) e la conservazione non la usa più. La sua
macchina non è gratis — un trigger di vincolo differito, un blocco di riga, e uno stallo `40P01` accettato come prezzo
(spec §6.2.2, §10.5) — ma è **consegnata, provata e citata da tredici prove**. Togliere una cosa che funziona è una
migrazione e un rischio; tenerla senza consumatori è una macchina muta. **È del piano, con il censimento dei suoi
consumatori in mano** (§12.1).

#### 6.2.3 La forma del meccanismo, e con che identità gira

`[proposta]` **Due funzioni, non una**, e la ragione è un difetto misurato del primo giro: la revisione 1 proponeva una
sola funzione `security invoker` chiamata **sia** dalla schermata **sia** dal lavoro pianificato, e le due hanno
identità diverse.

| | Chi la chiama | Forma |
|---|---|---|
| `public.clienti_da_dimenticare()` | la schermata di Impostazioni (§6.3.2) | `stable`, `security definer`, proprietaria `postgres`, `set search_path = ''`, **con `(select app.is_active_operator())` in testa**, EXECUTE revocata a `public` e ad `anon`, concessa ad `authenticated` |
| `app.clienti_da_dimenticare()` | il lavoro pianificato (§6.3.1) | la stessa lettura, nello schema `app` che PostgREST non espone (`config.toml`, `schemas = ["public", "graphql_public"]`) — ⚠︎ **ma con una guardia sull'identità del lavoro**, vedi sotto |

⚠︎⚠︎ **«Lo schema `app` non è esposto da PostgREST» è l'argomento che `0013` dichiara INSUFFICIENTE, e la revisione 2 vi
appoggiava l'assenza della guardia senza citarlo.** `0013:20-31` [letto] dice alla lettera: «*Il presidio vero è quella
riga di `config.toml`, che oggi **NESSUNA prova pianta**: se qualcuno vi aggiunge `"app"`, qui non si rompe niente. La
frase forte diventerebbe vera solo aggiungendo `app.is_active_operator()` in testa alle due funzioni.*» Lì dietro c'era
un codice d'invio da bruciare; qui ci sono i nomi di chi sta per essere cancellata e — con la funzione che cancella
(sopra) — **la cancellazione stessa**.

⚠︎ E c'era una contraddizione interna: **presidio 5 pretende che la funzione in `app` *solleva* se l'identità non è quella
prevista**, cioè una guardia, e §6.2.3 la negava. `[proposta]` La guardia è **sull'identità del lavoro**, non
dell'operatrice — `if current_user not in (<proprietario>, 'service_role') then raise` — che è anche il «solleva» di
presidio 5. E §7.4 guadagna la prova più economica del documento: **`config.toml` espone `public` e `graphql_public` e
nient'altro**, mutazione «aggiungere `"app"` a `schemas`». `0013` dichiara che quella prova non esiste; §7.4 è il posto
per farla nascere.

⚠︎⚠︎ **E manca la terza funzione: quella che CANCELLA.** Le due qui sopra sono **letture**. Presidio 2 prescrive una
sequenza di tre istruzioni — blocco, rilettura in istruzione separata, `delete` — che per costruzione deve stare **in una
sola transazione, una cliente per volta**, e nessuna delle due la contiene. ⚠︎ Peggio: l'opzione «una rotta pianificata
su Vercel che chiama la lettura» **non può** contenerla — attraverso PostgREST non c'è transazione multi-istruzione,
quindi il blocco si rilascia alla fine della `select` e **presidio 2 non esiste**, cioè si torna al difetto della
revisione 1 (elenco prima, cancellazione dopo).

`[proposta]` **`app.dimentica_clienti(p_tetto int)`** — `security definer`, proprietaria `postgres`,
`set search_path = ''`, firma scritta per esteso (`0013:127-131` avverte che `create or replace function` azzera ogni
attributo non ripetuto) — ospita il giro, presidio 2, la guardia d'identità di presidio 5 e le scritture in
`passata_conservazione`. **È questa che il lavoro pianificato chiama**, non la lettura.
⚠︎ E va detto se usa **`cancella_cliente(p_cliente uuid) returns jsonb`**, che §12.1 registra come regalo del 3b, o se
cancella diretto e perché: due strade per cancellare la stessa cosa, e la passata non deve bypassare quella provata.

⚠︎ **Perché `security definer` con la guardia, e non `security invoker`.** Con `security invoker` un'operatrice
**disattivata** non riceve un errore: riceve **zero righe**, perché è la sicurezza per riga a filtrare. Questo progetto
ha scelto quella forma di proposito per altre tabelle — `00051_privilege_baseline` tiene la SELECT ad `anon` proprio
perché alcune prove asseriscono «zero righe» e non `42501` [dalla revisione]. Qui produrrebbe due danni:

- **sulla schermata:** è il buco di §4.3 — un controllo che non distingue «non hai il permesso» da «non c'è niente»;
- ⚠︎ **sulla passata:** un lavoro pianificato che gira con l'identità sbagliata **non solleva niente**. Legge zero
  righe, cancella zero clienti, registra «0 cancellate» e **non cancella mai più nulla**. La conservazione si spegne in
  silenzio, il termine esposto in salone (§9.4) diventa falso, e **la firma del guasto è l'assenza di un evento**, che
  è la cosa più difficile da notare che esista. §6.3.1 presidio 5 esiste per questo.

⚠︎ **La funzione resta senza parametri**, ma la ragione della revisione 1 era debole e va corretta: diceva che un
parametro `p_mesi` «trasformerebbe l'elenco in *mostrami tutte le clienti in ordine di anzianità*». Falso: per D10 e
D11 **ogni operatrice attiva legge già tutte le clienti** con qualunque ordinamento, direttamente da `client` (§4.1,
L12). La ragione vera è più semplice: **il termine di conservazione è dichiarato in un'informativa esposta al
pubblico, e un numero dichiarato non si passa come argomento.** Costo dichiarato: cambiare il termine costa una
migrazione.

### 6.3 La cancellazione è automatica (D4-2)

**Decisione dell'utente del 28/09/2026, D4-2: cancellazione automatica, senza conferma.** Allo scadere dei 12 mesi la
cliente sparisce, e nessuno deve toccare niente perché avvenga.

⚠︎ **Questo supera la seconda metà di D21 e il contrassegno di spec §9.11:**

- **D21** diceva «on confirmation». Superata da D4-2.
- **Spec §11.4** diceva «Impostazioni elenca chi sta per essere rimossa e **una persona conferma**». La prima metà
  resta (§6.3.2), la seconda no.
- **Spec §9.11** metteva un contrassegno sulla navigazione «perché una pulizia che vive solo dentro una schermata di
  impostazioni non avviene mai». ⚠︎ **La revisione 1 lo cancellava da sé; alla revisione 2 non lo fa più** — vedi L4-3
  in §11.1: la decisione è di un cerchio a tre fra 3a-2, 3c e piano 4, e il 3c l'ha formalmente rimessa
  all'orchestratrice. Questo documento **non la chiude**.

⚠︎ **La scelta è stata fatta con il costo davanti**, ed era scritto nell'opzione: si perde l'unico momento in cui una
persona può dire «no, aspetta, questa è la sorella di Vera». Il piano 4 la esegue, e mette al suo posto i presidi che
una cancellazione senza testimoni richiede — che **non sono una conferma mascherata**: nessuno deve premere niente
perché la cancellazione avvenga.

#### 6.3.1 Dove gira, e i cinque presidi

**Il problema di sede.** Oggi nel progetto non esiste nessun lavoro pianificato: le tre pulizie brevi stanno dentro
`app.chiudi_invio` proprio per non averne uno (§6.4). La cancellazione automatica **non può** stare lì: sarebbe una
cancellazione di clienti dentro la transazione di un salvataggio di appuntamento, con i suoi blocchi, il rischio di
stallo di L16, e la conseguenza che un salvataggio fallito annulli anche la cancellazione — o che una cancellazione in
corso faccia fallire un salvataggio.

`[proposta]` **Un lavoro pianificato, una volta al giorno, fuori dall'orario del salone.** Due sedi possibili:

| Sede | Costo |
|---|---|
| **`pg_cron` su Supabase** | sta dove stanno i dati, non dipende da Vercel, e gira come proprietario del database. `[da misurare]` è disponibile sul piano in uso? (§12.1) |
| **Una rotta pianificata su Vercel** che chiama `app.clienti_da_dimenticare()` | si prova come si prova una rotta; ⚠︎ ma gira con la chiave `service_role`, cioè **con la sicurezza per riga scavalcata**, e §4.3 afferma «la `service_role` non arriva mai al browser» — che copre il browser, non una rotta. Se la sede è questa, quell'invariante va riscritta come «la `service_role` vive in **due posti nominati**», e §3 guadagna una sede |

⚠︎ **Cinque presidi, e sono la parte del piano 4 che merita più attenzione di tutte.** Il primo giro ne ha trovati
quattro scritti male su quattro; questi sono i rifatti.

**1. Un tetto per passata:** `[proposta]` **al massimo 50 clienti per esecuzione**. Se il predicato è sbagliato, un
tetto è la differenza fra perdere 50 clienti e perdere l'intera base.

**2. Una cliente per transazione, e l'eleggibilità si rivaluta DENTRO quella transazione.** ⚠︎ Questo presidio era
sbagliato alla revisione 1, e il difetto era silenzioso. L'elenco si legge **prima**; la cancellazione avviene **dopo**,
in un'altra transazione. Fra i due momenti l'inserimento di una visita prende un `FOR KEY SHARE` sulla riga `client`
(chiave esterna `visit.client_id`, `0004:5` [letto]): il `delete` **aspetta**, la prenotazione committa, e poi il
`delete` riprende e porta via la cliente **e per cascata la visita appena salvata** — dopo che l'operatrice ha già
letto «✓ Salvata». Nessun errore, nessuno stallo, nessuna traccia: non è la forma di L16, è più silenziosa.

`[proposta]` **La forma giusta è già scritta in questo progetto**, nel commento di `0007:31-44` [letto], che documenta
misurato perché non basta mettere il predicato dentro la `DELETE`: sotto `READ COMMITTED` un `qual` rivalutato da
EvalPlanQual usa **lo snapshot originale dell'istruzione** e non vede il commit dell'altra transazione. Quindi, per
ogni cliente, nell'ordine:

1. `perform 1 from public.client where id = $1 for update` — prende il blocco e **aspetta** l'eventuale scrittura in corso;
2. **rivaluta l'eleggibilità in un'istruzione separata**, che apre il proprio snapshot e vede il commit appena avvenuto;
3. se è ancora eleggibile, cancella.

⚠︎ **E il ritentativo su `40P01` rifà l'INTERA transazione, dal passo 1.** ⚠︎ La revisione 2 scriveva «ricomincia dal
passo 2, non dal `delete`», e il secondo giro l'ha corretta: un `40P01` **annulla la transazione intera**, quindi il
blocco del passo 1 è già stato rilasciato e ripartire «dal passo 2» vorrebbe dire rileggere senza ripigliarlo — cioè
riaprire, stretta, la finestra che presidio 2 esiste per chiudere. Il punto che quella frase cercava resta: **non si
salta al `delete`.** La disciplina di 3a §4.3 passo 5 è
giustificata da un argomento sull'**atomicità** («ogni chiamata è una transazione e l'abort la annulla per intero»),
non sul **predicato**; e nella scrittura la sicurezza in più viene dal codice d'invio, che la cancellazione **non ha**
(L15). Un ritentativo che rifà solo il `delete` rifà esattamente il caso in cui una scrittura concorrente ha reso la
cliente non eleggibile.

**3. Il conto va in una tabella, non in un log.** ⚠︎ Alla revisione 1 stava «in una riga di log», e non funzionava per
due ragioni: un log non è interrogabile da una prova (quindi la mutazione «aggiungere il nome alla riga» non arrossisce
niente), e presidio 4 deve **rileggere** lo stato della passata precedente, cosa che da un log non si fa.

`[proposta]` Una tabella `public.passata_conservazione` con: istante, quante clienti cancellate, gli `id`, e lo stato
(«normale» / «fermata al tetto»). **Mai nomi, mai telefoni** (L5).

⚠︎⚠︎ **E la tabella nasce senza linea di base dei permessi.** `00051:1-25` ha **misurato** che la regola predefinita di
Supabase concede ad `anon` e ad `authenticated` tutto il set su ogni tabella nuova di `public`, che la sicurezza per riga
**non** governa `TRUNCATE`, e che `truncate table client` come `anon` **riusciva**. Due conseguenze, non una: la tabella
sarebbe leggibile e scrivibile per difetto, e **troncarla azzererebbe in silenzio il latch di presidio 4** — l'unico
stato che ferma una passata impazzita — senza lasciare traccia, perché la traccia **è** la tabella. `[proposta]` Si
ripete per esteso la linea di base di `00051`, e `0019`/3c §9.12 avvertono che **dopo ogni dispiegamento la ACL di
difetto si ri-concede**: va rifatta.

⚠︎ **Quella tabella è una sede di dati personali nuova, e va detto**: dopo la cancellazione è **l'unico posto del
sistema che dice *chi*** — `visita_cancellata` tiene un conteggio, questa tiene identificativi di persone cancellate.
Incrociata con una copia settimanale precedente, li ricollega ai nomi. Entra nel censimento di §3, in §5.4 e in §10, e
ha un termine proprio: `[proposta]` **cinque settimane**, cioè il margine della copia (§7.6) più uno — oltre, non serve
più a niente, perché non c'è più niente da rimettere dentro.

**4. La passata si ferma al tetto, e lo dice a una persona nominata.** ⚠︎ Alla revisione 1 era «la passata successiva
non parte», e tre cose non funzionavano: **nessuno** era incaricato di leggere il segnale (avendo tolto il contrassegno
di spec §9.11), la **sede dello stato** non era detta, e il caso che lo scatta non era quello argomentato.

`[proposta]` La forma rifatta: se una passata raggiunge il tetto, scrive lo stato «fermata al tetto» in
`passata_conservazione`, **le successive non cancellano niente** finché qualcuno non riarma, e il riarmo è un'azione
esplicita registrata nella stessa tabella. Il destinatario va **nominato** — è la titolare (D3c-3).

⚠︎⚠︎ **E il secondo giro ha trovato che così il presidio è un interruttore che si dimentica, cieco proprio verso il
guasto per cui presidio 5 è nato:** lo stato agganciato produce «0 cancellate» per sempre, e presidio 5 guarda solo
l'identità, non il latch. `[proposta]` Tre aggiunte, e sono del piano:
   - il **riarmo ha un nome e una guardia** — chi può riarmare la conservazione può riaccendere una cancellazione di
     massa, ed è il percorso più distruttivo che il piano 4 consegna: va scritto come funzione con la sua guardia, non
     come «un'azione registrata»;
   - il latch ha una **vita massima dichiarata**, oltre la quale la passata **solleva** invece di scrivere uno zero
     silenzioso;
   - la passata legge il latch **a chiusura**: «nessuna riga negli ultimi N giorni» significa **non armata**, non «tutto
     bene».

⚠︎ **E il caso che lo scatta non è agosto.** La revisione 1 argomentava sull'arretrato di due settimane di chiusura
(«non arriva a 50»). È **la prima esecuzione di sempre** a vedere tutto l'arretrato preesistente del salone: è quella
che più probabilmente supera 50, e in quel caso cancellerebbe 50 clienti **e** spegnerebbe la conservazione lo stesso
giorno. `[proposta]` La prima esecuzione si fa **con qualcuno che guarda**: si legge l'elenco di §6.3.2, si decide, e
solo dopo il lavoro pianificato si accende. Non è una conferma permanente — è l'accensione, una volta.

**5. Un presidio contro il cancellare *niente*.** ⚠︎ Alla revisione 1 i presidi erano quattro, **tutti contro il
cancellare troppo**. Il verso opposto è un guasto silenzioso: la passata che gira con l'identità sbagliata, o con un
predicato che non seleziona più nessuno, non solleva niente e registra «0 cancellate» per sempre.

`[proposta]` Due cose, entrambe piccole: la funzione nello schema `app` **solleva** se l'identità non è quella prevista
invece di restituire zero righe (§6.2.3); e §7.4 porta una prova che la passata **cancella** — non solo che non
cancella troppo.

#### 6.3.2 L'elenco resta, in sola lettura

`[proposta]` La sezione «Dati personali» di Impostazioni (L4-1) **mostra l'elenco** di chi sta per essere cancellata —
nome, da quanto è ferma, quando sparirà — **senza nessun pulsante**.

Non è una conferma: la cancellazione avviene comunque. È l'unica finestra per accorgersi di un errore **prima** che sia
irreversibile, e costa una query che il piano 4 scrive comunque (§6.2.3). Un'operatrice che vede un nome che non
dovrebbe esserci ha ancora il tempo di prenotarle un appuntamento — che è, per come è fatto il meccanismo, **il modo
giusto di salvarla**: un contatto aggiorna `ultimo_contatto`, e una visita futura la esclude comunque (§6.2.2).

⚠︎ **Ma il limite di questo elenco va scritto, perché il primo giro l'ha trovato ed è un difetto del ragionamento, non
della schermata.** L'obiezione che spec §9.11 muoveva al contrassegno — «una pulizia che vive solo dentro una schermata
di impostazioni **non avviene mai**» — si trasferisce **parola per parola** su questo elenco: *un elenco che vive solo
dentro Impostazioni non lo apre nessuno.* E §6.3.4 gli appoggia sopra tutto il margine di quattro settimane.

Il percorso che nessun presidio intercetta, ed è raggiungibile: **un predicato sbagliato che rende eleggibili tre
clienti in più al giorno.** Non raggiunge mai il tetto di 50, non fa scattare presidio 4, lascia solo un conteggio in
una tabella che nessuno interroga, e si vede unicamente in una schermata che niente invita ad aprire. In quattro
settimane tutte e quattro le copie contengono lo stato già cancellato, e il margine si consuma in silenzio.

`[proposta]` **Serve un rivelatore che non dipenda da chi apre una schermata, e che non sia un pulsante** (D4-2 resta
intatta).

⚠︎⚠︎ **La forma che la revisione 2 proponeva NON funziona, e il secondo giro l'ha misurata a tavolino:** «la passata si
ferma quando il conto si discosta dal valore atteso, e il valore atteso lo dà la prima esecuzione». Il numero della prima
esecuzione è **l'arretrato preesistente**, una volta sola, senza relazione con il regime. In regime, per un salone di tre
persone, il conto atteso è **zero quasi ogni giorno**: il secondo giorno, atteso 0 e vero 1, «si discosta» → la passata
si ferma → con il latch di presidio 4 **non cancella più niente**, e nessuno è incaricato di accorgersene, che è il buco
per cui il rivelatore era stato inventato. Nell'altra taratura (atteso = l'arretrato) non scatta mai più.

`[proposta]` **Nessun valore atteso assoluto: un tasso su una finestra mobile**, letto da `passata_conservazione`
stessa — per esempio «si ferma se le cancellate del giorno superano `max(5, 3 × la media delle ultime quattro
settimane)`» — più il rilevamento del verso opposto (N passate consecutive con stato diverso da «normale», §6.3.1
presidio 4). ⚠︎ **E finché quel numero non esiste, questa non è un presidio: è una proposta**, e §6 lo dichiara.

⚠︎ **In alternativa, o in aggiunta, il contrassegno di spec §9.11 servirebbe proprio qui** — e alla revisione 3 il piano
4 **lo prende** (L4-3).

#### 6.3.3 ⚠︎⚠︎ D4-2 più D3c-2: il rischio più grosso di tutto il progetto

- **D4-2:** la cancellazione delle clienti scadute è **automatica**, e nessuno la guarda mentre avviene.
- **D3c-2:** il progetto sta sul **piano gratuito**. ⚠︎ **E alla revisione 2 il 3c ha SOSPESO questa decisione** («Si
  misura prima, si decide dopo»): se ci sia o no un ripristino dal fornitore è `[da misurare]`, e la misura è **3c §9.3
  A2** (§1.3.1).

**Nel caso peggiore — A2 dice che non c'è ripristino — le due insieme fanno questo: una cancellazione automatica con un
predicato sbagliato è irreversibile e irrecuperabile.** Non c'è una persona che dica «no, aspetta» (D4-2 l'ha tolta,
con il costo davanti) e non c'è una copia del fornitore da cui tornare. L'unica copia sarebbe l'agenda di carta, che
non contiene i numeri di telefono di chi non ha appuntamenti in quei giorni — cioè **esattamente** le clienti che la
conservazione cancella.

⚠︎ **Come è nata questa composizione, detto con quello che si legge e non con una ricostruzione.** La revisione 1 di
questo documento affermava che «nessuna delle due chat poteva vederlo». **Non è esatto, ed è stato un reperto del primo
giro:** il 3c *aveva* questo documento in mano — il suo §0 dichiara di averne letto «§1.3, §7.3, §7.5» —, ma **non §6**,
dove stava D4-2. La composizione è sfuggita per **quali sezioni** sono state lette, non per invisibilità reciproca. E la
tesi originale non è più verificabile da nessuno: la revisione 1 del 3c è stata sovrascritta e non era committata.

⚠︎ **La sostanza però non dipende da chi sapeva che cosa:** la composizione è distruttiva comunque, e se le due chat si
fossero parlate questo paragrafo perderebbe la cornice e non una riga del contenuto.

⚠︎ **E c'è una conseguenza che il primo giro ha trovato e che va spedita, non solo scritta:** il 3c tiene in §9.7 E3
l'elenco dei **modi di perdere i dati** che la titolare firma, e la cancellazione automatica di D4-2 **non è fra
loro** — benché il 3c abbia letto questo documento. È il **sesto modo**, e §12.1 lo manda al 3c.

#### 6.3.4 Che cosa copre D4-6, e che cosa non copre ancora

Messo davanti al rischio composto, l'utente ha chiesto un'alternativa gratuita al piano a pagamento, e fra quattro
possibili ha scelto **D4-6: la copia automatica settimanale** (§7.6), quattro copie a rotazione (D4-7).

**Che cosa cambia, quando §7.6 esisterà:**

- **Prima:** una cancellazione sbagliata è irreversibile (nessuno guarda) **e** irrecuperabile.
- **Dopo:** resta irreversibile nel momento in cui accade — D4-2 non è cambiata, e non doveva — ma **non è più
  irrecuperabile**: c'è un margine per accorgersene e rimettere dentro le clienti da una copia.

⚠︎⚠︎ **L'aritmetica, alla terza correzione: il margine GARANTITO è di TRE settimane, non quattro.** La revisione 1
scriveva «cinque mesi», la revisione 2 «quattro settimane», e il secondo giro ha trovato lo sfasamento di uno: al momento
della cancellazione la copia più recente che la precede ha **già fino a sette giorni**, e viene scartata alla quarta
esecuzione dopo essere stata scritta — quindi l'ultima copia utile sopravvive fra **21 e 28 giorni** dalla cancellazione,
e il minimo garantito è **21**.

**Sono due numeri diversi per i due versi della stessa rotazione, e vanno tenuti distinti:**

| | |
|---|---|
| **Margine garantito per accorgersi** | **tre settimane** (§6.3.2, §6.3.4) |
| **Permanenza massima di una cancellata in una copia** | **quattro settimane** (§5.4, §9.4 — è il numero da esporre) |

Ed è un margine difficile da usare, perché **una cliente eleggibile è per definizione una cliente che non si fa vedere da
dodici mesi**: non sarà lei ad accorgersi di essere sparita.

⚠︎⚠︎ **E una cliente rimessa dentro è eleggibile la notte stessa.** Una cancellata per anzianità ha, per costruzione,
`ultimo_contatto` più vecchio del taglio: la copia contiene quel valore, il ripristino lo rimette, e la passata della
notte dopo la cancella di nuovo — senza testimoni. Si salva solo se il ripristino rimette anche una sua visita, cioè
**non** nella classe dell'esempio di §6.2 (la signora registrata al telefono che non è mai venuta, che non ha righe in
`visit`). `[proposta]` **Il ripristino scrive `ultimo_contatto = <oggi>` su ogni riga che rimette** — è lecito perché la
colonna è monotona, ed è anche **vero**: rimetterla dentro è un contatto. Il requisito viaggia con la procedura di
ripristino spedita al 3c, non solo qui.

⚠︎⚠︎ **E quattro cose che il primo giro ha trovato, e che questo documento non può dichiarare chiuse:**

1. **Oggi il numero di copie è ZERO.** §7.6 è `[proposta]` dalla prima riga all'ultima: non esiste il lavoro
   pianificato, non esiste il secchio, non esiste la rotazione, e `src/` contiene solo `src/dominio/` [letto]. **Fino
   alla consegna di §7.6 il margine è zero, e L13 e L21 valgono per intero** (§10).
2. ⚠︎ **Fra l'ottavo giorno e la consegna del piano 4 la sola copia corrente è il dump manuale del 3c**, vecchio quanto
   l'ultimo dispiegamento. La revisione 2 scriveva «non c'è nessuna copia di niente», ed era **più larga del vero**: alla
   revisione 3 D3c-5 dice che dall'ottavo giorno si smette di **scrivere** sulla carta ma **i registri non si
   distruggono** e restano l'archivio storico. Il piano 4 arriva **dopo il primo uso vero** (D19). ⚠︎ E la carta non ha
   mai contenuto compleanni né storico dei trattamenti: è un archivio parziale, non una copia.
3. **La copia, come specificata alla revisione 1, non si poteva rimettere dentro** (§7.6, rifatta).
4. **I cinque presidi di §6.3.1 restano tutti, e non sono prudenza.** Una copia rende un errore **riparabile**, non
   innocuo: riparare vuol dire che qualcuno si accorge, legge una procedura e rimette dentro dei file a mano.

### 6.4 ⚠︎ Le tre conservazioni brevi, e perché «30 giorni» non è quello che il codice fa

Il codice ha già tre pulizie, e **tutte e tre stanno dentro `app.chiudi_invio`** (`0013:126-177`, riscritta in
`0019:179-209` [letto]):

| Tabella | Termine scritto nel codice | Lotto |
|---|---|---|
| `invio` | `aggiornato < now() - interval '30 days'` | `limit 100` |
| `visita_cancellata` | `cancellata_il < now() - interval '30 days'` | `limit 100` |
| `annuncio` | `creato < now() - interval '1 hour'` | `limit 100` |

La sede è una scelta misurata e buona: `app.chiudi_invio` gira **una volta per invio**, mentre il trigger degli
annunci gira da 2 a 5 volte per salvataggio, e di più al crescere degli appuntamenti [dalla revisione, `0019:118-127`
e `0013:158-172`]. Non c'è nessun lavoro pianificato da mantenere, che è esattamente ciò che la migrazione voleva
evitare.

⚠︎ **Ma il termine reale non è 30 giorni, ed è qui che il piano 4 deve essere onesto.** Tre fatti, letti nel codice:

1. **La pulizia avviene solo se qualcuno scrive.** `app.chiudi_invio` è chiamata dalle funzioni di scrittura; se il
   salone non salva niente, non si cancella niente. **Una chiusura di due settimane ad agosto** — che la domanda 5
   di spec §14 nomina già — è due settimane in cui nessuna riga scade.
2. **La pulizia avviene solo se la transazione committa.** ⚠︎ **Alla revisione 1 questo punto diceva «solo se la
   scrittura riesce», e non è esatto.** `app.chiudi_invio` è chiamata anche nei rami che **non** hanno scritto:
   `esiste_gia`, `cancellata_altrove`, `non_trovata`, `modificata_altrove`, `gia_cancellata` — in tutti quei casi la
   funzione **ritorna** invece di sollevare, la transazione committa, e **le tre pulizie avvengono** [letto,
   `0016:152-178`, `0016:303`, `0017:61-257`]. Vero è solo che **ogni errore sollevato** annulla anche la pulizia.
3. **Si cancellano al massimo 100 righe per invio, per tabella.** Un arretrato più grande si smaltisce su più invii.
   E la cancellazione di una cliente **aggiunge** righe a `visita_cancellata` (una per visita, §3.1) **e a `annuncio`**
   (§3.4) **senza chiamare `chiudi_invio`**: aggiunge e non smaltisce. ⚠︎ **Con D4-2 non è più un caso raro:** la
   passata automatica cancella fino a 50 clienti per volta, cioè scrive decine di righe in entrambe, e non ne
   smaltisce nessuna. Le righe aggiunte sono però **fresche**, quindi non sono quelle che il lotto dei 30 giorni
   prenderebbe: l'effetto è sull'arretrato, non sul termine delle righe nuove.

**Quindi il termine dichiarabile è:** *«30 giorni, e poi al primo **invio che si chiude con un esito**, a lotti di 100
per invio»* `[proposta]` — più precisamente: **alla prima chiamata di `app.chiudi_invio` che committa**.

⚠︎ **Non «30 giorni»**, che era la forma della spec; **non** «al primo salvataggio riuscito», che era la revisione 1 ed
era più stretta del vero; e ⚠︎ **non «anche un Annulla»**, che la revisione 2 ha aggiunto correggendo ed era **falso**:
il percorso «Annulla»/«Controlla» registra il codice con `app.apri_invio_come_annullato` (`0018:29-63` [letto]), che
**non chiama mai** `chiudi_invio` — e in tutto `0018` `chiudi_invio` compare **una volta sola**, in un commento
[letto]. Nemmeno un invio tardivo che trova un esito già registrato la chiama. **La metà giusta resta:** `esiste_gia`,
`cancellata_altrove`, `non_trovata`, `modificata_altrove` e `gia_cancellata` la chiamano e poi ritornano, la transazione
committa, e le tre pulizie avvengono.

⚠︎ **La correzione cambia il denominatore della misura** che §12.1 chiede: si contano gli **invii chiusi**, non i
salvataggi riusciti.

⚠︎ **E una promessa di ordine che il codice non fa:** le tre sottoquery hanno `limit 100` **senza `order by`**
(`0019:194-209` [letto]), quindi «le raggiunge» non ha l'ordine che la frase suggerisce. Non è fame — l'arretrato si
riduce comunque — ma la frase va scritta senza promettere quale lotto esce prima.

`[proposta]` **Il piano 4 non cambia la sede della pulizia**, e la ragione è quella di §1: il piano 4 rende
eseguibile ciò che c'è, non riprogetta un meccanismo misurato da un revisore su un database di prova. Quello che il
piano 4 fa è **scrivere il termine come è**, e `[da misurare]` far misurare al piano quante righe al giorno il salone
produce in queste tre tabelle, per sapere se 100 per invio smaltisce o accumula. Le alternative, con il loro costo,
sono in §12.

⚠︎ **Ma D4-2 ha cambiato la premessa, e va detto qui e non solo in §12.1 punto 15.** La ragione per non toccare la
sede era «non introdurre un lavoro pianificato». Con la cancellazione automatica **un lavoro pianificato esiste
comunque** (§6.3.1). Quindi: `[proposta]` **il piano decide, con la misura del punto 9 di §12.1 in mano**, se le tre
pulizie brevi salgono su quel lavoro — dove diventerebbero «30 giorni» per davvero — oppure restano dove sono. Chi
scrive propende per **farle salire**, perché il costo che le teneva ferme è già stato pagato; ma è una decisione che
vuole il numero, non un'opinione, e il numero non esiste ancora.

⚠︎ **Nota per chi scriverà l'informativa:** queste tre tabelle sono **tabelle di servizio**, non il registro delle
clienti, e il dato che contengono è pseudonimo (§3.1). Se e come vadano nominate nell'informativa è la domanda 8 di
§13 — **non una scelta di chi scrive il software.**

---

## 7. Export e backup (spec §11.5)

### 7.1 I due export non sono la stessa cosa

| | Export della singola scheda (§5.1) | Export dell'intero insieme |
|---|---|---|
| **A che serve** | risponde a una richiesta di accesso o di portabilità | **portare i dati altrove.** ⚠︎ **Non** è la copia di sicurezza: quella la fa il sistema da sé, §7.6 (D4-6) |
| **Chi lo riceve** | la cliente, in mano, di persona | resta al salone |
| **Chi lo chiede** | la cliente | un'operatrice attiva |
| **Contiene** | una cliente | tutte |
| **Che forma ha** | **un foglio A4 stampabile** (D4-8) | un CSV |
| **Dove sta il pulsante** | scheda cliente, spec §9.6 (3b) | Impostazioni, spec §9.9 (§5.6) |

⚠︎ **Non sono interscambiabili in nessuna direzione**, e la spec lo dice già per una delle due [dalla spec, §11.3].
L'altra direzione è altrettanto sbagliata: rispondere a una richiesta di accesso con «le esporto tutto e le cerco la
sua riga» mette in mano a chi esegue un file con tutte le clienti, che è esattamente il file che §7.3 dice di non far
girare.

### 7.2 L'export dell'intero insieme

`[dalla spec, §11.5]` Una Server Action produce un CSV di clienti e appuntamenti e lo restituisce a chi l'ha
chiesto. Gira **dietro il controllo della sessione *e* `app.is_active_operator()`** (§4.3). Nessun route handler
pubblico; la chiave `service_role` non arriva mai al browser; nessun bucket di archiviazione pubblico.

`[proposta]` Aggiunte del piano 4, tutte piccole e tutte per la stessa ragione:

- `Cache-Control: no-store` **anche sulla risposta dell'export**, non solo sulle pagine (3a §4.9 la impone alle
  pagine; un file che contiene tutte le clienti non deve stare in nessuna cache intermedia).
- Il nome del file porta la data e l'ora, perché un file chiamato `clienti.csv` diventa tre file chiamati
  `clienti (1).csv` e nessuno sa più quale è vecchio — e un export vecchio è un export che sopravvive alla
  conservazione (§7.3).
- `[proposta]` **`.gitignore`**: oggi il file ignora `node_modules/`, `.env`, `.env.local`, `supabase/.temp/` e
  `supabase/.branches/` [letto], e **non ignora nessun `.csv`**. Un export salvato dentro la cartella del progetto è
  **un `git add -A` dal diventare pubblico** (§11). Il piano 4 aggiunge i modelli dei file di export.

### 7.3 Un export sconfigge la conservazione, e l'informativa lo deve dire

`[dalla spec, §11.5]` «Una cliente cancellata a 24 mesi [**ora 12**, D4-1] resta in ogni file preso prima della cancellazione.
L'informativa dichiara che esistono copie. Gli export stanno nel gestore di password del salone o in un disco
controllato, e **mai in una chat WhatsApp**, che rivelerebbe di nuovo l'intero insieme a un terzo. L'app non ne
conserva copia.»

Il piano 4 non ha niente da aggiungere a questa frase, che è già giusta. Ha da aggiungere **due cose che ne
seguono**:

1. `[proposta]` **Gli export a mano hanno un termine anche loro**, altrimenti la conservazione di §6 è una finzione:
   un export di oggi tiene in vita per sempre una cliente cancellata domani. Il termine **non è una cosa che il
   software possa far rispettare** — sono file su un disco di qualcuno — quindi è una **regola scritta nella
   procedura**: *un export a mano si cancella quando ha finito di servire.*
   ⚠︎ **Con D4-6 questa regola è diventata più facile, non più difficile**: la copia di sicurezza ce l'ha il sistema
   (§7.6), quindi **nessuno ha più bisogno di tenersi un export "per sicurezza"** — e un file che nessuno ha bisogno di
   tenere è un file che si cancella senza discutere. L'export a mano serve solo a **portare i dati altrove**, e dura
   quanto quel trasporto.
2. **Chi tiene gli export lo dichiara.** Se il file sta nel gestore di password del salone, chi ha quel gestore ha
   tutte le clienti. È la stessa aritmetica di §4.3.

### 7.4 Le prove che contano più di tutte — **rifatta alla revisione 2**

`[proposta]` Il piano 4 non consegna nessun meccanismo distruttivo senza queste prove, e ognuna è scritta **con la
mutazione che la fa diventare rossa**: una prova che non può fallire non presidia niente, ed è la lezione che questo
progetto ha già pagato sei volte [dalla revisione, spec §15.1].

⚠︎⚠︎ **La tabella della revisione 1 è stata rifatta perché sei delle sue tredici righe non arrossivano come scritte, e
il SECONDO giro ha trovato che dieci delle ventisei rifatte non arrossiscono.** I difetti sono annotati riga per riga,
perché sono la parte istruttiva.

> ⚠︎⚠︎ **E prima delle righe, quattro fatti sull'imbracatura che il secondo giro ha misurato e che la revisione 2 non
> dichiarava. Senza questi, il conteggio delle righe non significa niente: oggi NESSUNA delle ventisei è eseguibile.**
>
> 1. **Non esiste nessun modo di invecchiare una cliente.** `ultimo_contatto` è monotona e il suo trigger tocca anche la
>    modifica della scheda: qualunque fixture che le scriva una data di tredici mesi fa viene **riportata a oggi dal
>    trigger stesso**, e `asOwner` scavalca la sicurezza per riga ma **non i trigger**. Quella data è la precondizione di
>    **sei** righe. `[proposta]` La fixture spegne il trigger (`alter table client disable trigger …`), scrive, e lo
>    riaccende — e **va scritto nel documento, perché è una decisione**: la prova della monotonia pretende il trigger
>    **accesso**, quindi le due si escludono e la fixture che lo spegne **disarma in silenzio** l'altra.
> 2. ⚠︎ **La mutazione «far tornare `ultimo_contatto` indietro» non arrossisce per costruzione:** il trigger scrive
>    `greatest(old, oggi)`, e togliere il `greatest` fa scrivere `oggi`, che non è **mai** minore di `old`. La monotonia
>    è falsificabile **solo** contro un valore fornito dal chiamante — che è il percorso che il ripristino della copia
>    crea (§6.3.4) e che «Modifica» del 3b crea ogni giorno. La riga giusta è in §7.4.3.
> 3. ⚠︎ **Cinque righe presidiano un foglio reso dal server e una Server Action, e in questo repository NON ESISTE
>    un'applicazione:** `src/` ha cinque moduli di logica pura, e `tests/` ha due famiglie sole — dominio puro e database
>    (node-postgres). **Quelle cinque prove non sono scrivibili in nessuna delle due**, e il documento non dichiarava il
>    costo di una famiglia nuova. `[proposta]` Il piano dichiara quel costo, o le righe si spostano su una funzione SQL
>    sotto la Server Action — e allora la sua firma va scritta, perché §7.1 e §7.2 non la nominano mai.
> 4. ⚠︎ **Le otto righe di §7.6.4 vogliono un secchio, un client di archiviazione e la chiave di servizio**, e
>    l'imbracatura non ha nessuno dei tre (`sessioni.ts` porta solo la chiave pubblica; `config.toml` ha
>    l'archiviazione attiva ma **nessun secchio dichiarato**).

#### 7.4.1 Il foglio della singola cliente

| Prova | Mutazione che la fa diventare rossa |
|---|---|
| Il foglio contiene la cliente bersaglio **e non contiene una cliente-canarina**, in una sola prova, su una fixture con **almeno due clienti** entrambe con visite | togliere il filtro sull'`id` |
| Il foglio contiene **tutte** le visite di quella cliente | togliere una visita dal risultato |

⚠︎ **La revisione 1 aveva due righe con la stessa mutazione**, quindi un presidio solo travestito da due. E la riga
«non contiene le altre clienti», **da sola**, è soddisfatta da un foglio **vuoto** o da una funzione che solleva: per
questo le due asserzioni vanno nella **stessa** prova. ⚠︎ La canarina ha un nome che non può comparire per altra via —
**non** «Vera», che è un'operatrice del seed — e la fixture deve avere almeno due clienti, altrimenti togliere il filtro
non cambia niente. E poiché D4-8 ha scelto un **foglio A4 reso dal server**, il risultato porta intestazioni, stile e il
nome del salone: un confronto su un nome corto sbaglia in entrambe le direzioni.

#### 7.4.2 I controlli d'accesso sui due export

| Prova | Mutazione che la fa diventare rossa |
|---|---|
| Un'operatrice **disattivata**, **con una sessione ancora valida**, non ottiene niente da nessuno dei due export | togliere `app.is_active_operator()` e lasciare il solo controllo di sessione |
| Un account autenticato che **non è operatrice** (`outsider@example.test`) è respinto | togliere `app.is_active_operator()` — **la stessa mutazione della riga sopra**, e sono due presidi della stessa cosa da due direzioni |
| **`has_function_privilege`**: `anon` e `public` **non** hanno EXECUTE, `authenticated` sì | concedere l'EXECUTE ad `anon` |

⚠︎⚠︎ **La revisione 2 aveva applicato la lezione giusta nel posto sbagliato, e il secondo giro l'ha misurato — con la
forma corretta già scritta in DUE file di questo repository.** La revisione 2 aveva imparato dal primo giro che «non
ottiene niente» non discrimina, e aveva messo l'asserzione sullo SQLSTATE. **Ma `anon` prende `42501` anche dalla
guardia**, quindi rimettere il permesso non cambia nulla e la prova **resta verde sotto la sua stessa mutazione**. È
scritto, misurato e commentato in `tests/schema/write-functions.test.ts:401-411` («*three of the four behavioural tests
below stayed green with EXECUTE wrongly granted, **unable to fail***») e in
`tests/schema/availability-window.test.ts:443-450` [letto]. **La forma che discrimina è `has_function_privilege`**, che
guarda il permesso **direttamente**, e sta **accanto** alla prova comportamentale, non al suo posto.

⚠︎ E la terza riga della revisione 2 era inerte in modo più grossolano: la sua mutazione era «rimettere l'EXECUTE ad
`anon`», e `outsider` è `authenticated`, **che l'EXECUTE ce l'ha già**.

⚠︎ **La prima riga ha la mutazione giusta ma è inerte nell'ordine naturale di scrittura**, e va detto: `0015` cancella
`auth.sessions` a ogni cambio di `is_active`, quindi chi scrive *accedi → disattiva → chiama* misura una **sessione
morta** e la mutazione resta verde. L'ordine che produce la combinazione vera è **disattiva prima, poi apri la sessione
dalla cache**: va scritto nella riga, non lasciato a chi implementa.

⚠︎ La quinta riga esiste perché l'account c'è già: `outsider@example.test` è l'unico account autenticato che non è
operatrice, e sta in `seed.sql` proprio per questa direzione di prova [dalla spec, 3a §8.5]. Non va creato: va usato.

#### 7.4.3 Il predicato di eleggibilità (§6.2)

| Prova | Mutazione che la fa diventare rossa |
|---|---|
| **Una cliente che prenota e poi disdice NON è eleggibile** (D4-10, §6.2.1) | ripristinare il `coalesce` su `created_at` — ⚠︎ **e non** «far tornare `ultimo_contatto` indietro», che era la mutazione della revisione 2 e **non arrossisce per costruzione** (vedi l'avvertenza in testa, punto 2) |
| **Una cliente che a marzo prenota per settembre NON è eleggibile il marzo dopo** | togliere `visit_date` dal `greatest` (§6.2.1 punto 1) |
| **Un `update client set ultimo_contatto = <data vecchia>` da un'operatrice attiva non la fa regredire** | togliere il `greatest` dal `before update` che presidia la monotonia |
| ⚠︎ **Salvare una visita NON fa fallire una modifica di scheda cliente aperta** — la prova che il 3b mi ha chiesto per L32 | **rinominare la colonna**: l'esclusione di `app.touch_client_updated_at()` nomina `ultimo_contatto`, e con un altro nome non morde |
| Una cliente con una **visita futura** non è eleggibile | togliere la seconda condizione del predicato |
| `ultimo_contatto` **esattamente sul taglio** non è eleggibile; **un giorno prima** lo è | cambiare `<` in `<=` |
| Il taglio non si muove col fuso della sessione | mettere `current_date` al posto di `now() at time zone 'Europe/Rome'` |
| `ultimo_contatto` si aggiorna anche quando la cliente viene **modificata**, non solo quando prenota | togliere il trigger dalla `client` |

⚠︎ **La prima riga è il presidio del difetto peggiore del primo giro** (§6.2): va scritta come una sequenza —
cliente creata tredici mesi fa, prenotazione, disdetta — e deve fallire se qualcuno ripristina la forma della revisione
1. ⚠︎ **La terza riga non esisteva**, e la revisione 1 non scriveva nemmeno l'operatore di confronto. ⚠︎ La mutazione
della revisione 1 «togliere il futuro dal conto» **non abitava nel meccanismo che la prova presidiava**: il futuro sta
nel trigger di `0007`, non nella funzione, e `last_activity_at` è calcolata **al momento della scrittura** — una fixture
che prenota *prima* che la mutazione sia applicata conserva il valore buono e la prova resta verde. Col predicato di
§6.2.2 la condizione è **dentro** la funzione, e la mutazione è chiara.

#### 7.4.4 La passata (§6.3.1)

| Prova | Mutazione che la fa diventare rossa |
|---|---|
| **La passata cancella la cliente eleggibile, e la riga non c'è più** | `where false` nel `delete`, o `>` al posto di `<` nel predicato — ⚠︎ **e non** «far girare la passata con un'identità diversa», che era la mutazione della revisione 2 ed è una modifica **dell'imbracatura, non del codice**: con `security definer` di proprietà di `postgres` e senza guardia, un'identità diversa cancella comunque |
| **La passata SOLLEVA se l'identità non è quella prevista** (presidio 5) | far restituire zero righe invece di sollevare |
| **`config.toml` espone `public` e `graphql_public` e nient'altro** | aggiungere `"app"` a `schemas` |
| Con **60 eleggibili, ne cancella esattamente 50 e ne lascia 10** — asserzione **esatta**, mai «≤ 50» | togliere il tetto |
| Una prenotazione committata **fra l'elenco e la cancellazione** lascia la cliente in piedi | togliere la rilettura in istruzione separata (presidio 2) |
| Cancella **una cliente per transazione**: uno stallo su una non annulla le altre | metterle tutte in una transazione |
| Dopo una passata al tetto, la successiva **non cancella niente**; dopo il riarmo riprende | togliere la rilettura dello stato in `passata_conservazione` |
| Il conto finisce in `passata_conservazione` con gli `id` e **senza** nomi né telefoni | aggiungere il nome alla riga |

⚠︎ **La prima riga non esisteva alla revisione 1, e la sua assenza era il difetto più insidioso:** tutte le righe erano
**limitative** («non supera il tetto», «non cancella una cliente con visita futura»), e una passata che cancella
**zero** le soddisfa tutte. Quattro presidi contro il cancellare troppo e nessuno contro il cancellare niente.
⚠︎ **La seconda riga era `«non supera il tetto»`, cioè un limite superiore**: l'asserzione ora è **esatta** — 50
cancellate e 10 sopravvissute — perché è l'unica forma che distingue «il tetto funziona» da «non ha cancellato nulla».

#### 7.4.5 La cancellazione, dovunque parta

| Prova | Mutazione che la fa diventare rossa |
|---|---|
| La cancellazione di una cliente lascia **esattamente una riga per visita** in `visita_cancellata` — ⚠︎ serve una fixture con **due** visite: con una sola, «una riga per visita» e «una riga» sono indistinguibili | restringere `zz_registra_visita_cancellata` con `when (pg_trigger_depth() = 1)`, che lo spegne **solo per la cascata** dalla cliente lasciando verde il caso diretto |
| La cancellazione di una cliente scrive in `annuncio` **le date delle sue visite** — ⚠︎ e non è coperta da `annunci.test.ts`, che cancella la **visita**, non la **cliente**: un livello di cascata in meno | la stessa restrizione sui trigger d'annuncio di `0019:130-155` |

⚠︎ **Alla revisione 2 queste due righe avevano la colonna mutazione VUOTA**, in violazione della regola che questa
sezione enuncia otto righe sopra: «una prova che non può fallire non presidia niente». Le mutazioni esistevano, ed erano
le più insidiose del progetto.

### 7.5 I backup del fornitore: la domanda 5 è **sospesa**, non risposta

`[dalla spec, §11.5]` «La copertura dei backup sul piano Supabase in uso **va misurata prima del rilascio, non
assunta**» — domanda 5 di spec §14, che la revisione 1 della spec aveva **affermato senza verificare**.

⚠︎⚠︎ **La revisione 1 di questo documento ha commesso lo stesso errore, e va scritto per esteso.** Affermava:
«Risposta arrivata: D3c-2, piano gratuito, **nessun backup**», e su quell'asserzione aveva barrato una riga del
censimento, riscritto §5.4, aggiunto §6.3.3, **fatto prendere all'utente due decisioni (D4-6, D4-7)** e proposto un
numero per l'**informativa esposta in salone** (§9.4).

**Ma il 3c, alla sua revisione 2, ha SOSPESO D3c-2** — e l'ha sospesa **per la stessa colpa**:

> «⚠︎ **SOSPESA. Si misura prima, si decide dopo.** Nessuna conseguenza si scrive come fatto finché **§9.3 A2** non è
> eseguita. La revisione 1 **asseriva** "con il piano gratuito non c'è backup" mentre §13 dichiarava lo stesso fatto
> **[da misurare]**, e su quell'asserzione aveva riscritto una procedura d'emergenza, aggiunto un limite permanente e
> redatto una rinuncia da firmare.» [dalla spec 3c, **D3c-2**, letta il 28/09/2026 — la citazione è della revisione 2,
> e la revisione 3 la porta in forma più breve: D3c-2 resta **sospesa** e la misura resta **A2**]

**Quindi, alla revisione 2 di questo documento:** se il piano in uso abbia un ripristino è `[da misurare]`, la misura è
**3c §9.3 A2**, e **ogni** conseguenza qui si scrive condizionata a quella misura. Le sedi corrette sono §3, §5.4,
§6.3.3, §9.4, L13 e L21.

**Le due conseguenze, entrambe condizionate:**

- **Se A2 accerta che un ripristino c'è:** una cliente cancellata sopravvive nelle copie del fornitore per il periodo
  che A2 trascrive, e **quel periodo va nell'informativa** (§9.4).
- **Se A2 accerta che non c'è:** una cancellazione in massa da un telefono rubato è irrecuperabile (L13) fino alla
  consegna di §7.6, e il rischio composto di §6.3.3 vale per intero.

⚠︎ **In nessuno dei due casi D4-6 è sbagliata.** La copia settimanale è una buona cosa comunque — copre un errore
*dentro* il database, che nessun backup del fornitore renderebbe indolore — ma **la premessa che l'ha motivata non è un
fatto**, e va detto all'utente invece di lasciarlo scritto come se lo fosse.

### 7.6 La copia automatica settimanale (D4-6, D4-7) — **rifatta alla revisione 2**

**Che cos'è.** `[proposta]` Una volta a settimana, un lavoro pianificato — **lo stesso meccanismo della cancellazione
automatica**, §6.3.1, non un secondo da mantenere — scrive in un **secchio privato** dello spazio di archiviazione del
progetto una copia dei dati.

**Quante se ne tengono: quattro (D4-7).** Ogni settimana si scrive la nuova e si cancella la più vecchia: **quattro
settimane** per accorgersi di un errore e tornare indietro (§6.3.4 — e il punto di non ritorno è la **quinta
settimana**, non il quinto mese).

⚠︎ **La conseguenza sul cartello:** una cliente cancellata resta nelle copie **fino a quattro settimane**. §9.4 lo
scrive, con la condizione di §7.5.

#### 7.6.1 Che cosa contiene la copia — la correzione che la rende una copia

⚠︎⚠︎ **Alla revisione 1 questa copia NON si poteva rimettere dentro, e il difetto uccideva la funzione.** Diceva «un
file con **tutte le clienti e tutti gli appuntamenti**», copiando le parole di spec §11.5. Ma in
`0004_visit_appointment.sql` [letto]: `appointment` ha una chiave esterna **composta**
`(visit_id, appointment_date) → visit (id, visit_date)`, e `visit` è un genitore **obbligatorio**
(`visit_id uuid not null`). **`visit` non era nell'elenco.** Un file di sole clienti e appuntamenti non ripopola
niente: ogni riga viene rifiutata.

`[proposta]` **Il contenuto si elenca tabella per tabella, e non con una frase:**

| Tabella | Perché |
|---|---|
| `client` | i dati della cliente |
| **`visit`** | genitore obbligatorio di `appointment`, con chiave composta. **Senza, il ripristino non parte** |
| `appointment` | gli appuntamenti |
| ~~`appointment_slot`~~ | **non serve**: si rigenera dal trigger `zz_sync_appointment_slots` (`0005:58` [letto]) |
| `visita_cancellata`, `invio`, `annuncio` | **no**: sono tabelle di servizio con termini brevi propri (§6.4), e rimetterle dentro riporterebbe in vita dati che erano scaduti |

⚠︎ **E il contenuto non è quello dell'export di portabilità.** §7.1 dice che i due artefatti «non sono interscambiabili
in nessuna direzione»: un CSV leggibile da una persona non porta gli `uuid`, e senza gli `uuid` non si ripristina
niente. La copia è **tecnica** e non è pensata per essere letta da nessuno.

#### 7.6.2 La rotazione, scritta come invariante e non come sequenza

⚠︎ **Alla revisione 1 la rotazione era una sequenza, e produceva l'esito opposto a quello che dichiarava di
preferire:** «scrive la quinta, cancella la prima nella stessa esecuzione», con la nota «meglio una copia mancante che
una collezione che cresce». Lo spazio di archiviazione **non è transazionale**: se la cancellazione fallisce il file
nuovo **c'è già**, quindi lo stato è **cinque copie**, cioè esattamente «una collezione che cresce». E «non si considera
riuscita» non diceva che cosa conseguisse: con un ritentativo si arriva a sei.

`[proposta]` **La forma giusta è un'invariante, non una sequenza:**

> **A fine esecuzione il secchio contiene le quattro copie più recenti.**

Realizzata come: scrivi la nuova, **poi cancella tutto ciò che sta oltre le quattro più recenti**. È **idempotente** —
rieseguirla non fa danno — e **riparante**: se un'esecuzione precedente si è fermata a metà lasciandone cinque, la
successiva rimette a posto.

`[proposta]` Tre dettagli che la revisione 1 non diceva e che una prova pretende:

- ⚠︎⚠︎ **una copia è UN GRUPPO, non un file, e la revisione 2 si contraddiceva:** §7.6.1 pretende tre tabelle e §7.6.2
  fissava «`copia-YYYY-MM-DD.csv`», **un** oggetto — e un CSV non porta tre relazioni. La conseguenza cadeva sul numero
  che conta: «i quattro oggetti più recenti» con tre oggetti a settimana fa **nove giorni** di margine, non ventotto, e
  la rotazione cancellerebbe **pezzi** di copie recenti. `[proposta]` **Un prefisso per settimana** —
  `copia-YYYY-MM-DD/client.csv`, `/visit.csv`, `/appointment.csv` — e l'invariante si conta su **prefissi**, non su
  oggetti: «il secchio contiene i **quattro prefissi** più recenti, e ciascuno ha le sue tre tabelle». In alternativa un
  solo oggetto multi-relazione (`.sql` o `.jsonl`), e allora §7.6.1 va scritta in quella forma;
- **l'orologio è iniettabile**, altrimenti cinque esecuzioni nello stesso giorno scrivono lo stesso nome e si
  sovrascrivono — e la prova «dopo cinque esecuzioni ci sono quattro file» non è scrivibile;
- **una copia troncata conta come copia**: la rotazione conta oggetti, non copie valide, quindi «quattro copie» può
  voler dire tre buone e una inservibile. È un limite dichiarato, e la prova di §7.6.4 sul contenuto è la sola cosa che
  lo riduce.

#### 7.6.3 I vincoli sul secchio

⚠︎ **Spec §11.5 dice «nessun secchio di archiviazione pubblico».** D4-6 aggiunge un secchio, quindi la riga va onorata
alla lettera e nello spirito. `[proposta]`:

1. **Il secchio è privato**, e i permessi vanno scritti **in tutte e quattro le direzioni, non solo in lettura**: su
   `storage.objects`, `anon` e `authenticated` non hanno `select`, **né `insert`, né `update`, né `delete`**.
   ⚠︎ **E la revisione 2 scriveva «di quel secchio», che è impossibile: un grant è sulla TABELLA, non ha dimensione
   secchio** — per secchio si esprime solo come **politica**. Sono due meccanismi e il documento ne descriveva uno
   mutandone l'altro, il che rendeva inerte la prova. `[proposta]` Si scrivono **entrambi**: il revoke dei grant su
   `storage.objects` (la forma di `00051`), **e** una politica che limita quel secchio al solo servizio. ⚠︎ Alla revisione 1 il vincolo parlava solo di lettura — ma la ragione per cui **L13 cambia** è che chi
   ha in mano il telefono di un'operatrice attiva **non deve poter cancellare le copie**: senza il vincolo in
   cancellazione, «si perde al massimo una settimana» è un'affermazione senza presidio.
2. **Nessun pulsante dell'app la scarica.** La copia non è un export per le operatrici: l'export per loro è quello di
   §7.2, con i suoi due controlli. Chi ha bisogno della copia è chi ha le credenziali della dashboard (D3c-3).
3. **Nel secchio non va nient'altro che le copie.** ⚠︎ Alla revisione 1 questo punto diceva «il file è il solo contenuto
   del secchio», che contraddice alla lettera il punto sulle quattro copie.
4. **Il lavoro rifiuta di scrivere una copia vuota.** Se il conto delle clienti è zero, non scrive e segnala: altrimenti
   un errore d'identità produce un CSV **valido e vuoto**, la rotazione lo accetta, e dopo quattro settimane sono vuote
   tutte e quattro — nel momento esatto in cui servono.

#### 7.6.4 Le prove, e la sola che nessuna sostituisce

| Prova | Mutazione che la fa diventare rossa |
|---|---|
| Dopo cinque esecuzioni (orologio iniettato) ci sono **quattro** file | togliere la cancellazione delle vecchie |
| Se un'esecuzione ne lascia cinque, la successiva **torna a quattro** | scrivere la rotazione come sequenza invece che come invariante |
| La cancellazione tiene **le quattro più recenti**, non quattro qualsiasi | ordinare al contrario |
| La copia **contiene tante righe quante sono le clienti** — asserzione **esatta**, mai «più di zero» | prenderla con la chiave **anonima** o con `outsider@example.test`: la sicurezza per riga dà **zero righe**. ⚠︎ **E non** «con la sessione di un'operatrice», che era la mutazione della revisione 2 ed è inerte — per D10 e D11 un'operatrice attiva legge **tutte** le clienti, quindi il conto è identico |
| La copia contiene le righe di **`visit`**, non solo clienti e appuntamenti | togliere `visit` dall'elenco |
| Il secchio **non è leggibile** senza la chiave del server | rendere pubblico il secchio |
| ⚠︎ **`anon` e `authenticated` non hanno NESSUN privilegio su `storage.objects`** — né lettura, né inserimento, né aggiornamento, né cancellazione | concedere uno qualunque dei quattro. ⚠︎ **E non** «aggiungere una politica di cancellazione», che era la mutazione della revisione 2 ed è inerte: **un grant in più non arrossisce una prova che guarda solo il `42501`**, e senza il grant una politica non concede niente |
| **Chi ha la sessione di un'operatrice attiva non può SOVRASCRIVERE una copia** | concedere `insert`/`update`: sovrascrivere le quattro copie con file vuoti fa cadere L13 identico a cancellarle, e la revisione 2 presidiava solo due direzioni su quattro |
| Il lavoro **non scrive** una copia con zero clienti | togliere il controllo |

⚠︎⚠︎ **E la prova che nessuna di queste sostituisce: rimettere dentro una copia, in un database vuoto, e ricontare le
righe.** Un file che nessuno ha mai riletto non è una copia di sicurezza, è un file.

⚠︎ **Alla revisione 1 questa prova era delegata a 3c §8.7, e lì è ineseguibile.** Il 3c §9 è la **procedura di
apertura**, eseguita il giorno del rilascio, prima che vi sia un dato reale; il piano 4 arriva **dopo il primo uso
vero** (D19). Il 3c non può provare il ripristino di un file prodotto da un lavoro che non esiste ancora. `[proposta]`
**La prova appartiene al collaudo del piano 4**, ed è una prova automatica, non una voce di una lista a mano: si può
scrivere, perché un database di prova vuoto lo si ha.

#### 7.6.5 Quello che la copia non è

- **Sta nello stesso progetto dei dati.** Se il progetto viene perso o sospeso, **la copia va con lui.** Protegge da un
  errore *dentro* il database — una cancellazione sbagliata, un telefono rubato — non dalla perdita del progetto.
- **Il ripristino è a mano**, e la procedura va scritta nel 3c, che è il documento delle procedure (§12.1).
- **Si perde fino a una settimana** — ⚠︎ **e con la sospensione per inattività, di più.** §6.3.1 dice che un progetto
  sospeso non esegue nessun lavoro pianificato, e §7.6 usa **lo stesso** lavoro: con due settimane di chiusura ad
  agosto la perdita massima è «la durata della sospensione più una settimana», e al rientro la copia più recente ha
  l'età della sospensione — nello stesso giorno in cui la passata smaltisce l'arretrato, la rete è al suo punto più
  vecchio. ⚠︎ Va misurato anche il verso opposto: un lavoro settimanale potrebbe **essere** l'attività che impedisce la
  sospensione. §12.1 lo porta come una misura che decide **due** cose.
- `[proposta]` **Il giorno si sceglie dove il danno è minore**, e per un salone è la notte fra domenica e lunedì: la
  settimana appena chiusa è salva e quella nuova è vuota.
- **Chi ha le credenziali della dashboard ora scarica tutte le clienti in un file.** ⚠︎ Alla revisione 1 questo era
  scritto «non cambia di grado: chi legge tutto poteva già leggere tutto». **È più leggero del vero, e va corretto:** un
  file **esce** dal sistema — si copia, si spedisce, sopravvive al progetto, non è filtrato da nessuna politica per riga
  e nessuna cancellazione lo raggiunge. Leggere a schermo e portarsi via un file non sono lo stesso grado. È un **costo
  di D4-6**, non una nota a margine, e sta in L22.

## 8. Il confine con i dati sanitari (spec §11.2)

**Che cosa dice la spec, e va ripetuto senza ammorbidirlo:** «Conta ciò che si può **inferire**, non ciò che è
etichettato. Una persona identificata con una storia datata e ricorrente di drenaggio linfatico o di riflessologia è
un registro da cui informazioni sulla salute possono essere inferibili. **Questo documento non afferma la
risposta**; è la prima domanda di §14» [dalla spec, §11.2].

**Il piano 4 non afferma la risposta nemmeno lui.** È la domanda 1 di §13, e con D4-4 vi risponde il titolare; fino a
quel momento resta aperta. Quello che il piano 4 può dire è **che cosa il sistema ha fatto per stare lontano da quel confine**,
perché è un fatto tecnico e non un giudizio:

1. **Non esiste nessun campo di testo libero *sulla cliente* o *sull'appuntamento* (D26)** — ⚠︎ e la precisazione in
   corsivo è nuova alla revisione 3, perché il punto 2 mostra che «nessun campo di testo libero» senza quella
   qualificazione è **falso**. Le tre cose che le
   operatrici avrebbero annotato — *allergica al gel*, *incinta*, *attenzione alla cera calda* — sono tutte e tre
   informazioni sulla salute, e tutte e tre sono cose che una persona in un salone ha una ragione vera di ricordare.
   ⚠︎ **Un'etichetta «non scrivete qui informazioni mediche» non è un controllo**: è la frase che un revisore ha
   mostrato essere vuota, e la decisione dell'utente è stata togliere il campo. **Togliere il campo toglie la via.**
2. ⚠︎⚠︎ **Il testo libero che resta è di DUE specie, e D26 ne ha toccata una sola.** `salon_closure.reason` riguarda
   il salone e non una persona [dalla spec, §11.1]. **Ma `service.name` e `service_category.name` sono `text not
   null` senza nessun vincolo** (`0002_catalogue.sql:3-11` [letto]: nessun `check`, nessun dominio, nessun trigger),
   **nessuna migrazione ne semina uno** (`grep`: zero `insert into service` in tutte le migrazioni e in `seed.sql`
   [letto]), e **li scrivono le operatrici** in Impostazioni (spec §9.9) o al primo avvio (spec §9.10) — D4 lo dice:
   «il catalogo dei servizi si costruisce dentro l'app».
   **Il nome del servizio compare su ogni appuntamento di una cliente identificata.** Un servizio chiamato «drenaggio
   post-operatorio», «linfodrenaggio gravidanza» o «massaggio schiena — ernia» scrive un'informazione sulla salute nel
   registro di una persona, con una data e una cadenza. **È un campo libero che attraversa il confine di D26 per
   un'altra porta**, e ci si arriva con tre tocchi in Impostazioni.
   ⚠︎ **Questo era il difetto peggiore del secondo giro**, ed è sopravvissuto perché tre revisori su quattro del primo
   giro non avevano guardato §8. Il piano 4 **non** propone un vincolo sul nome — non si valida la prosa — ma lo
   dichiara come fatto che chi risponde alla domanda 1 deve avere, e come limite **L29**.
3. **Non esistono note cliniche, moduli di consenso, foto prima/dopo, né dati sulla salute registrati
   deliberatamente** [dalla spec, §3].
4. **Non esistono stati, né «non presentata», né registro delle modifiche (D15).** La conseguenza accettata: «lo
   storico dice che cosa è stato **prenotato e non disdetto**, non che cosa è stato davvero fatto», perché senza stati
   un appuntamento rispettato e uno mancato sono identici [dalla spec, §12 limite 3].

⚠︎⚠︎ **Il punto 4 NON è un argomento a favore, e la revisione 1 lo consegnava come tale.** Diceva: «un registro che non
distingue il fatto dal prenotato è meno preciso, e un registro meno preciso è anche **meno inferenziale**». Il primo giro
l'ha smontato, e ha ragione: **la precisione che manca è su un altro asse.** Manca sull'asse *è venuta / non è venuta*;
l'inferenza che spec §11.2 teme corre su *quale* trattamento, con *quale* cadenza, riferito a *quale* nome — e **quell'asse
resta intatto**: dieci prenotazioni settimanali di drenaggio linfatico dicono la stessa cosa sia che la cliente si sia
presentata sia che no.

Il punto 4 si registra qui **perché qualcuno lo tirerà fuori**, e perché chi risponde alla domanda 1 sappia che **non
regge**. Con D4-4 chi risponde è il titolare, e consegnargli un argomento debole spacciato per «un fatto che deve avere»
è il modo peggiore di aiutarlo.

⚠︎ **E tre fatti che chi risponde deve avere e che la revisione 2 non gli dava.** Sono tutti dentro questo documento,
sparsi, e nessuno arrivava a §8:

| | |
|---|---|
| **Con che granularità** | **una riga per visita, con data, servizio e operatrice** (§2, ultima riga). Non «quali trattamenti ha fatto»: **la serie datata completa**, ordinabile |
| ⚠︎ **Per quanto** | il punto che la cifra «12 mesi» nasconde: il predicato di §6.2 cancella 12 mesi dopo l'**ultimo** contatto, quindi per una cliente che viene ogni mese **lo storico non si accorcia mai**. Dopo tre anni di drenaggi settimanali il registro contiene tre anni di drenaggi settimanali. Il termine non è una finestra mobile di 12 mesi: è «**tutto, finché è cliente, poi niente**». Su una qualificazione che dipende dalla cadenza *e dalla durata* della serie, è il fatto più rilevante dei tre |
| **A chi** | tutte e tre le operatrici, ciascuna su tutte le clienti (D10, D11, L12); le **due persone** con le credenziali della dashboard (D3c-3, L22); il **foglio A4** che esce dal salone a ogni richiesta di accesso (§5.1); il **CSV dell'intero insieme** (§7.2) e le **quattro copie settimanali** (§7.6), che sono file in chiaro con lo storico di **tutte** le clienti |

E quello che resta è comunque il registro dei servizi ricevuti, **esplicitamente in perimetro e mostrato in una
schermata** (spec §9.6, piano 3b) [dalla spec, §3]. La domanda 1 di §13 **non è teorica**: se la risposta fosse «sì, è categoria particolare», cambierebbero la base
giuridica, l'informativa e probabilmente il termine di conservazione. **È bloccante per il rilascio, e la spec la
classifica già così** [dalla spec, §14].

---

## 9. L'informativa esposta in salone: che cosa il sistema fa, e che l'informativa non può tacere senza dire il falso

⚠︎ **Il titolo è cambiato alla revisione 3, e non è cosmetica.** Diceva «il contenuto minimo», che afferma che quelle
voci **bastano** — un giudizio di sufficienza su un testo esposto al pubblico, in una sezione che si apre dichiarando
di non darne. Questo elenco è **derivato da ciò che il sistema fa**. Se sia anche il minimo che la norma richiede è la
**domanda 12** di §13.

⚠︎⚠︎ **§9 è scritta per la risposta «no» alla domanda 1 di §13, e va detto qui invece di lasciarlo dedurre.** Se la
risposta è «sì, il registro dei trattamenti è categoria particolare», **cambiano tre voci di questa sezione e il
cartello non si appende prima**: §9.1 (la voce «trattamenti ricevuti» va nominata distintamente e non in coda a un
elenco), §9.2 (nessuna base si nomina prima della domanda 2, **e in questo ramo la 2 va risolta prima della 1**), §9.4
(il termine va riletto). **Questa sezione va riaperta, non adattata a voce.**

| Quando | Che cosa dichiara |
|---|---|
| **Finché la domanda 1 è aperta** | ⚠︎ **il cartello non si appende** |
| **Se la risposta è «no»** | «…e l'elenco dei trattamenti ricevuti con le date», in coda alle altre categorie |
| **Se la risposta è «sì»** | l'elenco dei trattamenti va nominato **come voce a sé**, e §9.2 non nomina nessuna base prima della domanda 2 |

⚠︎ **Questa sezione dice che cosa l'informativa deve coprire. Non è l'informativa, e nessuna sua frase va copiata
in un testo esposto al pubblico.** Il testo lo scrive il titolare (D4-4 in §12), e ⚠︎ **nessuno lo rivede**: alla
revisione 1 questa riga finiva con «e il consulente lo rivede», che D4-4 aveva già escluso. Il primo giro l'ha trovato in
due punti.

La spec §11.1 fissa già cinque voci: titolare; finalità; responsabili (Supabase e Vercel, ciascuno con un accordo
sul trattamento e ciascuno con un trasferimento); il periodo di conservazione (D21); i diritti di §11.3. Il piano 4
le articola e ne aggiunge quattro che seguono da ciò che il sistema fa davvero.

### 9.1 Chi è il titolare, e i dati che raccoglie

Il titolare è **il salone**, con la sua denominazione e il suo indirizzo — AVStyle — Beauty Specialist, Via
Settevalli 133, Perugia [dalla spec, §1]. ⚠︎ `[da misurare]`, **e non è un giudizio: alla revisione 2 era marcato come questione da consulente e la frase si
contraddiceva** («è un dato anagrafico che il titolare fornisce» *e* «da chiedere al consulente»). Il titolare copia
**denominazione, indirizzo e un contatto dalla propria documentazione fiscale**: è un dato che ha in casa.

Le categorie di dati sono quelle di §2, **dette in italiano corrente**: nome, numero di telefono, giorno e mese del
compleanno (non l'anno), l'operatrice preferita, se ha chiesto di non ricevere gli auguri, e l'elenco dei
trattamenti ricevuti con le date.

⚠︎ **Le ultime due voci vanno scritte, ed è stato deciso esplicitamente: D4-5.** Rispondendo a D4-1 l'utente aveva
elencato «nome, numero di telefono e compleanno» — e non era una risposta sbagliata: **l'agenda non sembra "dati che
teniamo", sembra l'agenda.** Ma l'elenco dei trattamenti ricevuti con le date **è** un dato personale, è in perimetro
per scelta, è mostrato in una schermata [dalla spec, §3 e §9.6], ed è **il dato su cui pesa la domanda 1 di §13**.
Messo davanti alla scelta, l'utente ha confermato di tenerlo **e di dichiararlo**. Un'informativa che si fermasse a
nome, telefono e compleanno descriverebbe un sistema diverso da questo.

### 9.2 Le finalità, e chi accede

Le finalità che il sistema serve davvero, e nessuna di più: **tenere l'agenda degli appuntamenti**, **richiamare la
cliente** se serve spostare, e **fare gli auguri di compleanno** (che una persona manda a mano, D9). Nessun prezzo e
nessun pagamento (D14); nessuna messaggistica automatica (D9).

⚠︎ **«Nessuna decisione automatizzata» era nell'elenco della revisione 1, e va riletta con D4-2 in mano:** questo
documento introduce **la sola azione automatica del sistema**, ed è la cancellazione dei dati di una persona senza che
nessuno guardi. Che quella frase resti esatta è un **giudizio**, non un fatto tecnico come «nessun prezzo»: va riletta
dopo la domanda 1 di §13, e non copiata sul cartello prima.

⚠︎⚠︎ **La base giuridica: qui la revisione 1 superava il proprio limite dichiarato, e va corretta.** Diceva: «La base
dichiarata è il consenso (D4-1b) … **va scritto nell'informativa**». Ma §13 domanda 2 dice, due sezioni dopo, che «un'agenda
serve a erogare il servizio che la cliente ha chiesto, e **non è ovvio che la base sia il consenso**». Il documento
faceva quindi esporre al pubblico un'affermazione giuridica che esso stesso qualifica come non ovvia — dopo aver scritto
in testa che dove serve un giudizio scrive la domanda e non la risposta.

`[proposta]` **Alla revisione 2: il cartello nomina una base giuridica solo dopo la risposta alla domanda 2 di §13.**
Prima di quella risposta l'informativa può dire **per che cosa** i dati servono e **come si chiede la cancellazione**, e
non **quale base** il salone invoca. Scriverci «consenso» senza aver risolto la domanda 2 è un impegno preso al posto di
un giudizio, e se la risposta fosse un'altra il cartello va rifatto.

⚠︎ **E qualunque sia la risposta, due limiti restano:** oggi il sistema **non sa dimostrare** che un consenso sia stato
prestato (L18), e la scheda nasce al telefono **prima** del momento in cui si presterebbe (L19).

⚠︎ **Chi accede va detto, perché è largo, e sono due gruppi e non uno:**

- le **tre operatrici**, ciascuna con il proprio account, e **ciascuna vede tutte le clienti** (§4.1). Un'informativa
  che lasciasse intendere che ogni operatrice vede solo le proprie clienti direbbe una cosa falsa;
- ⚠︎ **le due persone che tengono le credenziali della dashboard di Supabase** — la titolare e una seconda persona —
  che **leggono tutto il database da lì**, clienti comprese, e possono cambiare la password di chiunque. È la
  decisione **D3c-3** del 3c, e il 3c assegna **a questo documento** il compito di dichiararla nell'informativa
  `[dalla spec 3c, D3c-3]`. L22 in §10.
- ⚠︎ **E un terzo destinatario: Meta**, ogni volta che si tocca il pulsante WhatsApp per gli auguri (§3.5). La sua
  qualificazione è la domanda 9 di §13, e l'informativa non può tacerlo.

### 9.3 I responsabili, e la questione del trasferimento

**Supabase** (base di dati, autenticazione, backup) e **Vercel** (esecuzione dell'applicazione) — §4.2.

Per ciascuno servono **due fatti che nessuno in questo repository ha ancora accertato**:

1. `[da misurare]` **l'accordo sul trattamento esiste già, o va stipulato?** Non si assume: si guarda nell'account.
   **Verifica assegnata a 3c §8.7** (§1.3).
2. `[da misurare]` **la regione dei due progetti** — **già assegnata al 3c**, passi A1 e F3, con la nota «fuori
   dall'UE cambia il discorso sul trasferimento» — **e i sotto-responsabili**, che nessuno ha ancora elencato. ⚠︎ **La
   spec §11.1 afferma che ciascuno comporta un trasferimento; questo documento lo marca come da accertare** (§4.2).

`[giudizio giuridico]` se, accertata la regione, serva qualcosa oltre l'accordo — §13, **domanda 9**. ⚠︎ Alla
revisione 2 questo rimando puntava alla **domanda 4**, che è quella del cartello: è lo stesso sbaglio che la domanda 9
dichiara di aver corretto, sopravvissuto nella sede.

### 9.4 Per quanto si conservano i dati, e le copie

**12 mesi dall'ultimo appuntamento** (D4-1, §6.1), e la cancellazione **avviene da sé** allo scadere, senza che
nessuno la debba chiedere (D4-2, §6.3). Sono due frasi brevi e sono buone da esporre: un termine corto e una
cancellazione che non dipende dalla buona volontà di nessuno.

⚠︎⚠︎ **Il numero da esporre dipende da che cosa esiste il giorno in cui il cartello si appende, e la revisione 1 ne
scriveva uno solo.** Faceva dichiarare «12 mesi dall'ultimo appuntamento, **più fino a un mese nelle copie di
sicurezza**» — quando **le copie non esistono** (§7.6 è `[proposta]` dalla prima riga all'ultima) e il periodo del
fornitore è sospeso (§7.5). Un cartello che dichiara un trattamento che non avviene è il difetto simmetrico di quello
che questa sezione vuole evitare, e per un testo esposto è peggio che tacere. Il documento si dà in testa la regola che
violava: «un termine di conservazione scritto come fatto quando è una proposta **diventa una promessa**».

`[proposta]` **Quindi due testi, con la condizione scritta accanto:**

| Quando | Che cosa dichiara |
|---|---|
| **Fino alla prima copia riuscita** | «I dati si cancellano **12 mesi** dopo l'ultimo appuntamento.» |
| **Dalla prima copia riuscita** (§7.6) | «I dati si cancellano **12 mesi** dopo l'ultimo appuntamento, e restano **fino a quattro settimane** nelle copie di sicurezza.» |
| **Se 3c §9.3 A2 accerta un ripristino del fornitore** | si aggiunge quel periodo, che A2 trascrive (§7.5) |

⚠︎ **E il cartello con la seconda frase si appende solo quando la cancellazione automatica esiste, gira, e il suo conto
è stato letto almeno una volta** — perché nell'ordine naturale delle cose un cartello si stampa in un pomeriggio e un
lavoro pianificato ci mette settimane.

⚠︎ **La frase copre l'agenda elettronica, e va scritta in modo che resti vera comunque.** Restano per un periodo che il
salone non controlla: i file esportati a mano (§7.3), le righe tecniche di §6.4 il cui termine reale è «30 giorni **e poi
al primo invio**», e i registri di §3 che nessuna cancellazione raggiunge. `[proposta]` Una forma che regge: *«i dati
dell'agenda si cancellano dopo 12 mesi dall'ultimo appuntamento; restano fino a quattro settimane nelle copie di
sicurezza, e per qualche tempo in registri tecnici che non contengono né nomi né numeri di telefono»* — e «cancellata»
significa «sparita dall'agenda elettronica», non «sparita da ogni foglio del salone» (§5.4, domanda 6 di §13).

### 9.5 I diritti, e dove si esercitano

I quattro di §5 — vedere, correggere, cancellare, opporsi agli auguri — **e il canale per esercitarli**, che è la
decisione D4-3. ⚠︎ Un'informativa che elenchi i diritti senza dire a chi si chiede è la parte più facile da
dimenticare e la più inutile da scrivere.

⚠︎ **E sull'opposizione agli auguri, l'informativa può promettere una cosa precisa e non una vaga**, grazie al presidio
duplice di §5.5: *«se lo chiede, il suo nome resta in agenda ma il sistema **rifiuta** di aprire un messaggio verso di
lei»*. ⚠︎ **Quello che NON può dire è «la togliamo dalle liste»**, perché il suo nome **compare** — con un segno accanto,
visibile alle tre operatrici (D3b-6, e il 3b ne dichiara il costo: la lista mostra a ogni operatrice chi ha fatto
obiezione). Un'informativa che promettesse l'esclusione dalle liste direbbe il falso su ciò che l'app fa.

⚠︎ **E va detto che quel canale è l'UNICO**, perché è la voce che la cliente lontana leggerà: oggi l'unica via è
passare in salone (D4-3), la consegna a distanza **non è risolta** (§5.2) ed è la **domanda 11** di §13. Un'informativa
che dica «si rivolga al salone» a chi si è trasferita a Milano deve almeno non far credere che esista un modulo.

### 9.6 La riga al punto di raccolta, e il cartello al banco (D4-9)

`[dalla spec, §8.2]` Quando si crea una cliente a metà di una prenotazione, «una riga di testo dice che i suoi dati
sono registrati e dov'è l'informativa completa — senza di essa §11.1 affermerebbe un obbligo che nessuna schermata
adempie».

`[proposta]` **Il piano 4 fornisce il testo di quella riga; il piano 3a-2 la colloca.** Il contenuto minimo: che i
dati servono per l'agenda e per richiamarla, e **dove** sta l'informativa completa (al banco del salone, D4-9). Non di
più: è una riga in un modulo da tre campi usato con il telefono in mano.

⚠︎⚠︎ **E qui va detta la cosa che D4-9 lascia aperta, perché è il punto più esposto di tutto il documento.**

**D4-9, decisione dell'utente del 28/09/2026: l'informativa è un cartello al banco, e niente altro.** Scartate, con il
loro costo davanti: una frase detta a voce al telefono, delle copie da portare via, un foglio da firmare alla prima
visita.

Ne segue una catena di tre fatti che il piano 4 registra e non risolve:

1. **La scheda nasce al telefono** (L19), perché è così che il salone lavora.
2. **Al telefono la cliente non vede nessun cartello**, e con D4-9 non le si dice nemmeno niente a voce.
3. **Il consenso si presta alla prima visita** (D4-1b), che può arrivare settimane dopo — o non arrivare mai, se la
   cliente disdice.

Quindi per quell'intervallo i dati esistono **senza che la cliente abbia visto un'informativa e senza che abbia
prestato il consenso**. ⚠︎ **La decisione è dell'utente e questo documento la esegue**; ma l'effetto è che **la domanda
4 di §13 — se il cartello al banco adempia all'obbligo di informare — non è più una delle undici: è quella che tiene in
piedi l'impianto.** Prima D4-9 esisteva un ripiego che costava cinque secondi per telefonata; ora non c'è, e la
risposta a quella domanda è l'unica cosa che sta fra il salone e un obbligo non adempiuto. Con D4-4 quella risposta la
dà il titolare.

`[proposta]` **L'unica cosa che il piano 4 può ancora fare, e la fa:** la riga al punto di raccolta (spec §8.2) diventa
**più importante**, non meno — è l'unico posto dove quell'informazione compare nel momento in cui il dato si
raccoglie, anche se la legge chi registra e non la cliente. Il piano 4 ne scrive il testo perché **chi la legge sappia
che cosa deve dire**, se sceglie di dirlo.

---

## 10. I limiti dichiarati in materia di dati personali, in un posto solo

Oggi questi limiti sono veri e sono **sparsi in cinque documenti e in tre migrazioni**. Un limite che nessuno trova
non è dichiarato: è sepolto. **Questa sezione è la sede unica, ed è un impegno di manutenzione del piano 4** — chi ne
scopre uno nuovo lo aggiunge qui, con la sede originale accanto.

⚠︎ Ogni riga cita dove era già scritta.

### 10.1 ⚠︎ Il criterio di chiusura, e il censimento del 28/09/2026

**Un limite si barra solo quando qualcosa lo ha davvero chiuso**, e «qualcosa» vuol dire: una decisione dell'utente, una
migrazione consegnata, o un presidio che un altro piano ha già scritto. **Non** un rimedio proposto, **non** un
meccanismo che il piano 4 costruirà, **non** un `[da misurare]` con un assegnatario. Questo documento ha già messo tre
segni di spunta falsi in due giri, e li ha toccati tutti e tre il primo revisore che li ha guardati.

**Censimento del 28/09/2026, sui trenta limiti, contro ciò che è cambiato nella giornata:**

| | Quanti | Quali |
|---|---|---|
| ✅ **Chiusi** | **3** | **L8** (`client.updated_at`, D3b-5), **L15** (la cancellazione prende un codice d'invio), **L23** (il telefono validato in E.164) — **tutti e tre dal 3b**, nessuno dal piano 4 |
| ✅ **Presidiati da altri, non più «da consegnare»** | **2** | **L16** (il ritentativo su `40P01`, 3b), **L5** (la prova statica su `details`/`hint`, 3a-2) |
| ⚠︎ **Cambiati di premessa o di bersaglio** | **4** | **L2** (il `localStorage` si allarga, D2-1), **L10** (si sposta su `ultimo_contatto`), **L14** (il rimedio ora esiste), **L25** (il requisito esisteva già, e una metà è decisa in senso opposto) |
| **Aperti, e chiudibili** | **8** | dipendono da §6 e §7.6, cioè dal banco di prova (D4-11): L11, L13, L20, L21, L28, L18, L19, L30 |
| **Aperti e NON chiudibili nel software** | **13** | sono la loro ragione d'essere: L1, L3, L4, L6, L7, L9, L12, L17, L22, L24, L26, L27, L29 |

⚠︎ **La lettura che conta più dei numeri: nessuno dei tre limiti chiusi è stato chiuso dal piano 4.** Li ha chiusi il 3b,
e si sono chiusi **parlandosi** — due delle tre chiusure le ha trovate un revisore leggendo il documento dell'altro, la
terza è arrivata da quella chat. È lo stesso rimedio di §6.3.3, misurato una seconda volta.

⚠︎ **E i tredici della penultima riga non sono un fallimento.** Un limite come «ogni operatrice legge tutte le clienti»
(L12) o «il nome del servizio è testo libero» (L29) non ha un rimedio nel software: **esiste per essere dichiarato**, e la
sua chiusura è che qualcuno lo legga e lo accetti. Confonderli con i limiti chiudibili è il modo più facile di non
chiudere nessuno dei due gruppi.

| # | Limite | Dove era già | Chi lo chiuderebbe, e che cosa costa |
|---|---|---|---|
| L1 | **Il dato delle visite cancellate è pseudonimo, non anonimo**: `id` di visita e istante; dopo la cancellazione di una cliente resta il numero delle sue visite e l'istante | `0013:17-19`; §3.1 | una colonna in meno non si può togliere: la tabella **esiste** per rendere vera la risposta di «Controlla». Si chiude solo accorciando il termine, e il termine è già 30 giorni `[proposta]` |
| L2 | **`localStorage` tiene identificativi pendenti**: `id` di visita e cliente, istante, operatrice; pseudonimi, senza nomi né telefoni | 3a §4.9, §4.4 punto 3; §3.2 | niente: è il meccanismo. Il termine è 24 ore, e lo applica il telefono. ⚠︎ **E la premessa «unica eccezione» di 3a §4.9 è superata:** D2-1 del 3a-2 aggiunge due chiavi — la vista colonne/lista e l'operatrice della settimana — che **non sono dati personali** (due preferenze di vista, nessun `id` di cliente) ma allargano l'eccezione [letto, 3a-2 riga 228] |
| L3 | **Nel database niente lega un codice d'invio alla sua operatrice**: `controlla_invio` accetta qualunque coppia; la regola vive nel `localStorage` | Task 7 del 3a-1, reperto 9; §3.2 | una colonna su `invio`, che è del Task 1 del 3a-1. Non del piano 4 |
| L4 | **Il log di Postgres riceve la STATEMENT di ogni scrittura rifiutata; se i parametri vi finiscono, vi finiscono nome e telefono** | 3a §4.9; §3.3 | ⚠︎ **Non è un caso eccezionale, e la revisione 1 lo scriveva come tale** («un vincolo che scatta *nonostante* la validazione»): `salva_visita` prende la cliente nuova come parametro e ha **dodici rifiuti di progetto** che accadono nel funzionamento normale. **Validare prima non li riduce: esistono per essere raggiunti.** Si chiude solo col termine del log (`[da misurare]`) o portando la cliente nuova fuori dai parametri |
| L5 | **Nei log dell'app vanno solo `code` e `id`, mai `details` né `hint`** — regola dichiarata | 3a §4.9; §3.3 | ✅ **La prova ESISTE GIÀ, e non è mia:** il 3a-2 la prescrive al suo Task 9 — «prova statica su `src/server/` che cerca `details` e `hint`» [letto, 3a-2 riga 3625], ancora `[da misurare]` da loro. ⚠︎ **Il piano 4 non la riscrive**: era una sovrapposizione, trovata dal secondo giro |
| L6 | **I cookie di sessione di `@supabase/ssr` sono leggibili da JavaScript**, e una XSS riuscita ruba una sessione che non scade da sola | D3-11, 3a §4.9 | la CSP riduce la probabilità; D3-14 e D3-17 permettono di chiuderla. Non del piano 4 |
| L7 | **Cancellazione secca: nessuno stato, nessun «non presentata», nessun registro delle modifiche** (D15). Lo storico dice che cosa è stato **prenotato e non disdetto**, non che cosa è stato fatto | D15, spec §12 limite 3 | un registro delle modifiche, che D15 rifiuta. ⚠︎ **NON taglia a favore:** §8 punto 4 mostra perché l'assenza di stati non riduce l'inferenza — l'argomento è stato ritirato e questa riga lo teneva in vita nella sede unica dei limiti |
| ~~L8~~ | ~~**Una rettifica non lascia traccia**: `client` non ha `updated_at`~~ | `0003:14-35`; §5.3 | ✅ **CHIUSO il 28/09/2026: D3b-5 aggiunge `client.updated_at`** con una migrazione del 3b, come versione del compare-and-set. Resta vero che non c'è un **registro** delle modifiche (D15, L7): si sa **quando** è stata toccata l'ultima volta, non **che cosa** è cambiato né **chi**. ⚠︎ E la colonna collide con `ultimo_contatto`: **L30** |
| L9 | **Non esiste nessun meccanismo per la limitazione del trattamento**, e con D26 non c'è nessun posto dove marcarla | §5.5 | una colonna nuova, cioè una decisione di dominio. Ripiego: registro cartaceo |
| L10 | **`TRUNCATE` congela la data su cui la conservazione cancella** → **sovra-conservazione**, non perdita. Non raggiungibile **dall'app**; dalla dashboard sì (L22) | spec §12 limite 11, `0007:86-97`; §6.3 | niente: un trigger di vincolo non si dichiara su TRUNCATE. ⚠︎ **Il limite si è SPOSTATO:** con §6.2 il predicato legge `ultimo_contatto`, non `last_activity_at`, e la colonna nuova è `not null` con default **oggi** — quindi un TRUNCATE di `visit`/`appointment` **non la tocca affatto**, e la sovra-conservazione nasce da un'altra parte: da una riga `client` che nessuno tocca più. Va rimisurato quando §6 arriva al banco (D4-11) |
| L11 | **Una copia sconfigge la conservazione**: una cliente cancellata resta in ogni file preso prima | spec §11.5; §7.3, §7.6 | ⚠︎ **Limitabile a quattro settimane SE §7.6 viene consegnata; oggi non lo è**, e il numero di copie è **zero**. La rotazione come invariante (§7.6.2) lo chiude nel codice, non in una procedura. **Per gli export a mano resta una regola di procedura**, diventata facile perché nessuno ha più bisogno di tenerne uno «per sicurezza» (§7.3) |
| L12 | **Ogni operatrice attiva legge tutte le clienti** (D10, D11) | §4.1 | i ruoli, che D10 rifiuta |
| L13 | **Chi tiene in mano il telefono di un'operatrice attiva legge tutte le clienti e può cancellare in massa le visite** | 3a §4.7, D3c-2; §5.4 | ⚠︎ **Vale per intero OGGI.** Il fornitore: `[da misurare]`, 3c §9.3 A2 (§7.5). Le copie di §7.6: **non esistono ancora**. Quando esisteranno, si perderà al massimo una settimana — **e solo se il secchio è chiuso anche in cancellazione** (§7.6.3 punto 1) |
| L14 | **Le tre conservazioni brevi sono opportunistiche**: 30 giorni *e poi alla prima chiamata di `app.chiudi_invio` che committa* — **non** «al primo salvataggio riuscito», forma che §6.4 corregge —, a lotti di 100. ⚠︎ **E il rimedio ora esiste:** D4-6 introduce un lavoro pianificato comunque (§6.3.1), quindi la ragione che teneva ferme le tre pulizie — «non avere un lavoro pianificato» — **è già stata pagata** | `0013:126-177`, `0019:179-209`; §6.4 | un lavoro pianificato, che `0013` ha deliberatamente evitato. §12 porta le alternative |
| ~~L15~~ | ~~**La cancellazione di una cliente non passa da «Controlla»**~~ | §5.4 | ✅ **CHIUSO il 28/09/2026 dal 3b**: `public.cancella_cliente(p_codice, p_cliente)` **prende un codice d'invio** [letto, 3b rev. 2 riga 635], quindi la cancellazione passa dal meccanismo di «Controlla» come ogni altra scrittura, e l'esito `cancellata`/`non_trovata` è quello delle righe 6 e 7 di 3a §4.4. **La rilettura di ripiego non serve più** |
| L16 | **La cancellazione di una cliente può fallire con `40P01`**, misurato 6 su 6 | spec §12.1, §10.5; §5.4 | ✅ **PRESIDIATO dal 3b il 28/09/2026**, e non «da consegnare»: 3b §5.6 decide il ritentativo con la stessa misura 6 su 6, e 3b §9.2 porta la prova «`40P01` ricevuto dal percorso». ⚠︎ **Il limite resta vero** — lo stallo esiste — ma non è più senza presidio. ⚠︎ E la passata automatica di §6.3.1 lo eredita: presidio 2 |
| L17 | **Il repository è pubblico**: questi limiti sono leggibili da chiunque | §11.2 | niente, ed è una decisione informata dell'utente (§11.2) |
| **L18** | **Il consenso dichiarato (D4-1b) non è dimostrabile dal sistema**: non esiste una colonna, non esiste una data, e con D26 non esiste nessun campo libero dove annotarlo | dalle risposte del 28/09; §13 domanda 2 | ⚠︎ **resta aperto per intero**: D4-9 ha scartato il foglio da firmare. Lo chiuderebbe una colonna `consenso_il date` (una migrazione e una decisione di dominio) o quel foglio |
| **L19** | **La scheda nasce prima del consenso e prima dell'informativa**: si crea al telefono, il consenso si presta alla prima visita, e con D4-9 al telefono non si dice niente | dalle risposte del 28/09; §9.6, §13 domande 2 e 4 | ⚠︎ **resta aperto per intero**, ed è il limite più esposto del documento. La correzione più economica — una frase al telefono — è stata scartata da D4-9 e **resta disponibile** |
| ~~L23~~ | ~~**Il telefono non è validato**~~: `0003:17` è `phone text` e basta | §2, spec §6.2 | ✅ **CHIUSO il 28/09/2026 dal 3b**, che valida in scrittura — «telefono normalizzabile in **E.164**» — con la prova «`347 1234567` e `+39 347 1234567` → lo stesso E.164» [letto, 3b righe 591 e 896]. Resta vero che **lo schema non ha un vincolo**: la validazione è nell'applicazione, quindi una scrittura che non passa da `salva_cliente` la scavalca |
| **L24** | ⚠︎ **WhatsApp è un terzo destinatario che l'applicazione apre**, e il numero della cliente viaggia nell'indirizzo. Poi la chat resta sul telefono, nella sua copia in nuvola e presso Meta | §3.5 | **niente**, nel software: è la via di consegna di D9. Si **dichiara** nell'informativa (§9.2), e la qualificazione di Meta è la domanda 9 di §13 |
| **L25** | **Il log di richiesta di Vercel** registra percorso, query e IP di ogni chiamata, qualunque disciplina l'app si dia | §3.3 | ⚠︎ **Il requisito che la revisione 2 mandava a 3b e 3a-2 esisteva già, e una sua metà è decisa in senso opposto.** Il 3a-2 ha «**nessun dato personale in un URL, né nell'indirizzo della pagina né nella querystring**» fra i vincoli globali [letto, riga 196], e il 3b ha deciso che un `client_id` **è ammesso** perché è uno pseudonimo casuale (L3b-2). Quindi: **niente da mandare**, e il termine del log resta `[da misurare]` |
| **L26** | **La cache del browser e la cache avanti/indietro** del telefono tengono la pagina resa, con i nomi in chiaro | 3a §4.9; §3 | `Cache-Control: no-store`, `pageshow` con `persisted = true`, svuotamento all'uscita — **prescritti da 3a §4.9 e oggi senza nessuna prova**, come L5 |
| **L27** | **`auth.audit_log_entries` registra ogni accesso con l'IP delle tre operatrici, e nessuna pulizia esiste**; e `public.list_auth_accounts()` dà a ogni operatrice attiva **tutti** gli indirizzi di posta | §3.6 | un termine e una pulizia per il registro degli accessi: **nessun piano se n'è preso**. L'informativa verso **il personale** è un adempimento distinto, fuori perimetro e senza assegnatario (§12.1, domanda 10) |
| **L29** | ⚠︎⚠︎ **Il nome del servizio è testo libero non vincolato**, scritto dalle operatrici, e compare su ogni appuntamento di una cliente identificata: **D26 non lo copre** | `0002:3-11`; §8 punto 2 | niente nel software — non si valida la prosa. Si **dichiara**, e si istruisce chi crea i servizi. ⚠︎ È il dato su cui pesa la domanda 1 di §13 |
| ~~**L30**~~ | ~~⚠︎ **`ultimo_contatto` (piano 4) e `client.updated_at` (3b, D3b-5) collidono**~~: `app.touch_updated_at()` è **incondizionato** (`0004:41-47` [letto]), quindi ogni aggiornamento del contatto bumpa la versione della scheda, e una collega riceve «è stata modificata da una collega» quando di suo non è cambiato niente | §6.2.1; 3b §5.4 e §9.2 | ✅ **CHIUSO dal 3b il 28/09/2026**, e meglio dei tre rimedi che proponevo: `app.touch_client_updated_at()` **esclude le colonne derivate per nome**, lascia intatta `touch_updated_at` per `visit` e `appointment`, e **nomina `ultimo_contatto` in anticipo** — `jsonb - 'chiave_assente'` è un no-op, quindi `0022` e `0024` possono arrivare **in qualunque ordine** e nessun arbitrato serve. ⚠︎ E il 3b ha misurato che la collisione **non aspettava la mia colonna**: era già in essere con `last_activity_at`, perché `0007` aggiorna `client` senza condizione a ogni prenotazione. **Residuo, e la prova è mia: L32** |
| **L31** | ⚠︎⚠︎ **Una migrazione saltata dal CLI non la coglie nessuna prova, e `db reset` esce 0.** Per il piano 4 il caso è il peggiore di tutti: **una migrazione di conservazione saltata in silenzio significa che i dati personali non vengono cancellati e nessuno se ne accorge** — non un guasto rumoroso, un obbligo non adempiuto | obbligo 6 dei findings del piano 2; §12.1 | il nome rispetta il modello (cifre sole, mai una lettera), e **si legge l'output del reset**, non il suo codice di uscita. ⚠︎ Il presidio generale — una prova che coglie una migrazione saltata — **è l'obbligo 6 e non è del piano 4** |
| **L32** | ⚠︎ **Il NOME della colonna è portante.** L'esclusione del 3b nomina `ultimo_contatto`: se la colonna nascesse con un altro nome, l'esclusione **non morde** e la collisione torna **in silenzio** — una collega riceve «è stata modificata da una collega» senza ragione | 3b, per L30 | ✅ **Il nome è confermato `ultimo_contatto`** (§6.2.1), e la prova che lo presidia **è mia**: §7.4.3, «salvare una visita non fa fallire una modifica di scheda cliente aperta», mutazione **«rinomina la colonna»**. Se il piano lo cambiasse, va detto al 3b **prima** di scrivere `0024` |
| **L28** | ⚠︎ **La passata automatica può fallire nel verso opposto: cancellare NIENTE, in silenzio.** Un'identità sbagliata dà zero righe, non un errore | §6.2.3, §6.3.1 presidio 5 | la funzione **solleva** invece di restituire zero righe, e §7.4.4 ha la prova che la passata **cancella** |
| **L20** | **La cancellazione automatica (D4-2) non ha nessun testimone**: se la query di eleggibilità è sbagliata, nessuno se ne accorge mentre accade | D4-2, §6.3 | i **cinque** presidi di §6.3.1 (tetto, una per transazione, conto registrato, tetto raggiunto = fermo, e la guardia contro il cancellare niente) e l'elenco in sola lettura di §6.3.2. **Non si chiude**: si limita il danno |
| **L21** | ⚠︎⚠︎ **L20 più D3c-2: una cancellazione automatica sbagliata è anche irrecuperabile.** Nasceva da **due decisioni prese lo stesso giorno in due documenti diversi** (§6.3.3) | §6.3.3, §6.3.4 | ⚠︎ **Vale per intero OGGI, e il margine è ZERO**: §7.6 è tutta `[proposta]`, il numero di copie è zero, e fra l'ottavo giorno (fine di D3c-5) e la consegna del piano 4 **non c'è nessuna copia di niente** (§6.3.4 punto 2). Quando §7.6 esisterà, il margine sarà di **quattro settimane** — non cinque mesi, come diceva la revisione 1 — e **nessuno è incaricato di scoprirlo** (§6.3.2) |
| **L22** | **Due persone leggono tutto il database dalla dashboard** — la titolare e una seconda — e possono cambiare la password di chiunque. ⚠︎ **E con D4-6 ne portano via un file** | **D3c-3**, spec 3c; §9.2, §7.6.5 | niente: è la condizione perché «telefono perso» sia eseguibile. ⚠︎ Ma «non cambia di grado» era **più leggero del vero**: un file **esce** dal sistema — si copia, si spedisce, sopravvive al progetto, nessuna politica per riga lo filtra e nessuna cancellazione lo raggiunge. È un **costo di D4-6** |

---

## 11. Il contesto dichiarato

### 11.1 Letture dichiarate della spec

Dove questo documento **interpreta** la spec invece di citarla, lo dice qui, come fa 3a §9.

- **L4-1 — spec §9.9 elenca «export (§11.5), retention review (§11.4)» dentro Impostazioni, e 3a §3.3 assegna al 3c
  «impostazioni (colori, disattivazione, pulsante di D3-14)».** Le due voci di §11 **non sono nell'elenco del 3c**.
  Lettura: **le costruisce il piano 4**, come una sezione «Dati personali» dentro Impostazioni, e il 3c costruisce il
  resto della schermata. ⚠︎ È una lettura, non una citazione: se il 3c la legge diversamente, decide
  l'orchestratrice, non questo documento.
- **L4-2 — spec §11.3 dice «All three in §9.6», e §9.6 è del 3b.** ⚠︎ **La prima metà regge, la coda era rotta.** I
  pulsanti «modifica» e «cancella» sono del 3b, e per l'export ✅ **la lettura è stata composta con la chat del 3b il
  28/09/2026**: **il posto** del pulsante è del 3b (che lo costruisce inerte, D3b-8 rev. 2), **il collegamento** è del
  piano 4, **il meccanismo** è del piano 4. La coda della revisione 1 — «nasce spento con un segnaposto dichiarato» — era
  smentita dalla revisione 1 del 3b, e la revisione 2 del 3b l'ha resa vera (§5.6).
- **L4-3 — spec §9.11 mette un contrassegno su Impostazioni «quando ci sono clienti eleggibili alla cancellazione»**,
  con la ragione dichiarata: «una pulizia che vive solo dentro una schermata di impostazioni non avviene mai». ⚠︎⚠︎ **La
  revisione 1 chiudeva questa questione da sé, e non era sua da chiudere.** Il primo giro ha misurato che è **un cerchio
  a tre**: il 3b lo assegna al piano 4 («la conservazione e **il suo distintivo di navigazione**»), il 3a-2 dice «è del
  piano 4: qui non si disegna», il 3c lo dichiara di nessuno e **lo rimette formalmente all'orchestratrice** (3c
  §13.11). ⚠︎⚠︎ **Alla revisione 2 questo documento si ritirava, e il secondo giro ha smontato la premessa: non è un
  cerchio a tre, è 2 a 1 con il punto d'innesto già pronto.** Il 3a-2 dice «è del piano 4: qui non si disegna» **e
  nomina il file da toccare** (`src/cliente/navigazione.tsx`, verificato presente nel suo piano); il 3b lo assegna al
  piano 4; solo il 3c lo dichiara di nessuno. Un ritiro davanti a due assegnazioni esplicite **non è prudenza: è la
  rinuncia a una decisione che due piani su tre hanno già preso per me.**
  `[proposta]` **Alla revisione 3 il piano 4 LO PRENDE**, e l'orchestratrice può ribaltarlo. La ragione non è formale:
  spec §9.11 è un obbligo scritto («*a purge that lives only inside a settings screen never happens*»), spec §11.4 lo
  ripete, e §6.3.2 appoggia **tutto** il margine di tre settimane su un elenco che, per la ragione della spec stessa,
  non apre nessuno. **Il contrassegno è l'unico rivelatore che non dipende da chi apre una schermata**, ed è la stessa
  cosa che §6.3.2 chiede.
  **La metà sostanziale, che resta:** con D4-2 la pulizia avviene da sé, quindi la ragione scritta in spec §9.11 non si
  applica più *alla pulizia*. ⚠︎ **Ma si trasferisce parola per parola sull'elenco in sola lettura di §6.3.2**, su cui
  §6.3.4 appoggia tutto il margine di quattro settimane — e un elenco che vive solo dentro Impostazioni non lo apre
  nessuno. È per questo che §6.3.2 chiede un rivelatore che non dipenda da chi apre una schermata: **il contrassegno
  qui servirebbe di più, non di meno.**
- **L4-4 — spec §8.2 «una riga di testo».** Lettura: il **contenuto** è del piano 4, la **collocazione e la resa**
  del 3a-2 (§9.6).
- **L4-5 — spec §11.1 «ciascuno comportando un trasferimento».** Lettura: è un'**affermazione della spec, non un
  fatto misurato**; dipende dalla regione e dai sotto-responsabili, e questo documento la marca `[da misurare]`
  (§4.2, §9.3). È l'unica divergenza fra la spec e ciò che il repository sostiene.
- **L4-6 — spec §11.4 e D21 «24 months … on confirmation».** Non è una lettura: è **superata in entrambe le metà**
  dalle decisioni del 28/09/2026 — 12 mesi (D4-1) e senza conferma (D4-2). Citata e non cancellata, per la
  convenzione di questo progetto (§6.1, §6.3).

### 11.2 Il repository è pubblico

`github.com/Unichess64/AVSTYLE` è **pubblico**, ed è una **decisione informata dell'utente**, presa dopo che gli è
stato elencato che cosa diventa pubblico: il nome e l'indirizzo del salone, i nomi delle tre operatrici, la struttura
dei dati delle clienti, le decisioni sulla privacy e i limiti di sicurezza dichiarati per iscritto. **Questo
documento non riapre la discussione.**

Ma ne tiene conto, in tre modi concreti:

1. **§10 è scritta per chi mantiene, non per chi cerca una strada.** Ogni riga dice *che cosa* è il limite e *chi lo
   chiuderebbe*; nessuna aggiunge un dettaglio operativo che non fosse già nel repository. Un limite dichiarato serve
   a chi deve decidere se accettarlo — ed è la ragione per cui si dichiara invece di tacerlo.
2. **Nessun dato di cliente reale e nessuna credenziale entrano nel repository.** Gli account del seed sono
   `@example.test`, e `seed.sql` non contiene nessuna password: solo `encrypted_password = ''`, con cui **ogni**
   password dà `400 invalid_credentials` [dalla revisione, 3a §8.5, misurato il 24/09/2026]. Il piano 4 non cambia
   niente qui: lo **ripete** perché un piano sui dati personali è il posto dove qualcuno andrà a cercare la risposta.
3. **Due cose che il piano 4 aggiunge proprio per questo:** i modelli dei file di export in `.gitignore` (§7.2), e la
   regola che il **registro cartaceo delle richieste non entra in nessun file del progetto** (§5.6).

⚠︎ **Il rischio residuo, dichiarato:** un export salvato per distrazione nella cartella del progetto è **un
`git add -A` dal diventare pubblico e permanente**. `.gitignore` è la sola barriera che il software può mettere, e
non copre un file salvato altrove nella cartella con un nome imprevisto. Il resto è procedura (§7.3).

---

## 12. Decisioni dell'utente del 28 settembre 2026

Chieste in blocco e risposte lo stesso giorno. Le opzioni scartate sono riportate con il loro costo, perché una
decisione senza le alternative non si può rivedere fra sei mesi.

| # | Decisione | Risposta dell'utente | Che cosa cambia |
|---|---|---|---|
| **D4-1** | Termine di conservazione | **12 mesi dall'ultimo appuntamento.** «Se una non viene per un anno, si cancella» | **D21 è superata sul numero**: diceva 24 mesi. §6.1, §6.2 |
| **D4-1b** | ⚠︎ **Non è una decisione: è un fatto dichiarato sul salone.** La domanda posta riguardava **il termine di conservazione**, non la base giuridica | **Verbatim:** «prestano il consenso quando vengono la prima volta a negozio» | ⚠︎⚠︎ **Sulla base giuridica non è deciso niente, e non si deduce da questa frase** (§6.1): è la **domanda 2** di §13. Il cartello non nomina nessuna base prima di quella risposta (§9.2). Apre L18 e L19. ⚠︎ Alla revisione 2 questa riga era rimasta quella della revisione 1 e registrava «consenso» come **deciso** — la correzione stava in §6.1 e non era arrivata qui, che è la tabella che si legge per sapere che cosa è deciso |
| **D4-2** | Chi cancella allo scadere | **Cancellazione automatica**, senza conferma | **D21 è superata anche su «on confirmation»**, e spec §9.11 perde il suo badge. §6.3 |
| **D4-3** | Canale delle richieste | **Solo in salone, di persona** | §5.0, §5.2 |
| **D4-4** | Chi risponde alle domande giuridiche | **Il titolare**, con la guida di §13 | §13 è scritta come guida da usare, non come elenco da girare a un legale |
| **D4-5** | Lo storico dei trattamenti | **Si tiene, e l'informativa lo dice.** Niente cambia nel software | chiude il punto 1 di §12.1. §2 e §9.1 non sono più una divergenza: sono una **conferma** |
| **D4-6** | La rete di sicurezza sotto la cancellazione automatica, **gratis** | **Una copia automatica settimanale** in un secchio privato del progetto. Scartati: quarantena di 30 giorni, mese a vuoto, piano a pagamento | **§7.5 e §7.6 riscritte**; L13 e L21 cambiano; §9.4 cambia numero; il 3c va avvisato due volte (§12.1) |
| **D4-7** | Quante copie | **Quattro**, cioè **quattro settimane** per accorgersi di un errore — e il margine *garantito* è **tre** (§6.3.4) | ⚠︎ **Non si traduce in un numero sul cartello finché la prima copia non è riuscita.** §9.4 dà tre testi condizionati: fino alla prima copia il cartello dice solo «12 mesi dall'ultimo appuntamento». ⚠︎ Alla revisione 2 questa riga faceva appendere «più fino a **un mese** nelle copie», che §9.4 aveva ritirato **e** corretto in quattro settimane, citando come fonte la sezione che la smentiva |
| **D4-8** | Che cosa si consegna a chi chiede i propri dati | **Un foglio A4 stampabile, e basta.** Scartati: foglio + CSV, e solo CSV | **corregge una proposta di questo documento** (§5.1): una resa invece di due. ⚠︎ **E il costo che la scelta porta con sé, che la revisione 2 non riportava qui:** con **un solo** formato il diritto di accesso ha **un solo supporto**, e che il salone possa stamparlo è `[da misurare]` (§12.1). Se non si stampa, **D4-8 va riaperta** |
| **D4-9** | L'informativa | **Un cartello al banco, e niente altro.** Scartati: frase a voce al telefono, copie da portare via, foglio da firmare | ⚠︎ **L18 e L19 restano aperti per intero**, e la **domanda 4 di §13** diventa quella che tiene in piedi l'impianto (§9.6) |
| **D4-11** | §6 sbagliata due volte su due giri di lettura: terzo giro o banco di prova? | **Si correggono per lettura §8, §12, §5, §13 e il censimento per fatto; §6 si ferma a `[proposta]` dichiarata e il suo meccanismo si stabilisce quando il piano scrive la migrazione e le prove girano.** Scartati: un terzo giro di lettura su tutto; provarla adesso (le altre chat usano lo stesso database) | §6.2 e §6.3 portano l'avvertenza in testa. È la regola che la spec originale si è data al suo §15: «il rischio residuo si sposta dove può essere estinto» |
| **D4-10** | Una cliente prenota e poi **disdice**: conta come ultimo contatto? | **Sì: ha avuto a che fare con il salone**, e i 12 mesi ripartono da quella telefonata. Scartati: «se non è venuta non conta» (che è ciò che il codice fa oggi), e «conta solo se disdice lei» — la più giusta delle tre e **la sola che il sistema non può eseguire**, perché non sa chi ha disdetto (D15) | ⚠︎ **Chiude il difetto peggiore del primo giro** (§6.2): toglie il ripiego su `created_at` e lo sostituisce con un dato **che non torna indietro**. §6.2.1, §6.2.2, §7.4.3 |

⚠︎ **Su D4-2 la scelta è stata fatta con il costo davanti**, ed è quello che l'opzione diceva: si perde l'unico
momento in cui una persona può dire «no, aspetta». Il piano 4 la esegue, e §6.3 mette al suo posto i **cinque presidi**
di §6.3.1 più l'elenco in sola lettura di §6.3.2. Non sono una
conferma mascherata — nessuno deve toccare niente perché la cancellazione avvenga.

### 12.1 Aperto, da decidere o misurare nel piano

**Da chiarire con l'utente, e la prima è la più importante:**

1. ✅ **Chiuso da D4-5 il 28/09/2026.** La domanda era: rispondendo a D4-1 l'utente aveva detto «i dati che teniamo
   sono nome, numero di telefono e compleanno», mentre il sistema tiene **anche l'elenco dei trattamenti ricevuti con
   le date** e **l'operatrice preferita** (§2). Messa davanti alle tre opzioni — tenerlo e dichiararlo, mostrarne solo
   l'ultimo, o cancellare le visite vecchie — l'utente ha scelto **tenerlo e dichiararlo**. ⚠︎ Quindi: **niente cambia
   nel software**, e **l'informativa lo elenca** (§9.1). E resta vero che è il dato su cui pesa la domanda 1 di §13,
   che va portata per prima.
2. **Il termine degli export** (§7.3): la proposta è «non oltre il termine di conservazione, poi si cancellano». È
   una regola di procedura che nessun software fa rispettare.
3. **Chi tiene i file esportati e dove** (§7.3, punto 2): chi ha quel posto ha tutte le clienti.
4. ✅ **Chiuso da D4-9:** cartello al banco, niente altro. ⚠︎ Ma il punto **non è chiuso in senso pieno**, perché
   lascia L18 e L19 aperti per intero e carica tutto il peso sulla domanda 4 di §13 (§9.6).

**Da misurare nel piano, o da far misurare al 3c:**

5. `[da misurare]` **Esistono gli accordi sul trattamento con Supabase e con Vercel, o vanno stipulati?** → 3c §8.7
   (§9.3).
6. ✅ **La regione dei due progetti** → **già nel 3c**, passi A1 e F3 della sua procedura di apertura (§1.3). Resta
   `[da misurare]` come fatto, ma **non serve chiederla**: è assegnata. Restano **i sotto-responsabili** dei due
   fornitori, che nessuno ha elencato (§4.2).
7. `[da misurare]` **Per quanto il piano Supabase conserva i log del database, e Vercel i log di richiesta** → voce
   nuova per 3c §8.7 (§3.3).
8. ⚠︎⚠︎ **RIAPERTO, ed era il quarto ✅ falso del documento.** D3c-2 è **sospesa** alla rev. 2 del 3c: la misura è
   **3c §9.3 A2** e **non è stata eseguita**. Resta `[da misurare]`, e da essa dipende una riga del cartello (§9.4
   terza riga della tabella): se nessuno esegue A2, quella riga non scatta mai e il cartello dichiara un termine più
   corto del vero. ✅ **La
   sostituzione è decisa**: D4-6 e D4-7, quattro copie settimanali nostre (§7.6). Resta `[da misurare]` una cosa sola:
   **lo spazio di archiviazione compreso nel piano gratuito**, che per un file di meno di un megabyte non è un
   problema ma non è stato letto da nessuno.
9. `[da misurare]` **Quante righe al giorno il salone produce in `invio`, `visita_cancellata` e `annuncio`**, per
   sapere se 100 per salvataggio smaltisce o accumula (§6.4, L14).
10. `[da misurare]` **`pg_cron` è disponibile sul piano in uso?** Da cui dipende la sede della cancellazione automatica
    e della copia (§6.3.1).
11. `[da misurare]` **Quante clienti sarebbero eleggibili alla PRIMA esecuzione?** Decide se il tetto di 50 basta, ed è il
    numero che §6.3.1 presidio 4 chiede per non spegnere la conservazione il giorno dell'accensione.
12. `[da misurare]` **Lo spazio di archiviazione compreso nel piano**, per le quattro copie (§7.6). Un CSV di questo
    salone sta in meno di un megabyte, ma nessuno l'ha letto.
13. `[da misurare]` **I parametri di registrazione degli errori sul progetto ospitato** — e poi **provocare un rifiuto e
    leggere la riga di log che ne esce**: è la sola misura che stabilisce se nome e telefono finiscono nel log di
    Postgres (L4, §3.3). Assegnata al 3c.
14. ⚠︎ **Serve ancora `last_activity_at`?** Con `ultimo_contatto` in piedi la conservazione non la usa più (§6.2.2). Va
    fatto **il censimento dei suoi consumatori** prima di decidere: è consegnata, provata, e la sua macchina costa un
    trigger differito, un blocco di riga e uno stallo accettato.
15. `[da misurare]` **In salone c'è una stampante, e si stampa dal telefono delle operatrici?** D4-8 ha scelto **un solo**
    formato, quindi il diritto di accesso ha un meccanismo e **un solo supporto**. Se non si stampa, il foglio si mostra
    sullo schermo e **non è una consegna**: a quel punto D4-8 va riaperta **con questo dato in mano**, non per ripensarci
    ma perché era stata scelta assumendo la stampa. ⚠︎ Nessuna sezione della revisione 1 nominava la stampante.
16. `[da misurare]` **Il progetto si sospende per inattività?** Il 3c lo chiede già, e per il piano 4 decide **due**
    cose: un progetto sospeso **non cancella niente** *e* **non fa nessuna copia** — al rientro da due settimane ad
    agosto la rete è al suo punto più vecchio nello stesso giorno in cui la passata smaltisce l'arretrato (§6.3.1,
    §7.6.5). ⚠︎ E va misurato il verso opposto: un lavoro settimanale potrebbe **essere** l'attività che impedisce la
    sospensione.

**Buchi dichiarati, che nessun piano ha preso** (il secondo giro li ha censiti):

- ⚠︎ **Il secchio di archiviazione e i suoi permessi**: si crea nella dashboard, è il mestiere del 3c, e il 3c ha chiuso
  la sua procedura senza una voce per esso (§7.6.3).
- ⚠︎ **La sede del lavoro pianificato**: `pg_cron` è `[da misurare]` **senza assegnatario**, a differenza delle altre
  misure che dicono «assegnata al 3c» (§6.3.1).
- ⚠︎ **I cookie nell'informativa**: richiesta esplicita del 3c al piano 4, e §9 non li nomina — «cookie» compare una volta
  sola in tutto il documento, in L6, come limite di sicurezza. Va in §9 e apre una domanda in §13, perché il contenuto è
  un giudizio.
- ⚠︎ **Il termine del registro cartaceo delle richieste**: §5.6 dice «va scelto» e non lo sceglie né lo assegna. Un punto
  aperto che non sta nell'elenco degli aperti è sepolto.
- ⚠︎ **Il testo della riga al punto di raccolta, al momento in cui il 3a-2 ne ha bisogno**: il 3a-2 **l'ha già
  collocata** (Task 7) e gira **prima** del piano 4, senza dichiarare la dipendenza. O gli si consegna la frase adesso, o
  si accetta per iscritto che ne scriva una `[proposta]` che il piano 4 sostituisce.
- ⚠︎ **La ACL di difetto dopo ogni dispiegamento**: la procedura del 3c avverte che si ri-concede `truncate` e `maintain`
  su **ogni tabella nuova**; il piano 4 crea `passata_conservazione` e non lo diceva (§6.3.1 presidio 3).
- ⚠︎ **D4-2 fra i modi di perdere i dati della rinuncia che la titolare firma**: il 3c ne elenca cinque e la cancellazione
  automatica non è fra loro, nemmeno alla revisione 3. Richiesta **ancora aperta**.
- ⚠︎ **L'informativa verso il personale** (§3.6): obbligo distinto, fuori perimetro, senza assegnatario. Domanda 10.

**Sovrapposizioni trovate dal secondo giro, e già chiuse qui:** la prova statica su `details`/`hint` esiste già nel 3a-2
(Task 9) — il piano 4 **non la riscrive**; il requisito «identificativi fuori dalle URL» è già un vincolo globale del
3a-2 ed è già stato deciso in senso opposto nella forma letterale da 3b L3b-2 (il `client_id` è uno pseudonimo casuale:
ammesso) — resta solo il residuo dell'indirizzo della pagina della scheda cliente; e ⚠︎ **il ramo «rotta su Vercel» del
lavoro pianificato farebbe arrossire un gate del 3a-2**, che ha una prova statica su `service_role` nell'ambiente
dell'app: non è una frase da riscrivere, è `npm test` che diventa rosso (§6.3.1).

**Rimandi ad altri piani, dichiarati e non decisi qui:**

17. **Al 3b — rifatto alla revisione 2, perché tre dei quattro requisiti della revisione 1 erano già nel 3b e il
    quarto era in contraddizione con una decisione dell'utente.** Il 3b è **consegnato e committato**, quindi non se ne
    accorge da sé.
    - ✅ **Il pulsante «esporta la sua scheda»: CHIUSO il 28/09/2026**, parlandosi con quella chat. Il 3b costruisce **il
      posto** e lo lascia inerte (D3b-8, rev. 2); il piano 4 **lo collega** (§5.6).
    - ✅ **La prova sull'opposizione: CHIUSA, e in forma migliore della mia.** Il 3b prescrive già il presidio **duplice**
      — la riga senza azioni **e** il tocco che rilegge `no_messages` e rifiuta (3b §9.2). Il piano 4 non manda nessun
      requisito e adotta la loro forma (§5.5).
    - ✅ **Il termine di conservazione: confermato 12 mesi** (D4-1, decisione dell'utente sul perimetro del piano 4). Il
      3b può togliere il 24 dal suo limite 11.
    - ⚠︎ **Correzione a 3b §3.3**, che porta ancora «la conservazione a **24 mesi** e il suo distintivo di navigazione»
      come roba del piano 4: sono **12 mesi** (D4-1), e il contrassegno è un cerchio a tre (L4-3).
    - **Gli identificativi di cliente fuori dai percorsi delle URL** (L25, §3.3): è la sola cosa che il software può
      fare contro il log di richiesta, e riguarda le loro rotte.
    - ✅ **Già nel 3b, e la revisione 1 li mandava come nuovi:** il ritentativo su `40P01` per «Elimina cliente» (3b
      §5.6, con la stessa misura 6 su 6); il numero di visite future mostrato prima di cancellare (3b §5.6, e il 3b è
      **più avanti**: sta decidendo se mostrarle per nome e ora); `client.updated_at`, che **D3b-5 ha già deciso** di
      aggiungere con una migrazione, mentre la revisione 1 lo scriveva al condizionale.
    - ✅ **E due cose che il 3b regala al piano 4**, che la revisione 1 non sapeva: `cancella_cliente(p_cliente uuid)
      returns jsonb` come sede della cancellazione (§5.4 descriveva un `delete from client` generico), e la misura di 3b
      §7 sul fatto che la cascata faccia scattare i trigger d'annuncio — «se non scattassero, l'agenda di una collega
      mostrerebbe **fino a un minuto le visite di una cliente cancellata**», che è una **sede** e va in §3.
18. **Al 3a-2:** la collocazione della riga al punto di raccolta (§9.6); **gli identificativi di cliente fuori dai
    percorsi delle URL** (L25); e ⚠︎ **il contrassegno di spec §9.11 resta aperto**, non «non si costruisce» come diceva
    la revisione 1: è un cerchio a tre e lo rompe l'orchestratrice (L4-3). ⚠︎ **Il piano 3a-2 non è stato letto**, né
    alla revisione 1 né alla 2, e stava cambiando durante il primo giro di revisione: queste tre voci vanno verificate
    contro di esso prima di considerarle consegnate.
19. **Al 3c — rifatto alla revisione 2 contro la sua revisione 2, perché tre delle cinque richieste della revisione 1
    erano indirizzate a frasi che il 3c aveva già cambiato.**
    - ⚠︎ **Il sesto modo di perdere i dati.** 3c §9.7 E3 tiene l'elenco dei modi di perdere i dati che la titolare
      **firma**, e ne elenca cinque: telefono di un'operatrice, dashboard per sbaglio, `db reset --linked`,
      aggiornamento andato storto, accesso perso. **La cancellazione automatica di D4-2 non è fra loro**, benché il 3c
      abbia letto questo documento — aveva letto §1.3, §7.3 e §7.5, non §6. Va aggiunta, in E3 e in §9.11.
    - ⚠︎ **La rinuncia che la titolare firma va riscritta, e in forma datata.** 3c §9.7 E3 fa firmare «Non esiste e non
      esisterà nessun'altra copia: l'esportazione del piano 4 non è un backup», E5 dice «dopo sette giorni, niente», e
      D3c-7 fa accettare «di non avere nessuna copia diversa dal database». ⚠︎ **Con D4-6 quelle tre righe diventano
      false — dalla consegna del piano 4, non prima.** Il 3c ragionava sull'export di §7.2 e **non sapeva di §7.6**, che
      nasce dopo. È il difetto che il 3c stesso teme, allo specchio: una rinuncia che descrive un rischio **più grande**
      del vero fa firmare una perdita che non si deve accettare, e il giorno del danno **fa sì che nessuno vada a
      cercare la copia**, perché un documento firmato dice che non c'è.
    - ⚠︎ **La prova di ripristino NON va nella procedura di apertura.** La revisione 1 la mandava lì dicendo che la
      voce «esistenza e prova di un ripristino» era stata «svuotata da D3c-2 e torna viva». **Due cose sbagliate:** il
      3c non l'aveva svuotata — l'ha **spezzata in due e rafforzata** (E1 spostata in §9.3 A2, E2 «se A2 accerta che un
      ripristino c'è: **PROVARLO**») —; e 3c §9 gira **il giorno del rilascio, prima di ogni dato reale**, mentre il
      piano 4 arriva **dopo il primo uso vero** (D19). Il 3c non può provare il ripristino di un file prodotto da un
      lavoro che non esiste ancora. **La prova appartiene al collaudo del piano 4** (§7.6.4).
    - ⚠︎ **Il passo 6 di «telefono perso» (3a §4.7) oggi NON funziona**, e la revisione 1 diceva «ora c'è da dove». Tre
      ragioni indipendenti: A2 non è eseguita; le copie di §7.6 non esistono; e come specificata alla revisione 1 la
      copia non conteneva `visit` (§7.6.1). Quando tutto sarà a posto funzionerà **a meno di una settimana e a mano**.
      ⚠︎ E le sedi da correggere sono **due**, non una: 3a §4.7 lo dice anche nei limiti dichiarati.
    - **La procedura di ripristino** va scritta nel 3c, che è il documento delle procedure.
    - ✅ **Richiesta del 3c accolta:** `public.conflitti` e il suo elenco trascritto a mano (3c §3.5, D3c-4) sono entrati
      nel censimento di §3. Il 3c l'aveva chiesto e la revisione 1 non l'aveva vista.
    - ✅ **Risposta a un reperto che il 3c ci ha passato:** la pulizia dei trenta giorni che vive in `app.chiudi_invio` e
      che ad agosto non gira è **coperta da §6.4**. Il 3c continuava a considerarlo aperto.
    - **Il nome della sezione di Impostazioni:** il 3c la chiama «Dati delle clienti», questo documento «Dati
      personali». Ci si allinea al 3c, che tiene il contenitore.
20. ✅ **Numero di migrazione: `0024`, assegnato dall'orchestratrice il 28/09/2026** — 3b → `0022`, 3c → `0023`, piano 4 →
    `0024`. La contesa su `0023` è risolta: il criterio è l'ordine dei piani, e il 3c viene prima.
    ⚠︎⚠︎ **E un vincolo sulla FORMA del nome, che per il piano 4 pesa più che per chiunque altro.** Il CLI Supabase
    **salta in silenzio** una migrazione il cui nome non corrisponde al modello `<timestamp>_name.sql`: stampa una riga
    facile da non vedere, e **`supabase db reset` esce 0**. Misurato due volte in questo progetto [dalla revisione, 3b
    per conto dell'orchestratrice]: la sonda 13 del piano 2, rinominando apposta in `0012b_availability_window.sql` —
    reset uscito 0, «Skipping migration …» in cima all'elenco, **15 prove rosse con `42883`**; ed è la ragione per cui
    nel repo c'è `00051_privilege_baseline.sql` e non `0005b_`, perché con quel nome **una correzione di un buco di
    sicurezza sarebbe arrivata in produzione inerte, con la suite verde**.
    ⚠︎⚠︎ **Sommato a due cose mie, è L31:** l'obbligo 6 dei findings del piano 2 è ancora aperto — «una migrazione
    saltata dal CLI non la coglie nessuna prova» — e **le migrazioni del piano 4 girano su un database con dati reali**.
    **Una migrazione di CONSERVAZIONE saltata in silenzio significa che i dati personali non vengono cancellati e
    nessuno se ne accorge**: non un guasto rumoroso, **un obbligo che non viene adempiuto.** Se servisse infilarne una
    fra due numeri, la forma è **cifre sole** (`00241_nome.sql` ordina fra `0024` e `0025`), e **si verifica leggendo
    l'output del reset**, non il suo codice di uscita.
21. ⚠︎ **E le migrazioni del piano 4 — `0024` — girano su un database con dati reali dentro**, perché il piano 4 arriva dopo il
    primo uso (D19). Il 3c lo elenca fra le strade per perdere i dati. Il piano deve dire quali presidi vuole per quel
    momento: la revisione 1 non lo diceva.
22. **Al 3a-1:** la colonna su `invio` che legherebbe un codice alla sua operatrice (L3) è del Task 1, non mia.

**Alternative scartate, con il loro costo, per chi rivedrà queste scelte:**

23. **Un lavoro pianificato per le tre pulizie brevi** invece della sede dentro `app.chiudi_invio` (§6.4): chiuderebbe
    L14, e costerebbe un secondo meccanismo pianificato da mantenere — quello che `0013` ha deliberatamente evitato.
    Il piano 4 **non** lo fa, perché ora un lavoro pianificato serve comunque per la cancellazione automatica (§6.3):
    **se quel lavoro esiste, la decisione va ripresa**, e le tre pulizie possono salirci sopra.
24. **Il periodo di conservazione in una riga di impostazioni** invece che nel corpo della funzione (§6.2): si
    cambierebbe senza migrazione, e costerebbe una tabella e una schermata per un solo intero — e un intero che chi
    chiama può scegliere è un elenco di tutte le clienti in ordine di anzianità.

---

## 13. Le domande giuridiche, e come usarle

**D4-4: a queste risponde il titolare.** Questa sezione è quindi scritta come una **guida da usare**, non come un
elenco da girare a un legale: ogni domanda dice **perché si pone**, **che cosa cambia** secondo la risposta, e **che
cosa fare se non si sa**.

⚠︎ **E qui il limite in testa al documento vale per intero: chi scrive non è un consulente legale, e nessuna di
queste righe è una risposta.** Se una domanda resta senza risposta, la cosa onesta è **scriverlo nell'informativa
come limite dichiarato**, non lasciarla in bianco.

### Domanda 1 — Il registro dei trattamenti ricevuti è un dato particolare?

**Da dove viene:** spec §11.2 e domanda 1 di spec §14, classificata **bloccante per il rilascio**.

**Perché si pone:** una persona identificata con una storia **datata e ricorrente** di drenaggio linfatico o
riflessologia è un registro da cui si possono **inferire** informazioni sulla salute. Conta ciò che si inferisce, non
ciò che è etichettato.

**Che cosa cambia secondo la risposta:** se sì, cambiano la base giuridica, il contenuto dell'informativa e
probabilmente il termine di conservazione. Se no, l'impianto attuale regge.

**Che il sistema ha già fatto per starne lontano:** §8 — ⚠︎ **e alla revisione 3 sono tre fatti più uno che non
tiene.** La revisione 2 diceva «quattro fatti, il più forte dei quali è D26: non esiste nessun campo di testo libero,
quindi *allergica al gel* non si scrive da nessuna parte». **Falso:** `service.name` è testo libero non vincolato e
compare su ogni appuntamento di una cliente identificata (§8 punto 2, L29). D26 ha chiuso una porta e ne ha lasciata
aperta un'altra. ⚠︎ **Leggi §8 nella sua versione corretta prima di rispondere**, e con i tre fatti che la revisione 2
non dava: granularità, durata reale dello storico, e chi lo vede.

**Se non si sa:** ⚠︎ **questa non si può rimandare al dopo-rilascio, e la revisione 1 di fatto lo faceva.** Diceva «in
attesa, il sistema non va cambiato — è già costruito come se la risposta fosse sì», che è vero **solo per il testo
libero** e non per la base giuridica, per l'informativa né per il termine di conservazione: le tre cose che questa
stessa domanda elenca fra le sue conseguenze. La sua risposta cambia **il cartello che va appeso**.

Le due vie eseguibili, entrambe alla portata del titolare:

1. **rispondere «sì» in via prudenziale**, e allora il cartello nomina anche i trattamenti come categoria delicata e la
   domanda 2 va risolta prima;
2. **spendere per un solo parere, e sia questo**: è l'unica domanda che cambia tutto il resto.

**Quello che non è una via d'uscita è appendere il cartello lasciandola in bianco.**

### Domanda 2 — Il consenso in negozio è la base giusta, e come si dimostra?

**Da dove viene:** D4-1b — il titolare ha dichiarato che le clienti «prestano il consenso quando vengono la prima
volta a negozio» — e la domanda 2 di spec §14.

**Perché si pone, e sono due cose diverse:**

1. **Se il consenso sia la base adatta** per tenere un'agenda di appuntamenti. Un'agenda serve a erogare il servizio
   che la cliente ha chiesto, e non è ovvio che la base sia il consenso; ma **è una valutazione giuridica**, non una
   scelta di progetto.
2. ⚠︎ **Come si dimostra che è stato prestato.** Qui il piano 4 ha una risposta tecnica precisa, ed è scomoda: **oggi
   il sistema non può dimostrarlo.** Non esiste una colonna `consenso`, non esiste una data, e con D26 non esiste
   nessun campo libero dove annotarlo. Vedi L18 in §10.
3. ⚠︎ **E c'è un problema di momento**: il consenso si presta **al primo appuntamento in negozio**, ma la scheda si
   crea **prima**, al telefono, quando la cliente prenota — perché è così che il salone lavora [dalla spec, §14
   domanda 4]. Fra la telefonata e la prima visita **i dati esistono già**. Vedi L19 in §10.

**Che cosa cambia secondo la risposta:** se la base è il consenso, serve un modo di dimostrarlo (una colonna, o un
registro cartaceo al banco) e la sua revoca deve essere facile quanto il prestarlo — cioè la cancellazione di §5. Se
la base è un'altra, il punto 2 si sposta ma non sparisce.

**Se non si sa:** `[proposta]` il ripiego che costa meno è il **registro cartaceo al banco** già previsto per le
richieste (§5.6), con una riga per la prima visita. Costa una firma e non costa una migrazione.

**Separatamente: gli auguri di compleanno.** La data di nascita si raccoglie **solo** per gli auguri, quindi se
quella finalità non ha una base, il campo non ne ha una [dalla spec, §14 domanda 2]. E l'obbligo si attacca alla
**comunicazione**, non allo strumento: mandarli a mano non lo evita.

### Domanda 3 — 12 mesi: con quale ragione lo si giustifica?

**Da dove viene:** D4-1 e la domanda 3 di spec §14.

**Perché si pone:** il termine che l'informativa dichiara è quello che il salone si impegna a rispettare, e va
**giustificato con la finalità**. La domanda non è se 12 mesi «vada bene»: è **quale ragione si scrive accanto**.
⚠︎ Alla revisione 2 questa domanda si rispondeva da sé — «un termine più corto è più facile da difendere, non più
difficile», «ogni giustificazione che regge per 24 regge per 12» — che è un **giudizio di difendibilità**, cioè
esattamente ciò che la testa del documento dichiara di non dare. È tolto.

**Il fatto tecnico, che non è un giudizio:** 12 mesi tiene **meno** dati di 24. Che cosa quel fatto valga davanti a chi
chiede «perché li tenete un anno?» non lo dice questo documento.

**Che cosa cambia:** solo il numero dentro una funzione, e una riga dell'informativa (§6.2).

**Se non si sa:** la ragione più semplice è quella che il salone ha davvero — *«teniamo i dati per poterla
richiamare e per riconoscerla quando torna; dopo un anno di assenza non ci servono più»* — e va **scritta**, perché un
termine senza ragione accanto non si difende. `[proposta]` E va detto **come si misura**: dall'**ultimo contatto**,
compresa una prenotazione disdetta (D4-10) e compresa la data di una visita futura (§6.2.2).

### Domanda 4 — Il cartello in salone basta, se le clienti si registrano al telefono?

**Da dove viene:** domanda 4 di spec §14.

**Perché si pone:** la maggior parte delle clienti è registrata **durante una telefonata**, e in quel momento non
legge nessun cartello e non vede nessuna schermata. Un'informativa esposta in salone la raggiunge alla prima visita,
non alla raccolta. È lo stesso problema di momento della domanda 2 punto 3.

**Che cosa cambia:** se il cartello non basta, serve qualcosa in più — una copia da consegnare, o una frase detta al
telefono, o un messaggio dopo la prenotazione (che però D9 esclude come automatismo).

⚠︎⚠︎ **Con D4-9 questa è la domanda più importante delle undici, e va detto perché.** Il 28/09/2026 l'utente ha scelto
**il cartello al banco e niente altro**, scartando la frase al telefono, le copie da portare via e il foglio da
firmare. Prima di quella scelta c'era un ripiego che costava cinque secondi per telefonata; adesso non c'è. Quindi
**la risposta a questa domanda è l'unica cosa che sta fra il salone e un obbligo di informare non adempiuto**, per
tutte le clienti registrate al telefono — cioè la maggior parte.

**Se non si sa — e alla revisione 2 questo paragrafo dava solo un rimedio, non una via per decidere.** Il difetto era
autodimostrativo: per la domanda 5 il documento sa indicare **dove sta scritto**, e per questa — che dichiara tre volte
essere la decisiva — non indicava niente.

⚠︎ **Anche questa si legge invece di indovinarla.** L'obbligo di informare è scritto nel **regolamento europeo sulla
protezione dei dati**, negli articoli che riguardano **l'informazione da dare all'interessato quando i dati si
raccolgono** (e in particolare il caso in cui i dati **non** si raccolgono direttamente dalla persona). Il testo è
pubblico e consultabile, e quello che ti serve leggere è **quando l'informazione va data e con quali mezzi**: da lì si
vede se un cartello al banco, letto alla prima visita, copre una raccolta avvenuta al telefono settimane prima.

`[proposta]` **E il rimedio resta disponibile in qualunque momento**, indipendentemente dalla risposta: la frase al
telefono costa cinque secondi, non dipende da nessuna schermata e non richiede di cambiare niente. Se la risposta è «no,
il cartello da solo non basta», è la correzione più economica che esiste.

### Domanda 5 — In quanto tempo si deve rispondere a una richiesta?

**Da dove viene:** §5.0. **È un termine di legge, e questo documento non lo scrive.**

**Che cosa il piano 4 fa comunque:** fissa un **obiettivo interno** di `[proposta]` **7 giorni lavorativi**. Un
obiettivo interno più corto del termine non è zelo: è ciò che assorbe una chiusura, una malattia e un telefono rotto
senza sforare. ⚠︎ **La revisione 1 aggiungeva «più corto di qualunque termine legale plausibile», e quella frase
delimitava un termine che il documento dice di non scrivere:** è tolta.

**Se non si sa — e questa è l'unica delle domande che NON è un giudizio.** È un **termine fisso**, che si **legge**
invece di valutarlo: sta nel regolamento europeo sulla protezione dei dati, all'articolo che riguarda le richieste degli
interessati, e il testo è pubblico e consultabile.

`[proposta]` **Il ripiego, e che cosa NON è:** rispondere entro **7 giorni lavorativi** dà margine. **Non sostituisce il
numero**, perché il registro di §5.6 ha una colonna «data entro cui rispondere» e quella data si scrive con il termine
vero. ⚠︎ Alla revisione 2 questo paragrafo diceva che i 7 giorni «mettono al riparo **senza sapere il numero**» e nella
riga dopo che «il numero serve comunque»: diceva insieme «non ti serve saperlo» e «ti serve saperlo», e la prima metà
era anche un'affermazione su che cosa un regolamento assegna — la cosa che questo documento dichiara di non fare.
**Mezz'ora di lettura, una volta, e poi il numero sta sul quaderno.**

### Domanda 6 — Cancellare nell'app basta, se il nome è anche su uno scontrino?

**Da dove viene:** §5.4, ultima riga della tabella.

**Perché si pone:** questa applicazione non tiene prezzi né incassi (D14), quindi la cancellazione qui dentro è
completa **rispetto a questo sistema**. Ma il nome di una cliente può stare su uno scontrino, in un quaderno, nella
rubrica di un telefono o in una chat WhatsApp — **fuori dal perimetro di questo software e dentro il perimetro del
titolare.**

**Che cosa cambia:** la procedura di §5.6 deve ricordare a chi esegue una cancellazione di guardare anche fuori, e
l'informativa deve dire di che cosa parla.

**Se non si sa** — ⚠︎ paragrafo mancante alla revisione 1, e qui il documento **poteva essere più utile senza dare un
parere**: la cosa che il titolare può fare da sé, e che nessun consulente può fare al suo posto, è **l'elenco dei posti
fuori dall'app dove il nome di una cliente sta**. È un fatto sul mondo, non un giudizio. `[proposta]` La forma:

| Dove | Chi lo cancella | Come |
|---|---|---|
| Agenda di carta / quaderno | | |
| Scontrini e registri fiscali | | |
| Rubrica del telefono | | |
| Chat WhatsApp (§3.5) | | |
| Fogli stampati per una richiesta (§5.1) | | |
| Elenco dei conflitti trascritto a mano (§3, 3c §3.5) | | |

Riempirlo **è** metà della risposta a questa domanda, e si fa in un pomeriggio.

### Domanda 7 — E se una cliente chiede di sospendere senza cancellare?

**Da dove viene:** §5.5. **Non esiste nessun meccanismo**, e con D26 non c'è nessun posto dove marcarla.

**Che cosa cambia:** se il caso è reale, serve una colonna nuova — cioè una decisione di dominio e una migrazione. Se
non è reale, il ripiego dichiarato basta: si tratta sul registro cartaceo e si converte in cancellazione se la
cliente è d'accordo.

**Se non si sa** — ⚠︎ **e alla revisione 2 questo paragrafo chiudeva la domanda invece di lasciarla aperta**: diceva
«si tiene il ripiego, in un salone di tre persone il caso non si è mai presentato», cioè trasformava una domanda
giuridica in una domanda di prodotto e la decideva. Una non giurista che lo leggeva concludeva che non serve niente.

**La domanda resta aperta, e quello che si può fare senza risponderla è una cosa sola:** avere **una risposta scritta
pronta** per la prima cliente che lo chiede — *«il nostro sistema non sa sospendere l'uso dei suoi dati senza
cancellarli; posso cancellarli, oppure lasciare la richiesta aperta e risponderle appena ho una risposta»* — e
annotarla sul registro. `[proposta]` Se il caso arriva **una volta**, la colonna si costruisce: a quel punto c'è una
ragione misurata invece di un'ipotesi.

### Domanda 8 — Le tre tabelle di servizio vanno nominate nell'informativa?

**Da dove viene:** §6.4. Sono `invio`, `visita_cancellata` e `annuncio`: dati **pseudonimi** — identificativi casuali,
date e orari — conservati 30 giorni, 30 giorni e un'ora `[proposta]` (con il limite L14). Non contengono nomi né
telefoni.

**Che cosa cambia:** se vanno nominate, l'informativa cresce di un paragrafo tecnico che nessuna cliente leggerà. Se
non vanno nominate, la frase sul periodo di conservazione deve comunque essere vera, e L14 dice che «30 giorni» non
è esatto.

**Se non si sa:** `[proposta]` chi scrive il software propende per **non** nominarle nell'informativa e descriverle
**qui**, in un documento pubblico e citabile — il posto giusto per un dettaglio tecnico non è un cartello al banco. ⚠︎ Ma
è una **proposta**, non la risposta: decidere che cosa un testo giuridico deve contenere non è del piano. E se si sceglie
di non nominarle, la frase sul periodo di conservazione **deve restare vera comunque**: §9.4 dà la forma che regge.

### Domanda 9 — WhatsApp: che cos'è Meta in questo trattamento, e i due fornitori dove tengono i dati?

**Da dove viene:** §3.5 (WhatsApp), §4.2 e §9.3 (i fornitori). ⚠︎ **Questa domanda mancava alla revisione 1**, benché il
suo stesso preambolo elencasse «l'adeguatezza di un trasferimento» fra i giudizi che rimandava — e §9.3 rimandasse a
«§13, domanda 4», che è quella del cartello. Il primo giro l'ha trovata.

**Perché si pone, e sono due cose:**

1. **Meta.** L'applicazione apre WhatsApp per gli auguri, e toccare quel pulsante manda il numero della cliente a Meta.
   È la via di consegna prevista della sola finalità per cui si raccoglie il compleanno (D9). Che Meta sia responsabile
   del trattamento o titolare autonomo cambia che cosa l'informativa deve dire.
2. **Supabase e Vercel.** La spec afferma che ciascuno «comporta un trasferimento» e **nessuno l'ha verificato**:
   dipende dalla regione dei due progetti.

**Che cosa cambia:** se i dati stanno nell'Unione, la questione si riduce all'accordo con ciascun fornitore. Se stanno
fuori, no. E per Meta: se è un destinatario autonomo, l'informativa lo deve nominare come tale.

**Se non si sa:** ⚠︎ **questa domanda non si può nemmeno porre prima di un dato**, e il dato è già assegnato: **la
regione la guarda il 3c**, ai passi A1 e F3 della sua procedura. L'ordine è: prima il 3c guarda e trascrive, poi si
risponde. Su Meta il ripiego che costa niente è **dirlo nell'informativa senza qualificarlo**: «per gli auguri usiamo
WhatsApp, e il numero passa da Meta».

### Domanda 10 — Il salone deve tenere un registro dei trattamenti, una valutazione d'impatto, un'informativa per il personale?

**Da dove viene:** §1.2 e §3.6. ⚠︎ **Anche questa mancava**, benché §1.2 dichiarasse «§13 li porta come domande». Il
primo giro l'ha trovata.

**Perché si pone:** non sono pezzi di software, e **questo documento non dice se servono**: dice che **nessuno ha
guardato**, e che nessuno dei cinque piani se n'è preso nessuno. Tre cose distinte:

1. il **registro dei trattamenti** (l'elenco scritto di che dati si tengono e perché — che, per la parte informatica,
   è §2 e §3 di questo documento);
2. una **valutazione d'impatto**, che dipende dalla risposta alla domanda 1;
3. un'**informativa verso le tre operatrici**, che sono dipendenti e i cui accessi e indirizzi il sistema registra
   (§3.6, L27). È un obbligo distinto da quello verso le clienti, e §9 non lo copre.

**Che cosa cambia:** sono adempimenti di carta, non di codice. Ma il terzo ha una parte tecnica che il piano 4 può dare:
**che cosa il sistema registra delle operatrici**, ed è scritto in §3.6.

**Se non si sa:** ⚠︎ **alla revisione 2 questo paragrafo diceva «si scrive in mezz'ora copiando §2 e §3», e sono due
errori.** Primo: decideva che §2 e §3 **bastano** come registro dei trattamenti, che è una valutazione di sufficienza.
Secondo, e peggio: §3 e §3.6 contengono i **limiti dichiarati** — il log che riceve nome e telefono, il registro degli
accessi senza pulizia, la funzione che mostra tutte le email a tutte — e **consegnarli copiati alle tre operatrici come
"informativa" è consegnare l'elenco dei buchi.**

`[proposta]` La forma giusta: il registro dei trattamenti si scrive **partendo** da §2 e §3, tenendo *quali dati, per
quale finalità, per quanto, chi vi accede* e **lasciando fuori i limiti**. L'informativa verso le operatrici si scrive
allo stesso modo da §3.6: *che cosa il sistema registra dei loro accessi, e per quanto*. Il secondo punto dipende dalla
domanda 1 e va con lei.

### Domanda 11 — Come si risponde a una cliente che non può venire in salone?

**Da dove viene:** §5.2. D4-3 dice «in salone, di persona», e il riconoscimento di persona è l'unica verifica che il
salone ha. Ma una cliente che si è trasferita ha comunque diritto di chiedere.

**Perché si pone:** un indirizzo detto al telefono **non è una verifica**, e spedire la scheda a chi ha telefonato
dicendo un nome è la cosa che §5.2 dice di temere. Le due vie possibili sono in §5.2: richiesta scritta e firmata con
copia di un documento, oppure ritiro da una persona indicata per iscritto.

**Che cosa cambia:** quale delle due sia adeguata, e se un documento si possa guardare senza conservarlo (D26 dice che
non c'è dove conservarlo, quindi la risposta tecnica è: si guarda e si restituisce).

**Se non si sa:** la risposta provvisoria è **«deve passare in salone»**: scomoda, onesta, e non lascia uscire una
scheda senza una verifica. ⚠︎ E §5.0 va letta nella versione corretta: alla revisione 2 offriva ancora la posta.

### Domanda 12 — L'elenco di §9 basta?

**Da dove viene:** il titolo di §9, che fino alla revisione 2 diceva «**il contenuto minimo**».

**Perché si pone:** «contenuto minimo» afferma che quelle voci **bastano** — un giudizio di sufficienza su un testo
esposto al pubblico, dato in una sezione che si apre dichiarando di non darne. §9 è stata ricavata da **ciò che il
sistema fa**: è un elenco *derivato*, non *normativo*.

**Che cosa cambia:** se l'elenco non basta, mancano voci al cartello. Se basta, §9 è pronta da usare — nel ramo «no»
della domanda 1 (§9, tabella in testa).

**Se non si sa:** `[proposta]` la cosa utile è **il verso opposto**, e non richiede nessun giudizio: verificare che
**ogni** voce di §9 corrisponda a qualcosa che il sistema fa davvero, e che **ogni** sede del censimento di §3 sia
rappresentata in §9 o dichiarata come non dovuta. Quello è un controllo di completezza rispetto al sistema, ed è alla
portata di chi ha scritto §2 e §3. Se poi la norma chieda **di più** di ciò che il sistema fa, quella è la domanda che
resta.

---

## 14. Dove si ferma la revisione di questo documento

**Non si è ancora fermata.** Il primo giro è stato fatto, e la revisione 2 lo applica.

### 14.0 Il registro del primo giro (28 settembre 2026)

**Quattro revisori indipendenti su Opus, con lenti disgiunte** — il meccanismo distruttivo; il censimento, le citazioni
e i limiti; le cuciture fra i cinque piani; il documento come cosa usabile e la sua onestà.

**Esito: 20 bloccanti, 45 maggiori, 22 minori.** §6.2, §6.3, §7.4, §7.5 e §7.6 sono state **rifatte**, non corrette; §3
ha guadagnato sei sedi e due sotto-paragrafi; §10 è passata da 22 a 28 limiti e ha perso tre ✅ falsi; §13 da otto a
undici domande.

**I cinque reperti che hanno cambiato il disegno, e non solo il testo:**

1. ⚠︎⚠︎ **Il predicato di eleggibilità cancellava una cliente viva** (§6.2). `last_activity_at` regredisce a NULL quando
   l'ultima visita sparisce, e il `coalesce` ripiegava su `created_at`: **una disdetta rendeva eleggibile la notte stessa
   una cliente registrata al telefono più di dodici mesi prima.** Le due metà erano già dimostrate da **due prove verdi
   nella suite committata**. Chiuso da D4-10 e da `ultimo_contatto`.
2. ⚠︎⚠︎ **La copia di sicurezza non si poteva rimettere dentro** (§7.6.1): mancava `visit`, che è genitore obbligatorio di
   `appointment` con chiave composta.
3. ⚠︎⚠︎ **D3c-2 era stata SOSPESA dal 3c**, e questo documento vi aveva costruito sei sezioni, due decisioni dell'utente e
   un numero per l'informativa esposta in salone (§7.5) — **la stessa colpa per cui il 3c l'ha ritirata.**
4. ⚠︎ **Tre ✅ in §10** dichiaravano ridotti tre limiti sulla forza di un meccanismo che **non esiste**: oggi il numero di
   copie è zero e il margine è zero.
5. ⚠︎ **Sei sedi di dati personali mancavano dal censimento**, e cinque su sei erano state descritte partendo da una
   **regola** invece che dal **meccanismo** — WhatsApp, `annuncio` dopo una cancellazione, il log di richiesta di Vercel,
   la cache del telefono, lo schema `auth`, e una che il piano 4 crea da sé.

**Il criterio con cui si fermerà**, e le cose che il secondo giro deve cercare per prime, sono qui sotto.

### 14.0-bis Il registro del secondo giro (28 settembre 2026)

**Quattro revisori indipendenti su Opus, con lenti diverse dal primo giro** — §6 come ingegneria; le tabelle delle
mutazioni riga per riga; §8 e le undici domande rimisurate; le cuciture e il piano 3a-2, che nessuno aveva letto.

**Esito: 21 bloccanti, 49 maggiori, 22 minori** — gli stessi ordini di grandezza del primo giro (20 / 45 / 22). Ma la
**natura** è cambiata, e questo è il dato che dice se la revisione converge:

| | Primo giro | Secondo giro |
|---|---|---|
| Dove stavano i bloccanti | nel **disegno** | nelle **prove del disegno** e nelle **sedi lasciate indietro dalle correzioni** |
| Reperti nuovi contro sopravvissuti | — | **circa 45 nuovi contro 30 sopravvissuti o mai guardati** |

**I cinque reperti che hanno cambiato il disegno:**

1. ⚠︎⚠︎ **§8 diceva il falso sul fatto più importante del documento.** «L'unico testo libero che resta è il motivo di una
   chiusura» è falso: **`service.name` è `text not null` senza vincoli**, lo scrivono le operatrici, e compare su ogni
   appuntamento di una cliente identificata. D26 ha chiuso una porta e ne ha lasciata aperta un'altra, e il titolare
   stava per rispondere alla domanda bloccante su un sistema descritto sbagliato. **L29.**
2. ⚠︎⚠︎ **§6 misurava di nuovo la grandezza sbagliata, nel verso opposto.** `greatest(ultimo_contatto, oggi)` registra il
   giorno della scrittura, non la data dell'appuntamento: chi prenota a marzo per settembre è eleggibile **il marzo
   dopo**, sei mesi dopo essere stata in salone. **È la ragione di D4-11.**
3. ⚠︎⚠︎ **Il difetto di metodo: le correzioni erano applicate per SEDE, non per FATTO.** §12 faceva ancora appendere un
   cartello che §9.4 aveva ritirato; §12 registrava «consenso» come deciso mentre §6.1 lo negava; §2 descriveva ancora il
   `coalesce`; §5.0 offriva ancora la posta; §12.1 teneva un ✅ su un fatto sospeso. **La revisione 3 corregge per fatto,
   con un grep per affermazione.**
4. ⚠︎ **Nessuna delle 26 righe di prova era eseguibile:** sei senza precondizione costruibile, cinque senza imbracatura di
   archiviazione, cinque che presidiano un'applicazione **che non esiste**.
5. ⚠︎ **Seconda collisione fra due piani in due giorni:** `ultimo_contatto` bumpa `updated_at` del 3b, e una collega
   riceve «è stata modificata da una collega» quando di suo non è cambiato niente. **L30.**

✅ **E una cosa che ha funzionato, registrata perché è il rimedio che §6.3.3 descrive in astratto: dopo il secondo giro la
chat del 3b e questa si sono parlate**, e hanno chiuso tre cuciture in un colpo — il presidio dell'opposizione (dove la
**loro** forma era migliore della mia, e l'ho adottata), il posto del pulsante di export (dove nessuno dei due ha ceduto
né l'ha dato per fatto), e il termine di conservazione. Nessuna delle tre si chiudeva leggendo: due revisori indipendenti
le avevano trovate, e il documento dell'altro le confermava sbagliate **in entrambi i versi**.

### 14.1 Il criterio

Lo stesso del resto del progetto: **due giri di fila senza bloccanti**, con le decisioni ferme. Ma per **questo**
documento il criterio ha una variante, e va dichiarata adesso invece di scoprirla al terzo giro:

⚠︎ **Qui non si può misurare quasi niente, e non per pigrizia.** La spec 3a si è fermata quando i reperti residui
erano solo cose «che si chiudono con una migrazione eseguita». Qui i reperti residui sono di **tre** specie, e solo la
prima si chiude con una prova:

| Specie | Esempio | Come si chiude |
|---|---|---|
| **Meccanismo** | l'export della singola scheda contiene solo quella cliente | una prova eseguita con la sua mutazione (§7.4) |
| **Fatto sul mondo** | esiste l'accordo con Supabase? in che regione sta il progetto? | **guardando**, sul progetto ospitato — 3c §8.7, non una prova |
| **Giudizio** | il registro dei trattamenti è dato particolare? | **non si chiude con nessuna misura**: §13, e con D4-4 risponde il titolare |

**Quindi:** un giro di revisione che dichiarasse chiuso un reperto della seconda o della terza specie **starebbe
sbagliando**, e un giro che li conta come bloccanti non finirebbe mai. La regola: **i reperti di specie 2 restano
`[da misurare]` con un assegnatario; quelli di specie 3 restano in §13 con la domanda scritta.** La revisione si
ferma sulla prima specie.

### 14.2 Che cosa il SECONDO giro deve attaccare per primo

In ordine di danno, non di eleganza:

1. ⚠︎⚠︎ **La cancellazione automatica senza testimoni, e la copia che la copre (§6.3.3, §6.3.4, §7.6, L21).** D4-2 e
   D3c-2 non si discutono; la loro **composizione** era la cosa più distruttiva del progetto, è nata da due chat che
   non si sono parlate, e D4-6 la riduce. Un revisore attacchi **tutte e due le metà**: da un lato il tetto per
   passata, che cosa succede se la query di eleggibilità è sbagliata, che cosa succede se va in stallo a metà, se il
   conto delle cancellate finisce davvero da qualche parte; dall'altro **la copia**, che è il solo rimedio esistente —
   la rotazione a quattro, il secchio privato, e soprattutto **se qualcuno abbia mai provato a rimetterla dentro**. ⚠︎ E
   verifichi la tesi di §6.3.3: che le due decisioni siano state prese **senza** sapere l'una dell'altra. Se fosse
   falsa, §6.3.4 sarebbe una risposta a un problema inventato.
2. ⚠︎ **I due export (§7.4).** Un export dietro il solo controllo di sessione è il buco peggiore che questo progetto
   ha già avuto una volta. Un revisore verifichi che **ogni prova di quella tabella abbia davvero la sua mutazione**,
   e non che passi.
3. **Il censimento di §3.** Se manca una sede — un posto dove un dato personale vive e che questa tabella non elenca
   — tutto il resto del documento è incompleto in silenzio. Un revisore cerchi le sedi mancanti, non gli errori nelle
   righe scritte.
4. **Le cuciture di §5.6 e le letture di §11.1.** Sono l'unica parte del documento che **decide per altri piani**, e
   tre di quei piani si stanno scrivendo nelle stesse ore. Un reperto qui vale doppio, perché costa lavoro a un'altra
   chat.
5. **L14 e §6.4.** «30 giorni» non è quello che il codice fa. Un revisore controlli se la frase che il piano 4
   propone al suo posto è **esatta**, e se il piano 4 abbia ragione a non cambiare la sede della pulizia.
6. **§13 come guida.** Con D4-4 il titolare risponde da sé: un revisore legga le **undici** domande **come le leggerebbe
   lui**, e dica quali non sono usabili senza un legale accanto. ⚠︎ Il primo giro ne ha giudicate **sei su otto** non
   usabili; le correzioni della revisione 2 vanno rimisurate, non credute.
7. ⚠︎ **E la cosa che il primo giro insegna su sé stesso: le correzioni di un giro sono dove il giro dopo trova i suoi
   difetti.** È accaduto in ogni giro di questo progetto, e §6.2 ne è la prova più cara: la revisione 1 aveva scritto
   tre precisazioni «perché ciascuna, se sbagliata, cancella una persona che non andava cancellata» — e il caso che
   cancellava una persona era il quarto, quello che non c'era. **Il secondo giro parta dalle cinque sezioni rifatte**,
   non da quelle che il primo giro ha lasciato in piedi.

### 14.3 Che cosa questo documento non ha potuto fare, e va fatto dopo

- **Nessuna prova eseguita, nessun comando, nessuna lettura del database.** Cinque chat sullo stesso repository, e la
  regola del progetto: due suite Vitest insieme sullo stesso database danno 110–114 rosse false e una suite appesa.
  Ogni `[letto]` di questo documento è **il file, non il comportamento**.
- **Nessuna verifica sul progetto ospitato.** Nove dei ventiquattro punti di §12.1 sono `[da misurare]`: fatti sul mondo
  che nessuno ha guardato.
- **La riconciliazione con il 3b e il 3c c'è** — è §1.3.1 e §12.1 — ma è **una fotografia**: il 3c è passato per tre
  revisioni in una giornata, e le sue sezioni si sono spostate due volte sotto i rimandi di questo documento. ⚠︎ **Il piano
  3a-2 non è ancora stato letto da questa chat**; è stato letto da un revisore del secondo giro, e le sue cinque scoperte
  sono in §12.1. Quello che resta aperto lo chiude **l'orchestratrice**, non questo documento.
