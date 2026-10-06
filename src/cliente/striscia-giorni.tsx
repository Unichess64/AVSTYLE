// src/cliente/striscia-giorni.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { giornoSettimana, sommaGiorni } from '../dominio/tempo'
import stile from './striscia-giorni.module.css'

// La data va nell'indirizzo, ed è l'unica cosa che ci va (§4.8).
const indirizzo = (data: string) => `/agenda?giorno=${data}`

const INIZIALI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

/**
 * La striscia dei giorni (§5.1): due giorni prima e due dopo, e le settimane.
 * Sette bersagli da 44 punti riempiono 375: «Oggi» sta in `TornaAOggi`.
 */
export function StrisciaGiorni({ data, oggi }: { data: string; oggi: string }) {
  const giorni = [-2, -1, 0, 1, 2].map((n) => sommaGiorni(data, n))
  return (
    <nav aria-label="Giorni" className={stile.striscia}>
      <Link href={indirizzo(sommaGiorni(data, -7))} className={stile.salto} aria-label="Settimana prima">
        ‹
      </Link>
      {giorni.map((g) => (
        <Link
          key={g}
          href={indirizzo(g)}
          aria-current={g === data ? 'date' : undefined}
          className={[stile.giorno, g === data ? stile.scelto : '', g === oggi ? stile.oggi : ''].join(' ')}
        >
          <span className={stile.iniziale}>{INIZIALI[giornoSettimana(g)]}</span>
          <span className={stile.numero}>{Number(g.slice(8))}</span>
        </Link>
      ))}
      <Link href={indirizzo(sommaGiorni(data, 7))} className={stile.salto} aria-label="Settimana dopo">
        ›
      </Link>
    </nav>
  )
}

/** «Oggi», nella testata della pagina: solo quando il giorno mostrato è un altro. */
export function TornaAOggi({ data, oggi }: { data: string; oggi: string }) {
  if (data === oggi) return null
  return (
    <Link href={indirizzo(oggi)} className={stile.vaiOggi}>
      Oggi
    </Link>
  )
}

// Un gesto è uno scorrimento di lato se va più in orizzontale che in verticale
// e supera questa distanza: sotto, è un tocco o uno scorrimento verticale.
const SOGLIA = 60

/**
 * Il giorno si cambia scorrendo di lato (§5.1). Con più di tre colonne attive
 * lo scorrimento orizzontale è delle colonne, e il giorno si cambia solo dalla
 * striscia: `attivo` è falso.
 */
export function ScorrimentoGiorno({
  data,
  attivo,
  children,
}: {
  data: string
  attivo: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const partenza = useRef<{ x: number; y: number } | null>(null)
  if (!attivo) return <>{children}</>
  return (
    <div
      className={stile.scorrimento}
      onPointerDown={(e) => {
        partenza.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerCancel={() => {
        partenza.current = null
      }}
      onPointerUp={(e) => {
        const p = partenza.current
        partenza.current = null
        if (p === null) return
        const dx = e.clientX - p.x
        const dy = e.clientY - p.y
        if (Math.abs(dx) < SOGLIA || Math.abs(dx) < 2 * Math.abs(dy)) return
        router.push(indirizzo(sommaGiorni(data, dx < 0 ? 1 : -1)))
      }}
    >
      {children}
    </div>
  )
}
