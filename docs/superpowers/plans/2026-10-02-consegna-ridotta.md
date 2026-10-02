# Consegna ridotta ad AVStyle — ordine dei lavori e regime delle revisioni

**Data:** 2 ottobre 2026. **Decisione dell'utente** (D-CONS-1): si passa dall'«ambito pieno prima del primo uso» a una
**prima consegna ridotta**, e le revisioni si alleggeriscono (D-CONS-2). Questo documento prevale sull'ordine implicito
dei piani 3a-2, 3b, 3c e 4 dove li contraddice.

Punto di partenza: HEAD `a4135ad`, 440 prove verdi su 27 file (suite intera, 02/10/2026 14:54).

## 1. Che cosa entra nella prima consegna

| # | Lavoro | Base | Stato al 02/10 |
|---|---|---|---|
| 1 | 3a-1 Task 10 (ricerca clienti, doppioni, colori) e Task 11 (cinque presidi) | piano 3a-1 | da eseguire |
| 2 | 3a-2, tutti e 12 i task (le schermate) | piano 3a-2, revisione 4 — **congelato, niente altri giri** | da eseguire |
| 3 | 3c **ridotto**: disponibilità (§3), impostazioni (§4), primo avvio (§5), procedura «telefono perso» (§8), verifiche prima del rilascio (§9) | spec 3c, revisione 6 | piano da scrivere |
| 4 | Messa online: progetto Supabase in cloud (regione UE), hosting dell'app, i tre account | §9 della spec 3c | piano da scrivere insieme al 3 |
| 5 | Piano 4 **minimo**: la cancellazione a scadenza dei dati personali | spec piano 4, revisione 3 | piano da scrivere |

Il punto 5 sta nella consegna perché da quel giorno l'app contiene nomi e telefoni veri. L'obbligo di cancellarli
matura dopo, ma il meccanismo deve esistere prima che maturi. Il resto del piano 4 passa alla fase 2.

## 2. Che cosa passa alla fase 2

- **3b intero**: cercaposti a schermo e «+» flottante (D3b-13), schermata Clienti, compleanni. Il motore del
  cercaposti esiste già (piano 2): manca solo la sua schermata. Le clienti nuove si creano dalla scheda visita (3a).
- **3c §6**: l'annuncio in diretta dei cambi di disponibilità e chiusure. Nella consegna 1 chi cambia la disponibilità
  la vede subito; sugli altri telefoni compare alla ricarica successiva.
- Del piano 4: tutto tranne la cancellazione a scadenza.

⚠︎ **L'unico file che il 3b modificherà dopo** è `src/cliente/agenda-colonne.tsx` (piano 3a-2). Non serve un
segnaposto: il «+» lo aggiunge il 3b.

## 3. Il regime delle revisioni (D-CONS-2)

Il vecchio regime prevedeva 6-7 giri per documento, 4-5 revisori, l'audit delle mutazioni a ogni task e i prompt
d'ingresso con il controllo dei SHA. Ha prodotto un motore robusto, ma con quel ritmo la consegna arriverebbe a
metà novembre. Il regime nuovo è questo:

1. **Piani già scritti** (3a-1, 3a-2): congelati. Niente altri giri sul documento. Un errore trovato durante
   l'esecuzione si corregge nel codice e si annota in una riga nell'appendice di esecuzione.
2. **Piani nuovi** (3c ridotto, piano 4 minimo): **un solo giro** di revisione avversariale, **un solo revisore**.
3. **Ogni task**: una chat fresca lo esegue e chiude con la suite intera verde, poi **un solo revisore** guarda il
   diff. Niente audit delle mutazioni per task.
4. **Rigore pieno, cioè due revisori con lenti diverse e le mutazioni sui presidi, SOLO dove il danno è grave**: politiche di
   sicurezza per riga, grant e funzioni `security definer`, sessioni e accesso, cancellazione dei dati personali.
   Fra quelli rimasti, sono i Task 3 e 4 del 3a-2, il 3c §8 e il piano 4 minimo.
5. **Regola di arresto**: blocca solo un reperto che fa danno reale su un percorso raggiungibile. Tutto il resto
   si annota e passa alla fase 2.
6. **Prompt per le chat**: corti. Si indicano il task, il piano da leggere e i vincoli che il piano non contiene. Il
   controllo d'ingresso si riduce a `git status` più la suite verde, senza catene di SHA.
7. **Restano invariati**: suite intera eseguita in serie (mai due insieme), ritentativo su `40P01`, nessun push di
   iniziativa automatica.

## 4. Stima

Circa 20-22 chat di esecuzione: 2 (3a-1), 12 (3a-2), circa 6 (3c ridotto e messa online) e circa 2 (piano 4 minimo).
Al ritmo di 1-2 task al giorno sono **due o tre settimane**: la consegna cade fra il 20 e il 25 ottobre 2026.

## 5. Che cosa serve dall'utente per la messa online

Questi passi non li posso fare io, perché richiedono account e pagamenti:
- creare il progetto Supabase in cloud (regione UE);
- creare l'account di hosting (consigliato Vercel);
- scegliere il dominio, per esempio un sottodominio di `avstyle.it`;
- avere le email delle tre operatrici per i loro account.
