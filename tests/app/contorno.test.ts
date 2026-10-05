// tests/app/contorno.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const leggi = (percorso: string) => readFileSync(new URL(`../../${percorso}`, import.meta.url), 'utf8')

describe('il contorno dell applicazione', () => {
  it('fissa Node 22 in .nvmrc e in engines, come la CI', () => {
    expect(leggi('.nvmrc').trim()).toBe('22')
    const pacchetto = JSON.parse(leggi('package.json'))
    // ⚠︎ `toMatch(/22/)` sarebbe soddisfatto da ">=12 <22": si asserisce il
    // pavimento, che è ciò che NODE-PIN vuole.
    expect(pacchetto.engines.node).toContain('>=22')
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
    const mw = leggi('src/middleware.ts')
    expect(mw).toContain("'strict-dynamic'")
    expect(mw).not.toContain('unsafe-inline')
    expect(mw).not.toContain('unsafe-eval')
    expect(mw).toContain("frame-ancestors 'none'")
    expect(mw).toContain("base-uri 'none'")
    expect(mw).toContain("object-src 'none'")
    expect(mw).toContain("form-action 'self'")
  })

  it('connect-src nomina il progetto, non ogni progetto Supabase del mondo', () => {
    // §4.9 scrive `https://<progetto>.supabase.co`. Un jolly renderebbe ogni
    // progetto Supabase una destinazione ammessa, e §4.9 dichiara che i cookie
    // di sessione sono leggibili da JavaScript: la CSP è la mitigazione
    // dichiarata contro una XSS, e con il jolly perde la metà che conta.
    const mw = leggi('src/middleware.ts')
    expect(mw).toContain('connect-src')
    expect(mw).not.toMatch(/connect-src[^;]*\*\.supabase\.co/)
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
  })
})
