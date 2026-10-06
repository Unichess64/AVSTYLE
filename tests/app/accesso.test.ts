// tests/app/accesso.test.ts
// «Entra» e il guscio, CHIAMATI davvero contro Supabase locale. Revisione del
// Task 3: senza queste prove il guscio poteva smettere di chiamare
// `operatriceCorrente`, ed «Entra» scambiare un guasto per «account non
// attivo» o lasciare la sessione nel telefono, con zero rosse.
//
// `cookies()` di `next/headers` fuori da una richiesta lancia: qui lo
// sostituisce un barattolo in memoria, e `redirect` lancia un errore che dice
// dove andava.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { VERA, asOwner, resetData } from '../helpers/db'
import { seedFixture } from '../helpers/fixtures'
import { PASSWORD_PROVA, preparaAccountLocali } from '../helpers/sessioni'

const barattolo = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [...barattolo].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string, opzioni?: { maxAge?: number }) => {
      if (value === '' || opzioni?.maxAge === 0) barattolo.delete(name)
      else barattolo.set(name, value)
    },
  }),
}))
vi.mock('next/navigation', () => ({
  redirect: (dove: string) => { throw new Error(`REDIRECT ${dove}`) },
  usePathname: () => '/agenda',
}))

const { entra } = await import('../../src/app/accesso/azioni')
const { default: Guscio } = await import('../../src/app/(salone)/layout')
const { esci } = await import('../../src/app/(salone)/azioni')
const { PulsanteEsci, StrisciaInvii } = await import('../../src/cliente/striscia-invii')

const URL = 'http://127.0.0.1:54321'
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const fetchVero = globalThis.fetch
function guasta(pezzo: string) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = typeof input === 'string' ? input : input instanceof globalThis.URL ? input.href : input.url
    if (u.includes(pezzo)) throw new TypeError('fetch failed (guasto finto)')
    return fetchVero(input, init)
  }) as typeof fetch
}

const modulo = (email: string, password = PASSWORD_PROVA) => {
  const f = new FormData()
  f.set('email', email)
  f.set('password', password)
  return f
}
const prima = { errore: null }
const haSessione = () => [...barattolo.keys()].some((k) => k.startsWith('sb-'))

beforeAll(async () => { await preparaAccountLocali() })
beforeEach(async () => {
  await resetData()
  await seedFixture()
  barattolo.clear()
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON
})
afterEach(() => { globalThis.fetch = fetchVero })

describe('«Entra»', () => {
  it('un operatrice attiva entra: va all agenda e la sessione resta', async () => {
    await expect(entra(prima, modulo('vera@example.test'))).rejects.toThrow('REDIRECT /agenda')
    expect(haSessione()).toBe(true)
  })

  it('password sbagliata: «Email o password non corretti.», nessuna sessione', async () => {
    expect(await entra(prima, modulo('vera@example.test', 'sbagliata'))).toEqual({
      errore: 'Email o password non corretti.',
    })
    expect(haSessione()).toBe(false)
  })

  it('un account che non è operatrice: «non è attivo», e la sessione appena aperta non resta', async () => {
    expect(await entra(prima, modulo('outsider@example.test'))).toEqual({
      errore: 'Questo account non è attivo. Chiedi a chi gestisce il salone.',
    })
    expect(haSessione()).toBe(false)
  })

  it('un operatrice disattivata: la stessa frase, e nessuna sessione', async () => {
    await asOwner((c) => c.query('update public.operator set is_active = false where id = $1', [VERA]))
    expect((await entra(prima, modulo('vera@example.test'))).errore).toBe(
      'Questo account non è attivo. Chiedi a chi gestisce il salone.',
    )
    expect(haSessione()).toBe(false)
  })

  it('GoTrue giù: «Il servizio non risponde», mai «password sbagliata»', async () => {
    guasta('/auth/v1/token')
    expect((await entra(prima, modulo('vera@example.test'))).errore).toBe(
      'Il servizio non risponde. Riprova tra qualche istante.',
    )
  })

  it('PostgREST giù dopo il login: «Il servizio non risponde», mai «non è attivo», e nessuna sessione', async () => {
    guasta('/rest/v1/')
    expect((await entra(prima, modulo('vera@example.test'))).errore).toBe(
      'Il servizio non risponde. Riprova tra qualche istante.',
    )
    expect(haSessione()).toBe(false)
  })
})

describe('il guscio chiama davvero operatriceCorrente', () => {
  const accedi = async (email: string) => {
    await expect(entra(prima, modulo(email))).rejects.toThrow('REDIRECT /agenda')
  }

  it('con la sessione di Vera rende il suo nome', async () => {
    await accedi('vera@example.test')
    expect(JSON.stringify(await Guscio({ children: null }))).toContain('"Vera"')
  })

  it('senza sessione rimanda all accesso', async () => {
    await expect(Guscio({ children: null })).rejects.toThrow('REDIRECT /accesso')
  })

  it('monta la striscia degli invii pendenti ed «Esci», firmati con l operator.id di chi è entrata (Task 9)', async () => {
    await accedi('vera@example.test')
    const elementi: { type: unknown; props: Record<string, unknown> }[] = []
    const visita = (n: unknown): void => {
      if (Array.isArray(n)) return n.forEach(visita)
      if (n !== null && typeof n === 'object' && 'props' in n) {
        const e = n as { type: unknown; props: Record<string, unknown> }
        elementi.push(e)
        visita(e.props.children)
      }
    }
    visita(await Guscio({ children: null }))
    expect(elementi.find((e) => e.type === StrisciaInvii)?.props.io).toBe(VERA)
    expect(elementi.find((e) => e.type === PulsanteEsci)?.props).toMatchObject({ io: VERA, esci })
  })

  it('un operatrice disattivata dopo l accesso viene rimandata all accesso (D3-17)', async () => {
    await accedi('vera@example.test')
    await asOwner((c) => c.query('update public.operator set is_active = false where id = $1', [VERA]))
    await expect(Guscio({ children: null })).rejects.toThrow('REDIRECT /accesso')
  })

  it('PostgREST giù: il guscio rilancia il guasto, non rimanda all accesso', async () => {
    await accedi('vera@example.test')
    guasta('/rest/v1/')
    await expect(Guscio({ children: null })).rejects.toSatisfy(
      (e: unknown) => e instanceof Error && !e.message.startsWith('REDIRECT'),
    )
  })
})
