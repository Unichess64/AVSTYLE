// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Cinzel, Cinzel_Decorative, Manrope } from 'next/font/google'
import './globale.css'

// ⚠︎ Il nonce della CSP Next lo applica ai suoi script solo nel rendering
// dinamico: una pagina prerenderizzata al build esce con script senza nonce, e
// con 'strict-dynamic' il browser li blocca tutti. Il Task 3 renderà dinamiche
// le pagine leggendo i cookie; fino ad allora lo si dice qui.
export const dynamic = 'force-dynamic'

// D3-5: Manrope per l'interfaccia, con le cifre tabulari (§6.1); Cinzel solo
// per titoli e marchio, perché è un carattere da display e a densità d'agenda
// non si legge (spec §9.12).
const manrope = Manrope({ subsets: ['latin'], variable: '--carattere-testo' })
const cinzel = Cinzel({ subsets: ['latin'], weight: ['400', '600'], variable: '--carattere-titolo' })
const cinzelDecorativo = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--carattere-marchio',
})

export const metadata: Metadata = { title: 'AVStyle' }

// D3-3: solo telefoni, in verticale, 375–430 punti.
// ⚠︎ NIENTE scala massima. La prima stesura la fissava a 1, che la regola
// `meta-viewport` di axe-core conta come violazione («Zooming and scaling
// must not be disabled») — e il Task 12 fa girare axe su ogni
// schermata. D3-3 chiede telefoni in verticale, non di spegnere lo zoom: in un
// salone, con le mani occupate, ingrandire è la prima cosa che si fa. Il nome
// della proprietà non si scrive nemmeno qui: la prova del contorno lo cerca.
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function Scheletro({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${manrope.variable} ${cinzel.variable} ${cinzelDecorativo.variable}`}>
      <body>{children}</body>
    </html>
  )
}
