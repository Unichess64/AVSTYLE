// La settimana di un'operatrice (spec 3a §5.3, spec §9.3): logica pura.
//
// Vive nel dominio e non in `src/server/lettura-settimana.ts`, che ne
// riesporta i tipi: `npm run test:fuso` la esegue senza Next, su fuso
// americano. Ogni data è una stringa 'YYYY-MM-DD' e ogni somma passa da
// `sommaGiorni`, che resta in UTC: una somma di millisecondi su una
// mezzanotte locale sbaglia la data attraversando la notte del cambio d'ora.
import { type Concatenabile, componiBlocchi } from './blocchi'
import { giornoSettimana, sommaGiorni } from './tempo'
import { dataReale } from './validazione'

export interface GiornoDiSettimana {
  readonly data: string                      // 'YYYY-MM-DD'
  readonly inizi: readonly number[]          // le sole ore d'inizio, in celle, crescenti
}

export interface Settimana {
  readonly operatriceId: string
  readonly lunedi: string
  readonly giorni: readonly GiornoDiSettimana[]   // sempre SETTE, anche i vuoti
}

/** Un appuntamento come la settimana lo legge: nessun nome, né di cliente né di servizio. */
export interface AppuntamentoDiSettimana extends Concatenabile {
  readonly data: string
}

/** Il lunedì della settimana che contiene `data` (0 = lunedì, spec §5.2). */
export function lunediDi(data: string): string {
  return sommaGiorni(data, -giornoSettimana(data))
}

function esigiLunedi(lunedi: string): void {
  dataReale(lunedi)
  if (giornoSettimana(lunedi) !== 0) throw new RangeError(`non è un lunedì: ${lunedi}`)
}

/** Le sette date, dal lunedì alla domenica. */
export function giorniDellaSettimana(lunedi: string): string[] {
  esigiLunedi(lunedi)
  return [0, 1, 2, 3, 4, 5, 6].map((n) => sommaGiorni(lunedi, n))
}

/** Il lunedì della settimana dopo (`1`) o prima (`-1`). */
export function settimanaAccanto(lunedi: string, verso: 1 | -1): string {
  esigiLunedi(lunedi)
  return sommaGiorni(lunedi, 7 * verso)
}

/**
 * Dalla lettura alla settimana. Le ore d'inizio sono quelle dei BLOCCHI delle
 * colonne: una visita in servizi contigui (§9.1) ne dà una sola, come nel
 * giorno. Un appuntamento di un'altra operatrice o fuori dalla settimana è
 * un'incoerenza della lettura, e solleva invece di sparire.
 */
export function componiSettimana(
  operatriceId: string,
  lunedi: string,
  appuntamenti: readonly AppuntamentoDiSettimana[],
): Settimana {
  const date = giorniDellaSettimana(lunedi)
  const perGiorno = new Map<string, AppuntamentoDiSettimana[]>(date.map((d) => [d, []]))
  for (const a of appuntamenti) {
    const giorno = perGiorno.get(a.data)
    if (giorno === undefined) throw new RangeError(`appuntamento ${a.id} fuori dalla settimana del ${lunedi}`)
    if (a.operatriceId !== operatriceId) throw new RangeError(`appuntamento ${a.id} di un'altra operatrice`)
    giorno.push(a)
  }
  return {
    operatriceId,
    lunedi,
    giorni: date.map((data) => ({
      data,
      inizi: componiBlocchi(perGiorno.get(data)!).map((b) => b.inizio),
    })),
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `?settimana=` dall'indirizzo, validato prima di usarlo: un `operator.id`
 * fra quelli delle attive, altrimenti nessuna settimana e si mostra il giorno.
 * Ripetuto vale come storto, come `?giorno` (Task 5).
 */
export function operatriceDallIndirizzo(
  grezza: string | string[] | undefined,
  attive: readonly string[],
): string | null {
  if (typeof grezza !== 'string' || !UUID.test(grezza)) return null
  return attive.includes(grezza) ? grezza : null
}
