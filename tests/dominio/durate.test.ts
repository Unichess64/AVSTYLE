// tests/dominio/durate.test.ts
//
// Le durate della scheda (spec 3a §5.4 punto 3, spec §8.1): da dove vengono,
// quando si ricalcolano, e la metà che si perde — una durata modificata a mano
// non si ricalcola più.
import { describe, expect, it } from 'vitest'
import {
  type Catalogo,
  aggiungiServizio,
  cambiaDurata,
  cambiaInizio,
  cambiaOperatrice,
  cambiaServizio,
  durataDi,
  serviziPerLaScelta,
} from '../../src/dominio/durate'
import type { ServizioInScheda } from '../../src/dominio/scheda'

const VERA = 'op-vera'
const ANNALISA = 'op-annalisa'
const ALESSANDRA = 'op-alessandra'
const REFILL = 'sv-refill'
const MASSAGGIO = 'sv-massaggio'
const PEDICURE = 'sv-pedicure'

// Tre servizi, pause diverse da zero, e tre righe di operator_service: una con
// la durata propria, una nulla (vale quella del servizio), una su un altro
// servizio. Dati non degeneri: con un servizio solo, «dal servizio» e
// «dall'operatrice» coinciderebbero per caso.
const CATALOGO: Catalogo = {
  servizi: [
    { id: REFILL, nome: 'Refill gel', categoria: 'Unghie', durata: 18, pausa: 2, attivo: true },
    { id: MASSAGGIO, nome: 'Massaggio', categoria: 'Corpo', durata: 10, pausa: 3, attivo: true },
    { id: PEDICURE, nome: 'Pedicure', categoria: 'Unghie', durata: 9, pausa: 0, attivo: true },
  ],
  durateOperatrice: [
    { operatriceId: VERA, servizioId: REFILL, durata: 15 },
    { operatriceId: ANNALISA, servizioId: REFILL, durata: null },
    { operatriceId: ALESSANDRA, servizioId: MASSAGGIO, durata: 12 },
  ],
}

function servizio(id: string, altro: Partial<ServizioInScheda> = {}): ServizioInScheda {
  return {
    id,
    nuovo: true,
    operatriceId: VERA,
    servizioId: REFILL,
    inizio: 120,
    durata: 15,
    durataAMano: false,
    segueIlPrecedente: false,
    ...altro,
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('durataDi: da dove viene la durata (spec §8.1, D3, D28)', () => {
  it('la durata viene da operator_service.duration_cells quando c è', () => {
    expect(durataDi(CATALOGO, VERA, REFILL)).toBe(15)
    expect(durataDi(CATALOGO, ALESSANDRA, MASSAGGIO)).toBe(12)
  })

  it('altrimenti da service.default_duration_cells', () => {
    // la riga c'è ma è nulla, e la riga non c'è proprio: due strade, stesso esito
    expect(durataDi(CATALOGO, ANNALISA, REFILL)).toBe(18)
    expect(durataDi(CATALOGO, VERA, MASSAGGIO)).toBe(10)
  })
})

describe('il ricalcolo (§5.4 punto 3)', () => {
  it('al cambio di servizio la durata si ricalcola', () => {
    const [s] = cambiaServizio([servizio('a')], 'a', MASSAGGIO, CATALOGO)
    expect(s.servizioId).toBe(MASSAGGIO)
    expect(s.durata).toBe(10)
  })

  it('al cambio di operatrice la durata si ricalcola', () => {
    const [s] = cambiaOperatrice([servizio('a')], 'a', ANNALISA, CATALOGO)
    expect(s.operatriceId).toBe(ANNALISA)
    expect(s.durata).toBe(18)
  })

  it('una durata modificata A MANO non si ricalcola più, né al cambio di servizio né a quello di operatrice', () => {
    const aMano = cambiaDurata([servizio('a')], 'a', 7, CATALOGO)
    expect(aMano[0]).toMatchObject({ durata: 7, durataAMano: true })
    const altroServizio = cambiaServizio(aMano, 'a', MASSAGGIO, CATALOGO)
    expect(altroServizio[0]).toMatchObject({ servizioId: MASSAGGIO, durata: 7 })
    const altraOperatrice = cambiaOperatrice(altroServizio, 'a', ALESSANDRA, CATALOGO)
    expect(altraOperatrice[0]).toMatchObject({ operatriceId: ALESSANDRA, durata: 7 })
  })
})

describe('«+ Aggiungi servizio» e i servizi accodati (§5.4 punto 3, spec §8.1)', () => {
  it('«+ Aggiungi servizio» accoda con la pausa del precedente', () => {
    // Refill di Vera alle 10:00 per 15 celle, pausa 2: il secondo parte a 137.
    const due = aggiungiServizio([servizio('a')], { operatriceId: VERA, inizio: 0 }, MASSAGGIO, CATALOGO)
    expect(due).toHaveLength(2)
    expect(due[1]).toMatchObject({
      inizio: 120 + 15 + 2,
      servizioId: MASSAGGIO,
      operatriceId: VERA,
      durata: 10,
      nuovo: true,
      segueIlPrecedente: true,
      durataAMano: false,
    })
    expect(due[1].id).toMatch(UUID)
    expect(due[1].id).not.toBe(due[0].id)
  })

  it('il primo servizio di una scheda vuota parte dal posto toccato', () => {
    const uno = aggiungiServizio([], { operatriceId: ALESSANDRA, inizio: 150 }, MASSAGGIO, CATALOGO)
    expect(uno).toEqual([
      expect.objectContaining({ operatriceId: ALESSANDRA, inizio: 150, durata: 12, segueIlPrecedente: false }),
    ])
  })

  it('i servizi accodati seguono il precedente finché non sono modificati a mano', () => {
    const due = aggiungiServizio([servizio('a')], { operatriceId: VERA, inizio: 0 }, MASSAGGIO, CATALOGO)
    const b = due[1].id
    // il primo si allunga: il secondo lo segue
    const piuLungo = cambiaDurata(due, 'a', 20, CATALOGO)
    expect(piuLungo.find((s) => s.id === b)!.inizio).toBe(120 + 20 + 2)
    // il primo cambia servizio, quindi pausa: il secondo segue anche quella
    const altraPausa = cambiaServizio(piuLungo, 'a', PEDICURE, CATALOGO)
    expect(altraPausa.find((s) => s.id === b)!.inizio).toBe(120 + 20 + 0)
    // il primo si sposta: il secondo lo segue
    const spostato = cambiaInizio(altraPausa, 'a', 132, CATALOGO)
    expect(spostato.find((s) => s.id === b)!.inizio).toBe(132 + 20)
  })

  it('spostando a mano il primo servizio, il secondo NON lo segue più se era stato spostato a mano', () => {
    const due = aggiungiServizio([servizio('a')], { operatriceId: VERA, inizio: 0 }, MASSAGGIO, CATALOGO)
    const b = due[1].id
    const secondoAMano = cambiaInizio(due, b, 150, CATALOGO)
    expect(secondoAMano.find((s) => s.id === b)).toMatchObject({ inizio: 150, segueIlPrecedente: false })
    const primoSpostato = cambiaInizio(secondoAMano, 'a', 100, CATALOGO)
    expect(primoSpostato.find((s) => s.id === 'a')!.inizio).toBe(100)
    expect(primoSpostato.find((s) => s.id === b)!.inizio).toBe(150)
  })
})

describe('serviziPerLaScelta: quelli che l operatrice fa, e «mostra tutti» (spec §8.1)', () => {
  it('mostra i servizi dell operatrice, raggruppati per categoria', () => {
    expect(serviziPerLaScelta(CATALOGO, VERA, false)).toEqual([
      { categoria: 'Unghie', servizi: [expect.objectContaining({ id: REFILL })] },
    ])
  })

  it('con «mostra tutti» li mostra tutti, attivi, raggruppati per categoria', () => {
    const conInattivo: Catalogo = {
      ...CATALOGO,
      servizi: [...CATALOGO.servizi, { id: 'sv-vecchio', nome: 'Vecchio', categoria: 'Corpo', durata: 6, pausa: 0, attivo: false }],
    }
    const gruppi = serviziPerLaScelta(conInattivo, VERA, true)
    expect(gruppi.map((g) => [g.categoria, g.servizi.map((s) => s.id)])).toEqual([
      ['Unghie', [REFILL, PEDICURE]],
      ['Corpo', [MASSAGGIO]],
    ])
  })
})

describe('il tetto della giornata (revisione, C1)', () => {
  it('un servizio accodato non comincia dopo l ultima cella del giorno, 23:55', () => {
    // Refill di Vera alle 23:00 per 15 celle, pausa 2: accodato cadrebbe a 293
    const due = aggiungiServizio([servizio('a', { inizio: 276 })], { operatriceId: VERA, inizio: 0 }, MASSAGGIO, CATALOGO)
    expect(due[1].inizio).toBe(287)
    expect(cambiaDurata(due, 'a', 96, CATALOGO)[1].inizio).toBe(287)
  })
})
