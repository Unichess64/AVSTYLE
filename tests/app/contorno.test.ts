// tests/app/contorno.test.ts
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { config as configMiddleware, middleware } from '../../src/middleware'
import { CSP } from '../../src/server/csp'

const leggi = (percorso: string) => readFileSync(new URL(`../../${percorso}`, import.meta.url), 'utf8')

describe('il contorno dell applicazione', () => {
  it('fissa Node 22 in .nvmrc e in engines, come la CI', () => {
    expect(leggi('.nvmrc').trim()).toBe('22')
    const pacchetto = JSON.parse(leggi('package.json'))
    // ⚠︎ `toMatch(/22/)` sarebbe soddisfatto da ">=12 <22": si asserisce il
    // pavimento, che è ciò che NODE-PIN vuole.
    // ⚠︎ `toContain('>=22')` accettava anche ">=220" (revisione del Task 1):
    // si asserisce la forma intera.
    expect(pacchetto.engines.node).toBe('>=22 <23')
    // La CI è la fonte: NODE-PIN esiste perché i tre numeri non divergano.
    // ⚠︎ Gli apici sono FACOLTATIVI in YAML e `ci.yml:11` porta oggi
    // `node-version: 22` SENZA apici: un `toContain("node-version: '22'")`
    // — la forma della prima stesura — resterebbe rosso a fine task per un
    // fatto di sintassi, non di versione. Si accettano tutte e due le forme.
    expect(leggi('.github/workflows/ci.yml')).toMatch(/node-version:\s*'?"?22'?"?\s*$/m)
  })

  it('non allarga serverActions.allowedOrigins', () => {
    expect(leggi('next.config.ts')).not.toContain('allowedOrigins')
  })

  it('non registra nessun service worker (spec §4.1)', () => {
    const pacchetto = JSON.parse(leggi('package.json'))
    const dipendenze = { ...pacchetto.dependencies, ...pacchetto.devDependencies }
    expect(Object.keys(dipendenze).filter((n) => /workbox|next-pwa|serwist/.test(n))).toEqual([])
    expect(leggi('src/app/layout.tsx')).not.toContain('serviceWorker')
  })

  it('non nomina mai service_role in nessun file di configurazione', () => {
    for (const f of ['next.config.ts', 'package.json', '.github/workflows/ci.yml']) {
      expect(leggi(f)).not.toContain('service_role')
      expect(leggi(f)).not.toContain('SERVICE_ROLE')
    }
  })

  it('la CSP sta in UN SOLO posto: il middleware', () => {
    // ⚠︎ La prima stesura la scriveva in due posti — `next.config.ts` con un
    // 'nonce-SEGNAPOSTO' e il middleware con il nonce vero — e si prometteva
    // di «misurare quale vince». Se vince il config, il browser riceve
    // 'nonce-SEGNAPOSTO' e BLOCCA OGNI SCRIPT dell'app. Una CSP che si scrive
    // in due posti e vince l'ultima è il modo classico di perderla.
    expect(leggi('next.config.ts')).not.toContain('Content-Security-Policy')
    // Si VALUTA la CSP di produzione, non se ne legge il testo: il ramo di
    // sviluppo porta 'unsafe-eval' e 'unsafe-inline', e un controllo sul testo
    // non distingue i due rami.
    const csp = CSP('NONCE', false)
    expect(csp).toContain("'nonce-NONCE'")
    expect(csp).toContain("'strict-dynamic'")
    expect(csp).not.toContain('unsafe-')
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("form-action 'self'")
  })

  it('le deroghe di next dev stanno solo nel ramo di sviluppo', () => {
    // Controprova del `not.toContain('unsafe-')` qui sopra: senza, quella
    // prova resterebbe verde anche con il parametro ignorato.
    const csp = CSP('NONCE', true)
    expect(csp).toMatch(/script-src [^;]*'unsafe-eval'/)
    expect(csp).toMatch(/style-src 'self' 'unsafe-inline'/)
  })

  it('il middleware manda la CSP con un nonce nuovo a ogni risposta', () => {
    // Le prove sul testo restavano verdi con la riga che la scrive sulla
    // risposta tolta (revisione del Task 1): qui si chiama il middleware.
    const prima = middleware(new NextRequest('http://127.0.0.1:3000/agenda'))
    const seconda = middleware(new NextRequest('http://127.0.0.1:3000/agenda'))
    const csp1 = prima.headers.get('Content-Security-Policy')
    const csp2 = seconda.headers.get('Content-Security-Policy')
    expect(csp1).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]{16,}' 'strict-dynamic'/)
    expect(csp1).not.toBe(csp2)
    // Il nonce arriva anche alla richiesta, che è da dove Next lo legge.
    expect(prima.headers.get('x-middleware-request-x-nonce')).toBeTruthy()
  })

  it('il matcher del middleware copre le pagine e lascia fuori i file statici', () => {
    // Un matcher su nessuna rotta lasciava verdi tutte le prove sul testo.
    const [modello] = configMiddleware.matcher
    const re = new RegExp(`^${modello}$`)
    for (const p of ['/', '/agenda', '/accesso', '/manifest.webmanifest']) expect(p).toMatch(re)
    for (const p of ['/_next/static/x.js', '/favicon.ico', '/logo.svg']) expect(p).not.toMatch(re)
  })

  it('connect-src nomina il progetto, non ogni progetto Supabase del mondo', () => {
    // §4.9 scrive `https://<progetto>.supabase.co`. Un jolly renderebbe ogni
    // progetto Supabase una destinazione ammessa, e §4.9 dichiara che i cookie
    // di sessione sono leggibili da JavaScript: la CSP è la mitigazione
    // dichiarata contro una XSS, e con il jolly perde la metà che conta.
    const prima = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcdefgh.supabase.co'
    try {
      const csp = CSP('NONCE', false)
      expect(csp).toContain("connect-src 'self' https://abcdefgh.supabase.co wss://abcdefgh.supabase.co")
      expect(csp).not.toMatch(/connect-src[^;]*\*/)
    } finally {
      if (prima === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prima
    }
  })

  it('porta le altre intestazioni di §4.9', () => {
    const config = leggi('next.config.ts')
    expect(config).toContain('Referrer-Policy')
    expect(config).toContain('no-referrer')
    expect(config).toContain('X-Content-Type-Options')
    expect(config).toContain('nosniff')
    expect(config).toContain('Strict-Transport-Security')
  })

  it('non spegne lo zoom: axe lo conta come violazione', () => {
    // La regola `meta-viewport` di axe-core segnala un `maximum-scale` sotto 2
    // come «Zooming and scaling must not be disabled». Il Task 12 fa girare axe
    // su ogni schermata: senza questa riga, la prima riga del piano si scopre
    // sbagliata all'ultimo task. D3-3 chiede telefoni in verticale, NON di
    // spegnere lo zoom.
    expect(leggi('src/app/layout.tsx')).not.toContain('maximumScale')
    // ⚠︎ La stessa regola di axe conta anche `user-scalable=no`, e senza questa
    // riga la prova restava verde con lo zoom spento (revisione del Task 1).
    expect(leggi('src/app/layout.tsx')).not.toContain('userScalable')
  })
})
