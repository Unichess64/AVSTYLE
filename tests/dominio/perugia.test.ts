// tests/dominio/perugia.test.ts
import { describe, expect, it } from 'vitest'
import { confineDellOraAPerugia, minutiTrascorsiAPerugia, oggiAPerugia } from '../../src/dominio/perugia'

// Gli istanti sono scritti in UTC, che è l'unico modo di scriverli senza
// dipendere dal fuso di chi esegue. `npm run test:fuso` esegue questo file con
// TZ=America/New_York: se una sola riga leggesse l'orologio locale, qui
// diventerebbe rossa.
describe('data e ora di Europe/Rome, §7', () => {
  it('a mezzanotte e dieci di Perugia il giorno è già quello nuovo, anche se a New York è ieri', () => {
    // 2026-10-03T00:10 a Perugia = 2026-10-02T22:10Z (ora legale, +2).
    expect(oggiAPerugia(new Date('2026-10-02T22:10:00Z'))).toBe('2026-10-03')
  })

  it('alle 23:50 di Perugia il giorno è ancora quello vecchio', () => {
    expect(oggiAPerugia(new Date('2026-10-03T21:50:00Z'))).toBe('2026-10-03')
  })

  it('il 25 ottobre 2026 alle 10:00 di Perugia sono trascorse 11 ore, non 10 (§7)', () => {
    // Il giorno dura 25 ore: alle 10:00 locali sono passati 660 minuti dalla
    // mezzanotte locale. Contarli come 600 metterebbe la linea un'ora sopra.
    const alle10 = new Date('2026-10-25T09:00:00Z') // +1 dopo il cambio
    expect(minutiTrascorsiAPerugia(alle10)).toBe(600)
    const dallaMezzanotte = alle10.getTime() - new Date('2026-10-24T22:00:00Z').getTime()
    expect(dallaMezzanotte / 60000).toBe(660) // ← e questo è il numero da NON usare
  })

  it('il 28 marzo 2027 alle 10:00 di Perugia sono trascorse 9 ore, non 10', () => {
    const alle10 = new Date('2027-03-28T08:00:00Z') // +2 dopo il cambio
    expect(minutiTrascorsiAPerugia(alle10)).toBe(600)
    const dallaMezzanotte = alle10.getTime() - new Date('2027-03-27T23:00:00Z').getTime()
    expect(dallaMezzanotte / 60000).toBe(540)
  })

  it('la linea dell ora sta a 10:00 in tutti e due i giorni del cambio', () => {
    expect(confineDellOraAPerugia(new Date('2026-10-25T09:00:00Z'))).toBe(120)
    expect(confineDellOraAPerugia(new Date('2027-03-28T08:00:00Z'))).toBe(120)
  })

  it('alle 22:00 di Perugia la linea sta a 264, non a 120', () => {
    // Sonda 3 del piano: alle 10:00 l'orologio a 12 ore e quello a 24 ore
    // coincidono, quindi le prove sul cambio d'ora non vedono un `h12`. Alle
    // 22:00 l'orologio a 12 ore legge «10» e metterebbe la linea al mattino.
    expect(confineDellOraAPerugia(new Date('2026-07-01T20:00:00Z'))).toBe(264)
  })

  it('la linea dell ora è frazionaria: alle 10:02 sta dopo la cella delle 10:00', () => {
    const alle1002 = new Date('2026-07-01T08:02:00Z')
    expect(confineDellOraAPerugia(alle1002)).toBeCloseTo(120.4, 5)
  })
})
