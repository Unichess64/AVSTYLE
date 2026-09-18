import { describe, expect, it } from 'vitest'
import { risolviGiorno } from '../../src/dominio/fasce'

const MATTINA = { startBoundary: 108, endBoundary: 156 } // 09:00–13:00
const POMERIGGIO = { startBoundary: 180, endBoundary: 228 } // 15:00–19:00

describe('risoluzione del giorno — settimana tipica ed eccezione', () => {
  it('restituisce la settimana tipica quando non c è alcuna eccezione', () => {
    const esito = risolviGiorno({ weekly: [MATTINA, POMERIGGIO], exception: null, closures: [] })
    expect(esito.ranges).toEqual([MATTINA, POMERIGGIO])
    expect(esito.dayStatus).toBe('open')
  })

  it('dichiara l operatrice assente quando la settimana tipica è vuota', () => {
    const esito = risolviGiorno({ weekly: [], exception: null, closures: [] })
    expect(esito.ranges).toEqual([])
    expect(esito.dayStatus).toBe('operator_off')
  })

  // ⚠ discriminante: l'eccezione SOSTITUISCE il giorno, non si somma.
  // L'eccezione qui accorcia la mattina e cancella il pomeriggio: se le due
  // liste venissero unite, il pomeriggio riapparirebbe.
  it('lascia che un eccezione sostituisca il giorno invece di sommarsi', () => {
    const esito = risolviGiorno({
      weekly: [MATTINA, POMERIGGIO],
      exception: { ranges: [{ startBoundary: 108, endBoundary: 132 }] },
      closures: [],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 108, endBoundary: 132 }])
    expect(esito.dayStatus).toBe('open')
  })

  it('lascia che un eccezione allunghi il giorno', () => {
    const esito = risolviGiorno({
      weekly: [MATTINA],
      exception: { ranges: [{ startBoundary: 96, endBoundary: 240 }] },
      closures: [],
    })
    expect(esito.ranges).toEqual([{ startBoundary: 96, endBoundary: 240 }])
  })

  // ⚠ discriminante: zero fasce SIGNIFICA assente (spec §6.5, non c è un flag).
  // Con `exception` trattata come falsa quando è senza figli, questa prova
  // vedrebbe tornare la settimana tipica.
  it('tratta un eccezione senza fasce come assenza, non come assenza di eccezione', () => {
    const esito = risolviGiorno({
      weekly: [MATTINA, POMERIGGIO],
      exception: { ranges: [] },
      closures: [],
    })
    expect(esito.ranges).toEqual([])
    expect(esito.dayStatus).toBe('operator_off')
  })

  // ⚠ discriminante: l'uscita non deve condividere OGGETTI con l'ingresso, non
  // soltanto l'array. Mutare un ELEMENTO dell'uscita e pretendere l'ingresso
  // intatto è ciò che distingue una copia vera da una copia dell'array con gli
  // stessi oggetti dentro — e resta discriminante anche dopo il Task 4, dove
  // `piega` ricostruisce l'array ma potrebbe riusare gli oggetti.
  it('non lascia che l uscita condivida oggetti con le fasce del chiamante', () => {
    const weekly = [{ startBoundary: 108, endBoundary: 156 }]
    const esito = risolviGiorno({ weekly, exception: null, closures: [] })
    ;(esito.ranges[0] as { endBoundary: number }).endBoundary = 999
    expect(weekly[0].endBoundary).toBe(156)
  })
})
