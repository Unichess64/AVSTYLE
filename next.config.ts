// next.config.ts
import type { NextConfig } from 'next'

// ⚠︎ La CSP NON sta qui. Il nonce di §4.9 cambia a ogni richiesta, quindi la
// CSP la scrive `src/middleware.ts`, in UN SOLO posto. La prima stesura di
// questo piano la scriveva in tutti e due — qui con un 'nonce-SEGNAPOSTO' — e
// rimandava a «misurare quale vince»: se avesse vinto questa, il browser
// avrebbe ricevuto il segnaposto e bloccato ogni script dell'app. Reperto
// bloccante della revisione del 28/09/2026.
//
// Qui restano le tre intestazioni che NON dipendono dalla richiesta.

const config: NextConfig = {
  // Le origini ammesse delle Server Actions NON si allargano (§3.1). Il nome
  // della chiave non si scrive nemmeno in commento: la prova del contorno lo cerca.
  async headers() {
    return [
      {
        source: '/:percorso*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}

export default config
