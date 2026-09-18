import { describe, expect, it } from 'vitest'
import {
  CELLE_PER_GIORNO,
  blocco,
  confineDaOra,
  giornoSettimana,
  oraDaCella,
  oraDaConfine,
  sommaGiorni,
  staNellaFascia,
} from '../../src/dominio/tempo'

describe('i due domini del tempo', () => {
  it('conta 288 celle in un giorno', () => {
    expect(CELLE_PER_GIORNO).toBe(288)
  })

  it('traduce un confine in orario', () => {
    expect(oraDaConfine(0)).toBe('00:00')
    expect(oraDaConfine(96)).toBe('08:00')
    expect(oraDaConfine(240)).toBe('20:00')
  })

  // ⚠ discriminante: il confine 288 è la mezzanotte di CHIUSURA di un giorno.
  // È legale come fine di fascia e illegale come indice di cella: è l'unica
  // differenza osservabile fra i due domini, e se le due funzioni condividono
  // il controllo questa prova la vede.
  it('accetta il confine 288 e rifiuta la cella 288', () => {
    expect(oraDaConfine(288)).toBe('24:00')
    expect(() => oraDaCella(288)).toThrow(RangeError)
  })

  it('rifiuta un confine fuori dominio o non intero', () => {
    expect(() => oraDaConfine(-1)).toThrow(RangeError)
    expect(() => oraDaConfine(289)).toThrow(RangeError)
    expect(() => oraDaConfine(12.5)).toThrow(RangeError)
  })

  it('traduce un orario in confine, e torna indietro', () => {
    expect(confineDaOra('09:00')).toBe(108)
    expect(confineDaOra('11:15')).toBe(135)
    expect(oraDaConfine(confineDaOra('11:55'))).toBe('11:55')
  })

  it('rifiuta un orario che non cade su una cella da cinque minuti', () => {
    expect(() => confineDaOra('09:07')).toThrow(RangeError)
  })

  // ⚠ discriminante: la guardia oltre la mezzanotte. '24:00' è il confine 288
  // ed è legale; '24:05' sarebbe il 289 e non esiste. Senza questa prova la
  // guardia non è esercitata da niente.
  it('accetta le 24:00 come confine e rifiuta qualunque cosa dopo', () => {
    expect(confineDaOra('24:00')).toBe(288)
    expect(() => confineDaOra('24:05')).toThrow(RangeError)
    expect(() => confineDaOra('25:00')).toThrow(RangeError)
  })

  // ⚠ discriminante: 0 = lunedì, non la convenzione di JavaScript.
  // Il 2026-03-12 è un GIOVEDÌ: getUTCDay() dice 4, la nostra mappa dice 3.
  // Una prova su una domenica non distinguerebbe le due convenzioni.
  it('mappa il giorno della settimana con 0 = lunedì', () => {
    expect(giornoSettimana('2026-03-12')).toBe(3)
    expect(giornoSettimana('2026-03-16')).toBe(0)
    expect(giornoSettimana('2026-03-22')).toBe(6)
  })

  // ⚠ discriminante SOLO A OVEST DI UTC. `new Date('2026-03-30')` è la
  // mezzanotte UTC: letta a Roma, che è a EST, resta lo stesso giorno civile,
  // quindi una lettura locale sbagliata sarebbe verde a Perugia e rossa in una
  // CI su fuso americano. La sonda 4 si esegue con TZ=America/New_York per
  // questo motivo. La data è il giorno dopo un cambio d'ora legale italiano.
  it('non fa slittare una data attraverso il cambio dell ora legale', () => {
    expect(giornoSettimana('2026-03-30')).toBe(0)
    expect(sommaGiorni('2026-03-28', 2)).toBe('2026-03-30')
  })

  it('somma giorni attraverso la fine del mese e un anno bisestile', () => {
    expect(sommaGiorni('2026-03-12', 28)).toBe('2026-04-09')
    expect(sommaGiorni('2028-02-28', 1)).toBe('2028-02-29')
  })

  // ⚠ discriminante: D2-1. Un blocco che parte alla cella 120 e dura 18 celle
  // occupa fino alla 137, non alla 138. Se endCell fosse un confine questa
  // prova sarebbe rossa.
  it('l ultima cella di un blocco è occupata', () => {
    const b = blocco('a1', 120, 18, 3)
    expect(b.startCell).toBe(120)
    expect(b.endCell).toBe(137)
    expect(b.bufferAfterCells).toBe(3)
  })

  it('rifiuta un blocco che scavalca la mezzanotte o dura zero', () => {
    expect(() => blocco('a1', 280, 9, 0)).toThrow(RangeError)
    expect(() => blocco('a1', 120, 0, 0)).toThrow(RangeError)
  })

  // ⚠ discriminante: la guardia sul dominio di start_cell. Il database la
  // impone con un check, ma blocco() è la porta d'ingresso dei dati veri
  // (D2-1) e una riga corrotta non deve entrare in silenzio nel dominio.
  it('rifiuta un blocco che parte fuori dal dominio delle celle', () => {
    expect(() => blocco('a1', -1, 6, 0)).toThrow(RangeError)
    expect(() => blocco('a1', 288, 6, 0)).toThrow(RangeError)
    expect(() => blocco('a1', 12.5, 6, 0)).toThrow(RangeError)
  })

  // ⚠ discriminante: una pausa negativa allargherebbe la fascia proponibile
  // invece di stringerla, cioè proporrebbe partenze SOPRA l'appuntamento
  // precedente. È il solo valore di questo modulo il cui errore propone un
  // orario occupato invece di nasconderne uno libero.
  it('rifiuta una pausa di riassetto negativa', () => {
    expect(() => blocco('a1', 120, 18, -1)).toThrow(RangeError)
  })

  // ⚠ discriminante: è la regola di §5 sul confronto fra i due domini.
  // start_cell >= start_boundary and start_cell + cell_count <= end_boundary.
  // Una fascia [108, 144) accoglie una cella iniziale 138 per 6 celle (fino a
  // 143 inclusa, confine 144) ma non per 7.
  it('decide se un appuntamento sta in una fascia senza confrontare i domini', () => {
    const fascia = { startBoundary: 108, endBoundary: 144 }
    expect(staNellaFascia(138, 6, fascia)).toBe(true)
    expect(staNellaFascia(138, 7, fascia)).toBe(false)
    expect(staNellaFascia(107, 1, fascia)).toBe(false)
    expect(staNellaFascia(108, 36, fascia)).toBe(true)
  })
})
