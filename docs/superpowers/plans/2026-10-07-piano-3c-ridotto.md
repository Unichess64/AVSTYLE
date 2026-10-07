# Piano 3c ridotto — La preparazione e la messa online

**Revisione 2** — 7 ottobre 2026, dopo **il giro di revisione** (un revisore avversariale su tutto, due con lenti
diverse sulle parti a rigore pieno): **14 bloccanti, tutti corretti**, e i minori corretti o annotati. Registro
nell'appendice in fondo. **Revisione 1** — 7 ottobre 2026, prima stesura (copia fuori dal repo, nella scratchpad
della chat che ha scritto il piano: `piano-rev1-prima-correzioni.md`, 07/10 ore 15:43).

> **Per chi esegue:** questo piano si esegue in una **chat fresca lanciata dall'utente**, un task alla volta, con
> l'orchestratrice che rivede fra un task e l'altro. **Non** si applicano `superpowers:subagent-driven-development` né
> `superpowers:executing-plans`: lo dice il processo di questo progetto. I passi usano le caselle `- [ ]`.
> Il prompt di ogni chat è corto (consegna ridotta §3 punto 6): il task, questo piano, i vincoli che il piano non
> contiene. Il controllo d'ingresso è `git status --short` più la suite verde.

**Obiettivo:** costruire le schermate con cui il salone si prepara — Disponibilità, Impostazioni, primo avvio — e
mettere l'app online su un progetto Supabase gratuito in regione UE e su Cloudflare Workers gratuito, con le
procedure scritte e provate che servono il giorno in cui qualcosa va storto.

**Architettura:** stessa del 3a-2. Le **letture** vanno dritte al database con la sessione dell'operatrice, sotto la
sicurezza per riga; le **scritture** passano da Server Actions con il solo JWT dell'utente, dentro `avvolgi` (C2) e
`conRitentativi` (C5). Ogni scrittura che tocca più righe è **una chiamata sola** a una funzione `security invoker`
nuova (`0022`), perché su PostgREST ogni chiamata è una transazione a sé (spec D29). Ogni decisione calcolabile
senza database vive in `src/dominio/` come logica pura. L'app gira su Cloudflare tramite l'adattatore OpenNext;
le prove da capo a fondo restano su `next start`.

**Stack:** quello del 3a-2 (Next 15.5, React 19.3, TypeScript 5.9, `@supabase/ssr` 0.12, Vitest 2.1, Playwright
1.63, axe 4.13, Node 22), più `@opennextjs/cloudflare` e `wrangler` (Task 1), CLI Supabase **2.117.0**.

**Spec:** `docs/superpowers/specs/2026-09-28-piano-3c-la-preparazione-design.md` **al commit `f31c2b4`** (revisione
6, committata così com'era dal 28/09 al passo 0 di questo piano). Si cita **per commit**: `git show
f31c2b4:docs/superpowers/specs/2026-09-28-piano-3c-la-preparazione-design.md`. Il piano argomenta da lì e chi
esegue legge le sezioni che il suo task nomina.

**Su quale codice:** `main` a **`b2daba6`** quando il piano è stato cominciato (3a-1 e 3a-2 chiusi); `f31c2b4` è il
commit dello spec, sopra. Lo spec dichiara `a63b996`: in mezzo sono chiusi tutto il 3a-1 da `0013` e tutto il 3a-2.

**Regime** (consegna ridotta, `docs/superpowers/plans/2026-10-02-consegna-ridotta.md` §3): un revisore per task;
**rigore pieno** — due revisori con lenti diverse e le sonde di mutazione misurate — solo sui Task **2**, **5** e
**7**, perché toccano grant e funzioni nuove, disattivazione, scollegamento, «Chiudi tutte le sessioni» e la
procedura «telefono perso». **Regola d'arresto:** blocca solo un reperto che fa danno reale su un percorso
raggiungibile; il resto si annota nell'appendice del task. **Il commit aspetta l'esito della revisione. Niente
push**: lo chiede l'utente.

---

## Che cosa è stato letto per scrivere questo piano

- Lo spec 3c a `f31c2b4`, **per intero** (1515 righe).
- `docs/superpowers/plans/2026-10-02-consegna-ridotta.md`, per intero.
- Il piano 3a-2: la testa (righe 1–120), la forma di un task, e le appendici «Esecuzione» e «Revisione» dei Task
  1–12 (righe 4775–5117), lette da un agente in sola lettura con citazioni di riga.
- Le migrazioni da `0001` a `0021` e `00051`, per le nove tabelle che il 3c scrive, le funzioni di scrittura, la
  guardia, le sessioni, gli annunci e i grant: lette da un agente con citazioni di riga, e i punti che il piano usa
  ricontrollati da chi scrive (`0004`, `0012`, `src/dominio/fasce.ts`, `src/dominio/tipi.ts`,
  `src/dominio/errori.ts:95-140`).
- `src/`: guscio, involucro, errori, esiti, ritentativi, Server Actions, diretta, lettura del giorno, colori del
  blocco, middleware, CSP; `tests/helpers/*`, `tests/e2e/aiuti.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`.
- Spec 3b §13 e spec piano 4 (le righe che rivendicano `0022`/`0023`/`0024` e le richieste al 3c).
- `supabase/config.toml`, le nove chiavi di spec §9.4.

## Le misure fatte per scrivere questo piano

| # | Che cosa | Come | Esito |
|---|---|---|---|
| M1 | Che cosa fa `supabase db push` con una migrazione **più bassa** di una già applicata | Postgres 17 in un contenitore a sé (`banco-push-3c`, porta 55433, **mai il database del progetto**), cartella di migrazioni giocattolo nella scratchpad, CLI **2.117.0** del repo, 07/10 13:30–13:32; contenitore rimosso | Push di `0021`, `0023`, `0024`: applicate. Aggiunta `0022`, nuovo push: **esce 1** con `LegacyDbPushMissingRemoteError` — *«Found local migration files to be inserted before the last migration on remote database»*, suggerimento `--include-all`. Con `--include-all`: **applicata dopo `0023` e `0024`**, mentre `db reset` in locale la applica prima. Da qui **D3c-10** |
| M2 | La tavolozza chiara | script Python nella scratchpad (luminanza WCAG, ΔE76 in CIELAB, le tre simulazioni di Machado a severità 1) | I numeri sono nel Task 3, prova per prova. La coppia scelta dall'utente: testo d'inchiostro **≥ 9,8:1** su ogni riempimento, ΔE minimo **28,4**, minimo sotto le tre simulazioni **22,2** |
| M3 | Hosting gratuito per uso commerciale | ricerca sulle pagine ufficiali, 07/10, con citazione | **Vercel Hobby escluso**: *«Hobby teams are restricted to non-commercial personal use only»* (vercel.com/docs/limits/fair-use-guidelines), e il DPA è solo Enterprise. Cloudflare Workers Free: nessun divieto commerciale trovato, DPA che vale per il self-serve (cloudflare.com/cloudflare-customer-dpa), **10 ms di CPU per richiesta**. ⚠︎ La dimensione massima del Worker gratuito è data in due modi diversi da due pagine ufficiali (3 MiB e 64 MiB): **[da misurare]** al Task 1. Supabase Free: pausa dopo **7 giorni** di bassa attività, ripristinabile fino a un anno con i dati; **nessuna copia automatica** (*«Automatic backups Not included in free»*); DPA che fa parte dei termini |

⚠︎ **M1 ha usato `psql` dentro il contenitore del banco** per rileggere `supabase_migrations.schema_migrations`, come
superutente su un database senza sicurezza per riga. Il divieto del progetto riguarda il database del progetto e le
letture sotto RLS; lo si dichiara comunque. La stessa cosa la dice `supabase migration list`, che è la lettura
citata sopra.

---

## Che cosa questo piano non può sbagliare

**P1 — I conflitti non hanno orizzonte.** L'elenco degli appuntamenti da spostare guarda **ogni data futura con
appuntamenti**, non 28 giorni. Un appuntamento al giorno 29 non elencato è la cliente che arriva a un salone senza la
sua operatrice: il danno per cui spec §7.6 esiste (spec 3c §3.4). Prova: un appuntamento a **oggi + 40 giorni** che
compare (Task 3 e Task 4).

**P2 — L'elenco delle differenze ha una riga per OGNI giorno che cambia, con il verso.** Sullo scenario di spec 3c
§3.2 sono **cinque righe**, e mercoledì 7 ne porta **due segni** (`−` pomeriggio, `+` mattina). Tre giri dello spec
hanno perso lo stesso difetto dentro il proprio rimedio: la prova asserisce il **numero** di righe, non la presenza
di una.

**P3 — Una scrittura che tocca più righe è UNA chiamata.** Le fasce di un giorno della settimana tipo e l'ordine delle
operatrici si scrivono con una funzione sola (`scrivi_giorno_settimana`, `riordina_operatrici`). Due chiamate
PostgREST sono due transazioni: un `40P01` o una rete persa fra le due lasciano un giorno **vuoto** — «non lavora»
ogni martedì, in silenzio — o due operatrici con lo stesso `sort_order`.

**P4 — Gli errori delle schermate del 3c si traducono per NOME DEL VINCOLO, con frasi del 3c.** Mai la frase del 3a:
`23503` su `appointment_service_id_fkey` riceve dal 3a *«Il servizio o l'operatrice non esiste più»*
(`src/dominio/errori.ts:102`), che per «cancella un servizio prenotato» dice il **contrario** del vero.

**P5 — Nessuna scrittura del 3c annuncia, e nessuna tocca `app.annuncia_giorni()`.** §6 è in fase 2. Le scritture
della disponibilità arrivano agli altri telefoni con le riletture del 3a-2: ritorno in primo piano, mezzanotte di
Perugia, ogni 60 s (`src/cliente/diretta.ts:274-311`).

**P6 — Niente `service_role`, e niente segreti nel Worker.** L'app online ha solo l'URL del progetto e la chiave
pubblica, cotte nel build. Nessuna variabile segreta su Cloudflare. Una prova statica lo presidia su `src/`, sulla
configurazione di Wrangler e sui file d'ambiente d'esempio (Task 1).

**P7 — Ogni funzione nuova nasce eseguibile da `anon`.** `revoke execute … from public, anon` su ognuna, e una prova
sul catalogo che **elenca** le funzioni `public` eseguibili da `anon` contro un elenco ammesso (Task 2). È la stessa
lettura che §9.6 D10 rifà sul progetto online.

---

## Vincoli globali

- **Italiano** ovunque: nomi di file, funzioni, tipi, prove, frasi, commenti, messaggi di commit. Restano inglesi solo
  gli identificatori congelati dalle migrazioni del piano 1 (`weekly_availability`, `start_boundary`, …).
- **Una migrazione sola: `supabase/migrations/0022_preparazione.sql`** (D3c-10). Nome a **cifre sole**: il CLI salta
  in silenzio un prefisso con una lettera (`0022a_`), stampa una riga, ed esce 0. Il piano 4 minimo, scritto in
  parallelo, usa `0024`: **non toccarlo**. Se servisse una seconda migrazione del 3c, si chiama `00221_nome.sql`.
- ⛔ **Mai `psql`** sul database del progetto: sotto la sicurezza per riga legge zero righe in silenzio. Per il
  database, `pg` da Node (`tests/helpers/db.ts`).
- ⛔ **Due suite sullo stesso database danno rosse false e una suite appesa.** `npm test` e `npm run e2e` **mai
  insieme**, e mai mentre un'altra chat usa il Supabase locale: prima di lanciarli si chiede all'utente.
- **Il gate**, in serie, e l'esito letto senza pipe (in zsh `PIPESTATUS` è vuoto):
  ```bash
  npx supabase db reset >/tmp/gate-reset.txt 2>&1; echo "reset $?"; grep -c "Skipping migration" /tmp/gate-reset.txt
  npm test >/tmp/gate-vitest.txt 2>&1; echo "vitest $?"; tail -5 /tmp/gate-vitest.txt
  npm run test:fuso >/tmp/gate-fuso.txt 2>&1; echo "fuso $?"; tail -5 /tmp/gate-fuso.txt
  npx tsc --noEmit >/tmp/gate-tsc.txt 2>&1; echo "tsc $?"
  npm run build >/tmp/gate-build.txt 2>&1; echo "build $?"
  npm run e2e >/tmp/gate-e2e.txt 2>&1; echo "e2e $?"; tail -8 /tmp/gate-e2e.txt
  ```
  Ogni riga deve stampare `0`, e la riga dello `Skipping` deve stampare **`0`**. Il gate di partenza al 07/10:
  **1122 prove Vitest su 71 file**, `test:fuso` **613**, e2e **54** (27 prove × 375 e 430 punti).
- **Prove prima del codice**, viste rosse col messaggio atteso. Un import non risolto dà `1 file failed, 0 tests`, non
  N rosse: si scrive il numero vero osservato.
- **Dati non degeneri** in ogni prova: due operatrici, due date, due servizi, pause diverse da zero. Accanto a ogni
  prova che asserisce un **vuoto**, una prova **positiva** sulla stessa via.
- **Sonde di mutazione** su ogni task: tabella `# | mutazione | prova che deve arrossire | rosse misurate`. Il file si
  ripristina **da una copia fatta prima** (`cp file /tmp/…`), mai con `git checkout --`, che prima del commit cancella.
  Una sonda che dà zero rosse non si cancella: si **aggiunge la prova mancante**.
- **Le grant di Supabase.** `anon` e `authenticated` ricevono per difetto `truncate` e `maintain` su ogni tabella
  nuova ed `EXECUTE` su ogni funzione nuova: la migrazione porta il **revoke**, non il grant.
- **Le mutazioni sulle migrazioni.** Si muta **l'ultima migrazione che ridefinisce l'oggetto**: mutare una
  migrazione superata lascia la suite verde e fabbrica un reperto falso. Ripristinare il file non ripristina il
  database: **dopo il ripristino serve `db reset`**.
- **Una mutazione che rompe la preparazione dà prove SALTATE, non rosse**: si restringe al ramo della prova bersaglio.
- **`supabase stop`/`start` non è un avvio a freddo** (il volume di backup ripristina il database): si usa `db reset`.
- **L'e2e** (lezioni del Task 12 del 3a-2): `finished()` non si risolve sulle risposte RSC in streaming; una promessa
  restituita da una funzione `async` viene aspettata da chi la chiama; axe si lancia **dopo** la fine delle
  animazioni; la pulizia ritenta il `truncate` su `40P01` (`pulisci()` lo fa già); **ogni attesa che il ripiego dei
  60 s può soddisfare ha un limite esplicito sotto i 60 s**, o la prova passa per la ragione sbagliata.
- **L'iPhone vero** si prova in `https`, con un tunnel lanciato dall'utente: su `http` di rete locale nessuna
  scrittura parte (`crypto.randomUUID` non esiste fuori da un contesto sicuro). Online su `*.workers.dev` è `https`.
- **Nessun dato personale in un URL** (`tests/dominio/niente-dati-negli-url.test.ts`, scritto per permessi): le
  letture delle clienti passano in POST o per una funzione `rpc`. `public.conflitti` riceve le terne nel corpo.
- **Nessuno stile in linea** (`niente-stili-in-linea.test.ts`): i colori vanno in attributi SVG o in classi.
- **Git:** file uno per uno, `git add` **nello stesso comando** del commit, identità con `-c`:
  `git add <file> && git -c user.name="Nadia Ottavi" -c user.email="info@unichess.it" commit -F <file-messaggio>`.
  Niente `push`, `stash`, `checkout`, cambi di ramo. Controllare `git show --stat HEAD` dopo: se il commit porta file
  non propri, va detto subito.
- ⛔ **Credenziali mai in chat né nel repo.** La password del database, i token di `supabase login` e `wrangler
  login`, le passphrase delle operatrici: le digita l'utente nel **proprio** terminale o nella dashboard. La chat legge
  l'esito con lo strumento del terminale, non la password.

---

## Le decisioni dell'utente del 7 ottobre 2026

Riportate **alla lettera**, con la domanda accanto: sono l'unica prova di sé stesse (lezione dello spec 3c, testata).
Lo spec usa D3c-1…D3c-9; queste continuano la numerazione.

| # | Domanda posta (riassunta) | Risposta, alla lettera | Che cosa decide |
|---|---|---|---|
| **D3c-10** | Numero della migrazione: con `0023` online, la `0022` del 3b in fase 2 verrebbe rifiutata da `db push` e, forzata, applicata in un ordine diverso da quello locale (M1) | «(a) 3c prende 0022» | Il 3c usa **`0022`**; il piano 4 minimo resta `0024`; il 3b in fase 2 prende `0025` o oltre |
| **D3c-11** | Colori sotto D3c-9 (riempimenti chiari, bordo d'inchiostro): tre coppie misurate | «Rosa + albicocca» | Vera **`#F3A4BA`**, Annalisa `#FFFFFF` (invariato), Alessandra **`#FFD8B0`** |
| **D3c-12** | Piano Supabase: il gratuito non fa copie e si sospende dopo una settimana di inattività; il Pro costa circa 25 $ al mese | «Gratuito» | Progetto **Free**. Ne seguono E3 (la rinuncia firmata), E4 (la sospensione) e il Task 7 (la copia fatta a mano e il ripristino provato) |
| **D3c-13** | Che cosa esiste già per la messa online; poi: quale hosting gratuito, e quale indirizzo | «cerca una soluzione gratis»; poi «Cloudflare gratuito»; poi «Indirizzo gratuito dell'hosting» | Niente esiste ancora. Hosting **Cloudflare Workers Free**, indirizzo **`<nome>.<account>.workers.dev`**. Vercel è escluso (M3) |
| **D3c-14** | Tetto delle date di un'assenza su più giorni e di una chiusura | «60 giorni» | **60 giorni, estremi compresi** (spec 3c §13.1, che proponeva 120) |
| **D3c-15** | Doppioni da una risposta persa (due «Unghie», due «Giulia») | «Niente vincolo» | Nessuna unicità sui nomi; dopo una risposta persa la schermata **rilegge e mostra** (spec 3c §7.5), e il doppione si cancella a mano. Spec 3c §13.4 chiuso |
| **D3c-16** | Sulla propria riga, disattivarsi o scollegarsi | «Sì, con conferma» | I due pulsanti ci sono anche sulla propria riga, con una conferma che dice che si esce subito. Spec 3c §4.2 e §13.5: **rovesciati** |
| **D3c-17** | La voce «Fuori orario» che rifà l'elenco su richiesta | «No, fase 2» | Non si costruisce. Spec 3c §13.9 |
| **D3c-18** | Minimo della password sul progetto online (raccomandato 16) | «8 caratteri» | `minimum_password_length = 8` in §9.4 C1. Spec 3c §13.6 |
| **D3c-19** | Accorciare `jwt_expiry` | «Lascio 1 ora» | 3600 s. Un telefono rubato, dopo la procedura, riceve **date** e nessun dato fino a un'ora. Spec 3c §13.7 |
| **D3c-20** | Togliere ad `authenticated` la cancellazione su `salon_settings` e su `operator`, che l'app non usa | «Non togliere niente» | Nessun revoke. ⚠︎ Il limite si allarga e va dichiarato: chi ha un telefono può **cancellare la riga di `salon_settings`**, e **l'agenda non si apre più** (`leggiGiorno` la legge con `.single()`) finché qualcuno non la reinserisce dalla dashboard. Va in §8.4 della procedura (Task 7), con il rimedio Spec 3c §13.20 |
| **D3c-21** | Due colleghe sullo stesso giorno d'eccezione a minuti di distanza: l'ultima vince | «Sì, l'ultima vince» | Niente `p_attesi` su `write_exception_day`. Il concorrente esatto dà `23505` e ha la sua frase. Spec 3c §13.3 |
| **D3c-22** | Come si verifica l'identità di chi chiede i propri dati | «Di persona, in salone» | Procedura di spec 3c §9.14 passo 1. Spec 3c §13.29, prima metà |
| **D3c-23** | A che punto sono le domande al consulente privacy e l'informativa | «informativa al banco scritta a te non serve per andare avanti» | L'informativa **è scritta ed esposta al banco**: Z1b si considera soddisfatta su dichiarazione dell'utente e non ferma il piano. Le domande 2 e 4 di spec §14 riguardano compleanni e raccolta del 3b, **che nella consegna 1 non c'è** (in `src/` nessun campo di nascita: `grep -rn birth src` dà solo un commento) |
| **D3c-24** | Dove stanno credenziali della dashboard, passphrase e codici del secondo fattore | «Solo carta in cassaforte» | Nessun gestore di password digitale: tutto stampato e chiuso in salone. Spec 3c §13.17 e §13.21. Conseguenza: le passphrase si **ricopiano a mano**, e il minimo di 8 (D3c-18) è coerente con questo |

---

## Le decisioni prese da chi scrive il piano

Non sono dell'utente; sono dichiarate con il loro costo, e la revisione le può contestare.

| # | Decisione | Perché | Costo se sbagliata |
|---|---|---|---|
| **O1** | `write_exception_days` **resta a ciclo** (spec 3c §6.2 punto 1 e §13.16 non si fanno) | La forma a insiemi serviva a non produrre 600 righe di `annuncio` (spec appendice D). Senza §6 non c'è nessun trigger su `exception_day`, e il ciclo su 60 giorni sono 120 istruzioni in una transazione sola | In fase 2, **§6 deve rifarla prima** di attaccare i trigger: lo dice la tabella «Che cosa cade con §6» |
| **O2** | Tre funzioni nuove in `0022`, tutte `security invoker`: `conflitti`, `scrivi_giorno_settimana`, `riordina_operatrici` | P3; e `conflitti` è la forma dello spec (§3.5) | Tre funzioni da presidiare con P7 |
| **O3** | La tavolozza è **chiusa**: sette tinte chiare. Il criterio: testo d'inchiostro **≥ 7:1** sul riempimento; fra le operatrici **attive**, ΔE76 **≥ 15** a vista normale e **≥ 10** sotto ciascuna delle tre simulazioni | D3c-9 vuole riempimenti chiari; 7:1 è il gradino AAA e tiene fuori i quasi-neri; le soglie stanno sotto la coppia scelta (28,4 / 22,2) con margine | Una tinta rifiutata accanto a una collega (il giallo accanto all'albicocca: 4,85 sotto **tritanopia**; 20,4 sotto deuteranopia) si spiega a schermo |
| **O4** | Nessun `check` di database sul colore (spec 3c §13.12) | La tavolozza è chiusa nella Server Action; un `check` romperebbe `tests/schema/chiusura-sessioni.test.ts`, che scrive `#123456` | Un comando diretto può scrivere un colore fuori tavolozza: il disegno del blocco lo tratta comunque (`coloriDelBlocco`, bordo dal contrasto) |
| **O5** | Il tetto di 60 giorni è un `check` su `salon_closure` e una validazione in TypeScript per l'intervallo d'eccezione | `write_exception_days` è del piano 1 e O1 non la tocca | Un comando diretto può scrivere un'assenza di 400 giorni: solo dati del salone, e chi ha un telefono può già fare di peggio (§8.4) |
| **O6** | Il contrassegno di spec §9.11 non si costruisce (L3c-4, §13.11) | Nessuno lo costruisce, e il piano 4 lo prende per la pastiglia | — |
| **O7** | Il secondo fattore sulle tre operatrici non si accende (spec 3c §13.22) | È funzione del piano Pro, e D3c-12 sceglie il gratuito | — |
| **O8** | **Copia fatta a mano ogni settimana e ripristino provato** (Task 7) | D3c-12: senza copie automatiche e senza D4-6 nella consegna 1, l'unica copia è quella che qualcuno fa. Spec 3c §9.12 passo 9 e §13.27 restano aperti finché il ripristino non è provato su un progetto usa-e-getta | Se la copia non si fa, E3 dice il vero: i dati non tornano |
| **O9** | L'e2e resta su `next start` in CI; il Worker si prova con una passata dell'e2e sull'anteprima di Cloudflare (Task 1) e con le prove a mano online (Task 8) | Un secondo runtime in CI raddoppia il tempo e non prova i 10 ms, che si misurano solo online | Una differenza fra Node e workerd che l'e2e non tocca arriva in produzione: la cerca la sessione 4 |
| **O10** | Si dispiega **solo a mano** dal Mac (`opennextjs-cloudflare deploy`): nessun collegamento al repo, nessun dispiegamento automatico | §9.5 B6: chi promuove ha un nome. Il repo è pubblico | Chi dispiega deve avere `wrangler login` fatto: è scritto nella procedura |
| **O11** | `no_messages` e Z1d escono (spec 3c §13.30) | Gli auguri sono del 3b | — |
| **O12** | Spec §12.8 si accetta com'è (spec 3c §13.23) | La regola «niente voci che non siano appuntamenti» è dell'utente (spec 3a); la trappola di spec 3c §3.2 la rende visibile l'elenco delle differenze (P2) | — |

---

## Che cosa cade con §6, voce per voce

| Voce dello spec | Cade? | Che cosa resta, e perché |
|---|---|---|
| §6.1–§6.3 trigger estesi su `exception_day`, `exception_range`, `weekly_availability`, `salon_closure`, `operator` | **Cade** | Nessun trigger nuovo. `app.annuncia_giorni()` resta com'è in `0019` (P5) |
| §6.2 punto 1, `write_exception_days` a insiemi (§13.16) | **Cade** (O1) | ⚠︎ Restano **le prove che le mancano** (spec 3c §6.2: zero chiamanti, una prova sola): il 3c è il suo primo chiamante. Task 2 |
| §6.3 ramo del vuoto su `salon_closure` (`23514` di `annuncio_giorni_non_vuoto`) | **Cade** | Senza trigger la chiusura d'agosto non scrive in `annuncio` |
| §6.3 riga `{NULL}` del trigger su `exception_range` in cascata | **Cade** | Resta un **avviso** per la fase 2 nella tabella delle divergenze |
| §6.4 il percorso che scrive senza passare dall'app | **Cade** | Era il motivo per mettere l'annuncio nel database; senza annuncio non c'è niente da sorvegliare. Il percorso resta (un `PATCH` diretto da un telefono autenticato) e scrive comunque sotto la sicurezza per riga |
| §10.2 «l'espansione del giorno della settimana dentro l'orizzonte», «l'ordine fra cascate e trigger», «nessun `giorni[1] is null`» | **Cadono** | Tutte e tre presuppongono i trigger di §6.2 |
| §6.5 l'orizzonte in SQL (§13.2) | **Cade** | `ORIZZONTE_GIORNI = 28` resta solo TypeScript. Il conflitto (P1) **non ha orizzonte** |
| §6.6 la pulizia di `annuncio` con tre scrittori (§13.25) | **Cade** | Gli scrittori restano due nella consegna 1 (visite, e il 3b in fase 2) e la pulizia resta in `app.chiudi_invio` |
| §10.2 «una riga per istruzione», trigger estesi, `update operator set color` senza annuncio | **Cade** | Resta la prova di P5: **nessuna** scrittura del 3c aggiunge righe in `annuncio` (Task 2) |
| §10.3 «l'annuncio per via» | **Cade** | Al suo posto, prova e2e: un cambio di disponibilità sul telefono A compare sul telefono B **al ritorno in primo piano**, entro un limite sotto i 60 s (Task 4) |
| §11 «la ricarica rilegge `operator`» (§13.26) | **Chiusa, non serve chiederla** | Verificato: `leggiGiorno` (`src/server/lettura-giorno.ts:75`) rilegge `operator` a ogni giro, e `router.refresh()` rifà la pagina. Un'operatrice nuova compare alla rilettura successiva |
| §13.8 «niente funzione di scrittura per l'annuncio» | Chiusa | Le funzioni di O2 non annunciano |
| §13.10 il catalogo dentro «disponibilità e chiusure» | **Cade** | Niente si annuncia |
| §13.18 l'orario del salone annunciato | **Cade** | Non si annuncia; la griglia si allarga comunque su ciò che c'è (spec §9.1) |
| §9.10 **H7** «il canale in diretta, tre messaggi per operazione» | **Cambia** | Diventa «il cambio compare sull'altro telefono alla rilettura» (Task 8, sessione 4) |
| §9.10 H2-bis «il ramo del vuoto di §6.3 regge» | **Cade** | — |
| §7.2 la riga `23514` di `annuncio_giorni_non_vuoto` | **Cade** | Le altre righe di §7.2 restano |
| §9.6 **D11–D12** la pubblicazione `supabase_realtime` | **Resta** | `annuncio` esiste da `0019` e porta le visite |
| §8.4 punto 7, il telefono rubato «riceve gli annunci» | **Resta** | Per le visite, fino a un'ora (D3c-19) |

---

## Struttura dei file

| File | Task | Responsabilità |
|---|---|---|
| `open-next.config.ts`, `wrangler.jsonc` | 1 | L'adattatore Cloudflare: nome del Worker, `nodejs_compat`, niente variabili segrete, `preview_urls: false` |
| `package.json` | 1 | script `cf:build`, `cf:anteprima`, `cf:dispiega` |
| `.gitignore` | 1 | `.env*.local`, `.open-next/`, `.wrangler/` |
| `tests/app/contorno.test.ts` | 1 | P6 allargata: `src/`, `wrangler.jsonc`, `open-next.config.ts`, `.env.local.esempio` |
| `docs/procedure/cloudflare-fattibilita.md` | 1 | le misure del Worker, con data |
| `supabase/migrations/0022_preparazione.sql` | 2 | colori; `conflitti`; `scrivi_giorno_settimana`; `riordina_operatrici`; tetto su `salon_closure` |
| `tests/schema/preparazione.test.ts` | 2 | le funzioni nuove, il tetto, i colori |
| `tests/schema/eccezioni-intervallo.test.ts` | 2 | le prove che a `write_exception_days` mancano |
| `tests/schema/funzioni-anon.test.ts` | 2 | P7 |
| `src/dominio/tavolozza.ts` | 3 | le sette tinte e il criterio di O3 |
| `src/dominio/differenze.ts` | 3 | l'elenco delle differenze (P2) e le terne dei conflitti (P1) |
| `src/dominio/validazione-disponibilita.ts` | 3 | spec 3c §3.8: esistenza prima dell'ordine, tetto, confini |
| `src/dominio/primo-avvio.ts` | 3 | le tre condizioni di spec 3c §5.1 e il passo da cui riprendere |
| `src/dominio/errori-preparazione.ts` | 3 | P4: le frasi del 3c per codice e vincolo |
| `src/server/scrittura-preparazione.ts` | 4 | i corpi delle Server Actions del 3c, il motore comune (`scrivi`) |
| `src/server/azioni-preparazione.ts` | 4 | il guscio `'use server'`, una riga per azione |
| `src/server/lettura-preparazione.ts` | 4 | le letture di Disponibilità, Impostazioni, primo avvio |
| `src/app/(salone)/disponibilita/page.tsx` e `src/cliente/disponibilita/*` | 4 | la schermata |
| `src/app/(salone)/impostazioni/page.tsx`, `.../impostazioni/operatrici/page.tsx` e `src/cliente/impostazioni/operatrici.tsx` | 5 | la sezione Operatrici |
| `.../impostazioni/catalogo/page.tsx`, `.../impostazioni/salone/page.tsx`, `src/cliente/impostazioni/{catalogo,salone}.tsx` | 6 | catalogo, orario, chiusure |
| `src/app/(salone)/primo-avvio/page.tsx`, `src/cliente/primo-avvio.tsx` | 6 | il primo avvio |
| `tests/e2e/disponibilita.spec.ts`, `operatrici.spec.ts`, `primo-avvio.spec.ts` | 4, 5, 6 | prova 6, prova 8, le sessioni |
| `scripts/copia.mjs`, `scripts/ripristina.mjs` | 7 | la copia settimanale e il ripristino |
| `tests/schema/telefono-perso.test.ts` | 7 | la procedura di spec 3c §8.3 eseguita sul database locale |
| `docs/procedure/{telefono-perso,richiesta-dati,copia-e-ripristino,dispiegamento,apertura}.md` | 7, 8 | le procedure, scritte per chi le esegue |

`src/cliente/agenda-colonne.tsx` **non si tocca**: è l'unico file che il 3b modificherà (consegna ridotta §2).

## L'ordine dei task, e perché

1. **Cloudflare, prima di tutto.** È l'unica scelta che può tornare indietro: se l'agenda supera i 10 ms di CPU, si
   torna da Netlify (con i suoi server negli USA, che l'utente deve riaccettare) **prima** di aver costruito il resto.
   Usa un progetto Supabase usa-e-getta, che serve anche al Task 7.
2. **Il database**, perché ogni schermata lo chiama e le sue grant sono a rigore pieno.
3. **La logica pura**, perché le schermate la consumano e `test:fuso` la esercita su un fuso americano.
4. **Disponibilità**, la schermata più pericolosa (la trappola di spec 3c §3.2), e il motore comune delle scritture.
5. **Operatrici**, a rigore pieno.
6. **Catalogo, salone e primo avvio**: il primo avvio riusa gli editor di 4, 5 e 6.
7. **Le procedure** e il ripristino provato, a rigore pieno sul «telefono perso».
8. **La messa online**, in sessioni con l'utente.

**Stima: 8 chat** contro le circa 6 della consegna ridotta. Le due in più sono il Task 1 (nato da D3c-13) e il Task 7
(nato da D3c-12). Con 1–2 task al giorno la consegna cade **fra il 22 e il 27 ottobre**. Se serve rientrare nei 6,
l'orchestratrice propone di passare alla fase 2: **la modifica e la cancellazione** di categorie e servizi (il primo
avvio crea; il resto si corregge dall'editor SQL), e **il riordino** delle operatrici. Si chiede all'utente prima del
Task 6, non adesso.

---

## Task 1 — Cloudflare: l'adattatore e la prova di fattibilità

**Perché è il primo.** D3c-13 sceglie Cloudflare Workers Free, e M3 lascia due incognite che solo un dispiegamento
vero chiude: **i 10 ms di CPU per richiesta** (un `Worker exceeded CPU time limit`, errore 1102, è una pagina
rotta) e **la dimensione del Worker** (due pagine ufficiali dicono 3 MiB e 64 MiB). Se il Task 1 esce rosso, ci si
ferma e si porta all'utente il ripiego (Netlify gratuito, server negli USA): **prima** di costruire le schermate.

**Chi c'è:** la chat, e l'utente per tre azioni che solo lei può fare (account Cloudflare, progetto Supabase
usa-e-getta, i due `login`). Spec 3c §9.5, letta con D3c-13: dove dice Vercel, qui si legge Cloudflare.

**Files:**
- Create: `open-next.config.ts`, `wrangler.jsonc`, `docs/procedure/cloudflare-fattibilita.md`
- Create: `scripts/cf-build.mjs` (il build per Cloudflare con le variabili di un file **suo**)
- Modify: `package.json` (dipendenze e tre script), `.gitignore`, `tests/app/contorno.test.ts`,
  `playwright.config.ts`, `tests/e2e/aiuti.ts:195` e `tests/e2e/preparazione.ts:50` (tutti e tre fissano
  `http://localhost:3000`: con la sola configurazione cambiata, l'accesso iniziale andrebbe ancora su :3000)

**Interfaces:**
- Consuma: l'app del 3a-2 così com'è; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (lette da
  `src/server/supabase.ts:13-14`, `src/middleware.ts:27-28`, `src/cliente/diretta.ts:221`, `src/server/csp.ts:27`).
- Produce: gli script `npm run cf:build`, `npm run cf:anteprima`, `npm run cf:dispiega`; la variabile `E2E_URL`
  (se c'è: niente `webServer`, e `E2E_URL` al posto di `http://localhost:3000` nella configurazione, in
  `aiuti.ts` e in `preparazione.ts`); il file **`.env.cloudflare`** (fuori dal repo) come unica sede dei valori del
  progetto ospitato; il documento delle misure, che i Task 7 e 8 consumano.

⚠︎ **Perché un file suo e non `.env.production.local`** (revisione, B3). Next carica `.env.production.local` in
**ogni** `next build`, compreso quello che il `webServer` di Playwright lancia: lasciato sul Mac dopo un
dispiegamento, farebbe girare l'e2e — anche quello del 3b in fase 2 — **contro il progetto vero**. Quindi:
`scripts/cf-build.mjs` legge `.env.cloudflare` (in `.gitignore`), rifiuta di partire se manca o se esiste un
`.env.production.local`, e lancia `opennextjs-cloudflare build` con le due `NEXT_PUBLIC_*` **solo nell'ambiente
di quel processo** (che in Next prevale sui file). Il gate controlla `test ! -e .env.production.local`.

- [ ] **Passo 1: la prova statica di P6, prima del codice.** In `tests/app/contorno.test.ts`, accanto alla prova
  esistente `'non nomina mai service_role in nessun file di configurazione'` (righe 38-43), che legge solo
  `next.config.ts`, `package.json` e `.github/workflows/ci.yml`:

```ts
// `readFileSync` è già importato in testa al file (contorno.test.ts:2): si aggiungono solo gli altri.
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

function fileSotto(cartella: string): string[] {
  return readdirSync(cartella).flatMap((nome) => {
    const percorso = join(cartella, nome)
    return statSync(percorso).isDirectory() ? fileSotto(percorso) : [percorso]
  })
}

// Le righe di commento possono NOMINARE il divieto (src/server/supabase.ts:7 lo fa):
// si guarda il codice, non la prosa.
function senzaCommenti(testo: string): string {
  return testo
    .split('\n')
    .filter((r) => !/^\s*(\/\/|\*|\/\*)/.test(r))
    .join('\n')
}

describe('P6 — nessuna chiave di servizio e nessun segreto nel Worker', () => {
  const SORGENTI = [
    ...fileSotto('src').filter((f) => /\.(ts|tsx)$/.test(f)),
    'wrangler.jsonc',
    'open-next.config.ts',
    '.env.local.esempio',
  ]

  it('i file da guardare esistono tutti', () => {
    for (const f of SORGENTI) expect(existsSync(f), f).toBe(true)
  })

  it('nessun sorgente nomina service_role fuori da un commento', () => {
    for (const f of SORGENTI.filter((x) => existsSync(x))) {
      expect(senzaCommenti(readFileSync(f, 'utf8')), f).not.toMatch(/service_?role/i)
    }
  })

  it('la configurazione del Worker non dichiara variabili né segreti', () => {
    const conf = readFileSync('wrangler.jsonc', 'utf8')
    expect(conf).not.toMatch(/"vars"\s*:/)
    expect(conf).not.toMatch(/"secrets?"\s*:/)
    expect(conf).toMatch(/"preview_urls"\s*:\s*false/)
  })

  it('nessun .env.production.local sul disco: il build di Node non deve vedere il progetto ospitato', () => {
    expect(existsSync('.env.production.local')).toBe(false)
  })
})
```

- [ ] **Passo 2: vederla rossa.** `npx vitest run tests/app/contorno.test.ts`. Atteso: **rosse** «i file da guardare
  esistono tutti» (`wrangler.jsonc` non esiste) e «la configurazione del Worker…» (`ENOENT`). La seconda e la quarta
  devono essere **verdi** già adesso: se la seconda è rossa, c'è un `service_role` vero in `src/` e ci si ferma.
  Scrivere il numero vero.

- [ ] **Passo 3: l'adattatore.** `npm install --save-dev @opennextjs/cloudflare wrangler`, versioni **esatte**
  annotate nel documento delle misure. Poi leggere la guida di installazione di `@opennextjs/cloudflare` **alla
  versione installata** (`node_modules/@opennextjs/cloudflare/README.md`, o la pagina opennext.js.org/cloudflare) e
  confrontarla con i due file qui sotto: dove la guida dice altro, vince la guida e lo si annota.

`open-next.config.ts`:
```ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Nessuna cache incrementale: ogni pagina dell'app è dinamica (force-dynamic nel
// layout radice) e porta dati delle clienti, che non vanno conservati da nessuna parte.
export default defineCloudflareConfig({})
```

`wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "avstyle-agenda",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-10-01",
  // nodejs_compat: @supabase/ssr e Next usano moduli di Node.
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  // L'indirizzo gratuito (D3c-13). Le anteprime per versione si spengono: un
  // indirizzo in più che parla al database vero è ciò che spec 3c §9.5 B5 vieta.
  "workers_dev": true,
  "preview_urls": false,
  "observability": { "enabled": true }
  // NIENTE "vars", niente segreti (P6): l'app ha solo URL e chiave pubblica, cotti nel build.
}
```

`package.json`, negli `scripts`:
```json
"cf:build": "opennextjs-cloudflare build",
"cf:anteprima": "opennextjs-cloudflare preview",
"cf:dispiega": "opennextjs-cloudflare deploy"
```

`package.json`: `"cf:build": "node scripts/cf-build.mjs"` (al posto della riga sopra).

`.gitignore`, in coda: `.env*.local`, `.env.cloudflare`, `.open-next/`, `.wrangler/`.

`playwright.config.ts`, `tests/e2e/aiuti.ts:195`, `tests/e2e/preparazione.ts:50`: `const BASE =
process.env.E2E_URL ?? 'http://localhost:3000'` al posto della stringa fissa; con `E2E_URL` definita, **nessun**
`webServer`. Senza la variabile, tutto come oggi.

- [ ] **Passo 4: il build per Cloudflare, contro il Supabase locale.** Creare `.env.cloudflare` con i due valori
  locali **di `.env.local`** (in `.env.local.esempio` la chiave è un segnaposto; sono le chiavi demo di
  `supabase start`, non segreti). Poi:
  ```bash
  npm run cf:build >/tmp/cf-build.txt 2>&1; echo "cf:build $?"; tail -20 /tmp/cf-build.txt
  npx wrangler deploy --dry-run --outdir /tmp/cf-misura >/tmp/cf-dry.txt 2>&1; echo "dry $?"; grep -i "upload" /tmp/cf-dry.txt
  ```
  Si trascrive **«Total Upload: … KiB / gzip: … KiB»**. ⚠︎ Se il gzip supera **3 MiB**, non è ancora un rosso (M3:
  le fonti si contraddicono), ma lo si scrive in grassetto: il dispiegamento del Passo 7 è la misura.

- [ ] **Passo 5: l'e2e sull'anteprima di Cloudflare.** Con il Supabase locale acceso e **nessun'altra suite in
  corsa** (chiedere all'utente):
  ```bash
  npm run cf:anteprima >/tmp/cf-anteprima.txt 2>&1 &
  # quando /tmp/cf-anteprima.txt stampa l'indirizzo (di solito http://localhost:8787):
  E2E_URL=http://localhost:8787 npx playwright test >/tmp/e2e-cf.txt 2>&1; echo "e2e-cf $?"; tail -8 /tmp/e2e-cf.txt
  ```
  Atteso: **54 verdi**, come su `next start`. Ogni prova rossa si trascrive con il suo messaggio: è una differenza
  fra Node e workerd, e decide il Passo 9. ⚠︎ L'anteprima non applica i 10 ms: la misura vera è al Passo 7.
  Si spegne l'anteprima a misura finita.

- [ ] **Passo 6: il progetto usa-e-getta (lo fa l'utente).** Elenco da darle, uno per riga, con che cosa deve vedere:
  1. supabase.com → New project, nome **`avstyle-prova`**, regione **Central EU (Frankfurt)**, piano Free. Vede il
     progetto «Healthy». La password del database la tiene **lei**, sulla carta (D3c-24); non la scrive in chat.
  2. Nel proprio terminale, nella cartella del repo: `npx supabase login`, poi `npx supabase link --project-ref
     <ref del progetto>` (le chiede la password del database). Vede «Finished supabase link».
  3. `npx supabase db push`. Vede l'elenco delle migrazioni da `0001` a `0021` e `00051`, poi «Finished supabase db
     push». ⚠︎ La chat legge l'uscita con lo strumento del terminale e **cerca `Skipping migration`**: deve
     comparire **zero** volte.
  4. Dashboard → Authentication → Users → Add user: `prova@example.test`, una password che lei sceglie, «Auto Confirm
     User». Vede l'utente nell'elenco.
  5. Dashboard → SQL Editor, incollato dalla chat: il collegamento e un catalogo di prova (sotto). Vede «Success».
  6. Nel terminale: `npx supabase unlink`. Vede che `supabase/.temp/project-ref` non c'è più (spec 3c §9.3 A6).

  L'SQL del punto 5, da editor SQL (è proprietario: la sicurezza per riga non si applica, ed è voluto):
  ```sql
  update operator set auth_user_id = (select id from auth.users where email = 'prova@example.test') where name = 'Vera';
  insert into service_category (id, name, sort_order) values
    ('c0000000-0000-4000-8000-000000000001', 'Unghie', 1),
    ('c0000000-0000-4000-8000-000000000002', 'Corpo', 2);
  insert into service (id, name, category_id, default_duration_cells, buffer_after_cells, sort_order) values
    ('d0000000-0000-4000-8000-000000000001', 'Refill', 'c0000000-0000-4000-8000-000000000001', 12, 2, 1),
    ('d0000000-0000-4000-8000-000000000002', 'Massaggio', 'c0000000-0000-4000-8000-000000000002', 9, 3, 1);
  insert into operator_service (operator_id, service_id)
    select o.id, s.id from operator o cross join service s;
  insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
    select o.id, d, f.s, f.e from operator o cross join generate_series(0, 5) d
    cross join (values (108, 156), (168, 228)) f(s, e);
  ```

- [ ] **Passo 7: il dispiegamento vero (con l'utente).** L'utente: cloudflare.com → crea l'account gratuito; nel
  proprio terminale `npx wrangler login` (si apre il browser, autorizza). Poi la chat:
  1. l'utente registra il sottodominio `workers.dev` dell'account dalla dashboard (Workers & Pages → il
     sottodominio): al primo dispiegamento `wrangler` lo chiede in modo interattivo, e senza terminale vero fallisce;
  2. l'utente sostituisce in `.env.cloudflare` i due valori con **URL e chiave pubblica di `avstyle-prova`**
     (Dashboard → Project Settings → API; la chiave pubblica non è un segreto, ma il file resta fuori dal repo);
  3. la chat lancia `npm run cf:build`; **l'utente**, nel proprio terminale, `npm run cf:dispiega` (O10). Si
     trascrive l'indirizzo `https://avstyle-agenda.<account>.workers.dev`.
  3. In un secondo terminale `npx wrangler tail --format pretty >/tmp/cf-tail.txt` per tutta la misura.

- [ ] **Passo 8: la misura.** Dal telefono dell'utente (o dal browser della chat con la vista a 375 punti), con
  `prova@example.test`:
  1. accesso; l'agenda di **oggi**, poi **dieci** giorni diversi con la striscia; la vista a lista; la settimana;
  2. **cinque** visite salvate, **due** trascinate, **un** «Annulla», **un** «Controlla» (`perdiLaRispostaDellaProssimaAzione`
     non serve: basta aprire la striscia degli invii);
  3. Cloudflare → Workers & Pages → `avstyle-agenda` → Metrics: si trascrivono **richieste, errori, CPU time p50 e
     p99** del periodo. In `/tmp/cf-tail.txt`: `grep -c "exceeded CPU" /tmp/cf-tail.txt`.
  4. `curl -sI https://avstyle-agenda.<account>.workers.dev/accesso` due volte: CSP presente, `nonce` **diverso**
     fra le due, `Cache-Control: no-store`.

  **Verde** se: zero errori 1102 e zero `exceeded CPU` in tutta la sessione, ogni pagina si apre, ogni scrittura dà il
  suo esito. **Rosso** se anche una sola pagina dà 1102. Il p99 si trascrive **comunque**: un p99 sopra gli 8 ms con
  zero errori è un verde da sorvegliare, e lo si scrive.

- [ ] **Passo 9: la decisione.** Rosso → ci si ferma: niente commit, si scrive il documento delle misure e si porta
  all'utente la domanda «Netlify gratuito (server negli USA) o Cloudflare a pagamento (5 $ al mese, 30 s di CPU)».
  Verde → si spegne il Worker di prova (`npx wrangler delete --name avstyle-agenda`), si **rimettono in
  `.env.cloudflare` i valori locali**, si **lascia acceso** `avstyle-prova`, che serve al Task 7, e si va avanti.

- [ ] **Passo 10: `docs/procedure/cloudflare-fattibilita.md`.** Date e ore; versioni di `@opennextjs/cloudflare` e
  `wrangler`; dimensione del Worker; esito del Passo 5 (54 su 54, o quali no); i numeri del Passo 8; le differenze
  fra la guida e i file di questo piano. ⚠︎ **Nessun indirizzo del progetto, nessuna chiave**: il repo è pubblico.

- [ ] **Passo 11: le sonde.**

| # | Mutazione | Prova che deve arrossire | Rosse |
|---|---|---|---|
| 1a | in `src/server/supabase.ts` aggiungere `const k = process.env.SUPABASE_SERVICE_ROLE_KEY` | «nessun sorgente nomina service_role…» | [da misurare] |
| 1b | in `wrangler.jsonc` aggiungere `"vars": { "CHIAVE": "x" }` | «la configurazione del Worker…» | [da misurare] |
| 1c | togliere `"preview_urls": false` | idem | [da misurare] |

- [ ] **Passo 12: il gate e il commit.** Il gate dei vincoli globali (e2e su `next start`, come in CI), più
  `test ! -e .env.production.local; echo "env $?"` → `0`. Poi:

```
feat(3c): l'app su Cloudflare, e la misura dei 10 ms

L'adattatore OpenNext per Cloudflare Workers Free (D3c-13): Vercel Hobby vieta
l'uso commerciale. Misurato su un dispiegamento vero contro un progetto
Supabase usa-e-getta: <numeri del Passo 8>. L'e2e sull'anteprima: <n> su 54.

La prova statica sulla chiave di servizio ora guarda anche src/ e la
configurazione del Worker, che non dichiara né variabili né segreti.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

**Revisione:** un revisore sul diff, con il documento delle misure accanto.

---

## Task 2 — La migrazione `0022` e le sue prove (rigore pieno)

Spec 3c §3.5, §3.7, §3.8, §4.1, §7.3, §7.4; decisioni D3c-10, D3c-11, D3c-14, O1, O2, O5.

**Files:**
- Create: `supabase/migrations/0022_preparazione.sql`, `tests/schema/preparazione.test.ts`,
  `tests/schema/eccezioni-intervallo.test.ts`, `tests/schema/funzioni-anon.test.ts`,
  `tests/app/eccezioni-via-rest.test.ts`
- Modify: `tests/schema/ricerca-clienti.test.ts:123-125`, che asserisce i colori di `0021` (`#C2185B`,
  `#9B1B1B`): dopo `0022` è rossa. Le due righe passano ai valori di D3c-11 (revisione, B2)

**Interfaces:**
- Consuma: `asOperator`, `asOwner`, `asAnon`, `connect`, `resetData`, `pgCode`, `VERA`, `ANNALISA`, `ALESSANDRA`,
  `*_AUTH`, `OUTSIDER_AUTH` da `tests/helpers/db.ts`; `seedFixture`, `CLIENT_MARIA`, `CLIENT_LUCIA`,
  `SERVICE_REFILL`, `SERVICE_MASSAGE` da `tests/helpers/fixtures.ts`; `sessioneDi` da `tests/helpers/sessioni.ts`.
  ⚠︎ `asOperator` fa **sempre rollback**; `asOwner` **non** ha transazione e scrive davvero; `resetData()` **non**
  ripristina `color` né `sort_order` (`tests/helpers/db.ts:238-240`) né `salon_settings`.
- Produce, per i Task 4–6:
  ```sql
  public.conflitti(p_terne jsonb) returns table (
    appointment_id uuid, operator_id uuid, appointment_date date,
    start_cell int, cell_count int, client_name text, client_phone text)
  -- p_terne = [{"operator_id": uuid, "date": "YYYY-MM-DD", "ranges": [[inizio, fine], ...]}]
  --           ranges = le celle PERSE, come confini [inizio, fine)
  public.scrivi_giorno_settimana(p_operator_id uuid, p_weekday smallint, p_fasce jsonb) returns integer
  -- p_fasce = [[inizio, fine], ...]; [] o null = il giorno non lavora. Restituisce il numero di fasce scritte.
  public.riordina_operatrici(p_ids uuid[]) returns integer
  -- p_ids = TUTTE le operatrici, nell'ordine voluto; sort_order = posizione (1, 2, 3…). 22023 se l'elenco non è esatto.
  constraint salon_closure_al_piu_60_giorni   -- 23514
  ```
  `p_fasce` è `jsonb` e non `int[][]` di proposito: come PostgREST traduca un array di array in `int[][]` non è
  misurato da nessuno (`write_exception_day` ha **zero chiamanti**). Il Passo 6 lo misura per le funzioni del piano 1.

- [ ] **Passo 1: le prove su `conflitti`, prima del codice.** `tests/schema/preparazione.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  asAnon, asOperator, asOwner, pgCode, resetData,
  VERA, ANNALISA, ALESSANDRA, VERA_AUTH, ALESSANDRA_AUTH, OUTSIDER_AUTH,
} from '../helpers/db'
import { seedFixture, CLIENT_MARIA, CLIENT_LUCIA, SERVICE_REFILL, SERVICE_MASSAGE } from '../helpers/fixtures'

// Due date, e la seconda OLTRE i 28 giorni di ORIZZONTE_GIORNI: P1. RELATIVE a oggi:
// con date fisse, dal 16/11/2026 D2 rientrerebbe nei 28 giorni e P1 smetterebbe di
// presidiare (revisione). La funzione non guarda la data di oggi: è il punto.
import { oggiAPerugia } from '../../src/dominio/perugia'
import { sommaGiorni } from '../../src/dominio/tempo'
const D1 = sommaGiorni(oggiAPerugia(), 7)
const D2 = sommaGiorni(oggiAPerugia(), 60)
const V1 = 'a1000000-0000-4000-8000-000000000001'
const V2 = 'a1000000-0000-4000-8000-000000000002'
const V3 = 'a1000000-0000-4000-8000-000000000003'

async function visita(id: string, cliente: string, data: string, appuntamenti: [string, string, number, number][]) {
  await asOwner(async (c) => {
    await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3)', [id, cliente, data])
    for (const [operatrice, servizio, inizio, celle] of appuntamenti) {
      await c.query(
        `insert into appointment (visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4, $5, $6)`,
        [id, operatrice, servizio, data, inizio, celle],
      )
    }
  })
}

const terna = (operatrice: string, data: string, ranges: [number, number][]) => ({ operator_id: operatrice, date: data, ranges })

async function conflittiCome(authUid: string, terne: unknown) {
  return asOperator(authUid, async (c) =>
    (await c.query('select * from conflitti($1::jsonb) order by appointment_date, start_cell', [JSON.stringify(terne)])).rows,
  )
}

describe('public.conflitti', () => {
  beforeEach(async () => {
    await resetData()
    await seedFixture()
    // D1: Maria con Vera alle 15:00 (cella 180, 12 celle) e con Annalisa alla stessa ora;
    //     Lucia con Vera alle 09:10 (cella 110), FUORI dalle celle perse.
    await visita(V1, CLIENT_MARIA, D1, [[VERA, SERVICE_REFILL, 180, 12], [ANNALISA, SERVICE_MASSAGE, 180, 9]])
    await visita(V2, CLIENT_LUCIA, D1, [[VERA, SERVICE_MASSAGE, 110, 9]])
    // D2, oltre l'orizzonte: Lucia con Vera alle 16:00.
    await visita(V3, CLIENT_LUCIA, D2, [[VERA, SERVICE_REFILL, 192, 12]])
  })

  it('restituisce l’appuntamento di Vera nelle celle perse, con nome e telefono', async () => {
    const righe = await conflittiCome(VERA_AUTH, [terna(VERA, D1, [[168, 228]])])
    expect(righe).toEqual([
      expect.objectContaining({ operator_id: VERA, start_cell: 180, cell_count: 12, client_name: 'Maria Rossi', client_phone: '+393331234567' }),
    ])
  })

  it('non restituisce né l’appuntamento fuori dalle celle perse né quello di un’altra operatrice', async () => {
    const righe = await conflittiCome(VERA_AUTH, [terna(VERA, D1, [[168, 228]])])
    expect(righe.map((r) => r.start_cell)).not.toContain(110)
    expect(righe.map((r) => r.operator_id)).not.toContain(ANNALISA)
  })

  it('P1: un appuntamento oltre i 28 giorni compare', async () => {
    const righe = await conflittiCome(VERA_AUTH, [terna(VERA, D1, [[168, 228]]), terna(VERA, D2, [[0, 288]])])
    expect(righe.map((r) => r.appointment_date)).toHaveLength(2)
    expect(righe.at(-1)).toEqual(expect.objectContaining({ start_cell: 192, client_name: 'Lucia Ciccarè' }))
  })

  it('un appuntamento che TOCCA soltanto le celle perse non è un conflitto, da tutti e due i lati', async () => {
    // [180, 192) e [192, 228) si toccano senza sovrapporsi; [168, 180) e [180, 192) idem.
    expect(await conflittiCome(VERA_AUTH, [terna(VERA, D1, [[192, 228]])])).toEqual([])
    expect(await conflittiCome(VERA_AUTH, [terna(VERA, D1, [[168, 180]])])).toEqual([])
    expect(await conflittiCome(VERA_AUTH, [terna(VERA, D1, [[191, 228]])])).toHaveLength(1)
  })

  it('una terna con DUE intervalli persi guarda tutti e due', async () => {
    // Un giorno può perdere due fasce: l'appuntamento sta nel secondo intervallo.
    expect(await conflittiCome(VERA_AUTH, [terna(VERA, D1, [[0, 10], [168, 228]])])).toHaveLength(1)
  })

  it('il telefono nullo arriva nullo, e la riga c’è', async () => {
    await asOwner((c) => c.query('update client set phone = null where id = $1', [CLIENT_MARIA]))
    const righe = await conflittiCome(VERA_AUTH, [terna(VERA, D1, [[168, 228]])])
    expect(righe).toEqual([expect.objectContaining({ client_name: 'Maria Rossi', client_phone: null })])
  })

  it('un’estranea riceve zero righe dove Vera ne riceve una', async () => {
    const t = [terna(VERA, D1, [[168, 228]])]
    expect(await conflittiCome(VERA_AUTH, t)).toHaveLength(1)
    expect(await conflittiCome(OUTSIDER_AUTH, t)).toEqual([])
  })

  it('un’operatrice disattivata riceve zero righe (e da attiva ne riceveva una)', async () => {
    expect(await conflittiCome(ALESSANDRA_AUTH, [terna(VERA, D1, [[168, 228]])])).toHaveLength(1)
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ALESSANDRA]))
    expect(await conflittiCome(ALESSANDRA_AUTH, [terna(VERA, D1, [[168, 228]])])).toEqual([])
  })

  it('anon non la esegue: 42501', async () => {
    const codice = await asAnon(async (c) => {
      try { await c.query("select * from conflitti('[]'::jsonb)"); return 'nessun errore' } catch (e) { return pgCode(e) }
    })
    expect(codice).toBe('42501')
  })

  it('terne nulle o vuote: zero righe, nessun errore', async () => {
    expect(await conflittiCome(VERA_AUTH, [])).toEqual([])
    expect(await asOperator(VERA_AUTH, async (c) => (await c.query('select * from conflitti(null)')).rows)).toEqual([])
  })
})
```

  ⚠︎ Se l'inserimento diretto di `appointment` da proprietario rifiuta (un trigger del 3a-1 che vuole altro),
  la funzione `visita()` si scrive come fa `tests/schema/occupancy.test.ts`, e si annota.

- [ ] **Passo 2: le prove su `scrivi_giorno_settimana`, `riordina_operatrici`, il tetto, i colori e P5**, nello stesso
  file:

```ts
describe('public.scrivi_giorno_settimana', () => {
  beforeEach(async () => {
    await resetData()
    await asOwner((c) => c.query(
      `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary) values
         ($1, 0, 108, 156), ($1, 0, 168, 228), ($1, 1, 108, 228), ($2, 1, 108, 156)`, [VERA, ANNALISA]))
  })

  const fasce = (c: import('pg').Client, op: string, g: number) =>
    c.query('select start_boundary, end_boundary from weekly_availability where operator_id = $1 and weekday = $2 order by 1', [op, g])
      .then((r) => r.rows.map((x) => [x.start_boundary, x.end_boundary]))

  it('sostituisce il martedì di Vera e lascia il suo lunedì e il martedì di Annalisa', async () => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      const n = (await c.query("select scrivi_giorno_settimana($1, 1::smallint, '[[108,156],[180,228]]'::jsonb) as n", [VERA])).rows[0].n
      return { n, martedi: await fasce(c, VERA, 1), lunedi: await fasce(c, VERA, 0), annalisa: await fasce(c, ANNALISA, 1) }
    })
    expect(esito).toEqual({ n: 2, martedi: [[108, 156], [180, 228]], lunedi: [[108, 156], [168, 228]], annalisa: [[108, 156]] })
  })

  it('zero fasce: quel giorno non lavora, gli altri restano', async () => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      const n = (await c.query("select scrivi_giorno_settimana($1, 0::smallint, '[]'::jsonb) as n", [VERA])).rows[0].n
      return { n, lunedi: await fasce(c, VERA, 0), martedi: await fasce(c, VERA, 1) }
    })
    expect(esito).toEqual({ n: 0, lunedi: [], martedi: [[108, 228]] })
  })

  it('P3: due fasce che si sovrappongono danno 23P01 e il giorno RESTA com’era', async () => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      await c.query('savepoint prima')
      let codice = 'nessun errore'
      try { await c.query("select scrivi_giorno_settimana($1, 0::smallint, '[[108,160],[150,228]]'::jsonb)", [VERA]) }
      catch (e) { codice = pgCode(e); await c.query('rollback to savepoint prima') }
      return { codice, lunedi: await fasce(c, VERA, 0) }
    })
    expect(esito).toEqual({ codice: '23P01', lunedi: [[108, 156], [168, 228]] })
  })

  it.each([['giorno', '$1, null'], ['operatrice', 'null, 0::smallint']])('%s nullo: 22004', async (_n, argomenti) => {
    const codice = await asOperator(VERA_AUTH, async (c) => {
      try { await c.query(`select scrivi_giorno_settimana(${argomenti}, '[]'::jsonb)`, argomenti.startsWith('$1') ? [VERA] : []); return 'nessun errore' } catch (e) { return pgCode(e) }
    })
    expect(codice).toBe('22004')
  })

  it('tre fasce: restituisce 3', async () => {
    const n = await asOperator(VERA_AUTH, async (c) =>
      (await c.query("select scrivi_giorno_settimana($1, 2::smallint, '[[96,120],[132,156],[180,228]]'::jsonb) as n", [VERA])).rows[0].n)
    expect(n).toBe(3)
  })

  it('security invoker: un’estranea autenticata non scrive la settimana di Vera (42501)', async () => {
    // Con `security definer` la funzione scavalcherebbe la sicurezza per riga (mutazione 2l, misurata).
    const codice = await asOperator(OUTSIDER_AUTH, async (c) => {
      try { await c.query("select scrivi_giorno_settimana($1, 0::smallint, '[[108,156]]'::jsonb)", [VERA]); return 'nessun errore' } catch (e) { return pgCode(e) }
    })
    expect(codice).toBe('42501')
  })
})

describe('public.riordina_operatrici', () => {
  beforeEach(async () => { await resetData() })
  const ordine = (c: import('pg').Client) =>
    c.query('select id from operator order by sort_order, id').then((r) => r.rows.map((x) => x.id))

  it('mette le tre nell’ordine dato, in una chiamata, con sort_order 1, 2, 3', async () => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      const n = (await c.query('select riordina_operatrici($1::uuid[]) as n', [[ALESSANDRA, VERA, ANNALISA]])).rows[0].n
      const posti = (await c.query('select sort_order from operator order by sort_order')).rows.map((r) => r.sort_order)
      return { n, ordine: await ordine(c), posti }
    })
    expect(esito).toEqual({ n: 3, ordine: [ALESSANDRA, VERA, ANNALISA], posti: [1, 2, 3] })
  })

  it('security invoker: un’estranea vede zero operatrici e riceve 22023', async () => {
    // Con `security definer` l'estranea riordinerebbe le colonne di tutte (mutazione 2m, misurata).
    const codice = await asOperator(OUTSIDER_AUTH, async (c) => {
      try { await c.query('select riordina_operatrici($1::uuid[])', [[ALESSANDRA, VERA, ANNALISA]]); return 'nessun errore' } catch (e) { return pgCode(e) }
    })
    expect(codice).toBe('22023')
  })

  it.each([
    ['incompleto', [ALESSANDRA, VERA]],
    ['completo ma con un doppione', [ALESSANDRA, VERA, ANNALISA, VERA]],
    ['nullo', null],
  ])('elenco %s: 22023 e l’ordine non cambia', async (_n, ids) => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      const prima = await ordine(c)
      await c.query('savepoint p')
      let codice = 'nessun errore'
      try { await c.query('select riordina_operatrici($1::uuid[])', [ids]) } catch (e) { codice = pgCode(e); await c.query('rollback to savepoint p') }
      return { codice, uguale: JSON.stringify(prima) === JSON.stringify(await ordine(c)) }
    })
    expect(esito).toEqual({ codice: '22023', uguale: true })
  })
})

describe('il tetto delle chiusure, D3c-14', () => {
  beforeEach(async () => { await resetData() })
  const chiusura = (dal: string, al: string) => asOperator(VERA_AUTH, async (c) => {
    try {
      await c.query("insert into salon_closure (start_date, end_date, reason) values ($1, $2, 'ferie')", [dal, al])
      return 'scritta'
    } catch (e) { return `${pgCode(e)} ${(e as Error).message}` }
  })
  it('60 giorni estremi compresi: si scrive', async () => {
    expect(await chiusura('2027-08-01', '2027-09-29')).toBe('scritta')
  })
  it('61 giorni: 23514 sul vincolo che lo nomina', async () => {
    expect(await chiusura('2027-08-01', '2027-09-30')).toMatch(/^23514 .*salon_closure_al_piu_60_giorni/)
  })
})

describe('i colori di D3c-11', () => {
  it('Vera rosa, Annalisa bianco, Alessandra albicocca', async () => {
    const righe = await asOwner(async (c) => (await c.query('select name, color from operator order by sort_order')).rows)
    expect(righe).toEqual([
      { name: 'Vera', color: '#F3A4BA' }, { name: 'Annalisa', color: '#FFFFFF' }, { name: 'Alessandra', color: '#FFD8B0' },
    ])
  })
})

describe('P5: nessuna scrittura del 3c annuncia', () => {
  beforeEach(async () => { await resetData(); await seedFixture() })
  const conta = (c: import('pg').Client) => c.query('select count(*)::int as n from annuncio').then((r) => r.rows[0].n)

  it('disponibilità, eccezioni, chiusure, ordine e colore: zero righe nuove', async () => {
    const delta = await asOperator(VERA_AUTH, async (c) => {
      const prima = await conta(c)
      await c.query("select scrivi_giorno_settimana($1, 2::smallint, '[[108,156]]'::jsonb)", [VERA])
      await c.query("select write_exception_days($1, '2026-11-02', '2026-11-06', '{{108,156}}')", [VERA])
      await c.query("insert into salon_closure (start_date, end_date, reason) values ('2026-12-24', '2026-12-26', 'Natale')")
      await c.query('select riordina_operatrici($1::uuid[])', [[ANNALISA, VERA, ALESSANDRA]])
      await c.query("update operator set color = '#D7C4EC' where id = $1", [ALESSANDRA])
      return (await conta(c)) - prima
    })
    expect(delta).toBe(0)
  })

  it('controllo positivo: un appuntamento annuncia', async () => {
    const prima = await asOwner(conta)
    await visita(V1, CLIENT_MARIA, D1, [[VERA, SERVICE_REFILL, 180, 12]])
    expect(await asOwner(conta)).toBeGreaterThan(prima)
  })
})
```

- [ ] **Passo 3: le prove che a `write_exception_days` mancano** (spec 3c §6.2: «zero chiamanti, una prova sola»).
  `tests/schema/eccezioni-intervallo.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { asOperator, connect, pgCode, resetData, VERA, ANNALISA, VERA_AUTH } from '../helpers/db'

const conta = (c: import('pg').Client, op: string) => c.query(
  `select count(distinct d.id)::int as giorni, count(r.id)::int as fasce
     from exception_day d left join exception_range r on r.exception_day_id = d.id
    where d.operator_id = $1`, [op]).then((r) => r.rows[0])

describe('write_exception_days', () => {
  beforeEach(async () => { await resetData() })

  it('sei giorni con una fascia: restituisce 6, sei giorni e sei fasce, e Annalisa non è toccata', async () => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      await c.query("select write_exception_day($1, '2026-10-07', '{{108,156}}')", [ANNALISA])
      const n = (await c.query("select write_exception_days($1, '2026-10-05', '2026-10-10', '{{108,156}}') as n", [VERA])).rows[0].n
      return { n, vera: await conta(c, VERA), annalisa: await conta(c, ANNALISA) }
    })
    expect(esito).toEqual({ n: 6, vera: { giorni: 6, fasce: 6 }, annalisa: { giorni: 1, fasce: 1 } })
  })

  it('risalvare con due fasce sostituisce, non somma', async () => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      await c.query("select write_exception_days($1, '2026-10-05', '2026-10-10', '{{108,156}}')", [VERA])
      await c.query("select write_exception_days($1, '2026-10-05', '2026-10-10', '{{108,156},{168,228}}')", [VERA])
      return conta(c, VERA)
    })
    expect(esito).toEqual({ giorni: 6, fasce: 12 })
  })

  it.each([
    ['invertito', "'2026-10-10'", "'2026-10-05'"],
    ['dal nullo', 'null', "'2026-10-10'"],
    ['al nullo', "'2026-10-05'", 'null'],
  ])('intervallo %s: restituisce 0 e non scrive niente (spec 3c §3.8)', async (_n, dal, al) => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      const n = (await c.query(`select write_exception_days($1, ${dal}::date, ${al}::date, '{{108,156}}') as n`, [VERA])).rows[0].n
      return { n, vera: await conta(c, VERA) }
    })
    expect(esito).toEqual({ n: 0, vera: { giorni: 0, fasce: 0 } })
  })

  it('fasce nulle: sei giorni di ASSENZA, zero fasce', async () => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      const n = (await c.query("select write_exception_days($1, '2026-10-05', '2026-10-10', null) as n", [VERA])).rows[0].n
      return { n, vera: await conta(c, VERA) }
    })
    expect(esito).toEqual({ n: 6, vera: { giorni: 6, fasce: 0 } })
  })

  it('due scritture SIMULTANEE sullo stesso giorno: la seconda dà 23505 sul vincolo del giorno (spec appendice D, misura 4)', async () => {
    const a = await connect(); const b = await connect()
    try {
      await a.query('begin'); await b.query('begin')
      await a.query("select write_exception_day($1, '2026-10-07', '{{108,156}}')", [VERA])
      const seconda = b.query("select write_exception_day($1, '2026-10-07', '{{168,228}}')", [VERA])
        .then(() => 'nessun errore', (e) => `${pgCode(e)} ${(e as Error).message}`)
      await a.query('commit')
      expect(await seconda).toMatch(/^23505 .*exception_day_operator_id_exception_date_key/)
      await b.query('rollback')
    } finally { await a.end(); await b.end() }
  })
})
```

  ⚠︎ `connect()` è proprietario: la prova misura il **vincolo**, non la sicurezza per riga, ed è voluto. Fa commit:
  `resetData()` nel `beforeEach` pulisce. ⚠︎ **Il `commit` di `a` aspetta che `b` sia DAVVERO in attesa** (revisione,
  B10): fra la chiamata di `b` e il `commit`, un ciclo che legge `select count(*) from pg_stat_activity where
  wait_event_type = 'Lock' and query like '%write_exception_day%'` da una terza connessione finché vale 1 (al più
  5 s, poi la prova fallisce dicendo «b non si è mai bloccata»). Senza, `a` può committare prima che `b` parta, e `b`
  riesce: la prova sarebbe instabile e chi la esegue verrebbe spinto a indebolirla.

- [ ] **Passo 4: P7.** `tests/schema/funzioni-anon.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { asOwner } from '../helpers/db'

// Spec 3c §9.6 D10: la stessa lettura si rifà sul progetto online. Le funzioni
// delle estensioni (pg_trgm, unaccent…) si escludono per DIPENDENZA, non per nome.
const AMMESSE_AD_ANON = ['immutable_unaccent']

describe('P7 — funzioni di public eseguibili da anon', () => {
  it('sono solo quelle ammesse', async () => {
    const righe = await asOwner(async (c) => (await c.query(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and has_function_privilege('anon', p.oid, 'execute')
         and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
       order by 1`)).rows.map((r) => r.proname))
    expect(righe).toEqual(AMMESSE_AD_ANON)
  })

  it('controllo positivo: le tre nuove sono eseguibili da authenticated', async () => {
    const righe = await asOwner(async (c) => (await c.query(`
      select has_function_privilege('authenticated', 'public.conflitti(jsonb)', 'execute') as a,
             has_function_privilege('authenticated', 'public.scrivi_giorno_settimana(uuid, smallint, jsonb)', 'execute') as b,
             has_function_privilege('authenticated', 'public.riordina_operatrici(uuid[])', 'execute') as c`)).rows[0])
    expect(righe).toEqual({ a: true, b: true, c: true })
  })
})
```

  ⚠︎ **Se `tests/schema/catalogue-audit.test.ts:16-24,406-418` fa già un elenco esatto delle funzioni eseguibili da
  `anon`** (la revisione dice di sì, e guarda anche lo schema `app`), le due prove si aggiungono **lì**, con quella
  query, invece di un file nuovo; §9.6 D10 online usa la stessa. ⚠︎ **Prima di scrivere `AMMESSE_AD_ANON`, si esegue la query sul database com'è oggi** (dopo `db reset`, senza
  `0022`) e si trascrive l'elenco nel registro del task. Atteso: solo `immutable_unaccent` (spec 3c §9.6 D10,
  misurato da due revisori). Se esce altro, è un reperto di sicurezza di una migrazione già scritta: ci si ferma e
  lo si porta all'orchestratrice.

- [ ] **Passo 5: vedere le prove rosse.** `npx supabase db reset` poi `npx vitest run tests/schema/preparazione.test.ts
  tests/schema/eccezioni-intervallo.test.ts tests/schema/funzioni-anon.test.ts`. Atteso: `preparazione` rossa su
  tutto ciò che chiama le funzioni nuove (`42883 function … does not exist`), sul tetto e sui colori;
  `eccezioni-intervallo` **verde** (prova funzioni che esistono: è il suo scopo); `funzioni-anon` rossa sul
  controllo positivo. Si scrivono i numeri veri.

- [ ] **Passo 6: la prova via PostgREST delle funzioni del piano 1.** `tests/app/eccezioni-via-rest.test.ts`, con
  lo schema di `tests/app/scrittura.test.ts` (client con il token di Vera):

```ts
import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { asOwner, resetData, VERA, VERA_AUTH } from '../helpers/db'
import { sessioneDi } from '../helpers/sessioni'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.SUPABASE_ANON_KEY ?? '' // come tests/app/scrittura.test.ts: si copia la sua riga
const vera = async () => createClient(URL, ANON, {
  global: { headers: { Authorization: `Bearer ${(await sessioneDi(VERA_AUTH)).accessToken}` } },
})

describe('write_exception_days chiamata come la chiamerà l’app', () => {
  beforeEach(async () => { await resetData() })

  it('un array di array JavaScript arriva come due fasce', async () => {
    const r = await (await vera()).rpc('write_exception_days', {
      p_operator_id: VERA, p_from: '2026-10-05', p_to: '2026-10-06', p_ranges: [[108, 156], [168, 228]],
    })
    expect(r.error).toBeNull()
    expect(r.data).toBe(2)
    const fasce = await asOwner(async (c) => (await c.query(
      `select r.start_boundary, r.end_boundary from exception_range r join exception_day d on d.id = r.exception_day_id
        where d.operator_id = $1 and d.exception_date = '2026-10-05' order by 1`, [VERA])).rows)
    expect(fasce).toEqual([{ start_boundary: 108, end_boundary: 156 }, { start_boundary: 168, end_boundary: 228 }])
  })
})
```

  ⚠︎ **Questa prova può uscire rossa per una ragione che non è un difetto del 3c**: se PostgREST non sa tradurre un
  array di array JSON in `int[][]`. In quel caso la chat **non** cambia `write_exception_day(s)` (piano 1): aggiunge
  in `0022` un involucro `public.scrivi_eccezioni(p_operator_id uuid, p_dal date, p_al date, p_fasce jsonb) returns
  integer`, `security invoker`, che converte `p_fasce` e chiama `write_exception_days`, con le sue grant e le sue
  prove come le altre tre, e lo scrive in testa al registro del task. I Task 4–6 chiamano allora l'involucro.

- [ ] **Passo 7: la migrazione.** `supabase/migrations/0022_preparazione.sql`:

```sql
-- 0022 — Piano 3c ridotto, Task 2: ciò che le schermate della preparazione
-- chiedono al database. Spec 3c al commit f31c2b4.
--
-- Il NUMERO: lo spec 3b rivendica 0022 e lo spec 3c dice 0023. Decisione
-- dell'utente del 07/10/2026 (D3c-10): il 3c prende 0022, perché con 0023
-- online una 0022 arrivata dopo viene RIFIUTATA da `supabase db push` e, con
-- --include-all, applicata in un ordine diverso da quello di `db reset`
-- (misurato sul CLI 2.117.0). Il 3b in fase 2 prende 0025 o oltre.
--
-- Nessun trigger nuovo e nessun tocco ad app.annuncia_giorni(): l'annuncio dei
-- cambi di disponibilità (spec 3c §6) è in fase 2.

-- 1. I colori, D3c-9 e D3c-11: riempimenti chiari, il 3:1 lo porta il bordo
--    d'inchiostro, che src/cliente/vista.ts mette da sé quando il contrasto col
--    fondo è sotto 3. Per nome, come 0021.
update public.operator set color = '#F3A4BA' where name = 'Vera';
update public.operator set color = '#FFD8B0' where name = 'Alessandra';

-- 2. Gli appuntamenti che cadono nelle celle PERSE. Spec 3c §3.5. Le celle perse
--    le calcola l'app con risolviGiorno (src/dominio/fasce.ts): riscriverle qui
--    sarebbe la seconda copia del risolutore che 0012 vieta. SENZA orizzonte
--    (P1): le terne coprono ogni data futura con appuntamenti.
--    security invoker: la sicurezza per riga decide chi vede che cosa.
create function public.conflitti(p_terne jsonb)
returns table (
  appointment_id   uuid,
  operator_id      uuid,
  appointment_date date,
  start_cell       int,
  cell_count       int,
  client_name      text,
  client_phone     text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct a.id, a.operator_id, a.appointment_date, a.start_cell::int, a.cell_count::int,
         c.full_name, c.phone
    from jsonb_array_elements(coalesce(p_terne, '[]'::jsonb)) t
    join public.appointment a
      on a.operator_id = (t ->> 'operator_id')::uuid
     and a.appointment_date = (t ->> 'date')::date
    join public.visit v  on v.id = a.visit_id and v.visit_date = a.appointment_date
    join public.client c on c.id = v.client_id
   where exists (
     select 1 from jsonb_array_elements(t -> 'ranges') r
      where int4range(a.start_cell, a.start_cell + a.cell_count)
         && int4range((r ->> 0)::int, (r ->> 1)::int)
   )
   -- per posizione: con `select distinct` l'ordinamento deve usare le espressioni
   -- della lista, e `a.start_cell` (smallint) non è `a.start_cell::int` (42P10, misurato).
   order by 3, 4, 1;
$$;

-- 3. Le fasce di UN giorno della settimana tipo, in una chiamata (P3): due
--    chiamate PostgREST sono due transazioni, e un guasto fra la cancellazione
--    e l'inserimento lascerebbe il giorno vuoto — «non lavora» ogni settimana.
--    Le fasce sovrapposte le rifiuta l'exclude di 0006 con 23P01, e la
--    transazione intera si annulla: il giorno resta com'era.
create function public.scrivi_giorno_settimana(
  p_operator_id uuid,
  p_weekday     smallint,
  p_fasce       jsonb
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_scritte integer := 0;
  v_fascia  jsonb;
begin
  if p_operator_id is null or p_weekday is null then
    raise exception 'scrivi_giorno_settimana: operatrice e giorno sono obbligatori'
      using errcode = '22004';
  end if;

  delete from public.weekly_availability
   where operator_id = p_operator_id and weekday = p_weekday;

  for v_fascia in select value from jsonb_array_elements(coalesce(p_fasce, '[]'::jsonb)) loop
    insert into public.weekly_availability (operator_id, weekday, start_boundary, end_boundary)
    values (p_operator_id, p_weekday, (v_fascia ->> 0)::smallint, (v_fascia ->> 1)::smallint);
    v_scritte := v_scritte + 1;
  end loop;

  return v_scritte;
end;
$$;

-- 4. L'ordine delle colonne, in una chiamata (spec 3c §7.3): sort_order non ha
--    unicità, e N aggiornamenti separati interrotti a metà lasciano due
--    operatrici allo stesso posto. L'elenco deve contenere OGNI operatrice una
--    volta: un elenco stantio (una collega aggiunta nel frattempo) si rifiuta.
create function public.riordina_operatrici(p_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_righe integer;
begin
  if p_ids is null
     or (select array_agg(x order by x) from unnest(p_ids) x)
        is distinct from (select array_agg(o.id order by o.id) from public.operator o)
  then
    raise exception 'riordina_operatrici: l''elenco deve contenere ogni operatrice una volta'
      using errcode = '22023';
  end if;

  update public.operator o
     set sort_order = t.posizione
    from unnest(p_ids) with ordinality as t(id, posizione)
   where o.id = t.id;
  get diagnostics v_righe = row_count;
  return v_righe;
end;
$$;

-- 5. Il tetto delle chiusure, D3c-14: 60 giorni estremi compresi. L'intervallo
--    d'eccezione ha lo stesso tetto nell'app (O5): write_exception_days è del
--    piano 1 e non si tocca.
alter table public.salon_closure
  add constraint salon_closure_al_piu_60_giorni check (end_date - start_date <= 59);

-- 6. Ogni funzione nuova nasce eseguibile da anon (ACL di difetto di Supabase):
--    si revoca da public e da anon, si concede ad authenticated.
revoke execute on function
  public.conflitti(jsonb),
  public.scrivi_giorno_settimana(uuid, smallint, jsonb),
  public.riordina_operatrici(uuid[])
from public, anon;

grant execute on function
  public.conflitti(jsonb),
  public.scrivi_giorno_settimana(uuid, smallint, jsonb),
  public.riordina_operatrici(uuid[])
to authenticated;
```

- [ ] **Passo 8: il reset e le prove verdi.** (⚠︎ Online, `add constraint` si valida sulle righe esistenti: al
  primo `db push` non ce ne sono; in un dispiegamento successivo una chiusura oltre i 60 giorni lo farebbe fallire.) `npx supabase db reset >/tmp/reset.txt 2>&1; echo $?; grep
  "0022\|Skipping" /tmp/reset.txt`: deve comparire `Applying migration 0022_preparazione.sql` e **nessun**
  `Skipping`. Poi le quattro prove del task, tutte verdi.

- [ ] **Passo 9: le sonde (rigore pieno).** Su `0022`, che è l'ultima a definire questi oggetti; **`db reset` dopo
  ogni mutazione e dopo ogni ripristino**.

| # | Mutazione | Prova che deve arrossire | Rosse |
|---|---|---|---|
| 2a | togliere `conflitti(jsonb)` dal `revoke` | P7 «sono solo quelle ammesse»; «anon non la esegue» | [da misurare] |
| 2b | togliere `scrivi_giorno_settimana` dal `revoke` | P7 | [da misurare] |
| 2c | togliere `riordina_operatrici` dal `revoke` | P7 | [da misurare] |
| 2d | `conflitti` `security definer` | «un'estranea riceve zero righe»; «disattivata» | [da misurare] |
| 2e | togliere il predicato `exists (… && …)` | «non restituisce … fuori dalle celle perse» | [da misurare] |
| 2f | `int4range(a.start_cell, a.start_cell + a.cell_count + 1)` | «TOCCA soltanto» | [da misurare] |
| 2g | `delete … where operator_id = p_operator_id` senza `weekday` | «lascia il suo lunedì» | [da misurare] |
| 2h | in `riordina`, togliere il controllo dell'elenco | i tre casi di 22023 | [da misurare] |
| 2i | tetto `<= 60` | «61 giorni» | [da misurare] |
| 2j | i colori scambiati fra Vera e Alessandra | «i colori di D3c-11» | [da misurare] |
| 2k | in `scrivi_giorno_settimana`, `for` su `p_fasce` senza `coalesce` | — | **equivalente** (misurato: `jsonb_array_elements(null)` dà zero righe) |
| 2l | `scrivi_giorno_settimana` `security definer` | «un'estranea autenticata non scrive…» (42501) | 1 (misurato dalla revisione) |
| 2m | `riordina_operatrici` `security definer` | «un'estranea vede zero operatrici…» (22023) | 1 (misurato dalla revisione) |
| 2n | `&&` con l'intervallo perso chiuso `'[]'` | «TOCCA soltanto… da tutti e due i lati» | 1 (misurato) |
| 2o | `conflitti` guarda solo `ranges -> 0` | «DUE intervalli» | 1 (misurato) |
| 2p | `v_scritte := 2` costante | «tre fasce: restituisce 3» | 1 (misurato) |
| 2q | `sort_order = posizione - 1` | «sort_order 1, 2, 3» | 1 (misurato) |
| 2r | metà `p_operator_id is null` dell'`if` tolta | «operatrice nullo: 22004» | 1 (misurato) |

  **Equivalenti dichiarati** (revisione): 2k; togliere `p_ids is null` in `riordina` (l'`is distinct from` scatta
  comunque); togliere il `grant … to authenticated` (l'ACL di difetto lo concede già); `v.visit_date =
  a.appointment_date` (ridondante con la chiave esterna composta). ⚠︎ E la parte «il giorno RESTA com'era» di P3
  la regge il `rollback to savepoint` della prova stessa: l'atomicità la presidia l'asserzione sul `23P01`.
  ⚠︎ `scrivi_giorno_settimana` accetta `[1,3,999]` scrivendo `[1,3)`: la forma delle fasce la valida l'app
  (`validaFasce`), ed è dichiarato.

  ⚠︎ La 2d con le fixture d'oggi: `resetData` collega le tre e l'estranea esiste (`OUTSIDER_AUTH`). Se la 2d dà zero
  rosse, la prova sull'estranea sta guardando la cosa sbagliata: si guarda prima il controllo positivo.

- [ ] **Passo 10: il gate e il commit.**

```
feat(3c): la migrazione 0022 della preparazione

Le tre funzioni che le schermate chiamano, tutte security invoker: i
conflitti senza orizzonte (spec 3c §3.5), un giorno della settimana tipo e
l'ordine delle operatrici in una chiamata sola. Il tetto di 60 giorni sulle
chiusure (D3c-14) e i colori chiari (D3c-11). Il numero è 0022 per D3c-10.

Le prove che a write_exception_days mancavano, anche via PostgREST; e una
prova sul catalogo che elenca le funzioni eseguibili da anon (spec 3c §9.6
D10), la stessa lettura che si rifà online.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

**Revisione, a rigore pieno:** due revisori. **Lente 1, grant e sicurezza per riga**: ogni funzione nuova contro
P7, `security invoker` contro la sicurezza per riga, la catena `operator`→`auth.users`; misura su database locale
**dopo aver chiesto all'utente** se è libero. **Lente 2, mutazioni**: le undici sonde rimisurate su un banco
proprio, più le mutazioni che il revisore inventa; dichiara gli equivalenti.

---

## Task 3 — La logica pura della preparazione

Spec 3c §3.3, §3.4, §3.8, §4.1 (letta con D3c-9, **non** con D3c-8: vedi le divergenze), §5.1, §5.2, §7.2; O3.
Tutto in `src/dominio/`, quindi anche in `npm run test:fuso` (fuso americano).

**Files:**
- Create: `src/dominio/tavolozza.ts`, `src/dominio/differenze.ts`, `src/dominio/validazione-disponibilita.ts`,
  `src/dominio/primo-avvio.ts`, `src/dominio/errori-preparazione.ts`; le prove omonime in `tests/dominio/`;
  `tests/schema/vincoli-noti.test.ts`

**Interfaces:**
- Consuma: `risolviGiorno`, `piega`, `Eccezione`, `IngressoGiorno` (`src/dominio/fasce.ts`); `Fascia`
  (`src/dominio/tipi.ts`); `oraDaConfine`, `giornoSettimana` (0 = lunedì), `sommaGiorni`, `CELLE_PER_GIORNO`
  (`src/dominio/tempo.ts`); `contrasto`, `INCHIOSTRO` (`src/cliente/vista.ts`); `RIPROVA` (`src/dominio/errori.ts`).
- Produce:
  ```ts
  // tavolozza.ts
  export const TAVOLOZZA: readonly { nome: string; colore: string }[]
  export function deltaE(a: string, b: string): number
  export function deltaEPeggioreDaltonico(a: string, b: string): number
  export type Rifiuto = 'fuori_tavolozza' | 'illeggibile' | 'troppo_vicino'
  export function coloreAmmesso(colore: string, colleghe: readonly string[]):
    { ammesso: true } | { ammesso: false; motivo: Rifiuto; vicinoA?: string }
  // differenze.ts
  export interface RigaDifferenze { readonly data: string; readonly perse: Fascia[]; readonly aggiunte: Fascia[] }
  export function differenzeDelGiorno(prima: readonly Fascia[], dopo: readonly Fascia[]): { perse: Fascia[]; aggiunte: Fascia[] }
  export function righeDifferenze(giorni: readonly { data: string; prima: readonly Fascia[]; dopo: readonly Fascia[] }[]): RigaDifferenze[]
  export function testoRiga(riga: RigaDifferenze): string[]
  export interface Terna { readonly operator_id: string; readonly date: string; readonly ranges: [number, number][] }
  export function terneDeiConflitti(operatrice: string, righe: readonly RigaDifferenze[]): Terna[]
  export function terneTuttoPerso(operatrice: string, date: readonly string[]): Terna[]
  // validazione-disponibilita.ts
  export const TETTO_GIORNI = 60
  export type MotivoNonValido = 'data_mancante' | 'ordine_invertito' | 'oltre_il_tetto' | 'confine_fuori' | 'fascia_vuota'
  export function contaGiorni(dal: string, al: string): number
  export function validaIntervallo(dal: string | null, al: string | null): MotivoNonValido | null
  export function validaFasce(fasce: readonly Fascia[]): MotivoNonValido | null
  export function fraseNonValido(m: MotivoNonValido): string
  // primo-avvio.ts
  export interface StatoPreparazione { readonly categorie: number; readonly servizi: number; readonly abbinamenti: number;
    readonly attive: readonly { id: string; nome: string; conOrari: boolean }[] }
  export type Passo = 'categorie' | 'servizi' | 'chi_fa_cosa' | 'settimana' | 'fatto'
  export function passoDaCuiRiprendere(s: StatoPreparazione): Passo
  export function cheCosaManca(s: StatoPreparazione): string[]
  // errori-preparazione.ts
  export const VINCOLI_NOTI: readonly string[]
  export function frasePreparazione(sqlstate: string, vincolo?: string): string
  ```

- [ ] **Passo 1: la trappola allo specchio, prima del codice.** `tests/dominio/differenze.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { risolviGiorno } from '../../src/dominio/fasce'
import { giornoSettimana } from '../../src/dominio/tempo'
import { differenzeDelGiorno, righeDifferenze, terneDeiConflitti, terneTuttoPerso, testoRiga } from '../../src/dominio/differenze'
import type { Fascia } from '../../src/dominio/tipi'

const f = (s: number, e: number): Fascia => ({ startBoundary: s, endBoundary: e })
// Spec 3c §3.2. Vera: lun e mar 9–13 e 15–19; mer solo 15–19; gio non lavora; ven 9–19; sab 9–13.
const SETTIMANA: Fascia[][] = [
  [f(108, 156), f(180, 228)], [f(108, 156), f(180, 228)], [f(180, 228)], [], [f(108, 228)], [f(108, 156)], [],
]
const DATE = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']
const NUOVA = [f(108, 156)] // il corso: 9–13 per tutto l'intervallo

const giorni = DATE.map((data) => {
  const weekly = SETTIMANA[giornoSettimana(data)]!
  return {
    data,
    prima: risolviGiorno({ weekly, exception: null, closures: [] }).ranges,
    dopo: risolviGiorno({ weekly, exception: { ranges: NUOVA }, closures: [] }).ranges,
  }
})

describe('P2 — l’elenco delle differenze sullo scenario di spec 3c §3.2', () => {
  const righe = righeDifferenze(giorni)

  it('CINQUE righe: sabato 10 non cambia e non compare', () => {
    expect(righe.map((r) => r.data)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'])
  })

  it('mercoledì 7 porta DUE segni: perde il pomeriggio e guadagna la mattina', () => {
    expect(righe[2]).toEqual({ data: '2026-10-07', perse: [f(180, 228)], aggiunte: [f(108, 156)] })
  })

  it('giovedì 8 aggiunge un giorno in cui non lavora; lunedì, martedì e venerdì perdono', () => {
    expect(righe[3]).toEqual({ data: '2026-10-08', perse: [], aggiunte: [f(108, 156)] })
    expect(righe[0]!.perse).toEqual([f(180, 228)])
    expect(righe[1]!.perse).toEqual([f(180, 228)])
    expect(righe[4]).toEqual({ data: '2026-10-09', perse: [f(156, 228)], aggiunte: [] })
  })

  it('le frasi, con il verso scritto', () => {
    expect(testoRiga(righe[2]!)).toEqual(['− 15:00–19:00 non più prenotabile', '+ 09:00–13:00 AGGIUNGE la mattina'])
    expect(testoRiga(righe[3]!)).toEqual(['+ 09:00–13:00 AGGIUNGE un giorno in cui non lavorava'])
  })
})

describe('differenzeDelGiorno', () => {
  it('fasce che si toccano: 9–12 più 12–15 contro 9–15 non è una differenza', () => {
    expect(differenzeDelGiorno([f(108, 144), f(144, 180)], [f(108, 180)])).toEqual({ perse: [], aggiunte: [] })
  })
  it('una chiusura nel mezzo spacca in due ciò che si perde', () => {
    expect(differenzeDelGiorno([f(108, 228)], [f(108, 132), f(156, 228)])).toEqual({ perse: [f(132, 156)], aggiunte: [] })
  })
})

describe('P1 — le terne dei conflitti', () => {
  it('una terna per ogni giorno con celle perse, e nessuna per un giorno che solo guadagna', () => {
    const terne = terneDeiConflitti('vera', righeDifferenze(giorni))
    expect(terne.map((t) => t.date)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-09'])
    expect(terne[3]).toEqual({ operator_id: 'vera', date: '2026-10-09', ranges: [[156, 228]] })
  })
  it('disattivazione: ogni data data, giornata intera, anche oltre i 28 giorni', () => {
    const terne = terneTuttoPerso('vera', ['2026-10-08', '2026-12-30'])
    expect(terne).toEqual([
      { operator_id: 'vera', date: '2026-10-08', ranges: [[0, 288]] },
      { operator_id: 'vera', date: '2026-12-30', ranges: [[0, 288]] },
    ])
  })
})
```

  ⚠︎ Il testo «AGGIUNGE la mattina» / «AGGIUNGE un giorno in cui non lavorava»: la seconda si dice quando `prima` è
  vuoto, la prima in ogni altro caso con aggiunte. È la forma dello spec 3c §3.3 con gli orari scritti per intero.

- [ ] **Passo 2: la tavolozza, la validazione, il primo avvio, le frasi.** Le prove, una tabella per file (il
  codice delle prove si scrive come il Passo 1, con i valori qui):

`tests/dominio/tavolozza.test.ts`

| Prova | Afferma |
|---|---|
| le sette tinte | `TAVOLOZZA` = rosa `#F3A4BA`, bianco `#FFFFFF`, albicocca `#FFD8B0`, giallo `#FCE38A`, lilla `#D7C4EC`, azzurro `#BFE3F0`, menta `#C9E7D6`, in quest'ordine |
| ogni tinta è leggibile | `contrasto(INCHIOSTRO, t) >= 7` per tutte e sette (misurato: il minimo è 9,8, il rosa) |
| la tavolozza d'oggi passa | `coloreAmmesso('#FFD8B0', ['#F3A4BA', '#FFFFFF'])` → `{ ammesso: true }` |
| **controesempio 1, chiaro ma fuori tavolozza** | `coloreAmmesso('#FFE9EE', [])` → `fuori_tavolozza` (spec 3c §4.1) |
| **controesempio 2, quasi-nero** | `coloreAmmesso('#2A1A22', [])` → `fuori_tavolozza`; e la funzione interna che decide `illeggibile` lo rifiuta **anche se** lo si aggiunge alla tavolozza in una prova (si esporta `leggibile(colore)` per questo) |
| troppo vicino sotto daltonismo | `coloreAmmesso('#FCE38A', ['#FFD8B0'])` → `{ ammesso: false, motivo: 'troppo_vicino', vicinoA: '#FFD8B0' }` (ΔE 24,3 a vista normale ma **4,85** sotto tritanopia) |
| la soglia daltonica, dai due lati | `coloreAmmesso('#C9E7D6', ['#BFE3F0'])` → `troppo_vicino` (6,51); `coloreAmmesso('#C9E7D6', ['#F3A4BA'])` → ammesso (11,07). Insieme fissano la soglia fra 7,43 e 11,07 (revisione) |
| la soglia | `deltaE('#F3A4BA', '#FFD8B0')` fra 36 e 37; `deltaEPeggioreDaltonico('#FFD8B0', '#FFFFFF')` fra 22 e 23 (M2, script nella scratchpad: lo si riporta nel commento della prova) |
| la propria tinta non conta | `coloreAmmesso('#F3A4BA', ['#FFFFFF'])` → ammesso: chi chiama passa le **colleghe**, non sé stessa (lo fa la Server Action del Task 5) |

`tests/dominio/validazione-disponibilita.test.ts`

| Prova | Afferma |
|---|---|
| esistenza prima dell'ordine | `validaIntervallo(null, '2026-10-01')` → `data_mancante`; `validaIntervallo('2026-10-10', null)` → `data_mancante`; `validaIntervallo('', '2026-10-01')` → `data_mancante` |
| ordine | `validaIntervallo('2026-10-10', '2026-10-05')` → `ordine_invertito` |
| il tetto estremi compresi | `contaGiorni('2026-10-05', '2026-10-05')` = 1; `validaIntervallo('2027-08-01', '2027-09-29')` → `null` (60); `('2027-08-01', '2027-09-30')` → `oltre_il_tetto` (61) |
| attraverso l'ora legale | `contaGiorni('2026-10-20', '2026-11-03')` = 15 (il 25/10 cambia l'ora: il conto è in giorni di calendario, in UTC) |
| confini | `validaFasce([f(0, 288)])` → `null`; `[f(-1, 10)]`, `[f(10, 289)]`, `[f(10.5, 20)]` → `confine_fuori`; `[f(120, 120)]` e `[f(130, 120)]` → `fascia_vuota` |
| le frasi | `fraseNonValido` per ognuno dei cinque, testi: «Manca una data», «La data di fine viene prima di quella d'inizio», «Al massimo 60 giorni alla volta», «Orario non valido», «La fascia finisce prima di cominciare» |

`tests/dominio/primo-avvio.test.ts`

| Prova | Afferma |
|---|---|
| tutto vuoto | `passoDaCuiRiprendere({ categorie: 0, servizi: 0, abbinamenti: 0, attive: [{…Vera, conOrari: false}, {…Annalisa, conOrari: false}] })` = `'categorie'`; `cheCosaManca` = le **tre** frasi: «Non ci sono ancora servizi», «Nessuna operatrice esegue servizi», «Nessuna operatrice ha orari» |
| riprende dal punto giusto (§5.2) | categorie 2, servizi 0 → `'servizi'`; servizi 3, abbinamenti 0 → `'chi_fa_cosa'`; abbinamenti 4 e Vera con orari, Annalisa senza → `'settimana'` |
| la condizione 3 è «nessuna», non «qualcuna» | Vera con orari, Annalisa senza: `cheCosaManca` **non** contiene «Nessuna operatrice ha orari» (lo spec §5.1 dice *nessun* `weekly_availability`); il passo resta `'settimana'` |
| fatto | tutto presente → `'fatto'`, `cheCosaManca` = `[]` |

`tests/dominio/errori-preparazione.test.ts`

| Codice, vincolo | Frase |
|---|---|
| `23P01`, qualunque | «Questa fascia si sovrappone a una che c'è già» |
| `23503`, `service_category_id_fkey` | «Questa categoria ha ancora dei servizi» |
| `23503`, `appointment_service_id_fkey` | «Questo servizio è ancora prenotato» — ⚠︎ **e la prova asserisce che non è la frase del 3a** `messaggioPerSqlstate('23503', 'appointment_service_id_fkey')` |
| `23505`, `operator_service_pkey` | «C'è già» |
| `23505`, `exception_day_operator_id_exception_date_key` | «Una collega ha appena scritto su questo giorno: guarda com'è adesso» |
| `23505`, `operator_auth_user_id_key` | «Questo account è già collegato a un'altra operatrice» |
| `23514`, nessun vincolo (la guardia di `0009` non nomina un vincolo) | «Resterebbe il salone senza nessuna operatrice che può entrare» |
| `23514`, `salon_closure_check` | «La data di fine viene prima di quella d'inizio» — ⚠︎ **mai** la frase della guardia (spec 3c §7.2) |
| `23514`, `salon_closure_al_piu_60_giorni` | «Una chiusura dura al massimo 60 giorni» |
| `23514`, `salon_closure_boundary_pair` / `_boundary_order` | «L'orario della chiusura non è valido» |
| `23514`, `salon_settings_check` | «La chiusura del salone deve venire dopo l'apertura» |
| `23514`, i `check` di durata di `service` e `operator_service` | «La durata deve essere di almeno 5 minuti» |
| `P0004` | «Non ho potuto: ricarica e riprova.» (spec 3c §4.3) |
| `22023` | «Le operatrici sono cambiate: ricarico l'elenco.» |
| `40P01`, `57014`, `22004`, sconosciuto | `RIPROVA` |

- [ ] **Passo 3: i nomi dei vincoli, letti dal catalogo.** I nomi dei `check`, `unique` ed `exclude` anonimi li
  genera Postgres (rapporto sul database: «non stanno nel repo»). `tests/schema/vincoli-noti.test.ts` li **pianta**:

```ts
import { describe, expect, it } from 'vitest'
import { asOwner } from '../helpers/db'
import { VINCOLI_NOTI } from '../../src/dominio/errori-preparazione'

describe('i vincoli a cui le frasi del 3c sono legate esistono con quel nome', () => {
  it('ognuno è nel catalogo', async () => {
    const presenti = await asOwner(async (c) => (await c.query(
      `select conname from pg_constraint where connamespace = 'public'::regnamespace`)).rows.map((r) => r.conname))
    for (const nome of VINCOLI_NOTI) expect(presenti, nome).toContain(nome)
  })
})
```
  **Prima** di scrivere `VINCOLI_NOTI`, la chat esegue quella query (dopo `db reset`, con `0022`) e copia i nomi
  veri: se Postgres ha chiamato un vincolo diversamente dalla tabella del Passo 2, vince il catalogo e la tabella si
  corregge nel registro del task. Così un rinominare in fase 2 arrossisce qui invece di far cadere una frase nel
  ramo generico.

- [ ] **Passo 4: vedere tutto rosso.** `npx vitest run tests/dominio/{differenze,tavolozza,validazione-disponibilita,primo-avvio,errori-preparazione}.test.ts`:
  atteso **5 file falliti, 0 prove** (`Cannot find module`). Il file di schema: rosso sull'import.

- [ ] **Passo 5: il codice.** Le firme sono quelle di *Interfaces*. Le parti che non si possono sbagliare:
  - `differenzeDelGiorno`: `perse = piega(prima) − piega(dopo)` e `aggiunte = piega(dopo) − piega(prima)`, con una
    sottrazione di insiemi di confini fatta **dopo** la piega (altrimenti 9–12 più 12–15 contro 9–15 produce una
    differenza fantasma). `righeDifferenze` tiene **ogni** giorno con `perse` o `aggiunte` non vuoti, in ordine di
    data: nessun raggruppamento (P2).
  - `testoRiga` usa `oraDaConfine` per i due estremi, e il segno `−` (U+2212) e `+`.
  - `contaGiorni` con `Date.UTC` sui pezzi della data, come `sommaGiorni`: mai `new Date('YYYY-MM-DD')` letto in ora
    locale (il commento di `giornoSettimana` spiega perché arrossisce solo in `test:fuso`).
  - `tavolozza.ts`: CIELAB da sRGB con il bianco D65, ΔE76; le tre matrici di Machado (2009) a severità 1 sui valori
    **lineari**, con il risultato **riportato in [0, 1] dopo la matrice** (senza, albicocca/bianco dà 26,06 invece
    di 22,18 e la prova «fra 22 e 23» fallisce: misurato dalla revisione). ⚠︎ Dentro la tavolozza chiusa il ΔE a vista
    normale minimo è 15,76 (azzurro/menta): la clausola «ΔE ≥ 15» oggi non rifiuta niente. Si tiene, per una
    tavolozza che cambi, e la sua mutazione è **dichiarata equivalente**. `coloreAmmesso` controlla, in quest'ordine: appartenenza alla tavolozza (confronto in maiuscolo),
    `leggibile` (≥ 7:1 con l'inchiostro), poi ogni collega: ΔE ≥ 15 **e** il peggiore dei tre daltonici ≥ 10.
  - `frasePreparazione`: un `switch` sul codice e, dentro, sul vincolo. Il ramo `default` restituisce `RIPROVA`
    importata da `errori.ts`, non una copia della stringa.

- [ ] **Passo 6: verdi, anche su fuso americano.** `npx vitest run tests/dominio` e `npm run test:fuso`.

- [ ] **Passo 7: le sonde.**

| # | Mutazione | Prova che deve arrossire | Rosse |
|---|---|---|---|
| 3a | `righeDifferenze` tiene solo i giorni con `aggiunte` | «CINQUE righe» | [da misurare] |
| 3b | `righeDifferenze` tiene solo i giorni con `perse` | «CINQUE righe»; «giovedì 8» | [da misurare] |
| 3c | `differenzeDelGiorno` senza `piega` | «fasce che si toccano» | [da misurare] |
| 3d | `testoRiga` scrive solo la prima differenza | «le frasi, con il verso» | [da misurare] |
| 3e | soglia daltonica `>= 4` | «troppo vicino sotto daltonismo» | [da misurare] |
| 3f | `leggibile` a `>= 3` | «controesempio 2» | [da misurare] |
| 3g | `validaIntervallo` controlla l'ordine prima dell'esistenza | «esistenza prima dell'ordine» | [da misurare] |
| 3h | `contaGiorni` con `new Date(dal + 'T00:00:00')` (ora **locale**) e `Math.ceil` sulla differenza in giorni | «attraverso l'ora legale» **sotto `test:fuso`** | [da misurare] — ⚠︎ `new Date('YYYY-MM-DD')` si legge in UTC per specifica: quella forma sarebbe equivalente |
| 3i | tetto `> 61` | «il tetto estremi compresi» | [da misurare] |
| 3j | `23514` senza vincolo → la frase della chiusura | «nessun vincolo» e «`salon_closure_check`» | [da misurare] |
| 3k | `cheCosaManca` con «qualcuna senza orari» | «la condizione 3 è nessuna» | [da misurare] |

- [ ] **Passo 8: il gate e il commit.**

```
feat(3c): la logica della preparazione

L'elenco delle differenze con una riga per ogni giorno che cambia e il suo
verso (spec 3c §3.3): sullo scenario di §3.2 cinque righe, e mercoledì due
segni. Le terne dei conflitti senza orizzonte. La tavolozza chiusa di sette
tinte chiare col criterio di O3, la validazione delle date con l'esistenza
prima dell'ordine e il tetto di 60 giorni, le tre condizioni del primo avvio,
e le frasi del 3c per nome del vincolo, piantate contro il catalogo.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

**Revisione:** un revisore sul diff.

---

## Task 4 — Disponibilità, e il motore comune delle scritture del 3c

Spec 3c §3 (tutta), §7.1, §7.2, §7.3, §7.5; P1, P2, P3, P4, P5; D3c-14, D3c-21.

**Files:**
- Create: `src/server/scrittura-preparazione.ts`, `src/server/azioni-preparazione.ts`,
  `src/server/lettura-preparazione.ts`, `src/cliente/disponibilita/{settimana-tipo,eccezioni,anteprima}.tsx` e il loro
  `.module.css`, `tests/app/disponibilita.test.ts`, `tests/e2e/disponibilita.spec.ts`
- Modify: `src/app/(salone)/disponibilita/page.tsx` (oggi un segnaposto di 11 righe),
  `tests/dominio/niente-dati-negli-url.test.ts` (`PARAMETRI_AMMESSI` += `operatrice`)

**Interfaces:**
- Consuma: `avvolgi`, `sqlstateDi` (`src/server/involucro.ts`); `conRitentativi`, `POLITICA`
  (`src/dominio/ritentativi.ts`); `TETTO_RITENTATIVI_MS` (`src/server/scrittura-visita.ts:94`);
  `clientServer`, `operatriceCorrente`, `NonAutenticata`, `NonOperatrice` (`src/server/supabase.ts`);
  `serveRicontrolloAccount` (`src/dominio/esiti.ts:67`); `oggiAPerugia` (`src/dominio/perugia.ts:30`);
  `RicaricheDelGiorno` (`src/cliente/diretta.ts:117`); tutto il Task 3; le funzioni del Task 2.
- Produce, per i Task 5 e 6:
  ```ts
  // scrittura-preparazione.ts
  export type EsitoPreparazione =
    | { readonly tipo: 'fatto'; readonly quante?: number }
    | { readonly tipo: 'fallita'; readonly testo: string; readonly ricarica: boolean }
    | { readonly tipo: 'non_valida'; readonly testo: string }
    | { readonly tipo: 'non_so' }
    | { readonly tipo: 'uscita_forzata' }
    | { readonly tipo: 'app_aggiornata' }   // l'app è stata ridispiegata: «Ricarica la pagina»
  export interface OpzioniPreparazione { spiaTentativi?: (n: number) => void; dormi?: (ms: number) => Promise<void>;
    caso?: () => number; adesso?: () => number }
  export async function scrivi(client: SupabaseClient,
    chiamata: () => PromiseLike<{ error: { code?: string; message: string } | null; data: unknown }>,
    o?: OpzioniPreparazione): Promise<EsitoPreparazione>
  export interface Anteprima { readonly righe: RigaDifferenze[]; readonly conflitti: Conflitto3c[] }
  export interface Conflitto3c { readonly data: string; readonly inizio: string; readonly operatrice: string;
    readonly cliente: string; readonly telefono: string | null }
  // lettura-preparazione.ts
  export async function leggiDisponibilita(client: SupabaseClient, operatrice: string, oggi: string): Promise<{
    attiva: boolean; settimana: Fascia[][];   // indice 0 = lunedì, come giornoSettimana
    eccezioni: { id: string; data: string; fasce: Fascia[] }[] }>   // da oggi in poi; fasce [] = assente
  export async function dateConAppuntamenti(client: SupabaseClient, operatrici: readonly string[], oggi: string): Promise<Map<string, string[]>>
  export async function conflittiPer(client: SupabaseClient, terne: readonly Terna[]): Promise<Conflitto3c[]>
  ```

**Il motore `scrivi`, che è il pezzo che non si può sbagliare.** Una sola forma per **tutte** le scritture del 3c
(Task 4, 5, 6), così la politica d'errore di spec 3c §7 vive in un posto:

```ts
export async function scrivi(client, chiamata, o = {}): Promise<EsitoPreparazione> {
  const id = crypto.randomUUID()
  const r = await avvolgi('invio', id, async (): Promise<EsitoPreparazione> => {
    try { await operatriceCorrente(client) }
    catch (e) { if (e instanceof NonAutenticata || e instanceof NonOperatrice) return { tipo: 'uscita_forzata' }; throw e }

    try {
      const { valore } = await conRitentativi(
        async (t) => { o.spiaTentativi?.(t); const x = await chiamata(); if (x.error) throw x.error; return x.data },
        sqlstateDi, o.dormi ?? dormiDavvero, o.caso ?? Math.random, TETTO_RITENTATIVI_MS, o.adesso ?? Date.now)
      return { tipo: 'fatto', quante: typeof valore === 'number' ? valore : undefined }
    } catch (e) {
      const codice = sqlstateDi(e)
      if (codice === null) throw e                       // senza SQLSTATE: l'involucro dà «non so» (C2)
      if (codice === '42501' && (await accountChiuso(client))) return { tipo: 'uscita_forzata' }
      const vincolo = /constraint "([^"]+)"/.exec((e as { message?: string }).message ?? '')?.[1]
      return { tipo: 'fallita', testo: frasePreparazione(codice, vincolo), ricarica: RICARICA.has(codice) }
    }
  })
  // avvolgi restituisce o l'esito del corpo, o una Classe di C2 (src/dominio/errori.ts:35-39).
  switch (r.tipo) {
    case 'annullato': return { tipo: 'fallita', testo: frasePreparazione(r.sqlstate), ricarica: RICARICA.has(r.sqlstate) }
    default:          return r   // 'non_so', 'uscita_forzata', 'app_aggiornata' e gli esiti del corpo
  }
}
```

È uno **schizzo** delle regole, non il codice da copiare: chi esegue legge `src/server/scrittura-visita.ts` (righe
138–189 e 614–617) e scrive `scrivi` con la stessa forma di `chiama`, `account`, `dopoUnErrore`. Le regole:
1. **Il ritentativo è solo su `40P01`**, al massimo tre, entro 7 s dal primo tentativo (C5). È sicuro perché un
   `40P01` annulla sempre la transazione, non perché la scrittura sia idempotente (spec 3c §7.3).
2. **`42501` con l'account chiuso è un'uscita forzata**; con l'account aperto è una frase (come il 3a, Task 4).
3. **Un errore senza SQLSTATE è «non so»**, e la schermata **rilegge e mostra** (spec 3c §7.5): la frase
   «Non so com'è adesso» con un pulsante che ripete la rilettura. Mai un «Riprova» che ripete la scrittura.
4. **La frase viene da `frasePreparazione`** (P4). ⚠︎ **Un'eccezione a 3**, da spec 3c §7.5: `chiudi_sessioni` non
   ha stato leggibile (`auth.sessions` non è leggibile dall'app), quindi dopo un «non so» la frase è «Non so se le ho
   chiuse: ripremi, è innocuo» e il pulsante resta. Lo usa il Task 5. `RICARICA` = `{'23505', '22023', 'P0004'}`: la schermata si
   rilegge da sé.
5. Nessun registro degli invii e nessun «Controlla» (spec 3c §7.1): le scritture del 3c **ripetute danno lo stesso
   stato** o un errore leggibile (§7.4), tranne gli inserimenti, che con D3c-15 si rileggono.

**La schermata.** `/disponibilita?operatrice=<id>` (di difetto: io). Due schede, **Settimana tipo** ed **Eccezioni**
(spec 3c §3.1). Telefono verticale, 375–430 punti, niente trascinamento delle fasce (L3c-1).

- **Settimana tipo:** sette righe, lunedì–domenica, ciascuna con le fasce scritte («09:00–13:00, 15:00–19:00») o
  **«non lavora»**. Toccare un giorno apre l'editor delle fasce: righe «dalle – alle» con `<select>` a passi di
  5 minuti (00:00–24:00), «Aggiungi fascia», «Togli». Poi **«Vedi che cosa cambia»** (anteprima), poi **«Salva»**.
- **Eccezioni:** l'elenco delle eccezioni **da oggi in poi**, ciascuna con data e fasce o «assente». «Nuova
  eccezione»: **un giorno** (precompilato con il giorno **risolto**, così «esco alle 16» è togliere un pezzo — spec
  3c §12.8 e O12) o **più giorni** (dal–al, «assente» oppure le fasce; **niente** precompilazione, L3c-2). Ogni
  eccezione si può cancellare, con la sua anteprima: cancellarla **riporta** la settimana tipo, che può aggiungere o
  togliere.
- **L'anteprima, sempre prima di scrivere** (spec 3c §3.3): una riga per **ogni** giorno che cambia, con `testoRiga`
  (P2); per la settimana tipo, una riga per il giorno della settimana («ogni martedì: − 15:00–19:00 …»). Sotto, i
  **conflitti**: data, ora, cliente, telefono (o «nessun telefono»), **senza orizzonte** (P1). Per **una**
  operatrice: una riga per giorno, sempre (P2). Il riassunto per operatrice, apribile, vale **solo** per le
  scritture di spec 3c §3.3 che toccano tutte le operatrici o tutte le date: chiusura del salone (Task 6) e
  disattivazione (Task 5).
  Poi «Salva comunque» o «Annulla». Salvare **non** sposta niente (D3c-4): gli appuntamenti restano in agenda,
  fuori orario.

**Come si calcola l'anteprima, lato server** (`lettura-preparazione.ts`):
1. `oggi = oggiAPerugia()` — sul Worker l'ora del server è UTC, e `oggiAPerugia` usa `Intl` con `Europe/Rome`.
2. Le date da guardare: per un'eccezione, le date dell'intervallo; per la settimana tipo, **le date future con
   appuntamenti** dell'operatrice in quel giorno della settimana (`dateConAppuntamenti`: `appointment`, colonne
   `operator_id, appointment_date`, filtro `appointment_date >= oggi`; nessun dato di cliente nell'indirizzo).
3. `availability_window(oggi, ultima data, [operatrice])` una volta; per ogni data, `prima = risolviGiorno(…)`
   com'è e `dopo = risolviGiorno(…)` con la modifica; `righeDifferenze`; `terneDeiConflitti`; `conflitti` in
   `rpc` (corpo, non indirizzo).
4. ⚠︎ `availability_window` **filtra le disattivate** (`0012`, righe 57 e 85): l'anteprima di un'operatrice
   disattivata è vuota, e la schermata lo dice («È disattivata: riattivala per cambiarne gli orari»).

**Le scritture:** `salvaGiornoSettimana(operatrice, giorno, fasce)` → `scrivi(client, () => client.rpc('scrivi_giorno_settimana', …))`;
`salvaEccezione(operatrice, data, fasce | null)` → `write_exception_day`; `salvaEccezioni(operatrice, dal, al, fasce | null)`
→ **prima** `validaIntervallo` e `validaFasce` (Task 3; `non_valida` con `fraseNonValido`), poi `write_exception_days`
(o l'involucro del Task 2 Passo 6); `cancellaEccezione(id)` → `from('exception_day').delete().eq('id', id)`.
Le fasce si **piegano** prima di scrivere (spec 3c §7.2: 9–13 più 12–15 sono 9–15, e il `23P01` non nasce).

- [ ] **Passo 1: le prove sui corpi, prima del codice.** `tests/app/disponibilita.test.ts`, con `vera()` /
  `annalisa()` come `tests/app/scrittura.test.ts`, chiamando i **corpi** (mai il guscio `'use server'`):

| Prova | Afferma |
|---|---|
| salva il martedì di Vera | `fatto`, `quante: 2`; il martedì di Annalisa invariato (letto da proprietario) |
| fasce che si toccano si salvano piegate | `[[108,144],[144,180]]` → una riga `[108,180]` |
| `23P01` impossibile dall'app | fasce sovrapposte inviate **senza** piega (opzione di prova) → `fallita`, «Questa fascia si sovrappone…»; con la piega → `fatto` |
| intervallo di 61 giorni | `non_valida`, «Al massimo 60 giorni alla volta», e **nessuna** riga scritta |
| intervallo con la data finale mancante | `non_valida`, «Manca una data» |
| **l'anteprima sullo scenario di §3.2** | settimana di Vera come nel Task 3, intervallo 5–10 ottobre 2026 a 9–13: **5 righe**, la terza con due segni |
| **P1 nell'anteprima** | un appuntamento di Vera **il primo martedì da `sommaGiorni(oggi, 40)` in poi**, alle 15:00; anteprima «martedì senza pomeriggio» → il conflitto c'è, con «Maria Rossi» e il telefono |
| **la precedenza di spec §6.6 nell'anteprima** | lo stesso martedì ha un'**eccezione** 09:00–19:00: cambiare la settimana tipo del martedì **non** dà né riga né conflitto per quella data (l'eccezione la sostituisce); e una **chiusura** di salone su un altro martedì con appuntamento: nemmeno lì. Positiva: un terzo martedì senza eccezione dà la riga |
| `23P01` su un'eccezione | due fasce sovrapposte inviate senza piega a `salvaEccezione` → «Questa fascia si sovrappone…» (il vincolo è su `exception_range`, chiavato sul giorno) |
| positiva accanto al vuoto | stessa anteprima con l'appuntamento alle 10:00 → **zero** conflitti, e la riga del martedì c'è |
| `40P01` ritentato | con `spiaTentativi` e un `40P01` provocato come in `tests/app/ritentativi-veri.test.ts` → `fatto` dopo 2 tentativi |
| errore senza SQLSTATE | `chiamata` che rifiuta con `new Error('rete')` → `non_so` |
| account chiuso | Vera disattivata da proprietario fra lettura e scrittura → `uscita_forzata` |
| `23505` concorrente su un giorno | una transazione aperta da `connect()` inserisce lo stesso `exception_day` e **non committa**; si lancia `salvaEccezione`; si aspetta di vederla bloccata (`pg_stat_activity`, `wait_event_type = 'Lock'`, al più 5 s); si committa → `fallita` con «Una collega ha appena scritto…» e `ricarica: true`. ⚠︎ Due `Promise.all` via PostgREST **non** si scontrano quasi mai: transazioni di millisecondi (revisione, B10) |
| P5 | nessuna riga nuova in `annuncio` dopo le quattro scritture |

- [ ] **Passo 2: le prove e2e**, `tests/e2e/disponibilita.spec.ts`, con l'imbracatura di `tests/e2e/aiuti.ts`
  (`pulisci`, `telefono`, `creaVisita`, `apriAgenda`, `giornoDiProva`):

| Prova | Afferma |
|---|---|
| **prova 6** (spec 3c §10.3; §9.10 H3 in locale) | `creaVisita` con Vera alle 15:00 su `giornoDiProva()`; dal telefono di Vera: Disponibilità → Eccezioni → più giorni, da quel giorno a cinque giorni dopo, 09:00–13:00 → l'anteprima ha **una riga per giorno** (sei con gli orari di `pulisci`: lun–sab 09:00–13:00 e 14:00–19:00) e **il conflitto con il nome e il telefono**; «Salva comunque» → l'agenda di quel giorno mostra **ancora** l'appuntamento |
| la settimana tipo | togliere il pomeriggio del giorno della settimana di `giornoDiProva()` → l'anteprima elenca il conflitto; salvare; l'agenda mostra il giorno a 09:00–13:00 |
| l'altro telefono | Annalisa ha l'agenda di quel giorno aperta; Vera salva l'eccezione; il telefono di Annalisa simula il ritorno in primo piano **come fa `tests/e2e/tempo.spec.ts:40-44`** e mostra la disponibilità nuova **entro 10 s** (limite sotto i 60 s del ripiego: vincoli globali) |
| axe | la scheda Settimana tipo e l'anteprima aperta, dopo la fine delle animazioni, nessuna violazione |

- [ ] **Passo 3: vederle rosse**, con i numeri veri (import non risolti → file falliti).
- [ ] **Passo 4: il codice** — motore, letture, azioni, schermata — fino al verde dei Passi 1 e 2.
- [ ] **Passo 5: le sonde.**

| # | Mutazione | Prova che deve arrossire | Rosse |
|---|---|---|---|
| 4a | `dateConAppuntamenti` limitata a `sommaGiorni(oggi, 28)` | «P1 nell'anteprima» | [da misurare] |
| 4b | niente piega prima di scrivere | «fasce che si toccano» | [da misurare] |
| 4c | `scrivi` senza `conRitentativi` | «`40P01` ritentato» | [da misurare] |
| 4d | `scrivi` mappa i codici con `messaggioPerSqlstate` del 3a | «`23505` concorrente»; «`23P01` impossibile» | [da misurare] |
| 4e | niente ricontrollo dell'account su `42501` | «account chiuso» | [da misurare] |
| 4f | anteprima senza `righeDifferenze` (solo i conflitti) | «l'anteprima sullo scenario di §3.2» | [da misurare] |
| 4g | il ritorno in primo piano non rilegge (si spegne il gestore in `diretta.ts`) | e2e «l'altro telefono» **entro 10 s** | [da misurare] |

- [ ] **Passo 6: il gate e il commit** `feat(3c): la disponibilità, e il motore delle scritture della preparazione`
  (corpo: l'anteprima sempre prima di scrivere, P1 e P2, il motore unico e le sue cinque regole; la riga
  `Co-Authored-By`).

**Revisione:** un revisore sul diff.

---

## Task 5 — Impostazioni → Operatrici (rigore pieno)

Spec 3c §4 (tabella), §4.1 letta con D3c-9 e O3, §4.2, §4.3, §4.4, §7.3, §7.4 righe 11–15; D3c-11, D3c-16.
È la sezione dove si chiudono sessioni e si tolgono accessi: **rigore pieno**.

**Files:**
- Create: `src/app/(salone)/impostazioni/operatrici/page.tsx`, `src/cliente/impostazioni/operatrici.tsx` e il suo
  `.module.css`, `tests/app/operatrici.test.ts`, `tests/e2e/operatrici.spec.ts`
- Modify: `src/app/(salone)/impostazioni/page.tsx` (diventa l'indice: Operatrici, Categorie e servizi, Il salone,
  **Dati delle clienti** — quest'ultima è un segnaposto con la frase «Arriva con il prossimo pezzo dell'app»: la
  costruisce il piano 4, che le dà quel nome, spec piano 4 r. 2314); `src/server/azioni-preparazione.ts`,
  `src/server/scrittura-preparazione.ts`, `src/server/lettura-preparazione.ts`

**Interfaces:**
- Consuma: `scrivi`, `EsitoPreparazione`, `conflittiPer`, `dateConAppuntamenti` (Task 4); `coloreAmmesso`,
  `TAVOLOZZA`, `terneTuttoPerso` (Task 3); `riordina_operatrici` (Task 2); `public.chiudi_sessioni(uuid)` e
  `public.list_auth_accounts()` (`0015`, `0011`).
- Consuma anche, per le prove: `asOperatorCommit<T>(authUid: string, fn: (c: pg.Client) => Promise<T>): Promise<T>`
  (`tests/helpers/db.ts:118`), `asOperatorConSessione(authUid, sessionId, fn)` (`:151`), `accedi(email, password?)`
  → `Sessione` con `accessToken` e `sessionId` (`tests/helpers/sessioni.ts:87`).
- Produce: le azioni `aggiungiOperatrice(nome, colore)`, `cambiaColore(id, colore)`, `riordina(ids)`,
  `collega(id, authUserId)`, `scollega(id)`, `disattiva(id)`, `riattiva(id)`, `chiudiSessioni(id)` e le letture
  `leggiOperatrici()` → `{ id, nome, colore, attiva, ordine, stato: 'non_collegata' | 'collegata' | 'orfana',
  email: string | null, io: boolean }[]`.

**Che cosa fa la schermata.** Una riga per operatrice, in ordine: pallino del colore, nome, «tu» sulla propria,
«disattivata» se lo è, l'email collegata o **«Non collegata»** o **«Collegata a un account che non esiste più»**
(lo stato si risolve contro `list_auth_accounts()`, non contro la sola colonna: spec 3c §4.3). Azioni:
- **Su / Giù** → `riordina` con l'elenco **intero** (P3). `22023` → «Le operatrici sono cambiate: ricarico
  l'elenco.» e la schermata si rilegge.
- **Colore** → le sette tinte di `TAVOLOZZA`; quelle che `coloreAmmesso(t, colori delle colleghe ATTIVE)` rifiuta
  sono spente con la ragione («troppo simile al colore di Vera»). La Server Action **rifà lo stesso controllo** sul
  dato letto in quel momento: lo schermo non è una garanzia. Un cambio di colore non chiude sessioni (`0015`: il
  trigger è `after update of is_active, auth_user_id`) — lo presidia già `tests/schema/chiusura-sessioni.test.ts`.
- **Aggiungi** → nome e colore (il primo ammesso è proposto); `is_active` vero, `sort_order` in coda, non collegata.
  Senza unicità (D3c-15): dopo una risposta persa si rilegge e si mostra.
- **Collega** → scelta fra gli account di `list_auth_accounts()` **non già collegati**. `23505` su
  `operator_auth_user_id_key` → «Questo account è già collegato a un'altra operatrice». ⚠︎ **Il primo collegamento
  non si fa dall'app** (spec 3c §4.4): finché nessuna è collegata, nessuna può entrare. Lo fa §9.6 D4.
- **Scollega** e **Disattiva**, anche sulla **propria** riga (D3c-16), con la conferma. Prima di disattivare,
  l'anteprima dei conflitti su **tutte le date future** (`terneTuttoPerso`), riassunta per giorno (spec 3c §4.2). La
  conferma sulla propria riga aggiunge: «**Uscirai subito dall'app** e potrà farti rientrare solo una collega.» La
  guardia (`0009`/`0021`) rifiuta l'ultima attiva collegata con `23514` senza vincolo → «Resterebbe il salone senza
  nessuna operatrice che può entrare».
- **Riattiva** → la conferma dice «Riattivarla chiude le sue sessioni: dovrà rientrare» (`0015`).
- **Chiudi tutte le sessioni** (D3-14, spec 3c §4.3): solo sulle **altre** righe e solo se **collegate**. Conferma.
  Esito: «N sessioni chiuse» o «Nessuna sessione aperta». `P0004` → «Non ho potuto: ricarica e riprova.» Sulla riga
  **orfana** il pulsante non c'è e c'è «Collega» (il caso che `0009` misura raggiungibile).

⚠︎ **La misura che decide la forma della disattivazione propria, da fare per prima (Passo 1).** La revisione l'ha
già fatta su un banco che riproduce gli oggetti (non PostgREST): **riesce**, una riga, e la sessione si chiude dopo;
`(select app.is_active_operator())` si valuta una volta, sull'istantanea d'inizio comando, prima della scrittura.
Il Passo 1 la conferma sul Supabase locale. Sulla propria riga
`update operator set is_active = false` deve passare la politica `with check ((select app.is_active_operator()))`:
la funzione è `stable` e legge `operator` **dentro lo stesso comando**. Se vede la riga **prima** dell'aggiornamento,
la scrittura riesce e poi il trigger chiude la sessione; se la vede **dopo**, la scrittura fallisce con `42501`.
Nessuno l'ha misurato. Se fallisce, D3c-16 **non è realizzabile con un aggiornamento semplice**: ci si ferma e si
porta all'orchestratrice la scelta fra una funzione `security definer` (con la sua revisione a rigore pieno) e il
ritorno a «lo fa una collega», da chiedere all'utente.

- [ ] **Passo 1: la misura** (`tests/app/operatrici.test.ts`, prima prova del file): Vera si disattiva da sola via
  PostgREST con il proprio token → si trascrive l'esito (`204` con una riga, o `42501`). Poi la stessa cosa per lo
  scollegamento (`auth_user_id = null`). Da qui la forma del resto.

- [ ] **Passo 2: le prove sui corpi.**

| Prova | Afferma |
|---|---|
| Vera disattiva Annalisa | `fatto`; il token di Annalisa riceve **zero** righe da `operator` (sessione chiusa dal trigger); **controllo positivo**: prima della disattivazione ne riceveva tre |
| **D3c-16**: Vera si disattiva da sola | l'esito del Passo 1; poi la lettura successiva di Vera dà `uscita_forzata` |
| la guardia | con Alessandra e Annalisa disattivate da proprietario, Vera che si disattiva → `fallita`, «Resterebbe il salone…»; Vera **resta** attiva |
| **due disattivazioni concorrenti** (spec 3c §10.2) | Vera disattiva Alessandra e Annalisa disattiva Vera nello stesso istante (`Promise.all`, due client): **almeno un lato** ha un esito, **resta almeno un'operatrice attiva collegata**, e se c'è un `40P01` è stato ritentato (`spiaTentativi`) |
| scollegare una collega | `fatto`; il suo token riceve zero righe |
| riattivare | `fatto`; le sessioni della riattivata sono chiuse (`0015`): il suo token vecchio riceve zero righe |
| collegare a un account già collegato | `fallita`, «Questo account è già collegato…» |
| chiudere le sessioni di Annalisa | `fatto`, `quante >= 1`; il token di Annalisa riceve zero righe; il token di Vera **continua** a ricevere tre righe |
| chiudere le sessioni di una non collegata | `fatto`, `quante: 0` → la frase «Nessuna sessione aperta» |
| chiudere le sessioni di un'orfana (`auth_user_id` = uuid che non esiste, scritto da proprietario) | `quante: 0`; e `leggiOperatrici()` dà `stato: 'orfana'` |
| chiudere le proprie sessioni | la lettura non offre il pulsante; la chiamata diretta → `fallita` con la frase di `P0004` |
| risposta persa su «Chiudi tutte le sessioni» | `chiamata` che rifiuta senza SQLSTATE → `non_so`, e la schermata dice «Non so se le ho chiuse: ripremi, è innocuo» (spec 3c §7.5) |
| chi chiama è stata disattivata nel frattempo | `uscita_forzata` (non `P0004`: il ricontrollo dell'account viene prima della frase) |
| colore troppo vicino | Alessandra albicocca, Vera chiede il giallo per sé → `non_valida`, «troppo simile al colore di Alessandra»; nessuna scrittura |
| colore ammesso | Vera chiede il lilla → `fatto`; le sessioni di Vera **non** sono chiuse |
| riordinare con un elenco stantio | una quarta operatrice aggiunta da proprietario dopo la lettura → `fallita`, «Le operatrici sono cambiate…», `ricarica: true` |
| aggiungere | `fatto`; la nuova è attiva, non collegata, in coda; `leggiGiorno` (`src/server/lettura-giorno.ts`) la restituisce come colonna |

  Ogni prova che modifica `color` o `sort_order` **con commit** li rimette nel proprio `finally`: `resetData()` non
  lo fa (`tests/helpers/db.ts:238-240`).

- [ ] **Passo 3: le prove e2e**, `tests/e2e/operatrici.spec.ts`. ⚠︎ Queste prove **chiudono le sessioni salvate**
  di **tutte e due**: Annalisa (H5, H5-bis) e Vera (D3c-16, e poi `pulisci()` che la riattiva, cioè `false→true`, che
  le richiude). Si **esporta** `accedi` da `tests/e2e/preparazione.ts:47` (oggi non è esportata) e in `afterEach`
  si rifanno **tutti e due** gli stati; anche **fra** H5 e H5-bis, che altrimenti parte con la sessione già morta.
  Senza, le prove dei file successivi falliscono per la ragione sbagliata (revisione, B8). E nella prova del colore
  il colore di Vera si rimette in un `finally`: `resetData()` non lo fa, e `tests/schema/preparazione.test.ts`
  arrossirebbe alla passata successiva.

| Prova | Afferma |
|---|---|
| H5 in locale | Vera → Impostazioni → Operatrici → Annalisa → «Chiudi tutte le sessioni» → «1 sessione chiusa» (o il numero); il telefono di Annalisa, ricaricato, **torna alla pagina d'accesso** — ⚠︎ «non mostra più niente» è l'esito **sbagliato** (spec §4.4) |
| H5-bis in locale | Vera disattiva Annalisa; il telefono di Annalisa, ricaricato, torna all'accesso. ⚠︎ Con `0015` la disattivazione **chiude anche** la sessione, quindi questa prova **non isola** il controllo `is_active` del middleware: lo presidiano le prove d'identità del 3a-2 (`tests/app/identita.test.ts`). Dichiarato |
| H8 in locale | Annalisa e Alessandra disattivate (da proprietario); Vera tenta di disattivarsi → la frase della guardia, e resta dentro |
| D3c-16 | Vera si disattiva con la conferma → è sulla pagina d'accesso; rientrare con le sue credenziali → «Questo account non è attivo…» (frase del 3a-2, Task 3) |
| il colore | Vera sceglie il lilla → la sua colonna in agenda ha il riempimento `#D7C4EC` e il **bordo d'inchiostro** (attributi `fill` e `stroke` del `<rect>`, `src/cliente/agenda-colonne.tsx:75-85`) |
| axe | la schermata con una riga orfana e una disattivata |

- [ ] **Passo 4: vederle rosse.** — [ ] **Passo 5: il codice.** — [ ] **Passo 6: verdi.**
- [ ] **Passo 7: le sonde (rigore pieno).**

| # | Mutazione | Prova che deve arrossire | Rosse |
|---|---|---|---|
| 5a | la lettura offre «Chiudi tutte le sessioni» anche sulla propria riga | «chiudere le proprie sessioni» | [da misurare] |
| 5b | lo stato `orfana` calcolato dalla sola colonna (`auth_user_id is not null` → `collegata`) | «orfana» | [da misurare] |
| 5c | `scrivi` senza ricontrollo dell'account | «chi chiama è stata disattivata nel frattempo» | [da misurare] |
| 5d | `23514` senza vincolo mappato come la chiusura | «la guardia» | [da misurare] |
| 5e | `coloreAmmesso` chiamato con **tutte** le operatrici, compresa sé | «colore ammesso» (la propria tinta la rifiuterebbe) | [da misurare] |
| 5f | il controllo del colore solo nel client, non nella Server Action | «colore troppo vicino» | [da misurare] |
| 5g | `riordina` scritto come N aggiornamenti di `sort_order` | «riordinare con un elenco stantio» | [da misurare] |
| 5h | disattivare senza anteprima | e2e/prova: l'anteprima dei conflitti compare prima della conferma | [da misurare] |
| 5i | `afterAll` senza rifare lo stato di Annalisa | le prove del file e2e successivo (**rosse per la ragione giusta**: dimostra che il rifacimento serve) | [da misurare] |

- [ ] **Passo 8: il gate e il commit** `feat(3c): le operatrici, i colori e «Chiudi tutte le sessioni»` (corpo:
  D3c-16 con l'esito della misura del Passo 1, i tre stati del collegamento, la guardia, la tavolozza chiusa).

**Revisione, a rigore pieno:** due revisori. **Lente 1, sessioni e accesso**: ogni percorso che chiude o non chiude
una sessione, misurato con token veri sul database locale (dopo aver chiesto all'utente se è libero), e i casi in
cui un'operatrice resta dentro quando dovrebbe uscire o il salone resta fuori. **Lente 2, mutazioni**: le nove sonde
più le proprie.

---

## Task 6 — Categorie e servizi, il salone, il primo avvio

Spec 3c §4.5, §4.6, §5, §7.4 righe 7–10 e 16–24; D3c-14, D3c-15.

⚠︎ **Prima di cominciare:** se a questo punto la consegna è in ritardo, l'orchestratrice chiede all'utente se passare
alla fase 2 la modifica e la cancellazione di categorie e servizi (vedi «L'ordine dei task»). La risposta si scrive
in testa al registro del task.

**Files:**
- Create: `src/app/(salone)/impostazioni/catalogo/page.tsx`, `src/app/(salone)/impostazioni/salone/page.tsx`,
  `src/app/(salone)/primo-avvio/page.tsx`, `src/cliente/impostazioni/{catalogo,salone}.tsx`,
  `src/cliente/primo-avvio.tsx` e i `.module.css`, `tests/app/catalogo.test.ts`, `tests/app/salone.test.ts`,
  `tests/e2e/primo-avvio.spec.ts`
- Modify: `src/app/(salone)/agenda/page.tsx` (lo stato vuoto di spec 3c §5.1 sopra l'agenda, con il rimando al
  primo avvio — ⚠︎ **non** `src/cliente/agenda-colonne.tsx`), `src/server/{azioni,scrittura,lettura}-preparazione.ts`,
  `tests/e2e/aiuti.ts` (un aiuto `svuotaCatalogo()` che, dopo `pulisci()`, toglie servizi, categorie **e
  `weekly_availability`**: `pulisci()` scrive gli orari di tutte e tre, e senza toglierli «Nessuna operatrice ha
  orari» non compare mai — revisione, B9)

**Interfaces:**
- Consuma: `scrivi`, `conflittiPer`, `dateConAppuntamenti` (Task 4); `passoDaCuiRiprendere`, `cheCosaManca`,
  `validaIntervallo`, `frasePreparazione` (Task 3); l'editor della settimana tipo del Task 4 (si riusa, non si copia).
- Produce: `leggiStatoPreparazione()` → `StatoPreparazione` (Task 3), per la pagina dell'agenda e per il primo
  avvio.

**Catalogo.** Categorie: nome, ordine, cancellazione **solo se vuote** (il pulsante c'è sempre; il rifiuto
`23503` su `service_category_id_fkey` ha la sua frase). Servizi: nome, categoria, durata e pausa in minuti
(multipli di 5; `default_duration_cells > 0`, `buffer_after_cells >= 0`), **chi lo esegue** (una spunta per
operatrice, con la durata propria facoltativa: `operator_service.duration_cells`, nullo = quella del servizio),
ordine, disattivazione. Cancellare un servizio prenotato → `23503` su `appointment_service_id_fkey` → «Questo
servizio è ancora prenotato» (P4) e la proposta di **disattivarlo**. Togliere «chi lo esegue» con appuntamenti futuri
è ammesso (spec 3c §7.4 riga 22–24: il cercaposti smette di proporre, gli appuntamenti restano).

**Il salone.** Orario: apertura e chiusura (`salon_settings`, `check (day_end_boundary > day_start_boundary)`): si
stringe **liberamente**, perché la griglia si allarga su ciò che c'è (spec §9.1, spec 3c §4.6). Chiusure:
l'elenco da oggi in poi; «Nuova chiusura»: dal–al (al massimo 60 giorni, D3c-14), giornata intera oppure dalle–alle,
**motivo obbligatorio** con accanto «*niente nomi di clienti*» (è l'unico testo libero dell'app). Prima di salvare,
l'anteprima dei conflitti per **tutte** le operatrici attive su quelle date (spec 3c §3.3, presentazione «riassunto
per operatrice»). Cancellare una chiusura: con conferma.

**Il primo avvio** (`/primo-avvio`). Quattro passi: **categorie → servizi → chi fa che cosa → la settimana tipo di
ciascuna**. Si apre al passo di `passoDaCuiRiprendere` (spec 3c §5.2): il punto d'interruzione si **ricava dai
dati**, non si conserva. Ogni passo **mostra ciò che c'è già** (spec 3c §5.4). «Esci» in ogni momento torna
all'agenda. Presuppone le tre operatrici di `0001` e la riga di `salon_settings` (spec 3c §5.5), e un'operatrice
collegata (§9.6 D4). Nella pagina dell'agenda, se `cheCosaManca` non è vuoto, sopra la griglia le frasi e il
collegamento «Prepara il salone».

- [ ] **Passo 1: le prove sui corpi.**

| Prova | Afferma |
|---|---|
| cancellare una categoria vuota | `fatto` |
| cancellare una categoria con servizi | `fallita`, «Questa categoria ha ancora dei servizi»; la categoria c'è ancora |
| cancellare un servizio prenotato | `fallita`, «Questo servizio è ancora prenotato» — ⚠︎ **e non** «Il servizio o l'operatrice non esiste più» |
| spuntare due volte «Alessandra esegue Refill» (schermata stantia) | la seconda `fallita`, «C'è già», `ricarica: true` |
| durata 0 | `non_valida` dall'app; e se forzata, `fallita` «La durata deve essere di almeno 5 minuti» |
| togliere «chi lo esegue» con un appuntamento futuro | `fatto`, l'appuntamento resta (letto da proprietario) |
| l'orario del salone stretto oltre un appuntamento | `fatto`; `leggiGiorno` restituisce ancora l'appuntamento e la finestra verticale lo contiene (spec §9.1) |
| orario con chiusura prima dell'apertura | `fallita`, «La chiusura del salone deve venire dopo l'apertura» |
| chiusura di 61 giorni | `non_valida` dall'app; forzata, `fallita` «Una chiusura dura al massimo 60 giorni» |
| chiusura con le date invertite, forzata | `fallita`, «La data di fine viene prima di quella d'inizio» — **mai** la frase della guardia |
| chiusura con un appuntamento dentro | l'anteprima elenca il conflitto con nome e telefono; **positiva**: una chiusura in un giorno senza appuntamenti ha zero conflitti |
| motivo vuoto | `non_valida`, «Scrivi il motivo della chiusura» |
| lo stato della preparazione | dopo `svuotaCatalogo`: `cheCosaManca` = le tre frasi; dopo una categoria: passo `servizi` |

- [ ] **Passo 2: le prove e2e**, `tests/e2e/primo-avvio.spec.ts`:

| Prova | Afferma |
|---|---|
| **prova 8** (spec 3c §10.3; §9.10 H2 in locale) | `svuotaCatalogo()`; Vera apre l'agenda → le **tre** frasi di §5.1 e «Prepara il salone»; primo avvio al passo «categorie»; crea «Unghie»; **Esci** → agenda; rientra → riparte da **«servizi»** e mostra «Unghie»; completa i quattro passi; l'agenda non mostra più nessuna frase |
| la chiusura | Impostazioni → Il salone → una chiusura di tre giorni su `giornoDiProva()` con un appuntamento → l'anteprima ha il conflitto; salvare; l'agenda di quel giorno dice salone chiuso e mostra l'appuntamento |
| axe | il primo avvio al passo «chi fa che cosa»; l'anteprima di una chiusura |

- [ ] **Passo 3: rosse.** — [ ] **Passo 4: il codice.** — [ ] **Passo 5: verdi.**
- [ ] **Passo 6: le sonde.**

| # | Mutazione | Prova che deve arrossire | Rosse |
|---|---|---|---|
| 6a | il primo avvio riparte sempre dal passo 1 | e2e «prova 8», rientro | [da misurare] |
| 6b | la chiusura senza anteprima | «chiusura con un appuntamento dentro» | [da misurare] |
| 6c | l'anteprima delle chiusure solo per l'operatrice corrente | idem, con l'appuntamento di Annalisa | [da misurare] |
| 6d | `23503` con la frase del 3a | «cancellare un servizio prenotato» | [da misurare] |
| 6e | lo stato vuoto con «qualcuna senza orari» | «lo stato della preparazione» | [da misurare] |

- [ ] **Passo 7: il gate e il commit** `feat(3c): il catalogo, il salone e il primo avvio`.

**Revisione:** un revisore sul diff.

---

## Task 7 — Le procedure, la copia e il ripristino (rigore pieno sul «telefono perso»)

Spec 3c §8 (tutta), §9.12, §9.14, §14.2 misure 7 e 8; D3c-12, D3c-20, D3c-22, D3c-24, O8.

**Perché qui e non nel Task 8.** Il «telefono perso» e il ripristino sono procedure da eseguire **sotto stress**, da
persone che non scrivono codice. Si scrivono **prima** dell'apertura e si **provano** prima dell'apertura: il primo
sul database locale con una prova automatica, il secondo su `avstyle-prova`, il progetto usa-e-getta del Task 1.

**Files:**
- Create: `tests/schema/telefono-perso.test.ts`, `scripts/copia.mjs`, `scripts/ripristina.mjs`,
  `docs/procedure/telefono-perso.md`, `docs/procedure/richiesta-dati.md`, `docs/procedure/copia-e-ripristino.md`,
  `docs/procedure/dispiegamento.md`, `docs/procedure/apertura.md`

**Interfaces:**
- Consuma: `asOperatorCommit<T>(authUid, fn)` (`tests/helpers/db.ts:118`, con commit),
  `asOperatorConSessione(authUid, sessionId, fn)` (`:151`), `asOwner` (`:165`, senza transazione); `accedi(email,
  password?)` → `Sessione { accessToken, sessionId, … }` (`tests/helpers/sessioni.ts:87`), `sessioneDi(authUid)`
  (`:117`, in cache), `dimenticaSessioni()` (`:145`), `preparaAccountLocali()` (`:29`, **una volta per modulo**),
  `PASSWORD_PROVA`; il progetto `avstyle-prova`.
- Produce: le cinque procedure, che il Task 8 esegue; `node scripts/copia.mjs <cartella fuori dal repo>` e
  `node scripts/ripristina.mjs <file>` con l'indirizzo del database **nella variabile `DATABASE_URL`, digitata
  dall'utente nel proprio terminale**, mai scritta in un file.

### 7.1 Il «telefono perso», eseguito sul database locale

La procedura di spec 3c §8.3 in **nove passi**, nell'ordine **invertito** rispetto a 3a §4.7: prima la password,
poi le sessioni (spec 3c §8.2 spiega la finestra che l'ordine vecchio lascia aperta). La prova la esegue **come la
eseguirebbe la dashboard**, cioè da proprietario, dopo che «il ladro» ha fatto il peggio che spec 3c §8.4 elenca.

- [ ] **Passo 1: la prova, prima di tutto il resto.** `tests/schema/telefono-perso.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { asOperatorCommit, asOperatorConSessione, asOwner, pgCode, resetData, VERA, ANNALISA, ALESSANDRA, VERA_AUTH, ANNALISA_AUTH, ALESSANDRA_AUTH } from '../helpers/db'
import { accedi, dimenticaSessioni, preparaAccountLocali, PASSWORD_PROVA, sessioneDi } from '../helpers/sessioni'

const EMAIL_VERA = 'vera@example.test'
const NUOVA = 'nuova-passphrase-di-prova'

describe('spec 3c §8.3 — il telefono di Vera è perso', () => {
  // preparaAccountLocali() gira UNA volta per modulo (tests/helpers/sessioni.ts:33): la password
  // cambiata dal passo 1 va rimessa a mano, o la prova seguente non accede (revisione, B7).
  afterEach(async () => {
    await asOwner((c) => c.query(
      `update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf', 8)) where email = $1`,
      [EMAIL_VERA, PASSWORD_PROVA]))
    dimenticaSessioni()
  })
  beforeEach(async () => {
    await resetData(); await preparaAccountLocali(); dimenticaSessioni()
    await asOwner((c) => c.query(
      `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
       select o, d, 108, 228 from unnest($1::uuid[]) o cross join generate_series(0, 5) d`, [[VERA, ANNALISA, ALESSANDRA]]))
  })

  it('i nove passi riportano il salone dentro e il ladro fuori', async () => {
    const ladro = await sessioneDi(VERA_AUTH)            // la sessione che sta nel telefono perso
    // Il ladro, da operatrice attiva (asOperatorCommit, con commit): disattiva e scollega le colleghe e cancella la loro disponibilità.
    // … (le tre istruzioni di §8.4 punti 4, 5, 6, una per una, con la sessione `ladro`)

    // Passo 1: la password cambia (da proprietario, come la dashboard).
    await asOwner((c) => c.query(
      `update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf', 8)) where email = $1`, [EMAIL_VERA, NUOVA]))
    // (positiva) prima del passo 2 la sessione del ladro legge ancora tre righe di operator.
    // Passo 2: le sessioni di Vera.
    await asOwner((c) => c.query('delete from auth.sessions where user_id = $1', [VERA_AUTH]))
    // SUBITO, prima del passo 3: la sessione del ladro legge ZERO righe. È questa asserzione che
    // fa arrossire la mutazione 7d: alla fine il passo 5 chiuderebbe comunque le sue sessioni,
    // ma nella finestra fra 2 e 5 il ladro potrebbe rifare il peggio (revisione, Finding 3).
    // (asOperatorConSessione(VERA_AUTH, ladro.sessionId, …) → select from operator → 0 righe)
    // Passo 3: le colleghe, attive e collegate all'uuid giusto, con `returning`: devono tornare DUE righe.
    // Se ne torna una, il ladro ne ha CANCELLATA una (D3c-20): la procedura dice di reinserirla.
    const rimesse = await asOwner(async (c) => (await c.query(
      `update operator set is_active = true, auth_user_id = case id when $1 then $2::uuid when $3 then $4::uuid end
        where id in ($1, $3) returning id`, [ANNALISA, ANNALISA_AUTH, ALESSANDRA, ALESSANDRA_AUTH])).rowCount)
    expect(rimesse).toBe(2)
    // Passo 5, SUBITO dopo il 3 (nello stesso SQL, nella procedura): si disattiva la riga del
    // telefono perso. La guardia conta due attive collegate: passa. La settimana tipo (passo 4)
    // viene DOPO: la guardia non la guarda, e così la finestra si accorcia (revisione, Finding 5).
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [VERA]))
    // Passo 4: la settimana tipo delle colleghe, rifatta a mano (senza ripristino: D3c-12).
    await asOwner((c) => c.query(
      `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
       select o, d, 108, 228 from unnest($1::uuid[]) o cross join generate_series(0, 5) d`, [[ANNALISA, ALESSANDRA]]))

    // Passo 6, le due letture di spec 3c §8.3 — con il left join obbligatorio.
    const lettura1 = await asOwner(async (c) => (await c.query(
      `select o.name, o.is_active, u.email from operator o left join auth.users u on u.id = o.auth_user_id order by o.sort_order`)).rows)
    expect(lettura1).toEqual([
      { name: 'Vera', is_active: false, email: EMAIL_VERA },
      { name: 'Annalisa', is_active: true, email: 'annalisa@example.test' },
      { name: 'Alessandra', is_active: true, email: 'alessandra@example.test' },
    ])
    const lettura2 = await asOwner(async (c) => (await c.query(
      `select o.name, count(w.*)::int as fasce from operator o left join weekly_availability w on w.operator_id = o.id group by 1 order by 1`)).rows)
    expect(lettura2).toEqual([{ name: 'Alessandra', fasce: 6 }, { name: 'Annalisa', fasce: 6 }, { name: 'Vera', fasce: 6 }])

    // Il ladro è fuori: la vecchia password non apre (accedi(EMAIL_VERA, PASSWORD_PROVA) → rifiutato).
    // E il salone è dentro: Annalisa, con una sessione aperta DOPO il passo 5 (accedi), legge tre righe.
    // ⚠︎ Una sessione di Annalisa aperta PRIMA del passo 3 legge invece zero righe: 0015 chiude le
    // sessioni di chi viene riattivato o ricollegato. Si asserisce anche questo: è la sola via per
    // cui la mutazione 7e arrossisce.
  })

  it('il ladro ha CANCELLATO la riga di Alessandra: il passo 3 torna una riga sola, e lo si vede', async () => {
    // Variante del peggio di §8.4 allargato da D3c-20: delete from operator where id = ALESSANDRA
    // (senza appuntamenti la chiave esterna lo permette). Il passo 3 → rowCount 1, non 2.
  })

  it('l’ordine vecchio (3a §4.7: prima si disattiva Vera) con le colleghe ancora fuori è rifiutato dalla guardia', async () => {
    // Dopo il peggio del ladro: update operator set is_active = false where id = VERA, da proprietario → 23514.
    // È la ragione per cui il passo 5 viene dopo il passo 3.
  })
})
```

  ⚠︎ Questa è la **forma** della prova, non la prova finita: le righe commentate dicono che cosa ciascuna fa, e chi
  esegue le scrive con gli aiuti veri (`asOperatorCommit`, `asOperatorConSessione`, `accedi`) — le firme sono in
  *Interfaces* qui sopra. Il peggio del ladro si scrive dentro la prova con
  `asOperatorCommit(VERA_AUTH, …)`: `asOperator` fa sempre rollback e non lascerebbe niente da riparare. Ogni asserzione negativa («il ladro è fuori») ha
  la sua positiva **sulla stessa via** («prima del passo 2 la sessione del ladro leggeva tre righe»).
  ⚠︎ In locale `secure_password_change` è spento (`config.toml:256`): la prova misura **l'ordine**, non C8, che si
  prova online (§9.4 C8 e H4).

- [ ] **Passo 2: vederla verde subito, e poi rossa con le sonde.** Questa prova esercita oggetti che esistono già:
  il suo valore è nelle mutazioni.

| # | Mutazione | Prova che deve arrossire | Rosse |
|---|---|---|---|
| 7a | passi 3 e 5 scambiati | «i nove passi…» (`23514` al passo 5) | [da misurare] |
| 7b | il passo 3 rimette `is_active` ma non `auth_user_id` | idem (la guardia conta le **collegate**) | [da misurare] |
| 7c | la lettura 2 con `join` invece di `left join`, e Alessandra senza fasce | **aggiungere** la variante in cui una collega resta senza fasce: il `join` non la mostra | [da misurare] |
| 7d | passo 2 saltato | l'asserzione **subito dopo il passo 2** (zero righe al ladro) | [da misurare] |
| 7e | in `0015`, togliere `zz_chiudi_sessioni_upd` (l'ultima migrazione che lo definisce) | «una sessione di Annalisa aperta prima del passo 3 legge zero righe» | [da misurare] |
| 7f | passo 3 senza il controllo `rowCount = 2` | la variante «il ladro ha CANCELLATO…» | [da misurare] |

- [ ] **Passo 3: `docs/procedure/telefono-perso.md`.** Scritta per **le due persone delle credenziali** (spec 3c
  §9.8 F6), con il nome dell'operatrice al posto di `<uuid>`. In testa, le premesse di spec 3c §8.1, con D3c-24: le
  credenziali della dashboard e i codici del secondo fattore stanno **sulla carta, in cassaforte, in salone** — se
  il telefono perso è anche quello che genera il secondo fattore, la procedura **parte dalla cassaforte**. Poi i
  nove passi di spec 3c §8.3, ciascuno con **che cosa si tocca nella dashboard** e **che cosa si vede se è giusto**,
  con **due cambi** rispetto allo spec (divergenze 18 e 19): i passi 3 e 5 in **un solo SQL**, con `returning` sul
  passo 3 (devono tornare due righe), e il passo 4 **dopo**; il passo 8 («nel gestore») diventa «ricopiare la
  passphrase nuova sulla carta in cassaforte» (D3c-24). In testa, una verifica: **recupero della password spento e
  nessun SMTP** (§9.4 C5–C7), perché se la casella email di un'operatrice è sul telefono perso il recupero via email
  annullerebbe il passo 1;
  le due letture del passo 6 con l'avvertenza sul `left join`; la sezione «che cosa la procedura non impedisce»
  (spec 3c §8.4) **allargata da D3c-20**: chi ha il telefono può anche cancellare la riga di `salon_settings` e
  una riga di `operator` senza appuntamenti. ⚠︎ Senza la riga di `salon_settings` **l'agenda non si apre**
  (`leggiGiorno` la legge con `.single()`, `src/server/lettura-giorno.ts:76-79`): il rimedio è `insert into
  salon_settings (day_start_boundary, day_end_boundary) values (<apertura>, <chiusura>)`, coi valori dell'orario
  vero scritti sulla carta alla sessione 5. Le visite cancellate (spec 3c §8.5): **non si recuperano** se non dalla copia della
  settimana (§7.2).

### 7.2 La copia e il ripristino (O8)

Il progetto gratuito **non fa copie** (D3c-12, M3). Fino alla copia settimanale del piano 4 (D4-6), che **non** è
nella consegna 1, l'unica copia è quella che una persona fa. E una copia che nessuno ha mai ripristinato non è una
copia (spec 3c §9.12 passo 9, §13.27).

- [ ] **Passo 4: `scripts/copia.mjs`.** Esegue, con `execFileSync` e gli argomenti in un array:
  `npx supabase db dump --linked --data-only -f <cartella>/dati-<data>.sql` — **senza** `--use-copy`, così il file è
  fatto di `INSERT` eseguibili da `pg` (il `COPY … FROM stdin` non lo è) — e poi conta le `INSERT INTO "public"."client"`,
  `"visit"`, `"appointment"` nel file e le stampa. Rifiuta una `<cartella>` dentro il repo (`path.resolve` contro
  `process.cwd()`): `.gitignore` non può escludere `*.sql`, perché le migrazioni lo sono (spec 3c §9.12 punto 3).
  ⚠︎ `db dump` usa Docker: lo dice la procedura.

- [ ] **Passo 5: `scripts/ripristina.mjs <file>`.** Legge `DATABASE_URL` dall'ambiente (esce con un messaggio se
  manca, **senza** stampare niente del valore); apre una connessione `pg`; in **una transazione**:
  1. `set local session_replication_role = replica` (i trigger, compresi `zz_sync_appointment_slots`,
     `zz_touch_client_activity`, `zz_annuncia_*`, `zz_chiudi_sessioni_*` e la guardia, **non** girano: sono righe
     che c'erano già, e riaccesi ricalcolerebbero `last_activity_at` — il dato su cui lavora la cancellazione a
     scadenza — o duplicherebbero `appointment_slot`);
  2. ⚠︎ **`truncate` di TUTTE le tabelle di `public`**, elencate esplicitamente da `pg_tables` dello schema
     (revisione, B5): un progetto migrato ha **già** le tre righe di `operator` (`0001:53`) e quella di
     `salon_settings` (`0002:38`), che sono anche nella copia, e il primo `INSERT` darebbe `23505` annullando tutto;
  3. il contenuto del file, **togliendo le righe che cominciano con `\`** (i `pg_dump` recenti aprono con
     `\restrict`, un meta-comando che `pg` non esegue — [da misurare] sul file vero);
  4. le asserzioni: i conteggi di `client`, `visit`, `appointment` uguali a quelli che `copia.mjs` ha stampato
     (passati come argomenti), e **`count(*) from appointment_slot` = `sum(cell_count) from appointment`** — se
     `appointment_slot` mancasse nel file nessun trigger la ricostruirebbe e le doppie prenotazioni passerebbero;
  5. `commit`, o `rollback` se una sola asserzione non torna.
  Prima di cominciare, si ferma se `client`, `visit` o `appointment` **non** sono vuote: si ripristina su un progetto
  nuovo, mai sopra dati vivi. ⚠︎ Che il ruolo `postgres` di Supabase possa impostare `session_replication_role` è
  **[da misurare]** al Passo 6 (la guida di Supabase lo usa); se dà `42501`, il ripiego è: copia con `-x
  public.appointment_slot -x public.annuncio`, ripristino a trigger accesi spegnendo **nella transazione** solo
  `zz_touch_client_activity` e `zz_annuncia_*` con `alter table … disable trigger`, e `appointment_slot` ricostruita
  dal suo trigger. Lo si scrive nella procedura con l'esito.

- [ ] **Passo 6: la prova su `avstyle-prova` (con l'utente).** Elenco:
  1. Dashboard di `avstyle-prova` → SQL Editor: si inseriscono **due clienti, tre visite, quattro appuntamenti**
     riconoscibili (SQL dato dalla chat) e si legge `select count(*) from client` → 2 (e gli altri).
  2. Nel terminale dell'utente: `npx supabase link --project-ref <ref di avstyle-prova>`; `node scripts/copia.mjs
     ~/AVStyle-copie` → i conteggi stampati **coincidono** con il punto 1.
  3. SQL Editor: `truncate client, visit, appointment, appointment_slot cascade;` (proprietario, sul progetto
     **di prova**: lo si rilegge prima di premere). Lo script svuota da sé il resto.
  4. Nel terminale: `read -rs DATABASE_URL && export DATABASE_URL` (incolla la stringa di Dashboard → Connect; con
     `-s` non compare a schermo né nella cronologia), `node scripts/ripristina.mjs ~/AVStyle-copie/dati-<data>.sql
     <i tre conteggi>`, `unset DATABASE_URL`. ⛔ **La chat non legge il terminale fra il `read` e l'`unset`**: lo
     strumento del terminale la porterebbe in chat (revisione, B6).
  5. SQL Editor: i conteggi del punto 1 sono **tornati**, e una visita si apre nell'app (se il Worker di prova c'è
     ancora) o si legge con `select`.
  6. `npx supabase unlink`.
  Si trascrive: dimensione del file, tempo, conteggi prima e dopo. ⚠︎ **Che cosa la copia NON contiene**: lo schema
  `auth` (gli account) e la storia delle migrazioni (spec 3c §9.12 punto 4). Dopo un disastro vero gli account si
  rifanno a mano e si ricollegano (§9.6 D1 e D4). Lo dice la procedura.

- [ ] **Passo 7: `docs/procedure/copia-e-ripristino.md`.** Chi (una delle due persone di F6), quando (ogni lunedì,
  e **prima** di ogni dispiegamento), dove (la sede di F6-bis, decisa alla sessione 0; mai una chat, mai il repo,
  mai una cartella sincronizzata col cloud se non cifrata), quante se ne tengono (**quattro**, come D4-6), come si
  cancella la più vecchia; il ripristino come al Passo 6, **su un progetto nuovo** migrato con `db push`, non sopra
  quello rotto. ⚠︎ **Se la copia del lunedì non si fa**, la rinuncia E3 dice il vero per quei giorni.

### 7.3 Le altre procedure

- [ ] **Passo 8: `docs/procedure/richiesta-dati.md`** — spec 3c §9.14 con D3c-22: la cliente si identifica **di
  persona, in salone**; le due query (scheda e storico, con le celle convertite in orari); che cosa non c'è (anno di
  nascita, visite cancellate, chi ha scritto che cosa); il file fuori dal repo e **cancellato** alla chiusura della
  richiesta; data della richiesta e della risposta, termine un mese. ⚠︎ Il nome dell'operatrice nello storico
  (spec 3c §13.29, seconda metà): la procedura lo **consegna** e lo dichiara, perché è parte del servizio ricevuto —
  [proposta] di chi scrive il piano, che il piano 4 eredita.
- [ ] **Passo 9: `docs/procedure/dispiegamento.md`** — spec 3c §9.12 riletta per Cloudflare: ricollegare; avvisare
  e fermare le scritture; **la copia** (§7.2) **e** i dump di ruoli e schema; classificare le migrazioni; **prima la
  migrazione compatibile, poi l'app** (`npm run cf:build && npm run cf:dispiega` con `.env.production.local` del
  progetto vero); `migration list --linked` e il conto; la prova di fumo; rifare §9.6 D13 e D10; **scollegare**; il
  rollback dell'app è `npx wrangler rollback` (⚠︎ non riporta indietro il database); dire alle operatrici che possono
  riprendere. ⛔ Mai `db reset --linked`.
- [ ] **Passo 10: `docs/procedure/apertura.md`** — l'elenco di spec 3c §9 **riscritto per D3c-12 e D3c-13**, nella
  forma del Task 8 qui sotto: è il documento che le sessioni compilano. Ogni voce: che cosa · come · che cosa si vede
  · **esito e data** (vuoto). Niente valori segreti: dove una voce trascrive URL o `ref`, si trascrive **sulla
  carta**, non nel file (il repo è pubblico).

- [ ] **Passo 11: il gate e il commit** `feat(3c): le procedure, e la copia ripristinata davvero` (corpo: la prova
  del «telefono perso» e le sue sonde, i numeri della prova di ripristino su `avstyle-prova`).

**Revisione, a rigore pieno:** due revisori. **Lente 1, la procedura eseguita**: un revisore la **simula** passo per
passo su un banco proprio (non la audita: spec 3c §14.3 dice che §9 l'hanno trovata rotta solo simulandola),
cercando il punto in cui il salone resta fuori o il ladro resta dentro. **Lente 2, mutazioni**: le cinque sonde più
le proprie.

---

## Task 8 — La messa online, in sei sessioni

Spec 3c §9 per intero, riletta con D3c-12 (Supabase gratuito) e D3c-13 (Cloudflare, `*.workers.dev`). Il documento
che si compila è `docs/procedure/apertura.md` del Task 7.

**Chi fa che cosa.** Le voci con account, pagamenti, dashboard, password e firme le fa **l'utente** (o la titolare,
dove è scritto). La chat **accompagna**: prepara l'SQL e i comandi, legge le uscite del terminale con lo strumento
del terminale, confronta con l'atteso, trascrive l'esito nel documento. ⛔ La chat non riceve mai una password, un
token o la stringa di connessione: se un comando li chiede, li digita l'utente nel **proprio** terminale.

**Precondizioni.** I Task 1–7 chiusi e rivisti; il **piano 4 minimo eseguito**, con la sua `0024` sul disco e le
sue voci di dispiegamento lette (pianificazione della cancellazione: `pg_cron` o altro, che il suo piano decide). Se
il piano 4 minimo non è chiuso, la sessione 1 **non** comincia: la `0024` arrivata dopo l'apertura passerebbe da
§9.12 con la copia, e la cancellazione a scadenza non esisterebbe il giorno in cui entrano i primi nomi.

**Quante sessioni:** sei, come spec 3c §9.13, con le voci ridistribuite. **Quante chat:** la sessione 1 e la 2 in
una chat; la 4 in una seconda. La 0, la 3 e la 5 le fa l'utente, e la chat della 4 trascrive gli esiti della 3.

### Sessione 0 — preparazione (l'utente, giorni prima)

Le decisioni che §9 consuma e non produce. Elenco da seguire:
1. **Le email dei tre account.** Nessuna email viene mai spedita (accesso via email e recupero spenti, D3c-1), quindi
   l'email è **solo un nome d'accesso**. Si usano tre indirizzi che il salone **legge** (se un giorno il recupero si
   accende, arriva lì). Si scrivono sulla carta.
2. **Le due persone delle credenziali** (D3c-3, F6) e **l'intestatario** dell'organizzazione Supabase e
   dell'account Cloudflare (F7), con la casella di recupero. Se l'intestatario cambia dopo, si rifà A1.
3. **La cassaforte** (D3c-24): dove, chi ha la chiave. Lì vanno: password della dashboard Supabase e di Cloudflare,
   i codici di riserva del secondo fattore di entrambe, la password del database, le tre passphrase.
4. **La sede delle copie** (F6-bis): una chiavetta o un disco **cifrato**, chi lo tiene, dove sta.
5. **Chi tiene sveglio il progetto ad agosto** (E4): una persona con un nome, e una nota nel calendario del salone:
   «durante la chiusura, ogni 5 giorni, aprire l'app e leggere un giorno». ⚠︎ Che una lettura dell'app conti come
   «attività» per Supabase è **[da misurare]**: la documentazione parla di *«a few user requests to the database each
   day»*.
6. **Il testo della rinuncia E3**, da leggere con la titolare (sotto, sessione 5).
7. Secondo fattore **acceso** su Supabase e su Cloudflare per le due persone, codici di riserva **stampati**.

**Si vede che è andata** quando i sette punti hanno un nome o un posto scritto **sulla carta**.

### Sessione 1 — il progetto e l'autenticazione (utente + chat)

Voci di spec 3c §9.2, §9.3, §9.4, §9.8. Elenco per l'utente, con che cosa vede:
1. **Z2, Z3** (chat): `git status --porcelain` pulito sui file tracciati; `git rev-parse HEAD` **trascritto**; la CI
   verde su quel commit (`gh run list --limit 3`).
2. **A1**: supabase.com → New project **`avstyle`**, regione **Central EU (Frankfurt)**, piano Free. Vede due
   progetti: `avstyle` e `avstyle-prova`. ⚠︎ Il limite gratuito è **due progetti attivi per proprietario**: se
   l'account ne ha altri, si mette in pausa `avstyle-prova` **prima** (si riaccende per il Task 7). La password del
   database va **sulla carta**.
3. **A2** (riletta con D3c-12): Dashboard → Database → Backups. Vede che **non ci sono copie automatiche**: lo
   trascrive con la data. E3 diventa obbligatoria.
4. **A3–A5**: nel proprio terminale, `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db
   push`. La chat legge l'uscita: **nessun `Skipping migration`**; l'elenco va da `0001` a **`0022`** e alla `0024`
   del piano 4; il numero coincide con `ls supabase/migrations/*.sql | wc -l` sul commit di Z2. Se non torna:
   **fermarsi** (A5).
5. **A6**: `npx supabase unlink`; la chat verifica che `supabase/.temp/project-ref` **non esiste**.
6. **C1**: Authentication → Policies/Password → minimo **8** (D3c-18).
7. **C2**: Authentication → Sign In / Providers → registrazione **spenta** (anche sotto Email). Poi la chat dà il
   comando `curl` di spec 3c §9.4 C2 con l'URL e la chiave pubblica **che l'utente incolla nel proprio terminale** →
   vede **`signup_disabled`**. Questa è anche la misura 9 di spec 3c §14.2.
8. **C3, C4, C5–C7**: accessi anonimi spenti; Third-Party Auth, Web3, OAuth server spenti; magic link e recupero
   spenti; nessun SMTP. Vede tutto spento.
9. **C8**: *Secure password change* **acceso**. È la precondizione del passo 1 del «telefono perso».
10. **C10, C11**: rate limit lasciato al difetto (non 300); `jwt_expiry` **3600** (D3c-19), trascritto.
11. **F1–F5**: il DPA di Supabase (Dashboard → Organization → Legal/Documents, o la pagina supabase.com/legal/dpa) e
    il DPA di Cloudflare (dash.cloudflare.com → Manage Account → Configurations/Privacy, o la pagina del DPA
    self-serve): **accettati o presi in copia, con la data**. I sotto-responsabili dei due, trascritti (link).
    **Per quanto restano i log** (F4) sui due piani gratuiti: [da misurare] in dashboard, trascritto. I membri delle
    due organizzazioni = le due persone di F6, nessun altro.
12. **Chi risponde se un passo non torna**: la chat si ferma, trascrive, e la sessione si chiude lì.

### Sessione 2 — l'app e il database (utente + chat)

1. **B (Cloudflare)**: l'utente incolla in `.env.cloudflare` URL e chiave pubblica di **`avstyle`**; la chat
   esegue `npm run cf:build` e l'utente, nel proprio terminale con `wrangler login` fatto, `npm run cf:dispiega`.
   **Subito dopo**, `.env.cloudflare` torna ai valori locali: un build lasciato a puntare sul progetto vero è un
   rischio per la prossima chat.
   Vede l'indirizzo **`https://avstyle-agenda.<account>.workers.dev`**, che si trascrive **sulla carta** e nel
   documento d'apertura (non è un segreto, ma il repo è pubblico: si scrive come «l'indirizzo della carta»).
   - B1-bis (regione): **non si sceglie** su Cloudflare gratuito (M3): dichiarato, e detto al consulente insieme a F3.
   - B5: niente anteprime (`preview_urls: false`, Task 1). B6: si dispiega solo a mano (O10). B7: `npx wrangler
     rollback` provato **una volta** su questo primo dispiegamento (si ridispiega lo stesso build due volte e si
     torna alla prima). B8: Workers → Observability attivo; un allarme d'errore **[da misurare]** se il piano
     gratuito lo offre, altrimenti dichiarato.
2. **C12**: Authentication → URL Configuration → Site URL = l'indirizzo di B; Redirect URLs = solo quello. Nessun
   `localhost`, nessun jolly.
3. **D0–D2**: le tre passphrase (almeno 8 caratteri, D3c-18; generate a caso, ricopiate sulla carta, D3c-24);
   Authentication → Add user, tre volte, «Auto Confirm». SQL Editor: `select id, email from auth.users order by
   email;` → **tre righe**, nessuna `@example.test`.
4. **C9**: la chat dà lo script di 40 tentativi sbagliati su **uno** dei tre account; l'utente lo lancia; si trascrive
   il tentativo del primo `429`. Passa se arriva entro 30. Poi si **aspetta** che la finestra si richiuda.
5. **D3, D4**: `select name, auth_user_id, color, is_active from operator order by sort_order;` → tre righe,
   **colori `#F3A4BA`, `#FFFFFF`, `#FFD8B0`** (D3c-11). Il collegamento per **coppia**, come spec 3c §9.6 D4.
6. **D5–D13**: le query di spec 3c §9.6, con **tre correzioni**: in **D8** la passphrase vera si legge con `read -rs
   PASSWORD` e si passa al `curl` come variabile, e la chat **non** legge il terminale finché `unset PASSWORD` non è
   fatto (né la passphrase né l'`access_token` devono finire in chat: revisione, B6); D10 è la query di `tests/schema/funzioni-anon.test.ts`
   (Task 2) e l'atteso è lo **stesso** della prova; D6 e D9 si confrontano con i conteggi della prova
   `tests/schema/catalogue-audit.test.ts` sul commit di Z2 (lo spec dice «16», scritto prima di `0013`–`0022`).
7. **G1–G6-ter**: `curl -sI` sull'indirizzo: CSP con `nonce` che cambia, `frame-ancestors 'none'`, HSTS,
   `no-referrer`, `nosniff`, `no-store`; nessun service worker (`navigator.serviceWorker.getRegistrations()` →
   `[]`); cookie `Secure`, `HttpOnly`, `SameSite=Lax`. **G7**: Cloudflare → Workers → `avstyle-agenda` → Settings →
   Variables: **nessuna**. **G8**: Supabase → Storage: nessun bucket pubblico. **G10**: la copia di
   `supabase/rientro/0014_…` nella cassaforte, con i suoi costi scritti accanto.

### Sessione 3 — notturna (l'utente)

**G9**: aprire l'app fra le 00:00 e l'01:00 di Perugia (dopo il 25 ottobre l'Italia è a UTC+1: in quell'ora a UTC
è ancora ieri). «Oggi» dev'essere il giorno **di Perugia**. Si trascrive data, ora ed esito.

### Sessione 4 — le prove a mano (utente con tre telefoni + chat)

Voci H di spec 3c §9.10, nell'ordine dello spec, con **H7 cambiata** (tabella di §6). Prima di ogni dato vero (H0).
1. **H1**: le tre entrano dal proprio telefono.
2. **H2**: il primo avvio si apre, si esce, si rientra e riprende dal passo giusto (la prova 8 dell'e2e, a mano).
3. **H4**: la procedura del «telefono perso» per intero, da `docs/procedure/telefono-perso.md`, con un telefono che
   fa la parte del ladro (disattiva e scollega le colleghe, cancella la loro settimana tipo). Si vede: il salone
   dentro, le coppie nome/email giuste, le settimane tipo tornate. **H4-bis**: le tre rientrano.
4. **H5, H5-bis, H8**: come le prove e2e del Task 5, a mano, e poi si ripristina ciò che si è rotto.
5. **H7, nuova forma**: il telefono B ha il giorno aperto; il telefono A cambia la disponibilità; B, riportato in
   primo piano, la mostra; lasciato aperto, la mostra **entro 60 s**.
6. **H3**: restringimento con conflitti (prova 6, a mano), e poi si **annulla** l'eccezione.
7. **Il Worker sotto uso vero**: durante tutta la sessione, `wrangler tail` acceso; alla fine Cloudflare → Metrics:
   errori, CPU p99. **Zero 1102**, o ci si ferma (Task 1 Passo 9).
8. **H6**: si ripulisce tutto ciò che le prove hanno scritto (clienti, visite, eccezioni, chiusure, righe di
   `operator` toccate) e si rilegge.
9. **La prima copia** (`docs/procedure/copia-e-ripristino.md`) sul progetto **vero**, che ha solo dati di prova
   cancellati: si vede che lo script la fa e conta zero clienti.

### Sessione 5 — l'immissione (titolare e operatrici)

1. **H2-bis**: il primo avvio con l'elenco su carta — categorie, servizi (la sola Alessandra copre sette famiglie),
   chi fa che cosa, le tre settimane tipo; l'orario del salone (scritto **anche sulla carta**, per il rimedio di
   D3c-20); la chiusura d'agosto (al massimo 60 giorni per volta: due chiusure se serve). Si vede: nessuna delle tre
   frasi di spec 3c §5.1.
2. **§9.11**: i dodici limiti di spec §12 riletti uno per uno con la titolare, **più** quelli di questo piano:
   D3c-20 (la riga dell'orario cancellabile da un telefono), D3c-21 (l'ultima vince), il Worker senza regione
   garantita (B1-bis), e nessuna copia automatica (D3c-12).
3. **E3**: la rinuncia, firmata dalla titolare con la data. Testo di spec 3c §9.7 E3 **con tre cambi**: «[accertato con
   §9.3 A2 il …]» = la data della sessione 1; il quinto modo di perdere i dati include **la sospensione non
   riaccesa per più di un anno**; e la frase sulle copie diventa: «**Le copie che esistono: i registri di carta;
   la copia fatta a mano ogni lunedì (procedura «copia e ripristino»), che contiene le clienti e le visite ma non
   gli account; e nessun'altra.**» ⚠︎ Il piano 4 chiede anche di aggiungere D4-2 ai modi di perdere i dati: il testo
   lo prende dal piano 4 minimo, se lo nomina.
4. **H9**: il doppio libro — la settimana in parallelo segnata nel calendario, la data in cui si smette di scrivere
   sulla carta, il posto dove si conservano i registri (D3c-5).
5. **H10**: la doppia lettura finale di spec 3c §8.3 passo 6. È l'ultima voce.
6. `avstyle-prova`: si **sospende** (Dashboard → Pause project): non serve più finché non si riprova un ripristino.

### Che cosa resta dichiarato e non provato, dopo le sei sessioni

| Voce | Perché non si prova |
|---|---|
| I 10 ms di CPU sotto carico vero di una giornata piena | Si misura in sessione 4 su una giornata di prova, non su dieci ore di salone. Il primo giorno vero si guarda Metrics la sera |
| Dove gira il Worker | Cloudflare gratuito non garantisce una regione (M3): detto al consulente |
| Se aprire l'app conta come attività contro la sospensione | [da misurare] dopo la prima settimana di chiusura |
| Il ripristino degli **account** | La copia non contiene `auth`: si rifanno a mano (procedura) |
| La conservazione dei log dei due fornitori | Si trascrive il valore dichiarato, non si misura |
| La cancellazione a scadenza | È del piano 4 minimo, che la prova |

**Commit della sessione:** `docs(3c): l'apertura, sessione N` con il documento d'apertura compilato (senza valori
segreti né indirizzi) e la riga `Co-Authored-By`. Revisione: un revisore sul documento compilato, che lo confronta con
le uscite trascritte.

---

## Autocontrollo — ogni voce del perimetro e il task che la copre

| Voce (consegna ridotta righe 3 e 4; prompt del piano) | Task | Note |
|---|---|---|
| Disponibilità: settimana tipo | 4 | P3 con `scrivi_giorno_settimana` |
| Disponibilità: eccezioni, un giorno e più giorni | 4 | O1: `write_exception_days` a ciclo; prove mancanti al Task 2 |
| Restringimento: elenco delle differenze con il verso (spec 3c §3.3) | 3, 4 | P2 |
| Restringimento: conflitti senza orizzonte (§3.4, §3.5) | 2, 3, 4 | P1 |
| Validazione e tetti (§3.8) | 2, 3, 4 | D3c-14; O5 |
| Due operatrici sullo stesso giorno (§3.7) | 2, 4 | D3c-21; `23505` con la sua frase |
| Impostazioni: operatrici (elenco, aggiunta, collegamento, scollegamento, disattivazione, colore, ordine) | 5 | D3c-16; O3 |
| «Chiudi tutte le sessioni» e i tre stati (§4.3) | 5 | rigore pieno |
| Colori D3c-9 con la migrazione | 2, 3, 5 | D3c-11 |
| Categorie e servizi (§4.5) | 6 | possibile passaggio alla fase 2 di modifica e cancellazione |
| Orario del salone e chiusure (§4.6) | 6 | |
| Dati delle clienti | 5 | **solo il segnaposto**: lo costruisce il piano 4 |
| Primo avvio (§5) | 3, 6 | |
| Politica d'errore delle scritture (§7) | 3, 4 | il motore `scrivi` |
| «Telefono perso» (§8) | 7, 8 (H4) | rigore pieno |
| Verifiche prima del rilascio e messa online (§9) | 7 (documento), 8 (esecuzione) | |
| Procedura di dispiegamento (§9.12) | 7 | |
| Il ripristino (§9.12 passo 9, §13.27, §14.2 misure 7 e 8) | 7 | provato su `avstyle-prova` |
| Richiesta di accesso (§9.14) | 7 | D3c-22 |
| Prove di §10: 10.1 | 3 | |
| Prove di §10: 10.2 | 2, 4, 5 | le righe che cadono con §6 sono nella tabella di §6 |
| Prove di §10: 10.3, prova 6 e prova 8 | 4, 6 | «l'annuncio per via» cade con §6 |
| §6 intero | **NON COPERTO, fase 2** | tabella «Che cosa cade con §6» |
| La voce «Fuori orario» (§3.6) | **NON COPERTO, fase 2** | D3c-17 |
| Il contrassegno (§9.11 della spec originale) | **NON COPERTO** | O6 |
| Il secondo fattore sulle operatrici | **NON COPERTO** | O7 |
| Lo striscione «rete assente» (`/api/battito`) | **NON COPERTO** | decisione dell'utente del 07/10, piano 3a-2 |
| La copia settimanale automatica (D4-6) | **NON COPERTO nella consegna 1** | piano 4, fase 2; al suo posto la copia a mano (O8) |

---

## Divergenze fra spec e realtà, trovate e non corrette

Lo spec **non si modifica** (divieto del prompt). Queste righe sono l'elenco per chi lo riprende.

1. La testata dello spec 3c dice «Revisione 6», la riga «Stato» dice «revisione 4 scritta; non rivista».
2. L'**appendice E** è citata in testa (registro del quarto giro) e nel file non c'è: l'ultima è la D.
3. La base di codice dichiarata è `a63b996`; il piano è scritto su `b2daba6` (3a-1 da `0013` e 3a-2 chiusi in mezzo).
4. **§4.1 è ancora scritta sulla D3c-8** («Colori delle operatrici — rifatta su D3c-8», il pavimento di luminanza
   «verso il deep rose»), che §2.4 dichiara **revocata**. Il piano segue D3c-9 e O3.
5. §4.1 e §9.6 D3 dicono che `0021` «non esiste sul disco» e che i colori seminati sono `#7B3F61`, `#2F6F6B`: `0021`
   esiste e mette `#C2185B`, `#FFFFFF`, `#9B1B1B`; `0022` li porta a D3c-11.
6. §9.1 dice che l'app non esiste: esiste (3a-2).
7. §9.5 è scritta per **Vercel**: D3c-13 sceglie Cloudflare, e B9 è confermata nel verso peggiore (Hobby vieta l'uso
   commerciale, M3). B1-bis non è applicabile.
8. §13.24 dice «CHIUSO: `0023`»: D3c-10 lo riapre e lo chiude su `0022`. Lo spec 3b (r. 1192, 1198-1205) e lo spec
   piano 4 (r. 963-965, 2316-2317) dicono ancora «3b `0022`, 3c `0023`».
9. §9.6 D10 dice «13 funzioni con revoke»: dopo `0021` sono 14, dopo `0022` 17 (più quelle del piano 4). Il piano la
   sostituisce con la prova P7.
10. §9.6 D6 e D9 dicono «16 tabelle», «16 politiche»: contati prima di `0013`–`0019`; si confrontano con la prova
    del catalogo al commit di Z2.
11. Il prompt del piano dice che una prova statica presidia già l'assenza di `service_role`: la prova
    (`tests/app/contorno.test.ts:38-43`) guarda **solo** `next.config.ts`, `package.json` e
    `.github/workflows/ci.yml`, non `src/` né i file d'ambiente. Il Task 1 la allarga.
12. **Nessun documento elencava** che `authenticated` può cancellare la riga di `salon_settings` (`00051:69`:
    *«authenticated keeps insert, update, delete on all of these tables»*). D3c-20 la lascia: va nel §8.4 della
    procedura.
13. §2.5 conta come «copia corrente vera» la D4-6 del piano 4: nella consegna 1 il piano 4 è **minimo** e D4-6 non
    c'è. Con D3c-12 la sola copia è quella a mano (O8).
14. §11 chiede al 3a-2 che «la ricarica rilegga `operator`»: lo fa già (`src/server/lettura-giorno.ts:75`).
15. Il `README.md` (r. 8) dice ancora «on the `foundations` branch» e «the application does not exist yet».
16. Spec 3c §13.5 e §4.2 («sulla propria riga non si offre…») sono rovesciati da D3c-16; §13.1 (120 giorni) da
    D3c-14; §9.4 C1 da D3c-18.
17. ⚠︎ **Per la fase 2**: il reperto `{NULL}` di spec 3c §6.3 (il trigger su `exception_range` in cascata) e la
    misura 1 dell'appendice D (600 righe con la forma a ciclo) **restano veri**: chi riprende §6 rifà prima
    `write_exception_days` a insiemi (O1).
18. **Spec 3c §8.3, ordine dei passi 4 e 5**: il piano mette il 5 (disattivare la riga persa) **subito dopo** il 3,
    nello stesso SQL, e il 4 (le settimane tipo) **dopo**: la guardia guarda solo il passo 3, e così la finestra in
    cui il ladro può rifare il peggio si accorcia (revisione).
19. **Spec 3c §8.3 passo 8** dice «rimettere la passphrase nuova nel gestore»: con D3c-24 è «sulla carta in
    cassaforte».

---

## Appendice — Revisione del piano

Un giro, 7 ottobre 2026, tre revisori su Opus in parallelo, tutti in sola lettura sul repo e lontani dal database
del progetto. Le misure le hanno fatte su contenitori Postgres propri, poi rimossi: `rev-mutazioni-3c` (porta
55442, 15:12–15:24) e `rev-sicurezza2-3c` (porta 55443, 15:30–15:38). Un quarto revisore di sicurezza si era
fermato senza consegnare né lasciare niente, ed è stato rilanciato con un mandato più stretto. Ogni reperto
accolto è stato **ricontrollato sul codice** da chi scrive prima della correzione (`ricerca-clienti.test.ts:123-125`,
`aiuti.ts:195`, `preparazione.ts:47,50`, `sessioni.ts:33`, `tempo.spec.ts:40-44`, `lettura-giorno.ts:76-79`).

| Revisore | Mandato | Esito |
|---|---|---|
| Avversariale | tutto il piano contro il codice e lo spec | 10 bloccanti, 19 minori; tutti i nomi e le righe citati **esistono**, la semantica degli aiuti è giusta, lo scenario di §3.2 e la tavolozza **rimisurati e confermati** |
| Mutazioni e misura | la `0022` applicata su un banco, le sonde del Task 2, i numeri del Task 3, **prima** di leggere le conclusioni del piano | 2 bloccanti, 13 minori; 9 mutanti nuovi con la prova che li uccide, **misurati** |
| Sicurezza, sessioni, accesso | Task 5, 7 e le voci di sicurezza del Task 8 | **D3c-16 misurata: realizzabile** con un aggiornamento semplice; 2 reperti che chi scrive ha trattato da bloccanti (il ripristino, la sonda 7d), 5 minori |

**I bloccanti, tutti corretti:**

| # | Reperto | Dove | Trovato da |
|---|---|---|---|
| 1 | La `0022` **non si applicava**: `select distinct` con un `order by` su un'espressione diversa (`a.start_cell` contro `a.start_cell::int`), `42P10` alla creazione, `db reset` fermo | Task 2 | **due revisori, indipendenti** |
| 2 | `security invoker` di `scrivi_giorno_settimana` e `riordina_operatrici` **senza presidio**: rese `definer`, zero rosse; un'estranea avrebbe riscritto la settimana di Vera | Task 2 | mutazioni |
| 3 | La `0022` faceva arrossire `tests/schema/ricerca-clienti.test.ts:123-125`, non nominata | Task 2 | avversariale |
| 4 | `.env.production.local` lasciato sul Mac **avvelenava ogni build di Node**, e2e compreso, puntandolo al progetto ospitato — dopo la sessione 2, a quello **vero** | Task 1, 8 | avversariale |
| 5 | L'e2e sull'anteprima di Cloudflare **non poteva puntare all'anteprima**: `aiuti.ts:195` e `preparazione.ts:50` fissano `:3000`, e con un'altra chat su `:3000` sarebbe uscito verde su Node | Task 1 | avversariale |
| 6 | **Il ripristino non poteva riuscire**: la copia contiene anche `operator` e `salon_settings`, che ogni progetto migrato ha già → `23505` e tutto annullato. Il controllo «client vuota» non lo vedeva | Task 7 | **due revisori, indipendenti** |
| 7 | **Segreti a schermo**: `export DATABASE_URL=…` e la passphrase di D8 nel terminale che la chat legge | Task 7, 8 | avversariale |
| 8 | La seconda prova del «telefono perso» **rossa per la ragione sbagliata**: `preparaAccountLocali()` gira una volta per modulo e la password cambiata dalla prima non tornava | Task 7 | avversariale |
| 9 | L'e2e del Task 5 **uccideva anche la sessione salvata di Vera**, non solo quella di Annalisa | Task 5 | avversariale |
| 10 | Le «tre frasi» del primo avvio **non potevano comparire**: `pulisci()` scrive gli orari di tutte | Task 6 | avversariale |
| 11 | Il `23505` concorrente via PostgREST **non si provoca** con `Promise.all`: prova instabile | Task 2, 4 | avversariale |
| 12 | La sonda 7d **non poteva arrossire**: il passo 5 chiude comunque le sessioni; il danno è nella finestra fra 2 e 5, e ora lo si asserisce lì | Task 7 | sicurezza |
| 13 | La prova P1 **scadeva** il 16/11/2026: date fisse, e la seconda sarebbe rientrata nei 28 giorni | Task 2 | mutazioni |
| 14 | Il ladro che **cancella** la riga di una collega (D3c-20) lasciava il passo 3 a una riga sola, in silenzio | Task 7 | sicurezza |

**Minori corretti nel testo:** il riassunto «oltre cinque giorni» che lo spec non dice (P2); l'eccezione di spec
§7.5 per «Chiudi tutte le sessioni»; la prova statica che leggeva un file non ancora esistente; il sottodominio
`workers.dev` da registrare prima e il dispiegamento lanciato dall'utente; H5-bis che non isola il middleware,
dichiarato; il colore di Vera rimesso dopo l'e2e; la sonda 3h scritta in una forma non equivalente; la clausola
ΔE ≥ 15 e le sonde 2k, `p_ids is null`, il `grant` ridondante, dichiarate equivalenti; tritanopia e non
deuteranopia; P7 da aggiungere a `catalogue-audit.test.ts` se fa già l'elenco; `tempo.spec.ts` e non
`diretta.spec.ts`; l'agenda che **non si apre** senza `salon_settings`; le firme degli aiuti scritte nel task che le
usa; §6.4 e tre prove di §10.2 nella tabella di §6; la precedenza di §6.6 e il `23P01` su `exception_range` nelle
prove del Task 4; due progetti gratuiti per proprietario; «il primo martedì da oggi + 40»; la positiva accanto alla
disattivata; la passphrase sulla carta e non nel gestore; l'ordine 3–5–4 del «telefono perso»; il recupero spento
verificato in testa alla procedura.

**Annotati, non corretti** (regola d'arresto: nessun danno su un percorso raggiungibile):
- `scrivi_giorno_settimana` accetta una fascia con un terzo elemento e lo scarta: la forma la valida l'app.
- Chi si disattiva può portarsi via una collega **nello stesso comando** (misurato, caso E): l'app non lo fa, un
  telefono rubato sì, come il resto di spec 3c §8.4.
- Il recupero via email della casella di un'operatrice sul telefono perso: senza SMTP e con il recupero spento
  (D3c-1, C5–C7) non è raggiungibile; la procedura lo verifica in testa.
- `session_replication_role` concesso al `postgres` di Supabase: «confermato dalla documentazione, a memoria» per il
  revisore; resta **[da misurare]** al Task 7 Passo 6, con il ripiego scritto.

**Che cosa questo giro NON ha visto, per costruzione:** l'esecuzione simulata di §9 su un progetto ospitato (spec 3c
§14.3 dice che è lì che §9 si rompe). La fa il Task 1 per il Worker e il Task 7 per il ripristino; il resto lo
trova la sessione 1.
