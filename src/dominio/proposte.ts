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

  return { starts: [], reason: 'full' }
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
