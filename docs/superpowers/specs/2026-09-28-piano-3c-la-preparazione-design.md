# Piano 3c — La preparazione: documento di design

**Data:** 28 settembre 2026
**Revisione:** 6 — dopo il **quarto giro avversariale**, cinque revisori, **29 bloccanti**, e ⚠︎ **un revisore
autorizzato a RIMISURARE su un banco proprio**. Esito: i quattro numeri dell'appendice D **confermati alla cifra**,
ma il reperto `{NULL}` **per metà un artefatto del banco**; e la decisione sui colori tornata all'utente per la
**quarta** volta, con la lettura C **esclusa da tre prove indipendenti**. Registro nell'**appendice E**.
**Revisione 5** — le sei misure di §14.1 ESEGUITE su un banco usa-e-getta (Postgres 17.6 in un
contenitore a sé, porta 55432, **mai il database del progetto**), il 28/09 fra le 14:05 e le 14:25. Registro e
numeri nell'**appendice D**. Tre di esse smentiscono il documento, **due smentiscono anche i revisori**, e una ha
trovato un reperto che tre giri di lettura non avevano visto.
**Revisione 4** — dopo il **terzo giro avversariale, cinque revisori su Opus** con mandati ancora diversi (le
correzioni della rev. 3; §6 terza forma e §9.12; **l'esecuzione simulata** di §9 invece dell'audit; *«le correzioni
sono giuste, o hai corretto troppo?»*; coerenza interna e rimandi). Esito: **29 bloccanti**, e un verdetto che conta
più dei numeri — vedi §16. Registro nell'**appendice C**.
**Revisioni precedenti:** 3 (dopo il secondo giro, ~30 bloccanti: §6 ritirata, §9 rifatta, tre decisioni corrette);
2 (dopo il primo giro, 21 bloccanti); 1 (prima stesura).

⚠︎ **Le revisioni 1, 2 e 3 sono state riscritte SUL POSTO, su un file non committato: non sono più verificabili.**
Ogni tesi di questo documento su «che cosa diceva la revisione N» è, da oggi, **non controllabile da un revisore**.
Copia della revisione 3 conservata fuori dal repo il **28/09 alle 13:51**
(`scratchpad/spec-3c-revisioni/rev3-20260928-1351.md`, sha256 in quel file). **Da qui in avanti ogni revisione si
archivia prima di essere sovrascritta**, e si cita con **revisione e orario**, non con «la revisione prima».

**Stato:** revisione 4 scritta; **non rivista**; non committata.
**Spec di riferimento:** `docs/superpowers/specs/2026-09-17-salon-scheduler-design.md`, revisione 5 (in inglese).
**Spec del piano 3a:** `.../2026-09-22-piano-3a-il-giorno-design.md`, revisione 20.
**Base di codice:** `a63b996` [misurato, `git rev-parse`, 28/09 ore 13:51]. ⚠︎ Il repo si muove sotto il documento:
la rev. 2 dichiarava `ee2a679` ed era già due commit indietro, la rev. 3 dichiarava `86d4223`.

Convenzioni: «**spec §N**» = spec originale; «**3a §N**», «**3b §N**», «**3a-2 CN**», «**piano 4 §N**»; «**§N**» =
sezione di questo documento.

| Marca | Significato |
|---|---|
| **[misurato]** | verificato da chi scrive su un file o un comando di sola lettura, con la sede |
| **[dalla revisione]** | misurato da un revisore ⚠︎ **e ricontrollato**: §15 voce 16 |
| **[dalla spec]** | affermazione della spec originale o della spec 3a, riportata |
| **[proposta]** | scelta o numero che il piano misura o conferma |
| **[da misurare]** | fatto non stabilito da nessuno |

⚠︎ **Nessuna affermazione sul progetto ospitato o su Vercel è [misurato].**

⚠︎ **Tre regole di citazione, una per giro.**
1. **Un numero di riga marcisce** (§15 voce 11): le migrazioni si citano **per nome**; `config.toml` per **chiave,
   riga e valore atteso**. Verificata pulita al secondo e al terzo giro, nove citazioni su nove.
2. **Una citazione si tronca solo dove non cambia il soggetto della misura** (§15 voce 15). Verificate 22 citazioni
   verbatim al terzo giro: **tutte fedeli**.
3. ⚠︎ **Ogni affermazione su un file in volo si ancora a un COMMIT, non a un `mtime`**, e porta l'ora della lettura.
   Al terzo giro questa regola ha salvato una misura in diretta: §6.1 dichiara «sei trigger» ed è vero al commit,
   mentre nell'albero di lavoro un'altra chat ne aveva appena tolto uno.

---

## 0. Che cosa è stato letto

| Documento | Che cosa se n'è preso |
|---|---|
| spec originale (rev. 5) | §1.1, §3, §4.1, §4.2–§4.5, §5.1, §6.1, §6.5, §6.6, §7.1, §7.6, §8.4, §9.1, §9.8–§9.12, §11.1, §11.5, §12 (tutti e dodici), §13.2, §13.4, §14 |
| spec 3a (rev. 20) | §1, §2, §3.3, **§4.1** ⚠︎ *aggiunta alla rev. 4*, §4.2, §4.3, §4.6, §4.7, §4.8, §4.9, §6.2, §8.5, §8.6, §8.7, §9, §10, §11 |
| spec 3b (`0eac788`, 28/09 ore 10:58) | §5.2 (`cerca_clienti`), §7 (D3b-9), §10, §12 |
| piano 3a-2 | contratti **C1–C5**; tutti e dodici i task **scritti**, nessuno implementato |
| piano 4 | §1.3, §6.3.3, §7.3, §7.5, §7.6 (D4-6), **§11 e §12.1** ⚠︎ *aggiunte alla rev. 4: contengono le richieste AL 3c* |
| `supabase/config.toml` | le nove chiavi di §9, per nome, riga e valore atteso |
| `supabase/migrations/` | `0001`–`0019` **e `00051_privilege_baseline.sql`** ⚠︎ *che le rev. 1–3 citavano tre volte senza dichiararlo*; `supabase/rientro/0014` |
| `src/dominio/fasce.ts`, `src/dominio/cercaposti.ts` | `risolviGiorno`; `ORIZZONTE_GIORNI = 28` |
| `tests/schema/chiusura-sessioni.test.ts`, `tests/schema/write-functions.test.ts` | la prova che scrive `#123456`; l'unica prova su `write_exception_days` |
| `supabase/seed.sql`, `README.md` | per intero |

⚠︎ **La lezione dei tre giri su questa sezione.** Tutte le marche `[misurato]` false trovate in tre giri — tre su 76
al secondo, **zero su 64 al terzo** — riguardavano l'**esistenza o il contenuto di altri documenti**, e si
chiudevano con un `ls`. E i tre bloccanti più gravi del terzo giro nascono dallo stesso posto: **3a §4.1** e **piano
4 §12.1** non erano nell'elenco, e contenevano rispettivamente la divergenza dei colori e le richieste rivolte a
questo documento. **Il confine di lettura è il difetto ricorrente di questa spec.**

---

## 1. Il perimetro del 3c

### 1.1 Perché il 3c è l'ultimo cancello

3a §1: «**D19 resta: il salone non usa l'app prima della fine del 3c.**» §9 è la procedura che apre il salone: si
esegue a mano, e — misurato dal terzo giro — **non in una giornata sola**: vedi §9.13.

### 1.2 Dentro

Disponibilità e restringimento (§3) · Impostazioni (§4) · Primo avvio (§5) · L'annuncio (§6) · Ritentativi e
politica d'errore (§7) · «Telefono perso» (§8) · Verifiche prima del rilascio (§9) · Prove 6 e 8 (§10).

### 1.3 Fuori, e dove si rimanda

| Non è del 3c | Di chi è | Che cosa fa il 3c |
|---|---|---|
| Agenda, scheda visita, scrittura delle visite | 3a | legge |
| Guscio, involucro degli errori, Server Actions, ritentativi | 3a-2 (C1–C5) | consuma; §11 dice che cosa gli chiede |
| Cercaposti, clienti, compleanni, il «+» flottante | 3b | `public.cerca_clienti` in POST è **la sede delle letture delle clienti** (3b §5.2); §3.5 la cita |
| Esportazione, conservazione, informativa, **la procedura di ripristino di D4-6** | Piano 4 | ⚠︎ §11 porta **cinque** richieste ricevute, non tre |
| Il contrassegno di spec §9.11 | ⚠︎ nessuno | §13.11 |

---

## 2. Decisioni dell'utente

### 2.1 Le quattro del 28 settembre, mattina

| # | Decisione | Costo |
|---|---|---|
| **D3c-1** | Accesso via email e recupero della password **spenti** | Il caso peggiore non è «un'operatrice resta fuori»: la guardia conta le attive e collegate, **non sa chi ricorda la password**. Sopra c'è la perdita della **dashboard**, e sopra ancora quella del **secondo fattore** (§13.17) |
| **D3c-2** | ⚠︎ **SOSPESA** fino a §9.3 A2, **e il piano 4 va avvisato** (§2.4) | La rev. 1 asseriva un fatto che dichiarava non misurato |
| **D3c-3** | Credenziali della dashboard a **due persone** | Possono **leggere tutto** e **distruggere tutto**, con la procedura che questo documento insegna loro. E spec §12.11 dichiarava accettabile il limite sul `TRUNCATE` *«leaving only the database owner»* |
| **D3c-4** | Il restringimento **elenca e lascia proseguire** | Il caso vero è la **disattivazione**: decine di righe da uno schermo di 375 punti. §3.6 porta l'alternativa |

### 2.2 Le tre del 28 settembre, pomeriggio — corrette dopo il secondo giro

| # | Stato | Nota |
|---|---|---|
| **D3c-5** | **Dopo la prima settimana si smette di SCRIVERE sulla carta; i registri NON si distruggono** | ⚠︎ La spec non dice mai di buttarla, e l'**importazione è fuori perimetro**: i registri sono l'unico posto dove vivono gli anni di storia del salone. **Assolta dal terzo giro**: è la lettura letterale minima di spec §3 |
| **D3c-6** | **REVOCATA** | Vedi §2.3 |
| **D3c-7** | L'esportazione del piano 4 **non è** il backup | La decisione regge; il suo corollario era falso e §2.4 lo riscrive |

### 2.3 ⚠︎ I colori: due letture sbagliate mie, e la decisione tornata all'utente

Va scritto per esteso, perché è il difetto che §16.1 dichiara di non saper presidiare.

Spec §9.12 dice che i colori delle operatrici *«must reach **3:1 against the background**»* e, nella stessa frase,
*«**Light, not dark**: the room is bright, hands are busy, and legibility comes before atmosphere»*. Sul rosa cipria
(luminanza **0,8774** [misurato]) il 3:1 impone luminanza ≤ **0,2591**, cioè colori **scuri**. Le due clausole si
toccano.

| Quando | Che cosa ho fatto | Perché era sbagliato |
|---|---|---|
| Rev. 2 | Ho introdotto **D3c-6**: tavolozza **chiara**, il 3:1 portato dal bordo, presentata come l'unico modo di sciogliere la contraddizione | Non era l'unico |
| Rev. 3 | Ho proposto di **revocarla**, dicendo che la contraddizione non esiste perché «quattro righe sopra la spec si contraddirebbe» | ⚠︎ **L'argomento è falso, e auto-confutante.** Il quarto paragrafo parla di **confini** (*«selection or any other boundary the eye must find»*, WCAG 1.4.11), il quinto di **riempimenti**: oggetti diversi. E la forma di D3c-6 — riempimento chiaro più bordo scuro — **è esattamente quella che il quarto paragrafo descrive**. Ho citato come contraddizione il paragrafo che autorizzava ciò che stavo revocando |

E il mio secondo argomento — «D3-6 è passata per venti revisioni senza che nessuno la accusasse» — **è morto sul
codice**: 3a §9 dichiara **tre letture** proprio su spec §9.12 (L3 sul carattere, **L4** su *«drawn from this
family»*, **L9** su *«3:1 against the background»*) [misurato]. Quella sezione è stata smontata clausola per
clausola: il silenzio su «Light, not dark» viene da lettori che ne stavano dichiarando altre tre.

**La domanda è stata riportata all'utente con tre letture.** Ha scelto la terza — e **anche quella era sbagliata**.

| Quando | Che cosa ho fatto | Perché era sbagliato |
|---|---|---|
| Rev. 4 | **D3c-8**, lettura C: *«dentro la banda del 3:1 si sta verso il deep rose»*, con la conseguenza *«Alessandra `#9B1B1B` è troppo scura: è l'unica delle tre più vicina all'inchiostro che al deep rose»* | ⚠︎ **Falso su SEI metriche** [misurato dal quarto giro e da me]: luminanza (0,0733 contro **0,0505**), L\* (29,1 contro **8,95**), ΔE76 (67,5 contro **32,0**), distanza sRGB (135,8 contro **75,0**), contrasto (2,33 contro **1,39**), punto medio. `#9B1B1B` è più vicina al **deep rose** in tutte. E «**l'unica delle tre**» è vuota: nemmeno Annalisa soddisfa il predicato |

### 2.3-bis ⚠︎ Perché la lettura C è ESCLUSA, e non da me

Tre prove indipendenti, tutte misurate al quarto giro:

1. **Lessicale.** [misurato] La parola «dark» compare **esattamente due volte** in tutte le 1951 righe della spec:
   riga 1348, *«a **darker** tone»*, che è il **deep rose**; e riga 1353, *«Light, not dark»*. «Light» compare **una
   volta sola**, nella stessa riga. Sotto la lettura C la spec direbbe «chiaro, non scuro» indicando come polo del
   chiaro l'unico oggetto che essa stessa chiama «un tono più scuro» — che ha **L\* = 42,6 su 100**.
2. **La giustificazione si rivolta.** Il revisore ha misurato il **contrasto del testo sul blocco**, che nessuno dei
   quattro giri aveva guardato: dentro la banda di C il miglior testo ottenibile è **5,87:1**, e solo stando
   esattamente sul pavimento; **sotto** il pavimento — la zona che C vieta — arriva a **21:1**. Sull'unico criterio
   che la frase nomina, *«legibility comes before atmosphere»*, **C è la peggiore delle letture**, e scarta il
   colore che su quel criterio è il migliore.
3. **La conseguenza non segue**, come sopra.

⚠︎ **E c'era una QUARTA lettura**, che nessuno dei quattro giri aveva visto: *«Light, not dark» vieta i riempimenti
quasi-neri* — l'unica non ridondante, perché nessuna delle tre clausole precedenti esclude l'inchiostro. La spia:
**§10.1 chiedeva già come controesempio «un quasi-nero dentro la banda»**, insieme **vuoto** sotto C ed esattamente
corretto sotto quella. Chi aveva scritto quella prova la stava già usando.

### 2.3-ter La domanda, la quarta volta

Portata all'utente con **C esclusa** e le tre superstiti: **A** (riempimenti chiari col bordo, = D3c-6), **B** (il
tema dell'app, = L3c-9), **D** (niente quasi-neri). Ha scelto **A**.

### 2.4 Le decisioni del 28 settembre, sera

| # | Decisione | Costo |
|---|---|---|
| **D3c-8** | ⚠︎ **REVOCATA** dopo il quarto giro | §2.3-bis: tre prove indipendenti |
| **D3c-9** | ⚠︎ **Lettura A: la tavolozza è di riempimenti CHIARI, e il 3:1 lo porta il BORDO in inchiostro.** È la forma che Annalisa ha già in D3-6, estesa a tutte. **È D3c-6, reintrodotta dopo essere stata revocata per due volte con due argomenti falsi** | **Vera e Alessandra cambiano colore.** Costo misurato: la tavolozza scende da **21 tinte a 6**. In cambio, e nessuno l'aveva misurato prima del quarto giro: il **testo sul blocco** passa da 5,87:1 (il meglio dentro la banda di C) a **13,6–19,1:1** [misurato], ed è l'unica forma che il **quarto paragrafo di spec §9.12 autorizza esplicitamente**. ⚠︎ **Il 3b va avvisato**: §11. **Lettura L3c-10** |

### 2.5 ⚠︎ Che cosa dicono D3c-2, D3c-5 e D3c-7 messe insieme

> **Se §9.3 A2 accerterà che il piano in uso non ha ripristino, dall'ottavo giorno il salone non avrà nessuna copia
> *corrente*.** Restano, e vanno contate: **(a)** l'archivio di carta, fermo al giorno in cui si smette di
> scriverci, e che non ha mai contenuto compleanni né storico dei trattamenti **[da chiedere alla titolare: è
> un'affermazione sui quaderni del salone, non deducibile dal repo]**; **(b)** il dump di §9.12 — ⚠︎ **che esiste
> solo DURANTE un dispiegamento**, perché §9.12 prescrive di cancellarlo a conferma avvenuta: fra un dispiegamento e
> l'altro **non c'è**; **(c)** dal piano 4, **D4-6**, quattro copie settimanali, che sono la copia corrente vera.

⚠︎ **Fra l'apertura e la consegna di D4-6 il salone non ha nessuna copia aggiornata.** Il testo della rinuncia di
§9.7 E3 lo dice, ed è la ragione per cui §11 chiede al piano 4 la **priorità** di D4-6.

### 2.6 La sospensione di D3c-2 non è a senso unico — e il verso opposto era anch'esso a metà

**Misurato:** il piano 4 ha letto la **revisione 1** del 3c e tratta «piano gratuito, nessun backup» come fatto in
~26 sedi; ci ha riscritto §5.4, §7.5, §7.6, **§9.2**, §9.4, le letture **L13 e L21**, ci ha costruito §6.3.3, e ne è
uscita **D4-6**, una decisione dell'utente a valle.

⚠︎ **E il terzo giro ha trovato che il 3c aveva raccolto una sola delle cinque richieste che il piano 4 gli manda**
(piano 4 §12.1 punto 14, *«al 3c, e ora sono cinque cose, due delle quali correzioni a un documento già
consegnato»*). §11 le porta tutte e cinque.

---

## 3. Disponibilità (spec §9.8) e restringimento (spec §7.6)

### 3.0 La riga che decide tutto

`src/dominio/fasce.ts`, `risolviGiorno` [misurato, verbatim]: `// Passo 1 e 2 di §7.1: l'eccezione SOSTITUISCE il
giorno per intero.` Un'eccezione non modifica il giorno: lo rimpiazza.

### 3.1 La schermata

Voce **Disponibilità**, telefono verticale 375–430 punti. Due modi: **Settimana tipo** ed **Eccezioni**. Un giorno
senza fasce si legge «**non lavora**», scritto. **L3c-1:** il trascinamento delle fasce non si costruisce.

### 3.2 La trappola allo specchio

Vera: lun e mar 9–13 **e 15–19**; mer **solo 15–19**; gio **non lavora**; ven 9–19; sab 9–13. Corso **lun 5 – sab
10 ottobre 2026**: sceglie l'intervallo, toglie il pomeriggio, salva **9–13**.

| Giorno | Prima | Dopo | Che cosa succede |
|---|---|---|---|
| **lun 5** | 9–13 **e 15–19** | 9–13 | perde il pomeriggio |
| **mar 6** | 9–13 **e 15–19** | 9–13 | perde il pomeriggio |
| **mer 7** | **solo 15–19** | 9–13 | perde il pomeriggio **e guadagna la mattina** |
| **gio 8** | **non lavora** | 9–13 | **prenotabile in un giorno in cui non c'è** |
| **ven 9** | 9–19 | 9–13 | perde il pomeriggio |
| **sab 10** | 9–13 | 9–13 | **non cambia** |

⚠︎ **Cinque giorni su sei cambiano.** La rev. 3 li raggruppava in una riga sola e ne perdeva il conto: vedi §3.3.

### 3.3 ⚠︎ L'elenco delle differenze — **terza forma, e la prima completa**

Prima di scrivere, **sempre**, l'editor mostra **una riga per OGNI giorno che cambia**, con il verso.

⚠︎ **Tre giri, tre forme, e il difetto è sopravvissuto due volte dentro il proprio rimedio.** Primo giro: mancava
il caso (un intervallo poteva **aggiungere** disponibilità e nessuno lo diceva). Secondo giro: c'era il caso,
**mancava il segno** — mercoledì 7 portava un solo `−` e Vera non sapeva di essere diventata prenotabile la mattina.
Terzo giro: c'erano i segni e **mancavano i giorni** — il blocco ne mostrava tre, e **lunedì 5 e martedì 6 perdono
lo stesso pomeriggio di venerdì**. Una cliente con Vera **lunedì 5 alle 16** non produceva nessuna riga, quindi
nessun conteggio, quindi nessun elenco di conflitti: **quel telefono non veniva chiamato**.

**[proposta] Il blocco, per intero, sullo scenario di §3.2:**

```
lun 5 ott    − 15–19 non più prenotabile   (1 appuntamento da spostare)
mar 6 ott    − 15–19 non più prenotabile   (nessun appuntamento)
mer 7 ott    − 15–19 non più prenotabile   (2 appuntamenti da spostare)
             + 9–13  AGGIUNGE la mattina
gio 8 ott    + 9–13  AGGIUNGE un giorno in cui non lavora
ven 9 ott    − 13–19 non più prenotabile   (1 appuntamento da spostare)
sab 10 ott   (non cambia — non compare)
```

⚠︎ **§10.1 asserisce il NUMERO di righe (cinque) oltre ai due segni di mercoledì.** Una prova che pianta un giorno
solo resta verde su un'implementazione che rende solo i giorni il cui *tipo* di cambiamento è insolito — ed è
esattamente ciò che è successo.

**Due presentazioni, perché due delle quattro scritture non stanno in cinque righe:**

- **una operatrice**: riga per giorno;
- **tutte le operatrici** (chiusura del salone: 20 giorni × 3 = 60 righe) o **ogni data futura** (disattivazione):
  **riassunto per operatrice**, apribile.

⚠︎ **E la settimana tipo è illimitata quanto la disattivazione**, che la rev. 3 segnalava solo per la seconda: un
cambiamento del martedì tocca **ogni martedì**. Il confine è quello di §3.4, che è **l'assenza di orizzonte sulle
date con appuntamenti** — un insieme finito.

### 3.4 Quando l'elenco appare, e su quali orizzonti

Il confronto è sulle **celle risolte**, con la precedenza di spec §6.6 applicata da `risolviGiorno`.

⚠︎ **Due orizzonti, e non sono lo stesso numero.**

| Grandezza | Valore | Che cosa costa sbagliarla |
|---|---|---|
| **Conflitti** (§3.4) | **[proposta] nessun orizzonte**: ogni data **futura con appuntamenti**, insieme finito | Un appuntamento fuori orizzonte non è elencato, nessuno telefona, la cliente arriva a un salone senza l'operatrice. **È il danno per cui spec §7.6 esiste** |
| **Annuncio** (§6.5) | `ORIZZONTE_GIORNI` = **28** [misurato, `src/dominio/cercaposti.ts`] | Un ritardo, non una perdita |

⚠︎ **§10.1 deve avere DUE prove, non una.** La rev. 3 accusava la rev. 2 di «un punto solo per due grandezze» e ne
lasciava uno solo: quello dell'**annuncio**. La prova che manca è quella che conta — un appuntamento **oltre** i 28
giorni che **compare** nell'elenco dei conflitti.

### 3.5 L'elenco dei conflitti

L'app calcola in TypeScript le terne **(operatrice, data, celle perse)** e chiama **in POST**:

```
public.conflitti(p_terne jsonb) returns table (
  appointment_id uuid, operator_id uuid, appointment_date date,
  start_cell int, cell_count int,
  client_name text, client_phone text
)
```

⚠︎ **`service_names` è stato tolto anche dal blocco**, non solo dalla prosa: la rev. 3 lo dichiarava rimosso in
§12 e lo lasciava nella firma, che è ciò che l'implementatore copia.

`security invoker`, `search_path = ''`, `revoke … from public, anon`, `grant … to authenticated` — ⚠︎ il `revoke`
non è ridondante: ogni funzione nuova nasce eseguibile da `anon`.

⚠︎ **Perché non una funzione che riceve le fasce grezze**: dovrebbe riscrivere in SQL il risolutore che il repo
tiene in TypeScript, e `0012` lo vieta per esteso [misurato].

⚠︎ **`client_phone` è nullabile**: la riga dice «nessun telefono» a parole. **L3c-6:** spec §7.6 chiede solo i
telefoni; il **nome** è una decisione del 3c e si tiene (senza, un numero non basta a chiamare, e con `phone`
nullabile è l'unica cosa che identifica la riga). Da iscrivere nel censimento del piano 4 (§11).

### 3.6 Dopo la conferma (D3c-4)

Niente: gli appuntamenti restano, l'agenda li mostra fuori orario. ⚠︎ Il costo vero è la **disattivazione**.

⚠︎ **[proposta] La voce «fuori orario»** in Disponibilità, che rifà la chiamata **su richiesta**: non conserva
niente, e l'elenco è interamente riderivabile — `0012` **non filtra l'occupazione per `is_active`** [dalla
revisione, verificato]. ⚠︎ **Ma è una decisione di dominio** (§13.9): a schermo è lo stesso elenco che l'utente ha
scartato, disponibile per sempre invece che una volta.

### 3.7 Due operatrici sullo stesso giorno

`write_exception_day` cancella e riscrive senza argomento di versione [misurato, `0010`; il `p_attesi` di confronto
è in `0016`]. Sequenziale: l'ultima vince. ⚠︎ **Concorrente: MISURATO il 28/09** (appendice D). Due chiamate simultanee sulla stessa coppia: la seconda vede
`DELETE 0` — non può vedere la riga non ancora committata della prima — e poi il suo `insert` **fallisce con
`23505 duplicate key`** e la transazione **si annulla**. Quindi nel caso concorrente **non c'è sorpasso silenzioso:
c'è un errore**, e va mappato (§7.2). §13.14 è **chiuso**.

### 3.8 Validazione, e tre modi silenziosi di sbagliare

1. **`p_to` prima di `p_from`**: zero giorni, `0`, nessun errore.
2. ⚠︎ **Una data nulla**: stessa cosa, e la validazione del punto 1 **non lo cattura**. Si valida l'esistenza
   **prima** dell'ordine. ⚠︎ **MISURATO il 28/09**: `generate_series(null::date, …)` restituisce **zero righe**, esattamente come un
intervallo invertito. Il difetto è confermato e la validazione deve guardare **l'esistenza prima dell'ordine**.
3. ⚠︎ **Il valore restituito è muto**: `written := written + 1` gira incondizionatamente [misurato], quindi non può
   contraddire l'aritmetica che l'app ha già. La conferma dice «6 giorni» **dal calcolo dell'app**.

**I tetti.** `write_exception_days` non ne ha. **[proposta] 120 giorni**, ⚠︎ **decisione di dominio** (§13.1). Lo
stesso su `salon_closure`, il cui unico vincolo sulle **date** è `end_date >= start_date` [misurato, `0006`]. ⚠︎ Il
`check` di tabella si scrive **dopo** §13.1.

---

## 4. Impostazioni (spec §9.9)

| Sezione | Contenuto | Di chi |
|---|---|---|
| **Operatrici** | elenco, aggiunta, collegamento, scollegamento, disattivazione, colore, ordine, **«Chiudi tutte le sessioni»** | 3c |
| **Categorie e servizi** | categorie (nome, ordine, **cancellazione**); servizi | 3c |
| **Il salone** | orario, chiusure | 3c |
| **Dati delle clienti** | esportazione, conservazione | Piano 4, segnaposto |

⚠︎ Il contrassegno di spec §9.11 è un **cerchio a tre** e non lo costruisce nessuno (**L3c-4**, §13.11).

### 4.1 ⚠︎ Colori delle operatrici — rifatta su **D3c-8** (lettura C)

I numeri, ricalcolati e confermati da **tre** revisori con script propri:

| | Luminanza | Contrasto su `#FDEDF0` | Sotto D3c-8 |
|---|---|---|---|
| sfondo `#FDEDF0` | 0,8774 | — | — |
| **deep rose** `#C2185B` — Vera | 0,1288 | **5,19:1** | ✅ **è il riferimento**: spec §9.12 lo elegge a portare i confini |
| **inchiostro** `#140D18` | 0,0050 | 16,85:1 | ⛔ il polo da cui allontanarsi |
| Alessandra `#9B1B1B` | **0,0783** | 7,23:1 | ⚠︎ **più vicina all'inchiostro che al deep rose: va schiarita** |
| Annalisa `#FFFFFF` | 1,0000 | 1,13:1 | ✅ eccezione dichiarata: il 3:1 lo porta il **bordo** |
| Soglia del 3:1 | — | luminanza ≤ **0,2591** | il tetto della banda |

**[proposta] Il criterio, in tre parti.**

1. **Contro lo sfondo**: ogni riempimento ≥ **3:1** su `#FDEDF0`, con l'unica eccezione dichiarata del bianco.
2. ⚠︎ **Dentro la banda, verso il chiaro** (**D3c-8**): un **pavimento di luminanza**, non solo un tetto. Il tetto è
   0,2591 (il 3:1); il pavimento **[proposta]** è la luminanza del deep rose meno un margine da fissare nel piano.
   È la parte che né D3-6 né D3c-6 avevano, ed è **l'unica cosa che mette in discussione `#9B1B1B`**.
3. **Fra ogni coppia**: un **ΔE** minimo, anche sotto le tre simulazioni di Machado. ⚠︎ Il pavimento ΔE è
   **[proposta]** (§13.15): D3-6 ha accettato *quel* 15 fra *quelle* due tinte, non 15 come regola. ⚠︎ E serve,
   perché `#C2185B` e `#9B1B1B` passano entrambi la parte 1 e stanno **fra loro a 1,39:1**.

⚠︎ **Il bordo non distingue niente**: porta il 3:1 contro lo sfondo e zero identità. È la **motivazione** della
parte 3, non un criterio a sé — la rev. 3 la contava come terza parte e non era falsificabile.

⚠︎ **L'inchiostro è già assegnato** da spec §9.12 a *«Text, **rules**, the logo's line art»*: un bordo in
inchiostro su **ogni** blocco lo renderebbe indistinguibile dal reticolo. Con l'eccezione limitata ad Annalisa il
problema non si pone.

**Dove vive il vincolo.** ⚠︎ **Non nel database**: un `check` su `operator.color` romperebbe
`tests/schema/chiusura-sessioni.test.ts`, che scrive `#123456` per dimostrare che un cambio di colore **non chiude
le sessioni** [misurato]. §13.12 lo porta all'orchestratrice.

⚠︎ **E la prova sulla validazione deve avere un controesempio che FALLISCE.** La rev. 3 usava `#123456` — che
[misurato] ha **11,23:1** sullo sfondo, cioè **passa** la parte 1 di quasi quattro volte, e passa anche la parte 3:
quella prova misurava l'appartenenza a un elenco, non il criterio. **[proposta]** il controesempio è una tinta che
fallisce la parte 1 — un rosa chiaro tipo `#FFE9EE`, ≈1,1:1 — e un secondo che fallisce la **parte 2**, cioè un
quasi-nero dentro la banda.

⚠︎ **I colori sul disco NON sono quelli di D3-6.** `0001` semina Vera `#C2185B`, **Annalisa `#7B3F61`**,
**Alessandra `#2F6F6B`** [misurato] — e `#C2185B` contro `#2F6F6B` stanno **a 1,01:1**. La divergenza è già scritta
in **3a §4.1 punto 7** [misurato], una sezione che le rev. 1–3 non dichiaravano di leggere. I valori giusti
arrivano col **Task 10 del 3a-1**, non implementato (`0021` non esiste sul disco). §9.6 **D3** lo verifica, e con
D3c-8 anche `#9B1B1B` va rideciso: §11, §13.15.

⚠︎ **Un cambio di colore non chiude nessuna sessione**, per due ragioni indipendenti [misurato, `0015`]: il trigger
è `after update **of is_active, auth_user_id**`, e i due `is distinct from` nel corpo.

### 4.2 Disattivazione, riattivazione, scollegamento

**Prima di disattivare**, l'elenco di §3.3 nella presentazione «tutte le date future».

**La guardia** rifiuta ogni scrittura che lascerebbe zero operatrici attive collegate a un account **esistente**, e
solleva `check_violation` = **`23514`** [misurato, `0009`].

**La riattivazione chiude le sessioni** dell'account riattivato [misurato, `0015`]: la conferma lo dice.

⚠︎ **Sulla propria riga non si offre né la disattivazione né lo SCOLLEGAMENTO**: `update operator set auth_user_id
= null` sulla propria riga butta fuori chi lo esegue all'istante, e la guardia non lo rifiuta. ⚠︎ Della stessa
classe di §4.6 (un'azione tolta alle operatrici): **§13.5**.

### 4.3 «Chiudi tutte le sessioni» (D3-14)

`public.chiudi_sessioni(p_operator_id uuid) returns integer`: tre rifiuti con `P0004`, altrimenti cancella e
restituisce quante.

⚠︎ **Due casi in più** che restituiscono **`0` senza errore**: bersaglio **non collegato**, e bersaglio
**collegato a un account inesistente**.

⚠︎ **Perché il secondo esiste, citato per intero.** `0009` dice *«a relink to a mistyped or since-removed uuid from
the Settings screen — measured reachable and exploitable **before this EXISTS clause was added**»*. Il commento
misura che quello stato **lo era**, non che **lo sia**. La ragione vera sta nel corpo: la guardia rifiuta **solo se
`remaining = 0`**, quindi con le colleghe a posto un ricollegamento sbagliato **passa** [misurato]. ⚠︎ La rev. 2
aveva troncato la citazione **e ci aveva chiuso sopra una divergenza fra due revisori**: §15 voce 15.

**[proposta]** Lo stato si risolve contro **`public.list_auth_accounts()`**, non contro la sola colonna. Tre stati,
tre frasi.

**Forma.** Su ogni **altra** operatrice. Conferma. «N sessioni chiuse» o «Nessuna sessione aperta». ⚠︎ `P0004`
arriva **raramente ma arriva** (una collega disattiva chi guarda la schermata fra caricamento e tocco): «*Non ho
potuto: ricarica e riprova.*»

### 4.4 Aggiunta e collegamento

`public.list_auth_accounts()` restituisce **solo `id` ed `email`** [misurato, `0011`]. ⚠︎ **Il primo collegamento
non si può fare dall'app**: si fa dall'editor SQL (**§9.6 D4**).

### 4.5 Categorie e servizi

Categorie: nome, ordine, **e cancellazione quando non hanno servizi**. Servizi: nome, categoria, durata, pausa, chi
li esegue, ordine, disattivazione.

⚠︎ **Cancellare una categoria che ha ancora un servizio solleva `23503`** (`service.category_id` è `references`
**senza `on delete`** [misurato, `0002`]), e la frase che il 3a dà a `23503` è *«Il servizio o l'operatrice non
esiste più»* — **il contrario del vero**. §7.2 lo mappa per nome del vincolo.

⚠︎ **Nessuna unicità sul nome** in `service_category`, `service`, `operator` [misurato]: §7.4.

### 4.6 Orario del salone e chiusure

⚠︎ **Nessuna funzione e nessun vincolo consulta `salon_settings`** [misurato].

⚠⚠ **E la premessa su cui le revisioni 1–5 hanno costruito un vincolo È FALSA.** Dicevo che restringere
«nasconde gli appuntamenti fuori», e ci avevo messo davanti una **[proposta]** che rifiutava di stringere oltre
l'appuntamento più esterno — cioè **toglieva un'impostazione alle operatrici** (§13.5). Spec **§9.1** lo risolve già,
e lo risolve nominando lo scenario esatto [misurato, verbatim]:

> *«The vertical window starts at `salon_settings.day_start_boundary` / `day_end_boundary` and **expands to contain
> everything actually on the day** — availability and appointments alike. Without that expansion an appointment
> booked outside salon hours under D18 **would be created and then never rendered**».*

**Quindi: restringere l'orario NON nasconde niente.** La finestra verticale si espande su ciò che c'è. Il vincolo si
**ritira**: l'orario del salone si stringe liberamente, come ogni altra impostazione. ⚠︎ Era un rimedio a un difetto
che non esiste, e il difetto l'avevo inventato io.

⚠︎ **E con esso cade il limite 13 della spec 3b**, che la chat del 3b aveva scritto **sulla fede della mia
risposta** di §4.6: l'appuntamento salvato alle 07:30 da una lista stantia **si vede**. §11 glielo dice.

⚠︎ **E il cercaposti del 3b legge quei due valori** (D3b-2): `day_start_boundary` e `day_end_boundary` sono la
**fascia di ripiego** con cui propone «fuori orario», e il 3b non li modifica [chiesto dalla chat del 3b]. Quindi
**§4.6 cambia che cosa il cercaposti propone**, ed è un rimando che va nei due documenti.

⚠︎ **La risposta alla domanda che il 3b pone:** **sì, i due valori possono essere cambiati mentre qualcuno ha una
lista aperta** — ⚠︎ **ma il danno che ne temevamo non c'è** (vedi sopra, spec §9.1): resta uno scarto di
**etichetta** (la riga stantia dice «dentro orario» dove il nuovo orario direbbe «fuori»), non un appuntamento
invisibile. Lo raccolgono i ripieghi di 3a §4.6 — sono una schermata di Impostazioni come le altre, e §6.3 decide che
`salon_settings` **non si annuncia** sul canale dei giorni. Un telefono con una lista di proposte aperta **non lo
sa**, e il 3b li tiene nell'impronta del cursore di paginazione **proprio per questo**. Due conseguenze, e nessuna
delle due era scritta: la lista del cercaposti si invalida da sé quando l'impronta cambia (è il 3b che la gestisce,
e funziona); e **§13.18 non è più una domanda solo sul ritardo dell'agenda** — ha un secondo consumatore.

**Chiusure:** date, confini entrambi nulli o entrambi posti, `reason` non nullo, più il tetto di §3.8. ⚠︎ `reason`
è l'unico campo di testo libero: la schermata scrive accanto «*niente nomi di clienti*».

---

## 5. Primo avvio (spec §9.10)

### 5.1 Tre condizioni, non una

Spec §9.10: *«no services and no availability»* [misurato]. Lo stato vuoto **nomina quella che manca**: nessun
`service` → «non ci sono ancora servizi»; nessun `operator_service` → «**nessuna operatrice esegue servizi**»;
nessun `weekly_availability` → «**nessuna operatrice ha orari**».

⚠︎ **E il cercaposti del 3b rimanda QUI.** Senza servizi, o senza operatrici che li eseguano, il cercaposti non
può proporre niente e il suo stato vuoto rimanda al primo avvio (3b §10) [chiesto dalla chat del 3b]. **Gli stati
vuoti delle tre schermate del 3b sono del 3b**; questo è il solo rimando, e le tre condizioni di §5.1 sono ciò che
il cercaposti interroga per sapere quale frase mostrare.

### 5.2 Fermarsi a metà

Con una condizione sola, un'interruzione lascia `weekly_availability` vuota, e `risolviGiorno` dà
`dayStatus = 'operator_off'` [misurato]: **ogni giorno, per ogni operatrice, «non lavora»**. Aperto e silenzioso,
che è peggio di rotto. **[proposta]** il primo avvio **riprende dal punto d'interruzione**.

### 5.3 I quattro passi

Categorie → servizi → chi fa che cosa → la settimana tipo di ciascuna.

### 5.4 Rientrare non deve duplicare

`service_category.name` non ha unicità [misurato]: chi ripete si ritrova sei categorie. **[proposta]** il primo
avvio **mostra ciò che c'è già**, e §4.5 prevede la cancellazione.

### 5.5 Che cosa presuppone

Le tre righe di `operator` sono seminate da `0001`; `salon_settings` ha già la sua riga (96 e 240 = 08:00–20:00
[misurato, `0002`]). Prima serve **il collegamento della prima operatrice** (§9.6 D4). **Si può uscire.**

---

## 6. L'annuncio quando cambiano disponibilità e chiusure

### 6.0 Tre forme in tre revisioni, e che cosa ha insegnato ciascuna

| Forma | Che cosa proponeva | Che cosa il giro ha misurato |
|---|---|---|
| Rev. 1 | trigger per istruzione sulle tabelle della disponibilità | **fino a 240 righe di `annuncio`** per una sola assenza |
| Rev. 2 | l'annuncio nella **Server Action** | ⚠︎ **La diagnosi era sbagliata**: le 240 nascevano dal **ciclo** in `write_exception_days`. E lo spostamento perdeva **tre proprietà** — la transazionalità (spec **D29**: *«On PostgREST each call is its own transaction»*), l'inviolabilità (lo schema `app` **non è esposto**, `public` sì: `schemas = ["public","graphql_public"]` [misurato]), la copertura (ventiquattro vie invece di sei trigger) |
| Rev. 3 | `write_exception_days` **a insiemi** + trigger estesi | ⚠︎ Un revisore contava **~123** istruzioni eseguite, deducendo che `on delete cascade` generi una `delete` sul figlio **per ogni riga di padre**. ⚠︎ **MISURATO il 28/09: è FALSO.** La cascata scatta **una volta per ISTRUZIONE di padre**, con tutte le righe figlie nella tabella di transizione |
| Rev. 5 | la stessa forma, **misurata** | ⚠︎ **Né 3 né 123: QUATTRO.** E la forma a ciclo non fa 240 righe ma **600**. Appendice D |

### 6.1 La sede

`annuncio` (`giorni date[] not null`, `cardinality > 0`, `creato`), nella pubblicazione `supabase_realtime` limitata
agli INSERT, riempita da **sei trigger per istruzione** su `appointment` e `visit` — ⚠︎ **[misurato al commit
`86d4223`; nell'albero di lavoro un'altra chat ne aveva tolto uno al momento della lettura]**.

⚠︎ **Tre scrittori**: il 3a (visite), il 3c (disponibilità), e il **3b**, che riusa `annuncio.giorni` per le clienti
(D3b-9) [misurato, 3b §7]. §6.6 e §13.25.

### 6.2 **[proposta]** La forma: il ciclo si toglie, i trigger restano

1. ⚠︎ **`write_exception_days` a insiemi** — una `delete` sull'intervallo, due `insert … select`. È **lavoro dentro
   una funzione del piano 1**: richiesta all'orchestratrice (§11, §13.16).
   ⚠︎ **MISURATO** su 120 giorni con due fasce (appendice D): **4 esecuzioni di trigger e 4 righe di `annuncio`** sul
   risalvataggio, **3 e 2** al primo salvataggio — contro le **600 e 600** della forma a ciclo. Il guadagno è di **due
   ordini di grandezza**, ed è più grande di quello che il documento rivendicava; ma il numero da scrivere nelle
   prove è **quattro**, non tre.
   ⚠︎ **Il costo delle prove è l'opposto di come la rev. 3 lo dichiarava.** [misurato] `write_exception_days` ha
   **zero chiamanti** in `src/` e **una sola prova** (`tests/schema/write-functions.test.ts`, 14 giorni con
   `p_ranges` **nullo**, unica asserzione il conto). Il caso «questi orari invece» su un intervallo — le due
   `insert … select` — **non è provato da nessuna parte**. Il costo non è «un giro su chi la chiama»: è **scrivere
   le prove che mancano**.
   ⚠︎ **E il contratto va conservato**: il valore restituito, e i tre casi di confine (invertito → `0`, data nulla,
   `p_ranges` nullo o vuoto). §14.
2. **I trigger per istruzione si estendono** a `exception_day`, `exception_range`, `weekly_availability`,
   `salon_closure` e `operator`. ⚠︎ **NON a `salon_settings`**: §6.3 decide che l'orario non si annuncia, e la
   rev. 3 lo metteva nell'elenco contraddicendosi a nove righe di distanza.
   ⚠︎ **E non è «estendere»: è riscrivere.** [misurato] `app.annuncia_giorni()` è un dispatch cablato su due
   tabelle (`if tg_table_name = 'appointment' … else … visit_date`): attaccarci `exception_day` farebbe cadere ogni
   scrittura nel ramo `else`, che legge una colonna che quella tabella non ha. Le sei forme di «quali giorni» sono
   sei rami nuovi, e due tabelle (`weekly_availability`, `operator`) **le date non ce l'hanno affatto**.

⚠︎ **Il «no» di §13.8 vale SOLO per l'annuncio.** La rev. 3 scriveva «il 3c non introduce nessuna funzione di
scrittura propria», e quel divieto cancellava la funzione **antidoto al doppio invio** che §7.4 e §13.4 tengono
aperta. Sono due oggetti diversi.

### 6.3 Che cosa annuncia ciascuna scrittura, e **che cosa rilegge il ricevente**

| Tabella / colonna | Giorni | Che cosa rilegge il telefono |
|---|---|---|
| `exception_day`, `exception_range` | le date toccate, vecchie e nuove | il giorno: fasce e appuntamenti ✅ |
| `weekly_availability` | le occorrenze **dei giorni della settimana toccati** nell'orizzonte — ⚠︎ **al plurale**: un UPDATE del campo `weekday` ne tocca due | idem ✅ |
| `salon_closure` | le date dell'intervallo, vecchio e nuovo, **troncate all'orizzonte** | idem ✅ — ⚠︎ **con il ramo del vuoto**, sotto |
| `operator` — `is_active` | ogni data nell'orizzonte | ⚠︎ la colonna resta **vuota** anche senza rilettura, perché `availability_window` filtra le disattivate [misurato, `0012`]: il danno è minore |
| `operator` — **INSERT** | ⚠︎ **vedi sotto** | — |
| `operator` — **`auth_user_id`** | ⚠︎ **[proposta] niente** | ⚠︎ **riga nuova alla rev. 4.** §7.4 la censisce, §4.2 e §8.3 la eseguono, e §6.2 mette il trigger su `operator` **senza elenco di colonne**: annuncerebbe comunque, non dichiarato. Cambia l'etichetta «tu», che il telefono ricava dal proprio token |
| `operator` — **DELETE** | ⚠︎ **[proposta] niente** | ⚠︎ **riga nuova.** Raggiungibile dall'editor SQL, e solo per un'operatrice senza appuntamenti (`appointment.operator_id` è `references` **senza cascata** [misurato, `0004`]) |
| `operator` — `color`, `sort_order` | **niente** | Il colore non cambia chi c'è, e 3a §5.1 dà alla colonna l'etichetta «tu», **non un colore** ✅ |
| **`salon_settings`** | **[proposta] niente** | ⚠︎ **verificato**: `availability_window` **non legge `salon_settings`** in nessuno dei suoi rami [misurato, `0012`], quindi una ricarica del giorno non la rileggerebbe comunque. Il costo — la griglia verticale vecchia fino al ritorno in primo piano — è dichiarato. **§13.18** |
| `service`, `service_category`, `operator_service` | **[proposta] niente, dichiarato** | 3a §3.3 assegna al 3c «disponibilità e chiusure». **§13.10** |

⚠︎⚠︎ **IL TRIGGER SU `exception_range` NON DEVE ESSERCI SUL DELETE, E LA RAGIONE È MISURATA.** Sul percorso
della **cascata** il trigger figlio non può risalire alla data — il padre è già sparito — e **non resta muto: scrive
una riga `{NULL}`**, che **passa** il `check (cardinality(giorni) > 0)` perché un array con un elemento nullo ha
cardinalità 1. [MISURATO il 28/09 su banco, appendice D: una `delete` che cancella 3 giorni e 3 fasce produce **due**
righe di `annuncio`, una con le tre date e una con `{NULL}`.] Ogni cancellazione manderebbe ai telefoni **una riga di
spazzatura sul canale**. ⚠︎ **Nessuno dei tre giri l'aveva vista**: un revisore aveva DEDOTTO che il trigger sarebbe
restato muto, e la deduzione era sbagliata nel verso peggiore.
**[proposta]** `exception_range` porta il trigger **solo su INSERT e UPDATE**; la cancellazione la copre il trigger
di `exception_day`, che la data ce l'ha. ⚠︎ E la guardia sul vuoto va scritta come `giorni is null or
cardinality(giorni) = 0 **or giorni[1] is null**`, perché il `check` di `0019` da solo non basta.

⚠︎ **Il ramo del vuoto su `salon_closure`, che è un bloccante trovato al terzo giro.** `0019` porta
`constraint annuncio_giorni_non_vuoto check (cardinality(giorni) > 0)` [misurato], e §6.2 mette l'annuncio **nella
transazione della scrittura**. Una chiusura interamente **oltre** i 28 giorni tronca all'insieme vuoto, il `check`
solleva `23514`, e **la transazione della chiusura si annulla**. §9.10 **H2-bis** prescrive di inserire la chiusura
d'agosto prima del rilascio: da oggi ad agosto ci sono ~307 giorni. ⚠︎ È una regola **sopravvissuta al cambio di
meccanismo**: sotto la forma della rev. 2 un `23514` sull'annuncio non annullava la scrittura.
**[proposta]** il trigger emette **solo se l'intersezione con l'orizzonte non è vuota**, scritto come ramo.

⚠︎ **`operator` INSERT: l'annuncio c'è, la rilettura no.** Spec §9.1 dà **una colonna per operatrice attiva** e
*«above three active operators the columns scroll horizontally and the swipe gives way to the date strip»*
[misurato]: aggiungere Giulia cambia la colonna **e il gesto**. Ma la ricarica del giorno chiama
`availability_window(p_from, p_to, **p_operator_ids**)` e quegli id **li porta il telefono**, dall'elenco che ha
già: la colonna di Giulia **non compare**. **[proposta]** o §11 apre la richiesta al 3a-2 («la ricarica del giorno
rilegge prima `operator`»), o la riga torna a «niente» col costo dichiarato. **§13.26.**

⚠︎ **La lezione, e la rev. 3 l'aveva scritta senza applicarla alla riga che aveva appena cambiato:** §6.3 dichiara
**riga per riga che cosa rilegge il ricevente**, non solo che cosa annuncia il mittente. *Un annuncio a cui non
corrisponde una rilettura è un messaggio che costa e non fa niente.*

### 6.4 Il percorso che scrive senza passare dall'app

`0006` revoca I/U/D su `exception_range` **solo ad `anon`** [misurato]: un `PATCH` diretto da un telefono
autenticato è consentito. ⚠︎ **Con §6.2 la questione è priva di oggetto davvero** — i trigger stanno sul database.
⚠︎ **E la domanda che due documenti tenevano aperta è CHIUSA** [MISURATO, appendice D]: una cancellazione in
cascata **fa scattare** il trigger per istruzione del figlio, **una volta per istruzione di padre**, con tutte le
righe figlie nella tabella di transizione. 3b §7 la dichiara **[da misurare]** per conto proprio: **§11 gliela
chiude**. ⚠︎ Ma il trigger figlio **non può risalire alla data** e scrive `{NULL}`: vedi §6.3.

### 6.5 L'orizzonte, e dove vive il numero

`weekly_availability` e `operator` non hanno date: un cambiamento tocca ogni martedì all'infinito. **[proposta]** si
riusa `ORIZZONTE_GIORNI = 28`.

⚠︎ **Ma adesso l'annuncio è nel DATABASE, e `ORIZZONTE_GIORNI` è una costante TypeScript** [misurato: tre sedi,
tutte in `src/` e `tests/`; zero occorrenze di quel numero nelle migrazioni]. §6.2 obbliga quindi a **una seconda
copia in SQL** — che è precisamente ciò che §3.5 cita `0012` per vietare. **§13.2** decide dove vive: una sede SQL
letta anche da TypeScript, oppure un duplicato **dichiarato** con una prova che pianta i due valori insieme.

⚠︎ **E la prova di §10.1 sull'espansione non sta più sul percorso**: va spostata in §10.2.

⚠︎ **L'orizzonte va ancorato a Europe/Rome.** Dentro un trigger la data di partenza è per forza **derivata dal
server**, e su Supabase `current_date` è UTC — che spec §5.1 vieta. Qui è inevitabile: va **dichiarato come
eccezione** e scritto `(now() at time zone 'Europe/Rome')::date`.

⚠︎ **La distinzione disponibilità/occupazione era ROVESCIATA.** La rev. 3 diceva che 60 secondi di disponibilità
stantia fanno meno danno dell'occupazione stantia. È il contrario: l'**occupazione** ha un presidio nel database —
`appointment_slot_unique` [misurato, `0005`] — quindi la doppia prenotazione **non si scrive**; la **disponibilità**
non ha **nessun** vincolo, e un appuntamento fuori dalla disponibilità **si scrive e resta**. È la trappola di §3.2.
**§13.19.**

### 6.6 La pulizia — **non dentro `app.annuncia_giorni()`**

⚠︎ **La rev. 3 proponeva di metterla lì dicendo che la ragione di `0019` «decade». Non decade.** `0019` scrive:
*«questo trigger gira UNA VOLTA PER ISTRUZIONE, cioè **da 2 a 5 volte per salvataggio** (misurato: 2 in creazione
con un appuntamento, 3 con due, 4 passando da due a uno, 5 passando da uno a tre)»* [misurato, verbatim]. Quella
misura è sul percorso delle **visite**, che usa la **stessa funzione**, e §6.2 non lo tocca: la frequenza resta
identica. ⚠︎ E la `delete` su `annuncio` **esiste già** dentro `app.chiudi_invio` [misurato]: metterla anche nel
trigger la **duplica**.

⚠︎ **E con tre scrittori la pulizia non ha un padrone**: quella in `chiudi_invio` gira solo sul percorso delle
visite e non vede le righe del 3c né quelle del 3b. **[proposta]** una pulizia **sola**, in un posto solo, e §11
dice quale piano la possiede — **§13.25**.

---

## 7. Le scritture del 3c

### 7.1 Che cosa condividono col 3a

Valgono i passi di 3a §4.3 e il criterio del passo 8. Non valgono: nessun registro degli invii, nessun «Controlla».

### 7.2 ⚠︎ I codici che le schermate del 3c producono — **cresciuta col censimento**

⚠︎ **Non è una richiesta al 3a-2.** Il contratto **C2** restituisce il codice al chiamante — `{ tipo: 'annullato',
sqlstate, proprio: … }` [misurato] — e `proprio: false` vuol dire «il 3a non ha una frase», non «tu non puoi
averne una». Il 3c lo sa già: §4.3 mappa i tre `P0004` senza chiedere niente a nessuno.

| Codice | Come si distingue | Frase |
|---|---|---|
| **`23P01`** | `exclude using gist` su `weekly_availability` o `exception_range` [misurato, `0006`] | «*Questa fascia si sovrappone a una che c'è già*» |
| **`23503`** | ⚠︎ **per NOME DEL VINCOLO**, due sorgenti: `service.category_id` (cancellare una categoria con servizi) e `appointment.service_id` (cancellare un servizio prenotato) [misurato, `0002`, `0004`] | «*Questa categoria ha ancora dei servizi*» / «*Questo servizio è ancora prenotato*» — mai la frase del 3a, che dice il contrario |
| **`23505`** | ⚠︎ **per NOME DEL VINCOLO, e le sorgenti sono DUE**: `operator_service_pkey` — spuntare «Alessandra esegue Manicure» da una schermata stantia; e ⚠︎ **`exception_day_operator_id_exception_date_key`**, cioè due operatrici che salvano lo **stesso giorno d'eccezione nello stesso istante** [MISURATO, §3.7 e appendice D] | «*C'è già*» e la schermata si ricarica / «*Una collega ha appena scritto su questo giorno: guarda com'è adesso*», che rimanda all'elenco di §3.3. ⚠︎ Mai la frase del 3a, che è per `appointment_slot_unique` |
| **`23514`** | ⚠︎ **per NOME DEL VINCOLO**, e i `check` raggiungibili sono **almeno quattro**: la guardia di `0009`; `end_date >= start_date` su `salon_closure`; `duration_cells > 0` su `operator_service`; **`annuncio_giorni_non_vuoto`** (§6.3) | ciascuno la sua. ⚠︎ Mappato **per codice**, una chiusura con le date invertite direbbe «*Resterebbe il salone senza nessuna che può entrare*» |
| **`P0004`** ×3 | `chiudi_sessioni` | §4.3 |

⚠︎ **A monte, e meglio del rifiuto**: 9–13 più 12–15 **sono** 9–15, ed è ciò che `piega` in `fasce.ts` fa già al
passo 4 di spec §7.1. Scrivere la fascia **piegata** toglie il caso senza insegnare una regola artificiale.

⚠︎ **`23P01` non significa «c'era già questa»**: significa «c'è qualcosa che si sovrappone».

### 7.3 Ritentativi su `40P01`

⚠︎ **Contratto C5 del 3a-2**, non una [proposta] del 3c. Si applica anche a `operator`, dove `40P01` è un esito
previsto: la guardia prende `for update` su tutte le righe, **senza elenco di colonne** [misurato, `0009`].

⚠︎ **Il riordino delle colonne è N scritture e va fatto in una sola.** `operator.sort_order` non ha unicità
[misurato]: un `40P01` a metà lascia due operatrici a `sort_order = 2` e i telefoni disegnano le colonne in ordine
diverso **in silenzio**. **[proposta]** una chiamata sola che riceve l'elenco ordinato — la regola di spec §4.6.

⚠︎ **La ragione per cui il ritentativo è sicuro non è l'idempotenza**: è che un `40P01` **annulla sempre** la
transazione.

### 7.4 Il censimento delle scritture — 24 righe

| # | Scrittura | Ripetuta | Vincolo |
|---|---|---|---|
| 1–3 | `write_exception_day(s)`, `delete from exception_day` | stesso stato | cancella e riscrive |
| 4–6 | `insert`/`update`/`delete` su `weekly_availability` | stesso stato o `23P01` | `exclude` |
| 7 | `insert into salon_closure` | ⚠︎ **due chiusure identiche** | **nessuno** |
| 8–9 | `update`/`delete` su `salon_closure` | stesso stato | — |
| 10 | `update salon_settings` | stesso stato | riga unica |
| 11 | `update operator set is_active` | stesso stato | la guardia riconta |
| 12 | `update operator set color`, `sort_order` | stesso stato | ⚠︎ **nessuno; e può stallare** (§7.3) |
| 13 | `update operator set auth_user_id` | stesso stato | `unique` |
| 14 | `insert into operator` | ⚠︎ **due «Giulia»** | **nessuno** |
| 15 | `chiudi_sessioni(op)` | stesso stato | — |
| 16–18 | `insert`/`update`/`delete` su `service_category` | stesso stato | ⚠︎ nessuna unicità sul nome; `23503` in cancellazione |
| 19–21 | `insert`/`update`/`delete` su `service` | stesso stato | idem; `23503` se prenotato |
| 22–24 | `insert`/`update`/`delete` su `operator_service` | stesso stato | `23505` sulla chiave primaria; `check (> 0)`. ⚠︎ **La `delete` non è vincolata**: togliere «chi lo esegue» con appuntamenti futuri è ammesso, il cercaposti smette di proporre, gli appuntamenti restano — corretto, e **nessuno l'aveva mai detto** |

**Quattro righe senza vincolo**: chiusura, operatrice, categoria, servizio. **[proposta]** passano da una funzione
che rifiuta il **duplicato esatto** (§13.4). ⚠︎ **Non è coperta dal «no» di §6.2**, che riguarda l'annuncio.

⚠︎ **La lezione:** la rev. 2 ne censiva 17 e perdeva **gli `update` e i `delete` del catalogo** — il confine era
ereditato dal primo avvio, che crea e non modifica. Il piano lo rifà **dalle tabelle e da spec §9.8/§9.9**.

### 7.5 Che cosa si fa di una risposta persa

**Rileggere e mostrare**, con l'elenco di §3.3. ⚠︎ **Due eccezioni:**

- **`chiudi_sessioni` non ha stato leggibile** (`auth.sessions` non è leggibile dal ruolo dell'app): la risposta
  corretta è **«ripremi»**, ed è corretta perché la chiamata è innocua ripetuta. È il passo centrale di §8.
- **Se anche la rilettura non risponde**: resta «Non so com'è adesso» **con un pulsante che la ripete** — come 3a
  §5.1 per il trascinamento.

⚠︎ **Ripetibile non vuol dire innocuo**: per questo i tre ritentativi restano dentro la Server Action e non
diventano mai un «Riprova» premuto un minuto dopo.

---

## 8. Procedura «telefono perso» (D3-20)

### 8.1 Le premesse

- **L'app non tocca mai le password.**
- **Tutta la procedura è eseguibile dalla dashboard.**
- **Le credenziali le hanno due persone.** ⚠︎ **E il secondo fattore non deve vivere su un telefono operativo**: se
  il telefono perso genera anche il secondo fattore della dashboard, questa premessa è falsa e la procedura **non
  parte** (§9.8 F6, §13.17).
- ⚠︎ **`secure_password_change` acceso (§9.4 C8) è una PRECONDIZIONE del passo 1.**

### 8.2 Perché l'ordine di 3a §4.7 non regge

3a §4.7 cancella le sessioni per prime. È vero che finché la sessione è viva il ladro può agire, e **non basta**:

> 1. Si cancellano le sessioni: il telefono esce.
> 2. **Finestra.** L'account è senza sessioni **ma con la vecchia password**, che sta nel telefono. Chi lo tiene
>    **riaccede** — la reazione naturale di chi si vede disconnesso.
> 3. Si cambia la password: non uccide la sessione appena creata.
> 4. Si riattivano le colleghe; chi è dentro **le ridisattiva** (`authenticated` conserva UPDATE su `operator`
>    [misurato, `00051`, verbatim *«revoke insert, update, delete from anon ONLY»*]).
> 5. Si disattiva la riga persa: la guardia conta zero e solleva `23514`. **Rifiutato.**

⚠︎ **E l'argomento su `secure_password_change` vale solo nell'ordine NUOVO.** Nell'ordine vecchio il ladro la
password la sa, quindi C8 non chiude niente. **Dal passo 1 invertito in poi non la sa più**: C8 acceso chiude la
finestra fra il passo 1 e il passo 2, e **C8 spento la lascia aperta**.

### 8.3 I passi

1. ⚠︎ **Cambiare la password.** Precondizione: **C8 acceso**.
2. **Cancellare le sessioni**: `delete from auth.sessions where user_id = '<uuid>';` ⚠︎ **Rileggere la clausola
   `where` prima di premere.** ▸ Se le colleghe sono attive, si può fare anche dall'app (§4.3).
3. **Rimettere in ordine le colleghe**: `is_active = true` **e `auth_user_id` all'uuid giusto**.
4. ⚠︎ **Ripristinare la loro `weekly_availability`**, se è stata cancellata (§8.4 punto 6). ⚠︎ **Passo nuovo alla
   rev. 4**: la rev. 3 la faceva **leggere** al passo 5 e non la ripristinava, mentre §9.10 H4 ne faceva un
   criterio. Senza ripristino (A2) si rifà **a mano**, e dopo H2-bis sono le settimane tipo vere appena immesse.
5. **Disattivare** la riga del telefono perso.
6. ⚠︎ **Rileggere e confermare, due letture:**
   - `select o.name, o.is_active, u.email from operator o left join auth.users u on u.id = o.auth_user_id order by o.sort_order;`
   - ⚠︎ `select o.name, count(w.*) from operator o left join weekly_availability w on w.operator_id = o.id group by 1 order by 1;`
     **Il `left join` è obbligatorio**: un `group by` su `weekly_availability` **non produce una riga** per chi non
     ne ha più — cioè è cieco proprio sul caso che deve vedere.
7. **Quando ha un telefono nuovo**: cambiare di nuovo la password e riattivarla.
8. ⚠︎ **Rimettere la passphrase nuova nel gestore** e far rientrare l'operatrice.
9. **Le visite cancellate**: §8.5.

### 8.4 Che cosa la procedura non impedisce

Finché non è eseguita, chi ha il telefono di un'operatrice attiva: **legge tutte le clienti**; **cancella in massa
le visite**; **chiude le sessioni delle colleghe**; **le disattiva**; **scollega o dirotta `auth_user_id`**;
⚠︎ **6. distrugge la disponibilità di tutte** — `DELETE /rest/v1/weekly_availability?operator_id=neq.<lei>` è
consentito a qualunque operatrice attiva [misurato, `0006`], e dopo `risolviGiorno` dà `operator_off` ogni giorno;
**7. riceve gli annunci** fino a `jwt_expiry` — non i dati, ma **il ritmo con cui il salone scrive** (3a §4.6,
§9.4 C11). **§13.20.**

### 8.5 Le visite cancellate

**Se §9.3 A2 accerta che non c'è ripristino** il passo 6 di 3a §4.7 non è eseguibile: *«non si recuperano;
`visita_cancellata` dice quante e quando»* (solo `id` e istante, trenta giorni [misurato, `0013`]).
⚠︎ **E quella pulizia gira solo se qualcuno salva una visita**: durante la chiusura d'agosto nessuna riga scade, ed
è pseudonima — **del piano 4** (§11).

⚠︎ **Ma il piano 4 chiede di condizionarla anche a D4-6**: con la copia settimanale la frase «perse per sempre»
smette di essere vera, e con essa il passo 6. §11 richiesta (d).

---

## 9. Verifiche prima del rilascio — la procedura di apertura

⚠︎ **L'ordine è quello delle sezioni, non quello delle lettere.** Le lettere (Z, A, C, B, D, …) sono gli
identificativi **stabili** delle voci; rinominarle romperebbe i rimandi, che è la classe di difetto trovata nove
volte al secondo giro.

⚠︎ **§9 non si esegue in una giornata e non la esegue una persona sola**: §9.13 porta il piano delle sessioni,
misurato dal terzo giro simulando l'esecuzione.

Tre colonne: *che cosa* · *come si verifica* · *che cosa si vede se è giusto*. L'SQL dall'editor della dashboard.
⚠︎ **Mai `psql`.**

### 9.1 Il punto di partenza

⚠︎ Il repo **non è collegato** (`supabase/.temp/` senza `project-ref` [misurato]); l'app **non esiste** (`src/`
contiene solo `src/dominio/`, `package.json` non ha Next né React [misurato]). A1 verifica che non esista già un
progetto prima di crearne un secondo.

### 9.2 Primo — I cancelli *(voci Z)*

| # | Che cosa | Come | Che cosa si vede |
|---|---|---|---|
| **Z1a** | Le quattro risposte di spec §14 | il documento | Quattro risposte con una data. ⚠︎ Risponde **il titolare** (piano 4 **D4-4**). ⚠︎ **Due di esse cadono dentro il 3b** [chiesto dalla chat del 3b, spec 3b rev. 2, `69f5dd5`]: la **domanda 4** (basta un'informativa esposta, se la maggior parte delle clienti è registrata **al telefono**?) cade sul percorso di raccolta che il 3b apre; la **domanda 2** (la base giuridica degli auguri) decide se il campo compleanno può esistere — spec: *«la data di nascita è raccolta solo per l'augurio, quindi se quello scopo non ha base il campo non ce l'ha»*, e l'obbligo di consenso si attacca alla **comunicazione**, non allo strumento |
| **Z1b** | **L'informativa di spec §11.1 esposta in salone** | guardarla | Il cartello, con controllore, finalità, i due responsabili, il termine, i diritti, ⚠︎ **e i cookie** (§9.9 G6-ter). Il testo è del piano 4. ⚠︎ **IL 3c NON DICHIARA IL RILASCIO FINCHÉ IL TITOLARE NON HA L'INFORMATIVA SCRITTA** [chiesto dal 3b]: D19 dice che il salone non usa l'app prima della fine del 3c, e il 3b apre il primo percorso di **raccolta**. Senza, il salone comincia a raccogliere nome, telefono, compleanno e storico **senza informativa**, e il piano 4 arriva dopo |
| **Z1c** | Il **ramo degradato** | scritto, con un nome | ⚠︎ La rev. 3 proponeva «si spegne il compleanno»: **non è eseguibile**, perché i compleanni sono del 3b e spegnerli è codice più un dispiegamento. **[proposta]** una leva **organizzativa**: non si raccoglie il compleanno, per istruzione scritta. E **chi decide di aprire ha un nome** |
| **Z1d** | ⚠︎ **L'azione WhatsApp degli auguri resta SPENTA** finché la domanda 2 non ha risposta | la schermata Compleanni del 3b: il pulsante non c'è | ⚠︎ **Voce nuova, chiesta dal 3b.** Il 3b costruisce e prova la schermata; **l'azione** resta dietro la risposta. ⚠︎ E c'è un fatto che decide la **forma** del rimedio: `no_messages` è `boolean not null **default false**` [misurato, `0003_client.sql`], cioè lo stato di difetto è **«messaggiabile»**. Se la risposta è «serve consenso», l'opt-out è la forma sbagliata e **va rovesciato** — e quella è una migrazione sul database vivo (§9.12). **§13.30** |
| **Z2** | Albero pulito, **sullo sha** | `git status --porcelain` e `git rev-parse HEAD` | Lo sha **trascritto qui**. ⚠︎ Criterio: **nessun file tracciato modificato**, e le non tracciate elencate e classificate — ⚠︎ *misurato al 28/09: 17 voci, di cui **quattro** `.DS_Store`* |
| **Z3** | ⚠︎ **La suite è verde sullo sha di Z2** | il registro della CI su quel commit | ⚠︎ **Voce nuova.** Z2, A4 e B3 controllano lo **sha**; nessuna voce guardava se quel commit **passa le prove** |

### 9.3 Secondo — Il progetto, il piano, lo schema *(voci A)*

| # | Che cosa | Come | Che cosa si vede |
|---|---|---|---|
| A1 | Verificare che non esista già; crearlo, regione **europea** | Dashboard | Un progetto solo, regione UE |
| **A1-bis** | ⚠︎ **Trascrivere qui: URL, `ref`, chiave pubblica, password del database** | Dashboard → API e Database | ⚠︎ **Voce nuova.** C2, D7, D8 e G2 li consumano e **nessuna voce li produceva**: chi esegue li cercava da sé, col rischio di provare una chiave diversa da quella che B2 mette in Vercel |
| **A2** | **La misura del piano**: backup, PITR, sospensione, **e quanto costa il piano che i backup li ha** | Dashboard → Database → Backups; fatturazione | ⚠︎ Ne dipendono §8.5, §9.11, E2, **A2-bis** ed E3. **Trascritta, con la data** |
| **A2-bis** | ⚠︎ **La decisione che spende, o non spende** | la titolare decide; scritto con la data | ⚠︎ **E chi paga, con quale metodo, e che cosa si fa se il pagamento non passa.** Se si compra, si compra **adesso**, prima che entri un dato reale |
| A3 | `npx supabase login`, `link --project-ref <ref>` | `supabase/.temp/project-ref` esiste | Il riferimento |
| A4 | `npx supabase db push` | `migration list --linked`; `git rev-parse HEAD` = sha di Z2; ⚠︎ **e si LEGGE l'output riga per riga cercando «Skipping migration»** | ⚠︎ **Il conto atteso non è una costante**: è `ls supabase/migrations/*.sql \| wc -l` **allo sha di Z2** (oggi venti, ma al rilascio saranno di più: il 3c porta la `0023`, il 3b la `0022`, il piano 4 la `0024`). ⚠︎⚠︎ **E il conto è l'UNICA difesa**: [dalla chat del 3b, misurato due volte in questo progetto] il CLI **salta in silenzio** una migrazione il cui nome non corrisponde a `<timestamp>_name.sql`, stampa una riga facile da non vedere, **e `db reset` esce 0**. Misurato: rinominando in `0012b_…` il reset uscì 0, la riga *«Skipping migration … (file name must match pattern)»* stampata in cima, e **quindici prove rosse** con `42883`. ⚠︎ **È la ragione per cui nel repo c'è `00051_privilege_baseline.sql` e non `0005b_`**: con quel nome una correzione di un buco di sicurezza sarebbe arrivata in produzione **completamente inerte, con la suite verde**. E l'obbligo 6 dei findings del piano 2 è **ancora aperto**: *nessuna prova coglie una migrazione saltata* |
| A5 | **Se il conto non torna: fermarsi** | — | Uno schema a metà non si aggiusta proseguendo |
| **A6** | ⛔ **Mai `db reset --linked`**, e il divieto reso un fatto | dopo A4, **scollegare** | ⚠︎ **Quel comando AZZERA il database.** Criterio osservabile: `supabase/.temp/project-ref` **non esiste**. ⚠︎ E **§9.12 lo ricollega e lo riscollega**, altrimenti il presidio si spegne per sempre |
| A7 | La procedura di dispiegamento | **§9.12** | Scritta |

### 9.4 Terzo — Autenticazione *(voci C)*

⚠︎ **Spostata prima dell'applicazione**: nella rev. 2 il primo deploy esponeva l'app prima che C2–C6 chiudessero la
registrazione. Solo **C12** ha bisogno del dominio e sta dopo la Fase B.

⛔ **Non con `supabase config push`.** ⚠︎ **`supabase config diff` prima di ogni `config push`**, sempre.

| # | Che cosa | Come | Che cosa si vede |
|---|---|---|---|
| **C1** | Lunghezza minima e requisiti | Authentication → Password settings | ⚠︎ **Il valore lo decide §13.6**, e si imposta qui. Questa colonna riporta **il valore deciso**, non una [proposta]. Locale: `minimum_password_length` = 6 (r. 181), `password_requirements` = `""` (r. 184) [misurato]. ⚠︎ **Sta prima della Fase D**: una politica non rivaluta le password esistenti |
| C2 | **Registrazione spenta** | Providers → Email, e ogni altro interruttore; poi `curl -X POST '<URL di A1-bis>/auth/v1/signup' -H 'apikey: <chiave>' -H 'Content-Type: application/json' -d '{"email":"prova@esempio.test","password":"QualunqueCosa1!"}'` | **`signup_disabled`**. ⚠︎ In locale due righe si contraddicono (r. **175** false, r. **249** true; un terzo in `[auth.sms]` r. 287) [misurato]: **quale vinca lassù è [da misurare]**, e si **prova** |
| C3 | **Accessi anonimi spenti** | Providers → *Anonymous sign-ins* | Spento |
| C4 | ⚠︎ **Ogni emittente di token esterno spento** | **Providers**, **Third-Party Auth**, **Web3**, **OAuth server**: tutti e quattro | Nessuno acceso. ⚠︎ `config.toml` dichiara `[auth.web3.solana]`, `[auth.third_party.*]`, `[auth.oauth_server]` [misurato]: **non stanno sotto Providers** |
| C5–C7 | Magic link/OTP spenti; recupero spento; **nessun SMTP** | Providers → Email; Reset password; SMTP Settings | Spenti, vuoto |
| C8 | **`secure_password_change` acceso** | *Secure password change* | ⚠︎ **Precondizione del passo 1 di §8.3.** Locale: `false` (r. 256) [misurato] |
| C10 | `sign_in_sign_ups` non a 300 | Rate Limits, voce OTP | Il valore di difetto. Locale **300** (r. 235) [misurato] |
| C11 | **`jwt_expiry`** | JWT expiry | Trascritto (locale 3600 s). ⚠︎ Sul percorso di §8 il telefono rubato **riceve gli annunci** fino a quel limite. **§13.7** |

⚠︎ **C9 è stata spostata in §9.6, dopo D1**: misura il limite anti-forza-bruta **su un account che esiste**, e in
Fase C `auth.users` è vuota (`db push` non esegue `seed.sql`).

### 9.5 Quarto — L'applicazione *(voci B)*

| # | Che cosa | Come | Che cosa si vede |
|---|---|---|---|
| B1 | Progetto Vercel, collegato al repo **e al ramo nominato** | Vercel → Git | ⚠︎ **Il ramo scritto qui**: l'intestazione dice `main`, il `README` `foundations` [misurato]. ⚠︎ E **il ramo è condiviso come l'indice di git**: cambiarlo muove tutte le chat |
| **B1-bis** | ⚠︎ **Regione di esecuzione delle funzioni: UE** | Settings → Functions → Region | ⚠︎ A1 sceglie la regione UE per Supabase e F3 dichiara chiusa la domanda sul trasferimento, ma spec §11.1 dice che **ciascuno dei due** responsabili comporta un trasferimento. Va fissata **prima di B3** |
| **B2** | Variabili d'ambiente | Environment Variables | I nomi che il codice usa. ⚠︎ **In Production, NON in Preview** (B5). ⚠︎ Nessuna `service_role` (G7). ⚠︎ Le `NEXT_PUBLIC_*` sono **cotte nel build** |
| **B2-bis** | ⚠︎ **Un dispiegamento segnaposto** | il primo deploy, prima di B3 | ⚠︎ **Voce nuova.** Senza, **B7 non ha un bersaglio** e **B10 rimanda a una voce vuota** proprio nel caso in cui il primo deploy non si apre |
| B3 | **Deploy** e dominio | l'URL si apre; `git rev-parse HEAD` = sha di Z2 | La pagina d'accesso. Il dominio **trascritto qui** |
| **B3-bis** | **Dominio proprio del salone** | registrar, DNS | Intestatario, registrar, scadenza, **rinnovo automatico**. ⚠︎ Il DNS sono ore o giorni: va avviato in §9.13 sessione 0 |
| B4 | **Certificato**, `https` obbligatorio, rinnovo | il lucchetto; `http://` reindirizza | Sul dominio definitivo |
| **B5** | ⚠︎ **Le anteprime non parlano al database vero** | Environment Variables, ambiente Preview | ⚠︎ **[proposta] nessuna variabile in Preview**, così un'anteprima non si collega a niente. La protezione di dispiegamento resta come rete, non come difesa unica |
| B6 | **Chi promuove** | Git → Production Branch e permessi | **Production Branch nominato** e **auto-deploy disattivato**, oppure attivo **e scritto chi lo sorveglia** |
| B7 | **Rollback provato** | sul segnaposto di B2-bis | Funziona. ⚠︎ **Due avvertenze**: non riporta indietro il **database**, e rimette in piedi un build con le **variabili vecchie** |
| **B8** | **Sorveglianza** | Logs; allarme d'errore | Un allarme con **un destinatario che ha un nome** |
| **B9** | **Piano Vercel e termini d'uso** | fatturazione e termini | ⚠︎ Un'agenda di un centro estetico è **uso commerciale**, e F2 chiede un DPA che su certi piani potrebbe non esistere |
| **B10** | Se dopo un dispiegamento la pagina d'accesso non si apre | — | Si torna indietro con B7 **e ci si ferma** |
| **C12** | ⚠︎ **Site URL e Redirect URLs sul dominio definitivo** | Authentication → URL Configuration | ⚠︎ **Voce nuova, e mancava: tre revisori su cinque l'hanno trovata citata due volte e definita zero.** Il dominio di B3-bis, in `https`; **nessun `localhost`, nessun jolly**. Locale: `site_url = "http://127.0.0.1:3000"` (r. 158) [misurato] |

### 9.6 Quinto — Account, primo collegamento, database *(voci D)*

| # | Che cosa | Come | Che cosa si vede |
|---|---|---|---|
| **D0** | Come nascono le tre password | la strada di **§13.21**, eseguita | **L3c-8**: spec §4.2 vuole *«long generated passphrases in the salon's password manager»* [misurato]. Criterio: **le tre passphrase sono nel gestore e ciascuna operatrice ne ha presa una dal proprio telefono**. ⚠︎ **Decisione di dominio §13.21**: dove vive il gestore — se sta sui telefoni, chi ha **un** telefono ha **tre** passphrase, e §8.3 ne cambia una |
| D1 | Creare **tre** account | `select id, email from auth.users order by email;` | Tre righe. ⚠︎ **`id` serve** a D4 e a §8.3 |
| D2 | **Nessun altro utente** | idem | Tre e basta, nessuna `@example.test` |
| **C9** | ⚠︎ **Il limite anti-forza-bruta, MISURATO** | **empirico**: da una sola rete, **40 tentativi** di `POST /auth/v1/token?grant_type=password` con password sbagliata **su uno dei tre account di D1**; si trascrive a quale tentativo arriva il primo `429` | **Passa** se il `429` arriva **entro 30 tentativi in 5 minuti**. **Rossa** se non arriva: allora si accende il **captcha** — ⚠︎ **che richiede un token dal client, cioè la pagina d'accesso va modificata e ridispiegata**: la decisione si prende in §9.13 sessione 0, non qui. ⚠︎ E **dopo C9 si aspetta che la finestra si richiuda** prima di H1 |
| D3 | Le tre righe di `operator` | `select name, auth_user_id, color, is_active from operator order by sort_order;` | Tre righe, `is_active` vero, `auth_user_id` nullo. ⚠︎ **Il `color` si confronta con i tre valori decisi** — e **oggi non combaciano**: `0001` semina `#7B3F61` e `#2F6F6B` [misurato], i valori giusti arrivano col Task 10, e con **D3c-8** anche `#9B1B1B` va rideciso. **Questa voce è ROSSA finché `0021` non è applicata**, non «aperta» |
| **D4** | **Collegare** le tre righe | `update operator set auth_user_id = '<id da D1>' where name = 'Vera';` e le altre | ⚠︎ **Non «tre non nulli»**: tre collegamenti **scambiati** passerebbero, e §8.3 identifica la riga **per nome**. Si legge la **coppia**: `select o.name, u.email from operator o join auth.users u on u.id = o.auth_user_id order by o.sort_order;` |
| D5 | `postgres` su `auth.sessions` | `select has_table_privilege('postgres','auth.sessions','select'), has_table_privilege('postgres','auth.sessions','delete'), rolbypassrls from pg_roles where rolname='postgres';` | `t`, `t`, `t` |
| D6 | **RLS accesa ovunque** | `select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r' order by 1;` | Vero su **tutte e 16** [misurato]. È l'unica cosa che separa la rubrica delle clienti da chi ha la chiave pubblica: `00051` lascia ad `anon` la **SELECT** |
| **D7** | **`anon` non riceve righe**, con un **controllo positivo** | `curl '<URL>/rest/v1/operator?select=name' -H 'apikey: <chiave pubblica>'` | **`[]`**. ⚠︎ Su `operator`, che **ha tre righe** da D3 — non su `client`, che a questo punto è vuota e darebbe `[]` anche a sicurezza spenta |
| **D8** | **La chiusura immediata** | **(a)** `curl -X POST '<URL>/auth/v1/token?grant_type=password' …` → si copia `access_token`; **(b)** `curl '<URL>/rest/v1/operator?select=name' -H 'apikey: <chiave>' -H 'Authorization: Bearer <token>'`; **(c)** `delete from auth.sessions where user_id = '<id di Vera>';`; **(d)** si rilancia **(b)** | **(b) TRE righe; (d) `[]`.** ⚠︎ La lettura **prima** della cancellazione è obbligatoria, o la prova non discrimina |
| **D9** | Le politiche | `select c.relname, p.polname, p.polcmd, pg_get_expr(p.polqual,p.polrelid) as using_expr, pg_get_expr(p.polwithcheck,p.polrelid) as check_expr from pg_policy p join pg_class c on c.oid=p.polrelid where c.relnamespace='public'::regnamespace order by 1,2;` | **16 righe.** `using_expr` contiene `app.is_active_operator()`. `check_expr` **uguale** per le **12** con `polcmd='*'`, **NULL** per le **4** con `polcmd='r'` — `appointment_slot_read`, `invio_lettura`, `visita_cancellata_lettura`, `annuncio_lettura` — **ed è corretto** [misurato da due revisori]. ⚠︎ `pg_get_expr` stampa `( SELECT app.is_active_operator() AS is_active_operator)`: si confronta **per contenuto**, non carattere per carattere |
| **D10** | Le funzioni eseguibili da `anon` | `select p.proname, p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1;` | ⚠︎ **L'elenco atteso ESISTE, sta nelle migrazioni**: **13** funzioni `public.` con `revoke execute … from public, anon` esplicito, e **una sola** senza — `public.immutable_unaccent(text)`, `proacl` **nullo**, innocua [misurato una per una da due revisori]. **Qualunque altra `proacl` nulla è rossa.** ⚠︎ Si guarda `proacl` **compreso il nullo**: `aclexplode` salta l'ACL di difetto, cioè il caso che si cerca |
| D11–D12 | Realtime pubblico spento; la pubblicazione | Dashboard; `select pubinsert, pubupdate, pubdelete from pg_publication where pubname='supabase_realtime'; select tablename from pg_publication_tables where pubname='supabase_realtime';` | Spento; `t, f, f` e **`annuncio`**. ⚠︎ `publish` è parametro **della pubblicazione**: l'interruttore «Realtime» di Studio su un'altra tabella le toglie update e delete in silenzio |
| **D13** | **I privilegi di tabella** | `select relname, relacl from pg_class where relnamespace='public'::regnamespace and relkind='r' order by 1;` | Nessun `truncate` né `maintain` per `anon`/`authenticated`. ⚠︎ Diventa reale **dopo §9.12**: la ACL di difetto ri-concede su ogni tabella **nuova** |

### 9.7 Sesto — Backup *(voci E)*

| # | Che cosa | Come | Che cosa si vede |
|---|---|---|---|
| E1 | ⚠︎ **Spostata in §9.3 A2 e A2-bis** | — | È una misura da cui pendono altre voci, e una decisione che spende |
| **E2** | ⚠︎ **Se A2 dice che un ripristino c'è: PROVARLO — in §9.10, dopo H3** | si scrive una riga riconoscibile in `client`, si prende l'ora, si cancella, si ripristina | **La riga è tornata.** ⚠︎ **Si dichiara su quale progetto**: un ripristino **in loco azzera il lavoro delle Fasi C e D**, e dopo H2-bis anche il catalogo. Se è in loco, va **prima di H2-bis** |
| **E3** | Se A2 dice che non c'è: **la rinuncia, firmata** | un documento firmato | Il testo qui sotto |
| **E4** | **La sospensione: DUE domande** | Dashboard e documentazione | **(a)** si sospende, dopo quanto? **(b)** ⚠︎ **che ne è dei DATI, e che cosa costa riaccenderlo?** ⚠︎ Il rimedio ha **un titolare con un nome** e una cadenza scelta **dopo** la misura, e sta **nel calendario del salone**. «Aprire l'app» dev'essere una lettura **che arriva al database** |

**⚠︎ Il testo della rinuncia (E3), terza forma.**

> Il progetto è su un piano che **non fa copie di sicurezza** [accertato con §9.3 A2 il …].
> Se i dati si perdono, **non tornano**. Nessun tecnico può rimetterli.
> Si possono perdere in cinque modi: (1) qualcuno con il telefono di un'operatrice cancella le visite **o la
> disponibilità**; (2) chi ha la dashboard cancella per sbaglio una riga o una tabella; (3) qualcuno esegue il
> comando di azzeramento sul progetto vero; (4) un aggiornamento del programma va storto; (5) l'accesso alla
> dashboard, **o il suo secondo fattore**, si perde.
> Si perdono **tutti** i dati: nomi, telefoni, compleanni, e i trattamenti fatti a ogni cliente negli anni.
> **Le copie che esistono, e i loro limiti:** i vecchi registri di carta, fermi al giorno in cui si smette di
> scriverci; il file che si salva **durante** un aggiornamento del programma (§9.12) — ⚠︎ **e che si cancella
> quando l'aggiornamento è confermato: fra un aggiornamento e l'altro non c'è**.
> **Fino a quando il piano 4 non consegna la copia settimanale (D4-6), non esiste nessuna copia aggiornata.**
> Il piano che le copie le fa costa … [da §9.3 A2], e la decisione è in A2-bis.
> Accettato il …, da …, titolare.

### 9.8 Settimo — Contratti, persone, log *(voci F)*

| # | Che cosa | Come | Che cosa si vede |
|---|---|---|---|
| F1–F2 | **DPA con Supabase e Vercel** | Legal dei due | Accettati, con la data. Spec **§11.1** nomina i due responsabili |
| F3 | **Sotto-responsabili** dei due | le pagine dei sub-processor | Trascritti. ⚠︎ **È una voce del 3c**, non una richiesta del piano 4, che ne chiede **una sola** (F4) |
| F4 | ⚠︎ **Per quanto restano i log** | le impostazioni dei due piani | ⚠︎ **È la voce che il piano 4 chiede.** È il termine reale del limite di 3a §4.9: una riga rifiutata finisce nel log |
| F5 | **I membri delle due organizzazioni = le due persone di D3c-3** | Members dei due | ⚠︎ Metà di una voce di 3a §8.7 (*«operatrici fuori dal team»*). Ogni altro invito **revocato** |
| **F6** | **Chi tiene le credenziali, e come** | scritto, con i nomi | Due persone, **due credenziali distinte**. ⚠︎ **Secondo fattore acceso**, **e i codici di ripristino NON su un telefono operativo** (§8.1, §13.17). ⚠︎ **Il 2FA sulle tre operatrici è un'altra cosa ed è funzione del piano Pro** [misurato, `config.toml`, `[auth.mfa]` col commento *«available to Supabase Pro plan»*]: **§13.22** |
| **F6-bis** | ⚠︎ **Dove stanno i file del salone** | scritto | ⚠︎ **Voce nuova.** §9.12 deposita un dump con l'intera base clienti e la rev. 3 lo mandava «dove stanno gli altri dati del salone (F6)» — **F6 non nomina nessun luogo di dati**. Serve un posto concreto, cifrato, con il nome di chi lo tiene, come G10 per il file di rientro |
| F7 | **L'intestatario** dell'organizzazione, la casella, il recupero | scritto | ⚠︎ È l'anello per cui, se si perde, **non esiste un secondo ripristino**. ⚠︎ **Va deciso in §9.13 sessione 0**: se la risposta cambia, si rifà A1 |

### 9.9 Ottavo — Intestazioni, ambiente, fuso *(voci G)*

| # | Che cosa | Come | Che cosa si vede |
|---|---|---|---|
| G1–G6 | **CSP** con `nonce` e `strict-dynamic`; `connect-src`; `frame-ancestors 'none'` + tre; **HSTS**; `Referrer-Policy: no-referrer`, `nosniff`; `Cache-Control: no-store` | `curl -sI https://<dominio>/` e una prova con un `<iframe>` | Tutte presenti; il `nonce` **cambia a ogni ricarica**; il `wss:` c'è o il canale non si collega |
| **G6-bis** | ⚠︎ **Nessun service worker** | `navigator.serviceWorker.getRegistrations()`; pannello Application | ⚠︎ **Voce nuova, e tocca §8.** Spec §4.1: *«a web app manifest only — **no service worker**, which would cache authenticated responses and leave a readable client list on a lost phone»* [misurato]. Si registra da sé con mezza dipendenza PWA, **non si vede in nessuna intestazione**, e **sopravvive alla procedura di §8 per intero**. Criterio: **array vuoto**. E la gemella positiva: il manifest esiste e «Aggiungi a schermata Home» funziona |
| **G6-ter** | ⚠︎ **I cookie di sessione** | Application → Cookies, dopo l'accesso | `Secure`, `HttpOnly`, `SameSite=Lax`, nessun cookie di terze parti. ⚠︎ E vanno nominati **nell'informativa** di Z1b |
| **G7** | **`service_role` non è NELL'AMBIENTE** | Environment Variables, tutti gli ambienti; e il sorgente servito | 3a §4.2 esige *«non presente nell'ambiente di esecuzione»*: una chiave lato server non compare in nessun bundle e **scavalca tutta la sicurezza per riga** |
| G8 | **Nessun bucket pubblico** | Storage | ⚠︎ Il piano 4 **D4-6** aggiungerà un secchio **privato**: compatibile, e va saputo |
| **G9** | **Il fuso** | aprire l'app **dopo mezzanotte italiana e prima di mezzanotte UTC** | «Oggi» è il giorno **di Perugia**. ⚠︎ Spec §5.1: *«computed **on the client** … a **server**-derived date is wrong»* [misurato] — la rev. 1 aveva la motivazione **rovesciata**. ⚠︎ **Vincolo di calendario: una sessione notturna** (§9.13). *La rev. 3 rimandava a H9, che non ha nessun vincolo notturno* |
| **G10** | **Il rientro raggiungibile senza il repo** | una copia di `supabase/rientro/0014_…` dove la tengono le due persone di F6 | Il file, **con tutti i suoi costi**: riapre fino a `jwt_expiry` la finestra chiusa da D3-17, ⚠︎ **e disattiva i tre trigger `zz_chiudi_sessioni_*`**, cioè «Chiudi tutte le sessioni» e la chiusura automatica **smettono di funzionare** |

### 9.10 Nono — Prove a mano, e l'immissione *(voci H)*

⚠︎ **L'ordine di questa fase è stato rifatto alla rev. 4.** Nella rev. 3 **H2-bis** immetteva il catalogo vero
**prima** di H4 e H7, che poi lo distruggevano; e **H0** prometteva un database vuoto che H2-bis riempiva.

| # | Che cosa | Come | Che cosa si vede |
|---|---|---|---|
| **H0** | Tutte le prove **prima di qualunque dato reale** | — | Vale per H1–H8. ⚠︎ **H2-bis viene dopo**, ed è l'unica che porta dati veri |
| H1 | Le tre operatrici **entrano** | ciascuna dal proprio telefono | Tre accessi, con le passphrase di D0 |
| H2 | **Il primo avvio si apre e si può uscire** (prova 8) | catalogo vuoto → si apre; si esce, si rientra | ⚠︎ **E rientrando riprende dal punto giusto** (§5.2) |
| **H4** | ⚠︎ **La procedura di §8.3 per intero, e la classe intera** | da un telefono: disattivare le colleghe, **scollegarle**, **e cancellare la loro `weekly_availability`**; poi i nove passi | Il salone torna dentro, le coppie nome/email combaciano, **e la disponibilità è tornata** (passo 4). ⚠︎ **Spostata prima di H2-bis**: con il catalogo vero già dentro, questa prova distruggerebbe le settimane tipo appena immesse, e senza ripristino si rifanno a mano |
| **H4-bis** | **Le tre rientrano** | ciascuna accede | ⚠︎ H1 sta prima di H4, e H4 cambia una password vera |
| H5 | **«Chiudi tutte le sessioni»** e **i tre stati** di §4.3 | due telefoni; una riga **non collegata**; ⚠︎ **e una riga collegata a un uuid inesistente** | Il secondo telefono, ricaricato, **torna alla pagina d'accesso**. ⚠︎ **«Non mostra più niente» è l'esito SBAGLIATO**: spec §4.4 dice *«she gets zero rows, and the app looks like a salon that has lost all its data»*. ⚠︎ **E H5 ripristina i collegamenti che ha rotto** |
| **H5-bis** | ⚠︎ **Il middleware di spec §4.4** | disattivare una collega e ricaricare **il suo** telefono | ⚠︎ **Voce nuova.** H5 misura la **sessione distrutta**, non il controllo `is_active`: nel suo scenario l'operatrice è **ancora attiva**. La voce che esercita spec §4.4 è questa, e nella rev. 3 non esisteva |
| H7 | **Il canale in diretta** | due telefoni; cambiare la disponibilità; poi **un'assenza su 60 giorni** contando i messaggi | ⚠︎ **Condizionata**: il criterio «tre per operazione» presuppone §6.2, che è una richiesta all'orchestratrice (§13.16). **Se §6.2 non è consegnata, il numero atteso è quello della forma a ciclo**, e si trascrive. ⚠︎ **E H7 annulla l'assenza che ha creato** |
| H8 | **La guardia anti-blocco** | disattivare l'ultima attiva collegata | Il rifiuto con la frase di §4.2. ⚠︎ **E le due operatrici riattivate per arrivarci rientrano**: riattivare chiude le sessioni [misurato, `0015`] |
| H3 | **Restringimento con conflitti** (prova 6) | prenotare, poi un'assenza che ci cade sopra | L'elenco di §3.3 **con i cinque giorni e i due segni**, i conflitti con nome e telefono. ⚠︎ **E H3 annulla l'eccezione che ha creato** |
| **H3-bis** | **E2**, se A2 dice che un ripristino c'è | §9.7 E2 | ⚠︎ Se il ripristino è **in loco**, questa voce va **prima di H2-bis** |
| H6 | **Ripulire** | `select * from client;`, le visite, **le eccezioni**, **le chiusure**, **le righe di `operator` toccate** | ⚠︎ **Allargata**: la rev. 3 puliva solo clienti e visite, e lasciava sul progetto vero l'eccezione di H3, l'assenza di 60 giorni di H7 e la riga scollegata di H5 |
| **H2-bis** | ⚠︎ **L'IMMISSIONE DEI DATI DEL SALONE** | i quattro passi di §5.3, più orario e chiusure, con **l'elenco preparato su carta** | ⚠︎ **Spostata in fondo, ed è una sessione a sé** (§9.13). Spec §1.1: la sola Alessandra copre **sette famiglie di servizio**. Criterio: **nessuno dei tre stati vuoti di §5.1 compare più**; `salon_settings` ha l'orario vero; la chiusura d'agosto è inserita — ⚠︎ **e il ramo del vuoto di §6.3 regge** |
| **H10** | ⚠︎ **La rilettura finale del ruolo** | la doppia lettura di §8.3 passo 6 | ⚠︎ **Voce nuova, ed è l'ultima.** H5 e H8 mutano `operator` **dopo** l'ultima rilettura della rev. 3 |
| H9 | **Il doppio libro** | il calendario del salone | La settimana in parallelo **segnata**, la data in cui si smette **scritta**, **e il posto dove si conservano i registri nominato** |

### 9.11 Decimo — I limiti dichiarati, **tutti e dodici** *(spec §12)*

Si rileggono **uno per uno**, con **una data e un nome**. Spec §12 è un elenco numerato da 1 a 12 [misurato].

| Punto | Perché adesso |
|---|---|
| **12.1** nessun funzionamento senza rete | la rete del salone regge? Si chiede **nel salone** |
| **12.2** nessuna traccia di chi ha fatto che cosa | ⚠︎ senza ripristino: di una cancellazione non si sa **né chi né che cosa** |
| **12.3** un appuntamento cancellato non lascia traccia | idem; e `visita_cancellata` non scade a salone chiuso |
| **12.4–12.7, 12.9, 12.10** | ⚠︎ **da rileggere, e la rev. 3 non dava loro una riga** |
| **12.8** «nothing that is not a client appointment can be entered» | ⚠︎ **Il limite il cui peso è cambiato, e che nessuno dei tre giri aveva notato prima del terzo.** Fu accettato quando l'eccezione era un contenitore neutro; §3.0 e §3.2 hanno **misurato che è una trappola**, e §12.8 obbliga il caso più frequente («esco alle 16») a passare da lì. **§13.23** |
| **12.11** `TRUNCATE` | ⚠︎ era accettabile perché *«leaving only the database owner»*: **D3c-3 crea due proprietari umani**, e anche la metà «over-retention, **not data loss**» non è più vera |
| **12.12** cancellare l'ultimo account da `auth.users` | §8.3 manda le due persone nel pannello dove «Delete user» sta accanto a «Change password» |
| `ORDER-BY`, `ANALYZE-anon`, `AUTHUSERS-DELETE` | limiti **senza piano** |

### 9.12 ⚠︎ La procedura di dispiegamento dopo l'apertura — **riscritta**

Il **3b** e il **piano 4** arrivano dopo l'apertura e vorranno `db push` sul database **vivo**.

⚠︎ **La rev. 3 aveva un comando che non copia nessun dato.** [misurato, CLI 2.117.0 del repo, `db dump --help` e
`--dry-run`] `supabase db dump` esegue `pg_dump **--schema-only**`, e `--data-only` è un **flag**. Il file conteneva
`CREATE TABLE "public"."client"` e **zero clienti** — e la verifica proposta (`wc -l` più una ricerca del nome di
una tabella) **passava su quel file**.

1. ⚠︎ **Ricollegare**: `npx supabase login`, `npx supabase link --project-ref <ref di A1-bis>`. A6 aveva scollegato
   di proposito.
2. **Avvisare le operatrici** e fermare le scritture. Tutto ciò che si scrive dopo il dump è perso in un
   ripristino. **Salone chiuso.**
3. ⚠︎ **Tre dump**, con percorso **assoluto fuori dall'albero di lavoro**:
   `npx supabase db dump --linked --role-only -f ~/<sede di F6-bis>/ruoli-<data>.sql`
   `npx supabase db dump --linked -f ~/<sede>/schema-<data>.sql`
   `npx supabase db dump --linked --data-only --use-copy -f ~/<sede>/dati-<data>.sql`
   ⚠︎ **Fuori dal repo è un vincolo, non una preferenza**: `.gitignore` contiene `node_modules/`, `.env`,
   `.env.local`, `supabase/.temp/`, `supabase/.branches/` e **nessuna regola su `*.sql`** [misurato] — non può
   averla, le migrazioni sono `.sql`. Un dump nella radice entra nella storia di git al primo `git add -A`.
4. ⚠︎ **Verificare CONTANDO**: `grep -c 'COPY public.client' dati-<data>.sql` e il conto delle righe nel blocco,
   contro `select count(*) from client;` dall'editor SQL. **I due numeri devono coincidere.** Lo stesso per `visit`
   e `appointment`. ⚠︎ **Il dump esclude gli schemi `auth` e `supabase_migrations`** [misurato]: nessun account,
   nessuna storia delle migrazioni.
5. **Classificare le migrazioni in arrivo**: annullabili / non annullabili. Una non annullabile (`drop column`,
   `not null` su dati esistenti) si spezza in **espandi ora, contrai al dispiegamento dopo**.
6. **L'ordine**: prima la migrazione **compatibile all'indietro**, poi il deploy dell'app. Mai il contrario — è il
   guasto che B7 nomina («app vecchia contro schema nuovo») e che la rev. 3 non trasformava in un passo.
7. `git rev-parse HEAD`, `db push`, `migration list --linked`, il conto come A4.
8. **Se si ferma a metà**: fermarsi, capire quale manca.
9. ⚠︎ **Se è andata male dopo il successo: il ripristino.** **[da scrivere, §13.27]** — `psql` è vietato e non
   installato, `db reset --linked` è vietato da A6, `supabase db restore` non esiste. **Finché questo passo non ha
   un comando provato su un progetto usa-e-getta, §9.12 produce una copia che nessuno sa ripristinare**, e §2.5 e
   E3 non possono contarla fra le copie.
10. **Prova di fumo**: l'app si apre, si legge un giorno, si salva e si annulla una visita di prova.
11. **Rifare D13**: la ACL di difetto ri-concede `truncate` e `maintain` su ogni tabella **nuova**.
12. ⚠︎ **Scollegare**, e **riverificare l'assenza di `supabase/.temp/project-ref`** (A6).
13. **Cancellare i tre dump** — ⚠︎ e se il dispiegamento **non** è confermato, tenerli, perché sono l'unica copia:
    il termine si scrive qui.
14. **Dire alle operatrici che possono riprendere.**

### 9.13 ⚠︎ Il piano delle sessioni

Misurato dal terzo giro simulando l'esecuzione: **§9 non sta in una giornata e non la esegue una persona sola.**

| Sessione | Quando | Voci | Chi c'è |
|---|---|---|---|
| **0 — preparazione** | giorni prima | Le decisioni che §9 **consuma e non produce**: §13.21 (il gestore → D0), §13.6 (il minimo → C1), **captcha sì/no con chiavi e integrazione già nel build** (il ramo rosso di C9), il ramo di B1, **B3-bis e il DNS** (ore o giorni), **F6, F6-bis e F7 PRIMA di A1**, Z1a e Z1b | titolare, le due persone delle credenziali |
| **1 — progetto e autenticazione** | | Z2, Z3, A1–A7, C1–C8, C10–C11, F1–F7 | chi esegue **+ la titolare per A2-bis** |
| **2 — app e database** | | B1–B10, C12, D0–D13 (**C9 compresa**), G1–G8, G10 | chi esegue **+ le tre operatrici per D0** |
| **3 — notturna** | 00:00–02:00 di Perugia | **G9**, e solo G9 | chi esegue |
| **4 — prove a mano** | | H0–H10 **escluse H2-bis** | **tre telefoni**, la titolare per E3, la seconda persona delle credenziali |
| **5 — immissione** | prima del rilascio | **H2-bis**, §9.11, E3 | titolare e operatrici, con l'elenco su carta |

⚠︎ **Due vincoli d'ordine che nessuna sessione risolve da sola**: se il ripristino di E2 è **in loco**, H3-bis va
prima di H2-bis; e **la titolare serve due volte**, in sessione 1 (A2-bis) e in sessione 4 (E3).

### 9.14 ⚠︎ La procedura manuale per una richiesta di accesso

⚠︎ **Sezione nuova alla revisione 4, chiesta dalla chat del 3b** (spec 3b rev. 2, `69f5dd5`, limite 10 della sua §8).

**Perché è del 3c.** D19 dice che il salone comincia a usare l'app alla fine del 3c; il **piano 4** — che porta
l'esportazione della scheda di una cliente — arriva **dopo**. Fra i due c'è una finestra in cui **accesso e
portabilità non hanno nessun percorso nell'app**, e il termine per rispondere a una richiesta è **un mese**. Il
piano 4 stesso assegna al 3c le procedure (§11). Senza questa sezione il limite è **nominato e non dichiarato**.

⚠︎ **Due avvertenze che vengono prima dei passi.**

1. **Si legge dall'editor SQL della dashboard, cioè DA PROPRIETARIO**: la sicurezza per riga **non si applica**. È
   l'unico modo, e va scritto: chi esegue questa procedura vede tutto, non solo la cliente che ha chiesto. Le
   credenziali sono quelle di **D3c-3**, e chi esegue è una delle due persone di **§9.8 F6**.
2. **Il file che ne esce è una copia di dati personali fuori dal database**, esattamente come il dump di §9.12:
   sede cifrata di **F6-bis**, mai in una chat, e **cancellato quando la richiesta è chiusa**.

**I passi.**

1. **Identificare la richiedente** e verificarne l'identità. ⚠︎ Il 3c non dice come: è una decisione del titolare
   e del piano 4 (**§13.29**). Una ricerca per nome può restituire più righe — `client.full_name` non ha unicità
   [misurato, `0003`] — e `phone` è **nullabile**.
2. **La scheda della cliente**, che è la prima delle cinque tabelle:

   ```sql
   select id, full_name, phone, birth_month, birth_day,
          preferred_operator_id, no_messages, created_at, last_activity_at
     from client where id = '<id>';
   ```
   ⚠︎ **L'anno di nascita non esiste** (spec §6.2.1, e `0003` porta solo mese e giorno [misurato]): va detto nella
   risposta, perché una richiedente che si aspetta la data intera pensa che manchi qualcosa.
3. **Lo storico dei trattamenti**, che sono le altre quattro tabelle in un giro solo — `visit` → `appointment` →
   `service` e `operator`:

   ```sql
   select v.visit_date, a.start_cell, a.cell_count, s.name as servizio, o.name as operatrice
     from visit v
     join appointment a on a.visit_id = v.id
     join service s     on s.id = a.service_id
     join operator o    on o.id = a.operator_id
    where v.client_id = '<id>'
    order by v.visit_date, a.start_cell;
   ```
   ⚠︎ **`start_cell` e `cell_count` sono celle da cinque minuti, non orari**: si convertono prima di consegnarle, o
   la risposta è illeggibile. ⚠︎ E **il nome dell'operatrice è un dato di un'altra persona**: si consegna perché fa
   parte del servizio ricevuto, ma è una scelta da dichiarare al piano 4 (**§13.29**).
4. **Che cosa NON c'è, e va detto nella risposta**: le visite **cancellate** non sono ricostruibili —
   `visita_cancellata` tiene solo `id` e istante, per trenta giorni [misurato, `0013`]; e non esiste nessuna
   traccia di **chi** ha creato o cambiato una riga (spec §12.2).
5. **Comporre la risposta**, consegnarla, e **cancellare il file**. Si registra la data della richiesta e la data
   della risposta: il termine è un mese.

⚠︎ **Questa procedura è provvisoria per costruzione**: il piano 4 la sostituisce con l'esportazione della scheda.
Va rimossa da §9 quando quella arriva, e §11 lo chiede al piano 4.

---

## 10. Prove

### 10.1 Logica pura (Vitest)

- Il criterio di §3.3: l'elenco delle differenze **con il verso**. ⚠︎ **Asserisce il NUMERO di righe (cinque sullo
  scenario di §3.2) e i due segni su mercoledì 7.**
- ⚠︎ **L'orizzonte dei conflitti**: un appuntamento **oltre `ORIZZONTE_GIORNI`** che **compare** nell'elenco.
- **La tavolozza di §4.1**, tre parti; ⚠︎ **e la prova sulla FUNZIONE DI VALIDAZIONE con due controesempi che
  falliscono davvero** — una tinta sotto il 3:1 e un quasi-nero dentro la banda.
- La validazione di §3.8: esistenza **prima** dell'ordine; tetti; confini 0–288.
- Le tre condizioni di §5.1.

### 10.2 Database (Vitest su Supabase **locale**)

⛔ **Non mentre un'altra chat esegue le proprie**: due suite sullo stesso database danno **110–114 rosse false**.

- `public.conflitti`: gli appuntamenti giusti **con la precedenza di spec §6.6**; niente a un'estranea e a una
  disattivata; `anon` con `42501`.
- ⚠︎ **`write_exception_days` a insiemi, su 120 giorni con due fasce: 3 esecuzioni e 2 righe al primo salvataggio,
  4 e 4 al risalvataggio** [MISURATO, appendice D]. ⚠︎ **E la prova asserisce anche che nessuna riga di `annuncio`
  ha `giorni[1] is null`**: è il rivelatore del reperto di §6.3, e senza di esso la spazzatura passa.
- ⚠︎ **Le prove che a `write_exception_days` mancano**: intervallo con fasce, invertito, date nulle, risalvataggio,
  e il valore restituito.
- ⚠︎ **L'espansione del giorno della settimana dentro l'orizzonte**, spostata qui da §10.1 perché adesso avviene in
  SQL.
- I trigger estesi (§6.3), **una riga per istruzione**, coi giorni vecchi e nuovi; `update operator set color` che
  **non** ne produce; ⚠︎ **il ramo del vuoto su `salon_closure`**.
- `chiudi_sessioni`: i tre `P0004`, il conteggio, **il quarto e il quinto caso**.
- `40P01` su `operator`: asserito come «almeno un lato fallisce e resta almeno un'operatrice attiva collegata».
- **`23P01`** su tutte e due le tabelle — ⚠︎ **e le due prove provano cose diverse**: su `exception_range` il
  vincolo è chiavato su `exception_day_id` e due chiamate simultanee si scontrano prima sull'`unique` con `23505`.
- ⚠︎ **`23503`** da `delete from service_category` e da `delete from service`, leggendo **il nome del vincolo**;
  **`23505`** da `operator_service`.
- ⚠︎ **L'ordine fra le cascate e i trigger**, tutte e tre `on delete cascade` [misurato, `0006`].
- ⚠︎ **Le fixture creano almeno due operatrici, due date, due clienti e due servizi** (spec §13.2).

### 10.3 Da capo a fondo (Playwright)

- **Prova 6** e **Prova 8** (compresi uscita e rientro).
- ⚠︎ **L'annuncio per VIA**: una Server Action per ciascuna riga del censimento di §7.4. La mutazione dichiarata è
  togliere una scrittura e vedere una prova rossa.

### 10.4 Che cosa le prove non coprono

- **Niente di §9.** Tre giri non l'hanno spostato: è il punto debole strutturale.
- Le finestre di §3.3 e §3.6.
- ⚠︎ **La regressione «nessun annuncio»**: con §6.2 vive nel database e §10.2 la vede. Era il buco della rev. 2.

---

## 11. Dipendenze, e che cosa il 3c chiede e riceve

| Dipendenza | Assunzione | Costo / richiesta |
|---|---|---|
| **Involucro** — 3a-2 **C2** | restituisce il codice al chiamante | ⚠︎ **Nessuna richiesta**: il 3c mappa da sé i suoi codici (§7.2) |
| **Ritentativi** — 3a-2 **C5** | 3 ritentativi dentro la Server Action | Il 3c **consuma** |
| ⚠︎ **La ricarica del giorno rilegge `operator`** | — | ⚠︎ **RICHIESTA AL 3a-2** (§6.3): senza, l'annuncio di un'operatrice nuova è inerte |
| **Il polling dei 60 s** — 3a §4.6, [proposta] | che sopravviva | Se cade, il ripiego più corto diventa la mezzanotte di Perugia |
| ⚠︎ **`write_exception_days` a insiemi** | — | ⚠︎ **RICHIESTA ALL'ORCHESTRATRICE** (§13.16). Costo vero: **scrivere le prove che mancano** — la funzione ha zero chiamanti e una sola prova [misurato] |
| **`annuncio`** — Task 8, committato | che la forma resti | ⚠︎ §6.2 **riscrive** `app.annuncia_giorni()` con sei rami: non è un'estensione |
| ⚠︎ **`operator.color`** — Task 10 | — | ⚠︎ **Disallineamento MISURATO**: `0001` semina `#7B3F61` e `#2F6F6B`, e 3a §4.1 punto 7 lo documenta già. Con **D3c-8** anche `#9B1B1B` va rideciso: **richiesta all'orchestratrice** |
| **Audit** — Task 9 | uguaglianza esatta | Medio per D9 |
| ⚠︎ **Spec 3b** — **revisione 2, `69f5dd5`** [misurato], dopo il suo primo giro | — | **Rivendica `0022` e nomina il 3c**: il numero lo assegna l'orchestratrice (§13.24). Scrive sullo stesso canale (D3b-9): §13.25. ⚠︎ **E manda al 3c tre cose, tutte accolte alla rev. 4:** i **due cancelli privacy** di spec §14 domande 2 e 4 → **§9.2 Z1a, Z1b, Z1d**; la **procedura manuale per una richiesta di accesso** → **§9.14**; il rimando su `salon_settings` come fascia di ripiego del cercaposti (D3b-2) → **§4.6**, con la risposta alla sua domanda. ⚠︎ **E una cosa che il 3c NON si prende**: gli stati vuoti delle tre schermate del 3b sono del 3b; il solo rimando è dal cercaposti al primo avvio (§5.1) |
| ⚠︎ **Piano 4 — cinque richieste RICEVUTE**, non tre | — | **(a)** le tre voci condivise e la voce nuova di §8.7 → accolta F4; **(b)** la sezione Impostazioni letta uguale → fatta; **(c)** ⚠︎ *«la voce «esistenza e prova di un ripristino» torna viva e cambia bersaglio: non il backup del fornitore ma la copia settimanale di D4-6, da rimettere dentro una volta a mano prima del rilascio»* → **§9.7 E2 va condizionata anche a D4-6**; **(d)** ⚠︎ *««le visite cancellate sono perse per sempre» con D4-6 non è più vero, e con esso il passo 6»* → **§8.5**; **(e)** ⚠︎ *«la procedura di ripristino va scritta LÌ: il 3c è il documento delle procedure»* → **§9.12 passo 9, §13.27** |
| ⚠︎ **Piano 4 — tre richieste FATTE** | — | ricondizionare ad A2 le sue sei sedi e rileggere **D4-6**; iscrivere nel censimento **`public.conflitti`** e **i dump di §9.12**; l'informativa nomina **i cookie** |

---

## 12. Letture dichiarate della spec

- **L3c-1** — spec §9.8 «drag»: il trascinamento delle fasce non si costruisce.
- **L3c-2** — spec §9.8 «pre-fills»: sull'intervallo il 3c **non estende la precompilazione**; mostra l'elenco delle
  differenze.
- **L3c-3** — spec §9.9 «export, retention review»: dentro Impostazioni, costruite dal piano 4.
- **L3c-4** — spec §9.11, il contrassegno: **nessuno lo costruisce**.
- **L3c-5** — 3a §4.7 «ripristinarle dal backup»: condizionata ad A2 **e a D4-6**. 3a lo dice in **due** punti.
- **L3c-6** — spec §7.6 «phone numbers»: il **nome** è una decisione del 3c e si tiene; i **servizi** si tolgono.
- **L3c-7** — spec §9.10: sono **tre** condizioni.
- **L3c-8** — spec §4.2: passphrase generate nel gestore del salone.
- **L3c-9** — ⚠︎ **ritirata alla rev. 4.** Diceva che «Light, not dark» è il tema dell'app. §2.3 spiega perché
  l'argomento era falso.
- ⚠︎ **L3c-10** — spec §9.12 «Light, not dark» = **dentro la banda che il 3:1 consente, verso il deep rose e non
  verso l'inchiostro** (**D3c-8**). È l'unica lettura che non contraddice nulla, e dà un **pavimento** che né D3-6
  né D3c-6 avevano.

---

## 13. Aperto, da decidere o misurare

1. **Il tetto dell'intervallo** (§3.8): 120 **[proposta]**, **dominio**. Il `check` di tabella si scrive **dopo**.
2. ⚠︎ **Dove vive l'orizzonte** (§6.5), ora che l'annuncio è nel database e `ORIZZONTE_GIORNI` è TypeScript.
3. **`p_attesi` su `write_exception_day`** (§3.7).
4. **Il rifiuto del duplicato esatto** (§7.4) — ⚠︎ **non coperto dal «no» di §6.2**.
5. **Le azioni tolte alle operatrici**: ⚠︎ **ne resta UNA**, la disattivazione/scollegamento sulla propria riga
   (§4.2). Quella sull'orario del salone è **ritirata**: spec §9.1 espande la finestra verticale, quindi il difetto
   che il vincolo rimediava non esiste (§4.6).
6. **Il minimo della password** (§9.4 C1), **dominio**, in tensione con D3c-1. ⚠︎ Da chiudere in **sessione 0**.
7. **Se abbassare `jwt_expiry`** (§9.4 C11).
8. ~~Funzione di scrittura propria per l'annuncio~~ — **chiusa con un NO** ⚠︎ **limitato all'annuncio**.
9. **La voce «fuori orario»** (§3.6), **dominio**.
10. **Se il catalogo è dentro «disponibilità e chiusure»** (§6.3). **Orchestratrice.**
11. **Chi disegna il contrassegno di spec §9.11.** **Orchestratrice.**
12. **Il vincolo di database sulla tavolozza** (§4.1). **Orchestratrice.**
13. **L'elenco delle funzioni eseguibili da `anon`**: ⚠︎ **ricostruito** in D10; 3a §10 lo tiene aperto come scelta.
14. **`23505` su `write_exception_day` concorrente** (§3.7): **[da misurare]**.
15. ⚠︎ **La tavolozza sotto D3c-8**: il **pavimento di luminanza** della parte 2, il pavimento **ΔE** della parte 3,
    e **il colore nuovo di Alessandra**.
16. ⚠︎ **`write_exception_days` a insiemi** (§6.2): **orchestratrice**, funzione del piano 1.
17. ⚠︎ **Dove vivono i codici di ripristino del secondo fattore** (§9.8 F6): se stanno sul telefono operativo, §8
    non parte. **Sessione 0.**
18. **Se l'orario del salone abbia bisogno di un annuncio** (§6.3). ⚠︎ **Il secondo consumatore è il cercaposti del
    3b**, che legge quei due confini come fascia di ripiego e li tiene nell'impronta del cursore. Ma dopo il
    ritiro di §4.6 il danno è **un'etichetta stantia, non un appuntamento invisibile**, e il canale porta **date**
    mentre qui servirebbe un altro verbo: **[proposta] non si annuncia**, e il 3b rilegge `salon_settings` a ogni
    pagina se vuole chiudere anche l'etichetta.
19. ⚠︎ **La distinzione fra disponibilità e occupazione** (§6.5), **rovesciata** nella rev. 3 e riscritta qui.
20. **Se `authenticated` debba conservare DELETE** sulle quattro tabelle della disponibilità (§8.4 punto 6).
21. ⚠︎ **Dove vive il gestore di password del salone e chi lo apre** (§9.6 D0), **dominio**. **Sessione 0.**
22. ⚠︎ **Il secondo fattore sulle tre operatrici è funzione del piano Pro** (§9.8 F6): dipende da A2.
23. ⚠︎ **Spec §12.8** (§9.11), **dominio**.
24. ~~Il numero di migrazione del 3c~~ — ⚠︎ **CHIUSO: `0023`** [assegnato dall'orchestratrice via la chat del 3b,
    28/09]. 3b → `0022`, 3c → **`0023`**, piano 4 → `0024`. ⚠︎ **E il nome è a cifre sole**: se servisse infilare
    una migrazione fra due numeri, la forma è `00231_nome.sql`, che ordina fra `0023` e `0024` perché il CLI
    confronta i prefissi come stringhe. **Mai `0023a_`**: il CLI la salta in silenzio (§9.3 A4).
25. ⚠︎ **Chi possiede la pulizia di `annuncio`** ora che gli scrittori sono tre (§6.6).
26. ⚠︎ **Se la ricarica del giorno rilegga `operator`** (§6.3): richiesta al 3a-2, o la riga INSERT torna a
    «niente».
27. ⚠︎ **Il comando di ripristino** (§9.12 passo 9): il piano 4 lo assegna al 3c, e senza di esso il dump non è una
    copia.
28. **Che cosa dice davvero il piano Supabase** (§9.3 A2): **[da misurare]**.
29. ⚠︎ **Come si verifica l'identità di chi chiede l'accesso**, e **se il nome dell'operatrice si consegna**
    (§9.14 passi 1 e 3). **Dominio**, e il piano 4 la eredita quando sostituisce la procedura.
30. ⚠︎ **Se `no_messages` va rovesciato in un consenso** (§9.2 Z1d): dipende dalla risposta alla domanda 2 di
    spec §14, e **è una migrazione sul database vivo** (§9.12). Il default oggi è `false`, cioè «messaggiabile»
    [misurato, `0003`].
31. **Le quattro domande di spec §14** (Z1a): bloccanti, **non del 3c** — ⚠︎ ma **due di esse fermano il rilascio
    per via del 3b** (Z1b, Z1d).

---

## 14. ⚠︎ Le misure che servono, e perché la lettura non basta più

**Sezione nuova alla revisione 4**, ed è la conclusione del terzo giro.

Tre giri, quindici revisori, 21 → 30 → 29 bloccanti. Ma il **genere** dei reperti è cambiato: il censimento delle
marche è passato da **3 falsi su 76** a **0 su 64**, e un revisore ha dichiarato **dieci classi pulite con
l'istruzione di non rimisurarle**. **Il documento converge sui fatti e non converge sul progetto** — e non converge
nelle due zone in cui i reperti si chiudono **solo eseguendo**.

### 14.1 ⚠︎ **ESEGUITE il 28 settembre 2026** — banco usa-e-getta, appendice D

**Come**: un contenitore Postgres **17.6** a sé (la stessa versione del progetto [misurato]), porta 55432, con una
**riproduzione minima** — `exception_day`, `exception_range` con la cascata e il vincolo di esclusione, `annuncio`
col suo `check`, i sei trigger per istruzione, e una tabella-spia che conta le **esecuzioni** oltre alle righe.
⚠︎ **Mai il database del progetto**: i suoi dodici contenitori non sono stati toccati, e il banco è stato rimosso.

**Esito: sei su sei chiuse. Tre smentiscono il documento, due smentiscono anche i revisori, una ha trovato un
reperto nuovo.** I numeri sono in appendice D; le conseguenze sono già dentro §3.7, §3.8, §6.0, §6.2, §6.3, §6.4,
§7.2 e §10.2.

### 14.1-bis Le misure che restavano, e che ora non ci sono più

| # | Che cosa | Perché |
|---|---|---|
| 1 | **Quante istruzioni esegue davvero** `write_exception_days` a insiemi su 120 giorni, e **quante righe di `annuncio`** produce | §6.2 dice «tre»; un revisore conta ~123 per via della cascata. §10.2, §9.10 H7 e §6.6 ci poggiano sopra |
| 2 | **Se un trigger per istruzione con tabelle di transizione scatti su una `delete` generata dalla cascata RI**, e quante volte | 3b §7 lo dichiara **[da misurare]** per conto proprio: due documenti fermi sulla stessa domanda |
| 3 | **Se l'`insert` dentro una CTE che modifica i dati popoli la tabella di transizione** | Decide se la forma a insiemi conserva l'annuncio |
| 4 | **Se `write_exception_day` concorrente dia `23505`** (§3.7) | |
| 5 | **`generate_series` con un argomento nullo** (§3.8 punto 2) | |
| 6 | **L'errore di `app.annuncia_giorni()` su una tabella senza `visit_date`**: a creazione o a runtime | §6.2: se è a runtime, la migrazione si applica verde e **la prima eccezione salvata fallisce** |

### 14.2 Le misure che restano, e richiedono un progetto usa-e-getta **ospitato**

| # | Che cosa | Perché |
|---|---|---|
| 7 | **Il comando di ripristino di §9.12 passo 9**, provato | Senza, §9.12 produce una copia che nessuno sa ripristinare, e §2.5 ed E3 non possono contarla |
| 8 | **Se `--data-only` si ripristini su uno schema già migrato** | Chiavi esterne, `session_replication_role`, e `auth` che il dump di dati include e quello di schema esclude |
| 9 | **Quale `enable_signup` vinca** (§9.4 C2) | Si prova, non si legge |
| 10 | **Il limite anti-forza-bruta** (§9.6 C9) | È l'unica difesa dell'unica credenziale |

### 14.3 E §9 si prova eseguendola

Il terzo giro ha trovato **undici bloccanti in §9** con l'unico mandato che la **simulava** invece di auditarla —
dopo che due giri l'avevano auditata riga per riga. **La prossima verifica utile di §9 è una prova a vuoto su un
progetto usa-e-getta**, non un quarto revisore.

---

## 15. Divergenze fra spec e realtà, trovate e **non** corrette

1. **3a §4.7 promette in DUE punti un ripristino da backup** condizionato ad A2 e a D4-6 (§8.5).
2. **3a §8.7 comincia con «sul progetto ospitato», e il repo non è collegato** (§9.1).
3. **3a §8.7 non elencava accessi anonimi né emittenti di token esterni** (§9.4 C3, C4).
4. **3a §8.7 non elencava il limite anti-forza-bruta sugli accessi con password** (§9.6 C9).
5. **3a §8.7 non elencava il minimo della password** (§9.4 C1).
6. **La pulizia di `annuncio` e di `visita_cancellata` vive in `app.chiudi_invio`**, sul solo percorso delle visite.
7. **`write_exception_day` non ha guardia di versione**, e il caso concorrente ha un esito non misurato.
8. **`write_exception_days`** restituisce `0` senza errore su intervallo invertito **e su data nulla**, e il valore
   restituito è **muto**.
9. **`chiudi_sessioni` restituisce 0 senza errore in DUE casi.**
10. **`23503` da `delete from service_category` riceve dal 3a una frase che dice il contrario del vero**; e `23505`
    da `operator_service` cade nel ramo generico.
11. **I numeri di riga di `config.toml` citati dalla spec 3a sono superati**, nelle righe che §8.7 manda a
    verificare. Misurato con la causa e l'aritmetica: il commento sopra `sign_in_sign_ups` occupa 29 righe
    (206–234) e le tre sedi sono scivolate **di esattamente 29** — 220 → **249**, 227 → **256**, 206 → **235** (e
    vale **300**, non 30) — mentre la 175 non si è mossa perché sta **sopra** il blocco. ⚠︎ Le **occorrenze**
    superate sono **cinque**, non quattro: `secure_password_change` è citato **due** volte (righe 732 e 1056) e
    `sign_in_sign_ups` **due** (743 e 1264).
12. **L'ordine dei passi di 3a §4.7 può finire col salone fuori e chi ha il telefono dentro** (§8.2).
13. **3a §4.7 non elenca lo scollegamento delle colleghe né la distruzione della loro disponibilità** (§8.4).
14. **Spec §12.11 dichiara accettabile il limite sul `TRUNCATE` perché resta «only the database owner»**: D3c-3 ne
    crea due umani.
15. ⚠︎ **AUTO-ACCUSA.** La **revisione 2** ha citato `0009` troncando *«measured reachable and exploitable»* prima
    di «before this EXISTS clause was added», e con quella citazione ha **chiuso una divergenza fra due revisori**
    (appendice A). Conclusione giusta, fonte sbagliata (§4.3).
16. ⚠︎ **AUTO-ACCUSA.** La **revisione 2** ha propagato *«`grep` dà zero occorrenze di MFA»* marcandola
    `[dalla revisione]` **senza verificarla**, ed era falsa (§9.8 F6).
17. ⚠︎ **AUTO-ACCUSA, la più grave.** La **revisione 2** ha inventato una contraddizione in spec §9.12 e vi ha
    costruito **D3c-6**; la **revisione 3** l'ha revocata con un argomento **falso e auto-confutante**. In tutte e
    due i casi all'utente è arrivata **una lettura sola**, presentata come l'unica. §2.3.
18. ⚠︎ **AUTO-ACCUSA.** La **revisione 3** ha scritto in §9.12 un comando che **non copia nessun dato**, e una
    verifica costruita per non vederlo (§9.12).
19. **Spec §9.8 dice «drag»** e il 3c non lo costruisce (L3c-1): è una scelta, non un difetto della spec.

---

## 16. Dove si ferma la revisione di questo documento

**Tre giri, quindici revisori, zero giri senza bloccanti.** Il criterio proposto — due giri di fila puliti — non è
vicino, e la spec 3a ne ha impiegati sette.

⚠︎ **Ma il quarto giro non deve essere il quarto giro uguale.** §14 lo dice: le zone che non convergono sono due, e
in tutte e due i reperti si chiudono **solo eseguendo**. Un revisore del terzo giro ha chiuso il proprio referto
così: *«Non rimisurare al quarto giro la classe «esistenza di altri documenti», le citazioni verbatim, l'aritmetica
dei colori, le nove citazioni di `config.toml`, D6/D9/D10, la propagazione di D3c-5 e il ritiro di §6.3-rev2. Le ho
aperte tutte e sono pulite; il quarto giro guardi le correzioni di queste.»*

### 16.1 Dove chi scrive si sente debole, alla revisione 4

1. ⚠︎ **Il difetto che meno so presidiare: le mie letture sbagliate arrivano all'utente come alternative
   ragionevoli.** Due volte su §9.12, e tutte e due le volte con **una lettura sola** presentata come l'unica. La
   terza lettura — quella che l'utente ha scelto — **nessuno dei tre giri l'aveva vista**, e l'ha trovata il
   revisore incaricato di controllare se avevo corretto troppo. **Quel mandato va rifatto a ogni giro.**
2. ⚠︎ **Il confine di lettura è il difetto ricorrente.** Tutte le marche false dei tre giri, e tre bloccanti del
   terzo, nascono da sezioni **non dichiarate in §0** — 3a §4.1, piano 4 §12.1, `00051`.
3. ⚠︎ **§9 resta non provabile**, ed è la sezione che apre il salone. Tre giri: 15, 18 e 18 voci bocciate.
4. ⚠︎ **§6 è alla quarta forma**, e le prime tre erano sbagliate. Le sei misure di §14.1 vanno fatte **prima** che
   §6.2 diventi una migrazione.
5. ⚠︎ **§9.12 è alla seconda forma e la prima era rotta nel comando.** Il passo 9 — il ripristino — **non ha ancora
   un comando**.
6. ⚠︎ **Le revisioni 1–3 sono state sovrascritte**: ogni tesi su di esse è, da oggi, non verificabile. Dalla rev. 4
   si archivia prima di sovrascrivere.
7. ⚠︎ **D3c-2 resta sospesa in tredici sedi**, e sei di quelle che contano sono **in un altro documento** che ci ha
   già costruito una decisione a valle.
8. ⚠︎ **§9.14 è nata da una chat sorella, non da un mio giro.** Tre revisori di tre giri hanno guardato §9 e
   nessuno ha visto che fra la fine del 3c e il piano 4 **accesso e portabilità non hanno percorso**, con un mese
   di termine. L'ha vista il **3b**, perché è il piano che apre la raccolta. ⚠︎ **Il mio perimetro lo guardo solo
   dall'interno**, e i buchi fra i piani li vedono i vicini.
9. ⚠︎ **La tavolozza sotto D3c-8 non esiste**, e il pavimento di luminanza è **[proposta]**: il criterio nuovo mette
   in discussione un colore che un altro piano sta per consegnare.

---

## Appendice A — Registro del primo giro (28 settembre 2026)

Cinque revisori, mandati disgiunti. **21 bloccanti, 42 maggiori, 18 minori.**

| Revisore | Mandato | Esito |
|---|---|---|
| 1 | §9 come procedura eseguibile, e §8 | 5 bloccanti; **15 voci non eseguibili** |
| 2 | Ogni affermazione contro il codice | 1 bloccante; **36 `[misurato]`: nessuno falso** |
| 3 | Perimetro e rimandi | 3 bloccanti |
| 4 | Le decisioni e D3c-2 | 10 bloccanti; **19 sedi in cui il backup era presupposto: 8 mancate** |
| 5 | §3, §6, §7 e le schermate | 4 bloccanti |

**I cinque che cambiarono il progetto:** la precompilazione che crea disponibilità; l'annuncio da 240 messaggi;
l'ordine di §8; la funzione di conflitto che riscriveva il risolutore in SQL; il vincolo sui colori che rompeva una
prova verde.

**Convergenze:** il limite anti-forza-bruta (tre revisori); «operatrici fuori dal team» (due); il fuso rovesciato
(due).

⚠︎ Questa appendice dichiarava chiusa una divergenza sul «quinto caso» di `chiudi_sessioni` **con una citazione
troncata** (§15 voce 15). Il caso esiste, ma per la soglia `remaining = 0` del corpo.

---

## Appendice B — Registro del secondo giro (28 settembre 2026)

Cinque revisori nuovi, mandati diversi. **~30 bloccanti.**

| Revisore | Mandato | Esito |
|---|---|---|
| 1 | **Le correzioni del primo giro** | 3 bloccanti; **nove correzioni applicate a metà** |
| 2 | **Censimento integrale** | **83 occorrenze, 76 di fatto: 72 vere, 3 false, 1 superata.** Nessuna sede corretta a metà: togliendo i numeri di riga la classe è stata **estinta** |
| 3 | §6 e §7 | 4 bloccanti; il censimento indipendente delle scritture ne trovò **7 in più** |
| 4 | §9 e le fasi nuove | 11 bloccanti; **18 voci non eseguibili**; la Fase B copriva **10 punti su 28** |
| 5 | Le decisioni mai riviste | 10 bloccanti; **le tre decisioni nuove erano sbagliate tutte e tre** |

**I sei che cambiarono il progetto:** la diagnosi di §6 sbagliata; le tre decisioni; la sospensione a senso unico;
«la spec 3b non esiste» falso; D7/D8/H5 che non discriminavano; l'elenco delle differenze con un segno solo.

⚠︎ **La lezione:** il documento ha ceduto **dove nessuno guardava** — tre affermazioni sull'esistenza di altri
documenti, chiudibili con un `ls` — e ha retto **dove tutti guardavano**.

---

## Appendice C — Registro del terzo giro (28 settembre 2026)

Cinque revisori, mandati ancora diversi. **29 bloccanti**, e un verdetto che conta più del numero: §14.

| Revisore | Mandato | Esito |
|---|---|---|
| 1 | **Le correzioni della rev. 3** | 7 bloccanti; **nove correzioni a metà delle loro sedi**; **otto punti di §13 chiusi di fatto** |
| 2 | **§6 terza forma e §9.12** | 6 bloccanti; ⚠︎ **ha ESEGUITO `db dump --dry-run`** e misurato che il comando non copia dati; ha contato **123 istruzioni** dove il documento ne dichiarava tre |
| 3 | ⚠︎ **L'esecuzione simulata di §9** invece dell'audit | **11 bloccanti**, di un genere che due audit non avevano toccato: il piano delle sessioni, i punti in cui la giornata si ferma, che cosa resta sul progetto vero |
| 4 | ⚠︎ **«Le correzioni sono giuste, o hai corretto troppo?»** | 1 bloccante — **ed è il più importante del giro**: la revoca di D3c-6 poggiava su un argomento falso. **Più dieci ASSOLUZIONI** |
| 5 | **Coerenza interna** | 4 bloccanti; **594 rimandi verificati con tre spie, 4 rotti**; **93 marche, 64 aperte, ZERO false**; **dieci classi dichiarate pulite** |

**I sei che hanno cambiato il progetto:**

1. ⚠︎ **`supabase db dump` senza `--data-only` non copia nessun dato**, e la verifica era costruita per non vederlo.
2. ⚠︎ **La revoca di D3c-6 poggiava su una contraddizione che non esiste**, e la lettura vera nessuno l'aveva vista:
   §2.3, D3c-8.
3. ⚠︎ **L'elenco delle differenze perdeva due dei cinque giorni** — il difetto sopravvissuto nel proprio rimedio per
   la terza volta.
4. ⚠︎ **C12 non esisteva**: citata due volte, definita zero, e la riordinatura delle fasi si giustificava con lei.
5. ⚠︎ **§9 non sta in una giornata**: §9.13.
6. ⚠︎ **Il 3c aveva raccolto una sola delle cinque richieste che il piano 4 gli manda.**

**Le assoluzioni**, che valgono quanto i reperti: **93 marche, zero false**, e la classe «esistenza di altri
documenti» — che aveva ceduto due volte — **adesso regge**; 22 citazioni verbatim **tutte fedeli**; nove citazioni
di `config.toml` esatte; l'aritmetica dei colori giusta su sei numeri; **D6, D9 e D10 contati e confermati da due
revisori indipendenti**; D3c-5 assolta; D7 e D8 che adesso discriminano; la propagazione di D3c-5 e il ritiro di
§6.3-rev2 **completi in ogni sede**; i 35 rimandi a §13 tutti giusti **su una lista rinumerata da 16 a 26 punti**.

---

## Appendice D — Registro delle misure (28 settembre 2026, 14:05–14:25)

**Banco:** contenitore Postgres **17.6** a sé, porta 55432, riproduzione minima delle tabelle e dei trigger.
⚠︎ **Il database del progetto non è stato toccato**: i suoi dodici contenitori erano in piedi e sono rimasti
intatti, nessuna suite di `salon-scheduler` era in esecuzione (il Vitest attivo sulla macchina era di un altro
repo), e il banco è stato rimosso a misure finite.

**Perché un banco e non il database locale del progetto:** due suite sullo stesso database danno 110–114 prove rosse
false. Un contenitore a sé non collide con nessuno, e una riproduzione minima **isola la domanda** invece di
trascinarsi dietro `auth`, la sicurezza per riga e dodici migrazioni.

### I numeri

**Misura 1 — quante istruzioni e quante righe, su 120 giorni con due fasce**

| Forma | Momento | Esecuzioni del trigger | Righe di `annuncio` |
|---|---|---|---|
| **a ciclo** (oggi) | primo salvataggio | **480** | **360** |
| **a ciclo** | risalvataggio | **600** | **600** |
| **a insiemi** (§6.2) | primo salvataggio | **3** | **2** |
| **a insiemi** | risalvataggio | **4** | **4** |

⚠︎ **Tre cose che questa tabella smentisce.** Il primo giro misurava «fino a 240» per la forma a ciclo: con due
fasce sono **600**. La revisione 3 scriveva «tre istruzioni, tre righe» per la forma a insiemi: sono **quattro**. Un
revisore del terzo giro deduceva «~123 istruzioni eseguite» per via della cascata: sono **quattro**.

**Misura 2 — la cascata fa scattare il trigger per istruzione del figlio?**

**SÌ, una volta per ISTRUZIONE di padre** — non una per riga, che era la deduzione. Una `delete` che cancella tre
giorni e tre fasce fa scattare il trigger di `exception_range` **una volta**, con **tre righe** nella tabella di
transizione. Nella forma a ciclo, dove il padre si cancella un giorno per volta, scatta **120 volte**.

⚠︎ **E il reperto che tre giri di lettura non avevano trovato:** sul percorso della cascata il trigger figlio **non
può risalire alla data** — il padre è già sparito — e **non resta muto**: `array_agg` su tutti nulli produce
`{NULL}`, un array di **cardinalità 1**, che **passa** il `check (cardinality(giorni) > 0)` di `0019`. Misurato:
una cancellazione di tre giorni produce **due** righe di `annuncio`, una con le tre date e una con `{NULL}`. Ogni
cancellazione manderebbe ai telefoni **una riga di spazzatura sul canale**. Conseguenze in §6.3 e §10.2.

**Misura 3 — una CTE che modifica i dati popola la tabella di transizione?**

**SÌ.** `with giorni as (insert … returning id) insert into exception_range … select from giorni` fa scattare
**entrambi** i trigger, una volta ciascuno, con le righe giuste e **le date risolte**. Quindi la forma con CTE —
proposta da un revisore come rimedio alla ri-selezione concorrente — **conserva l'annuncio**.

**Misura 4 — due `write_exception_day` simultanee sulla stessa (operatrice, data)**

La seconda sessione vede `DELETE 0` — non può vedere la riga non ancora committata della prima — e il suo `insert`
fallisce con **`23505 duplicate key value violates unique constraint
"exception_day_operator_id_exception_date_key"`**; la transazione **si annulla**. ⚠︎ **Nel caso concorrente non c'è
sorpasso silenzioso: c'è un errore**, e va mappato (§7.2). §13.14 è chiuso.

**Misura 5 — `generate_series` con un argomento nullo**

**Zero righe**, esattamente come un intervallo invertito. Il difetto di §3.8 punto 2 è confermato: la validazione
deve guardare **l'esistenza prima dell'ordine**.

**Misura 6 — un dispatch cablato su una tabella che non ha la colonna**

Il trigger **si crea senza errori** (`CREATE TRIGGER`), e la **prima scrittura** fallisce a runtime con
`ERROR: column n.visit_date does not exist`. ⚠︎ Confermata la previsione di §6.2: attaccare `exception_day` alla
`app.annuncia_giorni()` di oggi farebbe applicare la migrazione **verde**, e **la prima eccezione salvata
fallirebbe**. Va riscritta, non estesa.

### Che cosa hanno insegnato, oltre ai numeri

1. ⚠︎ **Due deduzioni di revisori su due erano sbagliate**, e tutte e due nel verso che rassicura: «~123 istruzioni»
   (erano 4) e «il trigger figlio resta muto» (scrive spazzatura). **Una deduzione su una semantica del database non
   è una misura**, nemmeno quando la fa un revisore attento.
2. ⚠︎ **Il reperto peggiore non era in nessun elenco.** Le sei misure erano state scelte per rispondere a domande
   che i giri avevano posto; la riga `{NULL}` non rispondeva a nessuna di quelle domande — **è comparsa perché la
   spia contava le esecuzioni oltre alle righe**, e i due numeri non combaciavano.
3. **Il guadagno della forma a insiemi è più grande di quello che il documento rivendicava**: da 600 a 4, non da
   240 a 3.
