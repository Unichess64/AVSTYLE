// tests/app/lettura-giorno.test.ts
//
// La lettura del giorno contro Supabase locale, con la sessione vera di Vera.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { leggiGiorno } from '../../src/server/lettura-giorno'
import { ALESSANDRA, ANNALISA, VERA, VERA_AUTH, asOperatorCommit, asOwner, resetData } from '../helpers/db'
import {
  CLIENT_LUCIA,
  CLIENT_MARIA,
  DAY_ONE,
  DAY_TWO,
  SERVICE_MASSAGE,
  SERVICE_REFILL,
  seedFixture,
} from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const conToken = (token: string) =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })

// Due visite, due operatrici, due servizi (uno con la pausa di 3), due date.
const V1 = '50000000-0000-4000-8000-0000000005a1'
const V2 = '50000000-0000-4000-8000-0000000005a2'
const V3 = '50000000-0000-4000-8000-0000000005a3'
const A1 = '60000000-0000-4000-8000-0000000005a1'
const A2 = '60000000-0000-4000-8000-0000000005a2'
const A3 = '60000000-0000-4000-8000-0000000005a3'
const A4 = '60000000-0000-4000-8000-0000000005a4'
let seq = 0
const codice = () => `70000000-0000-4000-8000-5a${String(++seq).padStart(10, '0')}`

async function salva(visita: string, cliente: string, data: string, appuntamenti: unknown[]) {
  const r = await asOperatorCommit(VERA_AUTH, (c) =>
    c
      .query<{ r: { esito: string } }>('select salva_visita($1, $2, $3, null, $4::date, $5, null, null) as r', [
        codice(),
        visita,
        cliente,
        data,
        JSON.stringify(appuntamenti),
      ])
      .then((x) => x.rows[0].r),
  )
  expect(r.esito).toBe('salvata')
}

async function clientDiVera(): Promise<SupabaseClient> {
  return conToken((await sessioneDi(VERA_AUTH)).accessToken)
}

beforeEach(async () => {
  await resetData()
  await seedFixture()
  // Maria: Vera alle 10:00 (Refill, 18 celle), poi Alessandra alle 11:30
  // (Massaggio, 10 celle, pausa 3). Lucia: Alessandra alle 20:30, fuori dai
  // confini del salone (08:00–20:00). Un appuntamento di Vera in un altro
  // giorno, che non deve comparire.
  await salva(V1, CLIENT_MARIA, DAY_ONE, [
    { id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 },
    { id: A2, operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 138, durata: 10 },
  ])
  await salva(V2, CLIENT_LUCIA, DAY_ONE, [
    { id: A3, operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 246, durata: 10 },
  ])
  await salva(V3, CLIENT_LUCIA, DAY_TWO, [
    { id: A4, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 100, durata: 18 },
  ])
})

describe('leggiGiorno', () => {
  it('legge gli appuntamenti del giorno con cliente, servizio e pausa, e solo quelli', async () => {
    const g = await leggiGiorno(await clientDiVera(), DAY_ONE, VERA)
    expect(g.data).toBe(DAY_ONE)
    const per = new Map(g.appuntamenti.map((a) => [a.id, a]))
    expect([...per.keys()].sort()).toEqual([A1, A2, A3].sort())
    expect(per.get(A2)).toEqual({
      id: A2,
      visitaId: V1,
      operatriceId: ALESSANDRA,
      servizioId: SERVICE_MASSAGE,
      servizioNome: 'Massaggio',
      clienteId: CLIENT_MARIA,
      clienteNome: 'Maria Rossi',
      inizio: 138,
      durata: 10,
      pausa: 3,
    })
    expect(per.get(A3)!.clienteNome).toBe('Lucia Ciccarè')
    // ⚠︎ Nessuna versione nella lettura: le versioni vengono solo da stato_visita.
    expect(Object.keys(per.get(A1)!)).not.toContain('versione')
  })

  it('le colonne sono le tre attive nell ordine del salone, con «tu» sulla mia e il colore del database', async () => {
    const g = await leggiGiorno(await clientDiVera(), DAY_ONE, VERA)
    expect(g.operatrici.map((o) => o.id)).toEqual([VERA, ANNALISA, ALESSANDRA])
    expect(g.operatrici.map((o) => o.sonoIo)).toEqual([true, false, false])
    expect(g.operatrici.every((o) => o.attiva)).toBe(true)
    const colori = await asOwner(async (c) =>
      Object.fromEntries((await c.query<{ id: string; color: string }>('select id, color from operator')).rows.map((r) => [r.id, r.color])),
    )
    expect(g.operatrici.map((o) => o.colore)).toEqual([colori[VERA], colori[ANNALISA], colori[ALESSANDRA]])
    // e «tu» segue l'account, non la prima colonna
    const h = await leggiGiorno(await clientDiVera(), DAY_ONE, ALESSANDRA)
    expect(h.operatrici.map((o) => o.sonoIo)).toEqual([false, false, true])
  })

  it('la colonna di una disattivata con appuntamenti resta, e quella senza appuntamenti no', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ALESSANDRA]))
    const g = await leggiGiorno(await clientDiVera(), DAY_ONE, VERA)
    const alessandra = g.operatrici.find((o) => o.id === ALESSANDRA)
    expect(alessandra).toBeDefined()
    expect(alessandra!.attiva).toBe(false)
    expect(g.appuntamenti.filter((a) => a.operatriceId === ALESSANDRA)).toHaveLength(2)
    // la gemella: il 19 marzo Alessandra non ha appuntamenti, e la colonna sparisce
    const h = await leggiGiorno(await clientDiVera(), DAY_TWO, VERA)
    expect(h.operatrici.map((o) => o.id)).toEqual([VERA, ANNALISA])
  })

  it('la finestra parte da salon_settings e si espande sull appuntamento delle 20:30', async () => {
    const g = await leggiGiorno(await clientDiVera(), DAY_ONE, VERA)
    expect(g.finestra).toEqual({ da: 96, a: 258 })
    const h = await leggiGiorno(await clientDiVera(), DAY_TWO, VERA)
    expect(h.finestra).toEqual({ da: 96, a: 240 })
  })

  it('risolve il giorno di ogni colonna con availability_window, chiusure comprese', async () => {
    await asOwner(async (c) => {
      // Vera lavora il giovedì 09:00–13:00; il 12 marzo 2026 è un giovedì.
      await c.query(
        'insert into weekly_availability (operator_id, weekday, start_boundary, end_boundary) values ($1, 3, 108, 156)',
        [VERA],
      )
    })
    const g = await leggiGiorno(await clientDiVera(), DAY_ONE, VERA)
    expect(g.risolti.get(VERA)!.ranges).toEqual([{ startBoundary: 108, endBoundary: 156 }])
    expect(g.risolti.get(VERA)!.dayStatus).toBe('open')
    expect(g.risolti.get(ANNALISA)!.dayStatus).toBe('operator_off')
    expect(g.chiusure).toEqual([])

    await asOwner((c) =>
      c.query("insert into salon_closure (start_date, end_date, reason) values ($1, $1, 'Inventario')", [DAY_ONE]),
    )
    const h = await leggiGiorno(await clientDiVera(), DAY_ONE, VERA)
    expect(h.risolti.get(VERA)!.dayStatus).toBe('salon_closed')
    expect(h.chiusure).toEqual([{ motivo: 'Inventario', da: null, a: null }])
  })

  it('chiama validaDocumentoFinestra: un documento storto non entra nell agenda', async () => {
    // Sonda 8 del piano: il database non produce documenti storti, quindi il
    // collegamento si prova iniettandone uno.
    const vero = await clientDiVera()
    const storto = new Proxy(vero, {
      get(bersaglio, chiave, ricevente) {
        if (chiave === 'rpc') {
          return async () => ({
            data: {
              weekly: [{ operator_id: VERA, weekday: 3, start_boundary: 156, end_boundary: 108 }],
              exceptions: [],
              closures: [],
              occupancy: [],
            },
            error: null,
          })
        }
        return Reflect.get(bersaglio, chiave, ricevente)
      },
    })
    await expect(leggiGiorno(storto, DAY_ONE, VERA)).rejects.toThrow(RangeError)
  })

  it('un errore di PostgREST è un guasto, non un giorno vuoto', async () => {
    const senzaToken = conToken('non-un-token')
    await expect(leggiGiorno(senzaToken, DAY_ONE, VERA)).rejects.toThrow()
  })

  it('la versione di PostgREST NON è quella di app.versione: le due strade non si mescolano', async () => {
    const client = await clientDiVera()
    const daRest = (await client.from('appointment').select('updated_at').eq('id', A1).single()).data!.updated_at
    const daFunzione = (
      (await client.rpc('stato_visita', { p_visita: V1 })).data as {
        appuntamenti: { id: string; versione: string }[]
      }
    ).appuntamenti.find((a) => a.id === A1)!.versione

    // ⚠︎ Questa prova PIANTA una differenza, non verifica una speranza.
    // `app.versione` è `to_char(… 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`: sei cifre di
    // frazione e una Z letterale. PostgREST rende `+00:00`, con gli zeri finali
    // tagliati e la frazione assente quando è zero.
    expect(typeof daRest).toBe('string')
    expect(daRest).not.toBe(daFunzione)
    expect(daFunzione).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)

    // ⚠︎ Se un giorno diventassero UGUALI, la prova diventa rossa ed è un fatto
    // nuovo, non un fastidio: vorrebbe dire che `app.versione` o PostgREST hanno
    // cambiato forma, e la regola «le versioni vengono solo da stato_visita»
    // va rivista invece che assunta. Non si aggiusta in silenzio.
  })
})
