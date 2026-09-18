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
  const base: Fascia[] =
    ingresso.exception !== null
      ? ingresso.exception.ranges.map(copia)
      : ingresso.weekly.map(copia)

  // Passo 3 di §7.1, applicato alla BASE già risolta: §6.6 dice che la
  // chiusura batte l'eccezione, che batte la settimana tipica, quindi la
  // sottrazione viene dopo la sostituzione e non prima.
  const chiusuraIntera = ingresso.closures.some((c) => c.fromBoundary === null || c.toBoundary === null)
  let ranges = base
  if (chiusuraIntera) {
    ranges = []
  } else {
    for (const chiusura of ingresso.closures) {
      ranges = ranges.flatMap((f) => sottrai(f, chiusura.fromBoundary!, chiusura.toBoundary!))
    }
  }

  // D2-6. Tre domande in quest'ordine: il salone è chiuso del tutto? il giorno
  // era già vuoto prima della chiusura? la chiusura lo ha svuotato?
  const dayStatus: StatoGiorno = chiusuraIntera
    ? 'salon_closed'
    : base.length === 0
      ? 'operator_off'
      : ranges.length === 0
        ? 'salon_closed'
        : 'open'

  return { ranges: piega(ranges), dayStatus }
}

/**
 * Passo 4 di §7.1. Ordina per inizio e PIEGA: finché `fine_prec >= inizio_succ`
 * le due fasce diventano `[inizio_prec, max(fine_prec, fine_succ))`.
 *
 * È una piega (una riduzione sull'accumulatore), NON una passata a coppie: su
 * tre fasce che si toccano, una passata a coppie produce fasce che si
 * sovrappongono fra loro.
 *
 * `>=` e non `>`: due fasce che si TOCCANO — 09:00–12:00 e 12:00–15:00 — sono
 * una mattina continua, ed è il caso per cui questo passo esiste (§7.2).
 *
 * `max(fine)` e non «la fine dell'ultima letta»: una fascia interamente
 * contenuta in quella prima di lei accorcerebbe il risultato.
 */
export function piega(fasce: readonly Fascia[]): Fascia[] {
  const ordinate = [...fasce].sort((a, b) => a.startBoundary - b.startBoundary)
  return ordinate.reduce<Fascia[]>((piegate, f) => {
    const ultima = piegate[piegate.length - 1]
    if (ultima !== undefined && ultima.endBoundary >= f.startBoundary) {
      piegate[piegate.length - 1] = {
        startBoundary: ultima.startBoundary,
        endBoundary: Math.max(ultima.endBoundary, f.endBoundary),
      }
      return piegate
    }
    piegate.push(copia(f))
    return piegate
  }, [])
}

/**
 * Toglie `[da, a)` da una fascia. Restituisce zero, una o DUE fasce: una
 * chiusura nel mezzo di una giornata continua la spacca in due.
 */
function sottrai(f: Fascia, da: number, a: number): Fascia[] {
  if (a <= f.startBoundary || da >= f.endBoundary) return [f]
  const resto: Fascia[] = []
  if (da > f.startBoundary) resto.push({ startBoundary: f.startBoundary, endBoundary: da })
  if (a < f.endBoundary) resto.push({ startBoundary: a, endBoundary: f.endBoundary })
  return resto
}

function copia(f: Fascia): Fascia {
  return { startBoundary: f.startBoundary, endBoundary: f.endBoundary }
}
