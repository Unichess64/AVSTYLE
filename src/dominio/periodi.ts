// src/dominio/periodi.ts — assenze e chiusure su un periodo: date, raggruppamento,
// appuntamenti che ci cadono dentro. Logica pura: la usano Disponibilità e Impostazioni.
import { giorniFra } from './avvisi'
import { piega } from './fasce'
import { sommaGiorni } from './tempo'

/** Il tetto di un periodo (D3c-14): 60 giorni, estremi compresi. */
export const TETTO_GIORNI = 60
const DATA = /^\d{4}-\d{2}-\d{2}$/

/** `null` se il periodo va bene, altrimenti la frase per l'operatrice. Prima l'esistenza, poi l'ordine. */
export function validaPeriodo(dal: string, al: string): string | null {
  if (!DATA.test(dal) || !DATA.test(al)) return 'Scegli le due date'
  if (al < dal) return 'La data di fine viene prima di quella d’inizio'
  if (giorniFra(dal, al) + 1 > TETTO_GIORNI) return `Al massimo ${TETTO_GIORNI} giorni alla volta`
  return null
}

export type Coppia = [number, number]

/** Un giorno d'eccezione letto dal database: le fasce, o nessuna = assente. */
export interface GiornoDiEccezione {
  readonly data: string
  readonly fasce: readonly Coppia[]
}

/** Giorni consecutivi con le stesse fasce diventano un periodo solo: «dal 20 al 24, assente». */
export interface Periodo {
  readonly dal: string
  readonly al: string
  readonly fasce: readonly Coppia[]
}

const uguali = (a: readonly Coppia[], b: readonly Coppia[]) => JSON.stringify(a) === JSON.stringify(b)

export function raggruppaAssenze(giorni: readonly GiornoDiEccezione[]): Periodo[] {
  const ordinati = [...giorni].sort((x, y) => x.data.localeCompare(y.data))
  const periodi: Periodo[] = []
  for (const g of ordinati) {
    const ultimo = periodi[periodi.length - 1]
    if (ultimo !== undefined && sommaGiorni(ultimo.al, 1) === g.data && uguali(ultimo.fasce, g.fasce)) {
      periodi[periodi.length - 1] = { ...ultimo, al: g.data }
    } else {
      periodi.push({ dal: g.data, al: g.data, fasce: g.fasce })
    }
  }
  return periodi
}

/** Un appuntamento già preso, con ciò che serve per telefonare. */
export interface AppuntamentoColpito {
  readonly data: string
  readonly inizio: number      // cella
  readonly durata: number      // celle
  readonly operatriceId: string
  readonly operatrice: string
  readonly servizio: string
  readonly cliente: string
  readonly telefono: string | null
}

/** Un'assenza: colpito ogni appuntamento che non sta per intero dentro una delle fasce nuove. */
export function colpitiDaAssenza(appuntamenti: readonly AppuntamentoColpito[], fasce: readonly Coppia[]): AppuntamentoColpito[] {
  const piegate = piega(fasce.map(([s, e]) => ({ startBoundary: s, endBoundary: e })))
  return appuntamenti.filter((a) => !piegate.some((f) => a.inizio >= f.startBoundary && a.inizio + a.durata <= f.endBoundary))
}

/** Una chiusura: giornata intera (confini nulli) o una finestra; colpito chi la tocca. */
export function colpitiDaChiusura(
  appuntamenti: readonly AppuntamentoColpito[],
  da: number | null,
  a: number | null,
): AppuntamentoColpito[] {
  if (da === null || a === null) return [...appuntamenti]
  return appuntamenti.filter((x) => x.inizio < a && x.inizio + x.durata > da)
}
