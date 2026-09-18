// Dal documento JSON di `public.availability_window` ai tipi del dominio.
// I nomi dei campi del documento sono quelli delle colonne — in inglese e con
// il trattino basso — e questo modulo è l'unico posto dove compaiono.

import { risolviGiorno } from './fasce'
import type { Chiusura, Eccezione } from './fasce'
import { blocco, giornoSettimana } from './tempo'
import type { Blocco, Fascia, StatoGiorno } from './tipi'

export interface RigaSettimana {
  readonly operator_id: string
  readonly weekday: number
  readonly start_boundary: number
  readonly end_boundary: number
}

export interface RigaEccezione {
  readonly operator_id: string
  readonly date: string
  readonly ranges: readonly { readonly start_boundary: number; readonly end_boundary: number }[]
}

export interface RigaChiusura {
  readonly start_date: string
  readonly end_date: string
  readonly from_boundary: number | null
  readonly to_boundary: number | null
  readonly reason: string
}

/** Porta `cell_count` grezzo: l'ultima cella la calcola `blocco()` (D2-1). */
export interface RigaOccupazione {
  readonly appointment_id: string
  readonly operator_id: string
  readonly date: string
  readonly start_cell: number
  readonly cell_count: number
  readonly buffer_after_cells: number
}

export interface DocumentoFinestra {
  readonly weekly: readonly RigaSettimana[]
  readonly exceptions: readonly RigaEccezione[]
  readonly closures: readonly RigaChiusura[]
  readonly occupancy: readonly RigaOccupazione[]
}

export interface GiornoRisolto {
  readonly ranges: Fascia[]
  readonly dayStatus: StatoGiorno
  readonly occupancy: Blocco[]
}

export interface Finestra {
  giorno(operatorId: string, date: string): GiornoRisolto
}

export function decodificaFinestra(documento: DocumentoFinestra): Finestra {
  // Indicizzato per (operatrice, giorno della settimana): la settimana tipica
  // non ha date, e sceglierla per data sarebbe il difetto che §5.2 previene.
  const perSettimana = new Map<string, Fascia[]>()
  for (const r of documento.weekly) {
    const chiave = `${r.operator_id}|${r.weekday}`
    const fasce = perSettimana.get(chiave) ?? []
    fasce.push({ startBoundary: r.start_boundary, endBoundary: r.end_boundary })
    perSettimana.set(chiave, fasce)
  }

  // Indicizzate per (operatrice, DATA): un'eccezione vale per la sua data e
  // per la sua operatrice, e per nessun'altra.
  const perEccezione = new Map<string, Eccezione>()
  for (const r of documento.exceptions) {
    perEccezione.set(`${r.operator_id}|${r.date}`, {
      ranges: r.ranges.map((f) => ({ startBoundary: f.start_boundary, endBoundary: f.end_boundary })),
    })
  }

  // `blocco()` e non un oggetto letterale: è l'unico posto che calcola
  // l'ultima cella occupata (D2-1), ed è anche la porta che rifiuta una riga
  // fuori dominio invece di lasciarla entrare in silenzio.
  const perOccupazione = new Map<string, Blocco[]>()
  for (const r of documento.occupancy) {
    const chiave = `${r.operator_id}|${r.date}`
    const blocchi = perOccupazione.get(chiave) ?? []
    blocchi.push(blocco(r.appointment_id, r.start_cell, r.cell_count, r.buffer_after_cells))
    perOccupazione.set(chiave, blocchi)
  }

  return {
    giorno(operatorId: string, date: string): GiornoRisolto {
      // Una chiusura copre un INTERVALLO di date: si confrontano le stringhe,
      // che per il formato YYYY-MM-DD ordinano come le date.
      const chiusure: Chiusura[] = documento.closures
        .filter((c) => c.start_date <= date && c.end_date >= date)
        .map((c) => ({ fromBoundary: c.from_boundary, toBoundary: c.to_boundary }))

      const risolto = risolviGiorno({
        weekly: perSettimana.get(`${operatorId}|${giornoSettimana(date)}`) ?? [],
        exception: perEccezione.get(`${operatorId}|${date}`) ?? null,
        closures: chiusure,
      })

      return {
        ranges: risolto.ranges,
        dayStatus: risolto.dayStatus,
        occupancy: perOccupazione.get(`${operatorId}|${date}`) ?? [],
      }
    },
  }
}
