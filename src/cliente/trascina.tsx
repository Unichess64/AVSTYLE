// src/cliente/trascina.tsx
'use client'
//
// Il trascinamento dei blocchi nell'agenda a colonne (spec 3a §5.1, D3-15;
// piano 3a-2 Task 10), e «Annulla». Un involucro client attorno alle colonne,
// che restano componenti senza hook disegnati sul server: i blocchi portano
// `data-visita` e `data-appuntamenti`, e qui si leggono per DELEGA, come fa
// `SchedaDellAgenda` per il tocco.
//
// Il gesto:
//   — pressione lunga di 0,4 s [proposta, da provare su un iPhone vero]; un
//     dito che si muove prima è uno scorrimento, e il gesto non parte;
//   — solo in verticale, a passi di 5 minuti, dentro la finestra disegnata;
//     niente cambio di colonna né di giorno, scorrimento sospeso;
//   — al rilascio un codice d'invio NUOVO, scritto fra gli invii pendenti AL
//     TOCCO (§4.4 punto 3), e il blocco resta nella posizione nuova con
//     «Salvo…»; i 10 s di D3-9 contano dal tocco, anche in fila.
//
// Il blocco si muove con il CSSOM (`el.style.gridRowStart`), non con un
// attributo `style`: la CSP di produzione (`style-src 'self'`) blocca gli
// attributi in linea ma non le proprietà scritte da script. È una scelta
// misurata in `next start` (appendice del Task 10). Lo spostamento resta
// finché il giorno RILETTO non arriva: allora decide la lettura, mai la
// memoria del telefono.
//
// ⚠︎ La decisione di che cosa mostrare non sta qui: è di
// `messaggioDiSpostamento` e `messaggioDiAnnulla`. Qui si esegue soltanto.
//
// Le riletture del giorno passano dal coordinatore della diretta (Task 11),
// che le mette da parte finché questo componente è OCCUPATO: un gesto armato,
// o un blocco con «Salvo…» o «In attesa…». Un blocco col «?» non occupa
// niente: solo lui resta in attesa (§5.1).
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gestoDiAnnulla, messaggioDiAnnulla } from '../dominio/annulla'
import type { Atteso } from '../dominio/attesi'
import { type BloccoAgenda, componiBlocchi } from '../dominio/blocchi'
import { depositoDelTelefono, registraInvio, togliInvio } from '../dominio/invii-pendenti'
import {
  type AppuntamentoDelGesto,
  type Gesto,
  type MessaggioSpostamento,
  type RispostaAlGesto,
  gestoDalBlocco,
  inizioNuovo,
  limitiDelloScarto,
  messaggioDiSpostamento,
  msAllaScadenza,
  nuoveGenerazioni,
  prossimoControlla,
  scartoDalTrascinamento,
} from '../dominio/trascinamento'
import type { RichiestaSpostamento, Risposta } from '../server/scrittura-visita'
import { ApriScheda } from './apri-scheda'
import { useRicariche } from './diretta'
import stile from './agenda.module.css'
import { type RichiesteScheda, UscitaForzata, richiesteVere } from './richieste-scheda'

/** Le Server Actions del gesto: obbligatorie, come quelle della scheda. */
export interface AzioniTrascina {
  sposta(r: RichiestaSpostamento, codice: string): Promise<Risposta>
  annulla(r: RichiestaSpostamento, codice: string): Promise<Risposta>
}

/** [proposta] D3-15: da provare su un iPhone vero (Passo 5). */
export const PRESSIONE_MS = 400
/** Un dito che si muove di più, prima della pressione lunga, sta scorrendo. */
const TOLLERANZA_PX = 8
/** Una cella da cinque minuti: `grid-auto-rows: 7px` in `agenda.module.css`. */
const ALTEZZA_CELLA = 7
/** «Spostata alle 16:15 · Annulla» per 6 s (§5.1). */
const DURATA_MESSAGGIO_MS = 6_000
/** Dopo «L'app è stata aggiornata», il tempo di leggerlo prima che la pagina si ricarichi. */
const RICARICA_MS = 3_000
/** §4.4, vita della scheda: un invio incerto vive al massimo 24 ore, come in `localStorage`. */
const VITA_INVIO_MS = 24 * 60 * 60 * 1000

const SALVO = 'Salvo…'
const IN_FILA = 'In attesa…'
const IN_FILA_PER_ESTESO = 'In attesa del salvataggio precedente'

type TipoInvio = 'sposta' | 'annulla'

/** Come il blocco si discosta dalla lettura disegnata dal server, finché il giorno riletto non arriva. */
interface Scostamento {
  /** La cella d'inizio voluta; `null` = quella disegnata dal server. */
  readonly inizio: number | null
  readonly nascosto: boolean
  readonly etichetta: string | null
  readonly trascinato: boolean
  /** Il blocco aspetta la rilettura del giorno: al suo arrivo lo scostamento si toglie. */
  readonly finoAllaRilettura: boolean
}

interface InvioDelBlocco {
  readonly tipo: TipoInvio
  readonly codice: string
  readonly gesto: Gesto
  /** La chiave del blocco: il suo `data-appuntamenti`. */
  readonly chiave: string
  readonly toccatoIl: number
}

/** Le versioni adottate dopo un ✓, e le posizioni che descrivono. */
interface Adottate {
  readonly visita: string
  readonly attesi: readonly Atteso[]
  readonly posizioni: ReadonlyMap<string, number>
}

/** Un messaggio sotto l'agenda, con «Annulla» se lo spostamento lo offre. */
interface Avviso {
  readonly testo: string
  readonly annulla: { readonly gesto: Gesto; readonly chiave: string } | null
}

interface GestoInCorso {
  readonly pointerId: number
  readonly el: HTMLElement
  readonly chiave: string
  readonly x: number
  readonly y: number
  armato: boolean
  scarto: number
  timer: ReturnType<typeof setTimeout> | undefined
  /** Al momento della pressione lunga: il blocco e la visita come l'agenda li mostra. */
  base: { readonly blocco: BloccoAgenda<AppuntamentoDelGesto>; readonly visti: readonly AppuntamentoDelGesto[] } | null
}

/** Il blocco di quella chiave (`data-appuntamenti`), ricomposto: gli `id` vengono dal DOM, le celle dai dati. */
function bloccoDai(appuntamenti: readonly AppuntamentoDelGesto[], chiave: string): BloccoAgenda<AppuntamentoDelGesto> | null {
  const ids = chiave.split(' ')
  return componiBlocchi(appuntamenti.filter((a) => ids.includes(a.id))).find((b) => b.appuntamenti.length === ids.length) ?? null
}

function esci() {
  // L'account non è più un'operatrice attiva: si va all'accesso (§4.7).
  window.location.assign('/accesso')
}

export function Trascina({
  data,
  appuntamenti,
  finestra,
  azioni,
  io,
  richieste = richiesteVere,
  pressioneMs = PRESSIONE_MS,
  adesso = Date.now,
  children,
}: {
  data: string
  /** Gli appuntamenti del giorno, con i soli identificativi e le celle. */
  appuntamenti: readonly AppuntamentoDelGesto[]
  /** La finestra disegnata: il gesto non ne esce. */
  finestra: { readonly da: number; readonly a: number }
  azioni: AzioniTrascina
  /** L'`operator.id` di chi ha fatto l'accesso: firma gli invii pendenti (§4.4 punto 3). */
  io: string
  richieste?: Pick<RichiesteScheda, 'controlla'>
  /** Solo per le prove. */
  pressioneMs?: number
  /** Solo per le prove: l'orologio del tocco. */
  adesso?: () => number
  children: React.ReactNode
}) {
  const apri = useContext(ApriScheda)
  const ricariche = useRicariche()
  const contenitore = useRef<HTMLDivElement>(null)
  const gesto = useRef<GestoInCorso | null>(null)
  /** Il `click` che segue un gesto non apre la scheda. */
  const sopprimiClick = useRef(false)
  const scostamenti = useRef(new Map<string, Scostamento>())
  const invii = useRef(new Map<string, InvioDelBlocco>())
  const generazioni = useRef(nuoveGenerazioni())
  const timer = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const adottate = useRef(new Map<string, Adottate>())
  /** Gli invii di questa agenda ancora senza risposta: la fila delle Server Actions. */
  const inVolo = useRef(new Set<Promise<unknown>>())
  const [avviso, setAvviso] = useState<Avviso | null>(null)

  // -------------------------------------------------------------------------
  // Il DOM dei blocchi.

  const elemento = (chiave: string) =>
    contenitore.current?.querySelector<HTMLElement>(`[data-appuntamenti="${chiave}"]`) ?? null

  const disegna = (chiave: string) => {
    const el = elemento(chiave)
    if (el === null) return
    const s = scostamenti.current.get(chiave)
    if (s === undefined || s.inizio === null) el.style.removeProperty('grid-row-start')
    else el.style.gridRowStart = String(s.inizio - finestra.da + 1)
    const fuori = s !== undefined && s.inizio !== null && (s.inizio < finestra.da || s.inizio >= finestra.a)
    if (s?.nascosto || fuori) el.style.visibility = 'hidden'
    else el.style.removeProperty('visibility')
    if (s?.etichetta) el.dataset.etichetta = s.etichetta
    else delete el.dataset.etichetta
    if (s?.trascinato) el.dataset.trascinato = ''
    else delete el.dataset.trascinato
  }

  const scosta = (chiave: string, s: Partial<Scostamento>) => {
    const prima = scostamenti.current.get(chiave) ?? { inizio: null, nascosto: false, etichetta: null, trascinato: false, finoAllaRilettura: false }
    scostamenti.current.set(chiave, { ...prima, ...s })
    disegna(chiave)
  }

  const togliScostamento = (chiave: string) => {
    scostamenti.current.delete(chiave)
    disegna(chiave)
  }

  // Un elemento ridisegnato dal server riprende gli scostamenti ancora vivi.
  useLayoutEffect(() => {
    for (const chiave of scostamenti.current.keys()) disegna(chiave)
  })

  // Il giorno RILETTO è arrivato (nuovi appuntamenti dal server): da qui
  // decide la lettura, e gli scostamenti che la aspettavano si tolgono — tranne
  // se il coordinatore dice che è stato chiesto PRIMA dell'ultimo ✓ (§5.1):
  // porta le posizioni di prima, e quella chiesta dopo è per strada.
  const primo = useRef(true)
  useEffect(() => {
    if (primo.current) {
      primo.current = false
      return
    }
    const applica = ricariche.arrivata()
    for (const [chiave, s] of scostamenti.current) {
      // Il blocco che l'operatrice ha in mano resta dov'è: lo decide il
      // rilascio, che rilegge il giorno (revisione del Task 10).
      if (gesto.current?.armato && gesto.current.chiave === chiave) {
        ricariche.rileggi()
        continue
      }
      if (applica && s.finoAllaRilettura) togliScostamento(chiave)
    }
    // Dipende dall'ARRIVO dei dati del server, non da chi li ha chiesti.
  }, [appuntamenti])

  const rileggi = () => ricariche.rileggi()

  // Il coordinatore chiede QUI se il telefono è occupato: lo stato è questo, non una copia.
  useEffect(
    () =>
      ricariche.occupazione(
        () =>
          gesto.current?.armato === true ||
          [...scostamenti.current.values()].some((s) => s.etichetta === SALVO || s.etichetta === IN_FILA),
      ),
    [ricariche],
  )

  useEffect(() => {
    if (avviso === null) return
    const via = setTimeout(() => setAvviso(null), DURATA_MESSAGGIO_MS)
    return () => clearTimeout(via)
  }, [avviso])

  // Alla chiusura dell'agenda i timer si fermano; i codici restano per la striscia.
  useEffect(() => {
    const t = timer.current
    return () => {
      for (const x of t.values()) clearTimeout(x)
    }
  }, [])

  // -------------------------------------------------------------------------
  // Gli invii.

  /** Le versioni da mandare: quelle adottate, se descrivono ancora la visita com'è disegnata. */
  const versioniPer = (g: Gesto): RichiestaSpostamento['versioni'] => {
    const a = adottate.current.get(g.visitaId)
    if (a === undefined || !g.mossi.every((m) => a.posizioni.get(m.id) === m.da)) return null
    return { visita: a.visita, attesi: a.attesi }
  }

  const messaggio = (tipo: TipoInvio, r: RispostaAlGesto, g: Gesto): MessaggioSpostamento =>
    tipo === 'sposta' ? messaggioDiSpostamento(r, g) : { ...messaggioDiAnnulla(r, g), offreAnnulla: false }

  const fermaTimer = (visitaId: string) => {
    clearTimeout(timer.current.get(visitaId))
    timer.current.delete(visitaId)
  }

  /** Ciò che il blocco fa con un messaggio. */
  const esegui = (m: MessaggioSpostamento, invio: InvioDelBlocco) => {
    const { gesto: g, chiave } = invio
    if (m.esciDallApp) return esci()
    if (m.controlla) {
      scosta(chiave, { etichetta: '?' })
      // Col «?» solo questo blocco resta in attesa: le ricariche ripartono.
      ricariche.forseLibero()
      return void controlla(g.visitaId, true, 0)
    }
    fermaTimer(g.visitaId)
    invii.current.delete(g.visitaId)
    if (m.ricaricaLaPagina) {
      // Niente è stato scritto: il blocco torna alla posizione disegnata dal
      // server, che è l'ultima letta, e dopo il messaggio la pagina si
      // ricarica da sola con l'app nuova (revisione del Task 10, B2).
      scosta(chiave, { inizio: null, nascosto: false, etichetta: null, finoAllaRilettura: true })
      setAvviso({ testo: m.testo, annulla: null })
      timer.current.set(g.visitaId, setTimeout(() => window.location.reload(), RICARICA_MS))
      return
    }
    // Dopo ogni ✓ si ADOTTANO le versioni (restituite, o rilette da
    // «Controlla»); dopo ogni altro esito si buttano, e il gesto dopo le fa
    // rileggere al server.
    if (m.spunta && m.adotta !== null) {
      adottate.current.set(g.visitaId, { ...m.adotta, posizioni: new Map(g.dopo.map((x) => [x.id, x.inizio])) })
    } else {
      adottate.current.delete(g.visitaId)
    }
    scosta(chiave, {
      // `nuova`: dove l'ha messa il gesto; `letta`: dove la lettura la trova
      // (`null` = sconosciuta, vale il giorno disegnato finché non arriva quello riletto).
      inizio: m.posizione === 'sparisce' ? null : m.inizio,
      nascosto: m.posizione === 'sparisce',
      etichetta: null,
      finoAllaRilettura: true,
    })
    // Questa posizione l'ha decisa il server ADESSO: un giorno riletto chiesto
    // prima porta quella di prima, e non deve toglierla (§5.1).
    ricariche.spunta()
    if (m.apreLaScheda) {
      apri({ tipo: 'visita', visitaId: g.visitaId, data: g.data, sposta: g.mossi.map((x) => ({ id: x.id, inizio: x.a })) })
    }
    if (m.testo !== '') setAvviso({ testo: m.testo, annulla: m.offreAnnulla ? { gesto: g, chiave } : null })
    if (m.ricaricaIlGiorno) rileggi()
    // Il blocco non dice più «Salvo…»: una ricarica messa da parte può partire.
    ricariche.forseLibero()
  }

  /** «Controlla» sul codice dell'invio del blocco: fuori dalla fila, e fa avanzare la sua generazione. */
  const controlla = async (visitaId: string, automatico: boolean, fatti: number) => {
    const invio = invii.current.get(visitaId)
    if (invio === undefined) return
    fermaTimer(visitaId)
    if (adesso() - invio.toccatoIl > VITA_INVIO_MS) {
      // Il codice può essere già stato ripulito: «Controlla» direbbe «non risulta» di un invio salvato.
      togliInvio(depositoDelTelefono(), invio.codice)
      invii.current.delete(visitaId)
      scosta(invio.chiave, { etichetta: null, inizio: null, finoAllaRilettura: true })
      ricariche.spunta()
      return rileggi()
    }
    const gen = generazioni.current.controlla(visitaId)
    let r: RispostaAlGesto
    try {
      r = await richieste.controlla(invio.codice, visitaId)
    } catch (e) {
      if (e instanceof UscitaForzata) return esci()
      r = { tipo: 'non_so' }
    }
    if (!generazioni.current.corrente(visitaId, gen)) return
    if (r.tipo === 'non_so') {
      // Un «Controlla» fallito non brucia niente: il «?» resta toccabile, e
      // l'app ritenta da sola al massimo tre volte, a distanza crescente.
      const attesa = automatico ? prossimoControlla(fatti) : null
      if (attesa !== null) timer.current.set(visitaId, setTimeout(() => void controlla(visitaId, true, fatti + 1), attesa))
      return
    }
    togliInvio(depositoDelTelefono(), invio.codice)
    esegui(messaggio(invio.tipo, r, invio.gesto), invio)
  }

  /** Un invio del gesto: lo spostamento o «Annulla», ciascuno con il SUO codice. */
  const invia = async (tipo: TipoInvio, g: Gesto, chiave: string, versioni: RichiestaSpostamento['versioni']) => {
    const codice = crypto.randomUUID()
    const toccatoIl = adesso()
    // Un altro invio sulla stessa visita: il suo «Annulla» non farebbe più niente, e sparisce.
    setAvviso((a) => (a?.annulla?.gesto.visitaId === g.visitaId ? null : a))
    const gen = generazioni.current.invia(g.visitaId)
    const invio: InvioDelBlocco = { tipo, codice, gesto: g, chiave, toccatoIl }
    invii.current.set(g.visitaId, invio)
    registraInvio(depositoDelTelefono(), { codice, visitaId: g.visitaId, clienteId: g.cliente, operatriceId: io, invio: tipo, toccatoIl })

    // La fila: dietro un invio appeso questo aspetta, e lo si dice.
    const prima = [...inVolo.current]
    const inFila = prima.length > 0
    scosta(chiave, { inizio: inizioNuovo(g), etichetta: inFila ? IN_FILA : SALVO, finoAllaRilettura: false })
    if (inFila) {
      setAvviso({ testo: IN_FILA_PER_ESTESO, annulla: null })
      void Promise.allSettled(prima).then(() => {
        if (generazioni.current.corrente(g.visitaId, gen) && scostamenti.current.get(chiave)?.etichetta === IN_FILA) {
          scosta(chiave, { etichetta: SALVO })
          setAvviso((a) => (a?.testo === IN_FILA_PER_ESTESO ? null : a))
        }
      })
    }

    // I 10 s contano DAL TOCCO, anche se l'invio parte dopo, in fila.
    fermaTimer(g.visitaId)
    timer.current.set(
      g.visitaId,
      setTimeout(() => {
        if (!generazioni.current.corrente(g.visitaId, gen)) return
        generazioni.current.scaduto(g.visitaId)
        scosta(chiave, { etichetta: '?' })
        ricariche.forseLibero()
        void controlla(g.visitaId, true, 0)
      }, msAllaScadenza(toccatoIl, adesso())),
    )

    const richiesta: RichiestaSpostamento = { visitaId: g.visitaId, data: g.data, mossi: g.mossi, versioni }
    const chiamata = (tipo === 'sposta' ? azioni.sposta : azioni.annulla)(richiesta, codice)
    inVolo.current.add(chiamata)
    let r: RispostaAlGesto
    try {
      r = await chiamata
    } catch (e) {
      // Next solleva così quando l'azione non esiste più dopo un rilascio.
      r = /Server Action/i.test(String((e as Error | null)?.message)) ? { tipo: 'app_aggiornata' } : { tipo: 'non_so' }
    } finally {
      inVolo.current.delete(chiamata)
    }
    // La risposta dell'invio abbandonato dopo «Controlla» si scarta.
    if (!generazioni.current.corrente(g.visitaId, gen)) return
    if (r.tipo !== 'non_so') togliInvio(depositoDelTelefono(), codice)
    esegui(messaggio(tipo, r, g), invio)
  }

  const annulla = () => {
    const a = avviso?.annulla
    // Si spegne al primo tocco.
    setAvviso(null)
    if (a === null || a === undefined || invii.current.has(a.gesto.visitaId)) return
    const v = adottate.current.get(a.gesto.visitaId)
    if (v === undefined) return
    const indietro = gestoDiAnnulla(a.gesto)
    void invia('annulla', indietro, a.chiave, { visita: v.visita, attesi: v.attesi })
  }

  // -------------------------------------------------------------------------
  // Il gesto.

  /**
   * Il gesto è finito. `avvisa`: la ricarica messa da parte durante il gesto
   * può partire. Non quando il rilascio manda un invio: allora la tiene da
   * parte «Salvo…», e parte alla risposta.
   */
  const lascia = (g: GestoInCorso, avvisa = true) => {
    clearTimeout(g.timer)
    gesto.current = null
    if (avvisa) ricariche.forseLibero()
  }

  /** Il blocco torna dove l'agenda lo mostrava prima della pressione lunga. */
  const rimetti = (g: GestoInCorso) =>
    scosta(g.chiave, { trascinato: false, inizio: g.base !== null && g.base.blocco.inizio !== bloccoDai(appuntamenti, g.chiave)?.inizio ? g.base.blocco.inizio : null })

  const finisci = (g: GestoInCorso) => {
    let mosso: Gesto | null = null
    if (g.scarto !== 0 && g.base !== null) {
      try {
        mosso = gestoDalBlocco(g.base.blocco, g.base.visti, data, g.scarto)
      } catch {
        mosso = null
      }
    }
    lascia(g, mosso === null)
    if (mosso === null) return rimetti(g)
    scosta(g.chiave, { trascinato: false })
    void invia('sposta', mosso, g.chiave, versioniPer(mosso))
  }

  /**
   * Gli appuntamenti come l'agenda li MOSTRA: i dati del giorno, con gli
   * scostamenti ancora vivi (un blocco spostato col ✓, prima che arrivi il
   * giorno riletto). Un secondo gesto parte da lì, e le versioni adottate
   * descrivono proprio quelle posizioni.
   */
  const visti = (): AppuntamentoDelGesto[] => {
    const delta = new Map<string, number>()
    for (const [chiave, s] of scostamenti.current) {
      if (s.inizio === null || s.nascosto || s.trascinato) continue
      const b = bloccoDai(appuntamenti, chiave)
      if (b !== null) for (const a of b.appuntamenti) delta.set(a.id, s.inizio - b.inizio)
    }
    return appuntamenti.map((a) => (delta.has(a.id) ? { ...a, inizio: a.inizio + delta.get(a.id)! } : a))
  }

  // Lo scorrimento del giorno resta SOSPESO durante il gesto: serve un
  // ascoltatore non passivo, che React non dà.
  useEffect(() => {
    const el = contenitore.current
    if (el === null) return
    const ferma = (e: Event) => {
      if (gesto.current?.armato) e.preventDefault()
    }
    const menu = (e: Event) => {
      if (gesto.current !== null) e.preventDefault()
    }
    el.addEventListener('touchmove', ferma, { passive: false })
    el.addEventListener('contextmenu', menu)
    return () => {
      el.removeEventListener('touchmove', ferma)
      el.removeEventListener('contextmenu', menu)
    }
  }, [])

  return (
    <div
      ref={contenitore}
      className={stile.trascinabile}
      onPointerDown={(e) => {
        // Un gesto finito senza `click` (il dito si è mosso) non deve mangiare il tocco dopo.
        sopprimiClick.current = false
        if (e.button !== 0 || gesto.current !== null) return
        const el = (e.target as HTMLElement).closest<HTMLElement>('[data-visita][data-appuntamenti]')
        if (el === null) return
        // Un blocco con un invio in corso non si trascina: solo quel blocco resta in attesa.
        if (invii.current.has(el.dataset.visita!)) return
        const g: GestoInCorso = {
          pointerId: e.pointerId,
          el,
          chiave: el.dataset.appuntamenti!,
          x: e.clientX,
          y: e.clientY,
          armato: false,
          scarto: 0,
          timer: undefined,
          base: null,
        }
        g.timer = setTimeout(() => {
          if (gesto.current !== g) return
          const vis = visti()
          const blocco = bloccoDai(vis, g.chiave)
          if (blocco === null) return lascia(g)
          g.base = { blocco, visti: vis }
          g.armato = true
          sopprimiClick.current = true
          try {
            el.setPointerCapture?.(g.pointerId)
          } catch {
            // il puntatore è già andato: il gesto finirà al prossimo rilascio
          }
          scosta(g.chiave, { trascinato: true })
        }, pressioneMs)
        gesto.current = g
      }}
      onPointerMove={(e) => {
        const g = gesto.current
        if (g === null || e.pointerId !== g.pointerId) return
        if (!g.armato) {
          // Prima della pressione lunga il dito che si muove sta scorrendo il giorno.
          if (Math.abs(e.clientX - g.x) > TOLLERANZA_PX || Math.abs(e.clientY - g.y) > TOLLERANZA_PX) lascia(g)
          return
        }
        e.preventDefault()
        // Solo la componente verticale: niente cambio di colonna né di giorno.
        const { blocco } = g.base!
        const scarto = scartoDalTrascinamento(e.clientY - g.y, ALTEZZA_CELLA, limitiDelloScarto(blocco, finestra))
        if (scarto === g.scarto) return
        g.scarto = scarto
        scosta(g.chiave, { inizio: blocco.inizio + scarto })
      }}
      onPointerUp={(e) => {
        const g = gesto.current
        if (g === null || e.pointerId !== g.pointerId) return
        if (!g.armato) return lascia(g)
        // Il rilascio di un gesto non è uno scorrimento di lato: il giorno non cambia.
        e.stopPropagation()
        finisci(g)
      }}
      onPointerCancel={(e) => {
        const g = gesto.current
        if (g === null || e.pointerId !== g.pointerId) return
        lascia(g)
        if (g.armato) rimetti(g)
      }}
      onClickCapture={(e) => {
        // Solo i blocchi: «Annulla» e il resto si toccano sempre.
        const el = (e.target as HTMLElement).closest<HTMLElement>('[data-visita][data-appuntamenti]')
        if (el === null) return
        // Il `click` che segue una pressione lunga non apre la scheda.
        if (sopprimiClick.current) {
          sopprimiClick.current = false
          e.stopPropagation()
          e.preventDefault()
          return
        }
        const invio = invii.current.get(el.dataset.visita!)
        if (invio === undefined) return
        // Un blocco in attesa non apre la scheda; il «?» ripete «Controlla».
        e.stopPropagation()
        e.preventDefault()
        if (scostamenti.current.get(invio.chiave)?.etichetta === '?') void controlla(invio.gesto.visitaId, false, 0)
      }}
    >
      {children}
      {avviso !== null && (
        <p className={stile.esitoGesto} role="status">
          <span>{avviso.testo}</span>
          {avviso.annulla !== null && (
            <>
              {' · '}
              <button type="button" className={stile.annulla} onClick={annulla}>
                Annulla
              </button>
            </>
          )}
        </p>
      )}
    </div>
  )
}
