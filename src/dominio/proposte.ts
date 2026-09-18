// La proposta degli orari d'inizio. Spec §7.3 e §7.4.

import type { Blocco, Fascia, IndiceCella, MotivoAssenza, StatoGiorno } from './tipi'

/**
 * Il contratto di spec §7.4, alla lettera. I nomi dei campi sono congelati
 * dalla spec e restano in inglese.
 *
 * `occupancy` porta BLOCCHI e non celle nude, perché la regola del riassetto
 * (§7.3) ha bisogno della pausa dell'appuntamento che PRECEDE.
 *
 * `excludeAppointmentIds` è una LISTA, perché §8.6 sposta una visita intera:
 * con un solo identificativo, gli altri appuntamenti della visita continuano a
 * leggersi come occupati e lo spostamento non viene nemmeno proposto.
 *
 * `nowCell` è nullo tranne quando `date` è oggi. La funzione non legge
 * l'orologio: l'ora entra come argomento e la funzione resta pura.
 *
 * `dayStatus` va passato dentro perché §7.1 ha già ridotto «salone chiuso» e
 * «operatrice assente» alla stessa lista vuota: la distinzione non si recupera.
 *
 * `date` è nel contratto e questa funzione NON lo legge (D2-12): resta perché
 * il contratto di §7.4 è congelato, ed è `cercaPosti` a riattaccare la data ai
 * risultati. Non toglierlo credendo di ripulire.
 */
export interface IngressoProposta {
  readonly date: string
  readonly ranges: readonly Fascia[]
  readonly occupancy: readonly Blocco[]
  readonly durations: readonly number[]
  readonly buffers: readonly number[]
  readonly nowCell: IndiceCella | null
  readonly excludeAppointmentIds: readonly string[]
  readonly dayStatus: StatoGiorno
}

export interface EsitoProposta {
  readonly starts: IndiceCella[]
  /** `null` quando `starts` non è vuoto (D2-2). */
  readonly reason: MotivoAssenza | null
}

export function proposeStarts(ingresso: IngressoProposta): EsitoProposta {
  if (ingresso.durations.length === 0 || ingresso.durations.length !== ingresso.buffers.length) {
    throw new RangeError(
      `durations e buffers devono avere la stessa lunghezza, non vuota: ${ingresso.durations.length} e ${ingresso.buffers.length}`,
    )
  }

  // Lo STATO batte le fasce: proporre dentro un giorno chiuso perché le fasce
  // sono piene farebbe sembrare aperto ogni giorno chiuso (§8.3).
  if (ingresso.dayStatus === 'salon_closed') return { starts: [], reason: 'salon_closed' }
  // D2-5: fasce vuote con stato aperto è un ingresso incoerente, e la risposta
  // meno bugiarda è «assente», non un'accusa alla durata del servizio.
  if (ingresso.dayStatus === 'operator_off' || ingresso.ranges.length === 0) {
    return { starts: [], reason: 'operator_off' }
  }

  const campata = campataOccupata(ingresso.durations, ingresso.buffers)
  // La PIÙ LUNGA, non la prima: «più lungo di qualunque fascia» è un
  // confronto con il massimo.
  const fasciaPiuLunga = Math.max(...ingresso.ranges.map((f) => f.endBoundary - f.startBoundary))
  if (campata > fasciaPiuLunga) return { starts: [], reason: 'service_too_long' }

  // Gli appuntamenti che si stanno spostando non occupano: §8.6 sposta una
  // visita intera, e senza l'esclusione le sue stesse celle bloccherebbero
  // ogni partenza dentro la propria durata.
  const occupati = ingresso.occupancy.filter(
    (b) => !ingresso.excludeAppointmentIds.includes(b.appointmentId),
  )

  // Le fasce si scorrono ORDINATE, così le partenze escono crescenti senza
  // riordinarle dopo: riordinarle nasconderebbe un chiamante che passa fasce
  // non piegate.
  const fasce = [...ingresso.ranges].sort((a, b) => a.startBoundary - b.startBoundary)

  // La pausa dell'ULTIMO servizio della visita: è la distanza pretesa verso
  // l'appuntamento che segue (D2-3).
  const codaPropria = ingresso.buffers[ingresso.buffers.length - 1]

  const starts: IndiceCella[] = []
  for (const fascia of fasce) {
    // `inizio + campata <= endBoundary` è la regola di §5: un indice di cella
    // e un indice di confine non si confrontano mai direttamente.
    for (let inizio = fascia.startBoundary; inizio + campata <= fascia.endBoundary; inizio++) {
      // `nowCell` è nullo tranne quando `date` è oggi: sui giorni futuri non
      // si filtra niente. Una partenza ALL'ora esatta è ancora futura.
      if (ingresso.nowCell !== null && inizio < ingresso.nowCell) continue
      if (!celleLibere(occupati, inizio, campata)) continue
      if (!riassettoRispettato(occupati, inizio, campata, codaPropria)) continue
      starts.push(inizio)
    }
  }

  return starts.length > 0 ? { starts, reason: null } : { starts: [], reason: 'full' }
}

/**
 * Nessun blocco occupato tocca `[inizio, inizio + campata)`. `endCell` è
 * l'ultima cella OCCUPATA (D2-1), quindi il confronto è `b.endCell < inizio`.
 */
function celleLibere(occupati: readonly Blocco[], inizio: IndiceCella, campata: number): boolean {
  const ultimaProposta = inizio + campata - 1
  return occupati.every((b) => b.endCell < inizio || b.startCell > ultimaProposta)
}

/**
 * §7.3: una partenza è proponibile solo se è LIBERA DAL RIASSETTO A ENTRAMBI I
 * CAPI — dopo l'appuntamento che precede, della pausa di QUELL'appuntamento; e
 * prima di quello che segue, della pausa PROPRIA del servizio proposto.
 *
 * La regola è simmetrica, e ogni revisione della spec ne aveva una metà: la 2
 * onorava solo la coda propria e solo quando qualcosa seguiva, la 3 solo
 * quella dell'appuntamento precedente. Le due metà sono scritte qui come due
 * condizioni distinte, apposta.
 *
 * «L'appuntamento che precede» è IL PIÙ VICINO, non tutti quelli prima
 * (D2-9): se una visita lunga con un'ora di riassetto è seguita subito da una
 * breve senza pausa — scrivibile per la via esplicita di §8.1 — la pausa della
 * prima è già stata consumata, e pretenderla di nuovo dopo la seconda
 * nasconderebbe un posto libero che esiste.
 *
 * `endCell` è inclusiva (D2-1), quindi le celle libere fra un blocco che
 * finisce alla `endCell` e una proposta che parte a `inizio` sono
 * `inizio - endCell - 1`.
 */
function riassettoRispettato(
  occupati: readonly Blocco[],
  inizio: IndiceCella,
  campata: number,
  codaPropria: number,
): boolean {
  const ultimaProposta = inizio + campata - 1

  let precedente: Blocco | null = null
  let seguente: Blocco | null = null
  for (const b of occupati) {
    if (b.endCell < inizio && (precedente === null || b.endCell > precedente.endCell)) {
      precedente = b
    }
    if (b.startCell > ultimaProposta && (seguente === null || b.startCell < seguente.startCell)) {
      seguente = b
    }
  }

  if (precedente !== null && inizio - precedente.endCell - 1 < precedente.bufferAfterCells) {
    return false
  }
  if (seguente !== null && seguente.startCell - ultimaProposta - 1 < codaPropria) {
    return false
  }
  return true
}

/**
 * La campata che la visita OCCUPA: la somma delle durate più le pause FRA un
 * servizio e il successivo (D2-3). La pausa dell'ULTIMO servizio non è dentro
 * la campata: è la distanza pretesa verso l'appuntamento che segue, e la usa
 * la regola del riassetto.
 */
export function campataOccupata(durations: readonly number[], buffers: readonly number[]): number {
  return durations.reduce(
    (totale, durata, i) => totale + durata + (i < durations.length - 1 ? buffers[i] : 0),
    0,
  )
}
