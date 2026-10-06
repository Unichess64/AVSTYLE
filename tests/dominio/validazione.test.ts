// tests/dominio/validazione.test.ts
import { describe, expect, it } from 'vitest'
import { blocco, confineDaOra } from '../../src/dominio/tempo'
import {
  dataDallIndirizzo,
  dataReale,
  telefonoE164,
  validaDocumentoFinestra,
} from '../../src/dominio/validazione'

describe('DATE-IMPOSSIBILI', () => {
  it('accetta una data vera e la restituisce com era', () => {
    expect(dataReale('2026-10-03')).toBe('2026-10-03')
    expect(dataReale('2028-02-29')).toBe('2028-02-29') // bisestile vero
  })

  it('rifiuta il 31 febbraio, che oggi diventa il 3 marzo in silenzio', () => {
    expect(() => dataReale('2026-02-31')).toThrow(RangeError)
  })

  it('rifiuta il 29 febbraio di un anno non bisestile', () => {
    expect(() => dataReale('2026-02-29')).toThrow(RangeError)
  })

  it('rifiuta il mese 13 e il giorno 00', () => {
    expect(() => dataReale('2026-13-01')).toThrow(RangeError)
    expect(() => dataReale('2026-10-00')).toThrow(RangeError)
  })

  it('rifiuta una forma che la regex non ancorata lascerebbe passare', () => {
    expect(() => dataReale('x2026-10-03')).toThrow(RangeError)
    expect(() => dataReale('2026-10-03y')).toThrow(RangeError)
  })
})

describe('la data che arriva dall indirizzo della pagina', () => {
  it('senza parametro dà oggi', () => {
    expect(dataDallIndirizzo(null, '2026-10-03')).toBe('2026-10-03')
  })

  it('con una data vera dà quella', () => {
    expect(dataDallIndirizzo('2026-12-24', '2026-10-03')).toBe('2026-12-24')
  })

  it('con una data impossibile dà oggi, senza sollevare: l indirizzo è dell utente', () => {
    expect(dataDallIndirizzo('2026-02-31', '2026-10-03')).toBe('2026-10-03')
    expect(dataDallIndirizzo('ieri', '2026-10-03')).toBe('2026-10-03')
  })
})

describe('GUARDIE-TEMPO: le guardie di blocco() e le ancore delle regex', () => {
  it('blocco() accetta un appuntamento vero', () => {
    expect(blocco('a', 120, 6, 2)).toEqual({
      appointmentId: 'a', startCell: 120, endCell: 125, bufferAfterCells: 2,
    })
  })

  it('blocco() rifiuta cellCount zero, negativo e frazionario', () => {
    expect(() => blocco('a', 120, 0, 2)).toThrow(RangeError)
    expect(() => blocco('a', 120, -1, 2)).toThrow(RangeError)
    expect(() => blocco('a', 120, 1.5, 2)).toThrow(RangeError)
  })

  it('blocco() rifiuta bufferAfterCells negativo e frazionario, e accetta lo zero', () => {
    expect(() => blocco('a', 120, 6, -1)).toThrow(RangeError)
    expect(() => blocco('a', 120, 6, 0.5)).toThrow(RangeError)
    expect(blocco('a', 120, 6, 0).bufferAfterCells).toBe(0)
  })

  it('blocco() rifiuta lo scavalco della mezzanotte e accetta l ultima cella intera', () => {
    expect(() => blocco('a', 287, 2, 0)).toThrow(RangeError)
    expect(blocco('a', 287, 1, 0).endCell).toBe(287)
  })

  it('confineDaOra accetta 287 come inizio e 288 come fine, e rifiuta 289', () => {
    expect(confineDaOra('23:55')).toBe(287)
    expect(confineDaOra('24:00')).toBe(288)
    expect(() => confineDaOra('24:05')).toThrow(RangeError)
  })

  it('confineDaOra rifiuta 09:70 e le forme che una regex senza ancore accetterebbe', () => {
    expect(() => confineDaOra('09:70')).toThrow(RangeError)
    expect(() => confineDaOra('x09:00')).toThrow(RangeError)
    expect(() => confineDaOra('09:00y')).toThrow(RangeError)
  })
})

describe('CONTORNO-CERCAPOSTI, parte decodificaFinestra: l agenda valida ciò che riceve', () => {
  // ⚠︎ La chiusura è A GIORNATA INTERA, con i due confini NULLI: è la forma
  // normale (ferie, lutto, domenica), e `salon_closure_boundary_pair`
  // (0006:56) impone che siano nulli INSIEME. Il documento «buono» la porta
  // apposta: senza, le sei prove negative passerebbero su un documento che non
  // somiglia a quelli veri, e il ramo delle chiusure resterebbe scoperto.
  const documentoBuono = {
    weekly: [{ operator_id: 'v', weekday: 5, start_boundary: 108, end_boundary: 156 }],
    exceptions: [],
    closures: [
      { start_date: '2026-12-25', end_date: '2026-12-26', from_boundary: null, to_boundary: null, reason: 'Natale' },
      { start_date: '2026-12-24', end_date: '2026-12-24', from_boundary: 156, to_boundary: 288, reason: 'Vigilia' },
    ],
    occupancy: [
      { operator_id: 'v', date: '2026-10-03', appointment_id: 'a1', start_cell: 120, cell_count: 6, buffer_after_cells: 2 },
    ],
  }

  it('lascia passare un documento buono, invariato', () => {
    expect(validaDocumentoFinestra(documentoBuono)).toEqual(documentoBuono)
  })

  it('una chiusura a giornata intera, con i due confini nulli, passa', () => {
    // La gemella della prova qui sotto: senza di lei, «rifiuta un confine
    // spaiato» resterebbe verde anche con un validatore che rifiuta OGNI nullo.
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        closures: [documentoBuono.closures[0]],
      }),
    ).not.toThrow()
  })

  it('rifiuta una chiusura con un solo confine nullo, che il vincolo del database vieta', () => {
    for (const spaiata of [
      { from_boundary: 156, to_boundary: null },
      { from_boundary: null, to_boundary: 288 },
    ]) {
      expect(() =>
        validaDocumentoFinestra({
          ...documentoBuono,
          closures: [{ ...documentoBuono.closures[0], ...spaiata }],
        }),
      ).toThrow(RangeError)
    }
  })

  it('rifiuta una chiusura parziale con i confini rovesciati', () => {
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        closures: [{ ...documentoBuono.closures[1], from_boundary: 288, to_boundary: 156 }],
      }),
    ).toThrow(RangeError)
  })

  it('rifiuta un giorno della settimana fuori da 0-6', () => {
    expect(() =>
      validaDocumentoFinestra({ ...documentoBuono, weekly: [{ ...documentoBuono.weekly[0], weekday: 7 }] }),
    ).toThrow(RangeError)
  })

  it('rifiuta una fascia che finisce prima di cominciare', () => {
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        weekly: [{ ...documentoBuono.weekly[0], start_boundary: 156, end_boundary: 108 }],
      }),
    ).toThrow(RangeError)
  })

  it('rifiuta una fascia vuota, che comincia e finisce sullo stesso confine', () => {
    // Sonda 13 del piano: senza questa prova `a <= da` → `a < da` restava
    // verde, e una fascia 108-108 entrava nell'agenda come turno di zero minuti.
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        weekly: [{ ...documentoBuono.weekly[0], start_boundary: 108, end_boundary: 108 }],
      }),
    ).toThrow(RangeError)
  })

  it('rifiuta un confine fuori da 0-288', () => {
    expect(() =>
      validaDocumentoFinestra({ ...documentoBuono, weekly: [{ ...documentoBuono.weekly[0], end_boundary: 289 }] }),
    ).toThrow(RangeError)
  })

  it('rifiuta una data impossibile in un occupazione', () => {
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        occupancy: [{ ...documentoBuono.occupancy[0], date: '2026-02-31' }],
      }),
    ).toThrow(RangeError)
  })

  it('rifiuta due occupazioni con lo stesso appointment_id, che darebbero righe duplicate', () => {
    expect(() =>
      validaDocumentoFinestra({
        ...documentoBuono,
        occupancy: [documentoBuono.occupancy[0], documentoBuono.occupancy[0]],
      }),
    ).toThrow(RangeError)
  })
})

describe('il telefono in E.164 (spec riga 511)', () => {
  it('normalizza le due forme italiane nello stesso numero', () => {
    expect(telefonoE164('347 1234567')).toBe('+393471234567')
    expect(telefonoE164('+39 347 1234567')).toBe('+393471234567')
  })

  it('rifiuta un numero che non si normalizza', () => {
    expect(() => telefonoE164('12')).toThrow(RangeError)
  })
})
