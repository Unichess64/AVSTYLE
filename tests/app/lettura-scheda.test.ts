// tests/app/lettura-scheda.test.ts
//
// Le letture della scheda visita contro Supabase locale, con la sessione vera
// di Vera: lo stato della visita nelle sue forme vere, l'elenco delle sole
// attive (D2-2), il catalogo, la ricerca e i doppioni in POST (§4.8), e la rotta
// che rifiuta chi non è un'operatrice e solleva su un guasto.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type RispostaApri,
  GuastoLettura,
  cercaClienti,
  doppioniCliente,
  leggiCatalogo,
  leggiRichiesta,
  rispondi,
  rispostaScheda,
} from '../../src/server/lettura-scheda'
import { ALESSANDRA, ANNALISA, OUTSIDER_AUTH, VERA, VERA_AUTH, asOperatorCommit, asOwner, resetData } from '../helpers/db'
import { CLIENT_LUCIA, CLIENT_MARIA, DAY_ONE, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const conToken = (token: string, fetchFinto?: typeof fetch) =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` }, ...(fetchFinto ? { fetch: fetchFinto } : {}) } })

const V1 = '50000000-0000-4000-8000-0000000007a1'
const V2 = '50000000-0000-4000-8000-0000000007a2'
const A1 = '60000000-0000-4000-8000-0000000007a1'
const A2 = '60000000-0000-4000-8000-0000000007a2'
const A3 = '60000000-0000-4000-8000-0000000007a3'
let seq = 0
const codice = () => `70000000-0000-4000-8000-7a${String(++seq).padStart(10, '0')}`

async function salva(visita: string, cliente: string, appuntamenti: unknown[]) {
  const r = await asOperatorCommit(VERA_AUTH, (c) =>
    c
      .query<{ r: { esito: string } }>('select salva_visita($1, $2, $3, null, $4::date, $5, null, null) as r', [
        codice(), visita, cliente, DAY_ONE, JSON.stringify(appuntamenti),
      ])
      .then((x) => x.rows[0].r),
  )
  expect(r.esito).toBe('salvata')
}

const vera = async (): Promise<SupabaseClient> => conToken((await sessioneDi(VERA_AUTH)).accessToken)

const richiesta = (corpo: unknown, tipo = 'application/json') =>
  new Request('http://localhost/api/scheda', { method: 'POST', headers: { 'content-type': tipo }, body: JSON.stringify(corpo) })

beforeEach(async () => {
  await resetData()
  await seedFixture()
  // Vera ha una durata propria sul Refill: 15 celle invece di 18.
  await asOwner((c) => c.query('update operator_service set duration_cells = 15 where operator_id = $1 and service_id = $2', [VERA, SERVICE_REFILL]))
  // Maria: Refill con Annalisa alle 10:00, Massaggio con Alessandra alle 11:30.
  // Lucia: Refill con Vera alle 15:00.
  await salva(V1, CLIENT_MARIA, [
    { id: A2, operatrice: ALESSANDRA, servizio: SERVICE_MASSAGE, inizio: 138, durata: 10 },
    { id: A1, operatrice: ANNALISA, servizio: SERVICE_REFILL, inizio: 120, durata: 18 },
  ])
  await salva(V2, CLIENT_LUCIA, [{ id: A3, operatrice: VERA, servizio: SERVICE_REFILL, inizio: 180, durata: 15 }])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('rispondi: apri', () => {
  it('lo stato ha le forme vere: la versione come testo, la cliente come uuid, celle numeriche', async () => {
    const r = (await rispondi(await vera(), { tipo: 'apri', data: '2026-01-01', visitaId: V1 }, VERA)) as RispostaApri
    expect(r.stato).not.toBeNull()
    expect(typeof r.stato!.visita).toBe('string')
    expect(r.stato!.visita).not.toBe(V1)
    expect(r.stato!.cliente).toBe(CLIENT_MARIA)
    expect(r.stato!.data).toBe(DAY_ONE)
    expect(r.stato!.appuntamenti.map((a) => [a.id, a.inizio, a.durata])).toEqual([[A1, 120, 18], [A2, 138, 10]])
    // il giorno è quello della visita, non quello chiesto
    expect(r.giorno.data).toBe(DAY_ONE)
    expect(r.giorno.appuntamenti.map((a) => a.id).sort()).toEqual([A1, A2, A3].sort())
    expect(r.clienteNome).toBe('Maria Rossi')
  })

  it('l elenco contiene solo le attive, il giorno anche la disattivata con appuntamenti (D2-2)', async () => {
    await asOwner((c) => c.query('update operator set is_active = false where id = $1', [ANNALISA]))
    const r = (await rispondi(await vera(), { tipo: 'apri', data: DAY_ONE, visitaId: V1 }, VERA)) as RispostaApri
    expect(r.attive.map((o) => o.id)).not.toContain(ANNALISA)
    expect(r.attive.map((o) => o.id)).toEqual(expect.arrayContaining([VERA, ALESSANDRA]))
    expect(r.giorno.operatrici).toContainEqual({ id: ANNALISA, nome: 'Annalisa', attiva: false })
    expect(r.stato!.appuntamenti.find((a) => a.id === A1)!.operatrice).toBe(ANNALISA)
  })

  it('una visita che non c è dà stato null, e il giorno chiesto', async () => {
    const r = (await rispondi(await vera(), { tipo: 'apri', data: DAY_ONE, visitaId: '50000000-0000-4000-8000-0000000007ff' }, VERA)) as RispostaApri
    expect(r.stato).toBeNull()
    expect(r.clienteNome).toBeNull()
    expect(r.giorno.data).toBe(DAY_ONE)
  })

  it('il giorno porta le fasce per operatrice in una forma che attraversa JSON', async () => {
    const r = (await rispondi(await vera(), { tipo: 'apri', data: DAY_ONE, visitaId: null }, VERA)) as RispostaApri
    expect(JSON.parse(JSON.stringify(r.giorno))).toEqual(r.giorno)
    expect(Object.keys(r.giorno.risolti)).toEqual(expect.arrayContaining([VERA, ANNALISA, ALESSANDRA]))
    expect(r.giorno.risolti[VERA]).toHaveProperty('dayStatus')
  })
})

describe('leggiCatalogo', () => {
  it('porta durate, pause, categorie e le durate per operatrice, con le nulle', async () => {
    const c = await leggiCatalogo(await vera())
    expect(c.servizi).toEqual([
      { id: SERVICE_REFILL, nome: 'Refill gel', categoria: 'Unghie', durata: 18, pausa: 0, attivo: true },
      { id: SERVICE_MASSAGE, nome: 'Massaggio', categoria: 'Corpo', durata: 10, pausa: 3, attivo: true },
    ])
    expect(c.durateOperatrice).toEqual(
      expect.arrayContaining([
        { operatriceId: VERA, servizioId: SERVICE_REFILL, durata: 15 },
        { operatriceId: ANNALISA, servizioId: SERVICE_REFILL, durata: null },
      ]),
    )
  })
})

describe('ricerca e doppioni, in POST (§4.8, 0021)', () => {
  it('trova una cliente per nome, senza accento e senza maiuscole', async () => {
    expect((await cercaClienti(await vera(), 'ciccare')).map((c) => c.id)).toEqual([CLIENT_LUCIA])
  })

  it('trova una cliente per telefono, con gli spazi', async () => {
    expect(await cercaClienti(await vera(), '333 123 45')).toEqual([{ id: CLIENT_MARIA, nome: 'Maria Rossi', telefono: '+393331234567' }])
  })

  it('un testo vuoto non trova nessuno, e un testo che c è sì: la gemella', async () => {
    expect(await cercaClienti(await vera(), '   ')).toEqual([])
    expect(await cercaClienti(await vera(), 'maria')).toHaveLength(1)
  })

  it('doppioni per stesso telefono e per nome simile, una riga per cliente', async () => {
    const c = await vera()
    expect(await doppioniCliente(c, 'Giulia Bianchi', '+393331234567')).toEqual([
      { id: CLIENT_MARIA, nome: 'Maria Rossi', telefono: '+393331234567', motivo: 'telefono' },
    ])
    expect((await doppioniCliente(c, 'maria rosi', null)).map((d) => [d.id, d.motivo])).toEqual([[CLIENT_MARIA, 'nome']])
    // telefono E nome: una riga sola, e vince il telefono
    expect((await doppioniCliente(c, 'Maria Rossi', '+393331234567')).map((d) => [d.id, d.motivo])).toEqual([
      [CLIENT_MARIA, 'telefono'],
    ])
    expect(await doppioniCliente(c, 'Giulia Bianchi', '+393339999999')).toEqual([])
  })

  it('una cliente trovata per telefono E per nome è una riga sola, in qualunque ordine arrivino', async () => {
    // `union` non garantisce l'ordine: misurato, nel database locale la
    // prova qui sopra passava anche senza la regola, perché la riga del
    // telefono arrivava per ultima.
    const telefono = { id: CLIENT_MARIA, full_name: 'Maria Rossi', phone: '+393331234567', motivo: 'telefono' }
    const nome = { ...telefono, motivo: 'nome' }
    for (const righe of [[telefono, nome], [nome, telefono]]) {
      const finto = { rpc: async () => ({ data: righe, error: null }) } as unknown as SupabaseClient
      expect(await doppioniCliente(finto, 'Maria Rossi', '+393331234567')).toEqual([
        { id: CLIENT_MARIA, nome: 'Maria Rossi', telefono: '+393331234567', motivo: 'telefono' },
      ])
    }
  })

  it('un guasto di PostgREST solleva: non è «nessuna cliente»', async () => {
    const finto = (async () =>
      new Response(JSON.stringify({ code: 'XX000', message: 'guasto' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch
    const c = conToken((await sessioneDi(VERA_AUTH)).accessToken, finto)
    await expect(cercaClienti(c, 'maria')).rejects.toBeInstanceOf(GuastoLettura)
    await expect(doppioniCliente(c, 'maria', null)).rejects.toBeInstanceOf(GuastoLettura)
  })
})

describe('rispostaScheda: la rotta', () => {
  it('risponde a un operatrice attiva', async () => {
    const r = await rispostaScheda(richiesta({ tipo: 'cerca', testo: 'maria' }), await vera())
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect((await r.json()).map((c: { id: string }) => c.id)).toEqual([CLIENT_MARIA])
  })

  it('rifiuta con 401 chi non è un operatrice, prima di leggere', async () => {
    const fuori = conToken((await sessioneDi(OUTSIDER_AUTH)).accessToken)
    const r = await rispostaScheda(richiesta({ tipo: 'cerca', testo: 'maria' }), fuori)
    expect(r.status).toBe(401)
    expect(await r.json()).toEqual({ errore: 'uscita' })
  })

  it('rifiuta un corpo che non è JSON e una richiesta storta', async () => {
    expect((await rispostaScheda(richiesta({ tipo: 'cerca', testo: 'maria' }, 'text/plain'), await vera())).status).toBe(415)
    expect((await rispostaScheda(richiesta({ tipo: 'boh' }), await vera())).status).toBe(400)
  })

  it('un guasto è un 503, e nel log ci sono solo il codice e l id, mai il testo cercato', async () => {
    const vero = fetch
    const finto = (async (u: RequestInfo | URL, i?: RequestInit) =>
      String(u).includes('/rpc/cerca_clienti')
        ? new Response(JSON.stringify({ code: 'XX000', message: 'Maria Rossi', details: 'Maria Rossi' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        : vero(u, i)) as typeof fetch
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await rispostaScheda(richiesta({ tipo: 'cerca', testo: 'Maria Rossi' }), conToken((await sessioneDi(VERA_AUTH)).accessToken, finto))
    expect(r.status).toBe(503)
    expect(log).toHaveBeenCalledTimes(1)
    const [, dati] = log.mock.calls[0]
    expect(Object.keys(dati as object).sort()).toEqual(['code', 'id'])
    expect((dati as { code: string }).code).toBe('XX000')
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Maria/)
    expect(JSON.stringify(await r.json())).not.toMatch(/Maria/)
  })
})

describe('leggiRichiesta', () => {
  it('accetta le quattro forme e rifiuta quelle storte', () => {
    expect(leggiRichiesta({ tipo: 'apri', data: '2026-10-08', visitaId: null })).toEqual({ tipo: 'apri', data: '2026-10-08', visitaId: null })
    expect(leggiRichiesta({ tipo: 'apri', data: '2026-10-08', visitaId: V1 })).toMatchObject({ visitaId: V1 })
    expect(leggiRichiesta({ tipo: 'giorno', data: '2026-02-31' })).toBeNull()
    expect(leggiRichiesta({ tipo: 'apri', data: '2026-10-08', visitaId: 'x' })).toBeNull()
    expect(leggiRichiesta({ tipo: 'apri', data: '2026-10-08' })).toBeNull()
    expect(leggiRichiesta({ tipo: 'cerca', testo: 'x'.repeat(121) })).toBeNull()
    expect(leggiRichiesta({ tipo: 'cerca', testo: 3 })).toBeNull()
    expect(leggiRichiesta({ tipo: 'doppioni', nome: 'Maria', telefono: null })).toEqual({ tipo: 'doppioni', nome: 'Maria', telefono: null })
    expect(leggiRichiesta({ tipo: 'doppioni', nome: 'Maria' })).toBeNull()
    expect(leggiRichiesta(null)).toBeNull()
  })
})
