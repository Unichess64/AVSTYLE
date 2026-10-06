// src/dominio/stato-visita.ts — la forma che `public.stato_visita(uuid)` restituisce.
//
// ⚠︎ TRASCRITTA DA `0016_salva_visita.sql:40-58`, non inventata. Due trappole,
// tutte e due misurate sul corpo della funzione il 28/09/2026:
//
//   1. `visita` è la VERSIONE della visita (`app.versione(v.updated_at)`), NON
//      il suo identificativo. Per questo `apriSchedaSuVisita` prende
//      `visitaId` come argomento a parte. Chi legge `visita` come un id
//      scrive `versioneVisita: null` e OGNI salvataggio dopo un
//      `modificata_altrove` rimbalza per sempre.
//   2. `cliente` è un uuid NUDO, mentre `Scheda.cliente` è un OGGETTO. È il
//      confronto che `ugualeAllaScheda` deve fare con attenzione. `start_cell`
//      e `cell_count` sono `smallint` (`0004:17-18`) e `jsonb_build_object` li
//      rende NUMERI.
export interface AppuntamentoNelloStato {
  readonly id: string          // uuid
  readonly versione: string    // app.versione(a.updated_at) — TESTO, mai un Date (C4)
  readonly operatrice: string  // uuid
  readonly servizio: string    // uuid
  readonly inizio: number      // start_cell, 0..287
  readonly durata: number      // cell_count, ≥ 1
}
export interface StatoVisita {
  readonly visita: string      // ⚠︎ la VERSIONE della visita, non l'id
  readonly data: string        // 'YYYY-MM-DD'
  readonly cliente: string     // ⚠︎ uuid NUDO
  readonly appuntamenti: readonly AppuntamentoNelloStato[]  // già ordinati per id dal database
}

const testo = (x: unknown): x is string => typeof x === 'string' && x.length > 0
const intero = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x)

/**
 * Il documento che arriva da PostgREST, controllato campo per campo: `null`
 * se la visita non c'è o non si vede, un errore se la forma non è quella
 * trascritta qui sopra. Una forma storta è un guasto, non una visita assente.
 */
export function leggiStatoVisita(documento: unknown): StatoVisita | null {
  if (documento === null) return null
  const d = documento as Record<string, unknown>
  if (
    typeof d !== 'object' || !testo(d.visita) || !testo(d.data) || !testo(d.cliente) || !Array.isArray(d.appuntamenti)
  ) {
    throw new TypeError('stato_visita: forma inattesa')
  }
  const appuntamenti = d.appuntamenti.map((x: Record<string, unknown>) => {
    if (
      !testo(x.id) || !testo(x.versione) || !testo(x.operatrice) || !testo(x.servizio) || !intero(x.inizio) || !intero(x.durata)
    ) {
      throw new TypeError('stato_visita: appuntamento di forma inattesa')
    }
    return { id: x.id, versione: x.versione, operatrice: x.operatrice, servizio: x.servizio, inizio: x.inizio, durata: x.durata }
  })
  return { visita: d.visita, data: d.data, cliente: d.cliente, appuntamenti }
}
