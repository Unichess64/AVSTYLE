# Prompt per la chat che eseguirà il Task 10 del piano 3a-1

Sei l'esecutrice del **Task 10** del piano 3a-1 del progetto `salon-scheduler`, l'agenda interna del centro estetico
AVStyle di Perugia. Lavori in `/Users/nadiaottavi/Desktop/Git/salon-scheduler`, ramo `main`.

**Regime di lavoro:** dal 02/10/2026 vale il regime leggero di
`docs/superpowers/plans/2026-10-02-consegna-ridotta.md` §3. Leggilo per primo: sono dieci righe.

## Ingresso

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
git status --short | grep -v '\.DS_Store\|^?? docs/\|^?? .superpowers/\|^ M docs/handoffs/'
ls supabase/migrations/ | tail -2
```

Atteso: la prima riga non stampa niente, e l'ultima migrazione è `0020_revoca_move_visit.sql`. Se trovi file
modificati in `supabase/`, `tests/` o `src/`, fermati e avvisa: vuol dire che un'altra chat sta lavorando sull'albero.

## Il compito

Esegui il **Task 10** di `docs/superpowers/plans/2026-09-23-piano-3a1-fondamenta-scrittura.md` (riga 4549 circa,
«ricerca delle clienti, doppioni e colori»), passo per passo come è scritto: prima le prove che falliscono, poi la
migrazione `0021_ricerca_e_colori.sql`. Prima di cominciare leggi le appendici di esecuzione dei Task 7 e 9 in fondo
al piano: contengono le trappole già misurate su questo banco.

Vincoli che il testo del task contiene già, ma che non devono sfuggire:
- `cerca_clienti` e `doppioni_cliente` sono **funzioni chiamate in POST**, mai viste e mai filtri PostgREST: il
  nome o il telefono nella querystring finisce nei log.
- Una funzione nuova nasce con `EXECUTE` concesso ad `anon` per i default di Supabase: serve il **revoke**
  esplicito. L'audit di catalogo arrossisce se lo dimentichi, e questo è il suo compito.
- `pg_trgm` va nello schema `extensions`.

## Chiusura

1. `./node_modules/.bin/supabase db reset`, poi `npx vitest run`: **suite intera, una sola alla volta**. Deve essere
   tutta verde, e il totale deve superare le 440 prove di partenza.
2. Una sola mutazione dimostrativa: togli il `revoke` ad `anon` su una delle due funzioni e verifica che almeno una
   prova diventi rossa. Poi ripristina, fai un **reset** (ripristinare il file non ripristina il database) e
   rilancia la suite.
3. Commit con un messaggio in italiano nello stile di `git log`, che termina con
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Non fare push.**
4. Aggiungi in fondo al piano un'appendice breve, «Esecuzione del Task 10», di 10-20 righe al massimo: che cosa
   hai fatto, il numero delle prove, la mutazione e il suo esito, e le eventuali divergenze dal testo del piano.
5. Rispondi con lo SHA del commit e quelle stesse righe.
