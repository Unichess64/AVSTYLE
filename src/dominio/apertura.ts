// src/dominio/apertura.ts
//
// Da un tocco sull'agenda alla scheda da aprire (spec §9.4: «tapping a block or
// an empty cell»; spec 3a §5.1). Logica pura: il componente legge gli
// attributi `data-…` dell'elemento toccato e passa qui quello che ha letto.
import { inizioDalTocco } from './blocchi'

export type Apertura =
  | { readonly tipo: 'visita'; readonly visitaId: string; readonly data: string }
  | { readonly tipo: 'vuota'; readonly data: string; readonly operatriceId: string; readonly inizio: number }

export interface Tocco {
  /** `data-visita` di un blocco o di una riga della lista. */
  readonly visita?: string
  /** `data-colonna` dello spazio libero di un'operatrice. */
  readonly colonna?: string
  /** La distanza del tocco dal bordo alto dello spazio, e la sua altezza, in punti. */
  readonly y?: number
  readonly altezza?: number
  readonly finestra?: { readonly da: number; readonly a: number }
}

/** La cella toccata: lo spazio di una colonna copre esattamente la finestra. */
export function cellaDalTocco(y: number, altezza: number, finestra: { da: number; a: number }): number {
  const celle = finestra.a - finestra.da
  const n = Math.floor((y / altezza) * celle)
  return finestra.da + Math.min(Math.max(n, 0), celle - 1)
}

export function aperturaDalTocco(
  t: Tocco,
  data: string,
  occupati: readonly { readonly operatriceId: string; readonly inizio: number; readonly durata: number }[],
): Apertura | null {
  if (t.visita !== undefined) return { tipo: 'visita', visitaId: t.visita, data }
  if (t.colonna === undefined || t.y === undefined || t.altezza === undefined || t.finestra === undefined) return null
  const cella = cellaDalTocco(t.y, t.altezza, t.finestra)
  const colonna = occupati.filter((o) => o.operatriceId === t.colonna)
  return { tipo: 'vuota', data, operatriceId: t.colonna, inizio: inizioDalTocco(cella, colonna) }
}
