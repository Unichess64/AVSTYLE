# Piano 3b — Dove c'è posto: documento di design

**Data:** 28 settembre 2026
**Revisione:** 1 — prima stesura, dopo il brainstorming del 28 settembre 2026 con l'utente (dieci decisioni, tre
blocchi di domande).
**Stato:** non rivisto; in attesa della revisione avversariale e del sì dell'utente per il commit; non committato
**Spec di riferimento:** `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`, revisione 5 (in inglese).
«spec §N» = sezione di quella spec; «§N» senza prefisso = sezione di questo documento.
**Documento fratello:** `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md`, **revisione 20** — la
revisione su cui questo documento è stato scritto. Al momento della stesura la chat che esegue il Task 8 del piano
3a-1 potrebbe portarla a 21: chi rilegge confronti. «3a §N» = sezione di quel documento.
**Base di codice:** `main` a `ee2a679` [misurato: `git rev-parse --short HEAD`]
**Letto per scrivere questo documento:** spec §6.2, §6.3, §6.6, §7.1–§7.6, §8.1–§8.7, §9.5–§9.7, §9.11, §9.12,
§10.1–§10.5, §11.1–§11.5, §12, §12.1, §13.1, §13.4; 3a §1–§4.9, §5.4, §5.5, §6, §7, §8.1, §8.2, §9, §10, §11 e
l'appendice B.3; `docs/superpowers/plans/2026-09-18-availability-findings.md` (intero);
`src/dominio/cercaposti.ts`, `proposte.ts`, `finestra.ts`, `tipi.ts`;
`docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` Task 8 e Task 10;
`supabase/migrations/0002`, `0003`, `0004`, `0012`, `0016`, `0019`.

Questo documento fissa **che cosa** costruisce il piano 3b e **perché**. Il **come**, riga per riga, è del piano di
implementazione.

Legenda: **[misurato]** = verificato su file o comando, con la sede; **[dalla revisione]** = misurato o letto da un
revisore di un altro giro, con la fonte; **[dai findings]** = misurato dal piano 2 e registrato in
`2026-09-18-availability-findings.md`; **[dalla spec]**; **[proposta]** = numero o scelta che il piano misura o
conferma; **[da misurare]** = fatto non stabilito.

⚠︎ **Nessun numero di questo documento è [misurato] per esecuzione.** Chi l'ha scritto non ha potuto lanciare Vitest
né toccare il database: quattro chat lavoravano sullo stesso repo e sullo stesso computer. Ogni fatto marcato
[misurato] è una **lettura di un file**, con la sede; tutto ciò che richiede un'esecuzione è [proposta] o
[da misurare]. Un numero dedotto a lettura e scritto come fatto è l'errore che questo progetto ha pagato più volte.

---

## 1. Che cos'è il 3b

Il 3a costruisce **il giorno**: l'agenda che l'operatrice guarda, la scheda con cui scrive, il percorso di scrittura
che regge una collega che scrive insieme a lei. Il 3b costruisce **la domanda che arriva da fuori**: il telefono
squilla, e la voce dall'altra parte non chiede un giorno — chiede *«quando c'è posto?»*, oppure è una cliente che il
salone deve trovare, correggere, richiamare per il compleanno.

Tre schermate, una migrazione, e due obblighi aperti del piano 2 da decidere.

| Piano | Nome | Contenuto |
|---|---|---|
| 3a | Il giorno | scheletro, accesso e sessioni, navigazione, agenda (spec §9.1–§9.3), scheda visita (§9.4), percorso di scrittura, diretta, tutta la spec §10 |
| **3b** | **Dove c'è posto** | **cercaposti (spec §9.5) con paginazione e «fuori orario», clienti (§9.6), compleanni (§9.7)** |
| 3c | La preparazione | disponibilità (§9.8) e restringimento (§7.6), impostazioni (§9.9), primo avvio (§9.10), verifiche prima del rilascio, «telefono perso» |
| 4 | Dati personali | spec §11 |

Ogni piano ha il proprio ciclo brainstorming → spec → piano → esecuzione → verifica (3a §1). **D19 resta:** il salone
non usa l'app prima della fine del 3c — e questo fatto ha una conseguenza che il §5.6 di questo documento affronta,
perché il piano 4 viene **dopo** il primo uso vero.

---

## 2. Decisioni dell'utente del 28 settembre 2026

| # | Decisione | Nota |
|---|---|---|
| **D3b-1** | **Passo di 15 minuti nella lista**, con «tutti gli orari» di un giorno a richiesta | §4.4. Il motore propone una partenza ogni **5 minuti** [misurato: `src/dominio/proposte.ts:85`, `inizio++`]: una mattina libera 9–13 con un servizio da 30′ dà ~43 partenze per operatrice, e con tre operatrici ordinate per orario (D2-11) la prima pagina diventa `09:00 Vera · 09:00 Annalisa · 09:00 Alessandra · 09:05 Vera…`. Scartate: le pastiglie per giorno (vanno a capo a 375 punti) e «le prime N per giorno» (nasconde il pomeriggio libero di un giorno con la mattina libera) |
| **D3b-2** | **«Fuori orario» propone dentro l'estensione dell'agenda**, `salon_settings.day_start_boundary`–`day_end_boundary` | §4.5. Oggi 96–240, cioè 08:00–20:00 [misurato: `supabase/migrations/0002_catalogue.sql:38`]. Così non si propone niente che l'operatrice non possa poi guardare in agenda. Scartate: la settimana tipica (muta nel giorno di riposo, che è dove serve) e l'intera giornata (propone le 03:20 e riempie la prima pagina) |
| **D3b-3** | **L'orizzonte si estende di 28 giorni per volta, fino a 84** | §4.6. Tre mesi coprono il ritmo di riprenotazione a tre settimane con margine. Senza tetto, si cercherebbe a maggio 2027, dove l'unica cosa inserita è la settimana tipica |
| **D3b-4** | **I motivi del vuoto si riportano TUTTI, nominando l'operatrice** | §4.7. `PRECEDENZA_MOTIVI` smette di decidere: `reason` singolo diventa un insieme per operatrice. Chiude `PRECEDENZA-MOTIVI` |
| **D3b-5** | **`client` prende `updated_at`**, con una migrazione nuova e il trigger che esiste già | §5.4. `app.touch_updated_at()` è in `0004_visit_appointment.sql:41` [misurato]. La modifica di una cliente diventa un compare-and-set come per le visite (spec §10.2). Scartate: accettare la sovrascrittura silenziosa su un dato personale, e il salvataggio per soli campi toccati (che è il caso peggiore travestito da soluzione: riduce il danno, non avvisa nessuno) |
| **D3b-6** | **Nei compleanni, chi ha l'opt-out COMPARE, senza WhatsApp e senza chiamata** | §6. Permette gli auguri di persona e rende impossibile il messaggio. È una lettura più larga di spec §9.7 («excluding `no_messages`»): L3b-4 |
| **D3b-7** | **«Prenota da lei» apre il CERCAPOSTI**, con cliente e servizio già scelti | §5.7. È la cliente al telefono che chiede «quando c'è posto», e con la cliente scelta la sua operatrice preferita sale in cima (spec §8.3) |
| **D3b-8** | **«Elimina cliente» si anticipa nel 3b**; l'esportazione resta al piano 4 | §5.6. Quando il salone comincia a usare l'app (fine 3c) il diritto di cancellazione ha un percorso. L'esportazione porta dentro formato, consegna e il fatto che un export sconfigge la conservazione (spec §11.5): mezzo piano 4 |
| **D3b-9** | **L'annuncio di una cliente cambiata riusa `annuncio.giorni`**: si aggiorna l'agenda, non la pagina Clienti | §7. Nessuna migrazione sulla tabella del Task 8, e nessun identificativo di persona sul canale. Limite dichiarato in §8 |
| **D3b-10** | **`SEGUENTE-VICINO` si chiude con una prova**, su entrambi i lati del gemello | §9.1. Nessun codice toccato |

---

## 3. Perimetro del 3b

### 3.1 Dentro

- **Cercaposti** (spec §9.5, §8.3): scelta dei servizi, risultati paginati su 28 giorni estendibili, interruttore
  «cerca anche fuori orario», stato vuoto con i motivi. Route: il «+» flottante dell'agenda.
- **Clienti** (spec §9.6): elenco, ricerca per nome e telefono, scheda di una cliente con le visite passate e future,
  creazione fuori dalla scheda visita, **modifica** (compresi `preferred_operator_id` e `no_messages`), **Elimina**
  (D3b-8), «prenota da lei» (D3b-7). Route: voce di navigazione *Clienti*.
- **Compleanni** (spec §9.7): oggi, questa settimana, questo mese; WhatsApp o chiamata. Route: scheda dentro Clienti.
- **Una migrazione**: `client.updated_at` e il suo trigger, `salva_cliente`, `cancella_cliente`, `compleanni`, e il
  trigger d'annuncio quando cambia una cliente (§5.4, §6, §7).
- **L'estensione della firma di `cercaPosti`**: durate per operatrice, passo, cursore, fuori orario, motivi per
  operatrice (§4).
- **Prova 2 di spec §13.4** (prenotare una visita a due servizi dal cercaposti).

### 3.2 Obblighi aperti che il 3b chiude

Tutti dai findings del piano 2, sezioni «Limiti noti rimasti aperti» e «Obblighi che passano al piano 3».

| Obbligo | Come | Prova |
|---|---|---|
| `CERCAPOSTI-PAGINE` | cursore `(date, startCell, operatorId)` con ordine totale (§4.3) | §9.1 |
| `FUORI-ORARIO` | fasce di ripiego dall'estensione dell'agenda, dentro la firma (§4.5) | §9.1 |
| `CONTORNO-CERCAPOSTI`, resto | tre guardie sull'ingresso: `limit ≥ 1`, `days ≥ 1`, operatrici non duplicate (§4.8) | §9.1 |
| `INGRESSO-CERCA-TIPO` | `Partial<IngressoCercaposti>` in `tests/dominio/cercaposti.test.ts:132` [misurato] (§4.8) | `tsc --noEmit` con un refuso deliberato |
| `SEGUENTE-VICINO` | prova con due blocchi dopo la partenza **e due prima** (D3b-10) | §9.1 |
| `PRECEDENZA-MOTIVI` | l'ordine smette di decidere: si riportano tutti (D3b-4) | §9.1 |

### 3.3 Fuori

- **3a / 3a-2:** guscio dell'app, accesso, navigazione a quattro voci, involucro degli errori delle Server Actions,
  agenda, scheda visita, percorso di scrittura, diretta, tutta la spec §10. Clienti è una **pagina segnaposto** nel
  3a: il 3b la riempie e **non ridefinisce** ciò che sta attorno (§12).
- **3c:** disponibilità (spec §9.8) e restringimento (§7.6), impostazioni (§9.9) — comprese le ore del salone, che
  D3b-2 legge e non modifica —, primo avvio (§9.10), verifiche prima del rilascio, «telefono perso».
- **Piano 4:** spec §11 — l'**esportazione** del record di una cliente (§11.3), la conservazione a 24 mesi e il suo
  distintivo di navigazione (§11.4), l'export dell'intero insieme (§11.5), l'informativa.
- **Limiti noti senza piano:** `ORDER-BY`, `ANALYZE-anon`, `AUTHUSERS-DELETE` (3a §3.3).
- **Le visite a due mani dal cercaposti:** vedi il limite in §8.

---

## 4. Il cercaposti

### 4.1 Che cosa esiste già, e che cosa il 3b aggiunge

⚠︎ **Il motore è finito e non si riprogetta.** Il piano 2 ha consegnato sei moduli in `src/dominio/` con 256 prove su
18 file, più `npm run test:fuso` (96 prove sotto `TZ=America/New_York`) [dai findings]. Il cercaposti del 3b è
**l'interfaccia sopra quel motore**.

Tre decisioni del piano 2 vincolano tutto questo capitolo:

- **D2-9** — il riassetto guarda l'appuntamento **più vicino**, non tutti (`proposte.ts:136-142` [misurato]).
- **D2-10** — `availability_window` filtra le operatrici disattivate su **disponibilità ed eccezioni**, non
  sull'**occupazione**: filtrarla dichiarava libera una cella che il vincolo rifiuta poi con `23505`
  (`0012_availability_window.sql:22-36` [misurato]).
- **D2-11** — a parità di data il cercaposti **ordina per orario fra tutte le operatrici**, e raccoglie l'intera
  giornata prima di ordinare e di troncare: tagliare dentro il ciclo delle operatrici riempiva la prima pagina con
  cinque proposte della stessa persona a cinque minuti l'una dall'altra (`cercaposti.ts:58-62` [misurato]).

Il 3b **estende la firma** di `IngressoCercaposti` e di `EsitoCercaposti`. Non tocca `proposeStarts`, che resta il
contratto congelato di spec §7.4. Le cinque estensioni sono §4.2 (durate per operatrice), §4.3 (cursore), §4.4
(passo), §4.5 (fuori orario) e §4.7 (motivi). I findings prevedevano già almeno due di queste: *«l'interruttore*
*«cerca anche fuori orario» dovrà estendere la firma di `cercaPosti` o di `proposeStarts`: la firma del piano 2 non è*
*congelata contro questa estensione»* [dai findings].

### 4.2 ⚠︎ La durata dipende dall'operatrice, e la firma di oggi non lo sa

**Il reperto.** `operator_service.duration_cells` è **per coppia (operatrice, servizio)**, e `NULL` significa «usa
`service.default_duration_cells`» (D28) [misurato: `0002_catalogue.sql:21-27`]. `IngressoCercaposti` porta invece
**una sola** `durations: readonly number[]` per tutte le operatrici passate in `operatorIds` [misurato:
`cercaposti.ts:23`].

**Il danno.** Vera fa il semipermanente in 45 minuti, Annalisa in 60. Con `durations: [9]` — 45 minuti — il
cercaposti propone per Annalisa partenze calcolate su una campata che le sta stretta: l'orario si dice alla cliente,
e al salvataggio l'appuntamento vero occupa 12 celle invece di 9, così o sbatte contro l'appuntamento seguente
(`23505`, spec §10.1) o mangia il riassetto di §7.3 in silenzio. Passando invece la durata **più lunga** per tutte,
sparirebbero le partenze buone di Vera.

Non è raggiungibile oggi, perché nessuna schermata chiama ancora `cercaPosti`: il 3b è **il primo chiamante**, ed è
qui che si chiude.

**Il rimedio.** `operatorIds: readonly string[]` diventa:

```
operatori: readonly { readonly id: string; readonly durations: readonly number[] }[]
```

`buffers` **resta al livello alto**, e la ragione è nel modello e va scritta accanto: la pausa è del **servizio**
(`service.buffer_after_cells` [misurato: `0002:16`]), la durata è della **coppia**. Metterli nello stesso oggetto per
simmetria racconterebbe una bugia sul database. La corrispondenza fra `durations[i]` e `buffers[i]` è **posizionale
sull'elenco dei servizi scelti**, che è comune a tutte le operatrici; `proposeStarts` pretende già
`durations.length === buffers.length` e solleva `RangeError` altrimenti [misurato: `proposte.ts:44-48`], quindi la
guardia va rispettata **per ciascuna operatrice**, non una volta.

L'ordine dell'elenco `operatori` resta quello del chiamante ed è l'ultimo criterio d'ordine (`ordineChiamante`,
`cercaposti.ts:54` [misurato]).

**Conseguenza su §4.7:** `service_too_long` diventa un fatto **per operatrice** — Vera ha una fascia abbastanza
lunga, Alessandra no — e questo, da solo, rende D3b-4 necessaria e non solo gradita.

### 4.3 La paginazione (`CERCAPOSTI-PAGINE`)

**Oggi** `cercaPosti` tronca e **non dice** che ha troncato: al raggiungimento di `limit` ritorna
`{ rows, reason: null }` e il resto è perduto [misurato: `cercaposti.ts:95-98`]. I findings chiedono *«un `offset` o*
*un cursore `(date, startCell, operatorId)`»*.

**Un `offset` non va bene**, e la ragione non è l'eleganza: fra la prima e la seconda pagina una collega prenota, una
riga della pagina 1 scompare, e la riga che stava alla posizione 20 scala a 19 — la pagina 2 la salta. Un cursore che
dice «riprendi da **dopo questa riga**» non salta.

**Il cursore è `{ date, startCell, operatorId }`, e vale solo perché l'ordine è totale.** L'ordine di D2-11 è
`(date, startCell, preferita?, ordineChiamante)` [misurato: `cercaposti.ts:84-93`]. `operatorId` da solo **non**
riproduce il terzo e quarto criterio: per decidere se una riga viene «dopo» il cursore, il rango dell'operatrice si
**ricalcola** da `preferredOperatorId` e dall'ordine di `operatori`.

⚠︎ **E §4.5 aggiunge un criterio DAVANTI a tutti: «dentro orario prima di fuori orario».** Corretto durante
l'autocontrollo di questo documento, che prima enumerava qui quattro criteri e ne aggiungeva un quinto in §4.5 senza
tornare a correggere questa sezione. L'ordine totale completo è quindi:

```
(fuoriOrario?, date, startCell, preferita?, ordineChiamante)
```

con `fuoriOrario?` = 0 per una partenza dentro le fasce risolte e 1 per una fuori. Conseguenze, entrambe necessarie e
nessuna delle due deducibile dal solo `{ date, startCell, operatorId }`:

- **il cursore porta anche il segno «fuori orario»** della riga da cui riprende, altrimenti la prima riga fuori
  orario del primo giorno confronta «prima» dell'ultima riga dentro orario dell'ultimo giorno e la pagina 2 riparte
  dall'inizio;
- **il segno di una riga si ricalcola**, come il rango, dall'appartenenza alle fasce risolte (§4.5), non si legge dal
  cursore: il cursore lo porta per **confrontare**, non per fidarsi.

Da qui tre regole:

1. **Il cursore è `{ fuoriOrario, date, startCell, operatorId }`**, quattro campi e non tre: è la forma corretta
   dopo l'aggiunta di §4.5.
2. **L'ordine è totale solo senza operatrici duplicate.** Con un duplicato, `ordineChiamante` tiene l'ultimo indice e
   due righe distinte confrontano uguale: il cursore non sa quale delle due ha già emesso. È una delle tre ragioni
   della guardia di §4.8, e va scritta accanto a essa.
3. **Il cursore appartiene alla richiesta.** Cambiare un servizio, la cliente, l'interruttore «fuori orario» o
   l'orizzonte cambia `operatori`, `durations` o `preferredOperatorId`, e il rango con essi: il cursore si **butta** e
   la paginazione riparte da capo. Un cursore riusato dopo un cambio salta righe o le ripete, in silenzio. Il piano
   lega il cursore a un'impronta della richiesta e lo rifiuta se l'impronta non coincide.

**«C'è una pagina dopo?» si risponde chiedendo una riga in più.** `cercaPosti` interroga `limit + 1`; se ne arrivano
`limit + 1`, scarta l'ultima e restituisce `prossimo` = il cursore della **ultima riga tenuta**. Questa è la forma
che non mente: dedurre «c'è ancora roba» dal fatto che sono arrivate esattamente `limit` righe è falso proprio nel
caso in cui le righe sono esattamente `limit`.

`EsitoCercaposti` diventa `{ rows, motivi, prossimo }` (`motivi` in §4.7).

**Dimensione della pagina: 20 [proposta].** Con il passo di D3b-1 l'orizzonte intero sta in circa 280 righe
[da misurare: dipende dalla disponibilità inserita], quindi 20 è «una schermata e mezza» e non «una pagina su 170».
Il piano misura la cardinalità vera sui dati di prova e conferma o corregge il numero.

**Limite dichiarato:** la paginazione **non è un lucchetto**. La pagina 2 è calcolata su uno stato del database più
recente della pagina 1, quindi una proposta della pagina 1 può essere già stata presa quando l'operatrice la tocca.
Il percorso che lo gestisce esiste già e non si duplica qui: il salvataggio la rifiuta con `23505` e la frase di
conflitto di spec §10.1 nomina l'appuntamento che possiede la cella (3a §4.3 passo 3). È la stessa forma di spec
§7.6, che dichiara di essere «un invito a fare telefonate, non un lucchetto».

### 4.4 Il passo di 15 minuti (D3b-1)

`proposeStarts` avanza di **una cella** (`inizio++`, `proposte.ts:85` [misurato]): per un servizio da 30′ in una
mattina libera 9–13 escono ~43 partenze, e ordinate per orario fra tre operatrici la lista diventa illeggibile prima
di essere utile.

**Il filtro sta dentro `cercaPosti`, non a valle.** Questo è l'unico punto in cui la forma tecnica precisa la
decisione dell'utente, e vale scriverlo: un filtro applicato **dopo** `cercaPosti` arriva **dopo il troncamento a
`limit`** — 20 righe filtrate a passo 15′ possono ridursi a 2, e le altre 18 partenze buone del giorno sono già state
buttate dentro il motore. Quindi l'ingresso prende:

```
passoCelle: number   // 3 = un quarto d'ora; 1 = tutte le partenze
```

e `cercaPosti` scarta le partenze fuori passo **prima** di ordinare e troncare. `proposeStarts` non si tocca: è
`cercaPosti` a filtrare ciò che ha ricevuto. Il valore di difetto è **3** [proposta: 3 celle = 15 minuti, D3b-1].

**Il passo è ancorato alla mezzanotte, non all'inizio della fascia.** `startCell % passoCelle === 0`. Ragione: la
lista è ordinata per orario **fra operatrici**, e ancorare alla fascia darebbe a Vera le partenze 09:10, 09:25… e ad
Annalisa 09:00, 09:15… — due griglie diverse nello stesso elenco, che è esattamente il disordine che D2-11 esiste per
evitare. Conseguenza, dichiarata: una fascia che comincia alle 09:10 (cella 110) ha la sua prima partenza proponibile
alle **09:15**, e i cinque minuti davanti si vedono solo aprendo il giorno.

**«Tutti gli orari» di un giorno** è una seconda chiamata, non una schermata nuova: `from = to =` quel giorno,
`passoCelle: 1`, `limit` alto, nessun cursore. È il percorso per incastrare un buco stretto, e la lista principale lo
offre toccando l'intestazione del giorno.

### 4.5 Fuori orario (`FUORI-ORARIO`, D3b-2)

**Che problema è.** L'interruttore di spec §8.4 è *off* per difetto. Acceso, deve proporre dove **oggi non c'è nessuna
fascia**: `proposeStarts` risponde `salon_closed` o `operator_off` **prima di guardare le fasce**, e con zero fasce
non può proporre niente [misurato: `proposte.ts:52-58`]. Non basta ignorare `dayStatus`: senza fasce non c'è nessun
intervallo dentro cui cercare.

**Il rimedio (D3b-2).** `cercaPosti` riceve una **fascia di ripiego**:

```
fuoriOrario: { readonly attivo: boolean; readonly ripiego: Fascia }
```

con `ripiego = { startBoundary: salon_settings.day_start_boundary, endBoundary: salon_settings.day_end_boundary }`
— oggi `{ 96, 240 }`, cioè 08:00–20:00 [misurato: `0002_catalogue.sql:38`]. Quando `attivo` è vero, per ogni giorno e
operatrice `cercaPosti` chiama `proposeStarts` **due volte**:

1. la chiamata normale, con le fasce risolte e il `dayStatus` vero: le sue partenze sono **dentro orario**;
2. per raccogliere il resto della giornata, una chiamata con
   `ranges: [unione(fasce risolte, ripiego)]` e `dayStatus: 'open'`: le partenze **nuove** rispetto alla prima sono
   **fuori orario**.

`occupancy` è **la stessa** nelle due chiamate, e non si tocca: fuori orario si può prenotare (D18), sopra un
appuntamento esistente no. È la stessa asimmetria di D2-10, e per la stessa ragione.

⚠︎ **La differenza «dentro / fuori» non si deduce dal `dayStatus`**, ma dall'appartenenza della partenza alle fasce
risolte: un giorno `'open'` ha partenze fuori orario (prima dell'apertura di Vera) e un giorno `'salon_closed'` le ha
tutte fuori. Ogni riga porta quindi un suo segno, e non lo eredita dal giorno.

**Ogni riga fuori orario porta il motivo, per riga.** La riga dice **perché** è fuori: *«salone chiuso»*, *«Vera non
lavora»*, *«fuori dai suoi orari»* — sono i tre motivi che spec §8.4 chiede di nominare al tocco di una cella attenuata,
e qui arrivano prima, nella lista. Poi, al salvataggio, l'avviso ambra di D3-8 e «Salva comunque» (3a §4.5) sono quelli
del 3a e non si ridefiniscono: il cercaposti **non** salva, apre la scheda.

**La lista non mescola.** Le proposte dentro orario vengono **tutte prima** di quelle fuori, e le fuori orario stanno
sotto un'intestazione propria. Ragione: l'ordine per orario di D2-11 è giusto **a parità di desiderabilità**, e un
martedì di ferie alle 09:00 non è desiderabile come un mercoledì di lavoro alle 09:05. Mescolandole, la prima pagina
di un interruttore acceso per disperazione si riempie di giorni chiusi.

⚠︎ **Il ripiego arriva come argomento, non letto dal modulo.** `cercaPosti` resta puro: chi lo chiama legge
`salon_settings` e passa la fascia. Se il 3c rende modificabile l'estensione dell'agenda, cambia il chiamante e non il
dominio. E `salon_settings` ammette esattamente una riga (`id boolean primary key check (id)` [misurato: `0002:31`]),
quindi non c'è ambiguità su quale fascia sia.

### 4.6 L'orizzonte, e come si estende (D3b-3)

`ORIZZONTE_GIORNI = 28`, estremi compresi [misurato: `cercaposti.ts:8`]. L'estensione è **un blocco di 28 giorni per
volta, con tetto a 84**: `days` passa da 28 a 56 a 84, e il pulsante sparisce al tetto.

**L'estensione rilegge, non aggiunge.** Ogni estensione è una richiesta nuova con `days` maggiore, quindi **il cursore
si butta** (regola 3 di §4.3) e la lista riparte da capo. Costruire la coda chiedendo solo i giorni 29–56 e
attaccandola in fondo darebbe una lista giusta **solo se** nulla è cambiato nei primi 28: non è garantito, e l'errore
sarebbe silenzioso.

**Una lettura sola dal database per richiesta.** `availability_window(p_from, p_to, p_operator_ids)` prende un
intervallo di date apposta (spec §7.5): 84 giorni sono una chiamata, non 84 [misurato:
`0012_availability_window.sql:37-40`].

**Limite dichiarato:** oltre il primo mese la disponibilità potrebbe non essere ancora stata inserita, e il
cercaposti risponde `operator_off` con precisione e senza utilità. Lo stato vuoto lo dice in parole
(*«per quei giorni gli orari non sono ancora stati inseriti»*) **solo se** si distingue «nessuna fascia inserita» da
«assente per eccezione», e questa distinzione **non esiste** in `dayStatus` (spec §7.1 fonde tutto nella lista vuota;
D2-5 la chiama `operator_off`). Quindi lo stato vuoto **non** può affermarlo: [da misurare] se valga la pena portarla
nel documento della finestra, e la decisione è del **3c**, che possiede la disponibilità. Qui si dichiara e non si
inventa.

### 4.7 Perché nessuna proposta: i motivi (`PRECEDENZA-MOTIVI`, D3b-4)

**Oggi** si riporta **un** motivo, il primo secondo `PRECEDENZA_MOTIVI = ['full', 'service_too_long',
'operator_off', 'salon_closed']` [misurato: `cercaposti.ts:44-48`]. I findings registrano che l'ordine
`full > service_too_long` **non è esercitato**: scambiarli lascia la suite verde [dai findings].

**Perché l'ordine non va corretto, ma abolito.** Con tre operatrici, il motivo è **diverso per ciascuna**. Cerco un
massaggio da 90 minuti: per Vera i giorni sono pieni, per Alessandra nessuna fascia è abbastanza lunga. Un motivo
solo, `full`, consiglia *«estendo l'orizzonte»* — e per Alessandra estendere non servirà **mai**. Dopo §4.2 questo non
è più un caso di scuola: `service_too_long` dipende dalla coppia (operatrice, servizio), quindi è **normale** che le
operatrici divergano.

**Il rimedio (D3b-4).** `reason: MotivoAssenza | null` diventa:

```
motivi: readonly { readonly operatorId: string; readonly motivo: MotivoAssenza }[]
```

— **un motivo per operatrice**, quello più informativo fra i suoi, e la costante `PRECEDENZA_MOTIVI` resta a scegliere
*dentro* l'operatrice (lì l'ordine ha un senso: per la stessa persona, `full` significa «estendere può servire» e
`service_too_long` «non servirà mai»), **e ora è esercitata**, perché una prova può dare a una sola operatrice due
motivi diversi in due giorni. L'ordine smette di essere una scelta indifesa e diventa una regola con una vittima.

La lista è vuota quando `rows` non è vuota, come oggi `reason` è `null` (D2-2, `cercaposti.ts:100-103` [misurato]).

**Le frasi**, una per motivo, con il nome dell'operatrice:

| Motivo | Frase | Offerta |
|---|---|---|
| `full` | «Vera è piena fino al 26 ottobre» | «Cerca nelle prossime 4 settimane» (D3b-3) |
| `service_too_long` | «Alessandra non ha una fascia abbastanza lunga per 90 minuti» | niente: estendere non serve |
| `operator_off` | «Annalisa non lavora in questi giorni» | «Cerca anche fuori orario» (D3b-2) |
| `salon_closed` | «Il salone è chiuso in questi giorni» | «Cerca anche fuori orario» |

Le frasi si combinano con un punto mediano, e l'offerta mostrata è **una**: se almeno un motivo è `full`, si offre
l'estensione; altrimenti, se almeno uno è `operator_off` o `salon_closed`, il fuori orario; se sono tutti
`service_too_long`, **nessuna offerta** — e questo caso è l'unico onesto in cui la schermata dice *«questo servizio
non sta in nessuno degli orari di nessuna: cambia servizio, o chiama il 3c»*. [proposta: la scelta dell'offerta unica
contro due offerte affiancate; il piano la conferma su una bozza a 375 punti.]

### 4.8 Il contorno di `cercaPosti` (`CONTORNO-CERCAPOSTI`, resto)

Il 3a chiude la parte `decodificaFinestra` («l'agenda è il primo chiamante; valida ciò che riceve», 3a §3.2). Restano
i tre contorni di `cercaPosti`, **tutti misurati dal piano 2** [dai findings] e tutti confermati a lettura del codice
di `ee2a679`:

| Contorno | Che fa oggi | Sede letta | Rimedio |
|---|---|---|---|
| `limit: 0` | restituisce **una** riga: il `push` precede il confronto, e `1 >= 0` è vero | `cercaposti.ts:95-98` | `RangeError` se `limit < 1` |
| `days: 0` | restituisce un vuoto **senza motivo**: il ciclo non parte, `motiviVisti` resta vuoto | `cercaposti.ts:56`, `:100-103` | `RangeError` se `days < 1` |
| operatrici duplicate | righe **duplicate**, e `ordineChiamante` tiene solo l'ultimo indice | `cercaposti.ts:54`, `:65` | `RangeError` sui duplicati |

**`RangeError` e non una correzione in silenzio**, per tre ragioni: è la forma che il modulo già usa (`proposte.ts:44`
su `durations`/`buffers`, `blocco()` sulle celle fuori dominio [misurato]); un `limit` a zero o un'operatrice
duplicata sono **difetti del chiamante**, e normalizzarli li nasconde; e senza il rifiuto dei duplicati **il cursore
di §4.3 non ha un ordine totale**, quindi la guardia non è igiene ma un presupposto di correttezza di un'altra
sezione. Questo terzo motivo va scritto nel codice, accanto alla guardia: è la ragione che un revisore futuro non
ricostruirebbe.

**`INGRESSO-CERCA-TIPO`.** `ingressoCerca(sopra: Record<string, unknown> = {})` disarma il controllo dei tipi: `tsc
--strict` accetta un campo inesistente, quindi un refuso nel nome di un override fa girare la prova sul valore di
difetto [misurato: `tests/dominio/cercaposti.test.ts:132`]. Rimedio: `Partial<IngressoCercaposti>`.

⚠︎ **Ordine dei task:** il rimedio si applica **dopo** le estensioni di §4.2–§4.7, non prima. Applicandolo prima si
riscrive due volte, e — peggio — la seconda riscrittura arriverebbe su prove già adattate alla firma nuova, dove un
refuso è più difficile da vedere. La verifica del rimedio è un refuso **deliberato** in un override, che `tsc
--noEmit` deve rifiutare: senza quel passo la prova del rimedio non ha vittima.

### 4.9 Dal cercaposti alla scheda

Il cercaposti **non scrive**. Al tocco di una proposta apre la **scheda visita del 3a** (spec §9.4, 3a §5.4) con
operatrice, data, ora, servizi, durate e cliente già riempiti, e da lì valgono il percorso di scrittura, gli avvisi
ambra e «Controlla» del 3a, senza nessuna variante. Ragione: un secondo percorso di scrittura sarebbe un secondo
posto dove sbagliare `40P01`, i codici d'invio e le versioni — cioè la zona in cui il 3a ha speso sette giri di
revisione.

**Se una cliente non è stata scelta**, la scheda si apre con il campo cliente vuoto e il resto pieno: spec §8.3 dice
che senza cliente **nessuna preferenza si applica**, e che la revisione 2 ordinava per una cliente che il flusso non
aveva ancora chiesto.

---

## 5. Clienti (spec §9.6)

### 5.1 L'elenco

Chi apre *Clienti* senza cercare vede **tutte le clienti in ordine alfabetico**, a pagine.

**La paginazione è per posizione (`.range()`), non per cursore alfabetico.** Un cursore alfabetico sarebbe
`.gt('full_name', «Rossi Maria»)`, e **un nome nella querystring** viola 3a §4.8 («nessun dato personale in un URL, né
nell'indirizzo della pagina né nella querystring di una richiesta a PostgREST»). `.range()` manda un `Range` di
posizioni, che non dice niente di nessuno. Costo: se una collega inserisce una cliente mentre si scorre, una riga può
ripetersi o saltare fra due pagine — su un elenco alfabetico che si consulta, non è un danno, e vale il prezzo di non
mettere un nome in un URL.

**Pagina di 50 [proposta].**

### 5.2 La ricerca

Passa da `public.cerca_clienti(p_testo text)` chiamata **in POST** (3a §4.8), che il **Task 10 del piano 3a-1**
consegnerà (§12): nome e telefono in un corpo, non in una querystring. Accento- e maiuscole-insensibile per
`public.immutable_unaccent` (`0003_client.sql:6-12` [misurato]), e con la somiglianza di `pg_trgm` — è la regola di
spec §8.2, dove «maria rosi» deve trovare «Maria Rossi».

⚠︎ **Due cose che il 3b eredita e dichiara, senza correggerle:**

- **La ricerca si ferma a 20 e non lo dice.** `cerca_clienti` ha `limit 20` nel corpo e nessun `offset`
  [misurato: piano 3a-1, Task 10, testo della migrazione `0021`]: con venticinque Marie, cinque non esistono per chi
  cerca. Il 3b **non** estende la funzione — è del Task 10 e non è ancora nata — e invece **lo scrive nella
  schermata**: *«prime 20 · affina la ricerca»*, mostrato quando tornano esattamente 20 righe. Questa è la forma
  onesta: una lista troncata senza avviso è una lista che mente. [proposta: la soglia di avviso è «esattamente 20»,
  che segnala anche quando ce ne sono esattamente 20 e nessuna nascosta — un falso positivo innocuo, contro un falso
  negativo che nasconde una persona.]
- **L'ordine è `somiglianza desc, full_name`** [misurato: idem]. Una ricerca di sole cifre dà somiglianza ~0 a tutte
  le righe, quindi il risultato del ramo telefono esce **ordinato per nome** insieme a chiunque altro abbia
  somiglianza 0. Oggi non fa danno, perché il ramo telefono è molto selettivo (cifre uguali). [da misurare] se un
  testo misto di cifre e lettere produca un ordine controintuitivo; se sì, è un reperto del Task 10, non del 3b.

⚠︎ Terzo, minore, da segnalare e non da correggere qui: `client_name_search` indicizza
`immutable_unaccent(full_name)` **senza `lower`** [misurato: `0003_client.sql:37`], mentre la ricerca del Task 10
confronta `immutable_unaccent(lower(...))` e si appoggia al suo indice trigram nuovo. L'indice vecchio non serve alla
ricerca nuova. Non è un difetto, è un indice che nessuno usa più: se ne occupi chi tiene i conti degli indici (§13).

### 5.3 La scheda di una cliente

Nome, telefono, compleanno senza anno, operatrice preferita, opt-out dei messaggi; **visite future** in cima e
**passate** sotto, ciascuna con data, ora, servizio e operatrice; «prenota da lei» (§5.7); «Modifica»; «Elimina».

**Nessun campo di testo libero** (D26): non è un'etichetta mancante, è il vettore tolto (spec §11.1).

**Nessun prezzo, nessun incasso** (D14, spec §12).

**Lo storico dice che cosa è stato prenotato e non cancellato**, non che cosa è stato fatto: senza stati, una
prenotazione mantenuta e una mancata sono identiche (spec §12 punto 3). La schermata non lo chiama «storico dei
trattamenti», che sarebbe un'affermazione più forte di quella che i dati sostengono — e su dati la cui natura è la
prima domanda aperta della spec (§11.2, §14).

**La lettura delle visite non porta dati personali in URL.** Si legge `visit`/`appointment` filtrando su `client_id`,
che è uno pseudonimo casuale: ammesso. Il filtro vietato è quello su una **colonna che porta dati personali**
(`full_name`, `phone`, `birth_month`, `birth_day`) — vedi L3b-2, che è una precisazione della regola del 3a e non una
deroga.

### 5.4 Modificare una cliente, e la versione che non c'è (D3b-5)

**Il fatto.** `client` **non ha `updated_at`** [misurato: `0003_client.sql:14-35`, colonne: `id`, `full_name`,
`phone`, `birth_month`, `birth_day`, `preferred_operator_id`, `no_messages`, `created_at`, `last_activity_at`]. `visit`
e `appointment` sì, con il trigger `app.touch_updated_at()` (`0004_visit_appointment.sql:41`, `:51`, `:53`
[misurato]). Quindi il compare-and-set di spec §10.2, che il 3a usa per le visite, **qui non ha su che cosa
appoggiarsi**, e due colleghe si sovrascrivono in silenzio: una corregge il telefono, l'altra salva la scheda aperta
prima, e il numero giusto scompare senza che nessuna lo sappia.

**D3b-5:** una migrazione del 3b aggiunge `client.updated_at timestamptz not null default clock_timestamp()` e il
trigger `before update ... for each row execute function app.touch_updated_at()`. `clock_timestamp()` e non `now()`,
per la ragione già scritta in `0004`: `now()` è fisso per la transazione, quindi due update nella stessa transazione
confronterebbero uguali [misurato: `0004:39-40`].

⚠︎ **La scrittura passa da una funzione, non da un `UPDATE` diretto**, e la ragione è **la regola 11 del 3a**: «con la
sicurezza per riga un account chiuso nell'istante della scrittura ne tocca zero **senza errore**, e la funzione
registrerebbe un falso *salvata*» [misurato: `0016_salva_visita.sql:19-21`]. Con un compare-and-set diretto, «zero
righe toccate» ha **tre** cause e nessun modo di distinguerle: versione vecchia, cliente cancellata, account chiuso —
esattamente le tre di spec §10.2, che pretende **tre messaggi**. Una funzione che restituisce l'esito **come valore**
le distingue, ed è la forma che il 3a ha già pagato e provato.

```
public.salva_cliente(
  p_cliente   uuid,          -- l'id, generato dal client all'apertura della scheda
  p_versione  text,          -- app.versione(updated_at) letta all'apertura; null per una creazione
  p_dati      jsonb          -- nome, telefono E.164, mese, giorno, preferita, no_messages
) returns jsonb              -- { esito, versione, stato }
```

Esiti, con il messaggio di spec §10.2 accanto:

| Esito | Quando | Messaggio |
|---|---|---|
| `salvata` | la riga è stata scritta | «✓ Salvata» |
| `esiste_gia` | creazione su un `id` che c'è già | la scheda adotta lo stato letto |
| `modificata_altrove` | la versione non coincide | «È stata modificata da una collega», con **che cosa** è cambiato |
| `non_trovata` | la cliente non c'è più | «È stata cancellata», nessuna offerta di ricrearla |
| `42501` (errore) | l'account è stato chiuso mentre la scheda era aperta | l'uscita forzata del 3a (spec §4.4) |

**Le versioni si riportano verbatim**, mai attraverso un `Date` di JavaScript: i microsecondi di Postgres si troncano
e producono conflitti fantasma (spec §10.2). `app.versione()` esiste già ed è la sede unica del formato [misurato:
`0017_sposta_e_cancella.sql:46`].

**La validazione prima di chiamare** è quella di 3a §4.3 passo 2 e non si reinventa: nome non vuoto, compleanno reale
(la tabella dei giorni per mese con febbraio a 29, spec §6.2.1, e il vincolo `client_birthday_real`
[misurato: `0003:30-34`]), telefono normalizzabile in **E.164** con `libphonenumber-js`, paese di difetto **IT**. Il
telefono è normalizzato perché §9.7 offre un link a WhatsApp, che `347 1234567` non apre (spec §6.2).

**`no_messages` e `preferred_operator_id` si impostano qui**, ed è l'unico posto: un campo che registra
un'obiezione dell'interessata e non ha un modo di essere impostato è una lacuna di conformità, non un'omissione di
interfaccia (spec §6.2).

⚠︎ **Non si tocca `last_activity_at`**: lo calcolano i trigger vincolari differiti di spec §6.2.2, e il piano 2 ha
misurato che scriverlo a mano da un altro percorso lo riporta indietro di diciassette mesi sotto concorrenza — sul
valore esatto su cui la spazzata di §11.4 cancella dati personali. Il 3b lo **legge** e non lo scrive mai.

### 5.5 Creare una cliente fuori dalla scheda visita

Nella scheda visita la cliente nuova nasce **dentro** `salva_visita`, che la inserisce nella stessa transazione della
visita (`0016_salva_visita.sql:194-201` [misurato]: `id`, `full_name`, `phone`, `birth_month`, `birth_day`, e nulla
più — coerente con i tre campi di spec §8.2).

Da *Clienti* non c'è nessuna visita, quindi è `salva_cliente` con `p_versione` nulla, che qui accetta anche
`preferred_operator_id` e `no_messages` — che la scheda visita non chiede.

**Il controllo dei doppioni è lo stesso**: `public.doppioni_cliente(p_nome, p_telefono)` (Task 10, §12), stesso
telefono per sole cifre, oppure nome simile sopra la soglia [proposta: 0,4 — misurata nella revisione del piano
3a-1 su `similarity('Maria Rossi','maria rosi') = 0,769` e `similarity('Maria Rossi','Anna Neri') = 0`, ma **non**
rimisurata qui]. Senza questo controllo, una ricerca di «Maria Rossi» non trova «maria rosi», nasce una seconda
Maria sotto la pressione del telefono, la sua storia si divide, compare due volte fra i compleanni, e la spazzata
della conservazione finisce per cancellarne metà (spec §8.2).

**Una riga sull'informativa** al punto di raccolta, come nella scheda visita (spec §8.2, §11.1): senza, §11.1
afferma un obbligo che nessuna schermata adempie.

### 5.6 Elimina (D3b-8)

**Una conferma, poi non c'è più** (D15, spec §8.7, §10.4): è l'unico percorso senza ritorno, e la conferma nomina la
cliente e **quante visite** spariscono con lei.

Tecnicamente funziona già: `client → visit → appointment → appointment_slot` è definito con `on delete cascade`
apposta, perché con `no action` cancellare una visita sollevava `23503` e la promessa di spec §11.3 descriveva un
fallimento [misurato: `0004_visit_appointment.sql:24-33`; spec §12.1].

`public.cancella_cliente(p_cliente uuid) returns jsonb` → `{ esito }` con `cancellata` o `non_trovata`, per la stessa
ragione di §5.4: zero righe toccate è indistinguibile da un account chiuso.

⚠︎ **Un deadlock noto, e già dichiarato.** `delete from client` blocca `client` **prima** di `visit`, cioè
all'inverso dell'ordine dei trigger, e la spec lo registra come **obbligo già rotto da un chiamante esistente**, con
un `40P01` misurato 6 su 6 contro una cancellazione concorrente di un appuntamento (spec §12.1). Quindi «Elimina
cliente» **deve ritentare su `40P01`** come ogni altra scrittura (3a §4.3 passo 5, spec §10.5): è la stessa regola,
su un percorso che il 3b è il primo ad aprire dall'app.

**L'esportazione del suo record resta al piano 4** (spec §11.3): il pulsante **non c'è**, e la schermata **non**
mostra un pulsante disattivato che prometta una funzione che non arriva prima del piano 4. Limite dichiarato in §8.

### 5.7 «Prenota da lei» (D3b-7)

Apre il **cercaposti**, con la cliente scelta e prefissato il suo **ultimo servizio, operatrice e durata** — «il ritmo
di riprenotazione a tre settimane senza un motore di ricorrenze» (spec §9.6, §12 punto 9).

Con la cliente scelta, `preferredOperatorId` è la sua `preferred_operator_id`, e le sue proposte salgono a parità di
orario; le altre sono etichettate *«con un'altra operatrice»* (spec §8.3).

⚠︎ **«L'ultimo servizio» è la visita più recente per data, non l'ultima creata.** Una visita futura inserita oggi è
più recente di ogni visita passata: si prende l'ultima **passata o odierna**, perché il senso è «quello che le fa di
solito», non «l'ultima cosa digitata». [proposta: se non ha nessuna visita passata, il cercaposti si apre con il
servizio **non** prefissato e la cliente sì.]

⚠︎ **La durata si ricalcola**, non si copia dalla visita vecchia: `operator_service.duration_cells` se c'è, altrimenti
`service.default_duration_cells` (D3, D28, §4.2). Copiare la durata di sei mesi fa propaga un tempo che il catalogo ha
cambiato.

---

## 6. Compleanni (spec §9.7, D3b-6)

**Tre viste:** oggi, questa settimana, questo mese. Scheda dentro *Clienti* (spec §9.11).

**La finestra si costruisce come un insieme di coppie (mese, giorno)**, non con un `BETWEEN`: una coppia (mese,
giorno) **non ha un ordine** attraverso il confine di un mese o di un anno, e un `BETWEEN` è sbagliato dodici volte
l'anno e sbagliato attraverso il 31 dicembre (spec §6.2.1). Quindi si generano le coppie della finestra e si cerca
**sull'insieme**.

**La regola dell'anno bisestile e la sua iniezione.** Una cliente nata il 29 febbraio compare il **28 febbraio** negli
anni non bisestili. Poiché in un anno non bisestile l'insieme generato non contiene mai `(2, 29)`, **ogni volta che la
finestra contiene `(2, 28)` la coppia `(2, 29)` va iniettata** — nella settimana **e** nel mese. La spec registra che
la revisione 3 enunciava le due regole e le lasciava incapaci di incontrarsi (spec §6.2.1).

**Le coppie si generano in TypeScript, dalla data civile di Europe/Rome**, e si passano alla funzione. Ragione: la
data civile di Perugia è l'unica data di questo sistema (spec §5.1), e il database vive in UTC — «oggi» calcolato dal
database sarebbe il giorno sbagliato per un'ora ogni notte. Conseguenza: **queste coppie sono coperte da
`npm run test:fuso`** (`TZ=America/New_York`), che è dove questa classe di errori muore: il piano 2 ha misurato che
sostituire `getUTCDay()` con `getDay()` lascia verdi sia `UTC` sia `Europe/Rome`, e arrossisce **solo** sotto
`America/New_York` [dai findings].

**«Questa settimana» e «questo mese» sono civili** [proposta]: lunedì–domenica della settimana di Perugia, e il mese
di calendario. Ragione: «questo mese» è indiscutibilmente civile, e mescolarlo con «i prossimi sette giorni» darebbe
due nozioni di finestra nella stessa schermata. Il costo è che la domenica la vista «settimana» è quasi vuota. **Aperto
in §13:** se l'utente preferisca i prossimi sette giorni rotolanti, cambia una riga di generazione e nessun'altra cosa.

**La lettura passa da una funzione in POST**, `public.compleanni(p_coppie jsonb) returns table (...)`: un filtro
PostgREST su `birth_month`/`birth_day` metterebbe il compleanno di una persona **nella querystring**, e la
querystring finisce nei log del gateway (3a §4.8). `birth_month` e `birth_day` sono dati personali, elencati come tali
in spec §11.1.

**Che cosa mostra una riga:** nome, la data, **WhatsApp** (`https://wa.me/<E.164 senza il +>`) o **chiamata**
(`tel:`), e l'operatrice preferita se c'è. Una riga **senza telefono** mostra il nome e nessuna azione (spec §9.7).

**D3b-6 — l'opt-out.** Una cliente con `no_messages` **compare**, con un segno che dice *«non vuole messaggi»* e
**nessuna azione**: né WhatsApp né chiamata. Permette gli auguri di persona quando entra in salone, e rende
impossibile il messaggio. È più larga di spec §9.7, che dice «excluding `no_messages`»: L3b-4.

⚠︎ **Costo dichiarato di D3b-6:** la lista mostra a ogni operatrice **chi ha fatto obiezione**. Dentro un'app che tre
operatrici usano e in cui ognuna vede già ogni cliente (`client_access` è `using (app.is_active_operator())`
[misurato: `0003_client.sql:42-43`]), è una differenza piccola; va scritta perché nessuno la scopra credendola un
difetto.

⚠︎ **`wa.me` mette un numero di telefono in un URL**, e 3a §4.8 vieta i dati personali negli URL. La regola riguarda
gli URL che **l'app costruisce verso il proprio backend** — l'indirizzo della pagina e la querystring di PostgREST —,
non una destinazione esterna che l'operatrice apre deliberatamente, che è precisamente ciò che spec §9.7 chiede.
`Referrer-Policy: no-referrer` (3a §4.9) impedisce che l'indirizzo della pagina corrente viaggi con il salto. È
L3b-3, ed è una lettura: se la revisione la respinge, resta solo `tel:`, e con essa un'app che non fa gli auguri —
cioè una schermata che la spec descrive e che non serve a niente.

---

## 7. L'annuncio quando cambia una cliente (D3b-9)

Il 3a aggiorna l'agenda da sola con la tabella `annuncio`, consegnata dal **Task 8** (in volo, §12): `id`, `giorni
date[]`, `creato`, con `check (cardinality(giorni) > 0)`, sola-lettura per le operatrici attive, dentro la
pubblicazione `supabase_realtime` limitata agli **inserimenti**, e un trigger **per istruzione** che manda **solo
date** — nessun nome, nessun telefono, nessun `id` di cliente [misurato: `supabase/migrations/0019_annunci.sql`].

**D3b-9:** quando cambia una cliente, un trigger annuncia **i giorni delle sue visite**. Il blocco in agenda mostra
il nome (D3-4), quindi è lì che un nome vecchio fa danno vero: una collega che telefona a «Maria Rosi» perché
l'agenda porta ancora il nome sbagliato. La pagina *Clienti* **non** si aggiorna da sola: si ricarica al ritorno in
primo piano e ogni 60 s, come ogni altra pagina (3a §4.6).

Ragione per cui non si aggiunge una colonna: `annuncio` è appena stata consegnata, e una riga di `annuncio` **non
contiene nessun identificativo di persona** — è scritto come garanzia nella migrazione, e mandare `id` di clienti sul
canale la ritirerebbe.

⚠︎ **Il vincolo di non-vuoto è una trappola, e va gestita nel trigger.** Una cliente **senza visite** produce un
array vuoto, e `annuncio_giorni_non_vuoto` **rifiuta l'inserimento con `23514`** [misurato: `0019_annunci.sql:27`] —
cioè la modifica della cliente **fallirebbe** per colpa dell'annuncio. Il trigger deve quindi **non inserire nulla**
quando l'array è vuoto, ed è il caso comune per una cliente appena creata. Questa è la riga che il piano deve
presidiare con una prova, e la sonda di mutazione è togliere la guardia sul vuoto: la prova «una cliente senza visite
si può modificare» deve arrossire.

**Su che cosa scatta:** UPDATE di `client`, e **solo** se cambia qualcosa che l'agenda mostra o che serve per
telefonare — `full_name`, `phone` [proposta]. Un cambio di `no_messages` o di `preferred_operator_id` non tocca
nessun blocco: annunciarlo farebbe ricaricare tre agende per niente. `is distinct from` nel corpo della funzione, che
è la strada scelta dal Task 4 del 3a-1 fra le due possibili [misurato: 3a §4.7].

**Per istruzione, `security definer`, proprietaria `postgres`, `search_path = ''`**: come i trigger del Task 8, e per
la stessa ragione — la tabella non è scrivibile da `authenticated`, ed è questo che impedisce a un telefono di
fabbricare annunci.

⚠︎ **La cancellazione di una cliente** (§5.6) cancella in cascata le sue visite e i suoi appuntamenti, e i trigger del
Task 8 su `appointment`/`visit` annunciano già quei giorni: il trigger del 3b **non** aggiunge niente sul percorso di
DELETE. [da misurare] che la cascata li faccia davvero scattare: sono trigger per istruzione con tabelle di
transizione, e una cancellazione in cascata è un'istruzione generata dal sistema — se non scattassero, l'agenda di una
collega mostrerebbe fino a un minuto le visite di una cliente cancellata. Il piano lo misura **prima** di dichiarare
chiuso questo paragrafo.

---

## 8. Limiti dichiarati del 3b

Non producono un dato sbagliato su un percorso raggiungibile; sono scritti perché nessuno li scopra credendo di aver
trovato un buco nuovo.

1. **Il cercaposti propone solo visite a operatrice unica.** `cercaPosti` calcola **una** campata contigua per **una**
   operatrice (§4.2): una visita in cui il semipermanente lo fa Vera e la ceretta Alessandra non è proponibile, anche
   se `appointment` la sostiene (ogni appuntamento ha il suo `operator_id` [misurato: `0004:13`]). Si compone
   dall'agenda, toccando due celle. Spec §8.1 e D23 descrivono la visita a più servizi senza dire che l'operatrice
   sia una; qui si dichiara che il cercaposti assume che lo sia (L3b-1).
2. **Un posto che esiste solo alle 09:05 non è nella lista principale** (D3b-1): c'è solo aprendo «tutti gli orari»
   di quel giorno.
3. **La ricerca delle clienti si ferma a 20** e non pagina (§5.2): la schermata lo dice, la funzione non lo risolve.
4. **La pagina Clienti non è in diretta** (D3b-9).
5. **La paginazione del cercaposti non è un lucchetto** (§4.3).
6. **L'esportazione del record di una cliente non c'è** fino al piano 4 (§5.6), che viene **dopo** il primo uso vero
   (D19). Una richiesta di accesso o portabilità, in quella finestra, si serve a mano dalla dashboard di Supabase. **È
   il limite più serio di questo elenco**, perché è l'unico che riguarda un diritto dell'interessata e non una
   comodità dell'operatrice.
7. **Oltre il primo mese il cercaposti può rispondere «assente» su giorni la cui disponibilità non è ancora stata
   inserita**, e non sa distinguerlo da un'assenza vera (§4.6).
8. **Fra la prima e la seconda vista di una lista di compleanni** una collega può impostare `no_messages`: la riga
   resta con le sue azioni fino alla ricarica. Danno: un augurio mandato a chi lo ha appena rifiutato, entro un
   minuto.

---

## 9. Prove

La forma è quella di 3a §8: ogni prova con la sua **sonda di mutazione** e **dati non degeneri** — la lezione più
costosa del piano 2, dove 31 mutanti su 123 sono sopravvissuti perché le prove avevano le pause a zero, gli elenchi di
esclusione vuoti e le tabelle non seminate [dai findings].

⚠︎ **Le fixture devono creare più di un'operatrice, più di un servizio e più di un giorno**, con **durate diverse per
operatrice**: con una sola combinazione, ogni predicato di §4.2 è dichiarato e mai esercitato.

### 9.1 Logica pura (Vitest, `tests/dominio/`)

- **Durate per operatrice** (§4.2): due operatrici con durate diverse per lo stesso servizio, e la prova che le
  partenze proposte per ciascuna rispettano **la sua** campata. Mutazione: usare le durate della prima per tutte.
- **Passo** (§4.4): con `passoCelle: 3` nessuna partenza fuori quarto d'ora; con `1` tornano tutte; l'**ancoraggio a
  mezzanotte** provato su una fascia che comincia a cella 110 (09:10), dove la prima partenza deve essere 09:15 e
  **non** 09:10. Mutazione: ancorare all'inizio della fascia — la prova sulla cella 110 deve arrossire.
- ⚠︎ **Il passo filtra prima del troncamento** (§4.4): un giorno con molte partenze e `limit` piccolo deve dare
  `limit` righe **tutte a passo**, non due. Mutazione: filtrare dopo il troncamento. Senza questa prova, D3b-1 è
  dichiarata e indifesa — ed è il difetto che la decisione dell'utente nasconde più facilmente.
- **Cursore** (§4.3): due pagine consecutive che non si sovrappongono e non saltano; `prossimo` nullo sull'ultima
  pagina; `prossimo` **non** nullo quando arrivano esattamente `limit` righe e ce n'è una in più; il cursore
  **rifiutato** se l'impronta della richiesta cambia. Mutazione: dedurre «c'è ancora» da `rows.length === limit`.
- ⚠︎ **Cursore attraverso il confine dentro/fuori orario** (§4.3, §4.5): una pagina che finisce sull'ultima riga
  **dentro** orario, e la successiva che comincia dalla prima **fuori** — con almeno un giorno **successivo** che ha
  righe dentro orario, che è il caso in cui un cursore a tre campi riparte dall'inizio. Mutazione: togliere
  `fuoriOrario` dal cursore. **Senza questa prova il difetto trovato nell'autocontrollo può tornare**, ed è quello che
  la suite lascerebbe passare con la firma nuova.
- **Fuori orario** (§4.5): un giorno `salon_closed` che con l'interruttore dà partenze dentro 08:00–20:00 e nessuna
  fuori; un giorno `'open'` con partenze **fuori** orario prima dell'apertura, **segnate** come tali; l'occupazione
  che continua a bloccare anche fuori orario; le righe dentro orario **tutte prima** delle fuori. Mutazione: dedurre
  il segno «fuori» dal `dayStatus` invece che dall'appartenenza alle fasce — la prova sul giorno `'open'` deve
  arrossire.
- **Motivi** (§4.7): tre operatrici con tre motivi diversi nella stessa richiesta, ciascuna nominata; `motivi` vuota
  quando `rows` non è vuota; l'**ordine dentro l'operatrice** esercitato con una sola operatrice che colleziona `full`
  in un giorno e `service_too_long` in un altro. Mutazione: scambiare `full` e `service_too_long` in
  `PRECEDENZA_MOTIVI` — quest'ultima prova deve arrossire, ed è ciò che chiude `PRECEDENZA-MOTIVI`.
- **Contorno** (§4.8): `limit: 0`, `days: 0`, operatrice duplicata → `RangeError` ciascuno. Tre prove, tre mutazioni
  (togliere una guardia per volta).
- **`SEGUENTE-VICINO`** (D3b-10): un caso con **due blocchi dopo** la partenza e **due prima**, pause non nulle e
  diverse, dove scegliere il più lontano cambia l'esito. Mutazioni: `<` → `>` su `seguente` (`proposte.ts:141`) **e**
  su `precedente` (`:138`) — entrambe devono arrossire, che è ciò che chiude il gemello invece di spostarlo.
- **Compleanni** (§6): le coppie di «oggi», «settimana» e «mese»; l'iniezione di `(2, 29)` quando la finestra contiene
  `(2, 28)` in un anno **non** bisestile, e la sua **assenza** in uno bisestile; la settimana a cavallo del 31
  dicembre; il mese di febbraio. Mutazioni: togliere l'iniezione; generare con un `BETWEEN`.
- **Telefono:** `347 1234567` e `+39 347 1234567` → lo stesso E.164 (già in 3a §8.1; qui l'ingresso è un'altra
  schermata).
- ⚠︎ **Sotto `npm run test:fuso`** (`TZ=America/New_York`): le coppie dei compleanni e il `today`/`nowCell` del
  cercaposti. È il banco che ha ucciso l'unico mutante che `UTC` e `Europe/Rome` lasciavano vivo [dai findings].

### 9.2 Database (Vitest su Supabase locale, con sessioni vere)

Con l'imbracatura delle sessioni vere del Task 2 del 3a-1. ⚠︎ **Mai `psql`**: su questo progetto una misura presa da
proprietario scavalca la sicurezza per riga, e le viste che la applicano rispondono zero righe in silenzio.

- **`salva_cliente`**: creazione; modifica con la versione giusta; `modificata_altrove` con la versione vecchia;
  `non_trovata` su una cliente cancellata; `esiste_gia` su un `id` esistente; **account disattivato a metà** →
  l'esito **non** è `salvata`; `preferred_operator_id` e `no_messages` scritti; `last_activity_at` **non** toccata.
- **Il trigger `updated_at`**: cambia a ogni update; **non** cambia su un update che non cambia nulla [da misurare: il
  trigger è `before update for each row` e scatta anche su un update senza differenze — se è così, è un fatto da
  scrivere, non da nascondere]; due update nella stessa transazione danno versioni **diverse** (è la ragione di
  `clock_timestamp()`).
- **`cancella_cliente`**: cascata fino a `appointment_slot`; `non_trovata` la seconda volta; **`40P01` ricevuto dal
  percorso** contro una cancellazione concorrente di un appuntamento della stessa visita, che spec §12.1 misura 6 su 6
  — e il ritentativo che lo assorbe.
- **`compleanni`**: la finestra sull'insieme; `no_messages` **incluso** con il suo segno (D3b-6), non escluso; una
  cliente senza telefono; nessun dato personale nella querystring (prova statica, §9.4).
- **Il trigger d'annuncio** (§7): una cliente **con** visite produce un annuncio con i suoi giorni; una cliente
  **senza** visite si può modificare e **non** produce annuncio; un cambio di `no_messages` non produce annuncio.
  Mutazione: togliere la guardia sul vuoto → la prova «una cliente senza visite si può modificare» arrossisce con
  `23514`.
- **Permessi delle funzioni nuove**: `revoke execute ... from public, anon` **e poi** `grant ... to authenticated`.
  ⚠︎ Su Supabase `anon` e `authenticated` hanno `EXECUTE` su ogni funzione nuova per difetto: **il grant è
  ridondante, il revoke è la riga che conta**. E i findings registrano che **nessun presidio di catalogo copre i
  permessi delle funzioni**, solo quelli delle tabelle: una funzione nuova che dimentica la revoca non la coglie
  nessuno. Il 3b aggiunge tre funzioni e **deve** estendere l'audit di catalogo del Task 9, o dichiarare di non
  averlo fatto.
- **`cerca_clienti` e `doppioni_cliente`**: **non** sono del 3b (Task 10, §12). Il 3b non riscrive le loro prove.

### 9.3 Da capo a fondo (Playwright)

**Prova 2 di spec §13.4** — prenotare una visita a **due servizi** dal cercaposti: scelta dei due servizi, la lista a
passo di 15′, il tocco di una proposta, la scheda che si apre piena, il salvataggio, e i due appuntamenti contigui con
la pausa fra loro. ⚠︎ I due servizi devono essere eseguiti **dalla stessa operatrice** (limite 1 di §8), e con durate
prese dalla **sua** riga di `operator_service`.

[proposta] Due altre, piccole, perché sono i percorsi che nessuna prova unitaria vede interi: trovare una cliente
dalla ricerca, correggerle il telefono, e vedere l'agenda di un altro telefono aggiornarsi (§7); aprire i compleanni e
vedere che la riga con l'opt-out non ha pulsanti.

### 9.4 Prova statica

Estende quella di 3a §4.8 alle schermate nuove: nessun filtro su una **colonna di dati personali** di `client`
(`full_name`, `phone`, `birth_month`, `birth_day`) in una richiesta GET; nessun filtro concatenato dopo `.rpc(...)`;
nessun `rpc(..., { get: true })`; nessun `.or()` né `.textSearch()` su `client`; nessun dato personale
nell'indirizzo di una pagina. ⚠︎ Vedi **L3b-2**: la regola va enunciata **per colonna**, non per tabella, o colpisce
gli update per `id` che §5.4 usa.

### 9.5 Che cosa le prove non coprono

- La leggibilità della lista a 375 punti con tre operatrici e le etichette «fuori orario»: si guarda, non si prova.
- Il comportamento sul progetto ospitato (latenza vera del canale, consegna degli annunci).
- Il ritmo reale delle collisioni fra due operatrici sulla stessa cliente, che è il fatto su cui D3b-5 scommette.

---

## 10. Le schermate: misure

**Solo telefoni, in verticale, 375–430 punti** (D3-3). Nessun desktop. Controlli di almeno **44 punti** (3a §7).

**Colori** (spec §9.12, 3a §6.2, tutti [misurato] lì): powder pink `#FDEDF0` di fondo; **brand pink `#F3A4BA` è a
1,71 sul fondo e non può portare selezioni né bordi**; **deep rose `#C2185B`** a 5,19 fa quel lavoro; ink `#140D18` a
16,8 per il testo. I colori delle operatrici sono quelli di D3-6, con il bordo in inchiostro per Annalisa, che da sola
è a 1,13.

**Carattere:** **Manrope** con **cifre tabulari** per tutto ciò che è denso — e qui è denso soprattutto una colonna
di orari, che senza cifre tabulari non incolonna. **Cinzel** solo per i titoli di schermata e il marchio: è un
carattere da insegna, illeggibile a densità d'agenda (D3-5, L3).

**Cercaposti.** Intestazione con il titolo e i servizi scelti (modificabili con un tocco); interruttore «anche fuori
orario»; lista con **intestazione di giorno appiccicosa** (che è anche il tocco per «tutti gli orari» di quel giorno);
la riga porta **l'ora grossa**, il nome dell'operatrice con il suo colore, e *«con un'altra operatrice»* quando non è
la preferita; sotto le proposte dentro orario, l'intestazione «Fuori orario» e le sue righe, ciascuna con il suo
motivo; in fondo «Mostra altri» (cursore) e, all'esaurirsi, «Cerca nelle prossime 4 settimane» fino al tetto.

**Clienti.** Ricerca in testa; l'elenco alfabetico con iniziale appiccicosa; la riga porta nome e telefono. La scheda
è una pagina intera, come la scheda visita (L5): dati, «prenota da lei» in evidenza, visite future, visite passate,
«Modifica» e «Elimina» in fondo — **l'azione senza ritorno sta più lontano dal pollice**.

**Compleanni.** Scheda dentro Clienti con tre segmenti (oggi · settimana · mese); la riga porta nome, data, e i due
pulsanti d'azione; la riga con l'opt-out porta il segno al posto dei pulsanti (D3b-6).

**Le parti vive stanno fuori** (D3-2): niente animazioni dentro la lista dei risultati, che si legge col telefono
all'orecchio.

---

## 11. Letture dichiarate della spec

Dove questo documento ha interpretato una frase che ammetteva due letture.

- **L3b-1 — spec §8.1/§8.3 «choose the service or services»**, con D23 (visita a più servizi). Letto come: i servizi
  di una visita **proposta dal cercaposti** li esegue **una sola** operatrice. Il modello sosterrebbe due (§8, limite
  1); la firma del motore no, e il 3b non la piega.
- **L3b-2 — 3a §4.8 «ogni filtro sui dati delle clienti passa da una funzione chiamata in POST»**, con la prova
  statica che cerca «filtri su `from('client')`». Letto **per colonna**, non per tabella: vietati i filtri su
  `full_name`, `phone`, `birth_month`, `birth_day`; ammessi quelli su `id` e `updated_at`, che sono uno pseudonimo
  casuale e un orario. Senza questa lettura, l'`UPDATE` per `id` di §5.4 e la lettura delle visite per `client_id` di
  §5.3 sarebbero vietati, e la schermata Clienti non si potrebbe costruire. È la stessa lettura che 3a §4.9 fa già,
  quando lascia in `localStorage` gli `id` di visita e cliente chiamandoli «pseudonimi e non anonimi».
- **L3b-3 — spec §9.7 «Each row offers WhatsApp or a call»**, contro 3a §4.8 «nessun dato personale in un URL». Letto
  come: il divieto riguarda gli URL che l'app costruisce verso il proprio backend, non una destinazione esterna
  aperta deliberatamente dall'operatrice (§6).
- **L3b-4 — spec §9.7 «excluding `no_messages`»**. Letto come: escluse dalle **azioni**, non dall'elenco (D3b-6).
- **L3b-5 — spec §9.6 «Edit, delete, and export this client's record all live here»**, contro spec §11.3, che mette
  tutti e tre fra i diritti dell'interessata, cioè nel piano 4. Letto come: modifica ed eliminazione nel 3b,
  esportazione nel piano 4 (D3b-8).
- **L3b-6 — spec §9.6 «prefilled with her last service»**. Letto come: l'ultima visita **passata o odierna**, non
  l'ultima creata (§5.7).
- **L3b-7 — spec §8.3 «paged, with … an option to extend»**. Letto come due cose distinte: la paginazione dentro
  l'orizzonte (§4.3) e l'estensione dell'orizzonte (§4.6), che **azzera** la paginazione.
- **L3b-8 — spec §9.6 «upcoming and past visits»**. Letto come: non «trattamenti ricevuti». Spec §12 punto 3 dice
  che senza stati un appuntamento mantenuto e uno mancato sono identici (§5.3).

---

## 12. Dipendenze non ancora consegnate

Nessuna di queste esisteva quando questo documento è stato scritto. Per ciascuna: l'assunzione, e **il costo se
l'assunzione è sbagliata**.

| Dipendenza | Chi la consegna | Assunzione del 3b | Costo se è sbagliata |
|---|---|---|---|
| `public.cerca_clienti(text)` | Task 10 del 3a-1 | esiste, `security invoker`, in POST, `limit 20` interno, accento- e maiuscole-insensibile, con la somiglianza di `pg_trgm` | §5.2 va riscritta. Se la forma cambia (per esempio arriva con un `offset`), l'avviso «prime 20» diventa superfluo: **costo basso** |
| `public.doppioni_cliente(text, text)` | Task 10 | esiste, telefono per sole cifre, nome sopra **0,4** [proposta, misurata **là** e non qui] | se la soglia misurata diverge, cambia solo quante candidate si mostrano: **costo basso**. Se la funzione non arrivasse, §5.5 perde il controllo dei doppioni e spec §8.2 non è adempiuta: **costo alto** |
| `pg_trgm` in schema `extensions` | Task 10 | installata, riferimenti qualificati (`extensions.similarity`, `OPERATOR(extensions.%)`) | **costo basso**: è una riga di migrazione |
| `public.annuncio` e i suoi trigger | Task 8 del 3a-1, **in esecuzione** | esiste con `giorni date[]`, `check (cardinality(giorni) > 0)`, solo INSERT nella pubblicazione, trigger per istruzione su `appointment` e `visit` | se il vincolo di non-vuoto cadesse, la guardia di §7 diventa superflua ma innocua. Se `giorni` cambiasse nome o forma, §7 va riscritta: **costo medio**. Se il Task 8 aggiungesse una colonna, D3b-9 va **ridiscussa** con l'utente |
| Guscio, navigazione a quattro voci, accesso, involucro degli errori delle Server Actions, ricariche di ripiego | **piano 3a-2**, in scrittura adesso | esistono e **non si ridefiniscono**: il 3b riempie tre pagine dentro quel guscio | se il 3a-2 scegliesse un'altra forma di involucro o di navigazione, cambia il contorno delle tre schermate, non la loro sostanza: **costo medio**, e si paga con una revisione del piano 3b prima dell'esecuzione |
| La **prova statica** sugli URL | piano 3a-2 | è enunciata **per colonna** (L3b-2) | se fosse enunciata per tabella, colpisce l'`UPDATE` per `id` di §5.4 e va corretta **prima** che il 3b passi il gate: **costo medio**, ed è la dipendenza più facile da non vedere |
| Colori delle operatrici di D3-6 nel database | Task 10 | ci sono, e §10 li usa | **costo nullo** per il 3b: sono valori, non forme |
| Numeri di migrazione **0022** e successivi | — | `0020` e `0021` sono **rivendicati dal piano 3a-1** e non esistono ancora sul disco [misurato: `ls supabase/migrations/` si ferma a `0019`, e il piano 3a-1 nomina `0020_revoca_move_visit.sql` e `0021_ricerca_e_colori.sql`] | ⚠︎ Le chat che scrivono **3c** e **piano 4** potrebbero rivendicare `0022` mentre questo documento esiste. Il numero si **assegna all'apertura del piano 3b**, guardando il disco **e** i piani esistenti — «libero» vuol dire libero su entrambi. Un numero doppio è un `db reset` che fallisce, o una migrazione che il CLI salta in silenzio: **costo alto, probabilità reale** |

---

## 13. Aperto, da decidere o misurare nel piano

- **Il nome della migrazione e il suo numero** (§12), da assegnare guardando disco e piani.
- **Dimensione della pagina del cercaposti: 20** [proposta]; e della lista clienti: **50** [proposta]. Si misurano
  sulla cardinalità vera dei dati di prova e su una bozza a 375 punti.
- **La cardinalità vera della lista** a passo 15′ su 28 giorni con tre operatrici [da misurare]: da essa dipende se
  la paginazione serva davvero, o se una lista intera scorribile sia più semplice.
- **«Questa settimana» civile o rotolante** (§6): [proposta] civile; è una riga di generazione, e la decisione è
  dell'utente se la vista della domenica gli dà fastidio.
- **Un'offerta o due** nello stato vuoto (§4.7), su una bozza a 375 punti.
- **Su che cosa scatta l'annuncio della cliente** (§7): [proposta] `full_name` e `phone`.
- **Se la cascata di `delete from client` faccia scattare i trigger per istruzione del Task 8** (§7) [da misurare]:
  se non scattasse, serve una riga nel trigger del 3b.
- **Se un `before update` senza differenze cambi `updated_at`** (§9.2) [da misurare]: cambia una prova, e il fatto va
  scritto in un verso o nell'altro.
- **Se un testo misto di cifre e lettere dia un ordine controintuitivo** in `cerca_clienti` (§5.2) [da misurare]: se
  sì, è un reperto del Task 10.
- **Se `client_name_search` vada eliminato** (§5.2): indice non più usato dalla ricerca nuova.
- **L'estensione dell'audit di catalogo** alle tre funzioni nuove (§9.2), o la dichiarazione di non averlo fatto.
- **Se «Elimina cliente» debba mostrare quali visite future spariscono**, per nome e ora, o solo quante (§5.6): è la
  differenza fra una conferma che informa e una che conta.

---

## 14. Divergenze fra spec e realtà trovate e **non** corrette

Trovate scrivendo questo documento. Non sono state corrette nei documenti d'origine, perché quattro chat scrivevano
insieme e la spec 3a poteva cambiare sotto le mani.

1. **spec §9.6 mette nella schermata Clienti tre cose di cui due appartengono a spec §11.3**, cioè al piano 4, che
   viene **dopo** il primo uso vero (D19). Risolto da D3b-8 per la cancellazione; l'esportazione resta un limite
   dichiarato (§8, limite 6). **La spec originale non dice che il piano 4 arriva dopo il primo uso**: lo dice la
   divisione dei piani del 3a, e nessuno dei due documenti nota la conseguenza.
2. **3a §4.8 e la sua prova statica sono enunciate per tabella** («filtri su `from('client')`»), e la modifica di una
   cliente richiede un filtro su `id`. Vedi L3b-2. Da precisare **nel 3a**, non qui.
3. **`IngressoCercaposti` porta una sola `durations` per più operatrici**, mentre `operator_service.duration_cells` è
   per coppia (§4.2). Non è un difetto del piano 2 — nessun chiamante esisteva —, ma **nessun documento lo nota**, e la
   firma sembra completa.
4. **`cerca_clienti` tronca a 20 senza dirlo** (§5.2). Il piano 3a-1 lo scrive nella migrazione e non lo tratta come
   un fatto che una schermata deve comunicare.
5. **`annuncio_giorni_non_vuoto` fa fallire il chiamante** invece di far saltare l'annuncio (§7): per il Task 8 va
   bene, perché un'istruzione su `appointment` tocca sempre almeno un giorno; per la cliente senza visite no.
6. **`client_name_search` indicizza senza `lower`**, la ricerca del Task 10 confronta con `lower` (§5.2).
7. **`ORIZZONTE_GIORNI = 28` è una costante del dominio**, ma D3b-3 porta `days` fino a 84: la costante resta come
   valore di difetto e **non** come limite, e il nome non lo dice. Da rinominare, o da commentare.

---

## 15. Dove si ferma la revisione di questo documento

**Questo documento non è stato rivisto.** È la prima stesura, e va in revisione avversariale con più agenti
indipendenti su Opus, a lenti distinte — è così che la spec 3a è arrivata a reggere: sette giri, ventuno revisori, e
**ogni giro ha trovato la maggior parte dei suoi difetti nelle correzioni del giro prima**.

**Il criterio di arresto proposto**, lo stesso del 3a: si ferma quando due giri di fila non trovano bloccanti, le
decisioni sono ferme da almeno due giri, e i reperti residui sono **solo** cose che si chiudono con una migrazione
eseguita o con una misura. Un reperto blocca **solo se fa danno vero su un percorso raggiungibile**.

**Dove questo documento è più debole**, detto perché è l'elenco più produttivo quando arriva la revisione:

1. **Nessun numero è misurato per esecuzione.** La cardinalità della lista (§4.3, §13), la soglia di somiglianza
   (§5.5), le dimensioni di pagina: tutto [proposta] o [da misurare]. Un revisore che *può* misurare ne chiuda quanti
   riesce.
2. **La firma estesa di `cercaPosti` cresce di cinque campi in un colpo** (§4.2–§4.7): `operatori`, `passoCelle`,
   `cursore`, `fuoriOrario`, e `motivi` in uscita. Cinque estensioni scritte insieme da chi non le ha compilate sono
   il posto dove aspettarsi un'incoerenza, e **l'autocontrollo ne ha già trovata una**: §4.3 enumerava quattro criteri
   d'ordine e §4.5 ne aggiungeva un quinto **davanti** a tutti senza tornare a correggere §4.3, quindi il cursore era
   a tre campi dove ne servono quattro. È corretto in §4.3, **ed è esattamente il tipo di difetto da cercare
   ancora**: se ne è trovato uno rileggendo, la probabilità che sia l'unico è bassa. Da guardare per prime le due
   coppie che interagiscono: **cursore e passo** (il cursore riprende da una riga che il passo ha tenuto) e **cursore e
   fuori orario** (le due chiamate a `proposeStarts` producono righe che finiscono nello stesso ordinamento).
3. **Le due chiamate a `proposeStarts` di §4.5** sono descritte a parole e non in una tabella di casi. Un giorno
   parzialmente chiuso, con occupazione, con l'operatrice assente per eccezione ma il salone aperto: quale delle due
   chiamate produce che cosa, e come si marca ogni riga. La spec 3a ha imparato che in questa classe di problemi **una
   tabella completa dei casi chiude più di due giri di lettura**.
4. **Il confine con il 3a-2 è assunto e non verificato** (§12): un'altra chat lo sta scrivendo adesso.
5. **L'annuncio (§7) poggia su una tabella in volo** e su un comportamento dei trigger per istruzione sotto cascata
   che nessuno ha misurato.
6. **§6 non dice che cosa succede a una cliente nata il 29 febbraio nella vista «oggi» del 28 febbraio di un anno
   bisestile**: l'iniezione è condizionata all'anno non bisestile, quindi il 28 febbraio bisestile non la inietta e
   lei compare il 29 — che è giusto, ma il documento non lo scrive, e un revisore che legge veloce chiamerà bloccante
   una cosa corretta.
7. **La visita a due mani** (§8, limite 1) è dichiarata fuori portata con un argomento tecnico. Se l'utente la
   volesse, il rimedio non è piccolo, e questo documento non lo dimensiona.
