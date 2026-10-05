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

// ---------------------------------------------------------------------------
// Guasti finti, revisione del Task 3: senza, nessuna prova attraversava il
// ramo «errore di PostgREST» né il 429, e quattro mutazioni davano 0 rosse.
const fetchVero = globalThis.fetch
const percorsoDi = (input: RequestInfo | URL) =>
  typeof input === 'string' ? input : input instanceof globalThis.URL ? input.href : input.url
/** Fa fallire ogni chiamata il cui indirizzo contiene `pezzo`: con eccezione, o con lo stato dato. */
function guasta(pezzo: string, stato?: number) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (percorsoDi(input).includes(pezzo)) {
      if (stato === undefined) throw new TypeError('fetch failed (guasto finto)')
      return new Response(JSON.stringify({ message: 'finto', code: stato }), {
        status: stato, headers: { 'content-type': 'application/json' },
      })
    }
    return fetchVero(input, init)
  }) as typeof fetch
}
afterEach(() => { globalThis.fetch = fetchVero })

/** Né `NonAutenticata` né `NonOperatrice`: un guasto non dice niente dell'account. */
const eUnGuasto = (e: unknown) => e instanceof Error && !(e instanceof NonAutenticata) && !(e instanceof NonOperatrice)

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

  it('operatriceCorrente: PostgREST giù è un guasto, mai «non operatrice»', async () => {
    guasta('/rest/v1/')
    await expect(operatriceCorrente(conToken(sessioneVera.accessToken))).rejects.toSatisfy(eUnGuasto)
  })

  it('operatriceCorrente: GoTrue giù, o un 429, è un guasto, mai «non autenticata»', async () => {
    guasta('/auth/v1/user')
    await expect(operatriceCorrente(conToken(sessioneVera.accessToken))).rejects.toSatisfy(eUnGuasto)
    guasta('/auth/v1/user', 429)
    await expect(operatriceCorrente(conToken(sessioneVera.accessToken))).rejects.toSatisfy(eUnGuasto)
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

/**
 * I cookie di `cookieDi`, con il token d'accesso dato per scaduto: il
 * middleware lo RINNOVA, e il vecchio refresh token si consuma.
 */
async function cookieScaduto(s: Sessione): Promise<string> {
  const coppie = (await cookieDi(s)).split('; ').map((c) => c.split('=') as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
  const nome = coppie[0][0].replace(/\.\d+$/, '')
  const grezzo = coppie.map(([, v]) => v).join('').replace(/^base64-/, '')
  const sessione = JSON.parse(Buffer.from(grezzo, 'base64url').toString())
  sessione.expires_at = Math.floor(Date.now() / 1000) - 60
  return `${nome}=base64-${Buffer.from(JSON.stringify(sessione)).toString('base64url')}`
}

/** I cookie di sessione che la risposta scrive: `vivi` con un valore, `cancellati` a vuoto o scaduti. */
function cookieDellaRisposta(r: NextResponse) {
  const sessione = r.cookies.getAll().filter((c) => c.name.startsWith('sb-'))
  const cancellato = (c: (typeof sessione)[number]) => c.value === '' || c.maxAge === 0
  return { vivi: sessione.filter((c) => !cancellato(c)), cancellati: sessione.filter(cancellato) }
}

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

  it('PostgREST giù: 503, mai un redirect, e i token appena rinnovati viaggiano sul 503', async () => {
    // Revisione del Task 3: il 503 era una risposta nuova e perdeva i cookie
    // scritti da `setAll` dopo il rinnovo. Misurato che GoTrue riaccetta il
    // vecchio refresh token, quindi non buttava fuori nessuno; ma il telefono
    // restava con un token consumato.
    const cookie = await cookieScaduto(await sessioneDi(VERA_AUTH))
    guasta('/rest/v1/')
    const r = await middleware(richiesta('/agenda', cookie))
    expect(r.status).toBe(503)
    expect(r.headers.get('location')).toBeNull()
    intestazioniDiSicurezza(r)
    expect(cookieDellaRisposta(r).vivi.length).toBeGreaterThan(0)
  })

  it('gemella: con PostgREST su, lo stesso token scaduto passa e porta i cookie rinnovati', async () => {
    const r = await middleware(richiesta('/agenda', await cookieScaduto(await sessioneDi(VERA_AUTH))))
    expect(passa(r)).toBe(true)
    expect(cookieDellaRisposta(r).vivi.length).toBeGreaterThan(0)
  })

  it('un 429 di GoTrue è un guasto: 503, non l uscita', async () => {
    const cookie = await cookieDi(await sessioneDi(VERA_AUTH))
    guasta('/auth/v1/user', 429)
    const r = await middleware(richiesta('/agenda', cookie))
    expect(r.status).toBe(503)
  })

  it('«fuori» esce da QUESTO telefono: il redirect cancella i cookie di sessione (§4.7)', async () => {
    for (const cookie of [
      await cookieDi(await sessioneDi(OUTSIDER_AUTH)),
      await (async () => {
        const c = await cookieDi(await sessioneDi(VERA_AUTH))
        await asOwner((pg) => pg.query('update public.operator set is_active = false where id = $1', [VERA]))
        return c
      })(),
    ]) {
      const r = await middleware(richiesta('/agenda', cookie))
      expect(versoAccesso(r)).toBe(true)
      const { vivi, cancellati } = cookieDellaRisposta(r)
      expect(vivi).toEqual([])
      expect(cancellati.length).toBeGreaterThan(0)
    }
  })

  it('gemella: un operatrice attiva passa senza che nessun cookie venga cancellato', async () => {
    const r = await middleware(richiesta('/agenda', await cookieDi(await sessioneDi(VERA_AUTH))))
    expect(passa(r)).toBe(true)
    expect(cookieDellaRisposta(r).cancellati).toEqual([])
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

  it('«Esci» chiude solo questo telefono: OGNI signOut sotto src/ è local (§3.1)', () => {
    // ⚠︎ Revisione del Task 3: la prima forma cercava UNA occorrenza di
    // `local`, e `signOut()` senza argomento — che in auth-js vale `global` —
    // passava grazie al `local` di un altro file. Ora si contano tutte.
    const chiamate = tutto().match(/\bsignOut\s*\([^)]*\)/g) ?? []
    // gemella: esci, entra e il middleware chiamano signOut
    expect(chiamate.length).toBeGreaterThanOrEqual(3)
    for (const c of chiamate) expect(c).toMatch(/^signOut\(\{\s*scope:\s*['"]local['"]\s*\}\)$/)
  })

  it('il layout radice resta dinamico: /accesso non legge cookie e senza nonce si blocca', () => {
    // Revisione del Task 3: togliendo la riga, `/accesso` diventava statica
    // al build (misurato) e la suite restava verde.
    expect(readFileSync(new globalThis.URL('../../src/app/layout.tsx', import.meta.url), 'utf8'))
      .toMatch(/^export const dynamic = 'force-dynamic'$/m)
  })

  it('la voce corrente della navigazione è annunciata, non solo colorata (§6.2)', () => {
    expect(readFileSync(new globalThis.URL('../../src/cliente/navigazione.tsx', import.meta.url), 'utf8'))
      .toMatch(/aria-current=\{corrente \? 'page' : undefined\}/)
  })
})
