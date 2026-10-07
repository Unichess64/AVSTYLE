// tests/app/diretta.test.ts
//
// La prova di RICEZIONE di §8.2, dal lato del telefono (piano 3a-2 Task 11):
// la funzione vera della diretta (`ascoltaIlGiorno`), un client Supabase vero
// con la sessione vera di un'operatrice, Realtime locale, e una scrittura vera
// che passa dai trigger di `0019_annunci.sql`. Il componente e i ripieghi li
// provano `tests/dominio/diretta.test.tsx` con un canale finto: qui si prova
// soltanto che il contratto del messaggio è quello che il telefono legge — i
// giorni come testo 'YYYY-MM-DD' in `new.giorni` — e che arriva.
import { REALTIME_SUBSCRIBE_STATES, createClient } from '@supabase/supabase-js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { type CanaleDiretta, type ClientDiretta, ascoltaIlGiorno } from '../../src/cliente/diretta'
import { VERA, VERA_AUTH, asOperatorCommit, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, DAY_TWO, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const V1 = '50000000-0000-4000-8000-0000000000e1'
const A1 = '60000000-0000-4000-8000-0000000000e1'
let seq = 0
const cod = () => `70000000-0000-4000-8000-4${String(++seq).padStart(11, '0')}`

const attesa = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Un telefono: un client col token dell'operatrice — dato come `accessToken`,
 * cioè come lo dà al canale il client del browser, che lo rilegge dalla
 * sessione — e la diretta che mostra `mostrati`. Si aspetta l'iscrizione vera
 * prima di scrivere.
 */
async function telefono(accessToken: string, mostrati: string[]) {
  const vero = createClient(URL, ANON, { accessToken: async () => accessToken })
  let iscritto = false
  // Il client vero, con l'iscrizione osservata: la diretta non la espone.
  const client: ClientDiretta = {
    channel: (nome) => {
      const canale = vero.channel(nome) as unknown as CanaleDiretta
      const iscrivi = canale.subscribe.bind(canale)
      canale.subscribe = (cb) =>
        iscrivi((s) => {
          if (s === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) iscritto = true
          cb(s)
        })
      return canale
    },
    removeChannel: (c) => vero.removeChannel(c as never),
    realtime: vero.realtime,
  }
  let riletture = 0
  const chiudi = ascoltaIlGiorno(client, () => mostrati, () => {
    riletture += 1
  })
  const fine = Date.now() + 4000
  while (!iscritto && Date.now() < fine) await attesa(50)
  return {
    iscritto: () => iscritto,
    riletture: () => riletture,
    async aspetta(quante: number, ms = 4000) {
      const limite = Date.now() + ms
      while (riletture < quante && Date.now() < limite) await attesa(50)
      return riletture
    },
    async chiudi() {
      chiudi()
      await vero.removeAllChannels()
    },
  }
}

const crea = (data: string) =>
  asOperatorCommit(VERA_AUTH, async (c) => {
    const r = await c.query<{ r: { visita: string; appuntamenti: unknown[] } }>(
      'select salva_visita($1,$2,$3,null,$4::date,$5,null,null) as r',
      [cod(), V1, CLIENT_MARIA, data, JSON.stringify([{ id: A1, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 120, durata: 12 }])],
    )
    return r.rows[0].r
  })

/**
 * Il riscaldamento di `tests/schema/annunci.test.ts`, copiato: il PRIMO canale
 * su `annuncio` dopo un `db reset` non consegna, anche dopo `SUBSCRIBED`
 * (misurato il 28/09/2026: 0, 1, 1, 1, 1, 1). Dentro un try: se lanciasse, le
 * prove diventerebbero SALTATE e non rosse.
 */
beforeAll(async () => {
  try {
    const sessione = await sessioneDi(VERA_AUTH)
    const client = createClient(URL, ANON, { accessToken: async () => sessione.accessToken })
    const canale = client
      .channel('riscaldamento')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annuncio' }, () => {})
    await new Promise<void>((risolvi) => {
      canale.subscribe((s) => {
        if (s === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED || s === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) risolvi()
      })
      setTimeout(risolvi, 4000)
    })
    await client.removeAllChannels()
  } catch {
    // il canale resta freddo e la prima prova sarà rossa: il guasto rumoroso
  }
}, 20000)

beforeEach(async () => {
  await resetData()
  await seedFixture()
})

describe('la diretta riceve gli annunci (§8.2, D3-12)', () => {
  it('una scrittura sul giorno mostrato fa rileggere quel telefono, e non quello che mostra un altro giorno', async () => {
    const { accessToken } = await sessioneDi(VERA_AUTH)
    const suDayOne = await telefono(accessToken, [DAY_ONE])
    const suDayTwo = await telefono(accessToken, [DAY_TWO])
    expect(suDayOne.iscritto()).toBe(true)
    expect(suDayTwo.iscritto()).toBe(true)
    await crea(DAY_ONE)
    // compagna positiva: lo stesso annuncio arriva, e il telefono giusto rilegge
    expect(await suDayOne.aspetta(1)).toBeGreaterThan(0)
    await attesa(1000)
    expect(suDayTwo.riletture()).toBe(0)
    await suDayOne.chiudi()
    await suDayTwo.chiudi()
  })

  it('uno spostamento a un altro giorno fa rileggere il telefono del giorno VECCHIO e quello del giorno nuovo', async () => {
    const { accessToken } = await sessioneDi(VERA_AUTH)
    const creata = await crea(DAY_ONE)
    const vecchio = await telefono(accessToken, [DAY_ONE])
    const nuovo = await telefono(accessToken, [DAY_TWO])
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
    expect(await vecchio.aspetta(1)).toBeGreaterThan(0)
    expect(await nuovo.aspetta(1)).toBeGreaterThan(0)
    await vecchio.chiudi()
    await nuovo.chiudi()
  })
})
