// src/cliente/apri-scheda.tsx
'use client'
//
// Apre la scheda visita dall'agenda (spec §9.4: «tapping a block or an empty
// cell»), con la DELEGA degli eventi: colonne e lista restano componenti senza
// hook disegnati sul server, e portano solo attributi `data-…`. Chi li tocca
// qui legge l'attributo e decide con `aperturaDalTocco`, che è pura.
//
// ⚠︎ Nessun parametro nuovo nell'indirizzo (§4.8, `PARAMETRI_AMMESSI`): la
// scheda è uno stato del telefono, e la bozza vive solo in memoria (§4.9).
//
// «Indietro» con la scheda aperta CHIUDE la scheda e resta sul giorno:
// all'apertura si aggiunge una voce di cronologia sullo STESSO indirizzo, e il
// `popstate` che la toglie chiude la scheda. «Chiudi» fa lo stesso passando da
// `history.back()`, così la voce non resta orfana.
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type Apertura, type Tocco, aperturaDalTocco } from '../dominio/apertura'
import type { RichiesteScheda } from './richieste-scheda'
import { type AzioniScheda, SchedaVisita } from './scheda-visita'
import stile from './scheda-visita.module.css'

/** Il segno della voce di cronologia della scheda. */
const VOCE = { schedaAperta: true }

/** Dall'elemento toccato al tocco: il blocco o la riga, altrimenti lo spazio di una colonna. */
export function toccoDa(el: HTMLElement, clientY: number): Tocco | null {
  const bersaglio = el.closest<HTMLElement>('[data-visita],[data-colonna]')
  if (bersaglio === null) return null
  const d = bersaglio.dataset
  if (d.visita !== undefined) return { visita: d.visita }
  const r = bersaglio.getBoundingClientRect()
  return {
    colonna: d.colonna,
    y: clientY - r.top,
    altezza: r.height,
    finestra: { da: Number(d.da), a: Number(d.a) },
  }
}

export function SchedaDellAgenda({
  data,
  occupati,
  children,
  richieste,
  azioni,
}: {
  data: string
  /** Gli appuntamenti del giorno, per l'orario di §5.1 su uno spazio libero. */
  occupati: readonly { readonly operatriceId: string; readonly inizio: number; readonly durata: number }[]
  children: React.ReactNode
  richieste?: RichiesteScheda
  /** Le Server Actions di scrittura: obbligatorie, così la pagina non può dimenticarle. */
  azioni: AzioniScheda
}) {
  const router = useRouter()
  const [apertura, setApertura] = useState<Apertura | null>(null)
  // L'esito di un invio che ha chiuso la scheda («✓ Salvata», «Era già stata cancellata»…).
  const [esito, setEsito] = useState<string | null>(null)

  useEffect(() => {
    if (esito === null) return
    const via = setTimeout(() => setEsito(null), 4000)
    return () => clearTimeout(via)
  }, [esito])

  // Il giorno si rilegge DOPO il `popstate` che chiude la scheda, non subito:
  // al `popstate` il router di Next ripristina l'albero in cache di quella
  // voce, e una rilettura chiesta prima ci finisce sotto (misurato in
  // `next start`: visita salvata, agenda vecchia).
  const daRileggere = useRef(false)
  useEffect(() => {
    const chiudi = () => {
      setApertura(null)
      if (!daRileggere.current) return
      daRileggere.current = false
      setTimeout(() => router.refresh(), 0)
    }
    window.addEventListener('popstate', chiudi)
    return () => window.removeEventListener('popstate', chiudi)
  }, [router])

  const apri = useCallback((a: Apertura) => {
    window.history.pushState(VOCE, '')
    setApertura(a)
  }, [])

  const tocca = (el: HTMLElement, clientY: number) => {
    if (apertura !== null) return
    const t = toccoDa(el, clientY)
    const a = t === null ? null : aperturaDalTocco(t, data, occupati)
    if (a !== null) apri(a)
  }

  return (
    <div
      onClick={(e) => tocca(e.target as HTMLElement, e.clientY)}
      onKeyDown={(e) => {
        // Blocchi e righe sono focalizzabili: Invio o spazio li aprono.
        const el = e.target as HTMLElement
        if ((e.key === 'Enter' || e.key === ' ') && el.dataset.visita !== undefined) {
          e.preventDefault()
          tocca(el, 0)
        }
      }}
    >
      {children}
      {esito !== null && (
        <p className={stile.esitoAgenda} role="status">
          {esito}
        </p>
      )}
      {apertura !== null && (
        <SchedaVisita
          apertura={apertura}
          richieste={richieste}
          azioni={azioni}
          onChiudi={() => window.history.back()}
          onFatto={(testo) => {
            // La scheda si chiude come con «Chiudi», e il giorno si rilegge
            // dal server: il blocco nuovo, spostato o tolto compare subito.
            setEsito(testo === '' ? null : testo)
            daRileggere.current = true
            window.history.back()
          }}
          onVaiA={(appuntamentoId, giorno) => {
            if (giorno !== data) {
              // Un altro giorno: la voce della scheda DIVENTA quel giorno.
              // `back()` seguito da `push` non ci arrivava: il `popstate` del
              // ritorno scarta la navigazione ancora in corso (misurato in
              // `next start`, revisione del Task 7, C3). «Indietro» poi torna
              // al giorno di partenza.
              setApertura(null)
              router.replace(`/agenda?giorno=${giorno}`)
              return
            }
            window.history.back()
            // Il blocco o la riga visibile che contiene quell'appuntamento.
            requestAnimationFrame(() => {
              const visibile = [...document.querySelectorAll<HTMLElement>('[data-appuntamenti]')].find(
                (el) => el.dataset.appuntamenti!.split(' ').includes(appuntamentoId) && el.offsetParent !== null,
              )
              visibile?.scrollIntoView({ block: 'center' })
              visibile?.focus()
            })
          }}
        />
      )}
    </div>
  )
}
