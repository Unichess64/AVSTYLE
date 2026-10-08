import { describe, expect, it } from 'vitest'
import { calcolaAvvisi } from '../../src/dominio/avvisi'
import { doppiDaControllare } from '../../src/dominio/doppi'

const a = (data: string, clienteId: string, servizioId: string) => ({
  data, clienteId, clienteNome: clienteId === 'maria' ? 'Maria Rossi' : 'Lucia', servizioId, servizioNome: servizioId === 'mani' ? 'Manicure' : 'Massaggio',
})

describe('doppiDaControllare', () => {
  const oggi = '2026-10-08'
  it('stesso servizio a tre giorni: un riquadro, con le due date', () => {
    expect(doppiDaControllare([a('2026-10-13', 'maria', 'mani'), a('2026-10-16', 'maria', 'mani')], oggi)).toEqual([
      { clienteNome: 'Maria Rossi', servizioNome: 'Manicure', date: ['2026-10-13', '2026-10-16'] },
    ])
  })
  it('servizi diversi, o a più di sette giorni, o di clienti diverse: niente', () => {
    expect(doppiDaControllare([a('2026-10-13', 'maria', 'mani'), a('2026-10-14', 'maria', 'mass')], oggi)).toEqual([])
    expect(doppiDaControllare([a('2026-10-10', 'maria', 'mani'), a('2026-10-18', 'maria', 'mani')], oggi)).toEqual([])
    expect(doppiDaControllare([a('2026-10-13', 'maria', 'mani'), a('2026-10-14', 'lucia', 'mani')], oggi)).toEqual([])
  })
  it('compare solo dalla settimana prima del primo appuntamento', () => {
    const coppia = [a('2026-10-20', 'maria', 'mani'), a('2026-10-22', 'maria', 'mani')]
    expect(doppiDaControllare(coppia, '2026-10-12')).toEqual([])          // il primo è fra 8 giorni
    expect(doppiDaControllare(coppia, '2026-10-13')).toHaveLength(1)     // fra 7
  })
})

describe('avviso «stesso servizio» nella scheda', () => {
  const base = {
    visitaId: 'v-nuova', data: '2026-10-16', cliente: { id: 'maria', nome: 'Maria Rossi' },
    servizi: [{ id: 's1', servizioId: 'mani', operatriceId: 'vera', inizio: 120, durata: 12 }],
    giorno: { risolti: new Map([['vera', { ranges: [{ startBoundary: 108, endBoundary: 228 }], dayStatus: 'open' as const }]]), appuntamenti: [] },
    nomiOperatrici: new Map([['vera', 'Vera']]), nomiServizi: new Map([['mani', 'Manicure']]),
  }
  const stesso = (vicini: { data: string; servizioId: string; visitaId: string }[]) =>
    calcolaAvvisi({ ...base, vicini } as never).filter((x) => x.chiave.startsWith('stesso-servizio'))
  it('stesso servizio tre giorni prima: l’avviso, con la data', () => {
    const avvisi = stesso([{ data: '2026-10-13', servizioId: 'mani', visitaId: 'v1' }])
    expect(avvisi).toHaveLength(1)
    expect(avvisi[0]!.motivo).toBe('Maria Rossi ha già Manicure martedì 13 ottobre: vuoi procedere comunque?')
  })
  it('un altro servizio, o a otto giorni: niente', () => {
    expect(stesso([{ data: '2026-10-13', servizioId: 'mass', visitaId: 'v1' }])).toEqual([])
    expect(stesso([{ data: '2026-10-08', servizioId: 'mani', visitaId: 'v1' }])).toEqual([])
  })
})
