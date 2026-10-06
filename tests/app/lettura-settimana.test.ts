// tests/app/lettura-settimana.test.ts
//
// La settimana di un'operatrice contro Supabase locale, con la sessione vera
// di Vera (spec 3a §5.3). Il 12 marzo 2026 è un giovedì: la settimana va dal 9
// al 15.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it } from 'vitest'
import { leggiOperatriciAttive, leggiSettimana } from '../../src/server/lettura-settimana'
import { ALESSANDRA, ANNALISA, VERA, VERA_AUTH, asOperatorCommit, asOwner, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const conToken = (token: string) =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })

const LUNEDI = '2026-03-09'
let seq = 0
const id = (p: string) => `${p}0000000-0000-4000-8000-6b${String(++seq).padStart(10, '0')}`

async function salva(cliente: string, data: string, appuntamenti: { operatrice: string; servizio: string; inizio: number; durata: number }[]) {
  const r = await asOperatorCommit(VERA_AUTH, (c) =>
    c
      .query<{ r: { esito: string } }>('select salva_visita($1, $2, $3, null, $4::date, $5, null, null) as r', [
        id('7'),
        id('5'),
        cliente,
        data,
        JSON.stringify(appuntamenti.map((a) => ({ id: id('6'), ...a }))),
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
  // Lunedì 9: Vera alle 10:00 Refill (18) + Massaggio contiguo (pausa del
  // Refill compresa) — un blocco solo — e Alessandra alle 10:00.
  const pausaRefill = await asOwner(async (c) =>
    (await c.query<{ b: number }>('select buffer_after_cells as b from service where id = $1', [SERVICE_REFILL])).rows[0].b,
  )
  await salva(CLIENT_MARIA, LUNEDI, [
    { operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 },
    { operatrice: VERA, servizio: SERVICE_MASSAGE, inizio: 138 + pausaRefill, durata: 10 },
  ])
  await salva(CLIENT_LUCIA, LUNEDI, [{ operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 120, durata: 10 }])
  // Domenica 15 alle 16:00 e alle 09:00, inserite in quest'ordine.
  await salva(CLIENT_LUCIA, '2026-03-15', [{ operatrice: VERA, servizio: SERVICE_MASSAGE, inizio: 192, durata: 10 }])
  await salva(CLIENT_MARIA, '2026-03-15', [{ operatrice: VERA, servizio: SERVICE_MASSAGE, inizio: 108, durata: 10 }])
  // Fuori settimana, uno per lato: non devono comparire.
  await salva(CLIENT_MARIA, '2026-03-08', [{ operatrice: VERA, servizio: SERVICE_MASSAGE, inizio: 100, durata: 10 }])
  await salva(CLIENT_LUCIA, '2026-03-16', [{ operatrice: VERA, servizio: SERVICE_MASSAGE, inizio: 100, durata: 10 }])
})

describe('leggiSettimana', () => {
  it('sette giorni dell operatrice scelta, le sole ore d inizio, e niente fuori settimana', async () => {
    const s = await leggiSettimana(await clientDiVera(), VERA, LUNEDI)
    expect(s.operatriceId).toBe(VERA)
    expect(s.lunedi).toBe(LUNEDI)
    expect(s.giorni.map((g) => g.data)).toEqual([
      '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15',
    ])
    expect(s.giorni.map((g) => g.inizi)).toEqual([[120], [], [], [], [], [], [108, 192]])
  })

  it('la settimana di un altra operatrice è sua: Alessandra il lunedì, niente la domenica', async () => {
    const s = await leggiSettimana(await clientDiVera(), ALESSANDRA, LUNEDI)
    expect(s.giorni.map((g) => g.inizi)).toEqual([[120], [], [], [], [], [], []])
  })

  it('una settimana senza appuntamenti ha sette giorni vuoti', async () => {
    const s = await leggiSettimana(await clientDiVera(), ANNALISA, LUNEDI)
    expect(s.giorni).toHaveLength(7)
    expect(s.giorni.every((g) => g.inizi.length === 0)).toBe(true)
  })

  it('rifiuta un lunedì che non è un lunedì, o una data impossibile', async () => {
    const client = await clientDiVera()
    await expect(leggiSettimana(client, VERA, '2026-03-10')).rejects.toThrow(RangeError)
    await expect(leggiSettimana(client, VERA, '2026-02-30')).rejects.toThrow(RangeError)
  })

  it('un errore di PostgREST è un guasto, non una settimana vuota', async () => {
    await expect(leggiSettimana(conToken('non-un-token'), VERA, LUNEDI)).rejects.toThrow()
  })
})

describe('leggiOperatriciAttive', () => {
  it('le attive, nell ordine del salone, e non le disattivate', async () => {
    const client = await clientDiVera()
    expect((await leggiOperatriciAttive(client)).map((o) => o.id)).toEqual([VERA, ANNALISA, ALESSANDRA])
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const attive = await leggiOperatriciAttive(client)
    expect(attive.map((o) => o.id)).toEqual([VERA, ALESSANDRA])
    expect(attive[0]).toEqual({ id: VERA, nome: expect.any(String), colore: expect.stringMatching(/^#/) })
  })

  it('un errore di PostgREST è un guasto, non un elenco vuoto', async () => {
    await expect(leggiOperatriciAttive(conToken('non-un-token'))).rejects.toThrow()
  })
})
