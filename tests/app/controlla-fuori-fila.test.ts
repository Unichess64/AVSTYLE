// tests/app/controlla-fuori-fila.test.ts
//
// La rotta di «Controlla» (`POST /api/controlla`, spec 3a §4.4; piano 3a-2
// Task 9) contro Supabase locale, con la sessione vera di Vera. Si prova il
// CORPO, `rispostaControlla`, che prende il client come argomento: la rotta
// gli passa quello di `clientServer()`, che sotto Vitest non gira.
//
// ⚠︎ DICHIARATO: la prima prova presidia che la rotta esista e risponda mentre
// un invio è appeso, NON che stia fuori dalla fila delle Server Actions. La
// fila è un fatto del client di React e si misura solo da un browser vero
// (§8.3, Task 12).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type pg from 'pg'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apriSchedaSuVisita, serializza, type SchedaSerializzata } from '../../src/dominio/scheda'
import { rispostaControlla } from '../../src/server/controlla-invio'
import { leggiStato } from '../../src/server/lettura-scheda'
import { salvaVisita } from '../../src/server/scrittura-visita'
import { ALESSANDRA, ANNALISA, OUTSIDER_AUTH, VERA, VERA_AUTH, asOwner, connect, resetData } from '../helpers/db'
import { CLIENT_MARIA, DAY_ONE, SERVICE_MASSAGE, SERVICE_REFILL, seedFixture } from '../helpers/fixtures'
import { sessioneDi } from '../helpers/sessioni'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/** Il client di un account, con un `fetch` che la prova può governare. */
const conToken = async (auth: string, dopo?: (url: string, vero: () => Promise<Response>) => Promise<Response>): Promise<SupabaseClient> =>
  createClient(URL, ANON, {
    global: {
      headers: { Authorization: `Bearer ${(await sessioneDi(auth)).accessToken}` },
      ...(dopo ? { fetch: (input: RequestInfo | URL, init?: RequestInit) => dopo(String(input), () => fetch(input, init)) } : {}),
    },
  })
const vera = () => conToken(VERA_AUTH)

/** Una risposta di PostgREST con un SQLSTATE, come la manda per un errore della funzione. */
const conCodice = (code: string) =>
  new Response(JSON.stringify({ code, message: 'finto', details: 'Maria Rossi', hint: null }), {
    status: 500,
    headers: { 'content-type': 'application/json' },
  })

const V1 = '50000000-0000-4000-8000-0000000009a1'
const A1 = '60000000-0000-4000-8000-0000000009a1'
const A2 = '60000000-0000-4000-8000-0000000009a2'

const richiesta = (corpo: unknown, tipo = 'application/json') =>
  new Request('http://localhost/api/controlla', { method: 'POST', headers: { 'content-type': tipo }, body: JSON.stringify(corpo) })

const aperte: pg.Client[] = []
async function connessione(): Promise<pg.Client> {
  const c = await connect()
  aperte.push(c)
  return c
}

async function finché(condizione: () => Promise<boolean>, perché: string): Promise<void> {
  const fine = Date.now() + 5_000
  while (!(await condizione())) {
    if (Date.now() > fine) throw new Error(perché)
    await new Promise((r) => setTimeout(r, 20))
  }
}

/** Quante connessioni stanno aspettando un blocco, adesso. */
const inAttesa = (osservatrice: pg.Client) =>
  osservatrice
    .query<{ n: number }>("select count(*)::int n from pg_stat_activity where wait_event_type = 'Lock' and state = 'active'")
    .then((r) => r.rows[0].n)

async function riaperta(): Promise<SchedaSerializzata> {
  return serializza(apriSchedaSuVisita((await leggiStato(await vera(), V1))!, V1))
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
    visitaId: V1,
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
  vi.restoreAllMocks()
  for (const c of aperte.splice(0)) {
    await c.query('rollback').catch(() => {})
    await c.end().catch(() => {})
  }
})

describe('«Controlla» con un invio in volo (§8.2 prova b)', () => {
  it('«Controlla» risponde mentre un invio è ancora appeso, e al commit dell invio vede salvata', async () => {
    // L'invio registra il codice come PRIMA cosa e poi si ferma sulla riga
    // della visita, che una seconda connessione tiene. «Controlla» con lo
    // stesso codice si mette in coda sulla chiave; quando l'invio committa, lo
    // vede salvato.
    const s = await riaperta()
    const mossa = { ...s, servizi: s.servizi.map((x) => (x.id === A1 ? { ...x, inizio: 122 } : x)) }
    const codice = crypto.randomUUID()
    const avversaria = await connessione()
    const osservatrice = await connessione()
    await avversaria.query('begin')
    await avversaria.query('select 1 from visit where id = $1 for update', [V1])

    const invio = salvaVisita(await vera(), mossa, codice)
    await finché(async () => (await inAttesa(osservatrice)) >= 1, 'l invio non si è mai fermato sulla visita')
    const controlla = rispostaControlla(richiesta({ codice, visitaId: V1 }), await vera())
    await finché(async () => (await inAttesa(osservatrice)) >= 2, '«Controlla» non si è mai messo in coda sul codice')
    await avversaria.query('rollback')

    const r = await controlla
    expect(r.status).toBe(200)
    const corpo = await r.json()
    expect(corpo).toMatchObject({ tipo: 'riga', riga: 2, esito_invio: 'salvata' })
    expect(corpo.stato.appuntamenti.find((a: { id: string }) => a.id === A1).inizio).toBe(122)
    expect(await invio).toMatchObject({ tipo: 'esito', esito: 'salvata' })
  })

  it('«Controlla» PRIMA dell invio lo brucia: riga 1 `annullato`, e l invio poi non scrive', async () => {
    const s = await riaperta()
    const mossa = { ...s, servizi: s.servizi.map((x) => (x.id === A1 ? { ...x, inizio: 122 } : x)) }
    const codice = crypto.randomUUID()
    const r = await rispostaControlla(richiesta({ codice, visitaId: V1 }), await vera())
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ tipo: 'riga', riga: 1, esito_invio: 'annullato' })
    expect(await salvaVisita(await vera(), mossa, codice)).toMatchObject({ tipo: 'esito', esito: 'annullato' })
    expect((await leggiStato(await vera(), V1))!.appuntamenti.find((a) => a.id === A1)!.inizio).toBe(120)
  })
})

describe('C2: un errore di «Controlla» non prova niente sull invio', () => {
  it('la rotta risponde «Non so» a un 55P03, non «riprova a salvare»', async () => {
    // ⚠︎ È LA PROVA CHE ARMA C2 SUL SOGGETTO «controlla» (sonda 11b). 55P03 è
    // l'attesa sulla chiave d'invio oltre `lock_timeout`, misurata dalla prova
    // (c) del Task 7 del piano 3a-1: non è fra i sei con un messaggio proprio,
    // quindi un involucro che applicasse a «Controlla» il criterio di §4.3
    // passo 8 risponderebbe «Non sono riuscita a salvare, riprova».
    const errori = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = await conToken(VERA_AUTH, async (url, vero) => (url.includes('/rpc/controlla_invio') ? conCodice('55P03') : vero()))
    const r = await rispostaControlla(richiesta({ codice: crypto.randomUUID(), visitaId: V1 }), client)
    const corpo = await r.json()
    expect(corpo.tipo).toBe('non_so')
    expect(JSON.stringify(corpo)).not.toContain('riprova')
    expect(JSON.stringify(corpo).toLowerCase()).not.toContain('non risulta')
    // nel log il codice e l'id, mai il `details` della risposta (§4.9)
    expect(errori).toHaveBeenCalledWith('controlla: guasto', { code: '55P03', id: expect.any(String) })
    expect(JSON.stringify(errori.mock.calls)).not.toContain('Maria')
  })

  it('anche la rete e una risposta di forma storta sono «Non so»', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const rete = await conToken(VERA_AUTH, async (url, vero) => {
      if (url.includes('/rpc/controlla_invio')) throw new TypeError('fetch failed')
      return vero()
    })
    expect(await (await rispostaControlla(richiesta({ codice: crypto.randomUUID(), visitaId: V1 }), rete)).json()).toEqual({ tipo: 'non_so' })
    const storta = await conToken(VERA_AUTH, async (url, vero) =>
      url.includes('/rpc/controlla_invio')
        ? new Response(JSON.stringify({ riga: 3, esito_invio: 'salvata', stato: null }), { headers: { 'content-type': 'application/json' } })
        : vero(),
    )
    expect(await (await rispostaControlla(richiesta({ codice: crypto.randomUUID(), visitaId: V1 }), storta)).json()).toEqual({ tipo: 'non_so' })
  })

  it('un 42501 della funzione è l uscita forzata, senza affermazioni sulla visita', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = await conToken(VERA_AUTH, async (url, vero) => (url.includes('/rpc/controlla_invio') ? conCodice('42501') : vero()))
    const r = await rispostaControlla(richiesta({ codice: crypto.randomUUID(), visitaId: V1 }), client)
    expect(r.status).toBe(401)
    expect(await r.json()).toEqual({ tipo: 'uscita_forzata' })
  })
})

describe('la rotta: identità, formato e corpo', () => {
  it('chi non è un operatrice attiva riceve 401 e non brucia niente', async () => {
    const codice = crypto.randomUUID()
    const r = await rispostaControlla(richiesta({ codice, visitaId: V1 }), await conToken(OUTSIDER_AUTH))
    expect(r.status).toBe(401)
    expect(await r.json()).toEqual({ tipo: 'uscita_forzata' })
    const { rows } = await asOwner((c) => c.query<{ n: number }>('select count(*)::int n from invio where codice = $1', [codice]))
    expect(rows[0].n).toBe(0)
  })

  it('solo application/json, e un corpo con due uuid', async () => {
    const codice = crypto.randomUUID()
    expect((await rispostaControlla(richiesta({ codice, visitaId: V1 }, 'text/plain'), await vera())).status).toBe(415)
    for (const corpo of [{ codice }, { codice: 'x', visitaId: V1 }, { codice, visitaId: 7 }, null]) {
      expect((await rispostaControlla(richiesta(corpo), await vera())).status).toBe(400)
    }
  })

  it('la gemella: con un corpo buono risponde, e senza cache', async () => {
    const r = await rispostaControlla(richiesta({ codice: crypto.randomUUID(), visitaId: V1 }), await vera())
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('no-store')
  })
})
