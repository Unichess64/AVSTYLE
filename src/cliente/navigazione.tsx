// src/cliente/navigazione.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import stile from './navigazione.module.css'

// Quattro voci e nessun «+»: il «+» lo costruisce il 3b, sull'agenda (D3b-13).
const VOCI = [
  { href: '/agenda', etichetta: 'Agenda' },
  { href: '/clienti', etichetta: 'Clienti' },
  { href: '/disponibilita', etichetta: 'Disponibilità' },
  { href: '/impostazioni', etichetta: 'Impostazioni' },
] as const

export function Navigazione() {
  const percorso = usePathname()
  return (
    <nav aria-label="Sezioni" className={stile.barra}>
      {VOCI.map(({ href, etichetta }) => {
        const corrente = percorso === href || percorso.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={corrente ? 'page' : undefined}
            // §6.2: la voce corrente si segna anche senza colore — peso e bordo.
            className={corrente ? `${stile.voce} ${stile.corrente}` : stile.voce}
          >
            {etichetta}
          </Link>
        )
      })}
    </nav>
  )
}
