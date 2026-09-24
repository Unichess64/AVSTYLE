# Piano 3a — Il giorno: documento di design

**Data:** 22 settembre 2026
**Revisione:** 12 — allinea §4.7 a ciò che l'esecuzione del Task 3 del piano 3a-1 ha **misurato** il 24 settembre
2026: le politiche di `public` sono **15**, non 13 (il Task 1 ne ha aggiunte due, su `invio` e `visita_cancellata`);
la politica su `realtime.messages` **non è creabile** e il rimando va tolto; la funzione usa
`current_setting('request.jwt.claims', true)` con **doppio** `nullif` invece di `auth.jwt()`; e il reperto **S4-4
torna aperto**, perché il rientro consegnato non neutralizza ancora i trigger. Nient'altro è cambiato;
**revisione 11** — chiude in §8.5 la sola decisione che la revisione 10 lasciava al piano: i quattro utenti
`@example.test` di `seed.sql` **restano**, con le ragioni misurate e il rischio residuo dichiarato (dall'esecuzione del
Task 2 del piano 3a-1, 24 settembre 2026). Nient'altro è cambiato; **revisione 10** — corregge i reperti del controllo
dei 5 casi (appendice I), che non ha trovato bloccanti;
**revisione 9** — corregge i reperti della verifica dei 20 casi (appendice H); **revisione 8** — dopo sei giri e un
giro finale su 105 casi (appendice G); prima, **revisione 7** — dopo sei giri di revisione avversariale (cinque, quattro, tre, due, due e due revisori, tutti su
Opus); registri nelle appendici A–F. La rev. 7 corregge i reperti del sesto giro (appendice F); uno dei revisori del
sesto giro ha **misurato** il meccanismo di «Controlla» su un database di prova separato.
**Revisione 5, per la storia:**
I registri sono nelle appendici A–D. Il quarto giro ha mostrato che il meccanismo di ripetizione dei salvataggi
(codice di richiesta, registro, sei esiti) generava a ogni correzione difetti nuovi della stessa famiglia; la rev. 5
lo **sostituisce** con un modello più semplice scelto dall'utente (D3-21), e toglie la password automatica (D3-20).
**Stato:** revisione conclusa secondo il criterio di §11; in attesa del sì dell'utente per il commit; non committato
**Spec di riferimento:** `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`, revisione 5 (in inglese). «spec
§N» = sezione della spec; «§N» senza prefisso = sezione di questo documento.
**Base di codice:** `main` a `89b4acc`
**Nato da:** brainstorming del 22 settembre 2026, con bozze visive in `.superpowers/brainstorm/7081-1790078630/content/`
(non versionate)

Questo documento fissa **che cosa** costruisce il piano 3a e **perché**. Il **come**, riga per riga, è del piano di
implementazione.

Legenda: **[misurato]** = verificato dall'orchestratrice su file o comando, con la sede; **[dalla revisione]** =
misurato o letto da un revisore, con la fonte; **[dalla spec]**; **[proposta]** = numero o scelta che il piano misura
o conferma; **[da misurare]** = fatto non stabilito.

---

## 1. La divisione del piano 3

| Piano | Nome | Contenuto |
|---|---|---|
| **3a** | Il giorno | scheletro dell'app, accesso e sessioni, navigazione, agenda (spec §9.1–§9.3), scheda visita (spec §9.4), percorso di scrittura, aggiornamento in diretta, tutta la spec §10 |
| 3b | Dove c'è posto | cercaposti (spec §9.5) con paginazione e «fuori orario», clienti (spec §9.6), compleanni (spec §9.7) |
| 3c | La preparazione | disponibilità (spec §9.8) e restringimento (spec §7.6), impostazioni (spec §9.9), primo avvio (spec §9.10), **verifiche prima del rilascio** (§8.7) e **procedura «telefono perso»** (D3-20) |

Ogni piano ha il proprio ciclo brainstorming → spec → piano → esecuzione → verifica. D19 resta: il salone non usa
l'app prima della fine del 3c.

---

## 2. Decisioni dell'utente del 22 settembre 2026

| # | Decisione | Nota |
|---|---|---|
| D3-1 | Tre piani per area (§1) | |
| D3-2 | **Sobria dentro, viva fuori** | |
| D3-3 | **Solo telefoni**, in verticale, 375–430 punti | |
| D3-4 | Il blocco mostra **ora d'inizio, nome, servizio**; nei blocchi bassi solo il nome | |
| D3-5 | **Manrope** per l'interfaccia con cifre tabulari; **Cinzel** solo per titoli e marchio | §6.1, L3 |
| D3-6 | Colori di partenza: **Vera `#C2185B`**, **Annalisa `#FFFFFF` con bordo in inchiostro**, **Alessandra `#9B1B1B`**; accettato il limite in tritanopia | §6.2, L4, L9 |
| D3-7 | **Scheda unica** per creare e modificare | |
| D3-8 | Avvisi «fuori orario» e «cliente già prenotata» come **riga ambra con il motivo**; il pulsante diventa **«Salva comunque»** | L1 |
| D3-9 | Dopo «Salva» la scheda **resta aperta finché il database conferma**; poi «✓ Salvata» e chiusura dopo un secondo; senza risposta entro **10 s** [proposta] si passa a D3-21 | spec §10.3 |
| D3-10 | **Nessuna operatrice «di casa» per dispositivo** | L2 |
| D3-11 | **La sessione non scade da sola** | |
| D3-12 | **L'agenda si aggiorna da sola** quando una collega scrive; obiettivo ≤ 3 s [proposta] | D3-16 |
| D3-13 | **Letture dirette al database** sotto la sicurezza per riga; **scritture da Server Actions** con la sola sessione dell'utente | §4.2 |
| D3-14 | **Le sessioni di un account si chiudono da sole** quando l'operatrice viene disattivata, riattivata, collegata, scollegata o cancellata; nel 3c un pulsante **«Chiudi tutte le sessioni»** per un'altra operatrice | §4.7 |
| D3-15 | **Trascinamento solo verticale**, solo del blocco preso; «Spostata alle 16:15 · Annulla» per 6 s dopo la conferma | L7, L10 |
| D3-16 | **Aggiornamento in diretta su un canale privato** che annuncia solo **quali giorni** sono cambiati | §4.6 |
| D3-17 | **Chiusura immediata**: chiuse le sessioni, il telefono non legge e non scrive più da subito | §4.7 |
| D3-18 | **Una visita cancellata non ricompare da sola**: se una collega l'ha cancellata, l'app lo dice | §4.4 |
| D3-19 | **Un avviso nuovo al salvataggio ferma il salvataggio** e chiede «Salva comunque» | §4.5 |
| D3-20 | **Telefono perso: procedura scritta, niente password automatica.** L'app non tocca mai le password. Procedura dalla dashboard di Supabase, nell'ordine di §4.7: prima si chiudono le sessioni dell'account perso, poi si cambia la password, poi si rimettono in ordine le operatrici | Rev. 5: sostituisce la password automatica della rev. 4, che permetteva a un telefono rubato di chiudere fuori tutto il salone |
| D3-21 | **Salvataggio incerto: «Controlla», non «Riprova».** Se la risposta non arriva, l'app non ripete il salvataggio alla cieca: rilegge la visita dal database e mostra com'è davvero — salvata, mai arrivata (e allora offre «Salva»), cancellata da una collega | Rev. 5: sostituisce codice di richiesta e registro della rev. 4 |

---

## 3. Perimetro del 3a

### 3.1 Dentro

- Scheletro Next.js (App Router), manifesto web, **nessun service worker** (spec §4.1); versione di Next non inferiore
  a quelle che correggono CVE-2025-29927 [dalla revisione]; `serverActions.allowedOrigins` non allargato.
- Accesso con email e password; «Esci» chiude **solo questo telefono**; uscita forzata di un'operatrice disattivata
  (spec §4.4); chiusura delle sessioni (D3-14, D3-17).
- Navigazione a quattro voci (spec §9.11); Clienti, Disponibilità, Impostazioni come pagine segnaposto; nessun «+».
- Agenda a colonne, a lista, settimana per operatrice (spec §9.1–§9.3).
- Scheda visita: creare, modificare, aggiungere e togliere servizi, cancellare **con una conferma** (spec §8.7,
  §10.4). Trascinamento secondo D3-15.
- Nella scheda: cercare la cliente o crearla, con telefono in **E.164** (spec riga 511 [misurato]) e doppioni per
  **nome simile**.
- Tutta la spec §10, con il **segnale periodico di connessione** (spec riga 1419 [misurato]).
- Aggiornamento in diretta; dati di prova (§8.5).

### 3.2 Obblighi aperti che il 3a chiude

| Obbligo | Come | Prova |
|---|---|---|
| `RETRY-40P01` | §4.3 passo 5 | §8.2, `40P01` ricevuto dal percorso |
| `DATE-IMPOSSIBILI` | validazione in scrittura (§4.3 passo 2) e in lettura (§4.8) | §8.1 |
| `GUARDIE-TEMPO` | guardie di interezza di `blocco()` su `cellCount` e `bufferAfterCells`, ancore delle regex di `confineDaOra` e `pezziData` | §8.1 |
| `CONTORNO-CERCAPOSTI`, parte `decodificaFinestra` | l'agenda è il primo chiamante; valida ciò che riceve | §8.1 |
| `PERMESSI-FUNZIONI` | §8.2 | §8.2 |
| `MIGRAZIONE-SALTATA` | §8.2 | §8.2 |
| `OUTSIDER-WRITE` | §8.2 | §8.2 |
| `NODE-PIN` | §8.6 | CI |

### 3.3 Fuori

- **3b:** cercaposti con `CERCAPOSTI-PAGINE` e `FUORI-ORARIO`; resto di `CONTORNO-CERCAPOSTI`; `INGRESSO-CERCA-TIPO`;
  clienti, compresa la modifica di una cliente (oggi `client` non ha `updated_at` [dalla revisione]); compleanni.
  Prova 2 di spec §13.4. Il 3b **decide** su `SEGUENTE-VICINO` e `PRECEDENZA-MOTIVI` e aggiunge l'annuncio sul canale
  quando cambia una cliente.
- **3c:** disponibilità e `RESTRINGIMENTO`; impostazioni (colori, disattivazione, pulsante di D3-14); primo avvio;
  prove 6 e 8; verifiche prima del rilascio (§8.7); procedura scritta «telefono perso» (D3-20); annuncio sul canale
  quando cambiano disponibilità e chiusure; ritentativi su `40P01` anche per le scritture su `operator`.
- **Piano 4:** dati personali (spec §11).
- **Limiti noti senza piano:** `ORDER-BY`, `ANALYZE-anon`, `AUTHUSERS-DELETE`.
- **Scambio fra operatrici** (`swap_appointment_operators`, `0010_write_functions.sql:85` [misurato]): non esposto.

---

## 4. Il percorso di scrittura

### 4.1 Il database

**Che cosa c'è e che cosa manca** [misurato salvo dove detto]:

1. Nessuna funzione scrive in una transazione una visita e più appuntamenti (`0010_write_functions.sql:31`, `:85`,
   `:156`, `:191`).
2. `move_visit(uuid, date, integer)` non ha controllo di versione (`0010:31-83`, `update` a `:56`) e sposta di uno
   scarto relativo.
3. `visit.updated_at` cambia solo sulla riga `visit` (`0004_visit_appointment.sql:50-53`): la versione della visita
   non vede né i cambiamenti né le aggiunte di appuntamenti.
4. Cambiare `visit_date` porta con sé tutti gli appuntamenti (`on update cascade`, `0004:26-29`) e ne cambia le
   versioni (spec §10.2).
5. `zz_delete_orphan_visit` è AFTER DELETE di riga non differito (`0008_orphan_visit.sql`) [dalla revisione]: togliere
   l'ultimo appuntamento cancella subito la visita, anche a metà di una funzione; non impedisce di inserire una visita
   vuota.
6. Gli `id` possono venire dal telefono (`0004:4`, `:12`).
7. Colori nel database: Annalisa `#7B3F61`, Alessandra `#2F6F6B` (`0001_access_control.sql:55-56`).
8. `pg_trgm` disponibile ma non installato; `unaccent`, `btree_gist` e `pgcrypto` nello schema `extensions` [dalla
   revisione].
9. `app.is_active_operator()` controlla solo `operator` (`0001:27-39`); la usano **15 politiche** in `public`, nella
   forma nuda senza `(select …)` [dalla revisione, catalogo]. ⚠︎ Erano 13 quando questo fatto è stato scritto; il
   Task 1 del piano 3a-1 ne ha aggiunte due, `invio_lettura` e `visita_cancellata_lettura`, già nella forma con il
   `select`. Ricontate sul catalogo il 24/09/2026: **15**, e in `realtime` **zero**.
10. Pubblicazione `supabase_realtime` vuota; `realtime.messages` partizionata per giorno, sicurezza per riga attiva,
    zero politiche; `realtime.send` è `security invoker` e **inghiotte ogni errore** [dalla revisione, tre revisori].
11. `statement_timeout = 8s` per `authenticated`, `lock_timeout = 8s` per `authenticator`, `deadlock_timeout = 1s`
    [dalla revisione, due revisori].

**Che cosa porta il 3a**, in una o più migrazioni nuove. Il nome segue il modello accettato dal CLI (`<numero>_nome.sql`,
findings del piano 2, n. 11); il numero è libero sul disco e non rivendicato; il piano verifica l'ordine di
applicazione stampato da `db reset` oltre alla prova `MIGRAZIONE-SALTATA`.

**`save_visit`** — crea o modifica una visita, tutto o niente. Riceve: il **codice d'invio** (§4.4); `id` della visita; cliente (esistente per `id`,
oppure **nuova** con i suoi campi e il suo `id`, creata nella stessa transazione); data; elenco **completo** degli
appuntamenti voluti (`id`, operatrice, servizio, inizio, durata); e, **solo in modifica**, la **versione attesa della
visita e l'insieme atteso degli appuntamenti esistenti con la versione di ciascuno**. Regole:

0. **Codice d'invio.** Subito dopo `set constraints` e **prima di qualunque altra scrittura**, registra il codice
   d'invio con la funzione di servizio (§4.4). Dopo un conflitto sulla chiave **non scrive mai**: codice «annullato» →
   esito `annullato`; codice con un esito già registrato → quell'esito, senza scrivere. Alla fine registra l'esito che
   restituisce.
1. **Modo.** Senza versione attesa è una creazione; con versione attesa è una modifica.
2. **Blocco, poi lettura.** Blocca la visita (se esiste); **con un'istruzione successiva** blocca i suoi appuntamenti in
   ordine di `id` e legge la tabella delle visite cancellate. Non blocca `client` prima di `visit` (spec §10.5, §12.1).
3. **Creazione su un `id` che esiste già** → esito **`esiste_gia`**, senza scrivere. Il server allora rilegge e
   mostra (§4.4). Non si decide qui se è la propria scrittura arrivata prima o no: lo dice la rilettura.
4. **Creazione su un `id` fra le cancellate** → esito **`cancellata_altrove`**.
5. **Modifica su una visita assente**: fra le cancellate → `cancellata_altrove`; altrimenti → **`non_trovata`**.
6. **Modifica su una visita presente**: se la versione della visita, **l'insieme degli `id` degli appuntamenti
   esistenti** o la versione di **uno qualunque** di essi differiscono da quelli attesi → **`modificata_altrove`**, con
   lo stato corrente. Un appuntamento aggiunto da una collega fa differire l'insieme: **non viene mai tolto in
   silenzio**.
7. **Regole sull'elenco:** almeno un appuntamento (per togliere tutto si usa `delete_visit`); ogni `id` esistente
   nell'elenco appartiene a **questa** visita; ogni `id` nuovo non esiste altrove.
8. **Ordine delle scritture**, dopo i controlli: cliente nuova; visita (insert, oppure update di data e cliente **solo
   se cambiano**); aggiornamento **solo degli appuntamenti che cambiano** (aggiornare righe identiche alzerebbe le
   versioni e darebbe «modificata altrove» alle schede aperte delle colleghe); inserimenti; **per ultime** le
   cancellazioni degli appuntamenti tolti, così `zz_delete_orphan_visit` non trova la visita vuota a metà. **Se
   l'insieme degli appuntamenti cambia** (inserimenti o cancellazioni), la funzione aggiorna anche `visit.updated_at`:
   così «tornato come prima» (una collega aggiunge e poi toglie) non si confonde con «mai cambiato» [dalla revisione:
   nessun trigger lo fa oggi, misurato su `pg_trigger`].
9. Apre con `set constraints appointment_slot_unique deferred` e chiude con `set constraints appointment_slot_unique
   immediate`, nominando il vincolo e non `ALL` (`0010:8-26`).
10. Restituisce l'esito e le **versioni nuove** di visita e appuntamenti.
11. **Conteggio delle righe.** Ogni UPDATE e DELETE **con la WHERE sul solo `id`** (il confronto delle versioni è già
    fatto sotto lock alle regole 2 e 6, quindi zero righe qui non significa «versione diversa» come in spec §10.2, ma
    «la riga non mi è più visibile») controlla il numero di righe toccate e solleva un errore **con un codice fra quelli
    che provano l'annullamento** (§4.3 passo 8) se è zero
    (spec §10.2, «affected-row count»): con la sicurezza per riga un account chiuso nell'istante della scrittura
    toccherebbe zero righe **senza errore**, e la funzione registrerebbe un falso `salvata` o `cancellata` [dalla
    revisione, giro finale]. Vale per **tutte e tre** le funzioni.

**`move_visit_to`** — sposta **tutta** una visita: riceve la nuova data e il **nuovo inizio di ciascun appuntamento**
(calcolati dall'app conservando gli scarti), la versione attesa della visita e l'insieme atteso con le versioni.
L'insieme degli `id` di destinazione deve **coincidere** con l'insieme atteso. Regole 0, 2, 5, 6, 8, 9, 10, 11 di
`save_visit`. Serve al trascinamento di un blocco che rappresenta tutta la visita (§5.1).

**`delete_visit`** — con le regole 0, 2, 10 e 11, e con **una sola DELETE su `visit`** (la cascata di `appointment_visit_date_fk` porta via
gli appuntamenti: cancellarli prima farebbe scattare `zz_delete_orphan_visit` e la DELETE sulla visita toccherebbe zero
righe, che la regola 11 leggerebbe come errore su una cancellazione riuscita [dalla revisione]) (blocca la visita e i suoi appuntamenti prima di confrontare, così un
servizio aggiunto da una collega nello stesso istante non sparisce per cascata), cancella la visita con la versione della visita e l'insieme atteso con le versioni. Visita
assente e fra le cancellate → **`gia_cancellata`** («Era già stata cancellata», senza offerta di ricrearla, chiunque
l'abbia cancellata). Visita assente e non fra le cancellate → `non_trovata`. Insieme diverso → `modificata_altrove`.
Riuscita → **`cancellata`**.

**Esiti** — restituiti come valore, non come errore:

| Esito | Da | Messaggio |
|---|---|---|
| `salvata` | `save_visit`, `move_visit_to` | «✓ Salvata» |
| `cancellata` | `delete_visit` | «✓ Cancellata» |
| `gia_cancellata` | `delete_visit` | «Era già stata cancellata» |
| `esiste_gia` | `save_visit` in creazione | nessuno: il server rilegge e mostra (§4.4) |
| `modificata_altrove` | tutte | spec §10.2 caso 1: mostra lo stato corrente |
| `cancellata_altrove` | `save_visit`, `move_visit_to` | «È stata cancellata da un'altra parte» (§4.4) |
| `non_trovata` | tutte | dopo il ricontrollo dell'account (§4.3 passo 7): account chiuso, oppure «questa visita non esiste più» |
| `annullato` | tutte | l'invio è arrivato dopo che «Controlla» l'aveva dichiarato non arrivato: nessuna scrittura; la risposta si scarta (§4.4) |

`da_confermare` (D3-19) è un esito **del server**, calcolato prima di chiamare la funzione (§4.5). Restano **errori**:
`23505`, `23503`, `40P01`, `42501`, `57014`, `23514`. Il piano fissa quale codice solleva ciascuna funzione in ogni caso.

Le **versioni** (`updated_at`) viaggiano **come testo, così come arrivano**, mai attraverso un `Date` di JavaScript
(spec §10.2).

**Altro nella migrazione:**

- **Visite cancellate:** tabella in `public` con `id` della visita e istante, alimentata da un **trigger AFTER DELETE
  su `visit`** `security definer` (così la riempiono anche le cancellazioni per visita orfana e per cascata dalla
  cliente), con `on conflict (id) do update`. Ad `authenticated` **solo SELECT**, con politica `(select
  app.is_active_operator())`; TRUNCATE e MAINTAIN revocati come vuole l'audit esistente
  (`tests/schema/catalogue-audit.test.ts`). **Il dato è pseudonimo, non anonimo**: un `id` di visita compare anche nei
  log e nei backup, e dopo la cancellazione di una cliente resta il numero delle sue visite e l'istante. Si tiene
  **30 giorni** [proposta], più a lungo della vita massima di una scheda aperta (§4.4).
- La vecchia `move_visit(uuid, date, integer)` revocata ad `authenticated` o eliminata; oggi la chiamano **9 prove** e
  11 la toccano, tutte in `tests/schema/write-functions.test.ts` [dalla revisione, due revisori]. Divergenza dalla spec
  §4.6 (L8).
- Colori delle operatrici (D3-6).
- `create extension pg_trgm with schema extensions`; nomi qualificati (`extensions.similarity(...)`); soglia
  [proposta 0,4] misurata sull'esempio «maria rosi» / «Maria Rossi» di spec §8.2.
- Funzione di **ricerca delle clienti** e di **controllo dei doppioni**, chiamata in POST (§4.8).
- Funzione di **«Controlla»** (§4.4) e tabella degli **invii**.
- Canale privato (§4.6), chiusura delle sessioni e controllo della sessione (§4.7).

**Disciplina di ogni funzione nuova:** `security invoker` salvo dove serve `definer` (proprietaria `postgres`, guardia
`(select app.is_active_operator())` dove la chiama un utente); `search_path = ''` con nomi qualificati (come 0011 e
0012); EXECUTE revocato a `public` **e** ad `anon` (la regola predefinita dei permessi di `postgres` in `public` lo
concede esplicitamente ad `anon` [dalla revisione]) e concesso ad `authenticated`.

### 4.2 Con che identità scrive il server

- Identità verificata con **`getUser()`**; mai `getSession()`; non `getClaims()`, che con chiavi di firma asimmetriche
  non vede una sessione revocata [dalla revisione, documentazione Supabase].
- Scritture **con il JWT dell'utente**; `service_role` **non presente** nell'ambiente di esecuzione.
- Ogni Server Action è raggiungibile con un POST diretto e si protegge da sola [dalla revisione, documentazione
  Next.js]. Un **involucro unico** attorno a ogni Server Action cattura ogni errore e restituisce solo esito e codice.

Ciò che vive solo nel server dell'app — controllo preventivo, ritentativi, avvisi — è integrità verso l'utente.
**Nel database** reggono anche scavalcando l'app: date reali, celle 0–287 e fine ≤ 288 (`0004:17-21`), nessuna
sovrapposizione (`appointment_slot`), data dell'appuntamento legata alla visita (`0004:26-29`), compleanno plausibile
(`0003:28-34`). **Non** reggono scavalcando l'app: versioni, insieme e codice d'invio, che vivono nelle funzioni;
`authenticated` ha anche INSERT, UPDATE e DELETE diretti su `visit`, `appointment` e `client` [dalla revisione,
catalogo], e chi li usa salta quei controlli. È integrità verso l'utente, non sicurezza: un'operatrice attiva può già
scrivere tutto. «Nessuna visita vuota» all'inserimento la garantisce solo `save_visit` (regola 7).

### 4.3 Che cosa fa una Server Action di scrittura

1. **Account attivo** (spec §4.4).
2. **Validazione di dominio** prima di ogni chiamata: date reali, celle 0–287, durate positive, fine ≤ 288, nome non
   vuoto, compleanno reale, telefono normalizzabile in E.164 (`libphonenumber-js`, paese predefinito **IT**).
3. **Controllo preventivo dei conflitti**, escludendo **tutti** gli `id` in scrittura: nuovi, modificati **e tolti**
   (spec §10.1). Frase dall'appuntamento che possiede la cella, con pulsante «vai lì». **Avvisi** (§4.5) calcolati di
   nuovo: se ce n'è uno non confermato, esito `da_confermare` senza chiamare la funzione (D3-19).
4. **Scrittura** con la funzione.
5. **`40P01`:** fino a **3 ritentativi** con attese brevi e casuali [proposta]. È sicuro: ogni chiamata è una
   transazione e l'abort la annulla per intero; il ritentativo avviene **dentro la stessa Server Action**, prima di
   rispondere, **con lo stesso codice d'invio**, e non è un «Riprova» dell'utente. Bilancio di tempo: 1 s di `deadlock_timeout` per ogni `40P01`, fino a
   8 s per chiamata; il piano misura che il caso tipico stia nei 10 s di D3-9. Esauriti: *«Non sono riuscita a
   salvare, riprova»*, e la scheda resta com'era.
6. **`23505`, per nome del vincolo:** `appointment_slot_unique` → rifà il controllo del passo 3 e dà la frase con
   **tutti** i conflitti; chiave primaria di `visit`, `appointment` o `client` → un invio doppio concorrente: il server
   **non ripete**, rilegge la visita e mostra come le righe 2 o 3 di §4.4. **`23503`** su `visit.client_id` → la
   cliente è stata cancellata nel frattempo: «La cliente è stata cancellata», nessuna offerta di ricrearla; `23503` su
   servizio od operatrice → «Il servizio o l'operatrice non esiste più», e la scheda si ricarica.
7. **Account chiuso fra il passo 1 e la scrittura:** su `42501`, su un `salvata` che **non ha eseguito alcun UPDATE**
   (uno stato già identico a quello chiesto: lì la regola 11 non ha righe da contare) e su **ogni esito diverso da
   `salvata` e `cancellata`** — compreso `modificata_altrove`, che un account chiuso fra due letture riceve con uno stato
   «corrente» vuoto — si **ricontrolla l'account** prima di scegliere il messaggio e prima che la scheda adotti lo
   stato restituito.
8. **Altro:** solo gli errori che **provano** che la transazione è stata annullata (`40P01` esauriti, `57014`,
   `23505`, `23503`, `23514`, `42501`) danno un messaggio di fallimento («Non sono riuscita a salvare, riprova» o il
   messaggio proprio). **Ogni altro errore** — rete fra il server dell'app e Supabase, tempo scaduto della
   piattaforma, codice non riconosciuto dall'involucro — **non prova nulla** e dà *«Non so se è stata salvata»* con
   «Controlla» (§4.4). Azione non trovata dopo un nuovo rilascio → «l'app è stata aggiornata, ricarica». I dati
   restano nella scheda.

La **decisione** dei passi 2, 3, 5, 6, 7, 8, data la lettura del database, e la traduzione degli esiti sono **logica
pura** (§8.1).

### 4.4 Salvataggio incerto: «Controlla» (D3-21, D3-18)

Gli `id` di visita, appuntamenti e cliente nuova si generano all'apertura della scheda; ogni **invio** («Salva»,
«Elimina visita», «Togli», rilascio di un trascinamento, «Annulla») ha un proprio **codice d'invio**, generato **sul
telefono**, uguale per tutti i ritentativi su `40P01` di quell'invio (§4.3 passo 5). Tutti con
**`crypto.randomUUID()`, senza ripieghi**.

**Il problema.** Un invio può scrivere nel database **dopo** che il telefono ha smesso di aspettarlo: il server
ritenta, ogni chiamata può durare fino a 8 s (§4.1 punto 11), e una Server Action partita non si annulla. Una rilettura
che guardasse solo lo stato della visita direbbe «non risulta salvata» a un invio che arriva un attimo dopo [dalla
revisione, due revisori indipendenti al quinto giro].

**Il rimedio: «Controlla» brucia l'invio che non trova.** Una tabella `public` degli **invii** tiene il codice d'invio
e uno stato. Né `authenticated` né `anon` vi scrivono direttamente: le scritture passano da **una sola funzione di
servizio** `security definer` (proprietaria `postgres`, `search_path = ''`), eseguibile solo dall'interno delle
funzioni di scrittura e di «Controlla»; ad `authenticated` solo SELECT, con politica `(select
app.is_active_operator())`. Nessuno può, via PostgREST, cancellare o «sbruciare» un codice.

- **Ogni funzione di scrittura**, come **prima istruzione dopo `set constraints`** (nessuna scrittura prima, perché
  sopravviverebbe al conflitto sulla chiave [dalla revisione, misurato]), registra il proprio codice con
  `insert … on conflict do nothing` e controlla il numero di righe inserite. **Dopo un conflitto non scrive mai**: se
  lo stato è «annullato» → esito `annullato`; se è un altro esito già registrato → restituisce quell'esito senza
  scrivere; se non vede nessuna riga → errore. Alla fine registra l'esito che restituisce.
- **«Controlla»** è una funzione `volatile` che, in **istruzioni separate** (mai una CTE né una funzione `stable`, che
  leggerebbero con la fotografia presa prima dell'attesa [dalla revisione, misurato]): ricontrolla l'account; inserisce
  il codice come «annullato» con `on conflict do nothing`; **poi**, in un'istruzione successiva, legge lo stato del
  codice, la visita e la tabella delle cancellate.
- **Livello di isolamento `read committed`**, il predefinito, dichiarato; nessuna funzione lo cambia (§8.2).

Misurato su un database di prova separato [dalla revisione, sesto giro]: con queste regole, se l'invio ha già
registrato il codice «Controlla» **aspetta** che finisca, commit compreso (anche la parte differita), e poi lo vede;
se «Controlla» arriva prima, l'invio che arriva dopo restituisce `annullato` e non scrive; se l'invio fallisce e
annulla la transazione, il codice resta libero e «Controlla» lo brucia. **Così «Non risulta salvata» è definitivo.**

Non è la ripetizione automatica scartata con D3-21: nessun invio viene rifatto da solo.

**Dove passa «Controlla».** Le Server Actions partono dal telefono **una alla volta**, in fila [dalla revisione,
documentazione di React]: un «Controlla» come Server Action resterebbe in fila dietro l'invio bloccato. «Controlla» e il
segnale periodico di connessione passano quindi da una **rotta del server** (route handler) chiamata con `fetch`,
**fuori dalla fila**.

**Quando la risposta non arriva** (10 s di D3-9, errore di rete), la scheda dice *«Non so se è stata salvata»* e
mostra **un solo pulsante: «Controlla»**; «Salva» è spento. Un `57014` o un `40P01` esauriti **di un invio** non sono
esiti incerti: la transazione è annullata e vale §4.3 passo 8. Le risposte tardive dell'invio abbandonato **si
scartano** (numero di generazione).

**Se «Controlla» stesso fallisce** — tempo scaduto (`57014`, `55P03`), `40001`, `40P01`, errore di rete — la risposta è
**sempre** di nuovo *«Non so se è stata salvata»* con «Controlla» disponibile: **mai** «non risulta», **mai** «riprova a
salvare». Un «Controlla» fallito non brucia nulla, e l'invio può ancora arrivare [dalla revisione, misurato].

**Le righe**, in quest'ordine:

| # | Stato del codice | Che cosa trova | Che cosa mostra |
|---|---|---|---|
| 1 | annullato (da «Controlla» o dall'invio stesso) | — | «Non risulta salvata: l'invio non ha scritto nulla». «Salva» si riaccende con un codice nuovo e con le **versioni di partenza della scheda**, mai con versioni rilette: se nel frattempo una collega ha cambiato la visita, il nuovo «Salva» riceverà `modificata_altrove` e nulla sarà tolto in silenzio |
| 2 | `salvata` | visita uguale alla scheda | «✓ Risulta salvata» |
| 3 | `salvata` | visita diversa dalla scheda | *«È diversa da come l'avevi lasciata: ecco com'è ora»*, con lo stato corrente e le sue versioni, che diventano quelle di partenza della scheda |
| 4 | `salvata` | visita assente e fra le cancellate | «È stata cancellata dopo il salvataggio»; **«Crea di nuovo»** solo se la cliente esiste ancora (codici nuovi, cliente come esistente) |
| 5 | `salvata` | visita assente e **non** fra le cancellate | non deve accadere (ogni cancellazione passa dalla tabella): errore, e l'agenda si ricarica |
| 6 | un esito che non ha scritto (`esiste_gia`, `modificata_altrove`, `cancellata_altrove`, `non_trovata`) | — | il messaggio di quell'esito (§4.1); per `esiste_gia`, la visita si rilegge e si mostra come riga 2 o 3 |

**«Uguale alla scheda»**: stessa data, stessa cliente, stesso insieme di appuntamenti con, per ciascuno, stessa
operatrice, servizio, inizio e durata.

**«Elimina visita»** incerta: codice annullato e visita presente → si mostra **la visita letta** e, se è uguale a
quella di partenza, «Elimina» si riaccende con le versioni di partenza; se è diversa, vale la regola della scheda
aggiornata qui sotto; codice annullato e visita assente → «È stata cancellata nel frattempo» (il risultato voluto c'è,
ma non per mano propria); codice con esito `cancellata` → «✓ Risulta cancellata»; con esito `gia_cancellata` → «Era già
stata cancellata», lo **stesso messaggio** della risposta diretta; con esito `modificata_altrove` o `non_trovata` → il
messaggio di quell'esito.

**«Togli»** su un servizio che non è l'ultimo passa da `save_visit` e segue **le sei righe della tabella principale**;
dopo la riga 1 si riaccende **«Togli»**, non «Elimina». «Togli» sull'unico servizio è «Elimina visita».

**Regole comuni a tutti i messaggi dopo «Controlla»** (giro finale):

- **Dove sta la visita lo dice la lettura, mai la memoria del telefono.** Ogni messaggio che nomina un orario o uno
  stato usa la visita appena letta da «Controlla»: «la visita ora è alle 17:00», «la visita è stata cancellata»; mai
  l'orario che il telefono ricordava. Nel trascinamento, il blocco «torna» alla posizione **letta**, non a quella di
  partenza.
- **La scheda aggiornata.** Dopo la riga 3, la riga 6 e ogni `modificata_altrove`, **il contenuto della scheda diventa
  lo stato corrente** con le sue versioni; le modifiche dell'operatrice non inviate si perdono e si rifanno a mano,
  guardando la visita com'è ora. Tenere le proprie modifiche con le versioni nuove toglierebbe in silenzio il lavoro
  della collega (famiglia B5, R6-1).
- **Riga del codice non visibile** (per esempio un account chiuso fra il ricontrollo e la lettura) → *«Non so»*,
  **mai** la riga 1; «Controlla» ricontrolla l'account anche dopo la lettura. Se l'account risulta chiuso, **uscita
  forzata** senza affermazioni sulla visita.
- **`esiste_gia` con la visita sparita prima della rilettura** → la rilettura si tratta come riga 4 o 5.
- **«Crea di nuovo»** usa `id` **nuovi** per la visita e per gli appuntamenti, e un codice d'invio nuovo; la cliente
  si passa come esistente. Riusare l'`id` della visita darebbe `cancellata_altrove` per sempre.

**Scheda abbandonata con un invio incerto** (chiusa, ricaricata, «Esci», app chiusa dal telefono, 24 ore): l'invio
potrebbe ancora arrivare, fino alla durata massima di una Server Action con i suoi ritentativi (circa 35 s [dalla
revisione; da fissare nel piano]). Un invio è **pendente** dal tocco fino alla risposta definitiva.

1. Dove il browser lo permette, chiudere o lasciare la pagina **mentre un invio è pendente** chiede conferma (anche
   nei primi 10 s, prima che compaia «Non so»). **Su iPhone non basta**: iOS non avvisa la pagina quando chiude da solo
   un'app sospesa [dalla revisione].
2. All'abbandono parte un «Controlla» con `fetch` `keepalive`, **solo quando la pagina viene davvero scartata**
   (`pagehide` con `persisted === false`): su iPhone `pagehide` scatta anche al semplice passaggio a un'altra app, e
   bruciare lì il codice di un invio ancora in volo lo farebbe tornare `annullato` [dalla revisione].
3. **Il meccanismo che regge anche su iPhone:** per ogni invio pendente il telefono tiene in **`localStorage`** il
   codice d'invio, l'`id` della visita, l'`id` della cliente se esistente e l'istante del tocco — **solo
   identificativi casuali, pseudonimi**, nessun nome, telefono o orario —, e li cancella alla risposta definitiva.
   Ogni codice porta con sé **l'operatrice che lo ha scritto** e una **scadenza di 24 ore**, più corta della pulizia a
   30 giorni della tabella degli invii: un codice più vecchio si butta senza controllarlo, perché «Controlla» su un
   codice già ripulito direbbe «non risulta salvato» di un invio che era stato salvato. Alla riapertura dell'app, prima
   di tutto, ogni codice rimasto **della stessa operatrice che ha fatto l'accesso** passa da «Controlla» e se ne mostra
   il risultato; i codici di un'altra operatrice restano lì e si controllano quando rientra lei. Il nome della cliente
   compare **solo se letto dal database**; altrimenti il testo è senza nome («Il salvataggio delle 10:04 non risulta
   salvato»).
4. «Esci» esegue «Controlla» sugli invii pendenti **prima** di chiudere la sessione, con un limite di **5 s**
   [proposta] e un «Esci comunque»: i codici restano in `localStorage` e si controllano alla riapertura, quindi non si
   resta chiusi dentro quando la rete è giù.

La bozza della scheda resta solo in memoria (§4.9): dopo un abbandono l'operatrice ritrova l'esito, non la scheda.

**Vita della scheda.** Una scheda con un invio incerto vive al massimo **24 ore** [proposta] in memoria. La tabella
degli invii e quella delle cancellate si ripuliscono dopo **30 giorni** [proposta], dalla funzione di servizio stessa a
ogni scrittura (nessun lavoro pianificato da mantenere).

Il ✓ compare solo per `salvata`, `cancellata`, «✓ Risulta salvata» e «✓ Risulta cancellata».

### 4.5 Avvisi che non bloccano

«Fuori orario» (D18, spec §8.4), «cliente già prenotata lo stesso giorno» (D25, spec §8.5), e **la stessa cliente in
due servizi sovrapposti della stessa visita**. Riga ambra con il motivo. Calcolati mentre si compila e **di nuovo dal
server al salvataggio**; ognuno ha una chiave, e «Salva comunque» conferma le chiavi mostrate. Un avviso con una chiave
non confermata ferma il salvataggio (D3-19). **Limite dichiarato:** resta una finestra di millisecondi fra il calcolo
del server e la scrittura, in cui un avviso nato da una collega non ferma il salvataggio.

### 4.6 Aggiornamento in diretta (D3-12, D3-16)

**Perché non il canale standard.** Con la sicurezza per riga, `postgres_changes` porta per UPDATE e DELETE solo la
chiave primaria del vecchio record, e **non applica le politiche ai DELETE** [dalla revisione: documentazione Supabase;
`realtime.apply_rls` letto sul database locale; quattro revisori concordi].

**Il canale del 3a:**

- Un trigger **per istruzione** (tabelle di transizione) su `appointment` e su `visit` raccoglie i **giorni toccati,
  vecchi e nuovi**, e manda **un messaggio per istruzione** con `realtime.send(payload, 'giorni', 'agenda', true)`.
  Payload: **solo date**. `realtime.broadcast_changes` è vietata (metterebbe nel messaggio le righe intere). Essendo
  per istruzione, scatta dopo tutti i trigger AFTER di riga della stessa istruzione [dalla revisione, dedotto; da
  misurare].
- La funzione del trigger è **`security definer`, proprietaria `postgres`** (che ha `bypassrls`), `search_path = ''`:
  altrimenti l'inserimento in `realtime.messages` gira come `authenticated`, viene rifiutato e l'errore sparisce nel
  `RAISE WARNING` di `realtime.send`.
- ⚠︎ **Superato alla revisione 12.** Diceva: «**Una sola politica** su `realtime.messages`: `for select to
  authenticated using ((select app.is_active_operator()) and extension = 'broadcast' and (select realtime.topic()) =
  'agenda')`; **nessuna** politica INSERT, UPDATE o DELETE, perché una politica INSERT autorizzerebbe le trasmissioni
  dai telefoni». **Quella politica non è creabile**: `create policy` su `realtime.messages` fallisce anche a mano,
  perché il ruolo delle migrazioni non possiede la tabella (misurato il 23/09/2026). Il piano 3a-1 ha riscritto il
  Task 8 attorno a una tabella **`annuncio`** nostra, con le sue politiche, e la sicurezza del canale sta lì. Al
  24/09/2026 in `realtime` non c'è **nessuna** politica: chi cerca quella descritta qui sopra non la troverà.
- Ogni telefono si iscrive al canale **privato** `agenda` e ricarica **il giorno intero** se è fra quelli nominati.
- **Ripieghi:** ricarica alla riconnessione del canale, al ritorno in primo piano (`visibilitychange`, `pageshow`),
  alla mezzanotte di Perugia e **ogni 60 s** [proposta] in primo piano; al ritorno in primo piano «oggi» si ricalcola.
- Durante un gesto o un salvataggio le ricariche si mettono da parte e si applicano subito dopo.

**Limiti dichiarati.** Realtime valuta le politiche all'ingresso nel canale e al cambio di token [dalla revisione]: un
telefono già iscritto il cui account viene chiuso riceve ancora **date** fino al rinnovo del token, al massimo
`jwt_expiry = 3600` s (`supabase/config.toml:164` [misurato]). Senza il servizio Realtime le partizioni mancano e i
messaggi si perdono in silenzio: la prova di §8.2 verifica la **ricezione**.

### 4.7 Sessioni (D3-11, D3-14, D3-17, D3-20)

- **Chiusura automatica.** Un trigger **AFTER** `security definer` (proprietaria `postgres`, `search_path = ''`) su
  `operator` che agisce solo se `is_active` o `auth_user_id` **cambiano davvero** (`is distinct from`): un cambio di
  `color` o di `sort_order` non chiude nulla. Un solo trigger con una clausola `when` su `OLD` e `NEW` non si può
  dichiarare insieme per INSERT e DELETE [dalla revisione]: servono tre trigger, uno per evento, oppure il confronto
  nel corpo della funzione (dettaglio SQL, da fissare nel piano con le prove di §8.2). Cancella da `auth.sessions` le sessioni dell'account coinvolto quando: `is_active`
  passa da vero a falso; da falso a vero; `auth_user_id` cambia (vecchio **e** nuovo account); si inserisce una riga
  con `auth_user_id` non nullo; si cancella la riga. La cancellazione si propaga ai token di aggiornamento (`on delete
  cascade` [dalla revisione]); i token con `session_id` nullo si cancellano per `user_id` (`varchar`).
- **Chiusura immediata (D3-17).** `app.is_active_operator()` è vera solo se esiste anche la sessione del token:
  `exists (select 1 from auth.sessions s where s.id = nullif(auth.jwt()->>'session_id','')::uuid and s.user_id =
  auth.uid())`. Un token senza `session_id` (`anon`, `service_role`) dà falso, mai errore [dalla revisione]. La
  migrazione **ridefinisce tutte le 15 politiche** con `(select app.is_active_operator())`, e l'audit di catalogo
  esige l'**uguaglianza esatta** dell'espressione resa da `pg_get_expr`. ⚠︎ Corretto alla revisione 12: erano **13**
  quando questa riga è stata scritta, e la frase «estesa alla politica di `realtime.messages`» **è superata** — quella
  politica non è creabile nemmeno a mano, perché il ruolo delle migrazioni non possiede la tabella (misurato il
  23/09/2026), e il piano 3a-1 ha riscritto il Task 8 attorno a una tabella `annuncio` nostra. Al 24/09/2026 in
  `realtime` non c'è nessuna politica. ⚠︎ **L'uguaglianza esatta non è ancora stata consegnata**: il Task 3 ha scritto
  un audit che usa `like` su sottostringa, quindi `(select …) or true` lo passa — cioè il reperto **S4-6 è aperto**,
  e il piano lo assegna al Task 9.
- **La forma consegnata**, che non è quella scritta qui sopra: `nullif(nullif(current_setting('request.jwt.claims',
  true), '')::jsonb ->> 'session_id', '')::uuid`, non `auth.jwt()->>'session_id'`. I **due** `nullif` servono e sono
  presidiati da due prove: quello interno perché una GUC impostata con `set_config(..., true)` non torna a NULL ma a
  `''`, e `''::jsonb` solleva `22P02` **dentro ogni politica**; quello esterno per un claim `session_id` presente e
  vuoto. Resta scoperto un `session_id` valido come JSON ma non come uuid (`"abc"`), che solleva `22P02`: misurato,
  raggiungibile solo da chi può scrivere i claim.
- **Pulsante del 3c** («Chiudi tutte le sessioni»): funzione `(p_operator_id uuid)` che risolve `auth_user_id` da
  `operator`, **rifiuta l'operatrice di chi la chiama** (per chiudere le proprie sessioni c'è `signOut` con ambito
  globale) e ogni bersaglio non operatrice; `security definer`, proprietaria `postgres`, `search_path = ''`, EXECUTE
  solo ad `authenticated`, guardia `(select app.is_active_operator())`. **Non tocca password.** Nasce nel 3a con le
  sue prove.
- **Procedura «telefono perso» (D3-20)**, scritta nel 3c, **eseguibile tutta dalla dashboard di Supabase**, perché
  chi ha il telefono può aver già disattivato le colleghe. **L'ordine conta**: finché la sessione rubata è viva, chi la
  tiene può ridisattivare le colleghe o cambiarsi la password [dalla revisione]. (1) **Cancellare dall'editor SQL le
  sessioni** dell'account perso (`delete from auth.sessions where user_id = …`): da quel momento, con D3-17, il
  telefono perso non legge e non scrive più nulla; (2) **cambiare la password** dell'account; (3) riattivare dal Table
  Editor le operatrici che fossero state disattivate; (4) disattivare la riga dell'operatrice del telefono perso;
  (5) quando ha un telefono nuovo, **cambiare di nuovo la password** e riattivarla; (6) se chi aveva il telefono ha
  cancellato visite, ripristinarle dal backup (§8.7). Se le colleghe sono attive, il passo (1) si fa anche dall'app con
  «Chiudi tutte le sessioni». **Premessa dichiarata:**
  l'accesso con link o codice via email e il recupero della password funzionano solo se Supabase può mandare email
  all'operatrice; oggi l'SMTP predefinito consegna solo ai membri del team [dalla revisione, documentazione Supabase].
  §8.7 verifica che sul progetto ospitato non ci sia un SMTP personalizzato e che le operatrici non siano nel team,
  oppure che quegli accessi siano spenti.
- **Middleware.** Zero righe **confermate** → esce da questo telefono; **errore** (rete, disservizio) → rifiuta la
  richiesta senza chiudere sessioni.
- **Dipendenza da `auth.sessions`**, tabella interna di Supabase: regge perché `postgres` ha SELECT, DELETE e
  `bypassrls` [dalla revisione, catalogo]. Se una versione futura li togliesse, ogni richiesta fallirebbe (guasto
  rumoroso, nessun dato esposto) e fallirebbero anche i trigger di chiusura. Rimedi: prova di catalogo in CI su quei
  privilegi e sulle colonne usate; una **migrazione di rientro** tenuta **fuori** da `supabase/migrations/` (per esempio
  `supabase/rientro/`), che toglie il controllo della sessione **e** neutralizza i trigger di chiusura, dichiarando che
  riapre la finestra di 60 minuti chiusa da D3-17; verifica sul progetto ospitato (§8.7).
- **Limite dichiarato (permessi identici, D10).** Chi ha in mano il telefono di un'operatrice attiva può disattivare le
  colleghe, e D3-14 e D3-17 chiudono subito le loro sessioni: **il salone resta fuori dall'app** finché qualcuno non
  segue la procedura dalla dashboard. La guardia di 0009 impedisce solo che le operatrici attive diventino zero; non
  sa chi tiene in mano l'account rimasto [dalla revisione]. Non può cambiare le password **altrui**; può cambiare
  quella **del proprio** account se `secure_password_change` è spento (in locale lo è, `supabase/config.toml:227`
  [dalla revisione]), e la procedura la riscrive dalla dashboard. Finché la procedura non è eseguita, chi ha il
  telefono **legge anche tutte le clienti** (nome, telefono, compleanno), perché la sessione non scade da sola (D3-11),
  **può cancellare in massa le visite** (la tabella delle cancellate tiene solo `id` e istante: il ripristino si fa dal
  backup) e **può chiudere le sessioni delle colleghe** con la funzione del pulsante. Il limite esisteva già con la
  sola disattivazione; il 3a lo rende più rapido.
- **Impatto sulle prove esistenti** [dalla revisione, lente cieca]: i claim si impostano a mano senza `session_id` in
  un solo punto (`tests/helpers/db.ts:40-42`); ne dipendono **13 file su 14** di `tests/schema/` e **81 prove su 160**;
  circa **57** diventerebbero rosse e circa **24** resterebbero verdi **senza provare più nulla**. L'adattamento è un
  task a sé con tre obblighi: ogni prova negativa ha accanto una prova positiva della stessa sessione; le sessioni si
  creano **dopo** `resetData()`, che riattiva le operatrici; gli accessi si riusano (limite locale di 30,
  `supabase/config.toml:206` [misurato]).

### 4.8 Letture

- Con la sessione dell'utente; fasce da `availability_window` passate a `decodificaFinestra`, che valida.
- La data dall'indirizzo della pagina si valida prima di usarla.
- **Nessun dato personale in un URL**: né nell'indirizzo della pagina né nella querystring di una richiesta a
  PostgREST. Ogni filtro su dati delle clienti passa da una funzione chiamata in POST. Una prova statica cerca: filtri
  su `from('client')`, filtri concatenati dopo `.rpc(...)`, `rpc(..., { get: true })`, `head`, filtri su risorse
  annidate (`client.full_name` in una lettura di `visit`), `.or()`, `.textSearch()` [dalla revisione].

### 4.9 Dati personali fuori dal database

- Nei log solo `code` ed `id`, mai `details` o `hint`; la stessa regola per Server Actions, middleware, Server
  Components e route handler.
- **Limite dichiarato:** se un vincolo come `client_birthday_real` scatta nonostante la validazione, il log di Postgres
  del progetto contiene la riga rifiutata.
- Bozza della scheda solo in memoria (e al massimo 24 ore, §4.4); `Cache-Control: no-store`; a `pageshow` con
  `persisted = true` si riverifica l'identità; all'uscita lo stato si svuota e la pagina si ricarica. **Unica
  eccezione dichiarata:** i codici degli invii pendenti con gli `id` di visita e cliente restano in `localStorage`
  (§4.4), con l'istante del tocco e l'operatrice: sono identificativi casuali e un orario, **pseudonimi e non
  anonimi** (un `id` si ricollega a una persona nel database), **senza nomi e senza numeri di telefono**; si cancellano
  alla risposta definitiva e comunque dopo 24 ore.
- **Intestazioni:** CSP con `script-src 'nonce-…' 'strict-dynamic'` (niente `unsafe-inline` né `unsafe-eval` in
  produzione), `connect-src 'self' https://<progetto>.supabase.co wss://<progetto>.supabase.co`, `frame-ancestors
  'none'`, `base-uri 'none'`, `object-src 'none'`, `form-action 'self'`; `Referrer-Policy: no-referrer`;
  `X-Content-Type-Options: nosniff`; HSTS.
- **Limite dichiarato:** i cookie di sessione di `@supabase/ssr` sono leggibili da JavaScript; una XSS riuscita ruba
  una sessione che non scade da sola. La CSP riduce la probabilità; D3-14 e D3-17 permettono di chiuderla.

---

## 5. Le schermate del 3a

### 5.1 Agenda a colonne (spec §9.1)

- **Intestazione:** logo piccolo e «Agenda» in Cinzel, data; interruttore colonne/lista; selettore dell'operatrice.
- **Striscia dei giorni**; il giorno si cambia **scorrendo di lato**.
- **Colonne:** una per operatrice **attiva o con appuntamenti nel giorno mostrato**. Con più di tre **attive** le
  colonne scorrono in orizzontale e lo scorrimento del giorno cede alla striscia (spec §9.1); con tre attive e una
  disattivata con appuntamenti le colonne sono quattro e vale la stessa regola.
- **Colonna dell'account:** etichetta «tu», non un colore.
- **Scala:** mezz'ora = 42 punti [proposta].
- **Oggi:** linea in inchiostro con alone chiaro all'ora di Perugia (§7).
- **Fuori orario:** righe diagonali, toccabili; segno sul blocco **oggi e nei giorni futuri**; fascia del motivo nei
  giorni di chiusura.
- **Visita:** un blocco solo se gli appuntamenti sono **contigui** (in sequenza con in mezzo solo la pausa del servizio
  precedente, spec §8.1) e della stessa operatrice; altrimenti un blocco per appuntamento con il segno di visita.
- **Blocchi:** altezza minima 21 punti; lo spazio libero coperto da un blocco di 5 o 10 minuti si raggiunge aprendo la
  scheda da uno spazio vicino e correggendo l'orario.
- **Tocco su uno spazio libero:** la scheda si apre al **più tardi fra** il quarto d'ora inferiore e la fine
  dell'appuntamento precedente nella colonna.
- **Trascinamento (D3-15):**
  - pressione lunga [proposta 0,4 s, **da provare su un iPhone vero**]; selezione e menu contestuale spenti;
  - solo in verticale, a passi di 5 minuti; niente cambio di colonna né di giorno; scorrimento del giorno sospeso;
  - blocco di tutta la visita → `move_visit_to`; blocco di un solo appuntamento → `save_visit` con l'insieme completo
    degli appuntamenti di quella visita, che l'agenda conosce perché stanno tutti nello stesso giorno (`0004:26-29`);
  - gli avvisi che la posizione di partenza aveva già si passano come confermati;
  - al rilascio ogni invio ha il suo codice d'invio; il blocco resta nella posizione nuova con lo stato **«Salvo…»**
    ben visibile (spec §10.3), con le stesse garanzie e gli stessi 10 s di D3-9;
  - esiti: `salvata` → ✓ e poi «Spostata alle 16:15 · Annulla»; `da_confermare` o conflitto → si apre la scheda;
    `modificata_altrove` → il blocco torna dov'era, «È diversa da come l'avevi lasciata», il giorno si ricarica;
    `cancellata_altrove` o `non_trovata` → «La visita è stata cancellata», il giorno si ricarica, **nessuna offerta**;
    `57014` o `40P01` esauriti → «Non sono riuscita a spostarla»; la visita si rilegge e il giorno si ricarica, e il
    blocco va alla posizione **letta**, non a quella ricordata;
    **nessuna risposta, oppure risposta «Non so»** (§4.3 passo 8) → il blocco mostra «?» e l'app esegue da sola
    «Controlla» (§4.4) sul codice d'invio; il messaggio segue le righe di §4.4 e la posizione **letta**: riga 1 con la
    visita presente → il blocco va alla posizione letta, «Lo spostamento non è stato salvato»; riga 1 con la visita
    assente → «Lo spostamento non è stato salvato: la visita è stata cancellata», il blocco sparisce; riga 2 →
    «✓ Spostata alle 16:15»; riga 3 → «È diversa da come l'avevi lasciata»; riga 4 → «La visita è stata cancellata»,
    senza offerta; riga 6 → il messaggio di quell'esito; poi il giorno si ricarica. Se anche «Controlla» non risponde,
    il «?» resta **toccabile** e ripete «Controlla»; l'app ritenta da sola al massimo tre volte a distanza crescente
    [proposta]. Solo quel blocco resta in attesa: le ricariche degli altri blocchi e degli altri giorni non si
    sospendono;
  - dopo ogni ✓ l'agenda **adotta le versioni restituite** dalla scrittura (o rilette da «Controlla»): altrimenti il
    trascinamento successivo della stessa visita darebbe «È diversa» contro sé stesso. Una ricarica messa da parte
    durante il gesto **non si applica** se è stata letta prima del ✓: finito il gesto si rilegge il giorno;
  - «Annulla» compare solo dopo un `salvata` diretto o un «✓ Spostata» di «Controlla», si spegne al primo tocco e ha
    un suo codice d'invio; riscrive la posizione di prima con le versioni adottate. I suoi messaggi parlano
    dell'**annullamento** e dicono **dove sta la visita secondo l'ultima lettura**:

    | Esito di «Annulla» | Messaggio |
    |---|---|
    | `salvata`, oppure riga 2 | «✓ Riportata alle 15:00» |
    | riga 1, visita presente | «L'annullamento non è stato salvato: la visita ora è alle HH:MM» (orario **letto**) |
    | riga 1, visita assente | «L'annullamento non è stato salvato: la visita è stata cancellata»; il blocco sparisce |
    | riga 3 (annullamento salvato, poi la visita è cambiata) | «Riportata alle 15:00, ma poi la visita è stata cambiata»; l'orario si nomina **solo se è cambiato** («ora è alle HH:MM»), perché la collega può aver cambiato servizio od operatrice senza toccare l'ora |
    | riga 4 (annullamento salvato, poi la visita è stata cancellata) | «La visita è stata cancellata»: il blocco sparisce, il giorno si ricarica, **nessuna offerta** di ricrearla |
    | `modificata_altrove` diretto, oppure riga 6 con `modificata_altrove` | «Non ho annullato: la visita è stata cambiata»; l'orario si nomina solo se la rilettura ne trova uno |
    | `cancellata_altrove` diretto o riga 6 con `cancellata_altrove` | «Non ho annullato: la visita è stata cancellata» |
    | `non_trovata`, oppure riga 5 (la visita non c'è e non risulta cancellata) | «Non ho annullato: non trovo più questa visita»; il giorno si ricarica. **Non** si dice «è stata cancellata», che la tabella delle cancellate smentirebbe |
    | `57014` o `40P01` esauriti | «Non sono riuscita ad annullare»; la visita si rilegge e il giorno si ricarica; l'orario mostrato è quello **letto** |
    | `da_confermare` o conflitto | si apre la scheda sulla posizione di prima, con la riga ambra o la frase del conflitto. Come nel trascinamento, gli avvisi che la posizione **di prima** aveva già si ripassano come confermati: annullare verso una posizione fuori orario già accettata non riapre la scheda |
    | nessuna risposta, oppure risposta «Non so» (§4.3 passo 8) | «?» e «Controlla» automatico, come per lo spostamento |
  - **Fila delle Server Actions.** Finché un invio è appeso nella fila, gli invii successivi dallo stesso telefono
    aspettano dietro di esso [dalla revisione, documentazione di React]: l'app lo mostra («In attesa del salvataggio
    precedente») invece di far sembrare fermi i pulsanti; i 10 s di D3-9 contano **dal tocco**, non dalla partenza
    effettiva; se la fila resta bloccata, si esce ricaricando la pagina, che segue il percorso della scheda
    abbandonata (§4.4); «Controlla» non è in fila (§4.4). Il piano misura la fila
    anche per gli invii, non solo per «Controlla».

### 5.2 Agenda a lista (spec §9.2)

Appuntamenti del giorno in ordine d'ora: pallino dell'operatrice con bordo in inchiostro, ora, nome, servizio.

### 5.3 Settimana di un'operatrice (spec §9.3)

Sette colonne di circa 48 punti con la sola ora d'inizio; toccando un giorno si apre quel giorno.

### 5.4 Scheda visita (spec §9.4, D3-7)

Pagina intera che si apre sopra l'agenda (L5):

1. **Cliente:** ricerca per nome o telefono; «Nuova cliente» con nome, telefono, compleanno, riga sull'informativa
   (spec §8.2, §11.1) e doppioni per **stesso telefono E.164** o **nome simile**.
2. **Data.**
3. **Servizi.** Durata da `operator_service.duration_cells` se c'è, altrimenti `service.default_duration_cells`
   (`0002_catalogue.sql:25`, `:13`); si ricalcola al cambio di servizio od operatrice **solo se non è stata modificata
   a mano**. «+ Aggiungi servizio» accoda con la pausa (`buffer_after_cells`, `0002:16`); i servizi accodati seguono il
   precedente finché non vengono modificati a mano.
4. **Riga ambra** degli avvisi.
5. **«Salva» / «Salva comunque»**; su una visita esistente **«Elimina visita»** e **«Togli»**, ciascuno con **una
   conferma** (spec §8.7, §10.4). «Togli» sull'unico servizio è «Elimina visita».
6. Dopo un salvataggio incerto, **«Controlla»** (§4.4).

Nessun campo di testo libero (D26).

### 5.5 Le parti «vive» (D3-2)

Accesso (logo sull'acquerello, «AVStyle» in Cinzel Decorative, entrata animata breve), giorno vuoto, pagine
segnaposto. Dentro agenda e scheda solo movimenti funzionali. Logo mai dietro il calendario (spec §9.12).

---

## 6. Identità visiva: le misure

### 6.1 Il carattere (D3-5)

Bozza `carattere-agenda.html`, misurato nel browser il 22/09: cifre tabulari in Archivo allargato, Mona Sans allargato
e Manrope («1111» e «0000» a 40 px: 101,7 / 103,7 / 99,2 px); in una colonna di circa 112 punti i due allargati
troncano «Giulia Bianchi» e «Semiperm. mani», Manrope no [misurato].

### 6.2 I colori (D3-6)

Calcolati il 22/09 e ricalcolati da due revisori con script propri [misurato tre volte]:

| Colore | Sullo sfondo `#FDEDF0` | Testo sopra |
|---|---|---|
| Vera `#C2185B` | 5,19 | bianco 5,87 |
| Annalisa `#FFFFFF` | 1,13 — il contrasto lo porta il **bordo in inchiostro** `#140D18` | inchiostro 19,08 |
| Alessandra `#9B1B1B` | 7,23 | bianco 8,18 |

ΔE CIE76 rosa–rosso: 32 normale, 26 deuteranopia, 32 protanopia, **15 tritanopia** (Machado 2009); il bianco dista
almeno 54 da entrambi. Testo e bordo si calcolano dal **contrasto** del colore, non dal nome; la selezione si segna
anche con bordo, ombra o sollevamento.

---

## 7. Accessibilità, tempo e fuso

- Controlli di almeno 44 punti; blocchi minimo 21 punti.
- Date e ore di **Europe/Rome** qualunque sia il fuso del telefono (spec §5.1). La linea dell'ora si posiziona da ora e
  minuti dell'orologio di Perugia (`Intl`), non dai millisecondi dalla mezzanotte: il 25 ottobre 2026 alle 10:00 ne
  sono trascorse 11 ore, il 28 marzo 2027 alle 10:00 ne sono trascorse 9.

---

## 8. Prove

### 8.1 Logica pura (Vitest)

- Ritentativi: due `40P01` poi successo; quattro → messaggio; altro codice → nessun ritentativo.
- `23505` per nome del vincolo; ricontrollo dell'account su `42501`, `non_trovata`, `cancellata_altrove`; traduzione
  di **ogni** esito nel suo messaggio, compreso `annullato`; decisione di «Controlla» per **ciascuna delle sei
  righe** di §4.4 e per gli esiti di «Elimina» e «Togli», compresa la cliente cancellata; «Salva» dopo la riga 1 usa
  le versioni di partenza, mai quelle rilette; un «Controlla» fallito (`57014`, `55P03`, `40001`, `40P01`, rete) dà di
  nuovo «Non so»; ricontrollo dell'account prima di «Controlla»; scarto delle risposte tardive per numero di
  generazione; **ogni voce della tabella di «Annulla»** (§5.1), compresa la riga 1 con la visita assente e la riga 3
  che dice «Riportata … ma poi cambiata», la voce `57014`/`40P01` con l'orario letto e la voce `non_trovata`;
  trascinamento con risposta «Non so» trattato come «nessuna risposta» e con `57014`/`40P01` che rilegge invece di
  ricordare;
  «la scheda aggiornata» (dopo `modificata_altrove` la scheda prende lo stato corrente e il nuovo «Salva» non toglie il
  servizio della collega); codici pendenti in `localStorage` scritti al tocco, cancellati alla risposta definitiva e
  passati da «Controlla» alla riapertura; «Esci» che controlla prima di chiudere la sessione.
- Frase di conflitto: due appuntamenti → entrambi; spostamento dentro la propria durata → non nomina sé stesso;
  appuntamento tolto e sostituito allo stesso orario → nessun conflitto con sé stesso.
- Validazione: cella 287 sì e 288 no come inizio; fine 288 sì e 289 no; 31 febbraio; 09:70; guardie di interezza di
  `blocco()`; ancore delle regex di `confineDaOra` e `pezziData`; data dall'indirizzo; `decodificaFinestra` fuori
  dominio.
- Telefono: `347 1234567` e `+39 347 1234567` → lo stesso E.164.
- Aggancio del tocco; durata e servizi accodati; linea dell'ora nei due giorni del cambio d'ora.
- Ogni prova con la sua **sonda di mutazione**, dati non degeneri.

### 8.2 Database (Vitest su Supabase locale, con sessioni vere)

- `save_visit`: tutto o niente; creazione su `id` esistente → `esiste_gia` senza scrivere; creazione su `id` fra le
  cancellate → `cancellata_altrove`; cliente nuova e visita insieme o nessuna; elenco vuoto rifiutato; `id` di
  un'altra visita rifiutato; togli-l'unico-più-aggiungi riesce; un salvataggio che cambia un solo appuntamento non
  cambia la versione degli altri.
- **Versioni e insieme:** pedicure spostata da sola, poi salvataggio con la versione vecchia → `modificata_altrove`;
  **pedicure aggiunta da una collega, poi salvataggio della scheda vecchia → `modificata_altrove` e la pedicure resta**;
  lo stesso per `move_visit_to` e `delete_visit`; cambio di data riuscito; `move_visit_to` con insieme di destinazione
  diverso dall'atteso → rifiutato.
- `delete_visit`: riuscita → `cancellata`; ripetuta, o su visita cancellata da un'altra → `gia_cancellata`; su visita
  mai esistita → `non_trovata`.
- **Visite cancellate:** una visita tolta da `zz_delete_orphan_visit` e una tolta per cascata dalla cliente finiscono
  nella tabella; una seconda cancellazione dello stesso `id` non dà errore; `authenticated` non può scriverci.
- **«Controlla» (D3-21)**, con le tre prove distinte indicate dalla misura del sesto giro:
  (a) «Controlla» **prima** dell'invio → l'invio restituisce `annullato` e il database è invariato;
  (b) invio **in volo** che ha già registrato il codice, «Controlla» lanciato in parallelo **senza aspettarlo** → al
  commit dell'invio «Controlla» vede `salvata` e la visita nuova; al rollback dell'invio vede `annullato`;
  (c) «Controlla» con un tempo limite basso mentre l'invio è in volo → errore, nessun codice bruciato, e l'invio poi
  salva.
  In più: le sei righe e gli esiti di «Elimina» e «Togli»; **aggiunta di un servizio arrivata, poi tolta da una collega
  → «Controlla» non dice «Non risulta salvata»**; **riga 1 in modifica mentre una collega ha aggiunto un servizio →
  il nuovo «Salva» dà `modificata_altrove` e il servizio della collega resta**; «Controlla» da un account chiuso non
  risponde «non risulta»; regola 8 sia con soli inserimenti sia con sole cancellazioni; `23503` quando la cliente
  viene cancellata fra due invii; dopo un conflitto sulla chiave del codice nessuna funzione scrive.
- **Regola 11 (conteggio delle righe)** per **ciascuna** delle tre funzioni: un account chiuso fra il blocco e la
  scrittura riceve un errore, non `salvata` né `cancellata`, e la visita resta com'era; anche nel ramo in cui la riga
  `visit` non viene aggiornata affatto e a contare sono solo gli appuntamenti; una cancellazione legittima con la sola
  DELETE su `visit` **non** fallisce.
- **Tabella degli invii:** `authenticated` non può inserire, aggiornare, cancellare o «sbruciare» un codice via
  PostgREST; la funzione di servizio è nell'elenco `definer` di `PERMESSI-FUNZIONI`; nessuna funzione di scrittura né
  «Controlla» cambia il livello di isolamento (`proconfig` senza `default_transaction_isolation`); «Controlla» è
  `volatile`.
- **`40P01`:** la prova tiene aperta una transazione su una propria connessione con un `deadlock_timeout` più alto, così
  che ad abortire sia **il percorso di scrittura**; afferma **almeno due tentativi** e il salvataggio.
- **`PERMESSI-FUNZIONI`**, su `public` e `app` (le funzioni di `pg_trgm` stanno in `extensions`): insieme delle funzioni
  eseguibili da `anon` **uguale** a un elenco nominativo per firma (oggi sette: sei in `app` e
  `public.immutable_unaccent` [dalla revisione]); insieme delle funzioni `security definer` non di trigger eseguibili
  da `authenticated` uguale a un secondo elenco (oggi comprende `public.list_auth_accounts()`), ciascuna con una prova
  dell'**effetto** da un account chiuso; funzioni di trigger `definer` nuove con prove proprie; politiche su
  `realtime.messages` **esattamente** la SELECT di §4.6; pubblicazione `supabase_realtime` vuota; espressione di ogni
  politica uguale alla forma `(select app.is_active_operator())`.
- **`MIGRAZIONE-SALTATA`**; **`OUTSIDER-WRITE`** (account non operatrice e operatrice disattivata, con le funzioni e con
  i verbi diretti di PostgREST).
- **Sessioni**, sull'**effetto**: dopo ciascuno dei cinque casi del trigger e dopo la funzione gemella, il rinnovo del
  token fallisce e una lettura di `client` con il token ancora in corso dà zero righe; un cambio di `color` o
  `sort_order` non chiude nulla; la gemella rifiuta l'operatrice di chi chiama, un bersaglio non operatrice e un
  chiamante chiuso; **nessuna password cambia mai**.
- **Dipendenza da `auth.sessions`:** prova di catalogo su SELECT, DELETE, `bypassrls` di `postgres` e sulle colonne
  usate.
- **Canale:** scrivendo come operatrice con sessione vera, un'operatrice attiva **riceve** i giorni; un account non
  operatrice, uno chiuso e `anon` iscritto in pubblico allo stesso nome non ricevono; un'operatrice attiva non
  trasmette dal telefono; il messaggio contiene solo date.
- Somiglianza: «maria rosi» trova «Maria Rossi».

### 8.3 Da capo a fondo (Playwright)

Telefono simulato a **375 e 430 punti**.

- Da spec §13.4: **1**, **3**, **4** (con la conferma), **5**, **7** (con il motivo).
- Due telefoni: Annalisa prenota → il blocco compare da Vera entro 3 s [proposta]; Annalisa sposta a domani → sparisce
  da oggi; Annalisa aggiunge un servizio mentre Vera ha la scheda aperta → «modificata altrove».
- Operatrice disattivata scrivendo sul database da proprietario → uscita forzata.
- **Rete bloccata a metà salvataggio → «Controlla»**: con il salvataggio arrivato → «✓ Risulta salvata», una sola
  visita; con il salvataggio arrivato e poi cancellato da Annalisa → «È stata cancellata dopo il salvataggio»; con il
  salvataggio **trattenuto nel browser prima che la richiesta parta** e rilasciato dopo «Controlla» → «Non risulta
  salvata», e il salvataggio tardivo non compare in agenda; «Controlla» funziona anche mentre un invio è ancora
  appeso (passa fuori dalla fila delle Server Actions).
- Avviso nuovo al salvataggio → la scheda si ferma (D3-19).
- Trascinamento: «Annulla»; rilascio su un conflitto → scheda; rilascio senza risposta → «?», «Controlla» automatico e messaggio definitivo.
- Rete assente → striscione; app ripresa il giorno dopo → «oggi» nuovo.
- Accessibilità automatica (axe) su ogni schermata.
- Fuso **America/New_York**, orologio al **25 ottobre 2026** e al **28 marzo 2027** alle 10:00.

### 8.4 Che cosa le prove non coprono

Il trascinamento su un iPhone vero (verifica a mano, dichiarata nel piano); il comportamento sul progetto ospitato
(§8.7).

### 8.5 Dati di prova

- Catalogo, settimane tipo, clienti: nelle **fixture delle prove**, non in `seed.sql`; almeno un servizio da 50 minuti,
  pause diverse da zero, un servizio che un'operatrice non fa, una durata per operatrice diversa dal catalogo, turni
  spezzati.
- Password degli account locali **solo** nelle fixture, **mai** in `seed.sql`: `[db.seed]` è attivo
  (`supabase/config.toml:65-67`) e `db reset --linked` lo applicherebbe al progetto ospitato [dalla revisione; commento
  in `seed.sql:18`].
- **I quattro utenti `@example.test` di `seed.sql` RESTANO — decisione presa il 24 settembre 2026, all'esecuzione del
  Task 2 del piano 3a-1.** La frase precedente («il piano decide se toglierli») è chiusa. Le ragioni, misurate:
  - L'imbracatura delle prove **dipende** da loro: `tests/helpers/sessioni.ts` li nomina in `EMAIL_DI` e li seleziona
    con `where email like '%@example.test'`, e ogni passata della suite fa **24 accessi veri** al GoTrue locale. Senza
    quei quattro account non accede nessuna prova.
  - Il quarto, `outsider@example.test`, è l'unico modo di avere **un account autenticato che non è operatrice**, cioè la
    seconda direzione di §13.3. Crearlo a tempo di prova costerebbe una registrazione per passata.
  - La regola qui sopra **resta rispettata**: `seed.sql` non contiene nessuna password, solo
    `encrypted_password = ''`. **Misurato il 24/09/2026:** con quel valore, e con le colonne testuali a posto perché il
    500 non mascheri il risultato, **ogni** password dà `400 invalid_credentials` — la stringa vuota, quella del repo e
    una qualsiasi. I quattro account sono quindi **inerti** finché le fixture non danno loro una password, e quella
    password (`prova-3a-1`) sta solo in `tests/helpers/sessioni.ts`.
  - **Rischio residuo, dichiarato:** un `db reset --linked` creerebbe i quattro account **sul progetto ospitato**. Vi
    arriverebbero inerti, non utilizzabili per accedere, e gli `update` su `operator` di `seed.sql` sono già guardati
    (`seed.sql:16-23`). Ciò che **non** può accadere è che ricevano la password del repo: dal Task 2
    `preparaAccountLocali()` e `resetData()` chiamano `esigiDatabaseLocale()`, che rifiuta un `DATABASE_URL` che non sia
    `127.0.0.1`/`localhost` — e il CLI esegue `seed.sql` dalla sua parte, non passando dalle fixture. Se qualcuno
    eseguisse comunque un `db reset --linked`, il rimedio è cancellare i quattro utenti dalla dashboard. §8.7 **non**
    elencava questo controllo: aggiunto lo stesso giorno, insieme a questa decisione.
- Per usare l'app a mano in locale, uno script separato che carica gli stessi dati, solo su richiesta.

### 8.6 Contorno

- `NODE-PIN`: `.nvmrc` ed `engines` su **Node 22**, come `.github/workflows/ci.yml:11` [misurato].
- CI: un passo Playwright dopo quelli attuali; la CI avvia già Supabase con `npx supabase start`, Realtime compreso.
- Fine lavoro: gate con output reale, `/security-review`, test-audit con tabella mutazione → prova o `NOT CAUGHT`.

### 8.7 Verifiche prima del rilascio (assegnate al 3c)

Sul progetto ospitato: registrazione spenta (in locale `[auth] enable_signup = false` alla riga 175 ma `[auth.email]
enable_signup = true` alla 220 [misurato]); «Allow public access» di Realtime spento; `postgres` può leggere e
cancellare da `auth.sessions` e ha `bypassrls`; la chiusura immediata funziona con le chiavi di firma in uso; **nessun
SMTP personalizzato e operatrici fuori dal team**, oppure accesso via email e recupero della password spenti (D3-20);
`secure_password_change` acceso (in locale è spento, `supabase/config.toml:227` [dalla revisione]); prova a mano della
procedura «telefono perso» dalla dashboard nell'ordine di §4.7, compreso il caso in cui le colleghe sono state
disattivate; **esistenza e prova di un ripristino da backup** (o PITR) sul piano Supabase in uso, perché le visite
cancellate in massa da un telefono rubato si recuperano solo da lì (spec §14 domanda 5); **nessun utente
`@example.test` in `auth.users`** — i quattro di `seed.sql` restano di proposito (§8.5) e vi arriverebbero solo per un
`db reset --linked`, inerti ma da cancellare.

---

## 9. Letture dichiarate della spec

- **L1 — spec §8.4 «asks for confirmation».** La conferma è «Salva comunque» nella scheda.
- **L2 — spec §4.5 «overridable per device».** Non si costruisce; resta la colonna «tu».
- **L3 — spec §9.12 «a neutral, wide sans».** Manrope non è largo (§6.1).
- **L4 — spec §9.12 «drawn from this family».** Il bianco con bordo non è della famiglia rosa.
- **L5 — spec §9.4 «Opens over the calendar».** Pagina intera che si apre sopra l'agenda.
- **L6 — spec §10.3.** «Saved state» = D3-9 e D3-21; segnale periodico con striscione.
- **L7 — spec §8.6 «By dragging».** Solo verticale.
- **L8 — spec §4.6** elenca `move_visit`; il 3a la revoca o la elimina a favore di `move_visit_to`.
- **L9 — spec §9.12 «3:1 against the background».** Annalisa è a 1,13; il 3:1 lo porta il bordo.
- **L10 — spec §8.6 «a single service … moved alone».** In un blocco unico, il singolo servizio si sposta dalla scheda.
- **L11 — spec §10.2 «Through the transactional functions this arrives as `P0002`».** Le funzioni nuove restituiscono
  gli esiti come valori (§4.1); `P0002` resta solo nella vecchia `move_visit`, che il 3a revoca.
- **L12 — spec §10.2 «offer to re-create it from the sheet's contents».** L'offerta c'è nella scheda (§4.4 riga 4),
  solo se la cliente esiste ancora; non c'è nel trascinamento, dove l'operatrice voleva spostare, non ricreare.

---

## 10. Aperto, da decidere o misurare nel piano

- Ritentativi su `40P01` dentro 8 s per chiamata e 10 s di D3-9.
- Soglia di 10 s di D3-9, su rete lenta.
- Le Server Actions partono in fila una alla volta [dalla revisione, documentazione di React]: è già deciso che
  «Controlla» e il segnale di connessione passano da una rotta del server (§4.4); il piano misura che un invio appeso
  non blocchi «Controlla».
- Revoca o eliminazione di `move_visit` e adeguamento delle 9 prove.
- Revoca o elenco delle sette funzioni eseguibili da `anon`.
- Codice sollevato da ogni funzione in ogni caso d'errore.
- Adattamento dell'imbracatura alle sessioni vere.
- Durate: visite cancellate 30 giorni, vita della scheda incerta 24 ore, ricarica di ripiego 60 s.
- Soglie: somiglianza 0,4, pressione lunga 0,4 s.
- Se togliere da `seed.sql` i quattro utenti di prova.

---

## 11. Dove si ferma la revisione di questo documento

La storia dei giri, detta com'è: al quarto giro la rev. 4 dichiarava esauriti i reperti sulle decisioni, ed era falso;
al quinto giro due revisori indipendenti hanno trovato che «Controlla» poteva dire «non risulta salvata» a un invio
ancora in viaggio, e un terzo reperto ha mostrato che il salone poteva restare fuori dall'app. Ogni giro ha trovato
la maggior parte dei suoi difetti **nelle correzioni del giro prima**.

**Il giro mirato finale (decisione dell'utente del 22/09).** Le scelte grandi — schermate, colori, sessioni, canale —
non prendono colpi da tre giri. Tutti i reperti del quarto, quinto e sesto giro stanno in **una sola zona**: il
salvataggio rimasto senza risposta mentre una collega scrive. Il sesto giro ha mostrato che in quella zona **una misura
chiude più di due giri di lettura**. L'utente ha quindi scelto: applicare le correzioni del sesto giro, fare **un ultimo
giro con un solo revisore** che scrive la tabella completa dei casi «salvataggio incerto + collega» e la verifica caso
per caso, e, **se non trova bloccanti**, fermare la revisione del documento. Il resto di quella zona passa al **primo
task del piano**, dove si chiude con le prove eseguite di §8.2.

**Verifica dei 20 casi** (appendice H): 15 veri, 4 falsi non bloccanti, 1 ancora scoperto (iPhone); **nessun
bloccante**. **Controllo dei 5 casi** (appendice I): di nuovo **nessun bloccante**, i 5 casi veri, le dieci voci della
tabella di «Annulla» tutte vere e senza sovrapposizioni; i reperti rimasti sono cinque maggiori e dodici minori, tutti
chiusi dalla rev. 10 con frasi già usate altrove nel documento.

**Qui la revisione del documento si ferma**, secondo il criterio concordato: due giri di fila senza bloccanti, le
decisioni ferme da quattro giri, e i reperti residui che si chiudono solo con una migrazione eseguita. Le correzioni
della rev. 10 **non sono state riviste**: sono la ripetizione di regole già verificate (orario dalla lettura,
conteggio delle righe, scadenza dei codici locali), e il primo task del piano le rimette alla prova con le prove
di §8.2.

**Esito del giro finale** (appendice G): 105 casi, 85 veri, 2 falsi, 18 senza messaggio; un bloccante (R7-1), che si
chiude con una regola sola. Per decisione dell'utente la rev. 8 corregge tutti i 20 casi non veri e **un revisore li
ricontrolla uno per uno**; se tornano tutti veri, la revisione del documento si ferma qui.

**Decisioni ancora aperte**, elencate invece che taciute: revoca o elenco delle sette funzioni eseguibili da `anon`
(§10, è una scelta, non una misura); i numeri marcati [proposta].

Quando un giro non troverà più reperti sulle **decisioni**, ciò che resta — ordine delle istruzioni, forma dei
trigger, permessi delle tabelle nuove, comportamento dell'attesa sulla chiave degli invii — si chiude solo con una
migrazione eseguita contro le prove di §8.2. Per quelle parti, e **solo per la sintassi**, dove una prova che passa e
questo documento divergono vince la prova, e il documento si corregge con un paragrafo datato; l'**intento** resta
normativo, e una prova che contraddice l'intento è una prova sbagliata. Il **primo passo del piano 3a** è scrivere le
migrazioni, adattare l'imbracatura alle sessioni vere ed eseguire contro di esse le prove di §8.2, prima di
qualunque codice dell'app.

---

**Nota sulle appendici.** I rimandi di sezione e i meccanismi nominati nelle appendici A–C si riferiscono alla revisione in vigore quando il giro è stato fatto. Il codice di richiesta, il registro delle richieste e la password automatica citati lì sono stati tolti dalla rev. 5 (appendice D).

## Appendice A — Registro della revisione 1

Cinque revisori su Opus: scrittura e database, completezza, casi limite, sicurezza, lente cieca (Parte 1 scritta
alle 14:26:35, poi apertura del documento). Nessuno ha modificato file o scritto sul database.

**Bloccanti (reggono):** B1 manca una funzione per **modificare** una visita (tre revisori; verificato su catalogo e
0010) → `save_visit`. B2 la versione della visita non vede i servizi (due; verificato `0004:50-53`) → versioni per
riga, poi insieme (B5). B3 disattivare non chiude le sessioni (due; verificato) → D3-14. B4 falso che `seed.sql`
contenga servizi e disponibilità (due; verificato) → §8.5.

**Maggiori (reggono):** M-DIRETTA (quattro), M-RIPRESA, M-GIÀ-SALVATA, M-23505, M-MOVE-VECCHIA, M-IDENTITÀ, M-LOG,
M-PERMESSI, M-40P01, M-TOCCO, M-TRASCINA, M-RICARICA, M-SCHEDA, M-TELEFONO (verificato spec riga 511), M-SIMILE,
M-COLORI (verificato `0001:55-56`), M-COLONNE.

**Minori:** vedi la rev. 2; tutti ripresi nel testo.

**Scartati o ridimensionati:** collisione di `id` (scartato come rischio; resta `crypto.randomUUID()`); coda delle
Server Actions (da misurare); limite di 8 s (poi misurato al secondo giro); data del cambio d'ora 2027 (un revisore
aveva scritto il 29 marzo; è il **28**, verificato con `cal`); disattivazione valutata solo all'iscrizione per
`postgres_changes` (smentito dalla documentazione per INSERT e UPDATE).

---

## Appendice B — Registro della revisione 2

Quattro revisori su Opus: scrittura e database, coerenza e chiusura dei reperti, sicurezza, lente cieca sulla
fattibilità (Parte 1 alle 14:38:55–14:39:46, apertura alle 14:39:48). Nessuno ha modificato file o scritto sul
database; tutti hanno dichiarato e cancellato i file temporanei.

### B.1 Bloccanti — reggono

| Id | Reperto | Trovato da | Verifica | Dove si chiude |
|---|---|---|---|---|
| B5 | `save_visit` a «stato intero» toglie in silenzio un appuntamento aggiunto da una collega | scrittura, coerenza (due indipendenti) | dedotto da `0004:50-53` e dal testo della rev. 2 | §4.1 regola 6, D3-15 |
| B6 | Le sessioni sopravvivono a scollegamento, ricollegamento, cancellazione dell'operatrice e alle sessioni nate durante la disattivazione | sicurezza, scrittura (due indipendenti) | privilegi misurati dai revisori | D3-14, §4.7 |
| B7 | La finestra di 60 minuti del token di accesso permette di leggere **e scrivere** dopo la chiusura, ed è evitabile | sicurezza, scrittura | verificato: `0001:33-37` non guarda la sessione | D3-17, §4.7 |

### B.2 Maggiori — reggono

| Id | Reperto | Trovato da | Dove si chiude |
|---|---|---|---|
| M-SEND | `realtime.send` è invoker e inghiotte gli errori: senza `definer` il messaggio non parte mai | cieca, scrittura, sicurezza (tre) | §4.6 |
| M-POLITICA-CANALE | Politica, nome del canale e canali pubblici non specificati; una politica INSERT aprirebbe le trasmissioni dai telefoni | sicurezza | §4.6, §8.2, §8.7 |
| M-PARTIZIONI | Senza Realtime attivo le partizioni mancano e i messaggi si perdono in silenzio | cieca, scrittura | §4.6 (limite), §8.2 (ricezione) |
| M-CREA-O-MODIFICA | «Se la visita esiste già non scrive» impediva ogni modifica | coerenza, scrittura | §4.1 regole 1, 3, 5 |
| M-RIPROVA-MODIFICA | La ripetizione di una modifica o di una cancellazione riuscita dava «modificata altrove» o «vuoi ricrearla?» | scrittura, coerenza | §4.1 «già fatto?», `gia_cancellata` |
| M-ORDINE-CASCATA | Il cambio di data cambia le versioni degli appuntamenti prima del confronto | scrittura | §4.1 regole 2, 6, 8 |
| M-ORFANA | Togliere prima di inserire fa cancellare la visita a metà funzione | scrittura, coerenza | §4.1 regola 8 |
| M-CODICI | Codici ed esiti delle funzioni nuove non fissati; `updated_at` da passare come testo | coerenza, scrittura | §4.1, tabella degli esiti |
| M-DESTINAZIONE | «Destinazione assoluta» non definita e non idempotente da sola | scrittura, coerenza | `move_visit_to` |
| M-TRASCINA-GARANZIE | Il trascinamento non aveva «Salvo…», 10 s, esito del conflitto; «Annulla» senza versioni | scrittura | §5.1 |
| M-AVVISO-NUOVO | Un avviso nuovo al salvataggio veniva scritto senza conferma | scrittura, coerenza | D3-19 (decisione dell'utente) |
| M-RICOMPARE | La visita cancellata ricompariva: decisione presa dal documento al posto dell'utente | coerenza | D3-18 (decisione dell'utente) |
| M-60-MINUTI-DECISIONE | La finestra delegata al piano era una decisione dell'utente | coerenza | D3-17 (decisione dell'utente) |
| M-CANCELLA-CONFERMA | Mancava la conferma di spec §8.7 e §10.4 | coerenza | §5.4, §8.3 (verificato nella spec) |
| M-OBBLIGHI-SENZA-PROVA | `decodificaFinestra`, `GUARDIE-TEMPO`, date in lettura dichiarati chiusi senza prova | coerenza | §3.2, §4.8, §8.1 |
| M-40P01-LATO | La prova poteva vedere il `40P01` sulla propria connessione | coerenza | §8.2 |
| M-GEMELLA | Funzione del pulsante non specificata: chi chiude le sessioni di chi | sicurezza, coerenza | §4.7 |
| M-GETCLAIMS | `getClaims()` non vede la revoca con chiavi asimmetriche | sicurezza, scrittura | §4.2 |
| M-CSP | «Una CSP restrittiva» non bastava; cookie leggibili da JavaScript | sicurezza | §4.9 |
| M-URL | Filtri PostgREST con dati personali in GET | sicurezza | §4.8 |
| M-LIST-AUTH | `list_auth_accounts()` assente dagli elenchi della prova sui permessi | cieca | §8.2 |

### B.3 Minori — reggono

Invariante «nessuna visita vuota» falsa all'inserimento; esclusione degli `id` tolti dal controllo preventivo;
messaggio per riga invece che per istruzione; possibile `40P01` fra disattivazione e rinnovo (3c ritenta);
permessi sul progetto ospitato; `session_id` nullo nei token; cliente senza versione (modifica al 3b); ordine
alfabetico dei trigger; `statement_timeout` e `deadlock_timeout` ora misurati; involucro unico delle Server Actions;
middleware che chiudeva le sessioni su un errore di rete; «Esci» globale per difetto; versione di Next e
CVE-2025-29927; `pageshow` e cache avanti-indietro; prove sull'effetto e non sulle righe; «maggiore di zero» →
uguaglianza di insiemi; «schemi applicativi» non definiti; password in `seed.sql`; annuncio per clienti,
disponibilità e chiusure senza padrone; striscione senza prova; letture mancanti (L8–L10); parole vaghe (paese del
telefono, soglia di somiglianza, «pochi secondi», «contigui», §N ambigui); modello del nome della migrazione;
colonne oltre tre con una disattivata; spazio sotto i blocchi piccoli «toccabile dalla lista», che non lo è;
verifica della registrazione senza padrone; `SEGUENTE-VICINO` e `PRECEDENZA-MOTIVI` solo «valutati».

### B.4 Scartati

Nessuno in questo giro. I fatti non verificabili dai revisori (coda delle Server Actions, comportamento sul progetto
ospitato, consegna ai canali pubblici) sono trattati come da misurare, non come fatti.

---

## Appendice C — Registro della revisione 3

Tre revisori su Opus: contratto delle funzioni, sicurezza delle parti nuove, lente cieca sull'impatto misurato
(Parte 1 dalle 14:50:48 alle 14:53:43, poi apertura). Nessuno ha modificato file o scritto sul database; tutti hanno
dichiarato e cancellato i file temporanei. **Nessun reperto bloccante.**

### C.1 Maggiori — reggono

| Id | Reperto | Trovato da | Dove si chiude |
|---|---|---|---|
| M-COINCIDENZA | «Già fatto?» deciso dal confronto degli stati scambia la scrittura di una collega per la propria: ✓ e «Annulla» falsi, e «Annulla» sovrascrive la collega | contratto | §4.1 regola 3, codice di richiesta; §4.4; §5.1 |
| M-RIPROVA-AVVISO | Un «Riprova» di un salvataggio riuscito si fermava su un avviso nato dopo | contratto | §4.3 passo 3 |
| M-CICLO | Richiamata dopo `23505` senza limite; ricreazione di D3-18 non definita | contratto | §4.1 «Ricreare», §4.3 passo 7 |
| M-ESITI-TRASCINA | `modificata_altrove` e `cancellata_altrove` nel trascinamento e in «Annulla» non definiti | contratto | §5.1 |
| M-NON-TROVATA | Ramo «assente e non cancellata» non definito; nessun ricontrollo dell'account sugli esiti-valore | contratto | §4.1 `delete_visit`, §4.3 passo 8 |
| M-PASSWORD | Chiudere le sessioni non cambia la password salvata nel telefono perso | sicurezza | D3-20, §4.7 (decisione dell'utente) |
| M-AUTH-INTERNA | `auth.sessions`, tabella interna di Supabase, entra in ogni richiesta | sicurezza | §4.7, §8.2, §8.7 |
| M-PROVE-VUOTE | Con D3-17 circa 24 prove negative resterebbero verdi senza provare nulla | cieca | §4.7 |
| M-SESSIONI-PROVE | `resetData()` riattiva le operatrici e chiuderebbe le sessioni delle prove; limite di 30 accessi | cieca | §4.7 |

### C.2 Minori — reggono

Scadenza a 7 giorni delle cancellate che fa ricomparire una visita con un «Riprova» tardivo (tolta: nessuna
scadenza); seconda cancellazione dello stesso `id`; permessi, schema e alimentazione della tabella delle cancellate;
lettura delle cancellate e degli appuntamenti in un'istruzione successiva al blocco; `da_confermare` attribuito alle
funzioni (ora del server, con la finestra dichiarata); «coincide» non definito (superato dal codice di richiesta);
avvisi già confermati nel trascinamento; righe invariate che alzavano le versioni; caso INSERT su `operator`;
`(select …)` sulle 15 politiche esistenti (13 quando la riga fu scritta); forme della querystring non coperte dalla prova statica; log di Postgres e
codice fuori dalle Server Actions; SELECT su `auth.sessions` fra le verifiche prima del rilascio; ordine alfabetico
dei trigger che non vale per un trigger per istruzione; commento di `guard_operator_lockout` che dopo D3-17 non sarà
più esatto (innocuo).

### C.3 Scartati

Nessuno. La soglia dei 30 accessi (`supabase/config.toml:206`) è attribuita al revisore; l'intervallo a cui si
riferisce non è stato verificato.

---

## Appendice D — Registro della revisione 4

Due revisori su Opus sulle sole correzioni della rev. 4: correzioni e coerenza; sicurezza di password e sessioni.
Nessuno ha modificato file o scritto sul database.

### D.1 Bloccante — regge

| Id | Reperto | Trovato da | Esito |
|---|---|---|---|
| S4-1 | La password automatica di D3-20 (rev. 4) permetteva a chi ruba un telefono con sessione aperta di rendere casuali le password di tutte e tre: il salone rientrava solo dalla dashboard. La guardia di 0009 conta le operatrici attive, non chi conosce la password | sicurezza | **D3-20 sostituita** dalla procedura scritta, per decisione dell'utente; l'app non tocca mai le password |

### D.2 Maggiori — reggono

| Id | Reperto | Trovato da | Esito |
|---|---|---|---|
| R4C-1 | «Riprova» dava «✓ Salvata» su una visita salvata e poi cancellata da una collega, contro D3-18 | coerenza | **Meccanismo sostituito** da «Controlla» (D3-21), che rilegge e mostra: §4.4 |
| R4C-2 | «Salva» dopo un tempo scaduto (codice nuovo) finiva in un messaggio generico o in un falso «cambiata altrove» | coerenza | §4.4: dopo un esito incerto l'unico pulsante è «Controlla» |
| R4C-3 | «Elimina visita» su una visita già cancellata da altri chiedeva «vuoi crearla di nuovo?» | coerenza | §4.1 `delete_visit` → `gia_cancellata`, senza offerta |
| R4C-4 | Ricreare dopo l'oblio della cliente la faceva tornare dalla memoria della scheda | coerenza | §4.4: nessuna offerta se la cliente è stata cancellata |
| R4C-5 | La funzione gemella permetteva il blocco di sé stessa; recupero della password dalla posta del telefono perso | coerenza, sicurezza | §4.7: la gemella rifiuta l'operatrice di chi chiama; premessa sull'email in D3-20 e §8.7 |
| S4-2 | Accesso via link o codice email da un telefono con la posta aperta | sicurezza | premessa dichiarata, §4.7 e §8.7 |
| S4-3 | Scollegamento e ricollegamento chiudevano le sessioni ma non cambiavano la password | sicurezza | superato: nessuna password automatica; procedura scritta |
| S4-4 | Migrazione di rientro dentro `migrations/` si sarebbe applicata da sola; rientro incompleto | sicurezza | §4.7: fuori da `migrations/`, neutralizza anche i trigger, dichiara la riapertura. ⚠︎ **RIAPERTO alla revisione 12:** il rientro consegnato dal Task 3 sta fuori da `migrations/` e dichiara la riapertura, ma la neutralizzazione dei **tre** trigger è ancora **commentata** — non poteva essere altrimenti, perché il Task 4 non li ha creati. Si chiude scommentando quelle righe al Task 4 |
| R4C-12 | §11 della rev. 4 dichiarava esauriti i reperti sulle decisioni: falso | coerenza | §11 riscritta |

### D.3 Minori — reggono

`update of` senza `when` scatterebbe a ogni cambio di `color` o `sort_order` (S4-5 → clausola `when` e prove);
audit che accetta `(select …) or true` e non guarda `realtime` (S4-6 → uguaglianza esatta); cancellate scrivibili da
`authenticated` e registro con lo stato corrente (S4-7 → solo SELECT; registro tolto); generazione della password in
SQL (S4-8 → superato); dato delle cancellate pseudonimo, non anonimo (R4C-6 → dichiarato, scadenza 30 giorni più
lunga della vita di una scheda); esiti del registro incompleti e impronta del contenuto (R4C-7, R4C-8, R4C-9 →
superati dalla rimozione del registro); «passi» contro «regole» e insieme di destinazione di `move_visit_to` (R4C-10 →
corretto); doppio tocco su «Annulla» (R4C-11 → si spegne al primo tocco).

### D.4 Scartati

Nessuno.

---

## Appendice E — Registro della revisione 5

Due revisori su Opus sulla rev. 5: il modello di scrittura con «Controlla»; coerenza della riscrittura e sicurezza
residua. Nessuno ha scritto sul database. Un revisore ha creato per errore un file temporaneo fuori dalla cartella
concessa (`/private/tmp/x`, copia di parte del documento), l'ha cancellato e l'ha dichiarato.

### E.1 Bloccanti — reggono

| Id | Reperto | Trovato da | Dove si chiude |
|---|---|---|---|
| R5M-1 / R5-2 | «Controlla» poteva dire «Non risulta salvata» a un invio ancora in viaggio, che poi scriveva: orario sbagliato detto alla cliente, visita doppia, cancellazione che arriva dopo «la teniamo» | modello, coerenza (due indipendenti) | §4.4: tabella degli invii, «Controlla» brucia l'invio che non trova; regola 0 di §4.1 |
| R5M-2 | Aggiunta arrivata e poi tolta da una collega riportava le versioni identiche: «Non risulta salvata» falso e il servizio disdetto tornava | modello | §4.1 regola 8: la versione della visita cambia quando cambia l'insieme; §4.4 non decide più dalle versioni |
| R5-1 | Chi ha il telefono di un'operatrice può disattivare le colleghe e chiudere fuori il salone; la procedura della rev. 5 chiedeva proprio a una collega di agire | coerenza (per analogia con S4-1) | §4.7: limite riscritto; procedura eseguibile tutta dalla dashboard; prova a mano in §8.7 |

### E.2 Maggiori — reggono

| Id | Reperto | Dove si chiude |
|---|---|---|
| R5M-3 / R5-4 | «Controlla» da un account chiuso dava un falso ✓ o un falso «non risulta» | §4.4: ricontrollo dell'account prima |
| R5M-4 | Righe di «Controlla» non esaustive, non ordinate, «uguale» non definito; messaggio che attribuiva a una collega la propria scrittura | §4.4: righe ordinate, uguaglianza definita, messaggio neutro |
| R5M-5 | Risposta tardiva dell'invio abbandonato senza regola | §4.4: numero di generazione |
| R5-3 | Le prove contavano quattro righe su cinque | §8.1, §8.2 |
| R5-5 | Trascinamento senza «Salvo…» né 10 s (correzione persa nella riscrittura) | §5.1 |
| R5-7 | Due letture della spec non dichiarate | L11, L12 |
| R5-8 | §11 di nuovo ottimista; «vince la prova» non limitato alla sintassi | §11 |

### E.3 Minori — reggono

Trascinamento senza risposta senza messaggio per ciascun esito (R5M-6 → «Controlla» automatico); versioni con cui si
riaccende «Elimina» (R5M-7 → versioni rilette); `23503` non classificato (R5M-8 → §4.3 passo 6); prove non allineate
alla tabella e regola 7 senza esito (R5M-9 → §8.1, §8.2; la violazione della regola 7 è un errore del server);
trigger con `when` su `OLD` e `NEW` insieme a INSERT e DELETE non dichiarabile (R5-6 → tre trigger o confronto nel
corpo, dettaglio SQL); `57014` fra gli esiti incerti (R5-9 → tolto); «non può cambiare password» falso per il proprio
account (R5-10 → limitato alle altrui, `secure_password_change` in §8.7).

### E.4 Scartati

Nessuno.

---

## Appendice F — Registro della revisione 6

Due revisori su Opus: una **lente che misura**, su un database di prova separato creato e cancellato (`rev6_invii`,
15:35:25–15:35:49 e 15:37:23–15:37:25; documento aperto alle 15:35:59, dopo la Parte 1), e una lente di coerenza e
sicurezza in sola lettura. Nessuno ha scritto sul database `postgres`.

**Misurato (lente che misura), in `read committed`:** se l'invio ha registrato il codice, «Controlla» aspetta fino alla
fine del commit, parte differita compresa (1510 ms, 2006 ms), e vede `salvata`; se «Controlla» arriva prima, l'invio
restituisce `annullato` e non scrive; se l'invio fallisce, il codice resta libero e viene bruciato. Il meccanismo si
rompe in quattro modi, tutti misurati: «Controlla» come istruzione unica (legge la fotografia di prima dell'attesa);
una scrittura prima dell'insert del codice (sopravvive); `repeatable read` insieme a un ramo «altrimenti prosegue»
(scrive lasciando il codice «annullato»); un «Controlla» in tempo scaduto tradotto come fallimento (non brucia, e
l'invio poi salva).

### F.1 Bloccante — regge

| Id | Reperto | Dove si chiude |
|---|---|---|
| R6-1 | Dopo «Non risulta salvata» «Salva» ripartiva con le versioni **rilette**: un servizio aggiunto da una collega nel frattempo veniva tolto in silenzio (lo stesso difetto del B5, tornato) | §4.4 riga 1: versioni di partenza della scheda; prova in §8.2 |

### F.2 Maggiori — reggono

| Id | Reperto | Dove si chiude |
|---|---|---|
| R1 (misura) / R6-3 | La prova «tiene l'invio fermo, poi Controlla» si bloccava da sola e non poteva dare `annullato` | §8.2: tre prove distinte (a), (b), (c) |
| R2 (misura) | Un «Controlla» fallito veniva tradotto in «riprova a salvare» | §4.4: sempre di nuovo «Non so» |
| R3, R5, R6 (misura) | Ramo dopo il conflitto sulla chiave, «Controlla» in un'istruzione sola, scrittura prima del codice | §4.4, regola 0 di §4.1 |
| R6-2 | Tabella degli invii: invoker senza permessi, oppure permessi che permettono di «sbruciare»; §4.2 falso sulla DML diretta | §4.4 funzione di servizio `definer`; §4.2 corretto |
| R6-4 | «Controlla» come Server Action resta in fila dietro l'invio bloccato (fatto documentato, non da misurare) | §4.4: rotta del server fuori dalla fila; §10 |
| R6-5 | Ordine della procedura: la sessione rubata restava viva mentre si riattivavano le colleghe | §4.7: prima le sessioni, poi la password |
| R6-6 | Il limite taceva lettura delle clienti, cancellazione in massa, chiusura delle sessioni altrui | §4.7 limite; backup in §8.7 |
| R6-7 | «Annulla» incerto diceva «lo spostamento non è stato salvato» a uno spostamento salvato | §5.1: messaggi dell'annullamento |
| R6-8 | «Controlla» automatico senza risposta lasciava il «?» fermo e le ricariche sospese | §5.1: «?» toccabile, tre ritentativi, altri blocchi non sospesi |
| R6-9 | `delete_visit` senza blocco: un servizio aggiunto nello stesso istante spariva per cascata | §4.1: regole 0, 2, 10 |

### F.3 Minori — reggono

Livello di isolamento non fissato (R4 → `read committed` e prova di catalogo); stesso codice per i ritentativi su
`40P01` (R7 → §4.3 passo 5); permessi della tabella degli invii (R8 → funzione di servizio); riga 1 «mai arrivato»
(R9 → «non ha scritto nulla»); casi senza riga: «Elimina» annullato con visita assente, esiti di «Elimina» e «Togli»,
`salvata` con visita assente fuori dalle cancellate, versioni della riga 3, righe del trascinamento, `57014` nel
trascinamento, «Annulla» dopo un ✓ di «Controlla», «Togli» come invio (R6-10 → §4.4, §5.1); D3-20 in §2 in
contraddizione con §4.7, «come la riga 3» per un doppio invio proprio, `23503` su servizio od operatrice, pulizia a 30
giorni senza meccanismo (R6-11 → corretti); prove mancanti (R6-12 → §8.2); §11 (R6-13 → riscritta).

### F.4 Scartati

Nessuno.

---

## Appendice G — Giro finale: tabella completa dei casi

Un revisore su Opus ha costruito per conto suo la tabella dei casi «salvataggio incerto + collega» come prodotto di
azione dell'operatrice × sorte dell'invio × azione della collega × esito di «Controlla», con le riduzioni dichiarate,
e ha verificato ogni riga contro la rev. 7. Nessuna query eseguita (le funzioni non esistono ancora); per la
serializzazione si è appoggiato alle misure dell'appendice F.

**Esito: 105 righe — 85 VERE, 2 FALSE, 18 senza messaggio definito.** Il nucleo regge su tutte le righe: «Non risulta
salvata» non è mai falso quando il codice è bruciato davvero, e ripartire dalle versioni di partenza non toglie mai il
lavoro di una collega.

| Id | Righe | Reperto | Classe | Dove si chiude (rev. 8) |
|---|---|---|---|---|
| R7-1 **bloccante** | H7 (F6) | «Annulla» senza risposta, riga 1: il messaggio diceva «la visita è alle 16:15» dalla memoria, mentre una collega l'aveva spostata alle 17:00 | decisione | §4.4 regole comuni: ogni messaggio dalla lettura; §5.1 tabella di «Annulla» |
| R7-2 | G11 | Account chiuso nell'istante della scrittura: UPDATE/DELETE a zero righe senza errore, falso ✓ | dettaglio SQL | §4.1 **regola 11** (nella rev. 8 era dentro la regola 9): conteggio delle righe |
| R7-3 | G12 | Riga del codice invisibile in «Controlla» | dettaglio SQL | §4.4: «Non so», mai riga 1 |
| R7-4 | C24 | Dopo «modificata altrove» non era detto che il contenuto della scheda diventa lo stato corrente | decisione | §4.4 «La scheda aggiornata» |
| R7-5 | G10 | Scheda abbandonata con un invio incerto: il codice non veniva mai bruciato | decisione | §4.4 «Scheda abbandonata» |
| R7-6 | G9 | Errori che non provano l'annullamento finivano in «riprova» | decisione | §4.3 passo 8 |
| R7-7 | H2–H5, H9, H10 | Esiti di «Annulla» senza messaggio | decisione | §5.1 tabella di «Annulla» |
| R7-8 | E3, E4, E6 | «Togli» trattato come «Elimina» | decisione | §4.4 «Togli» |
| R7-9 | I1 | «Crea di nuovo» ambiguo sugli `id` | decisione | §4.4 regole comuni |
| R7-10 | G13, A17 | Account chiuso in «Controlla»; `esiste_gia` con visita sparita | decisione | §4.4 regole comuni |
| R7-11 | T3, T4 | Versioni restituite non adottate; fila delle Server Actions per gli invii | decisione | §5.1 |
| R7-12 | D8, D9 | «Elimina» riga 1 mostrava il contenuto di partenza; `gia_cancellata` con due messaggi | decisione | §4.4 «Elimina visita» |

Scartati: nessuno.

---

## Appendice H — Verifica dei 20 casi del giro finale

Un revisore su Opus ha ricontrollato contro la rev. 8 i 20 casi non veri dell'appendice G, e se le correzioni
rompessero uno degli 85 casi veri. Nessun file temporaneo, nessuna query.

**Esito:** 15 veri (G9, G12, G13, A17, C24, E3, E4, E6, T3, T4, H2, H3, H5, H7, I1), **4 falsi non bloccanti** (G11 su
`delete_visit`, H4, H9, H10), **1 ancora scoperto** (G10). **Il bloccante R7-1 (H7) è chiuso**; nessun bloccante
nuovo; nessuna correzione rompe gli 85 casi veri. Unico duplicato possibile residuo: G10, se iOS chiude l'app durante
un invio incerto e l'operatrice riprenota in un'altra cella entro la durata massima dell'invio.

Verificato dal revisore, e riportato: un errore con codice Postgres arrivato attraverso PostgREST implica che la
transazione è stata annullata; non esiste un `57014` o `40P01` «dopo il commit». Il falso di H4 stava nel messaggio,
che nominava l'orario dalla memoria.

| Id | Sev. | Classe | Reperto | Dove si chiude (rev. 9) |
|---|---|---|---|---|
| R8-1 | maggiore | dettaglio SQL | Il conteggio delle righe era nella regola 9, che `delete_visit` non richiamava: falso «✓ Cancellata» | §4.1 regola 11, per tutte e tre le funzioni |
| R8-2 | maggiore | decisione | «Annulla» con `57014`/`40P01`: «ancora alle 16:15» dalla memoria | §5.1 tabella: rilettura e orario letto |
| R8-3 | maggiore | decisione | Su iPhone niente avviso di chiusura e `sessionStorage` perso: codici mai bruciati | §4.4 «Scheda abbandonata» punto 3: `localStorage` |
| R8-4 | maggiore | decisione | Il messaggio con il nome non si costruiva dai soli codici; nome della cliente nuova non nel database | §4.4 punto 3: `id` accanto al codice, nome solo se letto, testo senza nome |
| R8-5 | maggiore | decisione | «Annulla» riga 3 diceva «Non ho annullato» a un annullamento salvato | §5.1 tabella |
| R8-6 | maggiore | decisione | «Annulla» riga 4, idem | §5.1 tabella |
| R8-7 … R8-15 | minori | — | riga 1 con visita assente; riga 6 con `cancellata_altrove`; «Non so» arrivato nel trascinamento; ricarica vecchia dopo il ✓; 10 s dal tocco e uscita dalla fila; account chiuso fra due letture; «Esci» e codici pendenti; «pendente» definito; prove mancanti | §4.3 passo 7, §4.4, §4.9, §5.1, §8.1, §8.2 |

Scartati: nessuno.

---

## Appendice I — Controllo dei 5 casi e della tabella di «Annulla»

Un revisore su Opus, con misure di sola lettura sul catalogo (`visit_access` e `appointment_access` sono `ALL USING
app.is_active_operator()`; `appointment_visit_date_fk` è `on delete cascade`; `zz_delete_orphan_visit` è AFTER DELETE
FOR EACH ROW).

**Esito: nessun bloccante.** G11, H9, H10 e G10 veri; H4 vero nella tabella di «Annulla» e ancora ancorato alla memoria
nel ramo gemello del trascinamento. Dieci voci su dieci vere, nessuna sovrapposizione, un esito senza voce (riga 5).
Nessuna correzione della rev. 9 rompe i casi già verificati.

| Id | Sev. | Classe | Reperto | Dove si chiude (rev. 10) |
|---|---|---|---|---|
| R9-1 | maggiore | decisione | Nel trascinamento, `57014`/`40P01` rimetteva il blocco «dov'era» dalla memoria | §5.1: rilettura, ricarica, posizione letta |
| R9-2 | maggiore | decisione | Su iPhone `pagehide` scatta anche al cambio d'app: il `keepalive` avrebbe bruciato invii in volo | §4.4 punto 2: solo con `persisted === false` |
| R9-3 | maggiore | decisione | «Esci» aspettava «Controlla» senza limite: con la rete giù non si esce | §4.4 punto 4: 5 s e «Esci comunque» |
| R9-4 | maggiore | decisione | §4.9 diceva «senza orari», §4.4 teneva e mostrava l'istante | §4.9: istante dichiarato |
| R9-5 | maggiore | decisione | Codici locali senza scadenza contro la pulizia a 30 giorni: «non risulta salvato» sarebbe tornato falso | §4.4 punto 3: scadenza 24 ore |
| R9-6 … R9-17 | minori | 4 dettaglio SQL, 8 decisione | ordine di `delete_visit`; WHERE della regola 11 e codice sollevato; salvataggio che non cambia nulla; voci mancanti o imprecise della tabella («ora è alle HH:MM» quando l'ora non cambia, `non_trovata`, riga 5, avvisi già confermati); conferma nei primi 10 s; codici legati all'operatrice; rimandi e prove | §4.1 regola 11 e `delete_visit`, §4.3 passo 7, §4.4, §5.1, §8.1, §8.2, appendice G |

Scartati: nessuno.
