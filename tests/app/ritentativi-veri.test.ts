// tests/app/ritentativi-veri.test.ts
//
// C5, spec §4.3 passo 5, §8.2, §3.2. La forma la fissa §8.2: «la prova tiene
// aperta una transazione su una propria connessione con un deadlock_timeout PIÙ
// ALTO, così che ad abortire sia il PERCORSO DI SCRITTURA». Afferma ALMENO DUE
// TENTATIVI e il salvataggio.
//
// Il ciclo d'attesa, costruito così:
//   1. l'avversaria prende la riga della cliente (`for no key update`, che non
//      ferma i controlli delle chiavi esterne);
//   2. il percorso di scrittura salva una modifica: blocca la visita, aggiorna
//      l'appuntamento, e al COMMIT il trigger differito di `last_activity_at`
//      (0007) chiede la riga della cliente — e aspetta l'avversaria;
//   3. vista l'attesa, l'avversaria chiede la riga della visita, che tiene il
//      percorso di scrittura: il ciclo è chiuso. Dopo 1 s il rivelatore del
//      percorso di scrittura (il suo `deadlock_timeout`) lo trova e abortisce
//      LUI, con 40P01; l'avversaria, che controllerebbe solo dopo 10 s, passa.
//   4. l'avversaria chiude, e il ritentativo salva.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type pg from 'pg'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { apriSchedaSuVisita, serializza, type SchedaSerializzata } from '../../src/dominio/scheda'
import { leggiStato } from '../../src/server/lettura-scheda'
import { type Risposta, salvaVisita } from '../../src/server/scrittura-visita'
import { ALESSANDRA, ANNALISA, VERA, VERA_AUTH, asOwner, connect, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const vera = async (): Promise<SupabaseClient> =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${(await sessioneDi(VERA_AUTH)).accessToken}` } } })

const V = '50000000-0000-4000-8000-0000000008d1'
const A1 = '60000000-0000-4000-8000-0000000008d1'
const A2 = '60000000-0000-4000-8000-0000000008d2'

const aperte: pg.Client[] = []
async function connessione(): Promise<pg.Client> {
  const c = await connect()
  aperte.push(c)
  return c
}

async function finché(condizione: () => Promise<boolean>, limiteMs = 5_000): Promise<void> {
  const fine = Date.now() + limiteMs
  while (!(await condizione())) {
    if (Date.now() > fine) throw new Error('il percorso di scrittura non si è mai fermato sulla riga della cliente')
    await new Promise((r) => setTimeout(r, 20))
  }
}

beforeEach(async () => {
  await resetData()
  await seedFixture()
  await asOwner((c) =>
    c.query(
      `insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary)
       values ($1, 3, 108, 228), ($2, 3, 108, 228), ($3, 3, 108, 228)`,
      [VERA, ANNALISA, ALESSANDRA],
    ),
  )
  const scheda: SchedaSerializzata = {
    visitaId: V,
    modo: 'creazione',
    cliente: { tipo: 'esistente', id: CLIENT_MARIA },
    clienteEsisteAncora: true,
    data: DAY_ONE,
    servizi: [
      { id: A1, nuovo: true, operatriceId: VERA, servizioId: SERVICE_REFILL, inizio: 120, durata: 15, durataAMano: false, segueIlPrecedente: false },
      { id: A2, nuovo: true, operatriceId: ALESSANDRA, servizioId: SERVICE_MASSAGE, inizio: 138, durata: 10, durataAMano: false, segueIlPrecedente: false },
    ],
    versioneVisita: null,
    attesi: [],
    avvisiConfermati: [],
    partenza: { operatriceId: VERA, inizio: 120 },
  }
  expect(await salvaVisita(await vera(), scheda, crypto.randomUUID())).toMatchObject({ esito: 'salvata' })
})

afterEach(async () => {
  for (const c of aperte.splice(0)) {
    await c.query('rollback').catch(() => {})
    await c.end().catch(() => {})
  }
})

/** Lo scenario intero: restituisce la risposta, i tentativi visti e il tempo dal tocco alla risposta. */
async function salvaDentroUnCiclo(codice: string): Promise<{ risposta: Risposta; spia: number[]; ms: number }> {
  const client = await vera()
  const stato = (await leggiStato(client, V))!
  const s = serializza(apriSchedaSuVisita(stato, V))
  const mossa = { ...s, servizi: s.servizi.map((x) => (x.id === A1 ? { ...x, inizio: 122 } : x)) }

  const avversaria = await connessione()
  const osservatrice = await connessione()
  await avversaria.query('begin')
  await avversaria.query("set local deadlock_timeout = '10s'")
  await avversaria.query('select 1 from client where id = $1 for no key update', [CLIENT_MARIA])
  const pid = (await avversaria.query<{ p: number }>('select pg_backend_pid() p')).rows[0].p

  const spia: number[] = []
  const inizio = Date.now()
  const inVolo = salvaVisita(client, mossa, codice, { spiaTentativi: (t) => void spia.push(t) })
  // Il percorso di scrittura è fermo sulla riga della cliente, con la visita in mano.
  await finché(async () =>
    (await osservatrice.query<{ n: number }>(
      'select count(*)::int n from pg_stat_activity where $1 = any(pg_blocking_pids(pid))',
      [pid],
    )).rows[0].n > 0,
  )
  // Si chiude il ciclo: questa attesa finisce quando il percorso di scrittura abortisce.
  await avversaria.query('select 1 from visit where id = $1 for no key update', [V])
  await avversaria.query('rollback')
  const risposta = await inVolo
  return { risposta, spia, ms: Date.now() - inizio }
}

it('il percorso di scrittura riceve almeno un 40P01, ritenta e salva', async () => {
  const codice = crypto.randomUUID()
  const { risposta, spia, ms } = await salvaDentroUnCiclo(codice)
  console.info('C5: tentativi visti', spia.length, 'in', ms, 'ms')
  expect(spia.length).toBeGreaterThanOrEqual(2)          // almeno un ritentativo
  expect(risposta).toMatchObject({ tipo: 'esito', esito: 'salvata' })
  // E il codice d'invio è LO STESSO su tutti i tentativi: `invio` ha UNA riga.
  const { rows } = await asOwner((c) => c.query<{ n: number }>('select count(*)::int n from invio where codice = $1', [codice]))
  expect(rows[0].n).toBe(1)
  expect((await leggiStato(await vera(), V))!.appuntamenti.find((a) => a.id === A1)!.inizio).toBe(122)
})

it('il caso tipico sta nei 10 s di D3-9', async () => {
  const { risposta, ms } = await salvaDentroUnCiclo(crypto.randomUUID())
  console.info('C5: caso tipico', ms, 'ms')
  expect(risposta).toMatchObject({ esito: 'salvata' })
  expect(ms).toBeLessThan(10_000)
})
