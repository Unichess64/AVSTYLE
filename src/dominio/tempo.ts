// I due domini del tempo e l'unico posto dove una cella diventa un orario.
// Spec §5, §5.1, §5.2.

import type { Blocco, Fascia, IndiceCella, IndiceConfine } from './tipi'

export const MINUTI_PER_CELLA = 5
export const CELLE_PER_GIORNO = 288

/**
 * L'orario di un CONFINE. Accetta 0–288: il confine 288 è la mezzanotte di
 * chiusura del giorno e vale '24:00', che è una fine di fascia legittima.
 */
export function oraDaConfine(confine: IndiceConfine): string {
  if (!Number.isInteger(confine) || confine < 0 || confine > CELLE_PER_GIORNO) {
    throw new RangeError(`confine fuori dal dominio 0–288: ${confine}`)
  }
  const minuti = confine * MINUTI_PER_CELLA
  return `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`
}

/**
 * L'orario in cui COMINCIA una cella. Accetta 0–287: la cella 288 non esiste,
 * e chiamarla è il sintomo di un confine usato come indice di cella.
 */
export function oraDaCella(cella: IndiceCella): string {
  if (!Number.isInteger(cella) || cella < 0 || cella > CELLE_PER_GIORNO - 1) {
    throw new RangeError(`cella fuori dal dominio 0–287: ${cella}`)
  }
  return oraDaConfine(cella)
}

/** Da 'HH:MM' al confine corrispondente. Rifiuta gli orari fuori griglia. */
export function confineDaOra(ora: string): IndiceConfine {
  const pezzi = /^(\d{2}):(\d{2})$/.exec(ora)
  if (pezzi === null) throw new RangeError(`orario non nella forma HH:MM: ${ora}`)
  const minuti = Number(pezzi[1]) * 60 + Number(pezzi[2])
  if (minuti % MINUTI_PER_CELLA !== 0) {
    throw new RangeError(`orario fuori dalla griglia da cinque minuti: ${ora}`)
  }
  const confine = minuti / MINUTI_PER_CELLA
  if (confine > CELLE_PER_GIORNO) throw new RangeError(`orario oltre la mezzanotte: ${ora}`)
  return confine
}

function pezziData(data: string): [number, number, number] {
  const pezzi = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (pezzi === null) throw new RangeError(`data non nella forma YYYY-MM-DD: ${data}`)
  return [Number(pezzi[1]), Number(pezzi[2]), Number(pezzi[3])]
}

/**
 * 0 = lunedì … 6 = domenica (spec §5.2). La data si costruisce con `Date.UTC`
 * e si legge con `getUTCDay()`.
 *
 * `new Date('2026-03-30')` sarebbe la mezzanotte UTC, e leggerla con
 * `getDay()` fa slittare la data di un giorno indietro A OVEST di UTC — verde
 * a Perugia, rossa in una CI su fuso americano. È il verso opposto a quello
 * che riguarda il parser di `pg` in `tests/helpers/db.ts`, dove una `date`
 * arriva a mezzanotte LOCALE e slitta a est: due bug speculari, e questo è
 * quello invisibile da qui.
 */
export function giornoSettimana(data: string): number {
  const [anno, mese, giorno] = pezziData(data)
  return (new Date(Date.UTC(anno, mese - 1, giorno)).getUTCDay() + 6) % 7
}

/** Somma giorni di calendario a una data, restando in UTC e in stringa. */
export function sommaGiorni(data: string, giorni: number): string {
  const [anno, mese, giorno] = pezziData(data)
  const spostata = new Date(Date.UTC(anno, mese - 1, giorno + giorni))
  return spostata.toISOString().slice(0, 10)
}

/**
 * Costruisce un blocco occupato da `start_cell` e `cell_count`, che sono i
 * nomi delle colonne di `appointment`. `endCell` è l'ultima cella occupata,
 * INCLUSA (D2-1), e QUESTO è l'unico posto in TypeScript che la calcola.
 * `availability_window` restituisce `cell_count` grezzo per non aggiungere
 * un'altra copia in SQL. Ma in SQL la stessa somma esiste già: la funzione
 * `app.sync_appointment_slots`, che il trigger `zz_sync_appointment_slots`
 * esegue, in `supabase/migrations/0005_occupancy.sql`, calcola
 * `start_cell + cell_count - 1` per riempire `appointment_slot`. Le due vanno
 * tenute d'accordo: chi cambia la convenzione qui la cambia anche lì.
 */
export function blocco(
  appointmentId: string,
  startCell: IndiceCella,
  cellCount: number,
  bufferAfterCells: number,
): Blocco {
  if (!Number.isInteger(startCell) || startCell < 0 || startCell > CELLE_PER_GIORNO - 1) {
    throw new RangeError(`start_cell fuori dal dominio 0–287: ${startCell}`)
  }
  if (!Number.isInteger(cellCount) || cellCount < 1) {
    throw new RangeError(`cell_count deve essere almeno 1: ${cellCount}`)
  }
  if (startCell + cellCount > CELLE_PER_GIORNO) {
    throw new RangeError(`l appuntamento scavalca la mezzanotte: ${startCell} + ${cellCount}`)
  }
  if (!Number.isInteger(bufferAfterCells) || bufferAfterCells < 0) {
    throw new RangeError(`buffer_after_cells non può essere negativo: ${bufferAfterCells}`)
  }
  return { appointmentId, startCell, endCell: startCell + cellCount - 1, bufferAfterCells }
}

/**
 * La regola di §5 sul confronto fra i due domini, scritta una volta sola:
 * `start_cell >= start_boundary and start_cell + cell_count <= end_boundary`.
 */
export function staNellaFascia(
  startCell: IndiceCella,
  cellCount: number,
  fascia: Fascia,
): boolean {
  return startCell >= fascia.startBoundary && startCell + cellCount <= fascia.endBoundary
}
