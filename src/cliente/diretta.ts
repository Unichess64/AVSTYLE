// src/cliente/diretta.ts
'use client'
//
// L'aggiornamento in diretta dell'agenda (spec 3a §4.6, D3-12, D3-16; piano
// 3a-2 Task 11). Il telefono ascolta gli INSERT di `public.annuncio`
// (`0019_annunci.sql`), che portano SOLO i giorni toccati, e se uno è fra
// quelli mostrati rilegge la pagina intera: niente aggiornamento incrementale,
// il messaggio non porta altro, ed è voluto.
//
// I quattro ripieghi: alla riconnessione del canale, al ritorno in primo piano
// (`visibilitychange`, `pageshow`), alla mezzanotte di Perugia, e ogni 60 s
// [proposta] in primo piano. Servono davvero: il primo canale dopo un riavvio
// di Realtime non consegna anche dopo `SUBSCRIBED` (misurato il 28/09), e senza
// il servizio i messaggi si perdono in silenzio.
//
// UN SOLO punto decide se rileggere adesso o dopo: il coordinatore qui sotto,
// col modello puro di `src/dominio/ricariche.ts`. Annunci e ripieghi, il ✓ del
// trascinamento e la chiusura della scheda passano tutti da lui. Durante un
// gesto o un salvataggio la ricarica si mette da parte: lo sa CHIEDENDOLO a chi
// ha lo stato (`occupazione`), cioè a `Trascina` (gesto armato, blocco con
// «Salvo…» o «In attesa…») e alla scheda (invio in corso), senza copiarlo.
//
// Il token del canale. Il client del browser (`createBrowserClient`) legge la
// sessione dai cookie, che il middleware rinnova a ogni richiesta; Realtime
// chiede il token alla libreria (il suo `accessToken`, che la rilegge) prima
// di iscriversi, a ogni battito e dopo ogni iscrizione riuscita. Qui lo si
// chiede in più — `realtime.setAuth()` senza argomento, cioè «rileggilo dalla
// sessione» — prima dell'iscrizione, a ogni ritorno in primo piano e a ogni
// errore del canale: un telefono in tasca non batte, e al ritorno il token può
// essere scaduto. Nessuna lettura della sessione qui (§4.2: i due nomi non si
// scrivono sotto `src/`).
//
// LIMITI DICHIARATI (§4.6):
//   — Realtime valuta le politiche all'ingresso nel canale e al cambio di
//     token: un telefono già iscritto il cui account viene chiuso riceve ancora
//     DATE fino al rinnovo, al massimo `jwt_expiry = 3600` s. Sono solo date, ed
//     è la ragione per cui il messaggio non porta altro.
//   — Senza il servizio Realtime i messaggi si perdono in silenzio: la prova di
//     §8.2 (`tests/app/diretta.test.ts`) verifica la RICEZIONE, e i ripieghi
//     coprono il caso entro 60 s.
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { createContext, createElement, useContext, useEffect, useMemo, useRef, useTransition } from 'react'
import {
  type Passo,
  RICARICHE_INIZIALI,
  annuncioRiguarda,
  arrivata,
  cambioDiGiorno,
  chiedi,
  liberato,
  msAllaMezzanotte,
  spunta,
} from '../dominio/ricariche'

// ---------------------------------------------------------------------------
// Il coordinatore delle ricariche.

export interface RicaricheDelTelefono {
  /** Una ricarica: adesso, o messa da parte se il telefono è occupato. */
  rileggi(): void
  /** Chi può tenere occupato il telefono si fa interrogare; la funzione restituita lo toglie, e avvisa. */
  occupazione(occupato: () => boolean): () => void
  /** Chi era occupato avvisa che forse non lo è più: la ricarica messa da parte si applica. */
  forseLibero(): void
  /** Un ✓ (o un esito letto dal server): le riletture in volo adesso sono state chieste prima. */
  spunta(): void
  /** Un giorno riletto è arrivato: `true` se si applica (§5.1). */
  arrivata(): boolean
}

export const Ricariche = createContext<RicaricheDelTelefono | null>(null)

/** Il coordinatore. Fuori dalla diretta non c'è: la pagina che lo dimenticasse si rompe subito, non in silenzio. */
export function useRicariche(): RicaricheDelTelefono {
  const r = useContext(Ricariche)
  if (r === null) throw new Error('fuori dalla diretta: la pagina deve montare <Diretta>')
  return r
}

function useCoordinatore(ricarica: () => void): RicaricheDelTelefono {
  const [, inTransizione] = useTransition()
  const azione = useRef(ricarica)
  azione.current = ricarica
  const stato = useRef(RICARICHE_INIZIALI)
  const occupanti = useRef(new Set<() => boolean>())
  return useMemo(() => {
    const occupato = () => [...occupanti.current].some((f) => f())
    const esegui = (p: Passo) => {
      stato.current = p.stato
      if (p.rileggi) inTransizione(() => azione.current())
    }
    return {
      rileggi: () => esegui(chiedi(stato.current, occupato())),
      occupazione: (f) => {
        occupanti.current.add(f)
        return () => {
          occupanti.current.delete(f)
          esegui(liberato(stato.current, occupato()))
        }
      },
      forseLibero: () => esegui(liberato(stato.current, occupato())),
      spunta: () => {
        stato.current = spunta(stato.current)
      },
      arrivata: () => {
        const p = arrivata(stato.current, occupato())
        esegui(p)
        return p.applica
      },
    }
    // `inTransizione` è stabile; l'azione si legge dal ref.
  }, [])
}

/** Il coordinatore senza canale né ripieghi: rileggere è `router.refresh()`. Per le prove sui componenti. */
export function RicaricheDelGiorno({ children }: { children?: React.ReactNode }) {
  const router = useRouter()
  const ricariche = useCoordinatore(() => router.refresh())
  return createElement(Ricariche.Provider, { value: ricariche }, children)
}

// ---------------------------------------------------------------------------
// Il canale.

/** Gli stati dell'iscrizione, come li dà `@supabase/realtime-js`. */
export type StatoCanale = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR'

/** La parte di un canale Realtime che la diretta usa. */
export interface CanaleDiretta {
  on(
    tipo: 'postgres_changes',
    filtro: { event: 'INSERT'; schema: string; table: string },
    cb: (m: { new: Record<string, unknown> }) => void,
  ): CanaleDiretta
  subscribe(cb: (stato: StatoCanale) => void): CanaleDiretta
}

/** La parte del client Supabase che la diretta usa: il client del browser, o uno finto nelle prove. */
export interface ClientDiretta {
  channel(nome: string): CanaleDiretta
  removeChannel(canale: CanaleDiretta): Promise<unknown>
  realtime: { setAuth(token?: string | null): Promise<void> }
}

/**
 * Solo gli INSERT, e solo `public.annuncio`: con `postgres_changes` le
 * politiche non si applicano ai DELETE (§4.6), e la pulizia degli annunci non
 * si ascolta. La pubblicazione è già limitata agli INSERT (`0019`): il filtro
 * qui non conta sull'altra metà.
 */
const ANNUNCI = { event: 'INSERT', schema: 'public', table: 'annuncio' } as const

/** Il token rinnovato, chiesto alla libreria: un guasto qui lo ritenta il prossimo battito. */
const rinnovaIlToken = (client: ClientDiretta) => client.realtime.setAuth().catch(() => {})

/**
 * Si iscrive agli annunci: chiama `rileggi` quando uno nomina un giorno
 * mostrato e quando il canale torna dopo una caduta (riconnessione). Restituisce
 * la chiusura del canale.
 */
export function ascoltaIlGiorno(client: ClientDiretta, mostrati: () => readonly string[], rileggi: () => void): () => void {
  let chiuso = false
  let caduto = false
  const canale = client.channel('agenda').on('postgres_changes', ANNUNCI, (m) => {
    if (annuncioRiguarda(m.new?.giorni, mostrati())) rileggi()
  })
  // Il token prima dell'iscrizione: chi si iscrive con la sola chiave pubblica
  // non riceve niente (la politica `annuncio_lettura`), e non lo sa.
  void rinnovaIlToken(client).then(() => {
    if (chiuso) return
    canale.subscribe((stato) => {
      if (stato === 'SUBSCRIBED') {
        // Riconnessione: gli annunci mandati mentre il canale era giù sono persi.
        if (caduto) rileggi()
        caduto = false
        return
      }
      caduto = true
      // Un token scaduto chiude il canale: il prossimo tentativo parte con quello rinnovato.
      if (stato === 'CHANNEL_ERROR') void rinnovaIlToken(client)
    })
  })
  return () => {
    chiuso = true
    void client.removeChannel(canale)
  }
}

let delTelefono: ClientDiretta | null = null

/** Il client Supabase del browser: la sessione dai cookie, la sola chiave pubblica (§4.2). */
function clientDelTelefono(): ClientDiretta {
  delTelefono ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  return delTelefono
}

// ---------------------------------------------------------------------------
// La diretta.

/** [proposta] §4.6: il ripiego in primo piano. */
const OGNI_MS = 60_000
/** Oltre la mezzanotte, per leggere già il giorno nuovo. */
const MARGINE_MEZZANOTTE_MS = 1_000

export function Diretta({
  giorno,
  giorni,
  oggi,
  esplicito,
  client,
  children,
}: {
  /** Il giorno della vista del giorno; `null` nella settimana di un'operatrice. */
  giorno: string | null
  /** I giorni mostrati: quello della vista, o i sette della settimana. */
  giorni: readonly string[]
  /** «Oggi» come l'ha calcolato il server disegnando la pagina. */
  oggi: string
  /** L'indirizzo porta `?giorno=`. */
  esplicito: boolean
  /** Solo per le prove: il client Supabase. */
  client?: ClientDiretta
  children?: React.ReactNode
}) {
  const router = useRouter()
  const vista = useRef({ giorno, giorni, oggi, esplicito })
  vista.current = { giorno, giorni, oggi, esplicito }

  // Rileggere: la pagina intera (è un Server Component), oppure il giorno
  // nuovo se la mezzanotte è passata su «oggi».
  const ricariche = useCoordinatore(() => {
    const cambio = cambioDiGiorno(vista.current, new Date())
    if (cambio.tipo === 'vai') router.replace(`/agenda?giorno=${cambio.giorno}`)
    else router.refresh()
  })

  const canale = useRef<ClientDiretta | null>(null)

  useEffect(() => {
    const c = client ?? clientDelTelefono()
    canale.current = c
    return ascoltaIlGiorno(c, () => vista.current.giorni, ricariche.rileggi)
  }, [client, ricariche])

  // Ritorno in primo piano: il token rinnovato e la ricarica, che ricalcola «oggi».
  useEffect(() => {
    const torna = () => {
      if (document.visibilityState !== 'visible') return
      if (canale.current !== null) void rinnovaIlToken(canale.current)
      ricariche.rileggi()
    }
    // `pageshow` anche al primo caricamento: conta solo la pagina ripresa dalla cache.
    const ripresa = (e: PageTransitionEvent) => {
      if (e.persisted) torna()
    }
    document.addEventListener('visibilitychange', torna)
    window.addEventListener('pageshow', ripresa)
    return () => {
      document.removeEventListener('visibilitychange', torna)
      window.removeEventListener('pageshow', ripresa)
    }
  }, [ricariche])

  // Ogni 60 s in primo piano.
  useEffect(() => {
    const ogni = setInterval(() => {
      if (document.visibilityState === 'visible') ricariche.rileggi()
    }, OGNI_MS)
    return () => clearInterval(ogni)
  }, [ricariche])

  // La mezzanotte di Perugia, ricalcolata a ogni giro (i giorni del cambio d'ora durano 23 e 25 ore).
  useEffect(() => {
    let mezzanotte: ReturnType<typeof setTimeout>
    const arma = () => {
      mezzanotte = setTimeout(() => {
        ricariche.rileggi()
        arma()
      }, msAllaMezzanotte(new Date()) + MARGINE_MEZZANOTTE_MS)
    }
    arma()
    return () => clearTimeout(mezzanotte)
  }, [ricariche])

  return createElement(Ricariche.Provider, { value: ricariche }, children)
}
