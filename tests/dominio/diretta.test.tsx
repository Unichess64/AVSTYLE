// @vitest-environment jsdom
//
// tests/dominio/diretta.test.tsx
//
// L'aggiornamento in diretta come componente (spec 3a §4.6, §5.1; piano 3a-2
// Task 11): il canale, i quattro ripieghi (riconnessione, ritorno in primo
// piano, mezzanotte di Perugia, ogni 60 s) e le ricariche messe da parte
// durante un gesto. Il canale è FINTO, iniettato come `richieste` e `adesso`
// negli altri componenti: la ricezione vera, con Supabase, la prova
// `tests/app/diretta.test.ts`. Router di Next finto, orologio finto di Vitest.
//
// Sta in `tests/dominio` perché `npm run test:fuso` la esegua a New York: la
// mezzanotte è quella di Perugia.
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
import { AgendaColonne } from '../../src/cliente/agenda-colonne'
import { type CanaleDiretta, type ClientDiretta, Diretta } from '../../src/cliente/diretta'
import { type AzioniTrascina, Trascina } from '../../src/cliente/trascina'
import type { Giorno } from '../../src/server/lettura-giorno'

const OGGI = '2026-10-08'
const DOMANI = '2026-10-09'
const VERA = '10000000-0000-4000-8000-000000000001'
const MARIA = '40000000-0000-4000-8000-000000000d01'
const V = '50000000-0000-4000-8000-000000000d01'
const A1 = '60000000-0000-4000-8000-000000000d01'
const REFILL = '30000000-0000-4000-8000-000000000001'

type Stato = Parameters<Parameters<CanaleDiretta['subscribe']>[0]>[0]

/** Il client Supabase finto: un canale che la prova comanda. */
function clientFinto() {
  let suAnnuncio: ((m: { new: Record<string, unknown> }) => void) | null = null
  let suStato: ((s: Stato) => void) | null = null
  const ordine: string[] = []
  const canale: CanaleDiretta = {
    on: vi.fn((_tipo, _filtro, cb) => {
      suAnnuncio = cb
      return canale
    }),
    subscribe: vi.fn((cb) => {
      ordine.push('subscribe')
      suStato = cb
      return canale
    }),
  }
  const client = {
    channel: vi.fn(() => canale),
    removeChannel: vi.fn(async () => 'ok'),
    realtime: {
      setAuth: vi.fn(async () => {
        ordine.push('setAuth')
      }),
    },
  } satisfies ClientDiretta
  return {
    client,
    canale,
    ordine,
    manda: (giorni: unknown) => act(() => suAnnuncio!({ new: { id: 1, giorni, creato: '2026-10-08T10:00:00+00' } })),
    stato: (s: Stato) => act(() => suStato!(s)),
  }
}

const avanza = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

function visibile(v: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v })
}

function monta(
  finto = clientFinto(),
  vista: { giorno?: string | null; giorni?: string[]; oggi?: string; esplicito?: boolean } = {},
  figli: React.ReactNode = null,
) {
  const p = { giorno: OGGI, giorni: [vista.giorno ?? OGGI], oggi: OGGI, esplicito: false, ...vista }
  const montata = render(
    <Diretta giorno={p.giorno} giorni={p.giorni} oggi={p.oggi} esplicito={p.esplicito} client={finto.client}>
      {figli}
    </Diretta>,
  )
  return { ...finto, ...montata }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-08T08:00:00Z'))
  visibile('visible')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  router.refresh.mockReset()
  router.replace.mockReset()
})

describe('il canale (D3-12)', () => {
  it('si iscrive agli INSERT di public.annuncio, e solo a quelli, col token chiesto PRIMA', async () => {
    const { client, canale, ordine } = monta()
    await avanza(0)
    // §4.6: con postgres_changes le politiche non valgono per DELETE, e la pulizia non si ascolta.
    expect(canale.on).toHaveBeenCalledWith('postgres_changes', { event: 'INSERT', schema: 'public', table: 'annuncio' }, expect.any(Function))
    expect(client.channel).toHaveBeenCalledTimes(1)
    expect(ordine).toEqual(['setAuth', 'subscribe'])
  })

  it('un annuncio del giorno mostrato rilegge il giorno; uno di un altro giorno no', async () => {
    const { manda } = monta()
    await avanza(0)
    manda([DOMANI])
    expect(router.refresh).not.toHaveBeenCalled()
    manda(['2026-10-07', OGGI])
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })

  it('la settimana: un annuncio che nomina uno dei sette giorni la rilegge', async () => {
    const settimana = ['2026-10-05', '2026-10-06', '2026-10-07', OGGI, DOMANI, '2026-10-10', '2026-10-11']
    const { manda } = monta(undefined, { giorno: null, giorni: settimana })
    await avanza(0)
    manda(['2026-10-12'])
    expect(router.refresh).not.toHaveBeenCalled()
    manda(['2026-10-11'])
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })

  it('un messaggio di forma storta non rilegge e non rompe niente', async () => {
    const { manda } = monta()
    await avanza(0)
    manda(undefined)
    manda(`{${OGGI}}`)
    expect(router.refresh).not.toHaveBeenCalled()
  })

  it('smontata, chiude il suo canale', async () => {
    const { client, canale, unmount } = monta()
    await avanza(0)
    expect(client.removeChannel).not.toHaveBeenCalled()
    unmount()
    expect(client.removeChannel).toHaveBeenCalledWith(canale)
  })

  it('un errore del canale chiede il token rinnovato: un token scaduto chiude il canale (§4.6)', async () => {
    const { client, stato } = monta()
    await avanza(0)
    stato('SUBSCRIBED')
    expect(client.realtime.setAuth).toHaveBeenCalledTimes(1)
    stato('CHANNEL_ERROR')
    expect(client.realtime.setAuth).toHaveBeenCalledTimes(2)
    // senza argomento: il token lo legge la libreria dalla sessione, che è quella rinnovata
    expect(client.realtime.setAuth).toHaveBeenLastCalledWith()
  })
})

describe('i quattro ripieghi (§4.6)', () => {
  it('riconnessione: il canale tornato dopo una caduta rilegge; la prima iscrizione no', async () => {
    const { stato } = monta()
    await avanza(0)
    stato('SUBSCRIBED')
    expect(router.refresh).not.toHaveBeenCalled()
    stato('CHANNEL_ERROR')
    expect(router.refresh).not.toHaveBeenCalled()
    stato('SUBSCRIBED')
    expect(router.refresh).toHaveBeenCalledTimes(1)
    stato('TIMED_OUT')
    stato('SUBSCRIBED')
    expect(router.refresh).toHaveBeenCalledTimes(2)
    stato('CLOSED')
    stato('SUBSCRIBED')
    expect(router.refresh).toHaveBeenCalledTimes(3)
  })

  it('ritorno in primo piano: rilegge e rinnova il token; nascondersi no', async () => {
    const { client } = monta()
    await avanza(0)
    const tokenPrima = client.realtime.setAuth.mock.calls.length
    visibile('hidden')
    fireEvent(document, new Event('visibilitychange'))
    expect(router.refresh).not.toHaveBeenCalled()
    visibile('visible')
    fireEvent(document, new Event('visibilitychange'))
    expect(router.refresh).toHaveBeenCalledTimes(1)
    expect(client.realtime.setAuth.mock.calls.length).toBe(tokenPrima + 1)
  })

  it('pageshow da una pagina ripresa dalla cache rilegge; il primo caricamento no', async () => {
    monta()
    await avanza(0)
    fireEvent(window, Object.assign(new Event('pageshow'), { persisted: false }))
    expect(router.refresh).not.toHaveBeenCalled()
    fireEvent(window, Object.assign(new Event('pageshow'), { persisted: true }))
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })

  it('ogni 60 s in primo piano rilegge; nascosta no', async () => {
    monta()
    await avanza(59_000)
    expect(router.refresh).not.toHaveBeenCalled()
    await avanza(1_000)
    expect(router.refresh).toHaveBeenCalledTimes(1)
    visibile('hidden')
    await avanza(120_000)
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })

  it('alla mezzanotte di Perugia il giorno mostrato diventa quello nuovo, se era «oggi»', async () => {
    // 24 ottobre, 23:59:30 a Perugia (CEST) = 21:59:30Z
    vi.setSystemTime(new Date('2026-10-24T21:59:30Z'))
    monta(undefined, { giorno: '2026-10-24', oggi: '2026-10-24', esplicito: true })
    await avanza(29_000)
    expect(router.replace).not.toHaveBeenCalled()
    await avanza(2_500)
    // prima dei 60 s: è la mezzanotte, non il ripiego dei 60 s
    expect(router.replace).toHaveBeenCalledWith('/agenda?giorno=2026-10-25')
    expect(router.refresh).not.toHaveBeenCalled()
  })

  it('alla mezzanotte, senza ?giorno=, si rilegge: «oggi» lo ricalcola il server', async () => {
    vi.setSystemTime(new Date('2026-10-24T21:59:30Z'))
    monta(undefined, { giorno: '2026-10-24', oggi: '2026-10-24', esplicito: false })
    await avanza(29_000)
    expect(router.refresh).not.toHaveBeenCalled()
    await avanza(2_500)
    expect(router.refresh).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('al ritorno in primo piano «oggi» si ricalcola: nascosta prima della mezzanotte, mostrata dopo', async () => {
    // 28 marzo 2027, 23 ore: nascosta alle 23:00 di Perugia (CEST, 21:00Z)…
    vi.setSystemTime(new Date('2027-03-28T21:00:00Z'))
    monta(undefined, { giorno: '2027-03-28', oggi: '2027-03-28', esplicito: true })
    visibile('hidden')
    fireEvent(document, new Event('visibilitychange'))
    // …e i timer di un telefono in tasca non girano: l'orologio salta.
    vi.setSystemTime(new Date('2027-03-28T22:30:00Z'))
    visibile('visible')
    fireEvent(document, new Event('visibilitychange'))
    expect(router.replace).toHaveBeenCalledWith('/agenda?giorno=2027-03-29')
  })
})

describe('le ricariche messe da parte durante un gesto (§4.6, §5.1)', () => {
  const giorno: Giorno = {
    data: OGGI,
    operatrici: [{ id: VERA, nome: 'Vera', colore: '#C2185B', attiva: true, sonoIo: true }],
    finestra: { da: 96, a: 240 },
    appuntamenti: [
      { id: A1, visitaId: V, operatriceId: VERA, servizioId: REFILL, servizioNome: 'Refill gel', clienteId: MARIA, clienteNome: 'Maria Rossi', inizio: 120, durata: 18, pausa: 3 },
    ],
    risolti: new Map(),
    chiusure: [],
  }
  const azioni: AzioniTrascina = { sposta: vi.fn(() => new Promise<never>(() => {})), annulla: vi.fn(() => new Promise<never>(() => {})) }

  it('un annuncio del giorno con il blocco in mano non rilegge: rilegge al rilascio', async () => {
    const agenda = (
      <Trascina
        data={OGGI}
        appuntamenti={giorno.appuntamenti.map(({ id, visitaId, clienteId, operatriceId, servizioId, inizio, durata, pausa }) => ({ id, visitaId, clienteId, operatriceId, servizioId, inizio, durata, pausa }))}
        finestra={giorno.finestra}
        azioni={azioni}
        io={VERA}
      >
        <AgendaColonne giorno={giorno} oggi={OGGI} lineaDellOra={null} />
      </Trascina>
    )
    const { manda } = monta(undefined, {}, agenda)
    await avanza(0)
    const blocco = document.querySelector<HTMLElement>(`[data-appuntamenti="${A1}"]`)!
    fireEvent.pointerDown(blocco, { pointerId: 7, button: 0, clientX: 50, clientY: 300 })
    await avanza(400)
    manda([OGGI])
    expect(router.refresh).not.toHaveBeenCalled()
    // rilasciato dov'era: nessun invio, e la ricarica messa da parte si applica
    fireEvent.pointerUp(blocco, { pointerId: 7, clientX: 50, clientY: 300 })
    expect(azioni.sposta).not.toHaveBeenCalled()
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })

  it('durante un salvataggio del gesto («Salvo…») si mette da parte; al «?» si applica, perché solo quel blocco resta in attesa', async () => {
    const agenda = (
      <Trascina
        data={OGGI}
        appuntamenti={giorno.appuntamenti.map(({ id, visitaId, clienteId, operatriceId, servizioId, inizio, durata, pausa }) => ({ id, visitaId, clienteId, operatriceId, servizioId, inizio, durata, pausa }))}
        finestra={giorno.finestra}
        azioni={azioni}
        io={VERA}
        richieste={{ controlla: vi.fn(() => new Promise<never>(() => {})) }}
      >
        <AgendaColonne giorno={giorno} oggi={OGGI} lineaDellOra={null} />
      </Trascina>
    )
    const { manda } = monta(undefined, {}, agenda)
    await avanza(0)
    const blocco = document.querySelector<HTMLElement>(`[data-appuntamenti="${A1}"]`)!
    fireEvent.pointerDown(blocco, { pointerId: 8, button: 0, clientX: 50, clientY: 300 })
    await avanza(400)
    fireEvent.pointerMove(blocco, { pointerId: 8, clientX: 50, clientY: 328 })
    fireEvent.pointerUp(blocco, { pointerId: 8, clientX: 50, clientY: 328 })
    await avanza(0)
    expect(blocco.dataset.etichetta).toBe('Salvo…')
    manda([OGGI])
    expect(router.refresh).not.toHaveBeenCalled()
    await avanza(10_000)
    expect(blocco.dataset.etichetta).toBe('?')
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })

  it('la gemella: senza un gesto, lo stesso annuncio rilegge subito', async () => {
    const { manda } = monta(undefined, {}, <AgendaColonne giorno={giorno} oggi={OGGI} lineaDellOra={null} />)
    await avanza(0)
    manda([OGGI])
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })
})

describe('la pagina dell agenda monta la diretta', () => {
  // Il Server Component non si monta qui (legge Supabase): si legge il suo
  // testo. Per la vista del giorno c'è anche il presidio a tempo di
  // esecuzione — `Trascina` e `SchedaDellAgenda` lanciano fuori dalla diretta —;
  // per la settimana c'è solo questo.
  const pagina = readFileSync(new globalThis.URL('../../src/app/(salone)/agenda/page.tsx', import.meta.url), 'utf8')
  const dirette = [...pagina.matchAll(/<Diretta\b[\s\S]*?<\/Diretta>/g)].map((m) => m[0])

  it('attorno alla settimana e attorno al giorno, con scheda e trascinamento dentro', () => {
    expect(dirette).toHaveLength(2)
    expect(dirette.some((d) => d.includes('<VistaSettimana'))).toBe(true)
    expect(dirette.some((d) => d.includes('<SchedaDellAgenda') && d.includes('<Trascina'))).toBe(true)
  })

  it('fuori dalla diretta il trascinamento non si monta: lancia, invece di rileggere da solo in silenzio', () => {
    const errori = vi.spyOn(console, 'error').mockImplementation(() => {})
    const azioni: AzioniTrascina = { sposta: vi.fn(), annulla: vi.fn() }
    expect(() =>
      render(
        <Trascina data={OGGI} appuntamenti={[]} finestra={{ da: 96, a: 240 }} azioni={azioni} io={VERA}>
          {null}
        </Trascina>,
      ),
    ).toThrow(/fuori dalla diretta/)
    errori.mockRestore()
  })
})
