import { describe, expect, it } from 'vitest'
import { colpitiDaAssenza, colpitiDaChiusura, raggruppaAssenze, validaPeriodo } from '../../src/dominio/periodi'

const app = (data: string, inizio: number, durata: number) => ({
  data, inizio, durata, operatriceId: 'a', operatrice: 'Annalisa', servizio: 'Manicure', cliente: 'Maria', telefono: null,
})

describe('validaPeriodo', () => {
  it('date mancanti, invertite, oltre i 60 giorni', () => {
    expect(validaPeriodo('', '2026-10-24')).toBe('Scegli le due date')
    expect(validaPeriodo('2026-10-24', '2026-10-20')).toBe('La data di fine viene prima di quella d’inizio')
    expect(validaPeriodo('2027-08-01', '2027-09-29')).toBeNull()                 // 60
    expect(validaPeriodo('2027-08-01', '2027-09-30')).toBe('Al massimo 60 giorni alla volta')   // 61
  })
})

describe('raggruppaAssenze', () => {
  it('giorni consecutivi uguali diventano un periodo; un buco o fasce diverse lo spezzano', () => {
    expect(raggruppaAssenze([
      { data: '2026-10-21', fasce: [] }, { data: '2026-10-20', fasce: [] }, { data: '2026-10-22', fasce: [] },
      { data: '2026-10-23', fasce: [[108, 192]] }, { data: '2026-10-27', fasce: [] },
    ])).toEqual([
      { dal: '2026-10-20', al: '2026-10-22', fasce: [] },
      { dal: '2026-10-23', al: '2026-10-23', fasce: [[108, 192]] },
      { dal: '2026-10-27', al: '2026-10-27', fasce: [] },
    ])
  })
})

describe('colpiti', () => {
  const lista = [app('2026-10-20', 110, 12), app('2026-10-20', 200, 12)]
  it('assente: tutti; esce alle 16 (9–16): solo quello delle 16:40', () => {
    expect(colpitiDaAssenza(lista, [])).toHaveLength(2)
    expect(colpitiDaAssenza(lista, [[108, 192]]).map((a) => a.inizio)).toEqual([200])
  })
  it('chiusura intera: tutti; chiusura 9–12: solo quello delle 9:10', () => {
    expect(colpitiDaChiusura(lista, null, null)).toHaveLength(2)
    expect(colpitiDaChiusura(lista, 108, 144).map((a) => a.inizio)).toEqual([110])
  })
})
