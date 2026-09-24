# Piano 3a-1 — Le fondamenta della scrittura

> **Per chi esegue:** questo piano si esegue in una **chat fresca lanciata dall'utente**, un task alla volta, con
> l'orchestratrice che rivede fra un task e l'altro. **Non** si applicano `superpowers:subagent-driven-development` né
> `superpowers:executing-plans`: lo dice il processo di questo progetto. I passi usano le caselle `- [ ]`.

**Obiettivo:** costruire nel database tutto ciò che serve a scrivere una visita in sicurezza — le tre funzioni di
salvataggio, «Controlla», la chiusura immediata delle sessioni e il canale privato — con le prove che le esercitano,
prima che esista una sola schermata.

**Architettura:** una migrazione nuova per ogni gruppo coerente di oggetti, nello stile di `0010` e `0012`: funzioni
`security invoker` salvo dove serve `definer`, `search_path = ''` con nomi qualificati, EXECUTE revocato a `public` e
`anon`. Le decisioni di dominio stanno nelle funzioni; l'app (piano 3a-2) le chiama e traduce gli esiti.

**Stack:** PostgreSQL 17 dentro Supabase locale, Vitest con `pg`, Node 22.

**Spec:** `docs/superpowers/specs/2026-09-22-piano-3a-il-giorno-design.md` (revisione 10) e
`docs/superpowers/specs/2026-09-17-salon-scheduler-design.md` (revisione 5). Il piano argomenta da lì: chi esegue legge
tutti e due.

## Vincoli globali

Valgono per **ogni** task; non si ripetono task per task.

- **Italiano** in prosa, commenti, nomi delle prove e messaggi di commit. Restano in inglese solo gli identificatori già
  congelati (il contratto di `proposeStarts`, le colonne delle 12 migrazioni esistenti, i codici dei motivi).
- **Nomi nuovi in italiano** per tabelle, funzioni e colonne introdotte da questo piano.
- **Ogni funzione nuova:** `search_path = ''` e ogni riferimento qualificato per schema; `security invoker` salvo dove
  il piano dice `definer`; `revoke execute … from public, anon` e `grant execute … to authenticated` nella stessa
  migrazione. Nessuna funzione imposta `default_transaction_isolation`: il livello è quello predefinito,
  `read committed`.
- **Migrazioni:** solo cifre nel prefisso e il modello `<numero>_nome.sql` che il CLI accetta; il numero deve essere
  libero sul disco **e** non rivendicato da un task successivo di questo piano (da 0013 a 0021).
  Dopo ogni migrazione si esegue `npx supabase db reset` e si controlla che **non** compaia nessuna riga
  `Skipping migration`.
- **Gate del progetto**, da eseguire alla fine di ogni task, con l'output vero incollato nel resoconto:
  `npx supabase db reset`, `npm test`, `npm run test:fuso`, `npx tsc --noEmit`.
- **Prerequisito:** Docker (OrbStack). Se `docker info` fallisce: `open -a OrbStack`, ~30 s, poi `npx supabase start`.
- ⛔ **Mai `psql`**: non è installato e da proprietario scavalca la sicurezza per riga. Si misura con `pg` da Node.
- **Le versioni delle righe viaggiano come testo** prodotto da `app.versione()` (Task 1), mai come `timestamptz`
  convertito in JavaScript: un `Date` tronca i microsecondi e produce falsi conflitti (spec §10.2).
- **Ogni prova che asserisce un vuoto** deve avere accanto una prova positiva che la renda capace di fallire.
- **Dati non degeneri** nelle prove: più di un servizio, più di un'operatrice, pause diverse da zero, due date.

## Struttura dei file

| File | Responsabilità |
|---|---|
| `supabase/migrations/0013_invii_e_cancellate.sql` | tabelle `invio` e `visita_cancellata`, helper `app.versione`, `app.apri_invio`, `app.chiudi_invio`, trigger che registra le visite cancellate |
| `supabase/migrations/0014_sessione_viva.sql` | `app.is_active_operator()` con il controllo della sessione, riscrittura delle 13 politiche con `(select …)` |
| `supabase/migrations/0015_chiusura_sessioni.sql` | trigger su `operator` che chiude le sessioni, funzione `public.chiudi_sessioni(uuid)` |
| `supabase/migrations/0016_salva_visita.sql` | `public.stato_visita`, `public.salva_visita` |
| `supabase/migrations/0017_sposta_e_cancella.sql` | `public.sposta_visita_a`, `public.cancella_visita` |
| `supabase/migrations/0018_controlla_invio.sql` | `public.controlla_invio` |
| `supabase/migrations/0019_annunci.sql` | tabella `annuncio`, trigger per istruzione su `appointment` e `visit`, pubblicazione agli inserimenti |
| `supabase/migrations/0020_revoca_move_visit.sql` | revoca della vecchia `move_visit` ad `authenticated` |
| `supabase/migrations/0021_ricerca_e_colori.sql` | `pg_trgm`, `public.cerca_clienti`, `public.doppioni_cliente`, colori delle operatrici di D3-6 |
| `tests/helpers/sessioni.ts` | accesso vero a GoTrue locale e riuso dei token: `preparaAccountLocali()`, `accedi()`, `sessioneDi()`, `dimenticaSessioni()`, `rinnovoRiesce()` |
| `tests/helpers/db.ts` (modifica) | i claim portano `session_id`; si aggiungono `asOperatorCommit`, `asOperatorConSessione`, `asOperatorSenzaSessione` e il parser dell'array di date (OID 1182); `resetData` resta com'è |
| `tests/schema/invii.test.ts` | tabelle di servizio, permessi, trigger delle cancellate |
| `tests/schema/sessione-viva.test.ts` | chiusura immediata, i cinque casi del trigger, la funzione gemella |
| `tests/schema/salva-visita.test.ts` | contratto di `salva_visita` (regole 0–11) |
| `tests/schema/sposta-e-cancella.test.ts` | `sposta_visita_a` e `cancella_visita` |
| `tests/schema/controlla-invio.test.ts` | le tre prove di concorrenza e le sei righe |
| `tests/schema/annunci.test.ts` | contenuto degli annunci e ricezione sul telefono |
| `tests/schema/ricerca-clienti.test.ts` | somiglianza dei nomi e ricerca senza dati nell'indirizzo |
| `tests/schema/outsider-write.test.ts` | `OUTSIDER-WRITE` sulle quattro funzioni, con le gemelle positive |
| `tests/schema/presidi-mancanti.test.ts` | i cinque presidi del Task 11 |
| `supabase/rientro/0014_rientro_sessione_viva.sql` | il rientro dalla chiusura immediata, fuori dalle migrazioni |
| `tests/schema/catalogue-audit.test.ts` (modifica) | uguaglianza esatta delle politiche, elenchi nominativi dei permessi, la pubblicazione (esattamente `annuncio`), nessun trigger disabilitato, isolamento |

---

### Task 1: le tabelle di servizio e gli aiuti del percorso di scrittura

Il cuore di §4.4 del design: senza il registro degli invii, «Controlla» non può dire il vero, e senza il registro
delle visite cancellate non si distingue «cancellata da un'altra parte» da «mai esistita».

**Files:**
- Create: `supabase/migrations/0013_invii_e_cancellate.sql`
- Create: `tests/schema/invii.test.ts`

**Interfaces:**
- Consuma: niente (primo task).
- Produce: `public.invio(codice uuid, esito text, aggiornato timestamptz)`;
  `public.visita_cancellata(id uuid, cancellata_il timestamptz)`;
  `app.versione(timestamptz) returns text`;
  `app.apri_invio(uuid) returns text` (restituisce `null` se il codice è nuovo, altrimenti l'esito già registrato);
  `app.chiudi_invio(uuid, text) returns void`.

- [x] **Passo 1: scrivi le prove che falliscono**

```ts
// tests/schema/invii.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ALESSANDRA, VERA, VERA_AUTH, asOperator, asOwner, pgCode, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const V1 = '50000000-0000-4000-8000-0000000000a1'
const A1 = '60000000-0000-4000-8000-0000000000a1'
const A2 = '60000000-0000-4000-8000-0000000000a2'
const COD = '70000000-0000-4000-8000-0000000000a1'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('app.versione', () => {
  it('conserva i microsecondi e non dipende dal fuso della sessione', async () => {
    const [a, b] = await asOwner(async (c) => {
      // `set`, non `set local`: asOwner non apre una transazione, e un SET
      // LOCAL fuori da un blocco vale solo per la propria istruzione. Con
      // `set local` il fuso non cambierebbe mai e la sonda 1 sarebbe morta
      // (il server è in UTC).
      await c.query("set timezone = 'America/New_York'")
      const r1 = await c.query<{ v: string }>(
        "select app.versione(timestamptz '2026-03-12 09:00:00.123456+01') as v",
      )
      await c.query("set timezone = 'Europe/Rome'")
      const r2 = await c.query<{ v: string }>(
        "select app.versione(timestamptz '2026-03-12 09:00:00.123456+01') as v",
      )
      return [r1.rows[0].v, r2.rows[0].v]
    })
    expect(a).toBe('2026-03-12T08:00:00.123456Z')
    expect(b).toBe(a)
  })
})

describe('registro degli invii', () => {
  it('apre un codice nuovo restituendo null e lo ritrova alla seconda chiamata', async () => {
    const [primo, secondo] = await asOperator(VERA_AUTH, async (c) => {
      const r1 = await c.query<{ e: string | null }>('select app.apri_invio($1) as e', [COD])
      const r2 = await c.query<{ e: string | null }>('select app.apri_invio($1) as e', [COD])
      return [r1.rows[0].e, r2.rows[0].e]
    })
    expect(primo).toBeNull()
    expect(secondo).toBe('in_corso')
  })

  it('registra l esito e lo restituisce a chi riapre lo stesso codice', async () => {
    const esito = await asOperator(VERA_AUTH, async (c) => {
      await c.query('select app.apri_invio($1)', [COD])
      await c.query('select app.chiudi_invio($1, $2)', [COD, 'salvata'])
      const r = await c.query<{ e: string }>('select app.apri_invio($1) as e', [COD])
      return r.rows[0].e
    })
    expect(esito).toBe('salvata')
  })

  it('rifiuta un esito che non esiste', async () => {
    const codice = await asOperator(VERA_AUTH, async (c) => {
      await c.query('select app.apri_invio($1)', [COD])
      try {
        await c.query('select app.chiudi_invio($1, $2)', [COD, 'quasi_salvata'])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('23514')
  })

  it('non lascia scrivere il registro a un operatrice per via diretta', async () => {
    const esiti = await asOperator(VERA_AUTH, async (c) => {
      const out: (string | undefined)[] = []
      for (const sql of [
        `insert into invio (codice, esito) values ('${COD}', 'salvata')`,
        `update invio set esito = 'annullato'`,
        `delete from invio`,
      ]) {
        // Un savepoint per istruzione: dopo il primo 42501 la transazione è
        // abortita, e senza questo le altre due darebbero 25P02.
        await c.query('savepoint s')
        try {
          await c.query(sql)
          out.push('nessun errore')
          await c.query('release savepoint s')
        } catch (e) {
          out.push(pgCode(e))
          await c.query('rollback to savepoint s')
        }
      }
      return out
    })
    expect(esiti).toEqual(['42501', '42501', '42501'])
  })

  it('lascia leggere il registro a un operatrice attiva', async () => {
    await asOwner((c) => c.query("insert into invio (codice, esito) values ($1, 'salvata')", [COD]))
    const righe = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ e: string }>('select esito as e from invio where codice = $1', [COD])
      return r.rows.map((x) => x.e)
    })
    expect(righe).toEqual(['salvata'])
  })
})

describe('registro delle visite cancellate', () => {
  beforeEach(async () => {
    await asOwner(async (c) => {
      await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V1, CLIENT_MARIA, DAY_ONE])
      await c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $4, $5, $6, $7::date, 120, 12), ($2, $4, $3, $6, $7::date, 140, 10)`,
        [A1, A2, ALESSANDRA, V1, VERA, SERVICE_REFILL, DAY_ONE],
      )
    })
  })

  const cancellate = () =>
    asOwner(async (c) => {
      const r = await c.query<{ id: string }>('select id from visita_cancellata order by id')
      return r.rows.map((x) => x.id)
    })

  it('registra una visita cancellata direttamente', async () => {
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    expect(await cancellate()).toEqual([V1])
  })

  it('registra una visita rimasta orfana togliendo l ultimo appuntamento', async () => {
    await asOwner((c) => c.query('delete from appointment where id in ($1, $2)', [A1, A2]))
    expect(await cancellate()).toEqual([V1])
  })

  it('registra una visita che sparisce per cascata dalla cliente', async () => {
    await asOwner((c) => c.query('delete from client where id = $1', [CLIENT_MARIA]))
    expect(await cancellate()).toEqual([V1])
  })

  it('non registra niente finché la visita conserva un appuntamento', async () => {
    await asOwner((c) => c.query('delete from appointment where id = $1', [A1]))
    expect(await cancellate()).toEqual([])
  })

  it('sopporta la stessa visita cancellata due volte', async () => {
    await asOwner(async (c) => {
      await c.query('delete from visit where id = $1', [V1])
      await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [V1, CLIENT_MARIA, DAY_ONE])
      await c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4, $5::date, 120, 12)`,
        [A1, V1, VERA, SERVICE_REFILL, DAY_ONE],
      )
      await c.query('delete from visit where id = $1', [V1])
    })
    expect(await cancellate()).toEqual([V1])
  })

  it('non lascia scrivere le cancellate a un operatrice per via diretta', async () => {
    const codice = await asOperator(VERA_AUTH, async (c) => {
      try {
        await c.query('delete from visita_cancellata')
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('42501')
  })
})
```

- [x] **Passo 2: esegui le prove e verifica che falliscano**

Run: `npx vitest run tests/schema/invii.test.ts`
Atteso: rosse con `42P01 relation "invio" does not exist` (e `42883` su `app.versione`).

- [x] **Passo 3: scrivi la migrazione**

```sql
-- supabase/migrations/0013_invii_e_cancellate.sql
--
-- Le due tabelle di servizio del percorso di scrittura, design 3a §4.4.
--
-- invio: un codice per ogni invio dell'operatrice — «Salva», «Elimina»,
-- rilascio di un trascinamento, «Annulla». Serve a una cosa sola: rendere VERA
-- la risposta di «Controlla». Misurato al sesto giro di revisione su un
-- database di prova: se la funzione di scrittura registra il codice come PRIMA
-- istruzione, «Controlla» che arriva dopo ASPETTA sulla chiave primaria fino
-- alla fine del commit — parte differita compresa — e vede l'esito vero;
-- se «Controlla» arriva prima, l'invio tardivo trova il codice 'annullato' e
-- non scrive. Senza questo, «Non risulta salvata» è una frase che il database
-- può smentire un attimo dopo.
--
-- visita_cancellata: i soli id delle visite cancellate. Distingue «cancellata
-- da un'altra parte» (D3-18) da «non è mai arrivata». Dato PSEUDONIMO e non
-- anonimo — un id si ricollega a una persona nel database —, senza nomi né
-- telefoni.
--
-- Nessuna delle due si scrive da PostgREST: ad `authenticated` resta la sola
-- SELECT, e le scritture passano dalle funzioni `security definer` qui sotto.
-- Lo schema `app` non è esposto da PostgREST, quindi quelle funzioni sono
-- raggiungibili solo dall'interno di altre funzioni.

create table invio (
  codice     uuid primary key,
  esito      text not null,
  aggiornato timestamptz not null default clock_timestamp(),

  constraint invio_esito_noto check (esito in (
    'in_corso', 'annullato', 'salvata', 'cancellata', 'gia_cancellata',
    'esiste_gia', 'modificata_altrove', 'cancellata_altrove', 'non_trovata'
  ))
);

create index invio_per_eta on invio (aggiornato);

create table visita_cancellata (
  id            uuid primary key,
  cancellata_il timestamptz not null default clock_timestamp()
);

create index visita_cancellata_per_eta on visita_cancellata (cancellata_il);

alter table invio enable row level security;
alter table visita_cancellata enable row level security;

create policy invio_lettura on invio
  for select using ((select app.is_active_operator()));
create policy visita_cancellata_lettura on visita_cancellata
  for select using ((select app.is_active_operator()));

-- La regola predefinita dei permessi di Supabase concede TUTTO ad anon e ad
-- authenticated su ogni tabella nuova di public, TRUNCATE e MAINTAIN compresi.
revoke all on table invio, visita_cancellata from public, anon, authenticated;
grant select on table invio, visita_cancellata to authenticated;

-- La versione di una riga viaggia come TESTO, in UTC e con i microsecondi:
-- un `timestamptz` che passa da un `Date` di JavaScript perde i microsecondi e
-- ogni salvataggio diventerebbe un falso «modificata altrove» (spec §10.2).
create function app.versione(p_quando timestamptz) returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select to_char(p_quando at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
$$;

-- Restituisce NULL se il codice è nuovo (e lo apre come 'in_corso'), oppure
-- l'esito già registrato. `on conflict do nothing` e non un blocco `exception`:
-- misurato che un sottoblocco che cattura la chiave duplicata lascia in piedi
-- le scritture fatte prima, e in `repeatable read` fa scrivere una funzione che
-- credeva di essersi fermata.
create function app.apri_invio(p_codice uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserite integer;
  v_esito    text;
begin
  insert into public.invio (codice, esito) values (p_codice, 'in_corso')
  on conflict (codice) do nothing;
  get diagnostics v_inserite = row_count;
  if v_inserite = 1 then
    return null;
  end if;

  select i.esito into v_esito from public.invio i where i.codice = p_codice;
  if v_esito is null then
    raise exception 'invio % sparito fra inserimento e lettura', p_codice
      using errcode = 'P0003';
  end if;
  return v_esito;
end
$$;

-- Chiude il codice con l'esito, e ne approfitta per la pulizia: 30 giorni, un
-- lotto per volta, senza lavoro pianificato da mantenere.
create function app.chiudi_invio(p_codice uuid, p_esito text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_toccate integer;
begin
  update public.invio
     set esito = p_esito, aggiornato = clock_timestamp()
   where codice = p_codice and esito = 'in_corso';
  get diagnostics v_toccate = row_count;
  if v_toccate <> 1 then
    raise exception 'invio % non era aperto', p_codice using errcode = 'P0003';
  end if;

  delete from public.invio
   where codice in (
     select i.codice from public.invio i
      where i.aggiornato < now() - interval '30 days'
      limit 100
   );
  delete from public.visita_cancellata
   where id in (
     select v.id from public.visita_cancellata v
      where v.cancellata_il < now() - interval '30 days'
      limit 100
   );

  -- Gli annunci servono per pochi secondi: un'ora è già larga. Sta qui e non
  -- nel loro trigger perché il trigger gira UNA VOLTA PER ISTRUZIONE, cioè
  -- da 2 a 5 volte per salvataggio, e di più al crescere degli appuntamenti
  -- (misurato: 2 in creazione con un appuntamento, 3 con due, 4 passando da due
  -- a uno, 5 passando da uno a tre), mentre qui gira UNA VOLTA PER INVIO
  -- (misurato 1 su sei forme: creazione, modifica e cancellazione).
  -- ⚠︎ NON serve a uscire dalla transazione che tiene il blocco sulla visita:
  -- `chiudi_invio` è chiamata da dentro `salva_visita`, e quando la delete
  -- parte il blocco è ancora tenuto (misurato al quinto giro, con 55P03 da una
  -- seconda connessione). Chi volesse davvero uscire dal blocco deve cambiare
  -- sede, non spostarla qui.
  -- La tabella nasce nel Task 8: fino ad allora la riga non esiste, e il Task 8
  -- la aggiunge con `create or replace function`.
  -- delete from public.annuncio a
  --  where a.id in (select b.id from public.annuncio b
  --                  where b.creato < now() - interval '1 hour' limit 100);
end
$$;

-- Ogni strada che cancella una visita passa di qui: la cancellazione diretta,
-- la visita rimasta orfana (zz_delete_orphan_visit, 0008) e la cascata dalla
-- cliente (0004). Per questo il trigger sta su `visit` e non nelle funzioni.
create function app.registra_visita_cancellata() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.visita_cancellata (id) values (old.id)
  on conflict (id) do update set cancellata_il = clock_timestamp();
  return null;
end
$$;

create trigger zz_registra_visita_cancellata
after delete on visit
for each row execute function app.registra_visita_cancellata();

revoke execute on function
  app.versione(timestamptz),
  app.apri_invio(uuid),
  app.chiudi_invio(uuid, text),
  app.registra_visita_cancellata()
from public, anon;

grant execute on function
  app.versione(timestamptz),
  app.apri_invio(uuid),
  app.chiudi_invio(uuid, text)
to authenticated;
```

- [x] **Passo 4: applica la migrazione e verifica che il CLI non ne salti nessuna**

Run: `npx supabase db reset`
Atteso: `Applying migration 0013_invii_e_cancellate.sql...` e **nessuna** riga `Skipping migration`.

- [x] **Passo 5: esegui le prove e verifica che passino**

Run: `npx vitest run tests/schema/invii.test.ts`
Atteso: verdi, 12 prove.

- [x] **Passo 6: sonde di mutazione**

Esegui una mutazione per volta, verifica che la prova nominata diventi **rossa**, poi **ripristina il file**.

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | in `app.versione`, togli `at time zone 'UTC'` | *«conserva i microsecondi e non dipende dal fuso della sessione»* |
| 2 | in `app.versione`, `.US` → `.MS` | la stessa |
| 3 | in `app.apri_invio`, `if v_inserite = 1` → `if v_inserite = 0` | *«apre un codice nuovo restituendo null…»* |
| 4 | in `app.chiudi_invio`, togli `and esito = 'in_corso'` | *«rifiuta di chiudere un invio che non è più in corso e non ne riscrive l esito»*. ⚠︎ **Corretta il 24/09/2026:** la stesura originale dava questa mutazione per senza vittime e invitava a dichiararla. Era senza vittime, ma **non perché fosse equivalente: perché nessuno aveva provato a ucciderla**, e costava una prova. Misurato: `chiudi_invio('salvata')` su un codice portato a `'annullato'` risponde `P0003`; senza il predicato scrive `'salvata'` sopra `'annullato'` e smonta dall'interno la riga 1 di spec §4.4 |
| 5 | nel trigger, `after delete` → `before delete` | *«sopporta la stessa visita cancellata due volte»* (`23505 duplicate key … visit_pkey`) e, **fuori da questo file**, `tests/schema/orphan-visit.test.ts`. ⚠︎ **Corretta il 24/09/2026:** la stesura originale la dava per equivalente. **Non lo è**, misurato due volte e su banchi separati: la funzione finisce con `return null`, e in un trigger `BEFORE … FOR EACH ROW` `return null` **annulla l'operazione** — `rowCount = 0`, la riga sopravvive. Con `before` nessuna visita verrebbe più cancellata: si fermerebbero la pulizia delle orfane di `0008`, la cascata dalla cliente di `0004` e domani «Elimina visita», e la visita risulterebbe comunque registrata fra le cancellate |
| 6 | togli `grant select … to authenticated` | *«lascia leggere il registro a un operatrice attiva»* |
| 7 | aggiungi `grant insert on table invio to authenticated` | **nessuna — ed è una falla del presidio, non un'equivalenza.** ⚠︎ **Corretta il 24/09/2026:** con la sicurezza per riga accesa e **nessuna politica di scrittura**, l'`INSERT` è respinto con `42501` — lo **stesso codice** del rifiuto per permesso mancante — anche quando il permesso c'è (`has_table_privilege` → `true`, misurato). La prova guarda solo il codice e non distingue quale dei due lucchetti ha agito; per presidiare la revoca servirebbe leggere `has_table_privilege`. Danno nullo: la RLS ferma comunque la scrittura. Vale **solo per l'`INSERT`** — misurato che `grant update` e `grant delete`, da soli, **fanno arrossire** questa prova, perché con la RLS accesa `UPDATE` e `DELETE` non sollevano niente: filtrano zero righe in silenzio e l'atteso `'42501'` diventa `'nessun errore'` |
| 8 | togli il trigger `zz_registra_visita_cancellata` | le tre prove di registrazione |

Scrivi nel resoconto, per ogni riga, il numero di prove rosse **misurato**, non atteso.

⚠︎ **«Senza vittime» non vuol dire «equivalente».** La prima è una misura, la seconda è una tesi che va
argomentata: due delle righe qui sopra le confondevano, e in un caso la mutazione «equivalente» fermava ogni
cancellazione di visita del database. Prima di dichiarare equivalente una mutazione, chiediti che cosa farebbe
davvero in produzione; se fa qualcosa, la prova che manca è la prova, non la dichiarazione. La stessa formula
ricompariva alla sonda 5 del Task 7 e alla sonda 5 del Task 11, **riverificate il 24/09/2026**: quella del Task 7
regge (misurata su banco: in `read committed` le due varianti coincidono, ed è presidiata dal Task 9), quella del
Task 11 no — la sua clausola di scampo è stata riscritta.

- [x] **Passo 7: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add supabase/migrations/0013_invii_e_cancellate.sql tests/schema/invii.test.ts
git commit -m "feat(3a-1): il registro degli invii e quello delle visite cancellate

Le due tabelle che rendono vera la risposta di «Controlla» (design 3a §4.4):
il codice d'invio aperto come prima istruzione da ogni funzione di scrittura,
e gli id delle visite cancellate, raccolti da un trigger su visit perché le
strade sono tre — cancellazione diretta, visita orfana, cascata dalla cliente.

Ad authenticated resta la sola lettura; le scritture passano da funzioni
security definer nello schema app, che PostgREST non espone.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: sessioni vere nelle prove

**Prima** della chiusura immediata (Task 3) servono prove che entrino con una **sessione vera**. Oggi l'imbracatura
scrive i claim a mano (`tests/helpers/db.ts:40-42`) e non ha `session_id`: con la chiusura immediata **81 prove su
160** passerebbero da lì, circa 57 diventerebbero rosse e **circa 24 resterebbero verdi senza più provare nulla**
(design 3a §4.7, misurato). Questo task le rende capaci di fallire; il Task 3 accende la regola.

**Files:**
- Create: `tests/helpers/sessioni.ts`
- Modify: `tests/helpers/db.ts` (funzione `inRole`, e una `asOperator` che accetta la sessione)
- Modify: `supabase/config.toml` (solo il limite locale di accessi)
- Create: `tests/schema/sessioni-imbracatura.test.ts`

**Interfaces:**
- Consuma: `asOperator`, `asOwner`, `resetData` da `tests/helpers/db.ts`.
- Produce, in `tests/helpers/sessioni.ts`: `PASSWORD_PROVA`; `preparaAccountLocali(): Promise<void>`;
  `accedi(email, password?): Promise<Sessione>` con `Sessione = { accessToken, refreshToken, sessionId, userId }`;
  `sessioneDi(authUid): Promise<Sessione>`; `dimenticaSessioni(): void`; `rinnovoRiesce(sessione): Promise<boolean>`.
  In `tests/helpers/db.ts`: `asOperator` (rollback, **senza** controlli e **senza** riaccesso automatico),
  **`asOperatorCommit`** (commette), `asOperatorConSessione` (usa il `session_id` dato, anche se morto) e
  `asOperatorSenzaSessione`.

**Perché una sessione vera e non una riga scritta a mano:** una prova che inserisce righe in `auth.sessions` da
proprietario e poi ne conta la cancellazione **riproduce** il codice invece di interrogarlo. Con l'accesso vero,
quello che si misura è l'effetto: il rinnovo del token fallisce, e una lettura dà zero righe.

- [x] **Passo 1: prepara gli account locali all'accesso — nelle FIXTURE, non in `seed.sql`**

⛔ **`supabase/seed.sql` non si tocca.** Il design §8.5 lo vieta: `[db.seed]` è attivo
(`supabase/config.toml:65-67`) e `supabase db reset --linked` eseguirebbe quel file **contro il progetto ospitato**,
creandoci quattro account con una password scritta in chiaro nel repo. L'avvertimento è già dentro `seed.sql:18`.

La preparazione va quindi in un aiuto delle prove, eseguito da proprietario al primo accesso.

**Perché serve più della sola password** [dalla revisione, misurato]: i quattro utenti di `seed.sql` hanno
`auth.identities` **vuota** e le colonne testuali di `auth.users` a NULL. GoTrue le legge in campi `string` di Go, e
un NULL fa rispondere **500**, non `400`. Senza questo passo nessuna prova del piano riesce ad accedere.

```ts
// in tests/helpers/sessioni.ts
import { asOwner } from './db'

let preparati = false

/** Password locale delle prove. Non esiste da nessun'altra parte. */
export const PASSWORD_PROVA = 'prova-3a-1'

export async function preparaAccountLocali(): Promise<void> {
  if (preparati) return
  await asOwner(async (c) => {
    await c.query(
      `update auth.users
          set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf', 8)),
              email_confirmed_at = coalesce(email_confirmed_at, now()),
              aud = 'authenticated',
              role = 'authenticated',
              raw_app_meta_data  = coalesce(raw_app_meta_data,  '{"provider":"email","providers":["email"]}'::jsonb),
              raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb),
              confirmation_token = coalesce(confirmation_token, ''),
              recovery_token     = coalesce(recovery_token, ''),
              email_change       = coalesce(email_change, ''),
              email_change_token_new     = coalesce(email_change_token_new, ''),
              email_change_token_current = coalesce(email_change_token_current, ''),
              phone_change       = coalesce(phone_change, ''),
              phone_change_token = coalesce(phone_change_token, ''),
              reauthentication_token = coalesce(reauthentication_token, '')
        where email like '%@example.test'`,
      [PASSWORD_PROVA],
    )
    await c.query(
      `insert into auth.identities
         (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       select gen_random_uuid(), u.id, u.id::text,
              jsonb_build_object('sub', u.id::text, 'email', u.email,
                                 'email_verified', true, 'phone_verified', false),
              'email', now(), now(), now()
         from auth.users u
        where u.email like '%@example.test'
          and not exists (select 1 from auth.identities i where i.user_id = u.id)`,
    )
  })
  preparati = true
}
```

**In più, una volta sola**, alza il limite di accessi del GoTrue **locale**: `sign_in_sign_ups = 30` in cinque minuti
per indirizzo non basta per una passata intera della suite, che ne fa 55-70 [dalla revisione, misurato]. La chiave
**esiste già** a `supabase/config.toml:206`: si **sostituisce** il valore, non si aggiunge una seconda riga, che il
CLI rifiuterebbe come chiave duplicata.

```toml
# supabase/config.toml:206 — solo in locale: la suite accede una volta per file
# di prova, e l'isolamento di Vitest non condivide la cache dei token.
sign_in_sign_ups = 300
```

- [x] **Passo 2: scrivi l'aiuto che accede davvero**

```ts
// tests/helpers/sessioni.ts
//
// Accesso vero al GoTrue locale. Serve alla chiusura immediata (design 3a
// §4.7): da lì in poi `app.is_active_operator()` chiede che la sessione del
// token esista ancora, quindi una prova che scrive i claim a mano passerebbe
// per la ragione sbagliata — o fallirebbe senza dire perché.
//
// I token si riusano: il GoTrue locale limita gli accessi (30 per intervallo,
// supabase/config.toml:206), e 81 prove che accedono una per una lo superano.
const AUTH_URL = process.env.SUPABASE_AUTH_URL ?? 'http://127.0.0.1:54321/auth/v1'
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
export const EMAIL_DI: Record<string, string> = {
  '00000000-0000-4000-8000-000000000001': 'vera@example.test',
  '00000000-0000-4000-8000-000000000002': 'annalisa@example.test',
  '00000000-0000-4000-8000-000000000003': 'alessandra@example.test',
  '00000000-0000-4000-8000-000000000009': 'outsider@example.test',
}

export type Sessione = { accessToken: string; refreshToken: string; sessionId: string; userId: string }

const cache = new Map<string, Sessione>()

function pezziDelToken(accessToken: string): { session_id: string; sub: string } {
  const corpo = accessToken.split('.')[1]
  return JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'))
}

export async function accedi(email: string, password = PASSWORD_PROVA): Promise<Sessione> {
  await preparaAccountLocali()
  const risposta = await fetch(`${AUTH_URL}/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!risposta.ok) {
    throw new Error(`accesso fallito per ${email}: ${risposta.status} ${await risposta.text()}`)
  }
  const dati = (await risposta.json()) as { access_token: string; refresh_token: string }
  const claim = pezziDelToken(dati.access_token)
  return {
    accessToken: dati.access_token,
    refreshToken: dati.refresh_token,
    sessionId: claim.session_id,
    userId: claim.sub,
  }
}

/** La sessione dell'account, creata una volta sola e riusata. */
export async function sessioneDi(authUid: string): Promise<Sessione> {
  const gia = cache.get(authUid)
  if (gia) return gia
  const email = EMAIL_DI[authUid]
  if (!email) throw new Error(`nessuna email nota per ${authUid}`)
  const nuova = await accedi(email)
  cache.set(authUid, nuova)
  return nuova
}

/** Da chiamare quando una prova chiude le sessioni: la cache non vale più. */
export function dimenticaSessioni(): void {
  cache.clear()
}

/** Prova a rinnovare: è la misura di «la sessione è ancora viva?». */
export async function rinnovoRiesce(sessione: Sessione): Promise<boolean> {
  const risposta = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ refresh_token: sessione.refreshToken }),
  })
  return risposta.ok
}
```

- [x] **Passo 3: fai passare l'imbracatura dalla sessione**

In `tests/helpers/db.ts`, sostituisci `inRole` e `asOperator` con queste versioni. `asAnon` e `asOwner` non cambiano.

```ts
import { sessioneDi } from './sessioni'

async function inRole<T>(
  role: 'authenticated' | 'anon',
  authUid: string | null,
  fn: (c: pg.Client) => Promise<T>,
  sessionId?: string,
): Promise<T> {
  const client = await connect()
  try {
    await client.query('begin')
    if (authUid !== null) {
      // set_config BEFORE switching role: the claims GUC must be writable.
      // session_id: dalla chiusura immediata (design 3a §4.7)
      // app.is_active_operator() chiede che la sessione esista ancora, e un
      // claim scritto a mano senza session_id renderebbe VERDE ogni prova
      // negativa per la ragione sbagliata.
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: authUid, role, session_id: sessionId }),
      ])
    }
    await client.query(`set local role ${role}`)
    return await fn(client)
  } finally {
    await client.query('rollback').catch(() => {})
    await client.end()
  }
}

/**
 * The application role, as the given operator's account, with a REAL session.
 *
 * **Non** controlla che la sessione sia viva e **non** riaccede da solo: un
 * riaccesso automatico renderebbe verdi per il motivo sbagliato tutte le prove
 * che chiudono una sessione e poi guardano che cosa succede con quel token
 * (misurato: tre prove nominate di questo piano). Quando una prova chiude una
 * sessione, chiama `dimenticaSessioni()` in coda, e usa
 * `asOperatorConSessione` per la parte negativa.
 */
export async function asOperator<T>(authUid: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const sessione = await sessioneDi(authUid)
  return inRole('authenticated', authUid, fn, sessione.sessionId)
}

/**
 * Come asOperator, ma COMMETTE.
 *
 * `inRole` chiude sempre con un rollback (è così da prima di questo piano), e
 * va benissimo per le prove che leggono dentro la stessa callback. Ma ogni
 * prova che scrive e poi rilegge da un'altra connessione — o che incatena due
 * invii, o che si aspetta un messaggio sul canale — ha bisogno che la scrittura
 * resti. La pulizia la fa `resetData()` nel beforeEach.
 */
export async function asOperatorCommit<T>(authUid: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const sessione = await sessioneDi(authUid)
  const client = await connect()
  try {
    await client.query('begin')
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: authUid, role: 'authenticated', session_id: sessione.sessionId }),
    ])
    await client.query('set local role authenticated')
    const esito = await fn(client)
    await client.query('commit')
    return esito
  } catch (e) {
    await client.query('rollback').catch(() => {})
    throw e
  } finally {
    await client.end()
  }
}

/** Come asOperator ma con una sessione che NON esiste: serve alle prove negative. */
export function asOperatorSenzaSessione<T>(authUid: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  return inRole('authenticated', authUid, fn, '00000000-0000-4000-8000-0000000000ff')
}

/**
 * Come asOperator ma con un `session_id` DATO, senza controllare che sia vivo e
 * senza riaccedere.
 *
 * Serve alle prove che cancellano una sessione e poi vogliono vedere che cosa
 * succede **con quel token**: `asOperator` riaccederebbe da solo e la prova
 * negativa diventerebbe verde per il motivo sbagliato.
 */
export function asOperatorConSessione<T>(
  authUid: string,
  sessionId: string,
  fn: (c: pg.Client) => Promise<T>,
): Promise<T> {
  return inRole('authenticated', authUid, fn, sessionId)
}
```

- [x] **Passo 4: scrivi le prove dell'imbracatura**

```ts
// tests/schema/sessioni-imbracatura.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { VERA_AUTH, asOperator, asOperatorCommit, asOwner, resetData } from '../helpers/db'
import { accedi, sessioneDi } from '../helpers/sessioni'

beforeEach(async () => {
  await resetData()
})

describe('imbracatura con sessioni vere', () => {
  it('accede davvero e riceve un token con un session_id', async () => {
    const sessione = await accedi('vera@example.test')
    expect(sessione.sessionId).toMatch(/^[0-9a-f-]{36}$/)
    expect(sessione.userId).toBe(VERA_AUTH)
  })

  it('riusa la stessa sessione invece di accedere a ogni chiamata', async () => {
    const a = await sessioneDi(VERA_AUTH)
    const b = await sessioneDi(VERA_AUTH)
    expect(b.sessionId).toBe(a.sessionId)
  })

  it('porta il session_id dentro i claim della connessione di prova', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    const dal_db = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ s: string }>(
        "select current_setting('request.jwt.claims', true)::jsonb->>'session_id' as s",
      )
      return r.rows[0].s
    })
    expect(dal_db).toBe(sessione.sessionId)
  })

  it('la sessione che l imbracatura usa esiste davvero in auth.sessions', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    const quante = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>('select count(*) as n from auth.sessions where id = $1', [
        sessione.sessionId,
      ])
      return Number(r.rows[0].n)
    })
    expect(quante).toBe(1)
  })

  // Su `client`, che un'operatrice PUÒ scrivere: su `invio` la scrittura
  // diretta è vietata (Task 1) e le due prove misurerebbero quel divieto.
  const CLIENTE = '40000000-0000-4000-8000-0000000000c1'

  it('con asOperatorCommit la scrittura resta, e si rilegge da un altra connessione', async () => {
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('insert into client (id, full_name, phone) values ($1, $2, $3)', [CLIENTE, 'Prova Commit', null]),
    )
    const quanti = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>('select count(*) as n from client where id = $1', [CLIENTE])
      return Number(r.rows[0].n)
    })
    expect(quanti).toBe(1)
  })

  it('con asOperator invece la scrittura sparisce: è la differenza che conta', async () => {
    await asOperator(VERA_AUTH, (c) =>
      c.query('insert into client (id, full_name, phone) values ($1, $2, $3)', [CLIENTE, 'Prova Rollback', null]),
    )
    const quanti = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>('select count(*) as n from client where id = $1', [CLIENTE])
      return Number(r.rows[0].n)
    })
    expect(quanti).toBe(0)
  })

  it('resetData non chiude le sessioni delle prove', async () => {
    const prima = await sessioneDi(VERA_AUTH)
    await resetData()
    const dopo = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>('select count(*) as n from auth.sessions where id = $1', [prima.sessionId])
      return Number(r.rows[0].n)
    })
    expect(dopo).toBe(1)
  })
})
```

- [x] **Passo 5: esegui e verifica**

Run: `npx supabase db reset && npx vitest run tests/schema/sessioni-imbracatura.test.ts`
Atteso: 7 verdi. Le due prove su commit e rollback sono la coppia che rende visibile la differenza: se passano
tutte e due, chi esegue i Task 5–8 sa quale aiuto usare. Se l'accesso dà **500**, manca qualcosa in
`preparaAccountLocali()` (colonne testuali a NULL o riga in `auth.identities`); se dà **400**, la password non è
quella. Se dà **429**, il limite locale di accessi non è stato alzato (Passo 1).

- [x] **Passo 6: esegui TUTTA la suite**

Run: `npm test`
Atteso: **il conteggio del gate precedente, più le prove aggiunte dai Task 1 e 2**. Misuralo e scrivilo, non
copiarlo da qui. La sessione è in più nei claim, ma nessuna regola la guarda ancora: se qualcosa diventa rosso, il
difetto è nell'imbracatura, non nel database.

- [x] **Passo 7: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add tests/helpers/sessioni.ts tests/helpers/db.ts tests/schema/sessioni-imbracatura.test.ts supabase/config.toml
git commit -m "test(3a-1): le prove entrano con una sessione vera, non con claim scritti a mano

La chiusura immediata (design 3a §4.7) chiede che la sessione del token esista
ancora. Un claim senza session_id renderebbe verdi per la ragione sbagliata le
prove negative — circa 24 su 81 secondo la misura del terzo giro di revisione.

L'imbracatura accede al GoTrue locale e riusa i token. La preparazione degli
account — password, colonne testuali che GoTrue non tollera a NULL, riga in
auth.identities — sta nelle fixture e NON in seed.sql, che db reset --linked
eseguirebbe contro il progetto ospitato (design §8.5).

Nasce anche asOperatorCommit: l'imbracatura storica annulla sempre la
transazione, e ogni prova che scrive e poi rilegge da un'altra connessione
avrebbe letto un database vuoto.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: chiusura immediata — la sessione deve esistere ancora (D3-17)

**Files:**
- Create: `supabase/migrations/0014_sessione_viva.sql`
- Create: `tests/schema/sessione-viva.test.ts`

**Interfaces:**
- Consuma: `app.is_active_operator()` (0001), le 13 politiche di `public`, e da Task 2 `asOperator`,
  `asOperatorSenzaSessione`, `sessioneDi`, `dimenticaSessioni`, `rinnovoRiesce`.
- Produce: `app.is_active_operator()` con il controllo della sessione; le 13 politiche riscritte nella forma
  `(select app.is_active_operator())`.

**Perché `(select …)`:** una funzione `security definer` non viene mai messa in linea; senza il `select` la funzione —
e ora la ricerca in `auth.sessions` — girerebbe **a ogni riga**.

- [ ] **Passo 1: scrivi le prove che falliscono**

```ts
// tests/schema/sessione-viva.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  VERA_AUTH,
  asOperator,
  asOperatorConSessione,
  asOperatorSenzaSessione,
  asOwner,
  resetData,
} from '../helpers/db'
import { CLIENT_MARIA, seedFixture } from '../helpers/fixtures'
import { dimenticaSessioni, sessioneDi } from '../helpers/sessioni'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('chiusura immediata', () => {
  it('lascia leggere chi ha una sessione viva', async () => {
    const nomi = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: string }>('select full_name as n from client where id = $1', [CLIENT_MARIA])
      return r.rows.map((x) => x.n)
    })
    expect(nomi).toEqual(['Maria Rossi'])
  })

  it('non lascia leggere un token la cui sessione non esiste', async () => {
    const righe = await asOperatorSenzaSessione(VERA_AUTH, async (c) => {
      const r = await c.query('select id from client')
      return r.rows
    })
    expect(righe).toEqual([])
  })

  it('non lascia scrivere un token la cui sessione non esiste', async () => {
    const quante = await asOperatorSenzaSessione(VERA_AUTH, async (c) => {
      const r = await c.query('update client set no_messages = true where id = $1', [CLIENT_MARIA])
      return r.rowCount
    })
    expect(quante).toBe(0)
  })

  it('smette di far leggere appena la sessione sparisce, senza aspettare la scadenza del token', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    await asOwner((c) => c.query('delete from auth.sessions where id = $1', [sessione.sessionId]))
    // Con lo STESSO token di prima: asOperator riaccederebbe e la prova
    // diventerebbe verde per il motivo sbagliato.
    const righe = await asOperatorConSessione(VERA_AUTH, sessione.sessionId, async (c) => {
      const r = await c.query('select id from client')
      return r.rows
    })
    expect(righe).toEqual([])
    dimenticaSessioni()
  })

  it('tiene fuori anon, che un session_id non ce l ha proprio', async () => {
    // La transazione esplicita serve: asOwner non ne apre una, e un
    // set_config(..., true) fuori da un blocco vale solo per la propria
    // istruzione. Senza, la prova misurerebbe «nessun claim», non «anon».
    const attiva = await asOwner(async (c) => {
      await c.query('begin')
      await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role: 'anon' })])
      const r = await c.query<{ a: boolean }>('select app.is_active_operator() as a')
      await c.query('rollback')
      return r.rows[0].a
    })
    expect(attiva).toBe(false)
  })

  it('non va in errore quando il claim è la stringa vuota', async () => {
    // La GUC resta a '' dopo un set_config locale: è il caso del pool di
    // PostgREST che riusa una connessione. Senza il nullif giusto qui esce
    // 22P02 da dentro ogni politica.
    const attiva = await asOwner(async (c) => {
      await c.query('begin')
      await c.query("select set_config('request.jwt.claims', '', true)")
      const r = await c.query<{ a: boolean }>('select app.is_active_operator() as a')
      await c.query('rollback')
      return r.rows[0].a
    })
    expect(attiva).toBe(false)
  })
})

describe('forma delle politiche', () => {
  it('avvolge il predicato in un select su ognuna delle politiche di public', async () => {
    const fuori = await asOwner(async (c) => {
      // `or`, non `and`: con l'and una politica che ha lo USING giusto e il
      // WITH CHECK nudo non compare mai, e la sonda che toglie il select da un
      // lato solo resta verde (misurato).
      const r = await c.query<{ t: string; p: string }>(`
        select c.relname as t, p.polname as p
        from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'realtime')
          and (
            (p.polqual is not null
             and pg_get_expr(p.polqual, p.polrelid)
                 not like '%( SELECT app.is_active_operator() AS is_active_operator)%')
            or
            (p.polwithcheck is not null
             and pg_get_expr(p.polwithcheck, p.polrelid)
                 not like '%( SELECT app.is_active_operator() AS is_active_operator)%')
          )
        order by 1, 2
      `)
      return r.rows
    })
    expect(fuori).toEqual([])
  })

  it('conta quante politiche ha esaminato, perché un elenco vuoto non è una prova', async () => {
    const quante = await asOwner(async (c) => {
      const r = await c.query<{ n: string }>(`
        select count(*) as n from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
      `)
      return Number(r.rows[0].n)
    })
    expect(quante).toBe(15)
  })
})
```

*(15 e non 13: il Task 1 ne ha aggiunte due, su `invio` e `visita_cancellata`.)*

- [ ] **Passo 2: esegui e verifica che falliscano**

Run: `npx vitest run tests/schema/sessione-viva.test.ts`
Atteso: rosse *«non lascia leggere un token la cui sessione non esiste»*, *«non lascia scrivere…»*, *«smette di far
leggere appena la sessione sparisce…»* e *«avvolge il predicato in un select…»*. Le altre tre sono già verdi: sono i
controlli positivi che rendono le prime capaci di fallire.

- [ ] **Passo 3: scrivi la migrazione**

```sql
-- supabase/migrations/0014_sessione_viva.sql
--
-- Chiusura immediata, design 3a D3-17 e §4.7.
--
-- Fino a qui `app.is_active_operator()` guardava solo la riga in `operator`.
-- Chiudere le sessioni di un account (0015) spegne i token di AGGIORNAMENTO,
-- ma il token di ACCESSO già emesso resta valido fino alla scadenza —
-- `jwt_expiry = 3600`, quindi fino a un'ora. In quell'ora, chi ha in mano un
-- telefono perso legge tutte le clienti e scrive. Chiedere che la SESSIONE del
-- token esista ancora chiude la finestra: PostgREST verifica la firma, la
-- sicurezza per riga verifica che la sessione ci sia.
--
-- `auth.sessions` è una tabella interna di Supabase. La lettura regge perché
-- il proprietario di questa funzione ha SELECT e `bypassrls`. Se una versione
-- futura glieli togliesse, ogni richiesta fallirebbe: un guasto RUMOROSO, che
-- non espone dati. La prova di catalogo di `catalogue-audit` lo sorveglia, e
-- `supabase/rientro/0014_rientro_sessione_viva.sql` (fuori da `migrations/`)
-- toglie questa clausola se serve.
--
-- Il claim `session_id` c'è sempre nei token di GoTrue; `anon` e `service_role`
-- non ce l'hanno, e `nullif(...)::uuid` dà NULL, quindi l'`exists` è falso:
-- la funzione non va mai in errore.
create or replace function app.is_active_operator() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operator o
    where o.auth_user_id = auth.uid()
      and o.is_active
  )
  and exists (
    select 1
    from auth.sessions s
    -- Il nullif sta PRIMA del cast, come in auth.uid(): una GUC impostata
    -- almeno una volta con set_config(..., true) non torna a NULL, torna a ''
    -- — e ''::jsonb solleva 22P02 DENTRO ogni politica, anche quando il primo
    -- exists è già falso (misurato su banco separato).
    where s.id = nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
  )
$$;

-- Le politiche esistenti chiamano la funzione NUDA: `using app.is_active_operator()`.
-- Una funzione security definer non viene mai messa in linea, quindi senza il
-- `select` la funzione — e ora la ricerca in auth.sessions — gira A OGNI RIGA.
-- Si riscrivono tutte, comprese le due del piano 3a-1.
drop policy operator_access on operator;
create policy operator_access on operator
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy service_category_access on service_category;
create policy service_category_access on service_category
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy service_access on service;
create policy service_access on service
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy operator_service_access on operator_service;
create policy operator_service_access on operator_service
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy salon_settings_access on salon_settings;
create policy salon_settings_access on salon_settings
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy client_access on client;
create policy client_access on client
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy visit_access on visit;
create policy visit_access on visit
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy appointment_access on appointment;
create policy appointment_access on appointment
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy appointment_slot_read on appointment_slot;
create policy appointment_slot_read on appointment_slot
  for select using ((select app.is_active_operator()));

drop policy weekly_availability_access on weekly_availability;
create policy weekly_availability_access on weekly_availability
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy exception_day_access on exception_day;
create policy exception_day_access on exception_day
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy exception_range_access on exception_range;
create policy exception_range_access on exception_range
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy salon_closure_access on salon_closure;
create policy salon_closure_access on salon_closure
  for all using ((select app.is_active_operator())) with check ((select app.is_active_operator()));

drop policy invio_lettura on invio;
create policy invio_lettura on invio
  for select using ((select app.is_active_operator()));

drop policy visita_cancellata_lettura on visita_cancellata;
create policy visita_cancellata_lettura on visita_cancellata
  for select using ((select app.is_active_operator()));
```

I tredici nomi sono stati **verificati sul catalogo il 23 settembre 2026** e sono esattamente quelli dell'elenco qui
sopra (`appointment_access`, `appointment_slot_read` — che è `for select` —, `client_access`, `exception_day_access`,
`exception_range_access`, `operator_access`, `operator_service_access`, `salon_closure_access`,
`salon_settings_access`, `service_access`, `service_category_access`, `visit_access`,
`weekly_availability_access`). Ricontrollali comunque prima di scrivere, perché una migrazione che nomina una politica
inesistente fallisce a metà:

```bash
node -e "const{Client}=require('pg');const c=new Client('postgresql://postgres:postgres@127.0.0.1:54322/postgres');c.connect().then(()=>c.query(\"select c.relname, p.polname, p.polcmd from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by 1,2\")).then(r=>{console.table(r.rows);return c.end()})"
```

- [ ] **Passo 4: scrivi la migrazione di rientro, FUORI dalle migrazioni**

```sql
-- supabase/rientro/0014_rientro_sessione_viva.sql
--
-- NON è una migrazione: sta fuori da supabase/migrations/ apposta, perché
-- `db reset` e `db push` la applicherebbero da sole.
--
-- Si esegue a mano, dall'editor SQL, SOLO se Supabase toglie al proprietario
-- il diritto di leggere auth.sessions e il salone resta chiuso fuori.
-- Riapre la finestra fino a un'ora fra la chiusura di una sessione e la
-- scadenza del token (design 3a §4.7, reperto B7), e va insieme alla
-- disattivazione dell'operatrice, che resta l'unica difesa.
create or replace function app.is_active_operator() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.operator o
    where o.auth_user_id = auth.uid() and o.is_active
  )
$$;

-- E, se anche il trigger di chiusura sessioni fallisce per lo stesso motivo:
-- alter table public.operator disable trigger zz_chiudi_sessioni;
```

- [ ] **Passo 5: applica ed esegui le prove**

Run: `npx supabase db reset && npx vitest run tests/schema/sessione-viva.test.ts`
Atteso: 8 verdi.

- [ ] **Passo 6: esegui TUTTA la suite e adatta le prove che cadono**

Run: `npm test`

Atteso: **verde**, non rosso — ⚠︎ **corretto il 24 settembre 2026, dalla revisione del Task 2.** La previsione
«rosso, all'incirca 57 prove su 81» era della misura del terzo giro, quando l'imbracatura scriveva i claim a mano: il
**Task 2 l'ha già smentita per misura**. Con questa funzione applicata al database, la suite dà **zero rosse**
(misurato su un banco usa-e-getta: 20 file, 277 verdi; togliendo il secondo `exists` il banco dà 3 rosse sulle tre
prove negative di questo task, quindi la funzione è davvero accesa). Le prove entrano già tutte con una sessione vera:
non c'è nessun pezzo da raccogliere.

⚠︎ **Che non cada niente NON ti esonera dall'obbligo qui sotto, ed è il punto più fragile di tutto il piano.** Questo
passo non serve più ad adattare le rosse: serve a mettere una **gemella positiva** accanto a ogni prova negativa, e
quella gemella è l'unico presidio che resta. Misurato nella revisione del Task 2: con le sessioni di un'operatrice
cancellate e la cache non svuotata, una prova negativa generica (`expect(righe).toEqual([])`) resta **VERDE** e solo la
gemella positiva arrossisce. Quindi censisci le prove negative che questa migrazione rende sensibili alla sessione e
dàgliela, una per una. Per ciascuna:

- se è una prova **positiva** (si aspetta righe o una scrittura riuscita) → deve tornare verde con `asOperator`;
- se è una prova **negativa** (si aspetta il vuoto) → **accanto** le va messa una prova positiva della stessa
  sessione, altrimenti resterebbe verde anche con l'imbracatura rotta. Esempio, in `access-control.test.ts`:

```ts
it('non fa vedere niente a un account che non è operatrice', async () => {
  const righe = await asOperator(OUTSIDER_AUTH, async (c) => (await c.query('select id from client')).rows)
  expect(righe).toEqual([])
})

// La prova gemella che rende capace di fallire quella sopra: stessa forma,
// stessa imbracatura, un account che invece È operatrice.
it('fa vedere le clienti a un operatrice attiva, con la stessa imbracatura', async () => {
  const righe = await asOperator(VERA_AUTH, async (c) => (await c.query('select id from client')).rows)
  expect(righe.length).toBeGreaterThan(0)
})
```

Scrivi nel resoconto **quante** prove hai adattato e **quante prove positive gemelle** hai aggiunto.

- [ ] **Passo 7: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | togli il secondo `exists` da `app.is_active_operator()` | *«non lascia leggere un token la cui sessione non esiste»* e *«smette di far leggere appena la sessione sparisce…»* |
| 2 | nel secondo `exists`, togli `and s.user_id = auth.uid()` | aggiungi la prova: un token di Vera con il `session_id` di Annalisa non vede nulla |
| 3a | in una politica qualsiasi, togli il `(select …)` dal solo `using` | *«avvolge il predicato in un select…»* |
| 3b | in una politica qualsiasi, togli il `(select …)` dal solo `with check` | la stessa — se resta verde, la `where` è tornata in `and` |
| 4 | fai restituire `false` al primo `exists` | ogni prova positiva |

- [ ] **Passo 8: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add supabase/migrations/0014_sessione_viva.sql supabase/rientro/ tests/schema/ tests/helpers/
git commit -m "feat(3a-1): chiusura immediata, la sessione del token deve esistere ancora

Chiudere le sessioni spegneva i token di aggiornamento ma non quello di accesso
già emesso: fino a un'ora di lettura e scrittura per chi aveva in mano un
telefono perso (design 3a D3-17). Ora la sicurezza per riga chiede anche che la
sessione esista.

Le 15 politiche sono riscritte con (select …): una funzione security definer non
viene mai messa in linea, e senza il select la ricerca in auth.sessions girerebbe
a ogni riga.

Le prove che si aspettano il vuoto hanno ora accanto una prova positiva della
stessa sessione: senza, sarebbero rimaste verdi anche con l'imbracatura rotta.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: le sessioni si chiudono da sole, e il pulsante del 3c

**Files:**
- Create: `supabase/migrations/0015_chiusura_sessioni.sql`
- Create: `tests/schema/chiusura-sessioni.test.ts`

**Interfaces:**
- Consuma: `app.is_active_operator()` (Task 3), `sessioneDi`, `rinnovoRiesce`, `dimenticaSessioni` (Task 2).
- Produce: `public.chiudi_sessioni(p_operator_id uuid) returns integer` (quante sessioni ha chiuso);
  trigger `zz_chiudi_sessioni` su `operator`.

**I cinque casi** (design 3a §4.7): `is_active` da vero a falso; da falso a vero; `auth_user_id` che cambia (vecchio
**e** nuovo account); inserimento di una riga con `auth_user_id` non nullo; cancellazione della riga. Un cambio di
`color` o di `sort_order` **non** deve chiudere niente: `resetData()` riscrive `is_active` e `auth_user_id` con gli
stessi valori a ogni prova, e senza il confronto `is distinct from` butterebbe fuori l'imbracatura a ogni `beforeEach`.

- [ ] **Passo 1: scrivi le prove che falliscono**

```ts
// tests/schema/chiusura-sessioni.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALESSANDRA,
  ANNALISA,
  ANNALISA_AUTH,
  OUTSIDER_AUTH,
  VERA,
  VERA_AUTH,
  asOperator,
  asOwner,
  pgCode,
  resetData,
} from '../helpers/db'
import { accedi, dimenticaSessioni, rinnovoRiesce } from '../helpers/sessioni'

const vive = (authUid: string) =>
  asOwner(async (c) => {
    const r = await c.query<{ n: string }>('select count(*) as n from auth.sessions where user_id = $1', [authUid])
    return Number(r.rows[0].n)
  })

/**
 * Azzera le sessioni degli account di prova PRIMA di ogni prova di questo file.
 *
 * Senza, una prova che lascia viva una sessione (per esempio «NON chiude niente
 * per un cambio di colore») fa contare 2 alla prova successiva, che si aspetta
 * 1: misurato.
 */
const pulisciSessioni = () =>
  asOwner((c) => c.query("delete from auth.sessions where user_id in (select id from auth.users where email like '%@example.test')"))

beforeEach(async () => {
  await resetData()
  await pulisciSessioni()
  dimenticaSessioni()
})

describe('il trigger chiude le sessioni', () => {
  it('quando l operatrice viene disattivata', async () => {
    const sessione = await accedi('annalisa@example.test')
    expect(await vive(ANNALISA_AUTH)).toBeGreaterThan(0)
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    expect(await vive(ANNALISA_AUTH)).toBe(0)
    expect(await rinnovoRiesce(sessione)).toBe(false)
  })

  it('quando l operatrice viene riattivata, per le sessioni nate mentre era fuori', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const sessione = await accedi('annalisa@example.test')
    expect(await vive(ANNALISA_AUTH)).toBe(1)
    await asOwner((c) => c.query('update operator set is_active = true where id = $1', [ANNALISA]))
    expect(await vive(ANNALISA_AUTH)).toBe(0)
    expect(await rinnovoRiesce(sessione)).toBe(false)
  })

  it('quando l account viene scollegato, e anche quando viene ricollegato', async () => {
    await accedi('annalisa@example.test')
    await asOwner((c) => c.query('update operator set auth_user_id = null where id = $1', [ANNALISA]))
    expect(await vive(ANNALISA_AUTH)).toBe(0)

    const dopo = await accedi('annalisa@example.test')
    await asOwner((c) => c.query('update operator set auth_user_id = $2 where id = $1', [ANNALISA, ANNALISA_AUTH]))
    expect(await vive(ANNALISA_AUTH)).toBe(0)
    expect(await rinnovoRiesce(dopo)).toBe(false)
  })

  it('quando la riga dell operatrice viene cancellata', async () => {
    // Su un'operatrice USA E GETTA: resetData() esclude `operator` dal truncate
    // e non ricrea le righe, quindi cancellare Annalisa la farebbe sparire per
    // tutta la suite, e ogni seedCatalogue() successivo prenderebbe 23503.
    const TEMP = '10000000-0000-4000-8000-0000000000e2'
    try {
      await asOwner((c) =>
        c.query(
          `insert into operator (id, auth_user_id, name, color, sort_order)
           values ($1, $2, 'Temp', '#C2185B', 8)`,
          [TEMP, OUTSIDER_AUTH],
        ),
      )
      const sessione = await accedi('outsider@example.test')
      await asOwner((c) => c.query('delete from operator where id = $1', [TEMP]))
      expect(await vive(OUTSIDER_AUTH)).toBe(0)
      expect(await rinnovoRiesce(sessione)).toBe(false)
    } finally {
      await asOwner((c) => c.query('delete from operator where id = $1', [TEMP]))
      dimenticaSessioni()
    }
  })

  it('quando un account che aveva già una sessione diventa operatrice', async () => {
    const PROVA = '10000000-0000-4000-8000-0000000000e1'
    try {
      const estraneo = await accedi('outsider@example.test')
      expect(await vive(OUTSIDER_AUTH)).toBe(1)
      await asOwner((c) =>
        c.query(
          `insert into operator (id, auth_user_id, name, color, sort_order)
           values ($1, $2, 'Prova', '#C2185B', 9)`,
          [PROVA, OUTSIDER_AUTH],
        ),
      )
      expect(await vive(OUTSIDER_AUTH)).toBe(0)
      expect(await rinnovoRiesce(estraneo)).toBe(false)
    } finally {
      // Senza questo resta una quarta operatrice committata per tutta la suite,
      // e access-control.test.ts si aspetta esattamente tre nomi.
      await asOwner((c) => c.query('delete from operator where id = $1', [PROVA]))
      dimenticaSessioni()
    }
  })

  it('NON chiude niente per un cambio di colore o di ordine', async () => {
    const prima = await asOwner(async (c) => {
      const r = await c.query<{ c: string; s: number }>(
        'select color as c, sort_order as s from operator where id = $1',
        [ANNALISA],
      )
      return r.rows[0]
    })
    try {
      const sessione = await accedi('annalisa@example.test')
      await asOwner((c) => c.query("update operator set color = '#123456', sort_order = 5 where id = $1", [ANNALISA]))
      expect(await vive(ANNALISA_AUTH)).toBe(1)
      expect(await rinnovoRiesce(sessione)).toBe(true)
    } finally {
      // resetData() non ripristina né color né sort_order: senza questo la
      // prova dei colori del Task 10 diventa rossa o verde a seconda
      // dell'ordine dei file, che Vitest decide per dimensione.
      await asOwner((c) =>
        c.query('update operator set color = $2, sort_order = $3 where id = $1', [ANNALISA, prima.c, prima.s]),
      )
    }
  })

  it('NON chiude niente per un aggiornamento che riscrive gli stessi valori', async () => {
    await accedi('annalisa@example.test')
    await asOwner((c) =>
      c.query('update operator set is_active = true, auth_user_id = $2 where id = $1', [ANNALISA, ANNALISA_AUTH]),
    )
    expect(await vive(ANNALISA_AUTH)).toBe(1)
  })
})

describe('public.chiudi_sessioni', () => {
  it('chiude le sessioni di un altra operatrice e dice quante ne ha chiuse', async () => {
    const sessione = await accedi('annalisa@example.test')
    const quante = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ n: number }>('select chiudi_sessioni($1) as n', [ANNALISA])
      return r.rows[0].n
    })
    expect(quante).toBe(1)
    expect(await vive(ANNALISA_AUTH)).toBe(0)
    expect(await rinnovoRiesce(sessione)).toBe(false)
  })

  it('rifiuta l operatrice di chi la chiama: per le proprie sessioni c è l uscita globale', async () => {
    const codice = await asOperator(VERA_AUTH, async (c) => {
      try {
        await c.query('select chiudi_sessioni($1)', [VERA])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('P0004')
  })

  it('rifiuta un bersaglio che non è un operatrice', async () => {
    const codice = await asOperator(VERA_AUTH, async (c) => {
      try {
        await c.query('select chiudi_sessioni($1)', ['10000000-0000-4000-8000-0000000000ff'])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('P0004')
  })

  it('non fa niente se la chiama un account che non è operatrice attiva', async () => {
    const sessione = await accedi('annalisa@example.test')
    const codice = await asOperator(OUTSIDER_AUTH, async (c) => {
      try {
        await c.query('select chiudi_sessioni($1)', [ANNALISA])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codice).toBe('P0004')
    expect(await vive(ANNALISA_AUTH)).toBe(1)
    expect(await rinnovoRiesce(sessione)).toBe(true)
  })

  it('non è eseguibile da anon', async () => {
    const eseguibile = await asOwner(async (c) => {
      const r = await c.query<{ x: boolean }>(
        "select has_function_privilege('anon', 'public.chiudi_sessioni(uuid)', 'EXECUTE') as x",
      )
      return r.rows[0].x
    })
    expect(eseguibile).toBe(false)
  })

  it('non tocca MAI la password di nessuno', async () => {
    // L'accesso prima della lettura: `preparaAccountLocali()` riscrive la
    // password al primo `accedi` del file, e senza questa riga la prova
    // eseguita da sola confronterebbe due valori diversi.
    await accedi('annalisa@example.test')
    const prima = await asOwner(async (c) => {
      const r = await c.query<{ p: string }>('select encrypted_password as p from auth.users where id = $1', [
        ANNALISA_AUTH,
      ])
      return r.rows[0].p
    })
    await accedi('annalisa@example.test')
    await asOperator(VERA_AUTH, (c) => c.query('select chiudi_sessioni($1)', [ANNALISA]))
    const dopo = await asOwner(async (c) => {
      const r = await c.query<{ p: string }>('select encrypted_password as p from auth.users where id = $1', [
        ANNALISA_AUTH,
      ])
      return r.rows[0].p
    })
    expect(dopo).toBe(prima)
  })
})
```

- [ ] **Passo 2: esegui e verifica che falliscano**

Run: `npx vitest run tests/schema/chiusura-sessioni.test.ts`
Atteso: rosse tutte quelle che chiedono `0` sessioni e `42883 function chiudi_sessioni(uuid) does not exist`; verdi le
due *«NON chiude niente…»*, che sono i controlli positivi.

- [ ] **Passo 3: scrivi la migrazione**

```sql
-- supabase/migrations/0015_chiusura_sessioni.sql
--
-- Le sessioni si chiudono da sole, design 3a D3-14 e §4.7.
--
-- Cinque casi, e ognuno è una strada per cui un telefono perso tornerebbe a
-- leggere le clienti: disattivazione; RIATTIVAZIONE (uccide le sessioni nate
-- mentre l'account era fuori); cambio di `auth_user_id` (vecchio e nuovo);
-- inserimento di una riga già collegata a un account che aveva una sessione;
-- cancellazione della riga.
--
-- Tre trigger e non uno: una clausola WHEN che confronta OLD e NEW non si può
-- dichiarare insieme per INSERT e per DELETE. Il confronto `is distinct from`
-- è dentro la funzione, così un aggiornamento che riscrive gli stessi valori —
-- quello che resetData() fa a ogni prova — non chiude niente.
--
-- La cancellazione delle sessioni si porta via i token di aggiornamento
-- (refresh_tokens_session_id_fkey, on delete cascade). I token con
-- `session_id` nullo, che quella cascata non raggiunge, si cancellano per
-- user_id: in auth.refresh_tokens la colonna è `varchar`, non `uuid`.
--
-- Questa funzione NON tocca le password: la procedura del telefono perso
-- (D3-20) cambia la password dalla dashboard, in modo che chi ha in mano un
-- telefono rubato non possa chiudere fuori il salone cambiando le credenziali
-- delle colleghe.
create function app.chiudi_sessioni_di(p_auth_user_id uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_chiuse integer;
begin
  if p_auth_user_id is null then
    return 0;
  end if;
  delete from auth.sessions where user_id = p_auth_user_id;
  get diagnostics v_chiuse = row_count;
  delete from auth.refresh_tokens where user_id = p_auth_user_id::text and session_id is null;
  return v_chiuse;
end
$$;

create function app.chiudi_sessioni_operatrice() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform app.chiudi_sessioni_di(new.auth_user_id);
    return null;
  elsif tg_op = 'DELETE' then
    perform app.chiudi_sessioni_di(old.auth_user_id);
    return null;
  end if;

  if old.is_active is distinct from new.is_active then
    perform app.chiudi_sessioni_di(new.auth_user_id);
  end if;
  if old.auth_user_id is distinct from new.auth_user_id then
    perform app.chiudi_sessioni_di(old.auth_user_id);
    perform app.chiudi_sessioni_di(new.auth_user_id);
  end if;
  return null;
end
$$;

create trigger zz_chiudi_sessioni_ins
after insert on operator
for each row execute function app.chiudi_sessioni_operatrice();

create trigger zz_chiudi_sessioni_upd
after update of is_active, auth_user_id on operator
for each row execute function app.chiudi_sessioni_operatrice();

create trigger zz_chiudi_sessioni_del
after delete on operator
for each row execute function app.chiudi_sessioni_operatrice();

-- Il pulsante «Chiudi tutte le sessioni» del 3c. Il bersaglio si risolve da
-- `operator`: una firma che accettasse un id di auth.users permetterebbe di
-- chiudere le sessioni di un account qualunque. E rifiuta l'operatrice di chi
-- chiama: per le proprie sessioni c'è l'uscita con ambito globale, e chiudersi
-- fuori da soli non deve essere possibile per sbaglio.
create function public.chiudi_sessioni(p_operator_id uuid) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bersaglio uuid;
  v_io        uuid;
begin
  if not (select app.is_active_operator()) then
    raise exception 'chiudi_sessioni: chi chiama non è un operatrice attiva'
      using errcode = 'P0004';
  end if;

  select o.auth_user_id into v_bersaglio from public.operator o where o.id = p_operator_id;
  if not found then
    raise exception 'chiudi_sessioni: % non è un operatrice', p_operator_id using errcode = 'P0004';
  end if;

  select o.auth_user_id into v_io from public.operator o where o.auth_user_id = auth.uid();
  if v_bersaglio is not distinct from v_io then
    raise exception 'chiudi_sessioni: per le proprie sessioni si esce con ambito globale'
      using errcode = 'P0004';
  end if;

  return app.chiudi_sessioni_di(v_bersaglio);
end
$$;

revoke execute on function
  app.chiudi_sessioni_di(uuid),
  app.chiudi_sessioni_operatrice(),
  public.chiudi_sessioni(uuid)
from public, anon;

grant execute on function public.chiudi_sessioni(uuid) to authenticated;
```

- [ ] **Passo 4: applica ed esegui**

Run: `npx supabase db reset && npx vitest run tests/schema/chiusura-sessioni.test.ts`
Atteso: 13 verdi.

⚠︎ **Questo task tocca quattro file di prove esistenti.** Da ora ogni `update operator set is_active = …` committato
**chiude le sessioni** di quell'account. **`asOperator` non se ne accorge e non riaccede**: ogni prova che disattiva
un'operatrice o cancella una sessione deve chiamare `dimenticaSessioni()` subito dopo, altrimenti la prova successiva
dello stesso file userà un `session_id` morto e passerà per la ragione sbagliata. Vanno riguardate una per una:
`tests/schema/access-control.test.ts:53`, `tests/schema/account-directory.test.ts:45`,
`tests/schema/availability-window.test.ts:318`, `tests/schema/operator-guard.test.ts:16` e `:94-95`.
Esegui `npm test` **prima** di proseguire e scrivi nel resoconto quali hai toccato e perché.

- [ ] **Passo 5: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | togli il ramo `tg_op = 'INSERT'` | *«quando un account che aveva già una sessione diventa operatrice»* |
| 2 | togli il ramo `tg_op = 'DELETE'` | *«quando la riga dell operatrice viene cancellata»* |
| 3 | `old.is_active is distinct from new.is_active` → `new.is_active = false` | *«quando l operatrice viene riattivata…»* |
| 4 | togli `perform app.chiudi_sessioni_di(old.auth_user_id)` | *«quando l account viene scollegato…»* |
| 5 | togli la clausola `of is_active, auth_user_id` dal trigger di update | nessuna prova arrossisce, ma **le due prove «NON chiude niente» restano verdi solo grazie a `is distinct from`**: toglilo e verifica che diventino rosse; è la sonda che presidia `resetData()` |
| 6 | in `chiudi_sessioni`, togli il controllo `v_bersaglio is not distinct from v_io` | *«rifiuta l operatrice di chi la chiama…»* |
| 7 | in `chiudi_sessioni`, togli la guardia `app.is_active_operator()` | *«non fa niente se la chiama un account che non è operatrice attiva»* |

- [ ] **Passo 6: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add supabase/migrations/0015_chiusura_sessioni.sql tests/schema/chiusura-sessioni.test.ts
git commit -m "feat(3a-1): le sessioni si chiudono da sole in tutti e cinque i casi

Disattivazione, riattivazione, scollegamento, ricollegamento e cancellazione
della riga: ognuna era una strada per cui un telefono perso tornava a leggere
le clienti (design 3a D3-14). Tre trigger, perché una clausola WHEN su OLD e
NEW non si dichiara insieme per INSERT e DELETE; il confronto is distinct from
sta nella funzione, così un cambio di colore o un aggiornamento identico non
butta fuori nessuno.

Il pulsante del 3c risolve il bersaglio da operator, rifiuta chi chiama e non
tocca mai le password: la procedura del telefono perso cambia la password dalla
dashboard.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: `salva_visita` — creare e modificare una visita, tutto o niente

Il cuore del piano. Regole 0–11 del design 3a §4.1.

**Files:**
- Create: `supabase/migrations/0016_salva_visita.sql`
- Create: `tests/schema/salva-visita.test.ts`

**Interfaces:**
- Consuma: `app.apri_invio`, `app.chiudi_invio`, `app.versione` (Task 1); `app.is_active_operator()` (Task 3);
  `appointment_slot_unique` (`0005_occupancy.sql:25-27`, `deferrable initially deferred`).
- Produce:

```
public.salva_visita(
  p_codice        uuid,   -- codice d'invio (§4.4)
  p_visita        uuid,
  p_cliente       uuid,   -- cliente esistente
  p_cliente_nuova jsonb,  -- null, oppure {"nome","telefono","mese","giorno"} con lo stesso id di p_cliente
  p_data          date,
  p_appuntamenti  jsonb,  -- [{"id","operatrice","servizio","inizio","durata"}], almeno uno
  p_visita_attesa text,   -- null = creazione; valorizzato = modifica
  p_attesi        jsonb   -- null in creazione; [{"id","versione"}] in modifica
) returns jsonb
```

La risposta è sempre `{"esito": …}`, più `"visita"` e `"appuntamenti"` con le versioni nuove quando ha scritto, e
`"stato"` con lo stato corrente quando l'esito è `modificata_altrove`.

- [ ] **Passo 1: scrivi le prove che falliscono**

```ts
// tests/schema/salva-visita.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALESSANDRA,
  ANNALISA,
  VERA,
  VERA_AUTH,
  asOperator,
  asOperatorCommit,
  asOperatorConSessione,
  asOwner,
  connect,
  pgCode,
  resetData,
} from '../helpers/db'
import { dimenticaSessioni, sessioneDi } from '../helpers/sessioni'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

// REGOLA DI QUESTO FILE: ogni prova che scrive e poi rilegge da un'altra
// connessione, o che incatena due invii, usa `asOperatorCommit`. `asOperator`
// chiude sempre con un rollback, e userebbe un database che torna vuoto.

const V1 = '50000000-0000-4000-8000-0000000000b1'
const A1 = '60000000-0000-4000-8000-0000000000b1'
const A2 = '60000000-0000-4000-8000-0000000000b2'
const A3 = '60000000-0000-4000-8000-0000000000b3'
const NUOVA_CLIENTE = '40000000-0000-4000-8000-0000000000b9'
let seq = 0
const codice = () => `70000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`

type Risposta = {
  esito: string
  visita?: string
  appuntamenti?: { id: string; versione: string }[]
  stato?: { data: string; cliente: string; appuntamenti: { id: string; inizio: number }[] }
}

const app1 = (id: string, inizio: number, operatrice = VERA, servizio = SERVICE_REFILL, durata = 12) => ({
  id,
  operatrice,
  servizio,
  inizio,
  durata,
})

function salva(
  c: import('pg').Client,
  opts: {
    codice?: string
    visita?: string
    cliente?: string
    clienteNuova?: unknown
    data?: string
    appuntamenti: unknown[]
    visitaAttesa?: string | null
    attesi?: unknown[] | null
  },
) {
  return c
    .query<{ r: Risposta }>('select salva_visita($1, $2, $3, $4, $5::date, $6, $7, $8) as r', [
      opts.codice ?? codice(),
      opts.visita ?? V1,
      opts.cliente ?? CLIENT_MARIA,
      opts.clienteNuova ? JSON.stringify(opts.clienteNuova) : null,
      opts.data ?? DAY_ONE,
      JSON.stringify(opts.appuntamenti),
      opts.visitaAttesa ?? null,
      opts.attesi ? JSON.stringify(opts.attesi) : null,
    ])
    .then((r) => r.rows[0].r)
}

const statoDb = () =>
  asOwner(async (c) => {
    const v = await c.query<{ id: string; d: string; cl: string }>(
      'select id, visit_date::text as d, client_id as cl from visit order by id',
    )
    const a = await c.query<{ id: string; v: string; s: number; n: number; op: string }>(
      'select id, visit_id as v, start_cell as s, cell_count as n, operator_id as op from appointment order by id',
    )
    return { visite: v.rows, appuntamenti: a.rows }
  })

/**
 * Aspetta che la connessione data sia ferma su un blocco. Si aspetta la
 * CONDIZIONE e non un tempo: un `setTimeout` fisso rende rosse le prove di
 * concorrenza quando la macchina è lenta, senza che ci sia un difetto sotto.
 */
async function attendiBlocco(c: import('pg').Client, ms = 5000) {
  const pid = (c as unknown as { processID: number }).processID
  const fine = Date.now() + ms
  while (Date.now() < fine) {
    const fermo = await asOwner(
      async (o) =>
        (
          await o.query<{ n: number }>(
            "select count(*)::int as n from pg_stat_activity where pid = $1 and wait_event_type = 'Lock'",
            [pid],
          )
        ).rows[0].n,
    )
    if (fermo > 0) return
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error('attendiBlocco: la connessione non si è mai fermata su un blocco')
}

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('creazione', () => {
  it('crea visita e appuntamenti insieme e restituisce le versioni', async () => {
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, { appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)] }),
    )
    expect(r.esito).toBe('salvata')
    expect(r.appuntamenti?.map((x) => x.id).sort()).toEqual([A1, A2].sort())
    expect(r.visita).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    const stato = await statoDb()
    expect(stato.visite).toHaveLength(1)
    expect(stato.appuntamenti.map((x) => x.s).sort((p, q) => p - q)).toEqual([120, 140])
  })

  it('non lascia niente dietro se il secondo appuntamento collide', async () => {
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const codiceErrore = await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await salva(c, {
          visita: '50000000-0000-4000-8000-0000000000b2',
          cliente: CLIENT_LUCIA,
          appuntamenti: [app1(A2, 200), app1(A3, 120)],
        })
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('23505')
    const stato = await statoDb()
    expect(stato.visite).toHaveLength(1)
    expect(stato.appuntamenti).toHaveLength(1)
  })

  it('crea la cliente nuova nella stessa transazione', async () => {
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        cliente: NUOVA_CLIENTE,
        clienteNuova: { nome: 'Giulia Bianchi', telefono: '+393339998877', mese: 3, giorno: 12 },
        appuntamenti: [app1(A1, 120)],
      }),
    )
    expect(r.esito).toBe('salvata')
    const nomi = await asOwner(async (c) => {
      const x = await c.query<{ n: string }>('select full_name as n from client where id = $1', [NUOVA_CLIENTE])
      return x.rows.map((y) => y.n)
    })
    expect(nomi).toEqual(['Giulia Bianchi'])
  })

  it('non lascia la cliente nuova se la visita non si salva', async () => {
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await salva(c, {
          visita: '50000000-0000-4000-8000-0000000000b3',
          cliente: NUOVA_CLIENTE,
          clienteNuova: { nome: 'Giulia Bianchi', telefono: '+393339998877', mese: 3, giorno: 12 },
          appuntamenti: [app1(A3, 120)],
        })
      } catch {
        /* il conflitto è il punto della prova */
      }
    })
    const quante = await asOwner(async (c) => {
      const x = await c.query<{ n: string }>('select count(*) as n from client where id = $1', [NUOVA_CLIENTE])
      return Number(x.rows[0].n)
    })
    expect(quante).toBe(0)
  })

  it('risponde esiste_gia su un id che c è già, senza scrivere', async () => {
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const r = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A2, 200)] }))
    expect(r.esito).toBe('esiste_gia')
    const stato = await statoDb()
    expect(stato.appuntamenti.map((x) => x.s)).toEqual([120])
  })

  it('risponde cancellata_altrove su un id che risulta cancellato', async () => {
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    const r = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A2, 200)] }))
    expect(r.esito).toBe('cancellata_altrove')
  })

  it('rifiuta un elenco vuoto', async () => {
    const codiceErrore = await asOperator(VERA_AUTH, async (c) => {
      try {
        await salva(c, { appuntamenti: [] })
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('22023')
  })
})

describe('modifica', () => {
  const crea = () =>
    asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, { appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)] }),
    )

  it('sposta un solo servizio e cambia la versione del solo appuntamento toccato', async () => {
    const creata = await crea()
    const versioni = Object.fromEntries(creata.appuntamenti!.map((a) => [a.id, a.versione]))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('salvata')
    const nuove = Object.fromEntries(r.appuntamenti!.map((a) => [a.id, a.versione]))
    expect(nuove[A1]).not.toBe(versioni[A1])
    expect(nuove[A2]).toBe(versioni[A2])
  })

  it('rifiuta una versione vecchia di un appuntamento', async () => {
    const creata = await crea()
    await asOwner((c) => c.query('update appointment set start_cell = 160 where id = $1', [A2]))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 126), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('modificata_altrove')
    expect(r.stato?.appuntamenti.map((x) => x.inizio).sort((p, q) => p - q)).toEqual([120, 160])
  })

  it('NON toglie in silenzio un appuntamento che una collega ha aggiunto', async () => {
    const creata = await crea()
    await asOwner((c) =>
      c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4, $5::date, 200, 12)`,
        [A3, V1, ANNALISA, SERVICE_REFILL, DAY_ONE],
      ),
    )
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('modificata_altrove')
    const stato = await statoDb()
    expect(stato.appuntamenti.map((x) => x.id).sort()).toEqual([A1, A2, A3].sort())
  })

  it('cambia la versione della visita quando cambia l insieme, anche se la visita in sé non cambia', async () => {
    const creata = await crea()
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A1, 120)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('salvata')
    expect(r.visita).not.toBe(creata.visita)
  })

  it('toglie l unico servizio e ne aggiunge un altro senza cancellare la visita', async () => {
    const creata = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        appuntamenti: [app1(A3, 120, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('salvata')
    const stato = await statoDb()
    expect(stato.visite).toHaveLength(1)
    expect(stato.appuntamenti.map((x) => x.id)).toEqual([A3])
  })

  it('cambia la data e porta con sé gli appuntamenti', async () => {
    const creata = await crea()
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        data: DAY_TWO,
        appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      }),
    )
    expect(r.esito).toBe('salvata')
    const stato = await statoDb()
    expect(stato.visite[0].d).toBe(DAY_TWO)
    expect(new Set(stato.appuntamenti.map((x) => x.v))).toEqual(new Set([V1]))
  })

  it('risponde cancellata_altrove se la visita è stata cancellata', async () => {
    const creata = await crea()
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, { appuntamenti: [app1(A1, 120)], visitaAttesa: creata.visita, attesi: creata.appuntamenti }),
    )
    expect(r.esito).toBe('cancellata_altrove')
  })

  it('risponde non_trovata su una visita mai esistita', async () => {
    const r = await asOperatorCommit(VERA_AUTH, (c) =>
      salva(c, {
        visita: '50000000-0000-4000-8000-0000000000ff',
        appuntamenti: [app1(A1, 120)],
        visitaAttesa: '2026-03-12T08:00:00.000000Z',
        attesi: [],
      }),
    )
    expect(r.esito).toBe('non_trovata')
  })

  it('rifiuta un appuntamento che appartiene a un altra visita', async () => {
    const creata = await crea()
    await asOwner(async (c) => {
      await c.query('insert into visit (id, client_id, visit_date) values ($1, $2, $3::date)', [
        '50000000-0000-4000-8000-0000000000c1',
        CLIENT_LUCIA,
        DAY_ONE,
      ])
      await c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ($1, $2, $3, $4, $5::date, 220, 12)`,
        [A3, '50000000-0000-4000-8000-0000000000c1', ANNALISA, SERVICE_REFILL, DAY_ONE],
      )
    })
    const codiceErrore = await asOperator(VERA_AUTH, async (c) => {
      try {
        await salva(c, {
          appuntamenti: [app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10), app1(A3, 240)],
          visitaAttesa: creata.visita,
          attesi: creata.appuntamenti,
        })
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('22023')
  })
})

describe('registro degli invii', () => {
  it('restituisce annullato a un invio che «Controlla» ha già bruciato', async () => {
    const cod = codice()
    await asOwner((c) => c.query("insert into invio (codice, esito) values ($1, 'annullato')", [cod]))
    const r = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { codice: cod, appuntamenti: [app1(A1, 120)] }))
    expect(r.esito).toBe('annullato')
    expect((await statoDb()).visite).toEqual([])
  })

  it('registra l esito accanto al codice', async () => {
    const cod = codice()
    await asOperatorCommit(VERA_AUTH, (c) => salva(c, { codice: cod, appuntamenti: [app1(A1, 120)] }))
    const esito = await asOwner(async (c) => {
      const r = await c.query<{ e: string }>('select esito as e from invio where codice = $1', [cod])
      return r.rows[0].e
    })
    expect(esito).toBe('salvata')
  })

  it('a un account chiuso PRIMA della chiamata non dice mai salvata', async () => {
    const creata = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    // La sessione di Vera sparisce: da qui in poi la sicurezza per riga le
    // nasconde tutto, e un UPDATE tocca zero righe SENZA errore.
    const sessione = await sessioneDi(VERA_AUTH)
    await asOwner((c) => c.query('delete from auth.sessions where id = $1', [sessione.sessionId]))
    const esito = await asOperatorConSessione(VERA_AUTH, sessione.sessionId, async (c) => {
      try {
        const r = await salva(c, {
          appuntamenti: [app1(A1, 126)],
          visitaAttesa: creata.visita,
          attesi: creata.appuntamenti,
        })
        return r.esito
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(esito).not.toBe('salvata')
    const stato = await statoDb()
    expect(stato.appuntamenti.map((x) => x.s)).toEqual([120])
    dimenticaSessioni()
  })

  it('l operatrice disattivata mentre il salvataggio è in coda riceve non_trovata, mai salvata', async () => {
    // Misurato tre volte al quarto giro e tre al quinto: l'esito è
    // `non_trovata`, non un errore. Quando il blocco si libera, la fotografia
    // nuova è già senza permessi, quindi la regola 2 legge un insieme vuoto e
    // la regola 6 se ne accorge. È il presidio delle regole 5 e 6 sotto
    // concorrenza — con `p_attesi` CORRETTI, come qui. Con `p_attesi` vuoti la
    // stessa forma arriva invece alla regola 11: la prova qui sotto.
    const creata = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const guardiano = await connect()
    const scrittore = await connect()
    const sessione = await sessioneDi(VERA_AUTH)
    let esito = 'nessun errore'
    try {
      // 1. il guardiano prende il blocco sulla visita e lo tiene
      await guardiano.query('begin')
      await guardiano.query('select 1 from visit where id = $1 for update', [V1])

      // 2. il salvataggio di Vera parte e si mette in coda
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      const inCoda = scrittore
        .query('select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r', [
          codice(),
          V1,
          CLIENT_MARIA,
          DAY_ONE,
          JSON.stringify([app1(A1, 126)]),
          creata.visita,
          JSON.stringify(creata.appuntamenti),
        ])
        .then((r) => (r.rows[0] as { r: { esito: string } }).r.esito)
        .catch((e) => pgCode(e) ?? 'ignoto')

      // 3. mentre è in coda, una collega disattiva Vera. Si aspetta la
      //    CONDIZIONE, non un tempo: con `setTimeout(300)` lo scrittore può non
      //    essere ancora arrivato al blocco, la disattivazione lo precede e
      //    l'esito diventa `42501` dalla guardia in testa — prova rossa senza
      //    nessun difetto sotto.
      await attendiBlocco(scrittore)
      await asOwner((c) => c.query('update operator set is_active = false where id = $1', [VERA]))

      // 4. il guardiano molla: il salvataggio riparte SENZA più i permessi
      await guardiano.query('commit')
      esito = await inCoda
      await scrittore.query('rollback').catch(() => {})
    } finally {
      await guardiano.end()
      await scrittore.end()
      await asOwner((c) => c.query('update operator set is_active = true where id = $1', [VERA]))
      dimenticaSessioni()
    }
    // `non_trovata` e non un errore: il valore misurato, non «qualcosa che non
    // sia salvata». Una prova che accettasse qualunque cosa diversa da
    // `salvata` resterebbe verde anche se le regole 5 e 6 sparissero.
    expect(esito).toBe('non_trovata')
    expect((await statoDb()).appuntamenti.map((x) => x.s)).toEqual([120])
  })

  it('la regola 11 ferma la scrittura quando la visibilità cade DOPO i confronti', async () => {
    // Misurato 3 volte su 3 al quinto giro. Il blocco NON è sulla visita ma
    // sulla riga della cliente: così `salva_visita` supera la regola 2 e la
    // regola 6 con argomenti tutti corretti, e si ferma sull'`insert into
    // public.client` della cliente nuova. Quando riparte, l'UPDATE della visita
    // apre la fotografia nuova, è cieco, tocca zero righe: regola 11.
    //
    // Si asserisce il MESSAGGIO, non il codice: togliendo il riesame arriva
    // comunque un 42501, ma dal `with check` della politica su `appointment`.
    // Una prova sul solo codice resterebbe verde e non presidierebbe niente.
    const creata = await asOperatorCommit(VERA_AUTH, (c) => salva(c, { appuntamenti: [app1(A1, 120)] }))
    const guardiano = await connect()
    const scrittore = await connect()
    const sessione = await sessioneDi(VERA_AUTH)
    let messaggio = 'nessun errore'
    try {
      // 1. il guardiano tiene la riga della cliente e non committa
      await guardiano.query('begin')
      await guardiano.query('update client set full_name = full_name where id = $1', [CLIENT_MARIA])

      // 2. il salvataggio parte con la stessa cliente passata anche come
      //    cliente nuova (percorso previsto dalla firma: stesso id), e si
      //    blocca sull'inserimento, che aspetta l'esito del guardiano
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      const inCoda = salva(scrittore, {
        cliente: CLIENT_MARIA,
        clienteNuova: { nome: 'Maria Rossi', telefono: '+393331110000', mese: 3, giorno: 12 },
        appuntamenti: [app1(A1, 126)],
        visitaAttesa: creata.visita,
        attesi: creata.appuntamenti,
      })
        .then(() => 'nessun errore')
        .catch((e: { message: string }) => e.message)

      // 3. mentre è ferma sulla cliente, una collega disattiva Vera
      await attendiBlocco(scrittore)
      await asOwner((c) => c.query('update operator set is_active = false where id = $1', [VERA]))

      // 4. il guardiano molla: il salvataggio riparte senza più i permessi
      await guardiano.query('commit')
      messaggio = await inCoda
      await scrittore.query('rollback').catch(() => {})
    } finally {
      await guardiano.end()
      await scrittore.end()
      await asOwner((c) => c.query('update operator set is_active = true where id = $1', [VERA]))
      dimenticaSessioni()
    }
    expect(messaggio).toContain('la visita non è più visibile a chi scrive')
    expect((await statoDb()).appuntamenti.map((x) => x.s)).toEqual([120])
  })
})
```

- [ ] **Passo 2: esegui e verifica che falliscano**

Run: `npx vitest run tests/schema/salva-visita.test.ts`
Atteso: rosse con `42883 function salva_visita(...) does not exist`.

- [ ] **Passo 3: scrivi la migrazione**

```sql
-- supabase/migrations/0016_salva_visita.sql
--
-- Crea o modifica una visita, tutto o niente. Design 3a §4.1, regole 0-11.
--
-- Perché una funzione e non più chiamate: su PostgREST ogni chiamata è la sua
-- transazione, quindi una modifica fatta di due scritture lascia la visita a
-- metà al primo errore, e uno scambio d'orario fra due servizi della stessa
-- operatrice non si salva in nessun ordine (D29, spec §4.6).
--
-- L'ORDINE delle cose, che è tutto:
--   0. il codice d'invio, PRIMA di qualunque scrittura: una scrittura fatta
--      prima sopravviverebbe al conflitto sulla chiave (misurato).
--   2. blocco della visita, poi — in un'istruzione SEPARATA — blocco degli
--      appuntamenti e lettura delle cancellate: una lettura fatta nella stessa
--      istruzione del blocco vedrebbe la fotografia presa prima dell'attesa.
--   3-6. i confronti, tutti PRIMA di scrivere.
--   8. le scritture: cliente nuova, visita, aggiornamenti, inserimenti, e per
--      ULTIME le cancellazioni, così zz_delete_orphan_visit non trova mai la
--      visita vuota a metà funzione.
--   11. ogni UPDATE e DELETE conta le righe toccate: con la sicurezza per riga
--      un account chiuso nell'istante della scrittura ne tocca zero SENZA
--      errore, e la funzione registrerebbe un falso «salvata».
create function public.salva_visita(
  p_codice        uuid,
  p_visita        uuid,
  p_cliente       uuid,
  p_cliente_nuova jsonb,
  p_data          date,
  p_appuntamenti  jsonb,
  p_visita_attesa text,
  p_attesi        jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_registrato   text;
  v_modifica     boolean := p_visita_attesa is not null;
  v_trovata      boolean := false;
  v_cancellata   boolean := false;
  v_versione     text;
  v_correnti     jsonb;
  v_ids_nuovi    uuid[];
  v_insieme_cambia boolean := false;
  v_toccate      integer;
  v_stato        jsonb;
  r              record;
begin
  -- Rifiuto esplicito (decisione dell'utente del 23/09). Senza, un account che
  -- non è operatrice riceve `non_trovata`, perché la sicurezza per riga gli
  -- nasconde la visita: la difesa funziona, ma il messaggio è ambiguo e la
  -- scelta non sarebbe presidiata da nessuna prova.
  if not (select app.is_active_operator()) then
    raise exception 'salva_visita: chi chiama non è un operatrice attiva' using errcode = '42501';
  end if;

  -- Regola 9: il vincolo dell'occupazione resta differito fino alla fine, così
  -- gli spostamenti interni non collidono con sé stessi. Nominato e non ALL:
  -- ALL sveglierebbe anche zz_touch_client_activity (0007), che è differito
  -- apposta (vedi il commento di testa di 0010).
  set constraints public.appointment_slot_unique deferred;

  -- Regola 0.
  v_registrato := app.apri_invio(p_codice);
  if v_registrato is not null then
    if v_registrato = 'in_corso' then
      raise exception 'salva_visita: il codice % è già in corso in questa transazione', p_codice
        using errcode = 'P0003';
    end if;
    return jsonb_build_object('esito', case when v_registrato = 'annullato' then 'annullato' else v_registrato end);
  end if;

  -- Regola 7, prima parte: almeno un appuntamento, e nessun id ripetuto.
  if p_appuntamenti is null or jsonb_typeof(p_appuntamenti) <> 'array'
     or jsonb_array_length(p_appuntamenti) = 0 then
    raise exception 'salva_visita: serve almeno un appuntamento; per togliere tutto si usa cancella_visita'
      using errcode = '22023';
  end if;
  select array_agg((e ->> 'id')::uuid) into v_ids_nuovi
  from jsonb_array_elements(p_appuntamenti) e;
  if (select count(distinct x) from unnest(v_ids_nuovi) x) <> array_length(v_ids_nuovi, 1) then
    raise exception 'salva_visita: id di appuntamento ripetuto' using errcode = '22023';
  end if;

  -- Regola 2: blocco, poi lettura in istruzioni separate.
  select true, app.versione(v.updated_at) into v_trovata, v_versione
  from public.visit v where v.id = p_visita for update;

  perform 1 from public.appointment a where a.visit_id = p_visita order by a.id for update;

  select coalesce(
           jsonb_agg(jsonb_build_object('id', a.id, 'versione', app.versione(a.updated_at)) order by a.id),
           '[]'::jsonb)
    into v_correnti
  from public.appointment a where a.visit_id = p_visita;

  select true into v_cancellata from public.visita_cancellata vc where vc.id = p_visita;
  v_cancellata := coalesce(v_cancellata, false);

  -- Regole 3, 4, 5, 6.
  if not v_modifica then
    if coalesce(v_trovata, false) then
      perform app.chiudi_invio(p_codice, 'esiste_gia');
      return jsonb_build_object('esito', 'esiste_gia');
    elsif v_cancellata then
      perform app.chiudi_invio(p_codice, 'cancellata_altrove');
      return jsonb_build_object('esito', 'cancellata_altrove');
    end if;
  else
    if not coalesce(v_trovata, false) then
      if v_cancellata then
        perform app.chiudi_invio(p_codice, 'cancellata_altrove');
        return jsonb_build_object('esito', 'cancellata_altrove');
      end if;
      perform app.chiudi_invio(p_codice, 'non_trovata');
      return jsonb_build_object('esito', 'non_trovata');
    end if;

    if v_versione is distinct from p_visita_attesa
       or coalesce(p_attesi, '[]'::jsonb) is distinct from v_correnti then
      v_stato := public.stato_visita(p_visita);
      -- Se nel frattempo la visita non è più leggibile (cancellata da una
      -- collega, o account chiuso), `stato` sarebbe NULL e la scheda non
      -- avrebbe niente da mostrare: l'esito giusto è l'altro.
      if v_stato is null then
        perform app.chiudi_invio(p_codice, case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
        return jsonb_build_object('esito', case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
      end if;
      perform app.chiudi_invio(p_codice, 'modificata_altrove');
      return jsonb_build_object('esito', 'modificata_altrove', 'stato', v_stato);
    end if;
  end if;

  -- Regola 7, seconda parte: ogni id esistente deve appartenere a QUESTA visita.
  perform 1
  from unnest(v_ids_nuovi) x
  join public.appointment a on a.id = x
  where a.visit_id is distinct from p_visita;
  if found then
    raise exception 'salva_visita: un appuntamento dell elenco appartiene a un altra visita'
      using errcode = '22023';
  end if;

  -- Regola 8, prima scrittura: la cliente nuova, nella stessa transazione.
  if p_cliente_nuova is not null then
    insert into public.client (id, full_name, phone, birth_month, birth_day)
    values (
      p_cliente,
      p_cliente_nuova ->> 'nome',
      p_cliente_nuova ->> 'telefono',
      (p_cliente_nuova ->> 'mese')::smallint,
      (p_cliente_nuova ->> 'giorno')::smallint
    )
    on conflict (id) do nothing;
  end if;

  if not v_modifica then
    insert into public.visit (id, client_id, visit_date) values (p_visita, p_cliente, p_data);
  else
    update public.visit v
       set visit_date = p_data, client_id = p_cliente
     where v.id = p_visita
       and (v.visit_date, v.client_id) is distinct from (p_data, p_cliente);
    get diagnostics v_toccate = row_count;
    -- Regola 11: RAGGIUNTA DAVVERO, ma indistinguibile sul solo codice.
    --
    -- Misurata al quinto giro di revisione su banco usa e getta, 3 volte su 3.
    -- La forma che ci arriva: una collega tiene aperta una scrittura sulla riga
    -- della cliente; qui `salva_visita` si ferma sull'`insert into
    -- public.client` della cliente nuova, cioè DOPO la regola 2 e DOPO la
    -- regola 6, con argomenti tutti corretti; mentre è ferma, l'operatrice
    -- viene disattivata; quando il blocco si libera questo UPDATE apre la sua
    -- fotografia nuova, è cieco, tocca zero righe, e arriva qui.
    -- (Ci si arriva anche col blocco sulla visita, purché `p_attesi` sia vuoto:
    -- lo scarto con la misura del quarto giro era solo quello.)
    --
    -- ⚠︎ Togliendo questo riesame la transazione muore lo stesso un passo dopo,
    -- con lo STESSO codice 42501 ma dal `with check` della politica su
    -- `appointment`. Quindi il presidio è la prova che asserisce il MESSAGGIO,
    -- non il codice: «la regola 11 ferma la scrittura quando la visibilità cade
    -- DOPO i confronti», in `tests/schema/salva-visita.test.ts`.
    if v_toccate = 0 and not exists (select 1 from public.visit v where v.id = p_visita) then
      raise exception 'salva_visita: la visita non è più visibile a chi scrive' using errcode = '42501';
    end if;
  end if;

  -- Aggiornamenti: SOLO le righe che cambiano davvero. Aggiornare una riga
  -- identica alzerebbe la sua versione e darebbe «modificata altrove» alla
  -- scheda aperta di una collega.
  for r in
    select (e ->> 'id')::uuid           as id,
           (e ->> 'operatrice')::uuid   as operatrice,
           (e ->> 'servizio')::uuid     as servizio,
           (e ->> 'inizio')::smallint   as inizio,
           (e ->> 'durata')::smallint   as durata
    from jsonb_array_elements(p_appuntamenti) e
  loop
    if exists (select 1 from public.appointment a where a.id = r.id and a.visit_id = p_visita) then
      update public.appointment a
         set operator_id = r.operatrice,
             service_id  = r.servizio,
             start_cell  = r.inizio,
             cell_count  = r.durata,
             appointment_date = p_data
       where a.id = r.id
         and (a.operator_id, a.service_id, a.start_cell, a.cell_count, a.appointment_date)
             is distinct from (r.operatrice, r.servizio, r.inizio, r.durata, p_data);
      get diagnostics v_toccate = row_count;
      -- Regola 11, stessa forma e stesso ragionamento di sopra.
      if v_toccate = 0 and not exists (select 1 from public.appointment a where a.id = r.id) then
        raise exception 'salva_visita: l appuntamento % non è più visibile a chi scrive', r.id
          using errcode = '42501';
      end if;
    else
      insert into public.appointment
        (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
      values (r.id, p_visita, r.operatrice, r.servizio, p_data, r.inizio, r.durata);
      v_insieme_cambia := true;
    end if;
  end loop;

  -- Per ULTIME le cancellazioni (regola 8).
  for r in
    select a.id from public.appointment a
    where a.visit_id = p_visita and not (a.id = any (v_ids_nuovi))
  loop
    delete from public.appointment a where a.id = r.id;
    get diagnostics v_toccate = row_count;
    -- Regola 11: zero righe qui vuol dire «non mi è più visibile», non
    -- «versione diversa»: il confronto è già stato fatto sotto blocco.
    if v_toccate <> 1 then
      -- Messaggio DIVERSO da quello del riesame dopo `update public.visit`: due
      -- raise con lo stesso testo renderebbero ambigua la prova della regola 11,
      -- che asserisce con `toContain`.
      raise exception 'salva_visita: la visita non è più visibile a chi scrive (versione dell insieme)'
        using errcode = '42501';
    end if;
    v_insieme_cambia := true;
  end loop;

  -- La versione della visita deve cambiare anche quando cambia solo l'INSIEME:
  -- altrimenti «una collega ha aggiunto e poi tolto» torna identico a «non è
  -- mai arrivato» (design 3a §4.1 punto 3, misurato al quinto giro).
  if v_insieme_cambia and v_modifica then
    update public.visit v set visit_date = v.visit_date where v.id = p_visita;
    get diagnostics v_toccate = row_count;
    if v_toccate <> 1 then
      raise exception 'salva_visita: la visita non è più visibile a chi scrive' using errcode = '42501';
    end if;
  end if;

  set constraints public.appointment_slot_unique immediate;

  perform app.chiudi_invio(p_codice, 'salvata');

  return jsonb_build_object(
    'esito', 'salvata',
    'visita', (select app.versione(v.updated_at) from public.visit v where v.id = p_visita),
    'appuntamenti', (
      select coalesce(
        jsonb_agg(jsonb_build_object('id', a.id, 'versione', app.versione(a.updated_at)) order by a.id),
        '[]'::jsonb)
      from public.appointment a where a.visit_id = p_visita
    )
  );
end
$$;

-- Lo stato corrente di una visita, come lo mostra la scheda dopo
-- «modificata altrove» e come lo legge «Controlla» (Task 7).
create function public.stato_visita(p_visita uuid) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select case when v.id is null then null else jsonb_build_object(
    'visita', app.versione(v.updated_at),
    'data', v.visit_date,
    'cliente', v.client_id,
    'appuntamenti', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', a.id, 'versione', app.versione(a.updated_at),
               'operatrice', a.operator_id, 'servizio', a.service_id,
               'inizio', a.start_cell, 'durata', a.cell_count) order by a.id), '[]'::jsonb)
      from public.appointment a where a.visit_id = v.id
    )
  ) end
  from public.visit v where v.id = p_visita
$$;

revoke execute on function
  public.salva_visita(uuid, uuid, uuid, jsonb, date, jsonb, text, jsonb),
  public.stato_visita(uuid)
from public, anon;

grant execute on function
  public.salva_visita(uuid, uuid, uuid, jsonb, date, jsonb, text, jsonb),
  public.stato_visita(uuid)
to authenticated;
```

Nel file scrivi `stato_visita` **prima** di `salva_visita`: non è un obbligo tecnico — un `create function` che
nomina una funzione non ancora creata passa, e la chiamata funziona appena l'altra esiste (misurato) — ma si legge
meglio.

- [ ] **Passo 4: applica ed esegui**

Run: `npx supabase db reset && npx vitest run tests/schema/salva-visita.test.ts`
Atteso: 21 verdi (19 delle tre sezioni, più la prova su `non_trovata` sotto blocco e quella sulla regola 11).

- [ ] **Passo 5: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | sposta `app.apri_invio` **dopo** l'inserimento della cliente nuova | nessuna prova esistente: **aggiungila** — un invio bruciato non deve lasciare la cliente |
| 2 | nella regola 6, togli il confronto sull'insieme (`p_attesi … is distinct from v_correnti`) | *«NON toglie in silenzio un appuntamento che una collega ha aggiunto»* |
| 3 | nella regola 6, togli il confronto sulla versione della visita | *«rifiuta una versione vecchia…»* (verifica: potrebbe restare verde perché l'insieme basta — allora **aggiungi** una prova che cambia solo la data da un'altra sessione) |
| 4 | metti le cancellazioni **prima** degli inserimenti | *«toglie l unico servizio e ne aggiunge un altro…»* |
| 5 | togli `v_insieme_cambia` dall'aggiornamento della visita | *«cambia la versione della visita quando cambia l insieme…»* |
| 6 | togli `is distinct from` dall'UPDATE degli appuntamenti | *«sposta un solo servizio e cambia la versione del solo appuntamento toccato»* |
| 7 | togli il riesame della visibilità **subito dopo `update public.visit`** e quello **subito dopo `update public.appointment`** (i riesami dopo un UPDATE sono tre, più uno dopo la DELETE: vanno tolti questi due) | *«la regola 11 ferma la scrittura quando la visibilità cade DOPO i confronti»*, che asserisce il **messaggio**. ⚠︎ Sul solo codice la sonda **non avrebbe vittima**: senza il riesame arriva comunque un `42501`, ma dal `with check` della politica su `appointment` (misurato al quinto giro). È la ragione per cui quella prova guarda il testo e non il codice |
| 8 | `set constraints … deferred` → toglilo | **nessuna prova di questo task**: il vincolo è già `initially deferred` (`0005:25-27`), quindi con una sola chiamata per transazione la riga non fa niente. Il presidio è la quinta prova del **Task 11**, che fa due chiamate nella stessa transazione con uno scambio fra appuntamenti della stessa operatrice |
| 8b | togli il `set constraints … immediate` finale | *«non lascia niente dietro se il secondo appuntamento collide»*: il `23505` arriverebbe al commit, fuori dalla funzione |
| 9 | togli il controllo della regola 7 sugli id di un'altra visita | *«rifiuta un appuntamento che appartiene a un altra visita»* |
| 10 | togli la guardia `app.is_active_operator()` in testa | *«risponde sempre 42501, mai un esito di dominio»* (Task 9), **e solo quella**: le due prove sull'effetto restano verdi perché la sicurezza per riga difende comunque — ed è esattamente la ragione per cui la guardia serve, cioè un messaggio univoco |

- [ ] **Passo 6: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add supabase/migrations/0016_salva_visita.sql tests/schema/salva-visita.test.ts
git commit -m "feat(3a-1): salva_visita, una visita intera in una transazione

Creare e modificare passano dalla stessa funzione, con la versione attesa della
visita e l'insieme atteso degli appuntamenti: un servizio aggiunto da una
collega fa differire l'insieme e non viene mai tolto in silenzio (design 3a
§4.1, regola 6).

L'ordine è tutto: il codice d'invio prima di ogni scrittura, i blocchi e le
letture in istruzioni separate, i confronti prima di scrivere, le cancellazioni
per ultime, e ogni UPDATE e DELETE che conta le righe toccate.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: `sposta_visita_a` e `cancella_visita`

**Files:**
- Create: `supabase/migrations/0017_sposta_e_cancella.sql`
- Create: `tests/schema/sposta-e-cancella.test.ts`

**Interfaces:**
- Consuma: tutto il Task 5.
- Produce:
  `public.sposta_visita_a(p_codice uuid, p_visita uuid, p_data date, p_destinazioni jsonb, p_visita_attesa text, p_attesi jsonb) returns jsonb`
  — `p_destinazioni` è `[{"id","inizio"}]` con **lo stesso insieme di id** di `p_attesi`;
  `public.cancella_visita(p_codice uuid, p_visita uuid, p_visita_attesa text, p_attesi jsonb) returns jsonb`.

**Destinazione assoluta e non scarto relativo:** l'app calcola il nuovo inizio di **ciascun** appuntamento
conservando gli scarti, così un invio ripetuto non sposta due volte (design 3a §4.1).

- [ ] **Passo 1: scrivi le prove che falliscono**

```ts
// tests/schema/sposta-e-cancella.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ALESSANDRA, VERA, VERA_AUTH, asOperatorCommit, asOwner, pgCode, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'

const V1 = '50000000-0000-4000-8000-0000000000d1'
const A1 = '60000000-0000-4000-8000-0000000000d1'
const A2 = '60000000-0000-4000-8000-0000000000d2'
let seq = 0
const codice = () => `70000000-0000-4000-8000-1${String(++seq).padStart(11, '0')}`

type Risposta = { esito: string; visita?: string; appuntamenti?: { id: string; versione: string }[]; stato?: unknown }

const crea = () =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: Risposta }>('select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r', [
      codice(),
      V1,
      CLIENT_MARIA,
      DAY_ONE,
      JSON.stringify([
        { id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 },
        { id: A2, operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 140, durata: 10 },
      ]),
    ])
    return r.rows[0].r
  })

const inizi = () =>
  asOwner(async (c) => {
    const r = await c.query<{ id: string; s: number; d: string }>(
      'select id, start_cell as s, appointment_date::text as d from appointment order by id',
    )
    return r.rows
  })

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('sposta_visita_a', () => {
  it('sposta tutti gli appuntamenti alle destinazioni date', async () => {
    const creata = await crea()
    const r = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(r.esito).toBe('salvata')
    expect((await inizi()).map((x) => x.s)).toEqual([126, 146])
  })

  it('ripetuto con le versioni nuove non sposta due volte', async () => {
    const creata = await crea()
    const primo = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    const secondo = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        primo.visita,
        JSON.stringify(primo.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(secondo.esito).toBe('salvata')
    expect((await inizi()).map((x) => x.s)).toEqual([126, 146])
  })

  it('porta la visita a un altro giorno', async () => {
    const creata = await crea()
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select sposta_visita_a($1,$2,$3::date,$4,$5,$6)', [
        codice(),
        V1,
        DAY_TWO,
        JSON.stringify([{ id: A1, inizio: 120 }, { id: A2, inizio: 140 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ]),
    )
    expect((await inizi()).map((x) => x.d)).toEqual([DAY_TWO, DAY_TWO])
  })

  it('rifiuta un insieme di destinazioni diverso da quello atteso', async () => {
    const creata = await crea()
    const codiceErrore = await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await c.query('select sposta_visita_a($1,$2,$3::date,$4,$5,$6)', [
          codice(),
          V1,
          DAY_ONE,
          JSON.stringify([{ id: A1, inizio: 126 }]),
          creata.visita,
          JSON.stringify(creata.appuntamenti),
        ])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(codiceErrore).toBe('22023')
  })

  it('risponde modificata_altrove se una collega ha toccato la visita', async () => {
    const creata = await crea()
    await asOwner((c) => c.query('update appointment set start_cell = 160 where id = $1', [A2]))
    const r = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r', [
        codice(),
        V1,
        DAY_ONE,
        JSON.stringify([{ id: A1, inizio: 126 }, { id: A2, inizio: 146 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })
    expect(r.esito).toBe('modificata_altrove')
    expect((await inizi()).map((x) => x.s)).toEqual([120, 160])
  })
})

describe('cancella_visita', () => {
  const cancella = (creata: Risposta, cod = codice()) =>
    asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select cancella_visita($1,$2,$3,$4) as r', [
        cod,
        V1,
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ])
      return x.rows[0].r
    })

  it('cancella la visita e i suoi appuntamenti', async () => {
    const creata = await crea()
    const r = await cancella(creata)
    expect(r.esito).toBe('cancellata')
    expect(await inizi()).toEqual([])
  })

  it('registra la visita fra le cancellate', async () => {
    const creata = await crea()
    await cancella(creata)
    const righe = await asOwner(async (c) => {
      const x = await c.query<{ id: string }>('select id from visita_cancellata')
      return x.rows.map((y) => y.id)
    })
    expect(righe).toEqual([V1])
  })

  it('risponde gia_cancellata su una visita che non c è più e risulta cancellata', async () => {
    const creata = await crea()
    await cancella(creata)
    const r = await cancella(creata)
    expect(r.esito).toBe('gia_cancellata')
  })

  it('risponde non_trovata su una visita mai esistita', async () => {
    const r = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: Risposta }>('select cancella_visita($1,$2,$3,$4) as r', [
        codice(),
        '50000000-0000-4000-8000-0000000000ff',
        '2026-03-12T08:00:00.000000Z',
        '[]',
      ])
      return x.rows[0].r
    })
    expect(r.esito).toBe('non_trovata')
  })

  it('non cancella se una collega ha aggiunto un servizio nel frattempo', async () => {
    const creata = await crea()
    await asOwner((c) =>
      c.query(
        `insert into appointment (id, visit_id, operator_id, service_id, appointment_date, start_cell, cell_count)
         values ('60000000-0000-4000-8000-0000000000d3', $1, $2, $3, $4::date, 200, 12)`,
        [V1, VERA, SERVICE_REFILL, DAY_ONE],
      ),
    )
    const r = await cancella(creata)
    expect(r.esito).toBe('modificata_altrove')
    expect((await inizi()).length).toBe(3)
  })
})
```

- [ ] **Passo 2: esegui e verifica che falliscano** — `npx vitest run tests/schema/sposta-e-cancella.test.ts`, rosse
  con `42883`.

- [ ] **Passo 3: scrivi la migrazione**

```sql
-- supabase/migrations/0017_sposta_e_cancella.sql
--
-- Le due funzioni gemelle di salva_visita. Stesse regole 0, 2, 5, 6, 8, 9, 10,
-- 11 (design 3a §4.1); qui sotto solo ciò che cambia.
--
-- sposta_visita_a riceve la DESTINAZIONE ASSOLUTA di ciascun appuntamento —
-- data e nuovo inizio, calcolati dall'app conservando gli scarti — e non uno
-- scarto relativo: un invio ripetuto con lo scarto sposterebbe due volte.
-- L'insieme degli id di destinazione deve coincidere con l'insieme atteso.
create function public.sposta_visita_a(
  p_codice        uuid,
  p_visita        uuid,
  p_data          date,
  p_destinazioni  jsonb,
  p_visita_attesa text,
  p_attesi        jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_registrato text;
  v_trovata    boolean := false;
  v_cancellata boolean := false;
  v_versione   text;
  v_correnti   jsonb;
  v_toccate    integer;
  v_stato      jsonb;
  r            record;
begin
  if not (select app.is_active_operator()) then
    raise exception 'sposta_visita_a: chi chiama non è un operatrice attiva' using errcode = '42501';
  end if;

  set constraints public.appointment_slot_unique deferred;

  v_registrato := app.apri_invio(p_codice);
  if v_registrato is not null then
    if v_registrato = 'in_corso' then
      raise exception 'sposta_visita_a: codice % già in corso', p_codice using errcode = 'P0003';
    end if;
    return jsonb_build_object('esito', v_registrato);
  end if;

  select true, app.versione(v.updated_at) into v_trovata, v_versione
  from public.visit v where v.id = p_visita for update;

  perform 1 from public.appointment a where a.visit_id = p_visita order by a.id for update;

  select coalesce(
           jsonb_agg(jsonb_build_object('id', a.id, 'versione', app.versione(a.updated_at)) order by a.id),
           '[]'::jsonb)
    into v_correnti
  from public.appointment a where a.visit_id = p_visita;

  select true into v_cancellata from public.visita_cancellata vc where vc.id = p_visita;
  v_cancellata := coalesce(v_cancellata, false);

  if not coalesce(v_trovata, false) then
    perform app.chiudi_invio(p_codice, case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
    return jsonb_build_object('esito', case when v_cancellata then 'cancellata_altrove' else 'non_trovata' end);
  end if;

  if v_versione is distinct from p_visita_attesa
     or coalesce(p_attesi, '[]'::jsonb) is distinct from v_correnti then
    v_stato := public.stato_visita(p_visita);
    perform app.chiudi_invio(p_codice, 'modificata_altrove');
    return jsonb_build_object('esito', 'modificata_altrove', 'stato', v_stato);
  end if;

  -- L'insieme delle destinazioni deve essere ESATTAMENTE quello atteso: una
  -- destinazione in meno cancellerebbe un appuntamento per omissione, e questa
  -- funzione non cancella niente.
  if (select array_agg(x order by x) from (
        select (e ->> 'id')::uuid as x from jsonb_array_elements(p_destinazioni) e) s)
     is distinct from
     (select array_agg(x order by x) from (
        select (e ->> 'id')::uuid as x from jsonb_array_elements(v_correnti) e) s2) then
    raise exception 'sposta_visita_a: le destinazioni non coprono esattamente gli appuntamenti della visita'
      using errcode = '22023';
  end if;

  update public.visit v set visit_date = p_data where v.id = p_visita;
  get diagnostics v_toccate = row_count;
  if v_toccate <> 1 then
    raise exception 'sposta_visita_a: la visita non è più visibile a chi scrive' using errcode = '42501';
  end if;

  for r in
    select (e ->> 'id')::uuid as id, (e ->> 'inizio')::smallint as inizio
    from jsonb_array_elements(p_destinazioni) e
  loop
    update public.appointment a
       set start_cell = r.inizio, appointment_date = p_data
     where a.id = r.id and a.visit_id = p_visita;
    get diagnostics v_toccate = row_count;
    if v_toccate <> 1 then
      raise exception 'sposta_visita_a: appuntamento % non più visibile', r.id using errcode = '42501';
    end if;
  end loop;

  set constraints public.appointment_slot_unique immediate;
  perform app.chiudi_invio(p_codice, 'salvata');

  return jsonb_build_object(
    'esito', 'salvata',
    'visita', (select app.versione(v.updated_at) from public.visit v where v.id = p_visita),
    'appuntamenti', (
      select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'versione', app.versione(a.updated_at)) order by a.id), '[]'::jsonb)
      from public.appointment a where a.visit_id = p_visita)
  );
end
$$;

-- cancella_visita: UNA SOLA delete su `visit`. Cancellare prima gli
-- appuntamenti farebbe scattare zz_delete_orphan_visit (0008) e la delete
-- sulla visita toccherebbe zero righe, che la regola 11 leggerebbe come errore
-- su una cancellazione riuscita. La cascata di appointment_visit_date_fk porta
-- via gli appuntamenti da sola.
create function public.cancella_visita(
  p_codice        uuid,
  p_visita        uuid,
  p_visita_attesa text,
  p_attesi        jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_registrato text;
  v_trovata    boolean := false;
  v_cancellata boolean := false;
  v_versione   text;
  v_correnti   jsonb;
  v_toccate    integer;
  v_stato      jsonb;
begin
  if not (select app.is_active_operator()) then
    raise exception 'cancella_visita: chi chiama non è un operatrice attiva' using errcode = '42501';
  end if;

  v_registrato := app.apri_invio(p_codice);
  if v_registrato is not null then
    if v_registrato = 'in_corso' then
      raise exception 'cancella_visita: codice % già in corso', p_codice using errcode = 'P0003';
    end if;
    return jsonb_build_object('esito', v_registrato);
  end if;

  select true, app.versione(v.updated_at) into v_trovata, v_versione
  from public.visit v where v.id = p_visita for update;

  perform 1 from public.appointment a where a.visit_id = p_visita order by a.id for update;

  select coalesce(
           jsonb_agg(jsonb_build_object('id', a.id, 'versione', app.versione(a.updated_at)) order by a.id),
           '[]'::jsonb)
    into v_correnti
  from public.appointment a where a.visit_id = p_visita;

  select true into v_cancellata from public.visita_cancellata vc where vc.id = p_visita;
  v_cancellata := coalesce(v_cancellata, false);

  if not coalesce(v_trovata, false) then
    perform app.chiudi_invio(p_codice, case when v_cancellata then 'gia_cancellata' else 'non_trovata' end);
    return jsonb_build_object('esito', case when v_cancellata then 'gia_cancellata' else 'non_trovata' end);
  end if;

  if v_versione is distinct from p_visita_attesa
     or coalesce(p_attesi, '[]'::jsonb) is distinct from v_correnti then
    v_stato := public.stato_visita(p_visita);
    perform app.chiudi_invio(p_codice, 'modificata_altrove');
    return jsonb_build_object('esito', 'modificata_altrove', 'stato', v_stato);
  end if;

  delete from public.visit v where v.id = p_visita;
  get diagnostics v_toccate = row_count;
  if v_toccate <> 1 then
    raise exception 'cancella_visita: la visita non è più visibile a chi scrive' using errcode = '42501';
  end if;

  perform app.chiudi_invio(p_codice, 'cancellata');
  return jsonb_build_object('esito', 'cancellata');
end
$$;

revoke execute on function
  public.sposta_visita_a(uuid, uuid, date, jsonb, text, jsonb),
  public.cancella_visita(uuid, uuid, text, jsonb)
from public, anon;

grant execute on function
  public.sposta_visita_a(uuid, uuid, date, jsonb, text, jsonb),
  public.cancella_visita(uuid, uuid, text, jsonb)
to authenticated;
```

- [ ] **Passo 4: applica ed esegui** — `npx supabase db reset && npx vitest run tests/schema/sposta-e-cancella.test.ts`,
  10 verdi.

- [ ] **Passo 5: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | in `cancella_visita`, cancella prima gli appuntamenti e poi la visita | *«cancella la visita e i suoi appuntamenti»* (errore `42501`) |
| 2 | togli il controllo sull'insieme delle destinazioni | *«rifiuta un insieme di destinazioni diverso…»* |
| 3 | togli il confronto dell'insieme in `cancella_visita` | *«non cancella se una collega ha aggiunto un servizio…»* |
| 4 | in `cancella_visita`, `gia_cancellata` → `cancellata` | *«risponde gia_cancellata…»* |
| 5 | togli il trigger delle cancellate (Task 1) | *«registra la visita fra le cancellate»* e *«risponde gia_cancellata…»* |

- [ ] **Passo 6: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add supabase/migrations/0017_sposta_e_cancella.sql tests/schema/sposta-e-cancella.test.ts
git commit -m "feat(3a-1): sposta_visita_a a destinazione assoluta, e cancella_visita

Lo spostamento riceve il nuovo inizio di ciascun appuntamento, non uno scarto:
un invio ripetuto non sposta due volte. L'insieme delle destinazioni deve
coprire esattamente gli appuntamenti attesi, altrimenti uno spostamento
cancellerebbe per omissione.

La cancellazione è una sola delete su visit: togliere prima gli appuntamenti
farebbe sparire la visita per il trigger di 0008, e il conteggio delle righe
leggerebbe come errore una cancellazione riuscita.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: `controlla_invio` — la rilettura che brucia l'invio che non trova

**Files:**
- Create: `supabase/migrations/0018_controlla_invio.sql`
- Create: `tests/schema/controlla-invio.test.ts`

**Interfaces:**
- Consuma: Task 1, 5, 6.
- Produce: `public.controlla_invio(p_codice uuid, p_visita uuid) returns jsonb`, che risponde
  `{"riga": 1..6, "esito_invio": …, "stato": …}` dove `stato` è quello di `public.stato_visita` oppure `null`.

**Le sei righe** (design 3a §4.4): 1 codice annullato; 2 `salvata` e visita uguale alla scheda; 3 `salvata` e visita
diversa; 4 `salvata` e visita assente ma fra le cancellate; 5 `salvata` e visita assente e **non** fra le cancellate
(non deve accadere); 6 un esito che non ha scritto. Il confronto «uguale alla scheda» lo fa **l'app**, perché conosce
la scheda: la funzione restituisce lo stato e l'app decide fra la riga 2 e la 3.

**Misurato al sesto giro** (banco `rev6_invii`): con `read committed`, istruzioni separate e il codice registrato per
primo, «Controlla» aspetta la fine del commit dell'invio — parte differita compresa — e poi vede l'esito vero; se
arriva prima, l'invio tardivo riceve `annullato`. Una CTE unica invece **legge la fotografia presa prima
dell'attesa**: per questo la funzione è `volatile` e in `plpgsql`.

- [ ] **Passo 1: scrivi le prove che falliscono**

```ts
// tests/schema/controlla-invio.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { VERA, VERA_AUTH, asOperator, asOperatorCommit, asOwner, connect, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { dimenticaSessioni, sessioneDi } from '../helpers/sessioni'

const V1 = '50000000-0000-4000-8000-0000000000e1'
const A1 = '60000000-0000-4000-8000-0000000000e1'
let seq = 0
const codice = () => `70000000-0000-4000-8000-2${String(++seq).padStart(11, '0')}`

type Esito = { riga: number; esito_invio: string; stato: unknown | null }

const controlla = (cod: string, visita = V1) =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: Esito }>('select controlla_invio($1, $2) as r', [cod, visita])
    return r.rows[0].r
  })

const salvaCon = (cod: string) =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r', [
      cod,
      V1,
      CLIENT_MARIA,
      DAY_ONE,
      JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
    ])
    return r.rows[0].r
  })

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('le sei righe', () => {
  it('riga 1: brucia un codice mai arrivato, e l invio tardivo non scrive', async () => {
    const cod = codice()
    const r = await controlla(cod)
    expect(r.riga).toBe(1)
    const tardivo = await salvaCon(cod)
    expect((tardivo as { esito: string }).esito).toBe('annullato')
    const quante = await asOwner(async (c) => Number((await c.query('select count(*) as n from visit')).rows[0].n))
    expect(quante).toBe(0)
  })

  it('riga 2 o 3: trova l esito salvata e restituisce lo stato corrente', async () => {
    const cod = codice()
    await salvaCon(cod)
    const r = await controlla(cod)
    expect(r.esito_invio).toBe('salvata')
    expect(r.riga).toBe(2)
    expect(r.stato).not.toBeNull()
  })

  it('riga 4: la visita è stata cancellata dopo il salvataggio', async () => {
    const cod = codice()
    await salvaCon(cod)
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    const r = await controlla(cod)
    expect(r.riga).toBe(4)
  })

  it('riga 6: restituisce l esito registrato che non ha scritto', async () => {
    const cod = codice()
    await salvaCon(codice())
    const r2 = await salvaCon(cod)
    expect((r2 as { esito: string }).esito).toBe('esiste_gia')
    const r = await controlla(cod)
    expect(r.riga).toBe(6)
    expect(r.esito_invio).toBe('esiste_gia')
  })

  it('ripetere «Controlla» non cambia niente', async () => {
    const cod = codice()
    const primo = await controlla(cod)
    const secondo = await controlla(cod)
    expect(secondo.riga).toBe(primo.riga)
    expect(secondo.esito_invio).toBe('annullato')
  })

  it('non risponde a un account la cui sessione è chiusa', async () => {
    const cod = codice()
    const sessione = await sessioneDi(VERA_AUTH)
    await asOwner((c) => c.query('delete from auth.sessions where id = $1', [sessione.sessionId]))
    const esito = await asOperator(VERA_AUTH, async (c) => {
      try {
        await c.query('select controlla_invio($1, $2)', [cod, V1])
        return 'nessun errore'
      } catch (e) {
        return (e as { code?: string }).code
      }
    })
    expect(esito).toBe('42501')
    const quanti = await asOwner(async (c) => Number((await c.query('select count(*) as n from invio')).rows[0].n))
    expect(quanti).toBe(0)
    // Senza questo, le quattro prove di concorrenza che seguono userebbero la
    // sessione appena cancellata e sarebbero tutte rosse.
    dimenticaSessioni()
  })
})

describe('concorrenza, con due connessioni', () => {
  it('(a) «Controlla» prima dell invio: l invio riceve annullato e il database resta invariato', async () => {
    const cod = codice()
    await controlla(cod)
    const r = await salvaCon(cod)
    expect((r as { esito: string }).esito).toBe('annullato')
  })

  it('(b) invio in volo: «Controlla» aspetta e vede salvata', async () => {
    const cod = codice()
    const sessione = await sessioneDi(VERA_AUTH)
    const scrittore = await connect()
    try {
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: sessione.userId, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      await scrittore.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod,
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
      ])
      // «Controlla» parte SENZA aspettarlo: deve mettersi in coda sulla chiave.
      const inCorso = controlla(cod)
      await new Promise((r) => setTimeout(r, 500))
      await scrittore.query('commit')
      const r = await inCorso
      expect(r.esito_invio).toBe('salvata')
      expect(r.riga).toBe(2)
    } finally {
      await scrittore.query('rollback').catch(() => {})
      await scrittore.end()
    }
  })

  it('(b bis) invio in volo che poi fallisce: «Controlla» lo brucia', async () => {
    const cod = codice()
    const sessione = await sessioneDi(VERA_AUTH)
    const scrittore = await connect()
    try {
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: sessione.userId, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      await scrittore.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod,
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
      ])
      const inCorso = controlla(cod)
      await new Promise((r) => setTimeout(r, 500))
      await scrittore.query('rollback')
      const r = await inCorso
      expect(r.riga).toBe(1)
      expect(r.esito_invio).toBe('annullato')
    } finally {
      await scrittore.end()
    }
  })

  it('(c) «Controlla» che scade mentre l invio è in volo non brucia niente, e l invio salva', async () => {
    const cod = codice()
    const sessione = await sessioneDi(VERA_AUTH)
    const scrittore = await connect()
    const lettore = await connect()
    try {
      await scrittore.query('begin')
      await scrittore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: sessione.userId, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await scrittore.query('set local role authenticated')
      await scrittore.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod,
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
      ])

      await lettore.query('begin')
      await lettore.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: sessione.userId, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await lettore.query('set local role authenticated')
      await lettore.query("set local lock_timeout = '300ms'")
      let codiceErrore = 'nessun errore'
      try {
        await lettore.query('select controlla_invio($1, $2)', [cod, V1])
      } catch (e) {
        codiceErrore = (e as { code?: string }).code ?? 'ignoto'
      }
      await lettore.query('rollback')
      expect(['55P03', '57014']).toContain(codiceErrore)

      await scrittore.query('commit')
      const esito = await asOwner(async (c) => {
        const r = await c.query<{ e: string }>('select esito as e from invio where codice = $1', [cod])
        return r.rows[0].e
      })
      expect(esito).toBe('salvata')
    } finally {
      await scrittore.query('rollback').catch(() => {})
      await scrittore.end()
      await lettore.end()
    }
  })
})
```

- [ ] **Passo 2: esegui e verifica che falliscano** — rosse con `42883 function controlla_invio(...)`.

- [ ] **Passo 3: scrivi la migrazione**

```sql
-- supabase/migrations/0018_controlla_invio.sql
--
-- «Controlla» (design 3a D3-21 e §4.4): l'unica risposta a un salvataggio
-- rimasto senza risposta. NON ripete l'invio: lo brucia se non lo trova, così
-- «Non risulta salvata» è definitivo e l'invio tardivo non scrive più.
--
-- PERCHÉ plpgsql E ISTRUZIONI SEPARATE (misurato su banco separato al sesto
-- giro): scritta come CTE unica, «Controlla» ASPETTA correttamente sulla
-- chiave, ma poi legge con la fotografia presa PRIMA dell'attesa — codice
-- assente, visita vecchia — e direbbe «non risulta salvata» di un salvataggio
-- avvenuto. Per lo stesso motivo la funzione è `volatile`, non `stable`.
--
-- Il ricontrollo dell'account viene PRIMA di bruciare: un account chiuso
-- vedrebbe zero righe ovunque e riceverebbe un falso «non risulta».
create function public.controlla_invio(p_codice uuid, p_visita uuid) returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_esito      text;
  v_stato      jsonb;
  v_cancellata boolean;
  v_riga       integer;
begin
  if not (select app.is_active_operator()) then
    raise exception 'controlla_invio: chi chiama non è un operatrice attiva' using errcode = '42501';
  end if;

  v_esito := coalesce(app.apri_invio_come_annullato(p_codice), 'annullato');

  -- Istruzione SEPARATA dalla registrazione: qui la fotografia è nuova.
  v_stato := public.stato_visita(p_visita);
  select true into v_cancellata from public.visita_cancellata vc where vc.id = p_visita;
  v_cancellata := coalesce(v_cancellata, false);

  if v_esito = 'annullato' then
    v_riga := 1;
  elsif v_esito = 'salvata' then
    if v_stato is not null then
      v_riga := 2;            -- l'app distingue 2 da 3 confrontando con la scheda
    elsif v_cancellata then
      v_riga := 4;
    else
      v_riga := 5;            -- non deve accadere: ogni cancellazione passa dalla tabella
    end if;
  elsif v_esito in ('cancellata', 'gia_cancellata') then
    v_riga := 2;
  else
    v_riga := 6;
  end if;

  -- Il ricontrollo dell'account anche DOPO la lettura: se la sessione è stata
  -- chiusa nel frattempo, la riga del codice e la visita sono invisibili e la
  -- risposta sarebbe un falso «non risulta».
  if not (select app.is_active_operator()) then
    raise exception 'controlla_invio: sessione chiusa durante la lettura' using errcode = '42501';
  end if;

  return jsonb_build_object('riga', v_riga, 'esito_invio', v_esito, 'stato', v_stato);
end
$$;

-- Gemella di app.apri_invio: registra il codice come 'annullato' se non c'è,
-- e restituisce l'esito già registrato se c'è. `on conflict do nothing` più il
-- conteggio, mai un blocco `exception`: un sottoblocco che cattura la chiave
-- duplicata lascia in piedi ciò che è stato scritto prima.
create function app.apri_invio_come_annullato(p_codice uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserite integer;
  v_esito    text;
begin
  insert into public.invio (codice, esito) values (p_codice, 'annullato')
  on conflict (codice) do nothing;
  get diagnostics v_inserite = row_count;
  if v_inserite = 1 then
    return 'annullato';
  end if;
  select i.esito into v_esito from public.invio i where i.codice = p_codice;
  return v_esito;
end
$$;

revoke execute on function
  public.controlla_invio(uuid, uuid),
  app.apri_invio_come_annullato(uuid)
from public, anon;

grant execute on function
  public.controlla_invio(uuid, uuid),
  app.apri_invio_come_annullato(uuid)
to authenticated;
```

Scrivi `app.apri_invio_come_annullato` **prima** di `controlla_invio` nel file, per leggibilità: l'ordine non è un
obbligo tecnico (misurato).

- [ ] **Passo 4: applica ed esegui** — `npx supabase db reset && npx vitest run tests/schema/controlla-invio.test.ts`,
  10 verdi. La prova (b) e la (b bis) devono **durare** circa mezzo secondo: se finiscono subito, «Controlla» non sta
  aspettando e il meccanismo non regge. Scrivi nel resoconto la durata misurata.

- [ ] **Passo 5: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | riscrivi `controlla_invio` come una sola istruzione `with ins as (insert … on conflict do nothing) select …` | la (b): «Controlla» leggerebbe la fotografia vecchia e direbbe riga 1 |
| 2 | `volatile` → `stable` | la (b) |
| 3 | togli il primo ricontrollo dell'account | *«non risponde a un account la cui sessione è chiusa»* |
| 4 | togli il secondo ricontrollo | aggiungi la prova: sessione chiusa **fra** la registrazione e la lettura (chiudila da una terza connessione) |
| 5 | in `app.apri_invio_come_annullato`, `on conflict do nothing` → un blocco `exception when unique_violation` | nessuna prova arrossisce con questi dati, e **la dichiarazione regge** — riverificata il 24/09/2026 su banco usa-e-getta (la funzione non esiste ancora): in `read committed`, il livello che questo piano fissa, le due varianti danno lo **stesso** risultato, `'in_corso'`. ⚠︎ Ma quando la differenza si vede non è sottile: in `repeatable read` la variante `on conflict` **aborta con `40001`**, mentre quella con `exception` **restituisce `null` in silenzio** — la fotografia presa prima dell'attesa non vede la riga dell'altra transazione, e il chiamante riceve un valore che il contratto di §4.4 non prevede. Quindi **dichiarala**, ma sapendo che a tenerla in piedi è la prova di catalogo del Task 9 sull'isolamento: senza quella, questa riga è una scommessa |
| 6 | riga 4 → riga 1 quando la visita è assente e cancellata | *«riga 4: la visita è stata cancellata dopo il salvataggio»* |

- [ ] **Passo 6: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add supabase/migrations/0018_controlla_invio.sql tests/schema/controlla-invio.test.ts
git commit -m "feat(3a-1): «Controlla», che brucia l'invio che non trova

La sola risposta a un salvataggio rimasto senza risposta: rilegge e, se
l'invio non c'è, lo segna annullato, così l'invio tardivo non scrive più e
«Non risulta salvata» è definitivo (design 3a D3-21).

plpgsql e istruzioni separate, non una CTE: misurato su un banco separato che
una CTE aspetta correttamente ma poi legge la fotografia presa prima
dell'attesa, e direbbe «non risulta» di un salvataggio avvenuto.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: la tabella degli annunci, che dice quali giorni sono cambiati

**Files:**
- Create: `supabase/migrations/0019_annunci.sql`
- Create: `tests/schema/annunci.test.ts`
- Modify: `tests/helpers/db.ts` (parser per `date[]`, vedi Passo 2)
- Modify: `tests/schema/sessione-viva.test.ts` (le politiche di `public` diventano **16**)
- Modify: `package.json` (dipendenza `@supabase/supabase-js` per la prova di ricezione)

**Interfaces:**
- Consuma: `app.is_active_operator()` (Task 3).
- Produce: `public.annuncio(id bigint, giorni date[], creato timestamptz)`; trigger per istruzione su `appointment` e
  `visit`; la tabella aggiunta alla pubblicazione `supabase_realtime`.

**Perché una tabella nostra e non il canale privato di Supabase** (decisione dell'utente del 23/09, dopo tre misure):
la tabella dei messaggi di Supabase appartiene a `supabase_realtime_admin`, e il ruolo delle migrazioni non ne è
membro né è superutente — quindi la regola di accesso a quel canale **non è creabile**, né da una migrazione né a mano
dall'editor SQL, che si collega con lo stesso ruolo. La pubblicazione `supabase_realtime`, invece, **appartiene a
`postgres`** (misurato il 23/09): una tabella nostra dentro quella pubblicazione si fa tutta da una migrazione, senza
passi manuali e senza toccare i ruoli del cluster.

**Perché il buco delle cancellazioni non ci tocca:** con `postgres_changes` le politiche **non** si applicano agli
eventi DELETE, e per UPDATE il vecchio stato porta solo la chiave primaria (design 3a §4.6). Su `annuncio` si fa
**solo INSERT**: ogni riga è già la notizia completa, e la pulizia la fa una `delete` che nessuno ascolta, perché la
pubblicazione la limitiamo agli inserimenti.

**Che cosa contiene una riga:** solo `date`. Nessun nome, nessun telefono, nessun `id` di cliente.

- [ ] **Passo 1: aggiungi la dipendenza per la prova**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npm install --save-dev @supabase/supabase-js
```

- [ ] **Passo 2: insegna all'imbracatura a leggere un elenco di date**

`giorni` è un `date[]`, OID **1182**, e `tests/helpers/db.ts:6` registra il parser solo per `date`, OID 1082: senza
questa riga ogni data torna come un oggetto `Date` convertito nel fuso locale, e **ogni asserzione sulle date è
rossa** — la stessa trappola che il commento in testa a quel file descrive.

```ts
// in tests/helpers/db.ts, accanto al parser esistente
pg.types.setTypeParser(1182, (v: string) => (v === '{}' ? [] : v.slice(1, -1).split(',')))
```

Nello stesso Passo, porta a **16** il conteggio delle politiche in `tests/schema/sessione-viva.test.ts` (Task 3):
`annuncio` ne aggiunge una, e senza questa riga il gate `npm test` di questo task è rosso.

- [ ] **Passo 3: scrivi le prove che falliscono**

```ts
// tests/schema/annunci.test.ts
import { REALTIME_SUBSCRIBE_STATES, createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { ANNALISA, OUTSIDER_AUTH, VERA, VERA_AUTH, asOperatorCommit, asOwner, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { accedi, dimenticaSessioni } from '../helpers/sessioni'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const V1 = '50000000-0000-4000-8000-0000000000f1'
const A1 = '60000000-0000-4000-8000-0000000000f1'
let seq = 0
const cod = () => `70000000-0000-4000-8000-3${String(++seq).padStart(11, '0')}`

/** Ascolta gli inserimenti su `annuncio` con il token dato. */
async function ascolta(accessToken: string, ms = 4000) {
  const client = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  await client.realtime.setAuth(accessToken)
  const ricevuti: unknown[] = []
  let stato = 'in attesa'
  const canale = client.channel('annunci').on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'annuncio' },
    (m) => ricevuti.push(m.new),
  )
  await new Promise<void>((risolvi) => {
    canale.subscribe((s) => {
      if (s === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        stato = 'iscritto'
        risolvi()
      }
      if (s === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR || s === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
        stato = String(s)
        risolvi()
      }
    })
    setTimeout(risolvi, ms)
  })
  return {
    stato: () => stato,
    async attendi(quanti = 1) {
      const fine = Date.now() + ms
      while (ricevuti.length < quanti && Date.now() < fine) await new Promise((r) => setTimeout(r, 50))
      await client.removeAllChannels()
      return ricevuti
    },
  }
}

const scrivi = () =>
  asOperatorCommit(VERA_AUTH, (c) =>
    c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
      cod(),
      V1,
      CLIENT_MARIA,
      DAY_ONE,
      JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]),
    ]),
  )

const annunci = () =>
  asOwner(async (c) => {
    const r = await c.query<{ g: string[] }>('select giorni as g from annuncio order by id')
    return r.rows.map((x) => x.g)
  })

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('annunci, dal lato del database', () => {
  it('annuncia il giorno toccato', async () => {
    await scrivi()
    // Si asserisce il CONTENUTO, non il numero di righe: `salva_visita`
    // inserisce gli appuntamenti uno per istruzione, quindi un salvataggio
    // lascia 2 annunci con un appuntamento e 3 con due (misurato).
    const giorni = [...new Set((await annunci()).flat())]
    expect(giorni).toEqual([DAY_ONE])
  })

  it('una cancellazione a cascata lascia un annuncio per istruzione, non per riga', async () => {
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        cod(),
        V1,
        CLIENT_MARIA,
        DAY_ONE,
        JSON.stringify([
          { id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 },
          { id: '60000000-0000-4000-8000-0000000000f2', operatrice: ANNALISA, servizio: SERVICE_REFILL, inizio: 200, durata: 12 },
        ]),
      ]),
    )
    // La cancellazione della visita porta via DUE appuntamenti con UNA sola
    // istruzione (la cascata): è la forma in cui «per istruzione» e «per riga»
    // si distinguono davvero.
    await asOwner((c) => c.query('delete from annuncio'))
    await asOwner((c) => c.query('delete from visit where id = $1', [V1]))
    // Misurato: 2 annunci — uno dalla cascata sugli appuntamenti, uno dalla
    // delete sulla visita. Con `for each row` diventano 3. Il valore è esatto,
    // non un tetto: un tetto resterebbe verde anche a 1.
    const righe = await annunci()
    const daAppuntamenti = righe.filter((g) => g.includes(DAY_ONE))
    expect(daAppuntamenti.length).toBe(2)
  })

  it('annuncia il giorno VECCHIO e quello nuovo quando una visita cambia data', async () => {
    const creata = await asOperatorCommit(VERA_AUTH, async (c) => {
      const r = await c.query<{ r: { visita: string; appuntamenti: unknown[] } }>(
        'select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r',
        [cod(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }])],
      )
      return r.rows[0].r
    })
    await asOwner((c) => c.query('delete from annuncio'))
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select sposta_visita_a($1,$2,$3::date,$4,$5,$6)', [
        cod(),
        V1,
        DAY_TWO,
        JSON.stringify([{ id: A1, inizio: 120 }]),
        creata.visita,
        JSON.stringify(creata.appuntamenti),
      ]),
    )
    const giorni = (await annunci()).flat()
    expect(giorni).toContain(DAY_ONE)
    expect(giorni).toContain(DAY_TWO)
  })

  it('non contiene nomi, telefoni né id di cliente', async () => {
    await scrivi()
    // Si legge la RIGA INTERA e si fissa l'elenco delle colonne. Leggendo la
    // sola colonna `giorni` questa prova resta VERDE anche dopo aver aggiunto
    // una colonna `client_id` con l'id di Maria: misurato al quinto giro, ed è
    // il modo esatto in cui un presidio smette di presidiare.
    const colonne = await asOwner(async (c) =>
      (
        await c.query<{ n: string }>(
          `select column_name as n from information_schema.columns
            where table_schema = 'public' and table_name = 'annuncio' order by 1`,
        )
      ).rows.map((x) => x.n),
    )
    expect(colonne).toEqual(['creato', 'giorni', 'id'])
    // Compagna positiva: senza, le tre asserzioni di vuoto qui sotto
    // resterebbero verdi anche se il trigger smettesse di annunciare.
    expect(
      await asOwner(async (c) => (await c.query<{ n: number }>('select count(*)::int as n from annuncio')).rows[0].n),
    ).toBeGreaterThan(0)
    const testo = await asOwner(async (c) =>
      JSON.stringify((await c.query<{ r: unknown }>('select to_jsonb(a) as r from annuncio a order by id')).rows),
    )
    expect(testo).not.toContain('Maria')
    expect(testo).not.toContain(CLIENT_MARIA)
    expect(testo).not.toContain('+39')
  })

  it('non lascia scrivere gli annunci a un operatrice per via diretta', async () => {
    const codice = await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await c.query("insert into annuncio (giorni) values (array['2026-01-01'::date])")
        return 'nessun errore'
      } catch (e) {
        return (e as { code?: string }).code
      }
    }).catch((e) => (e as { code?: string }).code)
    expect(codice).toBe('42501')
  })

  it('lascia leggere gli annunci a un operatrice attiva e non a un estranea', async () => {
    await scrivi()
    const vera = await asOperatorCommit(VERA_AUTH, async (c) => (await c.query('select id from annuncio')).rows.length)
    const estranea = await asOperatorCommit(OUTSIDER_AUTH, async (c) =>
      (await c.query('select id from annuncio')).rows.length,
    )
    expect(vera).toBeGreaterThan(0)
    expect(estranea).toBe(0)
  })
})

describe('annunci, dal lato del telefono', () => {
  it('arriva al telefono di un operatrice attiva', async () => {
    const sessione = await accedi('vera@example.test')
    const ascoltatore = await ascolta(sessione.accessToken)
    expect(ascoltatore.stato()).toBe('iscritto')
    await scrivi()
    const ricevuti = await ascoltatore.attendi()
    expect(JSON.stringify(ricevuti)).toContain(DAY_ONE)
  })

  // Le tre prove negative hanno DENTRO la loro compagna positiva: un
  // ascoltatore attivo che riceve nello stesso istante. Senza, resterebbero
  // verdi anche se il canale fosse muto per tutti, ed è esattamente il modo in
  // cui una prova negativa smette di provare qualcosa.
  it('non arriva a un account che non è operatrice, mentre arriva a un operatrice attiva', async () => {
    const estraneo = await accedi('outsider@example.test')
    const vera = await accedi('vera@example.test')
    const sordo = await ascolta(estraneo.accessToken, 3000)
    const udente = await ascolta(vera.accessToken, 3000)
    expect(udente.stato()).toBe('iscritto')
    await scrivi()
    const ricevutiDaVera = await udente.attendi()
    const ricevutiDaEstraneo = await sordo.attendi()
    expect(JSON.stringify(ricevutiDaVera)).toContain(DAY_ONE)
    expect(ricevutiDaEstraneo).toEqual([])
  })

  it('non arriva a un operatrice disattivata, mentre arriva a una attiva', async () => {
    const annalisa = await accedi('annalisa@example.test')
    const vera = await accedi('vera@example.test')
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const sorda = await ascolta(annalisa.accessToken, 3000)
    const udente = await ascolta(vera.accessToken, 3000)
    await scrivi()
    const ricevutiDaVera = await udente.attendi()
    const ricevutiDaAnnalisa = await sorda.attendi()
    expect(JSON.stringify(ricevutiDaVera)).toContain(DAY_ONE)
    expect(ricevutiDaAnnalisa).toEqual([])
    await asOwner((c) => c.query('update operator set is_active = true where id = $1', [ANNALISA]))
    dimenticaSessioni()
  })

  it('non arriva a chi si presenta con la sola chiave pubblica, mentre arriva a un operatrice', async () => {
    const vera = await accedi('vera@example.test')
    const udente = await ascolta(vera.accessToken, 3000)
    const client = createClient(URL, ANON)
    const ricevuti: unknown[] = []
    const canale = client
      .channel('annunci-anon')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annuncio' }, (m) => ricevuti.push(m.new))
    await new Promise<void>((r) => canale.subscribe(() => r()))
    await scrivi()
    const ricevutiDaVera = await udente.attendi()
    await new Promise((r) => setTimeout(r, 1000))
    await client.removeAllChannels()
    expect(JSON.stringify(ricevutiDaVera)).toContain(DAY_ONE)
    expect(ricevuti).toEqual([])
  })
})
```

- [ ] **Passo 4: esegui e verifica che falliscano**

Atteso: **7 rosse** — *«annuncia il giorno toccato»*, *«una cancellazione a cascata…»*, *«il giorno VECCHIO e quello
nuovo»*, *«non contiene nomi, telefoni né id di cliente»*, *«non lascia scrivere gli annunci…»*, *«lascia leggere gli
annunci…»* e *«arriva al telefono…»*. Quasi tutte con `42P01` — la tabella non c'è — **tranne** quella sulla
riservatezza, che fallisce prima, sul confronto delle colonne: senza tabella `information_schema.columns` restituisce
zero righe, quindi arrossisce con `expect([]).toEqual(['creato','giorni','id'])` (misurato). E **3 verdi per il motivo sbagliato**,
che lo restano fino al Passo 5: le tre negative («non arriva a…»), perché senza tabella non arriva niente a nessuno.
È esattamente la ragione per cui ognuna delle tre si porta dentro la sua compagna positiva.

- [ ] **Passo 5: scrivi la migrazione**

```sql
-- supabase/migrations/0019_annunci.sql
--
-- L'agenda si aggiorna da sola (design 3a D3-12, D3-16, §4.6), ma con una
-- TABELLA NOSTRA invece del canale privato di Supabase.
--
-- Perché: `realtime.messages` appartiene a `supabase_realtime_admin`, e il ruolo
-- delle migrazioni non ne è membro né è superutente — la politica su quel canale
-- non è creabile, né da qui né a mano dall'editor SQL, che usa lo stesso ruolo
-- (misurato tre volte). La pubblicazione `supabase_realtime`, invece, appartiene
-- a `postgres`: una tabella nostra dentro quella pubblicazione si fa tutta da
-- qui. Decisione dell'utente del 23 settembre 2026.
--
-- SOLO INSERIMENTI: con postgres_changes le politiche non si applicano agli
-- eventi DELETE, e per gli UPDATE il vecchio stato porta solo la chiave
-- primaria. Qui ogni riga è già la notizia completa, la pubblicazione è
-- limitata agli INSERT, e la pulizia non si ascolta.
--
-- Il contenuto è solo un elenco di DATE: nessun nome, nessun telefono, nessun
-- id di cliente.

create table annuncio (
  id     bigint generated always as identity primary key,
  giorni date[] not null,
  creato timestamptz not null default clock_timestamp(),

  constraint annuncio_giorni_non_vuoto check (cardinality(giorni) > 0)
);

create index annuncio_per_eta on annuncio (creato);

alter table annuncio enable row level security;

create policy annuncio_lettura on annuncio
  for select using ((select app.is_active_operator()));

revoke all on table annuncio from public, anon, authenticated;
grant select on table annuncio to authenticated;

-- Solo gli INSERT viaggiano: nessun evento di cancellazione, che sfuggirebbe
-- alle politiche.
alter publication supabase_realtime add table annuncio;

-- ⚠︎ `publish` è un parametro della PUBBLICAZIONE, non della tabella: ogni
-- tabella che qualcuno aggiungesse dopo — anche con l'interruttore «Realtime»
-- di Supabase Studio, che scrive in questa stessa pubblicazione — perderebbe
-- update e delete in silenzio. Oggi la pubblicazione è vuota (misurato), e il
-- 3a-1 è l'unico a usarla; se un giorno servisse un'altra tabella in diretta,
-- questa riga va ridiscussa.
alter publication supabase_realtime set (publish = 'insert');

-- Un trigger PER ISTRUZIONE per tabella e per evento: raccoglie i giorni
-- toccati, vecchi e nuovi, e lascia UNA riga. Un trigger per riga lascerebbe
-- un annuncio per appuntamento.
--
-- security definer, proprietaria postgres: la tabella non è scrivibile da
-- `authenticated`, ed è la ragione per cui nessun telefono può fabbricare
-- annunci.
create function app.annuncia_giorni() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_giorni date[];
begin
  if tg_table_name = 'appointment' then
    if tg_op = 'INSERT' then
      select array_agg(distinct n.appointment_date) into v_giorni from nuove n;
    elsif tg_op = 'DELETE' then
      select array_agg(distinct v.appointment_date) into v_giorni from vecchie v;
    else
      select array_agg(distinct g) into v_giorni
      from (select n.appointment_date as g from nuove n
            union
            select v.appointment_date from vecchie v) s;
    end if;
  else
    if tg_op = 'INSERT' then
      select array_agg(distinct n.visit_date) into v_giorni from nuove n;
    elsif tg_op = 'DELETE' then
      select array_agg(distinct v.visit_date) into v_giorni from vecchie v;
    else
      select array_agg(distinct g) into v_giorni
      from (select n.visit_date as g from nuove n
            union
            select v.visit_date from vecchie v) s;
    end if;
  end if;

  if v_giorni is null or cardinality(v_giorni) = 0 then
    return null;
  end if;

  insert into public.annuncio (giorni) values (v_giorni);

  -- Nessuna pulizia qui dentro: questo trigger gira UNA VOLTA PER ISTRUZIONE,
  -- cioè da 2 a 5 volte per salvataggio, e di più al crescere degli appuntamenti
  -- (misurato: 2 in creazione con un appuntamento, 3 con due, 4 passando da due
  -- a uno, 5 passando da uno a tre). La pulizia va fatta UNA VOLTA PER INVIO, e
  -- la fa `app.chiudi_invio`, che ha già le sue due delete a lotti
  -- (Task 1): aggiungi lì la terza riga per `public.annuncio`, con la stessa
  -- forma e un'ora di conservazione.
  -- ⚠︎ Non è per uscire dal blocco sulla visita: `chiudi_invio` gira nella
  -- stessa transazione di `salva_visita`, e il blocco è ancora tenuto quando la
  -- delete parte (misurato al quinto giro).
  return null;
end
$$;

create trigger zz_annuncia_appuntamenti_ins
after insert on appointment
referencing new table as nuove
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_appuntamenti_upd
after update on appointment
referencing new table as nuove old table as vecchie
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_appuntamenti_del
after delete on appointment
referencing old table as vecchie
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_visite_ins
after insert on visit
referencing new table as nuove
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_visite_upd
after update on visit
referencing new table as nuove old table as vecchie
for each statement execute function app.annuncia_giorni();

create trigger zz_annuncia_visite_del
after delete on visit
referencing old table as vecchie
for each statement execute function app.annuncia_giorni();

revoke execute on function app.annuncia_giorni() from public, anon;
```

⚠︎ `alter publication supabase_realtime set (publish = 'insert')` cambia una pubblicazione **condivisa**: oggi non
contiene nessun'altra tabella (misurato), ma il piano lo dichiara, e la prova di catalogo del Task 9 — «nessuna
tabella nella pubblicazione» — va cambiata in «**esattamente** `annuncio`».

- [ ] **Passo 6: aggiungi la pulizia degli annunci e applica**

Nella stessa migrazione, con `create or replace function app.chiudi_invio(...)`, riscrivi la funzione del Task 1
aggiungendo in coda la terza pulizia, quella che il Task 1 lascia commentata perché la tabella non esisteva ancora:

```sql
  delete from public.annuncio a
   where a.id in (select b.id from public.annuncio b
                   where b.creato < now() - interval '1 hour' limit 100);
```

Run: `npx supabase db reset && npx vitest run tests/schema/annunci.test.ts`
Atteso: 10 verdi. Se le prove dal lato del telefono restano rosse, controlla che Realtime sia acceso
(`npx supabase status`) e che la pubblicazione contenga `annuncio`.

- [ ] **Passo 7: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | togli `alter publication … add table annuncio` | *«arriva al telefono di un operatrice attiva»* |
| 2 | nel ramo UPDATE, togli l'unione con `vecchie` | *«annuncia il giorno VECCHIO e quello nuovo»* |
| 3 | `for each statement` → `for each row` | *«una cancellazione a cascata lascia un annuncio per istruzione, non per riga»*: è l'unica forma in cui riga e istruzione si separano (2 contro 3, misurato) |
| 4 | togli la politica `annuncio_lettura` | *«lascia leggere gli annunci a un operatrice attiva»* |
| 5 | politica → `using (true)` | *«non arriva a un account che non è operatrice»* e *«non arriva a un operatrice disattivata»* |
| 6 | `grant insert on table annuncio to authenticated` **più** `create policy annuncio_scrittura on annuncio for insert to authenticated with check (true)` | *«non lascia scrivere gli annunci a un operatrice per via diretta»*. ⚠︎ Il solo `grant` **non ha vittima** (misurato al quinto giro): con la sicurezza per riga accesa e nessuna politica di inserimento l'errore resta `42501`, lo stesso identico codice. Servono tutt'e due |
| 7 | metti `client_id` nella riga, popolato con l'id della cliente | *«non contiene nomi, telefoni né id di cliente»*, che legge la riga intera e fissa l'elenco delle colonne. ⚠︎ Con la vecchia forma (`select giorni`) questa sonda **non aveva vittima**: misurato al quinto giro |
| 8 | togli `set (publish = 'insert')` | nessuna prova con questi dati: **dichiarala**, e il presidio è la prova di catalogo del Task 9 |

- [ ] **Passo 8: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add supabase/migrations/0019_annunci.sql tests/schema/annunci.test.ts tests/helpers/db.ts \
        tests/schema/sessione-viva.test.ts package.json package-lock.json
git commit -m "feat(3a-1): la tabella degli annunci, che dice quali giorni sono cambiati

Una riga per istruzione con i soli giorni toccati, vecchi e nuovi, pubblicata
agli inserimenti e protetta dalla stessa regola di accesso di tutto il resto.

Non il canale privato di Supabase: la sua tabella dei messaggi appartiene a un
ruolo di sistema e la politica non è creabile né da una migrazione né a mano
(misurato tre volte). La pubblicazione, invece, è nostra.

Solo inserimenti: alle cancellazioni le politiche non si applicano, e qui ogni
riga è già la notizia completa.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: l'audit di catalogo si stringe, e la vecchia `move_visit` esce di scena

**Files:**
- Modify: `tests/schema/catalogue-audit.test.ts`
- Modify: `tests/schema/write-functions.test.ts` (le 9 prove che chiamano `move_visit`)
- Create: `supabase/migrations/0020_revoca_move_visit.sql`

**Interfaces:**
- Consuma: tutte le funzioni dei Task 1–8.
- Produce: nessun oggetto nuovo. Chiude `PERMESSI-FUNZIONI`, `MIGRAZIONE-SALTATA`, `OUTSIDER-WRITE` e la divergenza
  L8 dalla spec §4.6.

- [ ] **Passo 1: scrivi le prove nuove dell'audit**

Aggiungi a `tests/schema/catalogue-audit.test.ts`:

```ts
// L'insieme delle funzioni eseguibili da anon deve essere ESATTAMENTE questo.
// Non «nessuna»: sei funzioni di trigger dello schema app e immutable_unaccent
// lo sono da prima di questo piano, e l'elenco le dichiara con la loro ragione.
const ESEGUIBILI_DA_ANON = [
  'app.delete_orphan_visit()',
  'app.guard_operator_lockout()',
  'app.is_active_operator()',
  'app.sync_appointment_slots()',
  'app.touch_client_activity()',
  'app.touch_updated_at()',
  'public.immutable_unaccent(text)',
]

it('lascia eseguibili da anon esattamente le funzioni dichiarate', async () => {
  const trovate = await asOwner(async (c) => {
    const r = await c.query<{ f: string }>(`
      select n.nspname || '.' || p.proname || '(' ||
             pg_get_function_arguments(p.oid) || ')' as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'app')
        and has_function_privilege('anon', p.oid, 'EXECUTE')
      order by 1
    `)
    return r.rows.map((x) => x.f)
  })
  expect(trovate).toEqual(ESEGUIBILI_DA_ANON)
})

// Le funzioni security definer che NON sono trigger e che authenticated può
// chiamare: ognuna deve avere la guardia sul predicato, e una prova che ne
// misura l'EFFETTO da un account chiuso.
const DEFINER_PER_AUTHENTICATED = [
  'app.apri_invio(p_codice uuid)',
  'app.apri_invio_come_annullato(p_codice uuid)',
  'app.chiudi_invio(p_codice uuid, p_esito text)',
  'app.is_active_operator()',
  'public.chiudi_sessioni(p_operator_id uuid)',
  'public.list_auth_accounts()',
]

it('ha esattamente queste funzioni security definer chiamabili da authenticated', async () => {
  const trovate = await asOwner(async (c) => {
    const r = await c.query<{ f: string }>(`
      select n.nspname || '.' || p.proname || '(' || pg_get_function_arguments(p.oid) || ')' as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'app')
        and p.prosecdef
        and p.prorettype <> 'trigger'::regtype
        and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      order by 1
    `)
    return r.rows.map((x) => x.f)
  })
  expect(trovate).toEqual(DEFINER_PER_AUTHENTICATED)
})

// Postgres scrive un search_path vuoto come `search_path=""`, non come
// `search_path=` (lo dice già catalogue-audit.test.ts:63). E app.touch_updated_at
// (0004) non ha proconfig affatto: è un trigger invoker che tocca solo NEW, e
// resta dichiarato qui invece di essere nascosto allargando la prova.
const SENZA_SEARCH_PATH_DICHIARATE = ['touch_updated_at']

it('non lascia nessuna funzione nuova senza search_path vuoto', async () => {
  const senza = await asOwner(async (c) => {
    const r = await c.query<{ f: string }>(`
      select p.proname as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'app')
        and not exists (
          select 1 from unnest(coalesce(p.proconfig, '{}')) s
          where s = 'search_path=""' or s = 'search_path=public, pg_catalog'
        )
      order by 1
    `)
    return r.rows.map((x) => x.f)
  })
  expect(senza).toEqual(SENZA_SEARCH_PATH_DICHIARATE)
})

it('non lascia nessuna funzione a imporre un livello di isolamento proprio', async () => {
  const strane = await asOwner(async (c) => {
    const r = await c.query<{ f: string }>(`
      select p.proname as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'app')
        and exists (
          select 1 from unnest(coalesce(p.proconfig, '{}')) s
          where s like 'default_transaction_isolation=%'
        )
      order by 1
    `)
    return r.rows.map((x) => x.f)
  })
  expect(strane).toEqual([])
})

it('non lascia ad anon o authenticated TRUNCATE o MAINTAIN sulle tabelle nuove', async () => {
  const troppo = await asOwner(async (c) => {
    const r = await c.query<{ t: string; g: string; p: string }>(`
      select c.relname as t, a.grantee::regrole::text as g, a.privilege_type as p
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(c.relacl) a
      where n.nspname = 'public' and c.relkind = 'r'
        and a.grantee::regrole::text in ('anon', 'authenticated')
        and a.privilege_type in ('TRUNCATE', 'MAINTAIN')
      order by 1, 2, 3
    `)
    return r.rows
  })
  expect(troppo).toEqual([])
})

it('pubblica esattamente la tabella degli annunci, e solo gli inserimenti', async () => {
  const stato = await asOwner(async (c) => {
    const t = await c.query<{ t: string }>(
      "select tablename as t from pg_publication_tables where pubname = 'supabase_realtime' order by 1",
    )
    const p = await c.query<{ i: boolean; u: boolean; d: boolean }>(
      "select pubinsert as i, pubupdate as u, pubdelete as d from pg_publication where pubname = 'supabase_realtime'",
    )
    return { tabelle: t.rows.map((x) => x.t), ...p.rows[0] }
  })
  expect(stato).toEqual({ tabelle: ['annuncio'], i: true, u: false, d: false })
})

// Un trigger spento non fa rumore: un `disable` dimenticato, o un guasto a metà
// migrazione, toglierebbe un presidio senza che nessuno se ne accorga.
it('non lascia nessun trigger applicativo spento, e ne esamina più di zero', async () => {
  const esaminati = await asOwner(async (c) => {
    const r = await c.query<{ n: string }>(`
      select count(*) as n from pg_trigger g
      join pg_class c on c.oid = g.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not g.tgisinternal
    `)
    return Number(r.rows[0].n)
  })
  expect(esaminati).toBeGreaterThan(10)
  const spenti = await asOwner(async (c) => {
    const r = await c.query<{ t: string; g: string }>(`
      select c.relname as t, g.tgname as g
      from pg_trigger g join pg_class c on c.oid = g.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not g.tgisinternal and g.tgenabled <> 'O'
      order by 1, 2
    `)
    return r.rows
  })
  expect(spenti).toEqual([])
})

// La chiusura immediata poggia su una tabella interna di Supabase: se una
// versione futura togliesse al proprietario il diritto di leggerla, ogni
// richiesta fallirebbe. Il guasto sarebbe rumoroso, ma questa prova lo trova
// prima, in CI.
it('lascia al proprietario i diritti su auth.sessions da cui dipende la chiusura immediata', async () => {
  const stato = await asOwner(async (c) => {
    const r = await c.query<{ sel: boolean; del: boolean; bypass: boolean; colonne: number }>(`
      select has_table_privilege('postgres', 'auth.sessions', 'SELECT') as sel,
             has_table_privilege('postgres', 'auth.sessions', 'DELETE') as del,
             (select rolbypassrls from pg_roles where rolname = 'postgres') as bypass,
             (select count(*)::int from information_schema.columns
               where table_schema = 'auth' and table_name = 'sessions'
                 and column_name in ('id', 'user_id')) as colonne
    `)
    return r.rows[0]
  })
  expect(stato).toEqual({ sel: true, del: true, bypass: true, colonne: 2 })
})

// MIGRAZIONE-SALTATA: un file che il CLI salta in silenzio non lo vede nessuno.
it('applica ogni file di supabase/migrations, senza saltarne nessuno', async () => {
  const { readdirSync } = await import('node:fs')
  const suDisco = readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql'))
    .map((f) => f.replace(/_.*$/, ''))
    .sort()
  const applicate = await asOwner(async (c) => {
    const r = await c.query<{ v: string }>('select version as v from supabase_migrations.schema_migrations order by 1')
    return r.rows.map((x) => x.v)
  })
  expect(applicate).toEqual(suDisco)
})
```

- [ ] **Passo 2: esegui e guarda quali falliscono**

Run: `npx vitest run tests/schema/catalogue-audit.test.ts`
Atteso: rossa *«ha esattamente queste funzioni security definer…»* finché gli elenchi non corrispondono al catalogo
vero. **Correggi l'elenco dichiarato solo dopo aver capito perché** una funzione ci è finita: un elenco allargato per
far passare la prova è il modo di spegnerla. Le due voci già note e dichiarate sono `app.touch_updated_at` (senza
`search_path`, da 0004) e le sei funzioni di `app` eseguibili da `anon` — cinque trigger più
`app.is_active_operator()`, che trigger non è.

- [ ] **Passo 3: revoca la vecchia `move_visit` e adatta le sue prove**

```sql
-- supabase/migrations/0020_revoca_move_visit.sql
--
-- La vecchia move_visit(uuid, date, integer) sposta di uno SCARTO RELATIVO e
-- non controlla nessuna versione: un invio ripetuto sposterebbe due volte, e
-- due operatrici che spostano la stessa visita si sovrascrivono in silenzio
-- (design 3a §4.1, reperto B2). Il 3a la sostituisce con sposta_visita_a.
--
-- Non si CANCELLA, si revoca: resta leggibile nella 0010 e nelle sue prove,
-- che continuano a esercitarla da proprietario. È una divergenza dichiarata
-- dalla spec §4.6, che la elenca fra le quattro funzioni (lettura L8).
revoke execute on function public.move_visit(uuid, date, integer) from authenticated;
```

In `tests/schema/write-functions.test.ts`, le **9 prove** che la chiamano diventano prove sul comportamento della
funzione **da proprietario** (`asOwner`), più una prova nuova:

```ts
it('non è più chiamabile da un operatrice: il 3a usa sposta_visita_a', async () => {
  const codiceErrore = await asOperator(VERA_AUTH, async (c) => {
    try {
      await c.query('select move_visit($1, $2::date, 6)', [V1, DAY_TWO])
      return 'nessun errore'
    } catch (e) {
      return pgCode(e)
    }
  })
  expect(codiceErrore).toBe('42501')
})
```

- [ ] **Passo 4: `OUTSIDER-WRITE` sulle funzioni nuove**

Un file proprio, `tests/schema/outsider-write.test.ts`, invece di un innesto in `access-control.test.ts`: quel file
non semina le fixture e non conosce le costanti che servono.

**Attenzione a che cosa si asserisce.** `sposta_visita_a` e `cancella_visita` chiamate da un estraneo **non
sollevano niente**: la visita è invisibile e l'esito è `non_trovata` (misurato). E `salva_visita` con un elenco vuoto
solleva `22023` **prima** di qualunque questione di autorizzazione, quindi una prova scritta così passerebbe anche
per un'operatrice attiva. Si asserisce l'**effetto**: nessuna scrittura, e mai `salvata` o `cancellata`.

```ts
// tests/schema/outsider-write.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import {
  ANNALISA,
  ANNALISA_AUTH,
  OUTSIDER_AUTH,
  VERA,
  VERA_AUTH,
  asOperatorCommit,
  asOwner,
  pgCode,
  resetData,
} from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { dimenticaSessioni } from '../helpers/sessioni'

const V1 = '50000000-0000-4000-8000-0000000000f9'
const A1 = '60000000-0000-4000-8000-0000000000f9'
let seq = 0
// Un contatore, non l'orologio: due chiamate nello stesso millisecondo
// darebbero lo stesso codice d'invio, e la seconda riceverebbe l'esito della
// prima dal registro.
const COD = () => `70000000-0000-4000-8000-4${String(++seq).padStart(11, '0')}`
const APP = [{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }]

let versioni: { visita: string; appuntamenti: unknown[] }

beforeEach(async () => {
  await resetData()
  await seedFixture()
  versioni = await asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: { visita: string; appuntamenti: unknown[] } }>(
      'select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r',
      [COD(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify(APP)],
    )
    return r.rows[0].r
  })
})

const statoDb = () =>
  asOwner(async (c) => {
    const r = await c.query<{ id: string; s: number }>('select id, start_cell as s from appointment order by id')
    return r.rows
  })

async function prova(authUid: string, sql: string, params: unknown[]) {
  const prima = await statoDb()
  const esito = await asOperatorCommit(authUid, async (c) => {
    try {
      const r = await c.query<{ r: { esito?: string } | null }>(sql, params)
      return r.rows[0]?.r?.esito ?? 'valore senza esito'
    } catch (e) {
      return pgCode(e) ?? 'ignoto'
    }
  }).catch((e) => pgCode(e) ?? 'ignoto')
  return { esito, prima, dopo: await statoDb() }
}

const CASI: [string, string, (v: typeof versioni) => unknown[]][] = [
  [
    'salva_visita',
    'select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r',
    (v) => [COD(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([{ ...APP[0], inizio: 200 }]), v.visita, JSON.stringify(v.appuntamenti)],
  ],
  [
    'sposta_visita_a',
    'select sposta_visita_a($1,$2,$3::date,$4,$5,$6) as r',
    (v) => [COD(), V1, DAY_ONE, JSON.stringify([{ id: A1, inizio: 200 }]), v.visita, JSON.stringify(v.appuntamenti)],
  ],
  [
    'cancella_visita',
    'select cancella_visita($1,$2,$3,$4) as r',
    (v) => [COD(), V1, v.visita, JSON.stringify(v.appuntamenti)],
  ],
  ['controlla_invio', 'select controlla_invio($1,$2) as r', () => [COD(), V1]],
]

describe.each(CASI)('%s', (_nome, sql, params) => {
  it('non scrive niente per un account che non è operatrice', async () => {
    const { esito, prima, dopo } = await prova(OUTSIDER_AUTH, sql, params(versioni))
    expect(['salvata', 'cancellata']).not.toContain(esito)
    expect(dopo).toEqual(prima)
  })

  it('non scrive niente per un operatrice disattivata', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const { esito, prima, dopo } = await prova(ANNALISA_AUTH, sql, params(versioni))
    expect(['salvata', 'cancellata']).not.toContain(esito)
    expect(dopo).toEqual(prima)
    await asOwner((c) => c.query('update operator set is_active = true where id = $1', [ANNALISA]))
    dimenticaSessioni()
  })

  // La gemella positiva: senza, le due prove sopra resterebbero verdi anche se
  // l'imbracatura fosse rotta e nessuno riuscisse più a scrivere.
  it('ma un operatrice attiva sì, con la stessa imbracatura', async () => {
    const { esito, prima, dopo } = await prova(VERA_AUTH, sql, params(versioni))
    expect(esito).not.toBe('ignoto')
    if (sql.includes('controlla_invio')) {
      expect(dopo).toEqual(prima)
    } else {
      expect(dopo).not.toEqual(prima)
    }
  })
})
```

**Deciso dall'utente il 23/09:** tutte e quattro le funzioni cominciano con la guardia esplicita, quindi l'esito per
un estraneo o per un'operatrice disattivata è **sempre `42501`**, mai `non_trovata`. La prova che lo pinna va
**dentro** il `describe.each`, come quarta `it`, perché usa `sql`, `params` e `versioni`:

```ts
  it('risponde sempre 42501, mai un esito di dominio', async () => {
    const { esito } = await prova(OUTSIDER_AUTH, sql, params(versioni))
    expect(esito).toBe('42501')
  })
```

Il file arriva così a **4 casi × 4 prove = 16**.

- [ ] **Passo 5: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add tests/schema/ supabase/migrations/0020_revoca_move_visit.sql
git commit -m "test(3a-1): l'audit di catalogo diventa un elenco nominativo, e move_visit esce di scena

Le funzioni eseguibili da anon e quelle security definer chiamabili da
authenticated sono ora due insiemi ESATTI, dichiarati con la ragione di ogni
voce: un audit che cerca «nessuna» non si accorge di una funzione nuova, e uno
che usa un like accetta un predicato allargato.

In più: nessun livello di isolamento imposto da una funzione, nessun TRUNCATE
o MAINTAIN per anon e authenticated, nessuna tabella nella pubblicazione
standard, i diritti su auth.sessions da cui dipende la chiusura immediata, e
la corrispondenza fra i file di migrazione e quelli applicati.

La vecchia move_visit resta nella 0010 ma non è più chiamabile da
un'operatrice: sposta di uno scarto relativo e non guarda nessuna versione.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: ricerca delle clienti, doppioni e colori

**Files:**
- Create: `supabase/migrations/0021_ricerca_e_colori.sql`
- Create: `tests/schema/ricerca-clienti.test.ts`

**Interfaces:**
- Consuma: `public.immutable_unaccent` (0003), `app.is_active_operator()`.
- Produce: `public.cerca_clienti(p_testo text) returns table (id uuid, full_name text, phone text, somiglianza real)`;
  `public.doppioni_cliente(p_nome text, p_telefono text) returns table (id uuid, full_name text, phone text, motivo text)`;
  `pg_trgm` installata nello schema `extensions`; i colori di D3-6 nella riga di ogni operatrice.

**Perché una funzione e non un filtro:** un filtro PostgREST su `client` mette nome o telefono nella **querystring**,
e la querystring finisce nei log del gateway (design 3a §4.8). Le due funzioni si chiamano in POST.

- [ ] **Passo 1: scrivi le prove che falliscono**

```ts
// tests/schema/ricerca-clienti.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ALESSANDRA, ANNALISA, ANNALISA_AUTH, VERA, VERA_AUTH, asOperator, asOwner, resetData } from '../helpers/db'
import { CLIENT_MARIA, seedFixture } from '../helpers/fixtures'
import { dimenticaSessioni } from '../helpers/sessioni'

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

const cerca = (testo: string) =>
  asOperator(VERA_AUTH, async (c) => {
    const r = await c.query<{ full_name: string }>('select full_name from cerca_clienti($1)', [testo])
    return r.rows.map((x) => x.full_name)
  })

describe('cerca_clienti', () => {
  it('trova una cliente scritta con un refuso, come chiede la spec §8.2', async () => {
    expect(await cerca('maria rosi')).toContain('Maria Rossi')
  })

  it('trova una cliente ignorando accenti e maiuscole', async () => {
    expect(await cerca('LUCIA CICCARE')).toContain('Lucia Ciccarè')
  })

  it('trova per numero di telefono', async () => {
    expect(await cerca('3331234567')).toContain('Maria Rossi')
  })

  it('non restituisce chi non c entra', async () => {
    expect(await cerca('Giuseppe Verdi')).toEqual([])
  })

  it('non restituisce niente per una ricerca vuota', async () => {
    expect(await cerca('')).toEqual([])
    expect(await cerca('   ')).toEqual([])
  })

  it('non risponde a un account che non è operatrice attiva', async () => {
    // Su ANNALISA e non su Vera: disattivare l'operatrice dell'imbracatura ne
    // chiuderebbe la sessione (Task 4) e avvelenerebbe le prove che seguono in
    // questo stesso file.
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const righe = await asOperator(ANNALISA_AUTH, async (c) =>
      (await c.query("select * from cerca_clienti('maria')")).rows,
    )
    expect(righe).toEqual([])
    await asOwner((c) => c.query('update operator set is_active = true where id = $1', [ANNALISA]))
    dimenticaSessioni()
  })
})

describe('doppioni_cliente', () => {
  it('riconosce lo stesso telefono in formato diverso', async () => {
    const motivi = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ motivo: string }>("select motivo from doppioni_cliente('Maria R.', '+393331234567')")
      return r.rows.map((x) => x.motivo)
    })
    expect(motivi).toContain('telefono')
  })

  it('riconosce un nome simile', async () => {
    const motivi = await asOperator(VERA_AUTH, async (c) => {
      const r = await c.query<{ motivo: string }>("select motivo from doppioni_cliente('maria rosi', null)")
      return r.rows.map((x) => x.motivo)
    })
    expect(motivi).toContain('nome')
  })

  it('non segnala un nome che non somiglia', async () => {
    const righe = await asOperator(VERA_AUTH, async (c) => (await c.query("select * from doppioni_cliente('Anna Neri', null)")).rows)
    expect(righe).toEqual([])
  })
})

describe('il guardiano ridefinito', () => {
  it('rifiuta la cancellazione dell ultima operatrice collegata', async () => {
    // Presidia `operator_lockout_guard_del`: senza questa prova, togliere quel
    // trigger non fa arrossire niente (misurato).
    const codice = await asOwner(async (c) => {
      try {
        await c.query('begin')
        await c.query('update operator set is_active = false where id in ($1, $2)', [ANNALISA, ALESSANDRA])
        await c.query('delete from operator where id = $1', [VERA])
        await c.query('commit')
        return 'nessun errore'
      } catch (e) {
        await c.query('rollback')
        return (e as { code?: string }).code
      }
    })
    expect(codice).toBe('23514')
  })

  it('lascia cancellare un operatrice quando ne resta un altra collegata', async () => {
    const TEMP = '10000000-0000-4000-8000-0000000000e3'
    const codice = await asOwner(async (c) => {
      try {
        await c.query(
          `insert into operator (id, auth_user_id, name, color, sort_order)
           values ($1, null, 'Temp2', '#000000', 7)`,
          [TEMP],
        )
        await c.query('delete from operator where id = $1', [TEMP])
        return 'nessun errore'
      } catch (e) {
        return (e as { code?: string }).code
      }
    })
    expect(codice).toBe('nessun errore')
  })
})

describe('colori delle operatrici', () => {
  // Nota: `#C2185B` è già il valore seminato da 0001 per Vera, quindi solo
  // Annalisa e Alessandra provano qualcosa. È dichiarato per non far sembrare
  // un presidio quello che per Vera non lo è.
  it('ha i colori scelti dall utente, non quelli del primo piano', async () => {
    const colori = await asOwner(async (c) => {
      const r = await c.query<{ id: string; color: string }>('select id, color from operator order by sort_order')
      return Object.fromEntries(r.rows.map((x) => [x.id, x.color]))
    })
    expect(colori[VERA]).toBe('#C2185B')
    expect(colori[ANNALISA]).toBe('#FFFFFF')
    expect(colori[ALESSANDRA]).toBe('#9B1B1B')
  })
})
```

- [ ] **Passo 2: esegui e verifica che falliscano** — `42883` sulle due funzioni, e i colori vecchi.

- [ ] **Passo 3: scrivi la migrazione**

```sql
-- supabase/migrations/0021_ricerca_e_colori.sql
--
-- La ricerca delle clienti e il controllo dei doppioni, design 3a §4.8 e §5.4.
--
-- Passano da funzioni chiamate in POST e non da un filtro su `client`: un
-- filtro PostgREST mette il nome o il telefono nella QUERYSTRING, e la
-- querystring finisce nei log del gateway.
--
-- pg_trgm nello schema `extensions`, come unaccent e btree_gist: con
-- `search_path = ''` ogni riferimento va qualificato.
create extension if not exists pg_trgm with schema extensions;

create index client_nome_trgm on client
  using gin (public.immutable_unaccent(lower(full_name)) extensions.gin_trgm_ops);

create function public.cerca_clienti(p_testo text)
returns table (id uuid, full_name text, phone text, somiglianza real)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id,
         c.full_name,
         c.phone,
         extensions.similarity(public.immutable_unaccent(lower(c.full_name)),
                               public.immutable_unaccent(lower(p_testo))) as somiglianza
  from public.client c
  -- OPERATOR(schema.op) è l'unica forma valida per un operatore qualificato:
  -- `extensions.%` è un errore di sintassi e la migrazione non si crea
  -- (misurato).
  -- Testo vuoto: nessuna riga. Senza questa guardia il ramo del nome diventa
  -- `like '%%'` e l'elenco delle clienti esce intero (misurato).
  where coalesce(trim(p_testo), '') <> ''
    and (
       public.immutable_unaccent(lower(c.full_name))
          OPERATOR(extensions.%) public.immutable_unaccent(lower(p_testo))
     or public.immutable_unaccent(lower(c.full_name))
          like '%' || public.immutable_unaccent(lower(p_testo)) || '%'
     -- La guardia sulle cifre è obbligatoria: senza, una ricerca per nome
     -- riduce il ramo del telefono a `like '%%'`, vero per OGNI riga, e
     -- l'elenco delle clienti esce intero a ogni ricerca (misurato).
     or (regexp_replace(p_testo, '[^0-9]', '', 'g') <> ''
         and regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')
             like '%' || regexp_replace(p_testo, '[^0-9]', '', 'g') || '%')
    )
  order by somiglianza desc, c.full_name
  limit 20
$$;

-- Il controllo dei doppioni di spec §8.2: stesso telefono (confrontato per
-- sole cifre, perché l'app normalizza in E.164 ma lo storico può non esserlo)
-- oppure nome simile.
create function public.doppioni_cliente(p_nome text, p_telefono text)
returns table (id uuid, full_name text, phone text, motivo text)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id, c.full_name, c.phone, 'telefono'::text
  from public.client c
  where p_telefono is not null
    and regexp_replace(p_telefono, '[^0-9]', '', 'g') <> ''
    and regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g')
        = regexp_replace(p_telefono, '[^0-9]', '', 'g')
  union
  select c.id, c.full_name, c.phone, 'nome'::text
  from public.client c
  where p_nome is not null
    and extensions.similarity(public.immutable_unaccent(lower(c.full_name)),
                              public.immutable_unaccent(lower(p_nome))) >= 0.4
$$;

-- I colori di D3-6. Il primo piano aveva seminato altri valori; le
-- Impostazioni del 3c permetteranno di cambiarli.
--
-- Il guardiano di 0009 scatta su OGNI update di `operator` e pretende almeno
-- un'operatrice attiva **collegata a un account esistente**. Durante le
-- migrazioni `auth_user_id` è NULL per tutte e tre, perché il collegamento lo
-- fa `seed.sql`, che gira DOPO: un semplice `update … set color` fallisce con
-- `23514 refused: this would leave no last active operator linked to an
-- account` e fermerebbe `db reset` (misurato).
--
-- NON si spegne il trigger: un guasto fra il `disable` e l'`enable`, fuori da
-- una transazione, lo lascerebbe spento **per sempre**, e in produzione in
-- silenzio (misurato al terzo giro). Si restringe invece a ciò che deve
-- davvero sorvegliare — `is_active` e `auth_user_id` —, che è anche l'unica
-- cosa che il suo corpo guarda. Un cambio di colore o di ordine non lo tocca
-- più.
--
-- Due trigger e non uno: una clausola WHEN su OLD e NEW non si dichiara
-- insieme per UPDATE e DELETE.
drop trigger operator_lockout_guard on operator;

create constraint trigger operator_lockout_guard
  after update on operator
  deferrable initially immediate
  for each row
  when (old.is_active is distinct from new.is_active
        or old.auth_user_id is distinct from new.auth_user_id)
  execute function app.guard_operator_lockout();

create constraint trigger operator_lockout_guard_del
  after delete on operator
  deferrable initially immediate
  for each row
  execute function app.guard_operator_lockout();

update operator set color = '#C2185B' where name = 'Vera';
update operator set color = '#FFFFFF' where name = 'Annalisa';
update operator set color = '#9B1B1B' where name = 'Alessandra';

revoke execute on function
  public.cerca_clienti(text),
  public.doppioni_cliente(text, text)
from public, anon;

grant execute on function
  public.cerca_clienti(text),
  public.doppioni_cliente(text, text)
to authenticated;
```

La soglia **0,4** è stata **misurata** durante la revisione del piano: `similarity('Maria Rossi','maria rosi') =
0,769`; `similarity('Maria Rossi','Anna Neri') = 0`; `similarity('Maria Rossi','Maria R.') = 0,538`; il limite
predefinito dell'operatore `%` è 0,3. Rimisurali qui e scrivili nel resoconto: se i tuoi numeri divergono, vince la
tua misura.

- [ ] **Passo 4: applica ed esegui** — 12 verdi.

- [ ] **Passo 5: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | togli `public.immutable_unaccent` dal confronto dei nomi | *«trova una cliente ignorando accenti e maiuscole»* |
| 2 | soglia 0,4 → 0,1 | *«non segnala un nome che non somiglia»* |
| 3 | soglia 0,4 → 0,9 | *«riconosce un nome simile»* |
| 4 | togli la normalizzazione delle cifre del telefono | *«riconosce lo stesso telefono in formato diverso»* |
| 4b | togli la guardia `coalesce(trim(p_testo), '') <> ''` | *«non restituisce niente per una ricerca vuota»* |
| 4c | togli la guardia sulle cifre nel ramo del telefono | *«non restituisce chi non c entra»* |
| 5 | `security invoker` → `definer` su `cerca_clienti` | *«non risponde a un account che non è operatrice attiva»* |
| 6 | togli la clausola `when (…)` dal trigger ridefinito | `npx supabase db reset` fallisce con `23514` sulle tre righe dei colori: è la sonda che presidia la ragione della ridefinizione |
| 7 | togli il trigger `operator_lockout_guard_del` | *«rifiuta la cancellazione dell ultima operatrice collegata»*, la prova nuova qui sotto. **Senza quella prova la sonda non ha vittima**: misurato che le sei prove esistenti di `operator-guard.test.ts` restano tutte verdi, perché nessuna cancella un'operatrice che il guardiano debba rifiutare |
| 8 | ridefinisci il trigger **senza** `deferrable initially immediate` | la prova di `operator-guard.test.ts` che disattiva e riattiva nella stessa transazione (se c'è); altrimenti **dichiara** che il presidio è l'audit del Task 9 |

- [ ] **Passo 6: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add supabase/migrations/0021_ricerca_e_colori.sql tests/schema/ricerca-clienti.test.ts
git commit -m "feat(3a-1): ricerca delle clienti, doppioni e colori scelti dall'utente

La ricerca e il controllo dei doppioni passano da funzioni chiamate in POST:
un filtro PostgREST metterebbe nome e telefono nella querystring, e la
querystring finisce nei log del gateway (design 3a §4.8).

pg_trgm porta la somiglianza che la spec §8.2 chiede — «maria rosi» deve
trovare «Maria Rossi» —, e il telefono si confronta per sole cifre, perché lo
storico può non essere in E.164.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: le cinque prove che restano

Il design §8.2 chiede cinque presidi che nessuno dei task precedenti copre. Stanno qui, in un task proprio, invece
che sparsi: così nessuno si perde in una riscrittura, e le due mutazioni che i Task 5 e 7 dichiarano «equivalenti»
trovano finalmente il loro presidio.

**Files:**
- Create: `tests/schema/presidi-mancanti.test.ts`

**Interfaces:** consuma tutto; non produce oggetti nuovi.

- [ ] **Passo 1: scrivi le cinque prove**

```ts
// tests/schema/presidi-mancanti.test.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { ALESSANDRA, VERA, VERA_AUTH, asOperatorCommit, asOwner, connect, pgCode, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const V1 = '50000000-0000-4000-8000-0000000000aa'
const A1 = '60000000-0000-4000-8000-0000000000aa'
const A2 = '60000000-0000-4000-8000-0000000000ab'
let seq = 0
const cod = () => `70000000-0000-4000-8000-5${String(++seq).padStart(11, '0')}`
const app1 = (id: string, inizio: number, operatrice = VERA, servizio = SERVICE_REFILL, durata = 12) => ({
  id, operatrice, servizio, inizio, durata,
})

const crea = (appuntamenti: unknown[] = [app1(A1, 120)]) =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: { esito: string; visita: string; appuntamenti: { id: string; versione: string }[] } }>(
      'select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r',
      [cod(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify(appuntamenti)],
    )
    return r.rows[0].r
  })

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('presidi che il design chiede e che i task precedenti non coprono', () => {
  it('23503: la cliente cancellata fra due invii dà un errore proprio, e non ricompare', async () => {
    await crea()
    await asOwner((c) => c.query('delete from client where id = $1', [CLIENT_MARIA]))
    const esito = await asOperatorCommit(VERA_AUTH, async (c) => {
      try {
        await c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
          cod(),
          '50000000-0000-4000-8000-0000000000ac',
          CLIENT_MARIA,
          DAY_ONE,
          JSON.stringify([app1('60000000-0000-4000-8000-0000000000ac', 200)]),
        ])
        return 'nessun errore'
      } catch (e) {
        return pgCode(e)
      }
    })
    expect(esito).toBe('23503')
    const clienti = await asOwner(async (c) =>
      Number((await c.query('select count(*) as n from client where id = $1', [CLIENT_MARIA])).rows[0].n),
    )
    expect(clienti).toBe(0)
  })

  it('aggiunta arrivata e poi tolta da una collega: la versione della visita basta a distinguerla da «mai arrivata»', async () => {
    const creata = await crea()
    // Una collega aggiunge e poi toglie: lo stato torna identico.
    const conPedicure = await asOperatorCommit(VERA_AUTH, async (c) => {
      const r = await c.query<{ r: { visita: string; appuntamenti: { id: string; versione: string }[] } }>(
        'select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r',
        [
          cod(), V1, CLIENT_MARIA, DAY_ONE,
          JSON.stringify([app1(A1, 120), app1(A2, 140, ALESSANDRA, SERVICE_MASSAGE, 10)]),
          creata.visita, JSON.stringify(creata.appuntamenti),
        ],
      )
      return r.rows[0].r
    })
    await asOperatorCommit(VERA_AUTH, (c) =>
      c.query('select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7)', [
        cod(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([app1(A1, 120)]),
        conPedicure.visita, JSON.stringify(conPedicure.appuntamenti),
      ]),
    )
    const versioneOra = await asOwner(async (c) => {
      const r = await c.query<{ v: string }>('select app.versione(updated_at) as v from visit where id = $1', [V1])
      return r.rows[0].v
    })
    // Se la versione della visita non cambiasse quando cambia l'insieme, questa
    // sarebbe uguale a quella di partenza e «Controlla» direbbe «non risulta
    // salvata» di un salvataggio avvenuto.
    expect(versioneOra).not.toBe(creata.visita)
  })

  it('«Controlla» riga 5: salvata ma visita assente e non cancellata non deve accadere', async () => {
    const c1 = cod()
    await asOperatorCommit(VERA_AUTH, async (c) => {
      await c.query('select salva_visita($1,$2,$3,null,$4::date,$5,null,null)', [
        c1, V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([app1(A1, 120)]),
      ])
    })
    // Si fabbrica lo stato impossibile: visita via, riga della tabella delle
    // cancellate via. Serve il proprietario, perché nessun percorso normale ci
    // arriva: è proprio il punto.
    await asOwner(async (c) => {
      await c.query('delete from visit where id = $1', [V1])
      await c.query('delete from visita_cancellata where id = $1', [V1])
    })
    const r = await asOperatorCommit(VERA_AUTH, async (c) => {
      const x = await c.query<{ r: { riga: number } }>('select controlla_invio($1,$2) as r', [c1, V1])
      return x.rows[0].r
    })
    expect(r.riga).toBe(5)
  })

  it('la pulizia a 30 giorni toglie le righe vecchie e lascia le nuove', async () => {
    const vecchio = '70000000-0000-4000-8000-5ffffffffff1'
    const vecchiaVisita = '50000000-0000-4000-8000-0000000000ad'
    await asOwner(async (c) => {
      await c.query("insert into invio (codice, esito, aggiornato) values ($1, 'salvata', now() - interval '40 days')", [vecchio])
      await c.query("insert into visita_cancellata (id, cancellata_il) values ($1, now() - interval '40 days')", [vecchiaVisita])
    })
    await crea()
    const rimasti = await asOwner(async (c) => {
      const i = await c.query('select codice from invio where codice = $1', [vecchio])
      const v = await c.query('select id from visita_cancellata where id = $1', [vecchiaVisita])
      const nuovi = await c.query('select count(*) as n from invio')
      return { invioVecchio: i.rowCount, cancellataVecchia: v.rowCount, totale: Number((nuovi.rows[0] as { n: string }).n) }
    })
    expect(rimasti.invioVecchio).toBe(0)
    expect(rimasti.cancellataVecchia).toBe(0)
    expect(rimasti.totale).toBeGreaterThan(0)
  })

  it('il vincolo dell occupazione torna differito a ogni chiamata nella stessa transazione', async () => {
    // Due salvataggi nella stessa transazione, con uno SCAMBIO fra due
    // appuntamenti della STESSA operatrice: è l'unica forma che collide.
    // Misurato al terzo giro: con due operatrici diverse, come era scritto
    // prima, non c'è collisione possibile e la prova era verde con e senza la
    // mutazione. Vera: 120-131 e 132-143.
    const creata = await crea([app1(A1, 120), app1(A2, 132)])
    const sessione = await sessioneDi(VERA_AUTH)
    const c = await connect()
    let esito = 'nessun errore'
    try {
      await c.query('begin')
      await c.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: VERA_AUTH, role: 'authenticated', session_id: sessione.sessionId }),
      ])
      await c.query('set local role authenticated')
      // primo scambio: A1 va dove sta A2 e viceversa
      const r1 = await c.query<{ r: { visita: string; appuntamenti: unknown[] } }>(
        'select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7) as r',
        [cod(), V1, CLIENT_MARIA, DAY_ONE, JSON.stringify([app1(A1, 132), app1(A2, 120)]),
         creata.visita, JSON.stringify(creata.appuntamenti)],
      )
      const dopo = r1.rows[0].r
      // secondo scambio, nella STESSA transazione: senza il `deferred` in testa
      // alla seconda chiamata, il `… immediate` della prima è ancora in vigore
      // e questo dà un falso 23505.
      await c.query('select salva_visita($1,$2,$3,null,$4::date,$5,$6,$7)', [
        cod(), V1, CLIENT_MARIA, DAY_ONE,
        JSON.stringify([app1(A1, 120), app1(A2, 132)]),
        dopo.visita, JSON.stringify(dopo.appuntamenti),
      ])
      await c.query('commit')
    } catch (e) {
      esito = pgCode(e) ?? 'ignoto'
      await c.query('rollback').catch(() => {})
    } finally {
      await c.end()
    }
    expect(esito).toBe('nessun errore')
  })
})
```

- [ ] **Passo 2: esegui** — `npx vitest run tests/schema/presidi-mancanti.test.ts`, 5 verdi.

- [ ] **Passo 3: sonde di mutazione**

| # | Mutazione | Prova che deve arrossire |
|---|---|---|
| 1 | in `salva_visita`, togli l'aggiornamento della versione della visita quando cambia l'insieme | *«aggiunta arrivata e poi tolta da una collega…»* |
| 2 | in `app.chiudi_invio`, togli le due `delete` della pulizia | *«la pulizia a 30 giorni…»* |
| 3 | in `salva_visita`, togli `set constraints … deferred` dalla testa | *«il vincolo dell occupazione torna differito…»*, che con lo scambio fra due appuntamenti della stessa operatrice dà `23505` (misurato) |
| 4 | in `controlla_invio`, fai cadere il ramo della riga 5 sulla riga 1 | *«Controlla riga 5…»* |
| 5 | in `salva_visita`, togli il ramo `23503` (cioè crea la visita senza la chiave esterna) | *«23503: la cliente cancellata fra due invii…»*. ⚠︎ **Corretta il 24/09/2026: «se non è mutabile, dichiarala equivalente» non vale.** Una mutazione che non si riesce a costruire è una **misura mancante**, non un'equivalenza: se non è costruibile si scrive «non misurata» e si dice perché. Misurato intanto che la condizione intercettata da quel ramo è raggiungibile davvero — `insert into visit` con una cliente inesistente dà `23503 … violates foreign key constraint` — quindi il ramo non è codice morto |

- [ ] **Passo 4: gate e commit**

```bash
cd /Users/nadiaottavi/Desktop/Git/salon-scheduler
npx supabase db reset && npm test && npm run test:fuso && npx tsc --noEmit
git add tests/schema/presidi-mancanti.test.ts
git commit -m "test(3a-1): i cinque presidi che il design chiedeva e che mancavano

La cliente cancellata fra due invii, l'aggiunta arrivata e poi tolta da una
collega, la riga 5 di «Controlla», la pulizia a 30 giorni dei due registri e il
vincolo dell'occupazione che torna differito a ogni chiamata.

Gli ultimi due sono il presidio che i Task 5 e 7 avevano dovuto rimandare
dichiarando equivalenti le loro mutazioni: ora quelle mutazioni hanno una
vittima.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verifiche di fine piano

Dopo il Task 10, prima di dichiarare finito il 3a-1:

1. **Gate**, con l'output vero incollato: `npx supabase db reset`, `npm test`, `npm run test:fuso`, `npx tsc --noEmit`.
   Scrivi il numero di prove **misurato**, non atteso.
2. **`/security-review`** sulle modifiche del ramo.
3. **Test-audit distinto**, con la tabella *mutazione → prova che la uccide*, oppure `NOT CAUGHT`. È l'unica cosa che
   trova «la prova passa per il motivo sbagliato», e in questo piano ci sono due punti dove è già successo altrove:
   le prove negative rese vuote dalla sessione mancante (Task 3) e la prova sul canale che scriverebbe da proprietario
   (Task 8).
4. **Revisione avversariale** con più subagent su Opus, lenti distinte, prima di qualunque integrazione. Il commit dei
   findings aspetta l'esito.

## Che cosa NON è in questo piano

Va nel **3a-2, le schermate**, e nessuno dei due piani è completo da solo:

- l'app Next.js, l'accesso, il middleware che esce quando sbaglia, le quattro schermate, il trascinamento;
- le Server Actions che chiamano queste funzioni, i **ritentativi su `40P01`** e la **prova deterministica** che il
  percorso di scrittura ne ha ricevuto almeno uno (design 3a §8.2): il ritentativo vive nell'app, quindi la prova
  vive lì;
- la normalizzazione del telefono in E.164 con `libphonenumber-js` (qui il database confronta per sole cifre);
- «Controlla» come rotta del server fuori dalla fila delle Server Actions, i codici pendenti in `localStorage`, il
  segnale periodico di connessione;
- le prove da capo a fondo con Playwright, l'accessibilità e i due fusi;
- `.nvmrc` ed `engines` (`NODE-PIN`), che arrivano con Next.js.

## Autocontrollo del piano (fatto il 23 settembre 2026)

- **Copertura della spec del 3a.** §4.1 → Task 1, 5, 6, 9, 10. §4.2 → 3a-2 (è codice dell'app). §4.3 → 3a-2, salvo i
  codici d'errore che le funzioni sollevano, fissati qui. §4.4 → Task 1 e 7. §4.5 → 3a-2 (gli avvisi li calcola il
  server). §4.6 → Task 8. §4.7 → Task 2, 3, 4. §4.8 → Task 10 per le funzioni; il resto in 3a-2. §4.9 → 3a-2.
  §8.2 → Task 1–10, tranne il `40P01` deterministico, dichiarato sopra come 3a-2.
- **Nessun segnaposto:** ogni passo contiene il codice vero, e ogni sonda nomina la prova che deve arrossire.
- **Tipi coerenti:** le funzioni restituiscono sempre `jsonb` con la chiave `esito`; le versioni sono sempre `text`
  prodotto da `app.versione`; `p_attesi` e l'insieme corrente hanno la stessa forma `[{"id","versione"}]` ordinata per
  `id`, e il confronto è fra `jsonb` interi.
- **Un punto fragile dichiarato:** `salva_visita` confronta `p_attesi` con `v_correnti` come `jsonb` **ordinati per
  `id`**. Se l'app manda l'elenco in un altro ordine, il confronto fallisce e l'esito è un falso `modificata_altrove`.
  Il 3a-2 deve ordinare per `id` prima di inviare, e la prima prova del 3a-2 su questo percorso deve dimostrarlo.

---

## Appendice — Revisione del piano (23 settembre 2026)

Tre revisori su Opus, con mandato di demolire: **SQL eseguibile davvero** (con un database di prova usa e getta,
`rev_piano3a1`, creato alle 09:48:55 e cancellato alle 10:07:04), **prove e sonde**, **copertura e processo**. In
totale **17 reperti bloccanti**, tutti corretti in questa revisione del piano.

**Che cosa ha retto alla prova sul banco** (eseguito davvero, non letto): `salva_visita` e `stato_visita` su
**14 scenari su 14**; `sposta_visita_a` e `cancella_visita` su **9 su 9**; il meccanismo di «Controlla» — attesa
sulla chiave fino alla fine del commit (612 ms misurati), `55P03` con `lock_timeout`, e la differenza fra la versione
a istruzioni separate (fotografia nuova) e quella a CTE unica (fotografia vecchia); le tabelle di transizione dei
trigger per istruzione, anche attraverso la cascata di chiave esterna; la soglia di somiglianza 0,4, che separa
«maria rosi» (0,769) da «Anna Neri» (0).

**I bloccanti, e dove sono corretti:**

| # | Reperto | Correzione |
|---|---|---|
| 1 | `asOperator` **annulla** sempre la transazione: decine di prove dei Task 5–8 leggevano un database vuoto | Task 2: nasce `asOperatorCommit`, e le prove che rileggono da un'altra connessione ci passano sopra |
| 2 | Le password finivano in `supabase/seed.sql`, che il design §8.5 vieta perché `db reset --linked` lo esegue sul progetto ospitato | Task 2: `preparaAccountLocali()` nelle fixture; `seed.sql` non si tocca |
| 3 | Senza riga in `auth.identities` e con le colonne testuali a NULL, GoTrue risponde **500**: nessuna prova del piano riusciva ad accedere | Task 2, stessa funzione |
| 4 | `app.is_active_operator()`: il `nullif` dopo il cast non protegge, e `''::jsonb` dà `22P02` dentro ogni politica | Task 3: `nullif(current_setting(...), '')` come in `auth.uid()`, più la prova sul claim vuoto |
| 5 | L'audit delle politiche univa le due condizioni con `and`: una politica con il `with check` nudo non compariva | Task 3: `or`, e la sonda si sdoppia |
| 6 | `create policy` su `realtime.messages` **non è eseguibile** dal ruolo delle migrazioni | Task 8, Passo 0: si misura e si sceglie fra concedere il ruolo o applicare la politica a mano, con la prova che fallisce se manca |
| 7 | `extensions.%` non è sintassi valida: la migrazione della ricerca non si crea | Task 10: `OPERATOR(extensions.%)` |
| 8 | Il ramo del telefono rendeva `cerca_clienti` un elenco completo per ogni ricerca senza cifre | Task 10: guardia sulle cifre, in `cerca_clienti` e in `doppioni_cliente` |
| 9 | La regola 11 era dichiarata e mai esercitata: la prova chiudeva la sessione **prima** della chiamata, e la funzione usciva a `non_trovata` | Task 5: riesame della visibilità dopo ogni UPDATE, e la prova che chiude la sessione **dopo** il blocco, da una terza connessione |
| 10 | La prova sui permessi diretti girava in una transazione già abortita: il 2° e il 3° errore erano `25P02` | Task 1: un savepoint per istruzione |
| 11 | La prova su `app.versione` non cambiava mai il fuso (`set local` fuori da una transazione), e la sua sonda era morta | Task 1: `set timezone` |
| 12 | La prova «tiene fuori anon» misurava «nessun claim», non «anon» | Task 3: transazione esplicita |
| 13 | Il Task 4 cancellava un'operatrice e ne creava una quarta, entrambe committate: `access-control` si aspetta tre nomi | Task 4: operatrice usa e getta e pulizia in `finally` |
| 14 | Il Task 4 cambiava colore e ordine di Annalisa per sempre, e il Task 10 li asserisce | Task 4: ripristino in `finally` |
| 15 | La cache dei token restava avvelenata dopo ogni chiusura di sessione, e le prove successive del file diventavano rosse o vuote | Task 2: `dimenticaSessioni()` dove serve. ⚠︎ **Corretta il 24/09/2026:** questa casella diceva anche «`asOperator` controlla che la sessione sia viva», che contraddice il corpo del Task 2 e la riga del bloccante 2 qui sotto — il riaccesso automatico è stato **tolto** perché uccideva tre prove negative, e `asOperator` non controlla niente. Chi legge la vecchia formula lo «ripristina» |
| 16 | L'audit del `search_path` cercava `search_path=` invece di `search_path=""`: rosso per sempre | Task 9, con `app.touch_updated_at` dichiarata invece che nascosta |
| 17 | Le prove `OUTSIDER-WRITE` passavano per il motivo sbagliato (elenco vuoto) o erano rosse (esito `non_trovata` senza errore), e usavano costanti mai definite | Task 9: file proprio, dati veri, asserzione sull'**effetto**, e la decisione sulla guardia esplicita portata all'orchestratrice |

**Correzioni minori applicate:** limite di accessi del GoTrue locale alzato e dichiarato; conteggi delle prove
(12 al Task 1, 10 al Task 6, 20 al Task 5, 9 al Task 3 e al Task 8); due note ⚠︎ sull'ordine delle funzioni nel file
riscritte, perché l'obbligo tecnico non esiste (misurato); la sonda sul `set constraints … deferred` dichiarata
**equivalente**, con la sonda vera spostata sul `… immediate` finale; prove nuove per l'operatrice disattivata sul
canale e per l'iscrizione allo stesso nome in chiaro.

**Reperti che restano aperti e che chi esegue deve riferire, non risolvere da solo:**
- la proprietà di `realtime.messages` (Task 8, Passo 0);
- se dare alle tre funzioni di scrittura la stessa guardia esplicita di `controlla_invio` (Task 9, Passo 4);
- le prove di §8.2 che il piano non copre e che vanno collocate: `23503` fra due invii, «aggiunta arrivata e poi
  tolta da una collega», la riga 5 di §4.4, la pulizia a 30 giorni, il `set constraints` nominato per le tre funzioni
  nuove.

## Appendice — Secondo giro di revisione del piano (23 settembre 2026)

Un revisore su Opus, con un banco usa e getta (`rev2_piano3a1`, creato alle 08:28:47 UTC e cancellato alle 08:34:16,
verificato assente), che ha **applicato davvero** le 13 migrazioni del repo più le 9 del piano e ha ricompilato i
dieci file di prova con il `tsconfig.json` del repo.

**Che cosa ha retto:** la compilazione TypeScript, **zero errori** su tutti i file; il claim vuoto che ora dà `false`
invece di `22P02`; l'audit delle politiche con l'`or` (15 politiche, rendering esatto); `OPERATOR(extensions.%)` e le
quattro ricerche nominate; l'audit del `search_path` che restituisce esattamente `touch_updated_at`; gli elenchi
nominativi del Task 9, verificati applicando davvero le migrazioni; l'attesa di «Controlla» (515 ms).

**I cinque bloccanti nuovi, e dove sono chiusi:**

| # | Reperto | Correzione |
|---|---|---|
| 1 | La migrazione dei colori **non si applica**: `operator_lockout_guard` scatta su ogni `update operator`, e durante le migrazioni nessuna operatrice ha ancora un account collegato (`23514`, misurato) | Task 10: il guardiano si spegne per le tre righe del colore e si riaccende subito, con due sonde che lo presidiano |
| 2 | Il riaccesso automatico che avevo messo in `asOperator` **uccideva tre prove negative**: la sessione cancellata veniva ricreata e la prova diventava verde per il motivo sbagliato | Task 2: `asOperator` torna semplice, nasce `asOperatorConSessione` per le prove negative, e chi chiude una sessione chiama `dimenticaSessioni()` |
| 3 | La coppia che dimostra commit e rollback scriveva su `invio`, che un'operatrice non può scrivere: `42501` (misurato) | Task 2: scrive su `client` |
| 4 | La regola 11 **non è esercitabile dall'esterno**: con la sessione chiusa la funzione esce prima di scrivere, in tutte e due le forme provate | Task 5: resta come difesa in profondità **dichiarata**, la prova e la sonda inesercitabili sono tolte, e la ragione è scritta nel codice |
| 5 | Il Task 4 lasciava sessioni vive fra una prova e l'altra: la successiva ne contava 2 invece di 1 | Task 4: `pulisciSessioni()` nel `beforeEach` |

**Le tre decisioni dell'utente, prese il 23 settembre:**

1. **Canale in diretta** → la politica si applica **a mano**, da un file in `supabase/manuale/`, e una prova la
   pretende. Nessun intervento sui ruoli del cluster.
2. **Rifiuto esplicito** → `salva_visita`, `sposta_visita_a` e `cancella_visita` cominciano come «Controlla»: chi non
   è operatrice attiva riceve `42501`, non `non_trovata`.
3. **Le cinque prove mancanti** → un **Task 11** in questo piano, invece di spargerle o rimandarle.

**Minori applicati:** guardia sul testo vuoto in `cerca_clienti` (misurato: senza, una ricerca vuota restituiva tutte
le clienti); `modificata_altrove` non può più tornare con lo stato nullo; codici d'invio da contatore e non
dall'orologio; conteggi corretti (8 al Task 3, 10 al Task 6 e al Task 8, 10 al Task 10); riferimenti a `seed.sql`
tolti dal Task 2.

## Appendice — Terzo giro di revisione del piano (23 settembre 2026)

Un revisore su Opus con banco usa e getta (`rev3_piano3a1`, 08:56:07–09:03:30 UTC, verificato assente), mirato sui
sei punti che i giri precedenti avevano spostato invece di chiudere. **Quattro bloccanti**, tutti corretti.

| # | Reperto | Misura | Correzione |
|---|---|---|---|
| 1 | La politica del canale **non è applicabile nemmeno a mano**: l'editor SQL usa lo stesso ruolo della migrazione, e quel ruolo non possiede `realtime.messages` | `pg_has_role('postgres','supabase_realtime_admin')` falso, `rolsuper` falso | **Task 8 riscritto**: una tabella `annuncio` nostra dentro la pubblicazione `supabase_realtime`, che **appartiene a `postgres`** (verificato dall'orchestratrice il 23/09). Decisione dell'utente |
| 2 | La prova sul vincolo differito **non poteva arrossire**: i due appuntamenti erano di operatrici diverse, quindi non collidevano mai | quattro scenari sul banco | Task 11: scambio fra due appuntamenti della **stessa** operatrice; misurato che senza il `deferred` in testa alla seconda chiamata arriva `23505` |
| 3 | `salva-visita.test.ts` non compilava: `asOperatorConSessione` usato e non importato | lettura | import corretto |
| 4 | **La mia dichiarazione «la regola 11 non è raggiungibile» era falsa** | eseguito sul banco: una collega che disattiva l'operatrice **mentre** il suo salvataggio è in coda fa scattare la regola 11 con `42501` | la regola torna a essere un presidio vero, con la prova che la esercita a tre connessioni e la sonda che ha di nuovo una vittima |

**Maggiori corretti:** il `disable trigger` nella migrazione dei colori è sostituito dalla **ridefinizione del
guardiano** con la clausola che lo restringe a `is_active` e `auth_user_id` — così non esiste più nessuna finestra in
cui possa restare spento, e l'audit del Task 9 ha una prova nuova che nessun trigger applicativo sia spento; la prosa
stantia su `asOperator` («se ne accorge e riaccede») è corretta ovunque; la prova `42501` è dentro il file giusto; la
sonda 10 del Task 5 nomina la vittima vera.

**Minori corretti:** `sign_in_sign_ups` si **sostituisce** alla riga 206 invece di essere aggiunto (chiave duplicata,
il CLI rifiuterebbe il file); conteggio del Task 5; `preparaAccountLocali()` prima della prova sulla password; il
colore di Vera dichiarato non discriminante.

## Appendice — Quarto giro di revisione del piano (23 settembre 2026)

Un revisore su Opus con banco usa e getta (`rev4_piano3a1`, 09:17:06–09:33:08 UTC, verificato assente), che ha
**applicato tutte e 22 le migrazioni** — le 13 del repo e le 9 del piano — e ha eseguito le prove dei tre punti sotto
esame. Quattro bloccanti, tutti corretti.

**Che cosa ha retto, misurato:** `alter publication … add table` e `set (publish='insert')` dal ruolo delle
migrazioni; la politica di `annuncio` valutata **con i claim dell'iscritto**, quindi anche la chiusura immediata vale
sul canale; `anon` fermato prima della politica dai permessi di colonna; il trigger `security definer` con
`search_path = ''` e le tabelle di transizione; e la ridefinizione del guardiano, provata contro **tutte e sei** le
prove di `operator-guard.test.ts` in entrambe le forme, con lo stesso esito.

| # | Reperto | Misura | Correzione |
|---|---|---|---|
| 1 | «Un annuncio per istruzione» è falso: `salva_visita` inserisce gli appuntamenti **uno per istruzione** | 2 annunci con un appuntamento, 3 con due | le prove asseriscono il **contenuto** dei giorni, e la sonda «per riga contro per istruzione» usa la cancellazione a cascata, che è l'unica forma dove i due si separano |
| 2 | `date[]` torna come oggetti `Date`: ogni asserzione sulle date sarebbe rossa, e una sarebbe verde per il motivo sbagliato | OID 1182 non registrato in `tests/helpers/db.ts` | parser aggiunto nel Task 8, con il file dichiarato fra quelli che tocca |
| 3 | Il Task 8 fa fallire una prova del Task 3: le politiche di `public` diventano **16** | contate sul banco | il Task 8 aggiorna il conteggio e lo dichiara |
| 4 | **La mia correzione del terzo giro era sbagliata**: la regola 11 non è raggiungibile, e la prova che dicevo la esercitasse misurava la regola 6 | quattro forme provate, tre eseguite fino in fondo, una finita in stallo | la regola 11 torna **difesa in profondità dichiarata**, la sonda è **senza vittima** e lo dice, e la prova cambia nome e asserisce il valore misurato (`non_trovata`) |

**Maggiori corretti:** le tre prove negative sul canale hanno ora **dentro** la loro compagna positiva, un ascoltatore
attivo che riceve nello stesso istante — senza, sarebbero verdi anche con il canale muto per tutti; la prova che
prometteva «e non a un'estranea» ora la interroga davvero.

**Minori corretti:** la pulizia degli annunci esce dal trigger e va in `app.chiudi_invio` — ⚠︎ ma la ragione scritta
qui al quarto giro, «girava dentro la transazione che tiene il blocco sulla visita», il quinto giro l'ha **misurata
falsa**: `chiudi_invio` gira nella stessa transazione e il blocco è ancora tenuto. La ragione vera è che il trigger
gira una volta per istruzione — da 2 a 5 volte per salvataggio, e di più al crescere degli appuntamenti (misurato al
sesto giro) — mentre `chiudi_invio` gira una volta per invio, misurata 1 su sei forme; `await` su `setAuth`; il Task 10 guadagna le due prove che presidiano il
trigger di cancellazione (senza, toglierlo non faceva arrossire niente: misurato); l'audit conta quanti trigger ha
esaminato; l'effetto di `publish='insert'` sull'intera pubblicazione è dichiarato, con l'interruttore di Studio
nominato come strada raggiungibile.

**Una nota sul metodo, per il piano 3a-2.** Quattro giri su questo piano, e ogni giro ha trovato il grosso nelle
correzioni del giro prima. Quello che ha funzionato non è stato leggere meglio: è stato **eseguire** — banco usa e
getta, migrazioni applicate davvero, prove trascritte e lanciate, sonde eseguite. Tre dei quattro bloccanti di questo
giro erano invisibili a qualunque rilettura.

## Appendice — Quinto giro di revisione del piano (23 settembre 2026)

Un revisore su Opus, mirato **solo** sul Task 8 riscritto e sulla decisione presa al quarto giro sulla regola 11, come
il quarto giro aveva prescritto. Banco usa e getta `rev5_piano3a1` (09:46:14–09:55:12 UTC, verificato assente), tutte e
22 le migrazioni applicate, la regola 11 provata in **cinque forme ripetute tre volte ciascuna**. Due bloccanti.

**Che cosa ha retto, misurato:** il parser `date[]` (senza, `giorni` torna `[Date 2026-03-11T23:00:00Z]` col fuso di
Roma; con, torna `["2026-03-12"]`) e non rompe niente, perché `annuncio.giorni` è **l'unica** colonna `date[]` dello
schema e nessuna funzione restituisce array; il conteggio **16** delle politiche; la `create or replace
app.chiudi_invio` del Task 8, ricostruita come il piano prescrive (corpo del Task 1, `or replace`, le tre righe
scommentate) e applicata senza errori — il Passo 6 dà la sola `delete`, non il testo intero: l'operazione è meccanica,
ma va fatta; la sonda 3, che ha una vittima vera (2 annunci contro 3); la prova sull'estranea, verde per il motivo
giusto (è la politica a fermarla, non il permesso di colonna).

| # | Reperto | Misura | Correzione |
|---|---|---|---|
| 1 | **La prova di riservatezza non poteva arrossire**: leggeva `select giorni`, quindi una colonna `client_id` con l'id di Maria la lasciava verde | colonna aggiunta davvero: la tabella la conteneva, la prova restava verde | la prova legge `to_jsonb(a)` **e** fissa l'elenco delle colonne (`['creato','giorni','id']`) |
| 2 | **La dichiarazione «la regola 11 non è raggiungibile» era falsa** | con il blocco sull'`insert into client` e argomenti tutti corretti, la regola 11 scatta 3 volte su 3; e col blocco sulla visita basta `p_attesi` vuoto | dichiarazione rifatta nella migrazione, prova nuova che asserisce il **messaggio**, sonda 7 riscritta |

**Maggiori corretti:** la sonda 6 del Task 8 (il solo `grant insert` non ha vittima — con la sicurezza per riga accesa
e nessuna politica di inserimento l'errore resta `42501`: ora la sonda aggiunge anche la politica); e la **ragione**
dello spostamento della pulizia degli annunci, che era falsa in tre punti — `chiudi_invio` gira dentro la stessa
transazione di `salva_visita` e il blocco sulla visita è ancora tenuto quando la delete parte (misurato con `55P03` da
una seconda connessione). La ragione vera, e misurata, è un'altra: una volta per invio invece di 2-3 per salvataggio.

**Minori corretti:** l'elenco degli esiti attesi del Passo 4 del Task 8 (7 rosse e 3 verdi, non 4 e 3); il nome della
seconda prova degli annunci, che prometteva «UN annuncio solo» mentre il valore misurato è 2, ora esatto e non un
tetto; `ALESSANDRA` importato e mai usato; il `setTimeout(300)` della prova sotto blocco, sostituito dall'attesa sulla
**condizione** (`pg_stat_activity.wait_event_type = 'Lock'`) — con un tempo fisso, su una macchina lenta la prova
diventa rossa senza nessun difetto sotto.

**Il filo che attraversa i due bloccanti.** Tutti e due sono prove o dichiarazioni che *sembravano* presidiare e non
presidiavano: la prima leggeva una colonna sola invece della riga, la seconda affermava per iscritto un'assenza che una
misura in più smentisce. È la stessa famiglia del quarto giro, e si trova solo eseguendo. Il sesto giro guarderà
**solo** le due correzioni bloccanti e la ragione della pulizia.

## Appendice — Sesto giro di revisione del piano (23 settembre 2026)

Un revisore su Opus, mirato **solo** sulle tre correzioni del quinto giro. Banco usa e getta `rev6_piano3a1`
(10:06:22–10:14:27 UTC, verificato assente), 22 migrazioni applicate, più il Passo 6 del Task 8 ricostruito come il
piano prescrive.

**I due bloccanti del quinto giro sono chiusi davvero, misurati.** La prova di riservatezza arrossisce in due modi: con
una colonna `client_id` aggiunta (elenco delle colonne **e** `not.toContain`) e col nome della cliente infilato dentro
un valore esistente. La prova della regola 11 gira 3 volte su 3 con lo stesso messaggio, sollevato alla riga 149 della
funzione — e la controprova senza `clienteNuova` **non si blocca mai** e risponde `salvata`, che è la dimostrazione
che il blocco cade proprio sull'`insert into public.client`. La sonda 7 la uccide 3 su 3 in entrambe le letture, con
un `42501` che arriva dal `with check` su `appointment`. Tutte e quattro le frasi della dichiarazione nuova sono vere.

| # | Reperto | Misura | Correzione |
|---|---|---|---|
| 1 | **«2-3 volte per salvataggio» era falso**, scritto in tre punti | contatori dentro il trigger su sei forme: 2, 3, 2, **4**, **5**, 2 — e cresce col numero degli appuntamenti. `chiudi_invio`: 1, sempre | il numero misurato, con le sei forme, nei tre punti |

Lo scarto è **più largo** di quanto il piano dichiarasse, non più stretto: la conclusione non cambia, ma il numero sì.

**Maggiore corretto:** la sonda 7 diceva «togli i due riesami dopo gli UPDATE», e i riesami dopo un UPDATE sono tre
(più uno dopo la DELETE). Ora li nomina per l'istruzione che li precede.

**Minori corretti:** due `raise` portavano lo stesso identico messaggio, e la prova della regola 11 asserisce con
`toContain` — oggi il secondo è irraggiungibile in quello scenario, ma bastava un cambiamento perché la prova si
ancorasse al posto sbagliato: ora il secondo dice «(versione dell insieme)»; la prova di riservatezza ha la sua
compagna positiva (senza, le tre asserzioni di vuoto restavano verdi col trigger muto); l'esito atteso del Passo 4 del
Task 8 per quella prova non è `42P01` ma una differenza di asserzione, perché `information_schema.columns` su una
tabella assente restituisce zero righe; e l'appendice del quinto giro diceva di aver confrontato un testo che nel
Passo 6 non c'è.

**Una nota per chi rimisurerà l'avvertenza sul blocco.** Fermando `chiudi_invio` appena prima della pulizia, una
seconda connessione prende `55P03` **sul percorso di modifica**, non su quello di creazione: lì la riga nuova non è
ancora visibile all'altra transazione, e chi sondasse solo la creazione concluderebbe a torto che l'avvertenza è falsa.

**Dove ci si ferma.** Il revisore chiude: «i punti 1 e 2 sono misurati e reggono, non serve un settimo giro su di
essi». Le correzioni di **questo** giro — il numero nei tre punti, la sonda 7, i due `raise`, la compagna positiva —
non sono state riviste da nessuno: sono testo e commenti, nessuna cambia il comportamento di una funzione, e la sola
che tocca il codice (il messaggio del secondo `raise`) non è asserita da nessuna prova. È il limite dichiarato di
questo piano al momento del commit.

---

## Appendice — Esecuzione del Task 1 e revisione (24 settembre 2026)

Scritta da chi ha eseguito il Task 1, dopo due revisioni indipendenti. Sostituisce il resoconto di chat: la chat del
Task 2 legge questa.

**Consegnato:** `supabase/migrations/0013_invii_e_cancellate.sql` e `tests/schema/invii.test.ts`. Primo commit
`b5ed3a9` (trascrizione fedele del piano, 12 prove); secondo commit con le correzioni della revisione (14 prove, sei
commenti corretti). Nessun altro file, nessun task successivo anticipato.

**Gate, misurato in serie a suite ferma:** `npx supabase db reset` senza nessuna riga `Skipping migration`;
`npm test` → 19 file, **270 prove verdi** in 8,48 s; `npm run test:fuso` → 96 verdi; `npx tsc --noEmit` → uscita 0.

### Le tredici sonde di mutazione, con il numero di prove rosse MISURATO

| # | Mutazione | Rosse | Prova arrossita |
|---|---|---|---|
| 1 | `app.versione`, via `at time zone 'UTC'` | 1 | *conserva i microsecondi…* |
| 2 | `app.versione`, `.US` → `.MS` | 1 | *conserva i microsecondi…* |
| 3 | `apri_invio`, `v_inserite = 1` → `= 0` | 2 | *apre un codice nuovo…* e *registra l esito…* |
| 4 | `chiudi_invio`, via `and esito = 'in_corso'` | **0 → 1** | dopo la revisione: *rifiuta di chiudere un invio che non è più in corso…* |
| 5 | trigger, `after delete` → `before delete` | 1 | *sopporta la stessa visita cancellata due volte* |
| 6 | via `grant select … to authenticated` | 1 | *lascia leggere il registro a un operatrice attiva* |
| 7 | aggiungi `grant insert on table invio` | **0** | nessuna — vedi «gemello speculare» qui sotto |
| 8 | via il trigger `zz_registra_visita_cancellata` | 4 | le tre di registrazione più *sopporta … due volte* |
| 9 | trigger, `security definer` → `security invoker` | 1 | *registra la cancellazione fatta da un operatrice…* (`42501 permission denied for table visita_cancellata`) |
| 10 | `drop policy visita_cancellata_lettura` | 1 | *registra la cancellazione fatta da un operatrice…* |
| 11 | `chiudi_invio`, via `if v_toccate <> 1 then raise` | 1 | *rifiuta di chiudere un invio che non è più in corso…* |
| 12 | trigger, `do update set cancellata_il` → `do nothing` | 1 | *sopporta la stessa visita cancellata due volte* |
| 13 | via `and esito = 'in_corso'` (ripetuta dopo la prova nuova) | 1 | *rifiuta di chiudere un invio che non è più in corso…* |

Ogni sonda: mutazione applicata al file, `db reset`, prove, **ripristino da copia di scorta** (non da `git checkout`:
il file era non tracciato), `db reset`, prove di nuovo verdi. Tutte e tredici hanno ripristinato pulito.

### Due righe della tabella del Passo 6 erano sbagliate — corrette il 24 settembre 2026

Corrette in sede, dentro la tabella del Passo 6, con la misura accanto — insieme alla riga 7, e alle due sonde 5 del
Task 7 e del Task 11, dove la stessa formula ricompariva. Qui resta il perché:

- **Riga 5 dichiara equivalente `after delete` → `before delete`. È falso**, e misurato falso due volte (da chi
  esegue e da una revisora, su un banco usa-e-getta): la funzione finisce con `return null`, e in un trigger
  `BEFORE … FOR EACH ROW` `return null` **annulla l'operazione** — `rowCount = 0`, la riga sopravvive. Con quella
  mutazione nessuna visita verrebbe più cancellata. Arrossiscono *«sopporta la stessa visita cancellata due volte»*
  (`23505 duplicate key … visit_pkey`) e, fuori dal file, `tests/schema/orphan-visit.test.ts`.
- **Riga 4 dichiara senza vittime `via and esito = 'in_corso'`. Era vero, ma non perché la mutazione fosse
  equivalente: perché nessuno aveva provato a ucciderla.** Costava una prova, ora c'è (sonde 4, 11 e 13).

La lezione: «senza vittime» e «equivalente» non sono la stessa cosa. La prima è una misura, la seconda è una tesi che
va argomentata. Il piano le confonde in tre punti.

### Il gemello speculare, ristretto alla sua misura vera

La sonda 7 non fa vittime perché con la sicurezza per riga accesa e **nessuna politica di scrittura** l'`INSERT` è
respinto con `42501` — lo **stesso codice** del rifiuto per permesso mancante — anche quando il permesso c'è
(`has_table_privilege` → `true`, misurato). La prova guarda solo il codice, quindi non distingue quale lucchetto ha
agito.

Vale **solo per l'`INSERT`**. Misurato una volta da una revisora e **rimisurato da chi esegue** il 24/09/2026 su
tutti e tre i verbi (`grant update` → `['42501','nessun errore','42501']`; `grant delete` →
`['42501','42501','nessun errore']`, contro l'atteso `['42501','42501','42501']`): `grant update` e `grant delete`,
da soli, **fanno arrossire** le prove dei permessi diretti: con RLS accesa `UPDATE` e `DELETE` non sollevano niente, filtrano zero righe in silenzio, e l'atteso
`'42501'` diventa `'nessun errore'`. Quei due `revoke` sono presidiati. Per presidiare anche l'`INSERT` servirebbe
leggere `has_table_privilege`, non il codice d'errore: **non fatto**, danno nullo (la RLS ferma comunque la scrittura).

### Il reperto che ha bloccato, e come è stato chiuso

`security definer` sul trigger delle cancellate non era presidiato da **nessuna** delle 19 prove, perché tutte e
cinque le prove delle cancellazioni giravano da `asOwner`, cioè dal proprietario, che quei poteri li ha già. Percorso
di danno reale: il **Task 8 riscrive `chiudi_invio` con `create or replace function`**, che azzera ogni attributo non
ripetuto; se nello stesso giro si perdesse il `definer` del trigger, ogni «Elimina visita», ogni «Togli» sull'ultimo
servizio e ogni cancellazione di cliente fallirebbero con `42501` per le operatrici vere **con la suite tutta verde**.
Aggravante: `catalogue-audit.test.ts` filtra `where p.prosecdef`, quindi una funzione che perde insieme `definer` e
`search_path` esce dall'audit.

Chiuso da una prova sola — *«registra la cancellazione fatta da un operatrice, non solo dal proprietario»* — che
cancella da `asOperator(VERA_AUTH)` e rilegge dentro la stessa transazione. La stessa prova è anche la prima che
esercita `grant select on visita_cancellata` e la sua politica di lettura (sonde 9 e 10).

### Presìdi ancora dichiarati e non presidiati (danno misurato, nessuno bloccante)

1. **Le due pulizie a 30 giorni** (`0013:117-128`): nessuna prova invecchia una riga. Il Task 11 le prevede già.
2. **`revoke insert … from authenticated` su `invio`**: vedi il gemello speculare qui sopra.
3. **`revoke execute … from public, anon` sulle quattro funzioni**: nessun audit di ACL di **funzione** esiste; quello
   di catalogo audita le tabelle. Non raggiungibile (`app` fuori da PostgREST).
4. **`schemas = ["public","graphql_public"]` in `supabase/config.toml`**: è l'**unico** vero presidio dietro
   l'irraggiungibilità delle funzioni `app`, e nessuna prova lo pianta. Misurato che un account estraneo con sessione
   `authenticated` eseguirebbe `app.apri_invio` e brucerebbe il codice di un'altra, se lo schema fosse esposto.
   Da portare al Task 9.
5. **Il filtro `where p.prosecdef`** in `catalogue-audit.test.ts:73`: da sostituire con un elenco nominativo delle
   funzioni che **devono** essere `security definer`. Da portare al Task 9.
6. **Il contenuto dell'elenco dei nove esiti** (`0013:30-33`): la prova sul `23514` arrossirebbe con qualunque elenco.
   Verificato a mano contro la spec e contro tutte le chiamate `chiudi_invio` del piano: i nove valori sono esatti e
   completi.

### Che cosa la spec §4.4 promette e questo codice non mantiene

- «**una sola funzione di servizio** `security definer`»: sono tre, più una al Task 7. Il codice ha ragione — apertura
  e chiusura hanno contratti diversi, e il trigger deve stare su `visit`. Da correggere è la spec.
- «**eseguibile solo dall'interno** delle funzioni di scrittura»: non implementabile come scritta, perché il piano
  scrive `controlla_invio` `security invoker` e quindi il `grant execute … to authenticated` è necessario. La forma
  vera è quella debole che la spec usa altrove: «nessuno può, **via PostgREST**». Il commento di `0013` è già stato
  corretto in questa forma; la spec no.
- «**prima istruzione dopo `set constraints`**»: è una convenzione sul chiamante. `0013` non può imporla e non la
  impone; il presidio è la prova di concorrenza del Task 7, che deve **durare**.
- Riga 5, «ogni cancellazione passa dalla tabella»: regge, con due falle dichiarate — `TRUNCATE` non fa scattare i
  trigger di riga (non raggiungibile dall'app, `00051` lo revoca) e la spazzata di conservazione di §11.3/§11.4
  lascia in `visita_cancellata` un residuo fino a 30 giorni dopo la cancellazione di una cliente. Il dato è un id
  che non si ricollega più a nessuno: anonimo, non pseudonimo. Da annotare nella spec.

### Confermato per misura, non per lettura

L'attesa sulla chiave primaria di §4.4 è stata riprodotta da una revisora su un banco separato: la seconda sessione ha
aspettato **922 ms**, cioè fino alla fine del commit della prima, i **619 ms** del suo trigger differito compresi, e
poi ha letto l'esito vero; col `rollback` della prima, il codice resta libero e la seconda lo brucia. È la sola
proprietà da cui dipende tutta la §4.4, ed è vera.

### Nota di processo

Durante il gate ho lanciato una seconda `npm test` mentre la prima girava ancora in sfondo. Due suite sullo stesso
database si sono svuotate e riseminate le tabelle a vicenda: 110 e 114 prove rosse con `duplicate key` e chiavi
esterne violate dentro `seedFixture`, e una suite ferma oltre dieci minuti senza completare un file. Non era il codice
e non erano i contenitori (`docker ps`: tutti `healthy`). **Il gate si esegue in serie, con niente altro in corso.**

### Che cosa NON è stato fatto, per decisione dell'orchestratrice

- Le righe **4, 5 e 7** della tabella del Passo 6 sono state corrette in sede il 24/09/2026, con la misura accanto.
- Le **sonde nuove 9-13 non sono state aggiunte** alla tabella del Passo 6: stanno solo nella tabella di questa
  appendice.
- La **spec §4.4 non è stata toccata** (revisione 10, la rileggono altri task).
- `invio` **non porta** l'operatrice che ha scritto il codice: la regola «stesso codice, stessa operatrice» resta sul
  telefono, come dice la spec. Se il Task 7 la volesse nel database, costa una migrazione in più.
- Nessun file di rientro per `0013`.

---

## Appendice — Esecuzione del Task 2 e revisione (24 settembre 2026)

Scritta da chi ha eseguito il Task 2, dopo due revisioni indipendenti avversariali in parallelo — una **empirica**
(proprietaria esclusiva del database e di Vitest) e una **a secco** (sola lettura, che consegna ipotesi falsificabili).
Il partizionamento non è una comodità: con un solo database locale, due revisore che lanciano la suite insieme
producono 110-114 rosse **false**. Sostituisce il resoconto di chat: la chat del Task 3 legge questa.

**Consegnato in quattro commit:**

| Commit | Cosa |
|---|---|
| `53a57dc` | `tests/helpers/sessioni.ts`, `tests/helpers/db.ts`, `tests/schema/sessioni-imbracatura.test.ts` (7 prove), `supabase/config.toml` |
| `827c2f4` | prove sui due aiuti negativi, controllo dell'account in `sessioneDi`, guardia `esigiDatabaseLocale()` |
| `5a00668` | `resetData` ripristina il ruolo per **id**, non per nome |
| `557793e` | in cache va la **promessa**, non il risultato |

**Gate finale, misurato in serie a suite ferma:** `npx supabase db reset` senza nessuna riga `Skipping migration`;
`npm test` → **20 file, 286 prove verdi** in 13,99 s; `npm run test:fuso` → 4 file, **96 verdi**;
`npx tsc --noEmit` → uscita 0. La consegna era 277 (270 del Task 1 + 7); la remediation ha portato a 286.

**La durata della suite è passata da 8,48 s a ~14 s.** Sono i **24 accessi HTTP** veri per passata (misurati anche in
`auth.audit_log_entries`): 16 di Vera, 5 dell'estranea, 2 di Alessandra, 1 di Annalisa. Il numero cresce con
**account × file**, non con i file — il messaggio di `53a57dc` dice «uno per file di prova» e su questo **sbaglia**.

### Lo scopo del task è raggiunto, e la misura è alla fonte che conta

La revisora empirica ha applicato al database la `app.is_active_operator()` del **Task 3** — quella con il secondo
`exists` su `auth.sessions` — e ha lanciato tutta la suite: **277 verdi** (misurato sulla consegna). Togliendo il
secondo `exists`, sul suo banco le tre prove negative del Task 3 diventano rosse. Nessuna prova entra più con claim
scritti a mano.

### ⚠︎ Il Passo 6 del Task 3 è stato corretto: attende VERDE, non rosso

Diceva «Atteso: **rosso**, all'incirca 57 prove su 81». Misurato: **zero rosse**, perché il Task 2 ha fatto il suo
lavoro. **L'obbligo delle gemelle positive accanto alle prove negative RESTA**, ed è il punto più fragile del piano:
misurato dalla revisione, con le sessioni di un'operatrice cancellate e la cache non svuotata, una prova negativa
generica (`expect(righe).toEqual([])`) resta **VERDE** e solo la gemella positiva arrossisce. Se chi esegue il Task 3
vede tutto verde e salta quel passo, la classe di verdi silenziosi resta scoperta.

### Le sonde di mutazione, con il numero di rosse MISURATO

Sette sulla consegna, nove sulla remediation. Ognuna: mutazione applicata al file, **suite intera** lanciata, rosse
contate, ripristino **da copia di scorta** (i file nuovi non sono tracciati: `git checkout --` li cancellerebbe),
verifica per hash, rilancio verde.

| # | Mutazione | Rosse | Prova arrossita |
|---|---|---|---|
| 1 | `inRole`: claim senza `session_id` | **1** | *porta il session_id dentro i claim* |
| 2 | `asOperator`: `session_id` inventato | **1** | la stessa |
| 3 | `asOperatorCommit`: `commit` → `rollback` | **1** | *con asOperatorCommit la scrittura resta…* |
| 4 | `asOperator`: commette invece di annullare | **1** | *con asOperator invece la scrittura sparisce…* |
| 5 | `resetData`: aggiunge `delete from auth.sessions` | **2** | *la sessione … esiste davvero…* e *resetData non chiude le sessioni…* |
| 6 | via l'`insert into auth.identities` | **0** | nessuna — codice morto, vedi sotto |
| 7 | via gli 8 `coalesce` sulle colonne testuali | **96** su 15 file | tutte, con `500 {"msg":"Database error querying schema"}` |
| 8 | `asOperatorSenzaSessione`: claim `sub` caduto | **1** | *asOperatorSenzaSessione porta il sub vero…* |
| 9 | `asOperatorConSessione`: claim `sub` caduto | **1** | *asOperatorConSessione porta il sub vero…* |
| 10 | `EMAIL_DI`: estranea → `vera@example.test`, **con** il controllo | **6** su 5 file | il controllo nomina l'errore |
| 11 | la stessa, **senza** il controllo | **0** | nessuna — era muta per sempre |
| 12 | `esigiDatabaseLocale` svuotata | **1** | *le prove rifiutano un database che non sia quello locale* |
| 13 | via la chiamata alla guardia da `resetData` | **1** | *resetData si rifiuta di girare…* |
| 14 | via la chiamata alla guardia da `preparaAccountLocali` | **1** | *preparaAccountLocali si rifiuta di scrivere…* |
| 15 | `resetData`: si torna al ripristino per **nome** | **37** su 10 file | il danno vero di R4 |
| 16 | `resetData`: via la cancellazione delle righe non previste | **3** | la mia più due di `access-control` |
| 17 | `sessioneDi`: in cache il risultato invece della promessa | **1** | *due chiamate concorrenti … una sessione sola* |
| 18 | `sessioneDi`: la promessa rifiutata resta in cache | **1** | *un accesso fallito non resta in cache…* |

### Metà del Passo 1 è codice morto, e la sonda 6 mente se non si azzera il database

L'`insert into auth.identities` **non serve** su GoTrue v2.196.0: a identità azzerate, 24 accessi riusciti, e
rispondono **200** anche `grant_type=refresh_token` e `GET /user`. Le colonne testuali invece servono (sonda 7). Il
piano le dà per necessarie insieme: sono due cose diverse. L'`insert` **resta**, con la misura scritta sopra di sé in
`sessioni.ts` — una versione futura di GoTrue potrebbe tornare a pretenderlo, e il guasto sarebbe rumoroso.

⚠︎ **La sonda 6 va misurata dopo un `db reset`.** Senza, le identità della passata precedente sono ancora nel database
e la mutazione appare innocua **per la ragione sbagliata**: misurate tutte e due le volte, 0 rosse senza reset e 0 con.
La stessa trappola vale per la sonda 7 (le colonne restano a `''` dalla passata prima). È il «caso facile» del Task 1
su un asse nuovo: non il **profilo**, ma lo **stato residuo nel database**.

### Il reperto peggiore, e come è stato chiuso

`asOperatorSenzaSessione` e `asOperatorConSessione` nascevano usati da **zero** prove. Facendo cadere il claim `sub` da
entrambi — cioè scrivendo `inRole('authenticated', null, …)`, la forma di `asAnon`, un riordino plausibilissimo — su un
banco con la funzione del Task 3 applicata **tutte e quattro** le prove della chiusura immediata restavano **verdi con
D3-17 assente dal database**, positiva compresa. Era il difetto che il Task 2 esiste per impedire, **spostato di un
anello**. Chiuso da due prove (sonde 8 e 9).

Della stessa famiglia: `sessioneDi` non controllava che la sessione fosse **di** quell'account. Mutando `EMAIL_DI`
dall'estranea a `vera@example.test`: **0 rosse oggi e 0 con la chiusura immediata accesa** — muta per sempre, e le
cinque prove della seconda direzione di §13.3 sarebbero girate con la sessione di Vera. Chiuso da una riga, che ora dà
6 rosse parlanti (sonde 10 e 11).

### Una guardia ha due assi: la logica e il collegamento

`esigiDatabaseLocale()` rifiuta un `DATABASE_URL` non locale, perché `resetData()` fa `truncate` di **ogni** tabella di
`public` e `preparaAccountLocali()` riscrive le password con una stringa in chiaro nel repo — e `2026-09-17-salon-scheduler-foundations.md:321`
suggerisce proprio di leggere l'indirizzo da `npx supabase status` e di esportarlo in `DATABASE_URL`. Le prove sulla **logica**
mordevano (sonda 12), ma togliendo la **chiamata** da `resetData` o da `preparaAccountLocali` si otteneva **zero
rosse**: la guardia si scollegava in silenzio e il buco si riapriva intero. Perché il collegamento sia verificabile, la
guardia **rilegge l'ambiente alla chiamata** (`process.env.DATABASE_URL ?? DB_URL`) e sta **prima** di
`if (preparati) return`, che al secondo giro la saltava (sonde 13 e 14).

### `resetData` avvelenava il database in modo persistente

Ripristinava `auth_user_id` con `case name … end` e **nessun `else`**: una riga il cui nome era stato cambiato da una
scrittura **commessa** finiva con `auth_user_id = NULL` e restava così. Il veleno sta nel **database**, non nel
processo: sopravvive a una passata intera e solo un `db reset` lo toglie. Tornando a quella forma: **37 rosse su 10
file** (sonda 15). Il codice era preesistente, ma `asOperatorCommit` — nato qui — allarga la superficie da zero a una
sessantina di punti del piano.

Ora il ripristino va per **`id`**, copre anche `name`, e cancella le righe di `operator` non previste (sonda 16).
`color` e `sort_order` **non** si ripristinano di proposito: li possiede la migrazione — il Task 10 li riscrive per
D3-6 — e le prove che li cambiano li rimettono nel proprio `finally`. Ripristinarli qui congelerebbe i valori di `0001`
e farebbe arrossire il Task 10.

⚠︎ La prova che inquina il ruolo tiene l'inquinamento in un `try`/`finally` con pulizia esplicita, la convenzione che
la revisione del piano ha imposto al Task 4 (suo reperto 13). Verificato: con la cancellazione mutata la passata è
**rossa** e il database resta con le **tre** operatrici. Senza il `finally`, una prova caduta a metà avvelenerebbe un
**altro** file, con il sintomo lontanissimo dalla causa.

### Presìdi ancora dichiarati e non presidiati (danno misurato, nessuno bloccante)

1. **`asOperator` non si accorge di una sessione morta in cache.** È una scelta: il riaccesso automatico uccideva tre
   prove negative (bloccante 2 del quinto giro). Ma la conseguenza misurata è che con le sessioni cancellate una prova
   negativa generica resta **verde**. L'unica difesa è la gemella positiva del Passo 6 del Task 3. Un `asOperator` che
   **lancia** (senza riaccedere) quando la sessione in cache non è più in `auth.sessions` trasformerebbe ogni verde
   silenzioso in un rosso parlante, al costo di una query per chiamata. **Non fatto**, da valutare al Task 3 o 4.
2. **`dimenticaSessioni()` ridotto a `{}` → 0 rosse**, e lo chiamano ~30 punti del piano. Resta scoperto: al Task 4 il
   guasto diventa rumoroso (`P0004`), due task dopo la causa.
3. **`rinnovoRiesce()` che ritorna sempre `false` → 0 rosse.** La protezione esiste solo al **Task 4**, che ha due
   `expect(await rinnovoRiesce(sessione)).toBe(true)`: sono le gemelle positive che rendono capaci di fallire gli otto
   `toBe(false)`. **Se qualcuno tagliasse quelle due, otto prove negative diventerebbero decorative.** Inoltre
   `rinnovoRiesce` **ruota** il refresh token e **non salva** quello nuovo (rotazione attiva, `config.toml:170-173`):
   si chiama **una volta sola** per sessione, altrimenti può dare `false` su una sessione viva e persino revocarne la
   famiglia — la sonda ucciderebbe ciò che misura.
4. **`asOperatorCommit` duplica il corpo di `inRole`**, e quella copia non è presidiata: mutandone il `session_id`, 0
   rosse oggi. Una modifica futura ai claim non arriverebbe alle prove dei Task 5-8, che sono le più numerose.
5. **`salon_settings` non si ripristina**: è escluso dal `truncate`, e una scrittura commessa vi sopravvive come
   sopravviveva su `operator` (misurato su database pulito).
6. **`EMAIL_DI` resta esercitata per un account su quattro** dalle prove di questo file: il controllo di `sessioneDi`
   chiude la direzione che contava, ma una trasposizione fra Annalisa e Alessandra si scopre solo al Task 3.
7. **Il commento «Solo in locale» in `config.toml` è falso.** `supabase config push` porta al progetto collegato «le
   proprietà che il tuo config.toml **dichiara**», e in esecuzione non interattiva «procede per difetto» (letto
   dall'aiuto del CLI). `sign_in_sign_ups` è dichiarata: al primo collegamento il limite anti-forza-bruta del salone
   passerebbe da 30 a 300 tentativi ogni 5 minuti per IP. Oggi non c'è `project-ref` in `supabase/.temp/` e
   `config push` non compare nel repo, quindi non è raggiungibile — ma §8.7 manda qualcuno a collegare l'ospitato.
   Rimedio: `supabase config diff` **prima** di ogni `config push`.
8. **Il Task 2 chiude di fatto una decisione che il design §8.5 lascia aperta:** «il piano decide se togliere i quattro
   utenti `@example.test`». Il piano non decide, ma `EMAIL_DI` e `preparaAccountLocali` ne **dipendono**. La decisione
   è presa — restano — e va scritta nella spec.

### Trappole di processo nuove, misurate

1. **`db reset` non applica le modifiche a `config.toml` al GoTrue.** Lo **riavvia**, non lo ricrea, e le variabili
   d'ambiente si fissano alla creazione. Misurato due volte in modo indipendente: `Created` del contenitore auth fermo,
   `StartedAt` aggiornato; e mettendo `42` nel file, dopo un `db reset` l'ambiente diceva ancora `300`. Serve
   `npx supabase stop && npx supabase start`. Il vincolo globale «dopo ogni modifica a `config.toml`: `db reset`» è
   **insufficiente** per questa classe di chiavi.
2. **Nel CLI 2.117.0 `sign_in_sign_ups` si mappa su `GOTRUE_RATE_LIMIT_OTP`.** Una variabile
   `GOTRUE_RATE_LIMIT_SIGN_IN_SIGN_UPS` **non esiste**: cercarla fa perdere tempo. `token_verifications` resta su
   `GOTRUE_RATE_LIMIT_VERIFY=30`, quindi non c'è effetto collaterale sulle **verifiche** OTP.
3. **`pgrep -f vitest` è troppo largo.** Ha fermato l'esecuzione tre volte su processi di un **altro progetto** della
   stessa macchina (`chessbooking`), che ha il suo database. La trappola è «due suite sullo **stesso** database»:
   il controllo giusto è `pgrep -fl vitest | grep salon-scheduler`.
4. **Vitest esegue i file in parallelo** (la somma dei tempi dei file supera la durata della passata). Quindi
   **nessuna prova può contare righe globali in `auth.sessions`**: altri file accedono con gli stessi account e il
   conteggio sarebbe verde o rosso a seconda di chi gira nello stesso istante. La prova sulla concorrenza asserisce il
   `sessionId` condiviso, non un conteggio.
5. **Una sonda su codice con stato residuo nel database si misura dopo un `db reset`** (vedi sonde 6 e 7).

### Il limite a 300 è giusto oggi, e stretto domani

24 accessi per passata → dodici passate in cinque minuti. Ma dal **Task 4** il `beforeEach` azzera le sessioni e chiama
`dimenticaSessioni()`, quindi si accede **per prova**, e con ~30 punti di `dimenticaSessioni()` nel piano il conto sale
molto: un ciclo TDD stretto può arrivare a 300 in cinque minuti. Sintomo: **429** all'accesso. `token_refresh = 150` è
invece abbondante, perché oggi **nessuno rinnova**.

### Correzioni applicate a questo piano

- **Passo 6 del Task 3:** l'atteso passa da «rosso, ~57 prove su 81» a **verde**, con l'avvertimento che l'obbligo
  delle gemelle positive resta e perché.
- **Casella 15 della tabella di «Appendice — Revisione del piano»** (il primo giro): diceva «`asOperator` controlla
  che la sessione sia viva», che contraddiceva il corpo del Task 2 e il **bloccante 2 del secondo giro**. Chi leggeva la vecchia formula avrebbe
  «ripristinato» il riaccesso automatico.

### Che cosa NON è stato fatto, per decisione dell'orchestratrice

- I sei presìdi da 1 a 6 dell'elenco qui sopra restano aperti, con il danno misurato accanto.
- La decisione di §8.5 **non è stata scritta nella spec** (presidio 8): resta l'unica di dominio, e la prende
  l'orchestratrice.
- Il commento «Solo in locale» in `config.toml` **è stato corretto** il 24/09/2026 (presidio 7): ora dice che la chiave
  viaggia con `config push`, che serve un `config diff` prima, e che `db reset` non la applica.
- La glossa «uno per file di prova» nel messaggio di `53a57dc` **è stata corretta con una `git note`**, non con un
  amend: quel commit sta cinque commit indietro e riscriverlo avrebbe cambiato i SHA di tutti e cinque, invalidando i
  riferimenti che questa appendice usa come indice. La nota sta in `refs/notes/commits` e si legge con
  `git log --notes`; **non viaggia** con un `git push` normale.
- **Il parser dell'array di date (OID 1182)**, che la riga 59 attribuisce a `db.ts`, non è stato consegnato: è del
  **Task 8** (lo dice la riga 5096) e nessuna prova di questo piano legge un `date[]`. Il deliverable resta aperto.
- **`circa 24 su 81`** citato nel messaggio di `53a57dc` non è stato riprodotto: è una misura della spec §4.7, che è
  essa stessa vecchia (parla di 13 file su 14 e 81 prove su 160; oggi `tests/schema` ha **16 file e 190 prove**, misurate con `npx vitest run tests/schema` — non con un `grep` su `it(`, che ne conta 164 perché salta le annidate).
  Non è marcato verificato.
- Nessun file di rientro, nessuna anticipazione del Task 3.
