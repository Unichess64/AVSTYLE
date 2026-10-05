// tests/app/identita.test.ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, type NextResponse } from 'next/server'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { middleware } from '../../src/middleware'
import { NonAutenticata, NonOperatrice, operatriceCorrente } from '../../src/server/supabase'
import { ALESSANDRA, OUTSIDER_AUTH, VERA, VERA_AUTH, asOwner, resetData } from '../helpers/db'
import { seedFixture } from '../helpers/fixtures'
import { type Sessione, preparaAccountLocali, rinnovoRiesce, sessioneDi } from '../helpers/sessioni'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const conToken = (token: string) =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })

beforeAll(async () => { await preparaAccountLocali() })
beforeEach(async () => { await resetData(); await seedFixture() })

describe('chi è chi, §4.2 e §4.4', () => {
  it('un operatrice attiva legge la propria riga e il proprio colore', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    const { data, error } = await conToken(sessione.accessToken)
      .from('operator').select('id, name, color').eq('id', VERA).single()
    expect(error).toBeNull()
    expect(data!.id).toBe(VERA)
    expect(data!.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('un account autenticato che NON è operatrice non legge nessuna operatrice', async () => {
    const sessione = await sessioneDi(OUTSIDER_AUTH)
    const { data } = await conToken(sessione.accessToken).from('operator').select('id')
    expect(data).toEqual([])
  })

  it('un operatrice disattivata mentre la sessione è viva non legge più niente, e il rinnovo fallisce', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    // La disattivazione da proprietario: è la forma di spec §13.4 e di §8.3.
    await asOwner(async (c) => {
      await c.query('update public.operator set is_active = false where id = $1', [VERA])
    })
    const { data } = await conToken(sessione.accessToken).from('client').select('id')
    expect(data).toEqual([])                       // chiusura immediata, D3-17
    expect(await rinnovoRiesce(sessione)).toBe(false)
  })

  it('la gemella positiva: un operatrice che resta attiva legge le clienti e rinnova', async () => {
    const sessione = await sessioneDi(VERA_AUTH)
    await asOwner(async (c) => {
      // un cambio che NON deve chiudere niente (§4.7)
      await c.query('update public.operator set sort_order = 9 where id = $1', [ALESSANDRA])
    })
    const { data } = await conToken(sessione.accessToken).from('client').select('id')
    expect(data!.length).toBeGreaterThan(0)
    expect(await rinnovoRiesce(sessione)).toBe(true)
  })
})

describe('l app legge il database nel modo giusto, non solo il database', () => {
  let sessioneVera: Sessione
  let sessioneOutsider: Sessione
  beforeEach(async () => {
    sessioneVera = await sessioneDi(VERA_AUTH)
    sessioneOutsider = await sessioneDi(OUTSIDER_AUTH)
  })

  it('operatriceCorrente restituisce nome e colore di chi ha la sessione', async () => {
    // ⚠︎ È la prova che il `full_name` della prima stesura avrebbe reso rossa.
    const o = await operatriceCorrente(conToken(sessioneVera.accessToken))
    expect(o.operatorId).toBe(VERA)
    expect(o.authUserId).toBe(VERA_AUTH)
    expect(o.nome).toBe('Vera')
    expect(o.colore).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('operatriceCorrente solleva NonOperatrice per un account che non è operatrice', async () => {
    await expect(operatriceCorrente(conToken(sessioneOutsider.accessToken))).rejects.toThrow(NonOperatrice)
  })

  it('operatriceCorrente solleva NonAutenticata per un operatrice disattivata', async () => {
    // ⚠︎ Il piano si aspettava NonOperatrice. Misurato il 05/10/2026: D3-17
    // chiude la sessione nello stesso istante, e `getUser()` risponde
    // «Auth session missing» (400) prima che si arrivi a leggere `operator`.
    await asOwner(async (c) => {
      await c.query('update public.operator set is_active = false where id = $1', [VERA])
    })
    await expect(operatriceCorrente(conToken(sessioneVera.accessToken))).rejects.toThrow(NonAutenticata)
  })
})

// ---------------------------------------------------------------------------
// Il middleware SI PROVA da Vitest: lo si chiama con una `NextRequest` e si
// legge la risposta, come fa già la prova del contorno. Il piano lo dava per
// impossibile e rimandava le sonde 4, 5 e 8 a Playwright.

/** I cookie che `@supabase/ssr` scriverebbe nel browser per questa sessione. */
async function cookieDi(s: Sessione): Promise<string> {
  const raccolti: { name: string; value: string }[] = []
  const c = createServerClient(URL, ANON, {
    cookies: { getAll: () => [], setAll: (nuovi) => { raccolti.push(...nuovi) } },
  })
  const { error } = await c.auth.setSession({ access_token: s.accessToken, refresh_token: s.refreshToken })
  if (error !== null) throw error
  const vivi = raccolti.filter((k) => k.value !== '')
  // Senza questa riga un montaggio fallito darebbe una richiesta senza cookie,
  // e le prove di «fuori» resterebbero verdi per la ragione sbagliata.
  if (vivi.length === 0) throw new Error('nessun cookie di sessione montato')
  return vivi.map((k) => `${k.name}=${k.value}`).join('; ')
}

const richiesta = (percorso: string, cookie?: string) =>
  new NextRequest(`http://127.0.0.1:3000${percorso}`, cookie === undefined ? {} : { headers: { cookie } })

/** Il middleware ha lasciato passare la richiesta (nessun redirect, nessun 503). */
const passa = (r: NextResponse) => r.status === 200 && r.headers.get('x-middleware-next') === '1'
const versoAccesso = (r: NextResponse) =>
  r.status >= 300 && r.status < 400 && new globalThis.URL(r.headers.get('location')!).pathname === '/accesso'

function intestazioniDiSicurezza(r: NextResponse) {
  expect(r.headers.get('Content-Security-Policy')).toMatch(/'nonce-[A-Za-z0-9+/=]{16,}'/)
  expect(r.headers.get('Cache-Control')).toBe('no-store')
}

describe('il middleware, chiamato davvero (§4.7)', () => {
  const ambiente = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON
  })
  afterEach(() => {
    if (ambiente.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = ambiente.url
    if (ambiente.anon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ambiente.anon
  })

  it('la prima visita, senza cookie, va all accesso: mai un 503', async () => {
    const r = await middleware(richiesta('/agenda'))
    expect(versoAccesso(r)).toBe(true)
    intestazioniDiSicurezza(r)
  })

  it('/accesso è pubblica e porta CSP e no-store', async () => {
    const r = await middleware(richiesta('/accesso'))
    expect(passa(r)).toBe(true)
    intestazioniDiSicurezza(r)
  })

  it('/accessorio NON è pubblica: il prefisso non basta', async () => {
    const r = await middleware(richiesta('/accessorio'))
    expect(versoAccesso(r)).toBe(true)
  })

  it('un operatrice attiva passa, e il nonce arriva anche sulla RICHIESTA', async () => {
    // Gemella positiva delle tre prove di «fuori»: senza, resterebbero verdi
    // con un middleware che butta fuori tutti.
    const r = await middleware(richiesta('/agenda', await cookieDi(await sessioneDi(VERA_AUTH))))
    expect(passa(r)).toBe(true)
    intestazioniDiSicurezza(r)
    const csp = r.headers.get('Content-Security-Policy')!
    const nonce = r.headers.get('x-middleware-request-x-nonce')
    expect(nonce).toBeTruthy()
    expect(csp).toContain(`'nonce-${nonce}'`)
    expect(r.headers.get('x-middleware-request-content-security-policy')).toBe(csp)
  })

  it('un account che non è operatrice va all accesso', async () => {
    const r = await middleware(richiesta('/agenda', await cookieDi(await sessioneDi(OUTSIDER_AUTH))))
    expect(versoAccesso(r)).toBe(true)
    intestazioniDiSicurezza(r)
  })

  it('un operatrice disattivata con la sessione nel telefono va all accesso (D3-17)', async () => {
    const cookie = await cookieDi(await sessioneDi(VERA_AUTH))
    await asOwner(async (c) => {
      await c.query('update public.operator set is_active = false where id = $1', [VERA])
    })
    const r = await middleware(richiesta('/agenda', cookie))
    expect(versoAccesso(r)).toBe(true)
  })

  it('Supabase irraggiungibile: 503 con no-store, mai un redirect che butta fuori', async () => {
    const cookie = await cookieDi(await sessioneDi(VERA_AUTH))
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:1'
    const r = await middleware(richiesta('/agenda', cookie))
    expect(r.status).toBe(503)
    expect(r.headers.get('location')).toBeNull()
    intestazioniDiSicurezza(r)
  })

  it('una CSP mandata nella richiesta non tocca quella della risposta', async () => {
    const r = await middleware(
      new NextRequest('http://127.0.0.1:3000/accesso', { headers: { 'content-security-policy': "default-src *" } }),
    )
    expect(r.headers.get('Content-Security-Policy')).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/)
  })
})

// ---------------------------------------------------------------------------
// Prove statiche sul sorgente, ciascuna con la sua gemella positiva.

function sorgenti(cartella = new globalThis.URL('../../src', import.meta.url).pathname): string[] {
  return readdirSync(cartella).flatMap((n) => {
    const p = join(cartella, n)
    return statSync(p).isDirectory() ? sorgenti(p) : /\.tsx?$/.test(n) ? [p] : []
  })
}
const tutto = () => sorgenti().map((p) => readFileSync(p, 'utf8')).join('\n')

describe('le forme vietate dal design', () => {
  it('nessun getSession() e nessun getClaims() sotto src/ (§4.2)', () => {
    expect(tutto()).not.toMatch(/\bgetSession\s*\(/)
    expect(tutto()).not.toMatch(/\bgetClaims\s*\(/)
    // gemella: la scansione vede davvero i file che chiamano getUser()
    expect(tutto()).toMatch(/\bgetUser\s*\(/)
  })

  it('«Esci» chiude solo questo telefono: nessuno scope global sotto src/ (§3.1)', () => {
    expect(tutto()).not.toMatch(/scope:\s*['"]global['"]/)
    expect(tutto()).toMatch(/signOut\(\{\s*scope:\s*['"]local['"]\s*\}\)/)
  })
})
