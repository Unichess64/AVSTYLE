// Risoluzione delle fasce di un giorno. Spec §7.1 e §6.6.

import type { Fascia, StatoGiorno } from './tipi'

/**
 * Un giorno di eccezione. La PRESENZA dell'oggetto significa che l'eccezione
 * esiste; `ranges` vuoto significa ASSENTE. Spec §6.5: non c'è alcun flag,
 * perché un flag rendeva «non assente con zero fasce» identico ad «assente» —
 * un significato con due scritture.
 */
export interface Eccezione {
  readonly ranges: readonly Fascia[]
}

/**
 * Una chiusura del salone. Entrambi i confini nulli: giornata intera.
 * Entrambi valorizzati: la finestra `[fromBoundary, toBoundary)` viene tagliata
 * via da ogni data dell'intervallo. Spec §6.5.
 */
export interface Chiusura {
  readonly fromBoundary: number | null
  readonly toBoundary: number | null
}

export interface IngressoGiorno {
  readonly weekly: readonly Fascia[]
  readonly exception: Eccezione | null
  readonly closures: readonly Chiusura[]
}

export interface EsitoGiorno {
  readonly ranges: Fascia[]
  readonly dayStatus: StatoGiorno
}

export function risolviGiorno(ingresso: IngressoGiorno): EsitoGiorno {
  // Passo 1 e 2 di §7.1: l'eccezione SOSTITUISCE il giorno per intero.
  // Si guarda `exception !== null`, non `exception.ranges.length`: zero fasce
  // è un'assenza dichiarata, non l'assenza di un'eccezione.
  const base: Fascia[] =
    ingresso.exception !== null
      ? ingresso.exception.ranges.map(copia)
      : ingresso.weekly.map(copia)

  const dayStatus: StatoGiorno = base.length === 0 ? 'operator_off' : 'open'
  return { ranges: base, dayStatus }
}

function copia(f: Fascia): Fascia {
  return { startBoundary: f.startBoundary, endBoundary: f.endBoundary }
}
