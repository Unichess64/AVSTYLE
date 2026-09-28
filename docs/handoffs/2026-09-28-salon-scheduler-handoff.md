# Handoff — salon-scheduler (AVStyle) — 2026-09-28 15:40

Si porta avanti il sottoprogetto 3 dell'agenda del centro estetico: il piano 3a-1 è a 8 task su 11,
e sopra di esso quattro documenti di disegno scritti oggi in parallelo — 3a-2, 3b, 3c, piano 4 — sono
a giri di revisione diversi e si compongono a vicenda. Il ruolo passa a una chat nuova perché la
sessione corrente ha speso il proprio contesto nel censimento di **tre** repository vivi e non è la
sede giusta per dispacciare il prossimo giro.

**Legenda provenienza.** `[verificato]` = stabilito in questa sessione, con indicato come (comando
eseguito o file letto). `[da verificare]` = viene da memoria o documenti, era vero quando è stato
scritto.
**Regola d'uso per chi legge:** nessuna affermazione `[da verificare]` può entrare come premessa in
una spec, in un piano o in un prompt senza essere prima promossa da un comando eseguito qui. Se non
sai come verificarla, chiedimelo.

## Ruolo

Sei l'**orchestratore** di salon-scheduler: mantieni lo stato, produci spec, piani e prompt,
dispatchi le review, integri il lavoro.

**TESTO FISSO — non riformulare, non abbreviare:**

> Non fai, in nessun caso: **(a)** scrivere o modificare codice di implementazione in questa chat,
> con nessuno strumento — Edit, Write, NotebookEdit, o redirezione da Bash; **(b)** delegare quel
> lavoro a un subagent. Le uniche subagent che dispatchi sono le **review avversariali**
> (code-review, security-review, test-audit). Ogni altro lavoro — implementazione, remediation,
> refactor, stesura di piani con codice — esce da qui come *prompt* che consegni all'utente, e
> l'utente lancia la chat fresca.
>
> **Precedenza:** questo vincolo prevale su `superpowers:subagent-driven-development` e
> `superpowers:executing-plans`, che prescrivono il contrario. Quelle skill non si applicano qui.
>
> Se l'utente ti chiede di scrivere codice qui perché "è banale", ricordagli questa regola e proponi
> comunque il prompt per la chat fresca. Puoi derogare solo se lo conferma **dopo** che gliel'hai
> ricordata.

Divieti aggiuntivi specifici di questo progetto:

- ⛔ **Non toccare `chessbooking` né `unichess-widget`.** Alle 15:37 del 28/09 erano **tutti e due
  vivi**, con scritture a meno di un minuto e file non committati in crescita `[verificato: git
  status e stat sull'mtime più recente, campionati al minuto dalle 15:15 alle 15:37]`. Una misura
  presa su un albero che un altro lavoro sta mutando si invalida in silenzio.
- ⛔ **Non lanciare una seconda suite** mentre una gira: due suite sullo stesso banco si distruggono
  a vicenda (110 rosse da chiave duplicata e una suite appesa, misurato in passato su questo
  progetto). Il gate si esegue in serie.

Perimetro — che cosa in questo progetto **non** conta come codice di implementazione e resta quindi
nelle tue mani:

- documentazione, spec, piani, prompt, registri di revisione e file di memoria — **ordine
  permanente dell'utente**, registrato in `processo-sdd.md` e `review-con-subagent-esterno.md`
  (memoria personale, vedi *Processo di sviluppo*).

## Coordinate

| | |
|---|---|
| Working dir primaria | `/Users/nadiaottavi/Desktop/Git/salon-scheduler` |
| Dir addizionali (max 3) | nessuna: il lavoro di questo filone sta tutto lì |
| Ambiente | `node v24.18.1`, `npm 11.16.0` `[verificato: node -v, npm -v]`. Supabase **locale in Docker**, su `postgresql://postgres:postgres@127.0.0.1:54322/postgres`; CLI **non globale**, solo `./node_modules/.bin/supabase` (v2.117.0) `[verificato: supabase status, docker ps]` |
| Repo git | sì |
| Branch | `main` `[verificato: git branch --show-current]` |
| HEAD alla scrittura | `a9c4996d64665334bcfa561132d510f346f8a57d` `[verificato: git rev-parse HEAD]` |
| Remote | `origin` → `https://github.com/Unichess64/AVSTYLE.git` — ⚠︎ **`main` è avanti di 9 commit non pushati** `[verificato: git status -sb]` |

Working tree alla scrittura — output letterale di `git status --short | grep -v docs/handoffs`.
**L'esclusione non è cosmetica:** scrivere questo file crea un untracked in `docs/handoffs/`, quindi
uno snapshot che lo includesse renderebbe l'atteso dell'entry check impossibile da soddisfare e
farebbe scattare l'arresto su una divergenza prodotta dall'handoff stesso.

```
?? .DS_Store
?? .superpowers/
?? docs/.DS_Store
?? docs/superpowers/specs/2026-09-28-piano-3c-la-preparazione-design.md
?? docs/superpowers/specs/2026-09-28-piano-4-dati-personali-design.md
?? supabase/.DS_Store
?? tests/.DS_Store
```

**Non toccare** (preesistenti, non correlate a questo thread): `.DS_Store`, `docs/.DS_Store`,
`supabase/.DS_Store`, `tests/.DS_Store`, `.superpowers/`.

⚠︎ **Le due spec non committate non sono rumore**: sono il prodotto di due chat che hanno finito di
scrivere e si sono fermate lì. Vedi *In volo* prima di committarle o sovrascriverle.

Comandi gate — **esistono in questo progetto e sono stati lanciati in questa sessione**, non
trascritti:

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npm run db:reset
npm test
```

Baseline attesa `[verificato: 28/09/2026, 15:36:43–15:37:40, albero a9c4996]`:

- `npm run db:reset` → applica fino a `0019_annunci.sql`, semina da `supabase/seed.sql`, riavvia i
  container e stampa `Finished supabase db reset on branch main.` Uscita **0**.
- `npm test` → `Test Files  26 passed (26)` e `Tests  412 passed (412)`, **zero rosse, zero
  saltate**, durata ≈ 57 s. Uscita **0**.

⛔ L'esito si riporta con **rosse, saltate e denominatore**, mai col colore: una mutazione che rompe
una fixture dà **saltate**, non rosse, e non dimostra niente.

## Stato

**Fatto**

- Piano 3a-1 «Le fondamenta della scrittura», **8 task su 11** — l'ultimo è la tabella degli
  annunci, commit `86d4223`, più due correzioni `bc79743` e `a63b996` `[verificato: git log,
  intestazioni del piano]`
- Spec 3b «Dove c'è posto», **revisione 3** — primo giro avversariale (cinque revisori su Opus) più
  lo scambio con la chat del piano 4 — commit `a9c4996` `[verificato: testa del file e git log]`
- Piano 3a-2 «Le schermate», **revisione 4** — dopo il secondo giro avversariale — commit `cffdfec`
  `[verificato: testa del file e git log]`
- Spec 3c «La preparazione», **revisione 6** — dopo il **quarto** giro avversariale, 29 bloccanti,
  e le sei misure di §14.1 eseguite su un banco usa-e-getta alla revisione 5 — ⚠︎ **non committata**
  `[verificato: testa del file, git status]`
- Spec piano 4 «Dati personali», **revisione 3** — dopo il secondo giro avversariale (21 bloccanti,
  49 maggiori, 22 minori) — ⚠︎ **non committata** `[verificato: testa del file, git status]`

**Aperto**

- `3a1-task9` (**P0**) — ✅ **il prompt ESISTE**, `docs/handoffs/2026-09-28-task9-piano-3a1-prompt.md`,
  53 KB, scritto il 28/09 alle **16:09:59** e **non committato** `[verificato: stat, head]`. ⛔ **Non
  riscriverlo.** Tocca all'utente lanciarlo: è il binario che chiude. Poi restano Task 10 (ricerca
  clienti, doppioni, colori) e Task 11 (le cinque prove che restano) `[verificato: intestazioni del
  piano, ls docs/handoffs]`
- `3b-giro2` (P1, **col regime A+B+C**) — il **secondo giro avversariale sul 3b non è stato fatto**, e §15 del documento
  dichiara il criterio di arresto **non soddisfatto** ed elenca i cinque mandati che il giro deve
  coprire per primi `[verificato: letto §15 del file]`
- `p4-giro3` (P1, **col regime A+B+C**) — il piano 4 è a due giri; §14 dice «non si è ancora fermata» `[verificato: letto
  §14]`
- `3a2-risposta` (P1) — il 3a-2 è **l'unico dei quattro che non ha risposto** allo scambio; ciò che
  gli è stato chiesto — la prova statica enunciata per permessi — decide se le letture su cui §5.3
  del 3b si regge passano il suo gate `[verificato: letto §15 del 3b]`
- `3c-giro5` (P2) — ⚠︎ **prima di dispacciarlo, verifica se il criterio C lo rende inutile**: §14 dice
  che le due zone che non convergono si chiudono **solo eseguendo**. Se il banco le chiude, il 3c è
  chiuso e il quinto giro non si fa `[verificato: letto §14 e §16]`

**Deciso, e perché** — ciò che una chat nuova rischia di rimettere in discussione

- **Lo scambio diretto fra chat sorelle è un meccanismo adottato, non un ripiego** → fra documenti
  scritti in parallelo ciascuno possiede la metà del fatto che l'altro non può verificare; tre
  segnalazioni del 3b hanno prodotto più di un giro di revisione, e hanno chiuso tre limiti del
  piano 4 senza che nessuno li lavorasse. **Il canale non sostituisce la revisione, la continua.**
- **Il pulsante di export è del 3b, non del piano 4** → composto fra le due chat, nessuna delle due
  ha ceduto né l'ha dato per fatto.
- **`ultimo_contatto` sostituisce il `coalesce` su `last_activity_at`** (D4-10, D4-11) → il predicato
  di eleggibilità cancellava una cliente viva: una disdetta la rendeva eleggibile la notte stessa.
- **Le correzioni si applicano per FATTO, non per SEDE**, con un grep per affermazione → alla
  revisione 2 del piano 4 cinque sezioni contraddicevano ancora correzioni già applicate altrove.
- **Dalla revisione 4 in poi si archivia prima di sovrascrivere** (3c §16.1 punto 6) → le revisioni
  1–3 del 3c sono state sovrascritte e ogni tesi su di esse è oggi non verificabile.

- **Regime dei disegni, deciso dall'utente il 28/09/2026: il banco prima della lettura** → sostituisce
  i giri di sola lettura, e vale per 3b, 3c, piano 4 e 3a-2.
  - **A — la subagent misuratrice, non revisore.** Prima di ogni giro avversariale: contenitore
    Postgres **a sé** su porta libera, riproduzione **minima** delle tabelle e dei trigger in
    questione, esecuzione delle domande aperte, tabella dei numeri, banco **distrutto** a misure
    finite. ⚠︎ La spia conta **le esecuzioni oltre alle righe**: è lo scarto fra i due numeri che ha
    fatto comparire la riga `{NULL}` che non era nell'elenco di nessuno. ⛔ Mai sul database del
    progetto: due suite sullo stesso banco danno 110–114 rosse false.
  - **B — lo scambio fra documenti fratelli è obbligatorio**, prima del giro e non per caso. Si cita
    con **revisione e sezione**, mai col numero di riga — i documenti crescono — e si legge **la
    colonna delle note**: un bloccante del primo giro del 3b era falso perché il revisore aveva letto
    una decisione senza vedere la revoca scritta sulla riga stessa.
  - **C — il criterio di arresto non è più «due giri di fila puliti»**, ma: *i reperti residui sono
    **solo** di classe eseguibile, e il banco li ha eseguiti*. È il criterio con cui si è già fermata
    la spec 3a.
  - **Motivo, misurato:** venti minuti di banco (3c, 28/09 14:05–14:25) hanno **smentito tre numeri**
    che tre giri di lettura davano per buoni (240→600, 3→4, ~123→4), hanno mostrato che **due
    deduzioni di revisori su due sbagliavano nel verso rassicurante**, e hanno trovato **il reperto
    peggiore del documento**, che non rispondeva a nessuna delle domande poste.
- **Priorità: chiudere, non far convergere** — ordine dell'utente del 28/09/2026 → il widget (9 task
  su 11, **dentro la consegna del 15 ottobre**) e il piano 3a-1 (8 su 11) hanno un piano approvato e
  producono codice; i quattro disegni hanno **zero giri puliti su quattro** e nessuna scadenza
  esterna. Il disegno non si ferma: passa in secondo piano e al regime A+B+C.
- ⛔ **L'applicazione dei reperti NON si parallelizza su più subagent** → il progetto ha appena
  diagnosticato «correzioni applicate per **sede** e non per **fatto**» come difetto di metodo;
  dividere i bloccanti fra N subagent sullo stesso file lo reintroduce, più i conflitti di scrittura.
  La ricerca dei reperti si parallelizza, la loro applicazione no.

**Finding aperti** delle review già fatte

| id | severità | `file:line` | stato |
|---|---|---|---|
| L30 | blocker | `specs/2026-09-28-piano-3b-dove-c-e-posto-design.md` §7, §9.2 | ⚠︎ **chiuso a lettura, non a prove**. `app.touch_client_updated_at()` non è mai stata eseguita; regge su due fatti non misurati (che `to_jsonb(x) - 'chiave_assente'` sia un no-op, e che `to_jsonb(NEW)` in un trigger `before update` veda i valori attesi). Il primo task del piano le misura prima di qualunque codice |
| 3b §8.7 | blocker | `…3b…design.md` §8 limite 7 | **rinviato: in attesa del consulente privacy.** La base giuridica degli auguri è aperta |
| 3b §8.8 | blocker | `…3b…design.md` §8 limite 8 | **rinviato: in attesa del consulente privacy.** L'informativa che §5.5 cita non esiste fino al piano 4 |
| 3b §8.13 | major | `…3b…design.md` §8 limite 13 | **aperto, nuovo alla revisione 3**: una lista aperta può proporre un orario che il salone ha appena escluso dall'agenda |
| 3c §9 | blocker | `…3c…design.md` §9 | **aperto**: la sezione che apre il salone resta **non provabile**; tre giri l'hanno bocciata con 15, 18 e 18 voci |
| 3c §9.12 | major | `…3c…design.md` §9.12 | **aperto**: il passo 9 — il ripristino — **non ha ancora un comando** |
| 3c D3c-2 | major | tredici sedi, sei **in un altro documento** | **aperto**: sospesa, e un documento a valle ci ha già costruito una decisione |
| p4 §6 | major | `…piano-4…design.md` §6 | **aperto**: la passata di conservazione è `[proposta]` dopo due giri di lettura sbagliati in versi opposti, e tocca la funzione di cancellazione del 3b |

**Domande aperte** — nessuno le ha ancora decise: chiedile all'utente, non inventare la risposta.

- Le **due domande al consulente privacy** che tengono aperti i limiti 7 e 8 del 3b: la base
  giuridica degli auguri di compleanno, e se un'informativa esposta in salone basti. ⚠︎ Le due
  risposte **cambiano che cosa si costruisce**, non solo che cosa si scrive (3b §15 punto 5).
- Le **undici domande giuridiche** di §13 del piano 4, da porre in un colpo solo e non una alla
  volta quando il codice le incontra.
- Se i **9 commit non pushati** su `origin/main` vadano spinti ora o a fine piano.

## In volo

Lavoro già lanciato e non ancora concluso. **Riemetterlo è il modo tipico di duplicare lavoro e
creare conflitti sullo stesso albero.**

| Che cosa | Lanciato quando | Come si controlla | Dove atterra il risultato | Cosa NON fare finché non finisce |
|---|---|---|---|---|
| Chat «Design spec piano 3b» — risultava **in esecuzione** alle 15:07 | 28/09, prompt in `docs/handoffs/2026-09-28-spec-3b-prompt.md` | chiedere all'utente | spec 3b, **già committata** in `a9c4996` | non riemettere il prompt; non riscrivere §15 |
| Chat «Design spec piano 3c» | 28/09, prompt in `…-spec-3c-prompt.md` | chiedere all'utente | `docs/superpowers/specs/2026-09-28-piano-3c-la-preparazione-design.md`, **untracked**, ultima scrittura 14:46:25 | non committarla né sovrascriverla prima di sapere se quella chat ha finito |
| Chat «Piano 4 design spec: dati personali» — risultava **in esecuzione** alle 15:07 | 28/09, prompt in `…-spec-piano4-prompt.md` | chiedere all'utente | `docs/superpowers/specs/2026-09-28-piano-4-dati-personali-design.md`, **untracked**, ultima scrittura 15:08:03 | idem |

⚠︎ «In esecuzione» e «morta per sospensione» sono **indistinguibili dall'esterno**: l'ultima
scrittura su questo albero è delle 15:08:03, e alle 15:37 erano 29 minuti di silenzio `[verificato:
campionamento al minuto, stat sull'mtime]`. Non dedurne che abbiano finito — **chiedilo all'utente**.

## Fonti da rileggere

| Che cosa | Path assoluto | Come leggerlo | Obbligatorio prima del primo passo | Provenienza |
|---|---|---|---|---|
| Memoria di progetto (indice) | `/Users/nadiaottavi/.claude/projects/-Users-nadiaottavi-Claude-code/memory/MEMORY.md` | intero | sì | `[verificato: ls]` |
| Memoria — processo | `…/memory/processo-sdd.md` | intero | sì | `[verificato: ls]` |
| Memoria — revisione | `…/memory/review-con-subagent-esterno.md` | intero | sì | `[verificato: ls]` |
| Memoria — arresto | `…/memory/regola-arresto-finding.md` | intero | sì | `[verificato: ls]` |
| Memoria — stile gestionale | `…/memory/chessbooking-stile-gestionale.md` | intero | no | `[verificato: ls]` |
| Spec madre | `/Users/nadiaottavi/Desktop/Git/salon-scheduler/docs/superpowers/specs/2026-09-17-salon-scheduler-design.md` | revisione 5, **in inglese** | no | `[verificato: ls]` |
| Spec 3a «Il giorno» | `…/specs/2026-09-22-piano-3a-il-giorno-design.md` | revisione 20; documento fratello del 3b | no | `[verificato: ls]` |
| **Spec 3b** | `…/specs/2026-09-28-piano-3b-dove-c-e-posto-design.md` | **§15 per intero**, poi §4.5, §5.3, §8, §13 | **sì** | `[verificato: letto §8 e §15]` |
| Registro giro 1 del 3b | `…/plans/2026-09-28-piano-3b-giro-1-findings.md` | intero | **sì** | `[verificato: ls]` |
| Spec 3c | `…/specs/2026-09-28-piano-3c-la-preparazione-design.md` | §16 e appendici A–D; **a pagine**, 1515 righe | no | `[verificato: letto §16 e app. C]` |
| Spec piano 4 | `…/specs/2026-09-28-piano-4-dati-personali-design.md` | §14 e §13; **a pagine**, 2762 righe | no | `[verificato: letto §14]` |
| Piano 3a-2 | `…/plans/2026-09-28-piano-3a2-schermate.md` | testa e §revisione 4; **a pagine**, 274 KB | no | `[verificato: letto la testa]` |
| Piano 3a-1 | `…/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` | Task 9–11 e «Verifiche di fine piano»; **a pagine**, 372 KB | no | `[verificato: intestazioni]` |

⚠︎ **La memoria di progetto è indicizzata sulla working dir, non sul progetto.** Esiste **solo** lo
slug `-Users-nadiaottavi-Claude-code` `[verificato: ls -d ~/.claude/projects/*/]`. Una chat aperta
dentro `Desktop/Git/salon-scheduler` **non la carica da sola**: vanno letti per path assoluto, uno
per uno. I file sono grandi e con righe lunghissime — si leggono **a pagine** con Read
`offset`/`limit`, mai con grep a regex complesse.

## Processo di sviluppo (VINCOLANTE)

Prima di agire leggi per esteso, per path assoluto, i file elencati sotto. Sono la fonte
autorevole; la sintesi serve solo se non fossero leggibili — e in quel caso **dillo all'utente e
chiedigli di incollarne il contenuto**, non procedere sulla sola sintesi.

File che definiscono il processo (path assoluti), da leggere **interi**:

- `/Users/nadiaottavi/.claude/projects/-Users-nadiaottavi-Claude-code/memory/MEMORY.md`
- `/Users/nadiaottavi/.claude/projects/-Users-nadiaottavi-Claude-code/memory/processo-sdd.md`
- `/Users/nadiaottavi/.claude/projects/-Users-nadiaottavi-Claude-code/memory/review-con-subagent-esterno.md`

Sono **memoria personale dell'utente**: non versionata, non presente su altre macchine, e caricata
automaticamente solo se la working dir della chat nuova coincide con quella che genera lo slug
`-Users-nadiaottavi-Claude-code`. Se i file non esistono o non sono leggibili, **dillo all'utente e
chiedigli di incollarne il contenuto**: non procedere sulla sola sintesi qui sotto. Il processo non
è scritto altrove — non cercare `CLAUDE.md`, `CONTRIBUTING` o playbook di team, non ce ne sono.

1. **Sequenza obbligatoria, mai saltata né sovrapposta:**
   **brainstorming → spec → piano → implementazione → eventuale remediation.**
   Il piano si **completa** prima che si scriva una riga di codice di prodotto, anche quando le prime
   fasi sono già state verificate. Non proporre l'implementazione parziale di un piano incompleto e
   non chiedere all'utente se accorciare la sequenza.
2. **Ogni passaggio ha la sua revisione avversariale esterna prima del successivo.** Spec, piani e
   codice non si auto-revisionano: l'auto-revisione trova le incoerenze meccaniche ma è cieca sulle
   assunzioni adottate mentre si progettava. Dispatcha più subagent **in parallelo**, ciascuno con un
   mandato distinto — correttezza tecnica, completezza, assunzioni nascoste, sicurezza, casi limite —
   e l'istruzione esplicita di **demolire anziché validare**. Poi verifichi tu quali obiezioni
   reggono, scarti i falsi positivi e riferisci all'utente **sia le une sia gli altri**. Non chiedere
   il permesso di farlo: è una richiesta permanente dell'utente.
3. **Implementazione in chat fresca**: consegni all'utente un prompt self-contained e **ti fermi**.
   La chat fresca **la lancia l'utente**, non tu.
4. **Verifiche di fine lavoro**, sul diff, tutte avversariali:
   - **gate automatici** del progetto (§ *Coordinate*), con l'**output reale** incollato, mai un
     "passa";
   - **`/security-review`** sulle modifiche del branch;
   - **test-audit distinto**: i test sono significativi o tautologici? Per la logica non banale chiedi
     la tabella *mutazione → test che la uccide*, oppure `NOT CAUGHT`: è l'unica cosa che trova "il
     test passa per il motivo sbagliato".

   Ogni finding con severità, confidenza e `file:line`.
   **`/code-review` non fa parte di questo ciclo**: l'utente non lo usa. Non aggiungerlo e non
   sostituirlo al test-audit.
5. **REGOLA DI ARRESTO:** un finding blocca l'integrazione **solo** se può produrre un danno concreto
   — un dato sbagliato, denaro o una prenotazione persi, un dato personale esposto — su un percorso
   che un utente può **davvero percorrere**; e la raggiungibilità si **dimostra** sui dati e sui
   flussi veri, non si argomenta. Tutto il resto va in "limiti noti". Senza questa regola il ciclo
   review→remediation non converge.
6. **Remediation**: è un **task nuovo**, con i **test scritti prima** delle correzioni. Stesso ciclo —
   prompt → chat fresca lanciata dall'utente → ri-verifica.
7. **Standard di qualità**: se una feature entra, dev'essere di livello **top-tier**, non
   un'approssimazione fatta in casa. Prima di scrivere a mano un motore, un parser o un algoritmo, si
   integra il miglior strumento open-source disponibile; la versione propria resta al più come
   fallback. Le mezze misure vengono respinte.

Tutti i subagent e tutte le review su **Opus** (`model="opus"`), mai Sonnet.

## Vincoli d'ambiente

Su questa macchina **non esiste** `~/.claude/CLAUDE.md` `[verificato: ls]`: le preferenze dell'utente
stanno nei file di memoria elencati sotto **Processo di sviluppo**. Leggili lì, non fidarti di
parafrasi. In più, per questo lavoro:

- **Lingua.** La **chat** è in italiano. ⚠︎ **In questo progetto anche spec, piani, prompt e messaggi
  di commit sono in italiano** — la regola generale «gli artefatti in inglese» è superata dal
  17/09/2026 (memoria `convenzione-lingua`). Fa eccezione la **spec madre**
  `2026-09-17-salon-scheduler-design.md`, che è in inglese alla revisione 5. Gli **identificatori di
  codice** restano come sono nel codice.
- **Directory temporanee dei test**: ogni sessione deve averne una **propria**. Orchestratore e
  subagent di review che condividono la stessa se la azzerano a vicenda e producono failure e2e
  fantasma (`FileNotFound`/`FileExists`) che sembrano regressioni e non lo sono. Vale ogni volta che
  si parallelizzano review su un albero solo, che è il caso normale qui.
- Se il classificatore di sicurezza di **Bash** è indisponibile, Bash è bloccato ma
  Read/Edit/Write/Grep funzionano: cambia strumento invece di insistere.
- ⚠︎ **`find` su questa macchina è `bfs`** e **rifiuta i timestamp relativi**: `-newermt '-6 minutes'`
  esce in errore, e con `2>/dev/null` l'errore diventa uno **zero silenzioso** che si legge come
  «nessun file scritto». Per l'età di una scrittura si usa `stat -f '%m'` e si sottrae da `date +%s`
  `[verificato: l'errore di bfs letto con stderr visibile, 28/09 15:13]`.
- ⚠︎ **`psql` non è installato** `[verificato: command -v psql]`. Gli atti sul banco si fanno col CLI
  locale di Supabase o da Node.
- Il **cluster Postgres personale** sulla 5432 (218 banchi usa-e-getta) è di `chessbooking`, **non**
  di questo progetto: salon vive sul Supabase in Docker, porta **54322**.

## Primo passo

**Dispaccia il regime A sul 3b, e solo dopo il secondo giro di lettura.** Due atti, in quest'ordine, e
il secondo non parte prima che il primo abbia risposto.

**1 · La subagent misuratrice** — una sola, su Opus, e **non è un revisore**: non giudica il documento,
misura. Mandato: contenitore Postgres **a sé** su una porta libera, riproduzione **minima** delle
tabelle e dei trigger in questione, e la **spia che conta le esecuzioni oltre alle righe** — è lo
scarto fra i due numeri che sul 3c ha fatto comparire il reperto che non era nell'elenco di nessuno.
Le domande da portarle, come minimo:

- i **due fatti non misurati su cui L30 poggia**, oggi chiuso a lettura e non a prove: che
  `to_jsonb(x) - 'chiave_assente'` sia davvero un no-op, e che `to_jsonb(NEW)` dentro una funzione
  `before update` veda i valori attesi. ⛔ `app.touch_client_updated_at()` **non è mai stata eseguita**;
- la forma del **trigger per istruzione con la giunzione fra tabelle di transizione** di §7 e §9.2,
  **corretta a lettura e mai provata**;
- i `[proposta]` di **§13**, che un revisore in grado di misurare può chiudere.

⛔ Il banco si **distrugge** a misure finite, e ⛔ **non si usa il database del progetto**: due suite
sullo stesso banco si distruggono a vicenda.

**2 · Il secondo giro**, cinque subagent in parallelo su **Opus**, in sola lettura, con l'istruzione
esplicita di **demolire anziché validare**, coi cinque mandati che §15 del documento prescrive: le
correzioni di questo giro; la **tabella dei casi di §4.5 rifatta da zero** — quella esistente è
costruita sulla revisione 1, e D3b-11 e D3b-14 ne hanno cambiato ordinamento e motivi, ⚠︎ e una tabella
dei casi obsoleta è peggio di nessuna tabella; i documenti fratelli letti per intero **con la colonna
delle note**, citando revisione e sezione e **mai il numero di riga**; le citazioni su
`0019_annunci.sql` rifatte sul commit `86d4223`; il capitolo dei compleanni.

Criterio di completamento: hai i numeri **eseguiti** e i cinque referti, hai separato le obiezioni che
reggono dai falsi positivi applicando la **regola di arresto**, e hai riferito all'utente **le une e
gli altri**. Il giro **non** chiude il documento: §15 dichiara il criterio di arresto non soddisfatto.

**Perché questo e non il Task 9.** Il prompt del Task 9 **esiste già** ed è nelle mani dell'utente:
lanciarlo tu è vietato, e riscriverlo sarebbe lavoro doppio. Il binario che chiude cammina da sé
appena l'utente lo lancia; nel frattempo il fronte del disegno è l'unico dove tu puoi fare qualcosa.

## Entry check — esegui PRIMA di agire

```bash
DIR=/Users/nadiaottavi/Desktop/Git/salon-scheduler
git -C $DIR rev-parse HEAD
git -C $DIR branch --show-current
git -C $DIR merge-base --is-ancestor a9c4996d64665334bcfa561132d510f346f8a57d HEAD \
  && echo "storia lineare" || echo "STORIA RISCRITTA — handoff invalido"
for s in 86d4223 a9c4996 cffdfec 69f5dd5; do
  git -C $DIR merge-base --is-ancestor "$s" HEAD \
    && echo "$s OK" || echo "$s ASSENTE-O-RIBASATO"
done
git -C $DIR status --short | grep -v docs/handoffs
# commit aggiunti dopo la scrittura: atteso 0. NON usare --since='<data>': git riempie
# l'ora non specificata con l'ora CORRENTE, quindi non vede i commit dello stesso giorno.
git -C $DIR rev-list --count a9c4996d64665334bcfa561132d510f346f8a57d..HEAD
git -C $DIR log --oneline a9c4996d64665334bcfa561132d510f346f8a57d..HEAD
# il fatto su cui poggia il primo passo: il Task 9 non e' ancora stato avviato
ls $DIR/docs/handoffs/ | grep -c task9
ls $DIR/docs/superpowers/plans/ | grep '3b-giro'
# l'ultimo lavoro sul 3a-1 e' la correzione del Task 8
git -C $DIR log -1 --format='%s' a63b996
# e il Task 9 e' ancora al suo posto nel piano
grep -c '^### Task 9' $DIR/docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md
```

Atteso, una riga per comando:

- `rev-parse HEAD` → `a9c4996d64665334bcfa561132d510f346f8a57d`
- `branch --show-current` → `main`
- il controllo di antenato → `storia lineare`
- le quattro voci del ciclo → `86d4223 OK`, `a9c4996 OK`, `cffdfec OK`, `69f5dd5 OK`
- `status --short | grep -v docs/handoffs` → **esattamente** le sette righe riportate in
  *Coordinate*, né una in più né una in meno
- `rev-list --count` → `0`
- `log --oneline` → nessuna riga
- `ls $DIR/docs/handoffs/ | grep -c task9` → `1`: il prompt del Task 9 esiste già ed è atteso. Se è
  `0` qualcuno l'ha cancellato: **fermati**
- `ls $DIR/docs/superpowers/plans/ | grep '3b-giro'` → **una sola riga**,
  `2026-09-28-piano-3b-giro-1-findings.md`. Se ne compare una del secondo giro, il primo passo è già
  stato fatto da qualcun altro: **fermati e chiedi**
- `git log -1 --format='%s' a63b996` → `fix(3a-1): un riscaldamento che fallisce dia una rossa, non
  dieci saltate`
- `grep -c '^### Task 9' …piano-3a1…` → `1`

**TESTO FISSO — non riformulare:**

> Se una qualunque riga diverge da "Atteso", o se una voce risulta `ASSENTE-O-RIBASATO`, o se la
> storia risulta riscritta, o se una riga di **Stato** è contraddetta: **fermati.** Riporta la
> divergenza all'utente, non eseguire il primo passo e non proporre alternative finché non risponde.
> "Il passo non tocca il codice" non è un'eccezione.
>
> Se Bash non è disponibile, non insistere: dichiaralo, esegui ciò che Read/Grep permettono, e
> considera l'intero handoff `[da verificare]`.

## Trappole note

- **`find -newermt` con un tempo relativo** → su questa macchina `find` è `bfs` e lo rifiuta; con
  `2>/dev/null` restituisce uno zero che sembra «nessuna scrittura». Ha prodotto una misura falsa in
  questa sessione, corretta solo rieseguendo con stderr visibile. Usa `stat -f '%m'`.
- **`timeout`** non esiste su questa macchina: non usarlo negli script di sonda.
- **`$nome[...]` in zsh** è un indice di array, non testo: uno script di misura è morto così. Usa
  `${nome}`.
- **Dedurre che una chat abbia finito dal silenzio del disco** → «in esecuzione» e «morta per
  sospensione» sono indistinguibili dall'esterno. Si chiede all'utente.
- **Committare le due spec untracked** perché «sono lì da un po'» → appartengono a due chat che
  potrebbero non avere finito. Vedi *In volo*.
- **`00051_privilege_baseline.sql`** ha cinque cifre dove tutte le altre ne hanno quattro, e per
  questo si ordina **fra `0004` e `0005`**, non alla fine. Non "correggerlo" senza misurare che cosa
  succede all'ordine di applicazione.
- **Lanciare una seconda suite mentre una gira** → 110 rosse da chiave duplicata e una suite appesa.
  Il gate si esegue in serie.
