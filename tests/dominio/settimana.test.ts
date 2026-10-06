// tests/dominio/settimana.test.ts
//
// La settimana di un'operatrice (spec 3a §5.3, spec §9.3): logica pura.
// ⚠︎ `npm run test:fuso` la esegue con `TZ=America/New_York`: è lì che un
// `getDay()` al posto di `getUTCDay()` si vede, e i cambi d'ora americani
// (1 novembre 2026, 14 marzo 2027) cadono in altre settimane da quelli europei.
import { describe, expect, it } from 'vitest'
import {
  type AppuntamentoDiSettimana,
  componiSettimana,
  giorniDellaSettimana,
  lunediDi,
  operatriceDallIndirizzo,
  settimanaAccanto,
} from '../../src/dominio/settimana'

const VERA = 'op-vera'

function app(
  id: string,
  data: string,
  inizio: number,
  altro: Partial<AppuntamentoDiSettimana> = {},
): AppuntamentoDiSettimana {
  return { id, visitaId: `v-${id}`, operatriceId: VERA, data, inizio, durata: 6, pausa: 0, ...altro }
}

describe('il lunedì della settimana (0 = lunedì, spec §5.2)', () => {
  it('il lunedì della settimana di un mercoledì è due giorni prima', () => {
    expect(lunediDi('2026-10-07')).toBe('2026-10-05')
    // e attraverso un mese
    expect(lunediDi('2026-07-01')).toBe('2026-06-29')
  })

  it('la settimana di una domenica comincia il lunedì precedente, non il giorno dopo', () => {
    expect(lunediDi('2026-10-11')).toBe('2026-10-05')
    // un lunedì è il lunedì di sé stesso
    expect(lunediDi('2026-10-05')).toBe('2026-10-05')
    // un sabato
    expect(lunediDi('2026-10-10')).toBe('2026-10-05')
  })
})

describe('sette giorni, anche intorno al cambio d ora', () => {
  // Le quattro domeniche del cambio: Europa 25/10/2026 e 28/03/2027, Stati
  // Uniti 1/11/2026 e 14/03/2027. Una somma di millisecondi su una mezzanotte
  // LOCALE sbaglia la data attraversando la notte del cambio: il passaggio
  // alla settimana dopo (o prima) la attraversa sempre.
  const casi: [string, string, string][] = [
    // [lunedì della settimana col cambio, domenica del cambio, lunedì dopo]
    ['2026-10-19', '2026-10-25', '2026-10-26'],
    ['2027-03-22', '2027-03-28', '2027-03-29'],
    ['2026-10-26', '2026-11-01', '2026-11-02'],
    ['2027-03-08', '2027-03-14', '2027-03-15'],
  ]

  it('la settimana che contiene il cambio d ora ha sette giorni e sette date distinte', () => {
    for (const [lunedi, domenica, dopo] of casi) {
      const giorni = giorniDellaSettimana(lunedi)
      expect(giorni).toHaveLength(7)
      expect(new Set(giorni).size).toBe(7)
      expect(giorni[0]).toBe(lunedi)
      expect(giorni[6]).toBe(domenica)
      expect(lunediDi(domenica)).toBe(lunedi)
      // la settimana dopo e quella prima attraversano la notte del cambio
      expect(settimanaAccanto(lunedi, 1)).toBe(dopo)
      expect(settimanaAccanto(dopo, -1)).toBe(lunedi)
      expect(giorniDellaSettimana(dopo)[0]).toBe(dopo)
    }
    // le date in fila, una per una, per la settimana del 25 ottobre
    expect(giorniDellaSettimana('2026-10-19')).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ])
  })

  it('settimanaAccanto rifiuta una data che non è un lunedì', () => {
    expect(() => settimanaAccanto('2026-10-21', 1)).toThrow(RangeError)
    expect(() => giorniDellaSettimana('2026-10-21')).toThrow(RangeError)
  })
})

describe('componiSettimana', () => {
  it('un giorno senza appuntamenti resta nella settimana, vuoto', () => {
    const s = componiSettimana(VERA, '2026-10-05', [app('a', '2026-10-07', 120)])
    expect(s.giorni).toHaveLength(7)
    expect(s.giorni.map((g) => g.data)).toEqual(giorniDellaSettimana('2026-10-05'))
    expect(s.giorni[0]).toEqual({ data: '2026-10-05', inizi: [] })
    expect(s.giorni[6]).toEqual({ data: '2026-10-11', inizi: [] })
    // la gemella: il mercoledì NON è vuoto, quindi «vuoto» si distingue da «assente»
    expect(s.giorni[2]).toEqual({ data: '2026-10-07', inizi: [120] })
    expect(s).toMatchObject({ operatriceId: VERA, lunedi: '2026-10-05' })
  })

  it('una settimana senza appuntamenti ha comunque sette giorni', () => {
    const s = componiSettimana(VERA, '2026-10-05', [])
    expect(s.giorni.map((g) => g.inizi)).toEqual([[], [], [], [], [], [], []])
  })

  it('le ore d inizio sono crescenti, e una visita contigua ne dà una sola', () => {
    const s = componiSettimana(VERA, '2026-10-05', [
      app('tardi', '2026-10-06', 180),
      // una visita in due servizi contigui, pausa di 3 in mezzo: un blocco solo (§9.1)
      app('v1', '2026-10-06', 120, { visitaId: 'V', durata: 18, pausa: 3 }),
      app('v2', '2026-10-06', 141, { visitaId: 'V', durata: 10 }),
      // un'altra visita che comincia dove la prima finisce: è un'altra ora d'inizio
      app('altra', '2026-10-06', 151),
    ])
    expect(s.giorni[1].inizi).toEqual([120, 151, 180])
  })

  it('una visita NON contigua dà due ore d inizio', () => {
    const s = componiSettimana(VERA, '2026-10-05', [
      app('v1', '2026-10-08', 120, { visitaId: 'V', durata: 18, pausa: 0 }),
      app('v2', '2026-10-08', 150, { visitaId: 'V', durata: 10 }),
    ])
    expect(s.giorni[3].inizi).toEqual([120, 150])
  })

  it('un appuntamento fuori dalla settimana o di un altra operatrice è un incoerenza, non si scarta', () => {
    expect(() => componiSettimana(VERA, '2026-10-05', [app('x', '2026-10-12', 120)])).toThrow(RangeError)
    expect(() => componiSettimana(VERA, '2026-10-05', [app('x', '2026-10-04', 120)])).toThrow(RangeError)
    expect(() =>
      componiSettimana(VERA, '2026-10-05', [app('x', '2026-10-06', 120, { operatriceId: 'op-alessandra' })]),
    ).toThrow(RangeError)
    expect(() => componiSettimana(VERA, '2026-10-06', [])).toThrow(RangeError)
  })
})

describe('operatriceDallIndirizzo: ?settimana= si valida prima di usarlo', () => {
  const ATTIVE = ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003']

  it('un id di un operatrice attiva passa', () => {
    expect(operatriceDallIndirizzo(ATTIVE[1], ATTIVE)).toBe(ATTIVE[1])
  })

  it('assente, ripetuto, sconosciuto o storto: nessuna settimana', () => {
    expect(operatriceDallIndirizzo(undefined, ATTIVE)).toBeNull()
    expect(operatriceDallIndirizzo([ATTIVE[0], ATTIVE[1]], ATTIVE)).toBeNull()
    expect(operatriceDallIndirizzo('10000000-0000-4000-8000-000000000002', ATTIVE)).toBeNull()
    expect(operatriceDallIndirizzo("x' or 1=1", ATTIVE)).toBeNull()
    expect(operatriceDallIndirizzo('', ATTIVE)).toBeNull()
  })
})
