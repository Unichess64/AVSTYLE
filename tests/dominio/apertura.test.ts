// tests/dominio/apertura.test.ts
//
// Da un tocco sull'agenda alla scheda da aprire: un blocco o una riga aprono la
// loro visita, uno spazio libero apre una scheda vuota all'orario di §5.1.
import { describe, expect, it } from 'vitest'
import { aperturaDalTocco, cellaDalTocco } from '../../src/dominio/apertura'

const DATA = '2026-10-08'
// Vera: 10:00–11:35, poi niente. La fine NON cade su un quarto d'ora: dove
// coincidono, «il più tardi fra i due» non si distingue dal quarto (misurato:
// una prima stesura con 10:00–11:30 dava 0 rosse ignorando il precedente).
const OCCUPATI = [
  { operatriceId: 'vera', inizio: 120, durata: 19 },
  { operatriceId: 'alessandra', inizio: 150, durata: 30 },
]

describe('cellaDalTocco', () => {
  it('la cella è la riga toccata, contata dall inizio della finestra', () => {
    // finestra 08:00–20:00 = 144 celle, alta 1008 punti: 7 punti a cella
    expect(cellaDalTocco(0, 1008, { da: 96, a: 240 })).toBe(96)
    expect(cellaDalTocco(6.9, 1008, { da: 96, a: 240 })).toBe(96)
    expect(cellaDalTocco(7, 1008, { da: 96, a: 240 })).toBe(97)
    expect(cellaDalTocco(1007.9, 1008, { da: 96, a: 240 })).toBe(239)
  })

  it('fuori dalla finestra si ferma ai bordi', () => {
    expect(cellaDalTocco(-3, 1008, { da: 96, a: 240 })).toBe(96)
    expect(cellaDalTocco(1010, 1008, { da: 96, a: 240 })).toBe(239)
  })
})

describe('aperturaDalTocco', () => {
  it('un blocco o una riga aprono la loro visita', () => {
    expect(aperturaDalTocco({ visita: 'vi-1' }, DATA, OCCUPATI)).toEqual({ tipo: 'visita', visitaId: 'vi-1', data: DATA })
  })

  it('uno spazio libero apre una scheda vuota al più tardi fra il quarto d ora e la fine del precedente (§5.1)', () => {
    // tocco alle 11:40 nella colonna di Vera: quarto 11:30, fine del precedente 11:35
    const y = (140 - 96) * 7 + 2
    expect(aperturaDalTocco({ colonna: 'vera', y, altezza: 1008, finestra: { da: 96, a: 240 } }, DATA, OCCUPATI)).toEqual({
      tipo: 'vuota',
      data: DATA,
      operatriceId: 'vera',
      inizio: 139,
    })
    // la colonna di Alessandra non c'entra con quella di Vera
    expect(aperturaDalTocco({ colonna: 'alessandra', y, altezza: 1008, finestra: { da: 96, a: 240 } }, DATA, OCCUPATI)).toMatchObject({
      inizio: 138,
    })
    // alle 09:10, con niente prima: il quarto d'ora inferiore
    expect(
      aperturaDalTocco({ colonna: 'vera', y: (110 - 96) * 7, altezza: 1008, finestra: { da: 96, a: 240 } }, DATA, OCCUPATI),
    ).toMatchObject({ inizio: 108 })
  })

  it('un tocco che non è né un blocco né una colonna non apre niente', () => {
    expect(aperturaDalTocco({}, DATA, OCCUPATI)).toBeNull()
  })
})
